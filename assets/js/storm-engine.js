/**
 * storm-engine.js — live-storm analysis for the Weather Watch lesson and the home page.
 * Mr. Scandrett's ClassroomOS
 *
 * Two layers, kept apart on purpose:
 *   1. PURE functions (nowcast, storm-cell ETA, lightning trend, severe-weather ingredients,
 *      hurricane threat, daily-summary voices, radar geometry). No DOM, no network:
 *      unit-tested in tests/storm-engine.test.mjs and fed identical shapes by live feeds
 *      and by the practice-storm simulator.
 *   2. FETCHERS for open, key-free feeds that allow browser CORS: Open-Meteo, NWS, SPC,
 *      NHC (NOAA map service). Every fetcher resolves to null on failure; none throws.
 *
 * Coordinates sent to remote services are rounded to 2 decimals (~1 km): enough for
 * weather, and a student's exact position never leaves the browser.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StormEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const R_MI = 3958.8;
  const KT_TO_MPH = 1.150779;
  const RAD = Math.PI / 180;
  const MIN = 60000;

  // ── GEOMETRY ───────────────────────────────────────────────────────────────
  function haversineMiles(aLat, aLon, bLat, bLon) {
    const dLat = (bLat - aLat) * RAD, dLon = (bLon - aLon) * RAD;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * RAD) * Math.cos(bLat * RAD) * Math.sin(dLon / 2) ** 2;
    return R_MI * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  /** Initial compass bearing (0–360, clockwise from north) from A to B. */
  function bearingDeg(aLat, aLon, bLat, bLon) {
    const dLon = (bLon - aLon) * RAD;
    const y = Math.sin(dLon) * Math.cos(bLat * RAD);
    const x = Math.cos(aLat * RAD) * Math.sin(bLat * RAD) - Math.sin(aLat * RAD) * Math.cos(bLat * RAD) * Math.cos(dLon);
    return (Math.atan2(y, x) / RAD + 360) % 360;
  }
  function destination(lat, lon, bearing, miles) {
    const d = miles / R_MI, b = bearing * RAD, p1 = lat * RAD, l1 = lon * RAD;
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
    const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return { lat: p2 / RAD, lon: ((l2 / RAD + 540) % 360) - 180 };
  }
  const COMPASS16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  function compass16(deg) { return COMPASS16[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]; }
  const normDelta = d => ((d + 540) % 360) - 180;

  /** Ray-casting test; ring is [[lon,lat],...]. */
  function pointInRing(ring, lon, lat) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  /** GeoJSON Polygon / MultiPolygon geometry, holes respected. */
  function pointInGeometry(geom, lon, lat) {
    if (!geom || !geom.coordinates) return false;
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
    return polys.some(rings => rings.length && pointInRing(rings[0], lon, lat) && !rings.slice(1).some(h => pointInRing(h, lon, lat)));
  }
  function geometryCentroid(geom) {
    const polys = !geom ? [] : geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
    let n = 0, sx = 0, sy = 0;
    polys.forEach(rings => (rings[0] || []).forEach(([x, y]) => { sx += x; sy += y; n++; }));
    return n ? { lat: sy / n, lon: sx / n } : null;
  }

  // ── 1. NOWCAST ─────────────────────────────────────────────────────────────
  /** AMS rain-rate classes, mm per hour. */
  function rainClass(mmHr) {
    if (!(mmHr >= 0.1)) return 'dry';
    if (mmHr < 2.5) return 'light';
    if (mmHr < 7.6) return 'moderate';
    if (mmHr < 50) return 'heavy';
    return 'violent';
  }
  const roundTo5 = m => Math.max(0, Math.round(m / 5) * 5);

  /**
   * slots: [{ endMs, mm }] where mm fell in the 15 minutes ending at endMs
   * (Open-Meteo minutely_15 reports the preceding 15 minutes).
   */
  function analyzeNowcast(slots, nowMs, horizonSlots = 8) {
    const upcoming = (slots || []).filter(s => s && Number.isFinite(s.endMs) && s.endMs > nowMs).slice(0, horizonSlots);
    if (!upcoming.length) return null;
    const bars = upcoming.map(s => {
      const mmHr = (Number(s.mm) || 0) * 4;
      return { startMin: Math.max(0, (s.endMs - 15 * MIN - nowMs) / MIN), endMin: (s.endMs - nowMs) / MIN, mmHr, inHr: mmHr / 25.4, cls: rainClass(mmHr) };
    });
    const wet = b => b.cls !== 'dry';
    const rainingNow = wet(bars[0]);
    const peak = bars.reduce((a, b) => (b.mmHr > a.mmHr ? b : a), bars[0]);
    const totalIn = bars.reduce((s, b) => s + b.inHr * 0.25, 0);
    let startsInMin = null, endsInMin = null;
    if (rainingNow) {
      const dry = bars.find(b => !wet(b));
      if (dry) endsInMin = roundTo5(dry.startMin);
    } else {
      const first = bars.find(wet);
      if (first) {
        startsInMin = roundTo5(first.startMin);
        const after = bars.slice(bars.indexOf(first)).find(b => !wet(b));
        if (after) endsInMin = roundTo5(after.startMin);
      }
    }
    let headline;
    if (rainingNow) {
      headline = endsInMin != null ? `${cap(bars[0].cls)} rain now, easing in ~${endsInMin} min` : 'Rain continues for the next 2 hours';
    } else if (startsInMin != null) {
      const lasts = endsInMin != null ? endsInMin - startsInMin : null;
      const first = bars.find(wet);
      headline = `${cap(first.cls)} rain ${startsInMin <= 5 ? 'starts any minute' : `starts in ~${startsInMin} min`}${lasts ? ` and lasts ~${lasts} min` : ''}`;
    } else {
      headline = 'Dry for the next 2 hours';
    }
    return { bars, state: rainingNow ? 'raining' : startsInMin != null ? 'incoming' : 'dry', startsInMin, endsInMin, peakMmHr: peak.mmHr, peakInHr: peak.inHr, peakInMin: roundTo5(peak.startMin), totalIn, headline };
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /** Marshall–Palmer Z–R relation: Z = 200·R^1.6. dBZ → mm/h. */
  function dbzToRainRate(dbz) { return Math.pow(Math.pow(10, dbz / 10) / 200, 1 / 1.6); }
  function rainRateToDbz(mmHr) { return 10 * Math.log10(200 * Math.pow(Math.max(mmHr, 1e-6), 1.6)); }

  /** Height (ft) of the radar beam centre above the radar at ground range `rangeMi`, 4/3-earth refraction. */
  function radarBeamHeightFt(rangeMi, elevDeg = 0.5) {
    const kR = (4 / 3) * R_MI;
    const h = Math.sqrt(rangeMi * rangeMi + kR * kR + 2 * rangeMi * kR * Math.sin(elevDeg * RAD)) - kR;
    return h * 5280;
  }

  // ── 2. WARNED STORM CELLS (NWS warning polygons carry the storm's motion) ──
  const WARN_EVENTS = ['Tornado Warning', 'Severe Thunderstorm Warning', 'Special Marine Warning'];

  /** "2026-10-16T18:05:00-00:00...storm...285DEG...30KT...28.70,-81.50 28.8,-81.4" */
  function parseMotion(desc) {
    if (typeof desc !== 'string') return null;
    const m = desc.trim().match(/^(\S+?)\.\.\.\w+\.\.\.(\d{1,3})DEG\.\.\.(\d{1,3})KT\.\.\.(.+)$/i);
    if (!m) return null;
    const timeMs = Date.parse(m[1].replace(/-00:00$/, 'Z'));
    const points = m[4].trim().split(/\s+/).map(p => p.split(',').map(Number)).filter(p => p.length === 2 && p.every(Number.isFinite)).map(([lat, lon]) => ({ lat, lon }));
    if (!Number.isFinite(timeMs) || !points.length) return null;
    const speedKt = Number(m[3]);
    // NWS gives the direction the storm is moving FROM, like a wind.
    return { timeMs, fromDeg: Number(m[2]), headingDeg: (Number(m[2]) + 180) % 360, speedKt, speedMph: speedKt * KT_TO_MPH, points };
  }

  /**
   * Dead-reckon a storm to `nowMs` and compare its track with a point.
   * Flat-earth along/cross-track split: fine inside a few hundred miles.
   */
  function stormApproach(storm, point, nowMs) {
    const heading = storm.headingDeg != null ? storm.headingDeg : (storm.fromDeg + 180) % 360;
    const mph = storm.speedMph != null ? storm.speedMph : storm.speedKt * KT_TO_MPH;
    const elapsedHr = Math.min(3, Math.max(0, (nowMs - storm.timeMs) / 3.6e6));
    const pos = destination(storm.lat, storm.lon, heading, mph * elapsedHr);
    const distanceMi = haversineMiles(pos.lat, pos.lon, point.lat, point.lon);
    const toPoint = bearingDeg(pos.lat, pos.lon, point.lat, point.lon);
    const delta = normDelta(toPoint - heading) * RAD;
    const alongMi = distanceMi * Math.cos(delta);
    const crossMi = Math.abs(distanceMi * Math.sin(delta));
    let trackStatus;
    if (mph < 3) trackStatus = 'stationary';
    else if (alongMi <= 0) trackStatus = 'moving-away';
    else if (crossMi <= 8) trackStatus = 'on-track';
    else if (crossMi <= 20) trackStatus = 'passes-near';
    else trackStatus = 'passes-away';
    return {
      position: pos, distanceMi, alongMi, crossMi, trackStatus,
      fromUserDeg: bearingDeg(point.lat, point.lon, pos.lat, pos.lon),
      etaMin: mph >= 3 && alongMi > 0 ? (alongMi / mph) * 60 : null,
      closestMi: alongMi > 0 ? crossMi : distanceMi
    };
  }

  /** GeoJSON alert features → ranked list of warned cells for `point`. */
  function cellsFromAlerts(features, point, nowMs) {
    const cells = [];
    (features || []).forEach(f => {
      const p = (f && f.properties) || {};
      if (!WARN_EVENTS.includes(p.event)) return;
      const par = p.parameters || {};
      const motion = parseMotion((par.eventMotionDescription || [])[0]);
      const centroid = geometryCentroid(f.geometry);
      const start = motion ? motion.points[0] : centroid;
      if (!start) return;
      const inside = pointInGeometry(f.geometry, point.lon, point.lat);
      const approach = motion ? stormApproach({ ...motion, lat: start.lat, lon: start.lon }, point, nowMs) : null;
      const distanceMi = approach ? approach.distanceMi : haversineMiles(start.lat, start.lon, point.lat, point.lon);
      cells.push({
        id: f.id || p.id, event: p.event, headline: p.headline || p.event, areaDesc: p.areaDesc || '',
        expiresMs: Date.parse(p.expires || p.ends || '') || null,
        hail: (par.maxHailSize || [])[0] || null, wind: (par.maxWindGust || [])[0] || null,
        tornado: (par.tornadoDetection || [])[0] || null,
        inside, motion, approach, distanceMi, geometry: f.geometry,
        position: approach ? approach.position : start
      });
    });
    const rank = c => (c.inside ? -1e6 : 0) + (c.approach && c.approach.etaMin != null && c.approach.trackStatus !== 'passes-away' ? c.approach.etaMin : 1000 + c.distanceMi);
    return cells.sort((a, b) => rank(a) - rank(b));
  }

  // ── 3. LIGHTNING ───────────────────────────────────────────────────────────
  /** Speed of sound in air, ft/s (331.3 + 0.606·T°C m/s). */
  function soundSpeedFps(tempF) { return (331.3 + 0.606 * ((tempF - 32) * 5 / 9)) * 3.28084; }
  function flashToBang(seconds, tempF = 68) {
    const miles = (Math.max(0, seconds) * soundSpeedFps(tempF)) / 5280;
    return { miles, ruleOfThumbMiles: seconds / 5, shelter: miles <= 6 };
  }

  /** strikes: [{lat, lon, time(ms)}], keep ≥30 min of history for the 30/30 clock. */
  function analyzeLightning(strikes, point, nowMs, listenStartMs) {
    const all = (strikes || []).map(s => ({ ...s, mi: haversineMiles(point.lat, point.lon, s.lat, s.lon), ageMin: (nowMs - s.time) / MIN })).filter(s => s.ageMin >= 0 && s.ageMin <= 30);
    const recent = all.filter(s => s.ageMin <= 10);
    const within = r => recent.filter(s => s.mi <= r).length;
    const closest = recent.reduce((m, s) => (m == null || s.mi < m.mi ? s : m), null);

    // Trend: mean strike distance per 4-minute bin, least squares over bins (needs ≥3 bins with ≥2 strikes).
    let trend = { direction: 'unknown', approachMph: null, fitDistMi: null, etaTo6Min: null, bins: 0 };
    const near = all.filter(s => s.ageMin <= 20 && s.mi <= 60);
    const bins = new Map();
    near.forEach(s => { const k = Math.floor(s.ageMin / 4); (bins.get(k) || bins.set(k, []).get(k)).push(s.mi); });
    const pts = [...bins.entries()].filter(([, v]) => v.length >= 2).map(([k, v]) => ({ t: -(k * 4 + 2), d: v.reduce((a, b) => a + b, 0) / v.length }));
    if (pts.length >= 3) {
      const n = pts.length, mt = pts.reduce((a, p) => a + p.t, 0) / n, md = pts.reduce((a, p) => a + p.d, 0) / n;
      const sxx = pts.reduce((a, p) => a + (p.t - mt) ** 2, 0), sxy = pts.reduce((a, p) => a + (p.t - mt) * (p.d - md), 0);
      const slope = sxx ? sxy / sxx : 0;               // miles per minute (negative = closing)
      const approachMph = -slope * 60, fitDistMi = Math.max(0, md - slope * mt);
      const ssTot = pts.reduce((a, p) => a + (p.d - md) ** 2, 0), ssRes = pts.reduce((a, p) => a + (p.d - (md + slope * (p.t - mt))) ** 2, 0);
      const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
      // A short, scattered record can fake a trend. Only a long, tight fit earns an ETA.
      const confidence = n >= 4 && r2 >= 0.6 ? 'ok' : 'low';
      const direction = approachMph > 3 ? 'approaching' : approachMph < -3 ? 'receding' : 'steady';
      trend = { direction, approachMph, fitDistMi, bins: n, r2, confidence, etaTo6Min: confidence === 'ok' && direction === 'approaching' && fitDistMi > 6 && approachMph >= 5 ? ((fitDistMi - 6) / approachMph) * 60 : null };
    }

    // 30/30 rule: the clock restarts at every strike within 10 miles.
    const lastClose = all.filter(s => s.mi <= 10).reduce((m, s) => (m == null || s.time > m ? s.time : m), null);
    const minSince = lastClose != null ? (nowMs - lastClose) / MIN : null;
    const listenedMin = listenStartMs ? (nowMs - listenStartMs) / MIN : 0;
    let clock;
    if (minSince != null && minSince < 30) clock = { status: 'hold', remainingMin: Math.ceil(30 - minSince), minSince };
    else if (listenedMin < 30) clock = { status: 'unknown', listenedMin, remainingMin: Math.ceil(30 - listenedMin) };
    else clock = { status: 'clear', remainingMin: 0, minSince };
    return { total10: recent.length, r5: within(5), r10: within(10), r25: within(25), r50: within(50), closest, trend, clock, strikes: all };
  }

  // ── 4. SEVERE-WEATHER INGREDIENTS (teaching model, not a forecast product) ──
  function windVector(speed, fromDeg) { const r = fromDeg * RAD; return { u: -speed * Math.sin(r), v: -speed * Math.cos(r) }; }
  /** Bulk wind difference between two levels, same units in and out. */
  function bulkShear(lowSpd, lowDir, highSpd, highDir) {
    const a = windVector(lowSpd, lowDir), b = windVector(highSpd, highDir);
    return Math.hypot(b.u - a.u, b.v - a.v);
  }
  const TIERS = ['Not favorable', 'Ordinary storms', 'Marginal', 'Slight', 'Enhanced', 'Moderate'];
  /**
   * Moisture + instability + shear (+ a cap that must break). Each 0–3.
   * input: { dewF, capeJkg, cinJkg, shearKt }
   */
  function severeIngredients(i) {
    const dew = Number(i.dewF), cape = Number(i.capeJkg) || 0, cin = Math.abs(Number(i.cinJkg) || 0), shear = Number(i.shearKt) || 0;
    const moist = dew >= 67 ? 3 : dew >= 60 ? 2 : dew >= 55 ? 1 : 0;
    const inst = cape >= 2500 ? 3 : cape >= 1000 ? 2 : cape >= 250 ? 1 : 0;
    const sh = shear >= 40 ? 3 : shear >= 25 ? 2 : shear >= 15 ? 1 : 0;
    const capped = cin > 150 && inst < 3;
    let tier = 0;
    if (moist > 0 && inst > 0) {
      const score = moist + inst + sh;                  // 2–9
      tier = score >= 9 ? 5 : score >= 8 ? 4 : score >= 7 ? 3 : score >= 5 ? 2 : 1;
      if (capped) tier = Math.max(0, tier - 1);
    }
    const notes = [];
    if (!moist) notes.push('Air is too dry to feed a storm.');
    if (!inst) notes.push('Little instability: rising air has no buoyancy to keep going.');
    if (capped) notes.push('A warm “cap” (CIN) is holding the lid on; storms need a trigger strong enough to break it.');
    if (sh >= 2 && inst) notes.push('Wind changes a lot with height, so storms can organize and rotate.');
    if (moist && inst && sh === 0) notes.push('Fuel without organization: short-lived pulse storms.');
    return { moist, inst, shear: sh, capped, tier, label: TIERS[tier], notes, raw: { dewF: dew, capeJkg: cape, cinJkg: cin, shearKt: shear } };
  }
  /** Steering flow: storms drift with the mean wind through the cloud layer (≈700 hPa). */
  function steeringWind(spdKt, fromDeg) {
    return { fromDeg, headingDeg: (fromDeg + 180) % 360, kt: spdKt, mph: spdKt * KT_TO_MPH };
  }
  /** Open-Meteo hourly block (+ epochs) → per-hour ingredient rows. */
  function ingredientTimeline(h, epochs) {
    const out = [];
    for (let i = 0; i < epochs.length; i++) {
      const sh = bulkShear(h.wind_speed_10m[i], h.wind_direction_10m[i], h.wind_speed_500hPa[i], h.wind_direction_500hPa[i]);
      const ing = severeIngredients({ dewF: h.dew_point_2m[i], capeJkg: h.cape[i], cinJkg: h.convective_inhibition ? h.convective_inhibition[i] : 0, shearKt: sh });
      out.push({ ms: epochs[i], ...ing, steering: h.wind_speed_700hPa ? steeringWind(h.wind_speed_700hPa[i], h.wind_direction_700hPa[i]) : null });
    }
    return out;
  }

  // ── 5. SPC OUTLOOK ─────────────────────────────────────────────────────────
  const SPC_CATS = { 2: { label: 'TSTM', name: 'General thunderstorms', rank: 1 }, 3: { label: 'MRGL', name: 'Marginal risk', rank: 2 }, 4: { label: 'SLGT', name: 'Slight risk', rank: 3 }, 5: { label: 'ENH', name: 'Enhanced risk', rank: 4 }, 6: { label: 'MDT', name: 'Moderate risk', rank: 5 }, 8: { label: 'HIGH', name: 'High risk', rank: 6 } };
  function outlookAtPoint(fc, lat, lon) {
    let best = { label: 'NONE', name: 'No thunderstorm risk area', rank: 0 };
    ((fc && fc.features) || []).forEach(f => {
      const c = SPC_CATS[f.properties && f.properties.DN];
      if (c && c.rank > best.rank && pointInGeometry(f.geometry, lon, lat)) best = { ...c, validIso: f.properties.VALID_ISO, expireIso: f.properties.EXPIRE_ISO };
    });
    return best;
  }

  // ── 6. TROPICAL CYCLONES ───────────────────────────────────────────────────
  function saffirSimpson(kt) {
    const mph = kt * KT_TO_MPH;
    if (kt < 34) return { cat: 0, short: 'TD', label: 'Tropical depression', mph };
    if (kt < 64) return { cat: 0, short: 'TS', label: 'Tropical storm', mph };
    const cat = kt >= 137 ? 5 : kt >= 113 ? 4 : kt >= 96 ? 3 : kt >= 83 ? 2 : 1;
    return { cat, short: 'H' + cat, label: `Category ${cat} hurricane`, mph };
  }
  const WW_CODES = { HWA: 'Hurricane watch', HWR: 'Hurricane warning', TWA: 'Tropical storm watch', TWR: 'Tropical storm warning', SSA: 'Storm surge watch', SSR: 'Storm surge warning' };

  function distanceToPath(path, point) {
    let best = { mi: Infinity, tauHr: null };
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      for (let s = 0; s <= 20; s++) {
        const f = s / 20, lat = a.lat + (b.lat - a.lat) * f, lon = a.lon + (b.lon - a.lon) * f;
        const mi = haversineMiles(lat, lon, point.lat, point.lon);
        if (mi < best.mi) best = { mi, tauHr: a.tau != null && b.tau != null ? a.tau + (b.tau - a.tau) * f : null };
      }
    }
    if (!isFinite(best.mi) && path.length === 1) best = { mi: haversineMiles(path[0].lat, path[0].lon, point.lat, point.lon), tauHr: path[0].tau };
    return best;
  }

  /** storm: normalized by parseNhcStorm (or a replay frame via replayFrame). */
  function analyzeStormThreat(storm, point) {
    const distanceMi = haversineMiles(storm.lat, storm.lon, point.lat, point.lon);
    const cat = saffirSimpson(storm.maxwindKt);
    const inCone = storm.cone ? pointInGeometry(storm.cone, point.lon, point.lat) : null;
    const cpa = storm.track && storm.track.length ? distanceToPath(storm.track, point) : null;
    let nearestWw = null;
    (storm.warnings || []).forEach(w => (w.coords || []).forEach(([lon, lat]) => {
      const mi = haversineMiles(lat, lon, point.lat, point.lon);
      if (!nearestWw || mi < nearestWw.mi) nearestWw = { mi, code: w.code, label: WW_CODES[w.code] || w.code };
    }));
    let headline = `${storm.name} is ${Math.round(distanceToPath([{ lat: storm.lat, lon: storm.lon }], point).mi).toLocaleString('en-US')} mi ${compass16(bearingDeg(point.lat, point.lon, storm.lat, storm.lon))} of you`;
    if (inCone) headline += '; you are inside the forecast cone';
    else if (inCone === false) headline += '; you are outside the forecast cone';
    return { distanceMi, bearingFromUser: bearingDeg(point.lat, point.lon, storm.lat, storm.lon), cat, inCone, closestForecastMi: cpa ? cpa.mi : null, closestAtHr: cpa ? cpa.tauHr : null, nearestWatchWarning: nearestWw, headline };
  }

  /** Normalizes NHC map-service GeoJSON for one slot. */
  function parseNhcStorm(slot, layers) {
    const pts = ((layers.points && layers.points.features) || []).map(f => ({ ...f.properties, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }));
    const now = pts.find(p => p.tau === 0) || pts[0];
    if (!now) return null;
    const line = f => (f && f.features && f.features[0] && f.features[0].geometry && f.features[0].geometry.coordinates) || [];
    const track = pts.slice().sort((a, b) => a.tau - b.tau).map(p => ({ lat: p.lat, lon: p.lon, tau: p.tau, kt: p.maxwind, label: p.datelbl, cat: saffirSimpson(p.maxwind).short }));
    return {
      slot, id: slot, basin: now.basin, name: String(now.stormname || '').replace(/^(Tropical Storm|Tropical Depression|Hurricane|Post-Tropical Cyclone|Potential Tropical Cyclone|Subtropical Storm|Subtropical Depression|Major Hurricane|Remnants Of)\s+/i, '') || slot,
      fullName: now.stormname, type: now.stormtype, lat: now.lat, lon: now.lon, maxwindKt: now.maxwind, gustKt: now.gust, mslp: now.mslp,
      headingDeg: now.tcdir, speedKt: now.tcspd, advisory: now.advisnum, advisoryDate: now.advdate,
      track, cone: ((layers.cone && layers.cone.features) || [])[0] ? layers.cone.features[0].geometry : null,
      warnings: ((layers.warnings && layers.warnings.features) || []).map(f => ({ code: f.properties.tcww, coords: f.geometry.coordinates })),
      past: line(layers.pastTrack).map(([lon, lat]) => ({ lat, lon }))
    };
  }

  /** Replay (HURDAT2) frame → same shape analyzeStormThreat expects. */
  function replayFrame(replay, index, point) {
    const p = replay.points[Math.max(0, Math.min(replay.points.length - 1, index))];
    const kt = p.kt == null ? 0 : p.kt;
    const dist = point ? haversineMiles(p.lat, p.lon, point.lat, point.lon) : null;
    const r34Mi = p.r34nm ? p.r34nm * 1.150779 : null;
    return { t: p.t, lat: p.lat, lon: p.lon, kt, mb: p.mb, cat: saffirSimpson(kt), distanceMi: dist, bearingFromUser: point ? bearingDeg(point.lat, point.lon, p.lat, p.lon) : null, r34Mi, insideTsWinds: r34Mi != null && dist != null ? dist <= r34Mi : null, landfall: p.id === 'L' };
  }

  // ── 7. PRACTICE STORM (same shapes as the live feeds, fully simulated) ─────
  function mulberry32(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /** A storm that starts `startDistMi` away on the `fromDeg` side of `point` and moves straight at it. */
  function createPracticeStorm(point, startMs, opts = {}) {
    const fromDeg = opts.fromDeg != null ? opts.fromDeg : 260, speedKt = opts.speedKt || 28, startDistMi = opts.startDistMi || 45, missMi = opts.missMi || 0;
    const heading = (fromDeg + 180) % 360;
    const origin = destination(point.lat, point.lon, fromDeg, startDistMi);
    const aim = missMi ? destination(origin.lat, origin.lon, heading + 90, missMi) : origin;
    return { point, startMs, fromDeg, headingDeg: heading, speedKt, speedMph: speedKt * KT_TO_MPH, origin: aim, seed: opts.seed || 20261016 };
  }
  function practicePosition(sim, nowMs) { return destination(sim.origin.lat, sim.origin.lon, sim.headingDeg, sim.speedMph * Math.max(0, (nowMs - sim.startMs) / 3.6e6)); }
  function box(center, heading, behindMi, aheadMi, halfWidthMi) {
    const corner = (a, s) => { const m = destination(center.lat, center.lon, heading, a); const c = destination(m.lat, m.lon, heading + 90, s); return [c.lon, c.lat]; };
    const ring = [corner(aheadMi, -halfWidthMi), corner(aheadMi, halfWidthMi), corner(-behindMi, halfWidthMi), corner(-behindMi, -halfWidthMi)];
    ring.push(ring[0]);
    return { type: 'Polygon', coordinates: [ring] };
  }
  /** A Severe Thunderstorm Warning feature shaped exactly like api.weather.gov's. */
  function practiceAlert(sim, nowMs) {
    const pos = practicePosition(sim, nowMs);
    const iso = new Date(Math.floor(nowMs / MIN) * MIN).toISOString().replace('.000Z', '-00:00');
    return {
      id: 'practice-svr', type: 'Feature', geometry: box(pos, sim.headingDeg, 6, 22, 10),
      properties: {
        event: 'Severe Thunderstorm Warning', severity: 'Severe', headline: 'PRACTICE: Severe Thunderstorm Warning (simulated)', areaDesc: 'Simulated storm for the classroom',
        expires: new Date(nowMs + 45 * MIN).toISOString(),
        parameters: { eventMotionDescription: [`${iso}...storm...${sim.fromDeg}DEG...${sim.speedKt}KT...${pos.lat.toFixed(2)},${pos.lon.toFixed(2)}`], maxHailSize: ['1.50'], maxWindGust: ['70 MPH'], tornadoDetection: ['POSSIBLE'] }
      }
    };
  }
  /** Strikes in the 30 minutes before `nowMs`, stable for a given virtual time. */
  function practiceStrikes(sim, nowMs) {
    const out = [], step = 20000, end = Math.floor(nowMs / step) * step;
    for (let t = Math.max(sim.startMs, end - 30 * MIN); t <= end; t += step) {
      const rnd = mulberry32(sim.seed + Math.floor(t / step));
      const pos = practicePosition(sim, t);
      const n = Math.floor(rnd() * 4);
      for (let k = 0; k < n; k++) {
        const r = Math.abs((rnd() + rnd() + rnd() - 1.5)) * 9, a = rnd() * 360;
        const p = destination(pos.lat, pos.lon, a, r);
        const time = t + Math.floor(rnd() * step);
        if (time <= nowMs) out.push({ lat: p.lat, lon: p.lon, time });
      }
    }
    return out;
  }
  /** Rain under the simulated storm as 15-minute slots, like Open-Meteo's. */
  function practiceNowcast(sim, nowMs) {
    const slots = [], first = Math.ceil(nowMs / (15 * MIN)) * 15 * MIN;
    for (let k = 0; k < 12; k++) {
      const end = first + k * 15 * MIN, mid = end - 7.5 * MIN;
      const pos = practicePosition(sim, mid);
      const d = haversineMiles(pos.lat, pos.lon, sim.point.lat, sim.point.lon);
      slots.push({ endMs: end, mm: (32 * Math.exp(-((d / 5) ** 2))) / 4 });
    }
    return slots;
  }

  // ── 8. DAILY SUMMARY, WITH ATTITUDE ────────────────────────────────────────
  const DEFAULT_PREFS = { hot: 90, cold: 55, rain: 30 };
  function hashSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function warmthBand(hi, prefs) {
    if (hi <= 32) return 'freezing';
    if (hi < prefs.cold) return 'cold';
    if (hi < prefs.cold + 20) return 'mild';
    if (hi < prefs.hot) return 'warm';
    if (hi < prefs.hot + 8) return 'hot';
    return 'extreme';
  }
  /** Facts first: every sentence below is rendered from this object. */
  function summaryFacts(d, prefs = DEFAULT_PREFS) {
    const hi = Math.round(d.hi), lo = Math.round(d.lo), chance = Math.round(d.rainChance || 0);
    const gust = Math.round(d.gust || 0), uv = Math.round((d.uv || 0) * 10) / 10;
    // A thunderstorm code is a forecast; a model-only ingredient tier is weaker evidence, so it can
    // add "storms" to the sentence (Slight+) but only raises the safety line at Enhanced or higher.
    const codeThunder = (d.code || 0) >= 95, tier = d.stormTier || 0;
    const rain = codeThunder || tier >= 3 ? 'storms' : chance >= 60 ? 'likely' : chance >= prefs.rain ? 'maybe' : 'dry';
    const severe = codeThunder || tier >= 4 || gust >= 40 || hi >= prefs.hot + 10 || lo <= 25;
    return { day: d.dayName || 'Tomorrow', hi, lo, chance, gust, uv, precipIn: d.precipIn || 0, band: warmthBand(hi, prefs), rain, windy: gust >= 25, uvHigh: uv >= 6, severe, severeWhy: codeThunder ? 'thunderstorms' : tier >= 4 ? 'strong thunderstorms' : gust >= 40 ? 'damaging gusts' : hi >= prefs.hot + 10 ? 'dangerous heat' : lo <= 25 ? 'hard-freeze cold' : null };
  }
  const VOICES = {
    anchor: { label: 'Newsroom anchor', open: f => [`Good evening. ${f.day}'s outlook:`, `Here's what's on the radar for ${f.day}.`], temp: f => `a ${f.band} one, high ${f.hi}°, low ${f.lo}°.`, rain: { dry: 'No rain expected.', maybe: f => `A ${f.chance}% chance of showers.`, likely: f => `Rain is likely, ${f.chance}%.`, storms: 'Thunderstorms are in the forecast.' }, wind: f => `Gusts near ${f.gust} mph.`, uv: f => `UV index ${f.uv}: sunscreen.`, close: ['Back to you.', 'We will keep watching.'] },
    coach: { label: 'Coach', open: f => [`Alright team, ${f.day} game plan:`, `Listen up. ${f.day} looks like this:`], temp: f => `${f.band} conditions, ${f.hi}° high, ${f.lo}° low. Dress like it.`, rain: { dry: 'Dry field. No excuses.', maybe: f => `${f.chance}% chance of rain. Pack the jacket.`, likely: f => `Rain is coming (${f.chance}%). We play through it, smartly.`, storms: 'Thunder on the field means we go inside. Non-negotiable.' }, wind: f => `Gusts to ${f.gust} mph, so lean into it.`, uv: f => `UV ${f.uv}. Sunscreen is part of the uniform.`, close: ['Hydrate. Hustle.', 'Now go earn it.'] },
    captain: { label: 'Sea captain', open: f => [`Ahoy! The glass reads thus for ${f.day}:`, `Mark me words, mates, ${f.day} brings:`], temp: f => `${f.band} air, ${f.hi}° by afternoon, ${f.lo}° by the night watch.`, rain: { dry: 'Fair skies, not a drop in sight.', maybe: f => `A ${f.chance}% chance of squalls; stow the gear.`, likely: f => `Rain on the horizon (${f.chance}%). Batten down.`, storms: 'Thunderheads on the horizon! Every hand below deck.' }, wind: f => `Gusts of ${f.gust} mph will fill the sails.`, uv: f => `The sun bites at UV ${f.uv}. Cover up, sailor.`, close: ['Fair winds!', 'Steady as she goes.'] },
    deadpan: { label: 'Deadpan', open: f => [`${f.day}. Weather will occur.`, `${f.day}, summarized:`], temp: f => `It will be ${f.band}. ${f.hi}° and ${f.lo}°. Make of that what you will.`, rain: { dry: 'Precipitation: unlikely. Disappointing, honestly.', maybe: f => `${f.chance}% rain. A coin that cannot decide.`, likely: f => `${f.chance}% rain. The sky has made up its mind.`, storms: 'Thunderstorms. Please do not stand in them.' }, wind: f => `Gusts ${f.gust} mph. Hats are optional but futile.`, uv: f => `UV ${f.uv}. The sun is doing sun things.`, close: ['That is all.', 'Carry on.'] },
    sage: { label: 'Calm guide', open: f => [`Breathe. Here is ${f.day}:`, `Gently, ${f.day} arrives:`], temp: f => `a ${f.band} day, ${f.hi}° rising and ${f.lo}° resting.`, rain: { dry: 'The sky holds its water.', maybe: f => `Rain may visit (${f.chance}%).`, likely: f => `Rain will likely visit (${f.chance}%). Let it.`, storms: 'Storms are near. Be somewhere safe and still.' }, wind: f => `The wind speaks up to ${f.gust} mph.`, uv: f => `The sun is strong (UV ${f.uv}). Rest in shade.`, close: ['Move through it with care.', 'All is weather.'] },
    meteorologist: {
      label: 'Meteorologist',
      open: f => [`ClassroomOS meteorological desk, outlook for ${f.day}:`, `Synoptic forecast for ${f.day}:`],
      temp: f => `numerical models indicate a ${f.band} thermal profile, reaching a high of ${f.hi}° and a low of ${f.lo}°.`,
      rain: {
        dry: 'Atmospheric moisture remains low with negligible precipitation probability.',
        maybe: f => `Regional moisture brings a ${f.chance}% chance of scattered showers.`,
        likely: f => `Tropospheric saturation supports likely precipitation (${f.chance}%).`,
        storms: 'Convective instability indicates thunderstorms are probable.'
      },
      wind: f => `Surface wind velocity indicates peak gusts near ${f.gust} mph.`,
      uv: f => `Solar irradiance peaks at UV ${f.uv}.`,
      close: ['Monitoring regional telemetry.', 'ClassroomOS atmospheric telemetry complete.']
    },
    student: {
      label: 'Classroom kid',
      open: f => [`Classroom weather desk! Here is the scoop for ${f.day}:`, `Hey everyone! Recess forecast for ${f.day}:`],
      temp: f => `it will feel ${f.band}, with a high of ${f.hi}° and a low of ${f.lo}°.`,
      rain: {
        dry: 'No rain on the playground all day.',
        maybe: f => `Keep a jacket handy, there is a ${f.chance}% chance of rain.`,
        likely: f => `Rain is super likely (${f.chance}%), so pack rain boots for recess.`,
        storms: 'Thunderstorms are in the forecast, so stay safe inside.'
      },
      wind: f => `Gusts up to ${f.gust} mph will blow hats around!`,
      uv: f => `UV index is ${f.uv}, so remember sunscreen before outdoor play.`,
      close: ['Have an awesome day!', 'That is the student weather desk!']
    }
  };
  const VOICE_PROFILES = {
    anchor: { label: 'Newsroom anchor', rate: 1.0, pitch: 1.0, lang: 'en-US' },
    coach: { label: 'Coach', rate: 1.08, pitch: 1.06, lang: 'en-US' },
    captain: { label: 'Sea captain', rate: 0.90, pitch: 0.82, lang: 'en-US' },
    deadpan: { label: 'Deadpan', rate: 0.94, pitch: 0.86, lang: 'en-US' },
    sage: { label: 'Calm guide', rate: 0.82, pitch: 0.96, lang: 'en-US' },
    meteorologist: { label: 'Meteorologist', rate: 1.02, pitch: 1.02, lang: 'en-US' },
    student: { label: 'Classroom kid', rate: 1.08, pitch: 1.14, lang: 'en-US' }
  };
  /** Converts meteorological text and symbols into natural, spoken English for speech synthesis. */
  function toSpeechText(text) {
    if (!text) return '';
    return text
      .replace(/(\d+)°F/g, '$1 degrees Fahrenheit')
      .replace(/(\d+)°/g, '$1 degrees')
      .replace(/(\d+)%/g, '$1 percent')
      .replace(/(\d+)\s*mph\b/gi, '$1 miles per hour')
      .replace(/(\d+)\s*kt\b/gi, '$1 knots')
      .replace(/\bUV\s*(?:index)?\s*(\d+(\.\d+)?)/gi, 'U V index $1')
      .replace(/\bUV\b/g, 'U V')
      .replace(/~/g, 'about ')
      .replace(/\/\//g, ', ')
      .replace(/·/g, ', ')
      .replace(/⚠/g, 'Warning: ')
      .replace(/\bNWS\b/g, 'National Weather Service')
      .replace(/\bSPC\b/g, 'Storm Prediction Center')
      .replace(/[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  /** Voice changes the tone, never the numbers; safety guidance stays voice-neutral. */
  function composeDailySummary(input, opts = {}) {
    const prefs = { ...DEFAULT_PREFS, ...(opts.prefs || {}) };
    const f = summaryFacts(input, prefs);
    const voice = VOICES[opts.voice] ? opts.voice : 'anchor', v = VOICES[voice];
    const seed = hashSeed(`${input.dateStr || f.day}|${voice}`);
    const pick = a => a[seed % a.length];
    const r = v.rain[f.rain];
    const parts = [pick(v.open(f)), v.temp(f), typeof r === 'function' ? r(f) : r];
    if (f.windy) parts.push(v.wind(f));
    if (f.uvHigh) parts.push(v.uv(f));
    parts.push(pick(v.close));
    const safety = f.severe ? `Safety: ${f.severeWhy} expected. Follow National Weather Service alerts and plan to be indoors for the worst of it.` : null;
    // Capitalize a fragment only when the previous one ended a sentence ("Gently, Sunday arrives:" continues in lower case).
    const text = parts.reduce((out, part) => (out && !/[.!?]$/.test(out) ? `${out} ${part}` : `${out ? out + ' ' : ''}${part.charAt(0).toUpperCase()}${part.slice(1)}`), '');
    return { voice, voiceLabel: v.label, text, speechText: toSpeechText(text), safety, facts: f };
  }

  function currentFacts(d, prefs = DEFAULT_PREFS) {
    const temp = Math.round(d.temperature != null ? d.temperature : (d.currentTemp != null ? d.currentTemp : (d.hi || 72)));
    const feels = Math.round(d.feelsLike != null ? d.feelsLike : temp);
    const hi = Math.round(d.max != null ? d.max : (d.hi != null ? d.hi : temp));
    const lo = Math.round(d.min != null ? d.min : (d.lo != null ? d.lo : temp - 10));
    const chance = Math.round(d.rainChance || 0);
    const wind = Math.round(d.wind != null ? d.wind : (d.windSpeed != null ? d.windSpeed : 0));
    const gust = Math.round(d.windGusts != null ? d.windGusts : (d.gust != null ? d.gust : wind));
    const uv = Math.round((d.uvIndex != null ? d.uvIndex : (d.uv != null ? d.uv : 0)) * 10) / 10;
    const humidity = Math.round(d.humidity != null ? d.humidity : 50);
    const condition = (d.condition || (d.code != null ? (WW_CODES[d.code] || 'Fair') : 'Fair')).toLowerCase();
    const dir = typeof d.windCompass === 'string' ? d.windCompass : (d.windCompass && d.windCompass.full ? d.windCompass.full : (d.windDirection != null ? compass16(d.windDirection) : ''));
    const band = warmthBand(temp, prefs);
    const code = d.weatherCode != null ? d.weatherCode : (d.currentCode != null ? d.currentCode : (d.code || 0));
    const codeThunder = code >= 95;
    const severe = Boolean(d.severe || codeThunder || gust >= 40 || temp >= prefs.hot + 10 || lo <= 25);
    const severeWhy = d.severeWhy || (codeThunder ? 'thunderstorms' : gust >= 40 ? 'damaging wind gusts' : temp >= prefs.hot + 10 ? 'dangerous heat' : lo <= 25 ? 'freeze warning' : null);
    const city = (d.location && d.location.label ? d.location.label.split(',')[0] : (d.city || 'your area')).trim();
    const rain = codeThunder ? 'storms' : chance >= 60 ? 'likely' : chance >= prefs.rain ? 'maybe' : 'dry';
    return {
      city, temp, feels, hi, lo, chance, wind, gust, uv, humidity, condition, dir, band,
      windy: wind >= 18 || gust >= 25,
      uvHigh: uv >= 6,
      humidityHigh: humidity >= 70,
      hasSpread: Math.abs(feels - temp) >= 3,
      code, severe, severeWhy, rain
    };
  }

  const CURRENT_VOICES = {
    anchor: {
      label: 'Newsroom anchor',
      open: f => [`Live from the weather center for ${f.city}.`, `Current conditions in ${f.city}:`],
      temp: f => `the temperature is ${f.temp}°${f.hasSpread ? `, feels like ${f.feels}°` : ''} under ${f.condition}. High reaches ${f.hi}°, low ${f.lo}°.`,
      rain: {
        dry: 'No precipitation on local radar.',
        maybe: f => `A ${f.chance}% chance of scattered showers today.`,
        likely: f => `Rain is active or expected soon, with chances at ${f.chance}%.`,
        storms: 'Active thunderstorms in the vicinity; stay weather-aware.'
      },
      wind: f => `Winds are ${f.wind} mph${f.dir ? ` from the ${f.dir}` : ''}.`,
      uv: f => `UV index is ${f.uv}: sunscreen advised.`,
      close: ['Back to the studio.', 'We will keep watching the skies.']
    },
    coach: {
      label: 'Coach',
      open: f => [`Alright team, ${f.city} field report right now:`, `Listen up. Here is what we have outside:`],
      temp: f => `it is ${f.temp}°${f.hasSpread ? `, feels like ${f.feels}°` : ''} with ${f.condition}. Topping out at ${f.hi}°, dropping to ${f.lo}° tonight.`,
      rain: {
        dry: 'Dry field today. No excuses.',
        maybe: f => `Keep your jacket in your bag, ${f.chance}% chance of rain.`,
        likely: f => `Rain is coming (${f.chance}%). We play smart and stay focused.`,
        storms: 'Lightning protocol in effect. Move indoors immediately.'
      },
      wind: f => `Winds at ${f.wind} mph${f.dir ? ` from the ${f.dir}` : ''}. Lean into it.`,
      uv: f => `UV is ${f.uv}. Sunscreen is mandatory.`,
      close: ['Hydrate. Hustle.', 'Now go earn it.']
    },
    captain: {
      label: 'Sea captain',
      open: f => [`Ahoy! Deck log for ${f.city}:`, `The glass speaks for ${f.city}:`],
      temp: f => `we mark ${f.temp}° on deck${f.hasSpread ? `, feels like ${f.feels}°` : ''} amid ${f.condition}. High tide of heat hits ${f.hi}°, dipping to ${f.lo}° by the night watch.`,
      rain: {
        dry: 'Fair skies and dry planks all around.',
        maybe: f => `Keep a weather eye aloft for squalls, ${f.chance}% chance of rain.`,
        likely: f => `Batten down, rain is upon us (${f.chance}%).`,
        storms: 'Thunderheads brewing! All hands below deck.'
      },
      wind: f => `Wind pulling ${f.wind} knots${f.dir ? ` from the ${f.dir}` : ''}.`,
      uv: f => `The sun cuts sharp at UV ${f.uv}. Cover your crown, matey.`,
      close: ['Steady as she goes!', 'Fair winds!']
    },
    deadpan: {
      label: 'Deadpan',
      open: f => [`${f.city}. Atmospheric telemetry currently reports:`, `Current status for ${f.city}:`],
      temp: f => `it is ${f.temp}°. Feels like ${f.feels}°. Condition: ${f.condition}. High: ${f.hi}°. Low: ${f.lo}°.`,
      rain: {
        dry: 'Precipitation: none. Moving on.',
        maybe: f => `A ${f.chance}% chance of rain. Indecisive.`,
        likely: f => `Rain chance ${f.chance}%. Water falling from the sky is probable.`,
        storms: 'Thunderstorms. Do not argue with electricity.'
      },
      wind: f => `Wind is ${f.wind} mph. Air molecules in motion.`,
      uv: f => `UV ${f.uv}. The sun continues existing.`,
      close: ['That is all.', 'Carry on.']
    },
    sage: {
      label: 'Calm guide',
      open: f => [`Be present with the sky over ${f.city}:`, `Gently observing ${f.city}:`],
      temp: f => `the air rests at ${f.temp}°${f.hasSpread ? `, feeling like ${f.feels}°` : ''} under ${f.condition}. The day warms to ${f.hi}°, then softens to ${f.lo}° tonight.`,
      rain: {
        dry: 'The clouds drift peacefully without rain.',
        maybe: f => `Showers may touch the earth (${f.chance}%).`,
        likely: f => `Rain arrives to nourish the ground (${f.chance}%). Let it come.`,
        storms: 'Storms are near. Seek a safe, still place.'
      },
      wind: f => `The wind breathes at ${f.wind} mph${f.dir ? ` from the ${f.dir}` : ''}.`,
      uv: f => `The sun is bright at UV ${f.uv}. Rest in shade.`,
      close: ['Move through this day with care.', 'All is weather.']
    },
    meteorologist: {
      label: 'Meteorologist',
      open: f => [`ClassroomOS meteorological desk, live update for ${f.city}:`, `Current surface observation for ${f.city}:`],
      temp: f => `ambient temperature registers ${f.temp}°${f.hasSpread ? `, apparent temperature ${f.feels}°` : ''} with ${f.condition}. Maximum expected today is ${f.hi}°, minimum ${f.lo}°.`,
      rain: {
        dry: 'Reflectivity displays zero precipitation returns.',
        maybe: f => `Atmospheric moisture suggests a ${f.chance}% probability of precipitation.`,
        likely: f => `Tropospheric column saturation indicates likely rain (${f.chance}%).`,
        storms: 'Convective available potential energy supports active thunderstorms.'
      },
      wind: f => `Surface wind velocity measures ${f.wind} mph${f.dir ? ` from the ${f.dir}` : ''}.`,
      uv: f => `Ultraviolet solar flux registers index ${f.uv}.`,
      close: ['Tracking regional telemetry.', 'ClassroomOS atmospheric telemetry complete.']
    },
    student: {
      label: 'Classroom kid',
      open: f => [`Classroom weather reporter here with today's scoop for ${f.city}!`, `Hey everybody! Playground weather report for ${f.city}:`],
      temp: f => `right now it is ${f.temp}°${f.hasSpread ? `, but feels like ${f.feels}°` : ''} and ${f.condition}! Today's high is ${f.hi}°, and low tonight is ${f.lo}°.`,
      rain: {
        dry: 'No rain on the playground! Recess is all clear.',
        maybe: f => `Watch out for sprinkles, there is a ${f.chance}% chance of rain.`,
        likely: f => `Rain chance is ${f.chance}%, so grab boots and a jacket for recess!`,
        storms: 'Lightning alert! Remember: when thunder roars, stay indoors!'
      },
      wind: f => `Wind is blowing at ${f.wind} mph${f.dir ? ` from the ${f.dir}` : ''}.`,
      uv: f => `UV is ${f.uv}, so slap on sunscreen before recess!`,
      close: ['Have an awesome day in class!', 'Back to the classroom!']
    }
  };

  /** Composes a live spoken-ready summary of current conditions. */
  function composeCurrentSummary(input, opts = {}) {
    const prefs = { ...DEFAULT_PREFS, ...(opts.prefs || {}) };
    const f = currentFacts(input, prefs);
    const voice = CURRENT_VOICES[opts.voice] ? opts.voice : 'anchor', v = CURRENT_VOICES[voice];
    const seed = hashSeed(`${f.city}|${f.temp}|${f.code}|${voice}`);
    const pick = a => a[seed % a.length];
    const r = v.rain[f.rain];
    const parts = [pick(v.open(f)), v.temp(f), typeof r === 'function' ? r(f) : r];
    if (f.windy || f.wind > 0) parts.push(v.wind(f));
    if (f.uvHigh) parts.push(v.uv(f));
    parts.push(pick(v.close));
    const safety = f.severe ? `Safety: ${f.severeWhy} reported. Follow National Weather Service alerts and take appropriate precautions.` : null;
    const text = parts.reduce((out, part) => (out && !/[.!?]$/.test(out) ? `${out} ${part}` : `${out ? out + ' ' : ''}${part.charAt(0).toUpperCase()}${part.slice(1)}`), '');
    return { voice, voiceLabel: v.label, text, speechText: toSpeechText(text), safety, facts: f };
  }

  // ── SPEECH SYNTHESIS NARRATION ─────────────────────────────────────────────
  let activeUtterance = null;
  function stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    }
    activeUtterance = null;
  }
  function isSpeaking() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
  }
  function speakWeather(text, opts = {}) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    stopSpeaking();
    const spoken = toSpeechText(text);
    if (!spoken) return false;
    const voiceKey = opts.voice || 'anchor';
    const profile = VOICE_PROFILES[voiceKey] || VOICE_PROFILES.anchor;
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.rate = opts.rate != null ? opts.rate : profile.rate;
    utterance.pitch = opts.pitch != null ? opts.pitch : profile.pitch;
    utterance.lang = opts.lang || profile.lang;

    try {
      const voices = window.speechSynthesis.getVoices() || [];
      if (voices.length > 0) {
        const enVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
        if (voiceKey === 'captain') {
          const britOrDeep = enVoices.find(v => /daniel|oliver|george|british|uk|scotland/i.test(v.name));
          if (britOrDeep) utterance.voice = britOrDeep;
        } else if (voiceKey === 'sage') {
          const softVoice = enVoices.find(v => /serena|samantha|karen|victoria|natural/i.test(v.name));
          if (softVoice) utterance.voice = softVoice;
        } else if (voiceKey === 'student') {
          const brightVoice = enVoices.find(v => /junior|fred|albert|kid|child|samantha/i.test(v.name));
          if (brightVoice) utterance.voice = brightVoice;
        }
      }
    } catch (e) { /* voice list access */ }

    utterance.onstart = () => {
      activeUtterance = utterance;
      if (typeof opts.onStart === 'function') opts.onStart();
    };
    utterance.onend = () => {
      activeUtterance = null;
      if (typeof opts.onEnd === 'function') opts.onEnd();
    };
    utterance.onerror = (e) => {
      activeUtterance = null;
      if (typeof opts.onError === 'function') opts.onError(e);
    };

    window.speechSynthesis.speak(utterance);
    return true;
  }

  // ── FETCHERS ───────────────────────────────────────────────────────────────
  const memCache = new Map();
  const round2 = n => Math.round(Number(n) * 100) / 100;
  async function fetchJson(url, { ttlMs = 5 * MIN, timeoutMs = 9000, headers } = {}) {
    const hit = memCache.get(url);
    if (hit && Date.now() - hit.at < ttlMs) return hit.data;
    try { const raw = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('storm:' + url); if (raw) { const o = JSON.parse(raw); if (Date.now() - o.at < ttlMs) { memCache.set(url, o); return o.data; } } } catch (e) { /* storage blocked */ }
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctl.signal, headers });
      if (!res.ok) return null;
      const data = await res.json(), o = { at: Date.now(), data };
      memCache.set(url, o);
      try { sessionStorage.setItem('storm:' + url, JSON.stringify(o)); } catch (e) { /* quota */ }
      return data;
    } catch (e) { return null; } finally { clearTimeout(timer); }
  }
  const NWS = { headers: { Accept: 'application/geo+json' } };

  /** One Open-Meteo call: 15-minute rain plus the upper-air fields the ingredients model needs. */
  async function fetchAtmosphere(lat, lon) {
    const u = new URL('https://api.open-meteo.com/v1/forecast');
    u.searchParams.set('latitude', round2(lat)); u.searchParams.set('longitude', round2(lon));
    u.searchParams.set('minutely_15', 'precipitation');
    u.searchParams.set('hourly', 'temperature_2m,dew_point_2m,cape,convective_inhibition,wind_speed_10m,wind_direction_10m,wind_speed_500hPa,wind_direction_500hPa,wind_speed_700hPa,wind_direction_700hPa');
    u.searchParams.set('temperature_unit', 'fahrenheit'); u.searchParams.set('wind_speed_unit', 'kn');
    u.searchParams.set('forecast_days', '3'); u.searchParams.set('timezone', 'auto');
    const d = await fetchJson(u.toString(), { ttlMs: 10 * MIN });
    if (!d || !d.minutely_15 || !d.hourly) return null;
    const off = (d.utc_offset_seconds || 0) * 1000, toMs = t => Date.parse(t + ':00Z') - off;
    const slots = d.minutely_15.time.map((t, i) => ({ endMs: toMs(t), mm: d.minutely_15.precipitation[i] }));
    let ingredients = [];
    try { ingredients = ingredientTimeline(d.hourly, d.hourly.time.map(toMs)); } catch (e) { /* a missing level just empties the table */ }
    return { slots, ingredients, tempF: d.hourly.temperature_2m, hourlyMs: d.hourly.time.map(toMs), fetchedAt: Date.now() };
  }
  /** Open-Meteo daily block → the input composeDailySummary wants for day index `i` (1 = tomorrow). */
  function dayFromDaily(d, i = 1) {
    if (!d || !d.time || d.time[i] == null) return null;
    return { dayName: new Date(`${d.time[i]}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }), dateStr: d.time[i], hi: d.temperature_2m_max[i], lo: d.temperature_2m_min[i], rainChance: d.precipitation_probability_max[i], precipIn: d.precipitation_sum[i], gust: d.wind_gusts_10m_max[i], uv: d.uv_index_max[i], code: d.weather_code[i] };
  }
  async function fetchTomorrow(lat, lon) {
    const u = new URL('https://api.open-meteo.com/v1/forecast');
    u.searchParams.set('latitude', round2(lat)); u.searchParams.set('longitude', round2(lon));
    u.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max,uv_index_max');
    u.searchParams.set('temperature_unit', 'fahrenheit'); u.searchParams.set('wind_speed_unit', 'mph'); u.searchParams.set('precipitation_unit', 'inch');
    u.searchParams.set('forecast_days', '3'); u.searchParams.set('timezone', 'auto');
    const d = await fetchJson(u.toString(), { ttlMs: 30 * MIN });
    return d && d.daily ? dayFromDaily(d.daily, 1) : null;
  }
  async function fetchToday(lat, lon) {
    const u = new URL('https://api.open-meteo.com/v1/forecast');
    u.searchParams.set('latitude', round2(lat)); u.searchParams.set('longitude', round2(lon));
    u.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m');
    u.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max,uv_index_max');
    u.searchParams.set('temperature_unit', 'fahrenheit'); u.searchParams.set('wind_speed_unit', 'mph'); u.searchParams.set('precipitation_unit', 'inch');
    u.searchParams.set('forecast_days', '3'); u.searchParams.set('timezone', 'auto');
    const d = await fetchJson(u.toString(), { ttlMs: 15 * MIN });
    if (!d || !d.daily) return null;
    const cur = d.current || {};
    const today = dayFromDaily(d.daily, 0);
    if (!today) return null;
    return {
      ...today,
      dayName: 'Today',
      currentTemp: cur.temperature_2m != null ? cur.temperature_2m : today.hi,
      temperature: cur.temperature_2m != null ? cur.temperature_2m : today.hi,
      feelsLike: cur.apparent_temperature != null ? cur.apparent_temperature : today.hi,
      humidity: cur.relative_humidity_2m != null ? cur.relative_humidity_2m : 50,
      windSpeed: cur.wind_speed_10m != null ? cur.wind_speed_10m : 0,
      wind: cur.wind_speed_10m != null ? cur.wind_speed_10m : 0,
      windDirection: cur.wind_direction_10m,
      currentCode: cur.weather_code != null ? cur.weather_code : today.code,
      weatherCode: cur.weather_code != null ? cur.weather_code : today.code
    };
  }
  async function fetchPointMeta(lat, lon) {
    const d = await fetchJson(`https://api.weather.gov/points/${lat.toFixed(2)},${lon.toFixed(2)}`, { ttlMs: 6 * 3600e3, ...NWS });
    const p = d && d.properties;
    if (!p) return null;
    const rl = p.relativeLocation && p.relativeLocation.properties;
    return { city: rl && rl.city, state: rl && rl.state, cwa: p.cwa, radarStation: p.radarStation, timeZone: p.timeZone };
  }
  async function fetchRadarStation(id) {
    const d = await fetchJson(`https://api.weather.gov/radar/stations/${encodeURIComponent(id)}`, { ttlMs: 24 * 3600e3, ...NWS });
    const c = d && d.geometry && d.geometry.coordinates;
    return c ? { id, lat: c[1], lon: c[0], name: d.properties && d.properties.name } : null;
  }
  async function fetchWarnings(state) {
    if (!state) return null;
    const d = await fetchJson(`https://api.weather.gov/alerts/active?area=${encodeURIComponent(state)}&event=${encodeURIComponent(WARN_EVENTS.join(','))}`, { ttlMs: 60000, ...NWS });
    return d && Array.isArray(d.features) ? d.features : null;
  }
  async function fetchAlertsAt(lat, lon) {
    const d = await fetchJson(`https://api.weather.gov/alerts/active?point=${lat.toFixed(2)},${lon.toFixed(2)}`, { ttlMs: 60000, ...NWS });
    return d && Array.isArray(d.features) ? d.features : null;
  }
  async function fetchSpcOutlook(day = 1) {
    return fetchJson(`https://www.spc.noaa.gov/products/outlook/day${day}otlk_cat.nolyr.geojson`, { ttlMs: 20 * MIN });
  }

  const NHC = 'https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer';
  const NHC_BASES = { AT: [4, 30, 56, 82, 108], EP: [134, 160, 186, 212, 238], CP: [264, 290, 316, 342, 368] };
  const NHC_OFFSET = { points: 2, track: 3, cone: 4, warnings: 5, pastPoints: 7, pastTrack: 8 };
  const nhcQuery = layer => `${NHC}/${layer}/query?where=1%3D1&outFields=*&outSR=4326&f=geojson`;
  async function nhcLayers(base, names) {
    const got = await Promise.all(names.map(n => fetchJson(nhcQuery(base + NHC_OFFSET[n]), { ttlMs: 10 * MIN })));
    const o = {}; names.forEach((n, i) => { o[n] = got[i]; }); return o;
  }
  /**
   * Active tropical cyclones. Slots fill in order (AT1, AT2…), so each basin stops at its first empty slot.
   * `full` also loads track, cone, warnings and past track.
   */
  async function fetchActiveStorms({ basins = ['AT', 'EP', 'CP'], full = false } = {}) {
    let failed = 0;
    const perBasin = await Promise.all(basins.map(async basin => {
      const found = [];
      for (let n = 1; n <= NHC_BASES[basin].length; n++) {
        const base = NHC_BASES[basin][n - 1], slot = `${basin}${n}`;
        const layers = await nhcLayers(base, full ? ['points', 'track', 'cone', 'warnings', 'pastTrack'] : ['points']);
        if (!layers.points) { failed++; break; }
        const feats = layers.points.features || [];
        if (!feats.length) break;
        if (feats[0].properties && feats[0].properties.binnumber && feats[0].properties.binnumber !== slot) break;
        const storm = parseNhcStorm(slot, layers);
        if (storm) found.push(storm);
      }
      return found;
    }));
    const storms = perBasin.flat();
    return failed === basins.length ? null : storms;
  }
  async function fetchTropicalOutlook() {
    const d = await fetchJson(nhcQuery(3), { ttlMs: 30 * MIN });
    return d && d.features ? d.features.map(f => ({ basin: f.properties.basin, prob2day: f.properties.prob2day, prob7day: f.properties.prob7day, risk7day: f.properties.risk7day, geometry: f.geometry })) : null;
  }

  return {
    R_MI, KT_TO_MPH, SPC_CATS, WW_CODES, VOICES, DEFAULT_PREFS, WARN_EVENTS,
    haversineMiles, bearingDeg, destination, compass16, pointInRing, pointInGeometry, geometryCentroid,
    rainClass, analyzeNowcast, dbzToRainRate, rainRateToDbz, radarBeamHeightFt,
    parseMotion, stormApproach, cellsFromAlerts,
    soundSpeedFps, flashToBang, analyzeLightning,
    windVector, bulkShear, severeIngredients, steeringWind, ingredientTimeline, outlookAtPoint,
    saffirSimpson, analyzeStormThreat, parseNhcStorm, replayFrame, distanceToPath,
    createPracticeStorm, practicePosition, practiceAlert, practiceStrikes, practiceNowcast,
    summaryFacts, composeDailySummary, dayFromDaily,
    currentFacts, composeCurrentSummary, toSpeechText, speakWeather, stopSpeaking, isSpeaking,
    VOICE_PROFILES, CURRENT_VOICES,
    fetchAtmosphere, fetchToday, fetchTomorrow, fetchPointMeta, fetchRadarStation, fetchWarnings, fetchAlertsAt, fetchSpcOutlook, fetchActiveStorms, fetchTropicalOutlook
  };
});
