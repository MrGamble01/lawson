// Accessibility checks for every screen in the Lawson app.
//
//   1. axe-core (vendored in tests/vendor/axe-core) runs on each hub, the
//      Settings dialog, a flashcard activity and every game, with the
//      WCAG 2.0/2.1 A + AA and best-practice rule sets.
//   2. Structural checks axe doesn't make: the active screen is a labelled,
//      focusable region; every visible button has a *readable* name (not
//      just an emoji); nothing focusable hides inside aria-hidden.
//   3. Behaviour: keyboard-only navigation into a game and back (with
//      focus following), the Settings modal (aria-hidden flips, background
//      goes inert, Tab is trapped, Escape closes, focus returns), captions /
//      the live region, mode-tab pressed state, badge names, and the
//      reduced-motion switch for particle effects.
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

const VIEWPORT = { width: 414, height: 896 };
const HUBS = ["menu", "moreHub", "artHub", "musicHub", "townHub", "brainHub", "libraryHub", "numbersHub", "exploreHub"];

// Rules we deliberately do not enforce, with the reason.
const DISABLED_RULES = {
  // The viewport meta disables pinch-zoom on purpose: a toddler's stray
  // second finger would otherwise zoom the whole playground off-screen.
  // The UI is already very large, and iOS ignores the flag for assistive
  // zoom anyway.
  "meta-viewport": "pinch-zoom is intentionally off for toddlers",
};
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

const failures = [];
function fail(where, what) { failures.push({ where, what }); }
function check(cond, where, what) { if (!cond) fail(where, what); }

// ---- page helpers ------------------------------------------------------

async function boot() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.addInitScript(() => {
    try { localStorage.setItem("lawson:kidName", "Lawson"); } catch (_) {}
    // Record everything the app says (captions event) for assertions.
    window.__said = [];
    window.addEventListener("lawson:say", (e) => window.__said.push(e.detail.text));
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(INDEX);
  await page.waitForTimeout(2200);
  await page.evaluate(() => {
    document.getElementById("splash")?.remove();
    if (window.__closeSettings) window.__closeSettings();
    window.show("menu");
  });
  await page.addScriptTag({ content: AXE });
  return { browser, page };
}

// Open a screen the same way the app does (stop games, show, start).
async function openScreen(page, target) {
  await page.evaluate((t) => {
    Object.values(window.Lawson.games).forEach((g) => g && g.stop && g.stop());
    if (window.__closeSettings) window.__closeSettings();
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
  return page.evaluate(() => {
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
    return [...new Set(out)];
  });
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
  let s = await page.$eval("#captions", (el) => ({ text: el.textContent, w: el.getBoundingClientRect().width }));
  check(s.text === "Hello there", where, `caption text should mirror say(), got ${JSON.stringify(s.text)}`);
  check(s.w > 40, where, "caption should be visible on screen when captions are on");

  // Muted voice still captions — that's when it matters most.
  await page.evaluate(() => { window.Lawson.setVoiceMuted(true); window.Lawson.say("Still shown"); window.Lawson.setVoiceMuted(false); });
  await page.waitForTimeout(80);
  s = await page.$eval("#captions", (el) => el.textContent);
  check(s === "Still shown", where, "caption should update even when the voice is muted");

  // Off: still in the accessibility tree (screen readers), but not drawn.
  await page.evaluate(() => { window.Lawson.setCaptionsEnabled(false); window.Lawson.say("Read by screen readers only"); });
  await page.waitForTimeout(80);
  s = await page.$eval("#captions", (el) => ({ text: el.textContent, w: el.getBoundingClientRect().width, hidden: el.getAttribute("aria-hidden") }));
  check(s.text === "Read by screen readers only", where, "live region should still update with captions off");
  check(s.w <= 1 && s.hidden !== "true", where, "captions-off should visually hide the region without aria-hiding it");
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

// ---- main -----------------------------------------------------------------

async function main() {
  const { browser, page } = await boot();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  const games = await page.evaluate(() => Object.keys(window.Lawson.games));
  const targets = [
    ...HUBS.map((id) => ({ id, kind: "hub" })),
    { id: "settings", kind: "settings" },
    { id: "letters", kind: "activity" },
    ...games.map((id) => ({ id, kind: "game" })),
  ];

  const rows = [];
  for (const t of targets) {
    await openScreen(page, t);
    const violations = (await runAxe(page)).filter((v) => !DISABLED_RULES[v.id]);
    const structural = await structuralChecks(page);
    rows.push({ id: t.id, violations: violations.length, structural: structural.length });
    violations.forEach((v) => fail(t.id, `axe ${v.id} [${v.impact}] ${v.help}: ${v.nodes.slice(0, 4).join(" | ")}`));
    structural.forEach((s) => fail(t.id, s));
  }

  await keyboardNavigation(page);
  await settingsModal(page);
  await captions(page);
  await modeTabsAndBadges(page);
  await reducedMotion(page);

  await browser.close();
  pageErrors.forEach((m) => fail("page", `uncaught error: ${m}`));

  console.log(`\nA11y: ${rows.length} screens scanned (axe-core ${AXE.match(/axe v([\d.]+)/)[1]}, tags ${AXE_TAGS.join(",")})`);
  console.log(`  disabled rules: ${Object.entries(DISABLED_RULES).map(([k, v]) => `${k} (${v})`).join("; ")}`);
  const clean = rows.filter((r) => !r.violations && !r.structural).length;
  console.log(`  clean screens: ${clean}/${rows.length}`);
  if (failures.length) {
    console.log(`\n${failures.length} problem(s):`);
    failures.forEach((f) => console.log(`  FAIL  ${f.where.padEnd(22)} ${f.what}`));
    process.exit(1);
  }
  console.log("  behaviour: keyboard nav, settings modal, captions, mode tabs, badges, reduced motion — all pass");
}

main().catch((e) => { console.error(e); process.exit(99); });
