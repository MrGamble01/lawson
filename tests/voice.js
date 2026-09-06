// Deterministic speech regression checks; no audio hardware required.
// Run: node tests/voice.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../lib/audio.js'), 'utf8');
const stored = new Map();
let voices = [], spoken = [], canceled = 0;
const events = new EventTarget();
const synth = { getVoices: () => voices, addEventListener: events.addEventListener.bind(events),
  speak: u => spoken.push(u), cancel: () => canceled++ };
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
const context = vm.createContext({ window, document, Event, CustomEvent,
  SpeechSynthesisUtterance: function(text) { this.text = text; },
  localStorage: { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v) },
  setInterval: () => ++intervalsStarted, clearInterval: () => intervalsCleared++ });
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

  console.log('PASS: delayed voices, natural pitch, local quality preference, saved choice, language, volume, mute, missing voice fallback, speech completion promise, caption event, hide/show lifecycle');
})().catch(e => { console.error(e); process.exit(1); });
