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
// 3. "Line, then speech it cannot wait for" (#35–#49, one rule): any line,
//    then — in the same tick or on a fixed timer of up to 3 s — a second
//    line or a call to a function that speaks (directly or through the
//    functions it calls). A late-starting voice loses the first line.
//    Whatever the timer is spelled as (setTimeout(fn), setTimeout(name),
//    setT(ms, name), an arrow that calls a speaker, a block that does),
//    the right shape is L.afterSpeech(next, { minMs }); a call the game
//    already routes through afterSpeech, a .then() chain, a timer with a
//    computed or long delay, and a callback that only animates are fine.
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
const SPEAK_WINDOW = 24;          // lines after a line to inspect for rule 3
const MAX_DELAY_MS = 2000;        // a fixed timer this short races a short line; longer ones are pauses
const MAX_CHEER_DELAY_MS = 3000;  // a cheer (with the kid's name, slower speed) runs longer
const TIMER = /\b(?:setTimeout|setT)\s*\(/;
const AFTER_SPEECH = /L\.afterSpeech\(/;
const LISTENER = /\b(?:onTap|onTapOnce|addEventListener|tapToUse)\s*\(/;   // runs on a later user action
const ASYNC_OPEN = /\b(?:setTimeout|setT|setInterval|afterSpeech|then|onTap|onTapOnce|addEventListener|tapToUse|requestAnimationFrame)\s*\(/;
const SYNC_ITER = /\.(?:forEach|map|filter|some|every|find|findIndex|reduce|flatMap|sort)\s*\(/;   // runs its callback now
const CONTROL = /^\s*(?:\}?\s*else\b|if|for|while|switch|do|try|catch|finally)\b/;
// A line that opens a block by passing a callback or an options object to
// a call (`setupToolDrag(el, { onDrop() {`, `L.tapToUse(t, { onUse: () => {`):
// that code runs later, not now. Control flow and sync iterators do not count.
function opensCallback(l) {
  if (braceDelta(l) <= 0 || CONTROL.test(l) || SYNC_ITER.test(l) || FUNCTION_DECL.test(l)) return false;
  return ASYNC_OPEN.test(l)
    || /=>\s*\{\s*$/.test(l)                       // `foo(a, (x, y) => {`
    || /\bfunction\b[^{]*\{\s*$/.test(l)           // `foo(function () {`
    || /[(,]\s*\{\s*$/.test(l)                     // `foo(bar, {` — an options object
    || /^\s*[\w$]+\s*\([^)]*\)\s*\{\s*$/.test(l)   // `onDrop(target) {` — a method in an options object
    || /^\s*[\w$]+\s*:\s*(?:async\s*)?(?:\([^)]*\)|[\w$]+)\s*=>\s*\{\s*$/.test(l);   // `onUse: () => {`
}
// Speech (or a speaker call) that only happens under an `if` with no else
// whose condition is a caller's flag (`if (!silent)`) or a progress check
// (`if (pos >= target)`) is not what calling the function does.
function guardedOut(lines, open, k, params) {
  const guards = [];
  const own = lines[k].match(/^\s*if\s*\((.*)\)\s*[^{]*$/);
  if (own) guards.push({ cond: own[1], hasElse: /^\s*\}?\s*else\b/.test(lines[k + 1] || '') });
  let ind = indent(lines[k]);
  for (let i = k - 1; i > open; i--) {
    const l = lines[i];
    if (!l.trim() || indent(l) >= ind) continue;
    ind = indent(l);
    const m = l.match(/^\s*(?:\}\s*else\s+)?if\s*\((.*)\)\s*\{\s*$/);
    if (m) {
      // An else (or else-if) at the if's own indentation, anywhere before
      // the chain closes, means the other branch may speak instead.
      const closer = blockEnd(lines, i);
      let hasElse = /^\s*else\b/.test(lines[closer + 1] || '');
      for (let e = i + 1; e <= closer && !hasElse; e++) if (indent(lines[e]) === indent(l) && /^\s*\}?\s*else\b/.test(lines[e])) hasElse = true;
      guards.push({ cond: m[1], hasElse });
    }
  }
  return guards.some((g) => !g.hasElse && (params.some((p) => new RegExp('\\b' + p + '\\b').test(g.cond)) || /[<>]=?|\.length\s*===?\s*0/.test(g.cond)));
}
function paramNames(line) {
  const m = line.match(/\(([^)]*)\)/);
  return m ? m[1].split(',').map((x) => x.trim().replace(/=.*$/, '').replace(/^\.\.\./, '')).filter((x) => /^[A-Za-z_$][\w$]*$/.test(x)) : [];
}
const CALL_STATEMENT = /^\s*(?:return\s+|if\s*\(.*\)\s*)?([A-Za-z_$][\w$]*)\s*\(/;  // `name(...)` as a statement
const FUNCTION_DECL = /^(\s*)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^(\s*)(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{/;

function indent(l) { return l.match(/^\s*/)[0].length; }
function braceDelta(l) {
  const code = l.replace(/\/\/.*$/, '').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '');
  return (code.match(/\{/g) || []).length - (code.match(/\}/g) || []).length;
}
// Index of the line that closes the block opened on line `open`.
function blockEnd(lines, open) {
  let depth = 0;
  for (let j = open; j < lines.length; j++) {
    depth += braceDelta(lines[j]);
    if (j > open && depth <= 0) return j;
  }
  return lines.length - 1;
}
// Lines that run synchronously when the block opened at `open` runs:
// nested if/for/forEach bodies included, timer/listener/afterSpeech/then
// callbacks skipped (`timers: true` keeps timer callbacks — speech on a
// short timer still cuts a line off).
function syncLineIndexes(lines, open, opts) {
  const keepTimers = !!(opts && opts.timers);
  const out = [];
  const last = blockEnd(lines, open);
  for (let j = open + 1; j < last; j++) {
    const l = lines[j];
    if (FUNCTION_DECL.test(l) && braceDelta(l) > 0) { j = blockEnd(lines, j); continue; }   // a nested declaration runs later, if ever
    const soonTimer = TIMER.test(l) && !LISTENER.test(l) && !AFTER_SPEECH.test(l) && !SPEECH_GATED.test(l) && timerDelay(lines, j) !== null && timerDelay(lines, j) <= MAX_DELAY_MS;
    const asyncBlock = opensCallback(l) && !(keepTimers && soonTimer);
    if (asyncBlock) { j = blockEnd(lines, j); continue; }
    out.push(j);
  }
  return out;
}
function syncLines(lines, open, opts) { return syncLineIndexes(lines, open, opts).map((j) => lines[j]); }
function functionBodies(lines) {
  const bodies = new Map();
  lines.forEach((l, i) => {
    const m = l.match(FUNCTION_DECL);
    if (m && braceDelta(l) > 0) bodies.set(m[2] || m[4], i);
  });
  return bodies;
}
// Functions that speak when called: L.say()/L.sayPrompt() in their own
// synchronous body or on a timer in it, or a call to another speaker (a
// few hops). Speech inside a tap handler or an afterSpeech callback does
// not count — the first waits for the kid, the second for the line.
function speakerNames(lines) {
  const bodies = functionBodies(lines);
  const counted = (open, k) => !guardedOut(lines, open, k, paramNames(lines[open]));
  const saysItself = (open) => syncLineIndexes(lines, open, { timers: true }).some((k) => { const l = lines[k]; return SAY.test(l) && !(/=>.*L\.say/.test(l) && LISTENER.test(l)) && !AFTER_SPEECH.test(l) && !SPEECH_GATED.test(l) && counted(open, k); });
  const direct = new Set([...bodies].filter(([, open]) => saysItself(open)).map(([n]) => n));
  const speakers = new Set(direct);
  for (let hop = 0; hop < 3; hop++) {
    let grew = false;
    for (const [name, open] of bodies) {
      if (speakers.has(name)) continue;
      const calls = syncLineIndexes(lines, open, { timers: true }).some((k) => { const l = lines[k]; const m = l.match(CALL_STATEMENT); return m && speakers.has(m[1]) && !AFTER_SPEECH.test(l) && counted(open, k); });
      if (calls) { speakers.add(name); grew = true; }
    }
    if (!grew) break;
  }
  speakers.direct = direct;
  return speakers;
}
function timerDelay(lines, j) {
  const line = lines[j];
  let m = line.match(/\bsetT\s*\(\s*(\d[\d_]*)\s*,/) || line.match(/\bsetTimeout\s*\([^;]*?,\s*(\d[\d_]*)\s*\)/);
  if (!m && braceDelta(line) > 0) m = lines[blockEnd(lines, j)].match(/\}\s*,\s*(\d[\d_]*)\s*\)/);   // `}, 320);`
  return m ? Number(m[1].replace(/_/g, '')) : null;   // null: computed or missing delay
}
// The function declaration whose body contains line j, if any.
function enclosingFunction(lines, j) {
  let found = null;
  for (let i = j - 1; i >= 0; i--) {
    const m = lines[i].match(FUNCTION_DECL);
    if (m && braceDelta(lines[i]) > 0 && blockEnd(lines, i) >= j) { found = m[2] || m[4]; break; }
  }
  return found;
}
// Does the callback of the timer on line j speak? setTimeout(name, ms),
// setT(ms, name), an inline arrow, or an arrow with a block body.
function timerCallbackSpeaks(lines, j, speakers) {
  const l = lines[j];
  const inner = l.slice(l.search(TIMER));
  if (SAY.test(inner)) return true;
  const named = inner.match(/\b(?:setTimeout|setT)\s*\(\s*(?:[\d_]+\s*,\s*)?([A-Za-z_$][\w$]*)\s*[,)]/);
  if (named && speakers.has(named[1])) return true;
  const arrowCall = inner.match(/=>\s*(?:\{\s*)?(?:return\s+)?([A-Za-z_$][\w$]*)\s*\(/);
  if (arrowCall && speakers.has(arrowCall[1])) return true;
  if (braceDelta(l) > 0) {
    return syncLines(lines, j).some((b) => SAY.test(b) || (b.match(CALL_STATEMENT) && speakers.has(b.match(CALL_STATEMENT)[1])));
  }
  return false;
}
// Rule 3, from one origin line (a say(), or a call to a speaker): report
// the first later line in the same tick that speaks, and every short
// fixed timer whose callback does.
function checkFollowOn(file, lines, i, speakers, report) {
  const context = lines.slice(Math.max(0, i - CONTEXT), i + 1).join('\n');
  const maxDelay = CHEER.test(context) ? MAX_CHEER_DELAY_MS : MAX_DELAY_MS;
  const here = enclosingFunction(lines, i);
  let depth = 0;
  for (let j = i + 1; j <= Math.min(i + SPEAK_WINDOW, lines.length - 1); j++) {
    const l = lines[j];
    if (!l.trim() || /^\s*\/\//.test(l)) continue;
    if (AFTER_SPEECH.test(l) || SPEECH_GATED.test(l)) return;        // what follows waits already
    if (TIMER.test(l) && !LISTENER.test(l)) {
      const ms = timerDelay(lines, j);
      const named = l.match(/\b(?:setTimeout|setT)\s*\(\s*(?:[\d_]+\s*,\s*)?([A-Za-z_$][\w$]*)\s*[,)]/);
      const recursive = named && here && named[1] === here && !speakers.direct.has(here);   // an animation step re-arming itself
      if (ms !== null && ms <= maxDelay && !recursive && timerCallbackSpeaks(lines, j, speakers)) {
        report(j, `${file}:${j + 1}: timer of ${ms} ms after the line on ${i + 1} speaks over it — L.afterSpeech(fn, { minMs: ${ms} })\n    ${l.trim()}`);
      }
      if (braceDelta(l) > 0) { j = blockEnd(lines, j); continue; }
      continue;
    }
    if (opensCallback(l)) { j = blockEnd(lines, j); continue; }   // a later callback, not this tick
    if (FUNCTION_DECL.test(l) && braceDelta(l) > 0) { j = blockEnd(lines, j); continue; }  // a declaration, not a call
    if (depth === 0 && /^\s*\}?\s*else\b/.test(l)) return;             // the other branch
    if (SAY.test(l) && !/=>.*L\.say/.test(l)) {
      report(j, `${file}:${j + 1}: second say() in the same tick as the line on ${i + 1} cuts it off — L.afterSpeech(() => L.say(...), { minMs })\n    ${l.trim()}`);
      return;
    }
    const call = l.match(CALL_STATEMENT);
    if (call && speakers.has(call[1])) {
      report(j, `${file}:${j + 1}: ${call[1]}() speaks in the same tick as the line on ${i + 1} — L.afterSpeech(${call[1]}, { minMs })\n    ${l.trim()}`);
      return;
    }
    depth += braceDelta(l);
    if (depth < 0) return;                                            // left the block the line was in
  }
}

function check(file, lines) {
  const problems = [];
  const speakers = speakerNames(lines);
  const flagged = new Set();
  const report = (j, msg) => { if (!flagged.has(j)) { flagged.add(j); problems.push(msg); } };
  lines.forEach((line, i) => {
    // Rule 3 also starts from a helper that speaks (Sticker Scene's build()).
    const helper = !SAY.test(line) && !TIMER.test(line) && line.match(CALL_STATEMENT);
    if (helper && speakers.has(helper[1])) checkFollowOn(file, lines, i, speakers, report);
    if (!SAY.test(line)) return;
    if (!/=>.*L\.say/.test(line)) checkFollowOn(file, lines, i, speakers, report);
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
        report(j, `${file}:${j + 1}: bare setTimeout after the cheer/try-again on line ${i + 1} — use L.afterSpeech(fn, { minMs })\n    ${l.trim()}`);
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
  // (the second say() is itself a rule-3 problem now: two lines in one tick)
  assert.equal(lint('L.say("One");\nL.say("Two");\nL.beep(400);').length, 2);
  // Rule 3: a line, then speech it cannot wait for — every spelling.
  assert.equal(lint('L.say("Flip!");\nsetT(450, () => sp.classList.remove("x"));\nsetT(780, () => {\n  L.say("Yummy!");\n});').length, 1);
  assert.equal(lint('L.say("cow");\nsetTimeout(speakTarget, 700);\nfunction speakTarget() {\n  L.sayPrompt("Find!");\n}').length, 1);
  assert.equal(lint('L.say("Mmm");\nsetT(450, eatBite);\nfunction eatBite() {\n  L.say("Mmm!");\n}').length, 1);
  assert.equal(lint('L.say("5");\nsetTimeout(() => winPuzzle(), 450);\nfunction winPuzzle() {\n  L.say("House!");\n}').length, 1);
  assert.equal(lint('L.say("bee");\nif (match) {\n  setTimeout(() => {\n    a.classList.add("m");\n    winRound();\n  }, 320);\n}\nfunction winRound() {\n  setTimeout(() => L.say("All!"), 350);\n}').length, 1);
  assert.equal(lint('L.say("Sunshine!");\nsetT(900, () => sun.classList.remove("s"));\nif (taps % 5 === 0) {\n  L.say("Power!");\n}').length, 1);
  assert.equal(lint('L.say("Station 1!");\nif (best) {\n  celebrated = true;\n}\nboardOrLeave();\nfunction boardOrLeave() {\n  L.say("Woof!");\n}').length, 1);
  assert.equal(lint('L.say(L.cheer());\nfor (let i = 0; i < 8; i++) {\n  setT(i * 90, () => heart());\n}\nsetT(2400, newRound);\nfunction newRound() {\n  enterPhase();\n}\nfunction enterPhase() {\n  L.say("Wash!");\n}').length, 1);
  assert.equal(lint('build();\nif (restored) L.say("Here!");\nfunction build() {\n  L.say("The park!");\n}').length, 1);
  // The right shapes, and things that are not the same tick.
  assert.equal(lint('L.say("a");\ncancelNext = L.afterSpeech(next, { minMs: 400 });\nfunction next() {\n  L.say("b");\n}').length, 0);
  assert.equal(lint('L.say("a");\nsetT(120 + i * 80, () => grow());\nfunction grow() {\n  L.say("g");\n}').length, 0);
  assert.equal(lint('L.say("a");\nsetT(8000, next);\nfunction next() {\n  L.say("b");\n}').length, 0);
  assert.equal(lint('L.onTap(el, () => L.sayPrompt("x"));\nL.sayPrompt("y");').length, 0);
  assert.equal(lint('L.say("a");\nwire();\nfunction wire() {\n  L.onTap(el, () => {\n    L.say("tap");\n  });\n}').length, 0);
  assert.equal(lint('L.say("a");\nwaits();\nfunction waits() {\n  L.afterSpeech(() => {\n    L.say("later");\n  }, { minMs: 300 });\n}').length, 0);
  assert.equal(lint('if (a) {\n  L.say("x");\n} else {\n  L.say("y");\n}').length, 0);
  assert.equal(lint('L.say("x");\nif (n === 1) {\n  bowl.style.background = c;\n} else {\n  busy = true;\n}\nL.haptic(6);').length, 0);
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
  console.log(`PASS: pacing lint — no bare timer after a cheer, no chime right after a line, no timer or same-tick line speaking over a line, in ${files.length} games`);
}
module.exports = { check, speakerNames };
