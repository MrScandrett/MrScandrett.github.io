(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const rad = deg => deg * Math.PI / 180;
  function textAt(id, x, y, text) {
    const node = $(id);
    node.setAttribute('x', x); node.setAttribute('y', y); node.textContent = text;
  }
  function draw() {
    const a = Number($('angle').value), h = Number($('scale').value);
    const top = $('reference').value === 'top', theta = top ? 90 - a : a;
    const width = 300 * Math.cos(rad(a)), height = 300 * Math.sin(rad(a));
    const x = 90 + width, y = 285 - height;
    $('tri-shape').setAttribute('d', `M90 285 L${x} 285 L${x} ${y} Z`);
    $('right-marker').setAttribute('d', `M${x-16} 285 V269 H${x}`);
    textAt('angle-label', top ? x-55 : 120, top ? y+47 : 270, `θ = ${theta}°`);
    textAt('adjacent-label', 90+width/2-55, 317, top ? 'Opposite' : 'Adjacent');
    textAt('opposite-label', x+10, 285-height/2, top ? 'Adjacent' : 'Opposite');
    textAt('hypotenuse-label', 90+width/2-85, 285-height/2-18, 'Hypotenuse');
    const o = h * Math.sin(rad(theta)), adj = h * Math.cos(rad(theta));
    $('angle-value').textContent = `${a}°`; $('scale-value').textContent = h;
    $('side-readout').textContent = `Relative to θ = ${theta}°: opposite ≈ ${o.toFixed(2)}, adjacent ≈ ${adj.toFixed(2)}, hypotenuse = ${h}.`;
    for (const [id, n, d] of [['sin',o,h],['cos',adj,h],['tan',o,adj]]) {
      $(`${id}-readout`).textContent = `${n.toFixed(2)} ÷ ${d.toFixed(2)} ≈ ${(n/d).toFixed(3)}`;
    }
  }
  for (const id of ['angle','scale','reference']) $(id).addEventListener('input', draw);
  $('reset').addEventListener('click', () => {
    $('angle').value = 35; $('scale').value = 10; $('reference').value = 'bottom'; draw();
  });
  $('pair').addEventListener('change', () => {
    $('pair-feedback').textContent = ({OH:'SOH: sine uses opposite and hypotenuse.', AH:'CAH: cosine uses adjacent and hypotenuse.', OA:'TOA: tangent uses opposite and adjacent.'})[$('pair').value] || '';
  });
  const questions = [
    {title:'Identify a ratio',text:'Relative to θ, opposite = 6 and hypotenuse = 10. Choose the ratio and enter its value.',ratio:'sin',answer:.6,unit:'ratio',hint:'O and H appear in SOH. Divide opposite by hypotenuse.',solution:'sin θ = 6 / 10 = 0.6.'},
    {title:'Find the opposite side',text:'θ = 30° and hypotenuse = 12 cm. Find the opposite side.',ratio:'sin',answer:6,unit:'cm',hint:'sin 30° = x / 12. Multiply both sides by 12.',solution:'x = 12 × sin 30° = 6.0 cm.'},
    {title:'Find the adjacent side',text:'θ = 60° and hypotenuse = 14 cm. Find the adjacent side.',ratio:'cos',answer:7,unit:'cm',hint:'A and H mean CAH: cos 60° = x / 14.',solution:'x = 14 × cos 60° = 7.0 cm.'},
    {title:'Find the hypotenuse',text:'θ = 40° and adjacent = 8 cm. Find the hypotenuse.',ratio:'cos',answer:8/Math.cos(rad(40)),unit:'cm',hint:'cos 40° = 8 / h. Multiply by h, then divide by cos 40°.',solution:'h = 8 / cos 40° ≈ 10.4 cm. It is longer than the adjacent side.'},
    {title:'Measure a height',text:'You stand 20 m horizontally from a tree. The angle from the ground to its top is 35°. Treat the observation point as ground level. Find the height.',ratio:'tan',answer:20*Math.tan(rad(35)),unit:'m',hint:'Height is opposite; ground distance is adjacent. tan 35° = height / 20.',solution:'height = 20 × tan 35° ≈ 14.0 m. For an eye-level observation, add your eye height.'},
    {title:'Find an angle',text:'Opposite = 5 cm and adjacent = 12 cm. Find θ in degrees.',ratio:'tan',answer:Math.atan(5/12)*180/Math.PI,unit:'degrees',hint:'tan θ = 5 / 12. Use inverse tangent in degree mode.',solution:'θ = tan⁻¹(5 / 12) ≈ 22.6°.'}
  ];
  let index = 0;
  const solved = new Set();
  function load() {
    const q = questions[index];
    $('progress').textContent = `Challenge ${index+1} of ${questions.length} · ${solved.size} solved`;
    $('challenge-title').textContent = q.title; $('challenge-text').textContent = q.text;
    $('answer-label').textContent = `Your answer (${q.unit})`;
    $('choice').value = ''; $('answer').value = ''; $('feedback').textContent = ''; $('hint-text').textContent = '';
    $('next').disabled = index === questions.length-1;
  }
  $('practice-form').addEventListener('submit', event => {
    event.preventDefault();
    const q = questions[index], value = $('answer').value.trim();
    if (!$('choice').value) { $('feedback').textContent = 'Choose a ratio first. Which two sides are involved?'; return; }
    if ($('choice').value !== q.ratio) { $('feedback').textContent = `Try again. ${q.hint}`; return; }
    if (!value || !Number.isFinite(Number(value))) { $('feedback').textContent = 'The ratio is right. Enter a numerical answer.'; return; }
    if (Math.abs(Number(value)-q.answer) > .051) { $('feedback').textContent = `The ratio is right. Check your rearrangement and degree mode. ${q.hint}`; return; }
    solved.add(index);
    $('feedback').textContent = `Correct! ${q.solution}${solved.size === questions.length ? ' All six challenges solved.' : ''}`;
    $('progress').textContent = `Challenge ${index+1} of ${questions.length} · ${solved.size} solved`;
  });
  $('hint').addEventListener('click', () => { $('hint-text').textContent = questions[index].hint; });
  $('next').addEventListener('click', () => { if (index < questions.length-1) { index++; load(); $('challenge-title').setAttribute('tabindex','-1'); $('challenge-title').focus(); } });
  $('restart').addEventListener('click', () => { index = 0; solved.clear(); load(); });
  draw(); load();
})();
