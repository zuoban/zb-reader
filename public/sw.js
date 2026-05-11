import { openDB } from "idb";

const CACHE_VERSION = "v4";
const STATIC_CACHE = `zb-reader-static-${CACHE_VERSION}`;
const ASSET_CACHE = `zb-reader-assets-${CACHE_VERSION}`;
const OFFLINE_PAGE = "/offline.html";

const DB_NAME = "zb-reader-sync-queue";
const DB_VERSION = 2;
const STORE_NAME = "queue";
const QUEUE_KEY = "items";
const SYNC_TAG = "sync-progress";

const IS_LOCAL_DEV = ["localhost", "127.0.0.1", "::1"].includes(self.location.hostname);

const STATIC_ASSETS = ["/logo.svg", "/favicon.ico", "/manifest.json", OFFLINE_PAGE];

// 监听安装事件
self.addEventListener("install", (event) => {
  if (IS_LOCAL_DEV) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 监听激活事件
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== ASSET_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 监听来自客户端的消息
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// 处理请求拦截
self.addEventListener("fetch", (event) => {
  if (IS_LOCAL_DEV) return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match(OFFLINE_PAGE);
        });
      })
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    if (url.pathname.includes("/cover")) {
      event.respondWith(staleWhileRevalidate(event.request, ASSET_CACHE));
      return;
    }
    return;
  }

  if (url.pathname.endsWith(".woff2") || url.pathname.endsWith(".ttf") || url.pathname.includes("/fonts/")) {
    event.respondWith(staleWhileRevalidate(event.request, ASSET_CACHE));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(STATIC_CACHE).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

// --- Background Sync ---

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncProgress());
  }
});

async function syncProgress() {
  try {
    const db = await openDB(DB_NAME, DB_VERSION);
    const queue = await db.get(STORE_NAME, QUEUE_KEY);

    if (!queue || !Array.isArray(queue) || queue.length === 0) {
      return;
    }

    const isBatch = queue.length > 1;
    const route = isBatch ? "/api/progress/batch-sync" : "/api/progress/sync";
    const body = isBatch ? queue : queue[0];

    const response = await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      // Clear queue on success
      await db.put(STORE_NAME, [], QUEUE_KEY);
      console.log("[SW] Progress synced via Background Sync");
    } else {
      throw new Error(`Sync failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error("[SW] Background Sync failed:", error);
    throw error; // Let the browser retry later
  }
}
