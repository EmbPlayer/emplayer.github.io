const CACHE_NAME = 'coord-calculator-cache';

const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'css/styles.css',
  'js/state.js',
  'js/calculator.js',
  'js/ui.js',
  'js/viewer.js',
  'js/tailwindcss.js',
  'css/fonts-googleapis-com.css'
];

// Cross-origin files the page needs (icons). Cached best-effort: a failure here
// must not break the install. The icon font files themselves are cached the
// first time they are requested (see fetch handler).
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(ASSETS_TO_CACHE);
      await Promise.all(
        CDN_ASSETS.map((url) =>
          fetch(url, { mode: 'cors', credentials: 'omit' })
            .then((res) => (res.ok ? cache.put(url, res) : null))
            .catch(() => null)
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (
    url.pathname.endsWith('version.json') ||
    request.headers.get('X-Update-Fetch') === '1'
  ) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      // Re-request cross-origin files with CORS so the response is readable
      // (not opaque) and we can check response.ok before caching it.
      const sameOrigin = url.origin === self.location.origin;
      const networkRequest = sameOrigin
        ? request
        : new Request(request.url, { mode: 'cors', credentials: 'omit' });

      return fetch(networkRequest)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline and not cached: for page loads, fall back to the app shell.
          if (request.mode === 'navigate') return caches.match('index.html');
          return Response.error();
        });
    })
  );
});
