/* ClassroomOS search ranking: the one way the site decides which lessons match a search.
 *
 * Used by the ⌘K command palette (command-palette.js) and the lesson library search box
 * (steam-lessons.html). Pure: no DOM, so tests/search-rank.test.mjs runs it in Node.
 *
 * Rules, in order of how much they count:
 *   - Every word the reader types must match (AND). "chess ai" needs both.
 *   - A word matches a field when it is a whole word there, or the start of a word
 *     ("electr" → "electricity"). Letters scattered across a title never count: the old
 *     palette matched "chess" in "Ty-ch-o Brah-e — the La-s-t ... A-s-tronomer".
 *   - Plurals and simple endings are forgiven both ways ("lessons" ↔ "lesson",
 *     "galaxies" ↔ "galaxy").
 *   - Title beats keywords beats topic/module beats description. A whole-query phrase in
 *     the title, or a title that starts with the query, wins outright.
 *   - Only when nothing matches at all does it allow a one-letter typo (two for long
 *     words) against title and keyword words, so "chss" or "pythagorus" still land.
 *
 *   ClassroomOSSearchRank.rank(items, query, { fields })  → [{ item, score }] best first
 *   fields: { title, keywords, topic, description } → functions (item) → string | string[]
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ClassroomOSSearchRank = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var WEIGHTS = { title: 12, keywords: 7, topic: 4, description: 2 };
  // Words too common to rank on. They still have to match when typed with others.
  var STOP = { the: 1, a: 1, an: 1, and: 1, of: 1, to: 1, in: 1, for: 1, with: 1, on: 1, at: 1, by: 1 };

  function fold(text) {
    return String(text == null ? '' : text)
      .toLowerCase()
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[’']/g, '')
      .replace(/&amp;/g, '&');
  }

  function words(text) {
    return fold(text).split(/[^a-z0-9]+/).filter(Boolean);
  }

  // A light stemmer: enough that plural/singular and -ing/-ed forms meet.
  function stem(word) {
    if (word.length > 4 && /ies$/.test(word)) return word.slice(0, -3) + 'y';
    if (word.length > 4 && /(ches|shes|sses|xes|zes)$/.test(word)) return word.slice(0, -2);
    if (word.length > 3 && /s$/.test(word) && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
    if (word.length > 5 && /ing$/.test(word)) return word.slice(0, -3);
    if (word.length > 4 && /ed$/.test(word)) return word.slice(0, -2);
    return word;
  }

  // Damerau–Levenshtein distance ≤ max (a swapped pair of letters is one edit).
  function typoClose(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return false;
    var d = [];
    for (var i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (var j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      var rowMin = Infinity;
      for (j = 1; j <= b.length; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        var v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
          v = Math.min(v, d[i - 2][j - 2] + 1);
        }
        d[i][j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return false;
    }
    return d[a.length][b.length] <= max;
  }

  // Prepared form of one field: its words and their stems.
  function prepField(value) {
    var list = Array.isArray(value) ? value : [value];
    var text = fold(list.join(' \u0001 '));
    var ws = words(text);
    return { text: ' ' + ws.join(' ') + ' ', words: ws, stems: ws.map(stem) };
  }

  // 3 = whole word, 2 = same stem, 1.4 = start of a word, 0 = no match.
  function tokenMatch(field, token, tokenStem) {
    var best = 0;
    for (var i = 0; i < field.words.length; i++) {
      var w = field.words[i];
      if (w === token) return 3;
      if (field.stems[i] === tokenStem) { best = Math.max(best, 2); continue; }
      if (token.length >= 2 && w.indexOf(token) === 0) best = Math.max(best, 1.4);
      else if (tokenStem.length >= 3 && w.indexOf(tokenStem) === 0) best = Math.max(best, 1.2);
    }
    return best;
  }

  function typoMatch(field, token) {
    if (token.length < 4) return 0;
    var max = token.length >= 8 ? 2 : 1;
    for (var i = 0; i < field.words.length; i++) {
      var w = field.words[i];
      if (w.length >= 4 && typoClose(token, w, max)) return 1;
    }
    return 0;
  }

  function prepare(item, fields) {
    var prepared = {};
    Object.keys(WEIGHTS).forEach(function (name) {
      prepared[name] = fields[name] ? prepField(fields[name](item) || '') : prepField('');
    });
    return prepared;
  }

  function scoreTokens(prepared, tokens, allowTypos) {
    var total = 0;
    for (var t = 0; t < tokens.length; t++) {
      var token = tokens[t];
      var tokenStem = stem(token);
      var best = 0;
      Object.keys(WEIGHTS).forEach(function (name) {
        var m = tokenMatch(prepared[name], token, tokenStem);
        if (!m && allowTypos && (name === 'title' || name === 'keywords')) m = typoMatch(prepared[name], token) * 0.6;
        if (m) best += m * WEIGHTS[name];
      });
      if (!best) return 0;
      total += STOP[token] ? best * 0.1 : best;
    }
    return total;
  }

  function rank(items, query, options) {
    options = options || {};
    var fields = options.fields || {
      title: function (x) { return x.title; },
      keywords: function (x) { return x.keywords; },
      topic: function (x) { return x.category || x.topic; },
      description: function (x) { return x.description || x.summary; }
    };
    var q = fold(query).trim();
    var tokens = words(q);
    if (!tokens.length) return [];
    // A lone stop word ("the") would match everything; ignore it unless it is all there is.
    var meaningful = tokens.filter(function (t) { return !STOP[t]; });
    if (meaningful.length) tokens = meaningful;
    var phrase = tokens.join(' ');

    var prepared = items.map(function (item) { return prepare(item, fields); });

    function run(allowTypos) {
      var out = [];
      for (var i = 0; i < items.length; i++) {
        var p = prepared[i];
        var s = scoreTokens(p, tokens, allowTypos);
        if (!s) continue;
        var titleText = p.title.text;
        if (titleText === ' ' + phrase + ' ') s += 60;
        else if (titleText.indexOf(' ' + phrase + ' ') === 0 || titleText.indexOf(' ' + phrase) === 0) s += 30;
        else if (tokens.length > 1 && titleText.indexOf(' ' + phrase) !== -1) s += 15;
        if (allowTypos) s *= 0.5;
        out.push({ item: items[i], score: s, index: i });
      }
      return out;
    }

    var results = run(false);
    if (!results.length) results = run(true);
    results.sort(function (a, b) { return b.score - a.score || a.index - b.index; });
    return results.map(function (r) { return { item: r.item, score: r.score }; });
  }

  return { rank: rank, words: words, stem: stem, fold: fold, typoClose: typoClose };
});
