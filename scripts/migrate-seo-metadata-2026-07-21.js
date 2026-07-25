#!/usr/bin/env node
'use strict';
/*
 * RBB-046 — ONE-TIME migration: normalize og:description / JSON-LD description /
 * (one) <meta name="description"> to effective_seo_description on exactly the 8
 * posts named in RBB-045 plan §2.3.3a's declared migration diff (T-29).
 *
 * This is explicitly NOT part of scripts/build-site-indexes.js's standing behavior
 * (rule 8 of Rob's authorization, 2026-07-21): the generator never gets general
 * write permission into posts/**. This script is a narrow, one-time, reviewable
 * exception, authorized directly by Rob to unblock AD-4 (see the handoff / final
 * report for the exact authorization text). It is safe to delete after one run.
 *
 * Safety model (Rob's rule 5):
 *   (a) hard article-body hash protection — every file under posts/** is hashed;
 *       for the 8 approved files, the hash EXCLUDES only the specific bytes of
 *       the 3 approved tag values (masked with a placeholder before hashing) —
 *       everything else in those files, including the article body, must be
 *       byte-identical before/after. For every other file under posts/**, the
 *       ordinary whole-file hash must be byte-identical before/after.
 *   (b) a strict 8-file allow-list (exactly the paths below)
 *   (c) a strict field-level allow-list (only meta description / og:description /
 *       JSON-LD description — never title, lede, .promise, tags, dates, reading
 *       time, or article body)
 *   (d) any attempted change to a 9th file, or to a field not on this list,
 *       anywhere under posts/**, is a hard failure before anything is written.
 *
 * Transactional: compute + verify all 8 files in memory first; stage each to
 * <file>.<pid>.tmp; verify byte-for-byte; back up to <file>.<pid>.bak; replace;
 * on any failure, roll back every already-replaced file from its .bak.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');

// Rule (b) — the strict 8-file allow-list. Nothing else under posts/** may be touched.
const TARGETS = [
  {
    slug: 'automation-tool-vs-process',
    changes: [
      { field: 'og', old: `<meta property="og:description" content="Teams blame the framework when nightly runs go red and tests get flaky. Most of the time the framework isn't the problem &#8212; nobody owns the suite.">`,
        new: `<meta property="og:description" content="Teams blame the framework when nightly runs go red and tests get flaky. Most of the time the framework isn't the problem &#8212; nobody owns the suite. Here's what changes when you fix that instead of rewriting it.">` },
    ],
  },
  {
    slug: 'reclaiming-qa-dashboards-gqm',
    changes: [
      { field: 'og', old: `<meta property="og:description" content="Most QA dashboards get built bottom-up from whatever the tools export. GQM flips the build order &#8212; no metric survives unless it traces back to a real goal.">`,
        new: `<meta property="og:description" content="Most QA dashboards get built bottom-up from whatever the tools export, which is how they end up full of vanity metrics nobody acts on. The Goal-Question-Metric framework flips the build order &#8212; and kills the metrics that were never doing real work.">` },
      { field: 'jsonld', old: `"description": "Most QA dashboards get built bottom-up from whatever the tools export, which is how they end up full of vanity metrics nobody acts on. The Goal-Question-Metric framework flips the build order.",`,
        new: `"description": "Most QA dashboards get built bottom-up from whatever the tools export, which is how they end up full of vanity metrics nobody acts on. The Goal-Question-Metric framework flips the build order — and kills the metrics that were never doing real work.",` },
    ],
  },
  {
    slug: 'traceable-is-not-true',
    changes: [
      { field: 'og', old: `<meta property="og:description" content="A v1 launch scan came back green. Exploratory testing found the checks were proving the wrong thing anyway.">`,
        new: `<meta property="og:description" content="A v1 launch scan on Vox Mana came back green &#8212; records existed, citations resolved, generated pages matched their source, regression passed. Exploratory testing found the checks were proving the wrong thing anyway. Here's the gap, and the rule I use to close it.">` },
      { field: 'jsonld', old: `"description": "A v1 launch scan on Vox Mana came back green. Exploratory testing found the checks were proving the wrong thing anyway. Here's the gap, and the rule I use to close it.",`,
        new: `"description": "A v1 launch scan on Vox Mana came back green — records existed, citations resolved, generated pages matched their source, regression passed. Exploratory testing found the checks were proving the wrong thing anyway. Here's the gap, and the rule I use to close it.",` },
    ],
  },
  {
    slug: 'quiz-evidence-not-vibes',
    changes: [
      { field: 'og', old: `<meta property="og:description" content="How voxmana.io's placement quiz is built like an evidence model — signals, confidence, near-miss resolution — instead of a vibes-based personality sticker.">`,
        new: `<meta property="og:description" content="Most fandom quizzes hand you a confident label and no receipts. Building voxmana.io's placement quiz, I built the other kind — one that tracks its evidence, resolves the near-miss, and refuses to call a vibe a fact.">` },
      { field: 'jsonld', old: `"description": "How voxmana.io's placement quiz is built like an evidence model — signals, confidence, and near-miss resolution — instead of a vibes-based personality sticker.",`,
        new: `"description": "Most fandom quizzes hand you a confident label and no receipts. Building voxmana.io's placement quiz, I built the other kind — one that tracks its evidence, resolves the near-miss, and refuses to call a vibe a fact.",` },
    ],
  },
  {
    slug: 'static-site-release-risk',
    changes: [
      { field: 'og', old: `<meta property="og:description" content="A static site has no server to crash — which is exactly why its release risks hide in the seams. Where a 'static' side project still bites, and how to make it visible.">`,
        new: `<meta property="og:description" content="Building voxmana.io as a static site didn't remove release risk — it hid it in the seams. Here's where a 'static' side project can still bite, and how I made those risks visible before launch.">` },
      { field: 'jsonld', old: `"description": "A static site has no server to crash — which is exactly why its release risks hide in the seams. Where a static side project still bites, and how to make it visible.",`,
        new: `"description": "Building voxmana.io as a static site didn't remove release risk — it hid it in the seams. Here's where a 'static' side project can still bite, and how I made those risks visible before launch.",` },
    ],
  },
  {
    slug: 'how-i-cut-a-regression-cycle-in-half',
    changes: [
      { field: 'og', old: `<meta property="og:description" content="Our platform upgraded twice a year, and testing one upgrade took three months. Here's the method that cut it to six weeks.">`,
        new: `<meta property="og:description" content="Our platform upgraded twice a year, and testing one upgrade in full took three months. Here's the method that cut it to six weeks: an honest audit, a coverage map, a business-built rubric, vendor guidance, and ISTQB-style risk scoring.">` },
    ],
  },
  {
    slug: 'why-magic-lands-are-so-weird',
    changes: [
      { field: 'og', old: `<meta property="og:description" content="Thirty years of Magic land design is one long argument about a single question: how easy should it be to cast your spells on time?">`,
        new: `<meta property="og:description" content="Thirty years of Magic land design is one long argument about a single question: how easy should it be to cast your spells on time? Read the lands as answers and it starts to make sense.">` },
    ],
  },
  {
    slug: 'how-i-run-ai-like-a-qa-system',
    changes: [
      { field: 'meta', old: `<meta name="description" content="AI is non-deterministic by design. I spent 14 years making non-deterministic systems trustworthy — so I run my AI work the same way: operating prompts, grounding, examples, gates, and feedback loops.">`,
        new: `<meta name="description" content="I spent 14 years making non-deterministic systems trustworthy. I run AI work the way I run quality engineering.">` },
      { field: 'og', old: `<meta property="og:description" content="AI is non-deterministic by design. I spent 14 years making non-deterministic systems trustworthy — so I run my AI work the same way.">`,
        new: `<meta property="og:description" content="I spent 14 years making non-deterministic systems trustworthy. I run AI work the way I run quality engineering.">` },
      { field: 'jsonld', old: `"description": "AI is non-deterministic by design. I run my AI work the way I run quality engineering: operating prompts, grounding, examples, gates, and feedback loops.",`,
        new: `"description": "I spent 14 years making non-deterministic systems trustworthy. I run AI work the way I run quality engineering.",` },
    ],
  },
];

// Rule (c) — strict field-level allow-list.
const ALLOWED_FIELDS = new Set(['meta', 'og', 'jsonld']);
for (const t of TARGETS) {
  for (const c of t.changes) {
    if (!ALLOWED_FIELDS.has(c.field)) throw new Error(`SAFETY: field "${c.field}" is not on the approved field-level allow-list`);
  }
}

const APPROVED_FILES = new Set(TARGETS.map((t) => path.join(POSTS_DIR, t.slug, 'index.html')));
if (APPROVED_FILES.size !== 8) throw new Error(`SAFETY: expected exactly 8 approved files, got ${APPROVED_FILES.size}`);

const PLACEHOLDER = ' MASKED ';

function maskedHash(content, changes) {
  let masked = content;
  for (const c of changes) {
    masked = masked.split(c.old).join(PLACEHOLDER).split(c.new).join(PLACEHOLDER);
  }
  return crypto.createHash('sha256').update(masked, 'utf8').digest('hex');
}

function plainHash(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function listAllPostsFiles() {
  const out = [];
  (function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(full);
    }
  })(POSTS_DIR);
  return out;
}

function main() {
  const allFiles = listAllPostsFiles();

  // Rule (d) part 1 — snapshot every file under posts/**, not just the 8.
  const otherFiles = allFiles.filter((f) => !APPROVED_FILES.has(f));
  const otherHashesBefore = new Map(otherFiles.map((f) => [f, plainHash(fs.readFileSync(f, 'utf8'))]));
  const approvedMaskedHashesBefore = new Map();

  // Phase 1 — compute + validate in memory.
  const computed = [];
  let totalMeta = 0, totalOg = 0, totalJsonld = 0;
  for (const target of TARGETS) {
    const file = path.join(POSTS_DIR, target.slug, 'index.html');
    if (!fs.existsSync(file)) throw new Error(`SAFETY: approved file missing: ${file}`);
    const original = fs.readFileSync(file, 'utf8');
    let updated = original;
    for (const change of target.changes) {
      const count = updated.split(change.old).length - 1;
      if (count !== 1) {
        throw new Error(`SAFETY: expected exactly 1 occurrence of the approved old value for ${target.slug} (${change.field}), found ${count}. Refusing to write — old value may no longer match the live page.`);
      }
      updated = updated.replace(change.old, change.new);
      if (change.field === 'meta') totalMeta++;
      else if (change.field === 'og') totalOg++;
      else if (change.field === 'jsonld') totalJsonld++;
    }
    approvedMaskedHashesBefore.set(file, maskedHash(original, target.changes));
    const maskedAfterCandidate = maskedHash(updated, target.changes);
    if (maskedAfterCandidate !== approvedMaskedHashesBefore.get(file)) {
      throw new Error(`SAFETY: computed update for ${target.slug} changes bytes outside the approved tag values — aborting.`);
    }
    computed.push({ file, updated });
  }

  // Rule declared counts (Rob's authorization): exactly 1 meta, 8 og, 5 jsonld.
  if (totalMeta !== 1) throw new Error(`SAFETY: expected exactly 1 meta description change, computed ${totalMeta}`);
  if (totalOg !== 8) throw new Error(`SAFETY: expected exactly 8 og:description changes, computed ${totalOg}`);
  if (totalJsonld !== 5) throw new Error(`SAFETY: expected exactly 5 JSON-LD description changes, computed ${totalJsonld}`);

  // Phase 2 — stage, verify, backup, replace (transactional, same pattern as §3.1.1).
  const pid = process.pid;
  const staged = [];
  const backedUp = [];
  try {
    for (const { file, updated } of computed) {
      const tmp = file + `.${pid}.tmp`;
      fs.writeFileSync(tmp, updated, 'utf8');
      const readBack = fs.readFileSync(tmp, 'utf8');
      if (readBack !== updated) throw new Error(`staging verification failed for ${file}`);
      staged.push({ file, tmp });
    }
    for (const s of staged) {
      const bak = s.file + `.${pid}.bak`;
      fs.copyFileSync(s.file, bak);
      backedUp.push({ file: s.file, bak });
      fs.renameSync(s.tmp, s.file);
    }
  } catch (e) {
    for (let i = backedUp.length - 1; i >= 0; i--) {
      const b = backedUp[i];
      fs.copyFileSync(b.bak, b.file);
      fs.unlinkSync(b.bak);
    }
    for (const s of staged) {
      if (fs.existsSync(s.tmp)) fs.unlinkSync(s.tmp);
    }
    throw e;
  }
  for (const b of backedUp) fs.unlinkSync(b.bak);

  // Phase 3 — post-write assertion (rule a + d).
  for (const target of TARGETS) {
    const file = path.join(POSTS_DIR, target.slug, 'index.html');
    const after = fs.readFileSync(file, 'utf8');
    const maskedAfter = maskedHash(after, target.changes);
    if (maskedAfter !== approvedMaskedHashesBefore.get(file)) {
      throw new Error(`SAFETY POST-WRITE FAILURE: ${file} changed bytes outside the approved tag values`);
    }
  }
  for (const f of otherFiles) {
    const after = plainHash(fs.readFileSync(f, 'utf8'));
    if (after !== otherHashesBefore.get(f)) {
      throw new Error(`SAFETY POST-WRITE FAILURE: unapproved file changed under posts/**: ${f}`);
    }
  }

  console.log(`Migration complete. Files changed: ${computed.length}. Field changes: meta=${totalMeta} og=${totalOg} jsonld=${totalJsonld}. All other posts/** files confirmed byte-identical. All 8 approved files confirmed byte-identical outside the approved tag values.`);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('MIGRATION FAILED:', e.message);
    process.exit(1);
  }
}

module.exports = { TARGETS, maskedHash, plainHash, listAllPostsFiles, APPROVED_FILES };
