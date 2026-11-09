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
  Grid3X3,
  Home,
  MapPin,
  Mic,
  MicOff,
  Navigation,
  Pause,
  Phone,
  PhoneCall,
  PhoneOff,
  Play,
  Plus,
  Radio,
  Search,
  Share2,
  ShieldCheck,
  Siren,
  User,
  Video,
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
  { name: 'Live Device GPS (My Location)', lat: 0, lon: 0, isDevice: true, state: '' },
  { name: 'Assi Ghat, Varanasi (Ganga)', lat: 25.3176, lon: 83.0060, isDevice: false, state: 'Uttar Pradesh' },
  { name: 'Marina Beach, Chennai (Bay of Bengal)', lat: 13.0475, lon: 80.2824, isDevice: false, state: 'Tamil Nadu' },
  { name: 'Gateway of India, Mumbai (Arabian Sea)', lat: 18.9220, lon: 72.8347, isDevice: false, state: 'Maharashtra' },
  { name: 'Alleppey Backwaters, Kerala', lat: 9.4981, lon: 76.3388, isDevice: false, state: 'Kerala' },
  { name: 'Hooghly Ferry Ghat, Kolkata', lat: 22.5726, lon: 88.3639, isDevice: false, state: 'West Bengal' },
  { name: 'Har Ki Pauri, Haridwar', lat: 29.9457, lon: 78.1642, isDevice: false, state: 'Uttarakhand' }
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
// Maps an Indian state/region name (from reverse geocoding) to the closest
// supported app language. Falls back to English for anything unrecognized
// (e.g. GPS outside India, or address data without a clear state match).
function detectLangFromRegion(stateName: string, countryCode?: string): SupportedLang {
  if (countryCode && countryCode.toLowerCase() !== 'in') return 'en'
  const s = (stateName || '').toLowerCase()
  if (!s) return 'en'
  if (s.includes('maharashtra')) return 'mr'
  if (s.includes('tamil nadu')) return 'ta'
  if (s.includes('west bengal')) return 'bn'
  if (
    ['uttar pradesh', 'bihar', 'jharkhand', 'madhya pradesh', 'rajasthan', 'delhi', 'haryana', 'uttarakhand', 'chhattisgarh', 'himachal pradesh', 'punjab'].some((x) => s.includes(x))
  ) {
    return 'hi'
  }
  return 'en'
}

function useRealTimeLocation() {
  const [lat, setLat] = useState<number>(25.3176)
  const [lon, setLon] = useState<number>(83.0060)
  const [accuracy, setAccuracy] = useState<number>(8)
  const [placeName, setPlaceName] = useState<string>('Assi Ghat, Varanasi')
  const [isLiveGPS, setIsLiveGPS] = useState<boolean>(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [presetIndex, setPresetIndex] = useState<number>(1) // Default to Varanasi preset
  const [detectedLang, setDetectedLang] = useState<SupportedLang | null>(null)

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
        setDetectedLang(detectLangFromRegion(addr.state, addr.country_code))
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
      setDetectedLang(detectLangFromRegion(selected.state, 'in'))
    }
  }

  const setCustomLocation = (newLat: number, newLon: number, newPlaceName: string) => {
    setLat(newLat)
    setLon(newLon)
    setAccuracy(5)
    setPlaceName(newPlaceName)
    setIsLiveGPS(false)
    setDetectedLang(detectLangFromRegion(newPlaceName, 'in'))

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
    detectedLang,
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

  // REAL TARGET LOGIC: High-accuracy real GPS distance & proximity
  const hasTarget = !!rescueTarget
  const effectiveDist = hasTarget ? rescueTarget.distMeters : 0
  const isNear = hasTarget && effectiveDist <= 25

  const effectiveBearing = hasTarget
    ? (isNear ? { degrees: 45, compass: 'Immediate Proximity', arrow: '🎯' } : rescueTarget.bearing)
    : { degrees: 0, compass: 'North', arrow: '⬆️' }

  // Scale: 3000m sector perimeter -> 150px radius
  // If target is in immediate proximity (<= 25m), position the blip right adjacent to center boat (24px) for high-accuracy tactical display
  const targetRadius = isNear
    ? 24
    : (Math.min(3000, Math.max(30, effectiveDist)) / 3000) * (radarRadiusPx - 25) + 20

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
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
              {lang === 'hi' ? '3 किमी के आस-पास' : (lang === 'mr' ? '३ किमी आसपास' : 'Nearby 3 km')}
            </div>
            <div style={{ fontSize: '13px', color: '#a8b8ca', fontWeight: 500, marginTop: '1px' }}>
              {placeName}
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: '12.5px',
            fontWeight: 800,
            padding: '6px 14px',
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
          {hasTarget
            ? (lang === 'hi' ? 'बचाव जारी' : (lang === 'mr' ? 'बचाव सुरू' : 'Rescue in progress'))
            : (lang === 'hi' ? 'सब सुरक्षित' : (lang === 'mr' ? 'सर्व सुरक्षित' : 'All clear'))}
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
            <span style={{ fontSize: '26px' }}>{isNear ? '🎯' : effectiveBearing.arrow}</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#fca5a5', letterSpacing: '0.02em' }}>
                {isNear
                  ? (lang === 'mr' ? 'पर्यटक अगदी जवळ आहेत' : (lang === 'hi' ? 'पर्यटक आपके बिल्कुल पास हैं' : 'Tourist is right next to you'))
                  : (lang === 'hi' ? `दिशा: ${effectiveBearing.compass} (${effectiveBearing.degrees}°)` : (lang === 'mr' ? `दिशा: ${effectiveBearing.compass} (${effectiveBearing.degrees}°)` : `Head: ${effectiveBearing.compass} (${effectiveBearing.degrees}°)`))}
              </div>
              <div style={{ fontSize: '11px', color: '#f1f5f9', fontWeight: 600 }}>
                {isNear
                  ? (lang === 'mr' ? `${effectiveDist}m · बोटीच्या अगदी जवळ · तात्काळ मदत करा` : (lang === 'hi' ? `${effectiveDist}m · नाव के ठीक पास · वे आपके बहुत पास हैं` : `${effectiveDist}m · Right beside your boat · Immediate assistance needed`))
                  : `${effectiveDist < 1000 ? `${effectiveDist}m` : `${(effectiveDist / 1000).toFixed(1)}km`} direct across water · ~${Math.max(1, Math.round(effectiveDist / 180))} min at 6 knots`}
              </div>
            </div>
          </div>
          <span style={{ background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 900, padding: '5px 12px', borderRadius: '6px' }}>
            SOS
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
              {/* Pulsing Target Vector Line */}
              <line
                x1="190"
                y1="190"
                x2={targetX}
                y2={targetY}
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeDasharray="6 3"
              />

              {/* Pulsing Outer Beacon Rings */}
              <circle
                cx={targetX}
                cy={targetY}
                r="24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="1.5"
                opacity="0.8"
                style={{ animation: 'phoneHaloGlow 1.5s infinite ease-out' }}
              />
              <circle
                cx={targetX}
                cy={targetY}
                r="16"
                fill="rgba(239, 68, 68, 0.4)"
                filter="url(#targetRedGlow)"
              />

              {/* High-Contrast Target Radar Blip */}
              <circle cx={targetX} cy={targetY} r="9" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
              <circle cx={targetX} cy={targetY} r="3.5" fill="#ffffff" />

              {/* Tactical Callout Pill Badge on Radar */}
              <g>
                <rect
                  x={targetX - 60}
                  y={targetY - 30}
                  width="120"
                  height="20"
                  rx="6"
                  fill="rgba(153, 27, 27, 0.95)"
                  stroke="#ef4444"
                  strokeWidth="1"
                  filter="url(#radarNeonGlow)"
                />
                <text
                  x={targetX}
                  y={targetY - 16}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="900"
                  letterSpacing="0.02em"
                >
                  🚨 {rescueTarget.touristName}
                </text>
              </g>
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
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [showLocationModal, setShowLocationModal] = useState(false)

  return (
    <main className="login-page">
      <section className="login-card">
        {/* Top Utility Header: Status & Language Dropdown */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 800,
              padding: '6px 12px',
              borderRadius: '20px',
              background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.15)',
              color: isOnline ? '#34d399' : '#fbbf24',
              border: isOnline ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.35)',
              boxShadow: isOnline ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isOnline ? '#34d399' : '#fbbf24',
                boxShadow: isOnline ? '0 0 8px #34d399' : 'none'
              }}
            />
            <span>{isOnline ? (lang === 'hi' ? 'चालू है' : (lang === 'mr' ? 'सुरू आहे' : 'Online')) : t.offlineBadge}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Quick one-tap English switch (useful for tourists unfamiliar with the detected regional language) */}
            {lang !== 'en' && (
              <button
                type="button"
                onClick={() => onLangChange('en')}
                style={{
                  background: 'var(--blue-soft)',
                  border: '1px solid var(--blue-border)',
                  color: 'var(--blue)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                English
              </button>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.22)',
                padding: '6px 12px',
                borderRadius: '20px'
              }}
            >
              <Globe style={{ width: '15px', height: '15px', color: '#38bdf8' }} />
              <select
                value={lang}
                onChange={(e) => onLangChange(e.target.value as SupportedLang)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  color: '#38bdf8',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                aria-label="Choose Language"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} style={{ background: '#ffffff', color: '#0f172a' }}>
                    {l.native}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Central Brand Emblem */}
        <div className="brand-mark">
          <Waves />
        </div>

        {/* App Title */}
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span>CoastGuard <em>AI</em></span>
        </h1>

        <p className="login-intro">
          {lang === 'hi'
            ? 'नदी और तट पर आपकी सुरक्षा के लिए'
            : (lang === 'mr'
              ? 'नदी आणि किनाऱ्यावर तुमच्या सुरक्षेसाठी'
              : 'Keeping you safe on India’s rivers and coasts')}
        </p>

        {/* Role Selector Header */}
        <div style={{ margin: '16px 0 8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
            {lang === 'hi' ? 'आप कौन हैं?' : (lang === 'mr' ? 'तुम्ही कोण आहात?' : 'Who are you?')}
          </span>
        </div>

        {/* Interactive 3-Role Deck */}
        <div className="role-picker" role="radiogroup" aria-label="Choose your role">
          {/* Role 1: Boatman / Fisherman */}
          <button
            type="button"
            className={role === 'boatman' ? 'role-card active' : 'role-card'}
            onClick={() => setRole('boatman')}
            role="radio"
            aria-checked={role === 'boatman'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span>🎣</span>
              {role === 'boatman' && (
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10b981', display: 'grid', placeItems: 'center' }}>
                  <Check style={{ width: '12px', height: '12px', color: '#fff' }} />
                </div>
              )}
            </div>
            <strong>{t.boatmanRoleTitle}</strong>
          </button>

          {/* Role 2: Tourist / Citizen */}
          <button
            type="button"
            className={role === 'tourist' ? 'role-card active' : 'role-card'}
            onClick={() => setRole('tourist')}
            role="radio"
            aria-checked={role === 'tourist'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span>🎒</span>
              {role === 'tourist' && (
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10b981', display: 'grid', placeItems: 'center' }}>
                  <Check style={{ width: '12px', height: '12px', color: '#fff' }} />
                </div>
              )}
            </div>
            <strong>{t.touristRoleTitle}</strong>
          </button>

          {/* Role 3: Port Authority / NDRF Command */}
          <button
            type="button"
            className={role === 'authority' ? 'role-card active' : 'role-card'}
            onClick={() => setRole('authority')}
            role="radio"
            aria-checked={role === 'authority'}
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '14px',
              padding: '16px 16px',
              minHeight: '72px'
            }}
          >
            <span style={{ fontSize: '28px' }}>🏛️</span>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '16px', color: role === 'authority' ? '#047857' : '#0f172a' }}>
                  {t.authorityRoleTitle}
                </strong>
                {role === 'authority' && (
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10b981', display: 'grid', placeItems: 'center' }}>
                    <Check style={{ width: '12px', height: '12px', color: '#fff' }} />
                  </div>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Inputs Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
          {/* Name Input Field */}
          <div>
            <label className="login-label" htmlFor="name">
              <User style={{ width: '12px', height: '12px' }} />
              <span>{t.nameLabel}</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                role === 'boatman'
                  ? (lang === 'hi' ? 'उदा. रमेश निषाद' : (lang === 'mr' ? 'उदा. रमेश निषाद' : 'e.g. Ramesh Nishad'))
                  : (role === 'authority'
                    ? (lang === 'hi' ? 'उदा. राजेश वर्मा (NDRF)' : 'e.g. Insp. Rajesh Verma (NDRF)')
                    : (lang === 'hi' ? 'उदा. राहुल शर्मा' : (lang === 'mr' ? 'उदा. राहुल शर्मा' : 'e.g. Rahul Sharma')))
              }
            />
          </div>

          {/* Phone Input Field with +91 Prefix */}
          <div>
            <label className="login-label" htmlFor="phone">
              <Phone style={{ width: '12px', height: '12px' }} />
              <span>{t.phoneLabel}</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 800,
                  pointerEvents: 'none',
                  borderRight: '1px solid rgba(56, 189, 248, 0.25)',
                  paddingRight: '8px'
                }}
              >
                +91
              </span>
              <input
                id="phone"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                style={{ paddingLeft: '56px' }}
              />
            </div>
          </div>
        </div>

        {/* Offline Banner when network is unavailable */}
        {!isOnline && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '12px',
              padding: '10px 12px',
              margin: '12px 0 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#fcd34d',
              fontSize: '11px',
              fontWeight: 700
            }}
          >
            <Radio style={{ width: '15px', color: '#fbbf24', flexShrink: 0 }} />
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
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '12px 14px',
            margin: '14px 0 4px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink-secondary)' }}>
              📍 {t.locationLabel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: location.isLiveGPS ? 'var(--green-soft)' : 'var(--blue-soft)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                border: location.isLiveGPS ? '1px solid var(--green-border)' : '1px solid var(--blue-border)'
              }}
            >
              <MapPin style={{ width: '16px', height: '16px', color: location.isLiveGPS ? 'var(--green)' : 'var(--blue)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {location.placeName}
              </div>
            </div>
          </div>

          {/* Dual Action Buttons: Fetch Live GPS vs Choose Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => location.refreshGPS()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '12px 10px',
                minHeight: '48px',
                borderRadius: '10px',
                border: location.isLiveGPS ? '1.5px solid var(--green)' : '1px solid var(--line)',
                background: location.isLiveGPS ? 'var(--green-soft)' : '#ffffff',
                color: location.isLiveGPS ? 'var(--green-hover)' : 'var(--ink-secondary)',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Navigation style={{ width: '15px', height: '15px', color: 'var(--green)' }} />
              <span>{lang === 'hi' ? 'मेरा स्थान' : (lang === 'mr' ? 'माझे स्थान' : 'My Location')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '12px 10px',
                minHeight: '48px',
                borderRadius: '10px',
                border: !location.isLiveGPS ? '1.5px solid var(--blue)' : '1px solid var(--line)',
                background: !location.isLiveGPS ? 'var(--blue-soft)' : '#ffffff',
                color: !location.isLiveGPS ? 'var(--blue)' : 'var(--ink-secondary)',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Search style={{ width: '15px', height: '15px', color: 'var(--blue)' }} />
              <span>{lang === 'hi' ? 'खोजें' : (lang === 'mr' ? 'शोधा' : 'Search')}</span>
            </button>
          </div>
        </div>

        {/* Primary Continue Button */}
        <button
          type="button"
          className="continue-button"
          onClick={() => {
            const finalName = name.trim() || (role === 'authority' ? (lang === 'hi' ? 'राजेश वर्मा (NDRF कमान)' : 'Insp. Rajesh Verma (NDRF)') : (role === 'boatman' ? 'रमेश निषाद' : 'राहुल शर्मा'))
            onContinue(role, phone || '9876543210', finalName)
          }}
        >
          <span>{t.loginContinue}</span>
          <ChevronDown />
        </button>

        {/* Simple Trust Note */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '14px' }}>
          <ShieldCheck style={{ width: '14px', height: '14px', color: 'var(--green)' }} />
          <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 600 }}>
            {lang === 'hi' ? 'बिना इंटरनेट भी काम करता है' : (lang === 'mr' ? 'इंटरनेटशिवायही काम करते' : 'Works even without internet')}
          </span>
        </div>
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
  const isDark = false

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

        {/* Quick one-tap English switch (most useful for tourists) */}
        {mode === 'tourist' && lang !== 'en' && (
          <button
            type="button"
            onClick={() => onLangChange('en')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'var(--blue-soft)',
              border: '1px solid var(--blue-border)',
              color: 'var(--blue)',
              padding: '6px 10px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <Globe style={{ width: '13px', height: '13px' }} />
            English
          </button>
        )}

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
  userName = 'Rahul Sharma',
  lang = 'hi'
}: {
  close: () => void
  phone: string
  location: ReturnType<typeof useRealTimeLocation>
  userName?: string
  lang?: SupportedLang
}) {
  const t = UI_TRANSLATIONS[lang]
  const [dispatched, setDispatched] = useState(false)
  const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lon}`

  const sendSos = async (type: string) => {
    try {
      const fd = new FormData()
      fd.append('phone', phone)
      fd.append('tourist_name', userName)
      fd.append('incident_type', type)
      fd.append('lat', location.lat.toString())
      fd.append('lon', location.lon.toString())
      fd.append('location_name', location.placeName)
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
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [showDialpad, setShowDialpad] = useState(false)
  const [voiceHeard, setVoiceHeard] = useState<string>('')
  const [liveTime, setLiveTime] = useState<string>('22:20')
  const [isListening, setIsListening] = useState(false)
  const [listeningCountdown, setListeningCountdown] = useState<number>(20)

  const buzzerAudioRef = useRef<HTMLAudioElement | null>(null)
  const sirenCtxRef = useRef<AudioContext | null>(null)
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const ringTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)
  const timeout20sRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isListeningRef = useRef<boolean>(false)

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date()
        const hrs = String(now.getHours()).padStart(2, '0')
        const mins = String(now.getMinutes()).padStart(2, '0')
        setLiveTime(`${hrs}:${mins}`)
      } catch {}
    }
    updateTime()
    const tInterval = setInterval(updateTime, 30000)
    return () => clearInterval(tInterval)
  }, [])

  // Call timer during connected state (0:01, 0:02, 0:03...)
  useEffect(() => {
    if (callState === 'connected') {
      const durTimer = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
      return () => clearInterval(durTimer)
    }
  }, [callState])

  // Physical Keyboard Listener during connected call: Press 1 for Safe, Press 2 for SOS
  useEffect(() => {
    if (callState !== 'connected') return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
      if (e.key === '1') {
        e.preventDefault()
        handleSafe()
      } else if (e.key === '2') {
        e.preventDefault()
        handleStuck('keyboard_key_2_sos')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [callState])

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
    isListeningRef.current = false
    setIsListening(false)
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
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
      : (reason === 'unanswered_20s_timeout'
        ? 'Unanswered Tourist (20s Verbal Response Timeout Auto-Rescue)'
        : 'Tourist Unsafe / Needs Immediate Rescue'))
    fd.append('lat', (location?.lat || 25.3176).toString())
    fd.append('lon', (location?.lon || 83.0060).toString())
    fd.append('location_name', location?.placeName || placeName)
    fetch('/api/tourist/sos', { method: 'POST', body: fd }).catch(() => {})

    if (onSos) onSos()
    close()
  }

  const handleSafe = () => {
    isListeningRef.current = false
    setIsListening(false)
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
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
    isListeningRef.current = false
    setIsListening(false)
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    stopEmergencyAudio()
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current)
    if (timeout20sRef.current) clearTimeout(timeout20sRef.current)
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
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

  const startQuestionListening = () => {
    isListeningRef.current = true
    setIsListening(true)
    setListeningCountdown(20)

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    countdownIntervalRef.current = setInterval(() => {
      setListeningCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Wait exactly 20 seconds for tourist's answer AFTER question ends
    if (timeout20sRef.current) clearTimeout(timeout20sRef.current)
    const timeout20s = setTimeout(() => {
      console.log('[CoastGuard Triage] 20 seconds elapsed without answer -> Auto-triggering rescue!')
      handleStuck('unanswered_20s_timeout')
    }, 20000)
    timeout20sRef.current = timeout20s

    // Turn on speech recognition (Devanagari, Marathi, English, Tamil, Bengali)
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRec && !recognitionRef.current) {
      try {
        const rec = new SpeechRec()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = activeMsg.locale

        rec.onresult = (event: any) => {
          let transcript = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript + ' '
          }
          const rawT = transcript.toLowerCase().trim()
          setVoiceHeard(rawT)
          console.log('[CoastGuard Triage Voice]:', rawT)

          // Normalize punctuation for token match
          const cleanT = rawT.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ')

          // 1. Comprehensive affirmative safe detection:
          // Devanagari (Hindi / Marathi): हाँ, हां, हा, हॉं, हूँ, जी, जी हाँ, सुरक्षित, ठीक, सब ठीक, हो, होय, येस, सेफ, फाइन, ठीक आहे, बरं, अच्छा, नक्की, बरोबर, सही
          const devanagariSafe = /(?:हाँ|हां|हा|हॉं|हूँ|जी|सुरक्षित|ठीक|होय|हो|येस|सेफ|फाइन|ओके|बरं|अच्छा|नक्की|बरोबर|सही)/u.test(cleanT)

          // Bengali & Tamil affirmative: হ্যাঁ, নিরাপদ, ஆம், பாதுகாப், சரி
          const regionalSafe = /(?:হ্যাঁ|হ্যা|নিরাপদ|ঠিক|ভালো|ஆம்|பாதுகாப்|சரி)/u.test(cleanT)

          // Latin / English / Romanized Hindi/Marathi/Indic:
          // yes, yeah, yep, yup, ya, yah, ha, haa, haaa, haan, haaan, hnn, hn, hanji, haanji, safe, surakshit, theek, thik, thek, fine, ho, hoy, ji, ok, okay, achha, acha, sari, good, barobar, sahi
          const latinSafe = /\b(yes|yeah|yep|yup|ya|yah|ha|haa|haaa|haan|haaan|hnn|hn|hanji|haanji|safe|surakshit|theek|thik|thek|fine|ho|hoy|ji|ok|okay|achha|acha|sari|good|barobar|sahi)\b/i.test(cleanT) ||
            /safe|surakshit|theek|thik|all good|i am safe|im safe|me safe|main safe|hum safe|me surakshit|hum theek|theek hu|theek hoon|theek hun|theek aahe|theek ahe|safe hu|safe aahe|safe ahe|mai theek|me theek/i.test(cleanT)

          // 2. Comprehensive danger / help detection:
          // Strict boundaries so words like 'नाविक' or 'सामना' NEVER accidentally trigger danger!
          const devanagariDanger = /(?:मदद|सहायता|बचाओ|फंसा|फंसे|खतरा|अडकलो|संकट|त्राण|वाचवा|धोका)/u.test(cleanT) ||
            /(?:^|\s)(?:नहीं|नाही|ना)(?:\s|$)/u.test(cleanT)

          // Regional: সাহায্য, বিপদ, বাঁচাও, உதவி, ஆபத்து, இல்லை
          const regionalDanger = /(?:সাহায্য|বিপদ|বাঁচাও|உதவி|ஆபத்து|இல்லை)/u.test(cleanT)

          // Latin / Hinglish: help, no, nahi, nahin, madad, madat, stuck, fasa, fas, trapped, bachao, illai, danger, uthavi, sahajjo, adaklo, vachva, dhoka, save
          const latinDanger = /\b(help|no|nahi|nahin|madad|madat|stuck|fasa|fas|trapped|bachao|illai|danger|uthavi|sahajjo|adaklo|vachva|dhoka|save)\b/i.test(cleanT) ||
            /need help|save me|madad karo|bachao mujhe|fas gaye|stuck here/i.test(cleanT)

          if (devanagariSafe || regionalSafe || latinSafe) {
            handleSafe()
          } else if (devanagariDanger || regionalDanger || latinDanger) {
            handleStuck('voice_stuck_detected')
          }
        }
        rec.onend = () => {
          if (isListeningRef.current) {
            try { rec.start() } catch {}
          }
        }
        rec.onerror = () => {}
        rec.start()
        recognitionRef.current = rec
      } catch {}
    }
  }

  const startAdvisoryFlow = () => {
    setIsListening(false)
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      const audioUrl = `/audio/timbre_advisory_${lang}_danger.mp3`
      const audio = new Audio(audioUrl)
      audio.volume = 1.0
      audio.playbackRate = 1.05
      audio.preservesPitch = true
      audioRef.current = audio

      // Only start listening AFTER the automated voice finishes asking the question
      // This prevents the computer mic from hearing its own speakers!
      audio.onended = () => {
        startQuestionListening()
      }

      // Safety fallback: if audio fails or cannot finish, start listening with 20s timeout
      audio.onerror = () => {
        startQuestionListening()
      }

      audio.play().catch(() => {
        startQuestionListening()
      })
    } catch {
      startQuestionListening()
    }
  }

  const callTitle = lang === 'mr' ? 'आपत्कालीन' : (lang === 'hi' ? 'आपातकालीन' : (lang === 'ta' ? 'அவசர அழைப்பு' : (lang === 'bn' ? 'জরুরি কল' : 'Emergency')))
  const formattedDuration = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(2, 6, 18, 0.94)',
        backdropFilter: 'blur(28px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <style>{`
        @keyframes phoneHaloGlow {
          0% { transform: scale(0.95); opacity: 0.7; }
          50% { transform: scale(1.22); opacity: 0.15; }
          100% { transform: scale(0.95); opacity: 0.7; }
        }
        @keyframes subtleVibrate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
      `}</style>

      {/* Realistic Slim Smartphone Frame matching Image 4 */}
      <section
        style={{
          width: '100%',
          maxWidth: '316px',
          height: '610px',
          borderRadius: '44px',
          background: 'radial-gradient(circle at 50% 25%, #2a2538 0%, #161520 60%, #0d0c14 100%)',
          border: '8px solid #000000',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.9), 0 0 35px rgba(0, 0, 0, 0.6)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '14px 18px 26px',
          color: '#ffffff',
          boxSizing: 'border-box'
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Status Bar (Matching Image 4: Time on left, Signal + clean Battery icon on right - NO 97% text) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            fontWeight: 600,
            color: '#e2e8f0',
            padding: '2px 6px 0',
            letterSpacing: '0.02em'
          }}
        >
          <span>{liveTime}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Cellular Signal Bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '10px' }}>
              <span style={{ width: '2px', height: '3px', background: '#ffffff', borderRadius: '1px' }} />
              <span style={{ width: '2px', height: '5px', background: '#ffffff', borderRadius: '1px' }} />
              <span style={{ width: '2px', height: '7.5px', background: '#ffffff', borderRadius: '1px' }} />
              <span style={{ width: '2px', height: '10px', background: '#ffffff', borderRadius: '1px' }} />
            </div>
            {/* Clean Battery Glyph (No text percentage as requested) */}
            <div style={{ width: '20px', height: '10px', border: '1.5px solid #ffffff', borderRadius: '3px', padding: '1px', display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '80%', height: '100%', background: '#ffffff', borderRadius: '1px' }} />
            </div>
          </div>
        </div>

        {callState === 'ringing' ? (
          /* RINGING / INCOMING CALL (Image 4 Left Phone) */
          <>
            <div style={{ textAlign: 'center', marginTop: '48px' }}>
              {/* Circular Avatar */}
              <div
                style={{
                  position: 'relative',
                  width: '98px',
                  height: '98px',
                  margin: '0 auto 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: -12,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.12)',
                    animation: 'phoneHaloGlow 1.5s infinite ease-out'
                  }}
                />
                <div
                  style={{
                    width: '92px',
                    height: '92px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
                  }}
                >
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="#ffffff">
                    <circle cx="12" cy="7" r="4.5" />
                    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8v1H4v-1z" />
                  </svg>
                </div>
              </div>

              {/* Contact Name & Subtitle matching Image 4 left */}
              <h1
                style={{
                  fontSize: '26px',
                  fontWeight: 600,
                  margin: '0 0 6px',
                  color: '#ffffff',
                  letterSpacing: '-0.01em'
                }}
              >
                {callTitle}
              </h1>
              <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
                Mobile · River Patrol 112
              </div>
            </div>

            {/* Bottom Actions matching Image 4 left */}
            <div style={{ marginTop: 'auto', marginBottom: '8px' }}>
              {/* Small utility icons (Home & Share) */}
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 40px', marginBottom: '24px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </div>

              {/* Accept & Decline Round Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 16px' }}>
                {/* Accept Button (Left - Green) */}
                <button
                  type="button"
                  onClick={acceptCall}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(34, 197, 94, 0.45)',
                    transition: 'transform 0.15s ease'
                  }}
                  title="Answer"
                >
                  <PhoneCall
                    style={{
                      width: '28px',
                      height: '28px',
                      color: '#ffffff',
                      animation: 'subtleVibrate 1.2s infinite'
                    }}
                  />
                </button>

                {/* Decline Button (Right - Red) */}
                <button
                  type="button"
                  onClick={declineCall}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(239, 68, 68, 0.45)',
                    transition: 'transform 0.15s ease'
                  }}
                  title="Decline"
                >
                  <PhoneOff
                    style={{
                      width: '28px',
                      height: '28px',
                      color: '#ffffff'
                    }}
                  />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* CONNECTED / ACTIVE IN-CALL STATE (Image 4 Right Phone) */
          <>
            {/* Top Left Caller Header: Contact Name + Small Timer (0:01, 0:02...) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.16)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff">
                    <circle cx="12" cy="7" r="4.5" />
                    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8v1H4v-1z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', lineHeight: '1.2' }}>
                    {callTitle}
                  </div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400, marginTop: '3px' }}>
                    {formattedDuration}
                  </div>
                </div>
              </div>

              {isListening && (
                <div
                  style={{
                    background: 'rgba(34, 197, 94, 0.16)',
                    border: '1px solid rgba(34, 197, 94, 0.5)',
                    borderRadius: '16px',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#4ade80'
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#22c55e',
                      boxShadow: '0 0 8px #22c55e'
                    }}
                  />
                  <span>🎙️ {listeningCountdown}s</span>
                </div>
              )}
            </div>

            {/* In-Call Body: 6 Realistic Buttons or Dialpad if toggled */}
            {!showDialpad ? (
              /* 6-Button In-Call Dialer Grid matching Image 4 Right: Mute, Keypad, Speaker, Add call, Video, Contacts */
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  rowGap: '22px',
                  columnGap: '12px',
                  marginTop: '46px',
                  marginBottom: 'auto',
                  padding: '0 8px'
                }}
              >
                {/* Button 1: Mute */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: isMuted ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: isMuted ? '#0f172a' : '#ffffff'
                    }}
                    title="Mute"
                  >
                    {isMuted ? <MicOff style={{ width: '22px', height: '22px' }} /> : <Mic style={{ width: '22px', height: '22px' }} />}
                  </button>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                    {isMuted ? 'Muted' : 'Mute'}
                  </span>
                </div>

                {/* Button 2: Keypad */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowDialpad(true)}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#ffffff'
                    }}
                    title="Keypad"
                  >
                    <Grid3X3 style={{ width: '22px', height: '22px' }} />
                  </button>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Keypad</span>
                </div>

                {/* Button 3: Speaker (Active White) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: isSpeakerOn ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: isSpeakerOn ? '#0f172a' : '#ffffff',
                      boxShadow: isSpeakerOn ? '0 4px 16px rgba(255, 255, 255, 0.3)' : 'none'
                    }}
                    title="Speaker"
                  >
                    <Volume2 style={{ width: '22px', height: '22px' }} />
                  </button>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Speaker</span>
                </div>

                {/* Button 4: Add call (Matching Image 4 Right) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#ffffff'
                    }}
                    title="Add call"
                  >
                    <Plus style={{ width: '22px', height: '22px' }} />
                  </button>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Add call</span>
                </div>

                {/* Button 5: Video (Matching Image 4 Right) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#ffffff'
                    }}
                    title="Video"
                  >
                    <Video style={{ width: '22px', height: '22px' }} />
                  </button>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Video</span>
                </div>

                {/* Button 6: Contacts (Matching Image 4 Right) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#ffffff'
                    }}
                    title="Contacts"
                  >
                    <User style={{ width: '22px', height: '22px' }} />
                  </button>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Contacts</span>
                </div>
              </div>
            ) : (
              /* Authentic Interactive Phone Keypad (Press 1 for Safe, 2 for SOS) */
              <div style={{ marginTop: '18px', marginBottom: 'auto', padding: '0 8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleSafe}
                    style={{
                      height: '50px',
                      borderRadius: '25px',
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '1px solid #22c55e',
                      color: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '17px', fontWeight: 700 }}>1</span>
                    <span style={{ fontSize: '8px', color: '#86efac', fontWeight: 800 }}>सुरक्षित (SAFE)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStuck('keypad_sos_pressed')}
                    style={{
                      height: '50px',
                      borderRadius: '25px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid #ef4444',
                      color: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '17px', fontWeight: 700 }}>2</span>
                    <span style={{ fontSize: '8px', color: '#fca5a5', fontWeight: 800 }}>सहायता (SOS)</span>
                  </button>
                  <button
                    type="button"
                    style={{
                      height: '50px',
                      borderRadius: '25px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '17px', fontWeight: 600 }}>3</span>
                    <span style={{ fontSize: '8px', color: '#94a3b8' }}>DEF</span>
                  </button>
                  {[
                    { num: '4', sub: 'GHI' },
                    { num: '5', sub: 'JKL' },
                    { num: '6', sub: 'MNO' },
                    { num: '7', sub: 'PQRS' },
                    { num: '8', sub: 'TUV' },
                    { num: '9', sub: 'WXYZ' },
                    { num: '*', sub: '' },
                    { num: '0', sub: '+' },
                    { num: '#', sub: '' }
                  ].map((k) => (
                    <button
                      key={k.num}
                      type="button"
                      style={{
                        height: '50px',
                        borderRadius: '25px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontSize: '17px', fontWeight: 600 }}>{k.num}</span>
                      {k.sub && <span style={{ fontSize: '8px', color: '#94a3b8' }}>{k.sub}</span>}
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowDialpad(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '4px 8px'
                    }}
                  >
                    Hide Keypad
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Centered Red End-Call Button matching Image 4 right */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={handleSafe}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#dc2626',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(220, 38, 38, 0.5)'
                }}
                title="End Call"
              >
                <PhoneOff style={{ width: '28px', height: '28px', color: '#ffffff' }} />
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
      try {
        window.history.replaceState({}, '', window.location.pathname)
      } catch {}
      // Fresh start on page mount / refresh: session restarts cleanly in standby
      setShowCallModal(false)
      setCallAutoAccept(false)
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

  // Update localized text whenever language changes (do not overwrite active boatman broadcast)
  useEffect(() => {
    if (!hasActiveBroadcast) {
      if (status === 'safe') {
        setHindiQuote(t.quoteSafe.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, ''))
        setTranslation(t.advisorySafe)
        setWaterStatusText(t.safeStatusDesc(location.placeName))
      } else {
        setHindiQuote(t.quoteDanger.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, ''))
        setTranslation(t.advisoryDanger)
        setWaterStatusText(t.dangerStatusDesc(location.placeName))
      }
    }
  }, [lang, status, location.placeName, hasActiveBroadcast])

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
          if (data.has_broadcast && data.in_radius) {
            applySectorData(data)
            if (data.status === 'danger') {
              setStatus('danger')
            }
          } else {
            // Out of radius or no broadcast in this tourist's local sector: Keep safe
            setStatus('safe')
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
            let d = 0
            if (msg.data.lat && msg.data.lon) {
              d = calculateHaversineDistance(location.lat, location.lon, msg.data.lat, msg.data.lon)
            }
            // Strict 3.0 km sovereign maritime geofence:
            // A tourist must ONLY receive broadcasts from boatmen within their 3.0 km sector
            if (d > 3000) {
              console.log(`[CoastGuard Tourist] Ignored distant sector broadcast from ${(d / 1000).toFixed(1)} km away (> 3.0 km sector boundary).`)
              return
            }
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
  }, [location.lat, location.lon, phone, lang, isVerifiedSafe])

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
    if (data.hindi_quote) setHindiQuote(data.hindi_quote.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, ''))
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
              background: '#ffffff',
              border: '1px solid var(--line)',
              borderRadius: '20px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 24px -12px rgba(15, 23, 42, 0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'var(--blue-soft)',
                  border: '1.5px solid var(--blue-border)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px',
                  flexShrink: 0
                }}
              >
                🛡️
              </div>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 800, margin: '2px 0 3px', color: 'var(--ink)' }}>
                  {userName}
                </h2>
                <div style={{ fontSize: '13.5px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin style={{ width: '14px', height: '14px', color: 'var(--blue)' }} />
                  <span>{location.placeName}</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: 800,
                  color: 'var(--green-hover)',
                  background: 'var(--green-soft)',
                  border: '1px solid var(--green-border)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', animation: 'beaconPulse 1.8s infinite' }} />
                {lang === 'hi' ? 'सक्रिय' : (lang === 'mr' ? 'सक्रिय' : 'Active')}
              </span>
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
                ) : (status === 'safe' ? (
                  <ShieldCheck style={{ width: '28px', height: '28px', flexShrink: 0, color: '#ffffff' }} />
                ) : (
                  <AlertTriangle style={{ width: '28px', height: '28px', flexShrink: 0, color: '#ffffff' }} />
                ))}
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
                      ? `Water surge hazard was reported at ${outOfRangeNotice.location} (${outOfRangeNotice.distanceKm} km from you). You are outside the danger perimeter and completely safe.`
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

        {/* MAIN COMMAND DECK: 2-COLUMN DESKTOP GRID */}
        <div className="desktop-main-grid">
          {/* LEFT COLUMN: Local River Voice Update & Safety Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <section
              style={{
                background: '#ffffff',
                border: '1px solid var(--line)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 24px -12px rgba(15, 23, 42, 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: hasActiveBroadcast ? '14px' : '0' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'var(--blue-soft)',
                    border: '1px solid var(--blue-border)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--blue)'
                  }}
                >
                  <Radio style={{ width: '20px', height: '20px' }} />
                </div>
                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t.voiceUpdateHeading}
                  </span>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '2px 0 0', color: 'var(--ink)' }}>
                    {hasActiveBroadcast ? `${boatmanName} · ${t.fromYou(distanceText)}` : 'Live River Voice Grid · Standby'}
                  </h2>
                </div>
              </div>

              {hasActiveBroadcast ? (
                <>
                  <blockquote
                    style={{
                      background: 'var(--blue-soft)',
                      borderLeft: '4px solid var(--blue)',
                      padding: '12px 16px',
                      borderRadius: '0 14px 14px 0',
                      margin: '14px 0 10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      lineHeight: '1.5'
                    }}
                  >
                    &ldquo;{hindiQuote ? hindiQuote.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '') : t.quoteSafe.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')}&rdquo;
                  </blockquote>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px', lineHeight: '1.45' }}>
                    {translation}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Clean Voice (Noise Stripped) */}
                    <button
                      type="button"
                      onClick={toggleBoatmanAudio}
                      style={{
                        background: 'var(--green-soft)',
                        border: '1.5px solid var(--green-border)',
                        borderRadius: '14px',
                        padding: '12px 16px',
                        color: 'var(--ink)',
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
                        <strong style={{ fontSize: '13px', color: 'var(--green-hover)', display: 'block' }}>{t.listenCleanVoice}</strong>
                        <small style={{ fontSize: '10.5px', color: 'var(--muted)' }}>{t.listenCleanVoiceSub}</small>
                      </div>
                    </button>

                    {/* AI Synthesized Voice */}
                    <button
                      type="button"
                      onClick={toggleAiAudio}
                      style={{
                        background: 'var(--blue-soft)',
                        border: '1.5px solid var(--blue-border)',
                        borderRadius: '14px',
                        padding: '12px 16px',
                        color: 'var(--ink)',
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
                        <strong style={{ fontSize: '13px', color: 'var(--blue)', display: 'block' }}>
                          {t.listenAiAdvisory(LANGUAGES.find((l) => l.code === lang)?.label || 'Regional')}
                        </strong>
                        <small style={{ fontSize: '10.5px', color: 'var(--muted)' }}>{t.listenAiAdvisorySub}</small>
                      </div>
                    </button>

                    {/* Noise Canceller Comparison Link */}
                    {boatmanRawAudioUrl && (
                      <button
                        type="button"
                        onClick={toggleRawAudio}
                        style={{
                          background: 'var(--amber-soft)',
                          border: '1px solid var(--amber-border)',
                          borderRadius: '14px',
                          padding: '10px 14px',
                          color: 'var(--ink)',
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
                          <strong style={{ fontSize: '12px', color: 'var(--amber)', display: 'block' }}>{t.compareRawAudio}</strong>
                          <small style={{ fontSize: '10px', color: 'var(--muted)' }}>{t.compareRawAudioSub}</small>
                        </div>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px dashed var(--line-strong)',
                    borderRadius: '16px',
                    padding: '24px 18px',
                    marginTop: '14px',
                    textAlign: 'center'
                  }}
                >
                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 10px', lineHeight: '1.5' }}>
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
                      background: 'var(--green-soft)',
                      border: '1px solid var(--green-border)',
                      borderRadius: '20px',
                      padding: '4px 12px',
                      fontSize: '11px',
                      color: 'var(--green-hover)',
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

          {/* RIGHT COLUMN: Live River Safety Corridor & Station Telemetry (Clean, Modern, Intuitive) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <section
              style={{
                background: '#ffffff',
                border: '1px solid var(--line)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 24px -12px rgba(15, 23, 42, 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'var(--blue-soft)',
                      border: '1px solid var(--blue-border)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--blue)'
                    }}
                  >
                    <Compass style={{ width: '22px', height: '22px' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {lang === 'hi' ? 'लाइव घाट स्टेशन मॉनिटर' : (lang === 'mr' ? 'थेट घाट स्थान निरीक्षण' : 'Live Ghat Safety Corridor')}
                    </span>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '2px 0 0', color: 'var(--ink)' }}>
                      {location.placeName}
                    </h2>
                  </div>
                </div>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: status === 'safe' ? 'var(--green-soft)' : 'var(--red-soft)',
                    border: status === 'safe' ? '1px solid var(--green-border)' : '1px solid var(--red-border)',
                    color: status === 'safe' ? 'var(--green-hover)' : 'var(--red)',
                    borderRadius: '20px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: 800
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: status === 'safe' ? '#10b981' : '#ef4444', animation: 'beaconPulse 1.5s infinite' }} />
                  {status === 'safe' ? (lang === 'hi' ? 'जलधारा सुरक्षित' : (lang === 'mr' ? 'प्रवाह सुरक्षित' : 'Calm Waterway')) : (lang === 'hi' ? 'चेतावनी सक्रिय' : (lang === 'mr' ? 'धोका इशारा' : 'Surge Alert'))}
                </span>
              </div>

              {/* 4-Tile Live Telemetry Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px 16px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                    {lang === 'hi' ? 'आपका स्थान' : (lang === 'mr' ? 'तुमचे स्थान' : 'Your Location')}
                  </span>
                  <strong style={{ fontSize: '14.5px', color: 'var(--ink)' }}>
                    {location.lat.toFixed(4)}° N, {location.lon.toFixed(4)}° E
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px 16px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                    {lang === 'hi' ? 'निकटतम नाविक' : (lang === 'mr' ? 'जवळचा नाविक' : 'Nearest Boatman')}
                  </span>
                  <strong style={{ fontSize: '14.5px', color: 'var(--ink)' }}>
                    {boatmanName}
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px 16px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                    {lang === 'hi' ? 'नदी बहाव' : (lang === 'mr' ? 'नदी प्रवाह' : 'River Flow')}
                  </span>
                  <strong style={{ fontSize: '14.5px', color: status === 'safe' ? 'var(--green-hover)' : 'var(--red)' }}>
                    {status === 'safe'
                      ? (lang === 'hi' ? 'सामान्य' : (lang === 'mr' ? 'सामान्य' : 'Normal'))
                      : (lang === 'hi' ? 'तेज़ बहाव' : (lang === 'mr' ? 'वेगवान' : 'Fast / Risky'))}
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px 16px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                    {lang === 'hi' ? 'आपातकालीन नंबर' : (lang === 'mr' ? 'आपत्कालीन क्रमांक' : 'Emergency Number')}
                  </span>
                  <strong style={{ fontSize: '14.5px', color: 'var(--blue)' }}>
                    112
                  </strong>
                </div>
              </div>

              {/* Safety Protocol Directives */}
              <div style={{ background: 'var(--blue-soft)', border: '1px solid var(--blue-border)', borderRadius: '16px', padding: '14px 16px', marginBottom: '18px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  {lang === 'hi' ? 'नाविक व गश्ती दल सुरक्षा निर्देश' : (lang === 'mr' ? 'नाविक व गस्ती पथक सुरक्षा नियम' : 'Official Water Safety Directives')}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--ink-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck style={{ width: '15px', height: '15px', color: 'var(--green)', flexShrink: 0 }} />
                    <span>{lang === 'hi' ? 'नौका विहार करते समय लाइफ जैकेट अनिवार्य है।' : (lang === 'mr' ? 'नौकाविहाराच्या वेळी लाइफ जॅकेट अनिवार्य आहे.' : 'Life jackets mandatory for boating beyond the ghat steps.')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle style={{ width: '15px', height: '15px', color: 'var(--amber)', flexShrink: 0 }} />
                    <span>{lang === 'hi' ? 'नाविकों की सीटी अथवा ध्वनि चेतावनी पर तुरंत किनारे आएं।' : (lang === 'mr' ? 'नाविकांच्या शिट्टी किंवा ध्वनी इशाऱ्याकडे दुर्लक्ष करू नका.' : 'Follow whistle signals and vocal instructions from local boatmen.')}</span>
                  </div>
                </div>
              </div>

              {/* Quick Direct Help Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <a
                  href="tel:112"
                  style={{
                    background: 'var(--red-soft)',
                    border: '1.5px solid var(--red-border)',
                    borderRadius: '12px',
                    padding: '11px',
                    color: 'var(--red)',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Phone style={{ width: '15px', height: '15px' }} />
                  <span>{lang === 'hi' ? '112 आपातकालीन' : (lang === 'mr' ? '११२ आपत्कालीन' : 'Dial 112 Patrol')}</span>
                </a>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'var(--blue-soft)',
                    border: '1.5px solid var(--blue-border)',
                    borderRadius: '12px',
                    padding: '11px',
                    color: 'var(--blue)',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <MapPin style={{ width: '15px', height: '15px' }} />
                  <span>{lang === 'hi' ? 'उपग्रह मानचित्र' : (lang === 'mr' ? 'उपग्रह नकाशा' : 'Satellite Map')}</span>
                </a>
              </div>
            </section>
          </div>
        </div>

        {sos && <SosModal phone={phone} location={location} userName={userName} close={() => setSos(false)} lang={lang} />}

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
              fetch('/api/emergency/reset', { method: 'POST' }).catch(() => {})
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
  const liveTranscriptRef = useRef<string>('')
  const liveSpeechRecRef = useRef<any>(null)

  // Recording timer
  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [recording])

  // Voice navigation announcement repeating twice for boatman
  const speakNavGuidanceWithRepeat = (
    touristName: string,
    place: string,
    compassDirection: string,
    distanceM: number,
    targetLang: SupportedLang
  ) => {
    const audioUrl = `/api/boatman/alert-tts?name=${encodeURIComponent(touristName)}&location=${encodeURIComponent(place)}&direction=${encodeURIComponent(compassDirection)}&dist=${distanceM}&lang=${targetLang}`
    const alertAudio = new Audio(audioUrl)
    alertAudio.volume = 1.0
    alertAudio.playbackRate = 1.05

    let hasRepeated = false
    alertAudio.onended = () => {
      if (!hasRepeated) {
        hasRepeated = true
        // Repeat the announcement a 2nd time after a 1.2s natural pause (Requirement: repeat this 2 times)
        setTimeout(() => {
          const secondAudio = new Audio(audioUrl)
          secondAudio.volume = 1.0
          secondAudio.playbackRate = 1.05
          secondAudio.play().catch(() => {})
        }, 1200)
      }
    }

    // Fallback: browser SpeechSynthesis repeated twice
    alertAudio.onerror = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel()
          const dirHi = compassDirection === 'ahead' ? 'उत्तर-पूर्व (North-East)' : compassDirection
          const text = targetLang === 'hi'
            ? (distanceM > 25
                ? `सावधान! पर्यटक ${touristName} ${place} पर खतरे में हैं। ${dirHi} दिशा में ${distanceM} मीटर आगे बढ़ें।`
                : `सावधान! पर्यटक ${touristName} ${place} पर खतरे में हैं। वे आपके बिल्कुल समीप हैं, तुरंत सहायता करें!`)
            : (targetLang === 'mr'
                ? (distanceM > 25
                    ? `सावधान! पर्यटक ${touristName} ${place} येथे धोक्यात आहेत. ${dirHi} दिशेला ${distanceM} मीटर पुढे जा.`
                    : `सावधान! पर्यटक ${touristName} ${place} येथे धोक्यात आहेत. ते तुमच्या अगदी जवळ आहेत, तात्काळ मदत करा!`)
                : (targetLang === 'ta'
                    ? (distanceM > 25
                        ? `எச்சரிக்கை! சுற்றுலாப் பயணி ${touristName} ${place} பகுதியில் ஆபத்தில் உள்ளார். ${compassDirection} திசையில் ${distanceM} மீட்டர் செல்லுங்கள்.`
                        : `எச்சரிக்கை! சுற்றுலாப் பயணி ${touristName} ${place} பகுதியில் உங்களுக்கு மிக அருகில் உள்ளார், உடனடியாக உதவுங்கள்!`)
                    : (targetLang === 'bn'
                        ? (distanceM > 25
                            ? `সতর্কতা! পর্যটক ${touristName} ${place} ঘাটে বিপদে পড়েছেন। ${compassDirection} দিকে ${distanceM} মিটার এগিয়ে যান।`
                            : `সতর্কতা! পর্যটক ${touristName} ${place} ঘাটে আপনার খুব কাছেই আছেন, অবিলম্বে সাহায্য করুন!`)
                        : (distanceM > 25
                            ? `Alert! Tourist ${touristName} is in danger at ${place}. Head ${compassDirection}, ${distanceM} meters ahead.`
                            : `Alert! Tourist ${touristName} is in danger at ${place}. They are very near you, provide immediate help!`))))

          const utt1 = new SpeechSynthesisUtterance(text)
          utt1.lang = targetLang === 'hi' ? 'hi-IN' : (targetLang === 'mr' ? 'mr-IN' : 'en-IN')
          utt1.rate = 1.05
          utt1.onend = () => {
            setTimeout(() => {
              const utt2 = new SpeechSynthesisUtterance(text)
              utt2.lang = utt1.lang
              utt2.rate = 1.05
              window.speechSynthesis.speak(utt2)
            }, 1200)
          }
          window.speechSynthesis.speak(utt1)
        } catch {}
      }
    }

    alertAudio.play().catch(() => {
      alertAudio.onerror?.(new Event('error'))
    })
  }

  // Play tactical 2-second alert beep followed by voice announcement stating tourist name, location, and direction, repeated 2 times!
  const triggerBoatmanRescueAlert = (
    touristName: string,
    place: string,
    compassDirection: string,
    distanceM: number,
    targetLang: SupportedLang
  ) => {
    // 4.5s delay allows tourist dashboard voice ("Help is coming") to completely finish first, preventing overlapping audio on same laptop
    setTimeout(() => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          const ctx = new AudioCtx()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(880, ctx.currentTime)
          gain.gain.setValueAtTime(0.3, ctx.currentTime)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start()

          let isHigh = false
          const beepTimer = setInterval(() => {
            if (ctx.state === 'closed') return
            isHigh = !isHigh
            osc.frequency.setValueAtTime(isHigh ? 1180 : 880, ctx.currentTime)
            gain.gain.setValueAtTime(isHigh ? 0.35 : 0.05, ctx.currentTime)
          }, 200)

          // After exactly 2.0s of continuous emergency beeping, stop oscillator and play voice announcement
          setTimeout(() => {
            clearInterval(beepTimer)
            try {
              osc.stop()
              ctx.close()
            } catch {}

            speakNavGuidanceWithRepeat(touristName, place, compassDirection, distanceM, targetLang)
          }, 2000)
        }
      } catch {}
    }, 4500)
  }

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

            // STRICT 3.0 KM SOVEREIGN MARITIME GEOFENCE:
            // A boat patrol must ONLY respond to emergencies within their 3.0 km maritime sector.
            // Distant alerts (> 3.0 km, e.g. Swargate vs Nagpur, ~650 km away) MUST BE COMPLETELY IGNORED.
            if (d > 3000) {
              console.log(`[CoastGuard Boatman] Ignored distant SOS: ${sos.tourist_name} at ${sos.location} is ${(d / 1000).toFixed(1)} km away (> 3.0 km sector boundary).`)
              return
            }

            const b = calculateBearing(location.lat, location.lon, sos.lat, sos.lon)
            const tName = sos.tourist_name || 'Rahul Sharma'
            const tLoc = sos.location || location.placeName

            // High-accuracy real GPS distance
            const realDist = Math.max(0, Math.round(d))
            const isNear = realDist <= 25
            const effectiveBearing = isNear ? { degrees: 0, compass: 'Immediate Proximity', arrow: '🎯' } : b
            const tCompass = isNear ? 'Immediate Proximity' : (effectiveBearing?.compass || 'North-East')

            setActiveRescue({
              touristName: tName,
              phone: sos.phone || '9876543210',
              incident: sos.incident || 'Emergency SOS / Trapped near Water',
              lat: sos.lat,
              lon: sos.lon,
              distMeters: realDist,
              bearing: effectiveBearing,
              time: sos.time || new Date().toLocaleTimeString(),
              locationName: tLoc
            })
            // Sound delayed 2-second alert beep followed by voice announcement stating tourist name, location & direction repeated 2 times!
            triggerBoatmanRescueAlert(tName, tLoc, tCompass, realDist, lang)
          }
        } catch {}
      }
    } catch {}

    return () => {
      if (ws) ws.close()
    }
  }, [location.lat, location.lon, location.placeName, lang])

  // Clear active rescue if boatman moves or switches to another sector (> 3.0 km away)
  useEffect(() => {
    if (activeRescue) {
      const d = calculateHaversineDistance(location.lat, location.lon, activeRescue.lat, activeRescue.lon)
      if (d > 3000) {
        console.log(`[CoastGuard Boatman] Clearing active rescue: Boatman relocated ${(d / 1000).toFixed(1)} km away from active incident.`)
        setActiveRescue(null)
      }
    }
  }, [location.lat, location.lon, activeRescue])

  // Center Mic Toggle (Real MediaRecorder with Hardware Noise Suppression + Live In-Browser Speech Recognition)
  const toggleMic = async () => {
    if (recording) {
      // STOP recording & dispatch to backend
      setRecording(false)
      if (liveSpeechRecRef.current) {
        try { liveSpeechRecRef.current.stop() } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      } else {
        const spoken = liveTranscriptRef.current.trim() || undefined
        sendVoiceBroadcast(null, spoken)
      }
    } else {
      // START real browser mic recording with HARDWARE NOISE SUPPRESSION & ECHO CANCELLATION
      setSeconds(0)
      setSent(false)
      audioChunksRef.current = []
      liveTranscriptRef.current = ''

      // Start live speech recognition to capture boatman's exact spoken words
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRec) {
        try {
          const rec = new SpeechRec()
          rec.continuous = true
          rec.interimResults = true
          rec.lang = lang === 'mr' ? 'mr-IN' : (lang === 'hi' ? 'hi-IN' : (lang === 'ta' ? 'ta-IN' : (lang === 'bn' ? 'bn-IN' : 'en-IN')))
          rec.onresult = (ev: any) => {
            let tr = ''
            for (let i = ev.resultIndex; i < ev.results.length; i++) {
              tr += ev.results[i][0].transcript + ' '
            }
            const clean = tr.trim()
            if (clean) {
              liveTranscriptRef.current = clean
            }
          }
          rec.start()
          liveSpeechRecRef.current = rec
        } catch {}
      }

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
            if (liveSpeechRecRef.current) {
              try { liveSpeechRecRef.current.stop() } catch {}
            }
            const spoken = liveTranscriptRef.current.trim() || undefined
            await sendVoiceBroadcast(audioBlob, spoken)
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
        const rawQuote = state.hindi_quote || overrideText || t.boatmanSpeakSent
        const cleanQuote = rawQuote.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')
        setSentText(`“${cleanQuote}”`)
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
          {/* Card 1: Boatman / Authority Identity */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--line)',
              borderRadius: '20px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 24px -12px rgba(15, 23, 42, 0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: role === 'authority' ? 'var(--red-soft)' : 'var(--blue-soft)',
                  border: role === 'authority' ? '1.5px solid var(--red-border)' : '1.5px solid var(--blue-border)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px',
                  flexShrink: 0
                }}
              >
                {role === 'authority' ? '🏛️' : '🚢'}
              </div>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 800, margin: '2px 0 3px', color: 'var(--ink)', textTransform: 'capitalize' }}>
                  {userName || (role === 'authority' ? 'Insp. Rajesh Verma' : 'रमेश निषाद')}
                </h2>
                <div style={{ fontSize: '13.5px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin style={{ width: '14px', height: '14px', color: 'var(--blue)' }} />
                  <span>{location.placeName}</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: 800,
                  color: 'var(--green-hover)',
                  background: 'var(--green-soft)',
                  border: '1px solid var(--green-border)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', animation: 'beaconPulse 1.8s infinite' }} />
                {lang === 'hi' ? 'सक्रिय' : (lang === 'mr' ? 'सक्रिय' : 'Active')}
              </span>
            </div>
          </div>

          {/* Card 2: Local River Patrol Live Telemetry & Sector Focus */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--line)',
              borderRadius: '20px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 24px -12px rgba(15, 23, 42, 0.12)'
            }}
          >
            <div>
              <h2 style={{ fontSize: '16.5px', fontWeight: 800, margin: '2px 0 3px', color: 'var(--ink)' }}>
                {t.voiceUpdateHeading}
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
                {lang === 'hi' ? 'आपके आस-पास 3 किमी में' : (lang === 'mr' ? 'तुमच्या आसपास ३ किमीमध्ये' : 'Within 3 km of you')}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  background: 'var(--blue-soft)',
                  border: '1px solid var(--blue-border)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--blue)',
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

              <p style={{ margin: '0 0 14px', color: recording ? '#34d399' : '#fb7185', fontSize: '14px', fontWeight: 600 }}>
                {sent
                  ? (lang === 'hi' ? 'भेज दिया! आस-पास के सभी पर्यटकों को सूचना मिल गई।' : (lang === 'mr' ? 'पाठवले! जवळच्या सर्व पर्यटकांना सूचना मिळाली.' : 'Sent! Nearby tourists have been notified.'))
                  : recording
                  ? (lang === 'hi' ? 'सुन रहे हैं, शोर हटाया जा रहा है…' : (lang === 'mr' ? 'ऐकत आहे, आवाज साफ केला जात आहे…' : 'Listening, cleaning up the noise…'))
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
                  padding: '7px 16px',
                  fontSize: '12.5px',
                  color: '#cbd5e1'
                }}
              >
                <ShieldCheck style={{ width: '15px', height: '15px', color: '#38bdf8' }} />
                <span>{lang === 'hi' ? 'आस-पास के 3 किमी तक पहुँचेगा' : (lang === 'mr' ? 'जवळच्या ३ किमी पर्यंत पोहोचेल' : 'Reaches boats within 3 km')}</span>
              </div>
            </section>

            {/* TACTICAL NAUTICAL RESCUE NAVIGATION CARD (Steer-By-Compass HUD) */}
            {activeRescue && (
              <section
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.28) 0%, rgba(30, 10, 16, 0.95) 50%, rgba(10, 15, 29, 0.98) 100%)',
                  border: '2px solid #ef4444',
                  borderRadius: '22px',
                  padding: '20px 22px',
                  boxShadow: '0 12px 45px rgba(239, 68, 68, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Top Distress Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        background: '#ef4444',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 900,
                        padding: '4px 12px',
                        borderRadius: '20px',
                        letterSpacing: '0.06em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.5)'
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff', animation: 'beaconPulse 1.2s infinite' }} />
                      {lang === 'hi' ? '🚨 आपातकालीन बचाव' : (lang === 'mr' ? '🚨 आणीबाणी बचाव' : '🚨 Emergency Rescue')}
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#fca5a5', fontWeight: 800, background: 'rgba(0,0,0,0.3)', padding: '3px 10px', borderRadius: '12px' }}>
                    {activeRescue.time}
                  </span>
                </div>

                {/* Target & Compass Proximity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '62px',
                      height: '62px',
                      borderRadius: '16px',
                      background: 'rgba(239, 68, 68, 0.25)',
                      border: '2px solid #f87171',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      flexShrink: 0,
                      boxShadow: '0 8px 24px rgba(239, 68, 68, 0.35)'
                    }}
                  >
                    {activeRescue.distMeters <= 25 ? '🎯' : activeRescue.bearing.arrow}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '17px', fontWeight: 900, color: '#ffffff' }}>
                        {activeRescue.touristName}
                      </span>
                      <span style={{ fontSize: '11.5px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                        {activeRescue.phone}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#fca5a5', fontWeight: 900, marginTop: '2px' }}>
                      {activeRescue.distMeters <= 25
                        ? (lang === 'mr' ? '🎯 अचूक स्थान प्राप्त · पर्यटक अगदी जवळ/तुमच्याच ठिकाणी आहे' : (lang === 'hi' ? '🎯 सटीक स्थान प्राप्त · पर्यटक आपके समीप है' : '🎯 TARGET ACQUIRED · IN IMMEDIATE DOCK PROXIMITY'))
                        : `STEER: ${activeRescue.bearing.compass.toUpperCase()} (${activeRescue.bearing.degrees}°)`}
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#cbd5e1', marginTop: '1px' }}>
                      {activeRescue.distMeters <= 25
                        ? (lang === 'mr' ? '० मीटर · थेट संपर्क तयार (अचूक GPS सिंक ±1m)' : (lang === 'hi' ? '0 मीटर · संपर्क तैयार (सटीक GPS सिंक ±1m)' : '0m · Direct Contact Ready (Live GPS Lock ±1m)'))
                        : `${activeRescue.distMeters < 1000 ? `${activeRescue.distMeters}m` : `${(activeRescue.distMeters / 1000).toFixed(1)}km`} direct across water · ~${Math.max(1, Math.round(activeRescue.distMeters / 180))} min at 6 knots`}
                    </div>
                  </div>
                </div>

                {/* Incident & Sector Details Box */}
                <div
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    marginBottom: '14px',
                    fontSize: '11.5px',
                    color: '#e2e8f0'
                  }}
                >
                  <div style={{ fontWeight: 800, color: '#fca5a5', marginBottom: '3px' }}>
                    ⚠️ Incident: {activeRescue.incident}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Target: {activeRescue.locationName} ({activeRescue.lat.toFixed(5)}° N, {activeRescue.lon.toFixed(5)}° E)
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => speakNavGuidanceWithRepeat(
                      activeRescue.touristName,
                      activeRescue.locationName,
                      activeRescue.bearing?.compass || 'North-East',
                      activeRescue.distMeters,
                      lang
                    )}
                    style={{
                      background: 'rgba(245, 158, 11, 0.18)',
                      border: '1.5px solid #f59e0b',
                      color: '#fde68a',
                      padding: '10px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)'
                    }}
                    title="Replay Voice Guidance"
                  >
                    <Volume2 style={{ width: '13px', height: '13px' }} /> आवाज़ दोबारा
                  </button>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${activeRescue.lat},${activeRescue.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'rgba(56, 189, 248, 0.18)',
                      border: '1.5px solid #38bdf8',
                      color: '#7dd3fc',
                      padding: '10px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      boxShadow: '0 4px 14px rgba(56, 189, 248, 0.25)'
                    }}
                  >
                    <ExternalLink style={{ width: '13px', height: '13px' }} /> {lang === 'hi' ? 'नक्शा' : (lang === 'mr' ? 'नकाशा' : 'Map')}
                  </a>
                  <a
                    href={`tel:${activeRescue.phone}`}
                    style={{
                      background: 'rgba(34, 197, 94, 0.18)',
                      border: '1.5px solid #22c55e',
                      color: '#86efac',
                      padding: '10px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      boxShadow: '0 4px 14px rgba(34, 197, 94, 0.25)'
                    }}
                  >
                    <Phone style={{ width: '13px', height: '13px' }} /> {lang === 'hi' ? 'कॉल करें' : (lang === 'mr' ? 'कॉल करा' : 'Call')}
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveRescue(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#f1f5f9',
                      padding: '10px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {lang === 'hi' ? 'बंद करें' : (lang === 'mr' ? 'बंद करा' : 'Close')}
                  </button>
                </div>
              </section>
            )}

            {/* Last Sent Broadcast Card */}
            {sent && (
              <section className="last-broadcast" style={{ borderRadius: '18px', padding: '16px 20px', background: 'var(--green-soft)', border: '1px solid var(--green-border)' }}>
                <span className="eyebrow" style={{ color: 'var(--green-hover)', fontSize: '12.5px' }}>{userName}</span>
                <p style={{ fontSize: '15px', margin: '6px 0 4px', color: 'var(--ink)' }}>{sentText}</p>
                <strong style={{ fontSize: '13px', color: 'var(--green-hover)' }}>
                  {lang === 'hi'
                    ? `${recipientsCount} पर्यटकों को सूचना मिली`
                    : (lang === 'mr' ? `${recipientsCount} पर्यटकांना सूचना मिळाली` : `${recipientsCount} tourists notified`)}
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
  const userPickedLangRef = useRef(false)

  // Real-time Geolocation Hook
  const location = useRealTimeLocation()

  // Auto-set the UI language from the fetched location, unless the user has
  // already picked a language themselves (their choice always wins).
  useEffect(() => {
    if (location.detectedLang && !userPickedLangRef.current) {
      setLang(location.detectedLang)
    }
  }, [location.detectedLang])

  const changeLang = (l: SupportedLang) => {
    userPickedLangRef.current = true
    setLang(l)
  }

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
        onLangChange={changeLang}
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
          onLangChange={changeLang}
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
          onLangChange={changeLang}
          isOnline={isOnline}
        />
      )}
    </div>
  )
}