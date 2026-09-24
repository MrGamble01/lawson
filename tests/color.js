// Coloring's chrome buttons have clear action names. Run: node tests/color.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function el() {
  return {
    attrs: {}, style: {}, dataset: {},
    classList: { add() {} },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return this.attrs[name] ?? null; },
    appendChild() {},
    querySelectorAll: () => [],
  };
}

const ids = {
  colorStage: el(), colorPalette: el(), colorNext: el(), colorClear: el(),
};
const L = { games: {}, onTap() {}, onTapOnce() {}, say() {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../games/color.js'), 'utf8'), {
  window: { Lawson: L },
  document: { getElementById: id => ids[id], createElement: el },
});

L.games.color.start();
assert.equal(ids.colorNext.getAttribute('aria-label'), 'Next page');
assert.equal(ids.colorClear.getAttribute('aria-label'), 'Clear coloring');
console.log('PASS: coloring — Next and Clear have clear action names');
