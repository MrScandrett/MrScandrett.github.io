(() => {
  'use strict';
  const radius = document.getElementById('ss-radius');
  const coverage = document.getElementById('ss-coverage');
  const detail = document.getElementById('ss-detail');
  const mesh = document.getElementById('ss-mesh');
  const cover = document.getElementById('ss-cover');
  const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const svgNS = 'http://www.w3.org/2000/svg';
  const setText = (id, value) => { document.getElementById(id).textContent = value; };

  function drawMesh(bands) {
    mesh.replaceChildren();
    const step = 250 / bands;
    for (let row = 0; row <= bands; row++) {
      const y = 41 + row * step;
      const count = bands * 2;
      for (let col = 0; col < count; col++) {
        const x1 = 95 + col * step;
        const x2 = x1 + step;
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', x1); line.setAttribute('y1', y);
        line.setAttribute('x2', x2); line.setAttribute('y2', y);
        line.setAttribute('stroke', '#9bc8d4'); line.setAttribute('stroke-opacity', '.43');
        line.setAttribute('stroke-width', '1'); mesh.append(line);
        if (row < bands) {
          const diag = document.createElementNS(svgNS, 'line');
          diag.setAttribute('x1', x1); diag.setAttribute('y1', y);
          diag.setAttribute('x2', x2); diag.setAttribute('y2', y + step);
          diag.setAttribute('stroke', '#9bc8d4'); diag.setAttribute('stroke-opacity', '.34');
          diag.setAttribute('stroke-width', '1'); mesh.append(diag);
        }
      }
    }
    for (let col = 0; col <= bands * 2; col++) {
      const x = 95 + col * step;
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', x); line.setAttribute('y1', '41');
      line.setAttribute('x2', x); line.setAttribute('y2', '291');
      line.setAttribute('stroke', '#9bc8d4'); line.setAttribute('stroke-opacity', '.43');
      line.setAttribute('stroke-width', '1'); mesh.append(line);
    }
  }

  function update() {
    const r = Number(radius.value);
    const fraction = Number(coverage.value) / 100;
    const bands = Number(detail.value);
    const area = 4 * Math.PI * r * r;
    const volume = 4 / 3 * Math.PI * r * r * r;
    setText('ss-radius-value', `${r} m`);
    setText('ss-coverage-value', `${coverage.value}%`);
    setText('ss-detail-value', `${bands} bands`);
    setText('ss-area', `${number.format(area)} m²`);
    setText('ss-covered', `${number.format(area * fraction)} m²`);
    setText('ss-volume', `${number.format(volume)} m³`);
    drawMesh(bands);
    const start = -Math.PI / 2;
    const end = start + fraction * Math.PI * 2;
    const sx = 220 + 125 * Math.cos(start), sy = 166 + 125 * Math.sin(start);
    const ex = 220 + 125 * Math.cos(end), ey = 166 + 125 * Math.sin(end);
    cover.setAttribute('d', fraction === 1
      ? 'M 220 41 A 125 125 0 1 1 219.99 41'
      : `M ${sx} ${sy} A 125 125 0 ${fraction > .5 ? 1 : 0} 1 ${ex} ${ey}`);
  }

  [radius, coverage, detail].forEach(input => input.addEventListener('input', update));
  document.getElementById('ss-double').addEventListener('click', () => {
    radius.value = Math.min(Number(radius.max), Number(radius.value) * 2);
    update();
  });
  document.getElementById('ss-reset').addEventListener('click', () => {
    radius.value = 60; coverage.value = 60; detail.value = 8; update();
  });
  document.querySelectorAll('[data-predict]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-predict]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    setText('ss-prediction-feedback', button.dataset.predict === '4'
      ? 'Yes. Area contains r², so it grows 4×. Volume contains r³, so it grows 8×.'
      : 'Try a radius of 40 m, then 80 m. Compare both readouts and look at the powers of r.');
  }));
  const reveal = document.getElementById('ss-reveal');
  const answer = document.getElementById('ss-answer');
  reveal.addEventListener('click', () => {
    answer.hidden = !answer.hidden;
    reveal.setAttribute('aria-expanded', String(!answer.hidden));
    reveal.textContent = answer.hidden ? 'Show reasoning' : 'Hide reasoning';
  });
  const bandwidth = document.getElementById('ss-bandwidth');
  const snr = document.getElementById('ss-snr');
  function updateChannel() {
    const b = Number(bandwidth.value);
    const ratio = Number(snr.value);
    const capacity = b * Math.log2(1 + ratio);
    setText('ss-bandwidth-value', `${b} MHz`);
    setText('ss-snr-value', `${ratio}:1`);
    setText('ss-capacity', `${capacity.toFixed(1)} Mb/s`);
    document.getElementById('ss-capacity-bar').style.width = `${Math.min(100, capacity / (40 * Math.log2(41)) * 100)}%`;
  }
  [bandwidth, snr].forEach(input => input.addEventListener('input', updateChannel));
  document.getElementById('ss-data-reset').addEventListener('click', () => {
    bandwidth.value = 10; snr.value = 10; updateChannel();
  });
  update();
  updateChannel();
})();
