// Static regression checks for three speech-pacing bugs that were fixed
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
// 3. "Short line, then setT(ms, name)" (Ice Cream): a game says a short
//    line ("Mmm!") and then setT(450, eatBite) whose body speaks the
//    next bite or the cheer. Games wrap setTimeout as setT(); a late-
//    starting engine loses the line. afterSpeech, same as rule 1.
//    Not reported: setTimeout(name, ms) (a different leftover), an
//    arrow timer, a long or computed wait (Dino's 2400 ms new round,
//    Farm egg respawn), a named timer whose function does not speak
//    or chime, and a timer past the line's .then() (already waiting).
//
// Run: node tests/pacing-lint.js            (checks every game)
//      node tests/pacing-lint.js --self-test (checks the checker on fixtures)
const fs = require('node:fs');
const path = require('node:path');
const WINDOW = 8;                 // lines after the say() to inspect for a bare timer
const SETT_WINDOW = 16;           // lines after the say() to inspect for setT(ms, name)
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
const SETT_NAMED = /setT\(\s*(\d+)\s*,\s*([A-Za-z_]\w*)\s*\)/;
const SHORT_MS = 2000;            // a cooking / new-round wait is not this leftover

function functionBody(lines, name) {
  const start = new RegExp(`^\\s*function\\s+${name}\\s*\\(`);
  const idx = lines.findIndex((l) => start.test(l));
  if (idx < 0) return '';
  const rest = [];
  for (let i = idx + 1; i < lines.length; i++) {
    if (/^\s*function\s+\w+\s*\(/.test(lines[i])) break;
    rest.push(lines[i]);
  }
  return rest.join('\n');
}

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
    // Rule 3: setT(shortMs, name) after any line, whose callback speaks.
    for (let j = i + 1; j <= Math.min(i + SETT_WINDOW, lines.length - 1); j++) {
      const l = lines[j];
      if (SAY.test(l)) break;
      if (lines.slice(i, j + 1).some(x => SPEECH_GATED.test(x))) break;
      const named = l.match(SETT_NAMED);
      if (!named) continue;
      if (Number(named[1]) > SHORT_MS) continue;
      const body = functionBody(lines, named[2]);
      if (!body || (!SAY.test(body) && !CHIME.test(body))) continue;
      problems.push(`${file}:${j + 1}: setT(${named[1]}, ${named[2]}) after the line on ${i + 1} speaks over it — use L.afterSpeech(${named[2]}, { minMs })\n    ${l.trim()}`);
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
  // A later line owns what follows it.
  assert.equal(lint('L.say("One");\nL.say("Two");\nL.beep(400);').length, 1);
  // Rule 1 still fires on a bare timer after a cheer and is quiet on afterSpeech.
  assert.equal(lint('L.say(L.cheer());\nsetTimeout(next, 900);').length, 1);
  assert.equal(lint('L.say(L.cheer());\nL.afterSpeech(next, { minMs: 900 });').length, 0);
  assert.equal(lint('L.say("Try again!");\nsetTimeout(() => el.classList.remove("x"), 300);').length, 0);
  // Rule 3: setT(shortMs, name) whose body speaks is the leftover Ice Cream shape.
  const eatFn = 'function eatBite() {\n  L.say("Mmm!");\n}\n';
  assert.equal(lint('L.say("Mmm!");\nsetT(450, eatBite);\n' + eatFn).length, 1);
  assert.match(lint('L.say("Mmm!");\nsetT(450, eatBite);\n' + eatFn)[0], /setT\(450, eatBite\)/);
  assert.equal(lint('L.say("Mmm!");\nL.afterSpeech(eatBite, { minMs: 450 });\n' + eatFn).length, 0);
  // A named setT a few lines down (topping fade, then the next bite) still counts.
  assert.equal(lint('L.say("Mmm!");\nbites += 1;\nplaced.forEach((p) => {\n  setT(280, () => p.el.remove());\n});\nrender();\nsetT(450, eatBite);\n' + eatFn).length, 1);
  // setTimeout(name, ms) is a different leftover — not this rule.
  assert.equal(lint('L.say("cow");\nsetTimeout(speakTarget, 700);\nfunction speakTarget() {\n  L.say("Find the duck!");\n}').length, 0);
  // An arrow setT whose body speaks is a different leftover — not this rule.
  assert.equal(lint('L.say("Flip!");\nsetT(780, () => L.say("Yummy!"));').length, 0);
  // A long or computed wait is not this leftover (Dino new round, Farm eggs).
  assert.equal(lint('L.say("All clean!");\nsetT(2400, newRound);\nfunction newRound() {\n  L.say("Wash him!");\n}').length, 0);
  assert.equal(lint('L.say("Egg!");\nsetT(EGG_RESPAWN_MS, spawnEgg);\nfunction spawnEgg() {\n  L.say("Egg!");\n}').length, 0);
  // A named setT whose body does not speak (a game tick) is fine.
  assert.equal(lint('L.say("Go!");\nsetT(90, step);\nfunction step() {\n  move();\n}').length, 0);
  // Already waiting on the line: the timer in the .then() is not over it.
  assert.equal(lint('L.say("Mmm!").then(() => setT(450, eatBite));\n' + eatFn).length, 0);
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
  console.log(`PASS: pacing lint — no bare timer right after a cheer, no chime right after a line, no setT(ms, name) speaking over a line, in ${files.length} games`);
}
module.exports = { check };
