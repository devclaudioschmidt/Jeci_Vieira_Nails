// ================================================
// sw.js — Service Worker (PWA)
// ================================================

const CACHE_NAME = 'jeci-nails-v1';

const urlsToCache = [
  '.',
  'index.html',
  'pages/agendamento.html',
  'pages/confirmacao.html',
  'pages/admin.html',
  'css/global.css',
  'css/pages/index.css',
  'css/pages/agendamento.css',
  'css/pages/confirmacao.css',
  'css/pages/admin.css',
  'js/global.js',
  'js/firebase/config.js',
  'js/pages/index.js',
  'js/pages/agendamento.js',
  'js/pages/confirmacao.js',
  'js/pages/admin.js',
  'img/logoJeciVieira.svg',
  'img/icon-192.png',
  'img/icon-512.png',
  'manifest.json',
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
              return caches.match('index.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});
