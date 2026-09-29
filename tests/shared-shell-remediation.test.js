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

const rootTokens = customProperties(declarationsFor(':root'));
const systemDarkTokens = new Map([
  ...rootTokens,
  ...customProperties(declarationsFor(':root:not([data-theme="light"])')),
]);
const explicitDarkTokens = new Map([
  ...rootTokens,
  ...customProperties(declarationsFor(':root[data-theme="dark"]')),
]);

test('focused shared skip link keeps normal-text contrast in light and both dark-theme paths', () => {
  const skip = declarationsFor('.skip-link');
  assert.equal(propertyValue(skip, 'background'), 'var(--dark)');
  assert.equal(propertyValue(skip, 'color'), 'var(--dark-ink)');

  for (const [theme, tokens] of [
    ['light', rootTokens],
    ['system dark', systemDarkTokens],
    ['explicit dark', explicitDarkTokens],
  ]) {
    const foreground = resolveToken(propertyValue(skip, 'color'), tokens);
    const background = resolveToken(propertyValue(skip, 'background'), tokens);
    assert.ok(contrast(foreground, background) >= 4.5, `${theme} skip-link contrast must be at least 4.5:1`);
  }
});

test('right-hand shared dropdown is contained when closed and remains pointer-usable when open', () => {
  const closed = declarationsFor('.nav-dropdown');
  const inward = declarationsFor('.nav-item--table-talk .nav-dropdown');
  const open = declarationsFor('.nav-dropdown.is-open');

  assert.equal(propertyValue(closed, 'position'), 'absolute');
  assert.equal(propertyValue(closed, 'visibility'), 'hidden');
  assert.equal(propertyValue(closed, 'pointer-events'), 'none');
  assert.equal(propertyValue(inward, 'left'), 'auto');
  assert.equal(propertyValue(inward, 'right'), '0');
  assert.equal(propertyValue(open, 'visibility'), 'visible');
  assert.equal(propertyValue(open, 'pointer-events'), 'auto');
  assert.equal(propertyValue(open, 'opacity'), '1');
});

test('Home about copy preserves its exact light color and receives readable dark-theme colors', () => {
  const about = declarationsFor('.about-copy p');
  assert.equal(propertyValue(about, 'color'), 'var(--home-about-copy)');
  assert.equal(resolveToken('var(--home-about-copy)', rootTokens), '#3a3833');

  for (const [theme, tokens] of [
    ['system dark', systemDarkTokens],
    ['explicit dark', explicitDarkTokens],
  ]) {
    const foreground = resolveToken('var(--home-about-copy)', tokens);
    const background = resolveToken('var(--bg)', tokens);
    assert.ok(contrast(foreground, background) >= 4.5, `${theme} Home about-copy contrast must be at least 4.5:1`);
  }
});
