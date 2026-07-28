'use strict';
/* RBB-059 build-time assembly + reconciliation for magic-math/tutor-free-structure/.
 *
 * "Tutor-Free Does Not Mean Structure-Free" — the second Magic Math story.
 * Reads the staged, publication-safe research subset under
 * docs/research/tutor-free-structure/, HARD-FAILS if any approved number drifts
 * or any held figure leaks, derives the per-example structural-signal profiles
 * (H/F/S/C) the flagship explorer drills into, and injects one embedded JSON
 * data island into the page. No runtime fetch: the page initializes entirely
 * from the generated HTML.
 *
 * Usage:
 *   node scripts/build-tutor-free-structure.js            inject the data island (write)
 *   node scripts/build-tutor-free-structure.js --check    verify island is current, read-only, exit 4 if stale
 *   node scripts/build-tutor-free-structure.js --report    print reconciliation + cohort-coverage report, never writes
 *
 * Runs manually (like build-finish-him-cards.js), not part of CI. Unlike that
 * script it makes NO network call: card facts are already resolved in the staged
 * card-profiles.json against a local Scryfall snapshot; images stay hotlinked to
 * the Scryfall CDN at view time.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const RESEARCH = path.join(ROOT, 'docs', 'research', 'tutor-free-structure');
const DATA = path.join(RESEARCH, 'data');
const PAGE = path.join(ROOT, 'magic-math', 'tutor-free-structure', 'index.html');
const MARKER = 'tfs-data';

// ---- fail-hard plumbing ----------------------------------------------------
let FAILURES = [];
function check(cond, msg) { if (!cond) FAILURES.push(msg); }
function eq(actual, expected, label) {
  if (actual !== expected) FAILURES.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function near(actual, expected, tol, label) {
  if (Math.abs(actual - expected) > tol) FAILURES.push(`${label}: expected ~${expected} (±${tol}), got ${actual}`);
}
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const pct1 = (count, denom) => Math.round((count / denom) * 1000) / 10;

// ---- canonical approved public values (independent cross-check) ------------
// Hardcoded from the package's "Approved public values". Staged data must match
// THESE and reconcile internally, so drift in either source is caught.
const APPROVED = {
  analyzed_variants: 100196,
  tutor_free_candidates: 86448,
  top_gravity_tutor_free: 57597,
  top_gravity_share_percent: 66.6,
  family_100_tutor_free: 29944,
  family_100_share_percent: 34.6,
  strict_one_slot_all_variants: 1888,
  strict_one_slot_tutor_free: 1560,
  top_100_component_appearance_share_percent: 30.9,
  one_variant_cards: 1367,
  total_exact_cards: 7281,
  h_intersect_f_inclusive: 24944, // prose "24,944 have both H and F" (inclusive of S/C overlap)
  commander_required_tutor_free: 858,
  // exclusive signal-count buckets among the 86,448
  by_count: { 0: 22784, 1: 37474, 2: 26085, 3: 105, 4: 0 },
};

// The four HELD figures — recognizable labels/claims that must never reach the
// published page. NOT a blind numeric substring scan (per the plan): each entry
// is a distinctive label or a number-in-context pattern, run only over the
// page's human-readable text + payload text fields (never image URLs / ids).
const HELD_PATTERNS = [
  { name: '75,991 overall family-covered', re: /75[,\s]?991/ },
  { name: 'overall family-covered label', re: /overall family-covered/i },
  { name: '955 overall commander-required', re: /\b955\b[^.\n]{0,40}commander|commander[^.\n]{0,40}\b955\b/i },
  { name: 'overall commander-required label', re: /commander-required[^.\n]{0,30}overall|overall[^.\n]{0,30}commander-required/i },
  { name: "Dargo / Shipwrecker footprint", re: /Dargo|Shipwrecker/i },
  { name: 'three self-assembling split', re: /three self-assembling|3 self-assembling/i },
  { name: 'six tutor-required split', re: /six tutor-required|6 tutor-required/i },
];

// ---- per-example structural properties -------------------------------------
// Examples carry F/S/C only, each read from an explicit authoritative field
// (family.family_size, strict_one_slot, commander_requirement).
//
// H (top-1%-gravity component) is deliberately NOT a per-example property here.
// It has no authoritative per-example field anywhere in the package \u2014
// card-profiles.json redacts per-card gravity and combo-examples.json carries no
// H flag \u2014 and it is never inferred from role text, component-gravity bounds, or
// article prose. Rather than carry a permanently-unavailable field and render an
// "H unavailable" badge (which also read as a direct contradiction of the
// approved prose, C-1 in the MTG Expert Review), H is simply not part of the
// example model: it is omitted from the payload entirely, so it cannot be
// displayed or derived downstream.
//
// H remains fully present as a POPULATION-level signal \u2014 the tri-state explorer
// control, the 16-cohort matrix (CHART 5), the signals table (CHART 2), the
// population strip, and the methodology all use it unchanged.
const EXAMPLE_SIGNALS = ['F', 'S', 'C'];

// ---- build the embedded payload from staged data ---------------------------
function build() {
  FAILURES = [];
  const summary = readJson(path.join(DATA, 'summary.json'));
  const signals = readJson(path.join(DATA, 'structural-signals.json'));
  const cohorts = readJson(path.join(DATA, 'structural-cohorts.json'));
  const tutorClasses = readJson(path.join(DATA, 'tutor-class-overview.json'));
  const familyCurve = readJson(path.join(DATA, 'family-threshold-curve.json'));
  const familyVsStrict = readJson(path.join(DATA, 'family-vs-strict.json'));
  const gravityDist = readJson(path.join(DATA, 'gravity-distribution.json'));
  const gravityBands = readJson(path.join(DATA, 'gravity-bands.json'));
  const twoCard = readJson(path.join(DATA, 'two-card-ladder.json'));
  const comboExamples = readJson(path.join(DATA, 'combo-examples.json'));
  const cardProfiles = readJson(path.join(DATA, 'card-profiles.json'));
  const av = summary.approved_public_values;

  // --- (1) staged summary vs canonical approved values ---
  eq(av.analyzed_variants, APPROVED.analyzed_variants, 'summary.analyzed_variants');
  eq(av.tutor_free_candidates, APPROVED.tutor_free_candidates, 'summary.tutor_free_candidates');
  eq(av.top_gravity_tutor_free, APPROVED.top_gravity_tutor_free, 'summary.top_gravity_tutor_free');
  eq(av.top_gravity_tutor_free_share_percent, APPROVED.top_gravity_share_percent, 'summary.top_gravity_share_percent');
  eq(av.family_100_tutor_free, APPROVED.family_100_tutor_free, 'summary.family_100_tutor_free');
  eq(av.family_100_tutor_free_share_percent, APPROVED.family_100_share_percent, 'summary.family_100_share_percent');
  eq(av.strict_one_slot_all_variants, APPROVED.strict_one_slot_all_variants, 'summary.strict_one_slot_all_variants');
  eq(av.strict_one_slot_tutor_free, APPROVED.strict_one_slot_tutor_free, 'summary.strict_one_slot_tutor_free');
  eq(av.top_100_component_appearance_share_percent, APPROVED.top_100_component_appearance_share_percent, 'summary.top_100_share');
  eq(av.one_variant_cards, APPROVED.one_variant_cards, 'summary.one_variant_cards');

  // --- (2) tutor-class overview: sums to full population, tutor-free matches ---
  const tcSum = tutorClasses.classes.reduce((a, c) => a + c.count, 0);
  eq(tcSum, APPROVED.analyzed_variants, 'tutor-class sum');
  const tfClass = tutorClasses.classes.find((c) => /tutor-free/i.test(c.class));
  eq(tfClass.count, APPROVED.tutor_free_candidates, 'tutor-class tutor-free count');
  check(tutorClasses.classes.some((c) => /needs review/i.test(c.class)), 'needs-review class must stay separate from tutor-free');
  for (const c of tutorClasses.classes) near(c.share_percent, pct1(c.count, tcSum), 0.06, `tutor-class share ${c.class}`);

  // --- (3) cohorts: exclusive, sum to 86,448, rebuild inclusive signal totals ---
  eq(cohorts.denominator, APPROVED.tutor_free_candidates, 'cohorts.denominator');
  const cohortSum = cohorts.cohorts.reduce((a, c) => a + c.count, 0);
  eq(cohortSum, APPROVED.tutor_free_candidates, '16-cohort exclusive sum');
  const has = (c, s) => c.active_signals.includes(s);
  const incl = (s) => cohorts.cohorts.filter((c) => has(c, s)).reduce((a, c) => a + c.count, 0);
  const hIncl = incl('H'), fIncl = incl('F'), sIncl = incl('S'), cIncl = incl('C');
  eq(hIncl, APPROVED.top_gravity_tutor_free, 'inclusive H rebuilt from cohorts');
  eq(fIncl, APPROVED.family_100_tutor_free, 'inclusive F rebuilt from cohorts');
  eq(sIncl, APPROVED.strict_one_slot_tutor_free, 'inclusive S rebuilt from cohorts');
  eq(cIncl, APPROVED.commander_required_tutor_free, 'inclusive C rebuilt from cohorts');
  const hfIncl = cohorts.cohorts.filter((c) => has(c, 'H') && has(c, 'F')).reduce((a, c) => a + c.count, 0);
  eq(hfIncl, APPROVED.h_intersect_f_inclusive, 'inclusive H\u2229F (prose 24,944)');
  const hfExclusive = cohorts.cohorts.find((c) => c.signal_code === 'HF');
  eq(hfExclusive.count, 24867, 'exclusive HF row (must NOT be labeled "the" H-and-F number)');
  // signal-count buckets
  const byCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const c of cohorts.cohorts) byCount[c.active_signals.length] += c.count;
  for (const k of Object.keys(APPROVED.by_count)) eq(byCount[k], APPROVED.by_count[k], `signal-count bucket ${k}`);
  for (const c of cohorts.cohorts) near(c.share_percent, pct1(c.count, cohortSum), 0.06, `cohort share ${c.signal_code}`);

  // --- (4) signals file agrees with cohort-derived inclusive totals ---
  const sigBy = Object.fromEntries(signals.signals.map((s) => [s.signal_code, s]));
  eq(sigBy.H.count, hIncl, 'signals H vs cohorts');
  eq(sigBy.F.count, fIncl, 'signals F vs cohorts');
  eq(sigBy.S.count, sIncl, 'signals S vs cohorts');
  eq(sigBy.C.count, cIncl, 'signals C vs cohorts');
  for (const s of signals.signals) near(s.share_percent, pct1(s.count, signals.denominator), 0.06, `signal share ${s.signal_code}`);

  // --- (5) gravity ---
  eq(gravityDist.top_100_component_appearance_share_percent, APPROVED.top_100_component_appearance_share_percent, 'gravity top-100 share');
  eq(gravityDist.one_variant_cards, APPROVED.one_variant_cards, 'gravity one-variant cards');
  eq(gravityDist.total_exact_cards, APPROVED.total_exact_cards, 'gravity total exact cards');
  const topBand = gravityBands.bands.find((b) => /top_1_percent/.test(b.band));
  eq(topBand.count, APPROVED.top_gravity_tutor_free, 'gravity band top-1% count');
  near(topBand.share_percent, APPROVED.top_gravity_share_percent, 0.06, 'gravity band top-1% share');
  const tailBand = gravityBands.bands.find((b) => /one_variant/.test(b.band));
  eq(tailBand.count, APPROVED.one_variant_cards, 'gravity band one-variant count');
  near(tailBand.share_percent, pct1(APPROVED.one_variant_cards, APPROVED.total_exact_cards), 0.06, 'gravity band one-variant share (18.8%)');

  // --- (6) family curve + family-vs-strict cross-file agreement ---
  eq(familyCurve.denominator, APPROVED.tutor_free_candidates, 'family-curve denominator');
  const f100 = familyCurve.thresholds.find((t) => t.minimum_family_size === 100);
  eq(f100.count, APPROVED.family_100_tutor_free, 'family-curve >=100 count');
  const f2 = familyCurve.thresholds.find((t) => t.minimum_family_size === 2);
  for (const t of familyCurve.thresholds) near(t.share_percent, pct1(t.count, familyCurve.denominator), 0.06, `family-curve share >=${t.minimum_family_size}`);
  const fvsAny = familyVsStrict.rows.find((r) => /Any candidate-family/i.test(r.label));
  const fvs100 = familyVsStrict.rows.find((r) => /at least 100/i.test(r.label));
  const fvsStrictAll = familyVsStrict.rows.find((r) => /all variants/i.test(r.label));
  const fvsStrictTf = familyVsStrict.rows.find((r) => /Strict one-slot.*tutor-free/i.test(r.label));
  eq(fvsAny.count, f2.count, 'family-vs-strict any-family == curve >=2');
  eq(fvs100.count, APPROVED.family_100_tutor_free, 'family-vs-strict >=100');
  eq(fvsStrictAll.count, APPROVED.strict_one_slot_all_variants, 'family-vs-strict strict all-variants (1,888)');
  eq(fvsStrictTf.count, APPROVED.strict_one_slot_tutor_free, 'family-vs-strict strict tutor-free (1,560)');
  eq(fvsStrictAll.denominator, APPROVED.analyzed_variants, 'strict all-variants denominator = 100,196');
  eq(fvsStrictTf.denominator, APPROVED.tutor_free_candidates, 'strict tutor-free denominator = 86,448');
  check(!(familyVsStrict.rows.some((r) => r.count === 75991)), 'family-vs-strict must exclude the held 75,991 row');

  // --- (7) two-card ladder (C14 sidebar) ---
  const tcClean = twoCard.values.find((v) => /clean/i.test(v.definition));
  const tcTerminal = twoCard.values.find((v) => /terminal/i.test(v.definition));
  eq(tcClean.count, 805, 'two-card ladder clean pairs');
  eq(tcTerminal.count, 306, 'two-card ladder conservative terminal pairs');

  // --- (8) cards: every example card resolves in profiles + manifest ---
  const cardsByName = {};
  for (const c of cardProfiles.cards) {
    cardsByName[c.canonical_name] = {
      name: c.canonical_name,
      typeLine: c.type_line,
      manaCost: c.mana_cost,
      colorIdentity: c.color_identity,
      faceCount: c.face_count,
      faceNames: c.face_names,
      scryfallUri: c.scryfall_uri,
      imageSmall: c.image_uris ? c.image_uris.small : null,
      imageNormal: c.image_uris ? c.image_uris.normal : null,
    };
  }
  eq(comboExamples.examples.length, 11, 'combo example count');
  eq(cardProfiles.cards.length, 27, 'card-profile count');

  // --- (9) per-example structural properties (F/S/C only — see EXAMPLE_SIGNALS) ---
  const examples = comboExamples.examples.map((ex) => {
    for (const name of ex.exact_cards) check(!!cardsByName[name], `example ${ex.variant_id} card "${name}" missing from card-profiles`);
    const F = (ex.family && ex.family.family_size >= 100);
    const S = ex.strict_one_slot === true;
    const C = ex.commander_requirement != null;
    return {
      order: ex.selection_order,
      id: ex.variant_id,
      // `role` is intentionally not carried into the payload: it is an analyst
      // taxonomy label, and three of the eleven values state a per-example H
      // value in shorthand. `purpose` is the reader-facing "why is this here?".
      // The staged source file keeps the field; it is simply not published.
      purpose: ex.purpose,
      limitation: ex.limitation,
      cards: ex.exact_cards,
      tutorClass: ex.tutor_class,
      isTutorFree: ex.tutor_class === 'tutor_free_candidate',
      gravity: ex.component_gravity,
      family: ex.family,
      strictOneSlot: S,
      commanderRequirement: ex.commander_requirement,
      prerequisites: ex.prerequisites,
      resultText: ex.result_text,
      signals: { F, S, C },
    };
  });
  // Guard the rule mechanically: no example may carry an H key downstream.
  for (const e of examples) check(!('H' in e.signals), `example ${e.id}: H must not appear as a per-example signal`);

  const payload = {
    meta: {
      story: summary.article.title,
      subtitle: summary.article.subtitle,
      thesis: summary.article.thesis,
      slug: 'magic-math/tutor-free-structure/',
      sourceGenerated: summary.generated_utc, // stable source timestamp — keeps the injected island deterministic so --check works
      source: 'Commander Spellbook combo-variant research pack (tutor-free-structure handoff)',
    },
    summary: av,
    signals: signals.signals,
    signalDenominator: signals.denominator,
    cohorts: cohorts.cohorts,
    cohortDenominator: cohorts.denominator,
    reconciliation: { hIncl, fIncl, sIncl, cIncl, hfIncl, byCount },
    examples,
    cards: cardsByName,
    familyCurve: familyCurve.thresholds,
    familyVsStrict: familyVsStrict.rows,
    gravity: {
      top100Pct: gravityDist.top_100_component_appearance_share_percent,
      oneVariantCards: gravityDist.one_variant_cards,
      totalExactCards: gravityDist.total_exact_cards,
      oneVariantSharePercent: tailBand.share_percent,
      caveat: gravityDist.caveat,
      bands: gravityBands.bands,
    },
    tutorClasses: tutorClasses.classes,
    twoCardLadder: twoCard,
  };

  return { payload, examples, cohorts: cohorts.cohorts };
}

// ---- illustrative-coverage measurement -------------------------------------
// Measures how well the curated examples illustrate the F/S/C structure a reader
// can select. Examples are illustrations, not a sample of the cohort matrix, so
// this no longer reports cohort placement — H is a population-level signal and
// is not part of the example model at all (see EXAMPLE_SIGNALS).
function coverage(examples) {
  const tf = examples.filter((e) => e.isTutorFree);
  const carrying = Object.fromEntries(EXAMPLE_SIGNALS.map((k) => [k, tf.filter((e) => e.signals[k]).length]));
  const none = tf.filter((e) => EXAMPLE_SIGNALS.every((k) => !e.signals[k])).length;

  // Enumerate all 3^3 = 27 F/S/C tri-state selections; count those an example illustrates.
  const states = ['present', 'absent', 'any'];
  const matches = (sel, e) => EXAMPLE_SIGNALS.every((k) => sel[k] === 'any' || (sel[k] === 'present' ? e.signals[k] === true : e.signals[k] === false));
  let total = 0, withExample = 0, withNone = 0;
  for (const F of states) for (const S of states) for (const C of states) {
    total++;
    if (tf.some((e) => matches({ F, S, C }, e))) withExample++; else withNone++;
  }
  return { tfCount: tf.length, carrying, none, total, withExample, withNone };
}

// ---- prose package-reference validation ------------------------------------
// The article's prose package mentions carry an explicit `data-package-ref="N"`
// (hand-authored, deliberately NOT a string match against card names). This
// asserts each one resolves to a real curated example AND that the wrapped
// prose actually names every exact card in that example — so a reference can
// never quietly point at a different, similarly-named package. Hard-fails.
function validateProseRefs(pageHtml, payload) {
  const byOrder = new Map(payload.examples.map((e) => [String(e.order), e]));
  const decode = (s) => s
    .replace(/<[^>]+>/g, '')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const re = /<span data-package-ref="(\d+)">([\s\S]*?)<\/span>/g;
  const seen = [];
  let m;
  while ((m = re.exec(pageHtml)) !== null) {
    const order = m[1];
    const text = decode(m[2]);
    const ex = byOrder.get(order);
    if (!ex) { check(false, `prose data-package-ref="${order}" does not match any curated example`); continue; }
    for (const card of ex.cards) {
      check(text.includes(card), `prose data-package-ref="${order}" text "${text}" is missing exact card "${card}" — reference may point at the wrong package`);
    }
    seen.push({ order, text });
  }
  return seen;
}

// ---- held-figure + path-leak scans over PUBLISHED text ---------------------
function scanPublishedText(pageHtml, payload) {
  // Corpus = page HTML with <script type="application/json"> islands removed
  // (image URLs / ids live there) PLUS the payload's TEXT fields only.
  const htmlText = pageHtml.replace(/<script[^>]*type=["']application\/json["'][\s\S]*?<\/script>/gi, ' ');
  const textFields = [];
  const pushText = (v) => { if (typeof v === 'string') textFields.push(v); };
  pushText(payload.meta.story); pushText(payload.meta.subtitle); pushText(payload.meta.thesis);
  for (const s of payload.signals) { pushText(s.label); pushText(s.caption); pushText(s.limitation); }
  for (const c of payload.cohorts) { pushText(c.cohort); pushText(c.caption); pushText(c.limitation); }
  for (const t of payload.tutorClasses) { pushText(t.class); pushText(t.caption); pushText(t.limitation); }
  for (const e of payload.examples) {
    pushText(e.purpose); pushText(e.limitation); pushText(e.prerequisites);
    pushText(e.resultText); pushText(e.commanderRequirement); e.cards.forEach(pushText);
  }
  for (const name of Object.keys(payload.cards)) { pushText(name); pushText(payload.cards[name].typeLine); }
  const corpus = htmlText + '\n' + textFields.join('\n');
  const leaks = HELD_PATTERNS.filter((p) => p.re.test(corpus)).map((p) => p.name);
  const pathLeak = /C:\\|C:\/|\/WIP\/|\\WIP|Combo Research/i.test(htmlText);
  return { leaks, pathLeak };
}

// ---- static HTML builders (single-source the visible numbers) --------------
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n).toLocaleString('en-US');

// Renders Oracle-syntax mana symbols ({C}, {3}, ...) using the site-wide Mana
// Font already vendored for card-hover pips (assets/css/mana.css, the same
// `.ms .ms-X .ms-cost` markup site.js's identity-pip cluster and
// table-talk/mana-base-codex's manaSymbol() use) — extended here to parse a
// full sentence, since neither existing helper does that (they map over an
// already-separated array of single color letters). No wording changes: every
// character of the source string survives; only the {X} token becomes a glyph.
// Mirrored in explorer.js for the popup, which renders this same field.
const manaSymbolHtml = (sym) => `<i class="ms ms-${sym.toLowerCase().replace(/\//g, '')} ms-cost" aria-hidden="true"></i>`;
const withManaSymbols = (text) => esc(text).replace(/\{([^}]+)\}/g, (_, sym) => manaSymbolHtml(sym));
function yesNoCell(on, code) {
  // Present dots take the same per-signal color used everywhere else on the
  // page (chips, legend swatches, selection pills) — H gold / F teal / S
  // purple / C blue — instead of one flat color regardless of column.
  return on
    ? `<td class="sig-on sig-${code}" data-on="1"><span aria-hidden="true">●</span><span class="vh"> present</span></td>`
    : `<td class="sig-off" data-on="0"><span aria-hidden="true">–</span><span class="vh"> absent</span></td>`;
}

function buildCohortTable(payload) {
  const rows = payload.cohorts.map((c) => {
    const active = new Set(c.active_signals);
    return `      <tr>
        <th scope="row">${esc(COHORT_LABEL[c.signal_code])}</th>
        ${['H', 'F', 'S', 'C'].map((k) => yesNoCell(active.has(k), k)).join('\n        ')}
        <td class="num">${fmt(c.count)}</td>
        <td class="num">${c.share_percent.toFixed(1)}%</td>
      </tr>`;
  }).join('\n');
  return `<table class="data-table cohort-table">
    <caption>CHART 5 · Every tutor-free package falls into exactly one of the sixteen rows below (recorded internally as H/F/S/C combinations). Each variant is counted once. Shares are of ${fmt(payload.cohortDenominator)}.</caption>
    <thead>
      <tr><th scope="col">Combination</th><th scope="col" title="Widely reused combo piece">H</th><th scope="col" title="Large related-combo group">F</th><th scope="col" title="One-slot variation pattern">S</th><th scope="col" title="Commander required">C</th><th scope="col" class="num">Variants</th><th scope="col" class="num">Share</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
    <tfoot>
      <tr><th scope="row">All tutor-free candidates</th><td></td><td></td><td></td><td></td><td class="num">${fmt(payload.cohortDenominator)}</td><td class="num">100.0%</td></tr>
    </tfoot>
  </table>
  <p class="table-note">Each row counts packages with <em>exactly</em> that combination. For example, the <strong>${esc(COHORT_LABEL.HF)}</strong> row (24,867) excludes packages that also require a commander or match the one-slot variation pattern. The article's “24,944 candidates have both H and F” is the broader figure — it also includes those additional cases. The two numbers measure different things; neither is wrong.</p>`;
}

// ---- reader-facing terminology (Wave 3 publication-readiness pass) --------
// Canonical translation from the internal H/F/S/C signal codes and their
// combinations into the vocabulary a Commander player already has, so the
// letters and the research-facing field names (candidate family, cohort,
// strict one-slot...) stay available as a small technical note rather than
// leading the reader experience. Duplicated in explorer.js for the same
// reason EXT_ICON etc. are duplicated: this is a standalone island page with
// no shared module between build time and runtime. Presentation-layer only —
// every underlying approved count, denominator, and category boundary in
// `docs/research/tutor-free-structure/` is untouched; only how a signal or
// cohort is NAMED on screen changes.
const SIGNAL_LABEL = { H: 'Widely reused combo piece', F: 'Large related-combo group', S: 'One-slot variation pattern', C: 'Commander required' };
// Every one of the 16 mutually exclusive combinations, keyed by signal_code —
// same order the approved structural-cohorts.json already uses (None, single
// signals, pairs, triples, all four).
const COHORT_LABEL = {
  NONE: 'None of the four measured connections',
  H: 'Widely reused piece only', F: 'Large related-combo group only', S: 'One-slot variation only', C: 'Commander required only',
  HF: 'Widely reused piece + large related-combo group', HS: 'Widely reused piece + one-slot variation', HC: 'Widely reused piece + commander required',
  FS: 'Large related-combo group + one-slot variation', FC: 'Large related-combo group + commander required', SC: 'One-slot variation + commander required',
  HFC: 'Widely reused piece + large related-combo group + commander required', HFS: 'Widely reused piece + large related-combo group + one-slot variation',
  HSC: 'Widely reused piece + one-slot variation + commander required', FSC: 'Large related-combo group + one-slot variation + commander required',
  HFSC: 'All four kinds of support',
};
// CHART 4's row labels come verbatim from the approved `family-vs-strict.json`
// (`r.label`, untouched) — this is a display-only translation keyed on the
// exact approved string, same "never alter the source, only how it's named on
// screen" rule as COHORT_LABEL above.
const FAMILY_VS_STRICT_LABEL = {
  'Any candidate-family membership - tutor-free': 'Belongs to any related-combo group — tutor-free',
  'Family size at least 100 - tutor-free': 'Belongs to a large related-combo group (100+) — tutor-free',
  'Strict one-slot structure - all variants': 'Matches the one-slot variation pattern — all variants',
  'Strict one-slot structure - tutor-free': 'Matches the one-slot variation pattern — tutor-free',
};

function buildSignalsTable(payload) {
  const rows = payload.signals.map((s) => `      <tr>
        <th scope="row"><span class="sig-swatch sig-${s.signal_code}" aria-hidden="true"></span>${esc(SIGNAL_LABEL[s.signal_code])} <span class="sig-code">(${s.signal_code})</span></th>
        <td class="num">${fmt(s.count)}</td>
        <td class="num">${s.share_percent.toFixed(1)}%</td>
        <td class="lim">${esc(s.limitation)}</td>
      </tr>`).join('\n');
  return `<table class="data-table signals-table">
    <caption>CHART 2 · Four ways a tutor-free package can still have support, among the ${fmt(payload.signalDenominator)} tutor-free candidates (recorded internally as H/F/S/C). A package can have more than one — the counts are not additive and the percentages are not a score.</caption>
    <thead>
      <tr><th scope="col">Kind of support</th><th scope="col" class="num">Candidates</th><th scope="col" class="num">Share of ${fmt(payload.signalDenominator)}</th><th scope="col">What it does not mean</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>`;
}

function buildTutorClassTable(payload) {
  const total = payload.tutorClasses.reduce((a, c) => a + c.count, 0);
  const rows = payload.tutorClasses.map((c) => `      <tr${/tutor-free/i.test(c.class) ? ' class="row-hl"' : ''}>
        <th scope="row">${esc(c.class)}</th>
        <td class="num">${fmt(c.count)}</td>
        <td class="num">${c.share_percent.toFixed(1)}%</td>
        <td class="lim">${esc(c.limitation)}</td>
      </tr>`).join('\n');
  return `<table class="data-table tutorclass-table">
    <caption>CHART 1 · All ${fmt(total)} documented variants by package-level tutor class. Only the highlighted tutor-free class is analyzed below; the others (including needs-review) stay separate.</caption>
    <thead>
      <tr><th scope="col">Tutor class</th><th scope="col" class="num">Variants</th><th scope="col" class="num">Share of ${fmt(total)}</th><th scope="col">Note</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>`;
}

function buildFamilyTable(payload) {
  const rows = payload.familyCurve.map((t) => `      <tr>
        <th scope="row">at least ${fmt(t.minimum_family_size)} variants</th>
        <td class="num">${fmt(t.count)}</td>
        <td class="num">${t.share_percent.toFixed(1)}%</td>
      </tr>`).join('\n');
  return `<table class="data-table family-table">
    <caption>CHART 3 · How many tutor-free packages belong to a related-combo group, at each of the seven published minimum-group-size thresholds (recorded internally as candidate-family membership). Shares are of ${fmt(payload.cohortDenominator)}. The 100-variant line (34.6%) is an editorial display point, not a natural boundary.</caption>
    <thead>
      <tr><th scope="col">Minimum group size</th><th scope="col" class="num">Tutor-free candidates</th><th scope="col" class="num">Share</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>`;
}

function buildFamilyVsStrictTable(payload) {
  const rows = payload.familyVsStrict.map((r) => {
    check(FAMILY_VS_STRICT_LABEL[r.label] !== undefined, `family-vs-strict row label "${r.label}" has no reader-facing translation in FAMILY_VS_STRICT_LABEL`);
    return `      <tr>
        <th scope="row">${esc(FAMILY_VS_STRICT_LABEL[r.label] || r.label)}</th>
        <td class="num">${fmt(r.count)}</td>
        <td class="num">of ${fmt(r.denominator)}</td>
        <td class="num">${r.share_percent.toFixed(1)}%</td>
        <td class="lim">${esc(r.limitation)}</td>
      </tr>`;
  }).join('\n');
  return `<table class="data-table familyvsstrict-table">
    <caption>CHART 4 · How broadly a related-combo group extends, compared with the much narrower one-slot variation pattern. Each row prints its own denominator; the all-variant count (1,888) and the tutor-free count (1,560) for the one-slot pattern are kept distinct. The held overall-family-covered row is excluded.</caption>
    <thead>
      <tr><th scope="col">Measure</th><th scope="col" class="num">Count</th><th scope="col" class="num">Denominator</th><th scope="col" class="num">Share</th><th scope="col">Note</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>`;
}

// Static fallback for the Gravity Explorer's participation spectrum. Only real
// per-example component-gravity values appear here (and on the spectrum) —
// the corpus-level shares live in a separate labelled block below the table,
// never as rows sharing the same numeric axis, because 30.9% is a share of all
// exact-component appearances, not a gravity coordinate.
function buildGravityTable(payload) {
  const rows = payload.examples.map((e) => `      <tr>
        <th scope="row">${e.cards.map(esc).join(' + ')}</th>
        <td class="num">${fmt(e.gravity.minimum)}</td>
        <td class="num">${fmt(e.gravity.maximum)}</td>
        <td class="num">${e.gravity.average.toFixed(1)}</td>
      </tr>`).join('\n');
  const g = payload.gravity;
  return `<table class="data-table gravity-table">
    <caption>Component gravity for the ${payload.examples.length} curated example packages — the number of documented Commander Spellbook variants containing each component. Values are per package: the lowest-gravity component, the highest, and the mean across that package's components.</caption>
    <thead>
      <tr><th scope="col">Package</th><th scope="col" class="num">Lowest component</th><th scope="col" class="num">Highest component</th><th scope="col" class="num">Mean</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <p class="table-note"><strong>Corpus-level context (not points on the same scale):</strong> the top 100 cards supply ${g.top100Pct}% of all exact-component appearances, and ${fmt(g.oneVariantCards)} exact cards (${g.oneVariantSharePercent}% of ${fmt(g.totalExactCards)}) appear in only one documented variant. ${esc(g.caveat)}</p>`;
}

// Reader-facing tags for the structural properties an example actually carries.
//
// H is deliberately absent at example level. It stays a population-level signal
// (the tri-state explorer control, the cohort matrix, CHART 2, the population
// strip, and the methodology all keep it) — but a curated example exists to
// illustrate a structural idea, not to enumerate every analysis flag attached to
// one package. Rendering an "H: unavailable" badge also put the UI in direct
// visual conflict with the approved prose, which does describe some of these
// packages as containing a widely reused component.
//
// Only properties the package positively records are tagged; absences are not
// enumerated, because "which flags does this row fail" is exactly the
// database-shaped question these examples are not here to answer.
const SIGNAL_TAGS = [['F', SIGNAL_LABEL.F], ['S', SIGNAL_LABEL.S], ['C', SIGNAL_LABEL.C]];

function signalTags(signals) {
  const on = SIGNAL_TAGS.filter(([k]) => signals[k] === true);
  if (!on.length) return '';
  return on.map(([k, label]) => `<span class="sig-tag sig-tag-${k}">${esc(label)}</span>`).join(' ');
}

// External-link cue, same glyph/markup finish-him uses (its `icons.external`,
// magic-math/finish-him/index.html:645-660) so the affordance reads identically
// across both Magic Math pages.
const EXT_ICON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></svg>';

// Card presentation reuses finish-him's `.scry-card` pattern verbatim (its
// `scryFan()`, magic-math/finish-him/index.html:1060): an anchor wrapping the
// card image plus a visible name label with an external cue, opening the card's
// authoritative Scryfall page in a new tab. The Scryfall URL comes from the
// staged `card-profiles.json` (`scryfall_uri`) — never constructed.
//
// The image's alt is empty because the visible label already names the card —
// same rationale finish-him documents, so a screen reader doesn't announce the
// name twice; the link's aria-label carries the full accessible name.
//
// One deliberate divergence from finish-him: it falls back to a constructed
// Scryfall *search* URL when a card has no `scryfall_uri`. Here a card without a
// staged URI degrades to a plain unlinked image instead, so this page never
// emits a URL it wasn't given. (All 27 staged cards have a `scryfall_uri`, so
// this branch is unreachable today — it just keeps the "no invented URLs" rule
// true by construction.)
function cardThumb(payload, name) {
  const c = payload.cards[name];
  const src = c && c.imageNormal ? c.imageNormal : '';
  const type = c && c.typeLine ? c.typeLine : '';
  const uri = c && c.scryfallUri ? c.scryfallUri : '';
  const img = `<img src="${esc(src)}" width="120" height="167" loading="lazy" alt="" data-cardname="${esc(name)}" data-typeline="${esc(type)}">`;
  if (!uri) {
    return `<span class="scry-card scry-card-nolink">${img}<span class="scry-name">${esc(name)}</span></span>`;
  }
  return `<a class="scry-card" href="${esc(uri)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(name)} on Scryfall in a new tab">
        ${img}
        <span class="scry-name">${esc(name)} <span class="ext-cue">${EXT_ICON}</span></span>
      </a>`;
}

function buildExampleList(payload) {
  const cards = payload.examples.map((e) => {
    const thumbs = e.cards.map((n) => cardThumb(payload, n)).join('');
    const tags = signalTags(e.signals);
    const gv = e.gravity ? `min ${e.gravity.minimum} · max ${e.gravity.maximum} · avg ${e.gravity.average.toFixed(1)}` : '—';
    const fam = e.family && e.family.family_size ? `${fmt(e.family.family_size)}-variant family` : 'no qualifying family';
    const tf = e.isTutorFree ? '' : ` <span class="chip chip-warn">tutor-required (comparison)</span>`;
    // Hierarchy: cards → title → why this example was selected (the package's
    // own plain-language `purpose`) → the structural properties it actually
    // carries → a few compact facts → the rest behind a native <details>.
    // Everything is still in the static HTML — collapsed, not removed — so the
    // no-JS floor holds.
    //
    // The package's `role` taxonomy label is deliberately NOT rendered. Three of
    // the eleven roles ("high gravity plus broad family", "high gravity without
    // large family", "broad family without top-gravity component") state a
    // per-example H value in analyst shorthand, which is exactly what must not
    // appear on an individual example. `purpose` already answers "why is this
    // package here?" in reader-facing language, so the taxonomy label is
    // redundant as well as non-compliant. The package data is unchanged — this
    // field is simply not surfaced.
    return `    <article class="example-card" id="example-${e.order}" data-order="${e.order}" data-tutorfree="${e.isTutorFree}" data-tutorclass="${esc(e.tutorClass)}" data-f="${e.signals.F}" data-s="${e.signals.S}" data-c="${e.signals.C}">
      <div class="ex-thumbs">${thumbs}</div>
      ${tf ? `<p class="ex-role">${tf.trim()}</p>` : ''}
      <h4>${e.cards.map(esc).join(' + ')}</h4>
      <p class="ex-why"><span class="ex-why-label">Why this example was selected</span><span class="ex-why-text">${esc(e.purpose)}</span></p>
      ${tags ? `<p class="ex-signals">${tags}</p>` : ''}
      <dl class="ex-meta">
        <div><dt>Component gravity</dt><dd>${gv}</dd></div>
        <div><dt>Candidate family</dt><dd>${esc(fam)}</dd></div>
      </dl>
      <details class="ex-detail">
        <summary>Full package data</summary>
        <dl class="ex-meta">
          ${e.commanderRequirement ? `<div><dt>Commander required</dt><dd>${esc(e.commanderRequirement)}</dd></div>` : ''}
          ${e.prerequisites ? `<div><dt>Documented prerequisite</dt><dd>${withManaSymbols(e.prerequisites)}</dd></div>` : ''}
          <div><dt>Documented result</dt><dd>${esc(e.resultText)}</dd></div>
        </dl>
      </details>
      <p class="ex-limit">${esc(e.limitation)}</p>
      <p class="ex-nourl">No authoritative Commander Spellbook URL is included in this publication package for this variant.</p>
    </article>`;
  }).join('\n');
  return `<div class="example-grid" id="exampleGrid">
${cards}
  </div>`;
}

// ---- marker injection ------------------------------------------------------
function markerRegex(name) {
  return new RegExp(`(<!-- GENERATED:${name}:START — do not edit by hand; run \\\`node scripts/build-tutor-free-structure.js\\\` -->\\n?)([\\s\\S]*?)(\\n?<!-- GENERATED:${name}:END -->)`);
}
function serialize(payload) {
  // Escape "<" so no embedded value can break out of the <script> element.
  return JSON.stringify(payload).replace(/</g, '\\u003c');
}
function islandBlock(payload) {
  return `<script id="${MARKER}" type="application/json">${serialize(payload)}</script>`;
}

// ---- main ------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--check') ? 'check' : args.includes('--report') ? 'report' : 'generate';

  const { payload, examples, cohorts } = build();
  const cov = coverage(examples);

  if (FAILURES.length) {
    console.error('RECONCILIATION FAILED — ' + FAILURES.length + ' problem(s):');
    for (const f of FAILURES) console.error('  \u2717 ' + f);
    process.exit(2);
  }
  console.log('\u2713 Reconciliation passed: 16-cohort sum = 86,448; inclusive H/F/S/C = 57,597 / 29,944 / 1,560 / 858; H\u2229F = 24,944 (exclusive HF row 24,867); 66.6% / 34.6% / 1,888 vs 1,560 / 30.9% / 1,367 all agree across files.');

  // report the section-4 measurement
  console.log('\n--- Curated-example illustrative coverage (F/S/C) ---');
  console.log(`  Tutor-free curated examples: ${cov.tfCount}`);
  console.log(`  Carrying each structural property: F ${cov.carrying.F}, S ${cov.carrying.S}, C ${cov.carrying.C}; none of the three: ${cov.none}`);
  console.log(`  F/S/C selections (of ${cov.total}) illustrated by >=1 example: ${cov.withExample}; with none: ${cov.withNone}`);
  console.log('  (H is a population-level signal only — not a per-example property, so it is not measured here.)');

  if (mode === 'report') { console.log('\n(report mode: no files written)'); return; }

  if (!fs.existsSync(PAGE)) {
    console.error(`\nPage not found: ${path.relative(ROOT, PAGE)} — create it (with the GENERATED:${MARKER} marker pair) before injecting.`);
    process.exit(3);
  }
  const regions = {
    'tfs-data': islandBlock(payload),
    'tfs-tutorclass-table': buildTutorClassTable(payload),
    'tfs-signals-table': buildSignalsTable(payload),
    'tfs-cohort-table': buildCohortTable(payload),
    'tfs-gravity-table': buildGravityTable(payload),
    'tfs-family-table': buildFamilyTable(payload),
    'tfs-familyvsstrict-table': buildFamilyVsStrictTable(payload),
    'tfs-example-list': buildExampleList(payload),
  };
  const html = fs.readFileSync(PAGE, 'utf8');
  let nextHtml = html;
  for (const [name, block] of Object.entries(regions)) {
    const re = markerRegex(name);
    if (!re.test(nextHtml)) { console.error(`\nmarker region "${name}" not found/malformed in ${path.relative(ROOT, PAGE)}`); process.exit(3); }
    nextHtml = nextHtml.replace(re, (m, p1, p2, p3) => p1 + block + p3);
  }

  const scan = scanPublishedText(nextHtml, payload);
  if (scan.leaks.length) { console.error('\nHELD-FIGURE LEAK in published text: ' + scan.leaks.join('; ')); process.exit(2); }
  if (scan.pathLeak) { console.error('\nWINDOWS PATH LEAK in generated page.'); process.exit(2); }
  console.log('\n\u2713 Held-figure + path-leak scan clean on published text.');

  const proseRefs = validateProseRefs(nextHtml, payload);
  if (FAILURES.length) {
    console.error('\nPROSE PACKAGE-REFERENCE VALIDATION FAILED:');
    for (const f of FAILURES) console.error('  \u2717 ' + f);
    process.exit(2);
  }
  console.log(`\u2713 Prose package references: ${proseRefs.length} validated (each resolves to a curated example and names all of its exact cards) \u2014 [${proseRefs.map((r) => r.order).join(', ')}].`);

  if (mode === 'check') {
    if (nextHtml !== html) { console.error('\n--check: generated regions are STALE. Run `node scripts/build-tutor-free-structure.js`.'); process.exit(4); }
    console.log('\u2713 --check: all generated regions are current.');
    return;
  }
  if (nextHtml !== html) { fs.writeFileSync(PAGE, nextHtml, 'utf8'); console.log(`\u2713 Injected ${Object.keys(regions).length} generated regions into ${path.relative(ROOT, PAGE)}.`); }
  else console.log('Generated regions already current; no write needed.');
}

if (require.main === module) main();
module.exports = { build, coverage, markerRegex, EXAMPLE_SIGNALS };
