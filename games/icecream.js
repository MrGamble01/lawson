// ---------- Ice Cream! ----------
// Make a sundae. Drag flavored scoops out of the freezer onto your
// cone — they stack up. Add toppings (chocolate sauce, sprinkles,
// cherries, banana slices, whipped cream). When you're done, tap the
// "Eat!" button (or tap the sundae itself) — Lawson chomps it down
// bite by bite, then a fresh cone appears for the next one.
(function () {
  const L = window.Lawson;

  // ====================================================================
  //  Catalogs
  // ====================================================================
  const FLAVORS = [
    { id: "vanilla",    name: "vanilla",    color: "#fff8e1", topShine: "#fff" },
    { id: "chocolate",  name: "chocolate",  color: "#7a4a20", topShine: "#a0522d" },
    { id: "strawberry", name: "strawberry", color: "#ff8ab0", topShine: "#ffc9d6" },
    { id: "mint",       name: "mint",       color: "#a9e34b", topShine: "#d8f5a2" },
    { id: "blueberry",  name: "blueberry",  color: "#7048e8", topShine: "#bac8ff" },
    { id: "banana",     name: "banana",     color: "#ffec99", topShine: "#fff3bf" },
  ];

  const TOPPINGS = [
    { id: "sprinkles", emoji: "🌈", name: "sprinkles", say: "Sprinkles!" },
    { id: "chocsauce", emoji: "🍫", name: "chocolate sauce", say: "Chocolate sauce!" },
    { id: "cherry",    emoji: "🍒", name: "cherry", say: "Cherry on top!" },
    { id: "banana",    emoji: "🍌", name: "banana slice", say: "Banana!" },
    { id: "whip",      emoji: "🍦", name: "whipped cream", say: "Whippy whip!" },
    { id: "berry",     emoji: "🫐", name: "blueberry", say: "Blueberries!" },
    { id: "nut",       emoji: "🥜", name: "nuts", say: "Crunchy nuts!" },
    { id: "cookie",    emoji: "🍪", name: "cookie crumbs", say: "Cookie crumbs!" },
  ];

  const CONE_TYPES = [
    { id: "waffle", emoji: "🍦", name: "waffle cone" },
    { id: "cup",    emoji: "🥣", name: "cup" },
  ];

  // ====================================================================
  //  State
  // ====================================================================
  let scoops = [];       // [{ flavor }]
  let placedToppings = []; // [{ topping, x%, y%, el }]
  let sundaesEaten = 0;
  let bites = 0;
  let bestAtStart = 0;
  let celebrated = false;
  let timers = [];

  function setT(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }
  function $(id) { return document.getElementById(id); }

  // ====================================================================
  //  SVG art
  // ====================================================================
  function coneSvg() {
    return `
      <svg viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="60" cy="172" rx="50" ry="4" fill="rgba(0,0,0,0.22)"/>
        <path d="M22 76 L 98 76 L 60 172 Z" fill="#d4a060" stroke="#8b6230" stroke-width="2.5" stroke-linejoin="round"/>
        <line x1="30" y1="92" x2="88" y2="92" stroke="#8b6230" stroke-width="1.5"/>
        <line x1="35" y1="108" x2="84" y2="108" stroke="#8b6230" stroke-width="1.5"/>
        <line x1="40" y1="124" x2="80" y2="124" stroke="#8b6230" stroke-width="1.5"/>
        <line x1="45" y1="140" x2="76" y2="140" stroke="#8b6230" stroke-width="1.5"/>
        <line x1="50" y1="156" x2="72" y2="156" stroke="#8b6230" stroke-width="1.5"/>
        <line x1="40" y1="76" x2="60" y2="172" stroke="#8b6230" stroke-width="1.5"/>
        <line x1="80" y1="76" x2="60" y2="172" stroke="#8b6230" stroke-width="1.5"/>
        <line x1="20" y1="76" x2="98" y2="76" stroke="#8b6230" stroke-width="2.5"/>
      </svg>`;
  }

  function scoopSvg(color, topShine) {
    return `
      <svg viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M10 56 Q 12 28 28 18 Q 40 8 50 12 Q 60 8 72 18 Q 88 28 90 56 Z"
              fill="${color}" stroke="#5a3a1a" stroke-width="2" stroke-linejoin="round"/>
        <ellipse cx="32" cy="28" rx="12" ry="6" fill="${topShine}" opacity="0.7"/>
        <ellipse cx="68" cy="32" rx="8" ry="4" fill="${topShine}" opacity="0.55"/>
        <path d="M20 50 Q 30 46 26 56" stroke="rgba(0,0,0,0.18)" stroke-width="1.5" fill="none"/>
        <path d="M76 48 Q 86 46 78 58" stroke="rgba(0,0,0,0.18)" stroke-width="1.5" fill="none"/>
      </svg>`;
  }

  function tubSvg(flavor) {
    return `
      <svg viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="10" y="30" width="100" height="74" rx="6" fill="#5a5a5a" stroke="#3a3a3a" stroke-width="2.5"/>
        <ellipse cx="60" cy="32" rx="50" ry="10" fill="${flavor.color}" stroke="#3a3a3a" stroke-width="2"/>
        <ellipse cx="60" cy="28" rx="46" ry="7" fill="${flavor.topShine}" opacity="0.7"/>
        <text x="60" y="90" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff" font-family="Arial Black, sans-serif">${flavor.name.toUpperCase()}</text>
      </svg>`;
  }

  function freezerSvg() {
    return `
      <svg viewBox="0 0 380 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="0" y="0" width="380" height="80" fill="#74c0fc" stroke="#1c7ed6" stroke-width="3"/>
        <path d="M0 6 L 380 6" stroke="#a5d8ff" stroke-width="3"/>
        <path d="M0 14 L 380 14" stroke="#a5d8ff" stroke-width="1.5"/>
        <rect x="10" y="22" width="360" height="52" rx="4" fill="rgba(255,255,255,0.32)"/>
      </svg>`;
  }

  // ====================================================================
  //  Build the parlor scene
  // ====================================================================
  function build() {
    const stage = $("icecreamStage");
    stage.innerHTML = `
      <div class="icecream-counter"></div>
      <div class="icecream-shelf">
        <div class="icecream-freezer">${freezerSvg()}</div>
        <div id="icecreamTubs" class="icecream-tubs"></div>
      </div>
      <div class="icecream-stand">
        <div id="icecreamCone" class="icecream-cone" tabindex="-1">${coneSvg()}</div>
        <div id="icecreamStack" class="icecream-stack" tabindex="-1"></div>
        <div id="icecreamToppings" class="icecream-toppings-overlay"></div>
      </div>
      <button id="icecreamEat" class="icecream-eat" disabled>Eat! 🤤</button>
      <div id="icecreamToppingsTray" class="icecream-toppings-tray"></div>`;
    buildTubs();
    buildToppingsTray();
    setupCone();
    setupEatBtn();
  }

  function buildTubs() {
    const cont = $("icecreamTubs");
    cont.innerHTML = "";
    FLAVORS.forEach((f) => {
      const tub = document.createElement("button");
      tub.className = "icecream-tub";
      tub.setAttribute("aria-label", f.name + " ice cream");
      tub.dataset.flavor = f.id;
      tub.innerHTML = tubSvg(f);
      cont.appendChild(tub);
      setupScoopDrag(tub, f);
    });
  }

  function buildToppingsTray() {
    const cont = $("icecreamToppingsTray");
    cont.innerHTML = "";
    TOPPINGS.forEach((t) => {
      const b = document.createElement("button");
      b.className = "icecream-topping-source";
      b.setAttribute("aria-label", t.name);
      b.dataset.topping = t.id;
      b.textContent = t.emoji;
      cont.appendChild(b);
      setupToppingDrag(b, t);
    });
  }

  // ====================================================================
  //  Scoop drag from tub → cone
  // ====================================================================
  function setupScoopDrag(tub, flavor) {
    let dragging = false;
    let ghost = null;
    let downX = 0, downY = 0;

    function makeGhost(x, y) {
      ghost = document.createElement("div");
      ghost.className = "icecream-scoop-ghost";
      ghost.innerHTML = scoopSvg(flavor.color, flavor.topShine);
      ghost.style.left = (x - 50) + "px";
      ghost.style.top  = (y - 30) + "px";
      document.body.appendChild(ghost);
    }
    function moveGhost(x, y) {
      if (!ghost) return;
      ghost.style.left = (x - 50) + "px";
      ghost.style.top  = (y - 30) + "px";
    }
    function dropGhost(x, y) {
      if (ghost) { ghost.remove(); ghost = null; }
      const cone = $("icecreamStack");
      if (!cone) return;
      const r = cone.getBoundingClientRect();
      const expanded = { left: r.left - 40, right: r.right + 40, top: r.top - 100, bottom: r.bottom + 40 };
      if (x >= expanded.left && x <= expanded.right && y >= expanded.top && y <= expanded.bottom) {
        addScoop(flavor);
      }
    }

    tub.addEventListener("pointerdown", (e) => {
      dragging = true;
      downX = e.clientX;
      downY = e.clientY;
      tub.setPointerCapture?.(e.pointerId);
      tub.classList.add("grabbed");
      makeGhost(e.clientX, e.clientY);
      L.beep(620, 0.04, "sine");
      e.preventDefault();
    });
    tub.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      moveGhost(e.clientX, e.clientY);
    });
    tub.addEventListener("pointerup", (e) => {
      if (!dragging) return;
      dragging = false;
      tub.classList.remove("grabbed");
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) {
        // Tap → that scoop goes straight onto the cone (no drag needed).
        if (ghost) { ghost.remove(); ghost = null; }
        addScoop(flavor);
      } else {
        dropGhost(e.clientX, e.clientY);
      }
    });
    tub.addEventListener("click", (e) => { if (e.detail === 0) addScoop(flavor); }); // keyboard
    tub.addEventListener("pointercancel", () => {
      dragging = false;
      tub.classList.remove("grabbed");
      if (ghost) { ghost.remove(); ghost = null; }
    });
  }

  function addScoop(flavor) {
    if (scoops.length >= 6) {
      L.say("That's a tall sundae!");
      return;
    }
    scoops.push({ flavor });
    renderStack();
    L.beep(680, 0.06, "triangle");
    L.beep(820, 0.08, "triangle", 0.06);
    L.haptic(7);
    L.say(`${flavor.name}!`);
    // Wiggle the stack
    const stack = $("icecreamStack");
    stack.classList.remove("icecream-wobble");
    void stack.offsetWidth;
    stack.classList.add("icecream-wobble");
    enableEatBtn();
  }

  function renderStack() {
    const stack = $("icecreamStack");
    if (!stack) return;
    stack.innerHTML = "";
    // Scoops stacked bottom-up.
    scoops.forEach((s, i) => {
      const d = document.createElement("div");
      d.className = "icecream-scoop";
      d.style.bottom = (i * 42) + "px";
      d.style.animationDelay = (i * 0.02) + "s";
      d.innerHTML = scoopSvg(s.flavor.color, s.flavor.topShine);
      stack.appendChild(d);
    });
  }

  // ====================================================================
  //  Topping drag from tray → sundae overlay
  // ====================================================================
  function setupToppingDrag(btn, topping) {
    let dragging = false;
    let ghost = null;
    let downX = 0;
    let downY = 0;

    function makeGhost(x, y) {
      ghost = document.createElement("div");
      ghost.className = "icecream-topping-ghost";
      ghost.textContent = topping.emoji;
      ghost.style.left = (x - 28) + "px";
      ghost.style.top  = (y - 28) + "px";
      document.body.appendChild(ghost);
    }
    function moveGhost(x, y) {
      if (!ghost) return;
      ghost.style.left = (x - 28) + "px";
      ghost.style.top  = (y - 28) + "px";
    }
    function dropGhost(x, y) {
      if (ghost) { ghost.remove(); ghost = null; }
      const stack = $("icecreamStack");
      const cone = $("icecreamCone");
      const r = stack.getBoundingClientRect();
      const cr = cone.getBoundingClientRect();
      const inside = x >= r.left - 50 && x <= r.right + 50 && y <= cr.top + 40 && y >= r.top - 200;
      if (inside) placeTopping(topping, x, y);
    }

    btn.addEventListener("pointerdown", (e) => {
      dragging = true;
      downX = e.clientX;
      downY = e.clientY;
      btn.setPointerCapture?.(e.pointerId);
      btn.classList.add("grabbed");
      makeGhost(e.clientX, e.clientY);
      L.beep(720, 0.04, "sine");
      e.preventDefault();
    });
    btn.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      moveGhost(e.clientX, e.clientY);
    });
    btn.addEventListener("pointerup", (e) => {
      if (!dragging) return;
      dragging = false;
      btn.classList.remove("grabbed");
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved < 6) {
        // Tap → drop topping near the top of the stack.
        if (scoops.length > 0) {
          const stack = $("icecreamStack");
          const r = stack.getBoundingClientRect();
          placeTopping(topping, r.left + r.width / 2 + (Math.random() - 0.5) * 80,
            r.top + (scoops.length * 42 + 30));
        }
        if (ghost) { ghost.remove(); ghost = null; }
      } else {
        dropGhost(e.clientX, e.clientY);
      }
    });
    btn.addEventListener("pointercancel", () => {
      dragging = false;
      btn.classList.remove("grabbed");
      if (ghost) { ghost.remove(); ghost = null; }
    });
  }

  function placeTopping(topping, clientX, clientY) {
    if (scoops.length === 0) {
      L.say("Add a scoop first!");
      return;
    }
    const overlay = $("icecreamToppings");
    const cone = $("icecreamCone");
    const stack = $("icecreamStack");
    const rect = stack.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    const px = Math.max(-20, Math.min(120, x));
    const py = Math.max(-30, Math.min(80, y));
    const el = document.createElement("div");
    el.className = "icecream-placed-topping";
    el.textContent = topping.emoji;
    el.style.left = px + "%";
    el.style.top  = py + "%";
    el.style.setProperty("--rot", ((Math.random() - 0.5) * 30) + "deg");
    overlay.appendChild(el);
    placedToppings.push({ topping, x: px, y: py, el });
    L.beep(720 + Math.random() * 200, 0.05, "triangle");
    L.haptic(5);
    L.say(topping.say);
  }

  // ====================================================================
  //  Cone tap = eat; or use the dedicated "Eat!" button
  // ====================================================================
  function setupCone() {
    const cone = $("icecreamCone");
    L.onTap(cone, () => {
      if (scoops.length > 0) tryEat();
    });
    const stack = $("icecreamStack");
    L.onTap(stack, () => {
      if (scoops.length > 0) tryEat();
    });
  }

  function setupEatBtn() {
    const btn = $("icecreamEat");
    if (!btn) return;
    L.onTap(btn, () => {
      if (scoops.length === 0) {
        L.say("Make a sundae first!");
        return;
      }
      tryEat();
    });
  }

  function enableEatBtn() {
    const btn = $("icecreamEat");
    if (btn) btn.disabled = scoops.length === 0;
  }

  function tryEat() {
    if (scoops.length === 0) return;
    eatBite();
  }

  function eatBite() {
    if (scoops.length === 0) {
      finishSundae();
      return;
    }
    // Eat top scoop + nearby toppings.
    const top = scoops.pop();
    L.beep(420, 0.05, "triangle");
    L.beep(360, 0.05, "triangle", 0.06);
    L.beep(300, 0.05, "triangle", 0.12);
    L.haptic(8);
    L.say("Mmm!");
    bites += 1;
    // Remove placed toppings near top
    const remaining = [];
    placedToppings.forEach((p) => {
      if (Math.random() < 0.6) {
        p.el.classList.add("icecream-eaten");
        setT(280, () => p.el.remove());
      } else {
        remaining.push(p);
      }
    });
    placedToppings = remaining;
    renderStack();
    setT(450, eatBite);
  }

  function finishSundae() {
    sundaesEaten += 1;
    L.bumpBadge("icecreamScoreVal", sundaesEaten);
    if (sundaesEaten > bestAtStart && !celebrated) {
      celebrated = true;
      setTimeout(() => L.celebrateNewHigh(sundaesEaten), 700);
    }
    L.bumpHighScore("icecreamBest", sundaesEaten);
    const bestEl = $("icecreamBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("icecreamBest");
    L.happySound();
    L.say(`${L.cheer()} Yummy!`);
    if (sundaesEaten >= 1) L.earnSticker && L.earnSticker("sundaeStarter");
    if (sundaesEaten >= 5) L.earnSticker && L.earnSticker("sundaeMaker");
    // Clear any straggler toppings
    placedToppings.forEach((p) => p.el.remove());
    placedToppings = [];
    bites = 0;
    enableEatBtn();
    // Fresh cone after a beat
    setT(1400, () => {
      const stack = $("icecreamStack");
      if (stack) stack.innerHTML = "";
      const overlay = $("icecreamToppings");
      if (overlay) overlay.innerHTML = "";
    });
  }

  // ====================================================================
  //  Lifecycle
  // ====================================================================
  function start() {
    scoops = [];
    placedToppings = [];
    sundaesEaten = 0;
    celebrated = false;
    bestAtStart = L.getHighScore("icecreamBest");
    clearAll();
    build();
    L.bumpBadge("icecreamScoreVal", 0);
    const bestEl = $("icecreamBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("icecreamBest");
    L.say("Make a yummy sundae!");
  }

  function stop() {
    clearAll();
    scoops = [];
    placedToppings = [];
  }

  L.games.icecream = { screen: "icecreamGame", start, stop };
})();
