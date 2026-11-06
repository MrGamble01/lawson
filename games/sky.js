// ---------- Sky! ----------
// Look out the window, then tap the weather that matches.
// Three big pictures, one right answer.
(function () {
  const L = window.Lawson;
  const NS = "http://www.w3.org/2000/svg";

  function el(name, attrs) {
    const node = document.createElementNS(NS, name);
    Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  }

  function canvas() {
    const svg = el("svg", { viewBox: "0 0 120 120" });
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("sky-art");
    return svg;
  }

  function cloud(svg, x, y, fill) {
    const edge = { fill, stroke: "#8aa0b4", "stroke-width": "2" };
    svg.appendChild(el("ellipse", Object.assign({ cx: String(x - 16), cy: String(y + 6), rx: "16", ry: "12" }, edge)));
    svg.appendChild(el("ellipse", Object.assign({ cx: String(x + 16), cy: String(y + 6), rx: "14", ry: "11" }, edge)));
    svg.appendChild(el("ellipse", Object.assign({ cx: String(x), cy: String(y - 4), rx: "22", ry: "16" }, edge)));
  }

  const SKIES = [
    {
      name: "sunny",
      said: "Sunny",
      sky: "#9fd4f0",
      draw(svg) {
        svg.appendChild(el("circle", { cx: "60", cy: "60", r: "22", fill: "#f5c518" }));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          svg.appendChild(el("line", {
            x1: String(60 + Math.cos(a) * 30),
            y1: String(60 + Math.sin(a) * 30),
            x2: String(60 + Math.cos(a) * 44),
            y2: String(60 + Math.sin(a) * 44),
            stroke: "#f5c518",
            "stroke-width": "5",
            "stroke-linecap": "round",
          }));
        }
      },
    },
    {
      name: "rainy",
      said: "Rainy",
      sky: "#b9c7d6",
      draw(svg) {
        cloud(svg, 60, 42, "#f4f7fb");
        [40, 60, 80].forEach((x, i) => {
          svg.appendChild(el("line", {
            x1: String(x), y1: String(68 + i * 2),
            x2: String(x - 6), y2: String(86 + i * 2),
            stroke: "#4dabf7",
            "stroke-width": "4",
            "stroke-linecap": "round",
          }));
        });
      },
    },
    {
      name: "snowy",
      said: "Snowy",
      sky: "#e7eef5",
      draw(svg) {
        cloud(svg, 60, 40, "#f7fbff");
        [[38, 74], [58, 82], [78, 72], [48, 98], [70, 100]].forEach(([x, y]) => {
          svg.appendChild(el("circle", { cx: String(x), cy: String(y), r: "4", fill: "#fff", stroke: "#9bb4c8", "stroke-width": "2" }));
        });
      },
    },
    {
      name: "cloudy",
      said: "Cloudy",
      sky: "#d5dee8",
      draw(svg) {
        cloud(svg, 60, 62, "#c5d0dc");
      },
    },
    {
      name: "windy",
      said: "Windy",
      sky: "#c5e4f5",
      draw(svg) {
        [[36, 70], [48, 46], [60, 28]].forEach(([y, w]) => {
          svg.appendChild(el("path", {
            d: `M18 ${y} Q ${18 + w / 2} ${y - 14}, ${18 + w} ${y}`,
            fill: "none",
            stroke: "#3b82c4",
            "stroke-width": "5",
            "stroke-linecap": "round",
          }));
        });
      },
    },
    {
      name: "rainbow",
      said: "A rainbow",
      sky: "#d7ecf8",
      draw(svg) {
        [["#e03131", "46"], ["#f59f00", "38"], ["#f5c518", "30"], ["#2f9e44", "22"]].forEach(([stroke, r]) => {
          svg.appendChild(el("path", {
            d: `M${60 - r} 78 A ${r} ${r} 0 0 1 ${60 + Number(r)} 78`,
            fill: "none",
            stroke,
            "stroke-width": "6",
            "stroke-linecap": "round",
          }));
        });
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
      setTimeout(() => L.celebrateNewHigh(value), 800);
    }
    L.bumpHighScore("skyBest", value);
  }

  function paint(parent, sky) {
    const svg = canvas();
    sky.draw(svg);
    parent.appendChild(svg);
  }

  function pickRound() {
    const pool = SKIES.filter((s) => s.name !== lastName);
    const next = pool[Math.floor(Math.random() * pool.length)];
    lastName = next.name;
    const others = L.shuffled(SKIES.filter((s) => s !== next)).slice(0, 2);
    return { target: next, choices: L.shuffled([next, ...others]) };
  }

  function newRound() {
    answered = false;
    clearTimeout(activeTimer);
    activeTimer = null;
    const round = pickRound();
    target = round.target;
    const question = "What's the weather?";

    const prompt = document.getElementById("skyPrompt");
    if (prompt) prompt.textContent = question;

    const win = document.getElementById("skyWindow");
    win.innerHTML = "";
    win.style.setProperty("--sky", target.sky);
    paint(win, target);

    const choices = document.getElementById("skyChoices");
    choices.innerHTML = "";
    round.choices.forEach((sky) => {
      const btn = document.createElement("button");
      btn.className = "sky-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", sky.said);
      btn.style.setProperty("--sky", sky.sky);
      paint(btn, sky);
      L.onTap(btn, (e) => {
        if (answered) return;
        if (e.stopPropagation) e.stopPropagation();
        if (sky === target) {
          L.happySound();
          score += 1;
          L.bumpBadge("skyScoreVal", score);
          if (score > 0 && score % 5 === 0 && L.boboCheer) L.boboCheer();
          maybeCelebrateRecord(score);
          document.getElementById("skyBestVal").textContent = L.getHighScore("skyBest");
          L.say(`${sky.said}! ${L.cheer()}`);
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
          L.bumpBadge("skyScoreVal", 0);
        }
      });
      choices.appendChild(btn);
    });

    activeTimer = setTimeout(() => L.sayPrompt(question), 450);
  }

  function start() {
    score = 0;
    bestAtStart = L.getHighScore("skyBest");
    celebrated = false;
    lastName = "";
    L.bumpBadge("skyScoreVal", 0);
    document.getElementById("skyBestVal").textContent = bestAtStart;
    newRound();
  }

  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    clearNext();
  }

  L.games.sky = { screen: "skyGame", start, stop };
})();
