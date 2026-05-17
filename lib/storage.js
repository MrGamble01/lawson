// ---------- High-score persistence ----------
// Thin wrapper around localStorage that returns 0 if the storage API is
// unavailable (private mode, quota errors, etc.).
const STORAGE_PREFIX = "lawson:";

function getHighScore(key) {
  try {
    const v = localStorage.getItem(STORAGE_PREFIX + key);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch (_) {
    return 0;
  }
}

function setHighScore(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, String(value));
  } catch (_) {}
}

// Update only if `value` exceeds the current high score. Returns the new
// high score (whether it bumped or not), so callers can show it directly.
function bumpHighScore(key, value) {
  const current = getHighScore(key);
  if (value > current) {
    setHighScore(key, value);
    return value;
  }
  return current;
}

// Like bumpHighScore, but invokes `onNew(value, prev)` only when a new
// personal best is set. Lets games trigger extra fanfare for new highs
// without having to compute the delta themselves.
function tryNewHighScore(key, value, onNew) {
  const prev = getHighScore(key);
  if (value > prev) {
    setHighScore(key, value);
    if (typeof onNew === "function") onNew(value, prev);
    return value;
  }
  return prev;
}

// Clear every high score we've ever stored. Used by the Settings panel.
function resetAllHighScores() {
  try {
    const removeKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) removeKeys.push(k);
    }
    removeKeys.forEach((k) => localStorage.removeItem(k));
  } catch (_) {}
}
