// Garden sun easter-egg pacing; no browser required.
// The fifth tap used to say "Sunshine!" and "Sunshine power!" in the
// same tick, so the second line cut the first off. Now the power line
// (and the bonus grows) wait on afterSpeech — floor 400 ms, beat 150 ms,
// ceiling 3 s — and stop() cancels the waiter.
//
// Run: node tests/garden.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/garden.js'), 'utf8');

// ---- virtual clock ----
const clock = { now: 0, timers: new Map(), nextId: 0, intervals: new Map() };
const flush = () => new Promise(r => setImmediate(r));
function vSetTimeout(fn, ms) {
  const id = ++clock.nextId;
  clock.timers.set(id, { at: clock.now + (ms || 0), fn });
  return id;
}
function vClearTimeout(id) { clock.timers.delete(id); }
function vSetInterval(fn, ms) {
  const id = ++clock.nextId;
  const step = () => { clock.intervals.set(id, vSetTimeout(() => { step(); fn(); }, ms)); };
  step();
  return id;
}
function vClearInterval(id) {
  const nested = clock.intervals.get(id);
  if (nested) vClearTimeout(nested);
  clock.intervals.delete(id);
}
async function runUntil(t) {
  for (;;) {
    let next = null;
    for (const [id, tm] of clock.timers) if (tm.at <= t && (!next || tm.at < next.tm.at)) next = { id, tm };
    if (!next) break;
    clock.timers.delete(next.id);
    clock.now = next.tm.at;
    next.tm.fn();
    await flush();
  }
  clock.now = t;
  await flush();
}

// ---- tiny DOM ----
const ids = {};
function queryAll(root, sel) {
  const out = [];
  const walk = (n) => {
    if (!n || !n.children) return;
    for (const c of n.children) {
      if (sel.startsWith('.') && c._classes.has(sel.slice(1))) out.push(c);
      else if (sel.startsWith('#') && c.id === sel.slice(1)) out.push(c);
      else if (c.tagName && c.tagName.toLowerCase() === sel) out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
}
function el(tag, id, cls) {
  const node = {
    tagName: (tag || 'div').toUpperCase(),
    id: id || '',
    style: { setProperty() {} },
    dataset: {},
    children: [],
    parent: null,
    _classes: new Set(String(cls || '').split(/\s+/).filter(Boolean)),
    textContent: '',
    offsetWidth: 80,
    offsetHeight: 80,
    handlers: [],
    attrs: {},
    classList: {
      add(c) { node._classes.add(c); },
      remove(c) { node._classes.delete(c); },
      toggle(c, on) {
        if (on === false || (on === undefined && node._classes.has(c))) node._classes.delete(c);
        else node._classes.add(c);
      },
      contains(c) { return node._classes.has(c); },
    },
    get className() { return [...node._classes].join(' '); },
    set className(v) { node._classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
    setAttribute(n, v) {
      node.attrs[n] = v;
      if (n === 'id') { node.id = v; ids[v] = node; }
    },
    getAttribute(n) { return node.attrs[n]; },
    getBoundingClientRect: () => ({ left: 10, top: 10, width: 80, height: 80, right: 90, bottom: 90 }),
    appendChild(c) { node.children.push(c); c.parent = node; return c; },
    querySelector(sel) { return queryAll(node, sel)[0] || null; },
    querySelectorAll(sel) { return queryAll(node, sel); },
    addEventListener() {},
    setPointerCapture() {},
    remove() {
      if (!node.parent) return;
      node.parent.children = node.parent.children.filter((c) => c !== node);
    },
    set innerHTML(html) {
      node.children = [];
      if (!html) return;
      for (const m of html.matchAll(/<(\w+)([^>]*)>/g)) {
        const a = m[2];
        const childId = (a.match(/\bid="([^"]+)"/) || [])[1];
        const childCls = (a.match(/\bclass="([^"]+)"/) || [])[1] || '';
        const child = el(m[1], childId, childCls);
        if (childId) ids[childId] = child;
        const label = a.match(/aria-label="([^"]+)"/);
        if (label) child.setAttribute('aria-label', label[1]);
        if (/aria-hidden="true"/.test(a)) child.setAttribute('aria-hidden', 'true');
        node.appendChild(child);
      }
    },
    get innerHTML() { return ''; },
  };
  if (id) ids[id] = node;
  return node;
}

ids.gardenStage = el('div', 'gardenStage', 'garden-stage');
ids.gardenScoreVal = el('span', 'gardenScoreVal');
ids.gardenBestVal = el('span', 'gardenBestVal');
const body = el('body');
const document = {
  body,
  getElementById: (id) => ids[id] || null,
  createElement: (tag) => el(tag),
  querySelectorAll: (sel) => {
    const all = el('root');
    all.children = Object.values(ids);
    return queryAll(all, sel);
  },
};

// ---- Lawson stub ----
const spoken = [];
let inFlight = null;
let lastSaid = Promise.resolve();
const L = {
  games: {},
  say: (text) => (lastSaid = new Promise((resolve) => {
    if (inFlight) inFlight.resolve();
    const entry = { text, done: false, resolve: () => { entry.done = true; resolve(); } };
    inFlight = entry;
    spoken.push(entry);
  })),
  speechDone: () => lastSaid,
  afterSpeech: (fn, opts) => {
    const { beatMs = 500, minMs = 1200, maxMs = 6000 } = opts || {};
    const started = clock.now;
    let done = false;
    const elapsed = () => clock.now - started;
    const ceiling = () => fire(true);
    let timer = vSetTimeout(ceiling, maxMs);
    function idle() { const line = lastSaid; return line.then(() => (lastSaid === line ? undefined : idle())); }
    function fire(force) {
      if (done) return;
      if (!force && inFlight && !inFlight.done) {
        vClearTimeout(timer);
        timer = vSetTimeout(ceiling, Math.max(0, maxMs - elapsed()));
        idle().then(() => {
          if (done) return;
          vClearTimeout(timer);
          timer = vSetTimeout(fire, Math.min(beatMs, Math.max(0, maxMs - elapsed())));
        });
        return;
      }
      done = true; vClearTimeout(timer); fn();
    }
    idle().then(() => {
      if (done) return;
      vClearTimeout(timer);
      timer = vSetTimeout(fire, Math.max(beatMs, minMs - elapsed()));
    });
    return () => { done = true; vClearTimeout(timer); };
  },
  onTap: (node, fn) => { node.handlers.push(fn); },
  tapToUse() {},
  beep() {}, haptic() {}, happySound() {}, sparkleAt() {},
  cheer: () => 'Yay!',
  bumpBadge() {},
  getHighScore: () => 0,
  bumpHighScore() {},
  earnSticker() {},
  celebrateNewHigh() {},
  pointOf: () => ({ x: 0, y: 0 }),
};
const window = { Lawson: L };
vm.runInNewContext(source, {
  window, document, Math,
  setTimeout: vSetTimeout, clearTimeout: vClearTimeout,
  setInterval: vSetInterval, clearInterval: vClearInterval,
  Date: { now: () => clock.now },
});
const garden = L.games.garden;
const lastLine = () => spoken.at(-1);
const texts = () => spoken.map((s) => s.text);
const finishLine = async (entry) => { entry.resolve(); await flush(); };
const tapSun = () => {
  const sun = ids.gardenSun;
  assert.ok(sun && sun.handlers.length, 'sun should have a tap handler after start');
  sun.handlers.forEach((fn) => fn({}));
};

(async () => {
  garden.start();
  const welcome = lastLine();
  assert.equal(welcome.text, 'Welcome to the garden! Tap a pot to plant a seed.');
  await finishLine(welcome);

  // Four taps: just "Sunshine!", no easter egg.
  for (let n = 1; n <= 4; n++) {
    tapSun();
    assert.equal(lastLine().text, 'Sunshine!', `tap ${n} should say Sunshine!`);
    await finishLine(lastLine());
  }
  assert.ok(!texts().includes('Sunshine power!'), 'power line stays off until the fifth tap');

  // Fifth tap: Sunshine! stays in flight past the old same-tick cut-off
  // and past the 400 ms floor; power starts one beat after it ends.
  tapSun();
  const fifth = lastLine();
  assert.equal(fifth.text, 'Sunshine!');
  assert.ok(!texts().includes('Sunshine power!'), 'power must not start in the same tick');
  await runUntil(clock.now + 550);
  assert.equal(fifth.done, false);
  assert.ok(!texts().includes('Sunshine power!'), 'power must not start while Sunshine is still held');
  const releasedAt = clock.now;
  await finishLine(fifth);
  await runUntil(releasedAt + 149);
  assert.ok(!texts().includes('Sunshine power!'), 'power waits the 150 ms beat');
  await runUntil(releasedAt + 150);
  assert.equal(lastLine().text, 'Sunshine power!', 'power starts one beat after Sunshine ends');

  // A sixth tap while power is pending cancels it and says Sunshine! again.
  garden.stop();
  spoken.length = 0;
  inFlight = null;
  lastSaid = Promise.resolve();
  garden.start();
  await finishLine(lastLine());
  for (let n = 0; n < 5; n++) {
    tapSun();
    if (n < 4) await finishLine(lastLine());
  }
  assert.equal(lastLine().text, 'Sunshine!');
  tapSun();
  assert.equal(lastLine().text, 'Sunshine!', 'sixth tap cuts in with Sunshine!');
  await runUntil(clock.now + 3000);
  assert.ok(!texts().includes('Sunshine power!'), 'cancelled waiter must not speak power');

  // stop() cancels a pending waiter.
  garden.stop();
  spoken.length = 0;
  inFlight = null;
  lastSaid = Promise.resolve();
  garden.start();
  await finishLine(lastLine());
  for (let n = 0; n < 5; n++) tapSun();
  assert.equal(lastLine().text, 'Sunshine!');
  garden.stop();
  const held = lastLine();
  await finishLine(held);
  await runUntil(clock.now + 3000);
  assert.ok(!texts().includes('Sunshine power!'), 'stop() cancels the pending power line');

  console.log('PASS: garden sun — Sunshine! is heard before Sunshine power!; a later tap or stop() cancels the waiter');
})().catch((e) => { console.error(e); process.exit(1); });
