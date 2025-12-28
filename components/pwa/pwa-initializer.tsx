"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";

const SERVICE_WORKER_PATH = "/sw.js";

export function PWAInitializer() {
  const [canInstall, setCanInstall] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Check online status
    setIsOnline(navigator.onLine);

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          SERVICE_WORKER_PATH,
          { scope: "/" }
        );

        console.info("[PWA] Service worker registered successfully");

        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update();
        }, 60000);

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.info("[PWA] New version available");
              setUpdateAvailable(true);
            }
          });
        });
      } catch (error) {
        console.error("[PWA] Service worker registration failed", error);
      }
    };

    // Register the service worker
    registerServiceWorker();

    // Handle beforeinstallprompt to allow custom install flow
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault?.();
      console.info("[PWA] Install prompt available");
      // @ts-ignore
      window.__NNS_DEFERRED_PROMPT = e;
      setCanInstall(true);
    };

    // Reload page when new service worker takes control
    const onControllerChange = () => {
      console.info("[PWA] New service worker activated");
      try {
        window.location.reload();
      } catch (err) {
        console.error("[PWA] Reload failed", err);
      }
    };

    // App installed: hide install button and cleanup
    const onAppInstalled = () => {
      console.info("[PWA] App installed successfully");
      setCanInstall(false);
      // @ts-ignore
      if (window.__NNS_DEFERRED_PROMPT) delete window.__NNS_DEFERRED_PROMPT;
    };

    // Online/offline status handlers
    const handleOnline = () => {
      console.info("[PWA] Back online");
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.info("[PWA] Gone offline");
      setIsOnline(false);
    };

    // Event listeners
    window.addEventListener(
      "beforeinstallprompt",
      onBeforeInstallPrompt as EventListener
    );
    navigator.serviceWorker.addEventListener?.(
      "controllerchange",
      onControllerChange
    );
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

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
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    // @ts-ignore
    const deferred = window.__NNS_DEFERRED_PROMPT;
    if (!deferred) return;

    try {
      // @ts-ignore
      await deferred.prompt();
      // @ts-ignore
      const choice = await deferred.userChoice;
      console.info("[PWA] User install choice:", choice.outcome);

      if (choice.outcome === "accepted") {
        console.info("[PWA] User accepted the install prompt");
      }
    } catch (err) {
      console.error("[PWA] Error prompting for install", err);
    } finally {
      setCanInstall(false);
      // @ts-ignore
      if (window.__NNS_DEFERRED_PROMPT) delete window.__NNS_DEFERRED_PROMPT;
    }
  };

  const handleUpdateClick = () => {
    setUpdateAvailable(false);
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
  };

  const dismissInstall = () => {
    setCanInstall(false);
  };

  return (
    <>
      {/* Install Prompt */}
      {canInstall && (
        <div className='fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5'>
          <div className='bg-card border border-border rounded-lg shadow-lg p-4'>
            <button
              onClick={dismissInstall}
              className='absolute top-2 right-2 p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors'
              aria-label='Dismiss'
            >
              <X className='h-4 w-4' />
            </button>
            <div className='flex items-start gap-3 pr-6'>
              <div className='flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center'>
                <Download className='h-5 w-5 text-primary' />
              </div>
              <div className='flex-1'>
                <h3 className='font-semibold text-sm mb-1'>
                  Install NNS Telecom
                </h3>
                <p className='text-xs text-muted-foreground mb-3'>
                  Install the app for quick access and offline functionality
                </p>
                <button
                  onClick={handleInstallClick}
                  className='w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-2 text-sm font-medium transition-colors'
                >
                  Install App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Available Prompt */}
      {updateAvailable && (
        <div className='fixed top-4 right-4 z-50 max-w-sm animate-in slide-in-from-top-5'>
          <div className='bg-card border border-border rounded-lg shadow-lg p-4'>
            <button
              onClick={dismissUpdate}
              className='absolute top-2 right-2 p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors'
              aria-label='Dismiss'
            >
              <X className='h-4 w-4' />
            </button>
            <div className='flex items-start gap-3 pr-6'>
              <div className='flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center'>
                <RefreshCw className='h-5 w-5 text-blue-500' />
              </div>
              <div className='flex-1'>
                <h3 className='font-semibold text-sm mb-1'>Update Available</h3>
                <p className='text-xs text-muted-foreground mb-3'>
                  A new version is ready. Reload to update.
                </p>
                <button
                  onClick={handleUpdateClick}
                  className='w-full bg-blue-500 text-white hover:bg-blue-600 rounded-md px-3 py-2 text-sm font-medium transition-colors'
                >
                  Reload Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className='fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 backdrop-blur-sm text-yellow-900 px-4 py-2 text-center text-sm font-medium animate-in slide-in-from-top-2'>
          📡 You're currently offline. Some features may be limited.
        </div>
      )}
    </>
  );
}
