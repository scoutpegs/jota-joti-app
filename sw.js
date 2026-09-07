// JOTA-JOTI Dashboard PWA service worker.
const CACHE_NAME = 'jota-joti-shell-v4-embed-popup-fix';
const APP_SHELL = ['./index.html','./manifest.json','./photo1.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('message', event => { if(event.data?.type==='SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const req=event.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(r=>{const c=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',c)).catch(()=>{});return r;}).catch(()=>caches.match('./index.html'))); return;
  }
  const local=url.origin===self.location.origin && (url.pathname.endsWith('/manifest.json')||url.pathname.endsWith('/photo1.png')||url.pathname.endsWith('/index.html'));
  if(!local) return;
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req)));
});
