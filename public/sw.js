// Deliberately cache only a public offline shell. No authenticated HTML, RSC or API caching.
const CACHE = "fitness-public-v1";
const PUBLIC_FILES = [
  "/offline.html",
  "/offline.css",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PUBLIC_FILES)),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("fitness-public-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  if (PUBLIC_FILES.includes(url.pathname) && !url.search) {
    event.respondWith(
      caches
        .open(CACHE)
        .then(
          async (cache) =>
            (await cache.match(event.request)) || fetch(event.request),
        ),
    );
  } else if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline.html")),
    );
  }
});
