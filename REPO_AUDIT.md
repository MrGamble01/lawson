# Repository audit: Lawson's Playground

Audited at `main` = `83bcd97` on 2026-09-08, in a fresh clone. Every claim below was
checked by running it in this container unless marked **unverified**.

## Verdict

This is a working, well-tested, zero-dependency PWA. A fresh clone runs by opening
`index.html`; every one of the six test scripts passes on `main` (smoke 24/24, visual
27/27 identical to baseline, axe-core 140/140 screen passes, plus four pure-Node suites).
The codebase is not the problem. The problem is process: 21 open draft PRs, each a
self-contained fix that hand-bumps the same service-worker cache line and appends to the
same README paragraphs, so every one of the 210 PR pairs conflicts and nothing can land
without a rebase round per PR. The biggest technical risk is the same line: the service
worker is cache-first for `index.html` and every asset, so a deploy that forgets to bump
`CACHE` is invisible to every installed iPad until someone remembers. Secondary risks are
the absence of CI (nothing runs the tests but a human), no linter, and 7 MB of screenshot
baselines that are re-committed on any visual change.

## 1. What this is and how it runs

- **Product**: a toddler learning playground for iPad and phones. 24 games, a settings
  panel, a speech "storyteller", sticker collection, and an offline PWA shell.
- **Stack**: plain HTML + CSS + JavaScript. No framework, no bundler, no `package.json`,
  no runtime dependency at all. Scripts are classic `<script>` tags sharing one global
  scope; `lib/*.js` and `app.js` define top-level functions that `games/*.js` call
  directly (`say`, `beep`, `afterSpeech`, `onTap`, ...). Each game is an IIFE that
  registers `window.Lawson.games.<name> = { screen, start, stop }`.
- **Entry point**: `index.html` (813 lines: every screen's markup) loads
  `lib/audio.js`, `lib/storage.js`, `lib/achievements.js`, `lib/tutorial.js`, then
  `app.js` (1,676 lines: navigation, settings, tap/drag helpers, flashcards, overlays,
  SW registration), then the 24 game scripts. `styles.css` is 5,143 lines. `sw.js`
  precaches 34 files under a hand-named cache key. `manifest.json` + `icon.svg` make it
  installable.
- **Hosting**: a Vercel GitHub integration deploys every push (the audit PR got a
  preview deployment within a minute of opening). So a push to `main` is a production
  deploy, and the service-worker cache-name hazard in section 4 applies to every merge.
- **Run it**: open `index.html` directly, or serve the folder (`python3 -m http.server`)
  for service-worker / add-to-home-screen. Verified: served with `http-server`, every
  path in the SW `ASSETS` list returns 200.
- **Dead or vestigial**: nothing at file level. Every file in the tree is referenced from
  `index.html` or `sw.js`, and the only file not in the SW asset list is `sw.js` itself
  (correct). In-code dead code is covered in section 4.
- **History**: 40 commits on `main` since 2026-04-11, 33 merged PRs. Authorship is
  91 commits "Claude", 21 "Cursor Agent", 35 by the repo owner: this is an
  agent-driven repo, and the review process should assume that.

## 2. Does it work?

Yes. All results from this container (Node 22.22.2, Playwright 1.56.1 from
`/opt/node22`, Chromium from `/opt/pw-browsers`, which is exactly the setup
`tests/README.md` assumes).

| Check | Command | Result |
|---|---|---|
| Install / build | none exists | n/a: there is nothing to install or build |
| Pacing lint (static) | `node tests/pacing-lint.js` | PASS, 24 games |
| Pacing lint self-test | `node tests/pacing-lint.js --self-test` | PASS |
| Speech engine (pure Node, vm sandbox) | `node tests/voice.js` | PASS, 22 named sections |
| Story pacing (pure Node) | `node tests/story.js` | PASS |
| Sticker announcements (pure Node) | `node tests/stickers.js` | PASS |
| Smoke + visual baseline (Playwright) | `node tests/smoke.js --baseline` | 24/24 games, 27/27 screens byte-identical |
| Accessibility (axe-core 4.10.3, 4 viewports) | `node tests/a11y.js` | 140/140 screen passes, all behaviour checks pass |
| Hub speech vs navigation (Playwright) | `node tests/nav-speech.js` | all pass |
| Serve + fetch every SW asset | `http-server` + curl | all 200 |

Skipped, flaky or trivially passing tests: none observed. Each pure-Node suite asserts
concrete behaviour against a fake speech engine and clock; the smoke suite checks for page
errors and restart safety; the visual pass is a byte compare. The suites are slow (a11y is
roughly 8 minutes) but deterministic in two runs here.

**Linter / formatter / type-checker: none configured. That is a finding.** There is no
`package.json`, no ESLint config, no Prettier, no `jsconfig`/`tsconfig`, no
`.editorconfig`. An ad-hoc ESLint 10 run over `app.js`, `lib/`, `games/`, `sw.js` with a
browser-globals config found no genuine undefined identifiers: all 152 `no-undef` hits are
the cross-file script-scope globals described above (`say`, `beep`, `haptic`, ...), plus
`Option`, which is a browser built-in. So the code is clean, but nothing enforces it.

**What blocks a fresh clone**: nothing for the app itself. For the tests, Playwright and
Chromium must already be installed globally; `tests/README.md` documents the
`PLAYWRIGHT_MODULE` / `PLAYWRIGHT_BROWSERS_PATH` variables and the install command. There
is no `package.json` to pin the Playwright version, so a contributor on a different
version may see visual-baseline diffs from font rendering. Unverified here: whether the
committed baselines match on macOS Chromium.

**No CI.** The repository has zero GitHub Actions workflows. Every PR's "Validation" table
is a hand-pasted claim by the agent that wrote it.

## Findings table

| # | Issue | Severity | Effort | File(s) |
|---|---|---|---|---|
| F1 | Service worker cache name is hand-bumped in every PR; all 210 open-PR pairs conflict on it, and a forgotten bump makes a deploy invisible to installed devices | critical | S | `sw.js:2` |
| F2 | No CI: none of the 7 test suites run automatically; PR validation tables are unverifiable | high | S | `.github/workflows/` (absent) |
| F3 | 13 open PRs each add a different "Rule 3" to the pacing lint at the same line with duplicate helpers | high | M | `tests/pacing-lint.js` |
| F4 | PR #53 introduces a WCAG 2.2 target-size failure on the phone viewport (sun under score badge) | high | S | `styles.css:3151-3156`, `games/farm.js` |
| F5 | PRs #47 and #48 share one cancel handle between "next round" and "re-ask", so a stray tap or "Hear it again" during the cheer kills the next round | high | S | `games/howmany.js:117`, `games/pattern.js:111`, `games/listen.js:107,131` |
| F6 | PR #43 cancels the Garden growth bonus on every fast sun tap | medium | S | `games/garden.js:532` |
| F7 | PRs #52 and #53 make clouds focusable buttons that are off-screen under reduced motion | medium | S | `styles.css:2567-2569`, farm cloud CSS |
| F8 | `addAll` failure is swallowed; one 404 silently strands every installed device on the old build; nothing checks ASSETS against `index.html` | medium | S | `sw.js:41-46`, `app.js:1674` |
| F9 | "New best!" celebration is an untracked timer in 15 games and fires on the menu after Home | medium | M | 15 `games/*.js` |
| F10 | Untracked speech timers survive `stop()` and can speak on the menu; Find and Listen also re-arm the 12 s repeat | medium | S | `games/dots.js:188`, `find.js:231`, `listen.js:101`, `mix.js:67` |
| F11 | No linter, formatter or editorconfig; cross-file globals mean a typo is a runtime error | medium | S | repo root |
| F12 | Playwright version is not pinned anywhere; baselines depend on it | medium | S | `package.json` (absent), `tests/README.md` |
| F13 | Whack! ABC/123 mode is ~80 lines of unreachable code plus CSS; PR #44 edits it | medium | S | `games/whack.js`, `styles.css:1280-1286` |
| F14 | "New best!" record logic copy-pasted 18 times while `tryNewHighScore` sits unused | medium | M | 18 `games/*.js`, `lib/storage.js:35` |
| F15 | PR #34's How Many? focus assertion passes without the feature | medium | S | `tests/a11y.js:817-825` |
| F16 | `apple-touch-icon` is an SVG, which iOS ignores (unverified on device) | medium | S | `index.html:20`, `icon.svg` |
| F17 | 11 merged or abandoned branches; `main` unprotected | low | S | remote branches |
| F18 | "Sounds like" name is used unescaped as a `replace` replacement string | low | S | `lib/audio.js:44` |
| F19 | SW offline fallback returns `undefined` | low | S | `sw.js:73` |
| F20 | Corrupt stored volume silently mutes the app | low | S | `lib/audio.js:511,548` |
| F21 | Duplicate helpers: timer block x8, cancel handle x9, phonetic tables x5, drag x8, sky/rain/sun x3, song sequencer x2 | low | L | `games/*.js`, `app.js` |
| F22 | `app.js` bundles flashcards, settings, menu ambience and tool logic (1,676 lines) | low | L | `app.js` |
| F23 | Keyboard fallback missing for Ice Cream toppings and Sticker Scene stickers | low | S | `games/icecream.js:288-324`, `games/scene.js:241-274` |
| F24 | Visual baselines are 7.2 MB, 12.9 MB in history, compared by size tolerance not pixels | low | M | `tests/baseline/`, `tests/smoke.js:77` |
| F25 | No root `.gitignore`, no CONTRIBUTING/CLAUDE.md, no LICENSE | low | S | repo root |
| F26 | Vendored axe-core three minors behind (4.10.3 vs 4.13.0) | low | S | `tests/vendor/axe-core` |

## 3. Open pull requests

21 open PRs (#34 to #54), all authored by the repo owner via Claude or Cursor agents
between 2026-09-06 21:44 and 2026-09-07 21:15. All are drafts except #34. There is no
CI, so **CI status is "none" for every PR**; every "Validation" table in a PR body is a
hand-pasted claim. Each PR was checked out in a worktree and its suites were re-run here.

**Merge cleanliness.** Every PR merges cleanly against `main` on its own. Every one of
the 210 PR pairs conflicts with each other, verified with `git merge-tree`:

| Conflict file | Pairs affected | Nature |
|---|---|---|
| `sw.js` line 2 | 210 of 210 | each PR renames `CACHE` to a different `lawson-v61-*` string |
| `README.md` | ~150 | same paragraph appended in each; #42, #43, #47, #49 also add stray double/triple spaces |
| `tests/README.md` | ~120 | same run-command block |
| `tests/pacing-lint.js` | 78 | #35, #37, #38, #39, #40, #42, #43, #44, #45, #46, #47, #48, #49 each add their own "Rule 3" at the same line with near-duplicate helpers (`functionBody` / `extractBlock` / `functionSpeaks`) |
| `tests/a11y.js` | 1 (#34 x #36) | both append a section to `main()` |
| `games/story.js`, `index.html` | 1 (#36 x #41) | both touch the story tap handler and hint text |

All of these are mechanical to resolve. Only the last two involve real code.

**Test quality across the batch.** Every new test file was sabotaged (game change
reverted, test kept) and went red, with one exception noted under #34. The new
pure-Node game tests (`tests/{pop,whack,train,scene,howmany,pattern,listen,memory,dino,
garden,piano,music,match,doodle}.js`) all hand-copy a re-implementation of `afterSpeech`
from `lib/audio.js` into a vm sandbox, so they test each game against a copy of the
contract; only `tests/voice.js` tests the real one. The `*-sky.js` tests (#52, #53, #54)
are regex scans of source text and cannot see layout.

### Per-PR verdicts

| PR | Title (short) | Verdict | Key finding |
|---|---|---|---|
| #34 | Keep keyboard focus inside a game when it rebuilds | **merge after small fixes** | a11y 140/140 on branch. [test-gap] `tests/a11y.js:817-825`: the How Many? assertion waits 1700 ms but `howmany.js:106` floors the round at 1800 ms, so it passes without the feature (verified by reverting `app.js`: Match and Pop fail, How Many? stays green). Wait 2000 ms and assert the old button is gone. |
| #35 | Short lines heard before the next line (Cook/Count/Farm) | **merge as-is** | Lint goes red on main at `cook.js:185`, `count.js:85`, `farm.js:602`. [bug, low] `cook.js:191-198`: `plate()` does not `clearNext()`, so tapping the cooked pancake inside the sub-second window gets "Yummy!" cut by "1 pancake!". |
| #36 | Dots, Coloring, Story Time by keyboard | **merge as-is** | a11y 140/140; 60 new Coloring SVG buttons pass the 24 px rule. Nits: `tests/a11y.js:819` uses `$eval` so a missing `#storyNext` crashes the runner (exit 99) instead of failing; the Next button's accessible name is still "Tap anywhere to keep going". Conflicts with #34 in `tests/a11y.js` and with #41 in `story.js`. |
| #37 | Find It! / Color Mix: short name before next line | **merge as-is** | Lint red on main at `find.js:231`, `mix.js:102`. Fixes two of the untracked speech timers found in section 4. Nit: `mix.js:105` now also kills an unfired "Make X!" prompt. |
| #38 | Connect-the-dots: last number before reveal | **merge as-is** | Lint red on main at `dots.js:171`. Nit: `dots.js:94,99-100` `advanceTimer` becomes dead state. Auto-merges with #36's `dots.js` edits. |
| #39 | Ice Cream: each "Mmm!" before the next bite | **merge as-is** | Lint red on main. Unannounced fix: `icecream.js:389` now ignores stacked Eat taps (was a bug). |
| #40 | Memory: last card name before the win line | **merge after small fixes** | `tests/memory.js` real. `memory.js:83-99` 320 ms flip timer still untracked by `stop()`; heaviest of the duplicate lint rules (~60 lines). |
| #41 | Story Time: tap the words to hear the line again | **merge as-is** | `tests/story.js` cases 18-21 real. Only `sw.js` conflicts, plus `story.js` with #36. Nit: `.story-bubble` is a `div` acting as a control with no keyboard path. |
| #42 | Baby Dino: "All clean!" before next wash | **merge after small fixes** | `tests/dino.js` real. README gains a triple space at line 99. |
| #43 | Garden: "Sunshine!" before "Sunshine power!" | **needs rework** | [bug, medium] `garden.js:532` `clearPower()` on every sun tap cancels the whole easter egg including the `growPot` bonus, so a toddler tapping faster than one tap per line never gets the growth main gave them. `tests/garden.js:246-253` enshrines the regression. Defer only the line, not the bonus. README stray double space at line 107. |
| #44 | Pop! / Whack! ABC: letter before next goal | **merge as-is** | Both new tests red on revert. Nit: a wrong pop during the wait doubles the goal line (`pop.js:227-236`, `whack.js:129-131`). Note: Whack's ABC/123 mode is dead code on main (section 4), so the Whack half of this PR changes unreachable code. |
| #45 | Train: "Station 2!" before passenger | **merge after small fixes** | Game change correct. `tests/pacing-lint.js:33` new rule keys on `boardOrLeave(`, a name this PR deletes, so the rule can never fire after merge. Drop or re-key it. |
| #46 | Sticker Scene: "The park!" before welcome | **merge after small fixes** | Game code right. [scope-creep] `tests/pacing-lint.js:58-133` adds ~75 lines of brace-counting static analysis with a hard-coded `applyScene(true)` special case to guard one call site; trim it, `tests/scene.js` already covers the regression. Behaviour change: a restored picture no longer names the scene. |
| #47 | How Many? / Pattern: nag before leftover prompt | **needs rework** | [bug, medium] `howmany.js:117` and `pattern.js:111` call the shared `clearNext()` in the wrong-tap branch, which cancels the pending `newRound` from a correct tap. Verified: correct tap, then a stray tap 300 ms later, and no new round is built; the kid is re-asked an answered question. Use a separate cancel handle or an `answered` guard. |
| #48 | Listen: leftover clue before asking again | **needs rework** | [bug, medium] Same shared-`cancelNext` regression at `listen.js:107` and `:131`. "Hear it again" during the cheer kills the next round. Verified. |
| #49 | Piano / Music Studio: song name before first note | **merge after small fixes** | Both new tests red on revert. README double space at line 110. Nit: the first-ever Song tap's sticker announcement can still be clipped by the 3 s ceiling. |
| #50 | Match: hear the prompt again from the example | **merge as-is** | Verified in Playwright: `role=img` div becomes a focusable button of identical size. |
| #51 | Doodle: pickers say which is on; Stamp says "Draw!" | **merge as-is** | Timer hygiene correct; test red on revert. |
| #52 | Train: sun and clouds are named buttons | **needs rework** | [bug, medium] Under reduced motion the three cloud buttons rest at `left:-20%/-50%/-30%` (`styles.css:2567-2569`) and are fully off-screen at all three viewports (measured `visibleW=0`), so they are now Tab stops with nothing to activate. Copy #54's resting-position CSS. |
| #53 | Farm: sun and clouds are named buttons | **needs rework** | [bug, high] Making `#farmSunMoon` a button exposes it to axe's target-size rule, and it sits under the score badge (`styles.css:3151-3156` vs `.badge`), so the phone viewport fails WCAG 2.2 target-size. Confirmed by running the full `tests/a11y.js` on the branch: `FAIL farm (light · phone portrait)` and `FAIL farm (dark · phone portrait)`, axe target-size [serious] on `#farmSunMoon`, exit 1. Also the same off-screen-cloud problem as #52 (8 px sliver on phone, 0 px on iPad). |
| #54 | Garden: clouds are named buttons that stay in view | **merge as-is** | Reference implementation for #52 and #53. Both halves of `tests/garden-sky.js` red on revert; probe confirms all three clouds visible and axe-clean at three viewports. `tests/baseline/garden.png` will need `--update-baseline` (size grew 6.5 percent, within the coarse tolerance, but the screenshot genuinely changed). |

Nothing should be closed as stale: every PR is two days old and addresses a real gap.
No security issues were found in any PR; none touches `lib/audio.js` or the
`window.Lawson` surface, and none adds `innerHTML` with user input.

### Recommended merge order

Do the two infrastructure fixes first (next-steps B1 and B2 below) so the remaining
rebases are trivial. Then:

1. **#34**, after fixing its How Many? assertion. It is the only PR that touches
   `app.js` focus handling and the only non-draft.
2. **#36**, rebased onto #34 (resolve `tests/a11y.js`). Then **#41**, rebased onto #36
   (resolve `games/story.js` and `index.html`).
3. **#54** (reference sky implementation), then **#50**, **#51**.
4. The pacing PRs, each rebased onto the previous one and its lint rule renumbered into a
   single consolidated rule set: **#35, #37, #38, #39, #40, #42, #44, #45, #46, #49**.
   Consider squashing the 10 near-duplicate `functionBody`-style helpers into one when
   #46 lands.
5. After rework: **#43** (keep the bonus), **#47** and **#48** (separate cancel handle),
   **#52** and **#53** (resting cloud positions; move the Farm sun out from under the badge).

## 4. Repository health

### Branches

35 remote branches. 21 are the open PRs above. Of the other 14:

| Branch | State | Action |
|---|---|---|
| `claude/build-piano-iiAur`, `claude/cleanup-more`, `claude/improve-game-engagement-s0fZ3`, `claude/polish-round`, `claude/post-drop-refine`, `claude/ux-audit-and-tests`, `codex/natural-storyteller-voice` | every commit is cherry-equivalent to one on `main` (PRs #1, #8, #4, #10, #7, #9, #11 merged) | delete |
| `claude/toddler-learning-website-noCy9` | 0 commits ahead, fully merged | delete |
| `claude/lawson-a11y-back-nav-p5ud0n`, `claude/lawson-a11y-ux-tests-p5ud0n` | their PRs (#30, #16/#20/#22/#25) merged; the branch tips are only "Merge origin/main into ..." commits | delete |
| `claude/cooler-app-icon` (19 ahead, May), `claude/improve-codebase-vycC4` (44 ahead, May), `claude/general-improvements-qbgJ9` (4 ahead, April) | early-2026 experiments whose PRs merged from *different* branch heads; 8,400 / 4,900 / 1,100 line diffs against current `main`, none cherry-equivalent | abandoned; delete after confirming nothing wanted survives (unverified: I did not diff their content against main feature by feature) |

`main` is not protected. There are no tags.

### Dead code, duplicates and inconsistencies (verified by the sweep, spot-checked by me)

- **Whack! ABC/123 mode is dead.** PR #9 removed `#whackModes` and `#whackPrompt` from
  `index.html` but changed zero lines of `games/whack.js`. About 80 lines
  (`whack.js:19-28, 43-46, 107-120, 162-197, 211-212`), the `.whack-critter--glyph` CSS
  (`styles.css:1280-1286`) and the file's header comment describe modes nobody can enter.
  Open PR #44 patches this dead branch.
- **"New best!" logic is copy-pasted 18 times.** `maybeCelebrateRecord` in 14 games plus
  inline copies in farm, icecream, music, train, with arbitrary 500 to 1200 ms delays.
  `lib/storage.js:35` `tryNewHighScore` is exactly this helper and has zero callers.
  The 15 `setTimeout(() => L.celebrateNewHigh(...))` copies are untracked, so tapping
  Home within a second of a record fires the overlay, confetti and "New best!" on the menu.
- **Untracked speech timers that survive `stop()`**: `dots.js:188`, `find.js:231`,
  `listen.js:101`, `mix.js:67`. Find and Listen also re-arm the 12-second prompt repeat,
  so "Find the cow!" can be spoken on the home screen. PRs #37, #38 and #48 fix three.
- **Same helpers re-declared per game**: `setT/clearAll/$` block x8; `cancelNext/clearNext`
  x9; phonetic tables `LETTER_SAY/NUMBER_SAY` in pop, whack, find and `NUMBER_WORDS` in
  count, howmany, while `app.js:576-686` already has `LETTER_SOUND` and `NUMBER_WORD`
  unexported; point-in-rect x3; pointer-capture drag x5; ghost-drag x3 (~60 lines each);
  day/night sky cycle in train, garden, farm with byte-identical gradient strings; rain
  shower x2; song sequencer in piano and music; sparkle ring x8.
- **Other dead state**: `garden.js` `rainTimer` (cleared twice, never assigned),
  `rainGrowTimers`, `GROW_STAGES`, `PLANTS[].weight`; `train.js` `currentStation`,
  `stationXs()`; `icecream.js` `bites`, `CONE_TYPES`; `farm.js` `rainStart`, ten state
  arrays at lines 33-42, no-op `setupPond()`; `app.js:124-137` `personalize()` duplicates
  `setKidName`. 33 of the 61 `window.Lawson` exports have no caller in games or lib.
- **Inconsistencies that cost real time**: four timer-bookkeeping dialects; `dots.js:209`
  and `dino.js:418` still use a fixed timer after a cheer (outside the lint's 8-line
  window; PR #42 fixes Dino); `sayPrompt` used in 6 quiz games but not mix, dots, pop,
  whack; `doodle.js:323` is the only game on `touchstart/mousedown`; keyboard fallback
  missing for icecream toppings (`icecream.js:288-324`) and scene stickers
  (`scene.js:241-274`); `dino.js` `autoBusy` used at line 83, declared at 145.
- **`app.js` is four modules in one file**: 226 lines of flashcards that are really a
  25th game with two routing special cases (`app.js:957`, `:1169`), 217 lines of menu
  decoration, 260 lines of settings panel, 110 lines of tap-to-use tool logic.
- **CSS**: 0 dead class selectors out of 421 (checked with dynamic-name awareness).

### Real bugs found on `main`

| Bug | Where | Severity |
|---|---|---|
| "Sounds like" name is used as a `String.replace` replacement string, so `$&`, `$1`, `` $` `` are interpreted. The written name is regex-escaped one line above; the spoken one is not. Verified in Node. | `lib/audio.js:44` | low (needs a `$` in the name) |
| Service worker `.catch(() => cached)` always returns `undefined` in that branch, so offline navigation to an uncached URL is a network error, not the cached shell. | `sw.js:73` | low |
| `addAll` is atomic and `register().catch(() => {})` swallows failures: one 404 in ASSETS strands every installed device on the old version silently. Nothing tests ASSETS against `index.html`. | `sw.js:41-46`, `app.js:1674` | medium |
| A corrupt `lawson:volume` value parses to 0 and mutes the app, and `setVolume(0)` also cancels speech. | `lib/audio.js:511, 548` | low |
| "New best!" overlay and 4 speech timers fire on the menu after Home (above). | 15 games | low, user-visible |

### Files that should not be committed

None. Full-history scan for secrets (API keys, private keys, AWS/OpenAI token shapes,
`.env`, credentials) is clean; the only keyword hits are "Design tokens" in `styles.css`
and the minified axe-core. No build artifacts, no `node_modules`, no `.DS_Store` in any
commit. The largest committed files are the visual baselines: `tests/baseline/` is
7.2 MB in the tree and 12.9 MB across 42 blob versions in history (7 commits touch them).
The repo is 15 MB packed. This is tolerable today but will grow every time a screen
changes; see Cleanup below.

### Dependency risk

There are no runtime dependencies, so no vulnerable packages. Dev tooling:

| Dependency | Pinned? | Current | Latest | Risk |
|---|---|---|---|---|
| axe-core (vendored `tests/vendor/axe-core`) | yes, 4.10.3 | 4.10.3 | 4.13.0 | low; three minor versions behind, rule changes could alter a11y results on upgrade |
| Playwright (global install, not in repo) | **no** | 1.56.1 on the dev host | 1.63.0 | medium: nothing records which version produced the baselines; a different Chromium can diff every screenshot |
| Node | no | 22.22 | n/a | low; tests use `node:vm`, `node:fs` only |

### Missing basics

- **No CI.** Zero workflows. The 7 suites only run when someone remembers.
- **No linter / formatter / editorconfig.** Cross-file globals make an ESLint config
  essential to catch a typo'd `L.sayy(`; today that is a runtime `TypeError` in one game.
- **No root `.gitignore`.** Only `tests/.gitignore` (for `actual/`). `node_modules/`,
  `.DS_Store`, `*.log` are unprotected.
- **No `package.json`.** Fine for the app, but it means no `npm test`, no pinned Playwright
  and nowhere to hang ESLint.
- **No CONTRIBUTING / LICENSE / CLAUDE.md.** For a repo where 112 of 147 commits are
  agent-authored, a short `CLAUDE.md` stating "one PR per concern, do not bump `CACHE`,
  run these commands" would have prevented most of section 3.
- **iOS home-screen icon is SVG.** `index.html:20` points `apple-touch-icon` at
  `icon.svg`; iOS Safari ignores SVG there and shows a page screenshot instead of the
  icon. Widely documented; unverified on a device here.
- **Service-worker versioning is manual** (28 of 40 commits touch `sw.js`).

## 5. Next steps

### Blockers (the repo works, but the PR queue and deploy path do not)

**B1. Stop hand-bumping the service-worker cache.** `sw.js`: fixed cache name,
stale-while-revalidate for assets, network-first with cache fallback for
`req.mode === "navigate"`, return the cached shell in the catch. About 15 lines. Land it
as its own PR *before* anything else, then rebase each open PR once and drop its `CACHE`
line. This single change removes the conflict from all 210 pairs and the "forgot to bump"
deploy hazard. Add a 5-line static test next to `tests/pacing-lint.js` that asserts every
script/link in `index.html` is in `ASSETS`.

**B2. Consolidate the pacing-lint "Rule 3" additions.** 13 PRs each add a rule at the
same line with near-duplicate helpers. Before merging #35 onward, agree on one
`functionBody()` helper and rule numbering (3 through 8), then have each PR rebase onto
the previous. Alternatively merge #35 first and hand-port the other rules into it.

**B3. Fix the four PRs with regressions before merging them**: #43 (`garden.js:532`,
keep the growth bonus), #47 and #48 (separate cancel handle for the re-ask), #52 and #53
(cloud resting positions from #54; move `#farmSunMoon` out from under the score badge).
Fix the no-op assertion in #34 (`tests/a11y.js:817-825`).

### Quick wins (under an hour each)

**Q1. Add CI.** `.github/workflows/test.yml`: Node 22, `npm i -g playwright@1.56.1 &&
npx playwright install --with-deps chromium`, then the six `node tests/*.js` commands
(`smoke.js --baseline` and `a11y.js` included). Roughly 12 minutes per run. Until this
exists, every PR's validation table is unverifiable.

**Q2. Add `package.json` + ESLint.** `"devDependencies": {"playwright": "1.56.1",
"eslint": "^10"}`, `"scripts": {"test": "...", "lint": "eslint ."}`, and an
`eslint.config.js` that declares the cross-file globals (`say`, `beep`, `afterSpeech`,
...) as `readonly` so `no-undef` catches real typos. The ad-hoc run here was clean, so the
first run is a no-op.

**Q3. Root `.gitignore`** with `node_modules/`, `.DS_Store`, `*.log`, `tests/actual/`.

**Q4. Fix the `String.replace` bug** at `lib/audio.js:44`: use a replacer function
`(_, pre) => pre + _nameSpoken`. Add a case to `tests/voice.js` with a `$` in the name.

**Q5. Delete the dead Whack! modes** in `games/whack.js` and `styles.css:1280-1286`, or
restore the tabs in `index.html`. Decide before merging #44, which edits the dead branch.

**Q6. Delete the 11 merged or abandoned branches** listed above (after a glance at
`cooler-app-icon`, `improve-codebase-vycC4`, `general-improvements-qbgJ9` for anything
wanted). Protect `main`.

**Q7. PNG apple-touch-icon.** Export `icon.svg` to a 180x180 PNG and point
`index.html:20` at it; add it to `ASSETS`.

**Q8. Add `CLAUDE.md`** with: run commands, "never edit `CACHE`", "one concern per PR",
"new lint rules go in one file", "run `--update-baseline` when a screen changes".

### Cleanup (nice to have)

**C1. `L.recordScore(key, value)`** in `app.js` built on `tryNewHighScore`: latch, bump,
best-badge refresh, and a cancellable `celebrateNewHigh` cleared by `stop()`. Replaces
18 copies and 19 badge lines and fixes the "New best!" on-menu leak.

**C2. Track the remaining untracked speech timers** (`dots.js:188`, `mix.js:67`, and
whatever #37/#48 leave) and widen the pacing-lint window so `dots.js:209` is caught.

**C3. Export `LETTER_SOUND` / `NUMBER_WORD` / `LETTERS` / `NUMBERS`** and delete the
copies in pop, find, count, howmany.

**C4. Shared `L.timers()` factory** replacing the 8 `setT/clearAll/$` blocks; then delete
the dead state listed in section 4.

**C5. Split `app.js`**: `games/flashcards.js` as a real game module (removes two routing
special cases), `lib/settings.js`, `lib/menu.js`, `lib/tools.js`. Trim `window.Lawson`
to the 28 names games actually call.

**C6. Shared drag helpers** (`L.dragTool`, `L.ghostDrag`) with the keyboard `click`
fallback built in, closing the keyboard gaps in scene stickers and icecream toppings;
then one `L.ambientSky()` for the train/garden/farm sky, rain and sun code (~300 lines).

**C7. Baselines**: switch `tests/smoke.js:77` from a 20 percent size tolerance to a
pixel diff (Playwright's `toHaveScreenshot` or `pixelmatch`), and consider Git LFS or a
smaller viewport for `tests/baseline/` before it dominates the repo.

**C8. Upgrade vendored axe-core** to 4.13 and re-run a11y; pin Playwright in
`package.json` and note the version in `tests/README.md`.
