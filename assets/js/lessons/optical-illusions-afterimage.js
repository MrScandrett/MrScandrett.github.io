/* Optical Illusions Lab: the negative-color afterimage lab.
 *
 * A "negative" picture is the RGB inverse (255 - value) of the real picture. After staring at it,
 * the tired cone channels cause a gray screen to look like the real picture's colors.
 * Modes: 'negative' (stare at the inverse, then see the picture in gray) and
 *        'direct'   (stare at the colors, then see their opposites on a plain screen).
 * Photos chosen with "Your photo" are read in the browser only; nothing is uploaded. */
(function () {
  'use strict';
  var OI = window.OI;
  var W = 640, H = 400, TAU = Math.PI * 2;

  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function invert(src) {
    var c = OI.canvas(W, H), x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    var img = x.getImageData(0, 0, W, H), d = img.data;
    for (var i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; }
    x.putImageData(img, 0, 0);
    return c;
  }
  function grayscale(src) {
    var c = OI.canvas(W, H), x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    var img = x.getImageData(0, 0, W, H), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      l = 70 + l * 0.62; // keep it mid-bright so the afterimage color has room to show
      d[i] = d[i + 1] = d[i + 2] = l;
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  function plain(color) { var c = OI.canvas(W, H), x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, W, H); return c; }

  function star(x, cx, cy, r) {
    x.beginPath();
    for (var i = 0; i < 10; i++) { var rr = i % 2 ? r * 0.4 : r, a = -Math.PI / 2 + i * Math.PI / 5; x[i ? 'lineTo' : 'moveTo'](cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
    x.closePath(); x.fill();
  }

  /* ---------- the pictures (always drawn in their TRUE colors) ---------- */
  var PICS = [
    {
      id: 'flag', label: 'Flag', mode: 'negative', after: 'picture',
      blurb: 'A flag drawn in the opposite colors. Stare, then see it in red, white and blue.',
      draw: function (x) {
        x.fillStyle = '#808080'; x.fillRect(0, 0, W, H);
        var fw = 560, fh = 295, fx = 40, fy = 52, sh = fh / 13, i, j;
        for (i = 0; i < 13; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#b22234'; x.fillRect(fx, fy + i * sh, fw, sh + 0.5); }
        var cw = 224, ch = 7 * sh;
        x.fillStyle = '#3c3b6e'; x.fillRect(fx, fy, cw, ch);
        x.fillStyle = '#fff';
        for (j = 0; j < 9; j++) {
          var n = j % 2 ? 5 : 6;
          for (i = 0; i < n; i++) star(x, fx + (j % 2 ? 2 : 1) * cw / 12 + i * cw / 6 + (j % 2 ? 0 : 0), fy + (j + 1) * ch / 10, 6.2);
        }
      }
    },
    {
      id: 'scene', label: 'Rainbow scene', mode: 'negative', after: 'picture',
      blurb: 'A saturated landscape. The more vivid the colors, the stronger the afterimage.',
      draw: function (x) {
        var g = x.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, '#1d4ed8'); g.addColorStop(1, '#bfdbfe');
        x.fillStyle = g; x.fillRect(0, 0, W, H);
        x.fillStyle = '#facc15'; x.beginPath(); x.arc(540, 74, 40, 0, TAU); x.fill();
        ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#6366f1', '#a855f7'].forEach(function (c, i) {
          x.strokeStyle = c; x.lineWidth = 12; x.beginPath(); x.arc(250, 310, 240 - i * 11, Math.PI, 0); x.stroke();
        });
        x.fillStyle = '#15803d'; x.beginPath(); x.moveTo(0, 320); x.quadraticCurveTo(160, 230, 330, 300); x.quadraticCurveTo(480, 350, W, 270); x.lineTo(W, H); x.lineTo(0, H); x.fill();
        x.fillStyle = '#22c55e'; x.beginPath(); x.moveTo(0, 360); x.quadraticCurveTo(200, 300, 400, 350); x.quadraticCurveTo(520, 380, W, 340); x.lineTo(W, H); x.lineTo(0, H); x.fill();
        x.fillStyle = '#b91c1c'; x.fillRect(450, 238, 110, 80); x.fillStyle = '#7f1d1d'; x.beginPath(); x.moveTo(440, 240); x.lineTo(505, 192); x.lineTo(570, 240); x.fill();
        x.fillStyle = '#fff'; x.fillRect(485, 270, 40, 48); x.fillStyle = '#0ea5e9'; x.beginPath(); x.ellipse(120, 365, 90, 20, 0, 0, TAU); x.fill();
        x.fillStyle = '#78350f'; x.fillRect(330, 250, 14, 50); x.fillStyle = '#16a34a'; x.beginPath(); x.arc(337, 235, 36, 0, TAU); x.fill();
        [['#ec4899', 60], ['#facc15', 100], ['#a855f7', 140], ['#fb923c', 200]].forEach(function (f, i) { x.fillStyle = f[0]; x.beginPath(); x.arc(f[1], 340 + (i % 2) * 22, 8, 0, TAU); x.fill(); });
      }
    },
    {
      id: 'dots', label: 'Colored dots', mode: 'direct', after: 'white',
      blurb: 'Three bright dots. Predict the color of each afterimage before the screen changes.',
      draw: function (x) {
        x.fillStyle = '#808080'; x.fillRect(0, 0, W, H);
        [[130, '#ff2020'], [320, '#18d640'], [510, '#2848ff']].forEach(function (d) { x.fillStyle = d[1]; x.beginPath(); x.arc(d[0], 200, 82, 0, TAU); x.fill(); });
      },
      moveFix: true
    },
    {
      id: 'bulb', label: 'Light bulb', mode: 'direct', after: 'gray',
      blurb: 'A glowing bulb. Its afterimage is a dark bulb, because the tired cells all go quiet at once.',
      draw: function (x) {
        x.fillStyle = '#202020'; x.fillRect(0, 0, W, H);
        var g = x.createRadialGradient(320, 170, 10, 320, 170, 150); g.addColorStop(0, 'rgba(255,250,200,1)'); g.addColorStop(1, 'rgba(255,250,200,0)');
        x.fillStyle = g; x.fillRect(120, 0, 400, 340);
        x.fillStyle = '#fff6bf'; x.beginPath(); x.arc(320, 160, 92, 0, TAU); x.fill();
        x.fillRect(284, 220, 72, 60); x.fillStyle = '#d1d5db'; x.fillRect(280, 280, 80, 14); x.fillRect(284, 298, 72, 14); x.fillRect(296, 316, 48, 14);
        x.strokeStyle = '#b45309'; x.lineWidth = 4; x.beginPath(); x.moveTo(296, 224); x.lineTo(304, 160); x.lineTo(320, 190); x.lineTo(336, 160); x.lineTo(344, 224); x.stroke();
      },
      moveFix: true
    },
    {
      id: 'color', label: 'Pick a color', mode: 'direct', after: 'white', picker: true,
      blurb: 'Choose any color. The lesson predicts its afterimage.',
      draw: function (x, st) {
        x.fillStyle = '#808080'; x.fillRect(0, 0, W, H);
        x.fillStyle = st.color; x.beginPath(); x.arc(320, 200, 140, 0, TAU); x.fill();
      },
      moveFix: true
    },
    {
      id: 'photo', label: 'Your photo', mode: 'negative', after: 'picture', upload: true,
      blurb: 'Load a colorful picture from your device. It never leaves your browser.',
      draw: function (x, st) {
        x.fillStyle = '#808080'; x.fillRect(0, 0, W, H);
        if (st.photo) {
          var iw = st.photo.naturalWidth, ih = st.photo.naturalHeight, s = Math.max(W / iw, H / ih), dw = iw * s, dh = ih * s;
          x.drawImage(st.photo, (W - dw) / 2, (H - dh) / 2, dw, dh);
        } else {
          x.fillStyle = '#fff'; x.font = '700 28px system-ui,Arial,sans-serif'; x.textAlign = 'center';
          x.fillText('Choose a colorful picture', W / 2, H / 2 - 4);
          x.font = '500 18px system-ui,Arial,sans-serif'; x.fillText('(it stays on your device)', W / 2, H / 2 + 28);
        }
      }
    }
  ];

  OI.add({
    id: 'afterimage-lab', sec: 'negative', first: true, bare: true, host: '#oi-lab', count: PICS.length,
    mount: function (host) {
      var st = { pic: PICS[0], phase: 'ready', color: '#e11d48', photo: null, after: null, peek: false, t0: 0, dur: 30, timer: null };
      var cache = {};

      var picker = mk('div', 'oi-lab-picker'); picker.setAttribute('role', 'group'); picker.setAttribute('aria-label', 'Choose a picture to stare at');
      var stageWrap = mk('div', 'oi-lab-stage');
      var canvas = OI.canvas(W, H); canvas.className = 'oi-lab-canvas'; canvas.setAttribute('role', 'img');
      var badge = mk('div', 'oi-lab-badge'); badge.setAttribute('aria-hidden', 'true');
      stageWrap.appendChild(canvas); stageWrap.appendChild(badge);
      var status = mk('p', 'oi-lab-status'); status.setAttribute('role', 'status');
      var controls = mk('div', 'oi-controls oi-lab-controls');
      var extra = mk('div', 'oi-lab-extra');
      host.appendChild(picker); host.appendChild(stageWrap); host.appendChild(status); host.appendChild(controls); host.appendChild(extra);

      var buttons = {};
      PICS.forEach(function (p, i) {
        var b = OI.button(p.label, function () { choose(p); }, 'oi-chip'); b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
        picker.appendChild(b); buttons[p.id] = b;
      });

      var startBtn = OI.button('▶ Start staring', function () { if (st.phase === 'stare') swap(); else if (st.phase === 'after') reset(); else begin(); }, 'oi-btn-main');
      var peekBtn = OI.button('Compare with the real picture', function () { st.peek = !st.peek; peekBtn.setAttribute('aria-pressed', st.peek ? 'true' : 'false'); show(); });
      peekBtn.setAttribute('aria-pressed', 'false');
      var durSl = OI.slider({ label: 'Stare time:', min: 15, max: 60, value: 30, step: 5, unit: ' s' }, function (v) { st.dur = v; });
      var afterSel = mk('label', 'oi-slider'); var sp = mk('span', null, 'After the swap: ');
      var sel = mk('select'); sel.id = 'oi-after-sel';
      [['auto', 'The best screen for this picture'], ['picture', 'Gray version of the picture'], ['gray', 'Plain gray'], ['white', 'Plain white']].forEach(function (o) { var op = mk('option', null, o[1]); op.value = o[0]; sel.appendChild(op); });
      sel.addEventListener('change', function () { st.after = sel.value === 'auto' ? null : sel.value; rebuild(); show(); });
      afterSel.appendChild(sp); afterSel.appendChild(sel);
      controls.appendChild(startBtn); controls.appendChild(peekBtn); controls.appendChild(durSl); controls.appendChild(afterSel);
      var fsb = OI.fullscreenButton(stageWrap); if (fsb) controls.appendChild(fsb);

      var colorWrap = mk('label', 'oi-slider oi-lab-color'); colorWrap.hidden = true;
      var colorIn = mk('input'); colorIn.type = 'color'; colorIn.value = st.color; colorIn.id = 'oi-lab-color';
      var colorOut = mk('output');
      colorWrap.appendChild(mk('span', null, 'Your color: ')); colorWrap.appendChild(colorIn); colorWrap.appendChild(colorOut);
      var fileWrap = mk('label', 'oi-slider oi-lab-file'); fileWrap.hidden = true;
      var fileIn = mk('input'); fileIn.type = 'file'; fileIn.accept = 'image/*'; fileIn.id = 'oi-lab-file';
      fileWrap.appendChild(mk('span', null, 'Your photo: ')); fileWrap.appendChild(fileIn);
      extra.appendChild(colorWrap); extra.appendChild(fileWrap);

      function hexToRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
      function updateColorOut() { var c = hexToRgb(st.color); colorOut.textContent = ' ' + st.color + ' → expected afterimage ≈ ' + OI.hex(255 - c[0], 255 - c[1], 255 - c[2]); }
      colorIn.addEventListener('input', function () { st.color = colorIn.value; updateColorOut(); rebuild(); show(); });
      fileIn.addEventListener('change', function () {
        var file = fileIn.files && fileIn.files[0]; if (!file) return;
        var url = URL.createObjectURL(file), im = new Image();
        im.onload = function () { st.photo = im; rebuild(); show(); URL.revokeObjectURL(url); };
        im.onerror = function () { status.textContent = 'That file could not be read as a picture. Try a JPG or PNG.'; URL.revokeObjectURL(url); };
        im.src = url;
      });

      /* ---- build canvases for the chosen picture ---- */
      function rebuild() {
        var p = st.pic, pos = OI.canvas(W, H);
        p.draw(pos.getContext('2d'), st);
        var stare = p.mode === 'negative' ? invert(pos) : pos;
        var mode = st.after || p.after;
        var after = mode === 'picture' ? grayscale(pos) : plain(mode === 'white' ? '#f4f4f4' : '#9a9a9a');
        cache = { pos: pos, stare: stare, after: after };
        [stare, after, pos].forEach(function (c) {
          var x = c.getContext('2d'), fx = W / 2, fy = H / 2;
          x.fillStyle = '#000'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.arc(fx, fy, 7, 0, TAU); x.fill(); x.stroke();
        });
        canvas.setAttribute('aria-label', p.mode === 'negative'
          ? 'The negative of the ' + p.label.toLowerCase() + ' picture with a fixation dot in the middle'
          : 'The ' + p.label.toLowerCase() + ' picture with a fixation dot in the middle');
      }
      function show() {
        var img = st.peek ? cache.pos : (st.phase === 'after' ? cache.after : cache.stare);
        var x = canvas.getContext('2d'); x.drawImage(img, 0, 0);
        badge.textContent = st.peek ? 'The real picture' : (st.phase === 'stare' ? 'Keep staring…' : (st.phase === 'after' ? 'Look here now' : (st.pic.mode === 'negative' ? 'The negative' : st.pic.label)));
      }
      function reset() {
        clearInterval(st.timer); st.phase = 'ready'; startBtn.textContent = '▶ Start staring';
        status.textContent = st.pic.blurb + ' Press Start, then keep your eyes on the black dot.';
        show();
      }
      function begin() {
        st.phase = 'stare'; st.peek = false; peekBtn.setAttribute('aria-pressed', 'false'); st.t0 = performance.now(); startBtn.textContent = 'Swap now';
        status.textContent = 'Keep your eyes on the black dot. Do not look around. Blinking is fine.';
        show();
        clearInterval(st.timer);
        st.timer = setInterval(function () {
          var left = Math.max(0, st.dur - (performance.now() - st.t0) / 1000);
          badge.textContent = 'Keep staring… ' + Math.ceil(left) + ' s';
          if (left <= 0) swap();
        }, 200);
      }
      function swap() {
        clearInterval(st.timer); st.phase = 'after'; startBtn.textContent = '↺ Try again';
        status.textContent = st.pic.mode === 'negative'
          ? 'Blink once and look at the dot. Do you see the colors of the real picture appear on the gray? They fade in 10 to 20 seconds.'
          : 'Blink once and look at the dot. What colors do you see where the shapes were? They fade in 10 to 20 seconds.';
        show();
      }
      function choose(p) {
        st.pic = p; st.after = sel.value === 'auto' ? null : sel.value;
        Object.keys(buttons).forEach(function (id) { buttons[id].setAttribute('aria-pressed', id === p.id ? 'true' : 'false'); });
        colorWrap.hidden = !p.picker; fileWrap.hidden = !p.upload;
        if (p.picker) updateColorOut();
        rebuild(); reset();
      }
      document.addEventListener('visibilitychange', function () { if (document.hidden && st.phase === 'stare') reset(); });
      choose(PICS[0]);
    }
  });
})();
