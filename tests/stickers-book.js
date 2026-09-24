// Sticker book counts name stickers while keeping the visible fraction.
// Run: node tests/stickers-book.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function el() {
  return {
    attrs: {}, style: {},
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return this.attrs[name] ?? null; },
    appendChild() {},
  };
}

const ids = { stickerGrid: el(), stickerCount: el(), stickerProgress: el() };
const stickers = [
  { id: 'star', title: 'Star', desc: 'A bright star.', emoji: '⭐' },
  { id: 'rainbow', title: 'Rainbow', desc: 'A colorful rainbow.', emoji: '🌈' },
  { id: 'balloon', title: 'Balloon', desc: 'A floating balloon.', emoji: '🎈' },
];
const earned = new Set();
const L = {
  games: {}, onTap() {}, say() {},
  listStickers: () => stickers,
  isStickerEarned: id => earned.has(id),
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../games/stickers.js'), 'utf8'), {
  window: { Lawson: L },
  document: { getElementById: id => ids[id], createElement: el },
});

L.games.stickers.start();
assert.equal(ids.stickerCount.textContent, '0 / 3');
assert.equal(ids.stickerCount.getAttribute('aria-label'), '0 of 3 stickers');

earned.add('star');
earned.add('balloon');
L.games.stickers.start();
assert.equal(ids.stickerCount.textContent, '2 / 3');
assert.equal(ids.stickerCount.getAttribute('aria-label'), '2 of 3 stickers');
console.log('PASS: sticker book — count names stickers with zero and some earned');
