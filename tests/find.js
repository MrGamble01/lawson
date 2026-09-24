// Find It! accessible target names; no browser required.
// Run: node tests/find.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../games/find.js'), 'utf8');

function element() {
  const classes = new Set();
  return {
    style: {}, dataset: {}, children: [], attrs: {}, textContent: '',
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, on) => on ? classes.add(c) : classes.delete(c),
    },
    setAttribute(n, v) { this.attrs[n] = String(v); },
    getAttribute(n) { return this.attrs[n]; },
    appendChild(child) { this.children.push(child); },
    set innerHTML(value) { this.children = []; this.html = value; },
  };
}

for (const mode of ['free', 'letters', 'numbers']) {
  const ids = Object.fromEntries(['findStage', 'findGame', 'findPrompt', 'findBestVal']
    .map((id) => [id, element()]));
  const tabs = ['free', 'letters', 'numbers'].map((m) => {
    const tab = element();
    tab.dataset.mode = m;
    return tab;
  });
  const timers = new Map();
  let nextId = 0;
  const setTimeout = (fn, ms) => {
    const id = ++nextId;
    timers.set(id, { fn, ms });
    return id;
  };
  const clearTimeout = (id) => timers.delete(id);
  function runTimer(ms) {
    const entry = [...timers].find(([, timer]) => timer.ms === ms);
    assert.ok(entry, `expected a ${ms} ms timer`);
    timers.delete(entry[0]);
    entry[1].fn();
  }
  let prompt;
  const L = {
    games: {},
    shuffled: (items) => items.slice(),
    onTap: (el, fn) => { el.tap = fn; },
    onTapOnce: (el, fn) => { el.tap = fn; },
    getHighScore: () => 100,
    bumpHighScore() {}, bumpBadge() {}, celebrateNewHigh() {},
    happySound() {}, buzzSound() {}, beep() {}, sparkleAt() {}, say() {},
    cheer: () => 'Yay!',
    pointOf: () => ({ x: 0, y: 0 }),
    sayPrompt: (spoken, unused, display) => { prompt = display || spoken; },
    afterSpeech: (fn, { minMs }) => {
      const id = setTimeout(fn, minMs);
      return () => clearTimeout(id);
    },
  };
  vm.runInNewContext(source, {
    window: { Lawson: L }, setTimeout, clearTimeout,
    document: {
      getElementById: (id) => ids[id] || null,
      createElement: () => element(),
      querySelectorAll: (selector) => {
        if (selector === '#findGame .mode-tab') return tabs;
        if (selector === '#findStage .find-item') return ids.findStage.children;
        return [];
      },
    },
  });
  const tap = (el) => el.tap({ stopPropagation() {} });
  L.games.find.start();
  if (mode !== 'free') tap(tabs.find((tab) => tab.dataset.mode === mode));
  const items = ids.findStage.children;
  const bases = items.map((el) => el.getAttribute('aria-label'));
  assert.ok(bases.every((name) => name && !name.includes(',')), `${mode}: every spawn has a base name`);
  if (mode !== 'free') {
    assert.deepEqual(bases, items.map((el) => el.textContent), 'learning names use the glyph');
  }
  runTimer(600);
  for (let i = 0; i < 5; i++) {
    const goal = /^Find the (.+)!$/.exec(prompt)[1];
    assert.equal(goal, bases[i], 'the spoken goal matches the expected item');
    items.forEach((el, j) => {
      const suffix = j < i ? ', found' : j === i ? ', next' : '';
      assert.equal(el.getAttribute('aria-label'), bases[j] + suffix, `${mode}: target ${i}, item ${j}`);
    });
    tap(items[i]);
    assert.equal(items[i].getAttribute('aria-label'), `${goal}, found`, 'a correct tap replaces next with found');
    runTimer(1100);
  }
  items.forEach((el, i) => {
    assert.equal(el.getAttribute('aria-label'), bases[i] + (i < 5 ? ', found' : ''),
      'clearing the target preserves found names and leaves no next label');
  });
  L.games.find.stop();
}
console.log('PASS: find — free, ABC and 123 name the next target and preserve found names');
