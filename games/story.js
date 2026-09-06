// ---------- Story Time ----------
// Short narrated picture stories. Each story has 4 pages. Each page is
// a scene of one or more tappable characters that say their own sound
// or word when poked, plus a narrated sentence. The page auto-advances
// once the storyteller has actually finished the line (plus a beat to
// poke around); tapping the background also advances.
// Tapping a character plays its sound and wiggles it, but does NOT
// advance — so the kid can poke around and explore the scene. If the
// poke cut the storyteller off mid-line, the line is read again once
// the character has had its say, the way a parent picks a sentence
// back up after answering "what's that?".
(function () {
  const L = window.Lawson;

  // Each scene character: e=emoji, x/y in percent of stage, sound (or
  // word) the app speaks when tapped. Positions are arranged so two
  // or three characters don't overlap on phone-width screens.
  const STORIES = [
    {
      title: "The Little Duck",
      pages: [
        {
          text: "Once upon a time, a little duck swam in the pond.",
          bg: "linear-gradient(180deg,#a5d8ff,#d0ebff)",
          scene: [
            { e: "🦆", sound: "Quack quack!",    x: 32, y: 50 },
            { e: "🌊", sound: "Splash splash!",  x: 70, y: 65 },
          ],
        },
        {
          text: "She saw some yummy bread floating on the water.",
          bg: "linear-gradient(180deg,#ffd8a8,#ffe8cc)",
          scene: [
            { e: "🦆", sound: "Quack!",          x: 28, y: 55 },
            { e: "🍞", sound: "Yummy bread!",    x: 70, y: 50 },
          ],
        },
        {
          text: "She nibbled and nibbled until it was all gone!",
          bg: "linear-gradient(180deg,#d8f5a2,#e7fad6)",
          scene: [
            { e: "🦆", sound: "Nibble nibble!",  x: 35, y: 50 },
            { e: "😋", sound: "Mmm yummy!",      x: 70, y: 55 },
          ],
        },
        {
          text: "Then she said quack quack and went to sleep.",
          bg: "linear-gradient(180deg,#bac8ff,#dbe4ff)",
          scene: [
            { e: "🦆", sound: "Quack quack!",    x: 35, y: 55 },
            { e: "💤", sound: "Sleepy time...",  x: 68, y: 45 },
          ],
        },
      ],
    },
    {
      title: "The Brave Bear",
      pages: [
        {
          text: "Bear was hungry and found a big pot of honey.",
          bg: "linear-gradient(180deg,#fff3bf,#ffec99)",
          scene: [
            { e: "🐻", sound: "Grrr! I'm hungry!", x: 32, y: 55 },
            { e: "🍯", sound: "Sticky honey!",     x: 70, y: 50 },
          ],
        },
        {
          text: "But the buzzy bees were not happy!",
          bg: "linear-gradient(180deg,#ffe066,#ffd43b)",
          scene: [
            { e: "🐝", sound: "Buzz buzz!",        x: 30, y: 45 },
            { e: "🐝", sound: "Bzzzz!",            x: 70, y: 55 },
          ],
        },
        {
          text: "Bear ran and ran all the way to the river.",
          bg: "linear-gradient(180deg,#b8edff,#c5f6fa)",
          scene: [
            { e: "🐻", sound: "Run run!",          x: 30, y: 55 },
            { e: "🏃", sound: "Whoosh!",           x: 60, y: 50 },
            { e: "🌊", sound: "Splash!",           x: 82, y: 65 },
          ],
        },
        {
          text: "He laughed and said, what a sweet adventure!",
          bg: "linear-gradient(180deg,#ffd6e7,#fcc2d7)",
          scene: [
            { e: "🐻", sound: "Hehehe!",           x: 35, y: 55 },
            { e: "🌈", sound: "Pretty rainbow!",   x: 70, y: 45 },
          ],
        },
      ],
    },
    {
      title: "The Sleepy Star",
      pages: [
        {
          text: "High in the sky, a little star was getting sleepy.",
          bg: "linear-gradient(180deg,#3b3b6d,#1d1d44)",
          dark: true,
          scene: [
            { e: "⭐", sound: "Twinkle twinkle!",  x: 35, y: 45 },
            { e: "🌙", sound: "Goodnight moon!",   x: 70, y: 35 },
          ],
        },
        {
          text: "She waved goodnight to all her star friends.",
          bg: "linear-gradient(180deg,#2c2c5a,#16163a)",
          dark: true,
          scene: [
            { e: "⭐", sound: "Twinkle!",          x: 30, y: 50 },
            { e: "✨", sound: "Sparkle!",          x: 55, y: 35 },
            { e: "⭐", sound: "Goodnight!",        x: 75, y: 55 },
          ],
        },
        {
          text: "She floated down into a fluffy cloud bed.",
          bg: "linear-gradient(180deg,#9a9adb,#bcbce6)",
          dark: true,
          scene: [
            { e: "⭐", sound: "So sleepy...",      x: 35, y: 40 },
            { e: "☁️", sound: "Soft cloud!",       x: 68, y: 60 },
          ],
        },
        {
          text: "And dreamed sweet dreams all night long.",
          bg: "linear-gradient(180deg,#1a1a3a,#0d0d22)",
          dark: true,
          scene: [
            { e: "💫", sound: "Sweet dreams!",     x: 35, y: 50 },
            { e: "💤", sound: "Zzz...",            x: 70, y: 45 },
          ],
        },
      ],
    },
    {
      title: "The Hungry Caterpillar",
      pages: [
        {
          text: "A tiny caterpillar wiggled out of his leaf.",
          bg: "linear-gradient(180deg,#d8f5a2,#b2f2bb)",
          scene: [
            { e: "🐛", sound: "Wiggle wiggle!",    x: 35, y: 60 },
            { e: "🍃", sound: "Crunchy leaf!",     x: 70, y: 50 },
          ],
        },
        {
          text: "On Monday he ate one big red apple.",
          bg: "linear-gradient(180deg,#ffd6d6,#ffc9c9)",
          scene: [
            { e: "🐛", sound: "Munch munch!",      x: 32, y: 55 },
            { e: "🍎", sound: "Crunch! Apple!",    x: 68, y: 50 },
          ],
        },
        {
          text: "He kept munching, growing bigger and rounder.",
          bg: "linear-gradient(180deg,#fff3bf,#ffe066)",
          scene: [
            { e: "🐛", sound: "Yum!",              x: 28, y: 55 },
            { e: "🍓", sound: "Sweet strawberry!", x: 55, y: 45 },
            { e: "🍌", sound: "Banana!",           x: 80, y: 55 },
          ],
        },
        {
          text: "Until pop! He spread his wings as a butterfly!",
          bg: "linear-gradient(180deg,#d0bfff,#c5f6fa)",
          scene: [
            { e: "🦋", sound: "Flutter flutter!",  x: 38, y: 45 },
            { e: "🌈", sound: "Pretty rainbow!",   x: 72, y: 50 },
          ],
        },
      ],
    },
    {
      title: "Choo-Choo Train",
      pages: [
        {
          text: "Choo choo! The little train left the station.",
          bg: "linear-gradient(180deg,#c5f6fa,#a5d8ff)",
          scene: [
            { e: "🚂", sound: "Choo choo!",        x: 35, y: 55 },
            { e: "💨", sound: "Whoosh!",           x: 70, y: 60 },
          ],
        },
        {
          text: "It chugged up and over a tall green mountain.",
          bg: "linear-gradient(180deg,#d8f5a2,#a9e34b)",
          scene: [
            { e: "🚂", sound: "Chug chug!",        x: 30, y: 60 },
            { e: "⛰️", sound: "Big mountain!",     x: 70, y: 45 },
          ],
        },
        {
          text: "Whoosh! It zoomed through a dark tunnel.",
          bg: "linear-gradient(180deg,#495057,#212529)",
          dark: true,
          scene: [
            { e: "🚂", sound: "Whoosh!",           x: 35, y: 55 },
            { e: "🌑", sound: "Dark tunnel!",      x: 70, y: 50 },
          ],
        },
        {
          text: "Finally it pulled into the sunny station. Hooray!",
          bg: "linear-gradient(180deg,#ffd8a8,#ffe8cc)",
          scene: [
            { e: "🚂", sound: "Choo choo!",        x: 32, y: 55 },
            { e: "🌅", sound: "Sunny sunset!",     x: 70, y: 45 },
          ],
        },
      ],
    },
    {
      title: "The Helpful Bee",
      pages: [
        {
          text: "A friendly bee buzzed from flower to flower.",
          bg: "linear-gradient(180deg,#fff3bf,#ffe066)",
          scene: [
            { e: "🐝", sound: "Buzz buzz!",        x: 32, y: 50 },
            { e: "🌸", sound: "Pretty flower!",    x: 70, y: 55 },
          ],
        },
        {
          text: "She tickled each petal and gathered sweet pollen.",
          bg: "linear-gradient(180deg,#fff0a3,#ffc078)",
          scene: [
            { e: "🐝", sound: "Bzzz!",             x: 30, y: 50 },
            { e: "🌸", sound: "Tickle tickle!",    x: 55, y: 60 },
            { e: "🌺", sound: "So pretty!",        x: 80, y: 45 },
          ],
        },
        {
          text: "She flew home to the hive to share with her friends.",
          bg: "linear-gradient(180deg,#ffe066,#fab005)",
          scene: [
            { e: "🐝", sound: "Buzz home!",        x: 32, y: 55 },
            { e: "🏠", sound: "Sweet home!",       x: 70, y: 50 },
          ],
        },
        {
          text: "Together they made the sweetest honey in town!",
          bg: "linear-gradient(180deg,#ffd8a8,#ffe8cc)",
          scene: [
            { e: "🍯", sound: "Yummy honey!",      x: 35, y: 55 },
            { e: "😋", sound: "Mmm sweet!",        x: 70, y: 45 },
          ],
        },
      ],
    },
    {
      title: "The Lost Puppy",
      pages: [
        {
          text: "A little puppy got lost in the rainy park.",
          bg: "linear-gradient(180deg,#a5d8ff,#74c0fc)",
          scene: [
            { e: "🐶", sound: "Woof woof!",        x: 35, y: 55 },
            { e: "🌧️", sound: "Pitter patter!",   x: 70, y: 45 },
          ],
        },
        {
          text: "A kind bird showed him the way back home.",
          bg: "linear-gradient(180deg,#d0ebff,#bac8ff)",
          scene: [
            { e: "🐶", sound: "Where am I?",       x: 32, y: 55 },
            { e: "🐦", sound: "Tweet tweet!",      x: 70, y: 45 },
          ],
        },
        {
          text: "He ran fast, faster, fastest through the puddles.",
          bg: "linear-gradient(180deg,#c5f6fa,#99e9f2)",
          scene: [
            { e: "🐶", sound: "Run run!",          x: 32, y: 55 },
            { e: "🏃", sound: "Whoosh!",           x: 60, y: 50 },
            { e: "💦", sound: "Splash!",           x: 82, y: 60 },
          ],
        },
        {
          text: "Home at last! Mom gave him the warmest hug.",
          bg: "linear-gradient(180deg,#ffd6d6,#ffc9c9)",
          scene: [
            { e: "🐶", sound: "Happy puppy!",      x: 32, y: 55 },
            { e: "🏠", sound: "Home sweet home!",  x: 70, y: 50 },
          ],
        },
      ],
    },
  ];

  let storyIdx = -1;
  let pageIdx = 0;
  let advanceTimer = null;
  let tapAttached = false;
  let active = false;
  // True between "The end!" and the next story starting, so a story that
  // was interrupted at its ending resumes with a fresh story rather than
  // replaying the ending (and its sticker fanfare) a second time.
  let atEnd = false;
  // Bumped every time a page is shown, so a narration that finishes late
  // (after the kid tapped ahead, or after leaving the game) can't advance
  // a page it doesn't belong to.
  let pageSeq = 0;
  // Per page: whether the storyteller has got to the end of the line
  // uninterrupted yet, which reading attempt is current (a poke cuts one
  // off and a later attempt replaces it), and which poke is the latest
  // (rapid pokes should trigger one re-read, after the last of them).
  let lineHeard = false;
  let readingId = 0;
  let pokeId = 0;
  let pageShownAt = 0;

  // Pacing. The storyteller voice is chosen by the parent (or the device),
  // so how long a line takes to read varies a lot: enhanced voices are
  // slower, online voices start late. Rather than guess from word count,
  // wait for the speech engine to report the line finished, then hold the
  // page for a beat so the kid can poke the scene. Word count still sets
  // a floor (never flip pages faster than a toddler can look) and a
  // ceiling (iOS sometimes never fires `end`, so don't hang forever).
  const POKE_BEAT_MS = 1200;
  // After "The end!" (and, the first time, the sticker announcement) has
  // been heard: a beat before the next story, and a ceiling in case the
  // speech engine never reports the ending finished.
  const END_BEAT_MS = 1500;
  const END_MAX_MS = 9000;
  // Cancels the "next story" that is waiting for the ending (and, the
  // first time, the sticker announcement that follows it) to be heard.
  let cancelNext = null;
  function clearNext() { if (cancelNext) cancelNext(); cancelNext = null; }
  function pacing(text) {
    const words = text.split(/\s+/).filter(Boolean).length;
    const minMs = Math.max(3800, words * 380 + POKE_BEAT_MS);
    return { minMs, maxMs: minMs * 2 + 4000 };
  }

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

    // Render each character as an absolutely positioned tappable
    // button. Tapping plays its sound + wiggles it — but doesn't
    // advance the page (that's reserved for the background tap or
    // the auto-advance timer).
    page.scene.forEach((ch, i) => {
      const btn = document.createElement("button");
      btn.className = "story-character";
      btn.textContent = ch.e;
      btn.style.left = ch.x + "%";
      btn.style.top  = ch.y + "%";
      btn.style.animationDelay = (i * 110) + "ms";
      btn.setAttribute("aria-label", ch.sound || ch.e);
      L.onTap(btn, (e) => {
        if (e.stopPropagation) e.stopPropagation();
        L.beep(420 + Math.random() * 280, 0.1, "triangle");
        L.haptic(8);
        if (ch.sound) poke(ch.sound);
        btn.classList.remove("wiggle");
        void btn.offsetWidth;
        btn.classList.add("wiggle");
      });
      stage.appendChild(btn);
    });

    txt.textContent = page.text;
    counter.textContent = `${pageIdx + 1} / ${story.pages.length}`;

    atEnd = false;
    lineHeard = false;
    const seq = ++pageSeq;
    const { minMs, maxMs } = pacing(page.text);
    pageShownAt = Date.now();
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(advance, maxMs);
    readLine(page.text, seq, pageShownAt, minMs);
  }

  // Read the page's line. Once it has been spoken to the end (or at once
  // when voice is muted), hold the page for the poke beat — but never
  // shorter than the word-count floor. A reading that gets cut off by a
  // poke is superseded (readingId moves on) and schedules nothing; the
  // poke's own follow-up decides whether to read the line again. The
  // ceiling armed by renderPage() still bounds a page that keeps getting
  // poked.
  function readLine(text, seq, shownAt, minMs) {
    const id = ++readingId;
    Promise.resolve(L.say(text, 0.9)).then(() => {
      if (seq !== pageSeq || id !== readingId || advanceTimer === null) return;
      lineHeard = true;
      const elapsed = Date.now() - shownAt;
      const wait = Math.max(POKE_BEAT_MS, minMs - elapsed);
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(advance, wait);
    });
  }

  // A character was poked: say its sound now (this cuts off whatever the
  // storyteller was saying), then, if the page's line hadn't been heard
  // to the end yet, read it again from the top — unless the kid has
  // poked again meanwhile (the newest poke owns the re-read), the page
  // has moved on, or the story is sitting on "The end!" (re-reading the
  // last line there would run the ending a second time).
  function poke(sound) {
    const seq = pageSeq;
    const id = ++pokeId;
    const story = STORIES[storyIdx];
    const page = story && story.pages[pageIdx];
    const shownAt = pageShownAt;
    if (!lineHeard) readingId += 1; // the reading in flight is being cut off
    Promise.resolve(L.say(sound, 0.95)).then(() => {
      if (seq !== pageSeq || id !== pokeId || lineHeard || atEnd || !page) return;
      readLine(page.text, seq, shownAt, pacing(page.text).minMs);
    });
  }

  function advance() {
    clearTimeout(advanceTimer);
    // Whatever the current page's narration does from here on is moot;
    // in particular, "The end!" below cuts the last line short, and that
    // must not re-trigger the ending.
    pageSeq += 1;
    const story = STORIES[storyIdx];
    if (pageIdx < story.pages.length - 1) {
      pageIdx += 1;
      renderPage();
    } else {
      // Story ends — sparkle, "The end!", and earn a sticker.
      L.happySound();
      const stage = document.getElementById("storyStage");
      const r = stage.getBoundingClientRect();
      for (let k = 0; k < 12; k++) {
        setTimeout(() => L.sparkleAt(
          r.left + r.width / 2 + (Math.random() - 0.5) * 220,
          r.top  + r.height / 2 + (Math.random() - 0.5) * 220,
        ), k * 55);
      }
      atEnd = true;
      const seq = pageSeq;
      const still = () => seq === pageSeq && atEnd && advanceTimer !== null;
      advanceTimer = setTimeout(nextStory, END_MAX_MS);
      // Let "The end!" and the cheer be heard in full. Only then award
      // the sticker: its announcement ("Sticker! ...") goes through the
      // same speech layer and would otherwise cut the ending off. Wait
      // for that line too, then a beat, then the next story.
      Promise.resolve(L.say(`The end! ${L.cheer()}`)).then(() => {
        if (!still()) return;
        L.earnSticker && L.earnSticker("storyteller");
        // The announcement starts a beat after the award; afterSpeech()
        // waits for it (and anything else that starts meanwhile) before
        // the beat and the next story. The ceiling above still bounds it.
        clearNext();
        cancelNext = L.afterSpeech(() => { if (still()) nextStory(); },
          { beatMs: END_BEAT_MS, minMs: END_BEAT_MS, maxMs: END_MAX_MS });
      });
    }
  }

  function nextStory() {
    clearNext();
    storyIdx = (storyIdx + 1) % STORIES.length;
    pageIdx = 0;
    renderPage();
  }

  // The app went to the background (screen lock, app switch): the audio
  // layer has already silenced the narration. Freeze the page so it
  // doesn't churn ahead unheard; whatever narration was in flight is
  // now stale.
  function freeze() {
    if (!active) return;
    clearNext();
    clearTimeout(advanceTimer);
    advanceTimer = null;
    pageSeq += 1;
  }
  // Back in the foreground: read the current page again from the top
  // (or, if the story had just ended, move on to the next one).
  function thaw() {
    if (!active) return;
    if (atEnd) nextStory();
    else renderPage();
  }
  window.addEventListener("lawson:audiohidden", freeze);
  window.addEventListener("lawson:audiovisible", thaw);

  function start() {
    storyIdx = (storyIdx + 1) % STORIES.length;
    if (storyIdx < 0) storyIdx = 0;
    pageIdx = 0;
    active = true;
    const screen = document.getElementById("storyGame");
    if (screen && !tapAttached) {
      // Tap the background to advance. Tapping a story-character
      // stopPropagation()s, so the screen handler never fires for
      // character pokes — those just play the character's sound.
      L.onTap(screen, (e) => {
        if (!e.target || !e.target.closest) return;
        if (e.target.closest(".home-btn")) return;
        if (e.target.closest(".story-character")) return;
        advance();
      });
      tapAttached = true;
    }
    renderPage();
  }
  function stop() {
    active = false;
    clearNext();
    atEnd = false;
    clearTimeout(advanceTimer);
    advanceTimer = null;
    pageSeq += 1;
  }

  L.games.story = { screen: "storyGame", start, stop };
})();
