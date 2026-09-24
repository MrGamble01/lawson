// Ice Cream held names during dragging and Eat names through keyboard activation.
// Run: node tests/icecream.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ids = {};
function el() {
  const attrs = {};
  const listeners = {};
  const classes = new Set();
  return {
    style: { setProperty() {} }, dataset: {}, children: [],
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      contains(name) { return classes.has(name); },
    },
    set innerHTML(html) {
      this.children = [];
      // Register the scene nodes and their initial attributes from build().
      for (const match of html.matchAll(/<\w+\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
        const node = ids[match[2]] = el();
        for (const attr of match[1].matchAll(/([\w-]+)="([^"]*)"/g)) {
          node.setAttribute(attr[1], attr[2]);
        }
        node.disabled = /\bdisabled\b/.test(match[1]);
      }
    },
    appendChild(child) { this.children.push(child); },
    setAttribute(key, value) { attrs[key] = String(value); },
    getAttribute(key) { return attrs[key]; },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    fire(type, ev = {}) { (listeners[type] || []).forEach(fn => fn(ev)); },
    remove() {},
    click() { (listeners.click || []).forEach(fn => fn({ detail: 0 })); },
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }),
  };
}
ids.icecreamStage = el();
const L = {
  games: {},
  onTap(node, fn) { node.tap = fn; },
  getHighScore: () => 0,
  bumpBadge() {}, beep() {}, haptic() {}, say() {},
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../games/icecream.js'), 'utf8'), {
  window: { Lawson: L },
  document: { getElementById: id => ids[id], createElement: el, body: el() },
  setTimeout: () => 1, clearTimeout() {},
});
const label = () => ids.icecreamEat.getAttribute('aria-label');
const scoop = flavor => ids.icecreamTubs.children.find(node => node.dataset.flavor === flavor).click();
const topping = name => ids.icecreamToppingsTray.children.find(node => node.getAttribute('aria-label') === name).click();

L.games.icecream.start();
assert.equal(label(), 'Eat: empty cone');
assert.equal(ids.icecreamEat.disabled, true);
const tub = ids.icecreamTubs.children.find(node => node.dataset.flavor === 'vanilla');
const sprinkles = ids.icecreamToppingsTray.children.find(node => node.dataset.topping === 'sprinkles');
for (const [source, name] of [[tub, 'vanilla ice cream'], [sprinkles, 'sprinkles']]) {
  for (const end of ['pointercancel', 'pointerup']) {
    source.fire('pointerdown', { clientX: 0, clientY: 0, pointerId: 1, preventDefault() {} });
    assert.equal(source.classList.contains('grabbed'), true);
    assert.equal(source.getAttribute('aria-label'), name + ', held');
    // Release far outside the cone so neither the tap nor drop path adds anything.
    source.fire(end, { clientX: 1000, clientY: 1000 });
    assert.equal(source.classList.contains('grabbed'), false);
    assert.equal(source.getAttribute('aria-label'), name);
    assert.equal(label(), 'Eat: empty cone');
  }
}
topping('sprinkles');
assert.equal(label(), 'Eat: empty cone', 'toppings need a scoop first');
scoop('vanilla');
assert.equal(label(), 'Eat: vanilla sundae');
assert.equal(ids.icecreamEat.disabled, false);
topping('sprinkles');
assert.equal(label(), 'Eat: vanilla sundae with sprinkles');
topping('sprinkles');
assert.equal(label(), 'Eat: vanilla sundae with sprinkles', 'duplicate names are omitted');
topping('cherry');
assert.equal(label(), 'Eat: vanilla sundae with sprinkles and cherry');
topping('sprinkles');
topping('banana slice');
assert.equal(label(), 'Eat: vanilla sundae with sprinkles, cherry, and banana slice');

L.games.icecream.start();
assert.equal(label(), 'Eat: empty cone');
scoop('vanilla');
scoop('chocolate');
assert.equal(label(), 'Eat: vanilla, chocolate');
topping('sprinkles');
assert.equal(label(), 'Eat: vanilla, chocolate with sprinkles');
topping('chocolate sauce');
assert.equal(label(), 'Eat: vanilla, chocolate with sprinkles and chocolate sauce');
L.games.icecream.stop();
console.log('PASS: icecream — held drag names and Eat names scoops and unique toppings in placement order');
