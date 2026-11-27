// Animal Train in a real browser: boarding, the whistle, play again,
// Color Ride, and Play Stats on a phone and an iPad mini.
// Run: node tests/animaltrain-play.js
const path = require("node:path");

const { chromium } = require(resolvePlaywright());
function resolvePlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return process.env.PLAYWRIGHT_MODULE;
  try { return require.resolve("playwright"); } catch (_) { /* local install later */ }
  return "/opt/node22/lib/node_modules/playwright";
}

const ROOT = path.resolve(__dirname, "..");
const INDEX = "file://" + path.join(ROOT, "index.html");

async function boot(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.addInitScript(() => {
    try {
      localStorage.setItem("lawson:kidName", "Lawson");
      localStorage.setItem("lawson:tutSeen:animaltrain", "1");
    } catch (_) {}
  });
  await page.goto(INDEX);
  await page.evaluate(() => {
    document.getElementById("splash")?.remove();
    document.querySelector(".welcome-toast")?.remove();
    if (window.__closeSettings) window.__closeSettings();
    window.Lawson.setVoiceMuted(true);
    window.Lawson.setSoundMuted(true);
    window.__said = [];
    window.addEventListener("lawson:say", (e) => window.__said.push(e.detail.text));
    window.show("menu");
  });
  return { page, errors };
}

async function clickLabel(page, name) {
  await page.locator("#animalTrainGame button[aria-label='" + name.replace(/'/g, "\\'") + "']").click();
}

async function play(page, label) {
  const home = page.locator("[data-go='animaltrain']");
  if (await home.count() !== 1) throw new Error(label + " should show one Animal Train tile");
  await home.click();
  await page.locator("#animalTrainStage[data-mode='free']").waitFor();
  const pressed = await page.locator("#animalTrainGame button[aria-label='Free Ride']").getAttribute("aria-pressed");
  if (pressed !== "true") throw new Error(label + " should start in Free Ride");

  const sizes = await page.locator("#animalTrainDock .at-animal").evaluateAll((els) => els.map((el) => {
    const rect = el.getBoundingClientRect();
    return { name: el.getAttribute("aria-label"), w: rect.width, h: rect.height };
  }));
  if (sizes.length !== 6) throw new Error(label + " should offer 6 animals, got " + sizes.length);
  sizes.forEach((box) => {
    if (box.w < 64 || box.h < 64) throw new Error(label + " " + box.name + " is " + Math.round(box.w) + "×" + Math.round(box.h));
  });
  const whistle = await page.locator("#animalTrainDock .at-whistle").boundingBox();
  if (!whistle || whistle.height < 64) throw new Error(label + " whistle is too small");

  const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (scroll > 1) throw new Error(label + " scrolls sideways by " + scroll + "px");

  await clickLabel(page, "Bear");
  await clickLabel(page, "Puppy");
  await clickLabel(page, "Bunny");
  const filled = await page.locator("#animalTrainScene .at-car[data-filled='yes']").count();
  if (filled !== 3) throw new Error(label + " should seat 3 friends, got " + filled);
  const said = await page.evaluate(() => window.__said.slice());
  if (!said.includes("All aboard!") || !said.includes("Bear! Roar!") || !said.includes("Puppy! Woof!")) {
    throw new Error(label + " missing animal lines: " + said.join(" | "));
  }

  await clickLabel(page, "Whistle, choo-choo");
  await page.locator("#animalTrainDock button[aria-label='Play again']").waitFor({ timeout: 8000 });
  const after = await page.evaluate(() => window.__said.slice());
  if (!after.includes("Choo-choo!")) throw new Error(label + " should toot");
  const ride = await page.evaluate(() => {
    const game = window.LawsonPlay.snapshot().ranges.today.games.find((item) => item.id === "animaltrain");
    return game ? { rounds: game.rounds, modes: game.modes.map((mode) => mode.id) } : null;
  });
  if (!ride || ride.rounds < 1) throw new Error(label + " play stats missed the ride: " + JSON.stringify(ride));
  if (!ride.modes.includes("Free Ride")) throw new Error(label + " missing Free Ride mode: " + JSON.stringify(ride));

  await clickLabel(page, "Play again");
  await page.locator("#animalTrainStage[data-phase='load'][data-filled='0']").waitFor();
  await clickLabel(page, "Color Ride");
  await page.locator("#animalTrainGoal[data-car='red']").waitFor();
  const goal = await page.locator("#animalTrainGoal").getAttribute("aria-label");
  if (!goal || !/car/i.test(goal)) throw new Error(label + " color goal should be spoken in its name: " + goal);
  await clickLabel(page, "Duck");
  const duckCar = await page.locator("#animalTrainScene .at-car[data-animal='duck']").getAttribute("data-color");
  if (duckCar !== "red") throw new Error(label + " color ride should use the glowing car, got " + duckCar);

  if (label === "ipad") {
    await page.locator("#settingsBtn").click();
    await page.locator("#settingsPlay").click();
    await page.waitForFunction(() => {
      const el = document.getElementById("playStatsGames");
      return !!(el && el.textContent.includes("Animal Train") && el.textContent.includes("1 ride") && el.textContent.includes("Free Ride"));
    });
    const badges = await page.locator(".play-milestone").allTextContents();
    if (!badges.some((badge) => badge.includes("Animal Train"))) {
      throw new Error("milestone should name Animal Train: " + badges.join(", "));
    }
    await page.locator("#playStatsBack").click();
    await page.locator("#settingsClose").click();
  }

  await page.locator("#animalTrainGame .home-btn").click();
  await page.locator("#menu.screen.active").waitFor();
}

async function main() {
  const browser = await chromium.launch();
  const phone = await boot(browser, { width: 390, height: 844 });
  await play(phone.page, "phone");
  if (phone.errors.length) throw new Error("phone errors: " + phone.errors.join("; "));
  await phone.page.close();

  const ipad = await boot(browser, { width: 768, height: 1024 });
  await play(ipad.page, "ipad");
  if (ipad.errors.length) throw new Error("ipad errors: " + ipad.errors.join("; "));
  await ipad.page.close();
  await browser.close();
  console.log("PASS: animal train — boarding, whistle, color ride, play stats");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
