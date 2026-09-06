# Lawson's Playground

A toddler-friendly learning playground for iPad (and phones). Pure
HTML/CSS/JS, no framework, no build step, no external assets. Add to
the home screen to play offline.

## Run it

Open `index.html` in any modern browser. For service-worker / "add to
home screen" support, serve over HTTP (e.g. `python3 -m http.server`).

## Home screen

Tuned for a 3-year-old: no reading required, small counting numbers,
big tap targets. The home screen surfaces the six games he plays most,
each opening straight into play. Everything else lives one tap away
behind the **More** card.

**Six headline games:**

- **Pop!** — pop floating balloons. Three modes: Free (streaks + rare
  rainbow), ABC ("Pop the B!"), 123 ("Pop the 3!") — letters and
  numbers ride on the balloons.
- **Whack!** — whack critters as they pop out of six holes.
- **Find It!** — hidden-object hunt across themed scenes (farm, ocean,
  park, sky). Free / ABC / 123 modes.
- **Cook!** — pancakes: pour batter, watch it bubble, flip, plate, stack.
- **Baby Dino** — bath time: drag soap to lather, pull the shower to
  rinse, drag the towel to dry. Hearts when he's clean.
- **Garden!** — plant a seed, drag the watering can to grow it, harvest
  the fruit. 12 plants; bees, butterflies, a bird, surprise rain, and a
  slow day/night cycle.

## More → hubs

The **More** drawer holds themed hub cards, each opening a small menu:

- **Art Studio** — Doodle, Coloring, Color Mix, Sticker Scene
- **Music** — Piano, Music Studio (drums + xylophone + bells), Listen
- **Brain Games** — Match, Memory, Pattern, Dots
- **Numbers** — 1 2 3, Count, How Many?
- **Wonder World** — ABC + 8 flashcard topics (Colors, Shapes, Animals,
  Vehicles, Dinos, Weather, Food, Family)
- **Town** — Train, Farm, Ice Cream (illustrated sandbox scenes)
- **Library** — Story, Sticker book

**Sandboxes** (open-ended, no scoring):

- **Sticker Scene** — drag stickers onto 12 themed backgrounds. Your
  decorated scene is saved and restored between visits.
- **Farm** — care for animals: milk the cow, shear the sheep, feed the
  pig/horse, fetch with the dog, collect eggs, pick apples, fish, drive
  the tractor. Day/night + weather.
- **Ice Cream** — build a sundae: drag scoops onto a cone, add toppings,
  tap Eat!
- **Train** — drive a chuffing train between three stations; passengers
  hop on and off.
- **Music Studio** — drum kit, rainbow xylophone, jingle bells, plus a
  Song button that plays familiar tunes.
- **Doodle** — rainbow / solid brushes, eraser, sizes, save as PNG.

**Collection:**

- **Stickers** — 34 unlockables across every game, with a progress bar
  and an all-stickers finale when you find them all.

## Settings (gear icon in the header)

- Edit the kid's name (used in cheers across every game)
- Mute voice and/or sound effects independently
- **Captions** — show what the storyteller says as words on screen (great
  for kids who are hard of hearing, or when the voice is muted). The
  caption is drawn over the header title, the one strip every screen
  keeps free of game controls, so it never covers a tool or the story
  text. Off or on, every spoken line is also announced to screen readers
  through a live region.
- Choose and preview a storyteller voice. Automatic prefers local English
  voices with enhanced quality when available, using their natural pitch.
  The choice is saved on this device. Available voices depend on the device;
  voices marked online require a connection. If the chosen voice can't
  speak (an online voice with no connection, say), the storyteller reads
  with the best local voice instead and goes back to the chosen one when
  it can; Settings says who is standing in. A line the device swallows
  (iPads sometimes drop one right after a cut-off) is read again. After
  "Listen to this voice", Settings reports how long the engine took to
  start and how the line ended, plus a tally of the recent lines
  (swallowed, read again, stand-in voice, cut off) — the way to check the
  speech timings on a real iPad. On iPad, additional voices can
  be downloaded in the device's accessibility speech settings. Story Time
  paces its pages on the chosen voice: each page turns once the line has
  actually been read, plus a beat to poke the scene. Poking a character
  answers with its sound, then the storyteller picks the line back up if
  it was cut off. "The end!" and the cheer are heard in full before the
  sticker is announced and the next story begins. The quiz games (Listen,
  Match, Pattern, How Many?, Count) likewise let the cheer finish before
  the next round's prompt.
- Locking the iPad or switching apps silences the storyteller and the menu
  music straight away. Coming back wakes the speech and sound engines
  (iOS leaves both muted after a lock or a phone call) and Story Time
  re-reads the page it was on.
- **Volume** — one master slider for all app audio
- Music on the menu (on/off)
- Dark mode
- The panel is a real modal: Escape closes it, Tab stays inside it, and
  focus returns to the gear when it closes.
- **Show tips again** — re-arms the first-visit hint for every game
- Reset all high scores (two-tap confirm so toddlers can't fire it)

## Accessibility

- **Keyboard + screen readers**: every tile, tool, choice and score badge
  is a named button. Opening a game moves focus onto that screen (a
  labelled region); Home puts it back on the tile you came from. Mode
  tabs expose their pressed state; Memory cards say "Hidden card" until
  flipped.
- **Captions / live region**: see Settings above.
- **Reduced motion**: with the OS "reduce motion" preference on, CSS
  animations collapse and the sparkle / confetti particle bursts are
  skipped entirely.
- **Contrast**: all text meets WCAG AA (4.5:1) in light and dark mode —
  checked on every screen by `tests/a11y.js` with axe-core.
- **Touch targets**: every control meets WCAG 2.2's 24px target-size rule
  at phone and iPad sizes, and nothing (mascots, toasts, captions) ever
  floats on top of Home, the tabs, the badges or the tiles.
- Pinch-zoom is deliberately disabled so a toddler's second finger can't
  zoom the playground away; the UI is already very large.

## Behind the scenes

- **PWA**: `manifest.json` + `sw.js` cache every asset so the
  playground keeps working when the iPad's offline.
- **Welcome toast**: time-of-day greeting on app load with a daily
  streak counter once it's 2+ days in a row.
- **Tutorials**: `lib/tutorial.js` shows a one-time hint the first time
  the kid opens each game (it listens for the `lawson:screen` event that
  `show()` fires). Taps pass straight through the hint to the game and
  dismiss it; leaving the screen dismisses it too.
- **Audio**: every sound routes through a single master gain node
  (`lib/audio.js`) so the Settings volume slider is one knob for
  the whole app.
- **Architecture**: each game lives in `games/*.js` and registers on
  `window.Lawson.games`. Shared utilities — audio (`lib/audio.js`),
  high-score storage (`lib/storage.js`), sticker collection
  (`lib/achievements.js`), tutorials (`lib/tutorial.js`) — are in `lib/`.

## Tests

Smoke + visual baseline checks for every game live in `tests/`.

```bash
node tests/voice.js                # speech engine + caption event (no browser)
node tests/story.js                # Story Time pacing (no browser)
node tests/smoke.js                # errors-free / renders / restart-safe
node tests/smoke.js --baseline     # + diff every screen against tests/baseline/
node tests/smoke.js --update-baseline   # accept new baselines after UI changes
node tests/a11y.js                 # axe-core (light, dark, phone, iPad) + keyboard / modal / captions / overlay checks
```

See `tests/README.md` for details (needs Playwright + Chromium).

## Adding a new game

1. Create `games/myname.js` with an IIFE that registers
   `window.Lawson.games.myname = { screen, start, stop }`.
2. Add a `<section id="mynameGame" class="screen">` in `index.html`
   and a tile in the relevant hub (or the home menu).
3. Drop the script tag at the bottom of `index.html` and add the path
   to `ASSETS` in `sw.js` (bump the cache version).
4. Add a smoke entry in `tests/smoke.js` (`GAMES` array) and refresh
   the baseline with `node tests/smoke.js --update-baseline`.
5. Give every tappable thing a readable name (`aria-label` for
   emoji-only buttons) and run `node tests/a11y.js` — it picks the new
   game up automatically from `window.Lawson.games`.
