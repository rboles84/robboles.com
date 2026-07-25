'use strict';
/* Responsive-layout regression guards (dependency-free, string/structure only —
   no browser or CSS engine). Protects the MT-31 fix: the two-column "featured"
   block (.project-feature--split, used on learning-lab / magic-math / table-talk)
   must stay collapsible on mobile.

   The bug it guards against: the same block was previously an INLINE
   `style="display:grid;grid-template-columns:1fr 0.8fr;…"`, which a media query
   cannot override, so the right-hand .note-card overflowed on narrow phones. The
   fix moved the layout into a class with a <=900px collapse. These tests fail if
   anyone reintroduces a non-responsive inline grid, or drops the mobile collapse. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, listHtmlFiles } = require('./helpers');

const STYLES = path.join(ROOT, 'assets', 'css', 'styles.css');

test('MT-31: no .project-feature element carries an inline grid-template-columns (must use the responsive class)', () => {
  const offenders = [];
  for (const file of listHtmlFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    // Any element opening tag that has BOTH class="…project-feature…" and an
    // inline style declaring grid-template-columns is the non-responsive bug.
    const re = /<[^>]*class="[^"]*\bproject-feature\b[^"]*"[^>]*style="[^"]*grid-template-columns[^"]*"[^>]*>/g;
    if (re.test(html)) offenders.push(path.relative(ROOT, file));
    // also catch attribute order style-before-class
    const re2 = /<[^>]*style="[^"]*grid-template-columns[^"]*"[^>]*class="[^"]*\bproject-feature\b[^"]*"[^>]*>/g;
    if (re2.test(html)) offenders.push(path.relative(ROOT, file));
  }
  assert.deepEqual(
    [...new Set(offenders)], [],
    `these pages reintroduced a non-responsive inline grid on .project-feature: ${offenders.join(', ')}`
  );
});

test('MT-31: the .project-feature--split layout is defined and collapses to one column at <=900px', () => {
  const css = fs.readFileSync(STYLES, 'utf8');
  // The desktop two-column definition exists.
  assert.match(css, /\.project-feature--split\s*\{[^}]*grid-template-columns:\s*1fr\s+0\.8fr/,
    'expected a two-column .project-feature--split definition');
  // The single-column collapse exists, and sits after the 900px breakpoint opens
  // (i.e., inside the mobile media block, not in the desktop base rules).
  const mediaIdx = css.indexOf('@media (max-width: 900px)');
  assert.ok(mediaIdx !== -1, 'expected a @media (max-width: 900px) breakpoint');
  const collapseIdx = css.search(/\.project-feature--split\s*\{\s*grid-template-columns:\s*1fr\s*;\s*\}/);
  assert.ok(collapseIdx > mediaIdx,
    'expected .project-feature--split to collapse to grid-template-columns: 1fr inside the <=900px breakpoint');
});

test('MT-31: the three featured pages use the responsive .project-feature--split class', () => {
  for (const rel of ['learning-lab/index.html', 'magic-math/index.html', 'table-talk/index.html']) {
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.match(html, /class="project-feature project-feature--split"/, `${rel} should use the responsive split class`);
  }
});
