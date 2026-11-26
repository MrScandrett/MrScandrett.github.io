(function () {
  "use strict";

  /* ── 1. Impact Show & Unified Phase Controls ──────────────────────────── */
  var impactBtn = document.querySelector("#kpg-impact");
  var resetBtn = document.querySelector("#kpg-reset");
  var soundBtn = document.querySelector("#kpg-sound");
  var statusEl = document.querySelector("#kpg-status");
  var inlinePlayBtn = document.querySelector('[data-kpg-trigger="play"]');
  var inlinePauseBtn = document.querySelector('[data-kpg-trigger="pause"]');
  var inlineResetBtn = document.querySelector('[data-kpg-trigger="reset"]');
  var stepItems = Array.prototype.slice.call(document.querySelectorAll(".kpg-event-log li"));
  var phaseButtons = Array.prototype.slice.call(document.querySelectorAll("[data-kpg-phase-btn]"));
  var engine = null;

  function syncPhaseButtons(activePhase) {
    phaseButtons.forEach(function (btn) {
      if (btn.classList.contains("kpg-phase-pill")) {
        btn.setAttribute("aria-pressed", btn.dataset.kpgPhaseBtn === activePhase ? "true" : "false");
      }
    });
  }

  function syncControls(cue) {
    var running = Boolean(cue.running);
    var paused = Boolean(cue.paused);
    var label = cue.button || "Begin extinction experience";
    if (impactBtn) {
      impactBtn.textContent = label;
      impactBtn.disabled = running && !paused;
    }
    if (inlinePlayBtn) {
      inlinePlayBtn.textContent = running && !paused ? "Sequence running…" : (cue.phase === "complete" ? "Replay 18s sequence" : "Play 18s impact sequence");
      inlinePlayBtn.disabled = running && !paused;
    }
    if (inlinePauseBtn) {
      inlinePauseBtn.disabled = !running;
      inlinePauseBtn.textContent = paused ? "Resume" : "Pause";
    }
    if (cue.step >= 0) {
      stepItems.forEach(function (item, idx) {
        item.classList.toggle("is-active", idx <= cue.step);
      });
    } else {
      stepItems.forEach(function (item) { item.classList.remove("is-active"); });
    }
    if (statusEl && cue.message) statusEl.textContent = cue.message;
    syncPhaseButtons(cue.phase || "calm");
  }

  if (impactBtn && window.KpgEventEngine) {
    engine = new window.KpgEventEngine({
      world: document.querySelector(".kpg-world"),
      canvas: document.querySelector(".kpg-event-canvas"),
      stage: document.querySelector(".ll-sim"),
      map: document.querySelector("[data-kpg-map]"),
      ledger: document.querySelector("[data-kpg-ledger]"),
      onCue: syncControls
    });

    function startSequence() {
      if (engine.isPaused) {
        engine.resume({ sound: soundBtn && soundBtn.getAttribute("aria-pressed") === "true" });
        return;
      }
      engine.start({ sound: soundBtn && soundBtn.getAttribute("aria-pressed") === "true" });
    }

    function resetAll() {
      engine.reset();
      syncControls({
        step: -1,
        message: "System stable · Late Cretaceous",
        button: "Begin extinction experience",
        running: false,
        paused: false,
        phase: "calm"
      });
    }

    impactBtn.addEventListener("click", startSequence);
    if (inlinePlayBtn) inlinePlayBtn.addEventListener("click", startSequence);
    if (inlinePauseBtn) {
      inlinePauseBtn.addEventListener("click", function () {
        engine.togglePause({ sound: soundBtn && soundBtn.getAttribute("aria-pressed") === "true" });
      });
    }
    if (resetBtn) resetBtn.addEventListener("click", resetAll);
    if (inlineResetBtn) inlineResetBtn.addEventListener("click", resetAll);

    if (soundBtn) {
      soundBtn.addEventListener("click", function () {
        var enabled = soundBtn.getAttribute("aria-pressed") !== "true";
        soundBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
        soundBtn.textContent = enabled ? "Sound on" : "Sound off";
      });
    }

    phaseButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        engine.jumpToPhase(btn.dataset.kpgPhaseBtn, { play: false });
      });
    });

    window.addEventListener("DOMContentLoaded", function () {
      window.setTimeout(function () {
        if (window.LessonLayout && window.innerWidth > 680) window.LessonLayout.openPanel(true);
      }, 0);
    });
  }

  /* ── 2. EarthEngine 70 Ma / 0 Ma Paleogeography & Tsunami Map ─────────── */
  (function initPaleoMap() {
    var svg = document.getElementById("kpg-earth-svg");
    if (!svg || !window.EarthEngine || !window.d3) return;

    var SVG_NS = "http://www.w3.org/2000/svg";
    var ageButtons = Array.prototype.slice.call(document.querySelectorAll("[data-kpg-map-age]"));
    var siteButtons = Array.prototype.slice.call(document.querySelectorAll("[data-kpg-site]"));
    var siteTitleEl = document.querySelector("[data-kpg-site-title]");
    var siteDescEl = document.querySelector("[data-kpg-site-desc]");
    var creditEl = document.querySelector("[data-kpg-recon-credit]");

    var SITES = [
      {
        id: "chicxulub",
        name: "Chicxulub Impact Site · Yucatán Shallow Carbonate Platform",
        label: "CHICXULUB",
        sub: "Impact ground zero",
        coords: { 70: [-72.5, 21.0], 0: [-89.5, 21.4] },
        desc: "A ~10–15 km asteroid struck sulfate-rich shallow marine rocks, excavating a ~180 km crater, launching global ejecta, and triggering megatsunamis across adjacent ocean basins."
      },
      {
        id: "deccan",
        name: "Deccan Traps Flood Basalts · Drifting Indian Plate",
        label: "DECCAN",
        sub: "Flood volcanism",
        coords: { 70: [52.0, -23.0], 0: [74.0, 19.0] },
        desc: "At 70–66 Ma, India sat in the Southern Hemisphere drifting rapidly north. Massive volcanic pulses emitted CO₂ and sulfur gases before and after the Chicxulub impact."
      },
      {
        id: "tanis",
        name: "Tanis & Hell Creek Formation · Western Interior Margin",
        label: "TANIS / HELL CREEK",
        sub: "Ejecta & fossil turnover",
        coords: { 70: [-84.5, 51.5], 0: [-106.5, 47.5] },
        desc: "Preserves impact-day glass spherules and surge deposits alongside the final strata containing Tyrannosaurus rex, Triceratops, and Edmontosaurus fossils."
      },
      {
        id: "gubbio",
        name: "Gubbio Marine Limestone · Tethys Basin (Italy)",
        label: "GUBBIO",
        sub: "Iridium clay discovery",
        coords: { 70: [12.0, 31.5], 0: [12.6, 43.4] },
        desc: "Site of the 1980 Alvarez discovery: a thin clay layer packed with extraterrestrial iridium separates diverse Cretaceous foraminifera below from post-crisis plankton above."
      }
    ];

    var state = { age: 70, siteId: "chicxulub" };

    function el(tag, attrs, text) {
      var node = document.createElementNS(SVG_NS, tag);
      if (attrs) {
        Object.keys(attrs).forEach(function (k) { node.setAttribute(k, String(attrs[k])); });
      }
      if (text != null) node.textContent = text;
      return node;
    }

    function selectSite(siteId) {
      state.siteId = siteId;
      var site = SITES.find(function (s) { return s.id === siteId; }) || SITES[0];
      if (siteTitleEl) siteTitleEl.textContent = site.name;
      if (siteDescEl) siteDescEl.textContent = site.desc;
      siteButtons.forEach(function (btn) {
        btn.setAttribute("aria-pressed", btn.dataset.kpgSite === siteId ? "true" : "false");
      });
      Array.prototype.forEach.call(svg.querySelectorAll(".kpg-site-pin"), function (pin) {
        pin.setAttribute("data-active", pin.getAttribute("data-site") === siteId ? "true" : "false");
      });
    }

    function geodesicPath(proj, lonLatStart, lonLatEnd) {
      var interp = window.d3.geoInterpolate(lonLatStart, lonLatEnd);
      var coords = [];
      for (var i = 0; i <= 24; i += 1) coords.push(interp(i / 24));
      return window.EarthEngine.path(proj, { type: "LineString", coordinates: coords }) || "";
    }

    function renderAge(requestedAge) {
      var age = window.EarthEngine.reconstruction.nearestAge(requestedAge);
      state.age = age;
      ageButtons.forEach(function (btn) {
        btn.setAttribute("aria-pressed", Number(btn.dataset.kpgMapAge) === age ? "true" : "false");
      });

      window.EarthEngine.reconstruction.load(age).then(function (geo) {
        var proj = window.EarthEngine.projection("natural-earth", { extent: [[16, 16], [944, 464]] });
        var sphereD = window.EarthEngine.path(proj, { type: "Sphere" }) || "";
        var gratD = window.EarthEngine.path(proj, window.d3.geoGraticule10()) || "";

        svg.querySelector('[data-kpg-layer="sphere-clip"]').setAttribute("d", sphereD);
        svg.querySelector('[data-kpg-layer="sphere"]').setAttribute("d", sphereD);
        svg.querySelector('[data-kpg-layer="graticule"]').setAttribute("d", gratD);

        var landLayer = svg.querySelector('[data-kpg-layer="land"]');
        var maskLayer = svg.querySelector('[data-kpg-layer="land-mask"]');
        landLayer.innerHTML = "";
        maskLayer.innerHTML = "";

        geo.features.forEach(function (feature) {
          var d = window.EarthEngine.path(proj, feature);
          if (!d) return;
          landLayer.appendChild(el("path", { d: d }));
          maskLayer.appendChild(el("path", { d: d, fill: "black", stroke: "black", "stroke-width": "3" }));
        });

        var impactCoord = SITES[0].coords[age] || SITES[0].coords[70];
        var impactXY = proj(impactCoord) || [240, 180];

        var heatLayer = svg.querySelector('[data-kpg-layer="heat"]');
        heatLayer.innerHTML = "";
        heatLayer.appendChild(el("ellipse", {
          class: "kpg-heat kpg-heat-core",
          cx: impactXY[0].toFixed(1),
          cy: impactXY[1].toFixed(1),
          rx: 95,
          ry: 72
        }));

        var atlanticEnd = age === 70 ? [-22, 34] : [-36, 36];
        var pacificMid = age === 70 ? [-118, 4] : [-138, 4];
        var southernEnd = age === 70 ? [12, -38] : [-8, -38];

        var atlD = geodesicPath(proj, impactCoord, atlanticEnd);
        var pacD = geodesicPath(proj, impactCoord, pacificMid);
        var sthD = geodesicPath(proj, impactCoord, southernEnd);

        heatLayer.appendChild(el("path", { class: "kpg-heat kpg-heat-path kpg-heat-atlantic", d: atlD }));
        heatLayer.appendChild(el("path", { class: "kpg-heat kpg-heat-path kpg-heat-pacific", d: pacD }));
        heatLayer.appendChild(el("path", { class: "kpg-heat kpg-heat-path kpg-heat-global", d: sthD }));

        var waveLayer = svg.querySelector('[data-kpg-layer="waves"]');
        waveLayer.innerHTML = "";
        for (var r = 0; r < 3; r += 1) {
          waveLayer.appendChild(el("circle", {
            class: "kpg-tsunami-ring",
            cx: impactXY[0].toFixed(1),
            cy: impactXY[1].toFixed(1),
            r: 6
          }));
        }

        var routesLayer = svg.querySelector('[data-kpg-layer="routes"]');
        routesLayer.innerHTML = "";
        [atlD, pacD, sthD].forEach(function (d) {
          if (d) routesLayer.appendChild(el("path", { class: "kpg-tsunami-route", d: d }));
        });

        var pinsLayer = svg.querySelector('[data-kpg-layer="pins"]');
        pinsLayer.innerHTML = "";
        SITES.forEach(function (site) {
          var pt = proj(site.coords[age] || site.coords[70]);
          if (!pt) return;
          var x = pt[0];
          var y = pt[1];
          var g = el("g", {
            class: "kpg-site-pin",
            "data-site": site.id,
            "data-active": site.id === state.siteId ? "true" : "false",
            tabindex: "0",
            role: "button",
            "aria-label": site.name
          });
          g.appendChild(el("circle", { class: "kpg-site-halo", cx: x.toFixed(1), cy: y.toFixed(1), r: 12 }));
          g.appendChild(el("circle", { class: "kpg-site-dot", cx: x.toFixed(1), cy: y.toFixed(1), r: 6 }));
          var dx = site.id === "tanis" ? -12 : 12;
          var anchor = site.id === "tanis" ? "end" : "start";
          g.appendChild(el("text", {
            class: "kpg-map-label",
            x: (x + dx).toFixed(1),
            y: (y - 4).toFixed(1),
            "text-anchor": anchor
          }, site.label));
          g.appendChild(el("text", {
            class: "kpg-map-sub",
            x: (x + dx).toFixed(1),
            y: (y + 10).toFixed(1),
            "text-anchor": anchor
          }, site.sub));

          g.addEventListener("click", function () { selectSite(site.id); });
          g.addEventListener("keydown", function (ev) {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              selectSite(site.id);
            }
          });
          pinsLayer.appendChild(g);
        });

        if (creditEl) {
          creditEl.textContent = age === 70
            ? "70 Ma frame (nearest to 66 Ma) · Model: MULLER2019 · Reconstructed modern outlines, not exact ancient shorelines · EarthByte / University of Sydney (CC BY 4.0)"
            : "0 Ma modern reference · Model: MULLER2019 · EarthByte / University of Sydney (CC BY 4.0)";
        }
      }).catch(function () {
        if (siteDescEl) {
          siteDescEl.textContent = "Plate reconstruction geometry could not load offline. Open via local server (node serve-local.js) to render MULLER2019 frames.";
        }
      });
    }

    ageButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        renderAge(Number(btn.dataset.kpgMapAge));
      });
    });

    siteButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectSite(btn.dataset.kpgSite);
      });
    });

    selectSite("chicxulub");
    renderAge(70);
  }());

  /* ── 3. Earth Systems Cascade Lab ─────────────────────────────────────── */
  (function initCascadeLab() {
    var canvas = document.getElementById("kpg-cascade-canvas");
    var sulfurSlider = document.getElementById("kpg-slider-sulfur");
    var deccanSlider = document.getElementById("kpg-slider-deccan");
    var durationSlider = document.getElementById("kpg-slider-duration");
    if (!canvas || !sulfurSlider || !deccanSlider || !durationSlider || !window.SimKit) return;

    var outSulfur = document.getElementById("kpg-out-sulfur");
    var outDeccan = document.getElementById("kpg-out-deccan");
    var outDuration = document.getElementById("kpg-out-duration");
    var telCooling = document.getElementById("kpg-tel-cooling");
    var telDark = document.getElementById("kpg-tel-dark");
    var telPlankton = document.getElementById("kpg-tel-plankton");
    var telRisk = document.getElementById("kpg-tel-risk");
    var verdictEl = document.getElementById("kpg-lab-verdict");
    var presetBtns = Array.prototype.slice.call(document.querySelectorAll("[data-kpg-preset]"));

    var PRESETS = {
      actual: { sulfur: 85, deccan: 55, duration: 3.0 },
      ocean: { sulfur: 25, deccan: 55, duration: 0.8 },
      deccan: { sulfur: 12, deccan: 85, duration: 0.5 },
      extreme: { sulfur: 100, deccan: 80, duration: 5.0 }
    };

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function computeModel() {
      var sulfur = Number(sulfurSlider.value) / 100;
      var deccan = Number(deccanSlider.value) / 100;
      var dur = Number(durationSlider.value);

      var steps = 120; // 0..10 years (monthly resolution)
      var dt = 10 / steps;
      var sunlight = [];
      var temp = [];
      var plankton = [];
      var vertebrate = [];

      var pState = 100 - deccan * 14;
      var vState = 100 - deccan * 10;
      var minPlankton = pState;
      var peakCooling = 0;
      var darkMonths = 0;

      for (var i = 0; i <= steps; i += 1) {
        var t = i * dt;
        var opacity = sulfur * Math.exp(-t / Math.max(0.35, dur * 0.65));
        if (t < 0.08 && sulfur > 0.15) opacity = Math.max(opacity, sulfur * 0.96);

        var sun = clamp(100 * (1 - 0.97 * opacity), 2, 100);
        if (sun < 10 && t > 0) darkMonths += 1;

        var cooling = -22 * sulfur * Math.exp(-t / Math.max(0.45, dur * 0.72));
        var co2Warming = (2.8 * deccan + 2.6 * sulfur) * (1 - Math.exp(-t / 1.8));
        var tempAnom = cooling + co2Warming;
        if (tempAnom < peakCooling) peakCooling = tempAnom;

        var targetP = clamp(sun * (1 - 0.25 * deccan) + 8 * (1 - sulfur), 5, 100);
        pState += (targetP - pState) * Math.min(1, dt * (sun < 30 ? 3.2 : 0.45));
        pState = clamp(pState, 4, 100);
        if (pState < minPlankton) minPlankton = pState;

        var stress = (pState < 42 ? (42 - pState) / 38 : 0) + (tempAnom < -8 ? (-8 - tempAnom) / 28 : 0);
        var targetV = clamp(pState * 0.92 - stress * 24 - deccan * 12, 6, 100);
        vState += (targetV - vState) * Math.min(1, dt * (targetV < vState ? 1.4 : 0.22));
        vState = clamp(vState, 6, 100);

        sunlight.push(sun);
        temp.push(tempAnom);
        plankton.push(pState);
        vertebrate.push(vState);
      }

      var risk = clamp(Math.round((100 - minPlankton) * 0.55 + (darkMonths * 1.45) + (deccan * 14)), 6, 92);
      return {
        steps: steps,
        sunlight: sunlight,
        temp: temp,
        plankton: plankton,
        vertebrate: vertebrate,
        peakCooling: Math.round(peakCooling),
        darkMonths: darkMonths,
        minPlankton: Math.round(minPlankton),
        risk: risk,
        sulfurPct: Math.round(sulfur * 100),
        deccanPct: Math.round(deccan * 100),
        dur: dur
      };
    }

    var surface = null;
    surface = window.SimKit.canvas2d(canvas, {
      box: canvas.parentElement,
      height: 250,
      onResize: function (ctx, w, h) { draw(ctx, w, h); }
    });

    function drawSeries(ctx, data, pad, plotW, plotH, color, mapY) {
      ctx.beginPath();
      for (var i = 0; i < data.length; i += 1) {
        var x = pad.left + (i / (data.length - 1)) * plotW;
        var y = mapY(data[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    function draw(ctxArg, wArg, hArg) {
      var m = computeModel();
      if (outSulfur) outSulfur.textContent = m.sulfurPct + "%";
      if (outDeccan) outDeccan.textContent = m.deccanPct + "%";
      if (outDuration) outDuration.textContent = m.dur.toFixed(1) + " yr";
      if (telCooling) telCooling.textContent = m.peakCooling + " °C";
      if (telDark) telDark.textContent = m.darkMonths + " mo";
      if (telPlankton) telPlankton.textContent = m.minPlankton + "%";
      if (telRisk) telRisk.textContent = m.risk + "%";

      if (verdictEl) {
        if (m.risk >= 65) {
          verdictEl.textContent = "Systemic collapse: " + m.darkMonths + " months of near-darkness and " + m.peakCooling + " °C cooling crush phytoplankton to " + m.minPlankton + "%, starving marine food webs and large terrestrial vertebrates while favoring small burrowing, seed-eating, and freshwater niches.";
        } else if (m.risk >= 35) {
          verdictEl.textContent = "Severe ecological stress without full K–Pg collapse: shorter darkness (" + m.darkMonths + " months) allows primary producers to rebound before most major vertebrate lineages starve.";
        } else {
          verdictEl.textContent = "Chronic climate disturbance: without heavy stratospheric sulfur and soot, photosynthesis holds above " + m.minPlankton + "% and global food webs absorb the shock without a ~75% species extinction.";
        }
      }

      var ctx = ctxArg || (surface && surface.ctx);
      var w = wArg || (surface && surface.width);
      var h = hArg || (surface && surface.height);
      if (!ctx || !w || !h) return;

      ctx.clearRect(0, 0, w, h);
      var pad = { left: 42, right: 44, top: 14, bottom: 26 };
      var plotW = Math.max(40, w - pad.left - pad.right);
      var plotH = Math.max(40, h - pad.top - pad.bottom);

      // Horizontal percentage grid
      ctx.font = '600 10px "IBM Plex Mono", monospace';
      ctx.textBaseline = "middle";
      [0, 25, 50, 75, 100].forEach(function (pct) {
        var y = pad.top + (1 - pct / 100) * plotH;
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + plotW, y);
        ctx.stroke();

        ctx.fillStyle = "rgba(226,232,240,0.65)";
        ctx.textAlign = "right";
        ctx.fillText(pct + "%", pad.left - 6, y);
      });

      // Right axis temperature ticks (-25°C to +10°C)
      [-20, -10, 0, 5].forEach(function (deg) {
        var y = pad.top + (1 - (deg + 25) / 35) * plotH;
        ctx.fillStyle = "rgba(192,132,252,0.8)";
        ctx.textAlign = "left";
        ctx.fillText((deg > 0 ? "+" : "") + deg + "°", pad.left + plotW + 6, y);
      });

      // Vertical year ticks
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      [0, 2, 4, 6, 8, 10].forEach(function (yr) {
        var x = pad.left + (yr / 10) * plotW;
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.beginPath();
        ctx.moveTo(x, pad.top);
        ctx.lineTo(x, pad.top + plotH);
        ctx.stroke();
        ctx.fillStyle = "rgba(226,232,240,0.65)";
        ctx.fillText(yr + "y", x, pad.top + plotH + 6);
      });

      var mapPct = function (val) { return pad.top + (1 - val / 100) * plotH; };
      var mapTemp = function (deg) { return pad.top + (1 - clamp((deg + 25) / 35, 0, 1)) * plotH; };

      drawSeries(ctx, m.sunlight, pad, plotW, plotH, "#fbbf24", mapPct);
      drawSeries(ctx, m.plankton, pad, plotW, plotH, "#38bdf8", mapPct);
      drawSeries(ctx, m.vertebrate, pad, plotW, plotH, "#f87171", mapPct);
      drawSeries(ctx, m.temp, pad, plotW, plotH, "#c084fc", mapTemp);
    }

    function clearPresetHighlight() {
      presetBtns.forEach(function (btn) { btn.setAttribute("aria-pressed", "false"); });
    }

    presetBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cfg = PRESETS[btn.dataset.kpgPreset];
        if (!cfg) return;
        sulfurSlider.value = cfg.sulfur;
        deccanSlider.value = cfg.deccan;
        durationSlider.value = cfg.duration;
        presetBtns.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
        draw();
      });
    });

    [sulfurSlider, deccanSlider, durationSlider].forEach(function (slider) {
      slider.addEventListener("input", function () {
        clearPresetHighlight();
        draw();
      });
    });

    draw();
  }());

  /* ── 4. K–Pg Boundary Rock Core Inspector ─────────────────────────────── */
  (function initRockCore() {
    var layerBtns = Array.prototype.slice.call(document.querySelectorAll("[data-kpg-layer-btn]"));
    var horizonEl = document.getElementById("kpg-core-horizon");
    var nameEl = document.getElementById("kpg-core-name");
    var descEl = document.getElementById("kpg-core-desc");
    var irVal = document.getElementById("kpg-core-ir-val");
    var irBar = document.getElementById("kpg-core-ir-bar");
    var foramVal = document.getElementById("kpg-core-foram-val");
    var foramBar = document.getElementById("kpg-core-foram-bar");
    var fernVal = document.getElementById("kpg-core-fern-val");
    var fernBar = document.getElementById("kpg-core-fern-bar");
    if (!layerBtns.length || !nameEl) return;

    var LAYERS = {
      paleogene: {
        horizon: "Paleogene · +100,000 to +1,000,000 years post-impact",
        name: "5 · Paleogene Recovery Limestone",
        desc: "New small-bodied planktonic foraminifera and calcareous algae gradually rebuild marine carbon export, while mammals and crown birds radiate into open ecological niches on land.",
        irText: "0.2 ppb (baseline)", irPct: 4,
        foramText: "Recovering (45%)", foramPct: 45,
        fernText: "~22% (forest return)", fernPct: 22
      },
      fern: {
        horizon: "Earliest Danian · Years to decades post-impact",
        name: "4 · Fern-Spore Spike Shale",
        desc: "Directly above the dark boundary clay, pollen counts across North America, Europe, and New Zealand jump to ~70–85% fern spores—showing hardy pioneer ferns colonizing burned, bare soil before seed forests returned.",
        irText: "3.5 ppb (tail)", irPct: 14,
        foramText: "Minimal (10%)", foramPct: 10,
        fernText: "~82% (fern spike)", fernPct: 82
      },
      iridium: {
        horizon: "Exact K–Pg Boundary · ~66.0 Ma · 2–3 cm dark clay",
        name: "3 · K–Pg Boundary Clay (Iridium Spike)",
        desc: "A razor-thin clay layer enriched 30–100× in extraterrestrial iridium—an element rare in Earth's crust but abundant in asteroids. Below this line lie diverse Cretaceous fossils; immediately above it, ammonites and non-avian dinosaurs are gone.",
        irText: "~45 ppb (30–100× spike)", irPct: 95,
        foramText: "Collapse (<8%)", foramPct: 8,
        fernText: "~38% (rising)", fernPct: 38
      },
      spherules: {
        horizon: "Impact Day · Hours to days post-impact",
        name: "2 · Ejecta Spherule & Tsunami Bed",
        desc: "Contains molten rock droplets (microtektites), shocked quartz grains fractured by hypervelocity pressure, and chaotic tsunami cross-bedding—all formed within hours of Chicxulub impact.",
        irText: "12 ppb (ejecta)", irPct: 34,
        foramText: "Reworked debris", foramPct: 20,
        fernText: "Ash & charcoal", fernPct: 10
      },
      cretaceous: {
        horizon: "Late Maastrichtian · Just before 66.0 Ma",
        name: "1 · Late Cretaceous Chalk & Mudstone",
        desc: "Rich marine chalks packed with diverse planktonic foraminifera and ammonites, paired on land with Hell Creek mudstones holding Tyrannosaurus, Triceratops, and diverse flowering plants.",
        irText: "0.1 ppb (crustal normal)", irPct: 3,
        foramText: "High diversity (96%)", foramPct: 96,
        fernText: "~15% (mixed forest)", fernPct: 15
      }
    };

    function selectLayer(id) {
      var layer = LAYERS[id];
      if (!layer) return;
      layerBtns.forEach(function (btn) {
        btn.setAttribute("aria-pressed", btn.dataset.kpgLayerBtn === id ? "true" : "false");
      });
      if (horizonEl) horizonEl.textContent = layer.horizon;
      nameEl.textContent = layer.name;
      if (descEl) descEl.textContent = layer.desc;
      if (irVal) irVal.textContent = layer.irText;
      if (irBar) irBar.style.width = layer.irPct + "%";
      if (foramVal) foramVal.textContent = layer.foramText;
      if (foramBar) foramBar.style.width = layer.foramPct + "%";
      if (fernVal) fernVal.textContent = layer.fernText;
      if (fernBar) fernBar.style.width = layer.fernPct + "%";
    }

    layerBtns.forEach(function (btn) {
      btn.addEventListener("click", function () { selectLayer(btn.dataset.kpgLayerBtn); });
    });
    selectLayer("iridium");
  }());

  /* ── 5. Ledger Filters & Taxon Popover (Lightbox-safe) ────────────────── */
  (function initLedger() {
    var taxa = Array.prototype.slice.call(document.querySelectorAll(".kpg-taxon"));
    var filterBtns = Array.prototype.slice.call(document.querySelectorAll("[data-kpg-filter]"));
    var popover = document.querySelector("#kpg-taxon-popover");

    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.dataset.kpgFilter;
        filterBtns.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
        taxa.forEach(function (card) {
          var fate = card.dataset.fate || "extinct";
          card.hidden = mode !== "all" && fate !== mode;
        });
      });
    });

    if (!taxa.length || !popover) return;

    var fields = {
      name: popover.querySelector("[data-kpg-popover-name]"),
      taxonomy: popover.querySelector("[data-kpg-popover-taxonomy]"),
      diet: popover.querySelector("[data-kpg-popover-diet]"),
      time: popover.querySelector("[data-kpg-popover-time]"),
      place: popover.querySelector("[data-kpg-popover-place]"),
      size: popover.querySelector("[data-kpg-popover-size]"),
      fact: popover.querySelector("[data-kpg-popover-fact]"),
      source: popover.querySelector("[data-kpg-popover-source]")
    };
    var closeBtn = popover.querySelector(".kpg-popover-close");
    var activeTaxon = null;
    var pinned = false;
    var hideTimer = 0;

    function cancelHide() { window.clearTimeout(hideTimer); }

    function positionPopover(taxon) {
      if (!taxon || window.innerWidth <= 620) return;
      var anchor = taxon.getBoundingClientRect();
      var box = popover.getBoundingClientRect();
      var gutter = 12;
      var left = anchor.left + (anchor.width - box.width) / 2;
      left = Math.max(gutter, Math.min(left, window.innerWidth - box.width - gutter));
      var top = anchor.top - box.height - 10;
      if (top < gutter) top = anchor.bottom + 10;
      top = Math.max(gutter, Math.min(top, window.innerHeight - box.height - gutter));
      popover.style.left = Math.round(left) + "px";
      popover.style.top = Math.round(top) + "px";
    }

    function showPopover(taxon, shouldPin) {
      cancelHide();
      activeTaxon = taxon;
      pinned = Boolean(shouldPin);
      fields.name.textContent = taxon.dataset.taxon;
      fields.taxonomy.textContent = taxon.dataset.taxonomy;
      fields.diet.textContent = taxon.dataset.diet;
      fields.time.textContent = taxon.dataset.time;
      fields.place.textContent = taxon.dataset.place;
      fields.size.textContent = taxon.dataset.size;
      fields.fact.textContent = taxon.dataset.fact;
      fields.source.href = taxon.dataset.source;
      fields.source.textContent = "Source: " + taxon.dataset.sourceLabel + " ↗";
      popover.classList.add("is-visible");
      popover.classList.toggle("is-pinned", pinned);
      popover.setAttribute("aria-hidden", "false");
      positionPopover(taxon);
    }

    function hidePopover(force) {
      if (pinned && !force) return;
      cancelHide();
      pinned = false;
      activeTaxon = null;
      popover.classList.remove("is-visible", "is-pinned");
      popover.setAttribute("aria-hidden", "true");
    }

    function scheduleHide() {
      cancelHide();
      hideTimer = window.setTimeout(function () { hidePopover(false); }, 140);
    }

    taxa.forEach(function (taxon) {
      taxon.setAttribute("aria-describedby", "kpg-taxon-popover");
      taxon.addEventListener("pointerenter", function (event) {
        if (event.pointerType !== "touch" && !pinned) showPopover(taxon, false);
      });
      taxon.addEventListener("pointerleave", scheduleHide);
      taxon.addEventListener("focusin", function () { showPopover(taxon, false); });
      taxon.addEventListener("focusout", scheduleHide);
      taxon.addEventListener("click", function (event) {
        // Clicking the thumbnail figure opens the classroom PhotoLightbox cleanly without pinning the popover.
        if (event.target.closest("figure[data-zoomable]")) {
          hidePopover(true);
          return;
        }
        event.stopPropagation();
        showPopover(taxon, true);
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", function () { hidePopover(true); });
    popover.addEventListener("pointerenter", cancelHide);
    popover.addEventListener("pointerleave", scheduleHide);
    popover.addEventListener("click", function (event) { event.stopPropagation(); });
    document.addEventListener("click", function () { hidePopover(true); });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") hidePopover(true);
    });
    window.addEventListener("resize", function () {
      if (activeTaxon) positionPopover(activeTaxon);
    });
    window.addEventListener("scroll", function () {
      if (activeTaxon) positionPopover(activeTaxon);
    }, { passive: true });
  }());

  /* ── 6. "Will It Survive?" Niche Prediction Challenge ─────────────────── */
  (function initNicheChallenge() {
    var cards = Array.prototype.slice.call(document.querySelectorAll("[data-kpg-quiz]"));
    var scoreEl = document.querySelector("[data-kpg-quiz-score]");
    var resetQuizBtn = document.querySelector("[data-kpg-quiz-reset]");
    if (!cards.length) return;

    function updateScore() {
      var tested = 0;
      var correct = 0;
      cards.forEach(function (card) {
        if (card.dataset.tested === "true") tested += 1;
        if (card.dataset.correct === "true") correct += 1;
      });
      if (scoreEl) scoreEl.textContent = correct + " / " + cards.length + " accurate (" + tested + " tested)";
    }

    cards.forEach(function (card) {
      var buttons = Array.prototype.slice.call(card.querySelectorAll(".kpg-quiz-btn"));
      var fb = card.querySelector(".kpg-quiz-feedback");
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var guess = btn.dataset.guess;
          var isRight = guess === card.dataset.answer;
          buttons.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
          card.dataset.tested = "true";
          card.dataset.correct = isRight ? "true" : "false";
          if (fb) {
            fb.hidden = false;
            fb.dataset.state = isRight ? "correct" : "revise";
            fb.textContent = (isRight ? "Accurate: " : "Look at the niche: ") + card.dataset.reason;
          }
          updateScore();
        });
      });
    });

    if (resetQuizBtn) {
      resetQuizBtn.addEventListener("click", function () {
        cards.forEach(function (card) {
          delete card.dataset.tested;
          delete card.dataset.correct;
          card.querySelectorAll(".kpg-quiz-btn").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
          var fb = card.querySelector(".kpg-quiz-feedback");
          if (fb) { fb.hidden = true; fb.textContent = ""; delete fb.dataset.state; }
        });
        updateScore();
      });
    }
  }());
}());
