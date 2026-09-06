// Whack! ABC pacing; no browser required.
// A correct letter used to say the glyph + cheer and then newTarget()
// in the same tick, so "Whack the C!" cut the cheer off. Now the banner
// updates immediately; the spoken goal waits on afterSpeech — floor
// 400 ms, beat 150 ms, ceiling 3 s — and stop() cancels the waiter.
//
// Run: node tests/whack.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/whack.js'), 'utf8');

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

const ids = {};
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
    _classes: new Set(String(cls || '').split(/\s+/).filter(Boolean)),
    handlers: [],
    attrs: {},
    classList: {
      add(c) { node._classes.add(c); },
      remove(c) { [...arguments].forEach((x) => node._classes.delete(x)); },
      toggle(c, on) {
        if (on === false || (on === undefined && node._classes.has(c))) node._classes.delete(c);
        else node._classes.add(c);
      },
      contains(c) { return node._classes.has(c); },
    },
    setAttribute(n, v) {
      node.attrs[n] = String(v);
      if (n === 'id') { node.id = v; ids[v] = node; }
    },
    getAttribute(n) { return node.attrs[n]; },
    getBoundingClientRect: () => ({ left: 10, top: 10, width: 80, height: 80, right: 90, bottom: 90 }),
    appendChild(c) { node.children.push(c); c.parent = node; return c; },
    querySelector(sel) {
      if (sel.startsWith('.')) return node.children.find((c) => c._classes.has(sel.slice(1))) || null;
      return null;
    },
    querySelectorAll(sel) {
      if (sel.startsWith('.')) return node.children.filter((c) => c._classes.has(sel.slice(1)));
      return [];
    },
    set innerHTML(html) {
      node.children = [];
      if (!html) return;
      for (const m of html.matchAll(/<(\w+)([^>]*)>/g)) {
        const a = m[2];
        const childCls = (a.match(/\bclass="([^"]+)"/) || [])[1] || '';
        node.appendChild(el(m[1], null, childCls));
      }
    },
    get innerHTML() { return ''; },
  };
  if (id) ids[id] = node;
  return node;
}

ids.whackGame = el('section', 'whackGame');
ids.whackScoreVal = el('span', 'whackScoreVal');
ids.whackBestVal = el('span', 'whackBestVal');
ids.whackPrompt = el('div', 'whackPrompt');
ids.whackGrid = el('div', 'whackGrid', 'whack-grid');
ids.whackModes = el('div', 'whackModes', 'mode-tabs');
for (const mode of ['free', 'letters', 'numbers']) {
  const btn = el('button', null, 'mode-tab' + (mode === 'free' ? ' active' : ''));
  btn.dataset.mode = mode;
  ids.whackModes.appendChild(btn);
}
ids.whackGame.appendChild(ids.whackModes);
ids.whackGame.appendChild(ids.whackPrompt);
ids.whackGame.appendChild(ids.whackGrid);

const document = {
  getElementById: (id) => ids[id] || null,
  createElement: (tag) => el(tag),
  querySelectorAll: (sel) => {
    if (sel === '#whackGame .mode-tab') return ids.whackModes.children;
    return [];
  },
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
  onTapOnce: (node, fn) => { if (node.__lawsonTap) return; node.__lawsonTap = true; node.handlers.push(fn); },
  paceScale: () => 1,
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
  window, document, Math,
  setTimeout: vSetTimeout, clearTimeout: vClearTimeout,
  Date: { now: () => clock.now },
});
const whack = L.games.whack;
const lastLine = () => spoken.at(-1);
const texts = () => spoken.map((s) => s.text);
const finishLine = async (entry) => { entry.resolve(); await flush(); };
const tap = (node) => node.handlers.forEach((fn) => fn({}));
const lettersTab = () => ids.whackModes.children.find((c) => c.dataset.mode === 'letters');
const currentGoal = () => (ids.whackPrompt.textContent.match(/Whack the (.+)!/) || [])[1];
const targetHole = () => ids.whackGrid.children.find((h) => (h.getAttribute('aria-label') || '').includes(`${currentGoal()}!`));

(async () => {
  whack.start();
  assert.equal(lastLine().text, 'Tap the animals!');
  await finishLine(lastLine());

  tap(lettersTab());
  const goal1 = lastLine();
  assert.match(goal1.text, /^Whack the /);
  const letter = currentGoal();
  assert.ok(letter);
  await finishLine(goal1);

  const hole = targetHole();
  assert.ok(hole, 'a hole should be showing the named letter');
  tap(hole);
  const hit = lastLine();
  assert.match(hit.text, /Yay!/);
  assert.ok(!hit.text.startsWith('Whack the '), 'the hit is spoken, not the next goal');
  assert.ok(currentGoal() && currentGoal() !== letter, 'banner moves on immediately');

  await runUntil(clock.now + 550);
  assert.equal(hit.done, false);
  assert.equal(texts().filter((t) => t.startsWith('Whack the ')).length, 1, 'next goal must not start while the hit is held');
  const releasedAt = clock.now;
  await finishLine(hit);
  await runUntil(releasedAt + 149);
  assert.equal(texts().filter((t) => t.startsWith('Whack the ')).length, 1, 'next goal waits the 150 ms beat');
  await runUntil(releasedAt + 150);
  assert.match(lastLine().text, /^Whack the /);
  assert.notEqual(lastLine().text, goal1.text);

  whack.stop();
  spoken.length = 0;
  inFlight = null;
  lastSaid = Promise.resolve();
  whack.start();
  await finishLine(lastLine());
  tap(lettersTab());
  await finishLine(lastLine());
  tap(targetHole());
  assert.match(lastLine().text, /Yay!/);
  whack.stop();
  const held = lastLine();
  await finishLine(held);
  await runUntil(clock.now + 3000);
  assert.equal(texts().filter((t) => t.startsWith('Whack the ')).length, 1, 'stop() cancels the pending next goal');

  console.log('PASS: whack ABC — the hit is heard before the next goal; stop() cancels the waiter');
})().catch((e) => { console.error(e); process.exit(1); });
