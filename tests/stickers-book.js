// Sticker book counts name stickers and the empty book announces its status.
// Run: node tests/stickers-book.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function el() {
  return {
    attrs: {}, style: {}, children: [], className: '',
    get innerHTML() { return this.html ?? ''; },
    set innerHTML(value) { this.html = value; this.children = []; },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return this.attrs[name] ?? null; },
    appendChild(child) { this.children.push(child); return child; },
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
assert.equal(ids.stickerProgress.getAttribute('role'), 'progressbar');
assert.equal(ids.stickerProgress.getAttribute('aria-valuemin'), '0');
assert.equal(ids.stickerProgress.getAttribute('aria-valuemax'), '100');
assert.equal(ids.stickerProgress.getAttribute('aria-valuenow'), '0');
assert.equal(ids.stickerProgress.getAttribute('aria-label'), '0 of 3 stickers');
assert.equal(ids.stickerProgress.style.width, '0%');
const empty = ids.stickerGrid.children.find(child => child.className.split(/\s+/).includes('sticker-empty'));
assert.ok(empty, 'zero earned stickers shows the empty banner');
assert.equal(empty.getAttribute('role'), 'status');
assert.equal(empty.getAttribute('aria-label'), "Let's find some stickers! Play any game and Bobo will pop one in for you.");

earned.add('star');
earned.add('balloon');
L.games.stickers.start();
assert.equal(ids.stickerCount.textContent, '2 / 3');
assert.equal(ids.stickerCount.getAttribute('aria-label'), '2 of 3 stickers');
assert.equal(ids.stickerProgress.getAttribute('aria-valuenow'), '67');
assert.equal(ids.stickerProgress.getAttribute('aria-label'), '2 of 3 stickers');
assert.equal(ids.stickerProgress.style.width, '67%');
assert.ok(!ids.stickerGrid.children.some(child => child.className.split(/\s+/).includes('sticker-empty')),
  'some earned stickers shows no empty banner');
console.log('PASS: sticker book — count names stickers and empty status appears only with zero earned');
