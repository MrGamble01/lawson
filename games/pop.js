// ---------- Balloon Pop ----------
// Three modes share one playfield:
//   Free    — pop anything; streak + rare rainbow bonus.
//   ABC     — "Pop the B!" balloons carry letters; pop the named one.
//   123     — "Pop the 3!" balloons carry numbers 1-10.
// Letters/numbers ride inside the game Lawson already loves, so the
// learning is the play, not a separate flashcard tile.
(function () {
  const L = window.Lawson;

  // Mid/deep colors so a white glyph (with a dark outline) reads on top.
  const COLORS = [
    "#ff3b30", "#ff9500", "#34c759", "#007aff",
    "#af52de", "#ff2d92", "#1aa3b5",
  ];

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const NUMBERS = Array.from({ length: 10 }, (_, i) => String(i + 1));
  // Phonetic letter names so iOS TTS says them cleanly.
  const LETTER_SAY = {
    A: "ay", B: "bee", C: "see", D: "dee", E: "ee", F: "eff", G: "jee",
    H: "aitch", I: "eye", J: "jay", K: "kay", L: "el", M: "em", N: "en",
    O: "oh", P: "pee", Q: "cue", R: "are", S: "ess", T: "tee", U: "you",
    V: "vee", W: "double you", X: "ex", Y: "why", Z: "zee",
  };
  const NUMBER_SAY = ["", "one", "two", "three", "four", "five",
    "six", "seven", "eight", "nine", "ten"];

  const STREAK_MILESTONES = [5, 10, 25, 50];

  let mode = "free";          // "free" | "letters" | "numbers"
  let target = null;          // glyph to pop in a learning mode
  let lastTarget = null;
  let score = 0;
  let streak = 0;
  let bestKey = "popBest";
  let bestAtStart = 0;        // snapshot so the record celebration fires ONCE
  let celebrated = false;
  let spawnTimer = null;

  function sayGlyph(g) {
    if (mode === "numbers") return NUMBER_SAY[+g] || g;
    return LETTER_SAY[g] || g;
  }

  function balloonSvg(hex, glyph, rainbow) {
    const fill = rainbow ? "url(#popRainbow)" : hex;
    const defs = rainbow ? `
      <defs><linearGradient id="popRainbow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ff3b30"/><stop offset="20%" stop-color="#ff9500"/>
        <stop offset="40%" stop-color="#ffd60a"/><stop offset="60%" stop-color="#34c759"/>
        <stop offset="80%" stop-color="#007aff"/><stop offset="100%" stop-color="#af52de"/>
      </linearGradient></defs>` : "";
    const text = glyph ? `<text x="50" y="57" text-anchor="middle"
        dominant-baseline="central" font-family="'Arial Black', Arial, sans-serif"
        font-size="52" font-weight="900" fill="#fff" stroke="rgba(0,0,0,0.4)"
        stroke-width="2" paint-order="stroke">${glyph}</text>` : "";
    return `
      <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        ${defs}
        <ellipse cx="50" cy="55" rx="42" ry="50" fill="${fill}"/>
        <ellipse cx="36" cy="38" rx="10" ry="16" fill="rgba(255,255,255,0.5)"/>
        ${text}
        <polygon points="46,104 54,104 50,112" fill="${rainbow ? "#ff9500" : hex}"/>
        <path d="M50 112 Q56 124 48 134 Q42 140 50 140" stroke="#555" stroke-width="2" fill="none"/>
      </svg>`;
  }

  function updateBadges() {
    L.bumpBadge("popScoreVal", score);
    const streakEl = document.getElementById("popStreakVal");
    if (streakEl) streakEl.textContent = streak;
    const bestEl = document.getElementById("popBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore(bestKey);
  }

  // One genuine "new record" moment per run, instead of firing on every
  // point once you pass your old best.
  function maybeCelebrateRecord(value) {
    if (value > bestAtStart && !celebrated) {
      celebrated = true;
      L.celebrateNewHigh(value);
    }
    L.bumpHighScore(bestKey, value);
  }

  function countTargets(area) {
    if (!target) return 0;
    return area.querySelectorAll(`.balloon[data-glyph="${target}"]`).length;
  }

  function newTarget(area) {
    do {
      const pool = mode === "numbers" ? NUMBERS : LETTERS;
      target = pool[Math.floor(Math.random() * pool.length)];
    } while (target === lastTarget);
    lastTarget = target;
    const prompt = document.getElementById("popPrompt");
    if (prompt) prompt.textContent = `Pop the ${target}!`;
    L.say(`Pop the ${sayGlyph(target)}!`);
    // Guarantee one findable target right away.
    spawn(area, target);
  }

  function spawn(area, forceGlyph) {
    if (!area) return;
    const rainbow = mode === "free" && Math.random() < 0.08; // ~1 in 12
    let glyph = null;
    let hex = COLORS[Math.floor(Math.random() * COLORS.length)];

    if (mode !== "free") {
      if (forceGlyph) {
        glyph = forceGlyph;
      } else if (countTargets(area) === 0 || Math.random() < 0.4) {
        glyph = target;
      } else {
        const pool = mode === "numbers" ? NUMBERS : LETTERS;
        do { glyph = pool[Math.floor(Math.random() * pool.length)]; }
        while (glyph === target);
      }
    }

    const b = document.createElement("div");
    b.className = "balloon" + (rainbow ? " balloon--rainbow" : "");
    if (glyph) b.dataset.glyph = glyph;
    b.innerHTML = balloonSvg(hex, glyph, rainbow);
    b.style.left = Math.random() * 78 + 11 + "%";
    b.style.top = "110%";
    const dur = (mode === "free" ? 5 : 6) + Math.random() * 4;
    b.style.animationDuration = dur + "s";

    let popped = false;

    L.onTap(b, (e) => {
      if (popped) return;
      popped = true;
      if (e.stopPropagation) e.stopPropagation();

      const p = L.pointOf(e);
      const burst = (glyphForBurst) => {
        L.sparkleAt(p.x, p.y);
        const bv = document.createElement("div");
        bv.className = "burst";
        const r = b.getBoundingClientRect();
        const ar = area.getBoundingClientRect();
        bv.style.top = (r.top - ar.top) + "px";
        bv.style.left = (r.left - ar.left) + "px";
        bv.textContent = glyphForBurst;
        area.appendChild(bv);
        setTimeout(() => bv.remove(), 500);
      };

      if (mode === "free") {
        const pts = rainbow ? 3 : 1;
        score += pts;
        streak += 1;
        if (rainbow) L.earnSticker && L.earnSticker("popRainbow");
        if (streak >= 10) L.earnSticker && L.earnSticker("popStreak10");
        L.beep(300 + Math.random() * 400, 0.15, "triangle");
        updateBadges();
        burst(rainbow ? "🌈" : "💥");
        b.remove();
        if (STREAK_MILESTONES.includes(streak)) {
          L.say(`${L.cheer()} ${streak} in a row!`);
          L.happySound();
          maybeCelebrateRecord(streak);
        }
        return;
      }

      // Learning mode.
      if (glyph === target) {
        score += 1;
        L.happySound();
        updateBadges();
        maybeCelebrateRecord(score);
        if (score % 5 === 0) L.say(`${sayGlyph(glyph)}! ${L.cheer()}`);
        else L.say(`${sayGlyph(glyph)}!`);
        burst("⭐");
        b.remove();
        newTarget(area);
      } else {
        // Popping is still fun — name what they hit, nudge back to target.
        L.beep(240, 0.14, "triangle");
        burst("💨");
        b.remove();
        L.say(`That's ${sayGlyph(glyph)}. Find the ${sayGlyph(target)}!`);
      }
    });

    area.appendChild(b);

    // Floated off the top.
    setTimeout(() => {
      if (b.parentNode && !popped) {
        if (mode === "free" && streak > 0) {
          maybeCelebrateRecord(streak);
          streak = 0;
          updateBadges();
        }
        b.remove();
        // Keep a target reachable in learning modes.
        if (mode !== "free" && countTargets(area) === 0) spawn(area, target);
      }
    }, dur * 1000);
  }

  function startSpawning(area) {
    clearInterval(spawnTimer);
    spawnTimer = setInterval(() => spawn(area), mode === "free" ? 1100 : 1300);
  }

  function setMode(m, area) {
    mode = m;
    score = 0;
    streak = 0;
    lastTarget = null;
    celebrated = false;
    bestKey = m === "letters" ? "popLettersBest"
            : m === "numbers" ? "popNumbersBest" : "popBest";
    bestAtStart = L.getHighScore(bestKey);

    document.querySelectorAll(".pop-mode").forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.mode === m));
    const prompt = document.getElementById("popPrompt");
    const streakBadge = document.getElementById("popStreak");
    if (prompt) prompt.hidden = (m === "free");
    if (streakBadge) streakBadge.hidden = (m !== "free");

    if (area) area.innerHTML = "";
    updateBadges();

    if (m === "free") {
      L.say("Pop the balloons!");
      spawn(area); spawn(area); spawn(area);
    } else {
      newTarget(area);
    }
    startSpawning(area);
  }

  function start() {
    const area = document.getElementById("popArea");
    area.innerHTML = "";

    document.querySelectorAll(".pop-mode").forEach((btn) => {
      L.onTapOnce(btn, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        L.beep(560, 0.07, "triangle");
        setMode(btn.dataset.mode, area);
      });
    });

    setMode("free", area);
  }

  function stop() {
    if (mode === "free" && streak > 0) L.bumpHighScore("popBest", streak);
    clearInterval(spawnTimer);
    spawnTimer = null;
    const area = document.getElementById("popArea");
    if (area) area.innerHTML = "";
  }

  L.games.pop = { screen: "popGame", start, stop };
})();
