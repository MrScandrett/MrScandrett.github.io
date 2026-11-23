(() => {
  const water = document.querySelector('#water');
  const slider = document.querySelector('#stroke');

  function dots(group, count, color) {
    const parent = document.getElementById(group);
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
    streams.forEach((row, side) => row.forEach((dot, i) => {
      const x = (time * 42 + i * 50) % 400;
      place(dot, side ? 400 - x : x, side ? 62 : 14);
    }));
    oxygen.forEach((dot, i) => place(dot, 40 + i * 80, 14 + 48 * ((time / 2 + i / 5) % 1)));
  }

  const models = { salt: renderSalt, gills: renderGills, swim(time) {
    slider.value = Math.round((time % 2) * 50);
    drawTail();
  } };

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
    if (name === 'salt') water.addEventListener('change', () => render(time));
    if (name === 'swim') slider.addEventListener('input', () => {
      setPlaying(false);
      time = Number(slider.value) / 50;
    });
  });
})();
