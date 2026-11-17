// ---------- Shadows! ----------
// A soft shadow on the wall. Tap the picture that casts it.
// Three big choices, one right answer.
(function () {
  const L = window.Lawson;
  const NS = "http://www.w3.org/2000/svg";
  const SHADOW = "#3a2a22";

  function el(name, attrs) {
    const node = document.createElementNS(NS, name);
    Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  }

  function canvas() {
    const svg = el("svg", { viewBox: "0 0 120 120" });
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("shadow-art");
    return svg;
  }

  // Each draw() paints the same silhouette. Colorful pictures add a
  // second fill; the wall shadow stays one dark shape.
  const THINGS = [
    {
      name: "cat",
      draw(svg, fill, color) {
        const ink = color ? "#e08a3c" : fill;
        svg.appendChild(el("polygon", { points: "36,50 24,16 54,40", fill: ink }));
        svg.appendChild(el("polygon", { points: "84,50 96,16 66,40", fill: ink }));
        svg.appendChild(el("circle", { cx: "60", cy: "72", r: "32", fill: ink }));
        if (color) {
          svg.appendChild(el("circle", { cx: "50", cy: "68", r: "4", fill: "#2c2118" }));
          svg.appendChild(el("circle", { cx: "70", cy: "68", r: "4", fill: "#2c2118" }));
        }
      },
    },
    {
      name: "duck",
      draw(svg, fill, color) {
        const ink = color ? "#f4e04a" : fill;
        svg.appendChild(el("ellipse", { cx: "50", cy: "78", rx: "34", ry: "22", fill: ink }));
        svg.appendChild(el("circle", { cx: "82", cy: "54", r: "16", fill: ink }));
        svg.appendChild(el("polygon", { points: "94,48 116,58 94,66", fill: color ? "#f59f00" : fill }));
      },
    },
    {
      name: "fish",
      draw(svg, fill, color) {
        const ink = color ? "#3b82c4" : fill;
        svg.appendChild(el("ellipse", { cx: "58", cy: "62", rx: "34", ry: "22", fill: ink }));
        svg.appendChild(el("polygon", { points: "90,62 116,40 116,84", fill: ink }));
        if (color) svg.appendChild(el("circle", { cx: "42", cy: "56", r: "4", fill: "#2c2118" }));
      },
    },
    {
      name: "tree",
      draw(svg, fill, color) {
        svg.appendChild(el("rect", { x: "50", y: "70", width: "20", height: "36", rx: "4", fill: color ? "#8a5a2b" : fill }));
        svg.appendChild(el("circle", { cx: "60", cy: "52", r: "32", fill: color ? "#2f9e44" : fill }));
      },
    },
    {
      name: "house",
      draw(svg, fill, color) {
        svg.appendChild(el("polygon", { points: "16,58 60,18 104,58", fill: color ? "#e03131" : fill }));
        svg.appendChild(el("rect", { x: "28", y: "56", width: "64", height: "48", rx: "4", fill: color ? "#f3d5b0" : fill }));
      },
    },
    {
      name: "star",
      draw(svg, fill, color) {
        svg.appendChild(el("polygon", {
          points: "60,10 74,46 112,48 82,72 92,110 60,90 28,110 38,72 8,48 46,46",
          fill: color ? "#f5c518" : fill,
        }));
      },
    },
  ];

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
    L.bumpHighScore("shadowsBest", value);
  }

  function paint(parent, thing, asShadow) {
    const svg = canvas();
    thing.draw(svg, asShadow ? SHADOW : "#c4a46a", !asShadow);
    parent.appendChild(svg);
  }

  function pickRound() {
    const pool = THINGS.filter((t) => t.name !== lastName);
    const next = pool[Math.floor(Math.random() * pool.length)];
    lastName = next.name;
    const others = L.shuffled(THINGS.filter((t) => t !== next)).slice(0, 2);
    return { target: next, choices: L.shuffled([next, ...others]) };
  }

  function newRound() {
    answered = false;
    clearTimeout(activeTimer);
    activeTimer = null;
    const round = pickRound();
    target = round.target;
    const question = "Whose shadow?";

    const prompt = document.getElementById("shadowsPrompt");
    if (prompt) prompt.textContent = question;

    const wall = document.getElementById("shadowsWall");
    wall.innerHTML = "";
    paint(wall, target, true);

    const choices = document.getElementById("shadowsChoices");
    choices.innerHTML = "";
    round.choices.forEach((thing) => {
      const btn = document.createElement("button");
      btn.className = "shadow-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", thing.name);
      paint(btn, thing, false);
      L.onTap(btn, (e) => {
        if (answered) return;
        if (e.stopPropagation) e.stopPropagation();
        if (thing === target) {
          L.happySound();
          score += 1;
          L.bumpBadge("shadowsScoreVal", score);
          if (score > 0 && score % 5 === 0 && L.boboCheer) L.boboCheer();
          maybeCelebrateRecord(score);
          document.getElementById("shadowsBestVal").textContent = L.getHighScore("shadowsBest");
          L.say(`${thing.name}! ${L.cheer()}`);
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
          L.bumpBadge("shadowsScoreVal", 0);
        }
      });
      choices.appendChild(btn);
    });

    activeTimer = setTimeout(() => L.sayPrompt(question), 450);
  }

  function start() {
    score = 0;
    bestAtStart = L.getHighScore("shadowsBest");
    celebrated = false;
    lastName = "";
    L.bumpBadge("shadowsScoreVal", 0);
    document.getElementById("shadowsBestVal").textContent = bestAtStart;
    newRound();
  }

  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    clearNext();
  }

  L.games.shadows = { screen: "shadowsGame", start, stop };
})();
