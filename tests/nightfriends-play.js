// Night Friends in a real browser: lights, Find a Friend, play again,
// and Play Stats on a phone and an iPad mini.
// Run: node tests/nightfriends-play.js
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
      localStorage.setItem("lawson:tutSeen:nightfriends", "1");
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
  await page.locator("#nightFriendsGame button[aria-label='" + name.replace(/'/g, "\\'") + "']").click();
}

async function play(page, label) {
  const home = page.locator("[data-go='nightfriends']");
  if (await home.count() !== 1) throw new Error(label + " should show one Night Friends tile");
  await home.click();
  await page.locator("#nightFriendsStage[data-mode='free']").waitFor();
  const pressed = await page.locator("#nightFriendsGame button[aria-label='Free Glow']").getAttribute("aria-pressed");
  if (pressed !== "true") throw new Error(label + " should start in Free Glow");
  const welcome = await page.locator("#nightFriendsPrompt").textContent();
  if (welcome !== "Let's glow!") throw new Error(label + " prompt should match the welcome, got " + welcome);

  const sizes = await page.locator("#nightFriendsDock .nf-friend").evaluateAll((els) => els.map((el) => {
    const rect = el.getBoundingClientRect();
    const face = el.querySelector(".nf-face");
    return {
      name: el.getAttribute("aria-label"),
      text: el.querySelector(".nf-name").textContent,
      w: rect.width,
      h: rect.height,
      painted: !!(face && face.getAttribute("src") && face.getAttribute("src").endsWith(".webp")),
    };
  }));
  if (sizes.length !== 6) throw new Error(label + " should offer 6 friends, got " + sizes.length);
  sizes.forEach((box) => {
    if (box.name !== box.text) throw new Error(label + " " + box.name + " label does not match visible text " + box.text);
    if (box.w < 64 || box.h < 64) throw new Error(label + " " + box.name + " is " + Math.round(box.w) + "×" + Math.round(box.h));
    if (!box.painted) throw new Error(label + " " + box.name + " is missing its painted picture");
  });

  const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (scroll > 1) throw new Error(label + " scrolls sideways by " + scroll + "px");

  await clickLabel(page, "Owl");
  await clickLabel(page, "Fox");
  await clickLabel(page, "Owl");
  const lights = await page.locator("#nightFriendsStage").getAttribute("data-lights");
  if (lights !== "2") throw new Error(label + " should have 2 lights, got " + lights);
  const said = await page.evaluate(() => window.__said.slice());
  if (!said.includes("Let's glow!") || !said.includes("Yay! Owl!") || !said.includes("Yay! Fox!") || !said.includes("Hi, Owl!")) {
    throw new Error(label + " missing friend lines: " + said.join(" | "));
  }

  await page.waitForTimeout(700);
  await clickLabel(page, "Find a Friend");
  await page.locator("#nightFriendsStage[data-mode='find'][data-goal='owl']").waitFor();
  const asked = await page.locator("#nightFriendsPrompt").textContent();
  if (asked !== "Find the Owl!") throw new Error(label + " should ask for the owl, got " + asked);
  await clickLabel(page, "Moon");
  const still = await page.locator("#nightFriendsStage").getAttribute("data-lights");
  if (still !== "0") throw new Error(label + " a different friend should not add a light, got " + still);
  await clickLabel(page, "Owl");
  await page.locator("#nightFriendsStage[data-lights='1'][data-goal='fox']").waitFor();
  const next = await page.locator("#nightFriendsPrompt").textContent();
  if (next !== "Find the Fox!") throw new Error(label + " should ask for the fox next, got " + next);

  if (label === "ipad") {
    await page.waitForTimeout(600);
    await page.locator("#settingsBtn").click();
    await page.locator("#settingsPlay").click();
    await page.waitForFunction(() => {
      const el = document.getElementById("playStatsGames");
      return !!(el && el.textContent.includes("Night Friends") && el.textContent.includes("3 lights") && el.textContent.includes("Free Glow") && el.textContent.includes("Find a Friend"));
    });
    const badges = await page.locator(".play-milestone").allTextContents();
    if (!badges.some((badge) => badge.includes("Night Friends"))) {
      throw new Error("milestone should name Night Friends: " + badges.join(", "));
    }
    await page.locator("#playStatsBack").click();
    await page.locator("#settingsClose").click();
  }

  await page.locator("#nightFriendsGame .home-btn").click();
  await page.locator("#menu.screen.active").waitFor();
}

async function main() {
  const browser = await chromium.launch();
  const phone = await boot(browser, { width: 390, height: 844 });
  await play(phone.page, "phone");
  if (phone.errors.length) throw new Error("phone errors: " + phone.errors.join("; "));
  await phone.page.close();

  const ipad = await boot(browser, { width: 744, height: 1133 });
  await play(ipad.page, "ipad");
  if (ipad.errors.length) throw new Error("ipad errors: " + ipad.errors.join("; "));
  await ipad.page.close();

  const land = await boot(browser, { width: 1133, height: 744 });
  await play(land.page, "ipad-land");
  if (land.errors.length) throw new Error("ipad landscape errors: " + land.errors.join("; "));
  await land.page.close();
  await browser.close();
  console.log("PASS: night friends — lights, find a friend, play stats");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
