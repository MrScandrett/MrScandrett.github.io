/*
 * Shared helpers for the electronics-engineering lessons (ee-lab.css):
 *   EELab.fmt(value, unit)   engineering-prefix formatting: 0.0047 → "4.7 m"
 *   EELab.slider(input, fn)  binds a range input to its <output> and a callback
 *   EELab.scope(canvas)      a small oscilloscope that plots traces over time
 * plus the Quick Check quiz wiring (.ee-question / .ee-option / #ee-quiz-reset).
 */
(function (global) {
  'use strict';

  var PREFIXES = [
    [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']
  ];

  function fmt(value, unit, digits) {
    unit = unit || '';
    if (!isFinite(value)) return '∞ ' + unit;
    if (value === 0) return '0 ' + unit;
    var abs = Math.abs(value);
    var p = PREFIXES[PREFIXES.length - 1];
    for (var i = 0; i < PREFIXES.length; i++) {
      if (abs >= PREFIXES[i][0] * 0.9995) { p = PREFIXES[i]; break; }
    }
    var scaled = value / p[0];
    var d = digits != null ? digits : (Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2);
    var text = scaled.toFixed(d);
    if (text.indexOf('.') >= 0) text = text.replace(/0+$/, '').replace(/\.$/, '');
    return text + ' ' + p[1] + unit;
  }

  function slider(input, onChange, format) {
    var out = input.closest('label') && input.closest('label').querySelector('output');
    function read() {
      var v = Number(input.value);
      if (out) out.textContent = format ? format(v) : String(v);
      if (onChange) onChange(v);
    }
    input.addEventListener('input', read);
    read();
    return read;
  }

  // A plotting surface styled like a scope: 10 × 8 grid, traces scaled by the
  // caller in volts per division and seconds per division.
  function scope(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0;
    function size() {
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      w = Math.max(200, rect.width); h = Math.max(120, rect.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    if (global.ResizeObserver) new ResizeObserver(function () { size(); if (api.last) api.draw(api.last); }).observe(canvas);

    var api = {
      last: null,
      // traces: [{ color, points: [[t, v], …] }], tDiv, vDiv, vOffsetDiv, markers: [{t, label}]
      draw: function (frame) {
        api.last = frame;
        ctx.clearRect(0, 0, w, h);
        var gx = w / 10, gy = h / 8;
        ctx.strokeStyle = 'rgba(120,220,170,0.16)';
        ctx.lineWidth = 1;
        for (var i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(i * gx, 0); ctx.lineTo(i * gx, h); ctx.stroke(); }
        for (var j = 0; j <= 8; j++) { ctx.beginPath(); ctx.moveTo(0, j * gy); ctx.lineTo(w, j * gy); ctx.stroke(); }
        var zeroY = h - (frame.zeroDiv != null ? frame.zeroDiv : 1) * gy;
        ctx.strokeStyle = 'rgba(160,240,200,0.35)';
        ctx.beginPath(); ctx.moveTo(0, zeroY); ctx.lineTo(w, zeroY); ctx.stroke();
        (frame.markers || []).forEach(function (m) {
          var x = (m.t / frame.tDiv) * gx;
          if (x < 0 || x > w) return;
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(255,255,255,0.45)';
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.font = '700 11px Inter, system-ui, sans-serif';
          ctx.fillText(m.label, Math.min(x + 4, w - 40), 14);
        });
        (frame.traces || []).forEach(function (tr) {
          var pts = tr.points;
          if (!pts.length) return;
          var vDiv = tr.vDiv || frame.vDiv;
          ctx.strokeStyle = tr.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          pts.forEach(function (p, k) {
            var x = (p[0] / frame.tDiv) * gx;
            var y = zeroY - (p[1] / vDiv) * gy;
            if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.stroke();
          if (tr.dot) {
            var last = pts[pts.length - 1];
            ctx.fillStyle = tr.color;
            ctx.beginPath();
            ctx.arc((last[0] / frame.tDiv) * gx, zeroY - (last[1] / vDiv) * gy, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        if (frame.threshold != null) {
          var ty = zeroY - (frame.threshold / frame.vDiv) * gy;
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = 'rgba(248,113,113,0.8)';
          ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(w, ty); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    };
    return api;
  }

  function quiz() {
    document.querySelectorAll('.ee-question').forEach(function (q) {
      var feedback = q.querySelector('.ee-q-feedback');
      q.querySelectorAll('.ee-option').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var right = btn.dataset.choice === q.dataset.answer;
          q.querySelectorAll('.ee-option').forEach(function (b) { b.classList.remove('is-right', 'is-wrong'); });
          btn.classList.add(right ? 'is-right' : 'is-wrong');
          feedback.className = 'ee-q-feedback ' + (right ? 'is-right' : 'is-wrong');
          feedback.textContent = (right ? 'Correct. ' : 'Not quite. ') + q.dataset.explanation;
        });
      });
    });
    var reset = document.getElementById('ee-quiz-reset');
    if (reset) reset.addEventListener('click', function () {
      document.querySelectorAll('.ee-option').forEach(function (b) { b.classList.remove('is-right', 'is-wrong'); });
      document.querySelectorAll('.ee-q-feedback').forEach(function (f) { f.textContent = ''; f.className = 'ee-q-feedback'; });
    });
  }

  // Tab groups: <div class="ee-tabs" role="tablist" data-tabs="name"> with
  // buttons carrying data-value; calls onSelect(value).
  function tabs(list, onSelect) {
    var buttons = Array.prototype.slice.call(list.querySelectorAll('button'));
    function select(btn, focus) {
      buttons.forEach(function (b) {
        var on = b === btn;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      if (focus) btn.focus();
      onSelect(btn.dataset.value);
    }
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { select(b); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        select(buttons[(i + d + buttons.length) % buttons.length], true);
      });
    });
    var start = buttons.filter(function (b) { return b.getAttribute('aria-selected') === 'true'; })[0] || buttons[0];
    select(start);
  }

  global.EELab = { fmt: fmt, slider: slider, scope: scope, tabs: tabs };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', quiz);
  else quiz();
})(window);
