// ---------- Speech ----------
// iOS Safari quirks:
//  - speechSynthesis.speak() must be called synchronously inside a user gesture
//  - Queued utterances DO work if all queued in the same gesture tick
//  - cancel() can break the next speak() on iOS, so we avoid cancel() mid-flow
const synth = window.speechSynthesis;
let speechUnlocked = false;

function unlockSpeech() {
  if (speechUnlocked || !synth) return;
  // Silent utterance inside a user gesture unlocks iOS speech engine
  const u = new SpeechSynthesisUtterance("");
  u.volume = 0;
  synth.speak(u);
  speechUnlocked = true;
}

function say(text, rate = 0.9) {
  if (!synth) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = 1.2;
  u.volume = 1;
  u.lang = "en-US";
  synth.speak(u);
}

// Queue multiple phrases in one gesture — required for iOS Safari to play them all
function sayQueue(phrases, rate = 1) {
  if (!synth) return;
  phrases.forEach((p) => say(p, rate));
}

// ---------- Simple beep/pop sounds via Web Audio ----------
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioCtx();

function unlockAudio() {
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function beep(freq = 440, dur = 0.15, type = "sine") {
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0.2;
    o.connect(g).connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur);
  } catch (_) {}
}
function happySound() {
  beep(523, 0.12);
  beep(659, 0.12);
  beep(784, 0.18);
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
      // Queue the whole count in one gesture so iOS plays all of it
      const phrases = [];
      for (let i = 1; i <= n; i++) phrases.push(String(i));
      sayQueue(phrases, 1);
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
      sayQueue([a.name, a.sound], 1);
      showBigDisplay(a.emoji, el.style.getPropertyValue("--c"));
      const p = pointOf(e);
      sparkleAt(p.x, p.y);
    });
    stage.appendChild(el);
  });
}

// ---------- Balloon pop game ----------
let popTimer = null;
function startPopGame() {
  const area = document.getElementById("popArea");
  area.innerHTML = "";
  const balloons = ["🎈", "🎈", "🎈", "🌟", "🎁", "🧸", "🍎", "🍌", "🍭"];
  const colors = ["red","blue","green","purple","pink","orange","yellow"];

  const spawn = () => {
    const b = document.createElement("div");
    b.className = "balloon";
    b.textContent = balloons[Math.floor(Math.random() * balloons.length)];
    b.style.left = Math.random() * 80 + 10 + "%";
    b.style.top = "110%";
    const dur = 4 + Math.random() * 4;
    b.style.animationDuration = dur + "s";
    const color = colors[Math.floor(Math.random() * colors.length)];
    onTap(b, (e) => {
      if (e.stopPropagation) e.stopPropagation();
      beep(200 + Math.random() * 600, 0.2, "triangle");
      say(color, 1.2);
      const burst = document.createElement("div");
      burst.className = "burst";
      burst.textContent = "💥";
      burst.style.left = b.style.left;
      burst.style.top = b.offsetTop + "px";
      area.appendChild(burst);
      setTimeout(() => burst.remove(), 500);
      b.remove();
    });
    area.appendChild(b);
    setTimeout(() => { if (b.parentNode) b.remove(); }, dur * 1000);
  };

  popTimer = setInterval(spawn, 900);
  // spawn a few immediately
  spawn(); spawn(); spawn();
}
function stopPopGame() {
  clearInterval(popTimer);
  popTimer = null;
  document.getElementById("popArea").innerHTML = "";
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
