// JOTA-JOTI Dashboard PWA service worker
//
// IMPORTANT:
// Increase APP_VERSION whenever you publish a new website version.
// v10 -> v11 -> v12 -> v13, etc.
//
// A new version creates a new cache and automatically removes the old one.

const APP_VERSION = 'v12';
const CACHE_NAME = `jota-joti-shell-${APP_VERSION}`;

const APP_SHELL = [
  './index.html',
  './setup.html',
  './admin.html',
  './skip.html',
  './track.html',
  './manifest.json',
  './photo1.png',
  './style.css',
  './script.js',
  './admin.css',
  './admin.js'
];

/* ============================================================
   INSTALL
   ============================================================ */

self.addEventListener('install', event => {
  event.waitUntil(
    cacheAppShell()
      .then(() => self.skipWaiting())
  );
});


/* ============================================================
   ACTIVATE
   ============================================================ */

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        const oldCaches = keys.filter(key =>
          key.startsWith('jota-joti-shell-') &&
          key !== CACHE_NAME
        );

        return Promise.all(
          oldCaches.map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});


/* ============================================================
   MESSAGES
   ============================================================ */

self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


/* ============================================================
   FETCH
   ============================================================ */

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle files belonging to this website.
  if (url.origin !== self.location.origin) return;


  /* ----------------------------------------------------------
     PAGE NAVIGATION
     ---------------------------------------------------------- */

  if (request.mode === 'navigate') {
    const path = url.pathname
      .replace(/\/+$/, '')
      .toLowerCase();


    // Skip route
    if (
      path.endsWith('/skip') ||
      path.endsWith('/skip.html')
    ) {
      event.respondWith(loadPage('./skip.html'));
      return;
    }


    // Parent setup guide
    if (path.endsWith('/setup')) {
      event.respondWith(loadPage('./setup.html'));
      return;
    }


    // JID world tracker
    if (
      path.endsWith('/track') ||
      path.endsWith('/track.html')
    ) {
      event.respondWith(loadPage('./track.html'));
      return;
    }


    // Secret admin route
    if (path.endsWith('/admin@5-6-4-3')) {
      event.respondWith(loadPage('./admin.html'));
      return;
    }


    // Never expose old /admin route
    if (
      path.endsWith('/admin') ||
      path.endsWith('/admin.html')
    ) {
      event.respondWith(
        Response.redirect(
          new URL('./', self.location.origin).href,
          302
        )
      );
      return;
    }


    // Normal site
    event.respondWith(
      loadPage('./index.html')
    );

    return;
  }


  /* ----------------------------------------------------------
     APP FILES
     ---------------------------------------------------------- */

  const pathname = url.pathname.toLowerCase();

  const isAppFile =
    pathname.endsWith('/index.html') ||
    pathname.endsWith('/index(1).html') ||
    pathname.endsWith('/admin.html') ||
    pathname.endsWith('/skip.html') ||
    pathname.endsWith('/track.html') ||
    pathname.endsWith('/manifest.json') ||
    pathname.endsWith('/photo1.png') ||
    pathname.endsWith('/style.css') ||
    pathname.endsWith('/script.js') ||
    pathname.endsWith('/admin.css') ||
    pathname.endsWith('/admin.js');

  if (!isAppFile) return;


  /*
   * Network first.
   *
   * no-cache tells the browser to check the server instead of
   * silently returning an old HTTP-cached file.
   *
   * If the network is unavailable, the service worker falls
   * back to its local cache so the PWA can still work offline.
   */

  event.respondWith(
    networkFirst(request)
  );
});


/* ============================================================
   CACHE APP SHELL
   ============================================================ */

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    APP_SHELL.map(async file => {
      try {
        const response = await fetch(file, {
          cache: 'no-cache'
        });

        if (!response || !response.ok) {
          throw new Error(
            `Could not fetch ${file}: ${response?.status || 'unknown error'}`
          );
        }

        await cache.put(file, response.clone());

      } catch (error) {
        // One missing optional file must not stop the service
        // worker from installing.
        console.warn(
          '[JOTA-JOTI] Could not cache:',
          file,
          error
        );
      }
    })
  );
}


/* ============================================================
   LOAD PAGE
   ============================================================ */

async function loadPage(file) {
  try {
    const response = await fetch(file, {
      cache: 'no-cache'
    });

    if (response && response.ok) {
      const copy = response.clone();

      caches.open(CACHE_NAME)
        .then(cache => cache.put(file, copy))
        .catch(() => {});

      return response;
    }

  } catch (_) {
    // Network unavailable.
  }


  const cachedPage =
    await caches.match(file);

  if (cachedPage) {
    return cachedPage;
  }


  const cachedIndex =
    await caches.match('./index.html');

  if (cachedIndex) {
    return cachedIndex;
  }


  return new Response(
    'JOTA-JOTI is temporarily unavailable. Please reconnect and try again.',
    {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    }
  );
}


/* ============================================================
   NETWORK FIRST
   ============================================================ */

async function networkFirst(request) {
  try {
    const response = await fetch(request, {
      cache: 'no-cache'
    });

    if (response && response.ok) {
      const copy = response.clone();

      caches.open(CACHE_NAME)
        .then(cache => cache.put(request, copy))
        .catch(() => {});
    }

    return response;

  } catch (error) {

    const cached =
      await caches.match(request);

    if (cached) {
      return cached;
    }

    throw error;
  }
}
