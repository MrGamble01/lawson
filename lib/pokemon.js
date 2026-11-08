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
    add(svg, "path", stroke({ d: "M86,70 L108,48 L98,74 L118,62 L96,86 Z", fill: fill("#f5c518") }));
    add(svg, "ellipse", stroke({ cx: "58", cy: "74", rx: "32", ry: "30", fill: fill("#f5c518") }));
    add(svg, "polygon", stroke({ points: "28,52 40,4 50,50", fill: fill("#f5c518") }));
    add(svg, "polygon", stroke({ points: "66,50 76,4 88,52", fill: fill("#f5c518") }));
    add(svg, "polygon", stroke({ points: "34,16 40,4 44,18", fill: fill("#3a2a22") }));
    add(svg, "polygon", stroke({ points: "72,16 76,4 82,18", fill: fill("#3a2a22") }));
    add(svg, "circle", { cx: "42", cy: "78", r: "7", fill: fill("#e03131") });
    add(svg, "circle", { cx: "74", cy: "78", r: "7", fill: fill("#e03131") });
    add(svg, "circle", { cx: "48", cy: "68", r: "3", fill: fill("#241c16") });
    add(svg, "circle", { cx: "68", cy: "68", r: "3", fill: fill("#241c16") });
  }

  function paintCharmander(svg, fill) {
    add(svg, "path", stroke({ d: "M78,78 C96,70 108,48 100,34 C114,46 116,72 98,90 C90,82 84,80 78,78 Z", fill: fill("#ff922b") }));
    add(svg, "path", stroke({ d: "M96,40 C102,28 110,30 104,44 C110,36 112,48 100,50 Z", fill: fill("#ffd43b") }));
    add(svg, "ellipse", stroke({ cx: "52", cy: "78", rx: "26", ry: "28", fill: fill("#f76707") }));
    add(svg, "circle", stroke({ cx: "46", cy: "48", r: "16", fill: fill("#f76707") }));
    add(svg, "ellipse", { cx: "50", cy: "88", rx: "12", ry: "12", fill: fill("#fff3bf") });
    add(svg, "rect", stroke({ x: "36", y: "100", width: "10", height: "12", rx: "3", fill: fill("#f76707") }));
    add(svg, "rect", stroke({ x: "58", y: "100", width: "10", height: "12", rx: "3", fill: fill("#f76707") }));
  }

  function paintBulbasaur(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "68", cy: "82", rx: "36", ry: "22", fill: fill("#2f9e44") }));
    add(svg, "circle", stroke({ cx: "42", cy: "44", r: "26", fill: fill("#8ce99a") }));
    add(svg, "circle", { cx: "32", cy: "36", r: "5", fill: fill("#2b8a3e") });
    add(svg, "circle", { cx: "46", cy: "30", r: "4", fill: fill("#2b8a3e") });
    add(svg, "circle", { cx: "54", cy: "42", r: "4", fill: fill("#2b8a3e") });
    add(svg, "rect", stroke({ x: "40", y: "98", width: "12", height: "14", rx: "4", fill: fill("#2f9e44") }));
    add(svg, "rect", stroke({ x: "58", y: "100", width: "12", height: "12", rx: "4", fill: fill("#2f9e44") }));
    add(svg, "rect", stroke({ x: "78", y: "100", width: "12", height: "12", rx: "4", fill: fill("#2f9e44") }));
    add(svg, "rect", stroke({ x: "94", y: "96", width: "12", height: "14", rx: "4", fill: fill("#2f9e44") }));
  }

  function paintSquirtle(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "72", cy: "64", rx: "36", ry: "32", fill: fill("#c4a46a") }));
    add(svg, "ellipse", { cx: "72", cy: "60", rx: "22", ry: "20", fill: fill("#f6e7c8") });
    add(svg, "path", { d: "M72,42 V80 M54,60 H90", fill: "none", stroke: fill("#8a642e"), "stroke-width": "3" });
    add(svg, "ellipse", stroke({ cx: "46", cy: "84", rx: "24", ry: "18", fill: fill("#1c7ed6") }));
    add(svg, "circle", stroke({ cx: "28", cy: "62", r: "16", fill: fill("#1c7ed6") }));
    add(svg, "ellipse", { cx: "26", cy: "70", rx: "8", ry: "6", fill: fill("#fff3bf") });
    add(svg, "path", stroke({ d: "M100,72 C116,64 118,96 100,100 C112,92 112,80 100,72 Z", fill: fill("#1c7ed6") }));
    add(svg, "ellipse", stroke({ cx: "36", cy: "100", rx: "8", ry: "6", fill: fill("#1c7ed6") }));
    add(svg, "ellipse", stroke({ cx: "56", cy: "104", rx: "8", ry: "6", fill: fill("#1c7ed6") }));
  }

  function paintEevee(svg, fill) {
    add(svg, "path", stroke({ d: "M78,58 C108,40 112,78 96,96 C88,78 82,70 78,58 Z", fill: fill("#fff3bf") }));
    add(svg, "ellipse", stroke({ cx: "52", cy: "78", rx: "28", ry: "26", fill: fill("#c47a55") }));
    add(svg, "polygon", stroke({ points: "30,58 16,18 44,50", fill: fill("#c47a55") }));
    add(svg, "polygon", stroke({ points: "46,52 58,12 70,52", fill: fill("#c47a55") }));
    add(svg, "ellipse", { cx: "48", cy: "86", rx: "14", ry: "10", fill: fill("#fff3bf") });
  }

  function paintJigglypuff(svg, fill) {
    add(svg, "circle", stroke({ cx: "60", cy: "70", r: "38", fill: fill("#f783ac") }));
    add(svg, "path", stroke({ d: "M52,36 C56,18 68,16 64,36 C70,22 78,30 66,40 Z", fill: fill("#f783ac") }));
    add(svg, "ellipse", { cx: "60", cy: "82", rx: "16", ry: "12", fill: fill("#fffaf3") });
    add(svg, "circle", { cx: "48", cy: "64", r: "5", fill: fill("#74c0fc") });
    add(svg, "circle", { cx: "74", cy: "64", r: "5", fill: fill("#74c0fc") });
    add(svg, "rect", stroke({ x: "40", y: "102", width: "12", height: "10", rx: "4", fill: fill("#f783ac") }));
    add(svg, "rect", stroke({ x: "68", y: "102", width: "12", height: "10", rx: "4", fill: fill("#f783ac") }));
  }

  function paintSnorlax(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "60", cy: "78", rx: "50", ry: "34", fill: fill("#0c8599") }));
    add(svg, "ellipse", { cx: "60", cy: "86", rx: "28", ry: "18", fill: fill("#fffaf3") });
    add(svg, "circle", stroke({ cx: "60", cy: "38", r: "16", fill: fill("#0c8599") }));
    add(svg, "polygon", stroke({ points: "46,30 50,14 58,30", fill: fill("#0c8599") }));
    add(svg, "polygon", stroke({ points: "62,30 70,14 76,30", fill: fill("#0c8599") }));
    add(svg, "path", { d: "M50,40 Q60,46 70,40", fill: "none", stroke: "#241c16", "stroke-width": "3" });
    add(svg, "rect", stroke({ x: "28", y: "104", width: "18", height: "12", rx: "4", fill: fill("#0c8599") }));
    add(svg, "rect", stroke({ x: "74", y: "104", width: "18", height: "12", rx: "4", fill: fill("#0c8599") }));
  }

  function paintGengar(svg, fill) {
    add(svg, "path", stroke({
      d: "M38,28 L48,12 L58,28 L62,16 L74,28 L86,10 L96,30 C108,40 110,70 100,92 C92,108 76,112 60,110 C40,112 22,100 20,78 C16,52 24,36 38,28 Z",
      fill: fill("#7048e8"),
    }));
    add(svg, "ellipse", { cx: "46", cy: "58", rx: "8", ry: "10", fill: fill("#fffaf3") });
    add(svg, "ellipse", { cx: "74", cy: "58", rx: "8", ry: "10", fill: fill("#fffaf3") });
    add(svg, "circle", { cx: "48", cy: "60", r: "3", fill: fill("#e03131") });
    add(svg, "circle", { cx: "76", cy: "60", r: "3", fill: fill("#e03131") });
    add(svg, "path", { d: "M44,78 Q60,96 78,78 Q60,86 44,78 Z", fill: fill("#fffaf3") });
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
