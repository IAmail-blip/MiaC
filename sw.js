/* ============================================================
   sw.js — Service Worker · La Compra Diaria
   Estrategia: Cache-First para assets propios,
               Stale-While-Revalidate para CDN externos.
   ============================================================ */

const CACHE_NAME = 'compra-diaria-v1';
const CACHE_CDN  = 'compra-diaria-cdn-v1';

// Assets propios que se cachean en el install
const CORE_ASSETS = [
  './index.html',
  './app.js',
  './manifest.json'
];

// URLs de CDN que queremos pre-cachear (Tailwind + Iconos)
const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// ── INSTALL: pre-cachear assets core ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpiar caches viejas ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== CACHE_CDN)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: lógica por tipo de recurso ─────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones no-GET y chrome-extension
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Assets propios → Cache-First
  const isOwn = CORE_ASSETS.some(a =>
    request.url.includes(a.replace('./', ''))
  ) || url.origin === self.location.origin;

  if (isOwn) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // CDN externos (Tailwind, Google Fonts…) → Stale-While-Revalidate
  const isCDN = CDN_ASSETS.some(a => request.url.startsWith(a))
    || url.hostname.includes('googleapis')
    || url.hostname.includes('tailwindcss')
    || url.hostname.includes('gstatic');

  if (isCDN) {
    event.respondWith(staleWhileRevalidate(request, CACHE_CDN));
    return;
  }

  // El resto: network con fallback a cache
  event.respondWith(networkWithCacheFallback(request, CACHE_NAME));
});

// ── Helpers de estrategia ──────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline – recurso no disponible', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || fetchPromise || new Response('Offline', { status: 503 });
}

async function networkWithCacheFallback(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
