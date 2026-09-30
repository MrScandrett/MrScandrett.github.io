/* Paik's TV Lab: a wall of simulated tube TVs. Each TV runs its picture
   through the techniques switched on for it, in a fixed order that loosely
   follows a real set:

     picture (+ décollage peel) → magnet warp → signal scramble → sweep squeeze

   "Modulate" turns any technique into an oscillator so combinations move. */
(function () {
  var wall = document.getElementById('njp-lab-wall');
  if (!wall || !window.SimKit) return;

  var W = 240, H = 180, MAX_TVS = 6;
  var BARS = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
  var UNDER = { bars: 'face', face: 'bars', lines: 'face' };
  var TECH_NAMES = { magnet: 'Magnet TV', zen: 'Zen for TV', peel: 'Décollage', scr: 'Signal scramble' };

  function $(id) { return document.getElementById(id); }
  var ui = {
    add: $('njp-lab-add'), dup: $('njp-lab-dup'), remove: $('njp-lab-remove'), preset: $('njp-lab-preset'),
    count: $('njp-lab-count'), title: $('njp-lab-panel-title'), source: $('njp-lab-source'),
    speed: $('njp-lab-speed'), tool: $('njp-lab-tool'), copy: $('njp-lab-copy'), status: $('njp-lab-status'),
    magnet: { on: $('njp-on-magnet'), mod: $('njp-mod-magnet'), fs: $('njp-fs-magnet'), strength: $('njp-strength'), flip: $('njp-flip') },
    zen: { on: $('njp-on-zen'), mod: $('njp-mod-zen'), fs: $('njp-fs-zen'), h: $('njp-zen-h'), v: $('njp-zen-v') },
    peel: { on: $('njp-on-peel'), mod: $('njp-mod-peel'), fs: $('njp-fs-peel'), size: $('njp-peel-size'), heal: $('njp-peel-heal'), reset: $('njp-peel-reset') },
    scr: { on: $('njp-on-scramble'), mod: $('njp-mod-scramble'), fs: $('njp-fs-scramble'), amount: $('njp-scr-amount') }
  };

  /* ── Test patterns (cached; the face only has two frames: eyes open/blink) ── */
  var scratch = document.createElement('canvas');
  scratch.width = W; scratch.height = H;
  var sctx = scratch.getContext('2d', { willReadFrequently: true });
  var cache = {};

  function pattern(mode, blink) {
    var key = mode === 'face' ? 'face' + (blink ? 1 : 0) : mode;
    if (cache[key]) return cache[key];
    sctx.fillStyle = '#000';
    sctx.fillRect(0, 0, W, H);
    if (mode === 'lines') {
      sctx.fillStyle = '#d6f5ff';
      for (var y = 2; y < H; y += 6) sctx.fillRect(0, y, W, 2);
      sctx.fillStyle = '#7dd3fc';
      for (var x = 4; x < W; x += 24) sctx.fillRect(x, 0, 1, H);
    } else if (mode === 'bars') {
      var bw = W / BARS.length;
      for (var i = 0; i < BARS.length; i++) {
        sctx.fillStyle = BARS[i];
        sctx.fillRect(Math.floor(i * bw), 0, Math.ceil(bw), H * 0.68);
      }
      for (var j = 0; j < 8; j++) {
        var v = Math.round(255 * j / 7);
        sctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
        sctx.fillRect(Math.floor(j * W / 8), H * 0.68, Math.ceil(W / 8), H * 0.14);
      }
      sctx.fillStyle = '#fff';
      sctx.font = 'bold 20px monospace';
      sctx.textAlign = 'center';
      sctx.fillText('PAIK TV', W / 2, H * 0.95);
    } else {
      sctx.fillStyle = '#1e3a8a';
      sctx.fillRect(0, 0, W, H);
      sctx.fillStyle = '#fbbf24';
      sctx.beginPath(); sctx.arc(W / 2, H / 2, 70, 0, Math.PI * 2); sctx.fill();
      var ry = blink ? 1 : 10;
      sctx.fillStyle = '#111';
      sctx.beginPath(); sctx.ellipse(W / 2 - 25, H / 2 - 18, 9, ry, 0, 0, Math.PI * 2); sctx.fill();
      sctx.beginPath(); sctx.ellipse(W / 2 + 25, H / 2 - 18, 9, ry, 0, 0, Math.PI * 2); sctx.fill();
      sctx.lineWidth = 6; sctx.strokeStyle = '#111';
      sctx.beginPath(); sctx.arc(W / 2, H / 2 + 4, 36, 0.15 * Math.PI, 0.85 * Math.PI); sctx.stroke();
    }
    cache[key] = sctx.getImageData(0, 0, W, H).data;
    return cache[key];
  }

  /* ── TV state ── */
  var tvs = [], selected = null, counter = 0;

  function makeBuf() { var c = document.createElement('canvas'); c.width = W; c.height = H; return c; }

  function defaults(tv) {
    tv.magnet = { on: false, strength: 60, pol: 1, mod: false, x: W * 0.62, y: H * 0.42 };
    tv.zen = { on: false, sweep: 0, vert: true, mod: false };
    tv.peel = { on: false, size: 18, heal: 0, mod: false };
    tv.scr = { on: false, amount: 35, mod: false };
    tv.source = 'bars';
    tv.speed = 40;
    tv.tool = 'magnet';
    tv.mask.fill(0);
  }

  function createTv() {
    counter++;
    var card = document.createElement('div');
    card.className = 'njp-lab-card';
    card.innerHTML =
      '<div class="njp-lab-card-head">' +
        '<button type="button" class="njp-lab-select" aria-pressed="false"></button>' +
        '<button type="button" class="njp-lab-x"></button>' +
      '</div>' +
      '<div class="njp-tv njp-tv--mini"><div class="njp-tv-screen"><canvas tabindex="0" role="img"></canvas></div></div>' +
      '<p class="njp-lab-badges"></p>';
    var tv = {
      n: counter, card: card,
      selBtn: card.querySelector('.njp-lab-select'),
      xBtn: card.querySelector('.njp-lab-x'),
      badges: card.querySelector('.njp-lab-badges'),
      screen: card.querySelector('.njp-tv-screen'),
      canvas: card.querySelector('canvas'),
      mask: new Float32Array(W * H),
      buf1: new Uint8ClampedArray(W * H * 4),
      buf2: new Uint8ClampedArray(W * H * 4),
      mid: makeBuf(), avg: makeBuf(),
      t: Math.random() * 10, visible: true,
      cursor: { x: W / 2, y: H / 2 }, auto: null, dragging: false, last: null
    };
    tv.midCtx = tv.mid.getContext('2d');
    tv.outImg = tv.midCtx.createImageData(W, H);
    tv.avgCtx = tv.avg.getContext('2d');
    defaults(tv);
    tv.selBtn.textContent = 'TV ' + tv.n;
    tv.xBtn.textContent = '×';
    tv.xBtn.setAttribute('aria-label', 'Remove TV ' + tv.n);
    wall.appendChild(card);
    tv.view = SimKit.canvas2d(tv.canvas, { box: tv.screen });
    if (window.IntersectionObserver) {
      tv.io = new IntersectionObserver(function (entries) { tv.visible = entries[0].isIntersecting; });
      tv.io.observe(card);
    }
    bindTv(tv);
    tvs.push(tv);
    return tv;
  }

  function destroyTv(tv) {
    tv.view.destroy();
    if (tv.io) tv.io.disconnect();
    tv.card.remove();
    tvs.splice(tvs.indexOf(tv), 1);
  }

  function effTool(tv) {
    if (tv.tool === 'magnet' && !tv.magnet.on && tv.peel.on) return 'peel';
    if (tv.tool === 'peel' && !tv.peel.on && tv.magnet.on) return 'magnet';
    return tv.tool;
  }

  function describe(tv) {
    var on = [];
    ['magnet', 'zen', 'peel', 'scr'].forEach(function (k) {
      if (tv[k].on) on.push(TECH_NAMES[k] + (tv[k].mod ? ' ∿' : ''));
    });
    return on;
  }

  function refreshCard(tv) {
    var on = describe(tv);
    tv.badges.textContent = on.length ? on.join(' · ') : 'Plain picture';
    tv.canvas.setAttribute('aria-label', 'TV ' + tv.n + ': ' + (on.length ? on.join(', ').replace(/ ∿/g, ' (modulating)') : 'plain picture') + '. ' +
      (tv.magnet.on || tv.peel.on ? 'Drag to ' + (effTool(tv) === 'peel' ? 'peel the picture.' : 'move the magnet.') : 'Select it and switch on a technique.'));
  }

  function status(msg) { ui.status.textContent = msg; }

  function refreshBar() {
    ui.count.textContent = tvs.length + ' of ' + MAX_TVS + ' TVs';
    ui.add.disabled = tvs.length >= MAX_TVS;
    ui.dup.disabled = tvs.length >= MAX_TVS;
    ui.remove.disabled = tvs.length <= 1;
    tvs.forEach(function (tv) { tv.xBtn.hidden = tvs.length <= 1; });
  }

  /* ── Selection + panel sync ── */
  function select(tv) {
    selected = tv;
    tvs.forEach(function (o) {
      var on = o === tv;
      o.card.classList.toggle('is-selected', on);
      o.selBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    syncPanel();
  }

  function syncTech(key) {
    var tv = selected, t = tv[key], u = ui[key];
    u.on.setAttribute('aria-pressed', t.on ? 'true' : 'false');
    u.fs.disabled = !t.on;
    u.mod.checked = t.mod;
    u.mod.disabled = !t.on;
  }

  function syncPanel() {
    var tv = selected;
    if (!tv) return;
    ui.title.textContent = 'TV ' + tv.n + ' controls';
    ui.source.value = tv.source;
    ui.speed.value = tv.speed;
    ui.tool.value = tv.tool;
    ui.magnet.strength.value = tv.magnet.strength;
    ui.zen.h.value = tv.zen.sweep;
    ui.zen.v.checked = tv.zen.vert;
    ui.peel.size.value = tv.peel.size;
    ui.peel.heal.value = tv.peel.heal;
    ui.scr.amount.value = tv.scr.amount;
    ['magnet', 'zen', 'peel', 'scr'].forEach(syncTech);
    refreshCard(tv);
  }

  /* ── Panel → state ── */
  function onSel(el, ev, fn) {
    el.addEventListener(ev, function () { if (selected) { fn(selected); refreshCard(selected); } });
  }
  [['magnet', 'magnet'], ['zen', 'zen'], ['peel', 'peel'], ['scr', 'scr']].forEach(function (pair) {
    var key = pair[0], u = ui[key];
    u.on.addEventListener('click', function () {
      if (!selected) return;
      var t = selected[key];
      t.on = !t.on;
      if (t.on && key === 'peel' && !selected.magnet.on) selected.tool = 'peel';
      if (t.on && key === 'magnet' && !selected.peel.on) selected.tool = 'magnet';
      syncPanel();
      status('TV ' + selected.n + ': ' + TECH_NAMES[key] + (t.on ? ' on.' : ' off.'));
    });
    onSel(u.mod, 'change', function (tv) { tv[key].mod = u.mod.checked; });
  });
  onSel(ui.source, 'change', function (tv) { tv.source = ui.source.value; });
  onSel(ui.speed, 'input', function (tv) { tv.speed = +ui.speed.value; });
  onSel(ui.tool, 'change', function (tv) { tv.tool = ui.tool.value; });
  onSel(ui.magnet.strength, 'input', function (tv) { tv.magnet.strength = +ui.magnet.strength.value; });
  onSel(ui.magnet.flip, 'click', function (tv) { tv.magnet.pol = -tv.magnet.pol; });
  onSel(ui.zen.h, 'input', function (tv) { tv.zen.sweep = +ui.zen.h.value; });
  onSel(ui.zen.v, 'change', function (tv) { tv.zen.vert = ui.zen.v.checked; });
  onSel(ui.peel.size, 'input', function (tv) { tv.peel.size = +ui.peel.size.value; });
  onSel(ui.peel.heal, 'input', function (tv) { tv.peel.heal = +ui.peel.heal.value; });
  onSel(ui.peel.reset, 'click', function (tv) { tv.mask.fill(0); });
  onSel(ui.scr.amount, 'input', function (tv) { tv.scr.amount = +ui.scr.amount.value; });

  /* ── Toolbar ── */
  var PRESETS = {
    plain: function () {},
    magnet: function (tv) { tv.magnet.on = true; tv.tool = 'magnet'; },
    zen: function (tv) { tv.zen.on = true; tv.zen.sweep = 0; },
    decollage: function (tv) { tv.peel.on = true; tv.scr.on = true; tv.scr.amount = 25; tv.tool = 'peel'; },
    storm: function (tv) {
      tv.magnet.on = tv.zen.on = tv.peel.on = tv.scr.on = true;
      tv.magnet.mod = tv.zen.mod = tv.peel.mod = tv.scr.mod = true;
      tv.magnet.strength = 70; tv.zen.sweep = 35; tv.peel.heal = 35; tv.scr.amount = 30;
      tv.tool = 'peel';
    }
  };

  function applyPreset(tv, name) {
    defaults(tv);
    PRESETS[name](tv);
  }

  ui.add.addEventListener('click', function () {
    if (tvs.length >= MAX_TVS) return;
    var tv = createTv();
    refreshBar();
    select(tv);
    status('Added TV ' + tv.n + '. ' + tvs.length + ' TVs on the wall.');
    tv.selBtn.focus();
  });

  ui.dup.addEventListener('click', function () {
    if (!selected || tvs.length >= MAX_TVS) return;
    var src = selected, tv = createTv();
    ['source', 'speed', 'tool'].forEach(function (k) { tv[k] = src[k]; });
    ['magnet', 'zen', 'peel', 'scr'].forEach(function (k) { tv[k] = JSON.parse(JSON.stringify(src[k])); });
    tv.mask.set(src.mask);
    refreshBar();
    select(tv);
    status('Duplicated TV ' + src.n + ' as TV ' + tv.n + '.');
  });

  ui.remove.addEventListener('click', function () {
    if (!selected || tvs.length <= 1) return;
    removeTv(selected);
  });

  function removeTv(tv) {
    var idx = tvs.indexOf(tv), n = tv.n;
    destroyTv(tv);
    refreshBar();
    select(tvs[Math.min(idx, tvs.length - 1)]);
    status('Removed TV ' + n + '. ' + tvs.length + ' TVs on the wall.');
    selected.selBtn.focus();
  }

  ui.preset.addEventListener('change', function () {
    var name = ui.preset.value;
    if (!name || !selected) return;
    applyPreset(selected, name);
    syncPanel();
    status('TV ' + selected.n + ' set to the ' + ui.preset.options[ui.preset.selectedIndex].text + ' preset.');
    ui.preset.value = '';
  });

  ui.copy.addEventListener('click', function () {
    if (!selected) return;
    tvs.forEach(function (tv) {
      if (tv === selected) return;
      ['magnet', 'zen', 'peel', 'scr'].forEach(function (k) {
        var keepPos = k === 'magnet' ? { x: tv.magnet.x, y: tv.magnet.y } : null;
        tv[k] = JSON.parse(JSON.stringify(selected[k]));
        if (keepPos) { tv.magnet.x = keepPos.x; tv.magnet.y = keepPos.y; }
      });
      tv.speed = selected.speed;
      tv.tool = selected.tool;
      refreshCard(tv);
    });
    status('Copied TV ' + selected.n + ' settings to every TV.');
  });

  /* ── Per-card events: select, remove, drag, keyboard ── */
  function toBuf(tv, e) {
    var r = tv.canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(W, (e.clientX - r.left) / r.width * W)),
      y: Math.max(0, Math.min(H, (e.clientY - r.top) / r.height * H))
    };
  }

  function peelR(tv) { return tv.peel.size / 240 * W * 0.5; }
  function peelAt(tv, px, py) { VideoFX.peelStamp(tv.mask, W, H, px, py, peelR(tv)); }
  function peelLine(tv, from, to) { VideoFX.peelLine(tv.mask, W, H, from, to, peelR(tv)); }

  function bindTv(tv) {
    tv.selBtn.addEventListener('click', function () { select(tv); });
    tv.xBtn.addEventListener('click', function () { if (tvs.length > 1) removeTv(tv); });

    tv.canvas.addEventListener('pointerdown', function (e) {
      select(tv);
      tv.dragging = true; tv.last = null;
      tv.canvas.setPointerCapture(e.pointerId);
      var p = toBuf(tv, e); tv.cursor = p;
      if (effTool(tv) === 'magnet') { tv.magnet.x = p.x; tv.magnet.y = p.y; }
      else if (tv.peel.on) { peelLine(tv, null, p); tv.last = p; }
    });
    tv.canvas.addEventListener('pointermove', function (e) {
      var p = toBuf(tv, e); tv.cursor = p;
      if (!tv.dragging) return;
      if (effTool(tv) === 'magnet') { tv.magnet.x = p.x; tv.magnet.y = p.y; }
      else if (tv.peel.on) { peelLine(tv, tv.last, p); tv.last = p; }
    });
    function end() { tv.dragging = false; tv.last = null; }
    tv.canvas.addEventListener('pointerup', end);
    tv.canvas.addEventListener('pointercancel', end);

    tv.canvas.addEventListener('keydown', function (e) {
      var step = 8;
      var moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      var m = moves[e.key];
      if (!m) return;
      e.preventDefault();
      var clamp = function (v, max) { return Math.max(0, Math.min(max, v)); };
      if (effTool(tv) === 'magnet' && !e.shiftKey) {
        tv.magnet.x = clamp(tv.magnet.x + m[0], W);
        tv.magnet.y = clamp(tv.magnet.y + m[1], H);
        tv.cursor = { x: tv.magnet.x, y: tv.magnet.y };
      } else {
        tv.cursor = { x: clamp(tv.cursor.x + m[0], W), y: clamp(tv.cursor.y + m[1], H) };
        if (e.shiftKey && tv.peel.on) peelAt(tv, tv.cursor.x, tv.cursor.y);
      }
    });
    tv.canvas.addEventListener('focus', function () { if (selected !== tv) select(tv); });
  }

  /* ── Rendering ── */
  function render(tv, dt) {
    tv.t += dt;
    var t = tv.t;
    var phase = Math.PI * 2 * (tv.speed / 100) * t;
    var lfo = 0.5 + 0.5 * Math.sin(phase); // 0..1
    var blink = (t % 3) < 0.12;
    var top = pattern(tv.source, blink);
    var under = pattern(UNDER[tv.source], blink);
    var cur = tv.buf1;

    // 1. Picture, with the top layer peeled away where the mask says so.
    var p = tv.peel;
    if (p.on) {
      if (p.mod) {
        var to = { x: W / 2 + W * 0.42 * Math.sin(phase * 1.3), y: H / 2 + H * 0.4 * Math.sin(phase * 0.9 + 1) };
        peelLine(tv, tv.auto, to);
        tv.auto = to;
      } else tv.auto = null;
      var m = tv.mask;
      if (p.heal > 0) VideoFX.healMask(m, p.heal / 100 * 0.6 * dt);
      VideoFX.peelComposite(top, under, m, cur);
    } else {
      tv.auto = null;
      cur.set(top);
    }

    // 2. Magnet: each pixel is resampled from a position twisted around the magnet.
    var mg = tv.magnet;
    if (mg.on) {
      var str = mg.strength / 100 * 5.5 * mg.pol * (mg.mod ? Math.sin(phase) : 1);
      var mx = mg.x, my = mg.y;
      if (mg.mod) { mx = W / 2 + W * 0.3 * Math.cos(phase * 0.7); my = H / 2 + H * 0.28 * Math.sin(phase * 1.1); }
      tv.magEff = { x: mx, y: my };
      if (VideoFX.magnetWarp(cur, tv.buf2, W, H, mx, my, str, 55)) cur = tv.buf2;
    } else tv.magEff = null;

    // 3. Scramble (or plain scan lines) into the output image.
    var sc = tv.scr.on ? tv.scr.amount / 100 * (tv.scr.mod ? lfo : 1) : 0;
    VideoFX.scramble(cur, tv.outImg.data, W, H, sc, t);
    tv.midCtx.putImageData(tv.outImg, 0, 0);

    draw(tv, lfo, t);
  }

  function draw(tv, lfo, t) {
    var ctx = tv.view.ctx, cw = tv.view.width, ch = tv.view.height;
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
    var z = tv.zen;

    if (!z.on) {
      ctx.drawImage(tv.mid, 0, 0, cw, ch);
    } else if (!z.vert) {
      // Downward sweep cut: the whole beam parks on one spot.
      var dx = cw / 2, dy = ch / 2;
      var rg = ctx.createRadialGradient(dx, dy, 0, dx, dy, 26);
      rg.addColorStop(0, 'rgba(255,255,255,1)');
      rg.addColorStop(0.15, 'rgba(255,255,255,0.85)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(dx - 26, dy - 26, 52, 52);
    } else {
      var min = z.sweep / 100;
      var s = z.mod ? min + (1 - min) * lfo : min;
      VideoFX.zenDraw(ctx, cw, ch, tv.mid, tv.outImg.data, W, H, s, t, tv.avg);
    }

    // Glass glare
    var gg = ctx.createRadialGradient(cw * 0.3, ch * 0.2, 0, cw * 0.3, ch * 0.2, cw * 0.7);
    gg.addColorStop(0, 'rgba(255,255,255,0.10)');
    gg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(0, 0, cw, ch);

    if (tv.magEff) drawMagnet(tv, ctx, cw, ch);
    if (tv === selected && tv.peel.on && effTool(tv) === 'peel') {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(tv.cursor.x / W * cw, tv.cursor.y / H * ch, tv.peel.size / 240 * cw * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawMagnet(tv, ctx, cw, ch) {
    var px = tv.magEff.x / W * cw, py = tv.magEff.y / H * ch;
    var r = Math.max(12, cw * 0.035);
    var pol = tv.magnet.mod ? (Math.sin(Math.PI * 2 * (tv.speed / 100) * tv.t) * tv.magnet.pol >= 0 ? 1 : -1) : tv.magnet.pol;
    ctx.save();
    ctx.translate(px, py);
    ctx.lineWidth = r * 0.7;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(2, 3, r, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = '#d4d4d8';
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = pol > 0 ? '#ef4444' : '#3b82f6'; ctx.fillRect(-r - r * 0.35, 0, r * 0.7, r * 0.8);
    ctx.fillStyle = pol > 0 ? '#3b82f6' : '#ef4444'; ctx.fillRect(r - r * 0.35, 0, r * 0.7, r * 0.8);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(r * 0.55) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(pol > 0 ? 'N' : 'S', -r, r * 0.45);
    ctx.fillText(pol > 0 ? 'S' : 'N', r, r * 0.45);
    ctx.restore();
  }

  /* ── Boot: one TV with the magnet already on, like the old Magnet TV sim ── */
  var first = createTv();
  PRESETS.magnet(first);
  refreshBar();
  select(first);

  SimKit.loop(function (dt) {
    dt = Math.min(dt, 0.1);
    for (var i = 0; i < tvs.length; i++) if (tvs[i].visible) render(tvs[i], dt);
  });
})();
