// ---------- Mail! ----------
// A colored letter. Tap the mailbox that matches.
// Three big mailboxes, one right answer.
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
    svg.classList.add("mail-art");
    return svg;
  }

  function paintLetter(parent, color) {
    const svg = canvas();
    svg.appendChild(el("rect", {
      x: "16", y: "34", width: "88", height: "58", rx: "6",
      fill: color.hex, stroke: INK, "stroke-width": "4",
    }));
    svg.appendChild(el("polyline", {
      points: "16,36 60,70 104,36",
      fill: "none", stroke: "#fffaf3", "stroke-width": "4",
    }));
    parent.appendChild(svg);
  }

  function paintBox(parent, color) {
    const svg = canvas();
    svg.appendChild(el("rect", {
      x: "30", y: "44", width: "60", height: "50", rx: "4",
      fill: color.hex, stroke: INK, "stroke-width": "4",
    }));
    svg.appendChild(el("rect", {
      x: "40", y: "56", width: "40", height: "8", rx: "2", fill: "#fffaf3",
    }));
    svg.appendChild(el("polygon", {
      points: "76,30 98,30 98,54 76,44",
      fill: "#f5c518", stroke: INK, "stroke-width": "3", "stroke-linejoin": "round",
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
      setTimeout(() => L.celebrateNewHigh(value), 800);
    }
    L.bumpHighScore("mailBest", value);
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
    const question = "Which mailbox?";

    const prompt = document.getElementById("mailPrompt");
    if (prompt) prompt.textContent = question;

    const letter = document.getElementById("mailLetter");
    letter.innerHTML = "";
    paintLetter(letter, target);

    const choices = document.getElementById("mailChoices");
    choices.innerHTML = "";
    round.choices.forEach((color) => {
      const btn = document.createElement("button");
      btn.className = "mail-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", `${color.said} mailbox`);
      paintBox(btn, color);
      L.onTap(btn, (e) => {
        if (answered) return;
        if (e.stopPropagation) e.stopPropagation();
        if (color === target) {
          L.happySound();
          score += 1;
          L.bumpBadge("mailScoreVal", score);
          if (score > 0 && score % 5 === 0 && L.boboCheer) L.boboCheer();
          maybeCelebrateRecord(score);
          document.getElementById("mailBestVal").textContent = L.getHighScore("mailBest");
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
          L.bumpBadge("mailScoreVal", 0);
        }
      });
      choices.appendChild(btn);
    });

    activeTimer = setTimeout(() => L.sayPrompt(question), 450);
  }

  function start() {
    score = 0;
    bestAtStart = L.getHighScore("mailBest");
    celebrated = false;
    lastName = "";
    L.bumpBadge("mailScoreVal", 0);
    document.getElementById("mailBestVal").textContent = bestAtStart;
    newRound();
  }

  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    clearNext();
  }

  L.games.mail = { screen: "mailGame", start, stop };
})();
