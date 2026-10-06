/* Capacitors & RC Time: live RC scope bench, capacitor code reader, debounce filter. */
(function () {
  'use strict';

  var fmt = EELab.fmt;
  var NS = 'http://www.w3.org/2000/svg';
  var E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  function e12(idx) {
    if (idx >= 48) return 1e6;
    return Math.round(E12[idx % 12] * Math.pow(10, 2 + Math.floor(idx / 12)));
  }
  var CAPS = [100e-9, 1e-6, 10e-6, 47e-6, 100e-6, 470e-6, 1000e-6, 4700e-6];
  function el(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) {
      // Classed parts get their paint from CSS, which outranks SVG attributes,
      // so per-element paint has to go in as inline style to win.
      if (attrs.class && (k === 'fill' || k === 'stroke' || k === 'stroke-width')) {
        n.style.setProperty(k, typeof attrs[k] === 'number' ? attrs[k] + 'px' : attrs[k]);
      } else n.setAttribute(k, attrs[k]);
    }
    if (text != null) n.textContent = text;
    return n;
  }
  // 1-2-5 sequence step at or above x.
  function nice(x) {
    var p = Math.pow(10, Math.floor(Math.log10(x)));
    var m = x / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  }
  function fmtTime(t) { return fmt(t, 's'); }

  // ── Sim 1: RC charge / discharge on a scope ────────────────────────────
  (function () {
    var svg = document.getElementById('rc-svg');
    var canvas = document.getElementById('rc-scope');
    if (!svg || !canvas) return;
    var VS = 5;
    var SWEEP = 4; // wall-clock seconds to draw one full screen
    var scope = EELab.scope(canvas);
    var s = { r: e12(22), c: CAPS[4], mode: 'charge', t: 0, v0: 0, v: 0, pts: [], cur: [], tDiv: 1, running: true };
    var done = {};
    var parts = {};

    function buildCircuit() {
      svg.appendChild(el('path', { class: 'ee-wire', d: 'M60 72 V30 H180 M60 88 V170 H430 V150 M180 130 V170 M250 90 H300 M380 90 H430 V40' }));
      svg.appendChild(el('path', { class: 'ee-part-line', d: 'M38 72 H82 M48 88 H72' }));
      svg.appendChild(el('text', { class: 'ee-value', x: 30, y: 84, 'text-anchor': 'end' }, '5 V'));
      svg.appendChild(el('circle', { class: 'ee-node', cx: 180, cy: 30, r: 5 }));
      svg.appendChild(el('circle', { class: 'ee-node', cx: 180, cy: 130, r: 5 }));
      svg.appendChild(el('circle', { class: 'ee-node', cx: 250, cy: 90, r: 5 }));
      svg.appendChild(el('text', { class: 'ee-label', x: 172, y: 22, 'text-anchor': 'end' }, 'charge'));
      svg.appendChild(el('text', { class: 'ee-label', x: 172, y: 150, 'text-anchor': 'end' }, 'discharge'));
      parts.lever = el('path', { class: 'ee-part-line', d: '' });
      svg.appendChild(parts.lever);
      svg.appendChild(el('rect', { class: 'ee-part', x: 300, y: 78, width: 80, height: 24, rx: 3 }));
      parts.rLabel = el('text', { class: 'ee-label', x: 340, y: 68, 'text-anchor': 'middle' }, '');
      svg.appendChild(parts.rLabel);
      // Capacitor as a tank whose fill shows V_C.
      svg.appendChild(el('rect', { x: 400, y: 40, width: 60, height: 110, rx: 6, fill: 'var(--ee-sheet)', stroke: 'var(--ee-ink)', 'stroke-width': 2.5 }));
      parts.fill = el('rect', { x: 403, y: 147, width: 54, height: 0, rx: 4, fill: '#fbbf24', opacity: 0.85 });
      svg.appendChild(parts.fill);
      parts.cLabel = el('text', { class: 'ee-label', x: 472, y: 80 }, '');
      svg.appendChild(parts.cLabel);
      parts.vLabel = el('text', { class: 'ee-value', x: 472, y: 102 }, '');
      svg.appendChild(parts.vLabel);
      parts.iLabel = el('text', { class: 'ee-value', x: 340, y: 124, 'text-anchor': 'middle' }, '');
      svg.appendChild(parts.iLabel);
    }

    function current() { return s.mode === 'charge' ? (VS - s.v) / s.r : -s.v / s.r; }

    function restart() {
      var tau = s.r * s.c;
      s.tDiv = nice(6 * tau / 10);
      s.v0 = s.v;
      s.t = 0;
      s.pts = [[0, s.v]];
      s.cur = [[0, current() * s.r]];
      s.running = true;
    }

    function updateText() {
      var tau = s.r * s.c;
      var I = current();
      parts.lever.setAttribute('d', 'M250 90 L' + (s.mode === 'charge' ? '185 34' : '185 126'));
      parts.rLabel.textContent = 'R ' + fmt(s.r, 'Ω');
      parts.cLabel.textContent = 'C ' + fmt(s.c, 'F');
      parts.vLabel.textContent = fmt(s.v, 'V');
      parts.iLabel.textContent = fmt(Math.abs(I), 'A') + (I < -1e-12 ? ' ←' : I > 1e-12 ? ' →' : '');
      var h = Math.max(0, Math.min(1, s.v / VS)) * 104;
      parts.fill.setAttribute('y', 147 - h);
      parts.fill.setAttribute('height', h);
      document.getElementById('rc-tau').textContent = fmtTime(tau);
      document.getElementById('rc-full').textContent = fmtTime(5 * tau);
      document.getElementById('rc-vc').textContent = fmt(s.v, 'V');
      document.getElementById('rc-i').textContent = fmt(Math.abs(I), 'A');
      var screen = 10 * s.tDiv;
      var ratio = screen / SWEEP;
      document.getElementById('rc-tdiv').textContent = fmtTime(s.tDiv) + '/div';
      var coach = document.getElementById('rc-coach');
      var speed = ratio > 1.05 ? 'sped up ' + fmtNum(ratio) + '×' : ratio < 0.95 ? 'slowed down ' + fmtNum(1 / ratio) + '×' : 'shown in real time';
      var frac = s.mode === 'charge' ? (VS - s.v0) > 0.01 ? (s.v - s.v0) / (VS - s.v0) : 1 : s.v0 > 0.01 ? s.v / s.v0 : 0;
      var taus = s.t / tau;
      coach.dataset.tone = 'ok';
      coach.innerHTML = '<strong>' + (s.mode === 'charge' ? 'Charging' : 'Discharging') + ': ' + taus.toFixed(1) + 'τ so far</strong>' +
        (s.mode === 'charge' ? Math.round(frac * 100) + '% of the way from where it started to 5 V. ' : Math.round(frac * 100) + '% of the starting voltage left. ') +
        'The playback is ' + speed + ' so the curve fits the screen.';
    }
    function fmtNum(x) { return x >= 100 ? Math.round(x).toLocaleString() : x >= 10 ? x.toFixed(0) : x.toFixed(1); }

    function markers() {
      var tau = s.r * s.c;
      var m = [];
      for (var k = 1; k <= 5; k++) m.push({ t: k * tau, label: k + 'τ' + (k === 1 ? (s.mode === 'charge' ? ' 63%' : ' 37%') : '') });
      return m;
    }

    function drawScope() {
      scope.draw({
        tDiv: s.tDiv, vDiv: 1, zeroDiv: 2.5,
        markers: markers(),
        traces: [
          { color: '#38bdf8', points: s.cur, vDiv: 2 },
          { color: '#fbbf24', points: s.pts, dot: true }
        ]
      });
    }

    function checkMissions() {
      var tau = s.r * s.c;
      if (s.mode === 'charge' && tau >= 0.9 && tau <= 1.1 && s.v0 < 0.25 && s.t >= tau) done.one = true;
      if (s.mode === 'discharge' && s.v0 > 4.9 && s.v < 1.85) done.drain = true;
      if (s.mode === 'charge' && 5 * tau < 1e-3 && s.v0 < 0.25 && s.t >= 5 * tau) done.fast = true;
      if (s.mode === 'charge' && 5 * tau > 60 && s.t > 0) done.slow = true;
      var n = 0;
      document.querySelectorAll('#rc-missions li').forEach(function (li) {
        var ok = !!done[li.dataset.mission];
        li.classList.toggle('is-done', ok);
        if (ok) n++;
      });
      document.getElementById('rc-score').textContent = n + ' of 4';
    }

    var last = null;
    function frame(ts) {
      requestAnimationFrame(frame);
      if (document.hidden) { last = null; return; }
      var dtWall = last == null ? 0 : Math.min(0.1, (ts - last) / 1000);
      last = ts;
      advance(dtWall);
    }
    function advance(dtWall) {
      if (!s.running || dtWall === 0) return;
      var tau = s.r * s.c;
      var rate = 10 * s.tDiv / SWEEP;
      s.t = Math.min(10 * s.tDiv, s.t + dtWall * rate);
      s.v = s.mode === 'charge' ? VS - (VS - s.v0) * Math.exp(-s.t / tau) : s.v0 * Math.exp(-s.t / tau);
      s.pts.push([s.t, s.v]);
      s.cur.push([s.t, current() * s.r]);
      if (s.t >= 10 * s.tDiv) s.running = false;
      drawScope();
      updateText();
      checkMissions();
    }

    buildCircuit();
    document.querySelectorAll('[data-rc]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        s.mode = btn.dataset.rc;
        document.querySelectorAll('[data-rc]').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        restart(); updateText(); drawScope();
      });
    });
    EELab.slider(document.getElementById('rc-r'), function (v) { s.r = e12(v); restart(); updateText(); drawScope(); }, function (v) { return fmt(e12(v), 'Ω'); });
    EELab.slider(document.getElementById('rc-c'), function (v) { s.c = CAPS[v]; restart(); updateText(); drawScope(); }, function (v) { return fmt(CAPS[v], 'F'); });
    requestAnimationFrame(frame);

    window.RCLab = { state: s, done: done, advance: advance };
  })();

  // ── Capacitor code reader ─────────────────────────────────────────────
  (function () {
    var input = document.getElementById('code-in');
    if (!input) return;
    var out = document.getElementById('code-out');
    var explain = document.getElementById('code-explain');
    function read() {
      var code = input.value.trim();
      if (!/^\d{3}$/.test(code)) {
        out.textContent = '';
        explain.textContent = 'Enter three digits, like 104, 223, or 471.';
        return;
      }
      var digits = Number(code.slice(0, 2));
      var mult = Number(code[2]);
      var factor = mult === 8 ? 0.01 : mult === 9 ? 0.1 : Math.pow(10, mult);
      var pf = digits * factor;
      var f = pf * 1e-12;
      out.textContent = fmt(f, 'F');
      explain.textContent = code.slice(0, 2) + ' followed by ' + (mult >= 8 ? '× ' + factor : mult + ' zero' + (mult === 1 ? '' : 's')) +
        ' = ' + pf.toLocaleString() + ' pF = ' + fmt(f, 'F') + '. ' +
        (f >= 1e-7 && f <= 1e-7 * 1.0001 ? 'That\'s the classic 100 nF decoupling capacitor.' : f < 1e-9 ? 'Tiny values like this show up in radio and timing circuits.' : '');
    }
    input.addEventListener('input', read);
    read();
  })();

  // ── Sim 2: debounce filter ────────────────────────────────────────────
  (function () {
    var canvas = document.getElementById('db-scope');
    if (!canvas) return;
    var scope = EELab.scope(canvas);
    var HI = 3, LO = 1.5, V = 5, DT = 0.005; // ms step
    var END = 40;
    // Contact closes (1) / opens (0) at these times, in ms: a bouncy press and release.
    var EDGES = [[4.0, 1], [4.3, 0], [4.9, 1], [5.2, 0], [6.0, 1], [6.15, 0], [7.2, 1], [26.0, 0], [26.4, 1], [26.9, 0], [27.1, 1], [27.9, 0]];
    function raw(t) {
      var v = 0;
      for (var i = 0; i < EDGES.length && EDGES[i][0] <= t; i++) v = EDGES[i][1];
      return v * V;
    }
    function tauFor(v) { return v === 0 ? 0 : 0.1 * Math.pow(10, (v - 1) / 39 * Math.log10(500)); }

    function simulate(tau) {
      var rawPts = [], fPts = [];
      var y = 0, state = 0, count = 0, firstHigh = null;
      for (var t = 0; t <= END + 1e-9; t += DT) {
        var x = raw(t);
        y = tau <= 0 ? x : x + (y - x) * Math.exp(-DT / tau);
        if (state === 0 && y > HI) { state = 1; count++; if (firstHigh == null) firstHigh = t; }
        else if (state === 1 && y < LO) state = 0;
        if (Math.round(t / DT) % 4 === 0) { rawPts.push([t, x]); fPts.push([t, y]); }
      }
      return { raw: rawPts, filt: fPts, count: count, lag: firstHigh == null ? null : firstHigh - EDGES[0][0] };
    }

    function update(v) {
      var tau = tauFor(v);
      var r = simulate(tau);
      // The HIGH threshold is the scope's dashed line; the LOW one is drawn as a faint trace.
      scope.draw({
        tDiv: 4, vDiv: 1, zeroDiv: 1.5, threshold: HI,
        traces: [{ color: 'rgba(248,113,113,0.55)', points: [[0, LO], [END, LO]] }, { color: '#38bdf8', points: r.raw }, { color: '#fbbf24', points: r.filt }]
      });
      document.getElementById('db-count').textContent = String(r.count);
      document.getElementById('db-lag').textContent = r.lag == null ? 'never' : fmt(r.lag / 1000, 's');
      var coach = document.getElementById('db-coach');
      var good = r.count === 1 && r.lag != null && r.lag < 10;
      if (tau === 0) {
        coach.dataset.tone = 'bad';
        coach.innerHTML = '<strong>No filter</strong>Every bounce crosses the threshold. One push counts as ' + r.count + ' presses, so a menu would skip ahead or a counter would jump.';
      } else if (r.count === 0) {
        coach.dataset.tone = 'bad';
        coach.innerHTML = '<strong>Too slow</strong>The filtered signal never reaches 3 V before you let go. The press is lost completely.';
      } else if (r.count > 1) {
        coach.dataset.tone = 'warn';
        coach.innerHTML = '<strong>Still bouncing</strong>τ = ' + fmt(tau / 1000, 's') + ' is shorter than the gaps between bounces, so the capacitor still crosses both thresholds. Increase τ.';
      } else if (!good) {
        coach.dataset.tone = 'warn';
        coach.innerHTML = '<strong>Clean but laggy</strong>One press, but it registers ' + fmt(r.lag / 1000, 's') + ' late. Above about 10 ms, a game controller starts to feel sluggish. Try a smaller τ.';
      } else {
        coach.dataset.tone = 'ok';
        coach.innerHTML = '<strong>Debounced</strong>Exactly one press, ' + fmt(r.lag / 1000, 's') + ' after first contact. τ = ' + fmt(tau / 1000, 's') + ': for example 10 kΩ with ' + fmt(tau / 1000 / 10000, 'F') + '.';
      }
      return r;
    }

    EELab.slider(document.getElementById('db-tau'), update, function (v) { var t = tauFor(v); return t === 0 ? 'no filter' : fmt(t / 1000, 's'); });
    window.DebounceLab = { simulate: simulate, tauFor: tauFor };
  })();
})();
