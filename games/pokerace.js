// ---------- Food Karts! ----------
// Pick a driver, pick a burger, fries, or hot-dog kart, and steer to
// the finish. Boosts speed you up. Restart keeps the same driver and kart.
(function () {
  const L = window.Lawson;
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#241c16";
  const FINISH_AT = 480;
  const PADS = [140, 300];
  const VIEW_AHEAD = 240;
  const PLAYER_BOTTOM = 14;
  const PLAYER_HEIGHT = 140;
  const PAD_HEIGHT = 36;
  const FINISH_HEIGHT = 22;
  const CURVE_AMP = 14;
  const CURVE_LEN = 240;
  const ROAD_TOP = 64;

  function roadShift(distance) {
    return Math.sin((distance / CURVE_LEN) * Math.PI * 2) * CURVE_AMP;
  }

  function lanePercent(distance) {
    return 50 + roadShift(distance);
  }

  function roadHalf(remaining) {
    const clamped = Math.max(0, Math.min(VIEW_AHEAD, remaining));
    const travel = 1 - clamped / VIEW_AHEAD;
    return 8 + travel * 30;
  }

  function remainingForY(y, contact) {
    const span = contact - 8;
    if (span <= 0) return 0;
    const travel = (y - 8) / span;
    return VIEW_AHEAD * (1 - Math.max(0, Math.min(1, travel)));
  }

  function el(name, attrs) {
    const node = document.createElementNS(NS, name);
    Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  }
  function add(svg, name, attrs) {
    const node = el(name, attrs);
    svg.appendChild(node);
    return node;
  }
  function ink(attrs) {
    attrs.stroke = INK;
    attrs["stroke-width"] = attrs["stroke-width"] || "4";
    attrs["stroke-linejoin"] = "round";
    return attrs;
  }

  const KARTS = [
    { id: "burger", name: "Hamburger" },
    { id: "fries", name: "French fries" },
    { id: "hotdog", name: "Hot dog" },
  ];

  function drawBurger(svg) {
    add(svg, "ellipse", ink({ cx: "100", cy: "96", rx: "72", ry: "22", fill: "#f3c14b", "data-part": "bun" }));
    add(svg, "circle", { cx: "58", cy: "84", r: "4", fill: "#fffaf3" });
    add(svg, "circle", { cx: "82", cy: "78", r: "4", fill: "#fffaf3" });
    add(svg, "circle", { cx: "108", cy: "80", r: "4", fill: "#fffaf3" });
    add(svg, "circle", { cx: "134", cy: "84", r: "4", fill: "#fffaf3" });
    add(svg, "path", ink({ d: "M28,112 Q100,138 172,112", fill: "none", stroke: "#3d9a4a", "stroke-width": "12", "data-part": "lettuce" }));
    add(svg, "rect", ink({ x: "32", y: "116", width: "136", height: "14", rx: "3", fill: "#ffd43b", "data-part": "cheese" }));
    add(svg, "rect", ink({ x: "30", y: "128", width: "140", height: "22", rx: "8", fill: "#7a3e22", "data-part": "patty" }));
    add(svg, "ellipse", ink({ cx: "100", cy: "156", rx: "74", ry: "16", fill: "#e0a63a", "data-part": "bun" }));
  }

  function drawFries(svg) {
    const fries = [[38, 18, 16, 100], [60, 8, 16, 92], [124, 8, 16, 92], [148, 20, 16, 98]];
    fries.forEach((fry) => {
      add(svg, "rect", ink({
        x: String(fry[0]), y: String(fry[1]), width: String(fry[2]), height: String(fry[3]),
        rx: "5", fill: "#ffd43b", "data-part": "fry",
      }));
    });
    add(svg, "path", ink({
      d: "M38,96 L56,150 L144,150 L162,96 Z",
      fill: "#e03131", "data-part": "box",
    }));
    add(svg, "path", { d: "M56,112 H144", fill: "none", stroke: "#fffaf3", "stroke-width": "4" });
  }

  function drawHotdog(svg) {
    add(svg, "ellipse", ink({ cx: "100", cy: "118", rx: "88", ry: "32", fill: "#f3c14b", "data-part": "bun" }));
    add(svg, "rect", ink({ x: "18", y: "104", width: "164", height: "28", rx: "14", fill: "#d9480f", "data-part": "sausage" }));
    add(svg, "path", { d: "M30,118 Q68,104 100,118 T172,118", fill: "none", stroke: "#f5c518", "stroke-width": "5", "data-part": "mustard" });
  }

  const DRAW = { burger: drawBurger, fries: drawFries, hotdog: drawHotdog };

  function drawKart(parent, id) {
    const svg = el("svg", { viewBox: "0 0 200 190" });
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "pokerace-kart-art");
    svg.setAttribute("data-kart", id);
    DRAW[id](svg);
    parent.appendChild(svg);
  }

  function drawChassis(parent) {
    const svg = el("svg", { viewBox: "0 0 200 190" });
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "pokerace-kart-art");
    add(svg, "rect", ink({ x: "46", y: "150", width: "108", height: "14", rx: "6", fill: "#3a2a22", "data-part": "chassis" }));
    add(svg, "circle", ink({ cx: "62", cy: "172", r: "14", fill: "#241c16", "data-part": "wheel" }));
    add(svg, "circle", ink({ cx: "138", cy: "172", r: "14", fill: "#241c16", "data-part": "wheel" }));
    add(svg, "circle", { cx: "62", cy: "172", r: "5", fill: "#f6e7c1" });
    add(svg, "circle", { cx: "138", cy: "172", r: "5", fill: "#f6e7c1" });
    parent.appendChild(svg);
  }

  function createRace(driver, kart) {
    return {
      driver: driver,
      kart: kart,
      x: 0,
      distance: 0,
      speed: 0,
      boostTime: 0,
      charges: 2,
      finished: false,
      padsTaken: [],
      elapsed: 0,
    };
  }

  function stepRace(state, dt, input) {
    if (state.finished) return state;
    const steer = input && input.steer ? input.steer : 0;
    if (input && input.boost && state.charges > 0 && state.boostTime <= 0) {
      state.charges -= 1;
      state.boostTime = 1.3;
    }
    const before = state.distance;
    state.x = Math.max(-1, Math.min(1, state.x + steer * 1.6 * dt));
    state.elapsed += dt;
    const off = Math.abs(state.x) > 0.75;
    const fast = state.boostTime > 0;
    state.speed = (fast ? 170 : 100) * (off ? 0.5 : 1);
    state.distance = Math.min(FINISH_AT, before + state.speed * dt);
    PADS.forEach((pad) => {
      if (before < pad && state.distance >= pad && Math.abs(state.x) <= 0.45 && state.padsTaken.indexOf(pad) < 0) {
        state.padsTaken.push(pad);
        state.boostTime = Math.max(state.boostTime, 1.3);
      }
    });
    if (state.boostTime > 0) state.boostTime = Math.max(0, state.boostTime - dt);
    if (state.distance >= FINISH_AT) {
      state.finished = true;
      state.speed = 0;
    }
    return state;
  }

  function resetRace(state) {
    return createRace(state.driver, state.kart);
  }

  function contactLine(stageHeight) {
    return stageHeight - PLAYER_BOTTOM - PLAYER_HEIGHT;
  }

  // Ahead of the kart is the top of the road. Remaining distance shrinks
  // the marker down toward the kart's nose, and zero remaining puts the
  // marker's center on that line.
  function approachTop(remaining, contactPx, markerHeight) {
    const clamped = Math.max(-markerHeight, Math.min(VIEW_AHEAD, remaining));
    const travel = 1 - clamped / VIEW_AHEAD;
    const horizon = 8;
    const atContact = contactPx - markerHeight / 2;
    return horizon + travel * (atContact - horizon);
  }

  function markerVisible(remaining, markerHeight) {
    return remaining <= VIEW_AHEAD && remaining >= -markerHeight;
  }

  let state = null;
  let phase = "driver";
  let running = false;
  let raf = 0;
  let last = 0;
  let epoch = 0;
  let boostQueued = false;
  let bound = false;
  const held = { left: false, right: false };

  function show(id, on) {
    const node = document.getElementById(id);
    if (node) node.hidden = !on;
  }

  function showOnly(which) {
    phase = which;
    show("pokeraceDrivers", which === "driver");
    show("pokeraceKarts", which === "kart");
    show("pokeraceStage", which === "race" || which === "done");
    show("pokeraceControls", which === "race");
    show("pokeraceDone", which === "done");
    show("pokeraceMeter", which === "race" || which === "done");
  }

  function driverName(id) {
    const mon = L.pokemon.roster.filter((item) => item.id === id)[0];
    return mon ? mon.name : id;
  }
  function kartName(id) {
    const kart = KARTS.filter((item) => item.id === id)[0];
    return kart ? kart.name : id;
  }

  function drawPlayer() {
    const player = document.getElementById("pokeracePlayer");
    player.textContent = "";
    player.dataset.driver = state.driver;
    player.dataset.kart = state.kart;
    const back = document.createElement("div");
    back.className = "pokerace-kart-back";
    drawChassis(back);
    const rider = document.createElement("div");
    rider.className = "pokerace-rider";
    L.pokemon.drawCreature(rider, state.driver, { silhouette: false });
    const front = document.createElement("div");
    front.className = "pokerace-kart-front";
    drawKart(front, state.kart);
    player.appendChild(back);
    player.appendChild(rider);
    player.appendChild(front);
  }

  function placeMarker(node, remaining, markerHeight, contactPx, worldDistance) {
    if (!markerVisible(remaining, markerHeight)) {
      node.hidden = true;
      return;
    }
    const top = approachTop(remaining, contactPx, markerHeight);
    if (top + markerHeight / 2 < ROAD_TOP) {
      node.hidden = true;
      return;
    }
    node.hidden = false;
    node.style.top = top + "px";
    if (typeof worldDistance === "number") node.style.left = lanePercent(worldDistance) + "%";
  }

  function paintRoad(stageH, contact) {
    const path = document.getElementById("pokeraceRoadPath");
    const edge = document.getElementById("pokeraceRoadEdge");
    if (!path || !stageH) return;
    const steps = 16;
    const left = [];
    const right = [];
    for (let i = 0; i <= steps; i++) {
      const yPx = ROAD_TOP + (stageH - ROAD_TOP) * (i / steps);
      const y = (yPx / stageH) * 100;
      const pastNose = yPx >= contact;
      const remaining = pastNose ? 0 : remainingForY(yPx, contact);
      const world = pastNose ? state.distance : state.distance + remaining;
      const half = roadHalf(remaining);
      const center = lanePercent(world);
      left.push([center - half, y]);
      right.push([center + half, y]);
    }
    const line = (pts) => pts.map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join(" L");
    path.setAttribute("d", "M" + line(left) + " L" + line(right.slice().reverse()) + " Z");
    if (edge) edge.setAttribute("d", "M" + line(left) + " M" + line(right));
  }

  function paintMeter() {
    const meter = document.getElementById("pokeraceMeter");
    const fill = document.getElementById("pokeraceMeterFill");
    const label = document.getElementById("pokeraceMeterLabel");
    if (!meter || !fill || !label || !state) return;
    const pct = Math.max(0, Math.min(100, (state.distance / FINISH_AT) * 100));
    fill.style.width = pct + "%";
    meter.setAttribute("aria-valuenow", String(Math.round(state.distance)));
    label.textContent = pct >= 100 ? "Finish" : (pct < 8 ? "Start" : "On the way");
  }

  function render() {
    const player = document.getElementById("pokeracePlayer");
    player.style.left = (lanePercent(state.distance) + state.x * 28) + "%";
    player.dataset.steer = state.x.toFixed(4);
    const stage = document.getElementById("pokeraceStage");
    const stageH = stage.clientHeight || 320;
    const contact = contactLine(stageH);
    paintRoad(stageH, contact);
    const pads = document.getElementById("pokeracePads");
    for (let i = 0; i < pads.children.length; i++) {
      placeMarker(pads.children[i], PADS[i] - state.distance, PAD_HEIGHT, contact, PADS[i]);
    }
    const finishRemaining = FINISH_AT - state.distance;
    placeMarker(
      document.getElementById("pokeraceFinishLine"),
      finishRemaining,
      FINISH_HEIGHT,
      contact,
      FINISH_AT,
    );
    const finish = document.getElementById("pokeraceFinishLine");
    if (!finish.hidden) {
      const half = roadHalf(Math.max(0, finishRemaining));
      const center = lanePercent(FINISH_AT);
      finish.style.left = (center - half) + "%";
      finish.style.width = (half * 2) + "%";
      finish.style.right = "auto";
    }
    placeWorld(contact);
    paintMeter();
    const boost = document.getElementById("pokeraceBoost");
    boost.dataset.charges = String(state.charges);
    boost.textContent = "Boost " + state.charges;
  }

  function placeWorld(contact) {
    const dashes = document.getElementById("pokeraceDashes");
    const trees = document.getElementById("pokeraceTrees");
    if (!dashes || !trees) return;
    const gap = 46;
    const first = Math.ceil((state.distance + 8) / gap) * gap;
    for (let i = 0; i < dashes.children.length; i++) {
      const remaining = first + i * gap - state.distance;
      const dash = dashes.children[i];
      const top = approachTop(remaining, contact, 12);
      if (!markerVisible(remaining, 12) || top < ROAD_TOP) {
        dash.hidden = true;
        continue;
      }
      dash.hidden = false;
      const travel = 1 - Math.max(0, remaining) / VIEW_AHEAD;
      const width = 8 + travel * 26;
      dash.style.top = top + "px";
      dash.style.left = lanePercent(state.distance + remaining) + "%";
      dash.style.width = width + "px";
      dash.style.marginLeft = (-width / 2) + "px";
    }
    const spacing = 150;
    const treeBase = Math.floor(state.distance / spacing) * spacing;
    for (let i = 0; i < trees.children.length; i++) {
      const remaining = treeBase + (i + 1) * (spacing / 2) - state.distance;
      const tree = trees.children[i];
      const top = approachTop(remaining, contact, 28);
      if (!markerVisible(remaining, 28) || top < ROAD_TOP) {
        tree.hidden = true;
        continue;
      }
      tree.hidden = false;
      const travel = 1 - Math.max(0, remaining) / VIEW_AHEAD;
      const scale = 0.45 + travel * 0.7;
      const side = tree.dataset.side === "right" ? 1 : -1;
      tree.style.top = top + "px";
      tree.style.transform = "scale(" + scale + ")";
      tree.style.left = (lanePercent(state.distance + remaining) + side * (roadHalf(remaining) + 7)) + "%";
    }
    const clouds = document.getElementById("pokeraceClouds");
    if (clouds) {
      for (let i = 0; i < clouds.children.length; i++) {
        const drift = ((i * 48 + state.distance * 0.4) % 130) - 18;
        clouds.children[i].style.left = drift + "%";
      }
    }
  }

  function ensurePads() {
    const pads = document.getElementById("pokeracePads");
    if (pads.children.length) return;
    PADS.forEach((pad) => {
      const padEl = document.createElement("div");
      padEl.className = "pokerace-pad";
      padEl.dataset.pad = String(pad);
      padEl.textContent = "⚡";
      pads.appendChild(padEl);
    });
  }

  function ensureWorld() {
    const dashes = document.getElementById("pokeraceDashes");
    const trees = document.getElementById("pokeraceTrees");
    if (!dashes || !trees || dashes.children.length) return;
    for (let i = 0; i < 6; i++) {
      const dash = document.createElement("div");
      dash.className = "pokerace-dash";
      dashes.appendChild(dash);
    }
    for (let i = 0; i < 6; i++) {
      const tree = document.createElement("div");
      tree.className = i < 4 ? "pokerace-tree" : "pokerace-bush";
      tree.dataset.side = i % 2 ? "right" : "left";
      trees.appendChild(tree);
    }
    const clouds = document.getElementById("pokeraceClouds");
    if (clouds && !clouds.children.length) {
      for (let i = 0; i < 3; i++) {
        const cloud = document.createElement("div");
        cloud.className = "pokerace-cloud";
        clouds.appendChild(cloud);
      }
    }
  }

  function frame(now) {
    const mine = epoch;
    if (!running) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (mine !== epoch || !running) return;
    const steer = (held.left ? -1 : 0) + (held.right ? 1 : 0);
    const boost = boostQueued;
    boostQueued = false;
    stepRace(state, dt, { steer: steer, boost: boost });
    if (mine !== epoch || !running) return;
    render();
    if (state.finished) {
      finishRace();
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function beginRace(driver, kart) {
    epoch += 1;
    state = createRace(driver, kart);
    held.left = false;
    held.right = false;
    boostQueued = false;
    last = 0;
    ensurePads();
    ensureWorld();
    showOnly("race");
    drawPlayer();
    render();
    document.getElementById("pokeracePrompt").textContent = driverName(driver) + " in the " + kartName(kart) + " kart";
    running = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function finishRace() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
    showOnly("done");
    const tenths = Math.max(1, Math.round(state.elapsed * 10));
    const prev = L.getHighScore("pokeraceBest");
    if (!prev || tenths < prev) L.setHighScore("pokeraceBest", tenths);
    const best = L.getHighScore("pokeraceBest");
    document.getElementById("pokeraceBestVal").textContent = (best / 10).toFixed(1);
    document.getElementById("pokeraceTime").textContent = "Finished in " + (tenths / 10).toFixed(1) + " seconds";
    document.getElementById("pokeracePrompt").textContent = "Finished!";
    L.happySound();
    L.say("Finished!");
  }

  function restartRace() {
    if (!state) return;
    state = resetRace(state);
    beginRace(state.driver, state.kart);
  }

  function fillDrivers() {
    const box = document.getElementById("pokeraceDrivers");
    box.textContent = "";
    L.pokemon.roster.forEach((mon, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pokerace-pick";
      btn.dataset.id = mon.id;
      btn.setAttribute("aria-label", mon.name);
      const art = document.createElement("span");
      art.className = "pokerace-mini";
      art.setAttribute("aria-hidden", "true");
      L.pokemon.drawCreature(art, mon.id, { silhouette: false });
      const label = document.createElement("span");
      label.textContent = (index + 1) + " " + mon.name;
      btn.appendChild(art);
      btn.appendChild(label);
      L.onTap(btn, () => chooseDriver(mon.id));
      box.appendChild(btn);
    });
  }

  function fillKarts() {
    const box = document.getElementById("pokeraceKarts");
    box.textContent = "";
    KARTS.forEach((kart, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pokerace-kart";
      btn.dataset.id = kart.id;
      btn.setAttribute("aria-label", kart.name + " kart");
      const art = document.createElement("span");
      art.className = "pokerace-kart-preview";
      art.setAttribute("aria-hidden", "true");
      drawKart(art, kart.id);
      const label = document.createElement("span");
      label.textContent = (index + 1) + " " + kart.name;
      btn.appendChild(art);
      btn.appendChild(label);
      L.onTap(btn, () => {
        if (!state) return;
        beginRace(state.driver, kart.id);
      });
      box.appendChild(btn);
    });
  }

  function chooseDriver(id) {
    state = createRace(id, "burger");
    showOnly("kart");
    document.getElementById("pokeracePrompt").textContent = driverName(id) + " picks a kart";
    fillKarts();
  }

  function focusedControl(e) {
    const el = e && e.target;
    if (!el || !el.closest) return false;
    return !!el.closest("button, a, input, select, textarea");
  }

  function onKeyDown(e) {
    const screen = document.getElementById("pokeraceGame");
    if (!screen || !screen.classList.contains("active")) return;
    if (phase === "race" && steerDown(e)) return;
    if (focusedControl(e)) return;
    if (phase === "driver" && e.key >= "1" && e.key <= "8") {
      const btn = document.querySelectorAll("#pokeraceDrivers .pokerace-pick")[Number(e.key) - 1];
      if (btn) { e.preventDefault(); btn.click(); }
      return;
    }
    if (phase === "kart" && e.key >= "1" && e.key <= "3") {
      const btn = document.querySelectorAll("#pokeraceKarts .pokerace-kart")[Number(e.key) - 1];
      if (btn) { e.preventDefault(); btn.click(); }
      return;
    }
    if (phase !== "race" && phase !== "done") return;
    if ((e.key === " " || e.key === "ArrowUp") && !e.repeat) { boostQueued = true; e.preventDefault(); }
    if ((e.key === "r" || e.key === "R" || e.key === "Enter") && phase === "done") {
      e.preventDefault();
      restartRace();
    }
  }
  function steerDown(e) {
    const dir = steerDir(e.key);
    if (!dir) return false;
    held[dir] = true;
    if (e.preventDefault) e.preventDefault();
    return true;
  }
  function steerDir(key) {
    if (key === "ArrowLeft" || key === "a" || key === "A") return "left";
    if (key === "ArrowRight" || key === "d" || key === "D") return "right";
    return "";
  }
  function onKeyUp(e) {
    const dir = steerDir(e.key);
    if (dir) held[dir] = false;
  }

  function releaseHeld() {
    held.left = false;
    held.right = false;
  }
  function onBlur() { releaseHeld(); }
  function onHide() { if (document.hidden) releaseHeld(); }

  function holdButton(btn, key) {
    const down = (e) => { held[key] = true; if (e.preventDefault) e.preventDefault(); };
    const up = () => { held[key] = false; };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("pointerleave", up);
    btn.addEventListener("keydown", (e) => {
      const dir = steerDir(e.key);
      const activate = e.key === " " || e.key === "Enter";
      if (dir && dir !== key) return;
      if (!activate && !dir) return;
      if (e.repeat) return;
      held[key] = true;
      if (e.preventDefault) e.preventDefault();
    });
    btn.addEventListener("keyup", (e) => {
      const dir = steerDir(e.key);
      if (e.key === " " || e.key === "Enter" || dir === key) held[key] = false;
    });
    btn.addEventListener("blur", up);
  }

  function bindStable() {
    if (bound) return;
    bound = true;
    holdButton(document.getElementById("pokeraceLeft"), "left");
    holdButton(document.getElementById("pokeraceRight"), "right");
    L.onTapOnce(document.getElementById("pokeraceBoost"), () => { boostQueued = true; });
    L.onTapOnce(document.getElementById("pokeraceRestart"), () => restartRace());
    L.onTapOnce(document.getElementById("pokeraceAgain"), () => restartRace());
    L.onTapOnce(document.getElementById("pokeraceChange"), () => start());
  }

  function start() {
    stop();
    bindStable();
    state = null;
    held.left = false;
    held.right = false;
    boostQueued = false;
    document.getElementById("pokeraceBestVal").textContent = (function () {
      const best = L.getHighScore("pokeraceBest");
      return best ? (best / 10).toFixed(1) : "–";
    }());
    document.getElementById("pokeracePrompt").textContent = "Who drives?";
    fillDrivers();
    showOnly("driver");
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onHide);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
    releaseHeld();
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onHide);
  }

  function preview(distance) {
    if (!state) return;
    epoch += 1;
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
    state.distance = Math.max(0, distance);
    state.finished = false;
    render();
  }

  L.race = {
    karts: KARTS,
    finishAt: FINISH_AT,
    pads: PADS,
    viewAhead: VIEW_AHEAD,
    padHeight: PAD_HEIGHT,
    finishHeight: FINISH_HEIGHT,
    contactLine: contactLine,
    approachTop: approachTop,
    curveAmp: CURVE_AMP,
    curveLen: CURVE_LEN,
    roadShift: roadShift,
    lanePercent: lanePercent,
    roadHalf: roadHalf,
    createRace: createRace,
    stepRace: stepRace,
    resetRace: resetRace,
    drawKart: drawKart,
    preview: preview,
  };
  L.games.pokerace = { screen: "pokeraceGame", start: start, stop: stop };
})();
