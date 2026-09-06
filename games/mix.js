// ---------- Color Mix ----------
// "Make orange!" Show a target color and a row of base-color drops.
// Tap two drops — they fall into the bowl and visually combine. If the
// mix matches the target, celebrate; if not, gentle "try again" and
// new round. Uses RGB averaging (not pigment-accurate, but intuitive
// for a toddler and matches what the eyes see).
(function () {
  const L = window.Lawson;

  const MIXES = [
    { a: "Red",    b: "Yellow", result: "Orange", rHex: "#ff8a00" },
    { a: "Yellow", b: "Blue",   result: "Green",  rHex: "#43a047" },
    { a: "Red",    b: "Blue",   result: "Purple", rHex: "#7b1fa2" },
    { a: "White",  b: "Red",    result: "Pink",   rHex: "#ff8ab0" },
    { a: "Black",  b: "White",  result: "Gray",   rHex: "#808080" },
  ];

  const PALETTE = [
    { name: "Red",    hex: "#ff3b30" },
    { name: "Yellow", hex: "#ffd60a" },
    { name: "Blue",   hex: "#1976d2" },
    { name: "White",  hex: "#ffffff" },
    { name: "Black",  hex: "#222222" },
  ];
  const PALETTE_BY_NAME = Object.fromEntries(PALETTE.map((c) => [c.name, c]));

  let score = 0;
  let activeTimer = null;
  let cancelNext = null;
  function clearNext() { if (cancelNext) cancelNext(); cancelNext = null; }
  let target = null;
  let selected = [];
  let busy = false;
  let lastMixIdx = -1;
  let bestAtStart = 0;
  let celebrated = false;

  function maybeCelebrateRecord(value) {
    if (value > bestAtStart && !celebrated) {
      celebrated = true;
      setTimeout(() => L.celebrateNewHigh(value), 700);
    }
    L.bumpHighScore("mixBest", value);
  }

  function pickMix() {
    let i;
    do { i = Math.floor(Math.random() * MIXES.length); } while (i === lastMixIdx && MIXES.length > 1);
    lastMixIdx = i;
    return MIXES[i];
  }

  function newRound() {
    target = pickMix();
    selected = [];
    busy = false;

    const bowl = document.getElementById("mixBowl");
    bowl.style.background = "#fff";
    bowl.classList.remove("filled", "correct", "wrong");

    const swatch = document.getElementById("mixTarget");
    swatch.style.background = target.rHex;
    document.getElementById("mixTargetName").textContent = `Make ${target.result}!`;

    renderPalette();
    activeTimer = setTimeout(() => L.say(`Make ${target.result}!`), 350);
  }

  function renderPalette() {
    const pal = document.getElementById("mixPalette");
    pal.innerHTML = "";
    PALETTE.forEach((c) => {
      const drop = document.createElement("button");
      drop.className = "mix-drop";
      drop.style.background = c.hex;
      drop.dataset.name = c.name;
      drop.title = c.name;
      drop.setAttribute("aria-label", c.name);
      L.onTap(drop, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        onDrop(c, drop);
      });
      pal.appendChild(drop);
    });
  }

  function onDrop(color, btn) {
    if (busy || selected.length >= 2 || btn.classList.contains("used")) return;
    selected.push(color);
    btn.classList.add("used");
    L.beep(450 + selected.length * 120, 0.1, "triangle");
    L.say(color.name, 1.05);

    const bowl = document.getElementById("mixBowl");
    if (selected.length === 1) {
      bowl.style.background = color.hex;
    } else {
      bowl.style.background = mixColors(selected[0].hex, selected[1].hex);
      bowl.classList.add("filled");
      busy = true;
      activeTimer = setTimeout(checkResult, 750);
    }
  }

  function mixColors(a, b) {
    const ar = parseInt(a.slice(1,3),16), ag = parseInt(a.slice(3,5),16), ab = parseInt(a.slice(5,7),16);
    const br = parseInt(b.slice(1,3),16), bg = parseInt(b.slice(3,5),16), bb = parseInt(b.slice(5,7),16);
    return `rgb(${Math.round((ar+br)/2)},${Math.round((ag+bg)/2)},${Math.round((ab+bb)/2)})`;
  }

  function checkResult() {
    const need = new Set([target.a, target.b]);
    const have = new Set(selected.map((s) => s.name));
    const ok = need.size === have.size && [...need].every((n) => have.has(n));

    const bowl = document.getElementById("mixBowl");
    if (ok) {
      L.happySound();
      score += 1;
      L.bumpBadge("mixScoreVal", score);
      if (score >= 5) L.earnSticker && L.earnSticker("mixer");
      maybeCelebrateRecord(score);
      document.getElementById("mixBestVal").textContent = L.getHighScore("mixBest");

      bowl.classList.add("correct");
      L.say(`${target.result}! ${L.cheer()}`);
      const r = bowl.getBoundingClientRect();
      for (let k = 0; k < 8; k++) {
        setTimeout(() => L.sparkleAt(
          r.left + r.width / 2 + (Math.random() - 0.5) * 120,
          r.top + r.height / 2 + (Math.random() - 0.5) * 120,
        ), k * 50);
      }
      // Next round once the result and the cheer have been heard.
      clearNext();
      cancelNext = L.afterSpeech(newRound, { minMs: 2000 });
    } else {
      bowl.classList.add("wrong");
      L.buzzSound();
      L.say(`Oops, that's not ${target.result}. Try again!`);
      score = 0;
      L.bumpBadge("mixScoreVal", 0);
      // Let "try again" finish before the next "Make ...!" prompt.
      clearNext();
      cancelNext = L.afterSpeech(newRound, { minMs: 1800 });
    }
  }

  function start() {
    score = 0;
    bestAtStart = L.getHighScore("mixBest");
    celebrated = false;
    lastMixIdx = -1;
    L.bumpBadge("mixScoreVal", 0);
    document.getElementById("mixBestVal").textContent = bestAtStart;
    newRound();
  }
  function stop() {
    clearTimeout(activeTimer);
    activeTimer = null;
    clearNext();
  }

  L.games.mix = { screen: "mixGame", start, stop };
})();
