// ---------- Baby Dino: make him better ----------
// Sad baby dino covered in paint splotches, tears, and snot bubbles.
// Tap each yucky thing to wipe it away. When the face is clean, he
// smiles, hearts fly, and a fresh round of grime appears.
// Same toddler-friendly chain as the iPad game Lawson loves: every
// tap removes one thing and is its own satisfying micro-reward.
(function () {
  const L = window.Lawson;

  // -------- Dino face SVG (sad + happy mouths layered, toggled by class) --------
  const FACE_SVG = `
    <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="62" cy="100" rx="22" ry="32" fill="#ff922b"/>
      <ellipse cx="258" cy="100" rx="22" ry="32" fill="#ff922b"/>
      <ellipse cx="62" cy="104" rx="10" ry="20" fill="#ffb371"/>
      <ellipse cx="258" cy="104" rx="10" ry="20" fill="#ffb371"/>
      <ellipse cx="160" cy="170" rx="132" ry="125" fill="#ff922b"/>
      <ellipse cx="160" cy="172" rx="128" ry="121" fill="#ff9d3d"/>
      <ellipse cx="112" cy="105" rx="36" ry="22" fill="#ffe0b3" opacity="0.55"/>
      <ellipse cx="78" cy="216" rx="16" ry="10" fill="#ff8ab0" opacity="0.55"/>
      <ellipse cx="242" cy="216" rx="16" ry="10" fill="#ff8ab0" opacity="0.55"/>
      <ellipse cx="100" cy="252" rx="8" ry="5" fill="#e8590c" opacity="0.4"/>
      <ellipse cx="220" cy="255" rx="9" ry="5" fill="#e8590c" opacity="0.4"/>
      <ellipse cx="160" cy="275" rx="8" ry="5" fill="#e8590c" opacity="0.4"/>
      <circle cx="115" cy="160" r="32" fill="#fff"/>
      <circle cx="205" cy="160" r="32" fill="#fff"/>
      <circle cx="115" cy="165" r="22" fill="#3a2208"/>
      <circle cx="205" cy="165" r="22" fill="#3a2208"/>
      <circle cx="123" cy="158" r="8" fill="#fff"/>
      <circle cx="213" cy="158" r="8" fill="#fff"/>
      <circle cx="148" cy="212" r="3" fill="#3a2208"/>
      <circle cx="172" cy="212" r="3" fill="#3a2208"/>
      <path class="dino-mouth-sad"   d="M125 240 Q 160 218 195 240" stroke="#3a2208" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path class="dino-mouth-happy" d="M118 226 Q 160 268 202 226" stroke="#3a2208" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path class="dino-mouth-happy" d="M128 232 Q 160 254 192 232 L 192 234 Q 160 256 128 234 Z" fill="#c2255c"/>
    </svg>`;

  const SPLAT_COLORS = ["#5a3a1a", "#34c759", "#ff3b30", "#007aff", "#af52de", "#ffd60a"];

  function splatSvg(color) {
    return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <path d="M 25 4 Q 11 7 8 20 Q 2 28 11 38 Q 18 47 30 43 Q 43 39 45 24 Q 47 10 34 6 Q 28 3 25 4 Z" fill="${color}"/>
      <circle cx="44" cy="13" r="3" fill="${color}"/>
      <circle cx="6"  cy="39" r="2.5" fill="${color}"/>
      <circle cx="38" cy="44" r="2" fill="${color}"/>
    </svg>`;
  }
  function tearSvg() {
    return `<svg viewBox="0 0 30 50" xmlns="http://www.w3.org/2000/svg">
      <path d="M 15 4 Q 5 24 5 36 Q 5 47 15 47 Q 25 47 25 36 Q 25 24 15 4 Z"
            fill="#4dabf7" stroke="#1c7ed6" stroke-width="1.5"/>
      <ellipse cx="11" cy="22" rx="2.5" ry="6" fill="#fff" opacity="0.7"/>
    </svg>`;
  }
  function bubbleSvg() {
    return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="16" fill="rgba(173,216,255,0.85)" stroke="#74c0fc" stroke-width="2"/>
      <ellipse cx="13" cy="14" rx="4" ry="6" fill="rgba(255,255,255,0.8)"/>
    </svg>`;
  }

  let ailments = [];
  let placedPositions = [];
  let rounds = 0;
  let bestAtStart = 0;
  let celebrated = false;
  let timers = [];
  let initialCount = 0;
  let halfwayCheered = false;

  function setT(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }

  // Random position within the face oval, avoiding the two eye discs
  // and any previously placed ailment.
  function generatePos() {
    for (let attempt = 0; attempt < 40; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 34;
      const x = 50 + r * Math.cos(angle);
      const y = 55 + r * Math.sin(angle);
      if (Math.hypot(x - 36, y - 52) < 13) continue;  // left eye
      if (Math.hypot(x - 64, y - 52) < 13) continue;  // right eye
      if (placedPositions.some((p) => Math.hypot(p.x - x, p.y - y) < 14)) continue;
      placedPositions.push({ x, y });
      return { x, y };
    }
    const p = { x: 50, y: 75 };
    placedPositions.push(p);
    return p;
  }

  function newRound() {
    const face = document.getElementById("dinoFace");
    const overlay = document.getElementById("dinoAilments");
    if (!face || !overlay) return;
    overlay.innerHTML = "";
    ailments = [];
    placedPositions = [];
    halfwayCheered = false;
    face.classList.remove("happy");

    initialCount = 6 + Math.floor(Math.random() * 3); // 6-8
    // Weighted mix: more splotches than tears/bubbles so the face
    // looks "messy", not "soggy".
    const kinds = ["splat", "splat", "splat", "splat", "tear", "tear", "bubble", "bubble"];
    for (let i = 0; i < initialCount; i++) {
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const pos = generatePos();
      const el = document.createElement("button");
      el.className = `dino-ailment dino-ailment--${kind}`;
      el.style.left = pos.x + "%";
      el.style.top  = pos.y + "%";
      el.setAttribute("aria-label",
        kind === "splat" ? "Wipe paint splat" :
        kind === "tear"  ? "Wipe tear" : "Pop bubble");
      if (kind === "splat") {
        const c = SPLAT_COLORS[Math.floor(Math.random() * SPLAT_COLORS.length)];
        el.innerHTML = splatSvg(c);
      } else if (kind === "tear") {
        el.innerHTML = tearSvg();
      } else {
        el.innerHTML = bubbleSvg();
      }
      const ail = { kind, el };
      ailments.push(ail);
      L.onTap(el, (e) => clean(ail, e));
      overlay.appendChild(el);
    }
    L.say("Oh no! Make him better!");
  }

  function clean(ail, e) {
    const i = ailments.indexOf(ail);
    if (i < 0) return;
    ailments.splice(i, 1);
    ail.el.classList.add("cleaned");
    L.haptic(6);
    if (ail.kind === "splat") {
      L.beep(280 + Math.random() * 120, 0.06, "sawtooth");
      L.beep(220 + Math.random() * 120, 0.06, "sawtooth", 0.07);
    } else if (ail.kind === "tear") {
      L.beep(880, 0.07, "sine");
      L.beep(620, 0.09, "sine", 0.06);
    } else {
      L.beep(900 + Math.random() * 300, 0.06, "triangle");
    }
    const p = L.pointOf(e);
    L.sparkleAt(p.x, p.y);
    setT(380, () => ail.el.remove());

    if (!halfwayCheered && ailments.length <= Math.floor(initialCount / 2)) {
      halfwayCheered = true;
      L.say("Almost there!");
    }
    if (ailments.length === 0) setT(450, heal);
  }

  function heal() {
    const face = document.getElementById("dinoFace");
    if (!face) return;
    face.classList.add("happy");
    L.happySound();
    L.say(`All better! ${L.cheer()}`);
    rounds += 1;
    L.bumpBadge("dinoScoreVal", rounds);
    maybeCelebrateRecord(rounds);
    const bestEl = document.getElementById("dinoBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("dinoBest");
    // Hearts rise from below the face.
    const rect = face.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
      setT(i * 90, () => {
        const h = document.createElement("div");
        h.className = "dino-heart";
        h.textContent = "❤️";
        h.style.left = (rect.left + rect.width * (0.18 + Math.random() * 0.64)) + "px";
        h.style.top  = (rect.top + rect.height * 0.85) + "px";
        document.body.appendChild(h);
        setTimeout(() => h.remove(), 1900);
      });
    }
    setT(2400, newRound);
  }

  function maybeCelebrateRecord(value) {
    if (value > bestAtStart && !celebrated) {
      celebrated = true;
      setTimeout(() => L.celebrateNewHigh(value), 700);
    }
    L.bumpHighScore("dinoBest", value);
  }

  function start() {
    rounds = 0;
    celebrated = false;
    bestAtStart = L.getHighScore("dinoBest");
    clearAll();
    const stage = document.getElementById("dinoStage");
    stage.innerHTML = `
      <div id="dinoFace" class="dino-face">${FACE_SVG}</div>
      <div id="dinoAilments" class="dino-ailments"></div>`;
    L.bumpBadge("dinoScoreVal", 0);
    const bestEl = document.getElementById("dinoBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("dinoBest");
    newRound();
  }

  function stop() { clearAll(); }

  L.games.dino = { screen: "dinoGame", start, stop };
})();
