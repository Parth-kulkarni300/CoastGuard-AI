"""
CoastGuard AI — FastAPI Backend
Zero-UI Emergency Voice Grid for Indian Fishermen & Boatmen
Powered by:
  - Gnani Prisma v2.5: Acoustic Shield Telephony STT (<200ms, noise suppression)
  - Gnani Evon v3.3: Sovereign Indic Reasoning LLM (triage, dial-in extraction)
  - Gnani Timbre v2.5: Flash Dispatch Regional TTS (Hindi, Bengali, Odia, Marathi)

Run: uvicorn app:app --reload --host 0.0.0.0 --port 8000
"""

import os
import sys
import json
import asyncio
import random
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict

from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")
load_dotenv(Path(__file__).parent / ".env")

# Add current folder to path
sys.path.insert(0, str(Path(__file__).parent))

from gnani_prisma import transcribe_audio, transcribe_bytes
from gnani_evon import classify_emergency
from gnani_timbre import synthesize_alert, get_alert_texts_for_severity, bytes_to_data_uri, AUDIO_CACHE_DIR
from geo_matcher import get_phones_in_radius
from synthetic_data import load_or_generate_registry, SYNTHETIC_LOCATIONS
from alert_dispatcher import dispatch_alerts, get_alert_history, register_ws_callback, unregister_ws_callback

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Load synthetic fishermen registry at startup
REGISTRY = load_or_generate_registry()
print(f"[CoastGuard] [OK] Loaded {len(REGISTRY)} registered synthetic vessels across {len(SYNTHETIC_LOCATIONS)} clusters.")

app = FastAPI(
    title="CoastGuard AI",
    description="Zero-UI Voice Emergency Grid — Powered by Gnani Prisma v2.5, Evon v3.3, Timbre v2.5",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dir = Path(__file__).parent.parent / "frontend"


# ─────────────────────────────────────────────
# WebSocket Manager
# ─────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for ws in self.active_connections:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws)


manager = ConnectionManager()


@app.on_event("startup")
async def startup():
    async def ws_broadcast(event):
        await manager.broadcast(event)
    register_ws_callback(ws_broadcast)
    print("[CoastGuard] [STARTUP] Emergency Engine live on port 8000. WebSockets ready.")


# ─────────────────────────────────────────────
# Static and Root Endpoints
# ─────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the Command Dashboard."""
    index_file = frontend_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return HTMLResponse("<h1>CoastGuard AI Backend Running</h1>")


@app.get("/style.css")
async def serve_css():
    css_file = frontend_dir / "style.css"
    if css_file.exists():
        return FileResponse(str(css_file), media_type="text/css")
    raise HTTPException(status_code=404, detail="style.css not found")


@app.get("/dashboard.js")
async def serve_js():
    js_file = frontend_dir / "dashboard.js"
    if js_file.exists():
        return FileResponse(str(js_file), media_type="application/javascript")
    raise HTTPException(status_code=404, detail="dashboard.js not found")


@app.get("/api/audio/{filename}")
async def serve_audio(filename: str):
    """Stream generated alert audio clips."""
    audio_file = AUDIO_CACHE_DIR / filename
    if audio_file.exists():
        return FileResponse(str(audio_file), media_type="audio/wav")
    raise HTTPException(status_code=404, detail="Audio file not found")


# ─────────────────────────────────────────────
# Core API Routes
# ─────────────────────────────────────────────
@app.post("/api/emergency/call")
async def process_emergency_call(
    audio: Optional[UploadFile] = File(None),
    caller_lat: float = Form(25.3176),
    caller_lon: float = Form(83.0060),
    language: str = Form("hi"),
    transcript_override: Optional[str] = Form(None)
):
    """
    Main Telephony Intake Endpoint:
    1. Prisma v2.5: Strips wind/water acoustic noise & transcribes speech
    2. Evon v3.3: Classifies severity (CRITICAL/WARNING/INFO) & parses dialects/locations
    3. Geo-Matching Engine: Finds registered boats/phones within 2km blast radius
    4. Timbre v2.5: Synthesizes warm Indic spoken voice alert
    5. Alert Dispatcher: Simulates outbound emergency calls
    """
    filename = audio.filename if audio else "live_telephony_stream.wav"
    await manager.broadcast({
        "type": "call_received",
        "data": {
            "timestamp": datetime.now().isoformat(),
            "lat": caller_lat,
            "lon": caller_lon,
            "language": language,
            "filename": filename,
        }
    })

    # Step 1: Prisma v2.5 STT
    if transcript_override:
        transcript = transcript_override
        stt_result = {
            "transcript": transcript,
            "confidence": 0.95,
            "language_detected": language,
            "model": "prisma-v2.5",
            "noise_suppressed_db": "+19.2 dB",
            "acoustic_shield_active": True,
            "latency_ms": 168
        }
    elif audio:
        audio_bytes = await audio.read()
        stt_result = await transcribe_bytes(audio_bytes, language=language, filename=audio.filename)
        transcript = stt_result["transcript"]
    else:
        stt_result = await transcribe_bytes(b"", language=language, filename="simulated.wav")
        transcript = stt_result["transcript"]

    await manager.broadcast({
        "type": "transcript_ready",
        "data": stt_result
    })
    await asyncio.sleep(0.15)

    # Step 2: Evon v3.3 Reasoning & Cognitive Classification
    classification = await classify_emergency(transcript, language_hint=language)
    await manager.broadcast({
        "type": "classification_ready",
        "data": classification
    })
    await asyncio.sleep(0.15)

    # Step 3: Geo-matching within 2.0 km radius
    nearby = get_phones_in_radius(REGISTRY, caller_lat, caller_lon, radius_km=2.0)
    await manager.broadcast({
        "type": "geo_match_ready",
        "data": {
            "phones_found": len(nearby),
            "radius_km": 2.0,
            "caller_location": {"lat": caller_lat, "lon": caller_lon},
            "nearby_sample": nearby[:6]
        }
    })
    await asyncio.sleep(0.15)

    # Steps 4 & 5: Timbre v2.5 Voice Synthesis + Outbound Flash Dispatch
    report = await dispatch_alerts(
        classification=classification,
        nearby_phones=nearby,
        caller_lat=caller_lat,
        caller_lon=caller_lon,
        transcript=transcript,
    )

    return JSONResponse(content={
        "status": "success",
        "pipeline": {
            "stt": stt_result,
            "classification": classification,
            "geo_match": {"phones_in_radius": len(nearby)},
            "dispatch": report,
        }
    })


@app.post("/api/emergency/demo")
async def demo_emergency(scenario: int = 0):
    """
    Simulate pre-configured emergency scenarios representing varied Indian geography and dialects.
    """
    scenarios = [
        {
            "id": 0,
            "title": "Boat Capsized in Varanasi Rapids (Bhojpuri/Hindi)",
            "transcript": "Bhaiya! Yahan bahaav bohot tez hai, naav ulat gayi, teen aadmi hain paani mein, ghat number saat ke paas hain jaldi aao bachao!",
            "lat": 25.3176,
            "lon": 83.0060,
            "cluster_name": "Varanasi Ghat Cluster",
            "language": "hi",
        },
        {
            "id": 1,
            "title": "Flash Flood Rising Surge (Patna Ganga)",
            "transcript": "Flash flood aa raha hai river mein, paani do haath upar chadha hai, sabko saawdhan karo hum teesre ghat pe hain!",
            "lat": 25.5941,
            "lon": 85.1376,
            "cluster_name": "Patna Ghat Cluster",
            "language": "hi",
        },
        {
            "id": 2,
            "title": "Severe Squall Storm (Kolkata Ferry Terminal)",
            "transcript": "Toofan aa raha hai, hawa bohot tez hai nouka majhi der saawdhan koro ferry point er kache shobai ache!",
            "lat": 22.5726,
            "lon": 88.3639,
            "cluster_name": "Kolkata Ferry Terminal",
            "language": "bn",
        },
        {
            "id": 3,
            "title": "Code-Mixed Hinglish High Danger Call (Mumbai Sassoon)",
            "transcript": "Emergency alert! High tide water level dangerous increase ho raha hai, dock side boat flip ho gaya help chahiye!",
            "lat": 18.9388,
            "lon": 72.8354,
            "cluster_name": "Mumbai Harbour",
            "language": "hi",
        },
        {
            "id": 4,
            "title": "Chilika Lake Cyclone Warning (Odia / Coastal)",
            "transcript": "Samudra paban bahut jore asuchi danga sabu kinara ku ana pani bodi jauchi jaldi!",
            "lat": 19.7254,
            "lon": 85.3298,
            "cluster_name": "Chilika Lake",
            "language": "or",
        }
    ]

    selected = scenarios[scenario % len(scenarios)]

    # Jitter coordinates slightly around cluster centroid
    caller_lat = selected["lat"] + random.uniform(-0.003, 0.003)
    caller_lon = selected["lon"] + random.uniform(-0.003, 0.003)

    return await process_emergency_call(
        audio=None,
        caller_lat=caller_lat,
        caller_lon=caller_lon,
        language=selected["language"],
        transcript_override=selected["transcript"]
    )


@app.get("/api/alerts/history")
async def get_history():
    """Return historical dispatch logs."""
    return JSONResponse(content={"alerts": get_alert_history()})


@app.get("/api/registry/list")
async def get_registry():
    """Return registered synthetic vessels for live map rendering."""
    return JSONResponse(content={
        "total": len(REGISTRY),
        "clusters": SYNTHETIC_LOCATIONS,
        "vessels": REGISTRY
    })


@app.get("/api/registry/stats")
async def registry_stats():
    """Registry overview stats."""
    return JSONResponse(content={
        "total_registered": len(REGISTRY),
        "clusters_count": len(SYNTHETIC_LOCATIONS),
        "dialects_supported": ["Hindi", "Bhojpuri", "Bengali", "Odia", "Marathi", "Hinglish"],
        "models": {
            "stt": "Gnani Prisma v2.5",
            "reasoning": "Gnani Evon v3.3",
            "tts": "Gnani Timbre v2.5"
        },
        "note": "100% synthetic coordinates & numbers. Safe for public hackathon demonstration."
    })


# ─────────────────────────────────────────────
# Live WebSocket Gateway
# ─────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for live dashboard telemetry & bidirectional control.
    """
    await manager.connect(websocket)
    try:
        # Initial greeting and state sync
        await websocket.send_json({
            "type": "connected",
            "data": {
                "message": "CoastGuard AI Sovereign Command Center Connected",
                "registered_count": len(REGISTRY),
                "clusters": len(SYNTHETIC_LOCATIONS),
                "recent_alerts": get_alert_history()[:5],
            }
        })
        while True:
            raw_text = await websocket.receive_text()
            try:
                msg = json.loads(raw_text)
                action = msg.get("action")
                if action == "demo":
                    sc_index = msg.get("scenario", 0)
                    asyncio.create_task(demo_emergency(scenario=sc_index))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Mount static directory if existing
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
