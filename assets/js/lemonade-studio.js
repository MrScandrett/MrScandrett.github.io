/* ═════════════════════════════════════════════════════════════════════════════
   Lemonade Tycoon Studio · Complete Simulation Engine
   High-detail graphics, animated crowd, real-time telemetry, & Web Audio
   ClassroomOS · Computer Science: Graphics & Game Development
   ═════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ── Presets Catalog ─────────────────────────────────────────────────── */
  var PRESETS = {
    lemonade: {
      label: '🍋 Lemonade stand',
      config: {
        title: 'Lemonade Stand',
        item: { name: 'cup', plural: 'cups', icon: '🍋' },
        currency: '$',
        days: 14,
        goal: 300,
        startCash: 20,
        rent: 2,
        cost: 0.30,
        baseCustomers: 60,
        topPrice: 2.00,
        forecastAccuracy: 0.75,
        eventChance: 0.40,
        weather: [
          { name: 'Sunny', icon: '☀️', weight: 4, demand: 1.3 },
          { name: 'Cloudy', icon: '⛅', weight: 3, demand: 1.0 },
          { name: 'Rainy', icon: '🌧️', weight: 2, demand: 0.4 },
          { name: 'Heat wave', icon: '🔥', weight: 1, demand: 1.8 }
        ],
        events: [
          { text: 'A school fair is down the street!', weight: 2, demand: 1.5 },
          { text: 'Sugar got expensive today.', weight: 2, cost: 0.10 },
          { text: 'The health inspector fined you $5.', weight: 1, cash: -5 }
        ],
        upgrades: [
          { name: 'Painted sign', cost: 15, demand: 1.20 },
          { name: 'Cooler with ice', cost: 25, demand: 1.15 }
        ]
      }
    },
    store: {
      label: '🍪 School store',
      config: {
        title: 'The Corner Store',
        item: { name: 'snack', plural: 'snacks', icon: '🍪' },
        currency: '$',
        days: 20,
        goal: 480,
        startCash: 30,
        rent: 0,
        cost: 0.60,
        baseCustomers: 50,
        topPrice: 3.00,
        forecastAccuracy: 0.75,
        eventChance: 0.40,
        weather: [
          { name: 'Normal day', icon: '🏫', weight: 4, demand: 1.0 },
          { name: 'Game night', icon: '🏀', weight: 2, demand: 1.3 },
          { name: 'Rainy lunch', icon: '🌧️', weight: 2, demand: 0.5 },
          { name: 'Spirit week', icon: '🎉', weight: 1, demand: 1.6 }
        ],
        events: [
          { text: 'A teacher ordered snacks for the whole class!', weight: 2, demand: 1.5 },
          { text: 'The supplier raised prices.', weight: 2, cost: 0.15 },
          { text: 'The freezer broke. Repairs cost $8.', weight: 1, cash: -8 }
        ],
        upgrades: [
          { name: 'Bigger display', cost: 20, demand: 1.20 }
        ]
      }
    },
    print: {
      label: '🖨️ 3D-print farm',
      config: {
        title: 'Print Farm',
        item: { name: 'print', plural: 'prints', icon: '🧩' },
        currency: '$',
        days: 12,
        goal: 520,
        startCash: 100,
        rent: 10,
        cost: 1.50,
        baseCustomers: 30,
        topPrice: 9.00,
        forecastAccuracy: 0.70,
        eventChance: 0.40,
        weather: [
          { name: 'Steady orders', icon: '📦', weight: 4, demand: 1.0 },
          { name: 'Science-fair rush', icon: '🔬', weight: 3, demand: 1.3 },
          { name: 'Slow week', icon: '🐢', weight: 2, demand: 0.6 },
          { name: 'Viral model', icon: '🚀', weight: 1, demand: 1.8 }
        ],
        events: [
          { text: 'A school ordered a big batch.', weight: 2, demand: 1.6 },
          { text: 'Filament prices spiked.', weight: 2, cost: 0.50 },
          { text: 'A nozzle clogged. Repairs cost $25.', weight: 1, cash: -25 }
        ],
        upgrades: [
          { name: 'Second printer', cost: 60, demand: 1.25 }
        ]
      }
    },
    coffee: {
      label: '☕ Campus coffee cart',
      config: {
        title: 'Campus Coffee Cart',
        item: { name: 'latte', plural: 'lattes', icon: '☕' },
        currency: '$',
        days: 15,
        goal: 450,
        startCash: 40,
        rent: 5,
        cost: 0.75,
        baseCustomers: 55,
        topPrice: 4.50,
        forecastAccuracy: 0.80,
        eventChance: 0.45,
        weather: [
          { name: 'Chilly morning', icon: '🧣', weight: 4, demand: 1.4 },
          { name: 'Sunny & mild', icon: '☀️', weight: 3, demand: 1.0 },
          { name: 'Downpour', icon: '🌧️', weight: 2, demand: 0.7 },
          { name: 'Midterms week', icon: '📚', weight: 1, demand: 1.9 }
        ],
        events: [
          { text: 'Study group booked a 10-drink order!', weight: 2, demand: 1.4 },
          { text: 'Oat milk supplier ran out of stock.', weight: 2, cost: 0.25 },
          { text: 'Broken grinder replacement fee.', weight: 1, cash: -12 }
        ],
        upgrades: [
          { name: 'Espresso booster', cost: 35, demand: 1.25 },
          { name: 'Pastry display', cost: 25, demand: 1.18 }
        ]
      }
    }
  };

  /* ── Audio Engine (Zero-dependency Web Audio) ────────────────────────── */
  var Sound = (function () {
    var ctx = null;
    var muted = false;

    function getCtx() {
      if (!ctx && (window.AudioContext || window.webkitAudioContext)) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      return ctx;
    }

    function playTone(freq, dur, type, gainVol, delay) {
      if (muted) return;
      var c = getCtx();
      if (!c) return;
      var startTime = c.currentTime + (delay || 0);
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(gainVol || 0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(startTime);
      osc.stop(startTime + dur);
    }

    return {
      get muted() { return muted; },
      set muted(val) { muted = !!val; },
      toggle: function () { muted = !muted; return muted; },
      register: function () {
        playTone(987, 0.08, 'sine', 0.14, 0);
        playTone(1318, 0.22, 'sine', 0.18, 0.06);
      },
      coin: function () {
        playTone(1760, 0.12, 'sine', 0.15, 0);
      },
      bubble: function () {
        playTone(587, 0.08, 'triangle', 0.09, 0);
      },
      reject: function () {
        playTone(392, 0.12, 'sine', 0.08, 0);
        playTone(311, 0.18, 'sine', 0.08, 0.08);
      },
      upgrade: function () {
        [523, 659, 784, 1046].forEach(function (f, i) {
          playTone(f, 0.16, 'triangle', 0.12, i * 0.07);
        });
      },
      dayStart: function () {
        playTone(523, 0.2, 'sine', 0.1, 0);
        playTone(659, 0.3, 'sine', 0.12, 0.12);
      },
      dayEnd: function () {
        playTone(784, 0.25, 'triangle', 0.12, 0);
        playTone(659, 0.35, 'triangle', 0.12, 0.15);
      },
      win: function () {
        [523, 659, 784, 1046, 1318, 1568].forEach(function (f, i) {
          playTone(f, 0.35, 'triangle', 0.15, i * 0.09);
        });
      },
      lose: function () {
        [392, 370, 349, 311].forEach(function (f, i) {
          playTone(f, 0.3, 'sawtooth', 0.08, i * 0.12);
        });
      }
    };
  })();

  /* ── Tiny Mulberry32 Seeded RNG ─────────────────────────────────────── */
  function createRng(seed) {
    if (seed == null) return Math.random;
    var a = seed | 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ── Studio Application Constructor ──────────────────────────────────── */
  function LemonadeStudioEngine(rootEl, initialConfig) {
    if (rootEl._lemonStudio) rootEl._lemonStudio.destroy();

    var C = JSON.parse(JSON.stringify(initialConfig || PRESETS.lemonade.config));
    var rng = createRng(C.seed);
    var S = null;              // Runtime State
    var destroyed = false;
    var curMode = 'sim';       // 'sim' | 'telemetry' | 'config' | 'upgrades'
    var simSpeed = 1;          // 1 (normal) | 2 (turbo) | 0 (instant)
    var simProgress = 0;       // 0 to 1 across the active business day
    var isDayRunning = false;
    var lastRafTime = 0;
    var rafId = null;

    // Simulation crowd & visual elements
    var customers = [];
    var floatingTexts = [];
    var particles = [];
    var standEquipment = {
      juiceLevel: 1.0,
      targetJuice: 1.0,
      cupsStack: 10,
      gantryX: 0.5,
      gantryDir: 1,
      printHeight: 0
    };

    var el = {};               // DOM elements map
    var canvasHelper = null;   // SimKit.canvas2d instance

    function cents(n) { return Math.round(n * 100) / 100; }
    var cur = C.currency || '$';
    function money(n) { return (n < 0 ? '-' : '') + cur + Math.abs(n).toFixed(2); }

    function weighted(list) {
      var sum = list.reduce(function (s, e) { return s + e.weight; }, 0);
      var roll = rng() * sum;
      for (var i = 0; i < list.length; i++) {
        roll -= list[i].weight;
        if (roll <= 0) return list[i];
      }
      return list[list.length - 1];
    }

    function calculateDemand(price, weatherDemand, extraMultiplier, boostMultiplier) {
      var raw = C.baseCustomers * weatherDemand * boostMultiplier * extraMultiplier;
      var willingness = Math.max(0, 1 - price / C.topPrice);
      return Math.round(raw * willingness);
    }

    /* ── State Initialization ─────────────────────────────────────────── */
    function initGame() {
      S = {
        day: 1,
        cash: C.startCash,
        boost: 1,
        owned: [],
        log: [],
        over: false,
        today: null,
        last: null,
        history: [{ day: 0, cash: C.startCash, profit: 0, sold: 0, want: 0 }],
        stats: { totalEarned: 0, totalCupsSold: 0, totalWasted: 0, totalWalkedAway: 0 }
      };
      rollMorning();
    }

    function rollMorning() {
      var w = weighted(C.weather);
      var f = rng() < (C.forecastAccuracy != null ? C.forecastAccuracy : 0.75) ? w : weighted(C.weather);
      var ev = (C.events && C.events.length && rng() < (C.eventChance != null ? C.eventChance : 0.4))
        ? weighted(C.events)
        : null;

      S.today = {
        w: w,
        f: f,
        ev: ev,
        cost: cents(C.cost + (ev && ev.cost || 0)),
        extra: ev && ev.demand != null ? ev.demand : 1,
        resolved: false
      };

      standEquipment.juiceLevel = 1.0;
      standEquipment.targetJuice = 1.0;
      customers = [];
      floatingTexts = [];
      particles = [];
      simProgress = 0;
      isDayRunning = false;

      if (ev) {
        logMessage('News: ' + ev.text, 'info');
      }
    }

    function logMessage(text, cls) {
      S.log.unshift({ day: Math.min(S.day, C.days), text: text, cls: cls || '' });
      if (S.log.length > 50) S.log.pop();
    }

    /* ── Render HTML Shell ────────────────────────────────────────────── */
    function buildDom() {
      rootEl.innerHTML = '';
      var wrap = document.createElement('div');
      wrap.className = 'lm-studio';
      wrap.setAttribute('role', 'region');
      wrap.setAttribute('aria-label', C.title + ' Engine');
      rootEl.appendChild(wrap);
      el.wrap = wrap;

      // 1. Top Ribbon Bar
      var bar = document.createElement('div');
      bar.className = 'lm-bar';
      bar.innerHTML = [
        '<div class="lm-brand">',
        '  <span class="lm-badge">' + (C.item && C.item.icon || '🍋') + '</span>',
        '  <div class="lm-title-wrap">',
        '    <h3 class="lm-title">' + C.title + '</h3>',
        '    <span class="lm-subtitle">Business Simulation Studio</span>',
        '  </div>',
        '</div>',
        '<div class="lm-modes" role="tablist" aria-label="Studio Views">',
        '  <button type="button" class="lm-mode-btn" data-mode="sim" aria-pressed="true" role="tab">🏪 Storefront</button>',
        '  <button type="button" class="lm-mode-btn" data-mode="telemetry" aria-pressed="false" role="tab">📊 Telemetry</button>',
        '  <button type="button" class="lm-mode-btn" data-mode="config" aria-pressed="false" role="tab">⚙️ Config IDE</button>',
        '  <button type="button" class="lm-mode-btn" data-mode="upgrades" aria-pressed="false" role="tab">🛠️ Upgrades</button>',
        '</div>',
        '<div class="lm-actions">',
        '  <select class="lm-select" id="lm-preset-select" aria-label="Load preset game"></select>',
        '  <button type="button" class="lm-btn" id="lm-btn-sound" title="Toggle audio">' + (Sound.muted ? '🔇 Muted' : '🔊 Sound') + '</button>',
        '  <button type="button" class="lm-btn" id="lm-btn-speed" title="Simulation speed">⚡ 1x</button>',
        '  <button type="button" class="lm-btn" id="lm-btn-reset" title="Restart season">↺ Reset</button>',
        '  <button type="button" class="lm-btn primary" id="lm-btn-export" title="Download standalone playable game">⬇ Save Game</button>',
        '</div>'
      ].join('');
      wrap.appendChild(bar);
      el.bar = bar;

      // 2. Main Body Grid
      var body = document.createElement('div');
      body.className = 'lm-body';
      wrap.appendChild(body);
      el.body = body;

      // Left: Stage
      var stage = document.createElement('div');
      stage.className = 'lm-stage';
      stage.innerHTML = [
        '<div class="lm-hud" aria-live="off">',
        '  <div class="lm-hud-metrics">',
        '    <span class="lm-hud-pill cash">💰 <strong id="hud-cash">' + money(S.cash) + '</strong></span>',
        '    <span class="lm-hud-pill">📅 <strong id="hud-day">Day ' + S.day + ' / ' + C.days + '</strong></span>',
        '    <span class="lm-hud-pill">👥 Traffic <strong id="hud-boost">×' + S.boost.toFixed(2) + '</strong></span>',
        '  </div>',
        '  <div class="lm-hud-progress">',
        '    <span>Goal ' + money(C.goal) + '</span>',
        '    <div class="lm-progress-bar"><div class="lm-progress-fill" id="hud-goal-bar"></div></div>',
        '  </div>',
        '</div>',
        '<div class="lm-canvas-wrap">',
        '  <canvas class="lm-canvas" id="lemon-viewport" tabindex="0" aria-label="Animated storefront simulation"></canvas>',
        '  <div class="lm-canvas-overlay">',
        '    <span class="lm-time-pill" id="hud-time">⏰ 8:00 AM · Morning</span>',
        '    <span class="lm-forecast-pill" id="hud-forecast">☀️ Forecast: Sunny</span>',
        '  </div>',
        '</div>',
        '<div class="lm-desk">',
        '  <div class="lm-desk-grid">',
        '    <div class="lm-field">',
        '      <label class="lm-label" for="inp-price">Selling Price <span id="label-price-margin">+Margin</span></label>',
        '      <div class="lm-input-group">',
        '        <input type="number" id="inp-price" class="lm-inp" step="0.05" min="0.05" value="' + cents(C.topPrice * 0.45).toFixed(2) + '">',
        '        <button type="button" class="lm-btn" id="btn-best-price" title="Set mathematically optimal price">🎯 Peak</button>',
        '      </div>',
        '    </div>',
        '    <div class="lm-field">',
        '      <label class="lm-label" for="inp-qty">Make Quantity <span id="label-qty-afford">Afford: 0</span></label>',
        '      <div class="lm-input-group">',
        '        <input type="number" id="inp-qty" class="lm-inp" step="1" min="0" value="' + Math.max(5, Math.round(C.baseCustomers * 0.4)) + '">',
        '        <button type="button" class="lm-btn" id="btn-max-qty" title="Make maximum affordable batch">Max</button>',
        '      </div>',
        '    </div>',
        '    <div class="lm-desk-act">',
        '      <button type="button" class="lm-act-btn" id="btn-open-day">▶ Open Stand</button>',
        '    </div>',
        '  </div>',
        '  <div class="lm-desk-meta">',
        '    <span class="lm-meta-pill" id="desk-cost-info">Cost: $0.30/ea · Rent: $2.00</span>',
        '    <span class="lm-meta-pill" id="desk-est-info">Projected Demand: ~0</span>',
        '    <span class="lm-status-msg" id="desk-status" role="status"></span>',
        '  </div>',
        '</div>'
      ].join('');
      body.appendChild(stage);
      el.stage = stage;

      // Right: Deck (Tabbed views)
      var deck = document.createElement('div');
      deck.className = 'lm-deck';
      deck.innerHTML = '<div class="lm-panel-content" id="lm-panel-content"></div>';
      body.appendChild(deck);
      el.deck = deck;
      el.panelContent = deck.querySelector('#lm-panel-content');

      // Populate preset dropdown
      var pSel = bar.querySelector('#lm-preset-select');
      Object.keys(PRESETS).forEach(function (k) {
        var opt = document.createElement('option');
        opt.value = k;
        opt.textContent = PRESETS[k].label;
        if (PRESETS[k].config.title === C.title) opt.selected = true;
        pSel.appendChild(opt);
      });

      // Wire Canvas with SimKit
      var canvas = stage.querySelector('#lemon-viewport');
      el.canvas = canvas;
      if (global.SimKit && global.SimKit.canvas2d) {
        canvasHelper = global.SimKit.canvas2d(canvas, { dpr: 2 });
      } else {
        canvasHelper = {
          ctx: canvas.getContext('2d'),
          get width() { return canvas.clientWidth || 800; },
          get height() { return canvas.clientHeight || 450; },
          resize: function () {
            canvas.width = (canvas.clientWidth || 800) * 2;
            canvas.height = (canvas.clientHeight || 450) * 2;
            canvas.getContext('2d').setTransform(2, 0, 0, 2, 0, 0);
          }
        };
        window.addEventListener('resize', canvasHelper.resize);
      }

      // Wire User Interactions
      bindEvents();
      renderDeck();
      syncInputs();
      startAnimationLoop();
    }

    function applyConfig(newCfg) {
      C = JSON.parse(JSON.stringify(newCfg));
      rng = createRng(C.seed);
      initGame();
      // Update UI title and icon
      var badge = el.bar.querySelector('.lm-badge');
      if (badge) badge.textContent = C.item && C.item.icon || '🍋';
      var titleEl = el.bar.querySelector('.lm-title');
      if (titleEl) titleEl.textContent = C.title;
      var pSel = el.bar.querySelector('#lm-preset-select');
      if (pSel) {
        Object.keys(PRESETS).forEach(function (k) {
          if (PRESETS[k].config.title === C.title) pSel.value = k;
        });
      }
      var pInp = el.stage.querySelector('#inp-price');
      if (pInp) pInp.value = cents(C.topPrice * 0.45).toFixed(2);
      var qInp = el.stage.querySelector('#inp-qty');
      if (qInp) qInp.value = Math.max(5, Math.round(C.baseCustomers * 0.4));
      syncInputs();
      renderDeck();
      Sound.upgrade();
    }

    /* ── Event Binding ────────────────────────────────────────────────── */
    function bindEvents() {
      // View tabs
      el.bar.querySelectorAll('.lm-mode-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          el.bar.querySelectorAll('.lm-mode-btn').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
          btn.setAttribute('aria-pressed', 'true');
          curMode = btn.dataset.mode;
          renderDeck();
        });
      });

      // Presets
      var pSel = el.bar.querySelector('#lm-preset-select');
      pSel.addEventListener('change', function () {
        var p = PRESETS[pSel.value];
        if (p) applyConfig(p.config);
      });

      // Sound toggle
      var sndBtn = el.bar.querySelector('#lm-btn-sound');
      sndBtn.addEventListener('click', function () {
        var isMuted = Sound.toggle();
        sndBtn.textContent = isMuted ? '🔇 Muted' : '🔊 Sound';
      });

      // Speed toggle
      var spdBtn = el.bar.querySelector('#lm-btn-speed');
      spdBtn.addEventListener('click', function () {
        if (simSpeed === 1) simSpeed = 2;
        else if (simSpeed === 2) simSpeed = 0;
        else simSpeed = 1;
        spdBtn.textContent = simSpeed === 0 ? '⚡ Instant' : ('⚡ ' + simSpeed + 'x');
      });

      // Reset
      el.bar.querySelector('#lm-btn-reset').addEventListener('click', function () {
        initGame();
        syncInputs();
        renderDeck();
        Sound.upgrade();
      });

      // Export Standalone
      el.bar.querySelector('#lm-btn-export').addEventListener('click', exportGameFile);

      // Open Day button
      el.stage.querySelector('#btn-open-day').addEventListener('click', onOpenDayClick);

      // Quick math helpers
      el.stage.querySelector('#btn-best-price').addEventListener('click', function () {
        var best = (C.topPrice + S.today.cost) / 2;
        el.stage.querySelector('#inp-price').value = cents(best).toFixed(2);
        syncInputs();
        renderDeck();
      });

      el.stage.querySelector('#btn-max-qty').addEventListener('click', function () {
        var afford = Math.max(0, Math.floor(S.cash / S.today.cost));
        el.stage.querySelector('#inp-qty').value = afford;
        syncInputs();
        renderDeck();
      });

      // Input changes
      el.stage.querySelector('#inp-price').addEventListener('input', function () { syncInputs(); renderDeck(); });
      el.stage.querySelector('#inp-qty').addEventListener('input', function () { syncInputs(); renderDeck(); });
    }

    /* ── Input Sync & Estimator ───────────────────────────────────────── */
    function syncInputs() {
      var pInp = el.stage.querySelector('#inp-price');
      var qInp = el.stage.querySelector('#inp-qty');
      var price = parseFloat(pInp.value) || 0;
      var qty = Math.floor(Number(qInp.value)) || 0;
      var T = S.today;
      var margin = cents(price - T.cost);
      var maxAfford = Math.max(0, Math.floor(S.cash / T.cost));

      el.stage.querySelector('#label-price-margin').textContent = 'Margin: ' + (margin >= 0 ? '+' : '') + money(margin);
      el.stage.querySelector('#label-price-margin').style.color = margin > 0 ? '#4ade80' : '#f87171';
      el.stage.querySelector('#label-qty-afford').textContent = 'Afford up to: ' + maxAfford;

      var rent = C.rent || 0;
      el.stage.querySelector('#desk-cost-info').textContent =
        (C.item && C.item.icon || '🍋') + ' Cost: ' + money(T.cost) + ' · Overhead Rent: ' + money(rent);

      // Estimated demand on the forecast
      var estWant = calculateDemand(price, T.f.demand, T.extra, S.boost);
      var estSold = Math.min(estWant, qty);
      var estGross = cents(estSold * price);
      var estSpend = cents(qty * T.cost);
      var estProfit = cents(estGross - estSpend - rent);

      el.stage.querySelector('#desk-est-info').innerHTML =
        'Est. Forecast Demand: <b>~' + estWant + ' ' + (C.item.plural || 'items') + '</b> (Proj. Profit: <b style="color:' +
        (estProfit >= 0 ? '#4ade80' : '#f87171') + '">' + money(estProfit) + '</b>)';

      // HUD update
      el.stage.querySelector('#hud-cash').textContent = money(S.cash);
      el.stage.querySelector('#hud-day').textContent = S.over ? 'Season Over' : ('Day ' + S.day + ' / ' + C.days);
      el.stage.querySelector('#hud-boost').textContent = '×' + S.boost.toFixed(2);
      var goalPct = Math.max(0, Math.min(100, Math.round((S.cash / C.goal) * 100)));
      el.stage.querySelector('#hud-goal-bar').style.width = goalPct + '%';

      var timeHud = el.stage.querySelector('#hud-time');
      var forecastHud = el.stage.querySelector('#hud-forecast');
      if (S.today.resolved) {
        if (timeHud) timeHud.textContent = '🌙 6:00 PM · Closed for the Evening';
        if (forecastHud) forecastHud.textContent = (T.w.icon || '☀️') + ' Actual: ' + T.w.name;
      } else {
        if (timeHud) timeHud.textContent = '⏰ 8:00 AM · Morning Brief';
        if (forecastHud) forecastHud.textContent = (T.f.icon || '☀️') + ' Forecast: ' + T.f.name + ' (' + Math.round((C.forecastAccuracy || 0.75) * 100) + '% accuracy)';
      }

      var openBtn = el.stage.querySelector('#btn-open-day');
      if (S.over) {
        openBtn.disabled = true;
        openBtn.textContent = 'Season Finished';
      } else if (isDayRunning) {
        openBtn.disabled = true;
        openBtn.textContent = 'Serving Customers…';
      } else if (S.today.resolved) {
        openBtn.disabled = false;
        openBtn.textContent = 'Next Morning →';
      } else {
        openBtn.disabled = false;
        openBtn.textContent = '▶ Open for the Day';
      }
    }

    /* ── Open Day / Simulation Flow ───────────────────────────────────── */
    function onOpenDayClick() {
      if (S.over || isDayRunning) return;

      if (S.today.resolved) {
        // Transition to next morning
        S.day++;
        if (S.cash < 0) {
          finishSeason('Bankrupt!', 'You ran out of cash to pay your overhead bills. Try pricing closer to the optimal peak or making fewer units on slow days.', false);
          return;
        }
        if (S.day > C.days) {
          var won = S.cash >= C.goal;
          finishSeason(
            won ? 'Season Goal Achieved! 🏆' : 'Season Ended Short',
            won
              ? 'Congratulations! You reached ' + money(S.cash) + ', beating the ' + money(C.goal) + ' milestone.'
              : 'You finished with ' + money(S.cash) + ', falling short of the ' + money(C.goal) + ' target. Try again with earlier compounding upgrades!',
            won
          );
          return;
        }
        rollMorning();
        syncInputs();
        renderDeck();
        Sound.dayStart();
        return;
      }

      // Validate inputs
      var price = parseFloat(el.stage.querySelector('#inp-price').value) || 0;
      var qty = Math.floor(Number(el.stage.querySelector('#inp-qty').value)) || 0;
      var statusEl = el.stage.querySelector('#desk-status');

      if (price <= 0) {
        statusEl.textContent = 'Type a price greater than 0.';
        return;
      }
      if (qty < 0) {
        statusEl.textContent = 'Quantity cannot be negative.';
        return;
      }
      var spend = cents(qty * S.today.cost);
      if (spend > S.cash + 1e-9) {
        statusEl.textContent = 'Cannot afford ' + qty + ' units. Max affordable: ' + Math.floor(S.cash / S.today.cost);
        return;
      }
      statusEl.textContent = '';

      // Compute actual results
      var T = S.today;
      var actualDemand = calculateDemand(price, T.w.demand, T.extra, S.boost);
      var sold = Math.min(actualDemand, qty);
      var earned = cents(sold * price);
      var rent = C.rent || 0;
      var bill = T.ev && T.ev.cash || 0;
      var netProfit = cents(earned - spend - rent + bill);
      var walked = Math.max(0, actualDemand - qty);
      var wasted = Math.max(0, qty - actualDemand);

      S.cash = cents(S.cash + netProfit);
      S.stats.totalEarned += earned;
      S.stats.totalCupsSold += sold;
      S.stats.totalWasted += wasted;
      S.stats.totalWalkedAway += walked;

      S.last = {
        day: S.day,
        weather: T.w,
        forecast: T.f,
        price: price,
        qty: qty,
        demand: actualDemand,
        sold: sold,
        earned: earned,
        spend: spend,
        rent: rent,
        bill: bill,
        profit: netProfit,
        walked: walked,
        wasted: wasted
      };

      S.history.push({
        day: S.day,
        cash: S.cash,
        profit: netProfit,
        sold: sold,
        want: actualDemand
      });

      logMessage(
        T.w.name + ': Sold ' + sold + ' / ' + actualDemand + ' wanted. Net: ' + (netProfit >= 0 ? '+' : '') + money(netProfit),
        netProfit >= 0 ? 'good' : 'bad'
      );

      T.resolved = true;

      // Start the animated day sequence
      if (simSpeed === 0) {
        // Instant
        simProgress = 1.0;
        standEquipment.juiceLevel = qty > 0 ? (1 - sold / qty) : 0;
        Sound.dayEnd();
        syncInputs();
        renderDeck();
      } else {
        isDayRunning = true;
        simProgress = 0;
        spawnCrowdSimulation(actualDemand, qty, price);
        Sound.dayStart();
        syncInputs();
      }
    }

    /* ── Procedural Crowd Generator for Animation ─────────────────────── */
    function spawnCrowdSimulation(demandCount, stockCount, price) {
      customers = [];
      var numWalkers = Math.min(18, Math.max(5, Math.round(demandCount * 0.4)));
      var remainingStock = stockCount;

      var skinTones = ['#f8d7b8', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
      var shirtColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];
      var hairColors = ['#1e293b', '#78350f', '#ca8a04', '#451a03', '#94a3b8'];

      for (var i = 0; i < numWalkers; i++) {
        var entersAt = i === 0 ? 0.01 : ((i / numWalkers) * 0.72 + (rng() * 0.04));
        var buys = i < Math.min(demandCount, numWalkers * 0.7);
        var pricedOut = !buys && rng() < 0.6;
        var startX = i === 0 ? 100 : (-40 - (i * 45));

        customers.push({
          x: startX,
          targetX: 380 + (rng() * 50 - 25),
          speed: 1.5 + rng() * 0.5,
          state: 'entering', // 'entering' -> 'at_counter' -> 'leaving'
          entersAt: entersAt,
          wantsToBuy: buys,
          pricedOut: pricedOut,
          served: false,
          skin: skinTones[Math.floor(rng() * skinTones.length)],
          shirt: shirtColors[Math.floor(rng() * shirtColors.length)],
          hair: hairColors[Math.floor(rng() * hairColors.length)],
          height: 58 + Math.floor(rng() * 12),
          bob: 0
        });
      }
    }

    /* ── Drawing & Animation Engine ───────────────────────────────────── */
    function startAnimationLoop() {
      function frame(timestamp) {
        if (destroyed) return;
        window._lemonRafCount = (window._lemonRafCount || 0) + 1;
        if (!lastRafTime) lastRafTime = timestamp;
        var dt = Math.min(0.1, (timestamp - lastRafTime) / 1000);
        lastRafTime = timestamp;

        try {
          updateSimulation(dt);
          renderCanvas();
        } catch (e) {
          console.error("ANIMATION FRAME ERROR:", e);
        }

        rafId = requestAnimationFrame(frame);
      }
      rafId = requestAnimationFrame(frame);
    }

    function updateSimulation(dt) {
      if (!isDayRunning) return;

      var stepRate = (simSpeed === 2 ? 0.35 : 0.12) * dt;
      simProgress += stepRate;

      // Update time HUD
      var hours = 8 + (simProgress * 10);
      var hInt = Math.floor(hours);
      var mInt = Math.floor((hours - hInt) * 60);
      var ampm = hInt >= 12 ? 'PM' : 'AM';
      var dispH = hInt > 12 ? (hInt - 12) : hInt;
      var timeStr = (dispH === 0 ? 12 : dispH) + ':' + (mInt < 10 ? '0' : '') + mInt + ' ' + ampm;
      el.stage.querySelector('#hud-time').textContent = '⏰ ' + timeStr + (simProgress > 0.85 ? ' · Closing' : ' · Operating');

      // Update customer positions
      var activeCount = 0;
      customers.forEach(function (c) {
        c.bob += dt * 8;
        if (simProgress < c.entersAt) return;

        activeCount++;
        if (c.state === 'entering') {
          c.x += c.speed * 85 * dt;
          if (c.x >= c.targetX) {
            c.state = 'at_counter';
            c.timer = 0;
            // Customer interaction
            if (c.wantsToBuy) {
              if (standEquipment.cupsStack > 0) {
                standEquipment.cupsStack = Math.max(0, standEquipment.cupsStack - 1);
                standEquipment.juiceLevel = Math.max(0, standEquipment.juiceLevel - 0.08);
                Sound.register();
                floatingTexts.push({
                  x: c.targetX + 20,
                  y: 280,
                  text: '+' + money(S.last ? S.last.price : 1),
                  color: '#4ade80',
                  life: 1.0
                });
                c.speech = (C.item && C.item.icon) ? ('Yum! ' + C.item.icon) : 'Yum! 🍋';
                c.served = true;
              } else {
                c.speech = 'Sold out?! 😢';
                Sound.reject();
              }
            } else if (c.pricedOut) {
              c.speech = 'Too steep! 💸';
              Sound.bubble();
            } else {
              c.speech = 'Just looking!';
            }
          }
        } else if (c.state === 'at_counter') {
          c.timer = (c.timer || 0) + dt;
          if (c.timer > 1.2) {
            c.state = 'leaving';
          }
        } else if (c.state === 'leaving') {
          c.x += c.speed * 90 * dt;
        }
      });

      // Update floating money texts
      for (var f = floatingTexts.length - 1; f >= 0; f--) {
        floatingTexts[f].y -= 25 * dt;
        floatingTexts[f].life -= dt;
        if (floatingTexts[f].life <= 0) floatingTexts.splice(f, 1);
      }

      // Check day completion
      if (simProgress >= 1.0) {
        simProgress = 1.0;
        isDayRunning = false;
        customers = [];
        Sound.dayEnd();
        syncInputs();
        renderDeck();
      }
    }

    /* ── High-Detail Canvas Rendering ─────────────────────────────────── */
    function renderCanvas() {
      if (!canvasHelper) return;
      var ctx = canvasHelper.ctx;
      var W = canvasHelper.width || 800;
      var H = canvasHelper.height || 450;

      ctx.clearRect(0, 0, W, H);

      var isNight = document.documentElement.dataset.lighting === 'night' ||
                    document.body.classList.contains('ll-dark-body');
      var weather = (S && S.today) ? ((isDayRunning || S.today.resolved) ? S.today.w : S.today.f) : { name: 'Sunny' };

      // 1. Dynamic Sky Gradient
      var skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.72);
      if (isNight) {
        skyGrad.addColorStop(0, '#090d16');
        skyGrad.addColorStop(0.7, '#172554');
        skyGrad.addColorStop(1, '#1e293b');
      } else if (weather.name === 'Rainy') {
        skyGrad.addColorStop(0, '#334155');
        skyGrad.addColorStop(0.7, '#64748b');
        skyGrad.addColorStop(1, '#94a3b8');
      } else if (weather.name === 'Cloudy') {
        skyGrad.addColorStop(0, '#475569');
        skyGrad.addColorStop(0.7, '#94a3b8');
        skyGrad.addColorStop(1, '#cbd5e1');
      } else if (weather.name === 'Heat wave') {
        skyGrad.addColorStop(0, '#ea580c');
        skyGrad.addColorStop(0.65, '#f59e0b');
        skyGrad.addColorStop(1, '#fef08a');
      } else {
        // Sunny default
        skyGrad.addColorStop(0, '#0284c7');
        skyGrad.addColorStop(0.6, '#38bdf8');
        skyGrad.addColorStop(1, '#bae6fd');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H * 0.75);

      // 2. Sun / Moon & Clouds
      var sunProgress = isDayRunning ? simProgress : (S && S.today && S.today.resolved ? 0.92 : 0.28);
      var sunX = W * 0.15 + (W * 0.7 * sunProgress);
      var sunY = H * 0.28 - Math.sin(sunProgress * Math.PI) * (H * 0.18);

      if (isNight) {
        // Twinkling Stars
        ctx.fillStyle = '#ffffff';
        for (var s = 0; s < 35; s++) {
          var sx = (s * 87 + 43) % W;
          var sy = (s * 49 + 17) % (H * 0.5);
          var sAlpha = 0.4 + 0.5 * Math.sin(s + lastRafTime * 0.003);
          ctx.globalAlpha = sAlpha;
          ctx.fillRect(sx, sy, 2, 2);
        }
        ctx.globalAlpha = 1.0;

        // Glowing Moon
        ctx.beginPath();
        ctx.arc(sunX, sunY, 24, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = 'rgba(254, 240, 138, 0.4)';
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Sun
        ctx.beginPath();
        ctx.arc(sunX, sunY, weather.name === 'Heat wave' ? 32 : 24, 0, Math.PI * 2);
        ctx.fillStyle = weather.name === 'Heat wave' ? '#fbbf24' : '#fef08a';
        ctx.shadowColor = weather.name === 'Heat wave' ? 'rgba(245, 158, 11, 0.8)' : 'rgba(254, 240, 138, 0.6)';
        ctx.shadowBlur = 24;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Sunrays
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        var numRays = 8;
        var rot = (lastRafTime || 0) * 0.0006;
        for (var r = 0; r < numRays; r++) {
          var ang = (r / numRays) * Math.PI * 2 + rot;
          ctx.beginPath();
          ctx.moveTo(sunX + Math.cos(ang) * 30, sunY + Math.sin(ang) * 30);
          ctx.lineTo(sunX + Math.cos(ang) * 48, sunY + Math.sin(ang) * 48);
          ctx.stroke();
        }
      }

      // Clouds
      drawCloud(ctx, W * 0.2, H * 0.16, 45, weather.name === 'Cloudy' ? 0.8 : 0.45);
      drawCloud(ctx, W * 0.65, H * 0.12, 60, weather.name === 'Cloudy' ? 0.9 : 0.5);
      drawCloud(ctx, W * 0.85, H * 0.22, 38, weather.name === 'Rainy' ? 0.95 : 0.4);

      // Rain animation
      if (weather.name === 'Rainy') {
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.6)';
        ctx.lineWidth = 1.5;
        var rTime = (lastRafTime || 0) * 0.5;
        for (var rn = 0; rn < 60; rn++) {
          var rx = (rn * 37 + rTime * 2) % W;
          var ry = (rn * 23 + rTime * 5) % (H * 0.8);
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 4, ry + 12);
          ctx.stroke();
        }
      }

      // 3. Ground, Greenery & Sidewalk
      // Rolling Hill Lawn
      ctx.fillStyle = isNight ? '#14532d' : '#22c55e';
      ctx.beginPath();
      ctx.moveTo(0, H * 0.68);
      ctx.bezierCurveTo(W * 0.3, H * 0.62, W * 0.7, H * 0.74, W, H * 0.66);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.fill();

      // Stylized Swaying Shade Tree on the left
      var treeSway = Math.sin((lastRafTime || 0) * 0.002) * 4;
      ctx.fillStyle = isNight ? '#3e2723' : '#78350f';
      ctx.fillRect(W * 0.06 - 8, H * 0.42, 16, H * 0.3); // Trunk
      ctx.fillStyle = isNight ? '#064e3b' : '#15803d';
      ctx.beginPath();
      ctx.arc(W * 0.06 + treeSway, H * 0.42, 54, 0, Math.PI * 2);
      ctx.arc(W * 0.06 + treeSway - 25, H * 0.46, 40, 0, Math.PI * 2);
      ctx.arc(W * 0.06 + treeSway + 25, H * 0.46, 42, 0, Math.PI * 2);
      ctx.fill();

      // Sidewalk Paving (Y: H * 0.72 to H)
      ctx.fillStyle = isNight ? '#1e293b' : '#e2e8f0';
      ctx.fillRect(0, H * 0.74, W, H * 0.26);
      ctx.strokeStyle = isNight ? '#334155' : '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.74);
      ctx.lineTo(W, H * 0.74);
      ctx.stroke();

      // Flagstone paving lines
      ctx.strokeStyle = isNight ? '#0f172a' : '#94a3b8';
      ctx.lineWidth = 1;
      for (var fX = 0; fX < W; fX += 60) {
        ctx.beginPath();
        ctx.moveTo(fX, H * 0.74);
        ctx.lineTo(fX, H);
        ctx.stroke();
      }

      // 4. Storefront / Stand Architecture (Centered at W * 0.52, Y: H * 0.42)
      var standX = W * 0.52;
      var standY = H * 0.44;
      drawStorefront(ctx, standX, standY, isNight);

      // 5. Draw Customers along Sidewalk
      customers.forEach(function (c) {
        drawCustomer(ctx, c, H * 0.82);
      });

      // 6. Draw Floating Texts (+$$$)
      floatingTexts.forEach(function (ft) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, ft.life));
        ctx.font = 'bold 16px "JetBrains Mono", monospace';
        ctx.fillStyle = ft.color;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });
    }

    function drawCloud(ctx, x, y, r, alpha) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
      ctx.arc(x + r * 0.5, y - r * 0.2, r * 0.7, 0, Math.PI * 2);
      ctx.arc(x + r * 1.1, y, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* ── Storefront Detail Renderer ───────────────────────────────────── */
    function drawStorefront(ctx, x, y, isNight) {
      var isLemonade = !C.item || C.item.name === 'cup' || /lemonade/i.test(C.title);
      var is3DPrint = /print/i.test(C.title) || (C.item && C.item.name === 'print');
      var isStore = /store/i.test(C.title) || (C.item && C.item.name === 'snack');
      var isCoffee = /coffee/i.test(C.title) || (C.item && (C.item.name === 'latte' || C.item.name === 'coffee'));

      var standW = 220;
      var standH = 135;

      // Stand Base Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(x + standW * 0.5, y + standH + 30, standW * 0.6, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      if (is3DPrint) {
        // 🖨️ 3D Print Farm Workshop Visual
        draw3DPrintWorkshop(ctx, x, y, standW, standH, isNight);
      } else if (isStore) {
        // 🍪 School Store Counter
        drawStoreCounter(ctx, x, y, standW, standH, isNight);
      } else if (isCoffee) {
        // ☕ Campus Coffee Cart
        drawCoffeeCart(ctx, x, y, standW, standH, isNight);
      } else {
        // 🍋 Classic Lemonade Stand
        drawLemonadeStand(ctx, x, y, standW, standH, isNight);
      }
    }

    /* Lemonade Stand Variant */
    function drawLemonadeStand(ctx, x, y, W, H, isNight) {
      var hasSign = S.owned.indexOf('Painted sign') >= 0;
      var hasCooler = S.owned.indexOf('Cooler with ice') >= 0;

      // 1. Wooden Counter Desk
      var woodGrad = ctx.createLinearGradient(x, y + 60, x, y + H + 30);
      woodGrad.addColorStop(0, '#d97706');
      woodGrad.addColorStop(1, '#92400e');
      ctx.fillStyle = woodGrad;
      ctx.fillRect(x, y + 60, W, H - 20);

      // Wood plank horizontal lines
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 2;
      for (var p = y + 78; p < y + H + 30; p += 18) {
        ctx.beginPath();
        ctx.moveTo(x, p);
        ctx.lineTo(x + W, p);
        ctx.stroke();
      }

      // Shopkeeper Character behind counter
      ctx.save();
      var skX = x + W * 0.48;
      var skY = y + 16;
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(skX - 12, skY + 16, 24, 24, 4);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(skX - 4, skY + 24, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8d7b8';
      ctx.beginPath();
      ctx.arc(skX, skY + 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(skX - 3, skY + 7, 2, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(skX + 3, skY + 7, 2, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(skX, skY + 9, 3, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(skX, skY + 5, 10, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(skX - 12, skY + 3, 24, 3);
      ctx.restore();

      // Counter Top Surface
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x - 10, y + 52, W + 20, 12);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(x - 10, y + 62, W + 20, 3);

      // Support Posts
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x + 10, y - 40, 8, 95);
      ctx.fillRect(x + W - 18, y - 40, 8, 95);

      // 2. Striped Canopy / Awning
      var roofH = 50;
      var numStripes = 8;
      var stripeW = (W + 30) / numStripes;
      for (var s = 0; s < numStripes; s++) {
        ctx.fillStyle = (s % 2 === 0) ? '#eab308' : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x - 15 + s * stripeW, y - 35);
        ctx.lineTo(x - 15 + (s + 1) * stripeW, y - 35);
        ctx.lineTo(x - 15 + (s + 1) * stripeW, y + 15);
        ctx.lineTo(x - 15 + s * stripeW, y + 15);
        ctx.fill();

        // Scallop bottom trim
        ctx.beginPath();
        ctx.arc(x - 15 + (s + 0.5) * stripeW, y + 15, stripeW * 0.5, 0, Math.PI);
        ctx.fill();
      }

      // Awning drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x - 10, y + 22, W + 20, 4);

      // 3. Chalkboard Menu on Stand Front
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + W * 0.28, y + 76, W * 0.44, 46);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + W * 0.28, y + 76, W * 0.44, 46);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      var dispPrice = S.today && S.today.resolved && S.last ? S.last.price : (parseFloat(el.stage.querySelector('#inp-price').value) || 1.00);
      ctx.fillText('LEMONADE', x + W * 0.5, y + 92);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(money(dispPrice), x + W * 0.5, y + 110);
      ctx.textAlign = 'left';

      // 4. Large Glass Beverage Dispenser
      var dispX = x + 35;
      var dispY = y + 15;
      // Glass jar body
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(dispX, dispY, 38, 40);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(dispX, dispY, 38, 40);

      // Yellow Lemonade Liquid
      var fillH = 34 * standEquipment.juiceLevel;
      ctx.fillStyle = '#facc15';
      ctx.fillRect(dispX + 2, dispY + 40 - fillH, 34, fillH);

      // Floating Lemon Slices inside
      if (standEquipment.juiceLevel > 0.2) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(dispX + 16, dispY + 40 - fillH + 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dispX + 26, dispY + 40 - fillH + 14, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dispenser Lid & Tap
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(dispX - 2, dispY - 4, 42, 5);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(dispX + 14, dispY + 36, 10, 4);

      // Paper Cup Stack
      var cupCount = Math.min(6, Math.max(1, standEquipment.cupsStack));
      for (var c = 0; c < cupCount; c++) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(dispX + 46, dispY + 32 - (c * 4), 16, 7);
        ctx.strokeStyle = '#e2e8f0';
        ctx.strokeRect(dispX + 46, dispY + 32 - (c * 4), 16, 7);
      }

      // Fresh Lemon Wooden Crate on ground
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 30, y + H - 5, 34, 24);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(x - 22, y + H - 3, 6, 0, Math.PI * 2);
      ctx.arc(x - 12, y + H - 2, 7, 0, Math.PI * 2);
      ctx.arc(x - 17, y + H - 9, 6, 0, Math.PI * 2);
      ctx.fill();

      // ── Visible Upgrades ──
      // Upgrade 1: Painted Sign
      if (hasSign) {
        ctx.save();
        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(x + W * 0.1, y - 56, W * 0.8, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#92400e';
        ctx.font = 'bold 10px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★ ICE COLD LEMONADE ★', x + W * 0.5, y - 41);
        ctx.textAlign = 'left';

        // Little hanging chains
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + W * 0.25, y - 56);
        ctx.lineTo(x + W * 0.25, y - 35);
        ctx.moveTo(x + W * 0.75, y - 56);
        ctx.lineTo(x + W * 0.75, y - 35);
        ctx.stroke();
        ctx.restore();
      }

      // Upgrade 2: Cooler with Ice
      if (hasCooler) {
        ctx.save();
        var clrX = x + W + 6;
        var clrY = y + H - 10;
        // Cyan camping cooler
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(clrX, clrY, 44, 30);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(clrX - 2, clrY - 6, 48, 8); // Lid

        // Ice cubes inside
        ctx.fillStyle = '#cffafe';
        ctx.fillRect(clrX + 6, clrY + 5, 8, 8);
        ctx.fillRect(clrX + 18, clrY + 8, 9, 7);
        ctx.fillRect(clrX + 28, clrY + 4, 8, 8);
        ctx.restore();
      }

      // Night Lighting: Edison bulbs hanging from awning
      if (isNight) {
        ctx.save();
        for (var b = 0; b < 4; b++) {
          var bx = x + 15 + b * 55;
          var by = y + 20;
          ctx.beginPath();
          ctx.arc(bx, by, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = 'rgba(254, 240, 138, 0.9)';
          ctx.shadowBlur = 14;
          ctx.fill();
        }
        ctx.restore();
      }
    }

    /* School Store Variant */
    function drawStoreCounter(ctx, x, y, W, H, isNight) {
      var hasDisplay = S.owned.indexOf('Bigger display') >= 0;

      // School kiosk counter
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(x, y + 60, W, H - 20);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x - 10, y + 52, W + 20, 12);

      // School Pennants & Sign
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x + 20, y + 74, W - 40, 24);
      ctx.fillStyle = '#1e1b4b';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE CORNER STORE', x + W * 0.5, y + 90);
      ctx.textAlign = 'left';

      // Snack Racks
      ctx.fillStyle = '#ef4444'; ctx.fillRect(x + 20, y + 26, 14, 24); // Chips
      ctx.fillStyle = '#10b981'; ctx.fillRect(x + 40, y + 26, 14, 24);
      ctx.fillStyle = '#ca8a04'; ctx.fillRect(x + 60, y + 32, 16, 18); // Cookies

      if (hasDisplay) {
        // Glass Display Case
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.fillRect(x + W - 75, y + 10, 65, 42);
        ctx.strokeRect(x + W - 75, y + 10, 65, 42);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(x + W - 65, y + 24, 18, 12);
        ctx.fillRect(x + W - 40, y + 24, 18, 12);
      }
    }

    /* 3D Print Farm Variant */
    function draw3DPrintWorkshop(ctx, x, y, W, H, isNight) {
      var hasSecond = S.owned.indexOf('Second printer') >= 0;

      // Heavy workshop bench
      ctx.fillStyle = '#334155';
      ctx.fillRect(x, y + 65, W, H - 25);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x - 8, y + 56, W + 16, 10);

      // CoreXY 3D Printer 1
      drawPrinterUnit(ctx, x + 25, y + 10, standEquipment.gantryX, isDayRunning);

      // 3D Printer 2 (Upgrade)
      if (hasSecond) {
        drawPrinterUnit(ctx, x + W - 90, y + 10, 1 - standEquipment.gantryX, isDayRunning);
      }
    }

    function drawPrinterUnit(ctx, px, py, gantryT, printing) {
      // Aluminum extrusion frame
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.strokeRect(px, py, 65, 50);

      // Heated Bed
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px + 8, py + 38, 50, 6);

      // Printed Object (growing cyan cube/benchy)
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(px + 26, py + 30, 16, 8);

      // Moving Extruder Gantry
      var gx = px + 12 + gantryT * 38;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 4, py + 22);
      ctx.lineTo(px + 61, py + 22);
      ctx.stroke();

      // Hotend with glowing LED
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(gx - 5, py + 16, 10, 10);
      ctx.fillStyle = printing ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(gx, py + 24, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Campus Coffee Cart Variant */
    function drawCoffeeCart(ctx, x, y, W, H, isNight) {
      var hasBooster = S.owned.indexOf('Espresso booster') >= 0;
      var hasPastry = S.owned.indexOf('Pastry display') >= 0;

      // 1. Cart Wooden Chassis
      var cartGrad = ctx.createLinearGradient(x, y + 60, x, y + H + 25);
      cartGrad.addColorStop(0, '#451a03');
      cartGrad.addColorStop(1, '#270e02');
      ctx.fillStyle = cartGrad;
      ctx.fillRect(x + 10, y + 60, W - 20, H - 20);

      // Gold / Brass Corner Accents
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(x + 10, y + 60, 6, H - 20);
      ctx.fillRect(x + W - 16, y + 60, 6, H - 20);

      // Cart Wheels (left and right)
      var wheelY = y + H + 18;
      [x + 35, x + W - 35].forEach(function (wx) {
        // Outer tire
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(wx, wheelY, 18, 0, Math.PI * 2);
        ctx.fill();
        // Inner brass rim
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(wx, wheelY, 13, 0, Math.PI * 2);
        ctx.stroke();
        // Brass hub & spokes
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.arc(wx, wheelY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.5;
        for (var sp = 0; sp < 4; sp++) {
          var spAng = sp * Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(wx - Math.cos(spAng) * 12, wheelY - Math.sin(spAng) * 12);
          ctx.lineTo(wx + Math.cos(spAng) * 12, wheelY + Math.sin(spAng) * 12);
          ctx.stroke();
        }
      });

      // Shopkeeper Barista behind counter
      ctx.save();
      var skX = x + W * 0.48;
      var skY = y + 16;
      ctx.fillStyle = '#1e293b'; // Barista shirt
      ctx.beginPath();
      ctx.roundRect(skX - 12, skY + 16, 24, 24, 4);
      ctx.fill();
      ctx.fillStyle = '#78350f'; // Leather apron
      ctx.fillRect(skX - 8, skY + 20, 16, 20);
      ctx.fillStyle = '#f8d7b8'; // Head
      ctx.beginPath();
      ctx.arc(skX, skY + 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b'; // Eyes & smile
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(skX - 3, skY + 7, 2, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(skX + 3, skY + 7, 2, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(skX, skY + 9, 3, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#475569'; // Barista beanie
      ctx.beginPath();
      ctx.arc(skX, skY + 5, 10, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(skX - 11, skY + 3, 22, 3);
      ctx.restore();

      // Polished Quartz Countertop
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(x - 5, y + 52, W + 10, 12);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x - 5, y + 62, W + 10, 3);

      // Support Poles for Umbrella
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(x + 15, y - 40, 6, 95);
      ctx.fillRect(x + W - 21, y - 40, 6, 95);

      // Burgundy & Cream Awning
      var roofH = 48;
      var numStripes = 8;
      var stripeW = (W + 20) / numStripes;
      for (var s = 0; s < numStripes; s++) {
        ctx.fillStyle = (s % 2 === 0) ? '#831843' : '#fdf2f8';
        ctx.beginPath();
        ctx.moveTo(x - 10 + s * stripeW, y - 40 + roofH);
        ctx.lineTo(x - 10 + (s + 0.5) * stripeW, y - 40);
        ctx.lineTo(x - 10 + (s + 1) * stripeW, y - 40 + roofH);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#831843';
      ctx.fillRect(x - 12, y - 40 + roofH, W + 24, 7);

      // Commercial Chrome Espresso Machine
      var emX = x + 20;
      var emY = y + 16;
      var chromeGrad = ctx.createLinearGradient(emX, emY, emX + 46, emY);
      chromeGrad.addColorStop(0, '#e2e8f0');
      chromeGrad.addColorStop(0.5, '#f8fafc');
      chromeGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = chromeGrad;
      ctx.fillRect(emX, emY, 46, 36);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(emX, emY, 46, 36);

      // Cup warmer rack
      ctx.fillStyle = '#475569';
      ctx.fillRect(emX + 2, emY - 4, 42, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(emX + 6, emY - 9, 8, 5);
      ctx.fillRect(emX + 18, emY - 9, 8, 5);

      // Portafilters
      ctx.fillStyle = '#334155';
      ctx.fillRect(emX + 8, emY + 36, 12, 6);
      if (hasBooster) {
        ctx.fillRect(emX + 26, emY + 36, 12, 6);
      }
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(emX + 14, emY + 40);
      ctx.lineTo(emX + 8, emY + 48);
      ctx.stroke();

      // Pressure Gauge
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(emX + 36, emY + 12, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(emX + 36, emY + 12);
      ctx.lineTo(emX + 38, emY + 10);
      ctx.stroke();

      // Steam animation when operating
      if (isDayRunning) {
        ctx.save();
        var steamTime = (lastRafTime || 0) * 0.005;
        for (var st = 0; st < 3; st++) {
          var stX = emX + 20 + Math.sin(steamTime + st) * 6;
          var stY = emY - 12 - (st * 8 + (steamTime * 15) % 18);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.beginPath();
          ctx.arc(stX, stY, 3 + st * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Coffee Grinder with Bean Hopper
      var grX = emX + 52;
      var grY = y + 22;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(grX, grY + 14, 14, 16);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(grX, grY + 14);
      ctx.lineTo(grX - 3, grY);
      ctx.lineTo(grX + 17, grY);
      ctx.lineTo(grX + 14, grY + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#451a03';
      ctx.fillRect(grX, grY + 4, 14, 9);

      // Syrup Pump Bottles
      ['#ca8a04', '#78350f', '#f59e0b'].forEach(function (col, idx) {
        var syX = x + W * 0.62 + idx * 9;
        var syY = y + 34;
        ctx.fillStyle = col;
        ctx.fillRect(syX, syY, 7, 18);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(syX + 2, syY - 4, 3, 4);
        ctx.fillRect(syX + 2, syY - 6, 6, 2);
      });

      // Paper Coffee Cups Stack with Kraft Sleeves
      var cupX = x + W * 0.78;
      for (var cp = 0; cp < 4; cp++) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cupX, y + 42 - cp * 4, 14, 8);
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(cupX, y + 44 - cp * 4, 14, 4);
      }

      // ── Visible Upgrades ──
      if (hasPastry) {
        var pdX = x + W - 35;
        var pdY = y + 26;
        ctx.fillStyle = 'rgba(224, 242, 254, 0.45)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(pdX - 4, pdY, 32, 26, [8, 8, 2, 2]);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#d97706'; // Croissant
        ctx.beginPath();
        ctx.arc(pdX + 8, pdY + 18, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#92400e'; // Muffin
        ctx.beginPath();
        ctx.arc(pdX + 20, pdY + 17, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (hasBooster) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(emX + 23, emY + 8, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (isNight) {
        ctx.save();
        for (var b = 0; b < 4; b++) {
          var bx = x + 15 + b * 55;
          var by = y + 16;
          ctx.beginPath();
          ctx.arc(bx, by, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = 'rgba(254, 240, 138, 0.9)';
          ctx.shadowBlur = 14;
          ctx.fill();
        }
        ctx.restore();
      }
    }

    /* ── Animated Customer Drawer ─────────────────────────────────────── */
    function drawCustomer(ctx, c, groundY) {
      var cx = c.x;
      var cy = groundY - c.height;

      // Walking bounce
      var walkOffset = Math.sin(c.bob) * 3;
      cy += (c.state === 'leaving' || c.state === 'entering') ? walkOffset : 0;

      // Drop Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(cx, groundY + 2, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs / Pants
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      var legSwing = Math.sin(c.bob) * 6;
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy + c.height - 18);
      ctx.lineTo(cx - 3 - (c.state === 'at_counter' ? 0 : legSwing), groundY);
      ctx.moveTo(cx + 3, cy + c.height - 18);
      ctx.lineTo(cx + 3 + (c.state === 'at_counter' ? 0 : legSwing), groundY);
      ctx.stroke();

      // Shirt / Body
      ctx.fillStyle = c.shirt;
      ctx.beginPath();
      ctx.roundRect(cx - 9, cy + 18, 18, c.height - 36, 4);
      ctx.fill();

      // Head
      ctx.fillStyle = c.skin;
      ctx.beginPath();
      ctx.arc(cx, cy + 10, 10, 0, Math.PI * 2);
      ctx.fill();

      // Hair / Hat
      ctx.fillStyle = c.hair;
      ctx.beginPath();
      ctx.arc(cx, cy + 6, 10, Math.PI, Math.PI * 2);
      ctx.fill();

      // Hand holding item if served
      if (c.served && c.state === 'leaving') {
        ctx.save();
        var isPrint = /print/i.test(C.title) || (C.item && C.item.name === 'print');
        var isSnack = /store/i.test(C.title) || (C.item && C.item.name === 'snack');
        var isCoffeeItem = /coffee/i.test(C.title) || (C.item && (C.item.name === 'latte' || C.item.name === 'coffee'));

        if (isPrint) {
          // Cyan printed Benchy / miniature
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(cx + 7, cy + 24, 9, 8);
          ctx.fillStyle = '#0891b2';
          ctx.fillRect(cx + 9, cy + 20, 5, 4);
        } else if (isSnack) {
          // Colorful snack bag
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(cx + 7, cy + 23, 8, 11);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(cx + 8, cy + 26, 6, 4);
        } else if (isCoffeeItem) {
          // Hot coffee cup with kraft sleeve
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(cx + 8, cy + 26, 8, 10);
          ctx.fillStyle = '#ca8a04';
          ctx.fillRect(cx + 8, cy + 28, 8, 4);
          // Dark lid
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(cx + 7, cy + 24, 10, 2);
        } else {
          // Classic Lemonade cup with red striped straw
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(cx + 8, cy + 28, 7, 10);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(cx + 9, cy + 30, 5, 7);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx + 12, cy + 28);
          ctx.lineTo(cx + 14, cy + 20);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Speech bubble if interacting
      if (c.speech && c.state === 'at_counter') {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        var bW = 85;
        var bH = 26;
        var bx = cx - bW * 0.5;
        var by = cy - 36;
        ctx.beginPath();
        ctx.roundRect(bx, by, bW, bH, 6);
        ctx.fill();
        ctx.stroke();

        // Pointer
        ctx.beginPath();
        ctx.moveTo(cx - 4, by + bH);
        ctx.lineTo(cx, by + bH + 6);
        ctx.lineTo(cx + 4, by + bH);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.speech, cx, by + 17);
        ctx.restore();
      }
    }

    /* ── Render Right-Hand Deck (Tabs) ────────────────────────────────── */
    function renderDeck() {
      if (!el.panelContent) return;
      var pane = el.panelContent;
      pane.innerHTML = '';

      if (curMode === 'sim') {
        renderSimTab(pane);
      } else if (curMode === 'telemetry') {
        renderTelemetryTab(pane);
      } else if (curMode === 'config') {
        renderConfigTab(pane);
      } else if (curMode === 'upgrades') {
        renderUpgradesTab(pane);
      }
    }

    /* Tab 1: Storefront Brief & Daily Ledger */
    function renderSimTab(pane) {
      var T = S.today;
      var rent = C.rent || 0;

      // Card 1: Morning Briefing
      var briefCard = document.createElement('div');
      briefCard.className = 'lm-card';
      briefCard.innerHTML = [
        '<div class="lm-card-head"><span>Today’s Market Brief</span><b>Day ' + S.day + '</b></div>',
        '<div style="font-size:0.82rem;line-height:1.5;">',
        '  <div>' + (T.f.icon || '☀️') + ' <b>Forecast: ' + T.f.name + '</b> (Demand factor: ×' + T.f.demand.toFixed(2) + ')</div>',
        '  <div style="font-size:0.75rem;color:var(--lm-muted);margin-top:0.2rem;">Forecast confidence: ~' + Math.round((C.forecastAccuracy || 0.75) * 100) + '%. Weather may differ!</div>',
        '</div>',
        T.ev ? '<div class="lm-news-box"><span>📢</span><div><b>Breaking News:</b> ' + T.ev.text + '</div></div>' : '',
        '<div style="font-size:0.75rem;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.06);padding-top:0.35rem;">Daily Fixed Overhead (Rent): ' + money(rent) + '</div>'
      ].join('');
      pane.appendChild(briefCard);

      // Card 2: Financial Ledger
      var ledgerCard = document.createElement('div');
      ledgerCard.className = 'lm-card';
      if (S.last) {
        var L = S.last;
        ledgerCard.innerHTML = [
          '<div class="lm-card-head"><span>Financial Ledger</span><b>Day ' + L.day + ' Recap</b></div>',
          '<table class="lm-ledger-table">',
          '  <tr><td>Actual Weather</td><td>' + (L.weather.icon || '☀️') + ' ' + L.weather.name + '</td></tr>',
          '  <tr><td>Units Made / Sold</td><td>' + L.sold + ' / ' + L.qty + ' ' + (C.item.plural || 'cups') + '</td></tr>',
          '  <tr><td>Unsold Wasted</td><td>' + L.wasted + ' (' + money(L.wasted * S.today.cost) + ' lost)</td></tr>',
          '  <tr><td>Missed Foot Traffic</td><td>' + L.walked + ' turned away</td></tr>',
          '  <tr><td>Gross Revenue (' + L.sold + ' @ ' + money(L.price) + ')</td><td class="val-good">+' + money(L.earned) + '</td></tr>',
          '  <tr><td>Ingredient Costs</td><td class="val-bad">-' + money(L.spend) + '</td></tr>',
          '  <tr><td>Overhead Rent</td><td class="val-bad">-' + money(L.rent) + '</td></tr>',
          L.bill ? ('<tr><td>Event Impact</td><td class="' + (L.bill >= 0 ? 'val-good' : 'val-bad') + '">' + (L.bill >= 0 ? '+' : '-') + money(Math.abs(L.bill)) + '</td></tr>') : '',
          '  <tr class="total"><td>Net Day Profit</td><td class="' + (L.profit >= 0 ? 'val-good' : 'val-bad') + '">' + (L.profit >= 0 ? '+' : '') + money(L.profit) + '</td></tr>',
          '</table>'
        ].join('');
      } else {
        ledgerCard.innerHTML = [
          '<div class="lm-card-head"><span>Daily Ledger</span><b>Awaiting Day 1</b></div>',
          '<p style="font-size:0.78rem;color:var(--lm-muted);margin:0;line-height:1.5;">Choose your selling price and how many ' + (C.item.plural || 'cups') + ' to produce today, then press <b>▶ Open for the Day</b>.</p>'
        ].join('');
      }
      pane.appendChild(ledgerCard);

      // Card 3: Mini Profit Curve
      var chartCard = document.createElement('div');
      chartCard.className = 'lm-card';
      chartCard.innerHTML = [
        '<div class="lm-card-head"><span>Profit vs Price Curve</span><b>Pricing Math</b></div>',
        '<div class="lm-chart-wrap" id="mini-chart-wrap"></div>'
      ].join('');
      pane.appendChild(chartCard);
      renderProfitCurveSvg(chartCard.querySelector('#mini-chart-wrap'));

      // Card 4: Activity Log
      var logCard = document.createElement('div');
      logCard.className = 'lm-card';
      logCard.innerHTML = [
        '<div class="lm-card-head"><span>Simulation Log</span><b>' + S.log.length + ' entries</b></div>',
        '<div class="lm-log-box" id="lm-log-box"></div>'
      ].join('');
      pane.appendChild(logCard);
      var logBox = logCard.querySelector('#lm-log-box');
      S.log.forEach(function (l) {
        var row = document.createElement('div');
        row.className = 'lm-log-line ' + l.cls;
        row.textContent = 'D' + l.day + ': ' + l.text;
        logBox.appendChild(row);
      });
    }

    /* Tab 2: Full Telemetry & Analytics */
    function renderTelemetryTab(pane) {
      // 1. Profit Parabola Analysis
      var curveCard = document.createElement('div');
      curveCard.className = 'lm-card';
      curveCard.innerHTML = [
        '<div class="lm-card-head"><span>Theoretical Profit Curve</span><b>Optimal Peak</b></div>',
        '<div class="lm-chart-wrap" id="full-chart-wrap"></div>',
        '<div class="lm-chart-caption" id="full-chart-caption"></div>'
      ].join('');
      pane.appendChild(curveCard);
      renderProfitCurveSvg(curveCard.querySelector('#full-chart-wrap'), curveCard.querySelector('#full-chart-caption'));

      // 2. Multi-Day Performance History
      var histCard = document.createElement('div');
      histCard.className = 'lm-card';
      histCard.innerHTML = [
        '<div class="lm-card-head"><span>Financial Trajectory</span><b>Cash &amp; Profit Trend</b></div>',
        '<div id="history-chart-wrap"></div>'
      ].join('');
      pane.appendChild(histCard);
      renderHistoryChart(histCard.querySelector('#history-chart-wrap'));

      // 3. Customer Conversion Breakdown
      var convCard = document.createElement('div');
      convCard.className = 'lm-card';
      var totalServed = S.stats.totalCupsSold;
      var totalWasted = S.stats.totalWasted;
      var totalWalked = S.stats.totalWalkedAway;
      var totalAll = totalServed + totalWasted + totalWalked || 1;
      var pServed = Math.round((totalServed / totalAll) * 100);
      var pWalked = Math.round((totalWalked / totalAll) * 100);
      var pWasted = Math.max(0, 100 - pServed - pWalked);

      convCard.innerHTML = [
        '<div class="lm-card-head"><span>Season Conversion Efficiency</span><b>Cumulative</b></div>',
        '<div class="lm-conv-bar">',
        '  <div class="lm-conv-seg bought" style="width:' + pServed + '%" title="Served: ' + totalServed + '"></div>',
        '  <div class="lm-conv-seg stockout" style="width:' + pWalked + '%" title="Missed Demand: ' + totalWalked + '"></div>',
        '  <div class="lm-conv-seg priced-out" style="width:' + pWasted + '%" title="Wasted Inventory: ' + totalWasted + '"></div>',
        '</div>',
        '<div class="lm-conv-legend">',
        '  <span><i class="lm-conv-dot" style="background:#22c55e"></i>Served (' + pServed + '%)</span>',
        '  <span><i class="lm-conv-dot" style="background:#ef4444"></i>Missed Stockout (' + pWalked + '%)</span>',
        '  <span><i class="lm-conv-dot" style="background:#f59e0b"></i>Wasted (' + pWasted + '%)</span>',
        '</div>'
      ].join('');
      pane.appendChild(convCard);
    }

    /* Tab 3: Config IDE & JSON Editor */
    function renderConfigTab(pane) {
      var edCard = document.createElement('div');
      edCard.className = 'lm-card';
      edCard.style.flex = '1';
      edCard.innerHTML = [
        '<div class="lm-card-head"><span>Game Data Architecture</span><b>JSON Config</b></div>',
        '<p style="font-size:0.75rem;color:var(--lm-muted);margin:0;line-height:1.4;">',
        '  All economy balance numbers, weather weights, events, and compounding upgrades are defined here in standard JSON.',
        '</p>',
        '<textarea class="lm-config-area" id="lm-json-text" spellcheck="false">' + JSON.stringify(C, null, 2) + '</textarea>',
        '<div class="lm-config-status" id="lm-json-status"></div>',
        '<div style="display:flex;gap:0.4rem;flex-wrap:wrap;">',
        '  <button type="button" class="lm-btn primary" id="btn-apply-json">▶ Apply &amp; Run Config</button>',
        '  <button type="button" class="lm-btn" id="btn-format-json">Format JSON</button>',
        '  <button type="button" class="lm-btn" id="btn-export-json">Save File</button>',
        '</div>'
      ].join('');
      pane.appendChild(edCard);

      var txt = edCard.querySelector('#lm-json-text');
      var st = edCard.querySelector('#lm-json-status');

      edCard.querySelector('#btn-apply-json').addEventListener('click', function () {
        try {
          var parsed = JSON.parse(txt.value);
          validateConfig(parsed);
          applyConfig(parsed);
          st.className = 'lm-config-status ok';
          st.textContent = 'Running “' + C.title + '” successfully!';
        } catch (e) {
          st.className = 'lm-config-status bad';
          st.textContent = 'Config Error: ' + e.message;
          Sound.reject();
        }
      });

      edCard.querySelector('#btn-format-json').addEventListener('click', function () {
        try {
          txt.value = JSON.stringify(JSON.parse(txt.value), null, 2);
          st.className = 'lm-config-status ok';
          st.textContent = 'Formatted nicely.';
        } catch (e) {
          st.className = 'lm-config-status bad';
          st.textContent = 'Cannot format invalid JSON: ' + e.message;
        }
      });

      edCard.querySelector('#btn-export-json').addEventListener('click', exportGameFile);
    }

    /* Tab 4: Upgrades Shop */
    function renderUpgradesTab(pane) {
      var upCard = document.createElement('div');
      upCard.className = 'lm-card';
      upCard.innerHTML = [
        '<div class="lm-card-head"><span>Capital Upgrades Catalog</span><b>Compound Growth</b></div>',
        '<p style="font-size:0.75rem;color:var(--lm-muted);margin:0;line-height:1.4;">',
        '  Upgrades permanently multiply your foot traffic. Payback time = Cost ÷ Daily Extra Gain.',
        '</p>',
        '<div class="lm-upgrades-grid" id="lm-upgrades-list"></div>'
      ].join('');
      pane.appendChild(upCard);

      var list = upCard.querySelector('#lm-upgrades-list');
      var ups = C.upgrades || [];

      if (!ups.length) {
        list.innerHTML = '<p style="font-size:0.78rem;color:var(--lm-muted);">No upgrades defined in this game config.</p>';
        return;
      }

      var avgDailyProfit = S.last ? S.last.profit : ((C.topPrice - C.cost) * 0.3 * C.baseCustomers);

      ups.forEach(function (u) {
        var owned = S.owned.indexOf(u.name) >= 0;
        var boostPct = Math.round((u.demand - 1) * 100);
        var estDailyGain = Math.max(0.1, avgDailyProfit * (u.demand - 1));
        var paybackDays = Math.ceil(u.cost / estDailyGain);
        var daysLeft = Math.max(1, C.days - S.day);

        var item = document.createElement('div');
        item.className = 'lm-upgrade-card' + (owned ? ' owned' : '');
        item.innerHTML = [
          '<div class="lm-upgrade-info">',
          '  <h4>' + (owned ? '✓ ' : '') + u.name + '</h4>',
          '  <p><b>+' + boostPct + '% Foot Traffic</b> · Cost: ' + money(u.cost) + '<br>',
          '  <span style="color:' + (paybackDays <= daysLeft ? '#4ade80' : '#f87171') + '">',
          '    Payback: ~' + paybackDays + ' days (' + daysLeft + ' days left in season)',
          '  </span></p>',
          '</div>',
          '<div>',
          '  <button type="button" class="lm-btn primary" ' + (owned || S.over || S.cash < u.cost ? 'disabled' : '') + '>',
          owned ? 'Owned' : ('Buy ' + money(u.cost)),
          '  </button>',
          '</div>'
        ].join('');

        var buyBtn = item.querySelector('button');
        buyBtn.addEventListener('click', function () {
          if (S.cash >= u.cost && !owned) {
            S.cash = cents(S.cash - u.cost);
            S.boost = cents(S.boost * u.demand);
            S.owned.push(u.name);
            logMessage('Purchased ' + u.name + '! Foot traffic boosted by ' + boostPct + '% permanently.', 'good');
            Sound.upgrade();
            syncInputs();
            renderDeck();
          }
        });

        list.appendChild(item);
      });
    }

    /* ── Interactive Profit Curve SVG ─────────────────────────────────── */
    function renderProfitCurveSvg(container, captionContainer) {
      if (!container) return;
      var T = S.today || { f: { demand: 1.0 }, extra: 1, cost: C.cost };
      var qInp = el.stage ? el.stage.querySelector('#inp-qty') : null;
      var pInp = el.stage ? el.stage.querySelector('#inp-price') : null;
      var qty = qInp ? Math.max(1, Math.floor(Number(qInp.value)) || 1) : 40;
      var curPrice = pInp ? (parseFloat(pInp.value) || 0) : 1.0;

      var W = 320;
      var H = 120;
      var L = 10;
      var B = 18;
      var N = 60;
      var rent = C.rent || 0;

      var pts = [];
      var best = null;

      for (var i = 0; i <= N; i++) {
        var p = (C.topPrice * i) / N;
        var want = calculateDemand(p, T.f.demand, T.extra, S.boost);
        var sold = Math.min(want, qty);
        var prof = cents(sold * p - qty * T.cost - rent);
        pts.push([p, prof]);
        if (!best || prof > best[1]) best = [p, prof];
      }

      var minVal = Math.min(0, Math.min.apply(null, pts.map(function (pt) { return pt[1]; })));
      var maxVal = Math.max(1, best[1]);

      function mapX(p) { return L + ((W - 2 * L) * p) / C.topPrice; }
      function mapY(v) { return 6 + (H - B - 6) * (1 - (v - minVal) / (maxVal - minVal)); }

      var pathD = pts.map(function (pt, idx) {
        return (idx === 0 ? 'M' : 'L') + mapX(pt[0]).toFixed(1) + ' ' + mapY(pt[1]).toFixed(1);
      }).join(' ');

      container.innerHTML = [
        '<svg class="lm-svg-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Profit vs Price Parabola">',
        '  <line x1="' + L + '" x2="' + (W - L) + '" y1="' + mapY(0) + '" y2="' + mapY(0) + '" stroke="#475569" stroke-dasharray="3 3"/>',
        '  <path d="' + pathD + '" fill="none" stroke="#f59e0b" stroke-width="2.5"/>',
        '  <circle cx="' + mapX(best[0]) + '" cy="' + mapY(best[1]) + '" r="5" fill="#22c55e" stroke="#ffffff" stroke-width="1.5"/>',
        (curPrice > 0 && curPrice <= C.topPrice
          ? '<line x1="' + mapX(curPrice) + '" x2="' + mapX(curPrice) + '" y1="4" y2="' + (H - B) + '" stroke="#38bdf8" stroke-width="2"/>'
          : ''),
        '  <text x="' + L + '" y="' + (H - 4) + '" font-size="9" fill="#94a3b8">' + cur + '0</text>',
        '  <text x="' + (W - L) + '" y="' + (H - 4) + '" font-size="9" fill="#94a3b8" text-anchor="end">' + cur + C.topPrice.toFixed(2) + ' top</text>',
        '</svg>'
      ].join('');

      if (captionContainer) {
        captionContainer.innerHTML = [
          'Optimal Peak: <b style="color:#22c55e">' + money(best[0]) + '</b> (est. profit ' + money(best[1]) + '). ',
          'Current Price: <b style="color:#38bdf8">' + money(curPrice) + '</b>. ',
          'The parabola reaches peak halfway between unit cost (' + money(T.cost) + ') and max threshold (' + money(C.topPrice) + ').'
        ].join('');
      }
    }

    /* ── Multi-Day Cash & Profit History Chart ────────────────────────── */
    function renderHistoryChart(container) {
      if (!container) return;
      var hist = S.history;
      if (!hist || hist.length <= 1) {
        container.innerHTML = '<p style="font-size:0.75rem;color:var(--lm-muted);margin:0.5rem 0;">History will chart after Day 1 opens.</p>';
        return;
      }

      var W = 320;
      var H = 100;
      var pad = 20;

      var maxCash = Math.max(C.goal, Math.max.apply(null, hist.map(function (h) { return h.cash; })));
      var minCash = Math.min(0, Math.min.apply(null, hist.map(function (h) { return h.cash; })));

      function X(idx) { return pad + (idx / Math.max(1, hist.length - 1)) * (W - 2 * pad); }
      function Y(cVal) { return 6 + (H - 24) * (1 - (cVal - minCash) / (maxCash - minCash)); }

      var d = hist.map(function (h, i) {
        return (i === 0 ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Y(h.cash).toFixed(1);
      }).join(' ');

      container.innerHTML = [
        '<svg class="lm-history-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Cash balance over time">',
        '  <line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + Y(C.goal) + '" y2="' + Y(C.goal) + '" stroke="#22c55e" stroke-dasharray="4 4" stroke-width="1.2"/>',
        '  <path d="' + d + '" fill="none" stroke="#38bdf8" stroke-width="2.5"/>',
        hist.map(function (h, i) {
          return '<circle cx="' + X(i) + '" cy="' + Y(h.cash) + '" r="3" fill="#38bdf8"/>';
        }).join(''),
        '  <text x="' + pad + '" y="' + (H - 4) + '" font-size="8" fill="#94a3b8">Day 0</text>',
        '  <text x="' + (W - pad) + '" y="' + (H - 4) + '" font-size="8" fill="#94a3b8" text-anchor="end">Day ' + S.day + '</text>',
        '  <text x="' + (W - pad) + '" y="' + (Y(C.goal) - 3) + '" font-size="8" fill="#22c55e" text-anchor="end">Goal ' + money(C.goal) + '</text>',
        '</svg>'
      ].join('');
    }

    /* ── Season Finished Modal ────────────────────────────────────────── */
    function finishSeason(title, text, won) {
      S.over = true;
      if (won) Sound.win(); else Sound.lose();

      var modal = document.createElement('div');
      modal.className = 'lm-modal-backdrop';
      modal.innerHTML = [
        '<div class="lm-modal-box" role="dialog" aria-labelledby="modal-title">',
        '  <div class="lm-modal-icon">' + (won ? '🏆' : '📉') + '</div>',
        '  <h3 id="modal-title">' + title + '</h3>',
        '  <p>' + text + '</p>',
        '  <div class="lm-modal-stats">',
        '    <span>Final Balance:</span><b>' + money(S.cash) + '</b>',
        '    <span>Season Target:</span><b>' + money(C.goal) + '</b>',
        '    <span>Total Units Sold:</span><b>' + S.stats.totalCupsSold + '</b>',
        '    <span>Total Sales Revenue:</span><b>' + money(S.stats.totalEarned) + '</b>',
        '  </div>',
        '  <div style="display:flex;gap:0.5rem;justify-content:center;">',
        '    <button type="button" class="lm-btn primary" id="modal-replay">Play Again</button>',
        '    <button type="button" class="lm-btn" id="modal-close">Inspect Final Stats</button>',
        '  </div>',
        '</div>'
      ].join('');

      el.wrap.appendChild(modal);

      modal.querySelector('#modal-replay').addEventListener('click', function () {
        modal.remove();
        initGame();
        buildDom();
      });

      modal.querySelector('#modal-close').addEventListener('click', function () {
        modal.remove();
        syncInputs();
        renderDeck();
      });
    }

    /* ── Standalone Game Exporter ─────────────────────────────────────── */
    function exportGameFile() {
      var jsonStr = JSON.stringify(C, null, 2);
      var safeTitle = (C.title || 'My Tycoon Game').replace(/[<>&"]/g, '');
      var fileName = safeTitle.replace(/\W+/g, '-').toLowerCase() + '.html';

      var html = [
        '<!doctype html>',
        '<html lang="en">',
        '<head>',
        '  <meta charset="utf-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1">',
        '  <title>' + safeTitle + '</title>',
        '  <style>',
        '    body { margin: 0; padding: 1rem; background: #0f172a; color: #f8fafc; font-family: system-ui, sans-serif; }',
        '    #game-container { max-width: 1040px; margin: 0 auto; height: 90vh; min-height: 600px; }',
        '  </style>',
        '</head>',
        '<body>',
        '  <div id="game-container"></div>',
        '  <script src="https://scandrett.net/classroom/assets/js/lemonade-studio.js"></script>',
        '  <script>',
        '    var CONFIG = ' + jsonStr + ';',
        '    window.LemonadeStudio.mount(document.getElementById("game-container"), CONFIG);',
        '  </' + 'script>',
        '</body>',
        '</html>'
      ].join('\n');

      var blob = new Blob([html], { type: 'text/html' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 500);
    }

    function validateConfig(cfg) {
      if (!cfg || typeof cfg !== 'object') throw new Error('Config must be a JSON object.');
      if (!cfg.title) throw new Error('"title" is required.');
      if (!cfg.days || cfg.days < 1) throw new Error('"days" must be >= 1.');
      if (!cfg.goal || cfg.goal <= 0) throw new Error('"goal" must be > 0.');
      if (cfg.cost == null || cfg.cost < 0) throw new Error('"cost" must be >= 0.');
      if (cfg.topPrice == null || cfg.topPrice <= cfg.cost) throw new Error('"topPrice" must be higher than "cost".');
      if (!Array.isArray(cfg.weather) || cfg.weather.length === 0) throw new Error('At least one weather condition is required.');
    }

    /* ── Lifecycle & Public API ───────────────────────────────────────── */
    initGame();
    buildDom();

    var instance = {
      destroy: function () {
        destroyed = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (canvasHelper && canvasHelper.destroy) canvasHelper.destroy();
        rootEl._lemonStudio = null;
      },
      getState: function () { return S; },
      getConfig: function () { return C; }
    };
    rootEl._lemonStudio = instance;
    return instance;
  }

  /* ── Export to Global ───────────────────────────────────────────────── */
  global.LemonadeStudio = {
    mount: function (target, config) {
      return LemonadeStudioEngine(target, config);
    },
    presets: PRESETS
  };

})(typeof window !== 'undefined' ? window : this);
