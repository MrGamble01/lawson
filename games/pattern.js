// ---------- Pattern ----------
// "What comes next?" A repeating sequence with the last cell hidden;
// tap one of three choices to complete it. Templates cover AB, AABB,
// ABB, ABC, AAB so it builds toward real pattern recognition.
(function () {
  const L = window.Lawson;

  // Each set is a single visual theme so a round doesn't mix colors
  // with animals (too noisy for a toddler to read the rule).
  const ITEM_SETS = [
    [{ e: "🔴", n: "red"    }, { e: "🔵", n: "blue"   }, { e: "🟡", n: "yellow" }, { e: "🟢", n: "green" }],
    [{ e: "⭐", n: "star"   }, { e: "❤️", n: "heart"  }, { e: "🌈", n: "rainbow"}],
    [{ e: "🐶", n: "dog"    }, { e: "🐱", n: "cat"    }, { e: "🐮", n: "cow"    }],
    [{ e: "🍎", n: "apple"  }, { e: "🍌", n: "banana" }, { e: "🍇", n: "grapes" }],
    [{ e: "🚗", n: "car"    }, { e: "🚂", n: "train"  }, { e: "✈️", n: "plane"  }],
    [{ e: "🦁", n: "lion"   }, { e: "🐸", n: "frog"   }, { e: "🐝", n: "bee"    }],
  ];

  // Templates use indices into the chosen item set; `answer` is what
  // index appears next. Easy → hard order.
  const PATTERNS = [
    { seq: [0,1,0,1],         answer: 0 }, // ABAB → A
    { seq: [0,1,0,1,0],       answer: 1 }, // ABABA → B
    { seq: [0,0,1,1,0,0],     answer: 1 }, // AABB AA → B
    { seq: [0,1,1,0,1,1],     answer: 0 }, // ABB ABB → A
    { seq: [0,1,2,0,1],       answer: 2 }, // ABC AB → C
    { seq: [0,0,1,0,0],       answer: 1 }, // AAB AA → B
    { seq: [0,1,2,0,1,2,0],   answer: 1 }, // ABC ABC A → B
  ];

  let score = 0;
  let activeTimer = null;

  function newRound() {
    const set = ITEM_SETS[Math.floor(Math.random() * ITEM_SETS.length)];
    const order = L.shuffled(set.map((_, i) => i));
    const tmpl = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];

    const item = (idx) => set[order[idx % order.length]];
    const seq = tmpl.seq.map(item);
    const answer = item(tmpl.answer);

    // Distractors: any other items from the set used in the sequence.
    const used = new Set();
    seq.forEach((s) => used.add(s.e));
    used.add(answer.e);
    const others = set.filter((s) => !used.has(s.e));
    // Fall back to sequence members (other than the answer) if the set
    // is too small for a fresh distractor.
    const fillFrom = (others.length >= 2 ? others : set.filter((s) => s.e !== answer.e));
    const choices = L.shuffled([answer, fillFrom[0], fillFrom[1] || fillFrom[0]]);

    const seqEl = document.getElementById("patternSeq");
    seqEl.innerHTML = "";
    seq.forEach((it) => {
      const c = document.createElement("span");
      c.className = "pattern-cell";
      c.textContent = it.e;
      seqEl.appendChild(c);
    });
    const q = document.createElement("span");
    q.className = "pattern-cell pattern-cell--q";
    q.textContent = "?";
    seqEl.appendChild(q);

    const choicesEl = document.getElementById("patternChoices");
    choicesEl.innerHTML = "";
    choices.forEach((it) => {
      const btn = document.createElement("button");
      btn.className = "pattern-choice";
      btn.textContent = it.e;
      L.onTap(btn, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        if (it.e === answer.e) {
          L.happySound();
          score += 1;
          L.bumpBadge("patternScoreVal", score);
          if (score >= 10) L.earnSticker && L.earnSticker("patternPro");
          L.tryNewHighScore("patternBest", score, (next) => {
            document.getElementById("patternBestVal").textContent = next;
            setTimeout(() => L.celebrateNewHigh(next), 800);
          });
          document.getElementById("patternBestVal").textContent = L.getHighScore("patternBest");

          q.textContent = it.e;
          q.classList.remove("pattern-cell--q");
          q.classList.add("pattern-cell--found");
          L.say(`${L.cheer()} ${answer.n}!`);
          const p = L.pointOf(e);
          L.sparkleAt(p.x, p.y);
          clearTimeout(activeTimer);
          activeTimer = setTimeout(newRound, 1700);
        } else {
          L.buzzSound();
          btn.classList.add("wrong");
          setTimeout(() => btn.classList.remove("wrong"), 500);
          L.say("Try again!");
          score = 0;
          L.bumpBadge("patternScoreVal", 0);
        }
      });
      choicesEl.appendChild(btn);
    });

    activeTimer = setTimeout(() => L.say("What comes next?"), 380);
  }

  function start() {
    score = 0;
    L.bumpBadge("patternScoreVal", 0);
    document.getElementById("patternBestVal").textContent = L.getHighScore("patternBest");
    newRound();
  }
  function stop() { clearTimeout(activeTimer); activeTimer = null; }

  L.games.pattern = { screen: "patternGame", start, stop };
})();
