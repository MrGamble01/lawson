// Who's That: a silhouette round, a guess, a reveal, and a bounded replay.
// Run: node tests/pokequiz.js
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
    className: "",
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
    removeEventListener() {},
    addEventListener() {},
    click() { if (this.tap) this.tap({ stopPropagation() {} }); },
    querySelectorAll(sel) {
      if (sel === ".pokequiz-btn") return this.children;
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

const ids = {};
[
  "pokequizGame", "pokequizPrompt", "pokequizRound", "pokequizSilhouette",
  "pokequizChoices", "pokequizScoreVal", "pokequizBestVal", "pokequizAgain",
].forEach((id) => { ids[id] = el("div"); });
ids.pokequizGame.classList.add("active");
ids.pokequizAgain.tagName = "BUTTON";

let pending = null;
const keys = [];
const L = {
  games: {},
  pokemon: null,
  onTap(node, fn) { node.tap = fn; },
  onTapOnce(node, fn) { node.tap = fn; },
  afterSpeech(fn) {
    pending = fn;
    return () => { if (pending === fn) pending = null; };
  },
  getHighScore: () => 0,
  cheer: () => "Yay!",
  bumpBadge(id, value) { ids[id].textContent = String(value); },
  bumpHighScore() {},
  celebrateNewHigh() {},
  boboCheer() {},
  say() {},
  sayPrompt() {},
  happySound() {},
  buzzSound() {},
};
const documentMock = {
  getElementById: (id) => ids[id],
  createElement: (tag) => el(tag),
  createElementNS: () => el("svg"),
  addEventListener(type, fn) { if (type === "keydown") keys.push(fn); },
  removeEventListener(type, fn) {
    if (type !== "keydown") return;
    const at = keys.indexOf(fn);
    if (at >= 0) keys.splice(at, 1);
  },
  querySelectorAll(sel) {
    if (sel === "#pokequizChoices .pokequiz-btn") return ids.pokequizChoices.children;
    return [];
  },
};

const context = {
  window: { Lawson: L },
  document: documentMock,
  Math: Math,
  setTimeout: () => 1,
  clearTimeout() {},
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../lib/pokemon.js"), "utf8"), context);
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../games/pokequiz.js"), "utf8"), context);

function flush() {
  assert.equal(typeof pending, "function");
  const fn = pending;
  pending = null;
  fn();
}
function answerId() {
  return ids.pokequizSilhouette.dataset.answer;
}
function press(id) {
  const btn = ids.pokequizChoices.children.find((child) => child.dataset.id === id);
  assert.ok(btn, "missing choice " + id);
  btn.tap({ stopPropagation() {} });
}

assert.equal(L.pokemon.roster.length, 8);
const first = L.pokemon.makeRound([], () => 0);
assert.equal(first.target.id, "pikachu");
assert.equal(first.choices.length, 3);
assert.ok(first.choices.some((mon) => mon.id === "pikachu"));

L.games.pokequiz.start();
assert.equal(ids.pokequizPrompt.textContent, "Who is this?");
assert.equal(ids.pokequizSilhouette.dataset.revealed, "0");
assert.equal(ids.pokequizSilhouette.children.length > 0, true);
assert.equal(ids.pokequizAgain.hidden, true);
assert.equal(ids.pokequizChoices.children.length, 3);

const wrong = ids.pokequizChoices.children.find((child) => child.dataset.id !== answerId());
press(wrong.dataset.id);
assert.equal(ids.pokequizScoreVal.textContent, "0");
assert.equal(ids.pokequizSilhouette.dataset.revealed, "1");
flush();
assert.equal(ids.pokequizRound.textContent, "2 / 6");

press(answerId());
assert.equal(ids.pokequizScoreVal.textContent, "1");
flush();

keys[0]({ key: "1", preventDefault() {} });
assert.equal(ids.pokequizSilhouette.dataset.revealed, "1");
flush();

while (ids.pokequizAgain.hidden) {
  press(answerId());
  flush();
}
assert.match(ids.pokequizPrompt.textContent, /^You found [0-6]!$/);
assert.equal(ids.pokequizChoices.children.length, 0);

keys[0]({ key: "Enter", preventDefault() {} });
assert.equal(ids.pokequizScoreVal.textContent, "0");
assert.equal(ids.pokequizRound.textContent, "1 / 6");
assert.equal(ids.pokequizAgain.hidden, true);
assert.equal(keys.length, 1, "replay should not stack key listeners");

L.games.pokequiz.stop();
assert.equal(keys.length, 0);
console.log("PASS: pokequiz — guess, reveal, keyboard, bounded replay, cleanup");
