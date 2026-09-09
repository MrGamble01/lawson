# Tests

Smoke, visual baseline and accessibility checks for every game and key screen.

## Run

```bash
node tests/sw-assets.js            # sw.js ASSETS matches index.html and the files on disk; cache name is fixed (no browser)
node tests/pacing-lint.js          # no bare timer after a cheer, no chime right after a line, no timer or same-tick line speaking over a short line (static check, no browser); --self-test checks the checker
node tests/voice.js                # speech: voice choice, speed, name "sounds like", mute/volume, completion promise, caption event (no browser)
node tests/story.js                # Story Time pacing on real narration end (no browser)
node tests/garden.js               # Garden sun easter egg: "Sunshine!" is heard before "Sunshine power!" (no browser)
node tests/howmany.js              # How Many? wrong-answer nag heard before the leftover opening prompt (no browser)
node tests/pattern.js              # Pattern wrong-answer nag heard before the leftover opening prompt (no browser)
node tests/listen.js               # Listen leftover opening clue: wrong tap / replay cancel it; re-ask waits (no browser)
node tests/stickers.js             # sticker announcement: jingle first, then waits for the cheer (no browser)
node tests/memory.js               # Memory: last card name heard before the win cheer (no browser)
node tests/dino.js                 # Baby Dino: "All clean!" heard before the next wash (no browser)
node tests/pop.js                  # Pop! ABC: the popped letter is heard before the next goal (no browser)
node tests/whack.js                # Whack! ABC: the hit is heard before the next goal (no browser)
node tests/train.js                # Train: the station is heard before the passenger hops on (no browser)
node tests/scene.js                # Sticker Scene: hear the scene name before the welcome (no browser)
node tests/piano.js                # Piano Song: first note waits for the name (no browser)
node tests/music.js                # Music Studio Song: first note waits for the name (no browser)
node tests/match.js                # Match example is a named button that re-hears the prompt (no browser); --self-test checks the role=img-then-onTap checker
node tests/doodle.js               # Doodle brushes / sizes / Stamp expose aria-pressed; stamp timeout says "Draw!" (no browser); --self-test checks the checker
node tests/garden-sky.js           # Garden sky: sun and clouds are named buttons, clouds rest in view under reduced motion (no browser); --self-test checks the checker
node tests/train-sky.js            # Train sky: sun and clouds are named buttons; --self-test checks the checker (no browser)
node tests/farm-sky.js             # Farm sky: sun and clouds are named buttons; --self-test checks the checker (no browser)
node tests/nav-speech.js           # hub welcome line never spoken over a screen the kid tapped on to (Playwright)
node tests/smoke.js                # smoke pass only (errors-free / screen renders / restart safe)
node tests/smoke.js --baseline     # smoke + diff every screen against tests/baseline/
node tests/smoke.js --update-baseline   # write fresh baseline PNGs (use after intentional visual changes)
node tests/a11y.js                 # accessibility: axe-core on every screen (4 configs) + keyboard / modal / captions / overlay behaviour
node tests/sw-update.js            # service worker: a changed asset runs on the second open, a changed page on the next, offline still boots (Playwright)
```

Exit codes:

| Code | Meaning                                              |
|------|------------------------------------------------------|
| 0    | All smoke + visual checks pass                       |
| 1    | A game failed smoke (errors, missing key element, restart bug) |
| 2    | Visual diff against baseline detected                |
| 99   | Test runner crashed                                  |

## What it checks

`tests/voice.js`, `tests/story.js`, `tests/stickers.js` and the per-game
scripts (`memory`, `dino`, `pop`, `whack`, `train`, `scene`, `piano`,
`music`) are plain Node scripts with no Playwright dependency. They load
`lib/audio.js` / `games/*.js` into a `vm` sandbox with a fake speech
engine, DOM and clock, so they check exact behaviour. The per-game
scripts each hold a short line the way a late-starting iPad voice would
and check that the line which follows (the next goal, the win cheer, the
passenger, the welcome, the first note) starts one beat after it ends,
never on top of it. `tests/match.js`, `tests/doodle.js` and
`tests/garden-sky.js` are static scans of one game's source (a
`role="img"` or `aria-hidden` element then given `onTap` skips the
keyboard upgrade; pickers must expose `aria-pressed`; clouds need a
resting position under both reduced-motion switches) with a small
playthrough where the game allows it. `tests/voice.js` and
`tests/story.js` check: which voice gets picked, that `say()` resolves when a line
`tests/voice.js`, `tests/story.js` and `tests/train-sky.js` are plain Node
scripts with no Playwright dependency. `tests/train-sky.js` is a static
scan: a Train cloud marked `aria-hidden` then given `onTap`, or a sun
that is still a `<div>`, is reported — that combination left the sky
`tests/voice.js`, `tests/story.js` and `tests/farm-sky.js` are plain Node
scripts with no Playwright dependency. `tests/farm-sky.js` is a static
scan: a Farm cloud or sun marked `aria-hidden` then given `onTap`, or a
sun that is still a `<div>`, is reported — that combination left the sky
off the Tab order (`makeTappableAccessible` will not overwrite
`aria-hidden`). `--self-test` covers the checker.

`tests/voice.js` and `tests/story.js` load `lib/audio.js` / `games/story.js` into a
`vm` sandbox with a fake speech engine, DOM and clock, so they check exact
behaviour: which voice gets picked, that `say()` resolves when a line
really ends (or is interrupted, muted, or silenced), that `afterSpeech()`
runs a game's next step once the engine is idle plus a beat — bounded by a
floor and a ceiling, cancellable — that a voice which
can't speak (an online voice offline, one that never starts) is swapped
for the best local voice and tried again when the network returns, that a
line the engine swallows after a cut-off is spoken again with the same
voice (and the next line waits a beat after a cut-off), that every attempt
is logged with its start latency and outcome for the Settings voice report,
that a line spoken right after a chime waits for the chime to ring out
(`tests/pacing-lint.js` makes sure every game triggers its chime before
the line, not after it, where it would land on the first word, and that
no game follows a line with a timer — or a second line in the same
tick — whose callback speaks, however the timer is spelled:
`setTimeout(fn)`, `setTimeout(name)`, `setT(ms, name)`, an arrow that
calls a speaker, or a block that does; it also refuses `newTarget()` or
another speaker called straight after a `say()`),
a game does not speak a second line in the same tick as the first),
that Garden's fifth sun tap hears "Sunshine!" before "Sunshine power!"
(`tests/garden.js`),
that a quiz prompt is repeated once after a quiet spell and dropped by any
other line, a screen change, a lock or a muted voice, that a How Many? /
Pattern wrong tap's nag is heard before the leftover opening prompt
(`tests/howmany.js`, `tests/pattern.js`; `tests/pacing-lint.js` keeps the
pending `sayPrompt` timer from surviving the nag), that the menu music
other line, a screen change, a lock or a muted voice, that Listen's leftover
opening clue is cancelled by a wrong tap or Hear it again and the question
is asked again only after a clue already in flight has been heard
(`tests/listen.js` plays that race on a virtual clock), that the menu music
ducks under a line in flight and eases back once it ends (or is cut off,
muted or silenced), that a screen lock or
app switch silences speech and music and that coming back wakes a paused
speech engine and an interrupted audio context, and that story pages flip
after the narration finishes — never before the word-count floor, never
after the no-`end`-event ceiling — freeze while the app is hidden, and
pick the line back up after a character poke cuts it off, read the line
again when the words are tapped (holding the page for it) and let "The
end!" and the sticker announcement finish before the next story.

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
up automatically), in four configurations — light and dark mode on a phone
(414×896), and light mode on an iPad in portrait (820×1180) and landscape
(1180×820) — and, on each:

1. Runs [axe-core](https://github.com/dequelabs/axe-core) (vendored in
   `tests/vendor/axe-core`, no install needed) with the WCAG 2.0/2.1/2.2
   A + AA and best-practice rule sets, which include colour contrast and
   the 2.2 24px target-size rule. Any violation fails. The one rule
   switched off is `meta-viewport` — pinch-zoom is intentionally disabled
   for toddlers; the reason is printed with the results.
2. Checks what axe can't: the active screen is a labelled, focusable region
   and keyboard focus is inside it; every visible button has a *readable*
   name (letters or digits, not only an emoji); nothing focusable is inside
   an `aria-hidden` subtree; `[hidden]` elements are really gone from
   layout; navigation chrome (Home, mode tabs, badges, tiles, the gear) is
   hit-testable at its centre, so nothing floats on top of it; and, with
   captions on, a spoken line is drawn inside the header strip without
   overlapping any control or the Story Time text bubble.

Then it drives the app by keyboard only: Enter on a tile opens the game
and focus follows; Tab lands on Home; Enter returns to the menu with focus
back on the originating tile. The Settings modal must flip `aria-hidden`,
make the page behind it `inert`, trap Tab, close on Escape and return
focus to the gear. Captions must mirror `say()` (even muted), be drawn
when the setting is on and stay in the accessibility tree when it is off.
Mode tabs must track `aria-pressed`, score badges must be named by their
value and react to Enter, and particle effects must be skipped under
`prefers-reduced-motion`. Finally the transient overlays are triggered and
checked while up: the first-visit tutorial hint (fires from a real tile
tap, is a status message, leaves with the screen), the sticker toast, the
all-stickers finale and the new-best celebration. Last, the tap
alternatives to dragging (WCAG 2.2 §2.5.7) are played through with single
taps: Garden (pot → can → pot waters it, the pot's own nag is swallowed,
and a real mouse drag still waters), Farm (bucket → cow milks it without
the cow's moo; tapping a held tool again, Escape and leaving the screen
all put it down; Enter on a tool then activating a target works), Baby
Dino (one tap each on soap, shower and towel walks all three phases) and
Ice Cream (a tap on a tub adds the scoop). Then keyboard play: every tap
target must be a named, focusable button and no button may sit inside
another; Farm (Enter on the cow reacts; carrot then horse by keyboard
feeds it), Garden (plant, pick up the can and water a pot by Enter, with
the pot's name tracking its state), Whack! (the six holes are the buttons
and say who is up; Enter scores) and Pop! (Enter pops a balloon) are
played with the keyboard alone. Finally the comfort settings: "Take it
slow" turned on through the panel persists, doubles the pace scale, makes
Pop! balloons take ≥10 s (normal ≤9 s) and keeps a Whack! critter up
≥1.75 s (normal ≤1.6 s); "Less motion" turned on through the panel, with
no OS preference emulated, persists, makes `prefersReducedMotion()` true,
collapses CSS animations and skips sparkle bursts. And back navigation:
Back from Pop! returns to the menu with the game stopped; Back from
Doodle (reached via More → Art Studio) steps to Art Studio, then More,
then the menu; Home from three hops deep unwinds the history depth to 0;
the ABC flashcards (via More → Wonder World) round-trip through history; Back closes Settings and
Done unwinds the Settings entry; Escape with a tool held only puts the
tool down, and Escape again goes Home. Then focus retention: answering
Match and How Many? correctly by keyboard leaves focus on a choice of the
rebuilt round (the answered button is gone); popping a balloon with Enter
leaves focus on another balloon or the Pop! screen; Escape from a game
still lands focus on the menu. Last, Dots and Story Time by keyboard:
every SVG dot is a named, focusable button whose name says who is next;
Enter on the wrong dot calls out the right one without connecting; Enter
on the right dot connects it and the names move on; Story Time turns the
page from the "Next page" button and from Enter on the screen, but not
from Enter on a character.

Exit code 1 lists every failing screen/check; 99 means the runner crashed.

## Requirements

Playwright + Chromium. The script reads:

- `PLAYWRIGHT_MODULE` — path to the Playwright `node_modules` (defaults to
  `/opt/node22/lib/node_modules/playwright`, which is how the dev host
  is set up). If you've installed Playwright elsewhere, point this at
  it.
- `PLAYWRIGHT_BROWSERS_PATH` — already exported on the dev host to
  `/opt/pw-browsers`.

Playwright is pinned in `package.json`; `npm ci && npx playwright install chromium`
installs the exact version the baselines were made with. The scripts prefer a
local `node_modules/playwright` and fall back to the dev-host path above.
