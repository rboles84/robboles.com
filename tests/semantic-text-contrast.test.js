'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./helpers');

const css = fs.readFileSync(path.join(ROOT, 'assets', 'css', 'styles.css'), 'utf8');

function declarationsFor(selector, fromIndex = 0) {
  const start = css.indexOf(`${selector} {`, fromIndex);
  assert.notEqual(start, -1, `missing CSS rule for ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

function propertyValue(declarations, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = declarations.match(new RegExp(`(?:^|;)\\s*${escaped}\\s*:\\s*([^;]+)`));
  return match ? match[1].trim() : '';
}

function customProperties(declarations) {
  const values = new Map();
  for (const match of declarations.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    values.set(match[1], match[2].trim());
  }
  return values;
}

function resolveToken(value, values, seen = new Set()) {
  const match = value.match(/^var\((--[\w-]+)\)$/);
  if (!match) return value;
  assert.ok(!seen.has(match[1]), `circular token reference at ${match[1]}`);
  assert.ok(values.has(match[1]), `missing token ${match[1]}`);
  seen.add(match[1]);
  return resolveToken(values.get(match[1]), values, seen);
}

function hexToRgb(hex) {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  assert.ok(match, `expected six-digit hex color, got ${hex}`);
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(hex) {
  return hexToRgb(hex)
    .map((channel) => channel / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function assertContrastAtLeast(name, foreground, background, tokens, minimum = 4.5) {
  const resolvedForeground = resolveToken(foreground, tokens);
  const resolvedBackground = resolveToken(background, tokens);
  const ratio = contrast(resolvedForeground, resolvedBackground);
  assert.ok(ratio >= minimum, `${name} must be at least ${minimum}:1; got ${ratio.toFixed(2)}:1`);
}

const rootTokens = customProperties(declarationsFor(':root'));
const systemDarkTokens = new Map([
  ...rootTokens,
  ...customProperties(declarationsFor(':root:not([data-theme="light"])')),
]);
const explicitDarkTokens = new Map([
  ...rootTokens,
  ...customProperties(declarationsFor(':root[data-theme="dark"]')),
]);

test('RBB-074: lane text uses readable colors while decorative gold keeps its original value', () => {
  for (const tokens of [rootTokens,systemDarkTokens,explicitDarkTokens]) {
    for (const surface of ['--bg','--surface','--surface-2']) {
      assertContrastAtLeast('gold text', 'var(--tt-label-text)', `var(${surface})`, tokens);
      assertContrastAtLeast('caption text', 'var(--text-subtle)', `var(${surface})`, tokens);
    }
  }
  for (const selector of ['.tt-eyebrow','.tt-art-cap .artist','body[data-lane="table-talk"] .post-card .card-topline span:first-child']) {
    assert.equal(propertyValue(declarationsFor(selector),'color'),'var(--tt-label-text)');
  }
  for (const selector of ['.tt-art-cap','.tt-art-cap .tt-set-name']) assert.equal(propertyValue(declarationsFor(selector),'color'),'var(--text-subtle)');
  assert.equal(propertyValue(declarationsFor('body[data-lane="table-talk"]'),'--tt-gold'),'#b9902e');
});

test('RBB-075: standalone labels and the AI print button have readable foreground/background pairs', () => {
  const kits = ['ai-decision-authority-checklist','gqm-mapping-worksheet','quality-translated','risk-based-regression-triage-sheet','static-site-launch-readiness'];
  for (const slug of kits) {
    const html=fs.readFileSync(path.join(ROOT,'field-kit',slug,slug+'.html'),'utf8');
    const tokens=customProperties(html.match(/:root\s*\{([^}]+)\}/)[1]+';');
    const label=html.match(/\.eyebrow\s*\{([^}]+)\}/)[1];
    assert.equal(propertyValue(label,'color'),'var(--accent-dark)');
    assertContrastAtLeast(slug, 'var(--accent-dark)', tokens.has('--card')?'var(--card)':'var(--paper)',tokens);
    if (slug==='ai-decision-authority-checklist') {
      const button=html.match(/\n\s*button\s*\{([^}]+)\}/)[1];
      assert.equal(propertyValue(button,'background'),'var(--accent-dark)');
      assert.ok(contrast('#ffffff',resolveToken('var(--accent-dark)',tokens))>=4.5);
    }
  }
});

test('RBB-073: bounded supporting-text consumers retain surface-compatible readable roles', () => {
  const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
  const expectRole = (file, pattern, count, role, surfaces) => {
    const matches = [...read(file).matchAll(pattern)];
    assert.equal(matches.length, count, `${file}: semantic target inventory changed`);
    for (const match of matches) {
      assert.match(match[0], new RegExp(`color:var\\(${role}\\)`), `${file}: target must use ${role}`);
    }
    for (const [theme, tokens] of [['light', rootTokens], ['system dark', systemDarkTokens], ['explicit dark', explicitDarkTokens]]) {
      for (const surface of surfaces) assertContrastAtLeast(`${file} ${theme} ${role} on ${surface}`, `var(${role})`, `var(${surface})`, tokens);
    }
  };
  const subtle = '--text-subtle', fixed = '--text-subtle-on-dark';
  for (const [selector, surface] of [['body', '--bg'], ['.post-card', '--surface'], ['.reusable-asset', '--surface']]) {
    assert.equal(propertyValue(declarationsFor(selector), 'background'), `var(${surface})`, `${selector}: target surface changed`);
  }
  expectRole('field-kit/index.html', /<div class="card-actions">[^\n]+<\/div>\s*<div class="card-topline"[^>]*><span[^>]*>from [\s\S]*?<\/span>/g, 9, subtle, ['--surface']);
  for (const [file, title, count] of [['learning-lab/index.html','experiment log',1],['table-talk/index.html',"what's inside",1],['magic-math/index.html',"what's inside",3]]) {
    expectRole(file, new RegExp(`<div class="note-card"[^>]*>\\s*<h2[^>]*>${title}<\\/h2>`, 'g'), count, fixed, ['--dark-2']);
    // The fixed role must stay paired with the fixed surface in every shared theme.
    const cards = [...read(file).matchAll(/<div class="note-card"[^>]*>/g)];
    assert.equal(cards.length, count);
    for (const card of cards) assert.match(card[0], /background:var\(--dark-2\)/);
  }
  expectRole('table-talk/index.html', /<p class="lane-note-cta"[^>]*>More table talk is coming[\s\S]*?<\/p>/g, 1, subtle, ['--bg']);
  expectRole('table-talk/index.html', /<p[^>]*>(?:Nine pieces I keep coming back to|These are workshops, not authorities:)[\s\S]*?<\/p>/g, 2, subtle, ['--bg']);
  for (const file of ['posts/how-i-run-ai-like-a-qa-system/index.html','posts/traceable-is-not-true/index.html']) {
    expectRole(file, /<p[^>]*>Spinning this into a printable Field Kit card next\.<\/p>/g, 1, subtle, ['--surface']);
  }
  const lands = 'posts/why-magic-lands-are-so-weird/index.html';
  const timeline = read(lands).match(/<div class="reusable-asset" id="timeline">([\s\S]*?)<\/div>/);
  assert.ok(timeline);
  const dates = [...timeline[1].matchAll(/<li[^>]*>\s*<span[^>]*>\d{4}&ndash;\d{4}<\/span>/g)];
  assert.equal(dates.length, 6);
  for (const date of dates) assert.match(date[0], /color:var\(--text-subtle\)/);
  expectRole(lands, /<p[^>]*>Era names and dates come straight from[\s\S]*?<\/p>/g, 1, subtle, ['--surface']);
  const generator = require('../scripts/build-site-indexes');
  const manifest = generator.loadManifest(path.join(ROOT, 'assets/data/content-index.json'));
  generator.validateManifest(manifest);
  const output = generator.computeOutputs(manifest);
  const crossover = /<span[^>]*>from the Learning Lab<\/span>/g;
  const emitted = [...output['table-talk/index.html'].matchAll(crossover)];
  const served = [...read('table-talk/index.html').matchAll(crossover)];
  assert.equal(emitted.length, 1);
  assert.deepEqual(served.map(m => m[0]), emitted.map(m => m[0]), 'served crossover must match its producer');
  assert.match(emitted[0][0], /color:var\(--text-subtle\)/);
  for (const tokens of [rootTokens, systemDarkTokens, explicitDarkTokens]) {
    assertContrastAtLeast('crossover card source', 'var(--text-subtle)', 'var(--surface)', tokens);
  }
});

test('semantic readable-text roles meet normal-text contrast on every shared surface they serve', () => {
  const themeMatrices = [
    ['light', rootTokens],
    ['system dark', systemDarkTokens],
    ['explicit dark', explicitDarkTokens],
  ];

  for (const [theme, tokens] of themeMatrices) {
    for (const surface of ['var(--bg)', 'var(--surface)', 'var(--surface-2)']) {
      assertContrastAtLeast(`${theme} subtle text on ${surface}`, 'var(--text-subtle)', surface, tokens);
      assertContrastAtLeast(`${theme} link text on ${surface}`, 'var(--link-text)', surface, tokens);
    }
    assertContrastAtLeast(`${theme} callout label`, 'var(--link-text)', 'var(--accent-soft)', tokens);
    assertContrastAtLeast(`${theme} warning label`, 'var(--warn-label-text)', 'var(--warn-bg)', tokens);
    assertContrastAtLeast(`${theme} CTA copy`, 'var(--cta-copy)', 'var(--accent-soft)', tokens);
    assertContrastAtLeast(`${theme} filled accent button`, 'var(--accent-fill-ink)', 'var(--accent-fill)', tokens);
  }

  for (const surface of ['var(--dark)', 'var(--dark-2)', 'var(--dark-3)']) {
    assertContrastAtLeast(`fixed subtle text on ${surface}`, 'var(--text-subtle-on-dark)', surface, rootTokens);
    assertContrastAtLeast(`fixed link text on ${surface}`, 'var(--link-text-on-dark)', surface, rootTokens);
  }
});

test('representative shared readable-text consumers use semantic roles instead of decorative colors', () => {
  const expectedColors = new Map([
    ['a', 'var(--link-text)'],
    ['.brand-text small', 'var(--text-subtle)'],
    ['.nav-search', 'var(--link-text)'],
    ['.breadcrumbs', 'var(--text-subtle)'],
    ['.breadcrumbs a', 'var(--link-text)'],
    ['.card-topline', 'var(--text-subtle)'],
    ['.article-meta', 'var(--text-subtle)'],
    ['.footer-grid h2', 'var(--text-subtle)'],
    ['.footer-bottom', 'var(--text-subtle)'],
    ['.post-row .read', 'var(--text-subtle)'],
    ['.callout .callout-label', 'var(--link-text)'],
    ['.kit-voice-label', 'var(--link-text)'],
    ['.projects-dark .row-head .meta', 'var(--text-subtle-on-dark)'],
    ['.project-feature .featured-line', 'var(--link-text-on-dark)'],
  ]);

  for (const [selector, expected] of expectedColors) {
    assert.equal(propertyValue(declarationsFor(selector), 'color'), expected, `${selector} must use ${expected}`);
  }

  const accentButton = declarationsFor('.button.accent');
  assert.equal(propertyValue(accentButton, 'background'), 'var(--accent-fill)');
  assert.equal(propertyValue(accentButton, 'color'), 'var(--accent-fill-ink)');

  for (const protectedToken of ['--faint', '--fainter', '--accent']) {
    assert.equal(rootTokens.get(protectedToken), new Map([
      ['--faint', '#8a8578'],
      ['--fainter', '#b8b3a6'],
      ['--accent', '#1f8a5b'],
    ]).get(protectedToken), `${protectedToken} decorative palette value changed`);
  }
});
