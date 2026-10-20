// Storyteller route, premade-voice allowlist, and static-clip lookup.
// Run: node tests/tts.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const { TTS_DEFAULT_VOICE_ID, normTtsText } = require("../lib/tts-voices");
const { voiceIdForKey, selectedModel, buildSpeechRequest } = require("../api/tts-provider");
const handler = require("../api/tts");
const { extractSpokenLines } = require("../scripts/prebuild-tts");

const SARAH = "EXAVITQu4vr4xnSDxMaL";
const LILY = "pFZP5JQG7iQjIQuC4Bku";
const RACHEL = "21m00Tcm4TlvDq8ikWAM";
const envKeys = ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID", "ELEVENLABS_MODEL", "TTS_PROVIDER", "FISH_API_KEY", "FISH_REFERENCE_ID", "FISH_MODEL", "TTS_RATE_LIMIT"];
const savedEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

function restoreEnv() {
  for (const key of envKeys) {
    if (savedEnv[key] == null) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  handler.resetTtsRateLimit();
}

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: null,
    writableEnded: false,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body) { this.body = body; this.writableEnded = true; },
  };
}

function jsonBody(res) {
  return JSON.parse(Buffer.isBuffer(res.body) ? res.body.toString("utf8") : res.body);
}

(async () => {
  assert.equal(normTtsText("  Hello \n there  "), "Hello there");
  assert.equal(TTS_DEFAULT_VOICE_ID, SARAH);

  delete process.env.ELEVENLABS_VOICE_ID;
  assert.equal(voiceIdForKey("sarah"), SARAH);
  assert.equal(voiceIdForKey("lily"), LILY);
  assert.equal(voiceIdForKey("rachel"), null);
  process.env.ELEVENLABS_VOICE_ID = RACHEL;
  assert.equal(voiceIdForKey("sarah"), SARAH, "a library voice id is ignored");
  process.env.ELEVENLABS_VOICE_ID = LILY;
  assert.equal(voiceIdForKey("sarah"), LILY, "an allowlisted premade id may replace Sarah");
  assert.equal(voiceIdForKey("lily"), LILY);
  delete process.env.ELEVENLABS_VOICE_ID;
  delete process.env.ELEVENLABS_MODEL;
  assert.equal(selectedModel(), "eleven_flash_v2_5");
  process.env.ELEVENLABS_MODEL = "eleven_turbo_v2_5";
  assert.equal(selectedModel(), "eleven_turbo_v2_5");
  process.env.ELEVENLABS_MODEL = "eleven_multilingual_v2";
  assert.equal(selectedModel(), "eleven_flash_v2_5");
  delete process.env.ELEVENLABS_MODEL;

  process.env.ELEVENLABS_API_KEY = "test-key-not-real";
  delete process.env.TTS_PROVIDER;
  const eleven = buildSpeechRequest({ text: "Hello", voiceKey: "sarah" });
  assert.match(eleven.url, /\/text-to-speech\/EXAVITQu4vr4xnSDxMaL\?output_format=mp3_44100_128$/);
  assert.equal(eleven.headers["xi-api-key"], "test-key-not-real");
  assert.equal(eleven.body.model_id, "eleven_flash_v2_5");
  assert.equal(eleven.body.text, "Hello");
  assert.equal(eleven.body.speed, undefined, "speed stays off the request so clips can be cached");
  assert.equal(JSON.stringify(eleven).includes(RACHEL), false);

  process.env.TTS_PROVIDER = "fish";
  process.env.FISH_API_KEY = "fish-key";
  process.env.FISH_REFERENCE_ID = "ref-1";
  process.env.FISH_MODEL = "s2.1-pro";
  const fish = buildSpeechRequest({ text: "Hello", voiceKey: "sarah" });
  assert.equal(fish.url, "https://api.fish.audio/v1/tts");
  assert.equal(fish.headers.Authorization, "Bearer fish-key");
  assert.equal(fish.headers.model, "s2.1-pro");
  assert.equal(fish.headers["xi-api-key"], undefined);
  assert.equal(fish.body.reference_id, "ref-1");
  assert.equal(fish.body.format, "mp3");
  assert.equal(fish.body.mp3_bitrate, 128);
  delete process.env.TTS_PROVIDER;
  delete process.env.FISH_API_KEY;

  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, arrayBuffer: async () => Uint8Array.from({ length: 80 }, (_, i) => i).buffer };
  };

  delete process.env.ELEVENLABS_API_KEY;
  handler.resetTtsRateLimit();
  let res = mockRes();
  await handler({ method: "GET", url: "/api/tts?v=sarah&t=Hello", headers: {} }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(jsonBody(res).error, "unconfigured");
  assert.equal(calls.length, 0, "missing key never calls ElevenLabs");
  assert.equal(JSON.stringify(jsonBody(res)).includes("test-key"), false);

  process.env.ELEVENLABS_API_KEY = "test-key-not-real";
  process.env.TTS_RATE_LIMIT = "20";
  handler.resetTtsRateLimit();
  calls.length = 0;
  res = mockRes();
  await handler({ method: "GET", url: "/api/tts?v=sarah&t=" + encodeURIComponent("  Hello   there "), headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["content-type"], "audio/mpeg");
  assert.equal(res.headers["cache-control"], "public, max-age=31536000, immutable");
  assert.ok(Buffer.isBuffer(res.body) && res.body.length >= 64);
  const sent = JSON.parse(calls[0].init.body);
  assert.equal(sent.text, "Hello there");
  assert.equal(sent.model_id, "eleven_flash_v2_5");
  assert.equal(calls[0].init.headers["xi-api-key"], "test-key-not-real");
  assert.match(calls[0].url, /EXAVITQu4vr4xnSDxMaL/);

  res = mockRes();
  await handler({ method: "POST", url: "/api/tts", headers: {}, body: { v: "lily", t: "Hi" } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(calls.at(-1).url, new RegExp(LILY));

  res = mockRes();
  await handler({ method: "GET", url: "/api/tts?v=rachel&t=Hi", headers: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(jsonBody(res).error, "unknown_voice");

  res = mockRes();
  await handler({ method: "GET", url: "/api/tts?v=sarah&t=" + "a".repeat(501), headers: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(jsonBody(res).error, "too_long");

  res = mockRes();
  await handler({ method: "GET", url: "/api/tts?v=sarah&t=", headers: {} }, res);
  assert.equal(res.statusCode, 400);

  res = mockRes();
  await handler({ method: "PUT", url: "/api/tts", headers: {} }, res);
  assert.equal(res.statusCode, 405);

  global.fetch = async () => ({ ok: false, status: 402, arrayBuffer: async () => Buffer.from('{"detail":{"status":"paid_plan_required"}}') });
  res = mockRes();
  await handler({ method: "GET", url: "/api/tts?v=sarah&t=Hi", headers: {} }, res);
  assert.equal(res.statusCode, 402);
  const denied = jsonBody(res);
  assert.equal(denied.error, "voice_unavailable");
  assert.equal(JSON.stringify(denied).includes("test-key-not-real"), false);
  assert.equal(JSON.stringify(denied).includes("paid_plan_required"), false);

  process.env.TTS_RATE_LIMIT = "1";
  handler.resetTtsRateLimit();
  res = mockRes();
  await handler({ method: "GET", url: "/api/tts?v=sarah&t=Hi", headers: {} }, res);
  res = mockRes();
  await handler({ method: "GET", url: "/api/tts?v=sarah&t=Hi", headers: {} }, res);
  assert.equal(res.statusCode, 429);

  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const bypass = sw.indexOf('url.pathname.startsWith("/api/")');
  const cacheMatch = sw.indexOf("cache.match(req, { ignoreSearch: true })");
  assert.ok(bypass > 0 && bypass < cacheMatch, "api responses bypass the static cache");
  assert.match(sw, /const CACHE = "lawson-static"/);
  assert.match(sw, /\.\/lib\/tts-voices\.js/);
  assert.match(sw, /\.\/audio\/tts\/manifest\.json/);

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "audio/tts/manifest.json"), "utf8"));
  assert.equal(manifest.voiceId, SARAH);
  assert.equal(typeof manifest.lines, "object");

  const lines = extractSpokenLines(ROOT);
  assert.ok(lines.includes("Once upon a time, a little duck swam in the pond."));
  assert.ok(lines.includes("Quack quack!"));
  assert.ok(lines.includes("Dog. Woof woof!"));
  assert.ok(lines.includes("Lots more to explore!"));
  assert.ok(lines.includes("ay, Apple"));
  assert.ok(lines.includes("one"));
  assert.ok(lines.includes("Yellow"));
  assert.ok(lines.includes("Tickly!"));
  assert.equal(lines.includes("Tap balloons to pop them!"), false, "tutorial hints are not spoken");
  assert.equal(lines.some((line) => line.includes("{name}")), false);
  assert.equal(lines.some((line) => line.includes("${")), false);

  // The page plays a static clip when the manifest has the line, asks
  // /api/tts otherwise, and falls back to speechSynthesis when that fails.
  // file:// and offline never call the network (smoke and a11y load that way).
  const fetches = [];
  const spoken = [];
  const audios = [];
  class FakeAudio {
    constructor() {
      this.src = "";
      this.volume = 1;
      this.playbackRate = 1;
      this.paused = true;
      this.currentTime = 0;
      this.playsInline = false;
      audios.push(this);
    }
    setAttribute() {}
    play() { this.paused = false; this.currentTime = 0.1; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const synth = {
    getVoices: () => [{ name: "Samantha", lang: "en-US", voiceURI: "sam", localService: true }],
    addEventListener() {},
    speak: (utterance) => spoken.push(utterance),
    cancel() {},
    speaking: false,
    pending: false,
  };
  const stored = new Map();
  const context = vm.createContext({
    window: { speechSynthesis: synth, AudioContext: class {
      constructor() { this.state = "running"; this.currentTime = 0; this.destination = {}; }
      createGain() { return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} }, connect() { return this; } }; }
      createOscillator() { return { frequency: { value: 0 }, connect() { return { connect() {} }; }, start() {}, stop() {} }; }
      resume() { return Promise.resolve(); }
    }, addEventListener() {}, dispatchEvent() {} },
    document: { hidden: false, addEventListener() {} },
    navigator: { onLine: true, userAgent: "Mozilla/5.0", platform: "MacIntel", maxTouchPoints: 0 },
    location: { protocol: "https:" },
    localStorage: { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: (key) => stored.delete(key) },
    Audio: FakeAudio,
    URL: { createObjectURL: () => "blob:clip", revokeObjectURL() {} },
    URLSearchParams, AbortController,
    fetch: async (url) => {
      fetches.push(String(url));
      if (String(url).includes("manifest.json")) {
        return { ok: true, json: async () => ({ voiceId: SARAH, lines: { Hello: "audio/tts/hello.mp3" } }) };
      }
      if (String(url).includes("Missing")) return { ok: false, status: 503, blob: async () => ({}) };
      return { ok: true, status: 200, blob: async () => ({ size: 80 }) };
    },
    setTimeout: (fn, ms) => {
      const id = ++context._timerSeq;
      context._timers.set(id, { fn, ms: ms || 0 });
      return id;
    },
    clearTimeout: (id) => context._timers.delete(id),
    setInterval: () => 1,
    clearInterval() {},
    SpeechSynthesisUtterance: function SpeechSynthesisUtterance(text) { this.text = text; },
    Event: function Event() {},
    CustomEvent: function CustomEvent() {},
    _timers: new Map(),
    _timerSeq: 0,
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT, "lib/tts-voices.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "lib/audio.js"), "utf8"), context);
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  async function settleCloud() {
    for (let pass = 0; pass < 6; pass++) {
      await flush();
      const due = [];
      for (const [id, timer] of context._timers) {
        if (timer.ms < 1000) due.push(id);
      }
      if (!due.length) return;
      for (const id of due) {
        const timer = context._timers.get(id);
        context._timers.delete(id);
        if (timer) timer.fn();
      }
    }
  }
  const say = (code) => vm.runInContext(code, context);

  const hello = say('say("Hello")');
  await settleCloud();
  assert.equal(spoken.length, 0, "a manifest hit does not use the device voice");
  assert.equal(audios.at(-1).src, "audio/tts/hello.mp3");
  assert.equal(audios.at(-1).playbackRate, 1);
  assert.equal(fetches.some((url) => url.includes("/api/tts")), false);
  audios.at(-1).onended();
  await hello;

  say('setSpeechSpeed("faster")');
  const again = say('say("Hello")');
  await settleCloud();
  assert.equal(fetches.filter((url) => url.includes("manifest.json")).length, 1, "manifest is fetched once");
  assert.ok(Math.abs(audios.at(-1).playbackRate - 1.15) < 1e-9, "storyteller speed is playbackRate");
  audios.at(-1).onended();
  await again;

  const live = say('say("Bye there")');
  await settleCloud();
  assert.ok(fetches.some((url) => url.includes("/api/tts?v=sarah&t=Bye+there")));
  assert.equal(audios.at(-1).src, "blob:clip");
  audios.at(-1).onended();
  await live;

  const before = spoken.length;
  const missed = say('say("Missing clip")');
  await settleCloud();
  assert.ok(spoken.length > before, "a failed request falls back to speechSynthesis");
  spoken.at(-1).onstart && spoken.at(-1).onstart();
  spoken.at(-1).onend && spoken.at(-1).onend();
  await missed;

  const nFetch = fetches.length;
  context.location.protocol = "file:";
  say('say("Hello")');
  await settleCloud();
  assert.equal(fetches.length, nFetch, "file:// does not request cloud audio");
  assert.ok(spoken.length > before);
  context.location.protocol = "https:";
  context.navigator.onLine = false;
  const nFetch2 = fetches.length;
  say('say("Hello")');
  await settleCloud();
  assert.equal(fetches.length, nFetch2, "offline does not request cloud audio");

  restoreEnv();
  console.log("PASS: premade voices, tts route, static clips, cloud playback fallback");
})().catch((err) => {
  restoreEnv();
  console.error(err);
  process.exit(1);
});
