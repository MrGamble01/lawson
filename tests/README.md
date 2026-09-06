# Tests

Smoke, visual baseline and accessibility checks for every game and key screen.

## Run

```bash
node tests/voice.js                # speech: voice choice, mute/volume, completion promise, caption event (no browser)
node tests/story.js                # Story Time pacing on real narration end (no browser)
node tests/smoke.js                # smoke pass only (errors-free / screen renders / restart safe)
node tests/smoke.js --baseline     # smoke + diff every screen against tests/baseline/
node tests/smoke.js --update-baseline   # write fresh baseline PNGs (use after intentional visual changes)
node tests/a11y.js                 # accessibility: axe-core on every screen + keyboard / modal / captions behaviour
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
really ends (or is interrupted, muted, or silenced), that a screen lock or
app switch silences speech and music and that coming back wakes a paused
speech engine and an interrupted audio context, and that story pages flip
after the narration finishes — never before the word-count floor, never
after the no-`end`-event ceiling — and freeze while the app is hidden.

For each of the 24 games (`tests/smoke.js: GAMES`):

1. Screen opens and the expected key element (e.g. `#popArea`) is in the DOM.
2. No `pageerror` or `console.error` fires during start / first 800 ms.
3. `stop()` then `start()` leaves no errors.

The visual baseline pass screenshots every game + a few hub screens
(home menu, `moreHub`, `townHub`) and byte-compares against
`tests/baseline/`. Use `--update-baseline` after any intentional UI
change to refresh the reference.

## Accessibility (`tests/a11y.js`)

Visits every hub, the open Settings dialog, a flashcard activity and every
registered game (read from `window.Lawson.games`, so new games are picked
up automatically) and, on each:

1. Runs [axe-core](https://github.com/dequelabs/axe-core) (vendored in
   `tests/vendor/axe-core`, no install needed) with the WCAG 2.0/2.1 A + AA
   and best-practice rule sets. Any violation fails. The one rule switched
   off is `meta-viewport` — pinch-zoom is intentionally disabled for
   toddlers; the reason is printed with the results.
2. Checks what axe can't: the active screen is a labelled, focusable region
   and keyboard focus is inside it; every visible button has a *readable*
   name (letters or digits, not only an emoji); nothing focusable is inside
   an `aria-hidden` subtree.

Then it drives the app by keyboard only: Enter on a tile opens the game
and focus follows; Tab lands on Home; Enter returns to the menu with focus
back on the originating tile. The Settings modal must flip `aria-hidden`,
make the page behind it `inert`, trap Tab, close on Escape and return
focus to the gear. Captions must mirror `say()` (even muted), be drawn
when the setting is on and stay in the accessibility tree when it is off.
Mode tabs must track `aria-pressed`, score badges must be named by their
value and react to Enter, and particle effects must be skipped under
`prefers-reduced-motion`.

Exit code 1 lists every failing screen/check; 99 means the runner crashed.

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
