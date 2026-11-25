(function (root) {
  'use strict';

  var SYMPTOM_THRESHOLD = 25;

  var IMMUNE_QUESTIONS = [
    {
      id: 'layers',
      prompt: 'Which line of defense includes B cells, T cells, antibodies, and long-term immunological memory?',
      options: [
        { key: 'a', text: 'Line 1: Physical and chemical barriers' },
        { key: 'b', text: 'Line 2: Innate immunity' },
        { key: 'c', text: 'Line 3: Adaptive immunity' }
      ],
      answer: 'c',
      explanation: 'Adaptive immunity (Line 3) takes days on first exposure, targets specific antigens, and forms memory cells.'
    },
    {
      id: 'primary-vs-secondary',
      prompt: 'Compared with a primary (first) exposure, why does a secondary exposure clear the pathogen before symptoms appear?',
      options: [
        { key: 'a', text: 'Memory B and T cells ramp up antibodies much faster and to higher levels' },
        { key: 'b', text: 'Innate macrophages mutate to recognize the virus forever' }
      ],
      answer: 'a',
      explanation: 'Immunological memory speeds up adaptive recruitment from ~36h lag to ~8h and boosts peak antibody response.'
    },
    {
      id: 'vaccine',
      prompt: 'How does a vaccine train your adaptive immune system without causing full-blown disease?',
      options: [
        { key: 'a', text: 'It presents a harmless, non-replicating antigen (or mRNA instruction) so memory cells form safely' },
        { key: 'b', text: 'It acts like an antibiotic that directly dissolves viruses' }
      ],
      answer: 'a',
      explanation: 'Vaccines expose the immune system to an antigen without uncontrolled pathogen replication.'
    },
    {
      id: 'misfire',
      prompt: 'How do autoimmune diseases differ from allergies?',
      options: [
        { key: 'a', text: 'Autoimmune diseases attack the body\'s own "self" cells; allergies overreact to harmless outside substances' },
        { key: 'b', text: 'Autoimmune diseases involve innate immunity; allergies only happen in skin barriers' }
      ],
      answer: 'a',
      explanation: 'Both are adaptive immune errors: self-targeting (autoimmunity) versus harmless foreign antigens (allergy).'
    }
  ];

  function createImmuneState() {
    return {
      pathogen: 0,
      vaccineAntigen: 0,
      innate: 0,
      adaptive: 0,
      memory: 0,
      infectionActive: false,
      simTime: 0,
      peakPathogen: 0,
      clearedAt: null,
      exposureStart: null
    };
  }

  function stepImmuneModel(state, simDt, opts) {
    var innateOn = !opts || opts.innateOn !== false;
    var adaptiveOn = !opts || opts.adaptiveOn !== false;

    var s = Object.assign({}, state);
    s.simTime += simDt;

    var growthRate = 0.10;
    var carryingCapacity = 100;
    var innateKill = innateOn ? 0.0022 : 0;
    var adaptiveKill = adaptiveOn ? 0.0065 : 0;

    if (s.pathogen > 0.01) {
      var growth = growthRate * s.pathogen * (1 - s.pathogen / carryingCapacity);
      var killed = (innateKill * s.innate + adaptiveKill * s.adaptive) * s.pathogen;
      s.pathogen += (growth - killed) * simDt;
      if (s.pathogen > s.peakPathogen) s.peakPathogen = s.pathogen;
      if (s.pathogen < 0.05) {
        s.pathogen = 0;
        s.infectionActive = false;
        if (s.exposureStart !== null && s.clearedAt === null) {
          s.clearedAt = s.simTime - s.exposureStart;
        }
      }
      s.pathogen = Math.max(0, Math.min(carryingCapacity, s.pathogen));
    }

    // Non-replicating vaccine antigen decays gradually over ~3 days while priming germinal centers
    if (s.vaccineAntigen > 0.01) {
      var antigenClear = 0.014 + adaptiveKill * s.adaptive * 0.06;
      s.vaccineAntigen = Math.max(0, s.vaccineAntigen * Math.exp(-antigenClear * simDt));
      if (s.vaccineAntigen < 0.05) s.vaccineAntigen = 0;
    }

    var stimulus = Math.max(s.pathogen, s.vaccineAntigen);

    var innateTarget = (innateOn && stimulus > 0.3) ? 70 : 0;
    var innateTau = innateTarget > s.innate ? 6 : 14;
    s.innate = Math.max(0, s.innate + ((innateTarget - s.innate) / innateTau) * simDt);

    var memoryFactor = s.memory / 100;
    var adaptiveTarget = adaptiveOn
      ? (stimulus > 0.3 ? (60 + 40 * memoryFactor) : Math.max(s.memory * 0.15, 0))
      : 0;
    var riseTau = stimulus > 0.3 ? (36 - 28 * memoryFactor) : 30;
    var fallTau = 40;
    var tau = adaptiveTarget > s.adaptive ? riseTau : fallTau;
    s.adaptive = Math.max(0, s.adaptive + ((adaptiveTarget - s.adaptive) / tau) * simDt);

    if (adaptiveOn && s.adaptive > 12 && stimulus > 0.2) {
      s.memory = Math.min(100, s.memory + (s.adaptive / 100) * 0.65 * simDt);
    }

    return s;
  }

  function severityLabel(peak) {
    if (peak < 1) return 'None';
    if (peak < SYMPTOM_THRESHOLD) return 'Asymptomatic (< ' + SYMPTOM_THRESHOLD + ')';
    if (peak < 55) return 'Mildly symptomatic';
    return 'Symptomatic';
  }

  function mount() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    var canvas = document.getElementById('immCanvas');
    if (!canvas || typeof window.SimKit === 'undefined') return;

    var cv2d = window.SimKit.canvas2d(canvas, { height: 320 });
    var SIM_SPEED = 6;
    var HISTORY_HOURS = 220;
    var SAMPLE_EVERY = 0.6;

    var state = createImmuneState();
    var sinceLastSample = 0;
    var innateOn = true;
    var adaptiveOn = true;
    var history = [];

    var infectBtn = document.getElementById('infectBtn');
    var vaccinateBtn = document.getElementById('vaccinateBtn');
    var variantBtn = document.getElementById('variantBtn');
    var resetBtn = document.getElementById('resetBtn');
    var innateToggle = document.getElementById('innateToggle');
    var adaptiveToggle = document.getElementById('adaptiveToggle');
    var memoryVal = document.getElementById('memoryVal');
    var memoryFill = document.getElementById('memoryFill');
    var peakVal = document.getElementById('immPeakVal');
    var severityVal = document.getElementById('immSeverityVal');
    var clearVal = document.getElementById('immClearVal');

    function updateTelemetry() {
      if (memoryVal) memoryVal.textContent = Math.round(state.memory) + '%';
      if (memoryFill) memoryFill.style.width = Math.round(state.memory) + '%';
      if (peakVal) peakVal.textContent = state.peakPathogen.toFixed(1);
      if (severityVal) severityVal.textContent = severityLabel(state.peakPathogen);
      if (clearVal) {
        clearVal.textContent = state.clearedAt !== null
          ? Math.round(state.clearedAt) + ' h'
          : (state.infectionActive ? 'Active…' : '—');
      }
    }

    infectBtn.addEventListener('click', function () {
      state.pathogen = Math.max(state.pathogen, 4);
      state.infectionActive = true;
      state.peakPathogen = Math.max(state.peakPathogen, state.pathogen);
      state.clearedAt = null;
      state.exposureStart = state.simTime;
      updateTelemetry();
    });

    vaccinateBtn.addEventListener('click', function () {
      // Safe non-replicating antigen pulse: primes adaptive immunity without pathogen growth
      state.vaccineAntigen = Math.max(state.vaccineAntigen, 45);
      updateTelemetry();
    });

    if (variantBtn) {
      variantBtn.addEventListener('click', function () {
        // Antigenic drift: mutated epitope reduces cross-reactive memory to 15%
        state.memory = Math.min(state.memory, 15);
        state.pathogen = Math.max(state.pathogen, 4);
        state.infectionActive = true;
        state.peakPathogen = state.pathogen;
        state.clearedAt = null;
        state.exposureStart = state.simTime;
        updateTelemetry();
      });
    }

    resetBtn.addEventListener('click', function () {
      state = createImmuneState();
      sinceLastSample = 0;
      history = [];
      updateTelemetry();
    });

    innateToggle.addEventListener('change', function (e) { innateOn = e.target.checked; });
    adaptiveToggle.addEventListener('change', function (e) { adaptiveOn = e.target.checked; });

    function drawLine(ctx, w, h, tMin, tMax, valueKey, color, maxVal, dashed) {
      if (history.length < 2) return;
      ctx.save();
      if (dashed) ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = color;
      for (var idx = 0; idx < history.length; idx++) {
        var pt = history[idx];
        var x = ((pt.t - tMin) / (tMax - tMin)) * w;
        var y = h - (pt[valueKey] / maxVal) * (h - 14) - 6;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    function render() {
      var ctx = cv2d.ctx;
      var w = cv2d.width;
      var h = cv2d.height;
      if (!w || !h) return;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#06161a';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (var gy = 1; gy < 4; gy++) {
        var yy = (h / 4) * gy;
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke();
      }

      // Symptom threshold line
      var symY = h - (SYMPTOM_THRESHOLD / 100) * (h - 14) - 6;
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = 'rgba(240, 84, 107, 0.45)';
      ctx.beginPath(); ctx.moveTo(0, symY); ctx.lineTo(w, symY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255, 190, 200, 0.72)';
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.fillText('Symptom threshold (' + SYMPTOM_THRESHOLD + ')', 10, symY - 6);
      ctx.restore();

      var tMax = Math.max(state.simTime, HISTORY_HOURS);
      var tMin = tMax - HISTORY_HOURS;

      drawLine(ctx, w, h, tMin, tMax, 'v', '#4ee1c1', 100, true);
      drawLine(ctx, w, h, tMin, tMax, 'p', '#f0546b', 100, false);
      drawLine(ctx, w, h, tMin, tMax, 'i', '#3fb6e0', 100, false);
      drawLine(ctx, w, h, tMin, tMax, 'a', '#ffd166', 100, false);

      if (!state.infectionActive && state.pathogen === 0 && state.vaccineAntigen === 0 && history.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.font = '13px "Manrope", sans-serif';
        ctx.fillText('Click "Trigger Infection" or "Vaccinate" to begin.', 16, h / 2);
      }
    }

    updateTelemetry();

    window.SimKit.loop(function (dt) {
      var simDt = Math.min(dt * SIM_SPEED, 3);
      if (state.pathogen > 0 || state.vaccineAntigen > 0 || state.adaptive > 0.1 || state.innate > 0.1 || state.memory > 0) {
        state = stepImmuneModel(state, simDt, { innateOn: innateOn, adaptiveOn: adaptiveOn });
        sinceLastSample += simDt;
        if (sinceLastSample >= SAMPLE_EVERY) {
          sinceLastSample = 0;
          history.push({
            t: state.simTime,
            p: state.pathogen,
            v: state.vaccineAntigen,
            i: state.innate,
            a: state.adaptive
          });
          var cutoff = state.simTime - HISTORY_HOURS;
          while (history.length && history[0].t < cutoff) history.shift();
        }
        updateTelemetry();
      } else {
        state.simTime += simDt;
      }
      render();
    }, { el: window.SimKit.stage('#immCanvas') });

    // ── Interactive Check ────────────────────────────────────────────────
    var quizEl = document.getElementById('immQuiz');
    var quizScoreEl = document.getElementById('immQuizScore');
    if (quizEl) {
      var results = {};
      IMMUNE_QUESTIONS.forEach(function (q, idx) {
        var card = document.createElement('div');
        card.className = 'imm-quiz-item';
        var optsHtml = q.options.map(function (opt) {
          return '<button type="button" class="imm-btn" data-opt="' + opt.key + '">' + opt.text + '</button>';
        }).join('');
        card.innerHTML =
          '<p class="imm-quiz-q"><strong>' + (idx + 1) + '.</strong> ' + q.prompt + '</p>' +
          '<div class="imm-quiz-opts">' + optsHtml + '</div>' +
          '<p class="imm-quiz-fb" aria-live="polite"></p>';
        var fb = card.querySelector('.imm-quiz-fb');
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
            fb.textContent = (ok ? '✓ Correct. ' : 'Not quite. ') + q.explanation;
            if (quizScoreEl) {
              var score = Object.values(results).filter(Boolean).length;
              quizScoreEl.textContent = score + ' of ' + IMMUNE_QUESTIONS.length + ' answered correctly.';
            }
          });
        });
        quizEl.appendChild(card);
      });
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount);
    } else {
      mount();
    }
  }

  var api = {
    SYMPTOM_THRESHOLD: SYMPTOM_THRESHOLD,
    createImmuneState: createImmuneState,
    stepImmuneModel: stepImmuneModel,
    severityLabel: severityLabel
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.ImmunologyLab = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
