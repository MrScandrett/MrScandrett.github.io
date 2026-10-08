/* Optical Illusions Lab: brightness, color, fading and still-image motion illusions. */
(function () {
  'use strict';
  var OI = window.OI, S = OI.s, G = OI.GUIDE;
  var RAD = Math.PI / 180;
  function f(n) { return Math.round(n * 10) / 10; }
  function pol(cx, cy, r, deg) { return [f(cx + r * Math.cos(deg * RAD)), f(cy + r * Math.sin(deg * RAD))]; }
  function gray(v) { return OI.hex(v, v, v); }

  /* ================= BRIGHTNESS ================= */

  OI.add({
    id: 'checker-shadow', sec: 'brightness', kind: 'canvas', pixel: true, w: 600, h: 440, states: 2,
    title: 'Checker shadow',
    q: 'Square A and square B: which one is the lighter gray?',
    a: 'A and B are exactly the same gray (#787878). The green cylinder\'s shadow fools your brain into brightening B. The bar joins them with one single gray.',
    credit: 'After Edward H. Adelson, 1995 (redrawn for this lesson)',
    why: '<p>Your brain knows that a surface in shadow reflects less light than one in the sun, so it <em>subtracts the shadow</em> before judging the color of the square. B is in shadow, so B must really be a lighter square; A is in the open, so A must be dark. The soft shadow edge and the checker pattern (a light square next to a dark one) make this correction strong. The computation is sensible, but it means you cannot trust your brain as a light meter.</p>',
    draw: function (ctx, w, h, st) {
      var TL = [190, 100], TR = [420, 100], BR = [570, 370], BL = [40, 370], N = 8, i, j;
      function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
      function P(u, v) { return lerp(lerp(TL, TR, u), lerp(BL, BR, u), v); }
      ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, w, h);
      var cells = [];
      for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
        var q = [P(i / N, j / N), P((i + 1) / N, j / N), P((i + 1) / N, (j + 1) / N), P(i / N, (j + 1) / N)];
        var light = (i + j) % 2 === 0;
        ctx.fillStyle = light ? gray(200) : gray(120);
        ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (var k = 1; k < 4; k++) ctx.lineTo(q[k][0], q[k][1]); ctx.closePath(); ctx.fill();
        var c = P((i + 0.5) / N, (j + 0.5) / N);
        cells.push({ i: i, j: j, light: light, c: c, q: q });
      }
      // soft shadow: multiply pixels by 0.6 inside a rotated ellipse (exact, per pixel)
      var sx = 380, sy = 292, rx = 150, ry = 52, rot = 14 * RAD, cr = Math.cos(rot), sr = Math.sin(rot);
      function factor(x, y) {
        var dx = x - sx, dy = y - sy, u = (dx * cr + dy * sr) / rx, v = (-dx * sr + dy * cr) / ry, d = Math.sqrt(u * u + v * v);
        if (d <= 0.82) return 0.6;
        if (d >= 1.08) return 1;
        var t = (d - 0.82) / 0.26; t = t * t * (3 - 2 * t); return 0.6 + 0.4 * t;
      }
      var img = ctx.getImageData(0, 0, w, h), data = img.data, x, y, idx;
      for (y = 90; y < 380; y++) for (x = 30; x < 580; x++) {
        idx = (y * w + x) * 4;
        if (data[idx] === 241) continue; // untouched page background
        var fct = factor(x, y);
        if (fct < 1) { data[idx] = Math.round(data[idx] * fct); data[idx + 1] = Math.round(data[idx + 1] * fct); data[idx + 2] = Math.round(data[idx + 2] * fct); }
      }
      ctx.putImageData(img, 0, 0);
      // choose A (dark, fully lit) and B (light, fully shadowed) neighbours
      var A = null, B = null, best = 1e9;
      function inside(cell, lo, hi) {
        var m = true;
        cell.q.concat([cell.c]).forEach(function (p) { var fv = factor(p[0], p[1]); if (fv < lo || fv > hi) m = false; });
        return m;
      }
      cells.forEach(function (a) {
        if (a.light || !inside(a, 1, 1)) return;
        cells.forEach(function (b) {
          if (!b.light || !inside(b, 0.6, 0.6)) return;
          var d = Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1]);
          var cylinderHit = function (cc) { return Math.hypot(cc.c[0] - 290, cc.c[1] - 250) < 70; };
          if (d > 30 && d < best && !cylinderHit(a) && !cylinderHit(b)) { best = d; A = a; B = b; }
        });
      });
      // cylinder
      ctx.fillStyle = '#2f855a'; ctx.strokeStyle = '#1c4d36'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(252, 150); ctx.lineTo(252, 250); ctx.ellipse(290, 250, 38, 14, 0, Math.PI, 0, true); ctx.lineTo(328, 150); ctx.fill();
      ctx.fillStyle = '#48bb78'; ctx.beginPath(); ctx.ellipse(290, 150, 38, 14, 0, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      if (A && B) {
        if (st) {
          ctx.strokeStyle = gray(120); ctx.lineCap = 'round'; ctx.lineWidth = 16;
          ctx.beginPath(); ctx.moveTo(A.c[0], A.c[1]); ctx.lineTo(B.c[0], B.c[1]); ctx.stroke();
        }
        ctx.font = '700 22px system-ui,Arial,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        [[A, 'A'], [B, 'B']].forEach(function (e) {
          ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(e[1], e[0].c[0], e[0].c[1] - 0); ctx.fillStyle = '#fff'; ctx.fillText(e[1], e[0].c[0], e[0].c[1] - 0);
        });
        // redraw bar under the labels' neighbours when revealed so labels stay readable
      }
    }
  });

  OI.add({
    id: 'simultaneous-contrast', sec: 'brightness', kind: 'svg', w: 600, h: 260, states: 2,
    title: 'Simultaneous contrast',
    q: 'The two small squares: is one lighter than the other?',
    a: 'Both squares are the same medium gray (#808080). The bar joining them is that gray too.',
    credit: 'Michel-Eugène Chevreul, 1839',
    why: '<p>A gray patch on a dark background looks lighter than the same patch on a light background. Cells in the retina compare each spot with its surroundings and exaggerate the difference. It is why a gray logo looks different on a black slide and a white slide, and why designers mock up colors on the real background.</p>',
    draw: function (st) {
      return S.rect(0, 0, 300, 260, '#1f2937') + S.rect(300, 0, 300, 260, '#e5e7eb')
        + (st ? S.rect(160, 120, 280, 20, gray(128)) : '')
        + S.rect(110, 90, 80, 80, gray(128)) + S.rect(410, 90, 80, 80, gray(128));
    }
  });

  OI.add({
    id: 'gradient-bars', sec: 'brightness', kind: 'svg', w: 600, h: 280, states: 2,
    title: 'Gray bars on a gradient',
    q: 'Nine gray bars sit in front of a black-to-white gradient. Do they get lighter or darker from left to right?',
    a: 'All nine bars are the same gray (#808080). Only the gradient behind them changes.',
    credit: 'Classic contrast demonstration',
    why: '<p>Each bar is compared with the background next to it. On the left the surround is dark, so the bar looks relatively light; on the right the surround is bright, so the identical bar looks dark. It is simultaneous contrast again, but now spread smoothly so you can feel it change bar by bar.</p>',
    draw: function (st) {
      var s = '<defs><linearGradient id="gb" x1="0" x2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>';
      s += S.rect(0, 0, 600, 280, st ? '#ffffff' : 'url(#gb)');
      for (var i = 0; i < 9; i++) s += S.rect(26 + i * 62, 60, 46, 160, gray(128));
      if (st) s += S.text(300, 262, 'the same nine bars on plain white', 16, G);
      return s;
    }
  });

  OI.add({
    id: 'whites', sec: 'brightness', kind: 'svg', w: 560, h: 300, states: 2,
    title: "White's illusion",
    q: 'The gray bars on the left sit in the black stripes, and those on the right in the white stripes. Are the two groups the same gray?',
    a: 'All twelve gray bars are the same gray (#808080). The reveal removes only the stripes; all gray patches keep their original size and position.',
    credit: 'Michael White, 1979',
    why: '<p>Most people see the bars in the <em>black</em> stripes as lighter. That is a puzzle for simple edge contrast: those bars touch white along their long sides and black only at their short ends, so border contrast predicts they should look <em>darker</em>. The brain seems instead to treat each bar as part of the stripe it sits in, and judges it against that stripe: a patch belonging to a black stripe looks light. Because grouping beats raw border length here, White\'s illusion is a favorite test for computer models of vision.</p>',
    draw: function (st) {
      var s = '', i, k, y;
      if (!st) for (i = 0; i < 28; i++) s += S.rect(i * 20, 0, 20, 300, i % 2 ? '#fff' : '#000');
      var blackStripes = [2, 6, 10], whiteStripes = [15, 19, 23], ys = [[50, 110], [190, 250]];
      blackStripes.concat(whiteStripes).forEach(function (stripe) {
        ys.forEach(function (yy) {
          s += S.rect(stripe * 20, yy[0], 20, yy[1] - yy[0], gray(128));
        });
      });
      return s;
    }
  });

  OI.add({
    id: 'cornsweet', sec: 'brightness', kind: 'canvas', pixel: true, w: 560, h: 260, states: 2,
    title: 'Cornsweet edge',
    q: 'The left half and the right half of the rectangle: which side is darker overall?',
    a: 'Outside the central 140 drawing units, both sides are exactly RGB (120, 120, 120). Only the central edge zone varies. The reveal covers that zone without changing the outer patches.',
    credit: 'Tom Cornsweet, 1970',
    why: '<p>The brain pays far more attention to edges than to smooth areas, and it assumes that a smooth region keeps the brightness it has at its nearest edge. A sharp edge with a faint gradient fading away on each side tells the brain "this side is darker, this side is lighter", and it fills the whole side with that shade. The real brightness changes only in the narrow zone near the edge.</p>',
    draw: function (ctx, w, h, st) {
      var img = ctx.createImageData(w, h), x, y, cx = w / 2;
      for (x = 0; x < w; x++) {
        var d = x - cx, radius = 70;
        var taper = Math.abs(d) < radius ? Math.pow(1 - Math.abs(d) / radius, 3) : 0;
        var v = 120 + (d < 0 ? -34 : 34) * taper;
        for (y = 0; y < h; y++) { var p = (y * w + x) * 4; img.data[p] = img.data[p + 1] = img.data[p + 2] = Math.round(v); img.data[p + 3] = 255; }
      }
      ctx.putImageData(img, 0, 0);
      if (st) { ctx.fillStyle = '#000'; ctx.fillRect(cx - 70, 0, 140, h); ctx.fillStyle = '#fff'; ctx.font = '700 16px system-ui,Arial'; ctx.textAlign = 'center'; ctx.fillText('edge hidden', cx, h / 2); }
    }
  });

  OI.add({
    id: 'mach-bands', sec: 'brightness', kind: 'svg', w: 600, h: 360, states: 2,
    title: 'Staircase edges (Chevreul illusion)',
    q: 'Each stripe is one flat gray. Does each stripe look slightly lighter at one edge and darker at the other?',
    a: 'Every stripe is a single flat shade. The graph shows the encoded gray-channel values: a staircase with no bumps. It is not a measurement of display luminance or perceived brightness.',
    credit: 'Michel-Eugène Chevreul, 1839. The related Mach bands (Ernst Mach, 1865) appear where a smooth ramp meets a flat shade.',
    why: '<p>The classic explanation is <span data-glossary="lateral inhibition">lateral inhibition</span>: active cells quiet their neighbors. A cell just on the bright side of an edge has some dark neighbors, so it is quieted <em>less</em> than cells deeper in the bright stripe and signals "extra bright". A cell just on the dark side has bright neighbors, is quieted <em>more</em>, and signals "extra dark". The scalloped look is not in the picture. Lateral inhibition is a good first explanation, but not a complete one: it also predicts strong bands at sharp single edges, where people see only weak ones.</p>',
    draw: function (st) {
      var s = '', i, vals = [40, 68, 96, 124, 152, 180, 208, 236];
      for (i = 0; i < 8; i++) s += S.rect(60 + i * 60, 20, 60, st ? 200 : 320, gray(vals[i]));
      if (st) {
        s += S.rect(40, 232, 520, 116, '#f1f5f9', 'rx="8"');
        var pts = 'M60,' + (338 - vals[0] / 255 * 90);
        for (i = 0; i < 8; i++) { var yy = f(338 - vals[i] / 255 * 90); pts += ' L' + (60 + i * 60) + ',' + yy + ' L' + (120 + i * 60) + ',' + yy; }
        s += S.path(pts, 'none', G, 3);
        s += S.text(300, 250, 'encoded gray values (0–255)', 15, G);
      }
      return s;
    }
  });

  OI.add({
    id: 'koffka', sec: 'brightness', kind: 'svg', w: 560, h: 300, states: 2,
    slider: { label: 'Split the ring:', min: 0, max: 30, value: 0, step: 1, unit: ' px' },
    title: 'Koffka ring',
    q: 'A gray ring lies across a light and a dark background. Drag the slider to split it. Does one half now look different from the other?',
    a: 'Both halves are the same gray (#808080) the whole time. The swatches below show the ring color on its own.',
    credit: 'Kurt Koffka, 1935',
    why: '<p>While the ring is whole, your brain groups it as one object with one surface color. Split it and the two halves stop being one object: each is now judged against its own background, so contrast takes over and the half on the dark side looks lighter. Whether things are grouped or separate changes the apparent color of identical pixels.</p>',
    draw: function (st, g) {
      var s = S.rect(0, 0, 280, 300, '#f3f4f6') + S.rect(280, 0, 280, 300, '#2b2b2b');
      var cx = 280, cy = 150, R = 80;
      s += S.path('M' + (cx - g / 2) + ',' + (cy - R) + ' A' + R + ',' + R + ' 0 0 0 ' + (cx - g / 2) + ',' + (cy + R), 'none', gray(128), 40, 'stroke-linecap="butt"');
      s += S.path('M' + (cx + g / 2) + ',' + (cy - R) + ' A' + R + ',' + R + ' 0 0 1 ' + (cx + g / 2) + ',' + (cy + R), 'none', gray(128), 40, 'stroke-linecap="butt"');
      if (st) {
        s += S.rect(150, 248, 260, 36, '#fff', 'rx="6"');
        s += S.rect(158, 254, 116, 24, gray(128)) + S.rect(286, 254, 116, 24, gray(128));
      }
      return s;
    }
  });

  OI.add({
    id: 'hermann', sec: 'brightness', kind: 'svg', w: 520, h: 520, states: 2,
    title: 'Hermann grid',
    q: 'Look at the white crossings between the black squares. Do you see gray ghost dots appear? Do they vanish where you look directly?',
    a: 'Every crossing is plain white, just like the lanes between the squares. The red rings mark where you saw gray dots.',
    credit: 'Ludimar Hermann, 1870',
    why: '<p>The textbook explanation: at a crossing, a retinal cell has bright lanes on four sides, so it is inhibited by more bright neighbors than a cell in the middle of a lane, and it signals "darker". The ghost vanishes where you look because cells at the center of gaze have much smaller receptive fields. This story has a problem, though: make the lanes slightly wavy and the dots disappear, even though the inhibition should be about the same (Geier and colleagues, 2008). So the real cause probably also involves orientation-tuned cells in the brain. Science is still sorting it out.</p>',
    draw: function (st) {
      var s = '', i, j;
      for (j = 0; j < 5; j++) for (i = 0; i < 5; i++) s += S.rect(20 + i * 100, 20 + j * 100, 80, 80, '#111', 'rx="6"');
      if (st) for (j = 1; j < 5; j++) for (i = 1; i < 5; i++) s += S.circle(10 + i * 100, 10 + j * 100, 13, 'none', G, 3);
      return s;
    }
  });

  OI.add({
    id: 'scintillating', sec: 'brightness', kind: 'svg', w: 520, h: 520,
    title: 'Scintillating grid',
    q: 'Let your eyes drift across the grid. Do black dots flicker in and out of the white discs?',
    a: 'There are no black dots anywhere. Every disc is solid white.',
    credit: 'Elke Lingelbach and Rudolf Schrauf, 1994',
    why: '<p>The scintillating grid is the Hermann grid with white discs added at the crossings. The dark dots appear in discs away from where you are looking and flash as your eyes jump around: the effect depends on eye movements and almost vanishes if the picture is held perfectly still on the retina. It is related to the Hermann grid, but its full explanation is still an open research question.</p>',
    draw: function () {
      var s = '', i, j;
      for (i = 0; i < 5; i++) { s += S.rect(0, 20 + i * 120, 520, 18, '#808080') + S.rect(20 + i * 120, 0, 18, 520, '#808080'); }
      for (j = 0; j < 5; j++) for (i = 0; i < 5; i++) s += S.circle(29 + i * 120, 29 + j * 120, 11, '#fff');
      return S.rect(0, 0, 520, 520, '#000') + s;
    }
  });

  /* ================= COLOR ================= */

  OI.add({
    id: 'strawberries', sec: 'color', kind: 'svg', w: 600, h: 400, states: 2,
    title: 'Red strawberries (that are not red)',
    q: 'What color are these strawberries? Decide before you look closely at the pixels.',
    a: 'Every strawberry body is plain gray, with red, green and blue all equal to 140. Everything around them is cyan, and your brain corrects for it and reads the gray as reddish.',
    credit: 'After Akiyoshi Kitaoka\'s red-less strawberries, 2017 (redrawn for this lesson)',
    why: '<p>This is <span data-glossary="color constancy">color constancy</span> working together with color contrast. When a whole scene is cyan, your brain guesses the light is cyan and discounts it, adding red back to every surface. A truly gray strawberry has relatively <em>more</em> red than its cyan surroundings, so after the correction it reads as reddish. How red it looks varies from person to person and screen to screen; Kitaoka\'s original photo, where a real scene is filtered cyan, gives a stronger effect. To stop it, look at one berry through a small hole in a sheet of paper: the red drains away.</p>',
    draw: function (st) {
      var s = S.rect(0, 0, 600, 400, '#9bd9df');
      // leaves/stems in teal, berries in pure gray
      var berries = [[150, 180, 1.45], [350, 150, 1.15], [455, 270, 1.3], [255, 290, 1.0]];
      function berry(cx, cy, k) {
        var o = '<g transform="translate(' + cx + ' ' + cy + ') scale(' + k + ')">';
        o += S.path('M0,-40 C32,-46 50,-18 42,12 C34,42 12,62 0,68 C-12,62 -34,42 -42,12 C-50,-18 -32,-46 0,-40 Z', gray(140));
        var seeds = [[-22, -8], [0, -14], [22, -8], [-30, 12], [-10, 8], [10, 8], [30, 12], [-20, 30], [0, 26], [20, 30], [-8, 46], [8, 46]];
        seeds.forEach(function (p) { o += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="2.6" ry="4" fill="' + gray(205) + '"/>'; });
        o += S.path('M0,-40 L-24,-52 L-10,-42 L-6,-62 L2,-44 L18,-60 L16,-42 L34,-48 Z', '#4a9a8d', '#2d6b60', 2);
        return o + '</g>';
      }
      berries.forEach(function (b) { s += berry(b[0], b[1], b[2]); });
      s += S.path('M20,380 C80,320 120,350 160,330', 'none', '#4a9a8d', 7, 'stroke-linecap="round"');
      if (st) {
        s += S.rect(400, 20, 180, 106, '#ffffff', 'rx="10" stroke="#475569" stroke-width="2"');
        s += S.circle(450, 66, 28, gray(140), '#64748b', 2) + S.circle(520, 66, 28, gray(140), '#64748b', 2);
        s += S.text(490, 112, 'gray 140, 140, 140', 14, '#111');
      }
      return s;
    }
  });

  OI.add({
    id: 'albers', sec: 'color', kind: 'svg', w: 600, h: 260, states: 2,
    title: 'Albers: one color, two faces',
    q: 'The small squares are cut from the same paint. Do they look the same color?',
    a: 'Both squares are the same beige-gray (#a89f91). The bar between them is that exact color.',
    credit: 'After Josef Albers, Interaction of Color, 1963',
    why: '<p>Colors are judged against their surroundings. Against warm orange, the neutral square picks up the opposite, cool tint; against blue, it takes a warm one. Josef Albers taught art students for decades that "color is the most relative medium in art", with exactly this kind of exercise using paper squares.</p>',
    draw: function (st) {
      var tan = '#a89f91';
      return S.rect(0, 0, 300, 260, '#f59e0b') + S.rect(300, 0, 300, 260, '#1e6fa8') + (st ? S.rect(180, 112, 240, 36, tan) : '') + S.rect(110, 80, 80, 100, tan) + S.rect(410, 80, 80, 100, tan);
    }
  });

  OI.add({
    id: 'bezold', sec: 'color', kind: 'svg', w: 600, h: 280, states: 2,
    title: 'Bezold color spreading',
    q: 'The left rug has white lines and the right rug has black lines, over the same red. Is the red the same?',
    a: 'The red is identical on both sides (#c8203a). The bar across the middle is a solid swatch of that same red.',
    credit: 'Wilhelm von Bezold, 1874 (found while designing rug patterns)',
    why: '<p>This is <em>assimilation</em>, the opposite of contrast: the red moves <em>toward</em> the color of the lines instead of away from it. Part of the reason is that your eye blurs fine lines together with the background. White lines wash the red out; black lines darken it. This spreading of a thin line\'s color into its neighbors is why a pattern of fine lines is a way to weave a darker or lighter version of the same dye.</p>',
    draw: function (st) {
      var s = S.rect(0, 0, 300, 280, '#c8203a') + S.rect(300, 0, 300, 280, '#c8203a'), x;
      for (x = 10; x < 300; x += 16) s += S.rect(x, 0, 4, 280, '#fff') + S.rect(300 + x, 0, 4, 280, '#000');
      if (st) s += S.rect(0, 120, 600, 40, '#c8203a');
      return s;
    }
  });

  /* ================= NEGATIVE / FADING ================= */

  OI.add({
    id: 'troxler', sec: 'negative', kind: 'svg', w: 560, h: 460,
    title: 'Troxler fading',
    q: 'Stare at the black cross for 20 seconds without moving your eyes. What happens to the soft colored blobs around it?',
    a: 'The picture never changes, but the blobs in your peripheral vision fade to nothing, then pop back when you move your eyes.',
    credit: 'Ignaz Paul Vital Troxler, 1804',
    why: '<p>Your visual system responds mostly to <em>change</em>. A steady, blurry patch in peripheral vision stops sending a signal as the neurons adapt, and the brain fills the missing patch with the background around it. Normally tiny eye movements (microsaccades) keep your cells from fading, which is why the effect shows up when you stare. It is a cousin of the afterimage: both come from adaptation.</p>',
    draw: function () {
      var s = '<defs><filter id="tb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter></defs>';
      s += S.rect(0, 0, 560, 460, '#e5e7eb');
      var cols = ['#f9a8d4', '#a5b4fc', '#fcd34d', '#86efac', '#fda4af', '#93c5fd', '#c4b5fd', '#fdba74'];
      for (var i = 0; i < 8; i++) { var p = pol(280, 230, 165, i * 45 - 90); s += S.circle(p[0], p[1], 42, cols[i], null, 0, 'filter="url(#tb)"'); }
      s += S.line(262, 230, 298, 230, '#111', 4) + S.line(280, 212, 280, 248, '#111', 4);
      return s;
    }
  });

  /* ================= MOTION FROM STILL IMAGES ================= */

  OI.add({
    id: 'rotating-snakes', sec: 'motion', kind: 'canvas', w: 640, h: 420,
    title: 'Rotating snakes',
    q: 'Look at the middle of the picture, not at any one disc. Do the discs turn in different directions?',
    a: 'Nothing moves. The picture is a still image of rings of dark and light steps. Stare straight at a single disc and it slows or stops.',
    credit: 'Principle by Akiyoshi Kitaoka (2003); original rendering for this lesson',
    why: '<p>Each ring repeats black, dark blue, white, yellow. The leading explanation is that dark and light steps are processed at slightly different speeds, so every step edge leaves a tiny motion signal pointing the same way around the ring. Because the signals all agree, they add up. Alternate rings run the sequence backward, so neighboring rings seem to turn opposite ways. Your fast eye movements (saccades and blinks) restart the effect, which is why blinking makes it jump.</p>',
    draw: function (ctx, w, h) {
      ctx.fillStyle = '#e9e1c4'; ctx.fillRect(0, 0, w, h);
      var cols = ['#000000', '#1d4ed8', '#ffffff', '#facc15'];
      var discs = [[110, 110], [320, 110], [530, 110], [215, 310], [425, 310]];
      discs.forEach(function (d) {
        var ring, k;
        for (ring = 0; ring < 4; ring++) {
          var r0 = 14 + ring * 21, r1 = r0 + 21, m = 6 + 2 * ring, n = 4 * m;
          for (k = 0; k < n; k++) {
            var idx = (ring % 2 === 0) ? k % 4 : (4 - (k % 4)) % 4;
            ctx.fillStyle = cols[idx];
            ctx.beginPath();
            ctx.arc(d[0], d[1], r1, k * 2 * Math.PI / n, (k + 1) * 2 * Math.PI / n);
            ctx.arc(d[0], d[1], r0, (k + 1) * 2 * Math.PI / n, k * 2 * Math.PI / n, true);
            ctx.closePath(); ctx.fill();
          }
        }
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(d[0], d[1], 9, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#e9e1c4'; ctx.beginPath(); ctx.arc(d[0], d[1], 5, 0, 2 * Math.PI); ctx.fill();
      });
    }
  });

  OI.add({
    id: 'enigma', sec: 'motion', kind: 'canvas', w: 520, h: 520,
    title: 'Enigma (Leviant)',
    q: 'Look at the pale rings among the spokes. Do you see them shimmer or turn slowly, like water swirling?',
    a: 'Nothing is moving. The rings are flat, still, pale bands. The shimmer comes from your own eye movements.',
    credit: 'Isia Leviant, 1981',
    why: '<p>Your eyes are never perfectly still: they make tiny involuntary jumps called microsaccades. As the fine, high-contrast spokes slide across your retina with each jump, they create a strong, noisy motion signal, and the brain assigns that motion to the plain rings as if something were flowing around them. In 2008 Xoana Troncoso and colleagues showed that the shimmer gets stronger just after microsaccades. Earlier researchers blamed focusing changes in the eye, and the debate is not fully closed.</p>',
    draw: function (ctx, w, h) {
      var cx = w / 2, cy = h / 2, n = 96, k;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      for (k = 0; k < n; k++) {
        if (k % 2) continue;
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, 250, k * 2 * Math.PI / n, (k + 1) * 2 * Math.PI / n); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 36, 0, 2 * Math.PI); ctx.fill();
      var rings = [[82, 118, '#fbbf24'], [160, 196, '#34d399'], [232, 250, '#60a5fa']];
      rings.forEach(function (r) {
        ctx.globalAlpha = 0.5; ctx.fillStyle = r[2]; ctx.beginPath(); ctx.arc(cx, cy, r[1], 0, 2 * Math.PI); ctx.arc(cx, cy, r[0], 0, 2 * Math.PI, true); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      });
    }
  });

  OI.add({
    id: 'ouchi', sec: 'motion', kind: 'canvas', pixel: true, w: 600, h: 400,
    title: 'Ouchi illusion',
    q: 'Move your head or the screen back and forth a little. Does the oval in the middle seem to float or wobble?',
    a: 'It is a still picture. The oval has bricks lying sideways and the surround has bricks standing up; that is the only difference.',
    credit: 'Hajime Ouchi, 1977',
    why: '<p>When your eyes jitter, the two patches of differently oriented checks give conflicting local motion signals. The brain cannot decide how the patterns move relative to each other and settles on one moving independently of the other, which looks like a floating, slipping disc. It helps that the checks are sharp and high-contrast.</p>',
    draw: function (ctx, w, h) {
      var img = ctx.createImageData(w, h), x, y, cx = w / 2, cy = h / 2;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        var ex = (x - cx) / 150, ey = (y - cy) / 95, inside = ex * ex + ey * ey < 1;
        var v = inside ? ((Math.floor(x / 24) + Math.floor(y / 8)) & 1) : ((Math.floor(x / 8) + Math.floor(y / 24)) & 1);
        var p = (y * w + x) * 4; img.data[p] = img.data[p + 1] = img.data[p + 2] = v ? 255 : 0; img.data[p + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
  });
})();
