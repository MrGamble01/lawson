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
const ids = { storyStage: el(), storyText: el(), storyCounter: el(), storyGame: el(), storyAgain: el(), storyNext: el() };
const document = { getElementById: id => ids[id] || null, createElement: () => el() };

// ---- Lawson stub ----
const spoken = [];      // [text, resolve]
let stickers = 0;
let inFlight = null;    // like lib/audio.js: a new line cuts off (settles) the one in flight
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
  // Mirrors lib/audio.js afterSpeech() on the virtual clock: idle + beat,
  // floor, ceiling, and a line that starts during the beat is waited for.
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
  beep() {}, haptic() {}, happySound() {}, sparkleAt() {},
  cheer: () => 'Yay!',
  // Like lib/achievements.js: the first award announces itself a beat
  // later, through afterSpeech, so it never talks over the cheer.
  earnSticker: () => { stickers++; if (stickers === 1) L.afterSpeech(() => L.say('Sticker! Storyteller!', 1.05), { beatMs: 150, minMs: 0 }); },
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
  assert.equal(stickers, 0, 'sticker not awarded over the ending line');
  assert.equal(lastLine(), endLines[0]);
  await finishLine(p3); // stale end event from the page the ceiling skipped
  await runUntil(clock.now + 3000);
  assert.equal(counter(), '4 / 4', 'still on the ending while "The end!" is being said');
  await finishLine(endLines[0]);
  assert.equal(stickers, 1, 'sticker awarded once the ending was heard');
  assert.notEqual(lastLine().text, 'Sticker! Storyteller!', 'announcement not spoken in the same instant');
  await runUntil(clock.now + 150);
  assert.equal(lastLine().text, 'Sticker! Storyteller!', 'announcement follows the ending after a beat');
  await runUntil(clock.now + 3000);
  assert.equal(counter(), '4 / 4', 'still waiting for the sticker line');
  await finishLine(lastLine());
  await runUntil(clock.now + 1499);
  assert.equal(spoken.filter(s => s.text.startsWith('The end!')).length, 1, 'ending fired once');
  assert.equal(counter(), '4 / 4');
  await runUntil(clock.now + 1);
  assert.equal(counter(), '1 / 4', 'next story one beat after the sticker line');
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
  const endsBefore = spoken.filter(s => s.text.startsWith('The end!')).length;
  await runUntil(clock.now + 1000); // let the 12 sparkle timers (≤ 605 ms) fire
  assert.equal(pendingTimers().length, 1, 'only the ending ceiling remains');
  await finishLine(lastLine());      // "The end!" heard → sticker (already earned) → beat armed
  assert.equal(stickers, stickersBefore + 1);
  assert.equal(lastLine().text.startsWith('The end!'), true, 'no announcement for an old sticker');
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
  await finishLine(lastLine());                                   // ending heard
  await runUntil(clock.now + 1500);                               // → next story rendered exactly now
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
  const ending16 = lastLine();
  pokeChar(0);                       // cuts "The end!" off; the sound is what's in flight now
  await flush();
  await finishLine(lastLine());
  await runUntil(clock.now + 1500);  // a re-read would have landed inside this window
  assert.equal(linesSaid(p16.text), 1, 'last line not re-read over the ending');
  assert.equal(spoken.filter(s => s.text.startsWith('The end!')).length, endsBefore16 + 1, 'ending fired once');
  assert.equal(counter(), '1 / 4', 'next story started once the ending settled');
  assert.equal(stickers, stickersBefore16 + 1);

  // 17. The engine never reports "The end!" finished: the ceiling moves on.
  [tapAhead, tapAhead, tapAhead, tapAhead].forEach(f => f()); // 1 → 2 → 3 → 4 → The end!
  await flush();
  const endShown = clock.now;
  assert.ok(lastLine().text.startsWith('The end!'));
  await runUntil(endShown + 8999);
  assert.equal(counter(), '4 / 4');
  await runUntil(endShown + 9000);
  assert.equal(counter(), '1 / 4', 'ceiling started the next story');
  void ending16;
  story.stop();

  // 18. Tapping the words reads the line again from the top and holds the
  //     page for it: the pending turn goes back to the ceiling, then comes
  //     forward to a beat after the re-read has been heard.
  const tapWords = () => ids.storyGame.handlers[0]({ target: { closest: sel => sel === '.story-bubble' ? {} : null } });
  story.start();
  const t18 = clock.now;
  const p18 = lastLine();
  const said18 = linesSaid(p18.text);   // counts are over the whole run; this story has been told before
  await runUntil(t18 + 600);
  tapWords();
  await flush();
  assert.ok(p18.done, 'the reading in flight is cut off');
  assert.equal(lastLine().text, p18.text, 'the same line is read again');
  assert.equal(linesSaid(p18.text), said18 + 1);
  assert.equal(counter(), '1 / 4', 'tapping the words never turns the page');
  assert.deepEqual(pendingTimers(), [t18 + 600 + ceilFor(p18.text)], 'page turn pushed back to the ceiling');
  await runUntil(t18 + floorFor(p18.text) + 200);
  assert.equal(counter(), '1 / 4', 'past the floor, the page still waits for the re-read');
  await finishLine(lastLine());
  assert.deepEqual(pendingTimers(), [clock.now + 1200], 'a beat after the re-read');
  await runUntil(clock.now + 1199);
  assert.equal(counter(), '1 / 4');
  await runUntil(clock.now + 1);
  assert.equal(counter(), '2 / 4', 'turned a beat after the re-read');

  // 19. The line was already heard and the turn is pending: the words tap
  //     re-reads anyway (it is a request, not a poke) and the earlier turn
  //     is cancelled in favour of one after the re-read.
  const t19 = clock.now;
  const p19 = lastLine();
  const said19 = linesSaid(p19.text);
  await finishLine(p19);
  assert.deepEqual(pendingTimers(), [t19 + floorFor(p19.text)]);
  await runUntil(t19 + floorFor(p19.text) - 300);
  tapWords();
  await flush();
  assert.equal(linesSaid(p19.text), said19 + 1, 'a heard line is still re-read on request');
  await runUntil(t19 + floorFor(p19.text) + 500);
  assert.equal(counter(), '2 / 4', 'the pending turn was cancelled for the re-read');
  await finishLine(lastLine());
  await runUntil(clock.now + 1200);
  assert.equal(counter(), '3 / 4', 'turned a beat after the re-read');

  // 20. A poke's pending re-read yields to the words tap: one re-read, not two.
  const t20 = clock.now;
  const p20 = lastLine();
  const said20 = linesSaid(p20.text);
  pokeChar(0);
  await flush();
  const sound20 = lastLine();
  assert.notEqual(sound20.text, p20.text);
  tapWords();
  await flush();
  assert.ok(sound20.done, 'the poke sound is cut off by the request');
  assert.equal(lastLine().text, p20.text);
  assert.equal(linesSaid(p20.text), said20 + 1, 'one re-read, from the tap');
  await runUntil(clock.now + 200);
  assert.equal(linesSaid(p20.text), said20 + 1, 'the poke did not add a second re-read');
  await finishLine(lastLine());
  await runUntil(t20 + floorFor(p20.text) + 1200);
  assert.equal(counter(), '4 / 4');

  // 21. At "The end!" there is no page line to hear: the last line is not
  //     re-read over the ending.
  const p21 = lastLine();
  const said21 = linesSaid(p21.text);
  tapAhead();                        // → The end!
  await flush();
  assert.ok(lastLine().text.startsWith('The end!'));
  tapWords();
  await flush();
  assert.equal(linesSaid(p21.text), said21, 'no re-read of the last line over the ending');
  assert.equal(counter(), '4 / 4');
  story.stop();

  // 22. The "Hear the words again" button is the keyboard path to the
  //     words tap: same re-read, page held; at "The end!" it keeps going.
  story.stop();
  story.start();
  const p22 = lastLine();
  const said22 = linesSaid(p22.text);
  await runUntil(clock.now + 600);
  assert.equal(ids.storyAgain.handlers.length, 1, 'the hear-again button has one tap handler');
  ids.storyAgain.handlers[0]({ stopPropagation() {} });
  await flush();
  assert.equal(lastLine().text, p22.text, 'Enter on "Hear the words again" reads the line again');
  assert.equal(linesSaid(p22.text), said22 + 1);
  assert.equal(counter(), '1 / 4', 'the hear-again button never turns the page');
  await finishLine(lastLine());
  assert.equal(counter(), '1 / 4', 'the page waits for the re-read to be heard (pacing as in 18)');

  console.log('PASS: story pacing — floor, slow-voice wait, no-end ceiling, single ending, muted, tap-ahead, stop, lock/unlock freeze + resume, poke-then-resume, ending heard before sticker + next story, tap the words to hear the line again, hear-again button');
})().catch(e => { console.error(e); process.exit(1); });
