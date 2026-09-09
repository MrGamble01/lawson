// Service worker for offline play.
//
// Update strategy (no hand-bumped cache name):
//   - Navigations (index.html) are network-first with the cached shell as
//     the offline fallback, so a deploy is picked up on the next open.
//   - Every other same-origin asset is served from the cache immediately
//     and refreshed in the background (stale-while-revalidate), so new
//     code lands on the second load and offline play keeps working.
// Add new files to ASSETS so the first install precaches them; nothing
// else in this file needs to change for a deploy.
const CACHE = "lawson-static";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
  "./lib/audio.js",
  "./lib/storage.js",
  "./lib/achievements.js",
  "./lib/tutorial.js",
  "./games/pop.js",
  "./games/piano.js",
  "./games/whack.js",
  "./games/doodle.js",
  "./games/color.js",
  "./games/match.js",
  "./games/count.js",
  "./games/memory.js",
  "./games/dots.js",
  "./games/listen.js",
  "./games/pattern.js",
  "./games/find.js",
  "./games/story.js",
  "./games/howmany.js",
  "./games/mix.js",
  "./games/cook.js",
  "./games/dino.js",
  "./games/garden.js",
  "./games/scene.js",
  "./games/farm.js",
  "./games/icecream.js",
  "./games/train.js",
  "./games/music.js",
  "./games/stickers.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // Bypass the HTTP cache so the precache is what the server has now.
      .then((c) => c.addAll(ASSETS.map((a) => new Request(a, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cacheable(res) {
  return res && res.status === 200 && res.type === "basic";
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: true });
    // Fetch by URL: re-wrapping a navigate/no-cors Request with init options
    // throws, which would silently turn every refresh into a cache hit.
    const refresh = fetch(url.href, { cache: "no-cache", credentials: "same-origin" })
      .then((res) => {
        if (cacheable(res)) cache.put(req, res.clone());
        return res;
      })
      .catch(() => null);

    if (req.mode === "navigate") {
      // Fresh page when online; the cached shell when not.
      const fresh = await refresh;
      return fresh || cached || cache.match("./index.html") || Response.error();
    }
    if (cached) {
      e.waitUntil(refresh);
      return cached;
    }
    const fresh = await refresh;
    return fresh || Response.error();
  }));
});
