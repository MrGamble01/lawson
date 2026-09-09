// Doodle tool pickers expose their selected state, and stamp mode ending
// is spoken. No browser required.
//
// Coloring's swatches already set aria-pressed. Doodle's brushes, sizes
// and Stamp only flipped a CSS class, and the 8-second stamp window
// returned to paint silently — a keyboard / screen-reader pass (and the
// caption) could not tell which tool was on.
//
// Run: node tests/doodle.js              (static scan + playthrough)
//      node tests/doodle.js --self-test  (checks the checker on fixtures)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const DOODLE = process.env.DOODLE_SRC || path.join(__dirname, '../games/doodle.js');

// ---- static scan -------------------------------------------------------
// Reports Doodle source that never marks a picker pressed, or that
// auto-returns from Stamp without saying "Draw!".
function check(src) {
  const problems = [];
  const pressed = src.includes('aria-pressed');
  const marksStamp = /markChoice\s*\(\s*btn\b/.test(src) || /stampBtn[\s\S]{0,80}aria-pressed/.test(src);
  const marksBrush = /doodle-brush[\s\S]{0,400}aria-pressed/.test(src) || /markChoice\s*\(\s*sw\b/.test(src);
  const marksSize = /doodle-size[\s\S]{0,400}aria-pressed/.test(src) || /markChoice\s*\(\s*sw\b/.test(src);
  if (!pressed || !marksBrush || !marksSize || !marksStamp) {
    problems.push('doodle pickers never set aria-pressed (brushes, sizes, Stamp)');
  }
  // The 8 s stamp window must speak Draw! in its own callback — a
  // toggleStamp that only talks on the tap is the leftover.
  const timeout = src.match(/stampTimeout\s*=\s*setTimeout\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*8000\s*\)/);
  if (!timeout) {
    problems.push('stamp window has no 8s timeout');
  } else if (!/L\.say\(\s*["']Draw!["']\s*\)/.test(timeout[1])) {
    problems.push('stamp timeout returns to paint without saying Draw!');
  }
  return problems;
}

function selfTest() {
  const good = [
    'function markChoice(el, on) { el.setAttribute("aria-label", "x"); el.setAttribute("aria-pressed", String(on)); }',
    'sw.className = "doodle-brush"; markChoice(sw, true);',
    'sw.className = "doodle-size"; markChoice(sw, true);',
    'markChoice(btn, stamping);',
    'stampTimeout = setTimeout(() => { mode = "paint"; L.say("Draw!"); }, 8000);',
  ].join('\n');
  assert.deepEqual(check(good), [], 'good doodle is quiet');

  const noPressed = 'stampTimeout = setTimeout(() => { L.say("Draw!"); }, 8000);';
  assert.match(check(noPressed)[0], /aria-pressed/);

  const silent = [
    'el.setAttribute("aria-pressed", "true");',
    'markChoice(sw, true); markChoice(btn, false);',
    'stampTimeout = setTimeout(() => { mode = "paint"; btn.classList.remove("active"); }, 8000);',
  ].join('\n');
  assert.match(check(silent).join('\n'), /without saying Draw/);

  const noWindow = 'el.setAttribute("aria-pressed", "true"); markChoice(sw, true); markChoice(btn, false);';
  assert.match(check(noWindow).join('\n'), /no 8s timeout/);
  console.log('PASS: doodle lint self-test');
}

// ---- virtual clock + DOM stub -----------------------------------------
const clock = { now: 0, timers: new Map(), nextId: 0 };
const flush = () => new Promise(r => setImmediate(r));
function vSetTimeout(fn, ms) {
  const id = ++clock.nextId;
  clock.timers.set(id, { at: clock.now + (ms || 0), fn });
  return id;
}
function vClearTimeout(id) { clock.timers.delete(id); }
async function runUntil(t) {
  for (;;) {
    let next = null;
    for (const [id, tm] of clock.timers) if (tm.at <= t && (!next || tm.at < next.tm.at)) next = { id, tm };
    if (!next) break;
    clock.timers.delete(next.id);
    clock.now = next.tm.at;
    next.tm.fn();
    await flush();
  }
  clock.now = t;
  await flush();
}

function el(tag) {
  const node = {
    tagName: (tag || 'DIV').toUpperCase(),
    id: '',
    className: '',
    style: {},
    children: [],
    attrs: {},
    dataset: {},
    textContent: '',
    disabled: false,
    handlers: [],
    listeners: {},
    _classes: new Set(),
    classList: {
      add: c => node._classes.add(c),
      remove: c => node._classes.delete(c),
      toggle: (c, on) => { if (on === undefined) { node._classes.has(c) ? node._classes.delete(c) : node._classes.add(c); } else if (on) node._classes.add(c); else node._classes.delete(c); },
      contains: c => node._classes.has(c),
    },
    set innerHTML(_) { node.children = []; node.textContent = _; },
    appendChild: c => { node.children.push(c); return c; },
    setAttribute: (k, v) => { node.attrs[k] = String(v); },
    getAttribute: k => (k in node.attrs ? node.attrs[k] : null),
    querySelectorAll: sel => {
      const cls = (sel.startsWith('.') ? sel.slice(1) : sel);
      return node.children.filter(c =>
        c.className === cls || (c.className && c.className.split(/\s+/).includes(cls)) ||
        (sel === 'button' && c.tagName === 'BUTTON')
      );
    },
    addEventListener: (type, fn) => { (node.listeners[type] || (node.listeners[type] = [])).push(fn); },
    removeEventListener: (type, fn) => {
      const list = node.listeners[type];
      if (!list) return;
      node.listeners[type] = list.filter(f => f !== fn);
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 300 }),
    getContext: () => ({
      scale() {}, drawImage() {}, clearRect() {}, getImageData: () => ({}), putImageData() {},
      beginPath() {}, arc() {}, fill() {}, moveTo() {}, lineTo() {}, stroke() {}, save() {}, restore() {},
      fillText() {}, createLinearGradient: () => ({ addColorStop() {} }),
      lineCap: '', lineJoin: '', fillStyle: '', strokeStyle: '', lineWidth: 0, font: '',
      textAlign: '', textBaseline: '', globalCompositeOperation: 'source-over',
    }),
    width: 300,
    height: 300,
  };
  return node;
}

function loadDoodle(src) {
  clock.now = 0;
  clock.timers.clear();
  clock.nextId = 0;
  const spoken = [];
  const canvas = el('canvas');
  canvas.id = 'doodleCanvas';
  const brushes = el('div');
  brushes.id = 'doodleBrushes';
  const sizes = el('div');
  sizes.id = 'doodleSizes';
  const stamp = el('button');
  stamp.id = 'doodleStamp';
  stamp.textContent = 'Stamp';
  const undo = el('button');
  undo.id = 'doodleUndo';
  const save = el('button');
  save.id = 'doodleSave';
  const clear = el('button');
  clear.id = 'doodleClear';
  const ids = {
    doodleCanvas: canvas,
    doodleBrushes: brushes,
    doodleSizes: sizes,
    doodleStamp: stamp,
    doodleUndo: undo,
    doodleSave: save,
    doodleClear: clear,
  };
  const L = {
    games: {},
    say: (text) => { spoken.push(String(text)); },
    onTap: (node, fn) => { if (node) node.handlers.push(fn); },
    onTapOnce: (node, fn) => { if (node && !node.__lawsonTap) { node.__lawsonTap = true; node.handlers.push(fn); } },
    beep() {}, happySound() {},
    earnSticker() {},
  };
  const win = {
    Lawson: L,
    devicePixelRatio: 1,
    addEventListener() {},
    removeEventListener() {},
  };
  vm.runInNewContext(src, {
    window: win, document: {
      getElementById: id => ids[id] || null,
      createElement: tag => el(tag),
    },
    Math, Date: { now: () => clock.now },
    setTimeout: vSetTimeout, clearTimeout: vClearTimeout,
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  });
  return { L, spoken, ids, tap: (node) => node.handlers.forEach(fn => fn({ stopPropagation() {} })) };
}

function pressedOf(row) {
  return row.children.map(c => [c.getAttribute('aria-label') || c.dataset.name, c.getAttribute('aria-pressed'), c.classList.contains('active')]);
}

async function playthrough() {
  const src = fs.readFileSync(DOODLE, 'utf8');
  const { L, spoken, ids, tap } = loadDoodle(src);
  L.games.doodle.start();

  const brushes = pressedOf(ids.doodleBrushes);
  assert.ok(brushes.length >= 3, 'brushes rendered');
  assert.deepEqual(brushes.find(b => b[0] === 'Rainbow'), ['Rainbow', 'true', true], 'Rainbow starts pressed');
  assert.ok(brushes.filter(b => b[1] === 'true').length === 1, 'exactly one brush pressed');
  assert.ok(brushes.every(b => b[1] === 'true' || b[1] === 'false'), 'every brush has aria-pressed');

  const sizes = pressedOf(ids.doodleSizes);
  assert.deepEqual(sizes.find(s => s[0] === 'Medium'), ['Medium', 'true', true], 'Medium starts pressed');
  assert.ok(sizes.filter(s => s[1] === 'true').length === 1, 'exactly one size pressed');

  assert.equal(ids.doodleStamp.getAttribute('aria-pressed'), 'false', 'Stamp starts unpressed');
  assert.equal(ids.doodleBrushes.getAttribute('aria-label'), 'Brush');
  assert.equal(ids.doodleSizes.getAttribute('aria-label'), 'Brush size');

  const blue = ids.doodleBrushes.children.find(c => c.dataset.name === 'Blue' || c.getAttribute('aria-label') === 'Blue');
  tap(blue);
  assert.equal(blue.getAttribute('aria-pressed'), 'true');
  assert.equal(ids.doodleBrushes.children.find(c => c.getAttribute('aria-label') === 'Rainbow').getAttribute('aria-pressed'), 'false');
  assert.equal(spoken.at(-1), 'Blue');

  const small = ids.doodleSizes.children.find(c => c.getAttribute('aria-label') === 'Small');
  tap(small);
  assert.equal(small.getAttribute('aria-pressed'), 'true');
  assert.equal(ids.doodleSizes.children.find(c => c.getAttribute('aria-label') === 'Medium').getAttribute('aria-pressed'), 'false');
  assert.equal(spoken.at(-1), 'Small');

  tap(ids.doodleStamp);
  assert.equal(ids.doodleStamp.getAttribute('aria-pressed'), 'true', 'Stamp tap presses it');
  assert.ok(ids.doodleStamp.classList.contains('active'));
  assert.equal(spoken.at(-1), 'Stamp!');

  await runUntil(7999);
  assert.equal(spoken.at(-1), 'Stamp!', 'stamp window still on before 8s');
  assert.equal(ids.doodleStamp.getAttribute('aria-pressed'), 'true');

  await runUntil(8000);
  assert.equal(spoken.at(-1), 'Draw!', 'stamp timeout says Draw!');
  assert.equal(ids.doodleStamp.getAttribute('aria-pressed'), 'false', 'stamp timeout unpresses');
  assert.ok(!ids.doodleStamp.classList.contains('active'));

  tap(ids.doodleStamp);
  assert.equal(spoken.at(-1), 'Stamp!');
  L.games.doodle.stop();
  const afterStop = spoken.length;
  await runUntil(clock.now + 8000);
  assert.equal(spoken.length, afterStop, 'stop() cancels a pending Draw!');

  console.log('PASS: doodle — pickers expose aria-pressed, stamp timeout says Draw!, stop() cancels');
}

if (require.main === module) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  const src = fs.readFileSync(DOODLE, 'utf8');
  const problems = check(src);
  if (problems.length) {
    console.error('FAIL: doodle lint:\n' + problems.join('\n'));
    process.exit(1);
  }
  playthrough().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
module.exports = { check };
