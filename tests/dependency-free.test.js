'use strict';
/* AGENTS.md hard rule: "Keep the site dependency-free unless a future task
   explicitly approves a framework." This codifies that as an enforceable
   test instead of something that has to be remembered and manually
   re-checked every session — in particular, the Mana Base Codex was
   deliberately made to run with zero runtime third-party calls (self-
   hosted mana-font, no live Scryfall fetch), and this test makes sure that
   invariant can't quietly regress. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, listHtmlFiles } = require('./helpers');

// Anything the site is allowed to reference by an absolute https:// URL —
// self-referential canonical/breadcrumb URLs (not a network call) and the
// handful of deliberate, explicitly-approved outbound links.
const ALLOWED_HOSTS = new Set([
  'robboles.com',
  'voxmana.io', // intentional outbound project link
  'scryfall.com', // static links and the opt-in Codex card-art preview
  'schema.org',
  'www.w3.org',
  'app.kit.com', // intentional: subscribe form POSTs directly to Kit's public API, no server — see site.js
]);

function hostOf(url) {
  const m = url.match(/^https?:\/\/([^/]+)/i);
  return m ? m[1] : null;
}

test('no live page loads a script or stylesheet from an external CDN', () => {
  const offenders = [];
  for (const file of listHtmlFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)) {
      const url = m[1];
      const host = hostOf(url);
      const isScriptOrStyleContext = /<(script|link)[^>]*(?:src|href)="https?:\/\/[^"]+"/.test(
        text.slice(Math.max(0, m.index - 200), m.index + url.length + 20)
      );
      if (isScriptOrStyleContext && host && !ALLOWED_HOSTS.has(host)) {
        offenders.push(`${path.relative(ROOT, file)} -> ${url}`);
      }
    }
  }
  assert.equal(offenders.length, 0, `external script/stylesheet reference(s):\n${offenders.join('\n')}`);
});

test('every fetch() call in shipped JS targets a local path, not an external host', () => {
  const jsFiles = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (dir === ROOT && ['docs', '.codex', 'content', 'node_modules', 'tests'].includes(entry.name)) continue;
        walk(full);
      } else if (entry.name.endsWith('.js')) {
        jsFiles.push(full);
      }
    }
  })(ROOT);

  const offenders = [];
  for (const file of jsFiles) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/fetch\(\s*(['"`])(https?:\/\/[^'"`]+)\1/g)) {
      const host = hostOf(m[2]);
      if (!ALLOWED_HOSTS.has(host)) offenders.push(`${path.relative(ROOT, file)} -> fetch("${m[2]}")`);
    }
  }
  assert.equal(offenders.length, 0, `external fetch() call(s):\n${offenders.join('\n')}`);
});

test('the Mana Base Codex permits only its cached, lazy Scryfall named-card preview', () => {
  const codexPath = path.join(ROOT, 'table-talk', 'mana-base-codex', 'index.html');
  const text = fs.readFileSync(codexPath, 'utf8');
  const fetchCalls = [...text.matchAll(/fetch\(/g)];
  assert.equal(fetchCalls.length, 1, 'Codex should make exactly one kind of runtime request');
  assert.match(
    text, /fetch\('https:\/\/api\.scryfall\.com\/cards\/named\?exact='\+encodeURIComponent\(key\)\)/,
    'the only request should be Scryfall\'s exact named-card endpoint'
  );
  assert.match(text, /const imageCache=new Map\(\)/, 'preview lookup should be cached per card name');
  assert.match(text, /const SCRYFALL_MIN_INTERVAL_MS=150/, 'preview requests should leave a safe gap');
  assert.match(text, /let scryfallQueue=Promise\.resolve\(\), nextScryfallRequestAt=0/, 'preview requests should be serialized');
  assert.match(text, /nextScryfallRequestAt=Date\.now\(\)\+SCRYFALL_MIN_INTERVAL_MS;\s*const response=await fetch/, 'the safe gap should be set before each request starts');
  // Its font must remain self-hosted, not loaded from a CDN.
  assert.match(
    text, /href="\.\.\/\.\.\/assets\/css\/mana\.css"/,
    'Codex should link the shared self-hosted assets/css/mana.css'
  );
});