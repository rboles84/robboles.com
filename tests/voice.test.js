'use strict';
/* Voice pass: checks every published post against the anti-slop rules in
   docs/voice/anti-patterns.md, so drift toward generic AI/corporate tone
   gets caught automatically instead of relying on a human re-reading every
   old post by hand every time a new one ships.

   This is NOT a substitute for docs/voice/voice-and-publish-checklist.md.
   It only catches the mechanically checkable half (Part B: cadence,
   filler, tells). Part A (does this post say something only Rob could
   say — a real dated specific, a real "where this breaks") and metaphor-
   family discipline are judgment calls no regex can make; keep doing
   those by hand ("read it aloud").

   The actual banned-phrase list is private (docs/voice/lint-rules.js,
   gitignored — mirrors anti-patterns.md, never move it into a tracked
   directory per AGENTS.md). This file holds the checking LOGIC only, so
   it's safe to commit. If the private rules file isn't present (e.g. a
   clone without the private voice layer), every test here skips itself
   instead of failing. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./helpers');

const RULES_PATH = path.join(ROOT, 'docs', 'voice', 'lint-rules.js');
const rules = fs.existsSync(RULES_PATH) ? require(RULES_PATH) : null;

const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'posts.json'), 'utf8'));

function getArticleText(slug) {
  const html = fs.readFileSync(path.join(ROOT, 'posts', slug, 'index.html'), 'utf8');
  const bodyMatch = html.match(/<div class="article-body">([\s\S]*?)<\/div>\s*<aside/);
  if (!bodyMatch) throw new Error(`posts/${slug}/index.html: couldn't find <div class="article-body">`);
  const body = bodyMatch[1];
  // Drop the reusable-asset checklist and code blocks — bullet fragments and
  // command syntax there aren't prose and shouldn't be judged as such.
  const proseOnly = body
    .replace(/<div class="reusable-asset">[\s\S]*?<\/div>/g, ' ')
    .replace(/<pre>[\s\S]*?<\/pre>/g, ' ');
  const text = proseOnly
    .replace(/<[^>]+>/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;|&#0*39;/g, "'")
    .replace(/&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/&hellip;/g, '...')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function findPhraseHits(text, phrases) {
  const lower = text.toLowerCase();
  return phrases.filter((p) => lower.includes(p.toLowerCase()));
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 3); // ignore stray fragments
}

if (!rules) {
  test('voice pass (skipped — private rules file not present)', { skip: true }, () => {});
} else {
  for (const post of posts) {
    test(`voice pass: ${post.slug}`, () => {
      const text = getArticleText(post.slug);
      const problems = [];

      const phraseGroups = {
        'filler vocabulary': rules.fillerPhrases,
        'manufactured-relatability / throat-clearing opener': rules.openingBans,
        'rhetorical-question pivot': rules.rhetoricalPivots,
        'tidy-bow closer': rules.tidyBowClosers,
        'absolutes-as-confidence': rules.authorityTells,
        'hedging stack': rules.hedgingStacks,
        'over-signposting': rules.overSignposting,
      };
      for (const [label, phrases] of Object.entries(phraseGroups)) {
        const hits = findPhraseHits(text, phrases || []);
        if (hits.length) problems.push(`${label}: "${hits.join('", "')}"`);
      }

      const firstPara = text.split(/(?<=[.!?])\s+/).slice(0, 1).join(' ');
      const defRe = new RegExp(rules.definitionOpenerPattern, 'i');
      if (defRe.test(firstPara.toLowerCase())) {
        problems.push(`definition-opener hook: "${firstPara.slice(0, 80)}..."`);
      }

      assert.equal(
        problems.length, 0,
        `posts/${post.slug}/ has anti-pattern hit(s):\n  - ${problems.join('\n  - ')}`
      );
    });

    test(`rhythm: ${post.slug} doesn't repeat the same sentence-opener 3+ times`, () => {
      const text = getArticleText(post.slug);
      const sentences = splitSentences(text);
      const openers = new Map();
      for (const s of sentences) {
        const key = s.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
        openers.set(key, (openers.get(key) || 0) + 1);
      }
      const repeats = [...openers.entries()].filter(([, count]) => count >= 3);
      assert.equal(
        repeats.length, 0,
        `posts/${post.slug}/ repeats a 3-word sentence opener 3+ times: ${repeats.map(([k, c]) => `"${k}..." (x${c})`).join(', ')}`
      );
    });

    test(`rhythm: ${post.slug} sentence length isn't suspiciously uniform`, () => {
      const text = getArticleText(post.slug);
      const lens = splitSentences(text).map((s) => s.split(/\s+/).length);
      const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
      const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
      const coefficientOfVariation = Math.sqrt(variance) / mean;
      // Calibrated against the site's own approved posts, which measure
      // 0.667-0.826. AI-evenness reads noticeably lower than that in
      // practice; 0.45 leaves real margin below the observed human floor.
      assert.ok(
        coefficientOfVariation >= 0.45,
        `posts/${post.slug}/ sentence lengths look too uniform (coefficient of variation ` +
        `${coefficientOfVariation.toFixed(3)}, expected >= 0.45) — a sign of the "evenness reads as machine" tell`
      );
    });
  }
}
