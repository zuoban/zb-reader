"use client";

import { useEffect } from "react";

export function PWARegistration() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            if (registration.installing) {
              console.log("SW installing");
            } else if (registration.waiting) {
              console.log("SW installed, waiting to activate");
            } else if (registration.active) {
              console.log("SW active and controlling");
            }
          })
          .catch((error) => {
            console.error("SW registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}
