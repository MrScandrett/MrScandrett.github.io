/* Local, manually entered field measurements. No device connection or uploads. */
(function () {
  'use strict';
  const form = document.getElementById('scan-form');
  if (!form) return;
  const input = document.getElementById('scan-data');
  const status = document.getElementById('scan-status');
  const rows = document.getElementById('scan-rows');
  const canvas = document.getElementById('scan-canvas');
  let scans = [];
  let surface;
  const example = 'angle_deg,distance_cm\n30,115.5\n45,141.4\n60,115.5\n75,103.5\n90,100\n105,103.5\n120,115.5\n135,141.4\n150,115.5';
  function message(text, error) {
    status.textContent = text;
    status.toggleAttribute('data-error', !!error);
  }
  function draw() {
    if (!surface) return;
    const ctx = surface.ctx, w = surface.width, h = surface.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#eef5f3'; ctx.fillRect(0, 0, w, h);
    const margin = 34, size = Math.max(1, Math.min(w, h) - margin - 12);
    const px = x => margin + x / 600 * size;
    const py = y => h - margin - y / 600 * size;
    ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    for (let cm = 0; cm <= 600; cm += 50) {
      ctx.strokeStyle = cm % 100 ? '#d5e1df' : '#b9cdca'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px(cm), py(0)); ctx.lineTo(px(cm), py(600));
      ctx.moveTo(px(0), py(cm)); ctx.lineTo(px(600), py(cm)); ctx.stroke();
      if (cm % 100 === 0) {
        ctx.fillStyle = '#29424b'; ctx.fillText(cm, px(cm), h - 17);
        ctx.fillText(cm, 17, py(cm) + 4);
      }
    }
    ctx.fillStyle = '#29424b'; ctx.fillText('x (cm)', px(300), h - 3);
    ctx.fillText('y (cm)', margin + 24, 11);
    scans.forEach((scan, i) => {
      const color = i === 0 ? '#146b8c' : '#ac491e';
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5;
      scan.points.forEach(p => {
        ctx.globalAlpha = .35;
        ctx.beginPath(); ctx.moveTo(px(scan.x), py(scan.y)); ctx.lineTo(px(p.x), py(p.y)); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(px(p.x), py(p.y), 3, 0, Math.PI * 2); ctx.fill();
      });
      ctx.strokeRect(px(scan.x) - 4, py(scan.y) - 4, 8, 8);
      const a = (scan.heading + 90) * Math.PI / 180;
      ctx.beginPath(); ctx.moveTo(px(scan.x), py(scan.y));
      ctx.lineTo(px(scan.x + 20 * Math.cos(a)), py(scan.y + 20 * Math.sin(a))); ctx.stroke();
      ctx.fillText('S' + (i + 1), px(scan.x), py(scan.y) + 18);
    });
  }
  function refresh() {
    rows.replaceChildren();
    scans.forEach((scan, i) => scan.points.forEach(p => {
      const row = document.createElement('tr');
      [i + 1, p.angle, p.distance, p.x.toFixed(1), p.y.toFixed(1)].forEach(value => {
        const td = document.createElement('td'); td.textContent = value; row.append(td);
      });
      rows.append(row);
    }));
    draw();
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (scans.length >= 12) { message('Notebook full (12 scans). Undo or clear before adding more.', true); return; }
    const x = Number(document.getElementById('scan-x').value);
    const y = Number(document.getElementById('scan-y').value);
    const heading = Number(document.getElementById('scan-heading').value);
    const lines = input.value.split(/\r?\n/);
    if (lines.length > 200) { message('Use at most 200 lines per scan.', true); return; }
    const points = [];
    let skipped = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#') || /^angle_deg\s*,\s*distance_cm$/i.test(line)) continue;
      const parts = line.split(',').map(part => part.trim());
      const angle = Number(parts[0]);
      if (parts.length !== 2 || !parts[0] || !Number.isFinite(angle) || angle < 0 || angle > 180) {
        message('Line ' + (i + 1) + ': use angle 0–180, distance 2–200 (or NA). No scan added.', true); return;
      }
      if (parts[1].toUpperCase() === 'NA') { skipped++; continue; }
      const distance = Number(parts[1]);
      if (!parts[1] || !Number.isFinite(distance) || distance < 2 || distance > 200) {
        message('Line ' + (i + 1) + ': distance must be 2–200 cm, or NA for no echo. No scan added.', true); return;
      }
      const a = (heading + angle) * Math.PI / 180;
      const point = { angle, distance, x: x + distance * Math.cos(a), y: y + distance * Math.sin(a) };
      if (point.x < 0 || point.x > 600 || point.y < 0 || point.y > 600) {
        message('Line ' + (i + 1) + ': endpoint falls outside the 600 cm plot. Check the pose. No scan added.', true); return;
      }
      points.push(point);
    }
    if (!points.length) { message('No valid echoes to plot. NA leaves the space unknown. No scan added.', true); return; }
    scans.push({ x, y, heading, points }); refresh();
    message('Scan ' + scans.length + ' added: ' + points.length + ' endpoints; ' + skipped + ' unknown readings skipped.');
  });
  document.getElementById('scan-example').addEventListener('click', () => {
    input.value = example;
    document.getElementById('scan-x').value = 300;
    document.getElementById('scan-y').value = 100;
    document.getElementById('scan-heading').value = 0;
    message('Example loaded: a wall 100 cm ahead and side walls 100 cm away. Press Add scan to plot.');
  });
  document.getElementById('scan-undo').addEventListener('click', () => {
    scans.pop(); refresh(); message(scans.length + ' scans remain.');
  });
  document.getElementById('scan-clear').addEventListener('click', () => {
    scans = []; refresh(); message('Notebook cleared. Your input is ready to add again.');
  });
  document.getElementById('scan-export').addEventListener('click', () => {
    if (!scans.length) { message('Add a scan before exporting.', true); return; }
    const csv = ['scan,sensor_x_cm,sensor_y_cm,heading_deg,angle_deg,distance_cm,endpoint_x_cm,endpoint_y_cm'];
    scans.forEach((scan, i) => scan.points.forEach(p => {
      csv.push([i + 1, scan.x, scan.y, scan.heading, p.angle, p.distance, p.x.toFixed(2), p.y.toFixed(2)].join(','));
    }));
    const url = URL.createObjectURL(new Blob([csv.join('\n') + '\n'], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url; link.download = 'classroom-map-scans.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('Exported ' + scans.length + ' scans with pose and endpoint coordinates.');
  });
  surface = SimKit.canvas2d(canvas, { box: canvas.parentElement, onResize: draw });
  refresh();
})();
