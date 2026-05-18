// ---------- Spelling Helper ----------
// Show an emoji, the word with one letter blanked out, and three letter
// tiles. Tap the right one to fill the blank. Pre-reading: he hears
// the word, sees it, and picks the missing letter.
(function () {
  const L = window.Lawson;

  // Curated 3-letter words with instantly recognizable single-emoji
  // representations. CVC pattern keeps phonics simple.
  const WORDS = [
    { w: "cat", e: "🐱" },
    { w: "dog", e: "🐶" },
    { w: "pig", e: "🐷" },
    { w: "cow", e: "🐮" },
    { w: "bee", e: "🐝" },
    { w: "fox", e: "🦊" },
    { w: "owl", e: "🦉" },
    { w: "ant", e: "🐜" },
    { w: "bat", e: "🦇" },
    { w: "sun", e: "☀️" },
    { w: "hat", e: "🎩" },
    { w: "bus", e: "🚌" },
    { w: "car", e: "🚗" },
    { w: "cup", e: "☕" },
    { w: "egg", e: "🥚" },
    { w: "pie", e: "🥧" },
  ];

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  let score = 0;
  let activeTimer = null;
  let lastIndex = -1;

  function pickWord() {
    let i;
    do { i = Math.floor(Math.random() * WORDS.length); } while (i === lastIndex);
    lastIndex = i;
    return WORDS[i];
  }

  function randomLetter(excluded) {
    let l;
    do { l = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; } while (excluded.has(l));
    excluded.add(l);
    return l;
  }

  function newRound() {
    const word = pickWord();
    const upper = word.w.toUpperCase();
    const blankIdx = Math.floor(Math.random() * upper.length);
    const correct = upper[blankIdx];

    const excluded = new Set(upper.split("")); // don't repeat any letter in the word
    const choices = L.shuffled([correct, randomLetter(excluded), randomLetter(excluded)]);

    document.getElementById("spellEmoji").textContent = word.e;

    const letters = document.getElementById("spellLetters");
    letters.innerHTML = "";
    upper.split("").forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "spell-letter" + (i === blankIdx ? " blank" : "");
      span.textContent = i === blankIdx ? "?" : ch;
      letters.appendChild(span);
    });

    const choicesEl = document.getElementById("spellChoices");
    choicesEl.innerHTML = "";
    choices.forEach((ch) => {
      const btn = document.createElement("button");
      btn.className = "spell-choice";
      btn.textContent = ch;
      L.onTap(btn, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        if (ch === correct) {
          L.happySound();
          const blankSpan = letters.querySelector(".spell-letter.blank");
          if (blankSpan) {
            blankSpan.textContent = ch;
            blankSpan.classList.remove("blank");
            blankSpan.classList.add("found");
          }
          score += 1;
          L.bumpBadge("spellScoreVal", score);
          if (score >= 5) L.earnSticker && L.earnSticker("speller");
          L.tryNewHighScore("spellBest", score, (next) => {
            document.getElementById("spellBestVal").textContent = next;
            setTimeout(() => L.celebrateNewHigh(next), 900);
          });
          document.getElementById("spellBestVal").textContent = L.getHighScore("spellBest");

          setTimeout(() => L.say(`${word.w}! ${L.cheer()}`), 250);
          const p = L.pointOf(e);
          L.sparkleAt(p.x, p.y);
          clearTimeout(activeTimer);
          activeTimer = setTimeout(newRound, 1900);
        } else {
          L.buzzSound();
          btn.classList.add("wrong");
          setTimeout(() => btn.classList.remove("wrong"), 500);
          L.say(`Find the letter ${correct}!`);
          // Reset streak (not session score) — wrong tap breaks the streak.
          score = 0;
          L.bumpBadge("spellScoreVal", 0);
        }
      });
      choicesEl.appendChild(btn);
    });

    activeTimer = setTimeout(() => {
      L.say(`${word.w}! Find the letter ${correct}.`);
    }, 450);
  }

  function start() {
    score = 0;
    lastIndex = -1;
    L.bumpBadge("spellScoreVal", 0);
    document.getElementById("spellBestVal").textContent = L.getHighScore("spellBest");
    newRound();
  }
  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
  L.games.spell = { screen: "spellGame", start, stop };
})();
