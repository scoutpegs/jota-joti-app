// Minimal service worker for the JOTA-JOTI Dashboard PWA.
// Goal: make the app installable and let it still open (cached shell)
// if the connection drops. Live data calls in the page still need a
// real network connection and are NOT cached here.

const CACHE_NAME = 'jota-joti-shell-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './photo1.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for navigation/HTML so users always get the latest version
// when online; fall back to the cached shell only if the network fails.
self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).catch(() => cached))
  );
});
