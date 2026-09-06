// ---------- Baby Dino: bath time ----------
// v3 — the cleaning game IS the bath now. Three drag phases:
//   1. SOAP   — drag the soap bar across his face; lather bubbles
//                appear under your finger.
//   2. SHOWER — drag the shower head down; water rinses the lather.
//   3. TOWEL  — drag the towel across his face; droplets are wiped off.
// Then he smiles, hearts rise, and a new round starts.
(function () {
  const L = window.Lawson;

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

  const LATHER_GOAL = 22;
  const LATHER_MIN_DIST_PCT = 7;
  const DROPLET_COUNT = 9;
  const TOWEL_WIPE_RADIUS = 56;
  const SHOWER_PULL_THRESHOLD = 50;

  // -------- State --------
  let phase = "soap";       // "soap" | "shower" | "towel" | "happy"
  let rounds = 0;
  let bestAtStart = 0;
  let celebrated = false;
  let lather = [];          // [{ el, x%, y% }]
  let droplets = [];
  let timers = [];
  let lastLatherTime = 0;
  let showerActive = false;

  function setT(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }
  function $(id) { return document.getElementById(id); }

  function build() {
    const stage = $("dinoStage");
    stage.innerHTML = `
      <div id="dinoFaceWrap" class="dino-face-wrap">
        <div id="dinoShower" class="dino-shower" role="button" tabindex="0" aria-label="Pull the shower">
          <div class="dino-shower-hose"></div>
          <div class="dino-shower-head">🚿</div>
        </div>
        <div id="dinoShowerWater" class="dino-shower-water"></div>
        <div id="dinoFace" class="dino-face">${FACE_SVG}</div>
        <div id="dinoLather" class="dino-lather"></div>
        <div id="dinoDroplets" class="dino-droplets"></div>
      </div>
      <div id="dinoPrompt" class="dino-bath-prompt">Wash him with soap!</div>
      <div class="dino-bath-rack">
        <button id="dinoSoap" class="dino-bath-tool dino-soap" aria-label="Soap">🧼</button>
        <button id="dinoTowel" class="dino-bath-tool dino-towel" aria-label="Towel">
          <span class="dino-towel-shape"></span>
        </button>
      </div>`;
    setupSoap();
    setupShower();
    setupTowel();
  }

  function enterPhase(p) {
    phase = p;
    autoBusy = false;
    document.body.dataset.dinoPhase = p;
    const prompt = $("dinoPrompt");
    if (p === "soap") {
      if (prompt) prompt.textContent = "Wash him with soap!";
      L.say("Wash him with soap!");
    } else if (p === "shower") {
      if (prompt) prompt.textContent = "Pull the shower to rinse!";
      L.say("Now rinse him off!");
    } else if (p === "towel") {
      if (prompt) prompt.textContent = "Dry him with the towel!";
      L.say("Dry him with the towel!");
    } else if (p === "happy") {
      if (prompt) prompt.textContent = "All clean!";
      heal();
    }
  }

  // -------- Phase 1: Soap drag --------
  function setupSoap() {
    const soap = $("dinoSoap");
    let dragging = false;
    let down = null;

    function onDown(e) {
      if (phase !== "soap") return;
      dragging = true;
      down = { x: e.clientX, y: e.clientY };
      soap.setPointerCapture?.(e.pointerId);
      soap.classList.add("grabbed");
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      moveFloating(soap, e.clientX, e.clientY);
      const faceRect = $("dinoFaceWrap").getBoundingClientRect();
      if (inside(e.clientX, e.clientY, faceRect)) {
        maybeDropLather(e.clientX, e.clientY, faceRect);
      }
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      soap.classList.remove("grabbed");
      releaseFloating(soap);
      // A tap (no drag) scrubs for him — see autoScrub.
      if (down && e && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8) { down = null; autoScrub(); return; }
      down = null;
      if (lather.length >= LATHER_GOAL && phase === "soap") {
        setT(280, () => enterPhase("shower"));
      }
    }
    soap.addEventListener("pointerdown", onDown);
    soap.addEventListener("pointermove", onMove);
    soap.addEventListener("pointerup", onUp);
    soap.addEventListener("pointercancel", onUp);
    soap.addEventListener("click", (e) => { if (e.detail === 0) autoScrub(); }); // keyboard
  }

  // Tap alternative to the soap drag (WCAG 2.2 §2.5.7): the soap sweeps
  // itself over his face in a zigzag, lathering as it goes, until the
  // lather goal is met — the same lather bubbles a drag would leave.
  let autoBusy = false;
  function autoScrub() {
    if (phase !== "soap" || autoBusy) return;
    const soap = $("dinoSoap"), wrap = $("dinoFaceWrap");
    if (!soap || !wrap) return;
    autoBusy = true;
    soap.classList.add("grabbed");
    // 5×5 zigzag, 17.5% apart: well over LATHER_MIN_DIST_PCT, so every dab
    // lands (25 ≥ LATHER_GOAL) and one pass is enough.
    const path = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const c = row % 2 ? 4 - col : col;
        path.push({ px: 15 + c * 17.5, py: 15 + row * 17.5 });
      }
    }
    let i = 0;
    const step = () => {
      if (phase !== "soap") { finish(); return; }
      const r = wrap.getBoundingClientRect();
      const p = path[i % path.length];
      const x = r.left + (p.px / 100) * r.width, y = r.top + (p.py / 100) * r.height;
      moveFloating(soap, x, y);
      lastLatherTime = 0; // each step is a deliberate dab
      maybeDropLather(x, y, r);
      i += 1;
      if (lather.length >= LATHER_GOAL || i >= path.length * 4) {
        finish();
        setT(280, () => { if (phase === "soap") enterPhase("shower"); });
        return;
      }
      setT(90, step);
    };
    const finish = () => { autoBusy = false; soap.classList.remove("grabbed"); releaseFloating(soap); };
    step();
  }

  function maybeDropLather(clientX, clientY, faceRect) {
    const now = Date.now();
    if (now - lastLatherTime < 55) return;
    lastLatherTime = now;
    const px = ((clientX - faceRect.left) / faceRect.width) * 100;
    const py = ((clientY - faceRect.top) / faceRect.height) * 100;
    if (lather.some((b) => Math.hypot(b.x - px, b.y - py) < LATHER_MIN_DIST_PCT)) return;
    addLather(px, py);
  }

  function addLather(px, py) {
    const cont = $("dinoLather");
    if (!cont) return;
    const b = document.createElement("div");
    b.className = "dino-lather-bubble";
    b.style.left = px + "%";
    b.style.top = py + "%";
    cont.appendChild(b);
    lather.push({ el: b, x: px, y: py });
    L.beep(820 + Math.random() * 220, 0.04, "sine");
  }

  // -------- Phase 2: Shower drag --------
  function setupShower() {
    const shower = $("dinoShower");
    let dragging = false;
    let startY = 0;

    let startX = 0;

    function onDown(e) {
      if (phase !== "shower" || showerActive) return;
      dragging = true;
      startY = e.clientY;
      startX = e.clientX;
      shower.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      const dy = Math.max(0, Math.min(140, e.clientY - startY));
      shower.style.transform = `translateY(${dy}px)`;
      if (dy >= SHOWER_PULL_THRESHOLD && !showerActive) startShower();
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      // A tap (no pull) turns the shower on too.
      if (!showerActive && e && Math.hypot(e.clientX - startX, e.clientY - startY) < 8) { startShower(); return; }
      if (!showerActive) {
        shower.style.transform = "";
      }
    }
    shower.addEventListener("pointerdown", onDown);
    shower.addEventListener("pointermove", onMove);
    shower.addEventListener("pointerup", onUp);
    shower.addEventListener("pointercancel", onUp);
    shower.addEventListener("click", (e) => { if (e.detail === 0 && phase === "shower" && !showerActive) startShower(); });
  }

  function startShower() {
    showerActive = true;
    const shower = $("dinoShower");
    const water = $("dinoShowerWater");
    if (shower) shower.classList.add("active");
    if (water) water.classList.add("on");
    L.say("Splash splash!");
    L.beep(720, 0.5, "sine");
    L.beep(900, 0.4, "triangle", 0.12);
    lather.forEach((b, i) => {
      setT(150 + i * 55, () => {
        b.el.classList.add("rinsed");
        setT(420, () => b.el.remove());
      });
    });
    setT(2500, () => {
      lather = [];
      if (shower) {
        shower.classList.remove("active");
        shower.style.transform = "";
      }
      if (water) water.classList.remove("on");
      placeDroplets();
      showerActive = false;
      enterPhase("towel");
    });
  }

  function placeDroplets() {
    const cont = $("dinoDroplets");
    if (!cont) return;
    cont.innerHTML = "";
    droplets = [];
    const placed = [];
    let attempts = 0;
    while (droplets.length < DROPLET_COUNT && attempts++ < 60) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 32;
      const x = 50 + r * Math.cos(angle);
      const y = 55 + r * Math.sin(angle);
      if (Math.hypot(x - 36, y - 52) < 13) continue;
      if (Math.hypot(x - 64, y - 52) < 13) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < 9)) continue;
      placed.push({ x, y });
      const d = document.createElement("div");
      d.className = "dino-droplet";
      d.style.left = x + "%";
      d.style.top = y + "%";
      d.textContent = "💧";
      cont.appendChild(d);
      droplets.push({ el: d, x, y });
    }
  }

  // -------- Phase 3: Towel drag --------
  function setupTowel() {
    const towel = $("dinoTowel");
    let dragging = false;
    let down = null;

    function onDown(e) {
      if (phase !== "towel") return;
      dragging = true;
      down = { x: e.clientX, y: e.clientY };
      towel.setPointerCapture?.(e.pointerId);
      towel.classList.add("grabbed");
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      moveFloating(towel, e.clientX, e.clientY);
      wipeNearby(e.clientX, e.clientY);
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      towel.classList.remove("grabbed");
      releaseFloating(towel);
      // A tap (no drag) dries him — see autoDry.
      if (down && e && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8) autoDry();
      down = null;
    }
    towel.addEventListener("pointerdown", onDown);
    towel.addEventListener("pointermove", onMove);
    towel.addEventListener("pointerup", onUp);
    towel.addEventListener("pointercancel", onUp);
    towel.addEventListener("click", (e) => { if (e.detail === 0) autoDry(); }); // keyboard
  }

  // Tap alternative to the towel drag: the towel visits each droplet in
  // turn and wipes it, ending the phase exactly as a drag would.
  function autoDry() {
    if (phase !== "towel" || autoBusy) return;
    const towel = $("dinoTowel"), wrap = $("dinoFaceWrap");
    if (!towel || !wrap) return;
    autoBusy = true;
    towel.classList.add("grabbed");
    const finish = () => { autoBusy = false; towel.classList.remove("grabbed"); releaseFloating(towel); };
    const step = () => {
      const d = droplets[0];
      if (!d || phase !== "towel") { finish(); return; }
      const r = wrap.getBoundingClientRect();
      const x = r.left + (d.x / 100) * r.width, y = r.top + (d.y / 100) * r.height;
      moveFloating(towel, x, y);
      wipeNearby(x, y);
      if (phase !== "towel" || droplets.length === 0) { finish(); return; }
      setT(130, step);
    };
    step();
  }

  function wipeNearby(clientX, clientY) {
    const wrap = $("dinoFaceWrap");
    if (!wrap) return;
    const faceRect = wrap.getBoundingClientRect();
    const wiped = [];
    droplets = droplets.filter((d) => {
      const dx = faceRect.left + (d.x / 100) * faceRect.width;
      const dy = faceRect.top + (d.y / 100) * faceRect.height;
      if (Math.hypot(dx - clientX, dy - clientY) < TOWEL_WIPE_RADIUS) {
        d.el.classList.add("wiped");
        setT(320, () => d.el.remove());
        wiped.push(d);
        return false;
      }
      return true;
    });
    if (wiped.length) L.beep(540 + Math.random() * 160, 0.04, "sine");
    if (droplets.length === 0 && phase === "towel") {
      enterPhase("happy");
    }
  }

  // -------- Shared drag helpers --------
  function moveFloating(el, clientX, clientY) {
    el.style.position = "fixed";
    el.style.left = (clientX - el.offsetWidth / 2) + "px";
    el.style.top  = (clientY - el.offsetHeight / 2) + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";
  }
  function releaseFloating(el) {
    el.style.position = "";
    el.style.left = "";
    el.style.top = "";
    el.style.right = "";
    el.style.bottom = "";
  }
  function inside(x, y, r) {
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  // -------- Heal --------
  function heal() {
    const face = $("dinoFace");
    if (!face) return;
    face.classList.add("happy");
    L.happySound();
    L.say(`All clean! ${L.cheer()}`);
    rounds += 1;
    L.bumpBadge("dinoScoreVal", rounds);
    maybeCelebrateRecord(rounds);
    const bestEl = $("dinoBestVal");
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

  function newRound() {
    lather = [];
    droplets = [];
    showerActive = false;
    const face = $("dinoFace");
    if (face) face.classList.remove("happy");
    const l = $("dinoLather"); if (l) l.innerHTML = "";
    const d = $("dinoDroplets"); if (d) d.innerHTML = "";
    const shower = $("dinoShower");
    if (shower) { shower.classList.remove("active"); shower.style.transform = ""; }
    const water = $("dinoShowerWater"); if (water) water.classList.remove("on");
    enterPhase("soap");
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
    build();
    L.bumpBadge("dinoScoreVal", 0);
    const bestEl = $("dinoBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("dinoBest");
    enterPhase("soap");
  }
  function stop() {
    clearAll();
    delete document.body.dataset.dinoPhase;
  }
  L.games.dino = { screen: "dinoGame", start, stop };
})();
