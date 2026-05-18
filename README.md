# Lawson's Playground

A toddler-friendly learning playground for iPad (and phones). Pure
HTML/CSS/JS, no framework, no build step, no external assets. Add to
the home screen to play offline.

## Run it

Open `index.html` in any modern browser. For service-worker / "add to
home screen" support, serve over HTTP (e.g. `python3 -m http.server`).

## What's in here

Tiles are grouped on the home screen into four sections.

**Learn** — flashcards built from a shared activity pipeline. Tap to
hear the name and see a big colorful display.

- ABC (uppercase + lowercase together)
- 123 (1–20)
- Colors, Shapes
- Animals, Vehicles, Dinos
- Weather, Food, Family

**Play** — games with scores and personal bests.

- **Count** — tap each item, voice counts along
- **How Many?** — pick the right number for the items shown
- **Add It Up** — visual addition with three number choices
- **Pop!** — pop floating balloons, streak bonuses, rare rainbow
- **Match** — find the matching emoji
- **Memory** — 4×3 concentration board, six themed sets
- **Dots** — Connect the Dots, seven puzzles with reveal emoji
- **Listen** — hear the clue, find the emoji (audio-only)
- **Spell** — fill the missing letter in a 3-letter word
- **Read** — pick the word that matches the picture
- **Pattern** — what comes next?
- **Find It!** — find the named item among 16 scattered emoji
- **Mix** — combine two paint drops to make the target color
- **Body Parts** — tap the nose / eyes / mouth on a cartoon face
- **Big/Small** — pick the bigger (or smaller) of two
- **Whack!** — whack the critters before they duck back down

**Create** — open-ended creative play.

- **Piano** — rainbow keys, twelve playable songs
- **Drums** — four synthesized drum pads (kick/snare/hi-hat/tom)
- **Doodle** — rainbow or solid-color brushes, eraser, three sizes,
  save the drawing as a PNG
- **Coloring** — ten outline pages with a color palette
- **Story** — seven narrated 4-page picture stories

**Collection**

- **Stickers** — 24 unlockables across every game, with a progress bar
  and an all-stickers finale when you find them all.

## Settings (gear icon in the header)

- Edit the kid's name (used in cheers across every game)
- Mute voice and/or sound effects independently
- Dark mode
- Reset all high scores (two-tap confirm so toddlers can't fire it)

## Behind the scenes

- **PWA**: `manifest.json` + `sw.js` cache every asset so the
  playground keeps working when the iPad's offline.
- **Welcome toast**: time-of-day greeting on app load with a daily
  streak counter once it's 2+ days in a row.
- **Architecture**: each game lives in `games/*.js` and registers on
  `window.Lawson.games`. Shared utilities — audio (`lib/audio.js`),
  high-score storage (`lib/storage.js`), sticker collection
  (`lib/achievements.js`) — are kept in `lib/`.

## Adding a new game

1. Create `games/myname.js` with an IIFE that registers
   `window.Lawson.games.myname = { screen, start, stop }`.
2. Add a `<section id="mynameGame" class="screen">` in `index.html`
   and a tile in the home menu.
3. Drop the script tag at the bottom of `index.html` and add the path
   to `ASSETS` in `sw.js` (bump the cache version).
