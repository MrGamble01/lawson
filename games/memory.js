// ---------- Memory Match (Concentration) ----------
// Flip cards to find pairs. 12 cards in a 4×3 grid = 6 pairs per round.
// Each round uses a themed set (animals, fruits, vehicles, etc.) and the
// theme rotates each round so it doesn't get stale. High score = number
// of boards cleared in the current session.
(function () {
  const L = window.Lawson;

  const SETS = [
    [
      { e: "🐶", n: "dog" }, { e: "🐱", n: "cat" }, { e: "🐮", n: "cow" },
      { e: "🦁", n: "lion" }, { e: "🐸", n: "frog" }, { e: "🐝", n: "bee" },
    ],
    [
      { e: "🍎", n: "apple" }, { e: "🍌", n: "banana" }, { e: "🍓", n: "strawberry" },
      { e: "🍇", n: "grapes" }, { e: "🍉", n: "watermelon" }, { e: "🍪", n: "cookie" },
    ],
    [
      { e: "🚗", n: "car" }, { e: "🚂", n: "train" }, { e: "✈️", n: "plane" },
      { e: "🚀", n: "rocket" }, { e: "⛵", n: "boat" }, { e: "🚒", n: "fire truck" },
    ],
    [
      { e: "⭐", n: "star" }, { e: "❤️", n: "heart" }, { e: "🌈", n: "rainbow" },
      { e: "☀️", n: "sun" }, { e: "🌙", n: "moon" }, { e: "🎈", n: "balloon" },
    ],
    [
      { e: "🦖", n: "T-Rex" }, { e: "🦕", n: "brontosaurus" }, { e: "🐢", n: "turtle" },
      { e: "🐊", n: "crocodile" }, { e: "🦎", n: "lizard" }, { e: "🐍", n: "snake" },
    ],
  ];

  const BACK_COLORS = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#da77f2", "#ff922b"];

  let board = null;
  let setIndex = -1;
  let firstPick = null;
  let lock = false;
  let matchedCount = 0;
  let rounds = 0;

  function makeCard(item, i) {
    const card = document.createElement("button");
    card.className = "memory-card";
    card.dataset.emoji = item.e;
    card.dataset.name = item.n;
    card.innerHTML = `
      <div class="memory-card-inner">
        <div class="memory-face memory-face--back" style="--c:${BACK_COLORS[i % BACK_COLORS.length]}"><span>✨</span></div>
        <div class="memory-face memory-face--front">${item.e}</div>
      </div>`;
    L.onTap(card, () => onPick(card));
    return card;
  }

  function onPick(card) {
    if (lock) return;
    if (card.classList.contains("matched")) return;
    if (card.classList.contains("flipped")) return;

    card.classList.add("flipped");
    L.beep(500 + Math.random() * 250, 0.08, "triangle");
    L.say(card.dataset.name, 1.05);

    if (!firstPick) {
      firstPick = card;
      return;
    }

    if (firstPick.dataset.emoji === card.dataset.emoji) {
      const a = firstPick, b = card;
      firstPick = null;
      lock = true;
      setTimeout(() => {
        a.classList.add("matched");
        b.classList.add("matched");
        L.happySound();
        matchedCount += 2;
        lock = false;
        if (matchedCount === board.children.length) winRound();
      }, 320);
    } else {
      const a = firstPick, b = card;
      firstPick = null;
      lock = true;
      setTimeout(() => {
        a.classList.remove("flipped");
        b.classList.remove("flipped");
        L.buzzSound();
        lock = false;
      }, 1100);
    }
  }

  function winRound() {
    rounds += 1;
    L.bumpBadge("memoryScoreVal", rounds);
    L.tryNewHighScore("memoryBest", rounds, (next) => {
      document.getElementById("memoryBestVal").textContent = next;
      L.celebrateNewHigh(next);
    });
    const bestEl = document.getElementById("memoryBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("memoryBest");

    setTimeout(() => {
      L.say(`${L.cheer()} You matched them all!`);
      const r = board.getBoundingClientRect();
      for (let k = 0; k < 14; k++) {
        setTimeout(() => L.sparkleAt(
          r.left + r.width / 2 + (Math.random() - 0.5) * 220,
          r.top  + r.height / 2 + (Math.random() - 0.5) * 220,
        ), k * 55);
      }
      setTimeout(setupRound, 2200);
    }, 350);
  }

  function setupRound() {
    board = document.getElementById("memoryBoard");
    if (!board) return;
    board.innerHTML = "";
    matchedCount = 0;
    firstPick = null;
    lock = false;
    setIndex = (setIndex + 1) % SETS.length;
    const cards = L.shuffled([...SETS[setIndex], ...SETS[setIndex]]);
    cards.forEach((it, i) => board.appendChild(makeCard(it, i)));
  }

  function start() {
    rounds = 0;
    setIndex = -1;
    L.bumpBadge("memoryScoreVal", 0);
    const bestEl = document.getElementById("memoryBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("memoryBest");
    setupRound();
    L.say("Find the matching pairs!");
  }

  function stop() {
    const b = document.getElementById("memoryBoard");
    if (b) b.innerHTML = "";
    firstPick = null;
    lock = false;
  }

  L.games.memory = { screen: "memoryGame", start, stop };
})();
