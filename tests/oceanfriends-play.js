// Ocean Friends in a real browser: bubbles, Find Friends, play again,
// and Play Stats on a phone and an iPad mini.
// Run: node tests/oceanfriends-play.js
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
      localStorage.setItem("lawson:tutSeen:oceanfriends", "1");
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
  await page.locator("#oceanFriendsGame button[aria-label='" + name.replace(/'/g, "\\'") + "']").click();
}

async function play(page, label) {
  const home = page.locator("[data-go='oceanfriends']");
  if (await home.count() !== 1) throw new Error(label + " should show one Ocean Friends tile");
  await home.click();
  await page.locator("#oceanFriendsStage[data-mode='free']").waitFor();
  const pressed = await page.locator("#oceanFriendsGame button[aria-label='Free Swim']").getAttribute("aria-pressed");
  if (pressed !== "true") throw new Error(label + " should start in Free Swim");
  const welcome = await page.locator("#oceanFriendsPrompt").textContent();
  if (welcome !== "Let's swim!") throw new Error(label + " prompt should match the welcome, got " + welcome);

  const sizes = await page.locator("#oceanFriendsDock .of-friend").evaluateAll((els) => els.map((el) => {
    const rect = el.getBoundingClientRect();
    return { name: el.getAttribute("aria-label"), text: el.querySelector(".of-name").textContent, w: rect.width, h: rect.height };
  }));
  if (sizes.length !== 6) throw new Error(label + " should offer 6 friends, got " + sizes.length);
  sizes.forEach((box) => {
    if (box.name !== box.text) throw new Error(label + " " + box.name + " label does not match visible text " + box.text);
    if (box.w < 64 || box.h < 64) throw new Error(label + " " + box.name + " is " + Math.round(box.w) + "×" + Math.round(box.h));
  });

  const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (scroll > 1) throw new Error(label + " scrolls sideways by " + scroll + "px");

  await clickLabel(page, "Whale");
  await clickLabel(page, "Sea Turtle");
  await clickLabel(page, "Whale");
  const stars = await page.locator("#oceanFriendsStage").getAttribute("data-stars");
  if (stars !== "2") throw new Error(label + " should have 2 stars, got " + stars);
  const said = await page.evaluate(() => window.__said.slice());
  if (!said.includes("Let's swim!") || !said.includes("Yay! Whale!") || !said.includes("Yay! Sea Turtle!") || !said.includes("Hi, Whale!")) {
    throw new Error(label + " missing friend lines: " + said.join(" | "));
  }

  await page.waitForTimeout(700);
  await clickLabel(page, "Find Friends");
  await page.locator("#oceanFriendsStage[data-mode='find'][data-goal='turtle']").waitFor();
  const asked = await page.locator("#oceanFriendsPrompt").textContent();
  if (asked !== "Find the Sea Turtle!") throw new Error(label + " should ask for the sea turtle, got " + asked);
  await clickLabel(page, "Dolphin");
  const still = await page.locator("#oceanFriendsStage").getAttribute("data-stars");
  if (still !== "0") throw new Error(label + " a different friend should not add a star, got " + still);
  await clickLabel(page, "Sea Turtle");
  await page.locator("#oceanFriendsStage[data-stars='1'][data-goal='whale']").waitFor();
  const next = await page.locator("#oceanFriendsPrompt").textContent();
  if (next !== "Find the Whale!") throw new Error(label + " should ask for the whale next, got " + next);

  if (label === "ipad") {
    await page.waitForTimeout(600);
    await page.locator("#settingsBtn").click();
    await page.locator("#settingsPlay").click();
    await page.waitForFunction(() => {
      const el = document.getElementById("playStatsGames");
      return !!(el && el.textContent.includes("Ocean Friends") && el.textContent.includes("3 stars") && el.textContent.includes("Free Swim") && el.textContent.includes("Find Friends"));
    });
    const badges = await page.locator(".play-milestone").allTextContents();
    if (!badges.some((badge) => badge.includes("Ocean Friends"))) {
      throw new Error("milestone should name Ocean Friends: " + badges.join(", "));
    }
    await page.locator("#playStatsBack").click();
    await page.locator("#settingsClose").click();
  }

  await page.locator("#oceanFriendsGame .home-btn").click();
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
  console.log("PASS: ocean friends — bubbles, find friends, play stats");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
