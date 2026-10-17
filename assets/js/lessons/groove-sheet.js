/* groove-sheet.js — the homework sheet panel inside the Drum Lab Build chapter (#drSheet).
 *
 * The printed card is its own layout, built here from the saved step data: notation as vector SVG
 * (DrumLab.renderStaff, with its count line from GrooveSheetCore), a tempo ladder, a Mon–Sun log and a
 * QR code. It is not a screenshot of the builder; the interactive grid has no place on paper.
 */
(function () {
  'use strict';
  var G = window.GrooveSheetCore, QR = window.QR;
  var host = document.getElementById('drSheet'), printRoot = document.getElementById('drSheetPrint');
  if (!host || !printRoot || !window.DrumLab) return;
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var LAB_PATH = 'lessons/music/instruments/drums.html';
  var DEFAULT_SITE = 'https://mrscandrett.github.io';

  function safeStorage() {
    try { var t = '__gs_probe'; window.localStorage.setItem(t, '1'); window.localStorage.removeItem(t); return window.localStorage; } catch (e) { return null; }
  }
  var store = G.createStore(safeStorage());
  var lastDeleted = null, statusEl, pagesEl, ui = {};

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
    act('Load in builder ↑', 'Load ' + p.title + ' into the groove builder', function () {
      window.dispatchEvent(new CustomEvent('groove-sheet-load', { detail: { tracks: p.tracks, tempo: p.tempo, count: p.count, title: p.title } }));
    });
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

  /* --------------------------------------------------------------- panel UI */
  function build() {
    host.textContent = '';
    function row(cls) { return el('div', 'gs-row' + (cls ? ' ' + cls : ''), null, host); }
    function labelled(parent, text, node) { var l = el('label', null, null, parent); l.appendChild(document.createTextNode(text + ' ')); l.appendChild(node); return node; }
    function btn(parent, text, id, cls) { var b = el('button', 'dr-mini' + (cls ? ' ' + cls : ''), text, parent); b.type = 'button'; ui[id] = b; return b; }

    var r1 = row();
    ui.select = labelled(r1, 'Sheet for', el('select'));
    btn(r1, 'New sheet', 'newSheet'); btn(r1, 'Copy to new student', 'dupSheet'); btn(r1, 'Delete sheet', 'delSheet', 'gs-danger');

    var r2 = row();
    ui.student = labelled(r2, 'Student name', el('input')); ui.student.type = 'text'; ui.student.maxLength = 60; ui.student.autocomplete = 'off'; ui.student.placeholder = 'Blank = write by hand';
    ui.assigned = labelled(r2, 'Date', el('input')); ui.assigned.type = 'date';
    ui.due = labelled(r2, 'Due', el('input')); ui.due.type = 'date';
    ui.perPage = labelled(r2, 'Grooves per page', el('select'));
    [['3', '3'], ['2', '2 (roomier)']].forEach(function (o) { var op = el('option', null, o[1], ui.perPage); op.value = o[0]; });

    var r3 = row();
    btn(r3, 'Print this sheet', 'print', 'dr-mini-primary');
    btn(r3, 'Export this sheet', 'exportOne'); btn(r3, 'Export all sheets', 'exportAll'); btn(r3, 'Import…', 'importBtn');
    ui.importFile = el('input', null, null, r3); ui.importFile.type = 'file'; ui.importFile.accept = 'application/json,.json'; ui.importFile.hidden = true;
    var det = el('details', 'gs-site', null, r3);
    el('summary', null, 'QR address', det);
    ui.site = labelled(det, 'Site address the QR codes point to', el('input')); ui.site.type = 'url'; ui.site.inputMode = 'url'; ui.site.autocomplete = 'off';
    ui.siteHint = el('p', null, '', det);

    statusEl = el('p', 'gs-status', '', host); statusEl.setAttribute('role', 'status'); statusEl.setAttribute('aria-live', 'polite');
    pagesEl = el('div', 'gs-list', null, host);
    bind();
  }

  function renderToolbar(sheet) {
    ui.select.textContent = '';
    store.state.sheets.forEach(function (s, i) {
      var o = el('option', null, (s.student || 'Unnamed sheet ' + (i + 1)) + ' (' + s.patterns.length + ')', ui.select); o.value = s.id;
    });
    ui.select.value = sheet.id;
    if (document.activeElement !== ui.student) ui.student.value = sheet.student;
    ui.assigned.value = sheet.assigned; ui.due.value = sheet.due; ui.perPage.value = String(sheet.perPage);
    ui.site.value = store.state.siteUrl || '';
    var base = siteBase();
    ui.site.placeholder = base.replace(/\/$/, '');
    ui.siteHint.textContent = 'Each QR code opens ' + base + LAB_PATH + ' with the groove in the address. Right now: ' + base.replace(/\/$/, '') + (store.state.siteUrl ? '' : ' (a guess; change it if your site lives elsewhere)') + '.';
    ui.print.disabled = ui.exportOne.disabled = !sheet.patterns.length;
    if (!store.persistent && !renderToolbar.warned) { renderToolbar.warned = true; say('This browser is blocking storage, so the sheet will be lost when you close the tab. Use Export to keep it.'); }
  }

  /* One printed page: header, optional how-to line, then its cards. forPrint drops the edit panels. */
  function buildPage(sheet, pg, pageCount, forPrint) {
    var per = sheet.perPage, pats = sheet.patterns;
    var page = el('section', 'gs-page gs-per-' + per);
    page.setAttribute('data-night-keep', '');
    page.appendChild(pageHead(sheet, pg + 1, pageCount));
    if (pg === 0) el('p', 'gs-howto', 'Count out loud while you play. Start at the first tempo and check its box when you can play the groove four times in a row without stopping. Then move up.', page);
    pats.slice(pg * per, pg * per + per).forEach(function (pat, k) {
      var i = pg * per + k, card = el('article', 'gs-card' + (per === 2 ? ' gs-roomy' : ''), null, page);
      card.setAttribute('data-id', pat.id);
      paintCard(card, pat, i + 1);
      if (!forPrint) card.appendChild(editPanel(card, pat, i, pats.length));
    });
    return page;
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
      var empty = el('div', 'gs-empty', null, pagesEl);
      el('p', null, 'This sheet has no grooves yet. Build one above and press “Add to homework sheet”; it will appear here.', empty);
      return;
    }
    var pageCount = Math.ceil(pats.length / sheet.perPage);
    el('p', 'gs-count', pats.length + (pats.length === 1 ? ' groove' : ' grooves') + ' · prints on ' + pageCount + (pageCount === 1 ? ' page' : ' pages') + ' (US Letter)', pagesEl);
    for (var pg = 0; pg < pageCount; pg++) pagesEl.appendChild(buildPage(sheet, pg, pageCount, false));
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

  /* Print the way the practice sheet does: fill the print-only root, hide the lesson, print, clean up. */
  function printSheet() {
    var sheet = store.sheet();
    if (!sheet.patterns.length) return;
    printRoot.textContent = '';
    var pageCount = Math.ceil(sheet.patterns.length / sheet.perPage);
    for (var pg = 0; pg < pageCount; pg++) printRoot.appendChild(buildPage(sheet, pg, pageCount, true));
    document.body.classList.add('dr-printing-sheet');
    window.print();
  }
  window.addEventListener('afterprint', function () { document.body.classList.remove('dr-printing-sheet'); printRoot.textContent = ''; });

  /* ---------------------------------------------------------------- toolbar */
  function bind() {
    ui.select.addEventListener('change', function (e) { store.select(e.target.value); render(); });
    ui.newSheet.addEventListener('click', function () { store.newSheet(''); render(); ui.student.focus(); say('New blank sheet. Type the student’s name.'); });
    ui.dupSheet.addEventListener('click', function () { store.duplicateSheet(store.state.current); render(); ui.student.focus(); say('Copied. Type the new student’s name.'); });
    ui.delSheet.addEventListener('click', function () {
      var s = store.sheet(), label = s.student || 'this unnamed sheet';
      if (s.patterns.length && !window.confirm('Delete ' + label + ' and its ' + s.patterns.length + ' groove' + (s.patterns.length === 1 ? '' : 's') + '? Export it first if you might want it back.')) return;
      store.deleteSheet(s.id); render(); say('Deleted.');
    });
    ui.student.addEventListener('input', function (e) {
      store.updateSheet({ student: e.target.value });
      var o = ui.select.selectedOptions[0], s = store.sheet(); if (o) o.textContent = (s.student || 'Unnamed sheet') + ' (' + s.patterns.length + ')';
      Array.prototype.forEach.call(pagesEl.querySelectorAll('.gs-who div:first-child'), function (d) { d.classList.toggle('is-filled', !!s.student); d.querySelector('dd').textContent = s.student; });
    });
    [ui.assigned, ui.due].forEach(function (inp) {
      inp.addEventListener('change', function () { store.updateSheet({ assigned: ui.assigned.value, due: ui.due.value }); render(); });
    });
    ui.perPage.addEventListener('change', function (e) { store.updateSheet({ perPage: +e.target.value }); render(); });
    ui.site.addEventListener('change', function (e) {
      var v = e.target.value.trim();
      if (v && !/^https?:\/\//i.test(v)) { say('The address should start with https://'); e.target.value = store.state.siteUrl || ''; return; }
      store.setSiteUrl(v); render(); say('QR codes updated.');
    });
    ui.print.addEventListener('click', printSheet);

    function download(name, text) {
      var url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    var stamp = function () { return new Date().toISOString().slice(0, 10); };
    ui.exportOne.addEventListener('click', function () {
      var s = store.sheet(), who = (s.student || 'sheet').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'sheet';
      download('groove-' + who + '-' + stamp() + '.json', store.exportJSON(false)); say('Exported.');
    });
    ui.exportAll.addEventListener('click', function () { download('groove-sheets-all-' + stamp() + '.json', store.exportJSON(true)); say('Exported ' + store.state.sheets.length + ' sheet(s).'); });
    ui.importBtn.addEventListener('click', function () { ui.importFile.click(); });
    ui.importFile.addEventListener('change', function (e) {
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

    // The builder above adds grooves to the same store; other tabs may too. Don't clobber typing.
    function refresh() {
      if (host.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
      store.reload(); render();
    }
    window.addEventListener('groove-sheet-changed', function () { store.reload(); render(); });
    window.addEventListener('storage', function (e) { if (e.key === G.STORE_KEY) refresh(); });
  }

  build();
  render();
})();
