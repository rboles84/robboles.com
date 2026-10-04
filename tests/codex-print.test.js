'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./helpers');
const html = fs.readFileSync(path.join(ROOT, 'table-talk/mana-base-codex/index.html'), 'utf8');
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\/\*[\s\S]*?\*\//g, '');

// Bounded source contract, not a browser replacement: resolve this page's exact
// print consumers through media/layer/importance and custom-property inheritance.
// Native PDF QA independently covers the full selector cascade and pagination.
const rules = [];
function walk(source, context = { layer: '', print: false }) {
  let cursor = 0;
  while (cursor < source.length) {
    const open = source.indexOf('{', cursor);
    if (open < 0) break;
    const directive = source.indexOf(';', cursor);
    if (directive >= 0 && directive < open) { cursor = directive + 1; continue; }
    const head = source.slice(cursor, open).trim();
    let depth = 1, close = open + 1;
    while (depth && close < source.length) {
      if (source[close] === '{') depth++;
      if (source[close] === '}') depth--;
      close++;
    }
    const body = source.slice(open + 1, close - 1);
    if (head.startsWith('@')) {
      const next = { ...context };
      if (head.startsWith('@layer ')) next.layer = head.slice(7).trim();
      if (head.startsWith('@media ')) {
        if (/\bprint\b/.test(head)) next.print = true;
        else { cursor = close; continue; } // unrelated responsive/motion source
      }
      walk(body, next);
    } else {
      const declarations = new Map();
      for (const item of body.split(';')) {
        const colon = item.indexOf(':');
        if (colon < 0) continue;
        const value = item.slice(colon + 1).trim();
        declarations.set(item.slice(0, colon).trim(), {
          value: value.replace(/\s*!important\s*$/, '').trim(), important: /!important/.test(value),
        });
      }
      rules.push({ ...context, selectors: head.split(',').map(s => s.trim()), declarations });
    }
    cursor = close;
  }
}
walk(css);
const layers = css.match(/@layer\s+([^;{]+);/)[1].split(',').map(s => s.trim());
function effective(selector, property, print = true, inline) {
  const candidates = rules.filter(r => (print || !r.print) && r.selectors.includes(selector) && r.declarations.has(property));
  const rank = r => {
    const d = r.declarations.get(property), layer = layers.indexOf(r.layer);
    return d.important ? 1000 + (r.layer ? layers.length - layer : 0) : (r.layer ? layer : layers.length);
  };
  candidates.sort((a, b) => rank(a) - rank(b) || rules.indexOf(a) - rules.indexOf(b));
  const winner = candidates.at(-1)?.declarations.get(property);
  return inline && !winner?.important ? inline : winner?.value;
}
function resolve(value, print = true) {
  assert.ok(value, 'consumer property exists');
  for (let i = 0; /var\(/.test(value) && i < 20; i++) {
    value = value.replace(/var\((--[\w-]+)\)/g, (_, name) => effective(':root', name, print));
  }
  assert.ok(!/var\(|undefined/.test(value), 'tokens resolve');
  return value;
}
function luminance(value) {
  let hex = value.replace('#', '');
  if (hex.length === 3) hex = [...hex].map(c => c + c).join('');
  assert.match(hex, /^[0-9a-f]{6}$/i, `solid color expected: ${value}`);
  const channels = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return channels.reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
}
function contrast(fg, bg) {
  const a = luminance(resolve(fg)), b = luminance(resolve(bg));
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
const readable = (name, fg, bg) => assert.ok(contrast(fg, bg) >= 4.5, `${name}: ${contrast(fg, bg)}:1`);

test('Codex print: text roles remain readable on paper and every light panel with graphics off or on', () => {
  const surfaces = ['--ink', '--ink-2', '--ink-3', '--ink-4'];
  const text = ['--bone', '--bone-dim', '--bone-tertiary', '--gold', '--warning-text'];
  for (const surface of surfaces) {
    assert.ok(luminance(resolve(`var(${surface})`)) >= .75, `${surface} is a paper surface`);
    for (const role of text) readable(`${role} / ${surface}`, `var(${role})`, `var(${surface})`);
  }
  for (const role of text) readable(`${role} without graphics`, `var(${role})`, '#fff');
  for (const selector of ['.lcol.up h3', '.lcol.tp h3']) {
    readable(selector, effective(selector, 'color'), 'var(--ink-2)');
    readable(`${selector} without graphics`, effective(selector, 'color'), '#fff');
  }
  assert.equal(effective(':root', 'color-scheme'), 'light', 'UA paper canvas is light');
  assert.ok(luminance(resolve('var(--bone)')) < luminance(resolve('var(--bone-dim)')));
  assert.ok(luminance(resolve('var(--bone-dim)')) < luminance(resolve('var(--bone-tertiary)')));
});

test('Codex print: hardcoded surfaces and selected controls retain compatible foregrounds without blanket resets', () => {
  for (const selector of ['.idcard', '.lcard', '#pane-catalog .mem',
    '#pane-catalog .mem .mana-run', '#pane-catalog .cyc-toggle .twisty']) {
    const bg = effective(selector, 'background');
    assert.ok(luminance(resolve(bg)) >= .75, `${selector} has a light effective print surface`);
    readable(selector, 'var(--bone)', bg);
  }
  const selected = '.switch button[aria-pressed="true"]';
  readable(selected, effective(selected, 'color'), effective(selected, 'background'));
  readable(`${selected} without graphics`, effective(selected, 'color'), '#fff');
  for (const tier of ['S', 'A', 'B', 'C']) {
    const selector = `.tier.${tier}`;
    readable(selector, effective(selector, 'color'), effective(selector, 'background'));
    readable(`${selector} without graphics`, effective(selector, 'color'), '#fff');
  }
  assert.ok(!rules.some(r => r.print && r.selectors.includes('*') &&
    ['color', 'background', 'background-color'].some(p => r.declarations.has(p))), 'no destructive universal palette reset');
});

test('Codex print: panes, hidden chrome, collapse/Flavor state and screen isolation remain independent', () => {
  assert.equal(effective('section.pane', 'display'), 'block');
  for (const selector of ['.aether', '.vignette', '.viewbar', '.explorer', '.flavor-toggle', '.lab', '#cardpop']) {
    assert.equal(effective(selector, 'display'), 'none', `${selector} excluded from paper`);
  }
  assert.equal(effective('#cardpop', 'display', true, 'block'), 'none', 'open popup inline display cannot obscure paper');
  for (const selector of ['.lcard', '.stat', '.cyc-block']) assert.equal(effective(selector, 'break-inside'), 'avoid');
  assert.ok(!rules.some(r => r.print && r.selectors.some(s => /collapsed|cyc-body|\.lore|cyc-lore|flavor-line/.test(s))),
    'print does not materialize collapsed or Flavor-hidden content');
  assert.ok(luminance(resolve('var(--ink)', false)) < .02, 'screen ground remains dark');
  assert.ok(luminance(resolve('var(--bone)', false)) > .7, 'screen primary remains pale');
  assert.equal(effective('section.pane', 'display', false), 'none', 'inactive screen panes remain hidden');
  assert.notEqual(effective('#cardpop.on', 'pointer-events', false), 'none', 'open screen popup stays interactive');
  assert.equal(effective('#cardpop', 'display', false), 'none', 'closed screen popup remains hidden');
});
