/* Documented sequence, with explicitly illustrative animation keyframes.
   at is a teaching-sequence position, NOT elapsed-time fraction.
   intensity and pyro are dimensionless art controls, NOT measurements. */
(() => {
  const frames = rows => rows.map(([at, label, intensity, pyro = 0]) => ({ at, label, intensity, pyro }));
  window.VolcanoHistory = {
    vesuvius79: {
      source:'https://www.ov.ingv.it/index.php/storia-vesuvio/pompei',
      column:'≈32 km peak · INGV / Sigurdsson 1987',
      ejecta:'≈3–4 km³ bulk tephra · INGV',
      temp:'≈850–950 °C magma · INGV',
      so2:'Unavailable · not quantifiable',
      ash:'Deposit tracked >400 km · INGV',
      wind:{ x: 2.5, z: 2.0 },
      note:'Pumice fallout was followed by destructive pyroclastic density currents. Deposits and written accounts constrain the sequence, but the calendar date and details remain debated. Ground-hugging density currents channel into valley topography.',
      timeline:frames([[0,'Before the eruption',0],[0.12,'Opening explosive activity',0.3],[0.28,'Sustained column and pumice fallout',0.85],[0.58,'Column instability and pyroclastic currents',1,0.65],[0.82,'Later destructive currents',0.65,1],[1,'Aftermath',0]])
    },
    tambora1815: {
      source:'https://pubs.usgs.gov/bul/1855/report.pdf',
      column:'≈43 km climax · USGS Bulletin 1855 / Self et al.',
      ejecta:'≈30–50 km³ DRE (100+ km³ tephra) · USGS',
      temp:'≈950–1,000 °C trachyandesite',
      so2:'≈60 Mt · Oppenheimer 2003 ice core record',
      ash:'Heavy fallout >1,300 km · USGS',
      wind:{ x: -2.5, z: 0.5 },
      note:'Years of unrest preceded the April explosions. The April 10–11 climax produced extensive pyroclastic flows and a 6-km caldera collapse. The event caused the global 1816 "Year Without a Summer".',
      timeline:frames([[0,'Unrest before April 1815',0],[0.16,'April 5: major opening explosion',0.55,0.15],[0.34,'Interval before the climax',0.15],[0.55,'April 10–11: climactic explosive sequence',1,1],[0.78,'Caldera-forming episode and continuing fallout',0.6,0.6],[1,'Aftermath and prolonged impacts',0]])
    },
    krakatoa1883: {
      source:'https://volcano.si.edu/volcano.cfm?vn=262000',
      column:'≈27–36 km · Royal Society Report 1888',
      ejecta:'≈18–21 km³ bulk tephra · Royal Society',
      temp:'≈900 °C dacite',
      so2:'≈15–20 Mt · atmospheric optical depth',
      ash:'Fallout >2,500 km across Indian Ocean',
      wind:{ x: -3.0, z: -0.5 },
      note:'Explosive activity culminated in August 1883 with the collapse of the island into a marine caldera. The explosions were heard 4,800 km away; generated tsunamis were the primary fatal hazard.',
      timeline:frames([[0,'Before the 1883 explosive sequence',0],[0.2,'Earlier explosive activity',0.3,0.1],[0.48,'Escalation toward the August climax',0.7,0.4],[0.7,'August 27: climactic explosions and collapse',1,1],[0.88,'Waning activity and tsunami aftermath',0.2,0.15],[1,'Aftermath',0]])
    },
    sthelenr1980: {
      source:'https://pubs.usgs.gov/gip/msh/climactic.html',
      column:'24 km peak in 15 min · USGS',
      ejecta:'≈2.5 km³ total deposit · USGS',
      temp:'≈800–900 °C dacite · USGS',
      so2:'≈1.5 Mt total · USGS airborne COSPEC',
      ash:'Traveled eastward across US; 1,500+ km',
      wind:{ x: 4.0, z: -0.5 },
      note:'On May 18, a magnitude 5.1 earthquake triggered a debris avalanche unroofing the pressurized cryptodome, producing a catastrophic northward lateral blast at >1,000 km/h followed by a vertical Plinian column.',
      timeline:frames([[0,'March–May: unrest and growing north-flank bulge',0],[0.15,'May 18, 8:32 a.m.: earthquake and debris avalanche',0.35,0.1],[0.19,'First minute: directed lateral blast',1,1],[0.34,'Vertical eruption column develops',0.85,0.3],[0.64,'Afternoon pyroclastic flows',0.75,0.9],[1,'Evening: activity wanes',0]])
    },
    pinatubo1991: {
      source:'https://pubs.usgs.gov/fs/1997/fs113-97/',
      column:'35 km climax · USGS Fact Sheet 113-97',
      ejecta:'≈5 km³ DRE (10 km³ tephra) · USGS',
      temp:'≈780–800 °C dacite · USGS',
      so2:'≈20 Mt · satellite TOMS measurement',
      ash:'Umbrella cloud spread 1,100 km · USGS',
      wind:{ x: -2.0, z: 2.0 },
      note:'Unrest and dome growth culminated in the June 15 Plinian climax, coinciding with Typhoon Yunya. The eruption created a 2.5-km caldera and injected 20 Mt of SO₂ into the stratosphere, cooling global climate ~0.5 °C for two years.',
      timeline:frames([[0,'April–early June: unrest',0],[0.18,'June 7: lava dome emerges',0.15],[0.25,'June 7–11: interval before major explosions',0],[0.38,'June 12: major explosive eruption',0.65,0.2],[0.57,'June 14–15: repeated explosions',0.8,0.5],[0.76,'June 15: climax, pyroclastic flows and caldera formation',1,1],[1,'Aftermath: persistent lahar hazards',0]])
    },
    eyja2010: {
      source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3418519/',
      column:'≈6–10 km · Gudmundsson et al. 2012',
      ejecta:'≈0.27 km³ tephra (0.18 km³ DRE)',
      temp:'≈1,000 °C basalt–benmoreite mix',
      so2:'≈0.1 Mt · OMI satellite / Gudmundsson',
      ash:'Airspace closed across northwestern Europe',
      wind:{ x: 3.5, z: 2.0 },
      note:'The March 20–April 12 Fimmvörðuháls flank eruption preceded the summit eruption. Subglacial eruption began April 14 under 200 m of glacial ice. Magma–meltwater interaction caused explosive thermal fragmentation, producing fine glass-rich ash that grounded European aviation.',
      timeline:frames([[0,'Before the March flank eruption',0],[0.08,'March 20–April 12: Fimmvörðuháls flank eruption',0.4],[0.14,'April 14: summit eruption under ice',0.15],[0.18,'April 14–18: first explosive phase',0.95],[0.43,'April 18–May 4: lower-discharge, mainly effusive phase',0.3],[0.68,'May 5–17: second explosive phase',0.85],[0.88,'May 18–22: declining phase',0.25],[1,'Late May: continuous activity ceases',0]])
    },
    maunaloa2022: {
      source:'https://pubs.usgs.gov/publication/70276497',
      column:'Fountains 20–25 m; gas plume 5–7 km · USGS',
      ejecta:'≈0.15–0.2 km³ basalt lava · USGS HVO',
      temp:'≈1,150 °C tholeiitic basalt · USGS HVO',
      so2:'Peak ≈0.2 Mt/day · USGS HVO',
      ash:'Negligible ash; fluid basalt · USGS HVO',
      wind:{ x: -1.5, z: -1.0 },
      note:'Lava initially erupted in Mokuʻāweoweo summit caldera before migrating to the Northeast Rift Zone. Fissure 3 produced sustained lava fountains and fed channeled `aʻā and pāhoehoe flows towards the Daniel K. Inouye Highway.',
      timeline:frames([[0,'Before November 27, 2022',0],[0.12,'November 27: summit eruption begins',0.8],[0.28,'November 28: Northeast Rift Zone fissures',1],[0.5,'Sustained fissure-fed lava flows',0.8],[0.85,'December: declining supply',0.3],[1,'December: eruption ends',0]])
    },
    yellowstone: {
      source:'https://www.usgs.gov/volcanoes/yellowstone',
      column:'Not modeled (hypothetical)',
      ejecta:'Not modeled',
      temp:'Not modeled',
      so2:'Not modeled',
      ash:'Not modeled',
      wind:{ x: 2.0, z: 0.0 },
      note:'Hypothetical exploration only. This is neither an ongoing eruption nor a prediction of when or how Yellowstone will erupt. No damage area, ash depth, gas release or climate outcome is predicted.',
      timeline:frames([[0,'Hypothetical starting conditions',0],[0.5,'User-designed scenario',1,1],[1,'Hypothetical endpoint',0]])
    }
  };
  const presets = [
      { id:'vesuvius79',  flag:'🇮🇹', name:'Mt Vesuvius', year:'79 AD · calendar date debated', timeOfDay: 13.0, duration: 18, vei:5, vtype:'strato',  intensity:82, column:27, viscosity:70, pyro:80,
        photoCaption: "Johan Christian Dahl's 1826 painting 'Vesuvius in Eruption', illustrating the incandescent lava stream and towering Plinian ash column over the Bay of Naples.",
        photoCredit: "Johan Christian Dahl (1826) · Städel Museum · Public Domain"
      },
      { id:'tambora1815', flag:'🇮🇩', name:'Tambora',     year:'Apr 10, 1815 · 7:00 PM', timeOfDay: 19.0, duration: 48, vei:7, vtype:'caldera', intensity:100, column:43, viscosity:80, pyro:95,
        photoCaption: "Mount Tambora's massive summit caldera (6 km wide and 1,100 m deep) photographed from the International Space Station, formed during the catastrophic 1815 collapse.",
        photoCredit: "NASA Earth Observatory · ISS Expedition 20 (2009) · Public Domain"
      },
      { id:'krakatoa1883',flag:'🇮🇩', name:'Krakatoa',    year:'Aug 27, 1883 · 10:02 AM', timeOfDay: 10.0, duration: 12, vei:6, vtype:'caldera', intensity:95, column:36, viscosity:75, pyro:90,
        photoCaption: "An 1888 Royal Society lithograph illustrating the ash column and electrical discharges during the climactic destruction of Krakatoa.",
        photoCredit: "Parker & Coward (1888) · The Royal Society of London · Public Domain"
      },
      { id:'sthelenr1980',flag:'🇺🇸', name:'Mt St Helens',year:'May 18, 1980 · 8:32 AM', timeOfDay: 8.5, duration: 9, vei:5, vtype:'strato',  intensity:78, column:24, viscosity:65, pyro:72, video: 'mount-st-helens-1980', videoCaption: 'U.S. Forest Service film of the May 18, 1980 eruption and its aftermath (clip 9:10–16:10). Public domain, National Archives (ARC 13364), via the Internet Archive.',
        photoCaption: "Mount St. Helens' vertical Plinian column climbing past 24 km into the stratosphere on May 18, 1980, following the north-flank debris avalanche and lateral blast.",
        photoCredit: "Austin Post · U.S. Geological Survey (USGS) · Public Domain"
      },
      { id:'pinatubo1991', flag:'🇵🇭', name:'Pinatubo',   year:'Jun 15, 1991 · 1:42 PM', timeOfDay: 13.7, duration: 9, vei:6, vtype:'strato',  intensity:92, column:35, viscosity:78, pyro:88,
        photoCaption: "Field measurement of airfall ash and pumice deposits from the June 1991 eruption near Clark Air Base.",
        photoCredit: "Pinatubo Volcano Observatory · U.S. Geological Survey (USGS) · Public Domain"
      },
      { id:'eyja2010',     flag:'🇮🇸', name:'Eyjafjallajökull',year:'Apr 14, 2010 · summit eruption', timeOfDay: 11.0, duration: 144, vei:4, vtype:'strato',  intensity:48, column:10, viscosity:40, pyro:18,
        photoCaption: "Volcanic ash advisory dispersion forecast chart from April 15, 2010, mapping the ash cloud that grounded European aviation.",
        photoCredit: "London VAAC / UK Met Office · Open Government Licence · Educational Use"
      },
      { id:'maunaloa2022', flag:'🇺🇸', name:'Mauna Loa',  year:'Nov 27, 2022 · 11:30 PM', timeOfDay: 23.5, duration: 300, vei:1, vtype:'shield',  intensity:38, column:4,  viscosity:10, pyro:5,
        photoCaption: "Fissure 3 erupting 20–25 m high basalt lava fountains feeding an active channelized flow on Mauna Loa's Northeast Rift Zone.",
        photoCredit: "K. Mulliken · USGS Hawaiian Volcano Observatory (HVO), Nov 30, 2022 · Public Domain"
      },
      { id:'yellowstone',  flag:'🇺🇸', name:'Yellowstone',year:'Hypothetical · Golden Hour', timeOfDay: 17.5, duration: 720, vei:8, vtype:'super', intensity:100, column:45, viscosity:95, pyro:100,
        photoCaption: "USGS map of Yellowstone’s most recent caldera and thermal features. The caldera records a past collapse; it does not map the footprint of this hypothetical scenario.",
        photoCredit: "U.S. Geological Survey · Volcanoes of the United States, figure 37 · Public domain"
      },
    ];
  const conduits = {
    vesuvius79: {
      name: 'Mt Vesuvius — 79 AD',
      peakHeightKm: 1.3,
      maxDepthKm: 12.0,
      widthKm: 16.0,
      layers: [
        { topKm: 0, bottomKm: 2.0, name: 'Quaternary Volcanic Tuffs & Sediments', color: '#3d2a22', pattern: 'dots' },
        { topKm: 2.0, bottomKm: 8.0, name: 'Mesozoic Carbonate Platform (Limestone/Dolomite)', color: '#4a4440', pattern: 'blocks' },
        { topKm: 8.0, bottomKm: 12.0, name: 'Hercynian Metamorphic Crystalline Basement', color: '#2b232c', pattern: 'slanted' }
      ],
      chamber: { x: 0, depthKm: 7.5, rxKm: 2.3, ryKm: 1.2, comp: 'Phonolite-Tephrite', temp: '900 °C' },
      conduits: [
        { type: 'pipe', x1: 0, y1: 6.3, x2: 0, y2: 0, widthM: 55 }
      ],
      sills: [],
      aquifers: [
        { x: 0, depthKm: 1.8, rxKm: 3.0, ryKm: 0.4 }
      ],
      exsolutionDepthKm: 2.5,
      annotations: [
        { x: 0, depthKm: 7.5, title: 'Phonolitic Magma Chamber', text: '7–8 km depth in Mesozoic carbonate rocks. Magma assimilated limestone, enriching volatiles.' },
        { x: 0, depthKm: 2.5, title: 'Gas Release and Fragmentation', text: 'CO₂ can exsolve deep in the crust; water-rich bubbles grow during ascent. Fragmentation occurs higher up. Displayed zone depths are illustrative, not measured boundaries.' }
      ]
    },

    tambora1815: {
      name: 'Mount Tambora — 1815',
      peakHeightKm: 4.3,
      maxDepthKm: 12.0,
      widthKm: 20.0,
      layers: [
        { topKm: 0, bottomKm: 3.0, name: 'Sunda Arc Volcanic Strata & Clastics', color: '#3c2b24', pattern: 'dots' },
        { topKm: 3.0, bottomKm: 12.0, name: 'Diorite-Granodiorite Arc Basement', color: '#332f38', pattern: 'blocks' }
      ],
      chamber: { x: 0, depthKm: 5.2, rxKm: 4.0, ryKm: 1.8, comp: 'Trachyandesite', temp: '980 °C' },
      conduits: [
        { type: 'pipe', x1: 0, y1: 3.4, x2: 0, y2: 0, widthM: 110 }
      ],
      sills: [],
      ringFaults: [
        { x: -3.0, y1: 0, y2: 3.5 },
        { x: 3.0, y1: 0, y2: 3.5 }
      ],
      aquifers: [],
      exsolutionDepthKm: 2.8,
      calderaCollapse: true,
      annotations: [
        { x: 0, depthKm: 5.2, title: 'High-Level Trachyandesite Reservoir', text: 'Trachyandesite erupted: 30–33 km³ DRE in Self et al. (2004); other reconstructions give about 41 km³. Reservoir geometry is illustrative.' },
        { x: -3.0, depthKm: 2.0, title: 'Caldera Ring Faults', text: 'Piston collapse of the roof block dropped the summit by 1,400 m, forming a 6 km caldera.' }
      ]
    },

    krakatoa1883: {
      name: 'Krakatoa — 1883',
      peakHeightKm: 0.8,
      maxDepthKm: 12.0,
      widthKm: 16.0,
      waterLevelKm: 0.05,
      layers: [
        { topKm: 0, bottomKm: 2.5, name: 'Sunda Strait Graben Marine Sediments', color: '#2a353c', pattern: 'dots' },
        { topKm: 2.5, bottomKm: 12.0, name: 'Tectonized Basement Crust', color: '#352e35', pattern: 'blocks' }
      ],
      chamber: { x: 0, depthKm: 4.2, rxKm: 3.2, ryKm: 1.5, comp: 'Dacite', temp: '900 °C' },
      conduits: [
        { type: 'pipe', x1: 0, y1: 2.7, x2: 0, y2: 0, widthM: 70 },
        { type: 'pipe', x1: 0, y1: 2.7, x2: -1.2, y2: 0, widthM: 45 },
        { type: 'pipe', x1: 0, y1: 2.7, x2: 1.0, y2: 0, widthM: 40 }
      ],
      sills: [],
      marineIngress: { x: -0.6, depthKm: 1.3 },
      aquifers: [
        { x: 0, depthKm: 0.5, rxKm: 5.0, ryKm: 0.5 }
      ],
      exsolutionDepthKm: 2.2,
      calderaCollapse: true,
      annotations: [
        { x: 0, depthKm: 4.2, title: 'Shallow Dacite Chamber', text: '3–5 km deep chamber under marine Sunda Strait.' },
        { x: -0.6, depthKm: 1.3, title: 'Possible Water–Magma Interaction', text: 'Debated: vent water–magma explosions and hot pyroclastic flows entering the sea are distinct proposed interactions.' }
      ]
    },

    sthelenr1980: {
      name: 'Mount St. Helens — 1980',
      peakHeightKm: 2.95,
      maxDepthKm: 12.0,
      widthKm: 16.0,
      layers: [
        { topKm: 0, bottomKm: 3.0, name: 'Tertiary Volcanic & Volcaniclastic Strata', color: '#382f28', pattern: 'dots' },
        { topKm: 3.0, bottomKm: 12.0, name: 'Volcanic and intrusive arc basement (schematic)', color: '#3b3542', pattern: 'blocks' }
      ],
      chamber: { x: 0, depthKm: 8.0, rxKm: 2.2, ryKm: 1.4, comp: 'Dacite', temp: '880 °C' },
      conduits: [
        { type: 'pipe', x1: 0, y1: 6.6, x2: 0, y2: 2.4, widthM: 50 },
        { type: 'pipe', x1: 0, y1: 2.4, x2: -1.6, y2: 1.2, widthM: 65 }
      ],
      cryptodome: { x: -1.6, depthKm: 1.2, rxKm: 1.1, ryKm: 0.7 },
      sills: [],
      aquifers: [],
      exsolutionDepthKm: 2.0,
      annotations: [
        { x: 0, depthKm: 8.0, title: 'Deep Dacite Reservoir', text: 'Primary magma chamber at 7–9 km depth feeding shallow ascent.' },
        { x: -1.6, depthKm: 1.2, title: 'North-Flank Cryptodome', text: 'Pressurized shallow intrusion unroofed by landslide to produce the lateral blast.' }
      ]
    },

    pinatubo1991: {
      name: 'Mount Pinatubo — 1991',
      peakHeightKm: 1.74,
      maxDepthKm: 14.0,
      widthKm: 16.0,
      layers: [
        { topKm: 0, bottomKm: 3.5, name: 'Andesite-Dacite Pyroclastic Apron', color: '#362f27', pattern: 'dots' },
        { topKm: 3.5, bottomKm: 14.0, name: 'Zambales Ophiolite (Gabbro/Basalt/Serpentinite)', color: '#2c3632', pattern: 'blocks' }
      ],
      chamber: { x: 0, depthKm: 6.5, rxKm: 2.8, ryKm: 1.5, comp: 'Dacite', temp: '790 °C' },
      deepBasaltChamber: { x: 0, depthKm: 12.0, rxKm: 3.2, ryKm: 1.2, comp: 'Basaltic Recharge', temp: '1150 °C' },
      conduits: [
        { type: 'pipe', x1: 0, y1: 5.0, x2: 0, y2: 0, widthM: 80 },
        { type: 'pipe', x1: 0, y1: 10.8, x2: 0, y2: 8.0, widthM: 60 }
      ],
      sills: [],
      aquifers: [],
      exsolutionDepthKm: 3.0,
      annotations: [
        { x: 0, depthKm: 6.5, title: 'Upper Dacite Chamber', text: 'Volatile-saturated dacite at 6–8 km depth.' },
        { x: 0, depthKm: 12.0, title: 'Deep Basaltic Recharge', text: 'Hot basalt from >12 km injected into dacite, adding heat and gas; the climactic eruption was predominantly dacite.' }
      ]
    },

    eyja2010: {
      name: 'Eyjafjallajökull — 2010',
      peakHeightKm: 1.66,
      maxDepthKm: 12.0,
      widthKm: 16.0,
      glacierThicknessKm: 0.2,
      layers: [
        { topKm: 0, bottomKm: 0.2, name: 'Glacial Ice Cap (200 m)', color: '#4ba7c2', pattern: 'ice' },
        { topKm: 0.2, bottomKm: 5.0, name: 'Upper Basalt Lavas & Hyaloclastites', color: '#333339', pattern: 'dots' },
        { topKm: 5.0, bottomKm: 12.0, name: 'Thick Icelandic Basaltic Crust (schematic)', color: '#272c2f', pattern: 'blocks' }
      ],
      chamber: { x: 0, depthKm: 4.8, rxKm: 3.0, ryKm: 0.8, comp: 'Basaltic-Benmoreite Sill Complex', temp: '1020 °C' },
      conduits: [
        { type: 'pipe', x1: 0.6, y1: 4.0, x2: 0, y2: 0.2, widthM: 45 }
      ],
      sills: [
        { x: -1.2, depthKm: 5.2, rxKm: 2.2, ryKm: 0.3 },
        { x: 1.5, depthKm: 4.2, rxKm: 2.0, ryKm: 0.3 }
      ],
      aquifers: [
        { x: 0, depthKm: 0.2, rxKm: 1.5, ryKm: 0.2 }
      ],
      exsolutionDepthKm: 1.5,
      annotations: [
        { x: 0, depthKm: 0.1, title: '200 m Glacial Ice Cap', text: 'Meltwater flooded into the vent, shattering magma into ultrafine glass particles.' },
        { x: 0, depthKm: 4.8, title: 'Mid-Crustal Sill Complex', text: 'Layered horizontal sills at 4–6 km depth fed by deep mantle conduit.' }
      ]
    },

    maunaloa2022: {
      name: 'Mauna Loa — 2022',
      peakHeightKm: 4.17,
      maxDepthKm: 14.0,
      widthKm: 28.0,
      layers: [
        { topKm: 0, bottomKm: 5.0, name: 'Subaerial Basaltic Shield Lavas', color: '#382e27', pattern: 'dots' },
        { topKm: 5.0, bottomKm: 10.0, name: 'Oceanic Crust & Volcanic Edifice Base', color: '#2e2d36', pattern: 'blocks' },
        { topKm: 10.0, bottomKm: 14.0, name: 'Mantle Lithosphere Overlying Hotspot Plume', color: '#3f1a14', pattern: 'slanted' }
      ],
      chamber: { x: 0, depthKm: 3.5, rxKm: 2.5, ryKm: 1.2, comp: 'Tholeiitic Basalt', temp: '1160 °C' },
      conduits: [
        { type: 'pipe', x1: 0, y1: 14.0, x2: 0, y2: 3.5, widthM: 80 },
        { type: 'pipe', x1: 0, y1: 2.3, x2: 0, y2: 0, widthM: 40 },
        // Northeast Rift Zone lateral blade dike
        { type: 'pipe', x1: 0, y1: 2.5, x2: 6.5, y2: 1.5, widthM: 50 },
        { type: 'pipe', x1: 6.5, y1: 1.5, x2: 6.8, y2: 0, widthM: 45 }
      ],
      sills: [],
      aquifers: [],
      exsolutionDepthKm: 1.0,
      annotations: [
        { x: 0, depthKm: 3.5, title: 'Summit Caldera Reservoir', text: 'Shallow 3–4 km reservoir beneath Mokuʻāweoweo fed by the Hawaiian hotspot plume.' },
        { x: 6.5, depthKm: 1.2, title: 'Northeast Rift Zone Lateral Dike', text: 'Northeast Rift Zone fissures fed lava flows. Sheet geometry is illustrative; lava-flow length is not dike propagation distance.' }
      ]
    },

    yellowstone: {
      name: 'Yellowstone Supervolcano',
      peakHeightKm: 2.8,
      maxDepthKm: 16.0,
      widthKm: 36.0,
      layers: [
        { topKm: 0, bottomKm: 4.0, name: 'Rhyolite Caldera-Fill & Geothermal Aquifers', color: '#3d332c', pattern: 'dots' },
        { topKm: 4.0, bottomKm: 16.0, name: 'Continental Granitic Crust', color: '#3b3442', pattern: 'blocks' }
      ],
      chamber: { x: 0, depthKm: 8.5, rxKm: 14.0, ryKm: 3.8, comp: 'Rhyolite Partial Melt', temp: '820 °C' },
      deepBasaltChamber: { x: 0, depthKm: 18.0, rxKm: 16.0, ryKm: 4.0, comp: 'Lower Basaltic Mush', temp: '1100 °C' },
      conduits: [
        { type: 'pipe', x1: -6.0, y1: 4.7, x2: -6.0, y2: 0, widthM: 70 },
        { type: 'pipe', x1: 6.0, y1: 4.7, x2: 6.0, y2: 0, widthM: 70 },
        { type: 'pipe', x1: 0, y1: 4.7, x2: 0, y2: 0, widthM: 50 }
      ],
      sills: [],
      aquifers: [
        { x: -5.0, depthKm: 1.5, rxKm: 3.0, ryKm: 0.8 },
        { x: 5.0, depthKm: 1.5, rxKm: 3.0, ryKm: 0.8 }
      ],
      exsolutionDepthKm: 3.5,
      annotations: [
        { x: 0, depthKm: 8.5, title: 'Giant Upper Rhyolite Reservoir', text: 'The 2015 seismic model infers an upper reservoir at 5–17 km with about 9% melt, above a 20–50 km lower reservoir with about 2% melt. These are model estimates, not liquid tanks.' },
        { x: -6.0, depthKm: 2.2, title: 'Caldera Ring Fractures', text: 'Hot water feeds geysers. Mallard Lake and Sour Creek are resurgent domes inside the caldera; no open magma conduits are depicted.' }
      ]
    }
  };

  // Provenance is field-specific. Unconstrained coordinates are artistic choices,
  // never relabelled as observations merely because a paper is cited nearby.
  const sources = {
    model: { title: 'Illustrative teaching geometry and zone depths', url: null },
    mush: { title: 'Cashman et al. (2017), Vertically extensive and unstable magmatic systems', url: 'https://doi.org/10.1126/science.aag3055' },
    vesuvius: { title: 'Scaillet et al. (2008); Aravena et al. (2019)', url: 'https://flore.unifi.it/retrieve/e398c37e-a94c-179a-e053-3705fe0a4cff/Aravena_et_al-2019-Journal_of_Geophysical_Research__Solid_Earth.pdf' },
    vesuviusDRE: { title: 'Scaillet et al. (2024), sulphur yields', url: 'https://comptes-rendus.academie-sciences.fr/geoscience/articles/en/10.5802/crgeos.276/' },
    tambora: { title: 'Self et al. (2004), 30–33 km³ magma', url: 'https://doi.org/10.1029/2004GL020925' },
    tamboraComp: { title: 'Gertisser et al. (2012), Tambora trachyandesite', url: 'https://researchers.mq.edu.au/en/publications/processes-and-timescales-of-magma-genesis-and-differentiation-lea/' },
    krakatoaSelf: { title: 'Self and Rampino (1981), evidence against magma–seawater-driven explosions', url: 'https://www.nature.com/articles/294699a0' },
    tamboraAlt: { title: 'Tambora volume reconstructions reviewed (2022)', url: 'https://www.scielo.org.mx/scielo.php?lng=es&nrm=iso&pid=S0016-71692022000100005&script=sci_arttext_plus&tlng=en' },
    krakatoa: { title: 'Mandeville et al. (1996), flows over water', url: 'https://digitalcommons.uri.edu/gsofacpubs/1077/' },
    sthelens: { title: 'USGS field guide (2017), reservoir constraints', url: 'https://pubs.usgs.gov/sir/2017/5022/d/sir20175022d.pdf' },
    pinatubo: { title: 'USGS Fire and Mud, petrology and basalt recharge', url: 'https://pubs.usgs.gov/pinatubo/section6.html' },
    eyjaVolume: { title: 'Gudmundsson et al. (2012), summit eruption deposits', url: 'https://www.nature.com/articles/srep00572' },
    krakatoaVolume: { title: 'USGS (1984), citing Self and Rampino (1981), about 10 km³ magma', url: 'https://pubs.usgs.gov/of/1984/0939/report.pdf' },
    eyja: { title: 'Tarasewicz et al. (2012), intrusion model after Sigmundsson et al. (2010)', url: 'https://doi.org/10.1029/2011JB008751' },
    maunaloa: { title: 'USGS 2022 summit and Northeast Rift Zone mapping', url: 'https://www.usgs.gov/data/geospatial-database-2022-summit-and-northeast-rift-zone-eruption-mauna-loa-volcano-hawaii' },
    yellowstone: { title: 'Huang et al. (2015), seismic inversion (dated model)', url: 'https://tsai.digitalscholarship.brown.edu/files/Huang_etal_Science2015All.pdf' }
  };
  const evidence = (value, src, confidence = 'inferred') => ({ value, src, confidence });
  const profileSource = ['vesuvius','tambora','krakatoa','sthelens','pinatubo','eyja','maunaloa','yellowstone'];
  Object.entries(conduits).forEach(([id, p], index) => {
    const source = profileSource[index];
    p.sources = sources;
    p.section = { orientation: id === 'maunaloa2022' ? 'SW–NE along Northeast Rift Zone' : id === 'sthelenr1980' ? 'North–South; north at left' : 'Schematic section; azimuth unconstrained', reference: id === 'yellowstone' ? 'local ground datum' : 'sea level', src: 'model', confidence: 'illustrative' };
    p.edifice = { summitHeightKm: p.peakHeightKm, halfWidthKm: id === 'tambora1815' ? 10 : p.widthKm * 0.32, shape: id === 'maunaloa2022' ? 'shield' : id === 'yellowstone' ? 'plateau' : 'cone', rim: id === 'vesuvius79' ? 'Monte Somma rim (reconstruction)' : id === 'maunaloa2022' ? 'Mokuʻāweoweo caldera' : '', postEruption: { summitHeightKm: id === 'tambora1815' ? 2.9 : p.peakHeightKm * (p.calderaCollapse || id === 'pinatubo1991' ? 0.65 : 1), craterHalfWidthKm: id === 'tambora1815' ? 3 : 1.2 }, src: 'model', confidence: 'illustrative' };
    p.reservoirs = [p.chamber, p.deepBasaltChamber].filter(Boolean).map(ch => ({ ...ch, depthRangeKm: [ch.depthKm-ch.ryKm, ch.depthKm+ch.ryKm], meltFraction: 0.35, temperatureC: parseFloat(ch.temp), compositionLayers: [ch.comp], src: 'model', confidence: 'illustrative' }));
    p.dikes = p.conduits;
    p.fragmentationDepthKm = id === 'maunaloa2022' || id === 'yellowstone' ? null : 0.7;
    p.gasOnsetDepthKm = 8;
    p.ruptureThresholdMPa = [10,20];
    p.eruptedDRE = evidence(null, 'model', 'illustrative');
    p.reservoirs.forEach(r => { r.evidence = { composition: evidence(r.comp, source), temperatureC: evidence(r.temperatureC, 'model', 'illustrative'), depthRangeKm: evidence(r.depthRangeKm, 'model', 'illustrative'), meltFraction: evidence(r.meltFraction, 'model', 'illustrative') }; });
    p.annotations.forEach(a => { a.src = source; a.confidence = 'illustrative'; });
    if (id === 'vesuvius79') {
      const r = p.reservoirs[0]; r.comp = 'Layered phonolite / tephriphonolite'; r.compositionLayers = ['White pumice: phonolite','Grey pumice: tephriphonolite'];
      r.evidence.composition = evidence('White phonolite over grey tephriphonolite', 'vesuviusDRE'); r.evidence.depthRangeKm = evidence([7,8], 'vesuvius'); r.temperatureC = 815; r.evidence.temperatureC = evidence([805,825], 'vesuviusDRE');
      p.eruptedDRE = evidence([1.5,1.5], 'vesuviusDRE');
      window.VolcanoHistory[id].temp = '≈815 °C white-pumice phonolite · phase-equilibrium estimate';
    }
    if (id === 'tambora1815') { p.eruptedDRE = evidence([30,33], 'tambora'); p.reservoirs[0].evidence.composition = evidence('Trachyandesite', 'tamboraComp'); p.annotations.push({x:2,depthKm:6.5,title:'Erupted volume differs among studies',text:'Self et al. estimate 30–33 km³ DRE. Other reconstructions give about 41 ± 4 km³. Bulk ash volume includes pore space and is larger.',src:'tamboraAlt',confidence:'debated'}); }
    if (id === 'krakatoa1883') { p.eruptedDRE = evidence([10,10], 'krakatoaVolume'); p.marineIngress.confidence = 'debated'; p.marineIngress.src = 'krakatoa'; p.annotations[1].confidence = 'debated'; p.annotations.push({x:1,depthKm:1.8,title:'Evidence against seawater as the explosion driver',text:'Self and Rampino (1981) found grain-size evidence against magma–seawater-driven explosions. Mandeville et al. studied steam generation at the flow–sea interface; this does not prove seawater entered a vent.',src:'krakatoaSelf',confidence:'debated'}); }
    if (id === 'sthelenr1980') {
      p.cryptodome.depthKm = -1.3; p.cryptodome.ryKm = 0.35;
      p.dikes[1].y2 = -1.3; p.annotations[1].depthKm = -1.3;
      p.reservoirs[0].evidence.depthRangeKm = evidence([7,14], 'sthelens', 'debated');
      p.annotations[0].text = 'Petrology and geophysics constrain a reservoir around 7–14 km; the ellipse is illustrative, not a mapped tank.';
    }
    if (id === 'pinatubo1991') {
      p.reservoirs[0].meltFraction = 0.55; p.reservoirs[0].evidence.meltFraction = evidence([0.5,0.6], 'pinatubo'); p.reservoirs[0].evidence.temperatureC = evidence([780,800], 'pinatubo');
      p.eruptedDRE = evidence([5,5.3], 'tambora');
    }
    if (id === 'eyja2010') {
      p.eruptedDRE = evidence([0.13,0.23], 'eyjaVolume');
      p.reservoirs[0].comp = 'Benmoreite–trachyte summit magma';
      p.reservoirs[0].evidence.composition = evidence(p.reservoirs[0].comp, 'eyjaVolume');
      window.VolcanoHistory[id].temp = 'Temperature illustrative · summit benmoreite–trachyte';
      window.VolcanoHistory[id].ejecta = '≈0.27 km³ airborne tephra; 0.18 ± 0.05 km³ total DRE';
      p.layers.shift(); p.layers[0].topKm = 0;
      p.sills[0].depthKm = 5.5; p.sills[1].depthKm = 4.5;
      p.reservoirs[0].evidence.depthRangeKm = evidence([3.9,6], 'eyja');
      p.annotations[1].text = 'Deformation models infer sill inflation at 3.9–6.0 km. The blades shown here are schematic, and their thickness is enlarged.';
    }
    if (id === 'maunaloa2022') p.dikes.shift(); // no claimed mapped path from mantle
    if (id === 'yellowstone') {
      p.edifice.summitHeightKm = 0.3; p.edifice.halfWidthKm = 48; p.edifice.postEruption.summitHeightKm = 0.3;
      p.widthKm = 100; p.maxDepthKm = 52; p.layers[1].bottomKm = 52; p.dikes = [];
      Object.assign(p.reservoirs[0], { depthKm:11, ryKm:6, rxKm:45, depthRangeKm:[5,17], meltFraction:0.09, reservoirVolumeKm3:10000 });
      Object.assign(p.reservoirs[1], { depthKm:35, ryKm:15, rxKm:38, depthRangeKm:[20,50], meltFraction:0.02, reservoirVolumeKm3:46000 });
      p.reservoirs.forEach(r => { r.evidence.depthRangeKm = evidence(r.depthRangeKm,'yellowstone'); r.evidence.meltFraction = evidence(r.meltFraction,'yellowstone'); r.evidence.reservoirVolumeKm3 = evidence(r.reservoirVolumeKm3,'yellowstone'); });
      p.annotations[0].depthKm = 11;
    }
    // Sheets connect to the reconstructed cone, rather than ending at sea level.
    const surfaceDepth = x => -p.edifice.summitHeightKm * Math.pow(Math.max(0, 1-Math.abs(x)/p.edifice.halfWidthKm),p.edifice.shape === 'shield' ? 0.65 : 1);
    p.dikes.forEach((d,i) => {
      d.surface = d.y2 <= 0.2 && !(id === 'sthelenr1980' && i === 1);
      if (d.surface) d.y2 = surfaceDepth(d.x2);
    });
    if (id === 'eyja2010') p.dikes.push({ x1:0,y1:4.8,x2:4,y2:surfaceDepth(4),widthM:45,flank:true,surface:true });
    p.stages = window.VolcanoHistory[id].timeline.map(f => ({ at:f.at, key:f.label, label:f.label, activity:f.intensity, withdrawal:f.at, collapse:p.calderaCollapse || id === 'pinatubo1991' ? Math.max(0,(f.at-0.55)/0.45) : 0, src:'model', confidence:'illustrative' }));
    // A metadata tree mirrors every scalar field, including art coordinates.
    const tag = value => {
      if (Array.isArray(value)) return value.map(tag);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k]) => !['sources','provenance','evidence'].includes(k)).map(([k,v]) => [k,tag(v)]));
      return { src:'model', confidence:'illustrative' };
    };
    p.provenance = tag(p);
    delete p.chamber; delete p.deepBasaltChamber; delete p.conduits;
  });
  const hosts = ["Carbonate", "Arc Diorite", "Marine Graben", "Granodiorite", "Ophiolite", "Basalt / Ice", "Ocean Basalt", "Granitic"];
  presets.forEach((preset, index) => {
    preset.photo = `../../assets/images/lessons/volcano-simulator/${preset.id}-photo.jpg`;
    if (preset.id === 'yellowstone') preset.photo = '../../assets/images/lessons/volcano-simulator/yellowstone-caldera.gif';
    Object.assign(window.VolcanoHistory[preset.id], { preset, host: hosts[index], conduit: conduits[preset.id] });
  });
})();
