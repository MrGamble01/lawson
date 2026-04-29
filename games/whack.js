// ---------- Whack-a-Mole ----------
// Animals pop out of six holes. Tap them before they duck back down.
// Score bumps on every hit; speed ramps up every 5 hits. Occasional
// golden animal is worth 3 points.
(function () {
  const L = window.Lawson;

  const CRITTERS = [
    { emoji: "🐹", name: "hamster" },
    { emoji: "🐰", name: "bunny" },
    { emoji: "🐭", name: "mouse" },
    { emoji: "🐸", name: "frog" },
    { emoji: "🐱", name: "cat" },
    { emoji: "🐶", name: "puppy" },
    { emoji: "🦊", name: "fox" },
    { emoji: "🐻", name: "bear" },
    { emoji: "🐨", name: "koala" },
    { emoji: "🐷", name: "pig" },
  ];

  const HOLE_COUNT = 6;
  const CHEERS = ["Got it!", "Nice!", "Boom!", "Gotcha!", "Yes!"];

  let cycleTimer = null;
  let score = 0;
  let holes = [];
  let popInterval = 1200; // ms between pops; shrinks as score grows

  function makeHoles() {
    const grid = document.getElementById("whackGrid");
    grid.innerHTML = "";
    holes = [];
    for (let i = 0; i < HOLE_COUNT; i++) {
      const hole = document.createElement("div");
      hole.className = "whack-hole";
      hole.innerHTML = `
        <div class="whack-dirt"></div>
        <div class="whack-critter"></div>
      `;
      grid.appendChild(hole);
      const critter = hole.querySelector(".whack-critter");

      let current = null; // { critter object, gold, expireAt }
      let downTimer = null;

      const hit = () => {
        if (!current) return;
        const pts = current.gold ? 3 : 1;
        score += pts;
        L.bumpBadge("whackScoreVal", score);
        const best = L.bumpHighScore("whackBest", score);
        const bestEl = document.getElementById("whackBestVal");
        if (bestEl) bestEl.textContent = best;
        L.happySound();
        L.say(current.gold ? `Gold ${current.critter.name}!` : CHEERS[Math.floor(Math.random() * CHEERS.length)]);

        critter.classList.add("bonk");
        setTimeout(() => critter.classList.remove("bonk"), 300);
        critter.classList.remove("up");
        current = null;
        clearTimeout(downTimer);

        // Speed up every 5 hits (floor at 550ms)
        popInterval = Math.max(550, 1200 - Math.floor(score / 5) * 80);
      };

      L.onTap(critter, hit);
      L.onTap(hole, (e) => {
        // Tapping the dirt near the critter still counts — toddlers aim broadly
        if (current) hit();
      });

      holes.push({
        el: hole,
        critter,
        isUp: () => !!current,
        pop(c, gold) {
          if (current) return false;
          current = { critter: c, gold };
          critter.textContent = c.emoji;
          critter.classList.toggle("gold", gold);
          critter.classList.add("up");
          const upFor = 900 + Math.random() * 700;
          downTimer = setTimeout(() => {
            critter.classList.remove("up");
            current = null;
          }, upFor);
          return true;
        },
        reset() {
          critter.classList.remove("up", "gold", "bonk");
          current = null;
          clearTimeout(downTimer);
        },
      });
    }
  }

  function popRandom() {
    const free = holes.filter((h) => !h.isUp());
    if (!free.length) return;
    const h = free[Math.floor(Math.random() * free.length)];
    const c = CRITTERS[Math.floor(Math.random() * CRITTERS.length)];
    const gold = Math.random() < 0.12;
    h.pop(c, gold);
  }

  function tick() {
    popRandom();
    // Occasional double pop once things are fast
    if (popInterval < 800 && Math.random() < 0.35) popRandom();
    cycleTimer = setTimeout(tick, popInterval);
  }

  function start() {
    score = 0;
    popInterval = 1200;
    L.bumpBadge("whackScoreVal", 0);
    const bestEl = document.getElementById("whackBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("whackBest");
    makeHoles();
    L.say("Tap the animals!");
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
