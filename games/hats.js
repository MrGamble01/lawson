// ---------- Hats! ----------
// A day is announced. Tap the hat that fits.
// Three big hats, one right answer.
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
    svg.classList.add("hat-art");
    return svg;
  }

  function paintHat(svg, kind) {
    const edge = { stroke: INK, "stroke-width": "4", "stroke-linejoin": "round", "stroke-linecap": "round" };
    if (kind === "sun") {
      svg.appendChild(el("ellipse", Object.assign({ cx: "60", cy: "78", rx: "44", ry: "12", fill: "#f5c518" }, edge)));
      svg.appendChild(el("path", Object.assign({ d: "M34 76 Q 60 28 86 76 Z", fill: "#ffe066" }, edge)));
    } else if (kind === "rain") {
      svg.appendChild(el("path", Object.assign({ d: "M28 70 L 40 36 H 80 L 92 70 Z", fill: "#4dabf7" }, edge)));
      svg.appendChild(el("rect", Object.assign({ x: "22", y: "66", width: "76", height: "12", rx: "6", fill: "#1c7ed6" }, edge)));
    } else if (kind === "warm") {
      svg.appendChild(el("path", Object.assign({ d: "M30 86 Q 30 40 60 36 Q 90 40 90 86 Z", fill: "#e03131" }, edge)));
      svg.appendChild(el("circle", Object.assign({ cx: "60", cy: "32", r: "10", fill: "#fff" }, edge)));
    } else if (kind === "party") {
      svg.appendChild(el("polygon", Object.assign({ points: "60,18 96,96 24,96", fill: "#e64980" }, edge)));
      svg.appendChild(el("circle", Object.assign({ cx: "60", cy: "16", r: "8", fill: "#f5c518" }, edge)));
    } else if (kind === "night") {
      svg.appendChild(el("path", Object.assign({
        d: "M26 82 Q 34 44 66 46 Q 98 48 108 24 Q 92 40 74 44 Q 48 50 38 82 Z",
        fill: "#9c36b5",
      }, edge)));
      svg.appendChild(el("circle", Object.assign({ cx: "108", cy: "22", r: "8", fill: "#f5c518" }, edge)));
    } else {
      svg.appendChild(el("polygon", Object.assign({
        points: "18,78 34,42 48,72 60,28 72,72 86,42 102,78",
        fill: "#f5c518",
      }, edge)));
      svg.appendChild(el("rect", Object.assign({ x: "16", y: "74", width: "88", height: "12", rx: "4", fill: "#f5c518" }, edge)));
    }
  }

  const DAYS = [
    { name: "sunny",   line: "It's sunny!",   hat: "sun",   said: "Sun hat",   emoji: "☀️" },
    { name: "rainy",   line: "It's rainy!",   hat: "rain",  said: "Rain hat",  emoji: "🌧️" },
    { name: "snowy",   line: "It's snowy!",   hat: "warm",  said: "Warm hat",  emoji: "❄️" },
    { name: "party",   line: "It's a party!", hat: "party", said: "Party hat", emoji: "🎉" },
    { name: "bedtime", line: "It's bedtime!", hat: "night", said: "Night hat", emoji: "🌙" },
    { name: "parade",  line: "It's a parade!", hat: "crown", said: "Crown",    emoji: "🎺" },
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
    L.bumpHighScore("hatsBest", value);
  }

  function paint(parent, day) {
    const svg = canvas();
    paintHat(svg, day.hat);
    parent.appendChild(svg);
  }

  function pickRound() {
    const pool = DAYS.filter((d) => d.name !== lastName);
    const next = pool[Math.floor(Math.random() * pool.length)];
    lastName = next.name;
    const others = L.shuffled(DAYS.filter((d) => d !== next)).slice(0, 2);
    return { target: next, choices: L.shuffled([next, ...others]) };
  }

  function newRound() {
    answered = false;
    clearTimeout(activeTimer);
    activeTimer = null;
    const round = pickRound();
    target = round.target;

    const prompt = document.getElementById("hatsPrompt");
    if (prompt) prompt.textContent = target.line;

    const clue = document.getElementById("hatsClue");
    clue.textContent = target.emoji;

    const choices = document.getElementById("hatsChoices");
    choices.innerHTML = "";
    round.choices.forEach((day) => {
      const btn = document.createElement("button");
      btn.className = "hat-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", day.said);
      paint(btn, day);
      L.onTap(btn, (e) => {
        if (answered) return;
        if (e.stopPropagation) e.stopPropagation();
        if (day === target) {
          L.happySound();
          score += 1;
          L.bumpBadge("hatsScoreVal", score);
          if (score > 0 && score % 5 === 0 && L.boboCheer) L.boboCheer();
          maybeCelebrateRecord(score);
          document.getElementById("hatsBestVal").textContent = L.getHighScore("hatsBest");
          L.say(`${day.said}! ${L.cheer()}`);
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
            () => L.sayPrompt(target.line),
            { minMs: 450, beatMs: 150, maxMs: 3000 },
          );
          score = 0;
          L.bumpBadge("hatsScoreVal", 0);
        }
      });
      choices.appendChild(btn);
    });

    activeTimer = setTimeout(() => L.sayPrompt(target.line), 450);
  }

  function start() {
    score = 0;
    bestAtStart = L.getHighScore("hatsBest");
    celebrated = false;
    lastName = "";
    L.bumpBadge("hatsScoreVal", 0);
    document.getElementById("hatsBestVal").textContent = bestAtStart;
    newRound();
  }

  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    clearNext();
  }

  L.games.hats = { screen: "hatsGame", start, stop };
})();
