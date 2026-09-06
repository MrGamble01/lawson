// Navigation vs. speech: a hub's welcome line is spoken a beat after the
// hub opens. If the kid has already tapped on to a game (or Home, or
// another hub) by then, it must not be spoken over that screen. Listens to
// the lawson:say events the speech layer dispatches for captions, so it
// works in headless Chromium with no voices installed.
// Run: node tests/nav-speech.js
const path = require("path");
const PW_PATH = process.env.PLAYWRIGHT_MODULE || "/opt/node22/lib/node_modules/playwright";
const { chromium } = require(PW_PATH);
const INDEX = "file://" + path.join(path.resolve(__dirname, ".."), "index.html");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 414, height: 896 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(INDEX);
  await page.evaluate(() => {
    window.__said = [];
    window.addEventListener("lawson:say", e => window.__said.push(e.detail.spoken));
  });
  const said = () => page.evaluate(() => window.__said.splice(0));
  const tap = sel => page.$eval(sel, el => el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, isPrimary: true, pointerType: "touch" })) && el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, isPrimary: true, pointerType: "touch" })) && el.click());
  let failures = 0;
  const check = (ok, msg) => { console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failures++; };

  // 1. Hub opened and left alone: the welcome line is spoken.
  await tap('[data-hub="moreHub"]');
  await page.waitForTimeout(700);
  let lines = await said();
  check(lines.includes("Lots more to explore!"), "hub welcome spoken when the hub stays open");

  // 2. Hub opened, then a game tapped within the beat: no welcome over the game.
  await tap('[data-home]');
  await page.waitForTimeout(300);
  await said();
  await tap('[data-hub="moreHub"]');
  await page.waitForTimeout(120);
  await tap('[data-hub="brainHub"]');            // hubs chain: More → Brain Games
  await page.waitForTimeout(120);
  await tap('[data-go="match"]');
  await page.waitForTimeout(900);
  lines = await said();
  check(!lines.includes("Lots more to explore!") && !lines.includes("Brain games!"),
    `no hub welcome after tapping on (heard: ${JSON.stringify(lines)})`);

  // 3. Hub opened, then Home within the beat: nothing spoken on the menu.
  await tap('[data-home]');
  await page.waitForTimeout(300);
  await said();
  await tap('[data-hub="moreHub"]');
  await page.waitForTimeout(120);
  await tap('[data-home]');
  await page.waitForTimeout(700);
  lines = await said();
  check(!lines.includes("Lots more to explore!"), `no hub welcome after Home (heard: ${JSON.stringify(lines)})`);

  check(errors.length === 0, `no page errors (${errors.join("; ")})`);
  await browser.close();
  if (failures) { console.log(`Nav speech: ${failures} failure(s)`); process.exit(1); }
  console.log("Nav speech: all pass");
})().catch(e => { console.error(e); process.exit(99); });
