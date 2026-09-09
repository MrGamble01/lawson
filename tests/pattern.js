// Pattern wrong-answer pacing; no browser required.
// A fast wrong tap used to say "Try again!" while the opening
// "What comes next?" timer (380 ms) was still pending, so the
// question cut the nag off. Now the timer is cancelled and the
// question waits on afterSpeech — floor 380 ms, beat 150 ms,
// ceiling 3 s — and stop() cancels the waiter.
//
// Run: node tests/pattern.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/pattern.js'), 'utf8');

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
ids.patternSeq = el('div', 'patternSeq');
ids.patternChoices = el('div', 'patternChoices');
ids.patternScoreVal = el('span', 'patternScoreVal');
ids.patternBestVal = el('span', 'patternBestVal');
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
const pattern = L.games.pattern;
const lastLine = () => spoken.at(-1);
const texts = () => spoken.map((s) => s.text);
const finishLine = async (entry) => { entry.resolve(); await flush(); };

function patternAnswer() {
  const shown = ids.patternSeq.children.filter((c) => !c._classes.has('pattern-cell--q'));
  const emojis = shown.map((c) => c.textContent);
  return emojis.length % 2 === 0 ? emojis[0] : emojis[1];
}

function tapWrong() {
  const answer = patternAnswer();
  const btn = ids.patternChoices.children.find((b) => b.textContent !== answer);
  assert.ok(btn, 'a wrong choice should exist');
  btn.handlers.forEach((fn) => fn({ stopPropagation() {} }));
}

(async () => {
  pattern.start();
  assert.equal(spoken.length, 0, 'opening prompt is on a timer, not the same tick as start');

  // Fast wrong tap, before the 380 ms opening prompt.
  await runUntil(200);
  tapWrong();
  const nag = lastLine();
  assert.equal(nag.text, 'Try again!');
  await runUntil(379);
  assert.equal(lastLine().text, 'Try again!', 'held past the old same-tick window');
  await runUntil(500);
  assert.equal(lastLine().text, 'Try again!', 'old 380 ms prompt timer did not cut the nag');
  assert.equal(texts().filter((t) => t === 'What comes next?').length, 0);
  await finishLine(nag);
  // afterSpeech: elapsed 300 ms, wait max(150, 380 − 300) = 150
  await runUntil(clock.now + 149);
  assert.equal(lastLine().text, 'Try again!', 'still waiting the beat');
  await runUntil(clock.now + 1);
  assert.equal(lastLine().text, 'What comes next?', 'question asked one beat after the nag ended');
  await finishLine(lastLine());

  pattern.stop();
  pattern.start();
  await runUntil(200);
  tapWrong();
  assert.equal(lastLine().text, 'Try again!');
  pattern.stop();
  const spokenAtStop = spoken.length;
  await runUntil(clock.now + 4000);
  assert.equal(spoken.length, spokenAtStop, 'stop() cancelled the waiter');

  console.log('PASS: pattern pacing — Try again! held past the old 380 ms prompt; question one beat after it ends; stop() cancels');
})().catch((e) => { console.error(e); process.exit(1); });
