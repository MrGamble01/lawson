// Accessibility checks for every screen in the Lawson app.
//
//   1. axe-core (vendored in tests/vendor/axe-core) runs on each hub, the
//      Settings dialog, a flashcard activity and every game, with the
//      WCAG 2.0/2.1/2.2 A + AA and best-practice rule sets — in light mode,
//      dark mode, and at iPad portrait / landscape sizes (CONFIGS below).
//   2. Structural checks axe doesn't make: the active screen is a labelled,
//      focusable region; every visible button has a *readable* name (not
//      just an emoji); nothing focusable hides inside aria-hidden; `hidden`
//      really hides; navigation chrome (Home, tabs, badges, tiles, gear) is
//      hit-testable at its centre, i.e. nothing floats on top of it; the
//      caption pill never covers a control or the story text.
//   3. Behaviour: keyboard-only navigation into a game and back (with
//      focus following), the Settings modal (aria-hidden flips, background
//      goes inert, Tab is trapped, Escape closes, focus returns), captions /
//      the live region, mode-tab pressed state, badge names, the
//      reduced-motion switch for particle effects, and the transient
//      overlays (first-visit tutorial hint, sticker toast, all-stickers
//      finale, new-best celebration).
//
// Run:  node tests/a11y.js
// Exit: 0 pass · 1 violations or failed checks · 99 runner crashed.
//
// Requires Playwright + Chromium, same as tests/smoke.js.

const path = require("path");
const fs   = require("fs");

const PW_PATH = process.env.PLAYWRIGHT_MODULE
  || "/opt/node22/lib/node_modules/playwright";
const { chromium } = require(PW_PATH);

const ROOT  = path.resolve(__dirname, "..");
const INDEX = "file://" + path.join(ROOT, "index.html");
const AXE   = fs.readFileSync(path.join(__dirname, "vendor", "axe-core", "axe.min.js"), "utf8");

const CONFIGS = [
  { name: "light · phone portrait",  viewport: { width: 414,  height: 896 }, dark: false },
  { name: "dark · phone portrait",   viewport: { width: 414,  height: 896 }, dark: true },
  { name: "light · iPad portrait",   viewport: { width: 820,  height: 1180 }, dark: false },
  { name: "light · iPad landscape",  viewport: { width: 1180, height: 820 }, dark: false },
];
const HUBS = ["menu", "moreHub", "artHub", "musicHub", "townHub", "brainHub", "libraryHub", "numbersHub", "exploreHub"];

// Rules we deliberately do not enforce, with the reason.
const DISABLED_RULES = {
  // The viewport meta disables pinch-zoom on purpose: a toddler's stray
  // second finger would otherwise zoom the whole playground off-screen.
  // The UI is already very large, and iOS ignores the flag for assistive
  // zoom anyway.
  "meta-viewport": "pinch-zoom is intentionally off for toddlers",
};
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

// Controls that must never be covered by something else (mascots, toasts,
// captions…): checked by hit-testing their centre on every screen.
const CHROME = '.home-btn, .mode-tab, .badge, [data-go], [data-hub], #settingsBtn, #streakBadge';
const CAPTION_SAMPLE = "Hello there! Let's play and discover something wonderful together.";

const failures = [];
function fail(where, what) { failures.push({ where, what }); }
function check(cond, where, what) { if (!cond) fail(where, what); }

// ---- page helpers ------------------------------------------------------

async function boot(browser, config) {
  const page = await browser.newPage({ viewport: config.viewport });
  await page.addInitScript((dark) => {
    try {
      localStorage.setItem("lawson:kidName", "Lawson");
      localStorage.setItem("lawson:dark", dark ? "1" : "0");
    } catch (_) {}
    // Record everything the app says (captions event) for assertions.
    window.__said = [];
    window.addEventListener("lawson:say", (e) => window.__said.push(e.detail.text));
  }, config.dark);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(INDEX);
  await page.waitForTimeout(2200);
  await page.evaluate(() => {
    document.getElementById("splash")?.remove();
    document.querySelector(".welcome-toast")?.remove();
    if (window.__closeSettings) window.__closeSettings();
    window.show("menu");
  });
  await page.addScriptTag({ content: AXE });
  return page;
}

// Open a screen the same way the app does (stop games, show, start).
async function openScreen(page, target) {
  await page.evaluate((t) => {
    Object.values(window.Lawson.games).forEach((g) => g && g.stop && g.stop());
    if (window.__closeSettings) window.__closeSettings();
    document.querySelectorAll(".tutorial-overlay, .sticker-toast, .all-stickers-overlay").forEach((el) => el.remove());
    document.getElementById("bestOverlay").classList.remove("show");
    if (t.kind === "hub") {
      window.show(t.id);
    } else if (t.kind === "settings") {
      window.show("menu");
      window.__openSettings();
    } else if (t.kind === "activity") {
      document.querySelector(`[data-go="${t.id}"]`).click();
    } else {
      const g = window.Lawson.games[t.id];
      window.show(g.screen);
      g.start();
    }
  }, target);
  await page.waitForTimeout(500);
}

async function runAxe(page) {
  return page.evaluate(async (tags) => {
    const r = await axe.run(document, { runOnly: { type: "tag", values: tags } });
    return r.violations.map((v) => ({
      id: v.id, impact: v.impact, help: v.help,
      nodes: v.nodes.map((n) => n.target.join(" ")),
    }));
  }, AXE_TAGS);
}

// Structural checks that don't need axe.
async function structuralChecks(page) {
  return page.evaluate((CHROME) => {
    const out = [];
    const visible = (el) => !!(el.offsetParent || el.getClientRects().length);
    const settingsOpen = document.getElementById("settingsOverlay").classList.contains("open");

    // The active screen is a labelled region and focus lives inside it
    // (or inside the open dialog).
    const active = document.querySelector(".screen.active");
    if (!active) out.push("no active screen");
    else {
      if (!active.getAttribute("aria-label")) out.push(`active screen #${active.id} has no aria-label`);
      if (active.getAttribute("tabindex") !== "-1") out.push(`active screen #${active.id} is not focusable (tabindex=-1)`);
      const ae = document.activeElement;
      const okHome = active.contains(ae) || ae === active
        || (active.id === "menu" && ae === document.body) // fresh boot: nothing navigated yet
        || (settingsOpen && document.getElementById("settingsOverlay").contains(ae))
        || (ae && ae.closest && ae.closest("header, .mascot, .sunny, .menu-cloud"));
      if (!okHome) out.push(`focus is on ${ae && ae.tagName}#${ae && ae.id} outside the active screen #${active.id}`);
    }

    // Every visible button has a readable name (letters or digits, not
    // just an emoji), computed roughly the way assistive tech would.
    const nameOf = (el) => {
      const byId = el.getAttribute("aria-labelledby");
      if (byId) return byId.split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || "").join(" ");
      return el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || "";
    };
    const readable = (s) => /[\p{L}\p{N}]/u.test(s.replace(/[‍️]/g, ""));
    document.querySelectorAll('button, [role="button"]').forEach((el) => {
      if (!visible(el) || el.closest('[aria-hidden="true"]')) return;
      const name = nameOf(el).trim();
      if (!readable(name)) {
        const desc = el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`;
        out.push(`button ${desc} has no readable name (got ${JSON.stringify(name.slice(0, 20))})`);
      }
    });

    // Anything with the `hidden` attribute must really be gone from layout
    // (a display rule on the element's class can otherwise beat it).
    document.querySelectorAll("[hidden]").forEach((el) => {
      if (el.getClientRects().length) out.push(`[hidden] element is still rendered: ${el.tagName.toLowerCase()}#${el.id}`);
    });

    // Nothing keyboard-focusable inside an aria-hidden subtree.
    document.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => {
      hidden.querySelectorAll("button, input, select, a[href], [tabindex]").forEach((el) => {
        if (!visible(el)) return;
        if (el.tabIndex < 0 || el.disabled) return;
        out.push(`focusable ${el.tagName.toLowerCase()}.${[...el.classList].join(".")} inside aria-hidden`);
      });
    });

    // Navigation chrome is hit-testable at its centre: nothing (a mascot,
    // a toast, a caption) floats on top of it. Skipped while the Settings
    // dialog covers the page on purpose.
    if (!settingsOpen) {
      document.querySelectorAll(CHROME).forEach((el) => {
        if (!visible(el)) return;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return;
        const hit = document.elementFromPoint(cx, cy);
        if (!hit || !el.contains(hit)) {
          const desc = (x) => !x ? "nothing" : (x.id ? `#${x.id}` : `${x.tagName.toLowerCase()}.${[...x.classList].join(".")}`);
          out.push(`${desc(el)} is covered at its centre by ${desc(hit)}`);
        }
      });
    }
    return [...new Set(out)];
  }, CHROME);
}

// With captions on, a spoken line must not be drawn over any control or
// over Story Time's own text bubble.
async function captionOverlapCheck(page) {
  return page.evaluate((sample) => {
    const out = [];
    const settingsOpen = document.getElementById("settingsOverlay").classList.contains("open");
    if (settingsOpen) return out; // the dialog covers the page; caption sits behind it
    window.Lawson.setCaptionsEnabled(true);
    window.Lawson.say(sample);
    const cap = document.getElementById("captions").getBoundingClientRect();
    if (cap.width < 40) out.push("caption did not render while captions are on");
    const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const header = document.querySelector("header").getBoundingClientRect();
    if (cap.top < header.top - 1 || cap.bottom > header.bottom + 1) out.push(`caption (${Math.round(cap.top)}–${Math.round(cap.bottom)}px) is not inside the header strip (${Math.round(header.top)}–${Math.round(header.bottom)}px)`);
    document.querySelectorAll('button, [role="button"], .story-bubble, .mode-tabs').forEach((el) => {
      if (!(el.offsetParent || el.getClientRects().length)) return;
      if (el.closest("#captions")) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      if (hits(cap, r)) {
        const desc = el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`;
        out.push(`caption overlaps ${desc}`);
      }
    });
    // Tidy up so the caption doesn't linger into the next screen's checks.
    document.getElementById("captions").classList.remove("show");
    document.body.classList.remove("caption-showing");
    window.Lawson.setCaptionsEnabled(false);
    return [...new Set(out)];
  }, CAPTION_SAMPLE);
}

// ---- behaviour checks ----------------------------------------------------

async function keyboardNavigation(page) {
  const where = "keyboard navigation";
  await openScreen(page, { id: "menu", kind: "hub" });
  await page.focus('[data-go="pop"]');
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check(await page.$eval("#popGame", (el) => el.classList.contains("active")), where, "Enter on the Pop! tile did not open the game");
  check(await page.evaluate(() => document.activeElement === document.getElementById("popGame")),
    where, "focus did not move to the opened game screen");
  await page.keyboard.press("Tab");
  check(await page.evaluate(() => document.activeElement === document.querySelector("#popGame .home-btn")),
    where, "first Tab inside a game did not land on the Home button");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check(await page.$eval("#menu", (el) => el.classList.contains("active")), where, "Enter on Home did not return to the menu");
  check(await page.evaluate(() => document.activeElement === document.querySelector('[data-go="pop"]')),
    where, "focus did not return to the tile that opened the game");

  // Hubs: open, then Home puts focus back on the section (the tile that
  // opened a game inside the hub is no longer on screen).
  await page.focus('[data-hub="moreHub"]');
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check(await page.$eval("#moreHub", (el) => el.classList.contains("active")), where, "Enter on More did not open the hub");
  await page.focus('#moreHub [data-hub="artHub"]');
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await page.focus('#artHub [data-go="doodle"]');
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check(await page.$eval("#doodleGame", (el) => el.classList.contains("active")), where, "Enter on Doodle tile did not open the game");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check(await page.evaluate(() => document.activeElement === document.getElementById("menu")),
    where, "returning home from a hub game should focus the menu screen");
}

async function settingsModal(page) {
  const where = "settings modal";
  await openScreen(page, { id: "menu", kind: "hub" });
  await page.focus("#settingsBtn");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  const state = await page.evaluate(() => ({
    open: document.getElementById("settingsOverlay").classList.contains("open"),
    hidden: document.getElementById("settingsOverlay").getAttribute("aria-hidden"),
    modal: document.querySelector(".settings-panel").getAttribute("aria-modal"),
    labelled: !!document.getElementById(document.querySelector(".settings-panel").getAttribute("aria-labelledby") || ""),
    appInert: document.getElementById("app").inert === true,
    headerInert: document.querySelector("header").inert === true,
    focused: document.activeElement && document.activeElement.id,
  }));
  check(state.open, where, "Enter on the gear did not open Settings");
  check(state.hidden === "false", where, `overlay aria-hidden should be "false" while open, got ${state.hidden}`);
  check(state.modal === "true", where, "dialog is missing aria-modal");
  check(state.labelled, where, "dialog aria-labelledby does not point at its heading");
  check(state.appInert && state.headerInert, where, "page behind the dialog is not inert");
  check(state.focused === "settingsName", where, `initial focus should be the name field, got #${state.focused}`);

  // Tab trap: Shift+Tab from the first control wraps to the last, Tab from
  // the last wraps to the first.
  await page.keyboard.press("Shift+Tab");
  check(await page.evaluate(() => document.activeElement.id) === "settingsClose", where, "Shift+Tab from the first control should wrap to Done");
  await page.keyboard.press("Tab");
  check(await page.evaluate(() => document.activeElement.id) === "settingsName", where, "Tab from Done should wrap to the name field");

  // Escape closes, focus returns to the gear, page is live again.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => ({
    open: document.getElementById("settingsOverlay").classList.contains("open"),
    hidden: document.getElementById("settingsOverlay").getAttribute("aria-hidden"),
    appInert: document.getElementById("app").inert === true,
    focused: document.activeElement && document.activeElement.id,
  }));
  check(!after.open, where, "Escape did not close Settings");
  check(after.hidden === "true", where, "overlay should be aria-hidden again after closing");
  check(!after.appInert, where, "page should not stay inert after closing");
  check(after.focused === "settingsBtn", where, `focus should return to the gear, got #${after.focused}`);

  // The Captions toggle is wired through the panel.
  await page.evaluate(() => window.Lawson.setCaptionsEnabled(false));
  await page.evaluate(() => window.__openSettings());
  await page.waitForTimeout(100);
  check(await page.$eval("#settingsCaptions", (el) => el.checked === false), where, "Captions toggle should reflect the saved (off) state");
  await page.click("label:has(#settingsCaptions)"); // the input itself is visually hidden; users tap the label
  await page.click("#settingsClose");
  await page.waitForTimeout(100);
  check(await page.evaluate(() => document.body.classList.contains("captions-on") && localStorage.getItem("lawson:captions") === "1"),
    where, "turning Captions on in Settings should enable and persist it");
}

async function captions(page) {
  const where = "captions / live region";
  const region = await page.$eval("#captions", (el) => ({ role: el.getAttribute("role"), live: el.getAttribute("aria-live") }));
  check(region.role === "status" && region.live === "polite", where, "captions element must be a polite status region");

  await page.evaluate(() => { window.Lawson.setCaptionsEnabled(true); window.Lawson.setVoiceMuted(false); window.Lawson.say("Hello there"); });
  await page.waitForTimeout(80);
  let s = await page.evaluate(() => {
    const el = document.getElementById("captions");
    const r = el.getBoundingClientRect();
    const h = document.querySelector("header").getBoundingClientRect();
    return { text: el.textContent, w: r.width, inHeader: r.top >= h.top - 1 && r.bottom <= h.bottom + 1,
      titleHidden: getComputedStyle(document.querySelector("header h1")).visibility === "hidden" };
  });
  check(s.text === "Hello there", where, `caption text should mirror say(), got ${JSON.stringify(s.text)}`);
  check(s.w > 40, where, "caption should be visible on screen when captions are on");
  check(s.inHeader, where, "caption should be drawn inside the header strip");
  check(s.titleHidden, where, "the header title should step aside while a caption is showing");

  // Muted voice still captions — that's when it matters most.
  await page.evaluate(() => { window.Lawson.setVoiceMuted(true); window.Lawson.say("Still shown"); window.Lawson.setVoiceMuted(false); });
  await page.waitForTimeout(80);
  s = await page.$eval("#captions", (el) => el.textContent);
  check(s === "Still shown", where, "caption should update even when the voice is muted");

  // Off: still in the accessibility tree (screen readers), but not drawn,
  // and the title is back.
  await page.evaluate(() => { window.Lawson.setCaptionsEnabled(false); window.Lawson.say("Read by screen readers only"); });
  await page.waitForTimeout(80);
  s = await page.$eval("#captions", (el) => ({ text: el.textContent, w: el.getBoundingClientRect().width, hidden: el.getAttribute("aria-hidden"),
    titleShown: getComputedStyle(document.querySelector("header h1")).visibility !== "hidden" }));
  check(s.text === "Read by screen readers only", where, "live region should still update with captions off");
  check(s.w <= 1 && s.hidden !== "true", where, "captions-off should visually hide the region without aria-hiding it");
  check(s.titleShown, where, "the header title must be visible when captions are off");
}

async function modeTabsAndBadges(page) {
  const where = "mode tabs / badges";
  await openScreen(page, { id: "pop", kind: "game" });
  const group = await page.$eval("#popModes", (el) => el.getAttribute("role") === "group" && !!el.getAttribute("aria-label"));
  check(group, where, "mode tabs should be a labelled group");
  await page.click('#popModes [data-mode="letters"]');
  await page.waitForTimeout(200);
  const pressed = await page.$$eval("#popModes .mode-tab", (els) => els.map((e) => [e.dataset.mode, e.getAttribute("aria-pressed"), e.classList.contains("active")]));
  check(pressed.every(([, p, a]) => p === String(a)), where, `aria-pressed must track the active tab: ${JSON.stringify(pressed)}`);
  check(pressed.find(([m]) => m === "letters")[1] === "true", where, "ABC tab should be pressed after clicking it");
  // In ABC mode the streak badge is hidden and the prompt shown — `hidden`
  // has to beat the badge's own display rule.
  const vis = await page.evaluate(() => ({
    streak: document.getElementById("popStreak").getClientRects().length,
    prompt: document.getElementById("popPrompt").getClientRects().length,
  }));
  check(vis.streak === 0 && vis.prompt > 0, where, `ABC mode should hide the streak badge and show the prompt, got ${JSON.stringify(vis)}`);
  // The engine hears "en" but the caption reads "N" — matching the prompt.
  const abc = await page.evaluate(() => ({ said: window.__said.at(-1), prompt: document.getElementById("popPrompt").textContent }));
  check(/^Pop the [A-Z]!$/.test(abc.said) && abc.said === abc.prompt, where, `ABC caption should show the letter as written, got ${JSON.stringify(abc)}`);

  const badge = await page.evaluate(() => {
    window.Lawson.bumpBadge("popScoreVal", 7);
    const b = document.getElementById("popScore");
    return { role: b.getAttribute("role"), tab: b.getAttribute("tabindex"), label: b.getAttribute("aria-label") };
  });
  check(badge.role === "button" && badge.tab === "0", where, "score badge should be a focusable button");
  check(badge.label === "Score 7", where, `score badge name should follow its value, got ${JSON.stringify(badge.label)}`);
  check(await page.$eval("#popBest", (b) => /^Best \d+$/.test(b.getAttribute("aria-label"))), where, "best badge should be named 'Best N'");

  // Enter on the badge speaks its value (keyboard activation of role=button).
  await page.evaluate(() => { window.__said.length = 0; });
  await page.focus("#popScore");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  check((await page.evaluate(() => window.__said)).includes("7"), where, "Enter on a badge should speak its value");
}

async function reducedMotion(page) {
  const where = "reduced motion";
  await openScreen(page, { id: "menu", kind: "hub" });
  const withReduce = await page.evaluate(() => { window.Lawson.sparkleAt(100, 100); window.Lawson.confettiRain(10); return document.querySelectorAll(".sparkle, .confetti").length; });
  check(withReduce === 0, where, `particles should be skipped under prefers-reduced-motion, got ${withReduce}`);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const withMotion = await page.evaluate(() => { window.Lawson.sparkleAt(100, 100); return document.querySelectorAll(".sparkle").length; });
  check(withMotion === 10, where, `sparkles should render normally without the preference, got ${withMotion}`);
  await page.emulateMedia({ reducedMotion: "reduce" });
}

// Transient overlays never appear in the per-screen sweep, so trigger each
// one and run axe + the structural checks while it is up.
async function overlays(page) {
  const where = "overlays";
  const axeHere = async (label) => {
    const v = (await runAxe(page)).filter((x) => !DISABLED_RULES[x.id]);
    v.forEach((x) => fail(where, `${label}: axe ${x.id} [${x.impact}] ${x.help}: ${x.nodes.slice(0, 3).join(" | ")}`));
    (await structuralChecks(page)).forEach((s) => fail(where, `${label}: ${s}`));
  };

  // First-visit tutorial hint fires from a real tile tap, is a status
  // message, and leaves with the screen.
  await openScreen(page, { id: "menu", kind: "hub" });
  await page.evaluate(() => localStorage.removeItem("lawson:tutSeen:pop"));
  await page.click('[data-go="pop"]');
  await page.waitForTimeout(1100);
  const hint = await page.evaluate(() => {
    const el = document.querySelector(".tutorial-overlay.show");
    return el && { role: el.getAttribute("role"), text: el.textContent.trim() };
  });
  check(!!hint, where, "first visit to Pop! via its tile should show the tutorial hint");
  if (hint) {
    check(hint.role === "status", where, "tutorial hint should be a status message");
    check(/balloon/i.test(hint.text), where, `tutorial hint should be Pop!'s, got ${JSON.stringify(hint.text)}`);
    await axeHere("tutorial hint");
    await page.click("#popGame .home-btn");
    await page.waitForTimeout(600);
    check(await page.evaluate(() => !document.querySelector(".tutorial-overlay")), where, "tutorial hint should disappear when the screen changes");
  }

  // Sticker toast.
  await openScreen(page, { id: "match", kind: "game" });
  await page.evaluate(() => { window.Lawson.resetStickers(); window.Lawson.earnSticker("match10"); });
  await page.waitForTimeout(150);
  check(await page.$eval(".sticker-toast", (el) => el.getAttribute("role") === "status").catch(() => false), where, "sticker toast should be a status message");
  await axeHere("sticker toast");

  // All-stickers finale (decorative: say() carries the words).
  await page.evaluate(() => { document.querySelectorAll(".sticker-toast").forEach((el) => el.remove()); window._allStickersCelebration(); });
  await page.waitForTimeout(150);
  check(await page.$eval(".all-stickers-overlay", (el) => el.getAttribute("aria-hidden") === "true").catch(() => false), where, "all-stickers finale should be aria-hidden (announced via speech)");
  check((await page.evaluate(() => window.__said.at(-1) || "")).startsWith("All stickers!"), where, "all-stickers finale should be announced");
  await axeHere("all-stickers finale");
  await page.evaluate(() => document.querySelectorAll(".all-stickers-overlay").forEach((el) => el.remove()));

  // New-best celebration.
  await page.evaluate(() => window.Lawson.celebrateNewHigh(9));
  await page.waitForTimeout(300);
  check(await page.$eval("#bestOverlay", (el) => el.classList.contains("show") && el.getAttribute("aria-hidden") === "true"), where, "new-best overlay should show and stay aria-hidden");
  await axeHere("new-best overlay");
  await page.evaluate(() => { document.getElementById("bestOverlay").classList.remove("show"); window.Lawson.resetStickers(); });
}

// ---- main -----------------------------------------------------------------

async function main() {
  const browser = await chromium.launch();
  const pageErrors = [];
  const rows = [];
  let first = null;

  for (const config of CONFIGS) {
    const page = await boot(browser, config);
    page.on("pageerror", (e) => pageErrors.push(`${config.name}: ${e.message}`));
    const games = await page.evaluate(() => Object.keys(window.Lawson.games));
    const targets = [
      ...HUBS.map((id) => ({ id, kind: "hub" })),
      { id: "settings", kind: "settings" },
      { id: "letters", kind: "activity" },
      ...games.map((id) => ({ id, kind: "game" })),
    ];
    for (const t of targets) {
      await openScreen(page, t);
      const violations = (await runAxe(page)).filter((v) => !DISABLED_RULES[v.id]);
      const structural = await structuralChecks(page);
      const caption = await captionOverlapCheck(page);
      rows.push({ config: config.name, id: t.id, problems: violations.length + structural.length + caption.length });
      const where = `${t.id} (${config.name})`;
      violations.forEach((v) => fail(where, `axe ${v.id} [${v.impact}] ${v.help}: ${v.nodes.slice(0, 4).join(" | ")}`));
      structural.forEach((s) => fail(where, s));
      caption.forEach((s) => fail(where, s));
    }
    if (!first) first = page; else await page.close();
  }

  // Behaviour checks run once, on the phone-portrait light page.
  await keyboardNavigation(first);
  await settingsModal(first);
  await captions(first);
  await modeTabsAndBadges(first);
  await reducedMotion(first);
  await overlays(first);

  await browser.close();
  pageErrors.forEach((m) => fail("page", `uncaught error: ${m}`));

  const screens = rows.length / CONFIGS.length;
  console.log(`\nA11y: ${screens} screens × ${CONFIGS.length} configs (${CONFIGS.map((c) => c.name).join("; ")})`);
  console.log(`  axe-core ${AXE.match(/axe v([\d.]+)/)[1]}, tags ${AXE_TAGS.join(",")}`);
  console.log(`  disabled rules: ${Object.entries(DISABLED_RULES).map(([k, v]) => `${k} (${v})`).join("; ")}`);
  const clean = rows.filter((r) => !r.problems).length;
  console.log(`  clean screen passes: ${clean}/${rows.length}`);
  if (failures.length) {
    console.log(`\n${failures.length} problem(s):`);
    failures.forEach((f) => console.log(`  FAIL  ${f.where.padEnd(34)} ${f.what}`));
    process.exit(1);
  }
  console.log("  behaviour: keyboard nav, settings modal, captions, mode tabs, badges, reduced motion, overlays — all pass");
}

main().catch((e) => { console.error(e); process.exit(99); });
