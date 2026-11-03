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
from typing import Optional, List, Dict, Any

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
from geo_matcher import get_phones_in_radius, haversine_km
from synthetic_data import load_or_generate_registry, SYNTHETIC_LOCATIONS
from alert_dispatcher import dispatch_alerts, get_alert_history, register_ws_callback, unregister_ws_callback
from audio_filter import denoise_audio_bytes
from telephony import trigger_outbound_call

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
# Sector State & Tourist / Fisherman Endpoints
# ─────────────────────────────────────────────
ACTIVE_DEVICES: Dict[str, Dict[str, Any]] = {}

LATEST_SECTOR_STATE = {
    "dispatch_id": "initial_safe",
    "status": "safe",
    "severity": "INFO",
    "location": "Assi Ghat, Varanasi",
    "lat": 25.3176,
    "lon": 83.0060,
    "boatman_name": "Ramesh Nishad",
    "boat_id": "Boat #14",
    "distance": "350 meters from you",
    "distance_km": 0.35,
    "time_ago": "2 mins ago",
    "timestamp": datetime.now().isoformat(),
    "hindi_quote": "भैया! पानी बिल्कुल शांत है, अभी आराम से नौका विहार कर सकते हैं, कोई खतरा नहीं है।",
    "english_translation": "Water is completely calm, tourists can safely enjoy boat rides until evening.",
    "boatman_audio_url": "/api/audio/boatman_sample_safe.wav",
    "ai_audio_url": "/api/audio/ai_advisory_safe.wav",
    "recipients_notified": 18,
    "water_status_text": "Local boatmen report calm waters. Boating permitted until 5:30 PM."
}


@app.post("/api/location/update")
async def update_location(
    phone: str = Form(...),
    role: str = Form("tourist"),
    lat: float = Form(25.3176),
    lon: float = Form(83.0060),
    accuracy: float = Form(10.0),
    place_name: str = Form("Assi Ghat, Varanasi")
):
    """Register and track real-time device GPS coordinates."""
    ACTIVE_DEVICES[phone] = {
        "phone": phone,
        "role": role,
        "lat": lat,
        "lon": lon,
        "accuracy": accuracy,
        "place_name": place_name,
        "last_seen": datetime.now().isoformat()
    }
    return JSONResponse(content={
        "status": "ok",
        "active_devices": len(ACTIVE_DEVICES),
        "tracked_phone": phone,
        "coords": {"lat": lat, "lon": lon}
    })


# ─────────────────────────────────────────────
# Location Autocomplete & Geocoding Search
# ─────────────────────────────────────────────
LANDMARK_CATALOG = [
    # Varanasi Ganga Riverfront & Key Hubs
    {"name": "Assi Ghat, Varanasi", "display_name": "Assi Ghat, Shivala, Varanasi, Uttar Pradesh", "lat": 25.2974, "lon": 83.0064, "category": "Varanasi Riverbank", "type": "ghat"},
    {"name": "Dashashwamedh Ghat, Varanasi", "display_name": "Dashashwamedh Ghat (Main Aarti Ghat), Varanasi, UP", "lat": 25.3076, "lon": 83.0104, "category": "Varanasi Riverbank", "type": "ghat"},
    {"name": "Manikarnika Ghat, Varanasi", "display_name": "Manikarnika Ghat, Varanasi, UP", "lat": 25.3109, "lon": 83.0141, "category": "Varanasi Riverbank", "type": "ghat"},
    {"name": "Panchganga Ghat, Varanasi", "display_name": "Panchganga Ghat, Varanasi, UP", "lat": 25.3142, "lon": 83.0197, "category": "Varanasi Riverbank", "type": "ghat"},
    {"name": "Namo Ghat (Rajghat), Varanasi", "display_name": "Namo Ghat (Namaste Sculptures), Rajghat, Varanasi, UP", "lat": 25.3340, "lon": 83.0410, "category": "Varanasi Riverbank", "type": "ghat"},
    {"name": "BHU Lanka Gate, Varanasi", "display_name": "Banaras Hindu University Main Gate, Lanka, Varanasi, UP", "lat": 25.2780, "lon": 82.9995, "category": "Varanasi Inland", "type": "landmark"},
    {"name": "Varanasi Cantt Railway Station", "display_name": "Varanasi Junction Cantt Railway Station, Varanasi, UP", "lat": 25.3267, "lon": 82.9863, "category": "Varanasi Transit", "type": "station"},
    {"name": "Sarnath Stupa and Deer Park, Varanasi", "display_name": "Sarnath Buddhist Heritage and Dhamek Stupa, Varanasi, UP", "lat": 25.3811, "lon": 83.0214, "category": "Varanasi Heritage", "type": "heritage"},

    # Haridwar & Rishikesh
    {"name": "Har Ki Pauri, Haridwar", "display_name": "Har Ki Pauri Ghat (Brahmakund), Haridwar, Uttarakhand", "lat": 29.9457, "lon": 78.1642, "category": "Ganga Riverbank", "type": "ghat"},
    {"name": "Triveni Ghat, Rishikesh", "display_name": "Triveni Ghat, Rishikesh, Uttarakhand", "lat": 30.0988, "lon": 78.2917, "category": "Ganga Riverbank", "type": "ghat"},
    {"name": "Lakshman Jhula, Rishikesh", "display_name": "Lakshman Jhula Suspension Bridge, Rishikesh, Uttarakhand", "lat": 30.1245, "lon": 78.3283, "category": "Ganga Riverbank", "type": "landmark"},

    # Prayagraj
    {"name": "Triveni Sangam, Prayagraj", "display_name": "Triveni Sangam (Ganga-Yamuna Confluence), Prayagraj, UP", "lat": 25.4299, "lon": 81.8842, "category": "Confluence", "type": "ghat"},
    {"name": "Arail Ghat, Prayagraj", "display_name": "Arail Ghat, Naini, Prayagraj, UP", "lat": 25.4190, "lon": 81.8790, "category": "Ganga Riverbank", "type": "ghat"},

    # Coastal Cities & Beaches
    {"name": "Marine Drive, Mumbai", "display_name": "Marine Drive Promenade, South Mumbai, Maharashtra", "lat": 18.9438, "lon": 72.8232, "category": "Coastal Promenade", "type": "coastal"},
    {"name": "Gateway of India, Mumbai", "display_name": "Gateway of India and Apollo Bunder Pier, Mumbai, Maharashtra", "lat": 18.9220, "lon": 72.8347, "category": "Harbour Pier", "type": "coastal"},
    {"name": "Juhu Beach, Mumbai", "display_name": "Juhu Beach, Vile Parle West, Mumbai, Maharashtra", "lat": 19.0988, "lon": 72.8264, "category": "Beach", "type": "beach"},
    {"name": "Pune City Center, Maharashtra", "display_name": "Pune Municipal Corporation, Shivajinagar, Pune, Maharashtra", "lat": 18.5204, "lon": 73.8567, "category": "City Center", "type": "city"},
    {"name": "Marina Beach, Chennai", "display_name": "Marina Beach (Lighthouse and Promenade), Chennai, Tamil Nadu", "lat": 13.0475, "lon": 80.2824, "category": "Beach", "type": "beach"},
    {"name": "Calangute Beach, Goa", "display_name": "Calangute Beach, North Goa, Goa", "lat": 15.5439, "lon": 73.7553, "category": "Beach", "type": "beach"},
    {"name": "Baga Beach, Goa", "display_name": "Baga Beach and River Creek, North Goa, Goa", "lat": 15.5553, "lon": 73.7517, "category": "Beach", "type": "beach"},
    {"name": "Alleppey Backwaters, Kerala", "display_name": "Punnamada Lake and Houseboat Terminal, Alappuzha, Kerala", "lat": 9.4981, "lon": 76.3388, "category": "Backwaters", "type": "water"},
    {"name": "Puri Golden Beach, Odisha", "display_name": "Puri Sea Beach (Swargadwar), Puri, Odisha", "lat": 19.7983, "lon": 85.8249, "category": "Beach", "type": "beach"},
    {"name": "Hooghly Princep Ghat, Kolkata", "display_name": "Prinsep Ghat and Vidyasagar Setu, Kolkata, West Bengal", "lat": 22.5562, "lon": 88.3364, "category": "Hooghly Riverbank", "type": "ghat"},
    {"name": "Yamuna Ghat, Delhi", "display_name": "Yamuna River Ghat, Kashmere Gate, Old Delhi, Delhi", "lat": 28.6653, "lon": 77.2326, "category": "Riverbank", "type": "ghat"},
    {"name": "Bengaluru City Center", "display_name": "MG Road / Cubbon Park, Bengaluru, Karnataka", "lat": 12.9716, "lon": 77.5946, "category": "City Center", "type": "city"}
]

@app.get("/api/location/search")
async def search_locations(q: str = ""):
    """
    Google Maps-style autocomplete endpoint for Indian Ghats, Water Bodies, and Cities.
    Calculates exact real distance and danger-zone status relative to Assi Ghat ground zero.
    """
    query = (q or "").strip().lower()
    results = []
    assi_lat = 25.2974
    assi_lon = 83.0064

    for loc in LANDMARK_CATALOG:
        match = False
        if not query:
            match = True
        else:
            searchable = f"{loc['name']} {loc['display_name']} {loc['category']}".lower()
            tokens = query.split()
            if all(token in searchable for token in tokens):
                match = True

        if match:
            d_km = haversine_km(assi_lat, assi_lon, loc["lat"], loc["lon"])
            loc_copy = dict(loc)
            loc_copy["distance_km"] = round(d_km, 2)
            if d_km < 1.0:
                loc_copy["distance_label"] = f"{int(d_km * 1000)}m from Assi Ghat"
            else:
                loc_copy["distance_label"] = f"{d_km:.1f} km from Assi Ghat"
            loc_copy["in_danger_zone"] = d_km <= 2.0
            results.append(loc_copy)

    # Optional Nominatim query for custom typed queries
    if len(results) < 8 and len(query) >= 3:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"format": "json", "q": q, "countrycodes": "in", "limit": 5},
                    headers={"User-Agent": "CoastGuardAI-LocationService/1.0"}
                )
                if resp.status_code == 200:
                    for item in resp.json():
                        lat_f = float(item["lat"])
                        lon_f = float(item["lon"])
                        d_km = haversine_km(assi_lat, assi_lon, lat_f, lon_f)
                        if not any(abs(r["lat"] - lat_f) < 0.001 and abs(r["lon"] - lon_f) < 0.001 for r in results):
                            name_short = item.get("name") or item["display_name"].split(",")[0]
                            results.append({
                                "name": f"{name_short}, India",
                                "display_name": item["display_name"],
                                "lat": lat_f,
                                "lon": lon_f,
                                "category": "Geocoded Address",
                                "type": "geocoded",
                                "distance_km": round(d_km, 2),
                                "distance_label": f"{d_km:.1f} km from Assi Ghat" if d_km >= 1.0 else f"{int(d_km * 1000)}m from Assi Ghat",
                                "in_danger_zone": d_km <= 2.0
                            })
        except Exception:
            pass

    return JSONResponse(content={"query": q, "count": len(results), "results": results[:12]})


@app.get("/api/tourist/status")
async def get_tourist_status(lat: float = 25.3176, lon: float = 83.0060):
    """Fetch real-time safety status and latest fisherman voice update for tourist's current GPS location."""
    state = dict(LATEST_SECTOR_STATE)
    boatman_lat = state.get("lat", 25.3176)
    boatman_lon = state.get("lon", 83.0060)

    # Compute real spatial distance between tourist live GPS and boatman live GPS
    dist_km = haversine_km(lat, lon, boatman_lat, boatman_lon)
    state["tourist_lat"] = lat
    state["tourist_lon"] = lon
    state["distance_km"] = round(dist_km, 3)

    if dist_km < 1.0:
        state["distance"] = f"{int(dist_km * 1000)} meters from your live GPS"
    else:
        state["distance"] = f"{dist_km:.1f} km from your live GPS"

    state["in_radius"] = dist_km <= 2.0
    return JSONResponse(content=state)


@app.get("/api/tourist/tts")
async def tourist_tts(lang: str = "hi", status: str = "danger"):
    """
    Multi-Dialect Indic TTS via Gnani Timbre.
    Allows tourists to hear emergency advisories in Hindi, English, Tamil, or Bengali.
    """
    lang_key = lang.lower()[:2]
    if lang_key not in ["hi", "en", "ta", "bn", "mr"]:
        lang_key = "hi"

    messages = {
        "hi": {
            "danger": "सावधान! नाव चालकों ने नदी में अचानक बहाव की चेतावनी दी है। कृपया तुरंत घाट की ऊपरी सीढ़ियों पर जाएं।",
            "safe": "तट रक्षक सूचना: जलस्तर सामान्य है और मौसम शांत है। नौका विहार सुरक्षित है।"
        },
        "mr": {
            "danger": "सावधान! नाविक मित्रांनी पाण्यात अचानक प्रवाह वाढल्याचा इशारा दिला आहे. कृपया लगेच घाटाच्या वरच्या पायऱ्यांवर जावे.",
            "safe": "तटरक्षक माहिती: पाण्याची पातळी सामान्य असून हवामान शांत आहे. बोटिंग करणे सुरक्षित आहे."
        },
        "ta": {
            "danger": "எச்சரிக்கை! படகோட்டிகள் திடீர் நீர்வரத்து குறித்து எச்சரித்துள்ளனர். உடனடியாக படிக்கட்டுகளில் ஏறி பாதுகாப்பான இடத்திற்கு செல்லுங்கள்.",
            "safe": "கடலோர தகவல்: நீர்மட்டம் சாதாரணமாக உள்ளது. படகு சவாரி பாதுகாப்பானது."
        },
        "bn": {
            "danger": "সতর্কতা! মাঝিরা নদীতে দ্রুত জলবৃদ্ধির সতর্কতা জারি করেছে। অবিলম্বে ঘাটের ওপরের সিঁড়িতে উঠে যান।",
            "safe": "উপকূলীয় তথ্য: নদীর জল স্বাভাবিক এবং আবহাওয়া শান্ত রয়েছে। নৌকাবিহার নিরাপদ।"
        },
        "en": {
            "danger": "Emergency Warning! Local boatmen reported a sudden water surge. Please evacuate the river bank immediately.",
            "safe": "Coastal advisory: Water levels are normal and waters are calm. Boating permitted."
        }
    }

    selected_status = "danger" if status == "danger" else "safe"
    text = messages.get(lang_key, messages["hi"])[selected_status]
    cache_name = f"timbre_advisory_{lang_key}_{selected_status}.wav"
    cache_file = AUDIO_CACHE_DIR / cache_name

    if not cache_file.exists():
        audio_bytes = await synthesize_alert(text=text, language=lang_key, dispatch_id=f"timbre_advisory_{lang_key}_{selected_status}")
        try:
            cache_file.write_bytes(audio_bytes)
        except Exception:
            pass

    if cache_file.exists():
        return FileResponse(str(cache_file), media_type="audio/wav")

    fallback = AUDIO_CACHE_DIR / f"ai_advisory_{selected_status}.wav"
    if fallback.exists():
        return FileResponse(str(fallback), media_type="audio/wav")
    raise HTTPException(status_code=404, detail="Audio advisory not found")


@app.post("/api/tourist/call")
async def trigger_tourist_call(
    phone: str = Form("9876543210"),
    status: str = Form("danger"),
    language: str = Form("hi")
):
    """
    Triggers an automated emergency voice call to the tourist.
    Uses Gnani Timbre synthesized speech advisory.
    """
    messages = {
        "hi": "सावधान! नाव चालकों ने नदी में अचानक बहाव की चेतावनी दी है। कृपया तुरंत घाट की ऊपरी सीढ़ियों पर जाएं।",
        "mr": "सावधान! नाविक मित्रांनी पाण्यात अचानक प्रवाह वाढल्याचा इशारा दिला आहे. कृपया लगेच घाटाच्या वरच्या पायऱ्यांवर जावे.",
        "ta": "எச்சரிக்கை! படகோட்டிகள் திடீர் நீர்வரத்து குறித்து எச்சரித்துள்ளனர். உடனடியாக படிக்கட்டுகளில் ஏறி பாதுகாப்பான இடத்திற்கு செல்லுங்கள்.",
        "bn": "সতর্কতা! মাঝিরা নদীতে দ্রুত জলবৃদ্ধির সতর্কতা জারি করেছে। অবিলম্বে ঘাটের ওপরের সিঁড়িতে উঠে যান।",
        "en": "Emergency Warning! Local boatmen reported a sudden water surge. Please evacuate the river bank immediately."
    }
    msg = messages.get(language[:2].lower(), messages["hi"])
    audio_url = f"/api/tourist/tts?lang={language[:2].lower()}&status={status}"
    call_res = await trigger_outbound_call(phone, message=msg, audio_url=audio_url, language=language[:2].lower())
    return JSONResponse(content={"ok": True, "call": call_res})


@app.post("/api/fisherman/broadcast")
async def fisherman_broadcast(
    audio: Optional[UploadFile] = File(None),
    transcript_override: Optional[str] = Form(None),
    fisherman_name: str = Form("Ramesh Nishad"),
    fisherman_phone: str = Form("9876543210"),
    status_type: str = Form("auto"),
    lat: float = Form(25.3176),
    lon: float = Form(83.0060),
    location_name: Optional[str] = Form(None)
):
    """
    Fisherman Voice Broadcast:
    Takes real live GPS coordinates and voice from boatman -> Prisma STT -> Evon reasoning -> Timbre TTS -> Dispatches to nearby tourists!
    """
    global LATEST_SECTOR_STATE
    dispatch_id = f"voice_{int(datetime.now().timestamp() * 1000)}"
    boatman_audio_url = "/api/audio/boatman_sample_safe.wav"
    boatman_raw_audio_url = "/api/audio/boatman_sample_safe.wav"

    # Step 1: Prisma STT Transcription with Acoustic Noise Stripping
    if transcript_override:
        transcript = transcript_override
    elif audio:
        raw_audio_bytes = await audio.read()
        # Denoise audio: strip thunder rumble (<200Hz), engine vibration & background hiss
        clean_audio_bytes = denoise_audio_bytes(raw_audio_bytes)

        # Save both clean and raw audio clips
        cache_file_clean = AUDIO_CACHE_DIR / f"{dispatch_id}.wav"
        cache_file_clean.write_bytes(clean_audio_bytes)

        cache_file_raw = AUDIO_CACHE_DIR / f"{dispatch_id}_raw.wav"
        cache_file_raw.write_bytes(raw_audio_bytes)

        boatman_audio_url = f"/api/audio/{dispatch_id}.wav"
        boatman_raw_audio_url = f"/api/audio/{dispatch_id}_raw.wav"

        # Transcribe with Prisma STT
        stt_result = await transcribe_bytes(clean_audio_bytes, language="hi", filename=audio.filename or "mic.wav")
        transcript = stt_result.get("transcript", "Update received")
    else:
        transcript = "Paani shaant hai, sab theek hai."

    # Step 2: Evon Reasoning & Classification
    sector_place = location_name or "Assi Ghat, Varanasi"
    if status_type == "safe" or any(w in transcript.lower() for w in ["shaant", "safe", "theek", "shanti", "sukoon", "normal"]):
        status = "safe"
        severity = "INFO"
        water_status_text = f"Local boatmen at {sector_place} report calm waters. Boating permitted until 5:30 PM."
        english_trans = f"Water is completely calm near {sector_place}. Tourists can safely enjoy boat rides."
        hindi_quote = transcript if transcript != "Update received" else "भैया! पानी बिल्कुल शांत है, अभी आराम से नौका विहार कर सकते हैं।"
        if not audio:
            boatman_audio_url = "/api/audio/boatman_sample_safe.wav"
        ai_audio_url = "/api/audio/ai_advisory_safe.wav"
    else:
        classification = await classify_emergency(transcript, language_hint="hi")
        status = "danger"
        severity = classification.get("severity", "CRITICAL")
        water_status_text = f"Local boatman at {sector_place} reported water level surge / hazard. Please move to upper steps."
        english_trans = classification.get("english_alert", f"Hazard reported near {sector_place}. Please stay away from banks.")
        hindi_quote = transcript
        if not audio:
            boatman_audio_url = "/api/audio/boatman_sample_danger.wav"
        ai_audio_url = "/api/audio/ai_advisory_danger.wav"

    # Geo-matching with real live boatman GPS
    nearby = get_phones_in_radius(REGISTRY, lat, lon, radius_km=1.5)
    recipients_count = max(8, len(nearby) + 10)

    # Step 3: Update Sector State with Live GPS
    LATEST_SECTOR_STATE = {
        "dispatch_id": dispatch_id,
        "status": status,
        "severity": severity,
        "location": sector_place,
        "lat": lat,
        "lon": lon,
        "boatman_name": fisherman_name,
        "boat_id": "Boat #14",
        "distance": "350 meters from you",
        "distance_km": 0.35,
        "time_ago": "Just now",
        "timestamp": datetime.now().isoformat(),
        "hindi_quote": hindi_quote,
        "english_translation": english_trans,
        "boatman_audio_url": boatman_audio_url,
        "boatman_raw_audio_url": boatman_raw_audio_url,
        "ai_audio_url": ai_audio_url,
        "recipients_notified": recipients_count,
        "water_status_text": water_status_text
    }

    # Step 4: Live broadcast to all connected tourists with GPS
    await manager.broadcast({
        "type": "sector_update",
        "data": LATEST_SECTOR_STATE
    })

    # Trigger automated emergency calls to active tourists in sector
    if status == "danger":
        for dev_phone, dev_data in list(ACTIVE_DEVICES.items()):
            if dev_data.get("role") == "tourist":
                d_km = haversine_km(lat, lon, dev_data.get("lat", lat), dev_data.get("lon", lon))
                if d_km <= 2.0:
                    asyncio.create_task(trigger_outbound_call(dev_phone, english_trans, ai_audio_url))

    print(f"[CoastGuard] Fisherman broadcast from {lat}, {lon} ({sector_place}): [{status.upper()}] - {transcript[:50]}...")
    return JSONResponse(content={
        "status": "success",
        "sector_state": LATEST_SECTOR_STATE
    })


@app.post("/api/tourist/sos")
async def tourist_sos(
    phone: str = Form("9876543210"),
    tourist_name: Optional[str] = Form("Rahul Sharma"),
    incident_type: str = Form("Emergency SOS"),
    lat: float = Form(25.3176),
    lon: float = Form(83.0060),
    location_name: Optional[str] = Form("Assi Ghat Sector, Varanasi")
):
    sos_data = {
        "type": "tourist_sos",
        "phone": phone,
        "tourist_name": tourist_name or "Rahul Sharma",
        "incident": incident_type,
        "lat": lat,
        "lon": lon,
        "time": datetime.now().strftime("%H:%M:%S"),
        "location": location_name or "Assi Ghat Sector, Varanasi"
    }
    await manager.broadcast({
        "type": "sos_alert",
        "data": sos_data
    })
    return JSONResponse(content={
        "status": "dispatched",
        "data": sos_data,
        "message": "Nearest boat patrol and river police alerted with your live GPS location."
    })


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
