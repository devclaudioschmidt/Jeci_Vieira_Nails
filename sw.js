// ================================================
// sw.js — Service Worker (PWA)
// ================================================

const CACHE_NAME = 'jeci-nails-v2';

const urlsToCache = [
  '/Jeci_Vieira_Nails/',
  '/Jeci_Vieira_Nails/index.html',
  '/Jeci_Vieira_Nails/pages/agendamento.html',
  '/Jeci_Vieira_Nails/pages/confirmacao.html',
  '/Jeci_Vieira_Nails/pages/admin.html',
  '/Jeci_Vieira_Nails/css/global.css',
  '/Jeci_Vieira_Nails/css/pages/index.css',
  '/Jeci_Vieira_Nails/css/pages/agendamento.css',
  '/Jeci_Vieira_Nails/css/pages/confirmacao.css',
  '/Jeci_Vieira_Nails/css/pages/admin.css',
  '/Jeci_Vieira_Nails/js/global.js',
  '/Jeci_Vieira_Nails/js/firebase/config.js',
  '/Jeci_Vieira_Nails/js/pages/index.js',
  '/Jeci_Vieira_Nails/js/pages/agendamento.js',
  '/Jeci_Vieira_Nails/js/pages/confirmacao.js',
  '/Jeci_Vieira_Nails/js/pages/admin.js',
  '/Jeci_Vieira_Nails/img/logoJeciVieira.svg',
  '/Jeci_Vieira_Nails/img/icon-192.png',
  '/Jeci_Vieira_Nails/img/icon-512.png',
  '/Jeci_Vieira_Nails/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            if (event.request.mode === 'navigate') {
              return caches.match('/Jeci_Vieira_Nails/index.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});
