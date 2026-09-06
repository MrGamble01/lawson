// Deterministic speech regression checks; no audio hardware required.
// Run: node tests/voice.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../lib/audio.js'), 'utf8');
const stored = new Map();
let voices = [], spoken = [], canceled = 0;
const events = new EventTarget();
let onCancel = null;   // lets a test echo an utterance error synchronously from cancel()
const synth = { getVoices: () => voices, addEventListener: events.addEventListener.bind(events),
  speak: u => spoken.push(u), cancel: () => { canceled++; if (onCancel) onCancel(); } };
let resumedSynth = 0, resumedCtx = 0, intervalsStarted = 0, intervalsCleared = 0;
synth.resume = () => { resumedSynth++; synth.paused = false; };
class AudioContext {
  constructor() { this.state = 'running'; }
  createGain() { return { gain: { value: 1 }, connect() {} }; }
  resume() { resumedCtx++; this.state = 'running'; return Promise.resolve(); }
}
const windowEvents = new EventTarget();
const window = { speechSynthesis: synth, AudioContext,
  addEventListener: windowEvents.addEventListener.bind(windowEvents),
  dispatchEvent: windowEvents.dispatchEvent.bind(windowEvents) };
const docEvents = new EventTarget();
const document = { hidden: false,
  addEventListener: docEvents.addEventListener.bind(docEvents),
  dispatchEvent: docEvents.dispatchEvent.bind(docEvents) };
// Virtual one-shot timers (the say() start watchdog); fireTimers() runs them all.
const timers = new Map();
let timerId = 0;
const fireTimers = () => { const due = [...timers.values()]; timers.clear(); due.forEach(t => t.fn()); };
// say() defers speak() by 60 ms when it cuts off a line in flight, and arms
// a start watchdog per utterance. fireDeferred() runs just the deferrals;
// fireWatchdogs() just the watchdogs.
const fireWhere = pred => { for (const [id, t] of [...timers]) if (pred(t)) { timers.delete(id); t.fn(); } };
const fireDeferred = () => fireWhere(t => t.ms === 60);
const fireWatchdogs = () => fireWhere(t => t.ms === 2500 || t.ms === 4000);
// The common case: the line gets spoken (after any deferral) and starts.
const speak = code => { const before = spoken.length; const r = run(code); fireDeferred();
  if (spoken.length > before && spoken.at(-1).onstart) spoken.at(-1).onstart(); return r; };
let clockNow = 0;   // virtual Date.now() for afterSpeech()'s floor arithmetic
const timerDelays = () => [...timers.values()].map(t => t.ms);
const context = vm.createContext({ window, document, Event, CustomEvent, Date: { now: () => clockNow },
  SpeechSynthesisUtterance: function(text) { this.text = text; },
  localStorage: { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v) },
  setInterval: () => ++intervalsStarted, clearInterval: () => intervalsCleared++,
  setTimeout: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; }, clearTimeout: id => timers.delete(id) });
const run = s => vm.runInContext(s, context);
run(source);
speak('say("Hello")');
assert.equal(spoken.at(-1).lang, 'en-US');
voices = [
  { name: 'French', lang: 'fr-FR', voiceURI: 'fr', localService: true },
  { name: 'Samantha', lang: 'en-US', voiceURI: 'basic', localService: true },
  { name: 'Samantha Enhanced', lang: 'en-US', voiceURI: 'enhanced', localService: true },
  { name: 'Natural Online', lang: 'en-US', voiceURI: 'online', localService: false },
  { name: 'Karen', lang: 'en-AU', voiceURI: 'au', localService: true }
];
events.dispatchEvent(new Event('voiceschanged'));
speak('say("Hello")');
assert.equal(spoken.at(-1).voice.voiceURI, 'enhanced');
assert.equal(spoken.at(-1).pitch, 1);
speak('setSpeechVoice("au"); setVolume(0.4); say("Hello")');
assert.equal(spoken.at(-1).lang, 'en-AU');
assert.equal(spoken.at(-1).volume, 0.4);
assert.equal(stored.get('lawson:voice'), 'au');
voices = voices.filter(v => v.voiceURI !== 'au');
events.dispatchEvent(new Event('voiceschanged'));
speak('say("Hello")');
assert.equal(spoken.at(-1).voice.voiceURI, 'enhanced');
assert.equal(stored.get('lawson:voice'), 'au'); // don't erase temporarily unavailable choice
const count = spoken.length;
speak('setVoiceMuted(true); say("Quiet"); unlockSpeech()');
assert.equal(spoken.length, count);
speak('setVoiceMuted(false); setVolume(0); say("Quiet"); unlockSpeech()');
assert.equal(spoken.length, count);
assert.ok(canceled > 0);

// Every line is announced to the app (captions + screen-reader live
// region) before the mute check, so muted play still gets the words.
const said = [];
window.addEventListener('lawson:say', e => said.push(e.detail.text));
speak('setVoiceMuted(false); setVolume(1); say("Captioned")');
assert.deepEqual(said, ['Captioned']);
speak('setVoiceMuted(true); say("Muted but captioned")');
assert.equal(said.at(-1), 'Muted but captioned');
speak('setVoiceMuted(false); setVolume(0); say("Silent but captioned")');
assert.equal(said.at(-1), 'Silent but captioned');
run('setVolume(1)');
// A pronunciation spelling for the engine ("en") is captioned as written ("N").
speak('say("Pop the en!", 0.95, "Pop the N!")');
assert.equal(spoken.at(-1).text, 'Pop the en!');
assert.equal(said.at(-1), 'Pop the N!');

// say() reports when a line has actually finished, so games can pace on
// real narration instead of guessing from word count.
(async () => {
  const settled = [];
  const track = (p, tag) => p.then(() => settled.push(tag));
  const flush = () => new Promise(r => setImmediate(r));
  run('setVolume(1)');
  // Nothing spoken (muted) still resolves, straight away.
  run('setVoiceMuted(true)');
  track(speak('say("Quiet")'), 'muted');
  await flush();
  assert.deepEqual(settled, ['muted']);
  run('setVoiceMuted(false)');
  // Pending until the engine says the line ended.
  track(speak('say("First line")'), 'first');
  await flush();
  assert.deepEqual(settled, ['muted']);
  spoken.at(-1).onend();
  await flush();
  assert.deepEqual(settled, ['muted', 'first']);
  // A later say() cuts the previous line short and releases its waiter,
  // even if the engine never fires end/error for the cancelled utterance.
  track(speak('say("Second line")'), 'second');
  const second = spoken.at(-1);
  track(speak('say("Third line")'), 'third');
  await flush();
  assert.deepEqual(settled, ['muted', 'first', 'second']);
  // A stale end event from the interrupted line must not settle the new one.
  second.onend();
  await flush();
  assert.deepEqual(settled, ['muted', 'first', 'second']);
  spoken.at(-1).onerror();
  await flush();
  assert.deepEqual(settled, ['muted', 'first', 'second', 'third']);
  // Muting or silencing mid-line releases the waiter too.
  track(speak('say("Fourth line")'), 'fourth');
  run('setVoiceMuted(true)');
  await flush();
  assert.deepEqual(settled.at(-1), 'fourth');
  run('setVoiceMuted(false)');
  track(speak('say("Fifth line")'), 'fifth');
  run('setVolume(0)');
  await flush();
  assert.deepEqual(settled.at(-1), 'fifth');
  run('setVolume(1)');
  track(speak('say("Sixth line")'), 'sixth');
  run('cancelSpeech()');
  await flush();
  assert.deepEqual(settled.at(-1), 'sixth');

  // ---- App lifecycle: screen lock / app switch ----
  const lifecycle = [];
  window.addEventListener('lawson:audiohidden', () => lifecycle.push('hidden'));
  window.addEventListener('lawson:audiovisible', () => lifecycle.push('visible'));
  // Menu music is playing and the storyteller is mid-line.
  const musicBase = intervalsStarted; // audio.js also uses setInterval for the voice nudge
  run('setMusicEnabled(true); startMusic()');
  assert.equal(intervalsStarted, musicBase + 1, 'music loop running');
  track(speak('say("Once upon a time")'), 'story');
  const before = { canceled, cleared: intervalsCleared, spokenCount: spoken.length };
  // Lock the screen: narration cut and its waiter released, music loop
  // stopped, listeners told.
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  await flush();
  assert.equal(settled.at(-1), 'story', 'in-flight narration released on hide');
  assert.ok(canceled > before.canceled, 'speech cancelled on hide');
  assert.ok(intervalsCleared > before.cleared, 'music stopped on hide');
  assert.deepEqual(lifecycle, ['hidden']);
  assert.equal(run('isAudioHidden()'), true);
  // pagehide arriving after visibilitychange is a no-op, not a second event.
  window.dispatchEvent(new Event('pagehide'));
  assert.deepEqual(lifecycle, ['hidden']);
  // Nothing speaks or plays behind a locked screen.
  track(speak('say("Should not be heard")'), 'behind-lock');
  await flush();
  assert.equal(spoken.length, before.spokenCount, 'no utterance while hidden');
  assert.notEqual(said.at(-1), 'Should not be heard', 'no caption while hidden');
  assert.equal(settled.at(-1), 'behind-lock', 'hidden say() still resolves');
  run('startMusic()');
  assert.equal(intervalsStarted, musicBase + 1, 'music does not start while hidden');
  // Unlock: iOS has left the speech engine paused and the audio context
  // interrupted. Both are woken, the music loop restarts, listeners told.
  synth.paused = true;
  run('audioCtx.state = "interrupted"');
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  await flush();
  assert.deepEqual(lifecycle, ['hidden', 'visible']);
  assert.equal(run('isAudioHidden()'), false);
  assert.equal(resumedSynth, 1, 'paused speech engine resumed');
  assert.equal(resumedCtx, 1, 'interrupted audio context resumed');
  assert.equal(intervalsStarted, musicBase + 2, 'music restarted because it was playing before');
  window.dispatchEvent(new Event('pageshow'));
  assert.deepEqual(lifecycle, ['hidden', 'visible'], 'duplicate show is a no-op');
  // Music that was already off stays off across a hide/show.
  run('stopMusic()');
  window.dispatchEvent(new Event('pagehide'));
  window.dispatchEvent(new Event('pageshow'));
  assert.equal(intervalsStarted, musicBase + 2, 'no phantom music after unlock');
  // A stuck-paused engine is also recovered on the next say(), for
  // interruptions (Siri, phone call) that never hide the page.
  synth.paused = true;
  speak('say("After a phone call")');
  assert.equal(resumedSynth, 2);
  assert.equal(spoken.at(-1).text, 'After a phone call');
  // A running context is left alone; a closed one is never resumed.
  run('unlockAudio()');
  assert.equal(resumedCtx, 1);
  run('audioCtx.state = "closed"; unlockAudio()');
  assert.equal(resumedCtx, 1);
  run('audioCtx.state = "suspended"; unlockAudio()');
  assert.equal(resumedCtx, 2);

  // ---- A voice that can't speak: fall back to a local one ----
  const voiceChanges = [];
  window.addEventListener('lawson:voiceschanged', () => voiceChanges.push(run('preferredVoice && preferredVoice.voiceURI')));
  // Cut-off errors never trigger a fallback.
  const local = spoken.length;
  track(speak('say("Local line")'), 'local');
  assert.equal(spoken.at(-1).voice.voiceURI, 'enhanced');
  assert.equal(timers.size, 0, 'local watchdog cleared once the line started');
  spoken.at(-1).onerror({ error: 'interrupted' });
  await flush();
  assert.equal(settled.at(-1), 'local');
  assert.equal(spoken.length, local + 1, 'no retry for an interruption');
  assert.equal(run('speechFallback()'), null);
  // Parent chose the online voice; the iPad is offline: `network` error.
  run('setSpeechVoice("online")');
  track(run('say("Once upon a time")'), 'online-1');
  fireDeferred();
  const first = spoken.at(-1);
  assert.equal(first.voice.voiceURI, 'online');
  assert.equal(timers.size, 1, 'start watchdog armed for an online voice');
  first.onstart();
  assert.equal(timers.size, 0, 'watchdog cleared once speech starts');
  voiceChanges.length = 0;
  first.onerror({ error: 'network' });
  await flush();
  assert.notEqual(settled.at(-1), 'online-1', 'line still pending while the fallback reads it');
  fireDeferred();                 // the fallback speaks after a beat
  const retry = spoken.at(-1);
  assert.notEqual(retry, first);
  assert.equal(retry.text, 'Once upon a time');
  assert.equal(retry.voice.voiceURI, 'enhanced', 'best local voice read the line');
  assert.equal(retry.lang, 'en-US');
  assert.deepEqual(voiceChanges, ['enhanced'], 'Settings told about the swap');
  const fb = run('speechFallback()');
  assert.equal(fb.failed.voiceURI, 'online');
  assert.equal(fb.using.voiceURI, 'enhanced');
  retry.onend();
  await flush();
  assert.equal(settled.at(-1), 'online-1', 'resolved when the fallback finished');
  // Later lines go straight to the local voice; the choice itself is kept.
  speak('say("Next line")');
  assert.equal(spoken.at(-1).voice.voiceURI, 'enhanced');
  assert.equal(timers.size, 0);
  assert.equal(stored.get('lawson:voice'), 'online', 'saved choice untouched');
  // Back online: the chosen voice is tried again.
  window.dispatchEvent(new Event('online'));
  assert.equal(run('speechFallback()'), null);
  speak('say("Reconnected")');
  assert.equal(spoken.at(-1).voice.voiceURI, 'online');
  // ...but this time it silently never starts: the watchdog fires,
  // the hung utterance is cancelled, and its late "interrupted" error
  // must not end the line the fallback is now reading.
  const hung = spoken.at(-1);
  track(run('say("Hanging line")'), 'hung');
  fireDeferred();
  const hung2 = spoken.at(-1);
  const cancelsBefore = canceled;
  fireWatchdogs();
  fireDeferred();
  await flush();
  assert.ok(canceled > cancelsBefore, 'hung utterance cancelled');
  const retry2 = spoken.at(-1);
  assert.equal(retry2.voice.voiceURI, 'enhanced');
  hung2.onerror({ error: 'interrupted' });
  hung.onerror({ error: 'interrupted' });
  await flush();
  assert.notEqual(settled.at(-1), 'hung', 'stale utterance events ignored');
  retry2.onend();
  await flush();
  assert.equal(settled.at(-1), 'hung');
  // Some engines echo "interrupted" synchronously from inside cancel();
  // that echo belongs to the failed attempt and must not end the line.
  window.dispatchEvent(new Event('online'));
  track(speak('say("Echo line")'), 'echo');
  const echo = spoken.at(-1);
  assert.equal(echo.voice.voiceURI, 'online');
  onCancel = () => echo.onerror({ error: 'interrupted' });
  echo.onerror({ error: 'network' });
  onCancel = null;
  await flush();
  fireDeferred();
  const echoRetry = spoken.at(-1);
  assert.equal(echoRetry.voice.voiceURI, 'enhanced');
  assert.notEqual(settled.at(-1), 'echo', 'synchronous echo did not settle the line');
  echoRetry.onend();
  await flush();
  assert.equal(settled.at(-1), 'echo');
  // A failure that arrives after a newer line cut this one off: no retry,
  // no mark against the voice.
  window.dispatchEvent(new Event('online'));
  track(speak('say("Cut off")'), 'cut');
  const cut = spoken.at(-1);
  assert.equal(cut.voice.voiceURI, 'online');
  track(speak('say("Newer")'), 'newer');
  const newer = spoken.at(-1);
  await flush();
  assert.equal(settled.at(-1), 'cut');
  const countBefore = spoken.length;
  cut.onerror({ error: 'network' });
  await flush();
  assert.equal(spoken.length, countBefore, 'no retry for a superseded line');
  assert.equal(run('speechFallback()'), null, 'voice not blamed for a cut-off line');
  assert.equal(newer.voice.voiceURI, 'online');
  newer.onend();
  await flush();
  // Choosing the failed voice again on purpose clears the mark.
  run('markVoiceUnusable("online")');
  assert.equal(run('preferredVoice.voiceURI'), 'enhanced');
  run('setSpeechVoice("online")');
  assert.equal(run('preferredVoice.voiceURI'), 'online');
  // The only voice there is fails: settle, don't loop.
  voices = voices.filter(v => v.voiceURI === 'online');
  events.dispatchEvent(new Event('voiceschanged'));
  track(speak('say("Alone")'), 'alone');
  const alone = spoken.at(-1);
  assert.equal(alone.voice.voiceURI, 'online');
  const before2 = spoken.length;
  alone.onerror({ error: 'network' });
  await flush();
  assert.equal(spoken.length, before2, 'nothing else to try');
  assert.equal(settled.at(-1), 'alone');
  assert.equal(run('speechFallback()'), null);
  // A changed voice list gives the failed voice another chance.
  voices = [
    { name: 'Samantha Enhanced', lang: 'en-US', voiceURI: 'enhanced', localService: true },
    { name: 'Natural Online', lang: 'en-US', voiceURI: 'online', localService: false },
  ];
  events.dispatchEvent(new Event('voiceschanged'));
  assert.equal(run('preferredVoice.voiceURI'), 'online');

  // ---- speechDone(): wait for whatever is being said right now ----
  run('setVoiceMuted(true)');
  track(run('speechDone()'), 'idle');
  await flush();
  assert.equal(settled.at(-1), 'idle', 'resolved at once when nothing is in flight');
  run('setVoiceMuted(false)');
  const sd = speak('say("Sticker! Storyteller!")');
  assert.strictEqual(run('speechDone()'), sd, 'speechDone() is the promise of the current line');
  track(run('speechDone()'), 'sticker-line');
  await flush();
  assert.notEqual(settled.at(-1), 'sticker-line');
  spoken.at(-1).onend();
  await flush();
  assert.equal(settled.at(-1), 'sticker-line');
  track(run('speechDone()'), 'after');
  await flush();
  assert.equal(settled.at(-1), 'after', 'stays resolved once the line has ended');

  // ---- afterSpeech(): "cheer, then next round" ----
  run('setSpeechVoice("enhanced")');   // a local voice: no start watchdog in the timer list
  timers.clear();
  let fired = 0;
  context.next = () => fired++;
  // Nothing being said: the floor alone decides, and the ceiling is dropped.
  clockNow = 0;
  run('afterSpeech(next, { minMs: 1500, beatMs: 500, maxMs: 6000 })');
  assert.deepEqual(timerDelays(), [6000], 'ceiling armed at once');
  await flush();
  assert.deepEqual(timerDelays(), [1500], 'idle engine: wait out the floor');
  fireTimers();
  assert.equal(fired, 1);
  // A cheer in flight that runs past the floor: fire one beat after it ends.
  fired = 0; clockNow = 0;
  speak('say("Great job, Lawson! It\'s a cow!")');
  const cheerLine = spoken.at(-1);
  run('afterSpeech(next, { minMs: 1500, beatMs: 500 })');
  await flush();
  assert.deepEqual(timerDelays(), [6000], 'still waiting for the cheer');
  clockNow = 2000;
  cheerLine.onend();
  await flush();
  assert.deepEqual(timerDelays(), [500], 'one beat after the cheer');
  fireTimers();
  assert.equal(fired, 1);
  // A cheer that ends before the floor: the floor still holds.
  fired = 0; clockNow = 0;
  speak('say("Yay!")');
  run('afterSpeech(next, { minMs: 1500, beatMs: 500 })');
  clockNow = 400;
  spoken.at(-1).onend();
  await flush();
  assert.deepEqual(timerDelays(), [1100], 'floor minus elapsed');
  fireTimers();
  assert.equal(fired, 1);
  // "New best!" starts while the cheer is being waited for: wait for it too.
  fired = 0; clockNow = 0;
  speak('say("Great job!")');
  run('afterSpeech(next, { minMs: 1000, beatMs: 500 })');
  await flush();
  speak('say("New best! 7!")');     // cuts the cheer, as celebrateNewHigh does
  const best = spoken.at(-1);
  await flush();
  assert.deepEqual(timerDelays(), [6000], 'still waiting: a newer line is in flight');
  clockNow = 3000;
  best.onend();
  await flush();
  assert.deepEqual(timerDelays(), [500]);
  fireTimers();
  assert.equal(fired, 1, 'fired once, after the newer line');
  // Engine goes quiet: the ceiling fires, and the late end changes nothing.
  fired = 0; clockNow = 0;
  speak('say("Hanging cheer")');
  const hangingCheer = spoken.at(-1);
  run('afterSpeech(next, { minMs: 1000, beatMs: 500, maxMs: 6000 })');
  await flush();
  fireTimers();                   // the ceiling
  assert.equal(fired, 1, 'ceiling moved the game on');
  clockNow = 7000;
  hangingCheer.onend();
  await flush();
  assert.deepEqual(timerDelays(), [], 'nothing rescheduled after the ceiling');
  assert.equal(fired, 1);
  // Cancelled (the game was left): never fires.
  fired = 0; clockNow = 0;
  speak('say("Cancelled cheer")');
  const cancelledCheer = spoken.at(-1);
  run('cancelNext = afterSpeech(next, { minMs: 1000 })');
  run('cancelNext()');
  assert.deepEqual(timerDelays(), [], 'ceiling dropped on cancel');
  cancelledCheer.onend();
  await flush();
  await flush();
  assert.deepEqual(timerDelays(), []);
  assert.equal(fired, 0);
  // Voice muted: say() resolves at once, so the floor is the whole wait.
  fired = 0; clockNow = 0;
  speak('setVoiceMuted(true); say("Muted cheer"); afterSpeech(next, { minMs: 1800, beatMs: 500 })');
  await flush();
  assert.deepEqual(timerDelays(), [1800], 'muted: old fixed delay preserved');
  fireTimers();
  assert.equal(fired, 1);
  run('setVoiceMuted(false)');

  // ---- Swallowed utterances (speak() right after cancel()) ----
  run('setSpeechVoice("enhanced")');
  // A line spoken while another is in flight waits a beat before speak().
  track(speak('say("In flight")'), 'inflight');
  const n0 = spoken.length;
  track(run('say("Right after a cut-off")'), 'after-cut');
  await flush();
  assert.equal(settled.at(-1), 'inflight', 'cut-off line released at once');
  assert.equal(spoken.length, n0, 'speak() deferred after a cut-off');
  assert.deepEqual(timerDelays(), [60]);
  fireDeferred();
  assert.equal(spoken.length, n0 + 1, 'spoken after the beat');
  assert.deepEqual(timerDelays(), [2500], 'local start watchdog armed');
  spoken.at(-1).onstart();
  assert.deepEqual(timerDelays(), [], 'watchdog cleared on start');
  spoken.at(-1).onend();
  await flush();
  assert.equal(settled.at(-1), 'after-cut');
  // Idle engine: spoken at once, no beat.
  const n1 = spoken.length;
  run('say("Idle engine")');
  assert.equal(spoken.length, n1 + 1, 'no deferral when nothing was cut off');
  spoken.at(-1).onstart(); spoken.at(-1).onend();
  await flush();
  // A deferred line superseded before its beat never speaks; the newest does.
  track(speak('say("A")'), 'A');
  const n2 = spoken.length;
  track(run('say("B")'), 'B');
  track(run('say("C")'), 'C');
  await flush();
  assert.equal(settled.at(-1), 'B', 'B released before it was ever spoken');
  fireDeferred();
  assert.equal(spoken.length, n2 + 1, 'only C spoke');
  assert.equal(spoken.at(-1).text, 'C');
  spoken.at(-1).onstart(); spoken.at(-1).onend();
  await flush();
  assert.equal(settled.at(-1), 'C');
  // The engine swallows a local line (no start, no error): read it again
  // with the same voice, once, after a beat. The voice is not blamed.
  const n3 = spoken.length;
  track(run('say("Swallowed")'), 'swallowed');
  const swallowed = spoken.at(-1);
  assert.equal(swallowed.voice.voiceURI, 'enhanced');
  const cancels = canceled;
  fireWatchdogs();
  assert.ok(canceled > cancels, 'swallowed utterance cleared');
  assert.deepEqual(timerDelays(), [60], 'same-voice retry after a beat');
  fireDeferred();
  const again = spoken.at(-1);
  assert.equal(spoken.length, n3 + 2);
  assert.equal(again.text, 'Swallowed');
  assert.equal(again.voice.voiceURI, 'enhanced', 'same voice, not a fallback');
  assert.equal(run('speechFallback()'), null, 'voice not blamed');
  swallowed.onerror({ error: 'interrupted' });   // late echo from the cancel
  await flush();
  assert.notEqual(settled.at(-1), 'swallowed', 'echo ignored');
  again.onstart(); again.onend();
  await flush();
  assert.equal(settled.at(-1), 'swallowed');
  // Swallowed twice: give the line up, don't loop, still don't blame the voice.
  const n4 = spoken.length;
  track(run('say("Twice")'), 'twice');
  fireWatchdogs(); fireDeferred();
  assert.equal(spoken.length, n4 + 2);
  fireWatchdogs();
  await flush();
  assert.equal(settled.at(-1), 'twice', 'settled after the second miss');
  assert.deepEqual(timerDelays(), [], 'no third attempt');
  assert.equal(run('preferredVoice.voiceURI'), 'enhanced');
  assert.equal(run('speechFallback()'), null);
  // A cut-off during the retry's beat abandons the retry.
  track(run('say("Dropped then cut")'), 'dtc');
  fireWatchdogs();
  const n5 = spoken.length;
  run('cancelSpeech()');
  await flush();
  assert.equal(settled.at(-1), 'dtc');
  fireDeferred();
  assert.equal(spoken.length, n5, 'retry abandoned after the cut-off');
  // A remote voice that never starts still goes straight to the fallback.
  run('setSpeechVoice("online")');
  track(run('say("Remote hang")'), 'remote-hang');
  assert.equal(spoken.at(-1).voice.voiceURI, 'online');
  fireWatchdogs(); fireDeferred();
  assert.equal(spoken.at(-1).voice.voiceURI, 'enhanced', 'fallback voice, no same-voice retry for remote');
  assert.equal(run('speechFallback().failed.voiceURI'), 'online');
  spoken.at(-1).onstart(); spoken.at(-1).onend();
  await flush();
  assert.equal(settled.at(-1), 'remote-hang');
  window.dispatchEvent(new Event('online'));

  console.log('PASS: delayed voices, natural pitch, local quality preference, saved choice, language, volume, mute, missing voice fallback, speech completion promise, caption event, hide/show lifecycle, unusable-voice fallback, speechDone, afterSpeech, swallowed utterances');
})().catch(e => { console.error(e); process.exit(1); });
