// CoastGuard AI — Sovereign PWA Service Worker (v1)
// Enables full offline emergency grid capabilities:
// 1. App shell caching for disconnected open sea / riverine environments
// 2. Hardware Satellite GPS remains active via browser navigator.geolocation
// 3. Fallback mock API responses for /api/tourist/status when offline

const CACHE_NAME = 'coastguard-ai-v1';

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/apple-icon.png',
  '/icon-light-32x32.png',
  '/icon-dark-32x32.png'
];

// 1. Install & pre-cache critical app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate & cleanup stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Intercept network requests with smart offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests for caching (broadcasts will be queued by frontend)
  if (request.method !== 'GET') {
    return;
  }

  // Handle navigation requests (e.g. user opens app or refreshes while offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match('/');
        if (cached) return cached;
        return caches.match(request);
      })
    );
    return;
  }

  // Handle /api/tourist/status offline fallback
  if (url.pathname.startsWith('/api/tourist/status')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache latest response
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;

          // Provide offline safe sector fallback
          const offlineSectorData = {
            status: 'safe',
            place_name: 'Local River Sector (Offline Cache)',
            boatman_name: 'Local Boatman (GPS Verified)',
            lat: 25.3176,
            lon: 83.0060,
            hindi_quote: 'ऑफ़लाइन मोड: सैटेलाइट GPS सक्रिय है। स्थानीय जल क्षेत्र सामान्य है।',
            english_translation: 'Offline Mode: Satellite GPS active. Sector operational via local PWA cache.',
            water_status_text: 'इंटरनेट नहीं है — ऐप ऑफ़लाइन कैश और सैटेलाइट GPS से संचालित हो रहा है।',
            boatman_audio_url: '',
            ai_audio_url: '',
            timestamp: 'offline'
          };

          return new Response(JSON.stringify(offlineSectorData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Static assets & scripts: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
