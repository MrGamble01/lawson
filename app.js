// ---------- Kid personalization ----------
// Used in cheers and milestone celebrations across games. Editable from
// the Settings panel and persisted in localStorage so a sibling can take
// over with no code changes.
const DEFAULT_KID_NAME = "Lawson";
let KID_NAME = (function () {
  try {
    const stored = localStorage.getItem("lawson:kidName");
    return (stored && stored.trim()) || DEFAULT_KID_NAME;
  } catch (_) { return DEFAULT_KID_NAME; }
})();
// Apply the saved "sounds like" form to the name we just loaded.
if (typeof setSpokenName === "function") setSpokenName(KID_NAME, getSpokenName());

function setKidName(name) {
  KID_NAME = (name && name.trim()) || DEFAULT_KID_NAME;
  try { localStorage.setItem("lawson:kidName", KID_NAME); } catch (_) {}
  if (window.Lawson) window.Lawson.KID_NAME = KID_NAME;
  // The storyteller's spoken form of the name applies to whatever the
  // name is now (audio.js only knows the name through this call).
  if (typeof setSpokenName === "function") setSpokenName(KID_NAME, getSpokenName());
  // Live-update branding (splash is gone by now, but header + tab title
  // reflect the new name without a reload).
  const header = document.querySelector("header h1");
  if (header) header.textContent = `${KID_NAME}'s Playground`;
  document.title = `${KID_NAME}'s Playground`;
}

// Dark mode: a `dark` class on <html> swaps the background gradients
// to deeper colors. Persisted so it sticks between sessions.
function setDarkMode(on) {
  try { localStorage.setItem("lawson:dark", on ? "1" : "0"); } catch (_) {}
  document.documentElement.classList.toggle("dark", !!on);
}
function isDarkMode() {
  try { return localStorage.getItem("lawson:dark") === "1"; } catch (_) { return false; }
}
// Apply saved dark-mode preference as early as possible.
setDarkMode(isDarkMode());

// Captions: everything the storyteller says is mirrored into #captions,
// a polite live region. Screen readers always get it; the Captions
// setting decides whether it's also drawn on screen (for kids who are
// hard of hearing, or when the voice is muted).
function setCaptionsEnabled(on) {
  try { localStorage.setItem("lawson:captions", on ? "1" : "0"); } catch (_) {}
  document.body.classList.toggle("captions-on", !!on);
}
function isCaptionsEnabled() {
  try { return localStorage.getItem("lawson:captions") === "1"; } catch (_) { return false; }
}
setCaptionsEnabled(isCaptionsEnabled());
(function setupCaptions() {
  let hideT = null;
  // The caption is sized to the header strip, whose height depends on the
  // title's fluid font size — measure it rather than guess.
  const syncHeaderHeight = () => {
    const header = document.querySelector("header");
    if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", syncHeaderHeight);
  else syncHeaderHeight();
  window.addEventListener("resize", syncHeaderHeight);
  window.addEventListener("lawson:say", (e) => {
    const el = document.getElementById("captions");
    const text = e.detail && e.detail.text;
    if (!el || !text) return;
    el.textContent = text;
    el.classList.add("show");
    // The caption is drawn over the header title (the one spot every
    // screen keeps free of game controls); this class fades the title.
    document.body.classList.add("caption-showing");
    clearTimeout(hideT);
    // Linger long enough to be read: ~1/3 s per word, 2–6 s overall.
    const words = String(text).split(/\s+/).filter(Boolean).length;
    hideT = setTimeout(() => {
      el.classList.remove("show");
      document.body.classList.remove("caption-showing");
    }, Math.min(6000, Math.max(2000, 1000 + words * 320)));
  });
})();

// Comfort settings (parent-facing, in Settings):
// - "Take it slow" runs every timed game at half speed — Whack! critters
//   stay up twice as long and pop half as often, Pop! balloons drift
//   twice as slowly, hints linger — for kids who need more time to aim
//   (WCAG 2.2.1 Timing Adjustable).
// - "Less motion" applies the reduced-motion treatment without touching
//   the OS setting (WCAG 2.2.2 / 2.3.3): CSS animations collapse and the
//   sparkle / confetti bursts are skipped.
const SLOW_SCALE = 2;
function setSlowPace(on) {
  try { localStorage.setItem("lawson:slow", on ? "1" : "0"); } catch (_) {}
  document.documentElement.classList.toggle("slow-pace", !!on);
}
function isSlowPace() {
  try { return localStorage.getItem("lawson:slow") === "1"; } catch (_) { return false; }
}
// Multiply any gameplay duration by this.
function paceScale() { return isSlowPace() ? SLOW_SCALE : 1; }
function setLessMotion(on) {
  try { localStorage.setItem("lawson:lessMotion", on ? "1" : "0"); } catch (_) {}
  document.documentElement.classList.toggle("reduce-motion", !!on);
}
function isLessMotion() {
  try { return localStorage.getItem("lawson:lessMotion") === "1"; } catch (_) { return false; }
}
setSlowPace(isSlowPace());
setLessMotion(isLessMotion());

// Reduced motion (OS preference or the in-app toggle): the CSS collapses
// animations; JS-driven particle bursts (sparkles, confetti) are skipped
// entirely so they don't strobe for a frame.
function prefersReducedMotion() {
  if (isLessMotion()) return true;
  try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  catch (_) { return false; }
}

// Personalize branding with the saved kid name. Default-named runs are
// unchanged (still "Lawson's"). Once a parent sets a different name in
// Settings, the splash, header, and tab title all reflect it on the
// next launch.
(function personalize() {
  function apply() {
    const title = document.querySelector(".splash-title");
    if (title) title.textContent = `${KID_NAME}'s Playground`;
    const header = document.querySelector("header h1");
    if (header) header.textContent = `${KID_NAME}'s Playground`;
    document.title = `${KID_NAME}'s Playground`;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();

// First-run check — used after splash to decide whether to auto-open
// the Settings panel for a quick name capture.
function isFirstRun() {
  try { return !localStorage.getItem("lawson:kidName"); } catch (_) { return false; }
}

// Dismiss the splash screen after a short beat. Long enough that the
// brand registers, short enough that a toddler doesn't get bored.
(function dismissSplash() {
  const start = performance.now();
  const MIN_VISIBLE = 1100; // ms
  function hide() {
    const splash = document.getElementById("splash");
    if (!splash) return;
    splash.classList.add("hide");
    setTimeout(() => {
      splash.remove();
      // First visit? Pop the settings panel so a parent can set the
      // kid's name. We use the existing UI rather than a one-shot
      // dialog — fewer special cases, same outcome.
      if (isFirstRun() && typeof window.__openSettings === "function") {
        setTimeout(() => window.__openSettings({ onboarding: true }), 300);
      }
    }, 600);
  }
  function dismissNow() {
    const remaining = Math.max(0, MIN_VISIBLE - (performance.now() - start));
    setTimeout(hide, remaining);
  }
  // Tap-to-skip after a short cushion so the toddler doesn't blast past
  // it before the brand registers.
  setTimeout(() => {
    document.getElementById("splash")
      ?.addEventListener("touchstart", dismissNow, { passive: true });
    document.getElementById("splash")
      ?.addEventListener("click", dismissNow);
  }, 400);
  // Auto-dismiss on a timer regardless of taps.
  setTimeout(dismissNow, MIN_VISIBLE);
})();

const CHEER_PHRASES = [
  "Yay {name}!",
  "Way to go {name}!",
  "Awesome {name}!",
  "You got it {name}!",
  "Super {name}!",
  "Great job {name}!",
  "Wow {name}!",
  "Nice one {name}!",
];
function cheer() {
  return CHEER_PHRASES[Math.floor(Math.random() * CHEER_PHRASES.length)]
    .replace("{name}", KID_NAME);
}

// Fisher-Yates shuffle (returns a new array, leaves the input alone).
function shuffled(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------- Screens ----------
const screens = document.querySelectorAll(".screen");
// Every screen is a labelled region that can take programmatic focus, so
// switching screens moves keyboard / screen-reader focus with it instead
// of leaving it on a tile that just disappeared.
function stripLeadingEmoji(s) {
  return String(s || "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
}
screens.forEach((s) => {
  if (!s.hasAttribute("tabindex")) s.setAttribute("tabindex", "-1");
  if (s.hasAttribute("aria-label")) return;
  const heading = s.querySelector(".hub-title");
  const label = stripLeadingEmoji(s.dataset.title || (heading && heading.textContent));
  if (label) s.setAttribute("aria-label", label);
});
let _shownScreen = "menu";
let _lastNavTrigger = null; // the tile that opened the current game/hub
function focusScreen(target) {
  if (!target || typeof target.focus !== "function") return;
  if (target.contains(document.activeElement) && document.activeElement !== document.body) return;
  // Going back to the lobby: return focus to the tile that started the
  // trip when it's visible again, so keyboard users land where they left.
  const back = _lastNavTrigger;
  if (back && target.contains(back) && back.offsetParent !== null) {
    try { back.focus({ preventScroll: true }); return; } catch (_) {}
  }
  try { target.focus({ preventScroll: true }); } catch (_) {}
}
function show(id) {
  cancelPromptRepeat(); // a prompt reminder belongs to the screen that asked
  screens.forEach((s) => s.classList.toggle("active", s.id === id));
  // Track lobby-mode (menu + hubs) so the mascot and other ambient
  // chrome can stay visible across the home / hub navigation, but
  // hide on game screens where they'd compete with gameplay.
  const isMenu = id === "menu";
  const isHub = /Hub$/.test(id);
  document.body.classList.toggle("on-menu", isMenu);
  document.body.classList.toggle("on-hub", isHub);
  document.body.classList.toggle("on-lobby", isMenu || isHub);
  // Brief title card on screens that opt in via data-title. Makes
  // each game feel like its own destination instead of a hard cut.
  const target = document.getElementById(id);
  const title = target && target.dataset && target.dataset.title;
  if (title) showGameBanner(title);
  // Let loosely-coupled features (tutorial hints, captions) react to the
  // navigation without wrapping this function.
  if (typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent("lawson:screen", { detail: { id, changed: id !== _shownScreen } }));
  }
  if (id !== _shownScreen) {
    _shownScreen = id;
    focusScreen(target);
  }
  // Music plays only on the menu so the gameplay sound design stays
  // clean. Cheap to start/stop — it's just a Web Audio interval.
  if (isMenu && isMusicEnabled()) startMusic();
  else stopMusic();
}
document.body.classList.add("on-menu");
document.body.classList.add("on-lobby");

function showGameBanner(text) {
  const existing = document.querySelector(".game-banner");
  if (existing) existing.remove();
  const b = document.createElement("div");
  b.className = "game-banner";
  b.setAttribute("aria-hidden", "true"); // the screen itself carries the name
  b.textContent = text;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1000);
}

// ---------- Helpers ----------
// Sparkle burst: scatter glyphs in a circle around (x, y) with varied
// size, distance, and rotation so each celebration feels organic rather
// than a perfect ring.
function sparkleAt(x, y) {
  if (prefersReducedMotion()) return;
  const emojis = ["✨", "⭐", "🎉", "💖", "🌟", "💫", "🎊"];
  const count = 10;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "sparkle";
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.left = x + "px";
    s.style.top = y + "px";
    // Even angular distribution + small random jitter so the burst
    // isn't a rigid clock face.
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = 90 + Math.random() * 60;
    const scale = 0.7 + Math.random() * 1.2;
    const rot = (Math.random() - 0.5) * 120;
    s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    s.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    s.style.setProperty("--scale", scale);
    s.style.setProperty("--rot", rot + "deg");
    s.style.fontSize = (28 + scale * 14) + "px";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1100);
  }
}

// Turn any CSS color into a usable hex for mixing. Only the common
// hsl(...) / hex strings that we actually produce in this app.
function cssColorToRgb(color) {
  if (!color) return [77, 171, 247];
  const m = color.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const h = color.match(/hsl\(\s*([\d.]+),?\s*([\d.]+)%,?\s*([\d.]+)%/);
  if (h) return hslToRgb(+h[1], +h[2] / 100, +h[3] / 100);
  return [77, 171, 247];
}
function hslToRgb(h, s, l) {
  h /= 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function showBigDisplay(text, color = "#4dabf7", caption = "") {
  const d = document.getElementById("bigDisplay");
  const [r, g, b] = cssColorToRgb(color);
  // Radial gradient: vivid color in center, darker at edges so white text pops
  d.style.background = `radial-gradient(circle at center, rgba(${r},${g},${b},0.95) 0%, rgba(${Math.round(r*0.35)},${Math.round(g*0.35)},${Math.round(b*0.35)},0.95) 100%)`;
  d.innerHTML = "";
  const main = document.createElement("div");
  main.textContent = text;
  d.appendChild(main);
  if (caption) {
    const cap = document.createElement("div");
    cap.className = "big-caption";
    cap.textContent = caption;
    d.appendChild(cap);
  }
  d.classList.remove("show");
  // force reflow so the animation restarts on repeated taps
  void d.offsetWidth;
  d.classList.add("show");
  clearTimeout(showBigDisplay._t);
  showBigDisplay._t = setTimeout(() => d.classList.remove("show"), 650);
}

// Get point from click or touch event
function pointOf(e) {
  if (e.clientX != null) return { x: e.clientX, y: e.clientY };
  const t = e.changedTouches && e.changedTouches[0];
  if (t) return { x: t.clientX, y: t.clientY };
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

// Attach a tap handler that works reliably on iOS (touchend fires first, click fallback)
function onTap(el, fn) {
  let handled = false;
  el.addEventListener("touchend", (e) => {
    e.preventDefault();
    handled = true;
    fn(e);
    setTimeout(() => { handled = false; }, 400);
  }, { passive: false });
  el.addEventListener("click", (e) => {
    if (handled) return;
    fn(e);
  });
  makeTappableAccessible(el);
}

// A plain <div>/<span> that takes taps becomes a real button for keyboards
// and screen readers: role="button" + tabindex="0" (Enter/Space are mapped
// to click() below, and click() runs the tap handler). Games give these
// a name with aria-label. Skipped: elements a game has already given a
// role or tabindex, aria-hidden decorations, and containers that hold
// their own controls (a button inside a button is invalid).
function makeTappableAccessible(el) {
  if (!el || !el.tagName) return;
  if (el.tagName !== "DIV" && el.tagName !== "SPAN") return;
  if (el.hasAttribute("role") || el.hasAttribute("tabindex")) return;
  if (el.getAttribute("aria-hidden") === "true") return;
  if (el.querySelector('button, input, select, a[href], [tabindex]:not([tabindex="-1"]), [role="button"]')) return;
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
}

// Same as onTap but no-ops if this element already has a tap handler
// attached by us. Use for FIXED DOM elements (tool buttons, etc.) whose
// game's start() runs every time the user re-enters — without this guard
// each visit doubles the listener count.
function onTapOnce(el, fn) {
  if (!el || el.__lawsonTap) return;
  el.__lawsonTap = true;
  onTap(el, fn);
}

// Score / best badges are tappable, so they are exposed as buttons whose
// name carries the current value ("Score 7", "Best 12"). A MutationObserver
// keeps the name in sync however a game updates the number.
function badgeKind(badge) {
  if (badge.classList.contains("badge--best")) return "Best";
  if (badge.classList.contains("badge--streak")) return "Streak";
  return "Score";
}
function refreshBadgeLabel(badge) {
  const valEl = badge.querySelector("span");
  const v = valEl ? valEl.textContent.trim() : "";
  badge.setAttribute("aria-label", `${badgeKind(badge)} ${v}`.trim());
}
(function setupBadgeA11y() {
  document.querySelectorAll(".badge").forEach((badge) => {
    badge.setAttribute("role", "button");
    badge.setAttribute("tabindex", "0");
    refreshBadgeLabel(badge);
    new MutationObserver(() => refreshBadgeLabel(badge))
      .observe(badge, { childList: true, characterData: true, subtree: true });
  });
})();

// Enter / Space activate anything that only *acts* like a button
// (role="button" on a div), matching what native buttons do for free.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const el = e.target;
  if (!el || !el.matches || !el.matches('[role="button"]:not(button):not(a)')) return;
  e.preventDefault();
  el.click();
});

// ---------- Tap alternative to dragging (WCAG 2.2 §2.5.7) ----------
// Dragging is hard for small hands and impossible with a switch or a
// keyboard, so every tool that is normally dragged can also be *used by
// tapping*: tap the tool to pick it up (it lifts and reads as pressed),
// then tap where you would have dragged it — the tool hops there, does
// its job through the game's own drop handler, and snaps back. Tapping
// the tool again, pressing Escape, or leaving the screen puts it down.
// Enter/Space on the focused tool and then on a target does the same.
let _heldTool = null;
let _heldUse = null;
function tapToUse(tool, opts) {
  const { onUse, hint, canHold } = opts || {};
  if (!tool || tool.__lawsonTapToUse) return;
  tool.__lawsonTapToUse = true;
  tool.setAttribute("aria-pressed", "false");
  let down = null;
  const toggle = () => {
    if (_heldTool === tool) { putDownTool(); return; }
    if (canHold && !canHold()) return;
    pickUpTool(tool, onUse, hint);
  };
  tool.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, t: Date.now() }; });
  tool.addEventListener("pointerup", (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = Date.now() - down.t < 600;
    down = null;
    if (moved > 8 || !quick) return; // that was a drag, handled by the game
    toggle();
  });
  tool.addEventListener("pointercancel", () => { down = null; });
  // Keyboard: Enter/Space produce a click with no pointer events.
  tool.addEventListener("click", (e) => { if (e.detail === 0) toggle(); });
}
function pickUpTool(tool, onUse, hint) {
  putDownTool();
  _heldTool = tool;
  _heldUse = onUse;
  tool.classList.add("held");
  tool.setAttribute("aria-pressed", "true");
  haptic(8);
  beep(660, 0.06, "triangle");
  if (hint) say(hint);
}
function putDownTool() {
  if (!_heldTool) return;
  _heldTool.classList.remove("held");
  _heldTool.setAttribute("aria-pressed", "false");
  _heldTool = null;
  _heldUse = null;
}
function heldTool() { return _heldTool; }
// Swallow the tap that lands on the target, so the target's own tap
// handler (a moo, a "use the watering can!") doesn't fire as well.
function swallowNextTap() {
  let done = false;
  const types = ["touchend", "click", "pointerup"];
  const finish = () => {
    if (done) return;
    done = true;
    types.forEach((t) => document.removeEventListener(t, stop, true));
  };
  // Stop at the tail of *this* tap (its click, or its touchend — whose
  // preventDefault also drops the synthetic click) so the next tap is free.
  const stop = (e) => {
    e.stopPropagation(); e.preventDefault();
    if (e.type === "click" || e.type === "touchend") finish();
  };
  types.forEach((t) => document.addEventListener(t, stop, true));
  setTimeout(finish, 300);
}
// The held tool hops to the point, works, and snaps back to its slot.
function useHeldToolAt(x, y) {
  const tool = _heldTool, use = _heldUse;
  if (!tool || typeof use !== "function") return;
  putDownTool();
  const hop = !prefersReducedMotion();
  if (hop) {
    tool.classList.add("hopping");
    tool.style.position = "fixed";
    tool.style.left = (x - tool.offsetWidth / 2) + "px";
    tool.style.top = (y - tool.offsetHeight / 2) + "px";
    tool.style.right = "auto";
    tool.style.bottom = "auto";
  }
  try { use(x, y); } catch (_) {}
  setTimeout(() => {
    tool.classList.remove("hopping");
    tool.style.position = "";
    tool.style.left = "";
    tool.style.top = "";
    tool.style.right = "";
    tool.style.bottom = "";
  }, hop ? 380 : 0);
}
document.addEventListener("pointerdown", (e) => {
  if (!_heldTool || _heldTool.contains(e.target)) return;
  swallowNextTap();
  useHeldToolAt(e.clientX, e.clientY);
}, true);
document.addEventListener("click", (e) => {
  // Keyboard activation of a target while a tool is held.
  if (!_heldTool || e.detail !== 0 || _heldTool.contains(e.target)) return;
  e.stopPropagation(); e.preventDefault();
  const r = e.target.getBoundingClientRect();
  useHeldToolAt(r.left + r.width / 2, r.top + r.height / 2);
}, true);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") putDownTool(); });
window.addEventListener("lawson:screen", putDownTool);

// Badge bump helper (shared by games)
function bumpBadge(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val;
  const badge = el.closest(".badge");
  if (badge) {
    refreshBadgeLabel(badge);
    badge.classList.remove("bump");
    void badge.offsetWidth;
    badge.classList.add("bump");
  }
}

// ---------- Flashcard activities ----------
// Letters / Numbers / Colors / Shapes / Animals all share the same shape:
// a grid of tappable items that play a sound, speak a phrase, and pop up a
// big visual display when tapped. Each activity just supplies its data and
// a few small functions for label / spoken text / display.
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);
const COLORS = [
  { name: "Red",    hex: "#ff5252" },
  { name: "Orange", hex: "#ff9800" },
  { name: "Yellow", hex: "#ffeb3b" },
  { name: "Green",  hex: "#4caf50" },
  { name: "Blue",   hex: "#2196f3" },
  { name: "Purple", hex: "#9c27b0" },
  { name: "Pink",   hex: "#ff4081" },
  { name: "Brown",  hex: "#795548" },
];
const SHAPES = [
  { name: "Circle",   emoji: "⭕" },
  { name: "Square",   emoji: "🟦" },
  { name: "Triangle", emoji: "🔺" },
  { name: "Star",     emoji: "⭐" },
  { name: "Heart",    emoji: "❤️" },
  { name: "Diamond",  emoji: "🔷" },
];
const ANIMALS = [
  { name: "Dog",     emoji: "🐶", sound: "Woof woof!" },
  { name: "Cat",     emoji: "🐱", sound: "Meow!" },
  { name: "Cow",     emoji: "🐮", sound: "Moo!" },
  { name: "Pig",     emoji: "🐷", sound: "Oink oink!" },
  { name: "Duck",    emoji: "🦆", sound: "Quack quack!" },
  { name: "Sheep",   emoji: "🐑", sound: "Baa!" },
  { name: "Horse",   emoji: "🐴", sound: "Neigh!" },
  { name: "Lion",    emoji: "🦁", sound: "Roar!" },
  { name: "Frog",    emoji: "🐸", sound: "Ribbit!" },
  { name: "Monkey",  emoji: "🐵", sound: "Ooh ooh ah ah!" },
  { name: "Elephant",emoji: "🐘", sound: "Toot!" },
  { name: "Bee",     emoji: "🐝", sound: "Buzz buzz!" },
];
const VEHICLES = [
  { name: "Car",         emoji: "🚗", sound: "Beep beep!" },
  { name: "Truck",       emoji: "🚚", sound: "Honk honk!" },
  { name: "Bus",         emoji: "🚌", sound: "Vroom!" },
  { name: "Train",       emoji: "🚂", sound: "Choo choo!" },
  { name: "Plane",       emoji: "✈️", sound: "Wheee!" },
  { name: "Helicopter",  emoji: "🚁", sound: "Whoop whoop whoop!" },
  { name: "Boat",        emoji: "⛵", sound: "Toot toot!" },
  { name: "Fire truck",  emoji: "🚒", sound: "Wee-oh wee-oh!" },
  { name: "Police car",  emoji: "🚓", sound: "Wee-oo wee-oo!" },
  { name: "Tractor",     emoji: "🚜", sound: "Putt putt!" },
  { name: "Bike",        emoji: "🚲", sound: "Ring ring!" },
  { name: "Rocket",      emoji: "🚀", sound: "Blast off!" },
];
const DINOSAURS = [
  { name: "T-Rex",        emoji: "🦖", sound: "ROAR!" },
  { name: "Triceratops",  emoji: "🦖", sound: "Snort!" },
  { name: "Stegosaurus",  emoji: "🦖", sound: "Grumble!" },
  { name: "Brontosaurus", emoji: "🦕", sound: "Boom boom boom!" },
  { name: "Brachiosaurus",emoji: "🦕", sound: "Stomp stomp!" },
  { name: "Pterodactyl",  emoji: "🦅", sound: "Screech!" },
];
const WEATHER = [
  { name: "Sunny",   emoji: "☀️" },
  { name: "Cloudy",  emoji: "☁️" },
  { name: "Rainy",   emoji: "🌧️" },
  { name: "Stormy",  emoji: "⛈️" },
  { name: "Snowy",   emoji: "❄️" },
  { name: "Windy",   emoji: "💨" },
  { name: "Foggy",   emoji: "🌫️" },
  { name: "Rainbow", emoji: "🌈" },
];
const FOOD = [
  { name: "Apple",     emoji: "🍎" },
  { name: "Banana",    emoji: "🍌" },
  { name: "Pizza",     emoji: "🍕" },
  { name: "Hot dog",   emoji: "🌭" },
  { name: "Burger",    emoji: "🍔" },
  { name: "Cookie",    emoji: "🍪" },
  { name: "Cake",      emoji: "🍰" },
  { name: "Ice cream", emoji: "🍦" },
  { name: "Bread",     emoji: "🍞" },
  { name: "Cheese",    emoji: "🧀" },
  { name: "Egg",       emoji: "🥚" },
  { name: "Milk",      emoji: "🥛" },
];
const FAMILY = [
  { name: "Mommy",   emoji: "👩" },
  { name: "Daddy",   emoji: "👨" },
  { name: "Baby",    emoji: "👶" },
  { name: "Sister",  emoji: "👧" },
  { name: "Brother", emoji: "👦" },
  { name: "Grandma", emoji: "👵" },
  { name: "Grandpa", emoji: "👴" },
];

// Phonetic letter names so iOS TTS pronounces them correctly every time
const LETTER_SOUND = {
  A: "ay",   B: "bee",  C: "see",  D: "dee",  E: "ee",   F: "eff",
  G: "jee",  H: "aitch",I: "eye",  J: "jay",  K: "kay",  L: "el",
  M: "em",   N: "en",   O: "oh",   P: "pee",  Q: "cue",  R: "are",
  S: "ess",  T: "tee",  U: "you",  V: "vee",  W: "double you",
  X: "ex",   Y: "why",  Z: "zee",
};
const LETTER_WORD = {
  A: "Apple", B: "Ball", C: "Cat", D: "Dog", E: "Egg", F: "Fish",
  G: "Goat", H: "Hat", I: "Ice", J: "Juice", K: "Kite", L: "Lion",
  M: "Moon", N: "Nest", O: "Orange", P: "Pig", Q: "Queen", R: "Rabbit",
  S: "Sun", T: "Tree", U: "Umbrella", V: "Van", W: "Water", X: "Xylophone",
  Y: "Yo-yo", Z: "Zebra",
};
const NUMBER_WORD = {
   1: "one",    2: "two",     3: "three",    4: "four",    5: "five",
   6: "six",    7: "seven",   8: "eight",    9: "nine",   10: "ten",
  11: "eleven",12: "twelve", 13: "thirteen",14: "fourteen",15: "fifteen",
  16: "sixteen",17:"seventeen",18:"eighteen",19:"nineteen",20:"twenty",
};

// `shuffle: false` opts an activity out of randomization (numbers stay
// in 1..10 order so he can recognize the sequence).
const ACTIVITIES = {
  letters: {
    items: LETTERS,
    many: true,
    color: () => `hsl(${Math.random() * 360}, 80%, 55%)`,
    // Show both forms ("Aa") so the kid learns uppercase and lowercase
    // at the same time. The lowercase is rendered smaller in CSS.
    label: (ch) => `${ch}<span class="letter-lower">${ch.toLowerCase()}</span>`,
    labelHtml: true,
    speak: (ch) => `${LETTER_SOUND[ch]}, ${LETTER_WORD[ch]}`,
    caption: (ch) => `${ch}, ${LETTER_WORD[ch]}`,
    display: (ch, c) => ({ text: `${ch}${ch.toLowerCase()}`, color: c, caption: LETTER_WORD[ch] }),
  },
  numbers: {
    items: NUMBERS,
    shuffle: false,
    color: (n) => `hsl(${n * 36}, 80%, 55%)`,
    label: (n) => n,
    speak: (n) => NUMBER_WORD[n],
    display: (n, c) => ({ text: n, color: c, caption: NUMBER_WORD[n] }),
  },
  colors: {
    items: COLORS,
    color: (c) => c.hex,
    background: (c) => c.hex,
    label: () => "",
    speak: (c) => c.name,
    display: (c) => ({ text: c.name, color: c.hex, caption: "" }),
  },
  shapes: {
    items: SHAPES,
    color: () => `hsl(${Math.random() * 360}, 70%, 60%)`,
    label: (s) => s.emoji,
    speak: (s) => s.name,
    display: (s, c) => ({ text: s.emoji, color: c, caption: s.name }),
  },
  animals: {
    items: ANIMALS,
    color: () => `hsl(${Math.random() * 360}, 70%, 60%)`,
    label: (a) => a.emoji,
    speak: (a) => `${a.name}. ${a.sound}`,
    display: (a, c) => ({ text: a.emoji, color: c, caption: a.name }),
  },
  vehicles: {
    items: VEHICLES,
    color: () => `hsl(${Math.random() * 360}, 80%, 55%)`,
    label: (v) => v.emoji,
    speak: (v) => `${v.name}. ${v.sound}`,
    display: (v, c) => ({ text: v.emoji, color: c, caption: v.name }),
  },
  dinosaurs: {
    items: DINOSAURS,
    color: () => `hsl(${Math.random() * 360}, 70%, 50%)`,
    label: (d) => d.emoji,
    speak: (d) => `${d.name}. ${d.sound}`,
    display: (d, c) => ({ text: d.emoji, color: c, caption: d.name }),
  },
  weather: {
    items: WEATHER,
    color: () => `hsl(${190 + Math.random() * 60}, 60%, 55%)`,
    label: (w) => w.emoji,
    speak: (w) => w.name,
    display: (w, c) => ({ text: w.emoji, color: c, caption: w.name }),
  },
  food: {
    items: FOOD,
    color: () => `hsl(${Math.random() * 50}, 75%, 55%)`,
    label: (f) => f.emoji,
    speak: (f) => f.name,
    display: (f, c) => ({ text: f.emoji, color: c, caption: f.name }),
  },
  family: {
    items: FAMILY,
    shuffle: false,
    color: () => `hsl(${300 + Math.random() * 60}, 60%, 60%)`,
    label: (p) => p.emoji,
    speak: (p) => p.name,
    display: (p, c) => ({ text: p.emoji, color: c, caption: p.name }),
  },
};

function buildFlashcards(name) {
  const cfg = ACTIVITIES[name];
  if (!cfg) return;
  const stage = document.getElementById("stage");
  stage.innerHTML = "";
  stage.className = "stage" + (cfg.many ? " stage--many" : "");

  const items = cfg.shuffle === false ? cfg.items : shuffled(cfg.items);
  items.forEach((item, i) => {
    const el = document.createElement("button");
    el.className = "item";
    const lbl = cfg.label(item, i);
    if (cfg.labelHtml) el.innerHTML = lbl; else el.textContent = lbl;
    const c = cfg.color(item, i);
    el.style.setProperty("--c", c);
    if (cfg.background) el.style.background = cfg.background(item);
    onTap(el, (e) => {
      happySound();
      say(cfg.speak(item), undefined, cfg.caption ? cfg.caption(item) : undefined);
      const d = cfg.display(item, c);
      showBigDisplay(d.text, d.color, d.caption);
      const p = pointOf(e);
      sparkleAt(p.x, p.y);
    });
    stage.appendChild(el);
  });
}

// ---------- New-high-score celebration ----------
// Shared big-bang moment for any game when a new personal best is set.
// Uses a fixed-position overlay so it works on top of any screen, not
// just the flashcard activity that owns #bigDisplay.
// Confetti rain — proper falling particles across the whole viewport,
// not the small clustered sparkleAt burst. Used for big moments: new
// personal best, all-stickers finale. ~30 pieces with randomized size,
// rotation, color, and fall speed.
function confettiRain(count = 32) {
  if (prefersReducedMotion()) return;
  const colors  = ["#ff4081", "#fab005", "#37b24d", "#4dabf7", "#7950f2", "#ff922b", "#20c997", "#e64980"];
  const glyphs  = ["🎉", "🎊", "🌟", "⭐", "💖", "🎈", "✨"];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    // Mix glyph particles and solid colored squares for variety.
    if (Math.random() < 0.6) {
      piece.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      piece.style.fontSize = (16 + Math.random() * 26) + "px";
    } else {
      piece.style.width = (8 + Math.random() * 8) + "px";
      piece.style.height = (12 + Math.random() * 14) + "px";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    }
    piece.style.left = (Math.random() * 100) + "vw";
    piece.style.animationDuration = (2.4 + Math.random() * 2.2) + "s";
    piece.style.animationDelay = (Math.random() * 0.6) + "s";
    piece.style.setProperty("--drift", ((Math.random() - 0.5) * 240) + "px");
    piece.style.setProperty("--spin", (360 + Math.random() * 720) + "deg");
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 5500);
  }
}

function celebrateNewHigh(value) {
  happySound();
  haptic([15, 30, 15, 30, 25]);
  confettiRain(28);
  if (typeof earnSticker === "function") earnSticker("firstHigh");
  // Games call this just before they speak the cheer; afterSpeech() picks
  // that line up and says "New best!" once it has finished, never over it
  // (the old 220 ms timer cut the cheer off at its second word).
  afterSpeech(() => say(`New best! ${value}!`), { beatMs: 150, minMs: 220, maxMs: 6000 });
  const overlay = document.getElementById("bestOverlay");
  const valEl = document.getElementById("bestValue");
  if (overlay && valEl) {
    valEl.textContent = value;
    overlay.classList.remove("show");
    void overlay.offsetWidth; // restart animation on rapid re-bests
    overlay.classList.add("show");
    clearTimeout(celebrateNewHigh._t);
    celebrateNewHigh._t = setTimeout(() => overlay.classList.remove("show"), 1800);
  }
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  for (let i = 0; i < 24; i++) {
    setTimeout(() => sparkleAt(
      cx + (Math.random() - 0.5) * 340,
      cy + (Math.random() - 0.5) * 340,
    ), i * 35);
  }
}

// Bobo peeks up from the bottom-left to cheer on milestone moments
// inside a game (e.g. every Nth correct answer). Lazy-built on first
// use so games that never call it cost nothing. Auto-hides after ~1.6s.
function boboCheer() {
  let el = document.getElementById("boboCheer");
  if (!el) {
    el = document.createElement("div");
    el.id = "boboCheer";
    el.className = "bobo-cheer";
    el.innerHTML = `
      <svg viewBox="0 0 120 140" aria-hidden="true">
        <defs>
          <radialGradient id="bcBody" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stop-color="#fffafc"/>
            <stop offset="30%" stop-color="#ffd6e7"/>
            <stop offset="70%" stop-color="#ff6b9d"/>
            <stop offset="100%" stop-color="#c2255c"/>
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="62" rx="46" ry="54" fill="url(#bcBody)"/>
        <ellipse cx="44" cy="40" rx="11" ry="16" fill="#fff" opacity="0.7"/>
        <circle cx="46" cy="58" r="6" fill="#fff"/>
        <circle cx="46" cy="59" r="4.5" fill="#2a1140"/>
        <circle cx="47" cy="57" r="1.8" fill="#fff"/>
        <circle cx="74" cy="58" r="6" fill="#fff"/>
        <circle cx="74" cy="59" r="4.5" fill="#2a1140"/>
        <circle cx="75" cy="57" r="1.8" fill="#fff"/>
        <path d="M42 76 Q 60 96 78 76 Q 60 92 42 76 Z" fill="#2a1140"/>
        <ellipse cx="34" cy="74" rx="6" ry="3.6" fill="#ff6b9d" opacity="0.55"/>
        <ellipse cx="86" cy="74" rx="6" ry="3.6" fill="#ff6b9d" opacity="0.55"/>
        <polygon points="54,114 66,114 60,124" fill="#c2255c"/>
      </svg>
      <div class="bobo-cheer__bubble">Yay!</div>
    `;
    document.body.appendChild(el);
  }
  // Restart by toggling — handles rapid re-fires without stacking.
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  clearTimeout(boboCheer._t);
  boboCheer._t = setTimeout(() => el.classList.remove("show"), 1600);
}

// ---------- Shared namespace for game modules ----------
// Each game file in /games registers itself on window.Lawson.games and uses
// the utilities below. Keeping each game self-contained makes it easy to
// tweak one without touching the others.
window.Lawson = {
  say, sayPrompt, cancelPromptRepeat, cancelSpeech, speechDone, afterSpeech, speechLog, speechStats, setSpeechSpeed, getSpeechSpeed, setSpokenName, getSpokenName, beep, happySound, buzzSound, haptic, sparkleAt, onTap, onTapOnce, pointOf, bumpBadge, show,
  audioCtx, unlockAudio, masterGain, setVolume, getVolume, isAudioHidden,
  getHighScore, setHighScore, bumpHighScore, tryNewHighScore,
  setVoiceMuted, setSoundMuted, isVoiceMuted, isSoundMuted,
  setMusicEnabled, isMusicEnabled, startMusic, stopMusic,
  earnSticker, isStickerEarned, listStickers, resetStickers,
  KID_NAME, cheer, shuffled, celebrateNewHigh, confettiRain, boboCheer,
  setCaptionsEnabled, isCaptionsEnabled, prefersReducedMotion,
  setSlowPace, isSlowPace, paceScale, setLessMotion, isLessMotion,
  tapToUse, putDownTool, heldTool,
  games: {}, // each game adds { screen, start, stop } here
};

// ---------- Routing ----------
let activeGame = null;
function leaveActiveGame() {
  if (activeGame && typeof activeGame.stop === "function") activeGame.stop();
  activeGame = null;
}

// Daily streak: increments when today's first visit is on the day after
// the last visit, resets to 1 if a day was missed, no-op if same day.
// Stored as YYYY-MM-DD strings to be timezone-stable for the local user.
function _today() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function _yesterdayOf(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d - 1);
  const z = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${z(dt.getMonth() + 1)}-${z(dt.getDate())}`;
}
function bumpDailyStreak() {
  try {
    const today = _today();
    const last = localStorage.getItem("lawson:lastDay") || "";
    let streak = parseInt(localStorage.getItem("lawson:streak") || "0", 10) || 0;
    if (last === today) return streak;
    streak = (last && last === _yesterdayOf(today)) ? streak + 1 : 1;
    localStorage.setItem("lawson:lastDay", today);
    localStorage.setItem("lawson:streak", String(streak));
    return streak;
  } catch (_) { return 1; }
}

// Render the streak badge in the header. Hidden when the streak is 0
// or 1 — a "🔥 1" badge isn't really a streak yet, and showing it
// makes a fresh install look noisier than it should.
function renderStreakBadge() {
  const badge = document.getElementById("streakBadge");
  const val = document.getElementById("streakBadgeVal");
  if (!badge || !val) return;
  let streak = 0;
  try { streak = parseInt(localStorage.getItem("lawson:streak") || "0", 10) || 0; } catch (_) {}
  if (streak >= 2) {
    val.textContent = streak;
    badge.setAttribute("aria-label", `Daily streak: ${streak} days in a row`);
    badge.hidden = false;
    // Tap-to-celebrate. Each tap speaks the count and a brief cheer
    // so the kid hears the achievement reinforced.
    if (!badge.__lawsonTap) {
      badge.__lawsonTap = true;
      onTap(badge, () => {
        say(`${streak} days in a row! Keep it going!`);
        sparkleAt(badge.getBoundingClientRect().left + 20,
                  badge.getBoundingClientRect().top + 20);
      });
    }
  } else {
    badge.hidden = true;
  }
}

// Time-of-day greeting shown as a top-of-screen toast on app load.
// Visual only — speaking it would collide with game intros and feel
// awkward, since some games speak the moment you enter them.
(function showWelcome() {
  const h = new Date().getHours();
  let prefix;
  if (h < 5)        prefix = "🌙 Hello";
  else if (h < 12)  prefix = "☀️ Good morning";
  else if (h < 17)  prefix = "🌤️ Good afternoon";
  else if (h < 21)  prefix = "🌆 Good evening";
  else              prefix = "🌙 Hello";

  const streak = bumpDailyStreak();
  renderStreakBadge();
  const streakBit = streak >= 2 ? `  ·  🔥 Day ${streak}` : "";

  const el = document.createElement("div");
  el.className = "welcome-toast";
  el.setAttribute("role", "status");
  el.textContent = `${prefix}, ${KID_NAME}!${streakBit}`;
  document.body.appendChild(el);
  // Delay the slide-in so the toast emerges just as the splash fades —
  // a smooth handoff rather than two overlapping moments.
  const ENTRY_DELAY = 1200;
  const VISIBLE_DURATION = 2800;
  setTimeout(() => el.classList.add("show"), ENTRY_DELAY);
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 500);
  }, ENTRY_DELAY + VISIBLE_DURATION);
})();

// Tiny two-note chime for navigation: ascending when going into a game,
// descending when returning home. Reads as a "step forward / step back"
// musical cue without being a full jingle.
function navChime(up) {
  if (up) {
    beep(523.25, 0.07, "triangle", 0);    // C5
    beep(659.25, 0.09, "triangle", 0.05); // E5
  } else {
    beep(659.25, 0.07, "triangle", 0);    // E5
    beep(523.25, 0.09, "triangle", 0.05); // C5
  }
  haptic(8);
}

// Hub tiles open a sub-menu screen (e.g. Numbers, Explore). No game
// state is started — the hub is just a category page; its child tiles
// use the normal data-go flow.
const HUB_INTROS = {
  moreHub: "Lots more to explore!",
  numbersHub: "Let's count!",
  exploreHub: "Wonder World!",
  artHub: "Welcome to the Art Studio!",
  musicHub: "Music time!",
  townHub: "Welcome to Town!",
  brainHub: "Brain games!",
  libraryHub: "Welcome to the library!",
};
// The hub intro is spoken a beat after the screen change. If the kid has
// already tapped on to a game (or another hub, or Home) by then, it must
// not talk over that screen's own prompt.
let _hubIntroTimer = null;
function cancelHubIntro() {
  clearTimeout(_hubIntroTimer);
  _hubIntroTimer = null;
}
document.querySelectorAll("[data-hub]").forEach((btn) => {
  onTap(btn, () => {
    unlockAudio();
    unlockSpeech();
    navChime(true);
    leaveActiveGame();
    cancelHubIntro();
    _lastNavTrigger = btn;
    const hub = btn.dataset.hub;
    show(hub);
    const intro = HUB_INTROS[hub];
    if (intro) {
      _hubIntroTimer = setTimeout(() => {
        _hubIntroTimer = null;
        const screen = document.getElementById(hub);
        if (screen && screen.classList.contains("active")) say(intro);
      }, 380);
    }
  });
});

document.querySelectorAll("[data-go]").forEach((btn) => {
  onTap(btn, () => {
    unlockAudio();
    unlockSpeech();
    cancelHubIntro();
    const where = btn.dataset.go;
    navChime(true);
    _lastNavTrigger = btn;

    // Quick wave from Bobo before leaving — fires from menu or hubs,
    // anywhere he's visible.
    if (document.body.classList.contains("on-lobby")) {
      const mascot = document.getElementById("mascot");
      if (mascot) {
        mascot.classList.add("waving");
        setTimeout(() => mascot.classList.remove("waving"), 600);
      }
    }

    leaveActiveGame();

    const game = window.Lawson.games[where];
    if (game) {
      show(game.screen);
      activeGame = game;
      game.start();
      return;
    }

    if (ACTIVITIES[where]) {
      const activity = document.getElementById("activity");
      if (activity) activity.setAttribute("aria-label", where.charAt(0).toUpperCase() + where.slice(1));
      show("activity");
      buildFlashcards(where);
    }
  });
});

document.querySelectorAll("[data-home]").forEach((btn) => {
  onTap(btn, () => {
    leaveActiveGame();
    cancelHubIntro();
    cancelSpeech();
    show("menu");
    navChime(false);
  });
});

// Tap Bobo for a greeting + sparkle. Random short phrases so it stays
// fresh across taps. Toddlers love poking the mascot — it's also the
// excuse for them to hear the personalized cheer line.
(function setupMascot() {
  const mascot = document.getElementById("mascot");
  if (!mascot) return;
  const phrases = [
    () => `Hi ${KID_NAME}!`,
    () => `Hello ${KID_NAME}!`,
    () => `${L_cheerSafe()}`,
    () => `Hey there!`,
    () => `Boop!`,
    () => `Let's play!`,
  ];
  const TRIPLE_TAP_WINDOW = 1400; // ms
  function L_cheerSafe() { try { return cheer(); } catch (_) { return "Yay!"; } }
  let i = 0;
  let recentTaps = [];
  let totalTaps = 0; // session counter, drives the 10-tap easter egg
  onTap(mascot, () => {
    unlockAudio();
    unlockSpeech();
    totalTaps += 1;
    // 10-tap easter egg: full confetti party, distinct from the
    // triple-tap flip. Only fires once per 10 taps so a kid spamming
    // doesn't get a constant party.
    if (totalTaps % 10 === 0) {
      confettiRain(40);
      say(`Bobo dance party!`);
      happySound();
      mascot.classList.add("flipping");
      setTimeout(() => mascot.classList.remove("flipping"), 800);
      return;
    }
    // Detect rapid triple-tap for a special reaction. Drop any tap
    // older than the window so the counter is sliding, not sticky.
    const now = Date.now();
    recentTaps.push(now);
    recentTaps = recentTaps.filter((t) => now - t < TRIPLE_TAP_WINDOW);
    if (recentTaps.length >= 3) {
      recentTaps = [];
      mascot.classList.add("flipping");
      setTimeout(() => mascot.classList.remove("flipping"), 800);
      say("Tickly!");
      happySound();
      haptic([10, 30, 10, 30, 20]);
      const r = mascot.getBoundingClientRect();
      for (let k = 0; k < 6; k++) {
        setTimeout(() => sparkleAt(
          r.left + r.width / 2 + (Math.random() - 0.5) * 80,
          r.top + r.height / 2 + (Math.random() - 0.5) * 80,
        ), k * 60);
      }
      resetIdle();
      return;
    }
    say(phrases[i++ % phrases.length]());
    haptic(10);
    const r = mascot.getBoundingClientRect();
    sparkleAt(r.left + r.width / 2, r.top + r.height / 2);
    resetIdle();
  });

  // Idle wave: if the menu sits untouched for 8s, Bobo does a quick
  // wave to invite interaction. Restarts on any tap anywhere.
  let idleTimer = null;
  function resetIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (document.body.classList.contains("on-lobby")) {
        mascot.classList.add("waving");
        setTimeout(() => mascot.classList.remove("waving"), 1400);
      }
      resetIdle(); // chain — keep nudging every 8s while idle
    }, 8000);
  }
  document.addEventListener("touchstart", resetIdle, { passive: true });
  document.addEventListener("click", resetIdle);
  resetIdle();
})();

// Drifting cloud across the menu. Pure environmental atmosphere —
// constant motion across the top of the screen, no user attention
// required. Tap to make it rain sparkles for a delightful surprise.
(function setupCloud() {
  const cloud = document.getElementById("menuCloud");
  if (!cloud) return;
  onTap(cloud, (e) => {
    if (e.stopPropagation) e.stopPropagation();
    say("Bloop!", 1.1);
    haptic(8);
    const r = cloud.getBoundingClientRect();
    // Sparkle rain below the cloud
    for (let k = 0; k < 5; k++) {
      setTimeout(() => sparkleAt(
        r.left + Math.random() * r.width,
        r.top + r.height + Math.random() * 40,
      ), k * 80);
    }
  });
})();

// Sunny the sun — second mascot, top-left corner of the menu. Cheerful
// shorter phrases since she's a "pal" character, not the host.
(function setupSunny() {
  const sunny = document.getElementById("sunny");
  if (!sunny) return;
  const phrases = [
    "Sunny says hi!",
    "What a bright day!",
    "Shine on!",
    "Hello sunshine!",
    "Sparkle!",
  ];
  let i = 0;
  onTap(sunny, () => {
    unlockAudio();
    unlockSpeech();
    say(phrases[i++ % phrases.length]);
    haptic(10);
    sunny.classList.remove("spinning");
    void sunny.offsetWidth;
    sunny.classList.add("spinning");
    setTimeout(() => sunny.classList.remove("spinning"), 900);
    const r = sunny.getBoundingClientRect();
    sparkleAt(r.left + r.width / 2, r.top + r.height / 2);
  });
})();

// Hub titles on the hub screens are tappable — Bobo speaks the hub
// name as a friendly invitation. Replaces the old section-title
// tap on the home menu after the restructure.
(function setupHubTitles() {
  document.querySelectorAll(".hub-title").forEach((title) => {
    title.style.cursor = "pointer";
    onTap(title, () => {
      const text = (title.textContent || "").trim();
      say(text);
      haptic(8);
      title.classList.remove("bump");
      void title.offsetWidth;
      title.classList.add("bump");
    });
  });
})();

// Every score / best badge is tappable — speaks the current value.
// Helps a pre-reader hear what the number is without parental help.
(function setupBadgeTaps() {
  document.querySelectorAll(".badge").forEach((badge) => {
    onTap(badge, (e) => {
      if (e.stopPropagation) e.stopPropagation();
      const valEl = badge.querySelector("span");
      if (!valEl) return;
      const v = parseInt(valEl.textContent, 10);
      if (!isNaN(v)) say(String(v), 1.0);
      haptic(6);
    });
  });
})();

// Touch anywhere on the menu background → tiny sparkle at the finger.
// Skipped if the tap landed on something that already has its own
// feedback (tile, mascot, bubble, etc.). Turns the whole screen into
// a responsive surface — nothing feels dead.
(function setupAmbientTouch() {
  function ambientAt(x, y, target) {
    if (!document.body.classList.contains("on-lobby")) return;
    if (!target || !target.closest) return;
    if (target.closest("button, [data-go], [data-hub], .bubble, .mascot, .sunny, .menu-cloud, .hub-title, .badge")) return;
    const s = document.createElement("div");
    s.className = "sparkle";
    s.textContent = "✨";
    s.style.left = x + "px";
    s.style.top  = y + "px";
    s.style.fontSize = "22px";
    s.style.setProperty("--dx", "0px");
    s.style.setProperty("--dy", "-30px");
    s.style.setProperty("--scale", "0.6");
    s.style.setProperty("--rot", "0deg");
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 800);
  }
  document.addEventListener("touchstart", (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    ambientAt(t.clientX, t.clientY, e.target);
  }, { passive: true });
  document.addEventListener("click", (e) => {
    if (e.detail === 0) return; // ignore synthetic clicks from touch
    ambientAt(e.clientX, e.clientY, e.target);
  });
})();

// Tappable menu bubbles. Each one is a button you can pop for a
// satisfying sound + sparkle. Doesn't navigate anywhere — purely
// ambient micro-interaction so there's always something to tap.
(function setupBubbles() {
  document.querySelectorAll(".menu-bubbles .bubble").forEach((bubble) => {
    onTap(bubble, (e) => {
      if (e.stopPropagation) e.stopPropagation();
      if (bubble.classList.contains("popped")) return;
      bubble.classList.add("popped");
      beep(280 + Math.random() * 400, 0.1, "triangle");
      haptic(8);
      const r = bubble.getBoundingClientRect();
      sparkleAt(r.left + r.width / 2, r.top + r.height / 2);
      // Respawn — restart the float animation from the bottom.
      setTimeout(() => {
        bubble.classList.remove("popped");
        bubble.style.animation = "none";
        void bubble.offsetWidth;
        bubble.style.animation = "";
      }, 700);
    });
  });
})();

// Prevent multi-touch pinch-zoom gestures on iOS (belt-and-braces with viewport meta)
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("touchmove", (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// ---------- Settings panel ----------
// Tiny parent-facing modal: change the kid's name (used in cheers across
// every game) and wipe all high scores. The "Reset" button requires a
// confirm tap so a passing toddler can't nuke their own bests.
(function setupSettings() {
  const openBtn = document.getElementById("settingsBtn");
  const overlay = document.getElementById("settingsOverlay");
  if (!openBtn || !overlay) return;
  const nameInput  = document.getElementById("settingsName");
  // "Sounds like": how the storyteller should say the name. Blank means
  // as written. Changing it plays a greeting so the parent can check.
  const nameSpokenInput = document.getElementById("settingsNameSpoken");
  if (nameSpokenInput) {
    nameSpokenInput.addEventListener("change", () => {
      setSpokenName((nameInput.value && nameInput.value.trim()) || KID_NAME, nameSpokenInput.value);
      say(`Hi, ${(nameInput.value && nameInput.value.trim()) || KID_NAME}! Let's play!`);
    });
  }
  const voiceTgl   = document.getElementById("settingsVoice");
  const voiceChoice = document.getElementById("settingsVoiceChoice");
  const voicePreview = document.getElementById("settingsVoicePreview");
  const voiceHint = document.getElementById("settingsVoiceHint");
  const VOICE_HINT = "Choose a voice, then listen. Voices marked online need an internet connection.";
  function refreshVoices() {
    const automatic = new Option("Automatic (recommended)", "");
    const voices = availableVoices();
    voiceChoice.replaceChildren(automatic, ...voices.map(v =>
      new Option(`${v.name} — ${v.lang}${v.localService ? "" : " (online)"}`, v.voiceURI)));
    voiceChoice.value = voices.some(v => v.voiceURI === savedVoiceURI) ? savedVoiceURI : "";
    voiceChoice.disabled = !synth;
    voicePreview.disabled = !synth || isVoiceMuted() || getVolume() === 0;
    // The chosen voice stays chosen; say who is reading in the meantime.
    const fallback = speechFallback();
    if (voiceHint) voiceHint.textContent = fallback
      ? `${fallback.failed.name} can't speak right now${fallback.failed.localService ? "" : " (no internet?)"}, so ${fallback.using.name} is reading instead.`
      : VOICE_HINT;
  }
  voiceChoice.addEventListener("change", () => setSpeechVoice(voiceChoice.value));
  // Storyteller speed: pick, then hear a short line at that pace.
  const speedChoice = document.getElementById("settingsSpeechSpeed");
  if (speedChoice) {
    speedChoice.addEventListener("change", () => {
      setSpeechSpeed(speedChoice.value);
      say("Once upon a time, a little duck swam in the pond.");
    });
  }
  // The preview doubles as an on-device check of the speech timings: once
  // the line has settled, say how long the engine took to start and how
  // the line ended, plus a tally of the recent lines (story pages, cheers).
  const voiceReport = document.getElementById("settingsVoiceReport");
  const sec = (ms) => (ms == null ? "? s" : `${(ms / 1000).toFixed(1)} s`);
  function describeAttempt(e) {
    const who = e.voice || "the default voice";
    const again = e.stage === 1 ? " (read again after a swallowed start)" : e.stage === 2 ? " (stand-in voice)" : "";
    if (e.outcome === "ended") return `${who}${again}: started in ${sec(e.startMs)}, finished in ${sec(e.endMs)}.`;
    if (e.outcome === "dropped") return `${who}${again}: never started within ${sec(e.endMs)}.`;
    if (e.outcome === "cut") return `${who}${again}: cut off after ${sec(e.endMs)}.`;
    if (/^error:/.test(e.outcome)) return `${who}${again}: failed (${e.outcome.slice(6)}) after ${sec(e.endMs)}.`;
    return `${who}${again}: still going.`;
  }
  function voiceReportText() {
    const log = speechLog();
    if (!log.length) return "";
    const st = speechStats();
    let text = describeAttempt(log[log.length - 1]);
    if (st.lines > 1) {
      const parts = [];
      if (st.started) parts.push(`start ${sec(st.startMedianMs)} typical, ${sec(st.startMaxMs)} at most`);
      if (st.dropped) parts.push(`${st.dropped} swallowed`);
      if (st.reread) parts.push(`${st.reread} read again`);
      if (st.fallbacks) parts.push(`${st.fallbacks} by a stand-in voice`);
      if (st.errors) parts.push(`${st.errors} failed`);
      if (st.cut) parts.push(`${st.cut} cut off`);
      text += ` Last ${st.lines} lines: ${parts.join(", ")}.`;
    }
    return text;
  }
  voicePreview.addEventListener("click", () => {
    if (voiceReport) voiceReport.textContent = "Listening…";
    Promise.resolve(say("Hi! Let's play and discover something wonderful together.")).then(() => {
      if (voiceReport) voiceReport.textContent = voiceReportText();
    });
  });
  window.addEventListener("lawson:voiceschanged", refreshVoices);
  const soundTgl   = document.getElementById("settingsSound");
  const captionsTgl = document.getElementById("settingsCaptions");
  const musicTgl   = document.getElementById("settingsMusic");
  const darkTgl    = document.getElementById("settingsDark");
  const slowTgl    = document.getElementById("settingsSlow");
  const motionTgl  = document.getElementById("settingsMotion");
  const volumeInput = document.getElementById("settingsVolume");
  const closeBtn   = document.getElementById("settingsClose");
  const resetBtn   = document.getElementById("settingsReset");
  const tipsBtn    = document.getElementById("settingsTips");

  // Toggles are "on means enabled", so the checkbox value is the inverse
  // of the muted flag.
  voiceTgl.addEventListener("change", () => setVoiceMuted(!voiceTgl.checked));
  voiceTgl.addEventListener("change", refreshVoices);
  soundTgl.addEventListener("change", () => {
    setSoundMuted(!soundTgl.checked);
    if (soundTgl.checked) beep(500, 0.08); // little chirp when re-enabling
  });
  // Volume slider drives the shared master gain. Chirp on release so the
  // parent hears the new level. `input` updates live; `change` chirps.
  if (volumeInput) {
    volumeInput.addEventListener("input", () => setVolume(volumeInput.value / 100));
    volumeInput.addEventListener("input", refreshVoices);
    volumeInput.addEventListener("change", () => {
      setVolume(volumeInput.value / 100);
      if (!isSoundMuted() && volumeInput.value > 0) beep(600, 0.1, "triangle");
    });
  }
  if (musicTgl) musicTgl.addEventListener("change", () => {
    setMusicEnabled(musicTgl.checked);
    // If the kid is on the menu and just turned music on, start now.
    if (musicTgl.checked && document.body.classList.contains("on-menu")) startMusic();
  });
  if (darkTgl) darkTgl.addEventListener("change", () => setDarkMode(darkTgl.checked));
  if (slowTgl) slowTgl.addEventListener("change", () => setSlowPace(slowTgl.checked));
  if (motionTgl) motionTgl.addEventListener("change", () => setLessMotion(motionTgl.checked));
  if (captionsTgl) captionsTgl.addEventListener("change", () => setCaptionsEnabled(captionsTgl.checked));

  // Modal plumbing: while the panel is open the rest of the page is
  // inert (unsupported browsers ignore the property), Tab cycles inside
  // the panel, Escape closes, and focus returns to wherever it came from.
  let returnFocusTo = null;
  let inerted = [];
  const panel = overlay.querySelector(".settings-panel");
  function focusables() {
    return Array.from(panel.querySelectorAll("button, input, select, [tabindex]:not([tabindex='-1'])"))
      .filter((el) => !el.disabled && el.offsetParent !== null);
  }
  function setBackgroundInert(on) {
    if (on) {
      inerted = Array.from(document.body.children)
        .filter((el) => el !== overlay && el.id !== "captions");
      inerted.forEach((el) => { try { el.inert = true; } catch (_) {} });
    } else {
      inerted.forEach((el) => { try { el.inert = false; } catch (_) {} });
      inerted = [];
    }
  }
  overlay.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const list = focusables();
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) { e.preventDefault(); close(); }
  });

  function open(opts) {
    const onboarding = !!(opts && opts.onboarding);
    returnFocusTo = document.activeElement && document.activeElement !== document.body
      ? document.activeElement : openBtn;
    nameInput.value = isFirstRun() ? "" : KID_NAME;
    if (nameSpokenInput) nameSpokenInput.value = getSpokenName();
    voiceTgl.checked = !isVoiceMuted();
    refreshVoices();
    if (speedChoice) speedChoice.value = getSpeechSpeed();
    soundTgl.checked = !isSoundMuted();
    if (musicTgl) musicTgl.checked = isMusicEnabled();
    if (darkTgl) darkTgl.checked = isDarkMode();
    if (slowTgl) slowTgl.checked = isSlowPace();
    if (motionTgl) motionTgl.checked = isLessMotion();
    if (volumeInput) volumeInput.value = Math.round(getVolume() * 100);
    if (captionsTgl) captionsTgl.checked = isCaptionsEnabled();
    resetBtn.textContent = "🧹 Reset scores";
    resetBtn.classList.remove("confirming");
    if (tipsBtn) tipsBtn.textContent = "💡 Show tips again";
    closeBtn.textContent = onboarding ? "✨ Let's play!" : "✅ Done";
    overlay.classList.toggle("onboarding", onboarding);
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    setBackgroundInert(true);
    setTimeout(() => {
      if (overlay.classList.contains("open")) nameInput.focus({ preventScroll: true });
    }, 50);
  }
  function close() {
    if (!overlay.classList.contains("open")) return;
    if (nameSpokenInput) setSpokenName(KID_NAME, nameSpokenInput.value);
    setKidName(nameInput.value);
    overlay.classList.remove("open");
    overlay.classList.remove("onboarding");
    overlay.setAttribute("aria-hidden", "true");
    setBackgroundInert(false);
    const back = returnFocusTo && document.contains(returnFocusTo) ? returnFocusTo : openBtn;
    returnFocusTo = null;
    try { back.focus({ preventScroll: true }); } catch (_) {}
    beep(500, 0.08);
  }
  // Expose open()/close() so first-run onboarding (and tests) can drive it.
  window.__openSettings = open;
  window.__closeSettings = close;
  onTap(openBtn, (e) => { if (e.stopPropagation) e.stopPropagation(); open(); });
  onTap(closeBtn, close);
  // Tapping the dimmed backdrop closes too, but only if you tap outside the panel.
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  // Two-tap reset: first tap turns the button red and asks for confirmation;
  // second tap within ~4s actually wipes scores. Keeps a toddler from clearing them.
  let confirmT = null;
  onTap(resetBtn, () => {
    if (resetBtn.classList.contains("confirming")) {
      resetAllHighScores();
      resetStickers();
      clearTimeout(confirmT);
      resetBtn.classList.remove("confirming");
      resetBtn.textContent = "✅ Cleared";
      happySound();
      setTimeout(() => { resetBtn.textContent = "🧹 Reset scores"; }, 1400);
    } else {
      resetBtn.classList.add("confirming");
      resetBtn.textContent = "⚠️ Tap again to confirm";
      buzzSound();
      confirmT = setTimeout(() => {
        resetBtn.classList.remove("confirming");
        resetBtn.textContent = "🧹 Reset scores";
      }, 4000);
    }
  });

  // "Show tips again" re-arms the first-visit tutorial hints (they only
  // fire once per game otherwise). Handy after a sibling takes over.
  if (tipsBtn) onTap(tipsBtn, () => {
    if (typeof window.__resetTutorials === "function") window.__resetTutorials();
    tipsBtn.textContent = "✅ Tips on!";
    tipsBtn.classList.add("done");
    happySound();
    setTimeout(() => {
      tipsBtn.textContent = "💡 Show tips again";
      tipsBtn.classList.remove("done");
    }, 1400);
  });

  // Submit on Enter, in case a parent prefers the keyboard.
  nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") close(); });
})();

// ---------- Service worker (offline play) ----------
// Cache static assets so the playground keeps working when the iPad's
// offline (in a car, on a plane, weak Wi-Fi, etc.). The SW file lives at
// the repo root so its scope covers everything below it.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
