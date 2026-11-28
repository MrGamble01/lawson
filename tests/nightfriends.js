// Night Friends is on the home screen, precached, and each new friend
// is a Play Stats light. No browser.
// Run: node tests/nightfriends.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const game = fs.readFileSync(path.join(root, "games/nightfriends.js"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

assert.match(html, /data-go="nightfriends"/, "home screen opens Night Friends");
assert.match(html, /class="place-label">Night Friends</, "play stats can title it Night Friends");
assert.match(html, /assets\/art\/card-night-friends\.webp/);
assert.match(html, /id="nightFriendsGame"/);
assert.match(html, /src="games\/nightfriends\.js"/);
assert.match(sw, /"\.\/games\/nightfriends\.js"/);
assert.match(sw, /"\.\/assets\/art\/card-night-friends\.webp"/);
assert.match(sw, /"\.\/assets\/art\/stage-night-friends\.webp"/);
for (const name of ["owl", "fox", "bunny", "firefly", "hedgehog", "moon"]) {
  assert.match(sw, new RegExp("\\./assets/art/friend-" + name + "\\.webp"));
  assert.ok(game.includes("assets/art/friend-" + name + ".webp"), "paints " + name);
}
assert.match(sw, /const CACHE = "lawson-static"/);
assert.match(game, /L\.games\.nightfriends\s*=/);
assert.match(game, /L\.noteMode/);
assert.match(game, /L\.noteRound/);
assert.match(game, /L\.afterSpeech/);
assert.match(game, /L\.sayPrompt/);
assert.match(game, /Free Glow/);
assert.match(game, /Find a Friend/);
assert.match(css, /stage-night-friends\.webp/);
assert.match(app, /miles\.nightLight/);
assert.match(app, /1 light/);
assert.equal(game.includes("createElementNS"), false, "friends are painted pictures, not SVG faces");
for (const name of ["Owl", "Fox", "Bunny", "Firefly", "Hedgehog", "Moon"]) {
  assert.ok(game.includes('label: "' + name + '"'), "names " + name);
}
for (const line of ["Yay! Owl!", "Find the Owl!", "Hi, Fox!", "Let's glow!", "Yay! Night friends!"]) {
  assert.ok(game.includes('"' + line + '"'), "says " + line);
}
assert.equal(game.includes("setTimeout"), false, "lights wait with afterSpeech, not a bare timer");

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

assert.equal(play.milestones().nightLight, false);
play.noteRound();
play.enter("nightfriends", "Free Glow");
context.clock += 800;
play.leave();
const visit = play.snapshot().ranges.all.games.find((item) => item.id === "nightfriends");
assert.ok(visit, "opening Night Friends is tracked");
assert.ok(visit.plays >= 1, "a visit is a play");
assert.ok(visit.ms >= 500, "the visit keeps its time");
assert.equal(visit.rounds || 0, 0, "a visit without a new friend is not a light");
assert.equal(play.milestones().nightLight, false);

play.enter("nightfriends", "Free Glow");
context.clock += 700;
play.noteRound();
play.setMode("Find a Friend");
context.clock += 700;
play.noteRound();
play.leave();
const found = play.snapshot().ranges.all.games.find((item) => item.id === "nightfriends");
assert.equal(found.rounds, 2, "each new friend counts");
assert.ok(found.plays >= 2, "each mode visit counts as a play");
assert.ok(found.ms >= 1400, "both visits keep their time");
assert.ok(found.modes.some((mode) => mode.id === "Free Glow" && mode.plays >= 1));
assert.ok(found.modes.some((mode) => mode.id === "Find a Friend" && mode.plays >= 1));
const today = play.snapshot().ranges.today.games.find((item) => item.id === "nightfriends");
assert.equal(today.rounds, 2, "today keeps the lights");
assert.equal(play.milestones().nightLight, true);
assert.equal(JSON.stringify(play.snapshot()).includes("Lawson"), false);

console.log("PASS: night friends — home entry, precache, and play-stats lights");
