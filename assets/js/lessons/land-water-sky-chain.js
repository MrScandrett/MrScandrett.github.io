// Land, Water & Sky: "Earth System Chain Reactions" (section 4).
// Students name the sphere each observation describes to reveal the next step of the chain.
(() => {
  /* =========================================================================
     3. SYSTEM FEEDBACK DOMINO CHAINS
     ========================================================================= */
  const dominoScenarios = {
    volcano: {
      title: "Supervolcano Eruption Chain Reaction",
      summary: "A colossal volcanic eruption releases pressurized magma, sulfur dioxide gas, and millions of tons of pulverized silicate ash into the upper atmosphere.",
      steps: [
        { sphere: "Geosphere", badge: "GEO", color: "var(--geo-color)", title: "Magma & Ash Blast", text: "Crustal magma reservoir ruptures, blasting pulverized silicate rock and SO₂ gas 30 km into the stratosphere." },
        { sphere: "Atmosphere", badge: "ATMO", color: "var(--atmo-color)", title: "Aerosol Sun Veil", text: "SO₂ gas reacts with moisture to form sulfate aerosol veils, reflecting sunlight and cooling Earth's surface by 2–5°C." },
        { sphere: "Hydrosphere", badge: "HYDRO", color: "var(--hydro-color)", title: "Ocean Cooling & Sea Ice", text: "Diminished sunlight chills surface waters, driving expansion of polar sea ice sheets and disrupting monsoon rains." },
        { sphere: "Biosphere", badge: "BIO", color: "var(--bio-color)", title: "Photosynthesis Drop", text: "Widespread crop failure, shortened growing seasons, and collapse of terrestrial food chains ('volcanic winter')." }
      ]
    },
    flood: {
      title: "Mountain Flash Flood Chain Reaction",
      summary: "A stationary tropical moisture plume unleashes torrential rainfall on steep mountain peaks, triggering systemic erosion.",
      steps: [
        { sphere: "Atmosphere", badge: "ATMO", color: "var(--atmo-color)", title: "Orographic Cloudburst", text: "Moist air forced upward over mountain ridges cools and condenses into intense, persistent thunderstorm squalls." },
        { sphere: "Hydrosphere", badge: "HYDRO", color: "var(--hydro-color)", title: "Torrential Runoff", text: "Soil reaches 100% saturation capacity; excess rainfall surges down gullies into raging white-water torrents." },
        { sphere: "Geosphere", badge: "GEO", color: "var(--geo-color)", title: "Catastrophic Mudslides", text: "Unstable mountainside colluvium liquefies, tearing bedrock boulders loose and gouging canyons into the valley." },
        { sphere: "Biosphere", badge: "BIO", color: "var(--bio-color)", title: "Ecosystem Siltation", text: "Fine clay sediment blankets riverbeds, suffocating salmon spawning gravels and uprooting riparian forests." }
      ]
    },
    coral: {
      title: "Marine Heatwave & Coral Bleaching Chain Reaction",
      summary: "Accumulated atmospheric heat warms the ocean surface layer, triggering the collapse of living coral reef foundations.",
      steps: [
        { sphere: "Atmosphere", badge: "ATMO", color: "var(--atmo-color)", title: "Greenhouse Heat Trap", text: "Elevated atmospheric CO₂ traps outgoing thermal infrared radiation, warming the lower troposphere." },
        { sphere: "Hydrosphere", badge: "HYDRO", color: "var(--hydro-color)", title: "Marine Heatwave", text: "The ocean absorbs over 90% of excess planetary heat, elevating surface water temperatures 2–3°C above normal." },
        { sphere: "Biosphere", badge: "BIO", color: "var(--bio-color)", title: "Coral Bleaching", text: "Stressed coral polyps expel symbiotic photosynthetic zooxanthellae algae, turning ghost white and starving." },
        { sphere: "Geosphere", badge: "GEO", color: "var(--geo-color)", title: "Coastal Wave Erosion", text: "Dead coral skeletons crumble, removing the natural barrier reef buffer and exposing shorelines to severe storm wave erosion." }
      ]
    },
    deforest: {
      title: "Rainforest Deforestation Chain Reaction",
      summary: "Widespread clearcutting of tropical forest trees breaks the regional water recycling loop.",
      steps: [
        { sphere: "Biosphere", badge: "BIO", color: "var(--bio-color)", title: "Canopy Removal", text: "Clearcutting of deep-rooted forest trees destroys habitats and halts plant transpiration of water vapor." },
        { sphere: "Atmosphere", badge: "ATMO", color: "var(--atmo-color)", title: "Drought & Clouds Drop", text: "With fewer leaves releasing water vapor, less moisture is available for clouds and local rainfall." },
        { sphere: "Geosphere", badge: "GEO", color: "var(--geo-color)", title: "Topsoil Sheet Erosion", text: "Without sheltering leaves and binding roots, intense sun bakes the soil and rains wash topsoil into rivers." },
        { sphere: "Hydrosphere", badge: "HYDRO", color: "var(--hydro-color)", title: "River Turbidity", text: "Rivers become choked with red mud, altering freshwater chemistry and causing downstream flooding." }
      ]
    }
  };

  const chainClues = {
    volcano: ['Tiny droplets high above the clouds scatter sunlight.', 'Less sunlight reaches the ocean surface, and the water cools.', 'A shorter growing season leaves less time for crops to ripen.'],
    flood: ['Rain races downhill through gullies.', 'The current strips loose rock and soil from the banks.', 'Buried fish eggs receive less oxygen.'],
    coral: ['Surface seawater stays unusually warm for weeks.', 'Heat-stressed corals lose the algae that help feed them.', 'As damaged reefs wear down, waves can carry more sand off the shore.'],
    deforest: ['Less water vapor enters the air through leaves.', 'When rain returns, exposed topsoil washes away.', 'Suspended sediment turns the downstream river cloudy.']
  };

  function renderChain(key) {
    const data = dominoScenarios[key];
    const cards = document.getElementById('dominoSteps');
    const choices = document.getElementById('chainChoices');
    const clue = document.getElementById('chainClue');
    const feedback = document.getElementById('chainFeedback');
    const restart = document.getElementById('chainRestart');
    let revealed = 0;

    document.getElementById('chainTitle').textContent = data.title;
    document.getElementById('chainSummary').textContent = data.summary;
    cards.replaceChildren();
    choices.replaceChildren();
    feedback.textContent = '';
    restart.hidden = true;
    restart.onclick = () => renderChain(key);

    function reveal() {
      const step = data.steps[revealed++];
      const card = document.createElement('div');
      card.className = 'domino-card';
      card.style.borderTop = '3px solid ' + step.color;
      card.innerHTML = `<div class="domino-sphere-badge">Step ${revealed} · ${step.sphere}</div><h4>${step.title}</h4><p>${step.text}</p>`;
      cards.appendChild(card);
      const complete = revealed === data.steps.length;
      choices.hidden = complete;
      restart.hidden = !complete;
      clue.textContent = complete ? 'Chain complete' : 'Which sphere? ' + chainClues[key][revealed - 1];
    }

    for (const sphere of ['Geosphere', 'Hydrosphere', 'Atmosphere', 'Biosphere']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chain-btn';
      button.textContent = sphere;
      button.onclick = () => {
        if (sphere !== data.steps[revealed].sphere) {
          feedback.textContent = 'Look again. Is the observation about rock or soil, water, air, or living things?';
          return;
        }
        reveal();
        feedback.textContent = sphere + ' is correct. ' + clue.textContent;
        if (!restart.hidden) restart.focus();
      };
      choices.appendChild(button);
    }
    reveal();
    document.querySelectorAll('[data-chain]').forEach(button => {
      const active = button.dataset.chain === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  document.querySelectorAll('[data-chain]').forEach(button => {
    button.addEventListener('click', () => renderChain(button.dataset.chain));
  });

  renderChain('volcano');
})();
