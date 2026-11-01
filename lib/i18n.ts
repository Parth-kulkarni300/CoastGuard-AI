/**
 * CoastGuard AI — Indic Multilingual Localization (i18n) Engine
 * Full UI and Voice Advisory Localization for:
 * - Hindi (hi)
 * - English (en)
 * - Tamil (ta)
 * - Bengali (bn)
 * - Marathi (mr)
 */

export type SupportedLang = 'hi' | 'en' | 'ta' | 'bn' | 'mr'

export interface LanguageOption {
  code: SupportedLang
  label: string
  native: string
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' }
]

export interface UiTranslations {
  // TopBar & Common
  locationLabel: string
  realGps: string
  presetWater: string
  switchRole: string
  chooseWaterOrGps: string

  // Login Screen
  eyebrow: string
  appTitle: string
  tagline: string
  nameLabel: string
  namePlaceholder: string
  phoneLabel: string
  boatmanRoleTitle: string
  boatmanRoleSub: string
  touristRoleTitle: string
  touristRoleSub: string
  loginContinue: string
  loginNote: string
  offlineBadge: string
  onlineBadge: string
  offlineNotice: string
  offlineQueueNotice: string
  pwaInstallBtn: string

  // Tourist Dashboard
  liveTrackedLocation: string
  safeStatusBanner: string
  dangerStatusBanner: string
  safeStatusDesc: (place: string) => string
  dangerStatusDesc: (place: string) => string

  // Sonar Radar
  radarTitle: string
  radarSafeBadge: string
  radarDangerBadge: string
  youGps: string
  yourBoat: string
  touristSector: string
  radarBearing: string
  radarDistance: string
  radarPerimeter: string
  radarFrequency: string

  // Boatman Voice Update
  voiceUpdateHeading: string
  fromYou: (dist: string) => string
  listenCleanVoice: string
  listenCleanVoiceSub: string
  listenAiAdvisory: (langName: string) => string
  listenAiAdvisorySub: string
  compareRawAudio: string
  compareRawAudioSub: string

  // Tourist SOS
  touristSosBtn: string
  touristSosSub: (lat: string, lon: string) => string
  sosModalTitle: string
  sosModalSubtitle: string
  sosOpenPin: string
  sosOption1: string
  sosOption2: string
  sosOption3: string
  sosCallPolice: string
  sosDispatched: string

  // Emergency Call Modal
  callIncomingBadge: string
  callConnectedBadge: string
  callTitle: string
  callSector: (place: string) => string
  callDangerNotice: (boatman: string) => string
  callDecline: string
  callAccept: string
  callActiveChannel: string
  callSpokenHeader: string
  callSendGps: string
  callEnd: string

  // Boatman Dashboard
  boatmanHeader: string
  boatmanGpsCoords: string
  boatmanSpeakIdle: string
  boatmanSpeakListening: string
  boatmanSpeakSent: string
  boatmanHoldInstruction: string
  reportCalm: string
  reportSurge: string
  reportHazard: string

  // Spoken Quotes & Translations
  quoteSafe: string
  quoteDanger: string
  advisorySafe: string
  advisoryDanger: string
}

export const UI_TRANSLATIONS: Record<SupportedLang, UiTranslations> = {
  hi: {
    locationLabel: 'स्थान',
    realGps: '🟢 वास्तविक GPS सक्रिय',
    presetWater: 'जलाशय प्रीसेट',
    switchRole: 'भूमिका बदलें',
    chooseWaterOrGps: 'जलाशय क्षेत्र या लाइव GPS चुनें:',
    eyebrow: 'संप्रभु जल सुरक्षा ग्रिड · GNANI AI',
    appTitle: 'CoastGuard AI',
    tagline: 'जल पर मौजूद नाविकों द्वारा संचालित रीयल-टाइम सुरक्षा ग्रिड।',
    nameLabel: 'आपका नाम दर्ज करें',
    namePlaceholder: 'उदा. रमेश निषाद / राहुल शर्मा',
    phoneLabel: 'मोबाइल नंबर दर्ज करें',
    boatmanRoleTitle: 'मैं एक नाविक / मछुआरा हूँ',
    boatmanRoleSub: 'नाविक (वॉइस लाइफलाइन)',
    touristRoleTitle: 'मैं एक पर्यटक / यात्री हूँ',
    touristRoleSub: 'पर्यटक (सुरक्षा केंद्र)',
    loginContinue: 'आगे बढ़ें / लॉगिन करें',
    loginNote: 'कोई पासवर्ड नहीं। कोई ओटीपी झंझट नहीं। आपका लाइव स्थान निजी रहता है।',
    offlineBadge: '⚡ ऑफलाइन (GPS सक्रिय)',
    onlineBadge: '🟢 ऑनलाइन ग्रिड',
    offlineNotice: 'इंटरनेट नहीं है — ऐप पूरी तरह ऑफलाइन (PWA) काम कर रहा है। सैटेलाइट GPS और स्थानीय सुरक्षा ग्रिड चालू है।',
    offlineQueueNotice: 'ऑडियो ऑफलाइन सुरक्षित किया गया। नेटवर्क मिलते ही स्वचालित रूप से सिंक होगा।',
    pwaInstallBtn: 'ऐप इंस्टॉल करें (PWA)',
    liveTrackedLocation: 'लाइव ट्रैक किया गया स्थान',
    safeStatusBanner: '🟢 सुरक्षित क्षेत्र — आपके स्थान पर सब सामान्य है',
    dangerStatusBanner: '🔴 आपातकालीन चेतावनी — पानी से तुरंत दूर रहें',
    safeStatusDesc: (place) => `${place} के स्थानीय नाविकों ने शांत जल की पुष्टि की है। नौका विहार की अनुमति है।`,
    dangerStatusDesc: (place) => `${place} पर नाविकों ने अचानक जलस्तर में तेज वृद्धि की सूचना दी है। कृपया तुरंत घाट की ऊपरी सीढ़ियों पर जाएं।`,
    radarTitle: 'लाइव सेक्टर रडार · 1.5 किमी दायरा',
    radarSafeBadge: '🟢 सभी क्षेत्र सुरक्षित',
    radarDangerBadge: '⚠️ सक्रिय आपातकाल',
    youGps: 'आप (GPS)',
    yourBoat: 'आपकी नाव',
    touristSector: 'पर्यटक क्षेत्र',
    radarBearing: 'दिशा',
    radarDistance: 'दूरी',
    radarPerimeter: 'दायरा',
    radarFrequency: 'आवृत्ति',
    voiceUpdateHeading: 'स्थानीय नाविक का नवीनतम वॉयस अपडेट',
    fromYou: (dist) => `आपसे ${dist}`,
    listenCleanVoice: 'साफ की गई आवाज सुनें',
    listenCleanVoiceSub: 'Prisma एकॉस्टिक शील्ड: बादलों की गड़गड़ाहट और इंजन शोर रहित',
    listenAiAdvisory: (l) => `AI सुरक्षा चेतावनी सुनें (${l})`,
    listenAiAdvisorySub: 'Gnani Timbre क्षेत्रीय प्रादेशिक आवाज',
    compareRawAudio: 'तुलना: मूल अशोधित माइक आवाज सुनें',
    compareRawAudioSub: 'पृष्ठभूमि गड़गड़ाहट और इंजन शोर के साथ सुनें',
    touristSosBtn: 'मुझे मदद चाहिए / आपातकालीन SOS',
    touristSosSub: (lat, lon) => `निकटतम नाव गश्ती दल को आपका लाइव GPS स्थान (${lat}, ${lon}) भेजता है`,
    sosModalTitle: 'प्रत्यक्ष संकट बीकन (DISTRESS BEACON)',
    sosModalSubtitle: 'निकटतम बचाव नौकाओं को उच्च-प्राथमिकता अलार्म भेजता है',
    sosOpenPin: 'लाइव पिन खोलें',
    sosOption1: 'कोई व्यक्ति पानी में गिर गया है (Someone fell in water)',
    sosOption2: 'नाव बह रही है / इंजन बंद हो गया है (Boat is drifting)',
    sosOption3: 'नाव पर चिकित्सा आपातकाल (Medical emergency)',
    sosCallPolice: 'नदी पुलिस को कॉल करें · 112',
    sosDispatched: 'आपातकालीन बीकन प्रेषित! गश्ती नाव आ रही है।',
    callIncomingBadge: '🚨 इनकमिंग स्वचालित आपातकालीन कॉल',
    callConnectedBadge: '🟢 कॉल कनेक्टेड · लाइव वॉइस ग्रिड',
    callTitle: 'CoastGuard आपातकालीन 112',
    callSector: (place) => `क्षेत्र: ${place}`,
    callDangerNotice: (boatman) => `⚠️ नाविक ${boatman} द्वारा खतरे की चेतावनी जारी की गई`,
    callDecline: 'अस्वीकार करें (Decline)',
    callAccept: 'कॉल उठाएं (Accept Call)',
    callActiveChannel: 'सक्रिय वॉइस चैनल · GNANI TIMBRE TTS',
    callSpokenHeader: 'आपके कान में बोली जा रही चेतावनी:',
    callSendGps: 'बचाव नाव को मेरा लाइव GPS पिन भेजें',
    callEnd: 'कॉल समाप्त करें (End Call)',
    boatmanHeader: 'नाविक वॉयस लाइफलाइन (Voice Lifeline)',
    boatmanGpsCoords: 'GPS निर्देशांक',
    boatmanSpeakIdle: 'बोलने के लिए दबाएं (TAP TO SPEAK)',
    boatmanSpeakListening: 'सुन रहे हैं... शोर निस्पंदन सक्रिय (Listening...)',
    boatmanSpeakSent: 'वॉइस अपडेट प्रसारित! (Voice update sent)',
    boatmanHoldInstruction: 'बटन दबाकर रखें और जल की स्थिति स्पष्ट रूप से बोलें',
    reportCalm: 'शांत जल रिपोर्ट करें (सब ठीक है)',
    reportSurge: 'जल बहाव वृद्धि की चेतावनी (बहाव तेज है)',
    reportHazard: 'नाव खराब / आपातकाल रिपोर्ट करें (नाव खराब)',
    quoteSafe: '“भैया! पानी बिल्कुल शांत है, अभी आराम से नौका विहार कर सकते हैं, कोई खतरा नहीं है।”',
    quoteDanger: '“भैया! बहाव बहुत तेज है, पानी बढ़ रहा है, जल्दी ऊपर आ जाओ सब!”',
    advisorySafe: 'तट रक्षक सूचना: जलस्तर सामान्य है और मौसम शांत है। नौका विहार सुरक्षित है।',
    advisoryDanger: 'सावधान! नाव चालकों ने नदी में अचानक बहाव की चेतावनी दी है। कृपया तुरंत घाट की ऊपरी सीढ़ियों पर जाएं।'
  },

  en: {
    locationLabel: 'Location',
    realGps: '🟢 Live Device GPS Active',
    presetWater: 'Water Preset',
    switchRole: 'Switch Role',
    chooseWaterOrGps: 'CHOOSE WATER SECTOR OR REAL GPS:',
    eyebrow: 'SOVEREIGN WATER SAFETY · GNANI AI',
    appTitle: 'CoastGuard AI',
    tagline: 'Real-time safety grid, powered by fishermen on the water.',
    nameLabel: 'Enter Your Name',
    namePlaceholder: 'e.g. Ramesh Nishad / Rahul Sharma',
    phoneLabel: 'Enter Mobile Number',
    boatmanRoleTitle: 'I am a Boatman / Fisherman',
    boatmanRoleSub: 'Boatman (Voice Lifeline)',
    touristRoleTitle: 'I am a Tourist / Customer',
    touristRoleSub: 'Tourist (Safety Hub)',
    loginContinue: 'Continue to Dashboard',
    loginNote: 'No password. No OTP hassle. Your live location stays private.',
    offlineBadge: '⚡ Offline (GPS Active)',
    onlineBadge: '🟢 Live Grid',
    offlineNotice: 'No Internet — CoastGuard AI is running fully offline via PWA cache. Satellite GPS and local audio are operational.',
    offlineQueueNotice: 'Emergency broadcast saved offline. Will auto-sync when network is restored.',
    pwaInstallBtn: 'Install App (PWA)',
    liveTrackedLocation: 'LIVE TRACKED LOCATION',
    safeStatusBanner: '🟢 SAFE TO ROAM — ALL CLEAR AT YOUR LOCATION',
    dangerStatusBanner: '🔴 DANGER ALERT — STAY AWAY FROM WATER',
    safeStatusDesc: (place) => `Local boatmen at ${place} report calm waters. Boating permitted until 5:30 PM.`,
    dangerStatusDesc: (place) => `Local boatmen at ${place} reported water level surge / hazard. Please move to upper steps.`,
    radarTitle: 'LIVE SECTOR RADAR · 1.5 KM PERIMETER',
    radarSafeBadge: '🟢 ALL SECTORS SAFE',
    radarDangerBadge: '⚠️ ACTIVE EMERGENCY',
    youGps: 'YOU (GPS)',
    yourBoat: 'YOUR BOAT',
    touristSector: 'TOURIST SECTOR',
    radarBearing: 'Bearing',
    radarDistance: 'Distance',
    radarPerimeter: 'Perimeter',
    radarFrequency: 'Frequency',
    voiceUpdateHeading: 'LATEST VOICE UPDATE BY LOCAL BOATMAN',
    fromYou: (dist) => `${dist} from you`,
    listenCleanVoice: 'Listen to Cleaned Voice',
    listenCleanVoiceSub: 'Prisma Acoustic Shield: Thunder & Engine Noise Stripped',
    listenAiAdvisory: (l) => `Listen to AI Safety Advisory (${l})`,
    listenAiAdvisorySub: 'Gnani Timbre Indic Spoken Regional Voice',
    compareRawAudio: 'Compare: Hear Raw Unfiltered Mic Audio',
    compareRawAudioSub: 'Listen with original background thunder/engine noise',
    touristSosBtn: 'I Need Help / Tourist SOS',
    touristSosSub: (lat, lon) => `Alerts nearest boat patrol with your live GPS location (${lat}, ${lon})`,
    sosModalTitle: 'Direct Distress Beacon',
    sosModalSubtitle: 'Sends high-priority alarm to nearby rescue boat patrol',
    sosOpenPin: 'Open Live Pin',
    sosOption1: 'Someone fell in water',
    sosOption2: 'Boat is drifting / engine stopped',
    sosOption3: 'Medical emergency on boat',
    sosCallPolice: 'Call River Patrol Police · 112',
    sosDispatched: 'Emergency beacon dispatched! Rescue patrol is en route.',
    callIncomingBadge: '🚨 INCOMING AUTOMATED EMERGENCY CALL',
    callConnectedBadge: '🟢 CALL CONNECTED · LIVE VOICE GRID',
    callTitle: 'CoastGuard Emergency 112',
    callSector: (place) => `Sector: ${place}`,
    callDangerNotice: (boatman) => `⚠️ Danger alert flagged by boatman ${boatman}`,
    callDecline: 'Decline',
    callAccept: 'Accept Call',
    callActiveChannel: 'DISPATCH CHANNEL ACTIVE · GNANI TIMBRE TTS',
    callSpokenHeader: 'AUDIO SPOKEN IN YOUR EAR:',
    callSendGps: 'Send My GPS Pin To Rescue Boat',
    callEnd: 'End Call',
    boatmanHeader: 'Voice Lifeline (नाविक वॉयस लाइफलाइन)',
    boatmanGpsCoords: 'GPS Coordinates',
    boatmanSpeakIdle: 'TAP TO SPEAK (बोलने के लिए दबाएं)',
    boatmanSpeakListening: 'Listening... Noise Filtering Active...',
    boatmanSpeakSent: 'Voice update sent! (प्रसारित)',
    boatmanHoldInstruction: 'Hold button and speak river condition clearly',
    reportCalm: 'Report Calm Waters (All Normal)',
    reportSurge: 'Report High Water Surge (Danger)',
    reportHazard: 'Boat Breakdown / Hazard (SOS)',
    quoteSafe: '“Water is completely calm, tourists can safely enjoy boat rides until evening.”',
    quoteDanger: '“Severe water current surging! Evacuate river banks immediately!”',
    advisorySafe: 'Coastal advisory: Water levels are normal and waters are calm. Boating permitted.',
    advisoryDanger: 'Emergency Warning! Local boatmen reported a sudden water surge. Please evacuate the river bank immediately.'
  },

  ta: {
    locationLabel: 'இடம்',
    realGps: '🟢 நேரலை GPS இயக்கத்தில் உள்ளது',
    presetWater: 'நீர் பகுதி',
    switchRole: 'பங்கை மாற்று',
    chooseWaterOrGps: 'நீர் பகுதி அல்லது நேரலை GPS தேர்ந்தெடுக்கவும்:',
    eyebrow: 'சுயசார்பு நீர் பாதுகாப்பு வலைப்பின்னல் · GNANI AI',
    appTitle: 'CoastGuard AI',
    tagline: 'நீரில் உள்ள படகோட்டிகளால் இயக்கப்படும் நேரலை பாதுகாப்பு கட்டமைப்பு.',
    nameLabel: 'உங்கள் பெயரை உள்ளிடவும்',
    namePlaceholder: 'எ.கா. ரமேஷ் நிஷாத் / செல்வம்',
    phoneLabel: 'மொபைல் எண்ணை உள்ளிடவும்',
    boatmanRoleTitle: 'நான் ஒரு படகோட்டி / மீனவர்',
    boatmanRoleSub: 'படகோட்டி (குரல் உயிர்நாடி)',
    touristRoleTitle: 'நான் ஒரு சுற்றுலாப் பயணி',
    touristRoleSub: 'சுற்றுலாப் பயணி (பாதுகாப்பு மையம்)',
    loginContinue: 'தொடரவும் / உள்நுழையவும்',
    loginNote: 'கடவுச்சொல் இல்லை. OTP தொந்தரவு இல்லை. உங்கள் இருப்பிடம் தனிப்பட்டது.',
    offlineBadge: '⚡ ஆஃப்லைன் (GPS தயார்)',
    onlineBadge: '🟢 நேரலை கிரிட்',
    offlineNotice: 'இணையம் இல்லை — PWA மூலம் ஆஃப்லைனில் செயல்படுகிறது. செயற்கைக்கோள் GPS மற்றும் ஆடியோ தயார்.',
    offlineQueueNotice: 'ஆடியோ ஆஃப்லைனில் சேமிக்கப்பட்டது. நெட்வொர்க் கிடைத்ததும் தானாக அனுப்பப்படும்.',
    pwaInstallBtn: 'செயலியை நிறுவு (PWA)',
    liveTrackedLocation: 'நேரலை கண்காணிக்கப்படும் இடம்',
    safeStatusBanner: '🟢 பாதுகாப்பானது — உங்கள் பகுதியில் ஆபத்து இல்லை',
    dangerStatusBanner: '🔴 எச்சரிக்கை — நீரிலிருந்து உடனடியாக விலகவும்',
    safeStatusDesc: (place) => `${place} படகோட்டிகள் நீர் அமைதியாக உள்ளதாக தெரிவித்துள்ளனர். மாலை வரை படகு சவாரி அனுமதிக்கப்படுகிறது.`,
    dangerStatusDesc: (place) => `${place} பகுதியில் திடீர் நீர்வரத்து அதிகரித்துள்ளது. உடனடியாக படிக்கட்டுகளில் ஏறி பாதுகாப்பான இடத்திற்கு செல்லவும்.`,
    radarTitle: 'நேரலை ரேடார் · 1.5 கிமீ சுற்றளவு',
    radarSafeBadge: '🟢 அனைத்து பகுதிகளும் பாதுகாப்பானது',
    radarDangerBadge: '⚠️ தீவிர அவசரநிலை',
    youGps: 'நீங்கள் (GPS)',
    yourBoat: 'உங்கள் படகு',
    touristSector: 'சுற்றுலா பகுதி',
    radarBearing: 'திசை',
    radarDistance: 'தூரம்',
    radarPerimeter: 'சுற்றளவு',
    radarFrequency: 'அதிர்வெண்',
    voiceUpdateHeading: 'உள்ளூர் படகோட்டியின் சமீபத்திய குரல் தகவல்',
    fromYou: (dist) => `உங்களிடமிருந்து ${dist}`,
    listenCleanVoice: 'தெளிவான குரலைக் கேட்கவும்',
    listenCleanVoiceSub: 'Prisma Acoustic Shield: இடி மற்றும் எஞ்சின் இரைச்சல் நீக்கப்பட்டது',
    listenAiAdvisory: (l) => `AI பாதுகாப்பு ஆலோசனையைக் கேட்கவும் (${l})`,
    listenAiAdvisorySub: 'Gnani Timbre பிராந்திய தமிழ் குரல்',
    compareRawAudio: 'ஒப்பீடு: அசல் மைக் ஆடியோவை கேட்கவும்',
    compareRawAudioSub: 'இடி மற்றும் படகு எஞ்சின் இரைச்சலுடன் கேட்கவும்',
    touristSosBtn: 'எனக்கு உதவி தேவை / அவசர SOS',
    touristSosSub: (lat, lon) => `உங்கள் நேரலை GPS இருப்பிடத்தை (${lat}, ${lon}) அருகிலுள்ள ரோந்து படகுக்கு அனுப்புகிறது`,
    sosModalTitle: 'நேரடி அவசர உதவி சிக்னல்',
    sosModalSubtitle: 'அருகிலுள்ள மீட்புப் படகுகளுக்கு அவசர எச்சரிக்கையை அனுப்புகிறது',
    sosOpenPin: 'நேரலை பின்னைத் திறக்கவும்',
    sosOption1: 'யாரோ தண்ணீரில் விழுந்துவிட்டனர்',
    sosOption2: 'படகு அடித்துச் செல்லப்படுகிறது / எஞ்சின் நின்றது',
    sosOption3: 'படகில் மருத்துவ அவசரநிலை',
    sosCallPolice: 'காவல்துறையை அழைக்கவும் · 112',
    sosDispatched: 'அவசர எச்சரிக்கை அனுப்பப்பட்டது! மீட்புப் படகு வருகிறது.',
    callIncomingBadge: '🚨 அவசர அழைப்பு வருகிறது (AUTOMATED CALL)',
    callConnectedBadge: '🟢 அழைப்பு இணைக்கப்பட்டது · நேரலை குரல்',
    callTitle: 'CoastGuard அவசர எண் 112',
    callSector: (place) => `பகுதி: ${place}`,
    callDangerNotice: (boatman) => `⚠️ படகோட்டி ${boatman} ஆபத்து எச்சரிக்கை விடுத்துள்ளார்`,
    callDecline: 'நிராகரி (Decline)',
    callAccept: 'அழைப்பை ஏற்கவும் (Accept)',
    callActiveChannel: 'குரல் இணைப்பு செயலில் உள்ளது · GNANI TIMBRE',
    callSpokenHeader: 'உங்கள் காதில் பேசப்படும் எச்சரிக்கை:',
    callSendGps: 'மீட்புப் படகுக்கு என் GPS இருப்பிடத்தை அனுப்பு',
    callEnd: 'அழைப்பை முடிக்கவும் (End Call)',
    boatmanHeader: 'படகோட்டி குரல் உயிர்நாடி (Voice Lifeline)',
    boatmanGpsCoords: 'GPS ஆயத்தொலைவுகள்',
    boatmanSpeakIdle: 'பேச அழுத்தவும் (TAP TO SPEAK)',
    boatmanSpeakListening: 'கேட்கிறது... இரைச்சல் நீக்கம் செயலில் உள்ளது...',
    boatmanSpeakSent: 'குரல் தகவல் அனுப்பப்பட்டது! (Sent)',
    boatmanHoldInstruction: 'பொத்தானை அழுத்திப் பிடித்து நிலவரத்தை தெளிவாகப் பேசுங்கள்',
    reportCalm: 'அமைதியான நீர் நிலவரம் (Calm)',
    reportSurge: 'திடீர் நீர்வரத்து எச்சரிக்கை (Danger)',
    reportHazard: 'படகு பழுது / ஆபத்து (SOS)',
    quoteSafe: '“தண்ணீர் முற்றிலும் அமைதியாக உள்ளது, மாலை வரை படகு சவாரி செய்யலாம்.”',
    quoteDanger: '“திடீரென வெள்ளம் பெருக்கெடுத்து ஓடுகிறது, உடனடியாக அனைவரும் கரையேறுங்கள்!”',
    advisorySafe: 'கடலோர தகவல்: நீர்மட்டம் சாதாரணமாக உள்ளது. படகு சவாரி பாதுகாப்பானது.',
    advisoryDanger: 'எச்சரிக்கை! படகோட்டிகள் திடீர் நீர்வரத்து குறித்து எச்சரித்துள்ளனர். உடனடியாக படிக்கட்டுகளில் ஏறி பாதுகாப்பான இடத்திற்கு செல்லுங்கள்.'
  },

  bn: {
    locationLabel: 'অবস্থান',
    realGps: '🟢 লাইভ ডিভাইস GPS সক্রিয়',
    presetWater: 'জলাশয় প্রিসেট',
    switchRole: 'ভূমিকা পরিবর্তন',
    chooseWaterOrGps: 'জলাশয় এলাকা বা লাইভ GPS বেছে নিন:',
    eyebrow: 'সার্বভৌম জল নিরাপত্তা গ্রিড · GNANI AI',
    appTitle: 'CoastGuard AI',
    tagline: 'জলে থাকা মাঝিদের দ্বারা চালিত রিয়েল-টাইম নিরাপত্তা ব্যবস্থা।',
    nameLabel: 'আপনার নাম লিখুন',
    namePlaceholder: 'যেমন: রমেশ নিষাদ / রাহুল সেন',
    phoneLabel: 'মোবাইল নম্বর লিখুন',
    boatmanRoleTitle: 'আমি একজন মাঝি / জেলে',
    boatmanRoleSub: 'মাঝি (ভয়েস লাইফলাইন)',
    touristRoleTitle: 'আমি একজন পর্যটক / যাত্রী',
    touristRoleSub: 'পর্যটক (সুরক্ষা কেন্দ্র)',
    loginContinue: 'এগিয়ে যান / লগইন করুন',
    loginNote: 'কোনো পাসওয়ার্ড নেই। কোনো ওটিপি ঝামেলা নেই। আপনার অবস্থান নিরাপদ থাকে।',
    offlineBadge: '⚡ অফলাইন (GPS সক্রিয়)',
    onlineBadge: '🟢 লাইভ গ্রিড',
    offlineNotice: 'ইন্টারনেট সংযোগ নেই — অ্যাপ অফলাইনে (PWA) সক্রিয়। স্যাটেলাইট GPS ও স্থানীয় অডিও কার্যকর।',
    offlineQueueNotice: 'অডিও অফলাইনে সংরক্ষিত। নেটওয়ার্ক ফিরলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।',
    pwaInstallBtn: 'অ্যাপ ইনস্টল করুন (PWA)',
    liveTrackedLocation: 'লাইভ ট্র্যাক করা অবস্থান',
    safeStatusBanner: '🟢 নিরাপদ এলাকা — আপনার অবস্থানে কোনো বিপত্তি নেই',
    dangerStatusBanner: '🔴 বিপদ সতর্কতা — জল থেকে অবিলম্বে দূরে থাকুন',
    safeStatusDesc: (place) => `${place}-এর স্থানীয় মাঝিরা শান্ত জলের খবর দিয়েছেন। বিকেল পর্যন্ত নৌকাবিহার অনুমোদিত।`,
    dangerStatusDesc: (place) => `${place}-এ মাঝিরা নদীতে দ্রুত জলবৃদ্ধির সতর্কতা জারি করেছে। অবিলম্বে ঘাটের ওপরের সিঁড়িতে উঠে যান।`,
    radarTitle: 'লাইভ সোনার রাডার · ১.৫ কিমি পরিধি',
    radarSafeBadge: '🟢 সকল এলাকা নিরাপদ',
    radarDangerBadge: '⚠️ সক্রিয় জরুরি অবস্থা',
    youGps: 'আপনি (GPS)',
    yourBoat: 'আপনার নৌকা',
    touristSector: 'পর্যটক এলাকা',
    radarBearing: 'দিক',
    radarDistance: 'দূরত্ব',
    radarPerimeter: 'পরিধি',
    radarFrequency: 'ফ্রিকোয়েন্সি',
    voiceUpdateHeading: 'স্থানীয় মাঝির সাম্প্রতিক ভয়েস আপডেট',
    fromYou: (dist) => `আপনার থেকে ${dist}`,
    listenCleanVoice: 'পরিষ্কার কণ্ঠ শুনুন',
    listenCleanVoiceSub: 'Prisma Acoustic Shield: মেঘের গর্জন ও ইঞ্জিনের আওয়াজ মুক্ত',
    listenAiAdvisory: (l) => `AI নিরাপত্তা বার্তা শুনুন (${l})`,
    listenAiAdvisorySub: 'Gnani Timbre আঞ্চলিক বাংলা কণ্ঠ',
    compareRawAudio: 'তুলনা: আসল মাইক অডিও শুনুন',
    compareRawAudioSub: 'মেঘের গর্জন ও ইঞ্জিন নয়েজ সহ শুনুন',
    touristSosBtn: 'সাহায্য প্রয়োজন / জরুরি SOS',
    touristSosSub: (lat, lon) => `নিকটবর্তী টহল নৌকায় আপনার লাইভ GPS অবস্থান (${lat}, ${lon}) পাঠায়`,
    sosModalTitle: 'সরাসরি জরুরি সংকেত (DISTRESS BEACON)',
    sosModalSubtitle: 'নিকটবর্তী উদ্ধারকারী নৌকায় উচ্চ-অগ্রাধিকার অ্যালার্ম পাঠায়',
    sosOpenPin: 'লাইভ পিন খুলুন',
    sosOption1: 'কেউ জলে পড়ে গেছে (Fell in water)',
    sosOption2: 'নৌকা ভেসে যাচ্ছে / ইঞ্জিন বন্ধ (Drifting)',
    sosOption3: 'নৌকায় জরুরি চিকিৎসা (Medical emergency)',
    sosCallPolice: 'নদী পুলিশকে কল করুন · ১১২',
    sosDispatched: 'জরুরি সংকেত পাঠানো হয়েছে! উদ্ধারকারী নৌকা আসছে।',
    callIncomingBadge: '🚨 স্বয়ংক্রিয় জরুরি কল আসছে',
    callConnectedBadge: '🟢 কল সংযুক্ত · লাইভ ভয়েস গ্রিড',
    callTitle: 'CoastGuard জরুরি ১১২',
    callSector: (place) => `এলাকা: ${place}`,
    callDangerNotice: (boatman) => `⚠️ মাঝি ${boatman} বিপদ সংকেত জারি করেছেন`,
    callDecline: 'প্রত্যাখ্যান করুন (Decline)',
    callAccept: 'কল গ্রহণ করুন (Accept)',
    callActiveChannel: 'সক্রিয় ভয়েস চ্যানেল · GNANI TIMBRE TTS',
    callSpokenHeader: 'কানে শোনা বার্তা:',
    callSendGps: 'উদ্ধারকারী নৌকায় লাইভ GPS পাঠান',
    callEnd: 'কল শেষ করুন (End Call)',
    boatmanHeader: 'মাঝি ভয়েস লাইফলাইন (Voice Lifeline)',
    boatmanGpsCoords: 'GPS স্থানাঙ্ক',
    boatmanSpeakIdle: 'কথা বলতে চাপুন (TAP TO SPEAK)',
    boatmanSpeakListening: 'শুনছি... নয়েজ ফিল্টারিং সক্রিয়...',
    boatmanSpeakSent: 'ভয়েস আপডেট সম্প্রচারিত! (Sent)',
    boatmanHoldInstruction: 'বোতাম চেপে ধরে নদীর অবস্থা স্পষ্টভাবে বলুন',
    reportCalm: 'শান্ত জলের রিপোর্ট (সব ঠিক আছে)',
    reportSurge: 'জলবৃদ্ধির সতর্কতা (বিপদ)',
    reportHazard: 'নৌকা বিকল / দুর্ঘটনা (SOS)',
    quoteSafe: '“নদীর জল সম্পূর্ণ শান্ত, বিকেল পর্যন্ত নিরাপদে নৌকাবিহার করা যাবে।”',
    quoteDanger: '“জল খুব দ্রুত বাড়ছে, স্রোত তীব্র, সবাই দ্রুত ওপরে উঠে আসুন!”',
    advisorySafe: 'উপকূলীয় তথ্য: নদীর জল স্বাভাবিক এবং আবহাওয়া শান্ত রয়েছে। নৌকাবিহার নিরাপদ।',
    advisoryDanger: 'সতর্কতা! মাঝিরা নদীতে দ্রুত জলবৃদ্ধির সতর্কতা জারি করেছে। অবিলম্বে ঘাটের ওপরের সিঁড়িতে উঠে যান।'
  },

  mr: {
    locationLabel: 'स्थान',
    realGps: '🟢 थेट GPS सक्रिय',
    presetWater: 'जलाशय प्रीसेट',
    switchRole: 'भूमिका बदला',
    chooseWaterOrGps: 'जलाशय क्षेत्र किंवा थेट GPS निवडा:',
    eyebrow: 'सार्वभौम जल सुरक्षा ग्रिड · GNANI AI',
    appTitle: 'CoastGuard AI',
    tagline: 'पाण्यावर उपस्थित असलेल्या नाविक बांधवांद्वारे संचालित थेट सुरक्षा प्रणाली.',
    nameLabel: 'तुमचे नाव प्रविष्ट करा',
    namePlaceholder: 'उदा. रमेश निषाद / राहुल पाटील',
    phoneLabel: 'मोबाईल क्रमांक प्रविष्ट करा',
    boatmanRoleTitle: 'मी एक नाविक / मच्छीमार आहे',
    boatmanRoleSub: 'नाविक (व्हॉइस लाइफलाइन)',
    touristRoleTitle: 'मी एक पर्यटक / प्रवासी आहे',
    touristRoleSub: 'पर्यटक (सुरक्षा केंद्र)',
    loginContinue: 'पुढे जा / लॉगिन करा',
    loginNote: 'पासवर्ड नाही. OTP चा त्रास नाही. तुमचे स्थान पूर्णपणे सुरक्षित राहते.',
    offlineBadge: '⚡ ऑफलाइन (GPS सक्रिय)',
    onlineBadge: '🟢 थेट ग्रिड',
    offlineNotice: 'इंटरनेट उपलब्ध नाही — अॅप पूर्णपणे ऑफलाइन (PWA) कार्यरत आहे. सॅटेलाइट GPS आणि ऑडिओ लाइफलाइन सक्रिय.',
    offlineQueueNotice: 'व्हॉइस अपडेट ऑफलाइन जतन केले. नेटवर्क येताच आपोआप पाठवले जाईल.',
    pwaInstallBtn: 'अॅप इन्स्टॉल करा (PWA)',
    liveTrackedLocation: 'थेट ट्रॅक केलेले स्थान',
    safeStatusBanner: '🟢 सुरक्षित क्षेत्र — तुमच्या भागात धोका नाही',
    dangerStatusBanner: '🔴 धोक्याचा इशारा — पाण्यापासून लगेच दूर व्हा',
    safeStatusDesc: (place) => `${place} येथील स्थानिक नाविकांनी शांत पाण्याची पुष्टी केली आहे. संध्याकाळपर्यंत बोटिंग सुरक्षित आहे.`,
    dangerStatusDesc: (place) => `${place} येथे पाण्याच्या प्रवाहात अचानक वाढ झाली आहे. कृपया घाटाच्या वरच्या पायऱ्यांवर जावे.`,
    radarTitle: 'थेट रडार नकाशा · १.५ किमी परिसर',
    radarSafeBadge: '🟢 सर्व क्षेत्र सुरक्षित',
    radarDangerBadge: '⚠️ आणीबाणी इशारा',
    youGps: 'तुम्ही (GPS)',
    yourBoat: 'तुमची बोट',
    touristSector: 'पर्यटक क्षेत्र',
    radarBearing: 'दिशा',
    radarDistance: 'अंतर',
    radarPerimeter: 'परिसर',
    radarFrequency: 'वारंवारता',
    voiceUpdateHeading: 'स्थानिक नाविकाचे थेट व्हॉइस अपडेट',
    fromYou: (dist) => `तुमच्यापासून ${dist}`,
    listenCleanVoice: 'स्पष्ट आवाज ऐका',
    listenCleanVoiceSub: 'Prisma Acoustic Shield: मेघगर्जना व इंजिन आवाजापासून मुक्त',
    listenAiAdvisory: (l) => `AI सुरक्षा सूचना ऐका (${l})`,
    listenAiAdvisorySub: 'Gnani Timbre प्रादेशिक मराठी आवाज',
    compareRawAudio: 'तुलना: मूळ रेकॉर्ड केलेला आवाज ऐका',
    compareRawAudioSub: 'मेघगर्जना आणि बोट इंजिन आवाजासह ऐका',
    touristSosBtn: 'मदत हवी आहे / आपत्कालीन SOS',
    touristSosSub: (lat, lon) => `जवळच्या गस्ती बोटीला तुमचे थेट GPS स्थान (${lat}, ${lon}) पाठवते`,
    sosModalTitle: 'थेट आपत्कालीन बीकन',
    sosModalSubtitle: 'जवळच्या बचाव नौकांना तात्काळ इशारा पाठवते',
    sosOpenPin: 'थेट पिन उघडा',
    sosOption1: 'व्यक्ती पाण्यात पडली आहे (Fell in water)',
    sosOption2: 'बोट वाहत आहे / इंजिन बंद पडले (Drifting)',
    sosOption3: 'बोटीवर वैद्यकीय आणीबाणी (Medical emergency)',
    sosCallPolice: 'नदी पोलिसांना कॉल करा · ११२',
    sosDispatched: 'आपत्कालीन बीकन पाठवला! बचाव बोट येत आहे.',
    callIncomingBadge: '🚨 स्वयंचलित आपत्कालीन कॉल येत आहे',
    callConnectedBadge: '🟢 कॉल जोडला गेला · थेट व्हॉइस ग्रिड',
    callTitle: 'CoastGuard आणीबाणी ११२',
    callSector: (place) => `क्षेत्र: ${place}`,
    callDangerNotice: (boatman) => `⚠️ नाविक ${boatman} यांनी धोक्याचा इशारा दिला आहे`,
    callDecline: 'नकार द्या (Decline)',
    callAccept: 'कॉल स्वीकारा (Accept)',
    callActiveChannel: 'सक्रिय व्हॉइस चॅनेल · GNANI TIMBRE TTS',
    callSpokenHeader: 'कानात ऐकू येणारा सुरक्षा इशारा:',
    callSendGps: 'बचाव बोटीला माझे GPS स्थान पाठवा',
    callEnd: 'कॉल संपवा (End Call)',
    boatmanHeader: 'नाविक व्हॉइस लाइफलाइन (Voice Lifeline)',
    boatmanGpsCoords: 'GPS निर्देशक',
    boatmanSpeakIdle: 'बोलण्यासाठी दाबा (TAP TO SPEAK)',
    boatmanSpeakListening: 'ऐकत आहे... आवाज शुद्धीकरण सुरू...',
    boatmanSpeakSent: 'व्हॉइस अपडेट प्रसारित! (Sent)',
    boatmanHoldInstruction: 'बटण दाबून ठेवा आणि पाण्याची स्थिती स्पष्टपणे बोला',
    reportCalm: 'शांत पाण्याची नोंद (All Normal)',
    reportSurge: 'पाण्याचा प्रवाह वाढला (Danger)',
    reportHazard: 'बोट बिघाड / दुर्घटना (SOS)',
    quoteSafe: '“पाणी पूर्णपणे शांत आहे, संध्याकाळपर्यंत आरामात बोटिंग करता येईल.”',
    quoteDanger: '“पाण्याचा प्रवाह अचानक वाढला आहे, बोट उलटण्याचा धोका आहे, सर्वांनी लगेच वर या!”',
    advisorySafe: 'तटरक्षक माहिती: पाण्याची पातळी सामान्य असून हवामान शांत आहे. बोटिंग करणे सुरक्षित आहे.',
    advisoryDanger: 'सावधान! नाविक मित्रांनी पाण्यात अचानक प्रवाह वाढल्याचा इशारा दिला आहे. कृपया लगेच घाटाच्या वरच्या पायऱ्यांवर जावे.'
  }
}
