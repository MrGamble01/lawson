// Train sky easter eggs are real buttons. Clouds used to set
// aria-hidden then onTap, so makeTappableAccessible skipped them
// (it will not overwrite aria-hidden) and Tab / a screen reader
// never reached "Cloud!". The sun was a labelled <div> that the
// upgrade promoted, but Garden's sun is already a <button>.
//
// Run:  node tests/train-sky.js
//       node tests/train-sky.js --self-test
// Exit: 0 pass · 1 leftover sky markup · 99 runner crashed.

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const TRAIN = path.join(__dirname, "../games/train.js");

function check(src, file) {
  const problems = [];
  const label = file || "train.js";

  // A cloud that is aria-hidden in the sky markup. onTap will not
  // turn it into a button, so it stays pointer-only.
  if (/class="train-cloud[^"]*"[^>]*aria-hidden\s*=\s*"true"/.test(src)
      || /aria-hidden\s*=\s*"true"[^>]*class="train-cloud/.test(src)) {
    problems.push(`${label}: train-cloud is aria-hidden — onTap will not upgrade it to a button`);
  }

  // The sun must be a real <button>, matching Garden.
  if (/<div\s[^>]*id="trainSun"/.test(src)) {
    problems.push(`${label}: #trainSun is a <div> — use a <button> like the garden sun`);
  }
  if (!/<button\b[^>]*\bid="trainSun"/.test(src)) {
    problems.push(`${label}: #trainSun is not a <button>`);
  }

  // Clouds must be named like the spoken line.
  const cloudTags = src.match(/<button\b[^>]*class="train-cloud[^"]*"[^>]*>/g) || [];
  if (cloudTags.length < 3) {
    problems.push(`${label}: expected 3 <button class="train-cloud"> tags, found ${cloudTags.length}`);
  }
  cloudTags.forEach((tag, i) => {
    if (!/aria-label="Cloud"/.test(tag)) {
      problems.push(`${label}: train-cloud ${i + 1} is missing aria-label="Cloud"`);
    }
  });

  // Night: the spoken line is "Moon!" — the name should follow.
  if (!/setAttribute\("aria-label", dayPhase >= 2 \? "Moon" : "Sun"\)/.test(src)) {
    problems.push(`${label}: #trainSun name should follow day/night (Moon when dayPhase >= 2)`);
  }

  return problems;
}

function selfTest() {
  const hiddenClouds = `
    stage.innerHTML = \`
      <div id="trainSky">
        <div id="trainSun" class="train-sun" aria-label="Sun"></div>
        <div class="train-cloud train-cloud--1" aria-hidden="true"></div>
        <div class="train-cloud train-cloud--2" aria-hidden="true"></div>
        <div class="train-cloud train-cloud--3" aria-hidden="true"></div>
      </div>\`;
    L.onTap(sun, () => L.say("Sunshine!"));
    document.querySelectorAll(".train-cloud").forEach((c) => L.onTap(c, () => L.say("Cloud!")));
  `;
  const hidden = check(hiddenClouds, "fixture-main.js");
  assert.ok(hidden.some((p) => /aria-hidden/.test(p)), "main-shaped clouds must be reported");
  assert.ok(hidden.some((p) => /<div>/.test(p)), "main-shaped sun div must be reported");
  assert.ok(hidden.some((p) => /not a <button>/.test(p)), "missing sun button must be reported");
  assert.ok(hidden.some((p) => /expected 3/.test(p)), "missing cloud buttons must be reported");
  assert.ok(hidden.some((p) => /Moon/.test(p)), "missing day/night name must be reported");

  const fixed = `
    stage.innerHTML = \`
      <div id="trainSky">
        <button type="button" id="trainSun" class="train-sun" aria-label="Sun"></button>
        <button type="button" class="train-cloud train-cloud--1" aria-label="Cloud"></button>
        <button type="button" class="train-cloud train-cloud--2" aria-label="Cloud"></button>
        <button type="button" class="train-cloud train-cloud--3" aria-label="Cloud"></button>
      </div>\`;
    if (sun) sun.setAttribute("aria-label", dayPhase >= 2 ? "Moon" : "Sun");
    L.onTap(sun, () => L.say("Sunshine!"));
    document.querySelectorAll(".train-cloud").forEach((c) => L.onTap(c, () => L.say("Cloud!")));
  `;
  assert.deepEqual(check(fixed, "fixture-fixed.js"), [], "fixed sky must pass");

  // Farm fish stay pointer-only (aria-hidden + tabindex=-1). That is a
  // different leftover and must not trip the Train cloud/sun rules.
  const fish = `
    f.setAttribute("aria-hidden", "true");
    f.setAttribute("tabindex", "-1");
    L.onTap(f, () => L.say("Fish!"));
  `;
  const fishHits = check(fish, "fixture-fish.js");
  assert.ok(!fishHits.some((p) => /aria-hidden/.test(p)), "unrelated aria-hidden must not be reported as a train-cloud");

  console.log("PASS: train-sky self-test");
}

if (require.main === module) {
  try {
    if (process.argv.includes("--self-test")) {
      selfTest();
      process.exit(0);
    }
    const src = fs.readFileSync(TRAIN, "utf8");
    const problems = check(src, "games/train.js");
    if (problems.length) {
      console.error("FAIL: Train sky:\n" + problems.map((p) => "  " + p).join("\n"));
      process.exit(1);
    }
    console.log("PASS: train-sky — sun and clouds are named buttons; sun name follows day/night");
  } catch (err) {
    console.error(err);
    process.exit(99);
  }
}

module.exports = { check };
