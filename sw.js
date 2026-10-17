// Psybeam's site, kept on the device (tools/build_site.py fills in BUILD): the landing page and the game client.
// Each is fetched fresh when the site answers (so a new build reaches everyone), and served from here when it
// doesn't (down, or no network), so invite links and QR codes still open the game. The game itself never comes
// from here: it talks straight to the host's server, and keeps the host's files in a cache of its own
// ("psybeam-files-sealed"), which this leaves alone.
const CACHE = "psybeam-site-0.1.446-b61fba0d38";
const SHELL = ["./", "play/", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
const WAIT_MS = 4000;  // (the site this slow: the kept copy, rather than waiting on)

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("psybeam-site-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // (asking the site every time: its pages may be kept 10 minutes, and a new build mustn't wait on that)
    const fresh = fetch(url.href, {cache: "no-cache"}).then(r => {
      if (r.ok) cache.put(e.request, r.clone()).catch(() => {});
      return r;
    });
    const late = new Promise(ok => setTimeout(ok, WAIT_MS, null));
    const r = await Promise.race([fresh.catch(() => null), late]);
    if (r && r.ok) return r;
    return (await cache.match(e.request, {ignoreSearch: true})) || r || fresh;
  })());
});
