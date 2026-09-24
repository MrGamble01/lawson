// Color Mix bowl names through drops, results, and the next round.
// Run: node tests/mix.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function el() {
  const attrs = {};
  const classes = new Set();
  return {
    style: {}, dataset: {}, children: [],
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
    },
    set innerHTML(_) { this.children = []; },
    appendChild(child) { this.children.push(child); },
    setAttribute(key, value) { attrs[key] = String(value); },
    getAttribute(key) { return attrs[key]; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  };
}
const ids = Object.fromEntries([
  'mixBowl', 'mixTarget', 'mixTargetName', 'mixPalette', 'mixBestVal',
].map(id => [id, el()]));
let random = 0;
let pending = null;
const L = {
  games: {},
  onTap(node, fn) { node.tap = fn; },
  afterSpeech(fn) {
    pending = fn;
    return () => { if (pending === fn) pending = null; };
  },
  getHighScore: () => 0,
  cheer: () => 'Yay!',
  bumpBadge() {}, bumpHighScore() {}, beep() {}, say() {}, sayPrompt() {},
  happySound() {}, buzzSound() {},
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../games/mix.js'), 'utf8'), {
  window: { Lawson: L },
  document: { getElementById: id => ids[id], createElement: el },
  Math: Object.assign(Object.create(Math), { random: () => random }),
  setTimeout: () => 1, clearTimeout() {},
});
const bowl = ids.mixBowl;
const label = () => bowl.getAttribute('aria-label');
const tap = name => ids.mixPalette.children.find(drop => drop.dataset.name === name).tap({});
function finishSpeech() {
  assert.equal(typeof pending, 'function');
  const fn = pending;
  pending = null;
  fn();
}
function assertEmptyBowl() {
  assert.equal(bowl.getAttribute('role'), 'status');
  assert.equal(label(), 'Mixing bowl');
}

L.games.mix.start();
assertEmptyBowl();
assert.equal(ids.mixTargetName.textContent, 'Make Orange!');
tap('Red');
assert.equal(label(), 'Bowl: Red');
tap('Yellow');
assert.equal(label(), 'Bowl: Red and Yellow');
finishSpeech();
assert.equal(label(), 'Orange, correct', 'result is named during the cheer pause');

random = 0.2; // Next target is Green; Red and Blue are wrong.
finishSpeech();
assertEmptyBowl();
assert.equal(ids.mixTargetName.textContent, 'Make Green!');
tap('Red');
tap('Blue');
assert.equal(label(), 'Bowl: Red and Blue');
finishSpeech();
assert.match(label(), /wrong/, 'result is named during the try-again pause');

random = 0.4;
finishSpeech();
assertEmptyBowl();
L.games.mix.stop();
console.log('PASS: mix — bowl names drops, correct/wrong results, and resets each round');
