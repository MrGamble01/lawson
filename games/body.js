// ---------- Body Parts ----------
// A friendly cartoon face. Voice says "Tap the nose!" and the kid taps
// the right region. Parts are SVG groups with data-name; taps bubble up
// via closest() so even tapping a sub-element (like the pupil inside
// the eye) still counts as a hit on its parent part.
(function () {
  const L = window.Lawson;

  // Five tappable parts grouped so child elements inherit the hit area.
  const FACE_SVG = `
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" class="body-face">
      <!-- hair (behind head) -->
      <g class="part" data-name="hair">
        <path d="M60 200 C 70 60, 330 60, 340 200 C 320 130, 80 130, 60 200 Z"
              fill="#8b5a3c" stroke="#222" stroke-width="5"/>
      </g>
      <!-- ears (behind head edges) -->
      <g class="part" data-name="ears">
        <ellipse cx="55"  cy="220" rx="22" ry="42" fill="#ffe0b2" stroke="#222" stroke-width="5"/>
        <ellipse cx="345" cy="220" rx="22" ry="42" fill="#ffe0b2" stroke="#222" stroke-width="5"/>
      </g>
      <!-- head -->
      <ellipse cx="200" cy="220" rx="150" ry="170" fill="#ffe0b2" stroke="#222" stroke-width="6"/>
      <!-- eyebrows -->
      <g class="part" data-name="eyebrows">
        <path d="M105 165 Q 135 145 165 165" stroke="#5a3a20" stroke-width="9" fill="none" stroke-linecap="round"/>
        <path d="M235 165 Q 265 145 295 165" stroke="#5a3a20" stroke-width="9" fill="none" stroke-linecap="round"/>
      </g>
      <!-- eyes -->
      <g class="part" data-name="eyes">
        <ellipse cx="135" cy="200" rx="28" ry="22" fill="#fff" stroke="#222" stroke-width="4"/>
        <circle  cx="138" cy="200" r="12" fill="#3b5998"/>
        <circle  cx="142" cy="196" r="4"  fill="#fff"/>
        <ellipse cx="265" cy="200" rx="28" ry="22" fill="#fff" stroke="#222" stroke-width="4"/>
        <circle  cx="262" cy="200" r="12" fill="#3b5998"/>
        <circle  cx="266" cy="196" r="4"  fill="#fff"/>
      </g>
      <!-- nose -->
      <g class="part" data-name="nose">
        <path d="M200 220 Q 175 260 195 280 Q 210 285 220 270 Q 220 245 200 220 Z"
              fill="#ffc890" stroke="#222" stroke-width="4" stroke-linejoin="round"/>
      </g>
      <!-- mouth -->
      <g class="part" data-name="mouth">
        <path d="M140 320 Q 200 370 260 320 Q 200 340 140 320 Z"
              fill="#ff7a7a" stroke="#222" stroke-width="5" stroke-linejoin="round"/>
      </g>
    </svg>`;

  const PARTS = ["eyes", "nose", "mouth", "ears", "hair", "eyebrows"];

  let score = 0;
  let activeTimer = null;
  let target = null;
  let lastTarget = null;
  let tapAttached = false;

  function speakClue() {
    if (target) L.say(`Tap the ${target}!`);
  }

  function handleTap(e) {
    const node = e.target && e.target.closest && e.target.closest("[data-name]");
    if (!node) return;
    const name = node.getAttribute("data-name");
    if (name === target) {
      L.happySound();
      score += 1;
      L.bumpBadge("bodyScoreVal", score);
      if (score >= 8) L.earnSticker && L.earnSticker("bodyPro");
      L.tryNewHighScore("bodyBest", score, (next) => {
        document.getElementById("bodyBestVal").textContent = next;
        setTimeout(() => L.celebrateNewHigh(next), 700);
      });
      document.getElementById("bodyBestVal").textContent = L.getHighScore("bodyBest");
      L.say(`${target}! ${L.cheer()}`);
      node.classList.add("found");
      setTimeout(() => node.classList.remove("found"), 700);
      const p = L.pointOf(e);
      L.sparkleAt(p.x, p.y);
      clearTimeout(activeTimer);
      activeTimer = setTimeout(nextTarget, 1300);
    } else {
      L.buzzSound();
      L.say(`Find the ${target}!`);
      node.classList.add("wrong");
      setTimeout(() => node.classList.remove("wrong"), 400);
      score = 0;
      L.bumpBadge("bodyScoreVal", 0);
    }
  }

  function nextTarget() {
    do {
      target = PARTS[Math.floor(Math.random() * PARTS.length)];
    } while (target === lastTarget && PARTS.length > 1);
    lastTarget = target;
    const prompt = document.getElementById("bodyPrompt");
    if (prompt) prompt.textContent = `Tap the ${target}!`;
    speakClue();
  }

  function start() {
    score = 0;
    L.bumpBadge("bodyScoreVal", 0);
    document.getElementById("bodyBestVal").textContent = L.getHighScore("bodyBest");
    const stage = document.getElementById("bodyFace");
    if (!stage) return;
    stage.innerHTML = FACE_SVG;

    // Delegate taps from the whole stage so child elements (pupils,
    // mouth gradient) bubble up to their named parent group. Guarded
    // against re-attachment on game re-entry.
    if (!tapAttached) {
      L.onTap(stage, handleTap);
      tapAttached = true;
    }

    nextTarget();
  }
  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
  }

  L.games.body = { screen: "bodyGame", start, stop };
})();
