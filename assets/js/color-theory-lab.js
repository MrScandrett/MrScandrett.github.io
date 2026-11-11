/* Screen-color experiments: explicit sRGB values, HSV geometry, WCAG luminance. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const hex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const unhex = value => value.slice(1).match(/../g).map(v => parseInt(v, 16));
  const luminance = rgb => rgb.map(c => { const s = c / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
  const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  function hsv(h, s, v) {
    s /= 100; v /= 100;
    return [5, 3, 1].map(n => { const k = (n + h / 60) % 6; return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255); });
  }
  let paints = [];
  const paintButtons = [...document.querySelectorAll('[data-paint]')];
  function updatePaint() {
    ['paint-one', 'paint-two'].forEach((id, i) => {
      $(id).style.background = paints[i] || '';
      $(id).innerHTML = paints[i] ? '' : `<span>${i + 1}</span>`;
    });
    $('paint-result').style.background = '';
    $('paint-result').innerHTML = '<span>?</span>';
    $('paint-result').classList.remove('mixed');
    $('mix-paint').disabled = paints.length < 2;
    $('mix-status').textContent = paints.length === 0 ? 'Choose your first color to get started.' : paints.length === 1 ? 'Nice choice! Pick one more color.' : 'What do you predict? Mix them to find out.';
  }
  paintButtons.forEach(button => button.addEventListener('click', () => {
    if (paints.length === 2) paints = [];
    paints.push(button.dataset.paint); updatePaint();
  }));
  $('random-paint').addEventListener('click', () => {
    paints = Array.from({ length: 2 }, () => paintButtons[Math.floor(Math.random() * paintButtons.length)].dataset.paint); updatePaint();
  });
  $('reset-paint').addEventListener('click', () => { paints = []; updatePaint(); });
  $('mix-paint').addEventListener('click', () => {
    if (paints.length < 2) return;
    const a = unhex(paints[0]), b = unhex(paints[1]);
    const result = hex(a.map((v, i) => (v + b[i]) / 2));
    $('paint-result').style.background = result;
    $('paint-result').innerHTML = '';
    $('paint-result').classList.remove('mixed'); void $('paint-result').offsetWidth; $('paint-result').classList.add('mixed');
    $('mix-status').textContent = `${paints[0]} + ${paints[1]} = ${result}. What would you name your new color?`;
  });
  // CIELAB (D65) to sRGB. Out-of-gamut values are flagged before clipping.
  function labToRgb(l, a, b) {
    const fy = (l + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
    const inverse = t => t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27);
    const x = .95047 * inverse(fx), y = inverse(fy), z = 1.08883 * inverse(fz);
    const linear = [3.2404542*x - 1.5371385*y - .4985314*z, -.969266*x + 1.8760108*y + .041556*z, .0556434*x - .2040259*y + 1.0572252*z];
    const gamut = linear.every(c => c >= -0.00001 && c <= 1.00001);
    return { gamut, rgb: linear.map(c => Math.round(255 * Math.max(0, Math.min(1, c <= .0031308 ? 12.92*c : 1.055*Math.pow(c, 1/2.4)-.055)))) };
  }
  const labCanvas = $('lab-map'), labContext = labCanvas.getContext('2d');
  let drawnLightness = null;
  function renderLab() {
    const l = Number($('lab-lightness').value), a = Number($('lab-a').value), b = Number($('lab-b').value);
    ['lightness', 'a', 'b'].forEach(id => { $('lab-' + id + '-out').value = $('lab-' + id).value; });
    if (drawnLightness !== l) {
      const image = labContext.createImageData(labCanvas.width, labCanvas.height);
      for (let y = 0; y < labCanvas.height; y++) for (let x = 0; x < labCanvas.width; x++) {
        const color = labToRgb(l, x / (labCanvas.width - 1) * 200 - 100, 100 - y / (labCanvas.height - 1) * 200);
        const i = (y * labCanvas.width + x) * 4;
        const shade = !color.gamut && (x + y) % 12 < 4 ? .65 : 1;
        color.rgb.forEach ( (v, channel) => { image.data[i + channel] = v * shade; }); image.data[i + 3] = 255;
      }
      labContext.putImageData(image, 0, 0); drawnLightness = l;
    } else {
      // Redraw the cached slice to erase the previous selection marker.
      labContext.putImageData(labContext._slice, 0, 0);
    }
    if (!labContext._slice || labContext._sliceL !== l) { labContext._slice = labContext.getImageData(0, 0, labCanvas.width, labCanvas.height); labContext._sliceL = l; }
    const x = (a + 100) / 200 * (labCanvas.width - 1), y = (100 - b) / 200 * (labCanvas.height - 1);
    labContext.beginPath(); labContext.arc(x, y, 8, 0, Math.PI * 2); labContext.strokeStyle = '#fff'; labContext.lineWidth = 5; labContext.stroke(); labContext.strokeStyle = '#111'; labContext.lineWidth = 2; labContext.stroke();
    const result = labToRgb(l, a, b), color = hex(result.rgb);
    $('lab-sample').style.background = color; $('lab-sample').style.color = luminance(result.rgb) > .3 ? '#111' : '#fff'; $('lab-hex').textContent = color;
    $('lab-status').textContent = result.gamut ? `L* ${l}, a* ${a}, b* ${b} is within the sRGB display range.` : `L* ${l}, a* ${a}, b* ${b} is outside sRGB. The sample is clipped to the nearest channel limits.`;
  }
  ['lightness', 'a', 'b'].forEach(id => $('lab-' + id).addEventListener('input', renderLab));
  function chooseLabPoint(event) {
    const rect = labCanvas.getBoundingClientRect();
    $('lab-a').value = Math.round(Math.max(-100, Math.min(100, (event.clientX - rect.left) / rect.width * 200 - 100)));
    $('lab-b').value = Math.round(Math.max(-100, Math.min(100, 100 - (event.clientY - rect.top) / rect.height * 200))); renderLab();
  }
  labCanvas.addEventListener('pointerdown', event => { labCanvas.setPointerCapture(event.pointerId); chooseLabPoint(event); });
  labCanvas.addEventListener('pointermove', event => { if (labCanvas.hasPointerCapture(event.pointerId)) chooseLabPoint(event); });
  labCanvas.addEventListener('keydown', event => {
    const directions = { ArrowLeft: ['lab-a', -1], ArrowRight: ['lab-a', 1], ArrowUp: ['lab-b', 1], ArrowDown: ['lab-b', -1] };
    if (!directions[event.key]) return; event.preventDefault(); const [id, direction] = directions[event.key]; $(id).value = Number($(id).value) + direction * (event.shiftKey ? 10 : 1); renderLab();
  });
  $('lab-neutral').addEventListener('click', () => { $('lab-a').value = 0; $('lab-b').value = 0; renderLab(); });
  renderLab();
  $('reveal').addEventListener('click', () => {
    const connected = $('reveal').getAttribute('aria-pressed') !== 'true';
    $('reveal').setAttribute('aria-pressed', String(connected));
    $('reveal').textContent = connected ? 'Separate the squares' : 'Connect the squares';
    $('context-stage').classList.toggle('connected', connected);
    $('perception-result').textContent = connected ? 'Identical: #ED8659 on both sides. The bridge uses that same color.' : 'Same RGB values, different surroundings. Does the difference return?';
  });
  $('surround').addEventListener('input', () => {
    const h = Number($('surround').value);
    document.querySelector('.surround.left').style.background = `hsl(${h} 65% 32%)`;
    document.querySelector('.surround.right').style.background = `hsl(${(h + 160) % 360} 65% 88%)`;
    $('surround-out').value = h + '°';
    $('context-stage').setAttribute('aria-label', `Identical #ED8659 squares on dark ${h} degree and light ${(h + 160) % 360} degree hue backgrounds`);
  });
  function renderLight() {
    const rgb = ['red', 'green', 'blue'].map((id, i) => {
      const value = Number($(id).value); $(id + '-out').value = value;
      document.querySelector('.beam.' + id).style.background = `rgb(${[0, 1, 2].map(n => n === i ? value : 0).join(',')})`;
      return value;
    });
    $('mix-hex').textContent = hex(rgb);
    $('light-stage').setAttribute('aria-label', `RGB light: red ${rgb[0]}, green ${rgb[1]}, blue ${rgb[2]}. Center mixture ${hex(rgb)}.`);
  }
  ['red', 'green', 'blue'].forEach(id => $(id).addEventListener('input', renderLight));
  document.querySelectorAll('[data-rgb]').forEach(button => button.addEventListener('click', () => {
    button.dataset.rgb.split(',').forEach((v, i) => { $(['red', 'green', 'blue'][i]).value = v; }); renderLight();
  }));
  const schemes = {
    analogous: { offsets: [-30, 0, 30], note: 'Neighbors: −30°, 0°, +30° from your base hue.' },
    complementary: { offsets: [0, 180], note: 'Opposites: two hues separated by 180° on this RGB wheel.' },
    triadic: { offsets: [0, 120, 240], note: 'Thirds: three hues spaced 120° apart.' },
    split: { offsets: [0, 150, 210], note: 'Split complement: base hue plus the neighbors of its opposite (150° and 210°).' },
    monochromatic: { offsets: [0, 0, 0], note: 'One hue: selected HSV value, then 65% and 35% of that value.' }
  };
  let palette = [], saved = null;
  function swatches(target, colors) {
    target.replaceChildren(...colors.map((color, i) => {
      const box = document.createElement('div'); box.className = 'swatch';
      const chip = document.createElement('div'); chip.className = 'swatch-color'; chip.style.background = color.hex;
      const caption = document.createElement('span'); caption.textContent = `${i + 1}. ${color.hex}`;
      const meta = document.createElement('small'); meta.textContent = `H ${color.h}° · V ${Math.round(color.v)}%`;
      box.append(chip, caption, meta); return box;
    }));
  }
  function renderPalette() {
    const h = Number($('hue').value), s = Number($('sat').value), v = Number($('val').value), key = $('harmony').value;
    ['hue', 'sat', 'val'].forEach(id => { $(id + '-out').value = $(id).value + (id === 'hue' ? '°' : '%'); });
    $('hue-center').textContent = h + '°'; $('harmony-note').textContent = schemes[key].note;
    palette = schemes[key].offsets.map((offset, i) => {
      const hue = (h + offset + 360) % 360, value = v * (key === 'monochromatic' ? [1, .65, .35][i] : 1);
      const rgb = hsv(hue, s, value); return { h: hue, s, v: value, rgb, hex: hex(rgb) };
    });
    $('markers').replaceChildren(...palette.map((color, i) => {
      const marker = document.createElement('span'); marker.className = 'marker'; marker.textContent = i + 1;
      const angle = (color.h - 90) * Math.PI / 180, radius = key === 'monochromatic' ? 31 + i * 7 : 39;
      marker.style.left = 50 + Math.cos(angle) * radius + '%'; marker.style.top = 50 + Math.sin(angle) * radius + '%'; return marker;
    }));
    $('wheel').setAttribute('aria-label', `RGB hue wheel. ${schemes[key].note} Swatch hues: ${palette.map(c => c.h + ' degrees').join(', ')}.`);
    swatches($('swatches'), palette);
    const scene = $('mood-scene');
    [0, 1, 2].forEach(i => scene.style.setProperty('--scene-' + i, palette[i % palette.length].hex));
  }
  ['hue', 'sat', 'val', 'harmony'].forEach(id => $(id).addEventListener('input', renderPalette));
  const moods = {
    sunny: { h: 38, s: 78, v: 96, harmony: 'analogous', prompt: 'Sunny & playful: warm neighboring hues can feel energetic. What else does this scene suggest to you?' },
    calm: { h: 190, s: 42, v: 88, harmony: 'analogous', prompt: 'Calm & airy: softer neighboring blues and greens create a quiet starting point. Does it feel calm to you?' },
    bold: { h: 285, s: 85, v: 90, harmony: 'complementary', prompt: 'Bold & electric: opposing hues create a strong contrast. Where does your eye go first?' },
    cozy: { h: 22, s: 65, v: 72, harmony: 'split', prompt: 'Cozy & earthy: muted warm color and cooler partners suggest a different atmosphere. What story could happen here?' }
  };
  document.querySelectorAll('[data-mood]').forEach(button => button.addEventListener('click', () => {
    const mood = moods[button.dataset.mood];
    $('hue').value = mood.h; $('sat').value = mood.s; $('val').value = mood.v; $('harmony').value = mood.harmony;
    $('mood-prompt').textContent = mood.prompt;
    renderPalette();
  }));
  $('save-palette').addEventListener('click', () => {
    saved = { colors: palette.map(c => ({ ...c })), scheme: $('harmony').selectedOptions[0].textContent, s: $('sat').value, v: $('val').value };
    swatches($('saved-swatches'), saved.colors);
    $('saved-palette').textContent = `Saved: ${saved.scheme}, S ${saved.s}%, V ${saved.v}%. Live palette remains on the left.`;
    $('save-palette').textContent = 'Replace saved comparison';
  });
  function renderContrast() {
    const ink = $('ink').value, paper = $('paper').value, ratio = contrast(unhex(ink), unhex(paper));
    $('type-preview').style.color = ink; $('type-preview').style.background = paper;
    // Never round up a failing ratio when determining conformance.
    $('ratio').textContent = (Math.floor(ratio * 100) / 100).toFixed(2) + ':1';
    $('contrast-result').textContent = ratio >= 4.5 ? 'Passes AA contrast for normal and large text.' : ratio >= 3 ? 'Passes AA for large text only. The smaller sample text fails.' : 'Below AA for both normal and large text.';
    $('pair-values').textContent = `Text ${ink.toUpperCase()} / background ${paper.toUpperCase()}. Relative luminance: ${luminance(unhex(ink)).toFixed(3)} / ${luminance(unhex(paper)).toFixed(3)}. Ratio shown to two decimals, rounded down.`;
  }
  ['ink', 'paper'].forEach(id => $(id).addEventListener('input', renderContrast));
  $('use-palette').addEventListener('click', () => { $('ink').value = palette[0].hex; $('paper').value = palette[palette.length - 1].hex; renderContrast(); });
  $('repair').addEventListener('click', () => {
    const bg = unhex($('paper').value);
    $('ink').value = contrast([0, 0, 0], bg) >= contrast([255, 255, 255], bg) ? '#000000' : '#ffffff'; renderContrast();
  });
  $('download').addEventListener('click', () => {
    const text = ['Color Theory Lab', 'Current palette: ' + $('harmony').selectedOptions[0].textContent, ...palette.map(c => `${c.hex}: H ${c.h}°, S ${c.s}%, V ${c.v}%`), saved ? 'Saved comparison: ' + saved.colors.map(c => c.hex).join(', ') : 'No saved comparison.', 'Tested text/background: ' + $('ink').value + ' / ' + $('paper').value, 'Contrast: ' + $('ratio').textContent, $('contrast-result').textContent, '', 'My observations:', $('observation').value, '', 'https://mrscandrett.github.io/lessons/design/color-theory-lab.html'].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = 'color-lab-notes.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  renderLight(); renderPalette(); renderContrast();
})();
