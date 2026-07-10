'use strict';
/* Crawls every real HTML page's href/src attributes and verifies local
   (non-external) references resolve to a real file on disk. This is the
   sitewide, always-repeatable version of the link crawls that were run by
   hand throughout this project's build sessions. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, listHtmlFiles, extractRefs, resolveLocalTarget } = require('./helpers');

test('every internal href/src across the site resolves to a real file', () => {
  const files = listHtmlFiles();
  const broken = [];

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    // Skip refs that live inside HTML comments (e.g. cross-link TODO notes
    // that intentionally point at posts that don't exist yet).
    const withoutComments = text.replace(/<!--[\s\S]*?-->/g, '');
    for (const href of extractRefs(withoutComments)) {
      const target = resolveLocalTarget(href, file);
      if (!target) continue; // external / mailto / pure anchor — not this test's job
      if (!fs.existsSync(target)) {
        broken.push(`${path.relative(ROOT, file)} -> "${href}" (resolved to ${path.relative(ROOT, target)})`);
      }
    }
  }

  assert.equal(broken.length, 0, `broken internal link(s):\n${broken.join('\n')}`);
});

test('every post is reachable from at least one listing page (articles/, its own lane index, or home)', () => {
  const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'posts.json'), 'utf8'));
  const candidateListings = ['articles/index.html', 'index.html'].map((f) => path.join(ROOT, f));

  for (const post of posts) {
    const href = `posts/${post.slug}/`;
    const linkedSomewhere = candidateListings.some((file) => {
      const text = fs.readFileSync(file, 'utf8');
      return text.includes(`posts/${post.slug}/`);
    });
    assert.ok(linkedSomewhere, `post "${post.slug}" isn't linked from articles/index.html or the home page`);
  }
});
