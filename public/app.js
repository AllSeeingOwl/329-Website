// Initialize Vercel Web Analytics
import { inject } from '@vercel/analytics';
inject();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      () => {},
      (err) => {
        console.error('ServiceWorker registration failed: ', err);
      }
    );
  });
}
