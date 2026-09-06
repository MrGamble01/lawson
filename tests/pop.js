// Pop! ABC pacing; no browser required.
// A correct letter used to say the glyph and then newTarget() in the
// same tick, so "Pop the C!" cut "Bee!" off. Now the banner and a fresh
// balloon update immediately; the spoken goal waits on afterSpeech —
// floor 400 ms, beat 150 ms, ceiling 3 s — and stop() cancels the waiter.
//
// Run: node tests/pop.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/pop.js'), 'utf8');

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
    innerWidth: 800,
    clientWidth: 800,
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
    hasAttribute(n) { return n in node.attrs; },
    getBoundingClientRect: () => ({ left: 10, top: 10, width: 80, height: 80, right: 90, bottom: 90 }),
    appendChild(c) { node.children.push(c); c.parent = node; return c; },
    querySelectorAll(sel) {
      const out = [];
      const walk = (n) => {
        for (const c of n.children) {
          if (match(c, sel)) out.push(c);
          walk(c);
        }
      };
      walk(node);
      return out;
    },
    querySelector(sel) { return node.querySelectorAll(sel)[0] || null; },
    remove() {
      if (!node.parent) return;
      node.parent.children = node.parent.children.filter((c) => c !== node);
      node.parent = null;
    },
    set innerHTML(html) {
      node.children = [];
      if (!html) return;
    },
    get innerHTML() { return ''; },
  };
  Object.defineProperty(node, 'parentNode', { get() { return node.parent; } });
  if (id) ids[id] = node;
  return node;
}
function match(node, sel) {
  const parts = sel.trim();
  const m = parts.match(/^\.([A-Za-z0-9_-]+)(?:\[data-([^=]+)="([^"]+)"\])?$/);
  if (m) {
    if (!node._classes.has(m[1])) return false;
    if (m[2] && String(node.dataset[m[2]]) !== m[3]) return false;
    return true;
  }
  if (parts.startsWith('.')) return node._classes.has(parts.slice(1));
  return false;
}

ids.popGame = el('section', 'popGame');
ids.popScoreVal = el('span', 'popScoreVal');
ids.popStreak = el('div', 'popStreak', 'badge badge--streak');
ids.popStreakVal = el('span', 'popStreakVal');
ids.popBestVal = el('span', 'popBestVal');
ids.popPrompt = el('div', 'popPrompt');
ids.popArea = el('div', 'popArea', 'pop-area');
ids.popModes = el('div', 'popModes', 'mode-tabs');
for (const mode of ['free', 'letters', 'numbers']) {
  const btn = el('button', null, 'mode-tab' + (mode === 'free' ? ' active' : ''));
  btn.dataset.mode = mode;
  btn.setAttribute('data-mode', mode);
  ids.popModes.appendChild(btn);
}
ids.popGame.appendChild(ids.popModes);
ids.popGame.appendChild(ids.popPrompt);
ids.popGame.appendChild(ids.popArea);

const document = {
  getElementById: (id) => ids[id] || null,
  createElement: (tag) => el(tag),
  querySelectorAll: (sel) => {
    if (sel === '#popGame .mode-tab') return ids.popModes.children.filter((c) => c._classes.has('mode-tab'));
    return ids.popGame.querySelectorAll(sel);
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
  prefersReducedMotion: () => true,
  paceScale: () => 1,
  beep() {}, haptic() {}, happySound() {}, sparkleAt() {},
  cheer: () => 'Yay!',
  bumpBadge() {},
  getHighScore: () => 0,
  bumpHighScore() {},
  earnSticker() {},
  celebrateNewHigh() {},
  pointOf: () => ({ x: 20, y: 20 }),
};
const window = { Lawson: L, innerWidth: 800 };
vm.runInNewContext(source, {
  window, document, Math, Array,
  setTimeout: vSetTimeout, clearTimeout: vClearTimeout,
  setInterval: vSetInterval, clearInterval: vClearInterval,
  Date: { now: () => clock.now },
});
const pop = L.games.pop;
const lastLine = () => spoken.at(-1);
const texts = () => spoken.map((s) => s.text);
const goals = () => texts().filter((t) => /^Pop the /.test(t) && t !== 'Pop the balloons!');
const finishLine = async (entry) => { entry.resolve(); await flush(); };
const tap = (node) => node.handlers.forEach((fn) => fn({ stopPropagation() {} }));
const lettersTab = () => ids.popModes.children.find((c) => c.dataset.mode === 'letters');
const currentGoal = () => (ids.popPrompt.textContent.match(/Pop the (.+)!/) || [])[1];
const targetBalloon = () => ids.popArea.querySelectorAll(`.balloon[data-glyph="${currentGoal()}"]`)[0];

(async () => {
  pop.start();
  assert.equal(lastLine().text, 'Pop the balloons!');
  await finishLine(lastLine());

  tap(lettersTab());
  const goal1 = lastLine();
  assert.match(goal1.text, /^Pop the /);
  const letter = currentGoal();
  assert.ok(letter, 'banner should name the letter');
  await finishLine(goal1);

  const balloon = targetBalloon();
  assert.ok(balloon, 'a balloon with the named letter should be up');
  tap(balloon);
  const hit = lastLine();
  assert.ok(!hit.text.startsWith('Pop the '), 'the popped letter is spoken, not the next goal');
  assert.match(hit.text, /!$/);
  assert.ok(currentGoal() && currentGoal() !== letter, 'banner moves on immediately');
  assert.equal(goals().length, 1, 'next goal must not start in the same tick');

  await runUntil(clock.now + 550);
  assert.equal(hit.done, false, 'letter still held at +550');
  assert.equal(goals().length, 1, 'next goal must not start while the letter is held');
  const releasedAt = clock.now;
  await finishLine(hit);
  await runUntil(releasedAt + 149);
  assert.equal(goals().length, 1, 'next goal waits the 150 ms beat');
  await runUntil(releasedAt + 150);
  assert.equal(goals().length, 2, 'next goal starts one beat after the letter ends');
  assert.match(lastLine().text, /^Pop the /);
  assert.notEqual(lastLine().text, goal1.text, 'the next goal is a new letter');

  // stop() cancels a pending waiter.
  pop.stop();
  spoken.length = 0;
  inFlight = null;
  lastSaid = Promise.resolve();
  pop.start();
  await finishLine(lastLine());
  tap(lettersTab());
  await finishLine(lastLine());
  tap(targetBalloon());
  assert.ok(!lastLine().text.startsWith('Pop the '));
  pop.stop();
  const held = lastLine();
  await finishLine(held);
  await runUntil(clock.now + 3000);
  assert.equal(goals().length, 1, 'stop() cancels the pending next goal');

  console.log('PASS: pop ABC — the popped letter is heard before the next goal; stop() cancels the waiter');
})().catch((e) => { console.error(e); process.exit(1); });
