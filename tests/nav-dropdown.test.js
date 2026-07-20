'use strict';
/* Component-level contract for the generalized nav dropdown (RBB-039,
   generalizing RBB-037's single Field Guide dropdown into
   initNavDropdowns() over every [data-nav-dropdown] instance). Replaces a
   page-level "exactly one caret/panel" assumption — that's no longer true,
   since shared-nav pages now legitimately carry two instances (Field
   Guide -> Field Kit, Table Talk -> Magic Math). Instead this asserts the
   contract holds per instance, and that instances don't collide with each
   other on a given page.

   Mutually-exclusive open state (opening one instance closes any other
   open instance) is runtime JS behavior, not something a DOM-free static
   check can observe — it's covered by the manual browser verification
   pass instead, matching this suite's existing dependency-free/DOM-free
   design (see helpers.js). */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, listHtmlFiles } = require('./helpers');

// Pages intentionally excluded from the shared nav churn (self-contained by
// design, verified separately by dependency-free.test.js).
const SELF_CONTAINED = new Set([
  path.join(ROOT, 'table-talk', 'mana-base-codex', 'index.html'),
]);

/* Extracts every [data-nav-dropdown] instance's outer <div>...</div> block
   from a chunk of HTML, using a simple div-only tag-depth stack (safe here
   since no other element in this markup, svg/button/a included, affects
   div nesting). Returns [{ block, start }]. */
function extractDropdownBlocks(html) {
  const blocks = [];
  const markerRe = /data-nav-dropdown\b/g;
  let m;
  while ((m = markerRe.exec(html))) {
    const openStart = html.lastIndexOf('<div', m.index);
    if (openStart === -1) continue;
    const openTagEnd = html.indexOf('>', openStart);
    const divTagRe = /<div\b[^>]*>|<\/div>/g;
    divTagRe.lastIndex = openTagEnd + 1;
    let depth = 1;
    let closeEnd = -1;
    let t;
    while ((t = divTagRe.exec(html))) {
      if (t[0] === '</div>') {
        depth--;
        if (depth === 0) { closeEnd = t.index + t[0].length; break; }
      } else {
        depth++;
      }
    }
    if (closeEnd === -1) continue;
    blocks.push({ block: html.slice(openStart, closeEnd), start: openStart });
  }
  return blocks;
}

function countOccurrences(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

test('every [data-nav-dropdown] instance has exactly one trigger and one controlled panel, with a matching aria-controls/id pair', () => {
  const offenders = [];
  for (const file of listHtmlFiles()) {
    if (SELF_CONTAINED.has(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const navMatch = text.match(/<nav class="site-nav"[^>]*data-site-nav>[\s\S]*?<\/nav>/);
    if (!navMatch) continue;
    const blocks = extractDropdownBlocks(navMatch[0]);
    for (const { block } of blocks) {
      const rel = path.relative(ROOT, file);
      const name = (block.match(/data-dropdown-name="([^"]*)"/) || [])[1] || '(unnamed)';
      const caretCount = countOccurrences(block, /<button class="nav-caret"/g);
      const panelCount = countOccurrences(block, /<div class="nav-dropdown" id="/g);
      if (caretCount !== 1) offenders.push(`${rel} [${name}]: expected exactly 1 trigger, found ${caretCount}`);
      if (panelCount !== 1) offenders.push(`${rel} [${name}]: expected exactly 1 controlled panel, found ${panelCount}`);
      const panelId = (block.match(/<div class="nav-dropdown" id="([^"]*)"/) || [])[1];
      const ariaControls = (block.match(/aria-controls="([^"]*)"/) || [])[1];
      if (!panelId || !ariaControls || panelId !== ariaControls) {
        offenders.push(`${rel} [${name}]: caret aria-controls ("${ariaControls}") does not match its own panel id ("${panelId}")`);
      }
    }
  }
  assert.equal(offenders.length, 0, `nav-dropdown trigger/panel contract violation(s):\n${offenders.join('\n')}`);
});

test('nav-dropdown panel IDs are unique within a page (no cross-wiring between instances)', () => {
  const offenders = [];
  for (const file of listHtmlFiles()) {
    if (SELF_CONTAINED.has(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const navMatch = text.match(/<nav class="site-nav"[^>]*data-site-nav>[\s\S]*?<\/nav>/);
    if (!navMatch) continue;
    const ids = [...navMatch[0].matchAll(/<div class="nav-dropdown" id="([^"]*)"/g)].map((m) => m[1]);
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      offenders.push(`${path.relative(ROOT, file)}: duplicate nav-dropdown panel id(s) among [${ids.join(', ')}]`);
    }
  }
  assert.equal(offenders.length, 0, `duplicate panel IDs:\n${offenders.join('\n')}`);
});

test('shared-nav pages carry exactly the Field Guide and Table Talk dropdown instances (none missing, none duplicated)', () => {
  const offenders = [];
  for (const file of listHtmlFiles()) {
    if (SELF_CONTAINED.has(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const navMatch = text.match(/<nav class="site-nav"[^>]*data-site-nav>[\s\S]*?<\/nav>/);
    if (!navMatch) continue;
    const names = [...navMatch[0].matchAll(/data-dropdown-name="([^"]*)"/g)].map((m) => m[1]);
    if (names.length === 0) continue; // page predates the shared nav, or genuinely has none
    const rel = path.relative(ROOT, file);
    const expected = ['Field Guide', 'Table Talk'];
    const sortedNames = [...names].sort();
    const sortedExpected = [...expected].sort();
    if (JSON.stringify(sortedNames) !== JSON.stringify(sortedExpected)) {
      offenders.push(`${rel}: expected dropdown instances [${sortedExpected.join(', ')}], found [${sortedNames.join(', ')}]`);
    }
  }
  assert.equal(offenders.length, 0, `nav-dropdown instance-set mismatch(es):\n${offenders.join('\n')}`);
});

test('no ARIA menu semantics inside the shared nav (disclosure widget, not a menu)', () => {
  const offenders = [];
  for (const file of listHtmlFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    const navMatch = text.match(/<nav class="site-nav"[^>]*data-site-nav>[\s\S]*?<\/nav>/);
    if (!navMatch) continue;
    if (/role="menu"|role="menuitem"|aria-haspopup/.test(navMatch[0])) {
      offenders.push(path.relative(ROOT, file));
    }
  }
  assert.equal(offenders.length, 0, `role="menu"/menuitem/aria-haspopup found in .site-nav:\n${offenders.join('\n')}`);
});
