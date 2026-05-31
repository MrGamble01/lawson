// ---------- Baby Dino: make him better ----------
// v2 — tools + hungry phase + owies + life signs.
//
// Round flow:
//   1. Face appears covered in 6-8 yucky things (paint splats, tears,
//      snot bubbles, owies). Every round guarantees at least one of
//      each kind, so every tool always has work to do.
//   2. Tap an ailment to clean it individually, OR tap the matching
//      tool to wipe all of that kind at once with a "swipe" effect.
//   3. When the face is clean, a 🍼 thought-bubble pops over his head
//      and the bottle tool glows. Tap it to feed him.
//   4. Drinking animation, then heal: smile, hearts, then next round.
(function () {
  const L = window.Lawson;

  // -------- Dino face SVG --------
  // Eye parts are classed so a CSS blink can squash them on a timer.
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
      <circle class="dino-eye-white" cx="115" cy="160" r="32" fill="#fff"/>
      <circle class="dino-eye-white" cx="205" cy="160" r="32" fill="#fff"/>
      <circle class="dino-eye-iris"  cx="115" cy="165" r="22" fill="#3a2208"/>
      <circle class="dino-eye-iris"  cx="205" cy="165" r="22" fill="#3a2208"/>
      <circle class="dino-eye-shine" cx="123" cy="158" r="8"  fill="#fff"/>
      <circle class="dino-eye-shine" cx="213" cy="158" r="8"  fill="#fff"/>
      <circle cx="148" cy="212" r="3" fill="#3a2208"/>
      <circle cx="172" cy="212" r="3" fill="#3a2208"/>
      <path class="dino-mouth-sad"   d="M125 240 Q 160 218 195 240" stroke="#3a2208" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path class="dino-mouth-happy" d="M118 226 Q 160 268 202 226" stroke="#3a2208" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path class="dino-mouth-happy" d="M128 232 Q 160 254 192 232 L 192 234 Q 160 256 128 234 Z" fill="#c2255c"/>
    </svg>`;

  // -------- Ailment SVGs --------
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
  function owieSvg() {
    return `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="22" cy="22" rx="16" ry="11" fill="#e03131" stroke="#a51111" stroke-width="2"/>
      <ellipse cx="22" cy="22" rx="9" ry="5" fill="#a51111"/>
      <ellipse cx="19" cy="20" rx="2" ry="1.4" fill="#ff8585" opacity="0.7"/>
    </svg>`;
  }

  // -------- Tools --------
  // Each tool cleans one or more ailment kinds. Bottle is the only
  // one that advances the round (feeds the dino during hungry phase).
  const TOOLS = [
    { id: "sponge",  emoji: "🧽", cleans: ["splat"],            say: "Scrub scrub!", swipe: "rgba(116, 192, 252, 0.55)" },
    { id: "tissue",  emoji: "🧻", cleans: ["tear", "bubble"],   say: "Wipe wipe!",   swipe: "rgba(255, 250, 230, 0.7)" },
    { id: "bandage", emoji: "🩹", cleans: ["owie"],             say: "All better!",  swipe: "rgba(255, 209, 128, 0.55)" },
    { id: "bottle",  emoji: "🍼", cleans: [],                   say: "Glug glug!",   swipe: "rgba(255, 255, 255, 0.7)" },
  ];

  function toolSound(id) {
    if (id === "sponge") {
      L.beep(280, 0.05, "sawtooth");
      L.beep(220, 0.05, "sawtooth", 0.06);
      L.beep(260, 0.05, "sawtooth", 0.12);
    } else if (id === "tissue") {
      L.beep(900, 0.10, "sine");
      L.beep(720, 0.10, "sine", 0.07);
    } else if (id === "bandage") {
      L.beep(420, 0.16, "triangle");
    } else if (id === "bottle") {
      L.beep(520, 0.06, "sine");
      L.beep(440, 0.06, "sine", 0.07);
      L.beep(380, 0.06, "sine", 0.14);
      L.beep(320, 0.10, "sine", 0.21);
    }
  }

  // -------- State --------
  let ailments = [];
  let placedPositions = [];
  let phase = "sick"; // "sick" | "hungry" | "healing"
  let rounds = 0;
  let bestAtStart = 0;
  let celebrated = false;
  let initialCount = 0;
  let halfwayCheered = false;
  let timers = [];

  function setT(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }

  function generatePos() {
    for (let attempt = 0; attempt < 40; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 34;
      const x = 50 + r * Math.cos(angle);
      const y = 55 + r * Math.sin(angle);
      if (Math.hypot(x - 36, y - 52) < 13) continue;
      if (Math.hypot(x - 64, y - 52) < 13) continue;
      if (placedPositions.some((p) => Math.hypot(p.x - x, p.y - y) < 14)) continue;
      placedPositions.push({ x, y });
      return { x, y };
    }
    const p = { x: 50, y: 75 };
    placedPositions.push(p);
    return p;
  }

  function makeAilmentEl(kind) {
    const el = document.createElement("button");
    el.className = `dino-ailment dino-ailment--${kind}`;
    el.setAttribute("aria-label",
      kind === "splat" ? "Wipe paint splat" :
      kind === "tear"  ? "Wipe tear" :
      kind === "bubble" ? "Pop bubble" :
      "Bandage the owie");
    if (kind === "splat") {
      const c = SPLAT_COLORS[Math.floor(Math.random() * SPLAT_COLORS.length)];
      el.innerHTML = splatSvg(c);
    } else if (kind === "tear")   el.innerHTML = tearSvg();
    else if (kind === "bubble")   el.innerHTML = bubbleSvg();
    else if (kind === "owie")     el.innerHTML = owieSvg();
    return el;
  }

  function newRound() {
    phase = "sick";
    const overlay = document.getElementById("dinoAilments");
    const face = document.getElementById("dinoFace");
    if (!overlay || !face) return;
    overlay.innerHTML = "";
    ailments = [];
    placedPositions = [];
    halfwayCheered = false;
    face.classList.remove("happy");
    removeHungryBubble();

    // Guarantee at least one of each kind so every tool is useful.
    const list = [
      { kind: "splat" }, { kind: "splat" },
      { kind: "tear" }, { kind: "bubble" }, { kind: "owie" },
    ];
    const filler = ["splat", "splat", "tear", "bubble", "owie"];
    const target = 6 + Math.floor(Math.random() * 3);
    while (list.length < target) {
      list.push({ kind: filler[Math.floor(Math.random() * filler.length)] });
    }
    initialCount = list.length;

    L.shuffled(list).forEach((spec) => {
      const pos = generatePos();
      const el = makeAilmentEl(spec.kind);
      el.style.left = pos.x + "%";
      el.style.top  = pos.y + "%";
      const ail = { kind: spec.kind, el };
      ailments.push(ail);
      L.onTap(el, (e) => clean(ail, e));
      overlay.appendChild(el);
    });

    updateToolStates();
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
    } else if (ail.kind === "bubble") {
      L.beep(900 + Math.random() * 300, 0.06, "triangle");
    } else if (ail.kind === "owie") {
      L.beep(440, 0.10, "triangle");
    }

    const p = L.pointOf(e);
    L.sparkleAt(p.x, p.y);
    setT(380, () => ail.el.remove());

    if (!halfwayCheered && ailments.length <= Math.floor(initialCount / 2)) {
      halfwayCheered = true;
      L.say("Almost there!");
    }
    if (ailments.length === 0) setT(550, becomeHungry);
    updateToolStates();
  }

  // -------- Tool rack --------
  function useTool(tool) {
    const btn = document.querySelector(`[data-dinotool="${tool.id}"]`);
    if (btn) {
      btn.classList.add("used");
      setT(500, () => btn.classList.remove("used"));
    }
    toolSound(tool.id);

    // Bottle: feed during hungry phase, otherwise just a friendly say.
    if (tool.id === "bottle") {
      if (phase === "hungry") return feed();
      L.say(tool.say);
      return;
    }

    const matches = ailments.filter((a) => tool.cleans.includes(a.kind));
    L.say(tool.say);
    if (matches.length === 0) return;
    doSwipe(tool.swipe);
    matches.forEach((a, i) => {
      setT(120 + i * 90, () => {
        const r = a.el.getBoundingClientRect();
        const fakeEv = {
          clientX: r.left + r.width / 2,
          clientY: r.top + r.height / 2,
          stopPropagation: () => {},
        };
        clean(a, fakeEv);
      });
    });
  }

  function doSwipe(color) {
    const wrap = document.getElementById("dinoFaceWrap");
    if (!wrap) return;
    const sw = document.createElement("div");
    sw.className = "dino-swipe";
    sw.style.background = color;
    wrap.appendChild(sw);
    setT(750, () => sw.remove());
  }

  function updateToolStates() {
    TOOLS.forEach((t) => {
      const btn = document.querySelector(`[data-dinotool="${t.id}"]`);
      if (!btn) return;
      let ready;
      if (t.id === "bottle") ready = (phase === "hungry");
      else ready = ailments.some((a) => t.cleans.includes(a.kind));
      btn.classList.toggle("ready", ready);
      btn.classList.toggle("dim", !ready);
    });
  }

  function buildTools(parent) {
    const rack = document.createElement("div");
    rack.className = "dino-tools";
    TOOLS.forEach((t) => {
      const b = document.createElement("button");
      b.className = "dino-tool dim";
      b.dataset.dinotool = t.id;
      b.setAttribute("aria-label", t.id);
      b.textContent = t.emoji;
      L.onTap(b, () => useTool(t));
      rack.appendChild(b);
    });
    parent.appendChild(rack);
  }

  // -------- Hungry → feed → heal --------
  function becomeHungry() {
    phase = "hungry";
    const wrap = document.getElementById("dinoFaceWrap");
    if (!wrap) return;
    const bubble = document.createElement("div");
    bubble.id = "dinoHungry";
    bubble.className = "dino-hungry";
    bubble.textContent = "🍼";
    wrap.appendChild(bubble);
    L.say("Now he's hungry! Give him the bottle.");
    updateToolStates();
  }

  function removeHungryBubble() {
    const b = document.getElementById("dinoHungry");
    if (b) b.remove();
  }

  function feed() {
    phase = "healing";
    removeHungryBubble();
    const wrap = document.getElementById("dinoFaceWrap");
    if (!wrap) return;
    const bottle = document.createElement("div");
    bottle.className = "dino-feed-bottle";
    bottle.textContent = "🍼";
    wrap.appendChild(bottle);
    setT(900, () => bottle.remove());
    setT(950, heal);
    updateToolStates();
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

  // -------- Lifecycle --------
  function start() {
    rounds = 0;
    celebrated = false;
    bestAtStart = L.getHighScore("dinoBest");
    clearAll();
    const stage = document.getElementById("dinoStage");
    stage.innerHTML = `
      <div id="dinoFaceWrap" class="dino-face-wrap">
        <div id="dinoFace" class="dino-face">${FACE_SVG}</div>
        <div id="dinoAilments" class="dino-ailments"></div>
      </div>`;
    buildTools(stage);
    L.bumpBadge("dinoScoreVal", 0);
    const bestEl = document.getElementById("dinoBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("dinoBest");
    newRound();
  }

  function stop() { clearAll(); }

  L.games.dino = { screen: "dinoGame", start, stop };
})();
