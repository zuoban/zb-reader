const CACHE_VERSION = "v3";
const STATIC_CACHE = `zb-reader-static-${CACHE_VERSION}`;
const ASSET_CACHE = `zb-reader-assets-${CACHE_VERSION}`;
const OFFLINE_PAGE = "/offline.html";

const IS_LOCAL_DEV = ["localhost", "127.0.0.1", "::1"].includes(self.location.hostname);

const STATIC_ASSETS = [
  "/logo.svg",
  "/favicon.ico",
  "/manifest.json",
  OFFLINE_PAGE
];

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

// 监听来自客户端的消息 (如 SKIP_WAITING)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// 处理请求拦截
self.addEventListener("fetch", (event) => {
  if (IS_LOCAL_DEV) return;

  const url = new URL(event.request.url);

  // 仅处理同源请求
  if (url.origin !== self.location.origin) return;

  // 1. 导航请求：网络优先，离线回退
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

  // 2. 忽略 API 请求 (除了书籍封面)
  if (url.pathname.startsWith("/api/")) {
    if (url.pathname.includes("/cover")) {
      // 封面图：Stale-While-Revalidate
      event.respondWith(staleWhileRevalidate(event.request, ASSET_CACHE));
      return;
    }
    return;
  }

  // 3. 字体文件：Stale-While-Revalidate
  if (url.pathname.endsWith(".woff2") || url.pathname.endsWith(".ttf") || url.pathname.includes("/fonts/")) {
    event.respondWith(staleWhileRevalidate(event.request, ASSET_CACHE));
    return;
  }

  // 4. 静态资源：缓存优先
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

/**
 * Stale-While-Revalidate 策略
 */
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
