// Farm drag names reflect the tool in hand without changing tap-to-use state.
// Run: node tests/farm-tools.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../games/farm.js'), 'utf8');

// ---- tiny DOM ----
const ids = {};
function queryAll(root, sel) {
  const out = [];
  const walk = (n) => {
    if (!n || !n.children) return;
    for (const c of n.children) {
      if (sel.startsWith('.') && c._classes.has(sel.slice(1))) out.push(c);
      else if (sel.startsWith('#') && c.id === sel.slice(1)) out.push(c);
      else if (c.tagName && c.tagName.toLowerCase() === sel) out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
}
function el(tag, id, cls) {
  const node = {
    tagName: (tag || 'div').toUpperCase(),
    id: id || '',
    style: { setProperty() {} },
    dataset: {},
    children: [],
    parent: null,
    _classes: new Set(String(cls || '').split(/\s+/).filter(Boolean)),
    textContent: '',
    offsetWidth: 80,
    offsetHeight: 80,
    handlers: [],
    listeners: {},
    attrs: {},
    classList: {
      add(c) { node._classes.add(c); },
      remove(c) { node._classes.delete(c); },
      toggle(c, on) {
        if (on === false || (on === undefined && node._classes.has(c))) node._classes.delete(c);
        else node._classes.add(c);
      },
      contains(c) { return node._classes.has(c); },
    },
    get className() { return [...node._classes].join(' '); },
    set className(v) { node._classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
    setAttribute(n, v) {
      node.attrs[n] = v;
      if (n === 'id') { node.id = v; ids[v] = node; }
    },
    getAttribute(n) { return node.attrs[n]; },
    getBoundingClientRect: () => ({ left: 10, top: 10, width: 80, height: 80, right: 90, bottom: 90 }),
    appendChild(c) { node.children.push(c); c.parent = node; return c; },
    querySelector(sel) { return queryAll(node, sel)[0] || null; },
    querySelectorAll(sel) { return queryAll(node, sel); },
    addEventListener(type, fn) { node.listeners[type] = fn; },
    setPointerCapture() {},
    remove() {
      if (!node.parent) return;
      node.parent.children = node.parent.children.filter((c) => c !== node);
    },
    set innerHTML(html) {
      node.children = [];
      if (!html) return;
      for (const m of html.matchAll(/<(\w+)([^>]*)>/g)) {
        const a = m[2];
        const childId = (a.match(/\bid="([^"]+)"/) || [])[1];
        const childCls = (a.match(/\bclass="([^"]+)"/) || [])[1] || '';
        const child = el(m[1], childId, childCls);
        if (childId) ids[childId] = child;
        const label = a.match(/aria-label="([^"]+)"/);
        if (label) child.setAttribute('aria-label', label[1]);
        if (/aria-hidden="true"/.test(a)) child.setAttribute('aria-hidden', 'true');
        node.appendChild(child);
      }
    },
    get innerHTML() { return ''; },
  };
  if (id) ids[id] = node;
  return node;
}


ids.farmStage = el('div', 'farmStage');
ids.farmBestVal = el('span', 'farmBestVal');
const document = {
  body: el('body'),
  getElementById: (id) => ids[id] || null,
  createElement: (tag) => el(tag),
  querySelectorAll: (sel) => queryAll(ids.farmStage, sel),
};
const L = {
  games: {},
  tapToUse() {},
  onTap(node, fn) { node.handlers.push(fn); },
  getHighScore: () => 0,
  bumpBadge() {},
  say() {},
};
// Background timers stay idle; these checks drive only the pointer listeners.
vm.runInNewContext(source, {
  window: { Lawson: L }, document,
  setTimeout() {}, clearTimeout() {},
  setInterval() {}, clearInterval() {},
});
L.games.farm.start();
const shears = ids.farmShears;
const pointer = { pointerId: 1, preventDefault() {} };
assert.equal(shears.getAttribute('aria-label'), 'Shears');
shears.setAttribute('aria-pressed', 'false');

for (const end of ['pointerup', 'pointercancel']) {
  shears.listeners.pointerdown(pointer);
  assert.equal(shears.getAttribute('aria-label'), 'Shears, held');
  assert.equal(shears.classList.contains('held'), false);
  assert.equal(shears.getAttribute('aria-pressed'), 'false');
  shears.listeners[end](pointer);
  assert.equal(shears.getAttribute('aria-label'), 'Shears', `${end} restores the idle name`);
  assert.equal(shears.classList.contains('held'), false);
  assert.equal(shears.getAttribute('aria-pressed'), 'false');
}

// Simulate a tap-to-use pickup: dragging must not duplicate or clear its state.
shears.classList.add('held');
shears.setAttribute('aria-label', 'Shears, held');
shears.setAttribute('aria-pressed', 'true');
for (const end of ['pointerup', 'pointercancel']) {
  shears.listeners.pointerdown(pointer);
  assert.equal(shears.getAttribute('aria-label'), 'Shears, held');
  assert.equal(shears.classList.contains('held'), true);
  assert.equal(shears.getAttribute('aria-pressed'), 'true');
  shears.listeners[end](pointer);
  assert.equal(shears.getAttribute('aria-label'), 'Shears, held');
  assert.equal(shears.classList.contains('held'), true);
  assert.equal(shears.getAttribute('aria-pressed'), 'true');
}
L.games.farm.stop();
console.log('PASS: farm-tools — drag names reflect held tools and preserve tap-to-use state');
