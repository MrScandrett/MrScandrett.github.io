(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const layers = {
    gold: ['Head of gold', 'Nebuchadnezzar', 'Daniel 2:37–38 identifies the head with Nebuchadnezzar, whose rule is given by God.', 'Babylon', 'Babylon'],
    silver: ['Chest and arms of silver', 'A second kingdom', 'Daniel 2:39 describes a kingdom that follows and is inferior to the first. It does not name this kingdom.', 'Medo-Persia', 'Media'],
    bronze: ['Belly and thighs of bronze', 'A third kingdom', 'Daniel 2:39 describes a third kingdom ruling broadly. The material appears in the dream; the empire name is not supplied here.', 'Greece', 'Persia'],
    iron: ['Legs of iron', 'A fourth kingdom', 'Daniel 2:40 compares the fourth kingdom with iron that breaks and crushes. It does not name Rome or Greece in this chapter.', 'Rome', 'The Hellenistic kingdom'],
    feet: ['Feet of iron and clay', 'A divided kingdom', 'Daniel 2:41–43 explains the mixture as a divided kingdom, partly strong and partly fragile, whose parts do not hold together.', 'A divided order, often associated with kingdoms after Rome', 'Successor kingdoms after Alexander'],
    stone: ['Stone not cut by hands', 'God’s enduring kingdom', 'Daniel 2:34–35 describes a stone striking the feet and becoming a mountain. Verses 44–45 explain a kingdom God establishes that will never be destroyed.', 'God’s kingdom', 'God’s kingdom']
  };
  let selected = 'gold';
  let timers = [];
  const lensNotes = {
    text: 'Start with the passage: only the head’s ruler is named here. Other empire names belong to interpretations.',
    traditional: 'This widely used Christian reading follows Babylon, Medo-Persia, Greece, and Rome. Details about the divided kingdom vary among interpreters. These labels go beyond the names supplied in Daniel 2.',
    historical: 'The USCCB notes read the sequence as Babylon, Media, Persia, and the Hellenistic kingdom, with Alexander’s successors as the divided stage. This is a historical interpretation of the symbols.'
  };
  function selectLayer(key) {
    if (!layers[key]) return;
    selected = key;
    const layer = layers[key];
    const lens = $('dream-reading').value;
    document.querySelectorAll('[data-dream-key], [data-dream-shape]').forEach(el => {
      const active = (el.dataset.dreamKey || el.dataset.dreamShape) === key;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-pressed', String(active));
    });
    const title = document.createElement('strong');
    title.textContent = layer[0] + ' · ' + (lens === 'text' ? layer[1] : layer[lens === 'traditional' ? 3 : 4]);
    const body = document.createElement('span');
    body.textContent = layer[2] + (lens === 'text' ? '' : ' In this reading: ' + layer[lens === 'traditional' ? 3 : 4] + '. Compare that identification with what the passage states.');
    $('dream-explainer').replaceChildren(title, body);
    $('dream-reading-note').textContent = lensNotes[lens];
    document.querySelectorAll('[data-dream-key]').forEach(btn => {
      const row = layers[btn.dataset.dreamKey];
      btn.querySelector('small').textContent = lens === 'text' ? row[1] : row[lens === 'traditional' ? 3 : 4];
    });
  }
  document.querySelectorAll('[data-dream-key]').forEach(btn => btn.addEventListener('click', () => selectLayer(btn.dataset.dreamKey)));
  document.querySelectorAll('[data-dream-shape]').forEach(shape => {
    shape.addEventListener('click', () => selectLayer(shape.dataset.dreamShape));
    shape.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectLayer(shape.dataset.dreamShape); }
    });
  });
  $('dream-reading').addEventListener('change', () => selectLayer(selected));
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function runDream() {
    clearTimers();
    const prediction = document.querySelector('input[name="dream-target"]:checked');
    $('dream-prediction-feedback').textContent = prediction ? (prediction.value === 'feet' ? 'Your prediction matches the passage. ' : 'Compare your prediction with the passage. ') + 'The stone strikes the iron-and-clay feet in Daniel 2:34. All the materials then crumble together (2:35).' : 'Watch where the stone strikes, then check Daniel 2:34–35. You can predict a target before replaying.';
    const stage = $('dream-stage');
    stage.classList.remove('is-striking');
    void stage.offsetWidth;
    stage.classList.add('is-striking');
    selectLayer('stone');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('dream-run').textContent = reduced ? 'Replay the dream' : 'The stone is moving…';
    $('dream-caption').textContent = reduced ? 'The statue crumbles; the stone becomes a mountain (2:34–35).' : 'A stone not cut by human hands';
    if (!reduced) {
      timers.push(setTimeout(() => { $('dream-caption').textContent = 'The stone strikes the mixed feet (2:34).'; }, 1500));
      timers.push(setTimeout(() => { $('dream-caption').textContent = 'The statue crumbles; the stone becomes a mountain (2:35).'; }, 3000));
      timers.push(setTimeout(() => { $('dream-run').textContent = 'Replay the dream'; }, 3700));
    }
  }
  function resetDream(resetLens = false) {
    clearTimers();
    $('dream-stage').classList.remove('is-striking');
    $('dream-run').textContent = 'Send the stone';
    $('dream-caption').textContent = 'Select a material, then run the dream.';
    document.querySelectorAll('input[name="dream-target"]').forEach(input => { input.checked = false; });
    $('dream-prediction-feedback').textContent = 'Make a prediction, then send the stone.';
    if (resetLens) $('dream-reading').value = 'text';
    selectLayer('gold');
  }
  $('dream-run').addEventListener('click', runDream);
  $('dream-rock').addEventListener('click', runDream);
  $('dream-reset').addEventListener('click', () => resetDream());
  $('dan-reset').addEventListener('click', () => resetDream(true));
  resetDream(true);
})();
