(() => {
  const data = ANIMAL_KINGDOM_DATA.phyla;
  const IMG = '../../../assets/images/classification-of-life/phyla/';
  const choices = document.getElementById('phyla');
  const mosaic = document.getElementById('phylum-mosaic');
  const panel = document.getElementById('phylum-panel');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 'Chordata', comparison = false;

  const credit = ph => `<span class="al-credit" data-no-glossary>Photo: ${ph.credit}, <a href="${ph.source}" target="_blank" rel="noopener">${ph.license}</a> via Wikimedia Commons</span>`;

  Object.keys(data).forEach(key => {
    const p = data[key];
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.phylum = key;
    button.innerHTML = `<img src="${IMG}${p.photo.src}" alt="" loading="lazy" width="320" height="200"><span><b>${p.name}</b>${p.commonName}</span>`;
    button.addEventListener('click', () => { selected = key; comparison = false; render(); });
    choices.append(button);

    if (mosaic) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.setAttribute('aria-label', `Explore ${p.name}: ${p.commonName}`);
      tile.innerHTML = `<img src="${IMG}${p.photo.src}" alt="" width="320" height="240"><span>${p.name}</span>`;
      tile.addEventListener('click', () => {
        selected = key; comparison = false; render();
        choices.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
        choices.querySelector(`[data-phylum="${key}"]`).focus({ preventScroll: true });
      });
      mosaic.append(tile);
    }
  });

  function render() {
    choices.hidden = comparison;
    [...choices.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.phylum === selected)));
    document.getElementById('explore-view').setAttribute('aria-pressed', String(!comparison));
    document.getElementById('compare-view').setAttribute('aria-pressed', String(comparison));
    if (comparison) {
      panel.innerHTML = `<p class="al-eyebrow">Compare body plans</p><h2>Six selected phyla, side by side</h2><p>Read each row across. Similarity in one trait does not establish closest ancestry.</p><div class="al-table-wrap" tabindex="0" role="region" aria-label="Scrollable comparison table"><table><caption>Body-plan evidence: typical patterns and important exceptions</caption><thead><tr><th scope="col">Phylum</th><th scope="col">Symmetry</th><th scope="col">Support</th><th scope="col">Movement</th></tr></thead><tbody>${Object.values(data).map(p => `<tr><th scope="row"><span class="al-table-thumb"><img src="${IMG}${p.photo.src}" alt="" loading="lazy" width="44" height="44">${p.name}</span></th><td>${p.symmetry}</td><td>${p.skeleton}</td><td>${p.movement}</td></tr>`).join('')}</tbody></table></div>`;
    } else {
      const p = data[selected];
      const ph = p.photo;
      panel.innerHTML = `<div class="al-research">
        <figure data-zoomable data-lightbox-group="phyla"><img src="${IMG}${ph.src}" alt="${ph.name.replace(/<[^>]+>/g, '')}" width="900" height="675"><figcaption><b>${ph.name}.</b> ${ph.caption}${credit(ph)}</figcaption></figure>
        <div>
          <h2><small>Phylum</small>${p.name}: ${p.commonName}</h2>
          <p>${p.description}</p>
          <h3>Body-plan evidence</h3>
          <ul class="al-traits">${p.traits.map(t => `<li>${t}</li>`).join('')}</ul>
          <div class="al-facts"><div><strong>Symmetry</strong><p>${p.symmetry}</p></div><div><strong>Support</strong><p>${p.skeleton}</p></div><div><strong>Movement</strong><p>${p.movement}</p></div></div>
          <h3>Examples</h3>
          <p>${p.examples.join(' · ')}</p>
          <div class="al-closer"><p><strong>Look more closely:</strong> ${p.keyFact}</p></div>
        </div>
      </div>`;
    }
  }
  document.getElementById('explore-view').addEventListener('click', () => { comparison = false; render(); });
  document.getElementById('compare-view').addEventListener('click', () => { comparison = true; render(); });
  render();
})();
