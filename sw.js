// JOTA-JOTI Dashboard PWA service worker.
const CACHE_NAME = 'jota-joti-shell-v6';
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
  // resolves to the real app shell, never to whatever incidental path was
  // actually requested — EXCEPT for the two other real pages this site has,
  // /skip and /admin, which must load their own separate HTML files rather
  // than being redirected back to the countdown/dashboard page.
  if (req.mode === 'navigate') {
    const path = url.pathname.replace(/\/+$/, '');
    const isOtherRealPage = /\/(skip|admin)(\.html)?$/.test(path);
    if (isOtherRealPage) return;

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
