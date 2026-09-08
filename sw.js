// JOTA-JOTI Dashboard PWA service worker.
const CACHE_NAME = 'jota-joti-shell-v5';
const APP_SHELL = ['./index.html', './manifest.json', './photo1.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Every navigation (whatever path or extra text is in the address bar)
  // always resolves to the real app shell, never to whatever incidental
  // path was actually requested. This is what makes the app open the same
  // way from any link, bookmark, or mistyped URL.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch('./index.html')
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  const isAppShellFile = url.pathname.endsWith('/manifest.json')
    || url.pathname.endsWith('/photo1.png')
    || url.pathname.endsWith('/index.html');
  if (!isAppShellFile) return;

  event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
