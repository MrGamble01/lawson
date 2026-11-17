// ---------- Kites! ----------
// A colored kite. Tap the kite that matches.
// Three big kites, one right answer.
(function () {
  const L = window.Lawson;
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#3a2a22";

  const COLORS = [
    { name: "red",    said: "Red",    hex: "#e03131" },
    { name: "blue",   said: "Blue",   hex: "#1c7ed6" },
    { name: "yellow", said: "Yellow", hex: "#f5c518" },
    { name: "green",  said: "Green",  hex: "#2f9e44" },
    { name: "purple", said: "Purple", hex: "#9c36b5" },
    { name: "orange", said: "Orange", hex: "#f76707" },
  ];

  function el(name, attrs) {
    const node = document.createElementNS(NS, name);
    Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  }

  function canvas() {
    const svg = el("svg", { viewBox: "0 0 120 120" });
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("kites-art");
    return svg;
  }

  function paintKite(parent, color) {
    const svg = canvas();
    svg.appendChild(el("polygon", {
      points: "60,14 98,52 60,96 22,52",
      fill: color.hex, stroke: INK, "stroke-width": "4", "stroke-linejoin": "round",
    }));
    svg.appendChild(el("line", {
      x1: "60", y1: "16", x2: "60", y2: "94",
      stroke: "#fffaf3", "stroke-width": "3",
    }));
    svg.appendChild(el("line", {
      x1: "26", y1: "52", x2: "94", y2: "52",
      stroke: "#fffaf3", "stroke-width": "3",
    }));
    svg.appendChild(el("polyline", {
      points: "60,96 48,106 70,112 50,118",
      fill: "none", stroke: INK, "stroke-width": "3", "stroke-linecap": "round",
    }));
    svg.appendChild(el("circle", { cx: "48", cy: "106", r: "4", fill: "#fffaf3", stroke: INK, "stroke-width": "2" }));
    svg.appendChild(el("circle", { cx: "70", cy: "112", r: "4", fill: "#fffaf3", stroke: INK, "stroke-width": "2" }));
    parent.appendChild(svg);
  }

  let score = 0;
  let answered = false;
  let activeTimer = null;
  let cancelNext = null;
  let target = null;
  let lastName = "";
  let bestAtStart = 0;
  let celebrated = false;

  function clearNext() { if (cancelNext) cancelNext(); cancelNext = null; }

  function maybeCelebrateRecord(value) {
    if (value > bestAtStart && !celebrated) {
      celebrated = true;
      (L.whileHere || setTimeout)(() => L.celebrateNewHigh(value), 800);
    }
    L.bumpHighScore("kitesBest", value);
  }

  function pickRound() {
    const pool = COLORS.filter((c) => c.name !== lastName);
    const next = pool[Math.floor(Math.random() * pool.length)];
    lastName = next.name;
    const others = L.shuffled(COLORS.filter((c) => c !== next)).slice(0, 2);
    return { target: next, choices: L.shuffled([next, ...others]) };
  }

  function newRound() {
    answered = false;
    clearTimeout(activeTimer);
    activeTimer = null;
    const round = pickRound();
    target = round.target;
    const question = "Which kite?";

    const prompt = document.getElementById("kitesPrompt");
    if (prompt) prompt.textContent = question;

    const sample = document.getElementById("kitesSample");
    sample.innerHTML = "";
    paintKite(sample, target);

    const choices = document.getElementById("kitesChoices");
    choices.innerHTML = "";
    round.choices.forEach((color) => {
      const btn = document.createElement("button");
      btn.className = "kites-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", `${color.said} kite`);
      paintKite(btn, color);
      L.onTap(btn, (e) => {
        if (answered) return;
        if (e.stopPropagation) e.stopPropagation();
        if (color === target) {
          L.happySound();
          score += 1;
          L.bumpBadge("kitesScoreVal", score);
          if (score > 0 && score % 5 === 0 && L.boboCheer) L.boboCheer();
          maybeCelebrateRecord(score);
          document.getElementById("kitesBestVal").textContent = L.getHighScore("kitesBest");
          L.say(`${color.said}! ${L.cheer()}`);
          btn.classList.add("correct");
          const p = L.pointOf(e);
          L.sparkleAt(p.x, p.y);
          clearTimeout(activeTimer);
          activeTimer = null;
          clearNext();
          answered = true;
          cancelNext = L.afterSpeech(newRound, { minMs: 1600 });
        } else {
          L.buzzSound();
          btn.classList.add("wrong");
          setTimeout(() => btn.classList.remove("wrong"), 450);
          clearTimeout(activeTimer);
          activeTimer = null;
          clearNext();
          L.say("Try again!");
          cancelNext = L.afterSpeech(
            () => L.sayPrompt(question),
            { minMs: 450, beatMs: 150, maxMs: 3000 },
          );
          score = 0;
          L.bumpBadge("kitesScoreVal", 0);
        }
      });
      choices.appendChild(btn);
    });

    activeTimer = setTimeout(() => L.sayPrompt(question), 450);
  }

  function start() {
    score = 0;
    bestAtStart = L.getHighScore("kitesBest");
    celebrated = false;
    lastName = "";
    L.bumpBadge("kitesScoreVal", 0);
    document.getElementById("kitesBestVal").textContent = bestAtStart;
    newRound();
  }

  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    clearNext();
  }

  L.games.kites = { screen: "kitesGame", start, stop };
})();
