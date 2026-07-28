'use strict';
/* RBB-046 acceptance tests for scripts/build-site-indexes.js.
   Covers a subset of the 31-test contract in
   docs/architecture/RBB-045-content-source-of-truth-plan.md §9, prioritizing the
   safety-critical rules per the RBB-046 implementation brief: article-body
   protection, transactional rollback, strict-mode parsing, the four-consumer
   SEO equality, canonical staged enforcement, route grammar, date requiredness,
   and tag casing.

   Two test styles are used:
   - Fixture-based unit tests (temp directories) for anything that touches the
     filesystem, so these tests do not depend on the live tree's current state.
   - Direct calls against the real assets/data/content-index.json for the
     schema/cross-record rules that are already known to pass against it.

   NOT COVERED here (see the implementation handoff for the exact list):
   T-05/T-06/T-25/T-26/T-28/T-29 as *live-page* assertions are exercised only
   against fixtures, not the real tree, because the real tree's OG/JSON-LD
   normalization diff (§2.3.3a) has not been applied — that would require
   writing inside posts/**, which this generator (and this test suite) never
   does. See the handoff report for the exact BLOCKED status this reflects. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { ROOT } = require('./helpers');

const gen = require('../scripts/build-site-indexes.js');

const GENERATOR_PATH = path.join(ROOT, 'scripts', 'build-site-indexes.js');
const REAL_MANIFEST_PATH = path.join(ROOT, 'assets', 'data', 'content-index.json');

function baseRecord(overrides) {
  return Object.assign({
    id: 'post:fixture-post',
    content_type: 'post',
    title: 'Fixture Post',
    description: 'A fixture description that is long enough to pass validation easily.',
    route: '/posts/fixture-post/',
    published_date: '2026-01-01',
    reading_minutes: 5,
    tags: ['Alpha', 'Beta'],
    section: 'QA Field Guide',
    subsection: 'QA Strategy',
    editorial_promise: 'A fixture promise.',
    status: 'published',
  }, overrides);
}

function baseManifest(records) {
  return {
    schema_version: 1,
    reading_time_authority: 'manual',
    site: { origin: 'https://example.test' },
    records,
  };
}

// -----------------------------------------------------------------------
// T-01 — schema validation + strict mode (§2.2.1), including rev-8 AD-7 route grammar
// -----------------------------------------------------------------------
test('T-01: unknown envelope key is a validation error', () => {
  const tmp = writeTempManifest({ schema_version: 1, reading_time_authority: 'manual', site: { origin: 'https://x.test' }, records: [], bogus: true });
  assert.throws(() => gen.loadManifest(tmp), /unknown envelope key "bogus"/);
});

test('T-01: unrecognized schema_version is a validation error', () => {
  const tmp = writeTempManifest({ schema_version: 99, reading_time_authority: 'manual', site: { origin: 'https://x.test' }, records: [] });
  assert.throws(() => gen.loadManifest(tmp), /unrecognized schema_version/);
});

test('T-01: unknown record key is a validation error', () => {
  const rec = baseRecord({ serchable: true });
  const tmp = writeTempManifest(baseManifest([rec]));
  assert.throws(() => gen.loadManifest(tmp), /unknown key "serchable"/);
});

test('T-01: unknown content_type enum value is a validation error', () => {
  const rec = baseRecord({ content_type: 'blog' });
  assert.throws(() => gen.validateRecordShape(rec), /unknown content_type/);
});

test('T-01 (AD-7): directory route form is accepted', () => {
  assert.doesNotThrow(() => gen.validateRecordShape(baseRecord({ route: '/qa-field-guide/deep/' })));
});

test('T-01 (AD-7): .html file route is accepted only for content_type utility', () => {
  const utilRec = {
    id: 'util:test-file', content_type: 'utility', title: 'Utility',
    description: 'A utility page.', route: '/404.html', section: 'Site', status: 'published',
  };
  assert.doesNotThrow(() => gen.validateRecordShape(utilRec));
});

test('T-01 (AD-7): .html file route on a non-utility content_type is a hard failure', () => {
  const rec = baseRecord({ route: '/posts/fixture-post.html' });
  assert.throws(() => gen.validateRecordShape(rec), /file route.*only legal for content_type "utility"/);
});

test('T-01 (AD-7): query strings and fragments are rejected on both route forms', () => {
  assert.throws(() => gen.validateRecordShape(baseRecord({ route: '/posts/fixture-post/?x=1' })), /query string or fragment/);
  assert.throws(() => gen.validateRecordShape(baseRecord({ route: '/posts/fixture-post/#a' })), /query string or fragment/);
});

test('T-01 (AD-9): tags preserve exact source casing — no Title Case enforcement', () => {
  const rec = baseRecord({ tags: ['metrics', 'dashboards', 'GQM'] });
  assert.doesNotThrow(() => gen.validateRecordShape(rec));
});

test('T-01 (AD-9): a same-record case-only tag duplicate is still an error', () => {
  const rec = baseRecord({ tags: ['Metrics', 'metrics'] });
  assert.throws(() => gen.validateRecordShape(rec), /duplicate tag/);
});

test('T-01 (AD-9): data_experience must omit tags entirely', () => {
  const rec = {
    id: 'data:fixture', content_type: 'data_experience', title: 'Fixture Data Experience',
    description: 'A fixture data experience.', route: '/table-talk/fixture/', published_date: '2026-01-01',
    reading_minutes: 5, section: 'Table Talk', status: 'published', tags: ['x'],
  };
  assert.throws(() => gen.validateRecordShape(rec), /must omit tags entirely/);
});

// -----------------------------------------------------------------------
// T-01b — fail-closed visibility (D-A)
// -----------------------------------------------------------------------
test('T-01b: a record with no status is a validation error', () => {
  const rec = baseRecord({});
  delete rec.status;
  assert.throws(() => gen.validateRecordShape(rec), /status is required/);
});

test('T-01b: a non-published record with an explicit true inclusion flag is a validation error', () => {
  const rec = baseRecord({ status: 'draft', include_on_home: true });
  assert.throws(() => gen.validateRecordShape(rec), /explicitly true/);
});

test('T-01b: a published record with omitted flags resolves to the per-type defaults', () => {
  const rec = baseRecord({});
  const eff = gen.resolveVisibility(rec);
  assert.deepEqual(eff, { searchable: true, include_in_articles: true, include_in_feed: true, include_in_sitemap: true, include_on_home: true });
});

test('T-01b: a non-published record resolves all five flags false regardless of content_type', () => {
  const rec = baseRecord({ status: 'archived' });
  const eff = gen.resolveVisibility(rec);
  for (const v of Object.values(eff)) assert.equal(v, false);
});

// -----------------------------------------------------------------------
// T-02 — unique identity + route history
// -----------------------------------------------------------------------
test('T-02: duplicate id is a hard failure', () => {
  const a = baseRecord({ route: '/posts/a/' });
  const b = baseRecord({ route: '/posts/b/' });
  const m = baseManifest([a, b]);
  assert.throws(() => gen.validateManifest(m), /duplicate id/);
});

test('T-02: duplicate route is a hard failure', () => {
  const a = baseRecord({ id: 'post:a', route: '/posts/a/' });
  const b = baseRecord({ id: 'post:b', route: '/posts/a/' });
  const m = baseManifest([a, b]);
  assert.throws(() => gen.validateManifest(m), /duplicate route/);
});

test('T-02: a previous_routes entry colliding with another record\'s current route is a hard failure', () => {
  const a = baseRecord({ id: 'post:a', route: '/posts/a/' });
  const b = baseRecord({ id: 'post:b', route: '/posts/b/', previous_routes: ['/posts/a/'] });
  const m = baseManifest([a, b]);
  assert.throws(() => gen.validateManifest(m), /collides with a current route/);
});

// -----------------------------------------------------------------------
// T-03 / T-03b — required fields per type
// -----------------------------------------------------------------------
test('T-03: post without tags is a validation error', () => {
  const rec = baseRecord({});
  delete rec.tags;
  assert.throws(() => gen.validateRecordShape(rec), /tags is required for post/);
});

test('T-03: post without published_date is a validation error', () => {
  const rec = baseRecord({});
  delete rec.published_date;
  assert.throws(() => gen.validateRecordShape(rec), /published_date is required/);
});

test('T-03 (AD-8): project and field_kit may omit published_date', () => {
  const proj = { id: 'project:fixture', content_type: 'project', title: 'Fixture', description: 'd', route: '/projects/fixture/', tags: ['A'], section: 'Projects', status: 'published' };
  assert.doesNotThrow(() => gen.validateRecordShape(proj));
  assert.doesNotThrow(() => gen.validateManifest(baseManifest([proj])));
});

test('T-03 (AD-9): project requires tags, field_kit requires tags', () => {
  const proj = { id: 'project:fixture', content_type: 'project', title: 'Fixture', description: 'd', route: '/projects/fixture/', section: 'Projects', status: 'published' };
  assert.throws(() => gen.validateRecordShape(proj), /tags is required for project/);
  const kit = { id: 'kit:fixture', content_type: 'field_kit', title: 'Fixture', description: 'd', route: '/field-kit/fixture/', section: 'Field Kit', status: 'published' };
  assert.throws(() => gen.validateRecordShape(kit), /tags is required for field_kit/);
});

// -----------------------------------------------------------------------
// T-04 — date validity
// -----------------------------------------------------------------------
test('T-04: an impossible calendar date is rejected (rollover check)', () => {
  const rec = baseRecord({ published_date: '2026-02-30' });
  assert.throws(() => gen.validateRecordShape(rec), /not a real calendar date/);
});

test('T-04: a future published_date is rejected', () => {
  const rec = baseRecord({ published_date: '2999-01-01' });
  assert.throws(() => gen.validateRecordShape(rec), /in the future/);
});

test('T-04: modified_date < published_date is rejected', () => {
  const rec = baseRecord({ published_date: '2026-06-01', modified_date: '2026-01-01' });
  assert.throws(() => gen.validateRecordShape(rec), />= published_date/);
});

test('T-04 (AD-8): modified_date without published_date is rejected (no default)', () => {
  const rec = baseRecord({});
  delete rec.published_date;
  rec.modified_date = '2026-01-01';
  assert.throws(() => gen.validateRecordShape(rec), /published_date absent/);
});

// -----------------------------------------------------------------------
// T-07 — feed/rss byte equality
// -----------------------------------------------------------------------
test('T-07: feed.xml and rss.xml are byte-identical (same in-memory string)', () => {
  const rec = baseRecord({});
  const m = baseManifest([rec]);
  for (const r of m.records) r.__effective = gen.resolveVisibility(r);
  const outputs = { 'feed.xml': gen.buildFeedXml(m) };
  outputs['rss.xml'] = outputs['feed.xml'];
  assert.equal(outputs['feed.xml'], outputs['rss.xml']);
});

test('T-07b: generated feed is well-formed XML with every required item field', () => {
  const rec = baseRecord({});
  const m = baseManifest([rec]);
  for (const r of m.records) r.__effective = gen.resolveVisibility(r);
  const xml = gen.buildFeedXml(m);
  assert.match(xml, /<title>Fixture Post<\/title>/);
  assert.match(xml, /<link>https:\/\/example\.test\/posts\/fixture-post\/<\/link>/);
  assert.match(xml, /<guid>https:\/\/example\.test\/posts\/fixture-post\/<\/guid>/);
  assert.match(xml, /<pubDate>.*\+0000<\/pubDate>/);
  assert.match(xml, /<description>/);
});

// -----------------------------------------------------------------------
// T-08 — sitemap inclusion/exclusion + <lastmod> format (AD-8)
// -----------------------------------------------------------------------
test('T-08: <lastmod> uses modified_date, else published_date, else is omitted', () => {
  const withMod = baseRecord({ id: 'post:a', route: '/posts/a/', modified_date: '2026-02-01' });
  const withPubOnly = baseRecord({ id: 'post:b', route: '/posts/b/' });
  const undated = { id: 'project:c', content_type: 'project', title: 'C', description: 'd', route: '/projects/c/', tags: ['A'], section: 'Projects', status: 'published' };
  const m = baseManifest([withMod, withPubOnly, undated]);
  for (const r of m.records) r.__effective = gen.resolveVisibility(r);
  const xml = gen.buildSitemapXml(m);
  assert.match(xml, /<url><loc>https:\/\/example\.test\/posts\/a\/<\/loc><lastmod>2026-02-01<\/lastmod><\/url>/);
  assert.match(xml, /<url><loc>https:\/\/example\.test\/posts\/b\/<\/loc><lastmod>2026-01-01<\/lastmod><\/url>/);
  assert.match(xml, /<url><loc>https:\/\/example\.test\/projects\/c\/<\/loc><\/url>/);
  assert.doesNotMatch(xml.match(/projects\/c\/[^\n]*/)[0], /lastmod/);
});

// -----------------------------------------------------------------------
// T-09 — marker integrity
// -----------------------------------------------------------------------
test('T-09: a missing END marker is a hard validation error', () => {
  const html = '<div>\n<!-- GENERATED:FOO:START — do not edit by hand; run `node scripts/build-site-indexes.js` -->\n<p>x</p>\n</div>';
  assert.throws(() => gen.checkMarkers(html, ['FOO'], 'fixture.html'), /marker "FOO"/);
});

test('T-09: a duplicated START marker is a hard validation error', () => {
  const html = '<!-- GENERATED:FOO:START — do not edit by hand; run `node scripts/build-site-indexes.js` -->\nx\n<!-- GENERATED:FOO:END -->\n<!-- GENERATED:FOO:START — do not edit by hand; run `node scripts/build-site-indexes.js` -->\ny\n<!-- GENERATED:FOO:END -->';
  assert.throws(() => gen.checkMarkers(html, ['FOO'], 'fixture.html'), /marker "FOO"/);
});

test('T-09: a well-formed marker pair passes', () => {
  const html = '<!-- GENERATED:FOO:START — do not edit by hand; run `node scripts/build-site-indexes.js` -->\nx\n<!-- GENERATED:FOO:END -->';
  assert.doesNotThrow(() => gen.checkMarkers(html, ['FOO'], 'fixture.html'));
});

// -----------------------------------------------------------------------
// T-22 — public JSON key allow-list (search-index.json)
// -----------------------------------------------------------------------
test('T-22: search-index.json objects carry exactly the declared 10 keys, nothing more', () => {
  const rec = baseRecord({ search_keywords: ['syn1'] });
  const m = baseManifest([rec]);
  for (const r of m.records) r.__effective = gen.resolveVisibility(r);
  const idx = JSON.parse(gen.buildSearchIndex(m));
  const keys = Object.keys(idx.records[0]).sort();
  const expected = ['id', 'type', 'title', 'description', 'route', 'section', 'tags', 'keywords', 'reading_minutes', 'published_date'].sort();
  assert.deepEqual(keys, expected);
  assert.ok(!('editorial_promise' in idx.records[0]));
  assert.ok(!('seo_description' in idx.records[0]));
});

// -----------------------------------------------------------------------
// T-24 — normalization equivalence (D-C)
// -----------------------------------------------------------------------
test('T-24: straight and curly apostrophes normalize identically', () => {
  assert.equal(gen.normalize("doesn't").phrase, gen.normalize('doesn’t').phrase);
});

test('T-24: hyphenated and space-separated forms both normalize with a hyphen (query expansion happens separately)', () => {
  const a = gen.normalize('Blue-Red').phrase;
  const b = gen.normalize('Blue–Red').phrase; // en dash
  assert.equal(a, b);
  assert.equal(a, 'blue-red');
});

test('T-24: NFC/NFD variants normalize identically', () => {
  const nfc = 'café'; // é precomposed
  const nfd = 'café'; // e + combining acute
  assert.equal(gen.normalize(nfc).phrase, gen.normalize(nfd).phrase);
});

// -----------------------------------------------------------------------
// T-27 — tag vocabulary separation / casing, against the real manifest
// -----------------------------------------------------------------------
test('T-27: real manifest — field_kit tags preserve lowercase source casing verbatim', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  const kit = manifest.records.find((r) => r.id === 'kit:gqm-mapping-worksheet');
  assert.deepEqual(kit.tags, ['metrics', 'dashboards', 'GQM']);
});

test('T-27: real manifest — data_experience records carry no tags key', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  for (const r of manifest.records.filter((r) => r.content_type === 'data_experience')) {
    assert.ok(!('tags' in r), `${r.id} should not have a tags key`);
  }
});

// -----------------------------------------------------------------------
// Real-manifest schema + cross-record validation (T-01/T-02/T-03/T-04 at scale)
// -----------------------------------------------------------------------
test('the real content-index.json passes full schema + cross-record validation (44 records)', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  assert.doesNotThrow(() => gen.validateManifest(manifest));
  assert.equal(manifest.records.length, 44);
});

// -----------------------------------------------------------------------
// T-05 — canonical staged enforcement (AD-3/AD-6), fixture-based
// -----------------------------------------------------------------------
test('T-05: real manifest debt lists are exactly 13 missing-canonical routes and 1 wrong-value route', () => {
  assert.equal(gen.CANONICAL_MISSING_DEBT.size, 13);
  assert.equal(gen.CANONICAL_VALUE_DEBT.size, 1);
});

// -----------------------------------------------------------------------
// T-17 — no article-body mutation (hash check), plus deny-list throw
// -----------------------------------------------------------------------
test('T-17: the write deny-list rejects any path under posts/, content/, docs/, and the two data-experience shells', () => {
  assert.equal(gen.isDenied(path.join('posts', 'x', 'index.html')), true);
  assert.equal(gen.isDenied(path.join('content', 'drafts', 'x.md')), true);
  assert.equal(gen.isDenied(path.join('docs', 'x.md')), true);
  assert.equal(gen.isDenied(path.join('table-talk', 'mana-base-codex', 'index.html')), true);
  assert.equal(gen.isDenied(path.join('magic-math', 'finish-him', 'index.html')), true);
  assert.equal(gen.isDenied(path.join('assets', 'vendor', 'x.js')), true);
});

test('T-17: the write allow-list is exactly the Generate-classified outputs (cache-version row excluded)', () => {
  assert.equal(gen.isAllowed(path.join('assets', 'data', 'search-index.json')), true);
  assert.equal(gen.isAllowed(path.join('assets', 'data', 'posts.json')), true);
  assert.equal(gen.isAllowed('feed.xml'), true);
  assert.equal(gen.isAllowed('rss.xml'), true);
  assert.equal(gen.isAllowed('sitemap.xml'), true);
  assert.equal(gen.isAllowed('index.html'), true);
  assert.equal(gen.isAllowed('articles/index.html'), true);
  assert.equal(gen.isAllowed('learning-lab/index.html'), true);
  assert.equal(gen.isAllowed('table-talk/index.html'), true);
  assert.equal(gen.isAllowed('qa-field-guide/index.html'), true);
  assert.equal(gen.isAllowed(path.join('posts', 'x', 'index.html')), false);
  assert.equal(gen.isAllowed('robots.txt'), false, 'a real path not on the Generate list must not be writable');
});

test('T-17: hashAllFilesUnder + assertPostsUnchanged detect any byte-level change under posts/', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rbb046-posts-'));
  const file = path.join(dir, 'index.html');
  fs.writeFileSync(file, 'original content', 'utf8');
  const before = gen.hashAllFilesUnder(dir);
  assert.doesNotThrow(() => gen.assertPostsUnchanged(before, gen.hashAllFilesUnder(dir)));
  fs.writeFileSync(file, 'mutated content', 'utf8');
  const after = gen.hashAllFilesUnder(dir);
  assert.throws(() => gen.assertPostsUnchanged(before, after), /article-body protection violated/);
  fs.rmSync(dir, { recursive: true, force: true });
});

// -----------------------------------------------------------------------
// T-10 / T-14 — idempotence
// -----------------------------------------------------------------------
test('T-10: computeOutputs is idempotent — same manifest produces byte-identical output on repeat calls', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  gen.validateManifest(manifest);
  const a = gen.computeOutputs(manifest);
  const manifest2 = gen.loadManifest(REAL_MANIFEST_PATH);
  gen.validateManifest(manifest2);
  const b = gen.computeOutputs(manifest2);
  assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
  for (const key of Object.keys(a)) {
    assert.equal(a[key], b[key], `output "${key}" differs between two computeOutputs() runs on the same manifest`);
  }
});

// -----------------------------------------------------------------------
// T-18 — stable ordering regardless of manifest record order
// -----------------------------------------------------------------------
test('T-18: shuffling record order in the manifest does not change generated output', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  gen.validateManifest(manifest);
  const shuffled = { ...manifest, records: [...manifest.records].reverse() };
  for (const r of shuffled.records) r.__effective = gen.resolveVisibility(r);
  const a = gen.buildSearchIndex(manifest);
  const b = gen.buildSearchIndex(shuffled);
  assert.equal(a, b);
  const c = gen.buildSitemapXml(manifest);
  const d = gen.buildSitemapXml(shuffled);
  assert.equal(c, d);
});

// -----------------------------------------------------------------------
// T-16 — drift-check fails loudly (fixture-based CLI invocation)
// -----------------------------------------------------------------------
test('T-16: --check exits non-zero on a fixture tree with a deliberately stale generated file', () => {
  const dir = buildFixtureTree();
  // corrupt the already-generated search-index.json to simulate drift
  fs.writeFileSync(path.join(dir, 'assets/data/search-index.json'), '{"schema_version":1,"records":[]}\n', 'utf8');
  const result = runCli(dir, ['--check']);
  assert.notEqual(result.status, 0);
});

test('T-16: --check exits 0 on a clean fixture tree', () => {
  const dir = buildFixtureTree();
  const result = runCli(dir, ['--check']);
  assert.equal(result.status, 0, result.stderr + result.stdout);
});

// -----------------------------------------------------------------------
// T-21 — recoverable transactional write (simulated failure + rollback)
// -----------------------------------------------------------------------
test('T-21: computeOutputs/validateOutputs (phases 1-2) never touch disk before the write phase', () => {
  const dir = buildFixtureTree();
  const before = {};
  for (const rel of ['feed.xml', 'rss.xml', 'sitemap.xml', 'assets/data/search-index.json', 'assets/data/posts.json']) {
    before[rel] = fs.readFileSync(path.join(dir, rel), 'utf8');
  }
  const gen2 = freshRequire(path.join(dir, 'scripts', 'build-site-indexes.js'));
  const manifest = gen2.loadManifest(path.join(dir, 'assets/data/content-index.json'));
  gen2.validateManifest(manifest);
  const outputs = gen2.computeOutputs(manifest);
  gen2.validateOutputs(outputs);
  for (const rel of Object.keys(before)) {
    const now = fs.readFileSync(path.join(dir, rel), 'utf8');
    assert.equal(now, before[rel], `"${rel}" changed on disk before the write phase ran`);
  }
});

test('T-21: a genuine injected mid-replace failure (4th of 10 renames) rolls back the 3 already-replaced targets and leaves zero .tmp/.bak', () => {
  const dir = buildFixtureTree();
  const gen2 = freshRequire(path.join(dir, 'scripts', 'build-site-indexes.js'));

  // Give the generator something new to write (bump reading_minutes + the rendered page).
  const manifestPath = path.join(dir, 'assets/data/content-index.json');
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  raw.records[0].reading_minutes = 2;
  fs.writeFileSync(manifestPath, JSON.stringify(raw, null, 2), 'utf8');
  const postFile = path.join(dir, 'posts', 'fixture-post', 'index.html');
  fs.writeFileSync(postFile, fs.readFileSync(postFile, 'utf8').replace('1 min read', '2 min read'), 'utf8');

  const manifest = gen2.loadManifest(manifestPath);
  gen2.validateManifest(manifest);
  const outputs = gen2.computeOutputs(manifest);
  gen2.validateOutputs(outputs);

  const targets = ['feed.xml', 'rss.xml', 'sitemap.xml', 'assets/data/search-index.json', 'assets/data/posts.json',
    'index.html', 'articles/index.html', 'learning-lab/index.html', 'table-talk/index.html', 'qa-field-guide/index.html'];
  const before = {};
  for (const rel of targets) before[rel] = fs.readFileSync(path.join(dir, rel), 'utf8');

  const realRename = fs.renameSync;
  let renameCount = 0;
  fs.renameSync = function patched(...args) {
    renameCount++;
    if (renameCount === 4) throw new Error('SIMULATED FAULT: injected failure on the 4th replace');
    return realRename.apply(fs, args);
  };

  let caught = null;
  try {
    gen2.writeOutputsTransactionally(outputs);
  } catch (e) {
    caught = e;
  } finally {
    fs.renameSync = realRename;
  }

  assert.ok(caught, 'expected the injected fault to throw');
  assert.equal(caught.rolledBack, true);
  assert.ok(!caught.rollbackFailure);
  assert.equal(renameCount, 4, 'expected exactly 3 successful renames before the 4th (injected) failure');

  for (const rel of targets) {
    const now = fs.readFileSync(path.join(dir, rel), 'utf8');
    assert.equal(now, before[rel], `"${rel}" was not restored to its pre-fault bytes`);
  }

  const leftovers = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full); else if (/\.(tmp|bak)$/.test(full)) leftovers.push(full);
    }
  })(dir);
  assert.deepEqual(leftovers, [], 'no .tmp or .bak file should survive a rolled-back run');
});

// -----------------------------------------------------------------------
// T-25 / T-29 / T-17(live) — against the REAL, now-migrated tree (AD-4 migration
// diff applied 2026-07-21 by Rob directly, via scripts/migrate-seo-metadata-2026-07-21.js).
//
// DURABLE (RBB-046 remediation, D-1): these no longer read `git diff -- posts/`,
// which empties the moment the work is committed (turning the suite red). The
// migration script's own exported TARGETS array is the canonical baseline — the
// exact old/new pairs for every approved field on every approved file. Reading
// TARGETS + the real post files proves the migration landed and is scoped
// correctly, and passes IDENTICALLY before and after a commit.
// -----------------------------------------------------------------------
const { TARGETS: MIGRATION_TARGETS } = require('../scripts/migrate-seo-metadata-2026-07-21.js');

const LOCKED_AI_TEXT = 'I spent 14 years making non-deterministic systems trustworthy. I run AI work the way I run quality engineering.';

test('T-25: the real manifest + real post pages satisfy hard 4-consumer SEO equality with zero validation errors', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  gen.validateManifest(manifest);
  const problems = gen.validateAgainstPages(manifest, {});
  const seoErrors = problems.errors.filter((e) => /description|og:description|JSON-LD/.test(e));
  assert.deepEqual(seoErrors, []);
});

test('T-29: the real tree carries exactly the declared migration set — 8 posts, 1 meta / 8 og / 5 jsonld / 0 twitter (durable, no git)', () => {
  // 1. Exactly the 8 approved slugs, and the 3 untouched slugs are absent.
  const targetSlugs = MIGRATION_TARGETS.map((t) => t.slug).sort();
  const expectedSlugs = [
    'automation-tool-vs-process', 'how-i-cut-a-regression-cycle-in-half',
    'how-i-run-ai-like-a-qa-system', 'quiz-evidence-not-vibes',
    'reclaiming-qa-dashboards-gqm', 'static-site-release-risk',
    'traceable-is-not-true', 'why-magic-lands-are-so-weird',
  ].sort();
  assert.deepEqual(targetSlugs, expectedSlugs, 'migration TARGETS must be exactly the 8 approved slugs');
  for (const slug of ['your-precon-is-a-passport', 'izzet-vs-prismari', 'what-good-qa-actually-owns']) {
    assert.ok(!targetSlugs.includes(slug), `untouched post ${slug} must not be in the migration set`);
  }

  // 2. Exact field-type counts across all approved changes.
  const counts = { meta: 0, og: 0, jsonld: 0, twitter: 0 };
  for (const t of MIGRATION_TARGETS) for (const c of t.changes) counts[c.field] = (counts[c.field] || 0) + 1;
  assert.equal(counts.meta, 1, `expected exactly 1 meta-description change, TARGETS declares ${counts.meta}`);
  assert.equal(counts.og, 8, `expected exactly 8 og:description changes, TARGETS declares ${counts.og}`);
  assert.equal(counts.jsonld, 5, `expected exactly 5 JSON-LD description changes, TARGETS declares ${counts.jsonld}`);
  assert.equal(counts.twitter || 0, 0, 'no twitter:description change may be declared');

  // 3. Every approved change is actually present on disk: the NEW value is there,
  //    the OLD value is gone. This is what proves the migration landed, and it
  //    holds whether or not the change is committed.
  for (const t of MIGRATION_TARGETS) {
    const file = path.join(ROOT, 'posts', t.slug, 'index.html');
    const html = fs.readFileSync(file, 'utf8');
    for (const c of t.changes) {
      assert.ok(html.includes(c.new), `posts/${t.slug}/: expected migrated ${c.field} value to be present`);
      assert.ok(!html.includes(c.old), `posts/${t.slug}/: pre-migration ${c.field} value must be gone`);
    }
  }

  // 4. The one locked-text post carries the exact Option-B string on meta, og, and JSON-LD.
  const aiHtml = fs.readFileSync(path.join(ROOT, 'posts', 'how-i-run-ai-like-a-qa-system', 'index.html'), 'utf8');
  assert.ok(aiHtml.includes(`<meta name="description" content="${LOCKED_AI_TEXT}">`), 'meta carries the locked Option-B text');
  assert.ok(aiHtml.includes(`<meta property="og:description" content="${LOCKED_AI_TEXT}">`), 'og carries the locked Option-B text');
  assert.ok(aiHtml.includes(`"description": "${LOCKED_AI_TEXT}",`), 'JSON-LD carries the locked Option-B text');
});

test('T-17 (live tree): the migration is scoped to only meta/og/jsonld description fields — never title, promise, lede, tags, or dates (durable, no git)', () => {
  const ALLOWED = new Set(['meta', 'og', 'jsonld']);
  for (const t of MIGRATION_TARGETS) {
    for (const c of t.changes) {
      assert.ok(ALLOWED.has(c.field), `migration for ${t.slug} touches disallowed field "${c.field}"`);
      // The old/new pairs are always <meta ...> or JSON-LD "description": lines —
      // never an <h1>, .promise, .lede, .tag-row, or article:*_time edit.
      const isMetaTag = /^<meta (name="description"|property="og:description")/.test(c.old.trim());
      const isJsonld = /^"description":/.test(c.old.trim());
      assert.ok(isMetaTag || isJsonld, `migration for ${t.slug} old value is not a description tag/field: ${c.old.slice(0, 60)}`);
    }
  }
  // Article-body safety is additionally guaranteed live by T-25's 4-consumer
  // equality against the real pages (any body/prose corruption would fail it).
});

// -----------------------------------------------------------------------
// MT-21 — /articles/ card structure is intentionally date-less (documentation
// guard). The re-QA note "cards aren't showing dates" was an incorrect manual
// expectation: neither the pre-RBB-046 site nor the approved generator contract
// ever rendered a publication date on an /articles/ card. Cards carry
// section + "N min read" in .card-topline (dates live on the home .post-row and
// in feeds/sitemap). This test protects the determination so a future change
// can't silently add/expect a date without a deliberate decision.
// -----------------------------------------------------------------------
test('MT-21: every /articles/ generated card shows section + reading time and no date element', () => {
  const html = fs.readFileSync(path.join(ROOT, 'articles', 'index.html'), 'utf8');
  const region = html.match(/GENERATED:ARTICLES_LIST:START[\s\S]*?GENERATED:ARTICLES_LIST:END/)[0];
  const cards = region.match(/<article class="post-card"[\s\S]*?<\/article>/g) || [];
  assert.equal(cards.length, 16, 'expected 16 article cards');
  for (const card of cards) {
    const topline = card.match(/<div class="card-topline">([\s\S]*?)<\/div>/);
    assert.ok(topline, 'each card has a card-topline');
    assert.ok(/min read<\/span>/.test(topline[1]), 'card-topline shows "N min read"');
    assert.ok(/<span>[^<]+<\/span>/.test(topline[1]), 'card-topline shows the section label');
    // Intentionally no date: cards must not carry a .date element (that is a
    // home-feed .post-row affordance, not an /articles/ card one).
    assert.ok(!/class="date"/.test(card), 'an /articles/ card must not render a .date element');
  }
});

// -----------------------------------------------------------------------
// T-12 (both directions) — orphan detection (rev-remediation D-7)
// -----------------------------------------------------------------------
test('T-12: the real tree has no orphaned post directory and no record without a page', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  gen.validateManifest(manifest);
  const problems = gen.validateAgainstPages(manifest, {});
  const orphanErrors = problems.errors.filter((e) => /orphan|does not resolve/.test(e));
  assert.deepEqual(orphanErrors, [], `expected no orphan/missing-page errors, got: ${orphanErrors.join('; ')}`);
});

test('T-12 (file→record): a posts/<slug>/ folder with no manifest record is a hard error', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  gen.validateManifest(manifest);
  // Drop one post record while its posts/traceable-is-not-true/ folder stays on disk.
  manifest.records = manifest.records.filter((r) => r.id !== 'post:traceable-is-not-true');
  const problems = { errors: [], warnings: [] };
  gen.checkPostOrphans(manifest, problems);
  assert.ok(problems.errors.some((e) => /orphan: posts\/traceable-is-not-true/.test(e)), 'expected an orphan error for the recordless folder');
});

test('T-12 (record→file): a post record whose route resolves to no file is a hard error', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  gen.validateManifest(manifest);
  manifest.records.push({
    id: 'post:ghost-post', content_type: 'post', title: 'Ghost',
    description: 'A record with no page on disk.', route: '/posts/ghost-post/',
    published_date: '2026-01-01', reading_minutes: 3, tags: ['Ghost'],
    section: 'QA Field Guide', subsection: 'QA Strategy', editorial_promise: 'Ghost.',
    status: 'published', __effective: gen.resolveVisibility({ content_type: 'post', status: 'published' }),
  });
  const problems = gen.validateAgainstPages(manifest, {});
  assert.ok(problems.errors.some((e) => /ghost-post.*does not resolve to a real file/.test(e)), 'expected a route-resolution error for the pageless record');
});

// -----------------------------------------------------------------------
// T-14 (live tree) — real drift gate (rev-remediation D-3)
// -----------------------------------------------------------------------
test('T-14 (live tree): every generated output on disk matches what the current manifest would produce (no drift)', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  gen.validateManifest(manifest);
  const outputs = gen.computeOutputs(manifest);
  const drifted = [];
  for (const rel of Object.keys(outputs)) {
    const full = path.join(ROOT, rel);
    const onDisk = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
    if (onDisk !== outputs[rel]) drifted.push(rel);
  }
  assert.equal(Object.keys(outputs).length, 10, 'expected exactly 10 generated outputs');
  assert.deepEqual(drifted, [], `generated files drifted from the manifest: ${drifted.join(', ')}`);
});

// -----------------------------------------------------------------------
// T-11 — /articles/ listing completeness
// -----------------------------------------------------------------------
test('T-11: every include_in_articles post appears as a card in articles/index.html, and no extras', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  gen.validateManifest(manifest);
  const expected = manifest.records
    .filter((r) => r.content_type === 'post' && r.__effective.include_in_articles)
    .map((r) => r.id.split(':')[1]).sort();
  assert.equal(expected.length, 16, 'expected 16 articles-eligible posts');
  const html = fs.readFileSync(path.join(ROOT, 'articles', 'index.html'), 'utf8');
  const region = html.match(/GENERATED:ARTICLES_LIST:START[\s\S]*?GENERATED:ARTICLES_LIST:END/)[0];
  const found = [...new Set([...region.matchAll(/\.\.\/posts\/([a-z0-9-]+)\//g)].map((m) => m[1]))].sort();
  assert.deepEqual(found, expected, 'the /articles/ generated region must list exactly the include_in_articles posts');
});

// -----------------------------------------------------------------------
// T-15 — search-index completeness + scope
// -----------------------------------------------------------------------
test('T-15: search-index.json contains exactly the 31 searchable records and no hub/utility', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  gen.validateManifest(manifest);
  const idx = JSON.parse(gen.buildSearchIndex(manifest));
  const expected = manifest.records.filter((r) => r.__effective.searchable).map((r) => r.id).sort();
  const got = idx.records.map((r) => r.id).sort();
  assert.equal(expected.length, 31, 'expected 31 searchable records');
  assert.deepEqual(got, expected);
  assert.ok(!idx.records.some((r) => r.type === 'hub' || r.type === 'utility'), 'no hub/utility record may be in the search index');
});

// -----------------------------------------------------------------------
// T-19 — Table Talk cross-post presentation preserved
// -----------------------------------------------------------------------
test('T-19: the quiz-evidence-not-vibes cross-post card keeps its label, blurb, three tags, and footer', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  gen.validateManifest(manifest);
  const html = fs.readFileSync(path.join(ROOT, 'table-talk', 'index.html'), 'utf8');
  const region = html.match(/GENERATED:TABLE_TALK_LIST:START[\s\S]*?GENERATED:TABLE_TALK_LIST:END/)[0];
  assert.ok(region.includes('../posts/quiz-evidence-not-vibes/'), 'cross-post links to the quiz post');
  assert.ok(region.includes('Learning Lab · builder note'), 'cross-post keeps its distinct label');
  assert.ok(region.includes('from the Learning Lab'), 'cross-post keeps its footer');
  for (const tag of ['Vox Mana', 'Placement', 'Evidence']) {
    assert.ok(region.includes('<span>' + tag + '</span>'), `cross-post keeps its tag "${tag}"`);
  }
});

// -----------------------------------------------------------------------
// T-23 — deterministic search ordering (shared comparator, undated included)
// -----------------------------------------------------------------------
test('T-23: the shared dated-before-undated / date-desc / id-asc comparator is a total order (shuffle-stable)', () => {
  const sn = require('../assets/js/search-normalize.js');
  const fixtures = [
    { id: 'post:a', published_date: '2026-07-12' },
    { id: 'post:b', published_date: '2026-07-12' }, // ties a on date → id breaks it
    { id: 'post:c', published_date: '2026-07-18' },
    { id: 'kit:z', published_date: undefined },     // undated → sorts last
    { id: 'kit:y' },                                 // undated → sorts last, id breaks vs z
  ];
  const expected = [...fixtures].sort(sn.compareDatedThenId).map((r) => r.id);
  // dated (desc date, then id) before undated (id asc)
  assert.deepEqual(expected, ['post:c', 'post:a', 'post:b', 'kit:y', 'kit:z']);
  // shuffle a few ways → identical sequence every time
  for (const perm of [[4, 3, 2, 1, 0], [2, 0, 4, 1, 3], [1, 4, 0, 3, 2]]) {
    const shuffled = perm.map((i) => fixtures[i]);
    assert.deepEqual(shuffled.sort(sn.compareDatedThenId).map((r) => r.id), expected);
  }
});

// -----------------------------------------------------------------------
// T-26 — manual reading-time behavior + advisory warning boundary
// -----------------------------------------------------------------------
test('T-26: manual authority — cross-surface reading time is exact, and a >=2 min computed gap warns without failing', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  assert.equal(manifest.reading_time_authority, 'manual');
  gen.validateManifest(manifest);
  const problems = gen.validateAgainstPages(manifest, {});
  const rtErrors = problems.errors.filter((e) => /reading time/.test(e));
  assert.deepEqual(rtErrors, [], 'no reading-time cross-surface mismatch may be an error in manual authority');
  const rtWarnings = problems.warnings.filter((w) => /computed reading time/.test(w));
  assert.ok(rtWarnings.some((w) => /your-precon-is-a-passport/.test(w)), 'the known >=2 min deviation warns');
  assert.ok(rtWarnings.some((w) => /why-magic-lands-are-so-weird/.test(w)), 'the known >=2 min deviation warns');
});

// -----------------------------------------------------------------------
// T-28 — feed/sitemap inclusion & exclusion
// -----------------------------------------------------------------------
test('T-28: feeds carry posts + data experiences; sitemap excludes 404/template and includes /search/; <lastmod> only when dated', () => {
  const manifest = gen.loadManifest(REAL_MANIFEST_PATH);
  gen.validateManifest(manifest);
  const feed = gen.buildFeedXml(manifest);
  const itemCount = (feed.match(/<item>/g) || []).length;
  assert.equal(itemCount, 19, 'feed carries 16 posts + 3 data experiences');
  assert.ok(feed.includes('/magic-math/finish-him/'), 'feed includes the Finish Him data experience');
  assert.ok(feed.includes('/table-talk/mana-base-codex/'), 'feed includes the Mana Base Codex data experience');

  const sitemap = gen.buildSitemapXml(manifest);
  assert.ok(!sitemap.includes('/404.html'), 'sitemap excludes 404.html');
  assert.ok(!sitemap.includes('article-template.html'), 'sitemap excludes the article template');
  assert.ok(sitemap.includes('<loc>https://robboles.com/search/</loc>'), 'sitemap includes /search/ via its explicit flag');
  const locCount = (sitemap.match(/<loc>/g) || []).length;
  const lastmodCount = (sitemap.match(/<lastmod>/g) || []).length;
  assert.equal(locCount, 42, 'sitemap has 42 entries (44 records − 404 − template)');
  assert.equal(lastmodCount, 19, '<lastmod> appears only on the 19 dated records');
});

// -----------------------------------------------------------------------
// Fixture helpers
// -----------------------------------------------------------------------
function writeTempManifest(obj) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rbb046-manifest-'));
  const file = path.join(dir, 'content-index.json');
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
  return file;
}

/* Builds a complete, minimal, self-consistent fixture site tree (its own manifest,
   marker-bearing HTML files, and a posts/ folder) in a temp directory, then runs the
   real generator against it in "generate" mode once so a second --check call sees a
   clean tree. This isolates filesystem-touching tests (T-16, T-21) from the live
   repository's current blocked state. */
function buildFixtureTree() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rbb046-fixture-'));
  fs.mkdirSync(path.join(dir, 'assets', 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'assets', 'js'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'posts', 'fixture-post'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'articles'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'learning-lab'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'table-talk'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'qa-field-guide'), { recursive: true });

  fs.copyFileSync(GENERATOR_PATH, path.join(dir, 'scripts', 'build-site-indexes.js'));
  // The generator now require()s the shared normalize module relative to its own
  // __dirname, so the fixture tree must carry it too (rev-remediation D-2).
  fs.copyFileSync(
    path.join(ROOT, 'assets', 'js', 'search-normalize.js'),
    path.join(dir, 'assets', 'js', 'search-normalize.js')
  );

  const record = {
    id: 'post:fixture-post', content_type: 'post', title: 'Fixture Post',
    description: 'A fixture description long enough to be valid.',
    route: '/posts/fixture-post/', published_date: '2026-01-01', reading_minutes: 1,
    tags: ['Alpha'], section: 'QA Field Guide', subsection: 'QA Strategy',
    editorial_promise: 'Fixture promise.', status: 'published',
  };
  const manifest = { schema_version: 1, reading_time_authority: 'manual', site: { origin: 'https://example.test' }, records: [record] };
  fs.writeFileSync(path.join(dir, 'assets', 'data', 'content-index.json'), JSON.stringify(manifest, null, 2), 'utf8');

  const postHtml = `<!doctype html><html><head>
<meta name="description" content="A fixture description long enough to be valid.">
<meta property="og:description" content="A fixture description long enough to be valid.">
<link rel="canonical" href="https://example.test/posts/fixture-post/">
<script type="application/ld+json">{"@graph":[{"description":"A fixture description long enough to be valid.","keywords":"alpha, beta"}]}</script>
</head><body>
<h1>Fixture Post</h1>
<p class="promise">Fixture promise, present on the page.</p>
<p class="lede">A fixture lede paragraph.</p>
<div class="article-meta">1 min read</div>
<div class="article-body"><p>${'word '.repeat(210)}</p></div>
</body></html>`;
  fs.writeFileSync(path.join(dir, 'posts', 'fixture-post', 'index.html'), postHtml, 'utf8');

  const marker = (name) => `<!-- GENERATED:${name}:START — do not edit by hand; run \`node scripts/build-site-indexes.js\` -->\n<!-- GENERATED:${name}:END -->`;
  fs.writeFileSync(path.join(dir, 'index.html'), `<html><body><div class="post-list">\n${marker('RECENT_WRITING')}\n</div></body></html>`, 'utf8');
  fs.writeFileSync(path.join(dir, 'articles', 'index.html'), `<html><body><div class="card-grid">\n${marker('ARTICLES_LIST')}\n</div></body></html>`, 'utf8');
  fs.writeFileSync(path.join(dir, 'learning-lab', 'index.html'), `<html><body><div class="card-grid">\n${marker('LEARNING_LAB_LIST')}\n</div></body></html>`, 'utf8');
  fs.writeFileSync(path.join(dir, 'table-talk', 'index.html'), `<html><body><div class="card-grid">\n${marker('TABLE_TALK_LIST')}\n</div></body></html>`, 'utf8');
  const lanes = ['QA Strategy', 'Automation', 'Metrics & Reporting', 'E2E Testing', 'AI in QA'].map((_, i) => marker(`FIELD_GUIDE_LANE_${String(i + 1).padStart(2, '0')}`)).join('\n<div class="links">\n') ;
  fs.writeFileSync(path.join(dir, 'qa-field-guide', 'index.html'), `<html><body>\n<div class="links">\n${lanes}\n</div>\n</body></html>`, 'utf8');

  // Run once in generate mode so a clean fixture tree exists for T-16's "clean" case.
  runCli(dir, []);
  return dir;
}

function freshRequire(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function runCli(dir, args) {
  try {
    const stdout = execFileSync(process.execPath, [path.join(dir, 'scripts', 'build-site-indexes.js'), ...args], {
      cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (e) {
    return { status: e.status, stdout: e.stdout ? e.stdout.toString() : '', stderr: e.stderr ? e.stderr.toString() : '' };
  }
}
