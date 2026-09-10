// Train station pacing; no browser required.
// Arriving used to say "Station N!" and then boardOrLeave() in the same
// tick, so "Woof!" / "Bye bye!" cut the stop off. Now the passenger hops
// on immediately; the spoken line waits on afterSpeech — floor 400 ms,
// beat 150 ms, ceiling 3 s — and stop() cancels the waiter.
//
// Run: node tests/train.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/train.js'), 'utf8');

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

const ids = {};
const allNodes = [];
function el(tag, id, cls) {
  const node = {
    tagName: (tag || 'div').toUpperCase(),
    id: id || '',
    style: {},
    dataset: {},
    children: [],
    parent: null,
    hidden: false,
    textContent: '',
    offsetWidth: 1,
    _classes: new Set(String(cls || '').split(/\s+/).filter(Boolean)),
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
      node.attrs[n] = String(v);
      if (n === 'id') { node.id = v; ids[v] = node; }
      if (n.startsWith('data-')) node.dataset[n.slice(5)] = String(v);
    },
    getAttribute(n) { return node.attrs[n]; },
    getBoundingClientRect: () => ({ left: 10, top: 10, width: 80, height: 80, right: 90, bottom: 90 }),
    appendChild(c) { node.children.push(c); c.parent = node; return c; },
    querySelector(sel) { return collect(node, sel)[0] || null; },
    querySelectorAll(sel) { return collect(node, sel); },
    remove() {
      if (!node.parent) return;
      node.parent.children = node.parent.children.filter((c) => c !== node);
      node.parent = null;
    },
    set innerHTML(html) {
      node.children = [];
      parseFragment(html).forEach((c) => node.appendChild(c));
    },
    get innerHTML() { return ''; },
  };
  Object.defineProperty(node, 'parentNode', { get() { return node.parent; } });
  if (id) ids[id] = node;
  allNodes.push(node);
  return node;
}

const VOID = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'circle', 'ellipse', 'rect', 'line', 'path', 'polygon']);
function parseFragment(html) {
  const root = el('fragment');
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<(\/)?([a-zA-Z][\w:-]*)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<!--')) continue;
    if (m[1] === '/') { if (stack.length > 1) stack.pop(); continue; }
    if (m[2]) {
      const attrs = m[3] || '';
      const id = (attrs.match(/\bid="([^"]+)"/) || [])[1];
      const cls = (attrs.match(/\bclass="([^"]+)"/) || [])[1];
      const child = el(m[2], id, cls);
      const dataCar = (attrs.match(/\bdata-car="([^"]+)"/) || [])[1];
      if (dataCar != null) child.dataset.car = dataCar;
      const aria = (attrs.match(/\baria-label="([^"]+)"/) || [])[1];
      if (aria) child.setAttribute('aria-label', aria);
      stack[stack.length - 1].appendChild(child);
      const selfClose = /\/\s*$/.test(attrs) || VOID.has(m[2].toLowerCase());
      if (!selfClose) stack.push(child);
    }
  }
  return root.children;
}

function matchesSimple(node, simple) {
  const m = simple.match(/^(\w+)?(?:#([\w-]+))?(?:\.([\w-]+))?(?:\[data-([^=]+)="([^"]+)"\])?$/);
  if (!m) return false;
  if (m[1] && node.tagName !== m[1].toUpperCase()) return false;
  if (m[2] && node.id !== m[2]) return false;
  if (m[3] && !node._classes.has(m[3])) return false;
  if (m[4] && String(node.dataset[m[4]]) !== m[5]) return false;
  return true;
}
function matches(node, sel) {
  const parts = sel.trim().split(/\s+/);
  let cur = node;
  if (!matchesSimple(cur, parts[parts.length - 1])) return false;
  for (let i = parts.length - 2; i >= 0; i--) {
    cur = cur.parent;
    while (cur && !matchesSimple(cur, parts[i])) cur = cur.parent;
    if (!cur) return false;
  }
  return true;
}
function collect(root, sel) {
  const out = [];
  const walk = (n) => {
    for (const c of n.children) {
      if (matches(c, sel)) out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
}

ids.trainGame = el('section', 'trainGame');
ids.trainScoreVal = el('span', 'trainScoreVal');
ids.trainBestVal = el('span', 'trainBestVal');
ids.trainStage = el('div', 'trainStage', 'train-stage');
ids.trainGame.appendChild(ids.trainStage);

const document = {
  getElementById: (id) => ids[id] || null,
  createElement: (tag) => el(tag),
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
  querySelectorAll(sel) { return collect(ids.trainGame, sel); },
};

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
  beep() {}, haptic() {}, happySound() {}, sparkleAt() {},
  cheer: () => 'Yay!',
  bumpBadge() {},
  getHighScore: () => 0,
  bumpHighScore() {},
  earnSticker() {},
  celebrateNewHigh() {},
};
const window = { Lawson: L };
vm.runInNewContext(source, {
  window, document, Math: Object.assign(Object.create(Math), { random: () => 0 }),
  setTimeout: vSetTimeout, clearTimeout: vClearTimeout,
  setInterval: vSetInterval, clearInterval: vClearInterval,
  Date: { now: () => clock.now },
});
const train = L.games.train;
const lastLine = () => spoken.at(-1);
const texts = () => spoken.map((s) => s.text);
const stations = () => texts().filter((t) => /^Station \d+!$/.test(t));
const passengers = () => texts().filter((t) => t === 'Woof!' || t === 'Bye bye!');
const finishLine = async (entry) => { entry.resolve(); await flush(); };
const tap = (node) => node.handlers.forEach((fn) => fn({}));
const goBtn = () => ids.trainGoStop;
const boarded = () => {
  const car = document.querySelector('.train-car[data-car="0"] .train-pass');
  return car && car.textContent === '🐶';
};

(async () => {
  train.start();
  assert.equal(lastLine().text, 'Tap the engine to go!');
  await finishLine(lastLine());
  assert.ok(ids.trainGoStop, 'Go / Stop control is built');
  assert.ok(document.querySelector('.train-car[data-car="0"] .train-pass'), 'cars are in the DOM');

  const stationNames = () => document.querySelectorAll('.train-station').map(s => s.getAttribute('aria-label'));
  assert.deepEqual(stationNames(), ['Station 1, train here', 'Station 2', 'Station 3'], 'the train starts parked at station 1, and its name says so');

  tap(goBtn());
  assert.equal(lastLine().text, 'All aboard!');
  assert.deepEqual(stationNames(), ['Station 1', 'Station 2', 'Station 3'], 'on the way, no station has the train');
  await finishLine(lastLine());

  // 22% → 50% at 0.45% / 32 ms ≈ 1991 ms.
  await runUntil(clock.now + 2100);
  const stop = lastLine();
  assert.equal(stop.text, 'Station 2!', 'arrival speaks the station');
  assert.deepEqual(stationNames(), ['Station 1', 'Station 2, train here', 'Station 3'], 'arrival moves "train here" to station 2');
  assert.equal(stations().length, 1);
  assert.equal(passengers().length, 0, 'passenger must not start in the same tick');
  assert.ok(boarded(), 'passenger hops on immediately');

  await runUntil(clock.now + 550);
  assert.equal(stop.done, false, 'station still held at +550');
  assert.equal(passengers().length, 0, 'passenger must not start while the station is held');
  const releasedAt = clock.now;
  await finishLine(stop);
  await runUntil(releasedAt + 149);
  assert.equal(passengers().length, 0, 'passenger waits the 150 ms beat');
  await runUntil(releasedAt + 150);
  assert.equal(passengers().length, 1, 'passenger starts one beat after the station ends');
  assert.equal(lastLine().text, 'Woof!');

  // stop() cancels a pending waiter.
  train.stop();
  spoken.length = 0;
  inFlight = null;
  lastSaid = Promise.resolve();
  train.start();
  await finishLine(lastLine());
  tap(goBtn());
  await finishLine(lastLine());
  await runUntil(clock.now + 2100);
  assert.equal(lastLine().text, 'Station 2!');
  assert.equal(passengers().length, 0);
  train.stop();
  const held = lastLine();
  await finishLine(held);
  await runUntil(clock.now + 3000);
  assert.equal(passengers().length, 0, 'stop() cancels the pending passenger line');

  console.log('PASS: train — the station is heard before the passenger; stop() cancels the waiter');
})().catch((e) => { console.error(e); process.exit(1); });
