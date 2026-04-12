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
  if (speechUnlocked || !synth) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  synth.speak(u);
  speechUnlocked = true;
}

// Speak a single phrase, ALWAYS clearing anything queued first.
// This is the fix for "click cow, hear frog" — old queue no longer leaks.
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

// Queue multiple phrases for counting (clears queue first, then enqueues all)
function sayCount(n, rate = 1.05) {
  if (!synth) return;
  synth.cancel();
  for (let i = 1; i <= n; i++) {
    const u = new SpeechSynthesisUtterance(String(i));
    u.rate = rate;
    u.pitch = 1.2;
    u.volume = 1;
    u.lang = "en-US";
    if (preferredVoice) u.voice = preferredVoice;
    synth.speak(u);
  }
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

function showBigDisplay(text, color = "#4dabf7") {
  const d = document.getElementById("bigDisplay");
  d.textContent = text;
  d.style.background = color;
  d.classList.remove("show");
  // force reflow so the animation restarts on repeated taps
  void d.offsetWidth;
  d.classList.add("show");
  setTimeout(() => d.classList.remove("show"), 800);
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
function buildLetters() {
  const stage = document.getElementById("stage");
  stage.innerHTML = "";
  LETTERS.forEach((ch) => {
    const el = document.createElement("button");
    el.className = "item";
    el.textContent = ch;
    el.style.setProperty("--c", `hsl(${Math.random() * 360}, 80%, 55%)`);
    onTap(el, (e) => {
      happySound();
      say(`${ch}. ${ch} is for ${letterWord(ch)}`);
      showBigDisplay(ch, el.style.getPropertyValue("--c"));
      const p = pointOf(e);
      sparkleAt(p.x, p.y);
    });
    stage.appendChild(el);
  });
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

function buildNumbers() {
  const stage = document.getElementById("stage");
  stage.innerHTML = "";
  NUMBERS.forEach((n) => {
    const el = document.createElement("button");
    el.className = "item";
    el.textContent = n;
    el.style.setProperty("--c", `hsl(${n * 36}, 80%, 55%)`);
    onTap(el, (e) => {
      happySound();
      sayCount(n);
      showBigDisplay(n, el.style.getPropertyValue("--c"));
      const p = pointOf(e);
      sparkleAt(p.x, p.y);
    });
    stage.appendChild(el);
  });
}

function buildColors() {
  const stage = document.getElementById("stage");
  stage.innerHTML = "";
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
  const stage = document.getElementById("stage");
  stage.innerHTML = "";
  SHAPES.forEach((s) => {
    const el = document.createElement("button");
    el.className = "item";
    el.textContent = s.emoji;
    el.style.setProperty("--c", `hsl(${Math.random() * 360}, 70%, 60%)`);
    onTap(el, (e) => {
      happySound();
      say(s.name);
      showBigDisplay(s.name, el.style.getPropertyValue("--c"));
      const p = pointOf(e);
      sparkleAt(p.x, p.y);
    });
    stage.appendChild(el);
  });
}

function buildAnimals() {
  const stage = document.getElementById("stage");
  stage.innerHTML = "";
  ANIMALS.forEach((a) => {
    const el = document.createElement("button");
    el.className = "item";
    el.textContent = a.emoji;
    el.style.setProperty("--c", `hsl(${Math.random() * 360}, 70%, 60%)`);
    onTap(el, (e) => {
      happySound();
      // Single utterance so queue can't leak between taps
      say(`${a.name}. ${a.sound}`);
      showBigDisplay(a.emoji, el.style.getPropertyValue("--c"));
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
function startPopGame() {
  const area = document.getElementById("popArea");
  area.innerHTML = "";

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
      const burst = document.createElement("div");
      burst.className = "burst";
      burst.textContent = "💥";
      burst.style.left = b.style.left;
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
  "🐶","🐱","🐮","🐷","🦆","🐑","🐴","🦁","🐸","🐵","🐘","🐝",
  "🍎","🍌","🍓","🍇","🍉","🥕","🌽",
  "⭐","❤️","🌈","☀️","🌙","⚽","🚗","🚂","✈️","🚀","🎈","🎁","🌸","🌼",
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

function newMatchRound() {
  const target = document.getElementById("matchTarget");
  const choices = document.getElementById("matchChoices");
  target.innerHTML = "";
  choices.innerHTML = "";

  const [answer, d1, d2] = pickRandom(MATCH_POOL, 3);
  const options = [answer, d1, d2].sort(() => Math.random() - 0.5);

  const targetEl = document.createElement("div");
  targetEl.className = "match-target-item";
  targetEl.textContent = answer;
  target.appendChild(targetEl);

  options.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.className = "match-choice";
    btn.textContent = emoji;
    onTap(btn, (e) => {
      if (emoji === answer) {
        happySound();
        say("Yay! Great job!");
        btn.classList.add("correct");
        const p = pointOf(e);
        sparkleAt(p.x, p.y);
        setTimeout(newMatchRound, 1400);
      } else {
        buzzSound();
        say("Try again");
        btn.classList.add("wrong");
        setTimeout(() => btn.classList.remove("wrong"), 500);
      }
    });
    choices.appendChild(btn);
  });
}

function startMatchGame() {
  newMatchRound();
  // Prompt
  setTimeout(() => say("Find the match!"), 200);
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
    if (synth) synth.cancel();
    show("menu");
    beep(400, 0.1);
  });
});

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
