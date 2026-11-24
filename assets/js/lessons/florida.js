(() => {
  'use strict';
  const skyNames = { sunrise: 'Atlantic sunrise', sunshine: 'Peninsula sunshine', thunder: 'Afternoon thunderclouds', rain: 'Rain over the Everglades', sunset: 'Gulf Coast sunset' };
  const atmosphereToggle = document.getElementById('fl-atmosphere-toggle');
  const skyLabel = document.getElementById('fl-sky-label');
  const scenes = [...document.querySelectorAll('[data-fl-scene]')];
  let atmospherePaused = false;
  let sceneUpdatePending = false;
  function updateSky() {
    sceneUpdatePending = false;
    if (atmospherePaused) return;
    const focusLine = window.innerHeight * .45;
    let active = scenes[0];
    for (const scene of scenes) {
      if (scene.getBoundingClientRect().top <= focusLine) active = scene;
    }
    const sky = active.dataset.flScene;
    document.body.dataset.flSky = sky;
    skyLabel.textContent = skyNames[sky];
  }
  window.addEventListener('scroll', () => {
    if (!sceneUpdatePending) {
      sceneUpdatePending = true;
      requestAnimationFrame(updateSky);
    }
  }, { passive: true });
  window.addEventListener('resize', updateSky);
  atmosphereToggle.addEventListener('click', () => {
    atmospherePaused = !atmospherePaused;
    document.body.classList.toggle('fl-atmosphere-paused', atmospherePaused);
    atmosphereToggle.setAttribute('aria-pressed', String(atmospherePaused));
    atmosphereToggle.textContent = atmospherePaused ? 'Resume atmosphere' : 'Pause atmosphere';
    if (!atmospherePaused) updateSky();
  });
  updateSky();
  const habitats = {
    wetlands: ['Everglades · A slow-moving wetland', 'Shallow water moves through sawgrass marshes and other habitats. Small changes in elevation change which plants grow. Alligators and wading birds are part of this connected system.', 'Drainage and altered water flow.', 'If less clean water reaches a marsh, what could happen to fish and the birds that eat them?'],
    mangroves: ['Mangroves · Where fresh and salt water meet', 'Salt-tolerant coastal trees grow in tidal water. Their tangled roots shelter young fish, while birds feed and nest nearby.', 'Coastal construction and changes in water quality.', 'How might removing a nursery habitat affect adult fish farther offshore?'],
    reef: ['Coral reef · Built by animals', 'Corals are tiny animals whose colonies build reef structures. Many reef-building corals depend on algae living inside their tissues. Florida’s reefs support diverse marine life.', 'Ocean warming, disease, and pollution.', 'Why can losing living coral affect fish that do not eat coral?'],
    springs: ['Springs · Groundwater comes to light', 'Water stored in the limestone aquifer emerges at springs and feeds rivers. Some warm-water spring areas provide winter refuges for manatees.', 'Groundwater withdrawals and excess nutrients in runoff.', 'How can a decision made inland change a river downstream?'],
    pine: ['Pine flatwoods · A landscape shaped by fire', 'Pine trees, grasses, and low shrubs live on flat land. Many plants are adapted to periodic fire. Carefully managed prescribed fire can help maintain habitat.', 'Development, habitat fragmentation, and disrupted fire cycles.', 'Why might preventing every fire change which plants and animals can live here?']
  };
  const readout = document.getElementById('habitat-readout');
  const mapSvg = document.getElementById('fl-map-svg');
  const pinEls = {};

  function selectHabitat(key, shouldFocusPin) {
    if (!habitats[key]) return;
    document.querySelectorAll('[data-habitat]').forEach(other => other.setAttribute('aria-pressed', String(other.dataset.habitat === key)));
    const [title, description, pressure, question] = habitats[key];
    readout.dataset.activeHabitat = key;
    readout.replaceChildren();
    const heading = document.createElement('h3'); heading.textContent = title;
    const text = document.createElement('p'); text.textContent = description;
    const prompt = document.createElement('p'); prompt.textContent = `Pressure: ${pressure} Think: ${question}`;
    readout.append(heading, text, prompt);
    Object.keys(pinEls).forEach(id => {
      const active = id === key;
      pinEls[id].classList.toggle('is-active', active);
      pinEls[id].setAttribute('aria-pressed', String(active));
    });
    if (shouldFocusPin && pinEls[key]) pinEls[key].focus();
  }

  if (mapSvg && window.EarthEngine) {
    const E = window.EarthEngine;
    const SVGNS = 'http://www.w3.org/2000/svg';
    const proj = E.projection('mercator', {
      extent: [[18, 18], [542, 422]],
      geometry: { type: 'MultiPoint', coordinates: [[-88.0, 24.0], [-79.2, 31.2]] }
    }).clipExtent([[0, 0], [560, 440]]);

    const svgEl = (tag, attrs, text) => {
      const n = document.createElementNS(SVGNS, tag);
      Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, String(v)));
      if (text != null) n.textContent = text;
      return n;
    };

    mapSvg.append(
      svgEl('rect', { width: 560, height: 440, fill: '#0e3650' }),
      svgEl('path', { d: E.path(proj, E.data().land), fill: '#527c63', stroke: '#a8ceb5', 'stroke-width': 1 }),
      svgEl('path', { d: E.path(proj, E.data().countries), fill: 'none', stroke: '#8bb89c', 'stroke-width': 0.7, opacity: 0.7 })
    );

    [
      ['Gulf of Mexico', [-85.8, 26.8]],
      ['Atlantic Ocean', [-79.4, 28.0]],
      ['Florida Straits', [-81.5, 24.1]]
    ].forEach(([label, coord]) => {
      const [x, y] = proj(coord);
      mapSvg.appendChild(svgEl('text', { x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': 'middle', class: 'fl-sea-label' }, label));
    });

    [
      ['Tallahassee', [-84.28, 30.44], 0, -9, 'middle'],
      ['St. Augustine', [-81.31, 29.90], 8, 3, 'start'],
      ['Space Coast', [-80.60, 28.57], 8, 3, 'start'],
      ['Tampa', [-82.46, 27.95], -8, 4, 'end'],
      ['Miami', [-80.19, 25.76], 9, 4, 'start']
    ].forEach(([name, coord, dx, dy, anchor]) => {
      const [x, y] = proj(coord);
      mapSvg.append(
        svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 3.2, fill: '#e8f4f8', stroke: '#082233', 'stroke-width': 1 }),
        svgEl('text', { x: (x + dx).toFixed(1), y: (y + dy).toFixed(1), 'text-anchor': anchor, class: 'fl-city-label' }, name)
      );
    });

    [
      { id: 'springs', label: 'Springs', coord: [-82.05, 29.22], dx: -9, dy: -6, anchor: 'end' },
      { id: 'pine', label: 'Pine flatwoods', coord: [-81.15, 27.55], dx: 10, dy: 4, anchor: 'start' },
      { id: 'mangroves', label: 'Mangroves', coord: [-81.65, 25.88], dx: -10, dy: 4, anchor: 'end' },
      { id: 'wetlands', label: 'Everglades', coord: [-80.75, 25.75], dx: 0, dy: -12, anchor: 'middle' },
      { id: 'reef', label: 'Coral reef', coord: [-80.40, 24.92], dx: 10, dy: 5, anchor: 'start' }
    ].forEach(pin => {
      const [x, y] = proj(pin.coord);
      const g = svgEl('g', {
        class: 'fl-map-pin',
        tabindex: '0',
        role: 'button',
        'aria-label': `Explore ${pin.label} habitat on Florida map`,
        'aria-pressed': String(pin.id === 'wetlands')
      });
      g.append(
        svgEl('circle', { class: 'fl-pin-ring', cx: x.toFixed(1), cy: y.toFixed(1), r: 10, fill: 'rgba(19,93,85,0.28)', stroke: '#ffffff', 'stroke-width': 1.8 }),
        svgEl('circle', { class: 'fl-pin-core', cx: x.toFixed(1), cy: y.toFixed(1), r: 5.5, fill: '#22c55e', stroke: '#082233', 'stroke-width': 1.2 }),
        svgEl('text', { x: (x + pin.dx).toFixed(1), y: (y + pin.dy).toFixed(1), 'text-anchor': pin.anchor }, pin.label)
      );
      g.addEventListener('click', () => selectHabitat(pin.id, false));
      g.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectHabitat(pin.id, false);
        }
      });
      pinEls[pin.id] = g;
      mapSvg.appendChild(g);
    });
    if (pinEls.wetlands) pinEls.wetlands.classList.add('is-active');
  }

  document.querySelectorAll('[data-habitat]').forEach(button => {
    button.addEventListener('click', () => selectHabitat(button.dataset.habitat, false));
  });
  const quiz = document.getElementById('fl-quiz');
  const result = document.getElementById('quiz-result');
  quiz.addEventListener('submit', event => {
    event.preventDefault();
    let score = 0, answered = 0;
    quiz.querySelectorAll('fieldset').forEach(field => {
      const selected = field.querySelector('input:checked');
      if (selected) answered++;
      const correct = selected && selected.value === field.dataset.answer;
      if (correct) score++;
      field.querySelector('.fl-feedback').textContent = !selected ? 'Choose an answer, then check again.' : `${correct ? 'Correct.' : 'Try again.'} ${field.dataset.explanation}`;
    });
    result.textContent = `${score} of 5 correct.${answered < 5 ? ` Answer the remaining ${5 - answered} question(s).` : score === 5 ? ' Field mission complete! Explain one connection in your own words.' : ' Review the feedback and try again.'}`;
  });
  quiz.addEventListener('reset', () => {
    quiz.querySelectorAll('.fl-feedback').forEach(item => { item.textContent = ''; });
    result.textContent = '';
  });
})();
