(() => {
  'use strict';
  const stops = [
    ['May 1804 · Travel against the current', 'The Corps departed the Camp Dubois area near St. Louis and traveled up the Missouri. Rowing, poling, and towing boats required coordinated labor. Skill: estimate distance and record direction even when progress is slow.'],
    ['Winter 1804–1805 · Fort Mandan', 'Near Mandan and Hidatsa communities, the Corps built winter quarters, traded, and gathered information. Skill: prepare supplies and learn from people with local knowledge.'],
    ['Summer 1805 · Great Falls', 'The falls interrupted boat travel. A difficult overland portage moved cargo around them. The iron-frame boat experiment failed at its seams. Skill: test materials and adapt transport plans.'],
    ['Late summer–autumn 1805 · Across the Rockies', 'Shoshone horses and guides helped the Corps attempt the mountain crossing; Nez Perce assistance was important after the difficult Bitterroot passage. Skill: combine local route expertise with logistics.'],
    ['Winter 1805–1806 · Pacific coast', 'After descending the Clearwater, Snake, and Columbia river systems, the Corps spent the winter at Fort Clatsop. Skill: build shelter and record coastal conditions while obtaining food through hunting and trade.'],
    ['September 1806 · Home with records', 'The return included separate parties exploring different routes before reunion. The expedition reached St. Louis on September 23. Skill: bring records together and distinguish measured observations from estimates.']
  ];
  function showStop(i) {
    const panel = document.querySelector('#stop-detail');
    panel.replaceChildren();
    const title = document.createElement('h3'); title.textContent = stops[i][0];
    const copy = document.createElement('p'); copy.textContent = stops[i][1];
    panel.append(title, copy);
    document.querySelectorAll('[data-stop]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.stop) === i)));
  }
  document.querySelectorAll('[data-stop]').forEach(b => b.addEventListener('click', () => showStop(Number(b.dataset.stop))));
  showStop(0);
  const slider = document.querySelector('#sun-angle');
  function updateAngle() {
    const angle = Number(slider.value), altitude = angle / 2;
    document.querySelector('#latitude').textContent = `Reflected angle ${angle}° ÷ 2 = ${altitude}° solar altitude. Latitude ≈ 90° − ${altitude}° = ${90 - altitude}° N.`;
    const radians = altitude * Math.PI / 180;
    const x = 170 + 180 * Math.cos(radians), y = 210 - 180 * Math.sin(radians);
    document.querySelector('#nav-sun').setAttribute('cx', x);
    document.querySelector('#nav-sun').setAttribute('cy', y);
    document.querySelector('#sun-ray').setAttribute('d', `M170 210L${x} ${y}`);
    // The reflected sight line meets a level reflecting surface below the eye.
    const surfaceY = 260, reflectedX = 170 + (surfaceY - 210) / Math.tan(radians);
    document.querySelector('#reflection-ray').setAttribute('d', `M170 210L${reflectedX} ${surfaceY}`);
    document.querySelector('#angle-arc').setAttribute('d', `M260 210A90 90 0 0 0 ${170 + 90 * Math.cos(radians)} ${210 - 90 * Math.sin(radians)}`);
    document.querySelector('#altitude-label').textContent = `Altitude ${altitude}°`;
    document.querySelector('#nav-desc').textContent = `Solar altitude ${altitude} degrees; reflected angle ${angle} degrees. The reflected reading is twice the altitude above the horizon.`;
  }
  slider.addEventListener('input', updateAngle); updateAngle();
  document.querySelectorAll('[data-answer]').forEach(b => b.addEventListener('click', () => {
    b.closest('.lab').querySelector('.feedback').textContent = b.dataset.answer === 'right' ? 'Supported. It floated, but leaking seams made the boat unusable. Test the seal under realistic conditions, then adapt the design or choose another craft.' : 'Reconsider the observation: the boat initially floated. The later failure concerned water entering through its seams.';
  }));
  const sites = {
    a: ['Mercury above local background. No dated latrine, matching artifacts, or journal location has been identified.', 'A chemical clue is worth investigating, but it does not identify the expedition. Find context, date the deposit, and consider other mercury sources.'],
    b: ['Mercury in a trench consistent with a latrine; early nineteenth-century artifacts; nearby hearths; location consistent with journal descriptions.', 'Several independent clues support an expedition campsite interpretation. Confidence grows when dating, background samples, and alternative-source checks agree. This is support, not absolute proof.'],
    c: ['High mercury near a documented later industrial waste deposit; artifacts date long after 1806.', 'The later industrial activity offers a stronger explanation of this mercury. A high concentration alone does not link a site to Lewis and Clark.']
  };
  const site = document.querySelector('#site');
  function updateSite() { document.querySelector('#site-evidence').textContent = sites[site.value][0]; document.querySelector('#interpretation').textContent = ''; }
  site.addEventListener('change', updateSite); updateSite();
  document.querySelector('#interpret').addEventListener('click', () => { document.querySelector('#interpretation').textContent = sites[site.value][1]; });
})();