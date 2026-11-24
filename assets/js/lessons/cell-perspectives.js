// Each path starts with the illustration already selected in the lesson.
(() => {
  const cheek = ['Cheek lining', 'cheek-swab', 'One example of animal tissue is the sheet of cells lining your cheek.'];
  const person = ['Human', 'human-cheek', 'These lining cells form the moist inner surface of the human cheek.'];
  const leaf = ['Leaf tissue', 'pond-leaf', 'Many photosynthetic cells sit side by side within a leaf.'];
  const pond = ['Whole plant', 'pond-plant', 'An aquatic plant carries many leaves along its stem. Each leaf contains photosynthetic tissue.'];
  const paths = {
    animal: [cheek, person],
    'cheek-swab': [person],
    plant: [leaf, pond],
    'pond-leaf': [pond],
    'root-hair': [['Root', 'root-tip', 'Many epidermal cells grow hairs along the root just behind its tip.'], ['Whole plant', 'young-plant', 'Below the shoot, the root system absorbs water and minerals.']],
    neuron: [['Human', 'human-brain', 'The brain is one place in the human nervous system where neurons form circuits.']],
    muscle: [['Human', 'human-arm', 'Bundles of skeletal muscle fibers form muscles such as the biceps in the upper arm.']],
    'red-blood-cell': [['Blood vessel', 'blood-vessel', 'Red blood cells travel together in plasma inside blood vessels.'], ['Human', 'human-blood', 'The heart circulates these cells through vessels throughout the body.']],
    bacteria: [['Culture', 'yogurt-culture', 'One bacterial cell is already a whole organism. A yogurt culture contains many individual bacteria.']],
    'yogurt-culture': [['One organism', 'bacteria', 'Look closer at one representative rod-shaped bacterium. Each cell in the culture is an individual organism.']]
  };

  for (const figure of document.querySelectorAll('.cell-figure')) {
    const image = figure.querySelector('img');
    const caption = figure.querySelector('figcaption');
    const original = new URL(image.src);
    const key = original.pathname.split('/').pop().replace('.svg', '');
    const steps = paths[key];
    if (!steps) continue;
    const first = [key === 'yogurt-culture' ? 'Culture' : ['pond-leaf','cheek-swab'].includes(key) ? 'Specimen' : 'Cell', key, image.alt];
    const levels = [first, ...steps];
    const controls = document.createElement('div');
    controls.className = 'perspective-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Choose viewing scale');
    caption.setAttribute('aria-live', 'polite');
    for (const [index, [label, file, description]] of levels.entries()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.setAttribute('aria-pressed', String(index === 0));
      button.addEventListener('click', () => {
        image.src = new URL(file + '.svg', original).href;
        image.alt = description;
        image.setAttribute('aria-label', description);
        caption.firstChild.textContent = description + ' ';
        for (const item of controls.children) item.setAttribute('aria-pressed', String(item === button));
      });
      controls.append(button);
    }
    figure.prepend(controls);
  }
})();
