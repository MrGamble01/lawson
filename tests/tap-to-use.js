// Held tool names, including a bucket refreshed while milking, and taps
// that slide off a control. No whole app needed.
// Run: node tests/tap-to-use.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function extract(file, start, end) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing function boundaries in ${file}`);
  return source.slice(from, to);
}

function button(name) {
  const attrs = name === null ? {} : { 'aria-label': name };
  const classes = new Set();
  return {
    getAttribute: key => attrs[key] ?? null,
    setAttribute: (key, value) => { attrs[key] = String(value); },
    classList: {
      add: value => classes.add(value),
      remove: value => classes.delete(value),
      contains: value => classes.has(value),
    },
  };
}

const bucket = button('Milk bucket: empty');
const ctx = vm.createContext({
  haptic() {}, beep() {}, say() {},
  $: id => id === 'farmBucket' ? bucket : null,
  bucketSvg: () => '<svg></svg>',
  bucketMilkLevel: 1,
  COW_MILK_PER_FILL: 3,
});
vm.runInContext('let _heldTool = null; let _heldUse = null;\n' +
  extract('app.js', 'function pickUpTool(', 'function heldTool(') +
  extract('games/farm.js', 'function bucketName(', 'function setupBucket('), ctx);

for (const [initial, held, released] of [
  ['Watering can', 'Watering can, held', 'Watering can'],
  ['Shears, held', 'Shears, held', 'Shears'],
  ['', '', ''],
  [null, null, null],
  ['Carrot, held nearby', 'Carrot, held nearby, held', 'Carrot, held nearby'],
]) {
  const tool = button(initial);
  ctx.pickUpTool(tool);
  assert.equal(tool.getAttribute('aria-label'), held);
  assert.equal(tool.getAttribute('aria-pressed'), 'true');
  assert.ok(tool.classList.contains('held'));
  ctx.putDownTool();
  assert.equal(tool.getAttribute('aria-label'), released);
  assert.equal(tool.getAttribute('aria-pressed'), 'false');
  assert.ok(!tool.classList.contains('held'));
}

ctx.pickUpTool(bucket);
ctx.refreshBucket();
assert.equal(bucket.getAttribute('aria-label'), 'Milk bucket: 1 of 3, held');
ctx.refreshBucket();
assert.equal(bucket.getAttribute('aria-label'), 'Milk bucket: 1 of 3, held');
ctx.putDownTool();
assert.equal(bucket.getAttribute('aria-label'), 'Milk bucket: 1 of 3');
ctx.bucketMilkLevel = 3;
ctx.refreshBucket();
assert.equal(bucket.getAttribute('aria-label'), 'Milk bucket: full');

ctx.pickUpTool(bucket);
bucket.setAttribute('aria-label', 'Updated bucket name');
ctx.putDownTool();
assert.equal(bucket.getAttribute('aria-label'), 'Updated bucket name');
console.log('tap-to-use: held tool names passed');

function control(rect) {
  const listeners = {};
  return {
    tagName: 'BUTTON',
    listeners,
    addEventListener(type, fn) { (listeners[type] || (listeners[type] = [])).push(fn); },
    getBoundingClientRect: () => rect,
  };
}
function fire(el, type, ev) {
  (el.listeners[type] || []).forEach((fn) => fn(ev));
}
function touch(id, x, y) {
  return { identifier: id, clientX: x, clientY: y };
}

let now = 1000;
const tapCtx = vm.createContext({
  Date: { now: () => now },
  setTimeout() { return 0; },
  makeTappableAccessible() {},
});
vm.runInContext(extract('app.js', 'let _dropPointerClickUntil', 'function onTapOnce'), tapCtx);

const box = { left: 10, top: 10, right: 110, bottom: 110 };
const a = control(box);
const b = control({ left: 200, top: 10, right: 300, bottom: 110 });
const hits = { a: 0, b: 0 };
tapCtx.onTap(a, () => { hits.a += 1; });
tapCtx.onTap(b, () => { hits.b += 1; });

fire(b, 'click', { detail: 1 });
assert.equal(hits.b, 1, 'a mouse click with no touch still counts');

const kept = { defaultPrevented: false };
fire(a, 'touchstart', { changedTouches: [touch(1, 40, 40)] });
fire(a, 'touchend', {
  cancelable: true,
  preventDefault() { kept.defaultPrevented = true; },
  changedTouches: [touch(1, 50, 50)],
});
assert.equal(hits.a, 1, 'a lift inside the control counts');
assert.equal(kept.defaultPrevented, true, 'a real tap still swallows the trailing click');
fire(a, 'click', { detail: 1 });
assert.equal(hits.a, 1, 'the click after that lift does not count twice');

fire(a, 'touchstart', { changedTouches: [touch(2, 40, 40)] });
fire(a, 'touchend', {
  cancelable: true,
  preventDefault() { throw new Error('a slide should not cancel the click itself'); },
  changedTouches: [touch(2, 220, 40)],
});
assert.equal(hits.a, 1, 'a finger that slides off does not activate the control');
fire(b, 'click', { detail: 1 });
assert.equal(hits.b, 1, 'the control under the lift does not take the slid tap');
fire(b, 'click', { detail: 0 });
assert.equal(hits.b, 2, 'a keyboard click still lands during that window');
now += 500;
fire(b, 'click', { detail: 1 });
assert.equal(hits.b, 3, 'a later mouse click counts again');

fire(a, 'touchstart', { changedTouches: [touch(3, 40, 40)] });
fire(a, 'touchcancel', {});
fire(a, 'click', { detail: 1 });
assert.equal(hits.a, 1, 'a cancelled touch does not activate on the trailing click');
fire(b, 'click', { detail: 1 });
assert.equal(hits.b, 3, 'a cancelled touch also drops the click on the control underneath');

console.log('tap-to-use: slid-off taps passed');
