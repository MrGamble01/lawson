// Deterministic Sticker Scene speech-pacing checks; no browser required.
// Run: node tests/scene.js
//
// Opening the sandbox used to name the picture ("The park!") and greet
// ("Drag stickers onto the picture!") in the same tick, so the name was
// cut off whenever the engine started late. The picture still paints on
// start; the welcome waits for the name. A saved picture skips the
// (possibly wrong) default name. Switching scenes cancels a pending
// welcome and rings the chime before the new name.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/scene.js'), 'utf8');

const clock = { now: 0, timers: new Map(), nextId: 0 };
const flush = () => new Promise(r => setImmediate(r));
function vSetTimeout(fn, ms) {
  const id = ++clock.nextId;
  clock.timers.set(id, { at: clock.now + (ms || 0), fn });
  return id;
}
function vClearTimeout(id) { clock.timers.delete(id); }
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

function el() {
  const node = {
    style: { setProperty() {} }, children: [], _classes: new Set(), textContent: '', innerHTML: '',
    dataset: {}, className: '', handlers: {},
    classList: {
      add: c => node._classes.add(c), remove: c => node._classes.delete(c),
      contains: c => node._classes.has(c),
    },
    appendChild: c => { node.children.push(c); return c; },
    remove() {},
    attrs: {},
    setAttribute(n, v) { node.attrs[n] = String(v); },
    getAttribute(n) { return n in node.attrs ? node.attrs[n] : null; },
    addEventListener(type, fn) { node.handlers[type] = fn; },
  };
  return node;
}

const ids = {
  sceneStage: el(),
  sceneBg: el(),
  scenePlaced: el(),
  sceneSwitch: el(),
  sceneClear: el(),
  sceneTray: el(),
};

const spoken = [];
let inFlight = null;
let lastSaid = Promise.resolve();
const beeps = [];
const taps = new Map();
const stored = new Map();

const L = {
  games: {},
  say: (text) => (lastSaid = new Promise(resolve => {
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
      done = true;
      vClearTimeout(timer);
      fn();
    }
    idle().then(() => {
      if (done) return;
      vClearTimeout(timer);
      timer = vSetTimeout(fire, Math.max(beatMs, minMs - elapsed()));
    });
    return () => { done = true; vClearTimeout(timer); };
  },
  onTap: (el, fn) => { if (el) taps.set(el, fn); },
  onTapOnce: (el, fn) => { if (el) taps.set(el, fn); },
  beep: (f) => beeps.push(f),
  haptic() {},
  earnSticker() {},
  pointOf: () => ({ x: 0, y: 0 }),
  sparkleAt() {},
};

const context = vm.createContext({
  window: { Lawson: L },
  document: { getElementById: id => ids[id] || null, createElement: () => el() },
  localStorage: {
    getItem: k => stored.get(k) ?? null,
    setItem: (k, v) => stored.set(k, v),
    removeItem: k => stored.delete(k),
  },
  setTimeout: vSetTimeout,
  clearTimeout: vClearTimeout,
  Date: { now: () => clock.now },
  Math,
  console,
});
vm.runInContext(source, context);
const game = L.games.scene;

function texts() { return spoken.map(s => s.text); }
function endCurrent() { if (inFlight && !inFlight.done) inFlight.resolve(); }

async function reset() {
  stored.clear();
  spoken.length = 0;
  beeps.length = 0;
  taps.clear();
  inFlight = null;
  lastSaid = Promise.resolve();
  clock.now = 0;
  clock.timers.clear();
  game.stop();
  await flush();
}

(async () => {
  // Fresh visit: name the picture, not the welcome, in the opening tick.
  game.start();
  await flush();
  assert.deepEqual(texts(), ['The park!'], 'opening tick names the picture only');
  assert.equal(spoken.length, 1, 'welcome is not spoken in the same tick');

  // Hold the name past the old same-tick cut-off and the 400 ms floor.
  await runUntil(550);
  assert.deepEqual(texts(), ['The park!'], 'welcome waits while the name is still in flight');

  // Release the name; welcome starts one beat later (150 ms), not sooner.
  endCurrent();
  await flush();
  await runUntil(clock.now + 140);
  assert.deepEqual(texts(), ['The park!'], 'welcome waits the beat after the name ends');
  await runUntil(clock.now + 20);
  assert.deepEqual(texts(), ['The park!', 'Drag stickers onto the picture!'],
    'welcome starts one beat after the name is heard');

  // stop() cancels a pending welcome.
  await reset();
  game.start();
  await flush();
  game.stop();
  endCurrent();
  await flush();
  await runUntil(4000);
  assert.deepEqual(texts(), ['The park!'], 'stop() cancels the pending welcome');

  // Switching scenes while the name is in flight cancels the welcome
  // and rings the chime before the new name.
  await reset();
  game.start();
  await flush();
  const switcher = taps.get(ids.sceneSwitch);
  assert.ok(switcher, 'scene switch is wired');
  assert.equal(ids.sceneBg.getAttribute('role'), 'img', 'the picture is an image');
  assert.equal(ids.sceneBg.getAttribute('aria-label'), 'Park scene', 'the picture is named after the scene it shows');
  const beepsBefore = beeps.length;
  switcher();
  await flush();
  assert.ok(beeps.length > beepsBefore, 'scene switch rings a chime');
  assert.equal(ids.sceneBg.getAttribute('aria-label'), 'Beach scene', 'switching renames the picture');
  assert.deepEqual(texts(), ['The park!', 'The beach!'],
    'switch speaks the new scene and drops the welcome');
  endCurrent();
  await flush();
  await runUntil(4000);
  assert.deepEqual(texts(), ['The park!', 'The beach!'],
    'a cancelled welcome never lands on the new scene');

  // A restored picture skips the default name (it may not match the save).
  await reset();
  stored.set('lawson:scene', JSON.stringify({
    sceneIdx: 2,
    items: [{ i: 0, x: 40, y: 40, s: 1, r: 0 }],
  }));
  game.start();
  await flush();
  assert.deepEqual(texts(), ["Here's your picture!"],
    'restored visit greets without naming the default park');
  await runUntil(4000);
  assert.deepEqual(texts(), ["Here's your picture!"],
    'restored visit does not queue the how-to over the greeting');

  console.log('PASS: scene pacing — name then welcome, floor + beat, stop cancels, switch cancels + chimes first, restore skips the default name');
})().catch((err) => {
  console.error('FAIL: scene pacing:', err);
  process.exit(1);
});
