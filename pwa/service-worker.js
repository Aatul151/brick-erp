self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Required injection point for next-pwa InjectManifest.
// We intentionally do not call precacheAndRoute().
void self.__WB_MANIFEST;

// Intentionally no fetch handler and no runtime caching.
// This keeps installability support while avoiding offline behavior.
