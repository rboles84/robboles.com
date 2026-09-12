'use strict';
/* feed.xml, rss.xml, and sitemap.xml are generated from content-index.json.
   These checks protect the projections' links and basic XML shape. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, assertWellFormedXml } = require('./helpers');
const gen = require('../scripts/build-site-indexes.js');

const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'posts.json'), 'utf8'));
const manifest = gen.loadManifest(path.join(ROOT, 'assets', 'data', 'content-index.json'));
gen.validateManifest(manifest);
const feedWindowPostSlugs = manifest.records
  .filter((record) => record.__effective.include_in_feed)
  .sort(gen.compareDateOrderedThenId)
  .slice(0, 20)
  .filter((record) => record.content_type === 'post')
  .map((record) => record.id.split(':')[1]);

for (const file of ['feed.xml', 'rss.xml', 'sitemap.xml']) {
  test(`${file} is well-formed XML`, () => {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.doesNotThrow(() => assertWellFormedXml(text, file));
  });
}

for (const file of ['feed.xml', 'rss.xml']) {
  test(`${file} has an <item> for every post in the 20-item feed window`, () => {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const slug of feedWindowPostSlugs) {
      const url = `https://robboles.com/posts/${slug}/`;
      assert.ok(text.includes(url), `${file} is missing an item for "${slug}" (${url})`);
    }
  });

  test(`${file} has no dangling <link> that isn't in posts.json`, () => {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const links = [...text.matchAll(/<link>https:\/\/robboles\.com\/posts\/([^/]+)\/<\/link>/g)].map((m) => m[1]);
    const known = new Set(posts.map((p) => p.slug));
    const stale = links.filter((slug) => !known.has(slug));
    assert.equal(stale.length, 0, `${file} references post slug(s) not in posts.json: ${stale.join(', ')}`);
  });
}

test('sitemap.xml includes every post URL', () => {
  const text = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  for (const post of posts) {
    const url = `https://robboles.com/posts/${post.slug}/`;
    assert.ok(text.includes(`<loc>${url}</loc>`), `sitemap.xml is missing "${post.slug}"`);
  }
});

test('every <loc> in sitemap.xml points to a real local file', () => {
  const text = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const locs = [...text.matchAll(/<loc>https:\/\/robboles\.com\/(.*?)<\/loc>/g)].map((m) => m[1]);
  for (const loc of locs) {
    const rel = loc.endsWith('/') || loc === '' ? loc + 'index.html' : loc;
    const target = path.join(ROOT, rel);
    assert.ok(fs.existsSync(target), `sitemap.xml <loc> "${loc}" has no matching file at ${target}`);
  }
});
