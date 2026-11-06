// ---------- Blocks! ----------
// A big shape on the table. Tap the block that matches.
// Three big choices, one right answer. The Shapes flashcards stay separate.
(function () {
  const L = window.Lawson;
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#3a2a22";

  function el(name, attrs) {
    const node = document.createElementNS(NS, name);
    Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  }

  function canvas() {
    const svg = el("svg", { viewBox: "0 0 120 120" });
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("block-art");
    return svg;
  }

  function shape(svg, name, fill) {
    const edge = { fill, stroke: INK, "stroke-width": "4", "stroke-linejoin": "round" };
    if (name === "circle") {
      svg.appendChild(el("circle", Object.assign({ cx: "60", cy: "60", r: "36" }, edge)));
    } else if (name === "square") {
      svg.appendChild(el("rect", Object.assign({ x: "26", y: "26", width: "68", height: "68", rx: "8" }, edge)));
    } else if (name === "triangle") {
      svg.appendChild(el("polygon", Object.assign({ points: "60,18 104,98 16,98" }, edge)));
    } else if (name === "star") {
      svg.appendChild(el("polygon", Object.assign({
        points: "60,12 72,46 108,48 80,70 90,106 60,86 30,106 40,70 12,48 48,46",
      }, edge)));
    } else if (name === "heart") {
      svg.appendChild(el("path", Object.assign({
        d: "M60 98 C 22 70, 14 42, 36 30 C 48 24, 58 34, 60 42 C 62 34, 72 24, 84 30 C 106 42, 98 70, 60 98 Z",
      }, edge)));
    } else {
      svg.appendChild(el("polygon", Object.assign({ points: "60,14 104,60 60,106 16,60" }, edge)));
    }
  }

  const BLOCKS = [
    { name: "circle",   said: "Circle",   fill: "#e03131" },
    { name: "square",   said: "Square",   fill: "#1c7ed6" },
    { name: "triangle", said: "Triangle", fill: "#2f9e44" },
    { name: "star",     said: "Star",     fill: "#f5c518" },
    { name: "heart",    said: "Heart",    fill: "#e64980" },
    { name: "diamond",  said: "Diamond",  fill: "#9c36b5" },
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
    L.bumpHighScore("blocksBest", value);
  }

  function paint(parent, block) {
    const svg = canvas();
    shape(svg, block.name, block.fill);
    parent.appendChild(svg);
  }

  function pickRound() {
    const pool = BLOCKS.filter((b) => b.name !== lastName);
    const next = pool[Math.floor(Math.random() * pool.length)];
    lastName = next.name;
    const others = L.shuffled(BLOCKS.filter((b) => b !== next)).slice(0, 2);
    return { target: next, choices: L.shuffled([next, ...others]) };
  }

  function newRound() {
    answered = false;
    clearTimeout(activeTimer);
    activeTimer = null;
    const round = pickRound();
    target = round.target;
    const question = "What shape?";

    const prompt = document.getElementById("blocksPrompt");
    if (prompt) prompt.textContent = question;

    const sample = document.getElementById("blocksSample");
    sample.innerHTML = "";
    paint(sample, target);

    const choices = document.getElementById("blocksChoices");
    choices.innerHTML = "";
    round.choices.forEach((block) => {
      const btn = document.createElement("button");
      btn.className = "block-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", block.said);
      paint(btn, block);
      L.onTap(btn, (e) => {
        if (answered) return;
        if (e.stopPropagation) e.stopPropagation();
        if (block === target) {
          L.happySound();
          score += 1;
          L.bumpBadge("blocksScoreVal", score);
          if (score > 0 && score % 5 === 0 && L.boboCheer) L.boboCheer();
          maybeCelebrateRecord(score);
          document.getElementById("blocksBestVal").textContent = L.getHighScore("blocksBest");
          L.say(`${block.said}! ${L.cheer()}`);
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
          L.bumpBadge("blocksScoreVal", 0);
        }
      });
      choices.appendChild(btn);
    });

    activeTimer = setTimeout(() => L.sayPrompt(question), 450);
  }

  function start() {
    score = 0;
    bestAtStart = L.getHighScore("blocksBest");
    celebrated = false;
    lastName = "";
    L.bumpBadge("blocksScoreVal", 0);
    document.getElementById("blocksBestVal").textContent = bestAtStart;
    newRound();
  }

  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    clearNext();
  }

  L.games.blocks = { screen: "blocksGame", start, stop };
})();
