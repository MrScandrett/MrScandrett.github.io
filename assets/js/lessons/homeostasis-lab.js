(function (root) {
  'use strict';

  var SETPOINT_NORMAL = 37.0;
  var SETPOINT_FEVER = 38.8;
  var HYPER_LIMIT = 40.0;
  var HYPO_LIMIT = 34.0;
  var CLOTHING_LABELS = ['Light', 'Medium', 'Heavy'];
  var CLOTHING_INSULATION = [0.4, 1.0, 1.7];

  var THERMO_PRESETS = {
    resting: { label: 'Resting Room', ambient: 20, exercise: 0, clothing: 1, fever: false },
    winter: { label: 'Winter Sprint', ambient: -5, exercise: 85, clothing: 0, fever: false },
    heatwave: { label: 'Heat Wave', ambient: 40, exercise: 50, clothing: 2, fever: false },
    fever: { label: 'Fever Onset', ambient: 20, exercise: 0, clothing: 1, fever: true }
  };

  var FEEDBACK_SCENARIOS = [
    {
      id: 'recess',
      prompt: 'Scenario 1: Overheating during recess — which body structure acts as the Control Center comparing core temperature to 37°C?',
      options: [
        { key: 'a', text: 'Hypothalamus in the brain' },
        { key: 'b', text: 'Sweat glands in the skin' },
        { key: 'c', text: 'Skeletal muscles in the legs' }
      ],
      answer: 'a',
      explanation: 'Thermoreceptors sense heat (sensor), the hypothalamus compares against the setpoint (control center), and sweat glands/skin vessels respond (effectors).'
    },
    {
      id: 'glucose',
      prompt: 'Scenario 2: Blood glucose spikes after lunch — what acts as the Effector molecule that lowers blood sugar back toward baseline?',
      options: [
        { key: 'a', text: 'Insulin secreted by pancreatic beta cells' },
        { key: 'b', text: 'Baroreceptors in the carotid artery' },
        { key: 'c', text: 'Shivering skeletal muscle' }
      ],
      answer: 'a',
      explanation: 'Elevated glucose stimulates pancreatic beta cells to release insulin, signaling liver and muscle cells to absorb glucose.'
    },
    {
      id: 'standing',
      prompt: 'Scenario 3: Standing up quickly causes arterial pressure to dip — which Sensor detects that rapid pressure drop?',
      options: [
        { key: 'a', text: 'Baroreceptors in major arteries' },
        { key: 'b', text: 'Alveoli in the lungs' },
        { key: 'c', text: 'Keratin in the skin' }
      ],
      answer: 'a',
      explanation: 'Arterial baroreceptors immediately sense stretch changes and signal the brainstem to adjust heart rate and blood vessel tone.'
    }
  ];

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function stepThermoModel(state, dt) {
    var simDt = dt * 6;
    var setpoint = state.feverMode ? SETPOINT_FEVER : SETPOINT_NORMAL;
    var insulation = CLOTHING_INSULATION[state.clothing] || 1.0;
    var ambientPull = (state.ambientTemp - state.coreTemp) * 0.006 / insulation;
    var restingHeat = 0.102;
    var exerciseHeat = (state.exercise / 100) * 0.09;
    var delta = ambientPull + restingHeat + exerciseHeat;
    var responseLabel = 'None (within setpoint band)';

    if (state.feedbackOn) {
      var error = state.coreTemp - setpoint;
      if (error > 0.15) {
        var strength = clamp(error * 0.38, 0, 0.24);
        delta -= strength;
        responseLabel = error > 1.5 ? 'Heavy sweating + vasodilation' : 'Sweating + vasodilation';
      } else if (error < -0.15) {
        var strength2 = clamp(-error * 0.38, 0, 0.24);
        delta += strength2;
        responseLabel = error < -1.5 ? 'Shivering hard + vasoconstriction' : 'Mild shivering + vasoconstriction';
      }
    } else {
      responseLabel = 'Disabled — no correction';
    }

    return {
      coreTemp: clamp(state.coreTemp + delta * simDt, 25, 45),
      elapsed: state.elapsed + simDt,
      setpoint: setpoint,
      responseLabel: responseLabel
    };
  }

  function statusFor(temp, setpoint) {
    var sp = setpoint || SETPOINT_NORMAL;
    var bandLow = sp - 0.5;
    var bandHigh = sp + 0.5;
    if (temp >= HYPER_LIMIT) return { label: 'Very high in model', cls: 'high' };
    if (temp > bandHigh) return { label: 'Elevated', cls: 'high' };
    if (temp <= HYPO_LIMIT) return { label: 'Very low in model', cls: 'low' };
    if (temp < bandLow) return { label: 'Low', cls: 'low' };
    return { label: 'Stable', cls: 'stable' };
  }

  function mount() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    var canvas = document.getElementById('thermoCanvas');
    if (!canvas || typeof window.SimKit === 'undefined') return;

    var wrap = canvas.parentElement;
    var tempValEl = document.getElementById('tempVal');
    var statusValEl = document.getElementById('statusVal');
    var responseValEl = document.getElementById('responseVal');
    var setpointValEl = document.getElementById('setpointVal');
    var textEl = document.getElementById('thermoText');
    var samplesEl = document.getElementById('thermoSamples');
    var feverToggleBtn = document.getElementById('feverToggleBtn');

    var ambientTemp = 20;
    var exercise = 0;
    var clothing = 1;
    var feedbackOn = true;
    var feverMode = false;
    var running = true;

    var coreTemp = 37.0;
    var history = [];
    var elapsed = 0;
    var nextSample = 5;
    var responseLabel = 'None';

    function currentSetpoint() {
      return feverMode ? SETPOINT_FEVER : SETPOINT_NORMAL;
    }

    function updateReadout() {
      var sp = currentSetpoint();
      var st = statusFor(coreTemp, sp);
      tempValEl.textContent = coreTemp.toFixed(1) + '°C';
      tempValEl.className = 'big ' + st.cls;
      statusValEl.textContent = st.label;
      statusValEl.className = st.cls;
      responseValEl.textContent = responseLabel;
      if (setpointValEl) setpointValEl.textContent = sp.toFixed(1) + '°C';
    }

    function describeState() {
      var sp = currentSetpoint();
      textEl.textContent = 'Model minute ' + elapsed.toFixed(1) + ': core temperature ' + coreTemp.toFixed(1) +
        '°C (target ' + sp.toFixed(1) + '°C), ' + statusFor(coreTemp, sp).label.toLowerCase() +
        '. Feedback ' + (feedbackOn ? 'on' : 'off') + '. Simulation ' + (running ? 'running' : 'paused') +
        '. Response: ' + responseLabel + '.';
    }

    function addSample() {
      var row = document.createElement('tr');
      [elapsed.toFixed(1), coreTemp.toFixed(1) + '°C', currentSetpoint().toFixed(1) + '°C', feedbackOn ? 'On' : 'Off', responseLabel].forEach(function (value) {
        var cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      samplesEl.appendChild(row);
      while (samplesEl.rows.length > 20) samplesEl.deleteRow(0);
      describeState();
    }

    function stepSimulation(dt) {
      var next = stepThermoModel({
        coreTemp: coreTemp,
        elapsed: elapsed,
        ambientTemp: ambientTemp,
        exercise: exercise,
        clothing: clothing,
        feedbackOn: feedbackOn,
        feverMode: feverMode
      }, dt);
      coreTemp = next.coreTemp;
      elapsed = next.elapsed;
      responseLabel = next.responseLabel;

      history.push({ t: elapsed, temp: coreTemp });
      if (elapsed >= nextSample) {
        addSample();
        nextSample += 5;
      }
      var maxHistorySeconds = 180;
      while (history.length && (elapsed - history[0].t) > maxHistorySeconds) {
        history.shift();
      }
    }

    function render(ctx, w, h) {
      if (!w || !h) return;
      var sp = currentSetpoint();
      var bandLow = sp - 0.5;
      var bandHigh = sp + 0.5;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#1a1210';
      ctx.fillRect(0, 0, w, h);

      var padL = 46, padR = 14, padT = 14, padB = 26;
      var plotW = w - padL - padR;
      var plotH = h - padT - padB;
      var tMin = 25, tMax = 45;
      function yForTemp(temp) {
        var t = clamp((temp - tMin) / (tMax - tMin), 0, 1);
        return padT + (1 - t) * plotH;
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.fillStyle = 'rgba(255,225,215,0.55)';
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.textAlign = 'right';
      for (var gt = 25; gt <= 45; gt += 5) {
        var gy = yForTemp(gt);
        ctx.beginPath();
        ctx.moveTo(padL, gy);
        ctx.lineTo(w - padR, gy);
        ctx.stroke();
        ctx.fillText(gt + '°', padL - 6, gy + 3);
      }

      ctx.fillStyle = feverMode ? 'rgba(251, 191, 36, 0.18)' : 'rgba(143, 227, 161, 0.18)';
      var yHigh = yForTemp(bandHigh);
      var yLow = yForTemp(bandLow);
      ctx.fillRect(padL, yHigh, plotW, yLow - yHigh);
      ctx.strokeStyle = feverMode ? 'rgba(251, 191, 36, 0.7)' : 'rgba(143, 227, 161, 0.5)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, yForTemp(sp));
      ctx.lineTo(w - padR, yForTemp(sp));
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255, 138, 118, 0.10)';
      ctx.fillRect(padL, padT, plotW, yForTemp(HYPER_LIMIT) - padT);
      ctx.fillRect(padL, yForTemp(HYPO_LIMIT), plotW, (padT + plotH) - yForTemp(HYPO_LIMIT));

      if (history.length > 1) {
        var tStart = history[0].t;
        var tEnd = Math.max(1, history[history.length - 1].t - tStart);
        ctx.beginPath();
        for (var i = 0; i < history.length; i++) {
          var pt = history[i];
          var x = padL + ((pt.t - tStart) / tEnd) * plotW;
          var y = yForTemp(pt.temp);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#c23b3b';
        ctx.lineWidth = 2.4;
        ctx.stroke();

        var last = history[history.length - 1];
        ctx.beginPath();
        ctx.arc(padL + plotW, yForTemp(last.temp), 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd9cc';
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(255,225,215,0.5)';
      ctx.textAlign = 'left';
      ctx.font = '10px IBM Plex Mono, monospace';
      ctx.fillText('Core temperature over time (setpoint ' + sp.toFixed(1) + '°C) →', padL, h - 8);
    }

    var sk = window.SimKit.canvas2d(canvas, { box: wrap, dpr: 2, height: 360, onResize: render });

    window.SimKit.loop(function (dt) {
      if (running) stepSimulation(dt);
      updateReadout();
      render(sk.ctx, sk.width, sk.height);
    }, { el: window.SimKit.stage(canvas) });

    function syncInputs() {
      document.getElementById('ambientSlider').value = ambientTemp;
      document.getElementById('ambientLbl').textContent = ambientTemp + '°C';
      document.getElementById('exerciseSlider').value = exercise;
      document.getElementById('exerciseLbl').textContent = exercise + '%';
      document.getElementById('clothingSlider').value = clothing;
      document.getElementById('clothingLbl').textContent = CLOTHING_LABELS[clothing];
      if (feverToggleBtn) {
        feverToggleBtn.textContent = feverMode ? 'Setpoint: Fever (38.8°C)' : 'Setpoint: Normal (37.0°C)';
        feverToggleBtn.setAttribute('aria-pressed', String(feverMode));
        feverToggleBtn.classList.toggle('primary', feverMode);
      }
    }

    document.getElementById('ambientSlider').addEventListener('input', function (e) {
      ambientTemp = parseInt(e.target.value, 10);
      document.getElementById('ambientLbl').textContent = ambientTemp + '°C';
    });

    document.getElementById('exerciseSlider').addEventListener('input', function (e) {
      exercise = parseInt(e.target.value, 10);
      document.getElementById('exerciseLbl').textContent = exercise + '%';
    });

    document.getElementById('clothingSlider').addEventListener('input', function (e) {
      clothing = parseInt(e.target.value, 10);
      document.getElementById('clothingLbl').textContent = CLOTHING_LABELS[clothing];
    });

    document.getElementById('feedbackToggleBtn').addEventListener('click', function (e) {
      feedbackOn = !feedbackOn;
      e.target.textContent = 'Feedback Loop: ' + (feedbackOn ? 'ON' : 'OFF');
      e.target.classList.toggle('primary', feedbackOn);
      e.target.setAttribute('aria-pressed', String(feedbackOn));
      describeState();
    });

    if (feverToggleBtn) {
      feverToggleBtn.addEventListener('click', function () {
        feverMode = !feverMode;
        syncInputs();
        updateReadout();
        describeState();
      });
    }

    document.getElementById('pausePlayBtn').addEventListener('click', function (e) {
      running = !running;
      e.target.textContent = running ? 'Pause' : 'Play';
      describeState();
    });

    function resetAll(preset) {
      coreTemp = 37.0;
      history = [];
      elapsed = 0;
      nextSample = 5;
      samplesEl.innerHTML = '';
      running = true;
      feedbackOn = true;
      if (preset) {
        ambientTemp = preset.ambient;
        exercise = preset.exercise;
        clothing = preset.clothing;
        feverMode = !!preset.fever;
      } else {
        ambientTemp = 20;
        exercise = 0;
        clothing = 1;
        feverMode = false;
      }
      syncInputs();
      document.getElementById('pausePlayBtn').textContent = 'Pause';
      var fbBtn = document.getElementById('feedbackToggleBtn');
      fbBtn.textContent = 'Feedback Loop: ON';
      fbBtn.classList.add('primary');
      fbBtn.setAttribute('aria-pressed', 'true');
      responseLabel = 'None';
      updateReadout();
      addSample();
    }

    document.getElementById('resetThermoBtn').addEventListener('click', function () { resetAll(null); });

    document.querySelectorAll('[data-thermo-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var preset = THERMO_PRESETS[btn.dataset.thermoPreset];
        if (preset) resetAll(preset);
      });
    });

    // ── Feedback Loop Scenario Matcher ──────────────────────────────────
    var quizEl = document.getElementById('homeoScenarioQuiz');
    var quizScoreEl = document.getElementById('homeoScenarioScore');
    if (quizEl) {
      var results = {};
      FEEDBACK_SCENARIOS.forEach(function (q, idx) {
        var card = document.createElement('div');
        card.className = 'homeo-quiz-item';
        var optsHtml = q.options.map(function (opt) {
          return '<button type="button" class="homeo-btn" data-opt="' + opt.key + '">' + opt.text + '</button>';
        }).join('');
        card.innerHTML =
          '<p class="homeo-quiz-q"><strong>' + (idx + 1) + '.</strong> ' + q.prompt + '</p>' +
          '<div class="homeo-quiz-opts">' + optsHtml + '</div>' +
          '<p class="homeo-quiz-fb" aria-live="polite"></p>';
        var fb = card.querySelector('.homeo-quiz-fb');
        var btns = card.querySelectorAll('button');
        btns.forEach(function (btn) {
          btn.addEventListener('click', function () {
            var ok = btn.dataset.opt === q.answer;
            results[q.id] = ok;
            btns.forEach(function (b) {
              var active = b === btn;
              b.classList.toggle('primary', active);
              b.setAttribute('aria-pressed', String(active));
            });
            card.classList.toggle('is-correct', ok);
            card.classList.toggle('is-wrong', !ok);
            fb.textContent = (ok ? '✓ Correct. ' : 'Try again. ') + q.explanation;
            if (quizScoreEl) {
              var score = Object.values(results).filter(Boolean).length;
              quizScoreEl.textContent = score + ' of ' + FEEDBACK_SCENARIOS.length + ' feedback roles matched.';
            }
          });
        });
        quizEl.appendChild(card);
      });
    }

    syncInputs();
    updateReadout();
    addSample();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount);
    } else {
      mount();
    }
  }

  var api = {
    SETPOINT_NORMAL: SETPOINT_NORMAL,
    SETPOINT_FEVER: SETPOINT_FEVER,
    THERMO_PRESETS: THERMO_PRESETS,
    stepThermoModel: stepThermoModel,
    statusFor: statusFor
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.HomeostasisLab = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
