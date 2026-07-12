const CACHE = "nyx-v1";
const ASSETS = ["/nyx/index.html","/nyx/nyx-config.js","/nyx/nyx-qvac.js","/nyx/nyx-trade.js","/nyx/nyx-mark.svg","/nyx/icon-192.png","/nyx/icon-512.png"];
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {}))); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res && res.status === 200 && e.request.method === "GET" && url.pathname.startsWith("/nyx/")) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match("/nyx/index.html"))));
});
