'use strict';
/* posts.json is the site's one real "data layer" — every listing page
   (home, articles/, category pages, search) reads from it. These tests
   catch the kind of mistake that's easy to make by hand: a typo'd slug
   that doesn't match a real posts/ folder, a missing field, a bad date. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./helpers');

const POSTS_JSON = path.join(ROOT, 'assets', 'data', 'posts.json');
const posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8'));

test('posts.json parses as an array with at least one entry', () => {
  assert.ok(Array.isArray(posts));
  assert.ok(posts.length > 0);
});

test('every post has all required fields with the right shape', () => {
  const required = {
    slug: 'string',
    title: 'string',
    date: 'string',
    category: 'string',
    lane: 'string',
    description: 'string',
    promise: 'string',
    reading_minutes: 'number',
  };
  for (const post of posts) {
    for (const [field, type] of Object.entries(required)) {
      assert.ok(field in post, `post "${post.slug || '?'}" is missing field "${field}"`);
      assert.equal(
        typeof post[field], type,
        `post "${post.slug}" field "${field}" should be ${type}, got ${typeof post[field]}`
      );
    }
    assert.ok(Array.isArray(post.tags) && post.tags.length > 0, `post "${post.slug}" needs a non-empty tags array`);
    assert.ok(post.tags.every((t) => typeof t === 'string'), `post "${post.slug}" has a non-string tag`);
    assert.ok(post.reading_minutes > 0, `post "${post.slug}" reading_minutes should be positive`);
  }
});

test('every post date is a valid, real calendar date in YYYY-MM-DD form', () => {
  for (const post of posts) {
    assert.match(post.date, /^\d{4}-\d{2}-\d{2}$/, `post "${post.slug}" date "${post.date}" isn't YYYY-MM-DD`);
    const d = new Date(post.date + 'T00:00:00Z');
    assert.ok(!Number.isNaN(d.getTime()), `post "${post.slug}" date "${post.date}" doesn't parse`);
    // Catches JS's silent date rollover (e.g. "2026-02-30" -> March 2nd)
    assert.equal(d.toISOString().slice(0, 10), post.date, `post "${post.slug}" date "${post.date}" isn't a real calendar date`);
  }
});

test('no duplicate slugs in posts.json', () => {
  const slugs = posts.map((p) => p.slug);
  const seen = new Set();
  const dupes = new Set();
  for (const s of slugs) {
    if (seen.has(s)) dupes.add(s);
    seen.add(s);
  }
  assert.equal(dupes.size, 0, `duplicate slug(s): ${[...dupes].join(', ')}`);
});

test('every post.slug has a matching posts/<slug>/index.html on disk', () => {
  for (const post of posts) {
    const target = path.join(ROOT, 'posts', post.slug, 'index.html');
    assert.ok(fs.existsSync(target), `posts.json references slug "${post.slug}" but ${target} doesn't exist`);
  }
});

test('every real posts/<slug>/ folder is registered in content-index.json (including drafts)', () => {
  const postsDir = path.join(ROOT, 'posts');
  const folders = fs.readdirSync(postsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/content-index.json'), 'utf8'));
  const slugOf = (r) => r.route.slice('/posts/'.length).replace(/\/$/, '');
  const knownSlugs = new Set(manifest.records.filter((r) => r.content_type === 'post').map(slugOf));
  const published = manifest.records.filter((r) => r.content_type === 'post' && r.status === 'published').map(slugOf).sort();
  assert.deepEqual(posts.map((p) => p.slug).sort(), published, 'posts.json must contain exactly published posts, excluding drafts');
  const orphans = folders.filter((f) => !knownSlugs.has(f));
  assert.equal(orphans.length, 0, `posts/ folder(s) not registered in content-index.json: ${orphans.join(', ')}`);
});

test('the post title inside its own HTML file matches posts.json (no stale metadata)', () => {
  for (const post of posts) {
    const htmlPath = path.join(ROOT, 'posts', post.slug, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const h1Match = html.match(/<h1>([^<]*)<\/h1>/);
    assert.ok(h1Match, `posts/${post.slug}/index.html has no <h1>`);
    assert.equal(
      h1Match[1].trim(), post.title,
      `posts.json title for "${post.slug}" doesn't match the page's <h1>`
    );
  }
});

test('the local-versus-CI triage guide lives in QA Field Guide Automation, not the recipe lane', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/content-index.json'), 'utf8'));
  const record = manifest.records.find((r) => r.id === 'post:what-i-check-before-increasing-a-selenium-timeout');
  assert.ok(record, 'expected the local-versus-CI guide in the content index');
  assert.equal(record.section, 'QA Field Guide');
  assert.equal(record.subsection, 'Automation');

  const page = fs.readFileSync(path.join(ROOT, 'posts/what-i-check-before-increasing-a-selenium-timeout/index.html'), 'utf8');
  assert.match(page, /<p class="eyebrow">QA Field Guide<\/p>/);
  assert.match(page, /<span>QA Field Guide<\/span>/);

  const cookbook = fs.readFileSync(path.join(ROOT, 'automation-cookbook/index.html'), 'utf8');
  assert.doesNotMatch(cookbook, /what-i-check-before-increasing-a-selenium-timeout/);
});
