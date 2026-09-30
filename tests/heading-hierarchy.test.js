'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./helpers');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const routes = ['index.html','articles/index.html','field-kit/index.html','learning-lab/index.html','magic-math/index.html','magic-math/tutor-free-structure/index.html','projects/index.html','qa-field-guide/index.html','search/index.html','table-talk/index.html','table-talk/mana-base-codex/index.html'];

test('RBB-072: affected static documents and generated/runtime titles preserve heading depth', () => {
  for (const file of routes) {
    const html = read(file).replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
    let previous = 0;
    for (const match of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)) {
      const rank = Number(match[1]);
      assert.ok(!previous || rank <= previous + 1, `${file}: h${previous} -> h${rank}: ${match[2]}`);
      previous = rank;
    }
  }
  const site = read('assets/js/site.js');
  const search = site.slice(site.indexOf('const searchRoot'), site.indexOf('const searchRoot') + 6500);
  assert.match(search, /'<h2><a href="' \+ href/);
  assert.doesNotMatch(search, /<h3\b/);

  for (const [file, marker, rank] of [['articles/index.html','ARTICLES_LIST',2],['learning-lab/index.html','LEARNING_LAB_LIST',3],['table-talk/index.html','TABLE_TALK_LIST',3]]) {
    const html = read(file);
    const region = html.match(new RegExp(`<!-- GENERATED:${marker}:START[^>]*-->([\\s\\S]*?)<!-- GENERATED:${marker}:END -->`));
    assert.ok(region, `${file}: marker-owned listing exists`);
    const headings = [...region[1].matchAll(/<h([1-6])\b/g)];
    assert.ok(headings.length > 0, `${file}: populated listing`);
    assert.ok(headings.every(m => Number(m[1]) === rank), `${file}: cards are h${rank}`);
  }
  const producer = read('scripts/build-site-indexes.js');
  assert.match(producer, /const heading = opts\.headingLevel === 2 \? 'h2' : 'h3'/);
  assert.match(producer, /function buildArticlesRegion[\s\S]*?renderPostCard\(r, indent, \{ headingLevel: 2 \}\)/);
  const tutor = read('magic-math/tutor-free-structure/index.html');
  assert.equal((tutor.match(/<h3 class="example-title">/g) || []).length, 11);
  assert.match(read('scripts/build-tutor-free-structure.js'), /<h3 class="example-title">/);
  const explorer = read('magic-math/tutor-free-structure/explorer.js');
  const upgrade = explorer.slice(explorer.indexOf('function upgradeStaticTriggers()'), explorer.indexOf('// Prose references'));
  assert.match(upgrade, /card\.querySelector\('\.example-title'\)/);
  assert.doesNotMatch(upgrade, /querySelector\(['"]h4['"]\)/);
});
