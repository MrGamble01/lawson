// Touch targets, readable names, and sideways overflow on the four
// screens Lawson actually uses: iPhone, iPad mini, laptop, and desktop.
// Run: node tests/touch-audit.js
const path = require("node:path");

const { chromium } = require(resolvePlaywright());
function resolvePlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return process.env.PLAYWRIGHT_MODULE;
  try { return require.resolve("playwright"); } catch (_) { /* local install later */ }
  return "/opt/node22/lib/node_modules/playwright";
}

const ROOT = path.resolve(__dirname, "..");
const INDEX = "file://" + path.join(ROOT, "index.html");
const VIEWPORTS = [
  { name: "iphone", width: 390, height: 844 },
  { name: "ipad-mini", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
];
const HUBS = ["menu", "moreHub", "artHub", "musicHub", "townHub", "brainHub", "libraryHub", "numbersHub", "exploreHub"];
const ROOMS = ["kitchen", "craft", "music", "bathroom", "garden", "playroom", "bedroom"];

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function boot(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.addInitScript(() => {
    try {
      localStorage.setItem("lawson:kidName", "Lawson");
      localStorage.setItem("lawson:dollhouse", JSON.stringify({ seen: true }));
    } catch (_) {}
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(INDEX);
  await page.evaluate(() => {
    document.getElementById("splash")?.remove();
    document.querySelector(".welcome-toast")?.remove();
    if (window.__closeSettings) window.__closeSettings();
    window.Lawson.setVoiceMuted(true);
    window.Lawson.setSoundMuted(true);
    window.show("menu");
  });
  return { page, errors };
}

async function measure(page) {
  return page.evaluate(() => {
    const problems = [];
    const scroll = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (scroll > 1) problems.push("page scrolls sideways by " + scroll + "px");
    const readable = (s) => /[\p{L}\p{N}]/u.test(String(s || "").replace(/[‍️]/g, ""));
    const nameOf = (el) => {
      const byId = el.getAttribute("aria-labelledby");
      if (byId) return byId.split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || "").join(" ");
      return el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || "";
    };
    const visible = (el) => {
      if (el.closest("[hidden]")) return false;
      if (el.getAttribute("aria-hidden") === "true") return false;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const rect = el.getBoundingClientRect();
      return rect.width >= 2 && rect.height >= 2;
    };
    const overlay = document.getElementById("settingsOverlay");
    const settingsOpen = overlay && overlay.classList.contains("open");
    const roots = [];
    if (settingsOpen) roots.push(overlay);
    else {
      const active = document.querySelector(".screen.active");
      const header = document.querySelector("header");
      if (active) roots.push(active);
      if (header) roots.push(header);
    }
    roots.forEach((root) => {
      root.querySelectorAll("button, [role='button']").forEach((el) => {
        if (!visible(el)) return;
        const rect = el.getBoundingClientRect();
        const label = (nameOf(el) || el.id || el.className || "button").toString().replace(/\s+/g, " ").trim().slice(0, 48);
        const onScreen = rect.left < window.innerWidth - 8 && rect.right > 8
          && rect.top < window.innerHeight - 8 && rect.bottom > 8;
        if (onScreen && (Math.round(rect.width) < 44 || Math.round(rect.height) < 44)) {
          problems.push(label + " is " + Math.round(rect.width) + "×" + Math.round(rect.height));
        }
        if (!readable(nameOf(el))) problems.push(label + " has no readable name");
        let font = parseFloat(getComputedStyle(el).fontSize) || 0;
        el.querySelectorAll("span, p").forEach((node) => {
          if (!readable(node.textContent)) return;
          const size = parseFloat(getComputedStyle(node).fontSize) || font;
          if (size < font) font = size;
        });
        if (onScreen && readable(nameOf(el)) && font < 12) problems.push(label + " text is " + font + "px");
        if (rect.left < -1 || rect.right > window.innerWidth + 1) {
          problems.push(label + " sits past the screen edge");
        }
      });
    });
    return problems.slice(0, 8);
  });
}

async function openHub(page, id) {
  await page.evaluate((hub) => {
    Object.values(window.Lawson.games).forEach((g) => g && g.stop && g.stop());
    if (window.__closeSettings) window.__closeSettings();
    window.show(hub);
  }, id);
  await sleep(40);
}

async function openGame(page, id) {
  await page.evaluate((gameId) => {
    Object.values(window.Lawson.games).forEach((g) => g && g.stop && g.stop());
    if (window.__closeSettings) window.__closeSettings();
    const game = window.Lawson.games[gameId];
    window.show(game.screen);
    game.start();
  }, id);
  await sleep(60);
}

async function seedStats(page) {
  await page.evaluate(() => {
    let t = 1700000000000;
    window.LawsonPlay._setNow(() => t);
    window.LawsonPlay.reset();
    ["pop", "whack", "find", "cook", "garden"].forEach((id) => {
      window.LawsonPlay.enter(id, "");
      t += 800;
    });
    window.LawsonPlay.enter("dollhouse", "Kitchen");
    t += 800;
    ["Craft Room", "Music Room", "Bathroom", "Fairy Tail Garden", "Playroom", "Bedroom"].forEach((mode) => {
      window.LawsonPlay.setMode(mode);
      t += 800;
    });
    window.LawsonPlay.leave();
    window.LawsonPlay._setNow(() => Date.now());
  });
}

async function main() {
  const browser = await chromium.launch();
  const failures = [];
  for (const viewport of VIEWPORTS) {
    const { page, errors } = await boot(browser, viewport);
    const note = async (where) => {
      const problems = await measure(page);
      problems.forEach((problem) => failures.push(viewport.name + " " + where + ": " + problem));
    };
    for (const hub of HUBS) {
      await openHub(page, hub);
      await note(hub);
    }
    await seedStats(page);
    await page.evaluate(() => { window.__openSettings(); window.__openSettings && document.getElementById("settingsPlay").click(); });
    await page.locator("#playAgain button").first().waitFor();
    await note("play stats");
    const badges = await page.locator(".play-milestone").allTextContents();
    if (!badges.includes("First game") || !badges.includes("5 games") || !badges.includes("All rooms")) {
      failures.push(viewport.name + " play stats: milestones missing (" + badges.join(", ") + ")");
    }
    await page.evaluate(() => new Promise((resolve) => {
      const done = () => { window.removeEventListener("popstate", done); resolve(); };
      window.addEventListener("popstate", done);
      window.__closeSettings();
    }));

    await openGame(page, "dollhouse");
    await page.locator("#dollhouseStage[data-view='hub']").waitFor();
    await note("dollhouse hub");
    for (const room of ROOMS) {
      await page.locator("#dollhouseStage button[data-room='" + room + "']").click();
      await page.locator("#dollhouseStage[data-view='" + room + "']").waitFor();
      await note("dollhouse " + room);
      await page.locator("#dollhouseStage button[aria-label='Back to Dollhouse']").click();
      await page.locator("#dollhouseStage[data-view='hub']").waitFor();
    }

    await openGame(page, "animaltrain");
    await page.locator("#animalTrainDock button[aria-label='Bear']").click();
    await page.locator("#animalTrainDock button[aria-label='Puppy']").click();
    await page.locator("#animalTrainDock button[aria-label='Bunny']").click();
    await note("animal train");
    const tiny = await page.evaluate(() => {
      const problems = [];
      document.querySelectorAll("#animalTrainDock .at-animal, #animalTrainDock .at-whistle, #animalTrainGame .at-mode").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const name = el.getAttribute("aria-label") || "control";
        if (rect.width < 64 || rect.height < 64) problems.push(name + " is " + Math.round(rect.width) + "×" + Math.round(rect.height));
      });
      return problems;
    });
    tiny.forEach((problem) => failures.push(viewport.name + " animal train: " + problem));

    await openGame(page, "oceanfriends");
    await page.locator("#oceanFriendsDock button[aria-label='Sea Turtle']").click();
    await page.locator("#oceanFriendsDock button[aria-label='Whale']").click();
    await note("ocean friends");
    const oceanTiny = await page.evaluate(() => {
      const problems = [];
      document.querySelectorAll("#oceanFriendsDock .of-friend, #oceanFriendsGame .of-mode").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const name = el.getAttribute("aria-label") || "control";
        if (rect.width < 64 || rect.height < 64) problems.push(name + " is " + Math.round(rect.width) + "×" + Math.round(rect.height));
      });
      return problems;
    });
    oceanTiny.forEach((problem) => failures.push(viewport.name + " ocean friends: " + problem));

    const games = await page.evaluate(() => Object.keys(window.Lawson.games).filter((id) => id !== "dollhouse"));
    for (const id of games) {
      await openGame(page, id);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) failures.push(viewport.name + " " + id + ": page scrolls sideways by " + overflow + "px");
    }
    errors.forEach((err) => failures.push(viewport.name + " error: " + err));
    await page.close();
  }
  await browser.close();
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS: touch audit — 44px targets, readable labels, no sideways overflow on four screens");
}

main().catch((err) => { console.error(err); process.exit(1); });
