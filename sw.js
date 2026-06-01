/* =========================================================
 * sw.js — Service Worker (Cache Strategy)
 * Bumped CACHE_NAME to force clearing of stale assets.
 * =======================================================*/

const CACHE_NAME = 'tsh-inventory-V36-redesign';
const ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './styles.css',
  './login.js',
  './config.js',
  './app.js',
  './qrlib.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Library External
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/minified/html5-qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

// 1. Install & Cache Assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS.map((url) => {
          return fetch(url)
            .then((res) => {
              if (res.ok) return cache.put(url, res);
              console.warn('Lewati cache (Not OK):', url);
            })
            .catch((err) => console.warn('Lewati cache (Network/CORS Error):', url, err));
        })
      );
    })
  );
});

// 2. Activate & Bersihkan Cache Lama (PENTING — hapus V35a dst.)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => {
        if (k !== CACHE_NAME) {
          console.log('[SW] menghapus cache lama:', k);
          return caches.delete(k);
        }
      })
    )).then(() => self.clients.claim())
  );
});

// 3. Fetch Strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // A. Abaikan API Google Apps Script
  if (url.hostname.includes('script.google.com')) return;

  // B. HTML (Dashboard/Index) -> Network First
  if (event.request.headers.get('accept') &&
      event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
             return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // C. CSS / JS dengan ?v= -> Network First (agar update versi langsung kebawa)
  if (url.search.includes('v=') &&
      (url.pathname.endsWith('.css') || url.pathname.endsWith('.js'))) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // D. Aset Statis Lain -> Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
         if (res.ok && !res.redirected && url.protocol.startsWith('http')) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
         }
         return res;
      });
    })
  );
});
