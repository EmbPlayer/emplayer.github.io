const CACHE_NAME = 'coord-calculator-v1';
const ASSETS_TO_CACHE = [
  '',
  'index.html',
  'css/styles.css',
  'js/state.js',
  'js/calculator.js',
  'js/ui.js',
  'js/viewer.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Never serve version.json from offline cache so checks hit live server
  if (event.request.url.includes('version.json')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first strategy for app files
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
