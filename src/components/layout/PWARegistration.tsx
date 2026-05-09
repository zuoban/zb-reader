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

      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            // SW lifecycle logs are useful for debugging PWA behavior
            if (registration.installing) {
              // eslint-disable-next-line no-console
              console.log("SW installing");
            } else if (registration.waiting) {
              // eslint-disable-next-line no-console
              console.log("SW installed, waiting to activate");
            } else if (registration.active) {
              // eslint-disable-next-line no-console
              console.log("SW active and controlling");
            }
          })
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.error("SW registration failed:", error);
          });
      });
  }, []);

  return null;
}
