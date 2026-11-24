/* Recording Session lesson UI (recording-studio-sessions.html).
 * Routing rules and maths live in studio-signal.js (DOM-free, tested). */
(function () {
  'use strict';
  var S = window.StudioSignal;
  var Synth = window.AudioLabSynth;
  if (!S) return;
  var $ = function (id) { return document.getElementById(id); };
  var all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function press(buttons, active) { buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === active)); }); }
  function fmtDb(db) { return db === -Infinity ? 'off' : (db > 0 ? '+' : '') + db.toFixed(0) + ' dB'; }
  function dbToLin(db) { return db === -Infinity || db <= -80 ? 0 : Math.pow(10, db / 20); }

  /* ── Workbench tabs & hash navigation ─────────────────────────────────────── */
  var tabButtons = all('#studio-workbench [role="tab"][data-panel]');
  var tabPanels = all('#studio-workbench .te-wb-panel');
  var HASH_TABS = { '#paths': 'paths', '#solo': 'solo', '#patchbay': 'patchbay', '#hearback': 'hearback', '#bit-depth': 'bit-depth' };

  function activateTab(panelId, moveFocus) {
    tabButtons.forEach(function (btn) {
      var active = btn.getAttribute('data-panel') === panelId;
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.tabIndex = active ? 0 : -1;
      if (active && moveFocus) btn.focus();
    });
    tabPanels.forEach(function (panel) {
      panel.hidden = panel.id !== panelId;
    });
  }

  tabButtons.forEach(function (btn, idx) {
    btn.addEventListener('click', function () {
      activateTab(btn.getAttribute('data-panel'), false);
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var dir = e.key === 'ArrowRight' ? 1 : -1;
        var next = (idx + dir + tabButtons.length) % tabButtons.length;
        activateTab(tabButtons[next].getAttribute('data-panel'), true);
        e.preventDefault();
      }
    });
  });

  function syncTabFromHash() {
    var target = HASH_TABS[window.location.hash];
    if (target) activateTab(target, false);
  }
  window.addEventListener('hashchange', syncTabFromHash);
  syncTabFromHash();

  /* ── 1. Channel path / monitor path explorer ─────────────────────────────── */
  (function consolePaths() {
    var readout = $('rs-path-readout');
    if (!readout) return;
    var state = { mode: 'tracking', chop: 'pre' };
    var modeBtns = all('[data-rs-mode]');
    var chopBtns = all('[data-rs-chop]');
    var nodes = {};
    all('[data-node]').forEach(function (n) { nodes[n.dataset.node] = n; });

    var CHOP_TEXT = {
      input: '<strong>CHOP = INPUT.</strong> The recording captures the raw preamp. Control-room EQ, compression, and faders never alter the DAW file.',
      pre: '<strong>CHOP = PRE FADE.</strong> Strip EQ and compression are committed to the track, while large-fader moves stay out of the recording.',
      post: '<strong>CHOP = POST FADE.</strong> Every move of the large fader prints to the DAW — check carefully before rolling.',
      efx: '<strong>CHOP = EFX.</strong> An FX send exits through the channel output so you print a wet return onto its own DAW track.'
    };

    function render() {
      var rec = {}, mon = {}, idle = {}, chopAt = null;
      var tracking = state.mode === 'tracking';
      $('rs-chop-row').hidden = !tracking;
      if (tracking) {
        $('rs-input-label').textContent = 'Mic in';
        $('rs-out-label').textContent = state.chop === 'efx' ? 'FX send → CHOP' : 'CHOP → DAW in';
        $('rs-out-sub').textContent = 'channel output';
        $('rs-ret-label').textContent = 'DAW return';
        $('rs-daw-sub').textContent = 'records the CHOP, plays back for input monitoring';
        rec.input = rec.out = true;
        if (state.chop !== 'input') rec.process = true;
        if (state.chop === 'post' || state.chop === 'efx') rec.fader = true;
        chopAt = { input: 'input', pre: 'process', post: 'fader', efx: 'out' }[state.chop];
        mon.ret = mon.small = mon.bus = mon.room = true;
        readout.innerHTML = '<strong>Tracking:</strong> Channel path (red) feeds the recorder; Monitor path (blue) feeds your speakers. ' + CHOP_TEXT[state.chop];
      } else {
        $('rs-input-label').textContent = 'DAW playback';
        $('rs-out-label').textContent = '→ Mix bus';
        $('rs-out-sub').textContent = 'routing';
        $('rs-ret-label').textContent = 'Free: FX returns';
        $('rs-daw-sub').textContent = 'plays every track out, records the stereo print';
        mon.input = mon.process = mon.fader = mon.out = true;
        rec.bus = mon.bus = mon.room = true;
        idle.ret = idle.small = true;
        readout.innerHTML = '<strong>Mixdown:</strong> DAW tracks return into the main Channel path (large faders, EQ, dynamics) and sum into the stereo Mix Bus for printing. The small Monitor fader stays free for FX returns.';
      }
      Object.keys(nodes).forEach(function (k) {
        var n = nodes[k];
        n.classList.toggle('rec', !!rec[k]);
        n.classList.toggle('mon', !!mon[k]);
        n.classList.toggle('idle', !!idle[k]);
        n.classList.toggle('chop', k === chopAt);
      });
    }
    modeBtns.forEach(function (b) { b.addEventListener('click', function () { state.mode = b.dataset.rsMode; press(modeBtns, b); render(); }); });
    chopBtns.forEach(function (b) { b.addEventListener('click', function () { state.chop = b.dataset.rsChop; press(chopBtns, b); render(); }); });
    render();
  }());

  /* ── Shared Lazy Web Audio Engine (Solo 4-stem + HearBack + Bit Depth) ──── */
  var actx = null;
  var stems = null;

  function ensureAudio() {
    if (!actx) {
      actx = Synth ? Synth.createContext() : new (window.AudioContext || window.webkitAudioContext)();
    }
    if (actx.state === 'suspended') actx.resume();
    if (!stems && Synth) {
      stems = Synth.createBandStems(actx, { seconds: 2.4 });
    }
    return actx;
  }

  /* ── 2. Solo modes + Interactive Faders + 4-Stem Print/Room Audio ────────── */
  (function soloModes() {
    var strips = $('rs-strips');
    if (!strips) return;
    var mode = 'SIP';
    var listenBus = 'room';
    var soloAudioOn = false;
    var soloAudioGraph = null;

    var channels = [
      { name: 'Kick', fader: -6 },
      { name: 'Bass', fader: -9 },
      { name: 'Guitar', fader: -12 },
      { name: 'Vocal', fader: -4, solo: true },
      { name: 'Reverb', fader: -16, ret: true }
    ];
    var modeBtns = all('[data-solo-mode]');
    var hearBtn = $('rs-solo-audio');
    var busRoomBtn = $('rs-solo-hear-room');
    var busPrintBtn = $('rs-solo-hear-print');

    channels.forEach(function (c, i) {
      var d = document.createElement('div');
      d.className = 'rs-strip';
      d.innerHTML =
        '<b>' + c.name + '</b>' +
        '<output>' + c.fader + ' dB</output>' +
        '<input type="range" min="-30" max="0" step="1" value="' + c.fader + '" aria-label="' + c.name + ' fader level" />' +
        '<button type="button" class="solo" data-k="solo" aria-pressed="false">SOLO</button>' +
        '<button type="button" class="mute" data-k="mute" aria-pressed="false">MUTE</button>' +
        (c.ret ? '<button type="button" class="iso" data-k="isolate" aria-pressed="false">SOLO ISO</button>' : '');
      var rng = d.querySelector('input[type="range"]');
      var out = d.querySelector('output');
      rng.addEventListener('input', function () {
        c.fader = Number(rng.value);
        out.textContent = c.fader + ' dB';
        render();
      });
      all('button', d).forEach(function (b) {
        b.setAttribute('aria-label', b.textContent + ' ' + c.name);
        b.setAttribute('aria-pressed', String(!!c[b.dataset.k]));
        b.addEventListener('click', function () {
          c[b.dataset.k] = !c[b.dataset.k];
          b.setAttribute('aria-pressed', String(c[b.dataset.k]));
          render();
        });
      });
      strips.appendChild(d);
      c.index = i;
    });

    function ensureSoloAudio() {
      var ctx = ensureAudio();
      if (soloAudioGraph || !stems) return;
      var conv = ctx.createConvolver();
      conv.buffer = Synth.createRoomIR(ctx, { rt60: 1.45, preDelayMs: 14, damping: 0.45 });
      var limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.ratio.value = 10;
      var master = ctx.createGain();
      master.gain.value = 0;
      limiter.connect(master).connect(ctx.destination);

      var kickSrc = ctx.createBufferSource();
      kickSrc.buffer = stems.kick;
      kickSrc.loop = true;
      var bassSrc = ctx.createBufferSource();
      bassSrc.buffer = Synth.createDrumLoopBuffer(ctx, { seconds: 2.4 });
      bassSrc.loop = true;
      var gtrSrc = ctx.createBufferSource();
      gtrSrc.buffer = stems.guitar;
      gtrSrc.loop = true;
      var voxSrc = ctx.createBufferSource();
      voxSrc.buffer = stems.vocal;
      voxSrc.loop = true;

      var gains = channels.map(function () {
        var g = ctx.createGain();
        g.gain.value = 0;
        g.connect(limiter);
        return g;
      });
      kickSrc.connect(gains[0]);
      bassSrc.connect(gains[1]);
      gtrSrc.connect(gains[2]);
      voxSrc.connect(gains[3]);
      voxSrc.connect(conv);
      conv.connect(gains[4]);

      kickSrc.start();
      bassSrc.start();
      gtrSrc.start();
      voxSrc.start();
      soloAudioGraph = { gains: gains, master: master };
    }

    function updateSoloAudio(res) {
      if (!soloAudioGraph || !actx) return;
      var active = soloAudioOn;
      Synth.smooth(soloAudioGraph.master.gain, active ? 0.42 : 0, actx, 0.02);
      if (!active) return;
      var list = listenBus === 'print' ? res.mixBus : res.controlRoom;
      for (var i = 0; i < soloAudioGraph.gains.length; i++) {
        var db = list[i].level;
        Synth.smooth(soloAudioGraph.gains[i].gain, db === -Infinity ? 0 : dbToLin(db), actx, 0.02);
      }
    }

    function meters(host, list) {
      host.innerHTML = '';
      list.forEach(function (m) {
        var row = document.createElement('div');
        var on = m.level !== -Infinity;
        row.className = 'rs-meter' + (on ? '' : ' off');
        var pct = on ? Math.max(4, Math.min(100, (m.level + 30) / 30 * 100)) : 0;
        row.innerHTML = '<span>' + m.name + '</span><div class="rs-meter-track"><div class="rs-meter-fill" style="width:' + pct + '%"></div></div><output>' + fmtDb(m.level) + '</output>';
        host.appendChild(row);
      });
    }

    function render() {
      var r = S.solo(channels, mode);
      meters($('rs-bus'), r.mixBus);
      meters($('rs-room'), r.controlRoom);
      updateSoloAudio(r);

      var out = $('rs-solo-readout');
      var reverb = channels[4];
      var liveInPrint = r.mixBus.filter(function (m) { return m.level !== -Infinity; }).map(function (m) { return m.name; });
      var liveInRoom = r.controlRoom.filter(function (m) { return m.level !== -Infinity; }).map(function (m) { return m.name; });
      var msg;

      if (!r.anySolo) {
        msg = liveInPrint.length
          ? 'Nothing soloed: speakers and the print bus receive the full unmuted mix.'
          : 'All channels are muted — both print bus and control room are silent.';
        out.className = 'te-readout' + (liveInPrint.length ? '' : ' bad');
      } else if (mode === 'SIP') {
        if (!liveInPrint.length) {
          msg = '<strong>Destructive mute + SIP silence:</strong> Your soloed channel(s) are muted, so SIP muted everything else and left <em>both the print bus and control room completely silent</em>!';
        } else {
          msg = '<strong>Destructive (SIP):</strong> Other channels are cut on the mix bus itself, so a recording print only captures <strong>' + liveInPrint.join(' + ') + '</strong>. ';
          msg += (reverb.solo || reverb.isolate) && !reverb.mute
            ? 'Reverb return survives because it is ' + (reverb.isolate ? 'SOLO ISO.' : 'soloed too.')
            : 'Notice the reverb died too — press <strong>SOLO ISO</strong> on Reverb to keep the tail.';
        }
        out.className = 'te-readout bad';
      } else {
        if (!liveInRoom.length) {
          msg = '<strong>Non-destructive (' + mode + '):</strong> Mix bus print is untouched (' + liveInPrint.length + ' channels live), while your soloed channel is currently muted in AFL.';
        } else {
          msg = '<strong>Non-destructive (' + mode + '):</strong> The print mix bus stays intact while the control room switches to <strong>' + liveInRoom.join(' + ') + '</strong>' +
            (mode === 'PFL' ? ' (<em>pre-fader &amp; pre-mute</em>, at unity level).' : ' (<em>post-fader</em>, respecting level &amp; mute).');
        }
        out.className = 'te-readout good';
      }
      out.innerHTML = msg;
    }

    modeBtns.forEach(function (b) { b.addEventListener('click', function () { mode = b.dataset.soloMode; press(modeBtns, b); render(); }); });
    if (busRoomBtn && busPrintBtn) {
      busRoomBtn.addEventListener('click', function () { listenBus = 'room'; press([busRoomBtn, busPrintBtn], busRoomBtn); render(); });
      busPrintBtn.addEventListener('click', function () { listenBus = 'print'; press([busRoomBtn, busPrintBtn], busPrintBtn); render(); });
    }
    if (hearBtn) {
      hearBtn.addEventListener('click', function () {
        if (!soloAudioOn) ensureSoloAudio();
        soloAudioOn = !soloAudioOn;
        hearBtn.setAttribute('aria-pressed', soloAudioOn ? 'true' : 'false');
        hearBtn.textContent = soloAudioOn ? '🔇 Stop Mix' : '🔊 Listen Live';
        render();
      });
    }
    render();
  }());

  /* ── 3. Patch point ─────────────────────────────────────────────────────── */
  (function patchPoint() {
    var why = $('pb-why');
    if (!why) return;
    var state = { normal: 'half', top: false, bottom: false };
    var normBtns = all('[data-pb-normal]');
    var plugBtns = all('[data-pb-plug]');
    function cls(el, name, on) { if (el) el.classList.toggle(name, !!on); }

    function render() {
      var r = S.patchbay(state.normal, state);
      cls($('pb-jack-top'), 'plugged', r.top);
      cls($('pb-jack-bot'), 'plugged', r.bottom);
      var norm = $('pb-w-norm');
      cls(norm, 'on', r.linkIntact);
      cls(norm, 'broken', state.normal === 'none' || !r.linkIntact);
      $('pb-norm-t').textContent = state.normal === 'none' ? 'no normal' : r.linkIntact ? 'normal' : 'broken';
      var top = $('pb-cord-top'), bot = $('pb-cord-bot');
      cls(top, 'in', r.top); cls(top, 'on', r.top);
      cls(bot, 'in', r.bottom); cls(bot, 'alt', r.bottom);
      cls($('pb-ext-top'), 'show', r.top);
      cls($('pb-ext-bot'), 'show', r.bottom);
      ['pb-ext-top-t', 'pb-ext-bot-t'].forEach(function (id, i) {
        var t = $(id); if (t) t.style.opacity = (i ? r.bottom : r.top) ? 1 : 0;
      });
      var outLabel = document.querySelector('#pb-ext-bot-t + text');
      if (outLabel) outLabel.style.opacity = r.bottom ? 1 : 0;

      // Wire from bottom jack to DAW IN carries red (normalled source) or cyan (bottom patch cord)
      var dst = $('pb-w-dst');
      cls(dst, 'on', r.destination === 'source');
      cls(dst, 'alt', r.destination === 'patch');

      $('pb-dest').textContent = { source: 'The preamp', patch: 'Compressor out', silence: 'Silence' }[r.destination];
      $('pb-link').textContent = state.normal === 'none' ? 'None' : r.linkIntact ? 'Intact' : 'Broken';
      $('pb-cord').textContent = r.top ? (r.split ? 'Preamp (split)' : 'Preamp (only)') : '—';
      why.textContent = r.why;
      why.className = 'te-readout ' + (r.destination === 'silence' && (r.top || state.normal === 'none') ? 'bad' : r.split ? 'good' : '');
    }
    normBtns.forEach(function (b) { b.addEventListener('click', function () { state.normal = b.dataset.pbNormal; press(normBtns, b); render(); }); });
    plugBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.pbPlug;
        state[k] = !state[k];
        b.setAttribute('aria-pressed', String(state[k]));
        render();
      });
    });
    render();
  }());

  /* ── 4. HearBack Personal Cue Mixer ─────────────────────────────────────── */
  (function hearBackMixer() {
    var voxSlider = $('hb-cue-vox');
    if (!voxSlider) return;
    var fohFader = $('hb-foh-fader');
    var clickSlider = $('hb-cue-click');
    var masterSlider = $('hb-cue-master');
    var modeBtns = all('[data-hb-mode]');
    var hearBtn = $('hb-audio-btn');
    var readout = $('hb-readout');

    var cueMode = 'pre';
    var hbOn = false;
    var hbGraph = null;

    function ensureHbAudio() {
      var ctx = ensureAudio();
      if (hbGraph || !stems) return;
      var limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.ratio.value = 12;
      var master = ctx.createGain();
      master.gain.value = 0;
      limiter.connect(master).connect(ctx.destination);

      var voxSrc = ctx.createBufferSource();
      voxSrc.buffer = stems.vocal;
      voxSrc.loop = true;
      var bandSrc = ctx.createBufferSource();
      bandSrc.buffer = stems.keys;
      bandSrc.loop = true;

      // Synthesize a clean 120 BPM metronome click loop matching 2.4s buffer
      var clickBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2.4), ctx.sampleRate);
      var cd = clickBuf.getChannelData(0);
      for (var beat = 0; beat < 4; beat++) {
        var offset = Math.floor(beat * 0.6 * ctx.sampleRate);
        var freq = beat === 0 ? 1560 : 1040;
        for (var j = 0; j < Math.floor(0.03 * ctx.sampleRate) && offset + j < cd.length; j++) {
          var t = j / ctx.sampleRate;
          cd[offset + j] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 140) * 0.65;
        }
      }
      var clickSrc = ctx.createBufferSource();
      clickSrc.buffer = clickBuf;
      clickSrc.loop = true;

      var gv = ctx.createGain();
      var gb = ctx.createGain();
      var gc = ctx.createGain();
      voxSrc.connect(gv).connect(limiter);
      bandSrc.connect(gb).connect(limiter);
      clickSrc.connect(gc).connect(limiter);

      voxSrc.start();
      bandSrc.start();
      clickSrc.start();
      hbGraph = { gv: gv, gb: gb, gc: gc, master: master };
    }

    function render() {
      var fohDb = Number(fohFader.value);
      var voxCuePct = Number(voxSlider.value);
      var clickPct = Number(clickSlider.value);
      var masterPct = Number(masterSlider.value);

      $('hb-foh-out').textContent = fohDb + ' dB';
      $('hb-cue-vox-out').textContent = voxCuePct + '%';
      $('hb-cue-click-out').textContent = clickPct + '%';
      $('hb-cue-master-out').textContent = masterPct + '%';

      var fohScale = cueMode === 'post' ? dbToLin(fohDb) : 1;
      var effectiveVoxPct = Math.round(voxCuePct * fohScale);

      if (cueMode === 'pre') {
        readout.className = 'te-readout good';
        readout.innerHTML = '<strong>PRE-FADER cue active:</strong> Your control-room vocal fader sits at <strong>' + fohDb + ' dB</strong>, while the singer’s HearBack holds steady at <strong>' + voxCuePct + '%</strong>. Pull your fader up or down — their cans never budge.';
      } else {
        readout.className = 'te-readout' + (fohDb < -6 ? ' bad' : '');
        readout.innerHTML = '<strong>POST-FADER mistake:</strong> Pulling your vocal fader to <strong>' + fohDb + ' dB</strong> drags the singer’s own voice down to <strong>' + effectiveVoxPct + '%</strong> in her headphones — the classic cause of “I can’t hear myself!”';
      }

      if (hbGraph && actx) {
        Synth.smooth(hbGraph.master.gain, hbOn ? (masterPct / 100) * 0.45 : 0, actx, 0.02);
        Synth.smooth(hbGraph.gv.gain, (voxCuePct / 100) * fohScale, actx, 0.02);
        Synth.smooth(hbGraph.gb.gain, 0.45, actx, 0.02);
        Synth.smooth(hbGraph.gc.gain, (clickPct / 100) * 0.55, actx, 0.02);
      }
    }

    modeBtns.forEach(function (b) { b.addEventListener('click', function () { cueMode = b.dataset.hbMode; press(modeBtns, b); render(); }); });
    [fohFader, voxSlider, clickSlider, masterSlider].forEach(function (el) {
      el.addEventListener('input', render);
      el.addEventListener('change', render);
    });
    if (hearBtn) {
      hearBtn.addEventListener('click', function () {
        if (!hbOn) ensureHbAudio();
        hbOn = !hbOn;
        hearBtn.setAttribute('aria-pressed', hbOn ? 'true' : 'false');
        hearBtn.textContent = hbOn ? '🔇 Stop Headphones' : '🔊 Hear Singer’s Headphones';
        render();
      });
    }
    render();
  }());

  /* ── 5. Bit depth / sample rate + Quantization Noise Audition ───────────── */
  (function digitalCalc() {
    var bitsSel = $('rs-bits');
    if (!bitsSel) return;
    var rateSel = $('rs-rate'), peak = $('rs-peak');
    var quantBtns = all('[data-quant-bits]');
    var quantTimer = null;

    function playQuantDemo(demoBits) {
      var ctx = ensureAudio();
      if (!stems) return;
      if (quantTimer) clearTimeout(quantTimer);

      // Copy 1.8 s of quiet (-24 dBFS) keys pad, quantize at demoBits, and normalize back up
      // so students immediately hear 24-bit clean vs 16-bit vs 8-bit quantization hiss/grit!
      var sr = ctx.sampleRate;
      var dur = 1.8;
      var len = Math.floor(sr * dur);
      var buf = ctx.createBuffer(1, len, sr);
      var out = buf.getChannelData(0);
      var src = stems.keys.getChannelData(0);
      var gain = dbToLin(-24);
      var levels = Math.pow(2, demoBits - 1);
      var fadeSamples = Math.floor(0.04 * sr);

      for (var i = 0; i < len; i++) {
        var x = src[i % src.length] * gain;
        var q = Math.round(x * levels) / levels;
        var boosted = Math.max(-0.9, Math.min(0.9, q / gain * 0.42));
        var env = i < fadeSamples ? i / fadeSamples : (i > len - fadeSamples ? (len - i) / fadeSamples : 1);
        out[i] = boosted * env;
      }

      var node = ctx.createBufferSource();
      node.buffer = buf;
      node.connect(ctx.destination);
      node.start();
    }

    quantBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var bits = Number(b.dataset.quantBits);
        playQuantDemo(bits);
        b.setAttribute('aria-pressed', 'true');
        if (quantTimer) clearTimeout(quantTimer);
        quantTimer = setTimeout(function () { b.setAttribute('aria-pressed', 'false'); }, 1800);
      });
    });

    function render() {
      var float = bitsSel.value === '32f';
      var bits = float ? 32 : Number(bitsSel.value);
      var rate = Number(rateSel.value);

      // Extend peak slider to +6 dBFS exclusively in 32-bit float mode
      peak.max = float ? '6' : '0';
      if (!float && Number(peak.value) > 0) peak.value = '0';

      var p = Number(peak.value);
      $('rs-peak-out').textContent = (p > 0 ? '+' : '') + p + ' dBFS';
      var d = S.digital(bits, rate, { float: float, peak: p });
      $('rs-dr').textContent = float ? '1,528 dB (float)' : '≈ ' + d.dynamicRange.toFixed(0) + ' dB';
      $('rs-snr').textContent = float ? 'Headroom above 0!' : d.peaksAboveNoise.toFixed(0) + ' dB';
      $('rs-nyq').textContent = (d.nyquist / 1000).toFixed(d.nyquist % 1000 ? 2 : 0) + ' kHz';
      $('rs-size').textContent = d.mbPerMinute.toFixed(1) + ' MB';

      var o = $('rs-calc-readout');
      var lines = [];
      if (float) {
        lines.push('32-bit float represents exponents dynamically, so peaks at +' + Math.max(0, p) + ' dBFS above 0 dBFS recover cleanly without flattening tops — record stems at 24-bit, process inside 32-bit float.');
      } else if (d.peaksAboveNoise < 85) {
        lines.push('With peaks at ' + p + ' dBFS, quiet notes sit only ' + d.peaksAboveNoise.toFixed(0) + ' dB above quantization noise — leaving generous headroom at 16-bit reveals audible hiss.');
      } else {
        lines.push('Peaks at ' + p + ' dBFS stay ' + d.peaksAboveNoise.toFixed(0) + ' dB above the noise floor — quieter than any vocal booth, giving safe headroom.');
      }
      lines.push('Nyquist sits at ' + (d.nyquist / 1000) + ' kHz (' + (d.filterRoomHz / 1000).toFixed(2).replace(/\.?0+$/, '') + ' kHz transition guard band above 20 kHz).');
      o.innerHTML = lines.join(' ');
      o.className = 'te-readout' + (!float && bits === 24 && rate === 48000 ? ' good' : (float && p > 0 ? ' good' : ''));
    }
    [bitsSel, rateSel, peak].forEach(function (el) { el.addEventListener('input', render); el.addEventListener('change', render); });
    render();
  }());

  /* ── 6. Session check + Reset ───────────────────────────────────────────── */
  (function quiz() {
    var qs = all('.rs-q');
    if (!qs.length) return;
    var score = $('rs-score'), resetBtn = $('rs-quiz-reset'), right = 0, done = 0;

    function updateScore() {
      if (!score) return;
      score.textContent = right + ' of ' + done + ' answered correctly' + (done === qs.length ? ' — Session check complete!' : '.');
    }

    qs.forEach(function (q) {
      var why = q.querySelector('.rs-why');
      if (why) q.dataset.rawWhy = why.innerHTML;
      var buttons = all('button[data-choice]', q);
      buttons.forEach(function (b) {
        b.addEventListener('click', function () {
          if (q.dataset.done) return;
          q.dataset.done = '1';
          var ok = b.dataset.choice === q.dataset.answer;
          b.classList.add(ok ? 'right' : 'wrong');
          buttons.forEach(function (o) {
            if (o.dataset.choice === q.dataset.answer) o.classList.add('right');
            o.setAttribute('aria-disabled', 'true');
          });
          if (why) {
            why.hidden = false;
            why.innerHTML = (ok ? '<strong>Right.</strong> ' : '<strong>Not quite.</strong> ') + (q.dataset.rawWhy || '');
          }
          done++;
          if (ok) right++;
          updateScore();
        });
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        right = 0;
        done = 0;
        qs.forEach(function (q) {
          delete q.dataset.done;
          var why = q.querySelector('.rs-why');
          if (why) {
            why.hidden = true;
            if (q.dataset.rawWhy) why.innerHTML = q.dataset.rawWhy;
          }
          all('button[data-choice]', q).forEach(function (b) {
            b.classList.remove('right', 'wrong');
            b.removeAttribute('aria-disabled');
          });
        });
        if (score) score.textContent = 'Select an answer on each studio scenario above.';
      });
    }
  }());
}());
