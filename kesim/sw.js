const CACHE_NAME = 'coord-calculator-cache';

const ASSETS_TO_CACHE = [
  '',
  'index.html',
  'css/styles.css',
  'js/state.js',
  'js/calculator.js',
  'js/ui.js',
  'js/viewer.js',
  'js/tailwindcss.js',
  'css/fonts-googleapis-com.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Cleans up old caches (e.g. the previously mismatched v1/v2/v3 buckets).
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
  const url = new URL(event.request.url);

  // 1) version.json is always live
  // 2) Update fetches carry the X-Update-Fetch header and must
  //    bypass the cache so we download real fresh bytes.
  if (
    url.pathname.endsWith('version.json') ||
    event.request.headers.get('X-Update-Fetch') === '1'
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
