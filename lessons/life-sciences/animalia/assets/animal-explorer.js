(() => {
  const data = ANIMAL_KINGDOM_DATA.phyla;
  const choices = document.getElementById('phyla');
  const panel = document.getElementById('phylum-panel');
  let selected = 'Chordata', comparison = false;
  Object.keys(data).forEach(key => {
    const button = document.createElement('button');
    button.textContent = `${key} · ${data[key].commonName}`;
    button.dataset.phylum = key;
    button.addEventListener('click', () => { selected = key; render(); });
    choices.append(button);
  });
  function render() {
    choices.hidden = comparison;
    [...choices.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.phylum === selected)));
    document.getElementById('explore-view').setAttribute('aria-pressed', String(!comparison));
    document.getElementById('compare-view').setAttribute('aria-pressed', String(comparison));
    if (comparison) {
      panel.innerHTML = `<h2>Compare six selected phyla</h2><p>Read each row across. Similarity in one trait does not establish closest ancestry.</p><div class="animal-table-wrap" tabindex="0" role="region" aria-label="Scrollable comparison table"><table><caption>Body-plan evidence: typical patterns and important exceptions</caption><thead><tr><th scope="col">Phylum</th><th scope="col">Symmetry</th><th scope="col">Support</th><th scope="col">Movement</th></tr></thead><tbody>${Object.values(data).map(p => `<tr><th scope="row">${p.name}</th><td>${p.symmetry}</td><td>${p.skeleton}</td><td>${p.movement}</td></tr>`).join('')}</tbody></table></div>`;
    } else {
      const p = data[selected];
      panel.innerHTML = `<h2>${p.name}: ${p.commonName}</h2><p>${p.description}</p><h3>Body-plan evidence</h3><ul>${p.traits.map(t => `<li>${t}</li>`).join('')}</ul><div class="animal-facts"><div><strong>Symmetry</strong><p>${p.symmetry}</p></div><div><strong>Support</strong><p>${p.skeleton}</p></div><div><strong>Movement</strong><p>${p.movement}</p></div></div><h3>Examples</h3><p>${p.examples.join(' · ')}</p><h3>Look more closely</h3><p>${p.keyFact}</p>`;
    }
  }
  document.getElementById('explore-view').addEventListener('click', () => { comparison = false; render(); });
  document.getElementById('compare-view').addEventListener('click', () => { comparison = true; render(); });
  render();
})();
