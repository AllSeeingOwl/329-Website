const CACHE_NAME = '3minsto9-cache-v1';

// We'll cache all HTML files, CSS, JS, and some other assets.
const urlsToCache = [
  '/',
  '/index.html',
  '/404.html',
  '/Business Privacy Policy.html',
  '/Business Terms of Service.html',
  '/Cart.html',
  '/Checkout.html',
  '/Online Selling Policies.html',
  '/Developer Blog.html',
  '/GRETCHEN_DOSSIER.txt',
  '/In-Universe 404 Error.html',
  '/MLTK Boot Sequence.html',
  '/MLTK Classified Document.html',
  '/MLTK Customer Service.html',
  '/MLTK Five Finger Wheel.html',
  '/MLTK Login Gate.html',
  '/MLTK Privacy Policy.html',
  '/MLTK Surveillance Dashboard.html',
  '/MLTK Terms of Service.html',
  '/MLTK Timer.html',
  '/NOVA Classified Archive.html',
  '/NOVA Parent Directory.html',
  '/Ollies Radio Scanner.html',
  '/Procure Physical Artefact.html',
  '/Procure Volume 1.html',
  '/Releases.html',
  '/Secure Data Drop Page.html',
  '/Store.html',
  '/Studio Contact Us.html',
  '/Studio FAQ.html',
  '/Studio Manifesto Page.html',
  '/Studio Press Kit.html',
  '/Studio Puzzles Explained.html',
  '/Studio Team.html',
  '/Surface Home Page.html',
  '/Velvet Rope Landing Page.html',
  '/maintenance.html',
  '/mltk_login_utils.js',
  '/msdos_typing_effect.css',
  '/msdos_typing_effect.js',
  '/nova_archive_utils.js',
  '/radio_scanner_utils.js',
  '/velvet_rope_utils.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      // We use addAll but wrap it in individual adds to prevent one bad URL from failing the whole cache
      return Promise.allSettled(urlsToCache.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Don't intercept API requests if any
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // Clone the request because it's a stream and can only be consumed once
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest)
        .then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Fallback if offline and not in cache
          // Try to return an offline page if applicable or just fail gracefully
          if (event.request.mode === 'navigate') {
            // We could serve an offline.html here if we had one
            // return caches.match('/offline.html');
            return new Response('You are offline and this page is not cached.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain',
              }),
            });
          }
        });
    })
  );
});
