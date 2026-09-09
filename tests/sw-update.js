// The service worker must pick up a deploy without anyone editing sw.js:
//   - a changed asset is refreshed in the background on the first load
//     after the deploy and runs on the second (stale-while-revalidate);
//   - a changed index.html shows on the very next load (network-first);
//   - offline, the whole app still boots from the cache.
// Serves a temporary copy of the repo over HTTP (service workers need a
// real origin), edits files on disk between loads, and checks in Chromium.
//
// Run: node tests/sw-update.js
const { chromium } = require(resolvePlaywright());
function resolvePlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return process.env.PLAYWRIGHT_MODULE;
  try { return require.resolve("playwright"); } catch (_) { /* no local install */ }
  return "/opt/node22/lib/node_modules/playwright";
}
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };

function copySite() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lawson-sw-"));
  for (const f of ["index.html", "styles.css", "app.js", "manifest.json", "icon.svg", "sw.js"]) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  for (const sub of ["lib", "games"]) {
    fs.mkdirSync(path.join(dir, sub));
    for (const f of fs.readdirSync(path.join(ROOT, sub))) fs.copyFileSync(path.join(ROOT, sub, f), path.join(dir, sub, f));
  }
  return dir;
}

function serve(root) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("not found"); }
    // A long max-age, like a CDN: the worker must bypass it to refresh.
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "public, max-age=3600" });
    res.end(fs.readFileSync(f));
  });
  return new Promise((resolve) => srv.listen(0, "127.0.0.1", () => resolve(srv)));
}

(async () => {
  const site = copySite();
  const srv = await serve(site);
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  let page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Each "open" is a fresh page, as when the kid taps the home-screen icon
  // again. Reloading the same tab is not the same thing: Chromium's
  // in-renderer memory cache hands back still-fresh subresources before the
  // service worker is consulted, so a same-tab reload would keep running the
  // old asset even though the worker has already refreshed the cache.
  const open = async (settleMs) => {
    const old = page;
    page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await old.close();
    await page.goto(url);
    await page.waitForTimeout(settleMs);
  };
  const results = [];
  const check = (ok, label) => { results.push([ok, label]); console.log(`${ok ? "ok  " : "FAIL"} ${label}`); };

  try {
    await page.goto(url);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 });
    await page.waitForTimeout(500);
    const precached = await page.evaluate(async () => (await (await caches.open("lawson-static")).keys()).length);
    check(precached >= 30, `first load installs the worker and precaches the app (${precached} entries)`);

    // Deploy #1: an asset changes, sw.js does not.
    const storage = path.join(site, "lib/storage.js");
    fs.writeFileSync(storage, fs.readFileSync(storage, "utf8") + '\nwindow.__SW_TEST_MARK = "v2";\n');
    await open(1200);
    const afterOne = await page.evaluate(async () => ({
      ran: window.__SW_TEST_MARK || null,
      cached: (await (await (await caches.open("lawson-static")).match("./lib/storage.js")).text()).includes("__SW_TEST_MARK"),
    }));
    check(afterOne.cached, "changed asset is refreshed into the cache on the first load after a deploy");
    await open(800);
    const afterTwo = await page.evaluate(() => window.__SW_TEST_MARK || null);
    check(afterTwo === "v2", "changed asset runs on the second load (no sw.js edit needed)");

    // Deploy #2: index.html changes.
    const index = path.join(site, "index.html");
    fs.writeFileSync(index, fs.readFileSync(index, "utf8").replace("<head>", '<head><meta name="sw-test" content="v2" />'));
    await open(500);
    check(await page.evaluate(() => !!document.querySelector('meta[name="sw-test"]')), "changed index.html shows on the very next load (network-first)");

    // Offline: everything comes from the cache.
    await ctx.setOffline(true);
    await open(800);
    const games = await page.evaluate(() => window.Lawson ? Object.keys(window.Lawson.games).length : 0);
    check(games === 24, `offline, the app boots from the cache with all games (${games})`);
    await ctx.setOffline(false);
    check(errors.length === 0, `no page errors (${errors.join("; ") || "none"})`);
  } finally {
    await browser.close();
    srv.close();
    fs.rmSync(site, { recursive: true, force: true });
  }
  const failed = results.filter(([ok]) => !ok);
  if (failed.length) { console.error(`FAIL: service worker update — ${failed.length} check(s) failed`); process.exit(1); }
  console.log("PASS: service worker update — background asset refresh, network-first page, offline boot");
})().catch((e) => { console.error("Test runner crashed:", e); process.exit(99); });
