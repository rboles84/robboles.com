'use strict';
/* RBB-041 build-time enrichment for magic-math/finish-him/.
 *
 * Rerunnable. Fetches Scryfall card facts (exact-name lookup) for every card
 * named in the 10 approved representative combo records, caches image URIs +
 * ids + layout/mana/type to a static JSON, and downloads nothing at runtime.
 * The page embeds this cache inline (no runtime fetch, no runtime API call);
 * card thumbnails load from the Scryfall image CDN at view time using the
 * cached URLs.
 *
 * Usage:  node scripts/build-finish-him-cards.js
 * Output: assets/data/magic-math/finish-him-cards.json
 *
 * Politeness: sequential requests, >=120ms apart (well under Scryfall's 10 req/s
 * guidance). Exact-name endpoint; falls back to first card face for
 * double-faced / split layouts that lack top-level image_uris.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'data', 'magic-math');
const OUT_FILE = path.join(OUT_DIR, 'finish-him-cards.json');

// Card names exactly as they appear in the approved representative records'
// display_title fields (split on " + "). Kept explicit so the build never
// depends on parsing at runtime.
const RECORD_CARDS = {
  '690-3966': ["Sanguine Bond", "Exquisite Blood"],
  '742-1295': ["Demonic Consultation", "Thassa's Oracle"],
  '1218-6714': ["Super State", "Tainted Strike"],
  '2836-3093': ["Tainted Pact", "Laboratory Maniac"],
  '1879-3259-7358': ["Breath of Fury", "Rising of the Day", "Maestros Diabolist"],
  '1203-4567': ["Greven, Predator Captain", "Fire Covenant"],
  '6758-6804': ["Requiem Monolith", "Dawnsire, Sunstar Dreadnought"],
  '1561-5165': ["Ob Nixilis, the Hate-Twisted", "Peer into the Abyss"],
  '2199-4800': ["Frenetic Efreet", "Chance Encounter"],
  '3038-3858': ["Mayael's Aria", "Colossification"],
};

const uniqueNames = [...new Set(Object.values(RECORD_CARDS).flat())];

function pickImages(data) {
  // Normal-layout cards carry top-level image_uris. DFC/split/etc. put images
  // on card_faces instead — fall back to the first face for the thumbnail,
  // and record which fallback was used.
  if (data.image_uris) {
    return { images: data.image_uris, faceUsed: null };
  }
  if (Array.isArray(data.card_faces) && data.card_faces[0] && data.card_faces[0].image_uris) {
    return { images: data.card_faces[0].image_uris, faceUsed: data.card_faces[0].name || 'face 0' };
  }
  return { images: null, faceUsed: null };
}

async function fetchCard(name) {
  const url = 'https://api.scryfall.com/cards/named?exact=' + encodeURIComponent(name);
  // Retry on 429 (rate limit) with exponential backoff so a transient burst
  // limit never turns into a permanent failure / wiped cache.
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'robboles-blog-authoring/1.0', Accept: 'application/json' } });
    if (res.ok) return { ok: true, data: await res.json() };
    if (res.status === 429) {
      const wait = 2000 * Math.pow(2, attempt);
      console.error('  429 on ' + name + ' — backing off ' + wait + 'ms (attempt ' + (attempt + 1) + ')');
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    return { ok: false, status: res.status };
  }
  return { ok: false, status: '429 after retries' };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Merge into any existing good cache so a partial run never wipes prior data.
  let cards = {};
  if (fs.existsSync(OUT_FILE)) {
    try { cards = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')).cards || {}; } catch { cards = {}; }
  }
  const failures = [];
  const fallbacks = [];

  for (const name of uniqueNames) {
    if (cards[name] && cards[name].image_normal) { console.log('cached: ' + name); continue; }
    const r = await fetchCard(name);
    if (!r.ok) { failures.push({ name, status: r.status }); console.error('FAIL', name, r.status); await new Promise((res) => setTimeout(res, 250)); continue; }
    const d = r.data;
    const { images, faceUsed } = pickImages(d);
    if (faceUsed) fallbacks.push({ name, faceUsed });
    if (!images) { failures.push({ name, status: 'no image_uris on card or faces' }); }
    cards[d.name] = {
      name: d.name,
      scryfall_id: d.id,
      oracle_id: d.oracle_id,
      scryfall_uri: d.scryfall_uri ? d.scryfall_uri.split('?')[0] : null,
      layout: d.layout,
      mana_cost: d.mana_cost || (d.card_faces && d.card_faces[0] ? d.card_faces[0].mana_cost : '') || '',
      type_line: d.type_line || (d.card_faces && d.card_faces[0] ? d.card_faces[0].type_line : '') || '',
      image_small: images ? images.small : null,
      image_normal: images ? images.normal : null,
      image_art_crop: images ? images.art_crop : null,
      face_used: faceUsed,
    };
    console.log('OK: ' + d.name + '  [' + cards[d.name].type_line + ']  layout=' + d.layout + (faceUsed ? '  (face: ' + faceUsed + ')' : ''));
    await new Promise((r) => setTimeout(r, 300));
  }

  const output = {
    _meta: {
      source: 'Scryfall API (api.scryfall.com/cards/named?exact=...)',
      retrieved: new Date().toISOString().slice(0, 10),
      unique_cards: uniqueNames.length,
      matched: Object.keys(cards).length,
      failures,
      dfc_split_fallbacks: fallbacks,
      note: 'Runtime uses image_small/image_normal from the Scryfall image CDN; no runtime API calls. Rerun this script and re-embed into magic-math/finish-him/index.html to refresh.',
    },
    record_cards: RECORD_CARDS,
    cards,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log('\nwrote ' + path.relative(ROOT, OUT_FILE));
  console.log('unique=' + uniqueNames.length + ' matched=' + Object.keys(cards).length + ' failures=' + failures.length + ' fallbacks=' + fallbacks.length);
}

main().catch((e) => { console.error(e); process.exit(1); });
