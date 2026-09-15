// JOTA-JOTI Dashboard PWA service worker
const CACHE_NAME = 'jota-joti-shell-v9';

const APP_SHELL = [
  './index.html',
  './index(1).html',
  './admin.html',
  './skip.html',
  './manifest.json',
  './photo1.png',
  './style.css',
  './script.js',
  './admin.css',
  './admin.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // One missing file used to abort addAll, which meant the whole service
      // worker failed to install. Each file is now cached independently.
      .then(cache => Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    const path = url.pathname.replace(/\/+$/, '').toLowerCase();

// Skip route handler
    if (path.endsWith('/skip') || path.endsWith('/skip.html')) {
      event.respondWith(loadPage('./skip.html'));
      return;
    }
    
    // Parent setup guide
    if (path.endsWith('/setup')) {
      event.respondWith(loadPage('./index(1).html'));
      return;
    }

    // Secret admin route
    if (path.endsWith('/admin@5-6-4-3')) {
      event.respondWith(loadPage('./admin.html'));
      return;
    }

    // Never expose the old /admin route.
    if (path.endsWith('/admin') || path.endsWith('/admin.html')) {
      event.respondWith(Response.redirect(new URL('./', self.location.origin).href, 302));
      return;
    }

    // Normal site
    event.respondWith(loadPage('./index.html'));
    return;
  }

  const pathname = url.pathname.toLowerCase();
  const isAppFile =
    pathname.endsWith('/index.html') ||
    pathname.endsWith('/index(1).html') ||
    pathname.endsWith('/admin.html') ||
    pathname.endsWith('/skip.html') ||
    pathname.endsWith('/manifest.json') ||
    pathname.endsWith('/photo1.png') ||
    pathname.endsWith('/style.css') ||
    pathname.endsWith('/script.js') ||
    pathname.endsWith('/admin.css') ||
    pathname.endsWith('/admin.js');

  if (!isAppFile) return;

  // Network first so a fresh deploy always wins, with the cached copy as a
  // fallback when the connection is slow or gone. Nothing ever goes stale.
  event.respondWith(networkFirst(request));
});

async function loadPage(file) {
  try {
    const response = await fetch(file, { cache: 'no-cache' });

    if (response?.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME)
        .then(cache => cache.put(file, copy))
        .catch(() => {});
      return response;
    }
  } catch (_) {}

  return (await caches.match(file)) || (await caches.match('./index.html'));
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw _;
  }
}
