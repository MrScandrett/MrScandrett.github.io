/* groove-sheet-core.js — the pure parts of the homework sheet builder (no DOM).
 *
 *  • Counting: the one place that decides "1 e & a" vs "1 &" vs "1". drums.js draws the count line
 *    from countLabels(); fake-book.js takes its syllables and grid positions from here too, so the
 *    drum lesson, the groove builder, the printed sheet and the fake book can't disagree.
 *  • Groove codec: a 16-step, 9-lane, 4-state grid packs into 36 bytes (+1 tempo byte) = 50 URL
 *    characters. That is what the sheet's QR code carries.
 *  • Sheet store: sheets (one per student) of patterns, in localStorage, with JSON export/import.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GrooveSheetCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------ grid vocabulary */
  var STEPS = 16;
  // Order is part of the URL format (g1). Never reorder or insert; a new lane means a new "g2".
  var LANES = ['crash', 'ride', 'hat', 'ohat', 'snare', 'tomHi', 'tomMid', 'tomLo', 'kick'];
  var STATES = '-xXg';                           // off, normal, accent, ghost
  var SYLLABLES = ['', 'e', '&', 'a'];           // after the beat number: 1 e & a
  var COUNT_MODES = ['auto', 'quarter', 'eighth', 'sixteenth'];

  /* ------------------------------------------------------------------- counting */
  function used(tracks, k) {
    for (var i = 0; i < LANES.length; i++) {
      var s = tracks[LANES[i]];
      if (s && s.charAt(k) && s.charAt(k) !== '-') return true;
    }
    return false;
  }

  /** The coarsest count grid that still lands a number or syllable on every note. */
  function resolutionFor(tracks, steps) {
    var n = steps || STEPS, eighth = false;
    for (var k = 0; k < n; k++) {
      if (!used(tracks || {}, k)) continue;
      if (k % 2 === 1) return 'sixteenth';
      if (k % 4 === 2) eighth = true;
    }
    return eighth ? 'eighth' : 'quarter';
  }

  function resolveMode(mode, tracks, steps) {
    return COUNT_MODES.indexOf(mode) > 0 ? mode : resolutionFor(tracks, steps);
  }

  /**
   * One entry per step: the label to print under it, or null where this count grid skips it.
   * Returns { mode (resolved), labels, isBeat } — the staff, the print card and the builder grid
   * all read this one array.
   */
  function countLabels(mode, tracks, opts) {
    opts = opts || {};
    var steps = opts.steps || STEPS, beats = opts.beats || 4;
    var resolved = resolveMode(mode, tracks, steps), labels = [], isBeat = [];
    for (var k = 0; k < steps; k++) {
      var rem = k % 4, show = resolved === 'sixteenth' || (resolved === 'eighth' && rem % 2 === 0) || rem === 0;
      isBeat.push(rem === 0);
      labels.push(!show ? null : rem === 0 ? String((Math.floor(k / 4) % beats) + 1) : SYLLABLES[rem]);
    }
    return { mode: resolved, labels: labels, isBeat: isBeat };
  }

  /** Beat positions (in quarter notes) a count grid covers, or null for "every sixteenth". Used by fake-book.js. */
  function gridPositions(mode, beats) {
    var i, out = [];
    if (mode === 'quarter') { for (i = 0; i < beats; i++) out.push(i); return out; }
    if (mode === 'eighth') { for (i = 0; i < beats * 2; i++) out.push(i / 2); return out; }
    return null;
  }

  var MODE_NAMES = { auto: 'Auto', quarter: 'Quarter', eighth: 'Eighth', sixteenth: 'Sixteenth' };
  var MODE_SAMPLE = { quarter: '1 2 3 4', eighth: '1 & 2 & 3 & 4 &', sixteenth: '1 e & a 2 e & a …' };

  /* -------------------------------------------------------------------- tracks */
  function cleanTracks(tracks) {
    var out = {};
    LANES.forEach(function (lane) {
      var s = String((tracks && tracks[lane]) || ''), t = '';
      for (var k = 0; k < STEPS; k++) { var ch = s.charAt(k); t += STATES.indexOf(ch) > 0 ? ch : '-'; }
      if (/[^-]/.test(t)) out[lane] = t;
    });
    return out;
  }

  function sameTracks(a, b) {
    var x = cleanTracks(a), y = cleanTracks(b);
    return LANES.every(function (l) { return (x[l] || '') === (y[l] || ''); });
  }

  /* ---------------------------------------------------------------- URL codec */
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  function b64encode(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i += 3) {
      var n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0), left = bytes.length - i;
      out += B64.charAt(n >> 18 & 63) + B64.charAt(n >> 12 & 63) + (left > 1 ? B64.charAt(n >> 6 & 63) : '') + (left > 2 ? B64.charAt(n & 63) : '');
    }
    return out;
  }
  function b64decode(str) {
    var bytes = [], acc = 0, bits = 0;
    for (var i = 0; i < str.length; i++) {
      var v = B64.indexOf(str.charAt(i));
      if (v < 0) return null;
      acc = (acc << 6) | v; bits += 6;
      if (bits >= 8) { bits -= 8; bytes.push((acc >> bits) & 255); acc &= (1 << bits) - 1; }
    }
    return bytes;
  }

  function clampTempo(t) { t = Math.round(+t); return isFinite(t) ? Math.max(40, Math.min(240, t)) : 100; }

  /** tracks + tempo -> 50 URL-safe characters. */
  function encodeGroove(tracks, tempo) {
    var t = cleanTracks(tracks), bytes = [], cur = 0, n = 0;
    LANES.forEach(function (lane) {
      for (var k = 0; k < STEPS; k++) {
        var st = Math.max(0, STATES.indexOf((t[lane] || '').charAt(k)));
        cur = (cur << 2) | st;
        if (++n === 4) { bytes.push(cur); cur = 0; n = 0; }
      }
    });
    bytes.push(clampTempo(tempo));
    return b64encode(bytes);
  }

  function decodeGroove(code) {
    var bytes = b64decode(String(code || ''));
    var need = LANES.length * STEPS / 4 + 1;
    if (!bytes || bytes.length !== need) return null;
    var tracks = {}, i = 0;
    LANES.forEach(function (lane) {
      var s = '';
      for (var k = 0; k < STEPS; k++, i++) s += STATES.charAt((bytes[i >> 2] >> (6 - 2 * (i & 3))) & 3);
      if (/[^-]/.test(s)) tracks[lane] = s;
    });
    return { tracks: tracks, tempo: clampTempo(bytes[need - 1]) };
  }

  var HASH_KEY = 'g1';
  function hashFor(pattern) { return '#' + HASH_KEY + '=' + encodeGroove(pattern.tracks, pattern.tempo); }
  function parseHash(hash) {
    var m = /[#&]g1=([A-Za-z0-9_-]+)/.exec(String(hash || ''));
    return m ? decodeGroove(m[1]) : null;
  }

  /* --------------------------------------------------------------------- ladder */
  var DEFAULT_LADDER = [60, 80, 100];
  function parseLadder(text) {
    var nums = String(text == null ? '' : text).split(/[^0-9]+/).map(Number).filter(function (n) { return n >= 30 && n <= 260; });
    return nums.length ? nums.slice(0, 5) : DEFAULT_LADDER.slice();
  }

  /* ---------------------------------------------------------------------- store */
  var STORE_KEY = 'classroomos:groove-sheets:v1';
  var uid = function () { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); };
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function str(v, max) { return String(v == null ? '' : v).slice(0, max); }

  function makePattern(src) {
    src = src || {};
    return {
      id: str(src.id, 24) || uid(),
      title: str(src.title, 60) || 'Groove',
      note: str(src.note, 130),
      tempo: clampTempo(src.tempo == null ? 100 : src.tempo),
      tracks: cleanTracks(src.tracks),
      count: COUNT_MODES.indexOf(src.count) >= 0 ? src.count : 'auto',
      ladder: Array.isArray(src.ladder) ? parseLadder(src.ladder.join(' ')) : DEFAULT_LADDER.slice()
    };
  }
  function makeSheet(src) {
    src = src || {};
    return {
      id: str(src.id, 24) || uid(),
      student: str(src.student, 60),
      assigned: /^\d{4}-\d{2}-\d{2}$/.test(src.assigned) ? src.assigned : today(),
      due: /^\d{4}-\d{2}-\d{2}$/.test(src.due) ? src.due : '',
      perPage: +src.perPage === 2 ? 2 : 3,
      patterns: (Array.isArray(src.patterns) ? src.patterns : []).slice(0, 60).map(makePattern)
    };
  }

  function createStore(storage) {
    var state, persistent = true;
    function read() {
      try { var raw = storage && storage.getItem(STORE_KEY); if (raw) return JSON.parse(raw); } catch (e) { persistent = false; }
      return null;
    }
    function normalize(s) {
      var sheets = (s && Array.isArray(s.sheets) ? s.sheets : []).slice(0, 80).map(makeSheet);
      if (!sheets.length) sheets = [makeSheet({})];
      var cur = sheets.some(function (x) { return x.id === (s && s.current); }) ? s.current : sheets[0].id;
      return { v: 1, sheets: sheets, current: cur, siteUrl: str(s && s.siteUrl, 200) };
    }
    state = normalize(read());

    var api = {
      get state() { return state; },
      get persistent() { return persistent; },
      save: function () {
        try { storage.setItem(STORE_KEY, JSON.stringify(state)); persistent = true; } catch (e) { persistent = false; }
        return persistent;
      },
      reload: function () { state = normalize(read()); },
      sheet: function (id) { return state.sheets.filter(function (s) { return s.id === (id || state.current); })[0]; },
      select: function (id) { if (api.sheet(id)) { state.current = id; api.save(); } },
      newSheet: function (student) { var s = makeSheet({ student: student }); state.sheets.push(s); state.current = s.id; api.save(); return s; },
      duplicateSheet: function (id) {
        var src = api.sheet(id), s = makeSheet(JSON.parse(JSON.stringify(src)));
        s.id = uid(); s.student = ''; s.patterns.forEach(function (p) { p.id = uid(); });
        state.sheets.push(s); state.current = s.id; api.save(); return s;
      },
      deleteSheet: function (id) {
        state.sheets = state.sheets.filter(function (s) { return s.id !== id; });
        if (!state.sheets.length) state.sheets.push(makeSheet({}));
        if (!api.sheet(state.current)) state.current = state.sheets[0].id;
        api.save();
      },
      updateSheet: function (patch) {
        var s = api.sheet(), merged = makeSheet(Object.assign({}, s, patch, { patterns: s.patterns }));
        Object.assign(s, { student: merged.student, assigned: merged.assigned, due: merged.due, perPage: merged.perPage });
        api.save();
      },
      addPattern: function (src, sheetId) {
        var s = api.sheet(sheetId), p = makePattern(src);
        if (!src || !src.title) p.title = 'Groove ' + (s.patterns.length + 1);
        s.patterns.push(p); api.save(); return p;
      },
      updatePattern: function (id, patch) {
        var s = api.sheet(), i = s.patterns.map(function (p) { return p.id; }).indexOf(id);
        if (i < 0) return null;
        s.patterns[i] = makePattern(Object.assign({}, s.patterns[i], patch));
        api.save(); return s.patterns[i];
      },
      movePattern: function (id, delta) {
        var ps = api.sheet().patterns, i = ps.map(function (p) { return p.id; }).indexOf(id), j = i + delta;
        if (i < 0 || j < 0 || j >= ps.length) return false;
        var t = ps[i]; ps[i] = ps[j]; ps[j] = t; api.save(); return true;
      },
      duplicatePattern: function (id) {
        var ps = api.sheet().patterns, i = ps.map(function (p) { return p.id; }).indexOf(id);
        if (i < 0) return null;
        var c = makePattern(JSON.parse(JSON.stringify(ps[i]))); c.id = uid(); c.title = str(c.title + ' (copy)', 60);
        ps.splice(i + 1, 0, c); api.save(); return c;
      },
      deletePattern: function (id) {
        var s = api.sheet(); s.patterns = s.patterns.filter(function (p) { return p.id !== id; }); api.save();
      },
      setSiteUrl: function (u) { state.siteUrl = str(u, 200); api.save(); },
      exportJSON: function (all) {
        return JSON.stringify({ kind: 'classroomos-groove-sheets', v: 1, sheets: all === false ? [api.sheet()] : state.sheets }, null, 2);
      },
      /** Merges imported sheets in as new sheets (fresh ids). Returns how many came in, or throws a readable error. */
      importJSON: function (text) {
        var data;
        try { data = JSON.parse(text); } catch (e) { throw new Error('That file is not valid JSON.'); }
        if (!data || data.kind !== 'classroomos-groove-sheets' || !Array.isArray(data.sheets)) throw new Error('That file is not a groove-sheet export.');
        var fresh = data.sheets.slice(0, 80).map(function (s) {
          var c = makeSheet(s); c.id = uid(); c.patterns.forEach(function (p) { p.id = uid(); }); return c;
        });
        if (!fresh.length) throw new Error('That export has no sheets in it.');
        // An untouched blank starter sheet is replaced rather than left as clutter.
        if (state.sheets.length === 1 && !state.sheets[0].patterns.length && !state.sheets[0].student) state.sheets = [];
        state.sheets = state.sheets.concat(fresh); state.current = fresh[0].id; api.save();
        return fresh.length;
      }
    };
    return api;
  }

  return {
    STEPS: STEPS, LANES: LANES, STATES: STATES, SYLLABLES: SYLLABLES, COUNT_MODES: COUNT_MODES, MODE_NAMES: MODE_NAMES, MODE_SAMPLE: MODE_SAMPLE,
    resolutionFor: resolutionFor, resolveMode: resolveMode, countLabels: countLabels, gridPositions: gridPositions,
    cleanTracks: cleanTracks, sameTracks: sameTracks,
    encodeGroove: encodeGroove, decodeGroove: decodeGroove, hashFor: hashFor, parseHash: parseHash,
    DEFAULT_LADDER: DEFAULT_LADDER, parseLadder: parseLadder,
    makePattern: makePattern, makeSheet: makeSheet, createStore: createStore, STORE_KEY: STORE_KEY
  };
}));
