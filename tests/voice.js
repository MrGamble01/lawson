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
const fireTimers = () => { const due = [...timers.values()]; timers.clear(); due.forEach(fn => fn()); };
const context = vm.createContext({ window, document, Event, CustomEvent,
  SpeechSynthesisUtterance: function(text) { this.text = text; },
  localStorage: { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v) },
  setInterval: () => ++intervalsStarted, clearInterval: () => intervalsCleared++,
  setTimeout: (fn) => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id) });
const run = s => vm.runInContext(s, context);
run(source);
run('say("Hello")');
assert.equal(spoken.at(-1).lang, 'en-US');
voices = [
  { name: 'French', lang: 'fr-FR', voiceURI: 'fr', localService: true },
  { name: 'Samantha', lang: 'en-US', voiceURI: 'basic', localService: true },
  { name: 'Samantha Enhanced', lang: 'en-US', voiceURI: 'enhanced', localService: true },
  { name: 'Natural Online', lang: 'en-US', voiceURI: 'online', localService: false },
  { name: 'Karen', lang: 'en-AU', voiceURI: 'au', localService: true }
];
events.dispatchEvent(new Event('voiceschanged'));
run('say("Hello")');
assert.equal(spoken.at(-1).voice.voiceURI, 'enhanced');
assert.equal(spoken.at(-1).pitch, 1);
run('setSpeechVoice("au"); setVolume(0.4); say("Hello")');
assert.equal(spoken.at(-1).lang, 'en-AU');
assert.equal(spoken.at(-1).volume, 0.4);
assert.equal(stored.get('lawson:voice'), 'au');
voices = voices.filter(v => v.voiceURI !== 'au');
events.dispatchEvent(new Event('voiceschanged'));
run('say("Hello")');
assert.equal(spoken.at(-1).voice.voiceURI, 'enhanced');
assert.equal(stored.get('lawson:voice'), 'au'); // don't erase temporarily unavailable choice
const count = spoken.length;
run('setVoiceMuted(true); say("Quiet"); unlockSpeech()');
assert.equal(spoken.length, count);
run('setVoiceMuted(false); setVolume(0); say("Quiet"); unlockSpeech()');
assert.equal(spoken.length, count);
assert.ok(canceled > 0);

// Every line is announced to the app (captions + screen-reader live
// region) before the mute check, so muted play still gets the words.
const said = [];
window.addEventListener('lawson:say', e => said.push(e.detail.text));
run('setVoiceMuted(false); setVolume(1); say("Captioned")');
assert.deepEqual(said, ['Captioned']);
run('setVoiceMuted(true); say("Muted but captioned")');
assert.equal(said.at(-1), 'Muted but captioned');
run('setVoiceMuted(false); setVolume(0); say("Silent but captioned")');
assert.equal(said.at(-1), 'Silent but captioned');
run('setVolume(1)');
// A pronunciation spelling for the engine ("en") is captioned as written ("N").
run('say("Pop the en!", 0.95, "Pop the N!")');
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
  track(run('say("Quiet")'), 'muted');
  await flush();
  assert.deepEqual(settled, ['muted']);
  run('setVoiceMuted(false)');
  // Pending until the engine says the line ended.
  track(run('say("First line")'), 'first');
  await flush();
  assert.deepEqual(settled, ['muted']);
  spoken.at(-1).onend();
  await flush();
  assert.deepEqual(settled, ['muted', 'first']);
  // A later say() cuts the previous line short and releases its waiter,
  // even if the engine never fires end/error for the cancelled utterance.
  track(run('say("Second line")'), 'second');
  const second = spoken.at(-1);
  track(run('say("Third line")'), 'third');
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
  track(run('say("Fourth line")'), 'fourth');
  run('setVoiceMuted(true)');
  await flush();
  assert.deepEqual(settled.at(-1), 'fourth');
  run('setVoiceMuted(false)');
  track(run('say("Fifth line")'), 'fifth');
  run('setVolume(0)');
  await flush();
  assert.deepEqual(settled.at(-1), 'fifth');
  run('setVolume(1)');
  track(run('say("Sixth line")'), 'sixth');
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
  track(run('say("Once upon a time")'), 'story');
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
  track(run('say("Should not be heard")'), 'behind-lock');
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
  run('say("After a phone call")');
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
  track(run('say("Local line")'), 'local');
  assert.equal(spoken.at(-1).voice.voiceURI, 'enhanced');
  assert.equal(timers.size, 0, 'no start watchdog for a local voice');
  spoken.at(-1).onerror({ error: 'interrupted' });
  await flush();
  assert.equal(settled.at(-1), 'local');
  assert.equal(spoken.length, local + 1, 'no retry for an interruption');
  assert.equal(run('speechFallback()'), null);
  // Parent chose the online voice; the iPad is offline: `network` error.
  run('setSpeechVoice("online")');
  track(run('say("Once upon a time")'), 'online-1');
  const first = spoken.at(-1);
  assert.equal(first.voice.voiceURI, 'online');
  assert.equal(timers.size, 1, 'start watchdog armed for an online voice');
  first.onstart();
  assert.equal(timers.size, 0, 'watchdog cleared once speech starts');
  voiceChanges.length = 0;
  first.onerror({ error: 'network' });
  await flush();
  assert.notEqual(settled.at(-1), 'online-1', 'line still pending while the fallback reads it');
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
  run('say("Next line")');
  assert.equal(spoken.at(-1).voice.voiceURI, 'enhanced');
  assert.equal(timers.size, 0);
  assert.equal(stored.get('lawson:voice'), 'online', 'saved choice untouched');
  // Back online: the chosen voice is tried again.
  window.dispatchEvent(new Event('online'));
  assert.equal(run('speechFallback()'), null);
  run('say("Reconnected")');
  assert.equal(spoken.at(-1).voice.voiceURI, 'online');
  // ...but this time it silently never starts: the watchdog fires,
  // the hung utterance is cancelled, and its late "interrupted" error
  // must not end the line the fallback is now reading.
  const hung = spoken.at(-1);
  track(run('say("Hanging line")'), 'hung');
  const hung2 = spoken.at(-1);
  const cancelsBefore = canceled;
  fireTimers();
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
  track(run('say("Echo line")'), 'echo');
  const echo = spoken.at(-1);
  assert.equal(echo.voice.voiceURI, 'online');
  onCancel = () => echo.onerror({ error: 'interrupted' });
  echo.onerror({ error: 'network' });
  onCancel = null;
  await flush();
  const echoRetry = spoken.at(-1);
  assert.equal(echoRetry.voice.voiceURI, 'enhanced');
  assert.notEqual(settled.at(-1), 'echo', 'synchronous echo did not settle the line');
  echoRetry.onend();
  await flush();
  assert.equal(settled.at(-1), 'echo');
  // A failure that arrives after a newer line cut this one off: no retry,
  // no mark against the voice.
  window.dispatchEvent(new Event('online'));
  track(run('say("Cut off")'), 'cut');
  const cut = spoken.at(-1);
  assert.equal(cut.voice.voiceURI, 'online');
  track(run('say("Newer")'), 'newer');
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
  track(run('say("Alone")'), 'alone');
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
  const sd = run('say("Sticker! Storyteller!")');
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

  console.log('PASS: delayed voices, natural pitch, local quality preference, saved choice, language, volume, mute, missing voice fallback, speech completion promise, caption event, hide/show lifecycle, unusable-voice fallback, speechDone');
})().catch(e => { console.error(e); process.exit(1); });
