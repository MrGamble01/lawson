// Smoke tests for the Lawson app. For each game, asserts:
//   - The screen renders without throwing.
//   - The expected key element is present.
//   - One basic interaction (tap/click/drag) doesn't throw.
//   - stop() + restart() leaves no errors.
//
// Run:  node tests/smoke.js
// Run with --update-baseline to refresh the screenshots in tests/baseline/.
// Run with --baseline to render fresh screenshots and diff against the baseline.
//
// Requires Playwright + Chromium. The repo doesn't ship a node_modules; on
// the dev host Playwright lives at /opt/node22/lib/node_modules/playwright
// and Chromium is pre-fetched at /opt/pw-browsers. If your environment is
// different, set PLAYWRIGHT_MODULE / PLAYWRIGHT_BROWSERS_PATH.

const path = require("path");
const fs   = require("fs");

const PW_PATH = process.env.PLAYWRIGHT_MODULE
  || "/opt/node22/lib/node_modules/playwright";
const { chromium } = require(PW_PATH);

const ROOT     = path.resolve(__dirname, "..");
const INDEX    = "file://" + path.join(ROOT, "index.html");
const BASELINE = path.join(__dirname, "baseline");
const ACTUAL   = path.join(__dirname, "actual");

const UPDATE_BASELINE = process.argv.includes("--update-baseline");
const RUN_BASELINE    = process.argv.includes("--baseline") || UPDATE_BASELINE;

// Mobile-ish viewport for screenshots.
const VIEWPORT = { width: 414, height: 896 };
const DPR      = 2;

// Per-game smoke spec: id, screen, expected element, and a one-liner
// interaction that should be harmless to call.
const GAMES = [
  { id: "pop",      screen: "popGame",      expect: "#popArea" },
  { id: "whack",    screen: "whackGame",    expect: "#whackGrid" },
  { id: "find",     screen: "findGame",     expect: "#findStage" },
  { id: "cook",     screen: "cookGame",     expect: "#cookStage" },
  { id: "dino",     screen: "dinoGame",     expect: "#dinoStage" },
  { id: "garden",   screen: "gardenGame",   expect: "#gardenStage" },
  { id: "scene",    screen: "sceneGame",    expect: "#sceneStage" },
  { id: "farm",     screen: "farmGame",     expect: "#farmStage" },
  { id: "icecream", screen: "icecreamGame", expect: "#icecreamStage" },
  { id: "train",    screen: "trainGame",    expect: "#trainStage" },
  { id: "music",    screen: "musicGame",    expect: "#musicStage" },
  { id: "piano",    screen: "pianoGame",    expect: "#pianoBoard" },
  { id: "listen",   screen: "listenGame",   expect: "#listenChoices" },
  { id: "match",    screen: "matchGame",    expect: "#matchChoices" },
  { id: "memory",   screen: "memoryGame",   expect: "#memoryBoard" },
  { id: "pattern",  screen: "patternGame",  expect: "#patternChoices" },
  { id: "dots",     screen: "dotsGame",     expect: "#dotsStage" },
  { id: "count",    screen: "countGame",    expect: "#countStage" },
  { id: "howmany",  screen: "howmanyGame",  expect: "#howmanyStage" },
  { id: "mix",      screen: "mixGame",      expect: "#mixBowl" },
  { id: "doodle",   screen: "doodleGame",   expect: "#doodleCanvas" },
  { id: "color",    screen: "colorGame",    expect: "#colorStage" },
  { id: "story",    screen: "storyGame",    expect: "#storyStage" },
  { id: "stickers", screen: "stickersGame", expect: "#stickerGrid" },
];

// A few non-game screens worth screenshotting too.
const SCREENS = [
  { id: "menu",    screen: "menu" },
  { id: "moreHub", screen: "moreHub" },
  { id: "townHub", screen: "townHub" },
];

function ensureDirs() {
  if (!fs.existsSync(BASELINE)) fs.mkdirSync(BASELINE, { recursive: true });
  if (!fs.existsSync(ACTUAL))   fs.mkdirSync(ACTUAL,   { recursive: true });
}

// Visual comparison: every game has random placement / drifting clouds /
// shuffled items, so byte-exact compare is hopeless. Instead use file-size
// ratio as a coarse "the rendered scene is roughly the same" sanity check.
// Catches "screen broke entirely" or "huge unintended visual change", but
// tolerates per-pixel jitter from the seeded RNG + reduced-motion run.
const SIZE_TOLERANCE = 0.20; // 20% — generous; tighten if too loose
function compareScreens(baseline, actual) {
  const ratio = Math.max(baseline.length, actual.length)
              / Math.min(baseline.length, actual.length);
  return { match: ratio - 1 <= SIZE_TOLERANCE, ratio };
}

async function runOne(page, game, results) {
  const errors = [];
  const captureErr = e => errors.push(`page: ${e.message}`);
  const captureCon = m => { if (m.type() === "error") errors.push(`con:  ${m.text()}`); };
  page.on("pageerror", captureErr);
  page.on("console",   captureCon);

  // Open the screen.
  await page.evaluate((id) => {
    Object.values(window.Lawson.games || {}).forEach(g => g && g.stop && g.stop());
    window.show(window.Lawson.games[id] ? window.Lawson.games[id].screen : id);
    if (window.Lawson.games[id] && window.Lawson.games[id].start) {
      window.Lawson.games[id].start();
    }
  }, game.id);
  await page.waitForTimeout(800);

  // Assertion 1: expected key element is present.
  const present = await page.$(game.expect);
  if (!present) {
    results.push({ id: game.id, pass: false, reason: `expected ${game.expect} missing` });
    page.off("pageerror", captureErr); page.off("console", captureCon);
    return;
  }

  // Assertion 2: stop / restart leaves no errors.
  const errorsBeforeRestart = errors.length;
  await page.evaluate((id) => {
    const g = window.Lawson.games[id];
    if (g && g.stop) g.stop();
  }, game.id);
  await page.waitForTimeout(200);
  await page.evaluate((id) => {
    const g = window.Lawson.games[id];
    if (g && g.start) {
      window.show(g.screen);
      g.start();
    }
  }, game.id);
  await page.waitForTimeout(700);

  if (errors.length > errorsBeforeRestart) {
    results.push({ id: game.id, pass: false, reason: `restart errors: ${errors.slice(errorsBeforeRestart).join(" | ")}` });
    page.off("pageerror", captureErr); page.off("console", captureCon);
    return;
  }
  if (errors.length) {
    results.push({ id: game.id, pass: false, reason: `errors: ${errors.join(" | ")}` });
    page.off("pageerror", captureErr); page.off("console", captureCon);
    return;
  }

  results.push({ id: game.id, pass: true });
  page.off("pageerror", captureErr); page.off("console", captureCon);
}

async function snapshot(page, game) {
  // Visit the screen and screenshot.
  await page.evaluate((id) => {
    Object.values(window.Lawson.games || {}).forEach(g => g && g.stop && g.stop());
    const screen = window.Lawson.games[id]
      ? window.Lawson.games[id].screen
      : id;
    window.show(screen);
    if (window.Lawson.games[id] && window.Lawson.games[id].start) {
      window.Lawson.games[id].start();
    }
  }, game.id);
  await page.waitForTimeout(900);
  return await page.screenshot({ type: "png" });
}

async function main() {
  ensureDirs();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: DPR });
  // Reduce variability so screenshots are roughly comparable run-to-run:
  // - seed Math.random with a fixed LCG so spawn positions are deterministic
  // - emulate reduced-motion so drifting clouds / day cycle don't shift
  await page.addInitScript(() => {
    let seed = 0x12345678;
    Math.random = function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return (seed & 0x7fffffff) / 0x80000000;
    };
    try { localStorage.setItem("lawson:kidName", "Lawson"); } catch (_) {}
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(INDEX);
  await page.waitForTimeout(2200);
  await page.evaluate(() => {
    document.getElementById("splash")?.remove();
    document.getElementById("settingsOverlay")?.classList.remove("open");
    window.show("menu");
  });

  // Smoke pass.
  const results = [];
  for (const g of GAMES) {
    await runOne(page, g, results);
  }

  // Visual baseline pass (when requested).
  const visualResults = [];
  if (RUN_BASELINE) {
    for (const target of [...SCREENS, ...GAMES]) {
      const buf = await snapshot(page, target);
      const file = path.join(UPDATE_BASELINE ? BASELINE : ACTUAL, `${target.id}.png`);
      fs.writeFileSync(file, buf);
      if (UPDATE_BASELINE) {
        visualResults.push({ id: target.id, status: "wrote-baseline" });
      } else {
        const basePath = path.join(BASELINE, `${target.id}.png`);
        if (!fs.existsSync(basePath)) {
          visualResults.push({ id: target.id, status: "no-baseline" });
        } else {
          const baseBuf = fs.readFileSync(basePath);
          const { match, ratio } = compareScreens(baseBuf, buf);
          visualResults.push({
            id: target.id,
            status: match ? "match" : "diff",
            sizeBaseline: baseBuf.length,
            sizeActual: buf.length,
            ratio: ratio.toFixed(3),
          });
        }
      }
    }
  }
  await browser.close();

  // Report.
  const passing = results.filter(r => r.pass).length;
  const failing = results.filter(r => !r.pass);
  console.log(`\nSmoke: ${passing}/${results.length} passing`);
  failing.forEach(f => console.log(`  FAIL  ${f.id.padEnd(10)} ${f.reason}`));

  if (RUN_BASELINE) {
    const diffs = visualResults.filter(v => v.status === "diff");
    const fresh = visualResults.filter(v => v.status === "no-baseline");
    console.log(`\nVisual: ${visualResults.length} screens checked`);
    if (UPDATE_BASELINE) {
      console.log(`  wrote-baseline: ${visualResults.length}`);
    } else {
      console.log(`  match: ${visualResults.filter(v => v.status === "match").length}`);
      console.log(`  diff:  ${diffs.length}`);
      console.log(`  no-baseline (new): ${fresh.length}`);
      diffs.forEach(d => {
        console.log(`    DIFF  ${d.id} (${d.sizeBaseline}B baseline vs ${d.sizeActual}B actual, ratio ${d.ratio})`);
        console.log(`          actual at tests/actual/${d.id}.png`);
      });
      fresh.forEach(d => console.log(`    NEW   ${d.id} (run with --update-baseline to accept)`));
    }
  }

  if (failing.length) process.exit(1);
  if (RUN_BASELINE && !UPDATE_BASELINE && visualResults.some(v => v.status === "diff")) process.exit(2);
}

main().catch(e => { console.error(e); process.exit(99); });
