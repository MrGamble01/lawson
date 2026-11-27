// Illustrated stickers for Lawson's Dollhouse. Original storybook cats
// and props — layered shapes, highlights, and soft shadows. No kid name
// is ever written into these strings.
(function () {
  function svg(body, box) {
    const doc = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + box + '" aria-hidden="true">' + body + "</svg>",
      "image/svg+xml"
    );
    const root = doc.documentElement;
    if (!root || root.nodeName === "parsererror") return document.createElement("span");
    return document.importNode(root, true);
  }

  function face(cx, cy, r, fur) {
    const e = r * 0.95;
    return [
      '<path d="M' + (cx - r * 0.85) + " " + (cy - r * 0.15) + " l" + (-r * 0.2) + " " + (-e) + " l" + (r * 0.9) + " " + (r * 0.7) + 'z" fill="' + fur + '"/>',
      '<path d="M' + (cx + r * 0.85) + " " + (cy - r * 0.15) + " l" + (r * 0.2) + " " + (-e) + " l" + (-r * 0.9) + " " + (r * 0.7) + 'z" fill="' + fur + '"/>',
      '<path d="M' + (cx - r * 0.7) + " " + (cy - r * 0.35) + " l" + (-r * 0.05) + " " + (-r * 0.55) + " l" + (r * 0.45) + " " + (r * 0.4) + 'z" fill="#ff9bb5"/>',
      '<path d="M' + (cx + r * 0.7) + " " + (cy - r * 0.35) + " l" + (r * 0.05) + " " + (-r * 0.55) + " l" + (-r * 0.45) + " " + (r * 0.4) + 'z" fill="#ff9bb5"/>',
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fur + '"/>',
      '<ellipse cx="' + cx + '" cy="' + (cy + r * 0.28) + '" rx="' + (r * 0.48) + '" ry="' + (r * 0.34) + '" fill="#ffe7c4"/>',
      '<ellipse cx="' + (cx - r * 0.36) + '" cy="' + (cy - r * 0.08) + '" rx="' + (r * 0.22) + '" ry="' + (r * 0.26) + '" fill="#fff"/>',
      '<ellipse cx="' + (cx + r * 0.36) + '" cy="' + (cy - r * 0.08) + '" rx="' + (r * 0.22) + '" ry="' + (r * 0.26) + '" fill="#fff"/>',
      '<circle cx="' + (cx - r * 0.3) + '" cy="' + (cy - r * 0.02) + '" r="' + (r * 0.1) + '" fill="#3a2a22"/>',
      '<circle cx="' + (cx + r * 0.42) + '" cy="' + (cy - r * 0.02) + '" r="' + (r * 0.1) + '" fill="#3a2a22"/>',
      '<circle cx="' + (cx - r * 0.26) + '" cy="' + (cy - r * 0.08) + '" r="' + (r * 0.04) + '" fill="#fff"/>',
      '<circle cx="' + (cx + r * 0.46) + '" cy="' + (cy - r * 0.08) + '" r="' + (r * 0.04) + '" fill="#fff"/>',
      '<path d="M' + (cx - r * 0.18) + " " + (cy + r * 0.42) + " q" + (r * 0.18) + " " + (r * 0.2) + " " + (r * 0.36) + ' 0" fill="none" stroke="#3a2a22" stroke-width="' + Math.max(1.2, r * 0.08) + '" stroke-linecap="round"/>',
      '<ellipse cx="' + (cx - r * 0.72) + '" cy="' + (cy + r * 0.22) + '" rx="' + (r * 0.16) + '" ry="' + (r * 0.1) + '" fill="#ff8fab" opacity="0.8"/>',
      '<ellipse cx="' + (cx + r * 0.72) + '" cy="' + (cy + r * 0.22) + '" rx="' + (r * 0.16) + '" ry="' + (r * 0.1) + '" fill="#ff8fab" opacity="0.8"/>',
    ].join("");
  }

  const GLYPH = {
    "🐱": face(40, 44, 26, "#ffb15a") + '<ellipse cx="40" cy="74" rx="16" ry="4" fill="rgba(80,40,20,0.15)"/>',
    "🐼": face(40, 44, 26, "#f7f3ee") + '<ellipse cx="28" cy="42" rx="8" ry="9" fill="#3a2a22"/><ellipse cx="52" cy="42" rx="8" ry="9" fill="#3a2a22"/><circle cx="30" cy="43" r="2.2" fill="#fff"/><circle cx="54" cy="43" r="2.2" fill="#fff"/>',
    "🐭": '<ellipse cx="40" cy="74" rx="14" ry="4" fill="rgba(80,40,20,0.15)"/><ellipse cx="18" cy="28" rx="10" ry="12" fill="#ffb3c7"/><ellipse cx="62" cy="28" rx="10" ry="12" fill="#ffb3c7"/><ellipse cx="18" cy="28" rx="5" ry="7" fill="#ff8fab"/><ellipse cx="62" cy="28" rx="5" ry="7" fill="#ff8fab"/>' + face(40, 46, 22, "#c9b6d6"),
    "📬": '<rect x="10" y="24" width="60" height="42" rx="6" fill="#4dabf7"/><path d="M10 30 l30 20 l30-20" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><rect x="34" y="14" width="12" height="16" rx="2" fill="#ffd43b"/><path d="M36 18 h8 M36 22 h8" stroke="#e67700" stroke-width="1.4"/>',
    "👂": '<path d="M40 10c-16 0-26 16-26 34 0 14 8 26 18 30 2-8 4-14 8-14s6 6 8 14c10-4 18-16 18-30 0-18-10-34-26-34z" fill="#ffb15a"/><path d="M40 22c-8 0-14 10-14 20 0 8 4 14 8 16 2-6 3-8 6-8s4 2 6 8c4-2 8-8 8-16 0-10-6-20-14-20z" fill="#ff9bb5"/>',
    "⏭️": '<circle cx="40" cy="40" r="28" fill="#ffe8a3" stroke="#e67700" stroke-width="4"/><path d="M30 26 l16 14 l-16 14z M46 26 v28" fill="#e67700"/>',
    "🏠": '<path d="M10 38 L40 14 L70 38 V66 H10Z" fill="#fff4e4" stroke="#6b3a28" stroke-width="3"/><path d="M8 40 L40 12 L72 40" fill="none" stroke="#e35d6a" stroke-width="8" stroke-linejoin="round"/><rect x="34" y="44" width="14" height="22" rx="2" fill="#c2255c"/><circle cx="44" cy="55" r="1.4" fill="#ffd43b"/>',
    "⭐": '<polygon points="40,8 48,30 72,30 52,44 60,68 40,54 20,68 28,44 8,30 32,30" fill="#ffd43b" stroke="#f08c00" stroke-width="2" stroke-linejoin="round"/><polygon points="40,18 44,32 58,32 47,40 51,54 40,46 29,54 33,40 22,32 36,32" fill="#fff3bf"/>',
    "💎": '<path d="M40 8 L68 30 L40 74 L12 30Z" fill="#74c0fc" stroke="#1c7ed6" stroke-width="3"/><path d="M12 30 H68 L52 18 H28Z" fill="#a5d8ff"/><path d="M28 18 L40 8 L52 18 L40 30Z" fill="#d0ebff"/>',
    "🧁": '<path d="M28 62c-8 0-12-8-12-16 2-2 8-4 12-4s10 2 12 4c0 8-4 16-12 16z" fill="#e64980"/><ellipse cx="28" cy="42" rx="16" ry="9" fill="#ff8ab8"/><ellipse cx="22" cy="38" rx="5" ry="3" fill="#fff" opacity="0.55"/><circle cx="28" cy="30" r="5" fill="#fa5252"/><path d="M26 24 h6 l-1 6 h-4z" fill="#2f9e44"/>' + face(54, 48, 16, "#ffb15a"),
    "📦": '<path d="M12 40 h56 v26 h-56z" fill="#e7b15a" stroke="#a86b20" stroke-width="2"/><path d="M12 40 l28-16 l28 16" fill="#f6d48a" stroke="#a86b20" stroke-width="2"/><path d="M40 24 v42" stroke="#a86b20" stroke-width="2"/>' + face(40, 34, 14, "#ffb15a"),
    "🎧": face(40, 48, 22, "#b197fc") + '<path d="M14 44 a26 20 0 0 1 52 0" fill="none" stroke="#5f3dc4" stroke-width="6"/><rect x="8" y="40" width="14" height="20" rx="5" fill="#5f3dc4"/><rect x="58" y="40" width="14" height="20" rx="5" fill="#5f3dc4"/><circle cx="15" cy="48" r="3" fill="#d0bfff"/><circle cx="65" cy="48" r="3" fill="#d0bfff"/>',
    "🛁": '<path d="M8 44 h64 v10 c0 12-12 18-32 18s-32-6-32-18z" fill="#fff" stroke="#4dabf7" stroke-width="3"/><path d="M14 44 h52 v8 c0 8-10 12-26 12s-26-4-26-12z" fill="#a5d8ff"/><circle cx="22" cy="48" r="3" fill="#fff"/><circle cx="34" cy="46" r="2" fill="#fff"/><rect x="58" y="16" width="6" height="28" rx="3" fill="#dee2e6"/>' + face(36, 36, 14, "#66d9e8"),
    "🧚": '<ellipse cx="14" cy="40" rx="12" ry="20" fill="#b2f2bb"/><ellipse cx="66" cy="40" rx="12" ry="20" fill="#ffc9de"/>' + face(40, 42, 18, "#ffc9e3") + '<path d="M32 60 h16 l-3 12 h-10z" fill="#da77f2"/><circle cx="40" cy="16" r="4" fill="#ffd43b"/><path d="M40 8 v4 M34 12 h4" stroke="#ffd43b" stroke-width="2"/>',
    "🚙": '<rect x="6" y="48" width="68" height="8" rx="3" fill="#868e96"/><path d="M14 48 l10-20 h28 l12 20z" fill="#4dabf7"/><path d="M28 32 h22 l6 16 h-34z" fill="#d0ebff"/><circle cx="22" cy="56" r="7" fill="#343a40"/><circle cx="58" cy="56" r="7" fill="#343a40"/><circle cx="22" cy="56" r="2.4" fill="#ffd43b"/><circle cx="58" cy="56" r="2.4" fill="#ffd43b"/>' + face(40, 28, 12, "#ffb15a"),
    "🛏️": '<path d="M8 50 h64 v14 h-64z" fill="#9775fa"/><path d="M8 44 h30 v20 h-30z" fill="#fff" stroke="#b197fc" stroke-width="2"/>' + face(26, 42, 14, "#d0bfff") + '<path d="M48 28 q8-10 16 0" fill="none" stroke="#ffe066" stroke-width="2"/><circle cx="62" cy="22" r="2" fill="#fff"/>',
    "🍰": '<path d="M16 58 h48 l-6-28 h-36z" fill="#fff" stroke="#e7b8c8" stroke-width="2"/><path d="M22 36 h36 l-4-10 h-28z" fill="#ff8ab8"/><circle cx="40" cy="22" r="5" fill="#fa5252"/><path d="M40 14 v6" stroke="#2f9e44" stroke-width="2"/>',
    "🍪": '<circle cx="40" cy="42" r="22" fill="#e0a15a" stroke="#a86b20" stroke-width="2"/><circle cx="32" cy="36" r="3" fill="#6b3a22"/><circle cx="46" cy="34" r="2.4" fill="#6b3a22"/><circle cx="44" cy="48" r="3" fill="#6b3a22"/><circle cx="32" cy="48" r="2" fill="#6b3a22"/>',
    "💗": '<path d="M40 62 C20 48 12 36 18 26 c6-8 16-6 22 2 c6-8 16-10 22-2 c6 10-2 22-22 36z" fill="#ff8ab8"/>',
    "🍫": '<rect x="18" y="22" width="44" height="36" rx="4" fill="#6b3a22"/><path d="M18 34 h44 M18 46 h44 M32 22 v36 M46 22 v36" stroke="#8a5a3a" stroke-width="2"/>',
    "💙": '<path d="M40 62 C20 48 12 36 18 26 c6-8 16-6 22 2 c6-8 16-10 22-2 c6 10-2 22-22 36z" fill="#4dabf7"/>',
    "🍓": '<path d="M28 30c0 0 4-12 12-12s12 12 12 12c8 4 10 22 0 32-6 8-18 8-24 0-10-10-8-28 0-32z" fill="#fa5252"/><path d="M32 22 h16 l-2 8 h-12z" fill="#2f9e44"/><circle cx="36" cy="42" r="1.3" fill="#fff"/><circle cx="44" cy="48" r="1.3" fill="#fff"/>',
    "🍬": '<rect x="28" y="28" width="24" height="24" rx="6" fill="#ff6b6b"/><path d="M28 34 l-12 6 l12 8z M52 34 l12 6 l-12 8z" fill="#ffd0d0"/><path d="M34 34 h8" stroke="#fff" stroke-width="2" opacity="0.7"/>',
    "🎉": '<path d="M18 62 l14-28 l10 8z" fill="#ffd43b"/><path d="M32 34 l6-16" stroke="#fa5252" stroke-width="3"/><circle cx="52" cy="22" r="4" fill="#ff8ab8"/><circle cx="62" cy="34" r="3" fill="#4dabf7"/><path d="M48 40 l10 4" stroke="#9775fa" stroke-width="3"/>',
    "✨": '<path d="M40 8 l4 16 l16 4 l-16 4 l-4 16 l-4-16 l-16-4 l16-4z" fill="#ffd43b"/><path d="M62 18 l2 6 l6 2 l-6 2 l-2 6 l-2-6 l-6-2 l6-2z" fill="#fff"/>',
    "💖": '<path d="M40 64 C18 48 10 36 16 24 c6-10 16-8 24 2 c8-10 18-12 24-2 c6 12-2 24-24 40z" fill="#ff6b9d" stroke="#fff" stroke-width="3"/>',
    "🌸": '<circle cx="40" cy="28" r="8" fill="#ff8ab8"/><circle cx="28" cy="40" r="8" fill="#ffc9de"/><circle cx="52" cy="40" r="8" fill="#ffc9de"/><circle cx="34" cy="54" r="8" fill="#ff8ab8"/><circle cx="48" cy="54" r="8" fill="#ffdeeb"/><circle cx="40" cy="42" r="6" fill="#ffd43b"/>',
    "●": '<circle cx="40" cy="40" r="22" fill="#fa5252" stroke="#fff" stroke-width="4"/><ellipse cx="32" cy="32" rx="6" ry="4" fill="#fff" opacity="0.45"/>',
    "★": '<polygon points="40,12 46,30 66,30 50,42 56,62 40,50 24,62 30,42 14,30 34,30" fill="#ff922b" stroke="#fff" stroke-width="3"/>',
    "♥": '<path d="M40 62 C22 48 14 36 20 26 c5-8 14-6 20 2 c6-8 15-10 20-2 c6 10-2 22-20 36z" fill="#e64980" stroke="#fff" stroke-width="3"/>',
    "↩️": '<path d="M24 28 a16 16 0 1 1 0 28" fill="none" stroke="#4dabf7" stroke-width="6" stroke-linecap="round"/><path d="M24 18 l-12 12 l12 6z" fill="#4dabf7"/>',
    "🎹": '<rect x="14" y="16" width="52" height="48" rx="6" fill="#fff" stroke="#3a2a22" stroke-width="3"/><path d="M24 16 v28 M36 16 v28 M52 16 v28" stroke="#3a2a22" stroke-width="3"/><rect x="28" y="16" width="8" height="20" rx="1" fill="#3a2a22"/><rect x="44" y="16" width="8" height="20" rx="1" fill="#3a2a22"/>',
    "🔔": '<path d="M40 10 a3 3 0 0 1 3 3 v3 c14 3 18 16 18 26 H19 c0-10 4-23 18-26 v-3 a3 3 0 0 1 3-3z" fill="#ffd43b" stroke="#e67700" stroke-width="3"/><rect x="24" y="42" width="32" height="6" rx="2" fill="#f08c00"/><circle cx="40" cy="58" r="6" fill="#e67700"/><ellipse cx="33" cy="28" rx="4" ry="7" fill="#fff" opacity="0.5"/>',
    "🥁": '<ellipse cx="40" cy="30" rx="24" ry="10" fill="#fff" stroke="#e03131" stroke-width="3"/><path d="M16 30 v16 c0 8 10 14 24 14s24-6 24-14 V30" fill="#fa5252"/><path d="M22 18 l8 8 M58 16 l-10 10" stroke="#e7cbb8" stroke-width="3" stroke-linecap="round"/>',
    "🟪": '<rect x="14" y="14" width="52" height="52" rx="14" fill="#9775fa" stroke="#5f3dc4" stroke-width="4"/><ellipse cx="32" cy="28" rx="10" ry="6" fill="#fff" opacity="0.35"/>',
    "🟩": '<rect x="14" y="14" width="52" height="52" rx="14" fill="#51cf66" stroke="#2b8a3e" stroke-width="4"/><ellipse cx="32" cy="28" rx="10" ry="6" fill="#fff" opacity="0.35"/>',
    "🟨": '<rect x="14" y="14" width="52" height="52" rx="14" fill="#ffd43b" stroke="#e67700" stroke-width="4"/><ellipse cx="32" cy="28" rx="10" ry="6" fill="#fff" opacity="0.4"/>',
    "🟥": '<rect x="14" y="14" width="52" height="52" rx="14" fill="#ff6b6b" stroke="#c92a2a" stroke-width="4"/><ellipse cx="32" cy="28" rx="10" ry="6" fill="#fff" opacity="0.35"/>',
    "🧴": '<rect x="30" y="10" width="20" height="10" rx="3" fill="#ced4da"/><path d="M26 22 h28 l4 46 h-36z" fill="#ffd6e7" stroke="#ff8ab8" stroke-width="2"/><ellipse cx="36" cy="36" rx="4" ry="8" fill="#fff" opacity="0.45"/>',
    "🫧": '<circle cx="28" cy="36" r="12" fill="#d0ebff" stroke="#4dabf7" stroke-width="2"/><circle cx="48" cy="30" r="9" fill="#e7f5ff" stroke="#74c0fc" stroke-width="2"/><circle cx="46" cy="50" r="7" fill="#fff" stroke="#a5d8ff" stroke-width="2"/><circle cx="24" cy="32" r="3" fill="#fff" opacity="0.8"/>',
    "🌹": '<path d="M40 78 V42" stroke="#2f9e44" stroke-width="5"/><ellipse cx="22" cy="62" rx="9" ry="4" fill="#8ce99a"/><ellipse cx="58" cy="58" rx="9" ry="4" fill="#69db7c"/><circle cx="40" cy="26" r="13" fill="#e03131"/><circle cx="26" cy="36" r="12" fill="#fa5252"/><circle cx="54" cy="36" r="12" fill="#c92a2a"/><circle cx="40" cy="40" r="10" fill="#ff8787"/><circle cx="36" cy="36" r="1.6" fill="#3a2a22"/><circle cx="44" cy="36" r="1.6" fill="#3a2a22"/><path d="M36 42 q4 3 8 0" fill="none" stroke="#3a2a22" stroke-width="1.4" stroke-linecap="round"/>',
    "🌷": '<path d="M40 78 V44" stroke="#2f9e44" stroke-width="5"/><ellipse cx="22" cy="64" rx="9" ry="4" fill="#8ce99a"/><ellipse cx="58" cy="60" rx="8" ry="4" fill="#69db7c"/><path d="M40 48 c-18 0-24-20-12-28 6 8 12 12 12 12s6-4 12-12c12 8 6 28-12 28z" fill="#ff8ab8"/><circle cx="35" cy="34" r="1.6" fill="#3a2a22"/><circle cx="45" cy="34" r="1.6" fill="#3a2a22"/><path d="M36 40 q4 3 8 0" fill="none" stroke="#c2255c" stroke-width="1.4" stroke-linecap="round"/>',
    "🌼": '<path d="M40 76 V52" stroke="#2f9e44" stroke-width="5"/><ellipse cx="22" cy="66" rx="9" ry="4" fill="#8ce99a"/><circle cx="22" cy="30" r="11" fill="#fff" stroke="#ffd43b" stroke-width="3"/><circle cx="58" cy="30" r="11" fill="#fff" stroke="#ffd43b" stroke-width="3"/><circle cx="28" cy="50" r="11" fill="#fff" stroke="#ffd43b" stroke-width="3"/><circle cx="52" cy="50" r="11" fill="#fff" stroke="#ffd43b" stroke-width="3"/><circle cx="40" cy="38" r="12" fill="#ffd43b" stroke="#f08c00" stroke-width="2"/><circle cx="36" cy="36" r="1.5" fill="#5c3700"/><circle cx="44" cy="36" r="1.5" fill="#5c3700"/><path d="M36 42 q4 3 8 0" fill="none" stroke="#5c3700" stroke-width="1.4" stroke-linecap="round"/>',
    "🌻": '<path d="M40 78 V56" stroke="#2f9e44" stroke-width="5"/><ellipse cx="18" cy="68" rx="10" ry="5" fill="#8ce99a"/><ellipse cx="62" cy="64" rx="10" ry="5" fill="#69db7c"/><circle cx="18" cy="22" r="11" fill="#fab005"/><circle cx="62" cy="22" r="11" fill="#fab005"/><circle cx="14" cy="42" r="11" fill="#ffd43b"/><circle cx="66" cy="42" r="11" fill="#ffd43b"/><circle cx="40" cy="52" r="11" fill="#f08c00"/><circle cx="40" cy="32" r="14" fill="#6b3a22"/><circle cx="35" cy="30" r="1.6" fill="#fff"/><circle cx="45" cy="30" r="1.6" fill="#fff"/><path d="M35 36 q5 4 10 0" fill="none" stroke="#ffd43b" stroke-width="1.6" stroke-linecap="round"/>',
    "🌟": '<polygon points="40,6 48,28 72,28 52,42 60,66 40,52 20,66 28,42 8,28 32,28" fill="#ff8ab8" stroke="#fff" stroke-width="2"/><polygon points="40,18 44,30 56,30 46,38 50,50 40,42 30,50 34,38 24,30 36,30" fill="#ffe3f0"/>',
    "💧": '<path d="M40 10c10 16 18 26 18 36a18 18 0 0 1-36 0c0-10 8-20 18-36z" fill="#4dabf7"/><ellipse cx="34" cy="40" rx="4" ry="6" fill="#fff" opacity="0.55"/>',
    "⬅️": '<rect x="10" y="22" width="60" height="36" rx="12" fill="#4dabf7"/><path d="M38 30 l-14 10 l14 10z" fill="#fff"/><rect x="36" y="36" width="22" height="8" rx="2" fill="#fff"/>',
    "➡️": '<rect x="10" y="22" width="60" height="36" rx="12" fill="#4dabf7"/><path d="M42 30 l14 10 l-14 10z" fill="#fff"/><rect x="22" y="36" width="22" height="8" rx="2" fill="#fff"/>',
    "🌙": '<path fill-rule="evenodd" d="M18 40a22 22 0 1 0 44 0a22 22 0 1 0-44 0zM36 40a14 14 0 1 1 26 0a14 14 0 1 1-26 0z" fill="#f59f00" stroke="#c2410c" stroke-width="2"/><circle cx="30" cy="34" r="2" fill="#5c3700"/><circle cx="30" cy="46" r="2" fill="#5c3700"/><path d="M26 50 q5 4 9 0" fill="none" stroke="#5c3700" stroke-width="1.6" stroke-linecap="round"/>',
    "🎀": '<circle cx="40" cy="42" r="6" fill="#e64980"/><path d="M40 42 l-22-12 l4 16z M40 42 l-18 14 l12-4z M40 42 l22-12 l-4 16z M40 42 l18 14 l-12-4z" fill="#ff8ab8"/>',
    "😸": face(40, 42, 24, "#ffb15a") + '<path d="M30 50 q4 6 10 2 M50 50 q-4 6-10 2" fill="none" stroke="#3a2a22" stroke-width="1.4"/>',
  };

  function glyph(char) {
    const body = GLYPH[char];
    if (!body) return null;
    return svg(body, "0 0 80 80");
  }

  function scallops(y, fill) {
    let out = "";
    for (let x = -8; x < 370; x += 26) {
      out += '<path d="M' + x + " " + y + " q13-16 26 0 v16 h-26z\" fill=\"" + fill + '"/>';
    }
    return out;
  }

  function roof() {
    return svg(
      '<ellipse cx="48" cy="30" rx="26" ry="12" fill="#fff"/>' +
      '<ellipse cx="70" cy="28" rx="18" ry="10" fill="#fff"/>' +
      '<path d="M102 36 a34 16 0 0 1 44 0" fill="none" stroke="#ff8ab8" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M108 36 a26 12 0 0 1 32 0" fill="none" stroke="#ffd43b" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M114 36 a18 8 0 0 1 20 0" fill="none" stroke="#69db7c" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="316" cy="28" r="16" fill="#ffd43b" stroke="#f08c00" stroke-width="3"/>' +
      '<circle cx="311" cy="26" r="1.7" fill="#5c3700"/><circle cx="321" cy="26" r="1.7" fill="#5c3700"/>' +
      '<path d="M310 33 q6 4 12 0" fill="none" stroke="#5c3700" stroke-width="1.6" stroke-linecap="round"/>' +
      '<defs><clipPath id="dhRoofClip"><path d="M6 132 L180 46 L354 132 Z"/></clipPath></defs>' +
      '<g clip-path="url(#dhRoofClip)">' +
      '<path d="M6 132 L180 46 L354 132 Z" fill="#ff8787"/>' +
      scallops(78, "#fa5252") +
      scallops(100, "#e03131") +
      scallops(122, "#c92a2a") +
      '</g>' +
      '<path d="M148 58 L168 4 L190 52 Z" fill="#ffb15a"/>' +
      '<path d="M158 50 L170 16 L182 48 Z" fill="#ff9bb5"/>' +
      '<path d="M170 52 L192 4 L212 58 Z" fill="#ffb15a"/>' +
      '<path d="M178 48 L190 16 L202 50 Z" fill="#ff9bb5"/>' +
      '<rect x="248" y="62" width="22" height="40" rx="3" fill="#c47a55"/>' +
      '<rect x="242" y="56" width="34" height="10" rx="3" fill="#8a5a3a"/>' +
      '<ellipse cx="268" cy="52" rx="7" ry="4" fill="#fff" opacity="0.9"/>' +
      '<ellipse cx="278" cy="44" rx="9" ry="5" fill="#fff"/>' +
      '<rect x="254" y="74" width="10" height="12" rx="2" fill="#ffe8a3"/>',
      "0 0 360 136"
    );
  }

  function blooms() {
    return svg(
      '<ellipse cx="36" cy="70" rx="10" ry="16" fill="#ff8ab8"/><ellipse cx="26" cy="80" rx="10" ry="14" fill="#ffdeeb"/><ellipse cx="46" cy="80" rx="10" ry="14" fill="#ffdeeb"/><circle cx="36" cy="78" r="6" fill="#ffd43b"/><path d="M36 90 v24" stroke="#2f9e44" stroke-width="4"/>' +
      '<ellipse cx="320" cy="74" rx="12" ry="18" fill="#da77f2"/><ellipse cx="308" cy="86" rx="11" ry="14" fill="#eebefa"/><ellipse cx="332" cy="86" rx="11" ry="14" fill="#eebefa"/><circle cx="320" cy="84" r="6" fill="#fff"/><path d="M320 96 v20" stroke="#2f9e44" stroke-width="4"/>' +
      '<circle cx="70" cy="108" r="7" fill="#ffe066"/><circle cx="90" cy="112" r="6" fill="#ff922b"/><circle cx="250" cy="110" r="7" fill="#ffd43b"/>' +
      '<ellipse cx="150" cy="40" rx="16" ry="8" fill="#b197fc" transform="rotate(-20 150 40)"/><ellipse cx="168" cy="40" rx="16" ry="8" fill="#d0bfff" transform="rotate(18 168 40)"/><circle cx="159" cy="42" r="3" fill="#3a2a22"/>',
      "0 0 360 130"
    );
  }

  function cake(picked) {
    picked = picked || {};
    const base = {
      cake: '<path d="M154 128 h84 l-10-34 h-64z" fill="#fff" stroke="#f3b6cc" stroke-width="3"/><path d="M164 108 h48" stroke="#ffd0e4" stroke-width="5" stroke-linecap="round"/>',
      cupcake: '<path d="M172 128 l10-38 h28 l10 38z" fill="#e64980"/><path d="M186 128 h20" stroke="#fff" stroke-width="3" opacity="0.55"/>',
      cookie: '<circle cx="196" cy="112" r="26" fill="#e0a15a" stroke="#8a5a20" stroke-width="3"/><circle cx="186" cy="104" r="4" fill="#5c3310"/><circle cx="206" cy="100" r="3" fill="#5c3310"/><circle cx="202" cy="118" r="4" fill="#5c3310"/>',
    }[picked.base] || "";
    const frost = {
      pink: '<ellipse cx="196" cy="96" rx="34" ry="13" fill="#ff8ab8"/><ellipse cx="180" cy="90" rx="10" ry="6" fill="#ffe3f0"/>',
      choco: '<ellipse cx="196" cy="96" rx="34" ry="13" fill="#6b3a22"/><ellipse cx="180" cy="90" rx="10" ry="6" fill="#a86b20"/>',
      blue: '<ellipse cx="196" cy="96" rx="34" ry="13" fill="#4dabf7"/><ellipse cx="180" cy="90" rx="10" ry="6" fill="#d0ebff"/>',
    }[picked.frost] || "";
    const top = {
      berry: '<circle cx="196" cy="78" r="10" fill="#fa5252"/><path d="M190 72 h12 l-2 8 h-8z" fill="#2f9e44"/>',
      star: '<polygon points="196,64 202,78 218,78 206,88 210,102 196,94 182,102 186,88 174,78 190,78" fill="#ffd43b" stroke="#e67700" stroke-width="2"/>',
      candy: '<rect x="182" y="70" width="28" height="16" rx="5" fill="#ff6b6b"/><path d="M182 76 l-10 6 10 6z M210 76 l10 6 -10 6z" fill="#ffc9c9"/>',
    }[picked.top] || "";
    const chef =
      '<ellipse cx="92" cy="118" rx="36" ry="24" fill="#ffb15a"/>' +
      '<path d="M68 104 h48 l-4 26 h-40z" fill="#fff" stroke="#f3c1d0" stroke-width="2"/>' +
      '<path d="M80 104 v8 M104 104 v8" stroke="#ff8ab8" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="64" cy="132" rx="12" ry="7" fill="#ffc078"/>' +
      '<ellipse cx="120" cy="132" rx="12" ry="7" fill="#ffc078"/>' +
      face(92, 78, 28, "#ffb15a") +
      '<ellipse cx="92" cy="28" rx="20" ry="12" fill="#fff" stroke="#e7cbb8" stroke-width="2"/>' +
      '<rect x="72" y="36" width="40" height="10" rx="4" fill="#fff" stroke="#e7cbb8" stroke-width="2"/>';
    return svg(
      '<rect x="10" y="136" width="260" height="28" rx="10" fill="#e7b07a"/>' +
      '<rect x="10" y="136" width="260" height="12" rx="6" fill="#f6d7ad"/>' +
      chef +
      '<ellipse cx="196" cy="134" rx="48" ry="10" fill="#fff" stroke="#e7cbb8" stroke-width="3"/>' +
      '<ellipse cx="196" cy="134" rx="30" ry="5" fill="#fff8ee"/>' +
      base + frost + top,
      "0 0 280 172"
    );
  }

  function pillowCat(pj) {
    const accessory = pj === "bow"
      ? '<path d="M168 78 l-18-12 8 14z M168 78 l-14 14 12-2z M196 78 l18-12 -8 14z M196 78 l14 14 -12-2z" fill="#ff8ab8"/><circle cx="182" cy="78" r="6" fill="#e64980"/>'
      : pj === "star"
        ? '<polygon points="214,70 220,84 236,84 224,94 228,108 214,98 200,108 204,94 192,84 208,84" fill="#ffd43b" stroke="#e67700" stroke-width="2"/>'
        : pj === "moon"
          ? '<path d="M210 72 a18 18 0 1 0 0 32 14 14 0 1 1 0-32z" fill="#f59f00" stroke="#c2410c" stroke-width="2"/>'
          : "";
    return svg(
      '<ellipse cx="168" cy="176" rx="118" ry="10" fill="rgba(20,10,40,0.28)"/>' +
      '<rect x="36" y="64" width="22" height="100" rx="8" fill="#6b3a28"/>' +
      '<rect x="262" y="96" width="16" height="68" rx="6" fill="#6b3a28"/>' +
      '<rect x="48" y="108" width="224" height="56" rx="14" fill="#fff"/>' +
      '<rect x="56" y="116" width="200" height="22" rx="8" fill="#f3e8ff"/>' +
      '<ellipse cx="96" cy="124" rx="36" ry="16" fill="#fff" stroke="#d0bfff" stroke-width="3"/>' +
      '<path d="M150 112 h100 v36 c-20 10-80 10-100 0z" fill="#b197fc"/>' +
      '<ellipse cx="176" cy="124" rx="58" ry="20" fill="#d0bfff"/>' +
      '<ellipse cx="112" cy="112" rx="28" ry="18" fill="#d0bfff"/>' +
      '<path d="M94 102 l-8-22 22 14z" fill="#d0bfff"/>' +
      '<path d="M130 102 l8-22 -22 14z" fill="#d0bfff"/>' +
      '<path d="M100 98 l-2-10 10 7z" fill="#ff9bb5"/>' +
      '<path d="M124 98 l2-10 -10 7z" fill="#ff9bb5"/>' +
      '<ellipse cx="112" cy="116" rx="13" ry="8" fill="#ffe7c4"/>' +
      '<path d="M101 112 q5 3 7 0" fill="none" stroke="#3a2a22" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M116 112 q5 3 7 0" fill="none" stroke="#3a2a22" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M106 122 q5 3 9 0" fill="none" stroke="#3a2a22" stroke-width="1.5" stroke-linecap="round"/>' +
      '<ellipse cx="94" cy="118" rx="5" ry="3" fill="#ff8fab" opacity="0.85"/>' +
      '<path d="M220 128 q22 4 16 18" fill="none" stroke="#d0bfff" stroke-width="7" stroke-linecap="round"/>' +
      accessory,
      "0 0 320 200"
    );
  }

  function dj() {
    return svg(
      '<ellipse cx="100" cy="100" rx="70" ry="8" fill="rgba(80,40,90,0.15)"/>' +
      '<rect x="18" y="62" width="28" height="34" rx="6" fill="#343a40"/><circle cx="32" cy="78" r="8" fill="#ffd43b"/><circle cx="32" cy="78" r="3" fill="#343a40"/>' +
      '<rect x="154" y="62" width="28" height="34" rx="6" fill="#343a40"/><circle cx="168" cy="78" r="8" fill="#ff8ab8"/><circle cx="168" cy="78" r="3" fill="#343a40"/>' +
      face(100, 58, 28, "#b197fc") +
      '<path d="M70 56 a30 22 0 0 1 60 0" fill="none" stroke="#5f3dc4" stroke-width="5"/>' +
      '<rect x="62" y="52" width="14" height="18" rx="4" fill="#5f3dc4"/>' +
      '<rect x="124" y="52" width="14" height="18" rx="4" fill="#5f3dc4"/>' +
      '<path d="M28 18 v16 M28 18 q10 0 10 8" fill="none" stroke="#845ef7" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="28" cy="36" r="3" fill="#845ef7"/>' +
      '<path d="M176 16 v14 M176 16 q8 0 8 7" fill="none" stroke="#ff8ab8" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="176" cy="32" r="3" fill="#ff8ab8"/>',
      "0 0 200 110"
    );
  }

  function tubFriend() {
    return svg(
      '<ellipse cx="160" cy="176" rx="118" ry="12" fill="rgba(70,110,150,0.18)"/>' +
      '<path d="M32 86 h256 v28 c0 42-52 64-128 64S32 156 32 114z" fill="#fff" stroke="#4dabf7" stroke-width="6"/>' +
      '<rect x="54" y="166" width="12" height="16" rx="3" fill="#adb5bd"/>' +
      '<rect x="254" y="166" width="12" height="16" rx="3" fill="#adb5bd"/>' +
      '<path d="M46 108 h228 v14 c0 30-44 48-114 48S46 152 46 122z" fill="#a5d8ff"/>' +
      '<path d="M50 108 q54 12 110 0 t110 0" fill="none" stroke="#fff" stroke-width="4" opacity="0.75"/>' +
      '<path d="M188 124 q36-4 30 22" fill="none" stroke="#66d9e8" stroke-width="10" stroke-linecap="round"/>' +
      '<ellipse cx="148" cy="128" rx="46" ry="18" fill="#66d9e8"/>' +
      '<rect x="246" y="28" width="12" height="58" rx="4" fill="#dee2e6" stroke="#adb5bd" stroke-width="2"/>' +
      '<path d="M252 86 v10" stroke="#4dabf7" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="252" cy="22" r="8" fill="#ffd43b" stroke="#e67700" stroke-width="2"/>' +
      face(132, 92, 30, "#66d9e8") +
      '<ellipse cx="214" cy="112" rx="16" ry="11" fill="#ffd43b"/>' +
      '<circle cx="226" cy="104" r="8" fill="#ffd43b"/>' +
      '<path d="M232 104 l10 3 -10 3z" fill="#f08c00"/>' +
      '<circle cx="228" cy="102" r="1.5" fill="#3a2a22"/>' +
      '<circle cx="70" cy="96" r="9" fill="#fff" stroke="#74c0fc" stroke-width="2"/>' +
      '<circle cx="90" cy="80" r="6" fill="#fff" stroke="#a5d8ff" stroke-width="2"/>' +
      '<circle cx="58" cy="114" r="5" fill="#fff" opacity="0.85"/>',
      "0 0 320 190"
    );
  }

  function craftPal() {
    return svg(
      '<path d="M14 36 h44 v28 h-44z" fill="#e7b15a"/><path d="M14 36 l22-14 l22 14" fill="#f0c98a"/>' +
      face(36, 30, 12, "#ffb15a"),
      "0 0 70 70"
    );
  }

  window.LawsonDollArt = { glyph: glyph, roof: roof, blooms: blooms, cake: cake, pillowCat: pillowCat, dj: dj, tubFriend: tubFriend, craftPal: craftPal };
})();
