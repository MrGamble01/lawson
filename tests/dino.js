// Deterministic Baby Dino cheer pacing; no browser required.
// Run: node tests/dino.js
//
// After a clean bath the game says "All clean! Yay!". The next wash
// must wait for that cheer — never fire on the old 2400 ms setT while
// the line is still held (a late-starting iPad voice, or a long name).
// Uses a virtual clock and a tiny DOM stub so the timings are exact.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/dino.js'), 'utf8');

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

function el(id) {
  const node = {
    id: id || '',
    style: {}, children: [], _classes: new Set(), textContent: '',
    className: '', innerHTML: '', dataset: {}, listeners: {},
    classList: {
      add: c => node._classes.add(c),
      remove: c => node._classes.delete(c),
      contains: c => node._classes.has(c),
    },
    setAttribute() {},
    appendChild(c) { node.children.push(c); return c; },
    remove() {},
    addEventListener(type, fn) { (node.listeners[type] || (node.listeners[type] = [])).push(fn); },
    click(detail = 0) { (node.listeners.click || []).forEach(fn => fn({ detail })); },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 }),
    offsetWidth: 40, offsetHeight: 40,
    setPointerCapture() {},
  };
  return node;
}

const ids = {
  dinoStage: el('dinoStage'),
  dinoScoreVal: el('dinoScoreVal'),
  dinoBestVal: el('dinoBestVal'),
};
const body = { dataset: {}, appendChild() {} };
const document = {
  body,
  getElementById: id => ids[id] || null,
  createElement: () => el(),
};

// Rebuild replaces dinoStage.innerHTML and then looks up the new ids.
ids.dinoStage = new Proxy(el('dinoStage'), {
  set(target, prop, value) {
    if (prop === 'innerHTML') {
      ids.dinoFaceWrap = el('dinoFaceWrap');
      ids.dinoShower = el('dinoShower');
      ids.dinoShowerWater = el('dinoShowerWater');
      ids.dinoFace = el('dinoFace');
      ids.dinoLather = el('dinoLather');
      ids.dinoDroplets = el('dinoDroplets');
      ids.dinoPrompt = el('dinoPrompt');
      ids.dinoSoap = el('dinoSoap');
      ids.dinoTowel = el('dinoTowel');
      target.innerHTML = value;
      return true;
    }
    target[prop] = value;
    return true;
  },
});

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
  onTap: (node, fn) => (node.listeners.click || (node.listeners.click = [])).push(fn),
  beep() {}, haptic() {}, happySound() {}, buzzSound() {}, sparkleAt() {},
  cheer: () => 'Yay!',
  pointOf: () => ({ x: 100, y: 100 }),
  bumpBadge: (id, n) => { if (ids[id]) ids[id].textContent = String(n); },
  bumpHighScore() {}, getHighScore: () => 0, celebrateNewHigh() {},
  earnSticker() {},
};
vm.runInNewContext(source, {
  window: { Lawson: L }, document, Math,
  setTimeout: vSetTimeout, clearTimeout: vClearTimeout, Date: { now: () => clock.now },
});
const dino = L.games.dino;
const lastLine = () => spoken.at(-1);
const finishLine = async (entry) => { entry.resolve(); await flush(); };
const texts = () => spoken.map(s => s.text);

(async () => {
  dino.start();
  assert.equal(lastLine().text, 'Wash him with soap!');
  await finishLine(lastLine());

  // Keyboard-style tap: soap auto-scrubs, shower rinses, towel dries.
  ids.dinoSoap.click(0);
  await runUntil(clock.now + 4000);
  assert.equal(body.dataset.dinoPhase, 'shower', `soap should move to shower, got ${body.dataset.dinoPhase}`);
  await finishLine(lastLine());

  ids.dinoShower.click(0);
  await finishLine(lastLine()); // "Splash splash!"
  await runUntil(clock.now + 2600);
  assert.equal(body.dataset.dinoPhase, 'towel', `shower should move to towel, got ${body.dataset.dinoPhase}`);
  await finishLine(lastLine()); // "Dry him with the towel!"

  ids.dinoTowel.click(0);
  const dryFrom = clock.now;
  let cheer = null;
  for (let t = 0; t <= 4000 && !cheer; t += 50) {
    await runUntil(dryFrom + t);
    const line = lastLine();
    if (line && /All clean!/.test(line.text)) cheer = line;
  }
  assert.ok(cheer, `heal should cheer, heard ${JSON.stringify(texts())}`);
  assert.equal(cheer.done, false, 'cheer still in flight');
  assert.equal(body.dataset.dinoPhase, 'happy');

  // Old timer would have spoken the next wash 2400 ms after the cheer.
  const cheerAt = clock.now;
  const washesBefore = texts().filter(t => t === 'Wash him with soap!').length;
  await runUntil(cheerAt + 2500);
  assert.equal(texts().filter(t => t === 'Wash him with soap!').length, washesBefore,
    `next wash must not cut the held cheer (heard: ${JSON.stringify(texts())})`);
  assert.equal(cheer.done, false, 'cheer still in flight after the old 2.4 s timer');
  assert.equal(body.dataset.dinoPhase, 'happy', 'still on the clean face while the cheer is held');

  // Floor is 2400 ms from the cheer; then a 500 ms beat after the line ends.
  const releasedAt = clock.now;
  await finishLine(cheer);
  await runUntil(releasedAt + 499);
  assert.equal(body.dataset.dinoPhase, 'happy', 'next wash waits the beat after the cheer');
  await runUntil(releasedAt + 500);
  assert.equal(lastLine().text, 'Wash him with soap!', 'next wash starts one beat after the cheer ends');
  assert.equal(body.dataset.dinoPhase, 'soap');

  // stop() cancels a pending waiter so a leftover wash cannot fire later.
  dino.start();
  await finishLine(lastLine());
  ids.dinoSoap.click(0);
  await runUntil(clock.now + 4000);
  await finishLine(lastLine());
  ids.dinoShower.click(0);
  await finishLine(lastLine());
  await runUntil(clock.now + 2600);
  await finishLine(lastLine());
  ids.dinoTowel.click(0);
  const dry2 = clock.now;
  let held = null;
  for (let t = 0; t <= 4000 && !held; t += 50) {
    await runUntil(dry2 + t);
    const line = lastLine();
    if (line && /All clean!/.test(line.text)) held = line;
  }
  assert.ok(held, 'second bath should cheer');
  await runUntil(clock.now + 400);
  const washesWhenStopped = texts().filter(t => t === 'Wash him with soap!').length;
  dino.stop();
  await finishLine(held);
  await runUntil(clock.now + 3000);
  assert.equal(texts().filter(t => t === 'Wash him with soap!').length, washesWhenStopped,
    'stop() cancels the next wash');

  console.log('PASS: dino — All clean! heard before the next wash, stop cancels the waiter');
})().catch((e) => { console.error(e); process.exit(1); });
