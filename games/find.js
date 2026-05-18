// ---------- Find It! ----------
// Hidden-picture game. ~16 items scatter across the screen at random
// positions and rotations. Voice says "Find the apple!" and the kid
// taps it. Five finds per scene, then everything reshuffles with a
// fresh mix of items.
(function () {
  const L = window.Lawson;

  const POOL = [
    { e: "🍎", n: "apple"  },  { e: "🍌", n: "banana"     },
    { e: "🍓", n: "strawberry" }, { e: "🍇", n: "grapes"   },
    { e: "🍉", n: "watermelon"}, { e: "🐶", n: "dog"       },
    { e: "🐱", n: "cat"    },   { e: "🐮", n: "cow"        },
    { e: "🦆", n: "duck"   },   { e: "🐝", n: "bee"        },
    { e: "🐸", n: "frog"   },   { e: "🦁", n: "lion"       },
    { e: "⭐", n: "star"   },   { e: "❤️", n: "heart"      },
    { e: "🌈", n: "rainbow"},   { e: "☀️", n: "sun"        },
    { e: "🌙", n: "moon"   },   { e: "🎈", n: "balloon"    },
    { e: "🚗", n: "car"    },   { e: "🚂", n: "train"      },
    { e: "✈️", n: "plane"  },   { e: "🚀", n: "rocket"     },
    { e: "🌸", n: "flower" },   { e: "🌳", n: "tree"       },
    { e: "🍄", n: "mushroom"},  { e: "🐢", n: "turtle"     },
    { e: "🦋", n: "butterfly"}, { e: "🐌", n: "snail"      },
  ];

  const FINDS_PER_SCENE = 5;
  const SCENE_SIZE = 16;

  let score = 0;
  let targets = [];
  let currentTarget = null;
  let activeTimer = null;
  let busy = false;

  function speakTarget() {
    if (currentTarget) L.say(`Find the ${currentTarget.n}!`);
  }

  function nextTarget() {
    busy = false;
    currentTarget = targets.shift() || null;
    if (!currentTarget) {
      L.happySound();
      L.say(`${L.cheer()} You found them all!`);
      activeTimer = setTimeout(newScene, 1800);
      return;
    }
    const prompt = document.getElementById("findPrompt");
    if (prompt) {
      prompt.innerHTML = `Find the <span class="find-target">${currentTarget.e}</span> <span class="find-target-name">${currentTarget.n}</span>!`;
    }
    speakTarget();
  }

  function newScene() {
    const stage = document.getElementById("findStage");
    if (!stage) return;
    stage.innerHTML = "";

    const scene = L.shuffled(POOL).slice(0, SCENE_SIZE);
    scene.forEach((item) => {
      const el = document.createElement("button");
      el.className = "find-item";
      el.textContent = item.e;
      el.dataset.name = item.n;
      el.dataset.emoji = item.e;
      // Random placement within a 90×85% box so items stay clear of
      // the score badges and prompt bar.
      el.style.left = (4 + Math.random() * 88) + "%";
      el.style.top  = (4 + Math.random() * 84) + "%";
      el.style.transform = `translate(-50%, -50%) rotate(${(Math.random() - 0.5) * 24}deg)`;
      el.style.fontSize = `clamp(40px, ${6 + Math.random() * 3}vw, 90px)`;
      el.style.zIndex = String(Math.floor(Math.random() * 10));
      L.onTap(el, (e) => onTap(item, el, e));
      stage.appendChild(el);
    });

    // Choose 5 targets from items actually on screen.
    targets = L.shuffled(scene.slice()).slice(0, FINDS_PER_SCENE);
    activeTimer = setTimeout(nextTarget, 600);
  }

  function onTap(item, el, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (busy || !currentTarget) return;
    if (item.e === currentTarget.e) {
      busy = true;
      L.happySound();
      score += 1;
      L.bumpBadge("findScoreVal", score);
      if (score >= 20) L.earnSticker && L.earnSticker("finder");
      L.tryNewHighScore("findBest", score, (next) => {
        document.getElementById("findBestVal").textContent = next;
        setTimeout(() => L.celebrateNewHigh(next), 800);
      });
      document.getElementById("findBestVal").textContent = L.getHighScore("findBest");
      el.classList.add("found");
      const p = L.pointOf(e);
      L.sparkleAt(p.x, p.y);
      L.say(`${L.cheer()} ${currentTarget.n}!`);
      activeTimer = setTimeout(nextTarget, 1100);
    } else {
      L.buzzSound();
      el.classList.add("wrong");
      setTimeout(() => el.classList.remove("wrong"), 400);
      speakTarget();
    }
  }

  function start() {
    score = 0;
    busy = false;
    L.bumpBadge("findScoreVal", 0);
    document.getElementById("findBestVal").textContent = L.getHighScore("findBest");
    newScene();
  }
  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    const s = document.getElementById("findStage");
    if (s) s.innerHTML = "";
    currentTarget = null;
    targets = [];
  }

  L.games.find = { screen: "findGame", start, stop };
})();
