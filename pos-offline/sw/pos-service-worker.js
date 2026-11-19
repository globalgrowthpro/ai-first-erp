/**
 * Hafez ERP — POS Offline Service Worker
 * Manages asset caching, offline page serving, and background sync tags.
 */

const CACHE_NAME = "hafez-pos-offline-v1";

const ASSETS_TO_CACHE = [
  "/",
  "/pos",
  "/favicon.ico",
  "/manifest.json",
];

// Install Event: Pre-cache critical application shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[POS Service Worker] Pre-caching offline application shell");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up stale legacy caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[POS Service Worker] Removing stale cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache First for assets, Network First with Offline Fallback for APIs
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. Static Assets & Scripts -> Cache First with background refresh
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch update in background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return networkResponse;
        });
      })
    );
    return;
  }

  // 2. Navigation Requests -> Network First, Fallback to Cached /pos
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/pos").then((cached) => cached || caches.match("/"));
      })
    );
    return;
  }

  // 3. All other requests -> Network with graceful offline error response
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response(JSON.stringify({ offline: true, message: "Network unavailable" }), {
        headers: { "Content-Type": "application/json" },
        status: 503,
      });
    })
  );
});

// Background Sync Event: Triggered automatically by browser when connection restores
self.addEventListener("sync", (event) => {
  if (event.tag === "pos-sync-outbox") {
    console.log("[POS Service Worker] Background sync event triggered: pos-sync-outbox");
    // Broadcast to all active tabs to trigger engine sync
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "TRIGGER_OUTBOX_SYNC" });
      });
    });
  }
});
