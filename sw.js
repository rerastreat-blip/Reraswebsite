const CACHE_VERSION = 'rera-pwa-v1';
const APP_SHELL = [
  '/',
  '/menu.html',
  '/style.css',
  '/nav-toggle.js',
  '/nav-events.js',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

const MENU_API_PATTERN = /\/whatsapp-sessions\/menu$/;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL).catch(() => {})),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GET requests are cacheable - let everything else (checkout,
  // RSVPs, admin actions) pass straight through untouched.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isMenuApi = MENU_API_PATTERN.test(url.pathname);

  if (!isSameOrigin && !isMenuApi) return;

  // Menu data and page navigations: try the network first so customers see
  // fresh prices/availability, falling back to the last-known cache when
  // offline.
  if (isMenuApi || request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Static assets (css, js, icons, images): cache-first for instant loads,
  // refreshing the cache in the background.
  if (isSameOrigin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
