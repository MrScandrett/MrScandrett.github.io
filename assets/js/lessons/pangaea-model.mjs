/**
 * Pure scientific data, paleogeographic markers, seafloor spreading math,
 * drift speed calculations, mission evaluators, and quiz grading for the
 * Pangaea & Continental Drift lesson.
 *
 * Coastline polygons themselves come exclusively from EarthEngine's 25
 * MULLER2019 GPlates snapshots (0–240 Ma in 10 Ma steps). Marker tracks here
 * are illustrative educational pins anchored to verified continental centroids.
 */

export const KEYFRAME_AGES = Object.freeze([240, 200, 160, 120, 80, 40, 0]);

export const GEOLOGIC_PERIODS = Object.freeze([
  {
    id: 'triassic',
    name: 'Triassic',
    era: 'Mesozoic Era',
    startMa: 252,
    endMa: 201,
    color: '#c084fc',
    badgeBg: 'rgba(192, 132, 252, 0.2)',
    summary: 'Peak Pangaea assembly; vast arid interiors, early dinosaurs, and mammal-like reptiles.'
  },
  {
    id: 'jurassic',
    name: 'Jurassic',
    era: 'Mesozoic Era',
    startMa: 201,
    endMa: 145,
    color: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.2)',
    summary: 'Central Atlantic rifting splits Laurasia from Gondwana; lush coastal basins expand.'
  },
  {
    id: 'cretaceous',
    name: 'Cretaceous',
    era: 'Mesozoic Era',
    startMa: 145,
    endMa: 66,
    color: '#4ade80',
    badgeBg: 'rgba(74, 222, 128, 0.2)',
    summary: 'South Atlantic opens, India detaches and races north, high sea levels flood continents.'
  },
  {
    id: 'paleogene',
    name: 'Paleogene',
    era: 'Cenozoic Era',
    startMa: 66,
    endMa: 23,
    color: '#fbbf24',
    badgeBg: 'rgba(251, 191, 36, 0.2)',
    summary: 'India collides with Eurasia raising the Himalayas; Australia separates from Antarctica.'
  },
  {
    id: 'neogene',
    name: 'Neogene & Quaternary',
    era: 'Cenozoic Era',
    startMa: 23,
    endMa: 0,
    color: '#fb923c',
    badgeBg: 'rgba(251, 146, 60, 0.2)',
    summary: 'Continents approach modern positions; Antarctic ice sheets expand and Panama closes.'
  }
]);

export function getGeologicPeriod(ageMa) {
  const age = Math.max(0, Math.min(240, Number(ageMa) || 0));
  if (age > 201) return GEOLOGIC_PERIODS[0];
  if (age > 145) return GEOLOGIC_PERIODS[1];
  if (age > 66) return GEOLOGIC_PERIODS[2];
  if (age > 23) return GEOLOGIC_PERIODS[3];
  return GEOLOGIC_PERIODS[4];
}

export const NARRATIVE_FRAMES = Object.freeze([
  {
    time: 240,
    title: 'Pangaea assembled',
    summary: 'Most major landmasses are locked together in a single supercontinent surrounded by the global Panthalassa Ocean. The Atlantic Ocean has not opened yet, and the southern continents travel together as Gondwana.',
    ocean: 'No Atlantic Ocean yet',
    motion: 'Supercontinent still joined',
    atlanticKmApprox: 0,
    indiaLatApprox: -50,
    guide: [
      'Africa and South America are locked along their continental shelves.',
      'North America and Eurasia form the northern supercontinent mass (Laurasia).',
      'India, Australia, and Antarctica sit far south inside Gondwana.'
    ],
    note: 'MULLER2019 model snapshots (EarthByte, CC BY 4.0) shown at discrete 10 Ma ages.'
  },
  {
    time: 200,
    title: 'Rifting begins',
    summary: 'Mantle heat and lithospheric stretching crack Pangaea. Massive rift volcanism erupts along eastern North America and northwest Africa as North America begins edging away.',
    ocean: 'Atlantic rift beginning',
    motion: 'First major splits',
    atlanticKmApprox: 400,
    indiaLatApprox: -49,
    guide: [
      'Spot the first narrow rift opening between North America and Northwest Africa.',
      'South America still fits tightly against Africa.',
      'India remains anchored between Africa, Madagascar, and Antarctica.'
    ],
    note: 'Continental drift becomes visible once rifting begins, though most landmasses remain clustered.'
  },
  {
    time: 160,
    title: 'Central Atlantic opens',
    summary: 'Seafloor spreading widens the Central Atlantic Ocean. North America and Eurasia separate while Gondwana begins fracturing along eastern Africa.',
    ocean: 'Young Atlantic basin',
    motion: 'North Atlantic widening',
    atlanticKmApprox: 1600,
    indiaLatApprox: -48,
    guide: [
      'North America moves steadily northwest away from Africa.',
      'South America and Africa still fit like puzzle pieces.',
      'Australia and Antarctica remain joined in the far south.'
    ],
    note: 'Ocean basins grow continuously at mid-ocean ridges as new basaltic crust forms.'
  },
  {
    time: 120,
    title: 'South Atlantic opens',
    summary: 'A rift unzips the South Atlantic from south to north. South America pulls away from Africa, India detaches from Gondwana, and Australia begins loosening from Antarctica.',
    ocean: 'Atlantic clearly opening',
    motion: 'South America separates',
    atlanticKmApprox: 2900,
    indiaLatApprox: -47,
    guide: [
      'Compare South America and Africa: their matching coastlines are clearly drifting apart.',
      'India is breaking free to begin its rapid northward crossing of the Tethys Ocean.',
      'Notice how high Cretaceous latitudes stay ice-free on this warm planet.'
    ],
    note: 'Separated but still close, South America and Africa show why Wegener spotted the jigsaw fit.'
  },
  {
    time: 80,
    title: 'India races north',
    summary: 'The Atlantic widens rapidly. India sprints northward across the Tethys Ocean at ~15 cm/yr—the fastest plate motion in recent Earth history—while Australia splits away from Antarctica.',
    ocean: 'Atlantic widening fast',
    motion: 'India sprinting north',
    atlanticKmApprox: 4200,
    indiaLatApprox: -30,
    guide: [
      'Track India crossing the southern Indian Ocean toward Eurasia.',
      'The Atlantic Ocean now forms a continuous north–south seaway.',
      'Australia drifts northeast while Antarctica settles over the South Pole.'
    ],
    note: 'Rapid subduction along the northern Tethys margin pulled the Indian plate northward.'
  },
  {
    time: 40,
    title: 'Collision course',
    summary: 'India collides with Eurasia, buckling the crust upward to raise the Himalayas and Tibetan Plateau. Antarctica becomes isolated by deep ocean currents and starts to freeze.',
    ocean: 'Mature Atlantic basin',
    motion: 'Himalayan uplift underway',
    atlanticKmApprox: 5000,
    indiaLatApprox: 9,
    guide: [
      'India is slamming into southern Asia, closing the ancient Tethys Ocean.',
      'Australia pulls well clear of Antarctica, allowing circum-Antarctic currents to form.',
      'Africa creeps north toward Europe, narrowing the Mediterranean.'
    ],
    note: 'Changing ocean gateways redirect ocean currents and reshape global climate.'
  },
  {
    time: 0,
    title: 'Modern arrangement',
    summary: 'Continents reach their present-day positions. The Atlantic continues widening by ~2.5 cm per year, India remains welded into Asia, and Antarctica sits isolated under thick polar ice.',
    ocean: 'Wide Atlantic Ocean',
    motion: 'Drift continues (~2–7 cm/yr)',
    atlanticKmApprox: 5600,
    indiaLatApprox: 23,
    guide: [
      'The Americas sit thousands of kilometers west of Europe and Africa.',
      'The Himalayan mountain belt marks the ongoing India–Asia collision.',
      'Today is just one snapshot—plates continue moving every year.'
    ],
    note: 'Plates still move at roughly the speed your fingernails grow.'
  }
]);

export function getNarrativeFrame(ageMa) {
  const age = Math.max(0, Math.min(240, Number(ageMa) || 0));
  return NARRATIVE_FRAMES.reduce(
    (best, frame) => (Math.abs(frame.time - age) < Math.abs(best.time - age) ? frame : best),
    NARRATIVE_FRAMES[0]
  );
}

/**
 * Verified continental centroids anchored directly to GPlates MULLER2019 polygons
 * at the 7 keyframe ages (all verified with d3.geoContains === true).
 */
const CONTINENT_TRACKS = Object.freeze([
  {
    id: 'north-america',
    name: 'North America',
    track: { 240: [-27.2, 10.7], 200: [-29.2, 20.4], 160: [-35.0, 26.2], 120: [-41.9, 35.6], 80: [-61.4, 48.0], 40: [-82.1, 49.8], 0: [-93.6, 49.8] }
  },
  {
    id: 'south-america',
    name: 'South America',
    track: { 240: [-33.9, -30.7], 200: [-36.5, -21.4], 160: [-37.7, -22.5], 120: [-34.6, -22.3], 80: [-43.9, -17.3], 40: [-52.6, -12.6], 0: [-58.9, -8.9] }
  },
  {
    id: 'africa',
    name: 'Africa',
    track: { 240: [-3.5, -51.6], 200: [-11.1, -43.6], 160: [-10.1, -42.8], 120: [-2.1, -40.3], 80: [8.7, -27.9], 40: [14.1, -17.5], 0: [22.2, -10.7] }
  },
  {
    id: 'eurasia',
    name: 'Eurasia',
    track: { 240: [23.7, 31.5], 200: [27.2, 35.3], 160: [25.4, 37.5], 120: [26.0, 41.6], 80: [23.5, 49.6], 40: [28.3, 55.3], 0: [37.9, 57.1] }
  },
  {
    id: 'india',
    name: 'India',
    track: { 240: [52.9, -49.7], 200: [39.7, -48.8], 160: [41.1, -48.5], 120: [46.6, -47.8], 80: [51.5, -30.0], 40: [65.6, 8.5], 0: [78.0, 23.2] }
  },
  {
    id: 'australia',
    name: 'Australia',
    track: { 240: [116.6, -52.7], 200: [107.1, -60.8], 160: [106.6, -57.7], 120: [115.7, -50.6], 80: [126.3, -49.2], 40: [125.0, -47.1], 0: [134.2, -25.6] }
  },
  {
    id: 'antarctica',
    name: 'Antarctica',
    track: { 240: [67.7, -72.4], 200: [35.5, -72.4], 160: [43.6, -72.2], 120: [73.2, -74.6], 80: [93.4, -78.7], 40: [86.9, -78.8], 0: [89.0, -79.3] }
  }
]);

const FOSSIL_SUITES = Object.freeze([
  {
    id: 'mesosaurus',
    name: 'Mesosaurus',
    shortName: 'Mesosaurus',
    color: '#38bdf8',
    summary: 'Freshwater reptile (~280 Ma) found only in coastal Brazil and Namibia—impossible to swim across a wide salty Atlantic.',
    sites: [
      {
        region: 'SE South America',
        track: { 240: [-27.5, -41.9], 200: [-30.1, -32.6], 160: [-31.3, -33.7], 120: [-28.2, -33.5], 80: [-37.5, -28.5], 40: [-46.2, -23.8], 0: [-52.5, -20.1] }
      },
      {
        region: 'SW Africa',
        track: { 240: [-9.9, -56.4], 200: [-17.5, -48.4], 160: [-16.5, -47.6], 120: [-8.5, -45.1], 80: [2.3, -32.7], 40: [7.7, -22.3], 0: [15.8, -15.5] }
      }
    ]
  },
  {
    id: 'cynognathus',
    name: 'Cynognathus',
    shortName: 'Cynognathus',
    color: '#fb923c',
    summary: 'Triassic land-dwelling reptile (~240 Ma) whose fossils span central South America and southern Africa.',
    sites: [
      {
        region: 'South America',
        track: { 240: [-32.3, -32.3], 200: [-34.9, -23.0], 160: [-36.1, -24.1], 120: [-33.0, -23.9], 80: [-42.3, -18.9], 40: [-51.0, -14.2], 0: [-57.3, -10.5] }
      },
      {
        region: 'Southern Africa',
        track: { 240: [-6.7, -48.4], 200: [-14.3, -40.4], 160: [-13.3, -39.6], 120: [-5.3, -37.1], 80: [5.5, -24.7], 40: [10.9, -14.3], 0: [19.0, -7.5] }
      }
    ]
  },
  {
    id: 'lystrosaurus',
    name: 'Lystrosaurus',
    shortName: 'Lystrosaurus',
    color: '#fbbf24',
    summary: 'Early Triassic land herbivore found across Africa, India, and Antarctica.',
    sites: [
      {
        region: 'Africa',
        track: { 240: [-3.5, -51.6], 200: [-11.1, -43.6], 160: [-10.1, -42.8], 120: [-2.1, -40.3], 80: [8.7, -27.9], 40: [14.1, -17.5], 0: [22.2, -10.7] }
      },
      {
        region: 'India',
        track: { 240: [52.9, -49.7], 200: [39.7, -48.8], 160: [41.1, -48.5], 120: [46.6, -47.8], 80: [51.5, -30.0], 40: [65.6, 8.5], 0: [78.0, 23.2] }
      },
      {
        region: 'Antarctica',
        track: { 240: [67.7, -72.4], 200: [35.5, -72.4], 160: [43.6, -72.2], 120: [73.2, -74.6], 80: [93.4, -78.7], 40: [86.9, -78.8], 0: [89.0, -79.3] }
      }
    ]
  },
  {
    id: 'glossopteris',
    name: 'Glossopteris',
    shortName: 'Glossopteris',
    color: '#4ade80',
    summary: 'Permian seed fern with heavy seeds—its fossils unite all five southern Gondwana landmasses, including ice-covered Antarctica.',
    sites: [
      {
        region: 'South America',
        track: { 240: [-33.9, -30.7], 200: [-36.5, -21.4], 160: [-37.7, -22.5], 120: [-34.6, -22.3], 80: [-43.9, -17.3], 40: [-52.6, -12.6], 0: [-58.9, -8.9] }
      },
      {
        region: 'Africa',
        track: { 240: [-3.5, -51.6], 200: [-11.1, -43.6], 160: [-10.1, -42.8], 120: [-2.1, -40.3], 80: [8.7, -27.9], 40: [14.1, -17.5], 0: [22.2, -10.7] }
      },
      {
        region: 'India',
        track: { 240: [52.9, -49.7], 200: [39.7, -48.8], 160: [41.1, -48.5], 120: [46.6, -47.8], 80: [51.5, -30.0], 40: [65.6, 8.5], 0: [78.0, 23.2] }
      },
      {
        region: 'Antarctica',
        track: { 240: [67.7, -72.4], 200: [35.5, -72.4], 160: [43.6, -72.2], 120: [73.2, -74.6], 80: [93.4, -78.7], 40: [86.9, -78.8], 0: [89.0, -79.3] }
      },
      {
        region: 'Australia',
        track: { 240: [116.6, -52.7], 200: [107.1, -60.8], 160: [106.6, -57.7], 120: [115.7, -50.6], 80: [126.3, -49.2], 40: [125.0, -47.1], 0: [134.2, -25.6] }
      }
    ]
  }
]);

function interpolateTrack(track, ageMa) {
  const age = Math.max(0, Math.min(240, Number(ageMa) || 0));
  if (track[age]) return track[age];
  // KEYFRAME_AGES is descending: [240, 200, 160, 120, 80, 40, 0]
  for (let i = 0; i < KEYFRAME_AGES.length - 1; i++) {
    const hi = KEYFRAME_AGES[i];
    const lo = KEYFRAME_AGES[i + 1];
    if (age <= hi && age >= lo) {
      const t = (hi - age) / (hi - lo);
      const a = track[hi];
      const b = track[lo];
      return [
        Number((a[0] + (b[0] - a[0]) * t).toFixed(2)),
        Number((a[1] + (b[1] - a[1]) * t).toFixed(2))
      ];
    }
  }
  return track[0];
}

export function getContinentLabels(ageMa) {
  const age = Math.max(0, Math.min(240, Number(ageMa) || 0));
  return CONTINENT_TRACKS.map((entry) => ({
    id: entry.id,
    name: entry.name,
    coords: interpolateTrack(entry.track, age)
  }));
}

export function getFossilMarkers(ageMa) {
  const age = Math.max(0, Math.min(240, Number(ageMa) || 0));
  return FOSSIL_SUITES.map((suite) => ({
    id: suite.id,
    name: suite.name,
    shortName: suite.shortName,
    color: suite.color,
    summary: suite.summary,
    points: suite.sites.map((site) => ({
      region: site.region,
      coords: interpolateTrack(site.track, age)
    }))
  }));
}

export const TECTONIC_EVENTS = Object.freeze([
  {
    id: 'panthalassa',
    label: 'Panthalassa Ocean',
    kind: 'ocean',
    minAge: 180,
    maxAge: 240,
    coords: [-140, 5],
    detail: 'Single global super-ocean surrounding Pangaea.'
  },
  {
    id: 'tethys',
    label: 'Tethys Ocean',
    kind: 'ocean',
    minAge: 50,
    maxAge: 240,
    coords: [55, 10],
    detail: 'Equatorial embayment between Laurasia and Gondwana that closed as India and Africa moved north.'
  },
  {
    id: 'central-rift',
    label: 'Central Atlantic Rift',
    kind: 'divergent',
    minAge: 150,
    maxAge: 210,
    coords: [-22, 16],
    detail: 'Crustal stretching and flood basalts crack Pangaea between North America and NW Africa.'
  },
  {
    id: 'south-rift',
    label: 'South Atlantic Rift',
    kind: 'divergent',
    minAge: 90,
    maxAge: 140,
    coords: [-18, -32],
    detail: 'Divergent rifting unzips South America away from Africa.'
  },
  {
    id: 'mid-atlantic',
    label: 'Mid-Atlantic Ridge',
    kind: 'divergent',
    minAge: 0,
    maxAge: 110,
    coords: [-32, 15],
    detail: 'Active divergent boundary creating new basaltic ocean floor at ~2.5 cm/yr.'
  },
  {
    id: 'india-collision',
    label: 'Himalayan Collision Zone',
    kind: 'convergent',
    minAge: 0,
    maxAge: 50,
    coords: [82, 29],
    detail: 'Convergent continental collision between India and Eurasia raising the Himalayas.'
  },
  {
    id: 'circumpolar',
    label: 'Southern Ocean Opening',
    kind: 'divergent',
    minAge: 0,
    maxAge: 50,
    coords: [120, -60],
    detail: 'Australia pulls away from Antarctica, opening deep circumpolar circulation.'
  }
]);

export function getTectonicEvents(ageMa) {
  const age = Math.max(0, Math.min(240, Number(ageMa) || 0));
  return TECTONIC_EVENTS.filter((ev) => age >= ev.minAge && age <= ev.maxAge);
}

export function classifyPaleolatitude(lat) {
  const absLat = Math.abs(Number(lat) || 0);
  if (absLat < 23.5) {
    return {
      belt: 'Tropical / Equatorial',
      clue: 'Warm year-round solar angle; supports coral reefs, evaporites, and tropical coal swamps.'
    };
  }
  if (absLat < 35) {
    return {
      belt: 'Subtropical Arid Belt',
      clue: 'Descending dry air masses favor vast deserts and red sandstone beds.'
    };
  }
  if (absLat < 60) {
    return {
      belt: 'Temperate Belt',
      clue: 'Seasonal mid-latitude climate with shifting storm tracks and forested basins.'
    };
  }
  return {
    belt: 'Subpolar / Polar',
    clue: 'Low sun angles and long winters; cold enough for continental ice sheets when ocean gateways isolate poles.'
  };
}

/**
 * Seafloor spreading calculation.
 * 1 cm/yr = 1e-5 km/yr = 10 km/Ma.
 * Therefore crustAgeMa = distanceKm / (halfRateCmPerYr * 10).
 */
export function computeSeafloorMetrics(distanceKm, halfRateCmPerYr) {
  const d = Math.abs(Number(distanceKm) || 0);
  const halfRate = Math.max(0.1, Number(halfRateCmPerYr) || 2.5);
  const fullRateCmPerYr = Number((halfRate * 2).toFixed(2));
  const crustAgeMa = Number((d / (halfRate * 10)).toFixed(2));
  return {
    distanceKm: Number(d.toFixed(1)),
    halfRateCmPerYr: Number(halfRate.toFixed(2)),
    fullRateCmPerYr,
    crustAgeMa,
    isSymmetric: true
  };
}

export const SPEED_PRESETS = Object.freeze([
  { id: 'atlantic', label: 'Mid-Atlantic Ridge', rateCmPerYr: 2.5, note: 'Typical slow seafloor spreading rate' },
  { id: 'fingernail', label: 'Fingernail Growth', rateCmPerYr: 3.5, note: 'Human fingernail growth (~3.5 cm/yr)' },
  { id: 'san-andreas', label: 'San Andreas Fault', rateCmPerYr: 5.0, note: 'Transform slip between Pacific & N. American plates' },
  { id: 'australia', label: 'Australia Drift', rateCmPerYr: 7.0, note: 'Fastest major continent moving northward today' },
  { id: 'india', label: 'India (Cretaceous)', rateCmPerYr: 15.0, note: 'Peak sprint across the Tethys Ocean (~80–55 Ma)' }
]);

export function computeDriftDistance(rateCmPerYr, years) {
  const rate = Math.max(0, Number(rateCmPerYr) || 0);
  const yrs = Math.max(0, Number(years) || 0);
  const cm = rate * yrs;
  const meters = cm / 100;
  const km = cm / 100000;
  const miles = km * 0.621371;

  let benchmark = 'Less than a finger width';
  if (km >= 40075) benchmark = `${(km / 40075).toFixed(1)}× Earth's circumference`;
  else if (km >= 5570) benchmark = `${(km / 5570).toFixed(1)}× the New York–London Atlantic crossing`;
  else if (km >= 1000) benchmark = 'Continental-scale ocean basin opening';
  else if (km >= 42.195) benchmark = `${(km / 42.195).toFixed(1)}× marathon distances`;
  else if (km >= 1) benchmark = `${km.toFixed(1)} km (across a city)`;
  else if (meters >= 100) benchmark = 'Length of a soccer pitch';
  else if (meters >= 10) benchmark = 'Length of a school classroom';
  else if (meters >= 1) benchmark = 'About one adult stride';

  return { cm, meters, km, miles, benchmark };
}

export const MISSIONS = Object.freeze([
  {
    id: 'pangaea-fossils',
    title: 'Connect Gondwana Fossils',
    detail: 'Inspect Pangaea (200–240 Ma) with the Fossil Clues overlay turned on.'
  },
  {
    id: 'atlantic-unzip',
    title: 'Compare Then & Now',
    detail: 'Turn on the 0 Ma Outline overlay while viewing an ancient snapshot (100+ Ma).'
  },
  {
    id: 'globe-south-pole',
    title: 'Rotate to Gondwana',
    detail: 'Switch to 3D Globe view and tilt into the Southern Hemisphere (≤ −25° lat).'
  },
  {
    id: 'probe-paleolatitude',
    title: 'Probe Ancient Crust',
    detail: 'Click directly on the map or globe at 100+ Ma to inspect paleolatitude.'
  }
]);

export function evaluateMissions(telemetry) {
  const t = telemetry || {};
  const completed = {
    'pangaea-fossils': Boolean(t.sawPangaeaFossils),
    'atlantic-unzip': Boolean(t.comparedAncientWithModern),
    'globe-south-pole': Boolean(t.visitedGlobeSouth),
    'probe-paleolatitude': Boolean(t.probedAncientCrust)
  };
  const count = Object.values(completed).filter(Boolean).length;
  return { completed, count, total: MISSIONS.length };
}

export const QUIZ_QUESTIONS = Object.freeze([
  {
    id: 'pd-q1',
    prompt: '1. Why did geologists initially reject Alfred Wegener’s 1912 continental drift hypothesis?',
    answer: 'mechanism',
    options: [
      { value: 'fossils', label: 'His fossil evidence was discovered to be fabricated' },
      { value: 'mechanism', label: 'He lacked a credible physical mechanism explaining how solid continents could move across Earth' },
      { value: 'coastlines', label: 'Bathymetric mapping proved Africa and South America cannot fit together' }
    ],
    explanation: 'Wegener proposed continents plowed through solid ocean basalt via tidal forces; the true mechanism—rigid lithospheric plates carried by seafloor spreading and subduction—was discovered in the 1960s.'
  },
  {
    id: 'pd-q2',
    prompt: '2. Which physical force is recognized by geophysicists as the dominant driver of plate motion?',
    answer: 'slab-pull',
    options: [
      { value: 'tides', label: 'Tidal drag from the Moon’s gravitational pull' },
      { value: 'slab-pull', label: 'Slab pull: cold, dense oceanic lithosphere sinking into the mantle at subduction trenches' },
      { value: 'coriolis', label: 'Earth’s rotational Coriolis force pushing continents westward' }
    ],
    explanation: 'Cooling oceanic lithosphere becomes denser than the underlying asthenosphere and sinks at subduction zones, pulling the rest of the tectonic plate behind it.'
  },
  {
    id: 'pd-q3',
    prompt: '3. How did symmetrical magnetic stripes on the seafloor prove seafloor spreading?',
    answer: 'spreading',
    options: [
      { value: 'magnetism', label: 'They showed Earth’s magnetic poles have remained frozen in one direction' },
      { value: 'spreading', label: 'Cooling basalt at mid-ocean ridges records geomagnetic reversals, producing mirror-image age bands on both sides of the ridge' },
      { value: 'iron', label: 'Iron mines on continents magnetized the surrounding ocean water' }
    ],
    explanation: 'Because magma cools symmetrically on both flanks of a mid-ocean ridge, Vine, Matthews, and Morley realized alternating normal/reversed stripes act like a two-sided tape recorder of ocean growth.'
  },
  {
    id: 'pd-q4',
    prompt: '4. According to the GPlates reconstruction, in what order did the Atlantic Ocean open?',
    answer: 'north-first',
    options: [
      { value: 'simultaneous', label: 'The entire Atlantic from Greenland to Antarctica split open at the exact same instant at 240 Ma' },
      { value: 'north-first', label: 'The Central/North Atlantic began opening first (~200–160 Ma), followed later by the South Atlantic (~130–120 Ma)' },
      { value: 'south-first', label: 'The South Atlantic opened at 240 Ma while North America stayed welded to Africa until 10 Ma' }
    ],
    explanation: 'Rifting began between North America and NW Africa around 200 Ma; South America did not begin pulling away from Africa until roughly 130–120 Ma.'
  },
  {
    id: 'pd-q5',
    prompt: '5. If a mid-ocean ridge spreads at a half-rate of 2.5 cm/yr (5.0 cm/yr total widening), how wide is the ocean basin after 100 million years?',
    answer: '5000km',
    options: [
      { value: '500km', label: '500 km' },
      { value: '2500km', label: '2,500 km' },
      { value: '5000km', label: '5,000 km' }
    ],
    explanation: '5.0 cm/yr × 100,000,000 yr = 5 × 10⁸ cm = 5,000 km—comparable to the width of the modern Atlantic Ocean!'
  }
]);

export function gradeQuiz(answers) {
  const input = answers || {};
  let score = 0;
  const details = QUIZ_QUESTIONS.map((q) => {
    const selected = input[q.id] || '';
    const correct = selected === q.answer;
    if (correct) score += 1;
    return {
      id: q.id,
      selected,
      correct,
      explanation: q.explanation
    };
  });
  return { score, total: QUIZ_QUESTIONS.length, details };
}
