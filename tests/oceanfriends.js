// Ocean Friends is on the home screen, precached, and each new friend
// is a Play Stats star. No browser.
// Run: node tests/oceanfriends.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const game = fs.readFileSync(path.join(root, "games/oceanfriends.js"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

assert.match(html, /data-go="oceanfriends"/, "home screen opens Ocean Friends");
assert.match(html, /class="place-label">Ocean Friends</, "play stats can title it Ocean Friends");
assert.match(html, /assets\/art\/card-ocean-friends\.webp/);
assert.match(html, /id="oceanFriendsGame"/);
assert.match(html, /src="games\/oceanfriends\.js"/);
assert.match(sw, /"\.\/games\/oceanfriends\.js"/);
assert.match(sw, /"\.\/assets\/art\/card-ocean-friends\.webp"/);
assert.match(sw, /"\.\/assets\/art\/stage-ocean-friends\.webp"/);
assert.match(sw, /const CACHE = "lawson-static"/);
assert.match(game, /L\.games\.oceanfriends\s*=/);
assert.match(game, /L\.noteMode/);
assert.match(game, /L\.noteRound/);
assert.match(game, /L\.afterSpeech/);
assert.match(game, /L\.sayPrompt/);
assert.match(game, /Free Swim/);
assert.match(game, /Find Friends/);
assert.match(css, /stage-ocean-friends\.webp/);
assert.match(app, /miles\.oceanStar/);
assert.match(app, /1 star/);
for (const name of ["Whale", "Sea Turtle", "Octopus", "Starfish", "Clownfish", "Dolphin"]) {
  assert.ok(game.includes('label: "' + name + '"'), "names " + name);
}
for (const line of ["Yay! Sea Turtle!", "Find the Sea Turtle!", "Hi, Whale!", "Let's swim!", "Yay! Ocean friends!"]) {
  assert.ok(game.includes('"' + line + '"'), "says " + line);
}
assert.equal(game.includes("setTimeout"), false, "swims wait with afterSpeech, not a bare timer");

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

assert.equal(play.milestones().oceanStar, false);
play.noteRound();
play.enter("oceanfriends", "Free Swim");
context.clock += 800;
play.leave();
const visit = play.snapshot().ranges.all.games.find((item) => item.id === "oceanfriends");
assert.ok(visit, "opening Ocean Friends is tracked");
assert.equal(visit.rounds || 0, 0, "a visit without a new friend is not a star");
assert.equal(play.milestones().oceanStar, false);

play.enter("oceanfriends", "Free Swim");
context.clock += 700;
play.noteRound();
play.setMode("Find Friends");
context.clock += 700;
play.noteRound();
play.leave();
const found = play.snapshot().ranges.all.games.find((item) => item.id === "oceanfriends");
assert.equal(found.rounds, 2, "each new friend counts");
assert.ok(found.modes.some((mode) => mode.id === "Free Swim" && mode.plays >= 1));
assert.ok(found.modes.some((mode) => mode.id === "Find Friends" && mode.plays >= 1));
const today = play.snapshot().ranges.today.games.find((item) => item.id === "oceanfriends");
assert.equal(today.rounds, 2, "today keeps the stars");
assert.equal(play.milestones().oceanStar, true);
assert.equal(JSON.stringify(play.snapshot()).includes("Lawson"), false);

console.log("PASS: ocean friends — home entry, precache, and play-stats stars");
