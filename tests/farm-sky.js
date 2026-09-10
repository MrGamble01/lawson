// Farm sky easter eggs are real buttons. The sun and clouds used to
// set aria-hidden then onTap, so makeTappableAccessible skipped them
// (it will not overwrite aria-hidden) and Tab / a screen reader
// never reached "Sunshine!" / "Stars!" / "Cloud!". Garden's sun is
// already a <button>; Farm's sky was the leftover of that pattern.
//
// Run:  node tests/farm-sky.js
//       node tests/farm-sky.js --self-test
// Exit: 0 pass · 1 leftover sky markup · 99 runner crashed.

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const FARM = path.join(__dirname, "../games/farm.js");

function check(src, file) {
  const problems = [];
  const label = file || "farm.js";

  // A sun or cloud that is aria-hidden in the sky markup. onTap will
  // not turn it into a button, so it stays pointer-only.
  if (/class="farm-cloud[^"]*"[^>]*aria-hidden\s*=\s*"true"/.test(src)
      || /aria-hidden\s*=\s*"true"[^>]*class="farm-cloud/.test(src)) {
    problems.push(`${label}: farm-cloud is aria-hidden — onTap will not upgrade it to a button`);
  }
  if (/id="farmSunMoon"[^>]*aria-hidden\s*=\s*"true"/.test(src)
      || /aria-hidden\s*=\s*"true"[^>]*id="farmSunMoon"/.test(src)) {
    problems.push(`${label}: #farmSunMoon is aria-hidden — onTap will not upgrade it to a button`);
  }

  // The sun must be a real <button>, matching Garden.
  if (/<div\s[^>]*id="farmSunMoon"/.test(src)) {
    problems.push(`${label}: #farmSunMoon is a <div> — use a <button> like the garden sun`);
  }
  if (!/<button\b[^>]*\bid="farmSunMoon"/.test(src)) {
    problems.push(`${label}: #farmSunMoon is not a <button>`);
  }

  // Clouds must be named like the spoken line.
  const cloudTags = src.match(/<button\b[^>]*class="farm-cloud[^"]*"[^>]*>/g) || [];
  if (cloudTags.length < 2) {
    problems.push(`${label}: expected 2 <button class="farm-cloud"> tags, found ${cloudTags.length}`);
  }
  cloudTags.forEach((tag, i) => {
    if (!/aria-label="Cloud"/.test(tag)) {
      problems.push(`${label}: farm-cloud ${i + 1} is missing aria-label="Cloud"`);
    }
  });

  // Night / sunset: the spoken line is "Stars!" — the name should follow.
  if (!/setAttribute\("aria-label", dayPhase >= 2 \? "Stars" : "Sun"\)/.test(src)) {
    problems.push(`${label}: #farmSunMoon name should follow day/night (Stars when dayPhase >= 2)`);
  }

  return problems;
}

function selfTest() {
  const hiddenSky = `
    stage.innerHTML = \`
      <div id="farmSky">
        <div id="farmSunMoon" class="farm-sun" aria-hidden="true"></div>
        <div class="farm-cloud farm-cloud--1" aria-hidden="true"></div>
        <div class="farm-cloud farm-cloud--2" aria-hidden="true"></div>
      </div>\`;
    L.onTap(sun, () => L.say(dayPhase >= 2 ? "Stars!" : "Sunshine!"));
    document.querySelectorAll(".farm-cloud").forEach((c) => L.onTap(c, () => L.say("Cloud!")));
  `;
  const hidden = check(hiddenSky, "fixture-main.js");
  assert.ok(hidden.some((p) => /farm-cloud is aria-hidden/.test(p)), "main-shaped clouds must be reported");
  assert.ok(hidden.some((p) => /farmSunMoon is aria-hidden/.test(p)), "main-shaped sun aria-hidden must be reported");
  assert.ok(hidden.some((p) => /<div>/.test(p)), "main-shaped sun div must be reported");
  assert.ok(hidden.some((p) => /not a <button>/.test(p)), "missing sun button must be reported");
  assert.ok(hidden.some((p) => /expected 2/.test(p)), "missing cloud buttons must be reported");
  assert.ok(hidden.some((p) => /Stars/.test(p)), "missing day/night name must be reported");

  const fixed = `
    stage.innerHTML = \`
      <div id="farmSky">
        <button type="button" id="farmSunMoon" class="farm-sun" aria-label="Sun"></button>
        <button type="button" class="farm-cloud farm-cloud--1" aria-label="Cloud"></button>
        <button type="button" class="farm-cloud farm-cloud--2" aria-label="Cloud"></button>
      </div>\`;
    if (sun) sun.setAttribute("aria-label", dayPhase >= 2 ? "Stars" : "Sun");
    L.onTap(sun, () => L.say(dayPhase >= 2 ? "Stars!" : "Sunshine!"));
    document.querySelectorAll(".farm-cloud").forEach((c) => L.onTap(c, () => L.say("Cloud!")));
  `;
  assert.deepEqual(check(fixed, "fixture-fixed.js"), [], "fixed sky must pass");

  // Garden clouds stay pointer-only (aria-hidden + onTap). That is a
  // different leftover and must not trip the Farm cloud/sun rules.
  const garden = `
    <div class="garden-cloud garden-cloud--1" aria-hidden="true"></div>
    L.onTap(c, () => L.say("Cloud!"));
  `;
  const gardenHits = check(garden, "fixture-garden.js");
  assert.ok(!gardenHits.some((p) => /aria-hidden/.test(p)), "unrelated garden-cloud aria-hidden must not be reported as a farm-cloud");

  // A leftover pond fish (aria-hidden + onTap) is a different gap —
  // tests/farm-pond.js covers that — and must not trip the sky rules.
  const fish = `
    f.setAttribute("aria-hidden", "true");
    f.setAttribute("tabindex", "-1");
    L.onTap(f, () => L.say("Fish!"));
  `;
  const fishHits = check(fish, "fixture-fish.js");
  assert.ok(!fishHits.some((p) => /aria-hidden/.test(p)), "unrelated aria-hidden must not be reported as a farm-cloud");

  console.log("PASS: farm-sky self-test");
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
      console.error("FAIL: Farm sky:\n" + problems.map((p) => "  " + p).join("\n"));
      process.exit(1);
    }
    console.log("PASS: farm-sky — sun and clouds are named buttons; sun name follows day/night");
  } catch (err) {
    console.error(err);
    process.exit(99);
  }
}

module.exports = { check };
