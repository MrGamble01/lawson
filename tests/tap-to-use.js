// Held tool names, including a bucket refreshed while milking; no whole app needed.
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
