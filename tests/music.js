// Music Studio Song-button pacing; no browser required.
// Tapping Song used to say "Twinkle Twinkle" and start the first note
// on a 400 ms timer, so the melody cut the name off whenever the engine
// started late. Now the notes wait on afterSpeech — floor 400 ms, beat
// 150 ms, ceiling 3 s — and stop() (or a second Song tap) cancels the waiter.
//
// Run: node tests/music.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/music.js'), 'utf8');

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
const beepsAt = [];
const ids = {};
function queryAll(root, sel) {
  const out = [];
  const walk = (n) => {
    if (!n || !n.children) return;
    for (const c of n.children) {
      if (sel.startsWith('.') && c._classes.has(sel.slice(1))) out.push(c);
      else if (sel.startsWith('#') && c.id === sel.slice(1)) out.push(c);
      else if (c.tagName && c.tagName.toLowerCase() === sel) out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
}
function el(tag, id, cls) {
  const node = {
    tagName: (tag || 'div').toUpperCase(),
    id: id || '',
    style: { background: '', height: '' },
    dataset: {},
    children: [],
    _classes: new Set(String(cls || '').split(/\s+/).filter(Boolean)),
    textContent: '',
    offsetWidth: 40,
    handlers: [],
    attrs: {},
    get className() { return [...node._classes].join(' '); },
    set className(v) { node._classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
    classList: {
      add(c) {
        node._classes.add(c);
        if (c === 'hit') notesAt.push(clock.now);
      },
      remove(c) { node._classes.delete(c); },
      toggle(c, on) {
        if (on === false || (on === undefined && node._classes.has(c))) node._classes.delete(c);
        else node._classes.add(c);
      },
      contains(c) { return node._classes.has(c); },
    },
    setAttribute(n, v) {
      node.attrs[n] = v;
      if (n === 'id') { node.id = v; ids[v] = node; }
    },
    appendChild(c) { node.children.push(c); return c; },
    querySelector(sel) { return queryAll(node, sel)[0] || null; },
    set innerHTML(html) {
      node.children = [];
      if (!html) return;
      for (const m of String(html).matchAll(/<(\w+)([^>]*)>/g)) {
        const a = m[2];
        const childId = (a.match(/\bid="([^"]+)"/) || [])[1];
        const childCls = (a.match(/\bclass="([^"]+)"/) || [])[1] || '';
        const child = el(m[1], childId, childCls);
        if (childId) ids[childId] = child;
        node.appendChild(child);
      }
    },
    get innerHTML() { return ''; },
  };
  if (id) ids[id] = node;
  return node;
}

ids.musicStage = el('div', 'musicStage');
ids.musicScoreVal = el('span', 'musicScoreVal');
ids.musicBestVal = el('span', 'musicBestVal');
const allRoot = el('root');
const document = {
  getElementById: id => ids[id] || null,
  createElement: tag => el(tag),
  querySelector(sel) {
    allRoot.children = Object.values(ids);
    if (sel.startsWith('.')) {
      const cls = sel.slice(1).split('[')[0];
      const attr = sel.match(/\[data-xidx="([^"]+)"\]/);
      const hits = [];
      const walk = (n) => {
        if (!n) return;
        if (n._classes && n._classes.has(cls) && (!attr || n.dataset.xidx === attr[1])) hits.push(n);
        (n.children || []).forEach(walk);
      };
      Object.values(ids).forEach(walk);
      return hits[0] || null;
    }
    return queryAll(allRoot, sel)[0] || null;
  },
};

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
  beep() { beepsAt.push(clock.now); }, haptic() {},
  bumpBadge(_id, v) { if (ids.musicScoreVal) ids.musicScoreVal.textContent = String(v); },
  bumpHighScore() {},
  getHighScore: () => 0,
  celebrateNewHigh() {},
  earnSticker() {},
};

vm.runInNewContext(source, {
  window: { Lawson: L }, document, Math,
  setTimeout: vSetTimeout, clearTimeout: vClearTimeout, Date: { now: () => clock.now },
});
const music = L.games.music;
const lastLine = () => spoken.at(-1);
const finishLine = async (entry) => { entry.resolve(); await flush(); };
const tapSong = () => ids.musicSong.handlers.at(-1)();

(async () => {
  music.start();
  assert.equal(lastLine().text, 'Music studio! Tap to play!');
  await finishLine(lastLine());
  assert.ok(ids.musicSong, 'Song button built');

  tapSong();
  const name = lastLine();
  assert.equal(name.text, 'Twinkle Twinkle');
  assert.ok(ids.musicSong.classList.contains('playing'), 'Song button shows playing during the name');
  assert.equal(ids.musicSong.attrs['aria-pressed'], 'true', 'Song button exposes the playing state (aria-pressed)');

  // Hold the name past the old 400 ms lead. Main's Music Studio plays
  // the first note here; this branch must not.
  await runUntil(700);
  assert.equal(beepsAt.length, 0, 'no note while the name is still in flight');
  assert.equal(lastLine().text, 'Twinkle Twinkle');

  await finishLine(name);
  await runUntil(700 + 149);
  assert.equal(beepsAt.length, 0, 'beat after the name has not elapsed');
  await runUntil(700 + 150);
  assert.ok(beepsAt.length >= 2, 'first note one beat after the name ends');
  assert.equal(beepsAt[0], 850);

  // stop() cancels a pending start so a stale first note cannot land.
  music.stop();
  music.start();
  await finishLine(lastLine());
  beepsAt.length = 0;
  tapSong();
  const held = lastLine();
  assert.ok(held && held.text.length > 0, 'a song name is spoken');
  await runUntil(clock.now + 200);
  music.stop();
  await finishLine(held);
  await runUntil(clock.now + 4000);
  assert.equal(beepsAt.length, 0, 'stop() cancelled the waiter');

  music.start();
  await finishLine(lastLine());
  beepsAt.length = 0;
  tapSong();
  const again = lastLine();
  await runUntil(clock.now + 100);
  tapSong();
  assert.equal(ids.musicSong.classList.contains('playing'), false);
  assert.equal(ids.musicSong.attrs['aria-pressed'], 'false', 'stopping the song clears the pressed state');
  await finishLine(again);
  await runUntil(clock.now + 4000);
  assert.equal(beepsAt.length, 0, 'second Song tap cancelled the waiter');

  console.log('PASS: music — song name held past 400 ms; first note one beat after it ends; stop / second tap cancel');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
