// Pre-generate MP3s for lines that do not include the child's name.
// Reads ELEVENLABS_API_KEY from the environment or a local .env file.
// Skips clips that already exist, so a quota error can be re-run.
//
//   npm run tts:build
"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { TTS_DEFAULT_VOICE_ID, TTS_MAX_CHARS, normTtsText } = require("../lib/tts-voices");
const { elevenLabsSpeechRequest, selectedModel } = require("../api/tts-provider");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "audio", "tts");
const MANIFEST = path.join(OUT_DIR, "manifest.json");

function loadEnvFile() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || Object.prototype.hasOwnProperty.call(process.env, match[1])) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function parseJsString(src, index) {
  const quote = src[index];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;
  let value = "";
  for (let i = index + 1; i < src.length; i++) {
    const ch = src[i];
    if (ch === "\\") {
      const next = src[i + 1];
      const map = { n: "\n", r: "\r", t: "\t", "\\": "\\", "'": "'", '"': '"', "`": "`" };
      value += Object.prototype.hasOwnProperty.call(map, next) ? map[next] : (next || "");
      i += 1;
      continue;
    }
    if (quote === "`" && ch === "$" && src[i + 1] === "{") return { skip: true };
    if (ch === quote) return { value, end: i + 1 };
    value += ch;
  }
  return null;
}

function collectPattern(src, re, add) {
  let match;
  while ((match = re.exec(src))) {
    const parsed = parseJsString(src, match.index + match[0].length);
    if (!parsed || parsed.skip) continue;
    add(parsed.value);
  }
}

function mapConst(src, name) {
  const match = src.match(new RegExp(`const ${name} = \\{([\\s\\S]*?)\\};`));
  const map = {};
  if (!match) return map;
  const re = /([A-Za-z0-9]+)\s*:\s*(["'])([^"']*)\2/g;
  let item;
  while ((item = re.exec(match[1]))) map[item[1]] = item[3];
  return map;
}

function extractSpokenLines(root = ROOT) {
  const lines = new Set();
  const add = (text) => {
    if (text == null) return;
    if (String(text).includes("${") || String(text).includes("{name}")) return;
    const norm = normTtsText(text);
    if (!norm || norm.length > TTS_MAX_CHARS) return;
    lines.add(norm);
  };
  const appPath = path.join(root, "app.js");
  const storyPath = path.join(root, "games", "story.js");
  for (const file of sourceFilesFrom(root)) {
    const src = fs.readFileSync(file, "utf8");
    collectPattern(src, /\b(?:sayPrompt|say)\s*\(\s*/g, add);
    if (file === storyPath) collectPattern(src, /\b(?:text|sound)\s*:\s*/g, add);
  }
  if (fs.existsSync(appPath)) {
    const src = fs.readFileSync(appPath, "utf8");
    const row = /^\s*\{[^\n]*\bname:\s*(["'])([^"']+)\1[^\n]*\}/gm;
    let item;
    while ((item = row.exec(src))) {
      const body = item[0];
      const name = item[2];
      const sound = body.match(/\bsound:\s*(["'])([^"']+)\1/);
      if (sound) add(`${name}. ${sound[2]}`);
      else if (/\b(?:emoji|hex):/.test(body)) add(name);
    }
    const sounds = mapConst(src, "LETTER_SOUND");
    const words = mapConst(src, "LETTER_WORD");
    for (const key of Object.keys(sounds)) if (words[key]) add(`${sounds[key]}, ${words[key]}`);
    for (const word of Object.values(mapConst(src, "NUMBER_WORD"))) add(word);
    const hubs = src.match(/const HUB_INTROS = \{([\s\S]*?)\n\}/);
    if (hubs) collectPattern(hubs[1], /:\s*/g, add);
  }
  return [...lines].sort();
}

function sourceFilesFrom(root) {
  const files = [path.join(root, "app.js")];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".js")) files.push(full);
    }
  };
  walk(path.join(root, "lib"));
  walk(path.join(root, "games"));
  return files;
}

function clipName(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16) + ".mp3";
}

function syncServiceWorker(files) {
  const swPath = path.join(ROOT, "sw.js");
  let sw = fs.readFileSync(swPath, "utf8");
  const want = files.map((file) => `./audio/tts/${file}`).sort();
  sw = sw.replace(/const ASSETS = \[([\s\S]*?)\];/, (full, body) => {
    const kept = body.split("\n").filter((line) => !line.includes("./audio/tts/"));
    while (kept.length && kept[kept.length - 1].trim() === "") kept.pop();
    const entries = want.map((file) => `  "${file}",`);
    return `const ASSETS = [${kept.join("\n")}\n${entries.join("\n")}\n];`;
  });
  if (!sw.includes('const CACHE = "lawson-static"')) {
    throw new Error("refusing to rewrite sw.js: cache name is missing");
  }
  fs.writeFileSync(swPath, sw);
}

function writeManifest(lines) {
  const sorted = {};
  for (const key of Object.keys(lines).sort()) sorted[key] = lines[key];
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify({ voiceId: TTS_DEFAULT_VOICE_ID, lines: sorted }, null, 2) + "\n");
}

async function main() {
  loadEnvFile();
  const lines = extractSpokenLines(ROOT);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pending = [];
  const have = {};
  let pendingChars = 0;
  let savedChars = 0;
  for (const text of lines) {
    const file = clipName(text);
    const full = path.join(OUT_DIR, file);
    if (fs.existsSync(full) && fs.statSync(full).size > 64) {
      have[text] = `audio/tts/${file}`;
      savedChars += text.length;
    } else {
      pending.push({ text, file, full });
      pendingChars += text.length;
    }
  }
  console.log(`Fixed lines: ${lines.length}`);
  console.log(`Characters: ${savedChars + pendingChars} (${pendingChars} still to generate, ${savedChars} already on disk)`);
  console.log(`Voice: Sarah ${TTS_DEFAULT_VOICE_ID}  model: ${selectedModel()}`);
  if (process.env.ELEVENLABS_VOICE_ID && process.env.ELEVENLABS_VOICE_ID !== TTS_DEFAULT_VOICE_ID) {
    console.log("Prebuilt clips stay on Sarah so they match the app. ELEVENLABS_VOICE_ID only affects live lines.");
  }
  if (!pending.length) {
    writeManifest(have);
    syncServiceWorker(["manifest.json", ...Object.values(have).map((rel) => path.basename(rel))]);
    console.log("Nothing to generate.");
    return;
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    writeManifest(have);
    syncServiceWorker(["manifest.json", ...Object.values(have).map((rel) => path.basename(rel))]);
    console.log("ELEVENLABS_API_KEY is not set. Set it and re-run `npm run tts:build`.");
    return;
  }
  let wrote = 0;
  for (const item of pending) {
    const request = elevenLabsSpeechRequest({
      text: item.text,
      voiceId: TTS_DEFAULT_VOICE_ID,
      apiKey: process.env.ELEVENLABS_API_KEY,
      model: selectedModel(),
    });
    let response;
    try {
      response = await fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(request.body),
      });
    } catch (err) {
      writeManifest(have);
      syncServiceWorker(["manifest.json", ...Object.values(have).map((rel) => path.basename(rel))]);
      console.error(`Network error after ${wrote} new clips. Re-run to continue.`);
      process.exitCode = 1;
      return;
    }
    if (!response.ok) {
      let code = "";
      try {
        const detail = await response.json();
        code = detail && detail.detail && (detail.detail.status || detail.detail.code) || "";
      } catch (_) {}
      writeManifest(have);
      syncServiceWorker(["manifest.json", ...Object.values(have).map((rel) => path.basename(rel))]);
      console.error(`ElevenLabs HTTP ${response.status}${code ? " " + code : ""} after ${wrote} new clips. Progress kept. Re-run to continue.`);
      process.exitCode = 1;
      return;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 64) {
      writeManifest(have);
      syncServiceWorker(["manifest.json", ...Object.values(have).map((rel) => path.basename(rel))]);
      console.error(`Empty audio after ${wrote} new clips. Progress kept.`);
      process.exitCode = 1;
      return;
    }
    fs.writeFileSync(item.full, bytes);
    have[item.text] = `audio/tts/${item.file}`;
    wrote += 1;
    writeManifest(have);
    if (wrote % 25 === 0) console.log(`saved ${wrote}/${pending.length}`);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  syncServiceWorker(["manifest.json", ...Object.values(have).map((rel) => path.basename(rel))]);
  console.log(`Saved ${wrote} clips.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err && err.message ? err.message : "tts prebuild failed");
    process.exit(1);
  });
}

module.exports = { extractSpokenLines, clipName };
