/* earth-explorer.js — interactive controls for Earth: A Living Planet */
(() => {
  // 1. Rotation toggle
  const spinBtn = document.getElementById('earth-spin');
  const model = document.getElementById('earth-model');
  if (spinBtn && model) {
    spinBtn.addEventListener('click', () => {
      const active = model.hasAttribute('auto-rotate');
      if (active) {
        model.removeAttribute('auto-rotate');
        spinBtn.textContent = 'Resume rotation';
        spinBtn.setAttribute('aria-pressed', 'false');
      } else {
        model.setAttribute('auto-rotate', '');
        spinBtn.textContent = 'Pause rotation';
        spinBtn.setAttribute('aria-pressed', 'true');
      }
    });
  }

  // 2. Earth Systems Tabs
  const systemData = {
    water: {
      title: 'Water — The Global Solvent',
      text: 'Oceans cover 71% of Earth\'s surface and store over 96% of its liquid water. Heat capacity in the ocean stabilizes world climate, while evaporation powers weather cycles that deliver fresh water inland.'
    },
    air: {
      title: 'Air & Shield — The Breath and the Blanket',
      text: 'The atmosphere provides the 21% oxygen needed for respiration and 78% nitrogen for biochemistry, plus an ozone layer absorbing solar UV. Earth\'s molten iron core drives a magnetosphere that shields our atmosphere from solar wind stripping.'
    },
    rock: {
      title: 'Restless Rock — The Nutrient Recycler',
      text: 'Plate tectonics and volcanism continually circulate minerals, recycle carbonates, and regulate greenhouse gases over millions of years. Without crustal turnover, vital nutrients would stay trapped in deep seabed rock.'
    },
    life: {
      title: 'Living Skin — The Biosphere and Feedback',
      text: 'Life is not just a passive passenger: photosynthetic organisms created the oxygen-rich air we breathe. Forests, plankton, and soil microbes actively regulate global temperature and chemical cycles.'
    }
  };

  const tabs = document.querySelectorAll('.earth-system-tabs button');
  const detailEl = document.getElementById('system-detail');
  const hotspots = document.querySelectorAll('.earth-hotspot');

  function selectSystem(sysKey) {
    const data = systemData[sysKey];
    if (!data || !detailEl) return;
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.system === sysKey)));
    detailEl.innerHTML = `<h3>${data.title}</h3><p>${data.text}</p>`;
  }

  tabs.forEach(btn => {
    btn.addEventListener('click', () => selectSystem(btn.dataset.system));
  });

  hotspots.forEach(btn => {
    btn.addEventListener('click', () => selectSystem(btn.dataset.system));
  });

  selectSystem('water');

  // 3. Habitability Recipe Switches
  const switches = document.querySelectorAll('.earth-switches input');
  const recipeTitle = document.getElementById('recipe-title');
  const recipeText = document.getElementById('recipe-text');
  const recipeMeter = document.getElementById('recipe-meter');

  function updateRecipe() {
    if (!recipeTitle || !recipeText || !recipeMeter) return;
    const checked = Array.from(switches).filter(s => s.checked).map(s => s.dataset.factor);
    const count = checked.length;
    const bars = recipeMeter.querySelectorAll('i');
    bars.forEach((bar, idx) => {
      bar.classList.toggle('is-active', idx < count);
    });

    if (count === 5) {
      recipeTitle.textContent = 'Stable Habitable World (Earth)';
      recipeText.textContent = 'All five core systems operating: liquid surface oceans, chemical-rich atmosphere, active geothermal recycling, and planetary radiation shielding.';
    } else if (count >= 3) {
      recipeTitle.textContent = 'Fragile or Extreme World';
      recipeText.textContent = 'Partial viability: life might survive deep underground or in specialized niches, but surface ecosystems face catastrophic barriers.';
    } else {
      recipeTitle.textContent = 'Sterile Hostile Surface';
      recipeText.textContent = 'Key ingredients missing: without atmosphere or solvent water, volatile elements escape to space and complex prebiotic chemistry cannot sustain.';
    }
  }

  switches.forEach(sw => sw.addEventListener('change', updateRecipe));
  updateRecipe();

  // 4. Civilization Threads
  const threadData = {
    sun: 'Sunlight drives photosynthesis for agriculture, warms ocean currents, and directly generates solar kilowatt-hours for clean electrical grids.',
    water: 'Clean water is the bedrock of public health, food production, transport waterways, and hydroelectric power generation.',
    rock: 'Silicates build housing; iron and copper power electronics; lithium and rare earth elements enable energy storage and digital communication.',
    air: 'Atmospheric circulation creates wind power, delivers precipitation to crops, and supports aviation and global commerce.'
  };

  const threadButtons = document.querySelectorAll('.earth-thread');
  const threadDetail = document.getElementById('thread-detail');

  threadButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      threadButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const key = btn.dataset.thread;
      if (threadDetail && threadData[key]) {
        threadDetail.textContent = threadData[key];
      }
    });
  });
})();
