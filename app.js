// ---------- Persistent settings ----------
const LS = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (_) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  },
};
let muted = LS.get("lawson.muted", false);

// ---------- Speech ----------
const synth = window.speechSynthesis;
let speechUnlocked = false;
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
}

function unlockSpeech() {
  if (!synth) return;
  // On iOS the speech engine can go silent after a period of inactivity.
  // Nudging it with a near-silent utterance inside a real user gesture keeps
  // it alive. Safe to call every navigation.
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0.01;
    synth.speak(u);
  } catch (_) {}
  speechUnlocked = true;
}

// Speak a single phrase, ALWAYS clearing anything queued first.
// This is the fix for "click cow, hear frog" — old queue no longer leaks.
function say(text, rate = 0.95) {
  if (!synth) return;
  synth.cancel();
  if (muted) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = 1.15;
  u.volume = 1;
  u.lang = "en-US";
  if (preferredVoice) u.voice = preferredVoice;
  synth.speak(u);
}

// ---------- Simple sounds via Web Audio ----------
// Lazy-init so modern browsers don't warn about AudioContext created
// before a user gesture. Created on the first call to unlockAudio / beep.
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx && AudioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function unlockAudio() {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "suspended") ctx.resume();
}

function beep(freq = 440, dur = 0.15, type = "sine", when = 0) {
  if (muted) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (_) {}
}

// Short haptic tick on supported devices (Android). Silent on iOS.
// Gated on `muted` so "quiet mode" also means "don't buzz".
function vibrate(ms) {
  if (muted) return;
  try { navigator.vibrate && navigator.vibrate(ms); } catch (_) {}
}

// ---------- Shared reverb bus ----------
// Synthesized impulse-response convolver that other instruments can
// send wet signal to. Built once, on demand, the first time any
// instrument asks for it.
let reverbInput = null;
function ensureReverb() {
  const ctx = getAudioCtx();
  if (!ctx || reverbInput) return;
  try {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 1.8); // ~1.8s tail
    const impulse = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // Exponentially decaying white noise
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
      }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.3;
    convolver.connect(wetGain).connect(ctx.destination);
    reverbInput = convolver;
  } catch (_) {}
}

// ---------- Mallet / bell instrument ----------
// Additive synthesis: a stack of sine partials at inharmonic ratios, each
// with its own quick attack and exponential decay. Sounds much closer to
// a real bell/xylophone than a single triangle wave. Also sends ~35%
// through the reverb bus for that "in-a-room" quality.
const BELL_PARTIALS = [
  { ratio: 1.0,   amp: 1.0,  decay: 1.0  },
  { ratio: 2.0,   amp: 0.5,  decay: 0.7  },
  { ratio: 3.01,  amp: 0.25, decay: 0.45 },
  { ratio: 4.2,   amp: 0.12, decay: 0.3  },
];
function playBell(freq, dur = 1.3, vol = 0.3) {
  if (muted) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  ensureReverb();
  try {
    const t = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = vol;
    master.connect(ctx.destination);
    if (reverbInput) {
      const send = ctx.createGain();
      send.gain.value = 0.35;
      master.connect(send).connect(reverbInput);
    }
    for (const p of BELL_PARTIALS) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * p.ratio;
      const g = ctx.createGain();
      const pDur = dur * p.decay;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(p.amp, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + pDur);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + pDur + 0.1);
    }
  } catch (_) {}
}

// Pleasant ascending chime (C-E-G) — bell tones for a warmer sound
function happySound() {
  playBell(523.25, 0.9, 0.28);
  setTimeout(() => playBell(659.25, 0.9,  0.28), 90);
  setTimeout(() => playBell(783.99, 1.1,  0.32), 180);
}

function buzzSound() {
  beep(180, 0.18, "square", 0);
  beep(140, 0.22, "square", 0.1);
}

// Bigger, more triumphant arpeggio for milestones and splash-to-menu
function cheerJingle() {
  // C-E-G-C major arpeggio, now using bell instrument
  playBell(523.25, 0.9, 0.3);
  setTimeout(() => playBell(659.25,  0.9,  0.3),  110);
  setTimeout(() => playBell(783.99,  1.0,  0.3),  220);
  setTimeout(() => playBell(1046.50, 1.3,  0.34), 330);
  // A sparkle on top for a little extra magic
  setTimeout(() => playBell(1318.51, 1.0,  0.22), 500);
}

// ---------- Mute toggle ----------
function updateMuteButton() {
  const btn = document.getElementById("muteBtn");
  if (!btn) return;
  btn.textContent = muted ? "🔇" : "🔊";
  btn.setAttribute("aria-label", muted ? "Unmute sounds" : "Mute sounds");
  btn.setAttribute("aria-pressed", muted ? "true" : "false");
}
function toggleMute() {
  muted = !muted;
  LS.set("lawson.muted", muted);
  if (muted && synth) synth.cancel();
  updateMuteButton();
}

// ---------- Screens ----------
// Screens overlap in the layout; we toggle a single `.active` class and
// let CSS handle the opacity/scale transition.
const screens = document.querySelectorAll(".screen");
function show(id) {
  screens.forEach((s) => s.classList.toggle("active", s.id === id));
}

// ---------- Confetti particle system ----------
// Canvas-based physics confetti. Shared by match wins, count wins and
// milestone cheers. Runs a RAF loop only while particles are alive.
class Confetti {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:55";
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.particles = [];
    this.running = false;
    this.colors = [
      "#ff4081", "#4dabf7", "#ffd43b", "#69db7c",
      "#845ec2", "#ff9500", "#20c997", "#ff6b6b",
    ];
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.canvas.style.width = this.w + "px";
    this.canvas.style.height = this.h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  burst(x, y, count = 40, power = 1) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (4 + Math.random() * 8) * power;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 4 * power,
        gravity: 0.35,
        drag: 0.992,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        size: 5 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.35,
        life: 0,
        maxLife: 110 + Math.random() * 80,
      });
    }
    if (!this.running) this.loop();
  }
  loop() {
    this.running = true;
    const tick = () => {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      this.particles = this.particles.filter((p) => {
        p.life += 1;
        if (p.life > p.maxLife || p.y > this.h + 40) return false;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.rot += p.vrot;
        const alpha = Math.max(0, 1 - (p.life / p.maxLife));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        // Rectangle strip that looks like real paper confetti
        ctx.fillRect(-p.size / 2, -p.size * 0.75, p.size, p.size * 1.5);
        ctx.restore();
        return true;
      });
      if (this.particles.length > 0) {
        requestAnimationFrame(tick);
      } else {
        this.running = false;
        ctx.clearRect(0, 0, this.w, this.h);
      }
    };
    requestAnimationFrame(tick);
  }
}
const confetti = new Confetti();

// ---------- Milestone cheer overlay ----------
// Full-screen celebration: mascot bounces in, banner shows, confetti
// bursts from a few spots. Auto-hides after ~1.8s.
const CHEER_MESSAGES = [
  "Great Job!", "Amazing!", "Wow!", "Woohoo!", "You rock!", "Super Star!",
];
let cheerHideTimer = null;
function triggerCheer(message) {
  const overlay = document.getElementById("cheerOverlay");
  if (!overlay) return;
  const text =
    message || CHEER_MESSAGES[Math.floor(Math.random() * CHEER_MESSAGES.length)];
  overlay.querySelector("#cheerText").textContent = text;
  overlay.classList.remove("show");
  void overlay.offsetWidth; // restart the CSS animation on repeat fires
  overlay.classList.add("show");

  cheerJingle();
  say(text);
  vibrate(80);

  // Fire a few confetti bursts across the top of the screen
  const w = window.innerWidth;
  const h = window.innerHeight;
  confetti.burst(w * 0.5, h * 0.35, 70, 1.2);
  setTimeout(() => confetti.burst(w * 0.2, h * 0.4, 45), 180);
  setTimeout(() => confetti.burst(w * 0.8, h * 0.4, 45), 360);

  clearTimeout(cheerHideTimer);
  cheerHideTimer = setTimeout(() => overlay.classList.remove("show"), 1800);
}

// ---------- Data ----------
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = Array.from({ length: 10 }, (_, i) => i + 1);
const COLORS = [
  { name: "Red",    hex: "#ff5252" },
  { name: "Orange", hex: "#ff9800" },
  { name: "Yellow", hex: "#ffeb3b" },
  { name: "Green",  hex: "#4caf50" },
  { name: "Blue",   hex: "#2196f3" },
  { name: "Purple", hex: "#9c27b0" },
  { name: "Pink",   hex: "#ff4081" },
  { name: "Brown",  hex: "#795548" },
];
const SHAPES = [
  { name: "Circle",   emoji: "⭕" },
  { name: "Square",   emoji: "🟦" },
  { name: "Triangle", emoji: "🔺" },
  { name: "Star",     emoji: "⭐" },
  { name: "Heart",    emoji: "❤️" },
  { name: "Diamond",  emoji: "🔷" },
];
const ANIMALS = [
  { name: "Dog",     emoji: "🐶", sound: "Woof woof!" },
  { name: "Cat",     emoji: "🐱", sound: "Meow!" },
  { name: "Cow",     emoji: "🐮", sound: "Moo!" },
  { name: "Pig",     emoji: "🐷", sound: "Oink oink!" },
  { name: "Duck",    emoji: "🦆", sound: "Quack quack!" },
  { name: "Sheep",   emoji: "🐑", sound: "Baa!" },
  { name: "Horse",   emoji: "🐴", sound: "Neigh!" },
  { name: "Lion",    emoji: "🦁", sound: "Roar!" },
  { name: "Frog",    emoji: "🐸", sound: "Ribbit!" },
  { name: "Monkey",  emoji: "🐵", sound: "Ooh ooh ah ah!" },
  { name: "Elephant",emoji: "🐘", sound: "Toot!" },
  { name: "Bee",     emoji: "🐝", sound: "Buzz buzz!" },
];

// ---------- Helpers ----------
function sparkleAt(x, y) {
  const emojis = ["✨", "⭐", "🎉", "💖", "🌟"];
  for (let i = 0; i < 8; i++) {
    const s = document.createElement("div");
    s.className = "sparkle";
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.left = x + "px";
    s.style.top = y + "px";
    const angle = (Math.PI * 2 * i) / 8;
    s.style.setProperty("--dx", Math.cos(angle) * 120 + "px");
    s.style.setProperty("--dy", Math.sin(angle) * 120 + "px");
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
}

// Turn any CSS color into a usable hex for mixing. Only the common
// hsl(...) / hex strings that we actually produce in this app.
function cssColorToRgb(color) {
  if (!color) return [77, 171, 247];
  const m = color.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const h = color.match(/hsl\(\s*([\d.]+),?\s*([\d.]+)%,?\s*([\d.]+)%/);
  if (h) return hslToRgb(+h[1], +h[2] / 100, +h[3] / 100);
  return [77, 171, 247];
}
function hslToRgb(h, s, l) {
  h /= 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function showBigDisplay(text, color = "#4dabf7", caption = "") {
  const d = document.getElementById("bigDisplay");
  const [r, g, b] = cssColorToRgb(color);
  // Radial gradient: vivid color in center, darker at edges so white text pops
  d.style.background = `radial-gradient(circle at center, rgba(${r},${g},${b},0.95) 0%, rgba(${Math.round(r*0.35)},${Math.round(g*0.35)},${Math.round(b*0.35)},0.95) 100%)`;
  d.innerHTML = "";
  const main = document.createElement("div");
  main.textContent = text;
  d.appendChild(main);
  if (caption) {
    const cap = document.createElement("div");
    cap.className = "big-caption";
    cap.textContent = caption;
    d.appendChild(cap);
  }
  d.classList.remove("show");
  // force reflow so the animation restarts on repeated taps
  void d.offsetWidth;
  d.classList.add("show");
  clearTimeout(showBigDisplay._t);
  showBigDisplay._t = setTimeout(() => d.classList.remove("show"), 650);
}

// Get point from click or touch event
function pointOf(e) {
  if (e.clientX != null) return { x: e.clientX, y: e.clientY };
  const t = e.changedTouches && e.changedTouches[0];
  if (t) return { x: t.clientX, y: t.clientY };
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

// Attach a tap handler that works reliably on iOS (touchend fires first, click fallback)
function onTap(el, fn) {
  let handled = false;
  el.addEventListener("touchend", (e) => {
    e.preventDefault();
    handled = true;
    fn(e);
    setTimeout(() => { handled = false; }, 400);
  }, { passive: false });
  el.addEventListener("click", (e) => {
    if (handled) return;
    fn(e);
  });
}

// ---------- Build activity screens ----------
function resetStage() {
  const stage = document.getElementById("stage");
  stage.innerHTML = "";
  stage.className = "stage";
  return stage;
}

function buildLetters() {
  const stage = resetStage();
  stage.classList.add("stage--many");
  LETTERS.forEach((ch) => {
    const el = document.createElement("button");
    el.className = "item";
    el.textContent = ch;
    el.style.setProperty("--c", `hsl(${Math.random() * 360}, 80%, 55%)`);
    onTap(el, (e) => {
      happySound();
      // iOS Safari mangles single-letter utterances — use phonetic spelling
      // and a single short sentence so it's read reliably.
      say(`${letterSound(ch)}, ${letterWord(ch)}`);
      showBigDisplay(ch, el.style.getPropertyValue("--c"), letterWord(ch));
      const p = pointOf(e);
      sparkleAt(p.x, p.y);
    });
    stage.appendChild(el);
  });
}

// Phonetic letter names so iOS TTS pronounces them correctly every time
function letterSound(ch) {
  const sounds = {
    A: "ay",   B: "bee",  C: "see",  D: "dee",  E: "ee",   F: "eff",
    G: "jee",  H: "aitch",I: "eye",  J: "jay",  K: "kay",  L: "el",
    M: "em",   N: "en",   O: "oh",   P: "pee",  Q: "cue",  R: "are",
    S: "ess",  T: "tee",  U: "you",  V: "vee",  W: "double you",
    X: "ex",   Y: "why",  Z: "zee",
  };
  return sounds[ch] || ch;
}

function letterWord(ch) {
  const words = {
    A: "Apple", B: "Ball", C: "Cat", D: "Dog", E: "Egg", F: "Fish",
    G: "Goat", H: "Hat", I: "Ice", J: "Juice", K: "Kite", L: "Lion",
    M: "Moon", N: "Nest", O: "Orange", P: "Pig", Q: "Queen", R: "Rabbit",
    S: "Sun", T: "Tree", U: "Umbrella", V: "Van", W: "Water", X: "Xylophone",
    Y: "Yo-yo", Z: "Zebra",
  };
  return words[ch] || ch;
}

const NUMBER_WORDS = {
  1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
  6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
};
function buildNumbers() {
  const stage = resetStage();
  NUMBERS.forEach((n) => {
    const el = document.createElement("button");
    el.className = "item";
    el.textContent = n;
    el.style.setProperty("--c", `hsl(${n * 36}, 80%, 55%)`);
    onTap(el, (e) => {
      happySound();
      say(NUMBER_WORDS[n]);
      showBigDisplay(n, el.style.getPropertyValue("--c"), NUMBER_WORDS[n]);
      const p = pointOf(e);
      sparkleAt(p.x, p.y);
    });
    stage.appendChild(el);
  });
}

function buildColors() {
  const stage = resetStage();
  COLORS.forEach((c) => {
    const el = document.createElement("button");
    el.className = "item";
    el.style.background = c.hex;
    el.style.setProperty("--c", c.hex);
    el.textContent = "";
    onTap(el, (e) => {
      happySound();
      say(c.name);
      showBigDisplay(c.name, c.hex);
      const p = pointOf(e);
      sparkleAt(p.x, p.y);
    });
    stage.appendChild(el);
  });
}

function buildShapes() {
  const stage = resetStage();
  SHAPES.forEach((s) => {
    const el = document.createElement("button");
    el.className = "item";
    el.textContent = s.emoji;
    el.style.setProperty("--c", `hsl(${Math.random() * 360}, 70%, 60%)`);
    onTap(el, (e) => {
      happySound();
      say(s.name);
      showBigDisplay(s.emoji, el.style.getPropertyValue("--c"), s.name);
      const p = pointOf(e);
      sparkleAt(p.x, p.y);
    });
    stage.appendChild(el);
  });
}

function buildAnimals() {
  const stage = resetStage();
  ANIMALS.forEach((a) => {
    const el = document.createElement("button");
    el.className = "item";
    el.textContent = a.emoji;
    el.style.setProperty("--c", `hsl(${Math.random() * 360}, 70%, 60%)`);
    onTap(el, (e) => {
      happySound();
      say(`${a.name}. ${a.sound}`);
      showBigDisplay(a.emoji, el.style.getPropertyValue("--c"), a.name);
      const p = pointOf(e);
      sparkleAt(p.x, p.y);
    });
    stage.appendChild(el);
  });
}

// ---------- Balloon pop game ----------
const BALLOON_COLORS = [
  { name: "Red",    hex: "#ff3b30" },
  { name: "Orange", hex: "#ff9500" },
  { name: "Yellow", hex: "#ffd60a" },
  { name: "Green",  hex: "#34c759" },
  { name: "Blue",   hex: "#007aff" },
  { name: "Purple", hex: "#af52de" },
  { name: "Pink",   hex: "#ff2d92" },
];

let popTimer = null;
let popScore = 0;
function bumpBadge(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val;
  const badge = el.closest(".badge");
  if (badge) {
    badge.classList.remove("bump");
    void badge.offsetWidth;
    badge.classList.add("bump");
  }
}
function startPopGame() {
  const area = document.getElementById("popArea");
  area.innerHTML = "";
  popScore = 0;
  document.getElementById("popScoreVal").textContent = "0";

  const spawn = () => {
    // Pick a real color and draw an SVG balloon in that exact color,
    // so the spoken color always matches what the kid sees.
    const c = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    const b = document.createElement("div");
    b.className = "balloon";
    b.innerHTML = `
      <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="50" cy="55" rx="42" ry="50" fill="${c.hex}"/>
        <ellipse cx="36" cy="38" rx="10" ry="16" fill="rgba(255,255,255,0.5)"/>
        <polygon points="46,104 54,104 50,112" fill="${c.hex}"/>
        <path d="M50 112 Q56 124 48 134 Q42 140 50 140" stroke="#555" stroke-width="2" fill="none"/>
      </svg>
    `;
    b.style.left = Math.random() * 80 + 10 + "%";
    b.style.top = "110%";
    const dur = 5 + Math.random() * 4;
    b.style.animationDuration = dur + "s";

    onTap(b, (e) => {
      if (e.stopPropagation) e.stopPropagation();
      beep(300 + Math.random() * 400, 0.15, "triangle");
      say(c.name);
      popScore += 1;
      bumpBadge("popScoreVal", popScore);
      // Every 10 pops: big celebration
      if (popScore % 10 === 0) {
        triggerCheer(`${popScore} Pops!`);
      }
      const burst = document.createElement("div");
      burst.className = "burst";
      burst.textContent = "💥";
      // Use getBoundingClientRect so the burst appears where the balloon
      // actually is on screen (accounting for its CSS float animation)
      const r = b.getBoundingClientRect();
      const ar = area.getBoundingClientRect();
      burst.style.top = (r.top - ar.top) + "px";
      burst.style.left = (r.left - ar.left) + "px";
      area.appendChild(burst);
      setTimeout(() => burst.remove(), 500);
      b.remove();
    });
    area.appendChild(b);
    setTimeout(() => { if (b.parentNode) b.remove(); }, dur * 1000);
  };

  popTimer = setInterval(spawn, 1100);
  spawn(); spawn(); spawn();
}
function stopPopGame() {
  clearInterval(popTimer);
  popTimer = null;
  document.getElementById("popArea").innerHTML = "";
}

// ---------- Matching game ----------
// "Find the match": show one target up top, show 3 choices below,
// he taps the one that matches. Age-appropriate for 2-3.
const MATCH_POOL = [
  { emoji: "🐶", name: "dog" },
  { emoji: "🐱", name: "cat" },
  { emoji: "🐮", name: "cow" },
  { emoji: "🐷", name: "pig" },
  { emoji: "🦆", name: "duck" },
  { emoji: "🐑", name: "sheep" },
  { emoji: "🐴", name: "horse" },
  { emoji: "🦁", name: "lion" },
  { emoji: "🐸", name: "frog" },
  { emoji: "🐵", name: "monkey" },
  { emoji: "🐘", name: "elephant" },
  { emoji: "🐝", name: "bee" },
  { emoji: "🍎", name: "apple" },
  { emoji: "🍌", name: "banana" },
  { emoji: "🍓", name: "strawberry" },
  { emoji: "🍇", name: "grapes" },
  { emoji: "🍉", name: "watermelon" },
  { emoji: "🥕", name: "carrot" },
  { emoji: "🌽", name: "corn" },
  { emoji: "⭐", name: "star" },
  { emoji: "❤️", name: "heart" },
  { emoji: "🌈", name: "rainbow" },
  { emoji: "☀️", name: "sun" },
  { emoji: "🌙", name: "moon" },
  { emoji: "⚽", name: "ball" },
  { emoji: "🚗", name: "car" },
  { emoji: "🚂", name: "train" },
  { emoji: "✈️", name: "plane" },
  { emoji: "🚀", name: "rocket" },
  { emoji: "🎈", name: "balloon" },
  { emoji: "🎁", name: "present" },
  { emoji: "🌸", name: "flower" },
];

function pickRandom(arr, n) {
  const copy = arr.slice();
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

let matchScore = 0;
let matchRoundTimer = null;
const CHEER_PHRASES = ["Yay! Great job!", "You got it!", "Awesome!", "Super!", "Nice one!"];

function newMatchRound(speakPrompt = true) {
  const target = document.getElementById("matchTarget");
  const choices = document.getElementById("matchChoices");
  target.innerHTML = "";
  choices.innerHTML = "";

  // Start with 3 choices; bump to 4 once the kid is comfortable.
  const numChoices = matchScore < 10 ? 3 : 4;
  const picked = pickRandom(MATCH_POOL, numChoices);
  const answer = picked[0];
  const options = picked.slice().sort(() => Math.random() - 0.5);

  const targetEl = document.createElement("div");
  targetEl.className = "match-target-item";
  targetEl.textContent = answer.emoji;
  // Tap target to re-speak the hint
  onTap(targetEl, () => say(`Find the ${answer.name}`));
  target.appendChild(targetEl);

  // Voice prompt tells the kid what to look for
  if (speakPrompt) {
    say(`Find the ${answer.name}`);
  }

  options.forEach((item) => {
    const btn = document.createElement("button");
    btn.className = "match-choice";
    btn.textContent = item.emoji;
    onTap(btn, (e) => {
      if (item.emoji === answer.emoji) {
        happySound();
        vibrate(50);
        matchScore += 1;
        bumpBadge("matchScoreVal", matchScore);
        const isMilestone = matchScore % 5 === 0;
        btn.classList.add("correct");
        const p = pointOf(e);
        sparkleAt(p.x, p.y);
        confetti.burst(p.x, p.y, 30);
        if (isMilestone) {
          triggerCheer(`${matchScore} in a row!`);
        } else {
          say(CHEER_PHRASES[Math.floor(Math.random() * CHEER_PHRASES.length)]);
        }
        clearTimeout(matchRoundTimer);
        matchRoundTimer = setTimeout(() => newMatchRound(true), isMilestone ? 2100 : 1300);
      } else {
        buzzSound();
        say(`Find the ${answer.name}`);
        btn.classList.add("wrong");
        setTimeout(() => btn.classList.remove("wrong"), 500);
      }
    });
    choices.appendChild(btn);
  });
}

function startMatchGame() {
  matchScore = 0;
  document.getElementById("matchScoreVal").textContent = "0";
  newMatchRound(true);
}
function stopMatchGame() {
  clearTimeout(matchRoundTimer);
  matchRoundTimer = null;
}

// ---------- Music / xylophone ----------
// Wire up the keys once; they live in the HTML, not generated per visit.
// Each key plays a real mallet/bell tone through the reverb bus.
function initMusicGame() {
  document.querySelectorAll("#xylophone .xkey").forEach((key) => {
    onTap(key, () => {
      const freq = parseFloat(key.dataset.freq);
      playBell(freq, 1.6, 0.32);
      key.classList.add("playing");
      setTimeout(() => key.classList.remove("playing"), 220);
      vibrate(20);
    });
  });
}

// ---------- Counting game ----------
// Show N of the same item (1-5). Tap each one and the app counts aloud.
// Teaches the *act* of counting, which the static 123 tiles don't.
const COUNT_POOL = [
  { emoji: "🍎", singular: "apple",      plural: "apples" },
  { emoji: "🍌", singular: "banana",     plural: "bananas" },
  { emoji: "🍓", singular: "strawberry", plural: "strawberries" },
  { emoji: "⭐", singular: "star",       plural: "stars" },
  { emoji: "🎈", singular: "balloon",    plural: "balloons" },
  { emoji: "🐟", singular: "fish",       plural: "fish" },
  { emoji: "🌸", singular: "flower",     plural: "flowers" },
  { emoji: "🍇", singular: "grape",      plural: "grapes" },
  { emoji: "🐞", singular: "bug",        plural: "bugs" },
];

let countScore = 0;
let countTimer = null;

function newCountRound() {
  const wrap = document.getElementById("countItems");
  const prompt = document.getElementById("countPrompt");
  wrap.innerHTML = "";

  const subject = COUNT_POOL[Math.floor(Math.random() * COUNT_POOL.length)];
  const total = 1 + Math.floor(Math.random() * 5); // 1-5 items
  let counted = 0;

  const label = total === 1 ? subject.singular : subject.plural;
  prompt.textContent = `Count the ${label}!`;
  say(`Count the ${label}`);

  for (let i = 0; i < total; i++) {
    const el = document.createElement("button");
    el.className = "count-item";
    el.textContent = subject.emoji;
    onTap(el, (e) => {
      if (el.classList.contains("counted")) return;
      counted += 1;
      el.classList.add("counted");
      say(NUMBER_WORDS[counted]);
      // Each count a semitone higher so it's pleasantly ascending
      beep(330 + counted * 55, 0.12, "triangle");
      vibrate(30);
      const p = pointOf(e);
      sparkleAt(p.x, p.y);

      if (counted === total) {
        countScore += 1;
        bumpBadge("countScoreVal", countScore);
        confetti.burst(window.innerWidth / 2, window.innerHeight * 0.45, 55);
        clearTimeout(countTimer);
        const isMilestone = countScore % 3 === 0;
        countTimer = setTimeout(() => {
          if (isMilestone) {
            triggerCheer(`${countScore} Rounds!`);
            countTimer = setTimeout(newCountRound, 2300);
          } else {
            happySound();
            say(`${NUMBER_WORDS[total]} ${label}!`);
            countTimer = setTimeout(newCountRound, 1700);
          }
        }, 600);
      }
    });
    wrap.appendChild(el);
  }
}

function startCountGame() {
  countScore = 0;
  document.getElementById("countScoreVal").textContent = "0";
  newCountRound();
}
function stopCountGame() {
  clearTimeout(countTimer);
  countTimer = null;
}

// ---------- Routing ----------
document.querySelectorAll("[data-go]").forEach((btn) => {
  onTap(btn, () => {
    unlockAudio();
    unlockSpeech();
    const where = btn.dataset.go;
    beep(600, 0.1);
    if (where === "pop") {
      show("popGame");
      startPopGame();
      return;
    }
    if (where === "match") {
      show("matchGame");
      startMatchGame();
      return;
    }
    if (where === "music") {
      show("musicGame");
      return;
    }
    if (where === "count") {
      show("countGame");
      startCountGame();
      return;
    }
    show("activity");
    if (where === "letters") buildLetters();
    if (where === "numbers") buildNumbers();
    if (where === "colors") buildColors();
    if (where === "shapes") buildShapes();
    if (where === "animals") buildAnimals();
  });
});

document.querySelectorAll("[data-home]").forEach((btn) => {
  onTap(btn, () => {
    stopPopGame();
    stopMatchGame();
    stopCountGame();
    if (synth) synth.cancel();
    show("menu");
    beep(400, 0.1);
  });
});

// Attach one-time handlers to the xylophone keys
initMusicGame();

// Splash screen: any tap unlocks audio and slides into the menu with a
// cheerful welcome chord. Pointer-events are already gated by the
// screen-transition CSS, so this only fires while splash is active.
const splashScreen = document.getElementById("splash");
if (splashScreen) {
  onTap(splashScreen, () => {
    unlockAudio();
    unlockSpeech();
    cheerJingle();
    show("menu");
  });
}

// Wire up the mute button (exists in the header on every screen)
const muteBtn = document.getElementById("muteBtn");
if (muteBtn) {
  updateMuteButton();
  onTap(muteBtn, () => {
    unlockAudio();
    toggleMute();
    // Give a tiny click so you can feel the button — but only if we just unmuted
    if (!muted) beep(600, 0.08);
  });
}

// Block iOS long-press context menu (kids love to hold things down)
document.addEventListener("contextmenu", (e) => e.preventDefault());

// Prevent multi-touch pinch-zoom gestures on iOS (belt-and-braces with viewport meta)
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("touchmove", (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// Unlock audio + speech on the very first user interaction anywhere
function firstUnlock() {
  unlockAudio();
  unlockSpeech();
  document.removeEventListener("touchstart", firstUnlock);
  document.removeEventListener("click", firstUnlock);
}
document.addEventListener("touchstart", firstUnlock, { passive: true });
document.addEventListener("click", firstUnlock);
