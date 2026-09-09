// How Many? wrong-answer pacing; no browser required.
// A fast wrong tap used to say "Count them again!" while the opening
// "How many …?" timer (450 ms) was still pending, so the question cut
// the nag off. Now the timer is cancelled and the question waits on
// afterSpeech — floor 450 ms, beat 150 ms, ceiling 3 s — and stop()
// cancels the waiter.
//
// Run: node tests/howmany.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/howmany.js'), 'utf8');

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

// ---- tiny DOM ----
const ids = {};
function el(tag, id) {
  const node = {
    tagName: (tag || 'div').toUpperCase(),
    id: id || '',
    style: {},
    children: [],
    textContent: '',
    _classes: new Set(),
    handlers: [],
    classList: {
      add(c) { node._classes.add(c); },
      remove(c) { node._classes.delete(c); },
      contains(c) { return node._classes.has(c); },
    },
    set className(v) { node._classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
    get className() { return [...node._classes].join(' '); },
    setAttribute() {},
    appendChild(c) { node.children.push(c); return c; },
    set innerHTML(_) { node.children = []; },
    get innerHTML() { return ''; },
  };
  if (id) ids[id] = node;
  return node;
}
ids.howmanyStage = el('div', 'howmanyStage');
ids.howmanyChoices = el('div', 'howmanyChoices');
ids.howmanyScoreVal = el('span', 'howmanyScoreVal');
ids.howmanyBestVal = el('span', 'howmanyBestVal');
const document = {
  getElementById: (id) => ids[id] || null,
  createElement: (tag) => el(tag),
};

// ---- Lawson stub ----
const spoken = [];
let inFlight = null;
let lastSaid = Promise.resolve();
function speak(text) {
  lastSaid = new Promise((resolve) => {
    if (inFlight) inFlight.resolve();
    const entry = { text, done: false, resolve: () => { entry.done = true; resolve(); } };
    inFlight = entry;
    spoken.push(entry);
  });
  return lastSaid;
}
const L = {
  games: {},
  say: (text) => speak(text),
  sayPrompt: (text) => speak(text),
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
  shuffled: (arr) => arr.slice(),
  beep() {}, haptic() {}, happySound() {}, buzzSound() {}, sparkleAt() {},
  cheer: () => 'Yay!',
  boboCheer() {},
  bumpBadge() {},
  getHighScore: () => 0,
  bumpHighScore() {},
  earnSticker() {},
  celebrateNewHigh() {},
  pointOf: () => ({ x: 0, y: 0 }),
};
vm.runInNewContext(source, {
  window: { Lawson: L }, document, Math,
  setTimeout: vSetTimeout, clearTimeout: vClearTimeout,
  Date: { now: () => clock.now },
});
const howmany = L.games.howmany;
const lastLine = () => spoken.at(-1);
const texts = () => spoken.map((s) => s.text);
const finishLine = async (entry) => { entry.resolve(); await flush(); };

function tapWrong() {
  const n = ids.howmanyStage.children.length;
  const btn = ids.howmanyChoices.children.find((b) => Number(b.textContent) !== n);
  assert.ok(btn, 'a wrong number choice should exist');
  btn.handlers.forEach((fn) => fn({ stopPropagation() {} }));
}

(async () => {
  howmany.start();
  assert.equal(spoken.length, 0, 'opening prompt is on a timer, not the same tick as start');

  // Fast wrong tap, before the 450 ms opening prompt.
  await runUntil(200);
  tapWrong();
  const nag = lastLine();
  assert.equal(nag.text, 'Count them again!');
  await runUntil(449);
  assert.equal(lastLine().text, 'Count them again!', 'held past the old same-tick window');
  await runUntil(550);
  assert.equal(lastLine().text, 'Count them again!', 'old 450 ms prompt timer did not cut the nag');
  assert.equal(texts().filter((t) => /^How many /.test(t)).length, 0);
  await finishLine(nag);
  // afterSpeech: elapsed 350 ms, wait max(150, 450 − 350) = 150
  await runUntil(clock.now + 149);
  assert.equal(lastLine().text, 'Count them again!', 'still waiting the beat');
  await runUntil(clock.now + 1);
  assert.match(lastLine().text, /^How many /, 'question asked one beat after the nag ended');
  await finishLine(lastLine());

  // A later tap / stop() cancels a pending re-prompt.
  howmany.stop();
  howmany.start();
  await runUntil(200);
  tapWrong();
  assert.equal(lastLine().text, 'Count them again!');
  howmany.stop();
  const spokenAtStop = spoken.length;
  await runUntil(clock.now + 4000);
  assert.equal(spoken.length, spokenAtStop, 'stop() cancelled the waiter');

  console.log('PASS: howmany pacing — Count them again! held past the old 450 ms prompt; question one beat after it ends; stop() cancels');
})().catch((e) => { console.error(e); process.exit(1); });
