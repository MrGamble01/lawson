// ---------- Piano ----------
// A rainbow-colored one-octave piano (C4–C5) with real black keys between.
// Each white key is a different rainbow color so a toddler can recognize
// keys by color as well as by letter. Tapping a key plays a soft note
// (triangle + sine + gentle envelope) and speaks its letter name.
//
// The "🎵 Song" button plays a familiar tune; keys light up in time so
// Lawson can try to follow along. Tap the button a second time to stop.
(function () {
  const L = window.Lawson;

  // White keys (C D E F G A B C) with rainbow colors.
  // Indices here match the song sequences below.
  const WHITE = [
    { note: "C", freq: 261.63, color: "#ff3b30" }, // red
    { note: "D", freq: 293.66, color: "#ff9500" }, // orange
    { note: "E", freq: 329.63, color: "#ffd60a" }, // yellow
    { note: "F", freq: 349.23, color: "#34c759" }, // green
    { note: "G", freq: 392.00, color: "#007aff" }, // blue
    { note: "A", freq: 440.00, color: "#5856d6" }, // indigo
    { note: "B", freq: 493.88, color: "#af52de" }, // violet
    { note: "C", freq: 523.25, color: "#ff2d92" }, // pink (high C)
  ];

  // Black keys positioned between specific white keys (after-index, freq).
  // There's no black key between E-F or B-C, matching a real piano.
  const BLACK = [
    { afterWhite: 0, note: "C#", freq: 277.18 },
    { afterWhite: 1, note: "D#", freq: 311.13 },
    { afterWhite: 3, note: "F#", freq: 369.99 },
    { afterWhite: 4, note: "G#", freq: 415.30 },
    { afterWhite: 5, note: "A#", freq: 466.16 },
  ];

  // Song = sequence of { w: whiteIndex, d: beats } (quarter = 1 beat).
  const SONGS = [
    {
      name: "Twinkle Twinkle",
      bpm: 110,
      notes: [
        {w:0,d:1},{w:0,d:1},{w:4,d:1},{w:4,d:1},{w:5,d:1},{w:5,d:1},{w:4,d:2},
        {w:3,d:1},{w:3,d:1},{w:2,d:1},{w:2,d:1},{w:1,d:1},{w:1,d:1},{w:0,d:2},
        {w:4,d:1},{w:4,d:1},{w:3,d:1},{w:3,d:1},{w:2,d:1},{w:2,d:1},{w:1,d:2},
        {w:4,d:1},{w:4,d:1},{w:3,d:1},{w:3,d:1},{w:2,d:1},{w:2,d:1},{w:1,d:2},
        {w:0,d:1},{w:0,d:1},{w:4,d:1},{w:4,d:1},{w:5,d:1},{w:5,d:1},{w:4,d:2},
        {w:3,d:1},{w:3,d:1},{w:2,d:1},{w:2,d:1},{w:1,d:1},{w:1,d:1},{w:0,d:2},
      ],
    },
    {
      name: "Mary Had a Little Lamb",
      bpm: 120,
      notes: [
        {w:2,d:1},{w:1,d:1},{w:0,d:1},{w:1,d:1},{w:2,d:1},{w:2,d:1},{w:2,d:2},
        {w:1,d:1},{w:1,d:1},{w:1,d:2},
        {w:2,d:1},{w:4,d:1},{w:4,d:2},
        {w:2,d:1},{w:1,d:1},{w:0,d:1},{w:1,d:1},{w:2,d:1},{w:2,d:1},{w:2,d:1},{w:2,d:1},
        {w:1,d:1},{w:1,d:1},{w:2,d:1},{w:1,d:1},{w:0,d:4},
      ],
    },
    {
      name: "Row, Row, Row Your Boat",
      bpm: 110,
      notes: [
        {w:0,d:2},{w:0,d:2},{w:0,d:1},{w:1,d:1},{w:2,d:2},
        {w:2,d:1},{w:1,d:1},{w:2,d:1},{w:3,d:1},{w:4,d:4},
        {w:7,d:1},{w:7,d:1},{w:7,d:1},{w:4,d:1},{w:4,d:1},{w:4,d:1},
        {w:2,d:1},{w:2,d:1},{w:2,d:1},{w:0,d:1},{w:0,d:1},{w:0,d:1},
        {w:4,d:1},{w:3,d:1},{w:2,d:1},{w:1,d:1},{w:0,d:4},
      ],
    },
  ];

  let songIndex = 0;
  let songTimeouts = [];
  let whiteEls = [];
  let blackEls = [];

  // Nicer piano-ish tone: triangle fundamental + soft sine harmonic + envelope.
  function playNote(freq, dur = 0.5) {
    try {
      const ac = L.audioCtx;
      if (ac.state === "suspended") ac.resume();
      const t = ac.currentTime;

      const master = ac.createGain();
      master.gain.setValueAtTime(0.0001, t);
      master.gain.exponentialRampToValueAtTime(0.35, t + 0.015);
      master.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      master.connect(ac.destination);

      const o1 = ac.createOscillator();
      o1.type = "triangle";
      o1.frequency.value = freq;
      const g1 = ac.createGain();
      g1.gain.value = 0.9;
      o1.connect(g1).connect(master);

      const o2 = ac.createOscillator();
      o2.type = "sine";
      o2.frequency.value = freq * 2;
      const g2 = ac.createGain();
      g2.gain.value = 0.25;
      o2.connect(g2).connect(master);

      o1.start(t); o2.start(t);
      o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
    } catch (_) {}
  }

  function flash(el) {
    if (!el) return;
    el.classList.remove("pressed");
    void el.offsetWidth;
    el.classList.add("pressed");
    clearTimeout(el._pt);
    el._pt = setTimeout(() => el.classList.remove("pressed"), 260);
  }

  function sayNote(note) {
    // Say the letter only (drop the '#' for black keys so TTS doesn't stumble).
    L.say(note.replace("#", " sharp"), 1.1);
  }

  function build() {
    const board = document.getElementById("pianoBoard");
    board.innerHTML = "";
    whiteEls = [];
    blackEls = [];

    const whiteRow = document.createElement("div");
    whiteRow.className = "piano-whites";
    WHITE.forEach((k, i) => {
      const key = document.createElement("button");
      key.className = "piano-white";
      key.style.setProperty("--c", k.color);
      key.innerHTML = `<span class="piano-label">${k.note}</span>`;
      L.onTap(key, () => {
        playNote(k.freq, 0.55);
        sayNote(k.note);
        flash(key);
      });
      whiteRow.appendChild(key);
      whiteEls.push(key);
    });
    board.appendChild(whiteRow);

    // Black keys layered on top of the white row.
    const blackLayer = document.createElement("div");
    blackLayer.className = "piano-blacks";
    BLACK.forEach((k) => {
      const key = document.createElement("button");
      key.className = "piano-black";
      // position each black key centered on the boundary between white keys
      const pct = ((k.afterWhite + 1) / WHITE.length) * 100;
      key.style.left = `calc(${pct}% - 4.5%)`;
      L.onTap(key, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        playNote(k.freq, 0.5);
        sayNote(k.note);
        flash(key);
      });
      blackLayer.appendChild(key);
      blackEls.push(key);
    });
    board.appendChild(blackLayer);
  }

  function stopSong() {
    songTimeouts.forEach((t) => clearTimeout(t));
    songTimeouts = [];
    const btn = document.getElementById("pianoSong");
    if (btn) btn.classList.remove("playing");
  }

  function playSong() {
    stopSong();
    const song = SONGS[songIndex % SONGS.length];
    songIndex += 1;
    const beat = 60 / song.bpm; // seconds per beat
    L.say(song.name);
    const btn = document.getElementById("pianoSong");
    if (btn) btn.classList.add("playing");

    let t = 500; // leading delay so the song name can finish
    song.notes.forEach(({ w, d }) => {
      const dur = d * beat;
      const key = whiteEls[w];
      const freq = WHITE[w].freq;
      songTimeouts.push(setTimeout(() => {
        playNote(freq, Math.min(dur + 0.1, 0.8));
        flash(key);
      }, t));
      t += dur * 1000;
    });
    songTimeouts.push(setTimeout(stopSong, t + 200));
  }

  function start() {
    build();
    const songBtn = document.getElementById("pianoSong");
    L.onTap(songBtn, () => {
      if (songBtn.classList.contains("playing")) stopSong();
      else playSong();
    });
    L.say("Piano time!");
  }

  function stop() {
    stopSong();
  }

  L.games.piano = { screen: "pianoGame", start, stop };
})();
