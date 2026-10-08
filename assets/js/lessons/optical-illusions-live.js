/* Optical Illusions Lab: animated and interactive demos
   (lilac chaser, Benham's disk, motion aftereffect, magic-eye stereogram, hybrid image,
   Stroop, change blindness, and the Müller-Lyer measurement experiment). Nothing here starts by itself. */
(function () {
  'use strict';
  var OI = window.OI, S = OI.s;
  var TAU = Math.PI * 2;

  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function reduced() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* A requestAnimationFrame loop that pauses when the tab is hidden and can be stopped. */
  function loop(fn) {
    var id = 0, last = 0, running = false;
    function tick(t) { if (!running) return; var dt = last ? Math.min(0.1, (t - last) / 1000) : 0; last = t; fn(t, dt); id = requestAnimationFrame(tick); }
    function onVis() { if (document.hidden) { cancelAnimationFrame(id); last = 0; } else if (running) id = requestAnimationFrame(tick); }
    document.addEventListener('visibilitychange', onVis);
    return {
      start: function () { if (running) return; running = true; last = 0; id = requestAnimationFrame(tick); },
      stop: function () { running = false; cancelAnimationFrame(id); },
      get running() { return running; }
    };
  }

  function canvasIn(stage, w, h, label) {
    var c = OI.canvas(w, h); c.className = 'oi-live-canvas'; c.setAttribute('role', 'img'); c.setAttribute('aria-label', label);
    stage.appendChild(c); return c;
  }

  /* ---------- Lilac chaser ---------- */
  OI.add({
    id: 'lilac-chaser', sec: 'negative', kind: 'live',
    title: 'Lilac chaser',
    why: '<p>Three things happen at once. The gap moving around the ring leaves a patch of retina that was just "off", and the cells that were looking at pink are adapted, so that spot shows the afterimage of pink: <strong>green</strong>. Then your brain connects the green spots into a moving dot. Last, because you are staring, the pink discs themselves fade by Troxler fading, so only the green dot seems to be left on a gray page.</p>',
    mount: function (stage, controls) {
      var W = 520, canvas = canvasIn(stage, W, W, 'Twelve blurry pink discs in a ring with a black cross in the middle; one disc is missing at any moment.');
      var ctx = canvas.getContext('2d');
      var cap = mk('p', 'oi-live-cap');
      cap.innerHTML = '<strong>Lilac chaser.</strong> Press Start and keep your eyes on the black cross for 20 to 30 seconds. What color is the gap, and what happens to the pink discs?';
      stage.appendChild(cap);
      var gap = 0, last = 0, step = 110;
      function draw() {
        ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 0, W, W);
        for (var i = 0; i < 12; i++) {
          if (i === gap) continue;
          var a = i * TAU / 12 - Math.PI / 2, x = W / 2 + 190 * Math.cos(a), y = W / 2 + 190 * Math.sin(a);
          var g = ctx.createRadialGradient(x, y, 6, x, y, 42);
          g.addColorStop(0, '#f1b5f5'); g.addColorStop(0.7, '#e9a0ef'); g.addColorStop(1, 'rgba(233,160,239,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 42, 0, TAU); ctx.fill();
        }
        ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath();
        ctx.moveTo(W / 2 - 14, W / 2); ctx.lineTo(W / 2 + 14, W / 2); ctx.moveTo(W / 2, W / 2 - 14); ctx.lineTo(W / 2, W / 2 + 14); ctx.stroke();
      }
      var lp = loop(function (t) { if (t - last > step) { last = t; gap = (gap + 1) % 12; draw(); } });
      var btn = OI.button('▶ Start', function () {
        if (lp.running) { lp.stop(); btn.textContent = '▶ Start'; } else { lp.start(); btn.textContent = '■ Stop'; }
      }, 'oi-btn-main');
      controls.appendChild(btn);
      controls.appendChild(OI.slider({ label: 'Speed:', min: 60, max: 220, value: 110, step: 10, unit: ' ms' }, function (v) { step = v; }));
      draw();
    }
  });

  /* ---------- Benham's disk ---------- */
  OI.add({
    id: 'benham', sec: 'color', kind: 'live',
    title: "Benham's disk",
    why: '<p>The disk is only black and white, yet when it spins, faint colors appear in rings. Nobody is completely sure why. The leading idea is that the color channels in your visual system respond to a flash at slightly different speeds, so the arcs, which flash each ring on and off with different timing, upset the balance between channels, and the mismatch is read as color. Gustav Fechner described the effect in 1838, before Charles Benham turned it into a toy in 1894. Reverse the spin and the order of the colors reverses too. The effect depends on speed and your display; some people see it clearly and others barely at all.</p>',
    mount: function (stage, controls) {
      var N = 460, canvas = canvasIn(stage, N, N, "A disk that is half solid black and half white with four black arcs. When it spins, pale colored rings appear.");
      var ctx = canvas.getContext('2d');
      var cap = mk('p', 'oi-live-cap');
      cap.innerHTML = '<strong>Benham\'s disk.</strong> Press Start and look at the middle of the spinning disk. Do pale colors appear in the rings? Press Reverse and watch the colors swap places.';
      stage.appendChild(cap);
      var ang = 0, rps = 5, dir = 1, R = 210;
      function draw() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, N, N);
        ctx.translate(N / 2, N / 2); ctx.rotate(ang);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 7; ctx.lineCap = 'butt';
        [[0.3, 190, 235], [0.48, 235, 280], [0.66, 280, 325], [0.84, 315, 360]].forEach(function (a) {
          ctx.beginPath(); ctx.arc(0, 0, R * a[0], a[1] * Math.PI / 180, a[2] * Math.PI / 180); ctx.stroke();
        });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#e11d48'; ctx.beginPath(); ctx.arc(N / 2, N / 2, 4, 0, TAU); ctx.fill();
      }
      var lp = loop(function (t, dt) { ang += dir * rps * TAU * dt; draw(); });
      var btn = OI.button('▶ Start spinning', function () {
        if (lp.running) { lp.stop(); btn.textContent = '▶ Start spinning'; } else { lp.start(); btn.textContent = '■ Stop'; }
      }, 'oi-btn-main');
      controls.appendChild(btn);
      controls.appendChild(OI.button('⇄ Reverse', function () { dir = -dir; if (!lp.running) { ang += 0; draw(); } }));
      controls.appendChild(OI.slider({ label: 'Speed:', min: 2, max: 9, value: 5, step: 0.5, unit: ' turns/s' }, function (v) { rps = v; }));
      draw();
    }
  });

  /* ---------- Motion aftereffect spiral ---------- */
  OI.add({
    id: 'spiral-aftereffect', sec: 'motion', kind: 'live',
    title: 'The waterfall effect (motion aftereffect)',
    why: '<p>Neurons that detect motion in one direction also adapt. After you stare at an expanding pattern, the "outward" cells are tired, and when the picture freezes the "inward" cells are no longer opposed, so the still spiral seems to shrink. These direction-sensing neurons are in the brain (area MT), not the eye. Aristotle described the same effect after watching a river, and the name "waterfall illusion" comes from Robert Addams, who in 1834 watched the Falls of Foyers in Scotland and then saw the rocks beside them creep upward.</p>',
    mount: function (stage, controls) {
      var N = 460, canvas = canvasIn(stage, N, N, 'A black and white spiral that can rotate. After it stops, the still spiral seems to move the other way.');
      var ctx = canvas.getContext('2d');
      var cap = mk('p', 'oi-live-cap');
      var ang = 0, spinning = false, dir = 1, left = 0, total = 25;
      function setCap(t) { cap.innerHTML = t; }
      setCap('<strong>Waterfall effect.</strong> Press Start. Keep your eyes on the red dot in the middle of the spinning spiral for 25 seconds. When it stops, watch the frozen spiral.');
      stage.appendChild(cap);
      function draw() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, N, N);
        ctx.translate(N / 2, N / 2); ctx.rotate(ang);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 15; ctx.lineCap = 'butt';
        for (var arm = 0; arm < 4; arm++) {
          ctx.beginPath();
          for (var th = 0; th < 5 * Math.PI; th += 0.05) {
            var r = 14 + th * 14, x = r * Math.cos(th + arm * Math.PI / 2), y = r * Math.sin(th + arm * Math.PI / 2);
            if (r > 215) break;
            if (th === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#e11d48'; ctx.beginPath(); ctx.arc(N / 2, N / 2, 6, 0, TAU); ctx.fill();
      }
      var lp = loop(function (t, dt) {
        if (spinning) {
          ang += dir * 0.7 * dt * TAU / 2; left -= dt;
          setCap('<strong>Keep staring at the red dot…</strong> ' + Math.max(0, Math.ceil(left)) + ' seconds left.');
          if (left <= 0) { spinning = false; btn.textContent = '▶ Start again'; setCap('<strong>Stopped.</strong> Look at the frozen spiral now. Does it seem to creep the other way, even though nothing moves?'); lp.stop(); }
        }
        draw();
      });
      var btn = OI.button('▶ Start', function () {
        if (spinning) { spinning = false; lp.stop(); btn.textContent = '▶ Start'; setCap('Stopped early. Press Start to try the full 25 seconds.'); draw(); return; }
        spinning = true; left = total; btn.textContent = '■ Stop early'; lp.start();
      }, 'oi-btn-main');
      controls.appendChild(btn);
      controls.appendChild(OI.button('⇄ Reverse direction', function () { dir = -dir; }));
      draw();
    }
  });

  /* ---------- Magic-eye stereogram ---------- */
  var SG_W = 320, SG_H = 180, SG_E = 90, SG_MU = 1 / 3;
  function depthMap() {
    var Z = new Float32Array(SG_W * SG_H), x, y, cx = SG_W / 2, cy = SG_H / 2 + 6;
    var star = [], i;
    for (i = 0; i < 10; i++) { var rr = i % 2 ? 26 : 60, a = (i * 36 - 90) * Math.PI / 180; star.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
    function inStar(px, py) {
      var inside = false;
      for (var a = 0, b = star.length - 1; a < star.length; b = a++) {
        if (((star[a][1] > py) !== (star[b][1] > py)) && (px < (star[b][0] - star[a][0]) * (py - star[a][1]) / (star[b][1] - star[a][1]) + star[a][0])) inside = !inside;
      }
      return inside;
    }
    for (y = 0; y < SG_H; y++) for (x = 0; x < SG_W; x++) {
      var d = Math.hypot(x - cx, y - cy), z = 0;
      if (inStar(x, y)) z = 0.85; else if (d > 74 && d < 86) z = 0.42;
      Z[y * SG_W + x] = z;
    }
    return Z;
  }
  function sirds(Z) {
    var out = new Uint8Array(SG_W * SG_H), x, y;
    function sep(z) { return Math.round((1 - SG_MU * z) * SG_E / (2 - SG_MU * z)); }
    function zAt(xx, yy) { return (xx < 0 || xx >= SG_W) ? 0 : Z[yy * SG_W + xx]; }
    for (y = 0; y < SG_H; y++) {
      var same = new Int32Array(SG_W);
      for (x = 0; x < SG_W; x++) same[x] = x;
      for (x = 0; x < SG_W; x++) {
        var z = Z[y * SG_W + x], s = sep(z), left = x - ((s + (s & y & 1)) >> 1), right = left + s;
        if (left >= 0 && right < SG_W) {
          var visible = true, t = 1, zt;
          do {
            zt = z + 2 * (2 - SG_MU * z) * t / (SG_MU * SG_E);
            visible = zAt(x - t, y) < zt && zAt(x + t, y) < zt;
            t++;
          } while (visible && zt < 1);
          if (visible) {
            var l = left, r = right, k = same[l];
            while (k !== l && k !== r) { if (k < r) l = k; else { l = r; r = k; } k = same[l]; }
            same[l] = r;
          }
        }
      }
      for (x = SG_W - 1; x >= 0; x--) out[y * SG_W + x] = (same[x] === x) ? (Math.random() < 0.5 ? 0 : 1) : out[y * SG_W + same[x]];
    }
    return out;
  }
  var sgCache = null;
  OI.add({
    id: 'stereogram', sec: 'ambiguous', kind: 'canvas', w: 640, h: 360, states: 2,
    stateLabels: ['Show the hidden depth map', 'Show the dots again'],
    title: 'Magic-eye stereogram',
    q: 'Relax your eyes as if looking through the screen at something far away, until the two dots at the top become three. Hold it. What shape rises out of the page?',
    a: 'The picture is only random black and white dots. The depth map shows the hidden shape: a star on a ring. The depth comes entirely from tiny left-right shifts in the dot patterns.',
    credit: 'Random-dot method: Béla Julesz (1960); single-image method: Christopher Tyler and Maureen Clarke (1990)',
    why: '<p>Each row of dots repeats with a spacing that depends on the hidden depth. When your eyes diverge so that each eye sees a different copy of the repeating pattern, your brain matches the two copies and reads the shift between them as <span data-glossary="binocular disparity">binocular disparity</span>, which means depth. No single dot carries any depth information; only the pattern of shifts does. Some people, estimates range from about 1 in 20 to 1 in 10, have little or no 3D vision from two eyes (often after a childhood squint or lazy eye) and cannot see the shape. That is no failure of effort.</p>',
    draw: function (ctx, w, h, st) {
      if (!sgCache) { var Z = depthMap(); sgCache = { Z: Z, px: sirds(Z) }; }
      var Z = sgCache.Z, px = sgCache.px, x, y, k = 2;
      for (y = 0; y < SG_H; y++) for (x = 0; x < SG_W; x++) {
        if (st) { var v = Math.round(255 * (1 - Z[y * SG_W + x])); ctx.fillStyle = OI.hex(v, v, v); }
        else ctx.fillStyle = px[y * SG_W + x] ? '#fff' : '#111';
        ctx.fillRect(x * k, y * k, k, k);
      }
      if (!st) {
        var half = Math.round((1) * SG_E / 2) * k / 1; // far separation in screen px = E/2 * 2
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
        [w / 2 - half / 2, w / 2 + half / 2].forEach(function (dx) { ctx.beginPath(); ctx.arc(dx, 22, 8, 0, TAU); ctx.fill(); ctx.stroke(); });
      }
    }
  });

  /* ---------- Hybrid image ---------- */
  function blurPass(src, w, h, r) {
    var tmp = new Float32Array(w * h), out = new Float32Array(w * h), x, y, k, acc, n = 2 * r + 1;
    for (y = 0; y < h; y++) {
      acc = 0; for (k = -r; k <= r; k++) acc += src[y * w + Math.min(w - 1, Math.max(0, k))];
      for (x = 0; x < w; x++) { tmp[y * w + x] = acc / n; acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)]; }
    }
    for (x = 0; x < w; x++) {
      acc = 0; for (k = -r; k <= r; k++) acc += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
      for (y = 0; y < h; y++) { out[y * w + x] = acc / n; acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; }
    }
    return out;
  }
  function gaussish(src, w, h, r) { return blurPass(blurPass(blurPass(src, w, h, r), w, h, r), w, h, r); }
  function textLum(word, w, h, size) {
    var c = OI.canvas(w, h), ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#000';
    ctx.font = '900 ' + size + 'px "Arial Black",Arial,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(word, w / 2, h / 2 + 4);
    var d = ctx.getImageData(0, 0, w, h).data, out = new Float32Array(w * h);
    for (var i = 0; i < w * h; i++) out[i] = d[i * 4] / 255;
    return out;
  }
  OI.add({
    id: 'hybrid', sec: 'ambiguous', kind: 'live',
    title: 'Hybrid image: near and far',
    why: '<p>Fine detail (high spatial frequencies) is visible only when you are close; coarse blobs (low frequencies) are visible from far away. This picture stacks the sharp outlines of one word on top of a blurred version of another. Up close your eye locks on to the detail, and from far away the detail is below what your eye can resolve, so only the blur remains. Philippe Schyns and Aude Oliva first used hybrids like this in 1994 to study how the visual system uses spatial frequency, and Oliva, Antonio Torralba and Schyns made them famous as "hybrid images" in 2006.</p>',
    mount: function (stage, controls) {
      var W = 480, H = 220, base = OI.canvas(W, H), c = canvasIn(stage, W, H, 'A word made of sharp thin outlines overlaid on a blurred second word. The slider shrinks the picture to simulate stepping back.');
      var A = textLum('EYE', W, H, 190), B = textLum('BRAIN', W, H, 118);
      var lowA = gaussish(A, W, H, 9), lowB = gaussish(B, W, H, 1);
      var bctx = base.getContext('2d'), img = bctx.createImageData(W, H), i;
      for (i = 0; i < W * H; i++) {
        var v = 0.5 + (lowA[i] - 0.5) * 0.75 + (B[i] - lowB[i]) * 1.7;
        v = Math.max(0, Math.min(1, v)) * 255;
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
      }
      bctx.putImageData(img, 0, 0);
      var ctx = c.getContext('2d');
      var cap = mk('p', 'oi-live-cap'); stage.appendChild(cap);
      function draw(t) {
        var s = 1 - 0.82 * t / 100, w = W * s, h = H * s;
        ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(base, (W - w) / 2, (H - h) / 2, w, h);
        cap.innerHTML = '<strong>Hybrid image.</strong> ' + (t < 35 ? 'Up close you read a word made of sharp outlines.' : (t > 70 ? 'From far away a different word emerges from the blur.' : 'Somewhere in between, the picture switches.')) + ' Slide to step back from the screen.';
      }
      controls.appendChild(OI.slider({ label: 'Step back:', min: 0, max: 100, value: 0, step: 1, unit: '%' }, draw));
      draw(0);
    }
  });

  /* ---------- Stroop ---------- */
  OI.add({
    id: 'stroop', sec: 'mind', kind: 'live', noFullscreen: true,
    title: 'Stroop effect',
    why: '<p>Reading is so automatic that you cannot switch it off. In round 2 the written word says one thing and the ink says another, and the two compete in your brain, so naming the ink takes longer. John Ridley Stroop published the effect in 1935, and psychologists still use it to measure attention and self-control.</p>',
    mount: function (stage, controls) {
      var COL = { RED: '#dc2626', BLUE: '#2563eb', GREEN: '#15803d', ORANGE: '#c2410c', PURPLE: '#7e22ce', BROWN: '#78350f' };
      var names = Object.keys(COL), times = [], t0 = 0, round = 0;
      var box = mk('div', 'oi-stroop'); box.textContent = 'The words will appear here.'; var out = mk('p', 'oi-live-cap'); stage.appendChild(box); stage.appendChild(out);
      out.innerHTML = '<strong>Stroop test.</strong> Say the <em>ink color</em> of each word out loud, not the word. Round 1: matching. Round 2: not matching. Press Start to see round 1, and Done as soon as you finish.';
      function list(match) {
        box.innerHTML = '';
        for (var i = 0; i < 24; i++) {
          var w = names[Math.floor(Math.random() * names.length)], ink = w;
          if (!match) { do { ink = names[Math.floor(Math.random() * names.length)]; } while (ink === w); }
          var s = mk('span', 'oi-stroop-w', w); s.style.color = COL[ink]; box.appendChild(s);
        }
      }
      var btn = OI.button('▶ Start round 1', function () {
        if (round === 0 || round === 2) { round++; list(round === 1); t0 = performance.now(); btn.textContent = '✔ Done'; if (round === 1) times = []; return; }
        times.push((performance.now() - t0) / 1000); box.innerHTML = '';
        if (round === 1) { round = 2; btn.textContent = '▶ Start round 2'; out.innerHTML = 'Round 1: <strong>' + times[0].toFixed(1) + ' s</strong>. Now round 2: the words and inks disagree.'; }
        else { round = 0; btn.textContent = '▶ Try again'; var d = times[1] - times[0]; out.innerHTML = 'Round 1: <strong>' + times[0].toFixed(1) + ' s</strong>. Round 2: <strong>' + times[1].toFixed(1) + ' s</strong>. ' + (d > 0 ? 'The disagreement cost you ' + d.toFixed(1) + ' s (' + Math.round(d / times[0] * 100) + '%).' : 'You were just as fast. Try again with the words faster.'); }
      }, 'oi-btn-main');
      controls.appendChild(btn);
    }
  });

  /* ---------- Change blindness ---------- */
  OI.add({
    id: 'change-blindness', sec: 'mind', kind: 'live',
    title: 'Change blindness',
    why: '<p>We feel as if we see the whole scene in detail, but the brain keeps only a rough sketch and fills in the rest on demand. Normally a change creates a sudden flicker of motion that grabs attention. The blank flash hides that signal, and the change goes unnoticed until you hold the right spot in attention. It is a reason why eyewitnesses and drivers miss obvious things.</p>',
    mount: function (stage, controls) {
      var W = 520, H = 340, c = canvasIn(stage, W, H, 'A picture of twelve balloons over hills that flickers with a blank gray screen. One balloon changes each time.');
      var ctx = c.getContext('2d'), items, change, found = false, phase = 0, startT = 0, timer = null, showing = false;
      var cap = mk('p', 'oi-live-cap'); stage.appendChild(cap);
      var palette = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#eab308'];
      function newPuzzle() {
        items = [];
        for (var i = 0; i < 12; i++) items.push({ x: 40 + (i % 6) * 84 + Math.random() * 20, y: 50 + Math.floor(i / 6) * 110 + Math.random() * 26, r: 24 + Math.random() * 6, col: palette[i % palette.length] });
        change = Math.floor(Math.random() * 12); found = false; startT = performance.now();
        cap.innerHTML = '<strong>Find the change.</strong> One balloon changes color every time the picture flashes. Click it.';
      }
      function scene(alt) {
        var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#93c5fd'); g.addColorStop(1, '#e0f2fe');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 290); ctx.quadraticCurveTo(130, 230, 260, 290); ctx.quadraticCurveTo(390, 340, W, 280); ctx.lineTo(W, H); ctx.fill();
        items.forEach(function (it, i) {
          var col = (alt && i === change) ? palette[(palette.indexOf(it.col) + 3) % palette.length] : it.col;
          ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(it.x, it.y + it.r); ctx.lineTo(it.x, it.y + it.r + 28); ctx.stroke();
          ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(it.x, it.y, it.r * 0.85, it.r, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(it.x - it.r * 0.3, it.y - it.r * 0.35, it.r * 0.2, it.r * 0.35, -0.5, 0, TAU); ctx.fill();
        });
      }
      function blank() { ctx.fillStyle = '#9ca3af'; ctx.fillRect(0, 0, W, H); }
      function cycle() {
        var seq = [[false, 650], [null, 140], [true, 650], [null, 140]];
        scene(false); var i = 0;
        function next() { var s = seq[i % 4]; if (s[0] === null) blank(); else scene(s[0]); i++; timer = setTimeout(next, s[1]); }
        timer = setTimeout(next, 650);
      }
      function stop() { clearTimeout(timer); timer = null; scene(false); }
      c.addEventListener('click', function (e) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height, it = items[change];
        if (Math.hypot(x - it.x, y - it.y) < it.r + 14) {
          found = true; stop(); btn.textContent = '▶ New puzzle';
          cap.innerHTML = '<strong>Found it</strong> in ' + ((performance.now() - startT) / 1000).toFixed(1) + ' seconds. The balloon is circled in red.';
          ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(it.x, it.y, it.r + 10, 0, TAU); ctx.stroke();
        } else cap.innerHTML = 'Not that one. Keep looking, or press Reveal.';
      });
      var btn = OI.button('▶ Start', function () {
        if (timer) { stop(); btn.textContent = '▶ Start'; return; }
        if (found) newPuzzle();
        btn.textContent = '■ Pause'; cycle();
      }, 'oi-btn-main');
      controls.appendChild(btn);
      controls.appendChild(OI.button('Reveal the change', function () {
        stop(); btn.textContent = '▶ Start'; scene(true);
        var it = items[change]; ctx.strokeStyle = '#e11d48'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(it.x, it.y, it.r + 10, 0, TAU); ctx.stroke();
        cap.innerHTML = 'The circled balloon changes color between the two versions.';
      }));
      newPuzzle(); scene(false);
    }
  });

  /* ---------- Müller-Lyer experiment ---------- */
  OI.add({
    id: 'muller-lyer-experiment', sec: 'mind', kind: 'live', noFullscreen: true, wide: true,
    title: 'Experiment: measure your Müller-Lyer illusion',
    why: '<p>This is the <em>method of adjustment</em>, a classic technique in psychophysics: the person adjusts a stimulus until it matches a standard, and the average error measures the strength of the illusion. Starting once from a short setting and once from a long one cancels out a habit of stopping early. With a few trials from several classmates, you can compare the mean illusion and see how much it varies from person to person.</p>',
    mount: function (stage, controls) {
      var trials = [], FIX = 300, cur = 220;
      var svgWrap = mk('div', 'oi-ml-wrap'); stage.appendChild(svgWrap);
      var cap = mk('p', 'oi-live-cap'); stage.appendChild(cap);
      var table = mk('div', 'oi-ml-table'); stage.appendChild(table);
      cap.innerHTML = '<strong>Your job:</strong> slide the bottom line until it <em>looks</em> exactly as long as the top line. Do not measure. Trust your eyes, then press Record.';
      function ends(y, x1, x2, inward) {
        var f = 26, d = inward ? 1 : -1, o = S.line(x1, y, x2, y, '#111', 5, 'stroke-linecap="round"');
        [[x1, d], [x2, -d]].forEach(function (e) {
          o += S.line(e[0], y, e[0] + e[1] * f, y - f, '#111', 5, 'stroke-linecap="round"') + S.line(e[0], y, e[0] + e[1] * f, y + f, '#111', 5, 'stroke-linecap="round"');
        });
        return o;
      }
      function paint() {
        var cx = 300, w = 600, h = 220;
        var inner = ends(70, cx - FIX / 2, cx + FIX / 2, false) + ends(160, cx - cur / 2, cx + cur / 2, true);
        svgWrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Two horizontal lines. The top line has fins pointing outward; the bottom line is adjustable and has fins pointing inward."><rect width="' + w + '" height="' + h + '" fill="#fff"/>' + inner + '</svg>';
      }
      function report() {
        if (!trials.length) { table.innerHTML = ''; return; }
        var sum = 0, rows = trials.map(function (t, i) { sum += t.pct; return '<tr><th scope="row">' + (i + 1) + '</th><td>' + t.px + ' px</td><td>' + (t.pct >= 0 ? '+' : '') + t.pct.toFixed(1) + '%</td><td>' + (t.start === 'short' ? 'started short' : 'started long') + '</td></tr>'; }).join('');
        var mean = sum / trials.length;
        table.innerHTML = '<table class="oi-table oi-table-small"><caption>Your trials (the top line is exactly ' + FIX + ' px)</caption><thead><tr><th scope="col">Trial</th><th scope="col">You set</th><th scope="col">Illusion</th><th scope="col">How you began</th></tr></thead><tbody>' + rows + '</tbody></table>'
          + '<p class="oi-live-cap"><strong>Average illusion: ' + (mean >= 0 ? '+' : '') + mean.toFixed(1) + '%</strong> (illusion = (your setting − 300) ÷ 300 × 100). ' + (trials.length < 4 ? 'Do at least four trials for a stable average.' : (mean > 3 ? 'Your eyes measured the line with inward fins as shorter than it is. That is the illusion.' : 'Your average is close to zero. Try again, and compare with a classmate.')) + '</p>';
      }
      var range = OI.slider({ label: 'Bottom line:', min: 180, max: 420, value: cur, step: 1, unit: ' px' }, function (v) { cur = v; paint(); });
      function nextStart() { var startShort = trials.length % 2 === 0; cur = startShort ? 220 : 400; range.input.value = cur; range.querySelector('output').textContent = cur + ' px'; paint(); return startShort ? 'short' : 'long'; }
      var startKind = 'short';
      controls.appendChild(range);
      controls.appendChild(OI.button('Record this trial', function () {
        trials.push({ px: cur, pct: (cur - FIX) / FIX * 100, start: startKind }); report(); startKind = nextStart();
      }, 'oi-btn-main'));
      controls.appendChild(OI.button('Clear trials', function () { trials = []; report(); startKind = nextStart(); }));
      startKind = nextStart();
    }
  });
})();
