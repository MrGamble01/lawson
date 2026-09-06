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
console.log('PASS: delayed voices, natural pitch, local quality preference, saved choice, language, volume, mute, missing voice fallback');
