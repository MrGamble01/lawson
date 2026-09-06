// ---------- Speech ----------
// Text-to-speech wrapper that picks a friendly voice and always cancels the
// previous utterance, so taps in fast succession don't queue up.
const synth = window.speechSynthesis;
let preferredVoice = null;
let savedVoiceURI = "";
try { savedVoiceURI = localStorage.getItem("lawson:voice") || ""; } catch (_) {}

function availableVoices() {
  return synth ? synth.getVoices().filter(v => /^en(?:[-_]|$)/i.test(v.lang)) : [];
}
function setSpeechVoice(uri) {
  savedVoiceURI = uri;
  try { localStorage.setItem("lawson:voice", uri); } catch (_) {}
  pickVoice();
}

// Independent mute switches for voice (TTS) and sound effects (beeps,
// chimes, piano notes). Both are persisted so settings stick across
// reloads. Parents toggle these from the Settings panel.
let _voiceMuted = false;
let _soundMuted = false;
try { _voiceMuted = localStorage.getItem("lawson:muteVoice") === "1"; } catch (_) {}
try { _soundMuted = localStorage.getItem("lawson:muteSound") === "1"; } catch (_) {}

function setVoiceMuted(v) {
  _voiceMuted = !!v;
  try { localStorage.setItem("lawson:muteVoice", _voiceMuted ? "1" : "0"); } catch (_) {}
  if (_voiceMuted && synth) synth.cancel();
}
function setSoundMuted(v) {
  _soundMuted = !!v;
  try { localStorage.setItem("lawson:muteSound", _soundMuted ? "1" : "0"); } catch (_) {}
}
function isVoiceMuted() { return _voiceMuted; }
function isSoundMuted() { return _soundMuted; }

// Vibration haptic. iOS Safari ignores `navigator.vibrate`; Android
// Chrome respects it. Always safe to call — failures are swallowed.
// Respects the sound-effects mute so toggling everything off really
// silences (and stills) the device.
function haptic(pattern) {
  if (_soundMuted) return;
  try {
    if (navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch (_) {}
}

// ---------- Gentle ambient music ----------
// Soft pentatonic loop synthesized live with Web Audio. Pentatonic
// notes never clash with each other, sine + triangle keeps the timbre
// warm, slow envelope keeps it ambient. Tied to a setting (default
// off) so parents who don't want background music aren't surprised.
let _musicEnabled = false;
let _musicTimer = null;
try { _musicEnabled = localStorage.getItem("lawson:music") === "1"; } catch (_) {}

// One 8-second phrase. [freq, when_s, duration_s, gain]
const _MUSIC_PHRASE = [
  // Melody (sine, upper register)
  [523.25, 0.0, 1.4, 0.05],   // C5
  [659.25, 1.0, 1.4, 0.05],   // E5
  [783.99, 2.0, 1.4, 0.05],   // G5
  [659.25, 3.0, 1.4, 0.05],   // E5
  [587.33, 4.0, 1.4, 0.05],   // D5
  [698.46, 5.0, 1.4, 0.05],   // F5
  [880.00, 6.0, 1.4, 0.05],   // A5
  [783.99, 7.0, 1.4, 0.05],   // G5
];
const _MUSIC_BASS = [
  // Slow bass drone (triangle, low register)
  [130.81, 0.0, 4.2, 0.03],   // C3
  [196.00, 4.0, 4.2, 0.03],   // G3
];
const _MUSIC_LOOP_S = 8;

function _playMusicNote(freq, when, dur, gain, type) {
  try {
    const ctx = audioCtx;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.4);
    g.gain.linearRampToValueAtTime(gain * 0.7, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch (_) {}
}

function _scheduleMusicBar() {
  if (!_musicEnabled || _soundMuted) return;
  _MUSIC_PHRASE.forEach(([f, w, d, g]) => _playMusicNote(f, w, d, g, "sine"));
  _MUSIC_BASS.forEach(  ([f, w, d, g]) => _playMusicNote(f, w, d, g, "triangle"));
}

function startMusic() {
  if (_musicTimer || !_musicEnabled || _soundMuted) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  _scheduleMusicBar();
  _musicTimer = setInterval(_scheduleMusicBar, _MUSIC_LOOP_S * 1000);
}
function stopMusic() {
  if (_musicTimer) clearInterval(_musicTimer);
  _musicTimer = null;
}
function setMusicEnabled(on) {
  _musicEnabled = !!on;
  try { localStorage.setItem("lawson:music", _musicEnabled ? "1" : "0"); } catch (_) {}
  if (_musicEnabled) startMusic();
  else stopMusic();
}
function isMusicEnabled() { return _musicEnabled; }

function pickVoice() {
  if (!synth) return;
  const voices = availableVoices();
  // Prefer downloaded voices so prompts remain available during offline play.
  // Quality labels are hints supplied by the device, not guaranteed features.
  const score = v => (v.localService ? 100 : 0) +
    (/premium|enhanced|natural/i.test(v.name) ? 30 : 0) +
    (/^en[-_]US$/i.test(v.lang) ? 10 : 0) +
    (/Samantha|Ava|Zoe|Google US English|Aria|Jenny/i.test(v.name) ? 5 : 0);
  preferredVoice = voices.find(v => v.voiceURI === savedVoiceURI) ||
    voices.slice().sort((a, b) => score(b) - score(a))[0] || null;
  window.dispatchEvent(new Event("lawson:voiceschanged"));
}
if (synth) {
  pickVoice();
  synth.addEventListener("voiceschanged", pickVoice);
  // iOS Safari sometimes returns an empty voices list for a while after
  // load; nudge it a few times so we still pick a nice voice without
  // waiting for the first tap.
  let tries = 0;
  const tick = setInterval(() => {
    if (preferredVoice || tries++ > 10) return clearInterval(tick);
    pickVoice();
  }, 250);
}

// On iOS the speech engine can go silent after a period of inactivity.
// Nudging it with a near-silent utterance inside a real user gesture keeps
// it alive. Safe to call on every navigation.
function unlockSpeech() {
  if (!synth || _voiceMuted || getVolume() === 0) return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    synth.speak(u);
  } catch (_) {}
}

function say(text, rate = 0.95) {
  if (!synth || _voiceMuted || getVolume() === 0) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = 1;
  u.volume = getVolume();
  u.lang = preferredVoice ? preferredVoice.lang : "en-US";
  if (preferredVoice) u.voice = preferredVoice;
  synth.speak(u);
}

// ---------- Simple sounds via Web Audio ----------
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioCtx();

// Master gain: every sound (beeps, ambient music, piano) routes through
// this single node before the speakers, so the Settings volume slider is
// one knob for the whole app. 0..1; default 1 (unchanged loudness).
const masterGain = audioCtx.createGain();
let _volume = 1;
try {
  const stored = localStorage.getItem("lawson:volume");
  if (stored !== null) _volume = Math.max(0, Math.min(1, parseFloat(stored) || 0));
} catch (_) {}
masterGain.gain.value = _volume;
masterGain.connect(audioCtx.destination);

function setVolume(v) {
  _volume = Math.max(0, Math.min(1, Number(v) || 0));
  if (_volume === 0 && synth) synth.cancel();
  try { masterGain.gain.value = _volume; } catch (_) {}
  try { localStorage.setItem("lawson:volume", String(_volume)); } catch (_) {}
}
function getVolume() { return _volume; }

function unlockAudio() {
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function beep(freq = 440, dur = 0.15, type = "sine", when = 0) {
  if (_soundMuted) return;
  try {
    const t = audioCtx.currentTime + when;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(masterGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (_) {}
}

// Pleasant ascending chime (C-E-G), not three simultaneous beeps
function happySound() {
  beep(523.25, 0.12, "triangle", 0);
  beep(659.25, 0.12, "triangle", 0.1);
  beep(783.99, 0.2,  "triangle", 0.2);
  haptic(15);
}

function buzzSound() {
  beep(180, 0.18, "square", 0);
  beep(140, 0.22, "square", 0.1);
  haptic([20, 40, 20]);
}

// Sticker unlock jingle — distinct from happySound. Four-note
// arpeggio up to C6 so it reads as "unlock", not "correct answer".
function stickerJingle() {
  beep(523.25, 0.10, "triangle", 0);     // C5
  beep(659.25, 0.10, "triangle", 0.08);  // E5
  beep(783.99, 0.10, "triangle", 0.16);  // G5
  beep(1046.50, 0.22, "triangle", 0.24); // C6
  haptic([10, 30, 10, 30, 25]);
}
