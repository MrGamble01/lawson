// Quiz prompts repeat once after a quiet spell — Color Mix and Dots too.
// "Make orange!" and "Connect the dots! Start with 1." / "Find 3!" used to
// be plain say() lines, so a kid who looked away mid-round heard nothing
// more, while Listen, Match, Pattern, How Many?, Count and Find It!
// already nudge once through sayPrompt(). The games are loaded into a vm
// sandbox with a stub Lawson that records which helper each line went
// through; no browser required.
//
// Run: node tests/prompts.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// ---- virtual clock ----
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

// ---- tiny DOM (HTML and SVG alike) ----
const ids = {};
function el(tag, id) {
  const attrs = {};
  const node = {
    tagName: (tag || 'div').toUpperCase(),
    id: id || '',
    style: {},
    children: [],
    textContent: '',
    dataset: {},
    _classes: new Set(),
    handlers: [],
    classList: {
      add(c) { node._classes.add(c); },
      remove(c) { node._classes.delete(c); },
      contains(c) { return node._classes.has(c); },
    },
    set className(v) { node._classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
    get className() { return [...node._classes].join(' '); },
    setAttribute(k, v) { attrs[k] = String(v); if (k === 'class') node.className = v; },
    getAttribute(k) { return k in attrs ? attrs[k] : null; },
    appendChild(c) { node.children.push(c); return c; },
    querySelector() { return null; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
    set innerHTML(_) { node.children = []; },
    get innerHTML() { return ''; },
  };
  if (id) ids[id] = node;
  return node;
}
['mixBowl', 'mixTarget', 'mixTargetName', 'mixPalette', 'mixScoreVal', 'mixBestVal',
 'dotsStage', 'dotsScoreVal', 'dotsBestVal'].forEach((id) => el('div', id));
const document = {
  getElementById: (id) => ids[id] || null,
  createElement: (tag) => el(tag),
  createElementNS: (_ns, tag) => el(tag),
};

// ---- Lawson stub: records whether a line was a prompt or a plain line ----
const lines = [];
const L = {
  games: {},
  say: (text) => { lines.push({ text, prompt: false }); return Promise.resolve(); },
  sayPrompt: (text) => { lines.push({ text, prompt: true }); return Promise.resolve(); },
  speechDone: () => Promise.resolve(),
  afterSpeech: (fn, opts) => { const id = vSetTimeout(fn, (opts && opts.minMs) || 1200); return () => vClearTimeout(id); },
  onTap: (node, fn) => { node.handlers.push(fn); },
  beep() {}, haptic() {}, happySound() {}, buzzSound() {}, sparkleAt() {},
  cheer: () => 'Yay!',
  bumpBadge() {},
  getHighScore: () => 0,
  bumpHighScore() {},
  earnSticker() {},
  celebrateNewHigh() {},
};
const sandbox = {
  window: { Lawson: L }, document, Math,
  setTimeout: vSetTimeout, clearTimeout: vClearTimeout,
  requestAnimationFrame: (fn) => vSetTimeout(fn, 16),
  Date: { now: () => clock.now },
};
for (const game of ['mix', 'dots']) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, `../games/${game}.js`), 'utf8'), sandbox);
}
const tap = (node) => node.handlers.forEach((fn) => fn({ stopPropagation() {} }));
const last = () => lines.at(-1);

// ---- Color Mix ----
L.games.mix.start();
assert.equal(lines.length, 0, 'Color Mix: the opening prompt waits for the bowl to paint');
runUntil(400);
assert.match(last().text, /^Make \w+!$/, 'Color Mix: "Make …!" is the opening line');
assert.equal(last().prompt, true, 'Color Mix: "Make …!" goes through sayPrompt so it repeats once after a quiet spell');
const drop = ids.mixPalette.children[0];
tap(drop);
assert.equal(last().text, drop.dataset.name, 'Color Mix: the first drop says its colour');
assert.equal(last().prompt, false, 'Color Mix: a colour name is a plain line (it drops the reminder, it is not one)');
L.games.mix.stop();

// ---- Connect the dots ----
lines.length = 0;
L.games.dots.start();
assert.equal(last().text, 'Connect the dots! Start with 1.', 'Dots: opening line');
assert.equal(last().prompt, true, 'Dots: the opening prompt goes through sayPrompt');
const svg = ids.dotsStage.children[0];
const dots = svg.children.filter((c) => c._classes.has('dot'));
assert.ok(dots.length >= 5, 'Dots: the first puzzle has its dots');
tap(dots[2]);
assert.equal(last().text, 'Find 1!', 'Dots: a wrong dot asks for the right one');
assert.equal(last().prompt, true, 'Dots: "Find 1!" is a prompt — a kid who looks away hears it once more');
tap(dots[0]);
assert.equal(last().text, '1', 'Dots: the connected dot says its number');
assert.equal(last().prompt, false, 'Dots: a number is a plain line');
L.games.dots.stop();

console.log('PASS: prompts — Color Mix "Make …!" and Dots "Connect the dots!" / "Find N!" are prompts that repeat once; colour names and numbers are plain lines');
