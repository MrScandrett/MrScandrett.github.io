/* Joining Parts lesson: cantilever snap-fit lab, joint chooser, 20-cycle test record.
   Snap-fit maths: rectangular arm of constant thickness (Covestro "Snap-Fit Joints for
   Plastics", Table 1, design 1):  strain at the root  ε = 1.5 · t · y / L²,
   deflection force P = b·t²·E·ε / (6·L), mating force W = P·(μ + tan α)/(1 − μ·tan α). */
(function () {
  'use strict';

  /* Allowable strain (%) for ONE snap, by print orientation. How each number was made is
     explained on the page ("Where the safe-strain numbers come from"). */
  var MATERIALS = {
    pla:  { name: 'PLA',  E: 2300, flat: 2.0,  upright: 1.0,
            fail: 'PLA barely bends before it breaks: expect a crack at the root, not a bend.' },
    petg: { name: 'PETG', E: 1500, flat: 3.6,  upright: 1.4,
            fail: 'PETG will usually whiten (stress-whitening) and keep a permanent bend before it cracks.' },
    pp:   { name: 'PP',   E: 250,  flat: 10.0, upright: 9.0,
            fail: 'Even PP takes a permanent set at this strain, and the simple beam formula is no longer accurate.' }
  };
  var REPEAT_FACTOR = 0.6;  // Covestro: frequent separation → about 60 % of the single-snap value
  var MU = 0.3;             // friction coefficient assumed for plastic on plastic
  var LOCK_ANGLE = Math.atan(1 / MU) * 180 / Math.PI; // ≈ 73.3°: steeper return faces self-lock

  var PRESETS = {
    lid:     { mat: 'pla',  orient: 'flat',    use: 'once',   L: 15, t: 1.5, y: 1.0, b: 6, lead: 30, ret: 90 },
    stubby:  { mat: 'pla',  orient: 'flat',    use: 'once',   L: 6,  t: 2.0, y: 1.0, b: 6, lead: 30, ret: 90 },
    upright: { mat: 'pla',  orient: 'upright', use: 'once',   L: 15, t: 1.5, y: 1.2, b: 6, lead: 30, ret: 90 },
    clip:    { mat: 'petg', orient: 'flat',    use: 'repeat', L: 12, t: 1.6, y: 1.2, b: 8, lead: 30, ret: 45 }
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function fmt(n, d) { return Number(n).toFixed(d == null ? 1 : d); }

  /* ── Pure maths (also exported for tests / console checks) ───────── */
  function analyse(p) {
    var mat = MATERIALS[p.mat];
    var eps = 1.5 * p.t * p.y / (p.L * p.L);          // fraction
    var allow = (p.orient === 'upright' ? mat.upright : mat.flat) * (p.use === 'repeat' ? REPEAT_FACTOR : 1); // %
    var epsPct = eps * 100;
    var ratio = epsPct / allow;
    var P = p.b * p.t * p.t * mat.E * eps / (6 * p.L); // N (mm, MPa)
    var tl = Math.tan(p.lead * Math.PI / 180);
    var tr = Math.tan(p.ret * Math.PI / 180);
    var push = P * (MU + tl) / (1 - MU * tl);
    var locked = p.ret >= 89.9 || (1 - MU * tr) <= 0;
    var pull = locked ? Infinity : P * (MU + tr) / (1 - MU * tr);
    var a = allow / 100;
    return {
      eps: epsPct, allow: allow, ratio: ratio, P: P, push: push, pull: pull, locked: locked,
      needL: Math.sqrt(1.5 * p.t * p.y / a),
      maxT: a * p.L * p.L / (1.5 * p.y),
      maxY: a * p.L * p.L / (1.5 * p.t)
    };
  }
  window.JoiningParts = { analyse: analyse, MATERIALS: MATERIALS, LOCK_ANGLE: LOCK_ANGLE };

  /* ── Snap-fit lab ────────────────────────────────────────────────── */
  function initLab(root) {
    var canvas = $('canvas', root);
    var inputs = {};
    $all('[data-jp-input]', root).forEach(function (el) { inputs[el.getAttribute('data-jp-input')] = el; });
    var outputs = {};
    $all('[data-jp-output]', root).forEach(function (el) { outputs[el.getAttribute('data-jp-output')] = el; });
    var readout = $('[data-jp-readout]', root);
    var verdict = $('[data-jp-verdict]', root);
    var meterFill = $('[data-jp-meter-fill]', root);
    var meterText = $('[data-jp-meter-text]', root);
    var fixes = $('[data-jp-fixes]', root);
    var playBtn = $('[data-jp-play]', root);
    var scrub = $('[data-jp-scrub]', root);

    var sk = window.SimKit ? window.SimKit.canvas2d(canvas, { height: 300, onResize: function () { draw(); } }) : null;
    var ctx = sk ? sk.ctx : canvas.getContext('2d');

    var state = { phase: 0 };  // 0 → 1 insert, 1 → 2 pull
    var playing = false;
    var loop = null;

    function params() {
      return {
        mat: inputs.mat.value, orient: inputs.orient.value, use: inputs.use.value,
        L: +inputs.L.value, t: +inputs.t.value, y: +inputs.y.value, b: +inputs.b.value,
        lead: +inputs.lead.value, ret: +inputs.ret.value
      };
    }

    /* Hook and plate geometry in mm. Arm underside is y = 0, arm top is y = t,
       the hook hangs below to y = −undercut. x = 0 is the root. */
    function geometry(p) {
      var flat = Math.max(0.4, p.t * 0.35);
      var retRun = p.ret >= 89.9 ? 0 : p.y / Math.tan(p.ret * Math.PI / 180);
      var leadRun = p.y / Math.tan(p.lead * Math.PI / 180);
      var xb = p.L - flat / 2;           // bottom of return face
      var xa = xb - retRun;              // top of return face (on the arm)
      var xc = p.L + flat / 2;           // bottom of lead-in face
      var xd = xc + leadRun;             // top of lead-in face = arm tip
      var wl = xa - 0.05;                // window's left wall (plate coordinates)
      var wr = xd + 1.5;                 // window's right wall
      var plateLeft = Math.max(1.2, wl - Math.max(4, p.L * 0.5));
      return { flat: flat, xa: xa, xb: xb, xc: xc, xd: xd, wl: wl, wr: wr, plateLeft: plateLeft,
               plateRight: wr + 5, depth: p.y + 2.2, S0: xd - plateLeft + 0.6 };
    }

    function hookBottom(g, p, x) {   // hook underside height at x (0 outside the hook)
      if (x <= g.xa || x >= g.xd) return 0;
      if (x < g.xb) return g.xb === g.xa ? -p.y : -p.y * (x - g.xa) / (g.xb - g.xa);
      if (x <= g.xc) return -p.y;
      return -p.y * (g.xd - x) / (g.xd - g.xc);
    }

    function plateSolid(g, u) { return (u >= g.plateLeft && u < g.wl) || (u > g.wr && u <= g.plateRight); }

    function liftAt(g, p, s) {   // how far the hook must lift with the plate shifted right by s
      var need = 0;
      for (var i = 0; i <= 80; i++) {
        var x = g.xa + (g.xd - g.xa) * i / 80;
        if (plateSolid(g, x - s)) need = Math.max(need, -hookBottom(g, p, x));
      }
      return Math.min(need, p.y);
    }

    /* Phase → plate offset s and lift d. Locked hooks refuse to come out. */
    function pose(p, g, a) {
      var ph = state.phase;
      var s, jiggle = false;
      if (ph <= 1) { s = g.S0 * (1 - ph); }
      else if (a.locked) { s = 0.12 * Math.abs(Math.sin((ph - 1) * Math.PI * 6)); jiggle = true; }
      else { s = g.S0 * (ph - 1); }
      return { s: s, d: jiggle ? 0 : liftAt(g, p, s), jiggle: jiggle };
    }

    function colors() {
      var c = window.SimKit && window.SimKit.theme ? window.SimKit.theme.colors() : {};
      var cs = getComputedStyle(root);
      return {
        bg: cs.getPropertyValue('--jp-canvas-bg').trim() || '#fbfaf6',
        ink: cs.getPropertyValue('--jp-canvas-ink').trim() || '#1f2937',
        muted: cs.getPropertyValue('--jp-canvas-muted').trim() || '#6b7280',
        accent: c.accent || '#0f766e'
      };
    }

    function strainColor(f) { // f = local strain / allowable
      if (f <= 0.5) return mix([22, 163, 74], [234, 179, 8], f / 0.5);
      if (f <= 1) return mix([234, 179, 8], [220, 38, 38], (f - 0.5) / 0.5);
      return 'rgb(153,27,27)';
    }
    function mix(a, b, k) {
      return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * k) + ',' + Math.round(a[1] + (b[1] - a[1]) * k) + ',' + Math.round(a[2] + (b[2] - a[2]) * k) + ')';
    }

    function draw() {
      if (!ctx) return;
      var W = sk ? sk.width : canvas.width, H = sk ? sk.height : canvas.height;
      var p = params(), g = geometry(p), a = analyse(p), pz = pose(p, g, a);
      var col = colors();
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);

      var baseW = 5;
      var spanX = baseW + g.plateRight + g.S0 * 0 + 2;   // world width shown (plate parks at s = S0 only during insert)
      var maxS = g.S0;
      spanX = baseW + Math.max(g.plateRight, g.plateRight + maxS * 0.0) + 3;
      var spanY = p.t + 3 + g.depth + p.y + 3;
      var k = Math.min((W - 40) / (spanX + maxS * 0.35), (H - 70) / spanY);
      var ox = 20 + baseW * k;                 // screen x of root
      var oy = 30 + (p.t + p.y + 2.2) * k;     // screen y of arm underside (y = 0)
      function X(x) { return ox + x * k; }
      function Y(y) { return oy - y * k; }

      // deflected shape
      var L = p.L, d = pz.d;
      function w(x) {
        if (x <= L) return d * (3 * L * x * x - x * x * x) / (2 * L * L * L);
        return d + 1.5 * d / L * (x - L);
      }

      // base block
      ctx.fillStyle = col.muted; ctx.globalAlpha = 0.25;
      ctx.fillRect(X(-baseW), Y(p.t + 3), baseW * k, (p.t + 3 + g.depth + 1) * k);
      ctx.globalAlpha = 1; ctx.strokeStyle = col.ink; ctx.lineWidth = 2;
      ctx.strokeRect(X(-baseW), Y(p.t + 3), baseW * k, (p.t + 3 + g.depth + 1) * k);

      // plate (mating part)
      var s = pz.s;
      ctx.beginPath();
      ctx.moveTo(X(g.plateLeft + s), Y(0));
      ctx.lineTo(X(g.wl + s), Y(0));
      ctx.lineTo(X(g.wl + s), Y(-p.y - 0.8));
      ctx.lineTo(X(g.wr + s), Y(-p.y - 0.8));
      ctx.lineTo(X(g.wr + s), Y(0));
      ctx.lineTo(X(g.plateRight + s), Y(0));
      ctx.lineTo(X(g.plateRight + s), Y(-g.depth));
      ctx.lineTo(X(g.plateLeft + s), Y(-g.depth));
      ctx.closePath();
      ctx.fillStyle = 'rgba(37,99,235,0.18)'; ctx.fill();
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2; ctx.stroke();

      // arm, coloured by local strain
      var epsNow = 1.5 * p.t * d / (L * L) * 100;
      var N = 48;
      for (var i = 0; i < N; i++) {
        var x0 = L * i / N, x1 = L * (i + 1) / N;
        var f = epsNow * (1 - (x0 + x1) / (2 * L)) / a.allow;
        ctx.beginPath();
        ctx.moveTo(X(x0), Y(w(x0)));
        ctx.lineTo(X(x1), Y(w(x1)));
        ctx.lineTo(X(x1), Y(w(x1) + p.t));
        ctx.lineTo(X(x0), Y(w(x0) + p.t));
        ctx.closePath();
        ctx.fillStyle = strainColor(f); ctx.fill();
        ctx.strokeStyle = strainColor(f); ctx.lineWidth = 1; ctx.stroke();
      }
      // arm beyond L (to the tip) + hook
      ctx.beginPath();
      ctx.moveTo(X(L), Y(w(L)));
      ctx.lineTo(X(g.xd), Y(w(g.xd)));
      ctx.lineTo(X(g.xd), Y(w(g.xd) + p.t));
      ctx.lineTo(X(L), Y(w(L) + p.t));
      ctx.closePath();
      ctx.fillStyle = strainColor(0); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X(g.xa), Y(w(g.xa)));
      ctx.lineTo(X(g.xb), Y(w(g.xb) - p.y));
      ctx.lineTo(X(g.xc), Y(w(g.xc) - p.y));
      ctx.lineTo(X(g.xd), Y(w(g.xd)));
      ctx.closePath();
      ctx.fillStyle = strainColor(0); ctx.fill();
      ctx.strokeStyle = col.ink; ctx.lineWidth = 1.5; ctx.stroke();

      // outline of the whole arm
      ctx.beginPath();
      ctx.moveTo(X(0), Y(w(0) + p.t));
      for (var j = 1; j <= 60; j++) { var xx = g.xd * j / 60; ctx.lineTo(X(xx), Y(w(xx) + p.t)); }
      ctx.lineTo(X(g.xd), Y(w(g.xd)));
      for (var m = 60; m >= 0; m--) { var xm = g.xd * m / 60; if (xm > g.xa && xm < g.xd) continue; ctx.lineTo(X(xm), Y(w(xm))); }
      ctx.strokeStyle = col.ink; ctx.lineWidth = 2; ctx.stroke();

      // layer lines
      ctx.save();
      ctx.strokeStyle = 'rgba(17,24,39,0.35)'; ctx.lineWidth = 1;
      if (p.orient === 'flat') {
        var nL = Math.max(1, Math.round(p.t / 0.2));
        var step = p.t / nL;
        if (step * k >= 3) {
          for (var q = 1; q < nL; q++) {
            ctx.beginPath();
            for (var r = 0; r <= 40; r++) { var xr = g.xd * r / 40; var yy = Y(w(xr) + q * step); if (r) ctx.lineTo(X(xr), yy); else ctx.moveTo(X(xr), yy); }
            ctx.stroke();
          }
        }
      } else {
        var stepU = Math.max(0.2, 4 / k);
        for (var xu = stepU; xu < g.xd; xu += stepU) {
          ctx.beginPath(); ctx.moveTo(X(xu), Y(w(xu))); ctx.lineTo(X(xu), Y(w(xu) + p.t)); ctx.stroke();
        }
      }
      ctx.restore();

      // crack marker when over the limit at full deflection
      if (a.ratio > 1 && d > 0.98 * p.y) {
        ctx.strokeStyle = '#111827'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (p.orient === 'upright') {
          ctx.moveTo(X(0.15), Y(w(0.15) + p.t)); ctx.lineTo(X(0.15), Y(w(0.15) + p.t * 0.25));
        } else {
          ctx.moveTo(X(0.1), Y(p.t)); ctx.lineTo(X(0.35), Y(p.t * 0.7)); ctx.lineTo(X(0.15), Y(p.t * 0.45));
        }
        ctx.stroke();
      }

      // labels
      ctx.fillStyle = col.ink;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      var phaseLabel = state.phase < 1 ? 'Pushing in…' : (state.phase < 1.02 ? 'Snapped in' : (a.locked ? 'Pulling: locked, the return face is too steep to ride over' : 'Pulling out…'));
      if (state.phase === 0) phaseLabel = 'Ready: press ▶ or drag the slider';
      ctx.fillText(phaseLabel, 14, 20);
      ctx.textAlign = 'right';
      ctx.fillText('strain now ' + fmt(epsNow, 2) + ' %  ·  limit ' + fmt(a.allow, 1) + ' %', W - 14, 20);
      ctx.textAlign = 'left';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = col.muted;
      ctx.fillText((p.orient === 'flat' ? 'layers run along the arm' : 'layers cross the arm') + '  ·  1 mm = ' + fmt(k, 0) + ' px', 14, H - 10);
      // scale bar 5 mm
      ctx.strokeStyle = col.muted; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W - 14 - 5 * k, H - 14); ctx.lineTo(W - 14, H - 14); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText('5 mm', W - 14, H - 20);

      if (scrub && document.activeElement !== scrub) scrub.value = String(state.phase);
    }

    function update() {
      var p = params(), a = analyse(p), mat = MATERIALS[p.mat];
      Object.keys(outputs).forEach(function (key) {
        var el = inputs[key]; if (!el) return;
        var unit = el.getAttribute('data-jp-unit') || '';
        outputs[key].textContent = el.value + unit;
      });
      var pct = Math.min(a.ratio, 1.6) / 1.6 * 100;
      meterFill.style.width = pct + '%';
      meterFill.setAttribute('data-level', a.ratio > 1 ? 'fail' : (a.ratio > 0.8 ? 'close' : 'ok'));
      meterText.textContent = fmt(a.eps, 2) + ' % strain = ' + fmt(a.ratio * 100, 0) + ' % of the ' + fmt(a.allow, 1) + ' % limit';

      var pushTxt = fmt(a.push, a.push < 10 ? 1 : 0) + ' N (about the weight of ' + fmt(a.push / 9.81 * 1000, 0) + ' g)';
      var pullTxt = a.locked ? 'locked: pulling will not lift the hook; press the arm to release it'
        : fmt(a.pull, a.pull < 10 ? 1 : 0) + ' N to pull it apart';
      readout.innerHTML =
        '<li><b>Root strain</b> ε = 1.5 × ' + fmt(p.t, 1) + ' × ' + fmt(p.y, 1) + ' ÷ ' + fmt(p.L, 1) + '² = <b>' + fmt(a.eps, 2) + ' %</b></li>' +
        '<li><b>Safe limit</b> ' + mat.name + ', ' + (p.orient === 'flat' ? 'printed lying down' : 'printed standing up') + ', ' +
          (p.use === 'repeat' ? 'many snaps (× 0.6)' : 'one snap') + ': <b>' + fmt(a.allow, 1) + ' %</b></li>' +
        '<li><b>Push to snap</b> ' + pushTxt + '</li>' +
        '<li><b>Pull-out</b> ' + pullTxt + '</li>';

      var cls, head, body;
      if (a.ratio <= 0.8) { cls = 'ok'; head = 'PASS'; body = 'The arm bends to ' + fmt(a.ratio * 100, 0) + ' % of its safe limit, with room for print error.'; }
      else if (a.ratio <= 1) { cls = 'close'; head = 'PASS, BUT CLOSE'; body = 'At ' + fmt(a.ratio * 100, 0) + ' % of the limit, a slightly thick print or a sharp root corner could break it. Print one and test.'; }
      else { cls = 'fail'; head = 'FAIL'; body = 'The arm must stretch ' + fmt(a.ratio, 1) + ' × its safe limit. ' + mat.fail; }
      var warn = [];
      if (p.L / p.t < 5) warn.push('The arm is short and stubby (L is under 5 × t), so the base flexes too and the formula is rough. Lengthen it.');
      if (p.t < 0.8) warn.push('Under 0.8 mm is thinner than two lines from a 0.4 mm nozzle: it may print ragged or not at all.');
      if (a.eps > 8) warn.push('Strains this large are beyond the small-bend range the formula was made for.');
      if (!a.locked && p.ret > 60) warn.push('This return face is steep: it will come apart, but it takes a hard pull.');
      verdict.setAttribute('data-level', cls);
      verdict.innerHTML = '<strong>' + head + '</strong> ' + body + (warn.length ? '<span class="jp-warn">' + warn.join(' ') + '</span>' : '');

      if (a.ratio > 0.8) {
        fixes.hidden = false;
        fixes.innerHTML = '<b>To get under 80 % of the limit, change one of these:</b> make the arm at least <b>' + fmt(a.needL / Math.sqrt(0.8), 1) +
          ' mm</b> long, or at most <b>' + fmt(a.maxT * 0.8, 2) + ' mm</b> thick, or cut the undercut to <b>' + fmt(a.maxY * 0.8, 2) + ' mm</b>' +
          (p.orient === 'upright' ? ', or print the part lying down.' : '.');
      } else { fixes.hidden = true; fixes.innerHTML = ''; }
      draw();
    }

    function setPlaying(on) {
      playing = on;
      playBtn.textContent = on ? '❚❚ Pause' : '▶ Snap it in and pull it out';
      playBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) {
        if (state.phase >= 2) state.phase = 0;
        if (!loop && window.SimKit) {
          loop = window.SimKit.loop(function (dt) {
            if (!playing) return;
            state.phase += dt * 0.45;
            if (state.phase >= 2) { state.phase = 2; draw(); setPlaying(false); return; }
            draw();
          }, { el: window.SimKit.stage(canvas), maxDt: 0.1 });
        } else if (loop) loop.resume();
      } else if (loop) loop.pause();
    }

    Object.keys(inputs).forEach(function (key) {
      inputs[key].addEventListener('input', update);
      inputs[key].addEventListener('change', update);
    });
    playBtn.addEventListener('click', function () { setPlaying(!playing); });
    if (scrub) scrub.addEventListener('input', function () {
      setPlaying(false);
      state.phase = +scrub.value;
      draw();
    });
    $all('[data-jp-preset]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pr = PRESETS[btn.getAttribute('data-jp-preset')];
        Object.keys(pr).forEach(function (key) { if (inputs[key]) inputs[key].value = pr[key]; });
        state.phase = 1;
        update();
      });
    });
    if (window.SimKit && window.SimKit.theme) window.SimKit.theme.onChange(function () { draw(); });
    state.phase = 1;   // start snapped in, so the arm's resting shape and labels show
    update();
  }

  /* ── Joint chooser ───────────────────────────────────────────────── */
  function initChooser(root) {
    var out = $('[data-jp-choice]', root);
    function val(name) { var el = $('input[name="' + name + '"]:checked', root); return el ? el.value : ''; }
    function pick() {
      var motion = val('jp-motion'), apart = val('jp-apart'), load = val('jp-load'), prints = val('jp-prints');
      var rec = [];
      if (motion === 'swing') {
        if (prints === 'one') {
          rec.push(['Print-in-place pin hinge', 'Knuckles printed around a pin with a clearance gap: swings freely, prints in one go. Find your gap with the clearance comb in <a href="print-fidgets.html">Design a moving fit</a>.']);
          rec.push(['Living hinge', 'One thin strip. Great in PP; PETG lasts longer than PLA; in PLA expect only a few dozen folds before it cracks.']);
        } else {
          rec.push(['Assembled pin hinge', 'Two printed leaves and a pin (a piece of filament, a nail or a bolt). Each part can be printed in its strongest orientation, and the pin can be replaced.']);
          rec.push(['Living hinge', 'If it must be one part after all: PP or PETG, strands running across the fold.']);
        }
      } else if (motion === 'slide') {
        rec.push(['Dovetail or T-rail', 'Slides one way, can\'t lift out. Add a small bump that clicks into a dimple so it stays shut.']);
        if (prints === 'one') rec.push(['Print-in-place slider', 'Possible with a clearance gap all round, but a separate rail is easier to tune.']);
      } else if (apart === 'never') {
        rec.push([load === 'heavy' ? 'Bolt and nut trap' : 'Snap-fit with a 90° return face', load === 'heavy' ? 'A metal bolt carries big loads; the hex pocket stops the nut turning.' : 'Locks for good: the hook can only be released by pressing it, or not at all.']);
        rec.push(['Press-fit peg', 'A peg about 0–0.1 mm bigger than its hole (test first). Strong in shear, hard to undo.']);
      } else if (load === 'heavy') {
        rec.push(['Screw into a heat-set insert', 'Metal threads in the plastic: strong and can be screwed in and out many times.']);
        rec.push(['Bolt and nut trap', 'No special tools, strong, and the nut can be replaced.']);
      } else if (apart === 'often') {
        rec.push(['Magnet pocket', 'Clicks together with no wear at all; check polarity before you press or seal the magnets.']);
        rec.push(['Coarse printed thread', 'Like a jar lid: twist to open, many times. Make it big and coarse with a chamfered start.']);
      } else {
        rec.push(['Snap-fit with a sloped (≈45°) return face', 'Pulls apart and goes back together. Design it to about 60 % of the one-snap strain limit, and print the arm lying down.']);
        rec.push(['Slip-fit pegs', 'About 0.2–0.3 mm of clearance on the diameter: lines parts up, lifts off.']);
      }
      if (!motion || !apart || !load || !prints) { out.innerHTML = '<p>Answer all four questions to see a suggestion.</p>'; return; }
      out.innerHTML = rec.map(function (r, i) {
        return '<div class="jp-choice-card"><span>' + (i ? 'Also consider' : 'Best first try') + '</span><b>' + r[0] + '</b><p>' + r[1] + '</p></div>';
      }).join('');
    }
    $all('input', root).forEach(function (el) { el.addEventListener('change', pick); });
    pick();
  }

  /* ── 20-cycle test record ────────────────────────────────────────── */
  function initRecord(root) {
    var body = $('tbody', root);
    var summary = $('[data-jp-record-summary]', root);
    if (!body.children.length) {
      var html = '';
      for (var i = 1; i <= 20; i++) {
        html += '<tr><th scope="row">' + i + '</th>' +
          '<td><input type="checkbox" aria-label="Cycle ' + i + ': goes together"></td>' +
          '<td><input type="checkbox" aria-label="Cycle ' + i + ': holds in the shake test"></td>' +
          '<td><input type="checkbox" aria-label="Cycle ' + i + ': comes apart or opens cleanly"></td>' +
          '<td><input type="text" aria-label="Cycle ' + i + ': what you saw" placeholder=""></td></tr>';
      }
      body.innerHTML = html;
    }
    function tally() {
      var pass = 0, firstFail = 0, touched = 0;
      $all('tr', body).forEach(function (tr, idx) {
        var boxes = $all('input[type="checkbox"]', tr);
        var note = $('input[type="text"]', tr).value.trim();
        var any = boxes.some(function (b) { return b.checked; }) || note;
        if (!any) return;
        touched = idx + 1;
        var ok = boxes.every(function (b) { return b.checked; });
        if (ok) pass++; else if (!firstFail) firstFail = idx + 1;
      });
      if (!touched) { summary.textContent = 'Tick a box when that check passes. The tally appears here.'; return; }
      summary.textContent = pass + ' of ' + touched + ' cycles recorded passed every check' +
        (firstFail ? '. First problem at cycle ' + firstFail + '.' : '.') +
        (touched === 20 && pass === 20 ? ' The joint survived all 20 cycles.' : '');
    }
    root.addEventListener('input', tally);
    root.addEventListener('change', tally);
    tally();
  }

  function start() {
    $all('[data-jp-lab]').forEach(initLab);
    $all('[data-jp-chooser]').forEach(initChooser);
    $all('[data-jp-record]').forEach(initRecord);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
