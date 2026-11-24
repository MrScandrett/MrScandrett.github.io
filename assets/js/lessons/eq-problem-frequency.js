/* Audio Equalizers: Choose, Hear, and Shape — DSP engine, live sweep loop & scoring */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var bands = 48;
  var spectrum = $('spectrum');
  if (!spectrum) return;

  var bandEls = [];
  for (var bi = 0; bi < bands; bi++) {
    var b = document.createElement('span');
    b.className = 'te-band';
    spectrum.appendChild(b);
    bandEls.push(b);
  }

  var defs = {
    rumble: { f: 55, name: 'Rumble', kind: 'lowshelf' },
    mud:    { f: 240, name: 'Mud', kind: 'peaking' },
    boxy:   { f: 520, name: 'Boxiness', kind: 'peaking' },
    nasal:  { f: 1200, name: 'Nasal tone', kind: 'peaking' },
    harsh:  { f: 3800, name: 'Harshness', kind: 'peaking' },
    hiss:   { f: 9000, name: 'Hiss', kind: 'highshelf' }
  };

  var typeInfo = {
    parametric: { name: 'Parametric EQ', model: 'PQ-3 Precision', format: '1U PARAMETRIC EQUALIZER', family: 'Core equalizer', controls: 'Frequency · gain · Q · trim', use: 'Best for surgical problem solving', description: 'Move the center frequency, boost or cut, set Q width, and match loudness with Output Trim.' },
    semi:       { name: 'Semi-Parametric EQ', model: 'Sweep-Mid 212', format: 'CONSOLE CHANNEL EQUALIZER', family: 'Core equalizer', controls: 'Frequency · gain · fixed Q 1.2', use: 'Best for fast channel shaping', description: 'Frequency and gain sweep freely, while Q stays fixed at 1.2—fast on stage, less surgical on tight rings.' },
    graphic:    { name: 'Graphic EQ', model: 'GE-8 Room Curve', format: '8-BAND GRAPHIC EQUALIZER', family: 'Core equalizer', controls: 'Eight fixed octave faders', use: 'Best for room & monitor ring-out', description: 'Eight fixed-frequency vertical faders whose tops visually draw the tonal curve.' },
    shelf:      { name: 'Shelving EQ', model: 'Tone Shelf S2', format: 'DUAL SHELVING EQUALIZER', family: 'Specialized equalizer', controls: 'Corner · gain · high/low', use: 'Best for broad bass or air', description: 'Lifts or lowers all frequencies past a corner frequency rather than carving a narrow notch.' },
    dynamic:    { name: 'Dynamic EQ', model: 'DYN-EQ 4', format: 'LEVEL-DEPENDENT EQUALIZER', family: 'Advanced equalizer', controls: 'Freq · max cut · Q · threshold', use: 'Best for intermittent harshness', description: 'Watches energy inside the selected frequency band and cuts only when that band crosses Threshold.' },
    linear:     { name: 'Linear-Phase EQ', model: 'PhaseLine FIR', format: 'DIGITAL MASTERING EQUALIZER', family: 'Advanced equalizer', controls: 'Frequency · gain · Q · phase lock', use: 'Best for mastering & parallel blends', description: 'Preserves phase relationships across frequencies at the cost of look-ahead latency and possible pre-ringing.' },
    passive:    { name: 'Passive EQ', model: 'Program EQ P1', format: 'PASSIVE PROGRAM EQUALIZER', family: 'Specialized equalizer', controls: 'Broad musical bell (Q 0.65)', use: 'Best for smooth tonal weight', description: 'Passive RC/inductor networks yield wide, gentle musical curves paired with a makeup amplifier.' }
  };

  var mixTracks = {
    orchestra: {
      title: '“Hush, hush, not a word” / “Softly sighing to the river”',
      detail: 'Orchestra · soloists · chorus · 1921 recording',
      duration: '3:59',
      src: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/The_Pirates_of_Penzance_%28HMV%2C_cond._Byng%29_-_19_-_Hush%2C_hush%2C_not_a_word_-_Softly_sighing_to_the_river.mp3',
      source: 'https://commons.wikimedia.org/wiki/File:The_Pirates_of_Penzance_(HMV,_cond._Byng)_-_19_-_Hush,_hush,_not_a_word_-_Softly_sighing_to_the_river.mp3'
    },
    dialogue: {
      title: 'Act II dramatic recording',
      detail: 'Full cast · spoken dialogue · a cappella voices · room tone',
      duration: '45:12',
      src: 'https://archive.org/download/pirates_of_penzance_1204_librivox/pop_actii_64kb.mp3',
      source: 'https://librivox.org/the-pirates-of-penzance-by-william-s-gilbert-and-sir-arthur-sullivan/'
    }
  };

  var graphicInputs = Array.prototype.slice.call(document.querySelectorAll('#graphic-sliders input'));
  var graphicHz = graphicInputs.map(function (input) { return Number(input.dataset.hz); });
  var current = 'mud';
  var displayHeights = new Array(bands).fill(20);
  var lastFrame = 0;
  var bypassed = false;
  var dynamicActive = false;
  var eqState = { type: 'parametric', targetI: 0, chosenI: 0, width: 1, gain: 0, trim: 0, hpfI: 0, threshold: -24, shelf: 'highshelf', graphicGains: new Array(8).fill(0) };

  var audioCtx = null, preEqSum = null, problemInjectFilter = null;
  var hpfFilter = null, peakFilter = null, graphicFilters = [], trimGain = null, masterLimiter = null;
  var postAnalyser = null, scBandpass = null, scAnalyser = null, activeAudio = null;
  var localLoopOn = false, localSourceGain = null;
  var analyzerData = new Uint8Array(1024);
  var scTimeData = new Float32Array(1024);
  var connectedAudio = new WeakSet();
  var meterLEDs = Array.prototype.slice.call($('eq-led-meter').children);
  var responseCurve = $('eq-curve');
  var responseFill = $('eq-curve-fill');
  var frequencyMarker = $('eq-frequency-marker');

  function sliderHz(v) { return Math.round(20 * Math.pow(1000, v / 1000)); }
  function indexFor(f) { return Math.max(0, Math.min(bands - 1, Math.round(Math.log(f / 20) / Math.log(1000) * (bands - 1)))); }
  function hzLabel(f) { return f >= 1000 ? (f / 1000).toFixed(f % 1000 ? 1 : 0) + ' kHz' : f + ' Hz'; }
  function timeLabel(sec) {
    if (!Number.isFinite(sec)) return '0:00';
    var whole = Math.max(0, Math.floor(sec));
    return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
  }

  function syncKnob(input) {
    var min = Number(input.min), max = Number(input.max);
    var ratio = (Number(input.value) - min) / (max - min);
    var knob = input.nextElementSibling;
    if (knob && knob.classList.contains('eq-knob')) {
      knob.style.setProperty('--angle', (-135 + ratio * 270) + 'deg');
    }
  }

  function makeRotary(id, minLabel, maxLabel, defaultVal) {
    var input = $(id), control = input.parentElement, label = control.querySelector('label'), output = label.querySelector('output');
    var knob = document.createElement('span'), scale = document.createElement('span');
    control.classList.add('eq-rotary-control');
    knob.className = 'eq-knob';
    knob.setAttribute('aria-hidden', 'true');
    scale.className = 'eq-rotary-scale';
    scale.innerHTML = '<span>' + minLabel + '</span><span>' + maxLabel + '</span>';
    label.removeChild(output);
    input.after(knob);
    control.append(output, scale);
    input.dataset.defaultVal = String(defaultVal);

    // Smooth vertical+horizontal drag interaction while preserving <input type="range"> accessibility
    var dragState = null;
    input.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' || e.pointerType === 'touch' || e.pointerType === 'pen') {
        dragState = { x: e.clientX, y: e.clientY, startVal: Number(input.value) };
        input.setPointerCapture(e.pointerId);
      }
    });
    input.addEventListener('pointermove', function (e) {
      if (!dragState) return;
      e.preventDefault();
      var min = Number(input.min), max = Number(input.max), step = Number(input.step) || 1;
      var deltaPx = (dragState.y - e.clientY) + (e.clientX - dragState.x) * 0.6;
      var next = dragState.startVal + (deltaPx / 150) * (max - min);
      next = Math.round(next / step) * step;
      next = Math.max(min, Math.min(max, next));
      if (next !== Number(input.value)) {
        input.value = next;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    input.addEventListener('pointerup', function () { dragState = null; });
    input.addEventListener('pointercancel', function () { dragState = null; });
    input.addEventListener('dblclick', function () {
      input.value = input.dataset.defaultVal;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    input.addEventListener('input', function () { syncKnob(input); });
    syncKnob(input);
  }

  // Exact biquad magnitude formulas for graph accuracy
  function responseDbAt(i) {
    if (bypassed) return 0;
    var type = eqState.type, chosenI = eqState.chosenI, gain = eqState.gain, shelf = eqState.shelf, graphicGains = eqState.graphicGains;
    var freq = 20 * Math.pow(1000, i / (bands - 1));
    var hpf = Number($('hpf').value);
    // 12 dB/oct Butterworth HPF matches hpfFilter (Q = -3.0103)
    var db = hpf > 20 ? -10 * Math.log10(1 + Math.pow(hpf / freq, 4)) : 0;

    if (type === 'parametric' || type === 'semi' || type === 'linear' || (type === 'dynamic' && dynamicActive)) {
      var q = type === 'semi' ? 1.2 : Number($('q').value) / 10;
      var sigma = Math.max(0.75, 5.5 / q);
      db += gain * Math.exp(-0.5 * Math.pow((i - chosenI) / sigma, 2));
    }
    if (type === 'passive') {
      // Broad musical bell matching live audio Q=0.65, 0.85x scaling
      db += (gain * 0.85) * Math.exp(-0.5 * Math.pow((i - chosenI) / (5.5 / 0.65), 2));
    }
    if (type === 'shelf') {
      var side = shelf === 'highshelf' ? 1 / (1 + Math.exp(-(i - chosenI) / 1.2)) : 1 / (1 + Math.exp((i - chosenI) / 1.2));
      db += gain * side;
    }
    if (type === 'graphic') {
      graphicGains.forEach(function (g, n) {
        db += g * Math.exp(-0.5 * Math.pow((i - indexFor(graphicHz[n])) / 1.45, 2));
      });
    }
    db += eqState.trim;
    return Math.max(-18, Math.min(18, db));
  }

  function renderResponseCurve() {
    var points = [];
    for (var n = 0; n <= 64; n++) {
      var i = (n / 64) * (bands - 1);
      var x = (n / 64) * 1000;
      var y = 90 - responseDbAt(i) * 4.35;
      points.push([x, y]);
    }
    var line = 'M' + points.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L');
    responseCurve.setAttribute('d', line);
    responseFill.setAttribute('d', line + 'L1000 90L0 90Z');
    var mx = (eqState.chosenI / (bands - 1)) * 1000;
    frequencyMarker.setAttribute('x1', mx.toFixed(1));
    frequencyMarker.setAttribute('x2', mx.toFixed(1));
    frequencyMarker.style.opacity = eqState.type === 'graphic' || bypassed ? '0' : '0.8';
    responseCurve.style.opacity = bypassed ? '0.45' : '1';
  }

  function syncProblemFilter() {
    if (!problemInjectFilter || !audioCtx) return;
    var t = defs[current];
    var now = audioCtx.currentTime;
    problemInjectFilter.type = t.kind === 'lowshelf' ? 'lowshelf' : t.kind === 'highshelf' ? 'highshelf' : 'peaking';
    problemInjectFilter.frequency.setTargetAtTime(t.f, now, 0.02);
    problemInjectFilter.Q.setTargetAtTime(t.kind === 'peaking' ? 4.2 : 0.7, now, 0.02);
    problemInjectFilter.gain.setTargetAtTime(11.5, now, 0.02);
  }

  function choose(name) {
    var keys = Object.keys(defs);
    current = name === 'hidden' ? keys[Math.floor(Math.random() * keys.length)] : name;
    syncProblemFilter();
    update();
  }

  function setType() {
    var type = $('eq-type').value;
    var info = typeInfo[type];
    $('eq-family').textContent = info.family;
    $('eq-type-name').textContent = info.name;
    $('eq-type-description').textContent = info.description;
    $('eq-type-controls').textContent = info.controls;
    $('eq-type-use').textContent = info.use;
    $('eq-hardware').dataset.eqType = type;
    $('eq-model-name').textContent = info.model;
    $('eq-model-format').textContent = info.format;

    $('frequency-control').hidden = type === 'graphic';
    $('gain-control').hidden = type === 'graphic';
    $('q-control').hidden = !['parametric', 'dynamic', 'linear'].includes(type);
    $('shelf-control').hidden = type !== 'shelf';
    $('threshold-control').hidden = type !== 'dynamic';
    $('graphic-control').hidden = type !== 'graphic';
    $('frequency-label').textContent = type === 'shelf' ? 'Corner frequency' : 'Center frequency';
    $('gain-label').textContent = type === 'dynamic' ? 'Max cut / boost' : 'Gain';
    update();
  }

  function update() {
    var type = $('eq-type').value;
    var f = sliderHz(Number($('frequency').value));
    var gain = Number($('gain').value);
    var q = type === 'semi' ? 1.2 : Number($('q').value) / 10;
    var hpf = Number($('hpf').value);
    var trim = Number($('trim').value);
    var threshold = Number($('threshold').value);
    var shelf = $('shelf-direction').value;
    var target = defs[current];
    var graphicGains = graphicInputs.map(function (input) { return Number(input.value); });

    // Honest scoring: HPF-only solves rumble cleanly; graphic EQ grades nearest octave band; Q & excess-cut moderation graded
    var score = 0;
    if (type === 'graphic') {
      var bestBandIdx = 0, bestDist = Infinity;
      graphicHz.forEach(function (hz, idx) {
        var d = Math.abs(Math.log2(hz / target.f));
        if (d < bestDist) { bestDist = d; bestBandIdx = idx; }
      });
      var bandCut = graphicGains[bestBandIdx];
      var hpfSolved = current === 'rumble' && hpf >= 70 && hpf <= 115;
      score = hpfSolved ? 100 : (bandCut < 0 ? Math.min(100, Math.round(100 * Math.min(1, -bandCut / 6))) : 0);
    } else if (current === 'rumble' && hpf >= 70 && hpf <= 120 && gain >= -3 && gain <= 1.5) {
      score = 100;
    } else {
      var delta = Math.abs(Math.log2(f / target.f));
      var freqScore = Math.max(0, 1 - delta / 1.25);
      var cutScore = gain < 0 ? Math.min(1, -gain / 5) : 0;
      var overCutPenalty = gain < -11 ? (-11 - gain) * 4 : 0;
      var wideQPenalty = (type === 'parametric' && q < 0.8 && gain < -2) ? 14 : 0;
      var hpfBonus = (current === 'rumble' && hpf >= 65) ? 0.35 : 0;
      score = Math.max(0, Math.min(100, Math.round(100 * (freqScore * 0.65 + cutScore * 0.35 + hpfBonus) - overCutPenalty - wideQPenalty)));
    }

    $('frequency-out').value = hzLabel(f);
    $('gain-out').value = (gain > 0 ? '+' : '') + gain.toFixed(1) + ' dB';
    $('q-out').value = q.toFixed(1);
    $('threshold-out').value = threshold + ' dBFS';
    $('hpf-out').value = hpf + ' Hz';
    $('trim-out').value = (trim > 0 ? '+' : '') + trim.toFixed(1) + ' dB';
    $('problem-label').textContent = $('source').value === 'hidden' ? 'Hidden' : target.name + ' (' + hzLabel(target.f) + ')';

    var correction = (gain > 0 ? '+' : '') + gain.toFixed(1) + ' dB @ ' + hzLabel(f);
    if (type === 'graphic') {
      var changed = graphicGains.map(function (g, i) { return g ? hzLabel(graphicHz[i]) + ' ' + (g > 0 ? '+' : '') + g : ''; }).filter(Boolean);
      correction = changed.length ? changed.slice(0, 2).join(' · ') + (changed.length > 2 ? '…' : '') : 'All flat';
    } else if (type === 'shelf') {
      correction = (gain > 0 ? '+' : '') + gain.toFixed(1) + ' dB ' + (shelf === 'highshelf' ? 'high' : 'low') + ' shelf';
    } else if (type === 'passive') {
      correction = 'Broad bell ' + (gain > 0 ? '+' : '') + gain.toFixed(1) + ' dB @ ' + hzLabel(f);
    }
    $('correction-label').textContent = correction;
    $('match-score').textContent = ['parametric', 'semi', 'dynamic', 'graphic', 'linear'].includes(type) ? score + '%' : 'Explore';

    var targetI = indexFor(target.f), chosenI = indexFor(f), width = Math.max(1, Math.round(7 / q));
    eqState = { type: type, targetI: targetI, chosenI: chosenI, width: width, gain: gain, trim: trim, hpfI: indexFor(hpf), threshold: threshold, shelf: shelf, graphicGains: graphicGains };

    var shapes = { parametric: 'Bell filter', semi: 'Fixed-Q bell', graphic: '8-Band Graphic', shelf: shelf === 'highshelf' ? 'High shelf' : 'Low shelf', dynamic: 'Dynamic bell', linear: 'Linear-phase bell', passive: 'Broad passive bell' };
    var widthText = type === 'graphic' ? '8 octaves' : type === 'shelf' ? 'Shelf slope' : type === 'passive' ? 'Q 0.65' : 'Q ' + q.toFixed(1);
    var activeGraphic = graphicGains.filter(Boolean).length;
    var action = type === 'dynamic'
      ? (dynamicActive ? 'Triggered · ' + (gain > 0 ? '+' : '') + gain.toFixed(1) + ' dB' : 'Waiting > ' + threshold + ' dBFS')
      : type === 'graphic' ? (activeGraphic ? activeGraphic + ' bands active' : 'All bands flat')
      : (gain === 0 ? 'Flat · 0 dB' : (gain > 0 ? 'Boost ' : 'Cut ') + Math.abs(gain).toFixed(1) + ' dB');

    $('filter-shape').textContent = bypassed ? 'Bypassed' : shapes[type];
    $('filter-width').textContent = widthText;
    $('filter-action').textContent = bypassed ? 'Bypassed' : action;
    $('filter-hpf').textContent = bypassed ? 'Bypassed' : hpf + ' Hz';
    renderResponseCurve();

    bandEls.forEach(function (bandEl, i) {
      var isCut = gain < 0 && Math.abs(i - chosenI) <= width;
      if (type === 'graphic') isCut = graphicGains.some(function (g, n) { return g < 0 && Math.abs(i - indexFor(graphicHz[n])) < 2; });
      bandEl.className = 'te-band' + (Math.abs(i - targetI) < 2 ? ' problem' : '') + (isCut ? ' cut' : '');
    });

    if (peakFilter && audioCtx) {
      var now = audioCtx.currentTime;
      hpfFilter.frequency.setTargetAtTime(bypassed ? 10 : hpf, now, 0.015);
      hpfFilter.Q.value = -3.0103; // flat Butterworth
      peakFilter.frequency.setTargetAtTime(f, now, 0.015);
      if (scBandpass) scBandpass.frequency.setTargetAtTime(f, now, 0.015);

      graphicFilters.forEach(function (filter, i) {
        filter.gain.setTargetAtTime(!bypassed && type === 'graphic' ? graphicGains[i] : 0, now, 0.015);
      });

      if (bypassed) {
        peakFilter.type = 'peaking';
        peakFilter.gain.setTargetAtTime(0, now, 0.015);
        trimGain.gain.setTargetAtTime(1, now, 0.015);
      } else {
        trimGain.gain.setTargetAtTime(Math.pow(10, trim / 20), now, 0.015);
        if (type === 'parametric' || type === 'semi' || type === 'linear') {
          peakFilter.type = 'peaking';
          peakFilter.Q.setTargetAtTime(q, now, 0.015);
          peakFilter.gain.setTargetAtTime(gain, now, 0.015);
        } else if (type === 'shelf') {
          peakFilter.type = shelf;
          peakFilter.Q.setTargetAtTime(0.707, now, 0.015);
          peakFilter.gain.setTargetAtTime(gain, now, 0.015);
        } else if (type === 'passive') {
          peakFilter.type = 'peaking';
          peakFilter.Q.setTargetAtTime(0.65, now, 0.015);
          peakFilter.gain.setTargetAtTime(gain * 0.85, now, 0.015);
        } else if (type === 'dynamic') {
          peakFilter.type = 'peaking';
          peakFilter.Q.setTargetAtTime(q, now, 0.015);
          peakFilter.gain.setTargetAtTime(dynamicActive ? gain : 0, now, 0.03);
        } else {
          peakFilter.gain.setTargetAtTime(0, now, 0.015);
        }
      }
    }

    var o = $('eq-readout');
    if (bypassed) {
      o.className = 'te-readout warn';
      o.innerHTML = '<strong>EQ Bypassed.</strong> Compare processed vs. bypassed at matched loudness using Output Trim.';
    } else if (score >= 85) {
      o.className = 'te-readout good';
      o.innerHTML = '<strong>Surgical fix!</strong> You tamed <em>' + target.name + '</em> cleanly. Toggle Bypass and check Output Trim so both sound equally loud.';
    } else if (gain > 3) {
      o.className = 'te-readout warn';
      o.innerHTML = '<strong>Sweep mode:</strong> Boosting makes ugly frequencies stand out—now pull Gain into a modest cut once you locate it.';
    } else {
      o.className = 'te-readout';
      o.innerHTML = '<strong>' + typeInfo[type].name + ':</strong> Sweep Frequency while listening to the Problem Loop (or music stream), then cut cleanly and level-match Trim.';
    }
  }

  function ensureAudioChain() {
    if (audioCtx) return audioCtx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    preEqSum = audioCtx.createGain();
    problemInjectFilter = audioCtx.createBiquadFilter();

    hpfFilter = AudioEffects.eqNode(audioCtx);
    hpfFilter.type = 'highpass';
    hpfFilter.Q.value = -3.0103;

    peakFilter = AudioEffects.eqNode(audioCtx);
    peakFilter.type = 'peaking';

    trimGain = audioCtx.createGain();
    trimGain.gain.value = 1;

    masterLimiter = audioCtx.createDynamicsCompressor();
    masterLimiter.threshold.value = -2;
    masterLimiter.ratio.value = 14;

    postAnalyser = audioCtx.createAnalyser();
    postAnalyser.fftSize = 2048;
    postAnalyser.smoothingTimeConstant = 0.72;

    // Pre-EQ sidechain detector for Dynamic EQ (measures ONLY energy near chosen f!)
    scBandpass = audioCtx.createBiquadFilter();
    scBandpass.type = 'bandpass';
    scBandpass.frequency.value = 1000;
    scBandpass.Q.value = 2.0;
    scAnalyser = audioCtx.createAnalyser();
    scAnalyser.fftSize = 1024;

    preEqSum.connect(hpfFilter);
    preEqSum.connect(scBandpass).connect(scAnalyser);

    hpfFilter.connect(peakFilter);
    var tail = peakFilter;
    graphicFilters = graphicHz.map(function (hz) {
      var filter = AudioEffects.eqNode(audioCtx);
      filter.type = 'peaking';
      filter.frequency.value = hz;
      filter.Q.value = 1.4;
      tail.connect(filter);
      tail = filter;
      return filter;
    });
    tail.connect(trimGain).connect(postAnalyser).connect(masterLimiter).connect(audioCtx.destination);

    // Local sweep-and-cut buffer source routed through problemInjectFilter -> preEqSum
    if (window.AudioLabSynth) {
      var vocal = AudioLabSynth.createVocalPhraseBuffer(audioCtx);
      var pink = AudioLabSynth.createNoiseBuffer(audioCtx, 2.4, 'pink', 912);
      var vSrc = audioCtx.createBufferSource(); vSrc.buffer = vocal; vSrc.loop = true;
      var pSrc = audioCtx.createBufferSource(); pSrc.buffer = pink; pSrc.loop = true;
      var pLevel = audioCtx.createGain(); pLevel.gain.value = 0.25;
      localSourceGain = audioCtx.createGain(); localSourceGain.gain.value = 0;

      vSrc.connect(problemInjectFilter);
      pSrc.connect(pLevel).connect(problemInjectFilter);
      problemInjectFilter.connect(localSourceGain).connect(preEqSum);
      vSrc.start(); pSrc.start();
      syncProblemFilter();
    }
    update();
    return audioCtx;
  }

  async function connectMusicalAudio(audio) {
    ensureAudioChain();
    if (!audioCtx) return;
    if (!connectedAudio.has(audio)) {
      audioCtx.createMediaElementSource(audio).connect(preEqSum);
      connectedAudio.add(audio);
    }
    await audioCtx.resume();
    activeAudio = audio;
  }

  function animateSpectrum(dt, time) {
    if (time - lastFrame < 38) return;
    lastFrame = time;
    var t = time / 1000;
    var type = eqState.type, targetI = eqState.targetI, chosenI = eqState.chosenI, width = eqState.width;
    var gain = eqState.gain, hpfI = eqState.hpfI, threshold = eqState.threshold, shelf = eqState.shelf, graphicGains = eqState.graphicGains;
    var isLive = postAnalyser && ((activeAudio && !activeAudio.paused) || localLoopOn);

    if (isLive) postAnalyser.getByteFrequencyData(analyzerData);

    var meterPeak = isLive ? Math.max.apply(null, analyzerData) : 85 + 55 * (0.5 + 0.5 * Math.sin(t * 2.7));
    var lit = Math.max(0, Math.min(10, Math.round((meterPeak / 255) * 11)));
    meterLEDs.forEach(function (led, i) { led.classList.toggle('on', i < lit); });

    if (type === 'dynamic') {
      var levelDb = -60;
      if (isLive && scAnalyser) {
        scAnalyser.getFloatTimeDomainData(scTimeData);
        var sum = 0;
        for (var k = 0; k < scTimeData.length; k++) sum += scTimeData[k] * scTimeData[k];
        var rms = Math.sqrt(sum / scTimeData.length);
        levelDb = 20 * Math.log10(Math.max(1e-4, rms));
      } else {
        // Synthetic envelope fluctuates between -38 and -10 dBFS so threshold slider responds!
        levelDb = -24 + 14 * Math.sin(t * 2.3);
      }
      var nextActive = !bypassed && levelDb > threshold;
      if (nextActive !== dynamicActive) {
        dynamicActive = nextActive;
        $('filter-action').textContent = dynamicActive ? 'Triggered · ' + (gain > 0 ? '+' : '') + gain.toFixed(1) + ' dB' : 'Waiting > ' + threshold + ' dBFS';
        renderResponseCurve();
      }
      if (isLive && !bypassed && peakFilter && audioCtx) {
        peakFilter.gain.setTargetAtTime(dynamicActive ? gain : 0, audioCtx.currentTime, 0.03);
      }
    }

    bandEls.forEach(function (bandEl, i) {
      if (isLive) {
        var hz = 20 * Math.pow(1000, i / (bands - 1));
        var bin = Math.min(analyzerData.length - 1, Math.round(hz / (audioCtx.sampleRate / postAnalyser.fftSize)));
        var height = 5 + (analyzerData[bin] / 255) * 93;
        displayHeights[i] += (height - displayHeights[i]) * (height > displayHeights[i] ? 0.7 : 0.3);
        bandEl.style.height = displayHeights[i].toFixed(1) + '%';
        return;
      }
      var lowEnd = 30 * Math.exp(-i / 19), tilt = 38 - i * 0.48;
      var broadMotion = 11 * Math.sin(t * 2.1 + i * 0.43) + 6 * Math.sin(t * 4.7 - i * 0.77);
      var problemPeak = 34 * Math.exp(-Math.pow((i - targetI) / 2.35, 2)) * (0.78 + 0.22 * Math.sin(t * 3.4));
      var h = tilt + lowEnd + broadMotion + problemPeak;
      var eqShape = Math.max(0, 1 - Math.min(1, Math.abs(i - chosenI) / (width + 1)));
      if (!bypassed) {
        if (type === 'parametric' || type === 'semi' || type === 'linear') h += gain * 5 * eqShape;
        if (type === 'dynamic' && dynamicActive) h += gain * 5 * eqShape;
        if (type === 'shelf') h += gain * 4.5 * (shelf === 'highshelf' ? 1 / (1 + Math.exp(-(i - chosenI))) : 1 / (1 + Math.exp(i - chosenI)));
        if (type === 'passive') h += (gain * 0.85) * 4.2 * Math.exp(-0.5 * Math.pow((i - chosenI) / 8, 2));
        if (type === 'graphic') graphicGains.forEach(function (g, n) { h += g * 3.2 * Math.exp(-Math.pow((i - indexFor(graphicHz[n])) / 2.2, 2)); });
        if (i < hpfI) h *= Math.max(0.12, (i + 1) / (hpfI + 1));
      }
      h = Math.max(5, Math.min(98, h + eqState.trim * 1.5));
      displayHeights[i] += (h - displayHeights[i]) * (h > displayHeights[i] ? 0.58 : 0.26);
      bandEl.style.height = displayHeights[i].toFixed(1) + '%';
    });
  }

  // One-shot Before / After check
  function playSnapshot(corrected) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    var ac = new AC(), now = ac.currentTime, master = ac.createGain(), bus = ac.createGain();
    var type = $('eq-type').value, f = sliderHz(Number($('frequency').value)), gain = Number($('gain').value);
    var q = type === 'semi' ? 1.2 : Math.max(0.3, Number($('q').value) / 10);
    var trim = Number($('trim').value);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.075, now + 0.04);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
    master.connect(ac.destination);

    var tail = bus;
    if (corrected && !bypassed) {
      var hp = AudioEffects.eqNode(ac); hp.type = 'highpass'; hp.Q.value = -3.0103; hp.frequency.value = Number($('hpf').value);
      tail.connect(hp); tail = hp;
      if (type === 'graphic') {
        graphicInputs.forEach(function (input, i) {
          var eq = AudioEffects.eqNode(ac); eq.type = 'peaking'; eq.frequency.value = graphicHz[i]; eq.Q.value = 1.4; eq.gain.value = Number(input.value);
          tail.connect(eq); tail = eq;
        });
      } else {
        var eq = AudioEffects.eqNode(ac);
        eq.type = type === 'shelf' ? $('shelf-direction').value : 'peaking';
        eq.frequency.value = f;
        eq.Q.value = type === 'passive' ? 0.65 : q;
        var activeGain = type === 'passive' ? gain * 0.85 : (type === 'dynamic' && Number($('threshold').value) > -18 ? gain * 0.3 : gain);
        eq.gain.value = activeGain;
        tail.connect(eq); tail = eq;
      }
      var tr = ac.createGain(); tr.gain.value = Math.pow(10, trim / 20);
      tail.connect(tr); tail = tr;
    }
    tail.connect(master);

    var target = defs[current];
    [110, 220, 440, 880, target.f].forEach(function (hz, i) {
      var osc = ac.createOscillator(), g = ac.createGain();
      osc.type = i === 4 ? 'sine' : 'sawtooth';
      osc.frequency.value = hz;
      g.gain.value = i === 4 ? 0.36 : 0.11 / (i + 1);
      osc.connect(g); g.connect(bus);
      osc.start(now); osc.stop(now + 1.3);
    });
    setTimeout(function () { ac.close(); }, 1500);
  }

  // Local Sweep-and-Cut toggle
  var loopBtn = $('eq-local-loop-btn');
  if (loopBtn) {
    loopBtn.addEventListener('click', function () {
      ensureAudioChain();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      localLoopOn = !localLoopOn;
      if (localLoopOn && mixPlayer && !mixPlayer.paused) mixPlayer.pause();
      if (localSourceGain) {
        AudioLabSynth.smooth(localSourceGain.gain, localLoopOn ? 0.48 : 0, audioCtx, 0.025);
      }
      loopBtn.setAttribute('aria-pressed', localLoopOn ? 'true' : 'false');
      loopBtn.classList.toggle('audio-on', localLoopOn);
      loopBtn.textContent = localLoopOn ? '🔇 Stop Problem Loop' : '▶ Live Sweep Loop';
    });
  }

  var mixPlayer = $('mix-player'), trackSelect = $('example-track'), mixPanel = document.querySelector('.eq-mix-player'), streamNote = $('eq-stream-note');
  function updateMixTime() {
    var fallback = mixTracks[trackSelect.value].duration;
    $('mix-time').textContent = timeLabel(mixPlayer.currentTime) + ' / ' + (Number.isFinite(mixPlayer.duration) ? timeLabel(mixPlayer.duration) : fallback);
  }
  trackSelect.addEventListener('change', function () {
    var track = mixTracks[trackSelect.value], resume = !mixPlayer.paused;
    mixPlayer.pause();
    if (streamNote) streamNote.hidden = true;
    $('mix-track-title').textContent = track.title;
    $('mix-track-detail').textContent = track.detail;
    $('mix-source-link').href = track.source;
    $('mix-time').textContent = '0:00 / ' + track.duration;
    mixPlayer.src = track.src;
    mixPlayer.load();
    if (resume) mixPlayer.addEventListener('canplay', function () { mixPlayer.play().catch(function () {}); }, { once: true });
  });
  mixPlayer.addEventListener('timeupdate', updateMixTime);
  mixPlayer.addEventListener('loadedmetadata', updateMixTime);
  mixPlayer.addEventListener('play', function () {
    if (localLoopOn && loopBtn) loopBtn.click();
    mixPanel.classList.add('playing');
  });
  mixPlayer.addEventListener('pause', function () { mixPanel.classList.remove('playing'); });
  mixPlayer.addEventListener('ended', function () { mixPanel.classList.remove('playing'); });
  mixPlayer.addEventListener('error', function () {
    if (streamNote) {
      streamNote.hidden = false;
      streamNote.textContent = 'External stream unavailable offline or blocked — use "Live Sweep Loop" above for full real-time EQ audio.';
    }
  });

  makeRotary('frequency', '20', '20k', 500);
  makeRotary('gain', '−15', '+12', 0);
  makeRotary('q', '.1', '10', 25);
  makeRotary('threshold', '−48', '−6', -24);
  makeRotary('hpf', '20', '250', 20);
  makeRotary('trim', '−12', '+12', 0);

  ['frequency', 'gain', 'q', 'threshold', 'hpf', 'trim'].forEach(function (id) { $(id).addEventListener('input', update); });
  $('shelf-direction').addEventListener('change', update);
  graphicInputs.forEach(function (input) {
    input.addEventListener('input', function () {
      input.previousElementSibling.value = (Number(input.value) > 0 ? '+' : '') + input.value;
      update();
    });
  });

  var resetBtn = $('eq-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      ['frequency', 'gain', 'q', 'threshold', 'hpf', 'trim'].forEach(function (id) {
        var el = $(id);
        el.value = el.dataset.defaultVal;
        syncKnob(el);
      });
      graphicInputs.forEach(function (inp) { inp.value = 0; inp.previousElementSibling.value = '0'; });
      bypassed = false;
      $('eq-bypass').setAttribute('aria-pressed', 'false');
      update();
    });
  }

  $('eq-type').addEventListener('change', setType);
  $('source').addEventListener('change', function (e) { choose(e.target.value); });
  $('eq-bypass').addEventListener('click', function () {
    bypassed = !bypassed;
    $('eq-bypass').setAttribute('aria-pressed', String(bypassed));
    update();
  });
  $('new-problem').addEventListener('click', function () { $('source').value = 'hidden'; choose('hidden'); });
  $('hear-before').addEventListener('click', function () { playSnapshot(false); });
  $('hear-after').addEventListener('click', function () { playSnapshot(true); });

  document.querySelectorAll('.te-musical-audio').forEach(function (audio) {
    audio.addEventListener('play', function () {
      document.querySelectorAll('.te-musical-audio').forEach(function (other) { if (other !== audio) other.pause(); });
      connectMusicalAudio(audio).catch(function () {});
    });
  });

  // Scenario Matching Quiz with Score Counter & Reset
  var scenarioSelects = Array.prototype.slice.call(document.querySelectorAll('.eq-scenario select'));
  var scenarioScoreEl = $('eq-scenario-score');
  function updateScenarioScore() {
    var right = 0, answered = 0;
    scenarioSelects.forEach(function (sel) {
      if (sel.value) answered++;
      if (sel.value === sel.dataset.answer) right++;
    });
    if (scenarioScoreEl) scenarioScoreEl.textContent = 'Score: ' + right + ' / ' + scenarioSelects.length + ' (' + answered + ' answered)';
  }
  scenarioSelects.forEach(function (select) {
    select.addEventListener('change', function () {
      var feedback = select.nextElementSibling;
      var correct = select.value === select.dataset.answer;
      feedback.className = 'eq-feedback ' + (!select.value ? '' : correct ? 'correct' : 'wrong');
      feedback.textContent = !select.value ? '' : correct ? '✓ Correct — this architecture matches the situation.' : '✗ Try again: check which controls and sidechain/phase behavior the problem needs.';
      updateScenarioScore();
    });
  });
  var resetScenariosBtn = $('eq-scenarios-reset');
  if (resetScenariosBtn) {
    resetScenariosBtn.addEventListener('click', function () {
      scenarioSelects.forEach(function (sel) {
        sel.value = '';
        sel.nextElementSibling.className = 'eq-feedback';
        sel.nextElementSibling.textContent = '';
      });
      updateScenarioScore();
    });
  }
  updateScenarioScore();

  choose('mud');
  $('source').value = 'hidden';
  setType();

  if (window.SimKit && SimKit.loop) {
    SimKit.loop(animateSpectrum, { el: spectrum, maxDt: 0.05 });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && localLoopOn && loopBtn) loopBtn.click();
  });
})();
