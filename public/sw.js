const CACHE_NAME = "nns-telecom-cache-v1";
const PRECACHE_URLS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  // Don't cache HTML pages to avoid blank page issues
  const url = new URL(request.url);
  const isHTMLRequest =
    request.headers.get("accept")?.includes("text/html") ||
    url.pathname.endsWith(".html") ||
    (!url.pathname.includes(".") && url.pathname !== "/manifest.webmanifest");

  if (isHTMLRequest) {
    // Always fetch HTML from network
    event.respondWith(
      fetch(request).catch(() => {
        // Only use cache as fallback for HTML
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || caches.match("/");
        });
      })
    );
    return;
  }

  // For static assets, use cache-first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          if (
            !response ||
            response.status !== 200 ||
            response.type === "opaque" ||
            request.url.startsWith("chrome-extension")
          ) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => caches.match(request));
    })
  );
});
