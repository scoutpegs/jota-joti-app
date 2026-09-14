// JOTA-JOTI Dashboard PWA service worker

const CACHE_NAME = 'jota-joti-shell-v7';

const APP_SHELL = [
  './index.html',
  './index(1).html',
  './admin.html',
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
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle normal GET requests.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore requests going to another website.
  if (url.origin !== self.location.origin) return;

  /*
   * ---------------------------------------------------------
   * PAGE ROUTING
   * ---------------------------------------------------------
   *
   * /setup
   *       -> index(1).html
   *
   * /admin@5-6-4-3
   *       -> admin.html
   *
   * Everything else
   *       -> index.html
   */

  if (request.mode === 'navigate') {
    const path = url.pathname
      .replace(/\/+$/, '')
      .toLowerCase();

    // -----------------------------------------
    // SETUP PAGE
    // /setup
    // -----------------------------------------
    if (path === '/setup' || path.endsWith('/setup')) {
      event.respondWith(
        loadPage('./index(1).html')
      );
      return;
    }

    // -----------------------------------------
    // HIDDEN ADMIN PAGE
    // /admin@5-6-4-3
    // -----------------------------------------
    if (
      path === '/admin@5-6-4-3' ||
      path.endsWith('/admin@5-6-4-3')
    ) {
      event.respondWith(
        loadPage('./admin.html')
      );
      return;
    }

    // -----------------------------------------
    // BLOCK /admin
    // -----------------------------------------
    //
    // Don't let normal /admin requests expose
    // the admin page.
    //
    if (
      path === '/admin' ||
      path.endsWith('/admin') ||
      path === '/admin.html' ||
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

    // -----------------------------------------
    // EVERYTHING ELSE
    // Main application
    // -----------------------------------------
    event.respondWith(
      loadPage('./index.html')
    );

    return;
  }

  /*
   * ---------------------------------------------------------
   * STATIC FILES
   * ---------------------------------------------------------
   */

  const pathname = url.pathname.toLowerCase();

  const isAppFile =
    pathname.endsWith('/index.html') ||
    pathname.endsWith('/index(1).html') ||
    pathname.endsWith('/admin.html') ||
    pathname.endsWith('/manifest.json') ||
    pathname.endsWith('/photo1.png');

  if (!isAppFile) return;

  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request))
  );
});


/*
 * ---------------------------------------------------------
 * PAGE LOADER
 * ---------------------------------------------------------
 *
 * Tries the live file first so updates on GitHub Pages
 * are picked up, then falls back to the cached version.
 */
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
  } catch (error) {
    // Offline - use cache below.
  }

  const cached = await caches.match(file);

  if (cached) {
    return cached;
  }

  return caches.match('./index.html');
}
