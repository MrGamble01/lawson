// ---------- Music Studio ----------
// A tactile instrument sandbox with three sections that share one
// screen — a drum kit (kick, snare, hi-hat, cymbal, tom), an
// 8-note rainbow xylophone, and a row of jingle bells. Tap anything
// to play. Each instrument animates as it sounds: drum heads dent,
// xylophone bars wiggle, bells swing. A "🎵 Play song" button
// auto-plays a familiar tune (Twinkle / Itsy Bitsy / Old MacDonald)
// with the matching bars lighting up so the kid can follow along.
(function () {
  const L = window.Lawson;

  // ====================================================================
  //  Catalog
  // ====================================================================
  // Drum kit — each pad triggers a noise burst at a specific freq.
  const DRUMS = [
    { id: "kick",  emoji: "🥁",  freq: 90,   dur: 0.18, type: "sine",   say: "Boom!" },
    { id: "snare", emoji: "🥁",  freq: 220,  dur: 0.10, type: "square", say: "Crack!" },
    { id: "hat",   emoji: "🎩",  freq: 880,  dur: 0.05, type: "triangle", say: "Tss!" },
    { id: "tom",   emoji: "🪘",  freq: 150,  dur: 0.16, type: "sine",   say: "Bom!" },
    { id: "cymb",  emoji: "🎶",  freq: 1400, dur: 0.30, type: "sawtooth", say: "Crash!" },
  ];

  // Xylophone — C-D-E-F-G-A-B-C', rainbow keys (like the piano).
  const XYLO = [
    { note: "C", freq: 261.63, color: "#fa5252" },
    { note: "D", freq: 293.66, color: "#fd7e14" },
    { note: "E", freq: 329.63, color: "#ffd43b" },
    { note: "F", freq: 349.23, color: "#51cf66" },
    { note: "G", freq: 392.00, color: "#339af0" },
    { note: "A", freq: 440.00, color: "#5c7cfa" },
    { note: "B", freq: 493.88, color: "#9775fa" },
    { note: "C2", freq: 523.25, color: "#e64980" },
  ];

  // Bells — three jingle bells, slightly different pitches.
  const BELLS = [
    { freq: 880,  color: "#ffd43b", say: "Ding!" },
    { freq: 1100, color: "#fab005", say: "Ding!" },
    { freq: 1320, color: "#f76707", say: "Dong!" },
  ];

  // Songs the Play button can run on the xylophone.
  const SONGS = [
    { name: "Twinkle Twinkle",  notes: [0,0,4,4,5,5,4,3,3,2,2,1,1,0,4,4,3,3,2,2,1,4,4,3,3,2,2,1,0,0,4,4,5,5,4,3,3,2,2,1,1,0], bpm: 130 },
    { name: "Itsy Bitsy Spider", notes: [0,0,0,1,2,2,1,0,1,2,2,0,2,2,3,4,4,3,2,3,4,4,2,4,4,5,7,5,4,2,0,0,0,1,2,2,1,0,1,2,2,0], bpm: 130 },
    { name: "Mary Had a Little Lamb", notes: [2,1,0,1,2,2,2,1,1,1,2,4,4,2,1,0,1,2,2,2,2,1,1,2,1,0], bpm: 140 },
    { name: "Old MacDonald",    notes: [0,0,0,4,5,5,4,2,2,1,1,0,0,0,0,4,5,5,4,2,2,1,1,0], bpm: 140 },
  ];

  // ====================================================================
  //  State
  // ====================================================================
  let songIdx = 0;
  let songTimers = [];
  let beatTotal = 0;
  let bestAtStart = 0;
  let celebrated = false;
  let timers = [];

  function setT(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }
  function $(id) { return document.getElementById(id); }

  // ====================================================================
  //  Build
  // ====================================================================
  function build() {
    const stage = $("musicStage");
    stage.innerHTML = `
      <div class="music-row music-row--drums">
        <div class="music-row-label">🥁 Drums</div>
        <div id="musicDrums" class="music-drums"></div>
      </div>
      <div class="music-row music-row--xylo">
        <div class="music-row-label">🎶 Xylophone</div>
        <div id="musicXylo" class="music-xylo"></div>
      </div>
      <div class="music-row music-row--bells">
        <div class="music-row-label">🔔 Bells</div>
        <div id="musicBells" class="music-bells"></div>
      </div>
      <button id="musicSong" class="music-song-btn">🎵 Song</button>`;
    buildDrums();
    buildXylo();
    buildBells();
    setupSongBtn();
  }

  function buildDrums() {
    const cont = $("musicDrums");
    cont.innerHTML = "";
    DRUMS.forEach((d) => {
      const pad = document.createElement("button");
      pad.className = `music-drum music-drum--${d.id}`;
      pad.dataset.drum = d.id;
      pad.setAttribute("aria-label", d.id);
      pad.innerHTML = `<span class="music-drum-emoji">${d.emoji}</span>`;
      cont.appendChild(pad);
      L.onTap(pad, () => playDrum(d, pad));
    });
  }

  function playDrum(d, pad) {
    L.beep(d.freq, d.dur, d.type);
    if (d.id === "snare" || d.id === "cymb") {
      L.beep(d.freq * 1.7, d.dur * 0.6, "sawtooth", 0.01);
    }
    L.haptic(d.id === "kick" ? 12 : 6);
    L.say(d.say);
    pad.classList.remove("hit");
    void pad.offsetWidth;
    pad.classList.add("hit");
    bumpBeat();
  }

  function buildXylo() {
    const cont = $("musicXylo");
    cont.innerHTML = "";
    XYLO.forEach((k, i) => {
      const bar = document.createElement("button");
      bar.className = "music-xylo-bar";
      bar.dataset.xidx = String(i);
      bar.style.background = k.color;
      bar.style.height = (88 - i * 4) + "%";
      bar.textContent = k.note;
      cont.appendChild(bar);
      L.onTap(bar, () => playXylo(i));
    });
  }

  function playXylo(i) {
    const k = XYLO[i];
    if (!k) return;
    L.beep(k.freq, 0.32, "sine");
    L.beep(k.freq * 2, 0.18, "triangle", 0.01);
    L.haptic(5);
    const bar = document.querySelector(`.music-xylo-bar[data-xidx="${i}"]`);
    if (bar) {
      bar.classList.remove("hit");
      void bar.offsetWidth;
      bar.classList.add("hit");
    }
    bumpBeat();
  }

  function buildBells() {
    const cont = $("musicBells");
    cont.innerHTML = "";
    BELLS.forEach((b, i) => {
      const btn = document.createElement("button");
      btn.className = "music-bell";
      btn.style.background = b.color;
      btn.textContent = "🔔";
      btn.setAttribute("aria-label", `Bell ${i + 1}`);
      cont.appendChild(btn);
      L.onTap(btn, () => playBell(b, btn));
    });
  }

  function playBell(b, btn) {
    L.beep(b.freq, 0.32, "sine");
    L.beep(b.freq * 1.5, 0.22, "triangle", 0.05);
    L.haptic(7);
    L.say(b.say);
    btn.classList.remove("ringing");
    void btn.offsetWidth;
    btn.classList.add("ringing");
    bumpBeat();
  }

  function bumpBeat() {
    beatTotal += 1;
    L.bumpBadge("musicScoreVal", beatTotal);
    if (beatTotal > bestAtStart && !celebrated) {
      celebrated = true;
      setTimeout(() => L.celebrateNewHigh(beatTotal), 700);
    }
    L.bumpHighScore("musicBest", beatTotal);
    refreshBestBadge();
    if (beatTotal >= 1)  L.earnSticker && L.earnSticker("musicStarter");
    if (beatTotal >= 25) L.earnSticker && L.earnSticker("musicPlayer");
  }

  function refreshBestBadge() {
    const bestEl = $("musicBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("musicBest");
  }

  // ====================================================================
  //  Song play — auto-plays a tune on the xylophone with note lights.
  // ====================================================================
  function setupSongBtn() {
    const btn = $("musicSong");
    L.onTapOnce(btn, () => {
      if (btn.classList.contains("playing")) {
        stopSong();
      } else {
        playSong();
      }
    });
  }

  function playSong() {
    stopSong();
    const song = SONGS[songIdx % SONGS.length];
    songIdx += 1;
    const btn = $("musicSong");
    if (btn) btn.classList.add("playing");
    L.say(song.name);
    const beat = 60 / song.bpm;
    let t = 400;
    song.notes.forEach((n, i) => {
      songTimers.push(setTimeout(() => {
        playXylo(n);
      }, t));
      t += beat * 1000;
    });
    songTimers.push(setTimeout(stopSong, t + 200));
  }

  function stopSong() {
    songTimers.forEach(clearTimeout);
    songTimers = [];
    const btn = $("musicSong");
    if (btn) btn.classList.remove("playing");
  }

  // ====================================================================
  //  Lifecycle
  // ====================================================================
  function start() {
    beatTotal = 0;
    celebrated = false;
    bestAtStart = L.getHighScore("musicBest");
    clearAll();
    build();
    L.bumpBadge("musicScoreVal", 0);
    refreshBestBadge();
    L.say("Music studio! Tap to play!");
  }

  function stop() {
    stopSong();
    clearAll();
  }

  L.games.music = { screen: "musicGame", start, stop };
})();
