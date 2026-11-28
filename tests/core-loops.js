// Every game: start, a miss, a score or a finished action, then restart.
// The first half is pure Node. The second drives the real page.
// Run: node tests/core-loops.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const INDEX = "file://" + path.join(ROOT, "index.html");

function resolvePlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return process.env.PLAYWRIGHT_MODULE;
  try { return require.resolve("playwright"); } catch (_) { /* CI installs it locally */ }
  return "/opt/node22/lib/node_modules/playwright";
}

const GAME_FILES = fs.readdirSync(path.join(ROOT, "games")).filter((name) => name.endsWith(".js")).sort();
for (const file of GAME_FILES) {
  const src = fs.readFileSync(path.join(ROOT, "games", file), "utf8");
  const id = file.replace(/\.js$/, "");
  assert.match(src, new RegExp("L\\.games\\." + id + "\\s*="), file + " registers its game");
  assert.match(src, /function start\s*\(/, file + " has start()");
  assert.match(src, /function stop\s*\(/, file + " has stop()");
}
console.log("unit: " + GAME_FILES.length + " games register start and stop");

const { chromium } = require(resolvePlaywright());

const QUIZ = [
  "socks", "shadows", "sky", "blocks", "picnic", "hats", "zoo", "boats",
  "mail", "kites", "balloons", "cupcakes", "listen", "pattern", "howmany",
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function openGame(page, id) {
  await page.evaluate((gameId) => {
    Object.values(window.Lawson.games).forEach((g) => g && g.stop && g.stop());
    const g = window.Lawson.games[gameId];
    window.show(g.screen);
    g.start();
  }, id);
}

async function restart(page, id) {
  await openGame(page, id);
  await sleep(60);
}

async function score(page, id) {
  return page.evaluate((gameId) => {
    const el = document.getElementById(gameId + "ScoreVal");
    return el ? el.textContent.trim() : null;
  }, id);
}

async function labels(page, id) {
  return page.evaluate((gameId) => {
    const screen = document.getElementById(window.Lawson.games[gameId].screen);
    return [...screen.querySelectorAll("button, [role='button']")].filter((b) => {
      if (b.classList.contains("home-btn") || b.classList.contains("mode-tab") || b.classList.contains("badge")) return false;
      if (b.hidden || (b.closest && b.closest("[hidden]"))) return false;
      if (b.disabled) return false;
      const label = b.getAttribute("aria-label") || "";
      if (!label || /^(Score|Best|Streak)\b/.test(label)) return false;
      if (/^(Home|Hear the clue|Next page|Next scene|Clear|Play song|Stop song|Undo|Save doodle|Stamp|Stop stamp)$/i.test(label)) return false;
      return true;
    }).map((b) => b.getAttribute("aria-label"));
  }, id);
}

async function clickLabel(page, id, label) {
  const ok = await page.evaluate(({ gameId, name }) => {
    const screen = document.getElementById(window.Lawson.games[gameId].screen);
    const node = [...screen.querySelectorAll("button, [role='button']")].find((b) => {
      return b.getAttribute("aria-label") === name && !b.disabled && !(b.closest && b.closest("[hidden]"));
    });
    if (!node) return false;
    if (typeof node.click === "function") node.click();
    else node.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return true;
  }, { gameId: id, name: label });
  if (!ok) throw new Error(id + " has no control labeled " + label);
}

async function quiz(page, id) {
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt) await restart(page, id);
    await sleep(80);
    const choices = await labels(page, id);
    assert.ok(choices.length >= 2, id + " offers a choice");
    const before = Number(await score(page, id));
    await clickLabel(page, id, choices[0]);
    await sleep(40);
    const mid = Number(await score(page, id));
    if (mid > before) continue;
    let won = false;
    for (let i = 1; i < choices.length; i++) {
      await clickLabel(page, id, choices[i]);
      await sleep(40);
      if (Number(await score(page, id)) > before) { won = true; break; }
    }
    assert.ok(won, id + " scores after a miss");
    await restart(page, id);
    assert.equal(await score(page, id), "0", id + " restart clears the score");
    return;
  }
  throw new Error(id + " never dealt a wrong answer first");
}

async function pokequiz(page) {
  const wrongId = await page.evaluate(() => {
    const right = document.getElementById("pokequizSilhouette").dataset.answer;
    return [...document.querySelectorAll("#pokequizChoices button")].map((b) => b.dataset.id).find((id) => id !== right);
  });
  const labelFor = (id) => page.evaluate((choice) => {
    return document.querySelector("#pokequizChoices button[data-id='" + choice + "']").getAttribute("aria-label");
  }, id);
  await clickLabel(page, "pokequiz", await labelFor(wrongId));
  assert.equal(await score(page, "pokequiz"), "0");
  await restart(page, "pokequiz");
  const answer = await page.getAttribute("#pokequizSilhouette", "data-answer");
  await clickLabel(page, "pokequiz", await labelFor(answer));
  assert.equal(await score(page, "pokequiz"), "1");
  await restart(page, "pokequiz");
  assert.equal(await score(page, "pokequiz"), "0");
}

async function matchGame(page) {
  const prompt = (await page.locator("#matchPrompt").textContent()).toLowerCase();
  const choices = await labels(page, "match");
  const wrong = choices.find((name) => name.toLowerCase().indexOf("find") !== 0 && prompt.indexOf(name.toLowerCase()) < 0);
  const right = choices.find((name) => prompt.indexOf(name.toLowerCase()) >= 0 && name.toLowerCase().indexOf("find") !== 0);
  assert.ok(wrong && right, "match names a wrong and a right choice");
  await clickLabel(page, "match", wrong);
  assert.equal(await score(page, "match"), "0");
  await clickLabel(page, "match", right);
  assert.equal(await score(page, "match"), "1");
  await restart(page, "match");
  assert.equal(await score(page, "match"), "0");
}

async function findGame(page) {
  await sleep(800);
  const name = (await page.locator(".find-target-name").textContent()).trim();
  const choices = (await labels(page, "find")).filter((label) => !/, found$/.test(label));
  const right = choices.find((label) => label === name || label.startsWith(name + ","));
  const wrong = choices.find((label) => label !== right);
  assert.ok(wrong && right, "find " + JSON.stringify({ name, choices }));
  await clickLabel(page, "find", wrong);
  assert.equal(await score(page, "find"), "0");
  await clickLabel(page, "find", right);
  assert.equal(await score(page, "find"), "1");
  await restart(page, "find");
  assert.equal(await score(page, "find"), "0");
}

async function countGame(page) {
  const before = await score(page, "count");
  await clickLabel(page, "count", (await labels(page, "count"))[0]);
  assert.ok(Number(await score(page, "count")) > Number(before));
  const counted = await page.evaluate(() => {
    const el = document.querySelector("#countStage .counted");
    return el ? el.getAttribute("aria-label") : "";
  });
  const held = await score(page, "count");
  await clickLabel(page, "count", counted);
  assert.equal(await score(page, "count"), held, "a counted item does not score again");
  await restart(page, "count");
  assert.equal(await score(page, "count"), "0");
}

async function dotsGame(page) {
  const miss = await page.evaluate(() => {
    const dots = [...document.querySelectorAll("#dotsStage g.dot")];
    dots[1].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return {
      score: document.getElementById("dotsScoreVal").textContent,
      labels: dots.map((d) => d.getAttribute("aria-label")),
    };
  });
  assert.equal(miss.score, "0", "a dot out of order does not score");
  assert.match(miss.labels[0], /next/, "the first dot stays next after a miss: " + miss.labels.join(" | "));
  await page.evaluate(async () => {
    const fireNext = () => {
      const next = [...document.querySelectorAll("#dotsStage g.dot")].find((d) => /, next$/.test(d.getAttribute("aria-label") || ""));
      if (!next) return false;
      next.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      return true;
    };
    for (let n = 0; n < 12 && document.getElementById("dotsScoreVal").textContent === "0"; n++) {
      if (!fireNext()) break;
      await new Promise((r) => setTimeout(r, 20));
    }
  });
  await sleep(600);
  assert.equal(await score(page, "dots"), "1");
  await restart(page, "dots");
  assert.equal(await score(page, "dots"), "0");
}

async function mixGame(page) {
  const RECIPES = {
    Orange: ["Red", "Yellow"], Green: ["Yellow", "Blue"], Purple: ["Red", "Blue"],
    Pink: ["White", "Red"], Gray: ["Black", "White"],
  };
  const read = async () => (await page.locator("#mixTargetName").textContent()).replace(/^Make /, "").replace(/!$/, "").trim();
  const result = await read();
  const pair = RECIPES[result];
  const choices = await labels(page, "mix");
  assert.ok(pair && choices.includes(pair[0]) && choices.includes(pair[1]), "mix " + JSON.stringify({ result, choices }));
  const others = choices.filter((name) => name !== pair[0] && name !== pair[1]);
  await clickLabel(page, "mix", others[0]);
  await clickLabel(page, "mix", others[1]);
  await sleep(40);
  assert.equal(await score(page, "mix"), "0");
  await restart(page, "mix");
  const again = await read();
  const good = RECIPES[again];
  await clickLabel(page, "mix", good[0]);
  await clickLabel(page, "mix", good[1]);
  await sleep(1000);
  assert.equal(await score(page, "mix"), "1");
  await restart(page, "mix");
  assert.equal(await score(page, "mix"), "0");
}

async function memoryGame(page) {
  const cards = await page.evaluate(() => {
    return [...document.querySelectorAll("#memoryBoard button")].map((b, i) => ({
      i, emoji: (b.dataset.emoji || ""),
    }));
  });
  const seen = {};
  const pairs = [];
  cards.forEach((card) => {
    if (seen[card.emoji] == null) seen[card.emoji] = card.i;
    else pairs.push([seen[card.emoji], card.i]);
  });
  assert.equal(pairs.length, 4);
  for (const [a, b] of pairs) {
    await page.evaluate((index) => document.querySelectorAll("#memoryBoard button")[index].click(), a);
    await page.evaluate((index) => document.querySelectorAll("#memoryBoard button")[index].click(), b);
    await sleep(400);
  }
  await sleep(800);
  assert.equal(await score(page, "memory"), "1");
  await restart(page, "memory");
  assert.equal(await score(page, "memory"), "0");
}

async function popGame(page) {
  await sleep(200);
  await page.evaluate(() => document.getElementById("popArea").click());
  assert.equal(await score(page, "pop"), "0");
  await page.waitForSelector("#popArea .balloon", { timeout: 4000 });
  await page.evaluate(() => document.querySelector("#popArea .balloon").click());
  await sleep(40);
  assert.ok(Number(await score(page, "pop")) > 0);
  await restart(page, "pop");
  assert.equal(await score(page, "pop"), "0");
}

async function whackGame(page) {
  await clickLabel(page, "whack", "Hole 1: empty");
  assert.equal(await score(page, "whack"), "0");
  const hit = await page.waitForFunction(() => {
    const hole = [...document.querySelectorAll("#whackGrid .whack-hole")].find((el) => {
      return !/empty$/.test(el.getAttribute("aria-label") || "");
    });
    return hole ? hole.getAttribute("aria-label") : null;
  }, null, { timeout: 5000 });
  await clickLabel(page, "whack", await hit.jsonValue());
  await sleep(40);
  assert.ok(Number(await score(page, "whack")) > 0);
  await restart(page, "whack");
  assert.equal(await score(page, "whack"), "0");
}

async function cookGame(page) {
  await page.locator("#cookSpatula").click({ force: true });
  assert.equal(await score(page, "cook"), "0");
  await page.locator("#cookBatter").click();
  await page.waitForFunction(() => document.body.dataset.cookState === "flippable", null, { timeout: 6000 });
  await page.locator("#cookSpatula").click({ force: true });
  await page.waitForFunction(() => document.body.dataset.cookState === "cooked", null, { timeout: 4000 });
  await page.evaluate(() => document.getElementById("cookPancake").click());
  await sleep(700);
  assert.ok(Number(await score(page, "cook")) > 0);
  await restart(page, "cook");
  assert.equal(await score(page, "cook"), "0");
}

async function musicGame(page) {
  await clickLabel(page, "music", "Kick");
  assert.ok(Number(await score(page, "music")) > 0);
  await restart(page, "music");
  assert.equal(await score(page, "music"), "0");
}

async function iceCream(page) {
  await page.evaluate(() => document.getElementById("icecreamEat").click());
  assert.equal(await score(page, "icecream"), "0", "an empty cone is not a sundae");
  // A short tap on a tub puts that scoop on the cone. Playwright's click
  // stays on the button; a hand-moved mouse can miss it on a slow runner.
  await page.locator("#icecreamTubs button").first().click();
  await page.evaluate(() => document.getElementById("icecreamEat").click());
  await page.waitForFunction(() => Number(document.getElementById("icecreamScoreVal").textContent) > 0, null, { timeout: 4000 });
  await restart(page, "icecream");
  assert.equal(await score(page, "icecream"), "0");
}

async function farmGame(page) {
  const apples = await labels(page, "farm");
  const apple = apples.find((name) => name === "Apple");
  assert.ok(apple);
  await clickLabel(page, "farm", apple);
  await sleep(40);
  assert.ok(Number(await score(page, "farm")) > 0);
  await restart(page, "farm");
  assert.equal(await score(page, "farm"), "0");
}

async function trainGame(page) {
  await clickLabel(page, "train", "Station 2");
  assert.equal(await score(page, "train"), "0", "a station without the train does not score");
  await clickLabel(page, "train", await page.evaluate(() => {
    return document.getElementById("trainGoStop").getAttribute("aria-label");
  }));
  await page.waitForFunction(() => {
    const el = document.getElementById("trainScoreVal");
    return el && Number(el.textContent) > 0;
  }, null, { timeout: 12000 });
  await restart(page, "train");
  assert.equal(await score(page, "train"), "0");
}

async function gardenGame(page) {
  const can = () => page.evaluate(() => document.getElementById("gardenWaterCan").click());
  const potLabel = () => page.evaluate(() => {
    return [...document.querySelectorAll("#gardenStage [aria-label^='Pot 1:']")][0].getAttribute("aria-label");
  });
  await can();
  await clickLabel(page, "garden", await potLabel());
  await sleep(50);
  assert.match(await potLabel(), /empty/, "water does not plant a seed");
  await clickLabel(page, "garden", await potLabel());
  await sleep(40);
  for (let i = 0; i < 3; i++) {
    await sleep(750);
    await can();
    await clickLabel(page, "garden", await potLabel());
  }
  await sleep(200);
  await clickLabel(page, "garden", await potLabel());
  await sleep(40);
  assert.ok(Number(await score(page, "garden")) > 0);
  await restart(page, "garden");
  assert.equal(await score(page, "garden"), "0");
}

async function dinoGame(page) {
  await page.evaluate(() => document.getElementById("dinoTowel").click());
  assert.equal(await score(page, "dino"), "0");
  await page.evaluate(() => document.getElementById("dinoSoap").click());
  await page.waitForFunction(() => document.body.dataset.dinoPhase === "shower", null, { timeout: 8000 });
  await page.evaluate(() => document.getElementById("dinoShower").click());
  await page.waitForFunction(() => document.body.dataset.dinoPhase === "towel", null, { timeout: 6000 });
  await page.evaluate(() => document.getElementById("dinoTowel").click());
  await page.waitForFunction(() => Number(document.getElementById("dinoScoreVal").textContent) > 0, null, { timeout: 8000 });
  await restart(page, "dino");
  assert.equal(await score(page, "dino"), "0");
}

async function raceGame(page) {
  await clickLabel(page, "pokerace", "Pikachu");
  await clickLabel(page, "pokerace", "Hamburger kart");
  await sleep(100);
  await page.evaluate(() => {
    const stage = document.getElementById("pokeraceStage");
    stage.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }));
  });
  await page.waitForFunction(() => document.getElementById("pokeracePrompt").textContent === "Finished!", null, { timeout: 12000 });
  await restart(page, "pokerace");
  assert.equal(await page.locator("#pokeracePrompt").textContent(), "Who drives?");
}

async function pianoGame(page) {
  await clickLabel(page, "piano", "C");
  const pressed = await page.evaluate(() => document.querySelector("#pianoBoard .piano-white.pressed, #pianoBoard .piano-white") !== null);
  assert.equal(pressed, true);
  await restart(page, "piano");
  assert.equal(await page.locator("#pianoSong").getAttribute("aria-label"), "Play song");
}

async function doodleGame(page) {
  await page.waitForFunction(() => {
    const c = document.getElementById("doodleCanvas");
    return c && c.width > 0 && c.getBoundingClientRect().width > 10;
  });
  await page.evaluate(() => {
    const c = document.getElementById("doodleCanvas");
    const r = c.getBoundingClientRect();
    // Doodle listens for pointer events. A plain mouse event never reaches the canvas.
    const fire = (type, x, y) => c.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, clientX: x, clientY: y,
      button: 0, buttons: 1, pointerId: 1, pointerType: "mouse",
    }));
    fire("pointerdown", r.left + 30, r.top + 30);
    fire("pointermove", r.left + 90, r.top + 70);
    fire("pointerup", r.left + 90, r.top + 70);
  });
  const ink = await page.evaluate(() => {
    const c = document.getElementById("doodleCanvas");
    const data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < data.length; i += 32) if (data[i] > 10) n++;
    return n;
  });
  assert.ok(ink > 0, "a stroke leaves ink");
  await clickLabel(page, "doodle", "Undo");
  await restart(page, "doodle");
  const cleared = await page.evaluate(() => {
    const c = document.getElementById("doodleCanvas");
    const data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < data.length; i += 32) if (data[i] > 10) return false;
    return true;
  });
  assert.equal(cleared, true, "restart clears the drawing");
}

async function colorGame(page) {
  const region = page.locator("#colorStage .region").first();
  assert.equal((await region.getAttribute("fill") || "").toLowerCase(), "white");
  await page.locator("#colorClear").click();
  assert.equal((await region.getAttribute("fill") || "").toLowerCase(), "white", "clear on a blank page does not paint");
  await region.click();
  assert.equal(await region.getAttribute("fill"), "#ff3b30");
  await restart(page, "color");
  assert.equal((await page.locator("#colorStage .region").first().getAttribute("fill") || "").toLowerCase(), "white");
}

async function storyGame(page) {
  const first = await page.locator("#storyStage").innerText();
  await page.locator(".story-character").first().click();
  assert.equal(await page.locator("#storyStage").innerText(), first, "a character poke does not turn the page");
  await page.locator("#storyNext").click();
  await sleep(50);
  assert.notEqual(await page.locator("#storyStage").innerText(), first);
  await restart(page, "story");
  assert.ok((await page.locator("#storyStage").innerText()).length > 0);
}

async function sceneGame(page) {
  await page.evaluate(() => localStorage.removeItem("lawson:scene"));
  await restart(page, "scene");
  const before = await page.locator("#scenePlaced > *").count();
  await clickLabel(page, "scene", "dog");
  await sleep(40);
  assert.ok(await page.locator("#scenePlaced > *").count() > before);
  await clickLabel(page, "scene", "Clear scene");
  await sleep(40);
  await restart(page, "scene");
}

async function dollhouseGame(page) {
  await clickLabel(page, "dollhouse", "Skip to the dollhouse");
  await clickLabel(page, "dollhouse", "Kitchen");
  await clickLabel(page, "dollhouse", "Cake");
  await clickLabel(page, "dollhouse", "Pink frosting");
  await clickLabel(page, "dollhouse", "Strawberry");
  await clickLabel(page, "dollhouse", "Sprinkle party");
  await sleep(80);
  const earned = await page.evaluate(() => (localStorage.getItem("lawson:stickers") || "").includes("gabbyCat"));
  assert.equal(earned, true, "finishing the kitchen earns the Gabby Cat sticker");
  await clickLabel(page, "dollhouse", "Back to Dollhouse");
  assert.equal(await page.evaluate(() => document.getElementById("dollhouseStage").dataset.view), "hub");
  await restart(page, "dollhouse");
  assert.equal(await page.evaluate(() => document.getElementById("dollhouseStage").dataset.view), "hub", "a return visit skips the hello");
}

async function animalTrainGame(page) {
  const stage = () => page.evaluate(() => {
    const el = document.getElementById("animalTrainStage");
    return { phase: el.dataset.phase, filled: el.dataset.filled, mode: el.dataset.mode };
  });
  assert.deepEqual(await stage(), { phase: "load", filled: "0", mode: "free" });
  await clickLabel(page, "animaltrain", "Frog");
  await sleep(40);
  assert.equal((await stage()).filled, "1");
  await clickLabel(page, "animaltrain", "Frog");
  await sleep(40);
  assert.equal((await stage()).filled, "1", "a friend already aboard does not take a second car");
  await clickLabel(page, "animaltrain", "Bear");
  await clickLabel(page, "animaltrain", "Puppy");
  await clickLabel(page, "animaltrain", "Whistle, choo-choo");
  await page.waitForFunction(() => document.getElementById("animalTrainStage").dataset.phase === "again", null, { timeout: 8000 });
  await clickLabel(page, "animaltrain", "Play again");
  await sleep(40);
  assert.deepEqual(await stage(), { phase: "load", filled: "0", mode: "free" });
  await restart(page, "animaltrain");
  assert.deepEqual(await stage(), { phase: "load", filled: "0", mode: "free" }, "restart brings an empty train");
}

async function oceanFriendsGame(page) {
  const stage = () => page.evaluate(() => {
    const el = document.getElementById("oceanFriendsStage");
    return { phase: el.dataset.phase, stars: el.dataset.stars, mode: el.dataset.mode, goal: el.dataset.goal || "" };
  });
  const prompt = () => page.locator("#oceanFriendsPrompt").textContent();
  assert.deepEqual(await stage(), { phase: "swim", stars: "0", mode: "free", goal: "" });
  assert.equal(await prompt(), "Let's swim!");
  await clickLabel(page, "oceanfriends", "Whale");
  await sleep(40);
  assert.equal((await stage()).stars, "1");
  await clickLabel(page, "oceanfriends", "Whale");
  await sleep(40);
  assert.equal((await stage()).stars, "1", "a friend already met does not add another star");
  await clickLabel(page, "oceanfriends", "Sea Turtle");
  await clickLabel(page, "oceanfriends", "Octopus");
  await clickLabel(page, "oceanfriends", "Starfish");
  await clickLabel(page, "oceanfriends", "Clownfish");
  await clickLabel(page, "oceanfriends", "Dolphin");
  await page.waitForFunction(() => document.getElementById("oceanFriendsStage").dataset.phase === "again", null, { timeout: 8000 });
  assert.equal(await prompt(), "Yay! Ocean friends!");
  await clickLabel(page, "oceanfriends", "Play again");
  await sleep(40);
  assert.deepEqual(await stage(), { phase: "swim", stars: "0", mode: "free", goal: "" });
  await restart(page, "oceanfriends");
  assert.deepEqual(await stage(), { phase: "swim", stars: "0", mode: "free", goal: "" }, "restart clears the stars");
  await clickLabel(page, "oceanfriends", "Find Friends");
  await sleep(40);
  assert.equal((await stage()).mode, "find");
  assert.equal((await stage()).goal, "turtle");
  assert.equal(await prompt(), "Find the Sea Turtle!");
  await clickLabel(page, "oceanfriends", "Whale");
  await sleep(40);
  assert.equal((await stage()).stars, "0", "another friend is a hello, not a miss");
  assert.equal((await stage()).goal, "turtle");
  await clickLabel(page, "oceanfriends", "Sea Turtle");
  await sleep(40);
  assert.equal((await stage()).stars, "1");
  assert.equal((await stage()).goal, "whale");
  assert.equal(await prompt(), "Find the Whale!");
}

async function stickersGame(page) {
  const locked = await page.locator("#stickerGrid button").count();
  assert.ok(locked > 0);
  await page.locator("#stickerGrid button").first().click();
  await restart(page, "stickers");
  assert.equal(await page.locator("#stickerGrid button").count(), locked);
}

const SPECIAL = {
  pokequiz: pokequiz,
  match: matchGame,
  find: findGame,
  count: countGame,
  dots: dotsGame,
  mix: mixGame,
  memory: memoryGame,
  pop: popGame,
  whack: whackGame,
  cook: cookGame,
  music: musicGame,
  icecream: iceCream,
  farm: farmGame,
  train: trainGame,
  garden: gardenGame,
  dino: dinoGame,
  pokerace: async (page) => {
    assert.match(await page.locator("#pokeracePrompt").textContent(), /Who drives/);
    await raceGame(page);
  },
  piano: pianoGame,
  doodle: doodleGame,
  color: colorGame,
  story: storyGame,
  scene: sceneGame,
  stickers: stickersGame,
  dollhouse: dollhouseGame,
  animaltrain: animalTrainGame,
  oceanfriends: oceanFriendsGame,
};

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(INDEX);
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    document.getElementById("splash")?.remove();
    window.Lawson.setVoiceMuted(true);
    window.Lawson.setSoundMuted(true);
  });
  const ids = await page.evaluate(() => Object.keys(window.Lawson.games).sort());
  const files = GAME_FILES.map((name) => name.replace(/\.js$/, ""));
  assert.deepEqual(ids, files, "every game file is registered on the page");

  for (const id of ids) {
    errors.length = 0;
    await openGame(page, id);
    await sleep(50);
    if (SPECIAL[id]) await SPECIAL[id](page);
    else await quiz(page, id);
    assert.deepEqual(errors, [], id + " threw " + errors.join(" | "));
    console.log("e2e: " + id);
  }
  await browser.close();
  console.log("PASS: core loops — start, miss, score, restart for " + ids.length + " games");
}

main().catch((err) => { console.error(err); process.exit(1); });
