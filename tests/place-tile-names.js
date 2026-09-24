// Run: node tests/place-tile-names.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const helper = source.match(/^function stripLeadingEmoji\(s\) \{[\s\S]*?^\}/m);
const setup = source.match(/^\(function setupPlaceAndTileNames\(\) \{[\s\S]*?^\}\)\(\);/m);
assert.ok(helper, 'stripLeadingEmoji helper exists');
assert.ok(setup, 'setupPlaceAndTileNames initializer exists');

function button(className, textContent, children, go) {
  return {
    tagName: 'BUTTON', className, textContent, children,
    attributes: {},
    querySelector(selector) {
      const selectors = selector.split(',').map(part => part.trim());
      function find(nodes) {
        for (const node of nodes) {
          if (selectors.includes(`.${node.className}`) || selectors.includes(`#${node.id}`)) return node;
          const nested = find(node.children || []);
          if (nested) return nested;
        }
        return null;
      }
      return find(this.children);
    },
    matches(selector) {
      assert.equal(selector, '[data-go="stickers"]');
      return go === 'stickers';
    },
    setAttribute(name, value) { this.attributes[name] = String(value); },
  };
}

const pop = button('place', '🎈 Pop! Free · ABC · 123', [{
  className: 'place-text', children: [
    { className: 'place-label', textContent: '  Pop!  ' },
    { className: 'place-count', textContent: 'Free · ABC · 123' },
  ],
}], 'pop');
const doodle = button('tile', '🎨 Doodle', [{ className: 'label', textContent: ' Doodle ' }], 'doodle');
const count = { id: 'stickerTileCount', textContent: '2/10', attributes: { 'aria-label': '2 of 10 stickers' } };
const stickers = button('tile', '🌟 Stickers 2/10', [
  { className: 'label', textContent: 'Stickers' }, count,
], 'stickers');
const fallback = button('tile', '  🎵 Music  ', []);
const emptyLabel = button('place', '🎈 Pop!', [{ className: 'place-label', textContent: '  ' }]);
const empty = button('tile', '  ✨  ', []);
const buttons = [pop, doodle, stickers, fallback, emptyLabel, empty];

vm.runInNewContext(`${helper[0]}\n${setup[0]}`, {
  document: {
    querySelectorAll(selector) {
      assert.equal(selector, 'button.place, button.tile');
      return buttons;
    },
  },
});

assert.equal(pop.attributes['aria-label'], 'Pop!');
assert.doesNotMatch(pop.attributes['aria-label'], /🎈|Free/);
assert.equal(doodle.attributes['aria-label'], 'Doodle');
assert.equal(stickers.attributes['aria-label'], 'Stickers');
assert.equal(stickers.attributes['aria-describedby'], 'stickerTileCount');
assert.equal(stickers.querySelector('#stickerTileCount').attributes['aria-label'], '2 of 10 stickers');
assert.equal(fallback.attributes['aria-label'], 'Music');
assert.equal(emptyLabel.attributes['aria-label'], 'Pop!');
assert.equal(empty.attributes['aria-label'], undefined);
assert.equal(pop.attributes['aria-describedby'], undefined);
assert.equal(doodle.attributes['aria-describedby'], undefined);

console.log('PASS: Places and tiles have clear names with sticker counts preserved as descriptions');
