(() => {
  'use strict';
  const svg = document.getElementById('bmTile');
  const areaControl = document.getElementById('bmArea');
  const areaValue = document.getElementById('bmAreaValue');
  const perimeterValue = document.getElementById('bmPerimeter');
  const comparison = document.getElementById('bmComparison');
  const names = { 3: 'Triangle', 4: 'Square', 6: 'Hexagon' };
  const shapes = document.querySelectorAll('input[name="bmShape"]');
  const ns = 'http://www.w3.org/2000/svg';
  const perimeter = (n, area) => Math.sqrt(4 * n * area * Math.tan(Math.PI / n));
  const polygon = (points) => {
    const node = document.createElementNS(ns, 'polygon');
    node.setAttribute('points', points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '));
    node.setAttribute('class', 'bm-cell');
    svg.appendChild(node);
  };
  function draw(n, area) {
    svg.querySelectorAll('polygon').forEach(node => node.remove());
    const scale = Math.sqrt(area / 4);
    if (n === 4) {
      const side = 55 * scale;
      for (let row = -1; row < Math.ceil(220 / side) + 1; row++) for (let col = -1; col < Math.ceil(420 / side) + 1; col++) {
        const x = col * side + 18, y = row * side + 8;
        polygon([[x,y],[x+side,y],[x+side,y+side],[x,y+side]]);
      }
    } else if (n === 3) {
      const side = 70 * scale, height = side * Math.sqrt(3) / 2;
      for (let row = -1; row < Math.ceil(220 / height) + 1; row++) for (let col = -1; col < Math.ceil(420 / side) + 1; col++) {
        const x = col * side + (row % 2) * side / 2, y = row * height;
        polygon([[x,y],[x+side,y],[x+side/2,y+height]]);
        polygon([[x+side,y],[x+side*1.5,y+height],[x+side/2,y+height]]);
      }
    } else {
      const radius = 39 * scale, width = Math.sqrt(3) * radius;
      for (let row = -1; row < Math.ceil(220 / (radius * 1.5)) + 1; row++) for (let col = -1; col < Math.ceil(420 / width) + 1; col++) {
        const cx = col * width + (row % 2) * width / 2 + 15;
        const cy = row * radius * 1.5 + 10;
        polygon(Array.from({length: 6}, (_, i) => {
          const a = (i * 60 - 30) * Math.PI / 180;
          return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
        }));
      }
    }
  }
  function render() {
    const n = Number(document.querySelector('input[name="bmShape"]:checked').value);
    const area = Number(areaControl.value);
    areaValue.textContent = `${area} units²`;
    perimeterValue.textContent = perimeter(n, area).toFixed(2);
    const saving = (1 - perimeter(6, area) / perimeter(n, area)) * 100;
    comparison.textContent = n === 6
      ? 'The hexagon has the shortest boundary of these three shapes at this area.'
      : `A hexagon of the same area uses ${saving.toFixed(1)}% less boundary than this ${names[n].toLowerCase()}.`;
    svg.setAttribute('aria-label', `${names[n]} tiling, with equal-area cells arranged without gaps`);
    draw(n, area);
  }
  shapes.forEach(input => input.addEventListener('change', render));
  areaControl.addEventListener('input', render);
  render();
})();
