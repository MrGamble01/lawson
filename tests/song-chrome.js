// Run: node tests/song-chrome.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const [file, id] of [['index.html', 'pianoSong'], ['games/music.js', 'musicSong']]) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const button = source.match(new RegExp(`<button\\b[^>]*\\sid="${id}"[^>]*>`));
  assert.ok(button, `Missing button #${id}`);
  assert.match(button[0], /\saria-label="Play song"/,
    `#${id} must initially have aria-label="Play song"`);
}

console.log('PASS: Piano and Music Song buttons start named Play song');
