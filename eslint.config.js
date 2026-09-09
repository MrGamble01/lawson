// Every script in index.html shares one global scope: lib/*.js and app.js
// define top-level functions that games/*.js call directly (say, beep,
// afterSpeech, onTap, ...). Declare those here so `no-undef` catches a real
// typo instead of every cross-file call.
"use strict";
const fs = require("node:fs");
const path = require("node:path");

function topLevelNames(file) {
  const src = fs.readFileSync(path.join(__dirname, file), "utf8");
  const names = new Set();
  for (const m of src.matchAll(/^(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  return names;
}
const shared = {};
for (const file of ["lib/audio.js", "lib/storage.js", "lib/achievements.js", "lib/tutorial.js", "app.js"]) {
  for (const n of topLevelNames(file)) shared[n] = "readonly";
}

const browser = {};
for (const n of [
  "window", "document", "navigator", "localStorage", "sessionStorage", "console", "location", "history",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame",
  "queueMicrotask", "performance", "URL", "fetch", "Blob", "FileReader", "Image", "Audio", "Option",
  "AudioContext", "webkitAudioContext", "SpeechSynthesisUtterance", "speechSynthesis",
  "MutationObserver", "ResizeObserver", "IntersectionObserver", "CustomEvent", "Event", "KeyboardEvent",
  "PointerEvent", "MouseEvent", "TouchEvent", "DOMRect", "getComputedStyle", "matchMedia", "alert", "confirm",
  "screen", "devicePixelRatio", "innerWidth", "innerHeight", "scrollTo", "requestIdleCallback",
  "HTMLElement", "SVGElement", "Element", "Node", "HTMLCanvasElement", "CanvasRenderingContext2D",
  "self", "caches", "Request", "Response", "structuredClone", "crypto", "atob", "btoa", "TextEncoder", "DOMParser",
]) browser[n] = "readonly";

const node = {};
for (const n of ["require", "module", "exports", "process", "__dirname", "__filename", "Buffer", "setImmediate", "globalThis", "EventTarget", "axe"]) node[n] = "readonly";

const rules = {
  "no-undef": "error",
  "no-redeclare": ["error", { builtinGlobals: false }],
  "no-dupe-keys": "error",
  "no-unreachable": "error",
  // vars: "local" — top-level functions are the cross-file API, used from other scripts.
  "no-unused-vars": ["warn", { vars: "local", args: "none", caughtErrors: "none" }],
  "no-empty": ["warn", { allowEmptyCatch: true }],
  "no-constant-condition": "warn",
};

module.exports = [
  { ignores: ["node_modules/**", "tests/vendor/**", "tests/actual/**"] },
  {
    files: ["app.js", "lib/**/*.js", "games/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: { ...browser, ...shared } },
    rules,
  },
  {
    files: ["sw.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: browser },
    rules,
  },
  {
    files: ["tests/**/*.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "commonjs", globals: { ...node, ...browser } },
    // Tests build fake windows/documents in a vm sandbox; shadowing is the point.
    rules: { ...rules, "no-redeclare": "off", "no-unused-vars": "off" },
  },
];
