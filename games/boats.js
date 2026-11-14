// ---------- Boats! ----------
// A stretch of water is shown. Tap the boat that belongs there.
// Three big boats, one right answer.
(function () {
  const L = window.Lawson;

  const WATERS = [
    { name: "pond",    line: "Who floats on the pond?",    emoji: "💧", boat: "🛶", said: "Canoe" },
    { name: "ocean",   line: "Who sails the ocean?",       emoji: "🌊", boat: "⛵", said: "Sailboat" },
    { name: "harbor",  line: "Who docks at the harbor?",   emoji: "⚓", boat: "🚢", said: "Ship" },
    { name: "river",   line: "Who races the river?",       emoji: "🏞️", boat: "🚤", said: "Speedboat" },
    { name: "island",  line: "Who reaches the island?",    emoji: "🏝️", boat: "⛴️", said: "Ferry" },
    { name: "storm",   line: "Who rides out the storm?",   emoji: "⛈️", boat: "🛟", said: "Lifeboat" },
  ];

  let score = 0;
  let answered = false;
  let activeTimer = null;
  let cancelNext = null;
  let target = null;
  let lastName = "";
  let bestAtStart = 0;
  let celebrated = false;

  function clearNext() { if (cancelNext) cancelNext(); cancelNext = null; }

  function maybeCelebrateRecord(value) {
    if (value > bestAtStart && !celebrated) {
      celebrated = true;
      (L.whileHere || setTimeout)(() => L.celebrateNewHigh(value), 800);
    }
    L.bumpHighScore("boatsBest", value);
  }

  function pickRound() {
    const pool = WATERS.filter((w) => w.name !== lastName);
    const next = pool[Math.floor(Math.random() * pool.length)];
    lastName = next.name;
    const others = L.shuffled(WATERS.filter((w) => w !== next)).slice(0, 2);
    return { target: next, choices: L.shuffled([next, ...others]) };
  }

  function newRound() {
    answered = false;
    clearTimeout(activeTimer);
    activeTimer = null;
    const round = pickRound();
    target = round.target;

    const prompt = document.getElementById("boatsPrompt");
    if (prompt) prompt.textContent = target.line;

    const water = document.getElementById("boatsWater");
    water.textContent = target.emoji;

    const choices = document.getElementById("boatsChoices");
    choices.innerHTML = "";
    round.choices.forEach((waterChoice) => {
      const btn = document.createElement("button");
      btn.className = "boat-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", waterChoice.said);
      btn.textContent = waterChoice.boat;
      L.onTap(btn, (e) => {
        if (answered) return;
        if (e.stopPropagation) e.stopPropagation();
        if (waterChoice === target) {
          L.happySound();
          score += 1;
          L.bumpBadge("boatsScoreVal", score);
          if (score > 0 && score % 5 === 0 && L.boboCheer) L.boboCheer();
          maybeCelebrateRecord(score);
          document.getElementById("boatsBestVal").textContent = L.getHighScore("boatsBest");
          L.say(`${waterChoice.said}! ${L.cheer()}`);
          btn.classList.add("correct");
          const p = L.pointOf(e);
          L.sparkleAt(p.x, p.y);
          clearTimeout(activeTimer);
          activeTimer = null;
          clearNext();
          answered = true;
          cancelNext = L.afterSpeech(newRound, { minMs: 1600 });
        } else {
          L.buzzSound();
          btn.classList.add("wrong");
          setTimeout(() => btn.classList.remove("wrong"), 450);
          clearTimeout(activeTimer);
          activeTimer = null;
          clearNext();
          L.say("Try again!");
          cancelNext = L.afterSpeech(
            () => L.sayPrompt(target.line),
            { minMs: 450, beatMs: 150, maxMs: 3000 },
          );
          score = 0;
          L.bumpBadge("boatsScoreVal", 0);
        }
      });
      choices.appendChild(btn);
    });

    activeTimer = setTimeout(() => L.sayPrompt(target.line), 450);
  }

  function start() {
    score = 0;
    bestAtStart = L.getHighScore("boatsBest");
    celebrated = false;
    lastName = "";
    L.bumpBadge("boatsScoreVal", 0);
    document.getElementById("boatsBestVal").textContent = bestAtStart;
    newRound();
  }

  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    clearNext();
  }

  L.games.boats = { screen: "boatsGame", start, stop };
})();
