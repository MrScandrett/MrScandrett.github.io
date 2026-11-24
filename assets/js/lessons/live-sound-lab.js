/* Live Sound Reinforcement lesson (live-sound-reinforcement.html): wires all 9 labs to LiveSound & AudioLabSynth. */
(function () {
  'use strict';
  var L = window.LiveSound;
  var Synth = window.AudioLabSynth;
  var SK = window.SimKit;
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
    if (!node) return;
    node.innerHTML = html;
    node.classList.remove('good', 'warn', 'bad');
    if (tone) node.classList.add(tone);
  }
  function segmented(attr, onChange) {
    var buttons = all('[' + attr + ']');
    if (!buttons.length) return function () { return ''; };
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

  /* ── Workbench Tabs & Hash Navigation ── */
  var tabButtons = all('#live-sound-workbench [role="tab"][data-panel]');
  var tabPanels = all('#live-sound-workbench .te-wb-panel');
  var HASH_TABS = {
    '#ring-out': 'ring-out',
    '#feedback': 'feedback',
    '#placement': 'placement',
    '#inverse-square': 'inverse-square',
    '#hum-safety': 'hum-safety'
  };

  function activateTab(panelId, moveFocus) {
    tabButtons.forEach(function (btn) {
      var active = btn.getAttribute('data-panel') === panelId;
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.tabIndex = active ? 0 : -1;
      if (active && moveFocus) btn.focus();
    });
    tabPanels.forEach(function (panel) {
      panel.hidden = panel.id !== panelId;
    });
    window.dispatchEvent(new CustomEvent('live-sound-tab-shown', { detail: panelId }));
  }

  tabButtons.forEach(function (btn, idx) {
    btn.addEventListener('click', function () { activateTab(btn.getAttribute('data-panel'), false); });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var dir = e.key === 'ArrowRight' ? 1 : -1;
        activateTab(tabButtons[(idx + dir + tabButtons.length) % tabButtons.length].getAttribute('data-panel'), true);
        e.preventDefault();
      }
    });
  });

  function syncHash() {
    var target = HASH_TABS[window.location.hash];
    if (target) activateTab(target, false);
  }
  window.addEventListener('hashchange', syncHash);
  syncHash();

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
        why = 'Unrelated sources sum as <strong>power</strong> (+3 dB per doubling). Eight singers yield +9 dB above one.';
      } else if (m === 'coherent') {
        total = L.addSources(levels, 'coherent');
        why = 'Coherent in-phase waves sum as <strong>pressure</strong> (+6 dB per doubling). Off-axis they drift into <a href="microphone-polar-patterns.html#three-to-one">comb filtering</a>.';
      } else {
        var flipped = Math.floor(n / 2), kept = n - flipped;
        total = kept === flipped ? -Infinity : L.addSources(levels.slice(0, kept - flipped), 'coherent');
        why = n % 2 === 0
          ? 'Equal opposite polarities cancel completely — why swapped XLR pins 2/3 hollow out vocals and drums.'
          : 'Opposite-polarity pairs cancel, leaving one uncancelled copy.';
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

  /* ── 2. Cover the audience (Legend + SPL comfort warnings) ───────────────── */
  (function coverageLab() {
    var svg = $('cov-svg');
    if (!svg) return;
    var WATTS = [10, 25, 50, 100, 250, 500, 1000, 2000];
    var FRONT = 2;
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

      clear(svg);
      var x0 = 46, x1 = 616, earY = 186, vs = 16;
      var hs = (x1 - x0) / (back + 1);
      svg.appendChild(el('line', { x1: 10, y1: earY + 20, x2: 632, y2: earY + 20, class: 'cov-floor' }));
      svg.appendChild(el('line', { x1: 10, y1: earY, x2: 632, y2: earY, class: 'cov-ear' }));
      svg.appendChild(el('text', { x: 12, y: earY + 34, class: 'cov-note' }, 'ears'));
      var sy = Math.max(26, earY - h * vs);
      svg.appendChild(el('line', { x1: x0 - 14, y1: sy + 14, x2: x0 - 14, y2: earY + 20, class: 'cov-stand' }));
      rows.forEach(function (r, i) {
        var rx = x0 + r.x * hs;
        if (i === 0 || i === ROWS - 1) svg.appendChild(el('line', { x1: x0, y1: sy, x2: rx, y2: earY, class: 'cov-ray' }));
      });
      svg.appendChild(el('rect', { x: x0 - 22, y: sy - 14, width: 22, height: 28, rx: 3, class: 'cov-box' }));
      svg.appendChild(el('circle', { cx: x0 - 8, cy: sy + 5, r: 5, class: 'cov-cone' }));
      rows.forEach(function (r) {
        var rx = x0 + r.x * hs;
        var dev = Math.abs(r.spl - mean);
        var cls = dev <= 3 ? 'ok' : (dev <= 6 ? 'meh' : 'bad');
        svg.appendChild(el('line', { x1: rx, y1: earY + 6, x2: rx, y2: earY + 20, class: 'cov-body ' + cls }));
        svg.appendChild(el('circle', { cx: rx, cy: earY, r: 6.5, class: 'cov-head ' + cls }));
        svg.appendChild(el('text', { x: rx, y: earY - 14, class: 'cov-spl', 'text-anchor': 'middle' }, Math.round(r.spl)));
        svg.appendChild(el('text', { x: rx, y: earY + 34, class: 'cov-note', 'text-anchor': 'middle' }, Math.round(r.x) + ' m'));
      });
      svg.appendChild(el('text', { x: 14, y: 18, class: 'cov-note' }, 'dB SPL per row (inverse square: −6 dB per doubling of distance)'));

      $('cov-front').textContent = fmt(front, 0) + ' dB';
      $('cov-backspl').textContent = fmt(last, 0) + ' dB';
      $('cov-spread').textContent = fmt(spread, 1) + ' dB';
      var msgs = [], tone = 'good';
      if (spread > 6) {
        msgs.push('Front row is <strong>' + fmt(spread, 1) + ' dB</strong> hotter than the back. Raise speaker height' + (src === 'point' ? ' or try a line array' : ' or add a delay speaker halfway back') + '.');
        tone = 'warn';
      } else {
        msgs.push('Even coverage: all rows sit within ' + fmt(spread, 1) + ' dB.');
      }
      if (last < 85) { msgs.push('Back row (' + fmt(last, 0) + ' dB) is quiet for speech (aim ≥ 85 dB).'); tone = 'bad'; }
      else if (last < 95) msgs.push('Back row (' + fmt(last, 0) + ' dB): clean for speech, modest for a loud band.');
      else msgs.push('Back row (' + fmt(last, 0) + ' dB): solid concert SPL.');

      if (front > 110) {
        msgs.push('<strong>Hazard:</strong> front row hits ' + fmt(front, 0) + ' dB SPL — hearing-damage dose accumulates in minutes!');
        tone = 'bad';
      } else if (front > 102) {
        msgs.push('Comfort note: front row reaches ' + fmt(front, 0) + ' dB SPL — offer ear protection near stage.');
        if (tone === 'good') tone = 'warn';
      }
      setReadout($('cov-readout'), msgs.join(' '), tone);
    }
    onInput(['cov-sens', 'cov-watts', 'cov-height', 'cov-back'], render);
    render();
  }());

  /* ── 3. PAG / NAG (includes Figure-8 option) ─────────────────────────────── */
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
      if (o.ds > 0.15) tips.push('move mic closer (½ distance = +6 dB)');
      if (o.nom > 1) tips.push('mute unused mics (' + o.nom + ' open costs ' + fmt(L.dbPower(o.nom), 1) + ' dB)');
      if (pattern !== 'omni' && Math.abs(angle - (L.patternNull(pattern) || 180)) > 20) tips.push('aim speaker at mic null (~' + Math.round(L.patternNull(pattern)) + '°)');
      if (o.d1 < 3) tips.push('increase mic-to-speaker distance D1');
      var rej = o.rejection > 0 ? ' Polar rejection buys ' + fmt(o.rejection, 1) + ' dB.' : '';
      if (r.works) setReadout($('pag-readout'), '<strong>Stable show:</strong> ' + fmt(r.margin, 1) + ' dB headroom (back row hears talker as if ' + metres(o.ead) + ' away).' + rej, 'good');
      else setReadout($('pag-readout'), '<strong>Feedback limit reached:</strong> ' + fmt(-r.margin, 1) + ' dB short of target level.' + rej + (tips.length ? ' Try: ' + tips.join('; ') + '.' : ''), 'bad');

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

  /* ── 4. Ring out (SimKit.canvas2d, batched paths, Program PA Audio, Touch Nudge) */
  (function ringLab() {
    var canvas = $('ring-canvas');
    if (!canvas) return;
    var PAD = { l: 48, r: 12, t: 14, b: 28 };
    var DB_MIN = -42, DB_MAX = 12;
    var seed = 7;
    var room = L.createRoom(seed);
    var cuts = {}, history = [];
    var startGain = L.maxStableGain(room, {});
    var ear = false;
    var selectedBand = L.GEQ_BANDS[17]; // 1 kHz default for nudge bar

    var geq = $('ring-geq');
    var nudgeLabel = $('ring-nudge-band');
    var bandButtons = L.GEQ_BANDS.map(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ls-band';
      btn.dataset.band = b;
      btn.innerHTML = '<i></i><span>' + (b >= 1000 ? (b / 1000) + 'k' : b) + '</span>';
      btn.addEventListener('click', function (e) {
        selectedBand = b;
        var cur = cuts[b] || 0;
        if (e.shiftKey) {
          if (cur > 0) {
            cuts[b] = cur - 3;
            if (cuts[b] <= 0) delete cuts[b];
          }
        } else if (cur >= 12) {
          delete cuts[b];
        } else {
          history.push(b);
          cuts[b] = cur + 3;
        }
        render();
      });
      geq.appendChild(btn);
      return btn;
    });

    function nudgeSelected(delta) {
      var cur = cuts[selectedBand] || 0;
      var next = Math.max(0, Math.min(12, cur + delta));
      if (next > cur) history.push(selectedBand);
      if (next <= 0) delete cuts[selectedBand];
      else cuts[selectedBand] = next;
      render();
    }
    if ($('ring-nudge-cut')) $('ring-nudge-cut').addEventListener('click', function () { nudgeSelected(3); });
    if ($('ring-nudge-boost')) $('ring-nudge-boost').addEventListener('click', function () { nudgeSelected(-3); });

    var metrics = { w: 900, h: 320, ctx: canvas.getContext('2d') };
    var surface = SK ? SK.canvas2d(canvas, {
      onResize: function (info) {
        metrics.w = info.width;
        metrics.h = info.height;
        metrics.ctx = info.ctx;
        draw(num('ring-master'));
      }
    }) : null;

    function fx(f) { return PAD.l + (Math.log(f / 20) / Math.log(1000)) * (metrics.w - PAD.l - PAD.r); }
    function fy(d) { return PAD.t + (DB_MAX - d) / (DB_MAX - DB_MIN) * (metrics.h - PAD.t - PAD.b); }

    function draw(master) {
      var ctx = surface ? surface.ctx : metrics.ctx;
      var W = metrics.w, H = metrics.h;
      if (!ctx || W < 20 || H < 20) return;

      var tc = SK && SK.theme ? SK.theme.colors() : { muted: '#9aa5b4', accent: '#f0b448' };
      ctx.clearRect(0, 0, W, H);
      ctx.font = '600 11px system-ui, sans-serif';

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.fillStyle = tc.muted || '#b7c0cc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].forEach(function (f) {
        var x = fx(f); ctx.moveTo(x, PAD.t); ctx.lineTo(x, H - PAD.b);
      });
      for (var d = -40; d <= 10; d += 10) {
        var y = fy(d); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y);
      }
      ctx.stroke();

      ctx.textAlign = 'center';
      [[31.5, '31'], [63, '63'], [125, '125'], [250, '250'], [500, '500'], [1000, '1k'], [2000, '2k'], [4000, '4k'], [8000, '8k'], [16000, '16k']].forEach(function (p) {
        ctx.fillText(p[1], fx(p[0]), H - 10);
      });
      ctx.textAlign = 'right';
      for (d = -40; d <= 10; d += 10) ctx.fillText((d > 0 ? '+' : '') + d, PAD.l - 7, fy(d) + 4);

      ctx.strokeStyle = '#ff766c';
      ctx.setLineDash([7, 6]);
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(PAD.l, fy(0)); ctx.lineTo(W - PAD.r, fy(0)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff8b82';
      ctx.textAlign = 'left';
      ctx.fillText('0 dB loop gain: feedback threshold', PAD.l + 6, fy(0) - 6);

      ctx.strokeStyle = '#66d28a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var f = 20; f <= 20000; f *= 1.02) {
        var yy = fy(-30 + L.eqGain(cuts, f));
        if (f === 20) ctx.moveTo(fx(f), yy); else ctx.lineTo(fx(f), yy);
      }
      ctx.stroke();
      ctx.fillStyle = '#8ee6ab';
      ctx.fillText('31-band GEQ curve', fx(22), fy(-30) - 6);

      if (!ear) {
        // Batched two-pass curve (1 stroke for safe <= 0 dB, 1 stroke for ringing >= 0 dB)
        var pts = [];
        for (f = 20; f <= 20000; f *= 1.015) {
          var g = L.loopGain(room, f) + L.eqGain(cuts, f) + master;
          pts.push({ x: fx(f), y: fy(Math.max(DB_MIN, Math.min(DB_MAX, g))), ring: g >= 0 });
        }
        [false, true].forEach(function (isRing) {
          ctx.strokeStyle = isRing ? '#ff766c' : '#59c8d8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (var i = 1; i < pts.length; i++) {
            if (pts[i].ring === isRing) {
              ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
              ctx.lineTo(pts[i].x, pts[i].y);
            }
          }
          ctx.stroke();
        });
        ctx.fillStyle = '#75d5e3';
        ctx.fillText('loop gain (mic → PA → room → mic)', fx(22), fy(DB_MAX) + 12);
      } else {
        ctx.fillStyle = '#dce2ea';
        ctx.textAlign = 'center';
        ctx.fillText('Ear-training mode: hear the ringing pitch and cut the matching band below.', W / 2, fy(-12));
      }
    }

    if (SK && SK.theme && SK.theme.onChange) {
      SK.theme.onChange(function () { draw(num('ring-master')); });
    }
    window.addEventListener('live-sound-tab-shown', function (e) {
      if (e.detail === 'ring-out' && surface) surface.resize();
    });
    window.addEventListener('creation-app-resize', function () {
      if (surface) surface.resize();
    });

    /* Ring audio + Live Program PA Audio through 31-band BiquadFilterNode GEQ */
    var ringAudio = null;
    var progAudio = null;

    function sound(on) {
      if (on && !ringAudio) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        var ac = new AC();
        if (ac.state === 'suspended') ac.resume();
        var osc = ac.createOscillator(), gain = ac.createGain();
        osc.type = 'sine';
        gain.gain.value = 0;
        osc.connect(gain).connect(ac.destination);
        osc.start();
        ringAudio = { ac: ac, osc: osc, gain: gain };
      } else if (on && ringAudio && ringAudio.ac.state === 'suspended') {
        ringAudio.ac.resume();
      } else if (!on && ringAudio) {
        ringAudio.gain.gain.setTargetAtTime(0, ringAudio.ac.currentTime, 0.05);
        var a = ringAudio; ringAudio = null;
        setTimeout(function () { try { a.osc.stop(); a.ac.close(); } catch (e) {} }, 250);
      }
    }

    function toggleProgramAudio(on) {
      if (on && !progAudio && Synth) {
        var ac = Synth.createContext();
        if (ac.state === 'suspended') ac.resume();
        var stems = Synth.createBandStems(ac, { seconds: 2.4 });
        var vox = ac.createBufferSource();
        vox.buffer = stems.vocal;
        vox.loop = true;
        var keys = ac.createBufferSource();
        keys.buffer = stems.keys;
        keys.loop = true;

        var preGain = ac.createGain();
        preGain.gain.value = 0.52;
        vox.connect(preGain);
        keys.connect(preGain);

        var prev = preGain;
        var filters = {};
        L.GEQ_BANDS.forEach(function (bandHz) {
          var filt = ac.createBiquadFilter();
          filt.type = 'peaking';
          filt.frequency.value = bandHz;
          filt.Q.value = 4.3;
          filt.gain.value = -(cuts[bandHz] || 0);
          prev.connect(filt);
          prev = filt;
          filters[bandHz] = filt;
        });

        var outGain = ac.createGain();
        outGain.gain.value = 0.55;
        prev.connect(outGain).connect(ac.destination);
        vox.start();
        keys.start();
        progAudio = { ac: ac, filters: filters, src: [vox, keys], outGain: outGain };
      } else if (!on && progAudio) {
        progAudio.outGain.gain.setTargetAtTime(0, progAudio.ac.currentTime, 0.04);
        var pa = progAudio; progAudio = null;
        setTimeout(function () { try { pa.src.forEach(function (s) { s.stop(); }); pa.ac.close(); } catch (e) {} }, 220);
      }
    }

    function updateAudioNodes(rp) {
      if (ringAudio) {
        if (ringAudio.ac.state === 'suspended') ringAudio.ac.resume();
        var t = ringAudio.ac.currentTime;
        ringAudio.osc.frequency.setTargetAtTime(rp.freq, t, 0.02);
        ringAudio.gain.gain.setTargetAtTime(rp.rings ? Math.min(0.11, 0.03 + rp.loop * 0.02) : 0, t, rp.rings ? 0.22 : 0.05);
      }
      if (progAudio) {
        if (progAudio.ac.state === 'suspended') progAudio.ac.resume();
        L.GEQ_BANDS.forEach(function (b) {
          Synth.smooth(progAudio.filters[b].gain, -(cuts[b] || 0), progAudio.ac, 0.02);
        });
      }
    }

    function render() {
      var master = num('ring-master');
      $('ring-master-out').textContent = db(master);
      var rp = L.ringPoint(room, cuts, master);
      var gbf = L.maxStableGain(room, cuts);
      var damage = L.eqDamage(cuts);
      draw(master);

      bandButtons.forEach(function (b) {
        var bandNum = Number(b.dataset.band);
        var c = cuts[bandNum] || 0;
        b.querySelector('i').style.height = (c / 12 * 100) + '%';
        b.classList.toggle('cut', c > 0);
        b.classList.toggle('is-selected', bandNum === selectedBand);
        b.setAttribute('aria-label', b.dataset.band + ' hertz band' + (c ? ', cut ' + c + ' dB' : ''));
      });
      if (nudgeLabel) nudgeLabel.textContent = hz(selectedBand) + ' (−' + (cuts[selectedBand] || 0) + ' dB)';

      $('ring-banner').hidden = !rp.rings;
      $('ring-stage').classList.toggle('ringing', rp.rings);
      $('ring-at').textContent = rp.rings ? (ear ? 'listen…' : '≈ ' + hz(rp.freq)) : 'stable';
      $('ring-gbf').textContent = db(gbf);
      var earned = gbf - startGain;
      $('ring-earned').textContent = db(earned);
      $('ring-tone').textContent = damage.verdict === 'flat' ? 'untouched' : damage.verdict + ' (' + damage.bands + ' band' + (damage.bands === 1 ? '' : 's') + ')';

      var msg, tone;
      if (rp.rings) {
        msg = '<strong>Feedback!</strong> Loop is ' + db(rp.loop) + ' above threshold at ' + (ear ? 'one pitch — cut its band below.' : '≈ ' + hz(rp.freq) + ' — cut the <strong>' + hz(rp.band) + '</strong> band.');
        tone = 'bad';
      } else if (!history.length) {
        msg = 'Raise System Gain slowly until feedback starts, then notch ringing bands 3 dB at a time (click cycles 0–12→0, Shift-click boosts back up).';
        tone = null;
      } else if (damage.verdict === 'hollow') {
        msg = 'Earned ' + db(earned) + ', though ' + damage.bands + ' cuts have hollowed out the PA — turn on Program PA Audio to hear the tone loss.';
        tone = 'warn';
      } else {
        msg = 'Stable ' + fmt(-rp.loop, 1) + ' dB below feedback (earned ' + db(earned) + '). Next peak sits near ' + (ear ? 'a hidden band' : hz(rp.freq)) + '.';
        tone = 'good';
      }
      setReadout($('ring-readout'), msg, tone);
      updateAudioNodes(rp);
    }

    onInput(['ring-master'], render);
    $('ring-undo').addEventListener('click', function () {
      var b = history.pop();
      if (b == null) return;
      cuts[b] = (cuts[b] || 0) - 3;
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
    var progBtn = $('ring-program');
    if (progBtn) {
      progBtn.addEventListener('click', function () {
        var on = progBtn.getAttribute('aria-pressed') !== 'true';
        progBtn.setAttribute('aria-pressed', String(on));
        toggleProgramAudio(on);
        render();
      });
    }
    var earBtn = $('ring-ear');
    earBtn.addEventListener('click', function () {
      ear = earBtn.getAttribute('aria-pressed') !== 'true';
      earBtn.setAttribute('aria-pressed', String(ear));
      if (ear && soundBtn.getAttribute('aria-pressed') !== 'true') soundBtn.click();
      else render();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (ringAudio) { soundBtn.setAttribute('aria-pressed', 'false'); sound(false); }
        if (progAudio && progBtn) { progBtn.setAttribute('aria-pressed', 'false'); toggleProgramAudio(false); }
      }
    });
    render();
  }());

  /* ── 5. Beaming (fixed SVG viewBox 640x192 vertical padding) ─────────────── */
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
      var maxLen = Math.max(dm, Math.min(lambda, dm * 6));
      var px = 128 / maxLen;
      var cx = 124, cy = 96;
      var hcone = dm * px;
      svg.appendChild(el('text', { x: 14, y: 18, class: 'cov-note' }, 'side view · driver cone and acoustic wavelength λ drawn to the same scale'));
      var half = Math.min(90, cov / 2) * Math.PI / 180, R = 290;
      svg.appendChild(el('path', { d: 'M' + cx + ',' + cy + ' L' + (cx + R * Math.cos(half)) + ',' + (cy - R * Math.sin(half)) + ' A' + R + ',' + R + ' 0 0 1 ' + (cx + R * Math.cos(half)) + ',' + (cy + R * Math.sin(half)) + ' Z', class: 'bm-fan' + (cov < 90 ? ' narrow' : '') }));
      svg.appendChild(el('rect', { x: cx - 8, y: cy - hcone / 2, width: 8, height: hcone, class: 'bm-cone' }));
      svg.appendChild(el('text', { x: cx - 14, y: cy + 4, class: 'cov-note', 'text-anchor': 'end' }, d + '″'));

      var lpx = lambda * px, clipped = lpx > 142;
      var len = Math.min(lpx, 142), wx = 44;
      var path = '';
      for (var i = 0; i <= 60; i++) {
        var yy = cy - len / 2 + len * i / 60;
        var xx = wx + 12 * Math.sin(2 * Math.PI * (i / 60) * (clipped ? len / lpx : 1));
        path += (i ? 'L' : 'M') + xx.toFixed(1) + ',' + yy.toFixed(1);
      }
      svg.appendChild(el('path', { d: path, class: 'bm-wave' }));
      svg.appendChild(el('text', { x: wx, y: Math.min(184, cy + len / 2 + 15), class: 'cov-note', 'text-anchor': 'middle' }, clipped ? 'λ (longer than box)' : 'λ'));

      var ratio = lambda / dm;
      var msg = ratio >= 1
        ? 'Wavelength (' + $('beam-lambda').textContent + ') exceeds the ' + d + '-inch cone, so dispersion stays wide.'
        : 'Wavelength is ' + fmt(1 / ratio, 1) + '× smaller than the cone, squeezing dispersion to ' + Math.round(cov) + '° — hand off to a smaller HF horn below ' + hz(limit) + '.';
      setReadout($('beam-readout'), msg, ratio >= 1 ? 'good' : (cov < 45 ? 'bad' : 'warn'));
    }
    onInput(['beam-size', 'beam-freq'], render);
    render();
  }());

  /* ── 6. Amplifier loads & Speaker Delivered Watts schematic ──────────────── */
  (function ampLab() {
    if (!$('amp-rated')) return;
    var svg = $('amp-svg');
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
      var ampWatts = p.safe ? Math.round(p.watts) : 0;
      var spkWatts = p.safe ? Math.round(p.watts * Math.pow(10, -cable.lossDb / 10)) : 0;
      var ohms = function (x) { return (Math.round(x * 10) / 10) + ' Ω'; };

      $('amp-load').textContent = ohms(load) + (bridged ? ' (' + ohms(p.perSideLoad) + '/ch)' : '');
      $('amp-watts').textContent = p.safe ? spkWatts.toLocaleString() + ' W (amp ' + ampWatts.toLocaleString() + ' W)' : 'unsafe';
      $('amp-loss').textContent = '−' + fmt(cable.lossDb, 1) + ' dB';
      $('amp-df').textContent = Math.round(cable.dampingAtSpeaker);

      if (svg) {
        clear(svg);
        svg.appendChild(el('rect', { x: 18, y: 20, width: 145, height: 56, rx: 8, fill: '#17202e', stroke: p.safe ? '#59c8d8' : '#ff766c', 'stroke-width': 2 }));
        svg.appendChild(el('text', { x: 90, y: 42, class: 'cov-spl', 'text-anchor': 'middle' }, p.safe ? ampWatts + ' W Amp Out' : 'OVERLOAD'));
        svg.appendChild(el('text', { x: 90, y: 60, class: 'cov-note', 'text-anchor': 'middle' }, 'Rated ' + rated + ' W @ 8 Ω · Min ' + minLoad + ' Ω'));
        svg.appendChild(el('line', { x1: 163, y1: 48, x2: 390, y2: 48, stroke: cable.lossDb > 1 ? '#ffcc66' : '#66d28a', 'stroke-width': awg <= 12 ? 5 : (awg <= 14 ? 3.5 : 2) }));
        svg.appendChild(el('text', { x: 276, y: 36, class: 'cov-note', 'text-anchor': 'middle' }, awg + ' AWG · ' + len + ' m (−' + fmt(cable.lossDb, 1) + ' dB cable heat)'));
        svg.appendChild(el('rect', { x: 390, y: 20, width: 230, height: 56, rx: 8, fill: '#17202e', stroke: '#f0b448', 'stroke-width': 2 }));
        svg.appendChild(el('text', { x: 505, y: 42, class: 'cov-spl', 'text-anchor': 'middle' }, p.safe ? spkWatts + ' W to ' + n + ' Box' + (n > 1 ? 'es' : '') : 'Shut Down / Fault'));
        svg.appendChild(el('text', { x: 505, y: 60, class: 'cov-note', 'text-anchor': 'middle' }, wiring() + ' · ' + ohms(load) + ' load · DF ' + Math.round(cable.dampingAtSpeaker)));
      }

      var msgs = [], tone = 'good';
      if (!p.safe) {
        msgs.push('<strong>Unsafe load:</strong> amp sees ' + (bridged ? ohms(p.perSideLoad) + ' per bridged side' : ohms(load)) + ', below its ' + minLoad + ' Ω limit.');
        tone = 'bad';
      } else {
        msgs.push('Amp outputs <strong>' + ampWatts.toLocaleString() + ' W</strong>; after ' + fmt(cable.lossDb, 1) + ' dB cable loss, speakers receive <strong>' + spkWatts.toLocaleString() + ' W total</strong> (' + Math.round(spkWatts / n) + ' W/box).');
      }
      if (cable.lossDb > 1 && p.safe) {
        msgs.push(Math.round(cable.powerLostPct) + '% of energy warms the ' + awg + ' AWG cable — shorten runs or thicken copper.');
        tone = 'warn';
      }
      setReadout($('amp-readout'), msgs.join(' '), tone);
    }
    onInput(['amp-rated', 'amp-min', 'amp-n', 'amp-z', 'amp-bridge', 'amp-awg', 'amp-len'], render);
    render();
  }());

  /* ── 7. Delay speaker (label-clipping fix + Web Audio Mains + Delay) ─────── */
  (function delayLab() {
    var svg = $('dly-svg');
    if (!svg) return;
    var dlyAudioBtn = $('dly-audio-btn');
    var dlyTimer = null;

    function playHaasDemo(delayMs) {
      if (!Synth) return;
      if (dlyTimer) clearTimeout(dlyTimer);
      var ctx = Synth.createContext();
      if (ctx.state === 'suspended') ctx.resume();
      var buf = Synth.createVocalPhraseBuffer(ctx, { seconds: 1.6 });
      var mainSrc = ctx.createBufferSource();
      mainSrc.buffer = buf;
      var subSrc = ctx.createBufferSource();
      subSrc.buffer = buf;

      // Relative acoustic arrival at listener under delay box:
      // Sound from mains takes travelMs; delay speaker plays after delayMs (so haasMs relative to mains).
      var relDelaySec = Math.max(0, (delayMs - L.delaySpeaker({ distance: num('dly-dist'), tempC: num('dly-temp'), haasMs: 0 }).travelMs) / 1000);
      var dlyNode = ctx.createDelay(1.0);
      dlyNode.delayTime.value = Math.min(0.95, relDelaySec);

      var dryG = ctx.createGain();
      dryG.gain.value = 0.42;
      var wetG = ctx.createGain();
      wetG.gain.value = 0.42;

      mainSrc.connect(dryG).connect(ctx.destination);
      subSrc.connect(dlyNode).connect(wetG).connect(ctx.destination);
      mainSrc.start();
      subSrc.start();
      if (dlyAudioBtn) {
        dlyAudioBtn.setAttribute('aria-pressed', 'true');
        dlyTimer = setTimeout(function () { dlyAudioBtn.setAttribute('aria-pressed', 'false'); }, 1700);
      }
    }

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
      var span = Math.max(r.delayMs + 45, 90);
      var x0 = 26, x1 = 604, y = 62;
      var tx = function (ms) { return x0 + (ms / span) * (x1 - x0); };
      var fuseX = tx(r.travelMs);
      var fuseW = Math.min(x1 - fuseX, tx(r.travelMs + 30) - fuseX);
      svg.appendChild(el('rect', { x: fuseX, y: y - 28, width: Math.max(2, fuseW), height: 42, class: 'dl-fuse' }));
      svg.appendChild(el('text', { x: Math.min(410, fuseX + 4), y: y - 33, class: 'cov-note' }, '30 ms Haas fusion window after mains'));
      svg.appendChild(el('line', { x1: x0, y1: y, x2: x1, y2: y, class: 'dl-axis' }));

      var marks = [
        { t: 0, label: 'desk · 0 ms', cls: 'dl-desk', anchor: 'start', row: 28 },
        { t: r.travelMs, label: 'mains · ' + fmt(r.travelMs, 0) + ' ms', cls: 'dl-main', anchor: tx(r.travelMs) > 510 ? 'end' : 'middle', row: 28 },
        { t: r.delayMs, label: 'delay spkr · ' + fmt(r.delayMs, 0) + ' ms', cls: 'dl-delay', anchor: tx(r.delayMs) > 500 ? 'end' : 'middle', row: 44 }
      ];
      marks.forEach(function (m) {
        var x = Math.max(24, Math.min(614, tx(m.t)));
        svg.appendChild(el('line', { x1: x, y1: y - 16, x2: x, y2: y + 16, class: m.cls }));
        svg.appendChild(el('text', { x: x, y: y + m.row, class: 'cov-note', 'text-anchor': m.anchor }, m.label));
      });

      var msg, tone;
      if (haas < 3) { msg = 'Arrivals collide (~0 ms offset): comb filtering shifts imaging upward toward the delay box.'; tone = 'warn'; }
      else if (haas <= 20) { msg = 'Sweet-spot Precedence (Haas) lock: mains arrive slightly first, keeping localization anchored onstage while delay adds clarity.'; tone = 'good'; }
      else if (haas <= 30) { msg = 'Near the 30 ms Haas edge — trim offset closer to 10–12 ms.'; tone = 'warn'; }
      else { msg = 'Offset of ' + haas + ' ms passes the 30 ms threshold — heard as a distinct slap-back <strong>echo</strong>.'; tone = 'bad'; }
      setReadout($('dly-readout'), msg, tone);
    }

    onInput(['dly-dist', 'dly-temp', 'dly-haas'], render);
    if (dlyAudioBtn) dlyAudioBtn.addEventListener('click', function () { playHaasDemo(L.delaySpeaker({ distance: num('dly-dist'), tempC: num('dly-temp'), haasMs: num('dly-haas') }).delayMs); });
    render();
  }());

  /* ── 8. Hum Audio + Ground Lift + Hearing Exposure ───────────────────────── */
  (function humAndEar() {
    var humBtn = $('hum-audio-btn'), liftBtn = $('hum-lift-btn');
    var humAudio = null, humOn = false, lifted = false;

    function ensureHumAudio() {
      if (humAudio || !Synth) return;
      var ac = Synth.createContext();
      if (ac.state === 'suspended') ac.resume();
      var src = ac.createBufferSource();
      src.buffer = Synth.createVocalPhraseBuffer(ac, { seconds: 2.4 });
      src.loop = true;
      var o60 = ac.createOscillator(), o120 = ac.createOscillator(), o180 = ac.createOscillator();
      o60.frequency.value = 60;
      o120.frequency.value = 120;
      o180.frequency.value = 180;
      var humBus = ac.createGain();
      var g60 = ac.createGain(), g120 = ac.createGain(), g180 = ac.createGain();
      g60.gain.value = 0.24; g120.gain.value = 0.14; g180.gain.value = 0.09;
      o60.connect(g60).connect(humBus);
      o120.connect(g120).connect(humBus);
      o180.connect(g180).connect(humBus);

      var sigG = ac.createGain();
      sigG.gain.value = 0.42;
      var master = ac.createGain();
      master.gain.value = 0;
      src.connect(sigG).connect(master);
      humBus.connect(master);
      master.connect(ac.destination);

      src.start(); o60.start(); o120.start(); o180.start();
      humAudio = { ac: ac, humBus: humBus, master: master };
    }

    function syncHum() {
      if (!humAudio || !Synth) return;
      if (humAudio.ac.state === 'suspended') humAudio.ac.resume();
      Synth.smooth(humAudio.master.gain, humOn ? 0.5 : 0, humAudio.ac, 0.02);
      Synth.smooth(humAudio.humBus.gain, lifted ? 0 : 0.7, humAudio.ac, 0.02);
    }

    if (humBtn) {
      humBtn.addEventListener('click', function () {
        if (!humOn) ensureHumAudio();
        humOn = !humOn;
        humBtn.setAttribute('aria-pressed', String(humOn));
        humBtn.textContent = humOn ? '🔇 Stop 60 Hz Demo' : '🔊 Hear 60 Hz Ground Loop';
        syncHum();
      });
    }
    if (liftBtn) {
      liftBtn.addEventListener('click', function () {
        lifted = !lifted;
        liftBtn.setAttribute('aria-pressed', String(lifted));
        liftBtn.textContent = lifted ? 'DI Ground Lift: ON (Hum Cleared!)' : 'DI Ground Lift: OFF';
        syncHum();
      });
    }

    if ($('ear-db')) {
      var renderEar = function () {
        var lvl = num('ear-db');
        $('ear-db-out').textContent = lvl + ' dBA';
        var h = L.safeHours(lvl), mins = h * 60;
        var time = h >= 1 ? fmt(h, h >= 10 ? 0 : 1) + ' hours' : (mins >= 1 ? Math.round(mins) + ' minutes' : Math.round(mins * 60) + ' seconds');
        setReadout($('ear-readout'), '<strong>' + lvl + ' dBA</strong>: safe NIOSH daily limit is <strong>' + time + '</strong>. A 2-hour concert ' + (h >= 2 ? 'stays within limit.' : 'equals <strong>' + fmt(2 / h, 1) + '×</strong> daily noise dose — wear earplugs!'), h >= 2 ? 'good' : (h >= 0.5 ? 'warn' : 'bad'));
      };
      onInput(['ear-db'], renderEar);
      renderEar();
    }
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
      if (picked.length < STEPS.length) {
        setReadout(out, picked.length ? picked.length + ' of ' + STEPS.length + ' placed.' : 'Press the steps in the order you would execute them.');
        return;
      }
      var right = picked.filter(function (s, pos) { return s === pos; }).length;
      if (right === STEPS.length) setReadout(out, '<strong>All ' + right + ' steps in exact show order!</strong>', 'good');
      else setReadout(out, right + ' of ' + STEPS.length + ' in order (red rows are out of sequence).', 'warn');
    }
    $('order-undo').addEventListener('click', function () { picked.pop(); render(); });
    $('order-reset').addEventListener('click', function () { picked = []; render(); });
    $('order-show').addEventListener('click', function () { picked = STEPS.map(function (_, i) { return i; }); render(); });
    render();
  }());

  /* ── Quizzes (with Reset Quiz support) ───────────────────────────────────── */
  all('.ls-quiz').forEach(function (quiz) {
    var qs = all('.ls-q', quiz);
    var score = document.getElementById(quiz.dataset.scoreId);
    var resetBtn = document.getElementById(quiz.dataset.resetId);
    var right = 0, done = 0;

    qs.forEach(function (q) {
      var why = q.querySelector('.ls-why');
      if (why) q.dataset.rawWhy = why.innerHTML;
      var buttons = all('button[data-choice]', q);
      buttons.forEach(function (b) {
        b.addEventListener('click', function () {
          if (q.dataset.done) return;
          q.dataset.done = '1';
          var ok = b.dataset.choice === q.dataset.answer;
          b.classList.add(ok ? 'right' : 'wrong');
          buttons.forEach(function (o) {
            if (o.dataset.choice === q.dataset.answer) o.classList.add('right');
            o.setAttribute('aria-disabled', 'true');
          });
          if (why) {
            why.hidden = false;
            why.innerHTML = (ok ? '<strong>Right.</strong> ' : '<strong>Not quite.</strong> ') + (q.dataset.rawWhy || '');
          }
          done++;
          if (ok) right++;
          if (score) score.textContent = right + ' of ' + done + ' correct' + (done === qs.length ? ' — Complete!' : '.');
        });
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        right = 0;
        done = 0;
        qs.forEach(function (q) {
          delete q.dataset.done;
          var why = q.querySelector('.ls-why');
          if (why) {
            why.hidden = true;
            if (q.dataset.rawWhy) why.innerHTML = q.dataset.rawWhy;
          }
          all('button[data-choice]', q).forEach(function (b) {
            b.classList.remove('right', 'wrong');
            b.removeAttribute('aria-disabled');
          });
        });
        if (score) score.textContent = 'Select an answer on each question above.';
      });
    }
  });
}());
