(() => {
  const mmPerUnit = { mm: 1, cm: 10, m: 1000, km: 1_000_000 };
  const minModel = 2;
  const maxModel = 260;
  const format = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
  const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

  function measure(name, dimension, value, unit) {
    return { name, dimension, real: `${format.format(value)} ${unit}`, mm: value * mmPerUnit[unit] };
  }

  const jupiter = measure('Jupiter', 'Diameter', 142984, 'km');
  const sand = measure('Grain of sand', 'Diameter', 0.5, 'mm');

  const rounds = {
    landmarks: {
      scales: [1000, 2000, 5000, 50000],
      items: [
        measure('Eiffel Tower', 'Height to antenna', 330, 'm'),
        measure('Statue of Liberty', 'Ground to torch', 93, 'm'),
        jupiter,
        measure('Washington Monument', 'Height', 169, 'm'),
      ],
    },
    everyday: {
      scales: [5, 10, 20, 50],
      items: [
        measure('Pencil', 'Length', 19, 'cm'),
        sand,
        measure('Classroom door', 'Height', 2.1, 'm'),
        measure('Coin', 'Diameter', 25, 'mm'),
      ],
    },
    planets: {
      scales: [100_000_000, 1_000_000_000, 5_000_000_000, 50_000_000_000],
      items: [
        measure('Saturn', 'Diameter', 120536, 'km'),
        jupiter,
        sand,
        measure('Neptune', 'Diameter', 49528, 'km'),
      ],
    },
  };

  const lab = document.querySelector('#sm-lineup');
  const roundPicker = lab.querySelector('#sm-lab-round');
  const scalePicker = lab.querySelector('#sm-lab-scale');
  const lineup = lab.querySelector('.sm-lab-models');
  const feedback = lab.querySelector('.sm-lab-feedback');
  const instructions = lab.querySelector('[data-sm-lab-instructions]');
  const checkButton = lab.querySelector('button[type="submit"]');
  const modeButtons = lab.querySelectorAll('[data-sm-lab-mode]');
  const exploreInstructions = instructions.textContent;
  const progress = new Map();
  let exploring = true;

  function currentRound() {
    return progress.get(roundPicker.value);
  }

  function showRound(reset = false) {
    const key = roundPicker.value;
    const round = rounds[key];
    if (reset || !progress.has(key)) {
      const guesses = [125, 65, 180, 95];
      progress.set(key, {
        scale: round.scales[1],
        items: round.items.map((item, index) => ({ ...item, kept: true, model: guesses[index] })),
      });
    }
    scalePicker.replaceChildren(...round.scales.map(scale => new Option(`1 : ${format.format(scale)}`, scale)));
    scalePicker.value = currentRound().scale;
    feedback.textContent = '';
    renderLineup();
  }

  function drawModel(row, model) {
    row.querySelector('.sm-lab-bar').style.width = `${Math.min(Math.max(model || 0, 0), maxModel) / maxModel * 100}%`;
    row.classList.toggle('sm-lab-overflow', model > maxModel);
  }

  function renderLineup() {
    const { items, scale } = currentRound();
    lineup.innerHTML = items.map((item, index) => `
      <li class="sm-lab-model" data-index="${index}" ${item.kept ? '' : 'data-excluded'}>
        <div class="sm-lab-object"><strong>${item.name}</strong><span>${item.dimension} · ${item.real}</span></div>
        <div class="sm-lab-track" aria-hidden="true"><span class="sm-lab-bar"></span><span class="sm-lab-off-ruler">Off ruler</span></div>
        ${exploring ? '<div class="sm-lab-observed" data-observed></div>' : `<label class="sm-lab-size">
          <input type="number" step="any" min="0" inputmode="decimal" data-size aria-label="${item.name} model length in millimeters"
            value="${item.model ?? ''}" ${item.kept ? '' : 'disabled'} /> mm
        </label>`}
        <div class="sm-lab-item-actions">
          <button type="button" class="sm-btn" data-move="-1" aria-label="Move ${item.name} up" ${!item.kept || index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="sm-btn" data-move="1" aria-label="Move ${item.name} down" ${!item.kept || index === items.length - 1 ? 'disabled' : ''}>↓</button>
          <label><input type="checkbox" data-keep aria-label="Keep ${item.name}" ${item.kept ? 'checked' : ''} /> Keep</label>
        </div>
      </li>
    `).join('');
    [...lineup.children].forEach((row, index) => {
      const item = items[index];
      if (!exploring) {
        drawModel(row, item.model);
        return;
      }
      const length = item.mm / scale;
      drawModel(row, length);
      const observed = row.querySelector('[data-observed]');
      if (!item.kept) {
        observed.textContent = 'Left out';
        return;
      }
      const measurement = length < 0.1 ? '<0.1' : compact.format(length);
      observed.textContent = `${measurement} mm`;
      if (length < minModel || length > maxModel) {
        const note = document.createElement('span');
        note.textContent = length < minModel ? 'Below 2 mm' : 'Over 260 mm';
        observed.append(note);
      }
    });
    if (exploring) showObservations();
  }

  function showObservations() {
    const { items, scale } = currentRound();
    const kept = items.filter(item => item.kept).sort((a, b) => a.mm - b.mm);
    if (!kept.length) {
      feedback.textContent = 'Keep an object to see it at this scale.';
      return;
    }
    const fitting = kept.filter(item => item.mm / scale >= minModel && item.mm / scale <= maxModel).length;
    const smallest = kept[0];
    const largest = kept.at(-1);
    const summary = `${fitting} of ${kept.length} fit at this scale.`;
    feedback.textContent = largest.mm / smallest.mm > maxModel / minModel
      ? `${summary} With ${smallest.name} at 2 mm, ${largest.name} would still run past the ruler. Try leaving one out.`
      : summary;
  }

  roundPicker.addEventListener('change', () => showRound());
  scalePicker.addEventListener('change', () => {
    currentRound().scale = Number(scalePicker.value);
    feedback.textContent = '';
    if (exploring) renderLineup();
  });
  lab.querySelector('[data-sm-lab-reset]').addEventListener('click', () => showRound(true));
  modeButtons.forEach(button => button.addEventListener('click', () => {
    const nextMode = button.dataset.smLabMode === 'explore';
    if (exploring === nextMode) return;
    exploring = nextMode;
    modeButtons.forEach(modeButton => modeButton.setAttribute('aria-pressed', String(modeButton === button)));
    instructions.textContent = exploring ? exploreInstructions :
      'Keep three objects and arrange them from shortest to longest. Divide real millimeters by the scale number and round to 0.1 mm. Models must fit between 2 and 260 mm.';
    checkButton.hidden = exploring;
    feedback.textContent = '';
    renderLineup();
  }));

  lineup.addEventListener('input', event => {
    const input = event.target;
    const row = input.closest('[data-index]');
    const item = currentRound().items[Number(row.dataset.index)];
    feedback.textContent = '';
    if (input.matches('[data-size]')) {
      item.model = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : null;
      drawModel(row, item.model);
    }
    if (input.matches('[data-keep]')) {
      item.kept = input.checked;
      const index = Number(row.dataset.index);
      renderLineup();
      lineup.children[index].querySelector('[data-keep]').focus();
    }
  });

  lineup.addEventListener('click', event => {
    const button = event.target.closest('[data-move]');
    if (!button) return;
    const index = Number(button.closest('[data-index]').dataset.index);
    const next = index + Number(button.dataset.move);
    const { items } = currentRound();
    [items[index], items[next]] = [items[next], items[index]];
    renderLineup();
    const row = lineup.children[next];
    const nextButton = row.querySelector(`[data-move="${button.dataset.move}"]`);
    (nextButton.disabled ? row.querySelector('[data-move]:enabled') : nextButton).focus();
    if (!exploring) feedback.textContent = `${items[next].name} moved to row ${next + 1}.`;
  });

  function checkModels() {
    const { scale, items } = currentRound();
    const kept = items.filter(item => item.kept);
    const sorted = [...kept].sort((a, b) => a.mm - b.mm);
    const smallest = sorted[0];
    const largest = sorted.at(-1);
    if (kept.length >= 2 && largest.mm / smallest.mm > maxModel / minModel) {
      return `${largest.name} and ${smallest.name} need separate scales here. If the smaller model is 2 mm, the bigger one would exceed 260 mm. Try leaving one out.`;
    }
    if (kept.length !== 3) return 'Keep exactly three objects.';
    if (kept.some((item, index) => item !== sorted[index])) {
      return 'Use the arrows to arrange the kept objects from shortest to longest. Compare the real measurements, including their units.';
    }
    if (largest.mm / scale > maxModel) {
      return `${largest.name} would be longer than 260 mm. Try a larger number in the scale to shrink all three models.`;
    }
    if (smallest.mm / scale < minModel) {
      return `${smallest.name} would be shorter than 2 mm. Try a smaller number in the scale to grow all three models.`;
    }
    for (const item of kept) {
      const target = Math.round(item.mm / scale * 10) / 10;
      if (item.model === null || Math.abs(item.model - target) > 0.000001) {
        return `Recheck ${item.name}. Convert ${item.real} to millimeters, divide by ${format.format(scale)}, and round to the nearest 0.1 mm.`;
      }
    }
    return `All three fit at 1 : ${format.format(scale)}. Their model lengths preserve the real proportions within rounding.`;
  }

  lab.addEventListener('submit', event => {
    event.preventDefault();
    if (!exploring) feedback.textContent = checkModels();
  });

  showRound();
})();
