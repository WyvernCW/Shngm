const CACHE_NAME = 'vrtwel-static-v1';
const IMAGE_CACHE_NAME = 'vrtwel-images-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/logo.png',
  '/assets/covers/standard.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== IMAGE_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 1. Dynamic Cache-First Interceptor for Image Proxy requests
  if (url.pathname.includes('/api/image-proxy')) {
    e.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(e.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        try {
          const networkResponse = await fetch(e.request);
          if (networkResponse.ok) {
            cache.put(e.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          const placeholder = await caches.match('/assets/covers/standard.svg');
          if (placeholder) return placeholder;
          throw err;
        }
      })
    );
    return;
  }

  // 2. Stale-While-Revalidate and fallback for static resources & assets
  e.respondWith(
    caches.match(e.request).then(async (cachedResponse) => {
      if (cachedResponse) {
        // Quietly background-update the cache
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(e.request);
        // Cache statics dynamically on-the-fly
        if (networkResponse.ok && (
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.includes('/assets/') ||
          url.host.includes('fonts.gstatic.com') ||
          url.host.includes('fonts.googleapis.com')
        )) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(e.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        if (e.request.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        throw err;
      }
    })
  );
});
