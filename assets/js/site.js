
(function () {
  const body = document.body;
  const root = body ? body.dataset.root || '' : '';

  const navToggle = document.querySelector('[data-nav-toggle]');
  const siteNav = document.querySelector('[data-site-nav]');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      const open = siteNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

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

  const subscribeForm = document.querySelector('[data-subscribe-form]');
  const subscribeConfirm = document.querySelector('[data-subscribe-confirm]');
  if (subscribeForm && subscribeConfirm) {
    subscribeForm.addEventListener('submit', function (event) {
      event.preventDefault();
      subscribeForm.classList.add('is-hidden');
      subscribeConfirm.classList.remove('is-hidden');
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
    fetch(root + 'assets/data/table-talk-cards.json')
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
    let pop = null;
    let hoverTimer = null;
    let hideTimer = null;
    let current = null;
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
}());
