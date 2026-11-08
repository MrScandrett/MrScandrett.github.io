/* Fourier Series lesson labs (lessons/mathematics/advanced-and-calculus/fourier-series.html).
 * Moved out of nine inline <script>s, in the order the page ran them. Needs fourier-kit.js first. */
/* ── Part 1: HOOK — one circle, unrolled into a sine wave ──────────────────── */
  (function () {
    var canvas = document.getElementById('hook-canvas');
    if (!canvas) return;
    var phase = 0;

    function draw() {
      var f = FourierKit.fit(canvas, 190), ctx = f.ctx, W = f.w, H = f.h;
      var zoneW = Math.min(170, W * 0.34);
      var cx = zoneW / 2, cy = H / 2;
      var R = Math.min(zoneW / 2 - 14, H / 2 - 22);
      var waveX = zoneW + 16, waveW = Math.max(40, W - waveX - 6);

      // axes
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(waveX, cy); ctx.lineTo(W, cy); ctx.stroke();

      // circle
      ctx.strokeStyle = 'rgba(56,189,248,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, FourierKit.TAU); ctx.stroke();

      var px = cx + R * Math.cos(phase);
      var py = cy - R * Math.sin(phase);

      // radius arm
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();

      // the wave: value at phase − u plotted rightwards
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      var pts = 220, span = FourierKit.TAU * 2;
      for (var i = 0; i <= pts; i++) {
        var u = (i / pts) * span;
        var y = cy - Math.sin(phase - u) * R;
        var x = waveX + (i / pts) * waveW;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // tie line from the dot to the start of the trace
      ctx.strokeStyle = 'rgba(249,115,22,0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(waveX, py); ctx.stroke();
      ctx.setLineDash([]);

      // the two dots
      [[px, py, '#38bdf8'], [waveX, py, '#f97316']].forEach(function (d) {
        ctx.fillStyle = d[2];
        ctx.beginPath(); ctx.arc(d[0], d[1], 4.5, 0, FourierKit.TAU); ctx.fill();
      });

      // height bracket
      ctx.strokeStyle = 'rgba(226,232,240,0.3)';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, py); ctx.stroke();
    }

    FourierKit.loop(canvas, function (dt) {
      if (!FourierKit.reduced) phase += dt * 1.1;
      draw();
    });
    draw();
    FourierKit.onResize(canvas, draw);
  })();

/* ── Part 2: LAB A — epicycle waveform builder ──────────────────── */
  (function () {
    var waveSelect = document.getElementById('wave-select');
    var hSlider = document.getElementById('harmonics-slider');
    var hVal = document.getElementById('harmonics-val');
    var dutyGroup = document.getElementById('duty-group');
    var dutySlider = document.getElementById('duty-slider');
    var dutyVal = document.getElementById('duty-val');
    var speedSlider = document.getElementById('speed-slider');
    var speedVal = document.getElementById('speed-val');
    var soundBtn = document.getElementById('builder-sound');
    var resetBtn = document.getElementById('builder-reset');
    var epiCanvas = document.getElementById('epicycle-canvas');
    var compCanvas = document.getElementById('components-canvas');
    var sumCanvas = document.getElementById('sum-canvas');
    var specDisplay = document.getElementById('spectrum-display');
    if (!epiCanvas || !sumCanvas) return;

    var hud = {
      terms: document.getElementById('hud-harmonics'),
      top: document.getElementById('hud-top'),
      error: document.getElementById('hud-error'),
      energy: document.getElementById('hud-energy'),
      formula: document.getElementById('hud-formula')
    };

    var phase = 0;
    var muted = {};          // harmonic number → true when silenced
    var SPEC_BARS = 20;

    function type() { return waveSelect.value; }
    function duty() { return parseInt(dutySlider.value, 10) / 100; }
    function count() { return parseInt(hSlider.value, 10); }
    function active() {
      return FourierKit.terms(type(), count(), duty()).filter(function (h) { return !muted[h.n]; });
    }

    /* ── Epicycles ─────────────────────────────────────── */
    function drawEpicycles() {
      var f = FourierKit.fit(epiCanvas, 260), ctx = f.ctx, W = f.w, H = f.h;
      var list = active();
      var dc = FourierKit.WAVES[type()].dc(duty());

      var zoneW = Math.min(300, Math.max(150, W * 0.38));
      var cx = zoneW / 2, cy = H / 2;
      var reach = list.reduce(function (a, h) { return a + h.amp; }, 0) + Math.abs(dc) || 1;
      var scale = Math.min(58, (Math.min(zoneW, H) / 2 - 16) / reach);
      var waveX = zoneW + 14, waveW = Math.max(50, W - waveX - 6);

      // axis for the wave half
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(waveX, cy); ctx.lineTo(W, cy); ctx.stroke();

      // the chain
      var x = cx, y = cy - dc * scale;
      for (var i = 0; i < list.length; i++) {
        var h = list[i];
        var r = h.amp * scale;
        var ang = h.n * phase + h.phase;
        var nx = x + r * Math.cos(ang);
        var ny = y - r * Math.sin(ang);
        if (r > 1.2) {
          ctx.strokeStyle = 'rgba(148,163,184,0.28)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, r, 0, FourierKit.TAU); ctx.stroke();
          ctx.strokeStyle = FourierKit.PALETTE[i % FourierKit.PALETTE.length];
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
        }
        x = nx; y = ny;
      }

      // the tip, and the trace it drags out
      ctx.strokeStyle = 'rgba(249,115,22,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(waveX, y); ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      var pts = 300, span = FourierKit.TAU * 2;
      for (var j = 0; j <= pts; j++) {
        var u = (j / pts) * span;
        var v = FourierKit.sumAt(list, phase - u, dc);
        var py = cy - v * scale;
        var px = waveX + (j / pts) * waveW;
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.fillStyle = '#fdba74';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, FourierKit.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(waveX, y, 4, 0, FourierKit.TAU); ctx.fill();
    }

    /* ── Each harmonic on its own ──────────────────────── */
    function drawComponents() {
      var f = FourierKit.fit(compCanvas, 120), ctx = f.ctx, W = f.w, H = f.h;
      var list = FourierKit.terms(type(), count(), duty());
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

      var pts = 300;
      for (var i = 0; i < list.length; i++) {
        var h = list[i];
        var off = !!muted[h.n];
        ctx.strokeStyle = off ? 'rgba(248,113,113,0.35)' : FourierKit.PALETTE[i % FourierKit.PALETTE.length];
        ctx.lineWidth = off ? 1 : 1.5;
        ctx.globalAlpha = off ? 0.7 : 0.9;
        if (off) ctx.setLineDash([3, 3]);
        ctx.beginPath();
        for (var j = 0; j <= pts; j++) {
          var x = (j / pts) * FourierKit.TAU;
          var v = h.amp * Math.sin(h.n * x + h.phase);
          var py = H / 2 - v * (H * 0.36);
          var px = (j / pts) * W;
          if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
    }

    /* ── Partial sum against the ideal ─────────────────── */
    function drawSum() {
      var f = FourierKit.fit(sumCanvas, 170), ctx = f.ctx, W = f.w, H = f.h;
      var wave = FourierKit.WAVES[type()];
      var d = duty(), dc = wave.dc(d);
      var list = active();
      FourierKit.plotFrame(ctx, W, H);

      var amp = H * 0.36, pts = 520;

      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      for (var i = 0; i <= pts; i++) {
        var x = (i / pts) * FourierKit.TAU;
        var py = H / 2 - wave.target(x, d) * amp;
        var px = (i / pts) * W;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      var err = 0;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (var k = 0; k <= pts; k++) {
        var xv = (k / pts) * FourierKit.TAU;
        var sv = FourierKit.sumAt(list, xv, dc);
        err += Math.abs(sv - wave.target(xv, d));
        var pyy = H / 2 - sv * amp;
        var pxx = (k / pts) * W;
        if (k === 0) ctx.moveTo(pxx, pyy); else ctx.lineTo(pxx, pyy);
      }
      ctx.stroke();
      return (err / (pts + 1)) * 50;   // mean |error| as a % of the peak-to-peak of 2
    }

    /* ── Spectrum bars (click to mute) ─────────────────── */
    function buildSpectrum() {
      var wave = FourierKit.WAVES[type()], d = duty(), n = count();
      var live = FourierKit.terms(type(), n, d);
      var cutoff = live.length ? live[live.length - 1].n : 1;
      var maxAmp = 4 / Math.PI;
      var frag = document.createDocumentFragment();

      for (var i = 1; i <= SPEC_BARS; i++) {
        var h = wave.harmonic(i, d);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'four-spec-bar-wrap';
        var bar = document.createElement('div');
        var label = document.createElement('div');
        label.className = 'four-spec-label';
        label.textContent = 'n' + i;

        if (!h) {
          bar.className = 'four-spec-bar muted';
          bar.style.height = '3px';
          btn.disabled = true;
          btn.setAttribute('aria-label', 'Harmonic ' + i + ' is absent from this wave');
        } else {
          var included = h.n <= cutoff;
          var off = !!muted[h.n];
          bar.className = 'four-spec-bar' + (off ? ' off' : (included ? '' : ' muted'));
          bar.style.height = Math.max(3, Math.round((Math.abs(h.amp) / maxAmp) * 62)) + 'px';
          btn.setAttribute('aria-pressed', off ? 'true' : 'false');
          btn.setAttribute('aria-label',
            'Harmonic ' + i + ', amplitude ' + h.amp.toFixed(3) + (off ? ', muted' : '') + '. Activate to toggle.');
          (function (num) {
            btn.addEventListener('click', function () {
              if (muted[num]) delete muted[num]; else muted[num] = true;
              render();
              restartToneIfPlaying();
            });
          })(h.n);
        }
        btn.appendChild(bar);
        btn.appendChild(label);
        frag.appendChild(btn);
      }
      specDisplay.innerHTML = '';
      specDisplay.appendChild(frag);
    }

    function formula() {
      var list = active(), parts = [];
      for (var i = 0; i < Math.min(list.length, 3); i++) {
        var h = list[i];
        var negative = Math.abs(FourierKit.wrap(h.phase) + Math.PI) < 1e-6 ||
                       Math.abs(FourierKit.wrap(h.phase) - Math.PI) < 1e-6;
        var fn = (Math.abs(h.phase) > 1e-6 && !negative) ? 'cos' : 'sin';
        var sign = negative || h.phase < -1e-6 ? '−' : (i > 0 ? '+' : '');
        parts.push((sign ? sign + ' ' : '') + h.amp.toFixed(3) + '·' + fn + '(' + h.n + 'x)');
      }
      if (list.length > 3) parts.push('+ …');
      if (!parts.length) parts.push('0');
      return parts.join(' ');
    }

    function energyCaptured() {
      var d = duty(), list = active();
      var kept = list.reduce(function (a, h) { return a + h.amp * h.amp; }, 0);
      var all = FourierKit.terms(type(), 160, d)
        .reduce(function (a, h) { return a + h.amp * h.amp; }, 0);
      return all > 0 ? (kept / all) * 100 : 100;
    }

    function render() {
      var list = active();
      var all = FourierKit.terms(type(), count(), duty());
      drawEpicycles();
      drawComponents();
      var err = drawSum();
      buildSpectrum();
      hud.terms.textContent = list.length + (list.length !== all.length ? ' / ' + all.length : '');
      hud.top.textContent = all.length ? 'n = ' + all[all.length - 1].n : '—';
      hud.error.textContent = err.toFixed(2) + '%';
      hud.energy.textContent = energyCaptured().toFixed(1) + '%';
      hud.formula.textContent = formula();
      hVal.textContent = count();
      dutyVal.textContent = Math.round(duty() * 100) + '%';
    }

    /* ── Sound ─────────────────────────────────────────── */
    var osc = null, gain = null;
    function stopTone() {
      if (osc) {
        try {
          gain.gain.cancelScheduledValues(0);
          gain.gain.setTargetAtTime(0, FourierKit.audio().currentTime, 0.02);
          osc.stop(FourierKit.audio().currentTime + 0.15);
        } catch (e) { /* context already gone */ }
        osc = null;
      }
      soundBtn.setAttribute('aria-pressed', 'false');
      soundBtn.textContent = '🔊 Hear it';
      FourierKit.release('builder');
    }
    function startTone() {
      var ac = FourierKit.audio();
      if (!ac) return;
      FourierKit.claim('builder', stopTone);
      var list = active();
      var len = Math.max(2, (list.length ? list[list.length - 1].n : 1) + 1);
      var real = new Float32Array(len), imag = new Float32Array(len);
      list.forEach(function (h) {
        if (h.n < len) {
          real[h.n] = h.amp * Math.sin(h.phase);
          imag[h.n] = h.amp * Math.cos(h.phase);
        }
      });
      var pw = ac.createPeriodicWave(real, imag);
      osc = ac.createOscillator();
      gain = ac.createGain();
      osc.setPeriodicWave(pw);
      osc.frequency.value = 180;
      gain.gain.value = 0;
      osc.connect(gain); gain.connect(ac.destination);
      osc.start();
      gain.gain.setTargetAtTime(0.13, ac.currentTime, 0.03);
      soundBtn.setAttribute('aria-pressed', 'true');
      soundBtn.textContent = '⏹ Stop';
    }
    function restartToneIfPlaying() {
      if (osc) { stopTone(); startTone(); }
    }

    soundBtn.addEventListener('click', function () {
      if (osc) stopTone(); else startTone();
    });

    /* ── Wiring ────────────────────────────────────────── */
    hSlider.addEventListener('input', function () { render(); restartToneIfPlaying(); });
    dutySlider.addEventListener('input', function () { render(); restartToneIfPlaying(); });
    waveSelect.addEventListener('change', function () {
      dutyGroup.hidden = waveSelect.value !== 'pulse';
      muted = {};
      render();
      restartToneIfPlaying();
    });
    speedSlider.addEventListener('input', function () {
      speedVal.textContent = parseFloat(speedSlider.value).toFixed(1) + 'x';
    });
    resetBtn.addEventListener('click', function () {
      waveSelect.value = 'square';
      hSlider.value = 1;
      dutySlider.value = 25;
      speedSlider.value = 1.2;
      speedVal.textContent = '1.2x';
      dutyGroup.hidden = true;
      muted = {};
      phase = 0;
      render();
      restartToneIfPlaying();
    });
    FourierKit.onResize(epiCanvas, render);
    window.addEventListener('pagehide', stopTone);

    FourierKit.loop(epiCanvas, function (dt) {
      var spd = parseFloat(speedSlider.value);
      if (!FourierKit.reduced && spd > 0) {
        phase = (phase + dt * spd) % FourierKit.TAU;
        drawEpicycles();
      }
    });
    render();
  })();

/* ── Part 3: LAB B — the frequency detector ──────────────────── */
  (function () {
    var slider = document.getElementById('probe-slider');
    var val = document.getElementById('probe-val');
    var snapBtn = document.getElementById('probe-snap');
    var newBtn = document.getElementById('probe-new');
    var revealBtn = document.getElementById('probe-reveal');
    var sigCanvas = document.getElementById('probe-signal-canvas');
    var prodCanvas = document.getElementById('probe-product-canvas');
    var respCanvas = document.getElementById('probe-response-canvas');
    if (!sigCanvas) return;

    var hud = {
      k: document.getElementById('probe-hud-k'),
      out: document.getElementById('probe-hud-out'),
      verdict: document.getElementById('probe-hud-verdict'),
      recipe: document.getElementById('probe-hud-recipe')
    };

    var K_MIN = 0.4, K_MAX = 12, SAMPLES = 512;
    var recipe = [], revealed = false, response = null;

    function makeSignal() {
      var pool = [1, 2, 3, 4, 5, 6, 7, 8];
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      }
      var howMany = 2 + Math.floor(Math.random() * 2);
      recipe = pool.slice(0, howMany)
        .map(function (n) { return { n: n, amp: 0.35 + Math.random() * 0.6 }; })
        .sort(function (a, b) { return a.n - b.n; });
      revealed = false;
      response = null;
    }

    function signal(x) {
      var s = 0;
      for (var i = 0; i < recipe.length; i++) s += recipe[i].amp * Math.sin(recipe[i].n * x);
      return s;
    }

    /* (1/π)∫₀^2π f(x)·sin(kx) dx, done numerically. */
    function detect(k) {
      var sum = 0;
      for (var i = 0; i < SAMPLES; i++) {
        var x = (i / SAMPLES) * FourierKit.TAU;
        sum += signal(x) * Math.sin(k * x);
      }
      return (sum / SAMPLES) * 2;
    }

    function sweep() {
      var steps = 480;
      response = new Float64Array(steps + 1);
      for (var i = 0; i <= steps; i++) {
        response[i] = detect(K_MIN + (i / steps) * (K_MAX - K_MIN));
      }
    }

    function drawSignal() {
      var f = FourierKit.fit(sigCanvas, 110), ctx = f.ctx, W = f.w, H = f.h;
      FourierKit.plotFrame(ctx, W, H, { rows: 2 });
      var peak = 0, i;
      for (i = 0; i <= 400; i++) peak = Math.max(peak, Math.abs(signal((i / 400) * FourierKit.TAU)));
      var amp = (H * 0.4) / Math.max(0.6, peak);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (i = 0; i <= 400; i++) {
        var x = (i / 400) * FourierKit.TAU;
        var px = (i / 400) * W, py = H / 2 - signal(x) * amp;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    function drawProduct(k) {
      var f = FourierKit.fit(prodCanvas, 130), ctx = f.ctx, W = f.w, H = f.h;
      FourierKit.plotFrame(ctx, W, H, { rows: 2 });
      var pts = 420, i, peak = 0, vals = new Float64Array(pts + 1);
      for (i = 0; i <= pts; i++) {
        var x = (i / pts) * FourierKit.TAU;
        vals[i] = signal(x) * Math.sin(k * x);
        peak = Math.max(peak, Math.abs(vals[i]));
      }
      var amp = (H * 0.42) / Math.max(0.6, peak);

      // shade above/below the axis separately so the cancellation is visible
      for (var side = 0; side < 2; side++) {
        ctx.fillStyle = side === 0 ? 'rgba(74,222,128,0.32)' : 'rgba(248,113,113,0.32)';
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        for (i = 0; i <= pts; i++) {
          var v = vals[i];
          var keep = side === 0 ? Math.max(0, v) : Math.min(0, v);
          ctx.lineTo((i / pts) * W, H / 2 - keep * amp);
        }
        ctx.lineTo(W, H / 2);
        ctx.closePath();
        ctx.fill();
      }

      // the probe wave, faint
      ctx.strokeStyle = 'rgba(226,232,240,0.28)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (i = 0; i <= pts; i++) {
        var xx = (i / pts) * FourierKit.TAU;
        var py = H / 2 - Math.sin(k * xx) * (H * 0.2);
        if (i === 0) ctx.moveTo(0, py); else ctx.lineTo((i / pts) * W, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (i = 0; i <= pts; i++) {
        var pyy = H / 2 - vals[i] * amp;
        if (i === 0) ctx.moveTo(0, pyy); else ctx.lineTo((i / pts) * W, pyy);
      }
      ctx.stroke();
    }

    function drawResponse(k) {
      var f = FourierKit.fit(respCanvas, 150), ctx = f.ctx, W = f.w, H = f.h;
      var peak = 0, i;
      for (i = 0; i < response.length; i++) peak = Math.max(peak, Math.abs(response[i]));
      peak = Math.max(peak, 0.2);
      var base = H - 22, amp = (H - 40) / (peak * 2);

      // zero line + integer ticks
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      var mid = base - peak * amp;
      ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
      ctx.fillStyle = 'rgba(226,232,240,0.45)';
      ctx.font = '600 10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      for (var n = 1; n <= 12; n++) {
        var tx = ((n - K_MIN) / (K_MAX - K_MIN)) * W;
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.moveTo(tx, 6); ctx.lineTo(tx, base); ctx.stroke();
        ctx.fillText(String(n), tx, H - 6);
      }

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (i = 0; i < response.length; i++) {
        var px = (i / (response.length - 1)) * W;
        var py = mid - response[i] * amp;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      var mx = ((k - K_MIN) / (K_MAX - K_MIN)) * W;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(mx, 4); ctx.lineTo(mx, base); ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(mx, mid - detect(k) * amp, 4, 0, FourierKit.TAU);
      ctx.fill();
      ctx.textAlign = 'left';
    }

    function render() {
      var k = parseFloat(slider.value);
      if (!response) sweep();
      drawSignal();
      drawProduct(k);
      drawResponse(k);
      var out = detect(k);
      val.textContent = k.toFixed(2);
      hud.k.textContent = k.toFixed(2);
      hud.out.textContent = (out >= 0 ? '+' : '') + out.toFixed(3);
      var near = Math.round(k);
      var isHit = Math.abs(out) > 0.12;
      hud.verdict.textContent = isHit ? ('Found n = ' + near) : 'Nothing here';
      hud.recipe.textContent = revealed
        ? recipe.map(function (r) { return r.amp.toFixed(2) + '·sin(' + r.n + 'x)'; }).join(' + ')
        : 'hidden';
    }

    slider.addEventListener('input', render);
    snapBtn.addEventListener('click', function () {
      slider.value = String(Math.max(1, Math.round(parseFloat(slider.value))));
      render();
    });
    newBtn.addEventListener('click', function () { makeSignal(); render(); });
    revealBtn.addEventListener('click', function () { revealed = !revealed; render(); });
    FourierKit.onResize(sigCanvas, render);

    makeSignal();
    render();
  })();

/* ── Part 4: LAB C — draw a wave, read its recipe ──────────────────── */
  (function () {
    var canvas = document.getElementById('draw-canvas');
    var specCanvas = document.getElementById('draw-spectrum-canvas');
    var termsSlider = document.getElementById('draw-terms');
    var termsVal = document.getElementById('draw-terms-val');
    var preset = document.getElementById('draw-preset');
    var soundBtn = document.getElementById('draw-sound');
    var flatBtn = document.getElementById('draw-flat');
    if (!canvas) return;

    var hud = {
      terms: document.getElementById('draw-hud-terms'),
      energy: document.getElementById('draw-hud-energy'),
      error: document.getElementById('draw-hud-error'),
      big: document.getElementById('draw-hud-big'),
      ratio: document.getElementById('draw-hud-ratio')
    };

    var N = 256;              // samples across one period
    var MAXH = 32;            // harmonics analysed
    var data = new Float64Array(N);
    var dc = 0, an = new Float64Array(MAXH + 1), bn = new Float64Array(MAXH + 1);

    /* ── Presets ───────────────────────────────────────── */
    var PRESETS = {
      heartbeat: function (t) {          // t ∈ [0,1)
        function bump(c, w, h) { var d = (t - c) / w; return h * Math.exp(-d * d); }
        return bump(0.30, 0.020, -0.28) + bump(0.35, 0.016, 0.95) +
               bump(0.40, 0.020, -0.42) + bump(0.60, 0.055, 0.32) +
               bump(0.14, 0.045, 0.18);
      },
      spike: function (t) {
        var d = (t - 0.5) / 0.012;
        return Math.exp(-d * d) * 0.95 - 0.05;
      },
      stairs: function (t) {
        return Math.floor(t * 5) / 2 - 0.8;
      },
      hump: function (t) {
        return Math.sin(t * Math.PI) * 0.9 - 0.4;
      },
      noise: function (t) {
        return 0.45 * Math.sin(t * Math.PI * 2 * 3) +
               0.3 * Math.sin(t * Math.PI * 2 * 7 + 1) +
               0.2 * Math.sin(t * Math.PI * 2 * 13 + 2);
      }
    };

    function loadPreset(name) {
      var fn = PRESETS[name] || PRESETS.hump;
      for (var i = 0; i < N; i++) data[i] = Math.max(-1, Math.min(1, fn(i / N)));
      analyse();
    }

    /* ── Analysis: the multiply-and-average trick, 32× ─── */
    function analyse() {
      var i, n, sum = 0;
      for (i = 0; i < N; i++) sum += data[i];
      dc = sum / N;
      for (n = 1; n <= MAXH; n++) {
        var a = 0, b = 0;
        for (i = 0; i < N; i++) {
          var x = (i / N) * FourierKit.TAU;
          a += data[i] * Math.cos(n * x);
          b += data[i] * Math.sin(n * x);
        }
        an[n] = (2 / N) * a;
        bn[n] = (2 / N) * b;
      }
    }

    function rebuild(x, terms) {
      var v = dc;
      for (var n = 1; n <= terms; n++) v += an[n] * Math.cos(n * x) + bn[n] * Math.sin(n * x);
      return v;
    }

    function amp(n) { return Math.sqrt(an[n] * an[n] + bn[n] * bn[n]); }

    /* ── Drawing surface ───────────────────────────────── */
    var lastIdx = null;
    function pointerValue(ev) {
      var rect = canvas.getBoundingClientRect();
      var fx = (ev.clientX - rect.left) / rect.width;
      var fy = (ev.clientY - rect.top) / rect.height;
      return {
        idx: Math.max(0, Math.min(N - 1, Math.round(fx * (N - 1)))),
        val: Math.max(-1, Math.min(1, (0.5 - fy) * 2 / 0.78))
      };
    }
    function paint(ev) {
      var p = pointerValue(ev);
      if (lastIdx === null || lastIdx === p.idx) {
        data[p.idx] = p.val;
      } else {
        var from = lastIdx, to = p.idx;
        var step = to > from ? 1 : -1;
        var span = Math.abs(to - from);
        for (var i = 0; i <= span; i++) {
          var idx = from + i * step;
          data[idx] = data[from] + (p.val - data[from]) * (i / span);
        }
      }
      lastIdx = p.idx;
      analyse();
      render();
    }
    canvas.addEventListener('pointerdown', function (ev) {
      canvas.setPointerCapture(ev.pointerId);
      lastIdx = null;
      paint(ev);
      ev.preventDefault();
    });
    canvas.addEventListener('pointermove', function (ev) {
      if (ev.buttons) paint(ev);
    });
    canvas.addEventListener('pointerup', function () { lastIdx = null; restartIfPlaying(); });
    canvas.addEventListener('pointercancel', function () { lastIdx = null; });

    /* ── Render ────────────────────────────────────────── */
    function render() {
      var terms = parseInt(termsSlider.value, 10);
      var f = FourierKit.fit(canvas, 210), ctx = f.ctx, W = f.w, H = f.h;
      FourierKit.plotFrame(ctx, W, H);
      var amps = H * 0.39, i;

      ctx.fillStyle = 'rgba(226,232,240,0.4)';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillText('drag to draw →', 8, 14);

      // what you drew
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (i = 0; i < N; i++) {
        var px = (i / (N - 1)) * W, py = H / 2 - data[i] * amps;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // the rebuild
      var pts = 480, sqErr = 0;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (i = 0; i <= pts; i++) {
        var t = i / pts;
        var v = rebuild(t * FourierKit.TAU, terms);
        var qx = t * W, qy = H / 2 - v * amps;
        if (i === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
      }
      ctx.stroke();

      for (i = 0; i < N; i++) {
        var d = rebuild((i / N) * FourierKit.TAU, terms) - data[i];
        sqErr += d * d;
      }
      drawSpectrum(terms);

      var kept = 0, all = 0;
      for (var n = 1; n <= MAXH; n++) {
        var a2 = amp(n) * amp(n);
        all += a2;
        if (n <= terms) kept += a2;
      }
      var strongest = 1, best = -1;
      for (n = 1; n <= MAXH; n++) if (amp(n) > best) { best = amp(n); strongest = n; }

      termsVal.textContent = terms;
      hud.terms.textContent = terms;
      hud.energy.textContent = all > 1e-9 ? ((kept / all) * 100).toFixed(1) + '%' : '—';
      hud.error.textContent = Math.sqrt(sqErr / N).toFixed(3);
      hud.big.textContent = best > 1e-4 ? 'n = ' + strongest : 'flat';
      hud.ratio.textContent = (terms * 2 + 1) + ' vs ' + N;
    }

    function drawSpectrum(terms) {
      var f = FourierKit.fit(specCanvas, 130), ctx = f.ctx, W = f.w, H = f.h;
      var peak = 0, n;
      for (n = 1; n <= MAXH; n++) peak = Math.max(peak, amp(n));
      peak = Math.max(peak, 0.02);
      var base = H - 18, slot = W / MAXH;
      ctx.font = '600 9px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      for (n = 1; n <= MAXH; n++) {
        var hgt = (amp(n) / peak) * (H - 30);
        var x = (n - 1) * slot + slot * 0.15, bw = slot * 0.7;
        ctx.fillStyle = n <= terms ? '#f97316' : 'rgba(255,255,255,0.16)';
        ctx.fillRect(x, base - hgt, bw, hgt);
        if (n % 4 === 0 || n === 1) {
          ctx.fillStyle = 'rgba(226,232,240,0.45)';
          ctx.fillText(String(n), x + bw / 2, H - 5);
        }
      }
      ctx.textAlign = 'left';
    }

    /* ── Sound ─────────────────────────────────────────── */
    var osc = null, gain = null;
    function stopTone() {
      if (osc) {
        try {
          var ac = FourierKit.audio();
          gain.gain.cancelScheduledValues(0);
          gain.gain.setTargetAtTime(0, ac.currentTime, 0.02);
          osc.stop(ac.currentTime + 0.15);
        } catch (e) { /* nothing playing */ }
        osc = null;
      }
      soundBtn.setAttribute('aria-pressed', 'false');
      soundBtn.textContent = '🔊 Hear my wave';
      FourierKit.release('draw');
    }
    function startTone() {
      var ac = FourierKit.audio();
      if (!ac) return;
      FourierKit.claim('draw', stopTone);
      var terms = parseInt(termsSlider.value, 10);
      var real = new Float32Array(terms + 1), imag = new Float32Array(terms + 1);
      for (var n = 1; n <= terms; n++) { real[n] = an[n]; imag[n] = bn[n]; }
      osc = ac.createOscillator();
      gain = ac.createGain();
      osc.setPeriodicWave(ac.createPeriodicWave(real, imag));
      osc.frequency.value = 150;
      gain.gain.value = 0;
      osc.connect(gain); gain.connect(ac.destination);
      osc.start();
      gain.gain.setTargetAtTime(0.13, ac.currentTime, 0.03);
      soundBtn.setAttribute('aria-pressed', 'true');
      soundBtn.textContent = '⏹ Stop';
    }
    function restartIfPlaying() { if (osc) { stopTone(); startTone(); } }

    soundBtn.addEventListener('click', function () { if (osc) stopTone(); else startTone(); });
    flatBtn.addEventListener('click', function () {
      data.fill(0); analyse(); render(); restartIfPlaying();
    });
    termsSlider.addEventListener('input', function () { render(); restartIfPlaying(); });
    preset.addEventListener('change', function () {
      loadPreset(preset.value); render(); restartIfPlaying();
    });
    FourierKit.onResize(canvas, render);
    window.addEventListener('pagehide', stopTone);

    loadPreset('heartbeat');
    render();
  })();

/* ── Part 5: LAB D — the Gibbs magnifier ──────────────────── */
  (function () {
    var termsSlider = document.getElementById('gibbs-terms');
    var termsVal = document.getElementById('gibbs-terms-val');
    var zoomSlider = document.getElementById('gibbs-zoom');
    var zoomVal = document.getElementById('gibbs-zoom-val');
    var canvas = document.getElementById('gibbs-canvas');
    var trendCanvas = document.getElementById('gibbs-trend-canvas');
    if (!canvas) return;

    var hud = {
      peak: document.getElementById('gibbs-hud-peak'),
      over: document.getElementById('gibbs-hud-over'),
      width: document.getElementById('gibbs-hud-width')
    };

    var LIMIT = 1.1789797;        // (2/π)·Si(π)
    var MAXN = 200;

    /* Square wave partial sum with N odd harmonics. */
    function partial(x, N) {
      var s = 0;
      for (var i = 0; i < N; i++) {
        var n = 2 * i + 1;
        s += Math.sin(n * x) / n;
      }
      return (4 / Math.PI) * s;
    }

    /* The first maximum sits at x = π/(2N); look around it. */
    function peakOf(N) {
      var centre = Math.PI / (2 * N), best = 0, at = centre;
      for (var i = 0; i <= 160; i++) {
        var x = centre * (0.35 + 1.3 * (i / 160));
        var v = partial(x, N);
        if (v > best) { best = v; at = x; }
      }
      return { value: best, x: at };
    }

    // Precompute the trend curve once — 200 points, each cheap enough.
    var trend = new Float64Array(MAXN + 1);
    (function () {
      for (var N = 1; N <= MAXN; N++) trend[N] = (peakOf(N).value - 1) / 2 * 100;
    })();

    function draw() {
      var N = parseInt(termsSlider.value, 10);
      var z = parseInt(zoomSlider.value, 10);
      var zoom = Math.pow(10, (z / 100) * 2.3);           // 1× → ~200×
      var half = Math.PI / zoom;
      var f = FourierKit.fit(canvas, 240), ctx = f.ctx, W = f.w, H = f.h;

      var top = 1.45, bottom = -1.45;
      function ty(v) { return H - ((v - bottom) / (top - bottom)) * H; }
      function tx(x) { return ((x + half) / (2 * half)) * W; }

      // grid + reference levels
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      [-1, -0.5, 0, 0.5, 1].forEach(function (v) {
        ctx.beginPath(); ctx.moveTo(0, ty(v)); ctx.lineTo(W, ty(v)); ctx.stroke();
      });

      // ideal square
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(0, ty(-1)); ctx.lineTo(tx(0), ty(-1));
      ctx.moveTo(tx(0), ty(1)); ctx.lineTo(W, ty(1));
      ctx.stroke();
      ctx.setLineDash([]);

      // the Gibbs ceiling
      ctx.strokeStyle = 'rgba(251,191,36,0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(0, ty(LIMIT)); ctx.lineTo(W, ty(LIMIT)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(251,191,36,0.85)';
      ctx.font = '700 10px "IBM Plex Mono", monospace';
      ctx.fillText('1.17898  ← the limit', 8, ty(LIMIT) - 6);

      // partial sum
      var pts = Math.max(600, Math.min(2400, N * 14));
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (var i = 0; i <= pts; i++) {
        var x = -half + (i / pts) * 2 * half;
        var py = ty(partial(x, N));
        if (i === 0) ctx.moveTo(0, py); else ctx.lineTo((i / pts) * W, py);
      }
      ctx.stroke();

      // mark the peak
      var pk = peakOf(N);
      if (pk.x < half) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.arc(tx(pk.x), ty(pk.value), 4, 0, FourierKit.TAU); ctx.fill();
      }

      termsVal.textContent = N;
      zoomVal.textContent = zoom < 10 ? zoom.toFixed(1) + 'x' : Math.round(zoom) + 'x';
      hud.peak.textContent = pk.value.toFixed(5);
      hud.over.textContent = ((pk.value - 1) / 2 * 100).toFixed(3) + '%';
      hud.width.textContent = pk.x.toFixed(4) + ' rad';

      drawTrend(N);
    }

    function drawTrend(N) {
      var f = FourierKit.fit(trendCanvas, 140), ctx = f.ctx, W = f.w, H = f.h;
      // Nearly all of the convergence happens in the first handful of
      // terms, so a linear x-axis would squash the interesting part into
      // the leftmost pixel. Log spacing gives every decade equal room.
      var lo = 8.6, hi = 14.2, padL = 34, padR = 8, plotW = W - padL - padR;
      function ty(v) { return H - 20 - ((v - lo) / (hi - lo)) * (H - 36); }
      function tx(n) { return padL + (Math.log(n) / Math.log(MAXN)) * plotW; }

      ctx.font = '600 9px "IBM Plex Mono", monospace';
      [9, 10, 12, 14].forEach(function (v) {
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath(); ctx.moveTo(padL, ty(v)); ctx.lineTo(W - padR, ty(v)); ctx.stroke();
        ctx.fillStyle = 'rgba(226,232,240,0.4)';
        ctx.fillText(v + '%', 4, ty(v) + 3);
      });
      ctx.fillStyle = 'rgba(226,232,240,0.4)';
      [1, 3, 10, 30, 100, 200].forEach(function (n) {
        ctx.textAlign = n === 200 ? 'right' : (n === 1 ? 'left' : 'center');
        ctx.fillText(String(n), tx(n), H - 5);
      });
      ctx.textAlign = 'left';

      ctx.strokeStyle = 'rgba(251,191,36,0.7)';
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(padL, ty(8.949)); ctx.lineTo(W - padR, ty(8.949)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(251,191,36,0.9)';
      ctx.font = '700 10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('8.949% — it never gets below this', W - padR, ty(8.949) + 14);
      ctx.textAlign = 'left';

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (var n = 1; n <= MAXN; n++) {
        var py = ty(Math.max(lo, Math.min(hi, trend[n])));
        if (n === 1) ctx.moveTo(tx(n), py); else ctx.lineTo(tx(n), py);
      }
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(tx(N), ty(Math.max(lo, Math.min(hi, trend[N]))), 4.5, 0, FourierKit.TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(226,232,240,0.45)';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('harmonics, log scale →', W - padR, 13);
      ctx.textAlign = 'left';
    }

    termsSlider.addEventListener('input', draw);
    zoomSlider.addEventListener('input', draw);
    FourierKit.onResize(canvas, draw);
    draw();
  })();

/* ── Part 6: LAB E — live spectrum, scope and spectrogram ──────────────────── */
  (function () {
    var playBtn = document.getElementById('spec-play');
    var micBtn = document.getElementById('spec-mic');
    var freqSlider = document.getElementById('spec-freq');
    var freqVal = document.getElementById('spec-freq-val');
    var status = document.getElementById('spec-status');
    var scopeCanvas = document.getElementById('scope-canvas');
    var fftCanvas = document.getElementById('fft-canvas');
    var sgCanvas = document.getElementById('spectrogram-canvas');
    var timbreBtns = Array.prototype.slice.call(document.querySelectorAll('[data-timbre]'));
    if (!scopeCanvas) return;

    var hud = {
      peak: document.getElementById('spec-hud-peak'),
      note: document.getElementById('spec-hud-note'),
      source: document.getElementById('spec-hud-source'),
      bins: document.getElementById('spec-hud-bins')
    };

    var analyser = null, gain = null, osc = null, micStream = null, micNode = null;
    var timeData = null, freqData = null;
    var timbre = 'sine';
    var NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

    /* Harmonic recipes for the two "instrument" timbres. */
    var RECIPES = {
      clarinet: [1, 0, 0.6, 0, 0.35, 0, 0.22, 0, 0.14, 0, 0.08],
      organ: [1, 0.5, 0.35, 0.25, 0, 0.18, 0, 0.12, 0, 0, 0.08]
    };

    function ensureNodes() {
      var ac = FourierKit.audio();
      if (!ac) return null;
      if (!analyser) {
        analyser = ac.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.72;
        gain = ac.createGain();
        gain.gain.value = 0;
        gain.connect(analyser);
        analyser.connect(ac.destination);
        timeData = new Uint8Array(analyser.fftSize);
        freqData = new Uint8Array(analyser.frequencyBinCount);
        hud.bins.textContent = String(analyser.frequencyBinCount);
      }
      return ac;
    }

    function makeWave(ac) {
      if (RECIPES[timbre]) {
        var r = RECIPES[timbre];
        var real = new Float32Array(r.length + 1), imag = new Float32Array(r.length + 1);
        for (var i = 0; i < r.length; i++) imag[i + 1] = r[i];
        return ac.createPeriodicWave(real, imag);
      }
      return null;
    }

    function stopAll(quiet) {
      if (osc) {
        try {
          var ac = FourierKit.audio();
          gain.gain.cancelScheduledValues(0);
          gain.gain.setTargetAtTime(0, ac.currentTime, 0.02);
          osc.stop(ac.currentTime + 0.15);
        } catch (e) { /* already stopped */ }
        osc = null;
      }
      if (micNode) { try { micNode.disconnect(); } catch (e) {} micNode = null; }
      if (micStream) {
        micStream.getTracks().forEach(function (t) { t.stop(); });
        micStream = null;
      }
      playBtn.setAttribute('aria-pressed', 'false');
      playBtn.textContent = '▶ Play tone';
      micBtn.setAttribute('aria-pressed', 'false');
      micBtn.textContent = '🎤 Use microphone';
      hud.source.textContent = 'Idle';
      anim.force(false);
      FourierKit.release('spectrum');
      if (!quiet) {
        status.textContent = 'Stopped. Audio only runs while you hold it on.';
      }
    }

    function playTone() {
      var ac = ensureNodes();
      if (!ac) { status.textContent = 'This browser has no Web Audio support.'; return; }
      FourierKit.claim('spectrum', function () { stopAll(true); });
      if (osc) { try { osc.stop(); } catch (e) {} osc = null; }
      osc = ac.createOscillator();
      var pw = makeWave(ac);
      if (pw) osc.setPeriodicWave(pw); else osc.type = timbre;
      osc.frequency.value = parseFloat(freqSlider.value);
      osc.connect(gain);
      osc.start();
      gain.gain.cancelScheduledValues(ac.currentTime);
      gain.gain.setTargetAtTime(0.14, ac.currentTime, 0.03);
      playBtn.setAttribute('aria-pressed', 'true');
      playBtn.textContent = '⏹ Stop tone';
      micBtn.setAttribute('aria-pressed', 'false');
      micBtn.textContent = '🎤 Use microphone';
      hud.source.textContent = 'Tone · ' + timbre;
      status.textContent = 'Playing a ' + timbre + ' tone. Compare how many bars each timbre lights up.';
      anim.force(true);
    }

    function useMic() {
      var ac = ensureNodes();
      if (!ac || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = 'This browser will not give a page microphone access.';
        return;
      }
      FourierKit.claim('spectrum', function () { stopAll(true); });
      if (osc) { try { osc.stop(); } catch (e) {} osc = null; }
      gain.gain.setTargetAtTime(0, ac.currentTime, 0.02);
      status.textContent = 'Asking your browser for microphone permission…';
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        micStream = stream;
        micNode = ac.createMediaStreamSource(stream);
        micNode.connect(analyser);     // straight to the analyser — never to the speakers
        micBtn.setAttribute('aria-pressed', 'true');
        micBtn.textContent = '⏹ Microphone off';
        playBtn.setAttribute('aria-pressed', 'false');
        playBtn.textContent = '▶ Play tone';
        hud.source.textContent = 'Microphone';
        status.textContent = 'Listening. Nothing is recorded or sent anywhere — try whistling, then say "shhh".';
        anim.force(true);
      }).catch(function () {
        status.textContent = 'Microphone permission was declined. The built-in tones still work.';
        stopAll(true);
      });
    }

    /* ── Rendering ─────────────────────────────────────── */
    function drawScope() {
      var f = FourierKit.fit(scopeCanvas, 150), ctx = f.ctx, W = f.w, H = f.h;
      FourierKit.plotFrame(ctx, W, H);
      if (!analyser) return;
      analyser.getByteTimeDomainData(timeData);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      var span = Math.min(timeData.length, 700);
      for (var i = 0; i < span; i++) {
        var v = (timeData[i] - 128) / 128;
        var x = (i / (span - 1)) * W, y = H / 2 - v * (H * 0.42);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    function drawFFT() {
      var f = FourierKit.fit(fftCanvas, 150), ctx = f.ctx, W = f.w, H = f.h;
      if (!analyser) return;
      analyser.getByteFrequencyData(freqData);
      var ac = FourierKit.audio();
      var shown = Math.min(freqData.length, 256);       // roughly the lowest 5.5 kHz
      var bw = W / shown, peakIdx = 0, peakVal = 0;
      for (var i = 0; i < shown; i++) {
        var v = freqData[i] / 255;
        if (freqData[i] > peakVal) { peakVal = freqData[i]; peakIdx = i; }
        var h = v * (H - 16);
        ctx.fillStyle = 'hsl(' + (28 + v * 26) + ', 95%, ' + (36 + v * 26) + '%)';
        ctx.fillRect(i * bw, H - h, Math.max(1, bw - 0.5), h);
      }
      ctx.fillStyle = 'rgba(226,232,240,0.4)';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillText('0 Hz', 4, 12);
      var top = Math.round((shown * ac.sampleRate / analyser.fftSize) / 100) / 10;
      ctx.textAlign = 'right';
      ctx.fillText(top + ' kHz', W - 4, 12);
      ctx.textAlign = 'left';

      if (peakVal > 24) {
        var hz = peakIdx * ac.sampleRate / analyser.fftSize;
        hud.peak.textContent = Math.round(hz) + ' Hz';
        hud.note.textContent = noteName(hz);
      } else {
        hud.peak.textContent = '—';
        hud.note.textContent = '—';
      }
    }

    function noteName(hz) {
      if (hz < 20) return '—';
      var midi = Math.round(69 + 12 * Math.log2(hz / 440));
      return NOTES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
    }

    /* The spectrogram scrolls, so it must not be cleared each frame. */
    var sgCtx = null, sgW = 0, sgH = 150, sgDpr = 1;
    function sizeSpectrogram() {
      sgDpr = Math.min(window.devicePixelRatio || 1, 2);
      var host = sgCanvas.parentElement;
      sgW = Math.max(160, Math.round((host && host.clientWidth) || 320));
      sgCanvas.width = Math.round(sgW * sgDpr);
      sgCanvas.height = Math.round(sgH * sgDpr);
      sgCanvas.style.height = sgH + 'px';
      sgCtx = sgCanvas.getContext('2d');
      sgCtx.setTransform(1, 0, 0, 1, 0, 0);
      sgCtx.fillStyle = '#050b14';
      sgCtx.fillRect(0, 0, sgCanvas.width, sgCanvas.height);
    }
    function drawSpectrogram() {
      if (!sgCtx || !analyser) return;
      var w = sgCanvas.width, h = sgCanvas.height;
      var col = Math.max(1, Math.round(2 * sgDpr));
      sgCtx.drawImage(sgCanvas, -col, 0);
      var shown = Math.min(freqData.length, 256);
      for (var y = 0; y < h; y++) {
        var idx = Math.floor((1 - y / h) * (shown - 1));
        var v = freqData[idx] / 255;
        sgCtx.fillStyle = v < 0.02 ? '#050b14'
          : 'hsl(' + (250 - v * 230) + ', ' + (55 + v * 40) + '%, ' + (8 + v * 55) + '%)';
        sgCtx.fillRect(w - col, y, col, 1);
      }
    }

    var anim = FourierKit.loop(fftCanvas, function () {
      drawScope();
      drawFFT();
      drawSpectrogram();
    });
    anim.force(false);

    /* ── Wiring ────────────────────────────────────────── */
    timbreBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        timbre = btn.getAttribute('data-timbre');
        timbreBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        if (osc) playTone();
      });
    });
    playBtn.addEventListener('click', function () {
      if (osc) stopAll(); else playTone();
    });
    micBtn.addEventListener('click', function () {
      if (micStream) stopAll(); else useMic();
    });
    freqSlider.addEventListener('input', function () {
      freqVal.textContent = freqSlider.value + ' Hz';
      if (osc) osc.frequency.setTargetAtTime(parseFloat(freqSlider.value), FourierKit.audio().currentTime, 0.02);
    });
    FourierKit.onResize(sgCanvas, sizeSpectrogram);
    FourierKit.onResize(scopeCanvas, drawScope);
    // Idle, the FFT panel is blank — but it still has to be sized correctly
    // so the first frame after pressing play is not stretched.
    FourierKit.onResize(fftCanvas, function () { FourierKit.fit(fftCanvas, 150); });
    window.addEventListener('pagehide', function () { stopAll(true); });

    sizeSpectrogram();
    drawScope();
    FourierKit.fit(fftCanvas, 150);
  })();

/* ── Part 7: LAB F — 8×8 block DCT, the JPEG idea ──────────────────── */
  (function () {
    var keepSlider = document.getElementById('dct-keep');
    var keepVal = document.getElementById('dct-keep-val');
    var origCanvas = document.getElementById('dct-original');
    var reconCanvas = document.getElementById('dct-recon');
    var thirdCanvas = document.getElementById('dct-third');
    var thirdLabel = document.getElementById('dct-third-label');
    var sceneBtns = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));
    var viewBtns = Array.prototype.slice.call(document.querySelectorAll('[data-view]'));
    if (!origCanvas) return;

    var hud = {
      keep: document.getElementById('dct-hud-keep'),
      ratio: document.getElementById('dct-hud-ratio'),
      psnr: document.getElementById('dct-hud-psnr'),
      energy: document.getElementById('dct-hud-energy')
    };

    var SIZE = 128, BLOCK = 8, BLOCKS = SIZE / BLOCK, OUT = 192;
    var scene = 'sunset', view = 'error';
    var pixels = new Float32Array(SIZE * SIZE);       // luminance 0..255
    var coeffs = [];                                  // one Float32Array(64) per block
    var order = [];                                   // coefficient indices sorted by |value|

    /* Cosine table: C[u*8+x] = cos((2x+1)uπ/16) */
    var C = new Float32Array(64);
    for (var u = 0; u < 8; u++) {
      for (var x = 0; x < 8; x++) C[u * 8 + x] = Math.cos((2 * x + 1) * u * Math.PI / 16);
    }
    var CU = [Math.SQRT1_2, 1, 1, 1, 1, 1, 1, 1];

    function dct8(src, dst) {
      var tmp = new Float32Array(64), y, uu, vv, xx, s;
      for (y = 0; y < 8; y++) {
        for (uu = 0; uu < 8; uu++) {
          s = 0;
          for (xx = 0; xx < 8; xx++) s += src[y * 8 + xx] * C[uu * 8 + xx];
          tmp[y * 8 + uu] = 0.5 * CU[uu] * s;
        }
      }
      for (uu = 0; uu < 8; uu++) {
        for (vv = 0; vv < 8; vv++) {
          s = 0;
          for (y = 0; y < 8; y++) s += tmp[y * 8 + uu] * C[vv * 8 + y];
          dst[vv * 8 + uu] = 0.5 * CU[vv] * s;
        }
      }
    }
    function idct8(src, dst) {
      var tmp = new Float32Array(64), v, x, y, uu, s;
      for (v = 0; v < 8; v++) {
        for (x = 0; x < 8; x++) {
          s = 0;
          for (uu = 0; uu < 8; uu++) s += 0.5 * CU[uu] * src[v * 8 + uu] * C[uu * 8 + x];
          tmp[v * 8 + x] = s;
        }
      }
      for (x = 0; x < 8; x++) {
        for (y = 0; y < 8; y++) {
          s = 0;
          for (v = 0; v < 8; v++) s += 0.5 * CU[v] * tmp[v * 8 + x] * C[v * 8 + y];
          dst[y * 8 + x] = s;
        }
      }
    }

    /* ── Test scenes, drawn then read back as luminance ── */
    function buildScene() {
      var c = document.createElement('canvas');
      c.width = SIZE; c.height = SIZE;
      var g = c.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, SIZE, SIZE);

      if (scene === 'sunset') {
        var sky = g.createLinearGradient(0, 0, 0, SIZE * 0.7);
        sky.addColorStop(0, '#1b2a52'); sky.addColorStop(0.6, '#c2603a'); sky.addColorStop(1, '#f2c14a');
        g.fillStyle = sky; g.fillRect(0, 0, SIZE, SIZE * 0.72);
        g.fillStyle = '#fff3c4';
        g.beginPath(); g.arc(84, 62, 16, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#20242e';
        g.beginPath();
        g.moveTo(0, 92); g.lineTo(34, 54); g.lineTo(62, 88);
        g.lineTo(92, 46); g.lineTo(128, 92); g.lineTo(128, 128); g.lineTo(0, 128);
        g.closePath(); g.fill();
        g.fillStyle = '#0d1b2a'; g.fillRect(0, 92, SIZE, SIZE - 92);
        g.strokeStyle = 'rgba(242,193,74,0.65)'; g.lineWidth = 2;
        for (var i = 0; i < 7; i++) {
          g.beginPath(); g.moveTo(60, 98 + i * 4.5); g.lineTo(108 - i * 3, 98 + i * 4.5); g.stroke();
        }
      } else if (scene === 'checker') {
        for (var by = 0; by < 8; by++) {
          for (var bx = 0; bx < 8; bx++) {
            g.fillStyle = ((bx + by) % 2) ? '#f5f5f5' : '#101318';
            g.fillRect(bx * 16, by * 16, 16, 16);
          }
        }
        g.fillStyle = '#f97316';
        g.beginPath(); g.arc(64, 64, 30, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#0b1220';
        g.font = 'bold 26px sans-serif';
        g.textAlign = 'center';
        g.fillText('FFT', 64, 73);
      } else {
        var blobs = [[40, 44, 34, '#f8fafc'], [88, 52, 30, '#64748b'],
                     [58, 92, 38, '#e2e8f0'], [100, 100, 24, '#334155']];
        g.fillStyle = '#1e293b'; g.fillRect(0, 0, SIZE, SIZE);
        blobs.forEach(function (b) {
          var rg = g.createRadialGradient(b[0], b[1], 1, b[0], b[1], b[2]);
          rg.addColorStop(0, b[3]); rg.addColorStop(1, 'rgba(30,41,59,0)');
          g.fillStyle = rg;
          g.beginPath(); g.arc(b[0], b[1], b[2], 0, Math.PI * 2); g.fill();
        });
      }

      var img = g.getImageData(0, 0, SIZE, SIZE).data;
      for (var p = 0; p < SIZE * SIZE; p++) {
        pixels[p] = 0.299 * img[p * 4] + 0.587 * img[p * 4 + 1] + 0.114 * img[p * 4 + 2];
      }
      transform();
    }

    function transform() {
      coeffs = []; order = [];
      var block = new Float32Array(64), out;
      for (var by = 0; by < BLOCKS; by++) {
        for (var bx = 0; bx < BLOCKS; bx++) {
          for (var y = 0; y < 8; y++) {
            for (var x = 0; x < 8; x++) {
              block[y * 8 + x] = pixels[(by * 8 + y) * SIZE + (bx * 8 + x)] - 128;
            }
          }
          out = new Float32Array(64);
          dct8(block, out);
          coeffs.push(out);
          var idx = [];
          for (var i = 0; i < 64; i++) idx.push(i);
          idx.sort(function (a, b) { return Math.abs(out[b]) - Math.abs(out[a]); });
          order.push(idx);
        }
      }
    }

    function paint(canvas, data) {
      var small = document.createElement('canvas');
      small.width = SIZE; small.height = SIZE;
      var sctx = small.getContext('2d');
      var img = sctx.createImageData(SIZE, SIZE);
      for (var i = 0; i < SIZE * SIZE; i++) {
        var v = Math.max(0, Math.min(255, data[i]));
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
      }
      sctx.putImageData(img, 0, 0);
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, OUT, OUT);
      ctx.drawImage(small, 0, 0, OUT, OUT);
    }

    function drawBasis() {
      var ctx = thirdCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 0, OUT, OUT);
      var tile = OUT / 8, one = new Float32Array(64), out = new Float32Array(64);
      for (var v = 0; v < 8; v++) {
        for (var u = 0; u < 8; u++) {
          one.fill(0);
          one[v * 8 + u] = 100;
          idct8(one, out);
          var small = document.createElement('canvas');
          small.width = 8; small.height = 8;
          var sctx = small.getContext('2d');
          var img = sctx.createImageData(8, 8);
          for (var i = 0; i < 64; i++) {
            var g = Math.max(0, Math.min(255, 128 + out[i] * 1.6));
            img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g;
            img.data[i * 4 + 3] = 255;
          }
          sctx.putImageData(img, 0, 0);
          ctx.drawImage(small, u * tile + 1, v * tile + 1, tile - 2, tile - 2);
        }
      }
    }

    function render() {
      var K = parseInt(keepSlider.value, 10);
      var recon = new Float32Array(SIZE * SIZE);
      var trunc = new Float32Array(64), out = new Float32Array(64);
      var keptE = 0, allE = 0, mse = 0, b = 0;

      for (var by = 0; by < BLOCKS; by++) {
        for (var bx = 0; bx < BLOCKS; bx++, b++) {
          var co = coeffs[b], ord = order[b];
          trunc.fill(0);
          for (var i = 0; i < 64; i++) {
            var e = co[ord[i]] * co[ord[i]];
            allE += e;
            if (i < K) { trunc[ord[i]] = co[ord[i]]; keptE += e; }
          }
          idct8(trunc, out);
          for (var y = 0; y < 8; y++) {
            for (var x = 0; x < 8; x++) {
              var p = (by * 8 + y) * SIZE + (bx * 8 + x);
              var v = out[y * 8 + x] + 128;
              recon[p] = v;
              var d = v - pixels[p];
              mse += d * d;
            }
          }
        }
      }
      mse /= SIZE * SIZE;

      paint(origCanvas, pixels);
      paint(reconCanvas, recon);
      if (view === 'basis') {
        drawBasis();
        thirdLabel.textContent = 'The 64 patterns every block is built from';
      } else {
        var diff = new Float32Array(SIZE * SIZE);
        for (var q = 0; q < diff.length; q++) diff[q] = Math.abs(recon[q] - pixels[q]) * 4;
        paint(thirdCanvas, diff);
        thirdLabel.textContent = 'What was thrown away';
      }

      keepVal.textContent = K;
      hud.keep.textContent = K + ' / 64';
      hud.ratio.textContent = (64 / K).toFixed(1) + 'x';
      hud.psnr.textContent = mse < 1e-6 ? 'perfect' : (10 * Math.log10(255 * 255 / mse)).toFixed(1) + ' dB';
      hud.energy.textContent = allE > 0 ? ((keptE / allE) * 100).toFixed(2) + '%' : '—';
    }

    keepSlider.addEventListener('input', render);
    sceneBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        scene = btn.getAttribute('data-scene');
        sceneBtns.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        buildScene();
        render();
      });
    });
    viewBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        view = btn.getAttribute('data-view');
        viewBtns.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        render();
      });
    });

    buildScene();
    render();
  })();

/* ── Part 8: QUIZ + section highlighting ──────────────────── */
  (function () {
    var scoreEl = document.getElementById('quiz-score');
    var resetBtn = document.getElementById('quiz-reset');
    var questions = Array.prototype.slice.call(document.querySelectorAll('.four-q'));
    var answered = 0, correct = 0;

    function updateScore() {
      scoreEl.textContent = answered === 0
        ? '0 of ' + questions.length + ' answered'
        : correct + ' correct out of ' + answered + ' answered' +
          (answered === questions.length ? ' — all done!' : '');
    }

    document.querySelectorAll('.four-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var qId = btn.getAttribute('data-q');
        var container = document.getElementById(qId);
        if (!container || container.dataset.answered) return;
        container.dataset.answered = '1';
        answered++;

        var isRight = btn.getAttribute('data-correct') === 'true';
        if (isRight) correct++;
        var fb = document.getElementById('fb-' + qId);

        container.querySelectorAll('.four-opt').forEach(function (b) {
          b.disabled = true;
          if (b.getAttribute('data-correct') === 'true') b.classList.add('correct');
        });
        if (!isRight) btn.classList.add('wrong');
        if (fb) {
          fb.textContent = (isRight ? '✓ Correct. ' : '✗ Not quite. ') + (fb.getAttribute('data-why') || '');
        }
        updateScore();
      });
    });

    resetBtn.addEventListener('click', function () {
      answered = 0; correct = 0;
      questions.forEach(function (q) {
        delete q.dataset.answered;
        q.querySelectorAll('.four-opt').forEach(function (b) {
          b.disabled = false;
          b.classList.remove('correct', 'wrong');
        });
        var fb = q.querySelector('.four-q-feedback');
        if (fb) fb.textContent = '';
      });
      updateScore();
      questions[0].scrollIntoView({ block: 'center' });
    });

    updateScore();
  })();

/* ── Part 9: QUIZ + section highlighting ──────────────────── */
  (function () {
    var links = Array.prototype.slice.call(document.querySelectorAll('#four-pane-map .four-panel-link'));
    var sections = links.map(function (l) {
      var el = document.getElementById(l.getAttribute('href').slice(1));
      return el ? { el: el, link: l } : null;
    }).filter(Boolean);
    if (!sections.length) return;

    function onScroll() {
      var y = window.scrollY + 140, active = sections[0];
      sections.forEach(function (s) {
        if (s.el.getBoundingClientRect().top + window.scrollY <= y) active = s;
      });
      links.forEach(function (l) { l.classList.remove('active'); });
      active.link.classList.add('active');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();
