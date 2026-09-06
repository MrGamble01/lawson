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
  localStorage: { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v), removeItem: k => stored.delete(k) },
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

  // ---- Speech diagnostics: what the Settings voice report reads ----
  run('setSpeechVoice("enhanced")');
  const logLen = () => run('speechLog().length');
  const lastEntry = () => run('speechLog().at(-1)');
  // The buffer is a ring, so look entries up by text + stage, not index.
  const entry = (text, stage = 0) => run(`speechLog().find(e => e.text === ${JSON.stringify(text)} && e.stage === ${stage})`);
  // A normal line: start latency and end recorded.
  clockNow = 10000;
  run('say("Report line")');
  assert.equal(lastEntry().outcome, 'pending');
  assert.equal(lastEntry().text, 'Report line');
  assert.equal(lastEntry().voice, 'Samantha Enhanced');
  assert.equal(lastEntry().local, true);
  assert.equal(lastEntry().stage, 0);
  clockNow = 10400;
  spoken.at(-1).onstart();
  assert.equal(lastEntry().startMs, 400, 'start latency measured');
  clockNow = 12600;
  spoken.at(-1).onend();
  await flush();
  assert.equal(lastEntry().outcome, 'ended');
  assert.equal(lastEntry().endMs, 2600);
  // A line cut off by the next one is closed as "cut" even if the engine
  // reports nothing.
  clockNow = 20000;
  run('say("Cut by next")');
  clockNow = 20300;
  spoken.at(-1).onstart();
  clockNow = 21000;
  run('say("The next one")');       // deferred 60 ms (cut-off), no engine echo for the old line
  assert.equal(entry('Cut by next').outcome, 'cut');
  assert.equal(entry('Cut by next').endMs, 1000);
  fireDeferred();
  assert.equal(lastEntry().text, 'The next one');
  assert.equal(lastEntry().delayMs, 60, 'the beat after a cut-off is recorded');
  assert.equal(lastEntry().outcome, 'pending');
  spoken.at(-1).onstart(); spoken.at(-1).onend();
  await flush();
  // A swallowed line: the first attempt is "dropped", the re-read is stage 1.
  clockNow = 30000;
  run('say("Swallowed report")');
  clockNow = 32500;
  fireWatchdogs(); fireDeferred();
  assert.equal(entry('Swallowed report').outcome, 'dropped');
  assert.equal(entry('Swallowed report').endMs, 2500);
  assert.equal(lastEntry().stage, 1, 're-read logged as stage 1');
  assert.equal(lastEntry().voice, 'Samantha Enhanced');
  spoken.at(-1).onstart(); spoken.at(-1).onend();
  await flush();
  assert.equal(lastEntry().outcome, 'ended');
  // A voice error and its stand-in are stage 0 error + stage 2.
  run('setSpeechVoice("online")');
  run('say("Stand-in report")');
  spoken.at(-1).onstart();
  spoken.at(-1).onerror({ error: 'network' });
  await flush();
  fireDeferred();
  assert.equal(entry('Stand-in report').outcome, 'error:network');
  assert.equal(lastEntry().stage, 2);
  assert.equal(lastEntry().voice, 'Samantha Enhanced');
  spoken.at(-1).onstart(); spoken.at(-1).onend();
  await flush();
  window.dispatchEvent(new Event('online'));
  // The tally the report shows agrees with the log (which still holds lines
  // from the sections above — it is a ring of the last 20).
  const st = run('speechStats()');
  const done = run('speechLog()').filter(e => e.outcome !== 'pending');
  const count = pred => done.filter(pred).length;
  assert.equal(st.lines, done.length, 'all logged lines are settled');
  assert.equal(st.lines, logLen());
  assert.equal(st.ended, count(e => e.outcome === 'ended'));
  assert.equal(st.cut, count(e => e.outcome === 'cut'));
  assert.equal(st.dropped, count(e => e.outcome === 'dropped'));
  assert.equal(st.errors, count(e => /^error:/.test(e.outcome)));
  assert.equal(st.reread, count(e => e.stage === 1));
  assert.equal(st.fallbacks, count(e => e.stage === 2));
  assert.equal(st.started, count(e => e.startMs != null));
  assert.ok(st.dropped >= 1 && st.reread >= 1 && st.fallbacks >= 1 && st.errors >= 1 && st.cut >= 1 && st.ended >= 4);
  const starts = done.filter(e => e.startMs != null).map(e => e.startMs).sort((a, b) => a - b);
  assert.equal(st.startMedianMs, starts[Math.floor(starts.length / 2)]);
  assert.equal(st.startMaxMs, starts[starts.length - 1]);
  // No English voice at all: the line still gets a watchdog, settles as
  // "dropped" with nothing to retry, and the voice list stays untouched.
  const savedVoices = voices;
  voices = [];
  events.dispatchEvent(new Event('voiceschanged'));
  assert.equal(run('preferredVoice'), null);
  track(run('say("Voiceless")'), 'voiceless');
  assert.equal(spoken.at(-1).voice, undefined);
  assert.deepEqual(timerDelays(), [2500], 'watchdog armed without a voice');
  const before3 = spoken.length;
  fireWatchdogs(); fireDeferred();
  await flush();
  assert.equal(settled.at(-1), 'voiceless', 'settled, no hang');
  assert.equal(spoken.length, before3, 'nothing to retry with');
  assert.equal(lastEntry().outcome, 'dropped');
  assert.equal(lastEntry().voice, '');
  voices = savedVoices;
  events.dispatchEvent(new Event('voiceschanged'));
  // speechLog() hands out copies, and the buffer is capped.
  run('speechLog()[0].outcome = "tampered"');
  assert.notEqual(run('speechLog()[0].outcome'), 'tampered');
  for (let i = 0; i < 30; i++) { speak(`say("Filler ${i}")`); spoken.at(-1).onend(); }
  await flush();
  assert.equal(logLen(), 20, 'ring buffer keeps the last 20');
  assert.equal(lastEntry().text, 'Filler 29');

  // ---- Chime, then cheer ----
  run('setSpeechVoice("enhanced")');
  // happySound() is a 0.4 s arpeggio (beeps at 0, 0.1, 0.2 s; last one 0.2 s
  // long): a cheer spoken right after it waits for it to ring out.
  clockNow = 50000;
  run('happySound()');
  const n6 = spoken.length;
  track(run('say("Great job, Lawson!")'), 'after-chime');
  assert.equal(spoken.length, n6, 'cheer not spoken under the chime');
  assert.deepEqual(timerDelays(), [400], 'starts as the chime ends');
  fireWhere(t => t.ms === 400);
  assert.equal(spoken.length, n6 + 1);
  assert.equal(lastEntry().delayMs, 400, 'the wait shows in the diagnostics');
  spoken.at(-1).onstart(); spoken.at(-1).onend();
  await flush();
  assert.equal(settled.at(-1), 'after-chime');
  // Part-way through the chime: only the remainder.
  clockNow = 60000;
  run('buzzSound()');                // 0.18 s + 0.22 s at 0.1 s → 0.32 s
  clockNow = 60200;
  run('say("Try again!")');
  assert.deepEqual(timerDelays(), [120], 'remaining 120 ms of the buzz');
  fireWhere(t => t.ms === 120);
  spoken.at(-1).onstart(); spoken.at(-1).onend();
  await flush();
  // Chime long gone: spoken at once.
  clockNow = 70000;
  run('happySound()');
  clockNow = 71000;
  const n7 = spoken.length;
  run('say("Later")');
  assert.equal(spoken.length, n7 + 1, 'no wait once the chime is over');
  spoken.at(-1).onstart(); spoken.at(-1).onend();
  await flush();
  // A cut-off line and a chime: the longer of the two waits applies.
  clockNow = 80000;
  track(speak('say("In flight again")'), 'inflight2');
  run('happySound()');
  run('say("Cut and chimed")');
  assert.deepEqual(timerDelays(), [400], 'chime wait beats the 60 ms cut-off beat');
  fireWhere(t => t.ms === 400);
  spoken.at(-1).onstart(); spoken.at(-1).onend();
  await flush();
  // Capped: a long effect never holds a line back more than half a second.
  clockNow = 90000;
  run('beep(440, 2)');
  run('say("Capped")');
  assert.deepEqual(timerDelays(), [500]);
  fireWhere(t => t.ms === 500);
  spoken.at(-1).onstart(); spoken.at(-1).onend();
  await flush();
  // Sound effects muted: no chime plays, so no wait either.
  clockNow = 100000;
  run('setSoundMuted(true); happySound()');
  const n8 = spoken.length;
  run('say("Muted effects")');
  assert.equal(spoken.length, n8 + 1, 'nothing to wait for when effects are muted');
  spoken.at(-1).onstart(); spoken.at(-1).onend();
  await flush();
  run('setSoundMuted(false)');

  // ---- afterSpeech(): a line that starts during the beat is heard too ----
  run('setSpeechVoice("enhanced"); setSoundMuted(true)');   // no chime waits in this section
  timers.clear();
  let fired2 = 0;
  context.next2 = () => fired2++;
  clockNow = 200000;
  run('afterSpeech(next2, { minMs: 1000, beatMs: 500, maxMs: 6000 })');
  await flush();
  assert.deepEqual(timerDelays(), [1000], 'idle: the floor is armed');
  // "Sticker! ..." starts 300 ms in (as achievements.js now schedules it).
  clockNow = 200300;
  run('say("Sticker! Storyteller!")');
  const stickerLine = spoken.at(-1);
  stickerLine.onstart();
  clockNow = 201000;
  fireWhere(t => t.ms === 1000);       // the floor fires while the line is in flight
  assert.equal(fired2, 0, 'not fired over the announcement');
  assert.deepEqual(timerDelays(), [5000], 'only the ceiling remains, re-armed for the rest of the window');
  clockNow = 202500;
  stickerLine.onend();
  await flush();
  assert.deepEqual(timerDelays(), [500], 'one beat after the announcement');
  fireWhere(t => t.ms === 500);
  assert.equal(fired2, 1, 'fired once the announcement was heard');
  // The ceiling still bounds a line that never ends.
  fired2 = 0; clockNow = 300000;
  run('afterSpeech(next2, { minMs: 1000, beatMs: 500, maxMs: 6000 })');
  await flush();
  clockNow = 300300;
  run('say("Never ends")');
  spoken.at(-1).onstart();
  clockNow = 301000;
  fireWhere(t => t.ms === 1000);
  assert.equal(fired2, 0);
  clockNow = 306000;
  fireWhere(t => t.ms === 5000);       // the ceiling
  assert.equal(fired2, 1, 'ceiling fired despite the line still going');
  run('cancelSpeech()');
  await flush();
  assert.deepEqual(timerDelays(), [], 'nothing left armed');
  run('setSoundMuted(false)');

  // ---- Storyteller speed ----
  run('setSpeechVoice("enhanced"); setSoundMuted(true)');
  assert.equal(run('getSpeechSpeed()'), 'normal', 'normal by default');
  clockNow = 400000;
  speak('say("At normal speed", 0.9)');
  assert.equal(spoken.at(-1).rate, 0.9, 'a line keeps its own rate at normal speed');
  run('setSpeechSpeed("slower")');
  const sayEvents = [];
  const onSay = e => sayEvents.push(e.detail);
  window.addEventListener('lawson:say', onSay);
  speak('say("Slower now", 0.9)');
  assert.ok(Math.abs(spoken.at(-1).rate - 0.9 * 0.85) < 1e-9, 'slower multiplies the line rate');
  assert.ok(Math.abs(sayEvents.at(-1).rate - 0.9 * 0.85) < 1e-9, 'the caption event carries the effective rate');
  windowEvents.removeEventListener('lawson:say', onSay);
  assert.equal(stored.get('lawson:speechSpeed'), 'slower', 'saved on the device');
  run('setSpeechSpeed("faster")');
  speak('say("Faster now")');
  assert.ok(Math.abs(spoken.at(-1).rate - 0.95 * 1.15) < 1e-9);
  run('setSpeechSpeed("bogus")');
  assert.equal(run('getSpeechSpeed()'), 'faster', 'unknown speeds are ignored');
  speak('say("Way too fast", 3)');
  assert.equal(spoken.at(-1).rate, 1.6, 'clamped at the top');
  run('setSpeechSpeed("slower")');
  speak('say("Way too slow", 0.2)');
  assert.equal(spoken.at(-1).rate, 0.6, 'clamped at the bottom');
  // A fresh load reads the saved speed back.
  const fresh = vm.createContext({ window: { speechSynthesis: synth, AudioContext, addEventListener() {}, dispatchEvent() {} },
    document: { hidden: false, addEventListener() {} }, Event, CustomEvent, Date: { now: () => clockNow },
    SpeechSynthesisUtterance: function(text) { this.text = text; },
    localStorage: { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v) },
    setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {} });
  vm.runInContext(source, fresh);
  assert.equal(vm.runInContext('getSpeechSpeed()', fresh), 'slower', 'saved speed restored on load');
  stored.set('lawson:speechSpeed', 'nonsense');
  const fresh2 = vm.createContext({ window: { speechSynthesis: synth, AudioContext, addEventListener() {}, dispatchEvent() {} },
    document: { hidden: false, addEventListener() {} }, Event, CustomEvent, Date: { now: () => clockNow },
    SpeechSynthesisUtterance: function(text) { this.text = text; },
    localStorage: { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v) },
    setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {} });
  vm.runInContext(source, fresh2);
  assert.equal(vm.runInContext('getSpeechSpeed()', fresh2), 'normal', 'a bad saved value falls back to normal');
  run('setSpeechSpeed("normal"); setSoundMuted(false)');

  // ---- The kid's name, as the storyteller should say it ----
  run('setSpeechVoice("enhanced"); setSoundMuted(true)');
  const heard = [];
  const onSay2 = e => heard.push(e.detail);
  window.addEventListener('lawson:say', onSay2);
  clockNow = 500000;
  run('setSpokenName("Siobhan", "Shi-vawn")');
  speak('say("Great job, Siobhan! You found the cow!")');
  assert.equal(spoken.at(-1).text, 'Great job, Shi-vawn! You found the cow!', 'the engine gets the spoken form');
  assert.equal(heard.at(-1).text, 'Great job, Siobhan! You found the cow!', 'captions keep the written name');
  assert.equal(heard.at(-1).spoken, 'Great job, Shi-vawn! You found the cow!');
  assert.equal(stored.get('lawson:nameSpoken'), 'Shi-vawn', 'saved on the device');
  speak('say("Siobhan, Siobhan!")');
  assert.equal(spoken.at(-1).text, 'Shi-vawn, Shi-vawn!', 'every mention, including at the start');
  // Whole words only: a short name must not rewrite words that contain it.
  run('setSpokenName("Al", "Owl")');
  speak('say("Always fun, Al! Al\'s turn.")');
  assert.equal(spoken.at(-1).text, 'Always fun, Owl! Owl\'s turn.');
  // Punctuation in a name is taken literally.
  run('setSpokenName("D.J.", "Dee Jay")');
  speak('say("Go, D.J.!")');
  assert.equal(spoken.at(-1).text, 'Go, Dee Jay!');
  // Blank, or the same as written, means as written — and the saved form is cleared.
  run('setSpokenName("Siobhan", "")');
  speak('say("Hi, Siobhan!")');
  assert.equal(spoken.at(-1).text, 'Hi, Siobhan!');
  assert.equal(stored.get('lawson:nameSpoken'), undefined, 'cleared when blank');
  run('setSpokenName("Siobhan", "Siobhan")');
  speak('say("Hi, Siobhan!")');
  assert.equal(spoken.at(-1).text, 'Hi, Siobhan!');
  // Caption override still wins for the written side.
  run('setSpokenName("Siobhan", "Shi-vawn")');
  speak('say("Pop the en, Siobhan!", 0.95, "Pop the N, Siobhan!")');
  assert.equal(heard.at(-1).text, 'Pop the N, Siobhan!');
  assert.equal(spoken.at(-1).text, 'Pop the en, Shi-vawn!');
  // A fresh load restores the saved form (the app supplies the written name).
  const fresh3 = vm.createContext({ window: { speechSynthesis: synth, AudioContext, addEventListener() {}, dispatchEvent() {} },
    document: { hidden: false, addEventListener() {} }, Event, CustomEvent, Date: { now: () => clockNow },
    SpeechSynthesisUtterance: function(text) { this.text = text; },
    localStorage: { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v), removeItem: k => stored.delete(k) },
    setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {} });
  vm.runInContext(source, fresh3);
  assert.equal(vm.runInContext('getSpokenName()', fresh3), 'Shi-vawn', 'saved form restored on load');
  vm.runInContext('setSpokenName("Siobhan", getSpokenName())', fresh3);
  assert.equal(vm.runInContext('spokenForm("Bye, Siobhan!")', fresh3), 'Bye, Shi-vawn!');
  windowEvents.removeEventListener('lawson:say', onSay2);
  run('setSpokenName("", ""); setSoundMuted(false)');

  // ---- Prompts that repeat once ----
  run('setSpeechVoice("enhanced"); setSoundMuted(true); setSpeechSpeed("normal")');
  timers.clear();
  clockNow = 600000;
  const n9 = spoken.length;
  speak('sayPrompt("Find the cow!")');
  assert.equal(spoken.length, n9 + 1, 'prompt said at once');
  assert.deepEqual(timerDelays(), [12000], 'one reminder armed');
  spoken.at(-1).onend();
  await flush();
  fireWhere(t => t.ms === 12000);
  assert.equal(spoken.length, n9 + 2, 'said once more after the quiet spell');
  assert.equal(spoken.at(-1).text, 'Find the cow!');
  spoken.at(-1).onstart();
  assert.deepEqual(timerDelays(), [], 'the reminder itself arms no second reminder');
  spoken.at(-1).onend();
  await flush();
  // Anything else said meanwhile drops the reminder.
  const n10 = spoken.length;
  speak('sayPrompt("Find the pig!")');
  spoken.at(-1).onend(); await flush();
  speak('say("Great job!")');
  assert.deepEqual(timerDelays(), [], 'a later line dropped the reminder');
  spoken.at(-1).onend(); await flush();
  assert.equal(spoken.length, n10 + 2);
  // A newer prompt replaces the older reminder.
  speak('sayPrompt("Find the duck!")');
  spoken.at(-1).onend(); await flush();
  speak('sayPrompt("Find the hen!")');
  spoken.at(-1).onend(); await flush();
  assert.deepEqual(timerDelays(), [12000], 'only the newest prompt is armed');
  const n11 = spoken.length;
  fireWhere(t => t.ms === 12000);
  assert.equal(spoken.length, n11 + 1);
  assert.equal(spoken.at(-1).text, 'Find the hen!', 'the newest prompt is the one repeated');
  spoken.at(-1).onstart(); spoken.at(-1).onend(); await flush();
  // Leaving the screen (cancelSpeech) drops it; so does a screen lock.
  speak('sayPrompt("Find the sheep!")');
  spoken.at(-1).onend(); await flush();
  run('cancelPromptRepeat()');
  assert.deepEqual(timerDelays(), []);
  speak('sayPrompt("Find the goat!")');
  spoken.at(-1).onend(); await flush();
  run('cancelSpeech()');
  assert.deepEqual(timerDelays(), [], 'cancelSpeech drops the reminder');
  speak('sayPrompt("Find the frog!")');
  spoken.at(-1).onend(); await flush();
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.deepEqual(timerDelays(), [], 'hidden drops the reminder');
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  // Muted voice: nothing to remind with.
  run('setVoiceMuted(true)');
  const n12 = spoken.length;
  run('sayPrompt("Find the owl!")');
  fireWhere(t => t.ms === 12000);
  assert.equal(spoken.length, n12, 'muted: no utterance, no repeat');
  run('setVoiceMuted(false)');
  // Still talking when the quiet spell would end: no reminder over it.
  speak('sayPrompt("Find the bee!")');
  const bee = spoken.at(-1);
  const n13 = spoken.length;
  fireWhere(t => t.ms === 12000);
  assert.equal(spoken.length, n13, 'no reminder while the prompt itself is still going');
  bee.onend(); await flush();
  run('setSoundMuted(false)');

  console.log('PASS: delayed voices, natural pitch, local quality preference, saved choice, language, volume, mute, missing voice fallback, speech completion promise, caption event, hide/show lifecycle, unusable-voice fallback, speechDone, afterSpeech, swallowed utterances, speech diagnostics, chime then cheer, announcements wait their turn, storyteller speed, name sounds-like, prompt reminder');
})().catch(e => { console.error(e); process.exit(1); });
