// Fails when the locale bundles drift apart, or when a `| translate` key in
// the source has no entry at all.
//
// A missing key is invisible at runtime: ngx-translate renders the key
// itself, so the UI shows `admin.no_links` and nothing crashes. This is the
// only thing that catches it before a user does.
//
//   node tools/check-i18n.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const I18N_DIR = 'public/i18n';
const SRC_DIR = 'src';
const BASE = 'en';

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v !== null && typeof v === 'object' ? flatten(v, key) : [key];
  });
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const bundles = {};
for (const file of readdirSync(I18N_DIR).filter((f) => f.endsWith('.json'))) {
  const lang = file.replace('.json', '');
  bundles[lang] = new Set(flatten(JSON.parse(readFileSync(join(I18N_DIR, file), 'utf8'))));
}

let failed = false;

// 1. every locale carries the same keys as the base locale
const baseKeys = bundles[BASE];
for (const [lang, keys] of Object.entries(bundles)) {
  if (lang === BASE) continue;
  const missing = [...baseKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !baseKeys.has(k));
  if (missing.length) {
    failed = true;
    console.error(`${lang}: missing ${missing.length} key(s):\n  ${missing.join('\n  ')}`);
  }
  if (extra.length) {
    failed = true;
    console.error(`${lang}: ${extra.length} key(s) not in ${BASE}:\n  ${extra.join('\n  ')}`);
  }
}

// 2. every key referenced from the source exists in the base locale
const KEY_RE = /'([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+)'\s*\|\s*translate|instant\(\s*'([^']+)'/g;
const used = new Set();
for (const file of walk(SRC_DIR).filter((f) => f.endsWith('.ts') || f.endsWith('.html'))) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(KEY_RE)) {
    used.add(m[1] ?? m[2]);
  }
}
// Route titles are keys too, but they are plain strings in app.routes.ts.
for (const m of readFileSync(join(SRC_DIR, 'app/app.routes.ts'), 'utf8').matchAll(
  /title:\s*'([^']+)'/g,
)) {
  used.add(m[1]);
}

const unknown = [...used].filter((k) => !baseKeys.has(k));
if (unknown.length) {
  failed = true;
  console.error(`source uses ${unknown.length} key(s) absent from ${BASE}:\n  ${unknown.join('\n  ')}`);
}

if (failed) {
  process.exit(1);
}
console.log(`i18n OK — ${baseKeys.size} keys x ${Object.keys(bundles).length} locales, ${used.size} used in source`);
