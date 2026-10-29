/* Checked, print-flat nested rings. No hidden mesh nudges or skipped rings. */
import { PRESETS, rings, checks, recipe, stl } from './codeblocks-rings.mjs';
(function () {
  'use strict';
  if (!window.SimKit) return;
  var canvas = document.getElementById('cb-canvas');
  if (!canvas) return;
  var colors = SimKit.theme.colors();
  SimKit.theme.onChange(function (c) { colors = c; render(); });
  var PLA = 1.24;
  var ids = ['n', 'r', 'gap', 'h', 'w'], inputs = {}, outputs = {};
  ids.forEach(function(k) { inputs[k] = document.getElementById('cb-' + k); outputs[k] = document.getElementById('cb-' + k + '-out'); });
  var program = document.getElementById('cb-program');
  var readout = document.getElementById('cb-readout');
  function params() { var p = {}; ids.forEach(k => { p[k] = +inputs[k].value; }); return p; }
  var view = SimKit.canvas2d(canvas, { height: 340, onResize: function () { render(); } });

  function render() {
    if (!view) return;
    var p = params(), list = rings(p);
    if (checks(p).some(c => !c.ok)) {
      ctxInvalid(); updateText(p, list); return;
    }
    var ctx = view.ctx, W = view.width, H = view.height;
    ctx.clearRect(0, 0, W, H);
    if (!list.length) { updateText(p, list); return; }

    // A top view shows the actual clearance without perspective hiding gaps.
    var s = Math.min((W - 48) / (2 * p.r), (H - 70) / (2 * p.r));
    var cx = W / 2, cy = H / 2;
    list.forEach(function (g) {
      var hue = 190 - (g.i - 1) * (150 / Math.max(1, p.n - 1));
      ctx.fillStyle = 'hsl(' + hue + ',65%,56%)';
      ctx.strokeStyle = colors.text;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, g.R * s, 0, Math.PI * 2);
      ctx.moveTo(cx + g.r * s, cy);
      ctx.arc(cx, cy, g.r * s, 0, Math.PI * 2, true);
      ctx.fill('evenodd'); ctx.stroke();
    });
    ctx.fillStyle = colors.text;
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TOP VIEW', cx, cy - 10);
    ctx.fillText('Height: ' + fmt(p.h) + ' mm', cx, cy + 12);
    ctx.textAlign = 'left';

    // Scale bar: 10 mm.
    ctx.strokeStyle = colors.text; ctx.fillStyle = colors.text; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(12, H - 12); ctx.lineTo(12 + 10 * s, H - 12); ctx.stroke();
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('10 mm', 14 + 10 * s, H - 8);

    updateText(p, list);
  }


  function ctxInvalid() {
    view.ctx.clearRect(0, 0, view.width, view.height);
    view.ctx.fillStyle = colors.text;
    view.ctx.font = '16px system-ui';
    view.ctx.fillText('Adjust dimensions to pass all checks.', 16, view.height / 2);
  }
  function fmt(n) { return Number(n.toFixed(3)).toString(); }
  function updateText(p, list) {
    ids.forEach(k => { outputs[k].textContent = fmt(p[k]); });
    var valid = checks(p).every(c => c.ok);
    document.getElementById('cb-stl').disabled = !valid;
    document.getElementById('cb-recipe').disabled = !valid;
    var lines = recipe(p).split('\n').slice(2, 11);
    program.replaceChildren(...lines.map(function(line, i) {
      var row = document.createElement('div');
      row.className = 'cb-block ' + (i === 0 || i === 7 ? 'cb-data' : i === 1 || i === 8 ? 'cb-control' : line.includes('Cylinder') ? 'cb-shape' : 'cb-mod');
      if (line.startsWith('  ')) row.style.marginLeft = '1rem';
      row.textContent = line.trim(); return row;
    }));
    document.getElementById('cb-checks').replaceChildren(...checks(p).map(c => {
      var li = document.createElement('li'); li.textContent = (c.ok ? 'PASS · ' : 'FIX · ') + c.text; return li;
    }));
    document.getElementById('cb-dimensions').replaceChildren(...list.map(g => {
      var row = document.createElement('tr');
      [g.i, fmt(g.R * 2), fmt(g.r * 2), '0 / ' + fmt(g.h)].forEach(value => { var cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell); });
      return row;
    }));
    var vol = list.reduce((sum, g) => sum + Math.PI * (g.R*g.R - g.r*g.r) * g.h, 0);
    readout.textContent = valid ? 'Geometry checks passed · ' + p.n + ' separate rings · ' + fmt(p.r*2) + ' × ' + fmt(p.r*2) + ' × ' + fmt(p.h) + ' mm · solid-model estimate ' + fmt(vol/1000) + ' cm³ / ' + fmt(vol/1000*PLA) + ' g PLA. Print a clearance test first.' : 'Not ready to export. Fix the failed checks below; no rings are omitted or resized to hide a problem.';
  }
  function download(content, type, filename) {
    var url = URL.createObjectURL(new Blob([content], { type }));
    var a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  document.getElementById('cb-stl').addEventListener('click', function() {
    var p = params(); if (checks(p).some(c => !c.ok)) return;
    download(stl(rings(p)), 'model/stl', 'nested-rings-' + p.n + '-' + fmt(p.r*2) + 'mm.stl');
  });
  document.getElementById('cb-recipe').addEventListener('click', function() {
    var p = params(); if (checks(p).some(c => !c.ok)) return;
    download(recipe(p), 'text/plain', 'tinkercad-ring-block-checklist.txt');
  });
  function preset(name) { ids.forEach(k => { inputs[k].value = PRESETS[name][k]; }); render(); }
  document.querySelectorAll('[data-cb-preset]').forEach(button => button.addEventListener('click', () => preset(button.dataset.cbPreset)));
  document.getElementById('cb-reset').addEventListener('click', () => preset('quiet'));
  ids.forEach(k => inputs[k].addEventListener('input', render));
  render();
})();
