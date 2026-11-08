/* Live Sound Reinforcement lesson (live-sound-reinforcement.html): wires the labs to LiveSound.
 * The maths lives in live-sound.js (no DOM, tested); this file only reads controls and draws. */
(function () {
  'use strict';
  var L = window.LiveSound;
  if (!L) return;

  var SVGNS = 'http://www.w3.org/2000/svg';
  function $(id) { return document.getElementById(id); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function num(id) { return parseFloat($(id).value); }
  function fmt(x, places) { return x.toFixed(places == null ? 1 : places); }
  function db(x, places) { return (x >= 0 ? '+' : '−') + fmt(Math.abs(x), places) + ' dB'; }
  function hz(f) { return f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 0 : 2).replace(/\.?0+$/, '') + ' kHz' : Math.round(f) + ' Hz'; }
  function metres(m) { return m < 1 ? Math.round(m * 100) + ' cm' : fmt(m, m < 10 ? 1 : 0) + ' m'; }
  function el(tag, attrs, text) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function setReadout(node, html, tone) {
    node.innerHTML = html;
    node.classList.remove('good', 'warn', 'bad');
    if (tone) node.classList.add(tone);
  }
  // Segmented buttons: [data-key] groups with aria-pressed.
  function segmented(attr, onChange) {
    var buttons = all('[' + attr + ']');
    var value = (buttons.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || buttons[0]).getAttribute(attr);
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        value = b.getAttribute(attr);
        buttons.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        onChange();
      });
    });
    return function () { return value; };
  }
  function onInput(ids, fn) {
    ids.forEach(function (id) {
      var n = $(id);
      if (!n) return;
      n.addEventListener('input', fn);
      n.addEventListener('change', fn);
    });
  }

  /* ── 1. Add the sources ──────────────────────────────────────────────────── */
  (function sources() {
    if (!$('ds-count')) return;
    var mode = segmented('data-ds-mode', render);
    function render() {
      var n = num('ds-count'), lvl = num('ds-level'), m = mode();
      $('ds-count-out').textContent = n;
      $('ds-level-out').textContent = lvl + ' dB SPL';
      var levels = [];
      for (var i = 0; i < n; i++) levels.push(lvl);
      var total, why, tone = null;
      if (m === 'uncorrelated') {
        total = L.addSources(levels, 'uncorrelated');
        why = 'Different sources add as <strong>power</strong>: every doubling of the sources is +3 dB. Eight singers are only 9 dB louder than one.';
      } else if (m === 'coherent') {
        total = L.addSources(levels, 'coherent');
        why = 'The same signal, arriving in step, adds as <strong>pressure</strong>: every doubling is +6 dB. That only happens where the arrivals line up; move a little and they drift out of phase (the comb filtering in the <a href="microphone-polar-patterns.html#three-to-one">3:1 rule</a>).';
      } else {
        var flipped = Math.floor(n / 2), kept = n - flipped;
        total = kept === flipped ? -Infinity : L.addSources(levels.slice(0, kept - flipped), 'coherent');
        why = 'Each flipped copy cancels an un-flipped one exactly. ' + (n % 2 === 0
          ? 'With an even number, <strong>nothing is left</strong>: in a real room, the bass vanishes and the rest goes thin. This is what one mis-wired cable (pins 2 and 3 swapped) does, and why the line check includes polarity.'
          : 'With an odd number, one copy is left over.');
        if (n % 2 === 0) tone = 'bad';
      }
      var gain = total - lvl;
      $('ds-total').textContent = isFinite(total) ? fmt(total) + ' dB SPL' : 'silence';
      $('ds-gain').textContent = isFinite(total) ? db(gain) : '−∞ dB';
      $('ds-loud').textContent = isFinite(total) ? '×' + fmt(Math.pow(2, gain / 10), 2) + ' as loud' : 'nothing';
      setReadout($('ds-readout'), why, tone || (n > 1 ? 'good' : null));
    }
    onInput(['ds-count', 'ds-level'], render);
    render();
  }());

  /* ── 2. Cover the audience ───────────────────────────────────────────────── */
  (function coverageLab() {
    var svg = $('cov-svg');
    if (!svg) return;
    var WATTS = [10, 25, 50, 100, 250, 500, 1000, 2000];
    var FRONT = 2; // first row, metres from the speaker (horizontally)
    var ROWS = 7;
    var source = segmented('data-cov-source', render);

    function render() {
      var sens = num('cov-sens'), watts = WATTS[num('cov-watts')], h = num('cov-height'), back = num('cov-back');
      $('cov-sens-out').textContent = sens + ' dB';
      $('cov-watts-out').textContent = watts.toLocaleString() + ' W';
      $('cov-height-out').textContent = metres(h);
      $('cov-back-out').textContent = back + ' m';
      var src = source();

      var rows = [];
      for (var i = 0; i < ROWS; i++) {
        var x = FRONT + (back - FRONT) * i / (ROWS - 1);
        var d = Math.sqrt(h * h + x * x);
        rows.push({ x: x, d: d, spl: L.spl({ sensitivity: sens, watts: watts, distance: d, source: src }) });
      }
      var front = rows[0].spl, last = rows[ROWS - 1].spl, spread = front - last;
      var mean = rows.reduce(function (s, r) { return s + r.spl; }, 0) / ROWS;

      // Drawing: horizontal scale fits the room; vertical is 20 px per metre (not to scale).
      clear(svg);
      var x0 = 46, x1 = 620, earY = 200, vs = 18;
      var hs = (x1 - x0) / (back + 1);
      svg.appendChild(el('line', { x1: 10, y1: earY + 22, x2: 632, y2: earY + 22, class: 'cov-floor' }));
      svg.appendChild(el('line', { x1: 10, y1: earY, x2: 632, y2: earY, class: 'cov-ear' }));
      svg.appendChild(el('text', { x: 14, y: earY + 36, class: 'cov-note' }, 'ears'));
      var sy = earY - h * vs;
      svg.appendChild(el('line', { x1: x0 - 14, y1: sy + 14, x2: x0 - 14, y2: earY + 22, class: 'cov-stand' }));
      rows.forEach(function (r, i) {
        var rx = x0 + r.x * hs;
        if (i === 0 || i === ROWS - 1) svg.appendChild(el('line', { x1: x0, y1: sy, x2: rx, y2: earY, class: 'cov-ray' }));
      });
      svg.appendChild(el('rect', { x: x0 - 22, y: sy - 16, width: 22, height: 32, rx: 3, class: 'cov-box' }));
      svg.appendChild(el('circle', { cx: x0 - 8, cy: sy + 6, r: 6, class: 'cov-cone' }));
      rows.forEach(function (r) {
        var rx = x0 + r.x * hs;
        var dev = Math.abs(r.spl - mean);
        var cls = dev <= 3 ? 'ok' : (dev <= 6 ? 'meh' : 'bad');
        svg.appendChild(el('line', { x1: rx, y1: earY + 6, x2: rx, y2: earY + 22, class: 'cov-body ' + cls }));
        svg.appendChild(el('circle', { cx: rx, cy: earY, r: 7, class: 'cov-head ' + cls }));
        svg.appendChild(el('text', { x: rx, y: earY - 16, class: 'cov-spl', 'text-anchor': 'middle' }, Math.round(r.spl)));
        svg.appendChild(el('text', { x: rx, y: earY + 36, class: 'cov-note', 'text-anchor': 'middle' }, Math.round(r.x) + ' m'));
      });
      svg.appendChild(el('text', { x: 14, y: 18, class: 'cov-note' }, 'dB SPL at each row · height not to scale'));

      $('cov-front').textContent = fmt(front, 0) + ' dB';
      $('cov-backspl').textContent = fmt(last, 0) + ' dB';
      $('cov-spread').textContent = fmt(spread, 1) + ' dB';
      var msgs = [], tone = 'good';
      if (spread > 6) {
        msgs.push('The front row is <strong>' + fmt(spread, 1) + ' dB</strong> louder than the back: too loud up front or too quiet at the back. Raise the speaker (the front row\'s distance grows a lot, the back row\'s hardly at all)' + (src === 'point' ? ', or try a line array.' : ', or add a delay speaker halfway back.'));
        tone = 'warn';
      } else {
        msgs.push('Every row is within ' + fmt(spread, 1) + ' dB of the front. That\'s even coverage.');
      }
      if (last < 85) { msgs.push('The back row only gets <strong>' + fmt(last, 0) + ' dB</strong>, quiet even for speech (aim for 85). More watts helps slowly: 10× the power is only +10 dB.'); tone = 'bad'; }
      else if (last < 95) msgs.push('Back row ' + fmt(last, 0) + ' dB: enough for speech, short of a band (95–100).');
      else msgs.push('Back row ' + fmt(last, 0) + ' dB: enough for a band.');
      if (front > 110) { msgs.push('But the front row is at <strong>' + fmt(front, 0) + ' dB</strong>: past safe-listening levels within minutes.'); tone = 'bad'; }
      setReadout($('cov-readout'), msgs.join(' '), tone);
    }
    onInput(['cov-sens', 'cov-watts', 'cov-height', 'cov-back'], render);
    render();
  }());

  /* ── 3. PAG / NAG ────────────────────────────────────────────────────────── */
  (function pagLab() {
    if (!$('pag-ds')) return;
    var polar = $('pag-polar');
    function render() {
      var o = { ds: num('pag-ds'), d1: num('pag-d1'), d0: num('pag-d0'), d2: num('pag-d2'), ead: num('pag-ead'), nom: num('pag-nom') };
      var pattern = $('pag-pattern').value, angle = num('pag-angle');
      ['ds', 'd1', 'd0', 'd2', 'ead'].forEach(function (k) { $('pag-' + k + '-out').textContent = metres(o[k]); });
      $('pag-nom-out').textContent = o.nom;
      $('pag-angle-out').textContent = angle + '°';
      o.rejection = L.rejectionDb(pattern, angle);
      var r = L.gainBeforeFeedback(o);

      $('pag-pag').textContent = db(r.pag);
      $('pag-nag').textContent = db(r.nag);
      $('pag-margin').textContent = db(r.margin);
      var scale = function (v) { return Math.max(0, Math.min(100, (v + 10) / 50 * 100)); };
      $('pag-bar-pag').style.width = scale(r.pag) + '%';
      $('pag-bar-nag').style.left = scale(r.nag) + '%';

      var tips = [];
      if (o.ds > 0.15) tips.push('move the mic closer (half the distance = +6 dB)');
      if (o.nom > 1) tips.push('mute unused mics (' + o.nom + ' open costs ' + fmt(L.dbPower(o.nom), 1) + ' dB)');
      if (pattern !== 'omni' && Math.abs(angle - (L.patternNull(pattern) || 180)) > 20) tips.push('aim the mic so the speaker sits in its null (' + Math.round(L.patternNull(pattern)) + '°)');
      if (o.d1 < 3) tips.push('move the speaker farther from the mic (or in front of it)');
      var rej = o.rejection > 0 ? ' The ' + L.PATTERNS[pattern].label.toLowerCase() + ' mic is rejecting the speaker by ' + fmt(o.rejection, 1) + ' dB.' : '';
      if (r.works) setReadout($('pag-readout'), '<strong>The show works</strong>, with ' + fmt(r.margin, 1) + ' dB to spare: the farthest listener can hear the talker as if they were ' + metres(o.ead) + ' away without feedback.' + rej, 'good');
      else setReadout($('pag-readout'), '<strong>Not enough gain.</strong> Turn the PA up far enough for the back row and it will feed back first, ' + fmt(-r.margin, 1) + ' dB short.' + rej + (tips.length ? ' Try: ' + tips.join('; ') + '.' : ' Accept a larger EAD (the listener hears the talker as farther away), or move the listener closer with a fill speaker.'), 'bad');

      // Polar plot
      clear(polar);
      [1, 0.5, 0.25].forEach(function (rr) { polar.appendChild(el('circle', { cx: 0, cy: 0, r: 90 * rr, class: 'pp-ring' })); });
      polar.appendChild(el('line', { x1: 0, y1: -98, x2: 0, y2: 98, class: 'pp-ring' }));
      polar.appendChild(el('line', { x1: -98, y1: 0, x2: 98, y2: 0, class: 'pp-ring' }));
      var pts = [];
      for (var a = 0; a <= 360; a += 3) {
        var g = L.patternGain(pattern, a) * 90, t = a * Math.PI / 180;
        pts.push((Math.sin(t) * g).toFixed(1) + ',' + (-Math.cos(t) * g).toFixed(1));
      }
      polar.appendChild(el('polygon', { points: pts.join(' '), class: 'pp-shape' }));
      var nul = L.patternNull(pattern);
      if (nul != null) [nul, -nul].forEach(function (n) {
        var t = n * Math.PI / 180;
        polar.appendChild(el('line', { x1: 0, y1: 0, x2: Math.sin(t) * 100, y2: -Math.cos(t) * 100, class: 'pp-null' }));
      });
      polar.appendChild(el('circle', { cx: 0, cy: -100, r: 6, class: 'pp-singer' }));
      var st = angle * Math.PI / 180;
      polar.appendChild(el('circle', { cx: Math.sin(st) * 96, cy: -Math.cos(st) * 96, r: 7, class: 'pp-spk' }));
    }
    onInput(['pag-ds', 'pag-d1', 'pag-d0', 'pag-d2', 'pag-ead', 'pag-nom', 'pag-pattern', 'pag-angle'], render);
    render();
  }());

  /* ── 4. Ring out ─────────────────────────────────────────────────────────── */
  (function ringLab() {
    var canvas = $('ring-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var PAD = { l: 52, r: 14, t: 16, b: 34 };
    var DB_MIN = -42, DB_MAX = 12;
    var seed = 7;
    var room = L.createRoom(seed);
    var cuts = {}, history = [];
    var startGain = L.maxStableGain(room, {});
    var ear = false;

    var geq = $('ring-geq');
    var bandButtons = L.GEQ_BANDS.map(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ls-band';
      btn.dataset.band = b;
      btn.innerHTML = '<i></i><span>' + (b >= 1000 ? (b / 1000) + 'k' : b) + '</span>';
      btn.addEventListener('click', function () {
        var cur = cuts[b] || 0;
        if (cur >= 12) return;
        history.push(b);
        cuts[b] = cur + 3;
        render();
      });
      geq.appendChild(btn);
      return btn;
    });

    function fx(f) { return PAD.l + (Math.log(f / 20) / Math.log(1000)) * (W - PAD.l - PAD.r); }
    function fy(d) { return PAD.t + (DB_MAX - d) / (DB_MAX - DB_MIN) * (H - PAD.t - PAD.b); }

    function draw(master) {
      ctx.clearRect(0, 0, W, H);
      ctx.font = '600 13px system-ui, sans-serif';
      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.fillStyle = 'rgba(220,226,234,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].forEach(function (f) {
        var x = fx(f); ctx.moveTo(x, PAD.t); ctx.lineTo(x, H - PAD.b);
      });
      for (var d = -40; d <= 10; d += 10) { var y = fy(d); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); }
      ctx.stroke();
      ctx.textAlign = 'center';
      [[31.5, '31'], [63, '63'], [125, '125'], [250, '250'], [500, '500'], [1000, '1k'], [2000, '2k'], [4000, '4k'], [8000, '8k'], [16000, '16k']].forEach(function (p) { ctx.fillText(p[1], fx(p[0]), H - 12); });
      ctx.textAlign = 'right';
      for (d = -40; d <= 10; d += 10) ctx.fillText((d > 0 ? '+' : '') + d, PAD.l - 8, fy(d) + 4);

      // The ring line
      ctx.strokeStyle = '#ff766c';
      ctx.setLineDash([7, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(PAD.l, fy(0)); ctx.lineTo(W - PAD.r, fy(0)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff766c';
      ctx.textAlign = 'left';
      ctx.fillText('0 dB loop gain: rings', PAD.l + 6, fy(0) - 7);

      // EQ curve (always shown)
      ctx.strokeStyle = '#66d28a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var f = 20; f <= 20000; f *= 1.02) {
        var yy = fy(-30 + L.eqGain(cuts, f));
        if (f === 20) ctx.moveTo(fx(f), yy); else ctx.lineTo(fx(f), yy);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(102,210,138,0.85)';
      ctx.fillText('graphic EQ', fx(22), fy(-30) - 6);

      if (!ear) {
        // Loop gain curve, red where it is at or above 0 dB
        var prev = null;
        ctx.lineWidth = 2.6;
        for (f = 20; f <= 20000; f *= 1.01) {
          var g = L.loopGain(room, f) + L.eqGain(cuts, f) + master;
          var pt = [fx(f), fy(Math.max(DB_MIN, Math.min(DB_MAX, g)))];
          if (prev) {
            ctx.strokeStyle = g >= 0 ? '#ff766c' : '#59c8d8';
            ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(pt[0], pt[1]); ctx.stroke();
          }
          prev = pt;
        }
        ctx.fillStyle = '#59c8d8';
        ctx.fillText('loop gain (mic → PA → room → mic)', fx(22), fy(DB_MAX) + 14);
      } else {
        ctx.fillStyle = 'rgba(220,226,234,0.75)';
        ctx.textAlign = 'center';
        ctx.fillText('Curve hidden: find the ring by ear, then press its band.', W / 2, fy(-12));
      }
    }

    /* Sound: one sine at the ringing frequency, swelling with how far over 0 dB the loop is. */
    var audio = null;
    function sound(on) {
      if (on && !audio) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        var ac = new AC();
        var osc = ac.createOscillator(), gain = ac.createGain();
        osc.type = 'sine';
        gain.gain.value = 0;
        osc.connect(gain).connect(ac.destination);
        osc.start();
        audio = { ac: ac, osc: osc, gain: gain };
      } else if (!on && audio) {
        audio.gain.gain.setTargetAtTime(0, audio.ac.currentTime, 0.05);
        var a = audio; audio = null;
        setTimeout(function () { try { a.osc.stop(); a.ac.close(); } catch (e) { /* already closed */ } }, 300);
      }
    }
    function updateSound(rp) {
      if (!audio) return;
      var t = audio.ac.currentTime;
      audio.osc.frequency.setTargetAtTime(rp.freq, t, 0.02);
      var level = rp.rings ? Math.min(0.12, 0.03 + rp.loop * 0.02) : 0;
      audio.gain.gain.setTargetAtTime(level, t, rp.rings ? 0.25 : 0.06);
    }

    function render() {
      var master = num('ring-master');
      $('ring-master-out').textContent = db(master);
      var rp = L.ringPoint(room, cuts, master);
      var gbf = L.maxStableGain(room, cuts);
      var damage = L.eqDamage(cuts);
      draw(master);
      bandButtons.forEach(function (b) {
        var c = cuts[b.dataset.band] || 0;
        b.querySelector('i').style.height = (c / 12 * 100) + '%';
        b.classList.toggle('cut', c > 0);
        b.setAttribute('aria-label', b.dataset.band + ' hertz band' + (c ? ', cut ' + c + ' dB' : ''));
      });
      $('ring-banner').hidden = !rp.rings;
      $('ring-stage').classList.toggle('ringing', rp.rings);
      $('ring-at').textContent = rp.rings ? (ear ? 'listen…' : '≈ ' + hz(rp.freq)) : 'stable';
      $('ring-gbf').textContent = db(gbf);
      var earned = gbf - startGain;
      $('ring-earned').textContent = db(earned);
      $('ring-tone').textContent = damage.verdict === 'flat' ? 'untouched' : damage.verdict + ' (' + damage.bands + ' band' + (damage.bands === 1 ? '' : 's') + ')';
      var msg, tone;
      if (rp.rings) {
        msg = '<strong>Feedback!</strong> The loop is ' + db(rp.loop) + ' over at ' + (ear ? 'one frequency. Listen, then press the band you think it is.' : '≈ ' + hz(rp.freq) + '. Pull the master down a little, then cut the <strong>' + hz(rp.band) + '</strong> band.');
        tone = 'bad';
      } else if (!history.length) {
        msg = 'Raise the system gain slowly until the curve first touches the red line, the way an engineer rings out a real PA with the mics in place.';
        tone = null;
      } else if (damage.verdict === 'hollow') {
        msg = 'You have earned ' + db(earned) + ', but ' + damage.bands + ' cuts (deepest ' + damage.deepest + ' dB) have hollowed out the PA. Undo the cuts that bought little. Past this point, fix the geometry (section 3) instead.';
        tone = 'warn';
      } else {
        msg = 'Stable ' + fmt(-rp.loop, 1) + ' dB below ringing. Each correct cut buys gain until the next peak takes over; the next one waits near ' + (ear ? 'a frequency you\'ll hear' : hz(rp.freq)) + '. Earned so far: ' + db(earned) + '.' + (damage.bands >= 4 ? ' That\'s a good place to stop.' : '');
        tone = 'good';
      }
      setReadout($('ring-readout'), msg, tone);
      updateSound(rp);
    }

    onInput(['ring-master'], render);
    $('ring-undo').addEventListener('click', function () {
      var b = history.pop();
      if (b == null) return;
      cuts[b] -= 3;
      if (cuts[b] <= 0) delete cuts[b];
      render();
    });
    $('ring-flat').addEventListener('click', function () { cuts = {}; history = []; render(); });
    $('ring-new').addEventListener('click', function () {
      seed = (seed * 7 + 13) % 997;
      room = L.createRoom(seed);
      cuts = {}; history = [];
      startGain = L.maxStableGain(room, {});
      $('ring-master').value = 0;
      render();
    });
    var soundBtn = $('ring-sound');
    soundBtn.addEventListener('click', function () {
      var on = soundBtn.getAttribute('aria-pressed') !== 'true';
      soundBtn.setAttribute('aria-pressed', String(on));
      sound(on);
      render();
    });
    var earBtn = $('ring-ear');
    earBtn.addEventListener('click', function () {
      ear = earBtn.getAttribute('aria-pressed') !== 'true';
      earBtn.setAttribute('aria-pressed', String(ear));
      if (ear && soundBtn.getAttribute('aria-pressed') !== 'true') soundBtn.click();
      else render();
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden && audio) { soundBtn.setAttribute('aria-pressed', 'false'); sound(false); } });
    render();
  }());

  /* ── 5. Beaming ──────────────────────────────────────────────────────────── */
  (function beamLab() {
    var svg = $('beam-svg');
    if (!svg) return;
    function freq() { return 50 * Math.pow(16000 / 50, num('beam-freq')); }
    function render() {
      var d = parseFloat($('beam-size').value), f = freq();
      var dm = d * 0.0254, lambda = L.wavelength(f), limit = L.beamingFrequency(d), cov = L.pistonCoverage(d, f);
      $('beam-freq-out').textContent = hz(f);
      $('beam-lambda').textContent = lambda >= 1 ? fmt(lambda, 2) + ' m' : fmt(lambda * 100, 1) + ' cm';
      $('beam-limit').textContent = hz(limit);
      $('beam-cov').textContent = cov >= 180 ? 'wide (≈180°)' : Math.round(cov) + '°';

      clear(svg);
      // Same scale for the cone and the wavelength, fitted to the box.
      var maxLen = Math.max(dm, Math.min(lambda, dm * 6));
      var px = 130 / maxLen;
      var cx = 120, cy = 85;
      var hcone = dm * px;
      svg.appendChild(el('text', { x: 14, y: 18, class: 'cov-note' }, 'side view · cone and wavelength to the same scale'));
      // Coverage fan
      var half = Math.min(90, cov / 2) * Math.PI / 180, R = 300;
      svg.appendChild(el('path', { d: 'M' + cx + ',' + cy + ' L' + (cx + R * Math.cos(half)) + ',' + (cy - R * Math.sin(half)) + ' A' + R + ',' + R + ' 0 0 1 ' + (cx + R * Math.cos(half)) + ',' + (cy + R * Math.sin(half)) + ' Z', class: 'bm-fan' + (cov < 90 ? ' narrow' : '') }));
      svg.appendChild(el('rect', { x: cx - 8, y: cy - hcone / 2, width: 8, height: hcone, class: 'bm-cone' }));
      svg.appendChild(el('text', { x: cx - 14, y: cy + 4, class: 'cov-note', 'text-anchor': 'end' }, d + '″'));
      // Wavelength: one cycle of a sine, drawn vertically beside the cone
      var lpx = lambda * px, clipped = lpx > 150;
      var len = Math.min(lpx, 150), wx = 40;
      var path = '';
      for (var i = 0; i <= 60; i++) {
        var yy = cy - len / 2 + len * i / 60;
        var xx = wx + 12 * Math.sin(2 * Math.PI * (i / 60) * (clipped ? len / lpx : 1));
        path += (i ? 'L' : 'M') + xx.toFixed(1) + ',' + yy.toFixed(1);
      }
      svg.appendChild(el('path', { d: path, class: 'bm-wave' }));
      svg.appendChild(el('text', { x: wx, y: cy + len / 2 + 14, class: 'cov-note', 'text-anchor': 'middle' }, clipped ? 'λ (longer than shown)' : 'λ'));

      var ratio = lambda / dm;
      var msg = ratio >= 1
        ? 'The wavelength (' + $('beam-lambda').textContent + ') is longer than the ' + d + '-inch cone, so it spreads sound evenly across the front. Everyone hears this frequency.'
        : 'The wavelength is ' + fmt(1 / ratio, 1) + '× smaller than the cone, so it <strong>beams</strong>: about ' + Math.round(cov) + '° of coverage. Listeners outside that cone lose this frequency. Hand it to a smaller driver or a horn below ' + hz(limit) + '.';
      setReadout($('beam-readout'), msg, ratio >= 1 ? 'good' : (cov < 45 ? 'bad' : 'warn'));
    }
    onInput(['beam-size', 'beam-freq'], render);
    render();
  }());

  /* ── 6. Amplifier loads and cable ────────────────────────────────────────── */
  (function ampLab() {
    if (!$('amp-rated')) return;
    var wiring = segmented('data-amp-wiring', render);
    function render() {
      var rated = parseFloat($('amp-rated').value), minLoad = parseFloat($('amp-min').value);
      var n = num('amp-n'), z = parseFloat($('amp-z').value), bridged = $('amp-bridge').checked;
      var awg = parseInt($('amp-awg').value, 10), len = num('amp-len');
      $('amp-n-out').textContent = n;
      $('amp-len-out').textContent = len + ' m';
      var load = L.speakerLoad(n, z, wiring());
      var p = L.ampPower({ ratedWatts8: rated, load: load, minLoad: minLoad, bridged: bridged });
      var cable = L.cableLoss({ awg: awg, metres: len, load: load });
      var ohms = function (x) { return (Math.round(x * 10) / 10) + ' Ω'; };
      $('amp-load').textContent = ohms(load) + (bridged ? ' (' + ohms(p.perSideLoad) + ' per side)' : '');
      $('amp-watts').textContent = p.safe ? Math.round(p.watts).toLocaleString() + ' W' : 'unsafe';
      $('amp-loss').textContent = '−' + fmt(cable.lossDb, 1) + ' dB';
      $('amp-df').textContent = Math.round(cable.dampingAtSpeaker);

      var msgs = [], tone = 'good';
      if (!p.safe) {
        msgs.push('<strong>Too low a load.</strong> ' + (bridged ? 'Bridged, each side of the amp sees ' + ohms(p.perSideLoad) : 'The amp sees ' + ohms(load)) + ', below its ' + minLoad + ' Ω rating. It will run hot, distort, and its protection will shut it down mid-show (or it fails). Use another channel, fewer boxes, or ' + (bridged ? 'don\'t bridge.' : 'a 2 Ω-rated amp.'));
        tone = 'bad';
      } else {
        msgs.push('About <strong>' + Math.round(p.watts / n).toLocaleString() + ' W per cabinet</strong> at full output' + (bridged ? ' (bridged: twice the voltage, so ' + ohms(load) + ' gets four times one channel\'s power into it).' : '.'));
        if (wiring() === 'series' && n > 1) msgs.push('Series wiring raises the load, so less power; and if one box fails open, all of them go silent. It\'s rare in PA work.');
      }
      if (cable.lossDb > 1) {
        msgs.push('The cable loses ' + fmt(cable.lossDb, 1) + ' dB (' + Math.round(cable.powerLostPct) + '% of the power heats the wire) and drops the damping factor to ' + Math.round(cable.dampingAtSpeaker) + '. Use thicker cable, a shorter run, or put the amps near the speakers.');
        if (tone === 'good') tone = 'warn';
      } else msgs.push('The cable costs only ' + fmt(cable.lossDb, 2) + ' dB.');
      setReadout($('amp-readout'), msgs.join(' '), tone);
    }
    onInput(['amp-rated', 'amp-min', 'amp-n', 'amp-z', 'amp-bridge', 'amp-awg', 'amp-len'], render);
    render();
  }());

  /* ── 7. Delay speaker ────────────────────────────────────────────────────── */
  (function delayLab() {
    var svg = $('dly-svg');
    if (!svg) return;
    function render() {
      var dist = num('dly-dist'), temp = num('dly-temp'), haas = num('dly-haas');
      $('dly-dist-out').textContent = dist + ' m';
      $('dly-temp-out').textContent = temp + ' °C';
      $('dly-haas-out').textContent = haas + ' ms';
      var r = L.delaySpeaker({ distance: dist, tempC: temp, haasMs: haas });
      $('dly-c').textContent = fmt(r.speed, 1) + ' m/s';
      $('dly-travel').textContent = fmt(r.travelMs, 1) + ' ms';
      $('dly-set').textContent = fmt(r.delayMs, 1) + ' ms';

      clear(svg);
      var span = Math.max(r.delayMs + 40, 80);
      var x0 = 20, x1 = 620, y = 64;
      var tx = function (ms) { return x0 + ms / span * (x1 - x0); };
      svg.appendChild(el('rect', { x: tx(r.travelMs), y: y - 30, width: tx(r.travelMs + 30) - tx(r.travelMs), height: 46, class: 'dl-fuse' }));
      svg.appendChild(el('text', { x: tx(r.travelMs) + 4, y: y - 34, class: 'cov-note' }, 'first 30 ms after the mains: heard as one sound'));
      svg.appendChild(el('line', { x1: x0, y1: y, x2: x1, y2: y, class: 'dl-axis' }));
      [[0, 'signal leaves the desk', 'dl-desk'], [r.travelMs, 'mains arrive', 'dl-main'], [r.delayMs, 'delay speaker', 'dl-delay']].forEach(function (m, i) {
        var x = tx(m[0]);
        svg.appendChild(el('line', { x1: x, y1: y - 16, x2: x, y2: y + 16, class: m[2] }));
        svg.appendChild(el('text', { x: x, y: y + 32 + (i === 2 ? 14 : 0), class: 'cov-note', 'text-anchor': i === 0 ? 'start' : 'middle' }, m[1] + ' · ' + fmt(m[0], 0) + ' ms'));
      });

      var msg, tone;
      if (haas < 3) { msg = 'The delay speaker and the mains arrive together. The voice will seem to come from somewhere between them, and where they overlap they comb-filter. Add 5–15 ms so the mains lead.'; tone = 'warn'; }
      else if (haas <= 20) { msg = 'The mains arrive first, so everyone under the delay speaker hears the voice coming from the stage, with the delay speaker adding level and clarity. Then walk the room and fine-tune by ear.'; tone = 'good'; }
      else if (haas <= 30) { msg = 'Still fused with the mains for most listeners, but you\'re close to the edge. Bring it back toward 10 ms.'; tone = 'warn'; }
      else { msg = 'The delay speaker is now ' + haas + ' ms late: listeners hear it as a separate <strong>echo</strong>. Bring the offset back to about 10 ms.'; tone = 'bad'; }
      if (temp !== 20) msg += ' At ' + temp + ' °C sound travels ' + fmt(r.speed, 1) + ' m/s, so an outdoor delay set in the cool afternoon is ' + fmt(Math.abs(dist / r.speed - dist / L.speedOfSound(20)) * 1000, 1) + ' ms off from one set at 20 °C.';
      setReadout($('dly-readout'), msg, tone);
    }
    onInput(['dly-dist', 'dly-temp', 'dly-haas'], render);
    render();
  }());

  /* ── 8. Hearing exposure ─────────────────────────────────────────────────── */
  (function earLab() {
    if (!$('ear-db')) return;
    function render() {
      var lvl = num('ear-db');
      $('ear-db-out').textContent = lvl + ' dBA';
      var h = L.safeHours(lvl), mins = h * 60;
      var time = h >= 1 ? fmt(h, h >= 10 ? 0 : 1) + ' hours' : (mins >= 1 ? Math.round(mins) + ' minutes' : Math.round(mins * 60) + ' seconds');
      var like = lvl < 88 ? 'a busy restaurant or a loud classroom' : lvl < 94 ? 'a school band rehearsal' : lvl < 100 ? 'a loud musical or church band at FOH' : lvl < 106 ? 'a rock concert' : 'right in front of the subwoofers';
      setReadout($('ear-readout'), '<strong>' + lvl + ' dBA</strong> (about ' + like + '): safe for <strong>' + time + '</strong> a day without hearing protection. A two-hour show ' + (h >= 2 ? 'is within the limit.' : 'is <strong>' + fmt(2 / h, 1) + '×</strong> the daily dose: wear earplugs.'), h >= 2 ? 'good' : (h >= 0.5 ? 'warn' : 'bad'));
    }
    onInput(['ear-db'], render);
    render();
  }());

  /* ── 9. Show-day order ───────────────────────────────────────────────────── */
  (function orderGame() {
    var pool = $('order-pool'), list = $('order-list');
    if (!pool) return;
    var STEPS = [
      'Prepare: site visit, stage plot, input list, spares',
      'Technical briefing with the whole crew',
      'Place the gear and run the cables',
      'Power up: console first, amps last',
      'Line check every input',
      'Ring out FOH and each monitor mix',
      'Sound check with the performers',
      'Run the show: mix, refine, take notes',
      'Power down: amps first',
      'Teardown: coil, count and secure',
      'Debrief with your notes'
    ];
    var picked = [];
    // A fixed shuffle, so the whole class sees the same pool (and never the answer).
    var order = [5, 2, 9, 0, 7, 3, 10, 1, 6, 8, 4];
    function render() {
      pool.innerHTML = '';
      order.forEach(function (i) {
        if (picked.indexOf(i) >= 0) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'te-button';
        b.textContent = STEPS[i];
        b.addEventListener('click', function () { picked.push(i); render(); });
        pool.appendChild(b);
      });
      list.innerHTML = '';
      picked.forEach(function (i, pos) {
        var li = document.createElement('li');
        li.textContent = STEPS[i];
        if (picked.length === STEPS.length) li.className = i === pos ? 'right' : 'wrong';
        list.appendChild(li);
      });
      var out = $('order-readout');
      if (picked.length < STEPS.length) { setReadout(out, picked.length ? picked.length + ' of ' + STEPS.length + ' placed.' : 'Press the steps in the order you\'d do them.'); return; }
      var right = picked.filter(function (s, pos) { return s === pos; }).length;
      if (right === STEPS.length) setReadout(out, '<strong>All ' + right + ' in order.</strong> That\'s a show that starts on time.', 'good');
      else setReadout(out, right + ' of ' + STEPS.length + ' in the right place. The red ones are out of order; read the cards below, then try again. Remember: amps <strong>last on, first off</strong>, and nothing gets rung out until every line is checked.', 'warn');
    }
    $('order-undo').addEventListener('click', function () { picked.pop(); render(); });
    $('order-reset').addEventListener('click', function () { picked = []; render(); });
    $('order-show').addEventListener('click', function () { picked = STEPS.map(function (_, i) { return i; }); render(); });
    render();
  }());

  /* ── Quizzes (hum hunt and show-day check) ───────────────────────────────── */
  all('.ls-quiz').forEach(function (quiz) {
    var qs = all('.ls-q', quiz);
    var score = quiz.nextElementSibling && quiz.nextElementSibling.classList.contains('ls-score') ? quiz.nextElementSibling : null;
    var right = 0, done = 0;
    qs.forEach(function (q) {
      var buttons = all('button[data-choice]', q);
      buttons.forEach(function (b) {
        b.addEventListener('click', function () {
          if (q.dataset.done) return;
          q.dataset.done = '1';
          var ok = b.dataset.choice === q.dataset.answer;
          b.classList.add(ok ? 'right' : 'wrong');
          buttons.forEach(function (o) { if (o.dataset.choice === q.dataset.answer) o.classList.add('right'); o.setAttribute('aria-disabled', 'true'); });
          var why = q.querySelector('.ls-why');
          if (why) { why.hidden = false; why.insertAdjacentHTML('afterbegin', ok ? '<strong>Right.</strong> ' : '<strong>Not quite.</strong> '); }
          done++; if (ok) right++;
          if (score) score.textContent = right + ' of ' + done + ' correct' + (done === qs.length ? '. Done.' : '.');
        });
      });
    });
  });
}());
