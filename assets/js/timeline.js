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
 * is remembered site-wide), data-timeline-gaps (show "12 years later" in the list),
 * data-timeline-tour (a ▶ Play button that flies from headline event to headline
 * event, data-major ones if there are a few, else all), data-timeline-cosmic (the
 * detail card places each event on Sagan's Cosmic Calendar: the universe as one year).
 * Every track has a full-screen button (F) for projecting (on iPhone, which has no
 * element fullscreen, it fills the window instead); moves between distant events
 * fly (zoom out, pan, zoom in) unless the reader prefers reduced motion. On touch
 * screens a pinch zooms the track, not the page, and the track's height follows
 * the screen's so it fits in landscape too.
 *
 * From JS: ClassroomOSTimeline.create(hostEl, { title, scale, events: [{ when,
 * label, text | html, group, color, era }] }) — or put the same object in
 * <script type="application/json" data-timeline>…</script>. An instance can
 * zoomToRange(startYear, endYear), zoomToEra(item), selectIndex(i), setScale(k),
 * setMatch(fn), play() / stopTour().
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
    if (/^(?:middle ages|medieval(?: period| era)?)$/i.test(s)) return span(500, 1500, 'ad');

    // ISO: 1947-09-09, 1947-09
    if ((m = s.match(/^(\d{3,4})-(\d{1,2})(?:-(\d{1,2}))?$/)) && +m[2] >= 1 && +m[2] <= 12) {
      return span(+m[1] + (m[2] - 1) / 12 + (m[3] ? (m[3] - 1) / 365 : 0), null, 'ad');
    }
    // Decades and centuries written as 1590s / 1900s
    if ((m = s.match(/^(\d{2,4})s$/)) && /0$/.test(m[1])) {
      var base = +m[1];
      return span(base, base + (/00$/.test(m[1]) && !decades ? 99 : 9), 'ad');
    }
    // 5th century BC, 10th–13th centuries, 3rd-2nd c. BCE, 6th c. BCE, 13th c.
    if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)\s*-\s*(\d{1,2})(?:st|nd|rd|th)\s*(?:c\.?|cent\.?|centuries|century)(?:\s+(ad|ce|bce?|b\.c\.(?:e\.)?))?$/))) {
      var c1 = +m[1], c2 = +m[2];
      var isBc = m[3] && /^(?:bce?|b\.c\.(?:e\.)?)$/.test(m[3]);
      var lo = Math.min(c1, c2), hi = Math.max(c1, c2);
      if (isBc) return span(-hi * 100, -(lo - 1) * 100 - 1, 'bc');
      return span((lo - 1) * 100 + 1, hi * 100, 'ad');
    }
    if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)\s*(?:c\.?|cent\.?|centuries|century)(?:\s+(.+))?$/))) {
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
    s = s.replace(/[:;,]+$/, '').trim();
    var approx = false;
    var lead = s.match(/^(?:c\.|ca\.|circa|about|around|approx\.?|~)\s*/);
    if (lead) { approx = true; s = s.slice(lead[0].length); }
    if (/\?$/.test(s)) approx = true;

    var single = parseOne(s);
    if (single) return finish(single, single.end);

    var sep = /\s*-\s*|\s*\/\s*|\s+(?:to|until|through|and|&)\s+/g;
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

  // Read the date portion of older lesson labels such as "1500s · Spain"
  // and "1950s → today". The display remains the teacher-authored label; only
  // the value used for positioning is normalized.
  function timelineDateValue(text) {
    var raw = String(text == null ? '' : text).replace(/&amp;/g, '&').trim();
    var candidates = [raw, raw.replace(/→/g, '–').replace(/\s*[·|,].*$/, '')];
    candidates.push(raw.replace(/\s+(?:onward|and onward|to today|throughout|& throughout|and throughout).*$/i, ''));
    raw.split(/\s+[—–-]\s+/).forEach(function (part) {
      part = part.trim();
      if (part) {
        candidates.push(part);
        candidates.push(part.replace(/\s+(?:throughout|& throughout|and throughout).*$/i, '').trim());
      }
    });
    if (/^(?:ancient|prehistoric|early)\b/i.test(raw)) {
      candidates.push(raw.split(/\s+[–-]\s+|\s+→\s+/).pop().trim());
    }
    // Some legacy date labels include a title or place name, for example
    // "The Optical Illusion (1838)" or "~3500 BC — Ancient Egypt".
    var matches = raw.match(/(?:\d[\d,]*(?:\.\d+)?\s*(?:s|BCE?|CE|AD|Ma|Mya|Ga|ka)?|present|today)/gi) || [];
    matches.forEach(function (match) { candidates.push(match.trim()); });
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i].replace(/[:;,]+$/, '').trim();
      if (parseWhen(candidate)) return candidate;
    }
    return raw;
  }

  function trimNumber(n) {
    return String(Math.round(n * 100) / 100);
  }

  // short: the axis of a narrow track ("500M yrs ago", "4.1k yrs ago").
  function formatAgo(yearsAgo, short) {
    if (yearsAgo >= 1e9) return trimNumber(yearsAgo / 1e9) + (short ? 'B' : ' billion') + ' yrs ago';
    if (yearsAgo >= 1e6) return trimNumber(yearsAgo / 1e6) + (short ? 'M' : ' million') + ' yrs ago';
    if (short && yearsAgo >= 1e3) return trimNumber(yearsAgo / 1e3) + 'k yrs ago';
    var n = Math.round(yearsAgo);
    return n.toLocaleString('en-US') + (n === 1 ? ' yr ago' : ' yrs ago');
  }

  // Tick label for year t. ctx: { deep, bc, short }
  function formatTick(t, ctx) {
    if (ctx.deep) return t >= NOW - 0.5 ? 'today' : formatAgo(NOW - t, ctx.short);
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

  // Carl Sagan's Cosmic Calendar: the universe's whole history squeezed into one year,
  // Big Bang at midnight on Jan 1, today at midnight on Dec 31.
  var UNIVERSE = 13.8e9;
  var YEAR_S = 365 * 86400;
  var MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function sigFig(n) {
    return n >= 10 ? Math.round(n).toLocaleString('en-US') : n >= 1 ? String(Math.round(n * 10) / 10) : String(Number(n.toPrecision(1)));
  }

  // Returns { fraction (0 = Jan 1, 1 = today), secondsBefore, text } or null.
  function cosmicCalendar(t) {
    var ago = NOW - t;
    if (!(ago >= -0.5) || ago > UNIVERSE * 1.0001) return null;
    ago = Math.max(ago, 0);
    var before = ago / UNIVERSE * YEAR_S;
    var text;
    if (ago < 1) text = 'Dec 31, the stroke of midnight: right now';
    else if (before < 60) text = 'Dec 31, ' + sigFig(before) + ' second' + (sigFig(before) === '1' ? '' : 's') + ' before midnight';
    else {
      var at = Math.max(YEAR_S - before, 0);
      var day = Math.floor(at / 86400), month = 0;
      while (month < 11 && day >= MONTH_DAYS[month]) day -= MONTH_DAYS[month++];
      text = MONTH_NAMES[month] + ' ' + (day + 1);
      if (before < 7 * 86400) {
        var secs = Math.floor(at % 86400), h = Math.floor(secs / 3600), m = Math.floor(secs / 60) % 60;
        text += ', ' + ((h + 11) % 12 + 1) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' am' : ' pm');
        if (before < 3600) text = 'Dec 31, ' + Math.round(before / 60) + ' minutes before midnight';
      } else if (ago > UNIVERSE * 0.9999) text = 'Jan 1, the first instant';
    }
    return { fraction: 1 - ago / UNIVERSE, secondsBefore: before, text: text };
  }

  var api = {
    NOW: NOW,
    cosmicCalendar: cosmicCalendar,
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

  var ROOT;
  try {
    ROOT = new URL('../../', script && script.src ? script.src : (global.location && global.location.protocol !== 'about:' ? global.location.href : 'file:///'));
  } catch (e) {
    ROOT = new URL('file:///');
  }
  var SCALE_NAMES = { time: 'True scale', log: 'Deep time', even: 'Even steps' };
  var SCALE_TIPS = {
    time: 'Every year gets the same width: see how short recorded history really is',
    log: 'Each step left is 10× further back: deep time and last week both fit',
    even: 'Events evenly spaced, in order'
  };
  var PALETTE = ['#2563eb', '#c2410c', '#15803d', '#9333ea', '#be123c', '#0e7490', '#a16207', '#4d7c0f'];
  // Era strata, oldest to newest: earth to sky. Mid-dark so each reads as a band edge on Day and
  // Night paper (fills use them at a few percent).
  var STRATA = [[180, 83, 9], [161, 98, 7], [77, 124, 15], [15, 118, 110], [29, 78, 216], [124, 58, 237]];
  function strata(f) {
    var at = Math.min(Math.max(f, 0), 1) * (STRATA.length - 1), i = Math.min(Math.floor(at), STRATA.length - 2), k = at - i;
    return '#' + STRATA[i].map(function (c, j) {
      return ('0' + Math.round(c + (STRATA[i + 1][j] - c) * k).toString(16)).slice(-2);
    }).join('');
  }
  // Track sizes in px at --tl-type 1 and a 16px root; timeline.css uses the same numbers via --tl-u.
  // A mark is a card, date over label; a long label may wrap onto two lines (its lane grows).
  var SIZE = {
    lane: 52, laneTwo: 68, mark: 44, markTwo: 60,
    bandRow: 24, axisBelow: 34, tickGap: 130, tickGapNarrow: 40
  };
  // How generously labels may spread, most first: [one-line max, two-line max] in px, capped
  // at a share of the track on phones. The last tier cuts every long label short (168px).
  var LABEL_TIERS = [[300, 250], [300, 210], [300, 0], [0, 0]];
  var SHORT = 168;
  var NARROW = 480; // px of track: a phone, with closer ticks and shorter tick labels
  var FULL_TYPES = [1.8, 1.6, 1.4, 1.2]; // full screen: the largest that fits without hiding labels
  var MAX_LANES = 6;
  var PAD = 28;
  var MAX_CANVAS = 8e6; // px; browsers stop laying out far wider elements
  var reducedMotion = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var canFullscreen = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
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
    if (!text || text.length > 50 || first.children.length) return null;
    if (first.getAttribute('data-when') || parseWhen(timelineDateValue(text)) || /year|date|time|when|era|age/i.test(first.className)) return first;
    return null;
  }

  function readItem(li, index) {
    var source = null;
    var when = li.getAttribute('data-when');
    var display = when;
    if (when == null) {
      var time = li.querySelector('time');
      source = time && li.firstElementChild === time ? time : leadingDateElement(li);
      if (source && !parseWhen(source.getAttribute('data-when') || timelineDateValue(source.textContent.trim()))) source = null;
      // Legacy lesson timelines often keep the date inside a card/figure layout
      // instead of making it the first child of the <li>. Treat the first
      // recognizably dated year/era element as the source so those lists can
      // use the shared engine without rewriting their teaching content.
      if (!source) {
        var preferred = li.querySelector('.c-tstep-age, .aa-time-year, .tt-year, .pf-tl-year');
        if (preferred && parseWhen(preferred.getAttribute('data-when') || timelineDateValue(preferred.textContent.trim()))) source = preferred;
      }
      if (!source) {
        source = Array.prototype.find.call(li.querySelectorAll(
          '[class*="timeline-year"], [class*="-tl-year"], [class*="tl-year"], [class*="timeline-date"], [class*="-tl-date"], [class*="tl-date"], [class*="time-year"], [class*="time-age"], [class*="era-year"], [class*="-tl-era"], .tt-year, .pf-tl-year, .aa-time-year, .c-tstep-age, .fl-tl-year, .pt-era, .yr, small'
        ), function (node) { return parseWhen(node.getAttribute('data-when') || timelineDateValue(node.textContent.trim())); });
      }
      if (source) {
        var rawSource = source.textContent.trim();
        display = source.getAttribute('data-when') || timelineDateValue(rawSource);
        when = source.getAttribute('data-when') || source.getAttribute('datetime') || display;
      } else if (time) {
        display = time.getAttribute('data-when') || time.textContent.trim();
        when = time.getAttribute('data-when') || time.getAttribute('datetime') || display;
      }
    }
    var titleEl = Array.prototype.find.call(li.querySelectorAll('strong, b, h3, h4'), function (node) { return node !== source; });
    var subLabel = '';
    if (source && !titleEl) {
      var sText = source.textContent.trim();
      if (display && sText.indexOf(display) !== -1) {
        subLabel = sText.slice(sText.indexOf(display) + display.length).replace(/^[\s·:–-]+/, '').trim();
      }
    }
    var rest = li.textContent;
    if (source) rest = rest.replace(source.textContent, '');
    var authored = li.getAttribute('data-label') || subLabel;
    return {
      li: li,
      index: index,
      source: source,
      when: when || '',
      display: (display || '').trim(),
      parsed: parseWhen(when),
      label: authored || shortText(titleEl ? titleEl.textContent : rest, 34),
      // What the track shows: up to a sentence, wrapped onto two lines when there's room.
      text: authored || shortText(titleEl ? titleEl.textContent : rest, 90),
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
      tour: host.hasAttribute('data-timeline-tour'),
      cosmic: host.hasAttribute('data-timeline-cosmic'),
      lanes: Math.min(Math.max(parseInt(host.getAttribute('data-timeline-lanes'), 10) || MAX_LANES, 1), 12)
    };
    this.query = '';
    this.zoom = 1;
    this.sel = -1;
    this.widths = null;
    this.filter = null;
    this.match = null;
    this.flight = 0;
    this.tour = null;

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
    // Eras without a colour of their own take one from an ordered ramp, oldest first, so
    // neighbouring ages read as distinct layers of rock rather than one tint.
    var plain = this.eras.filter(function (it) { return !it.tint && it.parsed; })
      .sort(function (a, b) { return a.parsed.start - b.parsed.start; });
    if (plain.length > 1) plain.forEach(function (it, i) { it.tint = strata(i / (plain.length - 1)); });

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

    if (this.opts.tour) {
      this.playBtn = el('button', 'tl-btn tl-play');
      this.playBtn.type = 'button';
      this.playBtn.title = 'Fly from headline to headline on your own (Space pauses)';
      this.playBtn.setAttribute('aria-pressed', 'false');
      this.playBtn.addEventListener('click', function () { if (self.tour) self.stopTour(); else self.play(); });
      bar.insertBefore(this.playBtn, views);
      this.setPlayLabel(false);
    }

    var zoom = el('div', 'tl-zoom tl-track-only');
    zoom.appendChild(this.button('−', 'Zoom out (−)', function () { self.setZoom(self.zoom / 1.8); }));
    zoom.appendChild(this.button('Fit', 'Show the whole timeline (0)', function () { self.fit(); }));
    zoom.appendChild(this.button('+', 'Zoom in (+)', function () { self.setZoom(self.zoom * 1.8); }));
    // Real fullscreen where the browser has it; iPhone Safari doesn't, so there it fills the window.
    this.fullBtn = this.button('⛶', 'Full screen, for the projector or a phone on its side (F)', function () { self.toggleFullscreen(); });
    this.fullBtn.classList.add('tl-full');
    this.fullBtn.setAttribute('aria-pressed', 'false');
    zoom.appendChild(this.fullBtn);
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
        if (era.tint) b.style.setProperty('--tl-c', era.tint);
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
    // Gridlines, Deep time's powers-of-ten stripes and the BC|AD line sit under everything.
    this.gridLayer = el('div', 'tl-grid');
    this.gridLayer.setAttribute('aria-hidden', 'true');
    canvas.appendChild(this.gridLayer);
    canvas.appendChild(this.bandLayer);
    canvas.appendChild(this.axis);
    canvas.appendChild(this.ticks);
    // The selected event's date, where its reading line meets the axis.
    this.cursorDate = el('span', 'tl-cursor-date');
    this.cursorDate.setAttribute('aria-hidden', 'true');
    canvas.appendChild(this.cursorDate);
    // Stems and axis dots get their own layer under every label, so no line ever crosses a label.
    // Range spans and the reading lines (selected, hovered) live there too.
    this.stemLayer = el('div', 'tl-stems');
    this.stemLayer.setAttribute('aria-hidden', 'true');
    this.cursor = this.stemLayer.appendChild(el('span', 'tl-cursor'));
    this.hoverCursor = this.stemLayer.appendChild(el('span', 'tl-cursor tl-hover'));
    this.hoverCursor.hidden = true;
    canvas.appendChild(this.stemLayer);
    canvas.appendChild(this.markLayer);
    viewport.appendChild(canvas);
    track.appendChild(viewport);
    var touch = global.matchMedia && global.matchMedia('(pointer: coarse)').matches;
    var hint = track.appendChild(el('p', 'tl-hint', touch
      ? 'Swipe sideways to move · pinch to zoom · tap an event to read it · ⛶ Full screen fills the screen (try it sideways)'
      : 'Drag or scroll sideways to move · Ctrl + wheel or +/− to zoom · ← → step through events'));
    this.legend = hint.appendChild(el('span', 'tl-legend'));
    this.updateLegend();
    this.detail = el('div', 'tl-detail');
    this.detail.setAttribute('aria-live', 'polite');
    track.appendChild(this.detail);
    root.appendChild(track);
    this.track = track;
    this.viewport = viewport;
    this.canvas = canvas;

    this.events.forEach(function (it, i) {
      var mark = el('button', 'tl-mark' + (it.major ? ' tl-major' : ''));
      mark.type = 'button';
      mark.tabIndex = -1;
      if (it.tint) mark.style.setProperty('--tl-c', it.tint);
      if (it.display || it.when) mark.appendChild(el('span', 'tl-mark-date', it.display || it.when));
      it.labelEl = mark.appendChild(el('span', 'tl-mark-label', it.text));
      mark.setAttribute('aria-label', (it.display ? it.display + ': ' : '') + it.text);
      mark.title = (it.display ? it.display + ' · ' : '') + it.text;
      mark.addEventListener('click', function () {
        if (self.dragged) return;
        self.selectIndex(i, { focus: true });
        self.showDetail();
      });
      // Pointing at a card previews its reading line.
      mark.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || it.px == null || mark.classList.contains('tl-compact')) return;
        self.hoverCursor.hidden = false;
        self.hoverCursor.style.left = it.px + 'px';
        if (it.tint) self.hoverCursor.style.setProperty('--tl-c', it.tint); else self.hoverCursor.style.removeProperty('--tl-c');
      });
      mark.addEventListener('pointerleave', function () { self.hoverCursor.hidden = true; });
      it.mark = mark;
      self.markLayer.appendChild(mark);
      it.stem = el('span', 'tl-stem' + (it.major ? ' tl-major' : ''));
      if (it.tint) it.stem.style.setProperty('--tl-c', it.tint);
      self.stemLayer.appendChild(it.stem);
      // A range (1717–23, 335–175 Ma) is drawn on the axis itself, from start to end.
      if (it.parsed && it.parsed.end > it.parsed.start) {
        it.span = self.stemLayer.appendChild(el('span', 'tl-span'));
        if (it.tint) it.span.style.setProperty('--tl-c', it.tint);
        it.span.hidden = true;
      }
    });
    this.eras.forEach(function (it, k) {
      var band = el('div', 'tl-band' + (k % 2 ? ' tl-band-alt' : ''));
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
      if (it.display || it.when) li.insertBefore(el('span', 'tl-date', it.display || it.when), li.firstChild);
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
      if (e.key === ' ' && self.playBtn && !/^(BUTTON|A|SUMMARY)$/.test(e.target.tagName)) {
        e.preventDefault();
        if (self.tour) self.stopTour(); else self.play();
        return;
      }
      if ((e.key === 'f' || e.key === 'F') && self.fullBtn) { e.preventDefault(); self.toggleFullscreen(); return; }
      var handled = true;
      if (/^(ArrowRight|ArrowLeft|Home|End|\+|=|-|_|0)$/.test(e.key)) { self.stopTour(); self.stopFlight(); }
      if (e.key === 'ArrowRight') self.step(1, true);
      else if (e.key === 'ArrowLeft') self.step(-1, true);
      else if (e.key === 'Home') self.selectIndex(self.firstVisible(1), { focus: true });
      else if (e.key === 'End') self.selectIndex(self.firstVisible(-1), { focus: true });
      else if (e.key === '+' || e.key === '=') self.setZoom(self.zoom * 1.8);
      else if (e.key === '-' || e.key === '_') self.setZoom(self.zoom / 1.8);
      else if (e.key === '0') self.fit();
      else handled = false;
      if (handled) e.preventDefault();
    });
    viewport.addEventListener('wheel', function (e) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      var r = viewport.getBoundingClientRect();
      self.setZoom(self.zoom * Math.exp(-e.deltaY * 0.01), e.clientX - r.left);
    }, { passive: false });

    // The reader taking hold of the timeline ends any flight or tour.
    root.addEventListener('pointerdown', function (e) {
      if ((self.playBtn && self.playBtn.contains(e.target)) || (self.fullBtn && self.fullBtn.contains(e.target))) return;
      if (e.target.closest('.tl-detail')) return;
      self.stopTour();
      self.stopFlight();
    }, true);
    viewport.addEventListener('wheel', function () { self.stopFlight(); self.stopTour(); }, { passive: true });
    document.addEventListener('visibilitychange', function () { if (document.hidden) self.stopTour(); });
    var onFull = function () {
      if (self.pseudoFull) return;
      self.markFull((document.fullscreenElement || document.webkitFullscreenElement) === root);
    };
    document.addEventListener('fullscreenchange', onFull);
    document.addEventListener('webkitfullscreenchange', onFull);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && self.pseudoFull) self.toggleFullscreen();
    });

    // The lanes follow the window's height (rotating a phone, resizing a laptop).
    var resizeFrame = 0;
    global.addEventListener('resize', function () {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(function () { resizeFrame = 0; self.layout(); });
    });

    // Pinch zooms the track, not the page. Safari has its own gesture events; elsewhere two
    // touch pointers (the viewport's touch-action leaves one-finger panning to the browser).
    var pinchAnchor = function (clientX) { return clientX - viewport.getBoundingClientRect().left; };
    if ('ongesturestart' in global) {
      var gestureZoom = 1;
      viewport.addEventListener('gesturestart', function (e) {
        e.preventDefault();
        self.stopFlight(); self.stopTour();
        gestureZoom = self.zoom;
      });
      viewport.addEventListener('gesturechange', function (e) {
        e.preventDefault();
        self.setZoom(gestureZoom * e.scale, pinchAnchor(e.clientX));
      });
      viewport.addEventListener('gestureend', function (e) { e.preventDefault(); });
    } else {
      var touches = new Map(), pinch = null;
      var spread = function () {
        var pts = Array.from(touches.values());
        return { d: Math.max(Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), 1), x: (pts[0].x + pts[1].x) / 2 };
      };
      viewport.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'touch') return;
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size === 2) { var s0 = spread(); pinch = { d: s0.d, z: self.zoom }; }
      });
      viewport.addEventListener('pointermove', function (e) {
        if (!touches.has(e.pointerId)) return;
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (!pinch || touches.size !== 2) return;
        var s1 = spread();
        self.setZoom(pinch.z * s1.d / pinch.d, pinchAnchor(s1.x));
      });
      var lift = function (e) { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
      viewport.addEventListener('pointerup', lift);
      viewport.addEventListener('pointercancel', lift);
    }

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
    this.updateLegend();
    this.layout();
    this.viewport.scrollLeft = 0;
    this.reveal(false);
  };

  // Deep time compresses the past; the shaded stripes show by how much.
  Timeline.prototype.updateLegend = function () {
    this.legend.textContent = this.scale === 'log' ? ' · Each shaded stripe reaches 10× further back' : '';
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
    var width = Math.max(r[1] - r[0], 1e-6);
    var z = Math.min(Math.max(0.9 / width, 1), this.maxZoom * 4);
    this.zoomFloor = z;
    this.flyTo(z, (r[0] + r[1]) / 2);
    // Select the first event inside the era.
    for (var i = 0; i < this.events.length; i++) {
      var p = pos.get(this.events[i]);
      if (p != null && p >= r[0] - 1e-9 && this.visible(this.events[i])) { this.selectIndex(i, { quiet: true }); break; }
    }
  };

  // Fill the track with the years start..end (decimal years, as parseWhen returns).
  // Returns { fits, zoom }: zoom is what filling the track would take, and fits is false when
  // that's beyond what a browser can lay out (a few years out of 13.8 billion at true scale).
  Timeline.prototype.zoomToRange = function (start, end) {
    if (this.root.dataset.tlView !== 'track') this.setView('track');
    this.positions();
    if (!this.p) return { fits: false, zoom: 1 };
    var a = this.p.norm(Math.min(start, end)), b = this.p.norm(Math.max(start, end));
    var want = 0.92 / Math.max(b - a, 1e-12);
    var cap = MAX_CANVAS / Math.max(this.viewport.clientWidth, 320);
    var z = Math.min(Math.max(want, 1), cap);
    this.zoomFloor = z;
    this.flyTo(z, (a + b) / 2);
    return { fits: want <= cap, zoom: Math.max(want, 1) };
  };

  // How wide the whole track is at a zoom, in CSS pixels (for "this view would be 400 km wide").
  Timeline.prototype.widthAt = function (zoom) {
    return Math.max(this.viewport.clientWidth, 320) * zoom;
  };

  Timeline.prototype.fit = function () {
    this.zoomFloor = 0;
    this.flyTo(1, 0.5);
  };

  // The view as { z: zoom, c: the 0..1 point on the line at the middle of the viewport }.
  Timeline.prototype.viewState = function () {
    var vw = this.viewport.clientWidth;
    var inner = (this.canvas.offsetWidth || vw) - PAD * 2;
    return { z: this.zoom, c: inner > 0 ? (this.viewport.scrollLeft + vw / 2 - PAD) / inner : 0.5 };
  };

  Timeline.prototype.applyView = function (z, c) {
    this.zoom = z;
    this.layout();
    var inner = this.canvas.offsetWidth - PAD * 2;
    this.viewport.scrollLeft = PAD + c * inner - this.viewport.clientWidth / 2;
    this.renderTicks();
  };

  Timeline.prototype.stopFlight = function () {
    if (!this.flight) return;
    cancelAnimationFrame(this.flight);
    this.flight = 0;
    this.root.classList.remove('tl-flying');
    if (this.flightDone) { var done = this.flightDone; this.flightDone = null; done(false); }
  };

  // Fly to zoom z1 centred on c1: zoom out, pan, zoom back in, the way a map flies,
  // so a jump from the Big Bang to the iPhone reads as one journey.
  // Path from van Wijk & Nuij, "Smooth and efficient zooming and panning" (as in d3-interpolate, ISC).
  Timeline.prototype.flyTo = function (z1, c1, done) {
    var self = this;
    this.stopFlight();
    if (this.root.dataset.tlView !== 'track' || !this.viewport.clientWidth) { if (done) done(true); return; }
    var from = this.viewState();
    var w0 = 1 / from.z, w1 = 1 / Math.max(z1, 1e-9), u0 = from.c, d = c1 - u0;
    var rho = Math.SQRT2, path, S;
    if (Math.abs(d) < 1e-12 || Math.abs(d) / Math.max(w0, w1) < 0.02) {
      S = Math.log(w1 / w0) / rho;
      path = function (t) { return [u0 + t * d, w0 * Math.exp(rho * t * S)]; };
    } else {
      var ad = Math.abs(d);
      var b0 = (w1 * w1 - w0 * w0 + 4 * ad * ad) / (2 * w0 * 2 * ad);
      var b1 = (w1 * w1 - w0 * w0 - 4 * ad * ad) / (2 * w1 * 2 * ad);
      var r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
      var r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
      S = (r1 - r0) / rho;
      path = function (t) {
        var s = t * S;
        var u = w0 / (2 * ad) * (Math.cosh(r0) * Math.tanh(rho * s + r0) - Math.sinh(r0));
        return [u0 + u * d, w0 * Math.cosh(r0) / Math.cosh(rho * s + r0)];
      };
    }
    var dist = Math.abs(S);
    if (reducedMotion.matches || !isFinite(dist) || dist < 0.05) {
      this.applyView(z1, c1);
      if (done) done(true);
      return;
    }
    var duration = Math.min(Math.max(dist * 420, 420), 2600);
    var start = 0;
    this.flightDone = done || null;
    this.root.classList.add('tl-flying');
    var frame = function (now) {
      if (!start) start = now;
      var k = Math.min((now - start) / duration, 1);
      var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      var at = k >= 1 ? [c1, w1] : path(e);
      self.applyView(1 / at[1], at[0]);
      if (k < 1) { self.flight = requestAnimationFrame(frame); return; }
      self.flight = 0;
      self.root.classList.remove('tl-flying');
      var cb = self.flightDone;
      self.flightDone = null;
      if (cb) cb(true);
    };
    this.flight = requestAnimationFrame(frame);
  };

  // Where to look for event i: the zoom at which it gets its label, centred on it.
  // Tried synchronously and undone before the browser paints.
  Timeline.prototype.targetFor = function (i) {
    var self = this;
    var it = this.events[i];
    var before = this.viewState();
    var floor = this.zoomFloor;
    var vw = this.viewport.clientWidth;
    var m = it.mark;
    var onScreen = function () {
      if (m.hidden) return false;
      var x = m.classList.contains('tl-flip') ? m.offsetLeft + m.offsetWidth : m.offsetLeft;
      return x > self.viewport.scrollLeft + 40 && x < self.viewport.scrollLeft + vw - 60;
    };
    this.layout();
    var z = this.zoom;
    for (var guard = 0; guard < 10 && m.classList.contains('tl-compact') && z < this.maxZoom; guard++) {
      z = Math.min(z * 1.6, this.maxZoom);
      this.zoom = z;
      this.layout();
    }
    var pos = this.positions().get(it);
    var stay = z === before.z && (this.applyView(before.z, before.c), onScreen());
    this.zoomFloor = floor;
    this.applyView(before.z, before.c);
    return { z: z, c: pos == null ? before.c : pos, stay: stay };
  };

  // Tour: fly from headline to headline, pausing on each long enough to read it.
  Timeline.prototype.tourStops = function () {
    var self = this;
    var shown = this.events.filter(function (it) { return self.visible(it); });
    var major = shown.filter(function (it) { return it.major; });
    var stops = major.length >= 3 ? major : shown;
    return stops.map(function (it) { return self.events.indexOf(it); }).sort(function (a, b) {
      var A = self.events[a].parsed, B = self.events[b].parsed;
      return (A && B && A.start !== B.start) ? A.start - B.start : a - b;
    });
  };

  Timeline.prototype.setPlayLabel = function (on) {
    if (!this.playBtn) return;
    this.playBtn.textContent = on ? '❚❚ Pause' : '▶ Play the story';
    this.playBtn.setAttribute('aria-pressed', String(on));
  };

  Timeline.prototype.play = function () {
    var self = this;
    var stops = this.tourStops();
    if (!stops.length) return;
    if (this.root.dataset.tlView !== 'track') this.setView('track');
    // Carry on from the selected event; start over from the end.
    var cur = this.sel !== -1 && this.events[this.sel].parsed ? this.events[this.sel].parsed.start : -Infinity;
    var at = stops.findIndex(function (i) { var p = self.events[i].parsed; return i === self.sel || (p && p.start > cur); });
    if (at === -1 || (stops[at] === this.sel && at === stops.length - 1)) at = 0;
    this.tour = { stops: stops, at: at, timer: 0 };
    this.setPlayLabel(true);
    this.root.classList.add('tl-touring');
    this.tourVisit();
  };

  Timeline.prototype.tourVisit = function () {
    var self = this, tour = this.tour;
    if (!tour) return;
    var i = tour.stops[tour.at];
    this.selectIndex(i, { quiet: true });
    var target = this.targetFor(i);
    // Frame each stop in its own neighbourhood: the gaps to the stops either side fill the view,
    // so every hop is a flight (out, across, in) rather than a highlight on a fixed picture.
    var pos = this.positions();
    var here = pos.get(this.events[i]);
    var gaps = [tour.stops[tour.at - 1], tour.stops[tour.at + 1]].map(function (k) {
      return k == null || !pos.has(self.events[k]) ? null : Math.abs(pos.get(self.events[k]) - here);
    }).filter(function (g) { return g > 1e-6; });
    if (gaps.length) {
      var span = 2.4 * (gaps.length === 2 ? Math.sqrt(gaps[0] * gaps[1]) : gaps[0]);
      target.z = Math.min(Math.max(target.z, 1 / Math.min(span, 0.6)), this.maxZoom);
    }
    this.flyTo(target.z, target.c, function (finished) {
      if (!finished || self.tour !== tour) return;
      var words = self.events[i].li.textContent.split(/\s+/).length;
      var dwell = Math.min(Math.max(2600 + words * 190, 4200), 11000);
      self.tourProgress(dwell);
      tour.timer = setTimeout(function () {
        if (self.tour !== tour) return;
        if (tour.at >= tour.stops.length - 1) { self.stopTour(); return; }
        tour.at++;
        self.tourVisit();
      }, dwell);
    });
  };

  Timeline.prototype.tourProgress = function (ms) {
    var tour = this.tour;
    var head = this.detail.querySelector('.tl-detail-head');
    if (!tour || !head) return;
    var badge = el('span', 'tl-tour-badge', 'Stop ' + (tour.at + 1) + ' of ' + tour.stops.length);
    head.insertBefore(badge, head.firstChild);
    var bar = el('span', 'tl-tour-progress');
    bar.style.animationDuration = ms + 'ms';
    this.detail.appendChild(bar);
  };

  Timeline.prototype.stopTour = function () {
    if (!this.tour) return;
    clearTimeout(this.tour.timer);
    this.tour = null;
    this.setPlayLabel(false);
    this.root.classList.remove('tl-touring');
    var bar = this.detail.querySelector('.tl-tour-progress');
    if (bar) bar.remove();
  };

  Timeline.prototype.toggleFullscreen = function () {
    var self = this;
    var root = this.root;
    var current = document.fullscreenElement || document.webkitFullscreenElement;
    if (current === root) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    if (this.pseudoFull) { this.setPseudoFull(false); return; }
    if (root.dataset.tlView !== 'track') this.setView('track');
    var req = canFullscreen && (root.requestFullscreen || root.webkitRequestFullscreen);
    var out = req ? req.call(root) : null;
    if (!req) this.setPseudoFull(true);
    else if (out && out.catch) out.catch(function () { self.setPseudoFull(true); });
  };

  // Fill the window instead (iPhone). The timeline moves to <body> while it does, so no
  // transformed or clipped ancestor can trap a position: fixed box; a placeholder holds its spot.
  Timeline.prototype.setPseudoFull = function (on) {
    var root = this.root;
    if (on === !!this.pseudoFull) return;
    if (on) {
      var cs = getComputedStyle(root);
      var keep = { accent: cs.getPropertyValue('--tl-accent').trim(), paper: paperBehind(root), color: cs.color, font: cs.fontFamily };
      this.homeStyle = root.getAttribute('style') || '';
      if (keep.accent) root.style.setProperty('--tl-accent', keep.accent);
      // Over the whole window the paper must be solid (the lesson's card may be 95% opaque).
      root.style.setProperty('--tl-paper', keep.paper.replace(/^rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)$/, 'rgb($1,$2,$3)'));
      // Outside the lesson, site-wide rules restyle text through these variables; keep the lesson's look.
      ['--font-sans', '--font-display', '--font-body', '--font-ui'].forEach(function (k) {
        var v = cs.getPropertyValue(k).trim();
        if (v) root.style.setProperty(k, v);
      });
      root.style.setProperty('color', keep.color, 'important');
      root.style.setProperty('font-family', keep.font, 'important');
      this.placeholder = document.createComment('timeline');
      root.parentNode.insertBefore(this.placeholder, root);
      document.body.appendChild(root);
      document.documentElement.classList.add('tl-scroll-lock');
      root.classList.add('tl-pseudo-full');
      this.pseudoFull = true;
    } else {
      this.pseudoFull = false;
      root.classList.remove('tl-pseudo-full');
      document.documentElement.classList.remove('tl-scroll-lock');
      if (this.placeholder && this.placeholder.parentNode) {
        this.placeholder.parentNode.insertBefore(root, this.placeholder);
        this.placeholder.remove();
      }
      this.placeholder = null;
      root.setAttribute('style', this.homeStyle || '');
    }
    this.markFull(on);
    if (!on) root.scrollIntoView({ block: 'nearest' });
  };

  Timeline.prototype.markFull = function (full) {
    this.root.classList.toggle('tl-is-full', full);
    this.fullBtn.setAttribute('aria-pressed', String(full));
    this.fullBtn.textContent = full ? '✕' : '⛶';
    this.fullBtn.title = full ? 'Leave full screen (F or Esc)' : 'Full screen, for the projector or a phone on its side (F)';
    this.fullBtn.setAttribute('aria-label', this.fullBtn.title);
    this.widths = null;
    this.layout();
    this.reveal(false);
  };

  // After a tap on the track, make sure the card it opened is on screen (phones scroll it away).
  Timeline.prototype.showDetail = function () {
    if (this.root.classList.contains('tl-is-full') || !this.detail.getBoundingClientRect) return;
    var r = this.detail.getBoundingClientRect();
    if (r.top > global.innerHeight - 90) {
      this.detail.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
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
    var first = lo;
    var pad = (hi - lo) * 0.02;
    lo -= pad; hi += pad;
    var norm = function (t) { return (f(t) - lo) / (hi - lo); };
    this.p = { f: f, lo: lo, hi: hi, first: first, norm: norm };
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
    this.narrow = vw < NARROW;
    var full = this.root.classList.contains('tl-is-full');
    var pos = this.positions();
    if (this.scale === 'even') this.maxZoom = Math.max(4, this.events.length * 170 / vw);
    this.maxZoom = Math.min(Math.max(this.maxZoom, this.zoomFloor || 0), MAX_CANVAS / Math.max(vw, 320));
    this.zoom = Math.min(Math.max(this.zoom, 1), this.maxZoom);
    var W = Math.max(vw, 320) * this.zoom;
    var inner = W - PAD * 2;
    var x = function (p) { return PAD + p * inner; };
    this.canvas.style.width = W + 'px';
    var events = this.events.filter(function (it) { return pos.has(it); });

    // Sizes change (a new width, full screen, filters): pick the type size and measure labels
    // once for it. Zooming reuses both, so flights never re-measure.
    if (!this.widths) {
      this.measured = {};
      this.tickFont = null;
      var type = 1;
      if (full) {
        // The projector: the largest type that fits the screen without hiding more labels than 1×.
        // A crowded timeline may label a few fewer events (keeping 75%) for type the back row can read.
        var room = this.fullRoom();
        var base = this.tryType(1, events, pos, x, W, room);
        for (var k = 0; k < FULL_TYPES.length; k++) {
          if (FULL_TYPES[k] > vw / 1000) continue;
          var test = this.tryType(FULL_TYPES[k], events, pos, x, W, room);
          if (events.length - test.compact >= 0.75 * (events.length - base.compact) && test.height <= room) { type = FULL_TYPES[k]; break; }
        }
      }
      this.type = type;
    }
    this.setType(this.type || 1);
    var u = this.unit;
    var bandsH = this.layoutBands(pos, x, W);
    var res = this.placeBest(events, pos, x, W, this.laneBudget(bandsH, full));

    var axisY = bandsH + res.height + 14;
    this.canvas.style.height = (axisY + SIZE.axisBelow * u) + 'px';
    this.canvas.style.setProperty('--axis-y', axisY + 'px');
    this.canvas.style.setProperty('--bands-h', bandsH + 'px');

    this.events.forEach(function (it) {
      it.mark.hidden = it.stem.hidden = !pos.has(it);
      it.px = null;
      if (it.span) it.span.hidden = true;
    });
    res.placed.forEach(function (p) {
      var m = p.it.mark;
      p.it.px = p.px;
      m.classList.toggle('tl-flip', p.flip);
      m.classList.toggle('tl-compact', p.lane === -1);
      m.classList.toggle('tl-two', !!p.two);
      p.it.stem.hidden = p.lane === -1;
      if (p.lane === -1) {
        m.style.left = p.px + 'px';
        m.style.top = axisY + 'px';
        m.style.width = '';
        return;
      }
      var markH = (p.two ? SIZE.markTwo : SIZE.mark) * u;
      var top = axisY - 10 - res.base[p.lane] - 8 * u - markH;
      m.style.left = (p.flip ? p.px - p.width : p.px) + 'px';
      m.style.top = top + 'px';
      m.style.width = p.width + 'px';
      var stemTop = top + markH - 1;
      p.it.stem.style.left = p.px + 'px';
      p.it.stem.style.top = stemTop + 'px';
      p.it.stem.style.height = (axisY - stemTop) + 'px';
    });
    // Ranges: a span just above the axis from start to end, labelled or not. Overlapping spans
    // stack three deep; past that the top one turns hatched ("more here, zoom in").
    var rowEnd = [];
    res.placed.filter(function (p) { return p.range > 0 && p.it.span; })
      .sort(function (a, b) { return a.px - b.px; })
      .forEach(function (p) {
        var row = 0;
        while (row < 3 && rowEnd[row] != null && rowEnd[row] > p.px - 2) row++;
        var more = row === 3;
        if (more) row = 2;
        var w = Math.max(p.range, 4);
        rowEnd[row] = Math.max(rowEnd[row] || 0, p.px + w);
        var span = p.it.span;
        span.hidden = false;
        span.classList.toggle('tl-span-more', more);
        span.style.left = p.px + 'px';
        span.style.width = w + 'px';
        span.style.top = (axisY - 6 - row * 6) + 'px';
      });
    this.renderTicks();
  };

  // Full screen: the height left for the track between the toolbar and the card (when the card
  // sits below it; on a phone held sideways it sits beside).
  Timeline.prototype.fullRoom = function () {
    var cs = getComputedStyle(this.root);
    var gap = parseFloat(cs.rowGap) || 0;
    var bar = this.root.querySelector('.tl-bar');
    var top = bar ? bar.offsetTop + bar.offsetHeight + gap : parseFloat(cs.paddingTop) || 0;
    var below = this.detail.offsetTop > this.viewport.offsetTop + 10 ? this.detail.offsetHeight + gap : 0;
    return this.root.clientHeight - (parseFloat(cs.paddingBottom) || 0) - top - below - 4; // 4: the track's border
  };

  // Set the type size and measure every label at it: one write, one reflow, then reads only.
  // Zooming re-runs layout every frame with the same type: then this is a no-op (no style writes).
  Timeline.prototype.setType = function (type) {
    if (this.widths && this.widths.type === type) return;
    this.root.style.setProperty('--tl-type', type);
    this.unit = type * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16;
    if (this.measured && this.measured[type]) { this.widths = this.measured[type]; return; }
    var marks = this.events.map(function (it) { return it.mark; });
    marks.forEach(function (m) {
      m.classList.remove('tl-compact', 'tl-two', 'tl-flip');
      m.classList.add('tl-measure');
    });
    // Exact widths, rounded up: offsetWidth rounds down, and text 0.4px wider than its box gets "…".
    var widths = new Map();
    var exact = function (node) { return Math.ceil(node.getBoundingClientRect().width + 0.5); };
    this.events.forEach(function (it) {
      widths.set(it, { full: exact(it.mark), label: exact(it.labelEl) });
    });
    this.eras.forEach(function (era) {
      var label = era.band.firstChild;
      label.hidden = false;
      widths.set(era, { full: exact(label) });
    });
    marks.forEach(function (m) { m.classList.remove('tl-measure'); });
    widths.type = type;
    this.widths = widths;
    if (this.measured) this.measured[type] = widths;
  };

  // A trial layout at a type size, for choosing one: how tall it is and how many labels it hides.
  Timeline.prototype.tryType = function (type, events, pos, x, W, room) {
    this.setType(type);
    var bandsH = this.layoutBands(pos, x, W);
    var budget = this.laneBudget(bandsH, true, room);
    var res = this.placeBest(events, pos, x, W, budget);
    return { compact: res.compact, height: bandsH + res.height + 14 + SIZE.axisBelow * this.unit };
  };

  // How many lanes, and how many px of them, the track may use.
  Timeline.prototype.laneBudget = function (bandsH, full, room) {
    var u = this.unit;
    var lane = SIZE.lane * u;
    var px;
    if (full) px = (room == null ? this.fullRoom() : room) - bandsH - 14 - SIZE.axisBelow * u;
    else if (global.innerHeight) {
      // Inline: keep the track to about two-thirds of the screen so the card fits under it,
      // and on a phone to half (labels are narrow there, so they stack; past half a phone
      // screen the lesson around the track drops out of reach).
      px = global.innerHeight * (this.narrow ? 0.5 : 0.68) - bandsH - 60;
    } else px = Infinity;
    var lanes = full ? Math.min(Math.max(Math.floor(px / lane), 1), 14) : Math.min(this.opts.lanes, Math.max(3, Math.floor(px / lane)));
    return { lanes: lanes, px: Math.max(px, lanes * lane) };
  };

  // Era bands: up to three label rows at the top; a label with no room hides (the band stays).
  // Returns the height the label rows take.
  Timeline.prototype.layoutBands = function (pos, x, W) {
    var self = this;
    var rowH = SIZE.bandRow * this.unit;
    var bandRows = [];
    this.eras.forEach(function (era) {
      var r = pos.get(era);
      era.band.hidden = !r;
      if (!r) return;
      var x0 = x(r[0]), x1 = Math.max(x(r[1]), x0 + 4);
      var label = era.band.firstChild;
      label.hidden = false;
      var labelW = (self.widths.get(era) || {}).full || era.label.length * 7.5 + 12;
      var start = Math.min(x0, W - 4 - labelW);
      var row = 0;
      while (row < 3 && bandRows[row] != null && bandRows[row] > start - 6) row++;
      if (row === 3) label.hidden = true;
      else bandRows[row] = start + labelW;
      label.style.left = (start - x0 + 2) + 'px';
      era.geo = { x0: x0, x1: x1, left: start - x0 + 2, w: labelW, row: row };
      era.band.style.left = x0 + 'px';
      era.band.style.width = (x1 - x0) + 'px';
      era.band.style.setProperty('--row', row === 3 ? 0 : row);
    });
    return bandRows.length ? bandRows.length * rowH + 6 : 0;
  };

  // Whole labels cost room. Place every label cut short first (the most that fit), then try the
  // tiers from most generous down; keep the first that hides no more labels and adds at most
  // three lanes of height (the lane budget still caps the track).
  Timeline.prototype.placeBest = function (events, pos, x, W, budget) {
    var last = LABEL_TIERS.length - 1;
    var cut = this.place(events, pos, x, W, budget, LABEL_TIERS[last]);
    for (var i = 0; i < last; i++) {
      var res = this.place(events, pos, x, W, budget, LABEL_TIERS[i]);
      if (res.compact <= cut.compact && res.height <= cut.height + 3 * SIZE.lane * this.unit) return res;
    }
    return cut;
  };

  // Lanes: lane 0 sits nearest the axis. Each label goes in the lowest lane where it fits, to
  // the right of its dot or else the left (a range's span is on the axis). In each lane a label tries
  // its whole self on one line, then wrapped onto two (that lane grows taller), then cut short;
  // only when none fit does it move up a lane. With no lane left it becomes a dot on the axis.
  // tier: [one-line max, two-line max] widths at type 1 (0 = not allowed).
  Timeline.prototype.place = function (events, pos, x, W, budget, tier) {
    var self = this;
    var u = this.unit;
    var vw = this.viewport.clientWidth;
    var laneH = SIZE.lane * u, twoH = SIZE.laneTwo * u;
    // A short label is at most half the canvas, so it always fits on one side of its dot. On a
    // phone a whole label may take at most ~60% of the track.
    var shortW = Math.min(SHORT * u, (W - 4) / 2);
    var cap = this.narrow ? vw * 0.6 : Infinity;
    var wideW = Math.min(tier[0] * u, cap), twoW = Math.max(Math.min(tier[1] * u, cap), tier[1] ? shortW : 0);
    var lanes = [], heights = [], used = 0, placed = [];
    function fits(lane, a, b) {
      return a >= 2 && b <= W - 2 && lane.every(function (iv) { return b + 8 <= iv[0] || a >= iv[1] + 8; });
    }
    // Headline events (data-major) claim label room first; the rest fill in around them.
    var order = events.filter(function (it) { return it.major; }).concat(events.filter(function (it) { return !it.major; }));
    order.forEach(function (it) {
      var px = x(pos.get(it));
      var m = self.widths.get(it) || { full: 120, label: 90 };
      var range = it.parsed && it.parsed.end > it.parsed.start && self.p ? x(self.p.norm(it.parsed.end)) - px : 0;
      var forms = [];
      if (m.full <= Math.min(shortW * 1.1, (W - 4) / 2)) forms.push({ w: m.full }); // a few px over: show it whole
      else {
        if (m.full <= wideW) forms.push({ w: m.full });
        if (twoW > shortW) forms.push({ w: Math.min(Math.max(shortW, Math.ceil(m.label * 0.56) + m.full - m.label), twoW), two: true });
        forms.push({ w: shortW });
      }
      var hit = null;
      for (var l = 0; l < budget.lanes && !hit; l++) {
        if (!lanes[l]) {
          if (used + laneH > budget.px + 0.5) break;
          lanes[l] = [];
          heights[l] = laneH;
          used += laneH;
        }
        for (var f = 0; f < forms.length && !hit; f++) {
          var form = forms[f];
          if (form.two && heights[l] < twoH && used + twoH - heights[l] > budget.px + 0.5) continue;
          var width = form.w;
          if (fits(lanes[l], px, px + width)) hit = { lane: l, flip: false, width: width, two: form.two };
          else if (fits(lanes[l], px - width, px)) hit = { lane: l, flip: true, width: width, two: form.two };
        }
      }
      if (hit) {
        lanes[hit.lane].push(hit.flip ? [px - hit.width, px] : [px, px + hit.width]);
        if (hit.two && heights[hit.lane] < twoH) { used += twoH - heights[hit.lane]; heights[hit.lane] = twoH; }
      }
      placed.push({ it: it, px: px, range: range, lane: hit ? hit.lane : -1, flip: !!(hit && hit.flip), width: hit ? hit.width : 0, two: !!(hit && hit.two) });
    });
    // A lane opened for a label that fit nowhere stays empty: drop it.
    while (lanes.length && !lanes[lanes.length - 1].length) { lanes.pop(); used -= heights.pop(); }
    var base = [], acc = 0;
    heights.forEach(function (h, i) { base[i] = acc; acc += h; });
    var compact = placed.filter(function (p) { return p.lane === -1; }).length;
    return { placed: placed, base: base, height: Math.max(used, laneH), compact: compact };
  };

  // The axis, redrawn on every scroll frame for what's in view: tick labels, unlabelled minor
  // ticks, gridlines up through the lanes, Deep time's powers-of-ten stripes, the BC|AD line,
  // the selected event's date, and era labels held at the edges of the view.
  Timeline.prototype.renderTicks = function () {
    if (this.root.dataset.tlView !== 'track') return;
    var self = this;
    var ticks = this.ticks, grid = this.gridLayer;
    ticks.textContent = '';
    grid.textContent = '';
    var W = this.canvas.offsetWidth;
    var inner = W - PAD * 2;
    var vis0 = this.viewport.scrollLeft, vis1 = vis0 + this.viewport.clientWidth;
    this.stickBandLabels(vis0, vis1);
    // Axis labels never touch: the selected event's date claims its place first, then "today"
    // and BC|AD, then the round numbers in order.
    var taken = [];
    var chip = this.renderCursor(vis0, vis1);
    if (chip) taken.push(chip);
    if (!this.p) return; // even spacing: no time axis
    if (!this.tickFont) {
      var probe = el('span', 'tl-tick', '0');
      ticks.appendChild(probe);
      var pcs = getComputedStyle(probe);
      this.tickFont = pcs.fontWeight + ' ' + pcs.fontSize + ' ' + pcs.fontFamily;
      probe.remove();
    }
    var font = this.tickFont;
    var p = this.p;
    var ctx = { deep: this.ctx.deep, bc: this.ctx.bc, short: !!this.narrow };
    var toX = function (t) { return PAD + p.norm(t) * inner; };
    var inView = function (px) { return px >= vis0 - 2 && px <= vis1 + 2 && px >= PAD - 1 && px <= W - PAD + 1; };
    var list = [], minors = [], first = [];
    if (this.scale === 'log') {
      // Round "years ago" values, coarsest first: 1, 2, 5 × 10^k; then 3, 4, 6–9 × 10^k where a
      // decade is wide enough; then tenths of a decade (4,100 … 4,900) deep in a zoom. Labels
      // that would touch are dropped below, so finer levels only fill gaps. Unlabelled minor
      // ticks mark the next level down (log paper: they bunch up toward each power of ten).
      // No ticks out in the padding before the first event (nothing is 20 billion years old).
      var agoHi = Math.pow(10, -p.first), agoLo = Math.max(Math.pow(10, -p.hi), 1);
      var levels = [[], [], []], minorTimes = [];
      for (var k = Math.floor(Math.log10(agoHi)); k >= 0; k--) {
        var pk = Math.pow(10, k);
        var dA = toX(NOW - pk * 10), dB = toX(NOW - pk);
        if (dB < vis0 - 40 || dA > vis1 + 40) continue;
        var dw = dB - dA;
        var add = function (into, ago) {
          if (ago > agoHi || ago < agoLo) return;
          if (inView(toX(NOW - ago))) into.push(NOW - ago);
        };
        [5, 2, 1].forEach(function (m) { add(levels[0], m * pk); });
        if (dw > 60) [9, 8, 7, 6, 4, 3].forEach(function (m) { add(levels[1], m * pk); });
        if (k >= 1 && dw > 900) for (var q = 99; q >= 10; q--) if (q % 10) add(levels[2], q * pk / 10);
        // Minor ticks one level finer than the finest labels this decade can hold.
        if (k >= 1 && dw > 300) for (var r = 99; r >= 10; r--) add(minorTimes, r * pk / 10);
        else if (dw > 30) for (var mm = 9; mm >= 1; mm--) add(minorTimes, mm * pk);
      }
      list = levels[0].concat(levels[1], levels[2]);
      minorTimes.forEach(function (t) { minors.push(toX(t)); });
      if (toX(NOW) <= vis1 + 2) first.push(NOW); // "today" closes the deep-time axis
      // Every other power of ten is shaded: each stripe reaches 10× further back than the last.
      for (var d = Math.floor(Math.log10(agoLo)); d <= Math.ceil(Math.log10(agoHi)); d++) {
        if (d % 2) continue;
        var a = toX(NOW - Math.min(Math.pow(10, d + 1), agoHi)), b = toX(NOW - Math.max(Math.pow(10, d), agoLo));
        if (b < vis0 || a > vis1 || b - a < 1) continue;
        var stripe = grid.appendChild(el('span', 'tl-decade'));
        stripe.style.left = a + 'px';
        stripe.style.width = (b - a) + 'px';
      }
    } else {
      var view0 = vis0 - 160, view1 = vis1 + 160;
      var tAt = function (px) { return p.lo + (px - PAD) / inner * (p.hi - p.lo); };
      var t0 = tAt(Math.max(view0, PAD)), t1 = tAt(Math.min(view1, W - PAD));
      // ~130px between ticks; closer on a phone, where steps round up a lot (25 years → 50) and
      // any labels that would touch are dropped below anyway
      var per = (p.hi - p.lo) / inner * (this.narrow ? SIZE.tickGapNarrow : SIZE.tickGap) * (this.unit || 1);
      list = linearTicks(t0, t1, Math.max((t1 - t0) / per, 1), this.ctx);
      // Minor ticks: five to a step, when they'd be at least 7px apart.
      var step = list.length > 1 ? list[1] - list[0] : 0;
      if (step && step / 5 / (p.hi - p.lo) * inner >= 7) {
        for (var n = -5; n <= list.length * 5 + 5; n++) {
          if (n % 5 === 0) continue;
          var nx = toX(list[0] + n * step / 5);
          if (inView(nx)) minors.push(nx);
        }
      }
      if (!ctx.deep) {
        // Today, when the line reaches it.
        if (p.norm(NOW) >= 0 && p.norm(NOW) <= 1) {
          list = list.filter(function (t) { return Math.abs(t - NOW) > 0.5; });
          first.push(NOW);
        }
        // The turn from BC to AD, as a dotted line.
        if (p.lo < 0 && p.hi > 0) {
          var zx = toX(0);
          if (inView(zx)) {
            var zero = grid.appendChild(el('span', 'tl-gridline tl-zero'));
            zero.style.left = zx + 'px';
          }
          list = list.filter(function (t) { return t !== 0; });
          first.push(0);
        }
      }
    }
    minors.forEach(function (px) {
      var minor = ticks.appendChild(el('span', 'tl-minor'));
      minor.style.left = px + 'px';
    });
    first.concat(list).forEach(function (t) {
      var px = toX(t);
      // Only ticks inside the view: the axis re-renders on every scroll frame anyway.
      if (px < vis0 || px > vis1 || px < PAD - 1 || px > W - PAD + 1) return;
      var now = t >= NOW - 0.5;
      var text = now && !ctx.deep ? 'today' : formatTick(t, ctx);
      var tick = el('span', 'tl-tick' + (now ? ' tl-now' : ''), text);
      tick.style.left = px + 'px';
      // Keep labels at the edges of the view readable instead of half cut off.
      var w = tickWidth(text, font), a = px - w / 2;
      if (a < vis0 + 2) { tick.classList.add('tl-tick-start'); a = px - 4; }
      else if (px + w / 2 > vis1 - 2) { tick.classList.add('tl-tick-end'); a = px + 4 - w; }
      if (taken.some(function (r) { return a < r[1] + 10 && a + w > r[0] - 10; })) return;
      taken.push([a, a + w]);
      ticks.appendChild(tick);
      if (t !== 0) {
        var line = grid.appendChild(el('span', 'tl-gridline'));
        line.style.left = px + 'px';
      }
    });
  };

  // The reading line through the selected event and its date on the axis. Returns the date's
  // extent on the axis [left, right], or null.
  Timeline.prototype.renderCursor = function (vis0, vis1) {
    var it = this.sel !== -1 ? this.events[this.sel] : null;
    var on = !!(it && !it.mark.hidden && it.px != null);
    this.cursor.hidden = this.cursorDate.hidden = !on;
    if (!on) return null;
    [this.cursor, this.cursorDate].forEach(function (node) {
      if (it.tint) node.style.setProperty('--tl-c', it.tint); else node.style.removeProperty('--tl-c');
    });
    this.cursor.style.left = it.px + 'px';
    var text = it.display || it.when;
    if (this.cursorDate.textContent !== text) this.cursorDate.textContent = text;
    var w = this.cursorDate.offsetWidth;
    var left = Math.min(Math.max(it.px - w / 2, vis0 + 2), vis1 - 2 - w);
    this.cursorDate.style.left = left + 'px';
    return it.px >= vis0 && it.px <= vis1 ? [left, left + w] : null;
  };

  // An era whose start is off screen keeps its name in view: pinned to the left edge while
  // the era runs on, or to the right edge as it comes into view. Labels that would then
  // collide in a row give way to the one already placed.
  Timeline.prototype.stickBandLabels = function (vis0, vis1) {
    var rows = [[], [], []];
    this.eras.forEach(function (era) {
      var label = era.band.firstChild, g = era.geo;
      label.style.visibility = '';
      if (!g || era.band.hidden || label.hidden) return;
      var x = g.x0 + g.left;
      if (g.x1 < vis0 || g.x0 > vis1) return;
      if (x < vis0 + 4) {
        x = Math.max(x, Math.min(vis0 + 4, g.x1 - g.w - 2));
        // Too little of the era left on screen to hold its name: leave it for the next era.
        if (x < vis0) { label.style.visibility = 'hidden'; return; }
      } else if (x + g.w > vis1 - 4) x = Math.max(vis1 - 4 - g.w, vis0 + 4);
      label.style.left = (x - g.x0) + 'px';
      rows[g.row].push({ label: label, a: x, b: x + g.w });
    });
    rows.forEach(function (row) {
      row.sort(function (p, q) { return p.a - q.a; });
      var right = -Infinity;
      row.forEach(function (r) {
        if (r.a < right + 6) { r.label.style.visibility = 'hidden'; return; }
        right = r.b;
      });
    });
  };

  // Tick label widths, measured in the axis's real font (fonts vary a lot across themes and phones).
  var measureCtx = null;
  function tickWidth(text, font) {
    if (!measureCtx && typeof document !== 'undefined') measureCtx = document.createElement('canvas').getContext('2d');
    if (!measureCtx || !font) return String(text).length * 7 + 6;
    measureCtx.font = font;
    return measureCtx.measureText(String(text)).width + 6;
  }

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
      ev.stem.classList.toggle('is-current', on);
    });
    this.updateCounter();

    // Detail card: the item's own content (images, links and all), plus how long ago.
    var detail = this.detail;
    detail.textContent = '';
    if (it.tint) detail.style.setProperty('--tl-c', it.tint); else detail.style.removeProperty('--tl-c');
    var head = el('div', 'tl-detail-head');
    if (it.display || it.when) head.appendChild(el('span', 'tl-date', it.display || it.when));
    var rel = relativeText(it.parsed);
    if (rel) head.appendChild(el('span', 'tl-ago', rel));
    if (it.group) head.appendChild(el('span', 'tl-detail-group', it.group));
    detail.appendChild(head);
    var cosmic = this.opts.cosmic && it.parsed ? cosmicCalendar(it.parsed.start) : null;
    if (cosmic) {
      var cal = el('div', 'tl-cosmic');
      cal.title = 'Squeeze all 13.8 billion years of the universe into one calendar year (Carl Sagan\u2019s Cosmic Calendar): the Big Bang is midnight on January 1 and today is midnight on December 31.';
      cal.appendChild(el('span', 'tl-cosmic-label', 'If the universe were one year'));
      var year = el('span', 'tl-cosmic-year');
      year.setAttribute('aria-hidden', 'true');
      MONTH_NAMES.forEach(function (name) { year.appendChild(el('span', 'tl-cosmic-month', name.charAt(0))); });
      var pin = el('span', 'tl-cosmic-pin');
      pin.style.left = (cosmic.fraction * 100).toFixed(3) + '%';
      year.appendChild(pin);
      cal.appendChild(year);
      cal.appendChild(el('strong', 'tl-cosmic-when', cosmic.text));
      detail.appendChild(cal);
    }
    var body = el('div', 'tl-detail-body');
    var clone = it.li.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll('.tl-date, .tl-gap, .tl-src'), function (n) { n.remove(); });
    Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
    while (clone.firstChild) body.appendChild(clone.firstChild);
    detail.appendChild(body);

    if (this.root.dataset.tlView === 'track') this.renderTicks(); // the reading line moves
    if (opts.focus && this.root.dataset.tlView === 'track') it.mark.focus({ preventScroll: true });
    this.emit('timeline:select', { li: it.li, label: it.label });
    // A crowded event shows as a bare dot: fly in until it gets its label, or over to it if it's off screen.
    if (!opts.quiet && this.root.dataset.tlView === 'track') {
      var target = this.targetFor(i);
      if (!target.stay) this.flyTo(target.z, target.c);
    }
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

  // Static lesson timelines authored before the shared engine. These are
  // adapted at runtime so their authored cards remain the source content while
  // the class gets the common list/track controls. Interactive simulator tracks
  // are intentionally absent from this map.
  var LEGACY_TIMELINES = [
    ['.prism-timeline', '.prism-tl-item', 'Newton and the prism'],
    ['.vr-mini-timeline', '.vr-mini-entry', 'A short history of virtual reality'],
    ['.ez-timeline', 'article', 'Ezekiel in historical context'],
    ['.pt-timeline', '.pt-timeline-item', 'How the periodic table emerged'],
    ['.tt-timeline', '.tt-time', 'Milestones toward the Turing test'],
    ['.pf-timeline', '.pf-tl-item', 'A brief history of Python'],
    ['.cgi-timeline', '.cgi-era', 'Breakthrough moments in computer graphics'],
    ['.timeline[aria-label="Panama Canal timeline"]', ':scope > *', 'Building the Panama Canal'],
    ['.athens-timeline', '.athens-timeline-card', 'Ideas behind the School of Athens'],
    ['.dv-timeline', '.dv-timeline-card', 'Leonardo across science and art'],
    ['.aa-timeline', ':scope > *', 'Discoveries in amino acids and proteins'],
    ['.c-timeline', '.c-tstep', 'The timeline of animal life'],
    ['.timeline', '.discovery', 'Documented discoveries in cryptozoology'],
    ['.timeline', '.timeline-item', 'Historical timeline'],
    ['.four-timeline', '.four-tl-item', 'A history of Fourier series'],
    ['.ct-timeline', '.ct-tl-item', 'How people measured time'],
    ['.ml-timeline', '.ml-tl-item', 'A history of measuring length'],
    ['.lv-timeline', '.lv-tl-item', 'Levers across human history'],
    ['.wa-timeline', '.wa-tl-item', 'The wheel and axle through history'],
    ['.music-timeline', '.music-era', 'Ideas that shaped the physics of music'],
    ['.ch-history-grid', '.ch-timeline-card', 'Chess history', true],
    ['.history-timeline', '.tl-era', 'The history of video games', true],
    ['.timeline-track', '.tl-node', 'The evolution of wood', true],
    ['.we-timeline-nav', '.we-timeline-btn', 'The history of electricity', true]
  ];

  function legacyItems(container, selector) {
    return Array.prototype.filter.call(container.querySelectorAll(selector), function (node) {
      if (node === container) return false;
      var parent = node.parentElement;
      while (parent && parent !== container) parent = parent.parentElement;
      return parent === container;
    });
  }

  function adaptLegacyTimelines(scope) {
    LEGACY_TIMELINES.forEach(function (spec) {
      Array.prototype.forEach.call(scope.querySelectorAll(spec[0]), function (container) {
        if (container.hasAttribute('data-timeline-legacy') || container.closest('.tl')) return;
        var items = legacyItems(container, spec[1]);
        if (items.length < 2) return;
        var hasDates = items.some(function (item) {
          return parseWhen(timelineDateValue(item.textContent));
        });
        if (!hasDates) return;
        var host = el('div');
        host.setAttribute('data-timeline', '');
        host.setAttribute('data-timeline-title', container.getAttribute('aria-label') || spec[2]);
        var list = el('ol');
        items.forEach(function (item) {
          var li = el('li');
          Array.prototype.forEach.call(item.attributes, function (attr) {
            if (/^data-/.test(attr.name)) li.setAttribute(attr.name, attr.value);
          });
          li.innerHTML = item.innerHTML;
          list.appendChild(li);
        });
        host.appendChild(list);
        container.parentNode.insertBefore(host, spec[3] ? container.nextSibling : container);
        container.setAttribute('data-timeline-legacy', '');
        if (!spec[3]) container.hidden = true;
      });
    });

    // Pangaea's original timeline is a live geologic slider rather than a
    // collection of cards. Add a shared historical companion without hiding
    // or changing the map and slider controls.
    Array.prototype.forEach.call(scope.querySelectorAll('.pd-timeline'), function (container) {
      if (container.hasAttribute('data-timeline-legacy')) return;
      var host = el('div');
      host.setAttribute('data-timeline', '');
      host.setAttribute('data-timeline-title', 'Pangaea to the present');
      var list = el('ol');
      [
        ['240 Ma', 'Pangaea assembled', 'Most of Earth’s land is joined in one supercontinent.'],
        ['180 Ma', 'The breakup begins', 'Rifting opens new ocean basins as the supercontinent starts to split.'],
        ['120 Ma', 'Continents separate', 'The Atlantic widens and the southern continents move toward their modern arrangement.'],
        ['66 Ma', 'A changed planet', 'The continents are recognizable, though their positions and coastlines continue to shift.'],
        ['present', 'Today', 'Continental plates still move a few centimetres each year.']
      ].forEach(function (event) {
        var li = el('li');
        li.setAttribute('data-when', event[0]);
        li.setAttribute('data-label', event[1]);
        li.textContent = event[2];
        list.appendChild(li);
      });
      host.appendChild(list);
      container.parentNode.insertBefore(host, container);
      container.setAttribute('data-timeline-legacy', '');
    });
  }

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
    var scope = root || document;
    adaptLegacyTimelines(scope);
    // Historical lesson pages predate the shared engine and use namespaced
    // timeline classes. Upgrade only semantic ordered/unordered lists; app
    // scrubbers, timeline divs, and other interactive widgets stay untouched.
    Array.prototype.forEach.call(scope.querySelectorAll('ol[class*="timeline"], ul[class*="timeline"]'), function (node) {
      node.setAttribute('data-timeline', '');
    });
    Array.prototype.forEach.call(scope.querySelectorAll('[data-timeline]'), function (node) {
      var t = enhance(node);
      if (t) out.push(t);
    });
    return out;
  }

  // Print always uses the list. Capture so this runs before the print planner measures.
  var printViews = null;
  global.addEventListener('beforeprint', function () {
    all.forEach(function (t) { if (t.pseudoFull) t.setPseudoFull(false); });
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

  // Labels are sized to their text, so measure again once a web font arrives (a weight first
  // used by the track starts loading only when the track is measured with the fallback font).
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener('loadingdone', function () {
      all.forEach(function (t) { t.widths = null; t.layout(); });
    });
  }

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
