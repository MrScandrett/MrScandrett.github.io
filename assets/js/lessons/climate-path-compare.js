(function () {
  'use strict';
  const canvas = document.getElementById('climate-p3-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const status = document.getElementById('climate-p3-status');

  const paths = {
    preindustrial: { name: 'Pre-industrial reference', start: 0.0, end: 0.15, color: '#9fb7c8', unc: 0.15, tau: 2.2 },
    today:         { name: 'Current trajectory',       start: 1.25, end: 2.7, color: '#ffb454', unc: 0.45, tau: 2.0 },
    paris:         { name: 'Paris-aligned',            start: 1.25, end: 1.55, color: '#59d4ff', unc: 0.28, tau: 2.6 },
    bau:           { name: 'High emissions',           start: 1.25, end: 4.4, color: '#ff667d', unc: 0.70, tau: 1.6 }
  };

  let selected = 'today';
  let customLive = null; // { anomaly, ocean, isCustom }

  function curve(start, end, t, tau) {
    const rate = tau || 2.1;
    const lag = 1 - Math.exp(-t * rate);
    return start + (end - start) * lag;
  }

  function yForTemp(degC, h, pad) {
    // Map -0.5°C .. 5.0°C onto chart vertical span
    const minT = 0, maxT = 5;
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

  function draw() {
    const { w, h } = updateDimensions();
    const p = paths[selected], pad = 42;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#040b18';
    ctx.fillRect(0, 0, w, h);

    // Gridlines & temperature axis
    ctx.strokeStyle = 'rgba(180,215,255,0.14)';
    ctx.fillStyle = '#b9ccdf';
    ctx.font = '12px system-ui, sans-serif';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const tempVal = 5 - i;
      const y = yForTemp(tempVal, h, pad);
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
      ctx.fillText(tempVal + '°C', 6, y + 4);
    }

    // Paris 1.5°C & 2.0°C threshold guide lines
    [
      { temp: 1.5, label: '1.5°C Paris goal', color: 'rgba(89, 212, 255, 0.38)' },
      { temp: 2.0, label: '2.0°C guardband',  color: 'rgba(255, 209, 102, 0.35)' }
    ].forEach(ref => {
      const ry = yForTemp(ref.temp, h, pad);
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

    // Shaded uncertainty plume for selected scenario
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const x = pad + t * (w - pad * 2);
      const val = curve(p.start, p.end, t, p.tau) + p.unc * (0.35 + 0.65 * t);
      const y = yForTemp(val, h, pad);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    for (let i = 80; i >= 0; i--) {
      const t = i / 80;
      const x = pad + t * (w - pad * 2);
      const val = curve(p.start, p.end, t, p.tau) - p.unc * (0.35 + 0.65 * t);
      const y = yForTemp(val, h, pad);
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
      const y = yForTemp(curve(p.start, p.end, t, p.tau), h, pad);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // If the user adjusted sliders to a custom state, overlay the live custom trajectory
    if (customLive && customLive.isCustom) {
      const customEnd = Math.max(-0.4, Math.min(5.2, customLive.anomaly));
      const customStart = selected === 'preindustrial' ? 0.0 : 1.25;
      // Higher ocean heat absorption increases thermal lag (slower approach to equilibrium)
      const customTau = 2.8 - (customLive.ocean / 100) * 1.4;
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const t = i / 80;
        const x = pad + t * (w - pad * 2);
        const y = yForTemp(curve(customStart, customEnd, t, customTau), h, pad);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();

      status.textContent = `${p.name} (${p.end.toFixed(1)}°C ±${p.unc.toFixed(2)}°C) vs. Live slider path (${customEnd >= 0 ? '+' : ''}${customEnd.toFixed(1)}°C by 2100, dashed white). Ocean thermal inertia bends the response curve.`;
    } else {
      status.textContent = `${p.name}: illustrative 2100 anomaly ${p.end.toFixed(1)}°C, uncertainty ±${p.unc.toFixed(2)}°C. Ocean lag bends the line instead of jumping instantly.`;
    }
  }

  document.getElementById('climate-p3-actions').addEventListener('click', e => {
    const b = e.target.closest('[data-climate-path]');
    if (!b) return;
    selected = b.dataset.climatePath;
    document.querySelectorAll('[data-climate-path]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    draw();
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
        isCustom: true
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
