"use client";

import { useEffect, useState } from "react";

const SERVICE_WORKER_PATH = "/sw.js";

export function PWAInitializer() {
  const [canInstall, setCanInstall] = useState(false);

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
      // Store the event on window for later use and show install affordance
      // @ts-ignore
      window.__NNS_DEFERRED_PROMPT = e;
      setCanInstall(true);
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

    // App installed: hide install button and cleanup
    const onAppInstalled = () => {
      // eslint-disable-next-line no-console
      console.info("[PWA] App installed");
      setCanInstall(false);
      // @ts-ignore
      if (window.__NNS_DEFERRED_PROMPT) delete window.__NNS_DEFERRED_PROMPT;
    };

    window.addEventListener(
      "beforeinstallprompt",
      onBeforeInstallPrompt as EventListener
    );
    navigator.serviceWorker.addEventListener?.(
      "controllerchange",
      onControllerChange
    );
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstallPrompt as EventListener
      );
      navigator.serviceWorker.removeEventListener?.(
        "controllerchange",
        onControllerChange
      );
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  // Small in-app install button to trigger the saved prompt when available.
  const handleInstallClick = async () => {
    // @ts-ignore
    const deferred = window.__NNS_DEFERRED_PROMPT;
    if (!deferred) return;

    try {
      // @ts-ignore
      deferred.prompt();
      // @ts-ignore
      const choice = await deferred.userChoice;
      // eslint-disable-next-line no-console
      console.info("[PWA] User choice for install:", choice);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[PWA] Error prompting for install", err);
    } finally {
      setCanInstall(false);
      // @ts-ignore
      if (window.__NNS_DEFERRED_PROMPT) delete window.__NNS_DEFERRED_PROMPT;
    }
  };

  return (
    <>
      {canInstall && (
        <div className='fixed right-4 bottom-20 z-50'>
          <button
            onClick={handleInstallClick}
            className='rounded-full bg-primary text-white px-4 py-2 shadow-md hover:brightness-95'
            aria-label='Install app'
          >
            Install App
          </button>
        </div>
      )}
    </>
  );
}
