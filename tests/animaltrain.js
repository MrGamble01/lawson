// Animal Train is on the home screen, precached, and each toot is a
// Play Stats ride. No browser.
// Run: node tests/animaltrain.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const game = fs.readFileSync(path.join(root, "games/animaltrain.js"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

assert.match(html, /data-go="animaltrain"/, "home screen opens Animal Train");
assert.match(html, /class="place-label">Animal Train</, "play stats can title it Animal Train");
assert.match(html, /assets\/art\/card-animal-train\.webp/);
assert.match(html, /id="animalTrainGame"/);
assert.match(html, /src="games\/animaltrain\.js"/);
assert.match(sw, /"\.\/games\/animaltrain\.js"/);
assert.match(sw, /"\.\/assets\/art\/card-animal-train\.webp"/);
assert.match(sw, /"\.\/assets\/art\/stage-animal-train\.webp"/);
assert.match(sw, /const CACHE = "lawson-static"/);
assert.match(game, /L\.games\.animaltrain\s*=/);
assert.match(game, /L\.noteMode/);
assert.match(game, /L\.noteRound/);
assert.match(game, /L\.afterSpeech/);
assert.match(game, /Free Ride/);
assert.match(game, /Color Ride/);
assert.match(css, /stage-animal-train\.webp/);
assert.match(app, /miles\.trainRide/);
assert.match(app, /1 ride/);
for (const name of ["Bear", "Puppy", "Bunny", "Kitty", "Duck", "Frog"]) {
  assert.ok(game.includes('label: "' + name + '"'), "names " + name);
}
for (const line of ["Bear! Roar!", "Puppy! Woof!", "Bunny! Hop!", "Kitty! Meow!", "Duck! Quack!", "Frog! Ribbit!", "Choo-choo!"]) {
  assert.ok(game.includes('"' + line + '"'), "says " + line);
}
assert.equal(game.includes("setTimeout"), false, "rides wait with afterSpeech, not a bare timer");

const source = fs.readFileSync(path.join(root, "lib/playlog.js"), "utf8");
const map = new Map();
const context = vm.createContext({
  clock: Date.parse("2026-11-27T15:00:00"),
  localStorage: {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  },
  Date, Math, JSON, Number, Object, String, Array,
});
vm.runInContext(source, context);
vm.runInContext("LawsonPlay._setNow(() => clock)", context);
const play = context.LawsonPlay;

assert.equal(play.milestones().trainRide, false);
play.noteRound();
play.enter("animaltrain", "Free Ride");
context.clock += 800;
play.leave();
const visit = play.snapshot().ranges.all.games.find((item) => item.id === "animaltrain");
assert.ok(visit, "opening Animal Train is tracked");
assert.equal(visit.rounds || 0, 0, "a visit without a toot is not a ride");
assert.equal(play.milestones().trainRide, false);

play.enter("animaltrain", "Free Ride");
context.clock += 700;
play.noteRound();
play.setMode("Color Ride");
context.clock += 700;
play.noteRound();
play.leave();
const found = play.snapshot().ranges.all.games.find((item) => item.id === "animaltrain");
assert.equal(found.rounds, 2, "each toot counts");
assert.ok(found.modes.some((mode) => mode.id === "Free Ride" && mode.plays >= 1));
assert.ok(found.modes.some((mode) => mode.id === "Color Ride" && mode.plays >= 1));
const today = play.snapshot().ranges.today.games.find((item) => item.id === "animaltrain");
assert.equal(today.rounds, 2, "today keeps the rides");
assert.equal(play.milestones().trainRide, true);
assert.equal(JSON.stringify(play.snapshot()).includes("Lawson"), false);

console.log("PASS: animal train — home entry, precache, and play-stats rides");
