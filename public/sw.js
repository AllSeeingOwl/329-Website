const CACHE_NAME = '3minsto9-cache-v1';

// We'll cache all HTML files, CSS, JS, and some other assets.
const urlsToCache = [
  '/',
  '/index.html',
  '/404.html',
  '/business-privacy-policy.html',
  '/business-terms-of-service.html',
  '/online-selling-policies.html',
  '/developer-blog.html',
  '/GRETCHEN_DOSSIER.txt',
  '/in-universe-404-error.html',
  '/mltk-boot-sequence.html',
  '/mltk-classified-document.html',
  '/mltk-customer-service.html',
  '/mltk-five-finger-wheel.html',
  '/mltk-login-gate.html',
  '/mltk-privacy-policy.html',
  '/mltk-surveillance-dashboard.html',
  '/mltk-timer.html',
  '/nova-classified-archive.html',
  '/nova-parent-directory.html',
  '/ollies-radio-scanner.html',
  '/releases.html',
  '/secure-data-drop-page.html',
  '/studio-contact-us.html',
  '/studio-faq.html',
  '/studio-manifesto-page.html',
  '/studio-press-kit.html',
  '/studio-puzzles-explained.html',
  '/studio-team.html',
  '/surface-home-page.html',
  '/system-override.html',
  '/velvet-rope-landing-page.html',
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
          if (event.request.mode === 'navigate') {
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
