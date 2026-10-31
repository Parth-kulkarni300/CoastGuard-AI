"""
CoastGuard AI — Acoustic Shield Audio Post-Processing Filter
Strips low-frequency thunder, wave rumble (<200 Hz), engine harmonics, and high-frequency noise (>3400 Hz).
Applies Butterworth voice bandpass filter and dynamic noise squelch/gate.
"""

import io
import wave
import struct
import numpy as np
from scipy.signal import butter, sosfiltfilt


def apply_bandpass_filter(
    audio_data: np.ndarray,
    sample_rate: int,
    lowcut: float = 220.0,
    highcut: float = 3400.0,
    order: int = 4
) -> np.ndarray:
    """
    Applies a zero-phase Butterworth bandpass filter to preserve human vocal formants
    while cutting out low-frequency thunder/engine rumbles and high-frequency hiss.
    """
    nyq = 0.5 * sample_rate
    # Avoid numerical instability if highcut >= nyq
    highcut = min(highcut, nyq - 50.0)
    low = lowcut / nyq
    high = highcut / nyq

    sos = butter(order, [low, high], btype='bandpass', output='sos')
    filtered = sosfiltfilt(sos, audio_data)
    return filtered


def apply_noise_gate(
    audio_data: np.ndarray,
    threshold_ratio: float = 0.08,
    attenuation_factor: float = 0.15
) -> np.ndarray:
    """
    Suppresses ambient noise between words (noise gate).
    When amplitude drops below threshold, attenuates noise floor.
    """
    max_amp = np.max(np.abs(audio_data))
    if max_amp == 0:
        return audio_data

    threshold = max_amp * threshold_ratio
    gated = np.copy(audio_data)

    # Frame-based envelope
    window_size = 512
    for i in range(0, len(audio_data), window_size):
        chunk = audio_data[i:i + window_size]
        chunk_energy = np.mean(np.abs(chunk))
        if chunk_energy < threshold:
            gated[i:i + window_size] = chunk * attenuation_factor

    return gated


def denoise_audio_bytes(raw_bytes: bytes) -> bytes:
    """
    Denoises raw WAV audio bytes by cutting thunder rumbles, engine noise, and squelching noise floor.
    Returns cleaned WAV bytes.
    """
    try:
        with io.BytesIO(raw_bytes) as in_buf:
            with wave.open(in_buf, 'rb') as wf:
                num_channels = wf.getnchannels()
                sample_width = wf.getsampwidth()
                sample_rate = wf.getframerate()
                num_frames = wf.getnframes()
                raw_frames = wf.readframes(num_frames)

        if sample_width != 2:
            # Only 16-bit PCM processed
            return raw_bytes

        # Convert to numpy array
        dtype = np.int16
        audio_np = np.frombuffer(raw_frames, dtype=dtype).astype(np.float32)

        if num_channels > 1:
            # Flatten to mono
            audio_np = audio_np.reshape(-1, num_channels).mean(axis=1)
            num_channels = 1

        # 1. Bandpass filter: cut <220Hz (thunder, engine) and >3400Hz (hiss)
        filtered = apply_bandpass_filter(audio_np, sample_rate=sample_rate, lowcut=220.0, highcut=3400.0)

        # 2. Noise Gate: suppress ambient background noise between speech bursts
        cleaned = apply_noise_gate(filtered, threshold_ratio=0.07, attenuation_factor=0.18)

        # 3. Peak normalization to prevent clipping and ensure audible voice
        max_val = np.max(np.abs(cleaned))
        if max_val > 0:
            cleaned = (cleaned / max_val) * 28000.0

        cleaned_int16 = cleaned.astype(np.int16)

        # Write back to valid WAV buffer
        out_buf = io.BytesIO()
        with wave.open(out_buf, 'wb') as out_wf:
            out_wf.setnchannels(num_channels)
            out_wf.setsampwidth(2)
            out_wf.setframerate(sample_rate)
            out_wf.writeframes(cleaned_int16.tobytes())

        return out_buf.getvalue()

    except Exception as e:
        print(f"[Acoustic Shield] Denoising fallback (using original audio): {e}")
        return raw_bytes


if __name__ == "__main__":
    # Test with sample audio
    from pathlib import Path
    sample = Path(__file__).parent.parent / "demo" / "noisy_audio_samples" / "boat_capsizing_varanasi_noisy.wav"
    if sample.exists():
        cleaned = denoise_audio_bytes(sample.read_bytes())
        out_test = Path(__file__).parent / "audio_cache" / "test_denoised.wav"
        out_test.write_bytes(cleaned)
        print(f"[OK] Filtered test audio written to {out_test.name} ({len(cleaned):,} bytes)")
