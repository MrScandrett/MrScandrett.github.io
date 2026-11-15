(function () {
  'use strict';

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ══════════════════════════════════════════
     STATE — four fixtures
  ══════════════════════════════════════════ */
  const FIXTURES = [
    { id: 'front', ico: '⬇️', name: 'Front',  r: 255, g: 180, b: 80,  int: 80, on: true },
    { id: 'sideL', ico: '➡️', name: 'Side L', r: 80,  g: 120, b: 255, int: 0,  on: false },
    { id: 'sideR', ico: '⬅️', name: 'Side R', r: 255, g: 80,  b: 160, int: 0,  on: false },
    { id: 'back',  ico: '⬆️', name: 'Back',   r: 120, g: 80,  b: 255, int: 0,  on: false },
  ];
  let selected = 0;

  /* Render state = what's on stage right now (fades happen here) */
  const live = FIXTURES.map(function (f) { return { r: f.r, g: f.g, b: f.b, amt: f.on ? f.int / 100 : 0 }; });

  const PRESETS = [
    { name: 'Warm Amber',   set: [[255,170,60,85,1],[255,190,90,35,1],[255,150,60,35,1],[255,200,120,25,1]] },
    { name: 'Cool Night',   set: [[70,110,230,45,1],[60,90,220,55,1],[90,110,240,40,1],[80,90,255,60,1]] },
    { name: 'Neutral White',set: [[255,240,220,80,1],[240,240,255,30,1],[240,240,255,30,1],[255,255,255,35,1]] },
    { name: 'Revolution',   set: [[255,60,30,90,1],[255,90,30,60,1],[200,40,40,60,1],[255,60,60,80,1]] },
    { name: 'Candy Pop',    set: [[255,80,200,80,1],[80,255,180,60,1],[255,200,60,60,1],[140,80,255,85,1]] },
    { name: 'Moonlight',    set: [[120,150,255,25,1],[100,130,240,45,1],[0,0,0,0,0],[150,170,255,55,1]] },
    { name: 'Silhouette',   set: [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[255,140,60,95,1]] },
    { name: 'Blackout',     set: [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]] },
  ];

  /* ══════════════════════════════════════════
     FIXTURE UI
  ══════════════════════════════════════════ */
  const fixtureRow = document.getElementById('fixture-row');
  FIXTURES.forEach(function (f, i) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fx-btn' + (i === 0 ? ' active' : '');
    btn.setAttribute('aria-label', f.name + ' light');
    btn.innerHTML = '<span class="fx-ico">' + f.ico + '</span>' + f.name +
      '<span class="fx-swatch"></span><span class="fx-onoff"></span>';
    btn.addEventListener('click', function () { selectFixture(i); });
    fixtureRow.appendChild(btn);
  });

  const sR = document.getElementById('s-r'), sG = document.getElementById('s-g'), sB = document.getElementById('s-b'), sInt = document.getElementById('s-int');
  const onoffBtn = document.getElementById('onoff-btn');
  const fadeSlider = document.getElementById('s-fade');
  const fadeOutput = document.getElementById('v-fade');
  let fadeMs = parseFloat(fadeSlider.value) * 1000;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  fadeSlider.addEventListener('input', function () {
    fadeMs = parseFloat(fadeSlider.value) * 1000;
    fadeOutput.textContent = (fadeMs / 1000).toFixed(1) + ' s';
  });

  function selectFixture(i) {
    selected = i;
    fixtureRow.querySelectorAll('.fx-btn').forEach(function (b, j) { b.classList.toggle('active', j === i); });
    const f = FIXTURES[i];
    sR.value = f.r; sG.value = f.g; sB.value = f.b; sInt.value = f.int;
    syncUI();
  }

  function describeColor(r, g, b) {
    if (r + g + b < 40) return '<strong>Blackout.</strong> No light at all — the boldest cue in theatre.';
    const mx = Math.max(r, g, b);
    if (r > 200 && g > 200 && b > 200) return '<strong>White light.</strong> All three colors at full — clean, neutral, honest.';
    if (r === mx && g > r * 0.55 && b < r * 0.5) return '<strong>Warm amber.</strong> High red, medium green, low blue — the classic "warm" stage wash.';
    if (b === mx && r < b * 0.7) return '<strong>Cool blue.</strong> Night, moonlight, melancholy — the definitive "cool" stage color.';
    if (r === mx && b > r * 0.6 && g < r * 0.6) return '<strong>Magenta.</strong> Red + blue — theatrical, showbiz, unnatural on purpose.';
    if (g === mx && b > g * 0.6 && r < g * 0.6) return '<strong>Cyan.</strong> Green + blue — underwater, eerie, cold machinery.';
    if (r > 180 && g > 130 && b < 100) return '<strong>Yellow-gold.</strong> Red + green light adds up to yellow — sunshine and optimism.';
    if (g === mx) return '<strong>Green.</strong> Nature, sickness, or something supernatural — context decides.';
    if (r === mx) return '<strong>Red.</strong> Danger, passion, revolution — the strongest emotional color on stage.';
    return '<strong>Custom mix.</strong> Watch how it lands on the performer — the stage is the only judge that matters.';
  }

  function syncUI() {
    const f = FIXTURES[selected];
    document.getElementById('v-r').textContent = f.r;
    document.getElementById('v-g').textContent = f.g;
    document.getElementById('v-b').textContent = f.b;
    document.getElementById('v-int').textContent = f.int + '%';
    onoffBtn.textContent = f.on ? 'Turn Fixture Off' : 'Turn Fixture On';
    onoffBtn.classList.toggle('on', f.on);
    document.getElementById('mix-chip').style.background = 'rgb(' + f.r + ',' + f.g + ',' + f.b + ')';
    document.getElementById('mix-text').innerHTML = describeColor(f.r, f.g, f.b);
    fixtureRow.querySelectorAll('.fx-btn').forEach(function (b, j) {
      const ff = FIXTURES[j];
      b.querySelector('.fx-swatch').style.background = ff.on ? 'rgb(' + ff.r + ',' + ff.g + ',' + ff.b + ')' : '#26222e';
      b.querySelector('.fx-onoff').textContent = ff.on ? ff.int + '%' : 'OFF';
    });
    updateDesignRead();
  }

  function fixtureIsLive(i) { return FIXTURES[i].on && FIXTURES[i].int > 0; }

  function updateDesignRead() {
    const front = fixtureIsLive(0), left = fixtureIsLive(1), right = fixtureIsLive(2), back = fixtureIsLive(3);
    const total = FIXTURES.reduce(function (sum, f) { return sum + (f.on ? f.int : 0); }, 0);
    let effect;
    if (!total) effect = '<strong>Blackout:</strong> the audience sees no performer. A blackout is a deliberate punctuation mark, not an absence of design.';
    else if (back && !front && !left && !right) effect = '<strong>Silhouette:</strong> the back light separates the body from the scenery, but hides facial expression.';
    else if (front && !left && !right && !back) effect = '<strong>Readable, but flat:</strong> front light makes the face visible. Add side or back light to give the body depth.';
    else if ((left || right) && !front) effect = '<strong>Sculpted mystery:</strong> side light reveals shape and movement while keeping the face less readable.';
    else if (back && front) effect = '<strong>Separation:</strong> front light keeps the face readable; back light lifts the performer away from the backdrop.';
    else effect = '<strong>Layered stage picture:</strong> compare each fixture one at a time. Every added direction should have a storytelling reason.';
    document.getElementById('design-read').innerHTML = effect;
    const active = [];
    if (front) active.push('front'); if (left) active.push('left side'); if (right) active.push('right side'); if (back) active.push('back');
    document.getElementById('stage-readout').innerHTML = '<strong>Active directions:</strong> ' + (active.length ? active.join(', ') : 'none') + '. ' + (total > 200 ? 'High-energy look.' : total > 0 ? 'Low-level look.' : 'Blackout.');
    canvas.setAttribute('aria-label', 'Virtual stage. Active lights: ' + (active.length ? active.join(', ') : 'none') + '. ' + document.getElementById('design-read').textContent);
  }

  function onSlider() {
    const f = FIXTURES[selected];
    f.r = parseInt(sR.value, 10); f.g = parseInt(sG.value, 10); f.b = parseInt(sB.value, 10);
    f.int = parseInt(sInt.value, 10);
    if (!f.on && (f.int > 0)) f.on = true;
    cancelFade();
    syncUI();
  }
  [sR, sG, sB, sInt].forEach(function (s) { s.addEventListener('input', onSlider); });

  onoffBtn.addEventListener('click', function () {
    const f = FIXTURES[selected];
    f.on = !f.on;
    cancelFade();
    syncUI();
  });

  /* Presets */
  const presetGrid = document.getElementById('preset-grid');
  PRESETS.forEach(function (p) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn';
    const c = p.set[0];
    const dotColor = (c[4] && c[3] > 0) ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')' : (p.name === 'Silhouette' ? 'rgb(255,140,60)' : '#16131e');
    btn.innerHTML = '<span class="preset-dot" style="background:' + dotColor + '"></span>' + p.name;
    btn.addEventListener('click', function () {
      p.set.forEach(function (v, i) {
        FIXTURES[i].r = v[0]; FIXTURES[i].g = v[1]; FIXTURES[i].b = v[2];
        FIXTURES[i].int = v[3]; FIXTURES[i].on = !!v[4];
      });
      cancelFade();
      selectFixture(selected);
      document.getElementById('look-badge').textContent = '🎭 ' + p.name;
    });
    presetGrid.appendChild(btn);
  });

  /* ══════════════════════════════════════════
     CUE STACK
  ══════════════════════════════════════════ */
  let cues = [], liveCue = -1, standbyCue = -1, fadeRAF = null;
  const cueList = document.getElementById('cue-list');
  const cueGo = document.getElementById('cue-go');
  const cueStatus = document.getElementById('cue-status');
  const CUE_KEY = 'classroomos-lighting-lab-cues-v1';
  const SHEET_KEY = 'classroomos-theatre-cue-sheet-v1';

  function snapshot() {
    return FIXTURES.map(function (f) { return { r: f.r, g: f.g, b: f.b, int: f.int, on: f.on }; });
  }

  /* Cues keep a stable LX number (deleting LX 2 never renumbers LX 3, as on a real console)
     and their own fade time, captured from the slider when the cue is saved. */
  function validCue(c) {
    return c && typeof c.name === 'string' && Number.isInteger(c.lx) && c.lx > 0 && Number.isFinite(c.fade) &&
      Array.isArray(c.snap) && c.snap.length === FIXTURES.length &&
      c.snap.every(function (s) { return s && [s.r, s.g, s.b, s.int].every(Number.isFinite); });
  }
  try {
    const saved = JSON.parse(localStorage.getItem(CUE_KEY));
    if (Array.isArray(saved) && saved.length <= 99 && saved.every(validCue)) cues = saved;
    if (cues.length) standbyCue = 0;
  } catch (e) { /* no storage: cues last for this visit */ }
  function persist() {
    try { localStorage.setItem(CUE_KEY, JSON.stringify(cues)); } catch (e) { /* ignore */ }
  }
  function nextLx() {
    return cues.reduce(function (m, c) { return Math.max(m, c.lx); }, 0) + 1;
  }

  document.getElementById('cue-save').addEventListener('click', function () {
    const lx = nextLx();
    cues.push({ lx: lx, name: 'Look ' + lx, fade: fadeMs / 1000, snap: snapshot() });
    if (standbyCue < 0) standbyCue = cues.length - 1;
    renderCues();
  });

  function renderCues() {
    persist();
    cueList.innerHTML = '';
    document.getElementById('cue-send').disabled = !cues.length;
    if (!cues.length) {
      cueList.innerHTML = '<div class="cue-empty">No cues yet. Design a look above, then save it. Save two or more and the GO button will fade between them — exactly how a real show runs.</div>';
      cueGo.disabled = true;
      cueStatus.textContent = '';
      return;
    }
    cues.forEach(function (cue, i) {
      const item = document.createElement('div');
      item.className = 'cue-item' + (i === liveCue ? ' live' : (i === standbyCue ? ' standby' : ''));
      const chips = cue.snap.map(function (s) {
        const col = s.on && s.int > 0 ? 'rgb(' + s.r + ',' + s.g + ',' + s.b + ')' : '#16131e';
        return '<span class="cue-chip" style="background:' + col + '"></span>';
      }).join('');
      item.innerHTML = '<span class="cue-num">' + (i === liveCue ? '● ' : (i === standbyCue ? '▸ ' : '')) + 'LX ' + cue.lx + '</span>' +
        '<span class="cue-chips">' + chips + '</span>';
      const nameInput = document.createElement('input');
      nameInput.className = 'cue-name-input';
      nameInput.value = cue.name;
      nameInput.setAttribute('aria-label', 'LX ' + cue.lx + ' name');
      nameInput.addEventListener('change', function () { cue.name = nameInput.value || ('Look ' + cue.lx); persist(); });
      nameInput.addEventListener('click', function (e) { e.stopPropagation(); });
      item.appendChild(nameInput);
      const fade = document.createElement('input');
      fade.className = 'cue-fade-input';
      fade.type = 'number'; fade.min = '0'; fade.max = '30'; fade.step = '0.5';
      fade.value = cue.fade;
      fade.title = 'Fade time in seconds';
      fade.setAttribute('aria-label', 'LX ' + cue.lx + ' fade time in seconds');
      fade.addEventListener('change', function () {
        const v = parseFloat(fade.value);
        cue.fade = Number.isFinite(v) ? Math.max(0, Math.min(30, v)) : cue.fade;
        fade.value = cue.fade; persist();
      });
      fade.addEventListener('click', function (e) { e.stopPropagation(); });
      item.appendChild(fade);
      const del = document.createElement('button');
      del.className = 'cue-del';
      del.type = 'button';
      del.setAttribute('aria-label', 'Delete LX ' + cue.lx);
      del.textContent = '✕';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        cues.splice(i, 1);
        if (liveCue === i) liveCue = -1; else if (liveCue > i) liveCue -= 1;
        if (standbyCue >= cues.length) standbyCue = cues.length ? 0 : -1;
        renderCues();
      });
      item.appendChild(del);
      item.addEventListener('click', function () { standbyCue = i; renderCues(); });
      cueList.appendChild(item);
    });
    cueGo.disabled = standbyCue < 0;
    cueStatus.textContent = standbyCue >= 0
      ? 'Standby LX ' + cues[standbyCue].lx + ' "' + cues[standbyCue].name + '" (' + cues[standbyCue].fade + ' s). Press GO to fade into it. Click any cue to set it as next.'
      : '';
  }

  cueGo.addEventListener('click', function () {
    if (standbyCue < 0 || !cues[standbyCue]) return;
    const target = cues[standbyCue];
    fadeTo(target.snap, reduceMotion ? 0 : target.fade * 1000);
    document.getElementById('look-badge').textContent = '🎬 LX ' + target.lx + ' · ' + target.name;
    liveCue = standbyCue;
    standbyCue = (standbyCue + 1) % cues.length;
    renderCues();
  });

  /* Hand the cue stack to the Theatre Cue Sheets worksheet (same browser, its own storage key). */
  function plainColor(s) {
    return describeColor(s.r, s.g, s.b).replace(/^<strong>([^<]*?)\.?<\/strong>.*$/, '$1');
  }
  function cueAction(cue) {
    const parts = cue.snap.map(function (s, i) {
      return s.on && s.int > 0 ? FIXTURES[i].name + ' ' + plainColor(s).toLowerCase() + ' ' + s.int + '%' : null;
    }).filter(Boolean);
    return cue.name + ': ' + (parts.length ? parts.join(', ') : 'blackout') + '. Fade ' + cue.fade + ' s.';
  }
  document.getElementById('cue-send').addEventListener('click', function () {
    const msg = document.getElementById('cue-send-status');
    const blankRow = function () { return { id: '', department: 'Audio', location: '', owner: '', standby: '', trigger: '', action: '', notes: '' }; };
    const isBlank = function (c) { return ['id', 'location', 'owner', 'standby', 'trigger', 'action', 'notes'].every(function (f) { return !String(c[f] || '').trim(); }); };
    let sheet;
    try { sheet = JSON.parse(localStorage.getItem(SHEET_KEY)); } catch (e) { sheet = null; }
    if (!sheet || sheet.version !== 1 || !Array.isArray(sheet.cues)) sheet = { version: 1, meta: {}, notes: '', cues: [] };
    sheet.cues = sheet.cues.filter(function (c) { return c && !isBlank(c); });
    let added = 0, updated = 0;
    cues.forEach(function (cue) {
      const id = 'LX ' + cue.lx;
      const row = sheet.cues.find(function (c) { return String(c.id).trim().toUpperCase() === id; });
      if (row) { row.action = cueAction(cue); row.department = 'Lighting'; updated++; return; }
      const r = blankRow();
      r.id = id; r.department = 'Lighting'; r.owner = 'Lighting op'; r.action = cueAction(cue);
      r.notes = 'From the Stage Lighting Lab. Add the standby and exact GO trigger from your script.';
      sheet.cues.push(r); added++;
    });
    if (sheet.cues.length > 300) { msg.textContent = 'Your cue sheet is full (300 rows). Remove some cues there first.'; return; }
    try {
      localStorage.setItem(SHEET_KEY, JSON.stringify(sheet));
      msg.innerHTML = '';
      msg.append(document.createTextNode((added ? added + ' added' : '') + (added && updated ? ', ' : '') + (updated ? updated + ' updated' : '') + ' on your cue sheet. '));
      const a = document.createElement('a'); a.href = 'theatre-cue-sheets.html#builder'; a.textContent = 'Open the cue sheet →';
      msg.appendChild(a);
    } catch (e) {
      msg.textContent = 'This browser cannot save, so the cues could not be sent. Copy them into your cue sheet by hand.';
    }
  });

  /* ══════════════════════════════════════════
     FADE ENGINE
  ══════════════════════════════════════════ */
  function cancelFade() { if (fadeRAF) { cancelAnimationFrame(fadeRAF); fadeRAF = null; } }

  function fadeTo(snap, ms) {
    cancelFade();
    const from = live.map(function (l) { return { r: l.r, g: l.g, b: l.b, amt: l.amt }; });
    const to = snap.map(function (s) { return { r: s.r, g: s.g, b: s.b, amt: s.on ? s.int / 100 : 0 }; });
    const start = performance.now();
    /* the console state jumps to the cue immediately; the STAGE fades */
    snap.forEach(function (s, i) {
      FIXTURES[i].r = s.r; FIXTURES[i].g = s.g; FIXTURES[i].b = s.b;
      FIXTURES[i].int = s.int; FIXTURES[i].on = s.on;
    });
    selectFixture(selected);
    if (ms <= 0) {
      live.forEach(function (l, i) { l.r = to[i].r; l.g = to[i].g; l.b = to[i].b; l.amt = to[i].amt; });
      return;
    }
    function step(now) {
      const t = clamp((now - start) / ms, 0, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      live.forEach(function (l, i) {
        l.r = lerp(from[i].r, to[i].r, e);
        l.g = lerp(from[i].g, to[i].g, e);
        l.b = lerp(from[i].b, to[i].b, e);
        l.amt = lerp(from[i].amt, to[i].amt, e);
      });
      if (t < 1) fadeRAF = requestAnimationFrame(step);
      else fadeRAF = null;
    }
    fadeRAF = requestAnimationFrame(step);
  }

  /* When not fading, live state tracks the console directly */
  function trackConsole() {
    if (fadeRAF) return;
    FIXTURES.forEach(function (f, i) {
      live[i].r = f.r; live[i].g = f.g; live[i].b = f.b;
      live[i].amt = f.on ? f.int / 100 : 0;
    });
  }

  /* ══════════════════════════════════════════
     STAGE RENDER
  ══════════════════════════════════════════ */
  const canvas = document.getElementById('lx-canvas');
  const outer = document.getElementById('lx-outer');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    W = outer.clientWidth; H = outer.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  SimKit.frame('#lx-canvas', resize);

  function rgba(l, a) { return 'rgba(' + Math.round(l.r) + ',' + Math.round(l.g) + ',' + Math.round(l.b) + ',' + a + ')'; }

  function performerPath(cx, baseY, s) {
    /* simple standing figure: head, torso, arms slightly out, legs */
    ctx.beginPath();
    ctx.arc(cx, baseY - s * 2.55, s * 0.34, 0, Math.PI * 2);            /* head */
    ctx.moveTo(cx - s * 0.3, baseY - s * 2.1);
    ctx.quadraticCurveTo(cx - s * 0.42, baseY - s * 1.2, cx - s * 0.3, baseY - s * 1.05); /* torso L */
    ctx.lineTo(cx - s * 0.42, baseY);                                    /* leg L */
    ctx.lineTo(cx - s * 0.18, baseY);
    ctx.lineTo(cx - s * 0.05, baseY - s * 0.95);
    ctx.lineTo(cx + s * 0.05, baseY - s * 0.95);
    ctx.lineTo(cx + s * 0.18, baseY);
    ctx.lineTo(cx + s * 0.42, baseY);                                    /* leg R */
    ctx.lineTo(cx + s * 0.3, baseY - s * 1.05);
    ctx.quadraticCurveTo(cx + s * 0.42, baseY - s * 1.2, cx + s * 0.3, baseY - s * 2.1); /* torso R */
    ctx.closePath();
    /* arms */
    ctx.moveTo(cx - s * 0.28, baseY - s * 2.0);
    ctx.lineTo(cx - s * 0.62, baseY - s * 1.35);
    ctx.lineTo(cx - s * 0.5, baseY - s * 1.28);
    ctx.lineTo(cx - s * 0.26, baseY - s * 1.75);
    ctx.closePath();
    ctx.moveTo(cx + s * 0.28, baseY - s * 2.0);
    ctx.lineTo(cx + s * 0.62, baseY - s * 1.35);
    ctx.lineTo(cx + s * 0.5, baseY - s * 1.28);
    ctx.lineTo(cx + s * 0.26, baseY - s * 1.75);
    ctx.closePath();
  }

  function draw() {
    SimKit.frame('#lx-canvas', draw);
    if (!W || !H) return;
    trackConsole();

    const F = live[0], SL = live[1], SR = live[2], B = live[3];
    const floorY = H * 0.86;
    const cx = W * 0.5;
    const s = H * 0.19;

    /* base darkness */
    ctx.fillStyle = '#040309';
    ctx.fillRect(0, 0, W, H);

    /* backdrop wash = additive blend of all fixtures, weighted */
    ctx.globalCompositeOperation = 'lighter';

    /* back light floods the backdrop */
    if (B.amt > 0.01) {
      const g = ctx.createRadialGradient(cx, H * 0.3, 10, cx, H * 0.35, W * 0.62);
      g.addColorStop(0, rgba(B, 0.55 * B.amt));
      g.addColorStop(1, rgba(B, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, floorY);
    }
    /* front wash lights backdrop + floor gently */
    if (F.amt > 0.01) {
      const g = ctx.createLinearGradient(0, H * 0.1, 0, floorY);
      g.addColorStop(0, rgba(F, 0.10 * F.amt));
      g.addColorStop(1, rgba(F, 0.30 * F.amt));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, floorY);
    }
    /* side beams — visible cones from the wings */
    if (SL.amt > 0.01) {
      const g = ctx.createLinearGradient(0, 0, W * 0.62, 0);
      g.addColorStop(0, rgba(SL, 0.5 * SL.amt));
      g.addColorStop(1, rgba(SL, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.32);
      ctx.lineTo(W * 0.62, floorY - s * 1.6);
      ctx.lineTo(W * 0.62, floorY);
      ctx.lineTo(0, floorY);
      ctx.closePath(); ctx.fill();
    }
    if (SR.amt > 0.01) {
      const g = ctx.createLinearGradient(W, 0, W * 0.38, 0);
      g.addColorStop(0, rgba(SR, 0.5 * SR.amt));
      g.addColorStop(1, rgba(SR, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(W, H * 0.32);
      ctx.lineTo(W * 0.38, floorY - s * 1.6);
      ctx.lineTo(W * 0.38, floorY);
      ctx.lineTo(W, floorY);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    /* stage floor */
    const floorG = ctx.createLinearGradient(0, floorY, 0, H);
    floorG.addColorStop(0, '#100d16');
    floorG.addColorStop(1, '#060509');
    ctx.fillStyle = floorG;
    ctx.fillRect(0, floorY, W, H - floorY);
    /* floor color reflections */
    ctx.globalCompositeOperation = 'lighter';
    [F, SL, SR, B].forEach(function (l) {
      if (l.amt < 0.01) return;
      const g = ctx.createLinearGradient(0, floorY, 0, H);
      g.addColorStop(0, rgba(l, 0.13 * l.amt));
      g.addColorStop(1, rgba(l, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, floorY, W, H - floorY);
    });
    ctx.globalCompositeOperation = 'source-over';

    /* back-light halo behind performer */
    if (B.amt > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, floorY - s * 1.5, s * 0.2, cx, floorY - s * 1.5, s * 1.7);
      g.addColorStop(0, rgba(B, 0.65 * B.amt));
      g.addColorStop(1, rgba(B, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, floorY - s * 1.5, s * 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    /* performer body: base color = front light; sides add rims */
    const bodyR = F.r * F.amt * 0.85, bodyG = F.g * F.amt * 0.85, bodyB = F.b * F.amt * 0.85;
    performerPath(cx, floorY, s);
    ctx.fillStyle = 'rgb(' + Math.round(clamp(bodyR + 8, 6, 255)) + ',' + Math.round(clamp(bodyG + 7, 5, 255)) + ',' + Math.round(clamp(bodyB + 10, 8, 255)) + ')';
    ctx.fill();

    /* side-light sculpting: clip to performer, paint gradient rims */
    ctx.save();
    performerPath(cx, floorY, s);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    if (SL.amt > 0.01) {
      const g = ctx.createLinearGradient(cx - s * 0.65, 0, cx + s * 0.2, 0);
      g.addColorStop(0, rgba(SL, 0.95 * SL.amt));
      g.addColorStop(1, rgba(SL, 0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - s, floorY - s * 3.1, s * 2, s * 3.2);
    }
    if (SR.amt > 0.01) {
      const g = ctx.createLinearGradient(cx + s * 0.65, 0, cx - s * 0.2, 0);
      g.addColorStop(0, rgba(SR, 0.95 * SR.amt));
      g.addColorStop(1, rgba(SR, 0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - s, floorY - s * 3.1, s * 2, s * 3.2);
    }
    /* back light rim along the top/edges */
    if (B.amt > 0.01) {
      const g = ctx.createLinearGradient(0, floorY - s * 3.0, 0, floorY - s * 1.2);
      g.addColorStop(0, rgba(B, 0.5 * B.amt));
      g.addColorStop(1, rgba(B, 0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - s, floorY - s * 3.1, s * 2, s * 2);
    }
    ctx.restore();

    /* performer shadow */
    const totalAmt = F.amt + SL.amt + SR.amt + B.amt;
    if (totalAmt > 0.02) {
      ctx.fillStyle = 'rgba(0,0,0,' + clamp(0.5 * totalAmt, 0, 0.55) + ')';
      ctx.beginPath();
      ctx.ellipse(cx, floorY + 6, s * 0.75, s * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    /* light bar fixtures (drawn last, always visible) */
    drawBar(cx - W * 0.28, H * 0.055, W * 0.56, F, '⬇ FRONT BAR');
    drawSideFixture(14, H * 0.36, SL, false);
    drawSideFixture(W - 14, H * 0.36, SR, true);

    /* proscenium vignette */
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  function drawBar(x, y, w, l, label) {
    ctx.fillStyle = '#1a1722';
    ctx.strokeStyle = 'rgba(160,140,200,0.3)';
    ctx.lineWidth = 1;
    roundRect(x, y, w, 10, 5); ctx.fill(); ctx.stroke();
    const n = 8;
    for (let i = 0; i < n; i++) {
      const lx = x + (w / n) * (i + 0.5);
      ctx.beginPath(); ctx.arc(lx, y + 5, 3, 0, Math.PI * 2);
      ctx.fillStyle = l.amt > 0.01 ? rgba(l, clamp(0.3 + l.amt * 0.7, 0, 1)) : '#0c0a12';
      ctx.fill();
      if (l.amt > 0.05) {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(lx, y + 5, 1, lx, y + 5, 9);
        g.addColorStop(0, rgba(l, 0.5 * l.amt)); g.addColorStop(1, rgba(l, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(lx, y + 5, 9, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }

  function drawSideFixture(x, y, l, flip) {
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.fillStyle = '#1a1722';
    ctx.strokeStyle = 'rgba(160,140,200,0.3)';
    roundRect(-4, -16, 12, 32, 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(6, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = l.amt > 0.01 ? rgba(l, clamp(0.3 + l.amt * 0.7, 0, 1)) : '#0c0a12';
    ctx.fill();
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  SimKit.frame('#lx-canvas', draw);

  /* init */
  selectFixture(0);
  renderCues();
})();
