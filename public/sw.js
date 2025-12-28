const CACHE_NAME = "nns-telecom-cache-v2";
const STATIC_CACHE = "nns-static-v2";
const DYNAMIC_CACHE = "nns-dynamic-v2";
const API_CACHE = "nns-api-v2";

// Assets to precache on install
const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/placeholder-logo.png",
  "/dashboard",
];

// Dashboard routes to cache
const DASHBOARD_ROUTES = [
  "/dashboard",
  "/dashboard/inventory",
  "/dashboard/tasks",
  "/dashboard/lines",
  "/dashboard/invoices",
  "/dashboard/settings",
  "/dashboard/users",
  "/dashboard/drums",
  "/dashboard/work-tracking",
];

self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log("[SW] Caching precache URLs");
        return cache.addAll(
          PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" }))
        );
      }),
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("[SW] Static cache opened");
        return cache;
      }),
    ])
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  const validCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => !validCaches.includes(cacheName))
            .map((cacheName) => {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      self.clients.claim(),
    ])
  );
  console.log("[SW] Service worker activated");
});

// Helper function to check if URL is an API request
function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

// Helper function to check if URL is a dashboard route
function isDashboardRoute(url) {
  return url.pathname.startsWith("/dashboard");
}

// Helper function to check if URL is for static assets
function isStaticAsset(url) {
  const staticExtensions = [
    ".js",
    ".css",
    ".png",
    ".jpg",
    ".jpeg",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
  ];
  return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome extensions and other non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // API requests: Network first, cache as fallback
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log("[SW] Serving API from cache:", url.pathname);
              return cachedResponse;
            }
            // Return a JSON error response for failed API calls
            return new Response(
              JSON.stringify({
                error: "Offline - Please try again when connected",
              }),
              {
                status: 503,
                statusText: "Service Unavailable",
                headers: { "Content-Type": "application/json" },
              }
            );
          });
        })
    );
    return;
  }

  // Static assets: Cache first, network fallback
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Dashboard routes: Network first, fallback to cache, then offline page
  if (isDashboardRoute(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log(
                "[SW] Serving dashboard page from cache:",
                url.pathname
              );
              return cachedResponse;
            }
            // Fallback to offline page for dashboard routes
            return caches.match("/offline.html");
          });
        })
    );
    return;
  }

  // HTML pages: Network first with cache fallback
  const acceptHeader = request.headers.get("accept") || "";
  if (acceptHeader.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return (
              cachedResponse ||
              caches.match("/offline.html") ||
              caches.match("/")
            );
          });
        })
    );
    return;
  }

  // Default: Try cache first, then network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
      );
    })
  );
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync event:", event.tag);
  if (event.tag === "sync-data") {
    event.waitUntil(
      // Placeholder for syncing offline data
      Promise.resolve()
    );
  }
});

// Push notification support
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || "New notification from NNS Telecom",
      icon: "/placeholder-logo.png",
      badge: "/placeholder-logo.png",
      vibrate: [200, 100, 200],
      data: data.data || {},
    };
    event.waitUntil(
      self.registration.showNotification(data.title || "NNS Telecom", options)
    );
  }
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || "/dashboard")
  );
});

// Handle messages from the client
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
