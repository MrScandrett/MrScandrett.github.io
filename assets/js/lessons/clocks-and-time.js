/* Interactive labs & practice controller for Clocks & Telling Time
 * Uses pure helpers from window.ClocksTimeMath and visibility-gated loops from window.SimKit.
 */
(function () {
  'use strict';

  var M = window.ClocksTimeMath;
  if (!M) return;

  var svgNS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, text) {
    var node = document.createElementNS(svgNS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) {
          node.setAttribute(k, String(attrs[k]));
        }
      }
    }
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function pointerToClockAngle(svgEl, clientX, clientY) {
    var rect = svgEl.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var rad = Math.atan2(clientX - cx, -(clientY - cy));
    var deg = (rad * 180) / Math.PI;
    return ((deg % 360) + 360) % 360;
  }

  function sectorPath(cx, cy, r, startDeg, sweepDeg) {
    if (sweepDeg <= 0.1) return '';
    if (sweepDeg >= 359.9) {
      return 'M ' + cx + ' ' + (cy - r) +
        ' A ' + r + ' ' + r + ' 0 1 1 ' + (cx - 0.01) + ' ' + (cy - r) + ' Z';
    }
    var a1 = ((startDeg - 90) * Math.PI) / 180;
    var a2 = ((startDeg + sweepDeg - 90) * Math.PI) / 180;
    var x1 = cx + r * Math.cos(a1);
    var y1 = cy + r * Math.sin(a1);
    var x2 = cx + r * Math.cos(a2);
    var y2 = cy + r * Math.sin(a2);
    var largeArc = sweepDeg > 180 ? 1 : 0;
    return 'M ' + cx + ' ' + cy +
      ' L ' + x1.toFixed(2) + ' ' + y1.toFixed(2) +
      ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' Z';
  }

  /* ═══════════════════════════════════════════════════════════
     1. INTERACTIVE CLOCK LABORATORY & ANCIENT TIMEKEEPERS
     ═══════════════════════════════════════════════════════════ */
  var clockLabApi = (function initClockLab() {
    var labEl = document.getElementById('clock-lab');
    if (!labEl) return null;

    var analogFace = document.getElementById('ct-analog-face');
    var analogSvg = document.getElementById('ct-analog-svg');
    var hourHand = document.getElementById('ct-hour-hand');
    var minHand = document.getElementById('ct-min-hand');
    var secHand = document.getElementById('ct-sec-hand');
    var hourHit = document.getElementById('ct-hour-hit');
    var minHit = document.getElementById('ct-min-hit');
    var markerGroup = document.getElementById('ct-hour-markers');
    var fiveMinGroup = document.getElementById('ct-five-min-ring');
    var angleArcsGroup = document.getElementById('ct-angle-arcs');

    var digitalEl = document.getElementById('ct-digital-time');
    var dateEl = document.getElementById('ct-digital-date');
    var wordsMain = document.getElementById('ct-words-main');
    var wordsSub = document.getElementById('ct-words-sub');
    var hrVal = document.getElementById('ct-hr-val');
    var mnVal = document.getElementById('ct-mn-val');
    var scVal = document.getElementById('ct-sc-val');
    var gapVal = document.getElementById('ct-gap-val');

    var badgeEl = document.getElementById('ct-lab-badge');
    var badgeText = document.getElementById('ct-lab-badge-text');

    var modeLiveBtn = document.getElementById('ct-mode-live');
    var modeExploreBtn = document.getElementById('ct-mode-explore');
    var toggle24Btn = document.getElementById('ct-toggle-24h');
    var toggleNumsBtn = document.getElementById('ct-toggle-nums');
    var toggle5MinBtn = document.getElementById('ct-toggle-5min');
    var toggleAnglesBtn = document.getElementById('ct-toggle-angles');
    var toggleSnapBtn = document.getElementById('ct-toggle-snap');

    var pModeBtn = document.getElementById('ct-p-mode');
    var p24Btn = document.getElementById('ct-p-24h');
    var pAnglesBtn = document.getElementById('ct-p-angles');
    var pNowBtn = document.getElementById('ct-p-now');

    var solarControls = document.getElementById('ct-solar-controls');
    var solarSlider = document.getElementById('ct-solar-slider');
    var solarReadout = document.getElementById('ct-solar-readout');
    var solarSyncBtn = document.getElementById('ct-solar-sync');

    var vesselControls = document.getElementById('ct-vessel-controls');
    var vesselFlipBtn = document.getElementById('ct-vessel-flip');
    var vesselPauseBtn = document.getElementById('ct-vessel-pause');
    var vesselDurBtn = document.getElementById('ct-vessel-dur');
    var vesselReadout = document.getElementById('ct-vessel-readout');

    var obeliskSun = document.getElementById('ct-obelisk-sun');
    var obeliskShadow = document.getElementById('ct-obelisk-shadow');
    var oLeftBase = document.getElementById('ct-obelisk-left-base');
    var oLeftTop = document.getElementById('ct-obelisk-left-top');
    var oRightBase = document.getElementById('ct-obelisk-right-base');
    var oRightTop = document.getElementById('ct-obelisk-right-top');

    var sundialSun = document.getElementById('ct-sundial-sun');
    var sundialShadow = document.getElementById('ct-sundial-shadow');
    var sdLeft = document.getElementById('ct-sundial-gnomon-left');
    var sdRight = document.getElementById('ct-sundial-gnomon-right');

    var hgTop = document.getElementById('ct-hg-top-sand');
    var hgBot = document.getElementById('ct-hg-bot-sand');
    var hgStream = document.getElementById('ct-hg-stream');
    var wcTop = document.getElementById('ct-wc-top-water');
    var wcBot = document.getElementById('ct-wc-bot-water');
    var wcDrip = document.getElementById('ct-wc-drip');

    var panels = labEl.querySelectorAll('.ct-clock-panel');
    var dots = labEl.querySelectorAll('.ct-dot');
    var prevBtn = document.getElementById('ct-prev-btn');
    var nextBtn = document.getElementById('ct-next-btn');

    var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var nowInit = new Date();
    var state = {
      live: true,
      use24h: false,
      allNums: false,
      showFiveMin: false,
      showAngles: false,
      snap5m: true,
      activePanel: 0,
      exploreMinutes: nowInit.getHours() * 60 + nowInit.getMinutes(),
      solarOverride: null,
      vesselDurationMs: 60000,
      vesselPaused: false,
      vesselElapsedMs: 0,
      lastFrameTs: null,
      draggingHand: null,
      lastDragMin: null,
      lastDragHour12: null
    };

    window.ctClockLabState = state;

    var hourLabels = [];
    function buildDialMarkers() {
      markerGroup.replaceChildren();
      fiveMinGroup.replaceChildren();
      hourLabels = [];

      for (var i = 0; i < 60; i++) {
        var isHour = i % 5 === 0;
        var angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
        var cx = 100;
        var cy = 100;
        var innerR = isHour ? 83 : 91;
        var outerR = 95;

        markerGroup.appendChild(el('line', {
          x1: (cx + innerR * Math.cos(angle)).toFixed(2),
          y1: (cy + innerR * Math.sin(angle)).toFixed(2),
          x2: (cx + outerR * Math.cos(angle)).toFixed(2),
          y2: (cy + outerR * Math.sin(angle)).toFixed(2),
          stroke: isHour ? (i === 0 ? '#fbbf24' : 'rgba(255,255,255,0.68)') : 'rgba(255,255,255,0.22)',
          'stroke-width': isHour ? '2.4' : '1'
        }));

        if (isHour) {
          var hNum = i === 0 ? 12 : i / 5;
          var labelR = 69;
          var t = el('text', {
            x: (cx + labelR * Math.cos(angle)).toFixed(2),
            y: (cy + labelR * Math.sin(angle)).toFixed(2),
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            fill: 'rgba(241,245,249,0.88)',
            'font-size': [12, 3, 6, 9].indexOf(hNum) !== -1 ? '13.5' : '11',
            'font-family': 'Inter, system-ui, sans-serif',
            'font-weight': '700'
          }, String(hNum));
          t.dataset.cardinal = [12, 3, 6, 9].indexOf(hNum) !== -1 ? '1' : '0';
          hourLabels.push(t);
          markerGroup.appendChild(t);

          var fiveVal = i === 0 ? '60' : String(i).padStart(2, '0');
          var fiveR = 106;
          fiveMinGroup.appendChild(el('text', {
            x: (cx + fiveR * Math.cos(angle)).toFixed(2),
            y: (cy + fiveR * Math.sin(angle)).toFixed(2),
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            fill: '#67e8f9',
            'font-size': '8.2',
            'font-family': 'IBM Plex Mono, monospace',
            'font-weight': '700'
          }, fiveVal));
        }
      }
    }

    function syncDialOptionsUI() {
      hourLabels.forEach(function (lbl) {
        var isCardinal = lbl.dataset.cardinal === '1';
        lbl.style.display = state.allNums || isCardinal ? '' : 'none';
      });
      fiveMinGroup.toggleAttribute('hidden', !state.showFiveMin);
      angleArcsGroup.toggleAttribute('hidden', !state.showAngles);

      modeLiveBtn.setAttribute('aria-pressed', String(state.live));
      modeExploreBtn.setAttribute('aria-pressed', String(!state.live));
      toggle24Btn.setAttribute('aria-pressed', String(state.use24h));
      toggleNumsBtn.setAttribute('aria-pressed', String(state.allNums));
      toggle5MinBtn.setAttribute('aria-pressed', String(state.showFiveMin));
      toggleAnglesBtn.setAttribute('aria-pressed', String(state.showAngles));
      toggleSnapBtn.setAttribute('aria-pressed', String(state.snap5m));

      badgeEl.classList.toggle('is-interactive', !state.live);
      badgeText.textContent = state.live ? 'Live Clock — Your Local Time' : 'Interactive Mode — Drag Hands or Step Time';
      secHand.style.opacity = state.live ? '1' : '0.25';

      if (pModeBtn) {
        pModeBtn.classList.toggle('is-active', !state.live);
        pModeBtn.innerHTML = (state.live ? 'Mode: Live' : 'Mode: Explore') + '<small>Toggle Drag Hands</small>';
      }
      if (p24Btn) {
        p24Btn.classList.toggle('is-active', state.use24h);
        p24Btn.innerHTML = (state.use24h ? 'Format: 24h' : 'Format: 12h') + '<small>Switch 12h / 24h</small>';
      }
      if (pAnglesBtn) {
        pAnglesBtn.classList.toggle('is-active', state.showAngles);
        pAnglesBtn.innerHTML = (state.showAngles ? 'Angles: On' : 'Angles: Off') + '<small>Show Degree Arcs</small>';
      }
    }

    function getCurrentClockParts() {
      if (state.live) {
        var now = new Date();
        return {
          h24: now.getHours(),
          m: now.getMinutes(),
          s: now.getSeconds(),
          ms: now.getMilliseconds(),
          dateObj: now
        };
      }
      var norm = Math.round(M.normalizeMinutesOfDay(state.exploreMinutes));
      return {
        h24: Math.floor(norm / 60),
        m: norm % 60,
        s: 0,
        ms: 0,
        dateObj: new Date()
      };
    }

    function renderAngleArcs(angles) {
      if (!state.showAngles) return;
      angleArcsGroup.replaceChildren();

      var minAngle = angles.minDeg;
      var hrAngle = angles.hourDeg;
      var cwDiff = ((minAngle - hrAngle) + 360) % 360;
      var start = cwDiff <= 180 ? hrAngle : minAngle;
      var sweep = cwDiff <= 180 ? cwDiff : 360 - cwDiff;

      var wedge = el('path', {
        d: sectorPath(100, 100, 46, start, sweep),
        fill: 'rgba(52, 211, 153, 0.2)',
        stroke: 'rgba(52, 211, 153, 0.72)',
        'stroke-width': '1.2'
      });
      angleArcsGroup.appendChild(wedge);

      if (sweep >= 12) {
        var midRad = (((start + sweep / 2) - 90) * Math.PI) / 180;
        var lx = 100 + 31 * Math.cos(midRad);
        var ly = 100 + 31 * Math.sin(midRad);
        angleArcsGroup.appendChild(el('text', {
          x: lx.toFixed(1),
          y: ly.toFixed(1),
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          fill: '#6ee7b7',
          'font-size': '9.5',
          'font-family': 'IBM Plex Mono, monospace',
          'font-weight': '700'
        }, angles.handGapDeg.toFixed(1).replace(/\.0$/, '') + '°'));
      }
    }

    function updateSolarPanels(dayHours) {
      if (obeliskSun && obeliskShadow && oLeftBase) {
        if (dayHours >= 6 && dayHours <= 18) {
          var progress = (dayHours - 6) / 12;
          var sunAngle = Math.PI - progress * Math.PI;
          var sunX = Math.cos(sunAngle) * 45;
          var sunY = 18 - Math.sin(sunAngle) * 55;
          var shadowLen = 35 / Math.max(0.16, Math.sin(sunAngle));
          var shadowX = -Math.cos(sunAngle) * shadowLen;
          var shadowY = 18 - Math.sin(sunAngle) * 8;
          var clampedX = Math.max(-45, Math.min(45, shadowX));

          obeliskSun.setAttribute('cx', sunX.toFixed(2));
          obeliskSun.setAttribute('cy', sunY.toFixed(2));
          obeliskSun.setAttribute('opacity', '1');
          obeliskShadow.setAttribute('points', '-4,18 4,18 ' + clampedX.toFixed(2) + ',' + shadowY.toFixed(2));
          obeliskShadow.setAttribute('opacity', Math.min(1, Math.sin(sunAngle) * 2.5).toFixed(2));

          if (sunAngle > Math.PI / 2) {
            oLeftBase.setAttribute('fill', '#f5e4bc');
            oLeftTop.setAttribute('fill', '#fff8e6');
            oRightBase.setAttribute('fill', '#7c6242');
            oRightTop.setAttribute('fill', '#b89968');
          } else {
            oLeftBase.setAttribute('fill', '#7c6242');
            oLeftTop.setAttribute('fill', '#b89968');
            oRightBase.setAttribute('fill', '#f5e4bc');
            oRightTop.setAttribute('fill', '#fff8e6');
          }
        } else {
          obeliskSun.setAttribute('opacity', '0.15');
          obeliskShadow.setAttribute('opacity', '0');
          oLeftBase.setAttribute('fill', '#334155');
          oLeftTop.setAttribute('fill', '#475569');
          oRightBase.setAttribute('fill', '#334155');
          oRightTop.setAttribute('fill', '#475569');
        }
      }

      if (sundialShadow && sdLeft && sdRight) {
        if (dayHours >= 6 && dayHours <= 18) {
          var sdProgress = (dayHours - 6) / 12;
          var sdAngle = Math.PI - sdProgress * Math.PI;
          var sdLen = 34 / Math.max(0.2, Math.sin(sdAngle));
          var sdShadowX = 50 - Math.cos(sdAngle) * sdLen;
          var sdShadowY = 70 - Math.sin(sdAngle) * 16;

          if (sundialSun) {
            var sdSunX = 50 + Math.cos(sdAngle) * 36;
            var sdSunY = 44 - Math.sin(sdAngle) * 28;
            sundialSun.setAttribute('cx', sdSunX.toFixed(2));
            sundialSun.setAttribute('cy', sdSunY.toFixed(2));
            sundialSun.setAttribute('opacity', '1');
          }

          sundialShadow.setAttribute('points', '47,70 53,70 ' + sdShadowX.toFixed(2) + ',' + sdShadowY.toFixed(2));
          sundialShadow.setAttribute('opacity', Math.min(1, Math.sin(sdAngle) * 2).toFixed(2));

          if (sdAngle > Math.PI / 2) {
            sdLeft.setAttribute('fill', 'url(#ct-sd-gnomon)');
            sdRight.setAttribute('fill', '#6b4827');
          } else {
            sdLeft.setAttribute('fill', '#6b4827');
            sdRight.setAttribute('fill', 'url(#ct-sd-gnomon)');
          }
        } else {
          if (sundialSun) sundialSun.setAttribute('opacity', '0.15');
          sundialShadow.setAttribute('opacity', '0');
          sdLeft.setAttribute('fill', '#334155');
          sdRight.setAttribute('fill', '#475569');
        }
      }
    }

    function updateVessels(deltaMs) {
      if (!state.vesselPaused) {
        state.vesselElapsedMs = (state.vesselElapsedMs + deltaMs) % state.vesselDurationMs;
      }
      var progress = state.vesselElapsedMs / state.vesselDurationMs;
      var secProgress = (state.vesselElapsedMs % 1000) / 1000;

      if (wcTop && wcBot && wcDrip) {
        wcTop.setAttribute('y', (6 + 12 * progress).toFixed(2));
        wcTop.setAttribute('height', (12 * (1 - progress)).toFixed(2));
        wcBot.setAttribute('y', (38 - 12 * progress).toFixed(2));
        wcBot.setAttribute('height', (12 * progress).toFixed(2));
        wcDrip.setAttribute('cy', (18 + 8 * secProgress).toFixed(2));
        wcDrip.setAttribute('opacity', progress > 0.995 ? '0' : (secProgress > 0.9 ? ((1 - secProgress) * 8).toFixed(2) : '0.85'));
      }

      if (hgTop && hgBot && hgStream) {
        hgTop.setAttribute('y', (6 + 13 * progress).toFixed(2));
        hgTop.setAttribute('height', (13 * (1 - progress)).toFixed(2));
        hgBot.setAttribute('y', (34 - 13 * progress).toFixed(2));
        hgBot.setAttribute('height', (13 * progress).toFixed(2));
        hgStream.setAttribute('stroke-dashoffset', String(-(state.vesselElapsedMs / 50).toFixed(2)));
        hgStream.setAttribute('opacity', progress > 0.995 ? '0' : '1');
      }

      if (vesselReadout) {
        var secsNow = Math.floor(state.vesselElapsedMs / 1000);
        var secsMax = Math.round(state.vesselDurationMs / 1000);
        vesselReadout.textContent = secsNow + 's / ' + secsMax + 's';
      }
    }

    function renderFrame(timestamp) {
      if (state.lastFrameTs == null) state.lastFrameTs = timestamp;
      var deltaMs = Math.min(Math.max(0, timestamp - state.lastFrameTs), 100);
      state.lastFrameTs = timestamp;

      var parts = getCurrentClockParts();
      var secTotal = parts.s + parts.ms / 1000;
      var angles = M.clockHandAngles(parts.h24, parts.m, secTotal);

      hourHand.setAttribute('transform', 'rotate(' + angles.hourDeg.toFixed(2) + ', 100, 100)');
      minHand.setAttribute('transform', 'rotate(' + angles.minDeg.toFixed(2) + ', 100, 100)');
      secHand.setAttribute('transform', 'rotate(' + angles.secDeg.toFixed(2) + ', 100, 100)');
      hourHit.setAttribute('transform', 'rotate(' + angles.hourDeg.toFixed(2) + ', 100, 100)');
      minHit.setAttribute('transform', 'rotate(' + angles.minDeg.toFixed(2) + ', 100, 100)');

      renderAngleArcs(angles);

      var timeDisplay = state.use24h
        ? M.formatTime24(parts.h24, parts.m, parts.s, state.live)
        : M.formatTime12(parts.h24, parts.m, parts.s, state.live);
      digitalEl.textContent = timeDisplay;

      var pTime = document.getElementById('ct-p-time');
      if (pTime) pTime.textContent = timeDisplay;
      var pGap = document.getElementById('ct-p-gap');
      if (pGap) pGap.textContent = angles.handGapDeg.toFixed(1).replace(/\.0$/, '') + '°';

      dateEl.textContent = state.live
        ? DAYS[parts.dateObj.getDay()] + ' · ' + MONTHS[parts.dateObj.getMonth()] + ' ' + parts.dateObj.getDate() + ', ' + parts.dateObj.getFullYear()
        : 'Interactive Time · ' + (parts.h24 >= 12 ? 'PM (Afternoon / Evening)' : 'AM (Midnight – Noon)');

      wordsMain.textContent = M.timeToWords(parts.h24, parts.m);
      wordsSub.textContent = (parts.h24 >= 12 ? 'PM' : 'AM') + ' · Hour ' + Math.round(angles.hourDeg) + '° · Min ' + Math.round(angles.minDeg) + '°';

      hrVal.textContent = String(parts.h24 % 12 || 12).padStart(2, '0');
      mnVal.textContent = String(parts.m).padStart(2, '0');
      scVal.textContent = String(parts.s).padStart(2, '0');
      gapVal.textContent = angles.handGapDeg.toFixed(1).replace(/\.0$/, '') + '°';

      var solarHours = state.solarOverride != null
        ? state.solarOverride / 60
        : (parts.h24 + parts.m / 60 + parts.s / 3600);
      updateSolarPanels(solarHours);
      updateVessels(deltaMs);
    }

    function setExploreTime(mins) {
      state.live = false;
      state.exploreMinutes = M.normalizeMinutesOfDay(mins);
      syncDialOptionsUI();
      renderFrame(performance.now());
    }

    function setLiveMode(isLive) {
      state.live = isLive;
      if (!isLive) {
        var now = new Date();
        state.exploreMinutes = now.getHours() * 60 + now.getMinutes();
      }
      syncDialOptionsUI();
      renderFrame(performance.now());
    }

    function applyDragPointer(clientX, clientY) {
      var deg = pointerToClockAngle(analogSvg, clientX, clientY);
      if (state.draggingHand === 'minute') {
        var rawMin = Math.round((deg / 360) * 60) % 60;
        var min = state.snap5m ? (Math.round(rawMin / 5) * 5) % 60 : rawMin;
        var currentH24 = Math.floor(state.exploreMinutes / 60);
        if (state.lastDragMin !== null) {
          var delta = min - state.lastDragMin;
          if (delta < -30) currentH24 = (currentH24 + 1) % 24;
          else if (delta > 30) currentH24 = (currentH24 + 23) % 24;
        }
        state.lastDragMin = min;
        state.exploreMinutes = currentH24 * 60 + min;
      } else if (state.draggingHand === 'hour') {
        var currentM = state.exploreMinutes % 60;
        var isPm = Math.floor(state.exploreMinutes / 60) >= 12;
        var h12 = Math.round(deg / 30) % 12;
        if (state.lastDragHour12 !== null) {
          var hDelta = h12 - state.lastDragHour12;
          if (hDelta < -6 || hDelta > 6) isPm = !isPm;
        }
        state.lastDragHour12 = h12;
        var h24 = (isPm ? 12 : 0) + h12;
        state.exploreMinutes = h24 * 60 + currentM;
      }
      renderFrame(performance.now());
    }

    function startDrag(hand, e) {
      e.preventDefault();
      if (state.live) {
        var now = new Date();
        state.exploreMinutes = now.getHours() * 60 + now.getMinutes();
        state.live = false;
        syncDialOptionsUI();
      }
      state.draggingHand = hand;
      state.lastDragMin = state.exploreMinutes % 60;
      state.lastDragHour12 = Math.floor(state.exploreMinutes / 60) % 12;
      analogFace.classList.add('is-dragging');
      if (e.target.setPointerCapture) {
        try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
      }
      applyDragPointer(e.clientX, e.clientY);
    }

    hourHit.addEventListener('pointerdown', function (e) { startDrag('hour', e); });
    minHit.addEventListener('pointerdown', function (e) { startDrag('minute', e); });

    analogSvg.addEventListener('pointerdown', function (e) {
      if (e.target === hourHit || e.target === minHit) return;
      startDrag('minute', e);
    });

    window.addEventListener('pointermove', function (e) {
      if (!state.draggingHand) return;
      applyDragPointer(e.clientX, e.clientY);
    });

    window.addEventListener('pointerup', function () {
      if (!state.draggingHand) return;
      state.draggingHand = null;
      state.lastDragMin = null;
      state.lastDragHour12 = null;
      analogFace.classList.remove('is-dragging');
    });

    // Toolbar toggles
    modeLiveBtn.addEventListener('click', function () { setLiveMode(true); });
    modeExploreBtn.addEventListener('click', function () { setLiveMode(false); });
    toggle24Btn.addEventListener('click', function () {
      state.use24h = !state.use24h;
      syncDialOptionsUI();
      renderFrame(performance.now());
    });
    toggleNumsBtn.addEventListener('click', function () {
      state.allNums = !state.allNums;
      syncDialOptionsUI();
    });
    toggle5MinBtn.addEventListener('click', function () {
      state.showFiveMin = !state.showFiveMin;
      syncDialOptionsUI();
    });
    toggleAnglesBtn.addEventListener('click', function () {
      state.showAngles = !state.showAngles;
      syncDialOptionsUI();
      renderFrame(performance.now());
    });
    toggleSnapBtn.addEventListener('click', function () {
      state.snap5m = !state.snap5m;
      syncDialOptionsUI();
    });

    // Sidebar mirrors
    if (pModeBtn) pModeBtn.addEventListener('click', function () { setLiveMode(!state.live); });
    if (p24Btn) p24Btn.addEventListener('click', function () { toggle24Btn.click(); });
    if (pAnglesBtn) pAnglesBtn.addEventListener('click', function () { toggleAnglesBtn.click(); });
    if (pNowBtn) pNowBtn.addEventListener('click', function () { setLiveMode(true); });

    // Quick step buttons
    labEl.querySelectorAll('.ct-step-btn[data-step-mins]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var delta = Number(btn.dataset.stepMins);
        var base = state.live ? (new Date().getHours() * 60 + new Date().getMinutes()) : state.exploreMinutes;
        setExploreTime(base + delta);
      });
    });

    var ampmBtn = document.getElementById('ct-toggle-ampm');
    if (ampmBtn) {
      ampmBtn.addEventListener('click', function () {
        var base = state.live ? (new Date().getHours() * 60 + new Date().getMinutes()) : state.exploreMinutes;
        setExploreTime(base + 720);
      });
    }

    var nowBtn = document.getElementById('ct-step-now');
    if (nowBtn) nowBtn.addEventListener('click', function () { setLiveMode(true); });

    // Carousel & Subpanel controls
    function updateSubpanelControls(index) {
      var isSolar = index === 1 || index === 2;
      var isVessel = index === 3 || index === 4;
      if (solarControls) solarControls.hidden = !isSolar;
      if (vesselControls) vesselControls.hidden = !isVessel;

      if (isSolar && state.solarOverride === null) {
        var parts = getCurrentClockParts();
        var minsNow = parts.h24 * 60 + parts.m;
        if (minsNow < 360 || minsNow > 1080) {
          state.solarOverride = 630;
          if (solarSlider) solarSlider.value = '630';
          if (solarReadout) solarReadout.textContent = '10:30 AM (Simulated)';
        } else if (solarSlider && solarReadout) {
          solarSlider.value = String(Math.round(minsNow / 5) * 5);
          solarReadout.textContent = M.formatTime12(parts.h24, parts.m, 0, false);
        }
      }
    }

    function showPanel(index) {
      panels.forEach(function (p) { p.classList.remove('active'); });
      dots.forEach(function (d) { d.classList.remove('active'); });
      panels[index].classList.add('active');
      dots[index].classList.add('active');
      state.activePanel = index;
      updateSubpanelControls(index);
      renderFrame(performance.now());
    }

    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', function () {
        showPanel((state.activePanel - 1 + panels.length) % panels.length);
      });
      nextBtn.addEventListener('click', function () {
        showPanel((state.activePanel + 1) % panels.length);
      });
    }

    dots.forEach(function (dot, index) {
      dot.addEventListener('click', function () { showPanel(index); });
    });

    labEl.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON')) return;
      if (e.key === 'ArrowLeft') showPanel((state.activePanel - 1 + panels.length) % panels.length);
      else if (e.key === 'ArrowRight') showPanel((state.activePanel + 1) % panels.length);
    });

    if (solarSlider) {
      solarSlider.addEventListener('input', function () {
        var mins = parseInt(solarSlider.value, 10);
        state.solarOverride = mins;
        if (solarReadout) {
          solarReadout.textContent = M.formatTime12(Math.floor(mins / 60), mins % 60, 0, false);
        }
        renderFrame(performance.now());
      });
    }

    if (solarSyncBtn) {
      solarSyncBtn.addEventListener('click', function () {
        state.solarOverride = null;
        var parts = getCurrentClockParts();
        if (solarSlider) solarSlider.value = String(Math.max(300, Math.min(1140, parts.h24 * 60 + parts.m)));
        if (solarReadout) solarReadout.textContent = M.formatTime12(parts.h24, parts.m, 0, false);
        renderFrame(performance.now());
      });
    }

    if (vesselFlipBtn) {
      vesselFlipBtn.addEventListener('click', function () {
        state.vesselElapsedMs = 0;
        state.vesselPaused = false;
        if (vesselPauseBtn) vesselPauseBtn.textContent = 'Pause';
        updateVessels(0);
      });
    }

    if (vesselPauseBtn) {
      vesselPauseBtn.addEventListener('click', function () {
        state.vesselPaused = !state.vesselPaused;
        vesselPauseBtn.textContent = state.vesselPaused ? 'Resume' : 'Pause';
      });
    }

    if (vesselDurBtn) {
      vesselDurBtn.addEventListener('click', function () {
        state.vesselDurationMs = state.vesselDurationMs === 60000 ? 15000 : 60000;
        state.vesselElapsedMs = 0;
        vesselDurBtn.textContent = 'Cycle: ' + Math.round(state.vesselDurationMs / 1000) + 's';
        updateVessels(0);
      });
    }

    buildDialMarkers();
    syncDialOptionsUI();
    updateSubpanelControls(0);

    var raf = window.SimKit
      ? window.SimKit.raf(window.SimKit.stage('#clock-lab'))
      : window.requestAnimationFrame.bind(window);

    function loop(ts) {
      renderFrame(ts);
      raf(loop);
    }
    raf(loop);

    return {
      getStartMinutes: function () {
        var p = getCurrentClockParts();
        return p.h24 * 60 + p.m;
      }
    };
  })();

  /* ═══════════════════════════════════════════════════════════
     2. ELAPSED TIME OPEN NUMBER LINE VISUALIZER
     ═══════════════════════════════════════════════════════════ */
  (function initElapsedVisualizer() {
    var startInput = document.getElementById('ct-elapsed-start');
    var endInput = document.getElementById('ct-elapsed-end');
    var svg = document.getElementById('ct-elapsed-svg');
    var dial = document.getElementById('ct-elapsed-dial');
    var summaryEl = document.getElementById('ct-elapsed-summary');
    var fromLabBtn = document.getElementById('ct-elapsed-from-lab');
    var presetBtns = document.querySelectorAll('[data-elapsed-start]');

    if (!startInput || !endInput || !svg || !dial || !summaryEl) return;

    function parseInputMins(val) {
      var parts = String(val || '00:00').split(':');
      return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    }

    function fmtTick(mins) {
      var norm = M.normalizeMinutesOfDay(mins);
      return M.formatTime12(Math.floor(norm / 60), norm % 60, 0, false);
    }

    function renderDial(elapsed) {
      dial.replaceChildren();
      dial.appendChild(el('circle', {
        cx: 60, cy: 60, r: 52,
        fill: 'rgba(59,130,246,0.06)',
        stroke: 'rgba(59,130,246,0.35)',
        'stroke-width': 2
      }));

      var startDeg = (elapsed.start % 60) * 6;
      var sweepDeg = Math.min(360, elapsed.totalMinutes * 6);
      if (sweepDeg > 0) {
        dial.appendChild(el('path', {
          d: sectorPath(60, 60, 44, startDeg, sweepDeg),
          fill: elapsed.totalMinutes >= 60 ? 'rgba(139,92,246,0.22)' : 'rgba(59,130,246,0.24)',
          stroke: elapsed.totalMinutes >= 60 ? '#7c3aed' : '#2563eb',
          'stroke-width': 1.5
        }));
      }

      for (var i = 0; i < 12; i++) {
        var a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        dial.appendChild(el('line', {
          x1: (60 + 46 * Math.cos(a)).toFixed(1),
          y1: (60 + 46 * Math.sin(a)).toFixed(1),
          x2: (60 + 51 * Math.cos(a)).toFixed(1),
          y2: (60 + 51 * Math.sin(a)).toFixed(1),
          stroke: 'currentColor',
          opacity: 0.45,
          'stroke-width': 1.5
        }));
      }

      dial.appendChild(el('text', {
        x: 60, y: 58,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        fill: 'currentColor',
        'font-family': 'IBM Plex Mono, monospace',
        'font-size': 12,
        'font-weight': 700
      }, elapsed.hours + 'h ' + elapsed.minutes + 'm'));

      dial.appendChild(el('text', {
        x: 60, y: 74,
        'text-anchor': 'middle',
        fill: 'currentColor',
        opacity: 0.7,
        'font-family': 'IBM Plex Mono, monospace',
        'font-size': 8.5
      }, elapsed.totalMinutes + ' min'));
    }

    function render() {
      var sMins = parseInputMins(startInput.value);
      var eMins = parseInputMins(endInput.value);
      var data = M.computeElapsedTime(sMins, eMins);

      svg.replaceChildren();
      var leftX = 48;
      var rightX = 592;
      var baseY = 98;

      svg.appendChild(el('line', {
        x1: leftX, y1: baseY, x2: rightX, y2: baseY,
        stroke: 'currentColor', opacity: 0.35, 'stroke-width': 2.5, 'stroke-linecap': 'round'
      }));

      if (data.totalMinutes === 0) {
        svg.appendChild(el('circle', { cx: 320, cy: baseY, r: 5, fill: '#2563eb' }));
        svg.appendChild(el('text', {
          x: 320, y: 54, 'text-anchor': 'middle', fill: 'currentColor',
          'font-family': 'IBM Plex Mono, monospace', 'font-size': 12, 'font-weight': 700
        }, 'Start and end are the exact same time (0 minutes)'));
        renderDial(data);
        summaryEl.textContent = '0 minutes elapsed — change the start or end time to see jump arcs.';
        return;
      }

      var palette = {
        hill: { color: '#0284c7', height: 34, name: 'Hill' },
        mountain: { color: '#7c3aed', height: 54, name: 'Mountain' },
        rock: { color: '#16a34a', height: 24, name: 'Rock' }
      };

      var total = data.totalMinutes;
      var spanW = rightX - leftX;

      // Draw jump arcs
      data.jumps.forEach(function (j, idx) {
        var x1 = leftX + ((j.from - data.start) / total) * spanW;
        var x2 = leftX + ((j.to - data.start) / total) * spanW;
        var midX = (x1 + x2) / 2;
        var style = palette[j.kind] || palette.rock;
        var ctrlY = baseY - style.height * 1.45;

        svg.appendChild(el('path', {
          d: 'M ' + x1.toFixed(1) + ' ' + baseY + ' Q ' + midX.toFixed(1) + ' ' + ctrlY.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + baseY,
          fill: 'none',
          stroke: style.color,
          'stroke-width': 3,
          'stroke-linecap': 'round'
        }));

        var labelY = Math.max(16, baseY - style.height - 6 - (idx % 2 === 1 && (x2 - x1) < 60 ? 10 : 0));
        svg.appendChild(el('text', {
          x: midX.toFixed(1),
          y: labelY.toFixed(1),
          'text-anchor': 'middle',
          fill: style.color,
          'font-family': 'IBM Plex Mono, monospace',
          'font-size': 11,
          'font-weight': 700
        }, j.label));

        if (idx === 0) {
          svg.appendChild(el('circle', { cx: x1.toFixed(1), cy: baseY, r: 4.5, fill: '#2563eb' }));
          svg.appendChild(el('text', {
            x: x1.toFixed(1), y: baseY + 20, 'text-anchor': 'middle', fill: 'currentColor',
            'font-family': 'IBM Plex Mono, monospace', 'font-size': 10, 'font-weight': 700
          }, fmtTick(j.from)));
        }

        svg.appendChild(el('circle', { cx: x2.toFixed(1), cy: baseY, r: 4.5, fill: style.color }));
        // Skip crowded intermediate tick labels if very narrow
        var isLast = idx === data.jumps.length - 1;
        if (isLast || (x2 - x1) >= 68) {
          svg.appendChild(el('text', {
            x: x2.toFixed(1),
            y: baseY + (idx % 2 === 1 && !isLast ? 31 : 20),
            'text-anchor': 'middle',
            fill: 'currentColor',
            'font-family': 'IBM Plex Mono, monospace',
            'font-size': 10,
            'font-weight': isLast ? 700 : 500
          }, fmtTick(j.to)));
        }
      });

      renderDial(data);

      var breakdown = data.jumps.map(function (j) {
        return fmtTick(j.from) + ' → ' + fmtTick(j.to) + ' (' + j.label + ')';
      }).join(' · ');

      summaryEl.innerHTML =
        '<strong>Total elapsed: ' + data.hours + ' hr' + (data.hours === 1 ? '' : 's') + ' ' +
        data.minutes + ' min (' + data.totalMinutes + ' minutes)</strong>' +
        (data.crossedMidnight ? ' <em>[crosses midnight]</em>' : '') +
        '<br>' + breakdown;
    }

    presetBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        presetBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        startInput.value = btn.dataset.elapsedStart;
        endInput.value = btn.dataset.elapsedEnd;
        render();
      });
    });

    function clearPresets() {
      presetBtns.forEach(function (b) { b.classList.remove('is-active'); });
      render();
    }

    startInput.addEventListener('input', clearPresets);
    endInput.addEventListener('input', clearPresets);

    if (fromLabBtn && clockLabApi) {
      fromLabBtn.addEventListener('click', function () {
        var m = clockLabApi.getStartMinutes();
        startInput.value = M.formatTime24(Math.floor(m / 60), m % 60, 0, false);
        clearPresets();
      });
    }

    render();
  })();

  /* ═══════════════════════════════════════════════════════════
     3. READ & SET THE CLOCK CHALLENGE TRAINER
     ═══════════════════════════════════════════════════════════ */
  (function initClockTrainer() {
    var root = document.getElementById('ct-clock-trainer');
    if (!root) return;

    var trSvg = document.getElementById('ct-tr-svg');
    var trMarks = document.getElementById('ct-tr-marks');
    var trHr = document.getElementById('ct-tr-hr');
    var trMn = document.getElementById('ct-tr-mn');
    var trMinHit = document.getElementById('ct-tr-min-hit');
    var promptEl = document.getElementById('ct-tr-prompt');
    var readWrap = document.getElementById('ct-tr-read-wrap');
    var setWrap = document.getElementById('ct-tr-set-wrap');
    var readInput = document.getElementById('ct-tr-input');
    var checkReadBtn = document.getElementById('ct-tr-check-read');
    var checkSetBtn = document.getElementById('ct-tr-check-set');
    var newBtn = document.getElementById('ct-tr-new');
    var hintBtn = document.getElementById('ct-tr-hint-btn');
    var statusEl = document.getElementById('ct-tr-status');
    var streakEl = document.getElementById('ct-tr-streak');
    var modeReadBtn = document.getElementById('ct-tr-mode-read');
    var modeSetBtn = document.getElementById('ct-tr-mode-set');
    var diffBtns = root.querySelectorAll('[data-tr-diff]');

    for (var i = 0; i < 60; i++) {
      var isHour = i % 5 === 0;
      var a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      trMarks.appendChild(el('line', {
        x1: (80 + (isHour ? 64 : 69) * Math.cos(a)).toFixed(1),
        y1: (80 + (isHour ? 64 : 69) * Math.sin(a)).toFixed(1),
        x2: (80 + 73 * Math.cos(a)).toFixed(1),
        y2: (80 + 73 * Math.sin(a)).toFixed(1),
        stroke: 'currentColor',
        opacity: isHour ? 0.75 : 0.25,
        'stroke-width': isHour ? 2 : 1
      }));
      if (isHour) {
        var n = i === 0 ? 12 : i / 5;
        trMarks.appendChild(el('text', {
          x: (80 + 53 * Math.cos(a)).toFixed(1),
          y: (80 + 53 * Math.sin(a)).toFixed(1),
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          fill: 'currentColor',
          'font-size': 11,
          'font-weight': 700
        }, String(n)));
      }
    }

    var state = {
      mode: 'read',
      diff: 'half',
      targetH: 3,
      targetM: 30,
      userMins: 12 * 60,
      streak: 0,
      dragging: false,
      lastDragMin: null
    };

    function drawTrainerHands(h12, m) {
      var ang = M.clockHandAngles(h12, m, 0);
      trHr.setAttribute('transform', 'rotate(' + ang.hourDeg.toFixed(2) + ', 80, 80)');
      trMn.setAttribute('transform', 'rotate(' + ang.minDeg.toFixed(2) + ', 80, 80)');
      trMinHit.setAttribute('transform', 'rotate(' + ang.minDeg.toFixed(2) + ', 80, 80)');
    }

    function randomChallenge() {
      var h = Math.floor(Math.random() * 12) + 1;
      var m = 0;
      if (state.diff === 'half') m = Math.random() < 0.5 ? 0 : 30;
      else if (state.diff === 'five') m = Math.floor(Math.random() * 12) * 5;
      else m = Math.floor(Math.random() * 60);

      state.targetH = h;
      state.targetM = m;
      state.userMins = 12 * 60;
      statusEl.textContent = '';
      statusEl.className = 'ct-trainer-status';
      if (readInput) readInput.value = '';

      if (state.mode === 'read') {
        promptEl.textContent = 'What time is shown on this clock?';
        drawTrainerHands(state.targetH, state.targetM);
      } else {
        var padded = state.targetH + ':' + String(state.targetM).padStart(2, '0');
        promptEl.textContent = 'Set the hands to ' + padded + ' (' + M.timeToWords(state.targetH, state.targetM) + ')';
        drawTrainerHands(12, 0);
      }
    }

    function setMode(mode) {
      state.mode = mode;
      modeReadBtn.classList.toggle('is-active', mode === 'read');
      modeReadBtn.setAttribute('aria-pressed', String(mode === 'read'));
      modeSetBtn.classList.toggle('is-active', mode === 'set');
      modeSetBtn.setAttribute('aria-pressed', String(mode === 'set'));
      readWrap.hidden = mode !== 'read';
      setWrap.hidden = mode !== 'set';
      randomChallenge();
    }

    modeReadBtn.addEventListener('click', function () { setMode('read'); });
    modeSetBtn.addEventListener('click', function () { setMode('set'); });

    diffBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        diffBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        state.diff = btn.dataset.trDiff;
        randomChallenge();
      });
    });

    function markResult(ok, msg) {
      if (ok) {
        state.streak += 1;
        statusEl.textContent = '✓ ' + msg;
        statusEl.className = 'ct-trainer-status is-ok';
      } else {
        state.streak = 0;
        statusEl.textContent = '✕ ' + msg;
        statusEl.className = 'ct-trainer-status is-err';
      }
      streakEl.textContent = 'Streak: ' + state.streak;
    }

    checkReadBtn.addEventListener('click', function () {
      var parsed = M.parsePracticeAnswer(readInput.value, 'clock');
      var expected = state.targetH + state.targetM / 60;
      if (Number.isNaN(parsed)) {
        markResult(false, 'Enter time like 3:30 or 12:05');
        return;
      }
      if (Math.abs(parsed - expected) < 0.005) {
        markResult(true, 'Exact! ' + state.targetH + ':' + String(state.targetM).padStart(2, '0'));
      } else {
        markResult(false, 'Not quite — check where the short hour hand sits.');
      }
    });

    readInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') checkReadBtn.click();
    });

    root.querySelectorAll('[data-tr-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.mode !== 'set') return;
        state.userMins = ((state.userMins + Number(btn.dataset.trStep)) % 720 + 720) % 720;
        drawTrainerHands(Math.floor(state.userMins / 60) || 12, state.userMins % 60);
      });
    });

    trSvg.addEventListener('pointerdown', function (e) {
      if (state.mode !== 'set') return;
      e.preventDefault();
      state.dragging = true;
      state.lastDragMin = state.userMins % 60;
      if (trSvg.setPointerCapture) {
        try { trSvg.setPointerCapture(e.pointerId); } catch (_) {}
      }
    });

    window.addEventListener('pointermove', function (e) {
      if (!state.dragging || state.mode !== 'set') return;
      var deg = pointerToClockAngle(trSvg, e.clientX, e.clientY);
      var rawM = Math.round((deg / 360) * 60) % 60;
      var m = state.diff === 'exact' ? rawM : (Math.round(rawM / 5) * 5) % 60;
      var h = Math.floor(state.userMins / 60);
      if (state.lastDragMin !== null) {
        var d = m - state.lastDragMin;
        if (d < -30) h = (h + 1) % 12;
        else if (d > 30) h = (h + 11) % 12;
      }
      state.lastDragMin = m;
      state.userMins = h * 60 + m;
      drawTrainerHands(h || 12, m);
    });

    window.addEventListener('pointerup', function () {
      state.dragging = false;
      state.lastDragMin = null;
    });

    checkSetBtn.addEventListener('click', function () {
      var uH = Math.floor(state.userMins / 60) % 12 || 12;
      var uM = state.userMins % 60;
      if (uH === state.targetH && uM === state.targetM) {
        markResult(true, 'Right on target!');
      } else {
        markResult(false, 'Hands are at ' + uH + ':' + String(uM).padStart(2, '0') + '. Try again!');
      }
    });

    newBtn.addEventListener('click', randomChallenge);
    hintBtn.addEventListener('click', function () {
      var countFive = Math.floor(state.targetM / 5);
      statusEl.className = 'ct-trainer-status';
      statusEl.textContent = 'Hint: Hour ' + state.targetH + ', minute hand is at ' + countFive + '×5 = ' + state.targetM + ' min.';
    });

    randomChallenge();
  })();

  /* ═══════════════════════════════════════════════════════════
     4. WORLD TIME ZONES, SOLAR TERMINATOR & CITY COMPARATOR
     ═══════════════════════════════════════════════════════════ */
  (function initWorldTimeZones() {
    var markerLayer = document.getElementById('ct-city-markers');
    var highlight = document.getElementById('ct-tz-highlight');
    var nightOverlay = document.getElementById('ct-night-overlay');
    var subsolarGroup = document.getElementById('ct-subsolar-marker');
    var tzSlider = document.getElementById('ct-tz-slider');
    var utcReadout = document.getElementById('ct-tz-utc-readout');
    var liveBtn = document.getElementById('ct-tz-live-btn');
    var cmpAEl = document.getElementById('ct-cmp-a');
    var cmpBEl = document.getElementById('ct-cmp-b');
    var cmpDiffEl = document.getElementById('ct-cmp-diff');
    var cmpSwapBtn = document.getElementById('ct-cmp-swap');

    if (!markerLayer || !highlight) return;

    function city(name, code, lat, lon, timeZone) {
      return { name: name, code: code, lat: lat, lon: lon, timeZone: timeZone };
    }

    var regionData = {
      americas: {
        name: 'Americas — Local Times',
        cities: [
          city('Los Angeles', 'LAX', 34.0522, -118.2437, 'America/Los_Angeles'),
          city('Denver', 'DEN', 39.7392, -104.9903, 'America/Denver'),
          city('Chicago', 'CHI', 41.8781, -87.6298, 'America/Chicago'),
          city('New York', 'NYC', 40.7128, -74.0060, 'America/New_York'),
          city('Toronto', 'YYZ', 43.6532, -79.3832, 'America/Toronto'),
          city('São Paulo', 'SAO', -23.5505, -46.6333, 'America/Sao_Paulo'),
          city('Buenos Aires', 'BUE', -34.6037, -58.3816, 'America/Argentina/Buenos_Aires'),
          city('Anchorage', 'ANC', 61.2181, -149.9003, 'America/Anchorage'),
          city('Honolulu', 'HNL', 21.3069, -157.8583, 'Pacific/Honolulu')
        ]
      },
      europe: {
        name: 'Europe & Africa — Local Times',
        cities: [
          city('London', 'LON', 51.5074, -0.1278, 'Europe/London'),
          city('Paris', 'PAR', 48.8566, 2.3522, 'Europe/Paris'),
          city('Berlin', 'BER', 52.5200, 13.4050, 'Europe/Berlin'),
          city('Madrid', 'MAD', 40.4168, -3.7038, 'Europe/Madrid'),
          city('Rome', 'ROM', 41.9028, 12.4964, 'Europe/Rome'),
          city('Cairo', 'CAI', 30.0444, 31.2357, 'Africa/Cairo'),
          city('Lagos', 'LOS', 6.5244, 3.3792, 'Africa/Lagos'),
          city('Nairobi', 'NBO', -1.2921, 36.8219, 'Africa/Nairobi'),
          city('Cape Town', 'CPT', -33.9249, 18.4241, 'Africa/Johannesburg')
        ]
      },
      middleeast: {
        name: 'Middle East — Local Times',
        cities: [
          city('Jerusalem', 'JRS', 31.7683, 35.2137, 'Asia/Jerusalem'),
          city('Riyadh', 'RUH', 24.7136, 46.6753, 'Asia/Riyadh'),
          city('Dubai', 'DXB', 25.2048, 55.2708, 'Asia/Dubai'),
          city('Tehran', 'THR', 35.6892, 51.3890, 'Asia/Tehran'),
          city('Baghdad', 'BGW', 33.3152, 44.3661, 'Asia/Baghdad'),
          city('Istanbul', 'IST', 41.0082, 28.9784, 'Europe/Istanbul')
        ]
      },
      asia: {
        name: 'South & Central Asia — Local Times',
        cities: [
          city('Karachi', 'KHI', 24.8607, 67.0011, 'Asia/Karachi'),
          city('Mumbai', 'BOM', 19.0760, 72.8777, 'Asia/Kolkata'),
          city('New Delhi', 'DEL', 28.6139, 77.2090, 'Asia/Kolkata'),
          city('Kathmandu', 'KTM', 27.7172, 85.3240, 'Asia/Kathmandu'),
          city('Dhaka', 'DAC', 23.8103, 90.4125, 'Asia/Dhaka'),
          city('Colombo', 'CMB', 6.9271, 79.8612, 'Asia/Colombo'),
          city('Tashkent', 'TAS', 41.2995, 69.2401, 'Asia/Tashkent')
        ]
      },
      east_asia: {
        name: 'East & Southeast Asia — Local Times',
        cities: [
          city('Bangkok', 'BKK', 13.7563, 100.5018, 'Asia/Bangkok'),
          city('Singapore', 'SIN', 1.3521, 103.8198, 'Asia/Singapore'),
          city('Beijing', 'PEK', 39.9042, 116.4074, 'Asia/Shanghai'),
          city('Hong Kong', 'HKG', 22.3193, 114.1694, 'Asia/Hong_Kong'),
          city('Seoul', 'SEL', 37.5665, 126.9780, 'Asia/Seoul'),
          city('Tokyo', 'TYO', 35.6762, 139.6503, 'Asia/Tokyo'),
          city('Manila', 'MNL', 14.5995, 120.9842, 'Asia/Manila'),
          city('Jakarta', 'JKT', -6.2088, 106.8456, 'Asia/Jakarta')
        ]
      },
      australia: {
        name: 'Australia & Pacific — Local Times',
        cities: [
          city('Perth', 'PER', -31.9523, 115.8613, 'Australia/Perth'),
          city('Darwin', 'DRW', -12.4634, 130.8456, 'Australia/Darwin'),
          city('Adelaide', 'ADL', -34.9285, 138.6007, 'Australia/Adelaide'),
          city('Sydney', 'SYD', -33.8688, 151.2093, 'Australia/Sydney'),
          city('Auckland', 'AKL', -36.8509, 174.7645, 'Pacific/Auckland'),
          city('Suva, Fiji', 'SUV', -18.1248, 178.4501, 'Pacific/Fiji'),
          city('Honolulu', 'HNL', 21.3069, -157.8583, 'Pacific/Honolulu')
        ]
      }
    };

    var allCities = [];
    Object.keys(regionData).forEach(function (k) {
      regionData[k].cities.forEach(function (c) {
        if (!allCities.some(function (x) { return x.name === c.name; })) allCities.push(c);
      });
    });

    var activeRegion = 'americas';
    var customUtcMins = null;
    var cityA = allCities.find(function (c) { return c.name === 'New York'; });
    var cityB = allCities.find(function (c) { return c.name === 'London'; });
    var nextSlot = 'A';

    function getReferenceDate() {
      var now = new Date();
      if (customUtcMins === null) return now;
      return new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        Math.floor(customUtcMins / 60),
        customUtcMins % 60,
        0
      ));
    }

    function project(lat, lon) {
      return {
        x: ((lon + 180) / 360) * 800,
        y: ((90 - lat) / 180) * 400
      };
    }

    function timeFor(timeZone, refDate) {
      return new Intl.DateTimeFormat([], {
        timeZone: timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).format(refDate);
    }

    function offsetMinutesFor(timeZone, refDate) {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(refDate);
      var map = {};
      parts.forEach(function (p) { map[p.type] = p.value; });
      var localUtcMs = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(map.hour) % 24, Number(map.minute));
      var refNoSec = Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate(), refDate.getUTCHours(), refDate.getUTCMinutes());
      return Math.round((localUtcMs - refNoSec) / 60000);
    }

    function offsetFor(timeZone, refDate) {
      var part = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone,
        timeZoneName: 'shortOffset'
      }).formatToParts(refDate).find(function (item) { return item.type === 'timeZoneName'; });
      return (part ? part.value : 'UTC').replace('GMT', 'UTC');
    }

    function rowId(name) {
      return 'ct-city-' + name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    }

    function updateTerminator(refDate) {
      if (!nightOverlay || !subsolarGroup) return;
      var term = M.solarTerminatorPath(refDate, 800, 400);
      nightOverlay.setAttribute('d', term.pathD);
      subsolarGroup.replaceChildren(
        el('circle', { cx: term.subsolar.x.toFixed(1), cy: term.subsolar.y.toFixed(1), r: 10, fill: 'rgba(251,191,36,0.2)' }),
        el('circle', { cx: term.subsolar.x.toFixed(1), cy: term.subsolar.y.toFixed(1), r: 4.2, fill: '#fde68a', stroke: '#f59e0b', 'stroke-width': 1.2 }),
        el('text', {
          x: term.subsolar.x.toFixed(1),
          y: Math.max(14, term.subsolar.y - 10).toFixed(1),
          'text-anchor': 'middle',
          fill: '#fde68a',
          'font-family': 'IBM Plex Mono, monospace',
          'font-size': 6.5,
          'font-weight': 700
        }, 'SOLAR NOON')
      );
    }

    function updateCompare(refDate) {
      if (!cmpAEl || !cmpBEl || !cmpDiffEl || !cityA || !cityB) return;
      var tA = timeFor(cityA.timeZone, refDate);
      var tB = timeFor(cityB.timeZone, refDate);
      var offA = offsetMinutesFor(cityA.timeZone, refDate);
      var offB = offsetMinutesFor(cityB.timeZone, refDate);
      var diffMins = offB - offA;
      var absHrs = Math.abs(diffMins) / 60;
      var hrStr = Number.isInteger(absHrs) ? String(absHrs) : absHrs.toFixed(2).replace(/\.?0+$/, '');
      var dirStr = diffMins === 0 ? 'Same clock time' : (diffMins > 0 ? hrStr + 'h ahead' : hrStr + 'h behind');

      var dayA = new Intl.DateTimeFormat('en-CA', { timeZone: cityA.timeZone }).format(refDate);
      var dayB = new Intl.DateTimeFormat('en-CA', { timeZone: cityB.timeZone }).format(refDate);
      var dayTag = dayA === dayB ? 'Same date' : (dayB > dayA ? '+1 day' : '−1 day');

      cmpAEl.textContent = cityA.name + ' (' + tA + ')';
      cmpBEl.textContent = cityB.name + ' (' + tB + ')';
      cmpDiffEl.textContent = dirStr + ' · ' + dayTag;

      document.querySelectorAll('.ct-city-row').forEach(function (r) {
        r.classList.toggle('is-city-a', r.dataset.city === cityA.name);
        r.classList.toggle('is-city-b', r.dataset.city === cityB.name);
      });
      markerLayer.querySelectorAll('.ct-city-marker').forEach(function (g) {
        g.classList.toggle('is-city-a', g.dataset.city === cityA.name);
        g.classList.toggle('is-city-b', g.dataset.city === cityB.name);
      });
    }

    function selectCityForCompare(item) {
      if (nextSlot === 'A') {
        cityA = item;
        nextSlot = 'B';
      } else {
        cityB = item;
        nextSlot = 'A';
      }
      updateCompare(getReferenceDate());
    }

    function setActiveCity(name, active) {
      var row = document.getElementById(rowId(name));
      if (row) row.classList.toggle('is-map-active', active);
    }

    function renderMarkers(cities, refDate) {
      markerLayer.replaceChildren();
      var labelOffsets = [[8, -7], [8, 12], [-8, -7], [-8, 12], [0, -12], [0, 15]];

      cities.forEach(function (item, index) {
        var point = project(item.lat, item.lon);
        var offset = labelOffsets[index % labelOffsets.length];
        var group = el('g', {
          class: 'ct-city-marker',
          transform: 'translate(' + point.x.toFixed(2) + ' ' + point.y.toFixed(2) + ')',
          tabindex: '0',
          role: 'button',
          'aria-label': item.name + ', click to compare'
        });
        group.dataset.city = item.name;

        var title = el('title', null, item.name + ' · ' + timeFor(item.timeZone, refDate) + ' · ' + offsetFor(item.timeZone, refDate));
        var halo = el('circle', { class: 'marker-halo', r: '6' });
        var core = el('circle', { class: 'marker-core', r: '2.7' });
        var label = el('text', {
          class: 'marker-label',
          x: offset[0],
          y: offset[1],
          'text-anchor': offset[0] < 0 ? 'end' : offset[0] === 0 ? 'middle' : 'start'
        }, item.code);

        group.append(title, halo, core, label);
        group.addEventListener('mouseenter', function () { setActiveCity(item.name, true); });
        group.addEventListener('mouseleave', function () { setActiveCity(item.name, false); });
        group.addEventListener('focus', function () { setActiveCity(item.name, true); });
        group.addEventListener('blur', function () { setActiveCity(item.name, false); });
        group.addEventListener('click', function () { selectCityForCompare(item); });
        group.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectCityForCompare(item);
          }
        });
        markerLayer.appendChild(group);
      });
    }

    function renderHighlight(cities) {
      var longitudes = cities.map(function (item) { return item.lon; });
      if (activeRegion === 'australia') longitudes = longitudes.filter(function (lon) { return lon > 0; });
      var minX = project(0, Math.min.apply(null, longitudes)).x;
      var maxX = project(0, Math.max.apply(null, longitudes)).x;
      var clampedX = Math.max(0, minX - 14);
      var clampedW = Math.min(800 - clampedX, maxX - minX + 28);
      highlight.setAttribute('x', clampedX.toFixed(2));
      highlight.setAttribute('width', Math.max(20, clampedW).toFixed(2));
      highlight.setAttribute('opacity', '1');
    }

    function renderRegion(key) {
      var data = regionData[key];
      if (!data) return;
      activeRegion = key;
      var refDate = getReferenceDate();
      document.getElementById('ct-tz-region-name').textContent = data.name;
      var container = document.getElementById('ct-tz-cities');
      container.replaceChildren();

      data.cities.forEach(function (item) {
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'ct-city-row';
        row.id = rowId(item.name);
        row.dataset.city = item.name;
        row.innerHTML =
          '<span class="city-name">' + item.name + '</span>' +
          '<span class="city-clock">' +
            '<span class="city-offset">' + offsetFor(item.timeZone, refDate) + '</span>' +
            '<span class="city-time" data-zone="' + item.timeZone + '">' + timeFor(item.timeZone, refDate) + '</span>' +
          '</span>';
        row.addEventListener('click', function () { selectCityForCompare(item); });
        container.appendChild(row);
      });

      renderMarkers(data.cities, refDate);
      renderHighlight(data.cities);
      updateTerminator(refDate);
      updateCompare(refDate);
    }

    function updateAllTimes() {
      var refDate = getReferenceDate();
      document.querySelectorAll('.city-time[data-zone]').forEach(function (elTime) {
        elTime.textContent = timeFor(elTime.dataset.zone, refDate);
      });
      var data = regionData[activeRegion];
      if (data) {
        var titles = markerLayer.querySelectorAll('title');
        titles.forEach(function (title, idx) {
          var item = data.cities[idx];
          if (item) title.textContent = item.name + ' · ' + timeFor(item.timeZone, refDate) + ' · ' + offsetFor(item.timeZone, refDate);
        });
      }
      if (utcReadout) {
        utcReadout.textContent = customUtcMins === null
          ? 'Live ' + M.formatTime24(refDate.getUTCHours(), refDate.getUTCMinutes(), 0, false) + ' UTC'
          : 'Simulated ' + M.formatTime24(Math.floor(customUtcMins / 60), customUtcMins % 60, 0, false) + ' UTC';
      }
      updateTerminator(refDate);
      updateCompare(refDate);
    }

    if (tzSlider) {
      var nowUtc = new Date();
      tzSlider.value = String(Math.floor((nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes()) / 15) * 15);
      tzSlider.addEventListener('input', function () {
        customUtcMins = parseInt(tzSlider.value, 10);
        updateAllTimes();
      });
    }

    if (liveBtn) {
      liveBtn.addEventListener('click', function () {
        customUtcMins = null;
        var nowUtc = new Date();
        if (tzSlider) tzSlider.value = String(Math.floor((nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes()) / 15) * 15);
        updateAllTimes();
      });
    }

    if (cmpSwapBtn) {
      cmpSwapBtn.addEventListener('click', function () {
        var tmp = cityA;
        cityA = cityB;
        cityB = tmp;
        updateCompare(getReferenceDate());
      });
    }

    document.querySelectorAll('.ct-tz-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.ct-tz-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderRegion(btn.dataset.region);
      });
    });

    renderRegion('americas');
    updateAllTimes();
    window.setInterval(function () {
      if (customUtcMins === null) updateAllTimes();
    }, 30000);
  })();

  /* ═══════════════════════════════════════════════════════════
     5. RELATIVITY, TWIN CLOCKS & LORENTZ CURVE
     ═══════════════════════════════════════════════════════════ */
  (function initTimeDilation() {
    var speedSlider = document.getElementById('ct-speed-slider');
    var shipTimeSlider = document.getElementById('ct-ship-time-slider');
    var speedVal = document.getElementById('ct-speed-val');
    var shipTimeVal = document.getElementById('ct-ship-time-val');
    var resSpeed = document.getElementById('ct-res-speed');
    var resGamma = document.getElementById('ct-res-gamma');
    var resShip = document.getElementById('ct-res-ship');
    var resEarth = document.getElementById('ct-res-earth');
    var warning = document.getElementById('ct-dil-warning');

    var earthHand = document.getElementById('ct-earth-dial-hand');
    var shipHand = document.getElementById('ct-ship-dial-hand');
    var twinEarthVal = document.getElementById('ct-twin-earth-val');
    var twinShipVal = document.getElementById('ct-twin-ship-val');
    var lorentzPath = document.getElementById('ct-lorentz-path');
    var lorentzDot = document.getElementById('ct-lorentz-dot');
    var lorentzLabel = document.getElementById('ct-lorentz-label');
    var relChips = document.querySelectorAll('.ct-rel-chip');

    if (!speedSlider || !shipTimeSlider) return;

    var currentShipRate = 0.995;

    function buildLorentzCurve() {
      if (!lorentzPath) return;
      var pts = [];
      for (var p = 0; p <= 99.9; p += 1.5) {
        var b = p / 100;
        var g = Math.min(11, M.lorentzFactor(b));
        var x = 34 + (p / 100) * 272;
        var y = 126 - ((g - 1) / 10) * 112;
        pts.push((p === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1));
      }
      var g99 = Math.min(11, M.lorentzFactor(0.999));
      pts.push('L305.7,' + (126 - ((g99 - 1) / 10) * 112).toFixed(1));
      lorentzPath.setAttribute('d', pts.join(' '));
    }

    function update() {
      var pct = parseInt(speedSlider.value, 10) / 10;
      var shipYrs = parseInt(shipTimeSlider.value, 10);
      var beta = pct / 100;
      var res = M.timeDilation(beta, shipYrs);
      currentShipRate = res.shipRate;

      var pctLabel = pct.toFixed(1) + '%';
      speedVal.textContent = pctLabel + ' of light speed';
      shipTimeVal.textContent = shipYrs + ' year' + (shipYrs !== 1 ? 's' : '');
      resSpeed.textContent = pctLabel + ' c';
      resShip.textContent = shipYrs.toFixed(2) + ' year' + (shipYrs !== 1 ? 's' : '');

      warning.style.display = pct >= 95 ? 'block' : 'none';
      resGamma.textContent = res.gamma.toFixed(4);
      resEarth.textContent = res.earthYears >= 1000
        ? (res.earthYears / 1000).toFixed(2) + 'k years'
        : res.earthYears.toFixed(2) + ' year' + (res.earthYears !== 1 ? 's' : '');

      if (twinEarthVal) twinEarthVal.textContent = '1.00× rate';
      if (twinShipVal) twinShipVal.textContent = res.shipRate.toFixed(3) + '× rate';

      if (lorentzDot && lorentzLabel) {
        var gx = 34 + beta * 272;
        var gy = 126 - (Math.min(10, res.gamma - 1) / 10) * 112;
        lorentzDot.setAttribute('cx', gx.toFixed(1));
        lorentzDot.setAttribute('cy', gy.toFixed(1));
        lorentzLabel.setAttribute('x', Math.min(252, gx + 8).toFixed(1));
        lorentzLabel.setAttribute('y', Math.max(22, gy - 6).toFixed(1));
        lorentzLabel.textContent = 'γ=' + res.gamma.toFixed(2);
      }

      relChips.forEach(function (chip) {
        chip.classList.toggle('is-active', Math.abs(parseFloat(chip.dataset.relPct) - pct) < 0.06);
      });

      var pSpeed = document.getElementById('ct-p-speed');
      var pGamma = document.getElementById('ct-p-gamma');
      var pEarth = document.getElementById('ct-p-earth');
      if (pSpeed) pSpeed.textContent = pctLabel + ' c';
      if (pGamma) pGamma.textContent = res.gamma.toFixed(3);
      if (pEarth) pEarth.textContent = resEarth.textContent;
    }

    speedSlider.addEventListener('input', update);
    shipTimeSlider.addEventListener('input', update);

    relChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        speedSlider.value = String(Math.round(parseFloat(chip.dataset.relPct) * 10));
        shipTimeSlider.value = chip.dataset.relYrs;
        update();
      });
    });

    document.querySelectorAll('.ct-panel-preset[data-speed]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        speedSlider.value = String(Math.round(parseFloat(btn.dataset.speed) * 10));
        shipTimeSlider.value = btn.dataset.years;
        update();
      });
    });

    buildLorentzCurve();
    update();

    if (earthHand && shipHand) {
      var earthDeg = 0;
      var shipDeg = 0;
      var lastTs = null;
      var relRaf = window.SimKit
        ? window.SimKit.raf(window.SimKit.stage('#relativity'))
        : window.requestAnimationFrame.bind(window);

      function animateTwins(ts) {
        if (lastTs == null) lastTs = ts;
        var dt = Math.min(0.1, (ts - lastTs) / 1000);
        lastTs = ts;
        earthDeg = (earthDeg + dt * 45) % 360;
        shipDeg = (shipDeg + dt * 45 * currentShipRate) % 360;
        earthHand.setAttribute('transform', 'rotate(' + earthDeg.toFixed(1) + ', 50, 50)');
        shipHand.setAttribute('transform', 'rotate(' + shipDeg.toFixed(1) + ', 50, 50)');
        relRaf(animateTwins);
      }
      relRaf(animateTwins);
    }
  })();

  /* ═══════════════════════════════════════════════════════════
     6. GRACE HOPPER WIRE LAB
     ═══════════════════════════════════════════════════════════ */
  (function initWireLab() {
    var input = document.getElementById('ct-wire-input');
    var impEl = document.getElementById('ct-wire-imperial');
    var metEl = document.getElementById('ct-wire-metric');
    var compEl = document.getElementById('ct-wire-comparison');
    var barEl = document.getElementById('ct-wire-bar');
    var buttons = document.querySelectorAll('.ct-wire-btn');
    if (!input || !impEl || !metEl || !compEl) return;

    function getComparison(ns, meters, feet) {
      if (ns <= 0.4) return 'Cycle of a ~3 GHz computer CPU: signal only travels ~' + (meters * 100).toFixed(1) + ' cm — chip designers must keep internal paths microscopic!';
      if (ns <= 1.5) return 'Grace Hopper\'s nanosecond wire (~11.8 in / 30 cm) — fits comfortably in your hand, like a standard 12-inch school ruler!';
      if (ns <= 15) return '~' + feet.toFixed(1) + ' feet: stretches across an average classroom or bedroom (~' + meters.toFixed(1) + ' m).';
      if (ns <= 200) return '~' + feet.toFixed(0) + ' feet: about the wingspan of a Boeing 777 airliner.';
      if (ns <= 1500) return 'Grace Hopper\'s microsecond coil (984 ft / 300 m) — stretches the length of nearly three football fields!';
      if (ns <= 1e5) return '~' + (meters / 1000).toFixed(1) + ' km (~' + (feet / 5280).toFixed(1) + ' miles): spans an entire metropolitan city!';
      if (ns <= 1.5e6) return '~' + (meters / 1000).toFixed(0) + ' km (~' + (feet / 5280).toFixed(0) + ' miles): about the distance between Washington, D.C. and Philadelphia!';
      return '~' + (meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' km: an immense distance across continents or into orbit!';
    }

    function update(ns) {
      var len = M.wireLengthForNanoseconds(ns);
      if (!len) return;

      var impStr = '';
      if (len.feet < 3) {
        impStr = len.inches.toFixed(2) + ' inches (' + len.feet.toFixed(2) + ' ft)';
      } else if (len.feet < 5280) {
        impStr = len.feet.toFixed(1) + ' feet (' + len.yards.toFixed(1) + ' yards)';
      } else {
        impStr = len.miles.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' miles (' + len.feet.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ft)';
      }

      var metStr = '';
      if (len.meters < 1) {
        metStr = len.cm.toFixed(2) + ' cm (' + len.mm.toFixed(1) + ' mm)';
      } else if (len.meters < 1000) {
        metStr = len.meters.toFixed(2) + ' meters';
      } else {
        metStr = len.km.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' km (' + len.meters.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' m)';
      }

      impEl.textContent = impStr;
      metEl.textContent = metStr;
      compEl.textContent = getComparison(ns, len.meters, len.feet);

      var logVal = Math.log10(Math.max(0.1, ns));
      var pct = Math.min(100, Math.max(5, ((logVal + 1) / 7) * 100));
      if (barEl) barEl.style.width = pct + '%';
    }

    input.addEventListener('input', function () {
      var val = parseFloat(input.value);
      buttons.forEach(function (btn) {
        btn.classList.toggle('active', parseFloat(btn.dataset.ns) === val);
      });
      update(val);
    });

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        input.value = btn.dataset.ns;
        update(parseFloat(btn.dataset.ns));
      });
    });

    update(1);
  })();

  /* ═══════════════════════════════════════════════════════════
     7. PRACTICE PROBLEMS
     ═══════════════════════════════════════════════════════════ */
  (function initPractice() {
    var practiceRoot = document.getElementById('practice');
    if (!practiceRoot) return;

    var problems = practiceRoot.querySelectorAll('.ct-problem[data-prob]');
    var total = problems.length;
    var scoreEl = document.getElementById('ct-score');
    var fillEl = document.getElementById('ct-practice-fill');
    var resetBtn = document.getElementById('ct-practice-reset');
    var solved = new Set();

    function updateScore() {
      if (scoreEl) {
        scoreEl.textContent = solved.size + ' / ' + total + ' correct';
        scoreEl.style.color = solved.size === total ? 'var(--ct-emerald)' : '';
      }
      if (fillEl) {
        fillEl.style.width = ((solved.size / Math.max(1, total)) * 100) + '%';
      }
    }

    function checkProblem(prob) {
      var num = Number(prob.dataset.prob);
      var correct = parseFloat(prob.dataset.answer);
      var tol = parseFloat(prob.dataset.tolerance || '0');
      var type = prob.dataset.type || 'number';

      var input = prob.querySelector('.ct-ans-input');
      var fb = prob.querySelector('.ct-feedback');
      var hint = prob.querySelector('.ct-hint');
      var val = M.parsePracticeAnswer(input.value, type);

      fb.className = 'ct-feedback';

      if (Number.isNaN(val)) {
        fb.textContent = type === 'time24' ? 'Enter a time like 15:45.' : 'Enter a valid answer.';
        fb.classList.add('wrong');
        return;
      }

      if (Math.abs(val - correct) <= Math.max(tol, 0.001)) {
        fb.textContent = 'Correct!';
        fb.classList.add('correct');
        if (hint) hint.classList.remove('visible');
        input.style.borderColor = '#22c55e';
        input.disabled = true;
        prob.classList.add('solved');
        solved.add(num);
        updateScore();
      } else {
        fb.textContent = 'Try again';
        fb.classList.add('wrong');
        if (hint) hint.classList.add('visible');
        input.style.borderColor = '#ef4444';
        prob.classList.remove('ct-shake');
        void prob.offsetWidth;
        prob.classList.add('ct-shake');
      }
    }

    problems.forEach(function (prob) {
      var btn = prob.querySelector('.ct-check-btn');
      var input = prob.querySelector('.ct-ans-input');
      if (btn) btn.addEventListener('click', function () { checkProblem(prob); });
      if (input) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') checkProblem(prob);
        });
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        solved.clear();
        problems.forEach(function (prob) {
          prob.classList.remove('solved');
          var input = prob.querySelector('.ct-ans-input');
          var fb = prob.querySelector('.ct-feedback');
          var hint = prob.querySelector('.ct-hint');
          if (input) {
            input.value = '';
            input.disabled = false;
            input.style.borderColor = '';
          }
          if (fb) {
            fb.textContent = '';
            fb.className = 'ct-feedback';
          }
          if (hint) hint.classList.remove('visible');
        });
        updateScore();
      });
    }

    updateScore();
  })();
})();
