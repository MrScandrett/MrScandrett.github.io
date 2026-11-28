import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EARTH_RADIUS_KM,
  GRID_SIZE,
  FULL_FOV_UAS,
  STATIONS,
  TARGETS,
  getStation,
  chordDistanceKm,
  greatCirclePoints,
  canStationObserveTarget,
  computeArrayMetrics,
  fft2d,
  computeSkyFft,
  generateAnalyticSkyModel,
  extractSkyModelFromRgba,
  synthesizeArrayImage,
  sampleColormap
} from '../assets/js/lessons/event-horizon-telescope-model.mjs';

function pearsonCorrelation(a, b) {
  const n = a.length;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i += 1) {
    sumA += a[i];
    sumB += b[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i += 1) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  return num / Math.sqrt(denA * denB || 1);
}

function ringPeakVsCenter(img, size = GRID_SIZE, ringDiameterUas = 42) {
  const half = size >> 1;
  const uasPerPx = FULL_FOV_UAS / size;
  const centerR = ringDiameterUas / 2;
  let centerSum = 0;
  let centerCount = 0;
  let ringPeak = 0;

  for (let y = 0; y < size; y += 1) {
    const dy = (y - half) * uasPerPx;
    for (let x = 0; x < size; x += 1) {
      const dx = (x - half) * uasPerPx;
      const r = Math.hypot(dx, dy);
      const val = img[y * size + x];
      if (r <= 6) {
        centerSum += val;
        centerCount += 1;
      } else if (Math.abs(r - centerR) <= 5) {
        if (val > ringPeak) ringPeak = val;
      }
    }
  }
  const centerMean = centerCount > 0 ? centerSum / centerCount : 0;
  return { ringPeak, centerMean };
}

test('3D ECEF chord distances reflect real site separations and stay within Earth diameter', () => {
  const alma = getStation('alma');
  const apex = getStation('apex');
  const jcmt = getStation('jcmt');
  const sma = getStation('sma');
  const iram = getStation('iram');

  const chileDist = chordDistanceKm(alma, apex);
  assert.ok(chileDist >= 2.0 && chileDist <= 3.5, `ALMA-APEX chord=${chileDist} km`);

  const hawaiiDist = chordDistanceKm(jcmt, sma);
  assert.ok(hawaiiDist < 0.5, `JCMT-SMA chord=${hawaiiDist} km`);

  const transatlanticDist = chordDistanceKm(iram, jcmt);
  assert.ok(
    transatlanticDist >= 10000 && transatlanticDist <= 11600,
    `IRAM-JCMT chord=${transatlanticDist} km`
  );

  for (let i = 0; i < STATIONS.length; i += 1) {
    for (let j = i + 1; j < STATIONS.length; j += 1) {
      const d = chordDistanceKm(STATIONS[i], STATIONS[j]);
      assert.ok(d <= 2 * EARTH_RADIUS_KM + 1e-6, `chord exceeded Earth diameter: ${d}`);
    }
  }

  const arc = greatCirclePoints(alma, iram, 16);
  assert.equal(arc.length, 17);
  assert.ok(Math.abs(arc[0].lon - alma.lon) < 1e-6);
  assert.ok(Math.abs(arc.at(-1).lat - iram.lat) < 1e-6);
});

test('horizon visibility excludes SPT for M87* (+12.4 deg) and includes SPT for Sagittarius A* (-29.0 deg)', () => {
  const spt = getStation('spt');
  assert.equal(canStationObserveTarget(spt, TARGETS.m87), false);
  assert.equal(canStationObserveTarget(spt, TARGETS.sgra), true);

  for (const station of STATIONS) {
    if (station.id !== 'spt') {
      assert.equal(
        canStationObserveTarget(station, TARGETS.m87),
        true,
        `${station.short} should observe M87*`
      );
    }
  }
});

test('computeArrayMetrics accurately tracks baselines, horizon blocks, resolution, and clock sync', () => {
  const one = computeArrayMetrics({ activeIds: ['alma'], targetId: 'm87', synced: true, synthesisHours: 8 });
  assert.equal(one.baselinePairs, 0);
  assert.equal(one.resolutionUas, null);
  assert.equal(one.alertClass, 'warn');

  const chile = computeArrayMetrics({
    activeIds: ['alma', 'apex'],
    targetId: 'm87',
    synced: true,
    synthesisHours: 8
  });
  assert.equal(chile.baselinePairs, 1);
  assert.ok(chile.longestChordKm < 10);
  assert.ok(chile.resolutionUas > 50000, `expected >50,000 uas, got ${chile.resolutionUas}`);

  const fullM87 = computeArrayMetrics({
    activeIds: STATIONS.map((s) => s.id),
    targetId: 'm87',
    synced: true,
    synthesisHours: 10
  });
  assert.deepEqual(
    fullM87.horizonBlockedStations.map((s) => s.id),
    ['spt']
  );
  assert.equal(fullM87.observableStations.length, 7);
  assert.equal(fullM87.possiblePairs, 21);
  assert.ok(fullM87.resolutionUas >= 18 && fullM87.resolutionUas <= 32, `res=${fullM87.resolutionUas}`);
  assert.equal(fullM87.alertClass, 'safe');

  const fullSgra = computeArrayMetrics({
    activeIds: STATIONS.map((s) => s.id),
    targetId: 'sgra',
    synced: true,
    synthesisHours: 10
  });
  assert.equal(fullSgra.horizonBlockedStations.length, 0);
  assert.equal(fullSgra.observableStations.length, 8);
  assert.ok(
    fullSgra.activeTracks.some((t) => t.from.id === 'spt' || t.to.id === 'spt'),
    'SPT should contribute active baselines on Sgr A*'
  );

  const unsynced = computeArrayMetrics({
    activeIds: ['alma', 'jcmt'],
    targetId: 'm87',
    synced: false,
    synthesisHours: 8
  });
  assert.equal(unsynced.alertClass, 'danger');
});

test('fft2d forward and inverse round-trip recovers synthetic signal within 1e-5 RMS', () => {
  const size = 32;
  const orig = new Float64Array(size * size);
  const re = new Float64Array(size * size);
  const im = new Float64Array(size * size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const val =
        Math.exp(-(((x - 14) ** 2 + (y - 17) ** 2) / 18)) +
        0.4 * Math.sin(x * 0.5) * Math.cos(y * 0.25);
      orig[y * size + x] = val;
      re[y * size + x] = val;
    }
  }

  fft2d(re, im, size, false);
  fft2d(re, im, size, true);

  let sqErr = 0;
  for (let i = 0; i < orig.length; i += 1) {
    const err = re[i] - orig[i];
    sqErr += err * err + im[i] * im[i];
  }
  const rms = Math.sqrt(sqErr / orig.length);
  assert.ok(rms < 1e-5, `FFT round-trip RMS=${rms}`);
});

test('synthesizeArrayImage resolves M87* shadow with full array, fails on short baseline, and scrambles when desynced', () => {
  const sky = generateAnalyticSkyModel('m87', GRID_SIZE);
  const skyFft = computeSkyFft(sky, GRID_SIZE);

  const fullMetrics = computeArrayMetrics({
    activeIds: STATIONS.map((s) => s.id),
    targetId: 'm87',
    synced: true,
    synthesisHours: 10
  });
  const fullSynth = synthesizeArrayImage({
    skyModel: sky,
    skyFft,
    tracks: fullMetrics.activeTracks,
    synced: true,
    cleanIterations: 120
  });

  const corrFull = pearsonCorrelation(fullSynth.cleanImage, sky);
  assert.ok(corrFull > 0.8, `expected full array correlation > 0.80, got ${corrFull}`);

  const { ringPeak, centerMean } = ringPeakVsCenter(fullSynth.cleanImage, GRID_SIZE, 42);
  assert.ok(
    ringPeak > centerMean * 2.0,
    `expected dark shadow: ringPeak=${ringPeak}, centerMean=${centerMean}`
  );

  // PSF peaks at the exact center
  const half = GRID_SIZE >> 1;
  assert.ok(
    Math.abs(fullSynth.psfImage[half * GRID_SIZE + half] - 1.0) < 1e-5,
    'PSF center should normalize to 1.0'
  );

  // Desynced clocks destroy image correlation
  const desyncSynth = synthesizeArrayImage({
    skyModel: sky,
    skyFft,
    tracks: fullMetrics.activeTracks,
    synced: false
  });
  const corrDesync = pearsonCorrelation(desyncSynth.cleanImage, sky);
  assert.ok(corrDesync < 0.35, `expected desynced correlation < 0.35, got ${corrDesync}`);

  // Single short baseline (ALMA + APEX) cannot resolve the central shadow
  const chileMetrics = computeArrayMetrics({
    activeIds: ['alma', 'apex'],
    targetId: 'm87',
    synced: true,
    synthesisHours: 8
  });
  const chileSynth = synthesizeArrayImage({
    skyModel: sky,
    skyFft,
    tracks: chileMetrics.activeTracks,
    synced: true,
    cleanIterations: 80
  });
  const chileStats = ringPeakVsCenter(chileSynth.cleanImage, GRID_SIZE, 42);
  assert.ok(
    chileStats.centerMean > chileStats.ringPeak * 0.75,
    `short baseline should blur over the shadow: center=${chileStats.centerMean}, ring=${chileStats.ringPeak}`
  );
});

test('extractSkyModelFromRgba and sampleColormap produce valid normalized outputs', () => {
  const size = 64;
  const rgba = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const r = Math.hypot(x - 32, y - 32);
      const v = Math.round(255 * Math.exp(-0.5 * ((r - 14) / 3.5) ** 2));
      const idx = (y * size + x) * 4;
      rgba[idx] = v;
      rgba[idx + 1] = Math.round(v * 0.6);
      rgba[idx + 2] = Math.round(v * 0.2);
      rgba[idx + 3] = 255;
    }
  }
  const model = extractSkyModelFromRgba(rgba, size, size, GRID_SIZE, 42);
  assert.equal(model.length, GRID_SIZE * GRID_SIZE);
  const stats = ringPeakVsCenter(model, GRID_SIZE, 42);
  assert.ok(stats.ringPeak > 0.85 && stats.centerMean < 0.15);

  const [r0, g0, b0] = sampleColormap(0, 'ember');
  const [r1, g1, b1] = sampleColormap(1, 'ember');
  assert.ok(r1 > r0 && g1 > g0 && b1 > b0);
});
