// Unofficial creature drawings for Lawson's playground.
//
// Pokémon names and character identities are trademarks and copyrights of
// Nintendo, Game Freak, Creatures, and The Pokémon Company. This file does
// not include official art, ripped sprites, or a license from those owners.
// The pictures are original simple drawings. Lawson is not affiliated with
// or endorsed by them. A picture that is easy to find online is not a
// license to copy it, so none of those files are used here.
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
    add(svg, "polygon", stroke({ points: "30,50 42,6 54,48", fill: fill("#f5c518") }));
    add(svg, "polygon", stroke({ points: "66,48 78,6 90,50", fill: fill("#f5c518") }));
    add(svg, "polygon", stroke({ points: "36,18 42,6 46,20", fill: fill("#3a2a22") }));
    add(svg, "polygon", stroke({ points: "74,20 78,6 84,20", fill: fill("#3a2a22") }));
    add(svg, "ellipse", stroke({ cx: "60", cy: "76", rx: "30", ry: "28", fill: fill("#f5c518") }));
    add(svg, "path", stroke({ d: "M86,78 L112,52 L100,86 Z", fill: fill("#f5c518") }));
    add(svg, "circle", { cx: "46", cy: "80", r: "6", fill: fill("#e03131") });
    add(svg, "circle", { cx: "74", cy: "80", r: "6", fill: fill("#e03131") });
  }

  function paintCharmander(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "54", cy: "78", rx: "28", ry: "26", fill: fill("#f76707") }));
    add(svg, "circle", stroke({ cx: "48", cy: "52", r: "16", fill: fill("#f76707") }));
    add(svg, "path", stroke({ d: "M78,74 C98,74 104,48 96,36 C108,48 112,70 96,84 C90,78 84,76 78,74 Z", fill: fill("#ffd43b") }));
    add(svg, "ellipse", { cx: "50", cy: "86", rx: "12", ry: "10", fill: fill("#fff3bf") });
  }

  function paintBulbasaur(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "64", cy: "86", rx: "34", ry: "20", fill: fill("#2f9e44") }));
    add(svg, "circle", stroke({ cx: "46", cy: "46", r: "24", fill: fill("#69db7c") }));
    add(svg, "circle", { cx: "38", cy: "40", r: "5", fill: fill("#2f9e44") });
    add(svg, "circle", { cx: "52", cy: "36", r: "4", fill: fill("#2f9e44") });
    add(svg, "rect", stroke({ x: "40", y: "96", width: "10", height: "12", rx: "3", fill: fill("#2f9e44") }));
    add(svg, "rect", stroke({ x: "78", y: "96", width: "10", height: "12", rx: "3", fill: fill("#2f9e44") }));
  }

  function paintSquirtle(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "66", cy: "70", rx: "36", ry: "28", fill: fill("#f6e7c8") }));
    add(svg, "circle", stroke({ cx: "40", cy: "58", r: "18", fill: fill("#1c7ed6") }));
    add(svg, "path", stroke({ d: "M96,78 C112,78 114,100 98,104 C108,96 104,84 96,78 Z", fill: fill("#1c7ed6") }));
    add(svg, "ellipse", { cx: "66", cy: "66", rx: "18", ry: "12", fill: fill("#e7d3b0") });
  }

  function paintEevee(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "50", cy: "78", rx: "26", ry: "24", fill: fill("#c47a55") }));
    add(svg, "polygon", stroke({ points: "30,58 18,24 42,50", fill: fill("#c47a55") }));
    add(svg, "polygon", stroke({ points: "48,52 58,18 66,52", fill: fill("#c47a55") }));
    add(svg, "circle", stroke({ cx: "86", cy: "70", r: "16", fill: fill("#fff3bf") }));
    add(svg, "circle", stroke({ cx: "100", cy: "86", r: "14", fill: fill("#fff3bf") }));
    add(svg, "circle", stroke({ cx: "78", cy: "90", r: "12", fill: fill("#c47a55") }));
  }

  function paintJigglypuff(svg, fill) {
    add(svg, "circle", stroke({ cx: "60", cy: "68", r: "40", fill: fill("#f783ac") }));
    add(svg, "polygon", stroke({ points: "52,30 60,10 68,30", fill: fill("#f783ac") }));
    add(svg, "ellipse", { cx: "60", cy: "78", rx: "16", ry: "12", fill: fill("#fffaf3") });
  }

  function paintSnorlax(svg, fill) {
    add(svg, "ellipse", stroke({ cx: "60", cy: "78", rx: "48", ry: "32", fill: fill("#0c8599") }));
    add(svg, "circle", stroke({ cx: "60", cy: "40", r: "16", fill: fill("#0c8599") }));
    add(svg, "polygon", stroke({ points: "46,32 50,18 56,32", fill: fill("#0c8599") }));
    add(svg, "polygon", stroke({ points: "64,32 70,18 74,32", fill: fill("#0c8599") }));
    add(svg, "ellipse", { cx: "60", cy: "86", rx: "26", ry: "16", fill: fill("#fffaf3") });
  }

  function paintGengar(svg, fill) {
    add(svg, "path", stroke({
      d: "M60,12 L80,34 L108,32 L90,54 L104,96 L78,84 L60,108 L42,84 L16,96 L30,54 L12,32 L40,34 Z",
      fill: fill("#7048e8"),
    }));
    add(svg, "circle", { cx: "46", cy: "58", r: "6", fill: fill("#fffaf3") });
    add(svg, "circle", { cx: "74", cy: "58", r: "6", fill: fill("#fffaf3") });
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
