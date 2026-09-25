/* drums.js — Drum Lab lesson: kit explorer, drum notation renderer,
 * play-along groove player with a moving bar, and a notation-linked groove builder.
 * Sounds come from assets/js/drum-engine.js (shared with Music Lab).
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ audio */
  var ctx = null, kit = null, volume = 0.7;

  function ensureAudio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !window.DrumEngine) return false;
    ctx = new AC();
    var master = ctx.createGain(); master.gain.value = 0.7;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 24; comp.ratio.value = 6;
    comp.attack.value = 0.002; comp.release.value = 0.2;
    // a touch of room so the kit doesn't sound like it is inside a shoebox
    var verb = ctx.createConvolver();
    var len = Math.floor(ctx.sampleRate * 0.55), imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = imp.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    verb.buffer = imp;
    var wet = ctx.createGain(); wet.gain.value = 0.12;
    var dry = ctx.createGain(); dry.gain.value = 1;
    var bus = ctx.createGain();
    bus.connect(dry); bus.connect(verb); verb.connect(wet);
    dry.connect(master); wet.connect(master);
    master.connect(comp); comp.connect(ctx.destination);
    kit = window.DrumEngine.create(ctx, bus);
    return true;
  }

  function hitNow(inst, vel, opts) {
    if (!ensureAudio()) return;
    kit.hit(inst, ctx.currentTime + 0.01, vel * volume, opts);
  }

  /* level: true/'strong' = downbeat, 'mid' = other accented beat, false/'weak' = subdivision */
  var CLICK_LEVEL = {
    strong: { freq: 1900, peak: 0.16 },
    mid:    { freq: 1600, peak: 0.13 },
    weak:   { freq: 1300, peak: 0.1 }
  };
  function click(t, level) {
    var lv = CLICK_LEVEL[level === true ? 'strong' : level === false ? 'weak' : level] || CLICK_LEVEL.weak;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = lv.freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(lv.peak * volume, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.06);
  }

  /* Stop every playing groove and, on Escape/visibility-loss, silence the page. */
  function stopAll() { allPlayers.forEach(function (p) { p.stop(); }); }

  /* ------------------------------------------------------------ instruments */
  // step = diatonic position on the 5-line staff: 0 = bottom line (E4), 1 = first space (F4) ...
  var INST = {
    crash:  { label: 'Crash cymbal',  short: 'Crash',    step: 10, head: 'x' },
    ride:   { label: 'Ride cymbal',   short: 'Ride',     step: 8,  head: 'x' },
    hat:    { label: 'Hi-hat (closed)', short: 'Hi-hat', step: 9,  head: 'x' },
    ohat:   { label: 'Hi-hat (open)', short: 'Open hat', step: 9,  head: 'x', open: true },
    tomHi:  { label: 'High tom',      short: 'High tom', step: 7,  head: 'o' },
    tomMid: { label: 'Mid tom',       short: 'Mid tom',  step: 6,  head: 'o' },
    snare:  { label: 'Snare drum',    short: 'Snare',    step: 5,  head: 'o' },
    tomLo:  { label: 'Floor tom',     short: 'Floor tom', step: 3, head: 'o' },
    kick:   { label: 'Bass drum (kick)', short: 'Kick',  step: 1,  head: 'o', voice: 2 }
  };
  var ORDER = ['crash', 'ride', 'hat', 'ohat', 'tomHi', 'tomMid', 'snare', 'tomLo', 'kick'];
  var VEL = { X: 1, x: 0.74, g: 0.3 };

  /* -------------------------------------------------------------- SVG utils */
  var NS = 'http://www.w3.org/2000/svg';
  function svgEl(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function htmlEl(tag, cls, text, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  var INK = '#1b1410';

  function drawHead(g, x, y, inst, scale, ghost) {
    var def = INST[inst], s = scale || 1;
    if (def.head === 'x') {
      var d = 5.2 * s;
      svgEl('path', { d: 'M' + (x - d) + ' ' + (y - d) + 'L' + (x + d) + ' ' + (y + d) + 'M' + (x - d) + ' ' + (y + d) + 'L' + (x + d) + ' ' + (y - d),
        stroke: INK, 'stroke-width': 2.2 * s, fill: 'none', 'stroke-linecap': 'round' }, g);
      if (def.open) svgEl('circle', { cx: x, cy: y - 13, r: 3.6, fill: 'none', stroke: INK, 'stroke-width': 1.5 }, g);
    } else {
      svgEl('ellipse', { cx: x, cy: y, rx: 6.4 * s, ry: 4.6 * s, fill: INK, transform: 'rotate(-18 ' + x + ' ' + y + ')' }, g);
    }
  }

  function restGlyph(g, kind, x, yMid) {
    if (kind === 'q') {
      svgEl('path', { d: 'M' + (x - 3) + ' ' + (yMid - 15) + 'L' + (x + 4) + ' ' + (yMid - 6) + 'L' + (x - 3) + ' ' + (yMid + 3) +
        'L' + (x + 4) + ' ' + (yMid + 11) + 'Q' + (x - 6) + ' ' + (yMid + 9) + ' ' + (x - 2) + ' ' + (yMid + 17),
        stroke: INK, 'stroke-width': 2.6, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
    } else {
      var dots = kind === 's' ? 2 : 1;
      for (var i = 0; i < dots; i++) {
        var oy = yMid - 6 + i * 9, ox = x - i * 2.5;
        svgEl('circle', { cx: ox - 3, cy: oy, r: 2.4, fill: INK }, g);
        svgEl('path', { d: 'M' + (ox + 3) + ' ' + (oy - 2) + 'L' + (ox - 2.5) + ' ' + (oy + 10), stroke: INK, 'stroke-width': 1.7, fill: 'none', 'stroke-linecap': 'round' }, g);
      }
    }
  }

  /* --------------------------------------------------------- pattern model */
  function norm(p) {
    var beats = p.beats || 4, barSteps = beats * 4, len = 0, tracks = {};
    ORDER.forEach(function (k) { if (p.tracks[k]) len = Math.max(len, p.tracks[k].length); });
    var bars = Math.max(1, Math.ceil(len / barSteps)), total = bars * barSteps;
    ORDER.forEach(function (k) {
      var s = p.tracks[k] || '';
      while (s.length < total) s += '-';
      tracks[k] = s;
    });
    return { beats: beats, barSteps: barSteps, bars: bars, total: total, tracks: tracks };
  }

  var SWING_OFF = [0, 1 / 3, 2 / 3, 5 / 6, 1];
  var STRAIGHT_OFF = [0, 0.25, 0.5, 0.75, 1];

  /* ----------------------------------------------------------- staff render */
  var SP = 12, STEP = 30, ROWH = 224;

  function renderStaff(p) {
    var N = norm(p);
    var barsPerRow = 1;                       // one bar per line keeps the notation large and readable
    var rows = Math.ceil(N.bars / barsPerRow);
    var left = 78, barW = N.barSteps * STEP + 30;
    var width = left - 4 + barsPerRow * barW + 10;
    var svg = svgEl('svg', { viewBox: '0 0 ' + width + ' ' + (rows * ROWH), 'class': 'dr-staff', role: 'img',
      'aria-label': 'Drum notation: ' + (p.name || 'pattern') + ', ' + N.bars + (N.bars === 1 ? ' bar' : ' bars') + ' of ' + N.beats + '/4' });
    var g = svgEl('g', { fill: INK, stroke: 'none' }, svg);
    var rowSteps = barsPerRow * N.barSteps;

    function pos(k) {
      var r = Math.min(rows - 1, Math.floor(k / rowSteps));
      var loc = Math.min(rowSteps, k - r * rowSteps);
      var b = Math.min(barsPerRow - 1, Math.floor(loc / N.barSteps));
      return { x: left - 4 + b * barW + 20 + (loc - b * N.barSteps) * STEP, row: r };
    }
    function yb(r) { return r * ROWH + 128; }
    function yOf(inst, r) { return yb(r) - INST[inst].step * (SP / 2); }

    // staves, clef, barlines
    for (var r = 0; r < rows; r++) {
      var nb = Math.min(barsPerRow, N.bars - r * barsPerRow), x1 = left - 4 + nb * barW, top = yb(r) - 48;
      for (var l = 0; l < 5; l++) svgEl('line', { x1: 8, x2: x1, y1: top + l * SP, y2: top + l * SP, stroke: INK, 'stroke-width': 1.1 }, g);
      svgEl('rect', { x: 18, y: top + 12, width: 5, height: 24, fill: INK }, g);
      svgEl('rect', { x: 29, y: top + 12, width: 5, height: 24, fill: INK }, g);
      svgEl('line', { x1: left - 4, x2: left - 4, y1: top, y2: top + 48, stroke: INK, 'stroke-width': 1.4 }, g);
      for (var b = 1; b <= nb; b++) {
        var bx = left - 4 + b * barW;
        if (b === nb && r === rows - 1) {                // final bar: repeat sign, the groove loops
          svgEl('line', { x1: bx - 9, x2: bx - 9, y1: top, y2: top + 48, stroke: INK, 'stroke-width': 1.4 }, g);
          svgEl('rect', { x: bx - 5, y: top, width: 4, height: 48, fill: INK }, g);
          svgEl('circle', { cx: bx - 15, cy: top + 18, r: 2.2, fill: INK }, g);
          svgEl('circle', { cx: bx - 15, cy: top + 30, r: 2.2, fill: INK }, g);
        } else {
          svgEl('line', { x1: bx, x2: bx, y1: top, y2: top + 48, stroke: INK, 'stroke-width': 1.4 }, g);
        }
      }
    }
    // time signature
    [['' + N.beats, 22], ['4', 46]].forEach(function (t) {
      svgEl('text', { x: 52, y: yb(0) - 48 + t[1], 'font-size': 26, 'font-weight': 700, 'font-family': 'Georgia, serif', 'text-anchor': 'middle', fill: INK }, g).textContent = t[0];
    });
    if (p.swing) {
      svgEl('text', { x: left + 6, y: 26, 'font-size': 13, 'font-style': 'italic', fill: INK }, g)
        .textContent = 'Swing feel: the “&” is played late (long–short, long–short)';
    }

    // per-step head lists
    var steps = [];
    for (var k = 0; k < N.total; k++) {
      var v1 = [], v2 = [];
      ORDER.forEach(function (inst) {
        var ch = N.tracks[inst][k];
        if (ch !== '-' && ch !== ' ' && ch !== undefined) (INST[inst].voice === 2 ? v2 : v1).push({ inst: inst, ch: ch });
      });
      steps.push({ 1: v1, 2: v2 });
    }

    function drawEvents(voice) {
      var up = voice === 1;
      for (var b = 0; b < N.total / 4; b++) {
        var start = b * 4, evs = [], q;
        for (q = start; q < start + 4; q++) if (steps[q][voice].length) evs.push({ k: q, heads: steps[q][voice] });
        var p0 = pos(start), row = p0.row;
        if (!evs.length) { if (up) restGlyph(g, 'q', p0.x + 8, yb(row) - 24); continue; }
        if (up && evs[0].k > start) {
          var gap = evs[0].k - start;
          if (gap === 1) restGlyph(g, 's', pos(start).x, yb(row) - 24);
          else if (gap === 2) restGlyph(g, 'e', pos(start).x, yb(row) - 24);
          else { restGlyph(g, 'e', pos(start).x, yb(row) - 24); restGlyph(g, 's', pos(start + 2).x, yb(row) - 24); }
        }
        evs.forEach(function (e, i) { e.dur = (i + 1 < evs.length ? evs[i + 1].k : start + 4) - e.k; });

        var grouped = evs.length >= 2;
        var ext = up ? Infinity : -Infinity;
        evs.forEach(function (e) {
          var pp = pos(e.k), ys = e.heads.map(function (h) { return yOf(h.inst, pp.row); });
          e.x = pp.x; e.row = pp.row; e.ys = ys;
          e.sx = up ? pp.x + 5.9 : pp.x - 5.9;
          e.tip = up ? Math.min.apply(null, ys) - 32 : Math.max.apply(null, ys) + 32;
          if (grouped) ext = up ? Math.min(ext, e.tip) : Math.max(ext, e.tip);
        });
        evs.forEach(function (e) {
          var pp = { x: e.x, row: e.row };
          e.heads.forEach(function (h, hi) {
            var y = e.ys[hi], ld = INST[h.inst].step;
            if (ld >= 10) svgEl('line', { x1: pp.x - 10, x2: pp.x + 10, y1: y, y2: y, stroke: INK, 'stroke-width': 1.3 }, g);
            if (ld <= -2) svgEl('line', { x1: pp.x - 10, x2: pp.x + 10, y1: y, y2: y, stroke: INK, 'stroke-width': 1.3 }, g);
            drawHead(g, pp.x, y, h.inst, 1);
            if (h.ch === 'g') {
              svgEl('text', { x: pp.x - 14, y: y + 5, 'font-size': 15, 'font-weight': 700, fill: INK }, g).textContent = '(';
              svgEl('text', { x: pp.x + 8.5, y: y + 5, 'font-size': 15, 'font-weight': 700, fill: INK }, g).textContent = ')';
            }
          });
          var accent = e.heads.some(function (h) { return h.ch === 'X'; });
          {
            var yStart = up ? Math.max.apply(null, e.ys) : Math.min.apply(null, e.ys);
            var tip = grouped ? ext : e.tip;
            svgEl('line', { x1: e.sx, x2: e.sx, y1: yStart, y2: tip, stroke: INK, 'stroke-width': 1.6 }, g);
            e.tipY = tip;
          }
          if (accent) {
            var ay = up ? e.tipY - 10 : e.tipY + 10;
            svgEl('path', { d: 'M' + (pp.x - 6) + ' ' + (ay - 4.5) + 'L' + (pp.x + 6) + ' ' + ay + 'L' + (pp.x - 6) + ' ' + (ay + 4.5), stroke: INK, 'stroke-width': 1.6, fill: 'none', 'stroke-linejoin': 'round' }, g);
          }
          if (e.dur === 3) svgEl('circle', { cx: pp.x + 12, cy: e.ys[0] + (INST[e.heads[0].inst].step % 2 === 0 ? -3 : 0), r: 1.9, fill: INK }, g);
          if (e.dur < 4 && !grouped) {                                // lone eighth / sixteenth: flags
            var nFlags = e.dur === 1 ? 2 : 1;
            for (var f = 0; f < nFlags; f++) {
              var fy = up ? e.tipY + f * 7 : e.tipY - f * 7, dir = up ? 1 : -1;
              svgEl('path', { d: 'M' + e.sx + ' ' + fy + 'q9 ' + (7 * dir) + ' 6 ' + (17 * dir), stroke: INK, 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round' }, g);
            }
          }
          var gr = p.grace && p.grace[e.k];
          if (gr && up) {
            for (var j = 0; j < gr; j++) {
              var gx = pp.x - (gr - j) * 11 - 6, gyy = e.ys[0];
              svgEl('ellipse', { cx: gx, cy: gyy, rx: 4.2, ry: 3, fill: INK, transform: 'rotate(-18 ' + gx + ' ' + gyy + ')' }, g);
              svgEl('line', { x1: gx + 3.8, x2: gx + 3.8, y1: gyy, y2: gyy - 20, stroke: INK, 'stroke-width': 1.2 }, g);
              if (j === 0) svgEl('line', { x1: gx, x2: gx + 8, y1: gyy - 17, y2: gyy - 8, stroke: INK, 'stroke-width': 1.2 }, g);
            }
          }
        });
        if (grouped) {
          var bh = 3.8, first = evs[0], last = evs[evs.length - 1];
          var by = function (lvl) { return up ? ext + lvl * 6.5 : ext - lvl * 6.5 - bh; };
          svgEl('rect', { x: first.sx - 0.8, y: by(0), width: last.sx - first.sx + 1.6, height: bh, fill: INK }, g);
          evs.forEach(function (e, i) {
            if (e.dur !== 1) return;
            var pairNext = i + 1 < evs.length && evs[i + 1].dur === 1;
            var pairPrev = i > 0 && evs[i - 1].dur === 1;
            if (pairNext) svgEl('rect', { x: e.sx - 0.8, y: by(1), width: evs[i + 1].sx - e.sx + 1.6, height: bh, fill: INK }, g);
            else if (!pairPrev) {
              var toLeft = i > 0;
              svgEl('rect', { x: toLeft ? e.sx - 10 : e.sx - 0.8, y: by(1), width: 10.8, height: bh, fill: INK }, g);
            }
          });
        }
      }
    }
    drawEvents(1);
    drawEvents(2);

    // sticking row: R = orange, L = blue; lowercase letters under grace notes
    if (p.sticking) {
      for (var sk = 0; sk < p.sticking.length; sk++) {
        var ch = p.sticking[sk];
        if (ch === '-' || ch === ' ') continue;
        var sp = pos(sk);
        svgEl('text', { x: sp.x, y: yb(sp.row) + 50, 'font-size': 16, 'font-weight': 700, 'text-anchor': 'middle',
          fill: ch === 'R' ? '#b4410a' : '#1f5f99' }, g).textContent = ch;
      }
      Object.keys(p.graceStick || {}).forEach(function (key) {
        var gp = pos(+key), gs = p.graceStick[key];
        for (var j = 0; j < gs.length; j++) {
          svgEl('text', { x: gp.x - (gs.length - j) * 11 - 6, y: yb(gp.row) + 50, 'font-size': 13, 'font-weight': 700, 'font-family': 'JetBrains Mono, monospace', 'text-anchor': 'middle',
            fill: gs[j] === 'r' ? '#b4410a' : '#1f5f99' }, g).textContent = gs[j];
        }
      });
    }

    // counting row ("1 e & a")
    var res = 4, hasOff = false;
    for (var ck = 0; ck < N.total; ck++) {
      var used = false;
      ORDER.forEach(function (inst) { if (N.tracks[inst][ck] !== '-') used = true; });
      if (used && ck % 4 === 2) hasOff = true;
      if (used && ck % 2 === 1) res = 1;
    }
    if (res !== 1) res = hasOff ? 2 : 4;
    var LAB16 = ['', 'e', '&', 'a'], countEls = [];
    for (var cs = 0; cs < N.total; cs++) {
      countEls.push(null);
      var rem = cs % 4;
      if (res === 4 && rem !== 0) continue;
      if (res === 2 && rem % 2 !== 0) continue;
      var lab = rem === 0 ? '' + ((Math.floor(cs / 4) % N.beats) + 1) : LAB16[rem];
      var cp = pos(cs);
      countEls[cs] = svgEl('text', { x: cp.x, y: yb(cp.row) + (p.sticking ? 82 : 66), 'font-size': rem === 0 ? 17 : 14, 'font-weight': rem === 0 ? 700 : 500,
        'text-anchor': 'middle', 'class': 'dr-count-lab', fill: '#5b4b3d' }, g);
      countEls[cs].textContent = lab;
    }

    // playhead
    var head = svgEl('rect', { 'class': 'dr-playhead', x: 0, y: 0, width: 4, height: 190, rx: 2, opacity: 0 }, svg);

    var off = p.swing ? SWING_OFF : STRAIGHT_OFF;
    function setPlayhead(stepFloat) {
      if (stepFloat === null) { head.setAttribute('opacity', 0); return; }
      var k = Math.min(N.total - 0.0001, Math.max(0, stepFloat));
      var pp = pos(Math.floor(k)), nx = pos(Math.floor(k) + 1);
      var frac = k - Math.floor(k);
      var x = pp.x + (nx.row === pp.row ? (nx.x - pp.x) * frac : STEP * frac);
      head.setAttribute('x', (x - 2).toFixed(1));
      head.setAttribute('y', pp.row * ROWH + 26);
      head.setAttribute('opacity', 0.85);
    }
    return { svg: svg, N: N, countEls: countEls, setPlayhead: setPlayhead, off: off };
  }

  /* ------------------------------------------------------------ pattern sets */
  var GHOST_NOTE_TIP = 'Ghost notes (in parentheses) are played very quietly. They fill the space between the loud hits and make the groove feel busy and alive.';

  var SETS = {};

  SETS.values = [
    { name: 'Quarter notes', desc: 'One note per beat: the pulse you would tap your foot to. Count “1 2 3 4”.', tempo: 80, tracks: { snare: 'x---x---x---x---' },
      tip: 'A quarter note has a filled head and a plain stem. Four of them fill one 4/4 bar.' },
    { name: 'Eighth notes', desc: 'Two notes per beat, joined by a beam. Count “1 & 2 & 3 & 4 &”.', tempo: 80, tracks: { hat: 'x-x-x-x-x-x-x-x-' },
      tip: 'The beam joins the stems: one beam = eighth notes. This is the hi-hat pattern under most rock and pop.' },
    { name: 'Sixteenth notes', desc: 'Four notes per beat, with two beams. Count “1 e & a 2 e & a …”.', tempo: 72, tracks: { hat: 'xxxxxxxxxxxxxxxx' },
      tip: 'Two beams = sixteenth notes. Each beat is now split into four equal pieces: 1, e, &, a.' },
    { name: 'Rests: playing silence', desc: 'Rests are counted silence. Beats 2 and 4 hold rest signs, so only beats 1 and 3 sound.', tempo: 80, tracks: { snare: 'x-------x-------' },
      tip: 'The squiggly sign is a quarter rest. Keep counting through it: “1 (2) 3 (4)”.' },
    { name: 'Eighth rests: hit the “ands”', desc: 'An eighth rest lands on the beat and the note lands on the “&”, which is off the beat.', tempo: 80, tracks: { snare: '--x---x---x---x-' },
      tip: 'The little flag-and-dot sign is an eighth rest. Say “1 & 2 &” out loud and only play on the “&”.' },
    { name: 'Dotted eighth + sixteenth', desc: 'A dot adds half again: the long note lasts three sixteenths, the short one lasts one. “1 – – a”.', tempo: 72, tracks: { snare: 'x--xx--xx--xx--x' },
      tip: 'The dot after the note head lengthens it by half. The pair is a long-short lilt you hear in marches and funk.' }
  ];

  SETS.beats = [
    { name: 'Basic rock beat', desc: 'The most important groove in modern music: hi-hat on every eighth note, kick on 1 and 3, snare on 2 and 4.', tempo: 100,
      tracks: { hat: 'x-x-x-x-x-x-x-x-', snare: '----x-------x---', kick: 'x-------x-------' },
      tip: 'Listen for the backbeat: the snare “cracks” on 2 and 4, the beats you would clap to.' },
    { name: 'Rock beat with a pushed kick', desc: 'Same groove, but the kick adds an extra hit on the “&” of 3. It leans forward and feels more driving.', tempo: 104,
      tracks: { hat: 'x-x-x-x-x-x-x-x-', snare: '----x-------x---', kick: 'x-------x-x-----' },
      tip: 'Compare with the basic beat: only one extra kick note, but the whole groove changes character.' },
    { name: 'Four on the floor (disco / dance)', desc: 'Kick on every beat, open hi-hat on every “&”, snare on 2 and 4. It is the pulse of dance music.', tempo: 120,
      tracks: { ohat: '--x---x---x---x-', snare: '----x-------x---', kick: 'x---x---x---x---' },
      tip: 'The open hi-hat rings out, then the next kick hit “chokes” it, like a real hi-hat pedal closing.' },
    { name: 'Half-time feel', desc: 'The snare waits until beat 3, so a busy hi-hat sounds slow and heavy. The tempo is the same, but it feels half as fast.', tempo: 96,
      tracks: { hat: 'x-x-x-x-x-x-x-x-', snare: '--------x-------', kick: 'x-----x---------' },
      tip: 'Hi-hat pattern unchanged, yet the missing snare on beat 2 changes the whole feel.' },
    { name: 'Funk groove with ghost notes', desc: 'Sixteenth-note hi-hat, loud backbeat, and quiet ghost notes on the snare. Accented hi-hat marks the beat.', tempo: 92,
      tracks: { hat: 'XxxxXxxxXxxxXxxx', snare: '----X--g-g--X--g', kick: 'x-----x---x-----' },
      tip: GHOST_NOTE_TIP },
    { name: 'Blues shuffle', desc: 'Eighth notes swung long–short like a skipping rhythm, on the ride cymbal. Shuffles power blues and early rock and roll.', tempo: 92, swing: true,
      tracks: { ride: 'x-x-x-x-x-x-x-x-', snare: '----x-------x---', kick: 'x-------x-------' },
      tip: 'Written as plain eighth notes but played with a triplet lilt. The “swing” marking tells you how.' },
    { name: 'Reggae one-drop', desc: 'The kick and snare land together on beat 3 and beat 1 is left empty. “One drop” refers to that missing downbeat.', tempo: 76,
      tracks: { hat: 'x-x-x-x-x-x-x-x-', snare: '--------x-------', kick: '--------x-------' },
      tip: 'Beat 1 shows a rest. Leaving space on the downbeat creates the laid-back reggae feel.' },
    { name: 'Waltz in 3/4', desc: 'Three beats per bar instead of four: kick on 1, snare on 2 and 3. Count “1 2 3, 1 2 3”.', tempo: 108, beats: 3,
      tracks: { hat: 'x-x-x-x-x-x-', snare: '----x---x---', kick: 'x-----------' },
      tip: 'The time signature is 3/4: three quarter-note beats per bar, so each bar is shorter.' }
  ];

  SETS.rudiments = [
    { name: 'Single stroke roll', desc: 'Alternate hands evenly: right, left, right, left. Everything else is built from this.', tempo: 70,
      tracks: { snare: 'xxxxxxxxxxxxxxxx' }, sticking: 'RLRLRLRLRLRLRLRL',
      tip: 'Each hand plays every other note, so the notes come out even: R L R L. Start slow and keep the volume the same.' },
    { name: 'Double stroke roll', desc: 'Two strokes per hand: RR LL RR LL. The second stroke is a controlled rebound.', tempo: 70,
      tracks: { snare: 'xxxxxxxxxxxxxxxx' }, sticking: 'RRLLRRLLRRLLRRLL',
      tip: 'Let the stick bounce for the second stroke. The two notes of each pair should sound the same.' },
    { name: 'Single paradiddle', desc: 'R L R R, L R L L. The doubled stroke swaps the lead hand each time, and the accent marks the “1” of each group.', tempo: 76,
      tracks: { snare: 'XxxxXxxxXxxxXxxx' }, sticking: 'RLRRLRLLRLRRLRLL',
      tip: 'Say “par-a-did-dle”. The accents (>) start each group of four, so the pattern feels like four beats.' },
    { name: 'Flam', desc: 'A quiet grace note just before the main note, played by the opposite hand, so it sounds like one fat note.', tempo: 70,
      tracks: { snare: 'x---x---x---x---' }, sticking: 'R---L---R---L---', grace: { 0: 1, 4: 1, 8: 1, 12: 1 }, graceStick: { 0: 'l', 4: 'r', 8: 'l', 12: 'r' },
      tip: 'The small note with a slash is a grace note. Keep it low and close to the surface, then let the main hand play at full volume.' },
    { name: 'Flam tap', desc: 'A flam followed by a tap in the same hand: lR R, rL L. It moves a flam along in eighth notes.', tempo: 72,
      tracks: { snare: 'x-x-x-x-x-x-x-x-' }, sticking: 'R-R-L-L-R-R-L-L-', grace: { 0: 1, 4: 1, 8: 1, 12: 1 }, graceStick: { 0: 'l', 4: 'r', 8: 'l', 12: 'r' },
      tip: 'The tap is a plain single stroke. It is easy to rush, so use the click track and keep the taps even.' },
    { name: 'Drag (ruff)', desc: 'Two quick grace notes before the main stroke, played almost like a very short double stroke roll.', tempo: 66,
      tracks: { snare: 'x---x---x---x---' }, sticking: 'R---L---R---L---', grace: { 0: 2, 4: 2, 8: 2, 12: 2 }, graceStick: { 0: 'll', 4: 'rr', 8: 'll', 12: 'rr' },
      tip: 'Two slash-marked small notes = a drag. Both grace notes are quiet, then the main note lands on the beat.' },
    { name: 'Five-stroke roll', desc: 'Two double strokes then an accented final note: R R L L R. It fills a full beat with sound and lands on the beat.', tempo: 70,
      tracks: { snare: 'xxxxX---xxxxX---' }, sticking: 'RRLLR---LLRRL---',
      tip: 'The last note lands on the next beat with an accent. The pattern starts on the opposite hand each time.' }
  ];

  // Fills are two bars that loop: bar 1 = groove starting with a crash, bar 2 = groove + fill.
  var G_HAT = '--x-x-x-x-x-x-x-', G_SNARE = '----x-------x---', G_KICK = 'x-------x-------', EMPTY = '----------------';
  function fillPattern(bar2) {
    var tr = { crash: 'x', hat: G_HAT + (bar2.hat || EMPTY), snare: G_SNARE + (bar2.snare || EMPTY), kick: G_KICK + (bar2.kick || G_KICK) };
    ['tomHi', 'tomMid', 'tomLo'].forEach(function (k) { if (bar2[k]) tr[k] = EMPTY + bar2[k]; });
    return tr;
  }
  SETS.fills = [
    { name: 'Fill 1: snare sixteenths', desc: 'Play the groove for three beats, then four fast snare notes on beat 4, leading into a crash on the next bar’s “1”.', tempo: 92,
      tracks: fillPattern({ hat: 'x-x-x-x-x-x-----', snare: '----x-------xxxx' }),
      tip: 'The fill is only one beat long. Beats 1–3 of bar 2 are the normal groove, so the ear hears the change coming.' },
    { name: 'Fill 2: eighths down the toms', desc: 'On beats 3 and 4, play eighth notes moving from the high tom down to the floor tom.', tempo: 90,
      tracks: fillPattern({ hat: 'x-x-x-x---------', snare: '----x-----------', tomHi: '--------x-x-----', tomMid: '------------x---', tomLo: '--------------x-' }),
      tip: 'Following the toms from high to low sounds like a falling melody: hi, hi, mid, low.' },
    { name: 'Fill 3: sixteenth cascade', desc: 'Snare sixteenths on beat 3, then a run down the toms on beat 4. This is the classic rock fill.', tempo: 88,
      tracks: fillPattern({ hat: 'x-x-x-x---------', snare: '----x---xxxx----', tomHi: '------------xx--', tomMid: '--------------x-', tomLo: '---------------x' }),
      tip: 'Count all the sixteenths: “3 e & a 4 e & a”. Every note in the run must land on its number.' },
    { name: 'Fill 4: around the kit', desc: 'A full bar of eighth notes: snare, then high tom, mid tom and floor tom, and a crash when the groove returns.', tempo: 86,
      tracks: fillPattern({ hat: EMPTY, snare: 'x-x-------------', tomHi: '----x-x---------', tomMid: '--------x-x-----', tomLo: '------------x-x-', kick: 'x---------------' }),
      tip: 'One drum per beat, two hits each. Feel the pitch step down: snare, high, mid, low. The crash resolves the tension.' },
    { name: 'Fill 5: snare build', desc: 'Eight sixteenth notes that start quiet and grow louder, like a drum roll into the next section.', tempo: 90,
      tracks: fillPattern({ hat: 'x-x-x-x---------', snare: '----x---gggxxxXX' }),
      tip: 'Ghost notes (in parentheses) are soft, plain notes are medium and accented notes are loud. Together they make a crescendo.' }
  ];

  /* ------------------------------------------------------------------ player */
  var allPlayers = [];
  var activePlayer = null;

  function createPlayer(root, cfg) {
    var patterns = cfg.patterns, idx = 0, P = patterns[0], view = null;
    var tempo = P.tempo || 100;
    var playing = false, timer = 0, raf = 0;
    var anchorTime = 0, anchorBeat = 0, beatDur = 0.6, nextK = 0, nextClick = 0, queue = [];
    var editable = !!cfg.editable;
    var self = { stop: stop };
    allPlayers.push(self);

    root.innerHTML = '';
    var picker = null;
    if (patterns.length > 1 && !editable) {
      picker = htmlEl('div', 'dr-picker', null, root);
      picker.setAttribute('role', 'group'); picker.setAttribute('aria-label', 'Choose a pattern');
    }
    var head = htmlEl('div', 'dr-head', null, root);
    var title = htmlEl('h3', 'dr-title', '', head);
    var desc = htmlEl('p', 'dr-desc', '', head);

    var bar = htmlEl('div', 'dr-transport', null, root);
    var playBtn = htmlEl('button', 'dr-play', '', bar);
    playBtn.type = 'button';
    var tempoWrap = htmlEl('label', 'dr-tempo', null, bar);
    htmlEl('span', null, 'Tempo', tempoWrap);
    var tempoIn = document.createElement('input');
    tempoIn.type = 'range'; tempoIn.min = 50; tempoIn.max = 180; tempoIn.value = tempo;
    tempoWrap.appendChild(tempoIn);
    var tempoOut = htmlEl('output', 'dr-tempo-out', '', tempoWrap);
    var clickLab = htmlEl('label', 'dr-check', null, bar);
    var clickIn = document.createElement('input'); clickIn.type = 'checkbox';
    clickLab.appendChild(clickIn); htmlEl('span', null, 'Click track', clickLab);
    var countLab = htmlEl('label', 'dr-check', null, bar);
    var countIn = document.createElement('input'); countIn.type = 'checkbox'; countIn.checked = true;
    countLab.appendChild(countIn); htmlEl('span', null, 'Count-in', countLab);
    if (cfg.setKey) {
      var addBtn = htmlEl('button', 'dr-mini dr-add-practice', '+ Add to practice list', bar);
      addBtn.type = 'button';
      addBtn.addEventListener('click', function () { addPracticeItem(cfg.setKey, idx, addBtn); });
    }
    var chipRow = htmlEl('div', 'dr-chip-row', null, root);
    var chips = htmlEl('div', 'dr-chips', null, chipRow);
    chips.setAttribute('aria-hidden', 'true');
    var status = htmlEl('span', 'dr-status', '', chipRow);
    status.setAttribute('aria-live', 'polite');
    var wrap = htmlEl('div', 'dr-staff-wrap', null, root);
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Drum notation, scrolls sideways on small screens');
    var tip = htmlEl('p', 'dr-tip', '', root);
    var grid = null, gridState = null;

    if (picker) {
      patterns.forEach(function (pt, i) {
        var b = htmlEl('button', 'dr-pick', pt.name, picker);
        b.type = 'button'; b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
        b.addEventListener('click', function () { choose(i); });
      });
    }

    function tempoText() { tempoOut.textContent = tempo + ' BPM'; }

    function buildChips() {
      chips.innerHTML = '';
      view.chipMap = {};
      ORDER.forEach(function (inst) {
        var used = view.N.tracks[inst].replace(/-/g, '').length > 0;
        if (!used && !(inst === 'snare' && P.grace)) return;
        var c = htmlEl('span', 'dr-chip', INST[inst].short, chips);
        view.chipMap[inst] = c;
      });
    }

    function render() {
      wrap.innerHTML = '';
      view = renderStaff(P);
      wrap.appendChild(view.svg);
      buildChips();
      title.textContent = P.name;
      desc.textContent = P.desc || '';
      tip.textContent = P.tip || '';
      tip.style.display = P.tip ? '' : 'none';
    }

    function choose(i) {
      stop();
      idx = i; P = patterns[i]; tempo = P.tempo || tempo;
      tempoIn.value = tempo; tempoText();
      if (picker) Array.prototype.forEach.call(picker.children, function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      render();
    }

    function beatPos(k) {
      var N = view.N, loop = Math.floor(k / N.total), kk = k - loop * N.total;
      return loop * (N.total / 4) + Math.floor(kk / 4) + view.off[kk % 4];
    }
    function timeOf(beat) { return anchorTime + (beat - anchorBeat) * beatDur; }

    function schedule(k, t) {
      var N = view.N, kk = k % N.total, hits = [];
      ORDER.forEach(function (inst) {
        var v = VEL[N.tracks[inst][kk]];
        if (v) { kit.hit(inst, t, v * volume); hits.push(inst); }
      });
      var gr = P.grace && P.grace[kk];
      if (gr) {
        for (var j = 0; j < gr; j++) kit.hit('snare', t - (gr - j) * 0.036, 0.32 * volume);
        hits.push('snare');
      }
      if (hits.length) queue.push({ t: t, hits: hits });
    }

    function tick() {
      var horizon = ctx.currentTime + 0.14, N = view.N, beats = N.beats;
      while (timeOf(beatPos(nextK)) < horizon) { var t = timeOf(beatPos(nextK)); if (nextK >= 0) schedule(nextK, t); nextK++; }
      while (timeOf(nextClick) < horizon) {
        if (nextClick < 0 || clickIn.checked) click(timeOf(nextClick), (((nextClick % beats) + beats) % beats) === 0);
        nextClick++;
      }
    }

    function frame() {
      if (!playing) return;
      var lat = (ctx.outputLatency || ctx.baseLatency || 0);
      var now = ctx.currentTime - lat;
      var A = anchorBeat + (now - anchorTime) / beatDur;
      var N = view.N;
      if (A < 0) {
        view.setPlayhead(null);
        status.textContent = 'Count-in: ' + (Math.floor(A) + 1 + N.beats);
      } else {
        status.textContent = 'Playing';
        var totalBeats = N.total / 4, lb = A - Math.floor(A / totalBeats) * totalBeats;
        var b = Math.floor(lb), fr = lb - b, r = 0;
        while (r < 3 && fr >= view.off[r + 1]) r++;
        var sf = b * 4 + r + (fr - view.off[r]) / (view.off[r + 1] - view.off[r]);
        view.setPlayhead(sf);
        var cur = Math.floor(sf);
        if (cur !== view.lastStep) {
          if (view.lastStep !== undefined && view.countEls[view.lastStep]) view.countEls[view.lastStep].classList.remove('is-now');
          if (view.countEls[cur]) view.countEls[cur].classList.add('is-now');
          view.lastStep = cur;
        }
      }
      while (queue.length && queue[0].t - lat <= ctx.currentTime) {
        var q = queue.shift();
        q.hits.forEach(function (inst) {
          var c = view.chipMap[inst];
          if (c) { c.classList.add('is-hit'); setTimeout(function () { c.classList.remove('is-hit'); }, 110); }
        });
      }
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (!ensureAudio()) { status.textContent = 'Audio is not available in this browser.'; return; }
      if (activePlayer && activePlayer !== self) activePlayer.stop();
      activePlayer = self;
      playing = true;
      beatDur = 60 / tempo;
      anchorTime = ctx.currentTime + 0.1;
      anchorBeat = countIn.checked ? -view.N.beats : 0;
      nextK = 0; nextClick = anchorBeat; queue = [];
      view.lastStep = undefined;
      playBtn.setAttribute('aria-pressed', 'true');
      playBtn.innerHTML = '<span aria-hidden="true">■</span> Stop';
      wrap.classList.add('is-playing');
      tick();
      timer = setInterval(tick, 25);
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (!playing) return;
      playing = false;
      clearInterval(timer); cancelAnimationFrame(raf);
      if (view) {
        view.setPlayhead(null);
        if (view.lastStep !== undefined && view.countEls[view.lastStep]) view.countEls[view.lastStep].classList.remove('is-now');
      }
      status.textContent = '';
      playBtn.setAttribute('aria-pressed', 'false');
      playBtn.innerHTML = '<span aria-hidden="true">▶</span> Play';
      wrap.classList.remove('is-playing');
      if (activePlayer === self) activePlayer = null;
    }

    playBtn.addEventListener('click', function () { if (playing) stop(); else start(); });
    tempoIn.addEventListener('input', function () {
      var newTempo = +tempoIn.value;
      if (playing) {
        var now = ctx.currentTime;
        anchorBeat = anchorBeat + (now - anchorTime) / beatDur;
        anchorTime = now;
        beatDur = 60 / newTempo;
      }
      tempo = newTempo; tempoText();
    });

    /* ---- builder grid (editable mode) ---- */
    if (editable) {
      var LANES = ['crash', 'hat', 'ohat', 'snare', 'tomHi', 'tomLo', 'kick'];
      gridState = {};
      LANES.forEach(function (inst) { gridState[inst] = P.tracks[inst] ? P.tracks[inst].split('') : '----------------'.split(''); });
      grid = htmlEl('div', 'dr-grid', null, root);
      var tools = htmlEl('div', 'dr-grid-tools', null, grid);
      var presetSel = document.createElement('select');
      presetSel.setAttribute('aria-label', 'Load a starter groove');
      var opt0 = document.createElement('option'); opt0.textContent = 'Load a starter groove…'; opt0.value = ''; presetSel.appendChild(opt0);
      SETS.beats.filter(function (b) { return !b.beats && !b.swing; }).forEach(function (b, i) {
        var o = document.createElement('option'); o.value = i; o.textContent = b.name; presetSel.appendChild(o);
      });
      var presets = SETS.beats.filter(function (b) { return !b.beats && !b.swing; });
      tools.appendChild(presetSel);
      var clearBtn = htmlEl('button', 'dr-mini', 'Clear all', tools); clearBtn.type = 'button';
      htmlEl('span', 'dr-grid-hint', 'Click a square to cycle: off → normal → accent (>) → ghost (quiet) → off.', tools);
      var table = htmlEl('div', 'dr-grid-table', null, grid);
      table.setAttribute('role', 'group'); table.setAttribute('aria-label', 'Sixteen-step drum grid');
      var cellEls = {};
      var hdr = htmlEl('div', 'dr-grid-row dr-grid-head', null, table);
      htmlEl('span', 'dr-lane-name', '', hdr);
      var CNT = ['1', 'e', '&', 'a'];
      for (var s = 0; s < 16; s++) htmlEl('span', 'dr-grid-cnt' + (s % 4 === 0 ? ' is-beat' : ''), s % 4 === 0 ? '' + (s / 4 + 1) : CNT[s % 4], hdr);
      LANES.forEach(function (inst) {
        var row = htmlEl('div', 'dr-grid-row', null, table);
        htmlEl('span', 'dr-lane-name', INST[inst].short, row);
        cellEls[inst] = [];
        for (var s2 = 0; s2 < 16; s2++) {
          (function (step) {
            var cell = htmlEl('button', 'dr-cell' + (step % 4 === 0 ? ' is-beat' : ''), '', row);
            cell.type = 'button';
            cellEls[inst][step] = cell;
            cell.addEventListener('click', function () {
              var cyc = { '-': 'x', x: 'X', X: 'g', g: '-' };
              gridState[inst][step] = cyc[gridState[inst][step]] || 'x';
              paintCell(inst, step);
              var v = VEL[gridState[inst][step]];
              if (v && !playing) hitNow(inst, v);
              commit();
            });
          })(s2);
        }
      });
      var paintCell = function (inst, step) {
        var ch = gridState[inst][step], c = cellEls[inst][step];
        c.className = 'dr-cell' + (step % 4 === 0 ? ' is-beat' : '') + (ch === '-' ? '' : ' on-' + ch);
        c.textContent = ch === 'X' ? '>' : ch === 'g' ? '·' : '';
        c.setAttribute('aria-label', INST[inst].short + ', step ' + (step + 1) + ', ' + (ch === '-' ? 'off' : ch === 'x' ? 'on' : ch === 'X' ? 'accent' : 'ghost'));
      };
      var paintAll = function () { LANES.forEach(function (inst) { for (var s3 = 0; s3 < 16; s3++) paintCell(inst, s3); }); };
      var commit = function () {
        var tr = {};
        LANES.forEach(function (inst) { var str = gridState[inst].join(''); if (/[^-]/.test(str)) tr[inst] = str; });
        P.tracks = tr;
        wrap.innerHTML = '';
        view = renderStaff(P);
        view.lastStep = undefined;
        wrap.appendChild(view.svg);
        buildChips();
        if (!Object.keys(tr).length) { view.svg.setAttribute('aria-label', 'Empty bar of drum notation'); }
        tip.textContent = Object.keys(tr).length ? 'Watch the notation change as you add hits. Kick sits in the bottom space, snare in the middle space, hi-hat above the staff.' : 'The bar is empty, so every beat shows a rest. Add some hits!';
      };
      clearBtn.addEventListener('click', function () {
        LANES.forEach(function (inst) { for (var s4 = 0; s4 < 16; s4++) gridState[inst][s4] = '-'; });
        paintAll(); commit();
      });
      presetSel.addEventListener('change', function () {
        if (presetSel.value === '') return;
        var pr = presets[+presetSel.value];
        LANES.forEach(function (inst) {
          var str = pr.tracks[inst] || '';
          for (var s5 = 0; s5 < 16; s5++) gridState[inst][s5] = str[s5] || '-';
        });
        tempo = pr.tempo; tempoIn.value = tempo; tempoText();
        paintAll(); commit();
        presetSel.value = '';
      });
      paintAll();
    }

    tempoText();
    playBtn.innerHTML = '<span aria-hidden="true">▶</span> Play';
    playBtn.setAttribute('aria-pressed', 'false');
    render();
    if (editable) {
      tip.textContent = 'Watch the notation change as you add hits. Kick sits in the bottom space, snare in the middle space, hi-hat above the staff.';
    }
    return self;
  }

  /* -------------------------------------------------- meter / count-in trainer */
  var METERS = [
    { key: '4-4', label: '4/4', top: 4, bottom: 4, type: 'simple', beats: 4,
      desc: 'Four quarter-note beats per bar — count “1 2 3 4”. The default meter for most pop, rock and hip-hop.' },
    { key: '3-4', label: '3/4', top: 3, bottom: 4, type: 'simple', beats: 3,
      desc: 'Three quarter-note beats per bar — count “1 2 3”. Waltzes and many ballads.' },
    { key: '2-4', label: '2/4', top: 2, bottom: 4, type: 'simple', beats: 2,
      desc: 'Two quarter-note beats per bar — count “1 2”. Marches and polkas.' },
    { key: 'cut', label: 'Cut time', top: 2, bottom: 2, type: 'simple', beats: 2,
      desc: 'Alla breve: the same length bar as 4/4, but felt in two half-note beats instead of four quarter-note beats — count “1 2”, twice as fast a feel at the same tempo number.' },
    { key: '5-4', label: '5/4', top: 5, bottom: 4, type: 'simple', beats: 5, accent: [3, 2],
      desc: 'Five quarter-note beats, usually felt as a group of three plus a group of two — count “1 2 3 4 5”, leaning on beats 1 and 4. (Think “Take Five”.)' },
    { key: '6-8', label: '6/8', top: 6, bottom: 8, type: 'compound', groups: [3, 3],
      desc: 'Two dotted-quarter beats, each split into three eighth notes — count “1 & a 2 & a”.' },
    { key: '12-8', label: '12/8', top: 12, bottom: 8, type: 'compound', groups: [3, 3, 3, 3],
      desc: 'Four dotted-quarter beats, each split into three eighth notes — count “1 & a 2 & a 3 & a 4 & a”. The classic 12/8 blues-shuffle meter.' },
    { key: '7-8', label: '7/8', top: 7, bottom: 8, type: 'compound', groups: [2, 2, 3],
      desc: 'An irregular meter built from two two-note groups and one three-note group — count “1 2 3 4 5 6 7”, leaning on beats 1, 3 and 5 (“ONE two ONE two ONE two three”).' }
  ];

  function meterPulses(m) { return m.type === 'compound' ? m.groups.reduce(function (a, b) { return a + b; }, 0) : m.beats; }

  function meterGroupOf(m, i) {
    var pos = i, g = 0;
    while (pos >= m.groups[g]) { pos -= m.groups[g]; g++; }
    return { group: g, pos: pos };
  }

  function meterLabel(m, i) {
    if (m.type !== 'compound') return '' + (i + 1);
    var loc = meterGroupOf(m, i), uniform3 = m.groups.every(function (x) { return x === 3; });
    if (!uniform3) return '' + (i + 1);
    return loc.pos === 0 ? '' + (loc.group + 1) : (loc.pos === 1 ? '&' : 'a');
  }

  function meterIsAccent(m, i) {
    if (m.type !== 'compound') {
      var accents = m.accent || [m.beats], pos = 0;
      for (var g = 0; g < accents.length; g++) { if (i === pos) return true; pos += accents[g]; }
      return false;
    }
    return meterGroupOf(m, i).pos === 0;
  }

  function initMeterTrainer() {
    var picker = document.getElementById('drMeterPicker');
    var sigEl = document.getElementById('drMeterSig');
    var descEl = document.getElementById('drMeterDesc');
    var rowEl = document.getElementById('drMeterRow');
    var sayEl = document.getElementById('drMeterSay');
    var playBtn = document.getElementById('drMeterPlay');
    var tempoIn = document.getElementById('drMeterTempo');
    var tempoOut = document.getElementById('drMeterTempoOut');
    if (!picker || !rowEl || !playBtn || !tempoIn) return;

    var meter = METERS[0], tempo = +tempoIn.value;
    var cellEls = [], total = 4, playing = false, timer = 0, raf = 0;
    var anchorTime = 0, nextPulse = 0, pulseDur = 0.5, queue = [];
    var self = { stop: stop };
    allPlayers.push(self);

    function render() {
      sigEl.innerHTML = '<b>' + meter.top + '</b><b>' + meter.bottom + '</b>';
      descEl.textContent = meter.desc;
      rowEl.innerHTML = ''; cellEls = [];
      total = meterPulses(meter);
      var labels = [];
      for (var i = 0; i < total; i++) {
        var cell = document.createElement('span');
        var lab = meterLabel(meter, i);
        labels.push(lab);
        cell.className = 'dr-meter-cell' + (meterIsAccent(meter, i) ? ' is-accent' : '');
        cell.textContent = lab;
        rowEl.appendChild(cell);
        cellEls.push(cell);
      }
      sayEl.textContent = 'Say: ' + labels.join('  ');
    }

    function buildPicker() {
      picker.innerHTML = '';
      METERS.forEach(function (m, i) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'dr-pick'; b.textContent = m.label;
        b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
        b.addEventListener('click', function () {
          stop(); meter = m;
          Array.prototype.forEach.call(picker.children, function (btn, j) { btn.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
          render();
        });
        picker.appendChild(b);
      });
    }

    function tick() {
      var horizon = ctx.currentTime + 0.14;
      while (anchorTime + nextPulse * pulseDur < horizon) {
        var t = anchorTime + nextPulse * pulseDur, idx = nextPulse % total;
        click(t, idx === 0 ? 'strong' : (meterIsAccent(meter, idx) ? 'mid' : 'weak'));
        queue.push({ t: t, idx: idx });
        nextPulse++;
      }
    }
    function frame() {
      if (!playing) return;
      while (queue.length && queue[0].t <= ctx.currentTime) {
        var q = queue.shift();
        cellEls.forEach(function (c, i) { c.classList.toggle('is-now', i === q.idx); });
      }
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (!ensureAudio()) return;
      if (activePlayer && activePlayer !== self) activePlayer.stop();
      activePlayer = self;
      playing = true;
      var mainBeatDur = 60 / tempo;
      pulseDur = meter.type === 'compound' ? mainBeatDur / 3 : mainBeatDur;
      anchorTime = ctx.currentTime + 0.08;
      nextPulse = 0; queue = [];
      playBtn.innerHTML = '<span aria-hidden="true">■</span> Stop';
      playBtn.setAttribute('aria-pressed', 'true');
      tick(); timer = setInterval(tick, 25); raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (!playing) return;
      playing = false;
      clearInterval(timer); cancelAnimationFrame(raf);
      cellEls.forEach(function (c) { c.classList.remove('is-now'); });
      playBtn.innerHTML = '<span aria-hidden="true">▶</span> Play';
      playBtn.setAttribute('aria-pressed', 'false');
      if (activePlayer === self) activePlayer = null;
    }

    playBtn.addEventListener('click', function () { if (playing) stop(); else start(); });
    tempoIn.addEventListener('input', function () {
      tempo = +tempoIn.value; tempoOut.textContent = tempo + ' BPM';
      if (playing) { var mainBeatDur = 60 / tempo; pulseDur = meter.type === 'compound' ? mainBeatDur / 3 : mainBeatDur; }
    });
    tempoOut.textContent = tempo + ' BPM';
    buildPicker();
    render();
  }

  document.addEventListener('visibilitychange', function () { if (document.hidden) stopAll(); });
  window.addEventListener('pagehide', stopAll);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !e.target.closest('dialog, [role=dialog]')) stopAll(); });

  /* ---------------------------------------------------------- studio bar: stop all, volume, size */
  function initStudioBar() {
    var stopBtn = document.getElementById('drStopAll');
    var volIn = document.getElementById('drVolume');
    var sizeSel = document.getElementById('drNotationSize');
    if (stopBtn) stopBtn.addEventListener('click', stopAll);
    if (volIn) volIn.addEventListener('input', function () { volume = Number(volIn.value) / 100; });
    if (sizeSel) sizeSel.addEventListener('change', function () { document.body.classList.toggle('dr-large', sizeSel.value === 'large'); });
  }

  /* ---------------------------------------------------- practice list: pick patterns, print a sheet */
  var SET_LABEL = { beats: 'Beat', rudiments: 'Rudiment', fills: 'Fill' };
  var practiceList = [];
  try {
    var savedPractice = JSON.parse(localStorage.getItem('drPracticeList') || '[]');
    if (Array.isArray(savedPractice)) practiceList = savedPractice;
  } catch (e) { practiceList = []; }

  function savePracticeList() {
    try { localStorage.setItem('drPracticeList', JSON.stringify(practiceList)); } catch (e) { /* ignore */ }
  }

  function practiceItemKey(item) { return item.set + '|' + item.index; }

  function flashButton(btn, msg) {
    if (!btn) return;
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    btn.textContent = msg;
    clearTimeout(btn._flash);
    btn._flash = setTimeout(function () { btn.textContent = btn.dataset.label; }, 1600);
    var live = document.getElementById('drLiveStatus');
    if (live) live.textContent = msg;
  }

  function addPracticeItem(set, index, btn) {
    var item = { set: set, index: index };
    var key = practiceItemKey(item);
    var already = practiceList.some(function (p) { return practiceItemKey(p) === key; });
    if (!already) { practiceList.push(item); savePracticeList(); renderPracticeListUI(); }
    flashButton(btn, already ? 'Already in your list' : '✓ Added to practice list');
  }

  function removePracticeItem(i) { practiceList.splice(i, 1); savePracticeList(); renderPracticeListUI(); }

  function renderPracticeListUI() {
    var ui = document.getElementById('drPracticeListUI');
    if (!ui) return;
    ui.innerHTML = '';
    practiceList.forEach(function (item, index) {
      var pattern = SETS[item.set] && SETS[item.set][item.index];
      if (!pattern) return;
      var li = document.createElement('li');
      li.className = 'dr-practice-item';
      var info = document.createElement('div');
      info.className = 'dr-practice-item-info';
      info.innerHTML = '<span class="dr-practice-item-name">' + pattern.name + '</span><span class="dr-practice-item-sub">' + SET_LABEL[item.set] + ' · ' + (pattern.tempo || 100) + ' BPM</span>';
      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'dr-practice-remove';
      removeBtn.setAttribute('aria-label', 'Remove ' + pattern.name + ' from practice list');
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', function () { removePracticeItem(index); });
      li.appendChild(info); li.appendChild(removeBtn);
      ui.appendChild(li);
    });
    var clearBtn = document.getElementById('drClearPractice');
    var printBtn = document.getElementById('drPrintPractice');
    if (clearBtn) clearBtn.disabled = practiceList.length === 0;
    if (printBtn) printBtn.disabled = practiceList.length === 0;
    var emptyEl = document.getElementById('drPracticeEmpty');
    if (emptyEl) emptyEl.hidden = practiceList.length > 0;
    var tab = document.querySelector('.ll-tab[data-pane="pane-practice"]');
    if (tab) tab.textContent = 'Practice list' + (practiceList.length ? ' (' + practiceList.length + ')' : '');
  }

  /* Re-render each listed pattern's notation into the print-only sheet with
     the same renderStaff() used on the live page, so it always matches. */
  function buildPracticeSheet() {
    var sheet = document.getElementById('drPracticeSheetPrint');
    if (!sheet) return;
    sheet.innerHTML = '';
    var head = document.createElement('div');
    head.className = 'dr-sheet-head';
    head.innerHTML = '<h1>Drum practice sheet</h1><p>' + practiceList.length + ' item' + (practiceList.length === 1 ? '' : 's') + ' — from Drum Lab</p>';
    sheet.appendChild(head);
    var grid = document.createElement('div');
    grid.className = 'dr-sheet-grid';
    practiceList.forEach(function (item) {
      var pattern = SETS[item.set] && SETS[item.set][item.index];
      if (!pattern) return;
      var cell = document.createElement('div');
      cell.className = 'dr-sheet-item';
      var titleEl = document.createElement('h3');
      titleEl.textContent = SET_LABEL[item.set] + ': ' + pattern.name;
      var descEl = document.createElement('p');
      descEl.textContent = pattern.desc || '';
      var tempoEl = document.createElement('p');
      tempoEl.textContent = 'Tempo: ' + (pattern.tempo || 100) + ' BPM' + (pattern.sticking ? ' · sticking shown under the notes' : '');
      cell.appendChild(titleEl); cell.appendChild(descEl); cell.appendChild(tempoEl);
      var boardHost = document.createElement('div');
      var view = renderStaff(pattern);
      boardHost.appendChild(view.svg);
      cell.appendChild(boardHost);
      grid.appendChild(cell);
    });
    sheet.appendChild(grid);
  }

  function initPractice() {
    var clearBtn = document.getElementById('drClearPractice');
    var printBtn = document.getElementById('drPrintPractice');
    if (clearBtn) clearBtn.addEventListener('click', function () { practiceList = []; savePracticeList(); renderPracticeListUI(); });
    if (printBtn) printBtn.addEventListener('click', function () {
      if (!practiceList.length) return;
      buildPracticeSheet();
      document.body.classList.add('dr-printing-practice');
      window.print();
    });
    window.addEventListener('afterprint', function () { document.body.classList.remove('dr-printing-practice'); });
    renderPracticeListUI();
  }

  /* ---------------------------------------------------------- kit explorer */
  var KIT_INFO = {
    kick: { name: 'Bass drum (kick)', size: '18–24 inch shell, played with a foot pedal',
      sound: 'The lowest sound in the kit: a deep thud you feel in your chest.',
      job: 'Marks the pulse, usually on beats 1 and 3, and locks in with the bass guitar.',
      notation: 'Bottom space of the staff (F), stem down.',
      variants: [{ label: 'Hit', inst: 'kick', vel: 0.9 }] },
    snare: { name: 'Snare drum', size: '14-inch wide, 5.5-inch deep, with wires stretched across the bottom head',
      sound: 'A sharp crack. The metal snare wires buzz against the bottom head.',
      job: 'The backbeat: it usually plays on beats 2 and 4. It is also the main drum for rudiments and rolls.',
      notation: 'Middle (third) space of the staff (C).',
      variants: [{ label: 'Normal', inst: 'snare', vel: 0.85 }, { label: 'Ghost note', inst: 'snare', vel: 0.3 }, { label: 'Rim click', inst: 'rim', vel: 0.8 }] },
    hat: { name: 'Hi-hat', size: 'Two 13–14 inch cymbals on a stand, opened and closed with a left foot pedal',
      sound: 'Closed: a tight “tick”. Open: a long sizzling wash. Foot down = closed.',
      job: 'Keeps steady time, usually in eighth or sixteenth notes. Opening it gives accents and energy.',
      notation: 'An X above the top line. A small circle over the X means open.',
      variants: [{ label: 'Closed', inst: 'hat', vel: 0.8 }, { label: 'Open', inst: 'ohat', vel: 0.8 }] },
    tomHi: { name: 'High (rack) tom', size: '10–12 inch, mounted above the bass drum',
      sound: 'A short, punchy, medium-high “dun”.',
      job: 'Starts fills. Fills often travel from the smallest tom down to the largest.',
      notation: 'Top space of the staff (E).',
      variants: [{ label: 'Hit', inst: 'tomHi', vel: 0.9 }] },
    tomMid: { name: 'Mid tom', size: '12–14 inch, mounted next to the high tom',
      sound: 'A rounder, slightly lower tone than the high tom.',
      job: 'The middle step of a descending tom fill.',
      notation: 'Fourth line of the staff (D).',
      variants: [{ label: 'Hit', inst: 'tomMid', vel: 0.9 }] },
    tomLo: { name: 'Floor tom', size: '14–18 inch, on its own three legs',
      sound: 'The lowest tom: a deep boom that rings longer than the smaller toms.',
      job: 'Ends a fill or adds weight to a chorus.',
      notation: 'Second space of the staff (A).',
      variants: [{ label: 'Hit', inst: 'tomLo', vel: 0.9 }] },
    crash: { name: 'Crash cymbal', size: '16–19 inch, thin and bright',
      sound: 'An explosive splash that fades slowly.',
      job: 'Accents big moments, like the first beat of a new section or the end of a fill.',
      notation: 'X on the first ledger line above the staff (A).',
      variants: [{ label: 'Crash', inst: 'crash', vel: 0.85 }] },
    ride: { name: 'Ride cymbal', size: '20–22 inch, thicker and heavier than a crash',
      sound: 'A clear “ping” with a soft shimmering wash. The raised center is the bell.',
      job: 'Keeps time in jazz, swing and quieter rock sections, as an alternative to the hi-hat.',
      notation: 'X on the top line of the staff (F).',
      variants: [{ label: 'Ping', inst: 'ride', vel: 0.8 }] }
  };

  function initKit() {
    var host = document.getElementById('drKit');
    var info = document.getElementById('drKitInfo');
    if (!host || !info) return;
    var parts = host.querySelectorAll('.kit-part');

    function showInfo(inst) {
      var d = KIT_INFO[inst];
      info.innerHTML = '';
      htmlEl('h3', null, d.name, info);
      var dl = htmlEl('dl', 'dr-facts', null, info);
      [['Size & how it’s played', d.size], ['What it sounds like', d.sound], ['Its job', d.job], ['Where it is written', d.notation]].forEach(function (r) {
        htmlEl('dt', null, r[0], dl); htmlEl('dd', null, r[1], dl);
      });
      var acts = htmlEl('div', 'dr-variants', null, info);
      d.variants.forEach(function (v) {
        var b = htmlEl('button', 'dr-mini', '▶ ' + v.label, acts);
        b.type = 'button';
        b.addEventListener('click', function () { hitNow(v.inst, v.vel); });
      });
    }
    function activate(part) {
      var inst = part.getAttribute('data-inst');
      Array.prototype.forEach.call(parts, function (p) { p.classList.remove('is-selected'); });
      part.classList.add('is-selected');
      var first = KIT_INFO[inst].variants[0];
      hitNow(first.inst, first.vel);
      showInfo(inst);
    }
    Array.prototype.forEach.call(parts, function (part) {
      part.addEventListener('click', function () { activate(part); });
      part.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(part); }
      });
    });
    showInfo('snare');
  }

  /* --------------------------------------------------- single-drum anatomy */
  var ANATOMY = {
    batter: { name: 'Batter head', text: 'The top head, the one you hit. Usually a stretched plastic film. Its tension sets most of the pitch and how long the drum rings.' },
    rim: { name: 'Rim (hoop)', text: 'A metal ring that clamps the head to the shell. Tightening the tension rods pulls the rim down and stretches the head.' },
    shell: { name: 'Shell', text: 'The wooden (or metal) cylinder. It shapes the drum’s tone, and its size sets the range: wide and deep = lower and bigger.' },
    lug: { name: 'Lug', text: 'A metal housing bolted to the shell that holds a tension rod. A snare drum has eight to ten of them.' },
    rod: { name: 'Tension rod', text: 'A screw that runs from the rim into the lug. Turn it a little at a time to raise or lower the pitch, working around the drum in a star pattern.' },
    edge: { name: 'Bearing edge', text: 'The precisely angled edge on top of the shell where the head touches. A clean edge gives the head an even contact and a clear tone.' },
    resonant: { name: 'Resonant head', text: 'The bottom head. It vibrates in sympathy with the batter head, so together they make one pitch and shape the sustain.' },
    wires: { name: 'Snare wires', text: 'A bundle of thin metal strands stretched across the resonant head. They buzz against it whenever the drum is hit: that’s the snare’s sizzle.' },
    vent: { name: 'Vent hole', text: 'A small hole in the shell. It lets air escape when the head moves so the drum can speak freely instead of choking.' }
  };

  function initAnatomy() {
    var svg = document.getElementById('drAnatomy'), list = document.getElementById('drAnatomyList'), out = document.getElementById('drAnatomyText');
    if (!svg || !list || !out) return;
    var parts = svg.querySelectorAll('[data-part]');
    function select(key) {
      Array.prototype.forEach.call(parts, function (p) { p.classList.toggle('is-selected', p.getAttribute('data-part') === key); });
      Array.prototype.forEach.call(list.children, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-part') === key ? 'true' : 'false'); });
      out.innerHTML = '';
      htmlEl('strong', null, ANATOMY[key].name, out);
      out.appendChild(document.createTextNode(' — ' + ANATOMY[key].text));
    }
    Object.keys(ANATOMY).forEach(function (key, i) {
      var b = htmlEl('button', 'dr-part-btn', (i + 1) + '. ' + ANATOMY[key].name, list);
      b.type = 'button'; b.setAttribute('data-part', key); b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { select(key); });
    });
    Array.prototype.forEach.call(parts, function (p) {
      p.addEventListener('click', function () { select(p.getAttribute('data-part')); });
    });
    var keys = Object.keys(ANATOMY);
    Array.prototype.forEach.call(svg.querySelectorAll('.dr-badges > g'), function (b, i) {
      b.setAttribute('tabindex', '0'); b.setAttribute('role', 'button');
      b.setAttribute('aria-label', ANATOMY[keys[i]].name);
      b.addEventListener('click', function () { select(keys[i]); });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(keys[i]); } });
    });
    select('batter');
  }

  /* --------------------------------------------------------------- tuning */
  function initTuning() {
    var slider = document.getElementById('drTuneRange'), out = document.getElementById('drTuneOut'), btn = document.getElementById('drTuneHit');
    if (!slider || !out || !btn) return;
    var NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
    function label() {
      var hz = +slider.value, midi = Math.round(69 + 12 * Math.log(hz / 440) / Math.LN2);
      out.textContent = hz + ' Hz · about ' + NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
    }
    slider.addEventListener('input', label);
    btn.addEventListener('click', function () { hitNow('tomMid', 0.95, { pitch: +slider.value }); });
    slider.addEventListener('change', function () { hitNow('tomMid', 0.95, { pitch: +slider.value }); });
    label();
  }

  /* ------------------------------------------------ notation key + flashcards */
  function drawMiniStaff(svg, width, top) {
    for (var l = 0; l < 5; l++) svgEl('line', { x1: 8, x2: width - 8, y1: top + l * SP, y2: top + l * SP, stroke: INK, 'stroke-width': 1.1 }, svg);
    svgEl('rect', { x: 18, y: top + 12, width: 5, height: 24, fill: INK }, svg);
    svgEl('rect', { x: 29, y: top + 12, width: 5, height: 24, fill: INK }, svg);
  }

  function initKey() {
    var host = document.getElementById('drKey');
    if (!host) return;
    var order = ['crash', 'ride', 'hat', 'ohat', 'tomHi', 'tomMid', 'snare', 'tomLo', 'kick'];
    var colW = 104, width = 60 + order.length * colW, top = 96, yb = top + 48;
    var svg = svgEl('svg', { viewBox: '0 0 ' + width + ' 236', 'class': 'dr-staff dr-key', role: 'group', 'aria-label': 'Where each drum is written on the staff. Click one to hear it.' }, host);
    drawMiniStaff(svg, width, top);
    order.forEach(function (inst, i) {
      var x = 76 + i * colW, y = yb - INST[inst].step * (SP / 2);
      var g = svgEl('g', { 'class': 'dr-key-item', tabindex: 0, role: 'button', 'aria-label': INST[inst].label + ', click to hear' }, svg);
      svgEl('rect', { x: x - 42, y: 4, width: 84, height: 228, fill: 'transparent' }, g);
      if (INST[inst].step >= 10) svgEl('line', { x1: x - 10, x2: x + 10, y1: y, y2: y, stroke: INK, 'stroke-width': 1.3 }, g);
      drawHead(g, x, y, inst, 1);
      var kickDown = INST[inst].voice === 2;
      svgEl('line', { x1: kickDown ? x - 5.9 : x + 5.9, x2: kickDown ? x - 5.9 : x + 5.9, y1: y, y2: kickDown ? y + 32 : y - 32, stroke: INK, 'stroke-width': 1.6 }, g);
      var lines = INST[inst].label.replace(' (', '|(').split('|');
      var name = svgEl('text', { x: x, y: 24, 'font-size': 12.5, 'font-weight': 700, 'text-anchor': 'middle', fill: INK }, g);
      name.textContent = lines[0];
      if (lines[1]) { var n2 = svgEl('text', { x: x, y: 40, 'font-size': 12, 'text-anchor': 'middle', fill: '#5b4b3d' }, g); n2.textContent = lines[1]; }
      var pitchNames = { crash: 'ledger line A', ride: 'top line F', hat: 'above staff', ohat: 'above staff', tomHi: 'top space', tomMid: '4th line', snare: '3rd space', tomLo: '2nd space', kick: '1st space' };
      var t2 = svgEl('text', { x: x, y: 222, 'font-size': 11.5, 'text-anchor': 'middle', fill: '#5b4b3d' }, g);
      t2.textContent = pitchNames[inst];
      function go() { hitNow(inst, 0.85); g.classList.add('is-hit'); setTimeout(function () { g.classList.remove('is-hit'); }, 200); }
      g.addEventListener('click', go);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  function initFlashcards() {
    var host = document.getElementById('drCard'), choices = document.getElementById('drCardChoices'), fb = document.getElementById('drCardFeedback');
    var scoreEl = document.getElementById('drCardScore'), nextBtn = document.getElementById('drCardNext');
    if (!host || !choices || !fb) return;
    var pool = ['crash', 'ride', 'hat', 'tomHi', 'tomMid', 'snare', 'tomLo', 'kick'];
    var cur = null, answered = false, right = 0, total = 0;
    function draw() {
      host.innerHTML = '';
      var svg = svgEl('svg', { viewBox: '0 0 300 230', 'class': 'dr-staff dr-card-staff', role: 'img', 'aria-label': 'A single drum note on the staff. Which drum is it?' }, host);
      var top = 82, yb = top + 48;
      drawMiniStaff(svg, 300, top);
      var y = yb - INST[cur].step * (SP / 2);
      if (INST[cur].step >= 10) svgEl('line', { x1: 150 - 10, x2: 150 + 10, y1: y, y2: y, stroke: INK, 'stroke-width': 1.3 }, svg);
      var g = svgEl('g', {}, svg); drawHead(g, 150, y, cur, 1);
      var down = INST[cur].voice === 2;
      svgEl('line', { x1: down ? 144.1 : 155.9, x2: down ? 144.1 : 155.9, y1: y, y2: down ? y + 32 : y - 32, stroke: INK, 'stroke-width': 1.6 }, svg);
    }
    function pick() {
      var next; do { next = pool[Math.floor(Math.random() * pool.length)]; } while (next === cur);
      cur = next; answered = false; fb.textContent = 'Which drum is written here?'; fb.className = 'dr-feedback';
      draw();
      Array.prototype.forEach.call(choices.children, function (b) { b.disabled = false; b.className = 'dr-choice'; });
    }
    pool.forEach(function (inst) {
      var b = htmlEl('button', 'dr-choice', INST[inst].short, choices); b.type = 'button'; b.setAttribute('data-inst', inst);
      b.addEventListener('click', function () {
        if (answered) return;
        answered = true; total++;
        var ok = inst === cur;
        if (ok) right++;
        b.classList.add(ok ? 'is-right' : 'is-wrong');
        Array.prototype.forEach.call(choices.children, function (c) { if (c.getAttribute('data-inst') === cur) c.classList.add('is-right'); c.disabled = true; });
        fb.textContent = ok ? 'Correct! That is the ' + INST[cur].label.toLowerCase() + '.' : 'Not quite. That note is the ' + INST[cur].label.toLowerCase() + '.';
        fb.className = 'dr-feedback ' + (ok ? 'is-right' : 'is-wrong');
        scoreEl.textContent = right + ' / ' + total + ' correct';
        hitNow(cur, 0.85);
      });
    });
    nextBtn.addEventListener('click', pick);
    pick();
  }

  /* ---------------------------------------------------------------- quiz */
  function initQuiz() {
    var btn = document.getElementById('drCheckQuiz'), out = document.getElementById('drQuizResult'), box = document.getElementById('drQuiz');
    if (!btn || !out || !box) return;
    btn.addEventListener('click', function () {
      var sets = box.querySelectorAll('fieldset'), score = 0, unanswered = 0;
      Array.prototype.forEach.call(sets, function (fs) {
        var sel = fs.querySelector('input:checked');
        fs.classList.remove('is-right', 'is-wrong');
        if (!sel) { unanswered++; return; }
        if (sel.value === 'correct') { score++; fs.classList.add('is-right'); } else fs.classList.add('is-wrong');
      });
      out.textContent = unanswered ? 'Answer every question first (' + unanswered + ' left).' :
        'You got ' + score + ' of ' + sets.length + '. ' + (score === sets.length ? 'Great listening and reading!' : 'Review the sections above and try again.');
    });
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    document.querySelectorAll('.dr-player').forEach(function (root) {
      var name = root.getAttribute('data-set');
      if (name === 'builder') {
        var start = SETS.beats[0];
        createPlayer(root, { editable: true, patterns: [{
          name: 'Your groove', desc: 'Build a one-bar groove in 16 steps. Hear it, and watch the notation write itself.',
          tempo: 100,
          tracks: { hat: start.tracks.hat, snare: start.tracks.snare, kick: start.tracks.kick }
        }] });
      } else if (SETS[name]) {
        createPlayer(root, { patterns: SETS[name], setKey: name !== 'values' ? name : null });
      }
    });
    initKit(); initAnatomy(); initTuning(); initKey(); initFlashcards(); initQuiz(); initMeterTrainer(); initStudioBar(); initPractice();
  }

  window.DrumLab = { renderStaff: renderStaff, SETS: SETS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
