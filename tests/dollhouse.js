// Dollhouse is a first-class game: it is on the home screen, precached,
// and its room names are Play Stats modes. No browser.
// Run: node tests/dollhouse.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const game = fs.readFileSync(path.join(root, "games/dollhouse.js"), "utf8");
const stickers = fs.readFileSync(path.join(root, "lib/achievements.js"), "utf8");

assert.match(html, /data-go="dollhouse"/, "home screen opens the dollhouse");
assert.match(html, /class="place-label">Dollhouse</, "play stats can title it Dollhouse");
assert.match(html, /id="dollhouseGame"/);
assert.match(html, /src="games\/dollhouse\.js"/);
assert.match(sw, /"\.\/games\/dollhouse\.js"/);
assert.match(stickers, /id: "gabbyCat"/);
assert.match(stickers, /Gabby Cat of the Day/);
assert.match(game, /L\.games\.dollhouse\s*=/);
assert.match(game, /L\.noteMode/);
assert.match(game, /earnSticker\("gabbyCat"\)/);
assert.match(game, /function cue/);
assert.match(game, /function glint/);
assert.match(game, /function delight/);
assert.match(game, /function softSay/);
assert.match(game, /is-wiggle/);
assert.match(game, /dh-glint/);
assert.match(game, /played today/);
assert.match(game, /dh-today/);
assert.match(game, /prefersReducedMotion/);
assert.match(game, /motionOff\(\)/);
for (const id of ["kitchen", "craft", "music", "bathroom", "garden", "playroom", "bedroom"]) {
  assert.ok(game.includes(id + ":"), "room cue for " + id);
}

const MODES = [
  "Hello",
  "Dollhouse",
  "Kitchen",
  "Craft Room",
  "Music Room",
  "Bathroom",
  "Fairy Tail Garden",
  "Playroom",
  "Bedroom",
];
for (const mode of MODES) {
  assert.ok(game.includes('"' + mode + '"'), "dollhouse names the " + mode + " mode");
}

const source = fs.readFileSync(path.join(root, "lib/playlog.js"), "utf8");
const map = new Map();
const context = vm.createContext({
  clock: Date.parse("2026-11-26T15:00:00"),
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
play.enter("dollhouse", "");
MODES.forEach((mode, index) => {
  play.setMode(mode);
  context.clock += 800;
  if (index === MODES.length - 1) return;
});
play.leave();
const found = play.snapshot().ranges.all.games.find((item) => item.id === "dollhouse");
assert.ok(found, "dollhouse is a tracked game");
assert.ok(found.plays >= MODES.length, "each room visit counts");
for (const mode of MODES) {
  const row = found.modes.find((item) => item.id === mode);
  assert.ok(row && row.plays >= 1 && row.ms >= 500, mode + " should be its own visit");
}
assert.equal(JSON.stringify(play.snapshot()).includes("Lawson"), false);

console.log("PASS: dollhouse — home entry, sticker, and play-stats room modes");
