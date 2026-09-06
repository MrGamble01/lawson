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
// 3. "Cheer, then setT(ms, name)" (Baby Dino): rule 1 only looks at
//    setTimeout within 8 lines. Dino wraps the timer as setT() and puts
//    hearts in between, so "All clean! Great job!" is cut by "Wash him
//    with soap!" whenever the engine starts late or the cheer is long
//    (a name, slower speed). afterSpeech, same as rule 1. Not reported:
//    a visual setT arrow, a named setT whose function does not speak
//    (even via a callee), a setT after a line that is not a cheer, or
//    afterSpeech.
//
// Run: node tests/pacing-lint.js            (checks every game)
//      node tests/pacing-lint.js --self-test (checks the checker on fixtures)
const fs = require('node:fs');
const path = require('node:path');
const WINDOW = 8;                 // lines after the say() to inspect for a bare timer
const SETT_WINDOW = 24;           // lines after a cheer to inspect for setT(ms, name)
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
const SKIP_CALL = /^(if|for|while|switch|return|typeof|void|new|setTimeout|setT|clearTimeout|clearInterval|clearNext|clearAll|Math|parseInt|parseFloat|Number|String|Boolean|Date|document|window|console|L|URL|Object|Array|JSON|Promise|requestAnimationFrame)$/;
const NAMED_CALL = /(?<![.\w])([A-Za-z_]\w*)\s*\(/g;

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

// True if `name` speaks, or calls a function that does (Dino: newRound
// → enterPhase → L.say).
function functionSpeaks(lines, name, seen = new Set()) {
  if (seen.has(name)) return false;
  seen.add(name);
  const body = functionBody(lines, name);
  if (!body) return false;
  if (SAY.test(body)) return true;
  NAMED_CALL.lastIndex = 0;
  let m;
  while ((m = NAMED_CALL.exec(body))) {
    if (SKIP_CALL.test(m[1])) continue;
    if (functionSpeaks(lines, m[1], seen)) return true;
  }
  return false;
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
    const context = lines.slice(Math.max(0, i - CONTEXT), i + 1).join('\n');
    const afterCheer = CHEER.test(context) || TRY_AGAIN.test(line);
    // Rule 3: setT(ms, name) after a cheer, whose callback speaks.
    if (afterCheer) {
      for (let j = i + 1; j <= Math.min(i + SETT_WINDOW, lines.length - 1); j++) {
        const l = lines[j];
        if (SAY.test(l) || /afterSpeech\(/.test(l)) break;
        if (lines.slice(i + 1, j + 1).some(x => SPEECH_GATED.test(x))) break;
        const named = l.match(SETT_NAMED);
        if (!named) continue;
        if (!functionSpeaks(lines, named[2])) continue;
        problems.push(`${file}:${j + 1}: setT(${named[1]}, ${named[2]}) after the cheer on ${i + 1} speaks over it — use L.afterSpeech(${named[2]}, { minMs })\n    ${l.trim()}`);
      }
    }
    // Rule 1: a bare timer after a cheer / "try again".
    if (!afterCheer) return;
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
  // Rule 3: cheer then setT(ms, name) whose callee speaks (Dino: newRound → enterPhase).
  const dino = 'function enterPhase(p) {\n  L.say("Wash him with soap!");\n}\nfunction newRound() {\n  enterPhase("soap");\n}\n';
  assert.equal(lint('L.say(`All clean! ${L.cheer()}`);\nsetT(2400, newRound);\n' + dino).length, 1);
  assert.match(lint('L.say(`All clean! ${L.cheer()}`);\nsetT(2400, newRound);\n' + dino)[0], /setT\(2400, newRound\)/);
  // Hearts in between (the real Dino shape) still count.
  assert.equal(lint('L.say(`All clean! ${L.cheer()}`);\nrounds += 1;\nfor (let i = 0; i < 8; i++) {\n  setT(i * 90, () => {\n    h.remove();\n  });\n}\nsetT(2400, newRound);\n' + dino).length, 1);
  assert.equal(lint('L.say(`All clean! ${L.cheer()}`);\nL.afterSpeech(newRound, { minMs: 2400 });\n' + dino).length, 0);
  // A line that is not a cheer + long setT is a different leftover.
  assert.equal(lint('L.say("All clean!");\nsetT(2400, newRound);\n' + dino).length, 0);
  // A named setT whose body does not speak, or a visual arrow, is fine.
  assert.equal(lint('L.say(L.cheer());\nsetT(90, step);\nfunction step() {\n  move();\n}').length, 0);
  assert.equal(lint('L.say(L.cheer());\nsetT(700, () => pot.el.remove());').length, 0);
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
  console.log(`PASS: pacing lint — no bare timer right after a cheer, no chime right after a line, no setT(name) over a cheer, in ${files.length} games`);
}
module.exports = { check };
