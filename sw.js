// Author: Regga @reggarantai
// https://reggarantai.com

// Service worker: simpan file situs supaya kalkulator tetap bisa dibuka tanpa internet.
// Naikkan versi CACHE kalau daftar FILE berubah.
const CACHE = 'bbi-v1';
const FILE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/style.css',
  'assets/js/rumus.js',
  'assets/js/script.js',
  'assets/img/ikon.svg',
  'assets/img/ikon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((semua) => Promise.all(semua.filter((nama) => nama !== CACHE).map((nama) => caches.delete(nama))))
      .then(() => self.clients.claim())
  );
});

// Utamakan jaringan supaya selalu dapat versi terbaru; pakai cache saat offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((respons) => {
        if (respons.ok) {
          const salinan = respons.clone();
          caches.open(CACHE).then((cache) => cache.put(request, salinan));
        }
        return respons;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((cocok) => cocok || caches.match('./')))
  );
});
