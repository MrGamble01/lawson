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
