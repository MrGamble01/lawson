// ---------- Speech ----------
// Text-to-speech wrapper that picks a friendly voice and always cancels the
// previous utterance, so taps in fast succession don't queue up.
const synth = window.speechSynthesis;
let preferredVoice = null;

function pickVoice() {
  if (!synth) return;
  const voices = synth.getVoices();
  if (!voices.length) return;
  // Prefer a clear English female voice; iOS has "Samantha", "Karen", "Moira"
  const prefs = ["Samantha", "Karen", "Moira", "Google US English", "Microsoft Zira"];
  for (const p of prefs) {
    const v = voices.find((x) => x.name.includes(p));
    if (v) { preferredVoice = v; return; }
  }
  preferredVoice = voices.find((v) => v.lang && v.lang.startsWith("en")) || voices[0];
}
if (synth) {
  pickVoice();
  synth.onvoiceschanged = pickVoice;
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
  if (!synth) return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0.01;
    synth.speak(u);
  } catch (_) {}
}

function say(text, rate = 0.95) {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = 1.15;
  u.volume = 1;
  u.lang = "en-US";
  if (preferredVoice) u.voice = preferredVoice;
  synth.speak(u);
}

// ---------- Simple sounds via Web Audio ----------
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioCtx();

function unlockAudio() {
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function beep(freq = 440, dur = 0.15, type = "sine", when = 0) {
  try {
    const t = audioCtx.currentTime + when;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (_) {}
}

// Pleasant ascending chime (C-E-G), not three simultaneous beeps
function happySound() {
  beep(523.25, 0.12, "triangle", 0);
  beep(659.25, 0.12, "triangle", 0.1);
  beep(783.99, 0.2,  "triangle", 0.2);
}

function buzzSound() {
  beep(180, 0.18, "square", 0);
  beep(140, 0.22, "square", 0.1);
}
