// Static regression checks for two speech-pacing bugs that were fixed
// game by game and must not creep back:
//
// 1. "Cheer, then a fixed timer" (#18 and follow-ons): a game speaks a
//    cheer (or a "try again"), then starts the next round on a bare
//    setTimeout whose prompt cuts the line off. The right shape is
//    L.afterSpeech(next, { minMs }).
// 2. "Line, then a chime" (#24's other half): a game says a line and then
//    triggers a chime in the same tick. say() waits for a chime that is
//    already ringing, but a chime triggered after it lands on the first
//    word. Trigger the chime first; the line waits for it.
// 3. "Two lines in the same tick": a game says a line and then another
//    say() in the same handler with no afterSpeech / .then between them.
//    The second cuts the first off. A say() inside a later timer is a
//    different leftover (those have their own follow-ons); a say() in
//    the other branch of an if/else is not after the first.
//
// Run: node tests/pacing-lint.js            (checks every game)
//      node tests/pacing-lint.js --self-test (checks the checker on fixtures)
const fs = require('node:fs');
const path = require('node:path');
const WINDOW = 8;                 // lines after the say() to inspect for a bare timer
const CHIME_WINDOW = 2;           // lines after the say() to inspect for a chime
const CONTEXT = 3;                // lines before it where `L.cheer()` may sit in a variable
const SAY = /L\.say(?:Prompt)?\(/;
const CHEER = /cheer\(\)/;
const TRY_AGAIN = /[Tt]ry again/;
const VISUAL_ONLY = /sparkleAt|classList|confetti/;
const SPEECH_GATED = /\.then\(/;  // a timer inside a .then() chain waits for speech already
const CHIME = /L\.(?:happySound|buzzSound|stickerJingle|beep)\(/;
const DEFERRED = /setTimeout\(|setT\(|=>/;   // a chime scheduled for later is not on the first word
const BRANCH_END = /^\s*(?:\}|else\b)/;       // the say() sits in another branch than what follows
const LATER_HANDLER = /onTap(?:Once)?\(|addEventListener\(|\.forEach\(/;

function check(file, lines) {
  const problems = [];
  lines.forEach((line, i) => {
    if (!SAY.test(line)) return;
    // Rule 2: a chime right after the line.
    for (let j = i + 1; j <= Math.min(i + CHIME_WINDOW, lines.length - 1); j++) {
      const l = lines[j];
      if (SAY.test(l) || BRANCH_END.test(l) || SPEECH_GATED.test(l) || DEFERRED.test(l)) break;
      if (CHIME.test(l)) {
        problems.push(`${file}:${j + 1}: chime right after the line on ${i + 1} lands on its first word — trigger the chime first, the line waits for it\n    ${l.trim()}`);
        break;
      }
    }
    // Rule 3: another say() still in this handler, not inside a timer
    // and not after afterSpeech / .then. A say() that only lives inside
    // an onTap / forEach callback is a later tap, not this tick.
    if (!LATER_HANDLER.test(line)) {
      const baseIndent = indentOf(line);
      let timerBraces = 0;
      for (let j = i + 1; j < lines.length; j++) {
        const l = lines[j];
        if (!l.trim()) continue;
        if (timerBraces === 0 && indentOf(l) < baseIndent && /^\s*(?:function\b|[\}\)])/.test(l)) break;
        if (timerBraces === 0 && BRANCH_END.test(l) && indentOf(l) <= baseIndent) break;
        if (timerBraces === 0 && /afterSpeech\(|\.then\(/.test(l)) break;
        if (timerBraces === 0 && LATER_HANDLER.test(l)) break;
        if (/setTimeout\(|setT\(/.test(l)) {
          timerBraces += braceDelta(l);
          if (timerBraces < 0) timerBraces = 0;
        } else if (timerBraces > 0) {
          timerBraces += braceDelta(l);
          if (timerBraces < 0) timerBraces = 0;
        }
        if (SAY.test(l) && timerBraces === 0 && !/setTimeout\(|setT\(/.test(l)) {
          problems.push(`${file}:${j + 1}: second say() in the same tick as the line on ${i + 1} — wait with L.afterSpeech so the first is heard\n    ${l.trim()}`);
          break;
        }
      }
    }
    // Rule 1: a bare timer after a cheer / "try again".
    const context = lines.slice(Math.max(0, i - CONTEXT), i + 1).join('\n');
    if (!CHEER.test(context) && !TRY_AGAIN.test(line)) return;
    for (let j = i + 1; j <= Math.min(i + WINDOW, lines.length - 1); j++) {
      const l = lines[j];
      if (SAY.test(l)) break;                          // a later line owns what follows
      if (lines.slice(i + 1, j + 1).some(x => SPEECH_GATED.test(x))) break;
      if (/setTimeout\(/.test(l) && !VISUAL_ONLY.test(l)) {
        problems.push(`${file}:${j + 1}: bare setTimeout after the cheer/try-again on line ${i + 1} — use L.afterSpeech(fn, { minMs })\n    ${l.trim()}`);
      }
    }
  });
  return problems;
}

function indentOf(s) { return s.match(/^(\s*)/)[1].length; }
function braceDelta(s) { return (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length; }

function selfTest() {
  const assert = require('node:assert/strict');
  const lint = src => check('fixture.js', src.split('\n'));
  // Rule 2 catches a chime on either of the two lines after the say().
  assert.equal(lint('L.say("Munch!");\nL.happySound();').length, 1);
  assert.equal(lint('L.say("Choo!");\nL.haptic(8);\nL.beep(900, 0.2);').length, 1);
  assert.match(lint('L.say("Munch!");\nL.happySound();')[0], /chime right after the line on 1/);
  // Chime first is the right shape.
  assert.equal(lint('L.happySound();\nL.say("Munch!");').length, 0);
  // The chime in the other branch of an if/else is not after the line.
  assert.equal(lint('if (has) {\n  L.say("Yes");\n} else {\n  L.beep(400);\n}').length, 0);
  assert.equal(lint('if (has) L.say("Yes");\nelse L.beep(400);').length, 0);
  // A chime scheduled for later, or after the line has been heard, is fine.
  assert.equal(lint('L.say("Yes");\nsetT(300, () => L.beep(400));').length, 0);
  assert.equal(lint('L.say("Yes").then(() => L.happySound());').length, 0);
  // A later line owns the chime that follows it (rule 2); the pair is also rule 3.
  const pair = lint('L.say("One");\nL.say("Two");\nL.beep(400);');
  assert.equal(pair.length, 2);
  assert.match(pair[0], /second say\(\) in the same tick as the line on 1/);
  assert.match(pair[1], /chime right after the line on 2/);
  // Rule 1 still fires on a bare timer after a cheer and is quiet on afterSpeech.
  assert.equal(lint('L.say(L.cheer());\nsetTimeout(next, 900);').length, 1);
  assert.equal(lint('L.say(L.cheer());\nL.afterSpeech(next, { minMs: 900 });').length, 0);
  assert.equal(lint('L.say("Try again!");\nsetTimeout(() => el.classList.remove("x"), 300);').length, 0);
  // Rule 3: a second say() in the same tick, even after a visual timer.
  assert.equal(lint('L.say("Sunshine!");\nsetT(900, () => sun.classList.remove("spinning"));\nif (taps % 5 === 0) {\n  L.say("Sunshine power!");\n}').length, 1);
  assert.match(lint('L.say("Sunshine!");\nL.say("Sunshine power!");')[0], /second say\(\) in the same tick/);
  // afterSpeech gates the follow-on; a say() inside a later timer is not this rule;
  // the other branch of an if/else is not after the line.
  assert.equal(lint('L.say("Sunshine!");\nL.afterSpeech(() => {\n  L.say("Sunshine power!");\n}, { minMs: 400 });').length, 0);
  assert.equal(lint('L.say("Flip!");\nsetT(780, () => {\n  L.say("Yummy!");\n});').length, 0);
  assert.equal(lint('L.say("Flip!");\nsetTimeout(() => L.say("Yummy!"), 780);').length, 0);
  assert.equal(lint('if (full) {\n  L.say("All full! Yum!");\n} else {\n  L.say("Slurp slurp!");\n}').length, 0);
  // A say() that only runs on a later tap, or a prompt then a forEach of
  // answer handlers, is not this tick.
  assert.equal(lint('L.say("Tweet tweet!");\nL.onTap(bird, (e) => {\n  L.say("Pretty bird!");\n});').length, 0);
  assert.equal(lint('L.onTap(el, () => L.sayPrompt("Find the cow"));\nif (speak) L.sayPrompt("Find the cow");').length, 0);
  assert.equal(lint('if (speak) L.sayPrompt("Find the cow");\noptions.forEach((item) => {\n  L.onTap(btn, () => L.say(L.cheer()));\n});').length, 0);
  console.log('PASS: pacing lint self-test');
}

if (require.main === module) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  const dir = process.env.GAMES_DIR || path.join(__dirname, '../games');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
  const problems = files.flatMap(file => check(file, fs.readFileSync(path.join(dir, file), 'utf8').split('\n')));
  if (problems.length) {
    console.error('FAIL: speech pacing:\n' + problems.join('\n'));
    process.exit(1);
  }
  console.log(`PASS: pacing lint — no bare timer right after a cheer, no chime right after a line, no second say() in the same tick, in ${files.length} games`);
}
module.exports = { check };
