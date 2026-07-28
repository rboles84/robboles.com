/* Structural Support Explorer — the flagship interactive layer for
 * "Tutor-Free Does Not Mean Structure-Free" (RBB-059).
 *
 * Enhances the static markup: reads the embedded #tfs-data island, wires the
 * tri-state H/F/S/C controls, resolves the active selection to exact-cohort vs.
 * filtered-aggregate counts, explains what the selected combination means using
 * only the package's own approved captions/limitations/thesis (no new claims,
 * no inferred conclusions), and drills into the curated examples that satisfy
 * it — with an explicit empty state and a clearly-labeled "related" area for
 * close-but-not-exact selections. No network use; degrades to the static tables
 * and example list with scripting off.
 */
(() => {
  'use strict';
  const dataEl = document.getElementById('tfs-data');
  if (!dataEl) return;
  let DATA;
  try { DATA = JSON.parse(dataEl.textContent); } catch (e) { return; }

  const SIGNALS = ['H', 'F', 'S', 'C'];
  // Reader-first vocabulary — traceable to the article's own "wrong binary"
  // section (F-09): "a component reused across many documented variants;
  // membership in a source-grouped candidate family; survival of a strict
  // fixed-core, one-varying-slot test; a required commander." H/F/S/C stay
  // available as secondary shorthand once the reader has seen the plain names.
  // Mirrors scripts/build-tutor-free-structure.js's SIGNAL_LABEL/COHORT_LABEL —
  // same canonical terms, duplicated for the same reason as the mana-symbol
  // helper (no shared module between build time and runtime on this island page).
  const SIG_NAME = { H: 'Widely reused combo piece', F: 'Large related-combo group', S: 'One-slot variation pattern', C: 'Commander required' };
  const PRESENT_PHRASE = { H: 'contains a widely reused combo piece', F: 'belongs to a large group of related combos', S: 'matches the one-slot variation pattern', C: 'requires the commander' };
  const ABSENT_PHRASE = { H: 'does not contain a widely reused combo piece', F: 'does not belong to a large group of related combos', S: 'does not match the one-slot variation pattern', C: 'does not require the commander' };
  // Plural forms, for sentences about a set of packages rather than one package
  // ("Showing packages that belong to…" vs. the checklist's "belongs to…").
  const PRESENT_PLURAL = { F: 'belong to a large group of related combos', S: 'match the one-slot variation pattern', C: 'require the commander' };
  const ABSENT_PLURAL = { F: 'do not belong to a large group of related combos', S: 'do not match the one-slot variation pattern', C: 'do not require the commander' };
  // Every one of the 16 mutually exclusive combinations, keyed by signal_code —
  // same list as the generator's COHORT_LABEL, used here for the result panel's
  // exact-combination name so it matches CHART 5's row names.
  const COHORT_LABEL = {
    NONE: 'None of the four measured connections',
    H: 'Widely reused piece only', F: 'Large related-combo group only', S: 'One-slot variation only', C: 'Commander required only',
    HF: 'Widely reused piece + large related-combo group', HS: 'Widely reused piece + one-slot variation', HC: 'Widely reused piece + commander required',
    FS: 'Large related-combo group + one-slot variation', FC: 'Large related-combo group + commander required', SC: 'One-slot variation + commander required',
    HFC: 'Widely reused piece + large related-combo group + commander required', HFS: 'Widely reused piece + large related-combo group + one-slot variation',
    HSC: 'Widely reused piece + one-slot variation + commander required', FSC: 'Large related-combo group + one-slot variation + commander required',
    HFSC: 'All four kinds of support',
  };
  const joinList = (a) => (a.length <= 1 ? (a[0] || '') : a.length === 2 ? `${a[0]} and ${a[1]}` : `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`);
  const DENOM = DATA.cohortDenominator;
  const cohorts = DATA.cohorts;
  const signalsByCode = Object.fromEntries(DATA.signals.map((s) => [s.signal_code, s]));
  const tfExamples = DATA.examples.filter((e) => e.isTutorFree);

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n).toLocaleString('en-US');
  // Renders Oracle-syntax mana symbols ({C}, {3}, ...) with the site-wide Mana
  // Font (assets/css/mana.css, linked in this page's <head>) — mirrors the
  // generator's copy of the same helper (scripts/build-tutor-free-structure.js),
  // since this popup renders the same `prerequisites` field the static card
  // does. No wording change: the source text is preserved character-for-
  // character; only the {X} token becomes a glyph instead of literal braces.
  const manaSymbolHtml = (sym) => `<i class="ms ms-${sym.toLowerCase().replace(/\//g, '')} ms-cost" aria-hidden="true"></i>`;
  const withManaSymbols = (text) => esc(text).replace(/\{([^}]+)\}/g, (_, sym) => manaSymbolHtml(sym));
  const pct1 = (count, denom) => (Math.round((count / denom) * 1000) / 10).toFixed(1);
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const form = document.getElementById('signalControls');
  const explorerOutput = document.getElementById('explorerOutput');
  const resultPanel = document.getElementById('resultPanel');
  const meaningPanel = document.getElementById('meaningPanel');
  const drill = document.getElementById('drill');
  const reset = document.getElementById('resetSignals');
  const ladderBody = document.getElementById('ladderBody');
  if (!form || !resultPanel || !drill) return;

  function selection() {
    const sel = {};
    for (const k of SIGNALS) {
      const picked = form.querySelector(`input[name="${k}"]:checked`);
      sel[k] = picked ? picked.value : 'any';
    }
    return sel;
  }

  // A cohort's active_signals is the set of present signals (e.g. ["H","F"]).
  function cohortMatches(cohort, sel) {
    const active = new Set(cohort.active_signals);
    return SIGNALS.every((k) => sel[k] === 'any' || (sel[k] === 'present' ? active.has(k) : !active.has(k)));
  }

  // Curated examples carry F/S/C only. H is a population-level signal — it is not
  // part of the example model at all (the payload omits it), so it never
  // participates in matching and is never shown on an example.
  const EXAMPLE_SIGNALS = ['F', 'S', 'C'];

  // Per-example, per-selection status of each constrained F/S/C signal.
  function classify(ex, sel) {
    const constrained = EXAMPLE_SIGNALS.filter((k) => sel[k] !== 'any');
    const mismatches = constrained.filter((k) => ex.signals[k] !== (sel[k] === 'present'));
    if (mismatches.length === 0) return { kind: 'exact' };
    if (mismatches.length === 1) return { kind: 'related', signal: mismatches[0] };
    return { kind: 'hidden' };
  }

  function selectionChips(sel) {
    return SIGNALS.map((k) => {
      const state = sel[k];
      return `<span class="selchip"><span class="dot" style="background:var(--sig-${k})"></span>${k}: ${state}</span>`;
    }).join('');
  }

  function renderResult(sel, matched) {
    const sum = matched.reduce((a, c) => a + c.count, 0);
    const constrainedCount = SIGNALS.filter((k) => sel[k] !== 'any').length;

    let kind, name, explain, share;
    if (constrainedCount === 0) {
      kind = 'Every tutor-free package';
      name = 'No filters applied';
      share = pct1(sum, DENOM);
      explain = `Every documented tutor-free package. Set a measurement to <em>present</em> or <em>absent</em> below to see how the population splits.`;
    } else if (constrainedCount === 4) {
      const cohort = matched[0]; // exactly one row matches when all four are constrained
      kind = 'One exact combination';
      name = esc(COHORT_LABEL[cohort.signal_code]);
      share = cohort.share_percent.toFixed(1);
      if (cohort.count === 0) {
        explain = `This exact combination matches <strong>0</strong> tutor-free packages. That's a real, defined answer under these four measurements — not a missing number. ${esc(cohort.limitation)}`;
      } else {
        explain = `One specific combination, counted on its own — no package here also carries any of the other measurements. ${esc(cohort.caption)} ${esc(cohort.limitation)}`;
      }
    } else {
      kind = 'Added-up total';
      const nonzero = matched.filter((c) => c.count > 0).length;
      name = `Adds up ${nonzero} matching combination${nonzero === 1 ? '' : 's'} from the table below`;
      share = pct1(sum, DENOM);
      explain = `This isn't one of the sixteen exact combinations below — it's a broader total that adds together every combination consistent with your selection (${nonzero} of them have any packages in them). Because the four measurements overlap, don't read this as one single group.`;
    }

    resultPanel.innerHTML = `
      <p class="result-kind">${kind}</p>
      <p class="result-count">${fmt(sum)}<small> / ${fmt(DENOM)} tutor-free candidates · ${share}%</small></p>
      <p class="result-name">${name}</p>
      <p class="result-explain">${explain}</p>
      <div class="result-selection">${selectionChips(sel)}</div>`;
  }

  // ---- interpretation layer ------------------------------------------------
  // Every sentence here is either the package's own cohort/signal caption or
  // limitation text, or the article's published thesis — nothing synthesized,
  // nothing beyond what the selected signals themselves state.
  function checklistItem(k, state) {
    const label = SIG_NAME[k];
    if (state === 'any') {
      return `<li class="mc-any"><span class="mc-icon" aria-hidden="true">·</span>${esc(label)} <span class="mc-code">(${k})</span> — not filtered</li>`;
    }
    const yes = state === 'present';
    const phrase = yes ? PRESENT_PHRASE[k] : ABSENT_PHRASE[k];
    return `<li class="${yes ? 'mc-yes' : 'mc-no'}"><span class="mc-icon" aria-hidden="true">${yes ? '✓' : '✗'}</span>${esc(phrase)} <span class="mc-code">(${k})</span></li>`;
  }

  function buildMeaning(sel, matched) {
    const constrained = SIGNALS.filter((k) => sel[k] !== 'any');
    const checklist = SIGNALS.map((k) => checklistItem(k, sel[k])).join('');

    let body;
    if (constrained.length === 0) {
      body = `<p>${esc(DATA.meta.thesis)}</p>`;
    } else if (constrained.length === 4) {
      const cohort = matched[0];
      body = `<p>${esc(cohort.caption)}</p><p class="meaning-caveat">${esc(cohort.limitation)}</p>`;
    } else {
      const presentKeys = constrained.filter((k) => sel[k] === 'present');
      const absentKeys = constrained.filter((k) => sel[k] === 'absent');
      const parts = [`<p>This isn't one of the sixteen exact combinations — it's a broader total that adds several of them together.</p>`];
      if (presentKeys.length) {
        parts.push(`<p>It includes any tutor-free package that:</p>`);
        parts.push(`<ul class="meaning-agg-list">${presentKeys.map((k) => {
          const s = signalsByCode[k];
          return `<li>${esc(s.caption)} <span class="meaning-caveat">${esc(s.limitation)}</span></li>`;
        }).join('')}</ul>`);
      }
      if (absentKeys.length) {
        // "or", not joinList's "and": a package is left out if it has ANY one of
        // these — same logic the original wording expressed ("where X or Y is
        // present"), not "has both X and Y".
        parts.push(`<p>It leaves out any package that also ${absentKeys.map((k) => PRESENT_PHRASE[k]).join(', or that ')}.</p>`);
      }
      body = parts.join('');
    }

    return `<p class="meaning-title">What this combination means</p>
      <ul class="meaning-checklist">${checklist}</ul>
      <div class="meaning-body">${body}</div>`;
  }

  function renderMeaning(sel, matched) {
    if (!meaningPanel) return;
    meaningPanel.innerHTML = buildMeaning(sel, matched);
  }

  // Reader-facing tags for the structural properties an example actually carries.
  // Only positives are tagged; absences aren't enumerated, and H never appears —
  // same rule and rationale as the generator's signalTags().
  function signalTags(signals) {
    const on = EXAMPLE_SIGNALS.filter((k) => signals[k] === true);
    if (!on.length) return '';
    return on.map((k) => `<span class="sig-tag sig-tag-${k}">${esc(SIG_NAME[k])}</span>`).join(' ');
  }

  // External-link cue — same glyph finish-him uses (its `icons.external`).
  const EXT_ICON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></svg>';

  // Same `.scry-card` pattern the generated static cards use (see cardThumb() in
  // scripts/build-tutor-free-structure.js), itself ported from finish-him's
  // scryFan() — one implementation, rendered from both places. Scryfall URLs come
  // from the staged card profiles; a card without one degrades to an unlinked image.
  function thumbs(cards) {
    return cards.map((name) => {
      const c = DATA.cards[name];
      const src = c && c.imageNormal ? c.imageNormal : '';
      const type = c && c.typeLine ? c.typeLine : '';
      const uri = c && c.scryfallUri ? c.scryfallUri : '';
      const img = `<img src="${esc(src)}" width="120" height="167" loading="lazy" alt="" data-cardname="${esc(name)}" data-typeline="${esc(type)}">`;
      if (!uri) return `<span class="scry-card scry-card-nolink">${img}<span class="scry-name">${esc(name)}</span></span>`;
      return `<a class="scry-card" href="${esc(uri)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(name)} on Scryfall in a new tab">${img}<span class="scry-name">${esc(name)} <span class="ext-cue">${EXT_ICON}</span></span></a>`;
    }).join('');
  }

  /* ---- package popup -------------------------------------------------------
   * Ports the site-wide `.cardname` / `#cardpop` interaction that
   * posts/your-precon-is-a-passport/ uses (assets/js/site.js ~484): one reusable
   * fixed panel appended to <body>, placed beside its trigger and clamped into
   * the viewport, closed by Escape / outside click / scroll / resize, with the
   * same `.on` fade and inert-until-shown guard.
   *
   * Ported rather than imported because this island page loads no site.js (same
   * reason mana-base-codex carries its own copy). Adaptations, both deliberate:
   * opens on click/Enter/Space instead of hover (a full package panel is too
   * large to throw under a moving pointer, and hover-open would fight the
   * approved `.scry-card` hover zoom inside these same cards), and focus returns
   * to the trigger on close. Triggers are real <button>s, so Enter and Space
   * come from the platform rather than a synthetic key handler.
   *
   * Every field rendered here is read straight from the staged package payload.
   * Nothing is derived — in particular H is never inferred; it prints the
   * standing "unavailable" line unless an explicit authoritative example-level
   * field appears upstream. No Commander Spellbook action is rendered: all 11
   * `combo_url` values are null and marked unavailable in the immutable outputs.
   */
  const exampleByOrder = new Map(DATA.examples.map((e) => [String(e.order), e]));

  function packageTitle(ex) { return ex.cards.map(esc).join(' + '); }

  // Commander-facing translations of the approved `purpose` and `limitation`
  // fields, keyed by selection_order. Presentation-layer only: the underlying
  // `purpose`/`limitation` strings in the staged data are untouched, and every
  // number referenced here (family size, gravity min/max) is the exact
  // unchanged approved figure. Teaching-forward per the publication polish
  // pass: `matters` explains the Magic concept this combo demonstrates before
  // any measurement; `notice` is the one caveat a reader should walk away
  // with, never restating a prerequisite/result already shown verbatim above
  // it. Full mode only — see popupHtmlFull(). Examples 10 and 11 have no
  // prose reference and therefore never open in full mode, so they have no
  // entry here; example 10's one required plain-language note (it's the
  // tutor-required comparison) is handled separately in popupHtmlDetail().
  const COMMANDER_COPY = {
    1: {
      matters: "This combo shows how a single widely-reused piece can anchor a whole cluster of combos — 434 other documented lines share real structure with this one, not just this build.",
      notice: "None of that makes it easier to assemble. A well-traveled piece and a big family of related lines are both just structure — not a shortcut to actually getting there.",
    },
    2: {
      matters: "This combo is built around a piece that shows up constantly across Commander combos too — but it doesn't sit inside a larger family of related lines the way the last one did. Reuse and “part of a bigger family” turn out to be two separate things.",
      notice: "A widely-reused piece doesn't erase the actual setup — this line still needs another Zombie in play before it does anything.",
    },
    3: {
      matters: "This combo pairs a card that's barely been seen anywhere else — just two documented variants — with the single most-reused card in the whole dataset. The contrast can live inside one package, not just between different ones.",
      notice: "Rarity and reuse aren't opposites here — a near-unknown piece and one of Spellbook's most common combo pieces sit side by side in the exact same line.",
    },
    4: {
      matters: "This combo sits inside a family of 229 related documented lines — without leaning on any single widely-reused piece to get there. Big family and famous piece turn out to be two separate things.",
      notice: "Being part of a 229-line family doesn't shrink the setup — this one still needs a fully developed board before it goes anywhere.",
    },
    5: {
      matters: "This is the clearest example of an engine that shows up over and over with different finishers bolted on — 268 documented lines share this same core, each ending a little differently.",
      notice: "That doesn't mean any of those 268 lines can swap parts with this one and get the same result — it's one engine getting documented many times, not proof the pieces are interchangeable.",
    },
    6: {
      matters: "Swap one card out of this combo and the rest of the structure mostly holds together — this is one of the rare lines where that's actually true, not just assumed.",
      notice: "Surviving that swap test doesn't make this a free combo — you still need to be sitting at a real life total before it goes off.",
    },
    7: {
      matters: "Here's a second combo where changing one card leaves the rest of the structure mostly intact — same underlying pattern as the last example, in a completely different shape.",
      notice: "That structural resilience doesn't replace the rest of the requirements — you still need another qualifying permanent already in play.",
    },
    8: {
      matters: "Starting with your commander already guaranteed solves one real piece of the puzzle before the game even begins. This combo shows exactly what that does — and doesn't — get you.",
      notice: "Having Krenko guaranteed doesn't finish the job — you still need a real Goblin board built up before this does anything.",
    },
    9: {
      matters: "Most tutor-free combos connect to something bigger — a family, a widely-reused piece, or a required commander. This is one of only ten documented lines that connects to none of that. It's the exception that tests the rule.",
      notice: "Both cards here appear in exactly one documented combo — this one. About as isolated as a tutor-free line gets under this analysis.",
    },
  };

  // mode 'full' (a bare prose mention — nothing about the package is visible
  // yet) vs 'detail' (opened from a gallery/drill card that already shows
  // images, title, why-selected, and structural tags). Same package, same
  // popup component, deliberately different content so opening it always
  // reveals something the reader couldn't already see.
  function packageTrigger(ex, label, mode) {
    return `<button type="button" class="pkg-trigger" data-package="${ex.order}" data-pkg-mode="${mode === 'detail' ? 'detail' : 'full'}" aria-expanded="false">${label || packageTitle(ex)}<span class="pkg-cue" aria-hidden="true">▾</span></button>`;
  }

  // "Infinite X | Infinite Y | ..." -> a real list. Same text, split on the
  // package's own delimiter — no rewording, no new claim.
  function resultItems(text) {
    return String(text || '').split('|').map((s) => s.trim()).filter(Boolean);
  }

  // Commander requirement + prerequisite, folded into one "what must already
  // be true" section — a required commander genuinely is a precondition, on
  // the same footing as a board-state prerequisite. Prerequisite text itself
  // is the approved field, verbatim, never reworded.
  function mustBeTrueLines(ex) {
    const lines = [];
    if (ex.commanderRequirement) lines.push(`Starts with <strong>${esc(ex.commanderRequirement)}</strong> already in the command zone — one piece of the puzzle already solved.`);
    if (ex.prerequisites) lines.push(withManaSymbols(ex.prerequisites));
    return lines;
  }

  function producesSection(ex) {
    const items = resultItems(ex.resultText);
    return `<div class="pkgpop-section"><span class="pkgpop-label">What the combo produces</span><ul class="pkgpop-produces">${items.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
  }

  // Full mode: nothing about this package is visible anywhere else, so this
  // is the complete picture — cards first (that's "how it functions": these
  // specific pieces, in combination), then what must be true, what it makes,
  // why the article picked it, its limitation, and the rest behind a
  // disclosure for readers who want it.
  function popupHtmlFull(ex) {
    const mustBeTrue = mustBeTrueLines(ex);
    const tags = signalTags(ex.signals);
    const gv = ex.gravity ? `min ${ex.gravity.minimum} · max ${ex.gravity.maximum} · avg ${ex.gravity.average.toFixed(1)}` : '—';
    const fam = ex.family && ex.family.family_size ? `${fmt(ex.family.family_size)}-variant family` : 'No qualifying family';
    // Commander-facing translation of the approved purpose/limitation text —
    // see COMMANDER_COPY above. Falls back to the raw approved fields if an
    // example ever opens in full mode without a translated entry, rather than
    // rendering nothing.
    const copy = COMMANDER_COPY[ex.order] || { matters: ex.purpose, notice: ex.limitation };
    return `
      <div class="pkgpop-head">
        <h3 id="pkgpop-title">${packageTitle(ex)}</h3>
        <button type="button" class="pkgpop-close" aria-label="Close package details"><span aria-hidden="true">×</span></button>
      </div>
      <div class="pkgpop-body">
        <div class="pkgpop-cards">${thumbs(ex.cards)}</div>
        ${mustBeTrue.length ? `<div class="pkgpop-section"><span class="pkgpop-label">What must already be true</span>${mustBeTrue.map((l) => `<p class="pkgpop-line">${l}</p>`).join('')}</div>` : ''}
        ${producesSection(ex)}
        <div class="pkgpop-section"><span class="pkgpop-label">Why this one matters</span><p class="pkgpop-line">${esc(copy.matters)}</p></div>
        <div class="pkgpop-section"><span class="pkgpop-label">What to notice</span><p class="pkgpop-line">${esc(copy.notice)}</p></div>
        <details class="pkgpop-tech">
          <summary>Behind the numbers</summary>
          <dl class="ex-meta">
            <div><dt>How widely reused (documented combos)</dt><dd>${esc(gv)}</dd></div>
            <div><dt>Related-combo group size</dt><dd>${esc(fam)}</dd></div>
          </dl>
          ${tags ? `<p class="ex-signals pkgpop-signals">${tags}</p>` : ''}
        </details>
      </div>`;
  }

  // Detail mode: the card behind this popup already shows images, title,
  // why-selected, structural tags, component gravity, candidate family, and
  // the limitation — all in its own collapsed state. This popup therefore
  // shows only what that collapsed card does not: what must already be true
  // and what it produces. Tutor class is dropped entirely for the standard
  // tutor-free examples (ambient context the gallery section already
  // establishes) — the one exception is the tutor-required comparison
  // example, which gets a plain, always-visible flag rather than a collapsed
  // dt/dd, since it needs to be noticed, not looked up.
  function popupHtmlDetail(ex) {
    const mustBeTrue = mustBeTrueLines(ex);
    const comparisonFlag = ex.tutorClass !== 'tutor_free_candidate'
      ? `<p class="pkgpop-flag">Every other package in this gallery is tutor-free. This one isn't — its own line searches its library for the piece it needs, which is exactly what a tutor does.</p>`
      : '';
    return `
      <div class="pkgpop-head">
        <h3 id="pkgpop-title">${packageTitle(ex)}</h3>
        <button type="button" class="pkgpop-close" aria-label="Close package details"><span aria-hidden="true">×</span></button>
      </div>
      <div class="pkgpop-body">
        ${comparisonFlag}
        ${mustBeTrue.length ? `<div class="pkgpop-section"><span class="pkgpop-label">What must already be true</span>${mustBeTrue.map((l) => `<p class="pkgpop-line">${l}</p>`).join('')}</div>` : ''}
        ${producesSection(ex)}
      </div>`;
  }

  function popupHtml(ex, mode) {
    return mode === 'detail' ? popupHtmlDetail(ex) : popupHtmlFull(ex);
  }

  const pkgPop = (() => {
    let el = null;
    let openTrigger = null;
    // Monotonic token identifying the current open. Both deferred callbacks (the
    // rAF that adds `.on`, and the post-fade `display:none`) check it before
    // acting, so a late frame can't mark an already-closed panel visible and a
    // stale hide can't blank a panel that has since been reopened. rAF is
    // throttled hard in background/inactive tabs, which makes that ordering real
    // rather than theoretical — hit it during verification.
    let openToken = 0;

    function ensure() {
      if (el) return el;
      el = document.createElement('div');
      el.id = 'pkgpop';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'false');
      el.setAttribute('aria-labelledby', 'pkgpop-title');
      el.setAttribute('aria-hidden', 'true');
      el.tabIndex = -1;
      document.body.appendChild(el);
      return el;
    }

    // Same placement algorithm as #cardpop: beside the trigger, flipped to the
    // other side when it would overflow, then clamped into the viewport.
    function place(trigger) {
      const p = ensure();
      const r = trigger.getBoundingClientRect();
      p.style.display = 'block';
      const pw = p.offsetWidth, ph = p.offsetHeight;
      let left = r.right + 12;
      if (left + pw > window.innerWidth - 8) left = r.left - pw - 12;
      if (left < 8) left = 8;
      let top = r.top + r.height / 2 - ph / 2;
      top = Math.max(8, Math.min(top, window.innerHeight - ph - 8));
      p.style.left = left + 'px';
      p.style.top = top + 'px';
    }

    function open(trigger) {
      const ex = exampleByOrder.get(trigger.getAttribute('data-package'));
      if (!ex) return;
      if (openTrigger && openTrigger !== trigger) openTrigger.setAttribute('aria-expanded', 'false');
      const p = ensure();
      const token = ++openToken;
      p.innerHTML = popupHtml(ex, trigger.getAttribute('data-pkg-mode'));
      p.setAttribute('aria-hidden', 'false');
      openTrigger = trigger;
      trigger.setAttribute('aria-expanded', 'true');
      place(trigger);
      wireImageFallbacks(p);
      p.querySelector('.pkgpop-close').addEventListener('click', () => close(true));
      window.requestAnimationFrame(() => { if (openToken === token) p.classList.add('on'); });
      // preventScroll: focusing the panel must not scroll the page — the scroll
      // listener below closes on any scroll, so without this the act of opening
      // could immediately close it again.
      p.focus({ preventScroll: true });
    }

    function close(restoreFocus) {
      if (!el || !openTrigger) return;
      const token = ++openToken;
      el.classList.remove('on');
      el.setAttribute('aria-hidden', 'true');
      const trigger = openTrigger;
      openTrigger = null;
      trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) trigger.focus();
      const p = el;
      window.setTimeout(() => { if (openToken === token) p.style.display = 'none'; }, 160);
    }

    function isOpen() { return !!openTrigger; }
    function currentTrigger() { return openTrigger; }
    return { open, close, isOpen, currentTrigger, contains: (n) => !!el && el.contains(n) };
  })();

  // Delegated so triggers re-rendered by the explorer (drill-down mini-cards)
  // keep working without rebinding — same delegation approach as #cardpop.
  document.addEventListener('click', (e) => {
    if (pkgPop.contains(e.target)) return; // let controls/links inside the panel act normally
    const trigger = e.target.closest ? e.target.closest('.pkg-trigger') : null;
    if (trigger) {
      if (pkgPop.currentTrigger() === trigger) pkgPop.close(true);
      else pkgPop.open(trigger);
      return;
    }
    if (pkgPop.isOpen()) pkgPop.close(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pkgPop.isOpen()) pkgPop.close(true);
  });
  window.addEventListener('scroll', () => { if (pkgPop.isOpen()) pkgPop.close(false); }, { passive: true });
  window.addEventListener('resize', () => { if (pkgPop.isOpen()) pkgPop.close(false); });

  // Upgrade the server-rendered package titles into triggers. Done here rather
  // than in the generator so the no-JS page never ships a dead button: with
  // scripting off the titles stay exactly the plain text they are today.
  function upgradeStaticTriggers() {
    // The card already shows images/title/why/tags, so its trigger opens the
    // lean "detail" popup — see popupHtmlDetail().
    document.querySelectorAll('#exampleGrid .example-card').forEach((card) => {
      const ex = exampleByOrder.get(card.getAttribute('data-order'));
      const h4 = card.querySelector('h4');
      if (!ex || !h4 || h4.querySelector('.pkg-trigger')) return;
      h4.innerHTML = packageTrigger(ex, null, 'detail');
    });
    // Prose references carry an explicit, generator-validated data-package-ref
    // so nothing depends on matching card names in running text. Nothing about
    // the package is visible in running prose, so these open the full popup.
    document.querySelectorAll('[data-package-ref]').forEach((ref) => {
      const ex = exampleByOrder.get(ref.getAttribute('data-package-ref'));
      if (!ex || ref.querySelector('.pkg-trigger')) return;
      ref.innerHTML = packageTrigger(ex, ref.textContent, 'full');
    });
  }

  function miniCard(ex, diffNote) {
    // Mini-cards already show images/title/why/tags, same as the gallery card
    // — so this trigger opens the same lean "detail" popup, not the full one.
    const tags = signalTags(ex.signals);
    return `<article class="mini-card">
      <div class="mini-thumbs">${thumbs(ex.cards)}</div>
      <h4>${packageTrigger(ex, null, 'detail')}</h4>
      <p class="mc-why">${esc(ex.purpose)}</p>
      ${tags ? `<p class="ex-signals">${tags}</p>` : ''}
      ${diffNote ? `<p class="mc-diff">${esc(diffNote)}</p>` : ''}
      <a class="mc-full-link" href="#example-${ex.order}">View full example &darr;</a>
    </article>`;
  }

  function diffText(ex, signal) {
    const has = ex.signals[signal];
    const phrase = has ? PRESENT_PHRASE[signal] : ABSENT_PHRASE[signal];
    return `Close, not exact — this one ${phrase}, which is the opposite of what you selected.`;
  }

  function renderDrill(sel) {
    const constrained = EXAMPLE_SIGNALS.filter((k) => sel[k] !== 'any');
    const buckets = { exact: [], related: [] };
    for (const ex of tfExamples) {
      const c = classify(ex, sel);
      if (c.kind === 'exact') buckets.exact.push(ex);
      else if (c.kind === 'related') buckets.related.push({ ex, signal: c.signal });
    }

    const heading = constrained.length === 0
      ? 'All curated tutor-free examples'
      : 'Curated examples that show this structure';

    let html = `<h3>${heading}</h3>`;
    // Say why these packages are here, in plain language, rather than asking the
    // reader to read a row of analysis flags. When the reader has constrained H,
    // explain that it shaped the count above but not which examples appear —
    // examples illustrate structural ideas, they don't enumerate every signal.
    let why;
    if (constrained.length === 0) {
      why = `All eleven curated packages, chosen to illustrate the different shapes a tutor-free package can take. They are illustrations, not a representative sample.`;
    } else {
      const phrases = constrained.map((k) => (sel[k] === 'present' ? PRESENT_PLURAL[k] : ABSENT_PLURAL[k]));
      why = `Showing packages that ${joinList(phrases)}. These are illustrations chosen for the ideas they demonstrate, not a representative sample.`;
    }
    if (sel.H !== 'any') {
      why += ` Whether a package contains a widely reused combo piece shapes the population count above, but it isn't used to pick these examples.`;
    }
    html += `<p class="drill-note">${why}</p>`;

    // Carry the current selection down to the full gallery. Only F/S/C are
    // transferable — H is not a property of an individual example.
    const transferable = EXAMPLE_SIGNALS.filter((k) => sel[k] === 'present');
    if (transferable.length) {
      html += `<p><button type="button" class="drill-sync" id="drillSync">Show these in the full example gallery &darr;</button></p>`;
    }

    if (buckets.exact.length) {
      html += `<div class="result-grid">${buckets.exact.map((ex) => miniCard(ex)).join('')}</div>`;
    } else {
      html += `<div class="empty-state">
        <p><strong>None of the curated examples illustrate this particular combination.</strong></p>
        <p>That does not mean this combination is empty — the count above is real, drawn from the full 86,448-candidate population.</p>
        <p>The eleven examples were chosen to show a range of structural ideas, not to cover every combination.</p>
      </div>`;
    }

    if (constrained.length >= 1 && buckets.related.length) {
      html += `<div class="related-block"><h4>Close, but not this structure</h4>
        <p class="drill-note">Not matches. Each of these differs from what you selected in exactly one way, stated on the card — shown for contrast, never as a substitute for a match.</p>
        <div class="result-grid">${buckets.related.map(({ ex, signal }) => miniCard(ex, diffText(ex, signal))).join('')}</div></div>`;
    }

    drill.innerHTML = html;
    wireImageFallbacks(drill);
    const sync = drill.querySelector('#drillSync');
    if (sync) {
      sync.addEventListener('click', () => {
        comboFilter.applyFromSignals(sel);
        const target = document.getElementById('examples');
        if (target) target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      });
    }
  }

  // Broken-image fallback: swap a failed <img> for a same-sized element showing
  // the card name + type line (same technique as finish-him's wireImageFallbacks).
  function wireImageFallbacks(scope) {
    scope.querySelectorAll('img[data-cardname]').forEach((img) => {
      img.addEventListener('error', function handler() {
        img.removeEventListener('error', handler);
        const ph = document.createElement('span');
        ph.className = 'thumb-broken';
        ph.style.width = img.getAttribute('width') + 'px';
        ph.style.height = img.getAttribute('height') + 'px';
        const type = img.getAttribute('data-typeline');
        ph.textContent = img.getAttribute('data-cardname') + (type ? ' — ' + type : '') + ' (image unavailable)';
        img.replaceWith(ph);
      });
    });
  }

  function doUpdate() {
    const sel = selection();
    const matched = cohorts.filter((c) => cohortMatches(c, sel));
    renderResult(sel, matched);
    renderMeaning(sel, matched);
    renderDrill(sel);
  }

  // A selection change should feel like asking a question, not a page redraw:
  // the whole output block (count → meaning → cards) fades as one unit. Skipped
  // entirely under prefers-reduced-motion — render is synchronous, no delay.
  function update() {
    if (!explorerOutput || reducedMotion()) { doUpdate(); return; }
    explorerOutput.classList.add('is-fading');
    window.setTimeout(() => {
      doUpdate();
      explorerOutput.classList.remove('is-fading');
    }, 110);
  }

  form.addEventListener('change', update);
  if (reset) reset.addEventListener('click', () => {
    for (const k of SIGNALS) {
      const any = form.querySelector(`input[name="${k}"][value="any"]`);
      if (any) any.checked = true;
    }
    update();
  });

  /* ---- Gravity Explorer ----------------------------------------------------
   * A logarithmic participation spectrum over the curated packages only. Each
   * row spans that package's real lowest→highest component gravity with its
   * published mean marked. Nothing is synthesized: there is no per-card
   * distribution in the package, so none is drawn. The corpus-level figures
   * (top-100 share, one-variant tail) are static callouts beside the spectrum,
   * never plotted on this axis — 30.9% is a share of appearances, not a
   * gravity coordinate.
   */
  (() => {
    const spectrum = document.getElementById('spectrum');
    const readout = document.getElementById('spectrumReadout');
    if (!spectrum || !readout) return;

    const rows = DATA.examples.slice().sort((a, b) => a.gravity.average - b.gravity.average);
    const lo = 1;
    const hi = Math.max(...DATA.examples.map((e) => e.gravity.maximum));
    const logLo = Math.log10(lo), logHi = Math.log10(hi);
    const pos = (v) => ((Math.log10(Math.max(v, lo)) - logLo) / (logHi - logLo)) * 100;

    const ticks = [1, 10, 100, 1000].filter((t) => t <= hi).concat([hi]);
    const axis = `<div class="spec-axis">${ticks.map((t) => `<span class="spec-tick" style="left:${pos(t).toFixed(2)}%">${fmt(t)}</span>`).join('')}</div>`;

    spectrum.innerHTML = axis + rows.map((ex) => {
      const l = pos(ex.gravity.minimum), r = pos(ex.gravity.maximum), a = pos(ex.gravity.average);
      const label = `${ex.cards.join(' + ')} — least reused card ${fmt(ex.gravity.minimum)}, most reused card ${fmt(ex.gravity.maximum)}, package average ${ex.gravity.average.toFixed(1)}`;
      return `<button type="button" class="spec-row" data-order="${ex.order}" aria-pressed="false" aria-label="${esc(label)}">
        <span class="spec-name">${esc(ex.cards.join(' + '))}</span>
        <span class="spec-track">
          <span class="spec-bar" style="left:${l.toFixed(2)}%;width:${Math.max(r - l, 0.4).toFixed(2)}%"></span>
          <span class="spec-end" style="left:${l.toFixed(2)}%"></span>
          <span class="spec-end" style="left:${r.toFixed(2)}%"></span>
          <span class="spec-dot" style="left:${a.toFixed(2)}%"></span>
        </span>
      </button>`;
    }).join('');

    function showEmpty() {
      readout.innerHTML = `<p class="sr-empty">Select a package on the spectrum to see its components and what its gravity spread means.</p>`;
    }

    function select(order) {
      const ex = exampleByOrder.get(String(order));
      if (!ex) return;
      spectrum.querySelectorAll('.spec-row').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.order === String(order))));
      readout.innerHTML = `
        <p class="sr-title">${ex.cards.map(esc).join(' + ')}</p>
        <p class="sr-why">${esc(ex.purpose)}</p>
        <div class="pkgpop-cards">${thumbs(ex.cards)}</div>
        <div class="sr-vals" style="margin-top:14px">
          <div class="sr-val"><strong>${fmt(ex.gravity.minimum)}</strong><span>Least reused card</span></div>
          <div class="sr-val"><strong>${fmt(ex.gravity.maximum)}</strong><span>Most reused card</span></div>
          <div class="sr-val"><strong>${ex.gravity.average.toFixed(1)}</strong><span>Package average</span></div>
        </div>
        <p class="sr-note">${esc(ex.limitation)}</p>`;
      wireImageFallbacks(readout);
    }

    spectrum.addEventListener('click', (e) => {
      const row = e.target.closest('.spec-row');
      if (row) select(row.dataset.order);
    });
    showEmpty();
  })();

  /* ---- Family Explorer -----------------------------------------------------
   * Live slider across the seven published thresholds. It only ever reports a
   * published count/share for the threshold under the handle — nothing is
   * interpolated between the seven points. At the strict end it surfaces the
   * CHART 4 contrast so "broad family" and "strict one-slot" stay distinct.
   */
  (() => {
    const slider = document.getElementById('famSlider');
    const out = document.getElementById('famReadout');
    const scale = document.getElementById('famScale');
    if (!slider || !out || !DATA.familyCurve) return;

    const curve = DATA.familyCurve;
    slider.max = String(curve.length - 1);
    scale.innerHTML = curve.map((t) => `<span data-min="${t.minimum_family_size}">${fmt(t.minimum_family_size)}</span>`).join('');

    const strictTF = DATA.familyVsStrict.find((r) => /strict one-slot.*tutor-free/i.test(r.label));
    const strictAll = DATA.familyVsStrict.find((r) => /strict one-slot.*all variants/i.test(r.label));

    function render() {
      const t = curve[Number(slider.value)];
      scale.querySelectorAll('span').forEach((s) => s.classList.toggle('is-active', Number(s.dataset.min) === t.minimum_family_size));
      const strictNote = Number(slider.value) === curve.length - 1 && strictTF && strictAll
        ? `<p class="fr-strict">Even at the strictest published family threshold this is still <em>family</em> membership. The fixed-core, one-varying-slot test is far narrower: <strong>${fmt(strictTF.count)}</strong> tutor-free candidates of ${fmt(strictTF.denominator)} (${strictTF.share_percent.toFixed(1)}%), and <strong>${fmt(strictAll.count)}</strong> of ${fmt(strictAll.denominator)} across all variants (${strictAll.share_percent.toFixed(1)}%). ${esc(strictAll.limitation)}</p>`
        : '';
      out.innerHTML = `
        <p class="fr-count">${fmt(t.count)}<small> / ${fmt(t.denominator)} tutor-free candidates · ${t.share_percent.toFixed(1)}%</small></p>
        <p class="fr-desc">belong to a candidate family of <strong>at least ${fmt(t.minimum_family_size)}</strong> documented variants.</p>
        <p class="fr-strict">${esc(t.limitation)}</p>
        ${strictNote}`;
    }
    slider.addEventListener('input', render);
    render();
  })();

  /* ---- Combo Structure Explorer --------------------------------------------
   * Filters the *static* example cards in place (hide/show) rather than
   * re-rendering them, so the server-rendered list stays the single source of
   * truth and the no-JS floor is untouched. H is disabled, not silently
   * unmatched: the package publishes no per-example high-gravity value, so an
   * H filter could only ever produce a misleading empty result.
   */
  const comboFilter = (() => {
    const form = document.getElementById('comboFilters');
    const countEl = document.getElementById('comboCount');
    const emptyEl = document.getElementById('comboEmpty');
    const grid = document.getElementById('exampleGrid');
    if (!form || !grid) return { apply: () => {} };

    const cards = [...grid.querySelectorAll('.example-card')];

    function checked(name) {
      return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
    }

    function apply() {
      const classes = checked('tutorclass');
      const signals = checked('signal');
      let shown = 0;
      for (const card of cards) {
        const okClass = !classes.length || classes.includes(card.dataset.tutorclass);
        // Intersection: the card must carry every selected structural property.
        const okSignals = signals.every((s) => card.dataset[s.toLowerCase()] === 'true');
        const show = okClass && okSignals;
        card.hidden = !show;
        if (show) shown++;
      }
      countEl.textContent = shown === cards.length
        ? `Showing all ${cards.length} curated examples.`
        : `Showing ${shown} of ${cards.length} curated examples.`;
      emptyEl.hidden = shown !== 0;
      return shown;
    }

    function reset() {
      form.querySelectorAll('input[type="checkbox"]').forEach((i) => { i.checked = false; });
      apply();
    }

    form.addEventListener('change', apply);
    document.getElementById('comboReset').addEventListener('click', reset);
    document.getElementById('comboResetInline').addEventListener('click', () => {
      reset();
      document.getElementById('comboFilters').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    });

    // Cross-tool sync: a Structural Support Explorer selection can drive this
    // gallery. Only F/S/C are ever pushed across — H is never inferred.
    function applyFromSignals(sel) {
      form.querySelectorAll('input[name="signal"]').forEach((i) => {
        i.checked = !i.disabled && sel[i.value] === 'present';
      });
      apply();
    }

    apply();
    return { apply, reset, applyFromSignals };
  })();

  // The static (server-generated) example-list images carry the same
  // data-cardname/data-typeline hooks; wire them too so a failed CDN load
  // degrades to a text placeholder there as well, not just in the drill cards.
  wireImageFallbacks(document);

  upgradeStaticTriggers();

  // Two-card ladder sidebar (C14, sidebar-only) — enhance the static fallback.
  if (ladderBody && DATA.twoCardLadder) {
    const v = DATA.twoCardLadder.values;
    const clean = v.find((x) => /clean/i.test(x.definition));
    const term = v.find((x) => /terminal/i.test(x.definition));
    ladderBody.innerHTML = `<p>Two definitions of a “two-card combo,” neither treated as the one true meaning:</p>
      <ul>
        <li><strong>${fmt(clean.count)}</strong> tutor-free candidates meet the clean-pair rule.</li>
        <li><strong>${fmt(term.count)}</strong> of those also meet the conservative terminal-result rule.</li>
      </ul>
      <p style="color:var(--faint)">Of ${fmt(DATA.cohortDenominator)} tutor-free candidates. ${esc(DATA.twoCardLadder.caveat)}</p>`;
  }

  /* ---- "On this page" navigation -------------------------------------------
   * Native <details>/<summary> in the markup — open/close, keyboard, and
   * touch all work with scripting off, at any width, as an ordinary
   * collapsible disclosure. This layer does two things:
   * (1) keeps the `open` attribute in sync with the >=1440px rail
   *     breakpoint the CSS uses, so a screen reader's expanded/collapsed
   *     announcement always matches what's actually visible — never CSS
   *     alone faking an "open" state the semantics disagree with;
   * (2) highlights the current section while scrolling, reusing the same
   *     scroll-position algorithm assets/js/site.js already ships for the
   *     shared site's own `data-toc` (the last heading whose top has
   *     scrolled past a small offset). Ported, not shared — this island
   *     page loads neither site.js nor styles.css.
   */
  (() => {
    const toc = document.getElementById('toc');
    if (!toc) return;
    const nav = toc.querySelector('nav');
    const links = Array.from(nav.querySelectorAll('a'));
    const sections = links
      .map((link) => ({ link, el: document.getElementById(link.getAttribute('href').slice(1)) }))
      .filter((s) => s.el);

    const railQuery = window.matchMedia('(min-width: 1440px)');
    function syncRailState() {
      if (railQuery.matches) toc.setAttribute('open', '');
      else toc.removeAttribute('open');
    }
    syncRailState();
    if (railQuery.addEventListener) railQuery.addEventListener('change', syncRailState);
    else if (railQuery.addListener) railQuery.addListener(syncRailState); // older Safari

    // Close the mobile/tablet disclosure after following a link, so the
    // reader lands on the section rather than the still-open list. Only
    // applies below the rail breakpoint, where the toggle is real — in rail
    // mode the summary is hidden and `open` is held by syncRailState above.
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' && !railQuery.matches) {
        window.setTimeout(() => toc.removeAttribute('open'), 0);
      }
    });

    if (!sections.length) return;
    let ticking = false;
    const offset = 32;
    function updateActive() {
      ticking = false;
      let active = sections[0];
      for (const s of sections) {
        if (s.el.getBoundingClientRect().top - offset <= 0) active = s;
        else break;
      }
      // aria-current, not a live region: available to assistive tech on
      // request, never announced proactively on every scroll tick.
      links.forEach((l) => l.removeAttribute('aria-current'));
      active.link.setAttribute('aria-current', 'true');
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; window.requestAnimationFrame(updateActive); }
    }, { passive: true });
    updateActive();
  })();

  doUpdate();
})();
