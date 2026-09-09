// Deterministic Memory win-cheer pacing; no browser required.
// Run: node tests/memory.js
//
// The last pair says the card's name ("bee"). The win cheer must wait
// for that line — never fire on the old 320 + 350 ms timers while the
// name is still held (a late-starting iPad voice). Uses a virtual clock
// and a tiny DOM stub so the timings are exact.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/memory.js'), 'utf8');

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
    style: {}, children: [], _classes: new Set(), textContent: '',
    className: '', dataset: {}, handlers: [],
    classList: {
      add: c => node._classes.add(c),
      remove: c => node._classes.delete(c),
      contains: c => node._classes.has(c),
    },
    set innerHTML(_) { node.children = []; },
    appendChild: c => { node.children.push(c); return c; },
    setAttribute(name, value) { if (name === 'aria-label') node.ariaLabel = value; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 300 }),
  };
  return node;
}

const board = el();
const ids = {
  memoryBoard: board,
  memoryScoreVal: el(),
  memoryBestVal: el(),
};
const document = {
  getElementById: id => ids[id] || null,
  createElement: () => el(),
};

const spoken = [];
let inFlight = null;
let lastSaid = Promise.resolve();
const L = {
  games: {},
  say: (text) => (lastSaid = new Promise(resolve => {
    if (inFlight) inFlight.resolve();
    const entry = { text: String(text), done: false, resolve: () => { entry.done = true; resolve(); } };
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
        idle().then(() => { if (done) return; vClearTimeout(timer); timer = vSetTimeout(fire, Math.min(beatMs, Math.max(0, maxMs - elapsed()))); });
        return;
      }
      done = true; vClearTimeout(timer); fn();
    }
    idle().then(() => { if (done) return; vClearTimeout(timer); timer = vSetTimeout(fire, Math.max(beatMs, minMs - elapsed())); });
    return () => { done = true; vClearTimeout(timer); };
  },
  onTap: (node, fn) => node.handlers.push(fn),
  beep() {}, haptic() {}, happySound() {}, buzzSound() {}, sparkleAt() {},
  cheer: () => 'Yay!',
  shuffled: (arr) => arr,
  bumpBadge: (id, n) => { if (ids[id]) ids[id].textContent = String(n); },
  bumpHighScore() {}, getHighScore: () => 0, celebrateNewHigh() {},
  earnSticker() {},
};
vm.runInNewContext(source, {
  window: { Lawson: L }, document, Math,
  setTimeout: vSetTimeout, clearTimeout: vClearTimeout, Date: { now: () => clock.now },
});
const memory = L.games.memory;
const lastLine = () => spoken.at(-1);
const finishLine = async (entry) => { entry.resolve(); await flush(); };
const texts = () => spoken.map(s => s.text);
const tap = (i) => board.children[i].handlers[0]();

(async () => {
  memory.start();
  assert.match(lastLine().text, /matching pairs/);
  await finishLine(lastLine());
  assert.equal(board.children.length, 8, 'eight cards on the board');

  // Identity shuffle: [dog, cat, cow, bee, dog, cat, cow, bee] — pairs 0-4, 1-5, 2-6, 3-7.
  const pairs = [[0, 4], [1, 5], [2, 6]];
  for (const [a, b] of pairs) {
    tap(a);
    tap(b);
    await runUntil(clock.now + 320);
    await finishLine(lastLine());
  }

  // Last pair: hold the name the way a late-starting iPad voice would.
  tap(3);
  tap(7);
  const name = lastLine();
  assert.equal(name.text, 'bee');
  assert.equal(name.done, false, 'last card name still in flight');

  // Old timers would have spoken the cheer at 320 + 350 = 670 ms,
  // which cuts the name off (say() settles the line in flight).
  await runUntil(clock.now + 800);
  assert.ok(!texts().some(t => /matched them all/.test(t)),
    `cheer must not cut the held name (heard: ${JSON.stringify(texts())})`);
  assert.equal(name.done, false, 'last card name still in flight after the old win timers');

  // Once the name ends, a 150 ms beat (afterSpeech), then the cheer.
  const releasedAt = clock.now;
  await finishLine(name);
  await runUntil(releasedAt + 149);
  assert.ok(!texts().some(t => /matched them all/.test(t)), 'cheer waits the beat after the name');
  await runUntil(releasedAt + 150);
  const cheer = lastLine();
  assert.match(cheer.text, /matched them all/, 'cheer starts one beat after the name ends');
  assert.equal(ids.memoryScoreVal.textContent, '1', 'score bumps when the cheer starts');
  await finishLine(cheer);
  const cheersAfterWin = texts().filter(t => /matched them all/.test(t)).length;

  // stop() cancels a pending waiter so a leftover cheer cannot fire later.
  memory.start();
  await finishLine(lastLine());
  for (const [a, b] of pairs) {
    tap(a); tap(b);
    await runUntil(clock.now + 320);
    await finishLine(lastLine());
  }
  tap(3); tap(7);
  const held = lastLine();
  await runUntil(clock.now + 400);
  memory.stop();
  await finishLine(held);
  await runUntil(clock.now + 500);
  assert.equal(texts().filter(t => /matched them all/.test(t)).length, cheersAfterWin,
    'stop() cancels the win cheer');

  console.log('PASS: memory — last card name heard before the win cheer, stop cancels the waiter');
})().catch((e) => { console.error(e); process.exit(1); });
