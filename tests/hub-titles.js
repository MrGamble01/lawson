// Run: node tests/hub-titles.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const helper = source.match(/^function stripLeadingEmoji\(s\) \{[\s\S]*?^\}/m);
const setup = source.match(/^\(function setupHubTitles\(\) \{[\s\S]*?^\}\)\(\);/m);
assert.ok(helper, 'stripLeadingEmoji helper exists');
assert.ok(setup, 'setupHubTitles initializer exists');

const titles = ['  ✨ More to Explore  ', '🧠 Brain Games', '   ', '✨'].map(textContent => ({
  tagName: 'BUTTON',
  className: 'hub-title',
  textContent,
  attributes: {},
  style: {},
  classList: { add() {}, remove() {} },
  setAttribute(name, value) { this.attributes[name] = String(value); },
}));
const taps = new Map();
const spoken = [];
vm.runInNewContext(`${helper[0]}\n${setup[0]}`, {
  document: {
    querySelectorAll(selector) {
      assert.equal(selector, '.hub-title');
      return titles;
    },
  },
  onTap(title, callback) { taps.set(title, callback); },
  say(text) { spoken.push(text); },
  haptic() {},
});

for (const title of titles) {
  assert.ok(taps.has(title), 'each title has a tap handler');
  taps.get(title)();
}
assert.equal(titles[0].attributes['aria-label'], 'More to Explore');
assert.equal(titles[1].attributes['aria-label'], 'Brain Games');
assert.equal(titles[2].attributes['aria-label'], undefined);
assert.equal(titles[3].attributes['aria-label'], undefined);
assert.deepEqual(spoken, titles.map(title => title.textContent.trim()),
  'Bobo still speaks the full trimmed title, including emoji');

console.log('PASS: Hub titles are named, focusable buttons with unchanged speech');
