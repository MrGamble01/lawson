// ---------- Coloring Pages ----------
// Tap a color in the palette, then tap a region of the picture to fill it.
// Pages are inline SVGs with named regions, so taps reliably hit a single
// shape (no flood-fill, no precision needed). The "Next" button cycles
// through pages; "Clear" wipes all colors back to white.
(function () {
  const L = window.Lawson;

  const PALETTE = [
    { name: "Red",    hex: "#ff3b30" },
    { name: "Orange", hex: "#ff9500" },
    { name: "Yellow", hex: "#ffd60a" },
    { name: "Green",  hex: "#34c759" },
    { name: "Blue",   hex: "#007aff" },
    { name: "Purple", hex: "#af52de" },
    { name: "Pink",   hex: "#ff2d92" },
    { name: "Brown",  hex: "#8b4513" },
    { name: "Black",  hex: "#222" },
    { name: "White",  hex: "#ffffff" },
  ];

  // Each page is an SVG string. Regions to color use class="region" and a
  // data-name for the spoken hint. `stroke-width` should be roughly equal
  // across pages to keep outlines feeling consistent.
  const PAGES = [
    {
      name: "Apple",
      svg: `
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <path class="region" data-name="apple" d="M200 110 C 110 110, 70 200, 100 290 C 120 350, 180 360, 200 340 C 220 360, 280 350, 300 290 C 330 200, 290 110, 200 110 Z" fill="white" stroke="#222" stroke-width="6" stroke-linejoin="round"/>
          <path class="region" data-name="leaf" d="M200 90 C 220 70, 260 70, 270 60 C 260 100, 230 120, 205 115 Z" fill="white" stroke="#222" stroke-width="5" stroke-linejoin="round"/>
          <path class="region" data-name="stem" d="M198 95 L 200 70 L 206 70 L 204 95 Z" fill="white" stroke="#222" stroke-width="4" stroke-linejoin="round"/>
        </svg>`,
    },
    {
      name: "Fish",
      svg: `
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <path class="region" data-name="body" d="M70 200 C 90 130, 230 130, 290 200 C 230 270, 90 270, 70 200 Z" fill="white" stroke="#222" stroke-width="6" stroke-linejoin="round"/>
          <path class="region" data-name="tail" d="M290 200 L 360 140 L 360 260 Z" fill="white" stroke="#222" stroke-width="6" stroke-linejoin="round"/>
          <path class="region" data-name="top fin" d="M180 145 L 220 110 L 235 150 Z" fill="white" stroke="#222" stroke-width="5" stroke-linejoin="round"/>
          <path class="region" data-name="bottom fin" d="M180 255 L 220 290 L 235 250 Z" fill="white" stroke="#222" stroke-width="5" stroke-linejoin="round"/>
          <circle class="region" data-name="eye" cx="120" cy="190" r="14" fill="white" stroke="#222" stroke-width="4"/>
          <path d="M150 175 Q 170 200 150 225" fill="none" stroke="#222" stroke-width="4"/>
        </svg>`,
    },
    {
      name: "Butterfly",
      svg: `
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <path class="region" data-name="left top wing" d="M200 200 C 130 100, 60 110, 70 180 C 80 230, 150 240, 200 210 Z" fill="white" stroke="#222" stroke-width="6" stroke-linejoin="round"/>
          <path class="region" data-name="right top wing" d="M200 200 C 270 100, 340 110, 330 180 C 320 230, 250 240, 200 210 Z" fill="white" stroke="#222" stroke-width="6" stroke-linejoin="round"/>
          <path class="region" data-name="left bottom wing" d="M200 220 C 150 250, 90 290, 110 330 C 140 360, 180 320, 200 240 Z" fill="white" stroke="#222" stroke-width="6" stroke-linejoin="round"/>
          <path class="region" data-name="right bottom wing" d="M200 220 C 250 250, 310 290, 290 330 C 260 360, 220 320, 200 240 Z" fill="white" stroke="#222" stroke-width="6" stroke-linejoin="round"/>
          <ellipse class="region" data-name="body" cx="200" cy="230" rx="14" ry="60" fill="white" stroke="#222" stroke-width="5"/>
          <circle class="region" data-name="head" cx="200" cy="160" r="16" fill="white" stroke="#222" stroke-width="5"/>
          <path d="M192 150 Q 175 120 165 110" fill="none" stroke="#222" stroke-width="4"/>
          <path d="M208 150 Q 225 120 235 110" fill="none" stroke="#222" stroke-width="4"/>
        </svg>`,
    },
    {
      name: "House",
      svg: `
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <path class="region" data-name="roof" d="M60 200 L 200 80 L 340 200 Z" fill="white" stroke="#222" stroke-width="6" stroke-linejoin="round"/>
          <rect class="region" data-name="walls" x="90" y="200" width="220" height="160" fill="white" stroke="#222" stroke-width="6"/>
          <rect class="region" data-name="door" x="180" y="270" width="60" height="90" fill="white" stroke="#222" stroke-width="5"/>
          <rect class="region" data-name="window" x="120" y="230" width="40" height="40" fill="white" stroke="#222" stroke-width="5"/>
          <rect class="region" data-name="window" x="240" y="230" width="40" height="40" fill="white" stroke="#222" stroke-width="5"/>
          <line x1="140" y1="230" x2="140" y2="270" stroke="#222" stroke-width="4"/>
          <line x1="120" y1="250" x2="160" y2="250" stroke="#222" stroke-width="4"/>
          <line x1="260" y1="230" x2="260" y2="270" stroke="#222" stroke-width="4"/>
          <line x1="240" y1="250" x2="280" y2="250" stroke="#222" stroke-width="4"/>
          <circle class="region" data-name="doorknob" cx="225" cy="320" r="5" fill="white" stroke="#222" stroke-width="3"/>
        </svg>`,
    },
    {
      name: "Flower",
      svg: `
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <ellipse class="region" data-name="petal" cx="200" cy="120" rx="40" ry="55" fill="white" stroke="#222" stroke-width="5"/>
          <ellipse class="region" data-name="petal" cx="290" cy="180" rx="55" ry="40" fill="white" stroke="#222" stroke-width="5"/>
          <ellipse class="region" data-name="petal" cx="110" cy="180" rx="55" ry="40" fill="white" stroke="#222" stroke-width="5"/>
          <ellipse class="region" data-name="petal" cx="260" cy="260" rx="50" ry="40" transform="rotate(-30 260 260)" fill="white" stroke="#222" stroke-width="5"/>
          <ellipse class="region" data-name="petal" cx="140" cy="260" rx="50" ry="40" transform="rotate(30 140 260)" fill="white" stroke="#222" stroke-width="5"/>
          <circle class="region" data-name="center" cx="200" cy="200" r="40" fill="white" stroke="#222" stroke-width="6"/>
          <path class="region" data-name="stem" d="M195 240 Q 190 320 200 380 Q 210 320 205 240 Z" fill="white" stroke="#222" stroke-width="5" stroke-linejoin="round"/>
          <path class="region" data-name="leaf" d="M205 310 Q 270 290 290 340 Q 240 360 205 330 Z" fill="white" stroke="#222" stroke-width="5" stroke-linejoin="round"/>
        </svg>`,
    },
    {
      name: "Sun",
      svg: `
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <circle class="region" data-name="sun" cx="200" cy="200" r="80" fill="white" stroke="#222" stroke-width="6"/>
          <path class="region" data-name="ray" d="M200 60 L 215 110 L 185 110 Z" fill="white" stroke="#222" stroke-width="5"/>
          <path class="region" data-name="ray" d="M200 340 L 215 290 L 185 290 Z" fill="white" stroke="#222" stroke-width="5"/>
          <path class="region" data-name="ray" d="M60 200 L 110 215 L 110 185 Z" fill="white" stroke="#222" stroke-width="5"/>
          <path class="region" data-name="ray" d="M340 200 L 290 215 L 290 185 Z" fill="white" stroke="#222" stroke-width="5"/>
          <path class="region" data-name="ray" d="M100 100 L 145 130 L 130 145 Z" fill="white" stroke="#222" stroke-width="5"/>
          <path class="region" data-name="ray" d="M300 100 L 255 130 L 270 145 Z" fill="white" stroke="#222" stroke-width="5"/>
          <path class="region" data-name="ray" d="M100 300 L 145 270 L 130 255 Z" fill="white" stroke="#222" stroke-width="5"/>
          <path class="region" data-name="ray" d="M300 300 L 255 270 L 270 255 Z" fill="white" stroke="#222" stroke-width="5"/>
          <circle cx="175" cy="190" r="6" fill="#222"/>
          <circle cx="225" cy="190" r="6" fill="#222"/>
          <path d="M170 220 Q 200 245 230 220" fill="none" stroke="#222" stroke-width="5" stroke-linecap="round"/>
        </svg>`,
    },
    {
      name: "Tree",
      svg: `
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <path class="region" data-name="leaves" d="M200 40 C 110 80, 80 180, 130 230 C 70 240, 80 320, 160 320 L 240 320 C 320 320, 330 240, 270 230 C 320 180, 290 80, 200 40 Z" fill="white" stroke="#222" stroke-width="6" stroke-linejoin="round"/>
          <rect class="region" data-name="trunk" x="180" y="290" width="40" height="80" fill="white" stroke="#222" stroke-width="5"/>
          <circle class="region" data-name="apple" cx="160" cy="170" r="14" fill="white" stroke="#222" stroke-width="4"/>
          <circle class="region" data-name="apple" cx="240" cy="200" r="14" fill="white" stroke="#222" stroke-width="4"/>
          <circle class="region" data-name="apple" cx="200" cy="130" r="14" fill="white" stroke="#222" stroke-width="4"/>
          <rect class="region" data-name="ground" x="60" y="365" width="280" height="20" fill="white" stroke="#222" stroke-width="5"/>
        </svg>`,
    },
    {
      name: "Ice cream",
      svg: `
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <circle class="region" data-name="scoop one" cx="160" cy="140" r="55" fill="white" stroke="#222" stroke-width="6"/>
          <circle class="region" data-name="scoop two" cx="240" cy="140" r="55" fill="white" stroke="#222" stroke-width="6"/>
          <circle class="region" data-name="scoop three" cx="200" cy="90"  r="50" fill="white" stroke="#222" stroke-width="6"/>
          <path class="region" data-name="cone" d="M110 200 L 290 200 L 200 370 Z" fill="white" stroke="#222" stroke-width="6" stroke-linejoin="round"/>
          <line x1="140" y1="240" x2="220" y2="320" stroke="#222" stroke-width="3"/>
          <line x1="180" y1="240" x2="260" y2="320" stroke="#222" stroke-width="3"/>
          <line x1="220" y1="240" x2="280" y2="290" stroke="#222" stroke-width="3"/>
          <circle class="region" data-name="cherry" cx="200" cy="50" r="12" fill="white" stroke="#222" stroke-width="4"/>
          <path d="M200 38 Q 215 25 230 30" stroke="#222" stroke-width="3" fill="none"/>
        </svg>`,
    },
    {
      name: "Snowman",
      svg: `
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <circle class="region" data-name="body"  cx="200" cy="290" r="80" fill="white" stroke="#222" stroke-width="6"/>
          <circle class="region" data-name="belly" cx="200" cy="180" r="62" fill="white" stroke="#222" stroke-width="6"/>
          <circle class="region" data-name="head"  cx="200" cy="100" r="48" fill="white" stroke="#222" stroke-width="6"/>
          <path class="region" data-name="hat" d="M150 70 L 250 70 L 250 50 L 230 50 L 230 20 L 170 20 L 170 50 L 150 50 Z" fill="white" stroke="#222" stroke-width="5" stroke-linejoin="round"/>
          <circle cx="185" cy="95" r="5" fill="#222"/>
          <circle cx="215" cy="95" r="5" fill="#222"/>
          <path class="region" data-name="nose" d="M198 108 L 240 118 L 198 122 Z" fill="white" stroke="#222" stroke-width="3" stroke-linejoin="round"/>
          <circle cx="200" cy="160" r="4" fill="#222"/>
          <circle cx="200" cy="180" r="4" fill="#222"/>
          <circle cx="200" cy="200" r="4" fill="#222"/>
          <path d="M138 180 Q 100 160 80 130" stroke="#222" stroke-width="6" fill="none" stroke-linecap="round"/>
          <path d="M262 180 Q 300 160 320 130" stroke="#222" stroke-width="6" fill="none" stroke-linecap="round"/>
        </svg>`,
    },
    {
      name: "Rainbow",
      svg: `
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <path class="region" data-name="red arc"    d="M40 320 A 160 160 0 0 1 360 320 L 320 320 A 120 120 0 0 0 80 320 Z" fill="white" stroke="#222" stroke-width="5" stroke-linejoin="round"/>
          <path class="region" data-name="orange arc" d="M80 320 A 120 120 0 0 1 320 320 L 280 320 A 80 80 0 0 0 120 320 Z" fill="white" stroke="#222" stroke-width="5" stroke-linejoin="round"/>
          <path class="region" data-name="yellow arc" d="M120 320 A 80 80 0 0 1 280 320 L 240 320 A 40 40 0 0 0 160 320 Z" fill="white" stroke="#222" stroke-width="5" stroke-linejoin="round"/>
          <circle class="region" data-name="cloud one" cx="60" cy="320" r="30" fill="white" stroke="#222" stroke-width="5"/>
          <circle class="region" data-name="cloud two" cx="340" cy="320" r="30" fill="white" stroke="#222" stroke-width="5"/>
          <circle class="region" data-name="sun" cx="320" cy="80" r="35" fill="white" stroke="#222" stroke-width="5"/>
        </svg>`,
    },
  ];

  let currentColor = PALETTE[0];
  let pageIndex = 0;
  let fillsThisSession = 0;

  function renderPage() {
    const stage = document.getElementById("colorStage");
    const page = PAGES[pageIndex];
    stage.innerHTML = page.svg;

    stage.querySelectorAll(".region").forEach((region) => {
      region.style.cursor = "pointer";
      L.onTap(region, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        const wasWhite = (region.getAttribute("fill") || "white").toLowerCase() === "white";
        region.setAttribute("fill", currentColor.hex);
        L.beep(400 + Math.random() * 300, 0.08, "triangle");
        const part = region.getAttribute("data-name");
        L.say(part ? `${currentColor.name} ${part}` : currentColor.name);
        // Count only first-time fills per region so re-coloring the same
        // spot doesn't farm the sticker.
        if (wasWhite) {
          fillsThisSession += 1;
          if (fillsThisSession >= 10) L.earnSticker && L.earnSticker("color10");
        }
      });
    });

    L.say(page.name);
  }

  function renderPalette() {
    const palette = document.getElementById("colorPalette");
    palette.innerHTML = "";
    PALETTE.forEach((c) => {
      const swatch = document.createElement("button");
      swatch.className = "color-swatch";
      swatch.style.background = c.hex;
      swatch.dataset.name = c.name;
      if (c.hex === currentColor.hex) swatch.classList.add("active");
      L.onTap(swatch, () => {
        currentColor = c;
        palette.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
        swatch.classList.add("active");
        L.beep(500, 0.08, "sine");
        L.say(c.name);
      });
      palette.appendChild(swatch);
    });
  }

  function clearAll() {
    const stage = document.getElementById("colorStage");
    stage.querySelectorAll(".region").forEach((r) => r.setAttribute("fill", "white"));
    L.happySound();
    L.say("All clean!");
  }

  function nextPage() {
    pageIndex = (pageIndex + 1) % PAGES.length;
    renderPage();
    L.beep(700, 0.1, "triangle");
  }

  function start() {
    pageIndex = 0;
    currentColor = PALETTE[0];
    fillsThisSession = 0;
    renderPalette();
    renderPage();
    L.onTap(document.getElementById("colorClear"), clearAll);
    L.onTap(document.getElementById("colorNext"), nextPage);
  }

  function stop() {}

  L.games.color = { screen: "colorGame", start, stop };
})();
