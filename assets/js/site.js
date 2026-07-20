
(function () {
  const body = document.body;
  const root = body ? body.dataset.root || '' : '';

  // Shared MTG color vocabulary — rarity edge + WUBRG color-identity hex
  // values, plus the gradient helper. Originally lived only inside the
  // .cardname hover-popup block; hoisted to module scope so both #cardpop
  // and initFlavorCards() (Recommended Shelf / Open the Deck Box) reuse the
  // exact same palette rather than each defining its own copy.
  const RARITY_COLOR = { uncommon: '#707883', rare: '#A58E4A', mythic: '#BF4427' };
  const CI_ORDER = ['W', 'U', 'B', 'R', 'G'];
  // B and G reference CSS vars, not literal hex — both need theme-aware
  // values (B nearly matches the dark-mode card surface as a literal hex
  // and disappears; --ci-black carries the dark-mode override, same
  // pattern as --ss-common below).
  const CI_COLOR = { W: '#e7dba4', U: '#2f7cc4', B: 'var(--ci-black)', R: '#c0473a', G: 'var(--accent)', C: 'var(--faint)' };
  // Accepts either a color-identity array (["U","R"], the shape Scryfall/
  // flavor-cards.json data uses) or a legacy string ("UR", the shape
  // .cardname's data-colors attribute uses) — normalizes both to the same
  // sorted letter array (WUBRG order), used by identityStyle/identitySolid.
  function identityLetters(colors) {
    const raw = Array.isArray(colors) ? colors : String(colors || 'C').split('');
    let letters = raw.map(function (l) { return String(l).toUpperCase(); }).filter(function (l) { return CI_COLOR[l]; });
    if (!letters.length) letters = ['C'];
    letters.sort(function (a, b) { return CI_ORDER.indexOf(a) - CI_ORDER.indexOf(b); });
    return letters;
  }
  // A flat color or (for 2+ colors) a left-to-right gradient — valid
  // anywhere a `background`/`background-image` value is expected, but NOT
  // valid for `border-color` (gradients aren't legal border colors).
  function identityStyle(colors) {
    const letters = identityLetters(colors);
    if (letters.length === 1) return CI_COLOR[letters[0]];
    const seg = 100 / letters.length;
    const stops = letters.map(function (l, i) {
      return CI_COLOR[l] + ' ' + (i * seg) + '% ' + ((i + 1) * seg) + '%';
    });
    return 'linear-gradient(90deg, ' + stops.join(', ') + ')';
  }
  // A single solid color, safe for border-color: the one color for mono/
  // colorless identities, or --tt-gold for 2+ colors — echoing how Magic
  // players actually talk about a multicolor card ("a gold card").
  function identitySolid(colors) {
    const letters = identityLetters(colors);
    return letters.length === 1 ? CI_COLOR[letters[0]] : 'var(--tt-gold)';
  }

  const navToggle = document.querySelector('[data-nav-toggle]');
  const siteNav = document.querySelector('[data-site-nav]');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      const open = siteNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  // Nav dropdowns (Field Guide -> Field Kit, Table Talk -> Magic Math, and
  // any future pair): each `[data-nav-dropdown]` nav item is a disclosure
  // widget, not an ARIA menu — real links, plain document Tab order, no
  // role="menu"/menuitem/aria-haspopup. The primary link stays a direct
  // link; a separate caret button toggles a two-destination panel.
  // Hover-intent open is layered on top of click, gated to devices with
  // real hover so touch never gets a synthetic open. Each panel is `inert`
  // while closed on desktop (never inert on mobile, where it renders as a
  // static stacked link) so closed-panel links aren't reachable by Tab
  // until disclosed. Instances are wired independently (own ARIA/focus/
  // inert state) but coordinate at the group level: opening one closes any
  // other currently-open instance so panels never stack.
  (function initNavDropdowns() {
    const items = document.querySelectorAll('[data-nav-dropdown]');
    if (!items.length) return;

    const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    const mobileLayout = window.matchMedia('(max-width: 900px)');
    const instances = [];

    items.forEach(function (item) {
      const caret = item.querySelector('.nav-caret');
      const panel = item.querySelector('.nav-dropdown');
      if (!caret || !panel) return;
      const name = item.dataset.dropdownName || 'links';
      let hoverTimer = null;

      function isOpen() { return panel.classList.contains('is-open'); }

      function applyInert() {
        panel.inert = !mobileLayout.matches && !isOpen();
      }

      function open() {
        clearTimeout(hoverTimer);
        // Mutual exclusivity: opening this instance closes every other
        // open instance without touching its own ARIA/focus/inert state.
        instances.forEach(function (other) {
          if (other.item !== item && other.isOpen()) other.close();
        });
        panel.classList.add('is-open');
        caret.setAttribute('aria-expanded', 'true');
        caret.setAttribute('aria-label', 'Hide ' + name + ' links');
        applyInert();
      }

      function close(opts) {
        clearTimeout(hoverTimer);
        panel.classList.remove('is-open');
        caret.setAttribute('aria-expanded', 'false');
        caret.setAttribute('aria-label', 'Show ' + name + ' links');
        applyInert();
        if (opts && opts.returnFocus) caret.focus();
      }

      close();

      mobileLayout.addEventListener('change', function () {
        close();
      });

      // Pointer-driven activation focuses the caret before the click event
      // fires, so a naive focusin-opens-everything rule would have the click
      // handler's toggle immediately re-close a panel that focus just opened.
      // Suppress the focus-open for the one focusin caused by this pointer
      // press, and let the click handler own the toggle instead — keyboard
      // Tab (no preceding pointerdown) still opens on focus alone.
      let suppressCaretFocusOpen = false;
      caret.addEventListener('pointerdown', function () {
        suppressCaretFocusOpen = true;
      });
      caret.addEventListener('click', function () {
        if (isOpen()) close({ returnFocus: true });
        else open();
      });

      if (fineHover.matches) {
        item.addEventListener('mouseenter', function () {
          clearTimeout(hoverTimer);
          hoverTimer = setTimeout(open, 120);
        });
        item.addEventListener('mouseleave', function () {
          clearTimeout(hoverTimer);
          hoverTimer = setTimeout(close, 200);
        });
      }

      item.addEventListener('focusin', function (event) {
        if (mobileLayout.matches) return;
        if (event.target === caret && suppressCaretFocusOpen) {
          suppressCaretFocusOpen = false;
          return;
        }
        open();
      });
      item.addEventListener('focusout', function (event) {
        if (!item.contains(event.relatedTarget)) close();
      });

      instances.push({ item: item, isOpen: isOpen, close: close });
    });

    if (!instances.length) return;

    // Escape closes only the currently active instance (at most one, given
    // mutual exclusivity above); outside-click closes any instance whose
    // panel is open and wasn't the click target.
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      instances.forEach(function (inst) {
        if (inst.isOpen()) inst.close({ returnFocus: true });
      });
    });
    document.addEventListener('click', function (event) {
      instances.forEach(function (inst) {
        if (inst.isOpen() && !inst.item.contains(event.target)) inst.close();
      });
    });

    // Opening the mobile hamburger normalizes any stray desktop state.
    if (navToggle) navToggle.addEventListener('click', function () {
      instances.forEach(function (inst) { inst.close(); });
    });
  })();

  // Dark mode toggle (RBB-028): a single icon button in the nav. Shows the
  // icon for the theme a click will switch TO, not the current one (e.g. in
  // dark mode it shows the light-mode icon). System preference is the
  // default (handled in CSS); a click here persists an explicit override to
  // localStorage.
  //
  // The icon itself is lane-aware (Rob doesn't want MTG imagery bleeding
  // into non-MTG pages): Table Talk pages (body[data-lane="table-talk"])
  // keep the mana-pip icon; every other page gets a plain sun/moon SVG.
  if (siteNav) {
    const THEME_KEY = 'theme';
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') document.documentElement.dataset.theme = stored;

    const isMtgLane = body.dataset.lane === 'table-talk';

    const themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.className = 'theme-toggle';
    siteNav.appendChild(themeBtn);

    const SUN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.6"/><g stroke-linecap="round"><path d="M12 2.5v3"/><path d="M12 18.5v3"/><path d="M4.5 12h-3"/><path d="M22.5 12h-3"/><path d="M6.3 6.3 4.2 4.2"/><path d="M19.8 19.8l-2.1-2.1"/><path d="M6.3 17.7 4.2 19.8"/><path d="M19.8 4.2l-2.1 2.1"/></g></svg>';
    const MOON_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.6A9 9 0 1 1 9.4 3.5a7.2 7.2 0 0 0 11.1 11.1Z"/></svg>';

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    function isDark() {
      return document.documentElement.dataset.theme
        ? document.documentElement.dataset.theme === 'dark'
        : prefersDark.matches;
    }
    function syncButton() {
      const dark = isDark();
      themeBtn.setAttribute('aria-pressed', String(dark));
      themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      themeBtn.innerHTML = isMtgLane
        ? '<i class="ms ' + (dark ? 'ms-w' : 'ms-b') + ' ms-cost" aria-hidden="true"></i>'
        : (dark ? SUN_ICON : MOON_ICON);
    }
    syncButton();
    themeBtn.addEventListener('click', function () {
      const next = isDark() ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem(THEME_KEY, next);
      syncButton();
    });
  }

  // Subscribe form: posts directly to Kit's (formerly ConvertKit) public
  // form-submission endpoint — no server, no API key. The form ID lives in
  // markup (data-kit-form-id) so it's a one-line edit, not a JS change.
  const subscribeForm = document.querySelector('[data-subscribe-form]');
  const subscribeConfirm = document.querySelector('[data-subscribe-confirm]');
  const subscribeError = document.querySelector('[data-subscribe-error]');
  if (subscribeForm && subscribeConfirm) {
    subscribeForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const formId = subscribeForm.dataset.kitFormId;
      const submitBtn = subscribeForm.querySelector('button[type="submit"]');
      if (subscribeError) subscribeError.classList.add('is-hidden');
      if (!formId) {
        if (subscribeError) {
          subscribeError.textContent = 'Subscribe form is not configured yet.';
          subscribeError.classList.remove('is-hidden');
        }
        return;
      }
      if (submitBtn) submitBtn.disabled = true;
      fetch('https://app.kit.com/forms/' + formId + '/subscriptions', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(subscribeForm)
      })
        .then(function (response) { return response.json().then(function (data) { return { ok: response.ok, data: data }; }); })
        .then(function (result) {
          // Kit returns HTTP 200 even on failure — success is status "success",
          // not merely a non-error HTTP response. Failures use status "failed"
          // with errors.messages (e.g. bad form ID, invalid/duplicate email).
          if (result.ok && result.data && result.data.status === 'success') {
            subscribeForm.classList.add('is-hidden');
            subscribeConfirm.classList.remove('is-hidden');
          } else {
            const messages = result.data && result.data.errors && result.data.errors.messages;
            throw new Error((messages && messages[0]) || 'Subscription failed');
          }
        })
        .catch(function (err) {
          if (submitBtn) submitBtn.disabled = false;
          if (subscribeError) {
            subscribeError.textContent = err.message || 'Something went wrong — please try again.';
            subscribeError.classList.remove('is-hidden');
          }
        });
    });
  }

  const copyButtons = document.querySelectorAll('[data-copy-link]');
  copyButtons.forEach(function (button) {
    button.addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(window.location.href);
        const original = button.textContent;
        button.textContent = 'Link copied';
        setTimeout(function () { button.textContent = original; }, 1600);
      } catch (err) {
        button.textContent = 'Copy failed';
      }
    });
  });

  // Table Talk: a randomly-chosen piece of MTG card art, shown crisp and framed
  // in the hero with a proper artist credit (the card name links to Scryfall,
  // the artist links to their full gallery). The art list is cached locally at
  // authoring time (assets/images/cards/art/, catalogued in
  // assets/data/table-talk-cards.json) — no runtime third-party request. If the
  // fetch fails or the file is missing, the figure stays hidden (graceful, per
  // the site's "static doesn't mean safe" rule — no hard dependency).
  //
  // Set symbol: rendered from the locally-vendored Keyrune font
  // (assets/css/keyrune.css, assets/fonts/keyrune.*) using the card's `set`/
  // `rarity` fields, backfilled at authoring time from Scryfall. The set/code
  // code text is the accessible source of truth; the glyph is aria-hidden and
  // only ever rendered for a validated code — an unsupported or missing code
  // renders no icon at all (never Keyrune's generic default glyph).
  const KNOWN_RARITIES = ['common', 'uncommon', 'rare', 'mythic'];
  const SET_CODE_RE = /^[a-z0-9-]+$/;
  function setSymbolHtml(card) {
    if (!card.set || !SET_CODE_RE.test(card.set) || !card.set_name) return '';
    const rarityClass = KNOWN_RARITIES.indexOf(card.rarity) !== -1 ? ' ss-' + card.rarity : '';
    return '<span class="tt-set">' +
      '<i class="ss ss-' + card.set + rarityClass + '" aria-hidden="true"></i>' +
      '<span class="tt-set-name">' + escapeHtml(card.set_name) + ' (' + card.set.toUpperCase() + ')</span>' +
      '</span>';
  }

  const artFig = document.querySelector('.tt-art');
  if (artFig && body.dataset.lane === 'table-talk') {
    // Defaults to the Table Talk pool for backward compatibility; a page
    // can point at a different, thematically-appropriate pool via
    // data-art-source (e.g. magic-math/index.html uses a real-card mix
    // instead of Table Talk's lands-only Mana Base Codex pool).
    const artSource = artFig.dataset.artSource || 'table-talk-cards.json';
    fetch(root + 'assets/data/' + artSource)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cards) {
        if (!cards || !cards.length) return;
        const card = cards[Math.floor(Math.random() * cards.length)];
        const img = artFig.querySelector('img');
        const frame = artFig.querySelector('.tt-art-frame');
        const cap = artFig.querySelector('.tt-art-cap');
        img.onload = function () { artFig.hidden = false; };
        img.alt = card.name + ' — art by ' + card.artist;
        img.src = root + card.art;
        if (frame) frame.href = card.scryfall;
        if (cap && card.artist) {
          const gallery = 'https://scryfall.com/search?q=' +
            encodeURIComponent('artist:"' + card.artist + '"') + '&unique=art';
          cap.innerHTML =
            '<a class="nm" href="' + card.scryfall + '" target="_blank" rel="noopener">' +
              escapeHtml(card.name) + '</a>' +
            setSymbolHtml(card) +
            'art by <a class="artist" href="' + gallery + '" target="_blank" rel="noopener">' +
              escapeHtml(card.artist) + '</a>';
        }
      })
      .catch(function () {});
  }

  const filterButtons = document.querySelectorAll('[data-filter]');
  const filterInput = document.querySelector('[data-filter-input]');
  const cards = Array.from(document.querySelectorAll('[data-card]'));
  const empty = document.querySelector('[data-empty-state]');
  let activeFilter = 'all';

  function applyFilters() {
    const query = filterInput ? filterInput.value.trim().toLowerCase() : '';
    let visible = 0;
    cards.forEach(function (card) {
      const category = (card.dataset.category || '').toLowerCase();
      const haystack = [card.dataset.title, card.dataset.category, card.dataset.tags, card.textContent].join(' ').toLowerCase();
      const matchesFilter = activeFilter === 'all' || category === activeFilter.toLowerCase() || haystack.includes(activeFilter.toLowerCase());
      const matchesQuery = !query || haystack.includes(query);
      const show = matchesFilter && matchesQuery;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (empty) empty.classList.toggle('is-visible', visible === 0);
  }

  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      activeFilter = button.dataset.filter || 'all';
      filterButtons.forEach(function (b) { b.classList.remove('is-active'); });
      button.classList.add('is-active');
      applyFilters();
    });
  });
  if (filterInput) filterInput.addEventListener('input', applyFilters);

  const searchRoot = document.querySelector('[data-search-root]');
  if (searchRoot) {
    const input = document.querySelector('[data-site-search]');
    const results = document.querySelector('[data-search-results]');
    const params = new URLSearchParams(window.location.search);
    const initial = params.get('q') || '';
    if (input) input.value = initial;

    fetch(root + 'assets/data/posts.json')
      .then(function (response) { return response.json(); })
      .then(function (posts) {
        function render() {
          const q = input ? input.value.trim().toLowerCase() : '';
          const filtered = posts.filter(function (post) {
            return !q || [post.title, post.description, post.category, post.tags.join(' ')].join(' ').toLowerCase().includes(q);
          });
          results.innerHTML = filtered.map(function (post) {
            return '<article class="post-card">' +
              '<div class="card-topline"><span>' + escapeHtml(post.category) + '</span><span>' + post.reading_minutes + ' min read</span></div>' +
              '<h3><a href="' + root + 'posts/' + post.slug + '/">' + escapeHtml(post.title) + '</a></h3>' +
              '<p>' + escapeHtml(post.description) + '</p>' +
              '<div class="tag-row">' + post.tags.slice(0,3).map(function (tag) { return '<span>' + escapeHtml(tag) + '</span>'; }).join('') + '</div>' +
              '</article>';
          }).join('');
          if (!filtered.length) results.innerHTML = '<p class="empty-state is-visible">No matching posts yet.</p>';
        }
        if (input) input.addEventListener('input', render);
        render();
      });
  }

  // Card-name hover preview (Table Talk articles): shows a small, locally-
  // hosted card thumbnail (assets/images/cards/<slug>.jpg, fetched once at
  // authoring time — no runtime third-party request) plus a link out to
  // Scryfall. Only runs if the page actually has .cardname spans.
  const cardnames = document.querySelectorAll('.cardname');
  if (cardnames.length) {
    // Always-on identity styling — runs once here, independent of the
    // hover/popup logic below: a solid underline colored by the span's
    // real color identity (identitySolid — same gold-for-multicolor
    // convention used elsewhere) plus a tiny real mana-glyph cluster
    // prepended before the name, so a hoverable mention reads as distinct
    // prose at rest, not just a plain dotted underline. Missing
    // data-colors defaults to colorless, same as the popup's own bar.
    cardnames.forEach(function (el) {
      el.style.setProperty('--cn-color', identitySolid(el.dataset.colors));
      const pips = identityLetters(el.dataset.colors).map(function (l) {
        return '<i class="ms ms-' + l.toLowerCase() + ' ms-cost"></i>';
      }).join('');
      // .ms-cluster (not a bespoke class alone) — reuses the existing pip
      // component's flex-centering + hairline ring instead of re-deriving
      // it; a wrapper without that class rendered visibly off-center.
      el.insertAdjacentHTML('afterbegin', '<span class="ms-cluster" aria-hidden="true">' + pips + '</span>');
    });
    let pop = null;
    let hoverTimer = null;
    let hideTimer = null;
    let current = null;
    // Rarity edge + color-identity bar on the popup: RARITY_COLOR/CI_COLOR/
    // identityStyle are the shared MTG color helpers defined at the top of
    // this file (also used by initFlavorCards()). Both are optional per-card
    // data (data-rarity / data-colors); missing either just falls back to
    // the plain --line border/bar in styles.css.
    // hide() is delayed (not instant) so the pointer has time to travel from
    // the card name into the popup itself — entering the popup cancels the
    // pending hide, which is what makes the Scryfall link inside it clickable.
    function scheduleHide() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, 300);
    }
    function cancelHide() { clearTimeout(hideTimer); }
    function ensurePop() {
      if (pop) return pop;
      pop = document.createElement('div');
      pop.id = 'cardpop';
      pop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(pop);
      pop.addEventListener('mouseenter', cancelHide);
      pop.addEventListener('mouseleave', scheduleHide);
      return pop;
    }
    function place(el) {
      const p = ensurePop();
      const r = el.getBoundingClientRect();
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
    function show(el) {
      const name = el.dataset.card;
      const img = el.dataset.img;
      if (!name) return;
      current = name;
      const p = ensurePop();
      const scryUrl = 'https://scryfall.com/search?q=' + encodeURIComponent('!"' + name + '"');
      p.innerHTML = (img ? '<img src="' + root + img + '" alt="' + escapeHtml(name) + '">' : '') +
        '<div class="cp-foot"><span class="cp-nm">' + escapeHtml(name) + '</span>' +
        '<a href="' + scryUrl + '" target="_blank" rel="noopener">Scryfall &#8599;</a></div>';
      const rarity = el.dataset.rarity;
      p.style.setProperty('--cp-rarity', RARITY_COLOR[rarity] || 'var(--line)');
      p.style.setProperty('--cp-identity', identityStyle(el.dataset.colors));
      place(el);
      requestAnimationFrame(function () { p.classList.add('on'); });
    }
    function hide() {
      current = null;
      if (pop) {
        pop.classList.remove('on');
        const p = pop;
        setTimeout(function () { if (!current) p.style.display = 'none'; }, 160);
      }
    }
    document.addEventListener('mouseover', function (e) {
      const el = e.target.closest ? e.target.closest('.cardname') : null;
      if (!el) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { show(el); }, 250);
    });
    document.addEventListener('mouseout', function (e) {
      const el = e.target.closest ? e.target.closest('.cardname') : null;
      if (!el) return;
      clearTimeout(hoverTimer);
      scheduleHide();
    });
    document.addEventListener('focusin', function (e) {
      const el = e.target.closest ? e.target.closest('.cardname') : null;
      if (el) { cancelHide(); show(el); }
    });
    document.addEventListener('focusout', function (e) {
      const el = e.target.closest ? e.target.closest('.cardname') : null;
      // Don't hide if focus is moving INTO the popup (e.g. Tab reaching the
      // Scryfall link) — only hide once focus actually leaves both.
      if (el && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('#cardpop'))) {
        scheduleHide();
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#cardpop')) return; // let the Scryfall link act normally
      const el = e.target.closest ? e.target.closest('.cardname') : null;
      if (el) { if (current === el.dataset.card) hide(); else show(el); }
      else if (current) hide();
    });
    window.addEventListener('scroll', function () { if (current) hide(); }, { passive: true });
    window.addEventListener('resize', function () { if (current) hide(); });
  }

  // Print / save-as-PDF buttons (Field Kit artifacts)
  document.querySelectorAll('[data-print]').forEach(function (button) {
    button.addEventListener('click', function () { window.print(); });
  });

  // Code-block copy buttons (article template)
  document.querySelectorAll('[data-code-copy]').forEach(function (button) {
    button.addEventListener('click', async function () {
      const block = button.closest('.code-block');
      const pre = block ? block.querySelector('pre') : null;
      if (!pre) return;
      try {
        await navigator.clipboard.writeText(pre.innerText);
        const original = button.textContent;
        button.textContent = 'copied';
        setTimeout(function () { button.textContent = original; }, 1500);
      } catch (err) {
        button.textContent = 'failed';
      }
    });
  });

  // Active-section tracking for the sticky article TOC.
  // Scroll-position based: the active heading is the last one scrolled past the
  // offset line below the sticky header. Reliable across thin headings and fast scrolls.
  const tocNav = document.querySelector('[data-toc]');
  if (tocNav) {
    const tocLinks = Array.from(tocNav.querySelectorAll('a'));
    const sections = tocLinks
      .map(function (link) {
        const id = (link.getAttribute('href') || '').replace('#', '');
        return { link: link, el: id && document.getElementById(id) };
      })
      .filter(function (s) { return s.el; });

    if (sections.length) {
      let ticking = false;
      const offset = 100; // px below the top, clears the sticky header
      function updateToc() {
        ticking = false;
        let active = sections[0];
        for (let i = 0; i < sections.length; i++) {
          if (sections[i].el.getBoundingClientRect().top - offset <= 0) {
            active = sections[i];
          } else {
            break;
          }
        }
        tocLinks.forEach(function (l) { l.classList.remove('is-current'); });
        if (active) active.link.classList.add('is-current');
      }
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; window.requestAnimationFrame(updateToc); }
      }, { passive: true });
      updateToc();
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (char) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]);
    });
  }

  // Shelf: horizontal-scrolling card rows (Recommended Shelf, Open the Deck
  // Box on table-talk/). The track is a plain overflow-x:auto region, so
  // touch/trackpad/keyboard scrolling all work with zero JS — these
  // prev/next buttons are progressive enhancement for a discoverable click
  // target, and disable themselves at each scroll extreme.
  (function initShelves() {
    document.querySelectorAll('[data-shelf]').forEach(function (shelf) {
      const track = shelf.querySelector('[data-shelf-track]');
      const prev = shelf.querySelector('[data-shelf-prev]');
      const next = shelf.querySelector('[data-shelf-next]');
      if (!track || !prev || !next) return;
      function update() {
        const max = track.scrollWidth - track.clientWidth;
        prev.disabled = track.scrollLeft <= 4;
        next.disabled = max <= 4 || track.scrollLeft >= max - 4;
      }
      function scrollByCard(dir) {
        const card = track.querySelector('.shelf-card');
        const step = (card ? card.getBoundingClientRect().width : 258) + 16;
        track.scrollBy({ left: dir * step, behavior: 'smooth' });
      }
      prev.addEventListener('click', function () { scrollByCard(-1); });
      next.addEventListener('click', function () { scrollByCard(1); });
      track.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    });
  })();

  // Card flavor: a small curated pool of real MTG cards (varied types —
  // creature/instant/sorcery/artifact/enchantment/planeswalker/land, not
  // just lands — see assets/data/flavor-cards.json). Two modes, both on the
  // same [data-flavor] attribute:
  //   - bare `data-flavor` (the Recommended Shelf / Open the Deck Box):
  //     positional — assigned one per element, in document order, from a
  //     counter that only advances for bare elements. Deterministic (same
  //     card every reload), no semantic tie to the linked content.
  //   - `data-flavor="Exact Card Name"` (Table log): that specific card by
  //     name, looked up in the pool — used where the pairing is deliberate
  //     (e.g. the precon post gets its own precon's actual commander).
  // Named elements never consume the positional counter, so adding them
  // anywhere in the page — including before the shelves in document order,
  // as Table log is — can't shift the shelf's own assignments.
  // Reuses the shared RARITY_COLOR/identityStyle/identitySolid helpers and
  // setSymbolHtml() defined above rather than inventing new color/badge
  // logic. If the fetch fails or JS is off, cards just render plain —
  // nothing here is load-bearing.
  (function initFlavorCards() {
    const targets = document.querySelectorAll('[data-flavor]');
    if (!targets.length) return;
    fetch(root + 'assets/data/flavor-cards.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (pool) {
        if (!pool || !pool.length) return;
        const byName = {};
        pool.forEach(function (c) { byName[c.name] = c; });
        let posIndex = 0;
        targets.forEach(function (el) {
          const named = el.dataset.flavor;
          const card = (named && byName[named]) ? byName[named] : pool[(posIndex++) % pool.length];
          el.style.setProperty('--sc-color', identityStyle(card.color_identity));
          el.style.setProperty('--sc-edge', identitySolid(card.color_identity));
          // Domain-absolute, not root-relative: a url() inside a custom
          // property is resolved relative to the STYLESHEET that consumes
          // it (assets/css/styles.css), not the document — root-relative
          // paths here would double up the "assets/" segment. Safe because
          // this site is served from the domain root (custom CNAME domain,
          // not a GitHub project-page subpath).
          el.style.setProperty('--sc-art', 'url("/' + card.art + '")');
          const badge = el.querySelector('[data-flavor-badge]');
          if (badge) badge.innerHTML = setSymbolHtml(card);
          const caption = el.querySelector('[data-flavor-caption]');
          if (caption) caption.textContent = 'Art: ' + card.name + ' · ' + card.set.toUpperCase();
        });
      })
      .catch(function () {});
  })();
}());
