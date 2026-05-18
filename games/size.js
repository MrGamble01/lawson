// ---------- Big / Small ----------
// Same emoji at two different sizes; voice asks "Tap the bigger one!"
// (or smaller). Trains comparative size — a fundamental pre-math idea
// kids start learning around 2-3.
(function () {
  const L = window.Lawson;

  const ITEMS = [
    "🐶", "🐱", "🐮", "🐷", "🐸", "🐝", "🦁", "🐘", "🦋",
    "⭐", "❤️", "🌈", "☀️", "🌙", "🎈", "🚗", "🚂", "🚀",
    "🍎", "🍌", "🍓", "🍇", "🌸", "🌻", "🍪", "🎂",
  ];

  let score = 0;
  let activeTimer = null;
  let answerIdx = -1;
  let askBigger = true;
  let lastItem = null;

  function pickItem() {
    let it;
    do { it = ITEMS[Math.floor(Math.random() * ITEMS.length)]; } while (it === lastItem);
    lastItem = it;
    return it;
  }

  function newRound() {
    const item = pickItem();
    askBigger = Math.random() < 0.5;
    // Two clearly distinct sizes — generous gap so the comparison is
    // unambiguous for a toddler eye.
    const smallSize = 70;
    const bigSize = 200;
    // Random left/right positioning so the bigger one isn't always one side.
    const leftIsBig = Math.random() < 0.5;
    const leftSize  = leftIsBig ? bigSize : smallSize;
    const rightSize = leftIsBig ? smallSize : bigSize;
    answerIdx = (askBigger ? leftIsBig : !leftIsBig) ? 0 : 1;

    const stage = document.getElementById("sizeStage");
    stage.innerHTML = "";
    [leftSize, rightSize].forEach((sz, i) => {
      const btn = document.createElement("button");
      btn.className = "size-choice";
      btn.textContent = item;
      btn.style.fontSize = sz + "px";
      L.onTap(btn, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        if (i === answerIdx) {
          L.happySound();
          score += 1;
          L.bumpBadge("sizeScoreVal", score);
          if (score >= 8) L.earnSticker && L.earnSticker("sizeWiz");
          L.tryNewHighScore("sizeBest", score, (next) => {
            document.getElementById("sizeBestVal").textContent = next;
            setTimeout(() => L.celebrateNewHigh(next), 700);
          });
          document.getElementById("sizeBestVal").textContent = L.getHighScore("sizeBest");
          btn.classList.add("correct");
          L.say(`${askBigger ? "Bigger" : "Smaller"}! ${L.cheer()}`);
          const p = L.pointOf(e);
          L.sparkleAt(p.x, p.y);
          clearTimeout(activeTimer);
          activeTimer = setTimeout(newRound, 1500);
        } else {
          L.buzzSound();
          btn.classList.add("wrong");
          setTimeout(() => btn.classList.remove("wrong"), 500);
          L.say(`Tap the ${askBigger ? "bigger" : "smaller"} one!`);
          score = 0;
          L.bumpBadge("sizeScoreVal", 0);
        }
      });
      stage.appendChild(btn);
    });

    const prompt = document.getElementById("sizePrompt");
    if (prompt) prompt.textContent = askBigger ? "Tap the BIGGER one!" : "Tap the SMALLER one!";
    activeTimer = setTimeout(() => L.say(askBigger ? "Tap the bigger one!" : "Tap the smaller one!"), 400);
  }

  function start() {
    score = 0;
    lastItem = null;
    L.bumpBadge("sizeScoreVal", 0);
    document.getElementById("sizeBestVal").textContent = L.getHighScore("sizeBest");
    newRound();
  }
  function stop() { clearTimeout(activeTimer); activeTimer = null; }

  L.games.size = { screen: "sizeGame", start, stop };
})();
