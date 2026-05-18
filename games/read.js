// ---------- Read ----------
// Word-recognition game. Show a picture (cat 🐱) and three written
// word choices. Tap the word that matches. Complementary to Spell
// (which is "fill in the missing letter") — here the whole word is
// presented and the kid has to read it.
(function () {
  const L = window.Lawson;

  // Same word pool as Spell so reinforcement transfers between games.
  const PAIRS = [
    { w: "cat", e: "🐱" }, { w: "dog", e: "🐶" }, { w: "pig", e: "🐷" },
    { w: "cow", e: "🐮" }, { w: "bee", e: "🐝" }, { w: "fox", e: "🦊" },
    { w: "owl", e: "🦉" }, { w: "ant", e: "🐜" }, { w: "bat", e: "🦇" },
    { w: "sun", e: "☀️" }, { w: "hat", e: "🎩" }, { w: "bus", e: "🚌" },
    { w: "car", e: "🚗" }, { w: "cup", e: "☕" }, { w: "egg", e: "🥚" },
    { w: "pie", e: "🥧" },
  ];

  let score = 0;
  let activeTimer = null;
  let answer = null;
  let lastWord = null;

  function pickTarget() {
    let p;
    do { p = PAIRS[Math.floor(Math.random() * PAIRS.length)]; }
    while (p.w === lastWord && PAIRS.length > 1);
    lastWord = p.w;
    return p;
  }

  function pickThree(target) {
    const others = L.shuffled(PAIRS.filter((p) => p.w !== target.w)).slice(0, 2);
    return L.shuffled([target, ...others]);
  }

  function newRound() {
    answer = pickTarget();
    const choices = pickThree(answer);

    document.getElementById("readEmoji").textContent = answer.e;
    const choicesEl = document.getElementById("readChoices");
    choicesEl.innerHTML = "";
    choices.forEach((p) => {
      const btn = document.createElement("button");
      btn.className = "read-choice";
      btn.textContent = p.w;
      L.onTap(btn, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        if (p.w === answer.w) {
          L.happySound();
          score += 1;
          L.bumpBadge("readScoreVal", score);
          if (score >= 5) L.earnSticker && L.earnSticker("reader");
          L.tryNewHighScore("readBest", score, (next) => {
            document.getElementById("readBestVal").textContent = next;
            setTimeout(() => L.celebrateNewHigh(next), 800);
          });
          document.getElementById("readBestVal").textContent = L.getHighScore("readBest");

          btn.classList.add("correct");
          L.say(`${answer.w}! ${L.cheer()}`);
          const pt = L.pointOf(e);
          L.sparkleAt(pt.x, pt.y);
          clearTimeout(activeTimer);
          activeTimer = setTimeout(newRound, 1700);
        } else {
          L.buzzSound();
          btn.classList.add("wrong");
          setTimeout(() => btn.classList.remove("wrong"), 500);
          L.say(`Find the word: ${answer.w}!`);
          score = 0;
          L.bumpBadge("readScoreVal", 0);
        }
      });
      choicesEl.appendChild(btn);
    });

    activeTimer = setTimeout(() => L.say(`Which word? Find ${answer.w}!`), 450);
  }

  function start() {
    score = 0;
    lastWord = null;
    L.bumpBadge("readScoreVal", 0);
    document.getElementById("readBestVal").textContent = L.getHighScore("readBest");
    newRound();
  }
  function stop() { clearTimeout(activeTimer); activeTimer = null; }

  L.games.read = { screen: "readGame", start, stop };
})();
