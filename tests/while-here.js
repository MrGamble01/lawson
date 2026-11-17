// A new-best cheer scheduled in a game must not play after Home.
// Run: node tests/while-here.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const start = source.indexOf("let _here = 0;");
const end = source.indexOf("function leaveActiveGame(");
assert.ok(start >= 0 && end > start, "here-guard is in app.js");
const guard = source.slice(start, end);

const clock = { now: 0, timers: [] };
function vSetTimeout(fn, ms) {
  const id = clock.timers.length + 1;
  clock.timers.push({ id, at: clock.now + ms, fn });
  return id;
}
const ctx = { setTimeout: vSetTimeout };
vm.runInNewContext(guard + "\nthis.whileHere = whileHere; this.leaveHere = leaveHere;", ctx);

let cheers = 0;
ctx.whileHere(() => { cheers += 1; }, 800);
ctx.leaveHere();
clock.now = 800;
clock.timers.forEach((t) => { if (t.at <= clock.now) t.fn(); });
assert.equal(cheers, 0, "leaving drops a celebration that has not played yet");

ctx.whileHere(() => { cheers += 1; }, 800);
clock.now = 1600;
clock.timers.forEach((t) => { if (t.at <= clock.now) t.fn(); });
assert.equal(cheers, 1, "staying in the game still celebrates");

const games = fs.readFileSync(path.join(__dirname, "../games/cupcakes.js"), "utf8");
assert.match(games, /L\.whileHere \|\| setTimeout/, "games schedule the cheer through whileHere");

console.log("PASS: whileHere — leaving drops a pending new-best cheer");
