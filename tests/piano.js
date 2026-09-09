// Piano Song-button pacing; no browser required.
// Tapping Song used to say "Twinkle Twinkle" and start the first note
// on a 500 ms timer, so the melody cut the name off whenever the engine
// started late. Now the notes wait on afterSpeech — floor 500 ms, beat
// 150 ms, ceiling 3 s — and stop() (or a second Song tap) cancels the waiter.
//
// Run: node tests/piano.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/piano.js'), 'utf8');

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

const notesAt = [];
const ids = {};
function el(tag, id) {
  const node = {
    tagName: (tag || 'div').toUpperCase(),
    id: id || '',
    style: { setProperty() {}, left: '' },
    children: [],
    _classes: new Set(),
    textContent: '',
    offsetWidth: 40,
    handlers: [],
    attrs: {},
    get className() { return [...node._classes].join(' '); },
    set className(v) { node._classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
    classList: {
      add(c) {
        node._classes.add(c);
        if (c === 'pressed') notesAt.push(clock.now);
      },
      remove(c) { node._classes.delete(c); },
      toggle(c, on) {
        if (on === false || (on === undefined && node._classes.has(c))) node._classes.delete(c);
        else node._classes.add(c);
      },
      contains(c) { return node._classes.has(c); },
    },
    setAttribute(n, v) { node.attrs[n] = v; },
    appendChild(c) { node.children.push(c); return c; },
    set innerHTML(html) { node._html = html; node.children = []; },
    get innerHTML() { return node._html || ''; },
  };
  if (id) ids[id] = node;
  return node;
}

ids.pianoBoard = el('div', 'pianoBoard');
ids.pianoSong = el('button', 'pianoSong');
ids.pianoGame = el('section', 'pianoGame');
const document = { getElementById: id => ids[id] || null, createElement: tag => el(tag) };

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
  onTap: (node, fn) => node.handlers.push(fn),
  onTapOnce: (node, fn) => node.handlers.push(fn),
  isSoundMuted: () => true,
  earnSticker() {},
};

vm.runInNewContext(source, {
  window: { Lawson: L }, document, Math,
  setTimeout: vSetTimeout, clearTimeout: vClearTimeout, Date: { now: () => clock.now },
});
const piano = L.games.piano;
const lastLine = () => spoken.at(-1);
const finishLine = async (entry) => { entry.resolve(); await flush(); };
const tapSong = () => ids.pianoSong.handlers.at(-1)();

(async () => {
  piano.start();
  assert.equal(lastLine().text, 'Piano time!');
  await finishLine(lastLine());

  tapSong();
  const name = lastLine();
  assert.equal(name.text, 'Twinkle Twinkle');
  assert.ok(ids.pianoSong.classList.contains('playing'), 'Song button shows playing during the name');

  // Hold the name past the old 500 ms lead. Main's Piano plays the first
  // note here; this branch must not.
  await runUntil(800);
  assert.equal(notesAt.length, 0, 'no note while the name is still in flight');
  assert.equal(lastLine().text, 'Twinkle Twinkle');

  await finishLine(name);
  await runUntil(800 + 149);
  assert.equal(notesAt.length, 0, 'beat after the name has not elapsed');
  await runUntil(800 + 150);
  assert.equal(notesAt.length, 1, 'first note one beat after the name ends');
  assert.equal(notesAt[0], 950);

  // stop() cancels a pending start so a stale first note cannot land.
  piano.stop();
  piano.start();
  await finishLine(lastLine());
  notesAt.length = 0;
  tapSong();
  const held = lastLine();
  assert.ok(held.text.length > 0, 'a song name is spoken');
  await runUntil(clock.now + 200);
  piano.stop();
  await finishLine(held);
  await runUntil(clock.now + 4000);
  assert.equal(notesAt.length, 0, 'stop() cancelled the waiter');

  // A second Song tap (stop) while the name is in flight also cancels.
  piano.start();
  await finishLine(lastLine());
  notesAt.length = 0;
  tapSong();
  const again = lastLine();
  await runUntil(clock.now + 100);
  tapSong();
  assert.equal(ids.pianoSong.classList.contains('playing'), false);
  await finishLine(again);
  await runUntil(clock.now + 4000);
  assert.equal(notesAt.length, 0, 'second Song tap cancelled the waiter');

  console.log('PASS: piano — song name held past 500 ms; first note one beat after it ends; stop / second tap cancel');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
