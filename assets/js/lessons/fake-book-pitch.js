/* fake-book-pitch.js — "Listen to me play": hear a student's instrument or voice and grade it against the tune.
 *
 * Three small pieces, all in the browser (audio from the microphone never leaves the page):
 *
 *   detect(samples, sampleRate)   → { hz, midi, clarity } | null   McLeod pitch method (normalised
 *                                   square-difference function); steady against strong overtones,
 *                                   so a saxophone's 2nd harmonic is not mistaken for the note.
 *   createScorer(opts)            → expect({t0,t1,midi,...}) / feed(frame) / poll(now) / finish(now)
 *                                   Pure bookkeeping on the AudioContext clock: no DOM, no audio.
 *   createListener(ctx, onFrame)  → start() / stop()   getUserMedia → AnalyserNode → detect() ~33×/s.
 *
 * Grading is octave-forgiving on purpose: a class mixes sopranos, baritones, flutes and basses, and
 * a B♭ trumpet and a tenor sax sound different octaves for the same written note. What is graded is
 * the pitch class (is it a G?) and how far off it is in cents.
 */
(function (root) {
  'use strict';

  var NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  function midiOf(hz) { return 69 + 12 * Math.log(hz / 440) / Math.LN2; }
  function hzOf(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
  function nameOf(midi) { var m = Math.round(midi); return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }

  /** Signed distance in cents from `target` to `heard`, folded to the nearest octave when `anyOctave`. */
  function centsFrom(target, heard, anyOctave) {
    var d = heard - target;
    if (anyOctave) d = d - 12 * Math.round(d / 12);
    return d * 100;
  }

  /* ------------------------------------------------------------------ detection */
  /**
   * @param {Float32Array|number[]} buf mono samples (≥ 2 periods of the lowest pitch wanted)
   * @param {number} sr sample rate
   * @param {{minHz?:number,maxHz?:number,gate?:number,cutoff?:number}} [o]
   */
  function detect(buf, sr, o) {
    o = o || {};
    var minHz = o.minHz || 70, maxHz = o.maxHz || 1400, gate = o.gate == null ? 0.012 : o.gate, cutoff = o.cutoff || 0.88;
    var n = buf.length, i, tau;
    var energy = 0;
    for (i = 0; i < n; i++) energy += buf[i] * buf[i];
    if (Math.sqrt(energy / n) < gate) return null;                       // silence / room noise
    var minLag = Math.max(2, Math.floor(sr / maxHz)), maxLag = Math.min((n >> 1) - 1, Math.ceil(sr / minHz));
    if (maxLag <= minLag + 2) return null;
    // Normalised square difference: 2·r(τ) / m(τ). 1 = a perfect repeat at lag τ.
    var nsdf = new Float32Array(maxLag + 2);
    for (tau = 0; tau <= maxLag + 1 && tau < n; tau++) {
      var acf = 0, m = 0, lim = n - tau;
      for (i = 0; i < lim; i++) { acf += buf[i] * buf[i + tau]; m += buf[i] * buf[i] + buf[i + tau] * buf[i + tau]; }
      nsdf[tau] = m > 0 ? 2 * acf / m : 0;
    }
    // Peaks: the highest point of each positive stretch that follows a dip below zero.
    var peaks = [], pos = false, best = -1;
    for (tau = 1; tau <= maxLag; tau++) {
      if (!pos) { if (nsdf[tau - 1] < 0 && nsdf[tau] >= 0) { pos = true; best = tau; } continue; }
      if (nsdf[tau] < 0) { peaks.push(best); pos = false; best = -1; continue; }
      if (nsdf[tau] > nsdf[best]) best = tau;
    }
    if (pos && best > 0 && best < maxLag && nsdf[best] >= nsdf[best - 1] && nsdf[best] >= nsdf[best + 1]) peaks.push(best);
    peaks = peaks.filter(function (p) { return p >= minLag && p > 1 && p < maxLag && nsdf[p] >= nsdf[p - 1] && nsdf[p] >= nsdf[p + 1]; });
    if (!peaks.length) return null;
    var top = 0;
    peaks.forEach(function (p) { if (nsdf[p] > top) top = nsdf[p]; });
    var pick = peaks.filter(function (p) { return nsdf[p] >= cutoff * top; })[0];   // first strong peak = fundamental
    // Parabolic interpolation for sub-sample lag (worth ~10¢ at high pitches).
    var a = nsdf[pick - 1], b = nsdf[pick], c = nsdf[pick + 1], den = a - 2 * b + c;
    var lag = den ? pick + 0.5 * (a - c) / den : pick;
    var clarity = Math.min(1, nsdf[pick]);
    var hz = sr / lag;
    return { hz: hz, midi: midiOf(hz), clarity: clarity };
  }

  /* ------------------------------------------------------------------ grading */
  var DEFAULTS = { tol: 50, near: 100, anyOctave: true, interval: 0.03, minClarity: 0.8, attack: 0.18, tail: 0.04 };
  function opt(o) { var r = {}; for (var k in DEFAULTS) r[k] = o && o[k] != null ? o[k] : DEFAULTS[k]; return r; }

  /**
   * Grade one expected note against voiced frames ({t, midi, clarity}).
   * The first `attack` seconds are not graded (a player needs a moment to land on a note) and the last
   * `tail` is skipped (the next note's attack bleeds in). Returns { grade: 'hit'|'near'|'miss'|'silent', cents, heard }.
   */
  function judgeNote(note, frames, o) {
    o = opt(o);
    var dur = note.t1 - note.t0;
    var start = note.t0 + Math.min(o.attack, dur * 0.4), end = note.t1 - Math.min(o.tail, dur * 0.15);
    var span = Math.max(end - start, o.interval);
    var expected = Math.max(1, Math.floor(span / o.interval));
    var inWin = frames.filter(function (f) { return f.t >= start && f.t <= end && f.clarity >= o.minClarity; });
    if (!inWin.length) return { grade: 'silent', cents: null, heard: null, share: 0 };
    var ok = 0, sum = 0, nearPc = 0, nearSum = 0;
    inWin.forEach(function (f) {
      var d = centsFrom(note.midi, f.midi, o.anyOctave), ad = Math.abs(d);
      if (ad <= o.tol) { ok++; sum += d; }
      if (ad <= o.near) { nearPc++; nearSum += d; }
    });
    var share = Math.min(1, ok / expected);
    var heardMidis = inWin.map(function (f) { return f.midi; }).sort(function (a, b) { return a - b; });
    var heard = heardMidis[heardMidis.length >> 1];
    if (ok >= 1 && share >= 0.5) return { grade: 'hit', cents: Math.round(sum / ok), heard: heard, share: share };
    if (nearPc >= 1 && nearPc / expected >= 0.3) return { grade: 'near', cents: Math.round(nearSum / nearPc), heard: heard, share: share };
    return { grade: 'miss', cents: null, heard: heard, share: share };
  }

  function createScorer(o) {
    var cfg = opt(o), latency = (o && o.latency) || 0;
    var expected = [], frames = [], results = [];
    function judgeDue(now, force) {
      var out = [];
      expected.forEach(function (n) {
        if (n.done) return;
        if (n.t1 + latency + 0.06 > now) { if (force) n.done = true; return; }   // not finished yet: ungraded on finish()
        n.done = true;
        var r = judgeNote({ t0: n.t0 + latency, t1: n.t1 + latency, midi: n.midi }, frames, cfg);
        r.note = n; out.push(r); results.push(r);
      });
      var keep = now - 10;
      while (frames.length && frames[0].t < keep) frames.shift();
      return out;
    }
    return {
      /** A note the student is about to play. t0/t1 are AudioContext seconds. */
      expect: function (n) { expected.push({ t0: n.t0, t1: n.t1, midi: n.midi, bar: n.bar, idx: n.idx, done: false }); },
      feed: function (f) { if (f && f.midi != null) frames.push(f); },
      /** Grades every note that has finished by `now`. */
      poll: function (now) { return judgeDue(now, false); },
      finish: function (now) { judgeDue(now, true); return summarize(results); },
      results: function () { return results.slice(); }
    };
  }

  function summarize(results) {
    var hits = 0, near = 0, miss = 0, silent = 0, cs = [];
    results.forEach(function (r) {
      if (r.grade === 'hit') hits++; else if (r.grade === 'near') near++; else if (r.grade === 'silent') silent++; else miss++;
      if (r.cents != null) cs.push(r.cents);
    });
    var total = results.length, avg = cs.length ? cs.reduce(function (a, b) { return a + b; }, 0) / cs.length : 0;
    var tendency = Math.abs(avg) < 10 ? 'in tune' : avg < 0 ? 'a little flat' : 'a little sharp';
    return {
      total: total, hits: hits, near: near, miss: miss, silent: silent,
      pct: total ? Math.round(100 * (hits + 0.5 * near) / total) : 0,
      avgCents: Math.round(avg), tendency: cs.length >= 4 ? tendency : null
    };
  }

  /* ------------------------------------------------------------------ microphone */
  /**
   * Opens the mic into `ctx`'s graph (analysis only: it is never connected to the speakers) and calls
   * `onFrame({ t, hz, midi, clarity, rms })` ~33×/s. `t` is AudioContext seconds, already shifted back by
   * the input latency; unvoiced moments call with midi = null so a UI can show "listening…".
   */
  function createListener(ctx, onFrame) {
    var stream = null, src = null, an = null, timer = 0, buf = null;
    function tickFn() {
      if (!an) return;
      an.getFloatTimeDomainData(buf);
      var hit = detect(buf, ctx.sampleRate);
      var t = ctx.currentTime - (ctx.baseLatency || 0);
      onFrame(hit ? { t: t, hz: hit.hz, midi: hit.midi, clarity: hit.clarity } : { t: t, hz: null, midi: null, clarity: 0 });
    }
    return {
      start: function () {
        if (stream) return Promise.resolve();
        var md = root.navigator && root.navigator.mediaDevices;
        if (!md || !md.getUserMedia) return Promise.reject(new Error('This browser cannot open a microphone here.'));
        // Echo cancellation lets the band play on speakers without being "heard" as the student; noise
        // suppression and auto-gain are off because they smear pitch.
        return md.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false, channelCount: 1 } }).then(function (s) {
          stream = s;
          src = ctx.createMediaStreamSource(s);
          an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0;
          buf = new Float32Array(an.fftSize);
          src.connect(an);
          timer = setInterval(tickFn, 30);
        });
      },
      stop: function () {
        clearInterval(timer); timer = 0;
        if (stream) stream.getTracks().forEach(function (tr) { tr.stop(); });
        try { if (src) src.disconnect(); } catch (e) { /* already gone */ }
        stream = src = an = buf = null;
      },
      active: function () { return !!stream; }
    };
  }

  var api = { detect: detect, judgeNote: judgeNote, createScorer: createScorer, summarize: summarize, createListener: createListener, midiOf: midiOf, hzOf: hzOf, nameOf: nameOf, centsFrom: centsFrom };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.FakeBookPitch = api;
})(typeof window !== 'undefined' ? window : globalThis);
