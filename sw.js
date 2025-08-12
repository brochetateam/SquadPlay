/* SquadPlay Service Worker */
const CACHE_NAME = 'squadplay-v1'; // ¡bump si cambiáis cosas!
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // data.json: intentamos red primero, caemos a caché si no hay red
  if (url.pathname.endsWith('/data.json')) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // resto: cache-first con revalidación en segundo plano
  e.respondWith(cacheFirst(e.request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) {
    // revalida en segundo plano
    fetch(request).then(resp => {
      if (resp && resp.ok) cache.put(request, resp.clone());
    }).catch(()=>{});
    return cached;
  }
  const resp = await fetch(request);
  if (resp && resp.ok) cache.put(request, resp.clone());
  return resp;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const resp = await fetch(request);
    if (resp && resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch (e) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw e;
  }
}