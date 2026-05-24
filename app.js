// ---------- Kid personalization ----------
// Used in cheers and milestone celebrations across games. Editable from
// the Settings panel and persisted in localStorage so a sibling can take
// over with no code changes.
const DEFAULT_KID_NAME = "Lawson";
let KID_NAME = (function () {
  try {
    const stored = localStorage.getItem("lawson:kidName");
    return (stored && stored.trim()) || DEFAULT_KID_NAME;
  } catch (_) { return DEFAULT_KID_NAME; }
})();
function setKidName(name) {
  KID_NAME = (name && name.trim()) || DEFAULT_KID_NAME;
  try { localStorage.setItem("lawson:kidName", KID_NAME); } catch (_) {}
  if (window.Lawson) window.Lawson.KID_NAME = KID_NAME;
  // Live-update branding (splash is gone by now, but header + tab title
  // reflect the new name without a reload).
  const header = document.querySelector("header h1");
  if (header) header.textContent = `${KID_NAME}'s Playground`;
  document.title = `${KID_NAME}'s Playground`;
}

// Dark mode: a `dark` class on <html> swaps the background gradients
// to deeper colors. Persisted so it sticks between sessions.
function setDarkMode(on) {
  try { localStorage.setItem("lawson:dark", on ? "1" : "0"); } catch (_) {}
  document.documentElement.classList.toggle("dark", !!on);
}
function isDarkMode() {
  try { return localStorage.getItem("lawson:dark") === "1"; } catch (_) { return false; }
}
// Apply saved dark-mode preference as early as possible.
setDarkMode(isDarkMode());

// Personalize branding with the saved kid name. Default-named runs are
// unchanged (still "Lawson's"). Once a parent sets a different name in
// Settings, the splash, header, and tab title all reflect it on the
// next launch.
(function personalize() {
  function apply() {
    const title = document.querySelector(".splash-title");
    if (title) title.textContent = `${KID_NAME}'s Playground`;
    const header = document.querySelector("header h1");
    if (header) header.textContent = `${KID_NAME}'s Playground`;
    document.title = `${KID_NAME}'s Playground`;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();

// First-run check — used after splash to decide whether to auto-open
// the Settings panel for a quick name capture.
function isFirstRun() {
  try { return !localStorage.getItem("lawson:kidName"); } catch (_) { return false; }
}

// Dismiss the splash screen after a short beat. Long enough that the
// brand registers, short enough that a toddler doesn't get bored.
(function dismissSplash() {
  const start = performance.now();
  const MIN_VISIBLE = 1100; // ms
  function hide() {
    const splash = document.getElementById("splash");
    if (!splash) return;
    splash.classList.add("hide");
    setTimeout(() => {
      splash.remove();
      // First visit? Pop the settings panel so a parent can set the
      // kid's name. We use the existing UI rather than a one-shot
      // dialog — fewer special cases, same outcome.
      if (isFirstRun() && typeof window.__openSettings === "function") {
        setTimeout(() => window.__openSettings({ onboarding: true }), 300);
      }
    }, 600);
  }
  function dismissNow() {
    const remaining = Math.max(0, MIN_VISIBLE - (performance.now() - start));
    setTimeout(hide, remaining);
  }
  // Tap-to-skip after a short cushion so the toddler doesn't blast past
  // it before the brand registers.
  setTimeout(() => {
    document.getElementById("splash")
      ?.addEventListener("touchstart", dismissNow, { passive: true });
    document.getElementById("splash")
      ?.addEventListener("click", dismissNow);
  }, 400);
  // Auto-dismiss on a timer regardless of taps.
  setTimeout(dismissNow, MIN_VISIBLE);
})();

const CHEER_PHRASES = [
  "Yay {name}!",
  "Way to go {name}!",
  "Awesome {name}!",
  "You got it {name}!",
  "Super {name}!",
  "Great job {name}!",
  "Wow {name}!",
  "Nice one {name}!",
];
function cheer() {
  return CHEER_PHRASES[Math.floor(Math.random() * CHEER_PHRASES.length)]
    .replace("{name}", KID_NAME);
}

// Fisher-Yates shuffle (returns a new array, leaves the input alone).
function shuffled(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------- Screens ----------
const screens = document.querySelectorAll(".screen");
function show(id) {
  screens.forEach((s) => s.classList.toggle("active", s.id === id));
}

// ---------- Helpers ----------
// Sparkle burst: scatter glyphs in a circle around (x, y) with varied
// size, distance, and rotation so each celebration feels organic rather
// than a perfect ring.
function sparkleAt(x, y) {
  const emojis = ["✨", "⭐", "🎉", "💖", "🌟", "💫", "🎊"];
  const count = 10;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "sparkle";
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.left = x + "px";
    s.style.top = y + "px";
    // Even angular distribution + small random jitter so the burst
    // isn't a rigid clock face.
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = 90 + Math.random() * 60;
    const scale = 0.7 + Math.random() * 1.2;
    const rot = (Math.random() - 0.5) * 120;
    s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    s.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    s.style.setProperty("--scale", scale);
    s.style.setProperty("--rot", rot + "deg");
    s.style.fontSize = (28 + scale * 14) + "px";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1100);
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

// Same as onTap but no-ops if this element already has a tap handler
// attached by us. Use for FIXED DOM elements (tool buttons, etc.) whose
// game's start() runs every time the user re-enters — without this guard
// each visit doubles the listener count.
function onTapOnce(el, fn) {
  if (!el || el.__lawsonTap) return;
  el.__lawsonTap = true;
  onTap(el, fn);
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
const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);
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
const VEHICLES = [
  { name: "Car",         emoji: "🚗", sound: "Beep beep!" },
  { name: "Truck",       emoji: "🚚", sound: "Honk honk!" },
  { name: "Bus",         emoji: "🚌", sound: "Vroom!" },
  { name: "Train",       emoji: "🚂", sound: "Choo choo!" },
  { name: "Plane",       emoji: "✈️", sound: "Wheee!" },
  { name: "Helicopter",  emoji: "🚁", sound: "Whoop whoop whoop!" },
  { name: "Boat",        emoji: "⛵", sound: "Toot toot!" },
  { name: "Fire truck",  emoji: "🚒", sound: "Wee-oh wee-oh!" },
  { name: "Police car",  emoji: "🚓", sound: "Wee-oo wee-oo!" },
  { name: "Tractor",     emoji: "🚜", sound: "Putt putt!" },
  { name: "Bike",        emoji: "🚲", sound: "Ring ring!" },
  { name: "Rocket",      emoji: "🚀", sound: "Blast off!" },
];
const DINOSAURS = [
  { name: "T-Rex",        emoji: "🦖", sound: "ROAR!" },
  { name: "Triceratops",  emoji: "🦖", sound: "Snort!" },
  { name: "Stegosaurus",  emoji: "🦖", sound: "Grumble!" },
  { name: "Brontosaurus", emoji: "🦕", sound: "Boom boom boom!" },
  { name: "Brachiosaurus",emoji: "🦕", sound: "Stomp stomp!" },
  { name: "Pterodactyl",  emoji: "🦅", sound: "Screech!" },
];
const WEATHER = [
  { name: "Sunny",   emoji: "☀️" },
  { name: "Cloudy",  emoji: "☁️" },
  { name: "Rainy",   emoji: "🌧️" },
  { name: "Stormy",  emoji: "⛈️" },
  { name: "Snowy",   emoji: "❄️" },
  { name: "Windy",   emoji: "💨" },
  { name: "Foggy",   emoji: "🌫️" },
  { name: "Rainbow", emoji: "🌈" },
];
const FOOD = [
  { name: "Apple",     emoji: "🍎" },
  { name: "Banana",    emoji: "🍌" },
  { name: "Pizza",     emoji: "🍕" },
  { name: "Hot dog",   emoji: "🌭" },
  { name: "Burger",    emoji: "🍔" },
  { name: "Cookie",    emoji: "🍪" },
  { name: "Cake",      emoji: "🍰" },
  { name: "Ice cream", emoji: "🍦" },
  { name: "Bread",     emoji: "🍞" },
  { name: "Cheese",    emoji: "🧀" },
  { name: "Egg",       emoji: "🥚" },
  { name: "Milk",      emoji: "🥛" },
];
const FAMILY = [
  { name: "Mommy",   emoji: "👩" },
  { name: "Daddy",   emoji: "👨" },
  { name: "Baby",    emoji: "👶" },
  { name: "Sister",  emoji: "👧" },
  { name: "Brother", emoji: "👦" },
  { name: "Grandma", emoji: "👵" },
  { name: "Grandpa", emoji: "👴" },
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
   1: "one",    2: "two",     3: "three",    4: "four",    5: "five",
   6: "six",    7: "seven",   8: "eight",    9: "nine",   10: "ten",
  11: "eleven",12: "twelve", 13: "thirteen",14: "fourteen",15: "fifteen",
  16: "sixteen",17:"seventeen",18:"eighteen",19:"nineteen",20:"twenty",
};

// `shuffle: false` opts an activity out of randomization (numbers stay
// in 1..10 order so he can recognize the sequence).
const ACTIVITIES = {
  letters: {
    items: LETTERS,
    many: true,
    color: () => `hsl(${Math.random() * 360}, 80%, 55%)`,
    // Show both forms ("Aa") so the kid learns uppercase and lowercase
    // at the same time. The lowercase is rendered smaller in CSS.
    label: (ch) => `${ch}<span class="letter-lower">${ch.toLowerCase()}</span>`,
    labelHtml: true,
    speak: (ch) => `${LETTER_SOUND[ch]}, ${LETTER_WORD[ch]}`,
    display: (ch, c) => ({ text: `${ch}${ch.toLowerCase()}`, color: c, caption: LETTER_WORD[ch] }),
  },
  numbers: {
    items: NUMBERS,
    shuffle: false,
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
  vehicles: {
    items: VEHICLES,
    color: () => `hsl(${Math.random() * 360}, 80%, 55%)`,
    label: (v) => v.emoji,
    speak: (v) => `${v.name}. ${v.sound}`,
    display: (v, c) => ({ text: v.emoji, color: c, caption: v.name }),
  },
  dinosaurs: {
    items: DINOSAURS,
    color: () => `hsl(${Math.random() * 360}, 70%, 50%)`,
    label: (d) => d.emoji,
    speak: (d) => `${d.name}. ${d.sound}`,
    display: (d, c) => ({ text: d.emoji, color: c, caption: d.name }),
  },
  weather: {
    items: WEATHER,
    color: () => `hsl(${190 + Math.random() * 60}, 60%, 55%)`,
    label: (w) => w.emoji,
    speak: (w) => w.name,
    display: (w, c) => ({ text: w.emoji, color: c, caption: w.name }),
  },
  food: {
    items: FOOD,
    color: () => `hsl(${Math.random() * 50}, 75%, 55%)`,
    label: (f) => f.emoji,
    speak: (f) => f.name,
    display: (f, c) => ({ text: f.emoji, color: c, caption: f.name }),
  },
  family: {
    items: FAMILY,
    shuffle: false,
    color: () => `hsl(${300 + Math.random() * 60}, 60%, 60%)`,
    label: (p) => p.emoji,
    speak: (p) => p.name,
    display: (p, c) => ({ text: p.emoji, color: c, caption: p.name }),
  },
};

function buildFlashcards(name) {
  const cfg = ACTIVITIES[name];
  if (!cfg) return;
  const stage = document.getElementById("stage");
  stage.innerHTML = "";
  stage.className = "stage" + (cfg.many ? " stage--many" : "");

  const items = cfg.shuffle === false ? cfg.items : shuffled(cfg.items);
  items.forEach((item, i) => {
    const el = document.createElement("button");
    el.className = "item";
    const lbl = cfg.label(item, i);
    if (cfg.labelHtml) el.innerHTML = lbl; else el.textContent = lbl;
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

// ---------- New-high-score celebration ----------
// Shared big-bang moment for any game when a new personal best is set.
// Uses a fixed-position overlay so it works on top of any screen, not
// just the flashcard activity that owns #bigDisplay.
function celebrateNewHigh(value) {
  happySound();
  haptic([15, 30, 15, 30, 25]);
  if (typeof earnSticker === "function") earnSticker("firstHigh");
  setTimeout(() => say(`New best! ${value}!`), 220);
  const overlay = document.getElementById("bestOverlay");
  const valEl = document.getElementById("bestValue");
  if (overlay && valEl) {
    valEl.textContent = value;
    overlay.classList.remove("show");
    void overlay.offsetWidth; // restart animation on rapid re-bests
    overlay.classList.add("show");
    clearTimeout(celebrateNewHigh._t);
    celebrateNewHigh._t = setTimeout(() => overlay.classList.remove("show"), 1800);
  }
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  for (let i = 0; i < 24; i++) {
    setTimeout(() => sparkleAt(
      cx + (Math.random() - 0.5) * 340,
      cy + (Math.random() - 0.5) * 340,
    ), i * 35);
  }
}

// ---------- Shared namespace for game modules ----------
// Each game file in /games registers itself on window.Lawson.games and uses
// the utilities below. Keeping each game self-contained makes it easy to
// tweak one without touching the others.
window.Lawson = {
  say, beep, happySound, buzzSound, haptic, sparkleAt, onTap, onTapOnce, pointOf, bumpBadge, show,
  audioCtx, unlockAudio,
  getHighScore, setHighScore, bumpHighScore, tryNewHighScore,
  setVoiceMuted, setSoundMuted, isVoiceMuted, isSoundMuted,
  earnSticker, isStickerEarned, listStickers, resetStickers,
  KID_NAME, cheer, shuffled, celebrateNewHigh,
  games: {}, // each game adds { screen, start, stop } here
};

// ---------- Routing ----------
let activeGame = null;
function leaveActiveGame() {
  if (activeGame && typeof activeGame.stop === "function") activeGame.stop();
  activeGame = null;
}

// Daily streak: increments when today's first visit is on the day after
// the last visit, resets to 1 if a day was missed, no-op if same day.
// Stored as YYYY-MM-DD strings to be timezone-stable for the local user.
function _today() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function _yesterdayOf(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d - 1);
  const z = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${z(dt.getMonth() + 1)}-${z(dt.getDate())}`;
}
function bumpDailyStreak() {
  try {
    const today = _today();
    const last = localStorage.getItem("lawson:lastDay") || "";
    let streak = parseInt(localStorage.getItem("lawson:streak") || "0", 10) || 0;
    if (last === today) return streak;
    streak = (last && last === _yesterdayOf(today)) ? streak + 1 : 1;
    localStorage.setItem("lawson:lastDay", today);
    localStorage.setItem("lawson:streak", String(streak));
    return streak;
  } catch (_) { return 1; }
}

// Render the streak badge in the header. Hidden when the streak is 0
// or 1 — a "🔥 1" badge isn't really a streak yet, and showing it
// makes a fresh install look noisier than it should.
function renderStreakBadge() {
  const badge = document.getElementById("streakBadge");
  const val = document.getElementById("streakBadgeVal");
  if (!badge || !val) return;
  let streak = 0;
  try { streak = parseInt(localStorage.getItem("lawson:streak") || "0", 10) || 0; } catch (_) {}
  if (streak >= 2) {
    val.textContent = streak;
    badge.hidden = false;
    // Tap-to-celebrate. Each tap speaks the count and a brief cheer
    // so the kid hears the achievement reinforced.
    if (!badge.__lawsonTap) {
      badge.__lawsonTap = true;
      onTap(badge, () => {
        say(`${streak} days in a row! Keep it going!`);
        sparkleAt(badge.getBoundingClientRect().left + 20,
                  badge.getBoundingClientRect().top + 20);
      });
    }
  } else {
    badge.hidden = true;
  }
}

// Time-of-day greeting shown as a top-of-screen toast on app load.
// Visual only — speaking it would collide with game intros and feel
// awkward, since some games speak the moment you enter them.
(function showWelcome() {
  const h = new Date().getHours();
  let prefix;
  if (h < 5)        prefix = "🌙 Hello";
  else if (h < 12)  prefix = "☀️ Good morning";
  else if (h < 17)  prefix = "🌤️ Good afternoon";
  else if (h < 21)  prefix = "🌆 Good evening";
  else              prefix = "🌙 Hello";

  const streak = bumpDailyStreak();
  renderStreakBadge();
  const streakBit = streak >= 2 ? `  ·  🔥 Day ${streak}` : "";

  const el = document.createElement("div");
  el.className = "welcome-toast";
  el.textContent = `${prefix}, ${KID_NAME}!${streakBit}`;
  document.body.appendChild(el);
  // Delay the slide-in so the toast emerges just as the splash fades —
  // a smooth handoff rather than two overlapping moments.
  const ENTRY_DELAY = 1200;
  const VISIBLE_DURATION = 2800;
  setTimeout(() => el.classList.add("show"), ENTRY_DELAY);
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 500);
  }, ENTRY_DELAY + VISIBLE_DURATION);
})();

// Tiny two-note chime for navigation: ascending when going into a game,
// descending when returning home. Reads as a "step forward / step back"
// musical cue without being a full jingle.
function navChime(up) {
  if (up) {
    beep(523.25, 0.07, "triangle", 0);    // C5
    beep(659.25, 0.09, "triangle", 0.05); // E5
  } else {
    beep(659.25, 0.07, "triangle", 0);    // E5
    beep(523.25, 0.09, "triangle", 0.05); // C5
  }
  haptic(8);
}

document.querySelectorAll("[data-go]").forEach((btn) => {
  onTap(btn, () => {
    unlockAudio();
    unlockSpeech();
    const where = btn.dataset.go;
    navChime(true);

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
    navChime(false);
  });
});

// Prevent multi-touch pinch-zoom gestures on iOS (belt-and-braces with viewport meta)
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("touchmove", (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// ---------- Settings panel ----------
// Tiny parent-facing modal: change the kid's name (used in cheers across
// every game) and wipe all high scores. The "Reset" button requires a
// confirm tap so a passing toddler can't nuke their own bests.
(function setupSettings() {
  const openBtn = document.getElementById("settingsBtn");
  const overlay = document.getElementById("settingsOverlay");
  if (!openBtn || !overlay) return;
  const nameInput  = document.getElementById("settingsName");
  const voiceTgl   = document.getElementById("settingsVoice");
  const soundTgl   = document.getElementById("settingsSound");
  const darkTgl    = document.getElementById("settingsDark");
  const closeBtn   = document.getElementById("settingsClose");
  const resetBtn   = document.getElementById("settingsReset");

  // Toggles are "on means enabled", so the checkbox value is the inverse
  // of the muted flag.
  voiceTgl.addEventListener("change", () => setVoiceMuted(!voiceTgl.checked));
  soundTgl.addEventListener("change", () => {
    setSoundMuted(!soundTgl.checked);
    if (soundTgl.checked) beep(500, 0.08); // little chirp when re-enabling
  });
  if (darkTgl) darkTgl.addEventListener("change", () => setDarkMode(darkTgl.checked));

  function open(opts) {
    const onboarding = !!(opts && opts.onboarding);
    nameInput.value = isFirstRun() ? "" : KID_NAME;
    voiceTgl.checked = !isVoiceMuted();
    soundTgl.checked = !isSoundMuted();
    if (darkTgl) darkTgl.checked = isDarkMode();
    resetBtn.textContent = "🧹 Reset scores";
    resetBtn.classList.remove("confirming");
    closeBtn.textContent = onboarding ? "✨ Let's play!" : "✅ Done";
    overlay.classList.toggle("onboarding", onboarding);
    overlay.classList.add("open");
    setTimeout(() => nameInput.focus({ preventScroll: true }), 50);
  }
  function close() {
    setKidName(nameInput.value);
    overlay.classList.remove("open");
    overlay.classList.remove("onboarding");
    beep(500, 0.08);
  }
  // Expose open() so first-run onboarding can trigger it.
  window.__openSettings = open;
  onTap(openBtn, (e) => { if (e.stopPropagation) e.stopPropagation(); open(); });
  onTap(closeBtn, close);
  // Tapping the dimmed backdrop closes too, but only if you tap outside the panel.
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  // Two-tap reset: first tap turns the button red and asks for confirmation;
  // second tap within ~4s actually wipes scores. Keeps a toddler from clearing them.
  let confirmT = null;
  onTap(resetBtn, () => {
    if (resetBtn.classList.contains("confirming")) {
      resetAllHighScores();
      resetStickers();
      clearTimeout(confirmT);
      resetBtn.classList.remove("confirming");
      resetBtn.textContent = "✅ Cleared";
      happySound();
      setTimeout(() => { resetBtn.textContent = "🧹 Reset scores"; }, 1400);
    } else {
      resetBtn.classList.add("confirming");
      resetBtn.textContent = "⚠️ Tap again to confirm";
      buzzSound();
      confirmT = setTimeout(() => {
        resetBtn.classList.remove("confirming");
        resetBtn.textContent = "🧹 Reset scores";
      }, 4000);
    }
  });

  // Submit on Enter, in case a parent prefers the keyboard.
  nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") close(); });
})();

// ---------- Service worker (offline play) ----------
// Cache static assets so the playground keeps working when the iPad's
// offline (in a car, on a plane, weak Wi-Fi, etc.). The SW file lives at
// the repo root so its scope covers everything below it.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
