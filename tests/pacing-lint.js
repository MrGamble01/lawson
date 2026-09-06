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
// 3. "Short line, then a block that calls a speaker" (Memory): a game
//    says a short name ("bee") and then setTimeout(() => { ... winRound();
//    }, 320) whose named function speaks the next line. Distinct from an
//    inline say() in the callback, setTimeout(name, ms), and
//    setTimeout(() => name(...), ms). afterSpeech, same as rule 1. Not
//    reported: a block that only touches visuals, one whose function
//    does not speak, or one that hands the speaker to afterSpeech.
//
// Run: node tests/pacing-lint.js            (checks every game)
//      node tests/pacing-lint.js --self-test (checks the checker on fixtures)
const fs = require('node:fs');
const path = require('node:path');
const WINDOW = 8;                 // lines after the say() to inspect for a bare timer
const BLOCK_WINDOW = 16;          // lines after the say() to inspect for () => { speaker() }
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
const SHORT_MS = 2000;
const BLOCK_TIMER = /setTimeout\(\s*\(\)\s*=>\s*\{|setT\(\s*(\d{1,4})\s*,\s*\(\)\s*=>\s*\{/;
const SKIP_CALL = /^(if|for|while|switch|return|typeof|void|new|setTimeout|setT|clearTimeout|clearInterval|clearNext|Math|parseInt|parseFloat|Number|String|Boolean|Date|document|window|console|L|URL|Object|Array|JSON|Promise|requestAnimationFrame)$/;
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

function extractBlock(lines, startIdx) {
  let depth = 0;
  let started = false;
  const body = [];
  let endIdx = startIdx;
  for (let i = startIdx; i < lines.length; i++) {
    const l = lines[i];
    depth += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
    if ((l.match(/\{/g) || []).length) started = true;
    if (started) body.push(l);
    endIdx = i;
    if (started && depth <= 0) break;
  }
  return { body: body.join('\n'), endLine: lines[endIdx], endIdx };
}

function blockMs(startLine, endLine) {
  const setT = startLine.match(/setT\(\s*(\d{1,4})\s*,/);
  if (setT) return Number(setT[1]);
  const setTo = endLine.match(/\}(?:\s*\)\s*)?,\s*(\d{1,4})\s*\)/);
  return setTo ? Number(setTo[1]) : NaN;
}

function namedSpeakersIn(block, lines) {
  const names = [];
  for (const line of block.split('\n')) {
    if (/afterSpeech\(/.test(line)) continue;
    NAMED_CALL.lastIndex = 0;
    let m;
    while ((m = NAMED_CALL.exec(line))) {
      const name = m[1];
      if (SKIP_CALL.test(name)) continue;
      const body = functionBody(lines, name);
      if (body && SPEAKS.test(body)) names.push(name);
    }
  }
  return names;
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
    // Rule 3: a block timer that calls a named function whose body speaks.
    let depth = 0;
    for (let j = i + 1; j <= Math.min(i + BLOCK_WINDOW, lines.length - 1); j++) {
      const l = lines[j];
      depth += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
      if (depth < 0) break;                            // left the line's block
      if (SAY.test(l) || SPEECH_GATED.test(l)) break;
      if (!BLOCK_TIMER.test(l)) continue;
      const { body, endLine } = extractBlock(lines, j);
      const ms = blockMs(l, endLine);
      if (!(ms <= SHORT_MS)) continue;
      const speakers = namedSpeakersIn(body, lines);
      if (!speakers.length) continue;
      problems.push(`${file}:${j + 1}: block timer ${speakers[0]}() after the line on ${i + 1} speaks over it — use L.afterSpeech(${speakers[0]}, { minMs })\n    ${l.trim()}`);
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
  // Rule 3: a block that calls a named speaker is the leftover short-line shape.
  const winFn = 'function winRound() {\n  L.say("You matched them all!");\n}\n';
  assert.equal(lint('L.say("bee");\nsetTimeout(() => {\n  el.classList.add("matched");\n  winRound();\n}, 320);\n' + winFn).length, 1);
  assert.match(lint('L.say("bee");\nsetTimeout(() => {\n  el.classList.add("matched");\n  winRound();\n}, 320);\n' + winFn)[0], /block timer winRound/);
  assert.equal(lint('L.say("bee");\nsetTimeout(() => {\n  el.classList.add("matched");\n  L.afterSpeech(winRound, { minMs: 350 });\n}, 320);\n' + winFn).length, 0);
  // A few lines down (firstPick check, then the last-pair branch) still counts.
  assert.equal(lint('L.say("bee");\nif (!first) return;\nif (done) {\n  setTimeout(() => {\n    winRound();\n  }, 320);\n}\n' + winFn).length, 1);
  // A block whose function does not speak (a visual cleanup) is fine.
  assert.equal(lint('L.say("bee");\nsetTimeout(() => {\n  hideHint();\n}, 320);\nfunction hideHint() {\n  el.classList.remove("hint");\n}').length, 0);
  // A long or computed wait is not speaking over the line.
  assert.equal(lint('L.say("bee");\nsetTimeout(() => {\n  winRound();\n}, 2800);\n' + winFn).length, 0);
  assert.equal(lint('L.say("Apple!");\nsetT(APPLE_RESPAWN_MS, () => {\n  spawnApple();\n});\nfunction spawnApple() {\n  L.say("Apple!");\n}').length, 0);
  // An inline say() in the callback, setTimeout(name, ms), or an arrow
  // that calls a named speaker, is a different shape — leave those for
  // their own follow-ons.
  assert.equal(lint('L.say("Flip!");\nsetT(780, () => {\n  L.say("Yummy!");\n});').length, 0);
  assert.equal(lint('L.say("cow");\nsetTimeout(speakTarget, 700);\nfunction speakTarget() {\n  L.say("Find the duck!");\n}').length, 0);
  assert.equal(lint('L.say("5");\nsetTimeout(() => winPuzzle(p, svg), 450);\nfunction winPuzzle() {\n  L.say("It\'s a house!");\n}').length, 0);
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
  console.log(`PASS: pacing lint — no bare timer right after a cheer, no chime right after a line, no block follow-on over a short line, in ${files.length} games`);
}
module.exports = { check };
