/* Optical Illusions Lab: geometric illusions (size, straight lines, illusory contours, ambiguous figures). */
(function () {
  'use strict';
  var OI = window.OI, S = OI.s, G = OI.GUIDE;
  var RAD = Math.PI / 180;
  function f(n) { return Math.round(n * 10) / 10; }
  function pol(cx, cy, r, deg) { return [f(cx + r * Math.cos(deg * RAD)), f(cy + r * Math.sin(deg * RAD))]; }

  /* ================= SIZE ================= */

  OI.add({
    id: 'muller-lyer', sec: 'size', kind: 'svg', w: 600, h: 260, states: 2,
    title: 'Müller-Lyer lines',
    q: 'Which horizontal line is longer, the top one or the bottom one?',
    a: 'Both are exactly 300 pixels long. Only the little fins at the ends differ.',
    credit: 'Franz Müller-Lyer, 1889',
    why: '<p>The fins work like the corners of a building. Fins that sweep back toward the line (the arrowhead) look like the outside edge of a building jutting toward you: near, so scaled down. Fins that flare outward (the tails) look like the inside corner of a room, receding away from you: far, so scaled up. The brain applies size constancy to a flat drawing, so the "far" line seems longer. This is Richard Gregory\'s famous explanation, but it is only one theory: the illusion still works when the fins are replaced by circles or squares that suggest no depth at all. Another idea is that the brain judges the length of the whole figure, fins included. Studies from the 1960s found weaker effects in people raised with few right-angled "carpentered" buildings, but those results are still debated.</p>',
    draw: function (st) {
      var x1 = 150, x2 = 450, f0 = 26, s = '';
      function ends(y, inward) {
        var d = inward ? 1 : -1, o = '';
        o += S.line(x1, y, x2, y, '#111', 5, 'stroke-linecap="round"');
        [[x1, d], [x2, -d]].forEach(function (e) {
          o += S.line(e[0], y, e[0] + e[1] * f0, y - f0, '#111', 5, 'stroke-linecap="round"');
          o += S.line(e[0], y, e[0] + e[1] * f0, y + f0, '#111', 5, 'stroke-linecap="round"');
        });
        return o;
      }
      s += ends(90, true) + ends(190, false);
      s += S.text(60, 98, 'A', 24, '#6d28d9') + S.text(60, 198, 'B', 24, '#0e7490');
      if (st) {
        s += S.guide(x1, 40, x1, 240) + S.guide(x2, 40, x2, 240);
        s += S.text(300, 250, 'both lines: 300 px', 16, G);
      }
      return s;
    }
  });

  OI.add({
    id: 'ponzo', sec: 'size', kind: 'svg', w: 600, h: 420, states: 2,
    title: 'Ponzo railway',
    q: 'Two identical bars lie between the rails. Which is longer, the high one or the low one?',
    a: 'Both bars span 100 drawing units. The upper bar may look longer in the converging context; your own report determines whether you see that effect.',
    credit: 'Mario Ponzo, 1911',
    why: '<p>Converging lines are one of the strongest <em>depth cues</em> (linear perspective): in a photograph of a road, the edges meet at the horizon. Your brain reads the upper bar as farther away, and an object that makes the same picture on your retina from farther away must be bigger. The illusion is a size-constancy mechanism misfiring on a flat page.</p>',
    draw: function (st) {
      var s = '', i;
      function rx(y, side) { return side ? 480 - (400 - y) * 0.3947 : 120 + (400 - y) * 0.3947; }
      for (i = 0; i < 9; i++) {
        var y = 20 + 375 * Math.pow(0.73, i); // gaps decrease toward the horizon
        if (y < 30) break;
        s += S.line(rx(y, 0), y, rx(y, 1), y, '#94a3b8', 3);
      }
      s += S.line(120, 400, 270, 20, '#334155', 7, 'stroke-linecap="round"') + S.line(480, 400, 330, 20, '#334155', 7, 'stroke-linecap="round"');
      s += S.line(250, 120, 350, 120, '#dc2626', 12, 'stroke-linecap="butt"') + S.line(250, 330, 350, 330, '#dc2626', 12, 'stroke-linecap="butt"');
      if (st) { s += S.guide(250, 60, 250, 380) + S.guide(350, 60, 350, 380) + S.text(300, 408, 'same width', 16, G); }
      return s;
    }
  });

  OI.add({
    id: 'ebbinghaus', sec: 'size', kind: 'svg', w: 600, h: 360, states: 2,
    title: 'Ebbinghaus circles',
    q: 'Which orange circle is bigger, the one on the left or the one on the right?',
    a: 'The two orange circles are exactly the same size (radius 30). Big neighbors make a circle look small, and small neighbors make it look big.',
    credit: 'Hermann Ebbinghaus, c. 1897 (Titchener circles)',
    why: '<p>Your brain judges size <em>relative to nearby objects</em>. Next to large circles the orange disc is compared to a big standard and seems small; among small circles it seems large. The effect is weaker when the surrounding circles are far away, and it varies a lot from person to person; one study even linked its strength to the size of each person\'s primary visual cortex (Schwarzkopf and colleagues, 2011).</p>',
    draw: function (st) {
      var s = '', i, cx;
      function ring(cxx, n, r, d, col) {
        var o = '';
        for (i = 0; i < n; i++) { var p = pol(cxx, 180, d, i * 360 / n - 90); o += S.circle(p[0], p[1], r, st ? '#e2e8f0' : col); }
        return o;
      }
      if (!st) s += ring(165, 5, 44, 84, '#64748b') + ring(435, 8, 13, 52, '#64748b');
      [165, 435].forEach(function (c) { s += S.circle(c, 180, 30, '#f97316'); });
      if (st) { s += S.circle(165, 180, 30, 'none', G, 3, 'stroke-dasharray="6 4"') + S.circle(435, 180, 30, 'none', G, 3, 'stroke-dasharray="6 4"') + S.text(300, 340, 'both: radius 30', 16, G); }
      return s;
    }
  });

  OI.add({
    id: 'delboeuf', sec: 'size', kind: 'svg', w: 600, h: 320, states: 2,
    title: 'Delboeuf rings',
    q: 'The two solid blue discs sit inside rings. Which disc is bigger?',
    a: 'The discs are identical (radius 40). A ring that hugs the disc makes it look bigger, and a distant ring makes it look smaller.',
    credit: 'Joseph Delboeuf, 1865',
    why: '<p>This is the same family as the Ebbinghaus effect, in ring form. The outer ring is part of the "frame" your brain uses to judge size, so a disc that almost fills its frame feels large and one floating in a big frame feels small. Designers use this when sizing icons inside buttons.</p>',
    draw: function (st) {
      var s = '';
      s += S.circle(165, 160, 54, 'none', '#475569', 4) + S.circle(435, 160, 100, 'none', '#475569', 4);
      s += S.circle(165, 160, 40, '#2563eb') + S.circle(435, 160, 40, '#2563eb');
      if (st) {
        s += S.guide(125, 160, 205, 160) + S.guide(395, 160, 475, 160);
        s += S.text(300, 305, 'both discs: diameter 80', 16, G);
      }
      return s;
    }
  });

  OI.add({
    id: 'vertical-horizontal', sec: 'size', kind: 'svg', w: 600, h: 320, states: 2,
    title: 'Vertical-horizontal illusion',
    q: 'Which looks longer, the upright line or the line along the bottom?',
    a: 'Both shafts span 200 drawing units. The reveal places a copy of the upright alongside the full horizontal base, so their endpoints can be compared.',
    credit: 'Adolf Fick, 1851; Wilhelm Wundt, 1858',
    why: '<p>Two things are going on. Vertical lengths are overestimated compared with horizontal ones, typically by 5 to 10 percent; one leading idea is that the visual field is wider than it is tall, so a vertical line fills more of it. Also, the base is cut in half by the upright, and a line cut in two looks shorter. Together they make this upside-down T a strong version.</p>',
    draw: function (st) {
      var s = S.line(300, 60, 300, 260, '#111', 8, 'stroke-linecap="butt"') + S.line(200, 260, 400, 260, '#111', 8);
      if (st) { s += S.line(200, 280, 400, 280, G, 3) + S.guide(200, 245, 200, 290) + S.guide(400, 245, 400, 290) + S.text(300, 300, 'both lines: 200 px', 16, G); }
      return s;
    }
  });

  OI.add({
    id: 'jastrow', sec: 'size', kind: 'svg', w: 600, h: 400, states: 2,
    title: 'Curved-band model (Jastrow-inspired)',
    q: 'Both blue and orange bands have the same shape. Which one looks bigger?',
    a: 'They are the same shape and size. The ghost outline is a copy of the top band slid down onto the bottom band.',
    credit: 'Experimental ClassroomOS reconstruction inspired by Jastrow (1889)',
    why: '<p>This is an experimental curved-band reconstruction. The two paths are identical translations, which can be checked from the drawing. The familiar Jastrow effect depends on the relative placement of curved edges; this symmetric arrangement has not been validated as an effective stimulus. Report what you see, including no apparent difference.</p>',
    draw: function (st) {
      function band(ox, oy) {
        var a = pol(ox, oy, 200, 40), b = pol(ox, oy, 200, 140), c = pol(ox, oy, 118, 140), d = pol(ox, oy, 118, 40);
        return 'M' + a + ' A200,200 0 0 1 ' + b + ' L' + c + ' A118,118 0 0 0 ' + d + ' Z';
      }
      var s = S.path(band(300, 20), '#2563eb') + S.path(band(300, 150), '#f97316');
      if (st) s += S.path(band(300, 150), 'none', '#fff', 3, 'stroke-dasharray="8 5"') + S.path(band(300, 20), 'none', G, 3, 'stroke-dasharray="8 5"');
      return s;
    }
  });

  OI.add({
    id: 'shepard', sec: 'size', kind: 'svg', w: 680, h: 400, states: 2,
    title: 'Shepard tables',
    q: 'Which tabletop is longer and narrower, and which is nearly square?',
    a: 'The two tabletops are the very same parallelogram, just turned. The dashed red copy is the left top, rotated and slid onto the right top.',
    credit: 'Roger Shepard, 1990 ("Turning the Tables")',
    why: '<p>The legs and the table edges give strong 3D cues, so your brain reads each parallelogram as a rectangle seen in perspective and "undoes" the perspective differently for each. One reads as long and deep, the other as wide and short. Your visual system is working out real 3D table sizes and ignoring the flat shape that is actually on the page.</p>',
    draw: function (st) {
      var A = [[80, 260], [170, 260], [300, 160], [210, 160]];
      var th = Math.atan2(100, 130), c = Math.cos(th), sn = Math.sin(th);
      var B = A.map(function (p) { var x = p[0] - 80, y = p[1] - 260; return [410 + x * c - y * sn, 205 + x * sn + y * c]; });
      function legs(pts, ids) {
        var o = '';
        ids.forEach(function (i) { o += S.line(pts[i][0], pts[i][1], pts[i][0], pts[i][1] + 110, '#92400e', 8, 'stroke-linecap="round"'); });
        return o;
      }
      var s = '';
      s += legs(A, [3, 2]).replace(/#92400e/g, '#78350f') + legs(A, [0, 1]);
      s += legs(B, [3, 2]).replace(/#92400e/g, '#78350f') + legs(B, [0, 1]);
      s += S.poly(A, '#d97706', '#78350f', 3) + S.poly(B, '#d97706', '#78350f', 3);
      if (st) {
        // rotate A by 37.57 degrees about its centroid, then move to B's centroid
        var ca = [0, 1].map(function (k) { return (A[0][k] + A[1][k] + A[2][k] + A[3][k]) / 4; });
        var cb = [0, 1].map(function (k) { return (B[0][k] + B[1][k] + B[2][k] + B[3][k]) / 4; });
        // The same exact rotation constructs B and its overlay.
        var R = A.map(function (p) { var x = p[0] - ca[0], y = p[1] - ca[1]; return [cb[0] + x * c - y * sn, cb[1] + x * sn + y * c]; });
        s += S.poly(R, 'none', G, 3.5, 'stroke-dasharray="8 5"');
        s += S.text(340, 392, 'same shape, turned 38°', 16, G);
      }
      return s;
    }
  });

  OI.add({
    id: 'oppel-kundt', sec: 'size', kind: 'svg', w: 640, h: 220, states: 2,
    title: 'Oppel-Kundt filled space',
    q: 'The left gap is full of tick marks, the right gap is empty. Which gap is wider?',
    a: 'Both gaps are 260 pixels wide. A space broken up by marks looks longer than an empty one.',
    credit: 'Johann Oppel, 1855; Adolf Kundt, 1863',
    why: '<p>A space divided into many small intervals looks longer than an empty space of the same size. One explanation is that the brain judges a distance partly by how much is inside it. Interior designers use the idea when they say that stripes or tiles can make a room feel bigger.</p>',
    draw: function (st) {
      var s = S.line(40, 110, 600, 110, '#111', 3), x, i;
      // gap 1 spans 40..300, gap 2 spans 340..600 (260 each); ticks at ends
      [40, 300, 340, 600].forEach(function (xx) { s += S.line(xx, 70, xx, 150, '#111', 6); });
      for (i = 1; i <= 12; i++) { x = 40 + (260 / 13) * i; s += S.line(x, 85, x, 135, '#111', 3); }
      if (st) s += S.guide(40, 30, 40, 190) + S.guide(300, 30, 300, 190) + S.guide(340, 30, 340, 190) + S.guide(600, 30, 600, 190) + S.text(320, 212, 'both gaps: 260 px', 16, G);
      return s;
    }
  });

  /* ================= STRAIGHT LINES AND ANGLES ================= */

  OI.add({
    id: 'cafe-wall', sec: 'lines', kind: 'svg', w: 640, h: 360, states: 2,
    title: 'Café wall',
    q: 'The gray mortar lines between the rows of tiles: are they parallel, or do they slope?',
    a: 'Every mortar line is perfectly horizontal and parallel. The red lines lie on top of them.',
    credit: 'Richard Gregory and Priscilla Heard, 1979, from a tiled café in Bristol',
    why: '<p>Where the black and white tiles meet along the mortar, the cell patterns in your retina create small local tilt signals that are consistent along each line but alternate from one line to the next. Your brain adds the small tilts up into one large slope. Spotting a tiled pattern like this on the front of a real café in Bristol is how the illusion got its name.</p>',
    draw: function (st) {
      var s = '', row, col, tile = 44, rh = 30, gap = 4;
      for (row = 0; row < 10; row++) {
        var y = 8 + row * (rh + gap), off = (row % 2) * (tile / 2);
        for (col = -1; col < 16; col++) {
          var x = col * tile - off + 0;
          s += S.rect(x, y, tile - 0, rh, (col % 2 === 0) ? '#111' : '#fff');
        }
      }
      for (row = 0; row <= 10; row++) s += S.line(0, 8 + row * (rh + gap) - gap / 2, 640, 8 + row * (rh + gap) - gap / 2, '#94a3b8', gap);
      // white tiles on a white page: keep an outline so rows stay readable
      if (st) for (row = 0; row <= 10; row++) { var yy = 8 + row * (rh + gap) - gap / 2; s += S.line(0, yy, 640, yy, G, 2); }
      return s;
    }
  });

  OI.add({
    id: 'zollner', sec: 'lines', kind: 'svg', w: 600, h: 320, states: 2,
    title: 'Zöllner lines',
    q: 'The long lines are crossed by short slanted marks. Do the long lines run parallel, or do they lean toward or away from each other?',
    a: 'The long lines are perfectly vertical and parallel. The short hatch marks are what tilt your perception.',
    credit: 'Johann Karl Friedrich Zöllner, 1860',
    why: '<p>An acute angle between two lines is overestimated; the long line "pushes away" from the hatch that makes the small angle. Because the hatches slant in opposite directions on neighboring lines, the long lines seem to lean in opposite directions. Zöllner, an astrophysicist, is said to have noticed the effect in a fabric pattern.</p>',
    draw: function (st) {
      var s = '', i, y;
      for (i = 0; i < 5; i++) {
        var x = 80 + i * 110, dir = (i % 2) ? 1 : -1;
        for (y = 30; y <= 290; y += 26) s += S.line(x - 17, y - 17 * dir, x + 17, y + 17 * dir, st ? '#cbd5e1' : '#111', 3);
        s += S.line(x, 12, x, 308, st ? G : '#111', st ? 5 : 5);
      }
      return s;
    }
  });

  OI.add({
    id: 'hering', sec: 'lines', kind: 'svg', w: 600, h: 360, states: 2,
    title: 'Hering lines',
    q: 'The two red vertical lines: are they straight, or do they bend?',
    a: 'Both red lines are dead straight and parallel. The spokes behind them are what make them seem to bow outward.',
    credit: 'Ewald Hering, 1861',
    why: '<p>Where each straight line crosses a spoke, the brain slightly overestimates the sharp angle between them, the same angle bias as in the Zöllner lines. Along the line those small errors add up to a bow away from the center. Another theory (Mark Changizi, 2008) says the spokes look like the view when you move forward, and the brain predicts where the lines will be a moment later. A reversed arrangement, with spokes meeting at the outside, makes the lines bow the other way (the Wundt illusion).</p>',
    draw: function (st) {
      var s = '', i;
      for (i = 0; i < 28; i++) { var p = pol(300, 180, 400, i * 360 / 28 + 3); s += S.line(300, 180, p[0], p[1], st ? '#e2e8f0' : '#334155', 2); }
      s += S.line(220, 0, 220, 360, '#dc2626', 7) + S.line(380, 0, 380, 360, '#dc2626', 7);
      if (st) s += S.guide(220, 0, 220, 360) + S.guide(380, 0, 380, 360);
      return '<defs><clipPath id="hc"><rect width="600" height="360"/></clipPath></defs><g clip-path="url(#hc)">' + s + '</g>';
    }
  });

  OI.add({
    id: 'poggendorff', sec: 'lines', kind: 'svg', w: 640, h: 460, states: 2,
    title: 'Poggendorff gap',
    q: 'The slanted line goes behind the gray bar. Where does it come out on the other side?',
    a: 'The line on the right is the exact continuation of the line on the left. The dashed red line proves it.',
    credit: 'Johann Poggendorff, 1860',
    why: '<p>A long, thin diagonal line crossing a wide bar makes the angles at the bar edges look steeper than they are (angle expansion), and the brain places the exit too high or low. The effect shrinks if the bar is made thin, and it disappears if the line crosses the bar at a right angle. Like many illusions, its exact cause is still debated.</p>',
    draw: function (st) {
      var s = S.rect(270, 30, 100, 400, '#cbd5e1', 'stroke="#94a3b8" stroke-width="2"');
      s += S.line(150, 420, 270, 300, '#111', 5) + S.line(370, 200, 490, 80, '#111', 5);
      s += S.text(510, 70, 'C', 22, '#111');
      if (st) s += S.line(150, 420, 500, 70, G, 3, 'stroke-dasharray="8 5"');
      return s;
    }
  });

  OI.add({
    id: 'orbison', sec: 'lines', kind: 'svg', w: 520, h: 520, states: 2,
    title: 'Orbison square',
    q: 'Is the red outline a perfect square, or is it bulging and squashed?',
    a: 'It is a perfect 220 × 220 square. Without the background circles, you see it clearly.',
    credit: 'William Orbison, 1939',
    why: '<p>Curved lines behind a straight one make its middle seem to bend away from the curves. The concentric rings act like a bulging lens in the brain\'s geometry. Combine that with the corners poking out through ever-bigger circles and the square looks distorted in a way that ruler and software both disagree with.</p>',
    draw: function (st) {
      var s = '', r;
      if (!st) for (r = 14; r <= 370; r += 18) s += S.circle(260, 260, r, 'none', '#475569', 3);
      s += S.rect(150, 150, 220, 220, 'none', 'stroke="#dc2626" stroke-width="7"');
      return s;
    }
  });

  OI.add({
    id: 'fraser', sec: 'lines', kind: 'canvas', w: 520, h: 520, states: 2,
    title: 'Fraser spiral',
    q: 'Do you see a spiral winding into the center? Trace one line with your finger.',
    a: 'There is no spiral at all: every curve is a separate perfect circle. The red rings show some of them.',
    credit: 'James Fraser, 1908 (the twisted cord illusion)',
    why: '<p>Each ring is made of short slanted pieces (a "twisted cord"). The slant tricks the brain into reading each tiny piece as a part of a spiral rather than part of a circle, and the small errors add up all around the ring. The patterned background strengthens it. Fraser called it the "twisted cord illusion" after the braided cords it resembles.</p>',
    draw: function (ctx, w, h, st) {
      var cx = w / 2, cy = h / 2, r, i, k;
      ctx.fillStyle = '#d1d5db'; ctx.fillRect(0, 0, w, h);
      // polar checker background
      for (r = 0; r < 17; r++) {
        for (k = 0; k < 24; k++) {
          ctx.fillStyle = ((r + k) % 2) ? '#9ca3af' : '#e5e7eb';
          ctx.beginPath();
          ctx.arc(cx, cy, 22 * (r + 1) + 8, k * Math.PI / 12, (k + 1) * Math.PI / 12);
          ctx.arc(cx, cy, 22 * r + 8, (k + 1) * Math.PI / 12, k * Math.PI / 12, true);
          ctx.closePath(); ctx.fill();
        }
      }
      for (r = 1; r < 12; r++) {
        var rad = 22 * r + 8, n = Math.round(2 * Math.PI * rad / 9);
        for (i = 0; i < n; i++) {
          var a = i * 2 * Math.PI / n, x = cx + rad * Math.cos(a), y = cy + rad * Math.sin(a), t = a + Math.PI / 2 + 0.75;
          ctx.strokeStyle = (i % 2) ? '#000' : '#fff'; ctx.lineWidth = 5; ctx.lineCap = 'butt';
          ctx.beginPath(); ctx.moveTo(x - 8 * Math.cos(t), y - 8 * Math.sin(t)); ctx.lineTo(x + 8 * Math.cos(t), y + 8 * Math.sin(t)); ctx.stroke();
        }
        if (st && r % 3 === 1) { ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 3; ctx.setLineDash([8, 5]); ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]); }
      }
    }
  });

  /* ================= ILLUSORY CONTOURS ================= */

  OI.add({
    id: 'kanizsa', sec: 'contours', kind: 'svg', w: 600, h: 440, states: 2,
    title: 'Kanizsa triangle',
    q: 'Do you see a white triangle on top? Is it brighter than the page around it?',
    a: 'No triangle is drawn. There are only three black shapes with wedges cut out. The dashed red outline marks where your brain invents edges that are not there.',
    credit: 'Gaetano Kanizsa, 1955',
    why: '<p>The black "Pac-Man" shapes line up exactly as the corners of a triangle would, and the most likely explanation of that coincidence is a white triangle sitting on top of three black discs. Your visual cortex (cells in area V2) fires for these <span data-glossary="illusory contour">illusory contours</span> as if a real edge were there, and the "triangle" even looks brighter than the paper.</p>',
    draw: function (st) {
      var s = '', side = 230, h3 = side * Math.sqrt(3) / 2, cx = 300, cy = 235;
      var V = [[cx, cy - 2 * h3 / 3], [cx + side / 2, cy + h3 / 3], [cx - side / 2, cy + h3 / 3]];
      V.forEach(function (v) {
        var phi = Math.atan2(cy - v[1], cx - v[0]) / RAD, r = 46;
        var a = pol(v[0], v[1], r, phi + 30), b = pol(v[0], v[1], r, phi - 30);
        s += S.path('M' + a + ' A' + r + ',' + r + ' 0 1 1 ' + b + ' L' + v[0] + ',' + v[1] + ' Z', '#111');
      });
      var vs = V;
      if (st) s += S.poly(vs, 'none', G, 3.5, 'stroke-dasharray="8 6"');
      return s;
    }
  });

  OI.add({
    id: 'ehrenstein', sec: 'contours', kind: 'svg', w: 520, h: 520, states: 2,
    title: 'Ehrenstein disc',
    q: 'Do you see a bright circle floating in the middle? Where does it begin and end?',
    a: 'The middle is just empty paper. The line segments simply stop at the dashed red circle, and your brain draws an edge between their ends.',
    credit: 'Walter Ehrenstein, 1941',
    why: '<p>The ends of the radial lines are lined up on a circle, so a circular occluder is the simplest explanation for why all the lines stop at the same distance. The "disc" appears brighter than the page, an effect called <em>brightness filling-in</em>, because the cortex fills the inside of an edge with a surface.</p>',
    draw: function (st) {
      var s = '', i, n = 32;
      for (i = 0; i < n; i++) { var a = pol(260, 260, 82, i * 360 / n), b = pol(260, 260, 250, i * 360 / n); s += S.line(a[0], a[1], b[0], b[1], '#111', 4); }
      if (st) s += S.circle(260, 260, 82, 'none', G, 3, 'stroke-dasharray="8 6"');
      return s;
    }
  });

  OI.add({
    id: 'neon', sec: 'contours', kind: 'svg', w: 600, h: 420, states: 2,
    title: 'Neon color spreading',
    q: 'Does a cyan glow seem to fill the middle of the grid, like a pale blue disc under a lamp?',
    a: 'Only the thin lines are colored. The spaces between them are plain white paper. The dashed circle shows where the "glow" seems to end.',
    credit: 'Dario Varin, 1971; Harrie van Tuijl, 1975',
    why: '<p>The colored line segments are surrounded by black ones, and the brain assigns the color not just to the thin colored line but spreads it into the surrounding white region to form a transparent colored surface. Neon spreading is a strong example of the brain filling in color where the retina reports none.</p>',
    draw: function (st) {
      var gap = 26, x, y, grid = '';
      function lines(col) {
        var o = '';
        for (x = 13; x < 600; x += gap) o += S.line(x, 0, x, 420, col, 5);
        for (y = 13; y < 420; y += gap) o += S.line(0, y, 600, y, col, 5);
        return o;
      }
      // black grid everywhere, then the same grid in cyan inside a circle (smooth edge)
      var s = lines('#111') + '<clipPath id="nc"><circle cx="300" cy="210" r="112"/></clipPath><g clip-path="url(#nc)">' + lines('#00c8d7') + '</g>';
      if (st) s += S.circle(300, 210, 112, 'none', G, 3, 'stroke-dasharray="8 6"');
      return s;
    }
  });

  /* ================= AMBIGUOUS AND IMPOSSIBLE ================= */

  OI.add({
    id: 'necker', sec: 'ambiguous', kind: 'svg', w: 520, h: 420, states: 3,
    stateLabels: ['Show one reading', 'Show the other reading', 'Back to the plain drawing'],
    title: 'Necker cube',
    q: 'Which face of the cube is in front? Keep looking: it will flip.',
    a: 'A flat drawing has no front or back. Both readings are equally correct, and the brain alternates between them every few seconds.',
    credit: 'Louis Albert Necker, 1832',
    why: '<p>The drawing is a flat set of twelve lines, which fits two different 3D cubes equally well: one seen from above, one from below. Your brain cannot hold both, so it picks one and every few seconds the active interpretation tires and the other takes over. This is <span data-glossary="bistable perception">bistable perception</span>, and it is a clean way to catch your brain interpreting.</p>',
    draw: function (st) {
      var o = 90, ax = 130, ay = 110, bx = 270, by = 230; // back square top-left (ax,ay); front square offset (-o? ) via vector
      var dx = 80, dy = 70, sz = 150;
      var Fr = [[ax, ay + dy], [ax + sz, ay + dy], [ax + sz, ay + dy + sz], [ax, ay + dy + sz]]; // lower-left square
      var Bk = [[ax + dx, ay], [ax + dx + sz, ay], [ax + dx + sz, ay + sz], [ax + dx, ay + sz]];
      var s = '';
      if (st === 1) s += S.poly(Fr, '#c4b5fd', 'none');
      if (st === 2) s += S.poly(Bk, '#a5f3fc', 'none');
      s += S.poly(Fr, 'none', '#111', 5) + S.poly(Bk, 'none', '#111', 5);
      for (var i = 0; i < 4; i++) s += S.line(Fr[i][0], Fr[i][1], Bk[i][0], Bk[i][1], '#111', 5);
      return s;
    }
  });

  OI.add({
    id: 'rubin', sec: 'ambiguous', kind: 'svg', w: 520, h: 420, states: 3,
    stateLabels: ['Show the vase', 'Show the two faces', 'Back to the plain drawing'],
    title: 'Rubin vase',
    q: 'Do you see a white vase, or two black faces looking at each other?',
    a: 'It is both, but your brain cannot see both at once. The border belongs to either the vase or the faces, never to both.',
    credit: 'Edgar Rubin, 1915',
    why: '<p>This is a <em>figure-ground</em> puzzle. The brain splits any scene into an object (figure) and a background (ground) and assigns each edge to the figure. In this picture the same edge fits either "vase" or "face" and the roles swap. Rubin showed that the figure feels closer and more solid than the ground, and that you remember the figure better.</p>',
    draw: function (st) {
      var pts = [[0, 80], [40, 80], [70, 62], [95, 44], [115, 58], [135, 64], [155, 56], [170, 62], [185, 52], [210, 68], [235, 46], [265, 60], [310, 84], [340, 110], [360, 130]];
      function w(y) {
        for (var i = 0; i < pts.length - 1; i++) if (y >= pts[i][0] && y <= pts[i + 1][0]) {
          var t = (y - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); t = t * t * (3 - 2 * t);
          return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
        }
        return 130;
      }
      var cx = 260, y0 = 30, L = [], R = [], y;
      for (y = 0; y <= 360; y += 3) { L.push([cx - w(y), y0 + y]); R.push([cx + w(y), y0 + y]); }
      var vase = L.concat(R.slice().reverse());
      var fill = st === 1 ? '#fde68a' : '#fff';
      var bg = st === 2 ? '#bfdbfe' : '#111';
      var s = S.rect(0, 0, 520, 420, bg) + S.poly(vase, fill);
      return s;
    }
  });

  OI.add({
    id: 'penrose', sec: 'ambiguous', kind: 'svg', w: 520, h: 460, states: 2,
    stateLabels: ['Check the corners', 'Hide the check'],
    title: 'Penrose triangle',
    q: 'Each corner looks fine on its own. Can you build this triangle out of three real straight beams?',
    a: 'No. It is an impossible object: every corner is a perfectly good 90° joint, but the three joints cannot all be true at once. Only the drawing exists.',
    credit: 'Oscar Reutersvärd, 1934; Lionel and Roger Penrose, 1958',
    why: '<p>Your brain judges every small region of the drawing on its own, and each looks like a valid 3D corner. It never checks that all the local answers agree about distance. The picture is an isometric view of three beams that run along the three axes (x, y, then z) and close up on the page exactly because the three directions add to zero in the drawing. A real wooden model exists, but it looks like a triangle from <em>one</em> viewpoint only; from any other angle it falls apart.</p>',
    draw: function (st) {
      var c = Math.cos(30 * RAD), sn = 0.5, L = 290, t = 62;
      function P(x, y, z) { return [c * (x - y), sn * (x + y) - z]; }
      var TOP = '#a78bfa', MID = '#7c3aed', DARK = '#4c1d95';
      function q(a, b, c2, d, col) { return S.poly([P.apply(null, a), P.apply(null, b), P.apply(null, c2), P.apply(null, d)], col, '#1e1b4b', 3); }
      var o = '';
      // X beam
      o += q([0, 0, t], [L, 0, t], [L, t, t], [0, t, t], TOP);
      o += q([0, t, 0], [L, t, 0], [L, t, t], [0, t, t], MID);
      // Y beam
      o += q([L - t, 0, t], [L, 0, t], [L, L, t], [L - t, L, t], TOP);
      o += q([L, 0, 0], [L, L, 0], [L, L, t], [L, 0, t], DARK);
      // Z beam, drawn last so its top face lands exactly on the start of the X beam
      o += q([L - t, L, 0], [L, L, 0], [L, L, L], [L - t, L, L], MID);
      o += q([L, L - t, 0], [L, L, 0], [L, L, L], [L, L - t, L], DARK);
      o += q([L - t, L - t, L], [L, L - t, L], [L, L, L], [L - t, L, L], TOP);
      if (st) {
        var m = [[L - t / 2, t / 2, t], [L - t / 2, L - t / 2, t], [t / 2, t / 2, t]];
        m.forEach(function (p, i) {
          var pt = P(p[0], p[1], p[2] - (i === 2 ? 0 : 0));
          if (i === 1) pt = P(L - t / 2, L - t / 2, t);
          o += '<g transform="translate(' + f(pt[0]) + ' ' + f(pt[1]) + ') rotate(90)">' + S.circle(0, 0, 21, '#fff', G, 3.5) + S.text(0, 7, String(i + 1), 20, G) + '</g>';
        });
      }
      return '<g transform="translate(260 230) rotate(-90) translate(' + f(-c * (L - t) / 2) + ' ' + f(-(L - t) / 2) + ')">' + o + '</g>';
    }
  });
})();
