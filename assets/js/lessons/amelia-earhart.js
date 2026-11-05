(() => {
  'use strict';
  const $ = s => document.querySelector(s);

  // 1. Journey stages
  const stops = [
    ['1928–1935 · Early Records & Oceanic Solo Flights', 'Amelia Earhart became the first woman to cross the Atlantic by air in 1928 (as a passenger/logkeeper on Friendship). In May 1932, she flew solo across the Atlantic from Newfoundland to Northern Ireland in a red Lockheed Vega. In January 1935, she became the first person to fly solo from Honolulu to Oakland, California, proving that precision compass navigation over open water was possible. Problem: establish technical credibility in an aviation industry dominated by male military pilots.'],
    ['June 1, 1937 · Departure: Oakland to Miami & South America', 'Earhart and navigator Fred Noonan depart Oakland in the Lockheed Model 10-E Electra (NR16020), flying east. They make stops in Burbank, Tucson, New Orleans, and Miami for final mechanical checks. From Miami, they fly through Puerto Rico, Venezuela, Suriname, and Brazil, reaching Natal on the Atlantic coast. Problem: calibrate auxiliary fuel tank pumps and engine magnetos before the ocean crossing.'],
    ['Mid-June 1937 · Trans-Africa to the Middle East & India', 'Departing Natal, they make a flawless 13-hour crossing of the South Atlantic to Dakar, Senegal. They fly across the Sahara and Sahel through Gao, Fort Lamy (Chad), Khartoum, and Massawa (Eritrea), crossing the Red Sea to Assab. They continue across the Arabian Sea to Karachi, then across India to Calcutta. Problem: fly through severe desert sandstorms, tropical monsoon squalls, and extreme heat affecting aircraft climb performance.'],
    ['Late June 1937 · Southeast Asia to Australia & New Guinea', 'From Calcutta, they fly down the coast through Akyab, Rangoon, Bangkok, and Singapore to Bandung in Java. Engine adjustments and radio maintenance delay them several days. They proceed to Surabaya, Kupang (Timor), Port Darwin in northern Australia, and arrive at Lae, New Guinea on June 29. They have flown 22,000 miles; only 7,000 miles over the Pacific remain. Problem: repair worn engine components and plan the longest, most dangerous overwater flight leg of the expedition.'],
    ['July 2, 1937 · The 2,556-Mile Leg to Howland Island', 'At 00:00 UTC (10:00 AM local time), the overloaded Electra roars down the Lae airfield runway, clearing the ocean cliff edge with barely 50 feet to spare, carrying 1,150 gallons of fuel. The flight path crosses the International Date Line toward Howland Island, 2,556 nautical miles away. Noonan relies on dead reckoning and celestial sextant sights of stars and the morning sun. Problem: navigate to a 1.5-mile-wide target with no radar, GPS, or intermediate landing fields.'],
    ['July 2–3, 1937 · The Final Radio Signals & Endless Search', 'At 07:42 and 08:43 UTC, Earhart’s voice is heard on USCGC Itasca at maximum signal strength: "We must be on you, but cannot see you—gas is running low... We are on the line 157 337." The signals fade out. No further confirmed radio contact is made. A massive U.S. Navy and Coast Guard search spanning 250,000 square miles finds no trace of the Electra or crew. Problem: determine where the plane went down along the 157°–337° line after fuel exhaustion.']
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

  // 2. Flight & Fuel Endurance Lab
  function updateFlight() {
    const airspeed = Number($('#air-speed').value);
    const wind = Number($('#wind-comp').value);
    const fuelRate = Number($('#fuel-rate').value);
    const totalFuel = 1150; // gallons loaded
    const distance = 2556; // nautical miles

    const groundspeed = Math.max(80, airspeed + wind);
    const flightHours = distance / groundspeed;
    const fuelBurned = Math.round(flightHours * fuelRate);
    const reserveFuel = totalFuel - fuelBurned;
    const reserveMinutes = Math.round((reserveFuel / fuelRate) * 60);

    let status = '';
    if (reserveFuel <= 0) {
      status = 'Fuel exhaustion before arrival! Airplane ditches at sea.';
    } else if (reserveMinutes < 60) {
      status = 'CRITICAL MARGIN: Under 1 hour of reserve fuel remaining upon reaching island coordinates. Virtually no time to search for a hidden atoll!';
    } else {
      status = 'Adequate reserve: Over 1 hour of search time available.';
    }

    $('#flight-readout').textContent = `Groundspeed: ${groundspeed} kt · Flight duration: ${flightHours.toFixed(1)} hrs · Fuel burned: ${fuelBurned.toLocaleString()} gal · Reserve: ${reserveFuel} gal (${reserveMinutes > 0 ? reserveMinutes : 0} min). ${status}`;

    const percentLeft = Math.max(0, Math.min(100, Math.round((reserveFuel / totalFuel) * 100)));
    $('#fuel-bar').style.width = `${percentLeft}%`;
    $('#fuel-bar').style.background = reserveMinutes <= 0 ? '#c73a25' : (reserveMinutes < 60 ? '#d98b2c' : '#3c8a4d');
    $('#fuel-chart').setAttribute('aria-label', `Fuel reserve remaining is ${percentLeft} percent.`);
  }

  ['#air-speed', '#wind-comp', '#fuel-rate'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', updateFlight);
  });
  updateFlight();

  // Engineering feedback
  document.querySelectorAll('[data-answer]').forEach(b => b.addEventListener('click', () => {
    const lab = b.closest('.lab');
    const fb = lab ? lab.querySelector('.feedback') : null;
    if (fb) {
      fb.textContent = b.dataset.answer === 'right'
        ? 'Supported. Earhart transmitted on 3105 and 6210 kilocycles, but the Itasca’s primary high-frequency direction finder antenna could not obtain bearings on 3105 kHz. Furthermore, the trailing wire antenna on the Electra had been removed before departure to save weight, leaving Earhart unable to hear the Itasca’s lower-frequency return broadcasts.'
        : 'Reconsider: radio signals traveled across the Pacific effectively (the Itasca logged Earhart’s voice at maximum Signal 5 volume). The failure was caused by mismatched frequencies, lack of an operable lower-frequency receiver antenna, and one-way voice transmissions.';
    }
  }));

  // 3. Evidence lab
  const bundles = {
    signal5: [
      '07:42 UTC Log Entry: "KHAQQ [Electra] calling Itasca. We must be on you, but cannot see you—but gas is running low. Been unable to reach you by radio. We are flying at 1,000 feet." Signal strength recorded at 5 (maximum).',
      'Signal Strength 5 confirms the aircraft was close enough to generate a very strong radio current on the Itasca’s antenna (typically within 100–150 miles). However, high-frequency radio can occasionally bounce off the ionosphere (skywave), so signal strength alone cannot determine exact distance or bearing.'
    ],
    line157: [
      '08:43 UTC Log Entry: "We are on the line 157 337... will repeat this message... we are running on line north and south." This was Earhart’s final confirmed broadcast.',
      'Celestial navigation confirmation. Noonan had obtained a morning sun sight at 08:00 local time, calculating an astronomical Line of Position (LOP) running 157° to 337° through Howland Island. Because they had no cross-bearing, they were forced to fly back and forth along that line searching visually.'
    ],
    direction: [
      'Search records & modern deep-sea sonar: In 1937, the USS Lexington and Coast Guard searched 250,000 square miles. In recent decades, high-resolution sonar mapping of the 18,000-foot-deep seabed around Howland Island has searched for aircraft wreckage.',
      'Physical evidence remains unrecovered. The leading scientific hypothesis remains the "Crashed and Sank" theory: running out of fuel while searching along the 157°–337° line and ditching in deep water within 100 miles of Howland Island.'
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

