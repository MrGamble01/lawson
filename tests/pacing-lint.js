// Static regression check for the "cheer, then a fixed timer" bug that #18
// and its follow-ons fixed game by game: a game speaks a cheer (or a "try
// again"), then starts the next round on a bare setTimeout whose prompt
// cuts the line off. The right shape is L.afterSpeech(next, { minMs }).
// Run: node tests/pacing-lint.js
const fs = require('node:fs');
const path = require('node:path');
const dir = process.env.GAMES_DIR || path.join(__dirname, '../games');
const WINDOW = 8;                 // lines after the say() to inspect
const CONTEXT = 3;                // lines before it where `L.cheer()` may sit in a variable
const SAY = /L\.say\(/;
const CHEER = /cheer\(\)/;
const TRY_AGAIN = /[Tt]ry again/;
const VISUAL_ONLY = /sparkleAt|classList|confetti/;
const SPEECH_GATED = /\.then\(/;  // a timer inside a .then() chain waits for speech already
const problems = [];
for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) {
  const lines = fs.readFileSync(path.join(dir, file), 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (!SAY.test(line)) return;
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
}
if (problems.length) {
  console.error('FAIL: fixed timers after speech:\n' + problems.join('\n'));
  process.exit(1);
}
console.log(`PASS: pacing lint — no bare timer right after a cheer in ${fs.readdirSync(dir).filter(f => f.endsWith('.js')).length} games`);
