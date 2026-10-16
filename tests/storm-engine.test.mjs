import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const S = require('../assets/js/storm-engine.js');
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} ± ${tol}, got ${a}`);
const LONGWOOD = { lat: 28.7031, lon: -81.3384 };
const MIN = 60000;

test('geometry: haversine, bearing, destination round-trip', () => {
  near(S.haversineMiles(0, 0, 0, 1), 69.09, 0.1, '1° of longitude at the equator');
  near(S.bearingDeg(28, -81, 29, -81), 0, 0.01);
  near(S.bearingDeg(28, -81, 28, -80), 90, 0.6);
  const d = S.destination(28.7, -81.3, 90, 50);
  near(S.haversineMiles(28.7, -81.3, d.lat, d.lon), 50, 0.01);
  near(S.bearingDeg(28.7, -81.3, d.lat, d.lon), 90, 0.5);
  assert.equal(S.compass16(247), 'WSW');
  assert.equal(S.compass16(359), 'N');
});

test('pointInGeometry respects holes and MultiPolygons', () => {
  const sq = (a, b) => [[a, a], [b, a], [b, b], [a, b], [a, a]];
  const donut = { type: 'Polygon', coordinates: [sq(0, 10), sq(4, 6)] };
  assert.equal(S.pointInGeometry(donut, 2, 2), true);
  assert.equal(S.pointInGeometry(donut, 5, 5), false, 'inside the hole');
  assert.equal(S.pointInGeometry(donut, 12, 5), false);
  const multi = { type: 'MultiPolygon', coordinates: [[sq(0, 1)], [sq(20, 30)]] };
  assert.equal(S.pointInGeometry(multi, 25, 25), true);
  assert.equal(S.pointInGeometry(multi, 10, 10), false);
});

test('rainClass thresholds', () => {
  assert.equal(S.rainClass(0), 'dry');
  assert.equal(S.rainClass(0.5), 'light');
  assert.equal(S.rainClass(3), 'moderate');
  assert.equal(S.rainClass(10), 'heavy');
  assert.equal(S.rainClass(60), 'violent');
});

test('nowcast: dry, incoming, raining-now, and ended windows', () => {
  const now = Date.UTC(2026, 9, 16, 18, 0);
  const mk = mms => mms.map((mm, i) => ({ endMs: now + (i + 1) * 15 * MIN, mm }));
  assert.equal(S.analyzeNowcast([], now), null);

  const dry = S.analyzeNowcast(mk([0, 0, 0, 0, 0, 0, 0, 0, 5]), now);
  assert.equal(dry.state, 'dry');
  assert.equal(dry.headline, 'Dry for the next 2 hours');
  assert.equal(dry.bars.length, 8, 'only the 2-hour horizon');

  // slots 0-1 dry, then 1 mm per 15 min (=4 mm/h, moderate) for two slots, then dry
  const inc = S.analyzeNowcast(mk([0, 0, 1, 1, 0, 0, 0, 0]), now);
  assert.equal(inc.state, 'incoming');
  assert.equal(inc.startsInMin, 30);
  assert.equal(inc.endsInMin, 60);
  assert.match(inc.headline, /Moderate rain starts in ~30 min and lasts ~30 min/);
  near(inc.peakMmHr, 4, 1e-9);
  near(inc.totalIn, (2 * 1) / 25.4, 1e-9, '2 mm total fell');

  const wet = S.analyzeNowcast(mk([2, 1, 0, 0, 0, 0, 0, 0]), now);
  assert.equal(wet.state, 'raining');
  assert.equal(wet.endsInMin, 30);
  assert.match(wet.headline, /rain now, easing in ~30 min/);

  const soak = S.analyzeNowcast(mk(new Array(8).fill(1)), now);
  assert.match(soak.headline, /continues/);

  // Past slots are ignored: a slot that ended before "now" must not count.
  const stale = S.analyzeNowcast([{ endMs: now - 5 * MIN, mm: 9 }, ...mk([0, 0, 0, 0, 0, 0, 0, 0])], now);
  assert.equal(stale.state, 'dry');
});

test('Z–R relation: 40 dBZ ≈ 11.5 mm/h and inverts cleanly', () => {
  near(S.dbzToRainRate(40), 11.53, 0.05);
  near(S.rainRateToDbz(S.dbzToRainRate(33)), 33, 1e-9);
  assert.ok(S.dbzToRainRate(20) < 1);
});

test('radar beam rises with range (0.5° beam: ~3.6 km high at 115 mi)', () => {
  near(S.radarBeamHeightFt(0), 0, 1e-6);
  const km = S.radarBeamHeightFt(115) / 3280.84;
  near(km, 3.63, 0.12);
  assert.ok(S.radarBeamHeightFt(150) > S.radarBeamHeightFt(50) * 3, 'height grows faster than linearly');
});

test('parseMotion reads NWS eventMotionDescription (direction is FROM)', () => {
  const m = S.parseMotion('2026-10-16T18:05:00-00:00...storm...285DEG...30KT...28.70,-81.50 28.80,-81.40');
  assert.equal(m.timeMs, Date.UTC(2026, 9, 16, 18, 5));
  assert.equal(m.fromDeg, 285);
  assert.equal(m.headingDeg, 105);
  assert.equal(m.points.length, 2);
  near(m.speedMph, 34.5, 0.05);
  assert.equal(S.parseMotion('garbage'), null);
  assert.equal(S.parseMotion(undefined), null);
});

test('stormApproach: a storm 24 mi west moving east at 30 mph is 48 min away', () => {
  const t0 = Date.UTC(2026, 9, 16, 18, 0);
  const start = S.destination(LONGWOOD.lat, LONGWOOD.lon, 270, 24);
  const a = S.stormApproach({ lat: start.lat, lon: start.lon, fromDeg: 270, speedKt: 30 / S.KT_TO_MPH, timeMs: t0 }, LONGWOOD, t0);
  near(a.distanceMi, 24, 0.05);
  near(a.etaMin, 48, 0.3);
  assert.equal(a.trackStatus, 'on-track');
  near(a.fromUserDeg, 270, 0.6);
  // 20 minutes later the storm has covered 10 mi and the ETA has dropped by 20 min
  const later = S.stormApproach({ lat: start.lat, lon: start.lon, fromDeg: 270, speedKt: 30 / S.KT_TO_MPH, timeMs: t0 }, LONGWOOD, t0 + 20 * MIN);
  near(later.distanceMi, 14, 0.1);
  near(later.etaMin, 28, 0.3);
});

test('stormApproach: offset tracks pass near/away and departing storms have no ETA', () => {
  const t0 = Date.UTC(2026, 9, 16, 18, 0);
  const west = S.destination(LONGWOOD.lat, LONGWOOD.lon, 270, 30);
  const north = f => S.destination(west.lat, west.lon, 0, f);
  const base = { fromDeg: 270, speedKt: 26, timeMs: t0 };
  const near15 = north(15), far40 = north(40);
  assert.equal(S.stormApproach({ ...base, lat: near15.lat, lon: near15.lon }, LONGWOOD, t0).trackStatus, 'passes-near');
  assert.equal(S.stormApproach({ ...base, lat: far40.lat, lon: far40.lon }, LONGWOOD, t0).trackStatus, 'passes-away');
  const east = S.destination(LONGWOOD.lat, LONGWOOD.lon, 90, 10);
  const gone = S.stormApproach({ ...base, lat: east.lat, lon: east.lon }, LONGWOOD, t0);
  assert.equal(gone.trackStatus, 'moving-away');
  assert.equal(gone.etaMin, null);
  assert.equal(S.stormApproach({ lat: west.lat, lon: west.lon, fromDeg: 270, speedKt: 0, timeMs: t0 }, LONGWOOD, t0).trackStatus, 'stationary');
});

test('cellsFromAlerts ranks warned storms and flags "inside the polygon"', () => {
  const now = Date.UTC(2026, 9, 16, 18, 10);
  const sim = S.createPracticeStorm(LONGWOOD, now - 10 * MIN);
  const practice = S.practiceAlert(sim, now);
  const flood = { id: 'x', properties: { event: 'Flood Watch' }, geometry: null };
  const far = { id: 'far', geometry: { type: 'Polygon', coordinates: [[[-90, 30], [-89, 30], [-89, 31], [-90, 31], [-90, 30]]] }, properties: { event: 'Tornado Warning', parameters: { eventMotionDescription: ['2026-10-16T18:00:00-00:00...storm...240DEG...20KT...30.50,-89.50'] } } };
  const cells = S.cellsFromAlerts([flood, far, practice], LONGWOOD, now);
  assert.equal(cells.length, 2, 'non-warning events are dropped');
  assert.equal(cells[0].id, 'practice-svr');
  assert.equal(cells[0].hail, '1.50');
  assert.equal(cells[1].inside, false);
  assert.ok(cells[1].distanceMi > 400);
});

test('lightning: distance counts, closest strike, approaching trend and ETA to 6 mi', () => {
  const now = Date.UTC(2026, 9, 16, 18, 30);
  const strikes = [];
  // A storm closing at 30 mph: 30 mi away 20 min ago, ~20 mi now. Two strikes per 4-min bin.
  for (let ageMin = 19; ageMin >= 1; ageMin -= 2) {
    const dist = 20 + ageMin * 0.5;
    [0, 1].forEach(k => { const p = S.destination(LONGWOOD.lat, LONGWOOD.lon, 250 + k * 3, dist + k * 0.2); strikes.push({ lat: p.lat, lon: p.lon, time: now - ageMin * MIN }); });
  }
  const r = S.analyzeLightning(strikes, LONGWOOD, now, now - 40 * MIN);
  assert.equal(r.trend.direction, 'approaching');
  near(r.trend.approachMph, 30, 5);
  assert.ok(r.trend.etaTo6Min > 15 && r.trend.etaTo6Min < 35, `eta ${r.trend.etaTo6Min}`);
  assert.ok(r.closest.mi > 19 && r.closest.mi < 22);
  assert.equal(r.r10, 0);
  assert.ok(r.r25 > 0 && r.r50 >= r.r25);
});

test('lightning: receding storm, and too few strikes → unknown trend', () => {
  const now = Date.UTC(2026, 9, 16, 18, 30);
  const strikes = [];
  for (let ageMin = 19; ageMin >= 1; ageMin -= 2) {
    const dist = 15 + (20 - ageMin) * 0.5;       // farther as time goes on
    [0, 1].forEach(k => { const p = S.destination(LONGWOOD.lat, LONGWOOD.lon, 100, dist + k * 0.1); strikes.push({ lat: p.lat, lon: p.lon, time: now - ageMin * MIN }); });
  }
  assert.equal(S.analyzeLightning(strikes, LONGWOOD, now, now - 40 * MIN).trend.direction, 'receding');
  assert.equal(S.analyzeLightning(strikes.slice(0, 2), LONGWOOD, now, now - 40 * MIN).trend.direction, 'unknown');
});

test('lightning: a short scattered record is reported as low confidence and never earns an ETA', () => {
  const now = Date.UTC(2026, 9, 16, 18, 30);
  const strikes = [];
  [[3, 28], [7, 31], [11, 29]].forEach(([age, mi]) => [0, 1].forEach(k => { const p = S.destination(LONGWOOD.lat, LONGWOOD.lon, 250, mi + k * 0.1); strikes.push({ lat: p.lat, lon: p.lon, time: now - (age + k * 0.5) * MIN }); }));
  const t = S.analyzeLightning(strikes, LONGWOOD, now, now - 40 * MIN).trend;
  assert.equal(t.confidence, 'low');
  assert.equal(t.etaTo6Min, null);
});

test('lightning: a long, tight record earns confidence "ok"', () => {
  const now = Date.UTC(2026, 9, 16, 18, 30), strikes = [];
  for (let age = 19; age >= 1; age -= 2) [0, 1].forEach(k => { const p = S.destination(LONGWOOD.lat, LONGWOOD.lon, 250, 20 + age * 0.5 + k * 0.2); strikes.push({ lat: p.lat, lon: p.lon, time: now - age * MIN }); });
  const t = S.analyzeLightning(strikes, LONGWOOD, now, now - 40 * MIN).trend;
  assert.equal(t.confidence, 'ok');
  assert.ok(t.r2 > 0.9);
});

test('30/30 clock: holds after a close strike, restarts, and never claims "clear" without 30 min of listening', () => {
  const now = Date.UTC(2026, 9, 16, 18, 30);
  const close = S.destination(LONGWOOD.lat, LONGWOOD.lon, 90, 4);
  const hold = S.analyzeLightning([{ lat: close.lat, lon: close.lon, time: now - 12 * MIN }], LONGWOOD, now, now - 60 * MIN);
  assert.equal(hold.clock.status, 'hold');
  assert.equal(hold.clock.remainingMin, 18);
  assert.equal(S.analyzeLightning([], LONGWOOD, now, now - 5 * MIN).clock.status, 'unknown');
  assert.equal(S.analyzeLightning([], LONGWOOD, now, now - 45 * MIN).clock.status, 'clear');
  const old = S.analyzeLightning([{ lat: close.lat, lon: close.lon, time: now - 35 * MIN }], LONGWOOD, now, now - 60 * MIN);
  assert.equal(old.clock.status, 'clear', 'a strike older than 30 min no longer holds the clock');
});

test('flash-to-bang uses the speed of sound at the current temperature', () => {
  near(S.soundSpeedFps(68), 1126, 3);
  assert.ok(S.soundSpeedFps(95) > S.soundSpeedFps(30));
  const r = S.flashToBang(30, 68);
  near(r.miles, 6.4, 0.1);
  near(r.ruleOfThumbMiles, 6, 1e-9);
  assert.equal(S.flashToBang(20, 68).shelter, true);
  assert.equal(S.flashToBang(40, 68).shelter, false);
});

test('ingredients: all four needed, cap lowers the tier, dry air shuts it off', () => {
  const big = S.severeIngredients({ dewF: 70, capeJkg: 3000, cinJkg: 20, shearKt: 45 });
  assert.equal(big.tier, 5);
  assert.equal(big.label, 'Moderate');
  assert.equal(S.severeIngredients({ dewF: 70, capeJkg: 3000, cinJkg: 0, shearKt: 45 }).moist, 3);
  const capped = S.severeIngredients({ dewF: 66, capeJkg: 1500, cinJkg: -250, shearKt: 30 });
  const open = S.severeIngredients({ dewF: 66, capeJkg: 1500, cinJkg: -20, shearKt: 30 });
  assert.equal(capped.capped, true);
  assert.equal(capped.tier, open.tier - 1);
  assert.equal(S.severeIngredients({ dewF: 40, capeJkg: 3000, cinJkg: 0, shearKt: 50 }).tier, 0, 'no moisture, no storm');
  assert.equal(S.severeIngredients({ dewF: 70, capeJkg: 50, cinJkg: 0, shearKt: 50 }).tier, 0, 'no instability, no storm');
  const pulse = S.severeIngredients({ dewF: 72, capeJkg: 2000, cinJkg: 0, shearKt: 5 });
  assert.ok(pulse.notes.some(n => /pulse/.test(n)));
});

test('bulk shear is a vector difference, not a speed difference', () => {
  near(S.bulkShear(10, 180, 40, 270), Math.hypot(40, 10), 1e-9); // south 10 kt vs west 40 kt: legs 10 and 40, not 30
  near(S.bulkShear(20, 270, 50, 270), 30, 1e-9);                // same direction
  near(S.bulkShear(25, 90, 25, 270), 50, 1e-9);                 // opposite directions
});

test('ingredientTimeline maps Open-Meteo hourly arrays row by row', () => {
  const h = { wind_speed_10m: [10, 10], wind_direction_10m: [180, 180], wind_speed_500hPa: [40, 40], wind_direction_500hPa: [270, 270], dew_point_2m: [70, 40], cape: [2000, 2000], convective_inhibition: [0, 0], wind_speed_700hPa: [25, 25], wind_direction_700hPa: [280, 280] };
  const rows = S.ingredientTimeline(h, [1, 2]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].moist, 3);
  assert.equal(rows[1].tier, 0);
  assert.equal(rows[0].steering.headingDeg, 100);
});

test('SPC outlook: highest category containing the point wins', () => {
  const box = (w, e, so, n) => ({ type: 'Polygon', coordinates: [[[w, so], [e, so], [e, n], [w, n], [w, so]]] });
  const fc = { features: [
    { properties: { DN: 2, VALID_ISO: 'v' }, geometry: box(-90, -70, 20, 40) },
    { properties: { DN: 4 }, geometry: box(-85, -75, 25, 35) },
    { properties: { DN: 3 }, geometry: box(-86, -74, 24, 36) }
  ] };
  assert.equal(S.outlookAtPoint(fc, 30, -80).label, 'SLGT', 'inside TSTM, MRGL and SLGT');
  assert.equal(S.outlookAtPoint(fc, 22, -88).label, 'TSTM', 'only the outer area');
  assert.equal(S.outlookAtPoint(fc, 50, -80).label, 'NONE');
  assert.equal(S.outlookAtPoint(null, 1, 1).rank, 0);
});

test('Saffir–Simpson boundaries use knots', () => {
  assert.equal(S.saffirSimpson(33).short, 'TD');
  assert.equal(S.saffirSimpson(34).short, 'TS');
  assert.equal(S.saffirSimpson(63).short, 'TS');
  assert.equal(S.saffirSimpson(64).short, 'H1');
  assert.equal(S.saffirSimpson(83).cat, 2);
  assert.equal(S.saffirSimpson(96).cat, 3);
  assert.equal(S.saffirSimpson(113).cat, 4);
  assert.equal(S.saffirSimpson(137).cat, 5);
  near(S.saffirSimpson(90).mph, 103.6, 0.1);
});

test('NHC parser handles the real EP1 (Hurricane Trudy) map-service payload', () => {
  const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/nhc-trudy-ep1.json', import.meta.url), 'utf8'));
  const storm = S.parseNhcStorm('EP1', fx);
  assert.equal(storm.name, 'Trudy');
  assert.equal(storm.maxwindKt, 90);
  assert.equal(S.saffirSimpson(storm.maxwindKt).cat, 2, 'NHC itself lists ssnum 2');
  near(storm.lat, 14.3, 0.05);
  near(storm.lon, -102.1, 0.05);
  assert.equal(storm.track[0].tau, 0);
  assert.ok(storm.track.length >= 5);
  assert.equal(storm.cone.type, 'Polygon');
  assert.ok(storm.warnings.length >= 1);
  assert.ok(storm.past.length > 2);

  const nearCoast = { lat: 19.0, lon: -104.4 };      // on the forecast track near the Mexican coast
  const t = S.analyzeStormThreat(storm, nearCoast);
  assert.equal(t.inCone, true);
  assert.ok(t.closestForecastMi < 60);
  assert.ok(t.nearestWatchWarning && t.nearestWatchWarning.mi < 120);
  const orlando = S.analyzeStormThreat(storm, LONGWOOD);
  assert.equal(orlando.inCone, false);
  assert.ok(orlando.distanceMi > 1500);
  assert.match(orlando.headline, /outside the forecast cone/);
});

test('replay frames report distance, category and whether 34-kt winds reach you', () => {
  const replays = JSON.parse(fs.readFileSync(new URL('../data/storm-replays.json', import.meta.url), 'utf8'));
  assert.ok(replays.source.includes('nhc.noaa.gov'));
  const ian = replays.storms.find(s => s.slug === 'ian-2022');
  const flLandfall = ian.points.findIndex(p => p.id === 'L' && p.lat > 26 && p.lat < 27);
  assert.ok(flLandfall > 0);
  const f = S.replayFrame(ian, flLandfall, LONGWOOD);
  assert.equal(f.cat.cat, 4);
  assert.equal(f.landfall, true);
  assert.ok(f.distanceMi > 130 && f.distanceMi < 165, `distance ${f.distanceMi}`);
  assert.equal(f.insideTsWinds, true, 'Ian\u2019s tropical-storm-force winds reached Seminole County');
  for (const s of replays.storms) {
    assert.ok(s.points.every(p => Number.isFinite(p.lat) && Number.isFinite(p.lon) && /^\d{4}-\d\d-\d\dT\d\d:\d\dZ$/.test(p.t)), s.name);
    assert.ok(s.points.some(p => p.id === 'L'), `${s.name} has a landfall record`);
  }
});

test('practice storm: same shapes as live feeds, and the numbers agree with each other', () => {
  const start = Date.UTC(2026, 9, 16, 18, 0);
  const sim = S.createPracticeStorm(LONGWOOD, start, { fromDeg: 260, speedKt: 28, startDistMi: 45 });
  const mph = 28 * S.KT_TO_MPH;
  const now = start + 15 * MIN;
  const cell = S.cellsFromAlerts([S.practiceAlert(sim, now)], LONGWOOD, now)[0];
  near(cell.approach.distanceMi, 45 - mph * 0.25, 0.7);
  near(cell.approach.etaMin, ((45 - mph * 0.25) / mph) * 60, 1.5);
  assert.equal(cell.approach.trackStatus, 'on-track');

  // the nowcast sees the rain arrive at about the same time the cell does
  const nc = S.analyzeNowcast(S.practiceNowcast(sim, now), now);
  assert.ok(nc.state === 'incoming' || nc.state === 'raining');
  const eta = cell.approach.etaMin;
  // rain falls ahead of the cell's centre, so it starts before the cell arrives, but not by hours
  if (nc.startsInMin != null) assert.ok(nc.startsInMin <= eta && eta - nc.startsInMin <= 40, `nowcast ${nc.startsInMin} vs cell ${eta}`);

  // deterministic strikes
  assert.deepEqual(S.practiceStrikes(sim, now), S.practiceStrikes(sim, now));
  const strikes = S.practiceStrikes(sim, start + 25 * MIN);
  assert.ok(strikes.length > 30);
  assert.ok(strikes.every(s => s.time <= start + 25 * MIN));
  const lt = S.analyzeLightning(strikes, LONGWOOD, start + 25 * MIN, start - 60 * MIN);
  assert.equal(lt.trend.direction, 'approaching');
});

test('daily summary: voice changes tone, never the numbers; safety line is voice-neutral', () => {
  const day = { dayName: 'Saturday', dateStr: '2026-10-17', hi: 88.4, lo: 69.6, rainChance: 65, gust: 31, uv: 7.2, code: 63 };
  const out = {};
  for (const v of Object.keys(S.VOICES)) {
    out[v] = S.composeDailySummary(day, { voice: v });
    for (const n of ['88', '70', '65', '31', '7.2']) assert.ok(out[v].text.includes(n), `${v} dropped ${n}: ${out[v].text}`);
  }
  assert.notEqual(out.coach.text, out.captain.text);
  assert.equal(out.coach.safety, null);
  const storm = { ...day, code: 95 };
  const safeties = new Set(Object.keys(S.VOICES).map(v => S.composeDailySummary(storm, { voice: v }).safety));
  assert.equal(safeties.size, 1);
  assert.match([...safeties][0], /thunderstorms/);
  assert.deepEqual(S.composeDailySummary(day, { voice: 'coach' }), S.composeDailySummary(day, { voice: 'coach' }), 'deterministic for a given day');
});

test('dayFromDaily maps an Open-Meteo daily block to summary input', () => {
  const d = { time: ['2026-10-16', '2026-10-17'], temperature_2m_max: [80, 88.2], temperature_2m_min: [60, 70.1], precipitation_probability_max: [10, 65], precipitation_sum: [0, 0.4], wind_gusts_10m_max: [12, 31], uv_index_max: [5, 7.2], weather_code: [1, 63] };
  const day = S.dayFromDaily(d, 1);
  assert.deepEqual([day.dayName, day.hi, day.lo, day.rainChance, day.gust, day.code], ['Saturday', 88.2, 70.1, 65, 31, 63]);
  assert.equal(S.dayFromDaily(d, 5), null);
  assert.equal(S.dayFromDaily(null), null);
  assert.match(S.composeDailySummary(day, { voice: 'deadpan' }).text, /88/);
});

test('daily summary: every voice reads as clean sentences', () => {
  for (const code of [2, 63, 95]) for (const v of Object.keys(S.VOICES)) {
    const t = S.composeDailySummary({ dayName: 'Sunday', dateStr: '2026-10-18', hi: 84, lo: 66, rainChance: 70, gust: 30, uv: 7, code }, { voice: v }).text;
    assert.ok(!/[.!?] [a-z]/.test(t), `${v}: lowercase after a sentence end: ${t}`);
    assert.ok(/^[A-Z]/.test(t), `${v}: starts lowercase`);
  }
});

test('daily summary: thresholds are personal choices', () => {
  const d = { hi: 82, lo: 60, rainChance: 40, gust: 10, uv: 3 };
  assert.equal(S.summaryFacts(d, { hot: 90, cold: 55, rain: 30 }).band, 'warm');
  assert.equal(S.summaryFacts(d, { hot: 80, cold: 55, rain: 30 }).band, 'hot');
  assert.equal(S.summaryFacts(d, { hot: 90, cold: 55, rain: 30 }).rain, 'maybe');
  assert.equal(S.summaryFacts(d, { hot: 90, cold: 55, rain: 50 }).rain, 'dry');
});

test('daily summary: a model-only storm tier mentions storms at Slight but only warns at Enhanced', () => {
  const day = { dayName: 'Sunday', dateStr: '2026-10-18', hi: 84, lo: 68, rainChance: 40, gust: 18, uv: 5, code: 3 };
  const slight = S.composeDailySummary({ ...day, stormTier: 3 }, { voice: 'anchor' });
  assert.equal(slight.facts.rain, 'storms');
  assert.equal(slight.safety, null);
  const enhanced = S.composeDailySummary({ ...day, stormTier: 4 }, { voice: 'anchor' });
  assert.match(enhanced.safety, /strong thunderstorms/);
});
