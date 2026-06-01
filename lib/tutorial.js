// ---------- Tutorial overlays ----------
// Tiny first-visit hint system. Each game registers its own hint
// (a short message + an emoji), and the first time the kid lands on
// that screen the hint slides up at the bottom. Auto-dismisses after
// ~3.5 seconds or on tap. Persistent — once dismissed for a given
// game it never re-fires unless storage is cleared.
(function () {
  const SEEN_PREFIX = "lawson:tutSeen:";

  function hasSeen(gameId) {
    try { return localStorage.getItem(SEEN_PREFIX + gameId) === "1"; }
    catch (_) { return false; }
  }
  function markSeen(gameId) {
    try { localStorage.setItem(SEEN_PREFIX + gameId, "1"); }
    catch (_) {}
  }

  const HINTS = {
    pop: {
      emoji: "🎈",
      text: "Tap balloons to pop them!",
    },
    whack: {
      emoji: "🐹",
      text: "Tap the animals before they hide!",
    },
    find: {
      emoji: "🔍",
      text: "Find the named thing in the scene!",
    },
    cook: {
      emoji: "🥞",
      text: "Tap the bottle to pour pancake batter!",
    },
    dino: {
      emoji: "🦖",
      text: "Drag soap, then shower, then towel!",
    },
    garden: {
      emoji: "🌱",
      text: "Tap a pot, then drag the water!",
    },
    scene: {
      emoji: "🖼️",
      text: "Drag stickers onto the picture!",
    },
  };

  function buildOverlay(gameId, hint) {
    const overlay = document.createElement("div");
    overlay.className = "tutorial-overlay";
    overlay.dataset.tutorial = gameId;
    overlay.innerHTML = `
      <div class="tutorial-pill">
        <span class="tutorial-emoji">${hint.emoji}</span>
        <span class="tutorial-text">${hint.text}</span>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));
    const dismiss = () => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 400);
      overlay.removeEventListener("click", dismiss);
    };
    overlay.addEventListener("click", dismiss);
    setTimeout(dismiss, 3800);
  }

  function showHint(gameId) {
    if (!HINTS[gameId]) return;
    if (hasSeen(gameId)) return;
    markSeen(gameId);
    setTimeout(() => buildOverlay(gameId, HINTS[gameId]), 600);
  }

  // Hook into the L.show flow so any time a game screen opens, we
  // peek at the screen id and offer a hint for it.
  function findGameForScreen(screenId) {
    const games = (window.Lawson && window.Lawson.games) || {};
    for (const id in games) {
      if (games[id] && games[id].screen === screenId) return id;
    }
    return null;
  }

  function install() {
    const L = window.Lawson;
    if (!L || !L.show || L.__tutorialInstalled) return;
    L.__tutorialInstalled = true;
    const origShow = L.show;
    L.show = function (id) {
      const result = origShow.apply(this, arguments);
      const gameId = findGameForScreen(id);
      if (gameId) showHint(gameId);
      return result;
    };
  }

  // Hooking into show() requires that window.Lawson exists by the
  // time we run; defer if needed.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    setTimeout(install, 50);
  }

  // Expose a manual reset for parents tinkering in the console.
  window.__resetTutorials = function () {
    Object.keys(HINTS).forEach((k) => {
      try { localStorage.removeItem(SEEN_PREFIX + k); } catch (_) {}
    });
    console.log("Tutorials reset; next visit to each game will show its hint.");
  };
})();
