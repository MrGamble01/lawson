// ---------- Doodle (rainbow finger paint) ----------
// Full-screen canvas. Drag a finger or mouse to draw smooth rainbow lines.
// A "Clear" button wipes the canvas. A "Stamp" button drops random happy
// emoji where you tap next. Open-ended play — no scoring, no time limit.
(function () {
  const L = window.Lawson;

  const STAMPS = ["⭐", "❤️", "🌈", "🌸", "🐶", "🐱", "🐸", "🎈", "🚗", "🍎", "🌟", "🦋"];

  let canvas, ctx;
  let drawing = false;
  let last = null;
  let hue = 0;
  let mode = "paint"; // "paint" | "stamp"
  let stampTimeout = null;
  let unlisten = null;

  function resize() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const prev = document.createElement("canvas");
    prev.width = canvas.width;
    prev.height = canvas.height;
    if (canvas.width && canvas.height) prev.getContext("2d").drawImage(canvas, 0, 0);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.drawImage(prev, 0, 0, rect.width, rect.height);
  }

  function pointIn(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches && e.touches[0] ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function dot(p, r) {
    ctx.fillStyle = `hsl(${hue}, 90%, 55%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function line(a, b) {
    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, `hsl(${hue}, 90%, 55%)`);
    grad.addColorStop(1, `hsl(${(hue + 20) % 360}, 90%, 55%)`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  function stampAt(p) {
    const glyph = STAMPS[Math.floor(Math.random() * STAMPS.length)];
    ctx.save();
    ctx.font = "64px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, p.x, p.y);
    ctx.restore();
    L.beep(500 + Math.random() * 300, 0.1, "triangle");
  }

  function onDown(e) {
    e.preventDefault();
    drawing = true;
    last = pointIn(e);
    if (mode === "stamp") {
      stampAt(last);
      drawing = false;
      return;
    }
    dot(last, 8);
    L.beep(300 + (hue / 360) * 400, 0.06, "sine");
  }

  function onMove(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = pointIn(e);
    line(last, p);
    last = p;
    hue = (hue + 4) % 360;
  }

  function onUp(e) {
    if (!drawing) return;
    drawing = false;
    last = null;
  }

  function clear() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    L.happySound();
    L.say("Clean slate!");
  }

  function toggleStamp(btn) {
    mode = mode === "stamp" ? "paint" : "stamp";
    btn.classList.toggle("active", mode === "stamp");
    L.beep(mode === "stamp" ? 700 : 400, 0.1);
    L.say(mode === "stamp" ? "Stamp!" : "Draw!");
    clearTimeout(stampTimeout);
    if (mode === "stamp") {
      // Auto-return to paint after 8 seconds so he doesn't get stuck.
      stampTimeout = setTimeout(() => {
        mode = "paint";
        btn.classList.remove("active");
      }, 8000);
    }
  }

  function start() {
    canvas = document.getElementById("doodleCanvas");
    resize();
    window.addEventListener("resize", resize);

    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove",  onMove, { passive: false });
    canvas.addEventListener("touchend",   onUp);
    canvas.addEventListener("mousedown",  onDown);
    canvas.addEventListener("mousemove",  onMove);
    canvas.addEventListener("mouseup",    onUp);
    canvas.addEventListener("mouseleave", onUp);

    const clearBtn = document.getElementById("doodleClear");
    const stampBtn = document.getElementById("doodleStamp");
    const cb = () => clear();
    const sb = () => toggleStamp(stampBtn);
    L.onTap(clearBtn, cb);
    L.onTap(stampBtn, sb);

    unlisten = () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove",  onMove);
      canvas.removeEventListener("touchend",   onUp);
      canvas.removeEventListener("mousedown",  onDown);
      canvas.removeEventListener("mousemove",  onMove);
      canvas.removeEventListener("mouseup",    onUp);
      canvas.removeEventListener("mouseleave", onUp);
    };

    mode = "paint";
    stampBtn.classList.remove("active");
    L.say("Draw with your finger!");
  }

  function stop() {
    if (unlisten) unlisten();
    unlisten = null;
    clearTimeout(stampTimeout);
    stampTimeout = null;
    if (ctx && canvas) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
    }
  }

  L.games.doodle = { screen: "doodleGame", start, stop };
})();
