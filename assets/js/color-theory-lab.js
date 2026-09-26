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
  }
  ['hue', 'sat', 'val', 'harmony'].forEach(id => $(id).addEventListener('input', renderPalette));
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
