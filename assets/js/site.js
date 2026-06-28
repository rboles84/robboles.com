
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
