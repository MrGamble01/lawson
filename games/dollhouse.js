// ---------- Lawson's Dollhouse ----------
// Gabby's house, built for a phone in one hand. A short hello (mailbox,
// ears, Pandy) can be skipped and stays skipped on later visits. The hub
// opens seven rooms. Each room is a Play Stats mode via L.noteMode, so
// visits and time show up in the existing play log — there is no second
// stats store. The hub marks a room played today from that log. Each
// room's main tap has its own soft sound. A new choice pops and leaves a
// small sparkle; a repeat or a miss wiggles instead, so nothing feels
// dead. A short word names a new choice, and only when another line is
// not already being cut off by a faster tap. Finishing a room sparkles
// unless motion is reduced. Finishing a room earns the Gabby Cat sticker.
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
  let popLabel = "";
  let popKind = "";
  let tapSaidAt = 0;
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
    popLabel = "";
    popKind = "";
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
    const node = el("span", "dh-emoji");
    node.setAttribute("aria-hidden", "true");
    const picture = window.LawsonDollArt && window.LawsonDollArt.glyph(char);
    if (picture) node.append(picture);
    else node.textContent = char;
    return node;
  }
  function prop(name, picked) {
    const art = window.LawsonDollArt;
    const node = el("div", "dh-prop");
    node.setAttribute("aria-hidden", "true");
    if (art && art[name]) node.append(art[name](picked));
    return node;
  }
  function gem() {
    const node = text("span", "dh-gem", "💎");
    node.setAttribute("aria-hidden", "true");
    return node;
  }
  // beep() stays quiet when sound is muted. Music plays the key the kid
  // tapped; every other room has its own two-note motif.
  function cue(id, note) {
    if (note) L.beep(note.freq, note.dur, note.type);
    const motif = {
      kitchen: [[523.25, 0.07, "sine", 0], [659.25, 0.1, "sine", 0.06]],
      craft: [[349.23, 0.08, "triangle", 0], [440, 0.1, "sine", 0.07]],
      music: null,
      bathroom: [[493.88, 0.14, "sine", 0], [392, 0.16, "sine", 0.1]],
      garden: [[698.46, 0.08, "sine", 0], [880, 0.12, "triangle", 0.07]],
      playroom: [[246.94, 0.08, "triangle", 0], [329.63, 0.1, "sine", 0.06]],
      bedroom: [[329.63, 0.12, "sine", 0], [261.63, 0.16, "sine", 0.1]],
    }[id];
    if (!motif) return;
    motif.forEach((tone) => L.beep(tone[0], tone[1], tone[2], tone[3]));
  }
  function motionOff() {
    return typeof L.prefersReducedMotion === "function" && L.prefersReducedMotion();
  }
  // A little burst, not the full cheer. Skipped when motion is reduced.
  function glint(node) {
    if (motionOff() || !node || typeof node.getBoundingClientRect !== "function") return;
    const rect = node.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    ["✨", "⭐", "💫"].forEach((glyph, i) => {
      const s = document.createElement("div");
      s.className = "sparkle dh-glint";
      s.setAttribute("aria-hidden", "true");
      s.textContent = glyph;
      s.style.left = x + "px";
      s.style.top = y + "px";
      const angle = -Math.PI / 2 + (i - 1) * 0.8;
      const dist = 26 + i * 10;
      s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      s.style.setProperty("--dy", (Math.sin(angle) * dist - 8) + "px");
      s.style.setProperty("--scale", "0.55");
      s.style.setProperty("--rot", ((i - 1) * 24) + "deg");
      document.body.appendChild(s);
      let cancel;
      const timer = setTimeout(() => {
        s.remove();
        const i = pending.indexOf(cancel);
        if (i >= 0) pending.splice(i, 1);
      }, 800);
      cancel = () => { clearTimeout(timer); s.remove(); };
      pending.push(cancel);
    });
  }
  // One short word. A faster tap waits, so two lines never pile up.
  function softSay(line) {
    if (!line) return;
    const now = Date.now();
    if (now - tapSaidAt < 400) return;
    tapSaidAt = now;
    L.say(line);
  }
  // Pop a new choice, wiggle a repeat or a miss. The class is put back
  // on after a room redraws, because redrawing replaces the button.
  function delight(button, opts) {
    opts = opts || {};
    if (!button) return;
    if (!motionOff()) {
      const kind = opts.wiggle ? "is-wiggle" : "is-pop";
      button.classList.remove("is-pop", "is-wiggle");
      void button.offsetWidth;
      button.classList.add(kind);
      popLabel = button.getAttribute("aria-label") || "";
      popKind = kind;
    } else {
      popLabel = "";
      popKind = "";
    }
    if (opts.sparkle) glint(button);
    if (opts.line) softSay(opts.line);
  }
  function playedToday() {
    const found = new Set();
    try {
      const snap = window.LawsonPlay && window.LawsonPlay.snapshot();
      const games = (snap && snap.ranges && snap.ranges.today && snap.ranges.today.games) || [];
      const doll = games.find((item) => item.id === "dollhouse");
      const modes = new Set(((doll && doll.modes) || [])
        .filter((item) => (item.plays || 0) > 0 || (item.ms || 0) > 0)
        .map((item) => item.id));
      ROOMS.forEach((room) => { if (modes.has(room.mode)) found.add(room.id); });
    } catch (_) {}
    return found;
  }
  function tap(label, className, on) {
    const button = el("button", className);
    button.type = "button";
    button.setAttribute("aria-label", label);
    L.onTap(button, () => {
      try { L.haptic(8); } catch (_) {}
      on(button);
    });
    return button;
  }
  function mount(view, node) {
    const host = document.getElementById("dollhouseStage");
    if (!host) return;
    if (host.dataset.view !== view) delete host.dataset.done;
    host.dataset.view = view;
    host.classList.remove("is-celebrate");
    if (typeof L.prefersReducedMotion !== "function" || !L.prefersReducedMotion()) {
      node.classList.add("dh-arrive");
    }
    host.replaceChildren(node);
    if (popLabel && popKind && !motionOff()) {
      node.querySelectorAll("button").forEach((btn) => {
        if (btn.getAttribute("aria-label") === popLabel) btn.classList.add(popKind);
      });
    }
    popLabel = "";
    popKind = "";
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
    const still = motionOff();
    if (host) {
      host.dataset.done = id;
      host.classList.remove("is-celebrate");
      host.querySelectorAll(".dh-yay").forEach((node) => node.remove());
      const yay = text("p", "dh-yay", still ? "✓" : "⭐");
      yay.setAttribute("aria-hidden", "true");
      host.append(yay);
      if (!still) {
        void host.offsetWidth;
        host.classList.add("is-celebrate");
        yay.classList.add("is-pop");
        const rect = host.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height * 0.35;
        L.sparkleAt(cx, cy);
        L.sparkleAt(cx - 36, cy + 14);
        L.sparkleAt(cx + 40, cy + 8);
      }
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
    const button = tap("Back to Dollhouse", "dh-back", (btn) => {
      delight(btn, {});
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

  function skipIntro(button) {
    delight(button, { sparkle: true });
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
    const box = tap("Open the Meow-Meow mailbox", "dh-hero", (btn) => {
      if (box.dataset.open === "yes") {
        L.beep(520, 0.05, "triangle");
        delight(btn, { wiggle: true });
        return;
      }
      box.dataset.open = "yes";
      delight(btn, { sparkle: true });
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
    if (ears[side]) {
      L.beep(side === "left" ? 500 : 620, 0.05, "triangle");
      delight(button, { wiggle: true });
      return;
    }
    ears[side] = true;
    button.classList.add("is-on");
    button.setAttribute("aria-pressed", "true");
    L.beep(side === "left" ? 700 : 880, 0.08, "triangle");
    delight(button, { sparkle: true });
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
    const hug = tap("Pandy's hug attack", "dh-hero", (btn) => {
      if (hug.dataset.hug === "yes") {
        L.beep(520, 0.05, "triangle");
        delight(btn, { wiggle: true });
        return;
      }
      hug.dataset.hug = "yes";
      delight(btn, { sparkle: true });
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
    const roof = el("div", "dh-roof");
    roof.setAttribute("aria-hidden", "true");
    if (window.LawsonDollArt) roof.append(window.LawsonDollArt.roof());
    const blooms = el("div", "dh-bloom");
    blooms.setAttribute("aria-hidden", "true");
    if (window.LawsonDollArt) blooms.append(window.LawsonDollArt.blooms());
    const doors = el("div", "dh-doors");
    const done = doneSet();
    const today = playedToday();
    ROOMS.forEach((room) => {
      const finished = done.has(room.id);
      const seen = today.has(room.id);
      const bits = [room.mode];
      if (finished) bits.push("all done");
      if (seen) bits.push("played today");
      const door = tap(bits.join(", "), "dh-door" + (finished ? " is-done" : ""), (btn) => {
        delight(btn, { sparkle: true });
        openRoom(room.id);
      });
      door.dataset.room = room.id;
      if (seen) door.dataset.today = "yes";
      const scene = window.LawsonDollArt && window.LawsonDollArt.doorScene && window.LawsonDollArt.doorScene(room.id);
      if (scene) {
        const icon = el("span", "dh-emoji");
        icon.append(scene);
        door.append(icon, text("span", "dh-door-name", room.short));
      } else {
        door.append(emoji(room.emoji), text("span", "dh-door-name", room.short));
      }
      if (finished) door.append(emoji("⭐"));
      if (seen) {
        const mark = text("span", "dh-today", "✓");
        mark.setAttribute("aria-hidden", "true");
        door.append(mark);
      }
      doors.append(door);
    });
    const extra = el("div", "dh-hub-extra");
    const progress = load();
    const cat = tap("CatRat's treasure", "dh-catrat" + (progress.catrat ? " is-found" : ""), (btn) => {
      if (cat.dataset.found === "yes") {
        L.beep(660, 0.05, "triangle");
        delight(btn, { wiggle: true });
        return;
      }
      delight(btn, { sparkle: true });
      L.happySound();
      L.say("CatRat brought a treasure!");
      cat.dataset.found = "yes";
      cat.classList.add("is-found");
      if (!cat.querySelector(".dh-gem")) cat.append(gem());
      const data = load();
      data.catrat = true;
      save(data);
    });
    cat.dataset.dh = "catrat";
    cat.append(emoji("🐭"), text("span", "dh-word", "CatRat"));
    if (progress.catrat) {
      cat.dataset.found = "yes";
      cat.append(gem());
    }
    const hello = tap("Play the Hello again", "dh-replay", (btn) => {
      delight(btn, { sparkle: true });
      L.beep(660, 0.06, "triangle");
      openMail();
    });
    hello.append(emoji("📬"), text("span", "dh-word", "Hello"));
    extra.append(cat, hello);
    const path = el("div", "dh-path");
    path.setAttribute("aria-hidden", "true");
    view.append(blooms, roof, doors, path, extra);
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
    function choose(field, id, button) {
      const fresh = picked[field] !== id;
      picked[field] = id;
      const pools = { base: bases, frost: frosts, top: tops };
      const item = pools[field].find((entry) => entry.id === id);
      cue("kitchen");
      delight(button, fresh ? { sparkle: true, line: item.label } : { wiggle: true });
      render();
    }
    function party(button) {
      const cake = document.querySelector("#dollhouseStage .dh-cake");
      if (cake) cake.classList.add("is-party");
      delight(button, { sparkle: true });
      if (!celebrated) finishRoom("kitchen");
      else L.beep(760, 0.08, "triangle");
    }
    function row(items, field) {
      const wrap = el("div", "dh-choices dh-row-3");
      items.forEach((item) => {
        const button = choice(item.label, "dh-choice", picked[field] === item.id, (btn) => choose(field, item.id, btn));
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
      cake.append(prop("cake", picked));
      if (picked.base || picked.frost || picked.top) cake.classList.add("is-wiggle");
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
    function add(tool, button) {
      stack.push(tool);
      const finishing = ready();
      if (finishing) {
        delight(button, { sparkle: true });
        render();
        finishRoom("craft");
      } else {
        cue("craft");
        delight(button, { sparkle: true, line: tool.label });
        render();
      }
    }
    function undo(button) {
      if (!stack.length) {
        L.buzzSound();
        delight(button, { wiggle: true });
        return;
      }
      stack.pop();
      L.beep(400, 0.06, "triangle");
      delight(button, {});
      render();
    }
    function render() {
      const room = ROOMS[1];
      const view = el("div", "dh-view");
      const body = el("div", "dh-body");
      const paper = el("div", "dh-paper");
      paper.append(prop("craftPal"));
      paper.dataset.marks = String(stack.length);
      if (stack.length) paper.classList.add("is-wiggle");
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
        const button = tap(tool.label, "dh-choice", (btn) => add(tool, btn));
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
    function play(note, button) {
      cue("music", note);
      hits += 1;
      const finishing = hits === 4;
      delight(button, { sparkle: !finishing });
      render();
      if (finishing) finishRoom("music");
    }
    function bank(items, columns) {
      const wrap = el("div", "dh-choices dh-row-" + columns);
      items.forEach((item) => {
        const button = tap(item.label, "dh-key", (btn) => play(item, btn));
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
      const stage = el("div", "dh-stage");
      stage.append(prop("dj"));
      body.append(stage, pips, bank(keys, 5), bank(bells, 3), bank(drums, 2), bank(pads, 4));
      view.append(roomHead(room), body, backButton());
      mount(room.id, view);
    }
    return { reset() { hits = 0; }, render };
  }

  function makeBathroom() {
    const bottles = [
      { id: "pink", label: "Pink bottle", say: "Pink", color: "#ff8ab0", emoji: "🧴" },
      { id: "blue", label: "Blue bottle", say: "Blue", color: "#74c0fc", emoji: "🧴" },
      { id: "gold", label: "Gold bottle", say: "Gold", color: "#ffd43b", emoji: "🧴" },
    ];
    let poured = {};
    function pour(id, button) {
      const item = bottles.find((entry) => entry.id === id);
      if (poured[id]) {
        L.beep(300, 0.05, "triangle");
        delight(button, { wiggle: true });
        return;
      }
      poured[id] = true;
      cue("bathroom");
      delight(button, { sparkle: true, line: item.say });
      render();
    }
    function mix(button) {
      const tub = document.querySelector("#dollhouseStage .dh-tub");
      if (tub) {
        tub.classList.add("is-fizzy");
        const bubbles = el("span", "dh-bubbles");
        bubbles.setAttribute("aria-hidden", "true");
        bubbles.append(emoji("🫧"));
        tub.append(bubbles);
      }
      delight(button, { sparkle: true });
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
      if (colors.length) tub.classList.add("is-wiggle");
      tub.append(prop("tubFriend"));
      const row = el("div", "dh-choices dh-row-3");
      bottles.forEach((item) => {
        const button = choice(item.label, "dh-choice", !!poured[item.id], (btn) => pour(item.id, btn));
        const swatch = el("span", "dh-swatch");
        swatch.style.background = item.color;
        swatch.setAttribute("aria-hidden", "true");
        const icon = el("span", "dh-emoji");
        if (window.LawsonDollArt && window.LawsonDollArt.bottle) icon.append(window.LawsonDollArt.bottle(item.color));
        else icon.append(emoji(item.emoji));
        button.append(icon, swatch);
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
      { id: "rose", label: "Water the rose", say: "Rose", emoji: "🌹" },
      { id: "tulip", label: "Water the tulip", say: "Tulip", emoji: "🌷" },
      { id: "daisy", label: "Water the daisy", say: "Daisy", emoji: "🌼" },
      { id: "sun", label: "Water the sunflower", say: "Sunflower", emoji: "🌻" },
    ];
    const stars = [
      { id: "pink", label: "Tap the pink star", say: "Pink star", emoji: "🌟" },
      { id: "gold", label: "Tap the gold star", say: "Gold star", emoji: "⭐" },
      { id: "blue", label: "Tap the blue star", say: "Blue star", emoji: "✨" },
    ];
    let wet = {};
    let lit = {};
    function gardenReady() {
      return flowers.every((item) => wet[item.id]) && stars.every((item) => lit[item.id]);
    }
    function bloom(list, picked, id, button) {
      const item = list.find((entry) => entry.id === id);
      if (picked[id]) {
        L.beep(400, 0.05, "triangle");
        delight(button, { wiggle: true });
        return;
      }
      picked[id] = true;
      const finishing = gardenReady();
      if (finishing) {
        delight(button, { sparkle: true });
        render();
        finishRoom("garden");
      } else {
        cue("garden");
        delight(button, { sparkle: true, line: item.say });
        render();
      }
    }
    function render() {
      const room = ROOMS[4];
      const view = el("div", "dh-view");
      const body = el("div", "dh-body");
      const flowerRow = el("div", "dh-choices dh-row-2");
      flowers.forEach((item) => {
        const button = choice(item.label, "dh-choice dh-flower", !!wet[item.id], (btn) => bloom(flowers, wet, item.id, btn));
        button.append(emoji(item.emoji));
        if (wet[item.id]) button.append(emoji("💧"));
        flowerRow.append(button);
      });
      const starRow = el("div", "dh-choices dh-row-3");
      stars.forEach((item) => {
        const button = choice(item.label, "dh-choice", !!lit[item.id], (btn) => bloom(stars, lit, item.id, btn));
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
    let moved = false;
    function steer(dir, button) {
      const next = lane + dir;
      if (next < 0 || next > 2) {
        L.buzzSound();
        delight(button, { wiggle: true });
        return;
      }
      lane = next;
      moved = true;
      cue("playroom");
      delight(button, {});
      render();
    }
    function collect(item, button) {
      if (got[item.id]) return;
      if (item.lane !== lane) {
        L.buzzSound();
        delight(button, { wiggle: true });
        L.say("Steer over!");
        return;
      }
      got[item.id] = true;
      const finishing = items.every((entry) => got[entry.id]);
      if (finishing) {
        delight(button, { sparkle: true });
        render();
        finishRoom("playroom");
      } else {
        cue("playroom");
        delight(button, { sparkle: true, line: "Got it!" });
        render();
      }
    }
    function render() {
      const room = ROOMS[5];
      const view = el("div", "dh-view");
      const body = el("div", "dh-body");
      const road = el("div", "dh-road");
      items.forEach((item) => {
        const here = item.lane === lane;
        const column = el("div", "dh-lane" + (here ? " is-here" : ""));
        if (here && moved) column.classList.add("is-wiggle");
        if (here) column.append(emoji("🚙"));
        if (!got[item.id]) {
          const button = tap(item.label, "dh-choice", (btn) => collect(item, btn));
          button.append(emoji(item.emoji));
          column.append(button);
        } else column.append(emoji("✨"));
        road.append(column);
      });
      const live = text("p", "dh-sr", "Carlita is on the " + where[lane]);
      live.setAttribute("role", "status");
      const steerRow = el("div", "dh-choices dh-row-2");
      const left = tap("Steer left", "dh-choice", (btn) => steer(-1, btn));
      const right = tap("Steer right", "dh-choice", (btn) => steer(1, btn));
      left.append(emoji("⬅️"));
      right.append(emoji("➡️"));
      steerRow.append(left, right);
      body.append(road, live, steerRow);
      view.append(roomHead(room), body, backButton());
      mount(room.id, view);
    }
    return { reset() { lane = 1; got = {}; moved = false; }, render };
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
    function toggle(id, button) {
      const on = !stuck[id];
      stuck[id] = on;
      const item = stickers.find((entry) => entry.id === id);
      cue("bedroom");
      delight(button, on ? { sparkle: true, line: item.label } : { wiggle: true });
      render();
    }
    function wear(id, button) {
      const fresh = pj !== id;
      pj = id;
      const item = pjs.find((entry) => entry.id === id);
      cue("bedroom");
      delight(button, fresh ? { sparkle: true, line: item.label } : { wiggle: true });
      render();
    }
    function roll(button) {
      if (!pj) {
        L.buzzSound();
        delight(button, { wiggle: true });
        L.say("Pick pajamas!");
        return;
      }
      if (!anySticker()) {
        L.buzzSound();
        delight(button, { wiggle: true });
        L.say("Add a sticker!");
        return;
      }
      const cat = document.querySelector("#dollhouseStage .dh-pillow-cat");
      if (cat) {
        cat.classList.remove("is-wiggle");
        cat.classList.add("is-rolling");
      }
      delight(button, { sparkle: true });
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
      if (window.LawsonDollArt) {
        const pic = window.LawsonDollArt.pillowCat(worn ? worn.id : "");
        pic.setAttribute("preserveAspectRatio", "xMidYMid slice");
        cat.append(pic);
      }
      if (worn || anySticker()) cat.classList.add("is-wiggle");
      pillow.append(cat);
      stickers.forEach((item) => { if (stuck[item.id]) pillow.append(emoji(item.emoji)); });
      const stickerRow = el("div", "dh-choices dh-row-3");
      stickers.forEach((item) => {
        const button = choice(item.label, "dh-choice", !!stuck[item.id], (btn) => toggle(item.id, btn));
        button.append(emoji(item.emoji));
        stickerRow.append(button);
      });
      const pjRow = el("div", "dh-choices dh-row-3");
      pjs.forEach((item) => {
        const button = choice(item.label, "dh-choice", pj === item.id, (btn) => wear(item.id, btn));
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
