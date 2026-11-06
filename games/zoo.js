// ---------- Zoo! ----------
// A home is shown. Tap the animal that lives there.
// Three big animals, one right answer.
(function () {
  const L = window.Lawson;

  const HOMES = [
    { name: "pond",  line: "Who lives in the pond?",  emoji: "💧", animal: "🦆", said: "Duck" },
    { name: "tree",  line: "Who lives in the tree?",  emoji: "🌳", animal: "🐵", said: "Monkey" },
    { name: "cave",  line: "Who lives in the cave?",  emoji: "🪨", animal: "🐻", said: "Bear" },
    { name: "ice",   line: "Who lives on the ice?",   emoji: "❄️", animal: "🐧", said: "Penguin" },
    { name: "grass", line: "Who lives in the grass?", emoji: "🌾", animal: "🦁", said: "Lion" },
    { name: "night", line: "Who is awake at night?",  emoji: "🌙", animal: "🦉", said: "Owl" },
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
      setTimeout(() => L.celebrateNewHigh(value), 800);
    }
    L.bumpHighScore("zooBest", value);
  }

  function pickRound() {
    const pool = HOMES.filter((h) => h.name !== lastName);
    const next = pool[Math.floor(Math.random() * pool.length)];
    lastName = next.name;
    const others = L.shuffled(HOMES.filter((h) => h !== next)).slice(0, 2);
    return { target: next, choices: L.shuffled([next, ...others]) };
  }

  function newRound() {
    answered = false;
    clearTimeout(activeTimer);
    activeTimer = null;
    const round = pickRound();
    target = round.target;

    const prompt = document.getElementById("zooPrompt");
    if (prompt) prompt.textContent = target.line;

    const home = document.getElementById("zooHome");
    home.textContent = target.emoji;

    const choices = document.getElementById("zooChoices");
    choices.innerHTML = "";
    round.choices.forEach((homeChoice) => {
      const btn = document.createElement("button");
      btn.className = "zoo-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", homeChoice.said);
      btn.textContent = homeChoice.animal;
      L.onTap(btn, (e) => {
        if (answered) return;
        if (e.stopPropagation) e.stopPropagation();
        if (homeChoice === target) {
          L.happySound();
          score += 1;
          L.bumpBadge("zooScoreVal", score);
          if (score > 0 && score % 5 === 0 && L.boboCheer) L.boboCheer();
          maybeCelebrateRecord(score);
          document.getElementById("zooBestVal").textContent = L.getHighScore("zooBest");
          L.say(`${homeChoice.said}! ${L.cheer()}`);
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
          L.bumpBadge("zooScoreVal", 0);
        }
      });
      choices.appendChild(btn);
    });

    activeTimer = setTimeout(() => L.sayPrompt(target.line), 450);
  }

  function start() {
    score = 0;
    bestAtStart = L.getHighScore("zooBest");
    celebrated = false;
    lastName = "";
    L.bumpBadge("zooScoreVal", 0);
    document.getElementById("zooBestVal").textContent = bestAtStart;
    newRound();
  }

  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    clearNext();
  }

  L.games.zoo = { screen: "zooGame", start, stop };
})();
