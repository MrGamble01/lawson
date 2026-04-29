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
