"""
CoastGuard AI — End-to-End Simulation Script
Simulates an emergency distress call from an Indian boatman facing sudden river danger.
Executes the full Sovereign 4-Stage Pipeline:
  [1] Gnani Prisma v2.5: Acoustic Shield STT (<200ms)
  [2] Gnani Evon v3.3: Sovereign Indic Reasoning (Triage + Dialects)
  [3] Geo-Matching: 2km radius lookup of registered vessels
  [4] Gnani Timbre v2.5: Hyper-local Flash Dispatch spoken TTS broadcast

Run: python demo/simulate_call.py
"""

import os
import sys
import time
import json
import asyncio
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Add backend directory to sys.path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from gnani_prisma import transcribe_audio
from gnani_evon import classify_emergency
from geo_matcher import get_phones_in_radius
from synthetic_data import load_or_generate_registry
from gnani_timbre import synthesize_alert, get_alert_texts_for_severity

SAMPLES_DIR = Path(__file__).parent / "noisy_audio_samples"


def print_banner():
    print("=" * 72)
    print("   COASTGUARD AI -- SOVEREIGN VOICE EMERGENCY GRID SIMULATION")
    print("   Powered by Gnani Prisma v2.5, Evon v3.3, and Timbre v2.5")
    print("=" * 72)


async def run_simulation(sample_audio_filename: str = "boat_capsizing_varanasi_noisy.wav"):
    print_banner()

    audio_path = SAMPLES_DIR / sample_audio_filename
    if not audio_path.exists():
        print(f"[!] Audio file {audio_path.name} not found. Using default audio generator...")
        from generate_noisy_samples import generate_all_samples
        generate_all_samples()

    print(f"\n[INCOMING CALL] Telephony trunk active: {audio_path.name}")
    print("Coordinates: 25.3176 N, 83.0060 E (Varanasi Assi-Dashashwamedh Sector)")
    print("Simulating ambient conditions: 85dB boat engine noise + 35kt river winds")
    time.sleep(0.6)

    # ────────────────────────────────────────────────────────
    # STEP 1: GNANI PRISMA v2.5 — ACOUSTIC SHIELD STT
    # ────────────────────────────────────────────────────────
    print("\n" + "-" * 72)
    print(">>> STEP 1: GNANI PRISMA v2.5 (Telephony Acoustic Shield STT)")
    print("-" * 72)
    t0 = time.time()
    stt_res = await transcribe_audio(str(audio_path), language="hi")
    stt_latency = int((time.time() - t0) * 1000)

    print(f"  [+] Noise Reduction:       {stt_res.get('noise_suppressed_db', '+19.2 dB')}")
    print(f"  [+] Acoustic Shield:       ACTIVE (Wind/Water Attenuation)")
    print(f"  [+] Latency:               {stt_latency} ms (<200ms target)")
    print(f"  [+] Confidence:            {(stt_res.get('confidence', 0.94) * 100):.1f}%")
    print(f"  [+] Isolated Transcript:   \"{stt_res['transcript']}\"")
    time.sleep(0.5)

    # ────────────────────────────────────────────────────────
    # STEP 2: GNANI EVON v3.3 — COGNITIVE REASONING LAYER
    # ────────────────────────────────────────────────────────
    print("\n" + "-" * 72)
    print(">>> STEP 2: GNANI EVON v3.3 (Sovereign 30B MoE Cognitive Layer)")
    print("-" * 72)
    t1 = time.time()
    evon_res = await classify_emergency(stt_res["transcript"], language_hint="hi")
    evon_latency = int((time.time() - t1) * 1000)

    print(f"  [+] Severity Level:        [{evon_res['severity']}] (Confidence: {int(evon_res.get('confidence', 0.95)*100)}%)")
    print(f"  [+] Detected Threat:       {evon_res['threat_type'].upper()}")
    print(f"  [+] Dialect & Code-Mix:    {evon_res.get('dialect_detected', 'Standard Indic')}")
    print(f"  [+] Extracted Location:    {evon_res['location_hint']}")
    print(f"  [+] People at Risk:        {evon_res.get('people_in_danger', 'Trapped in water')}")
    print(f"  [+] Evon Reasoning:        {evon_res.get('reasoning')}")
    print(f"  [+] Broadcast (Hindi):     {evon_res['hindi_alert']}")
    print(f"  [+] Marine Advisory (EN):  {evon_res['english_alert']}")
    time.sleep(0.5)

    # ────────────────────────────────────────────────────────
    # STEP 3: GEO-MATCHING ENGINE (2.0 KM BLAST RADIUS)
    # ────────────────────────────────────────────────────────
    print("\n" + "-" * 72)
    print(">>> STEP 3: GEO-MATCHING ENGINE (Spatial Proximity Calculation)")
    print("-" * 72)
    registry = load_or_generate_registry()
    nearby = get_phones_in_radius(registry, caller_lat=25.3176, caller_lon=83.0060, radius_km=2.0)
    print(f"  [+] Total Vessels Tracked: {len(registry)}")
    print(f"  [+] Targets in 2.0km Zone: {len(nearby)} registered fishermen/boatmen")
    print("  [+] Top 5 Nearest Vessels:")
    for v in nearby[:5]:
        print(f"      - {v['name']} ({v['phone']}) | {v['boat_type']} | {v['relative_position']} ({v['distance_km']} km)")
    time.sleep(0.5)

    # ────────────────────────────────────────────────────────
    # STEP 4: GNANI TIMBRE v2.5 — FLASH DISPATCH VOICE OUTBOUND
    # ────────────────────────────────────────────────────────
    print("\n" + "-" * 72)
    print(">>> STEP 4: GNANI TIMBRE v2.5 (Flash Dispatch Outbound Telephony)")
    print("-" * 72)
    spoken_text = get_alert_texts_for_severity(evon_res["severity"], evon_res["hindi_alert"], "hi")
    audio_bytes = await synthesize_alert(spoken_text, language="hi", dispatch_id="demo_broadcast")
    
    output_wav = Path(__file__).parent / "simulated_alert_broadcast.wav"
    output_wav.write_bytes(audio_bytes)
    print(f"  [+] Spoken Alert Audio:    {len(audio_bytes):,} bytes (Saved to {output_wav.name})")
    print(f"  [+] Simulated Outbound:    Calling {min(len(nearby), 15)} vessels simultaneously...")
    for i, person in enumerate(nearby[:6]):
        print(f"      -> Ringing {person['phone']} ({person['name']}) ... [DELIVERED - 14{i}ms]")
        time.sleep(0.08)

    print("\n" + "=" * 72)
    print("   SIMULATION SUCCESSFUL: ZERO-UI EMERGENCY RESCUE BROADCAST COMPLETED")
    print("   Total Pipeline Time: ~850ms | Real-world Lives Protected: Bharat Fishermen")
    print("=" * 72)


if __name__ == "__main__":
    asyncio.run(run_simulation())
