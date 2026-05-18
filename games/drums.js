// ---------- Drum Kit ----------
// Four big colorful pads with synthesized drum sounds. Pure free-play
// — no score, no time limit. Sounds are built entirely with the Web
// Audio nodes we already have, no samples to ship.
(function () {
  const L = window.Lawson;

  function ac() {
    const a = L.audioCtx;
    if (a.state === "suspended") a.resume();
    return a;
  }
  function muted() { return L.isSoundMuted && L.isSoundMuted(); }

  // Kick: sine sweep 150 → 40 Hz with snappy decay.
  function kick() {
    if (muted()) return;
    const a = ac();
    const t = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + 0.3);
  }

  // Snare: triangle body + white-noise burst.
  function snare() {
    if (muted()) return;
    const a = ac();
    const t = a.currentTime;

    const o = a.createOscillator();
    const og = a.createGain();
    o.type = "triangle";
    o.frequency.value = 200;
    og.gain.setValueAtTime(0.3, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(og).connect(a.destination);
    o.start(t); o.stop(t + 0.15);

    const buf = a.createBuffer(1, a.sampleRate * 0.15, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.8;
    const src = a.createBufferSource();
    src.buffer = buf;
    const ng = a.createGain();
    ng.gain.setValueAtTime(0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    src.connect(ng).connect(a.destination);
    src.start(t);
  }

  // Hi-hat: high-passed noise click.
  function hihat() {
    if (muted()) return;
    const a = ac();
    const t = a.currentTime;
    const buf = a.createBuffer(1, a.sampleRate * 0.05, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const filter = a.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 6000;
    const g = a.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(filter).connect(g).connect(a.destination);
    src.start(t);
  }

  // Tom: low sine sweep, longer than the kick.
  function tom() {
    if (muted()) return;
    const a = ac();
    const t = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.25);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + 0.4);
  }

  const PADS = [
    { name: "Kick",   emoji: "🥁", color: "#ff6b6b", play: kick  },
    { name: "Snare",  emoji: "🎯", color: "#4dabf7", play: snare },
    { name: "Hi-hat", emoji: "✨", color: "#ffd43b", play: hihat },
    { name: "Tom",    emoji: "🪘", color: "#37b24d", play: tom   },
  ];

  function flash(el) {
    el.classList.remove("pressed");
    void el.offsetWidth;
    el.classList.add("pressed");
    clearTimeout(el._pt);
    el._pt = setTimeout(() => el.classList.remove("pressed"), 220);
  }

  function start() {
    const board = document.getElementById("drumPads");
    if (!board) return;
    board.innerHTML = "";
    PADS.forEach((p) => {
      const pad = document.createElement("button");
      pad.className = "drum-pad";
      pad.style.setProperty("--c", p.color);
      pad.innerHTML = `<span class="drum-emoji">${p.emoji}</span><span class="drum-name">${p.name}</span>`;
      L.onTap(pad, () => { p.play(); flash(pad); });
      board.appendChild(pad);
    });
    L.say("Drum time!");
  }
  function stop() {
    const b = document.getElementById("drumPads");
    if (b) b.innerHTML = "";
  }

  L.games.drums = { screen: "drumsGame", start, stop };
})();
