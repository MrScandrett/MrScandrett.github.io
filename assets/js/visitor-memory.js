/* visitor-memory.js — on-device memory for returning visitors.
 *
 * Everything lives in this browser's localStorage. Nothing is sent anywhere, there is
 * no visitor id, and nothing here talks to the network; the profile only reflects what
 * this browser has already seen. That is why it needs no sign-in and no consent banner.
 *
 *   classroomos:memory:v1   lesson history, favorite lessons, saved worksheet answers,
 *                           liked and played showcase projects, the "pause" switch
 *   reader:pos:<book>       written by reader.mjs; read here (never rewritten) to list
 *                           books in progress. "Remove from stats" deletes only that key.
 *
 * Loaded by nav-mobile.js (every page with the site nav), lesson-print-button.js (every
 * lesson), and ui.js (showcase cards). It wires itself up declaratively:
 *
 *   <button data-memory-like="project|lesson" data-memory-id data-memory-title
 *           data-memory-by data-memory-thumb data-memory-url>   heart toggle
 *   <a data-memory-play ...same attributes...>                  "recently played"
 *   <div data-memory-profile>                                   the My Stuff profile
 *   <div data-memory-continue hidden>                           "welcome back" strip
 *
 * Lesson pages also get a heart and a Save answers control beside Print, and a history
 * entry (visits and how far down the page they got).
 */
(function () {
  'use strict';
  if (window.ClassroomOSMemory) return;

  var KEY = 'classroomos:memory:v1';
  var BOOK_PREFIX = 'reader:pos:';
  var CHANGE_EVENT = 'classroomos:memorychange';
  var SESSION_GAP = 30 * 60 * 1000; // a revisit within 30 min is the same visit
  var CAP = { lessons: 150, plays: 60, sheets: 40, fieldChars: 4000, fields: 300 };

  var script = document.currentScript;
  var ROOT = script && script.src ? new URL('../../', script.src) : new URL('/', location.href);

  /* ── Storage ─────────────────────────────────────────────────────── */

  function blank() {
    return { v: 1, paused: false, lessons: {}, favs: {}, sheets: {}, likes: {}, plays: {} };
  }

  function load() {
    var data = null;
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch (e) { data = null; }
    var base = blank();
    if (!data || typeof data !== 'object' || data.v !== 1) return base;
    Object.keys(base).forEach(function (k) {
      if (k === 'v' || k === 'paused') return;
      if (!data[k] || typeof data[k] !== 'object' || Array.isArray(data[k])) data[k] = {};
    });
    data.paused = data.paused === true;
    return data;
  }

  function trim(map, cap, stamp) {
    var keys = Object.keys(map);
    if (keys.length <= cap) return;
    keys.sort(function (a, b) { return (map[b][stamp] || 0) - (map[a][stamp] || 0); });
    keys.slice(cap).forEach(function (k) { delete map[k]; });
  }

  // Every write re-reads first, so two open tabs never clobber each other's entries.
  function update(mutate) {
    var data = load();
    if (mutate(data) === false) return false;
    trim(data.lessons, CAP.lessons, 'last');
    trim(data.plays, CAP.plays, 'at');
    trim(data.sheets, CAP.sheets, 'at');
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      return false; // private mode or storage full
    }
    emit();
    return true;
  }

  var emitQueued = false;
  function emit() {
    if (emitQueued) return;
    emitQueued = true;
    Promise.resolve().then(function () {
      emitQueued = false;
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    });
  }

  window.addEventListener('storage', function (e) {
    if (e.key === null || e.key === KEY || (e.key && e.key.indexOf(BOOK_PREFIX) === 0)) emit();
  });

  /* ── Paths and labels ────────────────────────────────────────────── */

  // Site-relative path ("lessons/music/piano.html"), so entries survive the site moving hosts.
  function sitePath(url) {
    var u;
    try { u = new URL(url, location.href); } catch (e) { return null; }
    if (u.origin !== ROOT.origin || u.pathname.indexOf(ROOT.pathname) !== 0) return null;
    var rel = decodeURIComponent(u.pathname.slice(ROOT.pathname.length));
    if (rel === '' || rel.slice(-1) === '/') rel += 'index.html';
    return rel;
  }

  function siteHref(path) { return new URL(path, ROOT).href; }

  function safeUrl(url) {
    try {
      var u = new URL(url, location.href);
      return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
    } catch (e) { return ''; }
  }

  function clip(text, n) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, n || 140);
  }

  function pageTitle() {
    var t = clip(document.title, 200).replace(/\s+[·|]\s+[^·|]*ClassroomOS.*$/i, '');
    if (!t) {
      var h1 = document.querySelector('main h1, h1');
      t = h1 ? clip(h1.textContent) : '';
    }
    return clip(t) || 'Untitled lesson';
  }

  function moduleLabel(path) {
    var parts = String(path).split('/');
    if (parts[0] !== 'lessons' || parts.length < 3) return '';
    return parts[1].split('-').map(function (w) {
      return w === 'and' ? w : w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  var here = sitePath(location.href);
  var isLesson = Boolean(here && /^lessons\/.+\.html$/.test(here));

  /* ── Public reads ────────────────────────────────────────────────── */

  function byRecent(map, stamp) {
    return Object.keys(map).map(function (id) {
      var rec = Object.assign({}, map[id]);
      rec.id = id;
      return rec;
    }).sort(function (a, b) { return (b[stamp] || 0) - (a[stamp] || 0); });
  }

  function books() {
    var list = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(BOOK_PREFIX) !== 0) continue;
        var pos = null;
        try { pos = JSON.parse(localStorage.getItem(k)); } catch (e) { pos = null; }
        if (!pos || typeof pos !== 'object') continue;
        var id = k.slice(BOOK_PREFIX.length);
        var local = id.indexOf('local:') === 0;
        var href = siteHref('reader.html') + (local
          ? '?file=' + encodeURIComponent(id.slice(6))
          : '?src=' + encodeURIComponent(id));
        list.push({
          id: id,
          t: clip(pos.title) || 'Untitled book',
          p: Math.max(0, Math.min(1, Number(pos.p) || 0)),
          at: Number(pos.at) || 0,
          local: local,
          url: href,
        });
      }
    } catch (e) { /* storage blocked */ }
    return list.sort(function (a, b) { return b.at - a.at; });
  }

  function snapshot() {
    var data = load();
    return {
      paused: data.paused,
      lessons: byRecent(data.lessons, 'last'),
      favs: byRecent(data.favs, 'at'),
      sheets: byRecent(data.sheets, 'at'),
      likes: byRecent(data.likes, 'at'),
      plays: byRecent(data.plays, 'at'),
      books: books(),
    };
  }

  /* ── Likes (projects) and favorites (lessons) ────────────────────── */

  function bucket(kind) { return kind === 'lesson' ? 'favs' : 'likes'; }

  function isLiked(kind, id) {
    var data = load();
    return Boolean(data[bucket(kind)][id]);
  }

  function setLiked(kind, id, on, meta) {
    if (!id) return false;
    meta = meta || {};
    return update(function (data) {
      var map = data[bucket(kind)];
      if (!on) { delete map[id]; return; }
      map[id] = {
        t: clip(meta.title) || id,
        by: clip(meta.by, 80),
        url: kind === 'lesson' ? id : safeUrl(meta.url),
        thumb: kind === 'lesson' ? '' : safeUrl(meta.thumb),
        at: Date.now(),
      };
    });
  }

  function metaFrom(el) {
    return {
      kind: el.getAttribute('data-memory-like') || 'project',
      id: el.getAttribute('data-memory-id') || '',
      title: el.getAttribute('data-memory-title') || '',
      by: el.getAttribute('data-memory-by') || '',
      url: el.getAttribute('data-memory-url') || el.getAttribute('href') || '',
      thumb: el.getAttribute('data-memory-thumb') || '',
    };
  }

  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.7 3.6 4.5 7 4.5c2 0 3.7 1.1 5 2.9 1.3-1.8 3-2.9 5-2.9 3.4 0 5.6 3.2 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z"/></svg>';

  function syncLikeButton(btn, data) {
    var m = metaFrom(btn);
    var on = Boolean((data || load())[bucket(m.kind)][m.id]);
    if (!btn.querySelector('svg')) {
      btn.insertAdjacentHTML('afterbegin', HEART);
      if (btn.hasAttribute('data-memory-label')) {
        var span = document.createElement('span');
        span.className = 'memory-like__label';
        btn.appendChild(span);
      }
    }
    btn.classList.add('memory-like');
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    var verb = m.kind === 'lesson' ? (on ? 'Remove from favorites' : 'Add to favorites') : (on ? 'Unlike' : 'Like');
    var name = m.title ? verb + ': ' + m.title : verb;
    btn.setAttribute('aria-label', name);
    btn.title = m.kind === 'lesson' ? (on ? 'In your favorites' : 'Favorite this lesson') : (on ? 'Liked' : 'Like this project');
    var label = btn.querySelector('.memory-like__label');
    if (label) label.textContent = m.kind === 'lesson' ? (on ? 'Favorited' : 'Favorite') : (on ? 'Liked' : 'Like');
  }

  function syncAllLikes() {
    var data = load();
    document.querySelectorAll('[data-memory-like]').forEach(function (btn) { syncLikeButton(btn, data); });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-memory-like]');
    if (btn) {
      e.preventDefault();
      e.stopPropagation(); // hearts sit on top of card links
      var m = metaFrom(btn);
      var on = btn.getAttribute('aria-pressed') !== 'true';
      if (setLiked(m.kind, m.id, on, m)) {
        btn.classList.remove('memory-like--pop');
        void btn.offsetWidth;
        if (on) btn.classList.add('memory-like--pop');
        announce(on ? (m.kind === 'lesson' ? 'Added to your favorites' : 'Liked') : (m.kind === 'lesson' ? 'Removed from favorites' : 'Unliked'));
      } else {
        announce('This browser is not letting the site save anything right now.');
      }
      return;
    }
    recordPlayFrom(e);
  }, true);

  document.addEventListener('auxclick', function (e) { if (e.button === 1) recordPlayFrom(e); }, true);

  function recordPlayFrom(e) {
    var link = e.target.closest && e.target.closest('a[data-memory-play]');
    if (!link) return;
    var m = metaFrom(link);
    if (!m.id) return;
    update(function (data) {
      if (data.paused) return false;
      var rec = data.plays[m.id] || { n: 0 };
      rec.n = (rec.n || 0) + 1;
      rec.t = clip(m.title) || m.id;
      rec.by = clip(m.by, 80);
      rec.url = safeUrl(link.href);
      rec.thumb = safeUrl(m.thumb);
      rec.at = Date.now();
      data.plays[m.id] = rec;
    });
  }

  /* ── Lesson history ──────────────────────────────────────────────── */

  // How far down the lesson they got. Many lessons (.ll-viewport) lock the window and
  // scroll an inner pane instead, so any scroller big enough to be the main column counts;
  // small ones (code blocks, sidebars, widgets) don't.
  var depth = 0;
  function readDepth(target) {
    var box = target === document || target === document.documentElement || target === document.body ? null : target;
    if (!box) {
      var doc = document.documentElement;
      var total = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
      if (total <= window.innerHeight + 4) return 0;
      return (window.scrollY + window.innerHeight) / total;
    }
    if (!box.clientHeight || box.clientHeight < window.innerHeight * 0.4 || box.clientWidth < window.innerWidth * 0.4) return 0;
    if (box.scrollHeight <= box.clientHeight + 4) return 0;
    return (box.scrollTop + box.clientHeight) / box.scrollHeight;
  }

  function recordVisit() {
    update(function (data) {
      if (data.paused) return false;
      var now = Date.now();
      var rec = data.lessons[here] || { first: now, n: 0, deep: 0 };
      if (!rec.last || now - rec.last > SESSION_GAP) rec.n = (rec.n || 0) + 1;
      rec.last = now;
      rec.t = pageTitle();
      rec.m = moduleLabel(here);
      data.lessons[here] = rec;
    });
  }

  function saveDepth() {
    if (!depth) return;
    var d = Math.round(depth * 100) / 100;
    update(function (data) {
      var rec = data.lessons[here];
      if (data.paused || !rec || (rec.deep || 0) >= d) return false;
      rec.deep = d;
    });
  }

  if (isLesson) {
    recordVisit();
    var depthTick = 0;
    var scrolled = null;
    document.addEventListener('scroll', function (e) {
      scrolled = e.target;
      if (depthTick) return;
      depthTick = requestAnimationFrame(function () {
        depthTick = 0;
        depth = Math.min(1, Math.max(depth, readDepth(scrolled)));
      });
    }, { passive: true, capture: true });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') saveDepth(); });
    window.addEventListener('pagehide', saveDepth);
  }

  /* ── Saved worksheets (answers typed into a lesson) ──────────────── */

  var FIELD_SEL = 'textarea, select, input:not([type]), input[type="text"], input[type="number"], input[type="checkbox"], input[type="radio"]';
  var SKIP_SEL = '[data-memory-ignore], .site-header, .topbar, .nav-settings, .lesson-print-actions, [role="dialog"], [aria-hidden="true"]';

  function worksheetFields() {
    var scope = document.querySelector('main') || document.body;
    return Array.prototype.filter.call(scope.querySelectorAll(FIELD_SEL), function (el) {
      return !el.disabled && !el.readOnly && !el.closest(SKIP_SEL);
    });
  }

  // Answer-shaped fields decide whether a lesson gets the control at all;
  // a page whose only inputs are sim toggles shouldn't offer to "save answers".
  function hasAnswerFields() {
    return worksheetFields().some(function (el) {
      return el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text');
    });
  }

  function fieldKeys(list) {
    var seen = {};
    return list.map(function (el) {
      var base = el.id ? '#' + el.id
        : el.name ? 'n:' + el.name + (el.type === 'radio' || el.type === 'checkbox' ? '=' + el.value : '')
        : 'i:' + el.tagName.toLowerCase() + ':' + (el.type || '');
      seen[base] = (seen[base] || 0) + 1;
      return seen[base] > 1 ? base + '@' + seen[base] : base;
    });
  }

  function readField(el) {
    if (el.type === 'checkbox' || el.type === 'radio') {
      return el.checked === el.defaultChecked ? undefined : (el.checked ? 1 : 0);
    }
    if (el.tagName === 'SELECT') {
      var changed = Array.prototype.some.call(el.options, function (o) { return o.selected !== o.defaultSelected; });
      if (!changed) return undefined;
      return el.multiple
        ? Array.prototype.filter.call(el.options, function (o) { return o.selected; }).map(function (o) { return o.value; })
        : el.value;
    }
    return el.value === el.defaultValue ? undefined : el.value.slice(0, CAP.fieldChars);
  }

  function writeField(el, v) {
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = v === 1;
    else if (el.tagName === 'SELECT' && Array.isArray(v)) {
      Array.prototype.forEach.call(el.options, function (o) { o.selected = v.indexOf(o.value) !== -1; });
    } else el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function captureAnswers() {
    var list = worksheetFields();
    var keys = fieldKeys(list);
    var out = {};
    var count = 0;
    list.forEach(function (el, i) {
      if (count >= CAP.fields) return;
      var v = readField(el);
      if (v === undefined || v === '') return;
      out[keys[i]] = v;
      count++;
    });
    return { fields: out, count: count };
  }

  function saveWorksheet(path, title) {
    var cap = captureAnswers();
    if (!cap.count) return { ok: false, empty: true };
    var ok = update(function (data) {
      data.sheets[path] = { t: clip(title) || path, m: moduleLabel(path), at: Date.now(), n: cap.count, f: cap.fields };
    });
    return { ok: ok, count: cap.count };
  }

  function restoreWorksheet(path) {
    var rec = load().sheets[path];
    if (!rec || !rec.f) return 0;
    var list = worksheetFields();
    var keys = fieldKeys(list);
    var restored = 0;
    list.forEach(function (el, i) {
      if (!Object.prototype.hasOwnProperty.call(rec.f, keys[i])) return;
      writeField(el, rec.f[keys[i]]);
      restored++;
    });
    return restored;
  }

  function forget(bucketName, id) {
    return update(function (data) {
      if (!data[bucketName] || !data[bucketName][id]) return false;
      delete data[bucketName][id];
    });
  }

  function removeBook(id) {
    try { localStorage.removeItem(BOOK_PREFIX + id); } catch (e) { return false; }
    emit();
    return true;
  }

  function setPaused(on) {
    return update(function (data) { data.paused = Boolean(on); });
  }

  function clearAll() {
    try {
      localStorage.removeItem(KEY);
      books().forEach(function (b) { localStorage.removeItem(BOOK_PREFIX + b.id); });
    } catch (e) { return false; }
    emit();
    return true;
  }

  /* ── Shared UI bits ──────────────────────────────────────────────── */

  function ensureStyles() {
    if (document.getElementById('visitor-memory-styles')) return;
    var link = document.createElement('link');
    link.id = 'visitor-memory-styles';
    link.rel = 'stylesheet';
    link.href = new URL('assets/css/components/visitor-memory.css', ROOT).href;
    document.head.appendChild(link);
  }

  var liveRegion = null;
  var toastTimer = 0;
  function announce(message) {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.className = 'memory-toast';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('data-no-print', '');
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = message;
    liveRegion.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { liveRegion.classList.remove('is-visible'); }, 2600);
  }

  var rtf = typeof Intl !== 'undefined' && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }) : null;
  function ago(ts) {
    if (!ts) return '';
    var s = (ts - Date.now()) / 1000;
    var steps = [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']];
    for (var i = 0; i < steps.length; i++) {
      if (Math.abs(s) < steps[i][0]) {
        if (steps[i][1] === 'second') return 'just now';
        return rtf ? rtf.format(Math.round(s), steps[i][1]) : new Date(ts).toLocaleDateString();
      }
      s /= steps[i][0];
    }
    return '';
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function pct(p) { return Math.max(1, Math.round(p * 100)) + '%'; }

  /* ── Lesson toolbar: heart + Save answers ────────────────────────── */

  function mountLessonTools(actions) {
    if (actions.querySelector('.memory-lesson-tools')) return;
    var tools = el('div', 'memory-lesson-tools');

    var heart = el('button', 'memory-like memory-like--toolbar');
    heart.type = 'button';
    heart.setAttribute('data-memory-like', 'lesson');
    heart.setAttribute('data-memory-id', here);
    heart.setAttribute('data-memory-title', pageTitle());
    heart.setAttribute('data-memory-by', moduleLabel(here));
    tools.appendChild(heart);
    syncLikeButton(heart);

    actions.insertBefore(tools, actions.firstChild);
    actions.classList.add('has-memory-tools'); // heart | save | print share one pill

    // Lessons often build their inputs in JS; give them a moment before deciding.
    var tries = 0;
    (function check() {
      if (hasAnswerFields()) tools.appendChild(worksheetControl());
      else if (++tries < 4) setTimeout(check, 600);
    }());
  }

  function worksheetControl() {
    var wrap = el('div', 'memory-sheet');
    var btn = el('button', 'memory-sheet__button');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    var menu = el('div', 'memory-sheet__menu');
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    wrap.append(btn, menu);

    var title = pageTitle();
    // "live": this visit's answers autosave. Off until the student saves or restores,
    // so opening a lesson and typing never silently overwrites last week's answers.
    var live = false;
    var timer = 0;

    function saved() { return load().sheets[here] || null; }

    function render() {
      var rec = saved();
      btn.textContent = '';
      btn.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/></svg>');
      btn.title = live ? 'Saving your answers' : rec ? 'You have saved answers here' : 'Save your answers';
      btn.classList.toggle('is-live', live);
      btn.classList.toggle('has-saved', Boolean(rec) && !live);
      btn.setAttribute('aria-label', live
        ? 'Your answers are saving on this device. Open answer options.'
        : rec ? 'You have saved answers here from ' + ago(rec.at) + '. Open answer options.'
        : 'Save your answers on this lesson');

      menu.textContent = '';
      var items = [];
      if (!live) items.push(['save', rec ? 'Save over with what’s here now' : 'Save my answers', 'Keeps saving as you type, on this device only']);
      if (rec && !live) items.push(['restore', 'Bring back my answers', rec.n + ' answer' + (rec.n === 1 ? '' : 's') + ' · saved ' + ago(rec.at)]);
      if (live) items.push(['save', 'Save now', 'Saved ' + (rec ? ago(rec.at) : 'just now')]);
      if (rec) items.push(['forget', 'Forget saved answers', 'Clears them from this device']);
      items.forEach(function (it) {
        var b = el('button');
        b.type = 'button';
        b.setAttribute('role', 'menuitem');
        b.dataset.action = it[0];
        b.append(el('strong', '', it[1]), el('small', '', it[2]));
        menu.appendChild(b);
      });
    }

    function close() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }

    function save(quiet) {
      var r = saveWorksheet(here, title);
      if (r.empty) { if (!quiet) announce('Nothing filled in yet. Type an answer, then save.'); return false; }
      if (!r.ok) { announce('Couldn’t save. This browser may be full or in private mode.'); return false; }
      if (!quiet) announce('Saved ' + r.count + ' answer' + (r.count === 1 ? '' : 's') + ' on this device.');
      return true;
    }

    btn.addEventListener('click', function () {
      if (!saved() && !live) {
        if (save(false)) { live = true; render(); }
        return;
      }
      render();
      menu.hidden = !menu.hidden;
      btn.setAttribute('aria-expanded', String(!menu.hidden));
      if (!menu.hidden) menu.querySelector('button').focus();
    });

    menu.addEventListener('click', function (e) {
      var item = e.target.closest('[data-action]');
      if (!item) return;
      var action = item.dataset.action;
      close();
      if (action === 'save') { if (save(false)) live = true; }
      else if (action === 'restore') {
        var n = restoreWorksheet(here);
        live = true;
        announce(n ? 'Brought back ' + n + ' answer' + (n === 1 ? '' : 's') + '.' : 'Those answers don’t match this lesson anymore.');
      } else if (action === 'forget') {
        forget('sheets', here);
        live = false;
        announce('Saved answers forgotten.');
      }
      render();
      btn.focus();
    });

    menu.addEventListener('keydown', function (e) {
      var items = Array.prototype.slice.call(menu.querySelectorAll('button'));
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
      }
    });
    wrap.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { close(); btn.focus(); } });
    // composedPath, not contains(): render() rebuilds the button, detaching the clicked span.
    document.addEventListener('click', function (e) { if (e.composedPath().indexOf(wrap) === -1) close(); });

    function onEdit(e) {
      if (!live || !e.target.matches || !e.target.matches(FIELD_SEL) || e.target.closest(SKIP_SEL)) return;
      clearTimeout(timer);
      timer = setTimeout(function () { save(true); }, 700);
    }
    document.addEventListener('input', onEdit, true);
    document.addEventListener('change', onEdit, true);
    window.addEventListener('pagehide', function () { if (live && timer) { clearTimeout(timer); save(true); } });
    window.addEventListener(CHANGE_EVENT, function () { if (!saved() && live) { live = false; } if (menu.hidden) render(); });

    render();
    return wrap;
  }

  function findLessonActions() {
    if (!isLesson) return;
    var found = document.querySelector('.lesson-print-actions');
    if (found) { mountLessonTools(found); return; }
    // lesson-print-button.js places its actions on DOMContentLoaded; wait briefly for it.
    var obs = new MutationObserver(function () {
      var a = document.querySelector('.lesson-print-actions');
      if (a) { obs.disconnect(); mountLessonTools(a); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 6000);
  }

  /* ── Profile ("My Stuff") ────────────────────────────────────────── */

  var SECTION_LIMIT = 5;

  function profileSection(id, title, emptyText, items, renderItem, open) {
    var details = el('details', 'memory-section');
    details.dataset.section = id;
    if (open) details.open = true;
    var summary = el('summary', 'memory-section__summary');
    summary.append(el('span', 'memory-section__title', title), el('span', 'memory-section__count', String(items.length)));
    details.appendChild(summary);

    if (!items.length) {
      details.appendChild(el('p', 'memory-empty', emptyText));
      return details;
    }
    var list = el('ul', 'memory-list');
    items.forEach(function (item, i) {
      var li = renderItem(item);
      if (i >= SECTION_LIMIT) li.hidden = true;
      list.appendChild(li);
    });
    details.appendChild(list);
    if (items.length > SECTION_LIMIT) {
      var more = el('button', 'memory-more', 'Show all ' + items.length);
      more.type = 'button';
      more.addEventListener('click', function () {
        list.querySelectorAll('li[hidden]').forEach(function (li) { li.hidden = false; });
        more.remove();
      });
      details.appendChild(more);
    }
    return details;
  }

  function row(opts) {
    var li = el('li', 'memory-item');
    if (opts.thumb) {
      var img = el('img', 'memory-item__thumb');
      img.src = opts.thumb;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', function () { img.remove(); });
      li.appendChild(img);
    }
    var body = el('div', 'memory-item__body');
    var link = el('a', 'memory-item__link', opts.title);
    link.href = opts.href;
    body.appendChild(link);
    if (opts.meta) body.appendChild(el('span', 'memory-item__meta', opts.meta));
    if (opts.progress != null) {
      var bar = el('span', 'memory-item__bar');
      bar.setAttribute('aria-hidden', 'true');
      var fill = el('span');
      fill.style.width = Math.round(opts.progress * 100) + '%';
      bar.appendChild(fill);
      body.appendChild(bar);
    }
    li.appendChild(body);
    if (opts.onRemove) {
      var x = el('button', 'memory-item__remove');
      x.type = 'button';
      x.setAttribute('aria-label', opts.removeLabel + ': ' + opts.title);
      x.title = opts.removeLabel;
      x.innerHTML = '<span aria-hidden="true">&times;</span>';
      x.addEventListener('click', opts.onRemove);
      li.appendChild(x);
    }
    return li;
  }

  function join() { return Array.prototype.filter.call(arguments, Boolean).join(' · '); }

  function renderProfile(root) {
    var snap = snapshot();
    var openState = {};
    root.querySelectorAll('details[data-section]').forEach(function (d) { openState[d.dataset.section] = d.open; });
    var hadData = Boolean(root.querySelector('details[data-section]'));
    var active = document.activeElement && root.contains(document.activeElement) ? document.activeElement : null;
    var focusKey = active && active.getAttribute('data-focus-key');
    var focusSection = active && active.closest('details[data-section]');
    var focusId = focusSection && focusSection.dataset.section;

    root.textContent = '';

    var reading = snap.books.filter(function (b) { return b.p < 0.99; });
    var finished = snap.books.length - reading.length;

    var empty = !snap.lessons.length && !snap.favs.length && !snap.books.length && !snap.likes.length && !snap.sheets.length && !snap.plays.length;
    var head = el('div', 'memory-head');
    head.appendChild(el('p', 'nav-settings-eyebrow', 'Your activity on this device'));
    var stats = el('dl', 'memory-stats');
    [
      [snap.lessons.length, snap.lessons.length === 1 ? 'lesson explored' : 'lessons explored'],
      [snap.favs.length, snap.favs.length === 1 ? 'favorite' : 'favorites'],
      [reading.length, reading.length === 1 ? 'book going' : 'books going'],
      [snap.likes.length, snap.likes.length === 1 ? 'project liked' : 'projects liked'],
    ].forEach(function (s) {
      var d = el('div', 'memory-stat');
      d.append(el('dt', 'memory-stat__label', s[1]), el('dd', 'memory-stat__n', String(s[0])));
      stats.appendChild(d);
    });
    if (!empty) head.appendChild(stats);
    root.appendChild(head);

    // First visit: one friendly line instead of a wall of zeros and empty lists.
    if (empty) {
      root.appendChild(el('p', 'memory-empty memory-empty--hero', snap.paused
        ? 'Remembering is paused, so nothing new is being added here.'
        : 'Nothing here yet. Open a lesson, start a book in the Library, or heart a project in the Showcase, and it shows up here so you can pick up where you left off.'));
      root.appendChild(privacyBlock(snap));
      return;
    }

    var isOpen = function (id, fallback) { return Object.prototype.hasOwnProperty.call(openState, id) ? openState[id] : fallback; };
    var firstOpen = !hadData;

    function sectionDefault(list) {
      if (firstOpen && list.length) { firstOpen = false; return true; }
      return false;
    }

    var sections = [];

    sections.push(profileSection('history', 'Lesson history', 'Lessons you open will be listed here.', snap.lessons, function (l) {
      var where = l.deep >= 0.95 ? 'read to the end' : l.deep ? pct(l.deep) + ' of the way down' : '';
      return row({
        title: l.t || l.id, href: siteHref(l.id),
        meta: join(l.m, ago(l.last), l.n > 1 ? l.n + ' visits' : '', where),
        removeLabel: 'Remove from history', onRemove: function () { forget('lessons', l.id); },
      });
    }, isOpen('history', sectionDefault(snap.lessons))));

    sections.push(profileSection('favs', 'Favorite lessons', 'Tap the heart on any lesson to keep it here.', snap.favs, function (f) {
      return row({
        title: f.t, href: siteHref(f.url || f.id), meta: join(f.by, 'saved ' + ago(f.at)),
        removeLabel: 'Remove from favorites', onRemove: function () { forget('favs', f.id); },
      });
    }, isOpen('favs', sectionDefault(snap.favs))));

    sections.push(profileSection('books', 'Reading', 'Books you open in the Library reader show up here with your progress.', snap.books, function (b) {
      return row({
        title: b.t, href: b.url, progress: b.p,
        meta: join(b.p >= 0.99 ? 'Finished' : b.p > 0.005 ? pct(b.p) + ' read' : 'Just started', b.local ? 'your file' : '', ago(b.at)),
        removeLabel: 'Remove from stats', onRemove: function () { removeBook(b.id); },
      });
    }, isOpen('books', sectionDefault(snap.books))));

    sections.push(profileSection('sheets', 'Saved worksheets', 'On a lesson with questions, press Save answers and your work is kept here.', snap.sheets, function (s) {
      return row({
        title: s.t, href: siteHref(s.id),
        meta: join(s.m, s.n + ' answer' + (s.n === 1 ? '' : 's'), 'saved ' + ago(s.at)),
        removeLabel: 'Forget saved answers', onRemove: function () { forget('sheets', s.id); },
      });
    }, isOpen('sheets', sectionDefault(snap.sheets))));

    sections.push(profileSection('likes', 'Liked showcase projects', 'Heart a game or project in the Showcase to keep it here.', snap.likes, function (p) {
      return row({
        title: p.t, href: p.url || siteHref('showcase.html'), thumb: p.thumb, meta: join(p.by, 'liked ' + ago(p.at)),
        removeLabel: 'Unlike', onRemove: function () { setLiked('project', p.id, false); },
      });
    }, isOpen('likes', sectionDefault(snap.likes))));

    sections.push(profileSection('plays', 'Recently played', 'Games and projects you launch from the Showcase.', snap.plays, function (p) {
      return row({
        title: p.t, href: p.url || siteHref('showcase.html'), thumb: p.thumb,
        meta: join(p.by, ago(p.at), p.n > 1 ? 'played ' + p.n + ' times' : ''),
        removeLabel: 'Remove from recently played', onRemove: function () { forget('plays', p.id); },
      });
    }, isOpen('plays', sectionDefault(snap.plays))));

    sections.forEach(function (s) { root.appendChild(s); });

    if (finished) {
      root.querySelector('[data-section="books"] .memory-section__count').textContent = reading.length + (finished ? ' + ' + finished + ' done' : '');
    }

    root.appendChild(privacyBlock(snap));

    // Re-rendering replaces every node; put keyboard focus back where it was, or, when a
    // removed row's button is gone, on the next row in the same section.
    var keyed = focusKey && root.querySelector('[data-focus-key="' + focusKey + '"]');
    if (keyed) keyed.focus();
    else if (focusId) {
      var target = root.querySelector('[data-section="' + focusId + '"] .memory-item__remove') ||
        root.querySelector('[data-section="' + focusId + '"] summary');
      if (target) target.focus();
    }
  }

  function privacyBlock(snap) {
    var box = el('div', 'memory-privacy');
    box.appendChild(el('p', 'nav-settings-note', 'All of this stays in this browser. Nothing is sent anywhere, and there’s no account. On a shared computer, the next person sees it too.'));

    var pause = el('label', 'memory-switch');
    var cb = el('input');
    cb.type = 'checkbox';
    cb.setAttribute('data-focus-key', 'pause');
    cb.checked = !snap.paused;
    cb.addEventListener('change', function () {
      setPaused(!cb.checked);
      announce(cb.checked ? 'Remembering lessons and games again.' : 'Paused. New visits won’t be added.');
    });
    pause.append(cb, el('span', '', 'Remember lessons I open and games I play'));
    box.appendChild(pause);

    var clear = el('button', 'memory-clear', 'Clear all my activity');
    clear.type = 'button';
    clear.setAttribute('data-focus-key', 'clear');
    var armed = 0;
    clear.addEventListener('click', function () {
      if (!armed) {
        clear.textContent = 'Tap again to clear everything';
        clear.classList.add('is-armed');
        armed = setTimeout(function () { armed = 0; clear.textContent = 'Clear all my activity'; clear.classList.remove('is-armed'); }, 4000);
        return;
      }
      clearTimeout(armed);
      armed = 0;
      clearAll();
      announce('Activity cleared from this device.');
    });
    box.appendChild(clear);
    box.appendChild(el('p', 'memory-fineprint', 'Clearing removes history, favorites, likes, saved answers and reading places. Bookmarks and notes inside books, and game high scores, are kept.'));
    return box;
  }

  /* ── "Welcome back" strip ────────────────────────────────────────── */

  function renderContinue(root) {
    var snap = snapshot();
    var picks = [];
    var lesson = snap.lessons[0];
    if (lesson) picks.push({ kind: 'Lesson', title: lesson.t, href: siteHref(lesson.id), meta: lesson.deep && lesson.deep < 0.95 ? pct(lesson.deep) + ' through' : ago(lesson.last) });
    var book = snap.books.filter(function (b) { return b.p < 0.99; })[0];
    if (book) picks.push({ kind: 'Reading', title: book.t, href: book.url, meta: pct(book.p) + ' read', progress: book.p });
    var play = snap.plays[0];
    if (play && play.url) picks.push({ kind: 'Played', title: play.t, href: play.url, meta: ago(play.at) });

    root.textContent = '';
    root.hidden = !picks.length;
    if (!picks.length) return;
    root.classList.add('memory-continue');
    root.setAttribute('aria-label', 'Pick up where you left off');
    root.appendChild(el('p', 'memory-continue__eyebrow', 'Welcome back — pick up where you left off'));
    var list = el('ul', 'memory-continue__list');
    picks.forEach(function (p) {
      var li = el('li');
      var a = el('a', 'memory-continue__card');
      a.href = p.href;
      a.append(el('span', 'memory-continue__kind', p.kind), el('strong', '', p.title), el('span', 'memory-continue__meta', p.meta));
      if (p.progress != null) {
        var bar = el('span', 'memory-item__bar');
        bar.setAttribute('aria-hidden', 'true');
        var fill = el('span');
        fill.style.width = Math.round(p.progress * 100) + '%';
        bar.appendChild(fill);
        a.appendChild(bar);
      }
      li.appendChild(a);
      list.appendChild(li);
    });
    root.appendChild(list);
  }

  /* ── Wiring ──────────────────────────────────────────────────────── */

  var mounts = [];
  function mountAll(scope) {
    var s = scope || document;
    var nodes = [];
    if (s.matches) {
      if (s.matches('[data-memory-profile], [data-memory-continue]')) nodes.push(s);
    }
    Array.prototype.push.apply(nodes, s.querySelectorAll ? s.querySelectorAll('[data-memory-profile], [data-memory-continue]') : []);
    nodes.forEach(function (node) {
      if (node.__memoryMounted) return;
      node.__memoryMounted = true;
      var fn = node.hasAttribute('data-memory-profile') ? renderProfile : renderContinue;
      mounts.push({ node: node, fn: fn });
      fn(node);
    });
    if (s.querySelectorAll) {
      var data = null;
      var likes = s.matches && s.matches('[data-memory-like]') ? [s] : [];
      Array.prototype.push.apply(likes, s.querySelectorAll('[data-memory-like]'));
      likes.forEach(function (btn) { syncLikeButton(btn, data || (data = load())); });
    }
  }

  window.addEventListener(CHANGE_EVENT, function () {
    syncAllLikes();
    mounts = mounts.filter(function (m) { return m.node.isConnected; });
    mounts.forEach(function (m) { m.fn(m.node); });
  });

  function start() {
    ensureStyles();
    mountAll(document);
    findLessonActions();
    var pending = [];
    var queued = false;
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        r.addedNodes.forEach(function (n) { if (n.nodeType === 1) pending.push(n); });
      });
      if (queued || !pending.length) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        var batch = pending;
        pending = [];
        batch.forEach(function (n) { if (n.isConnected) mountAll(n); });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.ClassroomOSMemory = {
    snapshot: snapshot,
    isLiked: isLiked,
    setLiked: setLiked,
    forget: forget,
    removeBook: removeBook,
    setPaused: setPaused,
    clearAll: clearAll,
    saveWorksheet: saveWorksheet,
    restoreWorksheet: restoreWorksheet,
    sitePath: sitePath,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}());
