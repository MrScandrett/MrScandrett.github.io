  (function () {
    var drawCanvas = document.getElementById('pdraw-canvas');
    var physCanvas = document.getElementById('pphys-canvas');
    if (!drawCanvas || !physCanvas) return;
    var dCtx = drawCanvas.getContext('2d');
    var pCtx = physCanvas.getContext('2d');
    var DPR  = window.devicePixelRatio || 1;
    var missions = [
      'Build a machine from three shapes, then make it move.',
      'Can two different masses fall at the same rate? Build a test.',
      'Create the longest-lasting bounce without turning gravity off.',
      'Draw a creature, bring it to life, and send it sideways.',
      'Make two objects collide while their velocity vectors are visible.',
      'Invent a shape that behaves differently when gravity points up.'
    ];
    var missionIndex = 0;
    var missionText = document.getElementById('phys-mission-text');
    var missionRefresh = document.getElementById('phys-mission-refresh');
    if (missionRefresh) missionRefresh.addEventListener('click', function () {
      missionIndex = (missionIndex + 1 + Math.floor(Math.random() * (missions.length - 1))) % missions.length;
      if (missionText) missionText.textContent = missions[missionIndex];
    });

    // ── Tab switching ──────────────────────────────────────
    document.querySelectorAll('.phys-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.phys-tab').forEach(function (t) { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
        document.querySelectorAll('.phys-panel').forEach(function (p) { p.classList.remove('is-active'); });
        tab.classList.add('is-active'); tab.setAttribute('aria-selected', 'true');
        var panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (panel) panel.classList.add('is-active');
        if (tab.id === 'ptab-phys') { stopRider(); stopPhys(); resizeP(); startPhys(); }
        else if (tab.id === 'ptab-rider') { stopPhys(); resizeR(); startRider(); }
        else { stopPhys(); stopRider(); resizeD(); }
      });
    });

    // ── Grid helper ────────────────────────────────────────
    function drawGrid(ctx, w, h) {
      ctx.save();
      ctx.strokeStyle = 'rgba(100,130,200,0.07)';
      ctx.lineWidth = 1;
      var sp = 28;
      for (var x = 0; x <= w; x += sp) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (var y = 0; y <= h; y += sp) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.restore();
    }

    // ══════════════════════════════════════════════════════
    // DRAW MODE
    // ══════════════════════════════════════════════════════
    var drawTool = 'pencil', drawColor = '#2563eb', drawFillColor = '#93c5fd', drawSize = 3, drawFill = false;
    var strokes = [], curStroke = null, drawing = false, shapeStart = null;
    var rulerPts = [];
    var drawLaunch = document.getElementById('pdraw-launch');
    var drawCoach = document.getElementById('pdraw-coach');

    function updateDrawUi() {
      var hasArtwork = strokes.some(function (s) { return s.type !== 'eraser' && s.type !== 'ruler'; });
      if (drawLaunch) drawLaunch.disabled = !hasArtwork;
      if (drawCoach) drawCoach.classList.toggle('is-hidden', hasArtwork || drawing);
    }

    function resizeD() {
      var w = drawCanvas.offsetWidth, h = window.innerWidth <= 560 ? 320 : 480;
      drawCanvas.width  = Math.round(w * DPR);
      drawCanvas.height = Math.round(h * DPR);
      drawCanvas.style.height = h + 'px';
      dCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
      redrawD();
    }

    function dPos(e) {
      var r = drawCanvas.getBoundingClientRect();
      var src = e.touches ? e.touches[0] : e;
      return { x: src.clientX - r.left, y: src.clientY - r.top };
    }

    function redrawD() {
      var w = drawCanvas.offsetWidth, h = drawCanvas.offsetHeight;
      dCtx.clearRect(0, 0, w, h);
      drawGrid(dCtx, w, h);
      strokes.forEach(paintStroke);
      if (curStroke) paintStroke(curStroke);
    }

    function paintStroke(s) {
      dCtx.save();
      dCtx.strokeStyle = s.color; dCtx.fillStyle = s.fillColor || s.color;
      dCtx.lineWidth = s.size; dCtx.lineCap = 'round'; dCtx.lineJoin = 'round';
      if (s.type === 'pencil') {
        dCtx.beginPath();
        s.pts.forEach(function (p, i) { i ? dCtx.lineTo(p.x, p.y) : dCtx.moveTo(p.x, p.y); });
        dCtx.stroke();
      } else if (s.type === 'eraser') {
        dCtx.globalCompositeOperation = 'destination-out';
        dCtx.beginPath();
        s.pts.forEach(function (p, i) { i ? dCtx.lineTo(p.x, p.y) : dCtx.moveTo(p.x, p.y); });
        dCtx.stroke();
      } else if (s.type === 'line') {
        dCtx.beginPath(); dCtx.moveTo(s.x1, s.y1); dCtx.lineTo(s.x2, s.y2); dCtx.stroke();
      } else if (s.type === 'rect') {
        if (s.fill) { dCtx.fillStyle = s.fillColor; dCtx.fillRect(s.x, s.y, s.w, s.h); }
        dCtx.strokeRect(s.x, s.y, s.w, s.h);
      } else if (s.type === 'circle') {
        dCtx.beginPath(); dCtx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
        if (s.fill) { dCtx.fillStyle = s.fillColor; dCtx.fill(); }
        dCtx.stroke();
      } else if (s.type === 'ruler') {
        dCtx.setLineDash([6, 4]);
        dCtx.beginPath(); dCtx.moveTo(s.x1, s.y1); dCtx.lineTo(s.x2, s.y2); dCtx.stroke();
        dCtx.setLineDash([]);
        dCtx.font = 'bold 11px monospace'; dCtx.textAlign = 'center';
        dCtx.fillText(s.dist + ' px', (s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2 - 8);
      }
      dCtx.restore();
    }

    function dDown(e) {
      e.preventDefault();
      var p = dPos(e); drawing = true; shapeStart = p;
      updateDrawUi();
      if (drawTool === 'pencil' || drawTool === 'eraser') {
        curStroke = { type: drawTool, color: drawColor, size: drawTool === 'eraser' ? drawSize * 4 : drawSize, pts: [p] };
      } else if (drawTool === 'ruler') {
        if (!rulerPts.length) { rulerPts = [p]; drawing = false; return; }
        var a = rulerPts[0], b = p;
        var dist = Math.round(Math.hypot(b.x - a.x, b.y - a.y));
        strokes.push({ type: 'ruler', color: drawColor, size: drawSize, x1: a.x, y1: a.y, x2: b.x, y2: b.y, dist: dist });
        var bar = document.getElementById('pdraw-ruler-bar');
        var val = document.getElementById('pdraw-ruler-val');
        if (bar) bar.hidden = false;
        if (val) val.textContent = dist + ' px ≈ ' + (dist / 37.8).toFixed(1) + ' cm (96 dpi)';
        rulerPts = []; drawing = false; redrawD(); updateDrawUi();
      }
    }

    function dMove(e) {
      if (!drawing || drawTool === 'ruler') return;
      e.preventDefault();
      var p = dPos(e);
      if (drawTool === 'pencil' || drawTool === 'eraser') {
        curStroke.pts.push(p);
      } else {
        var dx = p.x - shapeStart.x, dy = p.y - shapeStart.y;
        if (drawTool === 'line')        curStroke = { type: 'line',   color: drawColor, size: drawSize, x1: shapeStart.x, y1: shapeStart.y, x2: p.x, y2: p.y };
        else if (drawTool === 'rect')   curStroke = { type: 'rect',   color: drawColor, fillColor: drawFillColor, fill: drawFill, size: drawSize, x: shapeStart.x, y: shapeStart.y, w: dx, h: dy };
        else                            curStroke = { type: 'circle', color: drawColor, fillColor: drawFillColor, fill: drawFill, size: drawSize, cx: shapeStart.x, cy: shapeStart.y, r: Math.hypot(dx, dy) };
      }
      redrawD();
    }

    function dUp(e) {
      if (!drawing) return; drawing = false;
      if (curStroke) { strokes.push(curStroke); curStroke = null; }
      redrawD(); updateDrawUi();
    }

    function undoDraw() {
      if (strokes.length) { strokes.pop(); redrawD(); updateDrawUi(); }
    }

    function downloadDraw() {
      var tmp = document.createElement('canvas');
      tmp.width = drawCanvas.width; tmp.height = drawCanvas.height;
      var tCtx = tmp.getContext('2d');
      tCtx.fillStyle = '#ffffff'; tCtx.fillRect(0, 0, tmp.width, tmp.height);
      tCtx.drawImage(drawCanvas, 0, 0);
      var a = document.createElement('a');
      a.href = tmp.toDataURL('image/png'); a.download = 'drawing.png'; a.click();
    }

    function strokeBounds(s) {
      if (s.type === 'circle') return { x:s.cx-s.r, y:s.cy-s.r, w:s.r*2, h:s.r*2 };
      if (s.type === 'rect') return { x:Math.min(s.x,s.x+s.w), y:Math.min(s.y,s.y+s.h), w:Math.abs(s.w), h:Math.abs(s.h) };
      if (s.type === 'line') return { x:Math.min(s.x1,s.x2), y:Math.min(s.y1,s.y2), w:Math.abs(s.x2-s.x1), h:Math.abs(s.y2-s.y1) };
      if (s.pts && s.pts.length) {
        var xs=s.pts.map(function (p) { return p.x; }), ys=s.pts.map(function (p) { return p.y; });
        var minX=Math.min.apply(Math,xs), maxX=Math.max.apply(Math,xs), minY=Math.min.apply(Math,ys), maxY=Math.max.apply(Math,ys);
        return { x:minX, y:minY, w:maxX-minX, h:maxY-minY };
      }
      return null;
    }

    function launchDrawing() {
      var artwork = strokes.filter(function (s) { return s.type !== 'eraser' && s.type !== 'ruler'; }).slice(-18);
      if (!artwork.length) return;
      var sourceW = Math.max(drawCanvas.offsetWidth,1), sourceH = Math.max(drawCanvas.offsetHeight,1);
      document.getElementById('ptab-phys').click();
      var sx = PW()/sourceW, sy = PH()/sourceH;
      artwork.forEach(function (s, index) {
        var b = strokeBounds(s);
        if (!b) return;
        var cx=(b.x+b.w/2)*sx, cy=(b.y+b.h/2)*sy;
        var opts={ color:s.color || COLORS[index%COLORS.length] };
        if (s.type === 'circle') {
          opts.type='ball'; opts.r=Math.max(10,Math.min(42,(b.w+b.h)*0.25*sx));
        } else {
          opts.type='box';
          opts.w=Math.max(12,Math.min(90,b.w*sx || s.size*3));
          opts.h=Math.max(12,Math.min(70,b.h*sy || s.size*3));
          if (s.type === 'line') opts.angle=Math.atan2(s.y2-s.y1,s.x2-s.x1);
        }
        spawnObj(Math.max(12,Math.min(PW()-12,cx)),Math.max(12,Math.min(PH()-12,cy)),(index-artwork.length/2)*7,-30-index*3,opts);
      });
      liveMsg = artwork.length+' sketch '+(artwork.length===1?'body':'bodies')+' entered the simulation';
      if (missionText) missionText.textContent = 'Experiment: change gravity and discover what your drawing does next.';
    }

    drawCanvas.addEventListener('mousedown', dDown);
    drawCanvas.addEventListener('mousemove', dMove);
    drawCanvas.addEventListener('mouseup', dUp);
    drawCanvas.addEventListener('mouseleave', dUp);
    drawCanvas.addEventListener('touchstart', dDown, { passive: false });
    drawCanvas.addEventListener('touchmove', dMove, { passive: false });
    drawCanvas.addEventListener('touchend', dUp);

    document.querySelectorAll('#ppanel-draw .ptool[data-tool]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#ppanel-draw .ptool[data-tool]').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active'); drawTool = btn.dataset.tool; rulerPts = [];
        var bar = document.getElementById('pdraw-ruler-bar');
        if (bar && drawTool !== 'ruler') bar.hidden = true;
      });
    });
    document.getElementById('pdraw-color')     && document.getElementById('pdraw-color').addEventListener('input', function () { drawColor = this.value; });
    document.getElementById('pdraw-fillcolor') && document.getElementById('pdraw-fillcolor').addEventListener('input', function () { drawFillColor = this.value; });
    document.getElementById('pdraw-size')      && document.getElementById('pdraw-size').addEventListener('input', function () { drawSize = +this.value; });
    document.getElementById('pdraw-fill')      && document.getElementById('pdraw-fill').addEventListener('change', function () { drawFill = this.checked; });
    document.getElementById('pdraw-undo')      && document.getElementById('pdraw-undo').addEventListener('click', undoDraw);
    document.getElementById('pdraw-download')  && document.getElementById('pdraw-download').addEventListener('click', downloadDraw);
    drawLaunch && drawLaunch.addEventListener('click', launchDrawing);
    document.getElementById('pdraw-clear')     && document.getElementById('pdraw-clear').addEventListener('click', function () {
      strokes = []; curStroke = null; rulerPts = [];
      var bar = document.getElementById('pdraw-ruler-bar'); if (bar) bar.hidden = true;
      redrawD(); updateDrawUi();
    });

    // Keyboard shortcuts (active when draw panel is visible)
    document.addEventListener('keydown', function (e) {
      if (!document.getElementById('ppanel-draw').classList.contains('is-active')) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoDraw(); return; }
      var map = { p: 'pencil', l: 'line', r: 'rect', c: 'circle', m: 'ruler', e: 'eraser' };
      var t = map[e.key.toLowerCase()];
      if (t) { var btn = document.querySelector('#ppanel-draw .ptool[data-tool="'+t+'"]'); if (btn) btn.click(); }
    });

    // ══════════════════════════════════════════════════════
    // PHYSICS MODE
    // ══════════════════════════════════════════════════════
    var PPM = 80;
    var G   = 9.8 * PPM;
    var gravDir = { x: 0, y: 1 };
    var windForce = 0;
    var bounceScale = 0.72;
    var showVectors = false;
    var showTrails = false;
    var physPaused = false;
    var objs = [], rafId = null, lastT = null;
    var physMode = 'ball';
    var dragObj = null, dragOx = 0, dragOy = 0, prevP = null, prevPT = 0, throwVx = 0, throwVy = 0;
    var liveMsg = '';
    var COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316'];
    var ci = 0;

    function resizeP() {
      var w = physCanvas.offsetWidth, h = window.innerWidth <= 560 ? 320 : 480;
      physCanvas.width  = Math.round(w * DPR);
      physCanvas.height = Math.round(h * DPR);
      physCanvas.style.height = h + 'px';
      pCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function PW() { return physCanvas.offsetWidth; }
    function PH() { return physCanvas.offsetHeight; }

    function spawnObj(x, y, vx, vy, options) {
      if (objs.length >= 25) objs.shift();
      var opts = options || {};
      var color = opts.color || COLORS[ci++ % COLORS.length];
      var e = bounceScale;
      var type = opts.type || physMode;
      if (type === 'ball') {
        var r = opts.r || 16 + Math.random() * 10;
        objs.push({ type: 'ball', x: x, y: y, vx: vx||0, vy: vy||0, r: r, mass: r/10, color: color, e: e, angle: opts.angle||0, omega: 0, trail:[] });
      } else if (type === 'box') {
        var s = 26 + Math.random() * 14, ow=opts.w||s, oh=opts.h||s;
        objs.push({ type: 'box', x: x, y: y, vx: vx||0, vy: vy||0, w: ow, h: oh, mass: Math.sqrt(ow*oh)/8, color: color, e: e*0.7, angle: opts.angle||0, omega: 0, trail:[] });
      } else {
        var r2 = opts.r || 18 + Math.random() * 10;
        objs.push({ type: 'tri', x: x, y: y, vx: vx||0, vy: vy||0, r: r2, mass: r2/10, color: color, e: e*0.8, angle: opts.angle||0, omega: 0, trail:[] });
      }
      var coach=document.getElementById('pphys-coach'); if (coach) coach.classList.add('is-hidden');
    }

    function hit(o, x, y) {
      if (o.type === 'ball' || o.type === 'tri') return Math.hypot(x - o.x, y - o.y) <= o.r;
      return x >= o.x - o.w/2 && x <= o.x + o.w/2 && y >= o.y - o.h/2 && y <= o.y + o.h/2;
    }

    function pPos(e) {
      var r = physCanvas.getBoundingClientRect();
      var src = e.touches ? e.touches[0] : e;
      return { x: src.clientX - r.left, y: src.clientY - r.top };
    }

    physCanvas.addEventListener('mousedown', function (e) {
      var p = pPos(e);
      dragObj = objs.slice().reverse().find(function (o) { return hit(o, p.x, p.y); }) || null;
      if (dragObj) { dragOx = dragObj.x - p.x; dragOy = dragObj.y - p.y; dragObj.vx = dragObj.vy = 0; dragObj.omega = 0; }
      prevP = p; prevPT = performance.now();
    });
    physCanvas.addEventListener('mousemove', function (e) {
      var p = pPos(e), now = performance.now(), dt = (now - prevPT) / 1000;
      if (dragObj) {
        if (prevP && dt > 0) { throwVx = (p.x - prevP.x) / Math.max(dt, 0.008); throwVy = (p.y - prevP.y) / Math.max(dt, 0.008); }
        dragObj.x = p.x + dragOx; dragObj.y = p.y + dragOy;
      }
      prevP = p; prevPT = now;
    });
    physCanvas.addEventListener('mouseup', function (e) {
      if (dragObj) { dragObj.vx = throwVx; dragObj.vy = throwVy; dragObj.omega = throwVx * 0.02; dragObj = null; throwVx = throwVy = 0; }
      else { var p = pPos(e); if (prevP && Math.hypot(p.x - prevP.x, p.y - prevP.y) < 6) spawnObj(p.x, p.y); }
    });
    physCanvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      var p = pPos(e);
      dragObj = objs.slice().reverse().find(function (o) { return hit(o, p.x, p.y); }) || null;
      if (dragObj) { dragOx = dragObj.x - p.x; dragOy = dragObj.y - p.y; dragObj.vx = dragObj.vy = 0; dragObj.omega = 0; }
      prevP = p; prevPT = performance.now();
    }, { passive: false });
    physCanvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      var p = pPos(e), now = performance.now(), dt = (now - prevPT) / 1000;
      if (dragObj) { throwVx = (p.x-(prevP?prevP.x:p.x))/Math.max(dt,0.008); throwVy = (p.y-(prevP?prevP.y:p.y))/Math.max(dt,0.008); dragObj.x = p.x+dragOx; dragObj.y = p.y+dragOy; }
      prevP = p; prevPT = now;
    }, { passive: false });
    physCanvas.addEventListener('touchend', function (e) {
      if (dragObj) { dragObj.vx = throwVx; dragObj.vy = throwVy; dragObj.omega = throwVx * 0.02; dragObj = null; throwVx = throwVy = 0; }
      else if (prevP) spawnObj(prevP.x, prevP.y);
    });

    function collCC(a, b) {
      var dx = b.x-a.x, dy = b.y-a.y, d = Math.hypot(dx,dy), min = a.r+b.r;
      if (d >= min || d < 0.001) return;
      var nx = dx/d, ny = dy/d, ov = min-d, tm = a.mass+b.mass;
      a.x -= nx*ov*b.mass/tm; a.y -= ny*ov*b.mass/tm;
      b.x += nx*ov*a.mass/tm; b.y += ny*ov*a.mass/tm;
      var dvx = a.vx-b.vx, dvy = a.vy-b.vy, dot = dvx*nx+dvy*ny;
      if (dot <= 0) return;
      var e = Math.min(a.e,b.e), imp = (1+e)*dot/tm;
      a.vx -= imp*b.mass*nx; a.vy -= imp*b.mass*ny;
      b.vx += imp*a.mass*nx; b.vy += imp*a.mass*ny;
      a.omega += (dvy*nx - dvx*ny) * 0.8;
      b.omega -= (dvy*nx - dvx*ny) * 0.8;
      var v = Math.hypot(a.vx,a.vy)/PPM;
      liveMsg = 'v = '+v.toFixed(1)+' m/s · KE = '+(0.5*a.mass*v*v).toFixed(2)+' J · p = '+(a.mass*v).toFixed(2)+' kg·m/s';
    }

    function collCB(c, b) {
      var cx = Math.max(b.x-b.w/2, Math.min(b.x+b.w/2, c.x));
      var cy = Math.max(b.y-b.h/2, Math.min(b.y+b.h/2, c.y));
      var dx = c.x-cx, dy = c.y-cy, d = Math.hypot(dx,dy);
      if (d >= c.r || d < 0.001) return;
      var nx = dx/d, ny = dy/d, ov = c.r-d, tm = c.mass+b.mass, e = Math.min(c.e,b.e);
      c.x += nx*ov*b.mass/tm; c.y += ny*ov*b.mass/tm;
      b.x -= nx*ov*c.mass/tm; b.y -= ny*ov*c.mass/tm;
      var dvx = c.vx-b.vx, dvy = c.vy-b.vy, dot = dvx*nx+dvy*ny;
      if (dot <= 0) return;
      var imp = (1+e)*dot/tm;
      c.vx -= imp*b.mass*nx; c.vy -= imp*b.mass*ny;
      b.vx += imp*c.mass*nx; b.vy += imp*c.mass*ny;
      c.omega += (dvy*nx - dvx*ny) * 0.6;
      b.omega -= (dvy*nx - dvx*ny) * 0.3;
    }

    function collBB(a, b) {
      var ol = (a.x+a.w/2)-(b.x-b.w/2), or_ = (b.x+b.w/2)-(a.x-a.w/2);
      var ot = (a.y+a.h/2)-(b.y-b.h/2), ob = (b.y+b.h/2)-(a.y-a.h/2);
      if (ol<=0||or_<=0||ot<=0||ob<=0) return;
      var e = Math.min(a.e,b.e), tm = a.mass+b.mass, m = Math.min(ol,or_,ot,ob);
      if (m===ot)      { a.vy=-Math.abs(a.vy)*e; b.vy= Math.abs(b.vy)*e; a.y-=ot*b.mass/tm; b.y+=ot*a.mass/tm; a.omega+=a.vx*0.01; b.omega-=b.vx*0.01; }
      else if (m===ob) { a.vy= Math.abs(a.vy)*e; b.vy=-Math.abs(b.vy)*e; a.y+=ob*b.mass/tm; b.y-=ob*a.mass/tm; a.omega+=a.vx*0.01; b.omega-=b.vx*0.01; }
      else if (m===ol) { a.vx=-Math.abs(a.vx)*e; b.vx= Math.abs(b.vx)*e; a.x-=ol*b.mass/tm; b.x+=ol*a.mass/tm; a.omega+=a.vy*0.01; b.omega-=b.vy*0.01; }
      else             { a.vx= Math.abs(a.vx)*e; b.vx=-Math.abs(b.vx)*e; a.x+=or_*b.mass/tm; b.x-=or_*a.mass/tm; a.omega+=a.vy*0.01; b.omega-=b.vy*0.01; }
    }

    function wallBounce(o, W, H) {
      var e = o.e;
      if (o.type === 'ball' || o.type === 'tri') {
        var r = o.r;
        if (o.y+r >= H) { o.y=H-r; o.vy=-Math.abs(o.vy)*e; o.vx*=0.92; o.omega += o.vx*0.05; }
        if (o.y-r <=  0) { o.y=r;   o.vy= Math.abs(o.vy)*e; }
        if (o.x-r <=  0) { o.x=r;   o.vx= Math.abs(o.vx)*e; o.omega += o.vy*0.05; }
        if (o.x+r >=  W) { o.x=W-r; o.vx=-Math.abs(o.vx)*e; o.omega += o.vy*0.05; }
      } else {
        var hw=o.w/2, hh=o.h/2;
        if (o.y+hh >= H) { o.y=H-hh; o.vy=-Math.abs(o.vy)*e; o.vx*=0.92; o.omega += o.vx*0.03; }
        if (o.y-hh <=  0) { o.y=hh;  o.vy= Math.abs(o.vy)*e; }
        if (o.x-hw <=  0) { o.x=hw;  o.vx= Math.abs(o.vx)*e; o.omega += o.vy*0.03; }
        if (o.x+hw >=  W) { o.x=W-hw; o.vx=-Math.abs(o.vx)*e; o.omega += o.vy*0.03; }
      }
    }

    function step(dt) {
      var W = PW(), H = PH();
      objs.forEach(function (o) {
        if (o === dragObj) return;
        o.vx += (G * gravDir.x + windForce) * dt;
        o.vy += G * gravDir.y * dt;
        o.vx *= 0.9995; o.vy *= 0.9995;
        o.omega *= 0.994;
        o.x += o.vx * dt; o.y += o.vy * dt;
        o.angle += o.omega * dt;
        wallBounce(o, W, H);
      });
      for (var i=0;i<objs.length;i++) for (var j=i+1;j<objs.length;j++) {
        if (objs[i]===dragObj||objs[j]===dragObj) continue;
        var a=objs[i],b=objs[j];
        var ac=(a.type==='ball'||a.type==='tri'), bc=(b.type==='ball'||b.type==='tri');
        if (ac&&bc) collCC(a,b);
        else if (!ac&&!bc) collBB(a,b);
        else if (ac) collCB(a,b);
        else collCB(b,a);
      }
    }

    function drawArrow(x, y, dx, dy, color) {
      var len = Math.hypot(dx, dy);
      if (len < 1) return;
      var sc = Math.min(len, 80) / len;
      var ex = x + dx*sc, ey = y + dy*sc, ang = Math.atan2(dy, dx);
      pCtx.save();
      pCtx.strokeStyle = color; pCtx.fillStyle = color; pCtx.lineWidth = 2;
      pCtx.beginPath(); pCtx.moveTo(x, y); pCtx.lineTo(ex, ey); pCtx.stroke();
      pCtx.beginPath();
      pCtx.moveTo(ex, ey);
      pCtx.lineTo(ex - 9*Math.cos(ang-0.4), ey - 9*Math.sin(ang-0.4));
      pCtx.lineTo(ex - 9*Math.cos(ang+0.4), ey - 9*Math.sin(ang+0.4));
      pCtx.closePath(); pCtx.fill();
      pCtx.restore();
    }

    function lighten(hex, amt) {
      var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
      return 'rgb('+Math.min(255,Math.round(r+(255-r)*amt))+','+Math.min(255,Math.round(g+(255-g)*amt))+','+Math.min(255,Math.round(b+(255-b)*amt))+')';
    }

    function drawObjs() {
      var W=PW(), H=PH();
      pCtx.clearRect(0,0,W,H);
      drawGrid(pCtx,W,H);

      // Gravity direction indicator
      if (gravDir.x !== 0 || gravDir.y !== 0)
        drawArrow(22, 22, gravDir.x*28, gravDir.y*28, 'rgba(100,130,200,0.45)');

      // Wind indicator
      if (Math.abs(windForce) > 8) {
        pCtx.save(); pCtx.globalAlpha = 0.45;
        drawArrow(W/2, 14, (windForce>0?1:-1)*Math.min(Math.abs(windForce)*0.22,44), 0, '#22c55e');
        pCtx.restore();
      }

      if (showTrails) {
        objs.forEach(function (o) {
          var last=o.trail[o.trail.length-1];
          if (!last || Math.hypot(o.x-last.x,o.y-last.y)>3) {
            o.trail.push({x:o.x,y:o.y});
            if (o.trail.length>42) o.trail.shift();
          }
          if (o.trail.length>1) {
            pCtx.save();
            pCtx.strokeStyle=o.color;
            pCtx.globalAlpha=0.28;
            pCtx.lineWidth=2;
            pCtx.beginPath();
            o.trail.forEach(function (point,i) { i?pCtx.lineTo(point.x,point.y):pCtx.moveTo(point.x,point.y); });
            pCtx.stroke();
            pCtx.restore();
          }
        });
      }

      // Floor/wall line (follows gravity direction)
      pCtx.save(); pCtx.strokeStyle='rgba(100,130,200,0.22)'; pCtx.lineWidth=2;
      if (gravDir.y > 0)      { pCtx.beginPath(); pCtx.moveTo(0,H); pCtx.lineTo(W,H); pCtx.stroke(); }
      else if (gravDir.y < 0) { pCtx.beginPath(); pCtx.moveTo(0,0); pCtx.lineTo(W,0); pCtx.stroke(); }
      else if (gravDir.x > 0) { pCtx.beginPath(); pCtx.moveTo(W,0); pCtx.lineTo(W,H); pCtx.stroke(); }
      else if (gravDir.x < 0) { pCtx.beginPath(); pCtx.moveTo(0,0); pCtx.lineTo(0,H); pCtx.stroke(); }
      pCtx.restore();

      objs.forEach(function (o) {
        pCtx.save();
        pCtx.translate(o.x, o.y);
        pCtx.rotate(o.angle);
        pCtx.strokeStyle = 'rgba(0,0,0,0.18)'; pCtx.lineWidth = 1.5;
        if (o.type === 'ball') {
          var grad = pCtx.createRadialGradient(-o.r*0.3,-o.r*0.3,o.r*0.05,0,0,o.r);
          grad.addColorStop(0, lighten(o.color,0.5));
          grad.addColorStop(1, o.color);
          pCtx.fillStyle = grad;
          pCtx.beginPath(); pCtx.arc(0,0,o.r,0,Math.PI*2); pCtx.fill(); pCtx.stroke();
          pCtx.strokeStyle='rgba(0,0,0,0.2)'; pCtx.lineWidth=1.5;
          pCtx.beginPath(); pCtx.moveTo(0,0); pCtx.lineTo(o.r*0.75,0); pCtx.stroke();
        } else if (o.type === 'box') {
          pCtx.fillStyle = o.color;
          pCtx.beginPath();
          if (pCtx.roundRect) pCtx.roundRect(-o.w/2,-o.h/2,o.w,o.h,5);
          else pCtx.rect(-o.w/2,-o.h/2,o.w,o.h);
          pCtx.fill(); pCtx.stroke();
        } else {
          pCtx.fillStyle = o.color;
          pCtx.beginPath();
          for (var k=0;k<3;k++) {
            var a=k*2*Math.PI/3-Math.PI/2;
            k ? pCtx.lineTo(o.r*Math.cos(a),o.r*Math.sin(a)) : pCtx.moveTo(o.r*Math.cos(a),o.r*Math.sin(a));
          }
          pCtx.closePath(); pCtx.fill(); pCtx.stroke();
        }
        pCtx.restore();

        // Velocity label
        var v = Math.hypot(o.vx,o.vy)/PPM;
        var ly = (o.type==='ball'||o.type==='tri') ? o.y-o.r-4 : o.y-o.h/2-4;
        pCtx.fillStyle='rgba(255,255,255,0.95)'; pCtx.font='bold 9px monospace'; pCtx.textAlign='center';
        pCtx.fillText('v='+v.toFixed(1)+'m/s', o.x, ly);

        // Velocity vector arrow
        if (showVectors && (Math.abs(o.vx) > 8 || Math.abs(o.vy) > 8))
          drawArrow(o.x, o.y, o.vx*0.08, o.vy*0.08, 'rgba(255,230,50,0.9)');
      });

      var ro = document.getElementById('pphys-readout');
      var totalEnergy=objs.reduce(function (sum,o) {
        var v=Math.hypot(o.vx,o.vy)/PPM;
        return sum+0.5*o.mass*v*v;
      },0);
      var count=document.getElementById('pphys-object-count');
      var energy=document.getElementById('pphys-energy');
      if (count) count.textContent=objs.length+' '+(objs.length===1?'body':'bodies');
      if (energy) energy.textContent=totalEnergy.toFixed(1)+' J';
      if (ro) ro.textContent = physPaused ? 'Experiment paused' : (liveMsg || (objs.length ? 'Drag a body to add force' : 'Click or tap to spawn'));
    }

    function loop(ts) {
      if (!lastT) lastT = ts;
      var dt = Math.min((ts-lastT)/1000, 0.05); lastT = ts;
      if (!physPaused) for (var s=0;s<3;s++) step(dt/3);
      drawObjs();
      rafId = requestAnimationFrame(loop);
    }

    function startPhys() { if (!rafId) { lastT=null; rafId=requestAnimationFrame(loop); } }
    function stopPhys()  { if (rafId)  { cancelAnimationFrame(rafId); rafId=null; lastT=null; } }

    document.querySelectorAll('#ppanel-phys .ptool[data-spawn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#ppanel-phys .ptool[data-spawn]').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active'); physMode = btn.dataset.spawn;
      });
    });

    document.querySelectorAll('#ppanel-phys .ptool-grav').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#ppanel-phys .ptool-grav').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var dirs = { down:{x:0,y:1}, up:{x:0,y:-1}, left:{x:-1,y:0}, right:{x:1,y:0}, none:{x:0,y:0} };
        gravDir = dirs[btn.dataset.grav] || {x:0,y:1};
      });
    });

    document.getElementById('pphys-bounce') && document.getElementById('pphys-bounce').addEventListener('input', function () {
      bounceScale = +this.value / 100;
      objs.forEach(function (o) { o.e = bounceScale * (o.type==='box' ? 0.7 : o.type==='tri' ? 0.8 : 1); });
    });
    document.getElementById('pphys-wind')    && document.getElementById('pphys-wind').addEventListener('input', function () { windForce = +this.value * 3; });
    document.getElementById('pphys-vectors') && document.getElementById('pphys-vectors').addEventListener('change', function () { showVectors = this.checked; });
    document.getElementById('pphys-trails') && document.getElementById('pphys-trails').addEventListener('change', function () {
      showTrails=this.checked;
      if (!showTrails) objs.forEach(function (o) { o.trail=[]; });
    });

    function setPaused(next) {
      physPaused=next;
      var btn=document.getElementById('pphys-pause');
      if (btn) {
        btn.innerHTML=physPaused?'▶ Resume':'⏸ Pause';
        btn.classList.toggle('is-active',physPaused);
        btn.setAttribute('aria-pressed',physPaused?'true':'false');
      }
      drawObjs();
    }

    document.getElementById('pphys-pause') && document.getElementById('pphys-pause').addEventListener('click', function () { setPaused(!physPaused); });
    document.getElementById('pphys-demo') && document.getElementById('pphys-demo').addEventListener('click', function () {
      objs=[]; physPaused=false;
      gravDir={x:0,y:1};
      document.querySelectorAll('#ppanel-phys .ptool-grav').forEach(function (b) { b.classList.toggle('is-active',b.dataset.grav==='down'); });
      var gap=PW()/4;
      spawnObj(gap,78,0,0,{type:'ball',r:12,color:'#38bdf8'});
      spawnObj(gap*2,68,0,0,{type:'ball',r:22,color:'#f59e0b'});
      spawnObj(gap*3,56,0,0,{type:'ball',r:34,color:'#8b5cf6'});
      liveMsg='Galileo drop: different masses, same acceleration';
      if (missionText) missionText.textContent='Observe: do the three masses reach the floor at the same time?';
      setPaused(false);
    });
    document.getElementById('pphys-burst') && document.getElementById('pphys-burst').addEventListener('click', function () {
      var types=['ball','box','tri'];
      for (var i=0;i<12;i++) spawnObj(30+Math.random()*Math.max(40,PW()-60),20+Math.random()*45,(Math.random()-.5)*240,Math.random()*-80,{type:types[i%3]});
      liveMsg='Object shower: watch energy move through collisions';
      setPaused(false);
    });
    document.getElementById('pphys-clear')   && document.getElementById('pphys-clear').addEventListener('click', function () {
      objs=[]; liveMsg=''; drawObjs();
      var coach=document.getElementById('pphys-coach'); if (coach) coach.classList.remove('is-hidden');
    });

    document.addEventListener('keydown',function (e) {
      var panel=document.getElementById('tabpanel-sandbox');
      if (e.code!=='Space'||panel.hidden||!document.getElementById('ppanel-phys').classList.contains('is-active')) return;
      if (e.target.tagName==='INPUT'||e.target.tagName==='BUTTON') return;
      e.preventDefault(); setPaused(!physPaused);
    });

    document.getElementById('ptab-phys') && document.getElementById('ptab-phys').addEventListener('click', function () { resizeP(); startPhys(); });
    document.getElementById('ptab-draw') && document.getElementById('ptab-draw').addEventListener('click', function () { stopPhys(); resizeD(); });

    // ══════════════════════════════════════════════════════
    // LINE RIDER MODE — draw a course, drop sleds, race gravity
    // ══════════════════════════════════════════════════════
    var riderCanvas = document.getElementById('prider-canvas');
    var rCtx = riderCanvas ? riderCanvas.getContext('2d') : null;
    if (riderCanvas && rCtx) {
      var rTool = 'track';
      var rHistory = [], rOldW = 0, rOldH = 0, rPointer = null;
      var rStrokes = [];       // { type:'track'|'accel', pts:[{x,y}] }
      var curRStroke = null, rDrawing = false;
      var rSegs = [];          // flattened { x1,y1,x2,y2, type }
      var startPts = [];       // { x, y }
      var riders = [];
      var riderRunning = false;
      var riderRafId = null, riderLastT = null;
      var riderLiveMsg = '';
      var bestSpeed = 0;
      var RIDER_COLORS = ['#ef4444','#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899'];
      var riderCoach = document.getElementById('prider-coach');

      function resizeR() {
        var w = riderCanvas.offsetWidth, h = window.innerWidth <= 560 ? 320 : 480;
        if (!w) return;
        if (rOldW && (w !== rOldW || h !== rOldH)) {
          var sx = w/rOldW, sy = h/rOldH;
          rStrokes.forEach(function(s) { s.pts.forEach(function(p) { p.x *= sx; p.y *= sy; }); });
          startPts.forEach(function(p) { p.x *= sx; p.y *= sy; });
          rHistory.forEach(function(state) {
            state.strokes.forEach(function(s) { s.pts.forEach(function(p) { p.x *= sx; p.y *= sy; }); });
            state.starts.forEach(function(p) { p.x *= sx; p.y *= sy; });
          });
          resetRide(); rebuildSegs();
        }
        rOldW = w; rOldH = h;
        riderCanvas.width  = Math.round(w * DPR);
        riderCanvas.height = Math.round(h * DPR);
        riderCanvas.style.height = h + 'px';
        rCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
        drawRider();
      }
      function RW() { return riderCanvas.offsetWidth; }
      function RH() { return riderCanvas.offsetHeight; }
      function rPos(e) {
        var r = riderCanvas.getBoundingClientRect();
        var src = e.touches ? e.touches[0] : e;
        return { x: src.clientX - r.left, y: src.clientY - r.top };
      }

      function rebuildSegs() {
        rSegs = [];
        rStrokes.forEach(function (s) {
          for (var i = 0; i < s.pts.length - 1; i++) {
            rSegs.push({ x1: s.pts[i].x, y1: s.pts[i].y, x2: s.pts[i+1].x, y2: s.pts[i+1].y, type: s.type });
          }
        });
      }

      function updateRiderUi() {
        var hasCourse = rStrokes.length > 0 || startPts.length > 0;
        if (riderCoach) riderCoach.classList.toggle('is-hidden', hasCourse || rDrawing);
      }

      function rememberCourse() {
        rHistory.push(JSON.parse(JSON.stringify({strokes:rStrokes, starts:startPts})));
        if (rHistory.length > 40) rHistory.shift();
      }
      function resetRide() {
        riderRunning = false; riders = []; bestSpeed = 0; riderLiveMsg = '';
        setRiderRunLabel();
      }

      // ── Course editing ──────────────────────────────────
      function rDown(e) {
        if (e.button !== 0 || rPointer !== null) return;
        e.preventDefault();
        rPointer = e.pointerId; riderCanvas.setPointerCapture(rPointer);
        rememberCourse(); resetRide();
        var p = rPos(e);
        if (rTool === 'track' || rTool === 'accel') {
          rDrawing = true;
          curRStroke = { type: rTool, pts: [p] };
          updateRiderUi();
        } else if (rTool === 'erase') {
          rDrawing = true;
          eraseNear(p);
        } else if (rTool === 'start') {
          var near = startPts.findIndex(function (sp) { return Math.hypot(sp.x - p.x, sp.y - p.y) < 20; });
          if (near >= 0) startPts.splice(near, 1);
          else if (startPts.length < 6) startPts.push(p);
          drawRider(); updateRiderUi();
        }
      }
      function rMove(e) {
        if (!rDrawing || e.pointerId !== rPointer) return;
        e.preventDefault();
        var p = rPos(e);
        if (rTool === 'track' || rTool === 'accel') { var last = curRStroke.pts[curRStroke.pts.length-1]; if (Math.hypot(p.x-last.x,p.y-last.y) >= 2) curRStroke.pts.push(p); drawRider(); }
        else if (rTool === 'erase') eraseNear(p);
      }
      function rUp() {
        rPointer = null;
        if (!rDrawing) return;
        rDrawing = false;
        if (curRStroke && curRStroke.pts.length > 1) { rStrokes.push(curRStroke); rebuildSegs(); }
        curRStroke = null;
        drawRider(); updateRiderUi();
      }
      function eraseNear(p) {
        var before = rStrokes.length;
        rStrokes = rStrokes.filter(function (s) {
          return !s.pts.some(function (pt, i) { var next = s.pts[i+1] || pt; var cp = closestOnSeg(p.x,p.y,pt.x,pt.y,next.x,next.y); return Math.hypot(cp.x-p.x,cp.y-p.y) < 20; });
        });
        if (rStrokes.length !== before) { rebuildSegs(); drawRider(); updateRiderUi(); }
      }

      riderCanvas.addEventListener('pointerdown', rDown);
      riderCanvas.addEventListener('pointermove', rMove);
      riderCanvas.addEventListener('pointerup', rUp);
      riderCanvas.addEventListener('pointercancel', rUp);
      riderCanvas.addEventListener('lostpointercapture', rUp);

      document.querySelectorAll('#ppanel-rider .ptool[data-rtool]').forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.dataset.rtool === rTool ? 'true' : 'false');
        btn.addEventListener('click', function () {
          rUp();
          document.querySelectorAll('#ppanel-rider .ptool[data-rtool]').forEach(function (b) { b.classList.remove('is-active'); b.setAttribute('aria-pressed','false'); });
          btn.classList.add('is-active'); btn.setAttribute('aria-pressed','true'); rTool = btn.dataset.rtool;
        });
      });
      document.getElementById('prider-undo') && document.getElementById('prider-undo').addEventListener('click', function () {
        if (rHistory.length) { var state = rHistory.pop(); rStrokes = state.strokes; startPts = state.starts; resetRide(); rebuildSegs(); drawRider(); updateRiderUi(); }
      });
      document.getElementById('prider-clear') && document.getElementById('prider-clear').addEventListener('click', function () {
        rememberCourse(); resetRide();
        rStrokes = []; rSegs = []; startPts = []; riders = []; riderRunning = false; riderLiveMsg = '';
        setRiderRunLabel();
        drawRider(); updateRiderUi();
      });

      document.addEventListener('keydown', function (e) {
        if (document.getElementById('tabpanel-sandbox').hidden || !document.getElementById('ppanel-rider').classList.contains('is-active')) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable || e.target.tagName === 'SELECT') return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); document.getElementById('prider-undo').click(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.code === 'Space' && e.target.tagName !== 'BUTTON') { e.preventDefault(); document.getElementById('prider-run').click(); return; }
        var map = { t: 'track', a: 'accel', e: 'erase', s: 'start' };
        var t = map[e.key.toLowerCase()];
        if (t) { var btn = document.querySelector('#ppanel-rider .ptool[data-rtool="'+t+'"]'); if (btn) btn.click(); }
      });

      // ── Sled physics: circle vs. drawn-line collision ────
      var RG = 9.8 * PPM;
      var AIR_DRAG_PER_SEC = 0.06;      // fraction of speed lost per second when airborne
      var TRACK_FRICTION_PER_SEC = 0.3; // fraction of along-track speed lost per second while riding

      function closestOnSeg(px, py, x1, y1, x2, y2) {
        var dx = x2-x1, dy = y2-y1, len2 = dx*dx+dy*dy;
        var t = len2 ? Math.max(0, Math.min(1, ((px-x1)*dx+(py-y1)*dy)/len2)) : 0;
        return { x: x1+dx*t, y: y1+dy*t };
      }

      function spawnRiders() {
        var pts = startPts.length ? startPts : [{ x: 40, y: 40 }];
        riders = pts.map(function (pt, i) {
          return { x: pt.x, y: pt.y, vx: 0, vy: 0, r: 11, color: RIDER_COLORS[i % RIDER_COLORS.length], angle: 0, trail: [], offCourse: false, lastBoost: 0 };
        });
        bestSpeed = 0;
        var coach = document.getElementById('prider-coach'); if (coach) coach.classList.add('is-hidden');
      }

      function stepRiders(dt, now) {
        riders.forEach(function (rd) {
          if (rd.offCourse) return;
          rd.vy += RG * dt;
          // Exponential decay scaled to elapsed time, so drag doesn't depend
          // on how many substeps a frame happened to take.
          var airDrag = Math.pow(1 - AIR_DRAG_PER_SEC, dt);
          rd.vx *= airDrag; rd.vy *= airDrag;
          rd.x += rd.vx * dt; rd.y += rd.vy * dt;

          // Boost lines nudge speed on proximity alone, independent of track contact.
          rSegs.forEach(function (seg) {
            if (seg.type !== 'accel') return;
            var cp = closestOnSeg(rd.x, rd.y, seg.x1, seg.y1, seg.x2, seg.y2);
            if (Math.hypot(rd.x-cp.x, rd.y-cp.y) < rd.r + 10 && now - rd.lastBoost > 260) {
              var tlen = Math.hypot(seg.x2-seg.x1, seg.y2-seg.y1) || 1;
              var tx = (seg.x2-seg.x1)/tlen, ty = (seg.y2-seg.y1)/tlen;
              var sign = (rd.vx*tx+rd.vy*ty) >= 0 ? 1 : -1;
              rd.vx += tx*sign*260; rd.vy += ty*sign*260;
              rd.lastBoost = now;
              riderLiveMsg = 'Boost! v = '+(Math.hypot(rd.vx,rd.vy)/PPM).toFixed(1)+' m/s';
            }
          });

          // Resolve against only the single nearest track segment. Resolving
          // against every overlapping segment let a sled ping-pong between
          // two segments meeting at a joint (visible as jitter/snagging);
          // picking one consistent contact per step fixes that.
          var nearest = null, nearestD = Infinity, nearestCp = null;
          rSegs.forEach(function (seg) {
            if (seg.type === 'accel') return;
            var cp = closestOnSeg(rd.x, rd.y, seg.x1, seg.y1, seg.x2, seg.y2);
            var d = Math.hypot(rd.x-cp.x, rd.y-cp.y);
            if (d < nearestD) { nearestD = d; nearest = seg; nearestCp = cp; }
          });
          if (nearest && nearestD < rd.r && nearestD > 0.0001) {
            var dx = rd.x-nearestCp.x, dy = rd.y-nearestCp.y;
            var nx = dx/nearestD, ny = dy/nearestD;
            rd.x += nx*(rd.r-nearestD); rd.y += ny*(rd.r-nearestD);
            var tlen2 = Math.hypot(nearest.x2-nearest.x1, nearest.y2-nearest.y1) || 1;
            var tx2 = (nearest.x2-nearest.x1)/tlen2, ty2 = (nearest.y2-nearest.y1)/tlen2;
            var vt = rd.vx*tx2 + rd.vy*ty2;
            var vn = rd.vx*nx + rd.vy*ny;
            if (vn < 0) vn = 0;
            rd.angle = Math.atan2(ty2,tx2);
            if (Math.cos(rd.angle) < 0) rd.angle += Math.PI;
            vt *= Math.pow(1 - TRACK_FRICTION_PER_SEC, dt);
            rd.vx = vt*tx2 + vn*nx; rd.vy = vt*ty2 + vn*ny;
          }

          var v = Math.hypot(rd.vx, rd.vy) / PPM;
          if (v > bestSpeed) bestSpeed = v;
          if (rd.y > RH()+220 || rd.x < -220 || rd.x > RW()+220) rd.offCourse = true;
        });
        for (var i = 0; i < riders.length; i++) for (var j = i+1; j < riders.length; j++) {
          var a = riders[i], b = riders[j];
          if (a.offCourse || b.offCourse) continue;
          var dxc = b.x-a.x, dyc = b.y-a.y, dc = Math.hypot(dxc, dyc), min = a.r+b.r;
          if (dc >= min || dc < 0.0001) continue;
          var nxc = dxc/dc, nyc = dyc/dc, ov = min-dc;
          a.x -= nxc*ov*0.5; a.y -= nyc*ov*0.5; b.x += nxc*ov*0.5; b.y += nyc*ov*0.5;
          var dvx = a.vx-b.vx, dvy = a.vy-b.vy, dot = dvx*nxc+dvy*nyc;
          if (dot <= 0) continue;
          var imp = dot*0.5;
          a.vx -= imp*nxc; a.vy -= imp*nyc; b.vx += imp*nxc; b.vy += imp*nyc;
        }
      }

      function drawRider() {
        var W = RW(), H = RH();
        rCtx.clearRect(0, 0, W, H);
        drawGrid(rCtx, W, H);

        rStrokes.forEach(paintRStroke);
        if (curRStroke) paintRStroke(curRStroke);

        startPts.forEach(function (pt, i) {
          rCtx.save();
          rCtx.fillStyle = RIDER_COLORS[i % RIDER_COLORS.length];
          rCtx.beginPath(); rCtx.arc(pt.x, pt.y, 7, 0, Math.PI*2); rCtx.fill();
          rCtx.strokeStyle = 'rgba(255,255,255,0.9)'; rCtx.lineWidth = 2; rCtx.stroke();
          rCtx.fillStyle = '#24364b'; rCtx.font = 'bold 9px monospace'; rCtx.textAlign = 'center';
          rCtx.fillText('S'+(i+1), pt.x, pt.y-12);
          rCtx.restore();
        });

        riders.forEach(function (rd) {
          {
            var last = rd.trail[rd.trail.length-1];
            if (!last || Math.hypot(rd.x-last.x, rd.y-last.y) > 3) { rd.trail.push({x:rd.x,y:rd.y}); if (rd.trail.length>50) rd.trail.shift(); }
            if (rd.trail.length > 1) {
              rCtx.save(); rCtx.strokeStyle = rd.color; rCtx.globalAlpha = rd.offCourse ? 0.12 : 0.3; rCtx.lineWidth = 2;
              rCtx.beginPath();
              rd.trail.forEach(function (pt,i) { i?rCtx.lineTo(pt.x,pt.y):rCtx.moveTo(pt.x,pt.y); });
              rCtx.stroke(); rCtx.restore();
            }
          }
          if (rd.offCourse) return;
          rCtx.save();
          rCtx.globalAlpha = 1;
          rCtx.translate(rd.x, rd.y); rCtx.rotate(rd.angle);
          rCtx.strokeStyle = '#24364b'; rCtx.lineWidth = 2.5; rCtx.lineCap = 'round';
          rCtx.beginPath(); rCtx.moveTo(-14,8); rCtx.lineTo(11,8); rCtx.quadraticCurveTo(18,8,18,2); rCtx.stroke();
          rCtx.strokeStyle = rd.color; rCtx.lineWidth = 4;
          rCtx.beginPath(); rCtx.moveTo(-6,-8); rCtx.lineTo(-2,1); rCtx.lineTo(9,1); rCtx.lineTo(12,6);
          rCtx.moveTo(-5,-6); rCtx.lineTo(5,-3); rCtx.lineTo(11,-4); rCtx.stroke();
          rCtx.fillStyle = rd.color; rCtx.beginPath(); rCtx.arc(-7,-15,5,0,Math.PI*2); rCtx.fill();
          rCtx.beginPath(); rCtx.moveTo(-10,-9); rCtx.lineTo(-22,-6-Math.sin(rd.x/12)*3); rCtx.stroke();
          rCtx.restore();
        });

        var count = document.getElementById('prider-count');
        var best = document.getElementById('prider-best');
        var ro = document.getElementById('prider-readout');
        var onCourse = riders.filter(function (rd) { return !rd.offCourse; }).length;
        if (count) count.textContent = (riderRunning ? onCourse : startPts.length) + ' ' + (riderRunning ? 'racing' : 'riders');
        if (best) best.textContent = 'best ' + bestSpeed.toFixed(1) + ' m/s';
        var message = riderLiveMsg || (riderRunning ? 'Racing — watch the slope accelerate each sled' : (startPts.length ? 'Ready — press Run' : 'Draw a course, then drop a start point'));
        if (ro && ro.textContent !== message) ro.textContent = message;
      }
      function paintRStroke(s) {
        rCtx.save();
        rCtx.lineCap = 'round'; rCtx.lineJoin = 'round';
        if (s.type === 'accel') {
          rCtx.strokeStyle = '#f59e0b'; rCtx.lineWidth = 5; rCtx.setLineDash([10,6]);
        } else {
          rCtx.strokeStyle = '#1f2937'; rCtx.lineWidth = 4; rCtx.setLineDash([]);
        }
        rCtx.beginPath();
        s.pts.forEach(function (p, i) { i ? rCtx.lineTo(p.x, p.y) : rCtx.moveTo(p.x, p.y); });
        rCtx.stroke();
        rCtx.restore();
      }

      function riderLoop(ts) {
        if (!riderLastT) riderLastT = ts;
        var dt = Math.min((ts-riderLastT)/1000, 0.05); riderLastT = ts;
        if (riderRunning && !document.hidden && !document.getElementById('tabpanel-sandbox').hidden) {
          var maxV = riders.reduce(function(v,rd) { return Math.max(v,Math.hypot(rd.vx,rd.vy)); },0);
          var steps = Math.max(3, Math.ceil(maxV*dt/4));
          for (var s = 0; s < steps; s++) stepRiders(dt/steps, ts);
          if (riders.length && riders.every(function(rd) { return rd.offCourse; })) {
            riderRunning = false; riderLiveMsg = 'Ride complete — press Replay or edit your track.'; setRiderRunLabel();
          }
        }
        drawRider();
        riderRafId = requestAnimationFrame(riderLoop);
      }
      function startRider() { if (!riderRafId) { riderLastT = null; riderRafId = requestAnimationFrame(riderLoop); } }
      function stopRider()  { if (riderRafId)  { cancelAnimationFrame(riderRafId); riderRafId = null; riderLastT = null; } }

      function setRiderRunLabel() {
        var btn = document.getElementById('prider-run');
        if (btn) { btn.textContent = riderRunning ? '⏸ Pause' : (riders.length && riders.every(function(rd) { return rd.offCourse; }) ? '▶ Replay' : (riders.length ? '▶ Resume' : '▶ Run')); btn.setAttribute('aria-pressed',String(riderRunning)); }
      }
      document.getElementById('prider-run') && document.getElementById('prider-run').addEventListener('click', function () {
        if (!rSegs.length) { riderLiveMsg = 'Draw a track or load the starter course first.'; drawRider(); return; }
        if (!riders.length || riders.every(function(rd) { return rd.offCourse; })) spawnRiders();
        riderRunning = !riderRunning;
        riderLiveMsg = riderRunning ? '' : 'Paused — press Resume to continue.';
        setRiderRunLabel();
      });
      document.getElementById('prider-reset') && document.getElementById('prider-reset').addEventListener('click', function () {
        resetRide();
        setRiderRunLabel();
        drawRider();
      });

      document.getElementById('prider-demo').addEventListener('click', function() {
        rememberCourse(); resetRide();
        var w = RW(), h = RH(), pts = [];
        for (var i=0; i<=100; i++) {
          var t=i/100;
          pts.push({x:w*(.07+.86*t), y:h*(.28+.42*Math.sin(t*Math.PI*.85))});
        }
        rStrokes = [{type:'track',pts:pts}];
        startPts = [{x:pts[2].x,y:pts[2].y-32}];
        rebuildSegs(); updateRiderUi(); drawRider();
      });
      document.getElementById('ptab-rider') && document.getElementById('ptab-rider').addEventListener('click', function () { stopPhys(); resizeR(); startRider(); });
    }

    window.addEventListener('resize', function () {
      if (document.getElementById('ppanel-draw').classList.contains('is-active')) resizeD();
      else if (document.getElementById('ppanel-rider') && document.getElementById('ppanel-rider').classList.contains('is-active')) resizeR();
      else resizeP();
    });

    if (document.getElementById('ppanel-phys').classList.contains('is-active')) { resizeP(); startPhys(); }
    else resizeD();
    updateDrawUi();
  })();
  
