"""
CoastGuard AI — Alert Dispatcher
Simulates outbound call dispatch to all registered vessels and phones in the danger zone.
Uses synthetic phone records only (0000-XXXXXXX). Complies with contest rules.
"""

import asyncio
import time
import json
from datetime import datetime
from typing import List, Dict, Any, Callable
from gnani_timbre import synthesize_alert, get_alert_texts_for_severity, bytes_to_data_uri

# Global in-memory alert history (accessible via GET /api/alerts/history)
alert_log: List[Dict[str, Any]] = []
_ws_callbacks: List[Callable] = []


def register_ws_callback(cb: Callable):
    """Register a WebSocket callback to receive live pipeline events."""
    if cb not in _ws_callbacks:
        _ws_callbacks.append(cb)


def unregister_ws_callback(cb: Callable):
    """Unregister a WebSocket callback."""
    if cb in _ws_callbacks:
        _ws_callbacks.remove(cb)


async def _broadcast(event: dict):
    """Broadcast an event to all registered WebSocket subscribers."""
    for cb in list(_ws_callbacks):
        try:
            res = cb(event)
            if asyncio.iscoroutine(res):
                await res
        except Exception:
            pass


async def dispatch_alerts(
    classification: dict,
    nearby_phones: List[dict],
    caller_lat: float,
    caller_lon: float,
    transcript: str,
) -> dict:
    """
    Core Dispatch Pipeline:
    1. Generates hyper-local TTS audio using Gnani Timbre v2.5
    2. Simulates instant outbound telephony alerts to all vessels within blast radius
    3. Streams progress over WebSockets
    4. Returns consolidated incident dispatch report
    """
    severity = classification.get("severity", "WARNING")
    hindi_alert = classification.get("hindi_alert", "")
    english_alert = classification.get("english_alert", "")
    threat_type = classification.get("threat_type", "unknown")
    location_hint = classification.get("location_hint", "Assigned Zone")

    dispatch_id = f"DISP-{int(time.time() * 1000)}"
    dispatch_time = datetime.now().isoformat()

    # Step 1: Synthesize spoken alert via Gnani Timbre v2.5
    alert_spoken_text = get_alert_texts_for_severity(severity, hindi_alert, language="hi")
    audio_bytes = await synthesize_alert(alert_spoken_text, language="hi", dispatch_id=dispatch_id)
    audio_size_kb = max(1, len(audio_bytes) // 1024)
    audio_data_uri = bytes_to_data_uri(audio_bytes)

    # Step 2: Trigger Outbound Call Broadcast
    dispatched_records = []
    # Cap at 25 calls for responsive UI simulation
    target_recipients = nearby_phones[:25]

    for idx, person in enumerate(target_recipients):
        is_delivered = (idx < len(target_recipients) - 1) or (idx % 8 != 7)
        status = "DELIVERED" if is_delivered else "BUSY / RETRYING"
        latency = 110 + (idx * 14) + (5 if idx % 2 == 0 else 0)

        call_record = {
            "dispatch_id": dispatch_id,
            "recipient_id": person.get("id", f"CG-{1000+idx}"),
            "recipient_name": person.get("name", "Fisherman"),
            "phone": person.get("phone", "0000-0000000"),
            "boat_type": person.get("boat_type", "Country Dinghy"),
            "distance_km": person.get("distance_km", 0.5),
            "relative_position": person.get("relative_position", f"{int(person.get('distance_km', 0.5)*1000)}m NE"),
            "language": person.get("language", "hi"),
            "status": status,
            "latency_ms": latency,
            "timestamp": datetime.now().strftime("%H:%M:%S")
        }
        dispatched_records.append(call_record)

        # Broadcast live tick to UI
        await _broadcast({
            "type": "call_dispatch",
            "data": call_record
        })
        # Micro-delay for realistic cascading dispatch visual in UI
        await asyncio.sleep(0.04)

    # Step 3: Build Consolidated Incident Report
    delivered_count = sum(1 for d in dispatched_records if d["status"] == "DELIVERED")
    failed_count = len(dispatched_records) - delivered_count

    report = {
        "dispatch_id": dispatch_id,
        "timestamp": dispatch_time,
        "severity": severity,
        "threat_type": threat_type,
        "caller_location": {"lat": caller_lat, "lon": caller_lon},
        "location_hint": location_hint,
        "people_in_danger": classification.get("people_in_danger"),
        "transcript_excerpt": transcript[:140] + ("..." if len(transcript) > 140 else ""),
        "classification_confidence": classification.get("confidence", 0.94),
        "dialect_detected": classification.get("dialect_detected", "Standard Hindi"),
        "alert_text_hindi": hindi_alert,
        "alert_text_english": english_alert,
        "audio_generated_kb": audio_size_kb,
        "audio_base64": audio_data_uri,
        "audio_url": f"/api/audio/{dispatch_id}.wav",
        "total_alerted": len(dispatched_records),
        "delivered": delivered_count,
        "failed": failed_count,
        "dispatched_to": dispatched_records,
        "models_used": {
            "stt": "Gnani Prisma v2.5 (Telephony Acoustic Shield)",
            "reasoning": "Gnani Evon v3.3 (Sovereign 30B MoE)",
            "tts": "Gnani Timbre v2.5 (Flash Dispatch Indic Voices)"
        }
    }

    # Store in history
    alert_log.insert(0, report)
    if len(alert_log) > 50:
        alert_log.pop()

    # Broadcast completion
    await _broadcast({
        "type": "dispatch_complete",
        "data": report
    })

    print(f"[Dispatcher] [OK] Dispatched {dispatch_id} ({severity}) to {len(dispatched_records)} vessels. {delivered_count} delivered.")
    return report


def get_alert_history() -> List[dict]:
    """Return past alerts for dashboard."""
    return alert_log[:20]
