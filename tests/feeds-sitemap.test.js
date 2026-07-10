'use strict';
/* feed.xml, rss.xml, and sitemap.xml are hand-maintained alongside
   posts.json (there's no build step that generates them) — meaning they
   silently drift if a post is added/renamed and one of the three files
   gets missed. These tests catch that class of mistake, plus basic XML
   well-formedness. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, assertWellFormedXml } = require('./helpers');

const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'posts.json'), 'utf8'));

for (const file of ['feed.xml', 'rss.xml', 'sitemap.xml']) {
  test(`${file} is well-formed XML`, () => {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.doesNotThrow(() => assertWellFormedXml(text, file));
  });
}

for (const file of ['feed.xml', 'rss.xml']) {
  test(`${file} has an <item> for every post in posts.json`, () => {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const post of posts) {
      const url = `https://robboles.com/posts/${post.slug}/`;
      assert.ok(text.includes(url), `${file} is missing an item for "${post.slug}" (${url})`);
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
