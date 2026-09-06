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
// 3. "Helper speaks, then a line" (Sticker Scene): build() names the
//    picture and start() greets in the same tick, so the name is cut off.
//    A same-file helper whose own body speaks (or calls applyScene()
//    without silent) must not be followed by L.say in the same handler.
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
  // Rule 3: a helper that already spoke, then another line in the same handler.
  const fns = functionBodies(lines);
  const speaks = new Map();
  for (const [name, body] of fns) speaks.set(name, functionSpeaks(body, fns));
  lines.forEach((line, i) => {
    if (/^\s*function\s/.test(line)) return;      // the definition, not a call
    const call = line.match(/\b([A-Za-z_]\w*)\s*\(/);
    if (!call) return;
    const name = call[1];
    if (!speaks.get(name)) return;
    if (SILENT_APPLY.test(line)) return;          // applyScene(true) is quiet
    if (SPEECH_GATED.test(line) || /afterSpeech\(/.test(line)) return;
    for (let j = i + 1; j <= Math.min(i + WINDOW, lines.length - 1); j++) {
      const l = lines[j];
      if (BRANCH_END.test(l) && /^\s*\}/.test(l)) break;
      if (SPEECH_GATED.test(l) || /afterSpeech\(/.test(l)) break;
      if (/setTimeout\(|setT\(/.test(l)) break;   // a timer leftover, not this one
      if (SAY.test(l)) {
        problems.push(`${file}:${j + 1}: ${name}() already speaks; the line on ${j + 1} cuts it off — wait with L.afterSpeech or silence the helper\n    ${l.trim()}`);
        break;
      }
    }
  });
  return problems;
}

const SILENT_APPLY = /applyScene\(\s*true\s*\)/;
const CALLBACK = /(?:onTap(?:Once)?|forEach|setTimeout|setT|addEventListener)\s*\(|=>/;

function functionBodies(lines) {
  const fns = new Map();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*function\s+([A-Za-z_]\w*)\s*\(/);
    if (!m) continue;
    let depth = 0, started = false, end = i;
    for (let j = i; j < lines.length; j++) {
      const open = (lines[j].match(/\{/g) || []).length;
      const close = (lines[j].match(/\}/g) || []).length;
      depth += open - close;
      if (open) started = true;
      if (started && depth <= 0) { end = j; break; }
    }
    fns.set(m[1], lines.slice(i, end + 1));
  }
  return fns;
}

// A function "speaks" when its own body (not an onTap / timer callback)
// calls L.say, or calls applyScene() without the silent flag. One hop
// through a same-file helper is enough (build → applyScene).
function functionSpeaks(body, fns, seen) {
  seen = seen || new Set();
  const name = (body[0].match(/function\s+([A-Za-z_]\w*)/) || [])[1];
  if (!name || seen.has(name)) return false;
  seen.add(name);
  let skipDepth = 0;
  for (const l of body.slice(1)) {
    const open = (l.match(/\{/g) || []).length;
    const close = (l.match(/\}/g) || []).length;
    if (skipDepth > 0) {
      skipDepth += open - close;
      continue;
    }
    if (CALLBACK.test(l)) {
      skipDepth = Math.max(0, open - close);
      continue;
    }
    if (SAY.test(l)) return true;
    if (SILENT_APPLY.test(l)) continue;           // applyScene(true) is quiet
    if (/\bapplyScene\s*\(/.test(l)) return true;
    const hop = l.match(/^\s*([A-Za-z_]\w*)\s*\(/);
    if (hop && fns.has(hop[1]) && hop[1] !== name && functionSpeaks(fns.get(hop[1]), fns, seen)) return true;
  }
  return false;
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
  // Rule 3: a speaking helper then a line in the same handler.
  assert.equal(lint('function applyScene() {\n  L.say("The park!");\n}\nfunction start() {\n  applyScene();\n  L.say("Drag stickers onto the picture!");\n}').length, 1);
  assert.equal(lint('function applyScene(silent) {\n  if (!silent) L.say("The park!");\n}\nfunction build() {\n  applyScene();\n}\nfunction start() {\n  build();\n  L.say("Drag stickers onto the picture!");\n}').length, 1);
  assert.match(lint('function applyScene() {\n  L.say("The park!");\n}\nfunction start() {\n  applyScene();\n  L.say("Hi");\n}')[0], /already speaks/);
  // Silencing the helper, or waiting, is the right shape.
  assert.equal(lint('function applyScene(silent) {\n  if (!silent) L.say("The park!");\n}\nfunction build() {\n  applyScene(true);\n}\nfunction start() {\n  build();\n  L.say("The park!");\n}').length, 0);
  assert.equal(lint('function applyScene() {\n  L.say("The park!");\n}\nfunction start() {\n  applyScene();\n  L.afterSpeech(() => L.say("Hi"), { minMs: 400 });\n}').length, 0);
  // A say that only lives in an onTap is not the helper speaking.
  assert.equal(lint('function build() {\n  L.onTap(el, () => L.say("Woof!"));\n}\nfunction start() {\n  build();\n  L.say("Welcome!");\n}').length, 0);
  // Say then a named speaker is a different leftover (Train's boardOrLeave).
  assert.equal(lint('function boardOrLeave() {\n  L.say("Woof!");\n}\nfunction arrive() {\n  L.say("Station 2!");\n  boardOrLeave();\n}').length, 0);
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
  console.log(`PASS: pacing lint — no bare timer right after a cheer, no chime right after a line, no helper-then-line in the same tick, in ${files.length} games`);
}
module.exports = { check };
