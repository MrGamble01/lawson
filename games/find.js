// ---------- Find It! ----------
// Hidden-picture search. Three modes share one scattered scene:
//   Free  — themed scenes (farm, ocean, park, sky); "Find the duck!"
//   ABC   — scattered letters; "Find the A!"
//   123   — scattered numbers; "Find the 3!"
// Free mode now uses coherent themed scenes instead of a random emoji
// soup, and letters/numbers turn the same hunt into reading practice.
(function () {
  const L = window.Lawson;

  const THEMES = [
    { name: "farm", bg: "linear-gradient(180deg,#d8f5a2,#b2f2bb)", items: [
      { e: "🐮", n: "cow" }, { e: "🐷", n: "pig" }, { e: "🐔", n: "chicken" },
      { e: "🐴", n: "horse" }, { e: "🐑", n: "sheep" }, { e: "🦆", n: "duck" },
      { e: "🐐", n: "goat" }, { e: "🐶", n: "dog" }, { e: "🐱", n: "cat" },
      { e: "🌻", n: "sunflower" }, { e: "🚜", n: "tractor" }, { e: "🐰", n: "bunny" },
      { e: "🐭", n: "mouse" }, { e: "🌾", n: "wheat" },
    ] },
    { name: "ocean", bg: "linear-gradient(180deg,#a5d8ff,#74c0fc)", items: [
      { e: "🐟", n: "fish" }, { e: "🐠", n: "clownfish" }, { e: "🐙", n: "octopus" },
      { e: "🦀", n: "crab" }, { e: "🐬", n: "dolphin" }, { e: "🐳", n: "whale" },
      { e: "🦈", n: "shark" }, { e: "🐚", n: "shell" }, { e: "⛵", n: "boat" },
      { e: "🐢", n: "turtle" }, { e: "🦑", n: "squid" }, { e: "🐡", n: "pufferfish" },
      { e: "🌊", n: "wave" }, { e: "🦭", n: "seal" },
    ] },
    { name: "park", bg: "linear-gradient(180deg,#d3f9d8,#b2f2bb)", items: [
      { e: "🌳", n: "tree" }, { e: "🌸", n: "blossom" }, { e: "🦋", n: "butterfly" },
      { e: "🐝", n: "bee" }, { e: "🐦", n: "bird" }, { e: "🌻", n: "sunflower" },
      { e: "⚽", n: "ball" }, { e: "🪁", n: "kite" }, { e: "🐶", n: "dog" },
      { e: "🌷", n: "tulip" }, { e: "🍦", n: "ice cream" }, { e: "🐿️", n: "squirrel" },
      { e: "🌼", n: "daisy" }, { e: "🐌", n: "snail" },
    ] },
    { name: "sky", bg: "linear-gradient(180deg,#bac8ff,#a5d8ff)", items: [
      { e: "⭐", n: "star" }, { e: "🌙", n: "moon" }, { e: "☁️", n: "cloud" },
      { e: "🌈", n: "rainbow" }, { e: "☀️", n: "sun" }, { e: "🚀", n: "rocket" },
      { e: "🛸", n: "spaceship" }, { e: "✈️", n: "plane" }, { e: "🪐", n: "planet" },
      { e: "🎈", n: "balloon" }, { e: "🌟", n: "sparkle" }, { e: "🦅", n: "eagle" },
      { e: "🪁", n: "kite" }, { e: "🌤️", n: "sunshine" },
    ] },
  ];

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const NUMBERS = Array.from({ length: 10 }, (_, i) => String(i + 1));
  const GLYPH_COLORS = ["#ff3b30", "#ff9500", "#34c759", "#007aff",
    "#af52de", "#ff2d92", "#1aa3b5", "#e8590c", "#5f3dc4"];
  const LETTER_SAY = {
    A: "ay", B: "bee", C: "see", D: "dee", E: "ee", F: "eff", G: "jee",
    H: "aitch", I: "eye", J: "jay", K: "kay", L: "el", M: "em", N: "en",
    O: "oh", P: "pee", Q: "cue", R: "are", S: "ess", T: "tee", U: "you",
    V: "vee", W: "double you", X: "ex", Y: "why", Z: "zee",
  };
  const NUMBER_SAY = ["", "one", "two", "three", "four", "five",
    "six", "seven", "eight", "nine", "ten"];

  const FINDS_PER_SCENE = 5;
  const LEARNING_COUNT = 12;     // distinct glyphs scattered in ABC/123

  let mode = "free";
  let themeIdx = -1;
  let score = 0;
  let targets = [];
  let currentTarget = null;      // { e, n } in free; { glyph } in learning
  let activeTimer = null;
  let busy = false;
  let bestKey = "findBest";
  let bestAtStart = 0;
  let celebrated = false;

  function sayGlyph(g) {
    if (mode === "numbers") return NUMBER_SAY[+g] || g;
    return LETTER_SAY[g] || g;
  }

  function updateBest() {
    const el = document.getElementById("findBestVal");
    if (el) el.textContent = L.getHighScore(bestKey);
  }
  function maybeCelebrateRecord(value) {
    if (value > bestAtStart && !celebrated) {
      celebrated = true;
      setTimeout(() => L.celebrateNewHigh(value), 800);
    }
    L.bumpHighScore(bestKey, value);
  }

  function speakTarget() {
    if (!currentTarget) return;
    if (mode === "free") L.say(`Find the ${currentTarget.n}!`);
    else L.say(`Find the ${sayGlyph(currentTarget.glyph)}!`);
  }

  function showPrompt() {
    const prompt = document.getElementById("findPrompt");
    if (!prompt || !currentTarget) return;
    if (mode === "free") {
      prompt.innerHTML =
        `Find the <span class="find-target">${currentTarget.e}</span> ` +
        `<span class="find-target-name">${currentTarget.n}</span>!`;
    } else {
      prompt.innerHTML = `Find the <span class="find-target">${currentTarget.glyph}</span>!`;
    }
  }

  function nextTarget() {
    busy = false;
    currentTarget = targets.shift() || null;
    if (!currentTarget) {
      L.happySound();
      L.say(`${L.cheer()} You found them all!`);
      activeTimer = setTimeout(newScene, 1700);
      return;
    }
    showPrompt();
    speakTarget();
  }

  // Lay items out on a coarse grid so they can't stack on top of each
  // other. One item per cell + a small random jitter inside the cell
  // keeps the scene from looking grid-aligned.
  function placeOnGrid(els) {
    const n = els.length;
    const cols = n <= 9 ? 3 : 4;
    const rows = Math.max(4, Math.ceil(n / cols));
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) cells.push({ r, c });
    }
    const order = L.shuffled(cells);
    const cellW = 100 / cols;
    const cellH = 100 / rows;
    els.forEach((el, i) => {
      const cell = order[i];
      // Stay well inside the cell (±15% of cell size) so neighboring
      // items don't bleed into each other after rotation.
      const jitterX = (Math.random() - 0.5) * cellW * 0.3;
      const jitterY = (Math.random() - 0.5) * cellH * 0.3;
      const cx = (cell.c + 0.5) * cellW + jitterX;
      const cy = (cell.r + 0.5) * cellH + jitterY;
      el.style.left = Math.max(6, Math.min(94, cx)) + "%";
      el.style.top  = Math.max(6, Math.min(94, cy)) + "%";
      el.style.transform = `translate(-50%, -50%) rotate(${(Math.random() - 0.5) * 16}deg)`;
      el.style.zIndex = String(Math.floor(Math.random() * 5));
    });
  }

  function newScene() {
    const stage = document.getElementById("findStage");
    const game = document.getElementById("findGame");
    if (!stage) return;
    stage.innerHTML = "";
    busy = false;

    let sceneItems;
    const els = [];
    if (mode === "free") {
      themeIdx = (themeIdx + 1) % THEMES.length;
      const theme = THEMES[themeIdx];
      if (game) game.style.background = theme.bg;
      sceneItems = L.shuffled(theme.items);
      sceneItems.forEach((item) => {
        const el = document.createElement("button");
        el.className = "find-item";
        el.textContent = item.e;
        el.style.fontSize = `clamp(38px, ${5.5 + Math.random() * 2}vw, 76px)`;
        L.onTap(el, (e) => onTapItem(item, el, e));
        stage.appendChild(el);
        els.push(el);
      });
    } else {
      if (game) game.style.background = "linear-gradient(180deg,#fff3bf,#ffec99)";
      const pool = mode === "numbers" ? NUMBERS : LETTERS;
      const count = mode === "numbers" ? NUMBERS.length : LEARNING_COUNT;
      sceneItems = L.shuffled(pool).slice(0, count).map((g) => ({ glyph: g }));
      sceneItems.forEach((item, i) => {
        const el = document.createElement("button");
        el.className = "find-item find-item--glyph";
        el.textContent = item.glyph;
        el.style.background = GLYPH_COLORS[i % GLYPH_COLORS.length];
        el.style.fontSize = `clamp(34px, ${5 + Math.random() * 2}vw, 68px)`;
        L.onTap(el, (e) => onTapItem(item, el, e));
        stage.appendChild(el);
        els.push(el);
      });
    }
    placeOnGrid(els);

    targets = L.shuffled(sceneItems.slice()).slice(0, FINDS_PER_SCENE);
    activeTimer = setTimeout(nextTarget, 600);
  }

  function matches(item) {
    return mode === "free"
      ? item.e === currentTarget.e
      : item.glyph === currentTarget.glyph;
  }

  function onTapItem(item, el, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (busy || !currentTarget) return;
    if (matches(item)) {
      busy = true;
      L.happySound();
      score += 1;
      L.bumpBadge("findScoreVal", score);
      if (mode === "free" && score >= 20) L.earnSticker && L.earnSticker("finder");
      maybeCelebrateRecord(score);
      updateBest();
      el.classList.add("found");
      const p = L.pointOf(e);
      L.sparkleAt(p.x, p.y);
      const said = mode === "free" ? currentTarget.n : sayGlyph(currentTarget.glyph);
      L.say(`${L.cheer()} ${said}!`);
      activeTimer = setTimeout(nextTarget, 1100);
    } else {
      L.buzzSound();
      el.classList.add("wrong");
      setTimeout(() => el.classList.remove("wrong"), 400);
      // Name what they tapped (reinforces learning), then repeat the goal.
      if (mode === "free") L.say(item.n);
      else L.say(`That's ${sayGlyph(item.glyph)}.`);
      setTimeout(speakTarget, 700);
    }
  }

  function setMode(m) {
    mode = m;
    score = 0;
    themeIdx = -1;
    celebrated = false;
    bestKey = m === "letters" ? "findLettersBest"
            : m === "numbers" ? "findNumbersBest" : "findBest";
    bestAtStart = L.getHighScore(bestKey);

    document.querySelectorAll("#findGame .mode-tab").forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.mode === m));

    L.bumpBadge("findScoreVal", 0);
    updateBest();
    clearTimeout(activeTimer);
    newScene();
  }

  function start() {
    document.querySelectorAll("#findGame .mode-tab").forEach((btn) => {
      L.onTapOnce(btn, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        L.beep(560, 0.07, "triangle");
        setMode(btn.dataset.mode);
      });
    });
    setMode("free");
  }

  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    const s = document.getElementById("findStage");
    if (s) s.innerHTML = "";
    currentTarget = null;
    targets = [];
  }

  L.games.find = { screen: "findGame", start, stop };
})();
