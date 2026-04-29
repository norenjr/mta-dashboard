/* Service Worker for NYC Subway Near Me PWA
   Strategy: serve the app shell from cache instantly,
   then fetch live data from the network as normal. */

const CACHE_NAME = 'nyc-trains-v1';
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

/* Fetch: cache-first for app shell, network-only for API calls */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* Always go to the network for MTA API calls */
  if (url.hostname.includes('camsys-apps.com')) return;

  /* For the app shell, try cache first, fall back to network */
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
