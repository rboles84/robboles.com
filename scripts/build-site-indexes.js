#!/usr/bin/env node
'use strict';
/*
 * RBB-046 content generator.
 *
 * One hand-authored manifest (assets/data/content-index.json) is the single
 * source of truth for repeated site metadata. This script:
 *   - validates the manifest strictly (RBB-045 plan §2.2.1, §2.3, rev-8 AD-7/8/9)
 *   - validates existing page metadata against it (§3.3 row 13, "Validate only")
 *   - generates a bounded set of outputs (§3.3, "Generate")
 *   - never writes inside posts/** or any other deny-listed path (§3.4)
 *
 * Modes:
 *   node scripts/build-site-indexes.js            generate (transactional write, §3.1.1)
 *   node scripts/build-site-indexes.js --check     drift check, read-only, exit 4 if stale
 *   node scripts/build-site-indexes.js --report    human dry-run report, never writes, exit 0
 *
 * Node built-ins only. No dependencies. See docs/architecture/RBB-045-content-source-of-truth-plan.md.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// §5.4/§5.5 — the single canonical normalize()/comparator, shared verbatim with
// the browser search page (assets/js/site.js) so build-time and query-time can
// never drift. A local project module, not an npm dependency.
const { normalize, compareDatedThenId } = require('../assets/js/search-normalize.js');

const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// §3.4 — Article-body protection, lock 1: write deny-list.
// ---------------------------------------------------------------------------
const WRITE_DENY = [
  'posts/',
  'content/',
  'table-talk/mana-base-codex/',
  'magic-math/finish-him/',
  'docs/',
  'assets/vendor/',
].map((p) => p.replace(/\//g, path.sep));

// §3.4 lock 2: allow-list of exactly the Generate-classified outputs (§3.3).
// Row 11 (cache-version) is explicitly excluded — not written by this generator (D-F).
const WRITE_ALLOW = [
  'assets/data/search-index.json',
  'assets/data/posts.json',
  'feed.xml',
  'rss.xml',
  'sitemap.xml',
  'index.html',
  'articles/index.html',
  'learning-lab/index.html',
  'table-talk/index.html',
  'qa-field-guide/index.html',
].map((p) => p.replace(/\//g, path.sep));

function isDenied(relPath) {
  const norm = relPath.replace(/\//g, path.sep);
  return WRITE_DENY.some((d) => norm === d.replace(/\\$/, '') || norm.startsWith(d));
}

function isAllowed(relPath) {
  const norm = relPath.replace(/\//g, path.sep);
  return WRITE_ALLOW.includes(norm);
}

// §2.3.2 — canonical staging, two bounded route allow-lists (AD-3 / AD-6).
const CANONICAL_MISSING_DEBT = new Set([
  '/',
  '/articles/',
  '/qa-field-guide/',
  '/automation-cookbook/',
  '/learning-lab/',
  '/table-talk/',
  '/table-talk/mana-base-codex/',
  '/projects/',
  '/projects/vox-mana/',
  '/projects/recipe-flexibility-app-concept/',
  '/projects/mtg-store-inventory-app-concept/',
  '/search/',
  '/404.html',
]);
const CANONICAL_VALUE_DEBT = new Map([
  ['/content/templates/article-template.html', 'https://robboles.com/posts/{{SLUG}}/'],
]);

// §2.3.1 — fail-closed per-type visibility defaults.
const VISIBILITY_DEFAULTS = {
  post: { searchable: true, include_in_articles: true, include_in_feed: true, include_in_sitemap: true, include_on_home: true },
  data_experience: { searchable: true, include_in_articles: false, include_in_feed: true, include_in_sitemap: true, include_on_home: false },
  project: { searchable: true, include_in_articles: false, include_in_feed: false, include_in_sitemap: true, include_on_home: false },
  field_kit: { searchable: true, include_in_articles: false, include_in_feed: false, include_in_sitemap: true, include_on_home: false },
  hub: { searchable: false, include_in_articles: false, include_in_feed: false, include_in_sitemap: true, include_on_home: false },
  utility: { searchable: false, include_in_articles: false, include_in_feed: false, include_in_sitemap: false, include_on_home: false },
};
const INCLUSION_FLAGS = ['searchable', 'include_in_articles', 'include_in_feed', 'include_in_sitemap', 'include_on_home'];

const CONTENT_TYPES = ['post', 'data_experience', 'project', 'field_kit', 'hub', 'utility'];
const ID_PREFIX_FOR_TYPE = { post: 'post', data_experience: 'data', project: 'project', field_kit: 'kit', hub: 'hub', utility: 'util' };
const SECTIONS = ['QA Field Guide', 'Automation Cookbook', 'Learning Lab', 'Table Talk', 'Magic Math', 'Projects', 'Field Kit', 'Site'];
const SUBSECTIONS = ['QA Strategy', 'Automation', 'Metrics & Reporting', 'E2E Testing', 'AI in QA'];
const STATUSES = ['published', 'draft', 'private', 'archived'];

// §2.3 route grammar — rev 8, AD-7.
const RE_ROUTE_DIR = /^\/([a-z0-9-]+\/)*$/;
const RE_ROUTE_FILE = /^\/([a-z0-9-]+\/)*[a-z0-9-]+\.html$/;

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_ID = /^(post|data|project|kit|hub|util):[a-z0-9-]+$/;

// Known (allowed) top-level record keys per §2.3 (23 stored + none derived-in-manifest;
// canonical_url is derived, never stored).
const RECORD_KEYS = new Set([
  'id', 'content_type', 'title', 'description', 'seo_description', 'route', 'previous_routes',
  'published_date', 'modified_date', 'reading_minutes', 'tags', 'section', 'subsection',
  'editorial_promise', 'status', 'searchable', 'search_keywords', 'include_in_articles',
  'include_in_feed', 'include_in_sitemap', 'include_on_home', 'flavor_card', 'cross_posts',
]);
const ENVELOPE_KEYS = new Set(['schema_version', 'reading_time_authority', 'site', 'records']);
const SITE_KEYS = new Set(['origin']);
const SUPPORTED_SCHEMA_VERSION = 1;

// §5.3 — the public-output ten-key allow-list for search-index.json (D-D, §2.2.2).
const SEARCH_INDEX_KEYS = ['id', 'type', 'title', 'description', 'route', 'section', 'tags', 'keywords', 'reading_minutes', 'published_date'];

// -----------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------
class ValidationError extends Error {}

function fail(msg) {
  throw new ValidationError(msg);
}

// -----------------------------------------------------------------------
// §2.2.1 — strict manifest parsing
// -----------------------------------------------------------------------
function loadManifest(manifestPath) {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    fail(`manifest is not valid JSON: ${e.message}`);
  }

  for (const key of Object.keys(json)) {
    if (!ENVELOPE_KEYS.has(key)) fail(`manifest: unknown envelope key "${key}"`);
  }
  if (typeof json.schema_version !== 'number') fail('manifest: schema_version must be a number');
  if (json.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    fail(`manifest: unrecognized schema_version ${json.schema_version} (supported: ${SUPPORTED_SCHEMA_VERSION})`);
  }
  if (json.reading_time_authority !== 'manual' && json.reading_time_authority !== 'derived') {
    fail(`manifest: reading_time_authority must be "manual" or "derived", got ${JSON.stringify(json.reading_time_authority)}`);
  }
  if (typeof json.site !== 'object' || json.site === null) fail('manifest: site must be an object');
  for (const key of Object.keys(json.site)) {
    if (!SITE_KEYS.has(key)) fail(`manifest: unknown key "site.${key}"`);
  }
  if (typeof json.site.origin !== 'string' || !json.site.origin) fail('manifest: site.origin must be a non-empty string');
  if (!Array.isArray(json.records)) fail('manifest: records must be an array');

  for (const record of json.records) {
    validateRecordShape(record);
  }

  return json;
}

function validateRecordShape(record) {
  const id = typeof record.id === 'string' ? record.id : '(no id)';
  for (const key of Object.keys(record)) {
    if (!RECORD_KEYS.has(key)) fail(`record "${id}": unknown key "${key}"`);
  }

  // id
  if (typeof record.id !== 'string' || !RE_ID.test(record.id)) {
    fail(`record "${id}": invalid id format (expected ^(post|data|project|kit|hub|util):[a-z0-9-]+$)`);
  }

  // content_type
  if (!CONTENT_TYPES.includes(record.content_type)) {
    fail(`record "${id}": unknown content_type "${record.content_type}" (allowed: ${CONTENT_TYPES.join(', ')})`);
  }
  const expectedPrefix = ID_PREFIX_FOR_TYPE[record.content_type];
  if (!record.id.startsWith(expectedPrefix + ':')) {
    fail(`record "${id}": id prefix does not match content_type "${record.content_type}" (expected prefix "${expectedPrefix}:")`);
  }

  // title
  if (typeof record.title !== 'string' || record.title.length < 1 || record.title.length > 120) {
    fail(`record "${id}": title must be a string 1-120 chars`);
  }

  // description
  if (typeof record.description !== 'string' || record.description.length < 1 || record.description.length > 320) {
    fail(`record "${id}": description must be a string 1-320 chars`);
  }

  // seo_description (optional)
  if ('seo_description' in record) {
    if (typeof record.seo_description !== 'string' || record.seo_description.length < 1 || record.seo_description.length > 320) {
      fail(`record "${id}": seo_description must be a string 1-320 chars when present`);
    }
  }

  // route — rev 8, AD-7 two-form grammar
  validateRouteField(id, 'route', record.route, record.content_type, true);
  if ('previous_routes' in record) {
    if (!Array.isArray(record.previous_routes)) fail(`record "${id}": previous_routes must be an array`);
    for (const r of record.previous_routes) validateRouteField(id, 'previous_routes', r, record.content_type, false);
  }

  // published_date / modified_date
  if ('published_date' in record) {
    validateDateField(id, 'published_date', record.published_date);
  }
  if ('modified_date' in record) {
    validateDateField(id, 'modified_date', record.modified_date);
    if ('published_date' in record) {
      if (record.modified_date < record.published_date) {
        fail(`record "${id}": modified_date (${record.modified_date}) must be >= published_date (${record.published_date})`);
      }
    } else {
      fail(`record "${id}": modified_date present but published_date absent (no default without a published_date)`);
    }
  }

  // published_date requiredness — rev 8, AD-8
  const requiresDate = record.content_type === 'post' || record.content_type === 'data_experience' || record.include_in_feed === true;
  if (requiresDate && !('published_date' in record)) {
    fail(`record "${id}": published_date is required (content_type=${record.content_type} or include_in_feed=true)`);
  }

  // reading_minutes
  if ('reading_minutes' in record) {
    if (!Number.isInteger(record.reading_minutes) || record.reading_minutes < 1 || record.reading_minutes > 60) {
      fail(`record "${id}": reading_minutes must be an integer 1-60`);
    }
  }

  // tags — rev 8, AD-9 (no Title Case rule; casing preserved; unique case-insensitively)
  if ('tags' in record) {
    if (!Array.isArray(record.tags) || record.tags.length < 1 || record.tags.length > 8) {
      fail(`record "${id}": tags must be an array of 1-8 entries when present`);
    }
    const seen = new Set();
    for (const t of record.tags) {
      if (typeof t !== 'string' || t.length < 1 || t.length > 40) fail(`record "${id}": each tag must be a string 1-40 chars`);
      if (t !== t.trim()) fail(`record "${id}": tag "${t}" is not trimmed`);
      const foldKey = t.toLowerCase();
      if (seen.has(foldKey)) fail(`record "${id}": duplicate tag "${t}" (case-insensitive collision)`);
      seen.add(foldKey);
    }
  }
  if (record.content_type === 'data_experience' && 'tags' in record) {
    fail(`record "${id}": data_experience records must omit tags entirely (rev 8, AD-9 — no schema-legal source)`);
  }

  // section
  if (!SECTIONS.includes(record.section)) {
    fail(`record "${id}": unknown section "${record.section}" (allowed: ${SECTIONS.join(', ')})`);
  }

  // subsection
  if ('subsection' in record) {
    if (!SUBSECTIONS.includes(record.subsection)) {
      fail(`record "${id}": unknown subsection "${record.subsection}" (allowed: ${SUBSECTIONS.join(', ')})`);
    }
  }
  if (record.content_type === 'post' && record.section === 'QA Field Guide' && !('subsection' in record)) {
    fail(`record "${id}": subsection is required for post records with section "QA Field Guide"`);
  }

  // editorial_promise
  if (record.content_type === 'post') {
    if (typeof record.editorial_promise !== 'string' || record.editorial_promise.length < 1 || record.editorial_promise.length > 240) {
      fail(`record "${id}": editorial_promise is required and non-empty for post records`);
    }
  }

  // status
  if (!('status' in record)) fail(`record "${id}": status is required (no default)`);
  if (!STATUSES.includes(record.status)) fail(`record "${id}": unknown status "${record.status}" (allowed: ${STATUSES.join(', ')})`);

  // fail-closed contradiction check (D-A / T-01b)
  if (record.status !== 'published') {
    for (const flag of INCLUSION_FLAGS) {
      if (record[flag] === true) {
        fail(`record "${id}": status "${record.status}" but "${flag}" is explicitly true (all inclusion flags must resolve false for a non-published record)`);
      }
    }
  }
  for (const flag of INCLUSION_FLAGS) {
    if (flag in record && typeof record[flag] !== 'boolean') fail(`record "${id}": "${flag}" must be a boolean when present`);
  }

  // tags requiredness — rev 8, AD-9
  if (record.content_type === 'post' && !('tags' in record)) fail(`record "${id}": tags is required for post`);
  if (record.content_type === 'project' && !('tags' in record)) fail(`record "${id}": tags is required for project (renders .tag-row)`);
  if (record.content_type === 'field_kit' && !('tags' in record)) fail(`record "${id}": tags is required for field_kit (renders .tag-row)`);

  // reading_minutes requiredness handled by authority in validateManifestSemantics (needs envelope)

  // search_keywords
  if ('search_keywords' in record) {
    if (!Array.isArray(record.search_keywords) || record.search_keywords.length > 10) {
      fail(`record "${id}": search_keywords must be an array of 0-10 entries`);
    }
  }

  // flavor_card
  if ('flavor_card' in record) {
    if (record.flavor_card !== null && typeof record.flavor_card !== 'string') {
      fail(`record "${id}": flavor_card must be a string or null`);
    }
    if (record.section !== 'Table Talk') fail(`record "${id}": flavor_card is only valid where section = Table Talk`);
  }

  // cross_posts
  if ('cross_posts' in record) {
    if (!Array.isArray(record.cross_posts)) fail(`record "${id}": cross_posts must be an array`);
    for (const cp of record.cross_posts) {
      if (typeof cp !== 'object' || cp === null) fail(`record "${id}": each cross_posts entry must be an object`);
      const cpKeys = new Set(['section', 'label', 'description', 'tags']);
      for (const k of Object.keys(cp)) if (!cpKeys.has(k)) fail(`record "${id}": unknown cross_posts key "${k}"`);
      if (!SECTIONS.includes(cp.section)) fail(`record "${id}": cross_posts.section "${cp.section}" is not a valid section`);
      if (cp.section === record.section) fail(`record "${id}": cross_posts.section must not equal the record's own section`);
      if (typeof cp.label !== 'string' || !cp.label) fail(`record "${id}": cross_posts.label must be a non-empty string`);
      if (typeof cp.description !== 'string' || !cp.description) fail(`record "${id}": cross_posts.description must be a non-empty string`);
      if (!Array.isArray(cp.tags)) fail(`record "${id}": cross_posts.tags must be an array`);
    }
  }
}

function validateRouteField(id, fieldName, value, contentType, required) {
  if (typeof value !== 'string') fail(`record "${id}": ${fieldName} must be a string`);
  if (/[?#]/.test(value)) fail(`record "${id}": ${fieldName} "${value}" must not contain a query string or fragment`);
  const isDir = RE_ROUTE_DIR.test(value);
  const isFile = RE_ROUTE_FILE.test(value);
  if (!isDir && !isFile) {
    fail(`record "${id}": ${fieldName} "${value}" does not match either permitted route form`);
  }
  if (isFile && contentType !== 'utility') {
    fail(`record "${id}": ${fieldName} "${value}" is a file route, only legal for content_type "utility" (got "${contentType}")`);
  }
}

function validateDateField(id, fieldName, value) {
  if (typeof value !== 'string' || !RE_DATE.test(value)) fail(`record "${id}": ${fieldName} "${value}" must be YYYY-MM-DD`);
  const d = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    fail(`record "${id}": ${fieldName} "${value}" is not a real calendar date`);
  }
  if (fieldName === 'published_date') {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (value > todayStr) fail(`record "${id}": published_date "${value}" is in the future`);
  }
}

// -----------------------------------------------------------------------
// Cross-record validation: T-01b, T-02, T-03, T-03b, T-04
// -----------------------------------------------------------------------
function validateManifest(manifest) {
  const records = manifest.records;
  const authority = manifest.reading_time_authority;

  // T-02 — unique id, unique route, previous_routes global uniqueness
  const ids = new Set();
  const routes = new Set();
  const prevRoutes = new Set();
  for (const r of records) {
    if (ids.has(r.id)) fail(`duplicate id "${r.id}"`);
    ids.add(r.id);
  }
  for (const r of records) {
    if (routes.has(r.route)) fail(`duplicate route "${r.route}" (record ${r.id})`);
    routes.add(r.route);
  }
  for (const r of records) {
    for (const pr of r.previous_routes || []) {
      if (routes.has(pr)) fail(`previous_routes entry "${pr}" (record ${r.id}) collides with a current route`);
      if (prevRoutes.has(pr)) fail(`previous_routes entry "${pr}" (record ${r.id}) collides with another record's previous_routes`);
      if (pr === r.route) fail(`previous_routes entry "${pr}" (record ${r.id}) collides with its own current route`);
      prevRoutes.add(pr);
    }
  }

  // reading_minutes requiredness, authority-branched (§4.3, T-03, T-06)
  for (const r of records) {
    if (r.content_type === 'post') {
      if (authority === 'manual') {
        if (!('reading_minutes' in r)) fail(`record "${r.id}": reading_minutes is required for post under "manual" authority`);
      } else if (authority === 'derived') {
        if ('reading_minutes' in r) fail(`record "${r.id}": reading_minutes must be absent for post under "derived" authority (generator computes it)`);
      }
    }
    if (r.content_type === 'data_experience') {
      if (!('reading_minutes' in r)) fail(`record "${r.id}": reading_minutes is required for data_experience (always manual)`);
    }
  }

  // visibility resolution (D-A) — resolve effective flags for every record
  for (const r of records) {
    r.__effective = resolveVisibility(r);
  }

  return manifest;
}

function resolveVisibility(record) {
  if (record.status !== 'published') {
    return { searchable: false, include_in_articles: false, include_in_feed: false, include_in_sitemap: false, include_on_home: false };
  }
  const defaults = VISIBILITY_DEFAULTS[record.content_type] || { searchable: false, include_in_articles: false, include_in_feed: false, include_in_sitemap: false, include_on_home: false };
  const out = {};
  for (const flag of INCLUSION_FLAGS) {
    out[flag] = flag in record ? record[flag] : defaults[flag];
  }
  return out;
}

// -----------------------------------------------------------------------
// XML / text helpers
// -----------------------------------------------------------------------
function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function htmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}
function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, ' ');
}
function normalizeWhitespace(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}

// §5.4 — normalize() is imported from assets/js/search-normalize.js (shared
// verbatim with the browser) at the top of this file.

// §3.6 — line-ending detection
function detectEol(text) {
  const crlf = (text.match(/\r\n/g) || []).length;
  const lfOnly = (text.match(/(?<!\r)\n/g) || []).length;
  return crlf >= lfOnly ? '\r\n' : '\n';
}
function applyEol(text, eol) {
  const unified = text.replace(/\r\n/g, '\n');
  return eol === '\r\n' ? unified.replace(/\n/g, '\r\n') : unified;
}

// -----------------------------------------------------------------------
// Ordering
// -----------------------------------------------------------------------
// Same total order used by the browser search comparator — imported from the
// shared module as compareDatedThenId, re-aliased here for the generator's callers.
const compareDateOrderedThenId = compareDatedThenId;

const SITEMAP_TYPE_ORDER = ['hub', 'utility', 'post', 'data_experience', 'project', 'field_kit'];
function compareSitemapOrder(a, b) {
  const ta = SITEMAP_TYPE_ORDER.indexOf(a.content_type);
  const tb = SITEMAP_TYPE_ORDER.indexOf(b.content_type);
  if (ta !== tb) return ta - tb;
  return a.route < b.route ? -1 : a.route > b.route ? 1 : 0;
}

// -----------------------------------------------------------------------
// Reading-time (advisory computation in manual authority; §4.1/§4.2)
// -----------------------------------------------------------------------
function computeReadingMinutes(html) {
  const bodyMatch = extractBalancedDiv(html, 'article-body');
  if (!bodyMatch) return null;
  let body = bodyMatch;
  body = body.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ');
  for (const cls of ['article-verified', 'author-bio', 'cta-inline', 'reusable-asset', 'decklist-body']) {
    body = stripClassBlocks(body, cls);
  }
  body = body.replace(/<figcaption[\s\S]*?<\/figcaption>/gi, ' ');
  const text = decodeEntities(stripTags(body));
  const words = text.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
  return Math.max(1, Math.round(words.length / 200));
}

function stripClassBlocks(html, className) {
  const re = new RegExp(`<([a-z0-9]+)[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, 'i');
  let out = html;
  for (;;) {
    const m = out.match(re);
    if (!m) break;
    const tag = m[1];
    const start = m.index;
    const end = findMatchingClose(out, start, tag);
    if (end === -1) break;
    out = out.slice(0, start) + out.slice(end);
  }
  return out;
}

function extractBalancedDiv(html, className) {
  const re = new RegExp(`<div[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, 'i');
  const m = html.match(re);
  if (!m) return null;
  const start = m.index;
  const end = findMatchingClose(html, start, 'div');
  if (end === -1) return null;
  return html.slice(start, end);
}

function findMatchingClose(html, openTagStart, tag) {
  const openRe = new RegExp(`<${tag}\\b`, 'gi');
  const closeRe = new RegExp(`</${tag}>`, 'gi');
  openRe.lastIndex = openTagStart;
  const firstOpenMatch = openRe.exec(html);
  if (!firstOpenMatch) return -1;
  let depth = 0;
  let pos = openTagStart;
  const tagRe = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'gi');
  tagRe.lastIndex = openTagStart;
  let m;
  while ((m = tagRe.exec(html))) {
    if (m[0].startsWith('</')) {
      depth--;
      if (depth === 0) return m.index + m[0].length;
    } else {
      depth++;
    }
  }
  return -1;
}

// -----------------------------------------------------------------------
// Read-only page inspection (§3.2)
// -----------------------------------------------------------------------
function readPostPage(record) {
  const slug = record.id.split(':')[1];
  const file = path.join(ROOT, 'posts', slug, 'index.html');
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, 'utf8');
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const metaDesc = html.match(/<meta name="description" content="([^"]*)"/);
  const ogDesc = html.match(/<meta property="og:description" content="([^"]*)"/);
  const twDesc = html.match(/<meta name="twitter:description" content="([^"]*)"/);
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/);
  const ldMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let jsonldDescription = null;
  let jsonldKeywords = null;
  for (const m of ldMatches) {
    try {
      const doc = JSON.parse(m[1]);
      const graph = doc['@graph'] || [doc];
      for (const node of graph) {
        if (node.description) jsonldDescription = node.description;
        if (node.keywords) jsonldKeywords = node.keywords;
      }
    } catch (e) { /* malformed JSON-LD is a separate concern; not fatal here */ }
  }
  const promiseM = html.match(/<p class="promise">([\s\S]*?)<\/p>/);
  const ledeM = html.match(/<p class="lede">([\s\S]*?)<\/p>/);
  const artMeta = html.match(/<div class="article-meta">([\s\S]*?)<\/div>/);
  const rmMatch = artMeta ? decodeEntities(stripTags(artMeta[1])).match(/(\d+)\s*min read/) : null;
  return {
    html,
    h1: h1 ? normalizeWhitespace(decodeEntities(stripTags(h1[1]))) : null,
    metaDesc: metaDesc ? decodeEntities(metaDesc[1]) : null,
    ogDesc: ogDesc ? decodeEntities(ogDesc[1]) : null,
    twDesc: twDesc ? decodeEntities(twDesc[1]) : null,
    canonical: canonical ? canonical[1] : null,
    jsonldDescription,
    jsonldKeywords,
    promisePresent: !!promiseM && normalizeWhitespace(decodeEntities(stripTags(promiseM[1]))).length > 0,
    ledePresent: !!ledeM && normalizeWhitespace(decodeEntities(stripTags(ledeM[1]))).length > 0,
    renderedReadingMinutes: rmMatch ? Number(rmMatch[1]) : null,
    computedReadingMinutes: computeReadingMinutes(html),
  };
}

function readGenericPage(routeToFile, route) {
  const file = routeToFile(route);
  if (!file || !fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, 'utf8');
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/);
  return { html, canonical: canonical ? canonical[1] : null };
}

function routeToFilePath(route) {
  if (route.endsWith('.html')) return path.join(ROOT, route.slice(1).replace(/\//g, path.sep));
  return path.join(ROOT, route.slice(1).replace(/\//g, path.sep), 'index.html');
}

// -----------------------------------------------------------------------
// T-12 (file→record) — orphaned post directory detection (D-7)
// -----------------------------------------------------------------------
function checkPostOrphans(manifest, problems) {
  const postsDir = path.join(ROOT, 'posts');
  if (!fs.existsSync(postsDir)) return;

  // Map every real posts/<slug>/index.html folder to how many post records claim it.
  const recordSlugs = new Map();
  for (const r of manifest.records) {
    if (r.content_type !== 'post') continue;
    const slug = r.id.split(':')[1];
    recordSlugs.set(slug, (recordSlugs.get(slug) || 0) + 1);
  }

  for (const entry of fs.readdirSync(postsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    if (!fs.existsSync(path.join(postsDir, slug, 'index.html'))) continue; // not a post page
    const count = recordSlugs.get(slug) || 0;
    if (count === 0) {
      problems.errors.push(`orphan: posts/${slug}/index.html exists but has no manifest post record`);
    } else if (count > 1) {
      problems.errors.push(`posts/${slug}/index.html is claimed by ${count} manifest post records (must be exactly one)`);
    }
  }
}

// -----------------------------------------------------------------------
// Validate-only checks against live pages (§3.3 row 13, T-03b, T-05, T-06,
// T-12, T-25, T-26, T-27, T-28, T-29)
// -----------------------------------------------------------------------
function validateAgainstPages(manifest, opts) {
  const problems = { errors: [], warnings: [] };
  const origin = manifest.site.origin;

  // T-12 (reverse direction, rev-remediation D-7) — every real posts/<slug>/index.html
  // folder must map to exactly one manifest `post` record. Record→file is checked in
  // the loop below; this is the file→record half that was missing, so a post can never
  // exist on disk while belonging to no surface.
  checkPostOrphans(manifest, problems);

  for (const r of manifest.records) {
    // T-12 — every route resolves to a real file
    const file = routeToFilePath(r.route);
    if (!fs.existsSync(file)) {
      problems.errors.push(`record "${r.id}": route "${r.route}" does not resolve to a real file (${file})`);
      continue;
    }

    // T-05 — canonical staged enforcement (all record types)
    const page = r.content_type === 'post' ? readPostPage(r) : readGenericPage(routeToFilePath, r.route);
    const expectedCanonical = origin + r.route;
    if (page) {
      if (page.canonical) {
        if (page.canonical !== expectedCanonical) {
          if (CANONICAL_VALUE_DEBT.get(r.route) === page.canonical) {
            problems.warnings.push(`WARNING (CANONICAL_VALUE_DEBT): "${r.route}" canonical is "${page.canonical}", expected "${expectedCanonical}" — recorded debt, RBB-048 owns`);
          } else {
            problems.errors.push(`record "${r.id}": canonical "${page.canonical}" != expected "${expectedCanonical}"`);
          }
        }
      } else {
        if (CANONICAL_MISSING_DEBT.has(r.route)) {
          problems.warnings.push(`WARNING (CANONICAL_MISSING_DEBT): "${r.route}" has no canonical — recorded debt, RBB-048 owns`);
        } else {
          problems.errors.push(`record "${r.id}": route "${r.route}" has no canonical and is not on the CANONICAL_MISSING_DEBT list`);
        }
      }
    }

    if (r.content_type !== 'post') continue;
    const post = page;
    if (!post) { problems.errors.push(`record "${r.id}": post page not found`); continue; }

    // T-01 (title/h1)
    if (post.h1 !== null && post.h1 !== r.title) {
      problems.errors.push(`record "${r.id}": title "${r.title}" != page <h1> "${post.h1}"`);
    }

    // T-03b — editorial_promise vs page .promise: presence-only, no equality
    if (!post.promisePresent) problems.errors.push(`record "${r.id}": page .promise element is missing or empty`);

    // T-26 — .lede presence-only
    if (!post.ledePresent) problems.errors.push(`record "${r.id}": page .lede element is missing or empty`);

    // T-26 — JSON-LD keywords presence-only, never compared to tags
    if (!post.jsonldKeywords || (typeof post.jsonldKeywords === 'string' && !post.jsonldKeywords.trim())) {
      problems.errors.push(`record "${r.id}": JSON-LD keywords missing or empty`);
    }

    // T-25 — effective_seo_description hard equality across 4 consumers
    const effective = r.seo_description || r.description;
    if (post.metaDesc !== effective) {
      problems.errors.push(`record "${r.id}": <meta name="description"> ("${post.metaDesc}") != effective_seo_description ("${effective}")`);
    }
    if (post.ogDesc !== null && post.ogDesc !== effective) {
      problems.errors.push(`record "${r.id}": og:description ("${post.ogDesc}") != effective_seo_description ("${effective}")`);
    }
    if (post.twDesc !== null && post.twDesc !== effective) {
      problems.errors.push(`record "${r.id}": twitter:description ("${post.twDesc}") != effective_seo_description ("${effective}")`);
    }
    if (post.jsonldDescription !== null && post.jsonldDescription !== undefined && post.jsonldDescription !== effective) {
      problems.errors.push(`record "${r.id}": JSON-LD description ("${post.jsonldDescription}") != effective_seo_description ("${effective}")`);
    }

    // T-06 — reading-time cross-surface equality (manual authority: manifest is authoritative)
    if (manifest.reading_time_authority === 'manual') {
      if (post.renderedReadingMinutes !== null && post.renderedReadingMinutes !== r.reading_minutes) {
        problems.errors.push(`record "${r.id}": page .article-meta reading time (${post.renderedReadingMinutes}) != manifest reading_minutes (${r.reading_minutes})`);
      }
      if (post.computedReadingMinutes !== null && Math.abs(post.computedReadingMinutes - r.reading_minutes) >= 2) {
        problems.warnings.push(`WARNING: record "${r.id}" computed reading time ${post.computedReadingMinutes} deviates >= 2 min from manifest value ${r.reading_minutes}`);
      }
    }
  }

  return problems;
}

// -----------------------------------------------------------------------
// Generation: search-index.json
// -----------------------------------------------------------------------
function buildSearchIndex(manifest) {
  const records = manifest.records
    .filter((r) => r.__effective.searchable)
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const out = records.map((r) => {
    const obj = {};
    obj.id = r.id;
    obj.type = r.content_type;
    obj.title = r.title;
    obj.description = r.description;
    obj.route = r.route;
    obj.section = r.section;
    obj.tags = r.tags || [];
    obj.keywords = r.search_keywords || [];
    obj.reading_minutes = 'reading_minutes' in r ? r.reading_minutes : null;
    obj.published_date = r.published_date || null;
    const keys = Object.keys(obj);
    const expected = SEARCH_INDEX_KEYS;
    if (keys.length !== expected.length || !expected.every((k) => keys.includes(k))) {
      fail(`search-index.json: record "${r.id}" key set does not exactly match the public allow-list`);
    }
    return obj;
  });
  const payload = { schema_version: 1, records: out };
  return JSON.stringify(payload, null, 2) + '\n';
}

// -----------------------------------------------------------------------
// Generation: posts.json (compatibility projection, §3.3 row 5, §6)
// -----------------------------------------------------------------------
function buildPostsJsonProjection(manifest) {
  const posts = manifest.records
    .filter((r) => r.content_type === 'post' && r.status === 'published')
    .slice()
    .sort(compareDateOrderedThenId);
  const out = posts.map((r) => ({
    slug: r.id.split(':')[1],
    title: r.title,
    date: r.published_date,
    category: r.section,
    lane: r.subsection || r.section,
    tags: r.tags,
    description: r.description,
    promise: r.editorial_promise,
    reading_minutes: r.reading_minutes,
  }));
  return JSON.stringify(out, null, 2) + '\n';
}

// -----------------------------------------------------------------------
// Generation: feed.xml / rss.xml (§7)
// -----------------------------------------------------------------------
const RFC822_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const RFC822_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function toRfc822(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = RFC822_DAYS[d.getUTCDay()];
  const date = String(d.getUTCDate()).padStart(2, '0');
  const month = RFC822_MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day}, ${date} ${month} ${year} 12:00:00 +0000`;
}

function buildFeedXml(manifest) {
  const origin = manifest.site.origin;
  const items = manifest.records
    .filter((r) => r.__effective.include_in_feed)
    .slice()
    .sort(compareDateOrderedThenId)
    .slice(0, 20);
  const itemXml = items.map((r) => {
    const link = origin + r.route;
    return `  <item>\n    <title>${xmlEscape(r.title)}</title>\n    <link>${xmlEscape(link)}</link>\n    <guid>${xmlEscape(link)}</guid>\n    <pubDate>${toRfc822(r.published_date)}</pubDate>\n    <description>${xmlEscape(r.description)}</description>\n  </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0">\n<channel>\n  <title>Robert Boles</title>\n  <link>${xmlEscape(origin)}/</link>\n  <description>A practical knowledge base from Robert Boles on QA systems, automation, release confidence, and builder experiments.</description>\n  <language>en-us</language>\n${itemXml}\n</channel>\n</rss>\n`;
}

// -----------------------------------------------------------------------
// Generation: sitemap.xml (§7.5)
// -----------------------------------------------------------------------
function buildSitemapXml(manifest) {
  const origin = manifest.site.origin;
  const entries = manifest.records
    .filter((r) => r.__effective.include_in_sitemap)
    .slice()
    .sort(compareSitemapOrder);
  const urlXml = entries.map((r) => {
    const loc = origin + r.route;
    const lastmod = r.modified_date || r.published_date || null;
    if (lastmod) return `  <url><loc>${xmlEscape(loc)}</loc><lastmod>${lastmod}</lastmod></url>`;
    return `  <url><loc>${xmlEscape(loc)}</loc></url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlXml}\n</urlset>\n`;
}

// -----------------------------------------------------------------------
// Generation: HTML marker regions (§3.3 rows 6-10, §3.5)
// -----------------------------------------------------------------------
function markerRegex(name) {
  return new RegExp(`(<!-- GENERATED:${name}:START — do not edit by hand; run \`node scripts/build-site-indexes.js\` -->\\n?)([\\s\\S]*?)(<!-- GENERATED:${name}:END -->)`);
}

function spliceMarker(html, name, indent, newContent) {
  const re = markerRegex(name);
  const m = html.match(re);
  if (!m) fail(`marker region "${name}" not found or malformed (unpaired/missing START-END)`);
  const before = html.slice(0, m.index) + m[1];
  const after = m[3] + html.slice(m.index + m[0].length);
  return before + newContent + after;
}

function renderPostRow(r, indent) {
  const cat = r.section.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${indent}<a class="post-row" href="posts/${r.id.split(':')[1]}/">\n` +
    `${indent}  <span class="date">${r.published_date.replace(/-/g, '.')}</span>\n` +
    `${indent}  <span class="mid"><span class="title">${htmlEscape(r.title)}</span><span class="cat">${cat}</span></span>\n` +
    `${indent}  <span class="read">${r.reading_minutes} min</span>\n` +
    `${indent}</a>`;
}

function renderPostCard(r, indent, opts) {
  opts = opts || {};
  const label = opts.label || r.section;
  const readLabel = opts.noReadLabel ? '' : `<span>${r.reading_minutes} min read</span>`;
  const tags = r.tags || [];
  const dataTags = tags.join(' ');
  const slug = r.id.split(':')[1];
  const flavorAttr = r.flavor_card ? ` data-flavor="${htmlEscape(r.flavor_card)}"` : '';
  const tagRow = tags.map((t) => `<span>${htmlEscape(t)}</span>`).join('');
  let out = `${indent}<article class="post-card" data-card data-title="${htmlEscape(r.title)}" data-category="${htmlEscape(r.section)}" data-tags="${htmlEscape(dataTags)}"${flavorAttr}>\n`;
  out += `${indent}  <div class="card-topline"><span>${htmlEscape(label)}</span>${readLabel}</div>\n`;
  out += `${indent}  <h3><a href="${opts.href || `../posts/${slug}/`}">${htmlEscape(r.title)}</a></h3>\n`;
  out += `${indent}  <p>${htmlEscape(r.description)}</p>\n`;
  out += `${indent}  <div class="tag-row">${tagRow}</div>\n`;
  if (opts.flavorFoot) {
    out += `${indent}  <div class="shelf-card-foot" aria-hidden="true"><span class="shelf-flavor-badge" data-flavor-badge></span><span class="shelf-flavor-caption" data-flavor-caption></span></div>\n`;
  }
  out += `${indent}</article>`;
  return out;
}

function buildHomeRegion(manifest, indent) {
  const posts = manifest.records.filter((r) => r.content_type === 'post' && r.__effective.include_on_home).sort(compareDateOrderedThenId);
  return posts.map((r) => renderPostRow(r, indent)).join('\n') + '\n' + indent.slice(0, -2);
}

function buildArticlesRegion(manifest, indent) {
  const posts = manifest.records.filter((r) => r.content_type === 'post' && r.__effective.include_in_articles).sort(compareDateOrderedThenId);
  return posts.map((r) => renderPostCard(r, indent)).join('\n') + '\n' + indent.slice(0, -2);
}

function buildLearningLabRegion(manifest, indent) {
  const posts = manifest.records.filter((r) => r.content_type === 'post' && r.section === 'Learning Lab' && r.status === 'published').sort(compareDateOrderedThenId);
  return posts.map((r) => renderPostCard(r, indent)).join('\n') + '\n' + indent.slice(0, -2);
}

function buildTableTalkRegion(manifest, indent) {
  const posts = manifest.records.filter((r) => r.content_type === 'post' && r.section === 'Table Talk' && r.status === 'published').sort(compareDateOrderedThenId);
  const cards = posts.map((r) => renderPostCard(r, indent, { flavorFoot: !!r.flavor_card }));
  // cross_posts (§3.3 row 9 must preserve verbatim; T-19)
  for (const r of manifest.records) {
    if (!r.cross_posts) continue;
    for (const cp of r.cross_posts) {
      if (cp.section !== 'Table Talk') continue;
      const slug = r.id.split(':')[1];
      let out = `${indent}<article class="post-card">\n`;
      out += `${indent}  <div class="card-topline"><span>${htmlEscape(cp.label)}</span><span>${r.reading_minutes} min read</span></div>\n`;
      out += `${indent}  <h3><a href="../posts/${slug}/">${htmlEscape(r.title)}</a></h3>\n`;
      out += `${indent}  <p>${htmlEscape(cp.description)}</p>\n`;
      out += `${indent}  <div class="tag-row">${cp.tags.map((t) => `<span>${htmlEscape(t)}</span>`).join('')}</div>\n`;
      out += `${indent}  <div class="card-topline" style="margin-top:6px;"><span style="color:var(--fainter);">from the ${xmlEscapeName(cp.section === 'Table Talk' ? '' : '')}${htmlEscape('Learning Lab')}</span><span style="color:var(--accent);font-size:14px;">&rarr;</span></div>\n`;
      out += `${indent}</article>`;
      cards.push(out);
    }
  }
  function xmlEscapeName(s) { return s; }
  return cards.join('\n') + '\n' + indent.slice(0, -2);
}

const FIELD_GUIDE_LANES = ['QA Strategy', 'Automation', 'Metrics & Reporting', 'E2E Testing', 'AI in QA'];
function buildFieldGuideLane(manifest, laneName, indent) {
  const posts = manifest.records.filter((r) => r.content_type === 'post' && r.subsection === laneName && r.status === 'published').sort(compareDateOrderedThenId);
  if (posts.length === 0) {
    return `${indent}<p class="links-soon">Guides in progress — first writeups landing soon.</p>\n` + indent.slice(0, -2);
  }
  const slug = (r) => r.id.split(':')[1];
  return posts.map((r) => `${indent}<a href="../posts/${slug(r)}/">${htmlEscape(r.title)} <span class="read">${r.reading_minutes} min</span></a>`).join('\n') + '\n' + indent.slice(0, -2);
}

// -----------------------------------------------------------------------
// Marker integrity (T-09)
// -----------------------------------------------------------------------
function checkMarkers(html, names, filePath) {
  for (const name of names) {
    const startRe = new RegExp(`<!-- GENERATED:${name}:START`, 'g');
    const endRe = new RegExp(`<!-- GENERATED:${name}:END -->`, 'g');
    const starts = (html.match(startRe) || []).length;
    const ends = (html.match(endRe) || []).length;
    if (starts !== 1 || ends !== 1) {
      fail(`${filePath}: marker "${name}" must appear exactly once as a START/END pair (found ${starts} start(s), ${ends} end(s))`);
    }
    const full = markerRegex(name).test(html);
    if (!full) fail(`${filePath}: marker "${name}" START/END pair malformed or missing required warning comment text`);
  }
}

// -----------------------------------------------------------------------
// Compute every generated output in memory (§3.1.1 phase 1)
// -----------------------------------------------------------------------
function computeOutputs(manifest) {
  const outputs = {};

  outputs['assets/data/search-index.json'] = buildSearchIndex(manifest);
  outputs['assets/data/posts.json'] = buildPostsJsonProjection(manifest);
  outputs['feed.xml'] = buildFeedXml(manifest);
  outputs['rss.xml'] = outputs['feed.xml'];
  outputs['sitemap.xml'] = buildSitemapXml(manifest);

  const htmlTargets = [
    { file: 'index.html', markers: ['RECENT_WRITING'], build: { RECENT_WRITING: buildHomeRegion } },
    { file: 'articles/index.html', markers: ['ARTICLES_LIST'], build: { ARTICLES_LIST: buildArticlesRegion } },
    { file: 'learning-lab/index.html', markers: ['LEARNING_LAB_LIST'], build: { LEARNING_LAB_LIST: buildLearningLabRegion } },
    { file: 'table-talk/index.html', markers: ['TABLE_TALK_LIST'], build: { TABLE_TALK_LIST: buildTableTalkRegion } },
    {
      file: 'qa-field-guide/index.html',
      markers: FIELD_GUIDE_LANES.map((_, i) => `FIELD_GUIDE_LANE_${String(i + 1).padStart(2, '0')}`),
      build: Object.fromEntries(FIELD_GUIDE_LANES.map((lane, i) => [`FIELD_GUIDE_LANE_${String(i + 1).padStart(2, '0')}`, (m, indent) => buildFieldGuideLane(m, lane, indent)])),
    },
  ];

  for (const target of htmlTargets) {
    const full = path.join(ROOT, target.file);
    if (!fs.existsSync(full)) fail(`marker target "${target.file}" does not exist`);
    const original = fs.readFileSync(full, 'utf8');
    checkMarkers(original, target.markers, target.file);
    const eol = detectEol(original);
    let unified = original.replace(/\r\n/g, '\n');
    for (const name of target.markers) {
      const re = markerRegex(name);
      const m = unified.match(re);
      const startLine = unified.slice(0, m.index).split('\n').pop();
      const indentMatch = startLine.match(/^(\s*)/);
      const indent = (indentMatch ? indentMatch[1] : '') + '  ';
      const content = target.build[name](manifest, indent);
      unified = spliceMarker(unified, name, indent, '\n' + indent + content.replace(/\n+$/, '') + '\n' + indent.slice(0, -2));
    }
    outputs[target.file] = applyEol(unified, eol);
  }

  return outputs;
}

// -----------------------------------------------------------------------
// §3.1.1 — validate computed outputs before anything is written (phase 2)
// -----------------------------------------------------------------------
function validateOutputs(outputs) {
  // JSON round-trip
  for (const jsonFile of ['assets/data/search-index.json', 'assets/data/posts.json']) {
    try {
      JSON.parse(outputs[jsonFile]);
    } catch (e) {
      fail(`computed output "${jsonFile}" is not valid JSON: ${e.message}`);
    }
  }
  // XML well-formedness (minimal, dependency-free check)
  for (const xmlFile of ['feed.xml', 'rss.xml', 'sitemap.xml']) {
    assertWellFormedXmlBasic(outputs[xmlFile], xmlFile);
  }
  // non-empty content
  for (const [name, content] of Object.entries(outputs)) {
    if (!content || !content.trim()) fail(`computed output "${name}" is empty`);
  }
  // UTF-8 encodability (always true for JS strings; explicit check that no lone surrogates exist)
  for (const [name, content] of Object.entries(outputs)) {
    if (/[\uD800-\uDFFF]/.test(content) && !/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(content)) {
      fail(`computed output "${name}" contains an unencodable lone surrogate`);
    }
  }
}

function assertWellFormedXmlBasic(text, label) {
  const stack = [];
  const tagRe = /<([a-zA-Z0-9]+)((?:\s[^<>]*)?)\/?>|<\/([a-zA-Z0-9]+)>/g;
  let m;
  while ((m = tagRe.exec(text))) {
    const full = m[0];
    if (full.endsWith('/>')) continue;
    if (m[3]) {
      const top = stack.pop();
      if (top !== m[3]) fail(`${label}: XML not well-formed (expected close for "${top}", got "${m[3]}")`);
    } else if (m[1]) {
      stack.push(m[1]);
    }
  }
  if (stack.length) fail(`${label}: XML not well-formed (unclosed tag(s): ${stack.join(', ')})`);
}

// -----------------------------------------------------------------------
// §3.4 lock 3 — post-write hash assertion
// -----------------------------------------------------------------------
function hashAllFilesUnder(dir) {
  const hashes = new Map();
  if (!fs.existsSync(dir)) return hashes;
  (function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const buf = fs.readFileSync(full);
        hashes.set(full, crypto.createHash('sha256').update(buf).digest('hex'));
      }
    }
  })(dir);
  return hashes;
}

function assertPostsUnchanged(before, after) {
  if (before.size !== after.size) {
    fail(`SAFETY: file count under posts/** changed (${before.size} -> ${after.size}) — article-body protection violated`);
  }
  for (const [file, hash] of before) {
    if (after.get(file) !== hash) {
      fail(`SAFETY: file changed under posts/** — ${file} — article-body protection violated`);
    }
  }
}

// -----------------------------------------------------------------------
// §3.1.1 — the transactional write process (phases 3-8)
// -----------------------------------------------------------------------
function writeOutputsTransactionally(outputs) {
  const order = [
    'assets/data/search-index.json',
    'assets/data/posts.json',
    'feed.xml',
    'rss.xml',
    'sitemap.xml',
    'index.html',
    'articles/index.html',
    'learning-lab/index.html',
    'table-talk/index.html',
    'qa-field-guide/index.html',
  ];

  // phase 3 — confirm targets against deny/allow lists
  for (const rel of order) {
    if (isDenied(rel)) fail(`SAFETY: refusing to write denied path "${rel}"`);
    if (!isAllowed(rel)) fail(`SAFETY: refusing to write path not on the allow-list "${rel}"`);
  }

  // phase 3 (continued) — every target's current bytes must be readable as a plain
  // file. A target that exists but isn't a regular file (a directory, a broken
  // symlink, a permission error) is a confirm-targets failure: abort here, before
  // anything is staged or written, exactly like §3.1.1 phase 3 requires.
  let targets;
  try {
    targets = order.filter((rel) => {
      const full = path.join(ROOT, rel);
      if (!fs.existsSync(full)) return true;
      const stat = fs.statSync(full);
      if (!stat.isFile()) fail(`SAFETY: target "${rel}" exists but is not a regular file (cannot confirm target)`);
      const current = fs.readFileSync(full, 'utf8');
      return current !== outputs[rel];
    });
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    fail(`SAFETY: could not confirm target state before writing: ${e.message}`);
  }

  if (targets.length === 0) {
    return { written: [], skipped: order };
  }

  const postsHashBefore = hashAllFilesUnder(path.join(ROOT, 'posts'));

  const pid = process.pid;
  const staged = [];
  const backedUp = [];
  try {
    // phase 4 — stage
    for (const rel of targets) {
      const full = path.join(ROOT, rel);
      const tmp = full + `.${pid}.tmp`;
      fs.writeFileSync(tmp, outputs[rel], 'utf8');
      staged.push({ rel, full, tmp });
    }
    // phase 5 — verify staged files byte-for-byte
    for (const s of staged) {
      const readBack = fs.readFileSync(s.tmp, 'utf8');
      if (readBack !== outputs[s.rel]) fail(`staging verification failed for "${s.rel}"`);
    }
    // phase 6 — replace, in fixed order (already filtered+ordered via `order`)
    for (const s of staged) {
      if (fs.existsSync(s.full)) {
        const bak = s.full + `.${pid}.bak`;
        fs.copyFileSync(s.full, bak);
        backedUp.push({ rel: s.rel, full: s.full, bak });
      }
      fs.renameSync(s.tmp, s.full);
    }
  } catch (e) {
    // phase 7 — rollback in reverse order
    const restored = [];
    const failed = [];
    for (let i = backedUp.length - 1; i >= 0; i--) {
      const b = backedUp[i];
      try {
        fs.copyFileSync(b.bak, b.full);
        fs.unlinkSync(b.bak);
        restored.push(b.rel);
      } catch (e2) {
        failed.push(b.rel);
      }
    }
    for (const s of staged) {
      if (fs.existsSync(s.tmp)) {
        try { fs.unlinkSync(s.tmp); } catch (e3) { /* best effort */ }
      }
    }
    if (failed.length) {
      const err = new Error(`ROLLBACK FAILURE: ${failed.join(', ')} could not be restored from .bak — manual intervention required. Restored OK: ${restored.join(', ') || '(none)'}`);
      err.rollbackFailure = true;
      throw err;
    }
    const err = new Error(`write failed, rolled back cleanly: ${e.message}`);
    err.rolledBack = true;
    throw err;
  }

  // phase 8 — cleanup
  for (const b of backedUp) {
    if (fs.existsSync(b.bak)) fs.unlinkSync(b.bak);
  }
  for (const s of staged) {
    if (fs.existsSync(s.tmp)) fs.unlinkSync(s.tmp);
  }

  // lock 3 — post-write hash assertion
  const postsHashAfter = hashAllFilesUnder(path.join(ROOT, 'posts'));
  assertPostsUnchanged(postsHashBefore, postsHashAfter);

  return { written: targets, skipped: order.filter((r) => !targets.includes(r)) };
}

// -----------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--check') ? 'check' : args.includes('--report') ? 'report' : 'generate';

  const manifestPath = path.join(ROOT, 'assets/data/content-index.json');
  let manifest;
  try {
    manifest = loadManifest(manifestPath);
    validateManifest(manifest);
  } catch (e) {
    if (e instanceof ValidationError) {
      console.error(`VALIDATION ERROR: ${e.message}`);
      process.exit(1);
    }
    throw e;
  }

  let pageProblems;
  try {
    pageProblems = validateAgainstPages(manifest, {});
  } catch (e) {
    if (e instanceof ValidationError) {
      console.error(`VALIDATION ERROR: ${e.message}`);
      process.exit(1);
    }
    throw e;
  }

  if (pageProblems.errors.length) {
    for (const w of pageProblems.warnings) console.error(w);
    for (const err of pageProblems.errors) console.error(`VALIDATION ERROR: ${err}`);
    process.exit(1);
  }

  if (mode === 'report') {
    for (const w of pageProblems.warnings) console.log(w);
    let outputs;
    try {
      outputs = computeOutputs(manifest);
    } catch (e) {
      if (e instanceof ValidationError) {
        console.log(`(report) could not compute outputs: ${e.message}`);
        process.exit(0);
      }
      throw e;
    }
    for (const [rel, content] of Object.entries(outputs)) {
      const full = path.join(ROOT, rel);
      const current = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
      const stale = current !== content;
      console.log(`${stale ? 'STALE' : 'clean'}  ${rel}`);
    }
    process.exit(0);
  }

  let outputs;
  try {
    outputs = computeOutputs(manifest);
    validateOutputs(outputs);
  } catch (e) {
    if (e instanceof ValidationError) {
      console.error(`VALIDATION ERROR: ${e.message}`);
      process.exit(1);
    }
    throw e;
  }

  if (mode === 'check') {
    const stale = [];
    for (const [rel, content] of Object.entries(outputs)) {
      const full = path.join(ROOT, rel);
      const current = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
      if (current !== content) stale.push(rel);
    }
    for (const w of pageProblems.warnings) console.error(w);
    if (stale.length) {
      console.error(`DRIFT DETECTED in: ${stale.join(', ')}`);
      process.exit(4);
    }
    console.log('clean — no drift');
    process.exit(0);
  }

  // generate mode
  try {
    const result = writeOutputsTransactionally(outputs);
    for (const w of pageProblems.warnings) console.error(w);
    console.log(`wrote: ${result.written.join(', ') || '(none — already clean)'}`);
    process.exit(0);
  } catch (e) {
    if (e.rollbackFailure) {
      console.error(e.message);
      process.exit(3);
    }
    if (e.rolledBack) {
      console.error(e.message);
      process.exit(2);
    }
    if (e instanceof ValidationError) {
      console.error(`VALIDATION ERROR: ${e.message}`);
      process.exit(1);
    }
    throw e;
  }
}

module.exports = {
  loadManifest, validateManifest, validateRecordShape, resolveVisibility,
  computeOutputs, validateOutputs, writeOutputsTransactionally,
  hashAllFilesUnder, assertPostsUnchanged, isDenied, isAllowed,
  normalize, compareDateOrderedThenId, buildSearchIndex, buildPostsJsonProjection,
  buildFeedXml, buildSitemapXml, validateAgainstPages, checkPostOrphans, checkMarkers, markerRegex,
  CANONICAL_MISSING_DEBT, CANONICAL_VALUE_DEBT, ValidationError, ROOT,
  RE_ROUTE_DIR, RE_ROUTE_FILE,
};

if (require.main === module) {
  main();
}
