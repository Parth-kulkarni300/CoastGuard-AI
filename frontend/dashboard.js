/**
 * CoastGuard AI — Command Dashboard Telemetry & Zero-UI Pipeline Controller
 * Handles WebSocket streams, acoustic waveforms, Evon cognitive triage, and Timbre TTS playback.
 */

let ws = null;
let currentScenario = 0;
let alertAudio = null;
let isAudioPlaying = false;
let alertsCount = 0;
let registeredVessels = [];

const API_BASE = window.location.origin;
const WS_URL = (window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host + "/ws";

// Cluster coordinates on SVG map (500x500 viewport projection)
const CLUSTER_MAP_COORDS = {
  "Varanasi": { cx: 295, cy: 175 },
  "Patna": { cx: 320, cy: 170 },
  "Kolkata": { cx: 360, cy: 225 },
  "Mumbai": { cx: 170, cy: 270 },
  "Chilika": { cx: 330, cy: 265 },
  "Haridwar": { cx: 230, cy: 135 },
  "Default": { cx: 295, cy: 175 }
};

document.addEventListener("DOMContentLoaded", () => {
  initWebSocket();
  loadInitialRegistry();
  alertAudio = document.getElementById("alert-audio-el");
});

// ────────────────────────────────────────────────────────
// 1. WebSocket Gateway
// ────────────────────────────────────────────────────────
function initWebSocket() {
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      statusDot.className = "status-dot connected";
      statusText.innerText = "Sovereign Grid Online";
      console.log("[CoastGuard] WebSocket telemetry connection established.");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handlePipelineEvent(msg);
      } catch (err) {
        console.error("Error parsing WS packet:", err);
      }
    };

    ws.onclose = () => {
      statusDot.className = "status-dot disconnected";
      statusText.innerText = "Reconnecting...";
      setTimeout(initWebSocket, 2500);
    };

    ws.onerror = (err) => {
      console.warn("WebSocket error:", err);
      statusDot.className = "status-dot disconnected";
    };
  } catch (e) {
    console.error("WebSocket init failure:", e);
  }
}

// ────────────────────────────────────────────────────────
// 2. Pipeline Event Stream Handlers
// ────────────────────────────────────────────────────────
function handlePipelineEvent(msg) {
  const type = msg.type;
  const data = msg.data;

  switch (type) {
    case "connected":
      if (data.registered_count) {
        document.getElementById("stat-registered").innerText = data.registered_count;
      }
      if (data.recent_alerts && data.recent_alerts.length > 0) {
        data.recent_alerts.forEach(renderFeedItem);
      }
      break;

    case "call_received":
      onCallReceived(data);
      break;

    case "transcript_ready":
      onTranscriptReady(data);
      break;

    case "classification_ready":
      onClassificationReady(data);
      break;

    case "geo_match_ready":
      onGeoMatchReady(data);
      break;

    case "call_dispatch":
      onCallDispatch(data);
      break;

    case "dispatch_complete":
      onDispatchComplete(data);
      break;
  }
}

function onCallReceived(data) {
  resetPipelineVisuals();
  setStepActive("pipe-call");
  document.getElementById("pipe-status-label").innerText = "Incoming Telephony Call — Stripping Acoustic Noise";
  
  // Animate sound wave bars
  document.getElementById("waveform-bars").classList.add("active");

  const rawEl = document.getElementById("transcript-raw");
  rawEl.innerHTML = `<span class="placeholder-text" style="color: var(--accent-cyan);">🎙️ Prisma v2.5 stripping wave & wind noise (<200ms streaming)...</span>`;

  // Move map radar pulse
  positionRadarPulse(data.lat, data.lon);
}

function onTranscriptReady(data) {
  setStepCompleted("pipe-call");
  setStepActive("pipe-prisma");
  document.getElementById("pipe-status-label").innerText = "Prisma v2.5 Acoustic Shield Active — Speech Isolated";

  const rawEl = document.getElementById("transcript-raw");
  rawEl.innerText = `"${data.transcript}"`;

  const confBadge = document.getElementById("conf-badge");
  confBadge.innerText = `Confidence: ${(data.confidence * 100).toFixed(0)}%`;

  if (data.noise_suppressed_db) {
    document.getElementById("shield-gain").innerText = data.noise_suppressed_db;
  }
}

function onClassificationReady(data) {
  setStepCompleted("pipe-prisma");
  setStepActive("pipe-evon");
  document.getElementById("pipe-status-label").innerText = `Evon v3.3 Reasoning Complete: ${data.severity}`;

  const cBox = document.getElementById("classify-box");
  cBox.style.display = "flex";

  const sevBadge = document.getElementById("sev-badge");
  sevBadge.className = `severity-pill ${data.severity}`;
  sevBadge.innerText = data.severity;

  document.getElementById("ci-threat").innerText = (data.threat_type || "Water Danger").toUpperCase().replace("_", " ");
  document.getElementById("ci-loc").innerText = data.location_hint || "Sector Waters";
  document.getElementById("ci-people").innerText = data.people_in_danger ? `${data.people_in_danger} Fishermen` : "Unspecified";
  document.getElementById("ci-dialect").innerText = data.dialect_detected || "Standard Indic";
  document.getElementById("ci-reasoning").innerText = `Reasoning: ${data.reasoning || "Classified via Evon 30B MoE"}`;

  document.getElementById("alert-msg-hi").innerText = data.hindi_alert || "सावधान! सुरक्षित स्थान पर जाएं।";
  document.getElementById("alert-msg-en").innerText = data.english_alert || "Warning: Evacuate low-water channels.";
}

function onGeoMatchReady(data) {
  setStepCompleted("pipe-evon");
  setStepActive("pipe-geomatch");
  document.getElementById("pipe-status-label").innerText = `Geo-Matched ${data.phones_found} registered vessels in 2km`;

  document.getElementById("phones-num").innerText = data.phones_found;
  document.getElementById("ds-radius").innerText = `${data.radius_km.toFixed(1)} km`;

  // Clear previous dispatch log for fresh call simulation
  const log = document.getElementById("dispatch-log");
  log.innerHTML = "";
  document.getElementById("ds-delivered").innerText = "0";
}

function onCallDispatch(data) {
  setStepCompleted("pipe-geomatch");
  setStepActive("pipe-timbre");
  document.getElementById("pipe-status-label").innerText = `Timbre v2.5 Dispatching Alerts... (${data.relative_position})`;

  const log = document.getElementById("dispatch-log");
  const card = document.createElement("div");
  card.className = "dispatch-card";

  const isDelivered = data.status === "DELIVERED";
  const statusClass = isDelivered ? "" : "BUSY";

  card.innerHTML = `
    <div class="dc-top">
      <span class="dc-name">${data.recipient_name}</span>
      <span class="dc-status ${statusClass}">${data.status}</span>
    </div>
    <div class="dc-middle">
      <span class="dc-phone">${data.phone}</span>
      <span>${data.relative_position}</span>
    </div>
    <div class="dc-bottom">
      <span>${data.boat_type}</span>
      <span>${data.latency_ms}ms · ${data.language.toUpperCase()}</span>
    </div>
  `;

  log.prepend(card);

  // Update delivered count
  const delEl = document.getElementById("ds-delivered");
  let currentDel = parseInt(delEl.innerText) || 0;
  if (isDelivered) {
    delEl.innerText = currentDel + 1;
  }
}

function onDispatchComplete(report) {
  setStepCompleted("pipe-timbre");
  document.getElementById("pipe-status-label").innerText = `Incident Response Completed — ${report.delivered} Alerts Delivered`;
  
  // Stop waveform pulse
  document.getElementById("waveform-bars").classList.remove("active");

  // Increment total alert count
  alertsCount++;
  document.getElementById("stat-alerts").innerText = alertsCount;

  // Add to left incident feed
  renderFeedItem(report);

  // Setup Timbre voice audio playback
  if (report.audio_base64 || report.audio_url) {
    const playerBar = document.getElementById("audio-player-bar");
    playerBar.style.display = "flex";
    
    const audioSrc = report.audio_base64 || report.audio_url;
    alertAudio.src = audioSrc;
    alertAudio.load();

    document.getElementById("ap-sub-text").innerText = `Spoken Alert (${report.audio_generated_kb} KB) ready for playback`;
    
    // Play automatically for dramatic live demo
    toggleAlertAudio(true);
  }
}

// ────────────────────────────────────────────────────────
// 3. Audio Player Controls
// ────────────────────────────────────────────────────────
function toggleAlertAudio(forcePlay = false) {
  if (!alertAudio) return;

  const playIcon = document.getElementById("ap-play-icon");

  if (forcePlay || alertAudio.paused) {
    alertAudio.play().then(() => {
      isAudioPlaying = true;
      playIcon.innerText = "⏸";
    }).catch(e => {
      console.log("Audio autoplay restricted by browser policy. Click to play:", e);
    });
  } else {
    alertAudio.pause();
    isAudioPlaying = false;
    playIcon.innerText = "▶";
  }

  alertAudio.onended = () => {
    isAudioPlaying = false;
    playIcon.innerText = "▶";
  };
}

// ────────────────────────────────────────────────────────
// 4. UI Actions & Scenario Triggers
// ────────────────────────────────────────────────────────
function triggerScenario(index) {
  currentScenario = index;

  // Update button active styling
  const btns = document.querySelectorAll(".sc-btn");
  btns.forEach((b, idx) => {
    b.classList.toggle("active", idx === index);
  });

  triggerDemo();
}

async function triggerDemo() {
  const btn = document.getElementById("btn-demo");
  btn.disabled = true;
  btn.innerText = "⚡ Processing...";

  try {
    const res = await fetch(`${API_BASE}/api/emergency/demo?scenario=${currentScenario}`, {
      method: "POST"
    });
    const json = await res.json();
    console.log("[CoastGuard] Scenario triggered:", json);
  } catch (e) {
    console.error("Demo trigger failed:", e);
  } finally {
    btn.disabled = false;
    btn.innerText = "▶ Trigger Selected";
  }
}

async function uploadAudio(input) {
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  const formData = new FormData();
  formData.append("audio", file);
  formData.append("caller_lat", "25.3176");
  formData.append("caller_lon", "83.0060");
  formData.append("language", "hi");

  const btn = document.getElementById("btn-demo");
  btn.innerText = "Uploading Audio...";

  try {
    const res = await fetch(`${API_BASE}/api/emergency/call`, {
      method: "POST",
      body: formData
    });
    const result = await res.json();
    console.log("[CoastGuard] Custom audio response:", result);
  } catch (err) {
    console.error("Custom audio upload failed:", err);
  } finally {
    btn.innerText = "▶ Trigger Selected";
    input.value = "";
  }
}

// ────────────────────────────────────────────────────────
// 5. Helper Functions: Pipeline Steps & Incident Feed
// ────────────────────────────────────────────────────────
function resetPipelineVisuals() {
  const steps = ["pipe-call", "pipe-prisma", "pipe-evon", "pipe-geomatch", "pipe-timbre"];
  steps.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = "pipe-step";
  });
}

function setStepActive(id) {
  const el = document.getElementById(id);
  if (el) el.className = "pipe-step active";
}

function setStepCompleted(id) {
  const el = document.getElementById(id);
  if (el) el.className = "pipe-step completed";
}

function renderFeedItem(report) {
  const empty = document.getElementById("feed-empty");
  if (empty) empty.style.display = "none";

  const feed = document.getElementById("alert-feed");
  const item = document.createElement("div");
  item.className = `feed-item ${report.severity || "CRITICAL"}`;

  const timeStr = report.timestamp ? new Date(report.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

  item.innerHTML = `
    <div class="fi-top">
      <span class="fi-sev" style="color: ${report.severity === 'CRITICAL' ? 'var(--accent-red)' : 'var(--accent-amber)'}">
        ${report.severity || 'ALERT'} · ${(report.threat_type || 'hazard').toUpperCase()}
      </span>
      <span class="fi-time">${timeStr}</span>
    </div>
    <div class="fi-text">"${report.transcript_excerpt || report.alert_text_hindi}"</div>
    <div class="fi-meta">
      📍 ${report.location_hint || 'Sector'} · 📢 ${report.delivered || report.total_alerted || 0} boats alerted
    </div>
  `;

  feed.prepend(item);
}

function positionRadarPulse(lat, lon) {
  const marker = document.getElementById("incident-marker");
  if (!marker) return;

  // Approximate coordinate matching to clusters
  let matched = CLUSTER_MAP_COORDS["Varanasi"];
  if (lat > 25.4 && lat < 25.8 && lon > 84.5) matched = CLUSTER_MAP_COORDS["Patna"];
  else if (lat > 22.0 && lat < 23.0 && lon > 87.5) matched = CLUSTER_MAP_COORDS["Kolkata"];
  else if (lat > 18.0 && lat < 20.0 && lon < 74.0) matched = CLUSTER_MAP_COORDS["Mumbai"];
  else if (lat > 19.0 && lat < 20.5 && lon > 84.5) matched = CLUSTER_MAP_COORDS["Chilika"];
  else if (lat > 29.0) matched = CLUSTER_MAP_COORDS["Haridwar"];

  const rings = marker.querySelectorAll("circle");
  rings.forEach(c => {
    c.setAttribute("cx", matched.cx);
    c.setAttribute("cy", matched.cy);
  });

  marker.style.display = "block";
}

// ────────────────────────────────────────────────────────
// 6. Initial Registry & Vessel Map Plotter
// ────────────────────────────────────────────────────────
async function loadInitialRegistry() {
  try {
    const res = await fetch(`${API_BASE}/api/registry/list`);
    const data = await res.json();
    if (data.vessels) {
      registeredVessels = data.vessels;
      document.getElementById("stat-registered").innerText = data.vessels.length;
      plotVesselsOnMap(data.vessels);
    }
  } catch (e) {
    console.log("Registry list load error (using default clusters):", e);
  }
}

function plotVesselsOnMap(vessels) {
  const g = document.getElementById("map-vessels");
  if (!g) return;
  g.innerHTML = "";

  // Render a sample of vessel dots around cluster centroids
  vessels.slice(0, 48).forEach(v => {
    let base = CLUSTER_MAP_COORDS["Varanasi"];
    if (v.cluster.includes("Patna")) base = CLUSTER_MAP_COORDS["Patna"];
    else if (v.cluster.includes("Kolkata")) base = CLUSTER_MAP_COORDS["Kolkata"];
    else if (v.cluster.includes("Mumbai")) base = CLUSTER_MAP_COORDS["Mumbai"];
    else if (v.cluster.includes("Chilika")) base = CLUSTER_MAP_COORDS["Chilika"];
    else if (v.cluster.includes("Haridwar")) base = CLUSTER_MAP_COORDS["Haridwar"];

    // Small jitter offset on SVG map
    const jitterX = (Math.sin(v.id.charCodeAt(3) * 11) * 16);
    const jitterY = (Math.cos(v.id.charCodeAt(4) * 17) * 16);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", base.cx + jitterX);
    circle.setAttribute("cy", base.cy + jitterY);
    circle.setAttribute("r", "2.8");
    circle.setAttribute("fill", "#00d4ff");
    circle.setAttribute("opacity", "0.6");
    circle.setAttribute("class", "map-boat-dot");
    
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${v.name} (${v.boat_type}) - ${v.phone}`;
    circle.appendChild(title);

    g.appendChild(circle);
  });
}
