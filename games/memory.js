// ---------- Memory Match (Concentration) ----------
// Flip cards to find pairs. 12 cards in a 4×3 grid = 6 pairs per round.
// Each round uses a themed set (animals, fruits, vehicles, etc.) and the
// theme rotates each round so it doesn't get stale. High score = number
// of boards cleared in the current session.
(function () {
  const L = window.Lawson;

  // Four items per set = four pairs = eight cards. Twelve cards
  // (six pairs) overtaxed working memory at 3; eight is the sweet
  // spot — challenging enough to feel like a win, doable enough to
  // not frustrate.
  const SETS = [
    [
      { e: "🐶", n: "dog" }, { e: "🐱", n: "cat" }, { e: "🐮", n: "cow" },
      { e: "🐝", n: "bee" },
    ],
    [
      { e: "🍎", n: "apple" }, { e: "🍌", n: "banana" }, { e: "🍓", n: "strawberry" },
      { e: "🍪", n: "cookie" },
    ],
    [
      { e: "🚗", n: "car" }, { e: "🚂", n: "train" }, { e: "✈️", n: "plane" },
      { e: "🚀", n: "rocket" },
    ],
    [
      { e: "⭐", n: "star" }, { e: "❤️", n: "heart" }, { e: "🌈", n: "rainbow" },
      { e: "🎈", n: "balloon" },
    ],
    [
      { e: "🦖", n: "T-Rex" }, { e: "🦕", n: "brontosaurus" }, { e: "🐢", n: "turtle" },
      { e: "🐍", n: "snake" },
    ],
  ];

  const BACK_COLORS = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#da77f2", "#ff922b"];

  let board = null;
  let setIndex = -1;
  let firstPick = null;
  let lock = false;
  let matchedCount = 0;
  let rounds = 0;
  let bestAtStart = 0;
  let celebrated = false;

  function maybeCelebrateRecord(value) {
    if (value > bestAtStart && !celebrated) {
      celebrated = true;
      L.celebrateNewHigh(value);
    }
    L.bumpHighScore("memoryBest", value);
  }

  function makeCard(item, i) {
    const card = document.createElement("button");
    card.className = "memory-card";
    card.dataset.emoji = item.e;
    card.dataset.name = item.n;
    card.setAttribute("aria-label", "Hidden card");
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
    card.setAttribute("aria-label", card.dataset.name);
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
        // A matched pair stays face up and ignores taps; say so in the name.
        a.setAttribute("aria-label", `${a.dataset.name}, matched`);
        b.setAttribute("aria-label", `${b.dataset.name}, matched`);
        L.happySound();
        matchedCount += 2;
        // Bobo cheers on every successful pair — short games, fewer
        // milestones, so each match deserves a celebration.
        L.boboCheer && L.boboCheer();
        lock = false;
        // Cards flip on their own timer; the win cheer waits for the
        // last card's name ("bee") so a late-starting iPad voice is
        // heard before "You matched them all!".
        if (matchedCount === board.children.length) {
          clearNext();
          cancelNext = L.afterSpeech(winRound, { beatMs: 150, minMs: 350, maxMs: 3000 });
        }
      }, 320);
    } else {
      const a = firstPick, b = card;
      firstPick = null;
      lock = true;
      setTimeout(() => {
        a.classList.remove("flipped");
        b.classList.remove("flipped");
        a.setAttribute("aria-label", "Hidden card");
        b.setAttribute("aria-label", "Hidden card");
        L.buzzSound();
        lock = false;
      }, 1100);
    }
  }

  let cancelNext = null;
  function clearNext() {
    if (cancelNext) cancelNext();
    cancelNext = null;
  }

  function winRound() {
    rounds += 1;
    if (rounds >= 3) L.earnSticker && L.earnSticker("memory3");
    L.bumpBadge("memoryScoreVal", rounds);
    maybeCelebrateRecord(rounds);
    const bestEl = document.getElementById("memoryBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("memoryBest");

    L.say(`${L.cheer()} You matched them all!`);
    const r = board.getBoundingClientRect();
    for (let k = 0; k < 14; k++) {
      setTimeout(() => L.sparkleAt(
        r.left + r.width / 2 + (Math.random() - 0.5) * 220,
        r.top  + r.height / 2 + (Math.random() - 0.5) * 220,
      ), k * 55);
    }
    // New board once the cheer has been heard (and not on a screen the
    // kid has already left).
    cancelNext = L.afterSpeech(setupRound, { minMs: 2200 });
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
    bestAtStart = L.getHighScore("memoryBest");
    celebrated = false;
    setIndex = -1;
    L.bumpBadge("memoryScoreVal", 0);
    const bestEl = document.getElementById("memoryBestVal");
    if (bestEl) bestEl.textContent = bestAtStart;
    setupRound();
    // A prompt: repeated once after a quiet spell; the first card's name drops it.
    L.sayPrompt("Find the matching pairs!");
  }

  function stop() {
    clearNext();
    const b = document.getElementById("memoryBoard");
    if (b) b.innerHTML = "";
    firstPick = null;
    lock = false;
  }

  L.games.memory = { screen: "memoryGame", start, stop };
})();
