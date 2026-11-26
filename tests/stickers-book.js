// Sticker book counts name stickers and the empty book announces its status.
// Run: node tests/stickers-book.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function el() {
  const node = {
    attrs: {}, style: {}, children: [], className: '', html: '', offsetWidth: 12,
    _classes: new Set(),
    get innerHTML() { return this.html ?? ''; },
    set innerHTML(value) { this.html = value; this.children = []; },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return this.attrs[name] ?? null; },
    appendChild(child) { this.children.push(child); return child; },
  };
  node.classList = {
    add: (c) => node._classes.add(c),
    remove: (c) => node._classes.delete(c),
    contains: (c) => node._classes.has(c),
  };
  return node;
}

const ids = { stickerGrid: el(), stickerCount: el(), stickerProgress: el() };
const stickers = [
  { id: 'star', title: 'Star', desc: 'A bright star.', emoji: '⭐' },
  { id: 'rainbow', title: 'Rainbow', desc: 'A colorful rainbow.', emoji: '🌈' },
  { id: 'balloon', title: 'Balloon', desc: 'A floating balloon.', emoji: '🎈' },
  { id: 'gabbyCat', title: 'Gabby Cat of the Day', desc: 'Finish a dollhouse room!', emoji: '🐱' },
];
const earned = new Set();
const taps = [];
const said = [];
const chimes = [];
let reduceMotion = false;
const L = {
  games: {},
  onTap(node, fn) { taps.push({ node, fn }); },
  say(text) { said.push(text); },
  happySound() { chimes.push('happy'); },
  beep() { chimes.push('beep'); },
  prefersReducedMotion: () => reduceMotion,
  listStickers: () => stickers,
  isStickerEarned: id => earned.has(id),
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../games/stickers.js'), 'utf8'), {
  window: { Lawson: L },
  document: { getElementById: id => ids[id], createElement: el },
});

L.games.stickers.start();
assert.equal(ids.stickerCount.textContent, '0 / 4');
assert.equal(ids.stickerCount.getAttribute('aria-label'), '0 of 4 stickers');
assert.equal(ids.stickerProgress.getAttribute('role'), 'progressbar');
assert.equal(ids.stickerProgress.getAttribute('aria-valuemin'), '0');
assert.equal(ids.stickerProgress.getAttribute('aria-valuemax'), '100');
assert.equal(ids.stickerProgress.getAttribute('aria-valuenow'), '0');
assert.equal(ids.stickerProgress.getAttribute('aria-label'), '0 of 4 stickers');
assert.equal(ids.stickerProgress.style.width, '0%');
const empty = ids.stickerGrid.children.find(child => child.className.split(/\s+/).includes('sticker-empty'));
assert.ok(empty, 'zero earned stickers shows the empty banner');
assert.equal(empty.getAttribute('role'), 'status');
assert.equal(empty.getAttribute('aria-label'), "Let's find some stickers! Play any game and Bobo will pop one in for you.");

earned.add('star');
earned.add('balloon');
L.games.stickers.start();
assert.equal(ids.stickerCount.textContent, '2 / 4');
assert.equal(ids.stickerCount.getAttribute('aria-label'), '2 of 4 stickers');
assert.equal(ids.stickerProgress.getAttribute('aria-valuenow'), '50');
assert.equal(ids.stickerProgress.getAttribute('aria-label'), '2 of 4 stickers');
assert.equal(ids.stickerProgress.style.width, '50%');
assert.ok(!ids.stickerGrid.children.some(child => child.className.split(/\s+/).includes('sticker-empty')),
  'some earned stickers shows no empty banner');

earned.add('gabbyCat');
taps.length = 0;
said.length = 0;
chimes.length = 0;
L.games.stickers.start();
said.length = 0;
chimes.length = 0;
const star = taps.find((tap) => (tap.node.getAttribute('aria-label') || '').startsWith('Star.'));
const gabby = taps.find((tap) => (tap.node.getAttribute('aria-label') || '').startsWith('Gabby Cat of the Day.'));
const locked = taps.find((tap) => (tap.node.getAttribute('aria-label') || '').startsWith('Locked'));
assert.ok(star && gabby && locked, 'earned and locked stickers are buttons');
star.fn();
assert.equal(star.node.classList.contains('is-admire'), true, 'an earned sticker pops');
assert.equal(chimes[0], 'happy');
assert.equal(said[0], 'Star! A bright star.');
gabby.fn();
assert.equal(gabby.node.classList.contains('is-admire'), true, 'Gabby Cat pops too');
assert.equal(said[1], 'Gabby Cat of the Day! Finish a dollhouse room!');
locked.fn();
assert.equal(locked.node.classList.contains('is-admire'), false, 'a locked sticker stays still');
assert.equal(chimes[2], 'beep');
assert.equal(said[2], 'Locked! Keep playing to find this one.');

reduceMotion = true;
taps.length = 0;
chimes.length = 0;
L.games.stickers.start();
const stillGabby = taps.find((tap) => (tap.node.getAttribute('aria-label') || '').startsWith('Gabby Cat of the Day.'));
stillGabby.fn();
assert.equal(stillGabby.node.classList.contains('is-admire'), false, 'less motion skips the pop');
assert.equal(chimes.at(-1), 'happy', 'the chime still plays when motion is reduced');
console.log('PASS: sticker book — count names stickers and empty status appears only with zero earned');
