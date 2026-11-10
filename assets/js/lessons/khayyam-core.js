/* Khayyam core: the maths and poetics behind the Omar Khayyam lesson, with no DOM.
 *
 *   KhayyamCore.cubic(c, d)              → Khayyam's construction for x³ + c·x = d:
 *                                           parabola x² = a·y (a = √c) meets the circle on
 *                                           diameter b = d/c; the meeting point's x is the root
 *   KhayyamCore.intersect(c, d)          → that meeting point found geometrically (bisection)
 *   KhayyamCore.cardano(c, d)            → the same root by Cardano's 1545 formula
 *   KhayyamCore.CALENDARS                → Julian, Gregorian and Jalali leap rules
 *   KhayyamCore.drift(rule, years)       → days a rule drifts from the seasons in `years`
 *   KhayyamCore.yearsPerDay(rule)        → years for a rule to slip one whole day
 *   KhayyamCore.convergents(x, n)        → continued-fraction convergents (8/33 is one of them)
 *   KhayyamCore.jalaliLeaps()            → the leap years inside one 33-year cycle
 *   KhayyamCore.summitAngle(K, a, b)     → Khayyam–Saccheri quadrilateral summit angle
 *   KhayyamCore.pascalRow(n)             → binomial coefficients ("Khayyam's triangle")
 *   KhayyamCore.expand(n)                → "a² + 2ab + b²"
 *   KhayyamCore.rhymeKey(word)           → the sound a line ends on (spelling heuristic)
 *   KhayyamCore.syllables(text)          → syllable estimate for a word or line
 *   KhayyamCore.scheme(lines)            → rhyme letters, e.g. ['A','A','B','A']
 *   KhayyamCore.checkRubai(lines)        → is this a rubāʿī (AABA or AAAA)? with notes
 *   KhayyamCore.diffWords(a, b)          → word-level diff between two versions of a line
 *
 * Used by khayyam-lab.js. Tests: node --test tests/omar-khayyam.test.mjs
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KhayyamCore = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function round(x, places) { var p = Math.pow(10, places || 0); return Math.round(x * p) / p; }

  /* ── Cubics by conic sections ──────────────────────────────────────
     Khayyam's case "a cube and sides equal a number": x³ + c·x = d (c, d > 0).
     Take a = √c and b = d / c. The parabola x² = a·y and the circle
     x² + y² = b·x (diameter b along the axis, through the origin) meet at
     one point besides the origin. Substituting y = x²/a into the circle:
       x² + x⁴/a² = b·x  →  x³ + a²·x = a²·b  →  x³ + c·x = d.
     So the meeting point's x is the root. Always exactly one positive root. */

  function parabolaY(x, a) { return (x * x) / a; }
  function circleY(x, b) { var v = x * (b - x); return v > 0 ? Math.sqrt(v) : 0; }

  function cardano(c, d) {
    // x³ + p·x + q = 0 with p = c, q = −d. With p > 0 the discriminant is positive: one real root.
    var p = c, q = -d;
    var disc = Math.sqrt((q * q) / 4 + (p * p * p) / 27);
    return Math.cbrt(-q / 2 + disc) + Math.cbrt(-q / 2 - disc);
  }

  function intersect(c, d) {
    var a = Math.sqrt(c), b = d / c;
    // f(x) = parabola − circle: negative just right of 0 (parabola under the circle), positive at x = b.
    var lo = 1e-12, hi = b;
    for (var i = 0; i < 200; i++) {
      var mid = (lo + hi) / 2;
      if (parabolaY(mid, a) - circleY(mid, b) > 0) hi = mid; else lo = mid;
    }
    var x = (lo + hi) / 2;
    return { x: x, y: parabolaY(x, a) };
  }

  function cubic(c, d) {
    if (!(c > 0) || !(d > 0)) throw new RangeError('Khayyam works with positive magnitudes: c and d must be > 0');
    var a = Math.sqrt(c), b = d / c;
    var p = intersect(c, d);
    return {
      a: a,
      b: b,
      x: p.x,
      y: p.y,
      check: p.x * p.x * p.x + c * p.x,
      cardano: cardano(c, d)
    };
  }

  /* ── Calendars ─────────────────────────────────────────────────────
     A leap rule "L leap days every N years" gives a mean year of 365 + L/N
     days. The mean tropical year (equinox to equinox, averaged) is about
     365.24219 days. The difference, times the years, is how far the
     calendar date of the equinox slides. */

  var TROPICAL_YEAR = 365.24219;

  var CALENDARS = {
    julian: { id: 'julian', name: 'Julian', leaps: 1, cycle: 4, adopted: '46 BC', rule: '1 leap day every 4 years' },
    gregorian: { id: 'gregorian', name: 'Gregorian', leaps: 97, cycle: 400, adopted: 'AD 1582', rule: 'every 4th year, but not centuries unless divisible by 400 (97 in 400)' },
    jalali: { id: 'jalali', name: 'Jalali (33-year pattern)', leaps: 8, cycle: 33, adopted: 'AD 1079', rule: '8 leap days every 33 years' }
  };

  function meanYear(rule) { return 365 + rule.leaps / rule.cycle; }
  function drift(rule, years, tropical) {
    return (meanYear(rule) - (tropical || TROPICAL_YEAR)) * years;
  }
  function yearsPerDay(rule, tropical) {
    var e = Math.abs(meanYear(rule) - (tropical || TROPICAL_YEAR));
    return e === 0 ? Infinity : 1 / e;
  }

  // Continued-fraction convergents of x (0 < x < 1 for the leap fraction).
  function convergents(x, count) {
    var out = [];
    var h0 = 1, h1 = Math.floor(x), k0 = 0, k1 = 1;
    var frac = x - Math.floor(x);
    out.push({ num: h1, den: k1 });
    for (var i = 1; i < count && frac > 1e-12; i++) {
      var inv = 1 / frac;
      var a = Math.floor(inv);
      frac = inv - a;
      var h2 = a * h1 + h0, k2 = a * k1 + k0;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      out.push({ num: h1, den: k1 });
    }
    return out;
  }

  // The 8 leap years inside one 33-year cycle: every 4th year seven times, then a 5-year gap.
  function jalaliLeaps() { return [4, 8, 12, 16, 20, 24, 28, 33]; }

  /* ── The parallel postulate ────────────────────────────────────────
     Khayyam–Saccheri quadrilateral: base AB, equal legs AD and BC at right
     angles to it. The two summit angles at C and D are equal; Euclid's
     parallel postulate is equivalent to their being right angles.
     On a surface of constant curvature K, Gauss–Bonnet says the angle sum is
     360° + K·Area. For a small quadrilateral (area ≈ legs × base) each summit
     angle is about 90° + K·a·b/2 (radians). K > 0: obtuse (sphere), K < 0: acute
     (hyperbolic plane), K = 0: right (Euclid). */
  function summitAngle(K, a, b) {
    var deg = 90 + (K * a * b / 2) * 180 / Math.PI;
    return Math.max(1, Math.min(179, deg));
  }

  /* ── Binomial coefficients ─────────────────────────────────────── */
  function pascalRow(n) {
    var row = [1];
    for (var k = 1; k <= n; k++) row.push(row[k - 1] * (n - k + 1) / k);
    return row;
  }
  var SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function sup(n) { return n === 1 ? '' : String(n).split('').map(function (ch) { return SUP[ch]; }).join(''); }
  function expand(n) {
    if (n === 0) return '1';
    var row = pascalRow(n);
    return row.map(function (coef, k) {
      var ap = n - k, bp = k;
      var term = (coef === 1 ? '' : String(coef)) + (ap ? 'a' + sup(ap) : '') + (bp ? 'b' + sup(bp) : '');
      return term;
    }).join(' + ');
  }

  /* ── Rhyme, metre and the rubāʿī ───────────────────────────────────
     English spelling is not sound, so these are heuristics a student can
     overrule in the UI. rhymeKey keeps the last vowel group and what
     follows it, after dropping a plural -s and a silent final -e. */

  /* rhymeKey(word) turns a spelling into a rough sound for its last stressed
     syllable: a vowel sound (AY, EE, AI, OH, OO, OW, OY, AW, AIR, OR, UR, AR …
     or a short vowel A E I O U) plus its final consonants. "night" and "light"
     → "AI-t"; "knows" and "rose" → "OH-s"; "rolled" and "old" → "OH-ld".
     It is tuned on FitzGerald's own rhymes (tests/omar-khayyam.test.mjs). */

  var VOWELS = 'aeiouy';
  var EXCEPT = {
    one: 'U-n', done: 'U-n', none: 'U-n', won: 'U-n', son: 'U-n', gone: 'O-n', anon: 'O-n', upon: 'O-n',
    come: 'U-m', some: 'U-m', become: 'U-m', from: 'U-m', love: 'U-v', dove: 'U-v', above: 'U-v', glove: 'U-v',
    shove: 'U-v', of: 'U-v', move: 'OO-v', prove: 'OO-v', have: 'A-v', give: 'I-v', live: 'I-v', forgive: 'I-v',
    friend: 'E-nd', said: 'E-d', says: 'E-s', again: 'AY-n', against: 'E-nst', were: 'UR-', been: 'I-n',
    eye: 'AI-', i: 'AI-', by: 'AI-', my: 'AI-', buy: 'AI-', bye: 'AI-', guy: 'AI-', why: 'AI-', thy: 'AI-',
    do: 'OO-', to: 'OO-', too: 'OO-', two: 'OO-', who: 'OO-', you: 'OO-', through: 'OO-', shoe: 'OO-',
    thou: 'OW-', bough: 'OW-', plough: 'OW-', enow: 'OW-', now: 'OW-', how: 'OW-', cow: 'OW-', vow: 'OW-',
    brow: 'OW-', allow: 'OW-', endow: 'OW-', bow: 'OW-', though: 'OH-', dough: 'OH-', although: 'OH-',
    enough: 'U-f', rough: 'U-f', tough: 'U-f', hour: 'OWR-', our: 'OWR-', flour: 'OWR-', sour: 'OWR-',
    your: 'OR-', pour: 'OR-', four: 'OR-', mourn: 'OR-n', bourn: 'OR-n', heart: 'AR-t', hearth: 'AR-th',
    what: 'U-t', was: 'O-s', the: 'U-', a: 'U-', key: 'EE-', broad: 'AW-d', bowl: 'OH-l', soul: 'OH-l',
    head: 'E-d', dead: 'E-d', bread: 'E-d', dread: 'E-d', thread: 'E-d', spread: 'E-d', instead: 'E-d',
    blood: 'U-d', flood: 'U-d', good: 'UU-d', wood: 'UU-d', stood: 'UU-d', hood: 'UU-d', could: 'UU-d',
    would: 'UU-d', should: 'UU-d', there: 'AIR-', where: 'AIR-', their: 'AIR-', most: 'OH-st', post: 'OH-st',
    host: 'OH-st', ghost: 'OH-st', almost: 'OH-st', both: 'OH-th', only: 'OH-nlee', whom: 'OO-m', tomb: 'OO-m', womb: 'OO-m'
  };
  var OWN = { down: 1, town: 1, crown: 1, frown: 1, gown: 1, drown: 1, brown: 1, clown: 1 };
  var LONG = { a: 'AY', e: 'EE', i: 'AI', o: 'OH', u: 'OO', y: 'AI' };
  var SHORT = { a: 'A', e: 'E', i: 'I', o: 'O', u: 'U', y: 'I' };

  function coda(c) {
    return String(c || '')
      .replace(/tch/g, 'ch').replace(/dg/g, 'j').replace(/ck/g, 'k').replace(/ph/g, 'f')
      .replace(/gh/g, '').replace(/^gn$/, 'n').replace(/mb$/, 'm').replace(/c$/, 'k').replace(/z/g, 's')
      .replace(/([b-df-hj-np-tv-z])\1/g, '$1');
  }

  // Rules on the end of a word, first match wins: [pattern, nucleus, coda group index].
  var RULES = [
    [/eigh(t?)$/, 'AY'], [/igh(t?)$/, 'AI'], [/(?:ou|au)ght$/, 'AW', null, 't'],
    [/ear(n|th|nd|l|ly|ch)$/, 'UR'], [/(?:b|p|sw|w|t)ear$/, 'AIR'], [/ear$/, 'EER'],
    [/(?:ai|ea)r$/, 'AIR'], [/(?:ai|ay|ey|ei|ae)([^aeiouy]*)$/, 'AY'],
    [/(?:ie|ye)$/, 'AI'], [/ied$/, 'AI', null, 'd'],
    [/ield$/, 'EE', null, 'ld'], [/(?:ee|ea|ie)([^aeiouy]*)$/, 'EE'],
    [/oor$/, 'OR'], [/oo(k)$/, 'UU'], [/oo([^aeiouy]*)$/, 'OO'],
    [/our$/, 'OR'], [/ourn$/, 'UR', null, 'n'], [/oul$/, 'OH', null, 'l'], [/ou$/, 'OO'], [/ou([^aeiouy]+)$/, 'OW'],
    [/oa([^aeiouy]*)$/, 'OH'], [/oe$/, 'OH'], [/(?:oi|oy)([^aeiouy]*)$/, 'OY'], [/(?:au|aw)([^aeiouy]*)$/, 'AW'],
    [/(?:ue|ew)$/, 'OO'], [/ui([^aeiouy]+)$/, 'OO'],
    [/own$/, null], [/ow([^aeiouy]*)$/, 'OH'],
    [/ind$/, 'AI', null, 'nd'], [/ild$/, 'AI', null, 'ld'], [/old$/, 'OH', null, 'ld'], [/olt$/, 'OH', null, 'lt'],
    [/oll$/, 'OH', null, 'l'], [/all$/, 'AW', null, 'l'], [/alk$/, 'AW', null, 'k'], [/ign$/, 'AI', null, 'n'],
    [/w[ao]r([^aeiouy]*)$/, 'OR'], [/wa([^aeiouyr]+)$/, 'O'],
    [/are$/, 'AIR'], [/(?:wh|th)ere$/, 'AIR'], [/ere$/, 'EER'], [/ire$/, 'AIR-ER'], [/ore$/, 'OR'], [/ure$/, 'OOR'],
    [/or([^aeiouy]+)e?$/, 'OR'], [/or$/, 'OR'], [/ar([^aeiouy]*)e?$/, 'AR'], [/[eiu]r([^aeiouy]*)e?$/, 'UR'],
    [/([aeiouy])([^aeiouyw]{1,2})e$/, 'MAGIC']
  ];

  var COMPOUND = ['said', 'come', 'gone', 'give', 'love', 'move', 'prove', 'friend', 'head', 'bread', 'dead', 'where', 'there', 'blood'];
  function rimeOf(w) {
    if (EXCEPT[w]) return EXCEPT[w];
    for (var x = 0; x < COMPOUND.length; x++) {
      if (w.length > COMPOUND[x].length && w.slice(-COMPOUND[x].length) === COMPOUND[x]) return EXCEPT[COMPOUND[x]];
    }
    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i];
      var m = w.match(r[0]);
      if (!m) continue;
      if (r[1] === null) return (OWN[w] ? 'OW' : 'OH') + '-n';
      if (r[1] === 'MAGIC') {
        var v = m[1], c = m[2];
        if (/^(?:ll|ss|ff|ck|tt|nn|rr|dd|pp)$/.test(c)) break;           // not a silent e: "rifle", "gaffe"
        if (v === 'i' && c === 'v' && w.length > 6) return 'I-v';         // native, captive
        return LONG[v] + '-' + coda(c);
      }
      return r[1] + '-' + coda(r[3] != null ? r[3] : m[1]);
    }
    // Plain closed or open syllable.
    var end = w.length - 1;
    while (end >= 0 && VOWELS.indexOf(w[end]) < 0) end--;
    if (end < 0) return w;
    var tail = w.slice(end + 1);
    var vowel = w[end];
    if (!tail) {
      if (vowel === 'y') return (syllablesOf(w) === 1 || /(?:pl|f|n|cr|wr|sp)y$/.test(w) ? 'AI' : 'EE') + '-';
      if (vowel === 'e') return (w.length <= 4 ? 'EE' : 'EE') + '-';
      if (vowel === 'o') return 'OH-';
      return (LONG[vowel] || vowel) + '-';
    }
    return (SHORT[vowel] || vowel) + '-' + coda(tail);
  }

  function prep(word) {
    return String(word || '').toLowerCase()
      .replace(/[’']d$/, 'ed').replace(/[’']st$/, 'est').replace(/[’']/g, '')
      .replace(/[^a-z]/g, '').replace(/qu/g, 'kw').replace(/gu(?=[ie])/g, 'g');
  }

  function clean(word) { return String(word || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z]/g, ''); }
  function lastWord(line) {
    var words = String(line || '').trim().split(/\s+/).map(clean).filter(Boolean);
    return words.length ? words[words.length - 1] : '';
  }
  function lastRawWord(line) {
    var words = String(line || '').trim().split(/[\s—–]+|-{2,}/).filter(function (t) { return /[a-z]/i.test(t); });
    return words.length ? words[words.length - 1] : '';
  }

  function rhymeKey(word) {
    var w = prep(word);
    if (!w) return '';
    if (EXCEPT[w]) return EXCEPT[w];
    // -s endings (plurals, "knows"): the sound of the stem plus s.
    if (w.length > 3 && /s$/.test(w) && !/(?:ss|us|is|ous)$/.test(w)) {
      var stem = /ies$/.test(w) ? w.slice(0, -3) + 'y' : /(?:sh|ch|x|ss)es$/.test(w) ? w.slice(0, -2) : w.slice(0, -1);
      if (!/[aeiouy][^aeiouy]e$/.test(w) || /[aeiouy]e?s$/.test(w)) return rimeOf(stem).replace(/-(.*)$/, function (_, c) { return '-' + coda(c + 's'); });
    }
    // -ed endings: the stem plus d (or t after a voiceless sound: "discuss'd" → "-st").
    if (w.length > 4 && /ed$/.test(w) && !/(?:eed|ead|ied)$/.test(w)) {
      var st = w.slice(0, -2);
      var tail = /(?:s|k|p|f|sh|ch|x)$/.test(st) ? 't' : 'd';
      return rimeOf(st).replace(/-(.*)$/, function (_, c) { return '-' + coda(c + tail); });
    }
    return rimeOf(w);
  }

  function rhymes(a, b) {
    var ka = rhymeKey(a), kb = rhymeKey(b);
    return !!ka && ka === kb;
  }

  function wordSyllables(word) {
    var w = clean(word);
    if (!w) return 0;
    if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    var groups = w.match(/[aeiouy]{1,2}/g);
    return Math.max(1, groups ? groups.length : 1);
  }

  function syllablesOf(w) { return wordSyllables(w); }

  function syllables(text) {
    return String(text || '').split(/[\s—–-]+/).reduce(function (n, word) { return n + wordSyllables(word); }, 0);
  }

  function scheme(lines) {
    var letters = [];
    var keys = [];
    var next = 0;
    lines.forEach(function (line) {
      var key = rhymeKey(lastRawWord(line));
      if (!key) { letters.push('·'); return; }
      var found = keys.indexOf(key);
      if (found < 0) { keys.push(key); letters.push(String.fromCharCode(65 + next)); next++; }
      else letters.push(String.fromCharCode(65 + found));
    });
    return letters;
  }

  // letters can be supplied (the student overruled the heuristic) or computed.
  function checkRubai(lines, letters) {
    var L = (letters && letters.length === 4) ? letters.slice() : scheme(lines);
    var counts = lines.map(syllables);
    var notes = [];
    var filled = lines.filter(function (l) { return String(l || '').trim(); }).length;
    var pattern = L.join('');
    var isRubai = filled === 4 && L[0] === L[1] && L[1] === L[3] && L[0] !== '·';
    var turn = isRubai && L[2] !== L[0];
    if (filled < 4) notes.push('A rubāʿī has exactly four lines: ' + (4 - filled) + ' still empty.');
    else if (!isRubai) {
      if (L[0] !== L[1]) notes.push('Lines 1 and 2 should rhyme: that rhyme is the stanza’s anchor.');
      if (L[3] !== L[0]) notes.push('Line 4 should come home to the rhyme of lines 1 and 2.');
    } else if (turn) {
      notes.push('AABA: line 3 breaks the rhyme. That is the turn. Make it pivot the thought, so line 4 lands.');
    } else {
      notes.push('AAAA: all four rhyme. Persian poets allow it, but you lose the turn on line 3.');
    }
    if (filled === 4) {
      var spread = Math.max.apply(null, counts) - Math.min.apply(null, counts);
      if (spread > 3) notes.push('Line lengths range from ' + Math.min.apply(null, counts) + ' to ' + Math.max.apply(null, counts) + ' syllables. FitzGerald keeps every line near 10 (iambic pentameter).');
      else notes.push('Line lengths are even (' + counts.join(' · ') + ' syllables). FitzGerald aims for about 10.');
    }
    return { letters: L, pattern: pattern, isRubai: isRubai, hasTurn: turn, syllables: counts, notes: notes };
  }

  /* ── Word diff (for FitzGerald revising himself) ───────────────────
     Longest common subsequence over words, compared without case or
     punctuation. Returns ops: { op: 'same' | 'del' | 'add', text }. */
  function tokens(s) { return String(s || '').split(/\s+/).filter(Boolean); }
  function norm(t) { return clean(t); }

  function diffWords(a, b) {
    var A = tokens(a), B = tokens(b);
    var n = A.length, m = B.length;
    var L = [];
    for (var i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) {
      for (var j = m - 1; j >= 0; j--) {
        L[i][j] = norm(A[i]) === norm(B[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
      }
    }
    var ops = [];
    i = 0; j = 0;
    while (i < n && j < m) {
      if (norm(A[i]) === norm(B[j])) { ops.push({ op: 'same', text: B[j] }); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { ops.push({ op: 'del', text: A[i] }); i++; }
      else { ops.push({ op: 'add', text: B[j] }); j++; }
    }
    while (i < n) { ops.push({ op: 'del', text: A[i++] }); }
    while (j < m) { ops.push({ op: 'add', text: B[j++] }); }
    return ops;
  }

  // Share of words kept between two versions (0…1), on the longer version's length.
  function kept(a, b) {
    var ops = diffWords(a, b);
    var same = ops.filter(function (o) { return o.op === 'same'; }).length;
    var len = Math.max(tokens(a).length, tokens(b).length) || 1;
    return same / len;
  }

  return {
    round: round,
    parabolaY: parabolaY,
    circleY: circleY,
    cardano: cardano,
    intersect: intersect,
    cubic: cubic,
    TROPICAL_YEAR: TROPICAL_YEAR,
    CALENDARS: CALENDARS,
    meanYear: meanYear,
    drift: drift,
    yearsPerDay: yearsPerDay,
    convergents: convergents,
    jalaliLeaps: jalaliLeaps,
    summitAngle: summitAngle,
    pascalRow: pascalRow,
    expand: expand,
    rhymeKey: rhymeKey,
    rhymes: rhymes,
    lastWord: lastWord,
    syllables: syllables,
    scheme: scheme,
    checkRubai: checkRubai,
    diffWords: diffWords,
    kept: kept
  };
}));
