(function () {
  'use strict';

  var Core = window.AudioMixerCore;
  var Synth = window.AudioLabSynth;
  if (!Core) return;

  var CHANNELS = Core.CHANNELS;
  var PATCH_ITEMS = Core.PATCH_ITEMS;
  var dbToLin = Core.dbToLin;
  var fmtDb = Core.fmtDb;
  var meterPct = Core.meterPct;

  /* ── Workbench tabs ── */
  var wb = document.getElementById('mixer-workbench');
  var tabButtons = Array.prototype.slice.call(document.querySelectorAll('#mixer-workbench [role="tab"][data-panel]'));
  var tabPanels = Array.prototype.slice.call(document.querySelectorAll('#mixer-workbench .te-wb-panel'));

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

  /* ── Reusable hardware controls ── */
  function createKnob(opts) {
    var min = opts.min, max = opts.max, step = opts.step || 1;
    var value = opts.value;

    var wrap = document.createElement('div');
    wrap.className = 'knob-unit' + (opts.variant ? ' ' + opts.variant : '');
    var dial = document.createElement('div');
    dial.className = 'knob-dial' + (opts.big ? ' big' : '');
    dial.setAttribute('role', 'slider');
    dial.tabIndex = opts.disabled ? -1 : 0;
    dial.setAttribute('aria-label', opts.label);
    dial.setAttribute('aria-valuemin', String(min));
    dial.setAttribute('aria-valuemax', String(max));
    if (opts.disabled) dial.setAttribute('aria-disabled', 'true');
    var indicator = document.createElement('div');
    indicator.className = 'knob-indicator';
    dial.appendChild(indicator);
    var valOut = document.createElement('div');
    valOut.className = 'knob-value';
    var lbl = document.createElement('div');
    lbl.className = 'knob-label';
    lbl.textContent = opts.label;
    wrap.appendChild(dial);
    wrap.appendChild(valOut);
    if (opts.showLabel !== false) wrap.appendChild(lbl);

    var SWEEP = 270;
    function render() {
      var frac = (value - min) / (max - min);
      indicator.style.transform = 'rotate(' + (-135 + frac * SWEEP) + 'deg)';
      dial.setAttribute('aria-valuenow', String(value));
      valOut.textContent = opts.format ? opts.format(value) : String(value);
    }
    function setValue(v, silent) {
      var snapped = Math.round(v / step) * step;
      value = Math.max(min, Math.min(max, snapped));
      render();
      if (!silent && opts.onChange) opts.onChange(value);
    }

    if (!opts.disabled) {
      var dragging = false, startY = 0, startVal = 0;
      dial.addEventListener('pointerdown', function (e) {
        dragging = true;
        startY = e.clientY;
        startVal = value;
        try { dial.setPointerCapture(e.pointerId); } catch (err) {}
        dial.classList.add('active');
        e.preventDefault();
      });
      dial.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var dy = startY - e.clientY;
        setValue(startVal + dy * ((max - min) / 130));
      });
      var endDrag = function () { dragging = false; dial.classList.remove('active'); };
      dial.addEventListener('pointerup', endDrag);
      dial.addEventListener('pointercancel', endDrag);
      dial.addEventListener('keydown', function (e) {
        var bigStep = (max - min) / 20 || step;
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setValue(value + step); e.preventDefault(); }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setValue(value - step); e.preventDefault(); }
        else if (e.key === 'PageUp') { setValue(value + bigStep); e.preventDefault(); }
        else if (e.key === 'PageDown') { setValue(value - bigStep); e.preventDefault(); }
        else if (e.key === 'Home') { setValue(min); e.preventDefault(); }
        else if (e.key === 'End') { setValue(max); e.preventDefault(); }
      });
    }

    render();
    return {
      el: wrap,
      get value() { return value; },
      set: function (v, silent) { setValue(v, silent !== false); }
    };
  }

  function createFader(opts) {
    var min = opts.min, max = opts.max, step = opts.step || 1;
    var heightPx = opts.height || 86;
    var value = opts.value;

    var wrap = document.createElement('div');
    wrap.className = 'fader-unit';
    var track = document.createElement('div');
    track.className = 'fader-track';
    track.style.height = heightPx + 'px';

    var unityMark = null;
    if (opts.unityAt !== undefined) {
      unityMark = document.createElement('div');
      unityMark.className = 'fader-unity-mark';
      track.appendChild(unityMark);
    }

    var cap = document.createElement('div');
    cap.className = 'fader-cap';
    cap.setAttribute('role', 'slider');
    cap.tabIndex = opts.disabled ? -1 : 0;
    cap.setAttribute('aria-label', opts.label);
    cap.setAttribute('aria-valuemin', String(min));
    cap.setAttribute('aria-valuemax', String(max));
    if (opts.disabled) cap.setAttribute('aria-disabled', 'true');
    track.appendChild(cap);

    var valOut = document.createElement('div');
    valOut.className = 'fader-value';
    var lbl = document.createElement('div');
    lbl.className = 'fader-label';
    lbl.textContent = opts.label;
    wrap.appendChild(track);
    wrap.appendChild(valOut);
    wrap.appendChild(lbl);

    function render() {
      var frac = (value - min) / (max - min);
      cap.style.bottom = (frac * (heightPx - 16)) + 'px';
      if (unityMark) {
        var uFrac = (opts.unityAt - min) / (max - min);
        unityMark.style.bottom = (uFrac * (heightPx - 16) + 8) + 'px';
      }
      cap.setAttribute('aria-valuenow', String(value));
      valOut.textContent = opts.format ? opts.format(value) : String(value);
    }
    function setValue(v, silent) {
      var snapped = Math.round(v / step) * step;
      value = Math.max(min, Math.min(max, snapped));
      render();
      if (!silent && opts.onChange) opts.onChange(value);
    }
    function posToVal(clientY) {
      var rect = track.getBoundingClientRect();
      var relY = rect.bottom - clientY - 8;
      var frac = Math.max(0, Math.min(1, relY / (heightPx - 16)));
      return min + frac * (max - min);
    }

    if (!opts.disabled) {
      var dragging = false;
      cap.addEventListener('pointerdown', function (e) {
        dragging = true;
        try { cap.setPointerCapture(e.pointerId); } catch (err) {}
        cap.classList.add('active');
        e.preventDefault();
        e.stopPropagation();
      });
      track.addEventListener('pointerdown', function (e) {
        if (e.target === track) setValue(posToVal(e.clientY));
      });
      cap.addEventListener('pointermove', function (e) {
        if (dragging) setValue(posToVal(e.clientY));
      });
      var endDrag = function () { dragging = false; cap.classList.remove('active'); };
      cap.addEventListener('pointerup', endDrag);
      cap.addEventListener('pointercancel', endDrag);
      cap.addEventListener('keydown', function (e) {
        var bigStep = (max - min) / 10 || step;
        if (e.key === 'ArrowUp') { setValue(value + step); e.preventDefault(); }
        else if (e.key === 'ArrowDown') { setValue(value - step); e.preventDefault(); }
        else if (e.key === 'PageUp') { setValue(value + bigStep); e.preventDefault(); }
        else if (e.key === 'PageDown') { setValue(value - bigStep); e.preventDefault(); }
        else if (e.key === 'Home') { setValue(min); e.preventDefault(); }
        else if (e.key === 'End') { setValue(max); e.preventDefault(); }
      });
    }

    render();
    return {
      el: wrap,
      get value() { return value; },
      set: function (v, silent) { setValue(v, silent !== false); },
      setHeight: function (h) {
        heightPx = h;
        track.style.height = h + 'px';
        render();
      }
    };
  }

  /* ── Clean connector SVGs (no text spoilers embedded inside artwork) ── */
  var CABLE_SVGS = {
    xlr: '<svg viewBox="0 0 96 60" role="img" aria-label="XLR locking three-pin connector"><rect x="6" y="20" width="42" height="20" rx="6" fill="#3a3a44"/><circle cx="66" cy="30" r="21" fill="#4a4a56" stroke="#8a8a9a" stroke-width="2"/><circle cx="60" cy="22" r="4.3" fill="#e2e2ec"/><circle cx="74" cy="30" r="4.3" fill="#e2e2ec"/><circle cx="60" cy="38" r="4.3" fill="#e2e2ec"/></svg>',
    trs: '<svg viewBox="0 0 96 60" role="img" aria-label="Quarter-inch TRS plug with two separator rings"><rect x="6" y="22" width="28" height="16" rx="5" fill="#3a3a44"/><rect x="34" y="24" width="34" height="12" rx="2" fill="#d0d0dc"/><rect x="46" y="24" width="5" height="12" fill="#14141a"/><rect x="58" y="24" width="5" height="12" fill="#14141a"/><path d="M68 24 h12 q10 6 0 12 h-12 z" fill="#d0d0dc"/></svg>',
    ts: '<svg viewBox="0 0 96 60" role="img" aria-label="Quarter-inch TS plug with one separator ring"><rect x="6" y="22" width="28" height="16" rx="5" fill="#3a3a44"/><rect x="34" y="24" width="34" height="12" rx="2" fill="#d0d0dc"/><rect x="52" y="24" width="5" height="12" fill="#14141a"/><path d="M68 24 h12 q10 6 0 12 h-12 z" fill="#d0d0dc"/></svg>',
    rca: '<svg viewBox="0 0 96 60" role="img" aria-label="RCA coaxial plug with red collar and center pin"><rect x="8" y="22" width="24" height="16" rx="4" fill="#3a3a44"/><path d="M32 20 h24 q14 10 0 20 h-24 z" fill="#c23a3a"/><rect x="68" y="27" width="12" height="6" rx="2" fill="#e8c840"/></svg>',
    'trs-speaker': '<svg viewBox="0 0 96 60" role="img" aria-label="Balanced quarter-inch TRS main output plug"><rect x="6" y="22" width="28" height="16" rx="5" fill="#2c4466"/><rect x="34" y="24" width="34" height="12" rx="2" fill="#d0d0dc"/><rect x="46" y="24" width="5" height="12" fill="#14141a"/><rect x="58" y="24" width="5" height="12" fill="#14141a"/><path d="M68 24 h12 q10 6 0 12 h-12 z" fill="#d0d0dc"/></svg>',
    'bare-wire': '<svg viewBox="0 0 96 60" role="img" aria-label="Twin-conductor bare speaker wire"><path d="M6 21 q42 -9 84 0" stroke="#c23a3a" stroke-width="4" fill="none"/><path d="M6 39 q42 9 84 0" stroke="#4a4a56" stroke-width="4" fill="none"/><rect x="78" y="18" width="12" height="6" rx="1" fill="#d9a441"/><rect x="78" y="36" width="12" height="6" rx="1" fill="#d9a441"/></svg>'
  };

  var PATCH_LABELS = { xlr: 'XLR', trs: 'TRS ¼″', ts: 'TS ¼″', rca: 'RCA', 'trs-speaker': 'TRS ¼″', 'bare-wire': 'Speaker wire' };
  var QUIZ_LABELS = {
    xlr: 'XLR (Balanced Mic)',
    trs: 'TRS ¼″ (Line)',
    ts: 'TS ¼″ (Instrument)',
    rca: 'RCA (Consumer Stereo)',
    'trs-speaker': 'TRS ¼″ (Main → Powered Spkr)',
    'bare-wire': 'Bare Speaker Wire'
  };

  /* ── Patch Bay ── */
  var patchGrid = document.getElementById('patch-grid');
  var patchTally = document.getElementById('patch-tally');
  var patchState = {};
  var phantomOn = false;

  function applyPatchChoice(itemId, cable) {
    var item = PATCH_ITEMS.find(function (p) { return p.id === itemId; });
    if (!item) return;
    var card = document.getElementById('patch-' + itemId);
    var fb = document.getElementById('patch-fb-' + itemId);
    card.querySelectorAll('.patch-btn').forEach(function (b) {
      b.classList.remove('chosen-correct', 'chosen-wrong');
      b.setAttribute('aria-pressed', b.dataset.cable === cable ? 'true' : 'false');
    });
    var chosenBtn = card.querySelector('.patch-btn[data-cable="' + cable + '"]');
    var correct = cable === item.correct;
    if (chosenBtn) chosenBtn.classList.add(correct ? 'chosen-correct' : 'chosen-wrong');
    card.classList.toggle('ok', correct);
    card.classList.toggle('bad', !correct);
    fb.textContent = correct ? item.okMsg : (item.badMsg[cable] || 'Not quite the right connector for this source.');
    fb.className = 'patch-fb ' + (correct ? 'ok-fb' : 'bad-fb');
    patchState[itemId] = correct;
  }

  function renderPatch() {
    PATCH_ITEMS.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'patch-card';
      card.id = 'patch-' + item.id;
      var choicesHtml = item.choices.map(function (c) {
        return '<button type="button" class="patch-btn" aria-pressed="false" data-item="' + item.id + '" data-cable="' + c + '">' + PATCH_LABELS[c] + '</button>';
      }).join('');
      card.innerHTML =
        '<div class="patch-head"><span class="patch-icon" aria-hidden="true">' + item.icon + '</span><span class="patch-label">' + item.label + '</span></div>' +
        '<p class="patch-desc">' + item.desc + '</p>' +
        '<div class="patch-choices">' + choicesHtml + '</div>' +
        '<div class="patch-fb" id="patch-fb-' + item.id + '"></div>';
      patchGrid.appendChild(card);
    });
    patchGrid.querySelectorAll('.patch-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyPatchChoice(btn.dataset.item, btn.dataset.cable);
        updateTally();
        updateStripCableLabels();
        onControlChange();
      });
    });
  }

  function updateTally() {
    var total = PATCH_ITEMS.length;
    var done = PATCH_ITEMS.filter(function (p) { return !!patchState[p.id]; }).length;
    patchTally.textContent = done + ' / ' + total + ' connections correct';
  }
  renderPatch();

  /* Phantom power (synced between Patch Bay tab & Console top button) */
  var phantomBtn = document.getElementById('phantom-btn');
  var phantomPill = document.getElementById('phantom-pill');
  function setPhantom(next) {
    phantomOn = !!next;
    phantomBtn.textContent = phantomOn ? '48V ON' : '48V OFF';
    phantomBtn.classList.toggle('on', phantomOn);
    phantomBtn.setAttribute('aria-pressed', phantomOn ? 'true' : 'false');
    if (phantomPill) {
      phantomPill.textContent = phantomOn ? '+48V ON' : '+48V OFF';
      phantomPill.classList.toggle('on', phantomOn);
      phantomPill.setAttribute('aria-pressed', phantomOn ? 'true' : 'false');
    }
    updatePhantomLeds();
    onControlChange();
  }
  phantomBtn.addEventListener('click', function () { setPhantom(!phantomOn); });
  if (phantomPill) phantomPill.addEventListener('click', function () { setPhantom(!phantomOn); });

  /* ── Signal Flow Stage Explorer ── */
  var STAGES = [
    { icon: '🎤', name: 'Source', sub: 'mic / line / Hi-Z',
      fact: '<strong>Source — where sound enters</strong>Mics output tiny millivolt mic-level signals; keyboards and players deliver strong line-level signals. Treating each with the right input jack prevents hiss and distortion.' },
    { icon: '🔌', name: 'Cable', sub: 'carry',
      fact: '<strong>Cable — matching connector & impedance</strong>Balanced XLR for mics, TS for short Hi-Z instruments, TRS for balanced line gear, RCA for consumer playback, and balanced TRS/XLR (never bare speaker wire) from mixer Main Out to powered speakers.' },
    { icon: '🎛', name: 'Preamp / Gain', sub: 'boost',
      fact: '<strong>Preamp — set Gain first</strong>Trim sets the internal operating headroom. Too little gain forces noisy boosts downstream; too much clips the preamp waveforms permanently before the EQ or fader.' },
    { icon: '🎚', name: 'EQ', sub: 'shape',
      fact: '<strong>EQ — shape tone</strong>Carve away boom with Low shelf or cut harshness with High shelf after setting clean preamp headroom.' },
    { icon: '↗️', name: 'AUX Sends', sub: 'branch off',
      fact: '<strong>AUX sends — independent sub-mixes</strong>AUX 1 (Monitor) taps <em>pre-fader</em> right after EQ so performers’ wedges stay steady when you ride Main faders. AUX 2 (FX) taps <em>post-fader</em> so wet reverb/delay rises and falls with the channel.' },
    { icon: '⚖️', name: 'Pan', sub: 'place',
      fact: '<strong>Pan — left/right placement</strong>Moves channels across the stereo panorama so vocals stay anchored center while guitars and keys open up to the sides.' },
    { icon: '🎛️', name: 'Fader', sub: 'mix',
      fact: '<strong>Channel fader — live balance</strong>Faders adjust mix balance from −∞ up through unity (0 dB) to +10 dB. Aim for most faders resting near 0 dB with well-set gain.' },
    { icon: '🎼', name: 'Master Bus', sub: 'sum',
      fact: '<strong>Master bus — summing & FX return</strong>Sums every active unmuted strip plus the FX Return bus, scaled by the gold Master fader.' },
    { icon: '🔊', name: 'Main Out', sub: 'powered spkr',
      fact: '<strong>Main Out → Powered Speakers</strong>Only sends clean line-level audio once the Main Output is patched to the powered speakers with balanced TRS or XLR.' }
  ];

  var chainRow = document.getElementById('chain-row');
  var stageFact = document.getElementById('stage-fact');
  var stageButtons = [];
  function selectStage(idx, moveFocus) {
    stageButtons.forEach(function (b, i) {
      var active = i === idx;
      b.setAttribute('aria-selected', active ? 'true' : 'false');
      b.tabIndex = active ? 0 : -1;
      if (active && moveFocus) b.focus();
    });
    stageFact.innerHTML = STAGES[idx].fact;
  }

  STAGES.forEach(function (st, i) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'chain-stage';
    el.setAttribute('role', 'tab');
    el.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    el.tabIndex = i === 0 ? 0 : -1;
    el.innerHTML = '<div class="st-icon" aria-hidden="true">' + st.icon + '</div><div class="st-name">' + st.name + '</div><div class="st-sub">' + st.sub + '</div>';
    el.addEventListener('click', function () { selectStage(i, false); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var dir = e.key === 'ArrowRight' ? 1 : -1;
        selectStage((i + dir + STAGES.length) % STAGES.length, true);
        e.preventDefault();
      }
    });
    chainRow.appendChild(el);
    stageButtons.push(el);
  });
  stageFact.innerHTML = STAGES[0].fact;

  /* ── Channel Strips (1–12 layout incl. 11/12 stereo strip & Master) ── */
  var STRIP_ORDER = [
    { live: 'ch1' }, { live: 'ch2' },
    { dim: '3' }, { dim: '4' }, { dim: '5' }, { dim: '6' },
    { live: 'ch3' }, { live: 'ch4' }, { dim: '11/12' }
  ];

  var CHANNELS_BY_ID = {};
  CHANNELS.forEach(function (ch) { CHANNELS_BY_ID[ch.id] = ch; });

  var mixerGrid = document.getElementById('mixer-grid');
  var chEls = {};
  var allFaders = [];

  function buildStrip(ch) {
    var strip = document.createElement('div');
    strip.className = 'strip';

    var badge = document.createElement('div');
    badge.className = 'strip-badge';
    badge.innerHTML = '<span class="strip-num">' + ch.numberLabel + '<span class="sig-led" id="sig-' + ch.id + '"></span></span><span class="strip-icon" aria-hidden="true">' + ch.icon + '</span>';
    strip.appendChild(badge);

    var metaLine = document.createElement('div');
    metaLine.className = 'strip-meta-line';
    var name = document.createElement('div');
    name.className = 'strip-name';
    name.textContent = ch.name;
    var statusRow = document.createElement('div');
    statusRow.className = 'strip-status-row';
    var cableLbl = document.createElement('div');
    cableLbl.className = 'strip-cable';
    cableLbl.textContent = 'unpatched';
    var phantomMini = document.createElement('div');
    phantomMini.className = 'phantom-mini';
    var phantomLed = document.createElement('span');
    phantomLed.className = 'phantom-led';
    if (ch.needsPhantom) {
      phantomMini.appendChild(phantomLed);
      phantomMini.appendChild(document.createTextNode('48V'));
    }
    statusRow.appendChild(cableLbl);
    if (ch.needsPhantom) statusRow.appendChild(phantomMini);
    metaLine.appendChild(name);
    metaLine.appendChild(statusRow);
    strip.appendChild(metaLine);

    strip.appendChild(Object.assign(document.createElement('div'), { className: 'strip-divider' }));

    var gain = createKnob({
      min: 0, max: 55, value: ch.defGain, step: 1, label: 'Gain', big: true, variant: 'trim',
      format: function (v) { return '+' + v; }, onChange: onControlChange
    });
    strip.appendChild(gain.el);

    var eqRow = document.createElement('div');
    eqRow.className = 'knob-row';
    var eqHi = createKnob({ min: -12, max: 12, value: 0, step: 1, label: 'Ch ' + ch.numberLabel + ' Hi EQ', showLabel: false, variant: 'eq', format: function (v) { return (v > 0 ? '+' : '') + v; }, onChange: onControlChange });
    var eqLo = createKnob({ min: -12, max: 12, value: 0, step: 1, label: 'Ch ' + ch.numberLabel + ' Lo EQ', showLabel: false, variant: 'eq', format: function (v) { return (v > 0 ? '+' : '') + v; }, onChange: onControlChange });
    eqRow.appendChild(eqHi.el);
    eqRow.appendChild(eqLo.el);
    strip.appendChild(eqRow);
    var eqCaption = document.createElement('div');
    eqCaption.className = 'fader-label';
    eqCaption.textContent = 'HI · LO EQ';
    strip.appendChild(eqCaption);

    var pan = createKnob({
      min: -100, max: 100, value: 0, step: 10, label: 'Pan', variant: 'pan',
      format: function (v) { return v === 0 ? 'C' : (v > 0 ? 'R' + v : 'L' + (-v)); },
      onChange: onControlChange
    });
    strip.appendChild(pan.el);

    var auxRow = document.createElement('div');
    auxRow.className = 'knob-row';
    var aux1 = createKnob({ min: 0, max: 100, value: 0, step: 5, label: 'Ch ' + ch.numberLabel + ' Mon', showLabel: false, variant: 'aux1', format: function (v) { return String(v); }, onChange: onControlChange });
    var aux2 = createKnob({ min: 0, max: 100, value: 0, step: 5, label: 'Ch ' + ch.numberLabel + ' FX', showLabel: false, variant: 'aux2', format: function (v) { return String(v); }, onChange: onControlChange });
    auxRow.appendChild(aux1.el);
    auxRow.appendChild(aux2.el);
    strip.appendChild(auxRow);
    var auxCaption = document.createElement('div');
    auxCaption.className = 'fader-label';
    auxCaption.textContent = 'MON · FX';
    strip.appendChild(auxCaption);

    strip.appendChild(Object.assign(document.createElement('div'), { className: 'strip-divider' }));

    var muteBtn = document.createElement('button');
    muteBtn.type = 'button';
    muteBtn.className = 'mute-btn';
    muteBtn.textContent = 'MUTE';
    muteBtn.setAttribute('aria-pressed', 'false');
    muteBtn.setAttribute('aria-label', 'Mute Channel ' + ch.numberLabel + ' ' + ch.name);
    var muted = false;
    muteBtn.addEventListener('click', function () {
      muted = !muted;
      muteBtn.classList.toggle('on', muted);
      muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
      onControlChange();
    });
    strip.appendChild(muteBtn);

    var faderRow = document.createElement('div');
    faderRow.className = 'fader-row';
    var fader = createFader({
      min: -60, max: 10, value: -60, step: 1, height: 86,
      label: 'Ch ' + ch.numberLabel, unityAt: 0,
      format: function (v) { return v > 0 ? '+' + v : String(v); },
      onChange: onControlChange
    });
    allFaders.push(fader);
    var meterWrap = document.createElement('div');
    meterWrap.className = 'fader-meter';
    var meterFill = document.createElement('div');
    meterWrap.appendChild(meterFill);
    faderRow.appendChild(fader.el);
    faderRow.appendChild(meterWrap);
    strip.appendChild(faderRow);

    mixerGrid.appendChild(strip);

    chEls[ch.id] = {
      gain: gain, eqHi: eqHi, eqLo: eqLo, pan: pan, aux1: aux1, aux2: aux2, fader: fader,
      get muted() { return muted; },
      setMuted: function (m) {
        muted = !!m;
        muteBtn.classList.toggle('on', muted);
        muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
      },
      cableLbl: cableLbl,
      mm: meterFill,
      phantomLed: phantomLed,
      sigLed: document.getElementById('sig-' + ch.id)
    };
  }

  function buildDimStrip(numberLabel) {
    var strip = document.createElement('div');
    strip.className = 'strip dim';
    strip.setAttribute('aria-hidden', 'true');
    strip.setAttribute('inert', '');
    strip.title = 'Unassigned console strip shown for full 1–12 hardware layout.';
    strip.innerHTML =
      '<div class="strip-badge"><span class="strip-num">' + numberLabel + '<span class="sig-led"></span></span><span class="strip-icon">🎛️</span></div>' +
      '<div class="strip-meta-line"><div class="strip-name">Line in</div><div class="strip-status-row"><div class="strip-cable">—</div></div></div>' +
      '<div class="strip-divider"></div>';
    strip.appendChild(createKnob({ min: 0, max: 55, value: 0, step: 1, label: 'Gain', big: true, variant: 'trim', disabled: true, format: function (v) { return '+' + v; } }).el);
    var eqRow = document.createElement('div'); eqRow.className = 'knob-row';
    eqRow.appendChild(createKnob({ min: -12, max: 12, value: 0, step: 1, label: 'Hi', variant: 'eq', showLabel: false, disabled: true }).el);
    eqRow.appendChild(createKnob({ min: -12, max: 12, value: 0, step: 1, label: 'Lo', variant: 'eq', showLabel: false, disabled: true }).el);
    strip.appendChild(eqRow);
    strip.appendChild(Object.assign(document.createElement('div'), { className: 'fader-label', textContent: 'HI · LO EQ' }));
    strip.appendChild(createKnob({ min: -100, max: 100, value: 0, step: 10, label: 'Pan', variant: 'pan', disabled: true, format: function () { return 'C'; } }).el);
    var auxRow = document.createElement('div'); auxRow.className = 'knob-row';
    auxRow.appendChild(createKnob({ min: 0, max: 100, value: 0, step: 5, label: 'Aux1', variant: 'aux1', showLabel: false, disabled: true }).el);
    auxRow.appendChild(createKnob({ min: 0, max: 100, value: 0, step: 5, label: 'Aux2', variant: 'aux2', showLabel: false, disabled: true }).el);
    strip.appendChild(auxRow);
    strip.appendChild(Object.assign(document.createElement('div'), { className: 'fader-label', textContent: 'MON · FX' }));
    strip.appendChild(Object.assign(document.createElement('div'), { className: 'strip-divider' }));
    var muteBtn = document.createElement('button');
    muteBtn.type = 'button';
    muteBtn.className = 'mute-btn';
    muteBtn.textContent = 'MUTE';
    muteBtn.disabled = true;
    muteBtn.tabIndex = -1;
    strip.appendChild(muteBtn);
    var faderRow = document.createElement('div');
    faderRow.className = 'fader-row';
    var dimFader = createFader({ min: -60, max: 10, value: -60, step: 1, height: 86, label: numberLabel, unityAt: 0, disabled: true });
    allFaders.push(dimFader);
    var meterWrap = document.createElement('div');
    meterWrap.className = 'fader-meter';
    meterWrap.appendChild(document.createElement('div'));
    faderRow.appendChild(dimFader.el);
    faderRow.appendChild(meterWrap);
    strip.appendChild(faderRow);
    mixerGrid.appendChild(strip);
  }

  STRIP_ORDER.forEach(function (slot) {
    if (slot.live) buildStrip(CHANNELS_BY_ID[slot.live]);
    else buildDimStrip(slot.dim);
  });

  var masterControls;
  (function buildMasterStrip() {
    var strip = document.createElement('div');
    strip.className = 'strip master-strip';
    strip.innerHTML =
      '<div class="strip-badge"><span class="strip-num">MASTER</span><span class="strip-icon" aria-hidden="true">🎼</span></div>' +
      '<div class="strip-meta-line"><div class="strip-name">Main Mix</div></div>' +
      '<div class="deck-display" aria-hidden="true"><span class="deck-display-dot"></span> AUX·FX·MAIN</div>' +
      '<div class="deck-transport" aria-hidden="true"><span>▶</span><span>■</span><span>●</span><span>📶</span></div>';
    strip.appendChild(Object.assign(document.createElement('div'), { className: 'strip-divider' }));

    var monRow = document.createElement('div');
    monRow.className = 'knob-row';
    var monKnob = createKnob({ min: -60, max: 10, value: -3, step: 1, label: 'Mon', variant: 'aux1', onChange: onControlChange });
    var fxRetKnob = createKnob({ min: -60, max: 10, value: -6, step: 1, label: 'FX Ret', variant: 'aux2', onChange: onControlChange });
    monRow.appendChild(monKnob.el);
    monRow.appendChild(fxRetKnob.el);
    strip.appendChild(monRow);
    strip.appendChild(Object.assign(document.createElement('div'), { className: 'strip-divider' }));

    var faderRow = document.createElement('div');
    faderRow.className = 'fader-row';
    var masterFader = createFader({
      min: -60, max: 10, value: 0, step: 1, height: 86,
      label: 'MASTER', unityAt: 0,
      format: function (v) { return v > 0 ? '+' + v : String(v); },
      onChange: onControlChange
    });
    masterFader.el.querySelector('.fader-cap').classList.add('gold');
    allFaders.push(masterFader);
    var meterWrap = document.createElement('div');
    meterWrap.className = 'fader-meter';
    var meterFill = document.createElement('div');
    meterWrap.appendChild(meterFill);
    faderRow.appendChild(masterFader.el);
    faderRow.appendChild(meterWrap);
    strip.appendChild(faderRow);
    mixerGrid.appendChild(strip);

    masterControls = { fader: masterFader, mon: monKnob, fxRet: fxRetKnob, mm: meterFill };
  })();

  function updatePhantomLeds() {
    CHANNELS.forEach(function (ch) {
      var e = chEls[ch.id];
      if (ch.needsPhantom && e.phantomLed) e.phantomLed.classList.toggle('lit', phantomOn);
    });
  }

  function updateStripCableLabels() {
    CHANNELS.forEach(function (ch) {
      var e = chEls[ch.id];
      var st = patchState[ch.patchId];
      e.cableLbl.textContent = st ? 'patched' : (st === false ? 'mis-patched' : 'unpatched');
      e.cableLbl.className = 'strip-cable' + (st ? ' patched' : (st === false ? ' mispatched' : ''));
    });
  }
  updateStripCableLabels();

  /* ── Level Model & Meter Display ── */
  var fxType = 'off';
  var listenMode = 'main';
  var clipHold = { ch1: -1e9, out: -1e9 };
  var clipTimer = null;

  function gatherState() {
    var channels = {};
    CHANNELS.forEach(function (ch) {
      var e = chEls[ch.id];
      channels[ch.id] = {
        gain: e.gain.value,
        fader: e.fader.value,
        pan: e.pan.value,
        aux1: e.aux1.value,
        aux2: e.aux2.value,
        muted: e.muted
      };
    });
    return {
      patchState: patchState,
      phantomOn: phantomOn,
      fxType: fxType,
      channels: channels,
      master: {
        fader: masterControls.fader.value,
        mon: masterControls.mon.value,
        fxRet: masterControls.fxRet.value
      }
    };
  }

  function scheduleClipClear() {
    if (clipTimer) clearTimeout(clipTimer);
    clipTimer = setTimeout(updateLab, 920);
  }

  function updateLab() {
    var now = performance.now();
    var res = Core.evaluateMixerState(gatherState());

    CHANNELS.forEach(function (ch) {
      var e = chEls[ch.id];
      var cr = res.channels[ch.id];
      e.mm.style.height = meterPct(cr.visiblePostDb) + '%';
      if (e.sigLed) e.sigLed.classList.toggle('lit', !cr.muted && cr.active);
    });

    var c1 = res.channels.ch1;
    if (c1.preampClipped || c1.faderClipped) {
      clipHold.ch1 = now;
      scheduleClipClear();
    }
    var ch1ClipHeld = (now - clipHold.ch1 < 900);
    document.getElementById('m-ch1').style.height = meterPct(c1.visiblePostDb) + '%';
    document.getElementById('db-ch1').textContent = fmtDb(c1.visiblePostDb);
    document.getElementById('clip-ch1').classList.toggle('lit', ch1ClipHeld);

    document.getElementById('m-aux1').style.height = meterPct(res.aux1BusDb) + '%';
    document.getElementById('db-aux1').textContent = fmtDb(res.aux1BusDb);

    document.getElementById('m-fx').style.height = meterPct(res.fxActive ? res.fxBusDb : -Infinity) + '%';
    document.getElementById('db-fx').textContent = res.fxActive ? fmtDb(res.fxBusDb) : 'off';

    if (res.masterClipped) {
      clipHold.out = now;
      scheduleClipClear();
    }
    var outClipHeld = (now - clipHold.out < 900);
    document.getElementById('m-out').style.height = meterPct(res.masterBusDb) + '%';
    document.getElementById('db-out').textContent = res.outPatched ? fmtDb(res.masterOutDb) : (res.masterBusDb > -80 ? 'unpatched' : '-∞');
    document.getElementById('clip-out').classList.toggle('lit', outClipHeld);
    masterControls.mm.style.height = meterPct(res.masterBusDb) + '%';

    var verdict = document.getElementById('verdict');
    var msg, cls = '';
    if (!res.allInputsPatched) {
      msg = 'Patch Ch. 1–10 in the Patch Bay tab (or click ⚡ Quick-Patch) so signal reaches the channel preamps.';
    } else if (!phantomOn) {
      msg = 'Turn on +48V Phantom Power so Ch. 1’s condenser mic powers up cleanly.';
    } else if (!res.outPatched) {
      msg = 'Main Output → Powered Speakers is unpatched — wire balanced TRS in Patch Bay so Main Mix reaches the room.';
    } else if (res.masterClipped || outClipHeld) {
      msg = '🔴 MASTER bus is clipping (> 0 dBFS). Pull the Master fader or hot channels back toward unity.';
      cls = 'bad';
    } else if (res.anyPreampClipped || ch1ClipHeld) {
      msg = '🔴 Channel preamp is clipping. No fader below it fixes preamp clipping — lower that channel’s GAIN knob.';
      cls = 'bad';
    } else if (res.anyFaderClipped) {
      msg = '🟠 A channel fader boost is pushing past 0 dBFS. Trim gain or pull the channel fader closer to unity.';
      cls = 'bad';
    } else if (!res.anyUnmutedFaderUp) {
      msg = 'Preamp signal is ready, but all channel faders are down (−∞) or muted. Bring faders up toward 0 (unity).';
    } else if (res.masterBusDb < -26) {
      msg = 'Mix is quiet — bring up channel faders toward 0 dB unity for stronger headroom.';
    } else if (res.masterBusDb <= -3 && res.masterBusDb >= -20) {
      msg = '🟢 Healthy mix level — strong signal with clean headroom below 0 dBFS. Show-ready gain staging!';
      cls = 'good';
    } else {
      msg = 'Running hot near 0 dBFS — ease faders slightly back for −6 to −12 dB of safe live headroom.';
    }
    verdict.textContent = msg;
    verdict.className = 'verdict' + (cls ? ' ' + cls : '');
  }

  /* ── FX type radio group + Listen Bus toggle ── */
  var fxSelect = document.getElementById('fx-select');
  var fxBtns = Array.prototype.slice.call(fxSelect.querySelectorAll('.fx-opt'));
  function setFxType(nextFx) {
    fxType = nextFx;
    fxBtns.forEach(function (b) {
      var active = b.dataset.fx === fxType;
      b.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    rebuildFx();
    onControlChange();
  }
  fxBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { setFxType(btn.dataset.fx); });
  });

  var listenMainBtn = document.getElementById('listen-main');
  var listenAuxBtn = document.getElementById('listen-aux1');
  function setListenMode(mode) {
    listenMode = mode === 'aux1' ? 'aux1' : 'main';
    listenMainBtn.setAttribute('aria-pressed', listenMode === 'main' ? 'true' : 'false');
    listenAuxBtn.setAttribute('aria-pressed', listenMode === 'aux1' ? 'true' : 'false');
    updateAudio();
  }
  listenMainBtn.addEventListener('click', function () { setListenMode('main'); });
  listenAuxBtn.addEventListener('click', function () { setListenMode('aux1'); });

  /* ── Quick-Patch & Soundcheck ── */
  document.getElementById('mx-quick-btn').addEventListener('click', function () {
    calibration = false;
    PATCH_ITEMS.forEach(function (item) {
      applyPatchChoice(item.id, item.correct);
    });
    updateTally();
    updateStripCableLabels();
    setPhantom(true);

    chEls.ch1.gain.set(26);
    chEls.ch1.pan.set(0);
    chEls.ch1.aux1.set(45);
    chEls.ch1.aux2.set(28);
    chEls.ch1.setMuted(false);
    chEls.ch1.fader.set(-2);

    chEls.ch2.gain.set(11);
    chEls.ch2.pan.set(-40);
    chEls.ch2.aux1.set(25);
    chEls.ch2.aux2.set(15);
    chEls.ch2.setMuted(false);
    chEls.ch2.fader.set(-8);

    chEls.ch3.gain.set(4);
    chEls.ch3.pan.set(40);
    chEls.ch3.aux1.set(20);
    chEls.ch3.aux2.set(20);
    chEls.ch3.setMuted(false);
    chEls.ch3.fader.set(-9);

    chEls.ch4.gain.set(2);
    chEls.ch4.pan.set(0);
    chEls.ch4.aux1.set(0);
    chEls.ch4.aux2.set(0);
    chEls.ch4.setMuted(false);
    chEls.ch4.fader.set(-12);

    masterControls.mon.set(-3);
    masterControls.fxRet.set(-8);
    masterControls.fader.set(-3);
    setFxType('reverb');
    onControlChange();
  });

  /* ── Live 4-Stem Web Audio Console Graph ── */
  var calibration = false;
  var actx = null, graph = null, toneOn = false;
  var toneBtn = document.getElementById('tone-btn');

  function makeClipCurve() {
    if (Synth && Synth.createHardClipCurve) return Synth.createHardClipCurve(1024);
    var n = 1024, c = new Float32Array(n);
    for (var i = 0; i < n; i++) c[i] = Math.max(-0.98, Math.min(0.98, ((i / (n - 1)) * 2 - 1)));
    return c;
  }

  function buildAudio() {
    actx = Synth ? Synth.createContext().ctx : new (window.AudioContext || window.webkitAudioContext)();
    var stems = Synth ? Synth.createBandStems(actx, { seconds: 2.4 }) : null;
    var mediaBuf = Synth ? Synth.createDrumLoopBuffer(actx, { seconds: 2.4 }) : null;

    var masterMixGain = actx.createGain();
    var outPatchGate = actx.createGain();
    var monBusGain = actx.createGain();
    var monMasterGain = actx.createGain();

    var convolver = actx.createConvolver();
    convolver.buffer = Synth ? Synth.createRoomIR(actx, { rt60: 1.5, preDelayMs: 14, damping: 0.45 }) : null;
    var reverbWetGain = actx.createGain();
    var delayNode = actx.createDelay(2.0);
    delayNode.delayTime.value = 0.34;
    var delayFeedback = actx.createGain();
    delayFeedback.gain.value = 0.32;
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    var delayWetGain = actx.createGain();
    var fxReturnGain = actx.createGain();

    var limiter = actx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.08;
    var safety = actx.createGain();
    safety.gain.value = 0.34;

    var aux2Bus = actx.createGain();
    aux2Bus.connect(convolver);
    aux2Bus.connect(delayNode);
    convolver.connect(reverbWetGain);
    delayNode.connect(delayWetGain);
    reverbWetGain.connect(fxReturnGain);
    delayWetGain.connect(fxReturnGain);
    fxReturnGain.connect(masterMixGain);

    masterMixGain.connect(outPatchGate);
    outPatchGate.connect(limiter);
    monBusGain.connect(monMasterGain);
    monMasterGain.connect(limiter);
    limiter.connect(safety);
    safety.connect(actx.destination);

    var stemMap = stems ? { ch1: stems.vocal, ch2: stems.guitar, ch3: stems.keys, ch4: mediaBuf } : {};
    var chNodes = {};
    var oscillator = actx.createOscillator();
    oscillator.frequency.value = 196;
    var toneGain = actx.createGain();
    toneGain.gain.value = 0;
    oscillator.connect(toneGain);
    oscillator.start();
    function peakTap(node) {
      var analyser = actx.createAnalyser();
      analyser.fftSize = 1024;
      node.connect(analyser);
      var samples = new Float32Array(analyser.fftSize);
      return function () {
        analyser.getFloatTimeDomainData(samples);
        var peak = 0;
        for (var i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
        return 20 * Math.log10(peak);
      };
    }

    CHANNELS.forEach(function (ch) {
      var src = actx.createBufferSource();
      src.loop = true;
      src.buffer = stemMap[ch.id] || stems.vocal;

      // Exact console signal order: Preamp Trim -> Preamp Clipper -> Low/High EQ -> Pan -> Post-Fader / AUX Sends
      var preampGain = actx.createGain();
      var clip = actx.createWaveShaper();
      clip.curve = makeClipCurve();
      var eqLoFilter = actx.createBiquadFilter();
      eqLoFilter.type = 'lowshelf';
      eqLoFilter.frequency.value = 220;
      var eqHiFilter = actx.createBiquadFilter();
      eqHiFilter.type = 'highshelf';
      eqHiFilter.frequency.value = 3200;
      var panNode = actx.createStereoPanner();
      var aux1Send = actx.createGain();
      var faderGain = actx.createGain();
      var aux2Send = actx.createGain();

      var stemGain = actx.createGain();
      src.connect(stemGain).connect(preampGain);
      if (ch.id === 'ch1') toneGain.connect(preampGain);
      preampGain.connect(clip);
      clip.connect(eqLoFilter);
      eqLoFilter.connect(eqHiFilter);
      eqHiFilter.connect(panNode);
      panNode.connect(aux1Send);
      aux1Send.connect(monBusGain);
      panNode.connect(faderGain);
      faderGain.connect(masterMixGain);
      faderGain.connect(aux2Send);
      aux2Send.connect(aux2Bus);

      src.start();
      chNodes[ch.id] = {
        stemGain: stemGain, peak: peakTap(faderGain),
        preampGain: preampGain,
        eqLoFilter: eqLoFilter,
        eqHiFilter: eqHiFilter,
        panNode: panNode,
        aux1Send: aux1Send,
        faderGain: faderGain,
        aux2Send: aux2Send
      };
    });

    graph = {
      chNodes: chNodes, toneGain: toneGain,
      mainPeak: peakTap(masterMixGain), auxPeak: peakTap(monBusGain), fxPeak: peakTap(fxReturnGain),
      reverbWetGain: reverbWetGain,
      delayWetGain: delayWetGain,
      fxReturnGain: fxReturnGain,
      masterMixGain: masterMixGain,
      outPatchGate: outPatchGate,
      monMasterGain: monMasterGain
    };
    rebuildFx();
  }

  function rebuildFx() {
    if (!actx || !graph) return;
    var r = fxType === 'reverb' ? 1 : 0;
    var d = fxType === 'delay' ? 1 : 0;
    if (Synth && Synth.smooth) {
      Synth.smooth(graph.reverbWetGain.gain, r, actx, 0.02);
      Synth.smooth(graph.delayWetGain.gain, d, actx, 0.02);
    } else {
      graph.reverbWetGain.gain.value = r;
      graph.delayWetGain.gain.value = d;
    }
  }

  function smoothParam(param, val) {
    if (Synth && Synth.smooth && actx) Synth.smooth(param, val, actx, 0.015);
    else param.value = val;
  }

  function updateAudio() {
    if (!graph || !actx) return;
    if (!toneOn) {
      smoothParam(graph.outPatchGate.gain, 0);
      smoothParam(graph.monMasterGain.gain, 0);
      return;
    }

    CHANNELS.forEach(function (ch) {
      var e = chEls[ch.id];
      var n = graph.chNodes[ch.id];
      smoothParam(n.stemGain.gain, calibration ? 0 : 1);
      var isReady = !!patchState[ch.patchId] && !(ch.needsPhantom && !phantomOn);
      // Scale source level + preamp trim cleanly into WaveShaper clip threshold (clipping at >0 dBFS)
      var preampLin = isReady ? dbToLin(ch.srcDb + e.gain.value) * 0.95 : 0;
      smoothParam(n.preampGain.gain, preampLin);
      smoothParam(n.eqHiFilter.gain, e.eqHi.value);
      smoothParam(n.eqLoFilter.gain, e.eqLo.value);
      smoothParam(n.panNode.pan, e.pan.value / 100);

      var muted = e.muted;
      smoothParam(n.aux1Send.gain, muted ? 0 : e.aux1.value / 100);
      var faderLin = (muted || e.fader.value <= -60) ? 0 : dbToLin(e.fader.value);
      smoothParam(n.faderGain.gain, faderLin);
      smoothParam(n.aux2Send.gain, e.aux2.value / 100);
    });

    smoothParam(graph.fxReturnGain.gain, masterControls.fxRet.value <= -60 ? 0 : dbToLin(masterControls.fxRet.value));
    smoothParam(graph.masterMixGain.gain, masterControls.fader.value <= -60 ? 0 : dbToLin(masterControls.fader.value));

    smoothParam(graph.toneGain.gain, calibration ? 1 : 0);
    var hearMain = listenMode === 'main' && !!patchState.out;
    var hearAux1 = listenMode === 'aux1';
    smoothParam(graph.outPatchGate.gain, hearMain ? 1 : 0);
    smoothParam(graph.monMasterGain.gain, hearAux1 ? (masterControls.mon.value <= -60 ? 0 : dbToLin(masterControls.mon.value)) : 0);
  }

  document.getElementById('mx-tone-test').addEventListener('click', function () {
    document.getElementById('mx-quick-btn').click();
    calibration = true;
    var strip = chEls.ch1;
    strip.eqHi.set(0); strip.eqLo.set(0); strip.fader.set(0);
    strip.aux1.set(100); strip.aux2.set(0);
    masterControls.fader.set(0); masterControls.mon.set(0);
    setFxType('off');
    setListenMode('main');
    onControlChange();
  });

  function displayPeak(id, value) {
    document.getElementById('m-' + id).style.height = meterPct(value) + '%';
    document.getElementById('db-' + id).textContent = fmtDb(value);
  }
  SimKit.loop(function () {
    if (!toneOn || !graph) return;
    CHANNELS.forEach(function (ch) {
      var level = graph.chNodes[ch.id].peak();
      chEls[ch.id].mm.style.height = meterPct(level) + '%';
      if (ch.id === 'ch1') displayPeak('ch1', level);
    });
    var main = graph.mainPeak();
    masterControls.mm.style.height = meterPct(main) + '%';
    displayPeak('out', patchState.out ? main : -Infinity);
    displayPeak('aux1', graph.auxPeak() + (masterControls.mon.value <= -60 ? -Infinity : masterControls.mon.value));
    displayPeak('fx', graph.fxPeak());
  }, { el: wb });

  toneBtn.addEventListener('click' , function () {
    if (!actx) buildAudio();
    if (actx.state === 'suspended') actx.resume();
    toneOn = !toneOn;
    document.getElementById('mx-meter-mode').textContent = toneOn ? 'Live' : 'Estimated';
    if (!toneOn) updateLab();
    toneBtn.textContent = toneOn ? '🔇 Stop Mix' : '🔊 Listen to Desk';
    toneBtn.classList.toggle('on', toneOn);
    toneBtn.setAttribute('aria-pressed', toneOn ? 'true' : 'false');
    updateAudio();
  });

  function onControlChange() {
    updateLab();
    updateAudio();
  }

  /* Respond to fullscreen resize transitions */
  window.addEventListener('creation-app-resize', function () {
    var fs = wb && (document.fullscreenElement === wb || wb.classList.contains('creation-app-expanded'));
    var h = fs ? 136 : 86;
    allFaders.forEach(function (f) { f.setHeight(h); });
  });

  /* ── Cable ID Quiz (with Next Question button + zero spoiler labels) ── */
  var QUIZ = [
    { q: 'A condenser vocal mic needs a locking, balanced cable to Ch. 1. Which connector?', a: 'xlr',
      why: 'XLR — balanced, locking, and safely carries +48V phantom power to the condenser capsule.' },
    { q: 'An electric bass plugs 6 feet straight into a channel Hi-Z ¼″ jack. Which cable?', a: 'ts',
      why: 'TS ¼″ — standard unbalanced high-impedance instrument cable for short runs.' },
    { q: 'A stereo synthesizer feeds balanced line inputs on Ch. 7/8. Which ¼″ cable?', a: 'trs',
      why: 'TRS ¼″ (Line) — two rings carry hot, cold, and shield to cancel hum over long stage runs.' },
    { q: 'A phone headphone adapter feeds the stereo tape input on Ch. 9/10. Which cable?', a: 'rca',
      why: 'RCA — unbalanced stereo consumer connector matching tablet/laptop adapters.' },
    { q: 'Main L/R line outputs feed powered active PA tops across the stage. Which cable?', a: 'trs-speaker',
      why: 'Balanced TRS ¼″ (Main → Powered Spkr) — line-level output feeding the speaker’s internal amp.' },
    { q: 'A dedicated power amplifier drives a passive (unpowered) stage cabinet. Which cable?', a: 'bare-wire',
      why: 'Bare Speaker Wire — carries high-wattage speaker current downstream of a power amp (never from mixer line outs).' }
  ];

  var quizIdx = 0, quizScore = 0, quizLock = false;
  var cableGrid = document.getElementById('cable-grid');
  var quizQ = document.getElementById('quiz-q');
  var quizScoreEl = document.getElementById('quiz-score');
  var quizNextBtn = document.getElementById('quiz-next');
  var QUIZ_KEYS = ['xlr', 'trs', 'ts', 'rca', 'trs-speaker', 'bare-wire'];

  QUIZ_KEYS.forEach(function (key) {
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'cable-card';
    card.dataset.key = key;
    card.innerHTML = CABLE_SVGS[key] + '<div class="cable-name">' + QUIZ_LABELS[key] + '</div>';
    card.addEventListener('click', function () { answer(key, card); });
    cableGrid.appendChild(card);
  });

  function renderQuestion() {
    quizLock = false;
    cableGrid.querySelectorAll('.cable-card').forEach(function (c) { c.className = 'cable-card'; });
    if (quizIdx >= QUIZ.length) {
      quizQ.innerHTML = '🏁 <strong>Round complete — ' + quizScore + '/' + QUIZ.length + '.</strong> ' +
        (quizScore === QUIZ.length ? 'Clean sweep! You are ready to patch a live stage.' : 'Play again to aim for a clean sweep.');
      quizScoreEl.textContent = 'Final score: ' + quizScore + '/' + QUIZ.length;
      quizNextBtn.textContent = '↺ Play Again';
      quizNextBtn.hidden = false;
      return;
    }
    quizQ.textContent = 'Q' + (quizIdx + 1) + ' of ' + QUIZ.length + ': ' + QUIZ[quizIdx].q;
    quizScoreEl.textContent = 'Score: ' + quizScore + '/' + quizIdx;
    quizNextBtn.hidden = true;
    quizNextBtn.textContent = 'Next question →';
  }

  function answer(key, card) {
    if (quizLock || quizIdx >= QUIZ.length) return;
    quizLock = true;
    var item = QUIZ[quizIdx];
    var correct = key === item.a;
    if (correct) quizScore++;
    card.classList.add(correct ? 'correct' : 'wrong');
    if (!correct) {
      var right = cableGrid.querySelector('[data-key="' + item.a + '"]');
      if (right) right.classList.add('correct');
    }
    quizQ.innerHTML = (correct ? '✅ ' : '❌ ') + item.why;
    quizIdx++;
    quizScoreEl.textContent = 'Score: ' + quizScore + '/' + quizIdx;
    quizNextBtn.textContent = quizIdx >= QUIZ.length ? 'See final score →' : 'Next question →';
    quizNextBtn.hidden = false;
  }

  quizNextBtn.addEventListener('click', function () {
    if (quizIdx >= QUIZ.length && quizNextBtn.textContent.indexOf('Play Again') !== -1) {
      quizIdx = 0;
      quizScore = 0;
    }
    renderQuestion();
  });

  renderQuestion();
  updateLab();
})();
