// Food Karts: steering, boost, finish, reset, and three different karts.
// Run: node tests/pokerace.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function el(tag) {
  const attrs = {};
  const classes = new Set();
  let text = "";
  const node = {
    tagName: String(tag || "div").toUpperCase(),
    hidden: false,
    dataset: {},
    children: [],
    style: {},
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
    },
    setAttribute(key, value) { attrs[key] = String(value); },
    getAttribute(key) { return attrs[key]; },
    appendChild(child) { this.children.push(child); return child; },
    addEventListener() {},
    removeEventListener() {},
    click() { if (this.tap) this.tap({ stopPropagation() {} }); },
    querySelector(sel) { return find(this, sel); },
    querySelectorAll(sel) {
      if (sel === ".pokerace-pick" || sel === ".pokerace-kart") return this.children;
      return [];
    },
  };
  Object.defineProperty(node, "textContent", {
    get() { return text; },
    set(value) {
      text = String(value);
      node.children = [];
    },
  });
  return node;
}
function find(node, sel) {
  const part = sel.match(/\[data-part="([^"]+)"\]/);
  if (part && node.getAttribute("data-part") === part[1]) return node;
  if (sel === "[data-kart]" && node.getAttribute("data-kart")) return node;
  for (let i = 0; i < node.children.length; i++) {
    const found = find(node.children[i], sel);
    if (found) return found;
  }
  return null;
}

const ids = {};
[
  "pokeraceGame", "pokeracePrompt", "pokeraceBestVal", "pokeraceDrivers", "pokeraceKarts",
  "pokeraceStage", "pokeraceRoad", "pokeracePads", "pokeraceFinishLine", "pokeracePlayer",
  "pokeraceControls", "pokeraceLeft", "pokeraceBoost", "pokeraceRight", "pokeraceRestart",
  "pokeraceDone", "pokeraceTime", "pokeraceAgain", "pokeraceChange",
].forEach((id) => { ids[id] = el(id.indexOf("pokerace") === 0 && /Left|Boost|Right|Restart|Again|Change/.test(id) ? "button" : "div"); });
ids.pokeraceGame.classList.add("active");

const keys = { down: [], up: [] };
let rafFn = null;
const L = {
  games: {},
  pokemon: null,
  onTap(node, fn) { node.tap = fn; },
  onTapOnce(node, fn) { node.tap = fn; },
  getHighScore: () => 0,
  setHighScore() {},
  happySound() {},
  say() {},
};
const documentMock = {
  getElementById: (id) => ids[id],
  createElement: (tag) => el(tag),
  createElementNS: () => el("svg"),
  addEventListener(type, fn) {
    if (type === "keydown") keys.down.push(fn);
    if (type === "keyup") keys.up.push(fn);
  },
  removeEventListener(type, fn) {
    const list = type === "keydown" ? keys.down : keys.up;
    const at = list.indexOf(fn);
    if (at >= 0) list.splice(at, 1);
  },
  querySelectorAll(sel) {
    if (sel === "#pokeraceDrivers .pokerace-pick") return ids.pokeraceDrivers.children;
    if (sel === "#pokeraceKarts .pokerace-kart") return ids.pokeraceKarts.children;
    return [];
  },
};
const context = {
  window: { Lawson: L },
  document: documentMock,
  Math: Math,
  requestAnimationFrame(fn) { rafFn = fn; return 1; },
  cancelAnimationFrame() { rafFn = null; },
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../lib/pokemon.js"), "utf8"), context);
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../games/pokerace.js"), "utf8"), context);

const race = L.race;
const steered = race.createRace("eevee", "fries");
race.stepRace(steered, 1, { steer: -1 });
assert.ok(steered.x < 0, "steering left moves the kart left");

const boosted = race.createRace("eevee", "fries");
const plain = race.createRace("eevee", "fries");
race.stepRace(boosted, 1, { boost: true });
race.stepRace(plain, 1, {});
assert.equal(boosted.charges, 1);
assert.ok(boosted.speed > plain.speed, "a boost is faster than cruising");

const grass = race.createRace("eevee", "fries");
grass.x = 0.9;
race.stepRace(grass, 1, {});
assert.ok(grass.speed < plain.speed, "leaving the road slows the kart");

const pad = race.createRace("pikachu", "burger");
pad.distance = 130;
race.stepRace(pad, 0.2, {});
assert.ok(pad.padsTaken.indexOf(140) >= 0, "a boost pad on the road triggers");
assert.ok(pad.boostTime > 0);

const done = race.createRace("pikachu", "hotdog");
race.stepRace(done, 10, {});
assert.equal(done.finished, true);
assert.equal(done.distance, race.finishAt);

const again = race.resetRace(done);
assert.equal(again.driver, "pikachu");
assert.equal(again.kart, "hotdog");
assert.equal(again.distance, 0);
assert.equal(again.finished, false);
assert.equal(again.charges, 2);

function pick(driver, kart) {
  L.games.pokerace.start();
  const driverBtn = ids.pokeraceDrivers.children.find((btn) => btn.dataset.id === driver);
  driverBtn.tap();
  const kartBtn = ids.pokeraceKarts.children.find((btn) => btn.dataset.id === kart);
  kartBtn.tap();
}
["burger", "fries", "hotdog"].forEach((kart) => {
  pick("pikachu", kart);
  const player = ids.pokeracePlayer;
  assert.equal(player.dataset.driver, "pikachu", kart + " keeps the driver");
  assert.equal(player.dataset.kart, kart);
  assert.equal(player.querySelector("[data-kart]").getAttribute("data-kart"), kart);
});
assert.ok(ids.pokeracePlayer.querySelector('[data-part="sausage"]'), "hot dog kart draws a sausage");
pick("charmander", "burger");
assert.equal(ids.pokeracePlayer.dataset.driver, "charmander");
assert.ok(ids.pokeracePlayer.querySelector('[data-part="patty"]'), "burger kart draws a patty");
assert.equal(ids.pokeracePlayer.querySelector('[data-part="sausage"]'), null);
pick("charmander", "fries");
assert.equal(ids.pokeracePlayer.dataset.driver, "charmander");
assert.ok(ids.pokeracePlayer.querySelector('[data-part="box"]'), "fries kart draws a carton");

const leftBefore = ids.pokeracePlayer.style.left;
keys.down[0]({ key: "ArrowRight", preventDefault() {} });
rafFn(1000);
rafFn(1400);
assert.notEqual(ids.pokeracePlayer.style.left, leftBefore, "holding right moves the kart");
keys.down[0]({ key: " ", repeat: false, preventDefault() {} });
rafFn(1600);
assert.equal(ids.pokeraceBoost.dataset.charges, "1");

ids.pokeraceRestart.tap();
assert.equal(ids.pokeracePlayer.dataset.driver, "charmander");
assert.equal(ids.pokeracePlayer.dataset.kart, "fries");
assert.equal(ids.pokeraceBoost.dataset.charges, "2");

L.games.pokerace.stop();
assert.equal(rafFn, null);
assert.equal(keys.down.length, 0);
console.log("PASS: pokerace — steer, boost, pad, finish, reset, three karts, same driver");
