// ---------- Screens ----------
const screens = document.querySelectorAll(".screen");
function show(id) {
  screens.forEach((s) => s.classList.toggle("active", s.id === id));
}

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

// Badge bump helper (shared by games)
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

// ---------- Flashcard activities ----------
// Letters / Numbers / Colors / Shapes / Animals all share the same shape:
// a grid of tappable items that play a sound, speak a phrase, and pop up a
// big visual display when tapped. Each activity just supplies its data and
// a few small functions for label / spoken text / display.
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

// Phonetic letter names so iOS TTS pronounces them correctly every time
const LETTER_SOUND = {
  A: "ay",   B: "bee",  C: "see",  D: "dee",  E: "ee",   F: "eff",
  G: "jee",  H: "aitch",I: "eye",  J: "jay",  K: "kay",  L: "el",
  M: "em",   N: "en",   O: "oh",   P: "pee",  Q: "cue",  R: "are",
  S: "ess",  T: "tee",  U: "you",  V: "vee",  W: "double you",
  X: "ex",   Y: "why",  Z: "zee",
};
const LETTER_WORD = {
  A: "Apple", B: "Ball", C: "Cat", D: "Dog", E: "Egg", F: "Fish",
  G: "Goat", H: "Hat", I: "Ice", J: "Juice", K: "Kite", L: "Lion",
  M: "Moon", N: "Nest", O: "Orange", P: "Pig", Q: "Queen", R: "Rabbit",
  S: "Sun", T: "Tree", U: "Umbrella", V: "Van", W: "Water", X: "Xylophone",
  Y: "Yo-yo", Z: "Zebra",
};
const NUMBER_WORD = {
  1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
  6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
};

const ACTIVITIES = {
  letters: {
    items: LETTERS,
    many: true,
    color: () => `hsl(${Math.random() * 360}, 80%, 55%)`,
    label: (ch) => ch,
    speak: (ch) => `${LETTER_SOUND[ch]}, ${LETTER_WORD[ch]}`,
    display: (ch, c) => ({ text: ch, color: c, caption: LETTER_WORD[ch] }),
  },
  numbers: {
    items: NUMBERS,
    color: (n) => `hsl(${n * 36}, 80%, 55%)`,
    label: (n) => n,
    speak: (n) => NUMBER_WORD[n],
    display: (n, c) => ({ text: n, color: c, caption: NUMBER_WORD[n] }),
  },
  colors: {
    items: COLORS,
    color: (c) => c.hex,
    background: (c) => c.hex,
    label: () => "",
    speak: (c) => c.name,
    display: (c) => ({ text: c.name, color: c.hex, caption: "" }),
  },
  shapes: {
    items: SHAPES,
    color: () => `hsl(${Math.random() * 360}, 70%, 60%)`,
    label: (s) => s.emoji,
    speak: (s) => s.name,
    display: (s, c) => ({ text: s.emoji, color: c, caption: s.name }),
  },
  animals: {
    items: ANIMALS,
    color: () => `hsl(${Math.random() * 360}, 70%, 60%)`,
    label: (a) => a.emoji,
    speak: (a) => `${a.name}. ${a.sound}`,
    display: (a, c) => ({ text: a.emoji, color: c, caption: a.name }),
  },
};

function buildFlashcards(name) {
  const cfg = ACTIVITIES[name];
  if (!cfg) return;
  const stage = document.getElementById("stage");
  stage.innerHTML = "";
  stage.className = "stage" + (cfg.many ? " stage--many" : "");

  cfg.items.forEach((item, i) => {
    const el = document.createElement("button");
    el.className = "item";
    el.textContent = cfg.label(item, i);
    const c = cfg.color(item, i);
    el.style.setProperty("--c", c);
    if (cfg.background) el.style.background = cfg.background(item);
    onTap(el, (e) => {
      happySound();
      say(cfg.speak(item));
      const d = cfg.display(item, c);
      showBigDisplay(d.text, d.color, d.caption);
      const p = pointOf(e);
      sparkleAt(p.x, p.y);
    });
    stage.appendChild(el);
  });
}

// ---------- Shared namespace for game modules ----------
// Each game file in /games registers itself on window.Lawson.games and uses
// the utilities below. Keeping each game self-contained makes it easy to
// tweak one without touching the others.
window.Lawson = {
  say, beep, happySound, buzzSound, sparkleAt, onTap, pointOf, bumpBadge, show,
  audioCtx, unlockAudio,
  getHighScore, setHighScore, bumpHighScore,
  games: {}, // each game adds { screen, start, stop } here
};

// ---------- Routing ----------
let activeGame = null;
function leaveActiveGame() {
  if (activeGame && typeof activeGame.stop === "function") activeGame.stop();
  activeGame = null;
}

document.querySelectorAll("[data-go]").forEach((btn) => {
  onTap(btn, () => {
    unlockAudio();
    unlockSpeech();
    const where = btn.dataset.go;
    beep(600, 0.1);

    leaveActiveGame();

    const game = window.Lawson.games[where];
    if (game) {
      show(game.screen);
      activeGame = game;
      game.start();
      return;
    }

    if (ACTIVITIES[where]) {
      show("activity");
      buildFlashcards(where);
    }
  });
});

document.querySelectorAll("[data-home]").forEach((btn) => {
  onTap(btn, () => {
    leaveActiveGame();
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
