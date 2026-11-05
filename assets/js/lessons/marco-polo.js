(() => {
  'use strict';
  const $ = s => document.querySelector(s);

  // 1. Journey stages
  const stops = [
    ['1271 · Departure from Venice & Acre', 'Seventeen-year-old Marco sets out with his father Niccolò and uncle Maffeo from Venice, sailing to Acre in the Crusader states. They travel to Jerusalem to secure holy oil from the Holy Sepulchre requested by Kublai Khan, and receive letters from the newly elected Pope Gregory X. Problem: pass through active war zones between Crusader states, Mamluks, and Mongols.'],
    ['1272–1274 · The Silk Road across Persia & the Pamirs', 'The Polos travel overland through Armenia and Tabriz, down to Hormuz on the Persian Gulf. Finding the stitched-hull ships at Hormuz too fragile for open ocean travel, they make the critical decision to turn northeast overland. They cross the frozen passes of the Pamir Mountains ("The Roof of the World", over 15,000 ft altitude) and survive the arid Taklamakan Desert along the northern Silk Road oases. Problem: survive extreme altitude sickness, mountain blizzards, and month-long water shortages.'],
    ['1275 · Arrival at Shangdu & Kublai Khan’s Court', 'After three and a half years of travel covering 5,000 miles, the Polos reach Shangdu (Xanadu), the lavish summer capital of Kublai Khan north of Beijing. The Khan receives them warmly, accepts the holy oil, and is impressed by young Marco’s modesty, observation skills, and linguistic aptitude. Problem: adapt immediately to Mongol court protocol, diverse ethnic factions, and non-European governance systems.'],
    ['1275–1291 · Seventeen Years in Imperial Service', 'Marco enters the personal service of Kublai Khan, appointed as an imperial commissioner (envoy). He travels extensively across China, the Yangtze valley, Yunnan, and Myanmar (Burma), observing tax collection, salt manufacture, and city administration. He marvels at Hangzhou (Kinsay), describing it as "the finest and most splendid city in the world," with its paved streets, 12,000 stone bridges, public baths, and sanitation. Problem: conduct administrative inspections and compile objective reports for an emperor suspicious of corrupt local officials.'],
    ['1291–1295 · The Maritime Return across the Indian Ocean', 'Longing to return home before the aging Khan dies, the Polos are granted permission on condition of escorting the Mongol Princess Kököchin to Persia. They depart southern China with 14 four-masted junks and 600 passengers. Delayed by monsoons for five months in Sumatra, the expedition is devastated by tropical fevers. Only 18 people survive the two-year sea journey to Hormuz. The Polos then travel via Constantinople, reaching Venice in 1295. Problem: endure ocean scurvy, tropical diseases, and typhoon hazards on wooden sailing vessels.'],
    ['1298 · Genoa Prison & The Creation of Il Milione', 'Shortly after his return, Venice and Genoa go to war. Marco commands a Venetian war galley, is captured, and imprisoned in Genoa. In prison, he meets the romance writer Rustichello da Pisa and dictates his memoirs. Circulated across Europe as "The Description of the World" (or "Il Milione"), the book becomes an instant medieval bestseller, though many readers consider it a work of fantasy. Problem: communicate accurate observations of advanced Asian technologies to a European audience that lacked reference points.']
  ];

  function showStop(i) {
    const h = document.createElement('h3');
    const p = document.createElement('p');
    h.textContent = stops[i][0];
    p.textContent = stops[i][1];
    $('#stop-detail').replaceChildren(h, p);
    document.querySelectorAll('[data-stop]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.stop) === i)));
  }
  document.querySelectorAll('[data-stop]').forEach(b => b.addEventListener('click', () => showStop(Number(b.dataset.stop))));
  showStop(0);

  // 2. Economics Lab: Fiat Currency
  function updateEconomy() {
    const backing = Number($('#gold-backing').value);
    const law = Number($('#law-enforcement').value);
    // Confidence formula: legal power + backing
    const confidence = Math.min(100, Math.round((backing * 0.5) + (law * 10)));

    let status = '';
    if (confidence > 75) {
      status = 'Stable fiat currency: merchants accept paper notes willingly; goods trade smoothly across provinces.';
    } else if (confidence > 45) {
      status = 'Moderate inflation: merchants hoard silver coins and demand premiums when accepting paper notes.';
    } else {
      status = 'Currency collapse: hyperinflation strikes; paper money refused despite imperial decrees.';
    }

    $('#econ-readout').textContent = `Silver reserve: ${backing}% · Law enforcement: level ${law}/5 · Market confidence: ${confidence}%. ${status}`;
    $('#currency-bar').style.width = `${confidence}%`;
    $('#currency-bar').style.background = confidence > 75 ? '#52c485' : (confidence > 45 ? '#e5a93c' : '#e05a47');
    $('#currency-chart').setAttribute('aria-label', `Currency confidence is ${confidence} percent.`);
  }
  ['#gold-backing', '#law-enforcement'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', updateEconomy);
  });
  updateEconomy();

  // Engineering feedback
  document.querySelectorAll('[data-answer]').forEach(b => b.addEventListener('click', () => {
    const lab = b.closest('.lab');
    const fb = lab ? lab.querySelector('.feedback') : null;
    if (fb) {
      fb.textContent = b.dataset.answer === 'right'
        ? 'Supported. Chinese shipbuilders divided the interior hull with thick wooden bulkheads caulked with lime and tung oil. If water flooded one compartment, the other 12 compartments remained buoyant, keeping the ship afloat. European ships did not widely adopt this design until centuries later.'
        : 'Reconsider: silk wraps or wood buoyancy alone cannot prevent a breached hull from taking on water and sinking. The structural invention of isolated watertight bulkheads is what prevented catastrophic sinking.';
    }
  }));

  // 3. Yam Communication Network Lab
  function updateNetwork() {
    const dist = Number($('#route-distance').value);
    const caravanDays = Math.round(dist / 18); // ~18 miles/day
    const galleyDays = Math.round(dist / 60);  // ~60 miles/day
    const yamDays = Math.round(dist / 220);    // ~220 miles/day relay

    $('#speed-readout').textContent = `Distance across Eurasia: ${dist.toLocaleString()} miles. Compare delivery times:`;

    const compEl = $('#speed-comparison');
    if (compEl) {
      compEl.innerHTML = `
        <div style="padding:1rem;border:1px solid currentColor;border-radius:4px">
          <strong>Camel Caravan</strong><br>
          <span style="font-size:1.8rem;font-weight:bold;color:#c77b20">${caravanDays}</span> days<br>
          <small>~18 miles/day</small>
        </div>
        <div style="padding:1rem;border:1px solid currentColor;border-radius:4px">
          <strong>Sailing Ship</strong><br>
          <span style="font-size:1.8rem;font-weight:bold;color:#3898b3">${galleyDays}</span> days<br>
          <small>~60 miles/day (weather dependent)</small>
        </div>
        <div style="padding:1rem;border:2px solid #52c485;border-radius:4px;background:color-mix(in srgb, var(--surface) 90%, #52c485 10%)">
          <strong style="color:#52c485">Mongol Yam Relay</strong><br>
          <span style="font-size:1.8rem;font-weight:bold;color:#52c485">${yamDays}</span> days<br>
          <small>~220 miles/day (continuous horse relays)</small>
        </div>
      `;
    }
  }
  const distInput = $('#route-distance');
  if (distInput) {
    distInput.addEventListener('input', updateNetwork);
    updateNetwork();
  }

  // 4. Evidence lab
  const bundles = {
    included: [
      'Specific technological descriptions: Marco accurately described paper money manufacturing from mulberry bark, coal mining ("black burning stones"), asbestos fireproof cloth, and postal relay bells decades before any other European writer.',
      'Strong evidence of direct eyewitness experience. These specific details are verifiable through contemporary Yuan administrative documents and could not have been plagiarized from earlier Western accounts, as no European had ever described them.'
    ],
    omitted: [
      'Famous omissions: Marco does not mention the Great Wall of China, tea drinking, chopsticks, or female foot-binding.',
      'Historical context explains the omissions: The massive stone Great Wall familiar today was built centuries later by the Ming Dynasty to defend against Mongols! Under the Mongol Yuan dynasty, the Mongols ruled inside China and had no need for border walls. Furthermore, the Polos lived in Mongol court circles, which drank fermented mare’s milk (airag) rather than tea and did not practice foot-binding.'
    ],
    court: [
      'Official Chinese annals: Yuan Dynasty archives (Yuan Shi) record foreign envoys and refer to an imperial official named "Po-lo" assisting in naval inspections and court embassies in 1277.',
      'Corroborating administrative evidence. While not mentioning Marco Polo’s Italian family name directly, the Chinese administrative titles, city names, tax figures, and courier routes match Marco’s descriptions with astonishing precision.'
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

