// Service worker for offline play. Bump CACHE when assets change.
const CACHE = "lawson-v44-story-ending";
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
      .then((c) => c.addAll(ASSETS))
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

// Cache-first for our own GET assets; pass through everything else.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
