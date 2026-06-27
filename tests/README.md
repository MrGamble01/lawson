# Tests

Smoke + visual baseline checks for every game and key screen.

## Run

```bash
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
