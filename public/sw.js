/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const CACHE_NAME = 'bellacosta-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Add assets individually to prevent a single failure from blocking the installation
      return Promise.allSettled(
        ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`Failed to cache asset: ${asset}`, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isUnsplash = url.hostname.includes('images.unsplash.com');

  // Skip intercepting for API routes, SSE stream, or unconfigured backend requests
  if (url.pathname.includes('/api/') || url.pathname.includes('/stream')) {
    return;
  }

  // Skip intercepting for third-party requests (like Supabase, auth, external metrics) except Unsplash images
  if (!isSameOrigin && !isUnsplash) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache external image URLs from Unsplash for seamless offline displays
        if (isUnsplash && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }); // No catch-all returning undefined, let network errors propagate naturally so the browser knows we are offline
    })
  );
});
