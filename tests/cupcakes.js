// Cupcakes: one right frosting, a miss can be tried again, leaving cancels the prompt.
// Run: node tests/cupcakes.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const clock = { now: 0, timers: new Map(), nextId: 0 };
function vSetTimeout(fn, ms) {
  const id = ++clock.nextId;
  clock.timers.set(id, { at: clock.now + (ms || 0), fn });
  return id;
}
function vClearTimeout(id) { clock.timers.delete(id); }
function runUntil(t) {
  for (;;) {
    let next = null;
    for (const [id, tm] of clock.timers) if (tm.at <= t && (!next || tm.at < next.tm.at)) next = { id, tm };
    if (!next) break;
    clock.timers.delete(next.id);
    clock.now = next.tm.at;
    next.tm.fn();
  }
  clock.now = t;
}

function el(tag) {
  const node = {
    tagName: String(tag || "div").toUpperCase(),
    children: [],
    attrs: {},
    className: "",
    style: { setProperty() {} },
    dataset: {},
    handlers: [],
    _classes: new Set(),
    classList: {
      add: (c) => node._classes.add(c),
      remove: (c) => node._classes.delete(c),
      contains: (c) => node._classes.has(c),
    },
    setAttribute(k, v) { node.attrs[k] = String(v); },
    getAttribute(k) { return node.attrs[k]; },
    appendChild(c) { node.children.push(c); return c; },
    set innerHTML(_) { node.children = []; },
  };
  return node;
}

const ids = {
  cupcakesPrompt: el("p"),
  cupcakesSample: el("div"),
  cupcakesChoices: el("div"),
  cupcakesScoreVal: el("span"),
  cupcakesBestVal: el("span"),
};
ids.cupcakesScoreVal.textContent = "0";
ids.cupcakesBestVal.textContent = "0";

const spoken = [];
const L = {
  games: {},
  say: (text) => { spoken.push(String(text)); },
  sayPrompt: (text) => { spoken.push("prompt:" + text); },
  afterSpeech: (fn) => {
    const id = vSetTimeout(fn, 0);
    return () => vClearTimeout(id);
  },
  onTap: (node, fn) => { node.handlers.push(fn); },
  shuffled: (arr) => arr,
  pointOf: () => ({ x: 1, y: 1 }),
  sparkleAt() {},
  happySound() {},
  buzzSound() {},
  cheer: () => "Yay",
  bumpBadge: (id, n) => { if (ids[id]) ids[id].textContent = String(n); },
  bumpHighScore() {},
  getHighScore: () => 0,
  celebrateNewHigh() {},
};
const document = {
  getElementById: (id) => ids[id] || null,
  createElement: (tag) => el(tag),
  createElementNS: () => el("svg"),
};

vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../games/cupcakes.js"), "utf8"), {
  window: { Lawson: L },
  document,
  Math: Object.assign(Object.create(Math), { random: () => 0 }),
  setTimeout: vSetTimeout,
  clearTimeout: vClearTimeout,
});

const game = L.games.cupcakes;
function tap(button) { button.handlers[0]({ stopPropagation() {} }); }
function choice(name) {
  return ids.cupcakesChoices.children.find((b) => b.getAttribute("aria-label") === name + " cupcake");
}

game.start();
runUntil(450);
assert.equal(spoken.filter((s) => s.startsWith("prompt:")).length, 1, "the question is asked once");
assert.equal(ids.cupcakesChoices.children.length, 3, "three cupcakes");
const names = ids.cupcakesChoices.children.map((b) => b.getAttribute("aria-label"));
assert.equal(new Set(names).size, 3, "the three frostings are different");

const right = ids.cupcakesChoices.children[0];
const wrong = ids.cupcakesChoices.children[1];
tap(wrong);
assert.equal(ids.cupcakesScoreVal.textContent, "0", "a miss does not score");
assert.ok(spoken.includes("Try again!"));
tap(right);
assert.equal(ids.cupcakesScoreVal.textContent, "1", "the right frosting scores after a miss");
const score = ids.cupcakesScoreVal.textContent;
tap(right);
assert.equal(ids.cupcakesScoreVal.textContent, score, "a second tap on a scored cupcake does not score again");

const prompts = spoken.filter((s) => s.startsWith("prompt:")).length;
game.start();
game.stop();
runUntil(clock.now + 2000);
assert.equal(spoken.filter((s) => s.startsWith("prompt:")).length, prompts, "leaving cancels the question");

console.log("PASS: cupcakes — miss then match, one score, stop cancels the prompt");
