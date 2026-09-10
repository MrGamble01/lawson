// Farm pond poke-toys are real buttons. The ducks used to be
// aria-hidden divs given onTap, and each fish used to set
// aria-hidden then onTap, so makeTappableAccessible skipped them
// (it will not overwrite aria-hidden) and Tab / a screen reader
// never reached "Quack quack!" / "Fish!". The sun and clouds
// already got this treatment; the pond was the leftover.
//
// Run:  node tests/farm-pond.js
//       node tests/farm-pond.js --self-test
// Exit: 0 pass · 1 leftover pond markup · 99 runner crashed.

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const FARM = path.join(__dirname, "../games/farm.js");

function check(src, file) {
  const problems = [];
  const label = file || "farm.js";

  // A duck that is aria-hidden in the pond markup. onTap will not
  // turn it into a button, so it stays pointer-only. The class is
  // matched as "farm-duck" (not "farm-ducks", the flock wrapper).
  if (/class="farm-duck"[^>]*aria-hidden\s*=\s*"true"/.test(src)
      || /aria-hidden\s*=\s*"true"[^>]*class="farm-duck"/.test(src)) {
    problems.push(`${label}: farm-duck is aria-hidden — onTap will not upgrade it to a button`);
  }
  // A hidden flock hides any child duck buttons from the Tab order.
  if (/id="farmDucks"[^>]*aria-hidden\s*=\s*"true"/.test(src)
      || /aria-hidden\s*=\s*"true"[^>]*id="farmDucks"/.test(src)) {
    problems.push(`${label}: #farmDucks is aria-hidden — duck buttons inside stay off the Tab order`);
  }

  // Ducks must be real <button>s named like the spoken line.
  if (/<div\s[^>]*class="farm-duck"/.test(src)) {
    problems.push(`${label}: farm-duck is a <div> — use a <button> like the pond fish`);
  }
  const duckTags = src.match(/<button\b[^>]*class="farm-duck"[^>]*>/g) || [];
  if (duckTags.length < 2) {
    problems.push(`${label}: expected 2 <button class="farm-duck"> tags, found ${duckTags.length}`);
  }
  duckTags.forEach((tag, i) => {
    if (!/aria-label="Duck"/.test(tag)) {
      problems.push(`${label}: farm-duck ${i + 1} is missing aria-label="Duck"`);
    }
  });

  // Fish used to hide themselves after createElement("button").
  if (/farm-fish[\s\S]{0,240}setAttribute\("aria-hidden",\s*"true"\)/.test(src)
      || /setAttribute\("aria-hidden",\s*"true"\)[\s\S]{0,240}farm-fish/.test(src)) {
    problems.push(`${label}: farm-fish sets aria-hidden — onTap will not expose it to Tab / a screen reader`);
  }
  if (!/setAttribute\("aria-label",\s*"Fish"\)/.test(src)) {
    problems.push(`${label}: farm-fish is missing aria-label="Fish"`);
  }
  if (!/createElement\("button"\)[\s\S]{0,80}className = "farm-fish"/.test(src)
      && !/className = "farm-fish"[\s\S]{0,80}createElement\("button"\)/.test(src)) {
    // spawnFish builds a button then names it; keep that shape.
    if (!/className = "farm-fish"/.test(src)) {
      problems.push(`${label}: farm-fish element is missing`);
    }
  }

  return problems;
}

function selfTest() {
  const hiddenPond = `
    stage.innerHTML = \`
      <div class="farm-ducks" id="farmDucks" aria-hidden="true">
        <div class="farm-duck" aria-hidden="true"></div>
        <div class="farm-duck" aria-hidden="true"></div>
      </div>\`;
    L.onTap(d, () => L.say("Quack quack!"));
    const f = document.createElement("button");
    f.className = "farm-fish";
    f.setAttribute("aria-hidden", "true");
    f.setAttribute("tabindex", "-1");
    L.onTap(f, () => L.say("Fish!"));
  `;
  const hidden = check(hiddenPond, "fixture-main.js");
  assert.ok(hidden.some((p) => /farm-duck is aria-hidden/.test(p)), "main-shaped ducks must be reported");
  assert.ok(hidden.some((p) => /farmDucks is aria-hidden/.test(p)), "main-shaped flock aria-hidden must be reported");
  assert.ok(hidden.some((p) => /<div>/.test(p)), "main-shaped duck div must be reported");
  assert.ok(hidden.some((p) => /expected 2/.test(p)), "missing duck buttons must be reported");
  assert.ok(hidden.some((p) => /farm-fish sets aria-hidden/.test(p)), "main-shaped fish aria-hidden must be reported");
  assert.ok(hidden.some((p) => /missing aria-label="Fish"/.test(p)), "unnamed fish must be reported");

  const fixed = `
    stage.innerHTML = \`
      <div class="farm-ducks" id="farmDucks">
        <button type="button" class="farm-duck" aria-label="Duck"></button>
        <button type="button" class="farm-duck" aria-label="Duck"></button>
      </div>\`;
    L.onTap(d, () => L.say("Quack quack!"));
    const f = document.createElement("button");
    f.className = "farm-fish";
    f.setAttribute("aria-label", "Fish");
    L.onTap(f, () => L.say("Fish!"));
  `;
  assert.deepEqual(check(fixed, "fixture-fixed.js"), [], "fixed pond must pass");

  const unnamedDuck = fixed.replace(
    'class="farm-duck" aria-label="Duck"></button>\n        <button type="button" class="farm-duck" aria-label="Duck"',
    'class="farm-duck"></button>\n        <button type="button" class="farm-duck" aria-label="Duck"'
  );
  assert.ok(check(unnamedDuck, "fixture-unnamed.js").some((p) => /duck 1 is missing aria-label/.test(p)), "an unnamed duck must be reported");

  // Sky leftovers are a different gap and must not trip the pond rules.
  const sky = `
    <button type="button" id="farmSunMoon" class="farm-sun" aria-hidden="true"></button>
    <div class="farm-cloud farm-cloud--1" aria-hidden="true"></div>
    L.onTap(c, () => L.say("Cloud!"));
  `;
  const skyHits = check(sky, "fixture-sky.js");
  assert.ok(!skyHits.some((p) => /aria-hidden/.test(p)), "unrelated sky aria-hidden must not be reported as a pond poke-toy");

  console.log("PASS: farm-pond self-test");
}

if (require.main === module) {
  try {
    if (process.argv.includes("--self-test")) {
      selfTest();
      process.exit(0);
    }
    const src = fs.readFileSync(FARM, "utf8");
    const problems = check(src, "games/farm.js");
    if (problems.length) {
      console.error("FAIL: Farm pond:\n" + problems.map((p) => "  " + p).join("\n"));
      process.exit(1);
    }
    console.log("PASS: farm-pond — ducks and fish are named buttons");
  } catch (err) {
    console.error(err);
    process.exit(99);
  }
}

module.exports = { check };
