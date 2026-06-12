/* ============================================
   sw-admin.js — Service Worker (Admin)
   Jeci Vieira Nails
   ============================================
   Estrategia: sem cache, apenas repassa todas
   as requisicoes para a rede. Necessario apenas
   para habilitar o manifesto PWA do admin.       */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function () {
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  e.respondWith(fetch(e.request));
});
