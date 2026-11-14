// ---------- Cupcakes! ----------
// A frosted cupcake. Tap the cupcake that matches.
// Three big cupcakes, one right answer.
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
    svg.classList.add("cupcakes-art");
    return svg;
  }

  function paintCupcake(parent, color) {
    const svg = canvas();
    svg.appendChild(el("path", {
      d: "M30,62 Q30,34 60,30 Q90,34 90,62 Q74,52 60,56 Q46,52 30,62 Z",
      fill: color.hex, stroke: INK, "stroke-width": "4", "stroke-linejoin": "round",
      "data-frosting": "1",
    }));
    svg.appendChild(el("ellipse", {
      cx: "48", cy: "46", rx: "7", ry: "5", fill: "#fffaf3", opacity: "0.85",
    }));
    svg.appendChild(el("path", {
      d: "M36,64 L84,64 L76,104 L44,104 Z",
      fill: "#f6e7c8", stroke: INK, "stroke-width": "4", "stroke-linejoin": "round",
    }));
    svg.appendChild(el("path", {
      d: "M48,66 L46,102 M60,66 L60,104 M72,66 L74,102",
      fill: "none", stroke: INK, "stroke-width": "3", "stroke-linecap": "round",
    }));
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
    L.bumpHighScore("cupcakesBest", value);
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
    const question = "Which cupcake?";

    const prompt = document.getElementById("cupcakesPrompt");
    if (prompt) prompt.textContent = question;

    const sample = document.getElementById("cupcakesSample");
    sample.innerHTML = "";
    paintCupcake(sample, target);

    const choices = document.getElementById("cupcakesChoices");
    choices.innerHTML = "";
    round.choices.forEach((color) => {
      const btn = document.createElement("button");
      btn.className = "cupcakes-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", `${color.said} cupcake`);
      paintCupcake(btn, color);
      L.onTap(btn, (e) => {
        if (answered) return;
        if (e.stopPropagation) e.stopPropagation();
        if (color === target) {
          L.happySound();
          score += 1;
          L.bumpBadge("cupcakesScoreVal", score);
          if (score > 0 && score % 5 === 0 && L.boboCheer) L.boboCheer();
          maybeCelebrateRecord(score);
          document.getElementById("cupcakesBestVal").textContent = L.getHighScore("cupcakesBest");
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
          L.bumpBadge("cupcakesScoreVal", 0);
        }
      });
      choices.appendChild(btn);
    });

    activeTimer = setTimeout(() => L.sayPrompt(question), 450);
  }

  function start() {
    stop();
    score = 0;
    bestAtStart = L.getHighScore("cupcakesBest");
    celebrated = false;
    lastName = "";
    L.bumpBadge("cupcakesScoreVal", 0);
    document.getElementById("cupcakesBestVal").textContent = bestAtStart;
    newRound();
  }

  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    clearNext();
  }

  L.games.cupcakes = { screen: "cupcakesGame", start, stop };
})();
