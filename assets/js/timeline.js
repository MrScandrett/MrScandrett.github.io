/* timeline.js — the one timeline engine for every lesson.
 *
 * Write the timeline as an ordinary list; the engine reads it. The list stays the
 * content (screen readers, print, no-JS all get it), and the engine adds a
 * toolbar with two views:
 *   List   — a tidy vertical timeline (always used for print).
 *   Track  — events placed to scale on a zoomable, draggable axis, stacked so
 *            labels never overlap; ←/→ step through events, +/− zoom, 0 fits.
 *
 * Usage:
 *   <ol data-timeline data-timeline-title="A Life in Computing">
 *     <li data-when="1906">Born in New York City.</li>
 *     <li><span class="any-year-class">1952</span> Writes the first compiler.</li>
 *     <li data-when="1939–1945" data-era>World War II</li>          era band
 *     <li data-when="c. 627 BC" data-group="Prophets">Jeremiah is called.</li>
 *     <li data-when="66 Ma" data-label="Chicxulub impact">…</li>
 *   </ol>
 *   (lesson-print-button.js loads this file whenever a page has [data-timeline];
 *   pages without it add <script src="…/assets/js/timeline.js" defer></script>.)
 *
 * Each item's date comes from data-when, else a <time>, else a short leading
 * element (its text is hidden and re-shown as the engine's date chip). Dates
 * understood: 1906, -500, 500 BC, AD 70, c. 627 BC, 1928–1934, 1928-34, 1590s,
 * 5th century BC, March 1876, 1947-09-09, 66 Ma / 66 million years ago, 4.5 Ga,
 * 12 ka, 300 years ago, present. If any date can't be read ("Impact day"), the
 * events are spaced evenly in source order instead of to scale.
 *
 * Per item: data-label (short track label), data-group (category, adds filter
 * chips), data-color, data-era (draw as a band, not an event).
 * Per timeline: data-timeline-title, data-timeline-scale="time|even|log",
 * data-timeline-view="list|track" (first visit only; the student's last choice
 * is remembered site-wide), data-timeline-gaps (show "12 years later" in the list).
 *
 * From JS: ClassroomOSTimeline.create(hostEl, { title, scale, events: [{ when,
 * label, text | html, group, color, era }] }) — or put the same object in
 * <script type="application/json" data-timeline>…</script>.
 */
(function (global) {
  'use strict';

  var hasDOM = typeof document !== 'undefined';
  if (hasDOM && global.ClassroomOSTimeline) return;

  var script = hasDOM ? document.currentScript : null;
  var STORE_KEY = 'classroomos:timeline:v1';
  var today = new Date();
  var NOW = today.getFullYear() + (today.getMonth() + (today.getDate() - 1) / 31) / 12;
  var DEEP = -20000; // earlier than this, the axis counts "years ago"
  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  // ---------------------------------------------------------------- dates
  // Years are decimals; BC n is -n (no year zero is fine at classroom precision).

  var UNITS = [
    [/^(?:bce?|b\.c\.(?:e\.)?)$/, function (n) { return -n; }],
    [/^(?:ce|ad|a\.d\.|c\.e\.)$/, function (n) { return n; }],
    [/^(?:ga|bya|b\.y\.a\.|billion (?:years|yrs) ago)$/, function (n) { return NOW - n * 1e9; }],
    [/^(?:ma|mya|m\.y\.a\.|million (?:years|yrs) ago)$/, function (n) { return NOW - n * 1e6; }],
    [/^(?:ka|kya|thousand (?:years|yrs) ago)$/, function (n) { return NOW - n * 1e3; }],
    [/^(?:years ago|yrs ago|years before present|bp)$/, function (n) { return NOW - n; }]
  ];

  function span(start, end, unit, bare) { return { start: start, end: end == null ? start : end, unit: unit || '', bare: !!bare }; }
  function num(s) { return parseFloat(String(s).replace(/,/g, '')); }
  function monthIndex(word) { return MONTHS.indexOf(String(word).slice(0, 3)); }

  function parseOne(s, decades) {
    s = s.trim().replace(/\?+$/, '').trim();
    if (!s) return null;
    var m;
    if (/^(?:today|now|present|the present)$/.test(s)) return span(NOW, NOW, 'ad');

    // ISO: 1947-09-09, 1947-09
    if ((m = s.match(/^(\d{3,4})-(\d{1,2})(?:-(\d{1,2}))?$/)) && +m[2] >= 1 && +m[2] <= 12) {
      return span(+m[1] + (m[2] - 1) / 12 + (m[3] ? (m[3] - 1) / 365 : 0), null, 'ad');
    }
    // Decades and centuries written as 1590s / 1900s
    if ((m = s.match(/^(\d{2,4})s$/)) && /0$/.test(m[1])) {
      var base = +m[1];
      return span(base, base + (/00$/.test(m[1]) && !decades ? 99 : 9), 'ad');
    }
    // 5th century BC, 10th–13th centuries
    if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)\s*-\s*(\d{1,2})(?:st|nd|rd|th)\s+centuries(?:\s+(ad|ce))?$/))) {
      return span((+m[1] - 1) * 100 + 1, +m[2] * 100, 'ad');
    }
    if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)\s+century(?:\s+(.+))?$/))) {
      var c = +m[1];
      if (m[2] && /^(?:bce?|b\.c\.(?:e\.)?)$/.test(m[2])) return span(-c * 100, -(c - 1) * 100 - 1, 'bc');
      if (m[2] && !/^(?:ce|ad|a\.d\.)$/.test(m[2])) return null;
      return span((c - 1) * 100 + 1, c * 100, 'ad');
    }
    // March 1876, Mar 14, 1879, 14 March 1879 (optionally BC)
    if ((m = s.match(/^(?:(\d{1,2})\s+)?([a-z]{3,9})\.?\s+(?:(\d{1,2}),?\s+)?(\d{1,4})(?:\s+(bce?|ad|ce))?$/)) && monthIndex(m[2]) !== -1) {
      var year = +m[4];
      if (m[5] && /^bc/.test(m[5])) year = -year;
      var day = +(m[1] || m[3] || 1);
      return span(year + monthIndex(m[2]) / 12 + (day - 1) / 365, null, 'ad');
    }
    // 1.5 million BCE, 2 million years
    if ((m = s.match(/^(\d[\d,]*(?:\.\d+)?)\s*(million|billion|thousand)\s+(?:bce?|b\.c\.(?:e\.)?|years|yrs)(?:\s+ago)?$/))) {
      return span(NOW - num(m[1]) * { thousand: 1e3, million: 1e6, billion: 1e9 }[m[2]], null, m[2] + ' years ago');
    }
    // AD 70
    if ((m = s.match(/^(?:ad|a\.d\.|ce)\s*(\d[\d,]*)$/))) return span(num(m[1]), null, 'ad');
    // 1906, -500, 500 BC, 66 Ma, 4.5 billion years ago
    if ((m = s.match(/^(-?\d[\d,]*(?:\.\d+)?)\s*([a-z][a-z.\s]*)?$/))) {
      var n = num(m[1]);
      if (!m[2]) return span(n, null, '', true);
      var unit = m[2].trim();
      for (var i = 0; i < UNITS.length; i++) {
        if (UNITS[i][0].test(unit)) return span(UNITS[i][1](n), null, unit);
      }
    }
    return null;
  }

  // Returns { start, end, approx, text } in decimal years, or null.
  function parseWhen(input) {
    var text = String(input == null ? '' : input).trim();
    if (!text) return null;
    var s = text.toLowerCase().replace(/[‐-―−]/g, '-').replace(/\s+/g, ' ');
    var approx = false;
    var lead = s.match(/^(?:c\.|ca\.|circa|about|around|approx\.?|~)\s*/);
    if (lead) { approx = true; s = s.slice(lead[0].length); }
    if (/\?$/.test(s)) approx = true;

    var single = parseOne(s);
    if (single) return finish(single, single.end);

    var sep = /\s*-\s*|\s+(?:to|until|through)\s+/g;
    var m;
    while ((m = sep.exec(s))) {
      var leftText = s.slice(0, m.index).trim();
      var rightText = s.slice(m.index + m[0].length).replace(/^(?:c\.|ca\.|circa|~)\s*/, '').trim();
      if (!leftText || !rightText) continue;
      // In a range, 1800s means a decade (1800s–1820s), not the century.
      var right = parseOne(rightText, true);
      if (!right) continue;
      var left = parseOne(leftText, true);
      // 1928-34 → 1934, 1770s-80s → 1780s
      var lm = leftText.match(/^(\d+)(s?)$/), rm = rightText.match(/^(\d+)(s?)$/);
      if (left && lm && rm && lm[2] === rm[2] && rm[1].length < lm[1].length) {
        right = parseOne(lm[1].slice(0, lm[1].length - rm[1].length) + rightText, true);
      }
      // 500-300 BC, 250-200 Ma: the unit written once applies to both ends
      if ((!left || left.bare) && !right.bare && right.unit && /^-?\d[\d,.]*$/.test(leftText)) {
        left = parseOne(leftText + ' ' + right.unit);
      }
      if (!left) continue;
      return finish(left, Math.max(left.end, right.end), Math.min(left.start, right.start));
    }
    return null;

    function finish(p, end, start) {
      var a = start == null ? p.start : start;
      return { start: a, end: Math.max(a, end == null ? p.end : end), approx: approx, text: text };
    }
  }

  function trimNumber(n) {
    return String(Math.round(n * 100) / 100);
  }

  function formatAgo(yearsAgo) {
    if (yearsAgo >= 1e9) return trimNumber(yearsAgo / 1e9) + ' billion yrs ago';
    if (yearsAgo >= 1e6) return trimNumber(yearsAgo / 1e6) + ' million yrs ago';
    return Math.round(yearsAgo).toLocaleString('en-US') + ' yrs ago';
  }

  // Tick label for year t. ctx: { deep, bc }
  function formatTick(t, ctx) {
    if (ctx.deep) return t >= NOW - 0.5 ? 'today' : formatAgo(NOW - t);
    var y = Math.round(t);
    if (y < 0) return (-y).toLocaleString('en-US') + ' BC';
    if (y === 0) return 'BC | AD';
    if (ctx.bc) return 'AD ' + y;
    return String(y);
  }

  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  // Evenly spaced round ticks covering [t0, t1], about `count` of them.
  function linearTicks(t0, t1, count, ctx) {
    if (!(t1 > t0)) return [t0];
    var origin = ctx && ctx.deep ? NOW : 0; // deep time ticks land on round "years ago"
    var step = niceStep(Math.max((t1 - t0) / Math.max(count, 1), 1));
    var out = [];
    for (var u = Math.ceil((t0 - origin) / step) * step; u <= t1 - origin + 1e-9; u += step) out.push(u + origin);
    return out;
  }

  function relativeText(parsed) {
    if (!parsed) return '';
    var ago = NOW - parsed.start;
    var out;
    if (parsed.start < DEEP) out = formatAgo(ago);
    else if (ago < 1) out = parsed.start > NOW ? 'in the future' : 'this year';
    else out = Math.round(ago).toLocaleString('en-US') + ' year' + (Math.round(ago) === 1 ? '' : 's') + ' ago';
    var length = parsed.end - parsed.start;
    if (length >= 1) {
      out += ' · lasted ' + (length >= 1e6 ? formatAgo(length).replace(' ago', '') : Math.round(length).toLocaleString('en-US') + ' years');
    }
    return (parsed.approx ? 'about ' : '') + out;
  }

  function gapText(a, b) {
    var gap = b.start - a.start;
    if (!(gap >= 1)) return '';
    if (gap >= 1e6) return formatAgo(gap).replace(' ago', '') + ' later';
    var g = Math.round(gap);
    return g.toLocaleString('en-US') + ' year' + (g === 1 ? '' : 's') + ' later';
  }

  var api = {
    NOW: NOW,
    parseWhen: parseWhen,
    formatTick: formatTick,
    linearTicks: linearTicks,
    relativeText: relativeText,
    gapText: gapText
  };

  if (!hasDOM) {
    if (typeof module === 'object' && module.exports) module.exports = api;
    return;
  }

  // ---------------------------------------------------------------- DOM

  var ROOT = new URL('../../', script && script.src ? script.src : global.location.href);
  var SCALE_NAMES = { time: 'True scale', log: 'Deep time', even: 'Even steps' };
  var SCALE_TIPS = {
    time: 'Every year gets the same width: see how short recorded history really is',
    log: 'Each step left is 10× further back: deep time and last week both fit',
    even: 'Events evenly spaced, in order'
  };
  var PALETTE = ['#2563eb', '#c2410c', '#15803d', '#9333ea', '#be123c', '#0e7490', '#a16207', '#4d7c0f'];
  var LANE_H = 52;
  var MAX_LANES = 6;
  var PAD = 28;
  var enhanced = typeof WeakSet === 'function' ? new WeakSet() : null;
  var all = [];

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function readStore() {
    try { return JSON.parse(global.localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeStore(obj) {
    try { global.localStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch (e) { /* private mode */ }
  }

  function addStyles() {
    if (document.querySelector('link[data-timeline-style]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('assets/css/components/timeline.css', ROOT).href;
    link.setAttribute('data-timeline-style', '');
    document.head.appendChild(link);
  }

  function shortText(text, max) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    var cut = text.slice(0, max);
    var stop = cut.search(/[.;:!?](?:\s|$)/);
    if (stop > 18) return cut.slice(0, stop);
    return cut.replace(/\s+\S*$/, '') + '…';
  }

  // A leading element that holds the date: short, first thing in the item.
  function leadingDateElement(li) {
    var first = li.firstElementChild;
    if (!first || !/^(SPAN|B|STRONG|EM|I|SMALL|TIME|MARK|DIV|P|H3|H4)$/.test(first.tagName)) return null;
    var before = '';
    for (var n = li.firstChild; n && n !== first; n = n.nextSibling) before += n.textContent || '';
    if (before.trim()) return null;
    var text = first.textContent.trim();
    if (!text || text.length > 40 || first.children.length) return null;
    if (parseWhen(text) || /year|date|time|when|era|age/i.test(first.className)) return first;
    return null;
  }

  function readItem(li, index) {
    var source = null;
    var when = li.getAttribute('data-when');
    var display = when;
    if (when == null) {
      var time = li.querySelector('time');
      source = time && li.firstElementChild === time ? time : leadingDateElement(li);
      if (source) {
        display = source.textContent.trim();
        when = source.getAttribute('datetime') || display;
      } else if (time) {
        display = time.textContent.trim();
        when = time.getAttribute('datetime') || display;
      }
    }
    var titleEl = Array.prototype.find.call(li.querySelectorAll('strong, b, h3, h4'), function (node) { return node !== source; });
    var rest = li.textContent;
    if (source) rest = rest.replace(source.textContent, '');
    return {
      li: li,
      index: index,
      source: source,
      when: when || '',
      display: (display || '').trim(),
      parsed: parseWhen(when),
      label: li.getAttribute('data-label') || shortText(titleEl ? titleEl.textContent : rest, 34),
      group: li.getAttribute('data-group') || '',
      color: li.getAttribute('data-color') || '',
      era: li.hasAttribute('data-era'),
      major: li.hasAttribute('data-major')
    };
  }

  // The page colour behind the timeline, so stacked labels can hide the stems behind them.
  function paperBehind(node) {
    for (var n = node; n && n.nodeType === 1; n = n.parentElement) {
      var bg = getComputedStyle(n).backgroundColor;
      var m = bg && bg.match(/rgba?\(([^)]+)\)/);
      if (m) {
        var parts = m[1].split(/[,\s/]+/).filter(Boolean);
        if (parts.length < 4 || parseFloat(parts[3]) > 0.85) return bg;
      }
    }
    return getComputedStyle(document.body).backgroundColor || '#fff';
  }

  function Timeline(list, host) {
    var self = this;
    this.list = list;
    this.host = host;
    this.opts = {
      title: host.getAttribute('data-timeline-title') || '',
      scale: host.getAttribute('data-timeline-scale') || '',
      view: host.getAttribute('data-timeline-view') || '',
      gaps: host.hasAttribute('data-timeline-gaps'),
      scales: (host.getAttribute('data-timeline-scales') || '').split(/[\s,]+/).filter(function (k) { return SCALE_NAMES[k]; }),
      search: host.hasAttribute('data-timeline-search'),
      lanes: Math.min(Math.max(parseInt(host.getAttribute('data-timeline-lanes'), 10) || MAX_LANES, 1), 12)
    };
    this.query = '';
    this.zoom = 1;
    this.sel = -1;
    this.widths = null;
    this.filter = null;
    this.match = null;

    var items = Array.prototype.filter.call(list.children, function (n) { return n.tagName === 'LI'; }).map(readItem);
    items.forEach(function (it) { it.search = it.li.textContent.replace(/\s+/g, ' ').toLowerCase(); });
    this.items = items;
    this.events = items.filter(function (it) { return !it.era; });
    this.eras = items.filter(function (it) { return it.era; });
    if (!this.events.length) return;

    // Step numbers (1, 2, 3 …) are an order, not the years AD 1-3.
    var dated = this.events.every(function (it) { return it.parsed && !/^\d{1,2}$/.test(it.when.trim()); });
    this.dated = dated;
    if (!dated) this.opts.scales = [];
    this.scale = !dated ? 'even' : SCALE_NAMES[this.opts.scales[0] || this.opts.scale] ? (this.opts.scales[0] || this.opts.scale) : 'time';
    var starts = items.filter(function (it) { return it.parsed; }).map(function (it) { return it.parsed.start; });
    this.baseCtx = { deep: dated && Math.min.apply(null, starts) < DEEP, bc: dated && Math.min.apply(null, starts) < 0 };
    this.ctx = { deep: this.baseCtx.deep || this.scale === 'log', bc: this.baseCtx.bc };

    var groups = [];
    items.forEach(function (it) { if (it.group && groups.indexOf(it.group) === -1) groups.push(it.group); });
    this.groups = groups;
    items.forEach(function (it) {
      it.tint = it.color || (it.group ? PALETTE[groups.indexOf(it.group) % PALETTE.length] : '');
    });

    this.build();
    this.selectIndex(0, { quiet: true });
    var store = readStore();
    var fallback = this.events.length >= 3 && (this.root.clientWidth || global.innerWidth) >= 640 ? 'track' : 'list';
    this.setView(store.view || this.opts.view || fallback, { save: false });

    if (typeof ResizeObserver === 'function') {
      var lastW = 0;
      new ResizeObserver(function () {
        var w = self.viewport.clientWidth;
        if (w && w !== lastW) { lastW = w; self.widths = null; self.layout(); }
      }).observe(this.viewport);
    }
  }

  Timeline.prototype.build = function () {
    var self = this;
    var list = this.list;
    var root = el('div', 'tl');
    root.setAttribute('data-memory-ignore', '');
    list.parentNode.insertBefore(root, list);
    this.root = root;

    // Toolbar
    var bar = el('div', 'tl-bar');
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', (this.opts.title || 'Timeline') + ' controls');
    if (this.opts.title) bar.appendChild(el('h3', 'tl-title', this.opts.title));

    var views = el('div', 'tl-seg');
    this.viewButtons = {};
    [['list', 'List'], ['track', 'Track']].forEach(function (v) {
      var b = el('button', 'tl-btn', v[1]);
      b.type = 'button';
      b.title = v[0] === 'track' ? 'Events placed to scale on a line you can zoom and drag' : 'Events as a list';
      b.addEventListener('click', function () { self.setView(v[0]); });
      self.viewButtons[v[0]] = b;
      views.appendChild(b);
    });
    bar.appendChild(views);

    var step = el('div', 'tl-step');
    this.prevBtn = this.button('◀', 'Previous event (←)', function () { self.step(-1, true); });
    this.counter = el('span', 'tl-count');
    this.counter.setAttribute('aria-live', 'polite');
    this.nextBtn = this.button('▶', 'Next event (→)', function () { self.step(1, true); });
    step.appendChild(this.prevBtn);
    step.appendChild(this.counter);
    step.appendChild(this.nextBtn);
    bar.appendChild(step);

    var zoom = el('div', 'tl-zoom tl-track-only');
    zoom.appendChild(this.button('−', 'Zoom out (−)', function () { self.setZoom(self.zoom / 1.8); }));
    zoom.appendChild(this.button('Fit', 'Show the whole timeline (0)', function () { self.setZoom(1); self.viewport.scrollLeft = 0; }));
    zoom.appendChild(this.button('+', 'Zoom in (+)', function () { self.setZoom(self.zoom * 1.8); }));
    bar.appendChild(zoom);

    if (this.opts.scales.length > 1) {
      var scales = el('div', 'tl-seg tl-track-only');
      this.scaleButtons = {};
      this.opts.scales.forEach(function (k) {
        var b = el('button', 'tl-btn', SCALE_NAMES[k]);
        b.type = 'button';
        b.title = SCALE_TIPS[k];
        b.setAttribute('aria-pressed', String(k === self.scale));
        b.addEventListener('click', function () { self.setScale(k); });
        self.scaleButtons[k] = b;
        scales.appendChild(b);
      });
      bar.appendChild(scales);
    }

    if (this.opts.search) {
      var search = el('input', 'tl-search');
      search.type = 'search';
      search.placeholder = 'Find an event, person or lesson…';
      search.setAttribute('aria-label', 'Search the timeline');
      var searchTimer = 0;
      search.addEventListener('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          self.query = search.value.trim().toLowerCase();
          self.refresh();
          if (self.query && self.sel !== -1) self.reveal(true);
        }, 120);
      });
      bar.appendChild(search);
    }

    if (this.groups.length > 1) {
      var chips = el('div', 'tl-chips');
      chips.setAttribute('aria-label', 'Show categories');
      this.chipButtons = this.groups.map(function (g, i) {
        var chip = el('button', 'tl-chip', g);
        chip.type = 'button';
        chip.style.setProperty('--tl-c', self.items.find(function (it) { return it.group === g; }).tint || PALETTE[i]);
        chip.setAttribute('aria-pressed', 'true');
        chip.addEventListener('click', function () { self.toggleGroup(g); });
        chips.appendChild(chip);
        return chip;
      });
      bar.appendChild(chips);
    }
    if (this.eras.length > 1) {
      var jump = el('div', 'tl-chips tl-jump tl-track-only');
      jump.setAttribute('aria-label', 'Zoom to an era');
      jump.appendChild(el('span', 'tl-jump-label', 'Zoom to'));
      this.eras.forEach(function (era) {
        var b = el('button', 'tl-chip tl-jump-btn', era.label);
        b.type = 'button';
        b.title = era.label + (era.display ? ' · ' + era.display : '');
        b.addEventListener('click', function () { self.zoomToEra(era); });
        jump.appendChild(b);
      });
      bar.appendChild(jump);
    }
    root.appendChild(bar);

    // Track
    var track = el('div', 'tl-track');
    var viewport = el('div', 'tl-viewport');
    var canvas = el('div', 'tl-canvas');
    this.bandLayer = el('div', 'tl-bands');
    this.markLayer = el('div', 'tl-marks');
    this.axis = el('div', 'tl-axis');
    this.ticks = el('div', 'tl-ticks');
    this.ticks.setAttribute('aria-hidden', 'true');
    canvas.appendChild(this.bandLayer);
    canvas.appendChild(this.axis);
    canvas.appendChild(this.ticks);
    canvas.appendChild(this.markLayer);
    viewport.appendChild(canvas);
    track.appendChild(viewport);
    track.appendChild(el('p', 'tl-hint', 'Drag or scroll sideways to move · Ctrl + wheel or +/− to zoom · ← → step through events'));
    this.detail = el('div', 'tl-detail');
    this.detail.setAttribute('aria-live', 'polite');
    track.appendChild(this.detail);
    root.appendChild(track);
    this.track = track;
    this.viewport = viewport;
    this.canvas = canvas;

    this.events.forEach(function (it, i) {
      var mark = el('button', 'tl-mark');
      mark.type = 'button';
      mark.tabIndex = -1;
      if (it.tint) mark.style.setProperty('--tl-c', it.tint);
      mark.appendChild(el('span', 'tl-mark-date', it.display || it.when));
      mark.appendChild(el('span', 'tl-mark-label', it.label));
      if (it.parsed && it.parsed.end > it.parsed.start) mark.appendChild(el('span', 'tl-range'));
      mark.setAttribute('aria-label', (it.display ? it.display + ': ' : '') + it.label);
      mark.title = (it.display ? it.display + ' · ' : '') + it.label;
      mark.addEventListener('click', function () { if (!self.dragged) self.selectIndex(i, { focus: true }); });
      it.mark = mark;
      self.markLayer.appendChild(mark);
    });
    this.eras.forEach(function (it) {
      var band = el('div', 'tl-band');
      if (it.tint) band.style.setProperty('--tl-c', it.tint);
      var bandLabel = el('button', 'tl-band-label', it.label);
      bandLabel.type = 'button';
      bandLabel.title = 'Zoom to ' + it.label + (it.display ? ' · ' + it.display : '');
      band.title = it.label + (it.display ? ' · ' + it.display : '');
      bandLabel.addEventListener('click', function () { if (!self.dragged) self.zoomToEra(it); });
      band.appendChild(bandLabel);
      it.band = band;
      self.bandLayer.appendChild(band);
    });

    // List
    list.classList.add('tl-list');
    if (this.items.length > 40) list.classList.add('tl-long');
    root.appendChild(list);
    this.items.forEach(function (it) {
      var li = it.li;
      li.classList.add(it.era ? 'tl-era-row' : 'tl-item');
      if (it.tint) li.style.setProperty('--tl-c', it.tint);
      if (it.source) it.source.classList.add('tl-src');
      li.insertBefore(el('span', 'tl-date', it.display || it.when), li.firstChild);
      if (!it.era) {
        li.addEventListener('click', function (e) {
          if (e.target.closest('a, button, input, summary, figure')) return;
          self.selectIndex(self.events.indexOf(it), { quiet: true });
        });
      }
    });

    this.renderGaps();

    // Keyboard, wheel zoom and drag-to-pan on the track.
    root.addEventListener('keydown', function (e) {
      if (root.dataset.tlView !== 'track' || e.altKey || e.metaKey || e.ctrlKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      var handled = true;
      if (e.key === 'ArrowRight') self.step(1, true);
      else if (e.key === 'ArrowLeft') self.step(-1, true);
      else if (e.key === 'Home') self.selectIndex(self.firstVisible(1), { focus: true });
      else if (e.key === 'End') self.selectIndex(self.firstVisible(-1), { focus: true });
      else if (e.key === '+' || e.key === '=') self.setZoom(self.zoom * 1.8);
      else if (e.key === '-' || e.key === '_') self.setZoom(self.zoom / 1.8);
      else if (e.key === '0') { self.setZoom(1); viewport.scrollLeft = 0; }
      else handled = false;
      if (handled) e.preventDefault();
    });
    viewport.addEventListener('wheel', function (e) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      var r = viewport.getBoundingClientRect();
      self.setZoom(self.zoom * Math.exp(-e.deltaY * 0.01), e.clientX - r.left);
    }, { passive: false });

    var drag = null;
    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: viewport.scrollLeft, id: e.pointerId };
      self.dragged = false;
    });
    viewport.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!self.dragged && Math.abs(dx) < 5) return;
      if (!self.dragged) { self.dragged = true; viewport.setPointerCapture(e.pointerId); viewport.classList.add('is-dragging'); }
      viewport.scrollLeft = drag.left - dx;
    });
    function endDrag() {
      if (!drag) return;
      drag = null;
      viewport.classList.remove('is-dragging');
      setTimeout(function () { self.dragged = false; }, 0);
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    var tickFrame = 0;
    viewport.addEventListener('scroll', function () {
      if (tickFrame) return;
      tickFrame = requestAnimationFrame(function () { tickFrame = 0; self.renderTicks(); });
    }, { passive: true });
  };

  // "12 years later" between visible list items (data-timeline-gaps).
  Timeline.prototype.renderGaps = function () {
    if (!this.opts.gaps) return;
    var self = this;
    var prev = null;
    this.events.forEach(function (it) {
      var old = it.li.querySelector(':scope > .tl-gap');
      if (old) old.remove();
      it.li.classList.remove('tl-has-gap');
      if (!self.visible(it)) return;
      var gap = prev && prev.parsed && it.parsed ? gapText(prev.parsed, it.parsed) : '';
      if (gap) {
        it.li.insertBefore(el('span', 'tl-gap', gap), it.li.firstChild);
        it.li.classList.add('tl-has-gap');
      }
      prev = it;
    });
  };

  Timeline.prototype.button = function (text, label, onClick) {
    var b = el('button', 'tl-btn', text);
    b.type = 'button';
    b.title = label;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', onClick);
    return b;
  };

  Timeline.prototype.visible = function (it) {
    if (this.query && !it.era && it.search.indexOf(this.query) === -1) return false;
    if (this.match && !it.era && !this.match(it)) return false;
    return !this.filter || !it.group || this.filter.indexOf(it.group) !== -1;
  };

  Timeline.prototype.firstVisible = function (dir) {
    for (var k = 0; k < this.events.length; k++) {
      var i = dir > 0 ? k : this.events.length - 1 - k;
      if (this.visible(this.events[i])) return i;
    }
    return -1;
  };

  Timeline.prototype.toggleGroup = function (group) {
    var on = this.filter ? this.filter.slice() : this.groups.slice();
    var at = on.indexOf(group);
    if (at === -1) on.push(group); else if (on.length > 1) on.splice(at, 1);
    this.filter = on.length === this.groups.length ? null : on;
    var self = this;
    this.chipButtons.forEach(function (chip, i) {
      chip.setAttribute('aria-pressed', String(on.indexOf(self.groups[i]) !== -1));
    });
    this.refresh();
  };

  // Re-apply filters (categories, search) to both views.
  Timeline.prototype.refresh = function () {
    var self = this;
    this.items.forEach(function (it) { it.li.classList.toggle('tl-off', !self.visible(it)); });
    this.renderGaps();
    if (this.sel === -1 || !this.visible(this.events[this.sel])) {
      var first = this.firstVisible(1);
      if (first !== -1) this.selectIndex(first, { quiet: true });
      else this.updateCounter();
    } else this.updateCounter();
    this.widths = null;
    this.layout();
  };

  // A page-level filter on top of categories and search: fn(item) -> show it? (null clears).
  Timeline.prototype.setMatch = function (fn) {
    this.match = typeof fn === 'function' ? fn : null;
    this.refresh();
  };

  Timeline.prototype.setScale = function (scale) {
    if (!SCALE_NAMES[scale] || (scale !== 'even' && !this.dated)) return;
    this.scale = scale;
    this.ctx = { deep: this.baseCtx.deep || scale === 'log', bc: this.baseCtx.bc };
    for (var k in this.scaleButtons) this.scaleButtons[k].setAttribute('aria-pressed', String(k === scale));
    this.zoom = 1;
    this.zoomFloor = 0;
    this.widths = null;
    this.layout();
    this.viewport.scrollLeft = 0;
    this.reveal(false);
  };

  // Fill the track with one era.
  Timeline.prototype.zoomToEra = function (era) {
    if (era && era.nodeType === 1) era = this.items.find(function (it) { return it.li === era; });
    if (!era) return;
    this.emit('timeline:era', { li: era.li, label: era.label });
    if (this.root.dataset.tlView !== 'track') return;
    var pos = this.positions();
    var r = pos.get(era);
    if (!r) return;
    var vw = this.viewport.clientWidth;
    var width = Math.max(r[1] - r[0], 1e-6);
    this.zoom = Math.min(Math.max(0.9 / width, 1), this.maxZoom * 4);
    this.zoomFloor = this.zoom;
    this.layout();
    var inner = this.canvas.offsetWidth - PAD * 2;
    this.viewport.scrollLeft = PAD + r[0] * inner - vw * 0.05;
    this.renderTicks();
    // Select the first event inside the era.
    for (var i = 0; i < this.events.length; i++) {
      var p = pos.get(this.events[i]);
      if (p != null && p >= r[0] - 1e-9 && this.visible(this.events[i])) { this.selectIndex(i, { quiet: true }); break; }
    }
  };

  // Pages can follow along: timeline:select (an event is chosen), timeline:era (an era is zoomed).
  Timeline.prototype.emit = function (type, detail) {
    if (typeof CustomEvent !== 'function') return;
    this.root.dispatchEvent(new CustomEvent(type, { bubbles: true, detail: detail }));
  };

  Timeline.prototype.setView = function (view, opts) {
    if (view !== 'list' && view !== 'track') view = 'list';
    this.root.dataset.tlView = view;
    for (var k in this.viewButtons) this.viewButtons[k].setAttribute('aria-pressed', String(k === view));
    if (!opts || opts.save !== false) {
      var store = readStore();
      store.view = view;
      writeStore(store);
    }
    if (view === 'track') {
      this.widths = null;
      this.layout();
      this.reveal(false);
    }
  };

  // Positions on a 0..1 line.
  Timeline.prototype.positions = function () {
    var self = this;
    var events = this.events.filter(function (it) { return self.visible(it); });
    var map = new Map();
    if (this.scale === 'even') {
      events.forEach(function (it, i) { map.set(it, events.length === 1 ? 0.5 : i / (events.length - 1)); });
      // Eras cover the events that follow them in the source, up to the next era.
      this.eras.forEach(function (era) {
        var start = -1, end = -1, pastEra = false;
        for (var i = 0; i < self.items.length; i++) {
          var it = self.items[i];
          if (it === era) { pastEra = true; continue; }
          if (!pastEra) continue;
          if (it.era) break;
          if (map.has(it)) { if (start === -1) start = map.get(it); end = map.get(it); }
        }
        if (start !== -1) map.set(era, [start, end]);
      });
      this.p = null;
      return map;
    }
    var f = this.scale === 'log'
      ? function (t) { return -Math.log10(Math.max(NOW - t, 1)); }
      : function (t) { return t; };
    var lo = Infinity, hi = -Infinity;
    events.concat(this.eras).forEach(function (it) {
      if (!it.parsed) return;
      lo = Math.min(lo, f(it.parsed.start));
      hi = Math.max(hi, f(it.parsed.end));
    });
    if (!(hi > lo)) { lo -= 1; hi += 1; }
    var pad = (hi - lo) * 0.02;
    lo -= pad; hi += pad;
    var norm = function (t) { return (f(t) - lo) / (hi - lo); };
    this.p = { f: f, lo: lo, hi: hi, norm: norm };
    events.forEach(function (it) { map.set(it, norm(it.parsed.start)); });
    this.eras.forEach(function (era) { if (era.parsed) map.set(era, [norm(era.parsed.start), norm(era.parsed.end)]); });

    // Zoom far enough in that the closest two events sit ~150px apart.
    var ps = events.map(function (it) { return map.get(it); }).sort(function (a, b) { return a - b; });
    var gap = Infinity;
    for (var i = 1; i < ps.length; i++) if (ps[i] - ps[i - 1] > 1e-9) gap = Math.min(gap, ps[i] - ps[i - 1]);
    this.maxZoom = isFinite(gap) ? Math.min(Math.max(150 / (gap * Math.max(this.viewport.clientWidth, 320)), 4), 4000) : 4;
    return map;
  };

  Timeline.prototype.layout = function () {
    if (this.root.dataset.tlView !== 'track') return;
    var vw = this.viewport.clientWidth;
    if (!vw) return;
    var self = this;
    this.root.style.setProperty('--tl-paper', paperBehind(this.root));
    var pos = this.positions();
    if (this.scale === 'even') this.maxZoom = Math.max(4, this.events.length * 170 / vw);
    this.maxZoom = Math.max(this.maxZoom, this.zoomFloor || 0);
    this.zoom = Math.min(Math.max(this.zoom, 1), this.maxZoom);
    var W = Math.max(vw, 320) * this.zoom;
    var inner = W - PAD * 2;
    var x = function (p) { return PAD + p * inner; };
    this.canvas.style.width = W + 'px';

    // Measure label widths once per size (one read pass, no thrash).
    var events = this.events.filter(function (it) { return pos.has(it); });
    if (!this.widths) {
      this.events.forEach(function (it) { it.mark.classList.remove('tl-compact'); it.mark.style.minWidth = ''; });
      this.widths = new Map(events.map(function (it) { return [it, it.mark.offsetWidth]; }));
    }

    // Era bands: up to three label rows at the top; a label with no room hides (the band stays).
    var bandRows = [];
    this.eras.forEach(function (era) {
      var r = pos.get(era);
      era.band.hidden = !r;
      if (!r) return;
      var x0 = x(r[0]), x1 = Math.max(x(r[1]), x0 + 4);
      var label = era.band.firstChild;
      label.hidden = false;
      var labelW = era.labelW || (era.labelW = label.offsetWidth) || era.label.length * 7.5 + 12;
      var start = Math.min(x0, W - 4 - labelW);
      var row = 0;
      while (row < 3 && bandRows[row] != null && bandRows[row] > start - 6) row++;
      if (row === 3) label.hidden = true;
      else bandRows[row] = start + labelW;
      label.style.left = (start - x0 + 2) + 'px';
      era.band.style.left = x0 + 'px';
      era.band.style.width = (x1 - x0) + 'px';
      era.band.style.setProperty('--row', row === 3 ? 0 : row);
    });
    var bandsH = bandRows.length ? bandRows.length * 24 + 6 : 0;

    // Lanes: lane 0 sits nearest the axis. Each label goes in the lowest lane where it
    // fits, to the right of its dot or else to the left; ranges always run right.
    var lanes = [];
    var placed = [];
    function fits(lane, a, b) {
      return a >= 2 && b <= W - 2 && lane.every(function (iv) { return b + 8 <= iv[0] || a >= iv[1] + 8; });
    }
    var maxLanes = this.opts.lanes;
    // Headline events (data-major) claim label room first; the rest fill in around them.
    var order = events.filter(function (it) { return it.major; }).concat(events.filter(function (it) { return !it.major; }));
    order.forEach(function (it) {
      var px = x(pos.get(it));
      var w = self.widths.get(it) || 120;
      var range = it.parsed && it.parsed.end > it.parsed.start && self.p ? x(self.p.norm(it.parsed.end)) - px : 0;
      var width = Math.max(w, range);
      var lane = -1, flip = false;
      for (var l = 0; l < maxLanes && lane === -1; l++) {
        lanes[l] = lanes[l] || [];
        if (fits(lanes[l], px, px + width)) lane = l;
        else if (!range && fits(lanes[l], px - width, px)) { lane = l; flip = true; }
      }
      if (lane !== -1) lanes[lane].push(flip ? [px - width, px] : [px, px + width]);
      placed.push({ it: it, px: px, flip: flip, lane: lane, range: range, width: width });
    });
    lanes = lanes.filter(function (lane) { return lane.length; });
    var axisY = bandsH + Math.max(lanes.length, 1) * LANE_H + 14;
    this.canvas.style.height = (axisY + 34) + 'px';
    this.canvas.style.setProperty('--axis-y', axisY + 'px');
    this.canvas.style.setProperty('--bands-h', bandsH + 'px');

    this.events.forEach(function (it) { it.mark.hidden = !pos.has(it); });
    placed.forEach(function (p) {
      var m = p.it.mark;
      m.classList.toggle('tl-flip', p.flip);
      m.classList.toggle('tl-compact', p.lane === -1);
      if (p.lane === -1) {
        m.style.left = p.px + 'px';
        m.style.top = axisY + 'px';
        return;
      }
      var top = axisY - 10 - (p.lane + 1) * LANE_H;
      m.style.left = (p.flip ? p.px - p.width : p.px) + 'px';
      m.style.top = top + 'px';
      m.style.minWidth = p.width + 'px';
      m.style.setProperty('--stem', (axisY - top - (LANE_H - 8)) + 'px');
      var bar = m.querySelector('.tl-range');
      if (bar) bar.style.width = Math.max(p.range, 4) + 'px';
    });
    this.renderTicks();
  };

  Timeline.prototype.renderTicks = function () {
    if (this.root.dataset.tlView !== 'track') return;
    var self = this;
    var ticks = this.ticks;
    ticks.textContent = '';
    var W = this.canvas.offsetWidth;
    var inner = W - PAD * 2;
    if (!this.p) {
      // Even spacing: no time axis, just a dot under each event.
      return;
    }
    var view0 = this.viewport.scrollLeft - 160, view1 = this.viewport.scrollLeft + this.viewport.clientWidth + 160;
    var p = this.p;
    var toX = function (t) { return PAD + p.norm(t) * inner; };
    var list = [];
    if (this.scale === 'log') {
      // Round "years ago" values: 1, 2, 5, 10, 20, 50 …
      var agoHi = Math.pow(10, -p.lo), agoLo = Math.max(Math.pow(10, -p.hi), 1);
      var lastX = -Infinity;
      for (var k = Math.floor(Math.log10(agoHi)); k >= 0; k--) {
        [5, 2, 1].forEach(function (mult) {
          var ago = mult * Math.pow(10, k);
          if (ago > agoHi || ago < agoLo) return;
          var t = NOW - ago, px = toX(t);
          if (px - lastX < 90) return;
          lastX = px;
          list.push(t);
        });
      }
    } else {
      var tAt = function (px) { return p.lo + (px - PAD) / inner * (p.hi - p.lo); };
      var t0 = tAt(Math.max(view0, PAD)), t1 = tAt(Math.min(view1, W - PAD));
      var per = (p.hi - p.lo) / inner * 130; // ~130px between ticks
      list = linearTicks(t0, t1, Math.max((t1 - t0) / per, 1), this.ctx);
    }
    list.forEach(function (t) {
      var px = toX(t);
      if (px < view0 || px > view1 || px < PAD - 1 || px > W - PAD + 1) return;
      var tick = el('span', 'tl-tick', formatTick(t, self.ctx));
      tick.style.left = px + 'px';
      ticks.appendChild(tick);
    });
    if (!this.ctx.deep && p.norm(NOW) <= 1 && p.norm(NOW) >= 0) {
      var now = el('span', 'tl-tick tl-now', 'today');
      now.style.left = toX(NOW) + 'px';
      ticks.appendChild(now);
    }
  };

  Timeline.prototype.setZoom = function (z, anchor) {
    var vw = this.viewport.clientWidth;
    if (!vw) return;
    if (anchor == null) {
      // Keep the selected event in place if it's on screen, else the middle.
      var m = this.sel !== -1 && this.events[this.sel].mark;
      var mx = m ? m.offsetLeft - this.viewport.scrollLeft : -1;
      anchor = mx > 0 && mx < vw ? mx : vw / 2;
    }
    var oldW = this.canvas.offsetWidth || vw;
    var frac = (this.viewport.scrollLeft + anchor) / oldW;
    this.zoom = Math.min(Math.max(z, 1), this.maxZoom || 4);
    this.layout();
    this.viewport.scrollLeft = frac * this.canvas.offsetWidth - anchor;
    this.renderTicks();
  };

  Timeline.prototype.step = function (dir, focus) {
    var i = this.sel;
    do { i += dir; } while (i >= 0 && i < this.events.length && !this.visible(this.events[i]));
    if (i < 0 || i >= this.events.length) return;
    this.selectIndex(i, { focus: focus });
  };

  Timeline.prototype.updateCounter = function () {
    var self = this;
    var visible = this.events.filter(function (it) { return self.visible(it); });
    var at = visible.indexOf(this.events[this.sel]) + 1;
    this.counter.textContent = at + ' / ' + visible.length;
    this.prevBtn.disabled = at <= 1;
    this.nextBtn.disabled = at >= visible.length;
  };

  Timeline.prototype.selectIndex = function (i, opts) {
    if (i < 0 || i >= this.events.length) return;
    opts = opts || {};
    var self = this;
    this.sel = i;
    var it = this.events[i];
    this.events.forEach(function (ev, k) {
      var on = k === i;
      ev.mark.tabIndex = on ? 0 : -1;
      if (on) { ev.mark.setAttribute('aria-current', 'true'); ev.li.setAttribute('data-tl-current', ''); }
      else { ev.mark.removeAttribute('aria-current'); ev.li.removeAttribute('data-tl-current'); }
    });
    this.updateCounter();

    // Detail card: the item's own content (images, links and all), plus how long ago.
    var detail = this.detail;
    detail.textContent = '';
    if (it.tint) detail.style.setProperty('--tl-c', it.tint); else detail.style.removeProperty('--tl-c');
    var head = el('div', 'tl-detail-head');
    head.appendChild(el('span', 'tl-date', it.display || it.when));
    var rel = relativeText(it.parsed);
    if (rel) head.appendChild(el('span', 'tl-ago', rel));
    if (it.group) head.appendChild(el('span', 'tl-detail-group', it.group));
    detail.appendChild(head);
    var body = el('div', 'tl-detail-body');
    var clone = it.li.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll('.tl-date, .tl-gap, .tl-src'), function (n) { n.remove(); });
    Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
    while (clone.firstChild) body.appendChild(clone.firstChild);
    detail.appendChild(body);

    // A crowded event shows as a bare dot; zoom in until it gets its label.
    if (!opts.quiet && this.root.dataset.tlView === 'track') {
      for (var guard = 0; guard < 8 && it.mark.classList.contains('tl-compact') && this.zoom < this.maxZoom; guard++) {
        this.setZoom(this.zoom * 1.6);
      }
    }
    if (opts.focus && this.root.dataset.tlView === 'track') it.mark.focus({ preventScroll: true });
    this.emit('timeline:select', { li: it.li, label: it.label });
    if (!opts.quiet) this.reveal(true);
  };

  // Scroll the selected event into view (horizontally only; never jumps the page).
  Timeline.prototype.reveal = function (smooth) {
    if (this.root.dataset.tlView !== 'track' || this.sel === -1) return;
    var m = this.events[this.sel].mark;
    if (m.hidden) return;
    var vp = this.viewport;
    var x = m.classList.contains('tl-flip') ? m.offsetLeft + m.offsetWidth : m.offsetLeft;
    if (x > vp.scrollLeft + 40 && x < vp.scrollLeft + vp.clientWidth - 60) return;
    var left = x - vp.clientWidth / 2;
    if (smooth && vp.scrollTo) vp.scrollTo({ left: left, behavior: 'smooth' }); else vp.scrollLeft = left;
  };

  // ---------------------------------------------------------------- setup

  function enhance(node) {
    if (enhanced ? enhanced.has(node) : node.__timeline) return null;
    if (enhanced) enhanced.add(node); else node.__timeline = true;

    if (node.tagName === 'SCRIPT') {
      var config;
      try { config = JSON.parse(node.textContent); } catch (e) { console.warn('timeline: bad JSON', e); return null; }
      var host = el('div');
      node.parentNode.insertBefore(host, node.nextSibling);
      return create(host, config);
    }
    var list = /^(OL|UL)$/.test(node.tagName) ? node : node.querySelector('ol, ul');
    if (!list || list.closest('.tl')) return null;
    addStyles();
    var t = new Timeline(list, node);
    if (!t.root) return null;
    all.push(t);
    return t;
  }

  function create(host, config) {
    config = config || {};
    var list = el('ol');
    (config.events || []).forEach(function (ev) {
      var li = el('li');
      if (ev.when != null) li.setAttribute('data-when', ev.when);
      if (ev.label) li.setAttribute('data-label', ev.label);
      if (ev.group) li.setAttribute('data-group', ev.group);
      if (ev.color) li.setAttribute('data-color', ev.color);
      if (ev.era) li.setAttribute('data-era', '');
      if (ev.html != null) li.innerHTML = ev.html;
      else li.textContent = ev.text != null ? ev.text : (ev.label || '');
      list.appendChild(li);
    });
    host.setAttribute('data-timeline', '');
    if (config.title) host.setAttribute('data-timeline-title', config.title);
    if (config.scale) host.setAttribute('data-timeline-scale', config.scale);
    if (config.view) host.setAttribute('data-timeline-view', config.view);
    if (config.gaps) host.setAttribute('data-timeline-gaps', '');
    host.appendChild(list);
    return enhance(host);
  }

  function scan(root) {
    var out = [];
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-timeline]'), function (node) {
      var t = enhance(node);
      if (t) out.push(t);
    });
    return out;
  }

  // Print always uses the list. Capture so this runs before the print planner measures.
  var printViews = null;
  global.addEventListener('beforeprint', function () {
    printViews = all.map(function (t) { return t.root.dataset.tlView; });
    all.forEach(function (t) { t.root.dataset.tlView = 'list'; });
  }, true);
  global.addEventListener('afterprint', function () {
    if (!printViews) return;
    all.forEach(function (t, i) { t.setView(printViews[i], { save: false }); });
    printViews = null;
  });

  // Theme switches change the page colour behind the labels.
  new MutationObserver(function () {
    all.forEach(function (t) { t.layout(); });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-lighting', 'class'] });

  // The timeline that owns a list, its host or any node inside it.
  api.get = function (node) {
    return all.find(function (t) { return t.list === node || t.host === node || t.root.contains(node); }) || null;
  };
  api.scan = scan;
  api.create = create;
  api.instances = all;
  global.ClassroomOSTimeline = api;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(); });
  else scan();
})(typeof window !== 'undefined' ? window : globalThis);
