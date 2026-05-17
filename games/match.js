// ---------- Matching game ----------
// "Find the match": show one target up top and three choices below; he taps
// the one that matches. Streak counter persists across sessions so opening
// the app shows the previous best.
(function () {
  const L = window.Lawson;

  const POOL = [
    { emoji: "🐶", name: "dog" },
    { emoji: "🐱", name: "cat" },
    { emoji: "🐮", name: "cow" },
    { emoji: "🐷", name: "pig" },
    { emoji: "🦆", name: "duck" },
    { emoji: "🐑", name: "sheep" },
    { emoji: "🐴", name: "horse" },
    { emoji: "🦁", name: "lion" },
    { emoji: "🐸", name: "frog" },
    { emoji: "🐵", name: "monkey" },
    { emoji: "🐘", name: "elephant" },
    { emoji: "🐝", name: "bee" },
    { emoji: "🍎", name: "apple" },
    { emoji: "🍌", name: "banana" },
    { emoji: "🍓", name: "strawberry" },
    { emoji: "🍇", name: "grapes" },
    { emoji: "🍉", name: "watermelon" },
    { emoji: "🥕", name: "carrot" },
    { emoji: "🌽", name: "corn" },
    { emoji: "⭐", name: "star" },
    { emoji: "❤️", name: "heart" },
    { emoji: "🌈", name: "rainbow" },
    { emoji: "☀️", name: "sun" },
    { emoji: "🌙", name: "moon" },
    { emoji: "⚽", name: "ball" },
    { emoji: "🚗", name: "car" },
    { emoji: "🚂", name: "train" },
    { emoji: "✈️", name: "plane" },
    { emoji: "🚀", name: "rocket" },
    { emoji: "🎈", name: "balloon" },
    { emoji: "🎁", name: "present" },
    { emoji: "🌸", name: "flower" },
  ];

  function pickRandom(arr, n) {
    const copy = arr.slice();
    const out = [];
    while (out.length < n && copy.length) {
      const i = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(i, 1)[0]);
    }
    return out;
  }

  let score = 0;

  function newRound(speakPrompt) {
    const target = document.getElementById("matchTarget");
    const choices = document.getElementById("matchChoices");
    target.innerHTML = "";
    choices.innerHTML = "";

    const [answer, d1, d2] = pickRandom(POOL, 3);
    const options = [answer, d1, d2].sort(() => Math.random() - 0.5);

    const targetEl = document.createElement("div");
    targetEl.className = "match-target-item";
    targetEl.textContent = answer.emoji;
    L.onTap(targetEl, () => L.say(`Find the ${answer.name}`));
    target.appendChild(targetEl);

    if (speakPrompt) L.say(`Find the ${answer.name}`);

    options.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "match-choice";
      btn.textContent = item.emoji;
      L.onTap(btn, (e) => {
        if (item.emoji === answer.emoji) {
          L.happySound();
          score += 1;
          L.bumpBadge("matchScoreVal", score);
          const best = L.tryNewHighScore("matchBest", score, (next) => {
            document.getElementById("matchBestVal").textContent = next;
            setTimeout(() => L.celebrateNewHigh(next), 700);
          });
          document.getElementById("matchBestVal").textContent = best;

          const c = L.cheer();
          if (score % 5 === 0) L.say(`${c} ${score} in a row!`);
          else                 L.say(c);

          btn.classList.add("correct");
          const p = L.pointOf(e);
          L.sparkleAt(p.x, p.y);
          setTimeout(() => newRound(true), 1300);
        } else {
          L.buzzSound();
          L.say(`Find the ${answer.name}`);
          btn.classList.add("wrong");
          setTimeout(() => btn.classList.remove("wrong"), 500);
        }
      });
      choices.appendChild(btn);
    });
  }

  function start() {
    score = 0;
    document.getElementById("matchScoreVal").textContent = "0";
    document.getElementById("matchBestVal").textContent = L.getHighScore("matchBest");
    newRound(true);
  }

  function stop() {}

  L.games.match = { screen: "matchGame", start, stop };
})();
