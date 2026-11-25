(function (root) {
  'use strict';

  var N = 160;

  var NS_PRESETS = {
    birch: {
      label: 'Clean Birch Forest (15%)',
      pressure: 'predation', env: 15, strength: 70, mut: 3, reset: true
    },
    soot: {
      label: 'Industrial Soot (88%)',
      pressure: 'predation', env: 88, strength: 75, mut: 3, reset: false
    },
    nomut: {
      label: 'Zero-Mutation Bottleneck',
      pressure: 'cold', env: 90, strength: 85, mut: 0, reset: true
    },
    drift: {
      label: 'Pure Genetic Drift',
      pressure: 'none', env: 50, strength: 0, mut: 2, reset: true
    }
  };

  var NS_CHECK_QUESTIONS = [
    {
      id: 'mutation-intent',
      prompt: 'True or False: When coal smoke darkened English trees, individual pale moths mutated their own genes to turn dark.',
      options: [
        { key: 'a', text: 'True — organisms mutate to match what they need' },
        { key: 'b', text: 'False — dark variants already existed (or arose randomly), and birds ate pale moths more often' }
      ],
      answer: 'b',
      explanation: 'Individual organisms do not change their inherited DNA to fit an environment. Selection acts on existing variation across generations.'
    },
    {
      id: 'no-variation',
      prompt: 'If every moth in a population had identical genes for pale wings, what would happen if trees turned black and birds hunted heavily?',
      options: [
        { key: 'a', text: 'Natural selection cannot shift wing color without heritable variation' },
        { key: 'b', text: 'Stronger predation forces dark traits to appear immediately' }
      ],
      answer: 'a',
      explanation: 'Natural selection requires variation, heritability, and differential survival. With zero variation, selection has nothing to sort.'
    },
    {
      id: 'drift-vs-sel',
      prompt: 'With Selection Strength at 0%, why does the mean trait still wander slightly from generation to generation?',
      options: [
        { key: 'a', text: 'Random sampling of who happens to breed (genetic drift)' },
        { key: 'b', text: 'The target bark tone is still pulling the trait' }
      ],
      answer: 'a',
      explanation: 'Finite populations experience random sampling fluctuation every generation — that is genetic drift, distinct from directional selection.'
    },
    {
      id: 'antibiotic',
      prompt: 'Why can antibiotic resistance sweep through a bacterial colony in just days?',
      options: [
        { key: 'a', text: 'Rare resistant bacteria survive the drug and multiply rapidly with competitors cleared away' },
        { key: 'b', text: 'The antibiotic teaches sensitive bacteria how to pump out the drug' }
      ],
      answer: 'a',
      explanation: 'Antibiotics act as an intense selection pressure, leaving pre-existing resistant mutants to repopulate.'
    }
  ];

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function gaussian(std, rng) {
    var r = rng || Math.random;
    var u = Math.max(1e-12, 1 - r());
    var v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
  }

  function computeTraitStats(moths) {
    if (!moths || !moths.length) {
      return { mean: 0.5, sd: 0, darkPct: 50 };
    }
    var sum = 0;
    var darkCount = 0;
    for (var i = 0; i < moths.length; i++) {
      sum += moths[i].trait;
      if (moths[i].trait > 0.5) darkCount++;
    }
    var mean = sum / moths.length;
    var sq = 0;
    for (var j = 0; j < moths.length; j++) {
      var d = moths[j].trait - mean;
      sq += d * d;
    }
    var sd = Math.sqrt(sq / moths.length);
    return {
      mean: mean,
      sd: sd,
      darkPct: Math.round((darkCount / moths.length) * 100)
    };
  }

  function makeMoth(trait, rng) {
    var r = rng || Math.random;
    return {
      trait: trait,
      x: r(),
      y: r(),
      phase: r() * Math.PI * 2,
      died: false
    };
  }

  function stepPopulation(moths, opts, rng) {
    var r = rng || Math.random;
    var popSize = (opts && opts.popSize) || moths.length || N;
    var target = clamp01(opts && typeof opts.target === 'number' ? opts.target : 0.5);
    var str = clamp01(opts && typeof opts.strength === 'number' ? opts.strength : 0.6);
    var mut = Math.max(0, opts && typeof opts.mutationStd === 'number' ? opts.mutationStd : 0.03);

    var survivors = [];
    for (var i = 0; i < moths.length; i++) {
      var m = moths[i];
      var mismatch = Math.abs(m.trait - target);
      var deathChance = clamp01(str * mismatch * 2.2 + 0.015);
      if (r() > deathChance) survivors.push(m);
    }

    if (survivors.length < 4) {
      var sorted = moths.slice().sort(function (a, b) {
        return Math.abs(a.trait - target) - Math.abs(b.trait - target);
      });
      survivors = sorted.slice(0, Math.max(4, Math.floor(moths.length * 0.1)));
    }

    var died = moths.length - survivors.length;
    var next = [];
    for (var j = 0; j < popSize; j++) {
      var parent = survivors[Math.floor(r() * survivors.length)];
      var offspringTrait = clamp01(parent.trait + gaussian(mut, r));
      next.push(makeMoth(offspringTrait, r));
    }

    return {
      moths: next,
      died: died,
      survived: survivors.length,
      stats: computeTraitStats(next)
    };
  }

  function mount() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    var canvas = document.getElementById('nsCanvas');
    if (!canvas || typeof window.SimKit === 'undefined') return;
    var box = canvas.parentElement;

    var generation = 0;
    var moths = [];
    var history = [];
    var lastStepText = '—';
    var running = false;
    var playTimer = null;

    var pressureSelect = document.getElementById('pressureSelect');
    var envSlider = document.getElementById('envSlider');
    var strengthSlider = document.getElementById('strengthSlider');
    var mutSlider = document.getElementById('mutSlider');
    var envVal = document.getElementById('envVal');
    var strengthVal = document.getElementById('strengthVal');
    var mutVal = document.getElementById('mutVal');
    var statsBox = document.getElementById('nsStats');
    var stepBtn = document.getElementById('stepBtn');
    var step10Btn = document.getElementById('step10Btn');
    var playBtn = document.getElementById('playBtn');
    var resetBtn = document.getElementById('resetBtn');

    function envTarget() { return clamp01(parseInt(envSlider.value, 10) / 100); }
    function strength() { return clamp01(parseInt(strengthSlider.value, 10) / 100); }
    function mutationStd() { return parseInt(mutSlider.value, 10) / 100; }

    function seedPopulation() {
      moths = [];
      for (var i = 0; i < N; i++) moths.push(makeMoth(Math.random()));
      generation = 0;
      history = [computeTraitStats(moths).mean];
      lastStepText = '—';
    }

    function syncLabels() {
      envVal.textContent = envSlider.value + '%';
      strengthVal.textContent = strengthSlider.value + '%';
      mutVal.textContent = mutSlider.value + '%';
    }

    function applyPreset(kind) {
      if (kind === 'predation') envSlider.value = 50;
      else if (kind === 'drought') envSlider.value = 15;
      else if (kind === 'cold') envSlider.value = 85;
      else if (kind === 'none') strengthSlider.value = 0;
      syncLabels();
    }

    function updateStats() {
      var s = computeTraitStats(moths);
      statsBox.innerHTML =
        'Generation <strong>' + generation + '</strong><br />' +
        'Mean trait <strong>' + s.mean.toFixed(2) + '</strong> · SD <strong>' + s.sd.toFixed(2) + '</strong><br />' +
        'Dark morph <strong>~' + s.darkPct + '%</strong><br />' +
        'Last step: <strong>' + lastStepText + '</strong>';
    }

    function stepGenerations(count) {
      var target = envTarget();
      var str = pressureSelect.value === 'none' ? 0 : strength();
      var mut = mutationStd();
      var steps = Math.max(1, count || 1);
      for (var k = 0; k < steps; k++) {
        var res = stepPopulation(moths, {
          popSize: N,
          target: target,
          strength: str,
          mutationStd: mut
        });
        moths = res.moths;
        generation++;
        history.push(res.stats.mean);
        if (history.length > 400) history.shift();
        lastStepText = res.died + ' of ' + (res.survived + res.died) + ' died, ' + res.survived + ' survived to breed';
      }
      updateStats();
    }

    function traitColor(t) {
      var stops = [
        [237, 227, 200],
        [176, 138, 82],
        [92, 62, 30],
        [42, 28, 14]
      ];
      var seg = clamp01(t) * (stops.length - 1);
      var i0 = Math.min(stops.length - 2, Math.floor(seg));
      var lt = seg - i0;
      var c0 = stops[i0], c1 = stops[i0 + 1];
      var r = c0[0] + (c1[0] - c0[0]) * lt;
      var g = c0[1] + (c1[1] - c0[1]) * lt;
      var b = c0[2] + (c1[2] - c0[2]) * lt;
      return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
    }

    function barkColor(t) {
      var pale = [214, 201, 168];
      var dark = [46, 36, 24];
      var r = pale[0] + (dark[0] - pale[0]) * t;
      var g = pale[1] + (dark[1] - pale[1]) * t;
      var b = pale[2] + (dark[2] - pale[2]) * t;
      return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
    }

    function draw(ctx, w, h) {
      if (!w || !h) return;
      var target = envTarget();
      var scatterH = h * 0.5;
      var histH = h * 0.32;
      var trendH = h - scatterH - histH;

      ctx.fillStyle = barkColor(target);
      ctx.fillRect(0, 0, w, scatterH);

      var t = performance.now() / 1000;
      var r = Math.max(3, Math.min(6, w / 140));
      for (var i = 0; i < moths.length; i++) {
        var m = moths[i];
        var px = 20 + m.x * (w - 40) + Math.sin(t * 0.6 + m.phase) * 2;
        var py = 16 + m.y * (scatterH - 32) + Math.cos(t * 0.5 + m.phase) * 2;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = traitColor(m.trait);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
      }

      var histY = scatterH;
      ctx.fillStyle = '#150f0a';
      ctx.fillRect(0, histY, w, histH);

      var bins = 12;
      var counts = new Array(bins).fill(0);
      for (var j = 0; j < moths.length; j++) {
        var bi = Math.min(bins - 1, Math.floor(moths[j].trait * bins));
        counts[bi]++;
      }
      var maxCount = Math.max(1, Math.max.apply(null, counts));
      var padX = 14;
      var barGap = 3;
      var barW = (w - padX * 2 - barGap * (bins - 1)) / bins;
      var baseline = histY + histH - 10;
      var maxBarH = histH - 22;
      for (var bIdx = 0; bIdx < bins; bIdx++) {
        var bh = (counts[bIdx] / maxCount) * maxBarH;
        var bx = padX + bIdx * (barW + barGap);
        var by = baseline - bh;
        ctx.fillStyle = traitColor((bIdx + 0.5) / bins);
        ctx.fillRect(bx, by, barW, bh);
      }

      var markerX = padX + target * (w - padX * 2);
      ctx.strokeStyle = '#b3462c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(markerX, histY + 6);
      ctx.lineTo(markerX, baseline);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,244,214,0.85)';
      ctx.font = '600 11px IBM Plex Mono, monospace';
      ctx.fillText('trait distribution (pale → dark)', padX, histY + 16);

      var trendY = histY + histH;
      ctx.fillStyle = '#0f0c08';
      ctx.fillRect(0, trendY, w, trendH);
      ctx.fillStyle = 'rgba(255,244,214,0.85)';
      ctx.font = '600 11px IBM Plex Mono, monospace';
      ctx.fillText('mean trait over generations', padX, trendY + 14);

      var histLen = history.length;
      var plotTop = trendY + 20;
      var plotH = trendH - 28;
      var visibleN = Math.min(histLen, 120);
      var startIdx = histLen - visibleN;
      if (visibleN > 1) {
        ctx.beginPath();
        for (var k = 0; k < visibleN; k++) {
          var val = history[startIdx + k];
          var hx = padX + (k / (visibleN - 1)) * (w - padX * 2);
          var hy = plotTop + (1 - val) * plotH;
          if (k === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.strokeStyle = '#5cad74';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      var targetY = plotTop + (1 - target) * plotH;
      ctx.strokeStyle = 'rgba(179,70,44,0.6)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padX, targetY);
      ctx.lineTo(w - padX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    syncLabels();
    seedPopulation();
    updateStats();

    var sk = window.SimKit.canvas2d(canvas, {
      box: box,
      dpr: 2,
      onResize: function (ctx, w, h) { draw(ctx, w, h); }
    });

    window.SimKit.loop(function () {
      draw(sk.ctx, sk.width, sk.height);
    }, { el: window.SimKit.stage(canvas) });

    pressureSelect.addEventListener('change', function (e) { applyPreset(e.target.value); });
    envSlider.addEventListener('input', syncLabels);
    strengthSlider.addEventListener('input', syncLabels);
    mutSlider.addEventListener('input', syncLabels);

    stepBtn.addEventListener('click', function () { stepGenerations(1); });
    if (step10Btn) step10Btn.addEventListener('click', function () { stepGenerations(10); });

    function stopPlay() {
      running = false;
      playBtn.textContent = 'Play';
      if (playTimer) {
        clearInterval(playTimer);
        playTimer = null;
      }
    }

    playBtn.addEventListener('click', function () {
      if (running) {
        stopPlay();
      } else {
        running = true;
        playBtn.textContent = 'Pause';
        playTimer = setInterval(function () { stepGenerations(1); }, 550);
      }
    });

    resetBtn.addEventListener('click', function () {
      stopPlay();
      seedPopulation();
      updateStats();
    });

    document.querySelectorAll('[data-ns-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var preset = NS_PRESETS[btn.dataset.nsPreset];
        if (!preset) return;
        stopPlay();
        pressureSelect.value = preset.pressure;
        envSlider.value = preset.env;
        strengthSlider.value = preset.strength;
        mutSlider.value = preset.mut;
        syncLabels();
        if (preset.reset) seedPopulation();
        updateStats();
      });
    });

    // ── Interactive Misconception Check ───────────────────────────────────
    var quizEl = document.getElementById('nsCheckQuiz');
    var quizScoreEl = document.getElementById('nsCheckScore');
    if (quizEl) {
      var results = {};
      NS_CHECK_QUESTIONS.forEach(function (q, idx) {
        var card = document.createElement('div');
        card.className = 'ns-quiz-item';
        var optsHtml = q.options.map(function (opt) {
          return '<button type="button" class="ns-btn" data-opt="' + opt.key + '">' + opt.text + '</button>';
        }).join('');
        card.innerHTML =
          '<p class="ns-quiz-q"><strong>' + (idx + 1) + '.</strong> ' + q.prompt + '</p>' +
          '<div class="ns-quiz-opts">' + optsHtml + '</div>' +
          '<p class="ns-quiz-fb" aria-live="polite"></p>';
        var fb = card.querySelector('.ns-quiz-fb');
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
              quizScoreEl.textContent = score + ' of ' + NS_CHECK_QUESTIONS.length + ' misconceptions cleared.';
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
    N: N,
    NS_PRESETS: NS_PRESETS,
    computeTraitStats: computeTraitStats,
    stepPopulation: stepPopulation
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.NaturalSelectionLab = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
