/* ============================================
   sw.js — Service Worker (modo pass-through)
   Jeci Vieira Nails
   ============================================
   Estrategia: sem cache, apenas repassa todas
   as requisicoes para a rede. Necessario apenas
   para habilitar o manifesto PWA (display:
   standalone) nos navegadores Android.         */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function () {
  self.clients.claim();
});

/* Repassa toda requisicao para a rede, sem cache */
self.addEventListener('fetch', function (e) {
  e.respondWith(fetch(e.request));
});
