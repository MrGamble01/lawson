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
let inFlight = null;    // like lib/audio.js: a new line cuts off (settles) the one in flight
const L = {
  games: {},
  say: (text) => new Promise(resolve => {
    if (inFlight) inFlight.resolve();
    inFlight = { text, resolve };
    spoken.push(inFlight);
  }),
  onTap: (node, fn) => node.handlers.push(fn),
  beep() {}, haptic() {}, happySound() {}, sparkleAt() {},
  cheer: () => 'Yay!', earnSticker: () => { stickers++; },
};
const windowEvents = new EventTarget();
const window = { Lawson: L,
  addEventListener: windowEvents.addEventListener.bind(windowEvents),
  dispatchEvent: windowEvents.dispatchEvent.bind(windowEvents) };
const hideApp = () => window.dispatchEvent(new Event('lawson:audiohidden'));
const showApp = () => window.dispatchEvent(new Event('lawson:audiovisible'));
vm.runInNewContext(source, {
  window, document, Math, Event,
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

  // 8. Screen lock mid-page: the page freezes (no timers, stale narration
  //    inert) and on unlock the same page is read again from the top.
  story.start();
  assert.equal(counter(), '1 / 4');
  const p8 = lastLine();
  await runUntil(clock.now + 800);
  hideApp();
  assert.deepEqual(pendingTimers(), [], 'no timers while hidden');
  await finishLine(p8); // audio layer cancels narration on hide → settles
  await runUntil(clock.now + 60000);
  assert.equal(counter(), '1 / 4', 'page did not churn ahead while hidden');
  const spokenBefore = spoken.length;
  showApp();
  assert.equal(spoken.length, spokenBefore + 1, 'page re-read on unlock');
  assert.equal(lastLine().text, p8.text);
  assert.equal(counter(), '1 / 4');
  assert.equal(pendingTimers().length, 1, 'ceiling armed again');
  await finishLine(lastLine());
  await runUntil(clock.now + floorFor(p8.text));
  assert.equal(counter(), '2 / 4', 'pacing continues normally after unlock');

  // 9. Screen lock at "The end!": unlock moves on to the next story
  //    instead of replaying the ending.
  const screenTap2 = ids.storyGame.handlers[0];
  screenTap2({ target: { closest: () => null } }); // → 3 / 4
  screenTap2({ target: { closest: () => null } }); // → 4 / 4
  assert.equal(counter(), '4 / 4');
  const stickersBefore = stickers;
  screenTap2({ target: { closest: () => null } }); // → The end!
  assert.equal(stickers, stickersBefore + 1);
  const endsBefore = spoken.filter(s => s.text.startsWith('The end!')).length;
  await runUntil(clock.now + 1000); // let the 12 sparkle timers (≤ 605 ms) fire
  assert.equal(pendingTimers().length, 1, 'only the next-story timer remains');
  hideApp();
  assert.deepEqual(pendingTimers(), []);
  await runUntil(clock.now + 60000);
  showApp();
  assert.equal(counter(), '1 / 4', 'next story started on unlock');
  assert.equal(spoken.filter(s => s.text.startsWith('The end!')).length, endsBefore, 'ending not replayed');
  assert.equal(stickers, stickersBefore + 1, 'sticker not re-awarded');

  // 10. Lifecycle events are ignored when the game isn't open.
  story.stop();
  const spokenAfterStop = spoken.length;
  hideApp();
  showApp();
  assert.equal(spoken.length, spokenAfterStop, 'no narration from a closed game');
  assert.deepEqual(pendingTimers(), []);

  // ---- Character pokes ----
  const pokeChar = (i = 0) => ids.storyStage.children[i].handlers[0]({ stopPropagation() {} });
  const linesSaid = text => spoken.filter(s => s.text === text).length;

  // 11. Poke mid-line: the character answers (cutting the storyteller
  //     off), then the line is read again from the top, and the page
  //     paces off the re-read — never off the cut-off attempt.
  story.start();
  const p11 = lastLine();
  const p11Shown = clock.now;
  await runUntil(clock.now + 500);
  pokeChar(0);
  await flush();
  const sound11 = lastLine();
  assert.notEqual(sound11.text, p11.text, 'character sound spoken');
  assert.deepEqual(pendingTimers(), [p11Shown + ceilFor(p11.text)], 'cut-off reading scheduled nothing');
  await finishLine(sound11);
  assert.equal(lastLine().text, p11.text, 'line read again after the poke');
  assert.equal(linesSaid(p11.text), 2);
  assert.deepEqual(pendingTimers(), [p11Shown + ceilFor(p11.text)], 'still waiting on the re-read');
  await runUntil(clock.now + 1500);
  await finishLine(lastLine());
  assert.deepEqual(pendingTimers(), [p11Shown + floorFor(p11.text)], 'floor scheduled once the re-read ended');
  await runUntil(p11Shown + floorFor(p11.text));
  assert.equal(counter(), '2 / 4');

  // 12. Poke after the line was heard: the sound plays, nothing is re-read.
  const p12 = lastLine();
  await runUntil(clock.now + 300);
  await finishLine(p12);
  const timersAfterHeard = pendingTimers();
  pokeChar(1);
  await flush();
  await finishLine(lastLine());
  assert.equal(linesSaid(p12.text), 1, 'heard line not re-read');
  assert.deepEqual(pendingTimers(), timersAfterHeard, 'pacing untouched by a late poke');
  await runUntil(timersAfterHeard[0]);
  assert.equal(counter(), '3 / 4');

  // 13. Rapid pokes: the newest poke owns the re-read, so the line is
  //     read again exactly once, after the last sound.
  const p13 = lastLine();
  await runUntil(clock.now + 200);
  pokeChar(0);
  await flush();
  pokeChar(1);          // cuts off the first sound
  await flush();
  assert.equal(linesSaid(p13.text), 1, 'no re-read while a newer poke is still sounding');
  await finishLine(lastLine());
  assert.equal(linesSaid(p13.text), 2, 'one re-read after the last poke');
  await finishLine(lastLine());
  await runUntil(clock.now + 5000);
  assert.equal(linesSaid(p13.text), 2, 'no second re-read');
  assert.equal(counter(), '4 / 4');

  // 14. Poke, then tap ahead before the sound ends: the old page's line
  //     is not read over the new page.
  const p14 = lastLine();
  await runUntil(clock.now + 200);
  pokeChar(0);
  await flush();
  const readsOfP14 = linesSaid(p14.text);
  ids.storyGame.handlers[0]({ target: { closest: () => null } }); // → The end! (cuts the sound off)
  await flush();
  await runUntil(clock.now + 2400);                              // → next story rendered exactly now
  assert.equal(counter(), '1 / 4');
  assert.equal(linesSaid(p14.text), readsOfP14, 'stale poke did not re-read the old page');

  // 15. A page that keeps getting poked still turns at the ceiling.
  const p15 = lastLine();
  const p15Shown = clock.now;
  const p15Ceil = p15Shown + ceilFor(p15.text);
  while (clock.now + 1000 < p15Ceil) {
    await runUntil(clock.now + 1000);
    pokeChar(0);
    await flush();
    await finishLine(lastLine());   // sound done → re-read starts, never finishes
  }
  assert.equal(counter(), '1 / 4');
  await runUntil(p15Ceil);
  assert.equal(counter(), '2 / 4', 'ceiling bounded the endlessly poked page');

  // 16. Tap straight to the ending with the last line unheard, then poke
  //     during the "The end!" pause: no re-read, no second ending.
  const tapAhead = () => ids.storyGame.handlers[0]({ target: { closest: () => null } });
  tapAhead(); tapAhead();            // → 4 / 4, its line in flight
  assert.equal(counter(), '4 / 4');
  const p16 = lastLine();
  const endsBefore16 = spoken.filter(s => s.text.startsWith('The end!')).length;
  const stickersBefore16 = stickers;
  tapAhead();                        // → The end! (last line never heard)
  await flush();
  pokeChar(0);
  await flush();
  await finishLine(lastLine());
  await runUntil(clock.now + 2400);  // the next-story beat; a re-read would have landed inside it
  assert.equal(linesSaid(p16.text), 1, 'last line not re-read over the ending');
  assert.equal(spoken.filter(s => s.text.startsWith('The end!')).length, endsBefore16 + 1, 'ending fired once');
  assert.equal(stickers, stickersBefore16 + 1);
  assert.equal(counter(), '1 / 4', 'next story started');
  story.stop();

  console.log('PASS: story pacing — floor, slow-voice wait, no-end ceiling, single ending, muted, tap-ahead, stop, lock/unlock freeze + resume, poke-then-resume');
})().catch(e => { console.error(e); process.exit(1); });
