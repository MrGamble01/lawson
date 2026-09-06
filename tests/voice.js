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
class AudioContext {
  createGain() { return { gain: { value: 1 }, connect() {} }; }
}
const context = vm.createContext({ window: { speechSynthesis: synth, AudioContext,
  dispatchEvent() {} }, Event, SpeechSynthesisUtterance: function(text) { this.text = text; },
  localStorage: { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v) },
  setInterval: () => 1, clearInterval() {} });
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
  console.log('PASS: delayed voices, natural pitch, local quality preference, saved choice, language, volume, mute, missing voice fallback, speech completion promise');
})().catch(e => { console.error(e); process.exit(1); });
