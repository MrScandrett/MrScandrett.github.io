/* Recording Session lesson UI (recording-studio-sessions.html).
 * Routing rules and maths live in studio-signal.js (DOM-free, tested). */
(function () {
  'use strict';
  var S = window.StudioSignal;
  if (!S) return;
  var $ = function (id) { return document.getElementById(id); };
  var all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function press(buttons, active) { buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === active)); }); }
  function fmtDb(db) { return db === -Infinity ? 'off' : (db > 0 ? '+' : '') + db.toFixed(0) + ' dB'; }

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
      input: '<strong>CHOP = INPUT.</strong> The recording is the raw preamp. Your EQ, compression and fader moves are only for listening, so every choice stays open for the mix.',
      pre: '<strong>CHOP = PRE FADE.</strong> The EQ and compression are printed into the track (committed), but the big fader is after the pick-off, so riding it never touches the recording.',
      post: '<strong>CHOP = POST FADE.</strong> Every move of the big fader is printed. Bump it by accident and the take has a dip in it. This is the Duality\'s default, so check it before you roll.',
      efx: '<strong>CHOP = EFX.</strong> An effects send becomes the channel output, so you print the effect (say, a reverb or a parallel compressor) onto its own track.'
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
        $('rs-daw-sub').textContent = 'records the CHOP, plays it straight back (input monitoring)';
        rec.input = rec.out = true;
        if (state.chop !== 'input') rec.process = true;
        if (state.chop === 'post' || state.chop === 'efx') rec.fader = true;
        chopAt = { input: 'input', pre: 'process', post: 'fader', efx: 'out' }[state.chop];
        mon.ret = mon.small = mon.bus = mon.room = true;
        readout.innerHTML = '<strong>Tracking.</strong> The channel path (red) carries the mic to the recorder; the monitor path (blue) brings the recorder\'s playback back to your speakers. The small fader changes what you hear and never what you record. ' + CHOP_TEXT[state.chop];
      } else {
        $('rs-input-label').textContent = 'DAW playback';
        $('rs-out-label').textContent = '→ Mix bus';
        $('rs-out-sub').textContent = 'routing';
        $('rs-ret-label').textContent = 'Free: FX returns';
        $('rs-daw-sub').textContent = 'plays every track out, records the print';
        mon.input = mon.process = mon.fader = mon.out = true;
        rec.bus = mon.bus = mon.room = true;
        idle.ret = idle.small = true;
        readout.innerHTML = '<strong>Mixdown.</strong> The tracks now play back <em>through the channel path</em>, so the big faders, EQ and dynamics all go to work on the mix. The mix bus is what gets <strong>printed</strong>. The monitor path is free for extra inputs such as FX returns. (A console\'s FLIP button swaps which path gets the big fader.)';
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

  /* ── 2. Patch point ─────────────────────────────────────────────────────── */
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
      cls($('pb-w-dst'), 'on', r.destination === 'source');
      cls($('pb-w-dst'), 'alt', r.destination === 'patch');
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
      // the wire from bottom jack to DAW IN carries whatever the input hears
      var dst = $('pb-w-dst');
      dst.classList.toggle('on', r.destination === 'source');
      dst.style.stroke = r.destination === 'patch' ? '#59c8d8' : '';
      $('pb-dest').textContent = { source: 'The preamp', patch: 'Your cable', silence: 'Silence' }[r.destination];
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

  /* ── 3. Solo modes ──────────────────────────────────────────────────────── */
  (function soloModes() {
    var strips = $('rs-strips');
    if (!strips) return;
    var mode = 'SIP';
    var channels = [
      { name: 'Kick', fader: -6 },
      { name: 'Bass', fader: -9 },
      { name: 'Guitar', fader: -12 },
      { name: 'Vocal', fader: -4, solo: true },
      { name: 'Reverb', fader: -16, ret: true }
    ];
    var modeBtns = all('[data-solo-mode]');

    channels.forEach(function (c, i) {
      var d = document.createElement('div');
      d.className = 'rs-strip';
      d.innerHTML = '<b>' + c.name + '</b><small>' + (c.ret ? 'FX return · ' : 'fader ') + c.fader + ' dB</small>' +
        '<button type="button" class="solo" data-k="solo" aria-pressed="false">SOLO</button>' +
        '<button type="button" class="mute" data-k="mute" aria-pressed="false">MUTE</button>' +
        (c.ret ? '<button type="button" class="iso" data-k="isolate" aria-pressed="false">SOLO ISO</button>' : '');
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
      var out = $('rs-solo-readout');
      var reverb = channels[4];
      var soloed = channels.filter(function (c) { return c.solo; }).map(function (c) { return c.name; });
      var msg;
      if (!r.anySolo) {
        msg = 'Nothing soloed: the speakers play the mix bus, and the print is the full mix.';
        out.className = 'te-readout';
      } else if (mode === 'SIP') {
        msg = '<strong>Destructive.</strong> SIP cut the other channels <em>on the mix bus itself</em>, so if you were printing, the print is now ' + soloed.join(' + ') + ' only. ';
        msg += reverb.solo || reverb.isolate ? 'The reverb return survives because it is ' + (reverb.isolate ? 'solo isolated.' : 'soloed too.') : 'Notice the reverb died too, so you hear the vocal dry. Press SOLO ISO on the reverb return to keep it.';
        out.className = 'te-readout bad';
      } else {
        msg = '<strong>Non-destructive.</strong> The mix bus (and the print) is untouched. Only the control room switched to the solo bus' + (mode === 'PFL' ? ', <em>before</em> the fader, so you hear it at full input level whatever the fader says (and even if it\'s muted).' : ', <em>after</em> the fader, at its real level in the mix.');
        if (!reverb.solo && soloed.indexOf('Reverb') < 0) msg += ' The reverb isn\'t on the solo bus unless you solo its return too.';
        out.className = 'te-readout good';
      }
      out.innerHTML = msg;
    }
    modeBtns.forEach(function (b) { b.addEventListener('click', function () { mode = b.dataset.soloMode; press(modeBtns, b); render(); }); });
    render();
  }());

  /* ── 4. Bit depth / sample rate ─────────────────────────────────────────── */
  (function digitalCalc() {
    var bitsSel = $('rs-bits');
    if (!bitsSel) return;
    var rateSel = $('rs-rate'), peak = $('rs-peak');
    function render() {
      var float = bitsSel.value === '32f';
      var bits = float ? 32 : Number(bitsSel.value);
      var rate = Number(rateSel.value);
      var p = Number(peak.value);
      $('rs-peak-out').textContent = p + ' dBFS';
      var d = S.digital(bits, rate, { float: float, peak: p });
      $('rs-dr').textContent = float ? 'vast (float)' : '≈ ' + d.dynamicRange.toFixed(0) + ' dB';
      $('rs-snr').textContent = float ? '—' : d.peaksAboveNoise.toFixed(0) + ' dB';
      $('rs-nyq').textContent = (d.nyquist / 1000).toFixed(d.nyquist % 1000 ? 2 : 0) + ' kHz';
      $('rs-size').textContent = d.mbPerMinute.toFixed(1) + ' MB';
      var o = $('rs-calc-readout');
      var lines = [];
      if (float) {
        lines.push('32-bit float is how a DAW does its maths inside: a track can go far over 0 dBFS and come back down without clipping. Converters still capture about 24 bits, so record at 24, mix in float.');
      } else if (d.peaksAboveNoise < 85) {
        lines.push('With peaks at ' + p + ' dBFS, quiet passages sit only ' + d.peaksAboveNoise.toFixed(0) + ' dB above the converter\'s noise floor. At 16-bit, playing safe with headroom costs you hiss.');
      } else {
        lines.push('Peaks at ' + p + ' dBFS still sit ' + d.peaksAboveNoise.toFixed(0) + ' dB above the noise floor, more than any mic or room can use. That\'s why 24-bit lets you leave generous headroom.');
      }
      lines.push(d.filterRoomHz > 0
        ? 'Nyquist is ' + (d.nyquist / 1000) + ' kHz, leaving ' + (d.filterRoomHz / 1000).toFixed(2).replace(/\.?0+$/, '') + ' kHz above human hearing (20 kHz) for the anti-aliasing filter to roll off.'
        : 'Nyquist is below 20 kHz.');
      if (rate === 96000) lines.push('Double the data of 48k for an octave nobody can hear. It\'s useful for heavy pitch and time editing, but costly otherwise.');
      else if (rate === 44100) lines.push('44.1k is the CD standard. Music-only projects use it, but video, film, games and broadcast all expect 48k.');
      else lines.push('48k is the video, film and broadcast standard, so a 48k session drops into any picture project without converting.');
      o.innerHTML = lines.join(' ');
      o.className = 'te-readout' + (!float && bits === 24 && rate === 48000 ? ' good' : '');
    }
    [bitsSel, rateSel, peak].forEach(function (el) { el.addEventListener('input', render); el.addEventListener('change', render); });
    render();
  }());

  /* ── 5. Session check ───────────────────────────────────────────────────── */
  (function quiz() {
    var qs = all('.rs-q');
    if (!qs.length) return;
    var score = $('rs-score'), right = 0, done = 0;
    qs.forEach(function (q) {
      var buttons = all('button[data-choice]', q);
      buttons.forEach(function (b) {
        b.addEventListener('click', function () {
          if (q.dataset.done) return;
          q.dataset.done = '1';
          var ok = b.dataset.choice === q.dataset.answer;
          b.classList.add(ok ? 'right' : 'wrong');
          buttons.forEach(function (o) { if (o.dataset.choice === q.dataset.answer) o.classList.add('right'); o.setAttribute('aria-disabled', 'true'); });
          var why = q.querySelector('.rs-why');
          if (why) { why.hidden = false; why.insertAdjacentHTML('afterbegin', ok ? '<strong>Right.</strong> ' : '<strong>Not quite.</strong> '); }
          done++; if (ok) right++;
          if (score) score.textContent = right + ' of ' + done + ' correct' + (done === qs.length ? '. Session check complete.' : '.');
        });
      });
    });
  }());
}());
