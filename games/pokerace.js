// ---------- Food Karts! ----------
// Pick a driver, pick a burger, fries, or hot-dog kart, and steer to
// the finish. Boosts speed you up. Restart keeps the same driver and kart.
(function () {
  const L = window.Lawson;
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#241c16";
  const FINISH_AT = 480;
  const PADS = [140, 300];

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
    add(svg, "ellipse", ink({ cx: "70", cy: "28", rx: "40", ry: "16", fill: "#f6d27a", "data-part": "bun" }));
    add(svg, "path", ink({ d: "M32,40 Q70,52 108,40", fill: "none", stroke: "#2f9e44", "stroke-width": "6", "data-part": "lettuce" }));
    add(svg, "rect", ink({ x: "30", y: "44", width: "80", height: "16", rx: "6", fill: "#8a4b24", "data-part": "patty" }));
    add(svg, "ellipse", ink({ cx: "70", cy: "70", rx: "40", ry: "14", fill: "#e7b84b", "data-part": "bun" }));
  }

  function drawFries(svg) {
    add(svg, "rect", ink({ x: "46", y: "18", width: "10", height: "36", rx: "3", fill: "#f5c518", "data-part": "fry" }));
    add(svg, "rect", ink({ x: "64", y: "10", width: "12", height: "44", rx: "3", fill: "#ffd43b", "data-part": "fry" }));
    add(svg, "rect", ink({ x: "84", y: "20", width: "10", height: "34", rx: "3", fill: "#f5c518", "data-part": "fry" }));
    add(svg, "path", ink({ d: "M36,40 L48,88 L92,88 L104,40 Z", fill: "#e03131", "data-part": "box" }));
  }

  function drawHotdog(svg) {
    add(svg, "ellipse", ink({ cx: "70", cy: "48", rx: "58", ry: "26", fill: "#f6d27a", "data-part": "bun" }));
    add(svg, "rect", ink({ x: "22", y: "38", width: "96", height: "20", rx: "10", fill: "#e03131", "data-part": "sausage" }));
    add(svg, "path", { d: "M30,48 Q50,40 70,48 T110,48", fill: "none", stroke: "#f5c518", "stroke-width": "4", "data-part": "mustard" });
  }

  const DRAW = { burger: drawBurger, fries: drawFries, hotdog: drawHotdog };

  function drawKart(parent, id) {
    const svg = el("svg", { viewBox: "0 0 140 100" });
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "pokerace-kart-art");
    svg.setAttribute("data-kart", id);
    DRAW[id](svg);
    add(svg, "circle", ink({ cx: "40", cy: "86", r: "10", fill: "#241c16", "data-part": "wheel" }));
    add(svg, "circle", ink({ cx: "100", cy: "86", r: "10", fill: "#241c16", "data-part": "wheel" }));
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

  let state = null;
  let phase = "driver";
  let running = false;
  let raf = 0;
  let last = 0;
  let boostQueued = false;
  let bound = false;
  const held = { left: false, right: false };

  function show(id, on) {
    document.getElementById(id).hidden = !on;
  }

  function showOnly(which) {
    phase = which;
    show("pokeraceDrivers", which === "driver");
    show("pokeraceKarts", which === "kart");
    show("pokeraceStage", which === "race" || which === "done");
    show("pokeraceControls", which === "race");
    show("pokeraceDone", which === "done");
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
    const rider = document.createElement("div");
    rider.className = "pokerace-rider";
    L.pokemon.drawCreature(rider, state.driver, { silhouette: false });
    player.appendChild(rider);
    drawKart(player, state.kart);
  }

  function render() {
    const player = document.getElementById("pokeracePlayer");
    player.style.left = (50 + state.x * 28) + "%";
    const road = document.getElementById("pokeraceRoad");
    road.style.backgroundPositionY = (state.distance * 2) + "px";
    const view = 240;
    const pads = document.getElementById("pokeracePads");
    for (let i = 0; i < pads.children.length; i++) {
      const rel = (PADS[i] - state.distance) / view;
      pads.children[i].hidden = rel < -0.08 || rel > 1.05;
      pads.children[i].style.top = (rel * 78 + 6) + "%";
    }
    const finish = document.getElementById("pokeraceFinishLine");
    const relF = (FINISH_AT - state.distance) / view;
    finish.hidden = relF < -0.08 || relF > 1.05;
    finish.style.top = (relF * 78) + "%";
    const boost = document.getElementById("pokeraceBoost");
    boost.dataset.charges = String(state.charges);
    boost.textContent = "Boost " + state.charges;
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

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    const steer = (held.left ? -1 : 0) + (held.right ? 1 : 0);
    const boost = boostQueued;
    boostQueued = false;
    stepRace(state, dt, { steer: steer, boost: boost });
    render();
    if (state.finished) {
      finishRace();
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function beginRace(driver, kart) {
    state = createRace(driver, kart);
    held.left = false;
    held.right = false;
    boostQueued = false;
    last = 0;
    ensurePads();
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

  function onKeyDown(e) {
    const screen = document.getElementById("pokeraceGame");
    if (!screen || !screen.classList.contains("active")) return;
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
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { held.left = true; e.preventDefault(); }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { held.right = true; e.preventDefault(); }
    if ((e.key === " " || e.key === "ArrowUp") && !e.repeat) { boostQueued = true; e.preventDefault(); }
    if ((e.key === "r" || e.key === "R" || e.key === "Enter") && phase === "done") {
      e.preventDefault();
      restartRace();
    }
  }
  function onKeyUp(e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") held.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") held.right = false;
  }

  function holdButton(btn, key) {
    const down = (e) => { held[key] = true; if (e.preventDefault) e.preventDefault(); };
    const up = () => { held[key] = false; };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("pointerleave", up);
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
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
    held.left = false;
    held.right = false;
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
  }

  L.race = {
    karts: KARTS,
    finishAt: FINISH_AT,
    createRace: createRace,
    stepRace: stepRace,
    resetRace: resetRace,
    drawKart: drawKart,
  };
  L.games.pokerace = { screen: "pokeraceGame", start: start, stop: stop };
})();
