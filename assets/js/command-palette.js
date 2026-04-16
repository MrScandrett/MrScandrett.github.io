/* ================================================================
   ClassroomOS — Global Command Palette
   Trigger: Cmd+K (Mac) / Ctrl+K (Win/Linux)
   Self-contained: injects own CSS & DOM, fetches search-index.json
   ================================================================ */
(function () {
  'use strict';

  // ── Path detection ──────────────────────────────────────────────
  var path = location.pathname;
  var depth = (path.match(/\//g) || []).length;
  // Lessons are at /lessons/filename.html (depth 2 from root)
  var isSubdir = path.includes('/lessons/') || path.includes('/projects/');
  var BASE = isSubdir ? '../' : '';

  // ── State ───────────────────────────────────────────────────────
  var isOpen = false;
  var index = [];
  var filtered = [];
  var activeIdx = -1;
  var loaded = false;

  // ── CSS ─────────────────────────────────────────────────────────
  var css = `
  #cp-overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    align-items: flex-start;
    justify-content: center;
    padding-top: 12vh;
    box-sizing: border-box;
  }
  #cp-overlay.cp-open {
    display: flex;
    animation: cpFadeIn 0.15s ease;
  }
  @keyframes cpFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  #cp-modal {
    width: 100%;
    max-width: 600px;
    max-height: 70vh;
    background: rgba(18, 18, 28, 0.96);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    animation: cpSlideIn 0.18s cubic-bezier(0.34,1.2,0.64,1);
    margin: 0 1rem;
  }
  @keyframes cpSlideIn {
    from { transform: translateY(-12px) scale(0.97); opacity: 0; }
    to   { transform: translateY(0) scale(1); opacity: 1; }
  }
  #cp-input-wrap {
    display: flex;
    align-items: center;
    padding: 0 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    gap: 0.6rem;
    flex-shrink: 0;
  }
  #cp-search-icon {
    color: rgba(255,255,255,0.4);
    font-size: 1rem;
    flex-shrink: 0;
  }
  #cp-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #f0f4ff;
    font-size: 1.05rem;
    font-family: inherit;
    padding: 1rem 0;
    caret-color: #007aff;
  }
  #cp-input::placeholder {
    color: rgba(255,255,255,0.3);
  }
  #cp-clear {
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(255,255,255,0.35);
    font-size: 1.1rem;
    line-height: 1;
    padding: 4px 6px;
    border-radius: 6px;
    display: none;
    transition: color 0.15s, background 0.15s;
  }
  #cp-clear:hover {
    color: rgba(255,255,255,0.7);
    background: rgba(255,255,255,0.08);
  }
  #cp-results {
    overflow-y: auto;
    flex: 1;
    padding: 0.4rem 0;
    scroll-behavior: smooth;
  }
  #cp-results::-webkit-scrollbar { width: 4px; }
  #cp-results::-webkit-scrollbar-track { background: transparent; }
  #cp-results::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
  .cp-group-label {
    font-size: 0.67rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.35);
    padding: 0.65rem 1rem 0.25rem;
  }
  .cp-group-label:first-child {
    padding-top: 0.35rem;
  }
  .cp-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 1rem;
    cursor: pointer;
    border-radius: 0;
    transition: background 0.1s;
    text-decoration: none;
    color: inherit;
  }
  .cp-item:hover,
  .cp-item.cp-active {
    background: rgba(255,255,255,0.07);
  }
  .cp-item.cp-active {
    background: rgba(0, 122, 255, 0.18);
  }
  .cp-item-icon {
    font-size: 1.1rem;
    width: 1.8rem;
    text-align: center;
    flex-shrink: 0;
    line-height: 1;
  }
  .cp-item-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .cp-item-title {
    font-size: 0.92rem;
    font-weight: 500;
    color: #eef2ff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cp-item-title mark {
    background: transparent;
    color: #60a5fa;
    font-weight: 700;
  }
  .cp-item-desc {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.42);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 0.05rem;
  }
  .cp-item-arrow {
    color: rgba(255,255,255,0.2);
    font-size: 0.85rem;
    flex-shrink: 0;
    transition: color 0.1s;
  }
  .cp-item.cp-active .cp-item-arrow {
    color: rgba(255,255,255,0.55);
  }
  #cp-empty {
    padding: 2.5rem 1rem;
    text-align: center;
    color: rgba(255,255,255,0.3);
    font-size: 0.9rem;
  }
  #cp-footer {
    flex-shrink: 0;
    border-top: 1px solid rgba(255,255,255,0.07);
    padding: 0.5rem 1rem;
    display: flex;
    gap: 1.2rem;
    align-items: center;
  }
  .cp-hint {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.28);
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .cp-hint kbd {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 4px;
    padding: 1px 5px;
    font-family: inherit;
    font-size: 0.68rem;
  }
  #cp-trigger-hint {
    margin-left: auto;
    font-size: 0.69rem;
    color: rgba(255,255,255,0.18);
  }
  @media (max-width: 480px) {
    #cp-modal { max-height: 85vh; }
    #cp-input { font-size: 0.95rem; }
    #cp-footer { gap: 0.7rem; }
    .cp-hint:not(:first-child):not(:last-child) { display: none; }
  }
  `;

  // ── Inject CSS ──────────────────────────────────────────────────
  var styleEl = document.createElement('style');
  styleEl.id = 'cp-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Build DOM ───────────────────────────────────────────────────
  var overlay = document.createElement('div');
  overlay.id = 'cp-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Command Palette');
  overlay.innerHTML = `
    <div id="cp-modal">
      <div id="cp-input-wrap">
        <span id="cp-search-icon" aria-hidden="true">⌕</span>
        <input id="cp-input" type="text" placeholder="Search lessons, topics, pages…" autocomplete="off" spellcheck="false" aria-label="Search lessons, topics, and pages" />
        <button id="cp-clear" aria-label="Clear search">✕</button>
      </div>
      <div id="cp-results" role="listbox" aria-label="Search results"></div>
      <div id="cp-footer">
        <span class="cp-hint"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span class="cp-hint"><kbd>↵</kbd> open</span>
        <span class="cp-hint"><kbd>esc</kbd> close</span>
        <span id="cp-trigger-hint">⌘K</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  var inputEl   = document.getElementById('cp-input');
  var clearBtn  = document.getElementById('cp-clear');
  var resultsEl = document.getElementById('cp-results');

  // ── Load Index ──────────────────────────────────────────────────
  function loadIndex() {
    if (loaded) return;
    loaded = true;
    fetch(BASE + 'assets/data/search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        index = data;
        var q = inputEl.value.trim();
        if (q) search(q); else renderDefaults();
      })
      .catch(function () {
        resultsEl.innerHTML = '<div id="cp-empty">Search index unavailable.</div>';
      });
  }

  // ── Open / Close ────────────────────────────────────────────────
  function open() {
    isOpen = true;
    overlay.classList.add('cp-open');
    loadIndex();
    setTimeout(function () { inputEl.focus(); }, 30);
    document.body.style.overflow = 'hidden';
  }

  function close() {
    isOpen = false;
    overlay.classList.remove('cp-open');
    inputEl.value = '';
    clearBtn.style.display = 'none';
    activeIdx = -1;
    document.body.style.overflow = '';
  }

  // ── Search ──────────────────────────────────────────────────────
  function score(item, q) {
    var t = item.title.toLowerCase();
    var d = item.description.toLowerCase();
    var k = (item.keywords || []).join(' ').toLowerCase();
    if (t.includes(q)) return 3;
    if (k.includes(q)) return 2;
    if (d.includes(q)) return 1;
    // Fuzzy: all chars of q appear in title in order
    var ci = 0;
    for (var i = 0; i < t.length && ci < q.length; i++) {
      if (t[i] === q[ci]) ci++;
    }
    if (ci === q.length) return 0.5;
    return 0;
  }

  function highlightTitle(title, q) {
    if (!q) return escHtml(title);
    var lower = title.toLowerCase();
    var lq = q.toLowerCase();
    var idx = lower.indexOf(lq);
    if (idx === -1) return escHtml(title);
    return escHtml(title.slice(0, idx)) +
      '<mark>' + escHtml(title.slice(idx, idx + q.length)) + '</mark>' +
      escHtml(title.slice(idx + q.length));
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) {
      renderDefaults();
      return;
    }
    filtered = index
      .map(function (item) { return { item: item, s: score(item, q) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .map(function (x) { return x.item; });

    renderResults(filtered, q);
  }

  // ── Render ───────────────────────────────────────────────────────
  var CATEGORY_ORDER = [
    'Pages', 'Mathematics', 'Physics', 'Chemistry',
    'Life Sciences', 'Earth Science', 'Cosmology',
    'Engineering', 'Computer Science',
    'Applied Physics & Material Science',
    'Visual Perception & Design', 'Complex Systems & Humanities'
  ];

  function renderDefaults() {
    // Show pages + a few top lessons
    var pages = index.filter(function (i) { return i.category === 'Pages'; });
    var recent = index.filter(function (i) { return i.category !== 'Pages'; }).slice(0, 8);
    var html = '';
    if (pages.length) {
      html += '<div class="cp-group-label">Pages</div>';
      pages.forEach(function (item) { html += renderItem(item, ''); });
    }
    if (recent.length) {
      html += '<div class="cp-group-label">All Lessons</div>';
      recent.forEach(function (item) { html += renderItem(item, ''); });
    }
    resultsEl.innerHTML = html || '<div id="cp-empty">No results.</div>';
    activeIdx = -1;
    bindItemClicks();
  }

  function renderResults(items, q) {
    if (!items.length) {
      resultsEl.innerHTML = '<div id="cp-empty">No results for "' + escHtml(q) + '"</div>';
      activeIdx = -1;
      return;
    }

    // Group by category
    var groups = {};
    var order = [];
    items.forEach(function (item) {
      var cat = item.category;
      if (!groups[cat]) {
        groups[cat] = [];
        order.push(cat);
      }
      groups[cat].push(item);
    });

    // Sort groups by canonical order
    order.sort(function (a, b) {
      var ai = CATEGORY_ORDER.indexOf(a);
      var bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1) ai = 99;
      if (bi === -1) bi = 99;
      return ai - bi;
    });

    var html = '';
    order.forEach(function (cat) {
      html += '<div class="cp-group-label">' + escHtml(cat) + '</div>';
      groups[cat].forEach(function (item) { html += renderItem(item, q); });
    });

    resultsEl.innerHTML = html;
    activeIdx = -1;
    bindItemClicks();
  }

  function renderItem(item, q) {
    var url = BASE + item.url;
    return '<a class="cp-item" href="' + url + '" role="option" data-url="' + url + '">' +
      '<span class="cp-item-icon" aria-hidden="true">' + item.icon + '</span>' +
      '<span class="cp-item-body">' +
        '<span class="cp-item-title">' + highlightTitle(item.title, q) + '</span>' +
        '<span class="cp-item-desc">' + escHtml(item.description) + '</span>' +
      '</span>' +
      '<span class="cp-item-arrow" aria-hidden="true">→</span>' +
    '</a>';
  }

  function bindItemClicks() {
    var items = resultsEl.querySelectorAll('.cp-item');
    filtered = Array.prototype.map.call(items, function (el) {
      return { url: el.getAttribute('data-url') };
    });
  }

  // ── Keyboard navigation ─────────────────────────────────────────
  function getItems() {
    return resultsEl.querySelectorAll('.cp-item');
  }

  function setActive(idx) {
    var items = getItems();
    if (!items.length) return;
    activeIdx = Math.max(0, Math.min(idx, items.length - 1));
    items.forEach(function (el, i) {
      el.classList.toggle('cp-active', i === activeIdx);
    });
    items[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  function navigateActive() {
    var items = getItems();
    if (activeIdx >= 0 && items[activeIdx]) {
      window.location.href = items[activeIdx].getAttribute('href');
      close();
    }
  }

  // ── Events ───────────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    var key = e.key;
    if ((e.metaKey || e.ctrlKey) && key === 'k') {
      e.preventDefault();
      isOpen ? close() : open();
      return;
    }
    if (!isOpen) return;
    if (key === 'Escape') { e.preventDefault(); close(); }
    else if (key === 'ArrowDown') { e.preventDefault(); setActive(activeIdx + 1); }
    else if (key === 'ArrowUp')   { e.preventDefault(); setActive(activeIdx === -1 ? getItems().length - 1 : activeIdx - 1); }
    else if (key === 'Enter')     { e.preventDefault(); navigateActive(); }
  });

  inputEl.addEventListener('input', function () {
    var q = inputEl.value;
    clearBtn.style.display = q ? 'block' : 'none';
    search(q);
  });

  clearBtn.addEventListener('click', function () {
    inputEl.value = '';
    clearBtn.style.display = 'none';
    inputEl.focus();
    renderDefaults();
  });

  // Close on overlay click (outside modal)
  overlay.addEventListener('mousedown', function (e) {
    if (e.target === overlay) close();
  });

  // ── Trigger hint: Mac vs PC ──────────────────────────────────────
  var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
  var hint = document.getElementById('cp-trigger-hint');
  if (hint) hint.textContent = isMac ? '⌘K' : 'Ctrl+K';

})();
