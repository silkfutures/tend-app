// ── SilkFutures Pathways — Service Worker ──
// This service worker unregisters itself and clears all caches.
// No more stale code after deploys.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Clear all caches
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      ),
      // Unregister this service worker
      self.registration.unregister(),
    ]).then(() => {
      // Tell all clients to reload so they get fresh code
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      });
    })
  );
});
