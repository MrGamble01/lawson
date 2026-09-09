// Match's example picture used to set role="img" before onTap(). That
// skips makeTappableAccessible — it will not overwrite an existing role —
// so the one control that re-hears the prompt was tappable but not a
// keyboard button. The example is now a <button> named like the prompt.
//
// Run: node tests/match.js            (static scan of every game + Match playthrough)
//      node tests/match.js --self-test (checks the role=img-then-onTap checker)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROLE_IMG = /setAttribute\(\s*["']role["']\s*,\s*["']img["']\s*\)/;
const ON_TAP = /L\.onTap\(/;

function check(file, src) {
  const problems = [];
  if (!ROLE_IMG.test(src)) return problems;
  if (ON_TAP.test(src)) {
    problems.push(`${file}: role=img then onTap skips the button upgrade — use a <button> (or let onTap assign role=button)`);
  }
  return problems;
}

function selfTest() {
  assert.equal(check('fixture.js', 'el.setAttribute("role", "img");\nL.onTap(el, fn);').length, 1);
  assert.match(check('fixture.js', 'el.setAttribute("role", "img");\nL.onTap(el, fn);')[0], /role=img then onTap/);
  assert.equal(check('fixture.js', 'const el = document.createElement("button");\nL.onTap(el, fn);').length, 0);
  assert.equal(check('fixture.js', 'el.setAttribute("role", "img");\n// decorative, never tappable').length, 0);
  console.log('PASS: match lint self-test');
}

function playthrough() {
  const source = fs.readFileSync(path.join(__dirname, '../games/match.js'), 'utf8');
  const said = [];
  const nodes = {};
  function el(tag, id) {
    const attrs = {};
    const node = {
      tagName: String(tag).toUpperCase(),
      id: id || '',
      className: '',
      textContent: '',
      innerHTML: '',
      children: [],
      type: '',
      attrs,
      classList: { add() {}, remove() {} },
      setAttribute(k, v) { attrs[k] = String(v); },
      getAttribute(k) { return attrs[k]; },
      appendChild(c) { node.children.push(c); return c; },
    };
    if (id) nodes[id] = node;
    return node;
  }
  const target = el('div', 'matchTarget');
  const choices = el('div', 'matchChoices');
  nodes.matchScoreVal = el('span', 'matchScoreVal');
  nodes.matchBestVal = el('span', 'matchBestVal');
  const created = [];
  const context = vm.createContext({
    window: { Lawson: null },
    document: {
      getElementById: (id) => nodes[id] || null,
      createElement: (tag) => {
        const node = el(tag);
        created.push(node);
        return node;
      },
    },
    setTimeout: () => 1,
    clearTimeout() {},
    console,
  });
  context.window.Lawson = {
    games: {},
    getHighScore: () => 0,
    bumpHighScore() {},
    bumpBadge() {},
    cheer: () => 'Yay!',
    happySound() {},
    buzzSound() {},
    sparkleAt() {},
    pointOf: () => ({ x: 0, y: 0 }),
    earnSticker() {},
    boboCheer() {},
    say: (t) => said.push(t),
    sayPrompt: (t) => said.push(t),
    onTap(node, fn) { node._tap = fn; },
    onTapOnce(node, fn) { node._tap = fn; },
  };
  vm.runInContext(source, context);
  const game = context.window.Lawson.games.match;
  assert.ok(game && game.start, 'Match registered');
  game.start();

  const example = target.children[0];
  assert.ok(example, 'example picture was built');
  assert.equal(example.tagName, 'BUTTON', 'example is a real button, not a role=img div');
  assert.equal(example.type, 'button');
  assert.match(example.getAttribute('aria-label') || '', /^Find the \w/, 'example is named like the prompt');
  assert.ok(!example.getAttribute('role') || example.getAttribute('role') === 'button',
    'example does not keep role=img (that skipped the keyboard upgrade)');
  assert.equal(typeof example._tap, 'function', 'example is tappable');

  const opening = said.slice();
  assert.ok(opening.some((t) => /^Find the /.test(t)), 'opening prompt is spoken');
  said.length = 0;
  example._tap();
  assert.equal(said.length, 1, 'activating the example re-hears one prompt');
  assert.match(said[0], /^Find the /);
  assert.equal(said[0], example.getAttribute('aria-label'), 'spoken line and accessible name match');

  const choiceBtns = choices.children;
  assert.equal(choiceBtns.length, 3, 'three choices');
  choiceBtns.forEach((c) => {
    assert.equal(c.tagName, 'BUTTON');
    assert.ok(c.getAttribute('aria-label'), 'each choice is named');
  });

  console.log('PASS: match — example is a named button that re-hears the prompt');
}

if (require.main === module) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  const dir = process.env.GAMES_DIR || path.join(__dirname, '../games');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  const problems = files.flatMap((file) => check(file, fs.readFileSync(path.join(dir, file), 'utf8')));
  if (problems.length) {
    console.error('FAIL: keyboard upgrade:\n' + problems.join('\n'));
    process.exit(1);
  }
  playthrough();
  console.log(`PASS: match lint — no role=img then onTap, in ${files.length} games`);
}
module.exports = { check };
