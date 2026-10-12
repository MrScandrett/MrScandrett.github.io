/* Documented sequence, with explicitly illustrative animation keyframes.
   at is a teaching-sequence position, NOT elapsed-time fraction.
   intensity and pyro are dimensionless art controls, NOT measurements. */
(() => {
  const frames = rows => rows.map(([at, label, intensity, pyro = 0]) => ({ at, label, intensity, pyro }));
  window.VolcanoHistory = {
    vesuvius79: {
      source:'https://www.ov.ingv.it/index.php/storia-vesuvio/pompei',
      note:'Pumice fallout was followed by destructive pyroclastic currents. Deposits and written accounts constrain the sequence, but the calendar date and details remain debated. The scene does not reconstruct individual surge paths.',
      timeline:frames([[0,'Before the eruption',0],[0.12,'Opening explosive activity',0.3],[0.28,'Sustained column and pumice fallout',0.85],[0.58,'Column instability and pyroclastic currents',1,0.65],[0.82,'Later destructive currents',0.65,1],[1,'Aftermath',0]])
    },
    tambora1815: {
      source:'https://pubs.usgs.gov/bul/1855/report.pdf',
      note:'Years of unrest preceded the April explosions. The April 10–11 climax produced extensive pyroclastic deposits and a caldera. This compressed sequence does not resolve the precise timing of collapse or model its climatic consequences.',
      timeline:frames([[0,'Unrest before April 1815',0],[0.16,'April 5: major opening explosion',0.55,0.15],[0.34,'Interval before the climax',0.15],[0.55,'April 10–11: climactic explosive sequence',1,1],[0.78,'Caldera-forming episode and continuing fallout',0.6,0.6],[1,'Aftermath and prolonged impacts',0]])
    },
    krakatoa1883: {
      source:'https://volcano.si.edu/volcano.cfm?vn=262000',
      note:'Explosive activity culminated in the August 1883 destruction of much of the island and caldera formation. Tsunamis were a major hazard; no tsunami propagation or mapped damage footprint is simulated.',
      timeline:frames([[0,'Before the 1883 explosive sequence',0],[0.2,'Earlier explosive activity',0.3,0.1],[0.48,'Escalation toward the August climax',0.7,0.4],[0.7,'August 27: climactic explosions and collapse',1,1],[0.88,'Waning activity and tsunami aftermath',0.2,0.15],[1,'Aftermath',0]])
    },
    sthelenr1980: {
      source:'https://pubs.usgs.gov/gip/msh/climactic.html',
      note:'On May 18, a debris avalanche unroofed the pressurized system and a lateral blast swept outward. A vertical column and later pyroclastic flows followed. The avalanche and directed blast are described here but are not physically reconstructed by the radial particle scene.',
      timeline:frames([[0,'March–May: unrest and growing north-flank bulge',0],[0.15,'May 18, 8:32 a.m.: earthquake and debris avalanche',0.35,0.1],[0.19,'First minute: directed lateral blast',1,1],[0.34,'Vertical eruption column develops',0.85,0.3],[0.64,'Afternoon pyroclastic flows',0.75,0.9],[1,'Evening: activity wanes',0]])
    },
    pinatubo1991: {
      source:'https://pubs.usgs.gov/fs/1997/fs113-97/',
      so2:'≈20 Mt · historical estimate',
      note:'Unrest and smaller eruptions preceded the June 15 climax. The approximately 20 Mt SO₂ estimate describes the eruption, not a slider calculation or instantaneous emission rate. No uncertainty interval is supplied here; atmospheric transport and chemistry are not modeled.',
      timeline:frames([[0,'April–early June: unrest',0],[0.18,'June 7: lava dome emerges',0.15],[0.38,'June 12: major explosive eruption',0.65,0.2],[0.57,'June 14–15: repeated explosions',0.8,0.5],[0.76,'June 15: climax, pyroclastic flows and caldera formation',1,1],[1,'Aftermath: persistent lahar hazards',0]])
    },
    eyja2010: {
      source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3418519/',
      note:'This sequence covers the April–May summit eruption. Ice melting and magma–water interaction accompanied ash production. Flood routing and fragmentation by water are not modeled. Phase dates follow the published reconstruction; slider intervals are compressed for teaching.',
      timeline:frames([[0,'April 14: initial subglacial melting',0.15],[0.18,'April 14–18: first explosive phase',0.95],[0.43,'April 18–May 4: lower-discharge, mainly effusive phase',0.3],[0.68,'May 5–17: second explosive phase',0.85],[0.88,'May 18–22: declining phase',0.25],[1,'Late May: continuous activity ceases',0]])
    },
    maunaloa2022: {
      source:'https://pubs.usgs.gov/publication/70276497',
      note:'Lava first covered the summit caldera, then activity shifted to the Northeast Rift Zone. Fissure-fed fluid lava dominates this event. The generic rim vents do not reproduce mapped fissures or actual flow routes; pyroclastic activity is disabled in historical playback.',
      timeline:frames([[0,'Before November 27, 2022',0],[0.12,'November 27: summit eruption begins',0.8],[0.28,'November 28: Northeast Rift Zone fissures',1],[0.5,'Sustained fissure-fed lava flows',0.8],[0.85,'December: declining supply',0.3],[1,'December: eruption ends',0]])
    },
    yellowstone: {
      source:'https://www.usgs.gov/volcanoes/yellowstone',
      note:'Hypothetical exploration only. This is neither an ongoing eruption nor a prediction of when or how Yellowstone will erupt. No damage area, ash depth, gas release or climate outcome is predicted.',
      timeline:frames([[0,'Hypothetical starting conditions',0],[0.5,'User-designed scenario',1,1],[1,'Hypothetical endpoint',0]])
    }
  };
})();
