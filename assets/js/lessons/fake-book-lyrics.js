/* Fake Book lyrics engine: puts each syllable under the note it is sung on.
 *
 * A tune's lyrics live in data/fake-book.json as
 *   "lyrics": { "year": 1806, "credit": "…", "verses": [{ "mark": "1", "text": "Twin- kle, twin- kle, | lit- tle star, | …" }] }
 * and are written bar by bar, like the melody:
 *   |        bar line; there must be one lyric bar per melody bar (the pickup counts as bar 0)
 *   Twin-    a syllable; a trailing hyphen joins it to the next one
 *   _        this note carries on the syllable before it (a melisma: one word over several notes)
 *   *        a note with no words (an instrumental fill)
 *   the~own  two words sung on one note
 * Each bar names exactly one token per sung note (rests and the tied-over half of a tie don't count),
 * or nothing at all (a bar this verse leaves to another verse, as a refrain often does). Anything else is an error,
 * so a lyric can't drift off the beat without the test failing.
 * Works in the browser (window.FakeBookLyrics) and in Node (require).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FakeBookLyrics = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // The same tokens and tie rule as parseTune() in fake-book.js, so `src` numbers match its events.
  var NOTE_RE = /^([A-G])(##|bb|#|b)?(\d)([whqes])(3)?(\.)?(~)?$/;
  var REST_RE = /^r\d?([whqes])(3)?(\.)?$/;
  var NAT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var ACC = { '': 0, '#': 1, '##': 2, 'b': -1, 'bb': -2 };

  // Every event of the melody, numbered as fake-book.js numbers them: { src, sung, group }.
  function melodyEvents(melody) {
    var events = [], tieOpen = null;
    String(melody || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (g, gi) {
      g.split(/\s+/).forEach(function (tok) {
        var m = NOTE_RE.exec(tok), midi = null, tie = false;
        if (m) { midi = 12 * (Number(m[3]) + 1) + NAT[m[1]] + ACC[m[2] || '']; tie = !!m[7]; }
        else if (!REST_RE.test(tok)) throw new Error('bad melody token "' + tok + '"');
        if (tieOpen && midi !== null && tieOpen.midi === midi) { /* tied on: same note */ }
        else { tieOpen = null; events.push({ src: events.length, sung: midi !== null, midi: midi, group: gi }); }
        if (tie && midi !== null) tieOpen = events[events.length - 1];
        else if (!tie) tieOpen = null;
      });
    });
    return events;
  }

  function parseToken(tok) {
    if (tok === '_') return { extend: true };
    if (tok === '*') return { skip: true };
    var hyphen = tok.length > 1 && tok.charAt(tok.length - 1) === '-';
    var text = (hyphen ? tok.slice(0, -1) : tok).replace(/~/g, '‿');
    return { text: text, hyphen: hyphen };
  }

  function verseBars(text) {
    return String(text || '').split('|').map(function (bar) {
      return bar.trim() ? bar.trim().split(/\s+/).map(parseToken) : [];
    });
  }

  // Lines up one verse with the melody. Returns { bySrc: { src: syllable }, errors: [] }, where a syllable is
  // { text, hyphen } on the note that starts it or { extend: true } on a note that carries it on.
  function alignVerse(events, text) {
    var groups = [], errors = [], bySrc = {};
    events.forEach(function (e) { if (e.sung) (groups[e.group] = groups[e.group] || []).push(e); });
    var nGroups = events.length ? events[events.length - 1].group + 1 : 0;
    var bars = verseBars(text);
    if (bars.length !== nGroups) errors.push('has ' + bars.length + ' bars of words for ' + nGroups + ' bars of melody');
    bars.forEach(function (toks, gi) {
      var notes = groups[gi] || [];
      if (!toks.length) return;
      if (toks.length !== notes.length) { errors.push('bar ' + gi + ' (counting the first written bar as 0): ' + toks.length + ' syllables for ' + notes.length + ' notes'); return; }
      toks.forEach(function (tk, k) {
        if (tk.skip) return;
        if (tk.extend && !Object.keys(bySrc).length) errors.push('bar ' + gi + ': "_" with no syllable before it');
        bySrc[notes[k].src] = tk;
      });
    });
    return { bySrc: bySrc, errors: errors };
  }

  // Everything the sheet needs for one tune, or null when it has no lyrics.
  function forTune(raw) {
    if (!raw || !raw.lyrics || !raw.lyrics.verses || !raw.lyrics.verses.length) return null;
    var events = melodyEvents(raw.melody), errors = [];
    var verses = raw.lyrics.verses.map(function (v, i) {
      var a = alignVerse(events, v.text);
      a.errors.forEach(function (e) { errors.push((raw.id || 'tune') + ' verse ' + (v.mark || i + 1) + ' ' + e); });
      return { mark: v.mark || String(i + 1), label: v.label || '', bySrc: a.bySrc };
    });
    return { verses: verses, credit: raw.lyrics.credit || '', errors: errors };
  }

  return { melodyEvents: melodyEvents, verseBars: verseBars, alignVerse: alignVerse, forTune: forTune };
});
