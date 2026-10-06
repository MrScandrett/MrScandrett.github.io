/**
 * weather-watch.js — Interactive Controller for Central Weather Watch Lesson
 * Mr. Scandrett's ClassroomOS
 */
(function () {
  'use strict';

  let currentWeather = null;
  let activeLocation = window.WeatherEngine.DEFAULT_LOCATION;
  let drivingSpeed = 55;

  // ── DOM ELEMENTS ────────────────────────────────────────────────────────────
  const els = {
    // Search & Location
    searchInput: document.getElementById('ww-search-input'),
    searchResults: document.getElementById('ww-search-results'),
    geoBtn: document.getElementById('ww-geo-btn'),
    presetChips: document.querySelectorAll('.ww-preset-chip'),

    // Cockpit
    dialCity: document.getElementById('ww-dial-city'),
    dialStation: document.getElementById('ww-dial-station'),
    dialTemp: document.getElementById('ww-dial-temp'),
    dialIcon: document.getElementById('ww-dial-icon'),
    dialCondition: document.getElementById('ww-dial-condition'),
    dialFeels: document.getElementById('ww-dial-feels'),
    dialLo: document.getElementById('ww-dial-lo'),
    dialHi: document.getElementById('ww-dial-hi'),

    // Telemetry
    statDew: document.getElementById('ww-stat-dew'),
    statDewSub: document.getElementById('ww-stat-dew-sub'),
    statCloudBase: document.getElementById('ww-stat-cloudbase'),
    statCloudBaseSub: document.getElementById('ww-stat-cloudbase-sub'),
    statWind: document.getElementById('ww-stat-wind'),
    statWindSub: document.getElementById('ww-stat-wind-sub'),
    statPressure: document.getElementById('ww-stat-pressure'),
    statPressureSub: document.getElementById('ww-stat-pressure-sub'),
    statUV: document.getElementById('ww-stat-uv'),
    statUVSub: document.getElementById('ww-stat-uv-sub'),
    statHumidity: document.getElementById('ww-stat-humidity'),
    statVisibility: document.getElementById('ww-stat-visibility'),

    // Hourly & Daily
    hourlyStrip: document.getElementById('ww-hourly-strip'),
    dailyGrid: document.getElementById('ww-daily-grid'),

    // Solar & Lunar
    sunriseTime: document.getElementById('ww-sunrise-time'),
    sunsetTime: document.getElementById('ww-sunset-time'),
    solarFill: document.getElementById('ww-solar-fill'),
    solarSun: document.getElementById('ww-solar-sun'),
    moonEmoji: document.getElementById('ww-moon-emoji'),
    moonName: document.getElementById('ww-moon-name'),
    moonIllum: document.getElementById('ww-moon-illum'),

    // Driving Section
    driveBanner: document.getElementById('ww-drive-banner'),
    driveBadge: document.getElementById('ww-drive-badge'),
    driveTitle: document.getElementById('ww-drive-title'),
    driveFriction: document.getElementById('ww-drive-friction'),
    hazardsGrid: document.getElementById('ww-hazards-grid'),
    speedSlider: document.getElementById('ww-speed-slider'),
    speedVal: document.getElementById('ww-speed-val'),
    chartDry: document.getElementById('ww-chart-dry'),
    chartDryVal: document.getElementById('ww-chart-dry-val'),
    chartWet: document.getElementById('ww-chart-wet'),
    chartWetVal: document.getElementById('ww-chart-wet-val'),
    chartSnow: document.getElementById('ww-chart-snow'),
    chartSnowVal: document.getElementById('ww-chart-snow-val'),
    chartIce: document.getElementById('ww-chart-ice'),
    chartIceVal: document.getElementById('ww-chart-ice-val'),

    // Wardrobe Section
    wardrobeEmoji: document.getElementById('ww-wardrobe-emoji'),
    wardrobeTitle: document.getElementById('ww-wardrobe-title'),
    wardrobeDesc: document.getElementById('ww-wardrobe-desc'),
    recessPill: document.getElementById('ww-recess-pill'),
    layerBase: document.getElementById('ww-layer-base'),
    layerMid: document.getElementById('ww-layer-mid'),
    layerOuter: document.getElementById('ww-layer-outer'),
    layerLower: document.getElementById('ww-layer-lower'),
    layerFoot: document.getElementById('ww-layer-foot'),
    layerAcc: document.getElementById('ww-layer-acc'),

    // Wardrobe Sandbox
    sandTemp: document.getElementById('ww-sand-temp'),
    sandTempVal: document.getElementById('ww-sand-temp-val'),
    sandRain: document.getElementById('ww-sand-rain'),
    sandWind: document.getElementById('ww-sand-wind'),
    sandResult: document.getElementById('ww-sand-result'),

    // LCL Cloud Base Lab
    lclTemp: document.getElementById('ww-lcl-temp'),
    lclTempVal: document.getElementById('ww-lcl-temp-val'),
    lclDew: document.getElementById('ww-lcl-dew'),
    lclDewVal: document.getElementById('ww-lcl-dew-val'),
    lclHeightFt: document.getElementById('ww-lcl-height-ft'),
    lclHeightM: document.getElementById('ww-lcl-height-m'),

    // Sidebar
    sideLoc: document.getElementById('ww-side-loc'),
    sideTemp: document.getElementById('ww-side-temp'),
    sideCond: document.getElementById('ww-side-cond'),
    sideDrive: document.getElementById('ww-side-drive')
  };

  // ── CORE DATA LOADER ────────────────────────────────────────────────────────
  async function loadWeather(location) {
    activeLocation = location;
    try {
      if (els.dialCondition) els.dialCondition.textContent = 'Updating atmospheric readings...';
      const data = await window.WeatherEngine.fetchWeather(location);
      currentWeather = data;
      renderCockpit(data);
      renderDriving(data);
      renderWardrobe(data);
      renderSidebar(data);
    } catch (err) {
      console.error('Weather load error:', err);
      if (els.dialCondition) els.dialCondition.textContent = 'Weather feed temporarily unavailable';
    }
  }

  // ── RENDER COCKPIT ──────────────────────────────────────────────────────────
  function renderCockpit(data) {
    if (!els.dialCity) return;

    els.dialCity.textContent = data.location.label;
    els.dialStation.textContent = data.location.stationId;
    els.dialTemp.textContent = `${data.temperature}°`;
    els.dialIcon.textContent = data.icon;
    els.dialCondition.textContent = data.condition;
    els.dialFeels.textContent = `FEELS LIKE ${data.feelsLike}° · ${data.dewComfort.category.toUpperCase()}`;
    els.dialLo.textContent = `${data.min}°`;
    els.dialHi.textContent = `${data.max}°`;

    // Telemetry
    els.statDew.textContent = `${data.dewPoint}°F`;
    els.statDewSub.textContent = data.dewComfort.category;

    els.statCloudBase.textContent = `${data.cloudBase.feet.toLocaleString()} FT`;
    els.statCloudBaseSub.textContent = `~${data.cloudBase.meters.toLocaleString()} m altitude`;

    els.statWind.textContent = `${data.wind} MPH ${data.windCompass.short}`;
    els.statWindSub.textContent = `Gusts: ${data.windGusts} MPH · Beaufort: ${data.beaufort.name}`;

    els.statPressure.textContent = `${data.pressure.inHg} inHg`;
    els.statPressureSub.textContent = `${data.pressure.hPa} hPa · ${data.pressure.system}`;

    els.statUV.textContent = `${data.uvIndex} ${data.uvInfo.category}`;
    els.statUVSub.textContent = `Burn: ${data.uvInfo.burnTime}`;

    els.statHumidity.textContent = `${data.humidity}%`;
    els.statVisibility.textContent = `${data.visibilityMiles} MI`;

    // Hourly 24-hr strip
    if (els.hourlyStrip && data.hourly) {
      els.hourlyStrip.innerHTML = data.hourly.map((h, i) => `
        <div class="ww-hourly-slot${i === 0 ? ' is-now' : ''}">
          <span class="ww-hourly-time">${i === 0 ? 'Now' : h.timeLabel}</span>
          <span class="ww-hourly-icon" aria-hidden="true">${h.icon}</span>
          <span class="ww-hourly-temp">${h.temp}°</span>
          <span class="ww-hourly-pop">${h.precipProb > 0 ? `${h.precipProb}%` : ''}</span>
        </div>
      `).join('');
    }

    // 7-day daily forecast
    if (els.dailyGrid && data.daily) {
      els.dailyGrid.innerHTML = data.daily.map((d) => `
        <div class="ww-daily-card">
          <span class="ww-daily-day">${d.dayName}</span>
          <span class="ww-daily-icon" aria-hidden="true">${d.icon}</span>
          <div class="ww-daily-temps">
            <span class="ww-daily-hi">${d.max}°</span>
            <span class="ww-daily-lo">${d.min}°</span>
          </div>
          <span class="ww-daily-rain">${d.rainChance > 0 ? `💧 ${d.rainChance}%` : '☀️ Clear'}</span>
        </div>
      `).join('');
    }

    // Ephemeris (Sun & Moon)
    if (data.sunriseEpoch && data.sunsetEpoch) {
      const rise = new Date(data.sunriseEpoch).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const set = new Date(data.sunsetEpoch).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      els.sunriseTime.textContent = rise;
      els.sunsetTime.textContent = set;

      const now = Date.now();
      let pct = 0;
      if (now >= data.sunriseEpoch && now <= data.sunsetEpoch) {
        pct = Math.round(((now - data.sunriseEpoch) / (data.sunsetEpoch - data.sunriseEpoch)) * 100);
      } else if (now > data.sunsetEpoch) {
        pct = 100;
      }
      els.solarFill.style.width = `${pct}%`;
      els.solarSun.style.left = `${pct}%`;
    }

    if (data.moon) {
      els.moonEmoji.textContent = data.moon.emoji;
      els.moonName.textContent = data.moon.name;
      els.moonIllum.textContent = `${data.moon.illumination}% lit`;
    }
  }

  // ── RENDER DRIVING ENGINE ───────────────────────────────────────────────────
  function renderDriving(data) {
    if (!els.driveBanner) return;
    const driving = window.WeatherEngine.evaluateDrivingConditions(data, drivingSpeed);

    els.driveBanner.className = `ww-drive-banner ${driving.statusClass}`;
    els.driveBadge.textContent = driving.status;
    els.driveTitle.textContent = driving.statusTitle;
    els.driveFriction.innerHTML = `Surface: <strong>${driving.roadState}</strong> (Friction coefficient μ = ${driving.frictionMu})`;

    // Hazards
    if (els.hazardsGrid) {
      if (!driving.hazards.length) {
        els.hazardsGrid.innerHTML = `
          <div class="ww-hazard-card">
            <h4 class="ww-hazard-title">✅ No Major Atmospheric Road Hazards</h4>
            <p class="ww-hazard-desc">Road conditions are currently nominal. Standard safe driving precautions and posted speed limits apply.</p>
          </div>
        `;
      } else {
        els.hazardsGrid.innerHTML = driving.hazards.map((h) => `
          <div class="ww-hazard-card ${h.severity}">
            <h4 class="ww-hazard-title">⚠️ ${h.title}</h4>
            <p class="ww-hazard-desc">${h.desc}</p>
          </div>
        `).join('');
      }
    }

    updateBrakingChart(drivingSpeed);
  }

  function updateBrakingChart(speedMph) {
    const g = 32.174;
    const v_fps = speedMph * 1.46667;
    const reactionDist = Math.round(v_fps * 1.5);

    // Friction values
    const dryDist = Math.round((v_fps * v_fps) / (2 * 0.75 * g));
    const wetDist = Math.round((v_fps * v_fps) / (2 * 0.45 * g));
    const snowDist = Math.round((v_fps * v_fps) / (2 * 0.20 * g));
    const iceDist = Math.round((v_fps * v_fps) / (2 * 0.07 * g));

    // Scaling max to ice at 75mph (~800ft)
    const maxScale = Math.max(iceDist + reactionDist, 600);

    const dryPct = Math.min(100, Math.round(((dryDist + reactionDist) / maxScale) * 100));
    const wetPct = Math.min(100, Math.round(((wetDist + reactionDist) / maxScale) * 100));
    const snowPct = Math.min(100, Math.round(((snowDist + reactionDist) / maxScale) * 100));
    const icePct = Math.min(100, Math.round(((iceDist + reactionDist) / maxScale) * 100));

    if (els.chartDry) {
      els.chartDry.style.width = `${dryPct}%`;
      els.chartDryVal.textContent = `${dryDist + reactionDist} ft`;
      els.chartWet.style.width = `${wetPct}%`;
      els.chartWetVal.textContent = `${wetDist + reactionDist} ft`;
      els.chartSnow.style.width = `${snowPct}%`;
      els.chartSnowVal.textContent = `${snowDist + reactionDist} ft`;
      els.chartIce.style.width = `${icePct}%`;
      els.chartIceVal.textContent = `${iceDist + reactionDist} ft`;
    }
  }

  // ── RENDER WARDROBE ENGINE ──────────────────────────────────────────────────
  function renderWardrobe(data) {
    if (!els.wardrobeEmoji) return;
    const c = data.clothing;

    els.wardrobeEmoji.textContent = c.emoji;
    els.wardrobeTitle.textContent = `${c.thermalCategory} (${c.feelsF}°F feels-like)`;
    els.wardrobeDesc.textContent = c.summaryText;
    els.recessPill.textContent = c.recessRating;

    els.layerBase.textContent = c.layers.base;
    els.layerMid.textContent = c.layers.mid;
    els.layerOuter.textContent = c.layers.outer;
    els.layerLower.textContent = c.layers.lower;
    els.layerFoot.textContent = c.layers.footwear;
    els.layerAcc.textContent = c.layers.accessories.join(' · ') || 'No special gear needed';
  }

  function updateWardrobeSandbox() {
    if (!els.sandTemp) return;
    const temp = parseInt(els.sandTemp.value, 10);
    const isRain = els.sandRain.checked;
    const isWind = els.sandWind.checked;

    els.sandTempVal.textContent = `${temp}°F`;

    const mockWeather = {
      temperature: temp,
      feelsLike: isWind ? temp - 8 : temp,
      weatherCode: isRain ? 63 : 1,
      rainChance: isRain ? 90 : 10,
      wind: isWind ? 25 : 5,
      uvIndex: temp > 80 ? 8 : 3
    };

    const c = window.WeatherEngine.evaluateClothing(mockWeather);
    els.sandResult.innerHTML = `
      <div style="margin-top:0.8rem; padding:1rem; background:rgba(0,217,245,0.08); border:1px solid var(--ww-cyan-border); border-radius:8px;">
        <h4 style="margin:0 0 0.4rem; color:var(--ww-cyan); font-size:1.1rem;">${c.emoji} ${c.thermalCategory}</h4>
        <p style="margin:0 0 0.6rem; font-size:0.92rem; color:#f1f5f9;">${c.summaryText}</p>
        <div style="font-size:0.85rem; line-height:1.5; color:#cbd5e1;">
          <div><strong>Base Layer:</strong> ${c.layers.base}</div>
          <div><strong>Mid Layer:</strong> ${c.layers.mid}</div>
          <div><strong>Outer Layer:</strong> ${c.layers.outer}</div>
          <div><strong>Footwear:</strong> ${c.layers.footwear}</div>
          <div><strong>Accessories:</strong> ${c.layers.accessories.join(' · ') || 'None'}</div>
        </div>
      </div>
    `;
  }

  // ── LCL CLOUD BASE CALCULATOR ───────────────────────────────────────────────
  function updateLclCalc() {
    if (!els.lclTemp || !els.lclDew) return;
    const t = parseInt(els.lclTemp.value, 10);
    const d = parseInt(els.lclDew.value, 10);

    // Keep dew point <= temp
    if (d > t) {
      els.lclDew.value = t;
    }

    const currentT = parseInt(els.lclTemp.value, 10);
    const currentD = parseInt(els.lclDew.value, 10);

    els.lclTempVal.textContent = `${currentT}°F`;
    els.lclDewVal.textContent = `${currentD}°F`;

    const lcl = window.WeatherEngine.calculateCloudBase(currentT, currentD);
    els.lclHeightFt.textContent = `${lcl.feet.toLocaleString()} FT`;
    els.lclHeightM.textContent = `~${lcl.meters.toLocaleString()} M`;
  }

  // ── RENDER SIDEBAR ──────────────────────────────────────────────────────────
  function renderSidebar(data) {
    if (!els.sideLoc) return;
    els.sideLoc.textContent = data.location.label;
    els.sideTemp.textContent = `${data.temperature}°F (${data.condition})`;
    els.sideCond.textContent = `${data.dewComfort.category} · RH ${data.humidity}%`;
    els.sideDrive.textContent = `Road Status: ${data.driving.status} (${data.driving.statusTitle})`;
  }

  // ── INTERACTIVE FRONT CANVAS SIMULATOR ──────────────────────────────────────
  function initFrontSimulator() {
    const canvas = document.getElementById('ww-front-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frontType = 'cold'; // 'cold' or 'warm'
    let animFrame = null;
    let t = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
    resize();
    window.addEventListener('resize', resize);

    const coldBtn = document.getElementById('ww-front-cold');
    const warmBtn = document.getElementById('ww-front-warm');
    const noteEl = document.getElementById('ww-front-note');

    if (coldBtn && warmBtn) {
      coldBtn.addEventListener('click', () => {
        frontType = 'cold';
        coldBtn.classList.add('is-active');
        warmBtn.classList.remove('is-active');
        if (noteEl) {
          noteEl.innerHTML = `
            <strong>Cold Front Dynamics:</strong> Cold, dense polar air advances like a snowplow wedge under light, warm moist air.
            The steep upward push forces vigorous vertical convection, generating towering <em>cumulonimbus clouds</em>, sharp squall lines,
            intense downpours, lightning, and a sudden drop in temperature and dew point behind the front.
          `;
        }
      });

      warmBtn.addEventListener('click', () => {
        frontType = 'warm';
        warmBtn.classList.add('is-active');
        coldBtn.classList.remove('is-active');
        if (noteEl) {
          noteEl.innerHTML = `
            <strong>Warm Front Dynamics:</strong> Warm, buoyant tropical air glides gently up and over a retreating wedge of cold air.
            Because the slope is very gradual (1:200), the air expands and cools over hundreds of miles, creating a wide sequence of
            layered clouds: first high wispy <em>cirrus</em>, then mid-level <em>altostratus</em>, and finally thick <em>nimbostratus</em> with
            hours of steady, widespread rain.
          `;
        }
      });
    }

    function draw() {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      t += 0.02;

      ctx.clearRect(0, 0, w, h);

      // Sky background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#0a192f');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Ground
      ctx.fillStyle = '#1e3a1e';
      ctx.fillRect(0, h - 25, w, 25);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, h - 22, w, 4);

      if (frontType === 'cold') {
        // Cold Wedge advancing from left to right
        ctx.beginPath();
        ctx.moveTo(0, h - 25);
        ctx.lineTo(0, h - 180);
        ctx.quadraticCurveTo(w * 0.35, h - 140, w * 0.55, h - 25);
        ctx.lineTo(0, h - 25);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.45)';
        ctx.fill();

        // Front boundary line (Blue Triangles)
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Warm air on right rising up
        ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
        ctx.beginPath();
        ctx.moveTo(w * 0.55, h - 25);
        ctx.quadraticCurveTo(w * 0.35, h - 140, 0, h - 180);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, h - 25);
        ctx.fill();

        // Towering Cumulonimbus
        ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
        ctx.beginPath();
        ctx.arc(w * 0.45, h - 160 + Math.sin(t) * 3, 45, 0, Math.PI * 2);
        ctx.arc(w * 0.48, h - 210 + Math.cos(t) * 4, 55, 0, Math.PI * 2);
        ctx.arc(w * 0.53, h - 170, 48, 0, Math.PI * 2);
        ctx.fill();

        // Anvil top
        ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
        ctx.beginPath();
        ctx.ellipse(w * 0.52, h - 240, 90, 24, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rain shafts
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 20; i++) {
          const rx = w * 0.42 + (i * 7);
          const ry = (h - 110) + ((t * 200 + i * 15) % 85);
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 3, ry + 12);
          ctx.stroke();
        }

        // Labels
        ctx.font = 'bold 12px ui-monospace, monospace';
        ctx.fillStyle = '#60a5fa';
        ctx.fillText('COLD AIR MASS (Dense)', 20, h - 60);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('WARM AIR MASS (Moist)', w - 180, h - 60);
        ctx.fillStyle = '#fff';
        ctx.fillText('↑ Rapid Convection (Squall)', w * 0.36, h - 90);

      } else {
        // Warm Front (gentle slope)
        ctx.beginPath();
        ctx.moveTo(w, h - 25);
        ctx.lineTo(w, h - 100);
        ctx.lineTo(0, h - 25);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.fill();

        // Warm air riding up
        ctx.beginPath();
        ctx.moveTo(0, h - 25);
        ctx.lineTo(w, h - 100);
        ctx.lineTo(w, 0);
        ctx.lineTo(0, 0);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
        ctx.fill();

        // Cloud progression: Cirrus high right, Nimbostratus left
        // Cirrus
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = 'italic 11px sans-serif';
        ctx.fillText('Cirrus (Ice crystals)', w - 140, 45);

        // Altostratus
        ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
        ctx.fillRect(w * 0.4, h - 190, 160, 20);

        // Nimbostratus & steady rain
        ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
        ctx.fillRect(w * 0.1, h - 130, 180, 40);

        ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 35; i++) {
          const rx = w * 0.12 + (i * 5);
          const ry = (h - 90) + ((t * 120 + i * 10) % 65);
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 2, ry + 10);
          ctx.stroke();
        }

        ctx.font = 'bold 12px ui-monospace, monospace';
        ctx.fillStyle = '#60a5fa';
        ctx.fillText('RETREATING COLD AIR', w - 180, h - 40);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('WARM AIR OVERRIDING', 20, 60);
      }

      animFrame = requestAnimationFrame(draw);
    }

    draw();
  }

  // ── INTERACTIVE QUIZ CONTROLLER ─────────────────────────────────────────────
  function initQuiz() {
    const quizContainers = document.querySelectorAll('.ww-quiz-card');
    quizContainers.forEach((card) => {
      const opts = card.querySelectorAll('.ww-quiz-opt');
      const feedback = card.querySelector('.ww-quiz-feedback');
      const correctIdx = parseInt(card.dataset.correct, 10);

      opts.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
          opts.forEach(b => b.disabled = true);
          if (idx === correctIdx) {
            btn.classList.add('is-correct');
            if (feedback) {
              feedback.className = 'ww-quiz-feedback correct is-visible';
              feedback.innerHTML = `<strong>Correct!</strong> ${card.dataset.explanation || 'Great scientific deduction.'}`;
            }
          } else {
            btn.classList.add('is-incorrect');
            if (opts[correctIdx]) opts[correctIdx].classList.add('is-correct');
            if (feedback) {
              feedback.className = 'ww-quiz-feedback incorrect is-visible';
              feedback.innerHTML = `<strong>Not quite.</strong> ${card.dataset.explanation || 'Review the atmospheric physics section above.'}`;
            }
          }
        });
      });
    });
  }

  // ── EVENT LISTENERS ─────────────────────────────────────────────────────────
  function setupEventListeners() {
    // Preset buttons
    els.presetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        els.presetChips.forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        const locId = chip.dataset.loc;
        const loc = window.WeatherEngine.PRESET_LOCATIONS.find(l => l.id === locId);
        if (loc) loadWeather(loc);
      });
    });

    // Geolocation button
    if (els.geoBtn) {
      els.geoBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
          alert('Geolocation not supported in this browser.');
          return;
        }
        els.geoBtn.textContent = 'Locating...';
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            els.geoBtn.textContent = '📍 My Area';
            loadWeather({
              label: 'My Local Area',
              stationId: `GPS_${Math.round(pos.coords.latitude * 10)}_${Math.round(pos.coords.longitude * 10)}`,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            });
          },
          () => {
            els.geoBtn.textContent = '📍 My Location';
            alert('Location access was denied or timed out.');
          }
        );
      });
    }

    // City Search
    let searchTimer = null;
    if (els.searchInput && els.searchResults) {
      els.searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const query = els.searchInput.value.trim();
        if (query.length < 2) {
          els.searchResults.classList.remove('is-open');
          return;
        }
        searchTimer = setTimeout(async () => {
          const results = await window.WeatherEngine.searchLocations(query);
          if (results.length) {
            els.searchResults.innerHTML = results.map((r, i) => `
              <button class="ww-search-item" type="button" data-idx="${i}">
                ${r.label}
              </button>
            `).join('');
            els.searchResults.classList.add('is-open');

            els.searchResults.querySelectorAll('.ww-search-item').forEach((item, idx) => {
              item.addEventListener('click', () => {
                loadWeather(results[idx]);
                els.searchResults.classList.remove('is-open');
                els.searchInput.value = results[idx].label;
              });
            });
          } else {
            els.searchResults.classList.remove('is-open');
          }
        }, 350);
      });

      document.addEventListener('click', (e) => {
        if (!els.searchResults.contains(e.target) && e.target !== els.searchInput) {
          els.searchResults.classList.remove('is-open');
        }
      });
    }

    // Driving speed slider
    if (els.speedSlider) {
      els.speedSlider.addEventListener('input', () => {
        drivingSpeed = parseInt(els.speedSlider.value, 10);
        if (els.speedVal) els.speedVal.textContent = `${drivingSpeed} MPH`;
        if (currentWeather) renderDriving(currentWeather);
      });
    }

    // Wardrobe Sandbox sliders
    if (els.sandTemp) els.sandTemp.addEventListener('input', updateWardrobeSandbox);
    if (els.sandRain) els.sandRain.addEventListener('change', updateWardrobeSandbox);
    if (els.sandWind) els.sandWind.addEventListener('change', updateWardrobeSandbox);

    // LCL Cloud Base sliders
    if (els.lclTemp) els.lclTemp.addEventListener('input', updateLclCalc);
    if (els.lclDew) els.lclDew.addEventListener('input', updateLclCalc);
  }

  // ── INIT ────────────────────────────────────────────────────────────────────
  function init() {
    setupEventListeners();
    initFrontSimulator();
    initQuiz();
    updateWardrobeSandbox();
    updateLclCalc();
    loadWeather(activeLocation);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
