(() => {
  const water = document.querySelector('#water');
  const slider = document.querySelector('#stroke');
  const balanceEl = document.getElementById('balance');
  const directionEl = document.getElementById('direction');
  const phaseValueEl = document.getElementById('phase-value');
  const tailEl = document.getElementById('tail');

  const gillWaterVals = document.getElementById('gillWaterVals');
  const gillBloodVals = document.getElementById('gillBloodVals');
  const gillBloodDir = document.getElementById('gillBloodDir');
  const gillModeNote = document.getElementById('gillModeNote');
  const gillModeBtns = document.querySelectorAll('[data-gill-flow]');
  let gillFlow = 'countercurrent';

  if (water && balanceEl && directionEl) {
    const responses = {
      sea: balanceEl.textContent,
      equal: 'Fish ⇄ surrounding water. Water crosses both ways at the same average rate. There is no net water movement in this model.',
      fresh: 'Surrounding water → fish. A freshwater bony fish gains water, releases dilute urine, and takes up salts through its gills.'
    };
    water.addEventListener('change', event => {
      directionEl.textContent = { sea: '→', equal: '⇄', fresh: '←' }[event.target.value];
      balanceEl.textContent = responses[event.target.value];
    });
  }

  function drawTail() {
    if (!slider || !phaseValueEl || !tailEl) return;
    phaseValueEl.value = slider.value + '%';
    const phase = Number(slider.value) * Math.PI / 50;
    const base = 9 * Math.sin(phase);
    const tip = 24 * Math.sin(phase - 0.8);
    tailEl.setAttribute('d',
      `M145 44 Q180 ${54 + base} 218 ${55 + tip} L244 ${36 + tip} L240 ${62 + tip} L244 ${88 + tip} L218 ${69 + tip} Q180 ${70 + base} 145 80Z`);
  }

  if (slider) {
    slider.addEventListener('input', drawTail);
    drawTail();
  }

  function setGillFlow(mode) {
    gillFlow = mode === 'concurrent' ? 'concurrent' : 'countercurrent';
    gillModeBtns.forEach(btn => {
      const active = btn.dataset.gillFlow === gillFlow;
      btn.setAttribute('aria-pressed', String(active));
      btn.classList.toggle('active', active);
    });
    if (gillFlow === 'countercurrent') {
      if (gillWaterVals) gillWaterVals.innerHTML = '<b>90</b><b>65</b><b>40</b>';
      if (gillBloodVals) gillBloodVals.innerHTML = '<b>75</b><b>50</b><b>25</b>';
      if (gillBloodDir) gillBloodDir.textContent = '← Blood flows left (countercurrent)';
      if (gillModeNote) gillModeNote.textContent = 'Opposite flow maintains an oxygen gradient along the entire fold, letting blood reach 75.';
    } else {
      if (gillWaterVals) gillWaterVals.innerHTML = '<b>90</b><b>60</b><b>50</b>';
      if (gillBloodVals) gillBloodVals.innerHTML = '<b>10</b><b>40</b><b>50</b>';
      if (gillBloodDir) gillBloodDir.textContent = 'Blood flows right → (concurrent)';
      if (gillModeNote) gillModeNote.textContent = 'Same-direction flow hits equilibrium at 50 halfway across the fold—diffusion stops and blood never passes 50.';
    }
  }

  gillModeBtns.forEach(btn => {
    btn.addEventListener('click', () => setGillFlow(btn.dataset.gillFlow));
  });

  function dots(group, count, color) {
    const parent = document.getElementById(group);
    if (!parent) return [];
    return Array.from({ length: count }, () => {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', 4);
      dot.setAttribute('fill', color);
      parent.append(dot);
      return dot;
    });
  }

  const particles = dots('water-dots', 12, '#a4f0ef');
  const streams = [dots('flow-dots', 8, '#8ce3df'), dots('flow-dots', 8, '#ffaba7')];
  const oxygen = dots('flow-dots', 5, '#ffdc78');

  function place(dot, x, y) {
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
  }

  function renderSalt(time) {
    const outward = { sea: 9, equal: 6, fresh: 3 }[water.value];
    particles.forEach((dot, i) => {
      const progress = (time / 4 + i * 0.38197) % 1;
      place(dot, 35 + 330 * (i < outward ? progress : 1 - progress), 9 + i * 7);
    });
  }

  function renderGills(time) {
    const concurrent = gillFlow === 'concurrent';
    streams.forEach((row, side) => row.forEach((dot, i) => {
      const x = (time * 42 + i * 50) % 400;
      const posX = side === 0 ? x : (concurrent ? x : 400 - x);
      place(dot, posX, side ? 62 : 14);
    }));
    oxygen.forEach((dot, i) => {
      const x = concurrent ? 40 + i * 38 : 40 + i * 80;
      place(dot, x, 14 + 48 * ((time / 2 + i / 5) % 1));
    });
  }

  const models = {
    salt: renderSalt,
    gills: renderGills,
    swim(time) {
      slider.value = Math.round((time % 2) * 50);
      drawTail();
    }
  };

  document.querySelectorAll('[data-play]').forEach(button => {
    const name = button.dataset.play;
    const render = models[name];
    const label = button.textContent.slice(5);
    let playing = false;
    let time = 0;
    const clock = SimKit.loop(dt => {
      time += dt;
      render(time);
    }, { el: button.closest('section'), maxDt: 0.1 });
    clock.pause();
    render(time);
    function setPlaying(active) {
      playing = active;
      button.textContent = (active ? 'Pause ' : 'Play ') + label;
      if (active) clock.resume();
      else clock.pause();
    }
    button.addEventListener('click', () => setPlaying(!playing));
    if (name === 'salt' && water) water.addEventListener('change', () => render(time));
    if (name === 'gills') {
      gillModeBtns.forEach(btn => btn.addEventListener('click', () => render(time)));
    }
    if (name === 'swim' && slider) slider.addEventListener('input', () => {
      setPlaying(false);
      time = Number(slider.value) / 50;
    });
  });
})();
