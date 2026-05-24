// Tubetune service worker — minimal offline shell cache
const CACHE = "tubetune-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.svg", "/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Don't cache cross-origin media or APIs
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        const cached = await cache.match(req);
        if (cached) return cached;
        // SPA fallback
        if (req.mode === "navigate") {
          const root = await cache.match("/");
          if (root) return root;
        }
        return new Response("Offline", { status: 503 });
      }
    })()
  );
});
