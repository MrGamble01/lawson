# Lawson's Playground — notes for contributors (human or agent)

Plain HTML/CSS/JS toddler PWA. No framework, no build step, no runtime
dependencies. `index.html` loads `lib/*.js`, then `app.js`, then one
`games/*.js` per game; they all share one global scope. Every push to
`main` deploys to production via Vercel.

## Before you push

```bash
npm ci                          # once; installs eslint + playwright (pinned)
npx playwright install chromium # once
npm run lint                    # eslint over app.js, lib/, games/, sw.js, tests/
npm run test:unit               # pacing lint, sw assets, voice, story, stickers (no browser, ~5 s)
npm run test:smoke              # every game opens, restarts, matches its baseline (~1 min)
npm run test:nav                # hub welcome vs navigation (~10 s)
npm run test:a11y               # axe on every screen in 4 configs + behaviour checks (~8 min)
```

CI runs all of these on every PR. A PR is not done until CI is green.

## Rules that prevent the last pile-up

1. **Never edit the cache name in `sw.js`.** The worker refreshes assets on
   its own. Only touch `sw.js` to add a new file to `ASSETS`;
   `tests/sw-assets.js` checks the list against `index.html`.
2. **One concern per PR.** Don't append to the same README paragraph or
   the same lint file from twenty branches at once.
3. **New pacing-lint rules go into the existing rule set** in
   `tests/pacing-lint.js`, numbered after the last rule, with a
   `--self-test` fixture that goes red on the bug and green on the fix.
   Reuse the existing helpers; do not add another `functionBody()`.
4. **A visual change must update its baseline** with
   `node tests/smoke.js --update-baseline` in the same PR.
5. **Speech pacing**: never `setTimeout` a line after another line or a
   cheer. Use `L.afterSpeech(fn, { minMs })`. Trigger a chime *before* the
   line, not after it. Each game's `stop()` must cancel every timer and
   `afterSpeech` handle it started.
6. **Every tap target is a named button.** Use `L.onTap(el, fn)`; give
   emoji-only controls an `aria-label`; never put `aria-hidden` or
   `role="img"` on something you then make tappable.
7. **Don't leave stray whitespace in README prose.** Reviewers diff it.
8. **Keep the kid's name out of `innerHTML`.** It goes through
   `textContent` and `say()` only.

## Adding a game

See "Adding a new game" in `README.md`. In short: `games/<name>.js` IIFE
registering `window.Lawson.games.<name> = { screen, start, stop }`, a
`<section id="<name>Game" class="screen">` in `index.html`, a tile in a
hub, the script tag at the bottom of `index.html`, the path in `sw.js`
`ASSETS`, an entry in `tests/smoke.js` `GAMES`, a refreshed baseline.

## Where things are

- `app.js`: navigation, settings, tap/drag helpers, flashcards, overlays,
  the `window.Lawson` namespace.
- `lib/audio.js`: speech (`say`, `sayPrompt`, `afterSpeech`), sounds,
  music, mute/volume.
- `lib/storage.js`: high scores. `lib/achievements.js`: stickers.
  `lib/tutorial.js`: first-visit hints.
- `REPO_AUDIT.md`: the September 2026 audit with the cleanup backlog.
