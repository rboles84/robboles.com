'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./helpers');

const DEBT_PATH = path.join(ROOT, 'tests', 'fixtures', 'magic-math-public-language-debt.json');
const debt = JSON.parse(fs.readFileSync(DEBT_PATH, 'utf8'));

const PROHIBITED = {
  snapshot: /\bsnapshots?\b/gi,
  dataset: /\bdatasets?\b/gi,
  database: /\bdatabases?\b/gi,
  'semantic basis': /\bsemantic (?:legality )?bases?\b/gi,
  'evidence rows': /\bevidence rows?\b/gi,
  'generation run': /\bgeneration runs?\b/gi,
  'commit or SHA': /\b(?:analysis commit|structural evidence sha|oracle-role analysis sha|sha-?256)\b/gi,
  'validation status': /\bvalidation status\b/gi,
  'complete graph': /\bcomplete graphs?\b/gi,
  bipartite: /\bbipartite\b/gi,
  clique: /\bcliques?\b/gi,
  degree: /\bdegree(?:s)?\b/gi,
  topology: /\btopolog(?:y|ies|ical)\b/gi,
  compression: /\bcompression\b/gi,
  'mechanism family': /\bmechanism families?\b/gi,
  'Vox Mana': /\bVox Mana\b/gi,
  'frozen release language': /\b(?:frozen dataset|source release|raw stored rows?)\b/gi,
};

function decodeEntities(text) {
  return text
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&apos;|&#0*39;|&rsquo;/gi, "'")
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/&#\d+;/g, ' ');
}

function visibleHtmlText(html) {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
  );
}

function markdownProse(markdown) {
  return markdown
    .replace(/^---\s*$[\s\S]*?^---\s*$/m, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/\s+/g, ' ');
}

function countHits(text) {
  const counts = {};
  for (const [label, pattern] of Object.entries(PROHIBITED)) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches?.length) counts[label] = matches.length;
  }
  return counts;
}

function listPublicMagicMathHtml() {
  const root = path.join(ROOT, 'magic-math');
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name, 'index.html'))
    .filter(fs.existsSync);
}

function listDrafts() {
  const root = path.join(ROOT, 'content', 'drafts');
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(root, name))
    .filter((file) => fs.readFileSync(file, 'utf8').includes('magic-math-public-copy'));
}

function listPublicSvgCandidates() {
  const roots = [path.join(ROOT, 'magic-math'), path.join(ROOT, 'assets', 'images', 'magic-math')];
  const found = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg')) found.push(full);
    }
  }
  roots.forEach(walk);
  return [...new Set(found)];
}

function assertWithinDebt(file, counts) {
  const relative = path.relative(ROOT, file).replaceAll('\\', '/');
  const allowance = debt.files[relative] || {};
  const violations = [];
  for (const [label, count] of Object.entries(counts)) {
    const ceiling = allowance[label] || 0;
    if (count > ceiling) violations.push(`${label}: ${count} found, ceiling ${ceiling}`);
  }
  assert.equal(
    violations.length,
    0,
    `${relative} exposes under-the-hood Magic Math language:\n  - ${violations.join('\n  - ')}`
  );
}

test('Magic Math public HTML does not add under-the-hood language', () => {
  for (const file of listPublicMagicMathHtml()) {
    const text = visibleHtmlText(fs.readFileSync(file, 'utf8'));
    assertWithinDebt(file, countHits(text));
  }
});

test('Magic Math Markdown drafts contain player-facing prose only', () => {
  for (const file of listDrafts()) {
    const text = markdownProse(fs.readFileSync(file, 'utf8'));
    assertWithinDebt(file, countHits(text));
  }
});

test('Magic Math SVG text contains no research lineage or graph jargon', () => {
  for (const file of listPublicSvgCandidates()) {
    const text = visibleHtmlText(fs.readFileSync(file, 'utf8'));
    assertWithinDebt(file, countHits(text));
  }
});

test('temporary debt list names only real published files and known terms', () => {
  for (const [relative, allowance] of Object.entries(debt.files)) {
    assert.ok(fs.existsSync(path.join(ROOT, relative)), `Debt file does not exist: ${relative}`);
    for (const label of Object.keys(allowance)) {
      assert.ok(PROHIBITED[label], `Unknown debt term for ${relative}: ${label}`);
      assert.ok(Number.isInteger(allowance[label]) && allowance[label] >= 0, `Invalid debt ceiling: ${relative} ${label}`);
    }
  }
});
