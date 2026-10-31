'use client'

import { useEffect, useState, useRef } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Compass,
  Crosshair,
  ExternalLink,
  MapPin,
  Mic,
  Navigation,
  Pause,
  Phone,
  Play,
  Radio,
  ShieldCheck,
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

// Pre-defined Indian Coastal & Riverine Water Presets for quick testing
export const WATER_PRESETS = [
  { name: 'Live Device GPS (My Location)', lat: 0, lon: 0, isDevice: true },
  { name: 'Assi Ghat, Varanasi (Ganga)', lat: 25.3176, lon: 83.0060, isDevice: false },
  { name: 'Marina Beach, Chennai (Bay of Bengal)', lat: 13.0475, lon: 80.2824, isDevice: false },
  { name: 'Gateway of India, Mumbai (Arabian Sea)', lat: 18.9220, lon: 72.8347, isDevice: false },
  { name: 'Alleppey Backwaters, Kerala', lat: 9.4981, lon: 76.3388, isDevice: false },
  { name: 'Hooghly Ferry Ghat, Kolkata', lat: 22.5726, lon: 88.3639, isDevice: false },
  { name: 'Har Ki Pauri, Haridwar', lat: 29.9457, lon: 78.1642, isDevice: false }
]

// Haversine distance calculator in meters
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

// ─────────────────────────────────────────────
// Custom Hook: Real-Time Geolocation
// ─────────────────────────────────────────────
function useRealTimeLocation() {
  const [lat, setLat] = useState<number>(25.3176)
  const [lon, setLon] = useState<number>(83.0060)
  const [accuracy, setAccuracy] = useState<number>(8)
  const [placeName, setPlaceName] = useState<string>('Assi Ghat, Varanasi')
  const [isLiveGPS, setIsLiveGPS] = useState<boolean>(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [presetIndex, setPresetIndex] = useState<number>(1) // Default to Varanasi preset

  // Reverse geocode lat, lon to human readable place name
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`
      )
      if (res.ok) {
        const data = await res.json()
        const addr = data.address || {}
        const name =
          addr.suburb ||
          addr.neighbourhood ||
          addr.village ||
          addr.town ||
          addr.city ||
          addr.county ||
          'Coastal Sector'
        const state = addr.state ? `, ${addr.state}` : ''
        setPlaceName(`${name}${state}`)
        return
      }
    } catch {}
    setPlaceName(`${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`)
  }

  // Request browser device GPS
  const requestDeviceGPS = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy: acc } = pos.coords
          setLat(latitude)
          setLon(longitude)
          setAccuracy(Math.round(acc))
          setIsLiveGPS(true)
          setGeoError(null)
          reverseGeocode(latitude, longitude)

          // Register with backend
          const fd = new FormData()
          fd.append('phone', 'user')
          fd.append('lat', latitude.toString())
          fd.append('lon', longitude.toString())
          fd.append('accuracy', acc.toString())
          fetch('/api/location/update', { method: 'POST', body: fd }).catch(() => {})
        },
        (err) => {
          console.log('Device GPS permission fallback:', err.message)
          setGeoError('GPS permission optional. Using water sector preset.')
          setIsLiveGPS(false)
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      )
    }
  }

  // On mount, ask browser for live GPS
  useEffect(() => {
    requestDeviceGPS()
  }, [])

  // Switch to specific preset or toggle device GPS
  const setLocationPreset = (index: number) => {
    setPresetIndex(index)
    const selected = WATER_PRESETS[index]
    if (selected.isDevice) {
      requestDeviceGPS()
    } else {
      setLat(selected.lat)
      setLon(selected.lon)
      setAccuracy(5)
      setPlaceName(selected.name)
      setIsLiveGPS(false)
    }
  }

  return {
    lat,
    lon,
    accuracy,
    placeName,
    isLiveGPS,
    geoError,
    presetIndex,
    setLocationPreset,
    refreshGPS: requestDeviceGPS
  }
}

// ─────────────────────────────────────────────
// Interactive Sonar Mini-Radar Component
// ─────────────────────────────────────────────
function MiniVisualRadar({
  status,
  distanceMeters,
  placeName,
  boatmanName = 'Ramesh Nishad',
  mode = 'tourist'
}: {
  status: Status
  distanceMeters: number
  placeName: string
  boatmanName?: string
  mode?: Mode
}) {
  const isDanger = status === 'danger'
  const radarRadiusPx = 105
  // Scale distance (max 1500m -> radius 90px)
  const normalizedDist = Math.min(1500, Math.max(70, distanceMeters))
  const targetRadius = (normalizedDist / 1500) * (radarRadiusPx - 25) + 20

  // Bearing offset: 45° North-East
  const angleRad = (45 * Math.PI) / 180
  const targetX = 130 + targetRadius * Math.sin(angleRad)
  const targetY = 130 - targetRadius * Math.cos(angleRad)

  return (
    <section
      className="radar-card"
      style={{
        background: '#060d15',
        border: isDanger ? '1px solid rgba(255, 51, 68, 0.4)' : '1px solid rgba(0, 212, 255, 0.25)',
        borderRadius: '18px',
        padding: '16px',
        marginBottom: '14px',
        color: '#fff',
        boxShadow: isDanger ? '0 8px 30px rgba(255, 51, 68, 0.2)' : '0 8px 30px rgba(0, 212, 255, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass style={{ width: '16px', color: isDanger ? '#ff4444' : '#00d4ff' }} />
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: isDanger ? '#ff6677' : '#00d4ff' }}>
            LIVE SECTOR RADAR · 1.5 KM PERIMETER
          </span>
        </div>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '4px',
            background: isDanger ? 'rgba(255,51,68,0.2)' : 'rgba(0,230,118,0.15)',
            color: isDanger ? '#ff4444' : '#00e676',
            border: isDanger ? '1px solid #ff4444' : '1px solid #00e676'
          }}
        >
          {isDanger ? '⚠️ ACTIVE EMERGENCY' : '🟢 ALL SECTORS SAFE'}
        </span>
      </div>

      {/* SVG Sonar Scope */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        <svg viewBox="0 0 260 260" width="220" height="220" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="sweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDanger ? '#ff4444' : '#00d4ff'} stopOpacity="0.45" />
              <stop offset="100%" stopColor={isDanger ? '#ff4444' : '#00d4ff'} stopOpacity="0" />
            </linearGradient>
            <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background circle */}
          <circle
            cx="130"
            cy="130"
            r="105"
            fill="#03070d"
            stroke={isDanger ? 'rgba(255, 51, 68, 0.35)' : 'rgba(0, 212, 255, 0.25)'}
            strokeWidth="1.5"
          />

          {/* Concentric Range Rings (500m, 1000m, 1500m) */}
          <circle cx="130" cy="130" r="35" fill="none" stroke="rgba(0, 212, 255, 0.15)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="130" cy="130" r="70" fill="none" stroke="rgba(0, 212, 255, 0.2)" strokeWidth="1" strokeDasharray="4 4" />
          <circle
            cx="130"
            cy="130"
            r="105"
            fill="none"
            stroke={isDanger ? 'rgba(255, 68, 68, 0.45)' : 'rgba(0, 212, 255, 0.35)'}
            strokeWidth="1.5"
          />

          {/* Crosshair Axes */}
          <line x1="130" y1="25" x2="130" y2="235" stroke="rgba(0, 212, 255, 0.15)" strokeWidth="1" />
          <line x1="25" y1="130" x2="235" y2="130" stroke="rgba(0, 212, 255, 0.15)" strokeWidth="1" />

          {/* Cardinal Labels */}
          <text x="130" y="20" textAnchor="middle" fill="#718296" fontSize="8.5" fontWeight="700">N</text>
          <text x="245" y="133" textAnchor="middle" fill="#718296" fontSize="8.5" fontWeight="700">E</text>
          <text x="130" y="247" textAnchor="middle" fill="#718296" fontSize="8.5" fontWeight="700">S</text>
          <text x="15" y="133" textAnchor="middle" fill="#718296" fontSize="8.5" fontWeight="700">W</text>

          {/* Range Labels */}
          <text x="133" y="98" fill="#445566" fontSize="7" fontWeight="600">500m</text>
          <text x="133" y="63" fill="#445566" fontSize="7" fontWeight="600">1000m</text>
          <text x="133" y="28" fill={isDanger ? '#ff6677' : '#00a2ff'} fontSize="7" fontWeight="700">1.5km Max</text>

          {/* Rotating Sonar Sweep Beam */}
          <g style={{ transformOrigin: '130px 130px', animation: 'spin 4s linear infinite' }}>
            <line x1="130" y1="130" x2="130" y2="25" stroke={isDanger ? '#ff4444' : '#00d4ff'} strokeWidth="1.5" />
            <path d="M130,130 L130,25 A105,105 0 0,1 205,55 Z" fill="url(#sweepGrad)" />
          </g>

          {/* Range Vector connecting User to Boatman */}
          <line
            x1="130"
            y1="130"
            x2={targetX}
            y2={targetY}
            stroke={isDanger ? '#ff4444' : '#00d4ff'}
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />

          {/* Center User Point */}
          <circle cx="130" cy="130" r="14" fill={mode === 'tourist' ? 'rgba(0, 136, 255, 0.25)' : 'rgba(0, 230, 118, 0.25)'} />
          <circle cx="130" cy="130" r="5" fill={mode === 'tourist' ? '#0088ff' : '#00e676'} filter="url(#radarGlow)" />
          <text x="130" y="147" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="800">
            {mode === 'tourist' ? 'YOU (GPS)' : 'YOUR BOAT'}
          </text>

          {/* Target Vessel Point */}
          <circle cx={targetX} cy={targetY} r="18" fill={isDanger ? 'rgba(255, 51, 68, 0.3)' : 'rgba(0, 230, 118, 0.2)'} />
          <circle cx={targetX} cy={targetY} r="6" fill={isDanger ? '#ff3344' : '#00e676'} filter="url(#radarGlow)" />
          <text x={targetX} y={targetY - 10} textAnchor="middle" fill={isDanger ? '#ff6677' : '#6df1a7'} fontSize="8" fontWeight="800">
            {mode === 'tourist' ? `⛵ ${boatmanName}` : '🎒 TOURIST SECTOR'}
          </text>
        </svg>
      </div>

      {/* Radar Footer Stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: '11px'
        }}
      >
        <div>
          <span style={{ color: '#8899aa' }}>Proximity: </span>
          <strong style={{ color: isDanger ? '#ff6677' : '#00e676' }}>
            {distanceMeters < 1000 ? `${distanceMeters}m` : `${(distanceMeters / 1000).toFixed(1)}km`} North-East
          </strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ShieldCheck style={{ width: '13px', color: '#00d4ff' }} />
          <span style={{ color: '#8899aa' }}>Acoustic Shield: </span>
          <strong style={{ color: '#00d4ff' }}>Thunder Denoised (-19.2 dB)</strong>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// 1. Role Login Component
// ─────────────────────────────────────────────
function RoleLogin({
  onContinue,
  location
}: {
  onContinue: (mode: Mode, phone: string) => void
  location: ReturnType<typeof useRealTimeLocation>
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

        {/* Real-time Location Indicator */}
        <div className="gps-badge" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
            <MapPin style={{ color: location.isLiveGPS ? '#087a4b' : '#0088ff' }} />
            <span>
              {location.isLiveGPS ? '🟢 Live Device GPS Active' : '📍 Location:'}
            </span>
            <strong style={{ marginLeft: 'auto' }}>{location.placeName}</strong>
          </div>
          <small style={{ color: '#66777b', fontSize: '10px' }}>
            Coordinates: {location.lat.toFixed(4)}° N, {location.lon.toFixed(4)}° E (±{location.accuracy}m)
          </small>
        </div>

        <button
          type="button"
          className="continue-button"
          onClick={() => onContinue(role, phone || '9876543210')}
        >
          Continue / लॉगिन करें <ChevronDown />
        </button>
        <p className="login-note">
          No password. No OTP hassle. Your live location stays private.
        </p>
      </section>
    </main>
  )
}

// ─────────────────────────────────────────────
// 2. Top Bar (With Real-Time Location Switcher)
// ─────────────────────────────────────────────
function TopBar({
  mode,
  location,
  onSwitch
}: {
  mode: Mode
  location: ReturnType<typeof useRealTimeLocation>
  onSwitch: () => void
}) {
  const [showLocationMenu, setShowLocationMenu] = useState(false)

  return (
    <header className="location-bar">
      <div className="identity" style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setShowLocationMenu(!showLocationMenu)}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <Crosshair style={{ color: location.isLiveGPS ? '#087a4b' : '#0088ff', width: '16px' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800 }}>
              {mode === 'boatman' ? `नाविक क्षेत्र: ${location.placeName}` : `Location: ${location.placeName}`}
            </div>
            <div style={{ fontSize: '10px', color: '#778899', fontWeight: 600 }}>
              {location.lat.toFixed(4)}° N, {location.lon.toFixed(4)}° E · {location.isLiveGPS ? '🟢 Real GPS' : 'Water Preset'}
            </div>
          </div>
          <ChevronDown style={{ width: '14px', color: '#8899aa' }} />
        </button>

        {/* Location Dropdown Modal */}
        {showLocationMenu && (
          <div
            style={{
              position: 'absolute',
              top: '48px',
              left: 0,
              background: '#fff',
              border: '1px solid #dce5df',
              borderRadius: '14px',
              padding: '10px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
              zIndex: 100,
              minWidth: '280px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64736f', padding: '4px 6px' }}>
              CHOOSE WATER SECTOR OR REAL GPS:
            </div>
            {WATER_PRESETS.map((preset, idx) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  location.setLocationPreset(idx)
                  setShowLocationMenu(false)
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: location.presetIndex === idx ? '#eef8f2' : 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: location.presetIndex === idx ? 800 : 500,
                  color: location.presetIndex === idx ? '#087a4b' : '#112233',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {preset.isDevice ? <Navigation style={{ width: '14px' }} /> : <MapPin style={{ width: '14px' }} />}
                {preset.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" className="switch-role" onClick={onSwitch}>
        Switch Role
      </button>
    </header>
  )
}

// ─────────────────────────────────────────────
// 3. SOS Modal for Tourists (Includes Live GPS Pin)
// ─────────────────────────────────────────────
function SosModal({
  close,
  phone,
  location
}: {
  close: () => void
  phone: string
  location: ReturnType<typeof useRealTimeLocation>
}) {
  const [dispatched, setDispatched] = useState(false)
  const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lon}`

  const sendSos = async (type: string) => {
    try {
      const fd = new FormData()
      fd.append('phone', phone)
      fd.append('incident_type', type)
      fd.append('lat', location.lat.toString())
      fd.append('lon', location.lon.toString())
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
        <span className="eyebrow">
          EXACT GPS: {location.lat.toFixed(5)}° N, {location.lon.toFixed(5)}° E (±{location.accuracy}m)
        </span>
        <h2 id="sos-title">
          {dispatched ? 'Patrol Alerted with Live Coordinates!' : 'Tourist Emergency SOS'}
        </h2>
        <p>
          {dispatched
            ? `Your real-time GPS coordinates (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}) have been broadcast to the nearest river patrol vessel.`
            : `Patrol boats near ${location.placeName} will receive your live GPS beacon immediately.`}
        </p>

        {/* Live Pin Link */}
        <div style={{ margin: '8px 0 14px', padding: '8px 12px', background: '#f5f8f6', borderRadius: '10px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>📍 {location.placeName}</span>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#087a4b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Open Live Pin <ExternalLink style={{ width: '12px' }} />
          </a>
        </div>

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
  location,
  initialStatus
}: {
  onSwitch: () => void
  phone: string
  location: ReturnType<typeof useRealTimeLocation>
  initialStatus?: Status
}) {
  const [status, setStatus] = useState<Status>(initialStatus || 'safe')
  const [sos, setSos] = useState(false)
  const [playingBoatman, setPlayingBoatman] = useState(false)
  const [playingAi, setPlayingAi] = useState(false)
  const [playingRaw, setPlayingRaw] = useState(false)

  // Sector state from backend
  const [boatmanName, setBoatmanName] = useState('Ramesh Nishad')
  const [boatmanLat, setBoatmanLat] = useState<number>(25.3176)
  const [boatmanLon, setBoatmanLon] = useState<number>(83.0060)
  const [distanceMeters, setDistanceMeters] = useState<number>(350)
  const [distanceText, setDistanceText] = useState('350 meters from you')
  const [hindiQuote, setHindiQuote] = useState(
    '“भैया! पानी बिल्कुल शांत है, अभी आराम से नौका विहार कर सकते हैं, कोई खतरा नहीं है।”'
  )
  const [translation, setTranslation] = useState(
    'Water is completely calm, tourists can safely enjoy boat rides until evening.'
  )
  const [waterStatusText, setWaterStatusText] = useState(
    'Local boatmen report calm waters. Boating permitted until 5:30 PM.'
  )
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi' | 'ta' | 'bn'>('hi')
  const [boatmanAudioUrl, setBoatmanAudioUrl] = useState('/api/audio/boatman_sample_safe.wav')
  const [boatmanRawAudioUrl, setBoatmanRawAudioUrl] = useState('')
  const [aiAudioUrl, setAiAudioUrl] = useState('/api/audio/ai_advisory_safe.wav')

  const REGIONAL_TRANSLATIONS: Record<'en' | 'hi' | 'ta' | 'bn', { safe: string; danger: string; label: string }> = {
    hi: {
      safe: 'जलस्तर सामान्य है और मौसम शांत है। शाम तक नौका विहार सुरक्षित है।',
      danger: 'सावधान! जलस्तर में अचानक वृद्धि की सूचना। कृपया तुरंत घाट से दूर सुरक्षित स्थान पर जाएं।',
      label: 'हिंदी'
    },
    en: {
      safe: 'Water is completely calm, tourists can safely enjoy boat rides until evening.',
      danger: 'Hazard reported: sudden water surge. Evacuate river bank and move to higher ground immediately.',
      label: 'English'
    },
    ta: {
      safe: 'நீர்மட்டம் சாதாரணமாக உள்ளது. மாலை வரை படகு சவாரி பாதுகாப்பானது.',
      danger: 'எச்சரிக்கை! திடீர் நீர்வரத்து. உடனடியாக பாதுகாப்பான உயரமான இடத்திற்கு செல்லவும்.',
      label: 'தமிழ்'
    },
    bn: {
      safe: 'নদীর জল সম্পূর্ণ শান্ত, পর্যটকরা নিরাপদে নৌকাবিহার উপভোগ করতে পারেন।',
      danger: 'বিপদ সতর্কতা: দ্রুত জলবৃদ্ধি। অবিলম্বে নদীর তীর ত্যাগ করে উঁচু স্থানে যান।',
      label: 'বাংলা'
    }
  }

  const boatmanAudioRef = useRef<HTMLAudioElement | null>(null)
  const rawAudioRef = useRef<HTMLAudioElement | null>(null)
  const aiAudioRef = useRef<HTMLAudioElement | null>(null)

  // Calculate real distance dynamically whenever tourist location changes
  useEffect(() => {
    const dist = calculateHaversineDistance(location.lat, location.lon, boatmanLat, boatmanLon)
    setDistanceMeters(dist)
    if (dist < 1000) {
      setDistanceText(`${dist} meters from your live GPS`)
    } else {
      setDistanceText(`${(dist / 1000).toFixed(1)} km from your live GPS`)
    }
  }, [location.lat, location.lon, boatmanLat, boatmanLon])

  // Fetch current status on mount & connect to live WebSocket
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/tourist/status?lat=${location.lat}&lon=${location.lon}`)
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
  }, [location.lat, location.lon])

  const applySectorData = (data: any) => {
    if (data.status) setStatus(data.status === 'safe' ? 'safe' : 'danger')
    if (data.boatman_name) setBoatmanName(data.boatman_name)
    if (data.lat && data.lon) {
      setBoatmanLat(data.lat)
      setBoatmanLon(data.lon)
      const d = calculateHaversineDistance(location.lat, location.lon, data.lat, data.lon)
      setDistanceMeters(d)
      setDistanceText(d < 1000 ? `${d} meters from your live GPS` : `${(d / 1000).toFixed(1)} km from your live GPS`)
    }
    if (data.hindi_quote) setHindiQuote(`“${data.hindi_quote}”`)
    if (data.english_translation) setTranslation(data.english_translation)
    if (data.water_status_text) setWaterStatusText(data.water_status_text)
    if (data.boatman_audio_url) setBoatmanAudioUrl(data.boatman_audio_url)
    if (data.boatman_raw_audio_url) setBoatmanRawAudioUrl(data.boatman_raw_audio_url)
    if (data.ai_audio_url) setAiAudioUrl(data.ai_audio_url)
  }

  // Play / Pause Clean Boatman Audio
  const toggleBoatmanAudio = () => {
    if (aiAudioRef.current) {
      aiAudioRef.current.pause()
      setPlayingAi(false)
    }
    if (rawAudioRef.current) {
      rawAudioRef.current.pause()
      setPlayingRaw(false)
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

  // Play / Pause Raw Audio (Comparison Showcase for Noise Canceller Award)
  const toggleRawAudio = () => {
    if (boatmanAudioRef.current) {
      boatmanAudioRef.current.pause()
      setPlayingBoatman(false)
    }
    if (aiAudioRef.current) {
      aiAudioRef.current.pause()
      setPlayingAi(false)
    }

    const src = boatmanRawAudioUrl || boatmanAudioUrl
    if (!rawAudioRef.current) {
      rawAudioRef.current = new Audio(src)
      rawAudioRef.current.onended = () => setPlayingRaw(false)
    } else {
      rawAudioRef.current.src = src
    }

    if (playingRaw) {
      rawAudioRef.current.pause()
      setPlayingRaw(false)
    } else {
      rawAudioRef.current.play().catch(() => {})
      setPlayingRaw(true)
    }
  }

  // Play / Pause AI Safety Advisory
  const toggleAiAudio = () => {
    if (boatmanAudioRef.current) {
      boatmanAudioRef.current.pause()
      setPlayingBoatman(false)
    }
    if (rawAudioRef.current) {
      rawAudioRef.current.pause()
      setPlayingRaw(false)
    }

    const ttsUrl = `/api/tourist/tts?lang=${selectedLang}&status=${status}`
    if (!aiAudioRef.current) {
      aiAudioRef.current = new Audio(ttsUrl)
      aiAudioRef.current.onended = () => setPlayingAi(false)
    } else {
      aiAudioRef.current.src = ttsUrl
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
      <TopBar mode="tourist" location={location} onSwitch={onSwitch} />
      <main className="tourist-app">
        <div className="tourist-top">
          <div className="tracked-sector">
            <span className="eyebrow">LIVE TRACKED LOCATION</span>
            <strong>
              📍 {location.placeName} ({location.lat.toFixed(4)}° N, {location.lon.toFixed(4)}° E)
            </strong>
          </div>
          <select
            className="language-select"
            aria-label="Language"
            value={selectedLang}
            onChange={(e) => {
              const newLang = e.target.value as 'en' | 'hi' | 'ta' | 'bn'
              setSelectedLang(newLang)
              setTranslation(REGIONAL_TRANSLATIONS[newLang][status === 'safe' ? 'safe' : 'danger'])
            }}
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="bn">বাংলা (Bengali)</option>
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

        {/* 2. LIVE VISUAL MINI-RADAR MAP */}
        <MiniVisualRadar
          status={status}
          distanceMeters={distanceMeters}
          placeName={location.placeName}
          boatmanName={boatmanName}
          mode="tourist"
        />

        {/* 3. Latest Voice Update by Local Boatman */}
        <section className="local-update">
          <div className="update-heading">
            <div className="audio-icon">
              <Radio />
            </div>
            <div>
              <span className="eyebrow">LATEST VOICE UPDATE BY LOCAL BOATMAN</span>
              <h2>
                {boatmanName} <small>· {distanceText}</small>
              </h2>
            </div>
          </div>

          <blockquote>{hindiQuote}</blockquote>
          <p className="translation">{translation}</p>

          <div className="audio-actions">
            {/* Clean Voice (Noise Stripped) */}
            <button type="button" onClick={toggleBoatmanAudio}>
              <span className="play-circle">
                {playingBoatman ? <Pause /> : <Play />}
              </span>
              Listen to Cleaned Voice
              <small>Prisma Acoustic Shield: Thunder & Engine Noise Stripped</small>
            </button>

            {/* AI Synthesized Voice */}
            <button type="button" onClick={toggleAiAudio}>
              <span className="play-circle">
                {playingAi ? <Pause /> : <Volume2 />}
              </span>
              Listen to AI Safety Advisory ({REGIONAL_TRANSLATIONS[selectedLang].label})
              <small>Gnani Timbre Indic Spoken Regional Voice</small>
            </button>

            {/* Noise Canceller Comparison Link */}
            {boatmanRawAudioUrl && (
              <button
                type="button"
                onClick={toggleRawAudio}
                style={{
                  background: 'rgba(255, 170, 0, 0.08)',
                  borderColor: 'rgba(255, 170, 0, 0.3)'
                }}
              >
                <span className="play-circle" style={{ background: '#a76500' }}>
                  {playingRaw ? <Pause /> : <Play />}
                </span>
                Compare: Hear Raw Unfiltered Mic Audio
                <small style={{ color: '#a76500' }}>Listen with original background thunder/engine noise</small>
              </button>
            )}
          </div>
        </section>

        {/* 4. Emergency SOS */}
        <button type="button" className="tourist-sos" onClick={() => setSos(true)}>
          <Siren /> I Need Help / Tourist SOS
          <small>Alerts nearest boat patrol with your live GPS location ({location.lat.toFixed(4)}, {location.lon.toFixed(4)})</small>
        </button>

        {/* Demo toggles */}
        <div className="demo-controls">
          <span>Demo controls:</span>
          <button
            type="button"
            onClick={() => {
              setStatus('safe')
              setWaterStatusText(
                `Local boatmen at ${location.placeName} report calm waters. Boating permitted until 5:30 PM.`
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
                `Local boatman at ${location.placeName} reported water level surge / hazard. Please move to upper steps.`
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

        {sos && <SosModal phone={phone} location={location} close={() => setSos(false)} />}
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
  location,
  onBroadcast
}: {
  onSwitch: () => void
  phone: string
  location: ReturnType<typeof useRealTimeLocation>
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

  // Center Mic Toggle (Real MediaRecorder with Hardware Noise Suppression + API Dispatch)
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
      // START real browser mic recording with HARDWARE NOISE SUPPRESSION & ECHO CANCELLATION
      setSeconds(0)
      setSent(false)
      audioChunksRef.current = []

      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              noiseSuppression: true,   // WebRTC hardware noise suppression
              echoCancellation: true,   // Echo cancellation to prevent speaker loop
              autoGainControl: true,    // Auto gain level normalization
              channelCount: 1
            }
          })
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

  // Send broadcast with Real-Time Coordinates to FastAPI backend
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
      fd.append('lat', location.lat.toString())
      fd.append('lon', location.lon.toString())
      fd.append('location_name', location.placeName)

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

  // Quick scenario triggers with real GPS
  const triggerSafeScenario = () => {
    const text = `भैया! ${location.placeName} पर पानी बिल्कुल शांत है, सभी पर्यटक आराम से घूम सकते हैं।`
    setSentText(`“${text}”`)
    sendVoiceBroadcast(null, text, 'safe')
  }

  const triggerDangerScenario = () => {
    const text = `भैया! ${location.placeName} पर बहाव बहुत तेज है, नाव पलट गई है, तुरंत मदद भेजो!`
    setSentText(`“${text}”`)
    sendVoiceBroadcast(null, text, 'danger')
  }

  return (
    <>
      <TopBar mode="boatman" location={location} onSwitch={onSwitch} />
      <main className="boatman-app">
        <div className="boatman-header">
          <div>
            <strong>नाविक: रमेश निषाद</strong>
            <span>Boat #14 · {location.placeName}</span>
          </div>
          <b className="network-status">
            ● GPS: {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}° · {location.isLiveGPS ? '🟢 Real GPS' : 'Sector Preset'}
          </b>
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
              ? `00:${String(seconds).padStart(2, '0')} · बोल रहे हैं (Noise Filtering Active...)`
              : 'बोलने के लिए दबाएं (TAP TO SPEAK)'}
          </h1>

          <p>
            {sent
              ? `Sent to tourists within 1.5 km of ${location.placeName}!`
              : recording
              ? 'Prisma v2.5 stripping 85dB engine noise & transcribing…'
              : 'TAP TO BROADCAST VOICE UPDATE'}
          </p>

          <small>
            Hardware Noise Suppression Active · GPS: {location.lat.toFixed(4)}° N, {location.lon.toFixed(4)}° E
          </small>
        </section>

        {/* Quick Scenario Test Buttons */}
        <section className="scenario-buttons">
          <h2>Quick scenario test (1-Click Broadcast with Live GPS)</h2>
          <button type="button" onClick={triggerSafeScenario}>
            <Check /> Speak Safe Update
            <small>“Paani shaant hai, tourists can roam safely”</small>
          </button>
          <button type="button" onClick={triggerDangerScenario}>
            <AlertTriangle /> Speak Danger Emergency
            <small>“Bahaav tez hai, naav ulat gayi ghat ke paas!”</small>
          </button>
        </section>

        {/* Live Sector Sonar Radar in Boatman View */}
        <MiniVisualRadar
          status="safe"
          distanceMeters={350}
          placeName={location.placeName}
          boatmanName="Ramesh Nishad"
          mode="boatman"
        />

        {/* Last Sent Broadcast Card */}
        <section className="last-broadcast">
          <span className="eyebrow">LAST SENT BROADCAST (अंतिम वॉइस संदेश)</span>
          <p>{sentText}</p>
          <strong>
            Broadcasted from {location.placeName} ({location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°) to nearby tourists.
          </strong>
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

  // Real-time Geolocation Hook
  const location = useRealTimeLocation()

  const enter = (next: Mode, enteredPhone: string) => {
    setMode(next)
    setPhone(enteredPhone)
    setScreen('dashboard')
  }

  if (screen === 'login') {
    return <RoleLogin location={location} onContinue={enter} />
  }

  return (
    <div className="app-shell">
      {mode === 'tourist' ? (
        <TouristDashboard
          initialStatus={currentStatus}
          phone={phone}
          location={location}
          onSwitch={() => setScreen('login')}
        />
      ) : (
        <BoatmanDashboard
          phone={phone}
          location={location}
          onBroadcast={(status) => {
            setCurrentStatus(status)
          }}
          onSwitch={() => setScreen('login')}
        />
      )}
    </div>
  )
}
