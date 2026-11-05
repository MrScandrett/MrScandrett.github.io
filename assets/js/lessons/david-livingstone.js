(() => {
  'use strict';
  const $ = s => document.querySelector(s);

  // 1. Journey stages
  const stops = [
    ['1841–1852 · The Kalahari & Lake Ngami', 'Livingstone established a mission and medical clinic at Kolobeng among the Bakwena people, learning the SeTswana language and collaborating with Chief Sechele. Guided by indigenous San and Tswana trackers, he crossed the formidable Kalahari Desert with William Cotton Oswell to map Lake Ngami in 1849. Problem: travel across arid terrain where water holes are seasonal and known only to local nomadic experts.'],
    ['1852–1856 · Coast-to-Coast Transcontinental Crossing', 'Partnering with Kololo ruler Sekeletu, who provided 114 Makololo porters and canoes, Livingstone traveled northwest to Luanda on the Atlantic, then turned around to trace the Zambezi River east to Quelimane on the Indian Ocean. In November 1855, he reached the thunderous falls known to local Tonga people as Mosi-oa-Tunya ("The Smoke that Thunders"), which he named Victoria Falls. Problem: navigate thousands of miles across different linguistic territories without European military force.'],
    ['1858–1864 · The Zambezi Expedition & Steam Failure', 'Funded by the British government with the steam launch Ma Robert, Livingstone attempted to establish a navigable trade route up the Zambezi to bypass slave routes. The steam launch failed repeatedly: its shallow boilers choked on green timber, and the rocky gorges of Cahora Bassa proved impassable by boat. Livingstone shifted exploration to the Shire River and Lake Malawi (Lake Nyasa). Problem: mechanical industrial tools failed against African seasonal water levels and steep river rapids.'],
    ['1866–1871 · The Central African Watershed', 'Livingstone returned alone with a small crew including James Chuma and Abdullah Susi to locate the watershed separating the Nile, Congo, and Zambezi systems. Over five grueling years, plagued by chronic malaria and pneumonia, he mapped Lakes Tanganyika, Mweru, and Bangweulu, eventually reaching the giant northward-flowing Lualaba River. Problem: identify river drainage basins when dense jungle, swamps, and mountain ranges obscure horizons.'],
    ['July 1871 · The Nyangwe Massacre & Anti-Slavery Turning Point', 'At the market town of Nyangwe on the Lualaba, Arab-Swahili slave traders opened fire without warning on 1,500 unarmed market women and children, killing hundreds. Horrified and powerless to stop it, Livingstone wrote a searing eyewitness account in his field diary using berry juice on scrap newspapers. When published, his account shocked Britain and led directly to the 1873 naval blockade and treaty closing Zanzibar’s open slave market. Problem: report atrocities accurately when surrounded by hostile armed slavers.'],
    ['1871–1874 · Stanley Encounter & Chuma and Susi’s 1,500-Mile March', 'Henry Morton Stanley located the emaciated Livingstone at Ujiji in November 1871, bringing fresh supplies and medicine. Livingstone died at Chief Chitambo’s village in May 1873. African leaders James Chuma and Abdullah Susi carved out and buried his heart under an African mvula tree, sun-dried and salted his body, packed all his journals and instruments in waterproof bark, and led a 9-month, 1,500-mile march across wars and famine to Bagamoyo on the coast. Problem: preserve primary scientific and human records across 1,500 miles of hostile territory without external funding.']
  ];

  const btns = [...document.querySelectorAll('[data-stop]')];
  let cur = 0;
  function showStop(i, focus) {
    cur = Math.max(0, Math.min(stops.length - 1, i));
    const [title, text] = stops[cur];
    const [story, problem] = text.split(/\s*Problem:\s*/);
    const h = document.createElement('h3');
    const p = document.createElement('p');
    h.textContent = title;
    p.textContent = story;
    const nodes = [h, p];
    if (problem) {
      const q = document.createElement('p');
      q.className = 'problem';
      const strong = document.createElement('strong');
      strong.textContent = 'The problem to solve: ';
      q.append(strong, problem.charAt(0).toUpperCase() + problem.slice(1));
      nodes.push(q);
    }
    $('#stop-detail').replaceChildren(...nodes);
    btns.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.stop) === cur)));
    $('#stop-bar').style.width = `${((cur + 1) / stops.length) * 100}%`;
    $('#stop-count').textContent = `Stage ${cur + 1} of ${stops.length}`;
    $('#stop-prev').disabled = cur === 0;
    $('#stop-next').disabled = cur === stops.length - 1;
    if (focus) btns[cur].focus();
  }
  btns.forEach((b, i) => {
    b.addEventListener('click', () => showStop(i));
    b.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); showStop(cur + 1, true); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); showStop(cur - 1, true); }
    });
  });
  $('#stop-prev').addEventListener('click', () => showStop(cur - 1));
  $('#stop-next').addEventListener('click', () => showStop(cur + 1));
  showStop(0);

  // Section nav: highlight the section being read
  const links = [...document.querySelectorAll('.section-nav a')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id));
      links.forEach(a => { if (a.hasAttribute('aria-current')) { a.setAttribute('aria-current', 'true'); const nav = a.parentElement; nav.scrollLeft = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2; } });
    }), { rootMargin: '-30% 0px -60% 0px' });
    links.forEach(a => { const t = document.querySelector(a.getAttribute('href')); if (t) io.observe(t); });
  }

  // 2. Malaria & Quinine Prophylaxis Lab
  function updateMedicine() {
    const dose = Number($('#quinine-dose').value);
    const exposure = Number($('#swamp-exposure').value);
    const baseRisk = exposure * 20; // 20 to 100%
    const suppression = Math.min(baseRisk, (dose / 400) * 85);
    const netParasitemia = Math.max(5, Math.round(baseRisk - suppression));

    let status = '';
    if (dose === 0) {
      status = 'Severe malaria paroxysm: chills, shaking, high fever spikes (40°C / 104°F), high mortality.';
    } else if (dose < 250) {
      status = 'Partial suppression: mild fever recurrent, moderate parasite density in bloodstream.';
    } else {
      status = 'Prophylactic protection: parasite reproduction held at low non-debilitating levels.';
    }

    $('#med-readout').textContent = `Dose: ${dose} mg/day · Exposure: level ${exposure}/5 · Active blood parasitemia: ${netParasitemia}%. ${status}`;
    $('#parasite-bar').style.width = `${netParasitemia}%`;
    $('#parasite-bar').style.backgroundColor = netParasitemia > 50 ? '#c73a25' : (netParasitemia > 20 ? '#d98b2c' : '#3c8a4d');
    $('#parasite-chart').setAttribute('aria-label', `Parasitemia level is ${netParasitemia} percent.`);
  }
  ['#quinine-dose', '#swamp-exposure'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', updateMedicine);
  });
  updateMedicine();

  // Engineering feedback
  document.querySelectorAll('[data-answer]').forEach(b => b.addEventListener('click', () => {
    const lab = b.closest('.lab');
    lab.querySelectorAll('[data-answer]').forEach(x => x.classList.remove('is-right', 'is-wrong'));
    b.classList.add(b.dataset.answer === 'right' ? 'is-right' : 'is-wrong');
    const fb = lab ? lab.querySelector('.feedback') : null;
    if (fb) {
      fb.textContent = b.dataset.answer === 'right'
        ? 'Supported. The Ma Robert failed because its draft was too deep for sandy shoals, its furnace consumed vast cords of hardwood, and no steam launch could climb the granite cataracts of Cahora Bassa. African porterage and canoe navigation were far better suited to the landscape.'
        : 'Reconsider: steam technology worked well in deep industrial harbors, but failed here because shallow river shoals, boiler fuel shortages, and sheer rock cataracts created physical obstacles steam engines alone could not overcome.';
    }
  }));

  // 3. Hypsometer (Boiling Point & Elevation) Lab
  function updateHypsometer() {
    const tBoil = Number($('#boil-temp').value);
    // Elevation (meters) ≈ (100 - T) * 285 m/°C
    const deltaT = 100.0 - tBoil;
    const elevation = Math.round(deltaT * 285);
    const elevationFt = Math.round(elevation * 3.28084);
    const pressureHpa = Math.round(1013.25 * Math.pow(1 - (0.0065 * elevation / 288.15), 5.255));

    $('#elevation-readout').textContent = `Water boils at ${tBoil.toFixed(1)}°C (ΔT = ${deltaT.toFixed(1)}°C) → Calculated Elevation: ~${elevation.toLocaleString()} meters (~${elevationFt.toLocaleString()} feet). Atmospheric pressure: ~${pressureHpa} hPa.`;

    const verdictEl = $('#river-verdict');
    const bar = $('#elev-you-bar');
    const hh = Math.min(92, elevation / 20); bar.style.height = `${hh}%`; $("#elev-you-label").style.bottom = `calc(${hh}% + 4px)`;
    $('#elev-you-label').textContent = `Your reading\n${elevation.toLocaleString()} m`;
    $('#elev-you-label').style.whiteSpace = 'pre-line';
    $('#elev-chart').setAttribute('aria-label', `Your elevation ${elevation} meters, compared with Lake Victoria at 1,134 meters and the Nile at Gondokoro at 450 meters.`);
    if (elevation < 1134) {
      verdictEl.className = 'verdict is-low';
      verdictEl.innerHTML = `<strong>Result: ${elevation.toLocaleString()} m, below Lake Victoria (1,134 m).</strong> Water cannot flow uphill into the lake, so a river this low is not a Nile headwater. Livingstone's Nyangwe reading (97.9°C, ~600 m) is why the Lualaba is the upper <strong>Congo</strong>, not the Nile.`;
    } else {
      verdictEl.className = 'verdict is-high';
      verdictEl.innerHTML = `<strong>Result: ${elevation.toLocaleString()} m, at or above Lake Victoria (1,134 m).</strong> A river this high could feed the Nile. But Livingstone measured water boiling near 97.9°C at Nyangwe, far too low (~600 m) to do so.`;
    }
  }
  document.querySelectorAll('[data-boil]').forEach(b => b.addEventListener('click', () => {
    $('#boil-temp').value = b.dataset.boil;
    updateHypsometer();
  }));
  const boilInput = $('#boil-temp');
  if (boilInput) {
    boilInput.addEventListener('input', updateHypsometer);
    updateHypsometer();
  }

  // 4. Evidence lab
  const bundles = {
    nyangwe: [
      'Livingstone’s handwritten field diary, July 15, 1871: Written on scraps of newspaper with berry juice, describing the sudden slaughter of hundreds of market women at Nyangwe by Arab slavers.',
      'Primary eyewitness testimony. Written immediately after the event under emotional shock, it provides vivid, unedited evidence of the slave trade’s brutality. It was not written to appease a British sponsor, though it reflects one European observer’s perspective.'
    ],
    stanley: [
      'New York Herald dispatches (1872): Dramatic headline articles by Henry Morton Stanley narrating his search for and rescue of "the lost doctor" in Central Africa.',
      'Mass-media journalism designed to sell newspapers and build Stanley’s celebrity. While it accurately confirms Livingstone’s location and survival at Ujiji, it sensationalized African people as passive backdrops and turned a complex geographic search into Victorian melodrama.'
    ],
    tombstone: [
      'Westminster Abbey inscription (1874): Monument marking Livingstone’s burial in London, praising him as a solitary British hero of exploration and Christian mission.',
      'Commemorative imperial artifact. It reflects how late-Victorian Britain celebrated individual national heroes while completely erasing the names, skills, and nine-month survival trek of James Chuma, Abdullah Susi, and Jacob Wainwright who carried his body and writings to the coast.'
    ]
  };

  function updateEvidence() {
    const key = $('#evidence').value;
    $('#evidence-detail').textContent = bundles[key][0];
    $('#interpretation').textContent = '';
  }
  const evSelect = $('#evidence');
  if (evSelect) {
    evSelect.addEventListener('change', updateEvidence);
    updateEvidence();
  }
  const interpBtn = $('#interpret');
  if (interpBtn) {
    interpBtn.addEventListener('click', () => {
      const key = $('#evidence').value;
      $('#interpretation').textContent = bundles[key][1];
    });
  }
})();

