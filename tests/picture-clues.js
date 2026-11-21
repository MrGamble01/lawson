// Picture clues are named images. The helper lives in app.js; each match
// game calls it. No browser required.
// Run: node tests/picture-clues.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const start = app.indexOf("function nameClue(");
const end = app.indexOf("\n// Personalize branding", start);
assert.ok(start > 0 && end > start, "nameClue is in app.js");
const ctx = vm.createContext({});
vm.runInContext(app.slice(start, end), ctx);

function clue() {
  const attrs = { "aria-hidden": "true" };
  return {
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return attrs[k]; },
    removeAttribute(k) { delete attrs[k]; },
  };
}

const named = clue();
ctx.nameClue(named, "Red balloon");
assert.equal(named.getAttribute("role"), "img");
assert.equal(named.getAttribute("aria-label"), "Red balloon");
assert.equal(named.getAttribute("aria-hidden"), undefined);
ctx.nameClue(named, "");
assert.equal(named.getAttribute("aria-label"), "Red balloon", "an empty name leaves the clue alone");
ctx.nameClue(null, "Red balloon");

const games = [
  ["games/balloons.js", "balloonsSample"],
  ["games/cupcakes.js", "cupcakesSample"],
  ["games/kites.js", "kitesSample"],
  ["games/blocks.js", "blocksSample"],
  ["games/shadows.js", "shadowsWall"],
  ["games/sky.js", "skyWindow"],
  ["games/mail.js", "mailLetter"],
];
for (const [file, id] of games) {
  const src = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert.match(src, new RegExp('getElementById\\("' + id + '"\\)'), file + " still has its clue");
  assert.match(src, /L\.nameClue\(/, file + " names its picture clue");
  assert.doesNotMatch(src, /setAttribute\(\s*["']role["']\s*,\s*["']img["']\s*\)/, file + " does not set role=img itself");
}

console.log("PASS: picture clues — named images, not hidden from assistive tech");
