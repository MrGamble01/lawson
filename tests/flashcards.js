// Run: node tests/flashcards.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
function snippet(pattern, name) {
  const match = source.match(pattern);
  assert.ok(match, `${name} exists`);
  return match[0];
}

const stage = {
  children: [],
  set innerHTML(value) { this.children = []; },
  appendChild(child) { this.children.push(child); },
};
const context = vm.createContext({
  LETTERS: ['A'],
  NUMBERS: [1],
  COLORS: [{ name: 'Red', hex: '#f00' }],
  ANIMALS: [{ name: 'Dog', emoji: '🐶', sound: 'Woof' }],
  SHAPES: [], VEHICLES: [], DINOSAURS: [], WEATHER: [], FOOD: [], FAMILY: [],
  shuffled(items) { return items; },
  onTap() {},
  document: {
    getElementById(id) {
      assert.equal(id, 'stage');
      return stage;
    },
    createElement(tag) {
      assert.equal(tag, 'button');
      return {
        attributes: {},
        style: { setProperty() {} },
        setAttribute(name, value) { this.attributes[name] = String(value); },
      };
    },
  },
});
vm.runInContext([
  snippet(/^const NUMBER_WORD = \{[\s\S]*?^\};/m, 'NUMBER_WORD'),
  snippet(/^const LETTER_WORD = \{[\s\S]*?^\};/m, 'LETTER_WORD'),
  snippet(/^const ACTIVITIES = \{[\s\S]*?^\};/m, 'ACTIVITIES'),
  snippet(/^function flashcardAccessibleName\(cfg, item\) \{[\s\S]*?^\}/m, 'naming helper'),
  snippet(/^function buildFlashcards\(name\) \{[\s\S]*?^\}/m, 'buildFlashcards'),
].join('\n'), context);

const name = context.flashcardAccessibleName;
assert.equal(name({}, context.COLORS[0]), 'Red');
assert.equal(name({}, context.ANIMALS[0]), 'Dog');
assert.equal(name({ caption: item => `${item}, Apple` }, 'A'), 'A, Apple');
assert.equal(name({}, 1), 'one');
assert.equal(name({}, 21), '21');
assert.equal(name({}, 'Hello'), 'Hello');
assert.equal(name({ caption: () => 'Caption' }, context.COLORS[0]), 'Red');
assert.equal(name({ caption: () => 'Caption' }, 1), 'Caption');

for (const [activity, expectedName, contentProperty, content] of [
  ['colors', 'Red', 'textContent', ''],
  ['animals', 'Dog', 'textContent', '🐶'],
  ['letters', 'A, Apple', 'innerHTML', 'A<span class="letter-lower">a</span>'],
  ['numbers', 'one', 'textContent', 1],
]) {
  context.buildFlashcards(activity);
  assert.equal(stage.children.length, 1);
  const card = stage.children[0];
  assert.equal(card.className, 'item');
  assert.equal(card.attributes['aria-label'], expectedName, `${activity} card has a clear name`);
  assert.equal(card[contentProperty], content, `${activity} visible content is unchanged`);
  if (activity === 'colors') assert.equal(card.style.background, '#f00');
}

console.log('PASS: Flashcards have clear accessible names and unchanged visible content');
