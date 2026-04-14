# Lawson's Learning Playground

A tiny mobile-friendly web app for toddlers. Tap letters, numbers, colors,
shapes, and animals to hear them spoken aloud, pop floating balloons, and
play a picture-matching game.

No build step, no dependencies — just three static files. Open `index.html`
in a browser or host it anywhere that serves static files.

## Activities
- **ABC** — the alphabet, each letter with an example word (A is for Apple…)
- **123** — numbers 1–10
- **Colors** — eight bright colors
- **Shapes** — circle, square, triangle, star, heart, diamond
- **Animals** — twelve animals with their sounds
- **Pop!** — tap floating balloons; the spoken color always matches the balloon
- **Match** — find the matching picture (gets harder after a score of 10)

## Notes
- Tuned for iPad / iPad mini in Safari. Add it to the home screen for a
  fullscreen experience.
- There's a mute toggle in the header for quiet time. The setting is
  remembered across sessions.
- Speech uses the browser's built-in `speechSynthesis`. On iOS the first tap
  anywhere unlocks audio.
