/* Service Worker for NYC Subway Near Me PWA
   Strategy: serve the app shell from the network so deploys are picked
   up immediately, falling back to cache only when offline. */

const CACHE_NAME = 'nyc-subway-v1';
const APP_SHELL  = [
  '/mta-dashboard/',
  '/mta-dashboard/index.html'
];

/* Install: pre-cache the app shell */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

/* Activate: clean up old caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Fetch: network-first for the app shell (so new deploys are seen right
   away), falling back to the cache when offline. Network-only for API calls. */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* Always go to the network for MTA API calls */
  if (url.hostname.includes('camsys-apps.com')) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
