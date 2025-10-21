"use client";

import { useEffect } from "react";

const SERVICE_WORKER_PATH = "/sw.js";

export function PWAInitializer() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          SERVICE_WORKER_PATH,
          { scope: "/" }
        );

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // eslint-disable-next-line no-console
              console.info("[PWA] New version available. Reload to update.");
            }
          });
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[PWA] Service worker registration failed", error);
      }
    };

    registerServiceWorker();
  }, []);

  return null;
}
