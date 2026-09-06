// ---------- Counting ----------
// One round shows N (1-5) of the same item scattered across the screen.
// "Count the apples!" — Lawson taps each one in turn; voice counts along
// ("one... two... three...") and each tapped item gets a green check.
// When all are tapped, total is announced and a new round starts.
// High score = total items counted across the session-long run.
(function () {
  const L = window.Lawson;

  const ITEMS = [
    { name: "apple",      plural: "apples",      emoji: "🍎" },
    { name: "banana",     plural: "bananas",     emoji: "🍌" },
    { name: "star",       plural: "stars",       emoji: "⭐" },
    { name: "heart",      plural: "hearts",      emoji: "❤️" },
    { name: "balloon",    plural: "balloons",    emoji: "🎈" },
    { name: "flower",     plural: "flowers",     emoji: "🌸" },
    { name: "fish",       plural: "fish",        emoji: "🐟" },
    { name: "duck",       plural: "ducks",       emoji: "🦆" },
    { name: "car",        plural: "cars",        emoji: "🚗" },
    { name: "cookie",     plural: "cookies",     emoji: "🍪" },
    { name: "strawberry", plural: "strawberries",emoji: "🍓" },
    { name: "cake",       plural: "cakes",       emoji: "🍰" },
  ];

  const NUMBER_WORDS = ["", "one", "two", "three", "four", "five"];

  let total = 0;
  let activeTimer = null;
  let cancelNext = null;
  function clearNext() { if (cancelNext) cancelNext(); cancelNext = null; }
  let bestAtStart = 0;
  let celebrated = false;

  function maybeCelebrateRecord(value) {
    if (value > bestAtStart && !celebrated) {
      celebrated = true;
      setTimeout(() => L.celebrateNewHigh(value), 900);
    }
    L.bumpHighScore("countBest", value);
  }

  function chooseRound(prevItem) {
    // Pick a different item from last round, count between 1 and 5.
    const pool = ITEMS.filter((x) => x !== prevItem);
    const item = pool[Math.floor(Math.random() * pool.length)];
    const n = 1 + Math.floor(Math.random() * 5);
    return { item, n };
  }

  function startRound(prevItem) {
    const stage = document.getElementById("countStage");
    const prompt = document.getElementById("countPrompt");
    const { item, n } = chooseRound(prevItem);

    prompt.textContent = `Count the ${n === 1 ? item.name : item.plural}!`;

    stage.innerHTML = "";
    let tappedSoFar = 0;
    const tiles = [];

    for (let i = 0; i < n; i++) {
      const tile = document.createElement("button");
      tile.className = "count-item";
      tile.textContent = item.emoji;
      tile.setAttribute("aria-label", item.name);
      // Stagger entry slightly for a satisfying cascade.
      tile.style.animationDelay = (i * 0.06) + "s";

      L.onTap(tile, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        if (tile.classList.contains("counted")) return;

        tappedSoFar += 1;
        total += 1;
        tile.classList.add("counted");
        L.beep(400 + tappedSoFar * 80, 0.12, "triangle");
        L.say(NUMBER_WORDS[tappedSoFar] || String(tappedSoFar));
        L.bumpBadge("countScoreVal", total);
        if (total >= 25) L.earnSticker && L.earnSticker("count25");
        maybeCelebrateRecord(total);
        document.getElementById("countBestVal").textContent = L.getHighScore("countBest");

        if (tappedSoFar === n) {
          // Wait for the spoken number, then announce the total + cheer.
          activeTimer = setTimeout(() => {
            L.happySound();
            L.say(`There ${n === 1 ? "is" : "are"} ${NUMBER_WORDS[n]} ${n === 1 ? item.name : item.plural}. ${L.cheer()}`);
            // Confetti from the center of the stage.
            const r = stage.getBoundingClientRect();
            for (let k = 0; k < 6; k++) {
              setTimeout(() => L.sparkleAt(
                r.left + r.width / 2 + (Math.random() - 0.5) * 80,
                r.top  + r.height / 2 + (Math.random() - 0.5) * 80,
              ), k * 50);
            }
            // Next round, once the total and the cheer have been heard.
            clearNext();
            cancelNext = L.afterSpeech(() => startRound(item), { minMs: 2400 });
          }, 600);
        }
      });

      tiles.push(tile);
      stage.appendChild(tile);
    }

    // Voice prompt after a beat so it doesn't fight the navigation chime.
    activeTimer = setTimeout(() => L.say(prompt.textContent), 350);
  }

  function start() {
    total = 0;
    bestAtStart = L.getHighScore("countBest");
    celebrated = false;
    L.bumpBadge("countScoreVal", 0);
    document.getElementById("countBestVal").textContent = bestAtStart;
    startRound(null);
  }

  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    clearNext();
    const stage = document.getElementById("countStage");
    if (stage) stage.innerHTML = "";
  }

  L.games.count = { screen: "countGame", start, stop };
})();
