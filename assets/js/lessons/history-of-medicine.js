(function () {
  'use strict';

  const MED_ERAS = [
    {
      title: 'c. 3000 BCE · Ancient Egypt',
      summary: 'Physicians like Imhotep combine herbal remedies, surgery, and religious ritual. The Edwin Smith Papyrus describes real anatomical observations alongside spells.',
      belief: 'Belief: illness from gods or imbalance',
      tool: 'Tool: herbs, ritual, early surgery',
      life: 25,
      bar: 22,
      danger: '🩸'
    },
    {
      title: 'c. 400 BCE · Hippocrates & the Four Humors',
      summary: 'Greek physicians break from purely divine explanations of illness and propose that the body is governed by four fluids that must stay in balance.',
      belief: 'Belief: humoral balance',
      tool: 'Tool: observation, diet, rest',
      life: 30,
      bar: 28,
      danger: '🩸'
    },
    {
      title: "c. 150 CE · Galen's Rome",
      summary: "Galen's writings become medical law for over a thousand years. Bloodletting and purging to 'rebalance' humors become the standard treatment for nearly everything.",
      belief: 'Belief: humoral balance (institutionalized)',
      tool: 'Tool: bloodletting, purging',
      life: 28,
      bar: 26,
      danger: '🩸'
    },
    {
      title: '1543 · Vesalius and the Anatomists',
      summary: 'Andreas Vesalius dissects human cadavers directly and publishes detailed anatomy that contradicts Galen, who had mostly dissected animals.',
      belief: 'Belief: the body itself is the best textbook',
      tool: 'Tool: direct dissection',
      life: 32,
      bar: 32,
      danger: '🩸'
    },
    {
      title: '1840s · Anesthesia & Semmelweis',
      summary: "Ether and chloroform make painless surgery possible for the first time. Semmelweis links handwashing to lower death rates, though germ theory does not exist yet.",
      belief: "Belief: unseen 'particles' may spread disease",
      tool: 'Tool: anesthesia, handwashing',
      life: 40,
      bar: 44,
      danger: '🧼'
    },
    {
      title: '1860s-1880s · Pasteur, Koch & Germ Theory',
      summary: 'Louis Pasteur and Robert Koch prove that specific microorganisms cause specific diseases. Joseph Lister introduces antiseptic surgery, and death rates fall sharply.',
      belief: 'Belief: germ theory replaces miasma',
      tool: 'Tool: antiseptics, sterilization, vaccines',
      life: 48,
      bar: 58,
      danger: '🔬'
    },
    {
      title: '1928-1940s · The Antibiotic Era',
      summary: 'Alexander Fleming discovers penicillin in 1928. Mass production during World War II turns once-fatal infections into treatable conditions almost overnight.',
      belief: 'Belief: bacteria can be directly killed',
      tool: 'Tool: antibiotics, mass vaccination',
      life: 60,
      bar: 74,
      danger: '💊'
    },
    {
      title: 'Today · Genomics & Precision Medicine',
      summary: 'Imaging, genomics, and data-driven trials let doctors target treatment to the individual patient and catch disease earlier than ever before.',
      belief: 'Belief: evidence-based, individualized care',
      tool: 'Tool: genomics, imaging, clinical trials',
      life: 73,
      bar: 96,
      danger: '🧬'
    }
  ];

  const scrollSvg = document.getElementById('medScroll');
  const eraSlider = document.getElementById('medEra');
  const lifeBar = document.getElementById('medLifeBar');
  const dangerIcon = document.getElementById('medDanger');
  const eraTitle = document.getElementById('medEraTitle');
  const eraSummary = document.getElementById('medEraSummary');
  const beliefChip = document.getElementById('medBeliefChip');
  const toolChip = document.getElementById('medToolChip');
  const lifeBadge = document.getElementById('medLifeBadge');

  if (!scrollSvg || !eraSlider) return;

  function renderScroll() {
    scrollSvg.innerHTML =
      '<path d="M 40 96 C 180 18, 330 148, 500 86 S 820 36, 1000 92" fill="none" stroke="#b98a3d" stroke-width="8" stroke-linecap="round"></path>' +
      MED_ERAS.map(function (era, index) {
        const x = 60 + index * 132;
        const y = index % 2 === 0 ? 74 : 112;
        const label = era.title.split('·')[0].trim();
        return (
          '<g class="vitae-tl-group" data-index="' + index + '">' +
            '<circle class="vitae-tl-node" cx="' + x + '" cy="' + y + '" r="12" fill="#2f7d78" opacity="0.9"></circle>' +
            '<text class="vitae-tl-text" x="' + x + '" y="' + (y - 24) + '" text-anchor="middle" font-family="Special Elite, JetBrains Mono, monospace" font-size="11" fill="#44615e">' + label + '</text>' +
          '</g>'
        );
      }).join('');
  }

  function updateEra() {
    const index = Number(eraSlider.value);
    const era = MED_ERAS[index];
    lifeBar.style.width = era.bar + '%';
    eraTitle.textContent = era.title;
    eraSummary.textContent = era.summary;
    beliefChip.textContent = era.belief;
    toolChip.textContent = era.tool;
    dangerIcon.textContent = era.danger;
    dangerIcon.classList.add('is-visible');

    const modernCare = era.life >= 55;
    lifeBadge.textContent = 'Global life expectancy: about ' + era.life + ' years';
    lifeBadge.classList.toggle('is-glowing', modernCare);

    scrollSvg.querySelectorAll('.vitae-tl-group').forEach(function (g) {
      const isMatch = Number(g.getAttribute('data-index')) === index;
      const circle = g.querySelector('.vitae-tl-node');
      const text = g.querySelector('.vitae-tl-text');
      const originalCy = Number(circle.getAttribute('cy'));

      if (isMatch) {
        circle.setAttribute('fill', '#b98a3d');
        circle.setAttribute('r', '18');
        text.setAttribute('fill', '#8a621f');
        text.setAttribute('font-size', '13');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('y', originalCy - 30);
      } else {
        circle.setAttribute('fill', '#2f7d78');
        circle.setAttribute('r', '12');
        text.setAttribute('fill', '#44615e');
        text.setAttribute('font-size', '11');
        text.setAttribute('font-weight', 'normal');
        text.setAttribute('y', originalCy - 24);
      }
    });
  }

  renderScroll();
  updateEra();
  eraSlider.addEventListener('input', updateEra);

  // Four Humors lab
  const humorBlood = document.getElementById('humorBlood');
  const humorPhlegm = document.getElementById('humorPhlegm');
  const humorYellow = document.getElementById('humorYellow');
  const humorBlack = document.getElementById('humorBlack');
  const humorBloodVal = document.getElementById('humorBloodVal');
  const humorPhlegmVal = document.getElementById('humorPhlegmVal');
  const humorYellowVal = document.getElementById('humorYellowVal');
  const humorBlackVal = document.getElementById('humorBlackVal');
  const humorTotal = document.getElementById('humorTotal');
  const humorDiagnosis = document.getElementById('humorDiagnosis');
  const humorExplain = document.getElementById('humorExplain');
  const humorTreatment = document.getElementById('humorTreatment');

  const HUMOR_PROFILES = {
    blood: {
      name: 'Sanguine (excess Blood)',
      explain: 'A sanguine imbalance was blamed for fever, flushed skin, and a racing pulse. An ancient physician would call for bloodletting to drain the excess.',
      treatment: 'Recommended: bloodletting with leeches'
    },
    phlegm: {
      name: 'Phlegmatic (excess Phlegm)',
      explain: 'Too much phlegm was linked to coughs, congestion, and sluggishness. Physicians prescribed warming foods and sweating to dry it out.',
      treatment: 'Recommended: warming diet & induced sweating'
    },
    yellow: {
      name: 'Choleric (excess Yellow Bile)',
      explain: 'Excess yellow bile was blamed for fever, anger, and digestive upset. Purging remedies were used to expel it from the body.',
      treatment: 'Recommended: purgatives & vomiting agents'
    },
    black: {
      name: 'Melancholic (excess Black Bile)',
      explain: 'Too much black bile was thought to cause sadness, sluggish digestion, and skin trouble. Rest, warm baths, and diet changes were prescribed.',
      treatment: 'Recommended: rest, warm baths, mild diet'
    }
  };

  function updateHumors() {
    const blood = Number(humorBlood.value);
    const phlegm = Number(humorPhlegm.value);
    const yellow = Number(humorYellow.value);
    const black = Number(humorBlack.value);

    humorBloodVal.textContent = blood;
    humorPhlegmVal.textContent = phlegm;
    humorYellowVal.textContent = yellow;
    humorBlackVal.textContent = black;

    const total = blood + phlegm + yellow + black;
    const balanced = Math.abs(total - 100) <= 8;
    humorTotal.textContent = 'Total: ' + total + ' (' + (balanced ? 'balanced' : total > 100 ? 'overflowing' : 'depleted') + ')';
    humorTotal.classList.toggle('is-off', !balanced);

    const values = { blood: blood, phlegm: phlegm, yellow: yellow, black: black };
    const dominant = Object.keys(values).reduce(function (best, key) {
      return values[key] > values[best] ? key : best;
    }, 'blood');
    const maxShare = values[dominant] / (total || 1);

    if (balanced && maxShare < 0.32) {
      humorDiagnosis.textContent = 'Balanced Constitution';
      humorExplain.textContent = 'All four humors are in harmony. An ancient physician would tell you to keep your current diet and habits — you are the picture of health.';
      humorTreatment.textContent = 'Recommended: maintain balance';
    } else {
      const profile = HUMOR_PROFILES[dominant];
      humorDiagnosis.textContent = profile.name;
      humorExplain.textContent = profile.explain;
      humorTreatment.textContent = profile.treatment;
    }
  }

  [humorBlood, humorPhlegm, humorYellow, humorBlack].forEach(function (input) {
    input.addEventListener('input', updateHumors);
  });
  updateHumors();

  // Broad Street pump outbreak lab
  const outbreakMap = document.getElementById('outbreakMap');
  const pumpBtn = document.getElementById('pumpBtn');
  const outbreakResetBtn = document.getElementById('outbreakReset');
  const outbreakCount = document.getElementById('outbreakCount');
  const outbreakNote = document.getElementById('outbreakNote');

  const PUMP_X = 210;
  const PUMP_Y = 130;
  const MAX_CASES = 26;

  let cases = [];
  let pumpOpen = true;
  let outbreakTimer = null;
  let mapVisible = true;

  function renderMap() {
    const streets =
      '<rect x="0" y="0" width="420" height="260" fill="#f4f8f6"></rect>' +
      '<line x1="20" y1="60" x2="400" y2="60" stroke="#d8ddd6" stroke-width="10"></line>' +
      '<line x1="20" y1="140" x2="400" y2="140" stroke="#d8ddd6" stroke-width="10"></line>' +
      '<line x1="20" y1="210" x2="400" y2="210" stroke="#d8ddd6" stroke-width="10"></line>' +
      '<line x1="90" y1="20" x2="90" y2="240" stroke="#d8ddd6" stroke-width="10"></line>' +
      '<line x1="210" y1="20" x2="210" y2="240" stroke="#d8ddd6" stroke-width="10"></line>' +
      '<line x1="330" y1="20" x2="330" y2="240" stroke="#d8ddd6" stroke-width="10"></line>' +
      '<text x="212" y="18" text-anchor="middle" font-family="Special Elite, JetBrains Mono, monospace" font-size="11" fill="#7a8b88">Broad Street</text>';
    const pump =
      '<g id="pumpIcon">' +
        '<circle cx="' + PUMP_X + '" cy="' + PUMP_Y + '" r="14" fill="' + (pumpOpen ? '#2f7d78' : '#9aa8a5') + '"></circle>' +
        '<text x="' + PUMP_X + '" y="' + (PUMP_Y + 5) + '" text-anchor="middle" font-size="14">' + (pumpOpen ? '🚰' : '🚫') + '</text>' +
      '</g>';
    const dots = cases.map(function (c) {
      return '<circle cx="' + c.x + '" cy="' + c.y + '" r="5" fill="#a23b3b" opacity="0.82"></circle>';
    }).join('');
    outbreakMap.innerHTML = streets + dots + pump;
  }

  function stopOutbreak() {
    if (outbreakTimer) {
      clearInterval(outbreakTimer);
      outbreakTimer = null;
    }
  }

  function addCase() {
    if (!pumpOpen || document.hidden || !mapVisible) return;
    if (cases.length >= MAX_CASES) {
      stopOutbreak();
      return;
    }
    const angle = Math.random() * Math.PI * 2;
    const radius = 20 + Math.random() * 95;
    const x = Math.min(400, Math.max(20, PUMP_X + Math.cos(angle) * radius));
    const y = Math.min(240, Math.max(20, PUMP_Y + Math.sin(angle) * radius * 0.7));
    cases.push({ x: x, y: y });
    outbreakCount.textContent = String(cases.length);
    renderMap();
  }

  function startOutbreak() {
    stopOutbreak();
    if (pumpOpen && cases.length < MAX_CASES && !document.hidden && mapVisible) {
      outbreakTimer = setInterval(addCase, 900);
    }
  }

  function syncOutbreakTimer() {
    if (!pumpOpen || cases.length >= MAX_CASES || document.hidden || !mapVisible) {
      stopOutbreak();
    } else if (!outbreakTimer) {
      outbreakTimer = setInterval(addCase, 900);
    }
  }

  pumpBtn.addEventListener('click', function () {
    pumpOpen = false;
    stopOutbreak();
    pumpBtn.disabled = true;
    outbreakNote.textContent =
      "Just like John Snow's real 1854 map, removing the pump handle stops new cases from appearing. " +
      cases.length +
      ' cases had already clustered around Broad Street before the pump was disabled — evidence pointing straight at the water supply, not the air.';
    renderMap();
  });

  outbreakResetBtn.addEventListener('click', function () {
    cases = [];
    pumpOpen = true;
    mapVisible = true;
    pumpBtn.disabled = false;
    outbreakCount.textContent = '0';
    outbreakNote.textContent = 'The pump is still in use. New cases are appearing near Broad Street every few seconds.';
    renderMap();
    startOutbreak();
  });

  if (typeof IntersectionObserver !== 'undefined') {
    mapVisible = false;
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        mapVisible = entry.isIntersecting;
        syncOutbreakTimer();
      });
    }, { rootMargin: '150px' });
    obs.observe(outbreakMap);
  }
  document.addEventListener('visibilitychange', syncOutbreakTimer);

  renderMap();
  syncOutbreakTimer();
})();
