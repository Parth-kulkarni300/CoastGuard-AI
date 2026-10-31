'use client'

import { useEffect, useState, useRef } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  MapPin,
  Mic,
  Pause,
  Phone,
  Play,
  Radio,
  Siren,
  Volume2,
  Waves,
  X
} from 'lucide-react'

type Mode = 'boatman' | 'tourist'
type Screen = 'login' | 'dashboard'
type Status = 'safe' | 'danger'

const API_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000'
const WS_URL = typeof window !== 'undefined'
  ? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + 'localhost:8000/ws'
  : 'ws://localhost:8000/ws'

// ─────────────────────────────────────────────
// 1. Role Login Component
// ─────────────────────────────────────────────
function RoleLogin({
  onContinue
}: {
  onContinue: (mode: Mode, phone: string) => void
}) {
  const [role, setRole] = useState<Mode>('tourist')
  const [phone, setPhone] = useState('9876543210')

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">
          <Waves />
        </div>
        <span className="eyebrow">SOVEREIGN WATER SAFETY · GNANI AI</span>
        <h1>
          CoastGuard <em>AI</em>
        </h1>
        <p className="login-intro">
          Real-time safety grid, powered by fishermen on the water.
        </p>

        <label className="login-label" htmlFor="phone">
          Enter Mobile Number / मोबाइल नंबर दर्ज करें
        </label>
        <input
          id="phone"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="9876543210"
        />

        <div className="role-picker" role="radiogroup" aria-label="Choose your role">
          <button
            type="button"
            className={role === 'boatman' ? 'role-card active' : 'role-card'}
            onClick={() => setRole('boatman')}
            role="radio"
            aria-checked={role === 'boatman'}
          >
            <span>🎣</span>
            <strong>I am a Boatman / Fisherman</strong>
            <small>नाविक (Voice Lifeline)</small>
          </button>
          <button
            type="button"
            className={role === 'tourist' ? 'role-card active' : 'role-card'}
            onClick={() => setRole('tourist')}
            role="radio"
            aria-checked={role === 'tourist'}
          >
            <span>🎒</span>
            <strong>I am a Tourist / Customer</strong>
            <small>पर्यटक (Safety Hub)</small>
          </button>
        </div>

        <div className="gps-badge">
          <MapPin /> Current Location: <strong>Assi Ghat, Varanasi</strong>
          <Check />
        </div>

        <button
          type="button"
          className="continue-button"
          onClick={() => onContinue(role, phone || '9876543210')}
        >
          Continue / लॉगिन करें <ChevronDown />
        </button>
        <p className="login-note">
          No password. No OTP hassle. Your location stays private.
        </p>
      </section>
    </main>
  )
}

// ─────────────────────────────────────────────
// 2. Top Bar
// ─────────────────────────────────────────────
function TopBar({
  mode,
  onSwitch
}: {
  mode: Mode
  onSwitch: () => void
}) {
  return (
    <header className="location-bar">
      <div className="identity">
        <MapPin />
        <span>
          {mode === 'boatman'
            ? 'Assi Ghat Sector · Varanasi (GPS Active)'
            : 'Your location: Assi Ghat, Varanasi'}
        </span>
      </div>
      <button type="button" className="switch-role" onClick={onSwitch}>
        Switch Role
      </button>
    </header>
  )
}

// ─────────────────────────────────────────────
// 3. SOS Modal for Tourists
// ─────────────────────────────────────────────
function SosModal({ close, phone }: { close: () => void; phone: string }) {
  const [dispatched, setDispatched] = useState(false)

  const sendSos = async (type: string) => {
    try {
      const fd = new FormData()
      fd.append('phone', phone)
      fd.append('incident_type', type)
      fd.append('lat', '25.3176')
      fd.append('lon', '83.0060')
      await fetch('/api/tourist/sos', { method: 'POST', body: fd })
      setDispatched(true)
      setTimeout(() => {
        close()
      }, 2500)
    } catch {
      setDispatched(true)
      setTimeout(() => {
        close()
      }, 2000)
    }
  }

  return (
    <div className="modal-backdrop">
      <section
        className="sos-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-title"
      >
        <button type="button" className="close-button" onClick={close} aria-label="Close">
          <X />
        </button>
        <div className="modal-siren">
          <Siren />
        </div>
        <span className="eyebrow">LIVE GPS 25.3176° N, 83.0060° E</span>
        <h2 id="sos-title">
          {dispatched ? 'Patrol Alerted!' : 'What happened?'}
        </h2>
        <p>
          {dispatched
            ? 'Your live GPS coordinates have been broadcast to the nearest river patrol boat.'
            : 'Choose the emergency so the nearest patrol boat can respond immediately.'}
        </p>

        {!dispatched && (
          <div className="incident-options">
            <button type="button" onClick={() => sendSos('Someone fell in water')}>
              Someone fell in water (व्यक्ति पानी में गिरा)
            </button>
            <button
              type="button"
              onClick={() => sendSos('Boat is drifting / engine stopped')}
            >
              Boat is drifting / engine stopped (नाव बह रही है)
            </button>
            <button type="button" onClick={() => sendSos('Medical emergency on boat')}>
              Medical emergency (चिकित्सा आपातकाल)
            </button>
          </div>
        )}

        <a className="call-button" href="tel:112">
          <Phone /> Call River Patrol Police · 112
        </a>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────
// 4. Tourist Dashboard (Customer View)
// ─────────────────────────────────────────────
function TouristDashboard({
  onSwitch,
  phone,
  initialStatus
}: {
  onSwitch: () => void
  phone: string
  initialStatus?: Status
}) {
  const [status, setStatus] = useState<Status>(initialStatus || 'safe')
  const [sos, setSos] = useState(false)
  const [playingBoatman, setPlayingBoatman] = useState(false)
  const [playingAi, setPlayingAi] = useState(false)

  // Sector state from backend
  const [boatmanName, setBoatmanName] = useState('Ramesh Nishad')
  const [distance, setDistance] = useState('350 meters from you · 2 mins ago')
  const [hindiQuote, setHindiQuote] = useState(
    '“भैया! पानी बिल्कुल शांत है, अभी आराम से नौका विहार कर सकते हैं, कोई खतरा नहीं है।”'
  )
  const [translation, setTranslation] = useState(
    'Water is completely calm, tourists can safely enjoy boat rides until evening.'
  )
  const [waterStatusText, setWaterStatusText] = useState(
    'Local boatmen report calm waters. Boating permitted until 5:30 PM.'
  )
  const [boatmanAudioUrl, setBoatmanAudioUrl] = useState('/api/audio/boatman_sample_safe.wav')
  const [aiAudioUrl, setAiAudioUrl] = useState('/api/audio/ai_advisory_safe.wav')

  const boatmanAudioRef = useRef<HTMLAudioElement | null>(null)
  const aiAudioRef = useRef<HTMLAudioElement | null>(null)

  // Fetch current status on mount & connect to live WebSocket
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/tourist/status')
        if (res.ok) {
          const data = await res.json()
          applySectorData(data)
        }
      } catch (err) {
        console.log('Using initial sector status:', err)
      }
    }
    fetchStatus()

    // WebSocket listener for real-time boatman broadcasts
    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(WS_URL)
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'sector_update' && msg.data) {
            applySectorData(msg.data)
          }
        } catch {}
      }
    } catch {}

    return () => {
      if (ws) ws.close()
    }
  }, [])

  const applySectorData = (data: any) => {
    if (data.status) setStatus(data.status === 'safe' ? 'safe' : 'danger')
    if (data.boatman_name) setBoatmanName(data.boatman_name)
    if (data.distance) setDistance(`${data.distance} · ${data.time_ago || 'just now'}`)
    if (data.hindi_quote) setHindiQuote(`“${data.hindi_quote}”`)
    if (data.english_translation) setTranslation(data.english_translation)
    if (data.water_status_text) setWaterStatusText(data.water_status_text)
    if (data.boatman_audio_url) setBoatmanAudioUrl(data.boatman_audio_url)
    if (data.ai_audio_url) setAiAudioUrl(data.ai_audio_url)
  }

  // Play / Pause Boatman Audio
  const toggleBoatmanAudio = () => {
    if (aiAudioRef.current) {
      aiAudioRef.current.pause()
      setPlayingAi(false)
    }

    if (!boatmanAudioRef.current) {
      boatmanAudioRef.current = new Audio(boatmanAudioUrl)
      boatmanAudioRef.current.onended = () => setPlayingBoatman(false)
    } else {
      boatmanAudioRef.current.src = boatmanAudioUrl
    }

    if (playingBoatman) {
      boatmanAudioRef.current.pause()
      setPlayingBoatman(false)
    } else {
      boatmanAudioRef.current.play().catch(() => {})
      setPlayingBoatman(true)
    }
  }

  // Play / Pause AI Safety Advisory
  const toggleAiAudio = () => {
    if (boatmanAudioRef.current) {
      boatmanAudioRef.current.pause()
      setPlayingBoatman(false)
    }

    if (!aiAudioRef.current) {
      aiAudioRef.current = new Audio(aiAudioUrl)
      aiAudioRef.current.onended = () => setPlayingAi(false)
    } else {
      aiAudioRef.current.src = aiAudioUrl
    }

    if (playingAi) {
      aiAudioRef.current.pause()
      setPlayingAi(false)
    } else {
      aiAudioRef.current.play().catch(() => {})
      setPlayingAi(true)
    }
  }

  return (
    <>
      <TopBar mode="tourist" onSwitch={onSwitch} />
      <main className="tourist-app">
        <div className="tourist-top">
          <div className="tracked-sector">
            <span className="eyebrow">TRACKED SECTOR</span>
            <strong>Within 1.5 km of riverfront (Assi Ghat)</strong>
          </div>
          <select className="language-select" aria-label="Language">
            <option>English</option>
            <option>हिंदी (Hindi)</option>
            <option>தமிழ் (Tamil)</option>
            <option>বাংলা (Bengali)</option>
          </select>
        </div>

        {/* 1. Dynamic Top Status Banner */}
        <section className={`status-card ${status}`}>
          <div className="status-label">
            {status === 'safe'
              ? '🟢 SAFE TO ROAM — ALL CLEAR AT YOUR LOCATION'
              : '🔴 DANGER ALERT — STAY AWAY FROM WATER'}
          </div>
          <p>{waterStatusText}</p>
        </section>

        {/* 2. Latest Update by Local Boatman */}
        <section className="local-update">
          <div className="update-heading">
            <div className="audio-icon">
              <Radio />
            </div>
            <div>
              <span className="eyebrow">LATEST VOICE UPDATE BY LOCAL BOATMAN</span>
              <h2>
                {boatmanName} <small>{distance}</small>
              </h2>
            </div>
          </div>

          <blockquote>{hindiQuote}</blockquote>
          <p className="translation">{translation}</p>

          <div className="audio-actions">
            <button type="button" onClick={toggleBoatmanAudio}>
              <span className="play-circle">
                {playingBoatman ? <Pause /> : <Play />}
              </span>
              Listen to Boatman&apos;s Voice
              <small>Denoised by Gnani Prisma v2.5</small>
            </button>

            <button type="button" onClick={toggleAiAudio}>
              <span className="play-circle">
                {playingAi ? <Pause /> : <Volume2 />}
              </span>
              Listen to AI Safety Advisory
              <small>Gnani Timbre Indic Spoken Voice</small>
            </button>
          </div>
        </section>

        {/* 3. Emergency SOS */}
        <button type="button" className="tourist-sos" onClick={() => setSos(true)}>
          <Siren /> I Need Help / Tourist SOS
          <small>Alerts nearest boat patrol with your live GPS location</small>
        </button>

        {/* Demo toggles */}
        <div className="demo-controls">
          <span>Demo controls:</span>
          <button
            type="button"
            onClick={() => {
              setStatus('safe')
              setWaterStatusText(
                'Local boatmen report calm waters. Boating permitted until 5:30 PM.'
              )
              setHindiQuote(
                '“भैया! पानी बिल्कुल शांत है, अभी आराम से नौका विहार कर सकते हैं, कोई खतरा नहीं है।”'
              )
              setTranslation(
                'Water is completely calm, tourists can safely enjoy boat rides until evening.'
              )
              setBoatmanAudioUrl('/api/audio/boatman_sample_safe.wav')
              setAiAudioUrl('/api/audio/ai_advisory_safe.wav')
            }}
          >
            Show Safe State
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus('danger')
              setWaterStatusText(
                'Local boatman reported water level surge / hazard 350m away. Please move to upper ghat steps.'
              )
              setHindiQuote(
                '“भैया! बहाव बहुत तेज है, नाव पलट गई है घाट के पास, जल्दी मदद भेजो!”'
              )
              setTranslation(
                'Severe current surging, boat capsize hazard reported near ghat. Stay away from banks.'
              )
              setBoatmanAudioUrl('/api/audio/boatman_sample_danger.wav')
              setAiAudioUrl('/api/audio/ai_advisory_danger.wav')
            }}
          >
            Show Danger State
          </button>
        </div>

        {sos && <SosModal phone={phone} close={() => setSos(false)} />}
      </main>
    </>
  )
}

// ─────────────────────────────────────────────
// 5. Boatman / Fisherman Dashboard
// ─────────────────────────────────────────────
function BoatmanDashboard({
  onSwitch,
  phone,
  onBroadcast
}: {
  onSwitch: () => void
  phone: string
  onBroadcast: (status: Status) => void
}) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [sent, setSent] = useState(false)
  const [sentText, setSentText] = useState(
    '“पानी शांत है, शाम तक आराम से घूम सकते हैं”'
  )
  const [recipientsCount, setRecipientsCount] = useState(18)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Recording timer
  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [recording])

  // Center Mic Toggle (Real MediaRecorder + API Dispatch)
  const toggleMic = async () => {
    if (recording) {
      // STOP recording & dispatch to backend
      setRecording(false)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      } else {
        // Fallback dispatch
        sendVoiceBroadcast(null, 'Paani shaant hai, sab theek hai ghat pe.')
      }
    } else {
      // START real browser mic recording
      setSeconds(0)
      setSent(false)
      audioChunksRef.current = []

      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          const mr = new MediaRecorder(stream)
          mediaRecorderRef.current = mr

          mr.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data)
          }

          mr.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
            stream.getTracks().forEach((track) => track.stop())
            await sendVoiceBroadcast(audioBlob)
          }

          mr.start()
          setRecording(true)
        } else {
          setRecording(true)
        }
      } catch {
        // If mic permission is denied, still allow simulated recording
        setRecording(true)
      }
    }
  }

  // Send broadcast to FastAPI backend
  const sendVoiceBroadcast = async (
    audioBlob: Blob | null,
    overrideText?: string,
    forcedStatus?: 'safe' | 'danger'
  ) => {
    try {
      const fd = new FormData()
      if (audioBlob) {
        fd.append('audio', audioBlob, 'fisherman_call.wav')
      }
      if (overrideText) {
        fd.append('transcript_override', overrideText)
      }
      fd.append('fisherman_phone', phone)
      fd.append('fisherman_name', 'Ramesh Nishad')
      fd.append('status_type', forcedStatus || 'auto')
      fd.append('lat', '25.3176')
      fd.append('lon', '83.0060')

      const res = await fetch('/api/fisherman/broadcast', {
        method: 'POST',
        body: fd
      })

      if (res.ok) {
        const data = await res.json()
        const state = data.sector_state
        setSent(true)
        setSentText(`“${state.hindi_quote || overrideText || 'वॉइस संदेश भेजा गया'}”`)
        setRecipientsCount(state.recipients_notified || 18)
        onBroadcast(state.status)
      } else {
        setSent(true)
        onBroadcast('safe')
      }
    } catch {
      setSent(true)
      if (overrideText) setSentText(`“${overrideText}”`)
      onBroadcast(forcedStatus || 'safe')
    }
  }

  // Quick scenario triggers
  const triggerSafeScenario = () => {
    const text = 'भैया! पानी बिल्कुल शांत है, सभी पर्यटक आराम से घूम सकते हैं।'
    setSentText(`“${text}”`)
    sendVoiceBroadcast(null, text, 'safe')
  }

  const triggerDangerScenario = () => {
    const text = 'भैया! बहाव बहुत तेज है, नाव पलट गई है घाट नंबर सात के पास, तुरंत मदद भेजो!'
    setSentText(`“${text}”`)
    sendVoiceBroadcast(null, text, 'danger')
  }

  return (
    <>
      <TopBar mode="boatman" onSwitch={onSwitch} />
      <main className="boatman-app">
        <div className="boatman-header">
          <div>
            <strong>नाविक: रमेश निषाद</strong>
            <span>Boat #14 · Assi Ghat, Varanasi</span>
          </div>
          <b className="network-status">● 18 tourists & 6 boats within 1.5 km</b>
        </div>

        {/* Giant Hero Mic Walkie Talkie Button */}
        <section
          className={`walkie ${recording ? 'recording' : ''} ${sent ? 'sent' : ''}`}
        >
          <button
            type="button"
            className="walkie-button"
            onClick={toggleMic}
            aria-label={
              recording ? 'Stop and send recording' : 'Start voice broadcast'
            }
          >
            {sent ? <Check /> : <Mic />}
          </button>

          <h1>
            {sent
              ? 'वॉइस अपडेट प्रसारित! (Voice update sent)'
              : recording
              ? `00:${String(seconds).padStart(2, '0')} · बोल रहे हैं (Listening...)`
              : 'बोलने के लिए दबाएं (TAP TO SPEAK)'}
          </h1>

          <p>
            {sent
              ? `Sent to ${recipientsCount} tourists & boats within 1.5 km!`
              : recording
              ? 'Prisma v2.5 stripping 85dB engine noise & transcribing…'
              : 'TAP TO BROADCAST VOICE UPDATE'}
          </p>

          <small>
            Speak in Hindi, Bhojpuri, Bengali, or English (Auto Denoised)
          </small>
        </section>

        {/* Quick Scenario Test Buttons */}
        <section className="scenario-buttons">
          <h2>Quick scenario test (1-Click Broadcast)</h2>
          <button type="button" onClick={triggerSafeScenario}>
            <Check /> Speak Safe Update
            <small>“Paani shaant hai, tourists can roam safely”</small>
          </button>
          <button type="button" onClick={triggerDangerScenario}>
            <AlertTriangle /> Speak Danger Emergency
            <small>“Bahaav tez hai, naav ulat gayi ghat ke paas!”</small>
          </button>
        </section>

        {/* Last Sent Broadcast Card */}
        <section className="last-broadcast">
          <span className="eyebrow">LAST SENT BROADCAST (अंतिम वॉइस संदेश)</span>
          <p>{sentText}</p>
          <strong>Delivered to {recipientsCount} tourists in your 1.5km radius.</strong>
        </section>
      </main>
    </>
  )
}

// ─────────────────────────────────────────────
// 6. Main Root Component
// ─────────────────────────────────────────────
export default function CoastguardDashboard() {
  const [screen, setScreen] = useState<Screen>('login')
  const [mode, setMode] = useState<Mode>('tourist')
  const [phone, setPhone] = useState('9876543210')
  const [currentStatus, setCurrentStatus] = useState<Status>('safe')

  const enter = (next: Mode, enteredPhone: string) => {
    setMode(next)
    setPhone(enteredPhone)
    setScreen('dashboard')
  }

  if (screen === 'login') {
    return <RoleLogin onContinue={enter} />
  }

  return (
    <div className="app-shell">
      {mode === 'tourist' ? (
        <TouristDashboard
          initialStatus={currentStatus}
          phone={phone}
          onSwitch={() => setScreen('login')}
        />
      ) : (
        <BoatmanDashboard
          phone={phone}
          onBroadcast={(status) => {
            setCurrentStatus(status)
          }}
          onSwitch={() => setScreen('login')}
        />
      )}
    </div>
  )
}
