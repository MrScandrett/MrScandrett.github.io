/* Live Audio Signal Chain & Gain Staging Lab */
(function () {
  'use strict';

  var STAGES = [
    { icon: '🎤', name: 'Microphone', sub: 'capture',
      fact: '<strong>Microphone — sound becomes electricity:</strong> A mic turns air pressure waves into a tiny <em>mic-level</em> signal (~−50 dBFS). Dynamic mics need no external power; condenser mics require +48 V phantom power.' },
    { icon: '🔌', name: 'XLR Cable', sub: 'carry',
      fact: '<strong>XLR Cable — balanced &amp; latching:</strong> Three pins carry ground, hot (+), and cold (−). Subtracting them at the preamp cancels long-run cable hum.' },
    { icon: '🎛', name: 'Preamp / Gain', sub: 'boost',
      fact: '<strong>Preamp — set your −18 dBFS nominal level:</strong> Gain lifts mic level to line level. Too low buries the voice in preamp noise; too high clips the converter.' },
    { icon: '🎚', name: 'EQ', sub: 'shape',
      fact: '<strong>EQ — shape tone &amp; clear rumble:</strong> Cut unneeded sub-bass with an 80–100 Hz HPF and tame harsh room buildup before boosting.' },
    { icon: '🎛️', name: 'Fader', sub: 'mix',
      fact: '<strong>Channel fader — mix in context:</strong> With preamp gain staged near −18 dBFS, the channel fader lives comfortably around unity (0 dB).' },
    { icon: '🎼', name: 'Master', sub: 'sum',
      fact: '<strong>Master bus — final sum &amp; headroom:</strong> All channels sum here. Leave headroom below 0 dBFS so the PA never hits a square wall.' },
    { icon: '⚡', name: 'Amplifier', sub: 'power',
      fact: '<strong>Amplifier — voltage to watts:</strong> Amplifies whatever hits its input — clean speech or clipped waves alike.' },
    { icon: '🔊', name: 'Speaker', sub: 'deliver',
      fact: '<strong>Speaker — electricity back to air pressure:</strong> Aim mains at listeners and away from open stage mics to preserve gain before feedback.' }
  ];

  var chainRow = document.getElementById('chain-row');
  var stageFact = document.getElementById('stage-fact');
  var stageTabs = [];

  function selectStage(idx) {
    stageTabs.forEach(function (tab, i) {
      tab.setAttribute('aria-selected', i === idx ? 'true' : 'false');
    });
    stageFact.innerHTML = STAGES[idx].fact;
  }

  STAGES.forEach(function (st, i) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'chain-stage';
    el.setAttribute('role', 'tab');
    el.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    el.setAttribute('aria-controls', 'stage-fact');
    el.setAttribute('aria-label', st.name + ' (' + st.sub + ')');
    el.innerHTML = '<div class="st-icon">' + st.icon + '</div><div class="st-name">' + st.name + '</div><div class="st-sub">' + st.sub + '</div>';
    el.addEventListener('click', function () { selectStage(i); });
    chainRow.appendChild(el);
    stageTabs.push(el);
  });
  selectStage(0);

  // Workbench tab switching (Signal Chain vs Cable ID)
  var wbTabs = document.querySelectorAll('#signal-chain-app .te-wb-tab[data-panel]');
  var wbPanels = document.querySelectorAll('#signal-chain-app .te-wb-panel');
  wbTabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.dataset.panel;
      wbTabs.forEach(function (b) { b.setAttribute('aria-selected', b === btn ? 'true' : 'false'); });
      wbPanels.forEach(function (p) { p.hidden = p.id !== target; });
      if (scopeFit) scopeFit.resize();
    });
  });

  // Gain staging controls & model
  var sSrc = document.getElementById('s-src');
  var sGain = document.getElementById('s-gain');
  var sFader = document.getElementById('s-fader');
  var sMaster = document.getElementById('s-master');
  var micDynamicBtn = document.getElementById('sc-mic-dyn');
  var micCondBtn = document.getElementById('sc-mic-cond');
  var phantomBtn = document.getElementById('sc-phantom-btn');
  var sourceSel = document.getElementById('sc-audio-src');
  var presetIdealBtn = document.getElementById('sc-preset-ideal');
  var presetClipBtn = document.getElementById('sc-preset-clip');
  var toneBtn = document.getElementById('tone-btn');

  var micType = 'dynamic'; // 'dynamic' | 'condenser'
  var phantomOn = false;

  var SRC_WORDS = ['Silent', 'Whisper', 'Quiet', 'Medium', 'Strong', 'Belting'];
  function srcWord(v) {
    if (v <= 0) return SRC_WORDS[0];
    if (v < 20) return SRC_WORDS[1];
    if (v < 40) return SRC_WORDS[2];
    if (v < 60) return SRC_WORDS[3];
    if (v < 80) return SRC_WORDS[4];
    return SRC_WORDS[5];
  }

  function micPowered() {
    return micType === 'dynamic' || phantomOn;
  }

  function srcDb() {
    var v = parseFloat(sSrc.value);
    if (v <= 0 || !micPowered()) return -Infinity;
    var base = -66 + (v / 100) * 40; // -66..-26 dBFS
    if (micType === 'condenser') base += 6; // condensers have higher sensitivity
    return base;
  }

  function fmtDb(db) {
    if (db === -Infinity || db < -80) return '-∞';
    return (db > 0 ? '+' : '') + db.toFixed(1) + ' dB';
  }

  function meterPct(db) {
    if (db === -Infinity) return 0;
    return Math.max(0, Math.min(100, ((db + 60) / 66) * 100));
  }

  var els = {
    mPre: document.getElementById('m-pre'), dbPre: document.getElementById('db-pre'), clipPre: document.getElementById('clip-pre'),
    mCh: document.getElementById('m-ch'), dbCh: document.getElementById('db-ch'), clipCh: document.getElementById('clip-ch'),
    mOut: document.getElementById('m-out'), dbOut: document.getElementById('db-out'), clipOut: document.getElementById('clip-out'),
    verdict: document.getElementById('verdict')
  };

  var wobble = 0;
  function computeStage(w) {
    var pre = srcDb() + parseFloat(sGain.value) + w;
    var preClipped = pre > 0;
    var preOut = Math.min(pre, 0);
    var faderVal = parseFloat(sFader.value);
    var ch = faderVal <= -60 ? -Infinity : preOut + faderVal;
    var chClipped = ch > 0;
    var chOut = Math.min(ch, 0);
    var masterVal = parseFloat(sMaster.value);
    var out = masterVal <= -60 ? -Infinity : chOut + masterVal;
    var outClipped = out > 0;
    return { pre: pre, ch: ch, out: out, preClipped: preClipped, chClipped: chClipped, outClipped: outClipped };
  }

  var clipHold = { pre: -1e9, ch: -1e9, out: -1e9 };
  var lastVerdict = '';
  var lastVerdictCls = '';

  function updateMetersAndVerdict() {
    var nom = computeStage(0);
    var L = nom;
    if (toneOn && nodes) {
      var peaks = nodes.taps.map(function (tap) {
        tap.analyser.getFloatTimeDomainData(tap.samples);
        var peak = 0;
        for (var i = 0; i < tap.samples.length; i++) peak = Math.max(peak, Math.abs(tap.samples[i]));
        return 20 * Math.log10(peak);
      });
      L = { pre: peaks[0], ch: peaks[1], out: peaks[2],
        preClipped: peaks[0] > 0, chClipped: peaks[1] > 0, outClipped: peaks[2] > 0 };
    }
    var now = performance.now();
    if (L.preClipped) clipHold.pre = now;
    if (L.chClipped) clipHold.ch = now;
    if (L.outClipped) clipHold.out = now;

    els.mPre.style.height = meterPct(L.pre) + '%';
    els.mCh.style.height = meterPct(L.ch) + '%';
    els.mOut.style.height = meterPct(L.out) + '%';
    els.dbPre.textContent = fmtDb(L.pre);
    els.dbCh.textContent = fmtDb(L.ch);
    els.dbOut.textContent = fmtDb(L.out);
    els.clipPre.classList.toggle('lit', now - clipHold.pre < 900);
    els.clipCh.classList.toggle('lit', now - clipHold.ch < 900);
    els.clipOut.classList.toggle('lit', now - clipHold.out < 900);

    var srcV = parseFloat(sSrc.value);
    document.getElementById('v-src').textContent = srcWord(srcV);
    document.getElementById('v-gain').textContent = '+' + sGain.value + ' dB';
    document.getElementById('v-fader').textContent = fmtDb(parseFloat(sFader.value) <= -60 ? -Infinity : parseFloat(sFader.value));
    document.getElementById('v-master').textContent = fmtDb(parseFloat(sMaster.value) <= -60 ? -Infinity : parseFloat(sMaster.value));

    var msg, cls = '';
    if (micType === 'condenser' && !phantomOn) {
      msg = '🔇 Condenser mic needs +48 V phantom power — toggle +48 V ON so its internal preamp turns on.';
      cls = 'bad';
    } else if (srcV <= 0) {
      msg = 'The singer is silent — bring up the source slider to stage gain.';
    } else if (L.preClipped) {
      msg = '🔴 The PREAMP is clipping (' + fmtDb(L.pre) + '). Pull GAIN down until peaks sit near −18 dBFS to −6 dBFS.';
      cls = 'bad';
    } else if (L.chClipped || L.outClipped) {
      msg = '🔴 Post-fader clipping — pull the ' + (L.chClipped ? 'channel fader' : 'master fader') + ' down toward unity (0 dB).';
      cls = 'bad';
    } else if (L.pre < -28) {
      msg = 'Signal is buried near the preamp noise floor (' + fmtDb(L.pre) + ') — raise GAIN toward −18 dBFS instead of cranking faders.';
    } else if (L.pre <= -4 && Math.abs(parseFloat(sFader.value)) <= 6 && Math.abs(parseFloat(sMaster.value)) <= 6 && L.out > -22) {
      msg = '🟢 Clean peaks, headroom at the preamp, and faders near unity.';
      cls = 'good';
    } else {
      msg = 'Aim for preamp peaks between −18 dBFS and −6 dBFS with faders near unity (0 dB).';
    }

    if (msg !== lastVerdict || cls !== lastVerdictCls) {
      lastVerdict = msg;
      lastVerdictCls = cls;
      els.verdict.textContent = msg;
      els.verdict.className = 'verdict' + (cls ? ' ' + cls : '');
    }
  }

  // Live Oscilloscope showing peak flattening when clipped
  var scopeCanvas = document.getElementById('sc-scope');
  var scopeFit = window.SimKit ? SimKit.canvas2d(scopeCanvas, { box: scopeCanvas.parentElement }) : null;

  function drawScope() {
    if (!scopeCanvas) return;
    var c = scopeFit ? scopeFit.ctx : scopeCanvas.getContext('2d');
    var W = scopeFit ? scopeFit.width : scopeCanvas.width;
    var H = scopeFit ? scopeFit.height : scopeCanvas.height;
    if (!W || !H) return;
    c.clearRect(0, 0, W, H);
    c.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, H * 0.5); c.lineTo(W, H * 0.5);
    c.moveTo(0, H * 0.14); c.lineTo(W, H * 0.14);
    c.moveTo(0, H * 0.86); c.lineTo(W, H * 0.86);
    c.stroke();

    if (toneOn && nodes) {
      var trace = nodes.trace;
      trace.analyser.getFloatTimeDomainData(trace.samples);
      var start = 1;
      while (start < trace.samples.length / 2 && !(trace.samples[start - 1] <= 0 && trace.samples[start] > 0)) start++;
      var count = Math.min(trace.samples.length - start, Math.round(audioSys.ctx.sampleRate * 0.010));
      c.strokeStyle = '#96f5a7';
      c.lineWidth = 2;
      c.beginPath();
      for (var j = 0; j < count; j++) {
        var yPos = H * (0.5 - 0.36 * trace.samples[start + j]);
        if (j === 0) c.moveTo(0, yPos);
        else c.lineTo(j * W / (count - 1), yPos);
      }
      c.stroke();
      return;
    }
    var nom = computeStage(0);
    var linOut = nom.out === -Infinity ? 0 : Math.pow(10, nom.out / 20);
    var preGain = nom.pre === -Infinity ? 0 : Math.pow(10, nom.pre / 20);
    var chGain = nom.ch === -Infinity ? 0 : Math.pow(10, nom.ch / 20);
    var clipped = nom.preClipped || nom.chClipped || nom.outClipped;

    c.strokeStyle = clipped ? '#ff766c' : (micPowered() && parseFloat(sSrc.value) > 0 ? '#66d28a' : '#64748b');
    c.lineWidth = 2;
    c.beginPath();
    var mid = H * 0.5;
    var ampPx = H * 0.36;
    for (var x = 0; x <= W; x += 2) {
      var t = (x / W) * Math.PI * 4 + wobble * 1.4;
      var raw = Math.sin(t) * 0.72 + Math.sin(t * 2.02) * 0.28;
      // Apply stage-by-stage clipping accurately
      var s1 = Math.max(-1, Math.min(1, raw * preGain));
      var postFaderRatio = preGain > 0 ? (chGain / Math.min(1, preGain)) : 0;
      var s2 = Math.max(-1, Math.min(1, s1 * postFaderRatio));
      var postMasterRatio = chGain > 0 ? (linOut / Math.min(1, chGain)) : 0;
      var s3 = Math.max(-1, Math.min(1, s2 * postMasterRatio));
      var y = mid - s3 * ampPx;
      if (x === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  }

  // Web Audio chain with Preamp Noise Floor + 3 Clip Stages
  var audioSys = null, nodes = null, toneOn = false;

  function buildAudio() {
    var synth = window.AudioLabSynth;
    audioSys = synth ? synth.createContext({ gain: 0.34 }) : null;
    if (!audioSys) return;
    var ctx = audioSys.ctx;

    var vocalBuf = synth.createVocalPhraseBuffer(ctx);
    var noiseBuf = synth.createNoiseBuffer(ctx, 2.0, 'pink');

    var vocalSrc = ctx.createBufferSource();
    vocalSrc.buffer = vocalBuf;
    vocalSrc.loop = true;

    var pinkSrc = ctx.createBufferSource();
    pinkSrc.buffer = noiseBuf;
    pinkSrc.loop = true;

    var toneOsc = ctx.createOscillator();
    toneOsc.type = 'sine';
    toneOsc.frequency.value = 196;

    // Subtle self-noise injected right after mic capsule (so low preamp gain + cranked fader boosts hiss)
    var hissSrc = ctx.createBufferSource();
    hissSrc.buffer = synth.createNoiseBuffer(ctx, 2.0, 'white', 777);
    hissSrc.loop = true;
    var hissGain = ctx.createGain();
    hissGain.gain.value = 0.0022;

    var vocalBus = ctx.createGain(); vocalBus.gain.value = 1;
    var pinkBus = ctx.createGain(); pinkBus.gain.value = 0;
    var toneBus = ctx.createGain(); toneBus.gain.value = 0;

    var srcGain = ctx.createGain();
    var trimGain = ctx.createGain();
    var preClip = ctx.createWaveShaper(); preClip.curve = new Float32Array([-1, 0, 1]);
    var faderGain = ctx.createGain();
    var chClip = ctx.createWaveShaper(); chClip.curve = new Float32Array([-1, 0, 1]);
    var masterGain = ctx.createGain();
    var outClip = ctx.createWaveShaper(); outClip.curve = new Float32Array([-1, 0, 1]);
    var muteGate = ctx.createGain(); muteGate.gain.value = 0;

    vocalSrc.connect(vocalBus).connect(srcGain);
    pinkSrc.connect(pinkBus).connect(srcGain);
    toneOsc.connect(toneBus).connect(srcGain);

    srcGain.connect(trimGain);
    hissSrc.connect(hissGain).connect(trimGain);
    trimGain.connect(preClip).connect(faderGain).connect(chClip).connect(masterGain).connect(outClip).connect(muteGate).connect(audioSys.input);

    vocalSrc.start(); pinkSrc.start(); toneOsc.start(); hissSrc.start();
    function tap(stage) {
      var analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      stage.connect(analyser);
      return { analyser: analyser, samples: new Float32Array(analyser.fftSize) };
    }
    nodes = {
      taps: [trimGain, faderGain, masterGain].map(tap), trace: tap(outClip),
      vocalBus: vocalBus, pinkBus: pinkBus, toneBus: toneBus,
      srcGain: srcGain, hissGain: hissGain, trimGain: trimGain,
      faderGain: faderGain, masterGain: masterGain, muteGate: muteGate
    };
  }

  function dbToLin(db) { return db === -Infinity || db <= -80 ? 0 : Math.pow(10, db / 20); }

  function updateAudio() {
    if (!nodes || !audioSys) return;
    var ctx = audioSys.ctx;
    var sm = window.AudioLabSynth.smooth;
    var mode = sourceSel ? sourceSel.value : 'vocal';
    sm(nodes.vocalBus.gain, mode === 'vocal' ? 1 : 0, ctx, 0.02);
    sm(nodes.pinkBus.gain, mode === 'pink' ? 1 : 0, ctx, 0.02);
    sm(nodes.toneBus.gain, mode === 'tone' ? 1 : 0, ctx, 0.02);

    var sdb = srcDb();
    sm(nodes.srcGain.gain, dbToLin(sdb), ctx, 0.02);
    sm(nodes.hissGain.gain, micPowered() && mode !== 'tone' ? 0.00022 : 0, ctx, 0.02);
    sm(nodes.trimGain.gain, dbToLin(parseFloat(sGain.value)), ctx, 0.02);
    var fv = parseFloat(sFader.value);
    sm(nodes.faderGain.gain, fv <= -60 ? 0 : dbToLin(fv), ctx, 0.02);
    var mv = parseFloat(sMaster.value);
    sm(nodes.masterGain.gain, mv <= -60 ? 0 : dbToLin(mv), ctx, 0.02);
    sm(nodes.muteGate.gain, toneOn && !document.hidden ? 1 : 0, ctx, 0.025);
  }

  function setMicType(kind) {
    micType = kind;
    micDynamicBtn.setAttribute('aria-pressed', kind === 'dynamic' ? 'true' : 'false');
    micCondBtn.setAttribute('aria-pressed', kind === 'condenser' ? 'true' : 'false');
    updateMetersAndVerdict();
    updateAudio();
  }

  micDynamicBtn.addEventListener('click', function () { setMicType('dynamic'); });
  micCondBtn.addEventListener('click', function () { setMicType('condenser'); });
  phantomBtn.addEventListener('click', function () {
    phantomOn = !phantomOn;
    phantomBtn.setAttribute('aria-pressed', phantomOn ? 'true' : 'false');
    phantomBtn.textContent = phantomOn ? '+48 V: ON' : '+48 V: OFF';
    updateMetersAndVerdict();
    updateAudio();
  });
  if (sourceSel) sourceSel.addEventListener('change', updateAudio);

  presetIdealBtn.addEventListener('click', function () {
    sSrc.value = 50;
    sGain.value = micType === 'condenser' ? 22 : 28;
    sFader.value = 0;
    sMaster.value = 0;
    if (micType === 'condenser' && !phantomOn) phantomBtn.click();
    updateMetersAndVerdict();
    updateAudio();
  });

  presetClipBtn.addEventListener('click', function () {
    sSrc.value = 85;
    sGain.value = 44;
    sFader.value = 4;
    sMaster.value = 0;
    if (micType === 'condenser' && !phantomOn) phantomBtn.click();
    updateMetersAndVerdict();
    updateAudio();
  });

  [sSrc, sGain, sFader, sMaster].forEach(function (s) {
    s.addEventListener('input', function () {
      updateMetersAndVerdict();
      updateAudio();
    });
  });

  toneBtn.addEventListener('click', function () {
    if (!audioSys) buildAudio();
    if (audioSys) audioSys.resume();
    toneOn = Boolean(audioSys) && !toneOn;
    document.getElementById('sc-trace-label').textContent = toneOn ? 'Live · 1 ms/div' : 'Model preview';
    toneBtn.textContent = toneOn ? '🔇 Stop Audio' : '🔊 Listen to Chain';
    toneBtn.classList.toggle('audio-on', toneOn);
    toneBtn.setAttribute('aria-pressed', toneOn ? 'true' : 'false');
    updateAudio();
  });

  // Cable ID Challenge
  var CABLE_SVGS = {
    xlr: '<svg viewBox="0 0 96 64" role="img" aria-label="XLR connector with three pins and a locking release tab"><rect x="6" y="22" width="42" height="20" rx="6" fill="#3a3a44"/><rect x="34" y="16" width="12" height="7" rx="2" fill="#9ca3af"/><circle cx="66" cy="32" r="22" fill="#4a4a56" stroke="#8a8a9a" stroke-width="2"/><circle cx="60" cy="24" r="4.5" fill="#d8d8e2"/><circle cx="74" cy="32" r="4.5" fill="#d8d8e2"/><circle cx="60" cy="40" r="4.5" fill="#d8d8e2"/></svg>',
    trs: '<svg viewBox="0 0 96 64" role="img" aria-label="TRS quarter-inch plug with two dark separator rings"><rect x="4" y="24" width="30" height="16" rx="5" fill="#3a3a44"/><rect x="34" y="26" width="34" height="12" rx="2" fill="#c8c8d4"/><rect x="46" y="26" width="5" height="12" fill="#14141a"/><rect x="58" y="26" width="5" height="12" fill="#14141a"/><path d="M68 26 h12 q10 6 0 12 h-12 z" fill="#c8c8d4"/></svg>',
    ts: '<svg viewBox="0 0 96 64" role="img" aria-label="TS quarter-inch plug with one dark separator ring"><rect x="4" y="24" width="30" height="16" rx="5" fill="#3a3a44"/><rect x="34" y="26" width="34" height="12" rx="2" fill="#c8c8d4"/><rect x="52" y="26" width="5" height="12" fill="#14141a"/><path d="M68 26 h12 q10 6 0 12 h-12 z" fill="#c8c8d4"/></svg>',
    speakon: '<svg viewBox="0 0 96 64" role="img" aria-label="NL4 Speakon twist-lock loudspeaker connector"><rect x="8" y="20" width="36" height="24" rx="5" fill="#2c3545"/><circle cx="64" cy="32" r="21" fill="#1f2937" stroke="#38bdf8" stroke-width="2.5"/><circle cx="64" cy="32" r="10" fill="#0f172a"/><rect x="45" y="14" width="12" height="6" rx="2" fill="#38bdf8"/></svg>'
  };

  var QUIZ = [
    { q: 'The lead vocalist\'s mic needs a 50-foot run across stage to the snake. Which cable?', a: 'xlr',
      why: 'XLR — balanced (cancels hum) and locks securely onto mics and stage boxes.' },
    { q: 'A guitarist plugs straight into an amp 6 feet away. Which ¼″ cable?', a: 'ts',
      why: 'TS — one ring, unbalanced instrument cable. Fine for short runs to an amp or DI box.' },
    { q: 'A balanced line feed from the mixer\'s aux output to a powered wedge. Which ¼″ cable?', a: 'trs',
      why: 'TRS — two rings, balanced. It rejects interference just like XLR.' },
    { q: 'A heavy-duty twist-lock speaker cable carrying 800 watts from a power amp to a passive cabinet:', a: 'speakon',
      why: 'NL4 Speakon — heavy-gauge locking speaker connector built for high amplifier current.' },
    { q: 'Which microphone connector physically locks with a spring latch so a tripped cord stays plugged in?', a: 'xlr',
      why: 'XLR has a release tab latch — essential stage insurance.' },
    { q: 'Count the dark rings on a ¼″ plug: TWO rings means…', a: 'trs',
      why: 'Tip-Ring-Sleeve. Two insulator rings separate three conductors for balanced mono or stereo.' }
  ];

  var NAMES = { xlr: 'XLR', trs: 'TRS ¼″', ts: 'TS ¼″', speakon: 'NL4 Speakon' };
  var quizIdx = 0, quizScore = 0, quizAnswered = false;
  var cableGrid = document.getElementById('cable-grid');
  var quizQ = document.getElementById('quiz-q');
  var quizScoreEl = document.getElementById('quiz-score');
  var quizNextBtn = document.getElementById('sc-quiz-next');

  Object.keys(NAMES).forEach(function (key) {
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'cable-card';
    card.dataset.key = key;
    card.innerHTML = CABLE_SVGS[key] + '<div class="cable-name">' + NAMES[key] + '</div>';
    card.addEventListener('click', function () { answerQuiz(key, card); });
    cableGrid.appendChild(card);
  });

  function renderQuestion() {
    quizAnswered = false;
    cableGrid.querySelectorAll('.cable-card').forEach(function (c) { c.className = 'cable-card'; });
    if (quizIdx >= QUIZ.length) {
      quizQ.innerHTML = '🏁 <strong>Challenge complete — ' + quizScore + '/' + QUIZ.length + '.</strong> ' +
        (quizScore === QUIZ.length ? 'Clean sweep! Ready to patch the stage.' : 'Try again to lock in every connector.');
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

  function answerQuiz(key, card) {
    if (quizAnswered || quizIdx >= QUIZ.length) return;
    quizAnswered = true;
    var item = QUIZ[quizIdx];
    var ok = key === item.a;
    if (ok) quizScore++;
    card.classList.add(ok ? 'correct' : 'wrong');
    if (!ok) {
      var right = cableGrid.querySelector('[data-key="' + item.a + '"]');
      if (right) right.classList.add('correct');
    }
    quizQ.innerHTML = (ok ? '✅ ' : '❌ ') + item.why;
    quizScoreEl.textContent = 'Score: ' + quizScore + '/' + (quizIdx + 1);
    quizIdx++;
    quizNextBtn.textContent = quizIdx >= QUIZ.length ? 'See Final Score →' : 'Next question →';
    quizNextBtn.hidden = false;
  }

  quizNextBtn.addEventListener('click', function () {
    if (quizIdx >= QUIZ.length && !quizAnswered) {
      quizIdx = 0;
      quizScore = 0;
    }
    renderQuestion();
  });

  renderQuestion();
  updateMetersAndVerdict();

  var loopTarget = document.getElementById('signal-chain-app');
  if (window.SimKit && SimKit.loop) {
    SimKit.loop(function (dt) {
      wobble += dt * 4.5;
      updateMetersAndVerdict();
      drawScope();
    }, { el: loopTarget, maxDt: 0.05 });
  } else {
    updateMetersAndVerdict();
    drawScope();
  }
  document.addEventListener('visibilitychange', updateAudio);
})();
