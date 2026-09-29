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
