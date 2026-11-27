// ---------- Ocean Friends ----------
// A painted coral reef for a toddler. Free Swim is the start: every
// friend pops a bubble and earns a star, and a repeat tap still says
// hello. Find Friends asks for one friend at a time. A different tap
// is a hello, never a miss. Six stars finish the swim. Each new star
// is one round in Play Stats via L.noteRound. Modes are "Free Swim"
// and "Find Friends" through L.noteMode.
(function () {
  const L = window.Lawson;

  const FRIENDS = [
    { id: "whale", label: "Whale", yay: "Yay! Whale!", hi: "Hi, Whale!", find: "Find the Whale!" },
    { id: "turtle", label: "Sea Turtle", yay: "Yay! Sea Turtle!", hi: "Hi, Sea Turtle!", find: "Find the Sea Turtle!" },
    { id: "octopus", label: "Octopus", yay: "Yay! Octopus!", hi: "Hi, Octopus!", find: "Find the Octopus!" },
    { id: "starfish", label: "Starfish", yay: "Yay! Starfish!", hi: "Hi, Starfish!", find: "Find the Starfish!" },
    { id: "clownfish", label: "Clownfish", yay: "Yay! Clownfish!", hi: "Hi, Clownfish!", find: "Find the Clownfish!" },
    { id: "dolphin", label: "Dolphin", yay: "Yay! Dolphin!", hi: "Hi, Dolphin!", find: "Find the Dolphin!" },
  ];
  const FIND_ORDER = ["turtle", "whale", "dolphin", "octopus", "starfish", "clownfish"];

  let gen = 0;
  let pending = [];
  let phase = "swim";
  let mode = "free";
  let met = [];
  let goalIndex = 0;
  let finishing = false;
  let burstId = "";
  let modesBound = false;

  function motionOff() {
    return typeof L.prefersReducedMotion === "function" && L.prefersReducedMotion();
  }
  function hush() {
    gen += 1;
    while (pending.length) {
      const cancel = pending.pop();
      try { cancel(); } catch (_) {}
    }
  }
  function arm(fn, opts) {
    const here = gen;
    const cancel = L.afterSpeech(() => {
      if (gen === here) fn();
    }, opts);
    pending.push(cancel);
  }
  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }
  function svg(name, attrs) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) Object.keys(attrs).forEach((key) => node.setAttribute(key, attrs[key]));
    return node;
  }
  function byId(id) {
    return FRIENDS.find((friend) => friend.id === id);
  }
  function goalFriend() {
    return byId(FIND_ORDER[goalIndex] || FIND_ORDER[0]);
  }
  function modeName() {
    return mode === "find" ? "Find Friends" : "Free Swim";
  }
  function promptText() {
    if (phase === "again" || met.length >= FRIENDS.length) return "Yay! Ocean friends!";
    if (mode === "find") return goalFriend().find;
    return "Let's swim!";
  }
  function starText() {
    const n = met.length;
    return n === 1 ? "1 star" : n + " stars";
  }
  function announce(text) {
    const live = document.getElementById("oceanFriendsLive");
    if (live) live.textContent = text;
  }
  function bubbles() {
    L.beep(523.25, 0.07, "sine", 0);
    L.beep(659.25, 0.08, "sine", 0.05);
    L.beep(783.99, 0.12, "triangle", 0.1);
  }
  function paintModes() {
    document.querySelectorAll("#oceanFriendsGame .of-mode").forEach((button) => {
      const on = button.dataset.swim === mode;
      button.classList.toggle("active", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function bindModes() {
    if (modesBound) return;
    modesBound = true;
    document.querySelectorAll("#oceanFriendsGame .of-mode").forEach((button) => {
      L.onTap(button, () => chooseMode(button.dataset.swim));
    });
  }
  function face(id) {
    const root = svg("svg", { viewBox: "0 0 80 80" });
    root.setAttribute("aria-hidden", "true");
    const add = (name, attrs) => root.append(svg(name, attrs));
    const ink = "#2c4a5e";
    if (id === "whale") {
      add("path", { d: "M18 40 Q8 28 16 22 Q22 34 24 38 Q10 46 16 58 Q24 48 26 44 Z", fill: "#4dabf7", stroke: ink, "stroke-width": "2", "stroke-linejoin": "round" });
      add("ellipse", { cx: "46", cy: "44", rx: "24", ry: "16", fill: "#4dabf7", stroke: ink, "stroke-width": "2.4" });
      add("ellipse", { cx: "48", cy: "50", rx: "14", ry: "8", fill: "#e7f5ff" });
      add("path", { d: "M36 30 Q34 20 28 16 M40 30 Q42 18 48 14", fill: "none", stroke: "#fff", "stroke-width": "2.4", "stroke-linecap": "round" });
      add("circle", { cx: "60", cy: "40", r: "3.2", fill: ink });
      add("circle", { cx: "61", cy: "39", r: "1.1", fill: "#fff" });
      add("path", { d: "M54 50 Q60 56 68 50", fill: "none", stroke: ink, "stroke-width": "2.2", "stroke-linecap": "round" });
    } else if (id === "turtle") {
      add("ellipse", { cx: "28", cy: "56", rx: "10", ry: "6", fill: "#8ce99a", stroke: ink, "stroke-width": "2" });
      add("ellipse", { cx: "62", cy: "56", rx: "10", ry: "6", fill: "#8ce99a", stroke: ink, "stroke-width": "2" });
      add("ellipse", { cx: "24", cy: "36", rx: "8", ry: "5", fill: "#69db7c", stroke: ink, "stroke-width": "2" });
      add("ellipse", { cx: "58", cy: "34", rx: "8", ry: "5", fill: "#69db7c", stroke: ink, "stroke-width": "2" });
      add("ellipse", { cx: "42", cy: "44", rx: "18", ry: "14", fill: "#2f9e44", stroke: ink, "stroke-width": "2.4" });
      add("path", { d: "M32 40 H52 M42 32 V56 M34 48 H50", fill: "none", stroke: "#8ce99a", "stroke-width": "2", "stroke-linecap": "round" });
      add("circle", { cx: "62", cy: "40", r: "9", fill: "#b2f2bb", stroke: ink, "stroke-width": "2.2" });
      add("circle", { cx: "65", cy: "38", r: "2.2", fill: ink });
      add("path", { d: "M60 44 Q64 48 68 44", fill: "none", stroke: ink, "stroke-width": "1.8", "stroke-linecap": "round" });
    } else if (id === "octopus") {
      add("path", { d: "M22 48 Q16 62 20 70", fill: "none", stroke: "#9c36b5", "stroke-width": "5", "stroke-linecap": "round" });
      add("path", { d: "M32 52 Q28 66 34 72", fill: "none", stroke: "#be4bdb", "stroke-width": "5", "stroke-linecap": "round" });
      add("path", { d: "M42 54 Q44 68 40 74", fill: "none", stroke: "#9c36b5", "stroke-width": "5", "stroke-linecap": "round" });
      add("path", { d: "M52 52 Q56 66 50 72", fill: "none", stroke: "#be4bdb", "stroke-width": "5", "stroke-linecap": "round" });
      add("path", { d: "M60 48 Q68 62 62 70", fill: "none", stroke: "#9c36b5", "stroke-width": "5", "stroke-linecap": "round" });
      add("ellipse", { cx: "42", cy: "36", rx: "22", ry: "18", fill: "#da77f2", stroke: ink, "stroke-width": "2.4" });
      add("circle", { cx: "34", cy: "34", r: "5", fill: "#fff", stroke: ink, "stroke-width": "1.6" });
      add("circle", { cx: "50", cy: "34", r: "5", fill: "#fff", stroke: ink, "stroke-width": "1.6" });
      add("circle", { cx: "35", cy: "35", r: "2.4", fill: ink });
      add("circle", { cx: "51", cy: "35", r: "2.4", fill: ink });
      add("path", { d: "M34 44 Q42 50 50 44", fill: "none", stroke: ink, "stroke-width": "2.2", "stroke-linecap": "round" });
    } else if (id === "starfish") {
      add("polygon", { points: "40,8 48,30 72,30 52,44 60,68 40,54 20,68 28,44 8,30 32,30", fill: "#ffd43b", stroke: ink, "stroke-width": "2.4", "stroke-linejoin": "round" });
      add("circle", { cx: "33", cy: "38", r: "2.6", fill: ink });
      add("circle", { cx: "47", cy: "38", r: "2.6", fill: ink });
      add("path", { d: "M32 48 Q40 54 48 48", fill: "none", stroke: ink, "stroke-width": "2.2", "stroke-linecap": "round" });
    } else if (id === "clownfish") {
      add("polygon", { points: "14,40 28,30 28,50", fill: "#ff922b", stroke: ink, "stroke-width": "2", "stroke-linejoin": "round" });
      add("ellipse", { cx: "46", cy: "40", rx: "22", ry: "14", fill: "#ff922b", stroke: ink, "stroke-width": "2.4" });
      add("rect", { x: "36", y: "28", width: "6", height: "24", rx: "2", fill: "#fff", stroke: ink, "stroke-width": "1.4" });
      add("rect", { x: "50", y: "28", width: "6", height: "24", rx: "2", fill: "#fff", stroke: ink, "stroke-width": "1.4" });
      add("circle", { cx: "62", cy: "36", r: "2.8", fill: ink });
      add("circle", { cx: "63", cy: "35", r: "1", fill: "#fff" });
      add("path", { d: "M56 44 Q62 48 68 44", fill: "none", stroke: ink, "stroke-width": "2", "stroke-linecap": "round" });
    } else {
      add("path", { d: "M16 50 Q18 28 40 26 Q62 24 68 40 Q74 54 58 52 Q48 66 36 52 Q22 64 16 50 Z", fill: "#74c0fc", stroke: ink, "stroke-width": "2.4", "stroke-linejoin": "round" });
      add("path", { d: "M40 28 Q48 16 58 22", fill: "#4dabf7", stroke: ink, "stroke-width": "2", "stroke-linejoin": "round" });
      add("circle", { cx: "58", cy: "40", r: "2.8", fill: ink });
      add("circle", { cx: "59", cy: "39", r: "1", fill: "#fff" });
      add("path", { d: "M52 48 Q58 52 66 46", fill: "none", stroke: ink, "stroke-width": "2", "stroke-linecap": "round" });
    }
    if (id !== "octopus" && id !== "starfish") {
      add("circle", { cx: "28", cy: "48", r: "3", fill: "#ff8fab", opacity: "0.85" });
    }
    return root;
  }
  function buildScene() {
    const sea = el("div", "of-sea");
    sea.setAttribute("aria-hidden", "true");
    const drift = el("div", "of-drift");
    for (let i = 0; i < 5; i++) drift.append(el("i"));
    sea.append(drift);
    if (!motionOff() && (burstId || phase === "again")) {
      const burst = el("div", phase === "again" ? "of-burst of-burst--big" : "of-burst");
      const count = phase === "again" ? 8 : 6;
      for (let i = 0; i < count; i++) burst.append(el("i"));
      sea.append(burst);
    }
    return sea;
  }
  function buildStars() {
    const row = el("div", "of-stars");
    const count = el("span", "of-star-count");
    count.textContent = starText();
    row.append(count);
    for (let i = 0; i < FRIENDS.length; i++) {
      const star = el("span", "of-star" + (i < met.length ? " is-on" : ""));
      star.setAttribute("aria-hidden", "true");
      star.textContent = i < met.length ? "★" : "☆";
      row.append(star);
    }
    return row;
  }
  function buildDock() {
    const dock = el("div", "of-dock-inner");
    dock.append(buildStars());
    const prompt = el("p", "of-prompt");
    prompt.id = "oceanFriendsPrompt";
    prompt.textContent = promptText();
    const row = el("div", "of-friends");
    FRIENDS.forEach((friend) => {
      const known = met.includes(friend.id);
      const button = el("button", "of-friend" + (known ? " is-met" : "") + (burstId === friend.id ? " is-burst" : ""));
      button.type = "button";
      button.dataset.friend = friend.id;
      button.setAttribute("aria-label", friend.label);
      const art = el("span", "of-face");
      art.setAttribute("aria-hidden", "true");
      art.append(face(friend.id));
      const name = el("span", "of-name");
      name.textContent = friend.label;
      button.append(art, name);
      L.onTap(button, () => meet(friend.id));
      row.append(button);
    });
    const again = el("button", "of-again");
    again.type = "button";
    again.setAttribute("aria-label", "Play again");
    const againWord = el("span", "of-again-word");
    againWord.textContent = "Play again";
    again.append(againWord);
    again.hidden = phase !== "again";
    L.onTap(again, playAgain);
    dock.append(prompt, row, again);
    return dock;
  }
  function render() {
    const stage = document.getElementById("oceanFriendsStage");
    const scene = document.getElementById("oceanFriendsScene");
    const dock = document.getElementById("oceanFriendsDock");
    if (!stage || !scene || !dock) return;
    stage.dataset.phase = phase;
    stage.dataset.mode = mode;
    stage.dataset.stars = String(met.length);
    stage.dataset.goal = mode === "find" && phase === "swim" && met.length < FRIENDS.length ? goalFriend().id : "";
    paintModes();
    scene.replaceChildren(buildScene());
    dock.replaceChildren(buildDock());
  }
  function hello(id) {
    const button = document.querySelector("#oceanFriendsDock .of-friend[data-friend='" + id + "']");
    if (!button) return;
    button.classList.remove("is-hello");
    void button.offsetWidth;
    button.classList.add("is-hello");
  }
  function wiggle() {
    const again = document.querySelector("#oceanFriendsDock .of-again");
    if (!again) return;
    again.classList.remove("is-wiggle");
    void again.offsetWidth;
    again.classList.add("is-wiggle");
  }
  function promptFind() {
    if (phase !== "swim" || mode !== "find") return;
    const line = goalFriend().find;
    L.sayPrompt(line);
    announce(line);
  }
  function finishSwim() {
    if (phase !== "swim") return;
    phase = "again";
    finishing = false;
    if (!motionOff() && L.confettiRain) L.confettiRain(18);
    L.happySound();
    L.say("Yay! Ocean friends!");
    announce("Yay! Ocean friends!");
    render();
  }
  function meet(id) {
    if (phase !== "swim" || finishing) {
      wiggle();
      return;
    }
    const friend = byId(id);
    if (!friend) return;
    const wanted = mode === "find" ? goalFriend().id : "";
    const correct = mode !== "find" || id === wanted;
    if (!correct || met.includes(id)) {
      hush();
      hello(id);
      bubbles();
      L.say(friend.hi);
      announce(friend.hi);
      if (mode === "find") arm(() => promptFind(), { minMs: 700 });
      return;
    }
    hush();
    met.push(id);
    burstId = id;
    try { L.noteRound(); } catch (_) {}
    bubbles();
    L.say(friend.yay);
    announce(friend.yay);
    if (mode === "find") goalIndex += 1;
    const done = met.length >= FRIENDS.length;
    if (done) finishing = true;
    render();
    burstId = "";
    if (done) arm(() => finishSwim(), { minMs: 900 });
    else if (mode === "find") arm(() => promptFind(), { minMs: 800 });
  }
  function resetSwim() {
    phase = "swim";
    met = [];
    goalIndex = 0;
    finishing = false;
    burstId = "";
  }
  function speakStart() {
    L.happySound();
    if (mode === "find") {
      const line = goalFriend().find;
      L.sayPrompt(line);
      announce(line);
    } else {
      L.say("Let's swim!");
      announce("Let's swim!");
    }
  }
  function playAgain() {
    if (finishing) return;
    hush();
    resetSwim();
    speakStart();
    render();
  }
  function chooseMode(next) {
    if (next !== "free" && next !== "find") return;
    if (next === mode) return;
    hush();
    mode = next;
    resetSwim();
    L.noteMode(modeName());
    speakStart();
    render();
  }
  function start() {
    hush();
    mode = "free";
    resetSwim();
    bindModes();
    L.noteMode("Free Swim");
    speakStart();
    render();
  }
  function stop() {
    hush();
  }

  L.games.oceanfriends = { screen: "oceanFriendsGame", start, stop };
})();
