/* Jim Henson lesson: Camera Frame Lab.
   1. Hide the puppeteer: a side view of a TV puppet set (camera, set front, puppeteer,
      puppet, backdrop, lighting grid) and the studio monitor that shows what the lens
      sees. Points are projected with a real pinhole camera (height, tilt, vertical field
      of view); a puppeteer point counts as hidden when it is outside the frame or the
      ray from the lens to it passes below the top of the set front.
   2. Perform through the monitor: steer the puppet to targets from "behind the set"
      while watching the camera's view (left and right swapped) or a mirror.
   Units are centimetres. Needs sim-kit.js. */
(function () {
  'use strict';
  // Art is found from this script, not the page, so the lesson can live in any folder.
  var ART_URL = new URL('../../images/lessons/jim-henson/', document.currentScript.src).href;
  if (!window.SimKit) return;

  var colors = SimKit.theme.colors();
  SimKit.theme.onChange(function (c) { colors = c; });

  var D_SET = 320;            // camera to set front
  var X_PUPPET = D_SET + 15;  // puppet just behind the set front
  var X_PERF = D_SET + 50;    // puppeteer's head
  var X_BACK = D_SET + 220;   // painted backdrop
  var BACK_TOP = 360;         // top of the backdrop; the lighting grid hangs above it
  var PUPPET_H = 66;          // base of the body to the top of the eyes
  var STAND_H = 178;          // puppeteer's standing height

  function deg(d) { return d * Math.PI / 180; }

  function loadImage(src, onload) {
    var img = new Image();
    img.decoding = 'async';
    img.addEventListener('load', onload);
    img.src = src;
    return img;
  }

  function loadCleanImage(src, onload) {
    var img = new Image();
    img.decoding = 'async';
    img.addEventListener('load', function () {
      var clean = document.createElement('canvas');
      clean.width = img.naturalWidth; clean.height = img.naturalHeight;
      var cleanCtx = clean.getContext('2d');
      cleanCtx.drawImage(img, 0, 0);
      var pixels = cleanCtx.getImageData(0, 0, clean.width, clean.height);
      for (var i = 3; i < pixels.data.length; i += 4) {
        var a = pixels.data[i];
        pixels.data[i] = a < 96 ? 0 : Math.min(255, Math.round((a - 96) * 255 / 159));
      }
      cleanCtx.clearRect(0, 0, clean.width, clean.height);
      cleanCtx.putImageData(pixels, 0, 0);
      img.cleaned = clean;
      onload();
    });
    img.src = src;
    return img;
  }

  function normalizedRect(x, y, w, h) {
    return { x: w < 0 ? x + w : x, y: h < 0 ? y + h : y, w: Math.abs(w), h: Math.abs(h) };
  }

  function drawImageCover(ctx, img, x, y, w, h) {
    var box = normalizedRect(x, y, w, h);
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var scale = Math.max(box.w / iw, box.h / ih);
    var dw = iw * scale, dh = ih * scale;
    ctx.save();
    ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    ctx.drawImage(img, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
    ctx.restore();
  }

  function drawImageContain(ctx, img, x, y, w, h, alignBottom) {
    var box = normalizedRect(x, y, w, h);
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var scale = Math.min(box.w / iw, box.h / ih);
    var dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, box.x + (box.w - dw) / 2, alignBottom ? box.y + box.h - dh : box.y + (box.h - dh) / 2, dw, dh);
  }

  /* ── 1. Hide the puppeteer ──────────────────────────────────────── */
  var monitor = document.getElementById('jh-monitor');
  if (monitor) initFrameLab(monitor, document.getElementById('jh-side'));

  function initFrameLab(monitorCanvas, sideCanvas) {
    var el = {
      height: document.getElementById('jh-cam-h'),
      tilt: document.getElementById('jh-tilt'),
      fov: document.getElementById('jh-fov'),
      board: document.getElementById('jh-board'),
      heightOut: document.getElementById('jh-cam-h-out'),
      tiltOut: document.getElementById('jh-tilt-out'),
      fovOut: document.getElementById('jh-fov-out'),
      boardOut: document.getElementById('jh-board-out'),
      readout: document.getElementById('jh-frame-readout'),
      goals: document.getElementById('jh-goals')
    };
    var mon = null, side = null;
    mon = SimKit.canvas2d(monitorCanvas, { height: 300, onResize: function () { if (mon) render(); } });
    if (sideCanvas) side = SimKit.canvas2d(sideCanvas, { height: 300, onResize: function () { if (side) render(); } });
    var setArt = loadImage(ART_URL + 'camera-set-garden.png', render);
    var puppetArt = loadImage(ART_URL + 'camera-puppet.png', render);
    var boardArt = loadImage(ART_URL + 'camera-playboard.png', render);
    var handArt = loadCleanImage(ART_URL + 'camera-operator-hand.png', render);

    function params() {
      var board = +el.board.value;
      var headTop = board - 12;
      return {
        camH: +el.height.value,
        tilt: deg(+el.tilt.value),
        fov: deg(+el.fov.value),
        board: board,
        headTop: Math.min(STAND_H, headTop)
      };
    }

    // Pinhole projection of world point (x forward, y up, lateral X) onto a W×H frame.
    function project(p, x, y, X, W, H) {
      var dy = y - p.camH;
      var zc = x * Math.cos(p.tilt) + dy * Math.sin(p.tilt);
      var yc = -x * Math.sin(p.tilt) + dy * Math.cos(p.tilt);
      if (zc < 5) zc = 5;
      var f = (H / 2) / Math.tan(p.fov / 2);
      return { x: W / 2 + f * X / zc, y: H / 2 - f * yc / zc };
    }

    function blockedBySet(p, x, y) {
      if (x <= D_SET) return false;
      return p.camH + (y - p.camH) * (D_SET / x) < p.board;
    }

    function inFrameV(pt, H) { return pt.y >= 0 && pt.y <= H; }

    function performerPoints(p) {
      var top = p.headTop;
      return [
        { x: X_PERF, y: top, label: 'head' },
        { x: X_PERF, y: top - 12, label: 'head' },
        { x: X_PERF, y: top - 30, label: 'shoulders' },
        { x: X_PERF - 10, y: Math.min(p.board - 2, top + 10), label: 'arm' },
        { x: X_PUPPET + 4, y: p.board - 2, label: 'wrist' }
      ];
    }

    function evaluate(p) {
      var W = 400, H = 300;
      var exposed = performerPoints(p).filter(function (q) {
        return inFrameV(project(p, q.x, q.y, 0, W, H), H) && !blockedBySet(p, q.x, q.y);
      });
      var top = project(p, X_PUPPET, p.board + PUPPET_H, 0, W, H);
      var base = project(p, X_PUPPET, p.board + 4, 0, W, H);
      var puppetIn = inFrameV(top, H) && inFrameV(base, H) && !blockedBySet(p, X_PUPPET, p.board + 4);
      var fill = (base.y - top.y) / H;
      var gridPt = project(p, X_BACK, BACK_TOP + 2, 0, W, H);
      return {
        exposed: exposed,
        puppetIn: puppetIn,
        fill: fill,
        sizeOk: puppetIn && fill >= 0.25 && fill <= 0.75,
        gridSeen: gridPt.y >= 0,
        posture: p.headTop >= 168 ? 'standing' : p.headTop >= 135 ? 'crouching' : 'kneeling'
      };
    }

    /* Monitor: what the lens sees, painted back to front. */
    function quad(ctx, p, x0, x1, y0, y1, X0, X1, W, H) {
      // a rectangle at distance x0 (or a floor strip from x0 to x1 when y0 === y1)
      var a, b, c, d;
      if (y0 === y1) {
        a = project(p, x0, y0, X0, W, H); b = project(p, x0, y0, X1, W, H);
        c = project(p, x1, y0, X1, W, H); d = project(p, x1, y0, X0, W, H);
      } else {
        a = project(p, x0, y0, X0, W, H); b = project(p, x0, y0, X1, W, H);
        c = project(p, x0, y1, X1, W, H); d = project(p, x0, y1, X0, W, H);
      }
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
    }

    function drawPuppet(ctx, p, W, H, x, X, base) {
      var pt = function (yy, XX) { return project(p, x, yy, X + (XX || 0), W, H); };
      if (puppetArt.complete && puppetArt.naturalWidth) {
        var top = pt(base + PUPPET_H + 6);
        var bottom = pt(base - 3);
        var left = pt(base + 30, -36);
        var right = pt(base + 30, 36);
        drawImageContain(ctx, puppetArt, left.x, top.y, right.x - left.x, bottom.y - top.y, true);
        return;
      }
      // body
      ctx.fillStyle = '#e9772e';
      quad(ctx, p, x, x, base, base + 30, X - 15, X + 15, W, H); ctx.fill();
      // head
      var c = pt(base + 44), r = Math.abs(pt(base + 44).y - pt(base + 58).y);
      ctx.beginPath(); ctx.ellipse(c.x, c.y, r * 1.35, r, 0, 0, Math.PI * 2); ctx.fill();
      // mouth
      ctx.fillStyle = '#5a1020';
      ctx.beginPath(); ctx.ellipse(c.x, c.y + r * 0.35, r * 0.9, r * 0.3, 0, 0, Math.PI); ctx.fill();
      // ping-pong eyes
      var e = pt(base + 61), er = r * 0.42;
      [-0.55, 0.55].forEach(function (k) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(e.x + k * r, e.y, er, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(e.x + k * r, e.y + er * 0.1, er * 0.35, 0, Math.PI * 2); ctx.fill();
      });
    }

    function drawMonitor(p, ev) {
      var ctx = mon.ctx, W = mon.width, H = mon.height;
      ctx.fillStyle = '#0b0b0d';
      ctx.fillRect(0, 0, W, H);
      // lighting grid above the backdrop
      ctx.fillStyle = '#1d1d22';
      quad(ctx, p, X_BACK, 0, BACK_TOP, 700, -900, 900, W, H); ctx.fill();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 3;
      var g0 = project(p, X_BACK, 410, -900, W, H), g1 = project(p, X_BACK, 410, 900, W, H);
      ctx.beginPath(); ctx.moveTo(g0.x, g0.y); ctx.lineTo(g1.x, g1.y); ctx.stroke();
      for (var L = -400; L <= 400; L += 160) {
        var lp = project(p, X_BACK, 398, L, W, H), lr = Math.max(3, Math.abs(project(p, X_BACK, 398, L, W, H).y - project(p, X_BACK, 384, L, W, H).y));
        ctx.fillStyle = '#ffd65a';
        ctx.beginPath(); ctx.arc(lp.x, lp.y, lr, 0, Math.PI * 2); ctx.fill();
      }
      // painted backdrop
      var bt = project(p, X_BACK, BACK_TOP, 0, W, H), bb = project(p, X_BACK, 0, 0, W, H);
      if (setArt.complete && setArt.naturalWidth) {
        var bl = project(p, X_BACK, 0, -900, W, H);
        var tr = project(p, X_BACK, BACK_TOP, 900, W, H);
        drawImageCover(ctx, setArt, bl.x, tr.y, tr.x - bl.x, bl.y - tr.y);
      } else {
        var grad = ctx.createLinearGradient(0, bt.y, 0, bb.y);
        grad.addColorStop(0, '#7ec3f0'); grad.addColorStop(1, '#d7efff');
        ctx.fillStyle = grad;
        quad(ctx, p, X_BACK, 0, 0, BACK_TOP, -900, 900, W, H); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        [[-160, 290], [120, 315], [300, 270]].forEach(function (cl) {
          var c = project(p, X_BACK, cl[1], cl[0], W, H), r = Math.abs(project(p, X_BACK, cl[1] + 18, cl[0], W, H).y - c.y);
          ctx.beginPath(); ctx.ellipse(c.x, c.y, r * 2.4, r, 0, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#6cae5a';
        quad(ctx, p, X_BACK, 0, 0, 120, -900, 900, W, H); ctx.fill();
      }
      // studio floor
      ctx.fillStyle = '#3a3a40';
      quad(ctx, p, 150, X_BACK, 0, 0, -900, 900, W, H); ctx.fill();
      // puppeteer, behind the set front
      var top = p.headTop;
      ctx.fillStyle = '#16161a';
      quad(ctx, p, X_PERF, 0, 0, top - 26, -24, 24, W, H); ctx.fill();
      var arm0 = project(p, X_PERF, top - 30, 14, W, H), arm1 = project(p, X_PUPPET, p.board + 10, 0, W, H);
      ctx.strokeStyle = '#16161a';
      ctx.lineWidth = Math.max(3, Math.abs(project(p, X_PERF, 0, 0, W, H).x - project(p, X_PERF, 0, 10, W, H).x));
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(arm0.x, arm0.y); ctx.lineTo(arm1.x, arm1.y); ctx.stroke();
      var hc = project(p, X_PERF, top - 12, 0, W, H), hr = Math.abs(project(p, X_PERF, top, 0, W, H).y - hc.y);
      ctx.fillStyle = '#c99b7a';
      ctx.beginPath(); ctx.arc(hc.x, hc.y, Math.max(2, hr), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3b2a20';
      ctx.beginPath(); ctx.arc(hc.x, hc.y - hr * 0.35, Math.max(2, hr * 0.8), Math.PI, 0); ctx.fill();
      // The operating hand rises behind the character. The character and then
      // the playboard mask it, just as they would in the finished camera shot.
      if (handArt.complete && handArt.naturalWidth) {
        var handTop = project(p, X_PUPPET + 2, p.board + 58, 0, W, H);
        var handBottom = project(p, X_PUPPET + 2, p.board - 70, 0, W, H);
        var handLeft = project(p, X_PUPPET + 2, p.board, -18, W, H);
        var handRight = project(p, X_PUPPET + 2, p.board, 18, W, H);
        drawImageContain(ctx, handArt.cleaned || handArt, handLeft.x, handTop.y, handRight.x - handLeft.x, handBottom.y - handTop.y, true);
      }
      // puppet
      drawPuppet(ctx, p, W, H, X_PUPPET, 0, p.board);
      // set front: a brick wall with a cap
      if (boardArt.complete && boardArt.naturalWidth) {
        var wallBL = project(p, D_SET, 0, -700, W, H);
        var wallTR = project(p, D_SET, p.board, 700, W, H);
        drawImageCover(ctx, boardArt, wallBL.x, wallTR.y, wallTR.x - wallBL.x, wallBL.y - wallTR.y);
      } else {
        ctx.fillStyle = '#a4472f';
        quad(ctx, p, D_SET, 0, 0, p.board, -700, 700, W, H); ctx.fill();
        ctx.strokeStyle = 'rgba(255,230,210,0.35)'; ctx.lineWidth = 1;
        for (var by = 10; by < p.board - 6; by += 12) {
          var l0 = project(p, D_SET, by, -700, W, H), l1 = project(p, D_SET, by, 700, W, H);
          ctx.beginPath(); ctx.moveTo(l0.x, l0.y); ctx.lineTo(l1.x, l1.y); ctx.stroke();
        }
        ctx.fillStyle = '#d8c7a8';
        quad(ctx, p, D_SET, 0, p.board - 6, p.board, -700, 700, W, H); ctx.fill();
      }
      // overlays
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e0442f';
      ctx.beginPath(); ctx.arc(16, 17, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText('CAMERA 1', 26, 11);
      if (ev.exposed.length) {
        ctx.fillStyle = 'rgba(194,59,59,0.92)';
        ctx.fillRect(0, H - 28, W, 28);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('The audience can see the puppeteer’s ' + ev.exposed[0].label + '!', W / 2, H - 21);
      }
    }

    /* Side view: the same set, drawn to scale from the side. */
    function drawSide(p, ev) {
      if (!side) return;
      var ctx = side.ctx, W = side.width, H = side.height;
      if (W < 60 || H < 60) return; // first resize can report a 1px box
      var sx = (W - 20) / 620, sy = (H - 30) / 470, s = Math.min(sx, sy);
      var ox = 12, oy = H - 18;
      function X(x) { return ox + x * s; }
      function Y(y) { return oy - y * s; }
      ctx.fillStyle = colors.cardBg; ctx.fillRect(0, 0, W, H);
      // floor
      ctx.strokeStyle = colors.textMuted; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke();
      // frustum
      var len = 640;
      var tA = p.tilt + p.fov / 2, tB = p.tilt - p.fov / 2;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, Y(0)); ctx.clip();
      ctx.fillStyle = 'rgba(255, 214, 90, 0.18)';
      ctx.beginPath();
      ctx.moveTo(X(0), Y(p.camH));
      ctx.lineTo(X(len * Math.cos(tA)), Y(p.camH + len * Math.sin(tA)));
      ctx.lineTo(X(len * Math.cos(tB)), Y(p.camH + len * Math.sin(tB)));
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(200, 150, 20, 0.8)'; ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      // backdrop + grid
      ctx.fillStyle = '#7ec3f0';
      ctx.fillRect(X(X_BACK), Y(BACK_TOP), 6, BACK_TOP * s);
      ctx.fillStyle = colors.textMuted;
      ctx.fillRect(X(X_BACK - 120), Y(410), 200 * s, 3);
      ctx.fillStyle = '#e0b021';
      [X_BACK - 100, X_BACK - 30, X_BACK + 40].forEach(function (gx) { ctx.beginPath(); ctx.arc(X(gx), Y(398), 4, 0, Math.PI * 2); ctx.fill(); });
      // puppeteer
      var top = p.headTop;
      ctx.fillStyle = colors.text;
      ctx.beginPath(); ctx.arc(X(X_PERF), Y(top - 12), 12 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(X(X_PERF) - 10 * s, Y(top - 26), 20 * s, (top - 26) * s);
      ctx.strokeStyle = colors.text; ctx.lineWidth = Math.max(2, 7 * s); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(X(X_PERF), Y(top - 30)); ctx.lineTo(X(X_PUPPET), Y(p.board + 10)); ctx.stroke();
      // puppet
      ctx.fillStyle = '#e9772e';
      ctx.fillRect(X(X_PUPPET) - 9 * s, Y(p.board + PUPPET_H - 8), 18 * s, (PUPPET_H - 8) * s);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(X(X_PUPPET), Y(p.board + PUPPET_H - 4), 5 * s + 1, 0, Math.PI * 2); ctx.fill();
      // set front
      ctx.fillStyle = '#a4472f';
      ctx.fillRect(X(D_SET) - 4 * s, Y(p.board), 8 * s + 1, p.board * s);
      // sightline to the puppeteer's head
      var exposed = ev.exposed.length > 0;
      var tx = X_PERF, ty = top;
      var wallY = p.camH + (ty - p.camH) * (D_SET / tx);
      ctx.lineWidth = 2;
      ctx.setLineDash(exposed ? [] : [5, 4]);
      ctx.strokeStyle = exposed ? '#c23b3b' : '#1c8257';
      ctx.beginPath(); ctx.moveTo(X(0), Y(p.camH));
      if (exposed || wallY >= p.board) ctx.lineTo(X(tx), Y(ty));
      else ctx.lineTo(X(D_SET), Y(wallY));
      ctx.stroke();
      ctx.setLineDash([]);
      // camera
      ctx.save();
      ctx.translate(X(0) + 4, Y(p.camH));
      ctx.rotate(-p.tilt);
      ctx.fillStyle = colors.text;
      ctx.fillRect(-4, -7, 18, 14);
      ctx.restore();
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = colors.textMuted;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Side view (to scale)', 8, 6);
      ctx.textAlign = 'center';
      ctx.fillText('lighting grid', X(X_BACK - 30), Y(430));
    }

    function setGoal(key, ok, text) {
      var li = el.goals.querySelector('[data-goal="' + key + '"]');
      if (!li) return;
      li.dataset.ok = ok ? 'true' : 'false';
      li.textContent = (ok ? '✓ ' : '✗ ') + text;
    }

    function render() {
      if (!mon) return;
      var p = params();
      el.heightOut.textContent = el.height.value + ' cm';
      el.tiltOut.textContent = (+el.tilt.value > 0 ? '+' : '') + el.tilt.value + '°';
      el.fovOut.textContent = el.fov.value + '°' + (+el.fov.value < 26 ? ' (tight)' : +el.fov.value > 44 ? ' (wide)' : '');
      el.boardOut.textContent = el.board.value + ' cm';
      var ev = evaluate(p);
      drawMonitor(p, ev);
      drawSide(p, ev);
      setGoal('puppet', ev.puppetIn, 'Puppet fully in frame');
      setGoal('size', ev.sizeOk, 'Medium shot (puppet fills ¼–¾ of the frame)');
      setGoal('hidden', ev.exposed.length === 0, 'Puppeteer hidden');
      setGoal('grid', !ev.gridSeen, 'No lighting grid in shot');
      var done = ev.puppetIn && ev.sizeOk && !ev.exposed.length && !ev.gridSeen;
      el.readout.textContent = (done ? 'Ready for a take! ' : '') +
        'Puppet fills ' + Math.max(0, Math.round(ev.fill * 100)) + '% of the frame height. Set front is ' + p.board +
        ' cm tall, so the puppeteer is ' + ev.posture + ' (head top at ' + Math.round(p.headTop) + ' cm).' +
        (p.camH > p.board ? ' The lens is above the set front, so it can look down behind it.' : ' The lens is below the top of the set front, so the set blocks every sightline behind it.');
    }

    ['height', 'tilt', 'fov', 'board'].forEach(function (k) { el[k].addEventListener('input', render); });
    document.getElementById('jh-frame-reset').addEventListener('click', function () {
      el.height.value = 260; el.tilt.value = -14; el.fov.value = 40; el.board.value = 150; render();
    });
    render();
    SimKit.theme.onChange(render);
  }

  /* ── 2. Perform through the monitor ─────────────────────────────── */
  var perf = document.getElementById('jh-perform');
  if (perf) initPerform(perf);

  function initPerform(canvas) {
    var pad = document.getElementById('jh-pad');
    var startBtn = document.getElementById('jh-start');
    var status = document.getElementById('jh-perform-status');
    var results = document.getElementById('jh-results');
    var modeInputs = document.querySelectorAll('input[name="jh-view"]');
    var TARGETS = [[0.2, 0.3], [0.78, 0.62], [0.32, 0.72], [0.85, 0.25], [0.5, 0.45], [0.15, 0.55]];
    var hand = { x: 0.5, y: 0.5 };
    var round = null;
    var best = {};
    var view = null;
    view = SimKit.canvas2d(canvas, { height: 260, onResize: function () { if (view) render(); } });
    var setArt = loadImage(ART_URL + 'camera-set-garden.png', render);
    var puppetArt = loadImage(ART_URL + 'camera-puppet.png', render);
    var boardArt = loadImage(ART_URL + 'camera-playboard.png', render);
    var handArt = loadCleanImage(ART_URL + 'camera-operator-hand.png', render);

    function mode() {
      for (var i = 0; i < modeInputs.length; i++) if (modeInputs[i].checked) return modeInputs[i].value;
      return 'camera';
    }
    function screenPos() {
      return { x: mode() === 'camera' ? 1 - hand.x : hand.x, y: hand.y };
    }

    function render() {
      var ctx = view.ctx, W = view.width, H = view.height;
      if (setArt.complete && setArt.naturalWidth) drawImageCover(ctx, setArt, 0, 0, W, H);
      else { ctx.fillStyle = '#9fd3f5'; ctx.fillRect(0, 0, W, H); }
      if (round && round.i < TARGETS.length) {
        var t = TARGETS[round.i];
        ctx.fillStyle = '#ffd400';
        ctx.strokeStyle = '#7a5b00';
        ctx.lineWidth = 2;
        star(ctx, t[0] * W, t[1] * H, 16, 7);
      }
      var s = screenPos(), px = s.x * W, py = s.y * H, r = Math.min(W, H) * 0.07;
      if (handArt.complete && handArt.naturalWidth) {
        var handSource = handArt.cleaned || handArt;
        var hh = r * 3.2, hw = hh * handSource.width / handSource.height;
        ctx.drawImage(handSource, px - hw / 2, py - hh * 0.25, hw, hh);
      }
      if (puppetArt.complete && puppetArt.naturalWidth) {
        var ph = r * 3.2, pw = ph * puppetArt.naturalWidth / puppetArt.naturalHeight;
        ctx.drawImage(puppetArt, px - pw / 2, py - ph * 0.43, pw, ph);
      } else {
        ctx.fillStyle = '#e9772e';
        ctx.beginPath(); ctx.ellipse(px, py, r * 1.35, r, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5a1020';
        ctx.beginPath(); ctx.ellipse(px, py + r * 0.35, r * 0.9, r * 0.3, 0, 0, Math.PI); ctx.fill();
        [-0.55, 0.55].forEach(function (k) {
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px + k * r, py - r * 0.95, r * 0.42, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(px + k * r, py - r * 0.9, r * 0.15, 0, Math.PI * 2); ctx.fill();
        });
      }
      if (boardArt.complete && boardArt.naturalWidth) drawImageCover(ctx, boardArt, 0, H * 0.84, W, H * 0.16);
      else { ctx.fillStyle = '#a4472f'; ctx.fillRect(0, H * 0.86, W, H * 0.14); }
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(8, 8, 150, 22);
      ctx.fillStyle = '#fff';
      ctx.fillText(mode() === 'camera' ? 'MONITOR: camera view' : 'MONITOR: mirrored', 14, 12);
      if (round) {
        var secs = round.done ? round.time : (performance.now() - round.start) / 1000;
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W - 98, 8, 90, 22);
        ctx.fillStyle = '#fff';
        ctx.fillText(secs.toFixed(1) + ' s  ' + Math.min(round.i, TARGETS.length) + '/' + TARGETS.length, W - 14, 12);
      }
    }

    function star(ctx, x, y, R, r) {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    function check() {
      if (!round || round.done) return;
      var t = TARGETS[round.i], s = screenPos();
      var W = view.width, H = view.height;
      if (Math.hypot((t[0] - s.x) * W, (t[1] - s.y) * H) < Math.min(W, H) * 0.09) {
        round.i++;
        if (round.i >= TARGETS.length) {
          round.done = true;
          round.time = (performance.now() - round.start) / 1000;
          var m = mode();
          if (!best[m] || round.time < best[m]) best[m] = round.time;
          status.textContent = 'Done in ' + round.time.toFixed(1) + ' s with the ' + (m === 'camera' ? 'camera view' : 'mirror') + '. Now switch views and try again.';
          showResults();
          startBtn.textContent = 'Start a round';
        }
      }
    }

    function showResults() {
      var parts = [];
      if (best.camera) parts.push('Camera view: ' + best.camera.toFixed(1) + ' s');
      if (best.mirror) parts.push('Mirror: ' + best.mirror.toFixed(1) + ' s');
      results.textContent = parts.length ? 'Best times · ' + parts.join(' · ') : '';
    }

    function move(dx, dy) {
      hand.x = Math.max(0.05, Math.min(0.95, hand.x + dx));
      hand.y = Math.max(0.12, Math.min(0.82, hand.y + dy));
      check();
      render();
    }

    var dragging = null;
    pad.addEventListener('pointerdown', function (e) {
      dragging = { x: e.clientX, y: e.clientY };
      pad.setPointerCapture(e.pointerId);
      pad.focus();
    });
    pad.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var r = pad.getBoundingClientRect();
      move((e.clientX - dragging.x) / r.width, (e.clientY - dragging.y) / r.height);
      dragging = { x: e.clientX, y: e.clientY };
    });
    ['pointerup', 'pointercancel'].forEach(function (n) { pad.addEventListener(n, function () { dragging = null; }); });
    pad.addEventListener('keydown', function (e) {
      var k = { ArrowLeft: [-0.04, 0], ArrowRight: [0.04, 0], ArrowUp: [0, -0.04], ArrowDown: [0, 0.04] }[e.key];
      if (!k) return;
      e.preventDefault();
      move(k[0], k[1]);
    });

    startBtn.addEventListener('click', function () {
      hand = { x: 0.5, y: 0.5 };
      round = { i: 0, start: performance.now(), done: false };
      status.textContent = 'Go! Steer the puppet to each star. Look only at the monitor.';
      startBtn.textContent = 'Restart round';
      pad.focus();
      render();
    });
    Array.prototype.forEach.call(modeInputs, function (el) {
      el.addEventListener('change', function () {
        round = null;
        status.textContent = 'View changed. Press Start a round.';
        startBtn.textContent = 'Start a round';
        render();
      });
    });

    render();
    SimKit.loop(function () { if (round && !round.done) render(); }, { el: SimKit.stage(canvas) });
  }
})();
