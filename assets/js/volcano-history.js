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
      temp:'≈950–1,000 °C trachydacite',
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
      timeline:frames([[0,'April–early June: unrest',0],[0.18,'June 7: lava dome emerges',0.15],[0.38,'June 12: major explosive eruption',0.65,0.2],[0.57,'June 14–15: repeated explosions',0.8,0.5],[0.76,'June 15: climax, pyroclastic flows and caldera formation',1,1],[1,'Aftermath: persistent lahar hazards',0]])
    },
    eyja2010: {
      source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3418519/',
      column:'≈6–10 km · Gudmundsson et al. 2012',
      ejecta:'≈0.27 km³ tephra (0.18 km³ DRE)',
      temp:'≈1,000 °C basalt–benmoreite mix',
      so2:'≈0.1 Mt · OMI satellite / Gudmundsson',
      ash:'Airspace closed across northwestern Europe',
      wind:{ x: 3.5, z: 2.0 },
      note:'Subglacial eruption began April 14 under 200 m of glacial ice. Magma–meltwater interaction caused explosive thermal fragmentation, producing fine glass-rich ash that grounded European aviation.',
      timeline:frames([[0,'April 14: initial subglacial melting',0.15],[0.18,'April 14–18: first explosive phase',0.95],[0.43,'April 18–May 4: lower-discharge, mainly effusive phase',0.3],[0.68,'May 5–17: second explosive phase',0.85],[0.88,'May 18–22: declining phase',0.25],[1,'Late May: continuous activity ceases',0]])
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
})();
