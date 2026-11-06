// ---------- Picnic! ----------
// A friend is hungry. Tap the food they like.
// Three big snacks, one right answer.
(function () {
  const L = window.Lawson;

  const GUESTS = [
    { name: "bunny",  emoji: "🐰", food: "carrot", foodEmoji: "🥕", said: "Carrot" },
    { name: "dog",    emoji: "🐶", food: "bone",   foodEmoji: "🦴", said: "Bone" },
    { name: "monkey", emoji: "🐵", food: "banana", foodEmoji: "🍌", said: "Banana" },
    { name: "mouse",  emoji: "🐭", food: "cheese", foodEmoji: "🧀", said: "Cheese" },
    { name: "bear",   emoji: "🐻", food: "honey",  foodEmoji: "🍯", said: "Honey" },
    { name: "bird",   emoji: "🐦", food: "berry",  foodEmoji: "🍓", said: "Berry" },
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
    L.bumpHighScore("picnicBest", value);
  }

  function pickRound() {
    const pool = GUESTS.filter((g) => g.name !== lastName);
    const next = pool[Math.floor(Math.random() * pool.length)];
    lastName = next.name;
    const others = L.shuffled(GUESTS.filter((g) => g !== next)).slice(0, 2);
    return { target: next, choices: L.shuffled([next, ...others]) };
  }

  function newRound() {
    answered = false;
    clearTimeout(activeTimer);
    activeTimer = null;
    const round = pickRound();
    target = round.target;
    const question = `Feed the ${target.name}!`;

    const prompt = document.getElementById("picnicPrompt");
    if (prompt) prompt.textContent = question;

    const guest = document.getElementById("picnicGuest");
    guest.textContent = target.emoji;

    const choices = document.getElementById("picnicChoices");
    choices.innerHTML = "";
    round.choices.forEach((guestChoice) => {
      const btn = document.createElement("button");
      btn.className = "picnic-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", guestChoice.said);
      btn.textContent = guestChoice.foodEmoji;
      L.onTap(btn, (e) => {
        if (answered) return;
        if (e.stopPropagation) e.stopPropagation();
        if (guestChoice === target) {
          L.happySound();
          score += 1;
          L.bumpBadge("picnicScoreVal", score);
          if (score > 0 && score % 5 === 0 && L.boboCheer) L.boboCheer();
          maybeCelebrateRecord(score);
          document.getElementById("picnicBestVal").textContent = L.getHighScore("picnicBest");
          L.say(`${guestChoice.said}! ${L.cheer()}`);
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
            () => L.sayPrompt(question),
            { minMs: 450, beatMs: 150, maxMs: 3000 },
          );
          score = 0;
          L.bumpBadge("picnicScoreVal", 0);
        }
      });
      choices.appendChild(btn);
    });

    activeTimer = setTimeout(() => L.sayPrompt(question), 450);
  }

  function start() {
    score = 0;
    bestAtStart = L.getHighScore("picnicBest");
    celebrated = false;
    lastName = "";
    L.bumpBadge("picnicScoreVal", 0);
    document.getElementById("picnicBestVal").textContent = bestAtStart;
    newRound();
  }

  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    clearNext();
  }

  L.games.picnic = { screen: "picnicGame", start, stop };
})();
