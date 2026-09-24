// Sticker announcements wait their turn. lib/achievements.js is loaded with
// a tiny DOM stub and spies for the audio helpers; no browser required.
// Run: node tests/stickers.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../lib/achievements.js'), 'utf8');

const calls = [];                       // ordered log of audio calls
const scheduled = [];                   // afterSpeech callbacks, run by the test
function el() {
  const attributes = new Map();
  const node = { children: [], _classes: new Set(), innerHTML: '', textContent: '', offsetWidth: 1,
    classList: { add: c => node._classes.add(c), remove: c => node._classes.delete(c), contains: c => node._classes.has(c) },
    appendChild: c => { node.children.push(c); return c; }, remove() {},
    setAttribute: (name, value) => attributes.set(name, String(value)),
    getAttribute: name => attributes.get(name) ?? null, querySelector: () => null };
  return node;
}
const stored = new Map();
const stickerTileCount = el();
stickerTileCount.textContent = '0/0';
const context = vm.createContext({
  document: { getElementById: id => id === 'stickerTileCount' ? stickerTileCount : null, createElement: () => el(), body: el(), readyState: 'complete', addEventListener() {} },
  localStorage: { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v), removeItem: k => stored.delete(k) },
  setTimeout: (fn) => { calls.push('timer'); return 1; }, clearTimeout() {},
  say: (text) => { calls.push('say:' + text); },
  afterSpeech: (fn, opts) => { calls.push(`afterSpeech beat=${opts.beatMs} min=${opts.minMs}`); scheduled.push(fn); return () => {}; },
  stickerJingle: () => calls.push('jingle'),
  confettiRain: () => calls.push('confetti'),
  console,
});
vm.runInContext(source, context);
const run = s => vm.runInContext(s, context);
const total = run('STICKERS.length');
assert.equal(stickerTileCount.textContent, `0/${total}`);
assert.equal(stickerTileCount.getAttribute('aria-label'), `0 of ${total} stickers`);

// First award: jingle now, announcement handed to afterSpeech (not spoken yet).
assert.equal(run('earnSticker("storyteller")'), true);
assert.equal(stickerTileCount.textContent, `1/${total}`);
assert.equal(stickerTileCount.getAttribute('aria-label'), `1 of ${total} stickers`);
assert.ok(calls.includes('jingle'), 'jingle played');
assert.ok(!calls.some(c => c.startsWith('say:')), 'announcement not spoken in the same tick');
assert.ok(calls.indexOf('jingle') < calls.findIndex(c => c.startsWith('afterSpeech')), 'jingle before the scheduled announcement');
assert.equal(scheduled.length, 1);
const beat = calls.find(c => c.startsWith('afterSpeech'));
assert.equal(beat, 'afterSpeech beat=150 min=0', 'a short beat, no floor: right after the cheer ends');
scheduled[0]();
assert.equal(calls.filter(c => c.startsWith('say:')).length, 1);
assert.match(calls.find(c => c.startsWith('say:')), /^say:Sticker! .+!$/);
// Already earned: nothing plays, nothing is scheduled.
const before = calls.length;
assert.equal(run('earnSticker("storyteller")'), false);
assert.equal(calls.length, before, 'no second announcement');
assert.equal(scheduled.length, 1);
// Unknown sticker id is ignored.
assert.equal(run('earnSticker("nope")'), false);
// Without afterSpeech available the announcement still happens, directly.
run('afterSpeech = undefined');
calls.length = 0;
assert.equal(run('earnSticker("listen10")'), true);
assert.equal(stickerTileCount.textContent, `2/${total}`);
assert.equal(stickerTileCount.getAttribute('aria-label'), `2 of ${total} stickers`);
assert.ok(calls.some(c => c.startsWith('say:Sticker!')), 'direct announcement when the helper is missing');
console.log('PASS: stickers — jingle first, announcement waits for the cheer, once per sticker, direct fallback');
