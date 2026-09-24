// Run: node tests/settings-chrome.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const labels = {
  settingsTips: 'Show tips again',
  settingsReset: 'Reset scores',
  settingsClose: 'Done',
};

for (const [id, label] of Object.entries(labels)) {
  const button = html.match(new RegExp(`<button\\b[^>]*\\sid="${id}"[^>]*>`));
  assert.ok(button, `Missing button #${id}`);
  assert.match(button[0], new RegExp(`\\saria-label="${label}"`),
    `#${id} must have aria-label="${label}"`);
}

console.log('PASS: Settings chrome buttons have clear names');
