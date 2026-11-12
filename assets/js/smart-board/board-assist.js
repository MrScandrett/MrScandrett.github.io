/* Board assistant: commands (typed or spoken), lesson / quiz / glossary lookup, and the class
 * summary for the AI Smart Blackboard. No DOM, no network: the dock hands it the data.
 *
 *   BoardAssist.parseCommand('graph y equals x squared minus four') → { action: 'math', text: 'y = x^2 - 4' }
 *   BoardAssist.parseCommand('slice the cone at 60 degrees')        → { action: 'slice', solid: 'cone', tilt: 60 }
 *   BoardAssist.parseCommand('find a lesson on fractions')          → { action: 'lesson', query: 'fractions' }
 *   BoardAssist.searchLessons(lessons, 'fractions')                 → ranked catalog entries
 *   BoardAssist.pickQuiz(questions, 'gravity', seed)                → one multiple-choice question
 *   BoardAssist.summarize(events, { title, date })                  → { title, sections, text }
 *
 * Everything here is rules and keyword scoring. It does not understand open questions.
 * Tests: node --test tests/smart-board.test.mjs
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BoardAssist = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ── Spoken maths → written maths ── */
  var NUMBER_WORDS = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
    eighty: 80, ninety: 90
  };

  function spokenToMath(text) {
    var s = ' ' + String(text || '').toLowerCase().replace(/[?!]/g, ' ').replace(/,/g, ' ') + ' ';
    // "twenty five" → 25, then single number words.
    s = s.replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[\s-]+(one|two|three|four|five|six|seven|eight|nine)\b/g,
      function (_, tens, ones) { return String(NUMBER_WORDS[tens] + NUMBER_WORDS[ones]); });
    s = s.replace(/\b[a-z]+\b/g, function (w) { return w in NUMBER_WORDS ? String(NUMBER_WORDS[w]) : w; });
    var rules = [
      [/\b(is equal to|equals|equal to|equal|is)\b/g, '='],
      [/\bthe square root of\b|\bsquare root of\b|\bsquare root\b|\broot of\b/g, 'sqrt'],
      [/\b(to the power of|to the power|raised to the|raised to)\b/g, '^'],
      [/\bto the (\d+)(st|nd|rd|th)( power)?\b/g, '^$1'],
      [/\bsquared\b/g, '^2'],
      [/\bcubed\b/g, '^3'],
      [/\bplus\b/g, '+'],
      [/\b(minus|take away|subtract)\b/g, '-'],
      [/\bnegative\b/g, '-'],
      [/\b(times|multiplied by|multiply by)\b/g, '*'],
      [/\b(divided by|over)\b/g, '/'],
      [/\b(open|left) (bracket|parenthesis|paren)\b/g, '('],
      [/\b(close|closed|right) (bracket|parenthesis|paren)\b/g, ')'],
      [/\bsine( of)?\b/g, 'sin'],
      [/\bcosine( of)?\b/g, 'cos'],
      [/\btangent( of)?\b/g, 'tan'],
      [/\b(natural log|log natural)( of)?\b/g, 'ln'],
      [/\bpoint\b/g, '.'],
      [/\bwhy\b/g, 'y'],
      [/\b(ex|eggs)\b/g, 'x'],
      [/\bzed\b|\bzee\b/g, 'z'],
      [/\b(the|of|a)\b/g, ' ']
    ];
    rules.forEach(function (r) { s = s.replace(r[0], r[1]); });
    s = s.replace(/\s*\.\s*(?=\d)/g, '.').replace(/(\d)\s+(?=\d)/g, '$1');
    s = s.replace(/\s*\^\s*/g, '^').replace(/\s+/g, ' ').trim();
    // "x ^2" tidy; "2 x" → "2x"
    s = s.replace(/(\d)\s+(?=[xyz(])/g, '$1');
    return s;
  }

  var SOLID_WORDS = { cube: 'cube', box: 'cube', cylinder: 'cylinder', can: 'cylinder', cone: 'cone', sphere: 'sphere', ball: 'sphere', globe: 'sphere' };
  var SHAPE_WORDS = { triangle: 'triangle', circle: 'circle', rectangle: 'area_rect', square: 'area_rect', parallelogram: 'area_para' };

  function firstNumber(s) {
    var m = /-?\d+(\.\d+)?/.exec(s);
    return m ? parseFloat(m[0]) : null;
  }

  /** A typed or spoken instruction → { action, … }. Unknown text falls through to maths. */
  function parseCommand(input) {
    var raw = String(input || '').trim();
    var s = raw.toLowerCase().replace(/[.?!]+$/, '').replace(/^(please|hey board|ok board|board)[, ]+/, '').trim();
    if (!s) return { action: 'none' };
    var m;
    var numbered = s.replace(/\b[a-z]+\b/g, function (w) { return w in NUMBER_WORDS ? String(NUMBER_WORDS[w]) : w; });

    if (/^(help|what can you do|commands)\b/.test(s)) return { action: 'help' };
    if (/^(clear|erase|wipe)( the)?( board| everything| all)?$/.test(s)) return { action: 'clear' };
    if (/^undo( that)?$/.test(s)) return { action: 'undo' };
    if (/^(stop|end|finish)( the)? record(ing)?$/.test(s)) return { action: 'record', on: false };
    if (/^(start |begin )?record(ing)?( the)?( lesson| class| board)?$/.test(s) || /^start( the)? recording$/.test(s)) return { action: 'record', on: true };
    if (/\b(summary|summarize|summarise|recap|class notes)\b/.test(s)) return { action: 'summary' };
    if (/^(read|say|explain)( it| that| this)?( aloud| out loud)?$/.test(s) || /^read aloud$/.test(s)) return { action: 'speak' };
    if (/^(stop talking|quiet|be quiet|stop reading)$/.test(s)) return { action: 'hush' };

    if ((m = /^(?:quiz|test)(?: me| us| the class)?(?: (?:on|about) (.+))?$/.exec(s)) || (m = /^(?:give|ask)(?: me| us)? a (?:quiz )?question(?: (?:on|about) (.+))?$/.exec(s))) {
      return { action: 'quiz', topic: (m[1] || '').trim() };
    }
    if ((m = /^(?:what is|what's|what are|define|meaning of|what does)\s+(?:an?\s+|the\s+)?(.+?)(?:\s+mean)?$/.exec(s))) {
      // "what is 3 plus 4" is arithmetic, not a definition.
      var asMath = spokenToMath(m[1]);
      if (/^[\d\s+\-*/^().x]+$/.test(asMath.replace(/sqrt|sin|cos|tan|ln|log|pi/g, '')) && /\d/.test(asMath)) return { action: 'math', text: asMath };
      return { action: 'define', term: m[1].trim() };
    }
    if ((m = /^(?:find|open|show|pull up|bring up|search|go to|look up)(?: me)?(?: an?| the| for)?(?: (?:lessons?|pages?|textbook|resources?|videos?|readings?))?(?: (?:on|about|for|called|named))? (.+)$/.exec(s)) &&
        /\b(lessons?|pages?|textbook|resources?|videos?|readings?|search|look up|find)\b/.test(s)) {
      return { action: 'lesson', query: m[1].replace(/^(the|a|an) /, '').trim(), open: /^(open|go to)\b/.test(s) };
    }

    var solid = null;
    Object.keys(SOLID_WORDS).forEach(function (w) { if (new RegExp('\\b' + w + '\\b').test(s)) solid = SOLID_WORDS[w]; });

    if (/\b(slice|cut|section|cross[- ]section)\b/.test(s)) {
      var out = { action: 'slice', solid: solid };
      if ((m = /(-?\d+(?:\.\d+)?)\s*(?:degrees?|°)/.exec(numbered))) out.tilt = parseFloat(m[1]);
      else if (/\b(vertical(ly)?|straight down|top to bottom)\b/.test(s)) out.tilt = 90;
      else if (/\b(horizontal(ly)?|level|flat)\b/.test(s)) out.tilt = 0;
      else if (/\bdiagonal(ly)?\b/.test(s)) out.tilt = 45;
      if (/\bhexagon\b/.test(s)) { out.solid = out.solid || 'cube'; out.tilt = 54.7356; out.spin = 45; out.offset = 0; }
      if (/\b(middle|centre|center|half)\b/.test(s)) out.offset = 0;
      return out;
    }
    if (/\b(unfold|open (it )?up|net)\b/.test(s)) return { action: 'unfold', solid: solid, amount: 1 };
    if (/\b(fold|close)( it)?( back)?( up)?\b/.test(s) && !/unfold/.test(s)) return { action: 'unfold', solid: solid, amount: 0 };
    if ((m = /\b(rotate|spin|turn)\b/.exec(s))) {
      var deg = firstNumber(numbered);
      return { action: 'rotate', solid: solid, degrees: deg == null ? 45 : deg, dir: /\b(left|back|counter|anti)/.test(s) ? -1 : 1 };
    }
    if (solid && /^(draw|show|make|give me|load|build)?\b/.test(s) && !/[=]/.test(s)) return { action: 'solid', solid: solid };

    var shape = null;
    Object.keys(SHAPE_WORDS).forEach(function (w) { if (new RegExp('\\b' + w + '\\b').test(s)) shape = SHAPE_WORDS[w]; });
    if (shape && /^(draw|show|make|give me|load)\b/.test(s)) return { action: 'shape', shape: shape };

    if ((m = /^balance\s+(.+)$/i.exec(raw.replace(/[.?!]+$/, '')))) return { action: 'math', text: m[1].trim(), chem: true };

    // Chemical formulas are case-sensitive: leave them exactly as typed.
    if (/[A-Z][a-z]?\d|[A-Z][a-z]?\s*\+|->|→/.test(raw) && /(=|->|→)/.test(raw) && !/\b[xy]\b/.test(raw)) {
      return { action: 'math', text: raw.replace(/^(balance|solve)\s+/i, '') };
    }
    var body = s.replace(/^(graph|plot|draw|sketch|show|solve|calculate|compute|work out|evaluate|find)\s+(the\s+)?(graph of\s+|curve\s+|line\s+|function\s+|equation\s+|surface\s+)?/, '');
    var verb = /^(graph|plot|sketch)\b/.test(s) ? 'graph' : (/^(solve)\b/.test(s) ? 'solve' : null);
    var math = spokenToMath(body);
    if (math && /[\dxyz]/.test(math) && !/[a-wA-W]{4,}/.test(math.replace(/sqrt|sin|cos|tan|exp|log|ln|pi/g, ''))) {
      return { action: 'math', text: math, verb: verb };
    }
    return { action: 'lesson', query: s, guessed: true };
  }

  var HELP = [
    'graph y = x^2 - 4   ·   plot z = x^2 + y^2   ·   x^2 + y^2 = 25',
    'solve 2x + 5 = 15   ·   3/4 + 5/8   ·   balance C3H8 + O2 = CO2 + H2O',
    'show a cone   ·   slice the cube into a hexagon   ·   slice at 60 degrees   ·   unfold',
    'find a lesson on fractions   ·   what is a vector   ·   quiz me on gravity',
    'record   ·   stop recording   ·   summary   ·   clear'
  ];

  /* ── Lookup: lessons, glossary, quiz ── */
  var STOP = { the: 1, a: 1, an: 1, of: 1, on: 1, about: 1, and: 1, to: 1, 'in': 1, 'for': 1, lesson: 1, lessons: 1, me: 1, is: 1, what: 1, how: 1 };

  function words(text) {
    return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w && !STOP[w]; })
      .map(function (w) { return w.length > 3 ? w.replace(/(ies)$/, 'y').replace(/s$/, '') : w; });
  }

  function searchLessons(lessons, query, limit) {
    var q = words(query);
    if (!q.length) return [];
    var phrase = String(query).toLowerCase().trim();
    var scored = [];
    (lessons || []).forEach(function (lesson) {
      if (lesson.status && lesson.status !== 'live') return;
      var title = words(lesson.title), keys = words((lesson.keywords || []).join(' ')), sum = words(lesson.summary);
      var score = 0, hit = 0;
      q.forEach(function (w) {
        var s = 0;
        if (title.indexOf(w) >= 0) s += 6;
        else if (title.some(function (t) { return t.indexOf(w) === 0; })) s += 3;
        if (keys.indexOf(w) >= 0) s += 4;
        if (sum.indexOf(w) >= 0) s += 1;
        if (s) hit++;
        score += s;
      });
      if (!hit) return;
      if (String(lesson.title).toLowerCase().indexOf(phrase) >= 0) score += 8;
      score += hit === q.length ? 4 : 0;
      scored.push({ lesson: lesson, score: score });
    });
    scored.sort(function (a, b) { return b.score - a.score || String(a.lesson.title).localeCompare(String(b.lesson.title)); });
    return scored.slice(0, limit || 5).map(function (s) { return s.lesson; });
  }

  /** terms: [{ term, definition, … }] or { term: definition | { definition } } → best match or null */
  function findTerm(terms, query) {
    var q = String(query || '').toLowerCase().trim().replace(/s$/, '');
    if (!q) return null;
    var list = [];
    if (Array.isArray(terms)) list = terms;
    else Object.keys(terms || {}).forEach(function (k) {
      var v = terms[k];
      list.push(typeof v === 'string' ? { term: k, definition: v } : Object.assign({ term: k }, v));
    });
    var best = null, bestScore = 0;
    list.forEach(function (entry) {
      var name = String(entry.term || entry.name || entry.title || '').toLowerCase();
      var def = entry.definition || entry.def || entry.short || entry.text || entry.description || '';
      if (!name || !def) return;
      var score = 0;
      var bare = name.replace(/s$/, '');
      if (bare === q) score = 10;
      else if ((entry.aliases || []).some(function (a) { return String(a).toLowerCase().replace(/s$/, '') === q; })) score = 9;
      else if (name.indexOf(q) === 0) score = 5;
      else if (new RegExp('\\b' + q.replace(/[^a-z0-9 ]/g, '') + '\\b').test(name)) score = 3;
      if (score > bestScore) { bestScore = score; best = { term: entry.term || entry.name || entry.title, definition: String(def) }; }
    });
    return best;
  }

  function pickQuiz(questions, topic, seed) {
    var pool = (questions || []).filter(function (q) { return q && q.clue && q.answer && Array.isArray(q.choices); });
    var t = words(topic);
    if (t.length) {
      var ranked = pool.map(function (q) {
        var hay = words([q.clue, q.answer, q.category, q.lessonTitle, q.explanation].join(' '));
        var score = 0;
        t.forEach(function (w) { if (hay.indexOf(w) >= 0) score++; });
        return { q: q, score: score };
      }).filter(function (r) { return r.score > 0; });
      if (ranked.length) {
        var top = Math.max.apply(null, ranked.map(function (r) { return r.score; }));
        pool = ranked.filter(function (r) { return r.score === top; }).map(function (r) { return r.q; });
      } else return null;
    }
    if (!pool.length) return null;
    var idx = Math.abs(Math.floor(seed || 0)) % pool.length;
    return pool[idx];
  }

  /* ── Class summary ── */
  function clock(ms) {
    var total = Math.max(0, Math.round(ms / 1000));
    var m = Math.floor(total / 60), s = total % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  var KIND_HEADINGS = [
    ['graph', 'Graphs we drew'],
    ['solve', 'Equations we solved'],
    ['chem', 'Chemical equations we balanced'],
    ['shape', 'Shapes and measurements'],
    ['solid', '3D solids and cross-sections'],
    ['lookup', 'Words, questions and lessons we looked up']
  ];

  /**
   * events: [{ t (ms since the session started), kind, text, detail?, image? }]
   * → { title, date, duration, timeline: [{ at, text }], sections: [{ heading, items }], text }
   */
  function summarize(events, meta) {
    meta = meta || {};
    var list = (events || []).filter(function (e) { return e && e.text; });
    var title = meta.title || 'Blackboard session';
    var duration = list.length ? list[list.length - 1].t - list[0].t : 0;
    var sections = [];
    KIND_HEADINGS.forEach(function (pair) {
      var seen = {};
      var items = [];
      list.forEach(function (e) {
        if (e.kind !== pair[0]) return;
        var line = e.text + (e.detail ? ' — ' + e.detail : '');
        if (seen[e.text]) { items[seen[e.text] - 1] = line; return; } // keep the latest detail for a repeated item
        items.push(line);
        seen[e.text] = items.length;
      });
      if (items.length) sections.push({ heading: pair[1], items: items });
    });
    var said = list.filter(function (e) { return e.kind === 'said'; }).map(function (e) { return e.text; });
    if (said.length) sections.push({ heading: 'Things said to the board', items: said });
    var timeline = list.filter(function (e) { return e.kind !== 'said'; }).map(function (e) { return { at: clock(e.t - list[0].t), text: e.text, image: e.image || null }; });
    var lines = [title, meta.date ? meta.date : '', list.length ? 'Length: ' + clock(duration) + ' · ' + timeline.length + ' steps' : 'Nothing was put on the board yet.', ''];
    sections.forEach(function (sec) {
      lines.push(sec.heading);
      sec.items.forEach(function (it) { lines.push('  • ' + it); });
      lines.push('');
    });
    if (timeline.length) {
      lines.push('Step by step');
      timeline.forEach(function (st) { lines.push('  ' + st.at + '  ' + st.text); });
    }
    return {
      title: title, date: meta.date || '', duration: clock(duration), timeline: timeline, sections: sections,
      text: lines.filter(function (l, i) { return l !== '' || lines[i - 1] !== ''; }).join('\n').trim()
    };
  }

  return {
    spokenToMath: spokenToMath,
    parseCommand: parseCommand,
    HELP: HELP,
    searchLessons: searchLessons,
    findTerm: findTerm,
    pickQuiz: pickQuiz,
    summarize: summarize,
    clock: clock
  };
}));
