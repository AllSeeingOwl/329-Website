// Minimal service worker: satisfies the PWA registration in app.js without caching anything,
// so phase changes and file updates are always served fresh from the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
