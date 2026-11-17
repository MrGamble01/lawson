// ---------- Socks! ----------
// A laundry line. One sock is held up; tap the sock on the line that
// matches it. Three big choices, one right answer.
(function () {
  const L = window.Lawson;

  const SOCKS = [
    { name: "red",    hex: "#e03131", pat: "bands" },
    { name: "blue",   hex: "#1c7ed6", pat: "dots" },
    { name: "yellow", hex: "#f59f00", pat: "solid" },
    { name: "green",  hex: "#2f9e44", pat: "stripes" },
    { name: "purple", hex: "#9c36b5", pat: "spots" },
    { name: "orange", hex: "#f76707", pat: "diagonal" },
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
    L.bumpHighScore("socksBest", value);
  }

  function paintSock(parent, sock) {
    const el = document.createElement("span");
    el.className = "sock";
    el.dataset.pat = sock.pat;
    el.style.setProperty("--sock", sock.hex);
    el.setAttribute("aria-hidden", "true");
    parent.appendChild(el);
  }

  function pickRound() {
    const pool = SOCKS.filter((s) => s.name !== lastName);
    const next = pool[Math.floor(Math.random() * pool.length)];
    lastName = next.name;
    const others = L.shuffled(SOCKS.filter((s) => s !== next)).slice(0, 2);
    return { target: next, choices: L.shuffled([next, ...others]) };
  }

  function newRound() {
    answered = false;
    clearTimeout(activeTimer);
    activeTimer = null;
    const round = pickRound();
    target = round.target;
    const question = `Find the ${target.name} sock!`;

    const prompt = document.getElementById("socksPrompt");
    if (prompt) prompt.textContent = question;

    const sample = document.getElementById("socksSample");
    sample.innerHTML = "";
    paintSock(sample, target);

    const line = document.getElementById("socksLine");
    line.innerHTML = "";
    round.choices.forEach((sock) => {
      const btn = document.createElement("button");
      btn.className = "sock-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", `${sock.name} sock`);
      paintSock(btn, sock);
      L.onTap(btn, (e) => {
        if (answered) return;
        if (e.stopPropagation) e.stopPropagation();
        if (sock === target) {
          L.happySound();
          score += 1;
          L.bumpBadge("socksScoreVal", score);
          if (score > 0 && score % 5 === 0 && L.boboCheer) L.boboCheer();
          maybeCelebrateRecord(score);
          document.getElementById("socksBestVal").textContent = L.getHighScore("socksBest");
          L.say(`${sock.name}! ${L.cheer()}`);
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
          L.bumpBadge("socksScoreVal", 0);
        }
      });
      line.appendChild(btn);
    });

    activeTimer = setTimeout(() => L.sayPrompt(question), 450);
  }

  function start() {
    score = 0;
    bestAtStart = L.getHighScore("socksBest");
    celebrated = false;
    lastName = "";
    L.bumpBadge("socksScoreVal", 0);
    document.getElementById("socksBestVal").textContent = bestAtStart;
    newRound();
  }

  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    clearNext();
  }

  L.games.socks = { screen: "socksGame", start, stop };
})();
