# Tests

Smoke + visual baseline checks for every game and key screen.

## Run

```bash
node tests/voice.js                # speech: voice choice, mute/volume, completion promise (no browser)
node tests/story.js                # Story Time pacing on real narration end (no browser)
node tests/smoke.js                # smoke pass only (errors-free / screen renders / restart safe)
node tests/smoke.js --baseline     # smoke + diff every screen against tests/baseline/
node tests/smoke.js --update-baseline   # write fresh baseline PNGs (use after intentional visual changes)
```

Exit codes:

| Code | Meaning                                              |
|------|------------------------------------------------------|
| 0    | All smoke + visual checks pass                       |
| 1    | A game failed smoke (errors, missing key element, restart bug) |
| 2    | Visual diff against baseline detected                |
| 99   | Test runner crashed                                  |

## What it checks

`tests/voice.js` and `tests/story.js` are plain Node scripts with no
Playwright dependency. They load `lib/audio.js` / `games/story.js` into a
`vm` sandbox with a fake speech engine, DOM and clock, so they check exact
behaviour: which voice gets picked, that `say()` resolves when a line
really ends (or is interrupted, muted, or silenced), that a voice which
can't speak (an online voice offline, one that never starts) is swapped
for the best local voice and tried again when the network returns, that a screen lock or
app switch silences speech and music and that coming back wakes a paused
speech engine and an interrupted audio context, and that story pages flip
after the narration finishes — never before the word-count floor, never
after the no-`end`-event ceiling — freeze while the app is hidden, and
pick the line back up after a character poke cuts it off.

For each of the 24 games (`tests/smoke.js: GAMES`):

1. Screen opens and the expected key element (e.g. `#popArea`) is in the DOM.
2. No `pageerror` or `console.error` fires during start / first 800 ms.
3. `stop()` then `start()` leaves no errors.

The visual baseline pass screenshots every game + a few hub screens
(home menu, `moreHub`, `townHub`) and byte-compares against
`tests/baseline/`. Use `--update-baseline` after any intentional UI
change to refresh the reference.

## Requirements

Playwright + Chromium. The script reads:

- `PLAYWRIGHT_MODULE` — path to the Playwright `node_modules` (defaults to
  `/opt/node22/lib/node_modules/playwright`, which is how the dev host
  is set up). If you've installed Playwright elsewhere, point this at
  it.
- `PLAYWRIGHT_BROWSERS_PATH` — already exported on the dev host to
  `/opt/pw-browsers`.

If you don't have Playwright locally, install it once:

```bash
npm install -g playwright
npx playwright install chromium
```
