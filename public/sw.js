const CACHE_NAME = "nns-static-v4";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add("/offline.html"))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("nns-") && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// Only immutable, same-origin static assets are cached. Authenticated pages,
// API responses, and customer data are always fetched from the server.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  const staticAsset = url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:png|jpe?g|svg|ico|webp|woff2?)$/i.test(url.pathname);
  if (staticAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === "basic") await cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      return (await caches.match("/offline.html")) || new Response("You are offline. Reconnect and try again.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }));
  }
});

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (clients.some((client) => client.visibilityState === "visible" && new URL(client.url).pathname.startsWith("/dashboard"))) return;

    let payload = {};
    try { payload = event.data?.json() || {}; } catch { /* Show a generic notification for malformed payloads. */ }
    const path = typeof payload.url === "string" && payload.url.startsWith("/") && !payload.url.startsWith("//") && !payload.url.includes("\\")
      ? payload.url
      : "/dashboard/notifications";
    await self.registration.showNotification("NNS Enterprise", {
      body: "You have a new update. Open NNS to view the details.",
      icon: "/nns-enterprise-icon-192.png",
      badge: "/nns-enterprise-icon-192.png",
      tag: "nns-update",
      renotify: false,
      data: { path },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = typeof event.notification.data?.path === "string" && event.notification.data.path.startsWith("/") && !event.notification.data.path.startsWith("//") && !event.notification.data.path.includes("\\")
    ? event.notification.data.path
    : "/dashboard/notifications";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
