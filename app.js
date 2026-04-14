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
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioCtx();

function unlockAudio() {
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function beep(freq = 440, dur = 0.15, type = "sine", when = 0) {
  if (muted) return;
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
const screens = document.querySelectorAll(".screen");
function show(id) {
  screens.forEach((s) => s.classList.toggle("active", s.id === id));
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
        matchScore += 1;
        bumpBadge("matchScoreVal", matchScore);
        // Every 5: big celebration
        if (matchScore % 5 === 0) {
          say(`${CHEER_PHRASES[Math.floor(Math.random() * CHEER_PHRASES.length)]} ${matchScore} in a row!`);
        } else {
          say(CHEER_PHRASES[Math.floor(Math.random() * CHEER_PHRASES.length)]);
        }
        btn.classList.add("correct");
        const p = pointOf(e);
        sparkleAt(p.x, p.y);
        clearTimeout(matchRoundTimer);
        matchRoundTimer = setTimeout(() => newMatchRound(true), 1300);
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
    if (synth) synth.cancel();
    show("menu");
    beep(400, 0.1);
  });
});

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
