// JOTA-JOTI Dashboard service worker.
// Network-first app shell with fast cached fallback. Live Sheet/API requests
// remain network-only from the page and are never replaced with fake data.

const CACHE_NAME = 'jota-joti-shell-v3-session-ui';
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

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Only serve cached local shell assets. API/Google Sheet requests stay live.
  const url = new URL(req.url);
  const isLocalShell = url.origin === self.location.origin &&
    (url.pathname.endsWith('/manifest.json') || url.pathname.endsWith('/photo1.png') || url.pathname.endsWith('/index.html'));

  if (!isLocalShell) return;

  event.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return response;
      })
    )
  );
});
