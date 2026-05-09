const CACHE_NAME = "zb-reader-v1";
const OFFLINE_PAGE = "/offline.html";
const IS_LOCAL_DEV = ["localhost", "127.0.0.1", "::1"].includes(self.location.hostname);
const ASSETS_TO_CACHE = [
  "/",
  "/bookshelf",
  "/logo.svg",
  "/favicon.ico",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  if (IS_LOCAL_DEV) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Non-critical: some assets may fail to cache
        console.warn("[SW] Failed to cache some assets during install");
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      if (IS_LOCAL_DEV) {
        const clearCaches = Promise.all(cacheNames.map((name) => caches.delete(name)));
        return Promise.all([clearCaches, self.registration.unregister()]);
      }
      const clearCaches = Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      return clearCaches;
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (IS_LOCAL_DEV) return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Navigation requests: network-first with offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match(OFFLINE_PAGE);
          });
        })
    );
    return;
  }

  // Skip API requests
  if (event.request.url.includes("/api/")) return;

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});
