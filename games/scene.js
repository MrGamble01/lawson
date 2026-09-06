// ---------- Sticker Scene! ----------
// Open-ended decorate-the-picture sandbox. A themed background fills
// the stage (park, beach, sky, jungle, snow), and a tray of stickers
// runs along the bottom. Drag a sticker onto the scene and it stays
// there. Tap a placed sticker to make it "speak" its sound. Tap the
// scene-switcher to swap to a new background; placed stickers come
// along for the ride so the scene keeps its character.
(function () {
  const L = window.Lawson;

  // ====================================================================
  //  Themed backgrounds — each is just a CSS gradient ID; the SVG art
  //  for the ground/sky lives in the .scene-bg variants in styles.css.
  // ====================================================================
  const SCENES = [
    { id: "park",    label: "Park",    bg: "linear-gradient(180deg, #a5d8ff 0%, #74c0fc 60%, #69db7c 100%)", say: "The park!" },
    { id: "beach",   label: "Beach",   bg: "linear-gradient(180deg, #74c0fc 0%, #ffe066 70%, #f8d775 100%)", say: "The beach!" },
    { id: "jungle",  label: "Jungle",  bg: "linear-gradient(180deg, #51cf66 0%, #2b8a3e 60%, #1a5d2a 100%)", say: "The jungle!" },
    { id: "ocean",   label: "Ocean",   bg: "linear-gradient(180deg, #4dabf7 0%, #1c7ed6 60%, #0c4f8a 100%)", say: "Underwater!" },
    { id: "space",   label: "Space",   bg: "linear-gradient(180deg, #1c1138 0%, #2e1b5b 50%, #4a1b5e 100%)", say: "Outer space!" },
    { id: "snow",    label: "Snow",    bg: "linear-gradient(180deg, #d0ebff 0%, #a5d8ff 60%, #fff 100%)",   say: "Snow day!" },
    { id: "forest",  label: "Forest",  bg: "linear-gradient(180deg, #d8f5a2 0%, #51cf66 60%, #2b8a3e 100%)", say: "The forest!" },
    { id: "kitchen", label: "Kitchen", bg: "linear-gradient(180deg, #fff3bf 0%, #ffe066 60%, #fab005 100%)", say: "The kitchen!" },
    { id: "farm",    label: "Farm",    bg: "linear-gradient(180deg, #ffe8a3 0%, #fab005 50%, #51cf66 100%)", say: "The farm!" },
    { id: "rainbow", label: "Rainbow", bg: "linear-gradient(180deg, #ff6b6b 0%, #fab005 20%, #51cf66 40%, #4dabf7 60%, #845ef7 80%, #c2255c 100%)", say: "Rainbow time!" },
    { id: "night",   label: "Night",   bg: "linear-gradient(180deg, #1c1138 0%, #2e1b5b 60%, #4a1b5e 100%)", say: "Sweet dreams!" },
  ];

  // ====================================================================
  //  Sticker catalog — each sticker has an emoji, a name, and an
  //  optional sound string for tap-to-play feedback.
  // ====================================================================
  const STICKERS = [
    { e: "🐶", n: "dog",    s: "Woof woof!" },
    { e: "🐱", n: "cat",    s: "Meow!" },
    { e: "🐰", n: "bunny",  s: "Hop hop!" },
    { e: "🦊", n: "fox",    s: "Yip yip!" },
    { e: "🐻", n: "bear",   s: "Grrr!" },
    { e: "🐼", n: "panda",  s: "Hi panda!" },
    { e: "🐧", n: "penguin", s: "Slide!" },
    { e: "🐢", n: "turtle", s: "Slow and steady!" },
    { e: "🦋", n: "butterfly", s: "Flutter flutter!" },
    { e: "🐝", n: "bee",    s: "Buzz buzz!" },
    { e: "🐞", n: "ladybug", s: "Tiny ladybug!" },
    { e: "🐌", n: "snail",  s: "Slowly!" },
    { e: "🐟", n: "fish",   s: "Glub glub!" },
    { e: "🐠", n: "clownfish", s: "Clownfish!" },
    { e: "🐬", n: "dolphin", s: "Eee eee!" },
    { e: "🐙", n: "octopus", s: "Octopus!" },
    { e: "🦀", n: "crab",   s: "Pinch!" },
    { e: "🐢", n: "turtle", s: "Splash!" },
    { e: "🦁", n: "lion",   s: "Roar!" },
    { e: "🐯", n: "tiger",  s: "Tiger!" },
    { e: "🐘", n: "elephant", s: "Toot!" },
    { e: "🦒", n: "giraffe", s: "Tall giraffe!" },
    { e: "🦓", n: "zebra",  s: "Zebra!" },
    { e: "🐵", n: "monkey", s: "Ooh ooh ah ah!" },
    { e: "🐦", n: "bird",   s: "Tweet tweet!" },
    { e: "🦅", n: "eagle",  s: "Soar!" },
    { e: "🦋", n: "butterfly", s: "Flutter!" },
    { e: "🌻", n: "sunflower", s: "Sunflower!" },
    { e: "🌷", n: "tulip",  s: "Tulip!" },
    { e: "🌸", n: "blossom", s: "Pretty blossom!" },
    { e: "🍎", n: "apple",  s: "Yummy apple!" },
    { e: "🍌", n: "banana", s: "Banana!" },
    { e: "⭐", n: "star",   s: "Twinkle!" },
    { e: "🌙", n: "moon",   s: "Goodnight moon!" },
    { e: "☀️", n: "sun",    s: "Shine!" },
    { e: "🌈", n: "rainbow", s: "Pretty rainbow!" },
    { e: "☁️", n: "cloud",  s: "Fluffy cloud!" },
    { e: "🎈", n: "balloon", s: "Pop pop!" },
    { e: "🌳", n: "tree",   s: "Big tree!" },
    { e: "🌲", n: "pine tree", s: "Pine tree!" },
    { e: "🚗", n: "car",    s: "Beep beep!" },
    { e: "🚂", n: "train",  s: "Choo choo!" },
    { e: "✈️", n: "plane",  s: "Wheee!" },
    { e: "🚀", n: "rocket", s: "Blast off!" },
    { e: "⛵", n: "sailboat", s: "Sail sail!" },
    { e: "🏠", n: "house",  s: "Home sweet home!" },
    { e: "🏰", n: "castle", s: "Castle!" },
    { e: "🚁", n: "helicopter", s: "Whirr!" },
    { e: "🦌", n: "deer",   s: "Pretty deer!" },
    { e: "🐺", n: "wolf",   s: "Awoo!" },
    { e: "🐮", n: "cow",    s: "Moo!" },
    { e: "🐷", n: "pig",    s: "Oink oink!" },
    { e: "🐴", n: "horse",  s: "Neigh!" },
    { e: "🐑", n: "sheep",  s: "Baa!" },
    { e: "🦆", n: "duck",   s: "Quack quack!" },
    { e: "🐔", n: "chicken", s: "Cluck cluck!" },
    { e: "🐸", n: "frog",   s: "Ribbit!" },
    { e: "🦔", n: "hedgehog", s: "Hedgehog!" },
    { e: "🐿️", n: "squirrel", s: "Bushy tail!" },
    { e: "🦘", n: "kangaroo", s: "Boing boing!" },
    { e: "🐻‍❄️", n: "polar bear", s: "Brrr!" },
    { e: "🦦", n: "otter",  s: "Splash!" },
    { e: "🐳", n: "whale",  s: "Whoosh!" },
    { e: "🦈", n: "shark",  s: "Big fish!" },
    { e: "🍓", n: "strawberry", s: "Sweet strawberry!" },
    { e: "🍕", n: "pizza",  s: "Pizza party!" },
    { e: "🍦", n: "ice cream", s: "Yummy!" },
    { e: "🎂", n: "cake",   s: "Birthday cake!" },
    { e: "🍪", n: "cookie", s: "Cookie!" },
    { e: "🍩", n: "donut",  s: "Donut!" },
    { e: "🎁", n: "present", s: "A present!" },
    { e: "🎉", n: "party",  s: "Party time!" },
    { e: "🎵", n: "music",  s: "Music!" },
    { e: "🎨", n: "art",    s: "Art!" },
    { e: "❤️", n: "heart",  s: "Love!" },
    { e: "💎", n: "diamond", s: "Shiny diamond!" },
    { e: "🪐", n: "planet", s: "A planet!" },
    { e: "🛸", n: "ufo",    s: "Beep boop!" },
    { e: "🌍", n: "earth",  s: "Our world!" },
    { e: "🌊", n: "wave",   s: "Whoosh wave!" },
    { e: "⚽", n: "ball",   s: "Soccer ball!" },
    { e: "🏀", n: "basketball", s: "Bounce!" },
    { e: "🎾", n: "tennis", s: "Pop!" },
  ];

  const MAX_PLACED = 36;       // Don't let the scene get TOO crowded.

  let placed = [];
  let sceneIdx = 0;
  let timers = [];

  function setT(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }
  function $(id) { return document.getElementById(id); }

  // ====================================================================
  //  Scene build
  // ====================================================================
  function build() {
    const stage = $("sceneStage");
    stage.innerHTML = `
      <div id="sceneBg" class="scene-bg"></div>
      <div id="scenePlaced" class="scene-placed"></div>
      <button id="sceneSwitch" class="scene-switch" aria-label="Next scene">
        <span class="scene-switch-icon">🔄</span>
        <span class="scene-switch-label">Scene</span>
      </button>
      <button id="sceneClear" class="scene-clear" aria-label="Clear scene">
        <span class="scene-clear-icon">🧽</span>
        <span class="scene-clear-label">Clear</span>
      </button>
      <div id="sceneTray" class="scene-tray"></div>`;
    applyScene();
    buildTray();
    setupSwitchers();
  }

  function applyScene(silent) {
    const bg = $("sceneBg");
    const scene = SCENES[sceneIdx % SCENES.length];
    if (bg) {
      bg.style.background = scene.bg;
      bg.dataset.scene = scene.id;
    }
    if (!silent) L.say(scene.say);
  }

  function setupSwitchers() {
    L.onTap($("sceneSwitch"), () => {
      sceneIdx = (sceneIdx + 1) % SCENES.length;
      applyScene();
      L.beep(580, 0.06, "sine");
      L.beep(720, 0.08, "sine", 0.06);
      L.haptic(6);
      saveScene();
    });
    L.onTap($("sceneClear"), () => {
      clearScene();
    });
  }

  function clearScene() {
    L.beep(420, 0.10, "triangle");
    L.haptic(8);
    L.say("All clean!");
    placed.forEach((p) => {
      p.el.classList.add("scene-clearing");
      setT(360, () => p.el.remove());
    });
    placed = [];
    saveScene();
  }

  function buildTray() {
    const tray = $("sceneTray");
    if (!tray) return;
    tray.innerHTML = "";
    const inner = document.createElement("div");
    inner.className = "scene-tray-inner";
    tray.appendChild(inner);
    STICKERS.forEach((s, i) => {
      const btn = document.createElement("button");
      btn.className = "scene-sticker-source";
      btn.textContent = s.e;
      btn.setAttribute("aria-label", s.n);
      btn.dataset.idx = String(i);
      inner.appendChild(btn);
      setupStickerDrag(btn, s);
    });
  }

  // ====================================================================
  //  Sticker drag from the tray onto the scene
  // ====================================================================
  function setupStickerDrag(btn, sticker) {
    let dragging = false;
    let ghost = null;
    let downX = 0;
    let downY = 0;

    function makeGhost(x, y) {
      ghost = document.createElement("div");
      ghost.className = "scene-sticker-ghost";
      ghost.textContent = sticker.e;
      document.body.appendChild(ghost);
      ghost.style.left = (x - 30) + "px";
      ghost.style.top  = (y - 30) + "px";
    }
    function moveGhost(x, y) {
      if (!ghost) return;
      ghost.style.left = (x - 30) + "px";
      ghost.style.top  = (y - 30) + "px";
    }
    function dropGhost(x, y) {
      if (!ghost) return;
      ghost.remove();
      ghost = null;
      // If dropped over the scene-bg area, place there.
      const stage = $("sceneStage");
      const bg = $("sceneBg");
      const tray = $("sceneTray");
      const trayRect = tray ? tray.getBoundingClientRect() : null;
      if (trayRect && y > trayRect.top - 8) return; // dropped on tray → discard
      const stageRect = bg ? bg.getBoundingClientRect() : stage.getBoundingClientRect();
      placeAt(sticker, x, y, stageRect);
    }

    btn.addEventListener("pointerdown", (e) => {
      dragging = true;
      downX = e.clientX;
      downY = e.clientY;
      btn.setPointerCapture?.(e.pointerId);
      btn.classList.add("grabbed");
      makeGhost(e.clientX, e.clientY);
      L.beep(620, 0.04, "sine");
      e.preventDefault();
    });
    btn.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      moveGhost(e.clientX, e.clientY);
    });
    btn.addEventListener("pointerup", (e) => {
      if (!dragging) return;
      dragging = false;
      btn.classList.remove("grabbed");
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved < 6) {
        // Treat as a tap — drop a sticker at the center of the scene.
        const bg = $("sceneBg");
        const r = bg.getBoundingClientRect();
        placeAt(sticker, r.left + r.width / 2, r.top + r.height / 2 + (Math.random() - 0.5) * 80, r);
        if (ghost) { ghost.remove(); ghost = null; }
      } else {
        dropGhost(e.clientX, e.clientY);
      }
    });
    btn.addEventListener("pointercancel", () => {
      dragging = false;
      btn.classList.remove("grabbed");
      if (ghost) { ghost.remove(); ghost = null; }
    });
  }

  // Interactive placement from a drag/tap: converts the drop point to a
  // percentage, rolls a random size/rotation, then hands off to the core
  // builder (shared with restore). `interactive` gates sound + save.
  function placeAt(sticker, clientX, clientY, sceneRect) {
    const x = ((clientX - sceneRect.left) / sceneRect.width) * 100;
    const y = ((clientY - sceneRect.top) / sceneRect.height) * 100;
    const px = Math.max(2, Math.min(98, x));
    const py = Math.max(2, Math.min(98, y));
    const scale = 0.85 + Math.random() * 0.5;
    const rot = (Math.random() - 0.5) * 30;
    addSticker(sticker, px, py, scale, rot, true);
    saveScene();
  }

  // Core sticker builder. Used by placeAt (interactive) and loadScene
  // (restore). Stores scale/rot on the record so the scene rebuilds
  // pixel-identical after a reload.
  function addSticker(sticker, px, py, scale, rot, interactive) {
    if (placed.length >= MAX_PLACED) {
      const old = placed.shift();
      if (old) old.el.remove();
    }
    const cont = $("scenePlaced");
    if (!cont) return;
    const el = document.createElement("button");
    el.className = "scene-placed-sticker";
    el.textContent = sticker.e;
    el.style.left = px + "%";
    el.style.top  = py + "%";
    el.style.fontSize = `clamp(36px, calc(${8 * scale}vw), 96px)`;
    el.style.setProperty("--rot", rot + "deg");
    cont.appendChild(el);
    placed.push({ el, sticker, x: px, y: py, scale, rot });
    if (interactive) {
      L.beep(650 + Math.random() * 250, 0.05, "triangle");
      L.haptic(5);
      L.say(sticker.s);
      if (placed.length === 1) L.earnSticker && L.earnSticker("sceneArtist");
      if (placed.length >= 12) L.earnSticker && L.earnSticker("sceneMaker");
    }
    // Tap a placed sticker to hear it again, or long-press to remove.
    let pressTimer = null;
    let pressed = false;
    el.addEventListener("pointerdown", (e) => {
      pressed = true;
      pressTimer = setT(500, () => {
        if (pressed) {
          el.classList.add("scene-clearing");
          setT(280, () => el.remove());
          placed = placed.filter((p) => p.el !== el);
          L.beep(280, 0.06, "sine");
          L.haptic(8);
          saveScene();
        }
      });
    });
    el.addEventListener("pointerup", () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      if (pressed) {
        pressed = false;
        L.beep(720 + Math.random() * 200, 0.05, "sine");
        L.say(sticker.s);
        el.classList.remove("scene-wiggle");
        void el.offsetWidth;
        el.classList.add("scene-wiggle");
      }
    });
    el.addEventListener("pointercancel", () => {
      pressed = false;
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    });
  }

  // ====================================================================
  //  Persistence — the kid's decorated scene survives leaving and
  //  coming back (or a full reload). Stores sticker index + position +
  //  size/rotation so it restores exactly.
  // ====================================================================
  const SAVE_KEY = "lawson:scene";
  function saveScene() {
    try {
      const data = {
        sceneIdx,
        items: placed.map((p) => ({
          i: STICKERS.indexOf(p.sticker),
          x: Math.round(p.x * 10) / 10,
          y: Math.round(p.y * 10) / 10,
          s: Math.round(p.scale * 100) / 100,
          r: Math.round(p.rot * 10) / 10,
        })).filter((it) => it.i >= 0),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (_) {}
  }
  function loadScene() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.items)) return false;
      sceneIdx = data.sceneIdx || 0;
      applyScene(true);
      data.items.forEach((it) => {
        const sticker = STICKERS[it.i];
        if (sticker) addSticker(sticker, it.x, it.y, it.s || 1, it.r || 0, false);
      });
      return placed.length > 0;
    } catch (_) { return false; }
  }

  // ====================================================================
  //  Lifecycle
  // ====================================================================
  function start() {
    placed = [];
    sceneIdx = 0;
    clearAll();
    build();
    // Bring back the kid's saved scene if there is one; otherwise greet.
    const restored = loadScene();
    if (restored) L.say("Here's your picture!");
    else L.say("Drag stickers onto the picture!");
  }

  function stop() {
    clearAll();
    placed = [];
  }

  L.games.scene = { screen: "sceneGame", start, stop };
})();
