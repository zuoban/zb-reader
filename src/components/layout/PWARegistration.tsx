"use client";

import { useEffect } from "react";

export function PWARegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .then(() => caches.keys())
        .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.warn("Failed to clear development service worker cache:", error);
        });
      return;
    }

    const onUpdate = (registration: ServiceWorkerRegistration) => {
      if (!registration.waiting) return;

      void import("sonner").then(({ toast }) => {
        toast("发现新版本", {
          description: "应用已有更新，点击立即刷新体验最新功能。",
          duration: Infinity,
          action: {
            label: "立即更新",
            onClick: () => {
              if (registration.waiting) {
                registration.waiting.postMessage({ type: "SKIP_WAITING" });
              }
              window.location.reload();
            },
          },
        });
      });
    };

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // 检查是否有正在等待的更新
          if (registration.waiting) {
            onUpdate(registration);
          }

          // 监听新 Service Worker 的发现
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  onUpdate(registration);
                }
              });
            }
          });
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error("SW registration failed:", error);
        });
    });

    // 监听控制器更改，确保在 skipWaiting 后刷新
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  return null;
}
