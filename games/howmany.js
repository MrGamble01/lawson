// ---------- How Many? ----------
// Visual counting then pick the number. Show N items (1-10), three
// number choices below, pick the right one. Different cognitive task
// from Count (which is tap-each-in-turn). This is "subitize then
// label" — a real pre-math skill.
(function () {
  const L = window.Lawson;

  const ITEMS = [
    { name: "apple",   plural: "apples",      emoji: "🍎" },
    { name: "balloon", plural: "balloons",    emoji: "🎈" },
    { name: "star",    plural: "stars",       emoji: "⭐" },
    { name: "heart",   plural: "hearts",      emoji: "❤️" },
    { name: "fish",    plural: "fish",        emoji: "🐟" },
    { name: "duck",    plural: "ducks",       emoji: "🦆" },
    { name: "car",     plural: "cars",        emoji: "🚗" },
    { name: "cookie",  plural: "cookies",     emoji: "🍪" },
    { name: "flower",  plural: "flowers",     emoji: "🌸" },
    { name: "banana",  plural: "bananas",     emoji: "🍌" },
    { name: "cake",    plural: "cakes",       emoji: "🍰" },
    { name: "ball",    plural: "balls",       emoji: "⚽" },
  ];
  const NUMBER_WORDS = [
    "", "one", "two", "three", "four", "five",
  ];
  // 3-year-olds reliably subitize to ~3-4. Capping at 5 keeps the
  // game in the comfortable-but-stretching zone — high enough to
  // feel like counting, low enough not to frustrate.
  const MAX_N = 5;

  let score = 0;
  let activeTimer = null;
  let answer = 0;
  let lastItem = null;
  let lastN = 0;

  function pickRound() {
    const pool = ITEMS.filter((x) => x !== lastItem);
    const item = pool[Math.floor(Math.random() * pool.length)];
    let n;
    do { n = 1 + Math.floor(Math.random() * MAX_N); } while (n === lastN);
    lastItem = item; lastN = n;
    return { item, n };
  }

  function distractors(correct) {
    const choices = new Set([correct]);
    let tries = 0;
    while (choices.size < 3 && tries++ < 40) {
      // Prefer near-misses (±1, ±2) so the distinction is meaningful.
      const delta = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 3));
      const c = Math.max(1, Math.min(MAX_N, correct + delta));
      if (c !== correct) choices.add(c);
    }
    return L.shuffled([...choices]);
  }

  function newRound() {
    const { item, n } = pickRound();
    answer = n;

    const stage = document.getElementById("howmanyStage");
    stage.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const tile = document.createElement("div");
      tile.className = "howmany-item";
      tile.textContent = item.emoji;
      tile.style.animationDelay = (i * 0.06) + "s";
      stage.appendChild(tile);
    }

    const choicesEl = document.getElementById("howmanyChoices");
    choicesEl.innerHTML = "";
    distractors(n).forEach((c) => {
      const btn = document.createElement("button");
      btn.className = "howmany-choice";
      btn.textContent = c;
      L.onTap(btn, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        if (c === answer) {
          L.happySound();
          score += 1;
          L.bumpBadge("howmanyScoreVal", score);
          if (score >= 10) L.earnSticker && L.earnSticker("mathStar");
          L.tryNewHighScore("howmanyBest", score, (next) => {
            document.getElementById("howmanyBestVal").textContent = next;
            setTimeout(() => L.celebrateNewHigh(next), 800);
          });
          document.getElementById("howmanyBestVal").textContent = L.getHighScore("howmanyBest");
          L.say(`${NUMBER_WORDS[n] || n}! ${L.cheer()}`);
          btn.classList.add("correct");
          const p = L.pointOf(e);
          L.sparkleAt(p.x, p.y);
          clearTimeout(activeTimer);
          activeTimer = setTimeout(newRound, 1800);
        } else {
          L.buzzSound();
          btn.classList.add("wrong");
          setTimeout(() => btn.classList.remove("wrong"), 500);
          L.say("Count them again!");
          score = 0;
          L.bumpBadge("howmanyScoreVal", 0);
        }
      });
      choicesEl.appendChild(btn);
    });

    activeTimer = setTimeout(
      () => L.say(`How many ${n === 1 ? item.name : item.plural}?`),
      450
    );
  }

  function start() {
    score = 0;
    lastItem = null; lastN = 0;
    L.bumpBadge("howmanyScoreVal", 0);
    document.getElementById("howmanyBestVal").textContent = L.getHighScore("howmanyBest");
    newRound();
  }
  function stop() { clearTimeout(activeTimer); activeTimer = null; }

  L.games.howmany = { screen: "howmanyGame", start, stop };
})();
