(function () {
  'use strict';
  const canvas = document.getElementById('climate-p3-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const status = document.getElementById('climate-p3-status');
  const hoverEl = document.getElementById('climate-p3-hover');

  const paths = {
    preindustrial: { name: 'Pre-industrial reference', start: 0.0,  end: 0.15, color: '#9fb7c8', unc: 0.15, tau: 2.2 },
    today:         { name: 'Current trajectory',       start: 1.25, end: 2.7,  color: '#ffb454', unc: 0.45, tau: 2.0 },
    paris:         { name: 'Paris-aligned',            start: 1.25, end: 1.55, color: '#59d4ff', unc: 0.28, tau: 2.6 },
    bau:           { name: 'High emissions',           start: 1.25, end: 4.4,  color: '#ff667d', unc: 0.70, tau: 1.6 }
  };

  let selected = 'today';
  let customLive = null; // { anomaly, ocean, isCustom, label }
  let hoverT = null; // 0..1 across 2020..2100

  function curve(start, end, t, tau) {
    const rate = tau || 2.1;
    const lag = 1 - Math.exp(-t * rate);
    return start + (end - start) * lag;
  }

  function getBounds() {
    let minT = 0;
    let maxT = 5;
    if (customLive && customLive.isCustom) {
      if (customLive.anomaly < 0) minT = Math.min(-3, Math.floor(customLive.anomaly - 0.5));
      if (customLive.anomaly > 4.6) maxT = Math.min(12, Math.ceil(customLive.anomaly + 0.8));
    }
    return { minT, maxT };
  }

  function yForTemp(degC, h, pad, minT, maxT) {
    return h - pad - ((degC - minT) / (maxT - minT)) * (h - pad * 2);
  }

  function updateDimensions() {
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(300, Math.floor(rect.width || 800));
    const cssH = 250;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: cssW, h: cssH };
  }

  function customCurveParams() {
    if (!customLive || !customLive.isCustom) return null;
    const customEnd = Math.max(-10, Math.min(10, customLive.anomaly));
    const customStart = customEnd < 0 || selected === 'preindustrial' ? 0.0 : 1.25;
    const customTau = 2.8 - (customLive.ocean / 100) * 1.4;
    return { start: customStart, end: customEnd, tau: customTau };
  }

  function draw() {
    const { w, h } = updateDimensions();
    const p = paths[selected];
    const pad = 44;
    const { minT, maxT } = getBounds();

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#040b18';
    ctx.fillRect(0, 0, w, h);

    // Gridlines & temperature axis
    ctx.strokeStyle = 'rgba(180,215,255,0.14)';
    ctx.fillStyle = '#b9ccdf';
    ctx.font = '12px system-ui, sans-serif';
    ctx.lineWidth = 1;
    const step = maxT - minT > 7 ? 2 : 1;
    for (let tempVal = Math.ceil(minT); tempVal <= Math.floor(maxT); tempVal += step) {
      const y = yForTemp(tempVal, h, pad, minT, maxT);
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
      ctx.fillText((tempVal > 0 ? '+' : '') + tempVal + '°C', 4, y + 4);
    }

    if (minT < 0) {
      const y0 = yForTemp(0, h, pad, minT, maxT);
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.moveTo(pad, y0);
      ctx.lineTo(w - pad, y0);
      ctx.stroke();
      ctx.restore();
    }

    // Paris 1.5°C & 2.0°C threshold guide lines
    [
      { temp: 1.5, label: '1.5°C Paris goal', color: 'rgba(89, 212, 255, 0.42)' },
      { temp: 2.0, label: '2.0°C guardband',  color: 'rgba(255, 209, 102, 0.38)' }
    ].forEach(ref => {
      if (ref.temp < minT || ref.temp > maxT) return;
      const ry = yForTemp(ref.temp, h, pad, minT, maxT);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = ref.color;
      ctx.beginPath();
      ctx.moveTo(pad, ry);
      ctx.lineTo(w - pad, ry);
      ctx.stroke();
      ctx.fillStyle = ref.color;
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(ref.label, w - pad - 92, ry - 4);
      ctx.restore();
    });

    // Year labels (2020 - 2100)
    ctx.fillStyle = '#b9ccdf';
    ctx.font = '12px system-ui, sans-serif';
    for (let i = 0; i <= 4; i++) {
      ctx.fillText(String(2020 + i * 20), pad + (w - pad * 2) * i / 4 - 14, h - 12);
    }

    // Faint reference context lines for all non-selected paths
    Object.entries(paths).forEach(([key, path]) => {
      if (key === selected) return;
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = path.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const t = i / 80;
        const x = pad + t * (w - pad * 2);
        const y = yForTemp(curve(path.start, path.end, t, path.tau), h, pad, minT, maxT);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    });

    // Shaded uncertainty plume for selected scenario
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const x = pad + t * (w - pad * 2);
      const val = curve(p.start, p.end, t, p.tau) + p.unc * (0.35 + 0.65 * t);
      const y = yForTemp(val, h, pad, minT, maxT);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    for (let i = 80; i >= 0; i--) {
      const t = i / 80;
      const x = pad + t * (w - pad * 2);
      const val = curve(p.start, p.end, t, p.tau) - p.unc * (0.35 + 0.65 * t);
      const y = yForTemp(val, h, pad, minT, maxT);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = p.color + '30';
    ctx.fill();

    // Central trajectory curve for selected scenario
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const x = pad + t * (w - pad * 2);
      const y = yForTemp(curve(p.start, p.end, t, p.tau), h, pad, minT, maxT);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    const custom = customCurveParams();
    if (custom) {
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const t = i / 80;
        const x = pad + t * (w - pad * 2);
        const y = yForTemp(curve(custom.start, custom.end, t, custom.tau), h, pad, minT, maxT);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();

      const customLabel = customLive.label || 'Live slider path';
      status.textContent = `${p.name} (${p.end.toFixed(1)}°C ±${p.unc.toFixed(2)}°C) vs. ${customLabel} (${custom.end >= 0 ? '+' : ''}${custom.end.toFixed(1)}°C, dashed white). Ocean thermal inertia bends the response curve.`;
    } else {
      status.textContent = `${p.name}: illustrative 2100 anomaly ${p.end.toFixed(1)}°C, uncertainty ±${p.unc.toFixed(2)}°C. Ocean lag bends the line instead of jumping instantly.`;
    }

    // Hover / keyboard crosshair marker
    if (hoverT !== null) {
      const hx = pad + hoverT * (w - pad * 2);
      const year = Math.round(2020 + hoverT * 80);
      const baseVal = curve(p.start, p.end, hoverT, p.tau);
      const hy = yForTemp(baseVal, h, pad, minT, maxT);

      ctx.save();
      ctx.strokeStyle = 'rgba(220, 238, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx, pad * 0.5);
      ctx.lineTo(hx, h - pad + 4);
      ctx.stroke();

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      let hoverText = `Year ${year} · ${p.name}: ${baseVal >= 0 ? '+' : ''}${baseVal.toFixed(2)}°C (±${(p.unc * (0.35 + 0.65 * hoverT)).toFixed(2)}°C)`;
      if (custom) {
        const cVal = curve(custom.start, custom.end, hoverT, custom.tau);
        const cy = yForTemp(cVal, h, pad, minT, maxT);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hx, cy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        hoverText += ` · ${customLive.label || 'Live sliders'}: ${cVal >= 0 ? '+' : ''}${cVal.toFixed(2)}°C`;
      }
      ctx.restore();
      if (hoverEl) hoverEl.textContent = hoverText;
    } else if (hoverEl) {
      hoverEl.textContent = 'Hover or press ←/→ over the chart to inspect a year (2020–2100).';
    }
  }

  document.getElementById('climate-p3-actions').addEventListener('click', e => {
    const b = e.target.closest('[data-climate-path]');
    if (!b) return;
    selected = b.dataset.climatePath;
    document.querySelectorAll('[data-climate-path]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    draw();
  });

  function setHoverFromClientX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const pad = 44;
    const x = clientX - rect.left;
    hoverT = Math.max(0, Math.min(1, (x - pad) / Math.max(1, rect.width - pad * 2)));
    draw();
  }

  canvas.addEventListener('pointermove', e => setHoverFromClientX(e.clientX));
  canvas.addEventListener('pointerdown', e => setHoverFromClientX(e.clientX));
  canvas.addEventListener('pointerleave', () => {
    hoverT = null;
    draw();
  });
  canvas.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (hoverT === null) hoverT = 0.5;
      hoverT = Math.max(0, Math.min(1, hoverT + (e.key === 'ArrowRight' ? 0.05 : -0.05)));
      draw();
    } else if (e.key === 'Escape') {
      hoverT = null;
      draw();
    }
  });

  window.addEventListener('climate:update', e => {
    const d = e.detail;
    if (!d) return;
    if (d.preset && paths[d.preset]) {
      selected = d.preset;
      customLive = null;
      document.querySelectorAll('[data-climate-path]').forEach(x => {
        x.setAttribute('aria-pressed', String(x.dataset.climatePath === selected));
      });
    } else if (d.climate && d.state) {
      customLive = {
        anomaly: d.climate.tempAnomaly,
        ocean: d.state.ocean,
        isCustom: true,
        label: d.preset === 'iceage' ? 'Ice Age (LGM)' : 'Live sliders'
      };
    }
    draw();
  });

  window.addEventListener('resize', draw);
  if (window.ResizeObserver && canvas.parentElement) {
    new ResizeObserver(() => draw()).observe(canvas.parentElement);
  }

  draw();
}());
