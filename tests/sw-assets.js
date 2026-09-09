// The service worker precaches ASSETS on install and `cache.addAll` is
// atomic: one missing file and the worker never installs, silently leaving
// every device on the old build. This check keeps ASSETS, index.html and
// the files on disk in agreement, and keeps the cache name fixed (the
// worker refreshes assets itself; a hand-bumped name is how merge
// conflicts used to start).
//
// Run: node tests/sw-assets.js
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const problems = [];

const assetsSrc = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
if (!assetsSrc) problems.push('sw.js: could not find the ASSETS list');
const assets = new Set(assetsSrc ? [...assetsSrc[1].matchAll(/"(\.\/[^"]*)"/g)].map(m => m[1]) : []);

const cacheName = sw.match(/const CACHE = "([^"]+)"/);
if (!cacheName) problems.push('sw.js: could not find the CACHE name');
else if (/v\d/.test(cacheName[1])) problems.push(`sw.js: CACHE is "${cacheName[1]}" — the name must stay fixed; the worker refreshes assets on its own`);

// Everything index.html loads must be precached.
const referenced = new Set();
for (const m of html.matchAll(/<(?:script|link)[^>]*\b(?:src|href)="([^"]+)"/g)) {
  const p = m[1];
  if (/^(?:https?:)?\/\//.test(p) || p.startsWith('data:')) continue;
  referenced.add('./' + p.replace(/^\.\//, ''));
}
for (const p of referenced) if (!assets.has(p)) problems.push(`index.html loads ${p} but sw.js ASSETS does not precache it`);

// Every precached file must exist.
for (const a of assets) {
  if (a === './') continue;
  if (!fs.existsSync(path.join(ROOT, a))) problems.push(`sw.js ASSETS lists ${a} but it is not on disk`);
}
// Every game and lib file on disk must be precached (a new game that is
// not in ASSETS works online and vanishes offline).
for (const dir of ['games', 'lib']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.js')).sort()) {
    if (!assets.has(`./${dir}/${f}`)) problems.push(`${dir}/${f} is on disk but not in sw.js ASSETS`);
  }
}
for (const must of ['./', './index.html', './manifest.json', './icon.svg']) {
  if (!assets.has(must)) problems.push(`sw.js ASSETS is missing ${must}`);
}

if (problems.length) {
  console.error('FAIL: service worker assets:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`PASS: service worker — ${assets.size} precached assets match index.html and disk; cache name is fixed`);
