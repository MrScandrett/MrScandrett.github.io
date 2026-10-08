// Bible quick link for lessons: the class Bible (bible.html) one click away from any lesson.
//
//   <script src="../../assets/js/bible-quicklink.js"></script>   (path relative to the lesson)
//
// - Adds a "Bible" pill beside the heart | save | print pill (lesson-print-button.js), or a
//   floating button when the page has no site header. It looks up a passage, continues where
//   this browser left off in the reader, and opens the lesson's own book.
// - Turns scripture references in the lesson's text ("Daniel 2:31–45", "1 Kings 18",
//   "Isaiah 1:10–20; 6:1–8") into links. A click opens the passage in a large, centred
//   peek panel (made for showing a class) with a link on to the full reader, so the lesson
//   and any typed answers stay put. Ctrl/Cmd/middle-click still opens bible.html directly.
// - Any <a data-bible-ref href="…bible.html#/go/John 3:16"> (or #/read/<slug>/<ch>/<v>) gets
//   the same peek, which is how lesson scripts link to a passage they build at runtime.
//
// Opt out per element with data-bible-ref-skip; name the lesson's book with
// <body data-bible-book="Daniel"> (otherwise it's the book the page cites most).
// Reads the reader's progress (bible:progress:v1, reader:pos:bible.html) but never writes it.
(function () {
  'use strict';
  if (window.ClassroomOSBible) return;

  var script = document.currentScript;
  var base = script && script.src ? new URL('../../', script.src) : new URL('/', location.href);
  var BIBLE = new URL('bible.html', base).href;
  var DATA = new URL('assets/data/bible/', base).href;
  var KEY = 'bible:progress:v1';
  var POS_KEY = 'reader:pos:bible.html';
  // Names that are also everyday words or common first names: link them only as chapter:verse.
  var VERSE_ONLY = { Job: 1, Mark: 1, Numbers: 1, Acts: 1, Judges: 1, Song: 1, James: 1, Jude: 1, Ruth: 1, Joel: 1, Amos: 1 };
  var SKIP = 'a,button,label,select,option,textarea,input,script,style,noscript,svg,code,pre,kbd,summary,' +
    'h1,h2,h3,h4,h5,h6,figcaption,dialog,[aria-live],[role="status"],[role="button"],[role="tab"],' +
    '[role="menuitem"],[contenteditable],[data-bible-ref-skip],.bq-actions';

  var meta = null;
  var metaPromise = null;
  var aliases = new Map();
  var bySlug = new Map();
  var refPattern = null;

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'className') node.className = attrs[k];
      else if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.append(c); });
    return node;
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* ── Book names (assets/data/bible/books.json, shared with the reader) ── */
  var norm = function (s) {
    return String(s).toLowerCase().replace(/([a-z])\./g, '$1').replace(/[^a-z0-9: \-–]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  function loadMeta() {
    if (!metaPromise) {
      metaPromise = fetch(DATA + 'books.json').then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (data) {
        meta = data;
        var names = [];
        var roman = { 1: 'i', 2: 'ii', 3: 'iii' };
        data.books.forEach(function (b) {
          bySlug.set(b.slug, b);
          [b.name, b.slug.replace(/-/g, ' '), b.short].concat(b.aliases).forEach(function (raw) {
            var k = norm(raw);
            aliases.set(k, b);
            var m = k.match(/^([123]) (.+)$/);
            if (m) { aliases.set(m[1] + m[2], b); aliases.set(roman[m[1]] + ' ' + m[2], b); }
          });
          names.push({ text: b.name, book: b, full: true });
          if (b.short !== b.name) names.push({ text: b.short, book: b, full: false });
        });
        names.push({ text: 'Psalm', book: aliases.get('psalm'), full: true });
        names.push({ text: 'Song of Songs', book: aliases.get('song of songs'), full: true });
        names.sort(function (a, b) { return b.text.length - a.text.length; });
        refPattern = {
          names: names,
          // Book, chapter, then :verse[–verse] or –chapter. Case-sensitive: book names are capitalised.
          re: new RegExp('(^|[^\\w])(' + names.map(function (n) { return escapeRe(n.text).replace(/ /g, '[ \\u00a0]'); }).join('|') +
            ')\\.?[ \\u00a0](\\d{1,3})(?::(\\d{1,3})(?:[–-](\\d{1,3}))?|[–-](\\d{1,3}))?(?![\\w:])', 'g'),
          // "; 6:1–8" after a reference continues in the same book.
          more: /^;[  ]*(\d{1,3}):(\d{1,3})(?:[–-](\d{1,3}))?(?![\w:])/,
        };
        return data;
      });
      metaPromise.catch(function () { metaPromise = null; });
    }
    return metaPromise;
  }

  function findBook(text) {
    var k = norm(text);
    if (aliases.has(k)) return aliases.get(k);
    var flat = k.replace(/ /g, '');
    var hits = meta.books.filter(function (b) { return norm(b.name).replace(/ /g, '').indexOf(flat) === 0; });
    return hits.length === 1 ? hits[0] : null;
  }

  // "John 3:16", "1 jn 4", "Ps 23:1-3", "gen" → { book, ch, v1, v2 } (ch 0 = whole book)
  function parseRef(text) {
    var m = norm(text).match(/^((?:[123] ?)?[a-z][a-z ]*?) ?(?:(\d+)(?: ?: ?(\d+)(?: ?[-–] ?(\d+))?)?)?$/);
    if (!m) return null;
    var book = findBook(m[1]);
    if (!book) return null;
    var ch = m[2] ? Math.min(Math.max(1, Number(m[2])), book.verses.length) : 0;
    return { book: book, ch: ch, v1: m[3] ? Number(m[3]) : 0, v2: m[4] ? Number(m[4]) : 0 };
  }

  // bible.html#/go/<reference> or #/read/<slug>/<ch>[/<v1>[-<v2>]] → ref
  function refFromHref(href) {
    var hash = String(href).split('#')[1] || '';
    var parts = hash.replace(/^\/?/, '').split('/').filter(Boolean).map(function (p) {
      try { return decodeURIComponent(p); } catch (e) { return p; }
    });
    if (parts[0] === 'go') return parseRef(parts.slice(1).join(' '));
    if (parts[0] === 'read' && bySlug.has(parts[1])) {
      var book = bySlug.get(parts[1]);
      var vv = (parts[3] || '').split('-');
      return { book: book, ch: Math.min(Math.max(1, Number(parts[2]) || 1), book.verses.length), v1: Number(vv[0]) || 0, v2: Number(vv[1]) || 0 };
    }
    if (parts[0] === 'book' && bySlug.has(parts[1])) return { book: bySlug.get(parts[1]), ch: 1, v1: 0, v2: 0 };
    return null;
  }

  function refLabel(ref) {
    var s = ref.book.name + ' ' + ref.ch;
    if (ref.v1) s += ':' + ref.v1 + (ref.v2 > ref.v1 ? '–' + ref.v2 : '');
    return s;
  }

  function readerHref(ref) {
    if (!ref.ch) return BIBLE + '#/book/' + ref.book.slug;
    return BIBLE + '#/read/' + ref.book.slug + '/' + ref.ch + (ref.v1 ? '/' + ref.v1 + (ref.v2 > ref.v1 ? '-' + ref.v2 : '') : '');
  }

  /* ── Linking references in the lesson text ─────────────────────────── */
  var cited = new Map(); // slug → times the page cites the book

  function validRef(book, ch, v1, v2) {
    if (!book || ch < 1 || ch > book.verses.length) return null;
    var max = book.verses[ch - 1];
    if (v1 && v1 > max) return null;
    return { book: book, ch: ch, v1: v1 || 0, v2: v2 && v1 && v2 > v1 ? Math.min(v2, max) : 0 };
  }

  function refLink(ref, text) {
    cited.set(ref.book.slug, (cited.get(ref.book.slug) || 0) + 1);
    return el('a', {
      className: 'bq-ref', href: readerHref(ref), 'data-bible-ref': '',
      title: 'Read ' + refLabel(ref) + ' in the class Bible', text: text,
    });
  }

  function linkTextNode(node) {
    var text = node.nodeValue;
    var re = refPattern.re;
    re.lastIndex = 0;
    var out = [];
    var last = 0;
    var m;
    while ((m = re.exec(text))) {
      var start = m.index + m[1].length;
      var entry = refPattern.names.find(function (n) { return n.text === m[2].replace(/ /g, ' '); });
      if (!entry || !entry.book) continue;
      var v1 = m[4] ? Number(m[4]) : 0;
      if (!v1 && (!entry.full || VERSE_ONLY[entry.text])) continue;
      var ref = validRef(entry.book, Number(m[3]), v1, m[5] ? Number(m[5]) : 0);
      if (!ref) continue;
      if (start > last) out.push(document.createTextNode(text.slice(last, start)));
      out.push(refLink(ref, text.slice(start, re.lastIndex)));
      last = re.lastIndex;
      var rest;
      while ((rest = refPattern.more.exec(text.slice(last)))) {
        var lead = rest[0].indexOf(rest[1]);
        var next = validRef(entry.book, Number(rest[1]), Number(rest[2]), rest[3] ? Number(rest[3]) : 0);
        if (!next) break;
        out.push(document.createTextNode(text.slice(last, last + lead)));
        out.push(refLink(next, rest[0].slice(lead)));
        last += rest[0].length;
      }
      re.lastIndex = last;
    }
    if (!out.length) return;
    if (last < text.length) out.push(document.createTextNode(text.slice(last)));
    node.replaceWith.apply(node, out);
  }

  function linkReferences() {
    var root = document.querySelector('main') || document.body;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!/\d/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        return n.parentElement && !n.parentElement.closest(SKIP) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(linkTextNode);
  }

  /* ── Passage peek (a dialog over the lesson) ───────────────────────── */
  var textCache = new Map();
  function loadText(code, slug) {
    var key = code + '/' + slug;
    if (!textCache.has(key)) {
      var p = fetch(DATA + key + '.json').then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
      p.catch(function () { textCache.delete(key); });
      textCache.set(key, p);
    }
    return textCache.get(key);
  }

  var peek = null;
  var current = null;      // ref on screen
  var wholeChapter = false;
  var tr = null;

  function translation() {
    if (!tr) {
      var saved = read(KEY);
      tr = saved && typeof saved.tr === 'string' ? saved.tr : 'bsb';
    }
    return meta.translations.find(function (t) { return t.code === tr; }) || meta.translations[0];
  }

  function buildPeek() {
    var select = el('select', { className: 'bq-tr', 'aria-label': 'Translation' });
    meta.translations.forEach(function (t) { select.append(el('option', { value: t.code, text: t.label + ' · ' + t.name })); });
    var dialog = el('dialog', { className: 'bq-peek', 'aria-labelledby': 'bq-peek-title', 'data-no-print': '' }, [
      el('div', { className: 'bq-peek-head' }, [
        el('div', {}, [
          el('p', { className: 'bq-peek-kicker', text: 'The Holy Bible' }),
          el('h2', { id: 'bq-peek-title' }),
        ]),
        select,
        el('button', { type: 'button', className: 'bq-peek-close', 'aria-label': 'Close the passage', text: '×' }),
      ]),
      el('div', { className: 'bq-peek-body', tabindex: '0', role: 'region', 'aria-label': 'Passage text' }),
      el('div', { className: 'bq-peek-foot' }, [
        el('button', { type: 'button', className: 'bq-btn', 'data-step': '-1', text: '‹ Previous chapter' }),
        el('button', { type: 'button', className: 'bq-btn', 'data-whole': '', text: 'Show the whole chapter' }),
        el('button', { type: 'button', className: 'bq-btn', 'data-step': '1', text: 'Next chapter ›' }),
        el('a', { className: 'bq-btn bq-btn--primary', 'data-open': '', text: 'Open in the Bible reader →' }),
      ]),
      el('p', { className: 'bq-peek-credit' }),
    ]);
    select.addEventListener('change', function () { tr = select.value; render(); });
    dialog.querySelector('.bq-peek-close').addEventListener('click', function () { dialog.close(); });
    dialog.querySelector('[data-whole]').addEventListener('click', function () { wholeChapter = true; render(); });
    dialog.querySelectorAll('[data-step]').forEach(function (b) {
      b.addEventListener('click', function () {
        var ch = current.ch + Number(b.dataset.step);
        if (ch < 1 || ch > current.book.verses.length) return;
        current = { book: current.book, ch: ch, v1: 0, v2: 0 };
        render();
      });
    });
    // Click on the backdrop closes it.
    dialog.addEventListener('click', function (e) {
      if (e.target !== dialog) return;
      var r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    });
    document.body.append(dialog);
    return dialog;
  }

  function render() {
    var ref = current;
    var t = translation();
    var focus = ref.v1 && !wholeChapter;
    peek.querySelector('#bq-peek-title').textContent = focus ? refLabel(ref) : ref.book.name + ' ' + ref.ch;
    peek.querySelector('.bq-tr').value = t.code;
    peek.querySelector('[data-open]').href = readerHref(ref);
    peek.querySelector('[data-whole]').hidden = !focus;
    peek.querySelector('[data-step="-1"]').disabled = ref.ch <= 1;
    peek.querySelector('[data-step="1"]').disabled = ref.ch >= ref.book.verses.length;
    peek.querySelector('.bq-peek-credit').textContent = t.name + ' (' + t.year + '). ' + t.note;
    var body = peek.querySelector('.bq-peek-body');
    body.replaceChildren(el('p', { className: 'bq-peek-status', text: 'Opening ' + refLabel(ref) + '…' }));
    loadText(t.code, ref.book.slug).then(function (chapters) {
      if (current !== ref || translation() !== t) return;
      var verses = chapters[ref.ch - 1] || [];
      var from = focus ? ref.v1 : 1;
      var to = focus ? (ref.v2 || ref.v1) : verses.length;
      var list = [];
      for (var v = from; v <= Math.min(to, verses.length); v++) {
        var hi = ref.v1 && v >= ref.v1 && v <= (ref.v2 || ref.v1);
        list.push(el('p', { className: 'bq-v' + (hi && !focus ? ' is-focus' : ''), 'data-v': String(v) }, [
          el('sup', { text: String(v) }), document.createTextNode(' ' + verses[v - 1]),
        ]));
      }
      body.replaceChildren.apply(body, list.length ? list : [el('p', { className: 'bq-peek-status', text: 'That verse isn’t in this chapter.' })]);
      body.scrollTop = 0;
      var first = body.querySelector('.is-focus');
      if (first) first.scrollIntoView({ block: 'center' });
    }).catch(function () {
      if (current !== ref) return;
      body.replaceChildren(el('p', { className: 'bq-peek-status', text: 'This passage couldn’t load. Open it in the Bible reader instead.' }));
    });
  }

  function openPeek(ref) {
    if (!ref) return false;
    if (!ref.ch) ref = { book: ref.book, ch: 1, v1: 0, v2: 0 };
    if (!peek) peek = buildPeek();
    current = ref;
    wholeChapter = false;
    render();
    if (!peek.open) peek.showModal();
    peek.querySelector('.bq-peek-body').focus();
    return true;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-bible-ref]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!meta) return; // the data isn't here yet: just follow the link
    if (openPeek(refFromHref(a.href))) e.preventDefault();
  });

  /* ── The "Bible" pill ──────────────────────────────────────────────── */
  function lessonBook() {
    var named = document.body.dataset.bibleBook;
    if (named) return parseRef(named);
    var top = null;
    cited.forEach(function (n, slug) { if (!top || n > top.n) top = { n: n, slug: slug }; });
    return top && top.n >= 2 ? { book: bySlug.get(top.slug), ch: 0, v1: 0, v2: 0 } : null;
  }

  function buildPill() {
    var id = 'bq-menu';
    var wrap = el('div', { className: 'bq-actions', 'data-no-print': '' });
    var button = el('button', {
      type: 'button', className: 'bq-pill', 'aria-expanded': 'false', 'aria-controls': id,
      title: 'Open the class Bible or look up a passage',
    }, [el('span', { 'aria-hidden': 'true', text: '📖' }), el('span', { className: 'bq-pill-label', text: 'Bible' })]);
    button.setAttribute('aria-label', 'Bible: look up a passage');
    var input = el('input', { type: 'search', id: 'bq-find', placeholder: 'e.g. John 3:16 or Psalm 23', autocomplete: 'off' });
    var msg = el('p', { className: 'bq-msg', role: 'status' });
    var form = el('form', { className: 'bq-find' }, [
      el('label', { for: 'bq-find', text: 'Look up a passage' }),
      el('div', { className: 'bq-find-row' }, [input, el('button', { type: 'submit', className: 'bq-btn bq-btn--primary', text: 'Read' })]),
      msg,
    ]);
    var links = el('div', { className: 'bq-links' });
    var menu = el('div', { className: 'bq-menu', id: id, hidden: true }, [form, links]);
    wrap.append(button, menu);

    function fillLinks() {
      links.replaceChildren();
      var pos = read(POS_KEY);
      var saved = read(KEY);
      var last = saved && saved.last && bySlug.get(saved.last.slug);
      if (last) {
        var pct = pos && typeof pos.p === 'number' ? Math.round(pos.p * 1000) / 10 : 0;
        links.append(el('a', { className: 'bq-link', href: BIBLE + '#/read/' + last.slug + '/' + saved.last.ch }, [
          el('strong', { text: 'Continue reading · ' + last.name + ' ' + saved.last.ch }),
          el('small', { text: pct ? pct + '% of the Bible read on this device' : 'Pick up where you left off' }),
        ]));
      }
      var own = lessonBook();
      if (own && own.book) {
        links.append(el('a', { className: 'bq-link', href: BIBLE + '#/book/' + own.book.slug }, [
          el('strong', { text: 'This lesson’s book · ' + own.book.name }),
          el('small', { text: own.book.verses.length + ' chapters — choose one to read' }),
        ]));
      }
      links.append(el('a', { className: 'bq-link', href: BIBLE }, [
        el('strong', { text: 'Open the Bible →' }),
        el('small', { text: '66 books · verse of the day · BSB, KJV & ASV' }),
      ]));
    }

    function close() { menu.hidden = true; button.setAttribute('aria-expanded', 'false'); }
    button.addEventListener('click', function () {
      var opening = menu.hidden;
      menu.hidden = !opening;
      button.setAttribute('aria-expanded', String(opening));
      if (opening) { msg.textContent = ''; fillLinks(); input.focus(); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!meta) { location.href = BIBLE + '#/go/' + encodeURIComponent(input.value.trim()); return; }
      var ref = parseRef(input.value);
      if (!ref) { msg.textContent = 'Try a book and chapter, like “Daniel 6” or “Psalm 23:1–3”.'; return; }
      close();
      if (!ref.ch) { location.href = readerHref(ref); return; }
      openPeek(ref);
    });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) close(); });
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { close(); button.focus(); }
    });
    return wrap;
  }

  function placePill() {
    if (document.querySelector('.bq-actions')) return;
    var pill = buildPill();
    var print = document.querySelector('.lesson-print-actions');
    var host = document.querySelector('.site-header .nav-wrap');
    if (print && print.parentElement) print.parentElement.insertBefore(pill, print);
    else if (host) host.append(pill);
    else { pill.classList.add('bq-actions--floating'); document.body.append(pill); }
  }

  function addStyles() {
    if (document.getElementById('bible-quicklink-styles')) return;
    document.head.append(el('link', {
      id: 'bible-quicklink-styles', rel: 'stylesheet',
      href: new URL('assets/css/components/bible-quicklink.css', base).href,
    }));
  }

  function init() {
    addStyles();
    placePill();
    loadMeta().then(linkReferences).catch(function () { /* no data: links still open the reader */ });
  }

  window.ClassroomOSBible = { open: function (text) { return loadMeta().then(function () { return openPeek(parseRef(text)); }); } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
