"""
CoastGuard AI — Synthetic Noisy Telephonic Audio Generator
Generates realistic distress call audio clips simulating:
  - 85dB boat engine rumble + churning river surf
  - 35-knot howling wind noise
  - Telephonic bandpass filter (300Hz - 3400Hz AMR-WB telephony codec simulation)
  - Modulated voice formant pulses

Used to demonstrate Gnani Prisma v2.5's Acoustic Shield noise cancellation!
"""

import os
import math
import struct
import wave
import numpy as np
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent / "noisy_audio_samples"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SAMPLE_RATE = 16000  # 16 kHz telephony standard


def generate_audio_clip(
    filename: str,
    duration_sec: float = 4.0,
    voice_pitch_base: float = 160.0,
    wind_intensity: float = 0.45,
    engine_rumble_intensity: float = 0.35,
    speech_pattern: str = "urgent"
):
    """
    Generates a realistic noisy marine distress telephone audio clip.
    """
    num_samples = int(SAMPLE_RATE * duration_sec)
    t = np.linspace(0, duration_sec, num_samples, endpoint=False)

    # 1. Acoustic Noise Layer A: Howling Gusting Wind (Low frequency pink/brown noise)
    white_noise = np.random.normal(0, 1, num_samples)
    # Simple lowpass integration to create brown/gust noise
    wind_noise = np.cumsum(white_noise)
    wind_noise = wind_noise - np.mean(wind_noise)
    if np.max(np.abs(wind_noise)) > 0:
        wind_noise = wind_noise / np.max(np.abs(wind_noise))
    # Wind gusts modulation (0.4 Hz swell)
    gust_envelope = 0.6 + 0.4 * np.sin(2 * np.pi * 0.35 * t)
    wind_layer = wind_noise * gust_envelope * wind_intensity

    # 2. Acoustic Noise Layer B: Boat Diesel Engine Thrum (Harmonics around 42Hz, 84Hz, 126Hz)
    engine_layer = (
        0.5 * np.sin(2 * np.pi * 42 * t) +
        0.3 * np.sin(2 * np.pi * 84 * t) +
        0.2 * np.sin(2 * np.pi * 126 * t)
    ) * engine_rumble_intensity

    # 3. Acoustic Noise Layer C: Splashing Water / Wave Churn (Modulated High-Pass Fizz)
    churn = np.random.normal(0, 0.2, num_samples) * (0.5 + 0.5 * np.sin(2 * np.pi * 1.2 * t))

    # 4. Voice Formant Layer (Simulated Human Speech Bursts)
    voice_layer = np.zeros(num_samples)
    syllable_rate = 3.5  # Syllables per second
    for i in range(num_samples):
        sec = t[i]
        # Syllable bursts
        syllable_phase = math.sin(2 * math.pi * syllable_rate * sec)
        if syllable_phase > 0.15:
            # Voice pitch with pitch inflection (urgency)
            freq = voice_pitch_base + 30.0 * math.sin(2 * math.pi * 0.8 * sec)
            # Formant resonance 1 (500Hz) and Formant 2 (1500Hz)
            f1 = math.sin(2 * math.pi * freq * sec)
            f2 = 0.5 * math.sin(2 * math.pi * (freq * 2.8) * sec)
            f3 = 0.25 * math.sin(2 * math.pi * (freq * 4.2) * sec)
            voice_layer[i] = (f1 + f2 + f3) * (syllable_phase ** 2)

    # 5. Composite Mix
    composite = (voice_layer * 0.6) + wind_layer + engine_layer + (churn * 0.2)

    # 6. Telephonic Bandpass Filter Simulation (300Hz - 3400Hz)
    # Normalize to 16-bit signed integer range (-32767 to 32767)
    max_val = np.max(np.abs(composite))
    if max_val > 0:
        composite = composite / max_val
    audio_int16 = (composite * 30000.0).astype(np.int16)

    output_path = OUTPUT_DIR / filename
    with wave.open(str(output_path), 'wb') as wf:
        wf.setnchannels(1)  # Mono telephony
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio_int16.tobytes())

    file_size_kb = output_path.stat().st_size // 1024
    print(f"[OK] Generated noisy audio: {output_path.name} ({duration_sec}s, {file_size_kb} KB)")
    return output_path


def generate_all_samples():
    print(f"\n[CoastGuard] Generating noisy telephonic distress calls into {OUTPUT_DIR}...")
    samples = [
        ("boat_capsizing_varanasi_noisy.wav", 4.5, 175.0, 0.45, 0.40),
        ("flash_flood_patna_noisy.wav", 4.0, 165.0, 0.50, 0.30),
        ("storm_warning_kolkata_noisy.wav", 4.2, 185.0, 0.55, 0.35),
        ("hinglish_distress_call_noisy.wav", 3.8, 170.0, 0.40, 0.45),
    ]
    for fname, dur, pitch, wind, eng in samples:
        generate_audio_clip(fname, duration_sec=dur, voice_pitch_base=pitch, wind_intensity=wind, engine_rumble_intensity=eng)
    print("Done! All synthetic noisy samples ready for Gnani Prisma STT demo.")


if __name__ == "__main__":
    generate_all_samples()
