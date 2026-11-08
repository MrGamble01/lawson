// ---------- Who's That! ----------
// A creature silhouette. Tap the matching name.
// Six questions, then the score and a replay.
(function () {
  const L = window.Lawson;
  const ROUNDS = L.pokemon.rounds;

  let score = 0;
  let roundIndex = 0;
  let used = [];
  let locked = false;
  let activeTimer = null;
  let celebrateTimer = null;
  let cancelNext = null;
  let bestAtStart = 0;
  let celebrated = false;
  let target = null;

  function clearNext() { if (cancelNext) cancelNext(); cancelNext = null; }

  function maybeCelebrateRecord(value) {
    if (value > bestAtStart && !celebrated) {
      celebrated = true;
      clearTimeout(celebrateTimer);
      celebrateTimer = setTimeout(() => {
        celebrateTimer = null;
        L.celebrateNewHigh(value);
      }, 800);
    }
    L.bumpHighScore("pokequizBest", value);
  }

  function focusedControl(e) {
    const el = e && e.target;
    if (!el || !el.closest) return false;
    return !!el.closest("button, a, input, select, textarea");
  }

  function onKey(e) {
    const screen = document.getElementById("pokequizGame");
    if (!screen || !screen.classList.contains("active")) return;
    if (focusedControl(e)) return;
    const again = document.getElementById("pokequizAgain");
    if (again && !again.hidden && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      again.click();
      return;
    }
    if (e.key !== "1" && e.key !== "2" && e.key !== "3") return;
    const buttons = document.querySelectorAll("#pokequizChoices .pokequiz-btn");
    const btn = buttons[Number(e.key) - 1];
    if (!btn) return;
    e.preventDefault();
    btn.click();
  }

  function showResults() {
    const prompt = document.getElementById("pokequizPrompt");
    prompt.textContent = "You found " + score + "!";
    document.getElementById("pokequizRound").textContent = ROUNDS + " / " + ROUNDS;
    const sample = document.getElementById("pokequizSilhouette");
    sample.textContent = "";
    document.getElementById("pokequizChoices").textContent = "";
    const again = document.getElementById("pokequizAgain");
    again.hidden = false;
    L.say("You found " + score + "!");
  }

  function reveal() {
    const sample = document.getElementById("pokequizSilhouette");
    sample.textContent = "";
    sample.dataset.revealed = "1";
    L.pokemon.drawCreature(sample, target.id, { silhouette: false });
  }

  function newRound() {
    locked = false;
    clearTimeout(activeTimer);
    activeTimer = null;
    if (roundIndex >= ROUNDS) {
      showResults();
      return;
    }
    const round = L.pokemon.makeRound(used, Math.random);
    target = round.target;
    used.push(target.id);
    const question = "Who is this?";

    const prompt = document.getElementById("pokequizPrompt");
    prompt.textContent = question;
    document.getElementById("pokequizRound").textContent = (roundIndex + 1) + " / " + ROUNDS;
    document.getElementById("pokequizAgain").hidden = true;

    const sample = document.getElementById("pokequizSilhouette");
    sample.textContent = "";
    sample.dataset.answer = target.id;
    sample.dataset.revealed = "0";
    L.pokemon.drawCreature(sample, target.id, { silhouette: true });

    const choices = document.getElementById("pokequizChoices");
    choices.textContent = "";
    round.choices.forEach((mon) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pokequiz-btn";
      btn.dataset.id = mon.id;
      btn.setAttribute("aria-label", mon.name);
      const art = document.createElement("span");
      art.className = "pokequiz-mini";
      art.setAttribute("aria-hidden", "true");
      L.pokemon.drawCreature(art, mon.id, { silhouette: false });
      const label = document.createElement("span");
      label.className = "pokequiz-name";
      label.textContent = mon.name;
      btn.appendChild(art);
      btn.appendChild(label);
      L.onTap(btn, (e) => {
        if (locked) return;
        if (e && e.stopPropagation) e.stopPropagation();
        const correct = mon.id === target.id;
        locked = true;
        reveal();
        btn.classList.add(correct ? "correct" : "wrong");
        if (!correct) {
          const buttons = choices.querySelectorAll(".pokequiz-btn");
          for (let i = 0; i < buttons.length; i++) {
            if (buttons[i].dataset.id === target.id) buttons[i].classList.add("correct");
          }
        }
        if (correct) {
          L.happySound();
          score += 1;
          L.bumpBadge("pokequizScoreVal", score);
          if (score > 0 && score % 5 === 0 && L.boboCheer) L.boboCheer();
          maybeCelebrateRecord(score);
          document.getElementById("pokequizBestVal").textContent = L.getHighScore("pokequizBest");
          L.say(mon.name + "! " + L.cheer());
        } else {
          L.buzzSound();
          L.say(target.name + "!");
        }
        clearTimeout(activeTimer);
        activeTimer = null;
        clearNext();
        cancelNext = L.afterSpeech(() => {
          roundIndex += 1;
          newRound();
        }, { minMs: 1600 });
      });
      choices.appendChild(btn);
    });

    activeTimer = setTimeout(() => L.sayPrompt(question), 450);
  }

  function start() {
    stop();
    score = 0;
    roundIndex = 0;
    used = [];
    target = null;
    bestAtStart = L.getHighScore("pokequizBest");
    celebrated = false;
    L.bumpBadge("pokequizScoreVal", 0);
    document.getElementById("pokequizBestVal").textContent = bestAtStart;
    document.addEventListener("keydown", onKey);
    newRound();
  }

  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    clearTimeout(celebrateTimer);
    celebrateTimer = null;
    clearNext();
    document.removeEventListener("keydown", onKey);
  }

  L.onTapOnce(document.getElementById("pokequizAgain"), function () { start(); });

  L.games.pokequiz = { screen: "pokequizGame", start: start, stop: stop };
})();
