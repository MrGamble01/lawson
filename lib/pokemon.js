// Original SVG interpretations of copyrighted Pokémon characters.
// These are not independently created character IP, and they are not
// licensed sprites or ripped game art. Pokémon names and character
// identities are trademarks and copyrights of Nintendo, Game Freak,
// Creatures, and The Pokémon Company. Lawson is not affiliated with or
// endorsed by them. A file that is easy to find online is not a license
// to copy it, so no official art is used here.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#241c16";
  const SIL = "#241c16";

  function el(name, attrs) {
    const node = document.createElementNS(NS, name);
    Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  }

  function add(svg, name, attrs) {
    const node = el(name, attrs);
    svg.appendChild(node);
    return node;
  }

  function stroke(extra) {
    extra.stroke = INK;
    extra["stroke-width"] = extra["stroke-width"] || "3.5";
    extra["stroke-linejoin"] = "round";
    extra["stroke-linecap"] = "round";
    return extra;
  }

  function eye(svg, cx, cy, fill) {
    add(svg, "ellipse", { cx: String(cx), cy: String(cy), rx: "6.2", ry: "7.2", fill: fill("#fffaf3") });
    add(svg, "circle", { cx: String(cx + 1.2), cy: String(cy + 1.4), r: "3", fill: fill("#241c16") });
    add(svg, "circle", { cx: String(cx - 1.4), cy: String(cy - 1.8), r: "1.5", fill: fill("#fffaf3") });
  }

  function smile(svg, d) {
    add(svg, "path", { d: d, fill: "none", stroke: INK, "stroke-width": "2.2", "stroke-linecap": "round" });
  }

  function foot(svg, cx, cy, fill, color) {
    add(svg, "ellipse", stroke({ cx: String(cx), cy: String(cy), rx: "11", ry: "7", fill: fill(color) }));
  }

  function paintPikachu(svg, fill) {
    add(svg, "path", stroke({
      d: "M76,74 L96,58 L86,72 L114,52 L98,78 L112,96 L82,90 Z",
      fill: fill("#f5c518"),
    }));
    add(svg, "path", stroke({ d: "M36,50 L26,8 L54,42 Z", fill: fill("#f5c518") }));
    add(svg, "path", stroke({ d: "M68,44 L88,6 L98,48 Z", fill: fill("#f5c518") }));
    add(svg, "path", { d: "M32,26 L26,8 L42,24 Z", fill: fill("#241c16") });
    add(svg, "path", { d: "M76,24 L88,6 L92,28 Z", fill: fill("#241c16") });
    add(svg, "ellipse", stroke({ cx: "60", cy: "76", rx: "32", ry: "30", fill: fill("#f5c518") }));
    add(svg, "ellipse", stroke({ cx: "30", cy: "84", rx: "9", ry: "11", fill: fill("#f5c518") }));
    add(svg, "ellipse", stroke({ cx: "90", cy: "80", rx: "9", ry: "11", fill: fill("#f5c518") }));
    foot(svg, 42, 106, fill, "#f5c518");
    foot(svg, 78, 106, fill, "#f5c518");
    add(svg, "circle", { cx: "40", cy: "82", r: "7.5", fill: fill("#e03131") });
    add(svg, "circle", { cx: "82", cy: "80", r: "7.5", fill: fill("#e03131") });
    eye(svg, 50, 68, fill);
    eye(svg, 72, 66, fill);
    smile(svg, "M54,88 Q62,94 70,86");
  }

  function paintCharmander(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "52", cy: "74", rx: "28", ry: "28", fill: fill("#f76707") }));
    add(svg, "ellipse", { cx: "50", cy: "84", rx: "15", ry: "15", fill: fill("#ffe8cc") });
    add(svg, "path", stroke({
      d: "M72,88 C88,96 96,78 90,62 C102,78 98,100 78,102 Z",
      fill: fill("#ff922b"),
    }));
    add(svg, "path", stroke({
      d: "M88,70 C96,52 108,58 98,74 C104,60 94,78 86,78 Z",
      fill: fill("#ffe066"),
    }));
    add(svg, "path", { d: "M94,58 C98,48 106,54 98,64 Z", fill: fill("#fff3bf") });
    add(svg, "ellipse", stroke({ cx: "26", cy: "84", rx: "9", ry: "8", fill: fill("#f76707") }));
    add(svg, "ellipse", stroke({ cx: "74", cy: "92", rx: "8", ry: "7", fill: fill("#f76707") }));
    foot(svg, 36, 106, fill, "#f76707");
    foot(svg, 64, 108, fill, "#f76707");
    eye(svg, 42, 64, fill);
    eye(svg, 62, 62, fill);
    smile(svg, "M44,80 Q52,86 60,78");
  }

  function paintBulbasaur(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "58", cy: "86", rx: "34", ry: "20", fill: fill("#69db7c") }));
    add(svg, "ellipse", { cx: "54", cy: "92", rx: "16", ry: "9", fill: fill("#d8f5dc") });
    add(svg, "ellipse", stroke({ cx: "78", cy: "52", rx: "26", ry: "22", fill: fill("#2f9e44") }));
    add(svg, "ellipse", { cx: "78", cy: "52", rx: "14", ry: "12", fill: fill("#b2f2bb") });
    add(svg, "circle", { cx: "66", cy: "42", r: "4.5", fill: fill("#1f6b30") });
    add(svg, "circle", { cx: "82", cy: "38", r: "4", fill: fill("#1f6b30") });
    add(svg, "circle", { cx: "92", cy: "52", r: "3.5", fill: fill("#1f6b30") });
    add(svg, "circle", stroke({ cx: "32", cy: "72", r: "16", fill: fill("#8ce99a") }));
    foot(svg, 34, 106, fill, "#2f9e44");
    foot(svg, 54, 108, fill, "#2f9e44");
    foot(svg, 76, 106, fill, "#2f9e44");
    foot(svg, 96, 102, fill, "#2f9e44");
    eye(svg, 26, 68, fill);
    eye(svg, 38, 66, fill);
    smile(svg, "M26,80 Q32,84 38,78");
  }

  function paintSquirtle(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "76", cy: "70", rx: "32", ry: "30", fill: fill("#c4a46a") }));
    add(svg, "ellipse", { cx: "76", cy: "68", rx: "20", ry: "18", fill: fill("#f6e7c8") });
    add(svg, "path", { d: "M76,52 V86 M58,68 H94", fill: "none", stroke: fill("#8a642e"), "stroke-width": "3" });
    add(svg, "ellipse", stroke({ cx: "46", cy: "82", rx: "24", ry: "20", fill: fill("#1c7ed6") }));
    add(svg, "circle", stroke({ cx: "30", cy: "58", r: "16", fill: fill("#1c7ed6") }));
    add(svg, "ellipse", { cx: "28", cy: "66", rx: "9", ry: "7", fill: fill("#fff3bf") });
    add(svg, "path", stroke({ d: "M96,64 C118,52 122,90 98,100 C114,88 112,70 96,64 Z", fill: fill("#1c7ed6") }));
    foot(svg, 32, 104, fill, "#1c7ed6");
    foot(svg, 54, 108, fill, "#1c7ed6");
    eye(svg, 24, 54, fill);
    eye(svg, 36, 52, fill);
    smile(svg, "M22,66 Q28,70 34,64");
  }

  function paintEevee(svg, fill) {
    add(svg, "path", stroke({
      d: "M72,70 C104,40 118,72 102,102 C90,82 82,74 72,70 Z",
      fill: fill("#fff3bf"),
    }));
    add(svg, "ellipse", stroke({ cx: "52", cy: "76", rx: "28", ry: "28", fill: fill("#c47a55") }));
    add(svg, "path", stroke({ d: "M30,58 L10,12 L46,48 Z", fill: fill("#c47a55") }));
    add(svg, "path", stroke({ d: "M48,52 L62,6 L80,50 Z", fill: fill("#c47a55") }));
    add(svg, "path", { d: "M22,32 L10,12 L32,28 Z", fill: fill("#241c16") });
    add(svg, "path", { d: "M58,28 L62,6 L72,30 Z", fill: fill("#241c16") });
    add(svg, "ellipse", { cx: "48", cy: "88", rx: "16", ry: "13", fill: fill("#fff3bf") });
    add(svg, "ellipse", stroke({ cx: "26", cy: "84", rx: "8", ry: "7", fill: fill("#c47a55") }));
    foot(svg, 36, 106, fill, "#c47a55");
    foot(svg, 62, 106, fill, "#c47a55");
    eye(svg, 42, 68, fill);
    eye(svg, 62, 66, fill);
    smile(svg, "M44,84 Q52,90 60,82");
  }

  function paintJigglypuff(svg, fill) {
    add(svg, "circle", stroke({ cx: "60", cy: "68", r: "38", fill: fill("#f783ac") }));
    add(svg, "path", stroke({
      d: "M48,40 C52,14 70,12 60,40 C70,16 86,30 66,46 Z",
      fill: fill("#f783ac"),
    }));
    add(svg, "ellipse", { cx: "60", cy: "84", rx: "16", ry: "12", fill: fill("#fffaf3") });
    add(svg, "ellipse", stroke({ cx: "34", cy: "108", rx: "12", ry: "7", fill: fill("#f783ac") }));
    add(svg, "ellipse", stroke({ cx: "86", cy: "108", rx: "12", ry: "7", fill: fill("#f783ac") }));
    eye(svg, 46, 62, fill);
    eye(svg, 76, 62, fill);
    smile(svg, "M52,80 Q60,88 68,80");
  }

  function paintSnorlax(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "60", cy: "78", rx: "46", ry: "32", fill: fill("#0c8599") }));
    add(svg, "ellipse", { cx: "60", cy: "88", rx: "28", ry: "18", fill: fill("#fffaf3") });
    add(svg, "circle", stroke({ cx: "60", cy: "40", r: "20", fill: fill("#0c8599") }));
    add(svg, "path", stroke({ d: "M44,34 L46,12 L58,32 Z", fill: fill("#0c8599") }));
    add(svg, "path", stroke({ d: "M62,32 L74,12 L78,34 Z", fill: fill("#0c8599") }));
    add(svg, "ellipse", stroke({ cx: "28", cy: "108", rx: "16", ry: "8", fill: fill("#0c8599") }));
    add(svg, "ellipse", stroke({ cx: "92", cy: "108", rx: "16", ry: "8", fill: fill("#0c8599") }));
    add(svg, "path", { d: "M50,40 Q54,36 58,40", fill: "none", stroke: INK, "stroke-width": "2.4", "stroke-linecap": "round" });
    add(svg, "path", { d: "M64,40 Q68,36 72,40", fill: "none", stroke: INK, "stroke-width": "2.4", "stroke-linecap": "round" });
    smile(svg, "M52,50 Q60,58 68,50");
  }

  function paintGengar(svg, fill) {
    add(svg, "path", stroke({
      d: "M36,36 L46,12 L56,32 L66,10 L78,32 L90,8 L102,36 C114,50 116,78 104,100 C92,116 74,118 60,114 C44,118 22,104 14,82 C6,60 16,44 36,36 Z",
      fill: fill("#7048e8"),
    }));
    add(svg, "ellipse", { cx: "46", cy: "58", rx: "10", ry: "13", fill: fill("#fffaf3") });
    add(svg, "ellipse", { cx: "78", cy: "58", rx: "10", ry: "13", fill: fill("#fffaf3") });
    add(svg, "circle", { cx: "48", cy: "60", r: "3.6", fill: fill("#e03131") });
    add(svg, "circle", { cx: "80", cy: "60", r: "3.6", fill: fill("#e03131") });
    add(svg, "path", { d: "M40,82 Q60,108 82,82 Q70,94 60,94 Q50,94 40,82 Z", fill: fill("#fffaf3") });
    add(svg, "path", { d: "M48,86 L52,96 L56,86 M62,88 L66,100 L70,88", fill: "none", stroke: INK, "stroke-width": "2", "stroke-linecap": "round" });
  }

  const roster = [
    { id: "pikachu", name: "Pikachu", paint: paintPikachu },
    { id: "charmander", name: "Charmander", paint: paintCharmander },
    { id: "bulbasaur", name: "Bulbasaur", paint: paintBulbasaur },
    { id: "squirtle", name: "Squirtle", paint: paintSquirtle },
    { id: "eevee", name: "Eevee", paint: paintEevee },
    { id: "jigglypuff", name: "Jigglypuff", paint: paintJigglypuff },
    { id: "snorlax", name: "Snorlax", paint: paintSnorlax },
    { id: "gengar", name: "Gengar", paint: paintGengar },
  ];

  function shuffle(list, rng) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  }

  function makeRound(usedIds, rng) {
    const pool = roster.filter((mon) => usedIds.indexOf(mon.id) < 0);
    const source = pool.length ? pool : roster.slice();
    const target = source[Math.floor(rng() * source.length)];
    const rest = shuffle(roster.filter((mon) => mon.id !== target.id), rng);
    return { target: target, choices: shuffle([target].concat(rest.slice(0, 2)), rng) };
  }

  function drawCreature(parent, id, opts) {
    const mon = roster.filter((item) => item.id === id)[0];
    if (!mon || !parent) return;
    const silhouette = opts && opts.silhouette;
    const fill = (hex) => (silhouette ? SIL : hex);
    const svg = el("svg", { viewBox: "0 0 120 120" });
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "poke-art");
    mon.paint(svg, fill);
    parent.appendChild(svg);
  }

  window.Lawson.pokemon = {
    roster: roster,
    rounds: 6,
    makeRound: makeRound,
    drawCreature: drawCreature,
  };
})();
