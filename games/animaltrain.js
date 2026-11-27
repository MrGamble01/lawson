// ---------- Animal Train ----------
// A painted meadow railroad for a toddler. Free Ride is the start:
// every animal hops into an open car, and the whistle always toots.
// Color Ride glows one car and a few dots, still with no wrong answer.
// Each toot is one ride in Play Stats via L.noteRound. Modes are
// "Free Ride" and "Color Ride" through L.noteMode.
(function () {
  const L = window.Lawson;

  const ANIMALS = [
    { id: "bear", label: "Bear", line: "Bear! Roar!" },
    { id: "puppy", label: "Puppy", line: "Puppy! Woof!" },
    { id: "bunny", label: "Bunny", line: "Bunny! Hop!" },
    { id: "kitty", label: "Kitty", line: "Kitty! Meow!" },
    { id: "duck", label: "Duck", line: "Duck! Quack!" },
    { id: "frog", label: "Frog", line: "Frog! Ribbit!" },
  ];
  const CARS = [
    { id: "red", label: "red", say: "Red car!" },
    { id: "blue", label: "blue", say: "Blue car!" },
    { id: "yellow", label: "yellow", say: "Yellow car!" },
    { id: "green", label: "green", say: "Green car!" },
  ];
  const COUNT_WORDS = ["one", "two", "three", "four"];

  let gen = 0;
  let pending = [];
  let phase = "load";
  let mode = "free";
  let seats = [null, null, null, null];
  let goal = { car: 0, count: 1 };
  let goalN = 0;
  let hopId = "";
  let arriving = false;
  let modesBound = false;

  function motionOff() {
    return typeof L.prefersReducedMotion === "function" && L.prefersReducedMotion();
  }
  function cleanup() {
    gen += 1;
    while (pending.length) {
      const cancel = pending.pop();
      try { cancel(); } catch (_) {}
    }
  }
  function arm(fn, opts) {
    const here = gen;
    const cancel = L.afterSpeech(() => {
      if (gen === here) fn();
    }, opts);
    pending.push(cancel);
  }
  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }
  function svg(name, attrs) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) Object.keys(attrs).forEach((key) => node.setAttribute(key, attrs[key]));
    return node;
  }
  function nextGoal() {
    goal = { car: goalN % 4, count: (goalN % 4) + 1 };
    goalN += 1;
  }
  function modeName() {
    return mode === "color" ? "Color Ride" : "Free Ride";
  }
  function announce(text) {
    const live = document.getElementById("animalTrainLive");
    if (live) live.textContent = text;
  }
  function paintModes() {
    document.querySelectorAll("#animalTrainGame .at-mode").forEach((button) => {
      const on = button.dataset.ride === mode;
      button.classList.toggle("active", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function bindModes() {
    if (modesBound) return;
    modesBound = true;
    document.querySelectorAll("#animalTrainGame .at-mode").forEach((button) => {
      L.onTap(button, () => chooseMode(button.dataset.ride));
    });
  }
  function face(id) {
    const root = svg("svg", { viewBox: "0 0 80 80" });
    root.setAttribute("aria-hidden", "true");
    const add = (name, attrs) => root.append(svg(name, attrs));
    if (id === "bunny") {
      add("ellipse", { cx: "28", cy: "26", rx: "8", ry: "18", fill: "#fffaf3", stroke: "#5c3a28", "stroke-width": "2" });
      add("ellipse", { cx: "52", cy: "26", rx: "8", ry: "18", fill: "#fffaf3", stroke: "#5c3a28", "stroke-width": "2" });
      add("ellipse", { cx: "28", cy: "28", rx: "4", ry: "10", fill: "#ffb3c7" });
      add("ellipse", { cx: "52", cy: "28", rx: "4", ry: "10", fill: "#ffb3c7" });
    }
    if (id === "bear") {
      add("circle", { cx: "18", cy: "24", r: "12", fill: "#a86432", stroke: "#5c3a28", "stroke-width": "2" });
      add("circle", { cx: "62", cy: "24", r: "12", fill: "#a86432", stroke: "#5c3a28", "stroke-width": "2" });
    }
    if (id === "puppy") {
      add("ellipse", { cx: "14", cy: "36", rx: "10", ry: "16", fill: "#e6b15a", stroke: "#5c3a28", "stroke-width": "2" });
      add("ellipse", { cx: "66", cy: "36", rx: "10", ry: "16", fill: "#e6b15a", stroke: "#5c3a28", "stroke-width": "2" });
    }
    if (id === "kitty") {
      add("polygon", { points: "16,36 28,8 40,34", fill: "#f4a261", stroke: "#5c3a28", "stroke-width": "2", "stroke-linejoin": "round" });
      add("polygon", { points: "40,34 52,8 64,36", fill: "#f4a261", stroke: "#5c3a28", "stroke-width": "2", "stroke-linejoin": "round" });
    }
    const heads = { bear: "#c47a3a", puppy: "#f0c27a", bunny: "#fffaf3", kitty: "#f4a261", duck: "#ffe066", frog: "#8ce99a" };
    add("circle", { cx: "40", cy: "46", r: "24", fill: heads[id] || "#fff", stroke: "#5c3a28", "stroke-width": "2.5" });
    if (id === "frog") {
      add("circle", { cx: "30", cy: "38", r: "10", fill: "#fff", stroke: "#5c3a28", "stroke-width": "2" });
      add("circle", { cx: "50", cy: "38", r: "10", fill: "#fff", stroke: "#5c3a28", "stroke-width": "2" });
      add("circle", { cx: "31", cy: "39", r: "5", fill: "#3a2418" });
      add("circle", { cx: "51", cy: "39", r: "5", fill: "#3a2418" });
    } else {
      add("circle", { cx: "32", cy: "44", r: "3.2", fill: "#3a2418" });
      add("circle", { cx: "48", cy: "44", r: "3.2", fill: "#3a2418" });
      add("circle", { cx: "33", cy: "43", r: "1.1", fill: "#fff" });
      add("circle", { cx: "49", cy: "43", r: "1.1", fill: "#fff" });
    }
    if (id === "duck") {
      add("ellipse", { cx: "40", cy: "54", rx: "10", ry: "6", fill: "#f76707", stroke: "#5c3a28", "stroke-width": "1.5" });
    } else if (id === "puppy" || id === "bear" || id === "kitty") {
      add("ellipse", { cx: "40", cy: "52", rx: "8", ry: "6", fill: id === "kitty" ? "#fff1e0" : "#fff6ea" });
      add("ellipse", { cx: "40", cy: "53", rx: "3.2", ry: "2.4", fill: "#3a2418" });
    }
    add("path", { d: "M30 58 Q40 66 50 58", fill: "none", stroke: "#3a2418", "stroke-width": "2.4", "stroke-linecap": "round" });
    if (id === "kitty") {
      add("path", { d: "M16 50 H30 M50 50 H64", stroke: "#5c3a28", "stroke-width": "1.6", "stroke-linecap": "round" });
    }
    add("circle", { cx: "24", cy: "52", r: "3.2", fill: "#ff8fab", opacity: "0.9" });
    add("circle", { cx: "56", cy: "52", r: "3.2", fill: "#ff8fab", opacity: "0.9" });
    return root;
  }
  function engineArt() {
    const root = svg("svg", { viewBox: "0 0 180 140" });
    root.setAttribute("aria-hidden", "true");
    const add = (name, attrs) => root.append(svg(name, attrs));
    [[40, 112], [78, 112], [148, 118]].forEach((spot) => {
      add("circle", { cx: spot[0], cy: spot[1], r: "16", fill: "#343a40", stroke: "#ffd43b", "stroke-width": "4" });
      add("circle", { cx: spot[0], cy: spot[1], r: "5", fill: "#fff3bf" });
    });
    add("rect", { x: "18", y: "78", width: "150", height: "16", rx: "6", fill: "#495057" });
    add("rect", { x: "16", y: "48", width: "92", height: "42", rx: "20", fill: "#e03131", stroke: "#5c3a28", "stroke-width": "3" });
    add("rect", { x: "16", y: "62", width: "92", height: "10", fill: "#ffd43b" });
    add("rect", { x: "100", y: "28", width: "62", height: "68", rx: "10", fill: "#ffd43b", stroke: "#5c3a28", "stroke-width": "3" });
    add("rect", { x: "112", y: "40", width: "36", height: "26", rx: "6", fill: "#a5d8ff", stroke: "#5c3a28", "stroke-width": "2" });
    add("rect", { x: "94", y: "18", width: "74", height: "14", rx: "6", fill: "#f08c00", stroke: "#5c3a28", "stroke-width": "3" });
    add("rect", { x: "36", y: "18", width: "18", height: "32", rx: "4", fill: "#495057", stroke: "#5c3a28", "stroke-width": "2" });
    add("rect", { x: "30", y: "12", width: "30", height: "10", rx: "4", fill: "#343a40" });
    add("circle", { cx: "42", cy: "58", r: "3", fill: "#3a2418" });
    add("circle", { cx: "60", cy: "58", r: "3", fill: "#3a2418" });
    add("path", { d: "M40 68 Q52 76 64 68", fill: "none", stroke: "#3a2418", "stroke-width": "2.5", "stroke-linecap": "round" });
    add("circle", { cx: "22", cy: "70", r: "8", fill: "#fff3bf", stroke: "#f08c00", "stroke-width": "3" });
    return root;
  }
  function whistleArt() {
    const root = svg("svg", { viewBox: "0 0 64 64" });
    root.setAttribute("aria-hidden", "true");
    root.append(svg("ellipse", { cx: "28", cy: "36", rx: "16", ry: "12", fill: "#ffd43b", stroke: "#5c3a28", "stroke-width": "3" }));
    root.append(svg("rect", { x: "40", y: "30", width: "16", height: "8", rx: "3", fill: "#f08c00", stroke: "#5c3a28", "stroke-width": "3" }));
    root.append(svg("circle", { cx: "22", cy: "34", r: "3", fill: "#3a2418" }));
    root.append(svg("path", { d: "M18 16c6 4 10 4 16 0", fill: "none", stroke: "#fff", "stroke-width": "3", "stroke-linecap": "round" }));
    root.append(svg("path", { d: "M14 8c8 4 14 4 22 0", fill: "none", stroke: "#fff", "stroke-width": "3", "stroke-linecap": "round" }));
    return root;
  }
  function openSeat() {
    if (mode === "color" && seats[goal.car] == null) return goal.car;
    return seats.findIndex((seat) => !seat);
  }
  function animalById(id) {
    return ANIMALS.find((animal) => animal.id === id);
  }
  function buildTrain() {
    const train = el("div", "at-train");
    train.setAttribute("aria-hidden", "true");
    if (phase === "ride" && !motionOff()) train.classList.add("is-rolling");
    if (phase === "ride" && motionOff()) train.classList.add("is-gone");
    if (arriving && phase === "load") train.classList.add("is-arrive");
    const puffs = el("div", "at-puffs");
    puffs.append(el("i"), el("i"), el("i"));
    const engine = el("div", "at-engine");
    engine.append(engineArt());
    train.append(puffs, engine);
    CARS.forEach((car, index) => {
      const animalId = seats[index];
      const node = el("div", "at-car at-car--" + car.id);
      node.dataset.color = car.id;
      node.dataset.filled = animalId ? "yes" : "no";
      if (animalId) node.dataset.animal = animalId;
      if (mode === "color" && index === goal.car && !animalId) node.classList.add("is-goal");
      const seat = el("div", "at-seat");
      if (animalId) {
        const rider = el("div", "at-passenger" + (hopId === animalId ? " is-hop" : ""));
        rider.append(face(animalId));
        seat.append(rider);
      } else {
        const heart = el("span", "at-heart");
        heart.textContent = "♡";
        seat.append(heart);
      }
      const wheels = el("div", "at-wheels");
      wheels.append(el("i"), el("i"));
      node.append(seat, wheels);
      train.append(node);
    });
    return train;
  }
  function goalChip() {
    const chip = el("div", "at-goal");
    chip.id = "animalTrainGoal";
    chip.setAttribute("role", "img");
    if (mode !== "color") {
      chip.setAttribute("aria-label", "Free ride, any friend");
      const heart = el("span", "at-goal-heart");
      heart.textContent = "♥";
      heart.setAttribute("aria-hidden", "true");
      chip.append(heart);
      return chip;
    }
    const car = CARS[goal.car];
    const word = COUNT_WORDS[goal.count - 1];
    const friends = goal.count === 1 ? "friend" : "friends";
    chip.dataset.car = car.id;
    chip.dataset.count = String(goal.count);
    chip.setAttribute("aria-label", car.say.replace("!", "") + ", " + word + " " + friends);
    const swatch = el("span", "at-swatch at-swatch--" + car.id);
    swatch.setAttribute("aria-hidden", "true");
    const dots = el("span", "at-dots");
    dots.setAttribute("aria-hidden", "true");
    for (let i = 0; i < goal.count; i++) dots.append(el("i"));
    chip.append(swatch, dots);
    return chip;
  }
  function buildDock() {
    const dock = el("div", "at-dock-inner");
    dock.append(goalChip());
    const row = el("div", "at-animals");
    ANIMALS.forEach((animal) => {
      const button = el("button", "at-animal" + (seats.includes(animal.id) ? " is-aboard" : ""));
      button.type = "button";
      button.dataset.animal = animal.id;
      button.setAttribute("aria-label", animal.label);
      button.append(face(animal.id));
      if (phase === "ride") button.disabled = true;
      L.onTap(button, () => board(animal.id));
      row.append(button);
    });
    const go = el("div", "at-go");
    const whistle = el("button", "at-whistle");
    whistle.type = "button";
    whistle.setAttribute("aria-label", "Whistle, choo-choo");
    const icon = el("span", "at-whistle-icon");
    icon.setAttribute("aria-hidden", "true");
    icon.append(whistleArt());
    const word = el("span", "at-whistle-word");
    word.textContent = "Choo-choo!";
    whistle.append(icon, word);
    const filled = seats.filter(Boolean).length;
    const ready = mode === "color" && (seats[goal.car] || filled >= goal.count);
    if (ready && phase === "load") whistle.classList.add("is-ready");
    if (phase === "ride") whistle.classList.add("is-tooting");
    whistle.hidden = phase === "again";
    L.onTap(whistle, () => {
      if (phase === "load") depart();
    });
    const again = el("button", "at-again");
    again.type = "button";
    again.setAttribute("aria-label", "Play again");
    const againWord = el("span", "at-whistle-word");
    againWord.textContent = "Play again";
    again.append(againWord);
    again.hidden = phase !== "again";
    L.onTap(again, playAgain);
    go.append(whistle, again);
    dock.append(row, go);
    return dock;
  }
  function render() {
    const stage = document.getElementById("animalTrainStage");
    const scene = document.getElementById("animalTrainScene");
    const dock = document.getElementById("animalTrainDock");
    if (!stage || !scene || !dock) return;
    stage.dataset.phase = phase;
    stage.dataset.mode = mode;
    stage.dataset.filled = String(seats.filter(Boolean).length);
    paintModes();
    scene.replaceChildren(buildTrain());
    dock.replaceChildren(buildDock());
  }
  function board(id) {
    if (phase === "ride") return;
    if (phase === "again") {
      const again = document.querySelector("#animalTrainDock .at-again");
      if (again) {
        again.classList.remove("is-wiggle");
        void again.offsetWidth;
        again.classList.add("is-wiggle");
      }
      return;
    }
    const animal = animalById(id);
    if (!animal) return;
    if (seats.includes(id)) {
      L.beep(392, 0.08, "triangle", 0);
      L.say(animal.line);
      announce(animal.label + " is already on the train.");
      return;
    }
    const seat = openSeat();
    if (seat < 0) {
      depart();
      return;
    }
    seats[seat] = id;
    hopId = id;
    L.beep(587.33, 0.07, "sine", 0);
    L.beep(880, 0.1, "triangle", 0.05);
    L.say(animal.line);
    announce(animal.label + " is in the " + CARS[seat].label + " car.");
    render();
    hopId = "";
    if (seats.every(Boolean)) arm(() => depart(), { minMs: 900 });
  }
  function depart() {
    if (phase !== "load") return;
    phase = "ride";
    L.beep(698.46, 0.12, "square", 0);
    L.beep(880, 0.2, "square", 0.1);
    L.happySound();
    if (L.confettiRain) L.confettiRain(22);
    L.say("Choo-choo!");
    try { L.noteRound(); } catch (_) {}
    announce("Choo-choo!");
    render();
    arm(() => finishRide(), { minMs: 1500 });
  }
  function finishRide() {
    if (phase !== "ride") return;
    phase = "again";
    announce("Play again.");
    render();
  }
  function playAgain() {
    if (phase === "ride") return;
    phase = "load";
    seats = [null, null, null, null];
    if (mode === "color") nextGoal();
    arriving = true;
    L.happySound();
    L.say("All aboard!");
    announce("All aboard.");
    render();
    arriving = false;
  }
  function chooseMode(next) {
    if (phase === "ride") return;
    if (next !== "free" && next !== "color") return;
    if (next === mode) return;
    mode = next;
    const line = mode === "color" ? CARS[goal.car].say : "Free ride!";
    L.noteMode(modeName());
    L.happySound();
    L.say(line);
    announce(line);
    render();
  }
  function start() {
    cleanup();
    phase = "load";
    mode = "free";
    seats = [null, null, null, null];
    goalN = 0;
    nextGoal();
    hopId = "";
    arriving = false;
    bindModes();
    L.noteMode("Free Ride");
    L.happySound();
    L.say("All aboard!");
    announce("All aboard.");
    render();
  }
  function stop() {
    cleanup();
  }

  L.games.animaltrain = { screen: "animalTrainGame", start, stop };
})();
