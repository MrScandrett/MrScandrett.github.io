/* Optical Illusions Lab: Illusion Maker.
   A design studio for four classic illusions. Students tune the parameters that drive each
   one, hunt for the strongest and the weakest version, then download their design as a PNG.
   Every template draws from its parameters alone, so "Show the truth" can always prove the trick. */
(function () {
  'use strict';
  var OI = window.OI;
  var TAU = Math.PI * 2, W = 720, H = 440, SCALE = 2, GUIDE = OI.GUIDE;

  function mk(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function dashed(ctx, x1, y1, x2, y2) {
    ctx.save(); ctx.strokeStyle = GUIDE; ctx.lineWidth = 2.5; ctx.setLineDash([9, 6]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }
  function label(ctx, x, y, t) {
    ctx.save(); ctx.font = '700 17px system-ui, Segoe UI, Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(t, x, y); ctx.fillStyle = GUIDE; ctx.fillText(t, x, y); ctx.restore();
  }
  function disc(ctx, x, y, r, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

  var TEMPLATES = [
    {
      id: 'cafe-wall', name: 'Café wall',
      brief: '<strong>Challenge:</strong> every row of tiles is perfectly straight. Find the <em>mortar gray</em> and <em>row shift</em> that make the rows tilt the most. Then find a setting where the tilt vanishes completely. What do the two settings tell you about why it works?',
      params: [
        { key: 'tile', label: 'Tile size:', min: 20, max: 90, value: 48, unit: ' px' },
        { key: 'mortar', label: 'Mortar gray:', min: 0, max: 255, value: 128 },
        { key: 'thick', label: 'Mortar width:', min: 0, max: 10, value: 3, unit: ' px' },
        { key: 'shift', label: 'Row shift:', min: 0, max: 50, value: 25, unit: '%' }
      ],
      truth: 'Straight dashed guides along every mortar line.',
      draw: function (ctx, p, truth) {
        var t = p.tile, m = p.thick, rowH = t + m, rows = Math.ceil(H / rowH) + 1, r, x;
        ctx.fillStyle = OI.hex(p.mortar, p.mortar, p.mortar); ctx.fillRect(0, 0, W, H);
        for (r = 0; r < rows; r++) {
          var y = r * rowH + m / 2, off = [0, 1, 2, 1][r % 4] * p.shift / 100 * t;
          ctx.fillStyle = '#fff'; ctx.fillRect(0, y, W, t);
          ctx.fillStyle = '#000';
          for (x = -2 * t + off; x < W; x += 2 * t) ctx.fillRect(x, y, t, t);
        }
        // Row r's tiles span r*rowH + m/2 to (r+1)*rowH - m/2, so each mortar line is centered on r*rowH.
        if (truth) for (r = 1; r < rows; r++) dashed(ctx, 0, r * rowH, W, r * rowH);
      }
    },
    {
      id: 'ebbinghaus', name: 'Ebbinghaus circles',
      brief: '<strong>Challenge:</strong> the two orange circles are always the same size. Make the <em>left</em> one look as small as you can and the right one as big as you can. Then try moving the neighbors far away: does the illusion survive distance?',
      params: [
        { key: 'big', label: 'Big neighbors:', min: 20, max: 56, value: 50, unit: ' px' },
        { key: 'small', label: 'Small neighbors:', min: 5, max: 30, value: 12, unit: ' px' },
        { key: 'gap', label: 'Gap to neighbors:', min: 4, max: 40, value: 14, unit: ' px' },
        { key: 'center', label: 'Orange circle:', min: 18, max: 44, value: 34, unit: ' px' }
      ],
      truth: 'Dashed lines touch the top and bottom of both orange circles.',
      draw: function (ctx, p, truth) {
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
        var cy = H / 2, sets = [[196, p.big], [536, p.small]];
        sets.forEach(function (s) {
          // As many neighbors as fit around the ring without touching (3 to 10).
          var R = p.center + p.gap + s[1], n = Math.max(3, Math.min(10, Math.floor(TAU * R / (s[1] * 2.3))));
          for (var i = 0; i < n; i++) { var a = i * TAU / n; disc(ctx, s[0] + R * Math.cos(a), cy + R * Math.sin(a), s[1], '#64748b'); }
          disc(ctx, s[0], cy, p.center, '#f97316');
        });
        if (truth) {
          dashed(ctx, 0, cy - p.center, W, cy - p.center); dashed(ctx, 0, cy + p.center, W, cy + p.center);
          label(ctx, W / 2, cy + p.center + 26, 'same radius: ' + p.center + ' px');
        }
      }
    },
    {
      id: 'contrast', name: 'One color, two faces',
      brief: '<strong>Challenge:</strong> keep the small squares one single color, and choose the two backgrounds so that people swear the squares are different. Test your design on a classmate before you reveal it. Hint: try backgrounds that are opposite in lightness, then opposite in hue.',
      params: [
        { key: 'target', label: 'Square color:', type: 'color', value: '#9c8a6a' },
        { key: 'left', label: 'Left background:', type: 'color', value: '#3b2a68' },
        { key: 'right', label: 'Right background:', type: 'color', value: '#f3d36b' },
        { key: 'size', label: 'Square size:', min: 30, max: 200, value: 110, unit: ' px' }
      ],
      truth: 'A bridge of the very same color joins the two squares.',
      draw: function (ctx, p, truth) {
        ctx.fillStyle = p.left; ctx.fillRect(0, 0, W / 2, H);
        ctx.fillStyle = p.right; ctx.fillRect(W / 2, 0, W / 2, H);
        var s = p.size, cy = H / 2;
        ctx.fillStyle = p.target;
        if (truth) ctx.fillRect(W / 4, cy - 12, W / 2, 24);
        ctx.fillRect(W / 4 - s / 2, cy - s / 2, s, s);
        ctx.fillRect(3 * W / 4 - s / 2, cy - s / 2, s, s);
        if (truth) label(ctx, W / 2, cy + s / 2 + 34, 'both squares: ' + p.target);
      }
    },
    {
      id: 'zollner', name: 'Zöllner lines',
      brief: '<strong>Challenge:</strong> the long lines are exactly parallel. Which <em>hatch angle</em> makes them look the most tilted? Is 45° the winner, or does a shallower or steeper angle work better? Record the angle where the illusion is strongest and where it disappears.',
      params: [
        { key: 'angle', label: 'Hatch angle:', min: 5, max: 85, value: 45, unit: '°' },
        { key: 'len', label: 'Hatch length:', min: 10, max: 70, value: 36, unit: ' px' },
        { key: 'space', label: 'Hatch spacing:', min: 8, max: 40, value: 18, unit: ' px' },
        { key: 'weight', label: 'Line weight:', min: 1, max: 8, value: 3, unit: ' px' }
      ],
      truth: 'The hatches fade so only the parallel lines remain.',
      draw: function (ctx, p, truth) {
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
        var n = 7, x0 = 50, x1 = W - 50, gapY = (H - 60) / (n - 1), a = p.angle * Math.PI / 180;
        ctx.lineCap = 'round';
        for (var i = 0; i < n; i++) {
          var y = 30 + i * gapY, dir = i % 2 ? 1 : -1;
          var dx = Math.cos(a) * p.len / 2, dy = Math.sin(a) * p.len / 2 * dir;
          ctx.strokeStyle = truth ? 'rgba(17,17,17,0.12)' : '#111'; ctx.lineWidth = Math.max(1.5, p.weight * 0.8);
          ctx.beginPath();
          for (var x = x0 + p.space / 2; x < x1; x += p.space) { ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); }
          ctx.stroke();
          ctx.strokeStyle = '#111'; ctx.lineWidth = p.weight;
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        }
        if (truth) label(ctx, W / 2, H - 6, 'all seven lines are exactly parallel');
      }
    }
  ];

  OI.add({
    id: 'illusion-maker', sec: 'make', kind: 'live', wide: true,
    title: 'Illusion Maker: design, test, download',
    why: '<p>Every illusion has <em>parameters</em>: numbers you can turn up or down. Turning them is how vision scientists find out which part of a picture causes the effect. If the café-wall tilt disappears when the mortar is pure black or pure white, then the mid-gray mortar must be part of the cause. This is the same strategy as a fair test in any science experiment: change one thing, keep the rest the same, and watch what happens.</p>',
    mount: function (stage) {
      var canvas = OI.canvas(W * SCALE, H * SCALE);
      canvas.className = 'oi-live-canvas oi-maker-canvas'; canvas.setAttribute('role', 'img');
      var ctx = canvas.getContext('2d');
      var picker = mk('div', 'oi-maker-picker'); picker.setAttribute('role', 'group'); picker.setAttribute('aria-label', 'Choose an illusion to design');
      var brief = mk('p', 'oi-maker-brief');
      var params = mk('div', 'oi-maker-params');
      var actions = mk('div', 'oi-controls');
      var status = mk('p', 'oi-live-cap'); status.setAttribute('aria-live', 'polite');
      stage.appendChild(picker); stage.appendChild(canvas); stage.appendChild(brief); stage.appendChild(params); stage.appendChild(actions); stage.appendChild(status);

      var tpl = TEMPLATES[0], vals = {}, truth = false, pending = false;

      function paint() {
        pending = false;
        ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
        tpl.draw(ctx, vals, truth);
        canvas.setAttribute('aria-label', tpl.name + ' designed with ' + tpl.params.map(function (q) { return q.label.replace(':', '') + ' ' + vals[q.key] + (q.unit || ''); }).join(', ') + (truth ? '. ' + tpl.truth : ''));
      }
      function schedule() { if (!pending) { pending = true; requestAnimationFrame(paint); } }

      function choose(t) {
        tpl = t; vals = {}; truth = false;
        truthBtn.setAttribute('aria-pressed', 'false'); truthBtn.textContent = 'Show the truth';
        picker.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.id === t.id ? 'true' : 'false'); });
        brief.innerHTML = t.brief;
        params.innerHTML = '';
        t.params.forEach(function (q) {
          vals[q.key] = q.value;
          if (q.type === 'color') {
            var lab = mk('label', 'oi-color'), inp = document.createElement('input');
            inp.type = 'color'; inp.value = q.value;
            inp.addEventListener('input', function () { vals[q.key] = inp.value; schedule(); });
            lab.appendChild(document.createTextNode(q.label + ' ')); lab.appendChild(inp);
            params.appendChild(lab);
          } else {
            params.appendChild(OI.slider(q, function (v) { vals[q.key] = v; schedule(); }));
          }
        });
        status.textContent = '';
        paint();
      }

      TEMPLATES.forEach(function (t) {
        var b = OI.button(t.name, function () { choose(t); }, 'oi-chip');
        b.dataset.id = t.id; picker.appendChild(b);
      });
      var truthBtn = OI.button('Show the truth', function () {
        truth = !truth;
        truthBtn.setAttribute('aria-pressed', truth ? 'true' : 'false');
        truthBtn.textContent = truth ? 'Hide the truth' : 'Show the truth';
        status.textContent = truth ? tpl.truth : '';
        paint();
      }, 'oi-btn-main');
      actions.appendChild(truthBtn);
      actions.appendChild(OI.button('Reset', function () { choose(tpl); }));
      actions.appendChild(OI.button('⬇ Download PNG', function () {
        var wasTruth = truth;
        if (truth) { truth = false; paint(); }
        canvas.toBlob(function (blob) {
          if (wasTruth) { truth = true; paint(); }
          if (!blob) return;
          var url = URL.createObjectURL(blob), a = document.createElement('a');
          a.href = url; a.download = 'my-illusion-' + tpl.id + '.png';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
          status.textContent = 'Saved my-illusion-' + tpl.id + '.png (without the guides, so it still fools people).';
        }, 'image/png');
      }));
      choose(TEMPLATES[0]);
    }
  });
})();
