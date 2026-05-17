// ---------- Balloon Pop ----------
// Tap rising balloons. Score bumps on every pop; streak tracks pops in a
// row without letting a balloon escape off the top. Streaks at 5/10/25
// trigger a mini-celebration. A rare "rainbow" balloon is worth 3 points
// and gives a bigger burst.
(function () {
  const L = window.Lawson;

  const COLORS = [
    { name: "Red",    hex: "#ff3b30" },
    { name: "Orange", hex: "#ff9500" },
    { name: "Yellow", hex: "#ffd60a" },
    { name: "Green",  hex: "#34c759" },
    { name: "Blue",   hex: "#007aff" },
    { name: "Purple", hex: "#af52de" },
    { name: "Pink",   hex: "#ff2d92" },
  ];

  const STREAK_MILESTONES = [5, 10, 25, 50];

  let spawnTimer = null;
  let score = 0;
  let streak = 0;

  function balloonSvg(hex) {
    return `
      <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="50" cy="55" rx="42" ry="50" fill="${hex}"/>
        <ellipse cx="36" cy="38" rx="10" ry="16" fill="rgba(255,255,255,0.5)"/>
        <polygon points="46,104 54,104 50,112" fill="${hex}"/>
        <path d="M50 112 Q56 124 48 134 Q42 140 50 140" stroke="#555" stroke-width="2" fill="none"/>
      </svg>`;
  }

  function rainbowSvg() {
    return `
      <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stop-color="#ff3b30"/>
            <stop offset="20%" stop-color="#ff9500"/>
            <stop offset="40%" stop-color="#ffd60a"/>
            <stop offset="60%" stop-color="#34c759"/>
            <stop offset="80%" stop-color="#007aff"/>
            <stop offset="100%" stop-color="#af52de"/>
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="55" rx="42" ry="50" fill="url(#rainbow)"/>
        <ellipse cx="36" cy="38" rx="10" ry="16" fill="rgba(255,255,255,0.6)"/>
        <polygon points="46,104 54,104 50,112" fill="#ff9500"/>
        <path d="M50 112 Q56 124 48 134 Q42 140 50 140" stroke="#555" stroke-width="2" fill="none"/>
      </svg>`;
  }

  function updateBadges() {
    L.bumpBadge("popScoreVal", score);
    const streakEl = document.getElementById("popStreakVal");
    if (streakEl) streakEl.textContent = streak;
    const bestEl = document.getElementById("popBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("popBest");
  }

  function celebrate(text) {
    L.say(text);
    // big sparkle burst at screen center
    sparkleBurst(window.innerWidth / 2, window.innerHeight / 2, 16);
  }

  function sparkleBurst(x, y, n = 8) {
    for (let i = 0; i < n; i++) {
      setTimeout(() => L.sparkleAt(
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 40,
      ), i * 30);
    }
  }

  function spawn(area) {
    const rainbow = Math.random() < 0.08; // ~1 in 12
    const c = rainbow
      ? { name: "Rainbow", hex: "#ff4081" }
      : COLORS[Math.floor(Math.random() * COLORS.length)];

    const b = document.createElement("div");
    b.className = "balloon" + (rainbow ? " balloon--rainbow" : "");
    b.innerHTML = rainbow ? rainbowSvg() : balloonSvg(c.hex);
    b.style.left = Math.random() * 80 + 10 + "%";
    b.style.top = "110%";
    const dur = 5 + Math.random() * 4;
    b.style.animationDuration = dur + "s";

    let popped = false;

    L.onTap(b, (e) => {
      if (popped) return;
      popped = true;
      if (e.stopPropagation) e.stopPropagation();

      const pts = rainbow ? 3 : 1;
      score += pts;
      streak += 1;
      L.tryNewHighScore("popBest", streak, (next) => {
        // Defer slightly so the pop sound and big celebration don't collide.
        setTimeout(() => L.celebrateNewHigh(next), 500);
      });

      L.beep(300 + Math.random() * 400, 0.15, "triangle");
      L.say(c.name);
      updateBadges();

      const burst = document.createElement("div");
      burst.className = "burst";
      burst.textContent = rainbow ? "🌈" : "💥";
      const r = b.getBoundingClientRect();
      const ar = area.getBoundingClientRect();
      burst.style.top = (r.top - ar.top) + "px";
      burst.style.left = (r.left - ar.left) + "px";
      area.appendChild(burst);
      setTimeout(() => burst.remove(), 500);
      b.remove();

      if (STREAK_MILESTONES.includes(streak)) {
        celebrate(`${L.cheer()} ${streak} in a row!`);
        L.happySound();
      }
    });

    area.appendChild(b);

    // If it floats off the top un-popped, reset streak and remove.
    setTimeout(() => {
      if (b.parentNode && !popped) {
        streak = 0;
        updateBadges();
        b.remove();
      }
    }, dur * 1000);
  }

  function start() {
    const area = document.getElementById("popArea");
    area.innerHTML = "";
    score = 0;
    streak = 0;
    updateBadges();

    spawn(area); spawn(area); spawn(area);
    spawnTimer = setInterval(() => spawn(area), 1100);
  }

  function stop() {
    clearInterval(spawnTimer);
    spawnTimer = null;
    const area = document.getElementById("popArea");
    if (area) area.innerHTML = "";
  }

  L.games.pop = { screen: "popGame", start, stop };
})();
