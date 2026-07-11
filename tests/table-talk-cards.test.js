'use strict';
/* assets/data/table-talk-cards.json backs the Table Talk hero's random
   card-art feature (assets/js/site.js). The `set`/`set_name`/`rarity` fields
   were backfilled from Scryfall at authoring time so the Keyrune set-symbol
   glyph (assets/css/keyrune.css) can render without any runtime third-party
   call. These tests catch a half-enriched entry (only some of the three
   fields set) or a rarity value the renderer's allow-list doesn't know
   about, either of which would silently drop the icon. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./helpers');

const CARDS_JSON = path.join(ROOT, 'assets', 'data', 'table-talk-cards.json');
const cards = JSON.parse(fs.readFileSync(CARDS_JSON, 'utf8'));

const KNOWN_RARITIES = new Set(['common', 'uncommon', 'rare', 'mythic']);

test('table-talk-cards.json parses as an array with at least one entry', () => {
  assert.ok(Array.isArray(cards));
  assert.ok(cards.length > 0);
});

test('every card has the required base fields', () => {
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

test('set/set_name/rarity are all present or all absent (no half-enriched entries)', () => {
  for (const card of cards) {
    const present = ['set', 'set_name', 'rarity'].filter((f) => f in card);
    assert.ok(
      present.length === 0 || present.length === 3,
      `card "${card.name}" has partial set-symbol data: ${present.join(', ') || '(none)'}`
    );
  }
});

test('every present set code is lowercase alphanumeric (safe to use as a CSS class)', () => {
  for (const card of cards) {
    if (!card.set) continue;
    assert.match(card.set, /^[a-z0-9-]+$/, `card "${card.name}" has an unsafe/non-normalized set code "${card.set}"`);
  }
});

test('every present rarity is one of the four known values', () => {
  for (const card of cards) {
    if (!card.rarity) continue;
    assert.ok(
      KNOWN_RARITIES.has(card.rarity),
      `card "${card.name}" has rarity "${card.rarity}", not one of: ${[...KNOWN_RARITIES].join(', ')}`
    );
  }
});
