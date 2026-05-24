// ---------- Stickers (collection viewer) ----------
// Read-only grid showing every available sticker. Earned ones are full
// color; locked ones are grayscale silhouettes with a "?". Tapping any
// sticker speaks its title + description so a pre-reader can hear what
// they're working toward.
(function () {
  const L = window.Lawson;

  function build() {
    const grid = document.getElementById("stickerGrid");
    const counter = document.getElementById("stickerCount");
    if (!grid) return;
    grid.innerHTML = "";

    const all = L.listStickers ? L.listStickers() : [];
    let earned = 0;

    // Empty-state banner shown before any sticker has been earned.
    // Bobo himself hosts the empty book — gives the screen a host
    // instead of a generic gift emoji.
    if (!all.some((s) => L.isStickerEarned && L.isStickerEarned(s.id))) {
      const empty = document.createElement("div");
      empty.className = "sticker-empty";
      empty.innerHTML = `
        <div class="sticker-empty-icon">
          <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <radialGradient id="emptybobo" cx="38%" cy="38%" r="60%">
                <stop offset="0%" stop-color="#ffd6e7"/>
                <stop offset="60%" stop-color="#ff8ab0"/>
                <stop offset="100%" stop-color="#e64980"/>
              </radialGradient>
            </defs>
            <ellipse cx="50" cy="55" rx="42" ry="50" fill="url(#emptybobo)"/>
            <ellipse cx="36" cy="38" rx="10" ry="16" fill="#fff" opacity="0.55"/>
            <circle cx="40" cy="55" r="4" fill="#3a1f5a"/>
            <circle cx="60" cy="55" r="4" fill="#3a1f5a"/>
            <path d="M40 70 Q 50 80 60 70" stroke="#3a1f5a" stroke-width="2.8" fill="none" stroke-linecap="round"/>
            <polygon points="46,104 54,104 50,112" fill="#e64980"/>
            <path d="M50 112 Q 56 124 48 134 Q 42 140 50 140" stroke="#5a3030" stroke-width="2" fill="none" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="sticker-empty-title">Let's find some stickers!</div>
        <div class="sticker-empty-sub">Play any game and Bobo will pop one in for you.</div>`;
      grid.appendChild(empty);
    }

    all.forEach((s) => {
      const has = L.isStickerEarned && L.isStickerEarned(s.id);
      if (has) earned += 1;
      const card = document.createElement("button");
      card.className = "sticker-card" + (has ? " earned" : " locked");
      card.innerHTML = `
        <div class="sticker-card-emoji">${has ? s.emoji : "❓"}</div>
        <div class="sticker-card-title">${has ? s.title : "???"}</div>`;
      L.onTap(card, () => {
        if (has) {
          L.happySound();
          L.say(`${s.title}. ${s.desc}`);
        } else {
          L.beep(400, 0.08, "sine");
          L.say("Locked! Keep playing to find this one.");
        }
      });
      grid.appendChild(card);
    });

    if (counter) counter.textContent = `${earned} / ${all.length}`;
    const bar = document.getElementById("stickerProgress");
    if (bar) {
      const pct = all.length ? Math.round((earned / all.length) * 100) : 0;
      bar.style.width = pct + "%";
    }
  }

  function start() {
    build();
    const all = L.listStickers ? L.listStickers() : [];
    let earned = 0;
    all.forEach((s) => { if (L.isStickerEarned && L.isStickerEarned(s.id)) earned += 1; });
    if (earned === 0) {
      L.say("Your sticker book! Play games to find them all.");
    } else {
      L.say(`You have ${earned} stickers. Keep playing!`);
    }
  }
  function stop() {}
  L.games.stickers = { screen: "stickersGame", start, stop };
})();
