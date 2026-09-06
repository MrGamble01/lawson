// ---------- Speech ----------
// Text-to-speech wrapper that picks a friendly voice and always cancels the
// previous utterance, so taps in fast succession don't queue up.
const synth = window.speechSynthesis;
let preferredVoice = null;
let savedVoiceURI = "";
try { savedVoiceURI = localStorage.getItem("lawson:voice") || ""; } catch (_) {}
// A voice that couldn't speak this session: an online voice with no
// connection, or one the device has dropped. pickVoice() skips it so the
// storyteller carries on with the best local voice, until the network
// comes back, the voice list changes, or the parent picks it on purpose.
let unusableVoiceURI = "";

function availableVoices() {
  return synth ? synth.getVoices().filter(v => /^en(?:[-_]|$)/i.test(v.lang)) : [];
}
function setSpeechVoice(uri) {
  savedVoiceURI = uri;
  try { localStorage.setItem("lawson:voice", uri); } catch (_) {}
  if (uri && uri === unusableVoiceURI) unusableVoiceURI = ""; // chosen again: give it another go
  pickVoice();
}
function markVoiceUnusable(uri) {
  if (!uri || uri === unusableVoiceURI) return;
  unusableVoiceURI = uri;
  pickVoice(); // also tells Settings, via lawson:voiceschanged, that the voice swapped
}
function forgetUnusableVoice() {
  if (!unusableVoiceURI) return;
  unusableVoiceURI = "";
  pickVoice();
}
// { failed, using } while the storyteller is standing in for a voice that
// can't speak right now; null otherwise.
function speechFallback() {
  if (!unusableVoiceURI || !preferredVoice || preferredVoice.voiceURI === unusableVoiceURI) return null;
  const failed = availableVoices().find(v => v.voiceURI === unusableVoiceURI);
  return failed ? { failed, using: preferredVoice } : null;
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
  if (_voiceMuted) cancelSpeech();
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
  if (_musicTimer || !_musicEnabled || _soundMuted || _hidden) return;
  unlockAudio();
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
  const ranked = voices.slice().sort((a, b) => score(b) - score(a));
  const usable = v => v.voiceURI !== unusableVoiceURI;
  const saved = voices.find(v => v.voiceURI === savedVoiceURI);
  preferredVoice = (saved && usable(saved) ? saved : null) || ranked.find(usable) || ranked[0] || null;
  window.dispatchEvent(new Event("lawson:voiceschanged"));
}
if (synth) {
  pickVoice();
  // A changed voice list (a download finished, iOS finally listing them)
  // and a restored connection are both reasons to try a failed voice again.
  synth.addEventListener("voiceschanged", () => { unusableVoiceURI = ""; pickVoice(); });
  window.addEventListener("online", forgetUnusableVoice);
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

// The line currently being spoken, so whoever is waiting on it can be
// told when it finishes or gets cut off. Only one utterance is ever live
// because say() cancels the previous one.
let _settleSpeech = null;
// The promise of the most recent line, for code that didn't call say()
// itself but wants to wait for whatever is being said right now (e.g. a
// sticker announcement fired by a shared helper). Already resolved when
// nothing is in flight.
let _speechDone = Promise.resolve();
function speechDone() { return _speechDone; }

// Run `fn` once the storyteller has finished whatever it is saying, plus
// a beat — the "cheer, then next round" sequencing every quiz game
// needs. Any line that starts meanwhile ("New best!", a sticker) is
// waited for too. Never sooner than `minMs` after the call, so the kid
// still sees the result with the voice muted, and never later than
// `maxMs`, so an engine that goes quiet can't stall a game. Returns a
// cancel function for the game's stop().
function afterSpeech(fn, opts) {
  const { beatMs = 500, minMs = 1200, maxMs = 6000 } = opts || {};
  const started = Date.now();
  let done = false;
  let timer = setTimeout(fire, maxMs);
  function fire() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    fn();
  }
  function idle() {
    const line = _speechDone;
    return line.then(() => (_speechDone === line ? undefined : idle()));
  }
  idle().then(() => {
    if (done) return;
    clearTimeout(timer);
    timer = setTimeout(fire, Math.max(beatMs, minMs - (Date.now() - started)));
  });
  return () => { done = true; clearTimeout(timer); };
}

// Stop whatever is being said and release anyone awaiting it. Browsers
// usually fire `end`/`error` on cancel, but iOS sometimes fires nothing,
// so the waiter is settled here explicitly.
function cancelSpeech() {
  if (synth) synth.cancel();
  const settle = _settleSpeech;
  _settleSpeech = null;
  if (settle) settle();
}

// Speak `text`, cutting off anything still being said. Returns a promise
// that resolves once the line has actually been spoken — or straight
// away when nothing will be spoken (no engine, voice muted, volume 0) —
// and also when a later say() or cancelSpeech() interrupts it, so a game
// pacing itself on narration never stalls.
// Utterance errors that mean "this voice can't speak right now", as
// opposed to "the line was cut off" (interrupted, canceled) or "the line
// itself was bad" (text-too-long, invalid-argument, not-allowed). An
// online voice on an offline iPad reports `network` — when it reports
// anything at all: often it just never starts, hence the watchdog.
const RETRYABLE_SPEECH_ERRORS =
  /^(network|synthesis-failed|synthesis-unavailable|voice-unavailable|language-unavailable|audio-busy|audio-hardware)$/;
const SPEECH_START_TIMEOUT_MS = 4000;

// `caption` is the written form when `text` is spelled for the speech
// engine (e.g. "en" so iOS says the letter N) — captions show "N".
function say(text, rate = 0.95, caption) {
  if (_hidden) return Promise.resolve();
  // Tell the app what's about to be said (captions + screen-reader live
  // region) even when the voice is muted — that's when text matters most.
  if (typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent("lawson:say", {
      detail: { text: String(caption != null ? caption : text), spoken: String(text), rate },
    }));
  }
  if (!synth || _voiceMuted || getVolume() === 0) return Promise.resolve();
  cancelSpeech();
  recoverSpeech();
  _speechDone = new Promise((resolve) => {
    let watchdog = null;
    let attempt = 0;
    const settle = () => {
      clearTimeout(watchdog);
      watchdog = null;
      if (_settleSpeech === settle) _settleSpeech = null;
      resolve();
    };
    _settleSpeech = settle;

    // Speak the line with `voice`. If the voice can't (error or never
    // starting), mark it unusable and read the line again, once, with
    // whatever pickVoice() now prefers. Events from an attempt that has
    // been superseded — or from a line that a later say() cut off — are
    // ignored, so a hung utterance being cancelled can't end the retry.
    const speakWith = (voice, isRetry) => {
      const mine = ++attempt;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      u.pitch = 1;
      u.volume = getVolume();
      u.lang = voice ? voice.lang : "en-US";
      if (voice) u.voice = voice;
      const fail = (code) => {
        if (mine !== attempt) return;
        clearTimeout(watchdog);
        watchdog = null;
        if (_settleSpeech !== settle) return settle();
        if (!isRetry && voice && RETRYABLE_SPEECH_ERRORS.test(code)) {
          markVoiceUnusable(voice.voiceURI);
          if (preferredVoice && preferredVoice.voiceURI !== voice.voiceURI) {
            attempt += 1; // this attempt is over: cancel() may echo an "interrupted" error at once
            try { synth.cancel(); } catch (_) {} // clear the hung/failed utterance
            return speakWith(preferredVoice, true);
          }
        }
        settle();
      };
      u.onstart = () => { if (mine === attempt) { clearTimeout(watchdog); watchdog = null; } };
      u.onend = () => { if (mine === attempt) settle(); };
      u.onerror = (e) => fail(e && e.error);
      // Local voices start at once; only a remote one can silently hang.
      if (voice && !voice.localService) watchdog = setTimeout(() => fail("network"), SPEECH_START_TIMEOUT_MS);
      synth.speak(u);
    };
    speakWith(preferredVoice, false);
  });
  return _speechDone;
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
  if (_volume === 0) cancelSpeech();
  try { masterGain.gain.value = _volume; } catch (_) {}
  try { localStorage.setItem("lawson:volume", String(_volume)); } catch (_) {}
}
function getVolume() { return _volume; }

// The context starts "suspended" until the first user gesture, and on
// iOS goes "interrupted" after a phone call, Siri, an alarm or a screen
// lock. Either way every beep is silently dropped until resume() is
// called, so wake it from any state that isn't running.
function unlockAudio() {
  if (audioCtx.state === "running" || audioCtx.state === "closed") return;
  try {
    const p = audioCtx.resume();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch (_) {}
}

// ---------- App lifecycle ----------
// Hidden (home button, app switch, screen lock): go quiet. The storyteller
// must not keep narrating behind a locked screen, and the menu music loop
// would otherwise keep scheduling notes into a frozen tab. Visible again:
// recover the engines. iOS leaves speechSynthesis stuck `paused` after a
// lock or an interruption — every later speak() then queues silently —
// and leaves the AudioContext "interrupted". Games that care (Story
// Time) listen for the two lawson:audio* events.
let _hidden = typeof document !== "undefined" && !!document.hidden;
let _musicWasPlaying = false;
function isAudioHidden() { return _hidden; }

// A speech engine left paused swallows everything. Only ever resumes;
// pausing is never something this app does.
function recoverSpeech() {
  if (!synth || !synth.paused) return;
  try { synth.resume(); } catch (_) {}
}

function _audioHidden() {
  if (_hidden) return;
  _hidden = true;
  _musicWasPlaying = !!_musicTimer;
  cancelSpeech();
  stopMusic();
  window.dispatchEvent(new Event("lawson:audiohidden"));
}
function _audioVisible() {
  if (!_hidden) return;
  _hidden = false;
  recoverSpeech();
  unlockAudio();
  if (_musicWasPlaying) startMusic();
  _musicWasPlaying = false;
  window.dispatchEvent(new Event("lawson:audiovisible"));
}
if (typeof document !== "undefined" && document.addEventListener) {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) _audioHidden(); else _audioVisible();
  });
  // Older iOS fires pagehide/pageshow for the app switcher and screen
  // lock more reliably than visibilitychange; the _hidden flag makes
  // the pair idempotent when both arrive.
  window.addEventListener("pagehide", _audioHidden);
  window.addEventListener("pageshow", _audioVisible);
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
