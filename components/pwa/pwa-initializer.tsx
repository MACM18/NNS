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

    // Register the service worker
    registerServiceWorker();

    // Handle beforeinstallprompt to allow custom install flow
    const onBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      // @ts-ignore - event is a BeforeInstallPromptEvent
      e.preventDefault?.();
      // eslint-disable-next-line no-console
      console.info(
        "[PWA] beforeinstallprompt fired; you can prompt the user later."
      );
      // Optionally store the event on window for later use
      // @ts-ignore
      window.__NNS_DEFERRED_PROMPT = e;
    };

    // Reload page when new service worker takes control
    const onControllerChange = () => {
      // eslint-disable-next-line no-console
      console.info(
        "[PWA] Service worker controller changed; reloading to activate new SW."
      );
      try {
        window.location.reload();
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener(
      "beforeinstallprompt",
      onBeforeInstallPrompt as EventListener
    );
    navigator.serviceWorker.addEventListener?.(
      "controllerchange",
      onControllerChange
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstallPrompt as EventListener
      );
      navigator.serviceWorker.removeEventListener?.(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  return null;
}
