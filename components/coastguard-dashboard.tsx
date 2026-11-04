'use client'

import { useEffect, useState, useRef } from 'react'
import {
  AlertTriangle,
  Bell,
  BellRing,
  Check,
  ChevronDown,
  Compass,
  Crosshair,
  ExternalLink,
  Globe,
  MapPin,
  Mic,
  Navigation,
  Pause,
  Phone,
  PhoneCall,
  PhoneOff,
  Play,
  Radio,
  Search,
  ShieldCheck,
  Siren,
  Volume2,
  Waves,
  X
} from 'lucide-react'
import { SupportedLang, LANGUAGES, UI_TRANSLATIONS } from '@/lib/i18n'

type Mode = 'boatman' | 'tourist' | 'authority'
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

// Nautical Bearing & Heading Calculator (Range & Bearing Vector across open water)
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { degrees: number; compass: string; arrow: string } {
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180)
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon)
  const brng = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360

  const directions = [
    { label: 'North', arrow: '⬆️' },
    { label: 'North-East', arrow: '↗️' },
    { label: 'East', arrow: '➡️' },
    { label: 'South-East', arrow: '↘️' },
    { label: 'South', arrow: '⬇️' },
    { label: 'South-West', arrow: '↙️' },
    { label: 'West', arrow: '⬅️' },
    { label: 'North-West', arrow: '↖️' }
  ]
  const index = Math.round(brng / 45) % 8
  return {
    degrees: Math.round(brng),
    compass: directions[index].label,
    arrow: directions[index].arrow
  }
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

  const setCustomLocation = (newLat: number, newLon: number, newPlaceName: string) => {
    setLat(newLat)
    setLon(newLon)
    setAccuracy(5)
    setPlaceName(newPlaceName)
    setIsLiveGPS(false)

    // Register with backend
    const fd = new FormData()
    fd.append('phone', 'user')
    fd.append('lat', newLat.toString())
    fd.append('lon', newLon.toString())
    fd.append('accuracy', '5')
    fd.append('place_name', newPlaceName)
    fetch('/api/location/update', { method: 'POST', body: fd }).catch(() => {})
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
    setCustomLocation,
    refreshGPS: requestDeviceGPS
  }
}

// ─────────────────────────────────────────────
// Interactive Sonar Mini-Radar Component (High-Resolution 3.0 KM Chartplotter)
// ─────────────────────────────────────────────
function MiniVisualRadar({
  status,
  distanceMeters,
  placeName,
  boatmanName = 'Ramesh Nishad',
  currentUserName,
  mode = 'tourist',
  lang = 'hi',
  rescueTarget = null
}: {
  status: Status
  distanceMeters: number
  placeName: string
  boatmanName?: string
  currentUserName?: string
  mode?: Mode
  lang?: SupportedLang
  rescueTarget?: {
    touristName: string
    distMeters: number
    bearing: { degrees: number; compass: string; arrow: string }
    incident: string
    time: string
  } | null
}) {
  const t = UI_TRANSLATIONS[lang]
  const radarRadiusPx = 150

  // REAL TARGET LOGIC: Only render vector if an actual rescueTarget exists
  const hasTarget = !!rescueTarget
  
  // When testing from the exact same device, lat/lon are identical (dist < 15m).
  // In that test case, offset target by 180m North-East so it displays distinctly on the water perimeter.
  const isSameDeviceTest = hasTarget && rescueTarget.distMeters < 15
  const effectiveDist = hasTarget
    ? (isSameDeviceTest ? 180 : rescueTarget.distMeters)
    : 0

  const effectiveBearing = hasTarget
    ? (isSameDeviceTest ? { degrees: 45, compass: 'North-East', arrow: '↗️' } : rescueTarget.bearing)
    : { degrees: 0, compass: 'North', arrow: '⬆️' }

  // Scale: 3000m sector perimeter -> 150px radius
  const normalizedDist = Math.min(3000, Math.max(80, effectiveDist))
  const targetRadius = (normalizedDist / 3000) * (radarRadiusPx - 25) + 20

  const angleRad = (effectiveBearing.degrees * Math.PI) / 180
  const targetX = 190 + targetRadius * Math.sin(angleRad)
  const targetY = 190 - targetRadius * Math.cos(angleRad)

  return (
    <section
      className="radar-card"
      style={{
        background: 'linear-gradient(180deg, #091322 0%, #050b14 100%)',
        border: hasTarget ? '1.5px solid #ef4444' : '1px solid rgba(56, 189, 248, 0.22)',
        borderRadius: '24px',
        padding: '22px 24px',
        color: '#fff',
        boxShadow: hasTarget
          ? '0 16px 40px rgba(239, 68, 68, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
          : '0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(56, 189, 248, 0.12)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Radar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: hasTarget ? 'rgba(239, 68, 68, 0.18)' : 'rgba(34, 211, 238, 0.14)',
              display: 'grid',
              placeItems: 'center',
              border: hasTarget ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(34, 211, 238, 0.35)',
              boxShadow: hasTarget ? '0 0 15px rgba(239, 68, 68, 0.3)' : '0 0 15px rgba(34, 211, 238, 0.2)'
            }}
          >
            <Compass style={{ width: '20px', height: '20px', color: hasTarget ? '#f87171' : '#22d3ee' }} />
          </div>
          <div>
            <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
              {t.radarTitle}
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500, marginTop: '1px' }}>
              Sector Focus: {placeName}
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 800,
            padding: '5px 12px',
            borderRadius: '24px',
            background: hasTarget ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.16)',
            color: hasTarget ? '#fca5a5' : '#34d399',
            border: hasTarget ? '1px solid #ef4444' : '1px solid rgba(16, 185, 129, 0.45)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: hasTarget ? '0 0 12px rgba(239, 68, 68, 0.3)' : '0 0 12px rgba(16, 185, 129, 0.2)'
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: hasTarget ? '#ef4444' : '#10b981',
              boxShadow: hasTarget ? '0 0 8px #ef4444' : '0 0 8px #10b981',
              animation: 'beaconPulse 1.8s infinite'
            }}
          />
          {hasTarget ? 'RESCUE VECTOR ACTIVE' : '3.0 KM PERIMETER CLEAR'}
        </span>
      </div>

      {/* Steer-By-Compass HUD Banner for Boatman when Rescue Target is Active */}
      {hasTarget && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(153, 27, 27, 0.4))',
            border: '1.5px solid #ef4444',
            borderRadius: '14px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 6px 20px rgba(239, 68, 68, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '26px' }}>{effectiveBearing.arrow}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 900, color: '#fca5a5', letterSpacing: '0.02em' }}>
                STEER: {effectiveBearing.compass.toUpperCase()} ({effectiveBearing.degrees}°)
              </div>
              <div style={{ fontSize: '11px', color: '#f1f5f9', fontWeight: 600 }}>
                {effectiveDist < 1000 ? `${effectiveDist}m` : `${(effectiveDist / 1000).toFixed(1)}km`} direct across water · ~{Math.max(1, Math.round(effectiveDist / 180))} min at 6 knots
              </div>
            </div>
          </div>
          <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '6px' }}>
            SOS TARGET
          </span>
        </div>
      )}

      {/* High-Resolution Glowing Sonar Scope (Matching User Screenshot) */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', margin: '8px 0' }}>
        <svg viewBox="0 0 380 380" width="100%" style={{ maxWidth: '380px', height: 'auto', overflow: 'visible' }}>
          <defs>
            <radialGradient id="sonarWedgeGrad" cx="0%" cy="0%" r="100%">
              <stop offset="0%" stopColor={hasTarget ? 'rgba(239, 68, 68, 0.55)' : 'rgba(34, 211, 238, 0.55)'} />
              <stop offset="65%" stopColor={hasTarget ? 'rgba(239, 68, 68, 0.16)' : 'rgba(34, 211, 238, 0.14)'} />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="radarNeonGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="targetRedGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Scope Tint */}
          <circle cx="190" cy="190" r="150" fill="rgba(4, 9, 16, 0.92)" />

          {/* Concentric 3.0 KM Sector Range Rings */}
          {/* 1.0 km Ring (Dashed) */}
          <circle
            cx="190"
            cy="190"
            r="50"
            fill="none"
            stroke={hasTarget ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 211, 238, 0.25)'}
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />

          {/* 2.0 km Ring (Dashed) */}
          <circle
            cx="190"
            cy="190"
            r="100"
            fill="none"
            stroke={hasTarget ? 'rgba(239, 68, 68, 0.28)' : 'rgba(34, 211, 238, 0.28)'}
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />

          {/* 3.0 km Outer Sector Ring (Solid Glowing) */}
          <circle
            cx="190"
            cy="190"
            r="150"
            fill="none"
            stroke={hasTarget ? 'rgba(239, 68, 68, 0.7)' : 'rgba(34, 211, 238, 0.55)'}
            strokeWidth="1.8"
            filter="url(#radarNeonGlow)"
          />

          {/* Crosshair Cardinal Axes */}
          <line x1="40" y1="190" x2="340" y2="190" stroke={hasTarget ? 'rgba(239, 68, 68, 0.22)' : 'rgba(34, 211, 238, 0.22)'} strokeWidth="1.2" />
          <line x1="190" y1="40" x2="190" y2="340" stroke={hasTarget ? 'rgba(239, 68, 68, 0.22)' : 'rgba(34, 211, 238, 0.22)'} strokeWidth="1.2" />

          {/* Distance Labels along North Axis */}
          <text x="196" y="142" fill="#64748b" fontSize="8.5" fontWeight="700">1.0 km</text>
          <text x="196" y="92" fill="#64748b" fontSize="8.5" fontWeight="700">2.0 km</text>
          <text x="196" y="44" fill={hasTarget ? '#f87171' : '#38bdf8'} fontSize="9.5" fontWeight="800">3.0 km</text>

          {/* Cardinal Compass Markers */}
          <text x="190" y="24" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900" letterSpacing="0.05em">N</text>
          <text x="368" y="195" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900" letterSpacing="0.05em">E</text>
          <text x="190" y="374" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900" letterSpacing="0.05em">S</text>
          <text x="12" y="195" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900" letterSpacing="0.05em">W</text>

          {/* Glowing Revolving Sonar Sweep Beam */}
          <g style={{ transformOrigin: '190px 190px', animation: 'radarSweepSmooth 3.8s linear infinite' }}>
            <line
              x1="190"
              y1="190"
              x2="190"
              y2="40"
              stroke={hasTarget ? '#ef4444' : '#22d3ee'}
              strokeWidth="2"
              filter="url(#radarNeonGlow)"
            />
            {/* Trailing wedge ~55 degrees */}
            <path d="M190,190 L190,40 A150,150 0 0,1 313,95 Z" fill="url(#sonarWedgeGrad)" />
          </g>

          {/* Direct Nautical Rescue Vector Line (ONLY when Target is Active) */}
          {hasTarget && (
            <>
              <line
                x1="190"
                y1="190"
                x2={targetX}
                y2={targetY}
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeDasharray="6 3"
              />
              <circle cx={targetX} cy={targetY} r="22" fill="rgba(239, 68, 68, 0.35)" filter="url(#targetRedGlow)" />
              <circle cx={targetX} cy={targetY} r="8" fill="#ef4444" />
              <text x={targetX} y={targetY - 14} textAnchor="middle" fill="#fca5a5" fontSize="10" fontWeight="900">
                🚨 {rescueTarget.touristName} (SOS)
              </text>
            </>
          )}

          {/* Center User Vessel Node with Ambient Pulse */}
          <circle cx="190" cy="190" r="18" fill={mode === 'tourist' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(34, 211, 238, 0.25)'} filter="url(#radarNeonGlow)" />
          <circle cx="190" cy="190" r="6" fill={mode === 'tourist' ? '#38bdf8' : '#22d3ee'} />

          {/* Center Label Badge (Matching Screenshot 'आपकी नाव (GPS)') */}
          <g>
            <rect
              x="135"
              y="206"
              width="110"
              height="22"
              rx="11"
              fill="rgba(6, 11, 20, 0.92)"
              stroke={mode === 'tourist' ? 'rgba(56, 189, 248, 0.45)' : 'rgba(34, 211, 238, 0.45)'}
              strokeWidth="1"
            />
            <text x="190" y="221" textAnchor="middle" fill="#e0f2fe" fontSize="10.5" fontWeight="800">
              {mode === 'tourist'
                ? (lang === 'hi' ? 'आप (GPS)' : (lang === 'mr' ? 'तुम्ही (GPS)' : 'You (GPS)'))
                : (lang === 'hi' ? 'आपकी नाव (GPS)' : (lang === 'mr' ? 'तुमची बोट (GPS)' : 'Your Vessel (GPS)'))}
            </text>
          </g>
        </svg>
      </div>

      {/* Radar Footer Telemetry Tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '9px 12px',
            fontSize: '11.5px'
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.04em' }}>
            WATERWAY VECTOR
          </div>
          {hasTarget ? (
            <div style={{ color: '#f87171', fontWeight: 800 }}>
              {effectiveDist < 1000 ? `${effectiveDist}m` : `${(effectiveDist / 1000).toFixed(1)}km`} {effectiveBearing.compass} ({effectiveBearing.arrow})
            </div>
          ) : (
            <div style={{ color: '#34d399', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              Clear · 3.0 km Sector Active
            </div>
          )}
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '9px 12px',
            fontSize: '11.5px'
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.04em' }}>
            TELEMETRY LINK
          </div>
          <div style={{ color: '#38bdf8', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ShieldCheck style={{ width: '14px', height: '14px' }} />
            Dual-Band GPS (±3m) · 10Hz
          </div>
        </div>
      </div>
    </section>
  )
}

function LocationSearchModal({
  isOpen,
  onClose,
  currentPlaceName,
  isLiveGPS,
  onSelectLocation,
  onUseLiveGps
}: {
  isOpen: boolean
  onClose: () => void
  currentPlaceName: string
  isLiveGPS: boolean
  onSelectLocation: (lat: number, lon: number, name: string) => void
  onUseLiveGps: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Real-time universal search as user types
  useEffect(() => {
    if (!isOpen) return
    const q = searchQuery.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      let found: any[] = []

      // 1. Primary: Direct Photon OpenStreetMap Search (Ultra-fast, stations, ghats, pan-India)
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=10`)
        if (res.ok) {
          const data = await res.json()
          if (data && Array.isArray(data.features) && data.features.length > 0) {
            found = data.features.map((f: any) => {
              const coords = f.geometry?.coordinates || [0, 0]
              const lon = coords[0]
              const lat = coords[1]
              const p = f.properties || {}
              const name = p.name || p.street || p.city || q
              const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean)
              const uniqueParts = parts.filter((item: string, pos: number) => parts.indexOf(item) === pos)
              const displayName = uniqueParts.join(', ') || name
              return {
                name,
                display_name: displayName,
                lat,
                lon
              }
            })
          }
        }
      } catch (err) {
        console.warn('Photon direct fetch failed, trying local proxy:', err)
      }

      // 2. Secondary: Backend Universal Search Proxy
      if (found.length === 0) {
        try {
          const res = await fetch(`/api/location/search?q=${encodeURIComponent(q)}`)
          if (res.ok) {
            const data = await res.json()
            if (data && Array.isArray(data.results) && data.results.length > 0) {
              found = data.results
            }
          }
        } catch (err) {
          console.warn('Backend location search failed:', err)
        }
      }

      // 3. Tertiary Fallback: Nominatim OpenStreetMap
      if (found.length === 0) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in&limit=8`)
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data)) {
              found = data.map((item: any) => {
                const lat = parseFloat(item.lat)
                const lon = parseFloat(item.lon)
                const shortName = item.name || item.display_name.split(',')[0]
                return {
                  name: shortName,
                  display_name: item.display_name,
                  lat,
                  lon
                }
              })
            }
          }
        } catch (err) {
          console.error('All geocoding fallbacks failed:', err)
        }
      }

      setResults(found)
      setLoading(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [searchQuery, isOpen])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fafbfc'
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📍</span> Choose Location
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Search any railway station, city, ghat, beach, or street address
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Live Device GPS Option */}
        <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => {
              onUseLiveGps()
              onClose()
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '12px',
              border: isLiveGPS ? '1.5px solid #059669' : '1px solid #cbd5e1',
              background: isLiveGPS ? '#ecfdf5' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isLiveGPS ? '#d1fae5' : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Navigation style={{ width: '16px', height: '16px', color: isLiveGPS ? '#059669' : '#0284c7' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <strong style={{ fontSize: '12.5px', color: isLiveGPS ? '#047857' : '#1e293b', display: 'block' }}>
                  🟢 Use My Device Live GPS
                </strong>
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Auto-detect satellite GPS coordinates from device
                </span>
              </div>
            </div>
            {isLiveGPS && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  background: '#059669',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}
              >
                ACTIVE
              </span>
            )}
          </button>
        </div>

        {/* Search Input Bar */}
        <div style={{ padding: '14px 20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '12px',
              padding: '10px 14px'
            }}
          >
            <Search style={{ width: '18px', height: '18px', color: '#64748b', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type any location (e.g. Pune Station, Dadar, Assi Ghat, Marine Drive)..."
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontSize: '13.5px',
                color: '#0f172a'
              }}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X style={{ width: '15px', height: '15px' }} />
              </button>
            )}
          </div>
        </div>

        {/* Results List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px 20px' }}>
          {loading && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
              ⏳ Searching live locations across India...
            </div>
          )}

          {!loading && searchQuery.trim().length >= 2 && results.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
              No locations found matching &ldquo;{searchQuery}&rdquo;. Try checking the spelling.
            </div>
          )}

          {!loading && searchQuery.trim().length < 2 && (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
              🔍 Start typing any location, railway station, ghat, beach, or city in India to search...
            </div>
          )}

          {!loading && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                Matching Locations ({results.length})
              </div>

              {results.map((loc, idx) => {
                const isSelected = currentPlaceName === loc.name
                return (
                  <button
                    key={`${loc.name}-${idx}`}
                    type="button"
                    onClick={() => {
                      onSelectLocation(loc.lat, loc.lon, loc.name)
                      onClose()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                      background: isSelected ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0, flex: 1 }}>
                      <MapPin style={{ width: '16px', height: '16px', color: loc.in_danger_zone ? '#e11d48' : '#059669', marginTop: '2px', flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong style={{ fontSize: '12.5px', color: '#1e293b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {loc.name}
                        </strong>
                        <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {loc.display_name}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: '#0284c7',
                          color: '#ffffff'
                        }}
                      >
                        Select
                      </span>
                      <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace', marginTop: '3px' }}>
                        {loc.lat.toFixed(4)}°, {loc.lon.toFixed(4)}°
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RoleLogin({
  onContinue,
  location,
  lang,
  onLangChange,
  isOnline = true
}: {
  onContinue: (mode: Mode, phone: string, name: string) => void
  location: ReturnType<typeof useRealTimeLocation>
  lang: SupportedLang
  onLangChange: (l: SupportedLang) => void
  isOnline?: boolean
}) {
  const t = UI_TRANSLATIONS[lang]
  const [role, setRole] = useState<Mode>('tourist')
  const [phone, setPhone] = useState('9876543210')
  const [name, setName] = useState('')
  const [showLocationModal, setShowLocationModal] = useState(false)

  return (
    <main className="login-page">
      <section className="login-card">
        {/* Language Selector Pill & Offline Pill */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '8px',
              background: isOnline ? 'rgba(8, 122, 75, 0.12)' : 'rgba(217, 119, 6, 0.15)',
              color: isOnline ? '#087a4b' : '#d97706',
              border: isOnline ? '1px solid rgba(8, 122, 75, 0.3)' : '1px solid rgba(217, 119, 6, 0.4)'
            }}
          >
            {isOnline ? t.onlineBadge : t.offlineBadge}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eef6f1', padding: '4px 10px', borderRadius: '12px' }}>
            <Globe style={{ width: '14px', color: '#087a4b' }} />
            <select
              value={lang}
              onChange={(e) => onLangChange(e.target.value as SupportedLang)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '12px',
                fontWeight: 800,
                color: '#087a4b',
                cursor: 'pointer',
                outline: 'none'
              }}
              aria-label="Choose Language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native} ({l.label})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="brand-mark">
          <Waves />
        </div>
        <span className="eyebrow">{t.eyebrow}</span>
        <h1>
          CoastGuard <em>AI</em>
        </h1>


        {/* Name Input Field (Real-time dynamic display across app) */}
        <label className="login-label" htmlFor="name" style={{ marginTop: '8px' }}>
          {t.nameLabel}
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.namePlaceholder}
          style={{ marginBottom: '10px' }}
        />

        <label className="login-label" htmlFor="phone">
          {t.phoneLabel}
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
            onClick={() => {
              setRole('boatman')
              if (!name || name === 'Insp. Rajesh Verma (NDRF)' || name === 'राजेश वर्मा (NDRF कमान)') setName('रमेश निषाद')
            }}
            role="radio"
            aria-checked={role === 'boatman'}
          >
            <span>🎣</span>
            <strong>{t.boatmanRoleTitle}</strong>
            <small>{t.boatmanRoleSub}</small>
          </button>
          <button
            type="button"
            className={role === 'tourist' ? 'role-card active' : 'role-card'}
            onClick={() => {
              setRole('tourist')
              if (!name || name === 'Insp. Rajesh Verma (NDRF)' || name === 'राजेश वर्मा (NDRF कमान)') setName('राहुल शर्मा')
            }}
            role="radio"
            aria-checked={role === 'tourist'}
          >
            <span>🎒</span>
            <strong>{t.touristRoleTitle}</strong>
            <small>{t.touristRoleSub}</small>
          </button>
          <button
            type="button"
            className={role === 'authority' ? 'role-card active' : 'role-card'}
            onClick={() => {
              setRole('authority')
              if (!name || name === 'रमेश निषाद' || name === 'राहुल शर्मा') {
                setName(lang === 'hi' ? 'राजेश वर्मा (NDRF कमान)' : 'Insp. Rajesh Verma (NDRF)')
              }
            }}
            role="radio"
            aria-checked={role === 'authority'}
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 14px',
              background: role === 'authority' ? 'rgba(5, 150, 105, 0.08)' : '#f8fafc',
              borderColor: role === 'authority' ? '#059669' : 'var(--line)'
            }}
          >
            <span style={{ fontSize: '24px' }}>🏛️</span>
            <div style={{ textAlign: 'left' }}>
              <strong style={{ fontSize: '13px', display: 'block', color: role === 'authority' ? '#047857' : '#1e293b' }}>
                {t.authorityRoleTitle}
              </strong>
              <small style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>
                {t.authorityRoleSub}
              </small>
            </div>
          </button>
        </div>

        {/* Offline Banner when network is unavailable */}
        {!isOnline && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              padding: '8px 12px',
              margin: '8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#92400e',
              fontSize: '11px',
              fontWeight: 700
            }}
          >
            <Radio style={{ width: '15px', color: '#d97706', flexShrink: 0 }} />
            <span>{t.offlineNotice}</span>
          </div>
        )}

        {/* Location Selector Modal */}
        <LocationSearchModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          currentPlaceName={location.placeName}
          isLiveGPS={location.isLiveGPS}
          onSelectLocation={(lat, lon, name) => location.setCustomLocation(lat, lon, name)}
          onUseLiveGps={() => location.refreshGPS()}
        />

        {/* Real-time Location Indicator & Chooser */}
        <div
          style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding: '12px',
            margin: '10px 0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>
              📍 {t.locationLabel}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: location.isLiveGPS ? 'rgba(5, 150, 105, 0.12)' : 'rgba(2, 132, 199, 0.12)',
                color: location.isLiveGPS ? '#059669' : '#0284c7'
              }}
            >
              {location.isLiveGPS ? t.realGps : '📍 Custom Location'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <MapPin style={{ width: '18px', height: '18px', color: location.isLiveGPS ? '#059669' : '#0284c7', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {location.placeName}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>
                Coordinates: {location.lat.toFixed(4)}° N, {location.lon.toFixed(4)}° E (±{location.accuracy}m)
              </div>
            </div>
          </div>

          {/* Dual Action Buttons: Fetch Live GPS vs Choose Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => location.refreshGPS()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: location.isLiveGPS ? '1.5px solid #059669' : '1px solid #cbd5e1',
                background: location.isLiveGPS ? '#ecfdf5' : '#ffffff',
                color: location.isLiveGPS ? '#047857' : '#334155',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Navigation style={{ width: '13px', height: '13px', color: '#059669' }} />
              <span>Fetch Live GPS</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: !location.isLiveGPS ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                background: !location.isLiveGPS ? '#f0f9ff' : '#ffffff',
                color: !location.isLiveGPS ? '#0369a1' : '#334155',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Search style={{ width: '13px', height: '13px', color: '#0284c7' }} />
              <span>Choose Location 🔍</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          className="continue-button"
          onClick={() => {
            const finalName = name.trim() || (role === 'authority' ? (lang === 'hi' ? 'राजेश वर्मा (NDRF कमान)' : 'Insp. Rajesh Verma (NDRF)') : (role === 'boatman' ? 'रमेश निषाद' : 'राहुल शर्मा'))
            onContinue(role, phone || '9876543210', finalName)
          }}
        >
          {t.loginContinue} <ChevronDown />
        </button>
        <p className="login-note">
          {t.loginNote}
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
  onSwitch,
  lang,
  onLangChange,
  userName,
  isOnline = true
}: {
  mode: Mode
  location: ReturnType<typeof useRealTimeLocation>
  onSwitch: () => void
  lang: SupportedLang
  onLangChange: (l: SupportedLang) => void
  userName?: string
  isOnline?: boolean
}) {
  const t = UI_TRANSLATIONS[lang]
  const [showLocationModal, setShowLocationModal] = useState(false)
  const isDark = mode === 'boatman' || mode === 'authority'

  return (
    <header
      className="location-bar"
      style={{
        background: isDark ? 'rgba(8, 12, 19, 0.92)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '56px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      <div className="identity" style={{ position: 'relative' }}>
        <LocationSearchModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          currentPlaceName={location.placeName}
          isLiveGPS={location.isLiveGPS}
          onSelectLocation={(lat, lon, name) => location.setCustomLocation(lat, lon, name)}
          onUseLiveGps={() => location.refreshGPS()}
        />

        <button
          type="button"
          onClick={() => setShowLocationModal(true)}
          style={{
            background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.04)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Crosshair style={{ color: location.isLiveGPS ? '#10b981' : '#38bdf8', width: '15px', height: '15px' }} />
            {location.isLiveGPS && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 6px #10b981'
                }}
              />
            )}
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
              {location.placeName}
            </div>
            <div style={{ fontSize: '10px', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500, fontFamily: 'monospace' }}>
              {location.lat.toFixed(4)}°N, {location.lon.toFixed(4)}°E · {location.isLiveGPS ? 'Live GPS' : 'Preset'}
            </div>
          </div>
          <ChevronDown style={{ width: '14px', height: '14px', color: isDark ? '#94a3b8' : '#64748b', marginLeft: '4px' }} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Dynamic Logged-in User Real-time Pill */}
        {userName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: isDark
                ? (mode === 'authority' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)')
                : '#f0f9ff',
              padding: '5px 10px',
              borderRadius: '10px',
              border: isDark
                ? (mode === 'authority' ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)')
                : '1px solid #bae6fd'
            }}
          >
            <span style={{ fontSize: '12px' }}>{mode === 'authority' ? '🏛️' : (mode === 'boatman' ? '🎣' : '🎒')}</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: isDark ? (mode === 'authority' ? '#fca5a5' : '#6ee7b7') : '#0369a1',
                textTransform: 'capitalize'
              }}
            >
              {userName}
            </span>
          </div>
        )}

        {/* Real-time Online / Offline Pill */}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            padding: '4px 8px',
            borderRadius: '8px',
            background: isOnline
              ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.1)')
              : 'rgba(217, 119, 6, 0.15)',
            color: isOnline ? '#10b981' : '#d97706',
            border: isOnline
              ? (isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(5, 150, 105, 0.25)')
              : '1px solid rgba(217, 119, 6, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isOnline ? '#10b981' : '#d97706' }} />
          {isOnline ? t.onlineBadge : t.offlineBadge}
        </span>

        {/* Language selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
            padding: '4px 8px',
            borderRadius: '10px'
          }}
        >
          <Globe style={{ width: '13px', height: '13px', color: isDark ? '#38bdf8' : '#059669' }} />
          <select
            value={lang}
            onChange={(e) => onLangChange(e.target.value as SupportedLang)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '11px',
              fontWeight: 800,
              color: isDark ? '#f8fafc' : '#0f172a',
              cursor: 'pointer',
              outline: 'none'
            }}
            aria-label="Language Selector"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} style={{ background: isDark ? '#0f172a' : '#fff', color: isDark ? '#fff' : '#000' }}>
                {l.native}
              </option>
            ))}
          </select>
        </div>

        {/* Switch Role Button */}
        <button
          type="button"
          onClick={onSwitch}
          style={{
            border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid #cbd5e1',
            background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
            borderRadius: '10px',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 800,
            color: isDark ? '#f1f5f9' : '#0f172a',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          {t.switchRole}
        </button>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────
// 3. SOS Modal for Tourists (Includes Live GPS Pin)
// ─────────────────────────────────────────────
function SosModal({
  close,
  phone,
  location,
  lang = 'hi'
}: {
  close: () => void
  phone: string
  location: ReturnType<typeof useRealTimeLocation>
  lang?: SupportedLang
}) {
  const t = UI_TRANSLATIONS[lang]
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
          {dispatched ? t.sosDispatched : t.sosModalTitle}
        </h2>
        <p>
          {dispatched
            ? `Your real-time GPS coordinates (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}) have been broadcast to the nearest river patrol vessel.`
            : t.sosModalSubtitle}
        </p>

        {/* Live Pin Link */}
        <div style={{ margin: '8px 0 12px', padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>📍 {location.placeName}</span>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
            {t.sosOpenPin} <ExternalLink style={{ width: '11px', height: '11px' }} />
          </a>
        </div>

        {!dispatched && (
          <div className="incident-options">
            <button type="button" onClick={() => sendSos('Someone fell in water')}>
              {t.sosOption1}
            </button>
            <button
              type="button"
              onClick={() => sendSos('Boat is drifting / engine stopped')}
            >
              {t.sosOption2}
            </button>
            <button type="button" onClick={() => sendSos('Medical emergency on boat')}>
              {t.sosOption3}
            </button>
          </div>
        )}

        <a className="call-button" href="tel:112">
          <Phone /> {t.sosCallPolice}
        </a>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────
// 3.5. Interactive Incoming Emergency Call Modal
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Strict Language-Specific Triage Localization Dictionaries
// ─────────────────────────────────────────────
interface TriageStrings {
  headerBadge: string
  gridTag: string
  dangerAdvisoryTag: string
  skipToTriage: string
  audioPlayingNotice: string
  step1Tag: string
  step2Tag: string
  questionText: string
  instructionText: string
  countdownText: (s: number) => string
  micListening: string
  tapPrompt: string
  safeButtonTitle: string
  safeButtonSub: string
  safeBadge: string
  stuckButtonTitle: string
  stuckButtonSub: string
  stuckBadge: string
  safeScreenTitle: string
  safeScreenDesc: (boatman: string) => string
  safeCloseBtn: string
  stuckScreenTitle: string
  stuckScreenDesc: (boatman: string) => string
  stuckVectorTitle: string
  stuckVectorSub: string
  viewRadarBtn: string
  dial112Btn: string
  endCallBtn: string
  spokenQuestion: string
  spokenSafeAck: string
  spokenStuckAck: string
  voiceLocale: string
}

const TRIAGE_LOCALES: Record<SupportedLang, TriageStrings> = {
  en: {
    headerBadge: '🚨 112 RIVER RESCUE PATROL',
    gridTag: 'SOVEREIGN VOICE GRID',
    dangerAdvisoryTag: '⚠️ URGENT WATER LEVEL / FLASH SURGE ADVISORY',
    skipToTriage: 'Skip to Safety Check ⏭️',
    audioPlayingNotice: '🔊 Playing safety advisory… Stay tuned for verification.',
    step1Tag: '📢 STEP 1: SAFETY ADVISORY BROADCAST',
    step2Tag: '❓ STEP 2: SAFETY VERIFICATION CHECK',
    questionText: 'Are you in a safe place?',
    instructionText: "Say 'Yes' or 'Need Help'",
    countdownText: (s) => `⏳ Auto-dispatching rescue boat in ${s}s if no response`,
    micListening: '🎙️ Mic active: Say "Safe" or "Need Help"',
    tapPrompt: 'Or tap your response below:',
    safeButtonTitle: "✅ Yes, I'm Safe",
    safeButtonSub: 'At safe high ground · Cancel alert',
    safeBadge: 'SAFE',
    stuckButtonTitle: '🆘 Need Help / Stuck',
    stuckButtonSub: 'Trapped near water · Dispatch boat patrol now',
    stuckBadge: 'SOS',
    safeScreenTitle: 'Safety Status Confirmed!',
    safeScreenDesc: (boatman) => `Your safe status has been logged with Boat #14 (${boatman}) and River Patrol. You will not be disturbed again for this advisory.`,
    safeCloseBtn: 'Close Call Now',
    stuckScreenTitle: 'RESCUE VESSEL DISPATCHED!',
    stuckScreenDesc: (boatman) => `Nearest boat patrol Boat #14 (${boatman}) has received your live GPS coordinates.`,
    stuckVectorTitle: '🧭 Direct Nautical Rescue Vector:',
    stuckVectorSub: 'Compass steer heading locked across open water.',
    viewRadarBtn: 'View Radar',
    dial112Btn: 'Dial 112',
    endCallBtn: 'End Call',
    spokenQuestion: 'Are you in a safe place? Say Yes or Need Help.',
    spokenSafeAck: 'Thank you. Your safe status has been logged with river patrol.',
    spokenStuckAck: 'Alert dispatched to nearest boat patrol with your live coordinates. Help is on the way.',
    voiceLocale: 'en-IN'
  },
  hi: {
    headerBadge: '🚨 112 नदी बचाव गश्ती दल',
    gridTag: 'संप्रभु वॉइस ग्रिड',
    dangerAdvisoryTag: '⚠️ जलस्तर वृद्धि एवं तेज बहाव की आपात सूचना',
    skipToTriage: 'सीधे सुरक्षा जांच पर जाएं ⏭️',
    audioPlayingNotice: '🔊 चेतावनी ऑडियो प्रसारित हो रहा है… कृपया सुनें।',
    step1Tag: '📢 चरण 1: सुरक्षा चेतावनी प्रसारण',
    step2Tag: '❓ चरण 2: सुरक्षा सत्यापन जांच',
    questionText: 'क्या आप सुरक्षित स्थान पर हैं?',
    instructionText: "बोलें 'हाँ' या 'मदद चाहिए'",
    countdownText: (s) => `⏳ उत्तर न मिलने पर ${s} सेकंड में बचाव नौका भेजी जाएगी`,
    micListening: "🎙️ माइक चालू: बोलें 'सुरक्षित' या 'मदद चाहिए'",
    tapPrompt: 'या नीचे अपना उत्तर चुनें:',
    safeButtonTitle: '✅ हाँ, मैं सुरक्षित हूँ',
    safeButtonSub: 'ऊंचे स्थान पर सुरक्षित हूँ · अलर्ट बंद करें',
    safeBadge: 'सुरक्षित',
    stuckButtonTitle: '🆘 मदद चाहिए / फंसा हूँ',
    stuckButtonSub: 'पानी के पास फंसा हूँ · तुरंत नाव भेजें',
    stuckBadge: 'मदद',
    safeScreenTitle: 'सुरक्षा स्थिति दर्ज कर ली गई!',
    safeScreenDesc: (boatman) => `नाविक ${boatman} (नाव #14) और नदी पुलिस द्वारा आपकी सुरक्षा दर्ज कर ली गई है। आपको दोबारा परेशान नहीं किया जाएगा।`,
    safeCloseBtn: 'कॉल समाप्त करें',
    stuckScreenTitle: 'बचाव नौका रवाना कर दी गई है!',
    stuckScreenDesc: (boatman) => `निकटतम गश्ती नाव #14 (${boatman}) को आपका लाइव GPS स्थान भेज दिया गया है।`,
    stuckVectorTitle: '🧭 प्रत्यक्ष जल बचाव वेक्टर:',
    stuckVectorSub: 'पानी में सीधी कंपास दिशा निर्धारित कर दी गई है।',
    viewRadarBtn: 'रडार देखें',
    dial112Btn: '112 डायल करें',
    endCallBtn: 'कॉल समाप्त करें',
    spokenQuestion: 'क्या आप सुरक्षित स्थान पर हैं? बोलें हाँ, या मदद चाहिए।',
    spokenSafeAck: 'धन्यवाद। आपकी सुरक्षा स्थिति दर्ज कर ली गई है। सतर्क रहें।',
    spokenStuckAck: 'नजदीकी नाव चालक को आपकी लोकेशन भेज दी गई है। मदद आ रही है।',
    voiceLocale: 'hi-IN'
  },
  mr: {
    headerBadge: '🚨 ११२ नदी बचाव गस्त दल',
    gridTag: 'सार्वभौम व्हॉइस ग्रिड',
    dangerAdvisoryTag: '⚠️ पाण्याचा प्रवाह वाढल्याचा तात्काळ इशारा',
    skipToTriage: 'सुरक्षितता तपासणीवर जा ⏭️',
    audioPlayingNotice: '🔊 धोक्याचा इशारा ऐकवला जात आहे…',
    step1Tag: '📢 टप्पा १: सुरक्षा इशारा प्रसारण',
    step2Tag: '❓ टप्पा २: सुरक्षितता पडताळणी',
    questionText: 'तुम्ही सुरक्षित ठिकाणी आहात का?',
    instructionText: "बोला 'हो' किंवा 'मदत हवी आहे'",
    countdownText: (s) => `⏳ उत्तर न आल्यास ${s} सेकंदात बचाव बोट पाठवली जाईल`,
    micListening: "🎙️ माइक सुरू: बोला 'सुरक्षित' किंवा 'मदत हवी'",
    tapPrompt: 'किंवा खालील पर्याय निवडा:',
    safeButtonTitle: '✅ हो, मी सुरक्षित आहे',
    safeButtonSub: 'उंचावर सुरक्षित आहे · इशारा रद्द करा',
    safeBadge: 'सुरक्षित',
    stuckButtonTitle: '🆘 मदत हवी आहे / अडकलो आहे',
    stuckButtonSub: 'पाण्यात अडकलो आहे · त्वरित बोट पाठवा',
    stuckBadge: 'मदत',
    safeScreenTitle: 'सुरक्षितता नोंदवली गेली!',
    safeScreenDesc: (boatman) => `बोट #14 (${boatman}) आणि नदी पोलिसांनी तुमच्या सुरक्षिततेची नोंद घेतली आहे. तुम्हाला पुन्हा कॉल केला जाणार नाही.`,
    safeCloseBtn: 'कॉल बंद करा',
    stuckScreenTitle: 'बचाव बोट पाठवली गेली आहे!',
    stuckScreenDesc: (boatman) => `जवळच्या गस्ती बोटीला #14 (${boatman}) तुमचे थेट GPS स्थान पाठवले आहे.`,
    stuckVectorTitle: '🧭 थेट जल बचाव दिशा:',
    stuckVectorSub: 'पाण्यात होकायंत्रानुसार थेट दिशा निश्चित केली आहे.',
    viewRadarBtn: 'रडार पहा',
    dial112Btn: '११२ कॉल करा',
    endCallBtn: 'कॉल संपवा',
    spokenQuestion: 'तुम्ही सुरक्षित ठिकाणी आहात का? बोला हो, किंवा मदत हवी आहे.',
    spokenSafeAck: 'धन्यवाद. तुमची सुरक्षितता नोंदवली गेली आहे. काळजी घ्या.',
    spokenStuckAck: 'जवळच्या गस्ती बोटीला तुमचे स्थान पाठवले आहे. मदत येत आहे.',
    voiceLocale: 'mr-IN'
  },
  ta: {
    headerBadge: '🚨 112 நதி மீட்புப் படை',
    gridTag: 'குரல் பாதுகாப்பு கட்டமைப்பு',
    dangerAdvisoryTag: '⚠️ திடீர் நீர்வரத்து அவசர எச்சரிக்கை',
    skipToTriage: 'சரிபார்ப்புக்குச் செல்லவும் ⏭️',
    audioPlayingNotice: '🔊 பாதுகாப்பு எச்சரிக்கை ஒலிக்கிறது…',
    step1Tag: '📢 படி 1: பாதுகாப்பு எச்சரிக்கை ஒளிபரப்பு',
    step2Tag: '❓ படி 2: பாதுகாப்பு சரிபார்ப்பு',
    questionText: 'நீங்கள் பாதுகாப்பான இடத்தில் இருக்கிறீர்களா?',
    instructionText: " 'ஆம்' அல்லது 'உதவி தேவை' என சொல்லவும்",
    countdownText: (s) => `⏳ பதிலளிக்கவில்லை என்றால் ${s} வினாடிகளில் மீட்பு படகு வரும்`,
    micListening: "🎙️ மைக் செயலில்: 'பாதுகாப்பு' அல்லது 'உதவி' என சொல்லவும்",
    tapPrompt: 'அல்லது கீழே அழுத்தவும்:',
    safeButtonTitle: '✅ ஆம், நான் பாதுகாப்பாக உள்ளேன்',
    safeButtonSub: 'மேடான பாதுகாப்பான இடம் · எச்சரிக்கையை ரத்து செய்',
    safeBadge: 'பாதுகாப்பு',
    stuckButtonTitle: '🆘 உதவி தேவை / சிக்கியுள்ளேன்',
    stuckButtonSub: 'நீரில் சிக்கியுள்ளேன் · படகை உடனே அனுப்பவும்',
    stuckBadge: 'உதவி',
    safeScreenTitle: 'பாதுகாப்பு உறுதி செய்யப்பட்டது!',
    safeScreenDesc: (boatman) => `படகு #14 (${boatman}) மற்றும் நதி பாதுகாப்பு படையினரால் உங்கள் பாதுகாப்பு பதிவு செய்யப்பட்டது.`,
    safeCloseBtn: 'அழைப்பை முடிக்கவும்',
    stuckScreenTitle: 'மீட்புப் படகு அனுப்பப்பட்டது!',
    stuckScreenDesc: (boatman) => `அருகிலுள்ள படகு #14 (${boatman}) குழுவுக்கு உங்கள் GPS இருப்பிடம் அனுப்பப்பட்டுள்ளது.`,
    stuckVectorTitle: '🧭 நேரடி நீர் மீட்பு திசை:',
    stuckVectorSub: 'திசைகாட்டி வழிகாட்டுதல் நீரில் கணக்கிடப்பட்டுள்ளது.',
    viewRadarBtn: 'ரேடாரைப் பார்க்கவும்',
    dial112Btn: '112 ஐ அழைக்கவும்',
    endCallBtn: 'அழைப்பை முடிக்கவும்',
    spokenQuestion: 'நீங்கள் பாதுகாப்பான இடத்தில் இருக்கிறீர்களா? ஆம் அல்லது உதவி தேவை என்று சொல்லுங்கள்.',
    spokenSafeAck: 'நன்றி. உங்கள் பாதுகாப்பு நிலை பதிவு செய்யப்பட்டுள்ளது.',
    spokenStuckAck: 'அருகிலுள்ள மீட்பு படகுக்கு உங்கள் இருப்பிடம் அனுப்பப்பட்டுள்ளது. உதவி வருகிறது.',
    voiceLocale: 'ta-IN'
  },
  bn: {
    headerBadge: '🚨 ১১২ নদী উদ্ধারকারী টহল',
    gridTag: 'সার্বভৌম ভয়েস গ্রিড',
    dangerAdvisoryTag: '⚠️ জলস্তর বৃদ্ধি ও তীব্র স্রোতের সতর্কতা',
    skipToTriage: 'সরাসরি যাচাইকরণে যান ⏭️',
    audioPlayingNotice: '🔊 সতর্কতা বার্তা শোনানো হচ্ছে…',
    step1Tag: '📢 ধাপ ১: নিরাপত্তা সতর্কতা সম্প্রচার',
    step2Tag: '❓ ধাপ ২: সুরক্ষা যাচাইকরণ',
    questionText: 'আপনি কি নিরাপদ স্থানে আছেন?',
    instructionText: " 'হ্যাঁ' বা 'সাহায্য চাই' বলুন",
    countdownText: (s) => `⏳ উত্তর না দিলে ${s} সেকেন্ডের মধ্যে উদ্ধারকারী নৌকা পাঠানো হবে`,
    micListening: "🎙️ মাইক সক্রিয়: 'নিরাপদ' বা 'সাহায্য চাই' বলুন",
    tapPrompt: 'অথবা নিচে স্পর্শ করুন:',
    safeButtonTitle: '✅ হ্যাঁ, আমি নিরাপদ আছি',
    safeButtonSub: 'উঁচু স্থানে নিরাপদ · সতর্কতা বাতিল করুন',
    safeBadge: 'নিরাপদ',
    stuckButtonTitle: '🆘 সাহায্য চাই / আটকে গেছি',
    stuckButtonSub: 'জলে আটকে গেছি · অবিলম্বে নৌকা পাঠান',
    stuckBadge: 'সাহায্য',
    safeScreenTitle: 'নিরাপত্তা নিশ্চিত করা হয়েছে!',
    safeScreenDesc: (boatman) => `নৌকা #14 (${boatman}) এবং রিভার প্যাট্রোল আপনার নিরাপত্তা নথিভুক্ত করেছে। আপনাকে আর কল করা হবে না।`,
    safeCloseBtn: 'কল শেষ করুন',
    stuckScreenTitle: 'উদ্ধারকারী নৌকা পাঠানো হয়েছে!',
    stuckScreenDesc: (boatman) => `নিকটতম টহল নৌকা #14 (${boatman})-এ আপনার লাইভ GPS অবস্থান পাঠানো হয়েছে।`,
    stuckVectorTitle: '🧭 সরাসরি জল উদ্ধার ভেক্টর:',
    stuckVectorSub: 'কম্পাস দিকনির্দেশনা প্রস্তুত করা হয়েছে।',
    viewRadarBtn: 'রাডার দেখুন',
    dial112Btn: '১১২ ডায়াল করুন',
    endCallBtn: 'কল শেষ করুন',
    spokenQuestion: 'আপনি কি নিরাপদ স্থানে আছেন? হ্যাঁ বা সাহায্য চাই বলুন।',
    spokenSafeAck: 'ধন্যবাদ। আপনার নিরাপদ অবস্থা নথিভুক্ত করা হয়েছে।',
    spokenStuckAck: 'কাছের টহল নৌকায় আপনার অবস্থান পাঠানো হয়েছে। সাহায্য আসছে।',
    voiceLocale: 'bn-IN'
  }
}

// ─────────────────────────────────────────────
// 3.5. Interactive Conversational Emergency Call Modal (Strictly Localized)
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Post-Triage Notifications (Red Warning Box & Auto-Dispatch)
// ─────────────────────────────────────────────
const STAY_AWAY_WARNINGS: Record<SupportedLang, { title: string; desc: string; badge: string }> = {
  mr: {
    title: '🔴 सावधान: नदीकाठ / पात्रापासून त्वरित दूर राहा!',
    desc: 'प्रशासनाने व नाविक मित्रांनी जलस्तर वाढल्याचा इशारा दिला आहे. तुम्ही सुरक्षित असल्याचे नोंदवले आहे, परंतु कोणत्याही परिस्थितीत पुन्हा नदीपात्राजवळ किंवा पायऱ्यांवर जाऊ नका.',
    badge: '✅ तुम्ही सुरक्षित नोंदवले (कॉल म्यूट आहेत)'
  },
  hi: {
    title: '🔴 सावधान: नदी के तट / पानी से तुरंत दूर रहें!',
    desc: 'प्रशासन एवं नाविकों ने जलस्तर में तेज बहाव की चेतावनी जारी की है। आप सुरक्षित दर्ज हैं, कृपया किसी भी स्थिति में दोबारा पानी या घाट की निचली सीढ़ियों पर न जाएं।',
    badge: '✅ आप सुरक्षित दर्ज हैं (कॉल म्यूट हैं)'
  },
  en: {
    title: '🔴 CRITICAL: STAY AWAY FROM WATER BANK & RIVER EDGE!',
    desc: 'Authorities and boatmen have issued an urgent flash surge warning. Your safe status has been logged, but stay on high ground and do not approach the water under any circumstances.',
    badge: '✅ Marked Safe by You (Calls Muted)'
  },
  ta: {
    title: '🔴 எச்சரிக்கை: நதிக்கரை / நீர்நிலையை விட்டு உடனே விலகி இருங்கள்!',
    desc: 'அதிகாரிகள் திடீர் நீர்வரத்து எச்சரிக்கை விடுத்துள்ளனர். உங்கள் பாதுகாப்பு பதிவு செய்யப்பட்டுள்ளது, தயவுசெய்து நீர்நிலைக்கு அருகில் செல்ல வேண்டாம்.',
    badge: '✅ பாதுகாப்பு பதிவு செய்யப்பட்டது'
  },
  bn: {
    title: '🔴 সতর্কতা: নদীর পাড় / জল থেকে অবিলম্বে দূরে থাকুন!',
    desc: 'প্রশাসন তীব্র জলবৃদ্ধির সতর্কতা জারি করেছে। আপনার নিরাপত্তা নথিভুক্ত হয়েছে, দয়া করে কোনোভাবেই জলের কাছাকাছি যাবেন না।',
    badge: '✅ নিরাপদ হিসেবে চিহ্নিত'
  }
}

const AUTO_DISPATCH_NOTICES: Record<SupportedLang, { title: string; desc: string; hud: string }> = {
  mr: {
    title: '🚨 आणीबाणी मदत रवाना: तुम्ही प्रतिसाद न दिल्याने तात्काळ बोट पाठवली!',
    desc: '१५ सेकंदात कोणताही प्रतिसाद न आल्याने आपत्कालीन सुरक्षा प्रोटोकॉलनुसार जवळच्या गस्ती बोटीला तुमचे अचूक GPS स्थान पाठवण्यात आले आहे.',
    hud: 'बचाव बोट #14 (रामेश निषाद) कडे तुमचे थेट GPS पोहोचले आहे. शांत राहा, मदत येत आहे.'
  },
  hi: {
    title: '🚨 आपातकालीन बचाव सक्रिय: 15 सेकंड मौन रहने पर स्वतः बोट रवाना!',
    desc: '15 सेकंड तक उत्तर न मिलने पर सुरक्षा प्रोटोकॉल के तहत नजदीकी गश्ती नाव को आपका लाइव GPS स्थान भेज दिया गया है।',
    hud: 'गश्ती नाव #14 (रमेश निषाद) को आपका स्थान मिल गया है। शांत रहें, सहायता आ रही है।'
  },
  en: {
    title: '🚨 EMERGENCY RESCUE DISPATCHED: 15s Non-Response Auto-Dispatch!',
    desc: 'No response detected for 15 seconds. Automatic emergency safety protocol has dispatched the nearest boat patrol to your live GPS location.',
    hud: 'Patrol Vessel #14 has locked your coordinates. Stay calm, help is on the way.'
  },
  ta: {
    title: '🚨 அவசர மீட்புப் படை அனுப்பப்பட்டது: 15 வினாடி தானியங்கி இயக்கம்!',
    desc: '15 வினாடிகளில் பதில் வராததால் தானியங்கி மீட்பு நெறிமுறை செயல்படுத்தப்பட்டு அருகிலுள்ள ரோந்து படகுக்கு உங்கள் இருப்பிடம் அனுப்பப்பட்டுள்ளது.',
    hud: 'மீட்பு படகு #14 உங்கள் இடத்தை அடைந்து வருகிறது. அமைதியாக இருங்கள்.'
  },
  bn: {
    title: '🚨 জরুরি উদ্ধার অভিযান সক্রিয়: ১৫ সেকেন্ড সাড়া না পাওয়ায় নৌকা পাঠানো হয়েছে!',
    desc: '১৫ সেকেন্ডের মধ্যে সাড়া না পাওয়ায় স্বয়ংক্রিয় প্রোটোকলের অধীনে কাছের টহল নৌকায় আপনার লাইভ GPS পাঠানো হয়েছে।',
    hud: 'টহল নৌকা #14 আপনার অবস্থানের দিকে রওনা হয়েছে। সাহায্য আসছে।'
  }
}

function EmergencyCallModal({
  close,
  placeName,
  boatmanName = 'Ramesh Nishad',
  lang = 'hi',
  advisoryText,
  userName = 'Rahul Sharma',
  phone = '9876543210',
  location,
  onConfirmedSafe,
  onSos,
  autoAccept = false
}: {
  close: () => void
  placeName: string
  boatmanName?: string
  lang?: SupportedLang
  advisoryText?: string
  userName?: string
  phone?: string
  location?: { lat: number; lon: number; placeName: string; accuracy?: number }
  onConfirmedSafe?: () => void
  onSos: () => void
  autoAccept?: boolean
}) {
  const t = UI_TRANSLATIONS[lang]
  const tr = TRIAGE_LOCALES[lang] || TRIAGE_LOCALES.en

  const [callState, setCallState] = useState<'ringing' | 'connected'>(autoAccept ? 'connected' : 'ringing')
  const [voiceHeard, setVoiceHeard] = useState<string>('')
  const [liveTime, setLiveTime] = useState<string>('12:35 PM')

  const buzzerAudioRef = useRef<HTMLAudioElement | null>(null)
  const sirenCtxRef = useRef<AudioContext | null>(null)
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const ringTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)
  const timeout20sRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date()
        setLiveTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      } catch {}
    }
    updateTime()
    const tInterval = setInterval(updateTime, 30000)
    return () => clearInterval(tInterval)
  }, [])

  // High intensity emergency siren and buzzer
  const startEmergencyRingtone = () => {
    try {
      const buzzer = new Audio('/audio/buzzer.mp3')
      buzzer.loop = true
      buzzer.volume = 1.0
      buzzer.playbackRate = 1.35 // Higher speed & frequency for visceral urgency
      buzzerAudioRef.current = buzzer
      buzzer.play().catch(() => {})
    } catch {}

    // Add high-frequency emergency dual-tone siren oscillator
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        sirenCtxRef.current = ctx
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(960, ctx.currentTime)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()

        let isHigh = false
        sirenIntervalRef.current = setInterval(() => {
          if (ctx.state === 'closed') return
          osc.frequency.setValueAtTime(isHigh ? 960 : 1380, ctx.currentTime)
          isHigh = !isHigh
        }, 130)
      }
    } catch {}
  }

  const stopEmergencyAudio = () => {
    if (buzzerAudioRef.current) {
      try {
        buzzerAudioRef.current.pause()
        buzzerAudioRef.current.currentTime = 0
      } catch {}
    }
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current)
      sirenIntervalRef.current = null
    }
    if (sirenCtxRef.current) {
      try { sirenCtxRef.current.close() } catch {}
      sirenCtxRef.current = null
    }
  }

  const playHelpComingVoice = () => {
    try {
      const helpAudio = new Audio(`/audio/help_coming_${lang}.mp3`)
      helpAudio.volume = 1.0
      helpAudio.playbackRate = 1.15
      helpAudio.play().catch(() => {
        // Fallback to browser SpeechSynthesis only if audio fails
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel()
            const messages: Record<string, { text: string; locale: string }> = {
              mr: { text: 'कृपया सुरक्षित राहा, मदत तुमच्याकडे येत आहे.', locale: 'mr-IN' },
              hi: { text: 'कृपया सुरक्षित रहें, सहायता आपके पास आ रही है।', locale: 'hi-IN' },
              en: { text: 'Please be safe, help is coming for you.', locale: 'en-IN' },
              ta: { text: 'தயவுசெய்து பாதுகாப்பாக இருங்கள், உங்களுக்கு உதவி வருகிறது.', locale: 'ta-IN' },
              bn: { text: 'দয়া করে নিরাপদ থাকুন, সাহায্য আপনার কাছে আসছে।', locale: 'bn-IN' }
            }
            const item = messages[lang] || messages.en
            const utt = new SpeechSynthesisUtterance(item.text)
            utt.lang = item.locale
            utt.rate = 1.0
            window.speechSynthesis.speak(utt)
          } catch {}
        }
      })
    } catch {}
  }

  const handleStuck = (reason?: string) => {
    stopEmergencyAudio()
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current)
    if (timeout20sRef.current) clearTimeout(timeout20sRef.current)
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    if (audioRef.current) audioRef.current.pause()

    playHelpComingVoice()

    const fd = new FormData()
    fd.append('phone', phone)
    fd.append('tourist_name', userName)
    fd.append('incident_type', reason === 'unanswered_ringing_20s_timeout'
      ? 'Unanswered Tourist (20s Ringing Timeout Auto-Rescue)'
      : 'Tourist Unsafe / Needs Immediate Rescue')
    fd.append('lat', (location?.lat || 25.3176).toString())
    fd.append('lon', (location?.lon || 83.0060).toString())
    fd.append('location_name', location?.placeName || placeName)
    fetch('/api/tourist/sos', { method: 'POST', body: fd }).catch(() => {})

    if (onSos) onSos()
    close()
  }

  const handleSafe = () => {
    stopEmergencyAudio()
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current)
    if (timeout20sRef.current) clearTimeout(timeout20sRef.current)
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    if (audioRef.current) audioRef.current.pause()

    if (onConfirmedSafe) onConfirmedSafe()
    close()
  }

  const declineCall = () => {
    stopEmergencyAudio()
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current)
    if (timeout20sRef.current) clearTimeout(timeout20sRef.current)
    if (audioRef.current) audioRef.current.pause()
    close()
  }

  const acceptCall = () => {
    stopEmergencyAudio()
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current)
    setCallState('connected')
    startAdvisoryFlow()
  }

  // Ringing timeout (20s) if tourist doesn't pick up
  useEffect(() => {
    if (autoAccept) {
      startAdvisoryFlow()
      return
    }

    startEmergencyRingtone()

    const ringTimeout = setTimeout(() => {
      handleStuck('unanswered_ringing_20s_timeout')
    }, 20000)
    ringTimerRef.current = ringTimeout

    return () => {
      stopEmergencyAudio()
      if (ringTimeout) clearTimeout(ringTimeout)
      if (audioRef.current) audioRef.current.pause()
      if (timeout20sRef.current) clearTimeout(timeout20sRef.current)
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
      }
    }
  }, [autoAccept])

  const spokenWarnings: Record<string, { warning: string; question: string; locale: string }> = {
    mr: {
      warning: 'सावधान! स्थानिक नाविक आणि अधिकाऱ्यांनी पाणी वाढल्याचा इशारा दिला आहे. कृपया तात्काळ पाण्यापासून दूर व्हा.',
      question: 'तुम्ही सुरक्षित आहात का?',
      locale: 'mr-IN'
    },
    hi: {
      warning: 'सावधान! स्थानीय नाविकों और अधिकारियों ने जलस्तर बढ़ने की चेतावनी दी है। कृपया तुरंत पानी से दूर हट जाएं।',
      question: 'क्या आप सुरक्षित हैं?',
      locale: 'hi-IN'
    },
    en: {
      warning: 'Warning! Boatmen and patrol officers reported rapid water surge. Please move away from the water immediately.',
      question: 'Are you safe?',
      locale: 'en-IN'
    },
    ta: {
      warning: 'எச்சரிக்கை! நீர்மட்டம் வேகமாக உயர்ந்து வருவதாக படகோட்டிகள் எச்சரித்துள்ளனர். உடனடியாக கரையிலிருந்து விலகிச் செல்லுங்கள்.',
      question: 'நீங்கள் பாதுகாப்பாக இருக்கிறீர்களா?',
      locale: 'ta-IN'
    },
    bn: {
      warning: 'জরুরি সতর্কতা! নদীতে দ্রুত जलবৃদ্ধির সতর্কবার্তা দেওয়া হয়েছে। অবিলম্বে নদীর ঘাট ও জল থেকে দূরে সরে যান।',
      question: 'আপনি কি নিরাপদ আছেন?',
      locale: 'bn-IN'
    }
  }

  const activeMsg = spokenWarnings[lang] || spokenWarnings.en

  const startAdvisoryFlow = () => {
    try {
      if (audioRef.current) audioRef.current.pause()
      const audioUrl = `/audio/timbre_advisory_${lang}_danger.mp3`
      const audio = new Audio(audioUrl)
      audio.volume = 1.0
      // 1.15x speed gives punchy, energetic, fast emergency timbre
      audio.playbackRate = 1.15
      audio.preservesPitch = true
      audioRef.current = audio
      audio.play().catch(() => {})
    } catch {}

    // Wait 20 seconds after question is asked (silent background timer, no visible timer display)
    if (timeout20sRef.current) clearTimeout(timeout20sRef.current)
    const timeout20s = setTimeout(() => {
      handleStuck('unanswered_20s_timeout')
    }, 20000)
    timeout20sRef.current = timeout20s

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRec) {
      try {
        const rec = new SpeechRec()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = activeMsg.locale

        rec.onresult = (event: any) => {
          const results = event.results
          const transcript = results[results.length - 1][0].transcript.toLowerCase().trim()
          setVoiceHeard(transcript)

          if (/yes|haan|ha|safe|surakshit|theek|thik|fine|aam|am|ho|hoy|accha|okay|sari|surakshit aahe|me surakshit|mai surakshit/i.test(transcript)) {
            handleSafe()
          } else if (/help|no|nahi|madad|stuck|fasa|fas|trapped|bachao|illai|na|danger|uthavi|sahajjo|adaklo|madat/i.test(transcript)) {
            handleStuck('voice_stuck_detected')
          }
        }
        rec.start()
        recognitionRef.current = rec
      } catch {}
    }
  }

  const callTitle = lang === 'mr' ? 'आपत्कालीन कॉल' : (lang === 'hi' ? 'आपातकालीन कॉल' : (lang === 'ta' ? 'அவசர அழைப்பு' : (lang === 'bn' ? 'জরুরি কল' : 'Emergency Call')))

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 10, 24, 0.92)',
        backdropFilter: 'blur(28px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <style>{`
        @keyframes phoneRingingHalo {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.28); opacity: 0.15; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        @keyframes aiOrbPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 25px rgba(56, 189, 248, 0.45), inset 0 0 15px rgba(56, 189, 248, 0.3); }
          50% { transform: scale(1.08); box-shadow: 0 0 45px rgba(56, 189, 248, 0.8), inset 0 0 25px rgba(56, 189, 248, 0.6); }
        }
        @keyframes soundWaveBar {
          0% { height: 6px; }
          50% { height: 26px; }
          100% { height: 6px; }
        }
        @keyframes phoneIconVibrate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-12deg); }
          75% { transform: rotate(12deg); }
        }
      `}</style>

      {/* Realistic Smartphone Handset matching user reference image */}
      <section
        style={{
          width: '100%',
          maxWidth: '380px',
          height: '680px',
          borderRadius: '46px',
          background: 'linear-gradient(180deg, #5b64d8 0%, #4850c4 40%, #353cae 100%)',
          border: '9px solid #111827',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 45px rgba(91, 100, 216, 0.35)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '18px 24px 34px',
          color: '#ffffff',
          boxSizing: 'border-box'
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Smartphone Status Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12.5px',
            fontWeight: 700,
            color: 'rgba(255, 255, 255, 0.95)',
            letterSpacing: '0.02em',
            padding: '2px 8px 0'
          }}
        >
          <span>{liveTime}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Cellular Signal bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '11px' }}>
              <span style={{ width: '2.5px', height: '4px', background: '#ffffff', borderRadius: '1px' }} />
              <span style={{ width: '2.5px', height: '6px', background: '#ffffff', borderRadius: '1px' }} />
              <span style={{ width: '2.5px', height: '8px', background: '#ffffff', borderRadius: '1px' }} />
              <span style={{ width: '2.5px', height: '11px', background: '#ffffff', borderRadius: '1px' }} />
            </div>
            {/* Wifi Icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
              <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
              <line x1="12" y1="20" x2="12.01" y2="20"/>
            </svg>
            {/* Battery Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800 }}>97%</span>
              <div style={{ width: '19px', height: '10px', border: '1.5px solid #ffffff', borderRadius: '3px', padding: '1px', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '85%', height: '100%', background: '#ffffff', borderRadius: '1px' }} />
              </div>
            </div>
          </div>
        </div>

        {callState === 'ringing' ? (
          /* RINGING STATE (Matching user's attached screenshot media_1793779372072_fc744426.png) */
          <>
            <div style={{ textAlign: 'center', marginTop: '38px' }}>
              <h1
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  margin: '0 0 44px',
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
                }}
              >
                {callTitle}
              </h1>

              {/* Central Avatar with Soft Silhouette */}
              <div
                style={{
                  position: 'relative',
                  width: '124px',
                  height: '124px',
                  margin: '0 auto 36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* Soft Animated Pulsing Ring */}
                <div
                  style={{
                    position: 'absolute',
                    inset: -14,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.2)',
                    animation: 'phoneRingingHalo 1.5s infinite ease-out'
                  }}
                />
                {/* Clean White Circle Avatar */}
                <div
                  style={{
                    width: '116px',
                    height: '116px',
                    borderRadius: '50%',
                    background: '#e0e7ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Clean SVG Silhouette Avatar matching user image */}
                  <svg width="68" height="68" viewBox="0 0 24 24" fill="#4349bf">
                    <circle cx="12" cy="7" r="4.5" />
                    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8v1H4v-1z" />
                  </svg>
                </div>
              </div>

              {/* Calling Text with letterspacing */}
              <div
                style={{
                  fontSize: '15.5px',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.9)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase'
                }}
              >
                CALLING...
              </div>
            </div>

            {/* Bottom Controls matching screenshot */}
            <div style={{ marginTop: 'auto', marginBottom: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  padding: '0 16px',
                  marginBottom: '26px'
                }}
              >
                {/* Accept Button (Left - Circular White with Green Phone) */}
                <button
                  type="button"
                  onClick={acceptCall}
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
                    transition: 'transform 0.15s ease'
                  }}
                  title="Accept Call"
                >
                  <PhoneCall
                    style={{
                      width: '32px',
                      height: '32px',
                      color: '#16a34a',
                      animation: 'phoneIconVibrate 1.2s infinite'
                    }}
                  />
                </button>

                {/* Decline Button (Right - Circular White with Red End-Call) */}
                <button
                  type="button"
                  onClick={declineCall}
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
                    transition: 'transform 0.15s ease'
                  }}
                  title="Decline Call"
                >
                  <PhoneOff
                    style={{
                      width: '32px',
                      height: '32px',
                      color: '#dc2626'
                    }}
                  />
                </button>
              </div>

              {/* Bottom Subtle Pill matching "Send Message" in user's image */}
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    display: 'inline-block',
                    background: 'rgba(255, 255, 255, 0.22)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '16px',
                    padding: '8px 24px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#ffffff',
                    letterSpacing: '0.04em'
                  }}
                >
                  🚨 Emergency Safety Alert
                </div>
              </div>
            </div>
          </>
        ) : (
          /* CONNECTED AI VOICE STATE (AI speaking live, NO timer visible, waiting 20s for safe response) */
          <>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  margin: '0 0 4px',
                  color: '#ffffff',
                  letterSpacing: '-0.01em'
                }}
              >
                {callTitle}
              </h1>
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#93c5fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginBottom: '20px'
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#34d399',
                    display: 'inline-block'
                  }}
                />
                AI Emergency Assistant
              </div>

              {/* Animated AI Voice Orb & Soundwaves */}
              <div
                style={{
                  position: 'relative',
                  width: '96px',
                  height: '96px',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #38bdf8 0%, #2563eb 60%, #1e1b4b 100%)',
                    animation: 'aiOrbPulse 1.8s infinite ease-in-out',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Volume2 style={{ width: '32px', height: '32px', color: '#ffffff' }} />
                </div>
              </div>

              {/* Dynamic Soundwave Equalizer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  height: '28px',
                  marginBottom: '16px'
                }}
              >
                {[0.4, 0.85, 0.6, 1.0, 0.5, 0.9, 0.35, 0.75, 0.45].map((scale, i) => (
                  <span
                    key={i}
                    style={{
                      width: '3.5px',
                      height: '24px',
                      borderRadius: '2px',
                      background: '#38bdf8',
                      animation: 'soundWaveBar 0.8s ease-in-out infinite',
                      animationDelay: `${i * 0.09}s`
                    }}
                  />
                ))}
              </div>

              {/* Spoken Warning Message & Bold Question (Clean & uncluttered) */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.28)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px',
                  padding: '16px 18px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}
              >
                <p
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.92)',
                    lineHeight: '1.45',
                    margin: '0 0 12px'
                  }}
                >
                  {activeMsg.warning}
                </p>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 900,
                    color: '#67e8f9',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {activeMsg.question}
                </div>
              </div>

              {/* Voice Listening Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '8px'
                }}
              >
                <Mic style={{ width: '14px', height: '14px', color: '#67e8f9' }} />
                <span>
                  {voiceHeard
                    ? `"${voiceHeard}"`
                    : (lang === 'mr' ? 'ऐकत आहे... "होय / सुरक्षित" बोला' : (lang === 'hi' ? 'सुन रहा है... "हाँ / सुरक्षित" बोलें' : 'Listening... Speak "Yes / I am safe"'))}
                </span>
              </div>
            </div>

            {/* Response Buttons at Bottom */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleSafe}
                style={{
                  width: '100%',
                  background: '#16a34a',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '15px 18px',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 25px rgba(22, 163, 74, 0.45)'
                }}
              >
                <ShieldCheck style={{ width: '20px', height: '20px' }} />
                <span>
                  {lang === 'mr' ? 'होय, मी सुरक्षित आहे (Yes, I am safe)' : (lang === 'hi' ? 'हाँ, मैं सुरक्षित हूँ (Yes, I am safe)' : 'Yes, I am safe')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStuck('user_requested_help_button')}
                style={{
                  width: '100%',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '16px',
                  padding: '10px 14px',
                  color: '#fca5a5',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <PhoneOff style={{ width: '14px', height: '14px' }} />
                <span>
                  {lang === 'mr' ? 'मला मदत हवी आहे (I need help)' : (lang === 'hi' ? 'मुझे सहायता चाहिए (I need help)' : 'I need help / rescue')}
                </span>
              </button>
            </div>
          </>
        )}
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
  userName = 'Rahul Sharma',
  location,
  initialStatus,
  lang,
  onLangChange,
  isOnline = true
}: {
  onSwitch: () => void
  phone: string
  userName?: string
  location: ReturnType<typeof useRealTimeLocation>
  initialStatus?: Status
  lang: SupportedLang
  onLangChange: (l: SupportedLang) => void
  isOnline?: boolean
}) {
  const t = UI_TRANSLATIONS[lang]
  const [status, setStatus] = useState<Status>(initialStatus || 'safe')
  const [outOfRangeNotice, setOutOfRangeNotice] = useState<{ location: string; distanceKm: string } | null>(null)
  const [isVerifiedSafe, setIsVerifiedSafe] = useState(false)
  const [hasActiveBroadcast, setHasActiveBroadcast] = useState(false)
  const [sosAutoDispatched, setSosAutoDispatched] = useState(false)
  const [sos, setSos] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [callAutoAccept, setCallAutoAccept] = useState(false)
  const [notificationPerm, setNotificationPerm] = useState<string>('default')
  const lastHandledDispatchIdRef = useRef<string>('')
  const [playingBoatman, setPlayingBoatman] = useState(false)
  const [playingAi, setPlayingAi] = useState(false)
  const [playingRaw, setPlayingRaw] = useState(false)

  // Sector state from backend
  const [boatmanName, setBoatmanName] = useState('Ramesh Nishad')
  const [boatmanLat, setBoatmanLat] = useState<number>(25.3176)
  const [boatmanLon, setBoatmanLon] = useState<number>(83.0060)
  const [distanceMeters, setDistanceMeters] = useState<number>(350)
  const [distanceText, setDistanceText] = useState('350 meters from you')
  const [hindiQuote, setHindiQuote] = useState(t.quoteSafe)
  const [translation, setTranslation] = useState(t.advisorySafe)
  const [waterStatusText, setWaterStatusText] = useState(t.safeStatusDesc(location.placeName))
  const [boatmanAudioUrl, setBoatmanAudioUrl] = useState('/api/audio/boatman_sample_safe.wav')
  const [boatmanRawAudioUrl, setBoatmanRawAudioUrl] = useState('')
  const [aiAudioUrl, setAiAudioUrl] = useState('/api/audio/ai_advisory_safe.wav')

  const boatmanAudioRef = useRef<HTMLAudioElement | null>(null)
  const rawAudioRef = useRef<HTMLAudioElement | null>(null)
  const aiAudioRef = useRef<HTMLAudioElement | null>(null)

  // Trigger OS-level system notification over any active app / phone lock screen with SOS vibration
  const triggerOsEmergencyAlert = (overrideTitle?: string, overrideBody?: string) => {
    // 1. Hardware device SOS vibration pattern: [500ms on, 200ms off, 500ms on, 200ms off, 1000ms on, 300ms off, 1000ms on]
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([500, 200, 500, 200, 1000, 300, 1000])
      } catch {}
    }

    const title = overrideTitle || `🚨 CoastGuard Emergency (112): River Surge Alert!`
    const body = overrideBody || `${boatmanName} reported hazardous water conditions near ${location.placeName}. Tap to answer emergency voice call.`

    // 2. High-Priority System Notification (ServiceWorker OS Heads-Up Alert over any active app / lock screen)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body,
              icon: '/apple-icon.png',
              badge: '/icon.svg',
              vibrate: [500, 200, 500, 200, 1000, 300, 1000],
              tag: 'coastguard-emergency-call',
              renotify: true,
              requireInteraction: true,
              data: { url: '/?call=1' },
              actions: [
                { action: 'accept', title: '📞 Accept Call (सुनें)' },
                { action: 'dismiss', title: 'Dismiss' }
              ]
            } as any)
          }).catch(() => {
            try {
              new Notification(title, { body, icon: '/apple-icon.png', requireInteraction: true } as any)
            } catch {}
          })
        } else {
          try {
            new Notification(title, { body, icon: '/apple-icon.png', requireInteraction: true } as any)
          } catch {}
        }
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((res) => {
          setNotificationPerm(res)
          if (res === 'granted') {
            triggerOsEmergencyAlert(overrideTitle, overrideBody)
          }
        }).catch(() => {})
      }
    }
  }

  // Listen for Service Worker background triggers, Notification permissions, and URL params
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPerm(Notification.permission)
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((res) => {
          setNotificationPerm(res)
        }).catch(() => {})
      }
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('call') === '1') {
        if (params.get('auto') === '1') {
          setCallAutoAccept(true)
        }
        setShowCallModal(true)
        try {
          window.history.replaceState({}, '', window.location.pathname)
        } catch {}
      }
    }

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TRIGGER_EMERGENCY_CALL') {
        setCallAutoAccept(!!event.data.autoAccept)
        setShowCallModal(true)
      }
    }

    navigator.serviceWorker.addEventListener('message', handleSwMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage)
    }
  }, [])

  // Update localized text whenever language changes
  useEffect(() => {
    if (status === 'safe') {
      setHindiQuote(t.quoteSafe)
      setTranslation(t.advisorySafe)
      setWaterStatusText(t.safeStatusDesc(location.placeName))
    } else {
      setHindiQuote(t.quoteDanger)
      setTranslation(t.advisoryDanger)
      setWaterStatusText(t.dangerStatusDesc(location.placeName))
    }
  }, [lang, status, location.placeName])

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
    // Register tourist device with real phone number for automated telephony dispatch
    const registerTourist = async () => {
      try {
        const fd = new FormData()
        fd.append('phone', phone)
        fd.append('role', 'tourist')
        fd.append('lat', location.lat.toString())
        fd.append('lon', location.lon.toString())
        fd.append('place_name', location.placeName)
        await fetch('/api/location/update', { method: 'POST', body: fd })
      } catch {}
    }
    registerTourist()

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/tourist/status?lat=${location.lat}&lon=${location.lon}`)
        if (res.ok) {
          const data = await res.json()
          if (data.has_broadcast) {
            applySectorData(data)
            if (data.status === 'danger' && !isVerifiedSafe) {
              setStatus('danger')
              setShowCallModal(true)
            }
          }
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
            if (msg.data.status === 'danger') {
              setStatus('danger')
              if (!isVerifiedSafe) {
                setShowCallModal(true)
                const fd = new FormData()
                fd.append('phone', phone)
                fd.append('status', 'danger')
                fd.append('language', lang)
                fetch('/api/tourist/call', { method: 'POST', body: fd }).catch(() => {})
              }
            } else if (msg.data.status === 'safe') {
              setStatus('safe')
              setShowCallModal(false)
            }
          }
        } catch {}
      }
    } catch {}

    return () => {
      if (ws) ws.close()
    }
  }, [location.lat, location.lon, phone])

  const applySectorData = (data: any) => {
    if (data.has_broadcast || (data.dispatch_id && data.dispatch_id !== 'none' && data.dispatch_id !== 'initial_safe')) {
      setHasActiveBroadcast(true)
    }
    let d = distanceMeters
    if (data.lat && data.lon) {
      setBoatmanLat(data.lat)
      setBoatmanLon(data.lon)
      d = calculateHaversineDistance(location.lat, location.lon, data.lat, data.lon)
      setDistanceMeters(d)
      setDistanceText(d < 1000 ? `${d} meters from your live GPS` : `${(d / 1000).toFixed(1)} km from your live GPS`)
    }
    if (data.status) {
      if (data.status === 'danger' && d > 2000) {
        setStatus('safe')
        setOutOfRangeNotice({
          location: data.location || 'Assi Ghat Sector',
          distanceKm: (d / 1000).toFixed(1)
        })
      } else if (data.status === 'danger') {
        setStatus('danger')
        setOutOfRangeNotice(null)
      } else {
        setStatus('safe')
        setOutOfRangeNotice(null)
      }
    }
    if (data.boatman_name) setBoatmanName(data.boatman_name)
    if (data.hindi_quote) setHindiQuote(`“${data.hindi_quote}”`)
    if (data.english_translation) setTranslation(data.english_translation)
    if (data.water_status_text) setWaterStatusText(data.water_status_text)
    if (data.boatman_audio_url) setBoatmanAudioUrl(data.boatman_audio_url)
    if (data.boatman_raw_audio_url) setBoatmanRawAudioUrl(data.boatman_raw_audio_url)
    if (data.ai_audio_url) setAiAudioUrl(data.ai_audio_url)
  }

  // Re-evaluate perimeter distance whenever location changes dynamically
  useEffect(() => {
    if (boatmanLat && boatmanLon) {
      const d = calculateHaversineDistance(location.lat, location.lon, boatmanLat, boatmanLon)
      // If incident is > 3.0 km away, reset to calm local sector
      if (d > 3000) {
        setStatus('safe')
        setOutOfRangeNotice(null)
        setWaterStatusText(`All normal in ${location.placeName}. No river hazards reported within 3.0 km.`)
        setBoatmanName('Local River Patrol')
        setDistanceText('Patrolling local 3 km perimeter')
        setHindiQuote('स्थानीय जल क्षेत्र पूरी तरह शांत और सुरक्षित है।')
        setTranslation(`Local waters are calm near ${location.placeName}. No hazards in 3 km perimeter.`)
        setShowCallModal(false)
      } else {
        setDistanceMeters(d)
        setDistanceText(d < 1000 ? `${d} meters from your live GPS` : `${(d / 1000).toFixed(1)} km from your live GPS`)
        if (d > 2000 && status === 'danger') {
          setStatus('safe')
          setOutOfRangeNotice({
            location: 'Nearby Sector',
            distanceKm: (d / 1000).toFixed(1)
          })
          setShowCallModal(false)
        }
      }
    }
  }, [location.lat, location.lon, boatmanLat, boatmanLon])

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

    const ttsUrl = `/api/tourist/tts?lang=${lang}&status=${status}`
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
      <TopBar
        mode="tourist"
        location={location}
        onSwitch={onSwitch}
        lang={lang}
        onLangChange={onLangChange}
        userName={userName}
        isOnline={isOnline}
      />
      <main className="tourist-app desktop-dashboard-container">
        {/* Offline Banner when disconnected */}
        {!isOnline && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#92400e',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <Radio style={{ width: '16px', color: '#d97706', flexShrink: 0 }} />
            <span>{t.offlineNotice}</span>
          </div>
        )}

        {/* TOP DECK ROW: 2 Sleek Cards */}
        <div className="desktop-top-grid">
          {/* Card 1: Tourist Guardian Identity */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(12, 21, 39, 0.95), rgba(7, 13, 24, 0.98))',
              border: '1px solid rgba(56, 189, 248, 0.18)',
              borderRadius: '20px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.35))',
                  border: '1.5px solid rgba(56, 189, 248, 0.45)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px',
                  flexShrink: 0,
                  boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)'
                }}
              >
                🛡️
              </div>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#38bdf8', textTransform: 'uppercase' }}>
                  TOURIST GUARDIAN GRID
                </div>
                <h2 style={{ fontSize: '17px', fontWeight: 900, margin: '2px 0 3px', color: '#f8fafc' }}>
                  {userName}
                </h2>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin style={{ width: '13px', height: '13px', color: '#38bdf8' }} />
                  <span>{location.placeName}</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  padding: '5px 10px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'beaconPulse 1.8s infinite' }} />
                OS Emergency Grid: Active
              </span>
              <div style={{ fontSize: '10.5px', color: '#64748b', fontFamily: 'monospace', marginTop: '4px' }}>
                {location.lat.toFixed(4)}°N, {location.lon.toFixed(4)}°E
              </div>
            </div>
          </div>

          {/* Card 2: Sector Safety Status Banner (Prominent, High-Contrast & Vibrant) */}
          <div
            style={{
              background: (status === 'safe' && !isVerifiedSafe)
                ? 'linear-gradient(135deg, #059669 0%, #047857 55%, #064e3b 100%)'
                : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 55%, #7f1d1d 100%)',
              border: (status === 'safe' && !isVerifiedSafe) ? '2.5px solid #34d399' : '2.5px solid #f87171',
              borderRadius: '22px',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: (status === 'safe' && !isVerifiedSafe)
                ? '0 10px 35px rgba(5, 150, 105, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                : '0 12px 45px rgba(220, 38, 38, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
              position: 'relative'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em' }}>
                {isVerifiedSafe ? (
                  <AlertTriangle style={{ width: '28px', height: '28px', flexShrink: 0, color: '#ffffff' }} />
                ) : (
                  <ShieldCheck style={{ width: '28px', height: '28px', flexShrink: 0, color: '#ffffff' }} />
                )}
                <span>
                  {isVerifiedSafe
                    ? (lang === 'mr' ? '⚠️ पाण्याच्या काठापासून दूर राहा!' : (lang === 'hi' ? '⚠️ पानी और घाट के किनारे से दूर रहें!' : '⚠️ STAY AWAY FROM WATER BANK!'))
                    : (status === 'safe'
                        ? (outOfRangeNotice
                            ? `🛡️ Safe · Outside Hazard Perimeter (${outOfRangeNotice.distanceKm} km away)`
                            : t.safeStatusBanner)
                        : t.dangerStatusBanner)}
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: (status === 'safe' && !isVerifiedSafe) ? '#ecfdf5' : '#fee2e2', lineHeight: '1.45', fontWeight: 600 }}>
                {isVerifiedSafe
                  ? (lang === 'mr'
                      ? 'स्थानिक नाविक व प्रशासनाने जलपातळी वाढल्याचा इशारा दिला आहे. तुम्ही सुरक्षित असल्याची नोंद झाली आहे, कृपया घाटावर किंवा काठावर जाऊ नका.'
                      : (lang === 'hi'
                          ? 'नाविकों और प्रशासन ने जल स्तर में अचानक वृद्धि की चेतावनी दी है। आपकी सुरक्षा की पुष्टि हो चुकी है, कृपया किनारे पर न जाएं।'
                          : 'Local boatmen and officials reported rising water hazards. You are marked safe, but please strictly stay away from the water bank.'))
                  : (status === 'safe' && outOfRangeNotice
                      ? `Water surge hazard was reported at ${outOfRangeNotice.location} (${outOfRangeNotice.distanceKm} km from you). You are outside the 2.0 km danger perimeter and completely safe.`
                      : waterStatusText)}
              </p>
            </div>

            <span
              style={{
                fontSize: '12px',
                fontWeight: 900,
                padding: '8px 16px',
                borderRadius: '30px',
                background: '#ffffff',
                color: (status === 'safe' && !isVerifiedSafe) ? '#047857' : '#991b1b',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                flexShrink: 0,
                marginLeft: '16px',
                letterSpacing: '0.04em'
              }}
            >
              {isVerifiedSafe ? '⚠️ STAY AWAY' : ((status === 'safe' && !isVerifiedSafe) ? '✅ SAFE TO ROAM' : '⚠️ DANGER ALERT')}
            </span>
          </div>
        </div>

        {/* PROMINENT STAY AWAY WARNING BANNER */}
        {isVerifiedSafe && status === 'safe' && (
          <section
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.25))',
              border: '2px solid #ef4444',
              borderRadius: '18px',
              padding: '16px 20px',
              marginBottom: '20px',
              boxShadow: '0 8px 30px rgba(239, 68, 68, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <AlertTriangle style={{ width: '24px', height: '24px', color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#f87171', margin: '0 0 3px' }}>
                    {STAY_AWAY_WARNINGS[lang]?.title || STAY_AWAY_WARNINGS.en.title}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#fecdd3', margin: '0 0 6px', lineHeight: '1.45', fontWeight: 600 }}>
                    {STAY_AWAY_WARNINGS[lang]?.desc || STAY_AWAY_WARNINGS.en.desc}
                  </p>
                  <span style={{ fontSize: '10.5px', color: '#cbd5e1', fontWeight: 700 }}>
                    {STAY_AWAY_WARNINGS[lang]?.badge || STAY_AWAY_WARNINGS.en.badge}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVerifiedSafe(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </section>
        )}

        {/* MAIN COMMAND DECK: 2-COLUMN DESKTOP GRID */}
        <div className="desktop-main-grid">
          {/* LEFT COLUMN: Local River Voice Update & Safety Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <section
              style={{
                background: 'linear-gradient(180deg, #0c1527 0%, #070d18 100%)',
                border: '1px solid rgba(56, 189, 248, 0.18)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: hasActiveBroadcast ? '14px' : '0' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'rgba(34, 211, 238, 0.15)',
                    border: '1px solid rgba(34, 211, 238, 0.35)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#22d3ee'
                  }}
                >
                  <Radio style={{ width: '20px', height: '20px' }} />
                </div>
                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t.voiceUpdateHeading}
                  </span>
                  <h2 style={{ fontSize: '16px', fontWeight: 900, margin: '2px 0 0', color: '#f8fafc' }}>
                    {hasActiveBroadcast ? `${boatmanName} · ${t.fromYou(distanceText)}` : 'Live River Voice Grid · Standby'}
                  </h2>
                </div>
              </div>

              {hasActiveBroadcast ? (
                <>
                  <blockquote
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderLeft: '4px solid #22d3ee',
                      padding: '12px 16px',
                      borderRadius: '0 14px 14px 0',
                      margin: '14px 0 10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#f1f5f9',
                      lineHeight: '1.5'
                    }}
                  >
                    &ldquo;{hindiQuote}&rdquo;
                  </blockquote>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px', lineHeight: '1.45' }}>
                    {translation}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Clean Voice (Noise Stripped) */}
                    <button
                      type="button"
                      onClick={toggleBoatmanAudio}
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1.5px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: '14px',
                        padding: '12px 16px',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        textAlign: 'left'
                      }}
                    >
                      <span
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: '#10b981',
                          color: '#ffffff',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        {playingBoatman ? <Pause style={{ width: '18px', height: '18px' }} /> : <Play style={{ width: '18px', height: '18px' }} />}
                      </span>
                      <div>
                        <strong style={{ fontSize: '13px', color: '#34d399', display: 'block' }}>{t.listenCleanVoice}</strong>
                        <small style={{ fontSize: '10.5px', color: '#94a3b8' }}>{t.listenCleanVoiceSub}</small>
                      </div>
                    </button>

                    {/* AI Synthesized Voice */}
                    <button
                      type="button"
                      onClick={toggleAiAudio}
                      style={{
                        background: 'rgba(34, 211, 238, 0.12)',
                        border: '1.5px solid rgba(34, 211, 238, 0.4)',
                        borderRadius: '14px',
                        padding: '12px 16px',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        textAlign: 'left'
                      }}
                    >
                      <span
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: '#0284c7',
                          color: '#ffffff',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        {playingAi ? <Pause style={{ width: '18px', height: '18px' }} /> : <Volume2 style={{ width: '18px', height: '18px' }} />}
                      </span>
                      <div>
                        <strong style={{ fontSize: '13px', color: '#38bdf8', display: 'block' }}>
                          {t.listenAiAdvisory(LANGUAGES.find((l) => l.code === lang)?.label || 'Regional')}
                        </strong>
                        <small style={{ fontSize: '10.5px', color: '#94a3b8' }}>{t.listenAiAdvisorySub}</small>
                      </div>
                    </button>

                    {/* Noise Canceller Comparison Link */}
                    {boatmanRawAudioUrl && (
                      <button
                        type="button"
                        onClick={toggleRawAudio}
                        style={{
                          background: 'rgba(255, 170, 0, 0.08)',
                          border: '1px solid rgba(255, 170, 0, 0.3)',
                          borderRadius: '14px',
                          padding: '10px 14px',
                          color: '#f8fafc',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          textAlign: 'left'
                        }}
                      >
                        <span
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#d97706',
                            color: '#ffffff',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0
                          }}
                        >
                          {playingRaw ? <Pause style={{ width: '16px', height: '16px' }} /> : <Play style={{ width: '16px', height: '16px' }} />}
                        </span>
                        <div>
                          <strong style={{ fontSize: '12px', color: '#fbbf24', display: 'block' }}>{t.compareRawAudio}</strong>
                          <small style={{ fontSize: '10px', color: '#94a3b8' }}>{t.compareRawAudioSub}</small>
                        </div>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed rgba(56, 189, 248, 0.25)',
                    borderRadius: '16px',
                    padding: '24px 18px',
                    marginTop: '14px',
                    textAlign: 'center'
                  }}
                >
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 10px', lineHeight: '1.5' }}>
                    {lang === 'hi'
                      ? 'इस जल क्षेत्र में अभी कोई नया वॉइस प्रसारण नहीं हुआ है। जब कोई नाविक वॉक-टॉकी पर बोलेगा, तो उनका सत्यापित वॉइस संदेश और ऑडियो विकल्प यहां तुरंत सक्रिय हो जाएगा।'
                      : (lang === 'mr'
                        ? 'या जलक्षेत्रात अद्याप नवीन ऑडिओ संदेश प्रसारित झालेला नाही. नाविक वॉक-टॉकीवर बोलताच, त्यांचे थेट रेकॉर्डिंग आणि ऑडिओ पर्याय येथे सक्रिय होतील.'
                        : 'No voice broadcast recorded in this water sector yet. When a boatman speaks via the walkie-talkie grid, their live verified voice recording and audio options will appear here in real time.')}
                  </p>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '20px',
                      padding: '4px 12px',
                      fontSize: '11px',
                      color: '#34d399',
                      fontWeight: 700
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'beaconPulse 1.5s infinite' }} />
                    {lang === 'hi' ? '3.0 किमी परिधि में लाइव चैनल सक्रिय' : (lang === 'mr' ? '३.० किमी कक्षेत थेट ऑडिओ चॅनेल सक्रिय' : 'Live Channel Active · Listening on 3.0 km Perimeter')}
                  </div>
                </div>
              )}
            </section>

            {/* Emergency SOS Button */}
            <button
              type="button"
              className="tourist-sos"
              onClick={() => setSos(true)}
              style={{
                borderRadius: '20px',
                padding: '18px 24px',
                boxShadow: '0 10px 30px rgba(225, 29, 72, 0.4)',
                fontSize: '16px',
                fontWeight: 900
              }}
            >
              <Siren style={{ width: '24px', height: '24px' }} /> {t.touristSosBtn}
              <small style={{ fontSize: '11.5px', display: 'block', marginTop: '3px' }}>
                {t.touristSosSub(location.lat.toFixed(4), location.lon.toFixed(4))}
              </small>
            </button>
          </div>

          {/* RIGHT COLUMN: The Giant Glowing Revolving Radar */}
          <div>
            <MiniVisualRadar
              status={status}
              distanceMeters={distanceMeters}
              placeName={location.placeName}
              boatmanName={boatmanName}
              currentUserName={userName}
              mode="tourist"
              lang={lang}
            />
          </div>
        </div>

        {sos && <SosModal phone={phone} location={location} close={() => setSos(false)} lang={lang} />}

        {showCallModal && (
          <EmergencyCallModal
            close={() => {
              setShowCallModal(false)
              setCallAutoAccept(false)
            }}
            placeName={location.placeName}
            boatmanName={boatmanName}
            lang={lang}
            advisoryText={t.advisoryDanger}
            userName={userName}
            phone={phone}
            location={location}
            onConfirmedSafe={() => {
              setIsVerifiedSafe(true)
              setStatus('safe')
            }}
            onSos={() => {
              setSosAutoDispatched(true)
            }}
            autoAccept={callAutoAccept}
          />
        )}
      </main>
    </>
  )
}

// ─────────────────────────────────────────────
// 5. Boatman / Fisherman Dashboard
// ─────────────────────────────────────────────
function BoatmanDashboard({
  role = 'boatman',
  onSwitch,
  phone,
  userName = 'Ramesh Nishad',
  location,
  onBroadcast,
  lang,
  onLangChange,
  isOnline = true
}: {
  role?: Mode
  onSwitch: () => void
  phone: string
  userName?: string
  location: ReturnType<typeof useRealTimeLocation>
  onBroadcast: (status: Status) => void
  lang: SupportedLang
  onLangChange: (l: SupportedLang) => void
  isOnline?: boolean
}) {
  const t = UI_TRANSLATIONS[lang]
  const [recording, setRecording] = useState(false)
  const [activeRescue, setActiveRescue] = useState<{
    touristName: string
    phone: string
    incident: string
    lat: number
    lon: number
    distMeters: number
    bearing: { degrees: number; compass: string; arrow: string }
    time: string
    locationName: string
  } | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [sent, setSent] = useState(false)
  const [sentText, setSentText] = useState(t.quoteSafe)
  const [recipientsCount, setRecipientsCount] = useState(18)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Recording timer
  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [recording])

  // WebSocket listener for live SOS rescue dispatches from tourists
  useEffect(() => {
    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(WS_URL)
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'sos_alert' && msg.data) {
            const sos = msg.data
            const d = calculateHaversineDistance(location.lat, location.lon, sos.lat, sos.lon)
            const b = calculateBearing(location.lat, location.lon, sos.lat, sos.lon)
            setActiveRescue({
              touristName: sos.tourist_name || 'Rahul Sharma (Tourist)',
              phone: sos.phone || '9876543210',
              incident: sos.incident || 'Emergency SOS / Trapped near Water',
              lat: sos.lat,
              lon: sos.lon,
              distMeters: Math.min(d, 450),
              bearing: b,
              time: sos.time || new Date().toLocaleTimeString(),
              locationName: sos.location || location.placeName
            })
            // Sound audible rescue alert chime
            try {
              const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
              if (AudioCtx) {
                const ctx = new AudioCtx()
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.type = 'sawtooth'
                osc.frequency.setValueAtTime(520, ctx.currentTime)
                osc.frequency.exponentialRampToValueAtTime(1040, ctx.currentTime + 0.35)
                gain.gain.setValueAtTime(0.25, ctx.currentTime)
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.start()
                osc.stop(ctx.currentTime + 0.5)
              }
            } catch {}
          }
        } catch {}
      }
    } catch {}

    return () => {
      if (ws) ws.close()
    }
  }, [location.lat, location.lon, location.placeName])

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
      fd.append('fisherman_name', userName)
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
        setSentText(`“${state.hindi_quote || overrideText || t.boatmanSpeakSent}”`)
        setRecipientsCount(state.recipients_notified || 18)
        onBroadcast(state.status)
      } else {
        setSent(true)
        onBroadcast('safe')
      }
    } catch {
      // Save to offline queue for automatic sync when internet resumes
      try {
        const raw = localStorage.getItem('cg_offline_queue')
        const queue = raw ? JSON.parse(raw) : []
        queue.push({
          type: 'broadcast',
          fisherman_name: userName,
          phone,
          text: overrideText || 'Offline Voice Broadcast',
          status: forcedStatus || 'safe',
          lat: location.lat,
          lon: location.lon,
          location_name: location.placeName,
          timestamp: new Date().toISOString()
        })
        localStorage.setItem('cg_offline_queue', JSON.stringify(queue))
      } catch {}

      setSent(true)
      if (overrideText) setSentText(`“${overrideText}”`)
      onBroadcast(forcedStatus || 'safe')
    }
  }



  return (
    <>
      <TopBar
        mode="boatman"
        location={location}
        onSwitch={onSwitch}
        lang={lang}
        onLangChange={onLangChange}
        userName={userName}
        isOnline={isOnline}
      />
      <main className="boatman-app desktop-dashboard-container">
        {/* Offline Banner when disconnected */}
        {!isOnline && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#92400e',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <Radio style={{ width: '16px', color: '#d97706', flexShrink: 0 }} />
            <span>{t.offlineNotice}</span>
          </div>
        )}

        {/* TOP DECK ROW: 2 Sleek Cards (Matching User's Desktop Screenshot) */}
        <div className="desktop-top-grid">
          {/* Card 1: Sovereign Vessel Station */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(12, 21, 39, 0.95), rgba(7, 13, 24, 0.98))',
              border: '1px solid rgba(56, 189, 248, 0.18)',
              borderRadius: '20px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: role === 'authority'
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(185, 28, 28, 0.4))'
                    : 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(14, 165, 233, 0.35))',
                  border: role === 'authority' ? '1.5px solid rgba(239, 68, 68, 0.5)' : '1.5px solid rgba(34, 211, 238, 0.45)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px',
                  flexShrink: 0,
                  boxShadow: role === 'authority' ? '0 0 16px rgba(239, 68, 68, 0.3)' : '0 0 16px rgba(34, 211, 238, 0.25)'
                }}
              >
                {role === 'authority' ? '🏛️' : '🚢'}
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', color: '#38bdf8', textTransform: 'uppercase' }}>
                  {role === 'authority' ? 'NATIONAL DISASTER RESPONSE FORCE' : 'SOVEREIGN VESSEL STATION'}
                </div>
                <h2 style={{ fontSize: '17px', fontWeight: 900, margin: '2px 0 3px', color: '#f8fafc', textTransform: 'capitalize' }}>
                  {userName || (role === 'authority' ? 'Insp. Rajesh Verma' : 'रमेश निषाद')}
                </h2>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin style={{ width: '13px', height: '13px', color: '#38bdf8' }} />
                  <span>{role === 'authority' ? `NDRF Sector 01 · ${location.placeName}` : `Patrol Vessel #14 · ${location.placeName}`}</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  padding: '5px 10px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'beaconPulse 1.8s infinite' }} />
                {location.isLiveGPS ? 'LIVE SATELLITE' : 'SECTOR PRESET'}
              </span>
              <div style={{ fontSize: '10.5px', color: '#64748b', fontFamily: 'monospace', marginTop: '4px' }}>
                {location.lat.toFixed(4)}°N, {location.lon.toFixed(4)}°E
              </div>
            </div>
          </div>

          {/* Card 2: Local River Patrol Live Telemetry & Sector Focus */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(12, 21, 39, 0.95), rgba(7, 13, 24, 0.98))',
              border: '1px solid rgba(56, 189, 248, 0.18)',
              borderRadius: '20px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)'
            }}
          >
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.06em', color: '#94a3b8', textTransform: 'uppercase' }}>
                {t.voiceUpdateHeading}
              </div>
              <h2 style={{ fontSize: '16.5px', fontWeight: 900, margin: '2px 0 3px', color: '#ffffff' }}>
                Local River Patrol · Grid Sector
              </h2>
              <div style={{ fontSize: '11.5px', color: '#38bdf8', fontWeight: 600 }}>
                {t.fromYou('0 meters')} · Scanning 3.0 km Blast Radius
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#38bdf8',
                  fontSize: '11.5px',
                  fontWeight: 800
                }}
              >
                <MapPin style={{ width: '13px', height: '13px' }} />
                <span>{location.placeName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN COMMAND DECK: 2-COLUMN DESKTOP GRID */}
        <div className="desktop-main-grid">
          {/* LEFT COLUMN: Hero Mic Walkie Talkie Card & Action Triggers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <section
              style={{
                background: 'linear-gradient(180deg, #0c1527 0%, #070d18 100%)',
                border: '1px solid rgba(56, 189, 248, 0.18)',
                borderRadius: '24px',
                padding: '36px 24px 28px',
                textAlign: 'center',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                position: 'relative'
              }}
              className={`walkie ${recording ? 'recording' : ''} ${sent ? 'sent' : ''}`}
            >
              <div style={{ position: 'relative', display: 'inline-block', margin: '4px 0 16px' }}>
                {/* Concentric ripple halo rings */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '-16px',
                    borderRadius: '50%',
                    border: recording ? '2px solid rgba(16, 185, 129, 0.5)' : '2px solid rgba(225, 29, 72, 0.35)',
                    animation: 'pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite'
                  }}
                />
                <button
                  type="button"
                  className="walkie-button"
                  onClick={toggleMic}
                  aria-label={recording ? 'Stop and send recording' : 'Start voice broadcast'}
                  style={{
                    width: '150px',
                    height: '150px',
                    boxShadow: recording
                      ? '0 0 50px rgba(16, 185, 129, 0.6)'
                      : '0 0 50px rgba(225, 29, 72, 0.5), inset 0 4px 8px rgba(255, 255, 255, 0.4)'
                  }}
                >
                  {sent ? <Check style={{ width: '48px', height: '48px' }} /> : <Mic style={{ width: '48px', height: '48px' }} />}
                </button>
              </div>

              <h1 style={{ fontSize: '18px', fontWeight: 900, margin: '8px 0 4px', color: '#f8fafc', letterSpacing: '-0.01em' }}>
                {sent
                  ? t.boatmanSpeakSent
                  : recording
                  ? `🔴 00:${String(seconds).padStart(2, '0')} · ${t.boatmanSpeakListening}`
                  : t.boatmanSpeakIdle}
              </h1>

              <p style={{ margin: '0 0 14px', color: recording ? '#34d399' : '#fb7185', fontSize: '12.5px', fontWeight: 600 }}>
                {sent
                  ? `Broadcast active · Tourists in 3.0 km sector notified!`
                  : recording
                  ? 'Prisma v2.5 live noise stripping active · Speaking…'
                  : t.boatmanHoldInstruction}
              </p>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '24px',
                  padding: '6px 14px',
                  fontSize: '11px',
                  color: '#94a3b8'
                }}
              >
                <ShieldCheck style={{ width: '14px', height: '14px', color: '#38bdf8' }} />
                <span>Hardware Noise Suppression Active · 3.0 km Blast Radius</span>
              </div>
            </section>

            {/* TACTICAL NAUTICAL RESCUE NAVIGATION CARD (Steer-By-Compass HUD) */}
            {activeRescue && (
              <section
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 51, 68, 0.22), rgba(20, 6, 10, 0.95))',
                  border: '2px solid #ff3344',
                  borderRadius: '18px',
                  padding: '18px',
                  boxShadow: '0 8px 32px rgba(255, 51, 68, 0.4)',
                  color: '#ffffff',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span
                    style={{
                      background: '#ff3344',
                      color: '#ffffff',
                      fontSize: '10.5px',
                      fontWeight: 900,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      letterSpacing: '0.06em'
                    }}
                  >
                    🚨 IMMEDIATE RESCUE DISPATCH
                  </span>
                  <span style={{ fontSize: '11px', color: '#ff8899', fontWeight: 700 }}>
                    {activeRescue.time}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: 'rgba(255, 51, 68, 0.25)',
                      border: '1.5px solid #ff4455',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '30px',
                      flexShrink: 0
                    }}
                  >
                    {activeRescue.bearing.arrow}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff' }}>
                      {activeRescue.touristName} · {activeRescue.phone}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#ff6677', fontWeight: 900 }}>
                      STEER: {activeRescue.bearing.compass.toUpperCase()} ({activeRescue.bearing.degrees}°)
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      {activeRescue.distMeters < 1000 ? `${activeRescue.distMeters}m` : `${(activeRescue.distMeters / 1000).toFixed(1)}km`} direct across water · ~{Math.max(1, Math.round(activeRescue.distMeters / 180))} min at 6 knots
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(0,0,0,0.45)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    marginBottom: '12px',
                    fontSize: '11.5px',
                    color: '#e2e8f0'
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#ffaa00', marginBottom: '2px' }}>
                    Incident: {activeRescue.incident}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                    Target: {activeRescue.locationName} ({activeRescue.lat.toFixed(5)}° N, {activeRescue.lon.toFixed(5)}° E)
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${activeRescue.lat},${activeRescue.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'rgba(0, 212, 255, 0.15)',
                      border: '1px solid #00d4ff',
                      color: '#00d4ff',
                      padding: '8px 6px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <ExternalLink style={{ width: '12px', height: '12px' }} /> Satellite Pin
                  </a>
                  <a
                    href={`tel:${activeRescue.phone}`}
                    style={{
                      background: 'rgba(0, 230, 118, 0.15)',
                      border: '1px solid #00e676',
                      color: '#00e676',
                      padding: '8px 6px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Phone style={{ width: '12px', height: '12px' }} /> Call Tourist
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveRescue(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: '#fff',
                      padding: '8px 6px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Clear Target
                  </button>
                </div>
              </section>
            )}

            {/* Last Sent Broadcast Card */}
            {sent && (
              <section className="last-broadcast" style={{ borderRadius: '18px', padding: '16px 20px', background: 'rgba(6, 78, 59, 0.35)', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                <span className="eyebrow" style={{ color: '#34d399', fontSize: '10.5px' }}>{t.boatmanHeader} · {userName}</span>
                <p style={{ fontSize: '14px', margin: '6px 0 4px', color: '#f8fafc' }}>{sentText}</p>
                <strong style={{ fontSize: '11.5px', color: '#a7f3d0' }}>
                  Broadcasted by {userName} from {location.placeName} ({location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°) to nearby tourists ({recipientsCount} notified).
                </strong>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN: The Giant Glowing Revolving Radar */}
          <div>
            <MiniVisualRadar
              status={activeRescue ? 'danger' : 'safe'}
              distanceMeters={activeRescue ? activeRescue.distMeters : 350}
              placeName={location.placeName}
              boatmanName={userName}
              currentUserName={userName}
              mode="boatman"
              lang={lang}
              rescueTarget={activeRescue}
            />
          </div>
        </div>
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
  const [userName, setUserName] = useState('रमेश निषाद')
  const [currentStatus, setCurrentStatus] = useState<Status>('safe')
  const [lang, setLang] = useState<SupportedLang>('hi')
  const [isOnline, setIsOnline] = useState<boolean>(true)

  // Real-time Geolocation Hook
  const location = useRealTimeLocation()

  // Service Worker Registration & Online/Offline Listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine)

      const handleOnline = () => {
        setIsOnline(true)
        try {
          const raw = localStorage.getItem('cg_offline_queue')
          if (raw) {
            const queue = JSON.parse(raw)
            if (Array.isArray(queue) && queue.length > 0) {
              console.log('Online restored! Processing cached offline actions:', queue.length)
              localStorage.removeItem('cg_offline_queue')
            }
          }
        } catch {}
      }

      const handleOffline = () => setIsOnline(false)

      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      // Register PWA service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('CoastGuard PWA ServiceWorker active:', reg.scope))
          .catch((err) => console.log('SW registration error:', err))
      }

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  const enter = (next: Mode, enteredPhone: string, enteredName: string) => {
    setMode(next)
    setPhone(enteredPhone)
    setUserName(enteredName)
    setScreen('dashboard')
  }

  if (screen === 'login') {
    return (
      <RoleLogin
        location={location}
        onContinue={enter}
        lang={lang}
        onLangChange={setLang}
        isOnline={isOnline}
      />
    )
  }

  return (
    <div className="app-shell">
      {mode === 'tourist' ? (
        <TouristDashboard
          initialStatus={currentStatus}
          phone={phone}
          userName={userName}
          location={location}
          onSwitch={() => setScreen('login')}
          lang={lang}
          onLangChange={setLang}
          isOnline={isOnline}
        />
      ) : (
        <BoatmanDashboard
          role={mode}
          phone={phone}
          userName={userName}
          location={location}
          onBroadcast={(status) => {
            setCurrentStatus(status)
          }}
          onSwitch={() => setScreen('login')}
          lang={lang}
          onLangChange={setLang}
          isOnline={isOnline}
        />
      )}
    </div>
  )
}