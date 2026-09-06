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
// 3. "Short line, then an arrow that calls a speaker" (Connect-the-dots):
//    a game says a short number ("5") and then
//    setTimeout(() => winPuzzle(...), 450) whose named function speaks
//    the next line. Distinct from an inline say() in the callback and
//    from setTimeout(name, ms). afterSpeech, same as rule 1. Not
//    reported: an arrow that only touches visuals, or one whose function
//    does not speak or chime.
//
// Run: node tests/pacing-lint.js            (checks every game)
//      node tests/pacing-lint.js --self-test (checks the checker on fixtures)
const fs = require('node:fs');
const path = require('node:path');
const WINDOW = 8;                 // lines after the say() to inspect for a bare timer
const ARROW_WINDOW = 10;          // lines after the say() to inspect for () => speaker()
const CHIME_WINDOW = 2;           // lines after the say() to inspect for a chime
const CONTEXT = 3;                // lines before it where `L.cheer()` may sit in a variable
const SAY = /L\.say(?:Prompt)?\(/;
const CHEER = /cheer\(\)/;
const TRY_AGAIN = /[Tt]ry again/;
const VISUAL_ONLY = /sparkleAt|classList|confetti/;
const SPEECH_GATED = /\.then\(/;  // a timer inside a .then() chain waits for speech already
const CHIME = /L\.(?:happySound|buzzSound|stickerJingle|beep)\(/;
const SPEAKS = /L\.say(?:Prompt)?\(|L\.(?:happySound|buzzSound|stickerJingle)\(/;
const DEFERRED = /setTimeout\(|setT\(|=>/;   // a chime scheduled for later is not on the first word
const BRANCH_END = /^\s*(?:\}|else\b)/;       // the say() sits in another branch than what follows
// A short fixed wait: setTimeout(() => name(...), 450) or setT(450, () => name(...)).
// Long or computed waits (a 35 s weather cycle, a respawn constant) are not
// "speaking over" the line.
const SHORT_MS = 2000;
const ARROW_NAMED = /setTimeout\(\s*\(\)\s*=>\s*([A-Za-z_]\w*)\s*\([^)]*\)\s*,\s*(\d{1,4})\s*\)|setT\(\s*(\d{1,4})\s*,\s*\(\)\s*=>\s*([A-Za-z_]\w*)\s*\(/;

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
    // Rule 3: an arrow timer that calls a named function whose body speaks.
    let depth = 0;
    for (let j = i + 1; j <= Math.min(i + ARROW_WINDOW, lines.length - 1); j++) {
      const l = lines[j];
      depth += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
      if (depth < 0) break;                            // left the line's block
      if (SAY.test(l) || SPEECH_GATED.test(l) || /afterSpeech\(/.test(l)) break;
      const named = l.match(ARROW_NAMED);
      if (!named) continue;
      const name = named[1] || named[4];
      const ms = Number(named[2] || named[3]);
      if (!name || !(ms <= SHORT_MS)) continue;
      const body = functionBody(lines, name);
      if (!body || !SPEAKS.test(body)) continue;
      problems.push(`${file}:${j + 1}: arrow timer ${name}() after the line on ${i + 1} speaks over it — use L.afterSpeech(() => ${name}(...), { minMs })\n    ${l.trim()}`);
      break;
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
  // Rule 3: an arrow that calls a named speaker is the leftover short-line shape.
  const winFn = 'function winPuzzle(p, svg) {\n  L.happySound();\n  L.say("It\'s a house!");\n}\n';
  assert.equal(lint('L.say("5");\nsetTimeout(() => winPuzzle(p, svg), 450);\n' + winFn).length, 1);
  assert.match(lint('L.say("5");\nsetTimeout(() => winPuzzle(p, svg), 450);\n' + winFn)[0], /arrow timer winPuzzle/);
  assert.equal(lint('L.say("5");\nL.afterSpeech(() => winPuzzle(p, svg), { minMs: 450 });\n' + winFn).length, 0);
  // A few lines down (nextDot++, then the last-dot branch) still counts.
  assert.equal(lint('L.say("5");\nnextDot += 1;\nif (done) {\n  advanceTimer = setTimeout(() => winPuzzle(p, svg), 450);\n}\n' + winFn).length, 1);
  // An arrow whose function does not speak (a visual cleanup) is fine.
  assert.equal(lint('L.say("5");\nsetTimeout(() => hideHint(), 700);\nfunction hideHint() {\n  el.classList.remove("hint");\n}').length, 0);
  // A long or computed wait is not speaking over the line (Farm apple
  // respawn, Garden rain).
  assert.equal(lint('L.say("Apple!");\nsetT(APPLE_RESPAWN_MS, () => spawnApple(i));\nfunction spawnApple() {\n  L.say("Apple!");\n}').length, 0);
  assert.equal(lint('L.say("Sun!");\nsetT(35000, () => startRain());\nfunction startRain() {\n  L.say("Rain!");\n}').length, 0);
  // An inline say() in the callback, or setTimeout(name, ms), is a
  // different shape — leave those for their own follow-ons.
  assert.equal(lint('L.say("Flip!");\nsetT(780, () => L.say("Yummy!"));').length, 0);
  assert.equal(lint('L.say("cow");\nsetTimeout(speakTarget, 700);\nfunction speakTarget() {\n  L.say("Find the duck!");\n}').length, 0);
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
  console.log(`PASS: pacing lint — no bare timer right after a cheer, no chime right after a line, no arrow follow-on over a short line, in ${files.length} games`);
}
module.exports = { check };
