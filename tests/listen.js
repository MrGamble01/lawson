// Listen leftover-opening-clue checks; no browser required.
// Run: node tests/listen.js
//
// Listen schedules the opening "Quack quack! Find the duck!" on a 400 ms
// timer. A wrong tap used to leave that timer running and also fire a
// second unstored speakClue 350 ms later — so a toddler who taps before
// the opening lands hears the leftover over the buzz, and a tap after
// it starts cuts the clue off. Hear it again had the same leftover.
//
// Uses a virtual clock and a tiny DOM stub so the timings are exact.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/listen.js'), 'utf8');

// ---- virtual clock ----
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

// ---- DOM stub ----
function el() {
  const node = {
    style: {}, children: [], _classes: new Set(), textContent: '', offsetWidth: 1,
    handlers: [], attributes: {},
    classList: {
      add: c => node._classes.add(c), remove: c => node._classes.delete(c),
      contains: c => node._classes.has(c),
    },
    set innerHTML(_) { node.children = []; },
    appendChild: c => { node.children.push(c); return c; },
    setAttribute(k, v) { node.attributes[k] = v; },
    getAttribute(k) { return node.attributes[k]; },
  };
  return node;
}
const ids = {
  listenChoices: el(),
  listenScoreVal: el(),
  listenBestVal: el(),
  listenReplay: el(),
};
const document = { getElementById: id => ids[id] || null, createElement: () => el() };

// ---- Lawson stub ----
const spoken = [];
let inFlight = null;
let lastSaid = Promise.resolve();
const L = {
  games: {},
  say: (text) => (lastSaid = new Promise(resolve => {
    if (inFlight) inFlight.resolve();
    const entry = { text, done: false, resolve: () => { entry.done = true; resolve(); } };
    inFlight = entry;
    spoken.push(entry);
  })),
  sayPrompt: (text) => L.say(text),
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
        idle().then(() => { if (done) return; vClearTimeout(timer); timer = vSetTimeout(fire, Math.min(beatMs, Math.max(0, maxMs - elapsed()))); });
        return;
      }
      done = true; vClearTimeout(timer); fn();
    }
    idle().then(() => { if (done) return; vClearTimeout(timer); timer = vSetTimeout(fire, Math.max(beatMs, minMs - elapsed())); });
    return () => { done = true; vClearTimeout(timer); };
  },
  onTap: (node, fn) => node.handlers.push(fn),
  onTapOnce: (node, fn) => { if (node && !node.__lawsonTap) { node.__lawsonTap = true; node.handlers.push(fn); } },
  shuffled: (arr) => arr.slice(1).concat(arr.slice(0, 1)),
  beep() {}, haptic() {}, happySound() {}, buzzSound() {}, sparkleAt() {},
  cheer: () => 'Yay!',
  bumpBadge: (id, n) => { if (ids[id]) ids[id].textContent = String(n); },
  getHighScore: () => 0,
  bumpHighScore() {},
  earnSticker() {},
  boboCheer() {},
  pointOf: () => ({ x: 0, y: 0 }),
};

vm.runInNewContext(source, {
  window: { Lawson: L }, document, Math: Object.assign(Object.create(Math), { random: () => 0 }),
  setTimeout: vSetTimeout, clearTimeout: vClearTimeout, Date: { now: () => clock.now },
});
const listen = L.games.listen;
const lastLine = () => spoken.at(-1);
const finishLine = async (entry) => { entry.resolve(); await flush(); };
const tap = (node, ev) => { node.handlers.forEach(fn => fn(ev || {})); };
function reset() {
  listen.stop();
  clock.now = 0;
  clock.timers.clear();
  spoken.length = 0;
  inFlight = null;
  lastSaid = Promise.resolve();
  ids.listenChoices.children = [];
  ids.listenReplay.handlers = [];
  ids.listenReplay.__lawsonTap = false;
}

(async () => {
  // With Math.random pinned at 0, pick3 is dog / cat / cow and answer is
  // dog. shuffled() puts the answer last, so the first choice is wrong.

  // 1. Wrong tap before the opening clue: leftover opening is cancelled;
  //    the re-ask waits the 350 ms floor and is the only line.
  reset();
  listen.start();
  await flush();
  assert.equal(spoken.length, 0, 'opening clue is on a timer, not same-tick');
  tap(ids.listenChoices.children[0]);
  await flush();
  await runUntil(400);
  assert.equal(spoken.length, 0, 'leftover opening clue must not land after a wrong tap');
  await runUntil(550);
  assert.equal(spoken.length, 1, 're-ask starts at the 350 ms floor');
  assert.match(lastLine().text, /Find the dog!/);

  // 2. Wrong tap while the opening clue is still in flight: hold it past
  //    the old 350 ms cut-off; the re-ask starts one beat after it ends.
  reset();
  listen.start();
  await flush();
  await runUntil(400);
  assert.equal(spoken.length, 1, 'opening clue starts at 400 ms');
  const opening = lastLine();
  assert.match(opening.text, /Find the dog!/);
  tap(ids.listenChoices.children[0]);
  await flush();
  await runUntil(750);
  assert.equal(spoken.length, 1, 'old 350 ms speakClue must not cut the opening clue');
  assert.equal(lastLine(), opening);
  await finishLine(opening);
  await runUntil(clock.now + 150);
  assert.equal(spoken.length, 2, 're-ask starts one beat after the opening ends');
  assert.match(lastLine().text, /Find the dog!/);
  assert.notEqual(lastLine(), opening);

  // 3. stop() cancels a pending re-ask so it cannot land after leaving.
  reset();
  listen.start();
  await flush();
  tap(ids.listenChoices.children[0]);
  await flush();
  listen.stop();
  await runUntil(2000);
  assert.equal(spoken.length, 0, 'stop() cancels the leftover waiter');

  // 4. Hear it again before the opening: leftover opening is cancelled;
  //    only the requested clue is spoken.
  reset();
  listen.start();
  await flush();
  tap(ids.listenReplay, { stopPropagation() {} });
  await flush();
  assert.equal(spoken.length, 1, 'Hear it again speaks immediately');
  assert.match(lastLine().text, /Find the dog!/);
  await runUntil(400);
  assert.equal(spoken.length, 1, 'leftover opening clue must not land on Hear it again');

  console.log('PASS: listen — leftover opening clue cancelled by wrong tap / replay; re-ask waits for a clue in flight; stop() cancels');
})().catch((err) => {
  console.error('FAIL: listen\n' + (err && err.stack || err));
  process.exit(1);
});
