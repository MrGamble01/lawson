// ---------- Story Time ----------
// Short narrated picture stories. Each story has 4 pages; each page is
// a giant emoji scene + a sentence the app speaks. Tap to advance early,
// or wait — the page auto-advances once the line is read.
(function () {
  const L = window.Lawson;

  const STORIES = [
    {
      title: "The Little Duck",
      pages: [
        { scene: "🦆🌊",  text: "Once upon a time, a little duck swam in the pond.",   bg: "linear-gradient(180deg,#a5d8ff,#d0ebff)" },
        { scene: "🦆🍞",  text: "She saw some yummy bread floating on the water.",    bg: "linear-gradient(180deg,#ffd8a8,#ffe8cc)" },
        { scene: "🦆😋",  text: "She nibbled and nibbled until it was all gone!",     bg: "linear-gradient(180deg,#d8f5a2,#e7fad6)" },
        { scene: "🦆💤",  text: "Then she said quack quack and went to sleep.",       bg: "linear-gradient(180deg,#bac8ff,#dbe4ff)" },
      ],
    },
    {
      title: "The Brave Bear",
      pages: [
        { scene: "🐻🍯",  text: "Bear was hungry and found a big pot of honey.",       bg: "linear-gradient(180deg,#fff3bf,#ffec99)" },
        { scene: "🐝🐝",  text: "But the buzzy bees were not happy!",                  bg: "linear-gradient(180deg,#ffe066,#ffd43b)" },
        { scene: "🐻🏃",  text: "Bear ran and ran all the way to the river.",         bg: "linear-gradient(180deg,#b8edff,#c5f6fa)" },
        { scene: "🐻🌈",  text: "He laughed and said, what a sweet adventure!",       bg: "linear-gradient(180deg,#ffd6e7,#fcc2d7)" },
      ],
    },
    {
      title: "The Sleepy Star",
      pages: [
        { scene: "⭐🌙",  text: "High in the sky, a little star was getting sleepy.",  bg: "linear-gradient(180deg,#3b3b6d,#1d1d44)", dark: true },
        { scene: "⭐👋",  text: "She waved goodnight to all her star friends.",        bg: "linear-gradient(180deg,#2c2c5a,#16163a)", dark: true },
        { scene: "⭐☁️",  text: "She floated down into a fluffy cloud bed.",           bg: "linear-gradient(180deg,#9a9adb,#bcbce6)", dark: true },
        { scene: "💫💤",  text: "And dreamed sweet dreams all night long.",            bg: "linear-gradient(180deg,#1a1a3a,#0d0d22)", dark: true },
      ],
    },
    {
      title: "The Hungry Caterpillar",
      pages: [
        { scene: "🐛🍃",  text: "A tiny caterpillar wiggled out of his leaf.",         bg: "linear-gradient(180deg,#d8f5a2,#b2f2bb)" },
        { scene: "🐛🍎",  text: "On Monday he ate one big red apple.",                 bg: "linear-gradient(180deg,#ffd6d6,#ffc9c9)" },
        { scene: "🐛🍓🍌", text: "He kept munching, growing bigger and rounder.",      bg: "linear-gradient(180deg,#fff3bf,#ffe066)" },
        { scene: "🦋🌈",  text: "Until pop! He spread his wings as a butterfly!",      bg: "linear-gradient(180deg,#d0bfff,#c5f6fa)" },
      ],
    },
    {
      title: "Choo-Choo Train",
      pages: [
        { scene: "🚂💨",  text: "Choo choo! The little train left the station.",      bg: "linear-gradient(180deg,#c5f6fa,#a5d8ff)" },
        { scene: "🚂⛰️",  text: "It chugged up and over a tall green mountain.",      bg: "linear-gradient(180deg,#d8f5a2,#a9e34b)" },
        { scene: "🚂🌑",  text: "Whoosh! It zoomed through a dark tunnel.",           bg: "linear-gradient(180deg,#495057,#212529)", dark: true },
        { scene: "🚂🌅",  text: "Finally it pulled into the sunny station. Hooray!",  bg: "linear-gradient(180deg,#ffd8a8,#ffe8cc)" },
      ],
    },
  ];

  let storyIdx = -1;
  let pageIdx = 0;
  let advanceTimer = null;
  let tapAttached = false;

  function renderPage() {
    const story = STORIES[storyIdx];
    const page = story.pages[pageIdx];
    const stage = document.getElementById("storyStage");
    const txt = document.getElementById("storyText");
    const counter = document.getElementById("storyCounter");
    const game = document.getElementById("storyGame");

    if (game) game.style.background = page.bg;
    if (game) game.classList.toggle("story-dark", !!page.dark);
    stage.innerHTML = "";
    const scene = document.createElement("div");
    scene.className = "story-scene";
    scene.textContent = page.scene;
    stage.appendChild(scene);

    txt.textContent = page.text;
    counter.textContent = `${pageIdx + 1} / ${story.pages.length}`;

    L.say(page.text, 0.9);

    // Auto-advance based on text length (~70 wpm). Caps so a single short
    // line still has time to be enjoyed.
    const words = page.text.split(/\s+/).length;
    const ms = Math.max(2800, words * 380);
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(advance, ms);
  }

  function advance() {
    clearTimeout(advanceTimer);
    const story = STORIES[storyIdx];
    if (pageIdx < story.pages.length - 1) {
      pageIdx += 1;
      renderPage();
    } else {
      // Story ends — sparkle, "The end!", and earn a sticker.
      L.happySound();
      L.say(`The end! ${L.cheer()}`);
      const stage = document.getElementById("storyStage");
      const r = stage.getBoundingClientRect();
      for (let k = 0; k < 12; k++) {
        setTimeout(() => L.sparkleAt(
          r.left + r.width / 2 + (Math.random() - 0.5) * 220,
          r.top  + r.height / 2 + (Math.random() - 0.5) * 220,
        ), k * 55);
      }
      L.earnSticker && L.earnSticker("storyteller");
      // Next story after a beat.
      advanceTimer = setTimeout(() => {
        storyIdx = (storyIdx + 1) % STORIES.length;
        pageIdx = 0;
        renderPage();
      }, 2400);
    }
  }

  function start() {
    storyIdx = (storyIdx + 1) % STORIES.length;
    if (storyIdx < 0) storyIdx = 0;
    pageIdx = 0;
    const screen = document.getElementById("storyGame");
    if (screen && !tapAttached) {
      // Tap anywhere on the screen (other than the home button) to advance.
      // Guarded so re-entering the game doesn't stack listeners.
      L.onTap(screen, (e) => {
        if (e.target && e.target.closest && e.target.closest(".home-btn")) return;
        advance();
      });
      tapAttached = true;
    }
    renderPage();
  }
  function stop() {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }

  L.games.story = { screen: "storyGame", start, stop };
})();
