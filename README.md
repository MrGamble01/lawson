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
  numbers ride on the balloons. The ABC / 123 goal is a quiz prompt:
  said once more if the kid goes quiet for twelve seconds.
- **Whack!** — whack critters as they pop out of six holes. Its ABC /
  123 goal ("Whack the B!") is a quiz prompt too, as is Memory's "Find
  the matching pairs!".
- **Find It!** — hidden-object hunt across themed scenes (farm, ocean,
  park, sky). Free / ABC / 123 modes.
- **Cook!** — pancakes: pour batter, watch it bubble, flip, plate, stack.
  The pancake's name follows along ("Pancake: ready, flip it"), so a
  keyboard or screen-reader user knows what a press will do.
- **Baby Dino** — bath time: drag (or tap) soap to lather, pull (or tap)
  the shower to rinse, drag (or tap) the towel to dry. Hearts when he's
  clean.
- **Garden!** — plant a seed, drag the watering can (or tap the can, then
  the pot) to grow it, harvest the fruit. 12 plants; bees, butterflies, a bird, surprise rain, and a
  slow day/night cycle. The sun and clouds are named buttons (in Farm and
  Train too), so Tab / a screen reader can poke them the same way a finger
  does, and under "Less motion" the clouds rest inside the sky instead of
  parking off its left edge.

## More → hubs

The **More** drawer holds themed hub cards, each opening a small menu:

- **Art Studio** — Doodle, Coloring, Color Mix, Sticker Scene
- **Music** — Piano, Music Studio (drums + xylophone + bells), Listen.
  Each Song button names the tune and waits for the name to be heard
  before the first note.
- **Brain Games** — Match, Memory, Pattern, Dots
- **Numbers** — 1 2 3, Count, How Many?
- **Wonder World** — ABC + 8 flashcard topics (Colors, Shapes, Animals,
  Vehicles, Dinos, Weather, Food, Family)
- **Town** — Train, Farm, Ice Cream (illustrated sandbox scenes)
- **Library** — Story (tap anywhere, the "keep going" line, or press
  Enter to turn the page), Sticker book

**Sandboxes** (open-ended, no scoring):

- **Sticker Scene** — drag stickers onto 12 themed backgrounds. Your
  decorated scene is saved and restored between visits. The picture is
  named after the scene it shows ("Beach scene"), so a screen reader
  knows which one is up, a restored one included.
- **Farm** — care for animals: milk the cow, shear the sheep, feed the
  pig/horse, fetch with the dog, collect eggs, pick apples, fish, drive
  the tractor. Drag a tool onto an animal, or tap the tool and then the
  animal. The milk bucket's name counts what is in it ("Milk bucket: 1 of
  3", then "full"), so a screen reader hears the level the drawing shows.
  Day/night + weather. The sun and clouds are named buttons, so
  Tab / a screen reader can poke them the same way a finger does. The
  pond ducks are named buttons too.
- **Ice Cream** — build a sundae: drag scoops onto a cone (or tap a tub),
  add toppings, tap Eat!
- **Train** — drive a chuffing train between three stations; passengers
  hop on and off. The stations say where the train is ("Station 2, train
  here"), so a screen reader follows the journey. The sun and clouds are
  named buttons, so Tab / a screen reader can poke them the same way a
  finger does.
- **Music Studio** — drum kit, rainbow xylophone, jingle bells, plus a
  Song button that names the tune and waits for the name to be heard
  before the first note, so "Twinkle Twinkle" is never played over.
- **Doodle** — rainbow / solid brushes, eraser, sizes, save as PNG.

**Collection:**

- **Stickers** — 34 unlockables across every game, with a progress bar
  and an all-stickers finale when you find them all.

## Settings (gear icon in the header)

- Edit the kid's name (used in cheers across every game), and, if the
  storyteller says it wrong, write how it **sounds like** — every line
  that names the kid is spoken that way while captions keep the real
  spelling. A greeting plays so the parent can check.
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
  it was cut off. Tapping the words — or the "hear them again" button,
  the keyboard path — hears the line again from the top (the page waits
  for it); tapping anywhere else, the "keep going" button, or Enter
  turns the page. "The end!" and the cheer are heard in
  full before the sticker is announced and the next story begins. The
  quiz games (Listen, Match, Pattern, How Many?, Count, Find It!, Color
  Mix, Memory) likewise let the cheer — or "try again" — finish before
  the next prompt, and a hub's welcome line is skipped if the kid has
  already tapped on. A quiz prompt ("Find the cow!", "Make orange!",
  "Find 3!") is repeated once if nothing has happened for twelve seconds,
  so a kid who looked away gets a nudge, never a nag. A cheer starts as its chime rings out rather than
  underneath it, so the first word is never masked — every game triggers
  its chime before the line (the farm, garden, train and scene sounds
  included), and a check keeps it that way — and "New best!" and
  "Sticker!" announcements wait for the cheer to finish instead of
  cutting it off. Every short line that leads into another is heard in
  full before the next one starts, whatever the game: "Flip!" then
  "Yummy!", the counted number then the total, "Squirt squirt!" then
  "Bucket full of milk!", a wrong tap's name in Find It! before the goal
  repeats, the second colour in Color Mix before the mix, the last
  number in Connect-the-dots before "It's a house!" (and that reveal
  before the next puzzle), each "Mmm!" in Ice Cream before the next
  bite, Memory's last card ("bee") before "You matched them all!", Baby
  Dino's "All clean!" before the next wash, the popped letter in Pop! and
  Whack! ABC / 123 before the next goal, "Station 2!" on the train before
  the passenger's "Woof!", Sticker Scene's "The park!" before the how-to
  (and its chime before a new scene's name), Garden's "Sunshine!" before
  "Sunshine power!", and a Song button's tune name in Piano and Music
  Studio before the first note.
- Locking the iPad or switching apps silences the storyteller and the menu
  music straight away. Coming back wakes the speech and sound engines
  (iOS leaves both muted after a lock or a phone call) and Story Time
  re-reads the page it was on.
- **Storyteller speed** — Slower, Normal or Faster for every line the
  storyteller says; a sample line plays at the new pace. Saved on this
  device.
- **Volume** — one master slider for all app audio
- Music on the menu (on/off). It ducks under the storyteller: a hub
  welcome, a Bobo tickle or the voice preview is never sung over, and the
  loop eases back up once the line has ended.
- Dark mode
- **Take it slow** — half speed for the timed games: Whack! critters stay
  up twice as long and pop half as often, Pop! balloons drift twice as
  slowly, first-visit hints linger. For kids who need more time to aim.
- **Less motion** — turns off the wiggles, floating and sparkles without
  changing the iPad's own setting.
- The panel is a real modal: Escape closes it, Tab stays inside it, and
  focus returns to the gear when it closes. The Back button (or a
  swipe-back) closes it too.
- **Show tips again** — re-arms the first-visit hint for every game
- Reset all high scores (two-tap confirm so toddlers can't fire it)

## Accessibility

- **Back means back**: every hop into a hub or game is a history entry,
  so the browser or Android Back button and the iOS swipe-back gesture
  step back inside the playground (game → hub → menu, or close Settings)
  instead of leaving it. Home jumps straight to the menu and unwinds the
  entries it skips, so Back from the menu still leaves the app. Escape on
  a game or hub screen goes Home too (after putting down a held tool).

- **Keyboard + screen readers**: every tile, tool, choice and score badge
  is a named button — and so is every animal, pot, balloon, hole, cloud
  and sun you can tap: `onTap()` turns any plain tap target into a
  focusable `role="button"`, so the sandbox and arcade games can be
  played with Tab and Enter. The Farm, Train and Garden skies used to
  hide their sun and clouds (`aria-hidden` then `onTap`), which skipped
  that upgrade — they are real named buttons now, and the sun's name
  follows day and night ("Moon", or "Stars" once the spoken line is
  "Stars!"). Names carry state where it matters ("Pot 2: seed planted,
  water it", "Hole 4: mole!", "cow, counted" in Count, "Red, used" in
  Color Mix, "roof, red" in Coloring, "bee, matched" in Memory, "duck, found" in
  Find It!). Opening a game moves focus
  onto that screen (a labelled region); Home puts it back on the tile you
  came from. Mode tabs expose their pressed state, and so do the toggles — the
  Song buttons in Piano and Music Studio and Train's Go / Stop say
  whether they are on; Memory cards say "Hidden card" until flipped. When a quiz round rebuilds its choices or a
  popped balloon disappears, focus moves to the next control in the game
  instead of falling back to the top of the page, so Tab + Enter play
  keeps its place.
  "Hidden card" until flipped. Connect-the-dots' SVG dots are buttons
  too, named "Dot 3, next" / "Dot 2, connected", and so are Coloring's
  regions ("roof", "left top wing"); Story Time turns the page from its
  "keep going" button or Enter on the screen.
  seed planted, water it", "Hole 4: mole!"). Match's example picture is
  a button named like the prompt ("Find the dog"), so Tab and Enter
  hear it again — a `role="img"` here used to skip the button upgrade.
  Opening a game moves focus onto that screen (a labelled region); Home
  puts it back on the tile you came from. Mode tabs expose their pressed
  state; Memory cards say "Hidden card" until flipped.
  came from. Mode tabs expose their pressed state; Doodle's brushes,
  sizes and Stamp do too (and Stamp says "Draw!" when the 8-second
  stamp window ends). Memory cards say "Hidden card" until flipped.
- **Captions / live region**: see Settings above.
- **Reduced motion**: with the OS "reduce motion" preference on, or the
  in-app **Less motion** setting, CSS animations collapse and the sparkle /
  confetti particle bursts are skipped entirely. Pop! balloons hold still
  where they appear instead of drifting, in three lanes and at most three
  at a time (they used to jump straight off the top and be unpoppable).
- **Timing**: **Take it slow** in Settings halves the pace of every timed
  game (WCAG 2.2.1), so nothing disappears before a slower hand gets there.
- **Contrast**: all text meets WCAG AA (4.5:1) in light and dark mode —
  checked on every screen by `tests/a11y.js` with axe-core.
- **Tap instead of drag** (WCAG 2.2 §2.5.7): every drag has a single-tap
  path. In Garden and Farm, tap a tool to pick it up (it lifts and bobs),
  then tap the plant or animal — the tool hops over, does its job and
  snaps back; tap it again, press Escape or leave the screen to put it
  down. In Baby Dino a tap on the soap, shower or towel performs the
  whole motion, and the two tools that are not for the current phase
  (dimmed on screen) are marked disabled so a screen reader hears why a
  press does nothing; in Ice Cream a tap on a tub scoops that flavour straight
  onto the cone and a tap on a topping drops it on the stack; in Sticker
  Scene a tap on a tray sticker drops it in the middle of the picture.
  Enter on a focused tool, then on a target, does the same — including
  the tray stickers and toppings, which are drag sources: Enter on a
  placed sticker hears it again and Delete removes it (the keyboard
  stand-in for the long press).
- **Touch targets**: every control meets WCAG 2.2's 24px target-size rule
  at phone and iPad sizes, and nothing (mascots, toasts, captions) ever
  floats on top of Home, the tabs, the badges or the tiles.
- Pinch-zoom is deliberately disabled so a toddler's second finger can't
  zoom the playground away; the UI is already very large.

## Behind the scenes

- **PWA**: `manifest.json` + `sw.js` cache every asset so the
  playground keeps working when the iPad's offline. The worker refreshes
  assets in the background and fetches the page network-first, so a
  deploy is picked up on the next open without editing `sw.js`
  (`tests/sw-update.js` checks this in Chromium).
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
npm ci && npx playwright install chromium   # once
npm test                           # everything below, in order
node tests/sw-assets.js            # sw.js ASSETS matches index.html and disk (no browser)
node tests/voice.js                # speech engine + caption event (no browser)
node tests/story.js                # Story Time pacing (no browser)
node tests/garden-sky.js           # Garden sky: sun and clouds are named buttons, clouds rest in view under reduced motion (no browser)
node tests/match.js                # Match example is a named button that re-hears the prompt (no browser)
node tests/doodle.js               # Doodle tool pressed state + stamp timeout (no browser)
node tests/memory.js               # Memory last-card name before the win cheer (no browser)
node tests/dino.js                 # Baby Dino cheer pacing (no browser)
node tests/pop.js                  # Pop! ABC: letter heard before the next goal (no browser)
node tests/whack.js                # Whack! ABC: hit heard before the next goal (no browser)
node tests/train.js                # Train: station heard before the passenger (no browser)
node tests/scene.js                # Sticker Scene: name then welcome (no browser)
node tests/piano.js                # Piano Song: first note waits for the name (no browser)
node tests/music.js                # Music Studio Song: first note waits for the name (no browser)
node tests/garden.js               # Garden sun: "Sunshine!" before "Sunshine power!" (no browser)
node tests/listen.js               # Listen leftover opening clue (no browser)
node tests/train-sky.js            # Train sky: sun and clouds are named buttons (no browser)
node tests/farm-sky.js             # Farm sky: sun and clouds are named buttons (no browser)
node tests/farm-pond.js            # Farm pond: ducks are named buttons (no browser)
node tests/smoke.js                # errors-free / renders / restart-safe
node tests/smoke.js --baseline     # + diff every screen against tests/baseline/
node tests/smoke.js --update-baseline   # accept new baselines after UI changes
node tests/a11y.js                 # axe-core (light, dark, phone, iPad) + keyboard / modal / captions / overlay checks
node tests/sw-update.js            # service worker picks up a deploy without a cache bump; offline boot
```

`npm run lint` runs ESLint over the app and tests; CI (`.github/workflows/test.yml`)
runs lint and every suite on each PR.

See `tests/README.md` for details (needs Playwright + Chromium).

## Adding a new game

1. Create `games/myname.js` with an IIFE that registers
   `window.Lawson.games.myname = { screen, start, stop }`.
2. Add a `<section id="mynameGame" class="screen">` in `index.html`
   and a tile in the relevant hub (or the home menu).
3. Drop the script tag at the bottom of `index.html` and add the path
   to `ASSETS` in `sw.js` (`node tests/sw-assets.js` checks the list;
   the cache name never changes).
4. Add a smoke entry in `tests/smoke.js` (`GAMES` array) and refresh
   the baseline with `node tests/smoke.js --update-baseline`.
5. Give every tappable thing a readable name (`aria-label` for
   emoji-only buttons) and run `node tests/a11y.js` — it picks the new
   game up automatically from `window.Lawson.games`.
