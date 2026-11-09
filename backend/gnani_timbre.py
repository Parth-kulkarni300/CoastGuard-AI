from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent.parent / '.env')
load_dotenv(Path(__file__).parent / '.env')
"""
CoastGuard AI — Gnani Timbre v2.5 / v3.0 Integration
Text-to-Speech: Generates warm, local-dialect warning audio for outbound alerts.
Docs: https://docs.gnani.ai / https://api.vachana.ai
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
TTS_URL = os.getenv("GNANI_TTS_URL", "https://api.vachana.ai/api/v1/tts/inference")

AUDIO_CACHE_DIR = Path(__file__).parent / "audio_cache"
AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)

VOICE_PROFILES = {
    "hi": {
        "voice": "Nalini",
        "language": "hi-IN",
        "speed": 1,
    },
    "bn": {
        "voice": "Mehuli",
        "language": "bn-IN",
        "speed": 1,
    },
    "or": {
        "voice": "Nalini",
        "language": "hi-IN",
        "speed": 1,
    },
    "mr": {
        "voice": "Aarohi",
        "language": "mr-IN",
        "speed": 1,
    },
    "ta": {
        "voice": "Oviya",
        "language": "ta-IN",
        "speed": 1,
    },
    "en": {
        "voice": "Nalini",
        "language": "en-IN",
        "speed": 1,
    }
}


def _generate_emergency_siren_wav(duration_sec: float = 2.5) -> bytes:
    """Generate emergency alert siren sound using pure Python standard library."""
    sample_rate = 16000
    total_samples = int(sample_rate * duration_sec)
    
    buf = io.BytesIO()
    data_size = total_samples * 2
    header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF', 36 + data_size, b'WAVE',
        b'fmt ', 16, 1, 1, sample_rate, sample_rate * 2, 2, 16,
        b'data', data_size
    )
    buf.write(header)
    
    for i in range(total_samples):
        t = i / sample_rate
        freq = 880.0 if (int(t * 4) % 2 == 0) else 660.0
        envelope = min(1.0, i / 800.0) * min(1.0, (total_samples - i) / 800.0)
        sample_val = int(envelope * 0.65 * 32767.0 * math.sin(2.0 * math.pi * freq * t))
        buf.write(struct.pack('<h', sample_val))
        
    return buf.getvalue()


def _synthesize_local_sapi(text: str) -> Optional[bytes]:
    """Attempt to use Windows SAPI voice synthesizer as offline local fallback."""
    try:
        import win32com.client
        temp_wav = Path(tempfile.gettempdir()) / f"cg_tts_{os.getpid()}_{hash(text) & 0xffffffff}.wav"
        stream = win32com.client.Dispatch("SAPI.SpFileStream")
        stream.Open(str(temp_wav), 3, False)
        voice = win32com.client.Dispatch("SAPI.SpVoice")
        voice.AudioOutputStream = stream
        voice.Speak(text)
        stream.Close()
        if temp_wav.exists() and temp_wav.stat().st_size > 44:
            audio_bytes = temp_wav.read_bytes()
            try:
                temp_wav.unlink()
            except Exception:
                pass
            return audio_bytes
    except Exception:
        pass
    return None


async def synthesize_alert(text: str, language: str = "hi", dispatch_id: str = "alert") -> bytes:
    """
    Generate audio alert using Gnani Timbre TTS API.
    """
    audio_bytes: Optional[bytes] = None
    api_key = os.getenv("GNANI_API_KEY", GNANI_API_KEY)

    if api_key and api_key != "your_gnani_api_key_here":
        profile = VOICE_PROFILES.get(language, VOICE_PROFILES["hi"])
        headers = {
            "X-API-Key-ID": api_key,
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "audio/wav",
        }
        payload = {
            "text": text,
            "voice": profile["voice"],
            "language": profile["language"],
            "model": "timbre-v2.5",
            "speed": profile["speed"],
            "audio_config": {
                "encoding": "linear_pcm",
                "container": "wav",
                "num_channels": 1,
                "sample_rate": 16000,
                "sample_width": 2
            }
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(TTS_URL, headers=headers, json=payload)
                if response.status_code == 200 and len(response.content) > 44:
                    audio_bytes = response.content
        except Exception as e:
            print(f"[Timbre TTS] Live API notice: {e}. Using local audio engine.")

    if not audio_bytes:
        # Fallback 1: Windows SAPI local voice
        audio_bytes = _synthesize_local_sapi(text)

    if not audio_bytes or len(audio_bytes) <= 44:
        # Fallback 2: Dual-tone emergency siren
        audio_bytes = _generate_emergency_siren_wav(duration_sec=3.0)

    # Save to audio cache
    cache_path = AUDIO_CACHE_DIR / f"{dispatch_id}.wav"
    try:
        cache_path.write_bytes(audio_bytes)
    except Exception:
        pass

    return audio_bytes


def bytes_to_data_uri(audio_bytes: bytes, mime: str = "audio/wav") -> str:
    encoded = base64.b64encode(audio_bytes).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def get_alert_texts_for_severity(severity: str, alert_text: str, language: str = "hi") -> str:
    if language == "hi":
        if severity == "CRITICAL":
            prefix = "अत्यंत जरूरी सूचना! सावधान! "
        elif severity == "WARNING":
            prefix = "चेतावनी! कृपया ध्यान दें। "
        else:
            prefix = "तटीय सुरक्षा सूचना। "
    elif language == "bn":
        if severity == "CRITICAL":
            prefix = "জরুরি সতর্কতা! "
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
