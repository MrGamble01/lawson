// Garden sky easter eggs are real buttons. The clouds used to be
// aria-hidden divs given onTap, so makeTappableAccessible skipped them
// (it will not overwrite aria-hidden) and Tab / a screen reader never
// reached "Cloud!". The sun was already a <button>; the clouds now match
// it, the same shape Train and Farm use.
//
// Run:  node tests/garden-sky.js
//       node tests/garden-sky.js --self-test
// Exit: 0 pass · 1 leftover sky markup · 99 runner crashed.

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const GARDEN = path.join(__dirname, "../games/garden.js");

function check(src, file) {
  const problems = [];
  const label = file || "garden.js";

  // A cloud that is aria-hidden in the sky markup. onTap will not turn
  // it into a button, so it stays pointer-only.
  if (/class="garden-cloud[^"]*"[^>]*aria-hidden\s*=\s*"true"/.test(src)
      || /aria-hidden\s*=\s*"true"[^>]*class="garden-cloud/.test(src)) {
    problems.push(`${label}: garden-cloud is aria-hidden — onTap will not upgrade it to a button`);
  }

  // The sun stays a real <button>.
  if (!/<button\b[^>]*\bid="gardenSun"/.test(src)) {
    problems.push(`${label}: #gardenSun is not a <button>`);
  }

  // Clouds are <button>s named like the spoken line.
  const cloudTags = src.match(/<button\b[^>]*class="garden-cloud[^"]*"[^>]*>/g) || [];
  if (cloudTags.length < 3) {
    problems.push(`${label}: expected 3 <button class="garden-cloud"> tags, found ${cloudTags.length}`);
  }
  cloudTags.forEach((tag, i) => {
    if (!/aria-label="Cloud"/.test(tag)) {
      problems.push(`${label}: garden-cloud ${i + 1} is missing aria-label="Cloud"`);
    }
  });

  return problems;
}

function selfTest() {
  const hiddenClouds = `
    stage.innerHTML = \`
      <div id="gardenSky">
        <div class="garden-cloud garden-cloud--1" aria-hidden="true">\${cloudSvg()}</div>
        <div class="garden-cloud garden-cloud--2" aria-hidden="true">\${cloudSvg()}</div>
        <div class="garden-cloud garden-cloud--3" aria-hidden="true">\${cloudSvg()}</div>
        <button id="gardenSun" class="garden-sun" aria-label="Sun">\${sunSvg()}</button>
      </div>\`;
    document.querySelectorAll(".garden-cloud").forEach((c) => L.onTap(c, () => L.say("Cloud!")));
  `;
  const hidden = check(hiddenClouds, "fixture-main.js");
  assert.ok(hidden.some((p) => /aria-hidden/.test(p)), "main-shaped clouds must be reported");
  assert.ok(hidden.some((p) => /expected 3/.test(p)), "missing cloud buttons must be reported");
  assert.ok(!hidden.some((p) => /gardenSun/.test(p)), "the sun button must not be reported");

  const fixed = `
    stage.innerHTML = \`
      <div id="gardenSky">
        <button type="button" class="garden-cloud garden-cloud--1" aria-label="Cloud">\${cloudSvg()}</button>
        <button type="button" class="garden-cloud garden-cloud--2" aria-label="Cloud">\${cloudSvg()}</button>
        <button type="button" class="garden-cloud garden-cloud--3" aria-label="Cloud">\${cloudSvg()}</button>
        <button id="gardenSun" class="garden-sun" aria-label="Sun">\${sunSvg()}</button>
      </div>\`;
    document.querySelectorAll(".garden-cloud").forEach((c) => L.onTap(c, () => L.say("Cloud!")));
  `;
  assert.deepEqual(check(fixed, "fixture-fixed.js"), [], "fixed sky must pass");

  // A cloud button without a name is still a gap for a screen reader.
  const unnamed = fixed.replace('class="garden-cloud garden-cloud--2" aria-label="Cloud"', 'class="garden-cloud garden-cloud--2"');
  assert.ok(check(unnamed, "fixture-unnamed.js").some((p) => /cloud 2 is missing aria-label/.test(p)), "an unnamed cloud must be reported");

  // A sun that regressed to a <div> is reported.
  const sunDiv = fixed.replace('<button id="gardenSun"', '<div id="gardenSun"');
  assert.ok(check(sunDiv, "fixture-sun.js").some((p) => /gardenSun is not a <button>/.test(p)), "a sun div must be reported");

  // Other aria-hidden decorations (the sky stars, a fish) are not clouds.
  const stars = `
    <div class="garden-stars" aria-hidden="true"></div>
    f.setAttribute("aria-hidden", "true");
    L.onTap(f, () => L.say("Fish!"));
  `;
  assert.ok(!check(stars, "fixture-stars.js").some((p) => /aria-hidden/.test(p)), "unrelated aria-hidden must not be reported as a garden-cloud");

  console.log("PASS: garden-sky self-test");
}

if (require.main === module) {
  try {
    if (process.argv.includes("--self-test")) {
      selfTest();
      process.exit(0);
    }
    const src = fs.readFileSync(GARDEN, "utf8");
    const problems = check(src, "games/garden.js");
    if (problems.length) {
      console.error("FAIL: Garden sky:\n" + problems.map((p) => "  " + p).join("\n"));
      process.exit(1);
    }
    console.log("PASS: garden-sky — sun and clouds are named buttons");
  } catch (err) {
    console.error(err);
    process.exit(99);
  }
}

module.exports = { check };
