// Illustrated stickers for Lawson's Dollhouse. Original storybook cats
// and props — layered shapes, highlights, and soft shadows. No kid name
// is ever written into these strings.
(function () {
  function svg(body, box, fit) {
    const doc = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + box + '" aria-hidden="true">' + body + "</svg>",
      "image/svg+xml"
    );
    const root = doc.documentElement;
    if (!root || root.nodeName === "parsererror") return document.createElement("span");
    if (fit) root.setAttribute("preserveAspectRatio", fit);
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
    "🧴": '<rect x="32" y="8" width="16" height="12" rx="3" fill="#ced4da"/><path d="M26 22 h28 l4 46 h-36z" fill="#ff8ab8" stroke="#e64980" stroke-width="2"/><ellipse cx="36" cy="38" rx="4" ry="8" fill="#fff" opacity="0.45"/>',
    "🫧": '<circle cx="28" cy="36" r="12" fill="#d0ebff" stroke="#4dabf7" stroke-width="2"/><circle cx="48" cy="30" r="9" fill="#e7f5ff" stroke="#74c0fc" stroke-width="2"/><circle cx="46" cy="50" r="7" fill="#fff" stroke="#a5d8ff" stroke-width="2"/><circle cx="24" cy="32" r="3" fill="#fff" opacity="0.8"/>',
    "🌹": '<ellipse cx="40" cy="74" rx="22" ry="6" fill="#69db7c"/><path d="M40 72 C36 58 46 48 40 34" fill="none" stroke="#2f9e44" stroke-width="4" stroke-linecap="round"/><path d="M39 58 C26 52 22 62 34 66 Z" fill="#8ce99a"/><path d="M41 48 C56 42 60 54 46 58 Z" fill="#2f9e44"/><ellipse cx="26" cy="30" rx="11" ry="9" fill="#fa5252" transform="rotate(-24 26 30)"/><ellipse cx="54" cy="30" rx="11" ry="9" fill="#e03131" transform="rotate(24 54 30)"/><ellipse cx="40" cy="22" rx="12" ry="9" fill="#ff6b6b"/><ellipse cx="32" cy="36" rx="10" ry="8" fill="#c92a2a"/><ellipse cx="48" cy="36" rx="10" ry="8" fill="#fa5252"/><circle cx="40" cy="34" r="8" fill="#ff8787"/><circle cx="37" cy="33" r="1.4" fill="#3a2a22"/><circle cx="43" cy="33" r="1.4" fill="#3a2a22"/><path d="M37 38 q3 3 6 0" fill="none" stroke="#3a2a22" stroke-width="1.3" stroke-linecap="round"/>',
    "🌷": '<ellipse cx="40" cy="74" rx="22" ry="6" fill="#8ce99a"/><path d="M40 72 C34 56 42 46 40 32" fill="none" stroke="#2f9e44" stroke-width="4" stroke-linecap="round"/><path d="M39 60 C24 54 22 66 36 68 Z" fill="#69db7c"/><path d="M41 48 C54 40 62 52 48 58 Z" fill="#2f9e44"/><path d="M40 46 C22 44 18 22 40 16 C62 22 58 44 40 46 Z" fill="#ff8ab8"/><path d="M40 46 C30 36 32 20 40 16 C48 20 50 36 40 46 Z" fill="#ffc9de"/><circle cx="35" cy="32" r="1.5" fill="#3a2a22"/><circle cx="45" cy="32" r="1.5" fill="#3a2a22"/><path d="M36 38 q4 3 8 0" fill="none" stroke="#c2255c" stroke-width="1.4" stroke-linecap="round"/>',
    "🌼": '<ellipse cx="40" cy="74" rx="22" ry="6" fill="#b2f2bb"/><path d="M40 72 C44 58 36 50 40 36" fill="none" stroke="#2f9e44" stroke-width="4" stroke-linecap="round"/><path d="M40 58 C26 50 20 60 34 66 Z" fill="#69db7c"/><path d="M40 48 C54 42 62 54 48 60 Z" fill="#2f9e44"/><ellipse cx="22" cy="28" rx="10" ry="14" fill="#fff" stroke="#ffd43b" stroke-width="2" transform="rotate(-20 22 28)"/><ellipse cx="58" cy="28" rx="10" ry="14" fill="#fff" stroke="#ffd43b" stroke-width="2" transform="rotate(20 58 28)"/><ellipse cx="30" cy="46" rx="10" ry="13" fill="#fff" stroke="#ffe066" stroke-width="2"/><ellipse cx="50" cy="46" rx="10" ry="13" fill="#fff" stroke="#ffe066" stroke-width="2"/><circle cx="40" cy="34" r="11" fill="#ffd43b" stroke="#f08c00" stroke-width="2"/><circle cx="36" cy="33" r="1.4" fill="#5c3700"/><circle cx="44" cy="33" r="1.4" fill="#5c3700"/><path d="M36 38 q4 3 8 0" fill="none" stroke="#5c3700" stroke-width="1.4" stroke-linecap="round"/>',
    "🌻": '<ellipse cx="40" cy="74" rx="22" ry="6" fill="#8ce99a"/><path d="M40 72 C36 56 46 48 40 34" fill="none" stroke="#2f9e44" stroke-width="5" stroke-linecap="round"/><path d="M40 62 C22 54 16 66 34 70 Z" fill="#69db7c"/><path d="M40 50 C58 42 66 56 48 62 Z" fill="#2f9e44"/><ellipse cx="18" cy="24" rx="11" ry="14" fill="#fab005" transform="rotate(-30 18 24)"/><ellipse cx="62" cy="24" rx="11" ry="14" fill="#f08c00" transform="rotate(30 62 24)"/><ellipse cx="24" cy="44" rx="11" ry="13" fill="#ffd43b"/><ellipse cx="56" cy="44" rx="11" ry="13" fill="#ffd43b"/><ellipse cx="40" cy="18" rx="12" ry="10" fill="#fab005"/><circle cx="40" cy="32" r="13" fill="#6b3a22"/><circle cx="35" cy="30" r="1.6" fill="#fff"/><circle cx="45" cy="30" r="1.6" fill="#fff"/><path d="M35 36 q5 4 10 0" fill="none" stroke="#ffd43b" stroke-width="1.6" stroke-linecap="round"/>',
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

  function scallops(y, fill, width) {
    let out = "";
    for (let x = -16; x < width; x += 36) {
      out += '<path d="M' + x + " " + y + " q18-20 36 0 v22 h-36z\" fill=\"" + fill + '"/>';
    }
    return out;
  }

  function roof() {
    const wrap = document.createElement("span");
    wrap.className = "dh-roof-art";
    const shingles = svg(
      '<path d="M0 80 L500 6 L1000 80 Z" fill="#ff8787"/>' +
      scallops(28, "#fa5252", 1000) +
      scallops(50, "#e03131", 1000) +
      scallops(72, "#c92a2a", 1000),
      "0 0 1000 80"
    );
    shingles.setAttribute("preserveAspectRatio", "none");
    shingles.setAttribute("class", "dh-shingles");
    const crown = svg(
      '<ellipse cx="70" cy="78" rx="36" ry="14" fill="#fff"/>' +
      '<ellipse cx="98" cy="74" rx="24" ry="12" fill="#fff"/>' +
      '<path d="M150 70 a40 18 0 0 1 52 0" fill="none" stroke="#ff8ab8" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M158 70 a30 14 0 0 1 36 0" fill="none" stroke="#ffd43b" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M166 70 a20 10 0 0 1 20 0" fill="none" stroke="#69db7c" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M168 96 L198 18 L228 96 Z" fill="#ffb15a"/>' +
      '<path d="M180 84 L198 36 L214 84 Z" fill="#ff9bb5"/>' +
      '<path d="M214 96 L244 18 L274 96 Z" fill="#ffb15a"/>' +
      '<path d="M226 84 L244 36 L260 84 Z" fill="#ff9bb5"/>' +
      '<rect x="300" y="58" width="22" height="36" rx="3" fill="#c47a55"/>' +
      '<rect x="292" y="50" width="38" height="12" rx="3" fill="#8a5a3a"/>' +
      '<ellipse cx="328" cy="44" rx="8" ry="5" fill="#fff"/>' +
      '<rect x="306" y="68" width="10" height="12" rx="2" fill="#ffe8a3"/>',
      "0 0 400 120"
    );
    crown.setAttribute("class", "dh-crown");
    const sun = svg(
      '<circle cx="26" cy="26" r="14" fill="#ffd43b" stroke="#f08c00" stroke-width="3"/>' +
      '<circle cx="21" cy="24" r="1.6" fill="#5c3700"/><circle cx="30" cy="24" r="1.6" fill="#5c3700"/>' +
      '<path d="M21 30 q5 4 10 0" fill="none" stroke="#5c3700" stroke-width="1.6" stroke-linecap="round"/>' +
      '<g stroke="#f08c00" stroke-width="2.4" stroke-linecap="round">' +
      '<path d="M26 4 v6 M26 42 v6 M4 26 h6 M42 26 h6 M10 10 l4 4 M38 38 l4 4 M38 10 l-4 4 M10 38 l4-4"/>' +
      "</g>",
      "0 0 52 52"
    );
    sun.setAttribute("class", "dh-sun");
    wrap.append(shingles, crown, sun);
    return wrap;
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
      cake: '<path d="M204 158 h84 l-10-34 h-64z" fill="#fff" stroke="#f3b6cc" stroke-width="3"/><path d="M214 138 h48" stroke="#ffd0e4" stroke-width="5" stroke-linecap="round"/>',
      cupcake: '<path d="M222 158 l10-38 h28 l10 38z" fill="#e64980"/><path d="M236 158 h20" stroke="#fff" stroke-width="3" opacity="0.55"/>',
      cookie: '<circle cx="246" cy="142" r="26" fill="#e0a15a" stroke="#8a5a20" stroke-width="3"/><circle cx="236" cy="134" r="4" fill="#5c3310"/><circle cx="256" cy="130" r="3" fill="#5c3310"/><circle cx="252" cy="148" r="4" fill="#5c3310"/>',
    }[picked.base] || "";
    const frost = {
      pink: '<ellipse cx="246" cy="126" rx="34" ry="13" fill="#ff8ab8"/><ellipse cx="230" cy="120" rx="10" ry="6" fill="#ffe3f0"/>',
      choco: '<ellipse cx="246" cy="126" rx="34" ry="13" fill="#6b3a22"/><ellipse cx="230" cy="120" rx="10" ry="6" fill="#a86b20"/>',
      blue: '<ellipse cx="246" cy="126" rx="34" ry="13" fill="#4dabf7"/><ellipse cx="230" cy="120" rx="10" ry="6" fill="#d0ebff"/>',
    }[picked.frost] || "";
    const top = {
      berry: '<circle cx="246" cy="108" r="10" fill="#fa5252"/><path d="M240 102 h12 l-2 8 h-8z" fill="#2f9e44"/>',
      star: '<polygon points="246,94 252,108 268,108 256,118 260,132 246,124 232,132 236,118 224,108 240,108" fill="#ffd43b" stroke="#e67700" stroke-width="2"/>',
      candy: '<rect x="232" y="100" width="28" height="16" rx="5" fill="#ff6b6b"/><path d="M232 106 l-10 6 10 6z M260 106 l10 6 -10 6z" fill="#ffc9c9"/>',
    }[picked.top] || "";
    const chef =
      '<ellipse cx="108" cy="150" rx="40" ry="26" fill="#ffb15a"/>' +
      '<path d="M80 132 h56 l-6 30 h-44z" fill="#fff" stroke="#f3c1d0" stroke-width="2"/>' +
      '<path d="M92 132 v10 M124 132 v10" stroke="#ff8ab8" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="76" cy="166" rx="14" ry="8" fill="#ffc078"/>' +
      '<ellipse cx="140" cy="166" rx="14" ry="8" fill="#ffc078"/>' +
      face(108, 108, 30, "#ffb15a") +
      '<path d="M70 116 h-16 M74 122 h-14 M146 116 h16 M142 122 h14" fill="none" stroke="#3a2a22" stroke-width="1.6" stroke-linecap="round"/>' +
      '<ellipse cx="108" cy="64" rx="22" ry="12" fill="#fff" stroke="#e7cbb8" stroke-width="2"/>' +
      '<rect x="84" y="72" width="48" height="14" rx="4" fill="#fff" stroke="#e7cbb8" stroke-width="2"/>';
    return svg(
      '<rect width="360" height="320" fill="#ffe8d6"/>' +
      '<g fill="#ffd7bc"><rect x="18" width="18" height="320"/><rect x="54" width="18" height="320"/><rect x="90" width="18" height="320"/><rect x="126" width="18" height="320"/><rect x="162" width="18" height="320"/><rect x="198" width="18" height="320"/><rect x="234" width="18" height="320"/><rect x="270" width="18" height="320"/><rect x="306" width="18" height="320"/><rect x="342" width="18" height="320"/></g>' +
      '<path d="M18 28 h96" stroke="#c47a55" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M24 28 l8 16 h-16z" fill="#ff8ab8"/>' +
      '<path d="M46 28 l8 16 h-16z" fill="#ffd43b"/>' +
      '<path d="M68 28 l8 16 h-16z" fill="#74c0fc"/>' +
      '<path d="M90 28 l8 16 h-16z" fill="#da77f2"/>' +
      '<rect x="16" y="78" width="86" height="8" rx="2" fill="#c47a55"/>' +
      '<rect x="26" y="58" width="16" height="20" rx="3" fill="#ffd6e7" stroke="#e64980"/>' +
      '<rect x="48" y="52" width="16" height="26" rx="3" fill="#d0ebff" stroke="#4dabf7"/>' +
      '<rect x="70" y="60" width="14" height="18" rx="3" fill="#ffe066" stroke="#f08c00"/>' +
      '<rect x="236" y="40" width="96" height="72" rx="8" fill="#c5f6fa" stroke="#15aabf" stroke-width="4"/>' +
      '<path d="M284 40 v72 M236 76 h96" stroke="#99e9f2" stroke-width="4"/>' +
      '<rect x="0" y="248" width="360" height="72" fill="#e7b07a"/>' +
      '<rect x="0" y="248" width="360" height="16" fill="#f6d7ad"/>' +
      '<g transform="translate(8,62) scale(1.12)">' + chef + '</g>' +
      '<g transform="translate(8,82)">' +
      '<path d="M214 168 v-28 h8 v28" fill="#d4a574"/>' +
      '<ellipse cx="246" cy="166" rx="52" ry="12" fill="#fff" stroke="#e7cbb8" stroke-width="3"/>' +
      '<ellipse cx="246" cy="166" rx="32" ry="6" fill="#fff8ee"/>' +
      base + frost + top +
      '</g>',
      "0 16 360 260"
    );
  }

  function pillowCat(pj) {
    const accessory = pj === "bow"
      ? '<path d="M150 118 l-16-10 8 12z M150 118 l-12 12 10-2z M174 118 l16-10 -8 12z M174 118 l12 12 -10-2z" fill="#ff8ab8"/><circle cx="162" cy="118" r="5" fill="#e64980"/>'
      : pj === "star"
        ? '<polygon points="176,108 181,120 194,120 184,128 188,140 176,132 164,140 168,128 158,120 171,120" fill="#ffd43b" stroke="#e67700" stroke-width="2"/>'
        : pj === "moon"
          ? '<path d="M172 110 a14 14 0 1 0 0 26 a11 11 0 1 1 0-26z" fill="#f59f00" stroke="#c2410c" stroke-width="2"/>'
          : "";
    return svg(
      '<rect width="360" height="360" fill="#241f3d"/>' +
      '<circle cx="40" cy="36" r="1.6" fill="#fff"/><circle cx="90" cy="18" r="1.2" fill="#fff"/><circle cx="150" cy="44" r="1.4" fill="#fff"/><circle cx="70" cy="70" r="1" fill="#fff"/>' +
      '<g transform="translate(0,78)">' +
      '<rect width="360" height="210" fill="#241f3d"/>' +
      '<rect x="0" y="118" width="360" height="82" fill="#3a315c"/>' +
      '<rect x="0" y="118" width="360" height="10" fill="#6b4a38"/>' +
      '<rect x="210" y="18" width="120" height="86" rx="10" fill="#1c1738" stroke="#d0bfff" stroke-width="6"/>' +
      '<path d="M248 36 a16 16 0 1 0 0 28 a12 12 0 1 1 0-28z" fill="#ffe066"/>' +
      '<circle cx="228" cy="34" r="1.6" fill="#fff"/><circle cx="268" cy="48" r="1.4" fill="#fff"/><circle cx="300" cy="32" r="1.8" fill="#fff"/><circle cx="290" cy="70" r="1.2" fill="#fff"/>' +
      '<ellipse cx="180" cy="188" rx="130" ry="10" fill="rgba(10,8,30,0.35)"/>' +
      '<rect x="36" y="108" width="24" height="72" rx="8" fill="#6b3a28"/>' +
      '<rect x="292" y="124" width="16" height="56" rx="6" fill="#6b3a28"/>' +
      '<rect x="52" y="132" width="248" height="48" rx="14" fill="#fff"/>' +
      '<ellipse cx="108" cy="146" rx="40" ry="16" fill="#fff" stroke="#d0bfff" stroke-width="3"/>' +
      '<path d="M150 128 h130 v34 c-30 16-100 16-130 0z" fill="#9775fa"/>' +
      '<path d="M160 128 h40 v8 h-30z M210 128 h36 v8 h-28z" fill="#e5dbff" opacity="0.7"/>' +
      '<ellipse cx="188" cy="140" rx="62" ry="20" fill="#d0bfff"/>' +
      '<ellipse cx="118" cy="128" rx="30" ry="18" fill="#d0bfff"/>' +
      '<path d="M98 116 l-8-20 22 14z" fill="#d0bfff"/>' +
      '<path d="M138 116 l8-20 -22 14z" fill="#d0bfff"/>' +
      '<path d="M104 112 l-2-10 10 7z" fill="#ff9bb5"/>' +
      '<path d="M132 112 l2-10 -10 7z" fill="#ff9bb5"/>' +
      '<ellipse cx="118" cy="132" rx="14" ry="8" fill="#ffe7c4"/>' +
      '<path d="M106 128 q6 3 8 0" fill="none" stroke="#3a2a22" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M122 128 q6 3 8 0" fill="none" stroke="#3a2a22" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M112 138 q5 3 9 0" fill="none" stroke="#3a2a22" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M96 136 h-12 M98 140 h-10 M140 136 h12 M138 140 h10" fill="none" stroke="#3a2a22" stroke-width="1.3" stroke-linecap="round"/>' +
      '<ellipse cx="98" cy="136" rx="5" ry="3" fill="#ff8fab" opacity="0.85"/>' +
      '<path d="M236 146 q28 2 18 20" fill="none" stroke="#d0bfff" stroke-width="8" stroke-linecap="round"/>' +
      accessory +
      '</g>',
      "0 0 360 340"
    );
  }

  function dj() {
    return svg(
      '<rect width="240" height="220" fill="#efe4ff"/>' +
      '<rect y="150" width="240" height="70" fill="#d0bfff"/>' +
      '<path d="M0 24 h36 l-18 28z" fill="#ffd43b"/><path d="M204 24 h36 l-18 28z" fill="#ff8ab8"/>' +
      '<g transform="translate(0,48)">' +
      '<ellipse cx="120" cy="132" rx="90" ry="8" fill="rgba(80,40,90,0.15)"/>' +
      '<rect x="78" y="78" width="84" height="46" rx="20" fill="#9775fa"/>' +
      '<rect x="16" y="78" width="32" height="40" rx="6" fill="#343a40"/><circle cx="32" cy="96" r="10" fill="#ffd43b"/><circle cx="32" cy="96" r="3" fill="#343a40"/>' +
      '<rect x="192" y="78" width="32" height="40" rx="6" fill="#343a40"/><circle cx="208" cy="96" r="10" fill="#ff8ab8"/><circle cx="208" cy="96" r="3" fill="#343a40"/>' +
      face(120, 62, 30, "#b197fc") +
      '<path d="M86 58 a34 24 0 0 1 68 0" fill="none" stroke="#5f3dc4" stroke-width="6"/>' +
      '<rect x="76" y="52" width="16" height="22" rx="5" fill="#5f3dc4"/>' +
      '<rect x="148" y="52" width="16" height="22" rx="5" fill="#5f3dc4"/>' +
      '<path d="M36 28 v18 M36 28 q12 2 12 12" fill="none" stroke="#845ef7" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="36" cy="50" r="3" fill="#845ef7"/>' +
      '<path d="M204 24 v16 M204 24 q10 0 10 8" fill="none" stroke="#ff8ab8" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="204" cy="44" r="3" fill="#ff8ab8"/>' +
      '</g>',
      "0 36 240 145"
    );
  }

  function tubFriend() {
    return svg(
      '<rect width="320" height="420" fill="#d7efff"/>' +
      '<g stroke="#fff" stroke-width="2" opacity="0.85"><path d="M0 26 h320 M0 52 h320 M0 78 h320 M0 104 h320 M0 130 h320 M0 156 h320 M0 182 h320 M0 208 h320 M0 234 h320 M0 260 h320 M0 286 h320 M0 312 h320 M0 338 h320 M0 364 h320 M0 390 h320 M26 0 v420 M52 0 v420 M78 0 v420 M104 0 v420 M130 0 v420 M156 0 v420 M182 0 v420 M208 0 v420 M234 0 v420 M260 0 v420 M286 0 v420 M312 0 v420"/></g>' +
      '<g transform="translate(0,70)">' +
      '' +
      '<ellipse cx="160" cy="178" rx="120" ry="12" fill="rgba(70,110,150,0.18)"/>' +
      '<path d="M28 96 h250 v24 c0 40-48 58-125 58S28 160 28 120z" fill="#fff" stroke="#4dabf7" stroke-width="6"/>' +
      '<rect x="52" y="166" width="12" height="16" rx="3" fill="#adb5bd"/>' +
      '<rect x="248" y="166" width="12" height="16" rx="3" fill="#adb5bd"/>' +
      '<path d="M42 114 h222 v12 c0 28-42 44-111 44S42 154 42 126z" fill="#a5d8ff"/>' +
      '<path d="M48 114 q54 12 108 0 t108 0" fill="none" stroke="#fff" stroke-width="4" opacity="0.8"/>' +
      '<path d="M248 42 h22 a10 10 0 0 1 10 10 v16" fill="none" stroke="#dee2e6" stroke-width="8" stroke-linecap="round"/>' +
      '<circle cx="248" cy="42" r="7" fill="#ffd43b" stroke="#e67700" stroke-width="2"/>' +
      '<path d="M280 70 v18" stroke="#74c0fc" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="280" cy="94" r="2.4" fill="#a5d8ff"/>' +
      '<path d="M176 128 q34-6 26 20" fill="none" stroke="#66d9e8" stroke-width="10" stroke-linecap="round"/>' +
      '<ellipse cx="140" cy="132" rx="44" ry="16" fill="#66d9e8"/>' +
      face(122, 100, 28, "#66d9e8") +
      '<ellipse cx="206" cy="118" rx="18" ry="12" fill="#ffd43b" stroke="#f08c00" stroke-width="2"/>' +
      '<circle cx="220" cy="108" r="9" fill="#ffd43b" stroke="#f08c00" stroke-width="2"/>' +
      '<path d="M228 108 l12 3 -12 4z" fill="#f08c00"/>' +
      '<circle cx="222" cy="106" r="1.5" fill="#3a2a22"/>' +
      '<ellipse cx="200" cy="120" rx="6" ry="4" fill="#ffe066"/>' +
      '<circle cx="64" cy="88" r="10" fill="#fff" stroke="#74c0fc" stroke-width="2"/>' +
      '<circle cx="86" cy="70" r="7" fill="#fff" stroke="#a5d8ff" stroke-width="2"/>' +
      '<circle cx="52" cy="108" r="5" fill="#fff" opacity="0.9"/>' +
      '<rect x="40" y="168" width="150" height="18" rx="9" fill="#ffc9de"/>' +
      '<rect x="52" y="173" width="126" height="8" rx="4" fill="#ff8ab8"/>' +
      '</g>',
      "0 0 320 400"
    );
  }

  function craftPal() {
    return svg(
      '<rect x="8" y="40" width="18" height="28" rx="4" fill="#ff6b6b"/>' +
      '<rect x="8" y="34" width="18" height="8" rx="2" fill="#ffd43b"/>' +
      '<rect x="12" y="22" width="3" height="14" rx="1" fill="#4dabf7"/>' +
      '<rect x="17" y="18" width="3" height="18" rx="1" fill="#fa5252"/>' +
      '<rect x="22" y="24" width="3" height="12" rx="1" fill="#69db7c"/>' +
      '<path d="M40 44 h70 v36 h-70z" fill="#e7b15a" stroke="#a86b20" stroke-width="2"/>' +
      '<path d="M40 44 l35-18 l35 18" fill="#f6d48a" stroke="#a86b20" stroke-width="2"/>' +
      face(75, 36, 16, "#ffb15a"),
      "0 0 120 84"
    );
  }

  function bottle(color) {
    return svg(
      '<rect x="32" y="8" width="16" height="12" rx="3" fill="#ced4da"/>' +
      '<path d="M26 22 h28 l4 46 h-36z" fill="' + color + '" stroke="#3a2a22" stroke-width="2"/>' +
      '<ellipse cx="36" cy="38" rx="4" ry="8" fill="#fff" opacity="0.45"/>',
      "0 0 80 80"
    );
  }

  const DOORS = {
    kitchen: '<rect width="120" height="100" fill="#ffe8d6"/><path d="M0 0 h120 v100 h-120z" fill="none"/><path d="M8 8 h16 M32 8 h16 M56 8 h16 M80 8 h16" stroke="#ffc9a8" stroke-width="8"/>' + face(62, 58, 28, "#ffb15a") + '<ellipse cx="62" cy="22" rx="16" ry="8" fill="#fff" stroke="#e7cbb8"/><rect x="46" y="26" width="32" height="8" rx="3" fill="#fff"/>' + '<ellipse cx="28" cy="78" rx="12" ry="8" fill="#ff8ab8"/>',
    craft: '<rect width="120" height="100" fill="#d0ebff"/>' + '<path d="M18 48 h84 v40 h-84z" fill="#e7b15a"/><path d="M18 48 l42-22 l42 22" fill="#f6d48a"/>' + face(60, 40, 22, "#ffb15a") + '<rect x="86" y="62" width="8" height="22" rx="2" fill="#fa5252"/><rect x="96" y="66" width="8" height="18" rx="2" fill="#4dabf7"/>',
    music: '<rect width="120" height="100" fill="#e5dbff"/>' + face(60, 58, 30, "#b197fc") + '<path d="M28 52 a32 22 0 0 1 64 0" fill="none" stroke="#5f3dc4" stroke-width="6"/><rect x="20" y="48" width="14" height="20" rx="4" fill="#5f3dc4"/><rect x="86" y="48" width="14" height="20" rx="4" fill="#5f3dc4"/>' + '<rect x="8" y="62" width="16" height="24" rx="3" fill="#343a40"/><circle cx="16" cy="72" r="5" fill="#ffd43b"/>',
    bathroom: '<rect width="120" height="100" fill="#d0ebff"/><path d="M0 0 h120 v100" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="12 12"/>' + '<path d="M12 58 h96 v10 c0 16-18 24-48 24s-48-8-48-24z" fill="#fff" stroke="#4dabf7" stroke-width="3"/><path d="M20 64 h80 v6 c0 10-14 14-40 14s-40-4-40-14z" fill="#a5d8ff"/>' + face(52, 48, 20, "#66d9e8"),
    garden: '<rect width="120" height="56" fill="#b9e6ff"/><rect y="56" width="120" height="44" fill="#69db7c"/>' + '<ellipse cx="22" cy="34" rx="8" ry="6" fill="#fff"/><circle cx="96" cy="16" r="8" fill="#ffd43b"/>' + face(60, 58, 22, "#ffc9e3") + '<ellipse cx="36" cy="52" rx="10" ry="16" fill="#b2f2bb"/><ellipse cx="84" cy="52" rx="10" ry="16" fill="#ffc9de"/>',
    playroom: '<rect width="120" height="100" fill="#fff4e0"/><rect y="70" width="120" height="30" fill="#ffd43b"/>' + '<rect x="16" y="48" width="88" height="22" rx="8" fill="#4dabf7"/><circle cx="32" cy="74" r="8" fill="#343a40"/><circle cx="88" cy="74" r="8" fill="#343a40"/>' + face(60, 40, 16, "#ffb15a"),
    bedroom: '<rect width="220" height="110" fill="#2c2a4a"/><rect x="140" y="12" width="66" height="48" rx="6" fill="#1c1738" stroke="#d0bfff" stroke-width="3"/><path d="M162 22 a10 10 0 1 0 0 18 a8 8 0 1 1 0-18z" fill="#ffe066"/><circle cx="186" cy="24" r="1.2" fill="#fff"/><circle cx="194" cy="36" r="1" fill="#fff"/>' + '<rect x="18" y="62" width="16" height="36" rx="4" fill="#6b3a28"/><rect x="28" y="72" width="120" height="26" rx="8" fill="#fff"/><ellipse cx="58" cy="78" rx="22" ry="8" fill="#fff" stroke="#d0bfff"/>' + '<ellipse cx="96" cy="74" rx="28" ry="12" fill="#d0bfff"/><path d="M78 64 l-4-12 12 8z" fill="#d0bfff"/><path d="M100 64 l4-12 -12 8z" fill="#d0bfff"/><path d="M86 74 q4 3 6 0 M96 74 q4 3 6 0" fill="none" stroke="#3a2a22" stroke-width="1.4" stroke-linecap="round"/><path d="M118 72 h40 v16 h-40z" fill="#9775fa"/>',
  };

  function doorScene(id) {
    const body = DOORS[id];
    if (!body) return null;
    const box = id === "bedroom" ? "0 0 220 110" : "0 0 120 100";
    return svg(body, box);
  }

  window.LawsonDollArt = {
    glyph: glyph,
    roof: roof,
    blooms: blooms,
    cake: cake,
    pillowCat: pillowCat,
    dj: dj,
    tubFriend: tubFriend,
    craftPal: craftPal,
    bottle: bottle,
    doorScene: doorScene,
  };
})();
