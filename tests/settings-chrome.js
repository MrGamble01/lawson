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

const checkboxLabels = {
  settingsVoice: 'Voice',
  settingsCaptions: 'Captions',
  settingsSound: 'Sound effects',
  settingsMusic: 'Music on menu',
  settingsDark: 'Dark mode',
  settingsSlow: 'Take it slow',
  settingsMotion: 'Less motion',
};

for (const [id, label] of Object.entries(checkboxLabels)) {
  const input = html.match(new RegExp(`<input\\b[^>]*\\sid="${id}"[^>]*>`));
  assert.ok(input, `Missing checkbox #${id}`);
  assert.match(input[0], /\stype="checkbox"/, `#${id} must be a checkbox`);
  assert.match(input[0], new RegExp(`\\saria-label="${label}"`),
    `#${id} must have aria-label="${label}"`);
}

console.log('PASS: Settings chrome buttons and checkboxes have clear names');
