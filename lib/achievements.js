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
  // Spell
  { id: "speller",      emoji: "🔡", title: "Speller",        desc: "Spell 5 words!" },
  // Read
  { id: "reader",       emoji: "📚", title: "Reader",         desc: "Read 5 words in a row!" },
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
  // Add It Up
  { id: "mathWiz",      emoji: "➕", title: "Math Wiz",       desc: "Add 8 in a row!" },
  // Body Parts
  { id: "bodyPro",      emoji: "👃", title: "Body Pro",       desc: "Find 8 body parts in a row!" },
  // Piano
  { id: "pianoSong",    emoji: "🎹", title: "Pianist",        desc: "Listen to a song!" },
  // Doodle
  { id: "doodleClear",  emoji: "🎨", title: "Clean Slate",    desc: "Clear the doodle pad!" },
  { id: "doodleSave",   emoji: "💾", title: "Art Collector",  desc: "Save a doodle!" },
  // Coloring
  { id: "color10",      emoji: "🖍️", title: "Colorist",       desc: "Fill 10 spots!" },
  // Cross-cutting
  { id: "firstHigh",    emoji: "🏆", title: "Record Breaker", desc: "Set a new high score!" },
];
const STICKER_BY_ID = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

function _loadEarned() {
  try {
    const raw = localStorage.getItem("lawson:stickers");
    return raw ? new Set(JSON.parse(raw)) : new Set();
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
  return true;
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
  toast.innerHTML = `
    <div class="sticker-toast-emoji">${s.emoji}</div>
    <div class="sticker-toast-text">
      <div class="sticker-toast-title">🌟 ${s.title}</div>
      <div class="sticker-toast-desc">${s.desc}</div>
    </div>`;
  host.appendChild(toast);
  // Speak the unlock so the kid hears why something just appeared.
  try { if (typeof say === "function") say(`Sticker! ${s.title}!`, 1.05); } catch (_) {}
  try { if (typeof beep === "function") beep(660, 0.12, "triangle"); } catch (_) {}
  setTimeout(() => toast.classList.add("show"), 20);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}
