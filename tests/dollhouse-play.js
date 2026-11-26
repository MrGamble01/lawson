// Dollhouse in a real browser: hello, rooms, sticker, play stats, and
// no sideways overflow on a phone, iPad mini, laptop, and desktop.
// Run: node tests/dollhouse-play.js
const fs = require("node:fs");
const path = require("node:path");

const { chromium } = require(resolvePlaywright());
function resolvePlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return process.env.PLAYWRIGHT_MODULE;
  try { return require.resolve("playwright"); } catch (_) { /* local install later */ }
  return "/opt/node22/lib/node_modules/playwright";
}

const ROOT = path.resolve(__dirname, "..");
const INDEX = "file://" + path.join(ROOT, "index.html");
const SHOTS = "/opt/cursor/artifacts";
const ROOMS = ["kitchen", "craft", "music", "bathroom", "garden", "playroom", "bedroom"];

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function boot(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.goto(INDEX);
  await page.evaluate(() => {
    document.getElementById("splash")?.remove();
    document.querySelector(".welcome-toast")?.remove();
    window.Lawson.setVoiceMuted(true);
    window.Lawson.setSoundMuted(true);
    window.__said = [];
    window.addEventListener("lawson:say", (e) => window.__said.push(e.detail.text));
  });
  return { page, errors };
}

async function clickLabel(page, name) {
  const button = page.locator("#dollhouseStage button[aria-label='" + name.replace(/'/g, "\\'") + "']");
  await button.click();
}

async function fits(page, label) {
  const report = await page.evaluate(() => {
    const root = document.querySelector(".screen.active");
    const bad = [];
    if (!root) return { bad: ["no active screen"], scroll: 0 };
    root.querySelectorAll("*").forEach((el) => {
      if (el.closest("[hidden]")) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      if (rect.right > window.innerWidth + 2 || rect.left < -2) {
        const name = (el.getAttribute("aria-label") || el.className || el.tagName || "").toString().slice(0, 48);
        bad.push(name);
      }
    });
    return {
      bad: bad.slice(0, 8),
      scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  if (report.scroll > 2 || report.bad.length) {
    throw new Error(label + " overflows: " + JSON.stringify(report));
  }
}

async function playPhone(page) {
  await fits(page, "phone menu");
  await page.locator("[data-go='dollhouse']").click();
  await page.locator("#dollhouseStage button[aria-label='Open the Meow-Meow mailbox']").waitFor();
  await sleep(900);
  await clickLabel(page, "Skip to the dollhouse");
  await page.locator("#dollhouseStage[data-view='hub']").waitFor();
  const doors = await page.locator("#dollhouseStage .dh-door").count();
  if (doors !== 7) throw new Error("expected 7 rooms, got " + doors);
  await sleep(900);
  await fits(page, "phone hub");
  await page.screenshot({ path: path.join(SHOTS, "dollhouse-phone-hub.png") });

  await clickLabel(page, "CatRat's treasure");
  const found = await page.locator("[data-dh='catrat']").getAttribute("data-found");
  if (found !== "yes") throw new Error("CatRat should leave a treasure");

  await clickLabel(page, "Kitchen");
  await clickLabel(page, "Cake");
  const cake = await page.evaluate(() => ({
    pop: document.querySelector("#dollhouseStage button[aria-label='Cake']").classList.contains("is-pop"),
    glints: document.querySelectorAll(".sparkle.dh-glint").length,
    said: window.__said.filter((line) => line === "Cake").length,
  }));
  if (!cake.pop) throw new Error("cake should pop");
  if (cake.glints < 1) throw new Error("cake should sparkle, got " + cake.glints);
  if (cake.said < 1) throw new Error("cake should be spoken");
  await clickLabel(page, "Cake");
  const cakeAgain = await page.evaluate(() => ({
    wiggle: document.querySelector("#dollhouseStage button[aria-label='Cake']").classList.contains("is-wiggle"),
    said: window.__said.filter((line) => line === "Cake").length,
  }));
  if (!cakeAgain.wiggle) throw new Error("a second cake tap should wiggle");
  if (cakeAgain.said !== cake.said) throw new Error("a repeat cake tap should stay quiet");
  await clickLabel(page, "Pink frosting");
  await clickLabel(page, "Strawberry");
  await fits(page, "phone kitchen");
  await page.screenshot({ path: path.join(SHOTS, "dollhouse-phone-kitchen.png") });
  await clickLabel(page, "Sprinkle party");
  await sleep(500);
  await page.screenshot({ path: path.join(SHOTS, "dollhouse-phone-sticker.png") });
  const earned = await page.evaluate(() => (localStorage.getItem("lawson:stickers") || "").includes("gabbyCat"));
  if (!earned) throw new Error("kitchen should earn gabbyCat");
  await sleep(500);
  await clickLabel(page, "Back to Dollhouse");
  const kitchenToday = await page.locator("#dollhouseStage .dh-door[data-room='kitchen']").getAttribute("data-today");
  if (kitchenToday !== "yes") throw new Error("kitchen should show a played-today badge");
  const kitchenName = await page.locator("#dollhouseStage .dh-door[data-room='kitchen']").getAttribute("aria-label");
  if (!kitchenName || !kitchenName.includes("played today")) throw new Error("kitchen name should say played today: " + kitchenName);
  const otherToday = await page.locator("#dollhouseStage .dh-door[data-today='yes']").count();
  if (otherToday !== 1) throw new Error("only the kitchen has been played today, got " + otherToday);

  await clickLabel(page, "Music Room");
  await fits(page, "phone music");
  await page.screenshot({ path: path.join(SHOTS, "dollhouse-phone-music.png") });
  for (const key of ["Piano key 1", "Bell 1", "Drum 1", "Beat pad 1"]) await clickLabel(page, key);
  if (await page.locator("#dollhouseStage").getAttribute("data-done") !== "music") {
    throw new Error("four notes should finish the music room");
  }
  await sleep(900);
  await clickLabel(page, "Back to Dollhouse");

  await clickLabel(page, "Craft Room");
  await clickLabel(page, "Whoopsies");
  const whoops = await page.locator("#dollhouseStage button[aria-label='Whoopsies']").evaluate((el) => el.classList.contains("is-wiggle"));
  if (!whoops) throw new Error("an empty Whoopsies should wiggle");
  await clickLabel(page, "Red paint");
  if (await page.locator(".dh-paper").getAttribute("data-marks") !== "1") throw new Error("paint should mark the paper");
  await clickLabel(page, "Whoopsies");
  if (await page.locator(".dh-paper").getAttribute("data-marks") !== "0") throw new Error("Whoopsies should undo");
  await fits(page, "phone craft");
  for (const tool of ["Red paint", "Glitter", "Heart sticker", "Circle shape"]) await clickLabel(page, tool);
  if (await page.locator("#dollhouseStage").getAttribute("data-done") !== "craft") throw new Error("craft room should finish");
  await clickLabel(page, "Back to Dollhouse");

  await clickLabel(page, "Bathroom");
  await clickLabel(page, "Pink bottle");
  await clickLabel(page, "Blue bottle");
  await fits(page, "phone bathroom");
  await clickLabel(page, "Mix a fizzy potion");
  if (await page.locator("#dollhouseStage").getAttribute("data-done") !== "bathroom") throw new Error("potion should finish");
  await clickLabel(page, "Back to Dollhouse");

  await clickLabel(page, "Fairy Tail Garden");
  for (const name of ["Water the rose", "Water the tulip", "Water the daisy", "Water the sunflower", "Tap the pink star", "Tap the gold star", "Tap the blue star"]) {
    await clickLabel(page, name);
  }
  await fits(page, "phone garden");
  if (await page.locator("#dollhouseStage").getAttribute("data-done") !== "garden") throw new Error("garden should finish");
  await clickLabel(page, "Back to Dollhouse");

  await clickLabel(page, "Playroom");
  await clickLabel(page, "Star on the left");
  if (await page.locator("#dollhouseStage").getAttribute("data-done") === "playroom") {
    throw new Error("a star in another lane is a miss");
  }
  await clickLabel(page, "Steer left");
  await clickLabel(page, "Star on the left");
  await clickLabel(page, "Steer right");
  await clickLabel(page, "Treat in the middle");
  await clickLabel(page, "Steer right");
  await clickLabel(page, "Star on the right");
  await fits(page, "phone playroom");
  if (await page.locator("#dollhouseStage").getAttribute("data-done") !== "playroom") throw new Error("Carlita should collect every treat");
  await clickLabel(page, "Back to Dollhouse");

  await clickLabel(page, "Bedroom");
  await clickLabel(page, "That's how I roll!");
  if (await page.locator("#dollhouseStage").getAttribute("data-done") === "bedroom") {
    throw new Error("rolling with no pajamas should not finish");
  }
  await clickLabel(page, "Heart sticker");
  await clickLabel(page, "Star pajamas");
  await fits(page, "phone bedroom");
  await clickLabel(page, "That's how I roll!");
  if (await page.locator("#dollhouseStage").getAttribute("data-done") !== "bedroom") throw new Error("bedroom should finish");
  await clickLabel(page, "Back to Dollhouse");
  const visited = await page.locator("#dollhouseStage .dh-door[data-today='yes']").count();
  if (visited !== 7) throw new Error("every room played today should wear a check, got " + visited);

  const tracked = await page.evaluate(() => {
    const game = window.LawsonPlay.snapshot().ranges.today.games.find((item) => item.id === "dollhouse");
    if (!game) return null;
    return {
      plays: game.plays,
      modes: game.modes.map((mode) => mode.id),
    };
  });
  if (!tracked) throw new Error("play stats should list dollhouse");
  for (const mode of ["Hello", "Dollhouse", "Kitchen", "Music Room"]) {
    if (!tracked.modes.includes(mode)) throw new Error("play stats missing " + mode + " in " + tracked.modes.join(", "));
  }

  await page.locator("#settingsBtn").click();
  await page.locator("#settingsPlay").click();
  await page.waitForFunction(() => {
    const el = document.getElementById("playStatsGames");
    return !!(el && el.textContent.includes("Dollhouse") && el.textContent.includes("Kitchen") && el.textContent.includes("Music Room"));
  });
  const summaryText = await page.locator("#playStatsSummary").innerText();
  const gamesText = await page.locator("#playStatsGames").innerText();
  const sessionsText = await page.locator("#playStatsSessions").innerText();
  if (!summaryText.includes("Today") || !summaryText.includes("7 days") || !summaryText.includes("All time")) {
    throw new Error("play stats should compare today, 7 days, and all time: " + summaryText);
  }
  if (!gamesText.includes("Dollhouse") || !gamesText.includes("Kitchen") || !gamesText.includes("Music Room")) {
    throw new Error("play stats view missing dollhouse time: " + gamesText);
  }
  if (!gamesText.includes("Favorite")) {
    throw new Error("play stats should name a favorite: " + gamesText);
  }
  if (!/\d/.test(gamesText)) throw new Error("play stats should show a duration");
  const badges = await page.locator(".play-milestone").allTextContents();
  if (!badges.includes("First game")) throw new Error("missing first-game badge: " + badges.join(", "));
  if (!badges.includes("All rooms")) throw new Error("missing all-rooms badge: " + badges.join(", "));
  if (badges.includes("5 games")) throw new Error("one game should not earn five games: " + badges.join(", "));
  if (!badges.includes("Dollhouse")) throw new Error("favorite badge should name Dollhouse: " + badges.join(", "));
  const again = page.locator("#playAgain button");
  if (await again.count() !== 1) throw new Error("play again should offer one game, got " + await again.count());
  const againLabel = await again.first().getAttribute("aria-label");
  if (againLabel !== "Play Dollhouse again, favorite") throw new Error("play again label: " + againLabel);
  const saidBefore = await page.evaluate(() => window.__said.length);
  await again.first().click();
  await page.waitForFunction((n) => {
    return window.__said.length > n && window.__said[window.__said.length - 1] === "Dollhouse!"
      && !document.getElementById("settingsOverlay").classList.contains("open")
      && document.getElementById("dollhouseGame").classList.contains("active");
  }, saidBefore);
  await page.locator("#settingsBtn").click();
  await page.locator("#settingsPlay").click();
  await page.locator("#playAgain button").first().waitFor();
  if (!sessionsText.includes("Dollhouse") || !sessionsText.includes("Kitchen")) {
    throw new Error("recent session missing dollhouse: " + sessionsText);
  }
  const bars = await page.locator("#playStatsChart .play-rhythm-col").count();
  if (bars !== 7) throw new Error("play stats should chart 7 days, got " + bars);
  const todayBar = await page.locator("#playStatsChart .play-rhythm-col.is-today").count();
  if (todayBar !== 1) throw new Error("the last bar should be today");
  const clearBtn = page.locator("#playStatsReset");
  if ((await clearBtn.innerText()).trim() !== "Clear play stats") {
    throw new Error("clear button should be named Clear play stats");
  }
  await page.locator("#playStatsGames .play-stats-game").filter({ hasText: "Dollhouse" }).scrollIntoViewIfNeeded();
  await page.locator(".settings-panel").screenshot({ path: path.join(SHOTS, "dollhouse-play-stats.png") });
  await clearBtn.click();
  const asking = (await clearBtn.innerText()).trim();
  if (!asking.includes("Tap again")) throw new Error("clear should ask before wiping: " + asking);
  const kept = await page.locator("#playStatsGames").innerText();
  if (!kept.includes("Dollhouse")) throw new Error("the first tap must not clear play stats");
  await clearBtn.click();
  await page.waitForFunction(() => {
    const status = document.getElementById("playStatsStatus");
    return !!(status && status.textContent.includes("cleared"));
  });
  const wiped = await page.locator("#playStatsGames").innerText();
  if (wiped.includes("Dollhouse")) throw new Error("the second tap should clear play stats: " + wiped);
  if (await page.locator("#playAgain button").count() !== 0) throw new Error("clearing stats should hide play again");
  if (await page.locator(".play-milestone").count() !== 0) throw new Error("clearing stats should hide milestones");
  await page.locator("#playStatsBack").click();
  await page.locator("#settingsClose").click();

  await page.locator("#dollhouseGame .home-btn").click();
  await page.locator("#menu.screen.active").waitFor();
  await page.evaluate(() => {
    window.Lawson.setLessMotion(true);
    document.querySelectorAll(".sparkle").forEach((el) => el.remove());
    window.__said = [];
  });
  await page.locator("[data-go='dollhouse']").click();
  await page.locator("#dollhouseStage[data-view='hub']").waitFor();
  await page.locator("#dollhouseStage button[data-room='kitchen']").click();
  await clickLabel(page, "Cake");
  const quiet = await page.evaluate(() => ({
    sparkles: document.querySelectorAll(".sparkle").length,
    pop: document.querySelector("#dollhouseStage button[aria-label='Cake']").classList.contains("is-pop"),
    said: window.__said.slice(),
  }));
  if (quiet.sparkles !== 0) throw new Error("less motion should skip dollhouse sparkles, got " + quiet.sparkles);
  if (quiet.pop) throw new Error("less motion should skip the pop");
  if (!quiet.said.includes("Cake")) throw new Error("less motion should still name the choice: " + quiet.said.join(", "));
  await page.evaluate(() => window.Lawson.setLessMotion(false));
  await page.locator("#dollhouseGame .home-btn").click();
  await page.locator("#menu.screen.active").waitFor();
  if (ROOMS.length !== 7) throw new Error("room list drifted");
}

async function tour(page, name, viewport) {
  await page.setViewportSize(viewport);
  await sleep(100);
  if (await page.locator("#menu.screen.active").count()) {
    await fits(page, name + " menu");
    await page.locator("[data-go='dollhouse']").click();
    await page.locator("#dollhouseStage[data-view='hub']").waitFor();
  }
  await fits(page, name + " hub");
  if (name === "desktop") {
    await sleep(1200);
    await page.screenshot({ path: path.join(SHOTS, "dollhouse-desktop-hub.png") });
  }
  await page.locator("#dollhouseStage button[data-room='kitchen']").click();
  await clickLabel(page, "Cake");
  await fits(page, name + " kitchen");
  await clickLabel(page, "Back to Dollhouse");
  await page.locator("#dollhouseStage button[data-room='playroom']").click();
  await fits(page, name + " playroom");
  await clickLabel(page, "Back to Dollhouse");
  await page.locator("#dollhouseGame .home-btn").click();
  await page.locator("#menu.screen.active").waitFor();
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const phone = { width: 390, height: 844 };
  const { page, errors } = await boot(browser, phone);
  await playPhone(page);
  await tour(page, "ipad", { width: 768, height: 1024 });
  await tour(page, "laptop", { width: 1280, height: 800 });
  await tour(page, "desktop", { width: 1440, height: 900 });
  await page.setViewportSize(phone);
  await fits(page, "phone menu again");
  if (errors.length) throw new Error("console errors: " + errors.join(" | "));
  await browser.close();
  console.log("PASS: dollhouse play — rooms, sticker, play stats, four viewports");
}

main().catch((err) => { console.error(err); process.exit(1); });
