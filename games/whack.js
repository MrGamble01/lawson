// ---------- Whack-a-Mole ----------
// Three modes share six holes:
//   Free  — whack any critter; occasional golden one is worth 3.
//   ABC   — "Whack the B!"; moles hold letters, bop the named one.
//   123   — "Whack the 3!"; numbers 1-10.
// Learning rides inside the game Lawson already likes. In ABC/123 the
// moles stay up a little longer so there's time to read them.
(function () {
  const L = window.Lawson;

  const CRITTERS = [
    { emoji: "🐹", name: "hamster" }, { emoji: "🐰", name: "bunny" },
    { emoji: "🐭", name: "mouse" },   { emoji: "🐸", name: "frog" },
    { emoji: "🐱", name: "cat" },     { emoji: "🐶", name: "puppy" },
    { emoji: "🦊", name: "fox" },     { emoji: "🐻", name: "bear" },
    { emoji: "🐨", name: "koala" },   { emoji: "🐷", name: "pig" },
  ];

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const NUMBERS = Array.from({ length: 10 }, (_, i) => String(i + 1));
  const LETTER_SAY = {
    A: "ay", B: "bee", C: "see", D: "dee", E: "ee", F: "eff", G: "jee",
    H: "aitch", I: "eye", J: "jay", K: "kay", L: "el", M: "em", N: "en",
    O: "oh", P: "pee", Q: "cue", R: "are", S: "ess", T: "tee", U: "you",
    V: "vee", W: "double you", X: "ex", Y: "why", Z: "zee",
  };
  const NUMBER_SAY = ["", "one", "two", "three", "four", "five",
    "six", "seven", "eight", "nine", "ten"];

  const HOLE_COUNT = 6;

  let mode = "free";
  let target = null;
  let lastTarget = null;
  let cycleTimer = null;
  let score = 0;
  let holes = [];
  let popInterval = 1200;
  let bestKey = "whackBest";
  let bestAtStart = 0;
  let celebrated = false;

  function sayGlyph(g) {
    if (mode === "numbers") return NUMBER_SAY[+g] || g;
    return LETTER_SAY[g] || g;
  }

  function updateBadges() {
    L.bumpBadge("whackScoreVal", score);
    const bestEl = document.getElementById("whackBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore(bestKey);
  }

  function maybeCelebrateRecord(value) {
    if (value > bestAtStart && !celebrated) {
      celebrated = true;
      setTimeout(() => L.celebrateNewHigh(value), 500);
    }
    L.bumpHighScore(bestKey, value);
  }

  function makeHoles() {
    const grid = document.getElementById("whackGrid");
    grid.innerHTML = "";
    holes = [];
    for (let i = 0; i < HOLE_COUNT; i++) {
      const hole = document.createElement("div");
      hole.className = "whack-hole";
      hole.innerHTML = `<div class="whack-dirt"></div><div class="whack-critter"></div>`;
      grid.appendChild(hole);
      const critter = hole.querySelector(".whack-critter");

      let current = null; // { emoji?, name?, glyph?, gold? }
      let downTimer = null;

      const hit = () => {
        if (!current) return;
        const c = current;
        critter.classList.add("bonk");
        setTimeout(() => critter.classList.remove("bonk"), 300);
        critter.classList.remove("up");
        current = null;
        clearTimeout(downTimer);
        const r = critter.getBoundingClientRect();

        if (mode === "free") {
          const pts = c.gold ? 3 : 1;
          score += pts;
          if (c.gold) L.earnSticker && L.earnSticker("whackGold");
          if (score >= 20) L.earnSticker && L.earnSticker("whack20");
          L.happySound();
          L.say(c.gold ? `Gold ${c.name}!` : L.cheer());
          L.sparkleAt(r.left + r.width / 2, r.top + r.height / 2);
          updateBadges();
          maybeCelebrateRecord(score);
          popInterval = Math.max(550, 1200 - Math.floor(score / 5) * 80);
          return;
        }

        // Learning mode.
        if (c.glyph === target) {
          score += 1;
          L.happySound();
          L.say(`${sayGlyph(c.glyph)}! ${L.cheer()}`);
          L.sparkleAt(r.left + r.width / 2, r.top + r.height / 2);
          updateBadges();
          maybeCelebrateRecord(score);
          popInterval = Math.max(750, 1300 - Math.floor(score / 5) * 60);
          newTarget();
        } else {
          L.beep(240, 0.12, "triangle");
          L.say(`That's ${sayGlyph(c.glyph)}. Whack the ${sayGlyph(target)}!`);
        }
      };

      L.onTap(critter, hit);
      L.onTap(hole, () => { if (current) hit(); });

      holes.push({
        glyph: () => (current ? current.glyph : null),
        isUp: () => !!current,
        pop(content) {
          if (current) return false;
          current = content;
          if (content.glyph) {
            critter.textContent = content.glyph;
            critter.classList.add("whack-critter--glyph");
          } else {
            critter.textContent = content.emoji;
            critter.classList.remove("whack-critter--glyph");
          }
          critter.classList.toggle("gold", !!content.gold);
          critter.classList.add("up");
          const upFor = mode === "free"
            ? 900 + Math.random() * 700
            : 1500 + Math.random() * 1100;
          downTimer = setTimeout(() => {
            critter.classList.remove("up");
            current = null;
          }, upFor);
          return true;
        },
        reset() {
          critter.classList.remove("up", "gold", "whack-critter--glyph", "bonk");
          current = null;
          clearTimeout(downTimer);
        },
      });
    }
  }

  function targetIsUp() {
    return holes.some((h) => h.isUp() && h.glyph() === target);
  }

  function popRandom() {
    const free = holes.filter((h) => !h.isUp());
    if (!free.length) return;
    const h = free[Math.floor(Math.random() * free.length)];

    if (mode === "free") {
      const c = CRITTERS[Math.floor(Math.random() * CRITTERS.length)];
      h.pop({ emoji: c.emoji, name: c.name, gold: Math.random() < 0.12 });
      return;
    }
    const pool = mode === "numbers" ? NUMBERS : LETTERS;
    let glyph;
    if (!targetIsUp() || Math.random() < 0.45) {
      glyph = target;
    } else {
      do { glyph = pool[Math.floor(Math.random() * pool.length)]; }
      while (glyph === target);
    }
    h.pop({ glyph });
  }

  function newTarget() {
    do {
      const pool = mode === "numbers" ? NUMBERS : LETTERS;
      target = pool[Math.floor(Math.random() * pool.length)];
    } while (target === lastTarget);
    lastTarget = target;
    const prompt = document.getElementById("whackPrompt");
    if (prompt) prompt.textContent = `Whack the ${target}!`;
    L.say(`Whack the ${sayGlyph(target)}!`);
    if (!targetIsUp()) popRandom();
  }

  function tick() {
    popRandom();
    if (popInterval < 800 && Math.random() < 0.35) popRandom();
    cycleTimer = setTimeout(tick, popInterval);
  }

  function setMode(m) {
    mode = m;
    score = 0;
    popInterval = mode === "free" ? 1200 : 1300;
    lastTarget = null;
    celebrated = false;
    bestKey = m === "letters" ? "whackLettersBest"
            : m === "numbers" ? "whackNumbersBest" : "whackBest";
    bestAtStart = L.getHighScore(bestKey);

    document.querySelectorAll("#whackGame .mode-tab").forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.mode === m));
    const prompt = document.getElementById("whackPrompt");
    if (prompt) prompt.hidden = (m === "free");

    holes.forEach((h) => h.reset());
    updateBadges();

    if (m === "free") L.say("Tap the animals!");
    else newTarget();
  }

  function start() {
    makeHoles();
    document.querySelectorAll("#whackGame .mode-tab").forEach((btn) => {
      L.onTapOnce(btn, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        L.beep(560, 0.07, "triangle");
        setMode(btn.dataset.mode);
      });
    });
    setMode("free");
    clearTimeout(cycleTimer);
    cycleTimer = setTimeout(tick, 600);
  }

  function stop() {
    clearTimeout(cycleTimer);
    cycleTimer = null;
    holes.forEach((h) => h.reset());
    holes = [];
  }

  L.games.whack = { screen: "whackGame", start, stop };
})();
