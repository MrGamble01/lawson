// ---------- Connect the Dots ----------
// Tap dots 1 → N in order. Each correct tap extends a polyline; a wrong
// tap nudges him toward the right number with voice. When all dots are
// connected, the hidden picture reveals (giant emoji fades in) and we
// move to the next puzzle. Score = puzzles solved this session.
(function () {
  const L = window.Lawson;
  const SVG_NS = "http://www.w3.org/2000/svg";

  // Coordinates in a 400×400 viewBox. Dots are listed in tap order so the
  // resulting polyline traces a recognizable outline of the reveal emoji.
  const PUZZLES = [
    {
      name: "house",
      reveal: "🏠",
      dots: [
        { x: 100, y: 360 }, { x: 100, y: 220 }, { x: 200, y: 120 },
        { x: 300, y: 220 }, { x: 300, y: 360 },
      ],
    },
    {
      name: "fish",
      reveal: "🐟",
      dots: [
        { x:  80, y: 200 }, { x: 140, y: 140 }, { x: 250, y: 130 },
        { x: 320, y: 170 }, { x: 380, y: 110 }, { x: 380, y: 290 },
        { x: 320, y: 230 }, { x: 250, y: 270 }, { x: 140, y: 260 },
      ],
    },
    {
      name: "star",
      reveal: "⭐",
      dots: [
        { x: 200, y:  60 }, { x: 245, y: 185 }, { x: 380, y: 185 },
        { x: 275, y: 260 }, { x: 320, y: 380 }, { x: 200, y: 305 },
        { x:  80, y: 380 }, { x: 125, y: 260 }, { x:  20, y: 185 },
        { x: 155, y: 185 },
      ],
    },
    {
      name: "heart",
      reveal: "❤️",
      dots: [
        { x: 200, y: 380 }, { x: 320, y: 270 }, { x: 370, y: 180 },
        { x: 320, y: 100 }, { x: 240, y: 100 }, { x: 200, y: 180 },
        { x: 160, y: 100 }, { x:  80, y: 100 }, { x:  30, y: 180 },
        { x:  80, y: 270 },
      ],
    },
    {
      name: "moon",
      reveal: "🌙",
      dots: [
        { x: 220, y:  60 }, { x: 300, y: 100 }, { x: 340, y: 180 },
        { x: 320, y: 260 }, { x: 260, y: 320 }, { x: 180, y: 340 },
        { x: 220, y: 250 }, { x: 230, y: 150 },
      ],
    },
    {
      name: "snake",
      reveal: "🐍",
      dots: [
        { x:  60, y: 320 }, { x: 130, y: 270 }, { x: 200, y: 320 },
        { x: 270, y: 270 }, { x: 340, y: 320 }, { x: 340, y: 200 },
        { x: 270, y: 150 }, { x: 200, y: 200 }, { x: 130, y: 150 },
        { x:  60, y: 200 }, { x:  60, y:  80 }, { x: 150, y:  60 },
      ],
    },
    {
      name: "balloon",
      reveal: "🎈",
      dots: [
        { x: 200, y:  80 }, { x: 280, y: 120 }, { x: 310, y: 200 },
        { x: 280, y: 280 }, { x: 220, y: 320 }, { x: 210, y: 360 },
        { x: 190, y: 360 }, { x: 180, y: 320 }, { x: 120, y: 280 },
        { x:  90, y: 200 }, { x: 120, y: 120 },
      ],
    },
    {
      name: "kite",
      reveal: "🪁",
      dots: [
        { x: 200, y:  60 }, { x: 320, y: 180 }, { x: 200, y: 300 },
        { x:  80, y: 180 }, { x: 215, y: 320 }, { x: 245, y: 350 },
        { x: 230, y: 385 },
      ],
    },
  ];

  let stage = null;
  let puzzleIndex = -1;
  let nextDot = 1;
  let solved = 0;
  let advanceTimer = null;
  let bestAtStart = 0;
  let celebrated = false;

  function maybeCelebrateRecord(value) {
    if (value > bestAtStart && !celebrated) {
      celebrated = true;
      setTimeout(() => L.celebrateNewHigh(value), 1200);
    }
    L.bumpHighScore("dotsBest", value);
  }

  function svgEl(name, attrs) {
    const el = document.createElementNS(SVG_NS, name);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function setupPuzzle() {
    const p = PUZZLES[(puzzleIndex = (puzzleIndex + 1) % PUZZLES.length)];
    nextDot = 1;
    stage.innerHTML = "";

    const svg = svgEl("svg", { viewBox: "0 0 400 400", xmlns: SVG_NS });
    svg.classList.add("dots-svg");

    const poly = svgEl("polyline", {
      fill: "none",
      stroke: "#ff4081",
      "stroke-width": "6",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      points: "",
    });
    svg.appendChild(poly);

    // Each dot is a keyboard target (onTap upgrades SVG groups to buttons);
    // its name says whether it is done, next, or still waiting.
    const dotEls = [];
    const labelDots = () => dotEls.forEach((el, idx) => {
      const n = idx + 1;
      el.setAttribute("aria-label", n < nextDot ? `Dot ${n}, connected` : n === nextDot ? `Dot ${n}, next` : `Dot ${n}`);
    });
    p.dots.forEach((d, i) => {
      const num = i + 1;
      const g = svgEl("g", { transform: `translate(${d.x},${d.y})`, class: "dot" });
      dotEls.push(g);
      const circle = svgEl("circle", { r: "22", fill: "#fff", stroke: "#ff4081", "stroke-width": "4" });
      const label  = svgEl("text", {
        "text-anchor": "middle", "dominant-baseline": "central",
        "font-weight": "bold", "font-size": "22", fill: "#ff4081",
      });
      label.textContent = num;
      g.appendChild(circle);
      g.appendChild(label);
      svg.appendChild(g);

      L.onTap(g, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        if (g.classList.contains("done")) return;

        if (num !== nextDot) {
          L.buzzSound();
          L.say(`Find ${nextDot}!`);
          // Pulse the correct dot so he sees where to look. nth-of-type
          // counts among <g> only, so dot N is exactly the Nth <g>.
          const target = svg.querySelector(`g.dot:nth-of-type(${nextDot})`);
          if (target) {
            target.classList.add("hint");
            setTimeout(() => target.classList.remove("hint"), 700);
          }
          return;
        }

        const cur = poly.getAttribute("points");
        poly.setAttribute("points", `${cur}${cur ? " " : ""}${d.x},${d.y}`);
        g.classList.add("done");
        circle.setAttribute("fill", "#b2f2bb");
        circle.setAttribute("stroke", "#2f9e44");
        label.setAttribute("fill", "#2f9e44");
        L.beep(380 + num * 25, 0.1, "triangle");
        L.say(String(num));
        nextDot += 1;
        labelDots();

        if (nextDot > p.dots.length) {
          advanceTimer = setTimeout(() => winPuzzle(p, svg), 450);
        }
      });
    });
    labelDots();

    stage.appendChild(svg);
    L.say(`Connect the dots! Start with 1.`);
  }

  function winPuzzle(p, svg) {
    L.happySound();
    solved += 1;
    if (solved >= 3) L.earnSticker && L.earnSticker("dots3");
    L.bumpBadge("dotsScoreVal", solved);
    maybeCelebrateRecord(solved);
    document.getElementById("dotsBestVal").textContent = L.getHighScore("dotsBest");

    setTimeout(() => L.say(`It's a ${p.name}! ${L.cheer()}`), 300);

    // Fade a giant reveal emoji over the connected outline.
    const reveal = svgEl("text", {
      x: "200", y: "210",
      "text-anchor": "middle", "dominant-baseline": "central",
      "font-size": "220",
      class: "dots-reveal",
    });
    reveal.textContent = p.reveal;
    svg.appendChild(reveal);
    requestAnimationFrame(() => reveal.classList.add("show"));

    const rect = svg.getBoundingClientRect();
    for (let k = 0; k < 10; k++) {
      setTimeout(() => L.sparkleAt(
        rect.left + rect.width / 2 + (Math.random() - 0.5) * 220,
        rect.top  + rect.height / 2 + (Math.random() - 0.5) * 220,
      ), k * 55);
    }

    advanceTimer = setTimeout(setupPuzzle, 2800);
  }

  function start() {
    stage = document.getElementById("dotsStage");
    if (!stage) return;
    solved = 0;
    bestAtStart = L.getHighScore("dotsBest");
    celebrated = false;
    puzzleIndex = -1;
    L.bumpBadge("dotsScoreVal", 0);
    document.getElementById("dotsBestVal").textContent = bestAtStart;
    setupPuzzle();
  }

  function stop() {
    clearTimeout(advanceTimer);
    advanceTimer = null;
    if (stage) stage.innerHTML = "";
  }

  L.games.dots = { screen: "dotsGame", start, stop };
})();
