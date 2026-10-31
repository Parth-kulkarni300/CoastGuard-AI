"""
CoastGuard AI — Gnani Timbre v2.5 Integration
Text-to-Speech: Generates warm, local-dialect warning audio for outbound alerts.
Docs: https://www.gnani.ai/text-to-speech-api
"""

import os
import io
import math
import struct
import tempfile
import base64
import httpx
import asyncio
from pathlib import Path
from typing import Optional

GNANI_API_KEY = os.getenv("GNANI_API_KEY", "")
TTS_URL = os.getenv("GNANI_TTS_URL", "https://app.gnani.ai/api/v1/synthesize")

# Cache directory for synthesized audio clips
AUDIO_CACHE_DIR = Path(__file__).parent / "audio_cache"
AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Timbre v2.5 voice profiles for different regional languages
VOICE_PROFILES = {
    "hi": {
        "voice_id": "timbre-hi-female-warm",   # Warm Hindi female voice
        "language": "hi-IN",
        "speaking_rate": 0.9,   # Slightly slower for clarity in emergency
    },
    "bn": {
        "voice_id": "timbre-bn-male-calm",
        "language": "bn-IN",
        "speaking_rate": 0.9,
    },
    "or": {
        "voice_id": "timbre-or-male-calm",
        "language": "or-IN",
        "speaking_rate": 0.9,
    },
    "mr": {
        "voice_id": "timbre-mr-female-warm",
        "language": "mr-IN",
        "speaking_rate": 0.9,
    },
    "te": {
        "voice_id": "timbre-te-male-calm",
        "language": "te-IN",
        "speaking_rate": 0.9,
    },
}


def _generate_emergency_siren_wav(duration_sec: float = 2.5) -> bytes:
    """
    Generate an emergency alert warble siren sound (dual-tone 880Hz / 660Hz)
    using pure Python standard library.
    """
    sample_rate = 16000
    total_samples = int(sample_rate * duration_sec)
    
    buf = io.BytesIO()
    # WAV Header
    # 44 bytes header for 16-bit PCM mono
    data_size = total_samples * 2
    header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF', 36 + data_size, b'WAVE',
        b'fmt ', 16, 1, 1, sample_rate, sample_rate * 2, 2, 16,
        b'data', data_size
    )
    buf.write(header)
    
    # Generate siren waveform
    for i in range(total_samples):
        t = i / sample_rate
        # Frequency alternates every 0.25 seconds between 880Hz (A5) and 660Hz (E5)
        freq = 880.0 if (int(t * 4) % 2 == 0) else 660.0
        # Envelope to avoid clicks at start/end
        envelope = min(1.0, i / 800.0) * min(1.0, (total_samples - i) / 800.0)
        sample_val = int(envelope * 0.65 * 32767.0 * math.sin(2.0 * math.pi * freq * t))
        buf.write(struct.pack('<h', sample_val))
        
    return buf.getvalue()


def _synthesize_local_sapi(text: str) -> Optional[bytes]:
    """
    Attempt to use Windows SAPI voice synthesizer as offline local fallback.
    """
    try:
        import win32com.client
        temp_wav = Path(tempfile.gettempdir()) / f"cg_tts_{os.getpid()}_{hash(text) & 0xffffffff}.wav"
        stream = win32com.client.Dispatch("SAPI.SpFileStream")
        # 3 = SSFMCreateForWrite
        stream.Open(str(temp_wav), 3, False)
        voice = win32com.client.Dispatch("SAPI.SpVoice")
        voice.AudioOutputStream = stream
        # Speak text
        voice.Speak(text)
        stream.Close()
        if temp_wav.exists() and temp_wav.stat().st_size > 44:
            audio_bytes = temp_wav.read_bytes()
            try:
                temp_wav.unlink()
            except Exception:
                pass
            return audio_bytes
    except Exception as e:
        # SAPI not available or failed
        pass
    return None


async def synthesize_alert(text: str, language: str = "hi", dispatch_id: str = "alert") -> bytes:
    """
    Generate audio alert using Gnani Timbre v2.5.
    
    Args:
        text: Alert text to synthesize
        language: Language code ('hi', 'bn', 'or', 'mr', etc.)
        dispatch_id: Optional ID to cache audio file
    
    Returns:
        WAV audio bytes
    """
    audio_bytes: Optional[bytes] = None

    if GNANI_API_KEY:
        voice = VOICE_PROFILES.get(language, VOICE_PROFILES["hi"])
        headers = {
            "Authorization": f"Bearer {GNANI_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "audio/wav",
        }
        payload = {
            "text": text,
            "voice_id": voice["voice_id"],
            "language": voice["language"],
            "model": "timbre-v2.5",
            "speaking_rate": voice["speaking_rate"],
            "audio_format": "wav",
            "sample_rate": 16000,
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(TTS_URL, headers=headers, json=payload)
                if response.status_code == 200 and len(response.content) > 44:
                    audio_bytes = response.content
        except Exception as e:
            print(f"[Timbre] API call failed: {e}. Falling back to local synthesizer.")

    if not audio_bytes:
        # Fallback 1: Windows SAPI voice synthesizer
        audio_bytes = _synthesize_local_sapi(text)

    if not audio_bytes or len(audio_bytes) <= 44:
        # Fallback 2: Realistic high-priority emergency siren warble tone
        audio_bytes = _generate_emergency_siren_wav(duration_sec=3.0)

    # Save to cache file for HTTP direct serving
    cache_path = AUDIO_CACHE_DIR / f"{dispatch_id}.wav"
    try:
        cache_path.write_bytes(audio_bytes)
    except Exception:
        pass

    return audio_bytes


def bytes_to_data_uri(audio_bytes: bytes, mime: str = "audio/wav") -> str:
    """Convert audio bytes to a browser-playable data URI."""
    encoded = base64.b64encode(audio_bytes).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def get_alert_texts_for_severity(severity: str, alert_text: str, language: str = "hi") -> str:
    """Get the appropriate TTS text based on severity with local attention-getter."""
    if language == "hi":
        if severity == "CRITICAL":
            prefix = "अत्यंत जरूरी सूचना! सावधान! "
        elif severity == "WARNING":
            prefix = "चेतावनी! कृपया ध्यान दें। "
        else:
            prefix = "तटीय सुरक्षा सूचना। "
    elif language == "bn":
        if severity == "CRITICAL":
            prefix = "জরুরি সতর্কতা! অবিলম্বে মনোযোগ দিন। "
        else:
            prefix = "সতর্কতা বার্তা। "
    else:
        if severity == "CRITICAL":
            prefix = "CRITICAL EMERGENCY ALERT! "
        elif severity == "WARNING":
            prefix = "WARNING ALERT. "
        else:
            prefix = "COASTAL ADVISORY. "
    
    return prefix + (alert_text or "Emergency in your sector.")


if __name__ == "__main__":
    async def test():
        text = "सावधान! आपके क्षेत्र में पानी का स्तर तेजी से बढ़ रहा है।"
        audio = await synthesize_alert(text, language="hi", dispatch_id="test_run")
        print(f"✅ Generated {len(audio):,} bytes audio. Data URI length: {len(bytes_to_data_uri(audio))}")

    asyncio.run(test())
