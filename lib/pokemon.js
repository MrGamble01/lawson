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
    extra["stroke-width"] = extra["stroke-width"] || "4";
    extra["stroke-linejoin"] = "round";
    extra["stroke-linecap"] = "round";
    return extra;
  }

  function paintPikachu(svg, fill) {
    add(svg, "path", stroke({ d: "M82,78 L96,58 L90,82 L112,66 L100,90 L88,86 Z", fill: fill("#f5c518") }));
    add(svg, "ellipse", stroke({ cx: "58", cy: "78", rx: "30", ry: "28", fill: fill("#f5c518") }));
    add(svg, "polygon", stroke({ points: "26,58 34,6 48,56", fill: fill("#f5c518") }));
    add(svg, "polygon", stroke({ points: "66,56 78,4 92,58", fill: fill("#f5c518") }));
    add(svg, "polygon", stroke({ points: "32,22 34,6 40,24", fill: fill("#241c16") }));
    add(svg, "polygon", stroke({ points: "74,20 78,4 86,24", fill: fill("#241c16") }));
    add(svg, "ellipse", stroke({ cx: "40", cy: "104", rx: "10", ry: "7", fill: fill("#f5c518") }));
    add(svg, "ellipse", stroke({ cx: "72", cy: "104", rx: "10", ry: "7", fill: fill("#f5c518") }));
    add(svg, "circle", { cx: "42", cy: "80", r: "8", fill: fill("#e03131") });
    add(svg, "circle", { cx: "74", cy: "80", r: "8", fill: fill("#e03131") });
    add(svg, "circle", { cx: "48", cy: "70", r: "3.5", fill: fill("#241c16") });
    add(svg, "circle", { cx: "68", cy: "70", r: "3.5", fill: fill("#241c16") });
    add(svg, "path", { d: "M54,88 Q58,92 62,88", fill: "none", stroke: "#241c16", "stroke-width": "2.5" });
  }

  function paintCharmander(svg, fill) {
    add(svg, "path", stroke({ d: "M72,78 C90,74 104,58 108,40 C116,58 112,86 90,92 C82,84 76,80 72,78 Z", fill: fill("#ff922b") }));
    add(svg, "path", stroke({ d: "M104,48 C108,34 118,36 112,50 C118,42 116,58 104,58 Z", fill: fill("#ffe066") }));
    add(svg, "ellipse", stroke({ cx: "52", cy: "80", rx: "26", ry: "24", fill: fill("#f76707") }));
    add(svg, "circle", stroke({ cx: "44", cy: "50", r: "18", fill: fill("#f76707") }));
    add(svg, "ellipse", stroke({ cx: "26", cy: "56", rx: "10", ry: "8", fill: fill("#f76707") }));
    add(svg, "ellipse", { cx: "50", cy: "86", rx: "13", ry: "13", fill: fill("#fff3bf") });
    add(svg, "circle", { cx: "38", cy: "46", r: "3", fill: fill("#241c16") });
    add(svg, "circle", { cx: "50", cy: "44", r: "3", fill: fill("#241c16") });
    add(svg, "ellipse", stroke({ cx: "36", cy: "106", rx: "9", ry: "6", fill: fill("#f76707") }));
    add(svg, "ellipse", stroke({ cx: "58", cy: "106", rx: "9", ry: "6", fill: fill("#f76707") }));
  }

  function paintBulbasaur(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "70", cy: "78", rx: "34", ry: "24", fill: fill("#2f9e44") }));
    add(svg, "ellipse", stroke({ cx: "78", cy: "46", rx: "28", ry: "26", fill: fill("#8ce99a") }));
    add(svg, "ellipse", { cx: "78", cy: "48", rx: "16", ry: "14", fill: fill("#b2f2bb") });
    add(svg, "circle", { cx: "68", cy: "38", r: "5", fill: fill("#2b8a3e") });
    add(svg, "circle", { cx: "84", cy: "34", r: "4", fill: fill("#2b8a3e") });
    add(svg, "circle", { cx: "92", cy: "48", r: "4", fill: fill("#2b8a3e") });
    add(svg, "circle", stroke({ cx: "40", cy: "62", r: "16", fill: fill("#69db7c") }));
    add(svg, "circle", { cx: "34", cy: "58", r: "2.5", fill: fill("#241c16") });
    add(svg, "circle", { cx: "44", cy: "56", r: "2.5", fill: fill("#241c16") });
    add(svg, "ellipse", stroke({ cx: "48", cy: "104", rx: "8", ry: "6", fill: fill("#2f9e44") }));
    add(svg, "ellipse", stroke({ cx: "66", cy: "108", rx: "8", ry: "6", fill: fill("#2f9e44") }));
    add(svg, "ellipse", stroke({ cx: "86", cy: "106", rx: "8", ry: "6", fill: fill("#2f9e44") }));
    add(svg, "ellipse", stroke({ cx: "102", cy: "100", rx: "8", ry: "6", fill: fill("#2f9e44") }));
  }

  function paintSquirtle(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "74", cy: "68", rx: "32", ry: "30", fill: fill("#c4a46a") }));
    add(svg, "ellipse", { cx: "74", cy: "66", rx: "20", ry: "18", fill: fill("#f6e7c8") });
    add(svg, "path", { d: "M74,50 V84 M56,66 H92", fill: "none", stroke: fill("#8a642e"), "stroke-width": "3" });
    add(svg, "ellipse", stroke({ cx: "46", cy: "84", rx: "22", ry: "18", fill: fill("#1c7ed6") }));
    add(svg, "circle", stroke({ cx: "28", cy: "58", r: "16", fill: fill("#1c7ed6") }));
    add(svg, "ellipse", { cx: "26", cy: "66", rx: "8", ry: "6", fill: fill("#fff3bf") });
    add(svg, "circle", { cx: "22", cy: "54", r: "2.5", fill: fill("#241c16") });
    add(svg, "circle", { cx: "32", cy: "52", r: "2.5", fill: fill("#241c16") });
    add(svg, "path", stroke({ d: "M100,74 C118,64 120,98 100,104 C114,96 114,80 100,74 Z", fill: fill("#1c7ed6") }));
    add(svg, "ellipse", stroke({ cx: "34", cy: "104", rx: "8", ry: "6", fill: fill("#1c7ed6") }));
    add(svg, "ellipse", stroke({ cx: "54", cy: "108", rx: "8", ry: "6", fill: fill("#1c7ed6") }));
  }

  function paintEevee(svg, fill) {
    add(svg, "path", stroke({ d: "M74,62 C104,36 116,70 100,98 C90,78 82,70 74,62 Z", fill: fill("#fff3bf") }));
    add(svg, "ellipse", stroke({ cx: "50", cy: "78", rx: "26", ry: "26", fill: fill("#c47a55") }));
    add(svg, "polygon", stroke({ points: "28,58 12,14 42,50", fill: fill("#c47a55") }));
    add(svg, "polygon", stroke({ points: "44,52 56,8 72,52", fill: fill("#c47a55") }));
    add(svg, "ellipse", { cx: "46", cy: "88", rx: "14", ry: "12", fill: fill("#fff3bf") });
    add(svg, "circle", { cx: "40", cy: "70", r: "3", fill: fill("#241c16") });
    add(svg, "circle", { cx: "56", cy: "68", r: "3", fill: fill("#241c16") });
    add(svg, "ellipse", stroke({ cx: "36", cy: "106", rx: "8", ry: "6", fill: fill("#c47a55") }));
    add(svg, "ellipse", stroke({ cx: "58", cy: "106", rx: "8", ry: "6", fill: fill("#c47a55") }));
  }

  function paintJigglypuff(svg, fill) {
    add(svg, "circle", stroke({ cx: "60", cy: "70", r: "36", fill: fill("#f783ac") }));
    add(svg, "path", stroke({ d: "M50,40 C54,16 70,14 62,40 C70,18 82,30 66,44 Z", fill: fill("#f783ac") }));
    add(svg, "ellipse", { cx: "60", cy: "84", rx: "16", ry: "12", fill: fill("#fffaf3") });
    add(svg, "ellipse", { cx: "46", cy: "64", rx: "8", ry: "10", fill: fill("#74c0fc") });
    add(svg, "ellipse", { cx: "76", cy: "64", rx: "8", ry: "10", fill: fill("#74c0fc") });
    add(svg, "circle", { cx: "46", cy: "64", r: "3", fill: fill("#241c16") });
    add(svg, "circle", { cx: "76", cy: "64", r: "3", fill: fill("#241c16") });
    add(svg, "ellipse", stroke({ cx: "42", cy: "106", rx: "10", ry: "6", fill: fill("#f783ac") }));
    add(svg, "ellipse", stroke({ cx: "78", cy: "106", rx: "10", ry: "6", fill: fill("#f783ac") }));
  }

  function paintSnorlax(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "60", cy: "78", rx: "48", ry: "32", fill: fill("#0c8599") }));
    add(svg, "ellipse", { cx: "60", cy: "88", rx: "28", ry: "18", fill: fill("#fffaf3") });
    add(svg, "circle", stroke({ cx: "60", cy: "40", r: "18", fill: fill("#0c8599") }));
    add(svg, "polygon", stroke({ points: "44,32 48,12 58,32", fill: fill("#0c8599") }));
    add(svg, "polygon", stroke({ points: "62,32 72,12 78,32", fill: fill("#0c8599") }));
    add(svg, "path", { d: "M50,40 Q60,48 70,40", fill: "none", stroke: "#241c16", "stroke-width": "3", "stroke-linecap": "round" });
    add(svg, "ellipse", stroke({ cx: "30", cy: "108", rx: "14", ry: "7", fill: fill("#0c8599") }));
    add(svg, "ellipse", stroke({ cx: "90", cy: "108", rx: "14", ry: "7", fill: fill("#0c8599") }));
  }

  function paintGengar(svg, fill) {
    add(svg, "path", stroke({
      d: "M38,34 L48,12 L58,32 L66,14 L76,32 L88,10 L100,34 C112,48 114,74 104,98 C94,114 76,116 60,114 C42,116 24,102 16,82 C8,62 16,44 38,34 Z",
      fill: fill("#7048e8"),
    }));
    add(svg, "ellipse", { cx: "46", cy: "58", rx: "9", ry: "12", fill: fill("#fffaf3") });
    add(svg, "ellipse", { cx: "76", cy: "58", rx: "9", ry: "12", fill: fill("#fffaf3") });
    add(svg, "circle", { cx: "48", cy: "60", r: "3.5", fill: fill("#e03131") });
    add(svg, "circle", { cx: "78", cy: "60", r: "3.5", fill: fill("#e03131") });
    add(svg, "path", { d: "M42,80 Q60,102 80,80 Q68,90 60,90 Q52,90 42,80 Z", fill: fill("#fffaf3") });
    add(svg, "path", { d: "M48,84 L52,92 L56,84 M60,86 L64,96 L68,86", fill: "none", stroke: "#241c16", "stroke-width": "2" });
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
