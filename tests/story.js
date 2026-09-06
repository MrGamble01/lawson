// Deterministic Story Time pacing checks; no browser required.
// Run: node tests/story.js
//
// Story pages should flip when the storyteller has actually finished the
// line (plus a beat), never faster than a word-count floor, and never
// later than a ceiling if the speech engine goes quiet. Uses a virtual
// clock and a tiny DOM stub so the timings are exact.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/story.js'), 'utf8');

// ---- virtual clock ----
const clock = { now: 0, timers: new Map(), nextId: 0 };
const flush = () => new Promise(r => setImmediate(r));
function vSetTimeout(fn, ms) {
  const id = ++clock.nextId;
  clock.timers.set(id, { at: clock.now + ms, fn });
  return id;
}
function vClearTimeout(id) { clock.timers.delete(id); }
// Run every timer due up to `t`, in order, flushing promise callbacks between.
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
const pendingTimers = () => [...clock.timers.values()].map(t => t.at).sort((a, b) => a - b);

// ---- DOM stub ----
function el() {
  const node = {
    style: {}, children: [], _classes: new Set(), textContent: '', offsetWidth: 1, handlers: [],
    classList: {
      add: c => node._classes.add(c), remove: c => node._classes.delete(c),
      toggle: (c, on) => { on ? node._classes.add(c) : node._classes.delete(c); },
      contains: c => node._classes.has(c),
    },
    set innerHTML(_) { node.children = []; },
    appendChild: c => { node.children.push(c); return c; },
    setAttribute() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 300 }),
  };
  return node;
}
const ids = { storyStage: el(), storyText: el(), storyCounter: el(), storyGame: el() };
const document = { getElementById: id => ids[id] || null, createElement: () => el() };

// ---- Lawson stub ----
const spoken = [];      // [text, resolve]
let stickers = 0;
const L = {
  games: {},
  say: (text) => new Promise(resolve => spoken.push({ text, resolve })),
  onTap: (node, fn) => node.handlers.push(fn),
  beep() {}, haptic() {}, happySound() {}, sparkleAt() {},
  cheer: () => 'Yay!', earnSticker: () => { stickers++; },
};
vm.runInNewContext(source, {
  window: { Lawson: L }, document, Math,
  setTimeout: vSetTimeout, clearTimeout: vClearTimeout, Date: { now: () => clock.now },
});
const story = L.games.story;
const counter = () => ids.storyCounter.textContent;
const lastLine = () => spoken.at(-1);
const finishLine = async (entry) => { entry.resolve(); await flush(); };
const words = s => s.split(/\s+/).filter(Boolean).length;
const floorFor = s => Math.max(3800, words(s) * 380 + 1200);
const ceilFor = s => floorFor(s) * 2 + 4000;

(async () => {
  // 1. Quick voice: the line ends early, but the page still holds for
  //    the word-count floor so a toddler has time to look.
  story.start();
  assert.equal(counter(), '1 / 4');
  const p1 = lastLine();
  assert.equal(pendingTimers().length, 1, 'one ceiling timer armed while narrating');
  assert.deepEqual(pendingTimers(), [ceilFor(p1.text)]);
  await runUntil(1000);
  await finishLine(p1);
  assert.deepEqual(pendingTimers(), [floorFor(p1.text)], 'floor rescheduled after early end');
  await runUntil(floorFor(p1.text) - 1);
  assert.equal(counter(), '1 / 4');
  await runUntil(floorFor(p1.text));
  assert.equal(counter(), '2 / 4', 'flipped exactly at the floor');

  // 2. Slow voice: the line runs past the floor; wait for it, then a beat.
  const p2 = lastLine();
  const p2Shown = clock.now;
  const slowEnd = p2Shown + floorFor(p2.text) + 3000;
  await runUntil(slowEnd);
  assert.equal(counter(), '2 / 4', 'did not flip mid-sentence');
  await finishLine(p2);
  await runUntil(slowEnd + 1199);
  assert.equal(counter(), '2 / 4');
  await runUntil(slowEnd + 1200);
  assert.equal(counter(), '3 / 4', 'flipped one beat after the slow line ended');

  // 3. Engine never reports end (iOS): the ceiling flips the page anyway.
  const p3 = lastLine();
  const p3Shown = clock.now;
  await runUntil(p3Shown + ceilFor(p3.text) - 1);
  assert.equal(counter(), '3 / 4');
  await runUntil(p3Shown + ceilFor(p3.text));
  assert.equal(counter(), '4 / 4', 'ceiling advanced a page whose narration never ended');

  // 4. Last page → "The end!" once, one sticker, then the next story. The
  //    end line interrupts the page narration; that stale settle must not
  //    retrigger the ending.
  const p4 = lastLine();
  const p4Shown = clock.now;
  await runUntil(p4Shown + 500);
  await finishLine(p4);
  await runUntil(p4Shown + floorFor(p4.text));
  const endLines = spoken.filter(s => s.text.startsWith('The end!'));
  assert.equal(endLines.length, 1);
  assert.equal(stickers, 1);
  await finishLine(p3); // stale end event from the page the ceiling skipped
  await finishLine(endLines[0]);
  await runUntil(clock.now + 2399);
  assert.equal(spoken.filter(s => s.text.startsWith('The end!')).length, 1, 'ending fired once');
  assert.equal(stickers, 1);
  await runUntil(clock.now + 1);
  assert.equal(counter(), '1 / 4', 'next story started after the beat');
  assert.equal(stickers, 1);

  // 5. Muted voice: say() resolves immediately → page holds for the floor.
  const p5 = lastLine();
  const p5Shown = clock.now;
  await finishLine(p5);
  assert.deepEqual(pendingTimers(), [p5Shown + floorFor(p5.text)]);

  // 6. Tapping the background advances; the interrupted line's settle
  //    must not advance again.
  const screenTap = ids.storyGame.handlers[0];
  screenTap({ target: { closest: () => null } });
  assert.equal(counter(), '2 / 4');
  const p6 = lastLine();
  await finishLine(p5);
  await runUntil(clock.now + 1200);
  assert.equal(counter(), '2 / 4', 'stale narration did not flip the page');

  // 7. Leaving the game: no timers left, and a late narration end is inert.
  story.stop();
  assert.deepEqual(pendingTimers(), []);
  await finishLine(p6);
  await runUntil(clock.now + 60000);
  assert.equal(counter(), '2 / 4');
  assert.deepEqual(pendingTimers(), []);

  console.log('PASS: story pacing — floor, slow-voice wait, no-end ceiling, single ending, muted, tap-ahead, stop');
})().catch(e => { console.error(e); process.exit(1); });
