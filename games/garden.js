// ---------- Garden! ----------
// Open-ended planting sandbox. Tap an empty pot to plant a seed, then
// drag the watering can over it to grow it stage by stage — seed →
// sprout → young plant → mature with fruit. Tap a ready plant to
// harvest. Bees + butterflies drift through the scene, the sun shines,
// clouds drift, the day cycle subtly shifts colors. Different cadence
// from Pop/Whack/Find — this one rewards slowing down.
(function () {
  const L = window.Lawson;

  // ====================================================================
  //  Plant catalogue — eight varieties, each with stem color, fruit
  //  emoji, harvest line, and growth "speed" weight (some grow with
  //  fewer waters than others, so picking is varied).
  // ====================================================================
  const PLANTS = [
    { id: "strawberry", name: "strawberry", emoji: "🍓",
      say: "Strawberries!", stem: "#2f9e44", fruitColor: "#fa5252", weight: 1 },
    { id: "tomato",     name: "tomato",     emoji: "🍅",
      say: "Tomato!",      stem: "#2b8a3e", fruitColor: "#fa5252", weight: 1 },
    { id: "carrot",     name: "carrot",     emoji: "🥕",
      say: "Carrot!",      stem: "#37b24d", fruitColor: "#f76707", weight: 1 },
    { id: "sunflower",  name: "sunflower",  emoji: "🌻",
      say: "Sunflower!",   stem: "#2f9e44", fruitColor: "#fab005", weight: 1 },
    { id: "tulip",      name: "tulip",      emoji: "🌷",
      say: "Tulip!",       stem: "#37b24d", fruitColor: "#ff8ab0", weight: 1 },
    { id: "pumpkin",    name: "pumpkin",    emoji: "🎃",
      say: "Pumpkin!",     stem: "#40c057", fruitColor: "#f76707", weight: 1 },
    { id: "pepper",     name: "pepper",     emoji: "🌶️",
      say: "Pepper!",      stem: "#2b8a3e", fruitColor: "#fa5252", weight: 1 },
    { id: "blueberry",  name: "blueberry",  emoji: "🫐",
      say: "Blueberries!", stem: "#2f9e44", fruitColor: "#5c7cfa", weight: 1 },
    { id: "watermelon", name: "watermelon", emoji: "🍉",
      say: "Watermelon!",  stem: "#2b8a3e", fruitColor: "#fa5252", weight: 1 },
    { id: "apple",      name: "apple",      emoji: "🍎",
      say: "Apple!",       stem: "#2f9e44", fruitColor: "#fa5252", weight: 1 },
    { id: "lemon",      name: "lemon",      emoji: "🍋",
      say: "Lemon!",       stem: "#40c057", fruitColor: "#fab005", weight: 1 },
    { id: "grapes",     name: "grapes",     emoji: "🍇",
      say: "Grapes!",      stem: "#2b8a3e", fruitColor: "#7950f2", weight: 1 },
  ];

  const POT_COUNT = 6;
  const WATER_COOLDOWN_MS = 700;
  const WATER_DROP_THROTTLE_MS = 65;
  const GROW_STAGES = ["seed", "sprout", "young", "mature"];

  // Each pot transitions: empty → seeded → sprout → young → mature →
  // harvesting → empty. Growing happens via tryWater(); harvest only
  // when mature; tapping empty plants a fresh random seed.
  const STATE = {
    EMPTY: "empty",
    SEEDED: "seeded",
    SPROUT: "sprout",
    YOUNG: "young",
    MATURE: "mature",
    HARVEST: "harvest",
  };

  // ====================================================================
  //  State
  // ====================================================================
  let pots = [];
  let bees = [];
  let butterflies = [];
  let harvested = 0;
  let bestAtStart = 0;
  let celebrated = false;
  let timers = [];
  let lastWaterTime = 0;
  let waterDropTime = 0;
  let weatherTimer = null;
  let rainTimer = null;
  let rainPieces = [];
  let dayTimer = null;
  let dayPhase = 0; // 0..3 sliding around the day

  function setT(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearAllTimers() { timers.forEach(clearTimeout); timers = []; }
  function $(id) { return document.getElementById(id); }

  // ====================================================================
  //  SVG art — inlined as template strings so the whole game ships
  //  with no external assets. Each piece is small and friendly; the
  //  stems pick up their plant's color and the fruit sits at the top.
  // ====================================================================
  function potSvg() {
    return `
      <svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="50" cy="76" rx="44" ry="6" fill="rgba(0,0,0,0.22)"/>
        <rect x="6" y="6" width="88" height="14" rx="3" fill="#a0522d"/>
        <path d="M10 18 L 90 18 L 82 70 Q 80 76 74 76 L 26 76 Q 20 76 18 70 Z"
              fill="#cd853f" stroke="#7a3f1d" stroke-width="2.5" stroke-linejoin="round"/>
        <ellipse cx="50" cy="18" rx="42" ry="5" fill="#7a3f1d"/>
        <path d="M12 20 L 88 20 L 84 38 Q 50 44 16 38 Z" fill="#4a2c14"/>
        <ellipse cx="34" cy="28" rx="6" ry="2.5" fill="#3a1f08" opacity="0.45"/>
        <ellipse cx="60" cy="32" rx="8" ry="2.5" fill="#3a1f08" opacity="0.45"/>
        <ellipse cx="48" cy="22" rx="4" ry="1.5" fill="#3a1f08" opacity="0.45"/>
        <rect x="6"  y="6"  width="88" height="3" fill="rgba(255,255,255,0.18)"/>
        <rect x="9" y="22" width="2"  height="48" fill="rgba(255,255,255,0.16)"/>
      </svg>`;
  }

  function seedSvg() {
    return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="24" rx="6"   ry="3.5" fill="#5a3a1a"/>
      <ellipse cx="14" cy="22" rx="3.5" ry="2.2" fill="#7a4a20"/>
      <ellipse cx="26" cy="24" rx="3"   ry="1.8" fill="#7a4a20"/>
      <ellipse cx="20" cy="20" rx="2"   ry="1.2" fill="#8d5a2a" opacity="0.85"/>
    </svg>`;
  }

  function sproutSvg(color) {
    return `<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 76 Q 30 56 30 42" stroke="${color}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <ellipse cx="22" cy="46" rx="8" ry="4" fill="${color}" transform="rotate(-22 22 46)"/>
      <ellipse cx="38" cy="40" rx="8" ry="4" fill="${color}" transform="rotate(22 38 40)"/>
      <ellipse cx="22" cy="46" rx="3" ry="1.5" fill="#fff" opacity="0.35" transform="rotate(-22 22 46)"/>
      <ellipse cx="38" cy="40" rx="3" ry="1.5" fill="#fff" opacity="0.35" transform="rotate(22 38 40)"/>
    </svg>`;
  }

  function youngSvg(color) {
    return `<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 96 Q 40 70 40 32" stroke="${color}" stroke-width="4" stroke-linecap="round" fill="none"/>
      <ellipse cx="22" cy="52" rx="14" ry="6" fill="${color}" transform="rotate(-22 22 52)"/>
      <ellipse cx="58" cy="48" rx="14" ry="6" fill="${color}" transform="rotate(22 58 48)"/>
      <ellipse cx="26" cy="32" rx="11" ry="5" fill="${color}" transform="rotate(-18 26 32)"/>
      <ellipse cx="54" cy="30" rx="11" ry="5" fill="${color}" transform="rotate(18 54 30)"/>
      <ellipse cx="22" cy="52" rx="4" ry="1.6" fill="#fff" opacity="0.35" transform="rotate(-22 22 52)"/>
      <ellipse cx="58" cy="48" rx="4" ry="1.6" fill="#fff" opacity="0.35" transform="rotate(22 58 48)"/>
    </svg>`;
  }

  function matureSvg(color, emoji, fruitColor) {
    return `<svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 124 Q 50 86 50 32" stroke="${color}" stroke-width="5" stroke-linecap="round" fill="none"/>
      <ellipse cx="26" cy="86" rx="18" ry="8" fill="${color}" transform="rotate(-22 26 86)"/>
      <ellipse cx="74" cy="82" rx="18" ry="8" fill="${color}" transform="rotate(22 74 82)"/>
      <ellipse cx="22" cy="60" rx="16" ry="7" fill="${color}" transform="rotate(-18 22 60)"/>
      <ellipse cx="78" cy="56" rx="16" ry="7" fill="${color}" transform="rotate(18 78 56)"/>
      <ellipse cx="26" cy="42" rx="13" ry="6" fill="${color}" transform="rotate(-15 26 42)"/>
      <ellipse cx="74" cy="40" rx="13" ry="6" fill="${color}" transform="rotate(15 74 40)"/>
      <circle cx="50" cy="34" r="22" fill="${fruitColor}" opacity="0.45"/>
      <text x="50" y="38" text-anchor="middle" dominant-baseline="middle" font-size="42">${emoji}</text>
    </svg>`;
  }

  function wateringCanSvg() {
    return `<svg viewBox="0 0 110 80" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="56" rx="36" ry="6" fill="rgba(0,0,0,0.18)"/>
      <ellipse cx="48" cy="48" rx="34" ry="22" fill="#74c0fc" stroke="#1c7ed6" stroke-width="2.5"/>
      <ellipse cx="48" cy="42" rx="28" ry="16" fill="#a5d8ff"/>
      <rect x="74" y="32" width="22" height="6" rx="2" fill="#1c7ed6" transform="rotate(-22 74 32)"/>
      <ellipse cx="96" cy="22" rx="6" ry="4" fill="#1c7ed6" transform="rotate(-22 96 22)"/>
      <circle cx="94" cy="20" r="1.2" fill="#0c4f8a" transform="rotate(-22 94 20)"/>
      <circle cx="98" cy="22" r="1.2" fill="#0c4f8a" transform="rotate(-22 98 22)"/>
      <circle cx="94" cy="24" r="1.2" fill="#0c4f8a" transform="rotate(-22 94 24)"/>
      <path d="M18 30 Q 12 16 30 12" stroke="#1c7ed6" stroke-width="4" fill="none" stroke-linecap="round"/>
      <ellipse cx="38" cy="36" rx="14" ry="6" fill="#fff" opacity="0.45"/>
      <ellipse cx="40" cy="38" rx="3" ry="1.5" fill="#fff" opacity="0.85"/>
    </svg>`;
  }

  function sunSvg() {
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g stroke="#f59f00" stroke-width="5" stroke-linecap="round">
        <line x1="50" y1="4"  x2="50" y2="18"/>
        <line x1="50" y1="82" x2="50" y2="96"/>
        <line x1="4"  y1="50" x2="18" y2="50"/>
        <line x1="82" y1="50" x2="96" y2="50"/>
        <line x1="17" y1="17" x2="27" y2="27"/>
        <line x1="73" y1="73" x2="83" y2="83"/>
        <line x1="83" y1="17" x2="73" y2="27"/>
        <line x1="27" y1="73" x2="17" y2="83"/>
      </g>
      <circle cx="50" cy="50" r="28" fill="#ffd43b" stroke="#f59f00" stroke-width="3"/>
      <circle cx="42" cy="46" r="3" fill="#5c3700"/>
      <circle cx="58" cy="46" r="3" fill="#5c3700"/>
      <path d="M40 58 Q 50 66 60 58" stroke="#5c3700" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="37" cy="56" r="3" fill="#ff8ab0" opacity="0.6"/>
      <circle cx="63" cy="56" r="3" fill="#ff8ab0" opacity="0.6"/>
    </svg>`;
  }

  function cloudSvg() {
    return `<svg viewBox="0 0 130 60" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="32" cy="42" rx="22" ry="16" fill="#fff" opacity="0.95"/>
      <ellipse cx="64" cy="32" rx="28" ry="22" fill="#fff" opacity="0.95"/>
      <ellipse cx="100" cy="42" rx="22" ry="16" fill="#fff" opacity="0.95"/>
      <ellipse cx="52" cy="50" rx="20" ry="6" fill="#fff" opacity="0.7"/>
      <ellipse cx="84" cy="50" rx="20" ry="6" fill="#fff" opacity="0.7"/>
    </svg>`;
  }

  function beeSvg() {
    return `<svg viewBox="0 0 64 44" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="32" cy="22" rx="20" ry="13" fill="#fab005" stroke="#5c3700" stroke-width="1.5"/>
      <rect x="22" y="10" width="6" height="26" fill="#3a1f00"/>
      <rect x="34" y="10" width="6" height="26" fill="#3a1f00"/>
      <ellipse cx="48" cy="20" rx="6" ry="3.5" fill="#3a1f00"/>
      <ellipse cx="18" cy="14" rx="11" ry="9" fill="#fff" opacity="0.9"/>
      <ellipse cx="42" cy="14" rx="11" ry="9" fill="#fff" opacity="0.9"/>
      <ellipse cx="18" cy="14" rx="6" ry="5" fill="rgba(116,192,252,0.25)"/>
      <ellipse cx="42" cy="14" rx="6" ry="5" fill="rgba(116,192,252,0.25)"/>
      <circle cx="46" cy="20" r="1.5" fill="#fff"/>
      <circle cx="50" cy="22" r="1"   fill="#fff"/>
      <path d="M12 22 Q 8 18 6 22" stroke="#3a1f00" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M12 22 Q 8 26 6 22" stroke="#3a1f00" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </svg>`;
  }

  function butterflySvg(c1, c2) {
    return `<svg viewBox="0 0 76 56" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="22" cy="20" rx="15" ry="13" fill="${c1}" transform="rotate(-15 22 20)"/>
      <ellipse cx="54" cy="20" rx="15" ry="13" fill="${c1}" transform="rotate(15 54 20)"/>
      <ellipse cx="22" cy="38" rx="11" ry="10" fill="${c2}" transform="rotate(-15 22 38)"/>
      <ellipse cx="54" cy="38" rx="11" ry="10" fill="${c2}" transform="rotate(15 54 38)"/>
      <rect x="35" y="14" width="4" height="28" rx="2" fill="#3a1f00"/>
      <line x1="37" y1="14" x2="33" y2="6" stroke="#3a1f00" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="37" y1="14" x2="41" y2="6" stroke="#3a1f00" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="33" cy="6"  r="1.5" fill="#3a1f00"/>
      <circle cx="41" cy="6"  r="1.5" fill="#3a1f00"/>
      <circle cx="22" cy="22" r="4" fill="#fff" opacity="0.7"/>
      <circle cx="54" cy="22" r="4" fill="#fff" opacity="0.7"/>
      <circle cx="22" cy="22" r="2" fill="${c2}"/>
      <circle cx="54" cy="22" r="2" fill="${c2}"/>
    </svg>`;
  }

  function snailSvg() {
    return `<svg viewBox="0 0 72 44" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="36" cy="36" rx="34" ry="5" fill="rgba(0,0,0,0.15)"/>
      <path d="M4 32 Q 8 28 18 28 L 50 28 Q 64 28 64 22 Q 64 16 58 16
               L 58 12 Q 58 8 62 8 L 64 8 L 64 4" stroke="#5c3700"
               stroke-width="2.5" fill="#dcb98b" stroke-linejoin="round"/>
      <circle cx="46" cy="22" r="12" fill="#a0522d" stroke="#5c3700" stroke-width="2"/>
      <circle cx="46" cy="22" r="8"  fill="#cd853f"/>
      <circle cx="46" cy="22" r="4"  fill="#a0522d"/>
      <circle cx="62" cy="4"  r="2"  fill="#3a1f00"/>
      <line x1="6" y1="32" x2="2" y2="36" stroke="#5c3700" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  // ====================================================================
  //  Scene build
  // ====================================================================
  function build() {
    const stage = $("gardenStage");
    stage.innerHTML = `
      <div id="gardenSky" class="garden-sky">
        <div class="garden-cloud garden-cloud--1">${cloudSvg()}</div>
        <div class="garden-cloud garden-cloud--2">${cloudSvg()}</div>
        <div class="garden-cloud garden-cloud--3">${cloudSvg()}</div>
        <button id="gardenSun" class="garden-sun" aria-label="Sun">${sunSvg()}</button>
      </div>
      <div id="gardenInsects" class="garden-insects"></div>
      <div id="gardenRain"    class="garden-rain"></div>
      <div id="gardenPots"    class="garden-pots"></div>
      <div id="gardenGround"  class="garden-ground"></div>
      <div id="gardenWaterDrops" class="garden-water-drops"></div>
      <div class="garden-tools">
        <button id="gardenWaterCan" class="garden-tool garden-tool--water" aria-label="Watering can">${wateringCanSvg()}</button>
      </div>`;
    buildPots();
    setupWateringCan();
    setupSun();
    setupClouds();
    spawnInsects();
    startWeatherCycle();
    startDayCycle();
    scheduleBird();
    scheduleLeafDrift();
  }

  function buildPots() {
    const cont = $("gardenPots");
    cont.innerHTML = "";
    pots = [];
    for (let i = 0; i < POT_COUNT; i++) {
      const wrap = document.createElement("div");
      wrap.className = "garden-pot-wrap";
      wrap.dataset.pot = String(i);
      wrap.innerHTML = `
        <div class="garden-plant"></div>
        <div class="garden-pot">${potSvg()}</div>
        <div class="garden-glow"></div>`;
      cont.appendChild(wrap);
      const pot = {
        idx: i,
        state: STATE.EMPTY,
        plant: null,
        growth: 0,
        wrap,
        plantEl: wrap.querySelector(".garden-plant"),
        potEl: wrap.querySelector(".garden-pot"),
        glowEl: wrap.querySelector(".garden-glow"),
      };
      pots.push(pot);
      L.onTap(wrap, (e) => onPotTap(pot, e));
    }
    updatePotGlows();
  }

  function updatePotGlows() {
    pots.forEach((pot) => {
      pot.glowEl.classList.toggle("active", pot.state === STATE.MATURE);
      pot.wrap.dataset.state = pot.state;
    });
  }

  // ====================================================================
  //  Pot interactions: plant / grow / harvest
  // ====================================================================
  function onPotTap(pot, e) {
    if (pot.state === STATE.EMPTY) {
      plantSeed(pot);
    } else if (pot.state === STATE.MATURE) {
      harvest(pot, e);
    } else {
      // Mid-growth tap: gentle reminder. No penalty.
      L.beep(420, 0.04, "sine");
      L.say("Use the watering can!");
    }
  }

  function plantSeed(pot) {
    pot.plant = PLANTS[Math.floor(Math.random() * PLANTS.length)];
    pot.state = STATE.SEEDED;
    pot.growth = 0;
    pot.plantEl.innerHTML = seedSvg();
    pot.plantEl.className = "garden-plant stage-seeded";
    L.beep(420, 0.07, "triangle");
    L.beep(540, 0.07, "triangle", 0.07);
    L.haptic(6);
    L.say("Plant a seed!");
    updatePotGlows();
  }

  function growPot(pot) {
    if (!pot.plant) return;
    pot.growth += 1;
    const p = pot.plant;
    pot.plantEl.className = "garden-plant";
    if (pot.growth === 1) {
      pot.state = STATE.SPROUT;
      pot.plantEl.innerHTML = sproutSvg(p.stem);
      pot.plantEl.classList.add("stage-sprout");
      L.say("Sprout!");
      L.beep(600, 0.10, "triangle");
    } else if (pot.growth === 2) {
      pot.state = STATE.YOUNG;
      pot.plantEl.innerHTML = youngSvg(p.stem);
      pot.plantEl.classList.add("stage-young");
      L.say("Growing!");
      L.beep(680, 0.10, "triangle");
    } else if (pot.growth >= 3) {
      pot.state = STATE.MATURE;
      pot.plantEl.innerHTML = matureSvg(p.stem, p.emoji, p.fruitColor);
      pot.plantEl.classList.add("stage-mature");
      L.say(p.say);
      L.beep(760, 0.16, "triangle");
      L.haptic(8);
      // Sparkle the moment of ripeness.
      const r = pot.plantEl.getBoundingClientRect();
      L.sparkleAt(r.left + r.width / 2, r.top + r.height / 2);
    }
    updatePotGlows();
  }

  function harvest(pot, e) {
    if (pot.state !== STATE.MATURE) return;
    const p = pot.plant;
    pot.state = STATE.HARVEST;
    pot.plantEl.classList.add("harvesting");
    L.happySound();
    L.say(`${p.say} ${L.cheer()}`);
    L.haptic([10, 30, 10]);
    const r = pot.plantEl.getBoundingClientRect();
    L.sparkleAt(r.left + r.width / 2, r.top + r.height / 2);
    // A second burst at the tap point for a satisfying "pop".
    const tap = L.pointOf(e);
    L.sparkleAt(tap.x, tap.y);

    // Fruit flies up out of the pot to celebrate.
    const fly = document.createElement("div");
    fly.className = "garden-fly-fruit";
    fly.textContent = p.emoji;
    document.body.appendChild(fly);
    fly.style.left = (r.left + r.width / 2) + "px";
    fly.style.top  = (r.top + r.height / 2) + "px";
    setTimeout(() => fly.remove(), 1400);

    harvested += 1;
    L.bumpBadge("gardenScoreVal", harvested);
    maybeCelebrateRecord(harvested);
    refreshBestBadge();
    awardStickers();

    setT(700, () => {
      pot.state = STATE.EMPTY;
      pot.plant = null;
      pot.growth = 0;
      pot.plantEl.innerHTML = "";
      pot.plantEl.className = "garden-plant";
      updatePotGlows();
    });
  }

  function awardStickers() {
    if (harvested >= 1) L.earnSticker && L.earnSticker("gardenStarter");
    if (harvested >= 10) L.earnSticker && L.earnSticker("gardener");
  }

  function refreshBestBadge() {
    const bestEl = $("gardenBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("gardenBest");
  }

  function maybeCelebrateRecord(value) {
    if (value > bestAtStart && !celebrated) {
      celebrated = true;
      setTimeout(() => L.celebrateNewHigh(value), 700);
    }
    L.bumpHighScore("gardenBest", value);
  }

  // ====================================================================
  //  Watering can — drag handler with pointer capture so the can
  //  stays "in hand" even as the finger leaves its rest position.
  // ====================================================================
  function setupWateringCan() {
    const can = $("gardenWaterCan");
    if (!can) return;
    let dragging = false;

    function onDown(e) {
      dragging = true;
      can.setPointerCapture?.(e.pointerId);
      can.classList.add("grabbed");
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      can.style.position = "fixed";
      can.style.left   = (e.clientX - can.offsetWidth / 2) + "px";
      can.style.top    = (e.clientY - can.offsetHeight / 2) + "px";
      can.style.right  = "auto";
      can.style.bottom = "auto";
      waterAt(e.clientX, e.clientY);
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      can.classList.remove("grabbed");
      can.style.position = "";
      can.style.left = "";
      can.style.top = "";
      can.style.right = "";
      can.style.bottom = "";
    }
    can.addEventListener("pointerdown",   onDown);
    can.addEventListener("pointermove",   onMove);
    can.addEventListener("pointerup",     onUp);
    can.addEventListener("pointercancel", onUp);
    // No-drag path: tap the can, then tap a plant.
    L.tapToUse(can, { onUse: waterAt, hint: "Now tap a plant!" });
  }

  // Pour wherever the can is: drops fall and any pot under it grows.
  function waterAt(x, y) {
    spawnWaterDrops(x, y);
    pots.forEach((pot) => {
      const r = pot.wrap.getBoundingClientRect();
      if (inside(x, y, r)) tryWater(pot);
    });
  }

  function inside(x, y, r) {
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function tryWater(pot) {
    if (pot.state === STATE.EMPTY) return;
    if (pot.state === STATE.MATURE) return;
    if (pot.state === STATE.HARVEST) return;
    const now = Date.now();
    if (now - lastWaterTime < WATER_COOLDOWN_MS) return;
    lastWaterTime = now;
    growPot(pot);
  }

  function spawnWaterDrops(x, y) {
    const now = Date.now();
    if (now - waterDropTime < WATER_DROP_THROTTLE_MS) return;
    waterDropTime = now;
    for (let i = 0; i < 2; i++) {
      const d = document.createElement("div");
      d.className = "garden-water-drop";
      d.textContent = "💧";
      d.style.left = (x + (Math.random() - 0.5) * 20) + "px";
      d.style.top  = (y + 24 + Math.random() * 12) + "px";
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 900);
    }
  }

  // ====================================================================
  //  Sun, clouds — ambient atmosphere
  // ====================================================================
  function setupSun() {
    const sun = $("gardenSun");
    if (!sun) return;
    let taps = 0;
    L.onTap(sun, () => {
      taps += 1;
      L.beep(880, 0.10, "sine");
      L.haptic(6);
      L.say("Sunshine!");
      sun.classList.remove("spinning");
      void sun.offsetWidth;
      sun.classList.add("spinning");
      setT(900, () => sun.classList.remove("spinning"));
      const r = sun.getBoundingClientRect();
      L.sparkleAt(r.left + r.width / 2, r.top + r.height / 2);
      // Easter egg: every 5 taps, briefly accelerate every plant by one.
      if (taps % 5 === 0) {
        L.say("Sunshine power!");
        pots.forEach((pot) => {
          if (pot.state !== STATE.EMPTY && pot.state !== STATE.MATURE) {
            setT(120 + pot.idx * 80, () => growPot(pot));
          }
        });
      }
    });
  }

  function setupClouds() {
    document.querySelectorAll(".garden-cloud").forEach((c) => {
      L.onTap(c, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        L.beep(620, 0.08, "sine");
        L.say("Cloud!");
        const r = c.getBoundingClientRect();
        for (let k = 0; k < 4; k++) {
          setT(k * 70, () => L.sparkleAt(
            r.left + Math.random() * r.width,
            r.top  + r.height + Math.random() * 30,
          ));
        }
      });
    });
  }

  // ====================================================================
  //  Insects: bees, butterflies, occasional snail visitor.
  //  Each insect is a div with its own animation timing variables.
  // ====================================================================
  function spawnInsects() {
    const cont = $("gardenInsects");
    if (!cont) return;
    cont.innerHTML = "";
    bees = [];
    butterflies = [];

    // Two bees, staggered.
    for (let i = 0; i < 2; i++) {
      const b = document.createElement("button");
      b.className = "garden-bee garden-insect";
      b.setAttribute("aria-label", "Bee");
      b.innerHTML = beeSvg();
      b.style.setProperty("--delay", (i * 3) + "s");
      b.style.setProperty("--dur", (12 + i * 2) + "s");
      cont.appendChild(b);
      bees.push(b);
      L.onTap(b, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        L.beep(520, 0.05, "sawtooth");
        L.beep(470, 0.05, "sawtooth", 0.05);
        L.haptic(6);
        L.say("Buzz buzz!");
        b.classList.add("startled");
        setT(600, () => b.classList.remove("startled"));
      });
    }

    // Two butterflies of different colors.
    const palettes = [
      ["#da77f2", "#cc5de8"],
      ["#74c0fc", "#4dabf7"],
    ];
    palettes.forEach((pair, i) => {
      const b = document.createElement("button");
      b.className = "garden-butterfly garden-insect";
      b.setAttribute("aria-label", "Butterfly");
      b.innerHTML = butterflySvg(pair[0], pair[1]);
      b.style.setProperty("--delay", (i * 4 + 2) + "s");
      b.style.setProperty("--dur",   (14 + i * 3) + "s");
      cont.appendChild(b);
      butterflies.push(b);
      L.onTap(b, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        L.beep(820 + Math.random() * 220, 0.08, "sine");
        L.haptic(5);
        L.say("Pretty butterfly!");
      });
    });

    // Occasionally a snail crawls across the ground. Tap to send him on.
    scheduleSnailVisit();
  }

  function scheduleSnailVisit() {
    setT(12_000 + Math.random() * 8_000, () => {
      const cont = $("gardenInsects");
      if (!cont) return;
      const snail = document.createElement("button");
      snail.className = "garden-snail garden-insect";
      snail.setAttribute("aria-label", "Snail");
      snail.innerHTML = snailSvg();
      cont.appendChild(snail);
      L.onTap(snail, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        L.beep(280, 0.18, "triangle");
        L.haptic(8);
        L.say("Bye bye snail!");
        snail.classList.add("startled");
        setT(800, () => snail.remove());
      });
      setT(22_000, () => snail.remove());
      scheduleSnailVisit();
    });
  }

  // ====================================================================
  //  Weather — gentle rain showers. Rain auto-waters every growing pot
  //  while it lasts, no drag needed. Comes by surprise; kids love it.
  // ====================================================================
  function startWeatherCycle() {
    weatherTimer = setT(30_000 + Math.random() * 30_000, () => {
      startRain();
    });
  }

  function startRain() {
    const cont = $("gardenRain");
    if (!cont) return;
    cont.classList.add("on");
    L.say("It's raining!");
    L.beep(700, 0.6, "sine");
    L.beep(900, 0.5, "triangle", 0.15);
    rainPieces = [];
    for (let i = 0; i < 40; i++) {
      const r = document.createElement("div");
      r.className = "garden-rain-drop";
      r.style.left = (Math.random() * 100) + "%";
      r.style.animationDelay = (Math.random() * 1.6) + "s";
      r.style.animationDuration = (0.8 + Math.random() * 0.6) + "s";
      cont.appendChild(r);
      rainPieces.push(r);
    }
    // Auto-water all growing pots over the rain period.
    const rainGrowTimers = [];
    pots.forEach((pot, i) => {
      if (pot.state === STATE.SEEDED || pot.state === STATE.SPROUT || pot.state === STATE.YOUNG) {
        const tid = setT(900 + i * 600, () => growPot(pot));
        rainGrowTimers.push(tid);
      }
    });
    setT(8_000, () => stopRain());
  }

  function stopRain() {
    const cont = $("gardenRain");
    if (cont) cont.classList.remove("on");
    rainPieces.forEach((r) => r.remove());
    rainPieces = [];
    L.say("Sun's back!");
    // Schedule the next shower.
    weatherTimer = setT(35_000 + Math.random() * 40_000, () => startRain());
  }

  // ====================================================================
  //  Bird visitor — occasionally a bird flies across the sky, calling.
  //  Tap it for a tweet. Adds aerial life beyond just the bees.
  // ====================================================================
  let birdTimer = null;
  function scheduleBird() {
    birdTimer = setT(18_000 + Math.random() * 14_000, () => {
      const cont = $("gardenInsects");
      if (!cont) return;
      const bird = document.createElement("button");
      bird.className = "garden-bird garden-insect";
      bird.setAttribute("aria-label", "Bird");
      bird.innerHTML = birdSvg();
      cont.appendChild(bird);
      L.beep(1100, 0.06, "sine");
      L.beep(1300, 0.06, "sine", 0.07);
      L.say("Tweet tweet!");
      L.onTap(bird, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        L.beep(1100 + Math.random() * 300, 0.07, "sine");
        L.say("Pretty bird!");
        bird.classList.add("startled");
        setT(700, () => bird.remove());
      });
      setT(14_000, () => bird.remove());
      scheduleBird();
    });
  }

  function birdSvg() {
    return `<svg viewBox="0 0 70 50" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="34" cy="28" rx="22" ry="14" fill="#4dabf7"/>
      <ellipse cx="34" cy="22" rx="22" ry="9"  fill="#74c0fc"/>
      <circle cx="52"  cy="22" r="9"  fill="#4dabf7"/>
      <circle cx="56"  cy="20" r="2"  fill="#3a2208"/>
      <circle cx="57"  cy="19" r="0.8" fill="#fff"/>
      <path d="M60 22 L 66 20 L 60 24 Z" fill="#fab005"/>
      <ellipse cx="18" cy="18" rx="10" ry="6" fill="#a5d8ff" transform="rotate(-15 18 18)"/>
      <ellipse cx="18" cy="34" rx="10" ry="6" fill="#a5d8ff" transform="rotate(15 18 34)"/>
      <line x1="40" y1="40" x2="38" y2="46" stroke="#fab005" stroke-width="2" stroke-linecap="round"/>
      <line x1="44" y1="40" x2="46" y2="46" stroke="#fab005" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  // ====================================================================
  //  Autumn leaf drift — occasional falling leaves for ambience.
  //  Only fires during certain "season phases" of the day cycle.
  // ====================================================================
  let leafTimer = null;
  function scheduleLeafDrift() {
    leafTimer = setT(8_000 + Math.random() * 10_000, () => {
      // Only in afternoon / sunset phases (dayPhase 2 or 3).
      if (dayPhase >= 2) dropLeaves();
      scheduleLeafDrift();
    });
  }

  function dropLeaves() {
    const stage = $("gardenStage");
    if (!stage) return;
    const colors = ["#ff922b", "#fab005", "#e8590c", "#fd7e14", "#c2255c"];
    const leafCount = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < leafCount; i++) {
      setT(i * 220, () => {
        const leaf = document.createElement("div");
        leaf.className = "garden-leaf";
        leaf.style.setProperty("--c", colors[Math.floor(Math.random() * colors.length)]);
        leaf.style.setProperty("--drift", ((Math.random() - 0.5) * 60) + "vw");
        leaf.style.setProperty("--dur", (5 + Math.random() * 3) + "s");
        leaf.style.left = (5 + Math.random() * 90) + "%";
        leaf.innerHTML = leafSvg();
        stage.appendChild(leaf);
        setTimeout(() => leaf.remove(), 8500);
      });
    }
  }

  function leafSvg() {
    return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M 20 4 Q 8 12 8 24 Q 8 36 20 36 Q 32 36 32 24 Q 32 12 20 4 Z" fill="var(--c, #fab005)"/>
      <line x1="20" y1="6" x2="20" y2="36" stroke="rgba(0,0,0,0.25)" stroke-width="1.5"/>
      <line x1="20" y1="14" x2="14" y2="22" stroke="rgba(0,0,0,0.18)" stroke-width="1"/>
      <line x1="20" y1="14" x2="26" y2="22" stroke="rgba(0,0,0,0.18)" stroke-width="1"/>
      <line x1="20" y1="22" x2="12" y2="30" stroke="rgba(0,0,0,0.18)" stroke-width="1"/>
      <line x1="20" y1="22" x2="28" y2="30" stroke="rgba(0,0,0,0.18)" stroke-width="1"/>
    </svg>`;
  }

  // ====================================================================
  //  Subtle day cycle — sky color shifts very slowly over time. Pure
  //  ambience; doesn't gate gameplay.
  // ====================================================================
  function startDayCycle() {
    const sky = $("gardenSky");
    if (!sky) return;
    const colors = [
      ["#a5d8ff", "#ffe066"], // morning
      ["#74c0fc", "#fff3bf"], // noon
      ["#ffd6a5", "#ffa94d"], // afternoon
      ["#ff8787", "#f783ac"], // sunset
    ];
    function apply() {
      const c = colors[dayPhase % colors.length];
      sky.style.background = `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 100%)`;
    }
    apply();
    dayTimer = setInterval(() => {
      dayPhase = (dayPhase + 1) % colors.length;
      apply();
    }, 30_000);
  }

  // ====================================================================
  //  Lifecycle
  // ====================================================================
  function start() {
    harvested = 0;
    celebrated = false;
    dayPhase = 0;
    bestAtStart = L.getHighScore("gardenBest");
    clearAllTimers();
    if (weatherTimer) { clearTimeout(weatherTimer); weatherTimer = null; }
    if (rainTimer)    { clearTimeout(rainTimer); rainTimer = null; }
    if (dayTimer)     { clearInterval(dayTimer); dayTimer = null; }
    build();
    L.bumpBadge("gardenScoreVal", 0);
    refreshBestBadge();
    L.say("Welcome to the garden! Tap a pot to plant a seed.");
  }

  function stop() {
    clearAllTimers();
    if (weatherTimer) { clearTimeout(weatherTimer); weatherTimer = null; }
    if (rainTimer)    { clearTimeout(rainTimer); rainTimer = null; }
    if (dayTimer)     { clearInterval(dayTimer); dayTimer = null; }
    if (birdTimer)    { clearTimeout(birdTimer); birdTimer = null; }
    if (leafTimer)    { clearTimeout(leafTimer); leafTimer = null; }
    pots = [];
    bees = [];
    butterflies = [];
  }

  L.games.garden = { screen: "gardenGame", start, stop };
})();
