/**
 * Event Horizon Telescope — Pure Interferometry & Aperture Synthesis Model
 * Zero-DOM ES module shared by the interactive lesson and Node unit tests.
 */

export const OBSERVING_WAVELENGTH_M = 1.3e-3; // 1.3 mm (230 GHz)
export const EARTH_RADIUS_KM = 6371;
export const MIN_ELEVATION_DEG = 12;
export const GRID_SIZE = 128;
export const FULL_FOV_UAS = 300;
export const DISPLAY_FOV_UAS = 120;
export const DELTA_U_ML = 206265 / FULL_FOV_UAS; // ~687.55 Mλ per Fourier grid cell

export const TARGETS = {
  m87: {
    id: 'm87',
    name: 'M87*',
    fullName: 'Messier 87*',
    constellation: 'Virgo',
    year: 2019,
    raHours: 12.5137,
    decDeg: 12.3911,
    centerGhaHours: 5.3,
    ringDiameterUas: 42,
    massText: '6.5 billion Suns',
    distanceText: '55 million ly',
    physicalSpanText: '~800 AU (~20× Solar System)',
    usesReferencePhoto: true,
    note: 'Massive and steady across a full night of observing.'
  },
  sgra: {
    id: 'sgra',
    name: 'Sagittarius A*',
    fullName: 'Sagittarius A* (Milky Way center)',
    constellation: 'Sagittarius',
    year: 2022,
    raHours: 17.7611,
    decDeg: -29.0078,
    centerGhaHours: 6.0,
    ringDiameterUas: 52,
    massText: '4.0 million Suns',
    distanceText: '27,000 ly',
    physicalSpanText: '~0.7 AU (inside Mercury’s orbit)',
    usesReferencePhoto: false,
    note: '1,500× less massive than M87*; gas orbits in minutes, and SPT at the South Pole can observe it continuously.'
  }
};

export const STATIONS = [
  {
    id: 'alma',
    short: 'ALMA',
    name: 'Atacama Large Millimeter Array',
    region: 'Chile',
    lat: -23.029,
    lon: -67.755,
    elevationM: 5058,
    dish: 'Phased array (≈73 m eq.)',
    weight: 1.0,
    labelDx: -34,
    labelDy: -22
  },
  {
    id: 'apex',
    short: 'APEX',
    name: 'Atacama Pathfinder Experiment',
    region: 'Chile',
    lat: -23.006,
    lon: -67.759,
    elevationM: 5104,
    dish: '12 m dish',
    weight: 0.28,
    labelDx: 34,
    labelDy: 24
  },
  {
    id: 'iram',
    short: 'IRAM',
    name: 'IRAM 30m Telescope',
    region: 'Spain',
    lat: 37.066,
    lon: -3.393,
    elevationM: 2850,
    dish: '30 m dish',
    weight: 0.45,
    labelDx: 0,
    labelDy: -18
  },
  {
    id: 'jcmt',
    short: 'JCMT',
    name: 'James Clerk Maxwell Telescope',
    region: 'Hawaii',
    lat: 19.823,
    lon: -155.477,
    elevationM: 4092,
    dish: '15 m dish',
    weight: 0.32,
    labelDx: -32,
    labelDy: -22
  },
  {
    id: 'lmt',
    short: 'LMT',
    name: 'Large Millimeter Telescope',
    region: 'Mexico',
    lat: 18.986,
    lon: -97.315,
    elevationM: 4580,
    dish: '32 m (2017) / 50 m dish',
    weight: 0.55,
    labelDx: -10,
    labelDy: -18
  },
  {
    id: 'sma',
    short: 'SMA',
    name: 'Submillimeter Array',
    region: 'Hawaii',
    lat: 19.824,
    lon: -155.478,
    elevationM: 4080,
    dish: '6 × 6 m phased array',
    weight: 0.35,
    labelDx: 34,
    labelDy: 24
  },
  {
    id: 'smt',
    short: 'SMT',
    name: 'Submillimeter Telescope (Mt. Graham)',
    region: 'Arizona',
    lat: 32.702,
    lon: -109.891,
    elevationM: 3185,
    dish: '10 m dish',
    weight: 0.25,
    labelDx: 0,
    labelDy: -18
  },
  {
    id: 'spt',
    short: 'SPT',
    name: 'South Pole Telescope',
    region: 'Antarctica',
    lat: -89.99,
    lon: 0.0,
    elevationM: 2835,
    dish: '10 m dish',
    weight: 0.30,
    labelDx: 0,
    labelDy: -18
  }
];

const STATION_BY_ID = new Map(STATIONS.map((station) => [station.id, station]));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function getTarget(targetId) {
  return TARGETS[targetId] || TARGETS.m87;
}

export function getStation(stationId) {
  return STATION_BY_ID.get(stationId) || null;
}

export function stationEcefKm(station) {
  const latRad = toRad(station.lat);
  const lonRad = toRad(station.lon);
  const cosLat = Math.cos(latRad);
  return {
    x: EARTH_RADIUS_KM * cosLat * Math.cos(lonRad),
    y: EARTH_RADIUS_KM * cosLat * Math.sin(lonRad),
    z: EARTH_RADIUS_KM * Math.sin(latRad)
  };
}

export function chordDistanceKm(a, b) {
  const p1 = stationEcefKm(a);
  const p2 = stationEcefKm(b);
  return Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
}

export function greatCirclePoints(a, b, steps = 28) {
  const p1 = stationEcefKm(a);
  const p2 = stationEcefKm(b);
  const u1 = { x: p1.x / EARTH_RADIUS_KM, y: p1.y / EARTH_RADIUS_KM, z: p1.z / EARTH_RADIUS_KM };
  const u2 = { x: p2.x / EARTH_RADIUS_KM, y: p2.y / EARTH_RADIUS_KM, z: p2.z / EARTH_RADIUS_KM };
  const dot = clamp(u1.x * u2.x + u1.y * u2.y + u1.z * u2.z, -1, 1);
  const omega = Math.acos(dot);

  if (omega < 1e-4) {
    return [
      { lon: a.lon, lat: a.lat },
      { lon: b.lon, lat: b.lat }
    ];
  }

  const sinOmega = Math.sin(omega);
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const s1 = Math.sin((1 - t) * omega) / sinOmega;
    const s2 = Math.sin(t * omega) / sinOmega;
    const x = s1 * u1.x + s2 * u2.x;
    const y = s1 * u1.y + s2 * u2.y;
    const z = s1 * u1.z + s2 * u2.z;
    const lat = (Math.asin(clamp(z, -1, 1)) * 180) / Math.PI;
    const lon = (Math.atan2(y, x) * 180) / Math.PI;
    pts.push({ lon, lat });
  }
  return pts;
}

export function stationElevationDeg(station, target, ghaHours) {
  const t = typeof target === 'string' ? getTarget(target) : target;
  const latRad = toRad(station.lat);
  const decRad = toRad(t.decDeg);
  const localHaRad = toRad(ghaHours * 15 + station.lon);
  const sinAlt =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(localHaRad);
  return (Math.asin(clamp(sinAlt, -1, 1)) * 180) / Math.PI;
}

export function maxStationElevationDeg(station, target) {
  const t = typeof target === 'string' ? getTarget(target) : target;
  return 90 - Math.abs(station.lat - t.decDeg);
}

export function canStationObserveTarget(station, target, minElevDeg = MIN_ELEVATION_DEG) {
  return maxStationElevationDeg(station, target) >= minElevDeg;
}

export function projectBaselineUv(a, b, target, ghaHours) {
  const t = typeof target === 'string' ? getTarget(target) : target;
  const p1 = stationEcefKm(a);
  const p2 = stationEcefKm(b);
  const bx = (p2.x - p1.x) * 1000;
  const by = (p2.y - p1.y) * 1000;
  const bz = (p2.z - p1.z) * 1000;

  const haRad = toRad(ghaHours * 15);
  const decRad = toRad(t.decDeg);
  const sinH = Math.sin(haRad);
  const cosH = Math.cos(haRad);
  const sinD = Math.sin(decRad);
  const cosD = Math.cos(decRad);

  const u = (sinH * bx + cosH * by) / OBSERVING_WAVELENGTH_M / 1e6;
  const v = (-sinD * cosH * bx + sinD * sinH * by + cosD * bz) / OBSERVING_WAVELENGTH_M / 1e6;
  return { u, v };
}

export function pairKey(a, b) {
  return a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
}

export function computePairTrack(
  a,
  b,
  target,
  synthesisHours = 8,
  steps = 96,
  minElevDeg = MIN_ELEVATION_DEG
) {
  const t = typeof target === 'string' ? getTarget(target) : target;
  const chordKm = chordDistanceKm(a, b);
  const weight = Math.sqrt(a.weight * b.weight);
  const points = [];
  const sampleSteps = synthesisHours <= 0 ? 0 : Math.max(2, steps);
  const startGha = t.centerGhaHours - synthesisHours / 2;

  for (let i = 0; i <= sampleSteps; i += 1) {
    const frac = sampleSteps === 0 ? 0 : i / sampleSteps;
    const ghaHours = synthesisHours <= 0 ? t.centerGhaHours : startGha + frac * synthesisHours;
    const elevA = stationElevationDeg(a, t, ghaHours);
    const elevB = stationElevationDeg(b, t, ghaHours);
    if (elevA >= minElevDeg && elevB >= minElevDeg) {
      const { u, v } = projectBaselineUv(a, b, t, ghaHours);
      points.push({
        ghaHours,
        u,
        v,
        uvRadiusMl: Math.hypot(u, v)
      });
    }
  }

  let maxUvMl = 0;
  for (let i = 0; i < points.length; i += 1) {
    if (points[i].uvRadiusMl > maxUvMl) maxUvMl = points[i].uvRadiusMl;
  }

  return {
    id: pairKey(a, b),
    from: a,
    to: b,
    chordKm,
    weight,
    points,
    maxUvMl,
    minFringeUas: maxUvMl > 0 ? 206265 / maxUvMl : null,
    observable: points.length > 0
  };
}

export function computeArrayMetrics({
  activeIds,
  targetId = 'm87',
  synced = true,
  synthesisHours = 8,
  minElevDeg = MIN_ELEVATION_DEG
}) {
  const target = getTarget(targetId);
  const idSet = activeIds instanceof Set ? activeIds : new Set(activeIds || []);
  const selectedStations = STATIONS.filter((station) => idSet.has(station.id));

  const observableStations = [];
  const horizonBlockedStations = [];
  for (const station of selectedStations) {
    if (canStationObserveTarget(station, target, minElevDeg)) {
      observableStations.push(station);
    } else {
      horizonBlockedStations.push(station);
    }
  }

  const allTracks = [];
  const activeTracks = [];
  const unalignedTracks = [];

  for (let i = 0; i < observableStations.length; i += 1) {
    for (let j = i + 1; j < observableStations.length; j += 1) {
      const track = computePairTrack(
        observableStations[i],
        observableStations[j],
        target,
        synthesisHours,
        96,
        minElevDeg
      );
      allTracks.push(track);
      if (track.observable) {
        activeTracks.push(track);
      } else {
        unalignedTracks.push(track);
      }
    }
  }

  let longestChordKm = 0;
  let maxUvMl = 0;
  const angleBins = new Set();
  const filledCells = new Set();

  for (const track of activeTracks) {
    if (track.chordKm > longestChordKm) longestChordKm = track.chordKm;
    if (track.maxUvMl > maxUvMl) maxUvMl = track.maxUvMl;
    for (const pt of track.points) {
      if (pt.uvRadiusMl > 40) {
        const angleDeg = ((Math.atan2(pt.v, pt.u) * 180) / Math.PI + 180) % 180;
        angleBins.add(Math.floor(angleDeg / 15)); // 12 azimuthal sectors
      }
      const gx = Math.round(pt.u / DELTA_U_ML);
      const gy = Math.round(pt.v / DELTA_U_ML);
      filledCells.add(`${gx},${gy}`);
      filledCells.add(`${-gx},${-gy}`);
    }
  }

  const directionCoverage = angleBins.size / 12;
  const radialSpanScore = clamp(maxUvMl / 7600, 0, 1);
  const cellFillScore = clamp(filledCells.size / 110, 0, 1);
  const almaActive = observableStations.some((station) => station.id === 'alma');
  const resolutionUas = maxUvMl > 0 ? 206265 / maxUvMl : null;

  const uvCoverageScore =
    synced && activeTracks.length > 0
      ? clamp(0.06 + cellFillScore * 0.44 + radialSpanScore * 0.25 + directionCoverage * 0.25, 0, 1)
      : 0;

  let alertClass = 'warn';
  let statusTitle = 'No stations are selected.';
  let statusWhy =
    `A station records radio waves from ${target.name}. With zero stations selected, no signal is captured.`;
  let statusNext = 'Next: click a station on the map or sidebar to begin recording.';

  if (selectedStations.length === 0) {
    // defaults above
  } else if (observableStations.length === 0 && horizonBlockedStations.length > 0) {
    const blockedNames = horizonBlockedStations.map((s) => s.short).join(', ');
    statusTitle = `${blockedNames} cannot see ${target.name} above the horizon.`;
    statusWhy = `${target.name} sits at declination ${target.decDeg > 0 ? '+' : ''}${target.decDeg.toFixed(1)}°. From the South Pole (lat −90°), ${target.name} stays below the horizon all day.`;
    statusNext = `Next: add a northern/equatorial station, or switch Target to Sagittarius A* (dec −29.0°) where SPT observes 24 hours a day.`;
  } else if (observableStations.length === 1) {
    const only = observableStations[0];
    statusTitle = `${only.short} records one time-series, but zero baselines.`;
    statusWhy =
      horizonBlockedStations.length > 0
        ? `${only.short} can see ${target.name}, while ${horizonBlockedStations.map((s) => s.short).join(', ')} is below the horizon. One active viewpoint cannot measure 2D sky structure.`
        : `A baseline requires two separated stations comparing the same wave front. A single dish records intensity vs. time, not an image.`;
    statusNext = 'Next: activate a second observable station on the map to form your first baseline.';
  } else if (activeTracks.length === 0 && unalignedTracks.length > 0) {
    statusTitle = 'Selected stations never view the target at the same time.';
    statusWhy = `In a ${synthesisHours.toFixed(1)} h window around transit, these distant sites are never simultaneously above ${minElevDeg}° elevation for ${target.name}.`;
    statusNext = 'Next: widen the Earth Rotation window or add intermediate stations (e.g., LMT or ALMA) to bridge the longitudes.';
  } else if (!synced && activeTracks.length > 0) {
    alertClass = 'danger';
    statusTitle = 'Baselines exist, but atomic clock sync is OFF.';
    statusWhy =
      'At 230 GHz (1.3 mm), waves oscillate 230 billion times per second. Without hydrogen-maser timing to align signal phases, the Fourier visibilities scramble into incoherent speckle noise.';
    statusNext = 'Next: turn Clock Sync ON to restore phase coherence and recover the image.';
  } else if (activeTracks.length === 1 && longestChordKm < 50) {
    const pair = activeTracks[0];
    statusTitle = `One ultra-short baseline (${pair.chordKm.toFixed(1)} km) acts like a single dish.`;
    statusWhy = `${pair.from.short} and ${pair.to.short} sit on the same plateau. Their baseline can measure total brightness, but its ~${Math.round(resolutionUas).toLocaleString()} μas fringe spacing is over 1,000× too wide to resolve a ${target.ringDiameterUas} μas shadow.`;
    statusNext = 'Next: add Hawaii (JCMT/SMA) or Mexico (LMT) to leap from kilometers to thousands of kilometers.';
  } else if (activeTracks.length === 1) {
    const pair = activeTracks[0];
    statusTitle = `One long baseline (${Math.round(longestChordKm).toLocaleString()} km) yields interference fringes.`;
    statusWhy = `A single pair samples only one stripe of spatial frequencies in the u–v plane, producing parallel fringes in the Dirty FFT instead of a closed black-hole ring.`;
    statusNext = 'Next: add Earth rotation hours and stations at different latitudes (North–South + East–West) to fill the u–v plane.';
  } else if (uvCoverageScore >= 0.72) {
    alertClass = 'safe';
    statusTitle = `Strong multi-directional u–v coverage across ${activeTracks.length} baseline${activeTracks.length === 1 ? '' : 's'}.`;
    statusWhy = `${observableStations.length} active stations form ${activeTracks.length} simultaneous pairs spanning up to ${Math.round(longestChordKm).toLocaleString()} km (beam ≈ ${Math.round(resolutionUas)} μas). Earth rotation sweeps arcs across ${angleBins.size} of 12 orientation sectors, cleanly resolving the ${target.ringDiameterUas} μas shadow.`;
    statusNext = 'Notice: toggle Dirty FFT vs. Cleaned to see how CLEAN removes sidelobes left by the remaining gaps in the u–v plane.';
  } else if (uvCoverageScore >= 0.46) {
    statusTitle = `Fine resolution (≈ ${Math.round(resolutionUas)} μas), but u–v gaps leave sidelobes.`;
    statusWhy = `${activeTracks.length} baseline${activeTracks.length === 1 ? '' : 's'} reach ${Math.round(maxUvMl).toLocaleString()} Mλ, yet ${12 - angleBins.size} orientation sectors remain sparsely sampled—elongating the Dirty Beam and distorting the ring.`;
    statusNext = 'Next: add stations in Europe (IRAM) or the Americas (LMT, SMT, ALMA), or increase Earth rotation hours.';
  } else {
    statusTitle = `Sparse array (${activeTracks.length} active baseline${activeTracks.length === 1 ? '' : 's'}): geometry is under-constrained.`;
    statusWhy = `Current pairs sample ${filledCells.size} u–v Fourier cells. With incomplete coverage across scales and angles, multiple shapes could still fit the data.`;
    statusNext = 'Next: activate additional continents and sweep Earth rotation to fill out the u–v plot.';
  }

  return {
    target,
    selectedCount: selectedStations.length,
    observableStations,
    horizonBlockedStations,
    baselinePairs: activeTracks.length,
    possiblePairs: (observableStations.length * (observableStations.length - 1)) / 2,
    activeTracks,
    unalignedTracks,
    longestChordKm,
    maxUvMl,
    resolutionUas,
    directionCoverage,
    angleSectorCount: angleBins.size,
    uvFilledCells: filledCells.size,
    uvCoverageScore,
    almaActive,
    alertClass,
    statusTitle,
    statusWhy,
    statusNext
  };
}

/* ───────────────────────────────────────────────────────────────────────────
   2D Cooley-Tukey Radix-2 FFT & Centered Shift Helpers
   ─────────────────────────────────────────────────────────────────────────── */

export function fft1d(re, im, inverse = false) {
  const n = re.length;
  if (n <= 1) return;
  if ((n & (n - 1)) !== 0) {
    throw new Error(`fft1d requires power-of-two length, got ${n}`);
  }

  // Bit-reversal permutation
  let j = 0;
  for (let i = 1; i < n; i += 1) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      const tmpR = re[i];
      const tmpI = im[i];
      re[i] = re[j];
      im[i] = im[j];
      re[j] = tmpR;
      im[j] = tmpI;
    }
  }

  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (sign * 2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let start = 0; start < n; start += len) {
      let wR = 1;
      let wI = 0;
      for (let k = 0; k < half; k += 1) {
        const evenIdx = start + k;
        const oddIdx = evenIdx + half;
        const tR = wR * re[oddIdx] - wI * im[oddIdx];
        const tI = wR * im[oddIdx] + wI * re[oddIdx];

        re[oddIdx] = re[evenIdx] - tR;
        im[oddIdx] = im[evenIdx] - tI;
        re[evenIdx] += tR;
        im[evenIdx] += tI;

        const nextWR = wR * wStepR - wI * wStepI;
        wI = wR * wStepI + wI * wStepR;
        wR = nextWR;
      }
    }
  }

  if (inverse) {
    const invN = 1 / n;
    for (let i = 0; i < n; i += 1) {
      re[i] *= invN;
      im[i] *= invN;
    }
  }
}

export function fft2d(re, im, size, inverse = false) {
  const rowR = new Float64Array(size);
  const rowI = new Float64Array(size);

  for (let y = 0; y < size; y += 1) {
    const offset = y * size;
    for (let x = 0; x < size; x += 1) {
      rowR[x] = re[offset + x];
      rowI[x] = im[offset + x];
    }
    fft1d(rowR, rowI, inverse);
    for (let x = 0; x < size; x += 1) {
      re[offset + x] = rowR[x];
      im[offset + x] = rowI[x];
    }
  }

  const colR = new Float64Array(size);
  const colI = new Float64Array(size);
  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      const idx = y * size + x;
      colR[y] = re[idx];
      colI[y] = im[idx];
    }
    fft1d(colR, colI, inverse);
    for (let y = 0; y < size; y += 1) {
      const idx = y * size + x;
      re[idx] = colR[y];
      im[idx] = colI[y];
    }
  }
}

export function fftShift2d(src, size, out = new Float64Array(size * size)) {
  const half = size >> 1;
  for (let y = 0; y < size; y += 1) {
    const sy = (y + half) % size;
    for (let x = 0; x < size; x += 1) {
      const sx = (x + half) % size;
      out[sy * size + sx] = src[y * size + x];
    }
  }
  return out;
}

export function computeSkyFft(skyModel, size = GRID_SIZE) {
  const shifted = fftShift2d(skyModel, size, new Float64Array(size * size));
  const re = shifted;
  const im = new Float64Array(size * size);
  fft2d(re, im, size, false);
  return {
    re: fftShift2d(re, size, new Float64Array(size * size)),
    im: fftShift2d(im, size, new Float64Array(size * size)),
    size
  };
}

/* ───────────────────────────────────────────────────────────────────────────
   Ground-Truth Sky Models (Analytic M87* / Sgr A* + Real M87* Photo Loader)
   ─────────────────────────────────────────────────────────────────────────── */

export function generateAnalyticSkyModel(targetId = 'm87', gridSize = GRID_SIZE) {
  const target = getTarget(targetId);
  const out = new Float32Array(gridSize * gridSize);
  const uasPerPx = FULL_FOV_UAS / gridSize;
  const center = gridSize / 2;
  const ringR = target.ringDiameterUas / 2;
  const ringSigma = target.id === 'sgra' ? 5.6 : 5.2;

  let maxVal = 0;
  for (let y = 0; y < gridSize; y += 1) {
    const dyUas = (y - center) * uasPerPx;
    for (let x = 0; x < gridSize; x += 1) {
      const dxUas = (x - center) * uasPerPx;
      const r = Math.hypot(dxUas, dyUas);
      const theta = Math.atan2(dyUas, dxUas); // +y is South/down on canvas

      const radial = Math.exp(-0.5 * ((r - ringR) / ringSigma) ** 2);
      // Central shadow depression inside the photon ring
      const shadowMask = 1 / (1 + Math.exp(-(r - ringR * 0.62) / 1.8));

      let azimuthal = 1;
      if (target.id === 'sgra') {
        // Iconic 3-knot Sgr A* azimuthal structure (2022 EHT morphology)
        const k1 = 0.42 * Math.cos(theta - toRad(-75));
        const k2 = 0.36 * Math.cos(theta - toRad(45));
        const k3 = 0.34 * Math.cos(theta - toRad(165));
        const knotHarmonic = 0.28 * Math.cos(3 * (theta - toRad(45)));
        azimuthal = clamp(0.68 + 0.35 * (k1 + k2 + k3) + knotHarmonic, 0.22, 1.45);
      } else {
        // M87* Doppler-beamed southern crescent
        const doppler = 0.46 * Math.cos(theta - toRad(108));
        const subtleClump = 0.08 * Math.cos(2 * theta - toRad(30));
        azimuthal = clamp(0.66 + doppler + subtleClump, 0.16, 1.25);
      }

      const outerFade = Math.exp(-0.5 * Math.max(0, (r - 65) / 18) ** 2);
      const val = radial * shadowMask * azimuthal * outerFade;
      out[y * gridSize + x] = val;
      if (val > maxVal) maxVal = val;
    }
  }

  if (maxVal > 0) {
    for (let i = 0; i < out.length; i += 1) {
      out[i] /= maxVal;
    }
  }
  return out;
}

export function extractSkyModelFromRgba(
  rgba,
  srcWidth,
  srcHeight,
  gridSize = GRID_SIZE,
  targetRingDiameterUas = TARGETS.m87.ringDiameterUas
) {
  const lum = new Float32Array(srcWidth * srcHeight);
  let maxLum = 0;
  let edgeSum = 0;
  let edgeCount = 0;

  for (let y = 0; y < srcHeight; y += 1) {
    for (let x = 0; x < srcWidth; x += 1) {
      const idx = (y * srcWidth + x) * 4;
      const val = (0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2]) / 255;
      lum[y * srcWidth + x] = val;
      if (val > maxLum) maxLum = val;
      if (x <= 2 || x >= srcWidth - 3 || y <= 2 || y >= srcHeight - 3) {
        edgeSum += val;
        edgeCount += 1;
      }
    }
  }

  const bgLevel = edgeCount > 0 ? edgeSum / edgeCount : 0;
  const threshold = bgLevel + (maxLum - bgLevel) * 0.42;

  let wSum = 0;
  let cxSum = 0;
  let cySum = 0;
  for (let y = 0; y < srcHeight; y += 1) {
    for (let x = 0; x < srcWidth; x += 1) {
      const v = lum[y * srcWidth + x];
      if (v > threshold) {
        const w = v - threshold;
        wSum += w;
        cxSum += x * w;
        cySum += y * w;
      }
    }
  }

  const cx = wSum > 0 ? cxSum / wSum : srcWidth / 2;
  const cy = wSum > 0 ? cySum / wSum : srcHeight / 2;

  let rSum = 0;
  for (let y = 0; y < srcHeight; y += 1) {
    for (let x = 0; x < srcWidth; x += 1) {
      const v = lum[y * srcWidth + x];
      if (v > threshold) {
        const w = v - threshold;
        rSum += Math.hypot(x - cx, y - cy) * w;
      }
    }
  }

  const measuredRingRadiusPx = wSum > 0 ? Math.max(4, rSum / wSum) : Math.min(srcWidth, srcHeight) * 0.25;
  const targetRingRadiusUas = targetRingDiameterUas / 2;
  const uasPerOutPx = FULL_FOV_UAS / gridSize;
  const srcPxPerUas = measuredRingRadiusPx / targetRingRadiusUas;

  const out = new Float32Array(gridSize * gridSize);
  const outCenter = gridSize / 2;
  const denom = Math.max(1e-4, maxLum - bgLevel);
  let outMax = 0;

  for (let y = 0; y < gridSize; y += 1) {
    const dyUas = (y - outCenter) * uasPerOutPx;
    for (let x = 0; x < gridSize; x += 1) {
      const dxUas = (x - outCenter) * uasPerOutPx;
      const rUas = Math.hypot(dxUas, dyUas);
      const sx = cx + dxUas * srcPxPerUas;
      const sy = cy + dyUas * srcPxPerUas;

      let sampled = 0;
      if (sx >= 0 && sx < srcWidth - 1 && sy >= 0 && sy < srcHeight - 1) {
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const fx = sx - x0;
        const fy = sy - y0;
        const v00 = lum[y0 * srcWidth + x0];
        const v10 = lum[y0 * srcWidth + x0 + 1];
        const v01 = lum[(y0 + 1) * srcWidth + x0];
        const v11 = lum[(y0 + 1) * srcWidth + x0 + 1];
        const top = v00 + (v10 - v00) * fx;
        const bot = v01 + (v11 - v01) * fx;
        sampled = clamp((top + (bot - top) * fy - bgLevel) / denom, 0, 1);
      }

      // Feather smoothly at large angular radii so FFT wraps remain zero
      const taper = Math.exp(-0.5 * Math.max(0, (rUas - 58) / 14) ** 2);
      const val = sampled * taper;
      out[y * gridSize + x] = val;
      if (val > outMax) outMax = val;
    }
  }

  if (outMax > 0) {
    for (let i = 0; i < out.length; i += 1) {
      out[i] /= outMax;
    }
  }
  return out;
}

/* ───────────────────────────────────────────────────────────────────────────
   Aperture Synthesis & Högbom CLEAN Deconvolution
   ─────────────────────────────────────────────────────────────────────────── */

function deterministicRand(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function normalizeImage(arr, floorZero = true) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < arr.length; i += 1) {
    const v = floorZero && arr[i] < 0 ? 0 : arr[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const out = new Float32Array(arr.length);
  const span = max - (floorZero ? 0 : min);
  if (span <= 1e-9) return out;
  const base = floorZero ? 0 : min;
  for (let i = 0; i < arr.length; i += 1) {
    const v = floorZero && arr[i] < 0 ? 0 : arr[i];
    out[i] = clamp((v - base) / span, 0, 1);
  }
  return out;
}

function computeBeamParameters(weights, size) {
  const half = size >> 1;
  let totalW = 0;
  let suu = 0;
  let svv = 0;
  let suv = 0;

  for (let y = 0; y < size; y += 1) {
    const vMl = (half - y) * DELTA_U_ML;
    for (let x = 0; x < size; x += 1) {
      if (x === half && y === half) continue;
      const w = weights[y * size + x];
      if (w <= 0) continue;
      const uMl = (x - half) * DELTA_U_ML;
      totalW += w;
      suu += w * uMl * uMl;
      svv += w * vMl * vMl;
      suv += w * uMl * vMl;
    }
  }

  if (totalW <= 1e-8) {
    return {
      sigmaMajorUas: 48,
      sigmaMinorUas: 48,
      thetaRad: 0,
      fwhmMajorUas: 113,
      fwhmMinorUas: 113
    };
  }

  const mUU = suu / totalW;
  const mVV = svv / totalW;
  const mUV = suv / totalW;

  const trace = mUU + mVV;
  const disc = Math.sqrt(Math.max(0, (mUU - mVV) ** 2 + 4 * mUV * mUV));
  const lambdaMax = Math.max(1, 0.5 * (trace + disc));
  const lambdaMin = Math.max(1, 0.5 * (trace - disc));

  // Image-space beam width is inversely proportional to u-v spread along principal axes.
  // A major axis in u-v produces the minor (sharpest) axis in the sky image.
  const rmsMajorUv = Math.sqrt(lambdaMax);
  const rmsMinorUv = Math.sqrt(lambdaMin);
  const uvAngle = 0.5 * Math.atan2(2 * mUV, mUU - mVV);

  const sigmaMinorUas = clamp((0.15 * 206265) / rmsMajorUv, 6.8, 44);
  const sigmaMajorUas = clamp((0.15 * 206265) / rmsMinorUv, sigmaMinorUas, 50);

  return {
    sigmaMajorUas,
    sigmaMinorUas,
    thetaRad: uvAngle + Math.PI / 2,
    fwhmMajorUas: sigmaMajorUas * 2.3548,
    fwhmMinorUas: sigmaMinorUas * 2.3548
  };
}

export function synthesizeArrayImage({
  skyModel,
  skyFft = null,
  tracks = [],
  synced = true,
  seed = 1337,
  cleanIterations = 120,
  sgraBlur = false
}) {
  const size = GRID_SIZE;
  const half = size >> 1;
  const totalPixels = size * size;

  if (!tracks || tracks.length === 0) {
    return {
      dirtyImage: new Float32Array(totalPixels),
      cleanImage: new Float32Array(totalPixels),
      psfImage: new Float32Array(totalPixels),
      beamFwhmMajorUas: null,
      beamFwhmMinorUas: null,
      uvFilledCells: 0
    };
  }

  const fft = skyFft || computeSkyFft(skyModel, size);
  const rawWeights = new Float64Array(totalPixels);

  for (const track of tracks) {
    const pts = track.points;
    if (!pts || pts.length === 0) continue;
    const perSampleWeight = (track.weight * 4.0) / Math.max(8, Math.sqrt(pts.length));
    for (const pt of pts) {
      for (const sign of [1, -1]) {
        const fx = half + (pt.u * sign) / DELTA_U_ML;
        const fy = half - (pt.v * sign) / DELTA_U_ML;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const dx = fx - x0;
        const dy = fy - y0;
        if (x0 >= 0 && x0 + 1 < size && y0 >= 0 && y0 + 1 < size) {
          rawWeights[y0 * size + x0] += perSampleWeight * (1 - dx) * (1 - dy);
          rawWeights[y0 * size + x0 + 1] += perSampleWeight * dx * (1 - dy);
          rawWeights[(y0 + 1) * size + x0] += perSampleWeight * (1 - dx) * dy;
          rawWeights[(y0 + 1) * size + x0 + 1] += perSampleWeight * dx * dy;
        }
      }
    }
  }

  // Briggs-style robust density taper so dense intra-site points do not drown out long baselines
  let nonZeroCells = 0;
  let nonZeroSum = 0;
  for (let i = 0; i < totalPixels; i += 1) {
    if (rawWeights[i] > 1e-6) {
      nonZeroCells += 1;
      nonZeroSum += rawWeights[i];
    }
  }
  const avgWeight = nonZeroCells > 0 ? nonZeroSum / nonZeroCells : 1;
  const weights = new Float64Array(totalPixels);
  let maxWeight = 0;
  let uvFilledCells = 0;

  for (let i = 0; i < totalPixels; i += 1) {
    if (rawWeights[i] > 1e-6) {
      const robust = rawWeights[i] / (1 + rawWeights[i] / (avgWeight * 1.6));
      weights[i] = robust;
      if (robust > maxWeight) maxWeight = robust;
      uvFilledCells += 1;
    }
  }

  // Zero-spacing total-flux anchor (calibrated total flux from phased ALMA / single-dish measurements)
  const centerIdx = half * size + half;
  weights[centerIdx] = Math.max(weights[centerIdx], maxWeight * 0.42);

  // Enforce exact conjugate symmetry on weights
  for (let y = 1; y < size; y += 1) {
    const my = size - y;
    for (let x = 1; x < size; x += 1) {
      const mx = size - x;
      const w = 0.5 * (weights[y * size + x] + weights[my * size + mx]);
      weights[y * size + x] = w;
      weights[my * size + mx] = w;
    }
  }

  // Compute Dirty Beam (PSF) via inverse FFT of sampling weights
  const psfRe = fftShift2d(weights, size, new Float64Array(totalPixels));
  const psfIm = new Float64Array(totalPixels);
  fft2d(psfRe, psfIm, size, true);
  const psfCentered = fftShift2d(psfRe, size, new Float64Array(totalPixels));
  const psfPeak = psfCentered[centerIdx] || 1;
  const psfImage = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i += 1) {
    psfImage[i] = psfCentered[i] / psfPeak;
  }

  // Compute sampled visibilities V_meas = V_true * W (with optional desync or orbital blur)
  const visRe = new Float64Array(totalPixels);
  const visIm = new Float64Array(totalPixels);
  const rand = deterministicRand(seed);

  if (synced) {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const idx = y * size + x;
        const w = weights[idx];
        if (w <= 0) continue;
        let vr = fft.re[idx] * w;
        let vi = fft.im[idx] * w;
        if (sgraBlur && !(x === half && y === half)) {
          const rBin = Math.hypot(x - half, y - half);
          const damping = Math.exp(-0.012 * rBin * rBin);
          vr *= damping;
          vi *= damping;
        }
        visRe[idx] = vr;
        visIm[idx] = vi;
      }
    }
  } else {
    // Scramble phases symmetrically so the result is a real-valued incoherent noise field
    visRe[centerIdx] = fft.re[centerIdx] * weights[centerIdx] * 0.35;
    visIm[centerIdx] = 0;
    for (let y = 1; y < size; y += 1) {
      const my = size - y;
      for (let x = 1; x < size; x += 1) {
        const mx = size - x;
        if (y > my || (y === my && x > mx)) continue;
        const idx = y * size + x;
        const mIdx = my * size + mx;
        const w = weights[idx];
        if (w <= 0) continue;
        const amp = Math.hypot(fft.re[idx], fft.im[idx]) * w;
        const phi = rand() * Math.PI * 2;
        const r = amp * Math.cos(phi);
        const im = amp * Math.sin(phi);
        visRe[idx] = r;
        visIm[idx] = im;
        if (idx !== mIdx) {
          visRe[mIdx] = r;
          visIm[mIdx] = -im;
        }
      }
    }
  }

  const dirtyShiftedRe = fftShift2d(visRe, size, new Float64Array(totalPixels));
  const dirtyShiftedIm = fftShift2d(visIm, size, new Float64Array(totalPixels));
  fft2d(dirtyShiftedRe, dirtyShiftedIm, size, true);
  const dirtyRaw = fftShift2d(dirtyShiftedRe, size, new Float64Array(totalPixels));
  const dirtyNorm = normalizeImage(dirtyRaw, true);

  if (!synced) {
    return {
      dirtyImage: dirtyNorm,
      cleanImage: dirtyNorm,
      psfImage: normalizeImage(psfImage, false),
      beamFwhmMajorUas: null,
      beamFwhmMinorUas: null,
      uvFilledCells
    };
  }

  // Högbom CLEAN inside central sky box, subtracting PSF across full field
  const residual = Float64Array.from(dirtyRaw);
  const components = new Float64Array(totalPixels);
  const boxHalf = 28;
  const minBound = half - boxHalf;
  const maxBound = half + boxHalf;
  const gain = 0.16;

  let initialMax = 0;
  for (let y = minBound; y <= maxBound; y += 1) {
    for (let x = minBound; x <= maxBound; x += 1) {
      const v = residual[y * size + x];
      if (v > initialMax) initialMax = v;
    }
  }

  if (initialMax > 0) {
    const stopThreshold = initialMax * 0.015;
    for (let iter = 0; iter < cleanIterations; iter += 1) {
      let bestX = -1;
      let bestY = -1;
      let bestVal = stopThreshold;

      for (let y = minBound; y <= maxBound; y += 1) {
        const rowOff = y * size;
        for (let x = minBound; x <= maxBound; x += 1) {
          const val = residual[rowOff + x];
          if (val > bestVal) {
            bestVal = val;
            bestX = x;
            bestY = y;
          }
        }
      }

      if (bestX < 0) break;
      const step = gain * bestVal;
      components[bestY * size + bestX] += step;

      const yStart = Math.max(0, bestY - half);
      const yEnd = Math.min(size - 1, bestY + half - 1);
      const xStart = Math.max(0, bestX - half);
      const xEnd = Math.min(size - 1, bestX + half - 1);

      for (let y = yStart; y <= yEnd; y += 1) {
        const py = y - bestY + half;
        const rOff = y * size;
        const pOff = py * size;
        for (let x = xStart; x <= xEnd; x += 1) {
          const px = x - bestX + half;
          residual[rOff + x] -= step * psfImage[pOff + px];
        }
      }
    }
  }

  // Convolve CLEAN components with fitted elliptical Gaussian Clean Beam (peak = 1.0 matching PSF)
  const beam = computeBeamParameters(weights, size);
  const uasPerPx = FULL_FOV_UAS / size;
  const sigMajPx = beam.sigmaMajorUas / uasPerPx;
  const sigMinPx = beam.sigmaMinorUas / uasPerPx;
  const cosT = Math.cos(beam.thetaRad);
  const sinT = Math.sin(beam.thetaRad);

  const kernel = new Float64Array(totalPixels);
  for (let y = 0; y < size; y += 1) {
    const dy = y - half;
    for (let x = 0; x < size; x += 1) {
      const dx = x - half;
      const xr = dx * cosT + dy * sinT;
      const yr = -dx * sinT + dy * cosT;
      kernel[y * size + x] = Math.exp(-0.5 * ((xr / sigMajPx) ** 2 + (yr / sigMinPx) ** 2));
    }
  }

  const compRe = fftShift2d(components, size, new Float64Array(totalPixels));
  const compIm = new Float64Array(totalPixels);
  fft2d(compRe, compIm, size, false);

  const kernRe = fftShift2d(kernel, size, new Float64Array(totalPixels));
  const kernIm = new Float64Array(totalPixels);
  fft2d(kernRe, kernIm, size, false);

  const convRe = new Float64Array(totalPixels);
  const convIm = new Float64Array(totalPixels);
  for (let i = 0; i < totalPixels; i += 1) {
    convRe[i] = compRe[i] * kernRe[i] - compIm[i] * kernIm[i];
    convIm[i] = compRe[i] * kernIm[i] + compIm[i] * kernRe[i];
  }
  fft2d(convRe, convIm, size, true);
  const convolved = fftShift2d(convRe, size, new Float64Array(totalPixels));

  // Add damped residuals so incomplete coverage honestly retains faint sidelobes
  const cleanCombined = new Float64Array(totalPixels);
  const residualScale = 0.22;
  for (let i = 0; i < totalPixels; i += 1) {
    cleanCombined[i] = Math.max(0, convolved[i] + residual[i] * residualScale);
  }

  return {
    dirtyImage: dirtyNorm,
    cleanImage: normalizeImage(cleanCombined, true),
    psfImage: normalizeImage(psfImage, false),
    beamFwhmMajorUas: beam.fwhmMajorUas,
    beamFwhmMinorUas: beam.fwhmMinorUas,
    uvFilledCells
  };
}

/* ───────────────────────────────────────────────────────────────────────────
   Scientific Radio-Intensity Colormaps
   ─────────────────────────────────────────────────────────────────────────── */

const PALETTE_STOPS = {
  ember: [
    [0.0, [3, 3, 7]],
    [0.18, [76, 13, 4]],
    [0.44, [184, 51, 8]],
    [0.7, [245, 132, 24]],
    [0.88, [255, 210, 105]],
    [1.0, [255, 246, 219]]
  ],
  grayscale: [
    [0.0, [4, 6, 12]],
    [0.35, [76, 84, 98]],
    [0.72, [196, 206, 222]],
    [1.0, [252, 254, 255]]
  ],
  ice: [
    [0.0, [3, 8, 18]],
    [0.28, [11, 58, 102]],
    [0.58, [35, 137, 184]],
    [0.84, [118, 214, 209]],
    [1.0, [238, 252, 255]]
  ]
};

export function sampleColormap(value, palette = 'ember') {
  const stops = PALETTE_STOPS[palette] || PALETTE_STOPS.ember;
  const v = clamp(value, 0, 1);

  for (let i = 1; i < stops.length; i += 1) {
    const [t1, c1] = stops[i];
    const [t0, c0] = stops[i - 1];
    if (v <= t1 || i === stops.length - 1) {
      const f = t1 === t0 ? 0 : (v - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f)
      ];
    }
  }
  return stops[stops.length - 1][1];
}
