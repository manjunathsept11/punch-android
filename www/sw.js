const CACHE_NAME = "punch-shell-v1";
const SHELL_ASSETS = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// API calls (instruments, positions, punch, ws, etc.) and anything cross-origin always go
// straight to the network — this app must never show stale trading data from a cache.
// Only the static app shell (JS/CSS bundle, manifest, icons) is cache-first, for fast loads.
const API_PATHS = [
  "/instruments",
  "/expiries",
  "/option-chain",
  "/presets",
  "/punch",
  "/positions",
  "/kill-switch",
  "/pnl",
  "/orders",
  "/ws",
  "/health",
];

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isApi = API_PATHS.some((p) => url.pathname.startsWith(p));

  if (isApi || url.origin !== self.location.origin) {
    return; // let the browser handle it normally, no caching involved
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
