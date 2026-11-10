/* Omar Khayyam lesson: the page's labs. Maths and poetics live in khayyam-core.js (no DOM).
 *
 *   Lab 1  #kh-cubic-canvas   cubic x³ + cx = d by parabola ∩ circle, step by step
 *   Lab 2  #kh-tracks         Julian / Gregorian / Jalali drift race, 33-year cycle, your own leap rule
 *   Lab 3  #kh-sac-canvas     Khayyam–Saccheri quadrilateral on a curved surface
 *   Lab 4  #kh-triangle       binomial coefficients ("Khayyam's triangle")
 *   Lab 5  #kh-quatrains      three layers of each quatrain, with FitzGerald's 1859 → 1889 changes marked
 *   Lab 6  #kh-forge          write an AABA rubāʿī
 *   Quiz   #kh-quiz
 *
 * Canvases redraw only on input (no animation loop).
 */
(function () {
  'use strict';

  var K = window.KhayyamCore;
  if (!K) return;
  var SimKit = window.SimKit;
  var main = document.querySelector('.kh-main');
  if (!main) return;
  document.documentElement.classList.add('js-kh');

  function $(id) { return document.getElementById(id); }
  function fmt(x, places) {
    if (!isFinite(x)) return '∞';
    return Number(x).toLocaleString('en-US', { minimumFractionDigits: places || 0, maximumFractionDigits: places || 0 });
  }
  function palette() {
    var cs = getComputedStyle(main);
    function v(name, fallback) { return (cs.getPropertyValue(name) || '').trim() || fallback; }
    return {
      ink: v('--kh-ink', '#1d2233'),
      muted: v('--kh-muted', '#4c5468'),
      lapis: v('--kh-lapis', '#1f3a68'),
      turq: v('--kh-turq', '#11706f'),
      pom: v('--kh-pom', '#8f2632'),
      gold: v('--kh-gold', '#c8962f'),
      line: v('--kh-line', '#d8c7a1'),
      paper: v('--kh-paper', '#fbf6ea')
    };
  }
  function sizer(canvas, draw) {
    if (SimKit && SimKit.canvas2d) {
      return SimKit.canvas2d(canvas, { box: canvas.parentElement, onResize: function () { draw(); } });
    }
    var ctx = canvas.getContext('2d');
    var api = { ctx: ctx, width: 0, height: 0 };
    function resize() {
      var box = canvas.parentElement;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      api.width = box.clientWidth; api.height = box.clientHeight;
      canvas.width = api.width * dpr; canvas.height = api.height * dpr;
      canvas.style.width = api.width + 'px'; canvas.style.height = api.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    window.addEventListener('resize', resize);
    resize();
    return api;
  }
  function onTheme(fn) {
    if (SimKit && SimKit.theme && SimKit.theme.onChange) SimKit.theme.onChange(function () { fn(); });
  }

  /* ── Lab 1: cubic by conics ─────────────────────────────────────── */
  (function cubicLab() {
    var canvas = $('kh-cubic-canvas');
    if (!canvas) return;
    var cIn = $('kh-c'), dIn = $('kh-d'), guess = $('kh-guess');
    var steps = $('kh-steps') ? $('kh-steps').children : [];
    var state = { step: 1 };
    var view = null;

    function draw() {
      if (!view) return;
      var ctx = view.ctx, W = view.width, H = view.height;
      var col = palette();
      var c = +cIn.value, d = +dIn.value;
      var r = K.cubic(c, d);
      var a = r.a, b = r.b;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = col.paper;
      ctx.fillRect(0, 0, W, H);

      // World window: the circle (0…b, height b/2) and the crossing, with margins; equal scales.
      var top = Math.max(b / 2, r.y) * 1.2;
      var x0 = -0.28 * b, x1 = b * 1.1, y0 = -(b / 2) * 1.08, y1 = top;
      var s = Math.min((W - 24) / (x1 - x0), (H - 24) / (y1 - y0));
      var ox = (W - (x1 - x0) * s) / 2 - x0 * s;
      var oy = H - (H - (y1 - y0) * s) / 2 + y0 * s;
      function X(x) { return ox + x * s; }
      function Y(y) { return oy - y * s; }

      // axes
      ctx.strokeStyle = col.line; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(x0), Y(0)); ctx.lineTo(X(x1), Y(0)); ctx.moveTo(X(0), Y(y0)); ctx.lineTo(X(0), Y(y1)); ctx.stroke();
      ctx.fillStyle = col.muted; ctx.font = '12px "DM Sans", sans-serif';
      ctx.fillText('0', X(0) - 12, Y(0) + 14);

      if (state.step >= 1) {
        ctx.strokeStyle = col.lapis; ctx.lineWidth = 2.5;
        ctx.beginPath();
        var first = true;
        var lim = Math.sqrt(a * y1);
        for (var i = 0; i <= 160; i++) {
          var x = -lim + (2 * lim) * i / 160;
          var y = x * x / a;
          if (first) { ctx.moveTo(X(x), Y(y)); first = false; } else ctx.lineTo(X(x), Y(y));
        }
        ctx.stroke();
        ctx.fillStyle = col.lapis; ctx.font = '600 13px "DM Sans", sans-serif';
        ctx.fillText('parabola  x² = ' + K.round(a, 2) + '·y', X(-lim) + 4, Y(y1) + 16);
      }
      if (state.step >= 2) {
        ctx.strokeStyle = col.pom; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(X(b / 2), Y(0), (b / 2) * s, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = col.pom; ctx.font = '600 13px "DM Sans", sans-serif';
        ctx.fillText('circle on diameter b = ' + K.round(b, 2), X(b / 2) - 50, Y(0) + 20);
        ctx.beginPath(); ctx.arc(X(b), Y(0), 4, 0, Math.PI * 2); ctx.fill();
      }
      if (state.step >= 3) {
        ctx.fillStyle = col.gold; ctx.strokeStyle = col.ink; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(X(r.x), Y(r.y), 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = col.ink; ctx.font = '700 13px "DM Sans", sans-serif';
        ctx.fillText('they cross here', X(r.x) + 10, Y(r.y) - 10);
      }
      if (state.step >= 4) {
        ctx.setLineDash([6, 5]); ctx.strokeStyle = col.turq; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(X(r.x), Y(r.y)); ctx.lineTo(X(r.x), Y(0)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 5; ctx.strokeStyle = col.turq;
        ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(r.x), Y(0)); ctx.stroke();
        ctx.fillStyle = col.turq; ctx.font = '700 14px "JetBrains Mono", monospace';
        ctx.fillText('x ≈ ' + K.round(r.x, 4), X(r.x / 2) - 30, Y(0) - 10);
      }
    }

    function update() {
      var c = +cIn.value, d = +dIn.value;
      var r = K.cubic(c, d);
      $('kh-c-out').textContent = c;
      $('kh-d-out').textContent = d;
      $('kh-eq').textContent = 'x³ + ' + c + 'x = ' + d;
      $('kh-a').textContent = K.round(r.a, 4);
      $('kh-b').textContent = K.round(r.b, 4);
      var shown = state.step >= 4;
      $('kh-x').textContent = shown ? K.round(r.x, 4) : '?';
      $('kh-check').textContent = shown ? K.round(r.check, 4) : '?';
      for (var i = 0; i < steps.length; i++) steps[i].classList.toggle('is-on', i < state.step);
      $('kh-step-back').disabled = state.step <= 1;
      $('kh-step-next').disabled = state.step >= 4;
      var out = $('kh-cubic-readout');
      var g = parseFloat(guess.value);
      if (!shown) {
        out.textContent = 'Step ' + state.step + ' of 4. Make a guess for x, then step on to see where the curves cross.';
      } else {
        var msg = 'The curves cross at x ≈ ' + K.round(r.x, 4) + ', and ' + K.round(r.x, 4) + '³ + ' + c + '×' + K.round(r.x, 4) + ' = ' + K.round(r.check, 3) + '. Cardano’s formula gives ' + K.round(r.cardano, 4) + '.';
        if (isFinite(g)) {
          var err = Math.abs(g - r.x);
          msg += ' Your guess ' + g + ' was ' + (err < 0.05 ? 'spot on.' : 'off by ' + K.round(err, 3) + '.');
        }
        out.textContent = msg;
      }
      draw();
    }

    view = sizer(canvas, draw);
    cIn.addEventListener('input', update);
    dIn.addEventListener('input', update);
    guess.addEventListener('input', update);
    $('kh-step-next').addEventListener('click', function () { state.step = Math.min(4, state.step + 1); update(); });
    $('kh-step-back').addEventListener('click', function () { state.step = Math.max(1, state.step - 1); update(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-kh-preset]'), function (btn) {
      btn.addEventListener('click', function () {
        var p = btn.getAttribute('data-kh-preset').split(',');
        cIn.value = p[0]; dIn.value = p[1];
        state.step = 1; guess.value = '';
        update();
      });
    });
    onTheme(draw);
    update();
  })();

  /* ── Lab 2: calendars ───────────────────────────────────────────── */
  (function calendarLab() {
    var years = $('kh-years');
    if (!years) return;
    var SCALE = 10; // days at the bar's edge
    var tracks = document.querySelectorAll('#kh-tracks .kh-track');

    function update() {
      var n = +years.value;
      $('kh-years-out').textContent = fmt(n);
      var parts = [];
      Array.prototype.forEach.call(tracks, function (tr) {
        var rule = K.CALENDARS[tr.getAttribute('data-cal')];
        var dd = K.drift(rule, n);
        var pos = 50 + Math.max(-1, Math.min(1, dd / SCALE)) * 46;
        tr.querySelector('.kh-track-dot').style.left = pos + '%';
        var off = Math.abs(dd) > SCALE ? ' (off the chart)' : '';
        tr.querySelector('.kh-track-val').textContent = (dd >= 0 ? '+' : '') + K.round(dd, 2) + ' d' + off;
        parts.push(rule.name.split(' ')[0] + ' ' + K.round(Math.abs(dd), 2) + ' days (one day every ' + fmt(K.yearsPerDay(rule)) + ' years)');
      });
      $('kh-cal-readout').textContent = 'After ' + fmt(n) + ' years the spring equinox has slipped: ' + parts.join('; ') + '. The bars run ±' + SCALE + ' days.';
    }
    years.addEventListener('input', update);
    update();

    var cycle = $('kh-cycle');
    if (cycle) {
      var leaps = K.jalaliLeaps();
      for (var y = 1; y <= 33; y++) {
        var cell = document.createElement('span');
        cell.textContent = y;
        if (leaps.indexOf(y) >= 0) cell.className = 'is-leap';
        cycle.appendChild(cell);
      }
    }

    var lIn = $('kh-leaps'), cyIn = $('kh-cycle-len'), ruleOut = $('kh-rule-readout');
    function ruleUpdate() {
      var L = Math.max(0, Math.round(+lIn.value || 0)), N = Math.max(1, Math.round(+cyIn.value || 1));
      var rule = { leaps: L, cycle: N };
      var mean = K.meanYear(rule);
      var err = mean - K.TROPICAL_YEAR;
      var ypd = K.yearsPerDay(rule);
      var verdict = ypd > 4000 ? 'Better than the Gregorian calendar.' : ypd > 3000 ? 'About as good as the Gregorian calendar.' : ypd > 500 ? 'Decent, but it drifts.' : 'It drifts quickly.';
      ruleOut.textContent = L + ' leap days every ' + N + ' years makes a mean year of ' + K.round(mean, 6) + ' days, ' +
        (err >= 0 ? 'too long' : 'too short') + ' by ' + K.round(Math.abs(err) * 86400, 1) + ' seconds. It slips a whole day every ' + fmt(ypd) + ' years. ' + verdict;
    }
    lIn.addEventListener('input', ruleUpdate);
    cyIn.addEventListener('input', ruleUpdate);
    ruleUpdate();

    var ladderBtn = $('kh-ladder-btn'), ladder = $('kh-ladder');
    var NAMES = { '1/4': 'Julian', '8/33': 'Khayyam’s pattern' };
    K.convergents(K.TROPICAL_YEAR - 365, 5).slice(1).forEach(function (f) {
      var key = f.num + '/' + f.den;
      var li = document.createElement('li');
      if (key === '8/33') li.className = 'is-khayyam';
      var ypd = K.yearsPerDay({ leaps: f.num, cycle: f.den });
      li.innerHTML = '<b>' + key + '</b><span>= ' + K.round(f.num / f.den, 6) + '</span><span>one day every ' + fmt(ypd) + ' years</span>' + (NAMES[key] ? '<strong>' + NAMES[key] + '</strong>' : '');
      ladder.appendChild(li);
    });
    var tail = document.createElement('li');
    tail.textContent = 'Past 31/128 the fractions stop mattering: the length of the year itself changes by about half a second a century as Earth’s orbit and spin slowly change.';
    ladder.appendChild(tail);
    ladderBtn.addEventListener('click', function () {
      var open = ladder.hidden;
      ladder.hidden = !open;
      ladderBtn.setAttribute('aria-expanded', String(open));
      ladderBtn.textContent = open ? 'Hide the best fractions' : 'Show the best fractions';
    });
  })();

  /* ── Lab 3: Khayyam–Saccheri quadrilateral ──────────────────────── */
  (function saccheriLab() {
    var canvas = $('kh-sac-canvas');
    if (!canvas) return;
    var kIn = $('kh-k'), sIn = $('kh-size');
    var view = null;

    function angleArc(ctx, x, y, from, to, r) {
      ctx.beginPath(); ctx.arc(x, y, r, from, to, from > to); ctx.stroke();
    }

    function draw() {
      if (!view) return;
      var ctx = view.ctx, W = view.width, H = view.height, col = palette();
      var Kv = +kIn.value, size = +sIn.value;
      var theta = K.summitAngle(Kv, size, size * 1.2) * Math.PI / 180;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = col.paper; ctx.fillRect(0, 0, W, H);

      var w = Math.min(W * 0.62, H * 1.1) * (0.55 + size * 0.28);
      var h = w / 1.2;
      var baseY = H * 0.86, cx = W / 2;
      var A = { x: cx - w / 2, y: baseY }, B = { x: cx + w / 2, y: baseY };
      var D = { x: A.x, y: baseY - h }, C = { x: B.x, y: baseY - h };
      var py = D.y + (w / 2) * Math.cos(theta) / Math.max(0.05, Math.sin(theta));
      py = Math.max(D.y - h * 0.9, Math.min(baseY - 18, py));
      var P = { x: cx, y: py };

      ctx.lineWidth = 3; ctx.strokeStyle = col.lapis;
      ctx.beginPath(); ctx.moveTo(D.x, D.y); ctx.lineTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(C.x, C.y); ctx.stroke();
      ctx.strokeStyle = col.pom;
      ctx.beginPath(); ctx.moveTo(D.x, D.y); ctx.quadraticCurveTo(P.x, P.y, C.x, C.y); ctx.stroke();

      // right-angle marks at the base
      ctx.lineWidth = 1.5; ctx.strokeStyle = col.muted;
      var q = 14;
      ctx.strokeRect(A.x, A.y - q, q, q);
      ctx.strokeRect(B.x - q, B.y - q, q, q);

      // summit angle arcs (between the leg going down and the summit's tangent)
      var down = Math.PI / 2;
      ctx.strokeStyle = col.turq; ctx.lineWidth = 2.5;
      var tanD = Math.atan2(P.y - D.y, P.x - D.x);
      var tanC = Math.atan2(P.y - C.y, P.x - C.x);
      angleArc(ctx, D.x, D.y, tanD, down, 24);
      angleArc(ctx, C.x, C.y, down, tanC, 24);

      ctx.fillStyle = col.ink; ctx.font = '700 14px "DM Sans", sans-serif';
      ctx.fillText('A', A.x - 16, A.y + 4); ctx.fillText('B', B.x + 6, B.y + 4);
      ctx.fillText('D', D.x - 16, D.y + 4); ctx.fillText('C', C.x + 6, C.y + 4);
      var deg = Math.round(theta * 180 / Math.PI);
      ctx.fillStyle = col.turq; ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillText(deg + '°', D.x + 10, D.y + (deg < 90 ? 34 : -10));
      ctx.fillText(deg + '°', C.x - 42, C.y + (deg < 90 ? 34 : -10));
      ctx.fillStyle = col.muted; ctx.font = '600 12px "DM Sans", sans-serif';
      ctx.fillText('base AB · equal legs AD, BC at right angles', A.x, Math.min(H - 4, A.y + 22));
    }

    function update() {
      var Kv = +kIn.value, size = +sIn.value;
      $('kh-k-out').textContent = (Kv > 0 ? '+' : '') + Kv.toFixed(2);
      $('kh-size-out').textContent = size.toFixed(1);
      var deg = K.summitAngle(Kv, size, size * 1.2);
      var kind = Math.abs(Kv) < 0.001
        ? 'Flat plane: the summit angles are right angles, exactly as Euclid’s parallel postulate demands. This is the case Khayyam defended.'
        : Kv > 0
          ? 'Positive curvature, like a sphere: the summit angles are obtuse. Khayyam and Saccheri both ruled this out, and on a flat page they were right. On the globe, it is simply true.'
          : 'Negative curvature, a saddle-shaped “hyperbolic” plane: the summit angles are acute. Saccheri thought this led to contradiction. Lobachevsky and Bolyai showed it never does.';
      $('kh-sac-readout').textContent = 'Summit angles ≈ ' + K.round(deg, 1) + '°. ' + kind;
      draw();
    }
    view = sizer(canvas, draw);
    kIn.addEventListener('input', update);
    sIn.addEventListener('input', update);
    onTheme(draw);
    update();
  })();

  /* ── Lab 4: binomial triangle ───────────────────────────────────── */
  (function triangleLab() {
    var nIn = $('kh-n'), tri = $('kh-triangle');
    if (!nIn || !tri) return;
    function update() {
      var n = +nIn.value;
      $('kh-n-out').textContent = n;
      tri.textContent = '';
      for (var r = 0; r <= Math.max(n, 6); r++) {
        var row = document.createElement('div');
        if (r === n) row.className = 'is-on';
        K.pascalRow(r).forEach(function (v) {
          var s = document.createElement('span');
          s.textContent = v;
          row.appendChild(s);
        });
        tri.appendChild(row);
      }
      var SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
      var sup = function (k) { return String(k).split('').map(function (d) { return SUPS[+d]; }).join(''); };
      $('kh-expand').textContent = '(a + b)' + (n === 1 ? '' : sup(n)) + ' = ' + K.expand(n) + '. The coefficients add up to 2' + sup(n) + ' = ' + Math.pow(2, n) + '.';
    }
    nIn.addEventListener('input', update);
    update();
  })();

  /* ── Lab 5: three layers ────────────────────────────────────────── */
  (function translationLab() {
    var box = $('kh-quatrains'), tabs = $('kh-q-tabs'), diffBox = $('kh-diff');
    if (!box || !tabs) return;
    var items = Array.prototype.slice.call(box.querySelectorAll('[data-kh-q]'));
    if (!items.length) return;
    box.classList.add('is-enhanced');

    function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
    function linesOf(p) {
      return p.innerHTML.split(/<br\s*\/?>/i).map(function (html) {
        var t = document.createElement('span'); t.innerHTML = html; return t.textContent.trim();
      });
    }

    items.forEach(function (art, i) {
      var p59 = art.querySelector('[data-layer="1859"] [data-kh-lines]');
      var p89 = art.querySelector('[data-layer="1889"] [data-kh-lines]');
      art._orig = [p59.innerHTML, p89.innerHTML];
      var dash = function (t) { return t.replace(/\s*—\s*/g, ' — '); };
      var a = dash(linesOf(p59).join(' ¶ ')), b = dash(linesOf(p89).join(' ¶ '));
      var ops = K.diffWords(a, b);
      // A word cut in one place and added in another was moved, not changed: leave it unmarked.
      var norm = function (t) { return t.toLowerCase().replace(/[^a-z]/g, ''); };
      var added = {}, cut = {};
      ops.forEach(function (o) {
        var n = norm(o.text);
        if (!n) return;
        if (o.op === 'add') added[n] = (added[n] || 0) + 1;
        if (o.op === 'del') cut[n] = (cut[n] || 0) + 1;
      });
      function render(side) {
        return ops.filter(function (o) { return side === 59 ? o.op !== 'add' : o.op !== 'del'; }).map(function (o) {
          if (o.text === '¶') return '<br>';
          var t = escapeHtml(o.text), n = norm(o.text);
          if (o.op === 'add' && n && !cut[n]) return '<mark>' + t + '</mark>';
          if (o.op === 'del' && n && !added[n]) return '<del>' + t + '</del>';
          return t;
        }).join(' ').replace(/ <br> /g, '<br>').replace(/ — /g, '—').replace(/ —<br>/g, '—<br>');
      }
      art._diff = [render(59), render(89)];
      var meta = document.createElement('p');
      meta.className = 'kh-q-meta';
      meta.textContent = Math.round(K.kept(a.replace(/ ¶/g, ''), b.replace(/ ¶/g, '')) * 100) + '% of the 1859 words survive into 1889 in the same order.';
      art.appendChild(meta);

      art.id = art.id || 'kh-q-' + i;
      art.setAttribute('role', 'tabpanel');
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'kh-btn is-ghost';
      tab.setAttribute('role', 'tab');
      tab.id = art.id + '-tab';
      tab.setAttribute('aria-controls', art.id);
      art.setAttribute('aria-labelledby', tab.id);
      tab.textContent = art.getAttribute('data-title');
      tab.addEventListener('click', function () { select(i, true); });
      tab.addEventListener('keydown', function (e) {
        var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null;
        if (next === null) return;
        e.preventDefault();
        select((next + items.length) % items.length, true);
        tabs.children[(next + items.length) % items.length].focus();
      });
      tabs.appendChild(tab);
    });

    function applyDiff() {
      var on = !diffBox || diffBox.checked;
      items.forEach(function (art) {
        var p59 = art.querySelector('[data-layer="1859"] [data-kh-lines]');
        var p89 = art.querySelector('[data-layer="1889"] [data-kh-lines]');
        p59.innerHTML = on ? art._diff[0] : art._orig[0];
        p89.innerHTML = on ? art._diff[1] : art._orig[1];
      });
    }
    function select(index) {
      items.forEach(function (art, i) {
        art.hidden = i !== index;
        var tab = tabs.children[i];
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
      });
    }
    if (diffBox) diffBox.addEventListener('change', applyDiff);
    applyDiff();
    var start = items.findIndex(function (a) { return a.id === 'q-book'; });
    select(start < 0 ? 0 : start);

    // Print shows every quatrain; restore the tab view afterwards.
    window.addEventListener('beforeprint', function () { items.forEach(function (a) { a.hidden = false; }); });
    window.addEventListener('afterprint', function () {
      var cur = 0;
      Array.prototype.forEach.call(tabs.children, function (t, i) { if (t.getAttribute('aria-selected') === 'true') cur = i; });
      select(cur);
    });
  })();

  /* ── Lab 6: quatrain forge ──────────────────────────────────────── */
  (function forgeLab() {
    var forge = $('kh-forge');
    if (!forge) return;
    var inputs = [1, 2, 3, 4].map(function (n) { return $('kh-line-' + n); });
    var chips = forge.querySelectorAll('[data-kh-letter]');
    var syls = forge.querySelectorAll('[data-kh-syl]');
    var override = [null, null, null, null];
    var CYCLE = ['A', 'B', 'C', 'D', null];
    var SUBJECTS = [
      'a phone at 1% battery', 'the last day of summer', 'a chess game you are losing', 'a text you can’t unsend',
      'a clay pot on a shelf', 'the night sky over a city', 'an old photograph', 'the first snow', 'a clock that runs fast',
      'a test you already handed in', 'a candle at the end of the night', 'a garden in winter'
    ];
    var MODEL = [
      'With them the seed of Wisdom did I sow,',
      'And with mine own hand wrought to make it grow;',
      'And this was all the Harvest that I reap’d—',
      '“I came like Water, and like Wind I go.”'
    ];

    function update() {
      var lines = inputs.map(function (i) { return i.value; });
      var auto = K.scheme(lines);
      var letters = auto.map(function (l, i) { return override[i] || l; });
      var res = K.checkRubai(lines, letters);
      letters.forEach(function (l, i) {
        var filled = lines[i].trim();
        chips[i].textContent = filled ? l : '·';
        chips[i].setAttribute('data-letter', filled ? l : '');
        chips[i].setAttribute('aria-label', 'Rhyme letter for line ' + (i + 1) + ': ' + (filled ? l : 'empty') + (override[i] ? ' (set by you)' : '') + '. Press to change.');
        syls[i].textContent = res.syllables[i] + ' syl';
      });
      var filledCount = lines.filter(function (l) { return l.trim(); }).length;
      $('kh-verdict').textContent = filledCount < 4 ? '' : res.isRubai ? (res.hasTurn ? res.pattern + ': a true rubāʿī.' : res.pattern + ': a rubāʿī, without the turn.') : res.pattern + ': not a rubāʿī yet.';
      var notes = $('kh-forge-notes');
      notes.textContent = '';
      res.notes.forEach(function (n) { var li = document.createElement('li'); li.textContent = n; notes.appendChild(li); });
      var chain = $('kh-chain');
      if (res.hasTurn) {
        var w = lines[2].trim().split(/\s+/).pop().replace(/[^A-Za-z’'-]/g, '');
        chain.textContent = 'Chain it like Frost: your next stanza’s lines 1, 2 and 4 should rhyme with “' + w + '”.';
      } else chain.textContent = '';
    }

    inputs.forEach(function (i) { i.addEventListener('input', update); });
    Array.prototype.forEach.call(chips, function (chip, i) {
      chip.addEventListener('click', function () {
        var cur = override[i] || chip.getAttribute('data-letter') || null;
        var idx = CYCLE.indexOf(cur);
        override[i] = CYCLE[(idx + 1) % CYCLE.length];
        update();
      });
    });
    $('kh-prompt-btn').addEventListener('click', function () {
      $('kh-prompt').textContent = 'Subject: ' + SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)] + '.';
    });
    $('kh-example').addEventListener('click', function () {
      inputs.forEach(function (i, n) { i.value = MODEL[n]; });
      override = [null, null, null, null];
      update();
    });
    $('kh-clear').addEventListener('click', function () {
      inputs.forEach(function (i) { i.value = ''; });
      override = [null, null, null, null];
      update();
    });
    update();
    // Visitor memory may restore saved lines after load.
    window.addEventListener('load', function () { setTimeout(update, 400); });
  })();

  /* ── Quiz ───────────────────────────────────────────────────────── */
  (function quiz() {
    var form = $('kh-quiz');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var sets = form.querySelectorAll('fieldset[data-answer]');
      var right = 0;
      Array.prototype.forEach.call(sets, function (fs) {
        var picked = fs.querySelector('input:checked');
        var fb = fs.querySelector('.kh-fb');
        var ok = !!picked && picked.value === fs.getAttribute('data-answer');
        if (ok) right++;
        fb.className = 'kh-fb' + (picked ? (ok ? ' is-right' : ' is-wrong') : '');
        fb.textContent = picked ? (ok ? 'Correct. ' : 'Not quite. ') + fb.getAttribute('data-why') : 'Choose an answer.';
      });
      $('kh-score').textContent = right + ' of ' + sets.length + ' correct.';
    });
  })();
})();
