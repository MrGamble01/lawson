// ---------- Add It Up ----------
// Simple addition with visual representation. "2 apples + 3 apples = ?"
// — show two groups of the same emoji, plus and equals symbols, and
// three number choices. Sums capped at 10 so the visual stays readable
// and the choices stay in the same digit range.
(function () {
  const L = window.Lawson;

  const ITEMS = ["🍎", "⭐", "🎈", "🐶", "🌸", "🚗", "🍪", "🍓", "🌟", "🦋"];
  const NUMBER_WORDS = [
    "", "one", "two", "three", "four", "five",
    "six", "seven", "eight", "nine", "ten",
  ];
  const MAX_SUM = 10;

  let score = 0;
  let activeTimer = null;
  let answer = 0;
  let lastSum = -1;

  function pickAddends() {
    // Both 1–5; sum 2–10. Re-roll to avoid identical sum twice in a row.
    let a, b, sum;
    let tries = 0;
    do {
      a = 1 + Math.floor(Math.random() * 5);
      b = 1 + Math.floor(Math.random() * 5);
      sum = a + b;
    } while (sum === lastSum && tries++ < 8);
    lastSum = sum;
    return { a, b, sum };
  }

  function distractors(correct) {
    const set = new Set([correct]);
    let tries = 0;
    while (set.size < 3 && tries++ < 30) {
      const delta = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 3));
      const c = Math.max(1, Math.min(MAX_SUM, correct + delta));
      if (c !== correct) set.add(c);
    }
    return L.shuffled([...set]);
  }

  function group(emoji, n) {
    const g = document.createElement("div");
    g.className = "add-group";
    for (let i = 0; i < n; i++) {
      const e = document.createElement("span");
      e.className = "add-item";
      e.textContent = emoji;
      e.style.animationDelay = (i * 0.05) + "s";
      g.appendChild(e);
    }
    return g;
  }

  function newRound() {
    const { a, b, sum } = pickAddends();
    answer = sum;
    const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];

    const stage = document.getElementById("addStage");
    stage.innerHTML = "";
    stage.appendChild(group(item, a));
    const plus = document.createElement("div");
    plus.className = "add-symbol";
    plus.textContent = "+";
    stage.appendChild(plus);
    stage.appendChild(group(item, b));
    const eq = document.createElement("div");
    eq.className = "add-symbol";
    eq.textContent = "=";
    stage.appendChild(eq);
    const q = document.createElement("div");
    q.className = "add-question";
    q.textContent = "?";
    stage.appendChild(q);

    const choicesEl = document.getElementById("addChoices");
    choicesEl.innerHTML = "";
    distractors(sum).forEach((c) => {
      const btn = document.createElement("button");
      btn.className = "add-choice";
      btn.textContent = c;
      L.onTap(btn, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        if (c === answer) {
          L.happySound();
          score += 1;
          L.bumpBadge("addScoreVal", score);
          if (score >= 8) L.earnSticker && L.earnSticker("mathWiz");
          L.tryNewHighScore("addBest", score, (next) => {
            document.getElementById("addBestVal").textContent = next;
            setTimeout(() => L.celebrateNewHigh(next), 800);
          });
          document.getElementById("addBestVal").textContent = L.getHighScore("addBest");

          q.textContent = c;
          q.classList.add("add-found");
          L.say(`${a} plus ${b} equals ${NUMBER_WORDS[sum] || sum}! ${L.cheer()}`);
          btn.classList.add("correct");
          const p = L.pointOf(e);
          L.sparkleAt(p.x, p.y);
          clearTimeout(activeTimer);
          activeTimer = setTimeout(newRound, 2200);
        } else {
          L.buzzSound();
          btn.classList.add("wrong");
          setTimeout(() => btn.classList.remove("wrong"), 500);
          L.say("Count them all together!");
          score = 0;
          L.bumpBadge("addScoreVal", 0);
        }
      });
      choicesEl.appendChild(btn);
    });

    activeTimer = setTimeout(
      () => L.say(`${NUMBER_WORDS[a]} plus ${NUMBER_WORDS[b]}? How many altogether?`),
      500
    );
  }

  function start() {
    score = 0;
    lastSum = -1;
    L.bumpBadge("addScoreVal", 0);
    document.getElementById("addBestVal").textContent = L.getHighScore("addBest");
    newRound();
  }
  function stop() { clearTimeout(activeTimer); activeTimer = null; }

  L.games.add = { screen: "addGame", start, stop };
})();
