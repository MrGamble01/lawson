// ---------- Train! ----------
// Drive a chuffing train across a hilly landscape. Three stations
// along the track; the train auto-stops at each, and at each station
// a passenger (animal/kid) hops on or off. Tap the engine to start
// / stop, tap the whistle for a choo-choo, tap the lights for a
// signal. Day/night cycle in the background. Sandbox — no fail
// state, no race, just driving.
(function () {
  const L = window.Lawson;

  // ====================================================================
  //  Catalog: passengers
  // ====================================================================
  const PASSENGERS = [
    { e: "🐶", say: "Woof!" },   { e: "🐱", say: "Meow!" },
    { e: "🐰", say: "Bunny!" },  { e: "🐻", say: "Bear!" },
    { e: "🦊", say: "Fox!" },    { e: "🐼", say: "Panda!" },
    { e: "🐵", say: "Monkey!" }, { e: "🐧", say: "Penguin!" },
    { e: "👶", say: "Baby!" },   { e: "👧", say: "Hello!" },
  ];

  const STATION_COUNT = 3;
  const CHUG_INTERVAL_MS = 380;
  const STATION_DWELL_MS = 3000;

  // ====================================================================
  //  State
  // ====================================================================
  let running = false;
  let currentStation = -1;       // index of station currently boarded, or -1
  let stationsVisited = 0;
  let bestAtStart = 0;
  let celebrated = false;
  let chugTimer = null;
  let dayTimer = null;
  let dayPhase = 0;
  let timers = [];
  let trainPosPct = 22;          // 0..100 across the track; starts at station 1
  let cars = [];                 // [{ passenger or null }] for engine + 3 cars
  let trainMoveTimer = null;

  function setT(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }
  function $(id) { return document.getElementById(id); }

  // ====================================================================
  //  SVG art
  // ====================================================================
  function engineSvg() {
    return `
      <svg viewBox="0 0 180 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="90" cy="106" rx="80" ry="5" fill="rgba(0,0,0,0.22)"/>
        <rect x="40" y="40" width="100" height="48" fill="#fa5252" stroke="#a51111" stroke-width="3"/>
        <rect x="40" y="40" width="100" height="6"  fill="#fff"  stroke="#a51111" stroke-width="2"/>
        <rect x="120" y="14" width="22" height="30" rx="3" fill="#3a1f00"/>
        <rect x="124" y="6"  width="14" height="14" rx="2" fill="#3a1f00"/>
        <circle cx="131" cy="2" r="3" fill="#ddd" opacity="0.7"/>
        <rect x="60" y="20" width="48" height="24" rx="4" fill="#a51111" stroke="#6a0e0e" stroke-width="2"/>
        <rect x="70" y="26" width="28" height="12" fill="#a5d8ff" stroke="#1c7ed6" stroke-width="2"/>
        <circle cx="98" cy="32" r="5" fill="#ffd43b"/>
        <circle cx="98" cy="32" r="2.5" fill="#fff8e1"/>
        <rect x="0" y="60" width="40" height="30" rx="4" fill="#a51111" stroke="#5a0a0a" stroke-width="2.5"/>
        <path d="M0 60 L 8 50 L 40 50 L 40 60 Z" fill="#a51111" stroke="#5a0a0a" stroke-width="2"/>
        <rect x="6" y="40" width="6" height="12" fill="#fff"/>
        <rect x="14" y="44" width="6" height="8" fill="#fff"/>
        <circle cx="50"  cy="92" r="14" fill="#3a1f00"/>
        <circle cx="50"  cy="92" r="9"  fill="#5c3a1a"/>
        <circle cx="50"  cy="92" r="3"  fill="#fff"/>
        <circle cx="92"  cy="96" r="11" fill="#3a1f00"/>
        <circle cx="92"  cy="96" r="7"  fill="#5c3a1a"/>
        <circle cx="92"  cy="96" r="3"  fill="#fff"/>
        <circle cx="128" cy="96" r="11" fill="#3a1f00"/>
        <circle cx="128" cy="96" r="7"  fill="#5c3a1a"/>
        <circle cx="128" cy="96" r="3"  fill="#fff"/>
        <rect x="22" y="86" width="120" height="2" fill="#3a1f00"/>
      </svg>`;
  }

  function carSvg(color) {
    const c = color || "#74c0fc";
    return `
      <svg viewBox="0 0 140 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="70" cy="86" rx="62" ry="4" fill="rgba(0,0,0,0.22)"/>
        <rect x="10" y="24" width="120" height="54" rx="6" fill="${c}" stroke="#3a3a3a" stroke-width="2.5"/>
        <rect x="10" y="24" width="120" height="6" fill="#fff" opacity="0.6"/>
        <rect x="20" y="36" width="22" height="20" rx="2" fill="#a5d8ff" stroke="#1c7ed6" stroke-width="2"/>
        <rect x="56" y="36" width="22" height="20" rx="2" fill="#a5d8ff" stroke="#1c7ed6" stroke-width="2"/>
        <rect x="92" y="36" width="22" height="20" rx="2" fill="#a5d8ff" stroke="#1c7ed6" stroke-width="2"/>
        <line x1="32" y1="36" x2="32" y2="56" stroke="#1c7ed6" stroke-width="1.5"/>
        <line x1="20" y1="46" x2="42" y2="46" stroke="#1c7ed6" stroke-width="1.5"/>
        <circle cx="34"  cy="78" r="10" fill="#3a1f00"/>
        <circle cx="34"  cy="78" r="6"  fill="#5c3a1a"/>
        <circle cx="34"  cy="78" r="2"  fill="#fff"/>
        <circle cx="106" cy="78" r="10" fill="#3a1f00"/>
        <circle cx="106" cy="78" r="6"  fill="#5c3a1a"/>
        <circle cx="106" cy="78" r="2"  fill="#fff"/>
      </svg>`;
  }

  function stationSvg(num) {
    return `
      <svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="50" cy="106" rx="46" ry="3" fill="rgba(0,0,0,0.22)"/>
        <rect x="8" y="50" width="84" height="56" fill="#8b4513" stroke="#5a3a1a" stroke-width="2.5"/>
        <path d="M2 54 L 50 12 L 98 54 Z" fill="#a51111" stroke="#5a0a0a" stroke-width="2.5"/>
        <rect x="22" y="72" width="56" height="34" rx="2" fill="#fff8e1" stroke="#5a3a1a" stroke-width="2"/>
        <rect x="42" y="72" width="16" height="20" fill="#5a3a1a"/>
        <circle cx="56" cy="84" r="1.5" fill="#ffd43b"/>
        <rect x="14" y="60" width="14" height="10" rx="2" fill="#a5d8ff" stroke="#1c7ed6" stroke-width="1.5"/>
        <rect x="72" y="60" width="14" height="10" rx="2" fill="#a5d8ff" stroke="#1c7ed6" stroke-width="1.5"/>
        <text x="50" y="44" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff">${num}</text>
      </svg>`;
  }

  function trackSvg() {
    return `
      <svg viewBox="0 0 1000 50" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <rect x="0" y="22" width="1000" height="4" fill="#5a3a1a"/>
        <rect x="0" y="32" width="1000" height="4" fill="#5a3a1a"/>
        <g fill="#3a1f00">
          ${Array.from({ length: 35 }, (_, i) =>
            `<rect x="${i * 30 + 4}" y="20" width="20" height="20" rx="1"/>`).join("")}
        </g>
      </svg>`;
  }

  function smokeSvg() {
    return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="20" rx="14" ry="11" fill="#fff" opacity="0.85"/>
      <ellipse cx="14" cy="14" rx="6" ry="5" fill="#fff" opacity="0.55"/>
    </svg>`;
  }

  function bigSunSvg() {
    return `<svg viewBox="0 0 80 80">
      <g stroke="#f59f00" stroke-width="4" stroke-linecap="round">
        <line x1="40" y1="4"  x2="40" y2="14"/>
        <line x1="40" y1="66" x2="40" y2="76"/>
        <line x1="4"  y1="40" x2="14" y2="40"/>
        <line x1="66" y1="40" x2="76" y2="40"/>
      </g>
      <circle cx="40" cy="40" r="22" fill="#ffd43b" stroke="#f59f00" stroke-width="2"/>
      <circle cx="34" cy="36" r="2" fill="#5c3700"/>
      <circle cx="46" cy="36" r="2" fill="#5c3700"/>
      <path d="M32 46 Q 40 52 48 46" stroke="#5c3700" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`;
  }

  // ====================================================================
  //  Build scene
  // ====================================================================
  function build() {
    const stage = $("trainStage");
    stage.innerHTML = `
      <div id="trainSky" class="train-sky">
        <div id="trainSun" class="train-sun" aria-label="Sun">${bigSunSvg()}</div>
        <div class="train-cloud train-cloud--1" aria-hidden="true"></div>
        <div class="train-cloud train-cloud--2" aria-hidden="true"></div>
        <div class="train-cloud train-cloud--3" aria-hidden="true"></div>
      </div>
      <div class="train-hills"></div>
      <div class="train-ground"></div>
      <div id="trainStations" class="train-stations"></div>
      <div class="train-track">${trackSvg()}</div>
      <div id="trainConvoy" class="train-convoy">
        <div id="trainCar3" class="train-car" data-car="2">${carSvg("#51cf66")}<div class="train-pass"></div></div>
        <div id="trainCar2" class="train-car" data-car="1">${carSvg("#fab005")}<div class="train-pass"></div></div>
        <div id="trainCar1" class="train-car" data-car="0">${carSvg("#74c0fc")}<div class="train-pass"></div></div>
        <button id="trainEngine" class="train-engine" aria-label="Engine">${engineSvg()}</button>
        <div id="trainSmoke" class="train-smoke"></div>
      </div>
      <div class="train-controls">
        <button id="trainWhistle" class="train-ctl" aria-label="Whistle">🚂</button>
        <button id="trainGoStop"  class="train-ctl" aria-label="Go / Stop">▶︎</button>
      </div>`;
    cars = [{ passenger: null }, { passenger: null }, { passenger: null }];
    buildStations();
    setupEngine();
    setupWhistle();
    setupGoStop();
    setupSun();
    setupClouds();
    startDayCycle();
  }

  function buildStations() {
    const cont = $("trainStations");
    cont.innerHTML = "";
    const xs = [22, 50, 78]; // percent across the track
    for (let i = 0; i < STATION_COUNT; i++) {
      const s = document.createElement("button");
      s.className = "train-station";
      s.dataset.station = String(i);
      s.setAttribute("aria-label", `Station ${i + 1}`);
      s.style.left = xs[i] + "%";
      s.innerHTML = stationSvg(i + 1);
      cont.appendChild(s);
      L.onTap(s, () => {
        L.beep(620, 0.06, "triangle");
        L.beep(720, 0.08, "triangle", 0.06);
        L.say(`Station ${i + 1}!`);
      });
    }
  }

  function stationXs() { return [22, 50, 78]; }

  function setupEngine() {
    const eng = $("trainEngine");
    L.onTap(eng, () => {
      // Tap engine briefly bounces it and toggles running.
      eng.classList.add("train-react");
      setT(420, () => eng.classList.remove("train-react"));
      toggleRun();
    });
  }

  function setupWhistle() {
    const w = $("trainWhistle");
    L.onTap(w, () => {
      L.beep(900, 0.18, "sine");
      L.beep(720, 0.22, "sine", 0.18);
      L.beep(900, 0.18, "sine", 0.42);
      L.haptic([8, 30, 8]);
      L.say("Choo choo!");
      // Smoke puffs
      for (let k = 0; k < 4; k++) setT(k * 120, () => puffSmoke());
    });
  }

  function setupGoStop() {
    const b = $("trainGoStop");
    L.onTap(b, () => toggleRun());
  }

  function toggleRun() {
    if (running) stopTrain();
    else startTrain();
  }

  function startTrain() {
    if (running) return;
    running = true;
    const b = $("trainGoStop");
    if (b) b.textContent = "⏸";
    L.beep(420, 0.1, "triangle");
    L.say("All aboard!");
    chugTimer = setInterval(() => {
      if (!running) return;
      chug();
    }, CHUG_INTERVAL_MS);
    advanceTrain();
  }

  function stopTrain() {
    running = false;
    const b = $("trainGoStop");
    if (b) b.textContent = "▶︎";
    if (chugTimer) { clearInterval(chugTimer); chugTimer = null; }
    if (trainMoveTimer) { clearTimeout(trainMoveTimer); trainMoveTimer = null; }
  }

  function chug() {
    puffSmoke();
    L.beep(180 + Math.random() * 80, 0.05, "sawtooth");
    L.beep(150, 0.05, "sawtooth", 0.06);
  }

  function puffSmoke() {
    const stage = $("trainConvoy");
    if (!stage) return;
    const p = document.createElement("div");
    p.className = "train-puff";
    p.innerHTML = smokeSvg();
    const eng = $("trainEngine");
    const r = eng.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    p.style.left = (r.right - sr.left - 32) + "px";
    p.style.top  = (r.top - sr.top - 30) + "px";
    stage.appendChild(p);
    setTimeout(() => p.remove(), 1500);
  }

  function advanceTrain() {
    if (!running) return;
    // Move 0.4% per frame at ~30fps until next station.
    const targetX = nextStationX();
    const dir = targetX > trainPosPct ? 1 : -1;
    function step() {
      if (!running) return;
      trainPosPct += dir * 0.45;
      if ((dir > 0 && trainPosPct >= targetX) || (dir < 0 && trainPosPct <= targetX)) {
        trainPosPct = targetX;
        positionTrain();
        arriveAtStation();
        return;
      }
      positionTrain();
      trainMoveTimer = setTimeout(step, 32);
    }
    step();
  }

  function nextStationX() {
    const xs = stationXs();
    for (const x of xs) {
      if (x > trainPosPct + 1) return x;
    }
    // Loop back to first
    return xs[0];
  }

  function positionTrain() {
    const c = $("trainConvoy");
    if (!c) return;
    c.style.left = trainPosPct + "%";
  }

  function arriveAtStation() {
    const xs = stationXs();
    const idx = xs.indexOf(trainPosPct);
    currentStation = idx;
    L.beep(620, 0.10, "triangle");
    L.beep(720, 0.12, "triangle", 0.10);
    L.haptic([8, 30, 8]);
    L.say(`Station ${idx + 1}!`);
    stationsVisited += 1;
    L.bumpBadge("trainScoreVal", stationsVisited);
    if (stationsVisited > bestAtStart && !celebrated) {
      celebrated = true;
      setTimeout(() => L.celebrateNewHigh(stationsVisited), 700);
    }
    L.bumpHighScore("trainBest", stationsVisited);
    refreshBestBadge();
    if (stationsVisited >= 1)  L.earnSticker && L.earnSticker("trainEngineer");
    if (stationsVisited >= 10) L.earnSticker && L.earnSticker("trainConductor");
    boardOrLeave(idx);
    // Hang around the station, then continue.
    setT(STATION_DWELL_MS, () => {
      if (!running) return;
      advanceTrain();
    });
  }

  function refreshBestBadge() {
    const bestEl = $("trainBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("trainBest");
  }

  function boardOrLeave(stationIdx) {
    // Pick a car at random: if empty, a passenger boards; if full, leaves.
    const carIdx = Math.floor(Math.random() * cars.length);
    const car = cars[carIdx];
    const carEl = document.querySelector(`.train-car[data-car="${carIdx}"] .train-pass`);
    if (!carEl) return;
    if (car.passenger) {
      // Leaving
      carEl.innerHTML = "";
      L.beep(880, 0.06, "sine");
      L.say(`Bye bye!`);
      car.passenger = null;
    } else {
      // Boarding
      const p = PASSENGERS[Math.floor(Math.random() * PASSENGERS.length)];
      car.passenger = p;
      carEl.textContent = p.e;
      L.beep(640, 0.06, "triangle");
      L.beep(720, 0.06, "triangle", 0.06);
      L.say(p.say);
    }
  }

  // ====================================================================
  //  Sun / clouds / day cycle
  // ====================================================================
  function setupSun() {
    const sun = $("trainSun");
    L.onTap(sun, () => {
      L.beep(880, 0.10, "sine");
      L.say(dayPhase >= 2 ? "Moon!" : "Sunshine!");
      sun.classList.remove("spinning");
      void sun.offsetWidth;
      sun.classList.add("spinning");
      setT(900, () => sun.classList.remove("spinning"));
    });
  }

  function setupClouds() {
    document.querySelectorAll(".train-cloud").forEach((c) => {
      L.onTap(c, () => {
        L.beep(620, 0.08, "sine");
        L.say("Cloud!");
      });
    });
  }

  function startDayCycle() {
    applyDay();
    dayTimer = setInterval(() => {
      dayPhase = (dayPhase + 1) % 4;
      applyDay();
    }, 30_000);
  }

  function applyDay() {
    const sky = $("trainSky");
    if (!sky) return;
    const phases = [
      "linear-gradient(180deg, #a5d8ff 0%, #ffe066 80%, #fff3bf 100%)",
      "linear-gradient(180deg, #74c0fc 0%, #a5d8ff 60%, #d0ebff 100%)",
      "linear-gradient(180deg, #ffd6a5 0%, #ffa94d 60%, #ff8787 100%)",
      "linear-gradient(180deg, #1c1138 0%, #2e1b5b 50%, #4a1b5e 100%)",
    ];
    sky.style.background = phases[dayPhase % phases.length];
  }

  // ====================================================================
  //  Lifecycle
  // ====================================================================
  function start() {
    running = false;
    trainPosPct = 22;       // start parked at first station so it's visible
    currentStation = 0;
    stationsVisited = 0;
    celebrated = false;
    dayPhase = 0;
    bestAtStart = L.getHighScore("trainBest");
    clearAll();
    if (chugTimer) { clearInterval(chugTimer); chugTimer = null; }
    if (dayTimer)  { clearInterval(dayTimer); dayTimer = null; }
    build();
    L.bumpBadge("trainScoreVal", 0);
    refreshBestBadge();
    positionTrain();
    L.say("Tap the engine to go!");
  }

  function stop() {
    running = false;
    clearAll();
    if (chugTimer) { clearInterval(chugTimer); chugTimer = null; }
    if (dayTimer)  { clearInterval(dayTimer); dayTimer = null; }
    if (trainMoveTimer) { clearTimeout(trainMoveTimer); trainMoveTimer = null; }
  }

  L.games.train = { screen: "trainGame", start, stop };
})();
