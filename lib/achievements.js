// ---------- Achievements / sticker collection ----------
// One unlockable sticker per "moment" worth celebrating. Each game calls
// L.earnSticker("id") at the relevant trigger; this lib persists the
// earned set, fires a top-corner toast on first unlock, and exposes a
// list/predicate for the Stickers screen to render the collection.
const STICKERS = [
  // Pop
  { id: "popStreak10",  emoji: "🎈", title: "Pop Master",     desc: "Pop 10 in a row!" },
  { id: "popRainbow",   emoji: "🌈", title: "Rainbow Pop",    desc: "Pop a rainbow balloon!" },
  // Whack
  { id: "whack20",      emoji: "🔨", title: "Whack Champ",    desc: "Whack score of 20!" },
  { id: "whackGold",    emoji: "✨", title: "Gold Whack",     desc: "Whack a golden critter!" },
  // Match
  { id: "match10",      emoji: "🧩", title: "Match Streak",   desc: "Match 10 in a row!" },
  // Memory
  { id: "memory3",      emoji: "🃏", title: "Memory Pro",     desc: "Clear 3 memory boards!" },
  // Count
  { id: "count25",      emoji: "🔢", title: "Big Counter",    desc: "Count 25 things!" },
  // Dots
  { id: "dots3",        emoji: "🔗", title: "Dot Wizard",     desc: "Connect 3 puzzles!" },
  // Listen
  { id: "listen10",     emoji: "👂", title: "Good Listener",  desc: "Hear and find 10 in a row!" },
  // Pattern
  { id: "patternPro",   emoji: "🧠", title: "Pattern Pro",    desc: "Solve 10 patterns in a row!" },
  // Find It!
  { id: "finder",       emoji: "🔍", title: "Finder",         desc: "Find 20 hidden things!" },
  // Story
  { id: "storyteller",  emoji: "📖", title: "Storyteller",    desc: "Listen to a whole story!" },
  // How Many?
  { id: "mathStar",     emoji: "🌠", title: "Math Star",      desc: "Get 10 counts right in a row!" },
  // Color Mix
  { id: "mixer",        emoji: "🎨", title: "Color Mixer",    desc: "Make 5 colors in a row!" },
  // Piano
  { id: "pianoSong",    emoji: "🎹", title: "Pianist",        desc: "Listen to a song!" },
  // Doodle
  { id: "doodleClear",  emoji: "🎨", title: "Clean Slate",    desc: "Clear the doodle pad!" },
  { id: "doodleSave",   emoji: "💾", title: "Art Collector",  desc: "Save a doodle!" },
  // Coloring
  { id: "color10",      emoji: "🖍️", title: "Colorist",       desc: "Fill 10 spots!" },
  // Garden
  { id: "gardenStarter", emoji: "🌱", title: "Green Thumb",   desc: "Harvest your first fruit!" },
  { id: "gardener",      emoji: "🌻", title: "Gardener",      desc: "Harvest 10 fruits!" },
  { id: "rainmaker",     emoji: "🌧️", title: "Rain Watcher",  desc: "Catch a rain shower!" },
  { id: "farmHand",      emoji: "🥕", title: "Farm Hand",     desc: "Pick 5 different fruits!" },
  // Sticker Scene
  { id: "sceneArtist",   emoji: "🖼️", title: "Scene Artist",  desc: "Place your first sticker!" },
  { id: "sceneMaker",    emoji: "🎨", title: "Scene Maker",   desc: "Decorate a whole scene!" },
  // Farm
  { id: "farmStarter",   emoji: "🏡", title: "Farm Friend",   desc: "Care for your first animal!" },
  { id: "farmFriend",    emoji: "🐄", title: "Animal Friend", desc: "Care for 20 animals!" },
  { id: "farmMaster",    emoji: "🚜", title: "Farm Master",   desc: "Care for 50 animals!" },
  // Ice Cream
  { id: "sundaeStarter", emoji: "🍦", title: "Sundae Maker",  desc: "Eat your first sundae!" },
  { id: "sundaeMaker",   emoji: "🍨", title: "Ice Cream Pro", desc: "Eat 5 sundaes!" },
  // Train
  { id: "trainEngineer",  emoji: "🚂", title: "Train Engineer", desc: "Reach your first station!" },
  { id: "trainConductor", emoji: "🚉", title: "Conductor",      desc: "Reach 10 stations!" },
  // Music
  { id: "musicStarter",   emoji: "🎵", title: "Music Maker",    desc: "Play your first note!" },
  { id: "musicPlayer",    emoji: "🎶", title: "Little Musician",desc: "Play 25 notes!" },
  // Cross-cutting
  { id: "firstHigh",    emoji: "🏆", title: "Record Breaker", desc: "Set a new high score!" },
];
const STICKER_BY_ID = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

function _loadEarned() {
  try {
    const raw = localStorage.getItem("lawson:stickers");
    const arr = raw ? JSON.parse(raw) : [];
    // Filter to known stickers — if a game was removed (e.g., Drums)
    // we don't want its sticker to keep counting against the total or
    // to inflate the progress bar past 100%.
    return new Set(arr.filter((id) => STICKER_BY_ID[id]));
  } catch (_) { return new Set(); }
}
function _saveEarned(set) {
  try { localStorage.setItem("lawson:stickers", JSON.stringify([...set])); } catch (_) {}
}

function listStickers() { return STICKERS.slice(); }
function isStickerEarned(id) { return _loadEarned().has(id); }
function resetStickers() {
  try { localStorage.removeItem("lawson:stickers"); } catch (_) {}
}

// Returns true the first time this sticker is earned (so the caller can
// avoid speaking the cheer twice). No-ops on later calls.
function earnSticker(id) {
  const sticker = STICKER_BY_ID[id];
  if (!sticker) return false;
  const earned = _loadEarned();
  if (earned.has(id)) return false;
  earned.add(id);
  _saveEarned(earned);
  _showStickerToast(sticker);
  _updateStickerTileCount();
  // If this was the LAST sticker, fire a victory-lap celebration on top
  // of the regular toast.
  if (earned.size === STICKERS.length) {
    setTimeout(_allStickersCelebration, 800);
  }
  return true;
}

// Update the small "5/24" counter on the home-screen Stickers tile.
// Animate-on-change so the kid sees the bump after earning a sticker.
function _updateStickerTileCount() {
  const el = document.getElementById("stickerTileCount");
  if (!el) return;
  const earned = _loadEarned();
  const newText = `${earned.size}/${STICKERS.length}`;
  const oldText = el.textContent;
  el.textContent = newText;
  // "0/0" is the static HTML default before this function ever ran,
  // so the very first update isn't really a change worth celebrating.
  if (oldText !== "0/0" && oldText !== newText) {
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }
}
// First render on script load (DOM should be ready since scripts are at
// the bottom of the body).
if (typeof document !== "undefined" && document.readyState !== "loading") {
  _updateStickerTileCount();
} else if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", _updateStickerTileCount);
}

function _allStickersCelebration() {
  const overlay = document.createElement("div");
  overlay.className = "all-stickers-overlay";
  overlay.setAttribute("aria-hidden", "true"); // announced via say()
  overlay.innerHTML = `
    <div class="all-stickers-trophy">🏆</div>
    <div class="all-stickers-title">All stickers!</div>
    <div class="all-stickers-sub">You found them all!</div>
  `;
  document.body.appendChild(overlay);
  try { if (typeof say === "function") say(`All stickers! Amazing! You did it!`); } catch (_) {}
  try { if (typeof happySound === "function") happySound(); } catch (_) {}
  // Two waves of confetti for an enormous finale.
  try {
    if (typeof confettiRain === "function") {
      confettiRain(60);
      setTimeout(() => confettiRain(40), 1200);
    }
  } catch (_) {}
  setTimeout(() => overlay.remove(), 5000);
}

// Slide-in toast that does NOT block input. Stacks in the corner if
// several stickers fire in quick succession.
function _showStickerToast(s) {
  const host = document.getElementById("stickerToasts") || (function () {
    const d = document.createElement("div");
    d.id = "stickerToasts";
    d.className = "sticker-toasts";
    document.body.appendChild(d);
    return d;
  })();
  const toast = document.createElement("div");
  toast.className = "sticker-toast";
  toast.setAttribute("role", "status");
  toast.innerHTML = `
    <div class="sticker-toast-emoji">${s.emoji}</div>
    <div class="sticker-toast-text">
      <div class="sticker-toast-title">🌟 ${s.title}</div>
      <div class="sticker-toast-desc">${s.desc}</div>
    </div>`;
  host.appendChild(toast);
  // Distinct ascending arpeggio (C5–E5–G5–C6) — reads as "unlock!"
  // not "correct answer". Falls back to a single beep if the jingle
  // helper isn't available for any reason. Played first: say() starts
  // the announcement as the jingle rings out rather than under it.
  try {
    if (typeof stickerJingle === "function") stickerJingle();
    else if (typeof beep === "function") beep(660, 0.12, "triangle");
  } catch (_) {}
  // Speak the unlock so the kid hears why something just appeared.
  try { if (typeof say === "function") say(`Sticker! ${s.title}!`, 1.05); } catch (_) {}
  // Small confetti burst — 12 pieces so it's celebratory but doesn't
  // overwhelm the toast itself. The all-stickers finale still throws
  // 60+40 in waves.
  try { if (typeof confettiRain === "function") confettiRain(12); } catch (_) {}
  setTimeout(() => toast.classList.add("show"), 20);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}
