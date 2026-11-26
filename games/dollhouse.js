// ---------- Lawson's Dollhouse ----------
// Gabby's house, built for a phone in one hand. A short hello (mailbox,
// ears, Pandy) can be skipped and stays skipped on later visits. The hub
// opens seven rooms. Each room is a Play Stats mode via L.noteMode, so
// visits and time show up in the existing play log — there is no second
// stats store. Finishing a room earns the Gabby Cat sticker.
(function () {
  const L = window.Lawson;
  const KEY = "lawson:dollhouse";

  const ROOMS = [
    { id: "kitchen", mode: "Kitchen", short: "Kitchen", emoji: "🧁", say: "Cakey's kitchen!", done: "Sprinkle party!" },
    { id: "craft", mode: "Craft Room", short: "Craft", emoji: "📦", say: "Baby Box's craft room!", done: "What a picture!" },
    { id: "music", mode: "Music Room", short: "Music", emoji: "🎧", say: "DJ Catnip!", done: "Nice beat!" },
    { id: "bathroom", mode: "Bathroom", short: "Bath", emoji: "🛁", say: "MerCat's bathroom!", done: "Fizzy potion!" },
    { id: "garden", mode: "Fairy Tail Garden", short: "Garden", emoji: "🧚", say: "Kitty Fairy's garden!", done: "The garden sparkles!" },
    { id: "playroom", mode: "Playroom", short: "Play", emoji: "🚙", say: "Carlita's playroom!", done: "Carlita found the treats!" },
    { id: "bedroom", mode: "Bedroom", short: "Bed", emoji: "🛏️", say: "Pillow Cat's bedroom!", done: "That's how I roll!" },
  ];

  let gen = 0;
  let pending = [];
  let celebrated = false;
  const ears = { left: false, right: false };

  function note(mode) {
    try { if (L.noteMode) L.noteMode(mode); } catch (_) {}
  }
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "{}");
      return data && typeof data === "object" ? data : {};
    } catch (_) { return {}; }
  }
  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
  }
  function doneSet() {
    const rooms = load().rooms;
    return new Set(Array.isArray(rooms) ? rooms : []);
  }
  function markSeen() {
    const data = load();
    data.seen = true;
    save(data);
  }
  function clearPending() {
    while (pending.length) {
      const cancel = pending.pop();
      try { cancel(); } catch (_) {}
    }
  }
  function cleanup() {
    gen += 1;
    clearPending();
  }
  function arm(fn, opts) {
    const here = gen;
    const cancel = L.afterSpeech(() => { if (gen === here) fn(); }, opts);
    pending.push(cancel);
  }
  function greet(line) {
    L.happySound();
    L.say(line);
  }
  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }
  function text(tag, className, value) {
    const node = el(tag, className);
    node.textContent = value;
    return node;
  }
  function emoji(char) {
    const node = text("span", "dh-emoji", char);
    node.setAttribute("aria-hidden", "true");
    return node;
  }
  function gem() {
    const node = text("span", "dh-gem", "💎");
    node.setAttribute("aria-hidden", "true");
    return node;
  }
  function tap(label, className, on) {
    const button = el("button", className);
    button.type = "button";
    button.setAttribute("aria-label", label);
    L.onTap(button, () => {
      try { L.haptic(8); } catch (_) {}
      on();
    });
    return button;
  }
  function mount(view, node) {
    const host = document.getElementById("dollhouseStage");
    if (!host) return;
    if (host.dataset.view !== view) delete host.dataset.done;
    host.dataset.view = view;
    host.replaceChildren(node);
  }
  function finishRoom(id) {
    if (celebrated) return;
    celebrated = true;
    const room = ROOMS.find((item) => item.id === id);
    const here = gen;
    const data = load();
    data.seen = true;
    const rooms = Array.isArray(data.rooms) ? data.rooms.slice() : [];
    if (!rooms.includes(id)) rooms.push(id);
    data.rooms = rooms;
    save(data);
    const host = document.getElementById("dollhouseStage");
    if (host) {
      host.dataset.done = id;
      const rect = host.getBoundingClientRect();
      L.sparkleAt(rect.left + rect.width / 2, rect.top + rect.height * 0.35);
    }
    L.happySound();
    Promise.resolve(L.say(room.done)).then(() => {
      if (gen !== here) return;
      if (L.earnSticker) L.earnSticker("gabbyCat");
    });
  }
  function skipButton() {
    const button = tap("Skip to the dollhouse", "dh-skip", skipIntro);
    button.append(emoji("⏭️"), text("span", "dh-word", "Skip"));
    return button;
  }
  function backButton() {
    const button = tap("Back to Dollhouse", "dh-back", () => {
      L.beep(520, 0.08, "triangle");
      openHub();
    });
    button.append(emoji("🏠"), text("span", "dh-word", "Back to Dollhouse"));
    return button;
  }
  function roomHead(room) {
    const head = el("div", "dh-head");
    head.append(emoji(room.emoji), text("p", "dh-room-name", room.mode));
    return head;
  }
  function choice(label, className, pressed, on) {
    const button = tap(label, className + (pressed ? " is-on" : ""), on);
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
    return button;
  }

  function skipIntro() {
    markSeen();
    openHub({ greet: true });
  }

  function openMail() {
    clearPending();
    ears.left = false;
    ears.right = false;
    note("Hello");
    const view = el("div", "dh-view");
    view.append(text("p", "dh-kicker", "Meow-Meow"));
    const box = tap("Open the Meow-Meow mailbox", "dh-hero", () => {
      if (box.dataset.open === "yes") return;
      box.dataset.open = "yes";
      L.happySound();
      L.say("Meow meow! Come play!");
      arm(openEars, { minMs: 650 });
    });
    box.append(emoji("📬"), emoji("🐱"));
    view.append(box, skipButton());
    mount("mail", view);
    greet("Meow meow mailbox!");
  }

  function pinch(side, button) {
    if (ears[side]) return;
    ears[side] = true;
    button.classList.add("is-on");
    button.setAttribute("aria-pressed", "true");
    L.beep(side === "left" ? 700 : 880, 0.08, "triangle");
    if (ears.left && ears.right) {
      L.happySound();
      L.say("Hee hee!");
      arm(openPandy, { minMs: 500 });
    }
  }

  function openEars() {
    clearPending();
    note("Hello");
    const view = el("div", "dh-view");
    const face = el("div", "dh-face");
    face.setAttribute("aria-hidden", "true");
    face.append(emoji("🐱"));
    const row = el("div", "dh-ears");
    const left = tap("Pinch Gabby's left ear", "dh-ear", () => pinch("left", left));
    const right = tap("Pinch Gabby's right ear", "dh-ear", () => pinch("right", right));
    left.append(emoji("👂"));
    right.append(emoji("👂"));
    if (ears.left) { left.classList.add("is-on"); left.setAttribute("aria-pressed", "true"); }
    if (ears.right) { right.classList.add("is-on"); right.setAttribute("aria-pressed", "true"); }
    row.append(left, right);
    view.append(face, row, skipButton());
    mount("ears", view);
  }

  function openPandy() {
    clearPending();
    note("Hello");
    const view = el("div", "dh-view");
    const hug = tap("Pandy's hug attack", "dh-hero", () => {
      if (hug.dataset.hug === "yes") return;
      hug.dataset.hug = "yes";
      L.happySound();
      L.say("Hug attack!");
      markSeen();
      arm(() => openHub(), { minMs: 550 });
    });
    hug.append(emoji("🐼"), emoji("🐱"));
    view.append(hug, skipButton());
    mount("pandy", view);
  }

  function paintHub() {
    const view = el("div", "dh-view dh-hub");
    view.append(text("p", "dh-title", "Dollhouse"));
    const doors = el("div", "dh-doors");
    const done = doneSet();
    ROOMS.forEach((room) => {
      const finished = done.has(room.id);
      const label = finished ? room.mode + ", all done" : room.mode;
      const door = tap(label, "dh-door" + (finished ? " is-done" : ""), () => openRoom(room.id));
      door.dataset.room = room.id;
      door.append(emoji(room.emoji), text("span", "dh-door-name", room.short));
      if (finished) door.append(emoji("⭐"));
      doors.append(door);
    });
    const extra = el("div", "dh-hub-extra");
    const progress = load();
    const cat = tap("CatRat's treasure", "dh-catrat" + (progress.catrat ? " is-found" : ""), () => {
      L.happySound();
      L.say("CatRat brought a treasure!");
      cat.dataset.found = "yes";
      cat.classList.add("is-found");
      if (!cat.querySelector(".dh-gem")) cat.append(gem());
      const data = load();
      data.catrat = true;
      save(data);
      const rect = cat.getBoundingClientRect();
      L.sparkleAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    cat.dataset.dh = "catrat";
    cat.append(emoji("🐭"), text("span", "dh-word", "CatRat"));
    if (progress.catrat) {
      cat.dataset.found = "yes";
      cat.append(gem());
    }
    const hello = tap("Play the Hello again", "dh-replay", () => {
      L.beep(660, 0.06, "triangle");
      openMail();
    });
    hello.append(emoji("📬"), text("span", "dh-word", "Hello"));
    extra.append(cat, hello);
    view.append(doors, extra);
    mount("hub", view);
  }

  function openHub(opts) {
    clearPending();
    note("Dollhouse");
    paintHub();
    if (opts && opts.greet) greet("Dollhouse!");
  }

  function openRoom(id) {
    const room = ROOMS.find((item) => item.id === id);
    clearPending();
    celebrated = false;
    note(room.mode);
    const painter = painters[id];
    painter.reset();
    painter.render();
    greet(room.say);
  }

  function makeKitchen() {
    const bases = [
      { id: "cake", label: "Cake", emoji: "🍰" },
      { id: "cupcake", label: "Cupcake", emoji: "🧁" },
      { id: "cookie", label: "Cookie", emoji: "🍪" },
    ];
    const frosts = [
      { id: "pink", label: "Pink frosting", emoji: "💗" },
      { id: "choco", label: "Chocolate frosting", emoji: "🍫" },
      { id: "blue", label: "Blue frosting", emoji: "💙" },
    ];
    const tops = [
      { id: "berry", label: "Strawberry", emoji: "🍓" },
      { id: "star", label: "Star", emoji: "⭐" },
      { id: "candy", label: "Candy", emoji: "🍬" },
    ];
    let picked = { base: "", frost: "", top: "" };
    function ready() { return picked.base && picked.frost && picked.top; }
    function choose(field, id) {
      picked[field] = id;
      L.beep(640, 0.07, "triangle");
      render();
    }
    function party() {
      const cake = document.querySelector("#dollhouseStage .dh-cake");
      if (cake) cake.classList.add("is-party");
      if (!celebrated) finishRoom("kitchen");
      else L.beep(760, 0.08, "triangle");
    }
    function row(items, field) {
      const wrap = el("div", "dh-choices dh-row-3");
      items.forEach((item) => {
        const button = choice(item.label, "dh-choice", picked[field] === item.id, () => choose(field, item.id));
        button.append(emoji(item.emoji));
        wrap.append(button);
      });
      return wrap;
    }
    function render() {
      const room = ROOMS[0];
      const view = el("div", "dh-view");
      const body = el("div", "dh-body");
      const cake = el("div", "dh-cake");
      cake.setAttribute("aria-hidden", "true");
      const bits = [
        (bases.find((item) => item.id === picked.base) || { emoji: "🍽️" }).emoji,
        (frosts.find((item) => item.id === picked.frost) || { emoji: "" }).emoji,
        (tops.find((item) => item.id === picked.top) || { emoji: "" }).emoji,
      ].filter(Boolean);
      cake.textContent = bits.join(" ");
      const burst = tap("Sprinkle party", "dh-party", party);
      burst.append(emoji("🎉"), text("span", "dh-word", "Sprinkle party"));
      if (!ready()) burst.hidden = true;
      body.append(cake, row(bases, "base"), row(frosts, "frost"), row(tops, "top"), burst);
      view.append(roomHead(room), body, backButton());
      mount(room.id, view);
    }
    return { reset() { picked = { base: "", frost: "", top: "" }; }, render };
  }

  function makeCraft() {
    const tools = [
      { kind: "paint", label: "Red paint", color: "#fa5252" },
      { kind: "paint", label: "Blue paint", color: "#4dabf7" },
      { kind: "paint", label: "Yellow paint", color: "#ffd43b" },
      { kind: "glitter", label: "Glitter", emoji: "✨" },
      { kind: "sticker", label: "Heart sticker", emoji: "💖" },
      { kind: "sticker", label: "Star sticker", emoji: "⭐" },
      { kind: "sticker", label: "Flower sticker", emoji: "🌸" },
      { kind: "shape", label: "Circle shape", emoji: "●" },
      { kind: "shape", label: "Star shape", emoji: "★" },
      { kind: "shape", label: "Heart shape", emoji: "♥" },
    ];
    let stack = [];
    function has(kind) { return stack.some((mark) => mark.kind === kind); }
    function ready() { return has("paint") && has("glitter") && has("sticker") && has("shape"); }
    function add(tool) {
      stack.push(tool);
      render();
      if (ready()) finishRoom("craft");
      else L.beep(600, 0.06, "triangle");
    }
    function undo() {
      if (!stack.length) { L.buzzSound(); return; }
      stack.pop();
      L.beep(400, 0.06, "triangle");
      render();
    }
    function render() {
      const room = ROOMS[1];
      const view = el("div", "dh-view");
      const body = el("div", "dh-body");
      const paper = el("div", "dh-paper");
      paper.dataset.marks = String(stack.length);
      stack.forEach((mark, index) => {
        const dot = el("span", "dh-mark" + (mark.color ? " is-paint" : ""));
        dot.setAttribute("aria-hidden", "true");
        dot.style.left = (8 + (index * 19) % 70) + "%";
        dot.style.top = (10 + (index * 27) % 62) + "%";
        if (mark.color) dot.style.background = mark.color;
        else {
          dot.textContent = mark.emoji;
          dot.style.color = mark.kind === "shape" ? "#c2255c" : "#3a2a22";
        }
        paper.append(dot);
      });
      const grid = el("div", "dh-choices dh-row-4");
      tools.forEach((tool) => {
        const button = tap(tool.label, "dh-choice", () => add(tool));
        if (tool.color) {
          const swatch = el("span", "dh-swatch");
          swatch.style.background = tool.color;
          swatch.setAttribute("aria-hidden", "true");
          button.append(swatch);
        } else button.append(emoji(tool.emoji));
        grid.append(button);
      });
      const whoops = tap("Whoopsies", "dh-whoops", undo);
      whoops.append(emoji("↩️"), text("span", "dh-word", "Whoopsies"));
      grid.append(whoops);
      body.append(paper, grid);
      view.append(roomHead(room), body, backButton());
      mount(room.id, view);
    }
    return { reset() { stack = []; }, render };
  }

  function makeMusic() {
    const keys = [
      { label: "Piano key 1", freq: 262, type: "triangle", dur: 0.18, emoji: "🎹" },
      { label: "Piano key 2", freq: 294, type: "triangle", dur: 0.18, emoji: "🎹" },
      { label: "Piano key 3", freq: 330, type: "triangle", dur: 0.18, emoji: "🎹" },
      { label: "Piano key 4", freq: 349, type: "triangle", dur: 0.18, emoji: "🎹" },
      { label: "Piano key 5", freq: 392, type: "triangle", dur: 0.18, emoji: "🎹" },
    ];
    const bells = [
      { label: "Bell 1", freq: 523, type: "sine", dur: 0.22, emoji: "🔔" },
      { label: "Bell 2", freq: 659, type: "sine", dur: 0.22, emoji: "🔔" },
      { label: "Bell 3", freq: 784, type: "sine", dur: 0.22, emoji: "🔔" },
    ];
    const drums = [
      { label: "Drum 1", freq: 90, type: "square", dur: 0.1, emoji: "🥁" },
      { label: "Drum 2", freq: 140, type: "square", dur: 0.09, emoji: "🥁" },
    ];
    const pads = [
      { label: "Beat pad 1", freq: 196, type: "square", dur: 0.12, emoji: "🟪" },
      { label: "Beat pad 2", freq: 247, type: "square", dur: 0.12, emoji: "🟩" },
      { label: "Beat pad 3", freq: 294, type: "square", dur: 0.12, emoji: "🟨" },
      { label: "Beat pad 4", freq: 330, type: "square", dur: 0.12, emoji: "🟥" },
    ];
    let hits = 0;
    function play(note) {
      L.beep(note.freq, note.dur, note.type);
      hits += 1;
      render();
      if (hits === 4) finishRoom("music");
    }
    function bank(items, columns) {
      const wrap = el("div", "dh-choices dh-row-" + columns);
      items.forEach((item) => {
        const button = tap(item.label, "dh-key", () => play(item));
        button.append(emoji(item.emoji));
        wrap.append(button);
      });
      return wrap;
    }
    function render() {
      const room = ROOMS[2];
      const view = el("div", "dh-view");
      const body = el("div", "dh-body");
      const pips = el("div", "dh-pips");
      pips.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 4; i++) pips.append(el("span", "dh-pip" + (i < Math.min(hits, 4) ? " is-on" : "")));
      body.append(pips, bank(keys, 5), bank(bells, 3), bank(drums, 2), bank(pads, 4));
      view.append(roomHead(room), body, backButton());
      mount(room.id, view);
    }
    return { reset() { hits = 0; }, render };
  }

  function makeBathroom() {
    const bottles = [
      { id: "pink", label: "Pink bottle", color: "#ff8ab0", emoji: "🧴" },
      { id: "blue", label: "Blue bottle", color: "#74c0fc", emoji: "🧴" },
      { id: "gold", label: "Gold bottle", color: "#ffd43b", emoji: "🧴" },
    ];
    let poured = {};
    function pour(id) {
      if (poured[id]) { L.beep(300, 0.05, "triangle"); return; }
      poured[id] = true;
      L.beep(480, 0.12, "sine");
      render();
    }
    function mix() {
      const tub = document.querySelector("#dollhouseStage .dh-tub");
      if (tub) {
        tub.classList.add("is-fizzy");
        const bubbles = text("span", "dh-bubbles", "○ ○ ○");
        bubbles.setAttribute("aria-hidden", "true");
        tub.append(bubbles);
      }
      finishRoom("bathroom");
    }
    function render() {
      const room = ROOMS[3];
      const view = el("div", "dh-view");
      const body = el("div", "dh-body");
      const tub = el("div", "dh-tub");
      tub.setAttribute("aria-hidden", "true");
      const colors = bottles.filter((item) => poured[item.id]).map((item) => item.color);
      tub.style.background = colors.length ? "linear-gradient(160deg, " + colors.join(", ") + ")" : "#e7f5ff";
      const row = el("div", "dh-choices dh-row-3");
      bottles.forEach((item) => {
        const button = choice(item.label, "dh-choice", !!poured[item.id], () => pour(item.id));
        const swatch = el("span", "dh-swatch");
        swatch.style.background = item.color;
        swatch.setAttribute("aria-hidden", "true");
        button.append(emoji(item.emoji), swatch);
        row.append(button);
      });
      const mixBtn = tap("Mix a fizzy potion", "dh-mix", mix);
      mixBtn.append(emoji("🫧"), text("span", "dh-word", "Mix a fizzy potion"));
      if (colors.length < 2) mixBtn.hidden = true;
      body.append(tub, row, mixBtn);
      view.append(roomHead(room), body, backButton());
      mount(room.id, view);
    }
    return { reset() { poured = {}; }, render };
  }

  function makeGarden() {
    const flowers = [
      { id: "rose", label: "Water the rose", emoji: "🌹" },
      { id: "tulip", label: "Water the tulip", emoji: "🌷" },
      { id: "daisy", label: "Water the daisy", emoji: "🌼" },
      { id: "sun", label: "Water the sunflower", emoji: "🌻" },
    ];
    const stars = [
      { id: "pink", label: "Tap the pink star", emoji: "🌟" },
      { id: "gold", label: "Tap the gold star", emoji: "⭐" },
      { id: "blue", label: "Tap the blue star", emoji: "✨" },
    ];
    let wet = {};
    let lit = {};
    function maybeDone() {
      if (flowers.every((item) => wet[item.id]) && stars.every((item) => lit[item.id])) finishRoom("garden");
    }
    function water(id) {
      if (wet[id]) { L.beep(400, 0.05, "triangle"); return; }
      wet[id] = true;
      L.beep(620, 0.08, "sine");
      render();
      maybeDone();
    }
    function shine(id) {
      if (lit[id]) { L.beep(880, 0.05, "triangle"); return; }
      lit[id] = true;
      L.beep(880, 0.1, "triangle");
      render();
      maybeDone();
    }
    function render() {
      const room = ROOMS[4];
      const view = el("div", "dh-view");
      const body = el("div", "dh-body");
      const flowerRow = el("div", "dh-choices dh-row-2");
      flowers.forEach((item) => {
        const button = choice(item.label, "dh-choice dh-flower", !!wet[item.id], () => water(item.id));
        button.append(emoji(item.emoji));
        if (wet[item.id]) button.append(emoji("💧"));
        flowerRow.append(button);
      });
      const starRow = el("div", "dh-choices dh-row-3");
      stars.forEach((item) => {
        const button = choice(item.label, "dh-choice", !!lit[item.id], () => shine(item.id));
        button.append(emoji(item.emoji));
        starRow.append(button);
      });
      body.append(flowerRow, starRow);
      view.append(roomHead(room), body, backButton());
      mount(room.id, view);
    }
    return { reset() { wet = {}; lit = {}; }, render };
  }

  function makePlayroom() {
    const items = [
      { id: "left", lane: 0, emoji: "⭐", label: "Star on the left" },
      { id: "mid", lane: 1, emoji: "🍪", label: "Treat in the middle" },
      { id: "right", lane: 2, emoji: "⭐", label: "Star on the right" },
    ];
    const where = ["left", "middle", "right"];
    let lane = 1;
    let got = {};
    function steer(dir) {
      const next = lane + dir;
      if (next < 0 || next > 2) { L.buzzSound(); return; }
      lane = next;
      L.beep(500 + lane * 90, 0.06, "triangle");
      render();
    }
    function collect(item) {
      if (got[item.id]) return;
      if (item.lane !== lane) {
        L.buzzSound();
        L.say("Steer over!");
        return;
      }
      got[item.id] = true;
      render();
      if (items.every((entry) => got[entry.id])) finishRoom("playroom");
      else L.beep(720, 0.08, "triangle");
    }
    function render() {
      const room = ROOMS[5];
      const view = el("div", "dh-view");
      const body = el("div", "dh-body");
      const road = el("div", "dh-road");
      items.forEach((item) => {
        const column = el("div", "dh-lane" + (item.lane === lane ? " is-here" : ""));
        if (item.lane === lane) column.append(emoji("🚙"));
        if (!got[item.id]) {
          const button = tap(item.label, "dh-choice", () => collect(item));
          button.append(emoji(item.emoji));
          column.append(button);
        } else column.append(emoji("✨"));
        road.append(column);
      });
      const live = text("p", "dh-sr", "Carlita is on the " + where[lane]);
      live.setAttribute("role", "status");
      const steerRow = el("div", "dh-choices dh-row-2");
      const left = tap("Steer left", "dh-choice", () => steer(-1));
      const right = tap("Steer right", "dh-choice", () => steer(1));
      left.append(emoji("⬅️"));
      right.append(emoji("➡️"));
      steerRow.append(left, right);
      body.append(road, live, steerRow);
      view.append(roomHead(room), body, backButton());
      mount(room.id, view);
    }
    return { reset() { lane = 1; got = {}; }, render };
  }

  function makeBedroom() {
    const stickers = [
      { id: "heart", label: "Heart sticker", emoji: "💖" },
      { id: "moon", label: "Moon sticker", emoji: "🌙" },
      { id: "star", label: "Star sticker", emoji: "⭐" },
    ];
    const pjs = [
      { id: "bow", label: "Bow pajamas", emoji: "🎀" },
      { id: "star", label: "Star pajamas", emoji: "⭐" },
      { id: "moon", label: "Moon pajamas", emoji: "🌙" },
    ];
    let stuck = {};
    let pj = "";
    function anySticker() { return stickers.some((item) => stuck[item.id]); }
    function toggle(id) {
      stuck[id] = !stuck[id];
      L.beep(600, 0.06, "triangle");
      render();
    }
    function wear(id) {
      pj = id;
      L.beep(540, 0.07, "triangle");
      render();
    }
    function roll() {
      if (!pj) {
        L.buzzSound();
        L.say("Pick pajamas!");
        return;
      }
      if (!anySticker()) {
        L.buzzSound();
        L.say("Add a sticker!");
        return;
      }
      const cat = document.querySelector("#dollhouseStage .dh-pillow-cat");
      if (cat) cat.classList.add("is-rolling");
      finishRoom("bedroom");
    }
    function render() {
      const room = ROOMS[6];
      const view = el("div", "dh-view");
      const body = el("div", "dh-body");
      const pillow = el("div", "dh-pillow");
      pillow.setAttribute("aria-hidden", "true");
      const cat = el("div", "dh-pillow-cat");
      const worn = pjs.find((item) => item.id === pj);
      cat.textContent = "🐱" + (worn ? worn.emoji : "");
      pillow.append(cat);
      stickers.forEach((item) => { if (stuck[item.id]) pillow.append(emoji(item.emoji)); });
      const stickerRow = el("div", "dh-choices dh-row-3");
      stickers.forEach((item) => {
        const button = choice(item.label, "dh-choice", !!stuck[item.id], () => toggle(item.id));
        button.append(emoji(item.emoji));
        stickerRow.append(button);
      });
      const pjRow = el("div", "dh-choices dh-row-3");
      pjs.forEach((item) => {
        const button = choice(item.label, "dh-choice", pj === item.id, () => wear(item.id));
        button.append(emoji(item.emoji));
        pjRow.append(button);
      });
      const rollBtn = tap("That's how I roll!", "dh-roll", roll);
      rollBtn.append(emoji("😸"), text("span", "dh-word", "That's how I roll!"));
      body.append(pillow, stickerRow, pjRow, rollBtn);
      view.append(roomHead(room), body, backButton());
      mount(room.id, view);
    }
    return { reset() { stuck = {}; pj = ""; }, render };
  }

  const painters = {
    kitchen: makeKitchen(),
    craft: makeCraft(),
    music: makeMusic(),
    bathroom: makeBathroom(),
    garden: makeGarden(),
    playroom: makePlayroom(),
    bedroom: makeBedroom(),
  };

  function start() {
    cleanup();
    ears.left = false;
    ears.right = false;
    if (load().seen) openHub({ greet: true });
    else openMail();
  }
  function stop() { cleanup(); }

  L.games.dollhouse = { screen: "dollhouseGame", start, stop };
})();
