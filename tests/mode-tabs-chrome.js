// Run: node tests/mode-tabs-chrome.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const labels = { free: 'Free', letters: 'ABC', numbers: '123' };

for (const id of ['popModes', 'findModes']) {
  const group = html.match(new RegExp(`<div\\b[^>]*\\sid="${id}"[^>]*>([\\s\\S]*?)</div>`));
  assert.ok(group, `Missing mode group #${id}`);

  for (const [mode, label] of Object.entries(labels)) {
    const button = group[1].match(new RegExp(`<button\\b[^>]*\\sdata-mode="${mode}"[^>]*>`));
    assert.ok(button, `Missing ${mode} button in #${id}`);
    assert.match(button[0], new RegExp(`\\saria-label="${label}"`),
      `#${id} ${mode} button must have aria-label="${label}"`);
  }
}

console.log('PASS: Pop and Find mode tabs have clear names');
