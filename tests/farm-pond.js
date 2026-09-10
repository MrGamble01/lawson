// Farm pond ducks are real buttons. They used to be aria-hidden divs
// given onTap, so makeTappableAccessible skipped them (it will not
// overwrite aria-hidden) and Tab / a screen reader never reached
// "Quack quack!". The sun and clouds already got this treatment; the
// ducks were the leftover that can be named without failing WCAG 2.2
// target-size (the fish sit on the ducks, so they stay pointer-only).
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
    problems.push(`${label}: farm-duck is a <div> — use a <button> like the farm sun`);
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
  `;
  const hidden = check(hiddenPond, "fixture-main.js");
  assert.ok(hidden.some((p) => /farm-duck is aria-hidden/.test(p)), "main-shaped ducks must be reported");
  assert.ok(hidden.some((p) => /farmDucks is aria-hidden/.test(p)), "main-shaped flock aria-hidden must be reported");
  assert.ok(hidden.some((p) => /<div>/.test(p)), "main-shaped duck div must be reported");
  assert.ok(hidden.some((p) => /expected 2/.test(p)), "missing duck buttons must be reported");

  const fixed = `
    stage.innerHTML = \`
      <div class="farm-ducks" id="farmDucks">
        <button type="button" class="farm-duck" aria-label="Duck"></button>
        <button type="button" class="farm-duck" aria-label="Duck"></button>
      </div>\`;
    L.onTap(d, () => L.say("Quack quack!"));
  `;
  assert.deepEqual(check(fixed, "fixture-fixed.js"), [], "fixed pond must pass");

  const unnamedDuck = fixed.replace(
    'class="farm-duck" aria-label="Duck"></button>\n        <button type="button" class="farm-duck" aria-label="Duck"',
    'class="farm-duck"></button>\n        <button type="button" class="farm-duck" aria-label="Duck"'
  );
  assert.ok(check(unnamedDuck, "fixture-unnamed.js").some((p) => /duck 1 is missing aria-label/.test(p)), "an unnamed duck must be reported");

  // Sky leftovers and the pointer-only fish are different gaps.
  const other = `
    <button type="button" id="farmSunMoon" class="farm-sun" aria-hidden="true"></button>
    <div class="farm-cloud farm-cloud--1" aria-hidden="true"></div>
    f.setAttribute("aria-hidden", "true");
    f.setAttribute("tabindex", "-1");
    L.onTap(f, () => L.say("Fish!"));
  `;
  const otherHits = check(other, "fixture-other.js");
  assert.ok(!otherHits.some((p) => /aria-hidden/.test(p)), "unrelated sky / fish aria-hidden must not be reported as a duck");

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
    console.log("PASS: farm-pond — ducks are named buttons");
  } catch (err) {
    console.error(err);
    process.exit(99);
  }
}

module.exports = { check };
