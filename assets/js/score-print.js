/* score-print.js — print or save any engraved score as a PDF.
 *
 *   ScorePrint.print(svg, { title, subtitle, credit })      // just that score, on letter pages
 *   ScorePrint.button(host, getScore)                        // adds a "Print / PDF" button
 *
 * Works for every engraved score on the site: composer figures (score-engine.js, .se-score) and the
 * Fake book lead sheet / drum chart (.fb-svg, .fb-drum-svg). The score is cloned into a hidden iframe so
 * the lesson's own chrome, theme and print pass never touch it; the page shows ink on white. Long scores
 * are cut into pages BETWEEN staff systems (never through a staff) using the measure rectangles
 * (.se-measure / .fb-bar) as the map, then each page is the same SVG with its own viewBox window.
 */
(function (root) {
  'use strict';
  if (root.ScorePrint) return;

  var PAGE_W_IN = 7.5, PAGE_H_IN = 10 - 0.6;     // letter, 0.5in margins; first page also carries the title block
  var HEAD_IN = 1.1, FOOT_IN = 0.25;
  var BAR_SELECTOR = '.se-measure, .fb-bar';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Vertical bands, one per staff system, from the measure rectangles.
  function systemBands(svg) {
    var rows = [];
    svg.querySelectorAll(BAR_SELECTOR).forEach(function (r) {
      var y = parseFloat(r.getAttribute('y')), h = parseFloat(r.getAttribute('height'));
      if (isFinite(y) && isFinite(h)) rows.push([y, y + h]);
    });
    rows.sort(function (a, b) { return a[0] - b[0]; });
    var bands = [];
    rows.forEach(function (r) {
      var last = bands[bands.length - 1];
      if (last && r[0] < last[1] - 1) last[1] = Math.max(last[1], r[1]);
      else bands.push([r[0], r[1]]);
    });
    return bands;
  }

  // Greedy page packing: [{ y0, y1 }] windows in SVG units. First page is shorter (title block).
  function pageWindows(svg, W, H) {
    var unit = W / PAGE_W_IN;                                   // SVG units per inch at full page width
    var first = (PAGE_H_IN - HEAD_IN - FOOT_IN) * unit, rest = (PAGE_H_IN - FOOT_IN) * unit;
    if (H <= first) return [{ y0: 0, y1: H }];
    var bands = systemBands(svg), pages = [], start = 0, limit = first;
    // cut points: midway between one system's bottom and the next system's top
    var cuts = [];
    for (var i = 0; i < bands.length - 1; i++) cuts.push((bands[i][1] + bands[i + 1][0]) / 2);
    while (H - start > limit) {
      var best = null;
      cuts.forEach(function (c) { if (c > start + 1 && c - start <= limit) best = c; });
      if (best == null) best = start + limit;                    // a system taller than a page: cut anyway
      pages.push({ y0: start, y1: best });
      start = best; limit = rest;
    }
    pages.push({ y0: start, y1: H });
    return pages;
  }

  function cleanClone(svg) {
    var c = svg.cloneNode(true);
    c.removeAttribute('style'); c.removeAttribute('width'); c.removeAttribute('height');
    c.querySelectorAll('.is-on, .is-now, .is-sel, .is-start, .is-loop').forEach(function (n) {
      ['is-on', 'is-now', 'is-sel', 'is-start', 'is-loop'].forEach(function (k) { n.classList.remove(k); });
    });
    c.querySelectorAll('.se-cursor').forEach(function (n) { n.remove(); });
    return c;
  }

  var PAGE_CSS =
    '@page{size:letter;margin:.5in}' +
    'html,body{margin:0;background:#fff!important;color:#000!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    'body{font:12pt Georgia,"Times New Roman",serif}' +
    '.sp-page{width:' + PAGE_W_IN + 'in;page-break-after:always;break-after:page;overflow:hidden}' +
    '.sp-page:last-child{page-break-after:auto;break-after:auto}' +
    '.sp-head{text-align:center;margin:0 0 .2in}' +
    '.sp-head h1{margin:0!important;padding:0!important;font:700 20pt/1.15 Georgia,"Times New Roman",serif!important;letter-spacing:0!important;text-transform:none!important;color:#000!important}' +
    '.sp-head p{margin:.08in 0 0!important;font:11pt/1.25 Georgia,serif!important;color:#333!important}' +
    '.sp-run{height:.25in;font:9pt Georgia,serif!important;color:#555;text-align:right}' +
    '.sp-page svg{display:block;width:100%;height:auto;max-width:none!important;color:#000}' +
    '.sp-credit{margin:.12in 0 0!important;font:8pt/1.3 system-ui,sans-serif!important;color:#555!important}' +
    '.se-measure,.fb-bar,.se-cursor{display:none!important}';

  function print(svg, opts) {
    opts = opts || {};
    if (!svg) return false;
    var vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || !(vb[2] > 0) || !(vb[3] > 0)) return false;
    var W = vb[2], H = vb[3], x0 = vb[0], y0 = vb[1];
    var wins = pageWindows(svg, W, H), base = cleanClone(svg);
    var title = opts.title || 'Score';
    var sheets = wins.map(function (w, i) {
      var s = base.cloneNode(true);
      s.setAttribute('viewBox', x0 + ' ' + (y0 + w.y0) + ' ' + W + ' ' + (w.y1 - w.y0));
      var head = i === 0
        ? '<header class="sp-head"><h1>' + esc(title) + '</h1>' + (opts.subtitle ? '<p>' + esc(opts.subtitle) + '</p>' : '') + '</header>'
        : '<div class="sp-run">' + esc(title) + ' · page ' + (i + 1) + ' of ' + wins.length + '</div>';
      var credit = i === wins.length - 1 && opts.credit ? '<p class="sp-credit">' + esc(opts.credit) + '</p>' : '';
      return '<section class="sp-page">' + head + s.outerHTML + credit + '</section>';
    }).join('');

    var links = Array.prototype.map.call(document.querySelectorAll('link[rel~="stylesheet"]'), function (l) {
      return '<link rel="stylesheet" href="' + esc(l.href) + '">';
    }).join('');
    var doc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<base href="' + esc(document.baseURI) + '">' + links + '<style>' + PAGE_CSS + '</style></head><body>' + sheets + '</body></html>';

    var frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    frame.onload = function () {
      var win = frame.contentWindow, fonts = win.document.fonts && win.document.fonts.ready;
      var go = function () {
        try { win.focus(); win.print(); } finally { setTimeout(function () { frame.remove(); }, 60000); }
      };
      (fonts ? fonts.then(go, go) : go());
    };
    frame.srcdoc = doc;
    document.body.appendChild(frame);
    return true;
  }

  // A "Print / PDF" pill. getScore() → { svg, title, subtitle, credit } at click time (the score re-engraves).
  function button(host, getScore, className) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = className || 'sp-btn';
    b.setAttribute('data-score-print', '');
    b.title = 'Print this score, or choose “Save as PDF” in the print window';
    b.setAttribute('aria-label', 'Print this score or save it as a PDF');
    b.textContent = '🖨 Print / PDF';
    b.addEventListener('click', function () {
      var s = getScore();
      if (!s || !print(s.svg, s)) b.title = 'The score is not ready yet';
    });
    host.appendChild(b);
    return b;
  }

  root.ScorePrint = { print: print, button: button, _pageWindows: pageWindows, _systemBands: systemBands };
})(typeof window !== 'undefined' ? window : globalThis);
