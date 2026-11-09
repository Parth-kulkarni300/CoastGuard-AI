'use client'

import { Globe, Mic, Radio, Navigation, ShieldCheck, Waves, Phone, Users } from 'lucide-react'
import { SupportedLang, LANGUAGES } from '@/lib/i18n'

interface LandingCopy {
  nav_login: string
  hero_eyebrow: string
  hero_title_1: string
  hero_title_2: string
  hero_sub: string
  cta_primary: string
  cta_secondary: string
  trust_offline: string
  trust_free: string
  trust_nologin: string
  trust_langs: string
  how_title: string
  how_sub: string
  step1_title: string
  step1_desc: string
  step2_title: string
  step2_desc: string
  step3_title: string
  step3_desc: string
  step4_title: string
  step4_desc: string
  who_title: string
  who_sub: string
  who_boatman_title: string
  who_boatman_desc: string
  who_tourist_title: string
  who_tourist_desc: string
  who_authority_title: string
  who_authority_desc: string
  final_title: string
  final_sub: string
  footer_tagline: string
}

const COPY: Record<SupportedLang, LandingCopy> = {
  en: {
    nav_login: 'Open App',
    hero_eyebrow: 'Built for India’s rivers & coasts',
    hero_title_1: 'Help, one tap away',
    hero_title_2: 'on the water.',
    hero_sub: 'CoastGuard AI connects tourists, boatmen and rescue teams with a single voice call — even in heavy noise, in your own language, with no signup needed.',
    cta_primary: 'Get Started',
    cta_secondary: 'See how it works',
    trust_offline: 'Works without internet',
    trust_free: 'Free, no account needed',
    trust_nologin: 'No password or OTP',
    trust_langs: '5 Indian languages',
    how_title: 'How it works',
    how_sub: 'From a cry for help to a boat on the way — in four simple steps.',
    step1_title: 'Call or tap SOS',
    step1_desc: 'A tourist in trouble taps one button, or a boatman speaks into the app — no forms, no typing.',
    step2_title: 'AI cleans up the noise',
    step2_desc: 'Engine rumble and wind are filtered out so the message comes through clearly, in any regional dialect.',
    step3_title: 'Nearest boat is found',
    step3_desc: 'The app instantly finds the closest boatman within 3 km using live GPS.',
    step4_title: 'Everyone gets a voice alert',
    step4_desc: 'Both the tourist and the boatman hear spoken directions and distance, guiding help straight to them.',
    who_title: 'Built for everyone on the water',
    who_sub: 'One app, three roles — each with exactly what they need.',
    who_boatman_title: 'Boatmen & Fishermen',
    who_boatman_desc: 'Speak updates into the app and get instantly alerted when a tourist nearby needs help.',
    who_tourist_title: 'Tourists & Visitors',
    who_tourist_desc: 'One-tap SOS sends your live location to the nearest boat — no app download hassle.',
    who_authority_title: 'Government & NDRF',
    who_authority_desc: 'A live view of every alert and boat in the area, for faster coordinated response.',
    final_title: 'Stay safe on the water today',
    final_sub: 'No signup, no password — just open the app and choose your role.',
    footer_tagline: 'Keeping you safe on India’s rivers and coasts.'
  },
  hi: {
    nav_login: 'ऐप खोलें',
    hero_eyebrow: 'भारत की नदियों और तटों के लिए',
    hero_title_1: 'पानी पर मदद,',
    hero_title_2: 'एक टैप में।',
    hero_sub: 'CoastGuard AI पर्यटकों, नाविकों और बचाव दल को एक वॉइस कॉल से जोड़ता है — शोर में भी, आपकी अपनी भाषा में, बिना किसी साइनअप के।',
    cta_primary: 'शुरू करें',
    cta_secondary: 'यह कैसे काम करता है',
    trust_offline: 'बिना इंटरनेट भी काम करता है',
    trust_free: 'मुफ़्त, खाता नहीं चाहिए',
    trust_nologin: 'कोई पासवर्ड या OTP नहीं',
    trust_langs: '5 भारतीय भाषाएं',
    how_title: 'यह कैसे काम करता है',
    how_sub: 'मदद की पुकार से लेकर नाव के रवाना होने तक — चार आसान चरणों में।',
    step1_title: 'कॉल करें या SOS दबाएं',
    step1_desc: 'संकट में फंसा पर्यटक एक बटन दबाता है, या नाविक ऐप में बोलता है — कोई फॉर्म नहीं, कोई टाइपिंग नहीं।',
    step2_title: 'AI शोर हटाता है',
    step2_desc: 'इंजन और हवा की आवाज़ हटाकर संदेश किसी भी क्षेत्रीय बोली में स्पष्ट रूप से पहुंचता है।',
    step3_title: 'निकटतम नाव ढूंढी जाती है',
    step3_desc: 'ऐप लाइव GPS से 3 किमी के भीतर सबसे नज़दीकी नाविक को तुरंत ढूंढ लेता है।',
    step4_title: 'सभी को वॉइस अलर्ट मिलता है',
    step4_desc: 'पर्यटक और नाविक दोनों दिशा और दूरी सुनते हैं, जो मदद को सीधे उन तक पहुंचाता है।',
    who_title: 'पानी पर हर किसी के लिए',
    who_sub: 'एक ऐप, तीन भूमिकाएं — हर किसी के लिए वही जो उसे चाहिए।',
    who_boatman_title: 'नाविक व मछुआरे',
    who_boatman_desc: 'ऐप में बोलकर अपडेट भेजें और नज़दीकी पर्यटक को मदद चाहिए होने पर तुरंत सूचना पाएं।',
    who_tourist_title: 'पर्यटक व यात्री',
    who_tourist_desc: 'एक टैप में SOS आपका लाइव स्थान निकटतम नाव तक भेज देता है — कोई ऐप डाउनलोड झंझट नहीं।',
    who_authority_title: 'सरकार व NDRF',
    who_authority_desc: 'क्षेत्र में हर अलर्ट और नाव का लाइव दृश्य, तेज़ समन्वित प्रतिक्रिया के लिए।',
    final_title: 'आज ही पानी पर सुरक्षित रहें',
    final_sub: 'कोई साइनअप नहीं, कोई पासवर्ड नहीं — बस ऐप खोलें और अपनी भूमिका चुनें।',
    footer_tagline: 'नदी और तट पर आपकी सुरक्षा के लिए।'
  },
  mr: {
    nav_login: 'अ‍ॅप उघडा',
    hero_eyebrow: 'भारताच्या नद्या आणि किनाऱ्यांसाठी',
    hero_title_1: 'पाण्यावर मदत,',
    hero_title_2: 'एका टॅपमध्ये.',
    hero_sub: 'CoastGuard AI पर्यटक, नाविक आणि बचाव पथकांना एका व्हॉइस कॉलने जोडते — गोंगाटातही, तुमच्या भाषेत, साइनअपशिवाय.',
    cta_primary: 'सुरू करा',
    cta_secondary: 'हे कसे कार्य करते',
    trust_offline: 'इंटरनेटशिवायही काम करते',
    trust_free: 'मोफत, खाते गरजेचे नाही',
    trust_nologin: 'पासवर्ड किंवा OTP नाही',
    trust_langs: '5 भारतीय भाषा',
    how_title: 'हे कसे कार्य करते',
    how_sub: 'मदतीच्या हाकेपासून बोट निघण्यापर्यंत — चार सोप्या टप्प्यांत.',
    step1_title: 'कॉल करा किंवा SOS दाबा',
    step1_desc: 'संकटात सापडलेला पर्यटक एक बटण दाबतो, किंवा नाविक अ‍ॅपमध्ये बोलतो — फॉर्म नाही, टायपिंग नाही.',
    step2_title: 'AI आवाज स्वच्छ करते',
    step2_desc: 'इंजिन व वाऱ्याचा आवाज काढून संदेश कोणत्याही प्रादेशिक बोलीत स्पष्टपणे पोहोचतो.',
    step3_title: 'जवळची बोट शोधली जाते',
    step3_desc: 'अ‍ॅप थेट GPS वापरून 3 किमीच्या आत सर्वात जवळच्या नाविकाला लगेच शोधते.',
    step4_title: 'सर्वांना व्हॉइस अलर्ट मिळतो',
    step4_desc: 'पर्यटक आणि नाविक दोघेही दिशा व अंतर ऐकतात, जे मदतीला थेट त्यांच्यापर्यंत पोहोचवते.',
    who_title: 'पाण्यावरील प्रत्येकासाठी',
    who_sub: 'एक अ‍ॅप, तीन भूमिका — प्रत्येकासाठी नेमके तेच जे त्यांना हवे.',
    who_boatman_title: 'नाविक व मच्छीमार',
    who_boatman_desc: 'अ‍ॅपमध्ये बोलून अपडेट पाठवा आणि जवळच्या पर्यटकाला मदत हवी असल्यास लगेच सूचना मिळवा.',
    who_tourist_title: 'पर्यटक व प्रवासी',
    who_tourist_desc: 'एका टॅपमध्ये SOS तुमचे थेट स्थान जवळच्या बोटीपर्यंत पाठवते — अ‍ॅप डाउनलोडचा त्रास नाही.',
    who_authority_title: 'शासन व NDRF',
    who_authority_desc: 'परिसरातील प्रत्येक अलर्ट आणि बोटीचे थेट दृश्य, जलद समन्वित प्रतिसादासाठी.',
    final_title: 'आजच पाण्यावर सुरक्षित रहा',
    final_sub: 'साइनअप नाही, पासवर्ड नाही — फक्त अ‍ॅप उघडा आणि तुमची भूमिका निवडा.',
    footer_tagline: 'नदी आणि किनाऱ्यावर तुमच्या सुरक्षेसाठी.'
  },
  ta: {
    nav_login: 'ஆப்பைத் திற',
    hero_eyebrow: 'இந்தியாவின் ஆறுகள் மற்றும் கடற்கரைகளுக்காக',
    hero_title_1: 'நீரில் உதவி,',
    hero_title_2: 'ஒரு தட்டலில்.',
    hero_sub: 'CoastGuard AI சுற்றுலாப் பயணிகள், படகோட்டிகள் மற்றும் மீட்புக் குழுக்களை ஒரு குரல் அழைப்பில் இணைக்கிறது — சத்தமான இடங்களிலும், உங்கள் மொழியில், பதிவு தேவையில்லாமல்.',
    cta_primary: 'தொடங்கவும்',
    cta_secondary: 'இது எப்படி செயல்படுகிறது',
    trust_offline: 'இணையம் இல்லாமலும் வேலை செய்யும்',
    trust_free: 'இலவசம், கணக்கு தேவையில்லை',
    trust_nologin: 'கடவுச்சொல் அல்லது OTP இல்லை',
    trust_langs: '5 இந்திய மொழிகள்',
    how_title: 'இது எப்படி செயல்படுகிறது',
    how_sub: 'உதவிக் கோரிக்கையிலிருந்து படகு புறப்படும் வரை — நான்கு எளிய படிகளில்.',
    step1_title: 'அழைக்கவும் அல்லது SOS அழுத்தவும்',
    step1_desc: 'ஆபத்தில் உள்ள சுற்றுலாப் பயணி ஒரு பொத்தானை அழுத்துகிறார், அல்லது படகோட்டி ஆப்பில் பேசுகிறார் — படிவம் இல்லை, தட்டச்சு இல்லை.',
    step2_title: 'AI சத்தத்தை நீக்குகிறது',
    step2_desc: 'எஞ்சின் மற்றும் காற்று சத்தம் நீக்கப்பட்டு, எந்த பிராந்திய பேச்சிலும் செய்தி தெளிவாக வருகிறது.',
    step3_title: 'அருகிலுள்ள படகு கண்டறியப்படுகிறது',
    step3_desc: 'ஆப் நேரடி GPS மூலம் 3 கிமீக்குள் அருகிலுள்ள படகோட்டியை உடனடியாகக் கண்டறிகிறது.',
    step4_title: 'அனைவருக்கும் குரல் எச்சரிக்கை',
    step4_desc: 'சுற்றுலாப் பயணி மற்றும் படகோட்டி இருவரும் திசை மற்றும் தூரத்தைக் கேட்கிறார்கள், இது உதவியை நேரடியாக அவர்களிடம் வழிநடத்துகிறது.',
    who_title: 'நீரில் உள்ள அனைவருக்காகவும்',
    who_sub: 'ஒரு ஆப், மூன்று பங்குகள் — ஒவ்வொருவருக்கும் தேவையானது மட்டும்.',
    who_boatman_title: 'படகோட்டிகள் & மீனவர்கள்',
    who_boatman_desc: 'ஆப்பில் பேசி புதுப்பிப்புகளை அனுப்பவும், அருகிலுள்ள பயணிக்கு உதவி தேவைப்படும்போது உடனடியாக அறிவிப்பு பெறவும்.',
    who_tourist_title: 'சுற்றுலாப் பயணிகள்',
    who_tourist_desc: 'ஒரு தட்டலில் SOS உங்கள் நேரடி இருப்பிடத்தை அருகிலுள்ள படகுக்கு அனுப்புகிறது — ஆப் பதிவிறக்க சிக்கல் இல்லை.',
    who_authority_title: 'அரசு & NDRF',
    who_authority_desc: 'பகுதியில் உள்ள ஒவ்வொரு எச்சரிக்கை மற்றும் படகின் நேரடி காட்சி, விரைவான ஒருங்கிணைந்த பதிலுக்காக.',
    final_title: 'இன்றே நீரில் பாதுகாப்பாக இருங்கள்',
    final_sub: 'பதிவு இல்லை, கடவுச்சொல் இல்லை — ஆப்பைத் திறந்து உங்கள் பங்கைத் தேர்ந்தெடுக்கவும்.',
    footer_tagline: 'உங்கள் பாதுகாப்பிற்காக.'
  },
  bn: {
    nav_login: 'অ্যাপ খুলুন',
    hero_eyebrow: 'ভারতের নদী ও উপকূলের জন্য',
    hero_title_1: 'জলে সাহায্য,',
    hero_title_2: 'এক ট্যাপে।',
    hero_sub: 'CoastGuard AI পর্যটক, মাঝি ও উদ্ধারকারী দলকে একটি ভয়েস কলে যুক্ত করে — শব্দের মধ্যেও, আপনার নিজের ভাষায়, কোনো সাইনআপ ছাড়াই।',
    cta_primary: 'শুরু করুন',
    cta_secondary: 'এটি কীভাবে কাজ করে',
    trust_offline: 'ইন্টারনেট ছাড়াও কাজ করে',
    trust_free: 'বিনামূল্যে, অ্যাকাউন্ট প্রয়োজন নেই',
    trust_nologin: 'পাসওয়ার্ড বা OTP নেই',
    trust_langs: '৫টি ভারতীয় ভাষা',
    how_title: 'এটি কীভাবে কাজ করে',
    how_sub: 'সাহায্যের ডাক থেকে নৌকা রওনা হওয়া পর্যন্ত — চারটি সহজ ধাপে।',
    step1_title: 'কল করুন বা SOS চাপুন',
    step1_desc: 'বিপদে থাকা পর্যটক একটি বোতাম চাপেন, অথবা মাঝি অ্যাপে কথা বলেন — কোনো ফর্ম নেই, টাইপিং নেই।',
    step2_title: 'AI শব্দ পরিষ্কার করে',
    step2_desc: 'ইঞ্জিন ও বাতাসের শব্দ সরিয়ে, যেকোনো আঞ্চলিক ভাষায় বার্তা স্পষ্টভাবে পৌঁছায়।',
    step3_title: 'নিকটতম নৌকা খুঁজে বের করা হয়',
    step3_desc: 'অ্যাপটি লাইভ GPS ব্যবহার করে ৩ কিমির মধ্যে নিকটতম মাঝিকে তাৎক্ষণিকভাবে খুঁজে নেয়।',
    step4_title: 'সবাই ভয়েস সতর্কতা পান',
    step4_desc: 'পর্যটক ও মাঝি উভয়েই দিক ও দূরত্ব শোনেন, যা সাহায্যকে সরাসরি তাদের কাছে নিয়ে যায়।',
    who_title: 'জলে থাকা সবার জন্য',
    who_sub: 'একটি অ্যাপ, তিনটি ভূমিকা — প্রত্যেকের জন্য ঠিক যা প্রয়োজন।',
    who_boatman_title: 'মাঝি ও জেলে',
    who_boatman_desc: 'অ্যাপে কথা বলে আপডেট পাঠান এবং কাছের পর্যটকের সাহায্য দরকার হলে তাৎক্ষণিক সতর্কতা পান।',
    who_tourist_title: 'পর্যটক ও ভ্রমণকারী',
    who_tourist_desc: 'এক ট্যাপে SOS আপনার লাইভ অবস্থান নিকটতম নৌকায় পাঠিয়ে দেয় — অ্যাপ ডাউনলোডের ঝামেলা নেই।',
    who_authority_title: 'সরকার ও NDRF',
    who_authority_desc: 'এলাকার প্রতিটি সতর্কতা ও নৌকার লাইভ দৃশ্য, দ্রুত সমন্বিত সাড়ার জন্য।',
    final_title: 'আজই জলে নিরাপদ থাকুন',
    final_sub: 'কোনো সাইনআপ নেই, পাসওয়ার্ড নেই — শুধু অ্যাপ খুলুন ও আপনার ভূমিকা বেছে নিন।',
    footer_tagline: 'নদী ও উপকূলে আপনার নিরাপত্তার জন্য।'
  }
}

export default function LandingPage({
  lang,
  onLangChange,
  onGetStarted,
  isOnline = true
}: {
  lang: SupportedLang
  onLangChange: (l: SupportedLang) => void
  onGetStarted: () => void
  isOnline?: boolean
}) {
  const c = COPY[lang] || COPY.en

  return (
    <main style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Top nav */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px max(20px, calc((100vw - 1100px) / 2))',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--line)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px -4px rgba(5, 150, 105, 0.6)'
            }}
          >
            <Waves style={{ width: '18px', height: '18px' }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '17px', color: 'var(--ink)' }}>
            CoastGuard <span style={{ color: 'var(--green)' }}>AI</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Quick one-tap English switch */}
          {lang !== 'en' && (
            <button
              type="button"
              onClick={() => onLangChange('en')}
              style={{
                background: 'var(--blue-soft)',
                border: '1px solid var(--blue-border)',
                color: 'var(--blue)',
                padding: '6px 10px',
                borderRadius: '10px',
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
              gap: '5px',
              background: '#f8fafc',
              border: '1px solid var(--line)',
              padding: '6px 10px',
              borderRadius: '10px'
            }}
          >
            <Globe style={{ width: '14px', height: '14px', color: 'var(--green)' }} />
            <select
              value={lang}
              onChange={(e) => onLangChange(e.target.value as SupportedLang)}
              style={{ background: 'transparent', border: 'none', fontSize: '12.5px', fontWeight: 800, color: 'var(--ink)', cursor: 'pointer', outline: 'none' }}
              aria-label="Choose Language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.native}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onGetStarted}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 0,
              borderRadius: '10px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 6px 16px -6px rgba(5, 150, 105, 0.55)'
            }}
          >
            {c.nav_login}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section
        style={{
          padding: '64px 20px 56px',
          maxWidth: '760px',
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 55%)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--green-soft)',
            border: '1px solid var(--green-border)',
            color: 'var(--green-hover)',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12.5px',
            fontWeight: 800,
            marginBottom: '20px'
          }}
        >
          <ShieldCheck style={{ width: '13px', height: '13px' }} />
          {c.hero_eyebrow}
        </span>

        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, color: 'var(--ink)', lineHeight: 1.15, margin: '0 0 18px', letterSpacing: '-0.02em' }}>
          {c.hero_title_1}<br />
          <span style={{ color: 'var(--green)' }}>{c.hero_title_2}</span>
        </h1>

        <p style={{ fontSize: '16.5px', color: 'var(--muted)', lineHeight: 1.6, maxWidth: '560px', margin: '0 auto 32px' }}>
          {c.hero_sub}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '28px' }}>
          <button
            type="button"
            onClick={onGetStarted}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 0,
              borderRadius: '14px',
              padding: '16px 28px',
              fontSize: '16px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 10px 24px -8px rgba(5, 150, 105, 0.5)'
            }}
          >
            {c.cta_primary}
          </button>
          <a
            href="#how-it-works"
            style={{
              background: '#ffffff',
              color: 'var(--ink)',
              border: '1.5px solid var(--line)',
              borderRadius: '14px',
              padding: '16px 28px',
              fontSize: '16px',
              fontWeight: 800,
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            {c.cta_secondary}
          </a>
        </div>

        {/* Trust strip */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {[
            { icon: <Radio style={{ width: '13px', height: '13px' }} />, label: c.trust_offline },
            { icon: <ShieldCheck style={{ width: '13px', height: '13px' }} />, label: c.trust_free },
            { icon: <ShieldCheck style={{ width: '13px', height: '13px' }} />, label: c.trust_nologin },
            { icon: <Globe style={{ width: '13px', height: '13px' }} />, label: c.trust_langs }
          ].map((item, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f8fafc',
                border: '1px solid var(--line)',
                color: 'var(--ink-secondary)',
                padding: '7px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              {item.icon}
              {item.label}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding: '56px 20px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--ink)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            {c.how_title}
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--muted)', margin: 0 }}>{c.how_sub}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '18px' }}>
          {[
            { icon: <Phone />, color: 'var(--red)', bg: 'var(--red-soft)', border: 'var(--red-border)', step: '1', title: c.step1_title, desc: c.step1_desc },
            { icon: <Mic />, color: 'var(--blue)', bg: 'var(--blue-soft)', border: 'var(--blue-border)', step: '2', title: c.step2_title, desc: c.step2_desc },
            { icon: <Navigation />, color: 'var(--green-hover)', bg: 'var(--green-soft)', border: 'var(--green-border)', step: '3', title: c.step3_title, desc: c.step3_desc },
            { icon: <Radio />, color: 'var(--amber)', bg: 'var(--amber-soft)', border: 'var(--amber-border)', step: '4', title: c.step4_title, desc: c.step4_desc }
          ].map((s) => (
            <div
              key={s.step}
              style={{
                background: '#ffffff',
                border: '1px solid var(--line)',
                borderRadius: '20px',
                padding: '24px 20px',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '13px',
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  display: 'grid',
                  placeItems: 'center',
                  color: s.color,
                  marginBottom: '14px'
                }}
              >
                {s.icon}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: s.color, marginBottom: '6px', letterSpacing: '0.05em' }}>
                STEP {s.step}
              </div>
              <h3 style={{ fontSize: '15.5px', fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>
                {s.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section style={{ padding: '32px 20px 56px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--ink)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            {c.who_title}
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--muted)', margin: 0 }}>{c.who_sub}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {[
            { emoji: '🎣', title: c.who_boatman_title, desc: c.who_boatman_desc },
            { emoji: '🎒', title: c.who_tourist_title, desc: c.who_tourist_desc },
            { emoji: '🏛️', title: c.who_authority_title, desc: c.who_authority_desc }
          ].map((r, i) => (
            <div
              key={i}
              style={{
                background: '#fbfcfe',
                border: '1px solid var(--line)',
                borderRadius: '20px',
                padding: '26px 22px'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{r.emoji}</div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)', margin: '0 0 8px' }}>{r.title}</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.55, margin: 0 }}>{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '8px 20px 64px', maxWidth: '900px', margin: '0 auto' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            borderRadius: '28px',
            padding: '48px 32px',
            textAlign: 'center',
            boxShadow: '0 20px 48px -16px rgba(5, 150, 105, 0.45)'
          }}
        >
          <Users style={{ width: '30px', height: '30px', color: '#fff', marginBottom: '14px' }} />
          <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#fff', margin: '0 0 10px' }}>{c.final_title}</h2>
          <p style={{ fontSize: '14.5px', color: 'rgba(255,255,255,0.9)', margin: '0 0 26px' }}>{c.final_sub}</p>
          <button
            type="button"
            onClick={onGetStarted}
            style={{
              background: '#ffffff',
              color: 'var(--green-hover)',
              border: 0,
              borderRadius: '14px',
              padding: '15px 30px',
              fontSize: '15.5px',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            {c.cta_primary}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', padding: '24px 20px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Waves style={{ width: '15px', height: '15px', color: 'var(--green)' }} />
          <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--ink)' }}>CoastGuard AI</span>
        </div>
        <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: 0 }}>{c.footer_tagline}</p>
        {!isOnline && (
          <p style={{ fontSize: '11px', color: 'var(--amber)', margin: '8px 0 0', fontWeight: 700 }}>
            {lang === 'hi' ? '⚡ ऑफलाइन' : (lang === 'mr' ? '⚡ ऑफलाइन' : '⚡ Offline')}
          </p>
        )}
      </footer>
    </main>
  )
}
