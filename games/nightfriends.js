// ---------- Night Friends ----------
// A painted moonlit meadow for a toddler. Free Glow is the start: every
// friend lights a lantern, and a repeat tap still says hello. Find a
// Friend asks for one friend at a time. A different tap is a hello,
// never a miss. Six lights finish the night. Each new light is one
// round in Play Stats via L.noteRound. Modes are "Free Glow" and
// "Find a Friend" through L.noteMode.
(function () {
  const L = window.Lawson;

  const FRIENDS = [
    { id: "owl", label: "Owl", art: "assets/art/friend-owl.webp", yay: "Yay! Owl!", hi: "Hi, Owl!", find: "Find the Owl!" },
    { id: "fox", label: "Fox", art: "assets/art/friend-fox.webp", yay: "Yay! Fox!", hi: "Hi, Fox!", find: "Find the Fox!" },
    { id: "bunny", label: "Bunny", art: "assets/art/friend-bunny.webp", yay: "Yay! Bunny!", hi: "Hi, Bunny!", find: "Find the Bunny!" },
    { id: "firefly", label: "Firefly", art: "assets/art/friend-firefly.webp", yay: "Yay! Firefly!", hi: "Hi, Firefly!", find: "Find the Firefly!" },
    { id: "hedgehog", label: "Hedgehog", art: "assets/art/friend-hedgehog.webp", yay: "Yay! Hedgehog!", hi: "Hi, Hedgehog!", find: "Find the Hedgehog!" },
    { id: "moon", label: "Moon", art: "assets/art/friend-moon.webp", yay: "Yay! Moon!", hi: "Hi, Moon!", find: "Find the Moon!" },
  ];
  const FIND_ORDER = ["owl", "fox", "bunny", "firefly", "hedgehog", "moon"];

  let gen = 0;
  let pending = [];
  let phase = "glow";
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
  function byId(id) {
    return FRIENDS.find((friend) => friend.id === id);
  }
  function goalFriend() {
    return byId(FIND_ORDER[goalIndex] || FIND_ORDER[0]);
  }
  function modeName() {
    return mode === "find" ? "Find a Friend" : "Free Glow";
  }
  function promptText() {
    if (phase === "again" || met.length >= FRIENDS.length) return "Yay! Night friends!";
    if (mode === "find") return goalFriend().find;
    return "Let's glow!";
  }
  function lightText() {
    const n = met.length;
    return n === 1 ? "1 light" : n + " lights";
  }
  function announce(text) {
    const live = document.getElementById("nightFriendsLive");
    if (live) live.textContent = text;
  }
  function chime() {
    L.beep(392, 0.07, "sine", 0);
    L.beep(523.25, 0.08, "sine", 0.05);
    L.beep(659.25, 0.12, "triangle", 0.1);
  }
  function paintModes() {
    document.querySelectorAll("#nightFriendsGame .nf-mode").forEach((button) => {
      const on = button.dataset.glow === mode;
      button.classList.toggle("active", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function bindModes() {
    if (modesBound) return;
    modesBound = true;
    document.querySelectorAll("#nightFriendsGame .nf-mode").forEach((button) => {
      L.onTap(button, () => chooseMode(button.dataset.glow));
    });
  }
  function portrait(id) {
    const img = el("img", "nf-face");
    const friend = byId(id);
    img.src = friend ? friend.art : "";
    img.alt = "";
    img.width = 512;
    img.height = 512;
    img.decoding = "async";
    return img;
  }
  function buildScene() {
    const sky = el("div", "nf-sky");
    sky.setAttribute("aria-hidden", "true");
    const drift = el("div", "nf-drift");
    for (let i = 0; i < 5; i++) drift.append(el("i"));
    sky.append(drift);
    if (!motionOff() && (burstId || phase === "again")) {
      const burst = el("div", phase === "again" ? "nf-burst nf-burst--big" : "nf-burst");
      const count = phase === "again" ? 8 : 6;
      for (let i = 0; i < count; i++) burst.append(el("i"));
      sky.append(burst);
    }
    return sky;
  }
  function buildLights() {
    const row = el("div", "nf-lights");
    const count = el("span", "nf-light-count");
    count.textContent = lightText();
    row.append(count);
    for (let i = 0; i < FRIENDS.length; i++) {
      const light = el("span", "nf-light" + (i < met.length ? " is-on" : ""));
      light.setAttribute("aria-hidden", "true");
      row.append(light);
    }
    return row;
  }
  function buildDock() {
    const dock = el("div", "nf-dock-inner");
    dock.append(buildLights());
    const prompt = el("p", "nf-prompt");
    prompt.id = "nightFriendsPrompt";
    prompt.textContent = promptText();
    const row = el("div", "nf-friends");
    FRIENDS.forEach((friend) => {
      const known = met.includes(friend.id);
      const button = el("button", "nf-friend" + (known ? " is-met" : "") + (burstId === friend.id ? " is-burst" : ""));
      button.type = "button";
      button.dataset.friend = friend.id;
      button.setAttribute("aria-label", friend.label);
      const art = el("span", "nf-art");
      art.setAttribute("aria-hidden", "true");
      art.append(portrait(friend.id));
      const name = el("span", "nf-name");
      name.textContent = friend.label;
      button.append(art, name);
      L.onTap(button, () => meet(friend.id));
      row.append(button);
    });
    const again = el("button", "nf-again");
    again.type = "button";
    again.setAttribute("aria-label", "Play again");
    const againWord = el("span", "nf-again-word");
    againWord.textContent = "Play again";
    again.append(againWord);
    again.hidden = phase !== "again";
    L.onTap(again, playAgain);
    dock.append(prompt, row, again);
    return dock;
  }
  function render() {
    const stage = document.getElementById("nightFriendsStage");
    const scene = document.getElementById("nightFriendsScene");
    const dock = document.getElementById("nightFriendsDock");
    if (!stage || !scene || !dock) return;
    stage.dataset.phase = phase;
    stage.dataset.mode = mode;
    stage.dataset.lights = String(met.length);
    stage.dataset.goal = mode === "find" && phase === "glow" && met.length < FRIENDS.length ? goalFriend().id : "";
    paintModes();
    scene.replaceChildren(buildScene());
    dock.replaceChildren(buildDock());
  }
  function hello(id) {
    const button = document.querySelector("#nightFriendsDock .nf-friend[data-friend='" + id + "']");
    if (!button) return;
    button.classList.remove("is-hello");
    void button.offsetWidth;
    button.classList.add("is-hello");
  }
  function wiggle() {
    const again = document.querySelector("#nightFriendsDock .nf-again");
    if (!again) return;
    again.classList.remove("is-wiggle");
    void again.offsetWidth;
    again.classList.add("is-wiggle");
  }
  function promptFind() {
    if (phase !== "glow" || mode !== "find") return;
    const line = goalFriend().find;
    L.sayPrompt(line);
    announce(line);
  }
  function finishGlow() {
    if (phase !== "glow") return;
    phase = "again";
    finishing = false;
    if (!motionOff() && L.confettiRain) L.confettiRain(18);
    L.happySound();
    L.say("Yay! Night friends!");
    announce("Yay! Night friends!");
    render();
  }
  function meet(id) {
    if (phase !== "glow" || finishing) {
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
      chime();
      L.say(friend.hi);
      announce(friend.hi);
      if (mode === "find") arm(() => promptFind(), { minMs: 700 });
      return;
    }
    hush();
    met.push(id);
    burstId = id;
    try { L.noteRound(); } catch (_) {}
    chime();
    L.say(friend.yay);
    announce(friend.yay);
    if (mode === "find") goalIndex += 1;
    const done = met.length >= FRIENDS.length;
    if (done) finishing = true;
    render();
    burstId = "";
    if (done) arm(() => finishGlow(), { minMs: 900 });
    else if (mode === "find") arm(() => promptFind(), { minMs: 800 });
  }
  function resetGlow() {
    phase = "glow";
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
      L.say("Let's glow!");
      announce("Let's glow!");
    }
  }
  function playAgain() {
    if (finishing) return;
    hush();
    resetGlow();
    speakStart();
    render();
  }
  function chooseMode(next) {
    if (next !== "free" && next !== "find") return;
    if (next === mode) return;
    hush();
    mode = next;
    resetGlow();
    L.noteMode(modeName());
    speakStart();
    render();
  }
  function start() {
    hush();
    mode = "free";
    resetGlow();
    bindModes();
    L.noteMode("Free Glow");
    speakStart();
    render();
  }
  function stop() {
    hush();
  }

  L.games.nightfriends = { screen: "nightFriendsGame", start, stop };
})();
