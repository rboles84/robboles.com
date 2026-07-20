'use strict';
/* assets/data/table-talk-cards.json and assets/data/magic-math-cards.json
   both back the same generic hero card-art feature (assets/js/site.js,
   `.tt-art` + `data-lane="table-talk"`) — table-talk-cards.json for
   /table-talk/, magic-math-cards.json for /magic-math/ (RBB-039 follow-up:
   the Table Talk pool is 100% mana-fixing lands, purpose-built for the Mana
   Base Codex content, so Magic Math needed its own real-card-mix pool
   rather than sharing it). The `set`/`set_name`/`rarity` fields were
   backfilled from Scryfall at authoring time so the Keyrune set-symbol
   glyph (assets/css/keyrune.css) can render without any runtime
   third-party call. These tests catch a half-enriched entry (only some of
   the three fields set) or a rarity value the renderer's allow-list
   doesn't know about, either of which would silently drop the icon — run
   against every pool, not just Table Talk's. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./helpers');

const POOLS = {
  'table-talk-cards.json': JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'table-talk-cards.json'), 'utf8')),
  'magic-math-cards.json': JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'magic-math-cards.json'), 'utf8')),
};

const KNOWN_RARITIES = new Set(['common', 'uncommon', 'rare', 'mythic']);

for (const [poolName, cards] of Object.entries(POOLS)) {
  test(`${poolName} parses as an array with at least one entry`, () => {
    assert.ok(Array.isArray(cards));
    assert.ok(cards.length > 0);
  });

  test(`${poolName}: every card has the required base fields`, () => {
    const required = ['name', 'art', 'artist', 'scryfall'];
    for (const card of cards) {
      for (const field of required) {
        assert.ok(
          typeof card[field] === 'string' && card[field].length > 0,
          `card "${card.name || '?'}" is missing/empty required field "${field}"`
        );
      }
    }
  });

  test(`${poolName}: set/set_name/rarity are all present or all absent (no half-enriched entries)`, () => {
    for (const card of cards) {
      const present = ['set', 'set_name', 'rarity'].filter((f) => f in card);
      assert.ok(
        present.length === 0 || present.length === 3,
        `card "${card.name}" has partial set-symbol data: ${present.join(', ') || '(none)'}`
      );
    }
  });

  test(`${poolName}: every present set code is lowercase alphanumeric (safe to use as a CSS class)`, () => {
    for (const card of cards) {
      if (!card.set) continue;
      assert.match(card.set, /^[a-z0-9-]+$/, `card "${card.name}" has an unsafe/non-normalized set code "${card.set}"`);
    }
  });

  test(`${poolName}: every present rarity is one of the four known values`, () => {
    for (const card of cards) {
      if (!card.rarity) continue;
      assert.ok(
        KNOWN_RARITIES.has(card.rarity),
        `card "${card.name}" has rarity "${card.rarity}", not one of: ${[...KNOWN_RARITIES].join(', ')}`
      );
    }
  });

  test(`${poolName}: every art path resolves to a real local file`, () => {
    for (const card of cards) {
      const full = path.join(ROOT, card.art);
      assert.ok(fs.existsSync(full), `card "${card.name}"'s art path "${card.art}" does not resolve to a real file`);
    }
  });
}

test('magic-math-cards.json is not just a re-skinned copy of the lands-only table-talk pool', () => {
  const magicMathTypes = new Set(POOLS['magic-math-cards.json'].map((c) => (c.type_line || '').split('—')[0].trim()));
  const nonLandTypes = [...magicMathTypes].filter((t) => t && !/\bLand\b/.test(t));
  assert.ok(nonLandTypes.length >= 3, `expected at least 3 distinct non-land card types in the Magic Math pool, found: ${[...magicMathTypes].join(', ')}`);
});
