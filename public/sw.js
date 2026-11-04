// Service worker simples: guarda as páginas da portaria e do ingresso em cache
// para abrirem mesmo sem internet. Os dados (lista de ingressos) ficam no
// localStorage do aparelho da portaria.
const CACHE = "vipflow-v1";
const OFFLINE_PAGES = ["/portaria"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(OFFLINE_PAGES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).pathname.startsWith("/api/")) return;
  // rede primeiro, cache como reserva
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/portaria")))
  );
});
