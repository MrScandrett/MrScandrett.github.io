(function () {
  // ── Panel tab logic ───────────────────────────────────────────────────────
  document.querySelectorAll('.ll-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const pane = btn.dataset.pane;
      document.querySelectorAll('.ll-tab').forEach(b => b.setAttribute('aria-selected','false'));
      btn.setAttribute('aria-selected','true');
      document.querySelectorAll('.ll-pane').forEach(p => p.classList.remove('ll-active'));
      document.getElementById(pane).classList.add('ll-active');
    });
  });

  // ── Practice check functions ──────────────────────────────────────────────
  window.hvCheck = function (n, correct, tol) {
    const val  = parseFloat(document.getElementById('hvans-' + n).value);
    const fb   = document.getElementById('hvfb-' + n);
    const hint = document.getElementById('hvhint-' + n);
    if (isNaN(val)) { fb.textContent = 'Enter a number.'; fb.className = 'hv-feedback err'; return; }
    if (Math.abs(val - correct) <= tol) {
      fb.textContent = '✓ Correct!'; fb.className = 'hv-feedback ok';
    } else {
      fb.textContent = '✗ Try again.';  fb.className = 'hv-feedback err';
      if (hint) hint.style.display = 'block';
    }
  };

  window.hvCheckText = function (n, correct) {
    const el   = document.getElementById('hvans-' + n);
    const val  = el.value.toString().toLowerCase().trim();
    const fb   = document.getElementById('hvfb-' + n);
    const hint = document.getElementById('hvhint-' + n);
    if (val === correct.toLowerCase()) {
      fb.textContent = '✓ Correct!'; fb.className = 'hv-feedback ok';
    } else {
      fb.textContent = '✗ Try again.'; fb.className = 'hv-feedback err';
      if (hint) hint.style.display = 'block';
    }
  };

  // ── Chimborazo vegetation-zone explorer ───────────────────────────────────
  (function() {
    const canvas = document.getElementById('hv-canvas');
    const wrap   = canvas.closest('.hv-canvas-wrap');
    const SUMMIT = 6263;          // true summit, matches the "Legacy" callout
    const HIGH_POINT = 5878;      // Humboldt & Bonpland's 1802 turnaround
    const BASE_TEMP = 27;         // approx. sea-level temp at the equator, °C
    const LAPSE = 6.5;            // environmental lapse rate, °C per 1000 m
    // Rough teaching model: sea-level temperature falls ~0.52°C per degree
    // of latitude from the equator to the poles (27°C equator to roughly
    // -20°C at the poles). Solving BASE_TEMP - LAPSE*alt/1000 = BASE_TEMP -
    // 0.52*lat for lat gives the "equivalent latitude" below — the sea-level
    // trip that would land you in the same average temperature as climbing
    // to that altitude on a tropical mountain. This is a simplified model,
    // not a precise climate calculation, but it demonstrates Humboldt's
    // actual insight: a single mountain compresses equator-to-pole climate.
    const LAT_PER_ALT = (LAPSE / 1000) / 0.52;

    const zones = [
      { max: 1000, name: 'Tierra Caliente', color: '#1a5c2a', snowy: false,
        desc: 'Hot, humid tropical rainforest. Palms, orchids, monkeys, and macaws thrive in the dense lowland canopy.',
        species: [['🌴','Palms'], ['🦜','Macaws'], ['🐒','Howler monkeys']] },
      { max: 2000, name: 'Tierra Templada', color: '#3f7d2e', snowy: false,
        desc: 'Subtropical forest. Coffee, ferns, and broadleaf trees replace lowland jungle as the air cools.',
        species: [['☕','Coffee shrubs'], ['🦋','Cloud butterflies'], ['🌿','Broadleaf trees']] },
      { max: 3000, name: 'Tierra Fría — Cloud Forest', color: '#4f8c5c', snowy: false,
        desc: 'Cool, mist-covered cloud forest. Oaks, mosses, and epiphytes cling to slopes wrapped in fog most days.',
        species: [['🌳','Andean oaks'], ['🍄','Mosses & epiphytes'], ['🐻','Spectacled bear']] },
      { max: 3800, name: 'Sub-páramo', color: '#7a9c5e', snowy: false,
        desc: 'Stunted, wind-bent dwarf forest and shrubland. Polylepis trees — the world’s highest-growing trees — take hold here.',
        species: [['🌲','Polylepis dwarf trees'], ['🐿️','Mountain tapir']] },
      { max: 4500, name: 'Páramo', color: '#a3a15a', snowy: false,
        desc: 'High Andean grassland. Frailejones and tussock grasses survive intense UV, night frost, and thin air.',
        species: [['🌾','Frailejones & tussock grass'], ['🦙','Vicuña'], ['🦅','Andean condor']] },
      { max: 5000, name: 'Alpine Desert', color: '#8a8378', snowy: false,
        desc: 'Bare rock, gravel, and lichen. Almost no plant life survives the cold and thin oxygen.',
        species: [['🪨','Lichen on bare rock'], ['🦅','Condor overhead']] },
      { max: SUMMIT, name: 'Nieves Perpetuas', color: '#f4f8fb', snowy: true,
        desc: 'Permanent snow and glacial ice. Humboldt and Bonpland turned back at ' + HIGH_POINT.toLocaleString() + ' m in 1802, just short of the true summit.',
        species: [['❄️','Permanent snow & ice'], ['🚫','No plant life survives here']] }
    ];

    function zoneFor(alt) {
      for (const z of zones) if (alt <= z.max) return z;
      return zones[zones.length - 1];
    }

    function tempFor(alt) {
      return BASE_TEMP - (LAPSE * alt / 1000);
    }

    function boilFor(alt) {
      // Water's boiling point drops roughly 1°C per ~300 m of elevation.
      return Math.max(68, 100 - alt / 300);
    }

    function latFor(alt) {
      return Math.min(90, LAT_PER_ALT * alt);
    }

    function analogFor(lat) {
      if (lat < 5)  return 'the equatorial tropics — think the heart of the Amazon or Congo basin.';
      if (lat < 23) return 'the subtropics — similar latitudes to central Mexico or the Sahara\'s southern edge.';
      if (lat < 40) return 'the warm temperate zone — similar to the Mediterranean coast or the southeastern U.S.';
      if (lat < 55) return 'the cool temperate zone — similar to New England or Germany.';
      if (lat < 66) return 'the subarctic — similar to the boreal taiga of Canada or Siberia.';
      if (lat < 80) return 'the Arctic tundra — similar to northern Alaska or Svalbard.';
      return 'the polar ice caps — similar to the edge of the Antarctic ice sheet.';
    }

    // DPR-aware sizing via shared sim helper (see assets/js/sim-kit.js).
    // `useKit`/`ctx` are resolved *before* SimKit.canvas2d is constructed,
    // because SimKit invokes onResize (which calls draw) synchronously
    // during construction — any `const` draw() depends on that isn't fully
    // assigned yet would throw a temporal-dead-zone error at that point.
    const useKit = !!(window.SimKit && SimKit.canvas2d);
    const ctx = canvas.getContext('2d');

    function dims() {
      return { W: wrap.clientWidth || 600, H: wrap.clientHeight || 380 };
    }

    function currentAlt() {
      return parseInt(document.getElementById('hv-alt-slider').value, 10);
    }

    // Smooth mountain silhouette: width tapers with a gentle concave curve
    // rather than a straight-line trapezoid, so the peak actually looks
    // like a summit instead of a stack of boxes.
    function widthFrac(t) {
      return 0.26 + 0.66 * Math.pow(1 - t, 1.2);
    }

    function draw(alt) {
      if (!useKit) { canvas.width = canvas.offsetWidth || 600; canvas.height = 380; }
      const { W, H } = dims();
      ctx.clearRect(0, 0, W, H);

      const padTop = 16, padBottom = 16;
      const usableH = H - padTop - padBottom;
      const cx = W / 2;

      // Sky gradient: warm haze near the base, cold deep blue near the summit
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0c1830');
      sky.addColorStop(0.55, '#0a1a22');
      sky.addColorStop(1, '#04160f');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Zone bands, mountain-shaped (narrower near the summit)
      let prevMax = 0;
      zones.forEach(z => {
        const t0 = prevMax / SUMMIT, t1 = z.max / SUMMIT;
        const y0 = padTop + usableH * (1 - t0);
        const y1 = padTop + usableH * (1 - t1);
        const wBot = widthFrac(t0), wTop = widthFrac(t1);
        const grad = ctx.createLinearGradient(0, y1, 0, y0);
        grad.addColorStop(0, z.color);
        grad.addColorStop(1, z.color);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx - (W * wBot) / 2, y0);
        ctx.lineTo(cx + (W * wBot) / 2, y0);
        ctx.lineTo(cx + (W * wTop) / 2, y1);
        ctx.lineTo(cx - (W * wTop) / 2, y1);
        ctx.closePath();
        ctx.fill();
        // subtle top-edge highlight between bands for definition
        ctx.strokeStyle = 'rgba(0,0,0,0.14)';
        ctx.lineWidth = 1;
        ctx.stroke();
        prevMax = z.max;
      });

      // Cloud layer drifting across the cloud-forest band (~2000–3000 m)
      const cloudZ = zones[2];
      const cy0 = padTop + usableH * (1 - (cloudZ.max - 400) / SUMMIT);
      const cy1 = padTop + usableH * (1 - cloudZ.max / SUMMIT);
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 5; i++) {
        const fx = cx + (Math.sin(i * 2.1) * W * 0.28);
        const fy = cy1 + (cy0 - cy1) * ((i + 1) / 6);
        ctx.beginPath();
        ctx.ellipse(fx, fy, W * 0.09, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Snow-cap sparkle near the summit
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#ffffff';
      const peakY = padTop + usableH * (1 - 0.985);
      ctx.beginPath();
      ctx.ellipse(cx, peakY, W * widthFrac(0.99) * 0.32, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Marker line + icon for the current altitude
      const markY = padTop + usableH * (1 - alt / SUMMIT);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(8, markY);
      ctx.lineTo(W - 8, markY);
      ctx.stroke();
      ctx.setLineDash([]);

      const zone = zoneFor(alt);
      const labelIcon = zone.species[0][0];
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(labelIcon, W - 12, Math.max(20, markY - 8));

      ctx.fillStyle = '#fffbea';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(Math.round(alt) + ' m', 12, Math.max(14, markY - 6));

      // Reference line + label for Humboldt's 1802 high point
      if (alt < HIGH_POINT - 40 || alt > HIGH_POINT + 40) {
        const hy = padTop + usableH * (1 - HIGH_POINT / SUMMIT);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(8, hy);
        ctx.lineTo(W - 8, hy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Humboldt\'s 1802 high point', 12, hy - 4);
      }

      // Elevation axis labels
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('0 m', W - 8, padTop + usableH - 4);
      ctx.fillText(SUMMIT.toLocaleString() + ' m (summit)', W - 8, padTop + 12);
    }

    const kit = useKit
      ? SimKit.canvas2d(canvas, { box: wrap, onResize: () => draw(currentAlt()) })
      : null;

    function update() {
      const alt  = currentAlt();
      const zone = zoneFor(alt);
      const temp = tempFor(alt);
      const lat  = latFor(alt);
      document.getElementById('hv-alt-val').textContent = alt + ' m';
      document.getElementById('hv-r-alt').textContent = alt + ' m';
      document.getElementById('hv-r-temp').textContent = temp.toFixed(1) + '°C';
      document.getElementById('hv-r-zone').textContent = zone.name;
      document.getElementById('hv-r-boil').textContent = boilFor(alt).toFixed(1) + '°C';
      document.getElementById('hv-r-lat').textContent = '~' + lat.toFixed(0) + '°';
      document.getElementById('hv-r-desc').textContent = zone.desc;
      document.getElementById('hv-r-analog').textContent = 'At sea level, this climate matches ' + analogFor(lat);
      document.getElementById('hv-r-species').innerHTML = zone.species
        .map(([icon, name]) => '<span class="hv-species-chip"><span class="icon">' + icon + '</span>' + name + '</span>')
        .join('');
      canvas.setAttribute('aria-valuenow', alt);
      canvas.setAttribute('aria-valuetext', alt + ' meters, ' + zone.name);
      draw(alt);
    }

    document.getElementById('hv-alt-slider').addEventListener('input', update);
    if (!kit) window.addEventListener('resize', update);

    function setAltFromClientY(clientY) {
      const rect = canvas.getBoundingClientRect();
      const padTop = 16, padBottom = 16;
      const usableH = rect.height - padTop - padBottom;
      const frac = 1 - Math.min(1, Math.max(0, (clientY - rect.top - padTop) / usableH));
      const alt = Math.round((frac * SUMMIT) / 10) * 10;
      document.getElementById('hv-alt-slider').value = Math.min(SUMMIT, Math.max(0, alt));
      update();
    }
    canvas.addEventListener('click', (e) => setAltFromClientY(e.clientY));
    canvas.addEventListener('keydown', (e) => {
      const slider = document.getElementById('hv-alt-slider');
      const step = e.shiftKey ? 500 : 100;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { slider.value = Math.min(SUMMIT, currentAlt() + step); update(); e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { slider.value = Math.max(0, currentAlt() - step); update(); e.preventDefault(); }
    });

    window.hvPreset = function(alt) {
      document.getElementById('hv-alt-slider').value = alt;
      update();
    };

    update();
  })();

})();
