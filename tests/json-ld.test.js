'use strict';
/* Every post embeds a schema.org JSON-LD block for SEO/rich-results. These
   tests catch a malformed block (invalid JSON — easy to introduce by hand-
   editing HTML) and missing required fields, across every real post, not
   just the ones touched in a given session. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./helpers');

const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'posts.json'), 'utf8'));

function extractLdJson(html) {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return m ? m[1] : null;
}

for (const post of posts) {
  test(`posts/${post.slug}/ has valid, complete JSON-LD`, () => {
    const htmlPath = path.join(ROOT, 'posts', post.slug, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const raw = extractLdJson(html);
    assert.ok(raw, `posts/${post.slug}/index.html has no application/ld+json block`);

    let data;
    assert.doesNotThrow(() => { data = JSON.parse(raw); }, `posts/${post.slug}/index.html has malformed JSON-LD`);

    assert.ok(Array.isArray(data['@graph']), `posts/${post.slug}: JSON-LD needs a @graph array`);
    const article = data['@graph'].find((n) => n['@type'] === 'TechArticle' || n['@type'] === 'Article');
    assert.ok(article, `posts/${post.slug}: no Article/TechArticle node in @graph`);

    for (const field of ['headline', 'description', 'datePublished', 'dateModified', 'author', 'publisher']) {
      assert.ok(field in article, `posts/${post.slug}: article node missing "${field}"`);
    }
    assert.match(article.datePublished, /^\d{4}-\d{2}-\d{2}$/, `posts/${post.slug}: bad datePublished format`);
    assert.match(article.dateModified, /^\d{4}-\d{2}-\d{2}$/, `posts/${post.slug}: bad dateModified format`);
    assert.ok(
      new Date(article.dateModified) >= new Date(article.datePublished),
      `posts/${post.slug}: dateModified is before datePublished`
    );

    const breadcrumb = data['@graph'].find((n) => n['@type'] === 'BreadcrumbList');
    assert.ok(breadcrumb, `posts/${post.slug}: no BreadcrumbList node in @graph`);
    assert.ok(breadcrumb.itemListElement.length >= 2, `posts/${post.slug}: breadcrumb should have at least 2 levels`);
  });
}
