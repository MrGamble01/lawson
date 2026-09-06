// ---------- Farm! ----------
// Big open sandbox: a single illustrated barnyard scene packed with
// independent micro-interactions. Tap chickens to collect eggs out
// of the coop. Drag a milk bucket onto the cow to milk it. Drag the
// shears onto the sheep to shear them. Drag a carrot to the horse,
// a slop bowl to the pigs, a ball to the dog. Tap apples on the tree
// to pick them. Drag a fishing rod to the pond to catch fish. Drive
// the tractor across the field. A subtle day/night cycle shifts the
// sky and a chance of rain auto-waters the garden plots.
//
// No fail state. Everything refills over time. It's a quiet farm
// that rewards poking around.
(function () {
  const L = window.Lawson;

  // ====================================================================
  //  Constants
  // ====================================================================
  const COW_MILK_PER_FILL   = 3;
  const PIG_FEED_THRESHOLD  = 3;
  const APPLE_RESPAWN_MS    = 12_000;
  const EGG_RESPAWN_MS      = 9_000;
  const WOOL_RESPAWN_MS     = 16_000;
  const FISH_SPAWN_MS       = 5_000;
  const DAY_CYCLE_MS        = 25_000;
  const RAIN_MIN_INTERVAL_MS = 45_000;
  const RAIN_DURATION_MS    = 9_000;

  // ====================================================================
  //  State
  // ====================================================================
  let cow = null;
  let chickens = [];
  let eggs = [];
  let sheep = [];
  let pigs = [];
  let horse = null;
  let dog = null;
  let ducks = [];
  let apples = [];
  let fish = [];
  let plots = [];
  let dayPhase = 0;
  let bucketMilkLevel = 0;
  let pigFedCount = 0;
  let totalCares = 0;
  let bestAtStart = 0;
  let celebrated = false;
  let timers = [];
  let dayTimer = null;
  let weatherTimer = null;
  let rainStart = 0;

  function setT(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }
  function $(id) { return document.getElementById(id); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // ====================================================================
  //  SVG art — chunky, friendly farm animals. Each is sized small in
  //  CSS but the viewBox is rich enough that they zoom up cleanly on
  //  retina iPad.
  // ====================================================================

  function cowSvg() {
    return `
      <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="100" cy="150" rx="78" ry="8" fill="rgba(0,0,0,0.22)"/>
        <ellipse cx="98"  cy="110" rx="68" ry="44" fill="#fff"/>
        <ellipse cx="62"  cy="98"  rx="22" ry="18" fill="#3a2208"/>
        <ellipse cx="118" cy="120" rx="20" ry="14" fill="#3a2208"/>
        <ellipse cx="142" cy="98"  rx="16" ry="12" fill="#3a2208"/>
        <rect x="42"  y="142" width="14" height="20" rx="3" fill="#3a2208"/>
        <rect x="68"  y="146" width="14" height="16" rx="3" fill="#3a2208"/>
        <rect x="118" y="146" width="14" height="16" rx="3" fill="#3a2208"/>
        <rect x="144" y="142" width="14" height="20" rx="3" fill="#3a2208"/>
        <ellipse cx="56"  cy="95" rx="32" ry="24" fill="#fff" stroke="#3a2208" stroke-width="2.5"/>
        <circle cx="46"  cy="85"  r="4"  fill="#3a2208"/>
        <circle cx="68"  cy="85"  r="4"  fill="#3a2208"/>
        <ellipse cx="56"  cy="110" rx="8"  ry="3"  fill="#ff8ab0"/>
        <circle cx="50"  cy="110" r="1.4" fill="#3a2208"/>
        <circle cx="62"  cy="110" r="1.4" fill="#3a2208"/>
        <path d="M40 76 Q 36 64 44 60 Q 50 60 48 70 Z" fill="#fff" stroke="#3a2208" stroke-width="2"/>
        <path d="M72 76 Q 76 64 68 60 Q 62 60 64 70 Z" fill="#fff" stroke="#3a2208" stroke-width="2"/>
        <ellipse cx="36"  cy="84"  rx="6" ry="10" fill="#ffd0b3" transform="rotate(-30 36 84)"/>
        <ellipse cx="78"  cy="84"  rx="6" ry="10" fill="#ffd0b3" transform="rotate(30 78 84)"/>
        <path d="M170 110 Q 188 100 184 120 Q 180 132 168 122" fill="#fff" stroke="#3a2208" stroke-width="2"/>
        <ellipse cx="86" cy="148" rx="9" ry="6" fill="#ff8ab0" stroke="#c2255c" stroke-width="1.5"/>
        <circle cx="80" cy="152" r="2" fill="#c2255c"/>
        <circle cx="86" cy="152" r="2" fill="#c2255c"/>
        <circle cx="92" cy="152" r="2" fill="#c2255c"/>
      </svg>`;
  }

  function chickenSvg(color) {
    const body = color || "#fff";
    return `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="50" cy="96" rx="36" ry="4" fill="rgba(0,0,0,0.22)"/>
        <ellipse cx="50" cy="68" rx="30" ry="26" fill="${body}"/>
        <ellipse cx="58" cy="40" rx="14" ry="14" fill="${body}"/>
        <path d="M58 24 Q 56 14 62 14 Q 64 22 60 28 Z" fill="#fa5252"/>
        <path d="M58 24 Q 60 14 54 14 Q 52 22 56 28 Z" fill="#fa5252"/>
        <circle cx="62" cy="42" r="2" fill="#3a2208"/>
        <path d="M70 44 L 80 44 L 70 48 Z" fill="#fab005"/>
        <ellipse cx="52" cy="56" rx="3" ry="2" fill="#fa5252"/>
        <ellipse cx="42" cy="70" rx="10" ry="20" fill="${body}" transform="rotate(-15 42 70)"/>
        <ellipse cx="32" cy="74" rx="6" ry="14" fill="${body}" transform="rotate(-25 32 74)"/>
        <line x1="46" y1="92" x2="46" y2="100" stroke="#fab005" stroke-width="3" stroke-linecap="round"/>
        <line x1="54" y1="92" x2="54" y2="100" stroke="#fab005" stroke-width="3" stroke-linecap="round"/>
      </svg>`;
  }

  function eggSvg() {
    return `
      <svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="20" cy="48" rx="14" ry="2" fill="rgba(0,0,0,0.22)"/>
        <path d="M20 4 Q 4 20 6 36 Q 8 46 20 46 Q 32 46 34 36 Q 36 20 20 4 Z"
              fill="#fff" stroke="#a89d8a" stroke-width="1.5"/>
        <ellipse cx="14" cy="20" rx="4" ry="6" fill="rgba(255,255,255,0.7)"/>
      </svg>`;
  }

  function sheepSvg() {
    return `
      <svg viewBox="0 0 160 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="80" cy="124" rx="60" ry="5" fill="rgba(0,0,0,0.22)"/>
        <circle cx="40"  cy="80" r="14" fill="#fff"/>
        <circle cx="60"  cy="68" r="16" fill="#fff"/>
        <circle cx="80"  cy="60" r="18" fill="#fff"/>
        <circle cx="100" cy="64" r="16" fill="#fff"/>
        <circle cx="120" cy="76" r="14" fill="#fff"/>
        <circle cx="60"  cy="92" r="14" fill="#fff"/>
        <circle cx="100" cy="92" r="14" fill="#fff"/>
        <ellipse cx="80"  cy="80" rx="40" ry="20" fill="#fff"/>
        <ellipse cx="40"  cy="80" rx="20" ry="14" fill="#3a2208"/>
        <circle cx="32" cy="78" r="3" fill="#fff"/>
        <circle cx="32" cy="78" r="1.5" fill="#3a2208"/>
        <ellipse cx="34" cy="86" rx="3" ry="2" fill="#fff"/>
        <ellipse cx="50" cy="68" rx="5" ry="8" fill="#3a2208" transform="rotate(-25 50 68)"/>
        <rect x="60"  y="108" width="6" height="14" rx="2" fill="#3a2208"/>
        <rect x="74"  y="108" width="6" height="14" rx="2" fill="#3a2208"/>
        <rect x="92"  y="108" width="6" height="14" rx="2" fill="#3a2208"/>
        <rect x="106" y="108" width="6" height="14" rx="2" fill="#3a2208"/>
      </svg>`;
  }

  function pigSvg() {
    return `
      <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="80" cy="114" rx="60" ry="5" fill="rgba(0,0,0,0.22)"/>
        <ellipse cx="80" cy="68" rx="60" ry="42" fill="#ffb3c1"/>
        <ellipse cx="80" cy="60" rx="56" ry="38" fill="#ffc9d6"/>
        <ellipse cx="38" cy="60" rx="22" ry="20" fill="#ffb3c1"/>
        <ellipse cx="32" cy="56" rx="10" ry="8"  fill="#ff8ab0"/>
        <circle cx="28" cy="58" r="1.5" fill="#3a2208"/>
        <circle cx="34" cy="58" r="1.5" fill="#3a2208"/>
        <circle cx="48" cy="48" r="3"   fill="#3a2208"/>
        <path d="M48 70 L 56 70" stroke="#3a2208" stroke-width="2" stroke-linecap="round"/>
        <path d="M28 36 Q 24 26 32 28 Q 38 32 34 42 Z" fill="#ffb3c1" stroke="#c2255c" stroke-width="1"/>
        <path d="M44 36 Q 48 26 40 28 Q 34 32 38 42 Z" fill="#ffb3c1" stroke="#c2255c" stroke-width="1"/>
        <rect x="60"  y="100" width="10" height="16" rx="2" fill="#ffb3c1"/>
        <rect x="80"  y="100" width="10" height="16" rx="2" fill="#ffb3c1"/>
        <rect x="100" y="100" width="10" height="16" rx="2" fill="#ffb3c1"/>
        <rect x="120" y="100" width="10" height="16" rx="2" fill="#ffb3c1"/>
        <path d="M138 70 Q 152 60 150 78 Q 146 88 134 80" fill="#ffb3c1" stroke="#c2255c" stroke-width="1"/>
      </svg>`;
  }

  function horseSvg() {
    return `
      <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="100" cy="150" rx="78" ry="8" fill="rgba(0,0,0,0.22)"/>
        <ellipse cx="100" cy="100" rx="74" ry="38" fill="#8b4513"/>
        <ellipse cx="100" cy="98"  rx="70" ry="34" fill="#a0522d"/>
        <ellipse cx="50"  cy="80"  rx="20" ry="28" fill="#8b4513"/>
        <ellipse cx="40"  cy="78"  rx="12" ry="20" fill="#3a1f00"/>
        <ellipse cx="46"  cy="64"  rx="8"  ry="12" fill="#8b4513"/>
        <ellipse cx="54"  cy="60"  rx="6"  ry="10" fill="#8b4513"/>
        <circle  cx="38"  cy="78"  r="3"  fill="#fff"/>
        <circle  cx="38"  cy="78"  r="1.5" fill="#3a1f00"/>
        <ellipse cx="34"  cy="86"  rx="3" ry="2" fill="#3a1f00"/>
        <ellipse cx="60"  cy="50"  rx="3" ry="8" fill="#a0522d" transform="rotate(-25 60 50)"/>
        <ellipse cx="68"  cy="50"  rx="3" ry="8" fill="#a0522d" transform="rotate(-10 68 50)"/>
        <path d="M80 60 Q 70 40 90 30 Q 88 50 84 60" fill="#3a1f00"/>
        <rect x="60"  y="134" width="12" height="22" rx="3" fill="#3a1f00"/>
        <rect x="80"  y="134" width="12" height="22" rx="3" fill="#3a1f00"/>
        <rect x="108" y="134" width="12" height="22" rx="3" fill="#3a1f00"/>
        <rect x="128" y="134" width="12" height="22" rx="3" fill="#3a1f00"/>
        <path d="M170 100 Q 184 92 184 110 Q 184 124 174 122 Q 170 116 174 110 Z" fill="#3a1f00"/>
      </svg>`;
  }

  function dogSvg() {
    return `
      <svg viewBox="0 0 140 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="70" cy="124" rx="56" ry="5" fill="rgba(0,0,0,0.22)"/>
        <ellipse cx="74" cy="90" rx="52" ry="34" fill="#dcb98b"/>
        <ellipse cx="32" cy="78" rx="22" ry="20" fill="#dcb98b"/>
        <ellipse cx="36" cy="60" rx="10" ry="14" fill="#a0522d" transform="rotate(-30 36 60)"/>
        <ellipse cx="22" cy="76" rx="8"  ry="12" fill="#a0522d" transform="rotate(-15 22 76)"/>
        <ellipse cx="20" cy="80" rx="6" ry="10" fill="#3a1f00" transform="rotate(-15 20 80)"/>
        <circle cx="28" cy="74" r="3" fill="#fff"/>
        <circle cx="28" cy="74" r="1.5" fill="#3a1f00"/>
        <circle cx="38" cy="74" r="3" fill="#fff"/>
        <circle cx="38" cy="74" r="1.5" fill="#3a1f00"/>
        <ellipse cx="32" cy="84" rx="4" ry="3" fill="#3a1f00"/>
        <path d="M28 90 Q 32 94 36 90" stroke="#3a1f00" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <ellipse cx="32" cy="82" rx="4" ry="2" fill="#a0522d"/>
        <rect x="50" y="112" width="10" height="14" rx="2" fill="#a0522d"/>
        <rect x="68" y="112" width="10" height="14" rx="2" fill="#a0522d"/>
        <rect x="92" y="112" width="10" height="14" rx="2" fill="#a0522d"/>
        <path d="M118 88 Q 134 78 132 96 Q 128 110 116 102" fill="#dcb98b"/>
        <path d="M118 88 Q 134 78 132 96 Q 128 110 116 102" fill="none" stroke="#a0522d" stroke-width="1"/>
      </svg>`;
  }

  function duckSvg() {
    return `
      <svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="50" cy="74" rx="42" ry="4" fill="rgba(0,0,0,0.22)"/>
        <ellipse cx="56" cy="50" rx="36" ry="22" fill="#fff"/>
        <ellipse cx="56" cy="46" rx="32" ry="18" fill="#f8f4e6"/>
        <ellipse cx="28" cy="36" rx="14" ry="16" fill="#fff"/>
        <circle  cx="22" cy="30" r="2"  fill="#3a1f00"/>
        <path d="M12 38 L 4 38 L 12 44 Z" fill="#fab005"/>
        <path d="M62 70 Q 72 76 78 68" stroke="#fab005" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M88 50 Q 94 46 92 60 Q 86 64 82 54" fill="#fff"/>
      </svg>`;
  }

  function appleSvg() {
    return `
      <svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M20 14 Q 6 14 6 28 Q 6 44 20 46 Q 34 44 34 28 Q 34 14 20 14 Z" fill="#fa5252"/>
        <path d="M14 22 Q 10 24 12 30" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>
        <rect x="19" y="8" width="2" height="8" fill="#5a3a1a"/>
        <ellipse cx="24" cy="10" rx="6" ry="3" fill="#51cf66"/>
      </svg>`;
  }

  function fishSvg(color) {
    const c = color || "#ff8ab0";
    return `
      <svg viewBox="0 0 80 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="40" cy="25" rx="26" ry="14" fill="${c}"/>
        <path d="M14 25 L 4 14 L 4 36 Z" fill="${c}"/>
        <path d="M40 12 L 36 4 L 44 12 Z" fill="${c}"/>
        <circle cx="56" cy="22" r="3" fill="#fff"/>
        <circle cx="57" cy="22" r="1.5" fill="#3a1f00"/>
        <path d="M30 30 Q 36 32 30 34" stroke="#fff" stroke-width="1.5" fill="none" opacity="0.7"/>
      </svg>`;
  }

  function barnSvg() {
    return `
      <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="10" y="60" width="180" height="120" fill="#c2255c"/>
        <rect x="10" y="60" width="180" height="120" fill="none" stroke="#5c0e2c" stroke-width="3"/>
        <path d="M10 60 L 100 6 L 190 60 Z" fill="#a8083e"/>
        <path d="M10 60 L 100 6 L 190 60 Z" fill="none" stroke="#5c0e2c" stroke-width="3"/>
        <rect x="40"  y="84" width="40" height="50" fill="#fff" stroke="#5c0e2c" stroke-width="3"/>
        <line x1="40" y1="84" x2="80" y2="134" stroke="#5c0e2c" stroke-width="3"/>
        <line x1="80" y1="84" x2="40" y2="134" stroke="#5c0e2c" stroke-width="3"/>
        <rect x="120" y="84" width="40" height="50" fill="#fff" stroke="#5c0e2c" stroke-width="3"/>
        <line x1="120" y1="84" x2="160" y2="134" stroke="#5c0e2c" stroke-width="3"/>
        <line x1="160" y1="84" x2="120" y2="134" stroke="#5c0e2c" stroke-width="3"/>
        <rect x="76" y="138" width="48" height="42" fill="#5c0e2c"/>
        <circle cx="100" cy="36" r="6" fill="#ffd43b"/>
        <path d="M100 30 L 102 36 L 108 36 L 103 40 L 104 46 L 100 42 L 96 46 L 97 40 L 92 36 L 98 36 Z" fill="#ffd43b" stroke="#f59f00" stroke-width="1"/>
      </svg>`;
  }

  function coopSvg() {
    return `
      <svg viewBox="0 0 180 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="20" y="50" width="140" height="80" fill="#ffd180" stroke="#8b4513" stroke-width="3"/>
        <path d="M10 56 L 90 8 L 170 56 Z" fill="#8b4513"/>
        <rect x="50" y="74" width="36" height="48" fill="#5c3a1a" stroke="#3a1f00" stroke-width="2"/>
        <circle cx="78" cy="100" r="3" fill="#ffd43b"/>
        <rect x="100" y="78" width="40" height="30" fill="#a5d8ff" stroke="#1c7ed6" stroke-width="2"/>
        <line x1="120" y1="78" x2="120" y2="108" stroke="#1c7ed6" stroke-width="2"/>
        <line x1="100" y1="93" x2="140" y2="93" stroke="#1c7ed6" stroke-width="2"/>
        <path d="M8 130 L 22 110 L 36 130 Z" fill="#8b4513"/>
        <text x="90" y="38" font-size="10" font-weight="bold" text-anchor="middle" fill="#fff">COOP</text>
      </svg>`;
  }

  function treeSvg() {
    return `
      <svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="100" cy="216" rx="60" ry="6" fill="rgba(0,0,0,0.22)"/>
        <rect x="86" y="120" width="28" height="96" fill="#5c3a1a"/>
        <path d="M86 120 Q 80 140 86 200" stroke="#3a1f00" stroke-width="2" fill="none"/>
        <circle cx="100" cy="80" r="60" fill="#37b24d"/>
        <circle cx="60"  cy="100" r="36" fill="#2f9e44"/>
        <circle cx="140" cy="100" r="36" fill="#2f9e44"/>
        <circle cx="100" cy="40"  r="36" fill="#40c057"/>
        <circle cx="74"  cy="60"  r="22" fill="#51cf66"/>
        <circle cx="124" cy="60"  r="22" fill="#51cf66"/>
        <circle cx="100" cy="120" r="22" fill="#37b24d"/>
      </svg>`;
  }

  function pondSvg() {
    return `
      <svg viewBox="0 0 240 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="120" cy="50" rx="118" ry="46" fill="#4dabf7"/>
        <ellipse cx="120" cy="44" rx="110" ry="40" fill="#74c0fc"/>
        <ellipse cx="120" cy="38" rx="100" ry="32" fill="#a5d8ff" opacity="0.7"/>
        <ellipse cx="40"  cy="34" rx="20" ry="10" fill="rgba(255,255,255,0.6)"/>
        <ellipse cx="180" cy="58" rx="22" ry="10" fill="rgba(255,255,255,0.5)"/>
        <ellipse cx="100" cy="64" rx="18" ry="8"  fill="rgba(255,255,255,0.55)"/>
      </svg>`;
  }

  function lilyPadSvg() {
    return `
      <svg viewBox="0 0 60 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M30 4 Q 6 8 6 28 Q 6 46 30 46 Q 54 46 54 28 Q 54 8 30 4 Z M 30 4 L 30 14"
              fill="#37b24d" stroke="#2b8a3e" stroke-width="2" stroke-linejoin="round"/>
        <path d="M22 18 L 30 18 M 30 22 L 38 22 M 22 26 L 38 26"
              stroke="#2f9e44" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="38" cy="14" r="4" fill="#ff8ab0"/>
      </svg>`;
  }

  function tractorSvg() {
    return `
      <svg viewBox="0 0 180 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="90" cy="102" rx="80" ry="5" fill="rgba(0,0,0,0.22)"/>
        <rect x="60" y="36" width="60" height="44" fill="#fa5252" stroke="#a51111" stroke-width="2.5"/>
        <rect x="78" y="14" width="34" height="28" fill="#fff" stroke="#a51111" stroke-width="2.5"/>
        <line x1="92" y1="14" x2="92" y2="42" stroke="#a51111" stroke-width="2"/>
        <circle cx="120" cy="56" r="3" fill="#ffd43b"/>
        <rect x="20" y="60" width="40" height="20" fill="#fa5252" stroke="#a51111" stroke-width="2.5"/>
        <rect x="50" y="48" width="20" height="12" fill="#a51111"/>
        <circle cx="40"  cy="92" r="18" fill="#3a1f00"/>
        <circle cx="40"  cy="92" r="12" fill="#5c3a1a"/>
        <circle cx="40"  cy="92" r="5"  fill="#fff"/>
        <circle cx="140" cy="92" r="22" fill="#3a1f00"/>
        <circle cx="140" cy="92" r="15" fill="#5c3a1a"/>
        <circle cx="140" cy="92" r="6"  fill="#fff"/>
        <path d="M124 28 Q 134 22 132 38" stroke="#3a1f00" stroke-width="3" fill="none"/>
      </svg>`;
  }

  function bucketSvg(level) {
    const lvl = Math.min(3, Math.max(0, level || 0));
    const milkH = lvl * 6;
    return `
      <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M8 14 L 16 54 L 44 54 L 52 14 Z" fill="#9aa" stroke="#5a5a5a" stroke-width="2"/>
        ${milkH > 0 ? `<rect x="12" y="${44 - milkH}" width="36" height="${milkH + 10}" fill="#fff" rx="2"/>` : ""}
        <rect x="6" y="10" width="48" height="6" rx="2" fill="#5a5a5a"/>
        <path d="M12 12 Q 30 4 48 12" stroke="#5a5a5a" stroke-width="3" fill="none" stroke-linecap="round"/>
      </svg>`;
  }

  function shearsSvg() {
    return `
      <svg viewBox="0 0 80 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="14" cy="14" r="10" fill="none" stroke="#5a5a5a" stroke-width="4"/>
        <circle cx="14" cy="56" r="10" fill="none" stroke="#5a5a5a" stroke-width="4"/>
        <path d="M22 18 L 70 30 L 68 36 L 22 28 Z" fill="#c0c0c0" stroke="#5a5a5a" stroke-width="2"/>
        <path d="M22 52 L 70 40 L 68 34 L 22 42 Z" fill="#c0c0c0" stroke="#5a5a5a" stroke-width="2"/>
        <circle cx="20" cy="35" r="3" fill="#3a1f00"/>
      </svg>`;
  }

  function ballSvg() {
    return `
      <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="30" cy="30" r="26" fill="#fa5252"/>
        <circle cx="30" cy="30" r="26" fill="none" stroke="#a51111" stroke-width="2"/>
        <ellipse cx="22" cy="20" rx="8" ry="5" fill="#fff" opacity="0.5"/>
        <path d="M6 30 Q 30 34 54 30" stroke="#a51111" stroke-width="2" fill="none"/>
        <path d="M30 4 Q 26 30 30 56" stroke="#a51111" stroke-width="2" fill="none"/>
      </svg>`;
  }

  function carrotSvg() {
    return `
      <svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M30 24 L 16 70 Q 22 78 30 78 Q 38 78 44 70 Z" fill="#ff922b" stroke="#a8501c" stroke-width="2"/>
        <line x1="22" y1="38" x2="20" y2="40" stroke="#a8501c" stroke-width="1.5"/>
        <line x1="26" y1="50" x2="24" y2="52" stroke="#a8501c" stroke-width="1.5"/>
        <line x1="34" y1="50" x2="36" y2="52" stroke="#a8501c" stroke-width="1.5"/>
        <line x1="38" y1="38" x2="40" y2="40" stroke="#a8501c" stroke-width="1.5"/>
        <path d="M22 24 Q 18 6 14 14" stroke="#2f9e44" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M30 24 Q 30 4 26 12" stroke="#2f9e44" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M38 24 Q 42 6 46 14" stroke="#2f9e44" stroke-width="3" fill="none" stroke-linecap="round"/>
      </svg>`;
  }

  function slopBowlSvg() {
    return `
      <svg viewBox="0 0 80 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="40" cy="40" rx="32" ry="6" fill="rgba(0,0,0,0.22)"/>
        <path d="M12 20 Q 16 40 40 40 Q 64 40 68 20 Z" fill="#8b4513" stroke="#5a3a1a" stroke-width="2.5"/>
        <ellipse cx="40" cy="20" rx="28" ry="8" fill="#a0522d"/>
        <ellipse cx="40" cy="22" rx="22" ry="5" fill="#7a4a20"/>
        <circle cx="32" cy="20" r="2" fill="#5a3a1a"/>
        <circle cx="46" cy="22" r="2" fill="#5a3a1a"/>
        <ellipse cx="40" cy="14" rx="6" ry="2" fill="rgba(255,255,255,0.45)"/>
      </svg>`;
  }

  function rodSvg() {
    return `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="8" y="84" width="80" height="6" rx="2" fill="#8b4513" transform="rotate(-25 8 84)"/>
        <circle cx="14" cy="86" r="6" fill="#3a1f00"/>
        <path d="M88 26 L 96 18" stroke="#fab005" stroke-width="2" stroke-linecap="round"/>
        <line x1="94" y1="22" x2="80" y2="60" stroke="#a5d8ff" stroke-width="1.2"/>
        <path d="M76 60 Q 80 64 78 70 Q 76 64 74 70" fill="#a5d8ff" stroke="#1c7ed6" stroke-width="1"/>
      </svg>`;
  }

  function sunSvg() {
    return `
      <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g stroke="#f59f00" stroke-width="4" stroke-linecap="round">
          <line x1="40" y1="2"  x2="40" y2="14"/>
          <line x1="40" y1="66" x2="40" y2="78"/>
          <line x1="2"  y1="40" x2="14" y2="40"/>
          <line x1="66" y1="40" x2="78" y2="40"/>
          <line x1="14" y1="14" x2="22" y2="22"/>
          <line x1="58" y1="58" x2="66" y2="66"/>
          <line x1="66" y1="14" x2="58" y2="22"/>
          <line x1="22" y1="58" x2="14" y2="66"/>
        </g>
        <circle cx="40" cy="40" r="22" fill="#ffd43b" stroke="#f59f00" stroke-width="2.5"/>
        <circle cx="34" cy="36" r="2" fill="#5c3700"/>
        <circle cx="46" cy="36" r="2" fill="#5c3700"/>
        <path d="M32 46 Q 40 52 48 46" stroke="#5c3700" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>`;
  }

  function moonSvg() {
    return `
      <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="40" cy="40" r="26" fill="#f8f4e6"/>
        <circle cx="30" cy="36" r="4" fill="#dcdcd8"/>
        <circle cx="48" cy="46" r="3" fill="#dcdcd8"/>
        <circle cx="44" cy="28" r="2" fill="#dcdcd8"/>
        <circle cx="36" cy="34" r="1.5" fill="#dcdcd8"/>
      </svg>`;
  }

  function cloudSvg() {
    return `
      <svg viewBox="0 0 130 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="32" cy="42" rx="22" ry="16" fill="#fff" opacity="0.95"/>
        <ellipse cx="64" cy="32" rx="28" ry="22" fill="#fff" opacity="0.95"/>
        <ellipse cx="100" cy="42" rx="22" ry="16" fill="#fff" opacity="0.95"/>
      </svg>`;
  }

  function fenceSvg() {
    return `
      <svg viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="0" y="20" width="200" height="6"  fill="#a0522d"/>
        <rect x="0" y="36" width="200" height="6"  fill="#a0522d"/>
        <path d="M10 4 L 16 4 L 14 50 L 10 50 Z M 30 4 L 36 4 L 34 50 L 30 50 Z
                 M 50 4 L 56 4 L 54 50 L 50 50 Z M 70 4 L 76 4 L 74 50 L 70 50 Z
                 M 90 4 L 96 4 L 94 50 L 90 50 Z M 110 4 L 116 4 L 114 50 L 110 50 Z
                 M 130 4 L 136 4 L 134 50 L 130 50 Z M 150 4 L 156 4 L 154 50 L 150 50 Z
                 M 170 4 L 176 4 L 174 50 L 170 50 Z M 190 4 L 196 4 L 194 50 L 190 50 Z"
              fill="#cd853f" stroke="#7a3f1d" stroke-width="1"/>
      </svg>`;
  }

  // ====================================================================
  //  Build the farm scene
  // ====================================================================
  function build() {
    const stage = $("farmStage");
    stage.innerHTML = `
      <div id="farmSky" class="farm-sky">
        <div id="farmSunMoon" class="farm-sun" aria-hidden="true">${sunSvg()}</div>
        <div class="farm-stars" id="farmStars" aria-hidden="true"></div>
        <div class="farm-cloud farm-cloud--1" aria-hidden="true">${cloudSvg()}</div>
        <div class="farm-cloud farm-cloud--2" aria-hidden="true">${cloudSvg()}</div>
      </div>
      <div id="farmRain" class="farm-rain"></div>
      <div class="farm-mountain"></div>
      <div class="farm-hills"></div>
      <div class="farm-grass"></div>

      <div class="farm-tree" id="farmTree" tabindex="-1">${treeSvg()}<div class="farm-apples" id="farmApples"></div></div>
      <div class="farm-barn">${barnSvg()}</div>
      <div class="farm-coop">${coopSvg()}<div class="farm-eggs" id="farmEggs"></div></div>
      <div class="farm-fence farm-fence--top">${fenceSvg()}</div>
      <div class="farm-fence farm-fence--bot">${fenceSvg()}</div>
      <div class="farm-pond">${pondSvg()}<div class="farm-lily">${lilyPadSvg()}</div></div>
      <div class="farm-pond-fish" id="farmFish"></div>

      <div class="farm-cow" id="farmCow" aria-label="Cow">${cowSvg()}</div>
      <div class="farm-horse" id="farmHorse" aria-label="Horse">${horseSvg()}</div>
      <div class="farm-sheep" id="farmSheep" aria-label="Sheep">${sheepSvg()}</div>
      <div class="farm-pig"  id="farmPig" aria-label="Pig">${pigSvg()}</div>
      <div class="farm-dog"  id="farmDog" aria-label="Dog">${dogSvg()}</div>
      <div class="farm-ducks" id="farmDucks" aria-hidden="true">
        <div class="farm-duck" aria-hidden="true">${duckSvg()}</div>
        <div class="farm-duck" aria-hidden="true">${duckSvg()}</div>
      </div>
      <div class="farm-chickens" id="farmChickens">
        <div class="farm-chicken" aria-label="Chicken">${chickenSvg("#fff")}</div>
        <div class="farm-chicken" aria-label="Chicken">${chickenSvg("#fff8a8")}</div>
        <div class="farm-chicken" aria-label="Chicken">${chickenSvg("#ffd0b3")}</div>
      </div>

      <div class="farm-tractor" id="farmTractor" aria-label="Tractor">${tractorSvg()}</div>

      <div class="farm-tools">
        <button id="farmBucket"   class="farm-tool farm-tool--bucket" aria-label="Milk bucket">${bucketSvg(0)}</button>
        <button id="farmShears"   class="farm-tool farm-tool--shears" aria-label="Shears">${shearsSvg()}</button>
        <button id="farmCarrot"   class="farm-tool farm-tool--carrot" aria-label="Carrot">${carrotSvg()}</button>
        <button id="farmSlop"     class="farm-tool farm-tool--slop"   aria-label="Pig food">${slopBowlSvg()}</button>
        <button id="farmBall"     class="farm-tool farm-tool--ball"   aria-label="Ball">${ballSvg()}</button>
        <button id="farmRod"      class="farm-tool farm-tool--rod"    aria-label="Fishing rod">${rodSvg()}</button>
      </div>`;

    setupCow();
    setupChickens();
    setupSheep();
    setupPig();
    setupHorse();
    setupDog();
    setupDucks();
    setupAppleTree();
    setupPond();
    setupTractor();
    setupBucket();
    setupShears();
    setupCarrot();
    setupSlop();
    setupBall();
    setupRod();
    setupSun();
    setupClouds();
    spawnInitialEggs();
    spawnInitialApples();
    spawnInitialFish();
    startDayCycle();
    startWeatherCycle();
  }

  // ====================================================================
  //  Score
  // ====================================================================
  function bumpCare() {
    totalCares += 1;
    L.bumpBadge("farmScoreVal", totalCares);
    if (totalCares > bestAtStart && !celebrated) {
      celebrated = true;
      setTimeout(() => L.celebrateNewHigh(totalCares), 700);
    }
    L.bumpHighScore("farmBest", totalCares);
    refreshBestBadge();
    if (totalCares >= 1)  L.earnSticker && L.earnSticker("farmStarter");
    if (totalCares >= 20) L.earnSticker && L.earnSticker("farmFriend");
    if (totalCares >= 50) L.earnSticker && L.earnSticker("farmMaster");
  }

  function refreshBestBadge() {
    const bestEl = $("farmBestVal");
    if (bestEl) bestEl.textContent = L.getHighScore("farmBest");
  }

  // ====================================================================
  //  Cow: drag the bucket onto her to milk
  // ====================================================================
  function setupCow() {
    cow = { el: $("farmCow"), milkedAt: 0 };
    L.onTap(cow.el, () => {
      L.beep(180, 0.2, "triangle");
      L.haptic(8);
      L.say("Moo!");
      cow.el.classList.add("farm-react");
      setT(500, () => cow.el.classList.remove("farm-react"));
    });
  }

  function milkCow() {
    if (!cow) return;
    if (bucketMilkLevel >= COW_MILK_PER_FILL) {
      L.say("Bucket is full!");
      return;
    }
    bucketMilkLevel += 1;
    refreshBucket();
    L.beep(420 + Math.random() * 80, 0.06, "sine");
    L.beep(360, 0.05, "sine", 0.06);
    L.say("Squirt squirt!");
    L.haptic(6);
    cow.el.classList.add("farm-react");
    setT(420, () => cow.el.classList.remove("farm-react"));
    bumpCare();
    if (bucketMilkLevel >= COW_MILK_PER_FILL) {
      setT(400, () => {
        L.say("Bucket full of milk!");
        L.happySound();
      });
    }
  }

  function refreshBucket() {
    const b = $("farmBucket");
    if (b) b.innerHTML = bucketSvg(bucketMilkLevel);
  }

  function setupBucket() {
    const tool = $("farmBucket");
    if (!tool) return;
    setupToolDrag(tool, (clientX, clientY) => {
      // Drag bucket onto cow → milk
      if (overEl(clientX, clientY, $("farmCow"))) {
        milkCow();
      }
    });
  }

  // ====================================================================
  //  Chickens + eggs: tap an egg to collect it
  // ====================================================================
  function setupChickens() {
    document.querySelectorAll(".farm-chicken").forEach((c, i) => {
      c.style.setProperty("--delay", (i * 1.5) + "s");
      L.onTap(c, () => {
        L.beep(900 + Math.random() * 200, 0.06, "sine");
        L.beep(700, 0.06, "sine", 0.06);
        L.haptic(5);
        L.say("Cluck cluck!");
        c.classList.add("farm-react");
        setT(400, () => c.classList.remove("farm-react"));
      });
    });
  }

  function spawnInitialEggs() {
    for (let i = 0; i < 3; i++) spawnEgg();
  }

  function spawnEgg() {
    const cont = $("farmEggs");
    if (!cont) return;
    if (cont.children.length >= 4) return;
    const e = document.createElement("button");
    e.className = "farm-egg";
    e.setAttribute("aria-label", "Egg");
    e.innerHTML = eggSvg();
    e.style.left = (12 + Math.random() * 68) + "%";
    e.style.top  = (40 + Math.random() * 40) + "%";
    cont.appendChild(e);
    L.onTap(e, (ev) => {
      e.classList.add("farm-egg-collected");
      L.beep(700, 0.05, "triangle");
      L.beep(900, 0.07, "triangle", 0.06);
      L.haptic(8);
      L.say("Egg!");
      const p = L.pointOf(ev);
      L.sparkleAt(p.x, p.y);
      bumpCare();
      setT(350, () => e.remove());
      setT(EGG_RESPAWN_MS, spawnEgg);
    });
  }

  // ====================================================================
  //  Sheep: drag shears to shear → wool puff appears
  // ====================================================================
  function setupSheep() {
    const s = $("farmSheep");
    L.onTap(s, () => {
      L.beep(360, 0.2, "triangle");
      L.haptic(6);
      L.say("Baa!");
      s.classList.add("farm-react");
      setT(420, () => s.classList.remove("farm-react"));
    });
  }

  function setupShears() {
    const tool = $("farmShears");
    if (!tool) return;
    setupToolDrag(tool, (clientX, clientY) => {
      if (overEl(clientX, clientY, $("farmSheep"))) {
        shearSheep(clientX, clientY);
      }
    });
  }

  function shearSheep(x, y) {
    L.beep(380, 0.06, "sawtooth");
    L.beep(320, 0.05, "sawtooth", 0.06);
    L.beep(360, 0.05, "sawtooth", 0.12);
    L.haptic(8);
    L.say("Shear shear!");
    const sheepEl = $("farmSheep");
    sheepEl.classList.add("farm-react");
    setT(420, () => sheepEl.classList.remove("farm-react"));
    // Wool puff floats up
    const puff = document.createElement("div");
    puff.className = "farm-wool";
    puff.textContent = "☁️";
    puff.style.left = (x - 24) + "px";
    puff.style.top  = (y - 24) + "px";
    document.body.appendChild(puff);
    setTimeout(() => puff.remove(), 1500);
    bumpCare();
  }

  // ====================================================================
  //  Pig: drag slop bowl onto him; feed 3 times to fully feed
  // ====================================================================
  function setupPig() {
    const p = $("farmPig");
    L.onTap(p, () => {
      L.beep(280, 0.12, "triangle");
      L.beep(240, 0.10, "triangle", 0.1);
      L.haptic(6);
      L.say("Oink oink!");
      p.classList.add("farm-react");
      setT(420, () => p.classList.remove("farm-react"));
    });
  }

  function setupSlop() {
    const tool = $("farmSlop");
    if (!tool) return;
    setupToolDrag(tool, (clientX, clientY) => {
      if (overEl(clientX, clientY, $("farmPig"))) {
        feedPig(clientX, clientY);
      }
    });
  }

  function feedPig(x, y) {
    pigFedCount += 1;
    L.beep(440, 0.06, "triangle");
    L.beep(320, 0.10, "triangle", 0.07);
    L.haptic(7);
    if (pigFedCount % PIG_FEED_THRESHOLD === 0) {
      L.say("All full! Yum!");
      L.happySound();
    } else {
      L.say("Slurp slurp!");
    }
    const pigEl = $("farmPig");
    pigEl.classList.add("farm-react");
    setT(420, () => pigEl.classList.remove("farm-react"));
    // Drop a slop droplet for feedback
    const drop = document.createElement("div");
    drop.className = "farm-slop-drop";
    drop.style.left = (x - 12) + "px";
    drop.style.top  = (y - 12) + "px";
    document.body.appendChild(drop);
    setTimeout(() => drop.remove(), 700);
    bumpCare();
  }

  // ====================================================================
  //  Horse: drag a carrot onto him
  // ====================================================================
  function setupHorse() {
    const h = $("farmHorse");
    L.onTap(h, () => {
      L.beep(440, 0.18, "triangle");
      L.say("Neigh!");
      L.haptic(7);
      h.classList.add("farm-react");
      setT(420, () => h.classList.remove("farm-react"));
    });
  }

  function setupCarrot() {
    const tool = $("farmCarrot");
    if (!tool) return;
    setupToolDrag(tool, (clientX, clientY) => {
      if (overEl(clientX, clientY, $("farmHorse"))) {
        feedHorse();
      }
    });
  }

  function feedHorse() {
    L.beep(500, 0.06, "triangle");
    L.beep(580, 0.06, "triangle", 0.07);
    L.haptic(7);
    L.say("Munch munch!");
    L.happySound();
    const h = $("farmHorse");
    h.classList.add("farm-react");
    setT(420, () => h.classList.remove("farm-react"));
    bumpCare();
  }

  // ====================================================================
  //  Dog: drag ball; he runs and fetches
  // ====================================================================
  function setupDog() {
    const d = $("farmDog");
    L.onTap(d, () => {
      L.beep(580, 0.08, "triangle");
      L.beep(720, 0.08, "triangle", 0.06);
      L.haptic(7);
      L.say("Woof woof!");
      d.classList.add("farm-react");
      setT(420, () => d.classList.remove("farm-react"));
    });
  }

  function setupBall() {
    const tool = $("farmBall");
    if (!tool) return;
    setupToolDrag(tool, (clientX, clientY) => {
      if (overEl(clientX, clientY, $("farmDog"))) {
        playFetch();
      }
    });
  }

  function playFetch() {
    L.beep(640, 0.10, "triangle");
    L.haptic(8);
    L.say("Fetch! Good dog!");
    L.happySound();
    const d = $("farmDog");
    d.classList.add("farm-fetch");
    setT(1300, () => d.classList.remove("farm-fetch"));
    bumpCare();
  }

  // ====================================================================
  //  Ducks: paddle around the pond, tap to quack
  // ====================================================================
  function setupDucks() {
    document.querySelectorAll(".farm-duck").forEach((d, i) => {
      d.style.setProperty("--delay", (i * 2) + "s");
      L.onTap(d, () => {
        L.beep(700, 0.06, "triangle");
        L.beep(580, 0.08, "triangle", 0.07);
        L.haptic(5);
        L.say("Quack quack!");
        d.classList.add("farm-react");
        setT(420, () => d.classList.remove("farm-react"));
      });
    });
  }

  // ====================================================================
  //  Apple tree: tap an apple to pick
  // ====================================================================
  function setupAppleTree() {
    const tree = $("farmTree");
    L.onTap(tree, () => {
      // tap the trunk → leaves rustle
      L.beep(300, 0.08, "sine");
      tree.classList.add("farm-react");
      setT(420, () => tree.classList.remove("farm-react"));
    });
  }

  function spawnInitialApples() {
    for (let i = 0; i < 5; i++) spawnApple(i);
  }

  function spawnApple(i) {
    const cont = $("farmApples");
    if (!cont) return;
    if (cont.children.length >= 5) return;
    const a = document.createElement("button");
    a.className = "farm-apple";
    a.setAttribute("aria-label", "Apple");
    a.innerHTML = appleSvg();
    // Two rows, far enough apart that a toddler's finger (and WCAG 2.2's
    // 24px target rule) can tell them apart.
    const positions = [
      { x: 16, y: 16 }, { x: 50, y: 12 }, { x: 84, y: 16 },
      { x: 32, y: 58 }, { x: 68, y: 58 },
    ];
    const p = positions[i % positions.length];
    a.style.left = p.x + "%";
    a.style.top  = p.y + "%";
    cont.appendChild(a);
    L.onTap(a, (ev) => {
      L.beep(620, 0.07, "triangle");
      L.haptic(6);
      L.say("Apple!");
      const pt = L.pointOf(ev);
      L.sparkleAt(pt.x, pt.y);
      a.classList.add("farm-apple-fall");
      bumpCare();
      setT(800, () => a.remove());
      setT(APPLE_RESPAWN_MS, () => spawnApple(i));
    });
  }

  // ====================================================================
  //  Pond fish: drop the fishing rod over the pond to catch
  // ====================================================================
  function setupPond() {
    L.onTap($("farmDucks") || document.body, () => {
      // wave-tap on pond — covered above on duck taps, but this hook
      // keeps a "tap the pond" outcome too.
    });
  }

  function spawnInitialFish() {
    for (let i = 0; i < 3; i++) spawnFish(i);
  }

  function spawnFish(i) {
    const cont = $("farmFish");
    if (!cont) return;
    const colors = ["#ff8ab0", "#fab005", "#74c0fc", "#da77f2", "#fa5252"];
    const f = document.createElement("button");
    f.className = "farm-fish";
    // A swimming poke-toy under the horse/tractor/ducks: pointer-only.
    f.setAttribute("aria-hidden", "true");
    f.setAttribute("tabindex", "-1");
    f.innerHTML = fishSvg(colors[i % colors.length]);
    f.style.setProperty("--delay", (i * 1.5) + "s");
    // Fixed lanes (row + start column) so the three fish never stack on
    // each other — random depths used to overlap, and with reduced motion
    // they'd all sit at the same spot.
    f.style.setProperty("--top",  [6, 38, 68][i % 3] + "%");
    f.style.setProperty("--left", [0, 30, 60][i % 3] + "%");
    cont.appendChild(f);
    L.onTap(f, () => {
      L.beep(620, 0.06, "sine");
      L.beep(800, 0.06, "sine", 0.06);
      L.haptic(5);
      L.say("Fish!");
      f.classList.add("farm-react");
      setT(420, () => f.classList.remove("farm-react"));
    });
  }

  function setupRod() {
    const tool = $("farmRod");
    if (!tool) return;
    setupToolDrag(tool, (clientX, clientY) => {
      const pond = document.querySelector(".farm-pond");
      if (overEl(clientX, clientY, pond)) {
        castRod(clientX, clientY);
      }
    });
  }

  function castRod(x, y) {
    L.beep(720, 0.05, "sine");
    L.beep(540, 0.07, "sine", 0.06);
    L.haptic(7);
    // Splash effect
    for (let k = 0; k < 6; k++) {
      setT(k * 60, () => {
        const sp = document.createElement("div");
        sp.className = "farm-splash";
        sp.textContent = "💦";
        sp.style.left = (x - 24 + (Math.random() - 0.5) * 60) + "px";
        sp.style.top  = (y - 8) + "px";
        document.body.appendChild(sp);
        setTimeout(() => sp.remove(), 700);
      });
    }
    // 70% catch a fish
    if (Math.random() < 0.7) {
      L.say("Caught a fish!");
      L.happySound();
      bumpCare();
      // A fish flies up
      const colors = ["#ff8ab0", "#fab005", "#74c0fc", "#da77f2"];
      const f = document.createElement("div");
      f.className = "farm-caught-fish";
      f.innerHTML = fishSvg(colors[Math.floor(Math.random() * colors.length)]);
      f.style.left = (x - 40) + "px";
      f.style.top  = (y - 40) + "px";
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 1400);
    } else {
      L.say("Try again!");
    }
  }

  // ====================================================================
  //  Tractor: tap to drive it across the field
  // ====================================================================
  function setupTractor() {
    const t = $("farmTractor");
    L.onTap(t, () => {
      if (t.classList.contains("farm-tractor-driving")) return;
      L.beep(200, 0.18, "sawtooth");
      L.beep(180, 0.18, "sawtooth", 0.18);
      L.beep(200, 0.18, "sawtooth", 0.36);
      L.haptic([20, 80, 20]);
      L.say("Vroom vroom!");
      t.classList.add("farm-tractor-driving");
      setT(4_500, () => t.classList.remove("farm-tractor-driving"));
      bumpCare();
    });
  }

  // ====================================================================
  //  Sun / clouds / stars
  // ====================================================================
  function setupSun() {
    const sun = $("farmSunMoon");
    L.onTap(sun, () => {
      L.beep(880, 0.10, "sine");
      L.say(dayPhase >= 2 ? "Stars!" : "Sunshine!");
      sun.classList.remove("spinning");
      void sun.offsetWidth;
      sun.classList.add("spinning");
      setT(900, () => sun.classList.remove("spinning"));
    });
  }

  function setupClouds() {
    document.querySelectorAll(".farm-cloud").forEach((c) => {
      L.onTap(c, () => {
        L.beep(620, 0.08, "sine");
        L.say("Cloud!");
      });
    });
  }

  // ====================================================================
  //  Day/night cycle
  // ====================================================================
  function startDayCycle() {
    applyDay();
    dayTimer = setInterval(() => {
      dayPhase = (dayPhase + 1) % 4;
      applyDay();
    }, DAY_CYCLE_MS);
  }

  function applyDay() {
    const sky = $("farmSky");
    const sun = $("farmSunMoon");
    const stars = $("farmStars");
    if (!sky || !sun) return;
    const phases = [
      { bg: "linear-gradient(180deg, #a5d8ff 0%, #ffe066 80%, #fff3bf 100%)",  body: sunSvg(),  stars: false }, // morning
      { bg: "linear-gradient(180deg, #74c0fc 0%, #a5d8ff 60%, #d0ebff 100%)",  body: sunSvg(),  stars: false }, // noon
      { bg: "linear-gradient(180deg, #ffd6a5 0%, #ffa94d 60%, #ff8787 100%)",  body: sunSvg(),  stars: false }, // sunset
      { bg: "linear-gradient(180deg, #1c1138 0%, #2e1b5b 50%, #4a1b5e 100%)",  body: moonSvg(), stars: true  }, // night
    ];
    const p = phases[dayPhase % phases.length];
    sky.style.background = p.bg;
    sun.innerHTML = p.body;
    if (stars) {
      stars.innerHTML = "";
      if (p.stars) {
        for (let i = 0; i < 18; i++) {
          const s = document.createElement("div");
          s.className = "farm-star";
          s.style.left = (Math.random() * 100) + "%";
          s.style.top  = (Math.random() * 90) + "%";
          s.style.animationDelay = (Math.random() * 3) + "s";
          stars.appendChild(s);
        }
      }
    }
  }

  // ====================================================================
  //  Weather (rain showers)
  // ====================================================================
  function startWeatherCycle() {
    weatherTimer = setT(RAIN_MIN_INTERVAL_MS + Math.random() * 30_000, () => {
      startRain();
    });
  }

  function startRain() {
    const cont = $("farmRain");
    if (!cont) return;
    cont.classList.add("on");
    rainStart = Date.now();
    L.say("It's raining on the farm!");
    L.beep(700, 0.6, "sine");
    L.beep(900, 0.5, "triangle", 0.15);
    for (let i = 0; i < 40; i++) {
      const r = document.createElement("div");
      r.className = "farm-rain-drop";
      r.style.left = (Math.random() * 100) + "%";
      r.style.animationDelay = (Math.random() * 1.6) + "s";
      r.style.animationDuration = (0.8 + Math.random() * 0.6) + "s";
      cont.appendChild(r);
    }
    setT(RAIN_DURATION_MS, () => stopRain());
  }

  function stopRain() {
    const cont = $("farmRain");
    if (cont) {
      cont.classList.remove("on");
      cont.innerHTML = "";
    }
    weatherTimer = setT(RAIN_MIN_INTERVAL_MS + Math.random() * 40_000, () => startRain());
  }

  // ====================================================================
  //  Shared tool-drag helper (every tool snaps back to its rack slot)
  // ====================================================================
  function setupToolDrag(tool, onDropHandler) {
    let dragging = false;
    tool.addEventListener("pointerdown", (e) => {
      dragging = true;
      tool.setPointerCapture?.(e.pointerId);
      tool.classList.add("grabbed");
      e.preventDefault();
    });
    tool.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      tool.style.position = "fixed";
      tool.style.left   = (e.clientX - tool.offsetWidth / 2) + "px";
      tool.style.top    = (e.clientY - tool.offsetHeight / 2) + "px";
      tool.style.right  = "auto";
      tool.style.bottom = "auto";
      onDropHandler && onDropHandler(e.clientX, e.clientY);
    });
    const releaseAndSnap = (e) => {
      if (!dragging) return;
      dragging = false;
      tool.classList.remove("grabbed");
      tool.style.position = "";
      tool.style.left = "";
      tool.style.top = "";
      tool.style.right = "";
      tool.style.bottom = "";
    };
    tool.addEventListener("pointerup",     releaseAndSnap);
    tool.addEventListener("pointercancel", releaseAndSnap);
    // No-drag path: tap the tool, then tap the animal (or the pond).
    const HINTS = {
      farmBucket: "Now tap the cow!",   farmShears: "Now tap the sheep!",
      farmCarrot: "Now tap the horse!", farmSlop:   "Now tap the pig!",
      farmBall:   "Now tap the dog!",   farmRod:    "Now tap the pond!",
    };
    L.tapToUse(tool, { onUse: (x, y) => onDropHandler && onDropHandler(x, y), hint: HINTS[tool.id] });
  }

  function overEl(x, y, el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  // ====================================================================
  //  Lifecycle
  // ====================================================================
  function start() {
    totalCares = 0;
    celebrated = false;
    bestAtStart = L.getHighScore("farmBest");
    dayPhase = 0;
    bucketMilkLevel = 0;
    pigFedCount = 0;
    clearAll();
    if (dayTimer)     { clearInterval(dayTimer); dayTimer = null; }
    if (weatherTimer) { clearTimeout(weatherTimer); weatherTimer = null; }
    build();
    L.bumpBadge("farmScoreVal", 0);
    refreshBestBadge();
    L.say("Welcome to the farm!");
  }

  function stop() {
    clearAll();
    if (dayTimer)     { clearInterval(dayTimer); dayTimer = null; }
    if (weatherTimer) { clearTimeout(weatherTimer); weatherTimer = null; }
  }

  L.games.farm = { screen: "farmGame", start, stop };
})();
