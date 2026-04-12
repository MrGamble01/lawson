// ---------- Speech ----------
const synth = window.speechSynthesis;
function say(text, rate = 0.9) {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = 1.2;
  u.lang = "en-US";
  synth.speak(u);
}

// ---------- Simple beep/pop sounds via Web Audio ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function beep(freq = 440, dur = 0.15, type = "sine") {
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = 0.2;
  o.connect(g).connect(audioCtx.destination);
  o.start();
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.stop(audioCtx.currentTime + dur);
}
function happySound() {
  beep(523, 0.12);
  setTimeout(() => beep(659, 0.12), 120);
  setTimeout(() => beep(784, 0.18), 240);
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
  d.classList.add("show");
  setTimeout(() => d.classList.remove("show"), 800);
}

// ---------- Build activity screens ----------
function buildLetters() {
  const stage = document.getElementById("stage");
  stage.innerHTML = "";
  LETTERS.forEach((ch) => {
    const el = document.createElement("button");
    el.className = "item";
    el.textContent = ch;
    el.style.setProperty("--c", `hsl(${Math.random() * 360}, 80%, 60%)`);
    el.addEventListener("click", (e) => {
      happySound();
      say(`${ch}. ${ch} is for ${letterWord(ch)}`);
      showBigDisplay(ch, el.style.getPropertyValue("--c"));
      sparkleAt(e.clientX, e.clientY);
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
    el.addEventListener("click", (e) => {
      happySound();
      // Count up to n
      let i = 1;
      const count = () => {
        if (i > n) return;
        say(String(i), 1);
        i++;
        setTimeout(count, 500);
      };
      count();
      showBigDisplay(n, el.style.getPropertyValue("--c"));
      sparkleAt(e.clientX, e.clientY);
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
    el.addEventListener("click", (e) => {
      happySound();
      say(c.name);
      showBigDisplay(c.name, c.hex);
      sparkleAt(e.clientX, e.clientY);
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
    el.addEventListener("click", (e) => {
      happySound();
      say(s.name);
      showBigDisplay(s.name, el.style.getPropertyValue("--c"));
      sparkleAt(e.clientX, e.clientY);
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
    el.addEventListener("click", (e) => {
      happySound();
      say(`${a.name}. ${a.sound}`);
      showBigDisplay(a.emoji, el.style.getPropertyValue("--c"));
      sparkleAt(e.clientX, e.clientY);
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
    b.addEventListener("click", (e) => {
      e.stopPropagation();
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
    setTimeout(() => b.remove(), dur * 1000);
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
  btn.addEventListener("click", () => {
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
  btn.addEventListener("click", () => {
    stopPopGame();
    synth && synth.cancel();
    show("menu");
    beep(400, 0.1);
  });
});

// Prevent double-tap zoom on iOS
document.addEventListener("touchstart", () => {}, { passive: true });

// Warm up speech on first user interaction (required on some browsers)
document.addEventListener(
  "click",
  () => {
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (synth && !synth.speaking) {
      // no-op but primes the engine
    }
  },
  { once: true }
);
