// ---------- Cook! (pancakes) ----------
// One satisfying loop:
//   tap batter  → pour into pan + bubbles appear
//   tap spatula → pancake flips, lands golden
//   tap pancake → flies onto a growing stack on the plate
// Every 3 pancakes is a "yum!" moment with confetti. No fail state,
// no time pressure — just the tactile chain of taps Lawson loves
// in the cooking game on his iPad.
(function () {
  const L = window.Lawson;

  const STATES = {
    IDLE: "idle",
    POURING: "pouring",
    RAW: "raw",
    FLIPPABLE: "flippable",
    FLIPPING: "flipping",
    COOKED: "cooked",
    PLATING: "plating",
  };

  let state = STATES.IDLE;
  let stack = 0;
  let bestAtStart = 0;
  let celebrated = false;
  let timers = [];

  function setT(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }
  function $(id) { return document.getElementById(id); }

  // -------- SVG art --------
  // Top-down pan with a wooden handle. Inner ring is the cooking
  // surface where the pancake lives.
  const PAN_SVG = `
    <svg viewBox="0 0 280 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="120" cy="180" rx="115" ry="10" fill="rgba(0,0,0,0.22)"/>
      <ellipse cx="120" cy="105" rx="105" ry="80" fill="#1a1a1a"/>
      <ellipse cx="120" cy="100" rx="95" ry="70" fill="#2a2a2a"/>
      <ellipse cx="120" cy="92"  rx="86" ry="58" fill="#161616"/>
      <ellipse cx="100" cy="74"  rx="22" ry="6"  fill="rgba(255,255,255,0.06)"/>
      <rect x="218" y="92" width="56" height="22" rx="5" fill="#6a3f1a" stroke="#3a2208" stroke-width="2"/>
      <rect x="270" y="96" width="8" height="14" rx="2" fill="#3a2208"/>
    </svg>`;

  // Squeeze bottle of pancake mix.
  const BATTER_SVG = `
    <svg viewBox="0 0 90 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="34" y="2" width="22" height="12" rx="3" fill="#8a8a8a"/>
      <path d="M28 14 L 62 14 L 68 32 L 68 130 Q 68 142 56 142 L 34 142 Q 22 142 22 130 L 22 32 Z"
            fill="#fff8e1" stroke="#2a2a2a" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="26" y="60" width="38" height="42" rx="5" fill="#ffb84d"/>
      <text x="45" y="88" text-anchor="middle" font-size="16" font-weight="900"
            font-family="Arial Black, Arial, sans-serif" fill="#5a3000">MIX</text>
      <ellipse cx="34" cy="40" rx="6" ry="10" fill="rgba(255,255,255,0.6)"/>
    </svg>`;

  // Wooden-handled flipper.
  const SPATULA_SVG = `
    <svg viewBox="0 0 90 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="40" y="6" width="10" height="80" rx="3" fill="#6a3f1a"/>
      <rect x="38" y="12" width="2" height="60" fill="#3a2208"/>
      <path d="M16 84 L 74 84 Q 80 84 80 92 L 80 134 Q 80 148 64 148 L 26 148 Q 10 148 10 134 L 10 92 Q 10 84 16 84 Z"
            fill="#c0c0c0" stroke="#5a5a5a" stroke-width="2"/>
      <line x1="22" y1="100" x2="68" y2="100" stroke="#9a9a9a" stroke-width="2"/>
      <line x1="22" y1="116" x2="68" y2="116" stroke="#9a9a9a" stroke-width="2"/>
      <line x1="22" y1="132" x2="68" y2="132" stroke="#9a9a9a" stroke-width="2"/>
    </svg>`;

  // White plate with subtle blue rim, viewed slightly from above.
  const PLATE_SVG = `
    <svg viewBox="0 0 240 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="120" cy="78" rx="115" ry="8" fill="rgba(0,0,0,0.18)"/>
      <ellipse cx="120" cy="46" rx="118" ry="36" fill="#fff"/>
      <ellipse cx="120" cy="42" rx="118" ry="36" fill="#f5f3ef"/>
      <ellipse cx="120" cy="42" rx="98"  ry="28" fill="#fff"/>
      <ellipse cx="120" cy="38" rx="98"  ry="28" fill="none" stroke="#4dabf7" stroke-width="3" opacity="0.45"/>
    </svg>`;

  // -------- Layout --------
  function build() {
    const stage = $("cookStage");
    stage.innerHTML = `
      <div class="cook-tools">
        <button class="cook-tool cook-tool--batter" id="cookBatter" aria-label="Pour batter">${BATTER_SVG}</button>
        <button class="cook-tool cook-tool--spatula" id="cookSpatula" aria-label="Flip pancake" disabled>${SPATULA_SVG}</button>
      </div>
      <div class="cook-pan" id="cookPan">
        ${PAN_SVG}
        <div class="cook-pancake" id="cookPancake" aria-label="Pancake"></div>
        <div class="cook-bubbles" id="cookBubbles"></div>
      </div>
      <div class="cook-plate-area">
        <div class="cook-stack" id="cookStack"></div>
        <div class="cook-plate">${PLATE_SVG}</div>
      </div>`;
    L.onTap($("cookBatter"), pour);
    L.onTap($("cookSpatula"), flip);
    L.onTap($("cookPancake"), onPancakeTap);
  }

  function setState(s) {
    state = s;
    document.body.dataset.cookState = s;
  }

  function updateBadge() {
    L.bumpBadge("cookScoreVal", stack);
    const bestEl = $("cookBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("cookBest");
  }

  function maybeCelebrateRecord(value) {
    if (value > bestAtStart && !celebrated) {
      celebrated = true;
      L.celebrateNewHigh(value);
    }
    L.bumpHighScore("cookBest", value);
  }

  // -------- Pour batter --------
  function pour() {
    if (state !== STATES.IDLE) return;
    setState(STATES.POURING);
    // Glug-glug pour sound: descending triangle tones.
    L.beep(620, 0.10, "triangle", 0.00);
    L.beep(540, 0.10, "triangle", 0.10);
    L.beep(460, 0.12, "triangle", 0.22);
    L.haptic(8);
    L.say("Pour the batter!");

    const batter = $("cookBatter");
    batter.classList.add("pouring");
    setT(900, () => batter.classList.remove("pouring"));

    const p = $("cookPancake");
    p.className = "cook-pancake cook-pancake--pouring";
    setT(950, () => {
      p.className = "cook-pancake cook-pancake--raw";
      setState(STATES.RAW);
      // Bubbles fade in over ~2s, then it's flippable.
      const bubbles = $("cookBubbles");
      bubbles.innerHTML = "";
      const positions = [
        { x: 38, y: 40 }, { x: 58, y: 38 },
        { x: 46, y: 58 }, { x: 64, y: 55 }, { x: 52, y: 48 },
      ];
      positions.forEach((pos, i) => {
        setT(500 + i * 380, () => {
          if (state !== STATES.RAW) return;
          const b = document.createElement("div");
          b.className = "cook-bubble";
          b.style.left = pos.x + "%";
          b.style.top = pos.y + "%";
          bubbles.appendChild(b);
          // Tiny sizzle blip per bubble.
          L.beep(900 + Math.random() * 600, 0.04, "sine");
        });
      });
      setT(2800, () => {
        if (state !== STATES.RAW) return;
        setState(STATES.FLIPPABLE);
        $("cookSpatula").disabled = false;
        $("cookSpatula").classList.add("ready");
        L.say("Now flip it!");
      });
    });
  }

  // -------- Flip --------
  function flip() {
    if (state !== STATES.FLIPPABLE) return;
    setState(STATES.FLIPPING);
    L.beep(380, 0.18, "triangle");
    L.haptic(12);
    L.say("Flip!");
    const p = $("cookPancake");
    const sp = $("cookSpatula");
    sp.disabled = true;
    sp.classList.remove("ready");
    sp.classList.add("flipping");
    setT(450, () => sp.classList.remove("flipping"));
    $("cookBubbles").innerHTML = "";
    p.classList.add("cook-pancake--flipping");
    setT(780, () => {
      p.className = "cook-pancake cook-pancake--cooked";
      setState(STATES.COOKED);
      L.beep(720, 0.08, "triangle");
      L.say("Yummy!");
    });
  }

  // -------- Plate --------
  function onPancakeTap() {
    if (state === STATES.FLIPPABLE) return flip();
    if (state === STATES.COOKED) return plate();
  }

  function plate() {
    if (state !== STATES.COOKED) return;
    setState(STATES.PLATING);
    L.beep(280, 0.12, "triangle");
    L.haptic(10);
    const p = $("cookPancake");
    p.classList.add("cook-pancake--plating");
    setT(520, () => {
      stack += 1;
      addToStack();
      p.className = "cook-pancake";
      maybeCelebrateRecord(stack);
      updateBadge();
      if (stack > 0 && stack % 3 === 0) {
        L.happySound();
        L.say(`Yum! ${stack} pancakes! ${L.cheer()}`);
        L.confettiRain && L.confettiRain(18);
      } else {
        L.say(`${stack} pancake${stack > 1 ? "s" : ""}!`);
      }
      setState(STATES.IDLE);
    });
  }

  function addToStack() {
    const s = $("cookStack");
    const pcake = document.createElement("div");
    pcake.className = "cook-stack-pancake";
    // Slight horizontal jitter so the stack looks hand-built.
    const jitter = (Math.random() - 0.5) * 14;
    pcake.style.bottom = ((stack - 1) * 14) + "px";
    pcake.style.transform = `translateX(calc(-50% + ${jitter}px))`;
    s.appendChild(pcake);
    // Cap visible height — never grow off the plate area.
    if (s.children.length > 10) s.firstElementChild.remove();
  }

  // -------- Lifecycle --------
  function start() {
    state = STATES.IDLE;
    stack = 0;
    celebrated = false;
    bestAtStart = L.getHighScore("cookBest");
    clearAll();
    build();
    updateBadge();
    L.say("Let's make pancakes! Tap the batter.");
  }

  function stop() {
    clearAll();
    delete document.body.dataset.cookState;
  }

  L.games.cook = { screen: "cookGame", start, stop };
})();
