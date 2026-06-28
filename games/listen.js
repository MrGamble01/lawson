// ---------- Listen & Find ----------
// Pure auditory recognition: the kid hears "Quack quack! Find the duck!"
// and taps the matching emoji among three choices. Unlike Match, the
// target is never shown — they have to recognize by sound alone. A
// "🔁 Hear it again" button repeats the clue without penalty.
(function () {
  const L = window.Lawson;

  const POOL = [
    { e: "🐶", n: "dog",        s: "Woof woof!" },
    { e: "🐱", n: "cat",        s: "Meow!" },
    { e: "🐮", n: "cow",        s: "Moo!" },
    { e: "🐷", n: "pig",        s: "Oink oink!" },
    { e: "🦆", n: "duck",       s: "Quack quack!" },
    { e: "🐑", n: "sheep",      s: "Baa!" },
    { e: "🐝", n: "bee",        s: "Buzz buzz!" },
    { e: "🦁", n: "lion",       s: "Roar!" },
    { e: "🐸", n: "frog",       s: "Ribbit!" },
    { e: "🐴", n: "horse",      s: "Neigh!" },
    { e: "🐵", n: "monkey",     s: "Ooh ooh ah ah!" },
    { e: "🐘", n: "elephant",   s: "Toot!" },
    { e: "🚗", n: "car",        s: "Beep beep!" },
    { e: "🚂", n: "train",      s: "Choo choo!" },
    { e: "✈️", n: "plane",      s: "Wheee!" },
    { e: "🚒", n: "fire truck", s: "Wee-oh wee-oh!" },
    { e: "🚀", n: "rocket",     s: "Blast off!" },
    { e: "⛵", n: "boat",       s: "Toot toot!" },
  ];

  let score = 0;
  let answer = null;
  let activeTimer = null;
  let bestAtStart = 0;
  let celebrated = false;

  function maybeCelebrateRecord(value) {
    if (value > bestAtStart && !celebrated) {
      celebrated = true;
      setTimeout(() => L.celebrateNewHigh(value), 800);
    }
    L.bumpHighScore("listenBest", value);
  }

  function pick3() {
    const c = POOL.slice();
    const out = [];
    while (out.length < 3 && c.length) out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
    return out;
  }

  function speakClue() {
    if (!answer) return;
    L.say(`${answer.s} Find the ${answer.n}!`);
  }

  function newRound() {
    const stage = document.getElementById("listenChoices");
    if (!stage) return;
    stage.innerHTML = "";

    const [a, d1, d2] = pick3();
    answer = a;
    const opts = L.shuffled([a, d1, d2]);

    opts.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "listen-choice";
      btn.textContent = item.e;
      L.onTap(btn, (e) => {
        if (item.n === answer.n) {
          L.happySound();
          score += 1;
          L.bumpBadge("listenScoreVal", score);
          if (score >= 10) L.earnSticker && L.earnSticker("listen10");
          if (score > 0 && score % 5 === 0) L.boboCheer && L.boboCheer();
          maybeCelebrateRecord(score);
          document.getElementById("listenBestVal").textContent = L.getHighScore("listenBest");

          L.say(`${L.cheer()} It's a ${answer.n}!`);
          btn.classList.add("correct");
          const p = L.pointOf(e);
          L.sparkleAt(p.x, p.y);
          clearTimeout(activeTimer);
          activeTimer = setTimeout(newRound, 1500);
        } else {
          // Wrong answer: keep score (don't reset — that punishes guessing,
          // which is part of how toddlers learn), but break the streak
          // by zeroing it after the wrong tap so high score is meaningful.
          L.buzzSound();
          btn.classList.add("wrong");
          setTimeout(() => btn.classList.remove("wrong"), 500);
          score = 0;
          L.bumpBadge("listenScoreVal", score);
          setTimeout(speakClue, 350);
        }
      });
      stage.appendChild(btn);
    });

    activeTimer = setTimeout(speakClue, 400);
  }

  function start() {
    score = 0;
    bestAtStart = L.getHighScore("listenBest");
    celebrated = false;
    L.bumpBadge("listenScoreVal", 0);
    document.getElementById("listenBestVal").textContent = bestAtStart;
    const replay = document.getElementById("listenReplay");
    if (replay) L.onTapOnce(replay, (e) => {
      if (e.stopPropagation) e.stopPropagation();
      L.beep(620, 0.08, "triangle");
      speakClue();
    });
    newRound();
  }
  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    const stage = document.getElementById("listenChoices");
    if (stage) stage.innerHTML = "";
  }
  L.games.listen = { screen: "listenGame", start, stop };
})();
