'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const codex = fs.readFileSync(
  path.join(__dirname, '..', 'table-talk', 'mana-base-codex', 'index.html'),
  'utf8'
);

test('Mana Base Codex distinguishes 32 Commander identities from five faction lenses', () => {
  assert.match(codex, /The Mana Base Codex · 32 Commander Color Identities/);
  assert.match(codex, /32 identities · 5 faction lenses/);
  assert.match(codex, /all 32 color identities/i);
  assert.doesNotMatch(codex, /all 37 Commander color identities/i);
});

test('Mana Base Codex includes the current Hobbit fixing frontier as contextual or value options', () => {
  assert.match(codex, /Verified through:<\/b> The Hobbit \(HOB\/HOC\) · Aug 14 2026/);
  assert.match(codex, /nm:'Hobbit Duals'/);
  assert.match(codex, /nm:'Elven Passage'/);
  assert.match(codex, /nm:'Hobbit Hole'/);
});

test('Mana Base Codex tabs use roving keyboard navigation and a scrollable mobile rail', () => {
  assert.match(codex, /\.tabrail\{overflow-x:auto/);
  assert.match(codex, /e\.key==='ArrowRight'/);
  assert.match(codex, /e\.key==='ArrowLeft'/);
  assert.match(codex, /e\.key==='Home'/);
  assert.match(codex, /e\.key==='End'/);
  assert.match(codex, /activateTab\(tabs\[next\],\{focus:true\}\)/);
});

test('Mana Base Codex picker keeps compact rectangular tiles in an explicit responsive taxonomy grid', () => {
  assert.match(codex, /\.grid\{display:grid; grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(codex, /@container \(max-width:960px\)\{\.grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}\}/);
  assert.match(codex, /@container \(max-width:640px\)\{\.grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\); gap:8px\}\}/);
  assert.match(codex, /\.atlas-sigil\{display:block; width:46px; height:46px/);
  assert.match(codex, /\.idcard \.pips\{display:flex; justify-content:center/);
  assert.match(codex, /#result\{margin-top:6px; scroll-margin-top:72px\}/);
  assert.doesNotMatch(codex, /border-radius:50% 50% var\(--r-lg\) var\(--r-lg\)/);
});
test('Mana Base Codex provides a reduced-motion-safe page-local back-to-top control', () => {
  assert.match(codex, /<button class="backtop" id="backtop" type="button" hidden>↑ Top<\/button>/);
  assert.match(codex, /\.backtop:hover\{transform:translateY\(-1px\); border-color:rgba\(201,162,75,\.52\); background-color:rgba\(201,162,75,\.1\)\}/);
  assert.match(codex, /window\.addEventListener\('scroll',syncBacktop,\{passive:true\}\)/);
  assert.match(codex, /backtop\.hidden=window\.scrollY<=500/);
  assert.match(codex, /behavior:matchMedia\('\(prefers-reduced-motion:reduce\)'\)\.matches\?'auto':'smooth'/);
});
test('Mana Base Codex shows cached Scryfall art previews and uses a centered Planeswalker Mana orbit', () => {
  assert.match(codex, /\.cardname\{cursor:help; border-bottom:1px dotted var\(--line-2\)/);
  assert.match(codex, /hoverTimer=setTimeout\(\(\)=>show\(el\),120\)/);
  assert.match(codex, /const imageCache=new Map\(\)/);
  assert.match(codex, /const SCRYFALL_MIN_INTERVAL_MS=150/);
  assert.match(codex, /let scryfallQueue=Promise\.resolve\(\), nextScryfallRequestAt=0/);
  assert.match(codex, /function queueScryfallLookup\(key\)/);
  assert.match(codex, /scryfallQueue=request\.catch\(\(\)=>\{\}\)/);
  assert.match(codex, /fetch\('https:\/\/api\.scryfall\.com\/cards\/named\?exact='\+encodeURIComponent\(key\)\)/);
  assert.match(codex, /beh:'<span class="mana-run" aria-label="one generic mana, tap"><i class="ms ms-1 ms-cost mana-symbol" aria-hidden="true"><\/i><i class="ms ms-tap ms-cost mana-symbol" aria-hidden="true"><\/i><\/span>: filter into one of each guild color/);
  assert.match(codex, /const MTG_PLANESWALKER='\\ue623'/);
  assert.match(codex, /const MANA_ORBIT=\{W:\{x:100,y:32\},U:\{x:164\.7,y:79\},B:\{x:140,y:155\},R:\{x:60,y:155\},G:\{x:35\.3,y:79\}\}/);
  assert.match(codex, /const MANA_ANGLE=\{W:-90,U:-18,B:54,R:126,G:198\}/);
  assert.match(codex, /function orbitArc\(from,to\)/);
  assert.match(codex, /stroke="var\(--gold\)" stroke-opacity="\.72" stroke-width="3" stroke-linecap="round"/);
  assert.match(codex, /const linked=\[\.\.\.active\]\.sort\(\(a,b\)=>MANA_ORDER\.indexOf\(a\)-MANA_ORDER\.indexOf\(b\)\)/);
  assert.match(codex, /if\(linked\.length===5\) s\+=`<path d="\$\{orbitArc\('G','W'\)\}/);
  assert.match(codex, /Every node center lies on the same 68px orbit as the guide stroke/);
  assert.match(codex, /<text class="sigil-core" x="100" y="102" aria-hidden="true">\$\{MTG_PLANESWALKER\}<\/text>/);
  assert.match(codex, /\.sigil-core\{font-family:"Mana"; font-size:34px; fill:var\(--gold\)/);
  assert.doesNotMatch(codex, /MANA_WEAVE|MANA_RAIL|M24 100H176/);
  assert.match(codex, /<text class="sigil-mana" x="\$\{x\}" y="\$\{y\}" aria-hidden="true">\$\{MANA_GLYPH\[c\]\}<\/text>/);
  assert.doesNotMatch(codex, /const PENT_ORDER|function pentPos|<polygon points=/);
  assert.doesNotMatch(codex, /canTrackHeroSigil|requestAnimationFrame\(updateHeroSigil\)|--sigil-near/);
});

test('Mana Base Codex uses the Mana black palette and a static WUBRG hero orbit', () => {
  assert.match(codex, /--B:#a7999e/);
  assert.match(codex, /--Bg:rgba\(167,153,158,\.16\)/);
  assert.match(codex, /hero-sigil'\)\.innerHTML=sigil\(\['W','U','B','R','G'\],\{nodeGlyphs:true\}\)/);
  assert.match(codex, /\.hero-sigil\{justify-self:center\}/);
});