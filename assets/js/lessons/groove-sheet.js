/* groove-sheet.js — the homework sheet page (lessons/music/groove-sheet.html).
 *
 * The printed card is its own layout, built here from the saved step data: notation as vector SVG
 * (DrumLab.renderStaff, with its count line from GrooveSheetCore), a tempo ladder, a Mon–Sun log and a
 * QR code. It is not a screenshot of the builder; the interactive grid has no place on paper.
 */
(function () {
  'use strict';
  var G = window.GrooveSheetCore, QR = window.QR;
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var LAB_PATH = 'lessons/music/drums.html';
  var DEFAULT_SITE = 'https://mrscandrett.github.io';

  function safeStorage() {
    try { var t = '__gs_probe'; window.localStorage.setItem(t, '1'); window.localStorage.removeItem(t); return window.localStorage; } catch (e) { return null; }
  }
  var store = G.createStore(safeStorage());
  var $ = function (id) { return document.getElementById(id); };
  var pagesEl = $('gsPages'), statusEl = $('gsStatus');
  var lastDeleted = null;

  function el(tag, cls, text, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function say(msg, undo) {
    statusEl.textContent = msg + ' ';
    if (undo) { var b = el('button', 'gs-link', 'Undo', statusEl); b.type = 'button'; b.addEventListener('click', undo); }
  }
  function niceDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /* ------------------------------------------------------------- QR / links */
  function siteBase() {
    var typed = (store.state.siteUrl || '').trim();
    if (typed) return typed.replace(/\/+$/, '') + '/';
    var h = window.location.hostname, local = !h || h === 'localhost' || h === '127.0.0.1' || window.location.protocol === 'file:';
    return local ? DEFAULT_SITE + '/' : window.location.origin + '/';
  }
  function grooveUrl(p) { return siteBase() + LAB_PATH + G.hashFor(p); }
  function qrSvg(p) {
    try { return QR.toSvg(QR.encode(grooveUrl(p), 'M'), { border: 2, label: 'QR code: open this groove on your phone' }); }
    catch (e) { return ''; }
  }

  /* ------------------------------------------------------------ print card */
  function staffFor(p) {
    var view = window.DrumLab.renderStaff({ name: p.title, tempo: p.tempo, tracks: p.tracks, count: p.count }, { crop: true });
    view.svg.setAttribute('aria-label', 'Drum notation for ' + p.title + ', counted ' + G.MODE_NAMES[view.countMode].toLowerCase());
    return view;
  }

  function paintCard(card, p, n) {
    var old = card.querySelector('.gs-print');
    var box = el('div', 'gs-print');
    var view = staffFor(p);

    var head = el('header', 'gs-card-head', null, box);
    el('span', 'gs-num', String(n), head);
    el('h3', 'gs-title', p.title, head);
    var cap = el('span', 'gs-countcap', null, head);
    el('span', null, 'Count ', cap);
    el('strong', null, G.MODE_SAMPLE[view.countMode].replace(' …', ''), cap);
    el('span', 'gs-target', 'Goal: ' + p.tempo + ' BPM', head);

    var body = el('div', 'gs-body', null, box);
    var left = el('div', 'gs-staffcol', null, body);
    var staff = el('div', 'gs-staff', null, left);
    staff.appendChild(view.svg);
    if (p.note) el('p', 'gs-note', p.note, left);

    var qr = el('figure', 'gs-qr', null, body);
    var holder = el('div', 'gs-qr-img', null, qr);
    holder.innerHTML = qrSvg(p);
    el('figcaption', null, 'Scan to play it', qr);

    var foot = el('div', 'gs-foot', null, box);
    var lad = el('div', 'gs-ladder', null, foot);
    el('b', null, 'Tempo ladder', lad);
    var steps = el('div', 'gs-ladder-steps', null, lad);
    p.ladder.forEach(function (bpm, i) {
      if (i) el('span', 'gs-arrow', '→', steps);
      var s = el('span', 'gs-step', null, steps);
      el('span', 'gs-box', null, s);
      el('span', null, String(bpm), s);
    });
    var logWrap = el('div', 'gs-logwrap', null, foot);
    el('b', null, 'Practice log', logWrap);
    var t = el('table', 'gs-log', null, logWrap);
    var tr = el('tr', null, null, el('thead', null, null, t));
    DAYS.forEach(function (d) { el('th', null, d, tr); });
    var row = el('tr', null, null, el('tbody', null, null, t));
    DAYS.forEach(function () { el('td', null, null, row); });
    if (card.classList.contains('gs-roomy')) {
      var c = el('div', 'gs-comments', null, box);
      el('span', null, 'Teacher comments', c);
    }

    if (old) card.replaceChild(box, old); else card.insertBefore(box, card.firstChild);
    return view.countMode;
  }

  /* -------------------------------------------------------------- edit panel */
  function editPanel(card, p, i, total) {
    var panel = el('div', 'gs-edit no-print');
    function field(label, node, cls) {
      var l = el('label', cls || '', null, panel); l.appendChild(document.createTextNode(label + ' ')); l.appendChild(node); return node;
    }
    var title = el('input'); title.type = 'text'; title.maxLength = 60; title.value = p.title; field('Title', title, 'gs-wide');
    var note = el('textarea'); note.rows = 2; note.maxLength = 130; note.value = p.note; note.placeholder = 'e.g. 4x through, then 8 bars with the click';
    field('Note for the student', note, 'gs-wide');
    var tempo = el('input'); tempo.type = 'number'; tempo.min = 40; tempo.max = 240; tempo.value = p.tempo; field('Goal tempo', tempo);
    var count = el('select');
    G.COUNT_MODES.forEach(function (m) {
      var o = el('option', null, m === 'auto' ? 'Auto (' + G.MODE_NAMES[G.resolutionFor(p.tracks)].toLowerCase() + ')' : G.MODE_NAMES[m] + ': ' + G.MODE_SAMPLE[m], count); o.value = m;
    });
    count.value = p.count; field('Count', count);
    var ladder = el('input'); ladder.type = 'text'; ladder.value = p.ladder.join(' → '); field('Tempo ladder', ladder);

    function save(patch, repaint) {
      var np = store.updatePattern(p.id, patch);
      if (!np) return;
      Object.assign(p, np);
      if (repaint !== false) {
        paintCard(card, p, i + 1);
      }
    }
    title.addEventListener('input', function () { save({ title: title.value || 'Groove' }); });
    note.addEventListener('input', function () { save({ note: note.value }); });
    tempo.addEventListener('change', function () { save({ tempo: tempo.value }); tempo.value = p.tempo; });
    count.addEventListener('change', function () { save({ count: count.value }); });
    ladder.addEventListener('change', function () { save({ ladder: G.parseLadder(ladder.value) }); ladder.value = p.ladder.join(' → '); });

    var bar = el('div', 'gs-edit-actions', null, panel);
    function act(label, aria, fn, cls) {
      var b = el('button', cls || '', label, bar); b.type = 'button'; b.setAttribute('aria-label', aria); b.addEventListener('click', fn); return b;
    }
    var up = act('▲', 'Move ' + p.title + ' up', function () { store.movePattern(p.id, -1); render(p.id, 'up'); });
    var down = act('▼', 'Move ' + p.title + ' down', function () { store.movePattern(p.id, 1); render(p.id, 'down'); });
    up.disabled = i === 0; down.disabled = i === total - 1;
    act('Duplicate', 'Duplicate ' + p.title, function () { var c = store.duplicatePattern(p.id); render(c && c.id); say('Duplicated “' + p.title + '”.'); });
    var open = el('a', 'gs-btnlink', 'Open in Drum Lab ↗', bar); open.href = 'drums.html' + G.hashFor(p); open.target = '_blank'; open.rel = 'noopener';
    act('Remove', 'Remove ' + p.title + ' from the sheet', function () {
      var pats = store.sheet().patterns, at = pats.map(function (x) { return x.id; }).indexOf(p.id), copy = JSON.parse(JSON.stringify(pats[at]));
      store.deletePattern(p.id);
      lastDeleted = { sheet: store.state.current, at: at, pattern: copy };
      render();
      say('Removed “' + copy.title + '”.', function () {
        var s = store.sheet(lastDeleted.sheet); if (!s) return;
        s.patterns.splice(Math.min(lastDeleted.at, s.patterns.length), 0, G.makePattern(lastDeleted.pattern)); store.save(); render(lastDeleted.pattern.id); say('Put it back.');
      });
    }, 'gs-danger');
    return panel;
  }

  /* ------------------------------------------------------------------ render */
  function renderToolbar(sheet) {
    var sel = $('gsSheetSelect');
    sel.textContent = '';
    store.state.sheets.forEach(function (s, i) {
      var o = el('option', null, (s.student || 'Unnamed sheet ' + (i + 1)) + ' (' + s.patterns.length + ')', sel); o.value = s.id;
    });
    sel.value = sheet.id;
    if (document.activeElement !== $('gsStudent')) $('gsStudent').value = sheet.student;
    $('gsAssigned').value = sheet.assigned; $('gsDue').value = sheet.due; $('gsPerPage').value = String(sheet.perPage);
    $('gsSite').value = store.state.siteUrl || '';
    $('gsSite').placeholder = siteBase().replace(/\/$/, '');
    var base = siteBase();
    $('gsSiteHint').textContent = 'QR codes open ' + base + LAB_PATH + ' with the groove in the address. Right now: ' + base.replace(/\/$/, '') + (store.state.siteUrl ? '' : ' (guessed; change it if your site lives elsewhere)') + '.';
    $('gsDelSheet').disabled = false;
    $('gsPrint').disabled = !sheet.patterns.length;
    $('gsExport').disabled = !sheet.patterns.length;
    if (!store.persistent && !renderToolbar.warned) { renderToolbar.warned = true; say('This browser is blocking storage, so the sheet will be lost when you close the tab. Use Export to keep it.'); }
  }

  function pageHead(sheet, pageNo, pageCount) {
    var h = el('header', 'gs-page-head');
    var t = el('div', 'gs-page-title', null, h);
    el('h2', null, 'Drum groove homework', t);
    el('p', null, pageCount > 1 ? 'Page ' + pageNo + ' of ' + pageCount : 'STEAM Lab · Microschool', t);
    var dl = el('dl', 'gs-who', null, h);
    [['Name', sheet.student], ['Date', niceDate(sheet.assigned)], ['Due', niceDate(sheet.due)]].forEach(function (pair) {
      var d = el('div', pair[1] ? 'is-filled' : '', null, dl);
      el('dt', null, pair[0], d); el('dd', null, pair[1], d);
    });
    return h;
  }

  function render(focusId, focusWhich) {
    var sheet = store.sheet();
    renderToolbar(sheet);
    pagesEl.textContent = '';
    var pats = sheet.patterns;
    if (!pats.length) {
      var empty = el('section', 'gs-empty no-print', null, pagesEl);
      el('h2', null, 'This sheet has no grooves yet.', empty);
      var p = el('p', null, 'Build one in the ', empty);
      var a = el('a', null, 'Drum Lab groove builder', p); a.href = 'drums.html#build';
      p.appendChild(document.createTextNode(' and press '));
      el('strong', null, 'Add to homework sheet', p);
      p.appendChild(document.createTextNode('. Come back here and it will be waiting.'));
      return;
    }
    var per = sheet.perPage, pageCount = Math.ceil(pats.length / per);
    for (var pg = 0; pg < pageCount; pg++) {
      var page = el('section', 'gs-page gs-per-' + per, null, pagesEl);
      page.setAttribute('aria-label', 'Printed page ' + (pg + 1) + ' of ' + pageCount);
      page.appendChild(pageHead(sheet, pg + 1, pageCount));
      if (pg === 0) el('p', 'gs-howto', 'Count out loud while you play. Start at the first tempo and check its box when you can play the groove four times in a row without stopping. Then move up.', page);
      pats.slice(pg * per, pg * per + per).forEach(function (pat, k) {
        var i = pg * per + k, card = el('article', 'gs-card' + (per === 2 ? ' gs-roomy' : ''), null, page);
        card.setAttribute('data-id', pat.id);
        paintCard(card, pat, i + 1);
        card.appendChild(editPanel(card, pat, i, pats.length));
      });
    }
    if (focusId) {
      var c = pagesEl.querySelector('[data-id="' + focusId + '"]');
      if (c) {
        var want = focusWhich === 'up' ? 0 : focusWhich === 'down' ? 1 : -1;
        var btns = c.querySelectorAll('.gs-edit-actions button');
        var target = want >= 0 && btns[want] && !btns[want].disabled ? btns[want] : (want >= 0 ? btns[want ? 0 : 1] : null);
        if (target && !target.disabled) target.focus(); else if (want < 0) c.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  /* ---------------------------------------------------------------- toolbar */
  function bind() {
    $('gsSheetSelect').addEventListener('change', function (e) { store.select(e.target.value); render(); });
    $('gsNewSheet').addEventListener('click', function () { store.newSheet(''); render(); $('gsStudent').focus(); say('New blank sheet. Type the student’s name.'); });
    $('gsDupSheet').addEventListener('click', function () { store.duplicateSheet(store.state.current); render(); $('gsStudent').focus(); say('Copied. Type the new student’s name.'); });
    $('gsDelSheet').addEventListener('click', function () {
      var s = store.sheet(), label = s.student || 'this unnamed sheet';
      if (s.patterns.length && !window.confirm('Delete ' + label + ' and its ' + s.patterns.length + ' groove' + (s.patterns.length === 1 ? '' : 's') + '? Export it first if you might want it back.')) return;
      store.deleteSheet(s.id); render(); say('Deleted.');
    });
    $('gsStudent').addEventListener('input', function (e) {
      store.updateSheet({ student: e.target.value });
      var o = $('gsSheetSelect').selectedOptions[0], s = store.sheet(); if (o) o.textContent = (s.student || 'Unnamed sheet') + ' (' + s.patterns.length + ')';
      var dd = pagesEl.querySelectorAll('.gs-who div:first-child');
      Array.prototype.forEach.call(dd, function (d) { d.classList.toggle('is-filled', !!s.student); d.querySelector('dd').textContent = s.student; });
    });
    ['gsAssigned', 'gsDue'].forEach(function (id) {
      $(id).addEventListener('change', function () { store.updateSheet({ assigned: $('gsAssigned').value, due: $('gsDue').value }); render(); });
    });
    $('gsPerPage').addEventListener('change', function (e) { store.updateSheet({ perPage: +e.target.value }); render(); });
    $('gsSite').addEventListener('change', function (e) {
      var v = e.target.value.trim();
      if (v && !/^https?:\/\//i.test(v)) { say('The address should start with https://'); e.target.value = store.state.siteUrl || ''; return; }
      store.setSiteUrl(v); render(); say('QR codes updated.');
    });
    $('gsPrint').addEventListener('click', function () { window.print(); });

    function download(name, text) {
      var url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    var stamp = function () { return new Date().toISOString().slice(0, 10); };
    $('gsExport').addEventListener('click', function () {
      var s = store.sheet(), who = (s.student || 'sheet').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'sheet';
      download('groove-' + who + '-' + stamp() + '.json', store.exportJSON(false)); say('Exported.');
    });
    $('gsExportAll').addEventListener('click', function () { download('groove-sheets-all-' + stamp() + '.json', store.exportJSON(true)); say('Exported ' + store.state.sheets.length + ' sheet(s).'); });
    $('gsImportBtn').addEventListener('click', function () { $('gsImport').click(); });
    $('gsImport').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f) return;
      if (f.size > 2e6) { say('That file is too large to be a groove-sheet export.'); return; }
      var r = new FileReader();
      r.onload = function () {
        try { var n = store.importJSON(String(r.result)); render(); say('Imported ' + n + ' sheet' + (n === 1 ? '' : 's') + ' as new sheets.'); }
        catch (err) { say(err.message); }
      };
      r.readAsText(f);
    });

    // The builder lives on another page: pick up grooves it adds when we come back, without clobbering typing.
    function refresh() {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return;
      store.reload(); render();
    }
    window.addEventListener('storage', function (e) { if (e.key === G.STORE_KEY) refresh(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) refresh(); });
  }

  bind();
  render();
})();
