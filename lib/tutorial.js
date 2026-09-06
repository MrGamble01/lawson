// ---------- Tutorial overlays ----------
// Tiny first-visit hint system. Each game registers its own hint
// (a short message + an emoji), and the first time the kid lands on
// that screen the hint slides up at the bottom. Auto-dismisses after
// ~3.5 seconds, on the next tap anywhere, or when the screen changes. Persistent — once dismissed for a given
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
    farm: {
      emoji: "🏡",
      text: "Drag a tool onto an animal to care for it!",
    },
    icecream: {
      emoji: "🍦",
      text: "Drag a flavor onto the cone, then tap Eat!",
    },
    train: {
      emoji: "🚂",
      text: "Tap the engine to drive the train!",
    },
    music: {
      emoji: "🎵",
      text: "Tap the drums, bars, and bells to play!",
    },
  };

  function buildOverlay(gameId, hint) {
    const overlay = document.createElement("div");
    overlay.className = "tutorial-overlay";
    overlay.dataset.tutorial = gameId;
    overlay.setAttribute("role", "status");
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
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("touchstart", dismiss, true);
      window.removeEventListener("lawson:screen", dismiss);
    };
    // The pill lets taps through (CSS pointer-events: none) so the kid's
    // first tap lands on the game, not on the hint; that tap also dismisses it.
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("touchstart", dismiss, true);
    // Leaving the screen takes the hint with it.
    window.addEventListener("lawson:screen", dismiss);
    setTimeout(dismiss, 3800);
  }

  function showHint(gameId) {
    if (!HINTS[gameId]) return;
    if (hasSeen(gameId)) return;
    markSeen(gameId);
    setTimeout(() => buildOverlay(gameId, HINTS[gameId]), 600);
  }

  // Any time a game screen opens (app.js's show() announces it as a
  // lawson:screen event), peek at the screen id and offer a hint for it.
  function findGameForScreen(screenId) {
    const games = (window.Lawson && window.Lawson.games) || {};
    for (const id in games) {
      if (games[id] && games[id].screen === screenId) return id;
    }
    return null;
  }

  window.addEventListener("lawson:screen", (e) => {
    const id = e.detail && e.detail.id;
    const gameId = id && findGameForScreen(id);
    if (gameId) showHint(gameId);
  });

  // Expose a manual reset for parents tinkering in the console.
  window.__resetTutorials = function () {
    Object.keys(HINTS).forEach((k) => {
      try { localStorage.removeItem(SEEN_PREFIX + k); } catch (_) {}
    });
    console.log("Tutorials reset; next visit to each game will show its hint.");
  };
})();
