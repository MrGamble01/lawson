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
// 3. "Line, then a fixed timer that speaks": the same bug as 1 for any
//    line, not just a cheer — "Flip!" then "Yummy!" on a 780 ms timer,
//    the counted number then the total on 600 ms. Only a timer whose
//    body speaks (or chimes) counts; timers for visuals are fine. Only
//    a timer in the line's own block counts: one after the block's
//    closing brace belongs to whatever comes next.
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
const TIMER = /setTimeout\(|setT\(/;      // games wrap setTimeout as setT()
const SPEAKS = /L\.say(?:Prompt)?\(|L\.(?:happySound|buzzSound|stickerJingle)\(/;
const TIMER_BODY = 4;             // lines of a multi-line timer callback to inspect for speech
const TIMER_WINDOW = 10;          // lines after the say() to inspect for a speaking timer
const DEFERRED = /setTimeout\(|setT\(|=>/;   // a chime scheduled for later is not on the first word
const BRANCH_END = /^\s*(?:\}|else\b)/;       // the say() sits in another branch than what follows

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
    // Rule 3: a fixed timer in the line's own block whose body speaks.
    let depth = 0;
    for (let j = i + 1; j <= Math.min(i + TIMER_WINDOW, lines.length - 1); j++) {
      const l = lines[j];
      depth += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
      if (depth < 0) break;                            // left the line's block
      if (TIMER.test(l)) {
        const body = l.replace(/^.*?(?:setTimeout|setT)\(/, '');
        // A one-line callback is all on this line; a `=> {` callback
        // continues below (and only then do the next lines belong to it).
        const multiLine = (body.match(/\{/g) || []).length > (body.match(/\}/g) || []).length;
        const speaks = SPEAKS.test(body) ||
          (multiLine && lines.slice(j + 1, j + 1 + TIMER_BODY).some(x => SPEAKS.test(x)));
        if (speaks) {
          problems.push(`${file}:${j + 1}: fixed timer speaks over the line on ${i + 1} — use L.afterSpeech(fn, { minMs }) so the line is heard first\n    ${l.trim()}`);
          break;
        }
        continue;                                      // a timer for visuals; keep looking
      }
      if (SAY.test(l) || SPEECH_GATED.test(l) || /afterSpeech\(/.test(l)) break;
    }
    // Rule 1: a bare timer after a cheer / "try again".
    const context = lines.slice(Math.max(0, i - CONTEXT), i + 1).join('\n');
    if (!CHEER.test(context) && !TRY_AGAIN.test(line)) return;
    for (let j = i + 1; j <= Math.min(i + WINDOW, lines.length - 1); j++) {
      const l = lines[j];
      if (SAY.test(l)) break;                          // a later line owns what follows
      if (lines.slice(i + 1, j + 1).some(x => SPEECH_GATED.test(x))) break;
      if (/setTimeout\(/.test(l) && !VISUAL_ONLY.test(l) && !problems.some(p => p.startsWith(`${file}:${j + 1}:`))) {
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
  // Rule 3: a fixed timer whose body speaks, on the same line or inside a
  // multi-line callback, is flagged; a timer for visuals is not.
  assert.equal(lint('L.say("Flip!");\nsetT(780, () => L.say("Yummy!"));').length, 1);
  assert.equal(lint('L.say("three");\nx.textContent = 3;\nsetTimeout(() => {\n  L.happySound();\n  L.say("There are three cows!");\n}, 600);').length, 1);
  assert.match(lint('L.say("Flip!");\nsetT(780, () => L.say("Yummy!"));')[0], /fixed timer speaks over the line on 1/);
  assert.equal(lint('L.say("Flip!");\nsetT(450, () => sp.classList.remove("flipping"));').length, 0);
  // A one-line visual timer does not borrow the speech of whatever follows it.
  assert.equal(lint('L.say("Splash!");\nsetTimeout(() => f.remove(), 1400);\nif (caught) {\n  L.happySound();\n  L.say("Caught a fish!");\n}').length, 0);
  // A multi-line callback is inspected a few lines deep (Cook: two visual lines, a beep, then the line).
  assert.equal(lint('L.say("Flip!");\nsetT(780, () => {\n  p.className = "cooked";\n  setState(COOKED);\n  L.beep(720, 0.08);\n  L.say("Yummy!");\n});').length, 1);
  // A visual timer in front of the speaking one does not hide it.
  assert.equal(lint('L.say("Squirt!");\nsetT(420, () => el.classList.remove("x"));\nif (full) {\n  setT(400, () => {\n    L.happySound();\n    L.say("Bucket full!");\n  });\n}').length, 1);
  assert.equal(lint('L.say("Flip!");\nL.afterSpeech(() => L.say("Yummy!"), { minMs: 780 });').length, 0);
  // A timer after the line's block belongs to the next thing, not the line.
  assert.equal(lint('if (wrong) {\n  L.say("Count them again!");\n}\nactiveTimer = setTimeout(() => L.sayPrompt("How many?"), 450);').length, 0);
  // A cheer followed by a speaking timer is reported once, not by both rules.
  assert.equal(lint('L.say(L.cheer());\nsetTimeout(() => L.say("Next!"), 900);').length, 1);
  // Rule 1 still fires on a bare timer after a cheer and is quiet on afterSpeech.
  assert.equal(lint('L.say(L.cheer());\nsetTimeout(next, 900);').length, 1);
  assert.equal(lint('L.say(L.cheer());\nL.afterSpeech(next, { minMs: 900 });').length, 0);
  assert.equal(lint('L.say("Try again!");\nsetTimeout(() => el.classList.remove("x"), 300);').length, 0);
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
  console.log(`PASS: pacing lint — no bare timer right after a cheer, no chime right after a line, no fixed timer speaking over a line, in ${files.length} games`);
}
module.exports = { check };
