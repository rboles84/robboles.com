'use strict';
/*
 * Shared search normalization + ordering — the ONE canonical implementation,
 * used by both the Node generator (scripts/build-site-indexes.js) and the
 * browser search page (assets/js/site.js). Keeping a single file means the
 * build-time index and the run-time query can never drift (RBB-045 plan §5.4).
 *
 * Dual-environment: exports via module.exports under Node; attaches a
 * window.SearchNormalize global in the browser. No dependencies.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.SearchNormalize = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // §5.4 — normalization, applied in this exact order. Returns both a `phrase`
  // (punctuation intact, for substring/phrase matching) and `terms` (split on
  // whitespace, for whole-word matching).
  function normalize(input) {
    let s = String(input).normalize('NFC');
    s = s.toLowerCase();
    s = s.replace(/[’ʼ‘`]/g, "'");          // apostrophe fold → ASCII '
    s = s.replace(/[–—‒―‑−]/g, '-'); // dash fold → ASCII -
    s = s.replace(/\s+/g, ' ').trim();
    const phrase = s;
    const terms = phrase.length ? phrase.split(' ') : [];
    return { phrase: phrase, terms: terms };
  }

  // §5.5 total-order comparator (excluding score): dated-before-undated, then
  // published_date descending among dated records, then id ascending. `id` is
  // unique across records, so this is a total order.
  function compareDatedThenId(a, b) {
    const aDated = !!a.published_date;
    const bDated = !!b.published_date;
    if (aDated !== bDated) return aDated ? -1 : 1;
    if (aDated && a.published_date !== b.published_date) return a.published_date < b.published_date ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }

  return { normalize: normalize, compareDatedThenId: compareDatedThenId };
});
