/* ScoreNavigation: the one navigator for every engraved score (composer score libraries and the Fake book).

   One row of controls: a song map of every measure (sections, loop, start marker, the measure playing,
   the measures on screen) to click or drag, a "Bar #" jump, measure steps, zoom − / + / Fit, follow
   playback (with "Back to playback" after the reader scrolls away), and keys for whichever score was
   used last: [ ] a line, - = 0 zoom, F fit. Clicking a measure in the score selects it too.

   Hosts keep their own players. They engrave, call refresh(), report the measure playing with
   setCurrent(i) (-1 when stopped), and act in onSelect(i, measureEl, info), where info.source is
   'click' | 'map' | 'goto' | 'step' | 'line' and info.preview is true while the map is being dragged.
   Return false from onSelect to keep the previous selection (e.g. a shift-click that sets a loop end). */
(function (root) {
  'use strict';
  var instances = [], active = null;
  var SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
  var reduceMotion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)');

  function inField(t) { return t && t.closest && t.closest('input, select, textarea, [contenteditable="true"]'); }
  function isPage(s) { return !s || s === document.scrollingElement || s === document.documentElement || s === document.body; }

  root.ScoreNavigation = function (options) {
    var surface = options.surface, selector = options.selector, zoom = options.zoom || null;
    var unit = options.unit || 'Measure', cls = options.classes || {};
    var scroller = options.scroller || surface.closest('.ll-sim') || document.scrollingElement;
    var selected = 0, current = -1, following = options.follow !== false, paused = false;
    var cache = null, cells = [], view = [-1, -1], raf = 0, scrubbing = false, lastScrub = -1;

    var nav = options.mount || document.createElement('div');
    nav.classList.add('score-nav');
    nav.setAttribute('role', 'group');
    nav.setAttribute('aria-label', options.ariaLabel || 'Score navigation');
    var mini = 'sn-mini ' + (cls.mini || ''), btn = 'sn-btn ' + (cls.button || '');
    nav.innerHTML =
      '<label class="sn-goto"><span>' + unit + '</span><input type="number" inputmode="numeric" min="0" placeholder="#" aria-label="Go to ' + unit.toLowerCase() + '" /></label>' +
      '<button type="button" class="' + mini + '" data-sn-step="-1" aria-label="Previous ' + unit.toLowerCase() + '" title="Previous ' + unit.toLowerCase() + ' ( [ goes back a line )">‹</button>' +
      '<div class="sn-map" role="slider" tabindex="0" aria-label="Song map: every ' + unit.toLowerCase() + '. Click or drag to jump; arrow keys move one ' + unit.toLowerCase() + ', Page Up and Down one line"></div>' +
      '<button type="button" class="' + mini + '" data-sn-step="1" aria-label="Next ' + unit.toLowerCase() + '" title="Next ' + unit.toLowerCase() + ' ( ] goes forward a line )">›</button>' +
      (zoom ? '<span class="sn-zoom" role="group" aria-label="Zoom the score">' +
        '<button type="button" class="' + mini + '" data-sn-zoom="-1" aria-label="Zoom out" title="Zoom out ( - )">−</button>' +
        '<output aria-live="off">100%</output>' +
        '<button type="button" class="' + mini + '" data-sn-zoom="1" aria-label="Zoom in" title="Zoom in ( = )">+</button>' +
        '<button type="button" class="' + btn + '" data-sn-zoom="fit" title="Fit the whole score on screen ( F )">Fit</button></span>' : '') +
      (options.followToggle !== false ? '<button type="button" class="' + btn + ' sn-follow" aria-pressed="true" title="Scroll the score with the music">Follow</button>' : '') +
      '<button type="button" class="' + btn + ' sn-resume" hidden>↓ Back to playback</button>' +
      '<span class="sn-status" role="status" aria-live="polite"></span>';
    if (!options.mount) surface.parentNode.insertBefore(nav, surface);
    var q = function (s) { return nav.querySelector(s); };
    var mapEl = q('.sn-map'), gotoEl = q('.sn-goto input'), statusEl = q('.sn-status');
    var followEl = q('.sn-follow'), resumeEl = q('.sn-resume'), zoomOut = q('.sn-zoom output');

    // ---- measures
    function measures() {
      if (!cache) cache = Array.prototype.slice.call(surface.querySelectorAll(selector));
      return cache;
    }
    function number(i) {
      var m = measures()[i];
      return options.number ? options.number(i, m) : i + 1;
    }
    function label(i) { var n = number(i); return n === 0 ? 'Pickup' : unit + ' ' + n; }
    function indexOfNumber(n) {
      var ms = measures();
      for (var i = 0; i < ms.length; i++) if (number(i) === n) return i;
      return -1;
    }
    function sel() {
      if (options.selectedIndex) { var s = options.selectedIndex(); return typeof s === 'number' ? s : -1; }
      return selected;
    }
    function clamp(i) { return Math.max(0, Math.min(measures().length - 1, i)); }
    // Measures grouped into the lines (systems) they're engraved on, by their position on screen.
    function lines() {
      var out = [], prev = null;
      measures().forEach(function (m, i) {
        var r = m.getBoundingClientRect();
        if (!prev || r.top > prev.top + prev.height * 0.5) out.push(i);
        prev = r;
      });
      return out;
    }

    // ---- where the reader can see
    function viewport() {
      var top = 0, bottom = root.innerHeight, left = 0, right = root.innerWidth;
      if (!isPage(scroller)) {
        var r = scroller.getBoundingClientRect();
        top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom); left = Math.max(left, r.left); right = Math.min(right, r.right);
      }
      if (options.topInset) top = Math.max(top, options.topInset());
      return { top: top, bottom: bottom, left: left, right: right };
    }
    function scrollBy(dy, dx, instant) {
      var o = { top: dy, left: dx || 0, behavior: instant || (reduceMotion && reduceMotion.matches) ? 'auto' : 'smooth' };
      if (isPage(scroller)) root.scrollBy(o); else scroller.scrollBy(o);
    }
    function scrollToMeasure(i, how) {
      how = how || {};
      var m = measures()[i]; if (!m) return;
      var r = m.getBoundingClientRect(), v = viewport();
      var dy = how.top ? r.top - v.top - 8 : r.top - (v.top + (v.bottom - v.top) / 2 - r.height / 2), dx = 0;
      if (!isPage(scroller) && (r.left < v.left || r.right > v.right)) dx = r.left - (v.left + (v.right - v.left) / 2 - r.width / 2);
      scrollBy(dy, dx, how.instant);
    }
    function updateView() {
      raf = 0;
      if (nav.hidden) return;
      var v = viewport(), lo = -1, hi = -1;
      measures().forEach(function (m, i) {
        var r = m.getBoundingClientRect();
        if (r.bottom > v.top + 4 && r.top < v.bottom - 4 && r.right > v.left && r.left < v.right) { if (lo < 0) lo = i; hi = i; }
      });
      if (lo !== view[0] || hi !== view[1]) { view = [lo, hi]; paint(); }
    }
    function queueView() { if (!raf) raf = requestAnimationFrame(updateView); }

    // ---- painting
    function buildMap() {
      var ms = measures(), n = ms.length, step = 1, w = mapEl.clientWidth || 600, html = '';
      [1, 2, 4, 5, 8, 10, 16, 20, 25, 50, 100].some(function (c) { step = c; return w / Math.max(1, n) * c >= 30; });
      for (var i = 0; i < n; i++) {
        var num = number(i), sec = options.section ? options.section(i, ms[i]) : null, esc = sec ? String(sec).replace(/[&<>"]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }) : '';
        html += '<i data-sn-i="' + i + '"' + (sec ? ' class="has-sec" title="' + esc + '"' : '') + '>' +
          (sec && String(sec).length <= 3 ? '<b>' + esc + '</b>' : (num === 1 || (num > 0 && num % step === 0) ? '<u>' + num + '</u>' : '')) + '</i>';
      }
      mapEl.innerHTML = html;
      mapEl.style.setProperty('--sn-bars', n);
      cells = Array.prototype.slice.call(mapEl.children);
      var nums = ms.map(function (_, i) { return number(i); });
      gotoEl.min = Math.min.apply(null, nums.concat([1])); gotoEl.max = Math.max.apply(null, nums.concat([1]));
      mapEl.setAttribute('aria-valuemin', '1'); mapEl.setAttribute('aria-valuemax', String(n));
    }
    function paint() {
      var ms = measures(), s = sel(), loop = options.loopRange ? options.loopRange() : null;
      if (options.markMeasures !== false) ms.forEach(function (m, i) {
        m.classList.toggle('score-primed', i === s);
        m.classList.toggle('score-current', i === current);
      });
      cells.forEach(function (c, i) {
        c.classList.toggle('in-loop', !!loop && i >= loop[0] && i <= loop[1]);
        c.classList.toggle('is-start', i === s);
        c.classList.toggle('is-cur', i === current);
        c.classList.toggle('in-view', i >= view[0] && i <= view[1] && view[0] >= 0);
      });
      if (document.activeElement !== gotoEl) gotoEl.value = s >= 0 && ms[s] ? number(s) : '';
      var at = s >= 0 ? s : 0;
      q('[data-sn-step="-1"]').disabled = at <= 0;
      q('[data-sn-step="1"]').disabled = at >= ms.length - 1;
      mapEl.setAttribute('aria-valuenow', String(at + 1));
      mapEl.setAttribute('aria-valuetext', ms.length ? label(at) + ' of ' + ms.length : 'No measures');
      if (zoomOut) zoomOut.textContent = Math.round(zoom.get() * 100) + '%';
      if (followEl) followEl.setAttribute('aria-pressed', following ? 'true' : 'false');
      resumeEl.hidden = !(current >= 0 && following && paused);
    }
    function announce(s) { statusEl.textContent = s; }

    // ---- selecting
    function go(i, info) {
      info = info || {};
      if (!measures().length) return;
      i = clamp(i);
      var m = measures()[i];
      if (!info.noScroll) scrollToMeasure(i, { instant: info.preview });
      if (!info.preview && current >= 0) paused = false;
      var keep = options.onSelect ? options.onSelect(i, m, info) : undefined;
      if (keep !== false) selected = i;
      paint(); queueView();
      if (!info.preview) announce(label(i) + (current >= 0 ? ' — playing from here.' : ' — press Play to start here.'));
    }
    function step(dir) { var s = sel(); go(s < 0 ? Math.max(0, view[0]) : s + dir, { source: 'step' }); }
    function stepLine(dir) {
      var ls = lines(), s = sel(), at = s >= 0 ? s : Math.max(0, view[0]), li = 0;
      ls.forEach(function (start, k) { if (start <= at) li = k; });
      go(ls[Math.max(0, Math.min(ls.length - 1, li + dir))] || 0, { source: 'line' });
    }

    // ---- zoom
    function steps() { return zoom.steps || [0.5, 0.75, 1, 1.25, 1.5, 2]; }
    function setZoom(z) {
      var st = steps();
      z = Math.max(st[0], Math.min(st[st.length - 1], z));
      if (Math.abs(z - zoom.get()) < 1e-6) return;
      var keep = view[0] >= 0 ? view[0] : Math.max(0, sel());
      zoom.set(z);
      cache = null;
      if (measures()[keep]) scrollToMeasure(keep, { top: true, instant: true });
      paint(); queueView();
    }
    function stepZoom(dir) {
      var cur = zoom.get(), st = steps(), i;
      if (dir > 0) { for (i = 0; i < st.length; i++) if (st[i] > cur + 1e-6) return setZoom(st[i]); }
      else { for (i = st.length - 1; i >= 0; i--) if (st[i] < cur - 1e-6) return setZoom(st[i]); }
    }
    // The largest zoom (up to 100%) at which the whole score fits in the space it has.
    function fit() {
      var st = steps().filter(function (z) { return z <= 1 + 1e-6; }), pick = st[0];
      var room = options.fitRoom ? options.fitRoom() : (function (v) { return v.bottom - v.top - 40; })(viewport());
      var height = options.contentHeight || function () { var svg = surface.querySelector('svg'); return (svg || surface).getBoundingClientRect().height; };
      for (var i = st.length - 1; i >= 0; i--) {
        zoom.set(st[i]);
        if (height() <= room) { pick = st[i]; break; }
      }
      zoom.set(pick); cache = null;
      var v = viewport(), r = surface.getBoundingClientRect();
      if (isPage(scroller) || scroller !== surface) scrollBy(r.top - v.top - 8, 0, true); else scroller.scrollTop = 0;
      paint(); queueView();
      announce('Zoom ' + Math.round(pick * 100) + '%: ' + (pick === st[0] && height() > room ? 'as small as it goes.' : 'the whole score fits.'));
    }

    // ---- follow playback
    function setCurrent(i) {
      if (i === current) return;
      var was = current; current = i;
      if (i >= 0) active = api;
      if (i < 0 || was < 0) paused = false;
      paint();
      if (i < 0 || !following || paused) return;
      var m = measures()[i]; if (!m) return;
      var v = viewport(), sr = surface.getBoundingClientRect(), r = m.getBoundingClientRect();
      if (sr.bottom < v.top + 100) return;           // the reader scrolled past the score entirely: hold still
      if (r.bottom > v.bottom - 20 || r.top < v.top + 4 || (!isPage(scroller) && (r.right > v.right || r.left < v.left))) scrollToMeasure(i);
    }
    function pauseFollow() {
      if (current >= 0 && following && !paused) { paused = true; paint(); }
    }
    function setFollow(on, fromUser) {
      following = !!on; paused = false; paint();
      if (fromUser && options.onFollowChange) options.onFollowChange(following);
      if (following && current >= 0) scrollToMeasure(current);
    }

    // ---- events
    surface.addEventListener('click', function (e) {
      var t = e.target;
      if (options.ignore && t.closest && t.closest(options.ignore)) return;
      var ms = measures(), m = t.closest && t.closest(selector), i = m ? ms.indexOf(m) : -1;
      if (i < 0) i = ms.findIndex(function (x) { var r = x.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
      if (i < 0) return;
      e.scoreNavigation = true;    // lets the host's own delegated click handler know this one is taken
      active = api;
      go(i, { source: 'click', event: e, noScroll: true });
    });
    function mapIndex(ev) {
      var r = mapEl.getBoundingClientRect(), f = Math.max(0, Math.min(0.9999, (ev.clientX - r.left) / r.width));
      return Math.floor(f * measures().length);
    }
    mapEl.addEventListener('pointerdown', function (ev) {
      if (ev.button > 0) return;
      scrubbing = true; active = api;
      try { mapEl.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
      lastScrub = mapIndex(ev); go(lastScrub, { source: 'map', preview: true });
    });
    mapEl.addEventListener('pointermove', function (ev) {
      var i = mapIndex(ev);
      if (scrubbing) { if (i !== lastScrub) { lastScrub = i; go(i, { source: 'map', preview: true }); } }
      else if (measures()[i]) mapEl.title = label(i) + (options.section && options.section(i, measures()[i]) ? ' · ' + options.section(i, measures()[i]) : '');
    });
    mapEl.addEventListener('pointerup', function () { if (scrubbing) { scrubbing = false; go(lastScrub, { source: 'map', noScroll: true }); } });
    mapEl.addEventListener('pointercancel', function () { scrubbing = false; });
    mapEl.addEventListener('keydown', function (ev) {
      var s = Math.max(0, sel()), k = ev.key;
      if (k === 'ArrowRight' || k === 'ArrowUp') go(s + 1, { source: 'step' });
      else if (k === 'ArrowLeft' || k === 'ArrowDown') go(s - 1, { source: 'step' });
      else if (k === 'PageDown') stepLine(1);
      else if (k === 'PageUp') stepLine(-1);
      else if (k === 'Home') go(0, { source: 'step' });
      else if (k === 'End') go(measures().length - 1, { source: 'step' });
      else return;
      ev.preventDefault(); ev.stopPropagation();
    });
    nav.addEventListener('click', function (ev) {
      var t = ev.target; active = api;
      var st = t.closest('[data-sn-step]'); if (st) { step(Number(st.getAttribute('data-sn-step'))); return; }
      var z = t.closest('[data-sn-zoom]');
      if (z) { var v = z.getAttribute('data-sn-zoom'); if (v === 'fit') fit(); else stepZoom(Number(v)); return; }
      if (t.closest('.sn-follow')) { setFollow(!following, true); return; }
      if (t.closest('.sn-resume')) { paused = false; paint(); if (current >= 0) scrollToMeasure(current); }
    });
    function gotoNow() {
      var n = Math.round(Number(gotoEl.value)), i = indexOfNumber(n);
      if (gotoEl.value === '' || isNaN(n)) return;
      if (i < 0) { var ms = measures(); i = n < number(0) ? 0 : ms.length - 1; }
      go(i, { source: 'goto' });
    }
    gotoEl.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); gotoNow(); gotoEl.blur(); } });
    gotoEl.addEventListener('change', gotoNow);
    if (zoom) surface.addEventListener('wheel', function (ev) {       // Ctrl+wheel (and a trackpad pinch) zooms
      if (!ev.ctrlKey) return;
      ev.preventDefault();
      surface.__snWheel = (surface.__snWheel || 0) + ev.deltaY;
      if (Math.abs(surface.__snWheel) > 40) { stepZoom(surface.__snWheel < 0 ? 1 : -1); surface.__snWheel = 0; }
    }, { passive: false });
    // The reader scrolling on their own pauses following until they ask for it back.
    var scrollTarget = isPage(scroller) ? root : scroller;
    scrollTarget.addEventListener('wheel', function (ev) { if (!ev.ctrlKey) pauseFollow(); }, { passive: true });
    scrollTarget.addEventListener('touchmove', pauseFollow, { passive: true });
    if (!isPage(scroller)) scroller.addEventListener('pointerdown', function (ev) { if (ev.target === scroller) pauseFollow(); }, { passive: true });
    scrollTarget.addEventListener('scroll', queueView, { passive: true });
    if (!isPage(scroller) && scroller !== surface) root.addEventListener('scroll', queueView, { passive: true });
    root.addEventListener('resize', function () { queueView(); });
    var scope = options.keyScope || nav.parentNode;
    if (scope) {
      scope.addEventListener('pointerdown', function () { active = api; }, true);
      scope.addEventListener('focusin', function () { active = api; });
    }

    var api = {
      el: nav,
      refresh: function () {
        cache = null;
        var show = options.visible ? !!options.visible() : measures().length > 0;
        nav.hidden = !show;
        if (!show) return;
        if (!options.selectedIndex) selected = Math.min(selected, Math.max(0, measures().length - 1));
        buildMap(); paint(); queueView();
      },
      paint: paint,
      setCurrent: setCurrent,
      setFollow: function (on) { setFollow(on, false); },
      select: function (i) { selected = clamp(i); paint(); },
      reset: function () { selected = 0; current = -1; paused = false; paint(); announce(''); },
      go: go, fit: fit, setZoom: function (z) { if (zoom) setZoom(z); }, stepZoom: function (d) { if (zoom) stepZoom(d); },
      stepLine: stepLine, step: step,
      indexOf: function (m) { return measures().indexOf(m); },
      measures: measures,
      get selected() { return sel(); },
      get current() { return current; },
      get following() { return following && !paused; },
      keys: function (ev) {
        var k = ev.key;
        if (k === '[') stepLine(-1); else if (k === ']') stepLine(1);
        else if (!zoom) return false;
        else if (k === '-' || k === '_') stepZoom(-1);
        else if (k === '=' || k === '+') stepZoom(1);
        else if (k === '0') setZoom(1);
        else if (k === 'f' || k === 'F') fit();
        else return false;
        return true;
      },
      pauseFollow: pauseFollow
    };
    instances.push(api);
    if (!active) active = api;
    return api;
  };

  // Keys go to the score used last (clicked, focused or playing), and never while typing in a field.
  document.addEventListener('keydown', function (ev) {
    var a = active;
    if (!a || a.el.hidden || ev.ctrlKey || ev.metaKey || ev.altKey || inField(ev.target)) return;
    if (SCROLL_KEYS.indexOf(ev.key) >= 0) { a.pauseFollow(); return; }
    if (a.keys(ev)) ev.preventDefault();
  });
})(window);
