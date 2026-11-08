/* Live sound: the maths behind the Live Sound Reinforcement lesson, with no DOM.
 *
 *   LiveSound.spl({ sensitivity, watts, distance, source })  → SPL at a seat (point or line source)
 *   LiveSound.addSources([94, 94], 'uncorrelated')          → 97 dB (two singers, +3 dB)
 *   LiveSound.coherentSum(94, 94, 180)                       → -Infinity (opposite polarity cancels)
 *   LiveSound.gainBeforeFeedback({ ds, d0, d1, d2, nom, … }) → PAG, NAG and whether the show works
 *   LiveSound.patternGain('cardioid', 180)                   → mic sensitivity off-axis (0…1)
 *   LiveSound.createRoom(seed)                               → a feedback loop to ring out with a 31-band EQ
 *   LiveSound.beamingFrequency(15)                           → where a 15-inch cone starts to beam
 *   LiveSound.pistonCoverage(12, 4000)                       → its −6 dB coverage angle at 4 kHz
 *   LiveSound.speakerLoad(2, 8, 'parallel')                  → 4 Ω
 *   LiveSound.ampPower({ ratedWatts8, load, bridged })       → watts delivered, and whether the load is safe
 *   LiveSound.cableLoss({ awg, metres, load, ampZ })         → dB lost in the speaker cable and damping factor
 *   LiveSound.delaySpeaker({ distance, tempC, haasMs })      → delay time for a fill speaker
 *   LiveSound.coverage({ height, front, back })              → front-row vs back-row level difference
 *   LiveSound.safeHours(dBA)                                 → NIOSH daily exposure limit
 *
 * Used by live-sound-lab.js. Tests: node --test tests/live-sound.test.mjs
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LiveSound = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function log10(x) { return Math.log(x) / Math.LN10; }
  function round(x, places) { var p = Math.pow(10, places || 0); return Math.round(x * p) / p; }
  function dbPower(ratio) { return 10 * log10(ratio); }
  function dbAmplitude(ratio) { return 20 * log10(ratio); }

  /* ── Speed of sound ─────────────────────────────────────────────────────────
   * Warm air is faster: c ≈ 331.3 + 0.606·T (T in °C). 343 m/s at 20 °C. */
  function speedOfSound(tempC) {
    var t = typeof tempC === 'number' ? tempC : 20;
    return 331.3 + 0.606 * t;
  }

  /* ── The inverse square law ─────────────────────────────────────────────────
   * A point source spreads over a sphere: every doubling of distance spreads the
   * same power over 4× the area, so −6 dB. A line source (a tall line array, in
   * its near field) spreads over a cylinder: −3 dB per doubling.
   * Speaker sensitivity is the SPL from 1 W at 1 m; 10× the watts is +10 dB. */
  function distanceLoss(d1, d2, source) {
    var k = source === 'line' ? 10 : 20;
    return k * log10(d2 / d1);
  }

  function spl(opts) {
    var sens = opts.sensitivity;
    var watts = Math.max(opts.watts, 1e-6);
    var d = Math.max(opts.distance, 0.1);
    return sens + dbPower(watts) - distanceLoss(1, d, opts.source);
  }

  /* ── Adding sources ─────────────────────────────────────────────────────────
   * Uncorrelated sources (two singers, two guitar amps) add as power: two equal
   * sources = +3 dB. Coherent sources (the same signal through two speakers, at
   * a seat equally far from both) add as pressure: in phase = +6 dB, opposite
   * polarity = silence, anything else in between. */
  function addSources(levels, mode) {
    if (!levels.length) return -Infinity;
    if (mode === 'coherent') {
      var sum = 0;
      levels.forEach(function (l) { sum += Math.pow(10, l / 20); });
      return dbAmplitude(sum);
    }
    var p = 0;
    levels.forEach(function (l) { p += Math.pow(10, l / 10); });
    return dbPower(p);
  }

  function coherentSum(l1, l2, phaseDeg) {
    var a1 = Math.pow(10, l1 / 20), a2 = Math.pow(10, l2 / 20);
    var ph = phaseDeg * Math.PI / 180;
    var re = a1 + a2 * Math.cos(ph), im = a2 * Math.sin(ph);
    var mag = Math.sqrt(re * re + im * im);
    if (mag < 1e-9 * Math.max(a1, a2)) return -Infinity;
    return dbAmplitude(mag);
  }

  /* ── Microphone polar patterns ──────────────────────────────────────────────
   * First-order patterns are A + B·cos θ. The null is where that reaches zero:
   * cardioid 180°, supercardioid ≈ 126°, hypercardioid ≈ 110°, figure-8 90°.
   * Real mics never null perfectly, so rejection is capped (default 25 dB). */
  var PATTERNS = {
    omni: { a: 1, b: 0, label: 'Omnidirectional' },
    cardioid: { a: 0.5, b: 0.5, label: 'Cardioid' },
    supercardioid: { a: 0.37, b: 0.63, label: 'Supercardioid' },
    hypercardioid: { a: 0.25, b: 0.75, label: 'Hypercardioid' },
    figure8: { a: 0, b: 1, label: 'Figure-8' }
  };

  function patternGain(pattern, angleDeg) {
    var p = PATTERNS[pattern];
    if (!p) throw new Error('unknown pattern ' + pattern);
    return Math.abs(p.a + p.b * Math.cos(angleDeg * Math.PI / 180));
  }

  function patternNull(pattern) {
    var p = PATTERNS[pattern];
    if (!p || p.b === 0) return null;
    var c = -p.a / p.b;
    if (c < -1) return null;
    return Math.acos(c) * 180 / Math.PI;
  }

  function rejectionDb(pattern, angleDeg, floorDb) {
    var cap = typeof floorDb === 'number' ? floorDb : 25;
    var g = patternGain(pattern, angleDeg);
    if (g <= 0) return cap;
    return Math.max(0, Math.min(cap, -dbAmplitude(g)));
  }

  /* ── Gain before feedback (Boner / Davis PAG–NAG) ───────────────────────────
   *   ds  talker → mic          d0  talker → farthest listener
   *   d1  mic → nearest speaker  d2  speaker → farthest listener
   *   ead equivalent acoustic distance: how close the listener should *sound*
   *   nom number of open mics    fsm feedback stability margin (6 dB)
   *
   *   PAG = 20log D1 − 20log D2 + 20log D0 − 20log Ds − 10log NOM − FSM
   *   NAG = 20log D0 − 20log EAD
   *
   * The classic equation assumes omni mics and speakers. `rejection` adds the
   * directional mic's rejection toward the speaker (cardioid aimed away). */
  function gainBeforeFeedback(o) {
    var nom = Math.max(1, Math.round(o.nom || 1));
    var fsm = typeof o.fsm === 'number' ? o.fsm : 6;
    var rej = o.rejection || 0;
    var pag = dbAmplitude(o.d1) - dbAmplitude(o.d2) + dbAmplitude(o.d0) - dbAmplitude(o.ds) - dbPower(nom) - fsm + rej;
    var nag = dbAmplitude(o.d0) - dbAmplitude(o.ead);
    return {
      pag: pag,
      nag: nag,
      margin: pag - nag,
      works: pag >= nag,
      terms: {
        speakerToMic: dbAmplitude(o.d1),
        speakerToListener: -dbAmplitude(o.d2),
        talkerToListener: dbAmplitude(o.d0),
        talkerToMic: -dbAmplitude(o.ds),
        openMics: -dbPower(nom),
        stability: -fsm,
        rejection: rej
      }
    };
  }

  /* ── Ringing out ────────────────────────────────────────────────────────────
   * The loop (mic → console → amp → speaker → room → mic) has a gain that changes
   * with frequency: speaker peaks, room modes and the mic's response all stack.
   * Raise the master and the first frequency whose loop gain reaches 0 dB rings.
   * A 31-band graphic EQ cuts that band; each cut buys gain at that frequency
   * only, until another peak rings. Too many cuts and the PA sounds hollow. */
  var GEQ_BANDS = [20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
    800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000];

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var BAND_SIGMA = 0.16; // a graphic EQ band's cut, as a Gaussian width in octaves (≈ 1/3 octave wide)

  function createRoom(seed) {
    var rnd = mulberry32(seed == null ? 7 : seed);
    // Feedback lives where vocal mics and wedges both have energy: ~160 Hz – 6.3 kHz.
    var candidates = GEQ_BANDS.filter(function (f) { return f >= 160 && f <= 6300; });
    var bands = [];
    var count = 6;
    while (bands.length < count) {
      var f = candidates[Math.floor(rnd() * candidates.length)];
      // Peaks on neighbouring bands make the lab muddy; keep them at least half an octave apart.
      var tooClose = bands.some(function (b) { return Math.abs(Math.log2(b / f)) < 0.45; });
      if (!tooClose) bands.push(f);
    }
    // Ring order: each next peak sits 1.2–3.2 dB below the last, so every correct notch buys
    // gain you can see, and the fifth or sixth cut buys little (time to stop).
    var target = -4;
    var peaks = bands.map(function (band, i) {
      if (i > 0) target -= 1.2 + rnd() * 2;
      var freq = band * Math.pow(2, (rnd() - 0.5) / 12); // within ±1/24 octave of the band centre
      return {
        band: band,
        freq: freq,
        height: target - baseLoop(freq),                 // dB above the smooth loop response
        width: 0.06 + rnd() * 0.06,                      // octaves (room and speaker peaks are narrow)
        loop: target
      };
    });
    return { seed: seed, peaks: peaks };
  }

  // Smooth part of the loop: mic + speaker roll off at both ends.
  function baseLoop(f) {
    var o = Math.log2(f / 1000);
    var lo = f < 150 ? -18 * Math.log2(150 / f) : 0;
    var hi = f > 7000 ? -14 * Math.log2(f / 7000) : 0;
    return -14 - 1.5 * o * o + lo + hi;
  }

  function loopGain(room, f) {
    var g = baseLoop(f);
    room.peaks.forEach(function (p) {
      var x = Math.log2(f / p.freq) / p.width;
      g += p.height * Math.exp(-0.5 * x * x);
    });
    return g;
  }

  function eqGain(cuts, f) {
    var g = 0;
    Object.keys(cuts || {}).forEach(function (k) {
      var depth = cuts[k];
      if (!depth) return;
      var x = Math.log2(f / Number(k)) / BAND_SIGMA;
      g -= depth * Math.exp(-0.5 * x * x);
    });
    return g;
  }

  var SWEEP = (function () {
    var out = [];
    for (var o = Math.log2(20); o <= Math.log2(20000) + 1e-9; o += 1 / 96) out.push(Math.pow(2, o));
    return out;
  }());

  // The frequency closest to ringing, and how many dB of master gain are left before it does.
  function ringPoint(room, cuts, master) {
    var best = { freq: 1000, loop: -Infinity };
    SWEEP.forEach(function (f) {
      var l = loopGain(room, f) + eqGain(cuts, f) + master;
      if (l > best.loop) best = { freq: f, loop: l };
    });
    var band = nearestBand(best.freq);
    return { freq: best.freq, band: band, loop: best.loop, rings: best.loop >= 0, headroom: -best.loop };
  }

  // The master level at which the system first rings, with these cuts.
  function maxStableGain(room, cuts) {
    return -ringPoint(room, cuts, 0).loop;
  }

  function nearestBand(f) {
    var best = GEQ_BANDS[0];
    GEQ_BANDS.forEach(function (b) { if (Math.abs(Math.log2(f / b)) < Math.abs(Math.log2(f / best))) best = b; });
    return best;
  }

  // How much the EQ has changed the PA's tone, for the "tone damage" meter.
  function eqDamage(cuts) {
    var bands = 0, total = 0, deepest = 0;
    Object.keys(cuts || {}).forEach(function (k) {
      var d = cuts[k] || 0;
      if (d > 0) { bands++; total += d; deepest = Math.max(deepest, d); }
    });
    var verdict = bands === 0 ? 'flat' : (bands <= 4 && deepest <= 9 ? 'transparent' : (bands <= 6 && deepest <= 12 ? 'noticeable' : 'hollow'));
    return { bands: bands, total: total, deepest: deepest, verdict: verdict };
  }

  /* ── Loudspeakers ───────────────────────────────────────────────────────────
   * A cone starts to beam (narrow its coverage) once the wavelength is shorter
   * than its diameter: f ≈ c / d. That is why a 15-inch woofer hands the highs to
   * a horn well below 1 kHz. */
  function beamingFrequency(diameterInches, tempC) {
    return speedOfSound(tempC) / (diameterInches * 0.0254);
  }

  function wavelength(freq, tempC) { return speedOfSound(tempC) / freq; }

  // Coverage of a flat circular piston, edge to edge where it's 6 dB down on axis.
  // Its directivity is 2·J1(x)/x with x = (πd/λ)·sin θ, which falls to 0.5 at x ≈ 2.215,
  // so sin θ = 0.705·λ/d. Wider than the wavelength allows → it covers the whole front (180°).
  function pistonCoverage(diameterInches, freq, tempC) {
    var s = 0.705 * wavelength(freq, tempC) / (diameterInches * 0.0254);
    return s >= 1 ? 180 : 2 * Math.asin(s) * 180 / Math.PI;
  }

  /* ── Amplifiers and loads ───────────────────────────────────────────────────
   * Speakers in parallel: Z/n. In series: n·Z. An ideal amplifier is a voltage
   * source, so halving the load doubles the power (P = V²/R), and doubles the
   * current the output stage must deliver. Bridged, the speaker sees twice the
   * voltage (4× power into the same load), but each side of the amp sees half
   * the load, so a bridged amp's minimum load is twice a single channel's. */
  function speakerLoad(n, ohms, wiring) {
    var count = Math.max(1, Math.round(n));
    return wiring === 'series' ? count * ohms : ohms / count;
  }

  function ampPower(o) {
    var rated8 = o.ratedWatts8;
    var load = o.load;
    var minLoad = o.minLoad || 4;
    var bridged = !!o.bridged;
    // Voltage a channel swings at full power into 8 Ω.
    var v = Math.sqrt(rated8 * 8);
    var vSpeaker = bridged ? 2 * v : v;
    var perSideLoad = bridged ? load / 2 : load;
    var watts = vSpeaker * vSpeaker / load;
    var safe = perSideLoad >= minLoad - 1e-9;
    return { watts: watts, perSideLoad: perSideLoad, safe: safe, volts: vSpeaker, amps: vSpeaker / load };
  }

  // Ohms per metre of one copper conductor.
  var AWG_OHMS_PER_M = { 10: 0.00328, 12: 0.00521, 14: 0.00828, 16: 0.0132, 18: 0.0210 };

  function cableLoss(o) {
    var r = AWG_OHMS_PER_M[o.awg];
    if (!r) throw new Error('unknown gauge ' + o.awg);
    var rc = 2 * o.metres * r; // out and back
    var ampZ = typeof o.ampZ === 'number' ? o.ampZ : 0.02;
    var lossDb = -dbAmplitude(o.load / (o.load + rc));
    return {
      cableOhms: rc,
      lossDb: lossDb,
      powerLostPct: 100 * (1 - Math.pow(o.load / (o.load + rc), 2)),
      dampingAtAmp: o.load / ampZ,
      dampingAtSpeaker: o.load / (ampZ + rc)
    };
  }

  /* ── Delay speakers ─────────────────────────────────────────────────────────
   * A fill speaker under a balcony is closer to its listeners than the mains are,
   * so its sound would arrive first and pull the image off the stage. Delay it by
   * the travel time from the mains, plus ~10 ms so the mains still arrive first
   * (the precedence, or Haas, effect: the ear localises to the first arrival). */
  function delaySpeaker(o) {
    var c = speedOfSound(o.tempC);
    var haas = typeof o.haasMs === 'number' ? o.haasMs : 10;
    var travel = o.distance / c * 1000;
    return { speed: c, travelMs: travel, delayMs: travel + haas };
  }

  /* ── Coverage front to back ─────────────────────────────────────────────────
   * The front row is much closer than the back, so it is much louder. Raising the
   * speaker evens out the distances (the front row's distance grows the most). */
  function coverage(o) {
    var h = o.height;
    var dFront = Math.sqrt(h * h + o.front * o.front);
    var dBack = Math.sqrt(h * h + o.back * o.back);
    return { dFront: dFront, dBack: dBack, spread: dbAmplitude(dBack / dFront) };
  }

  /* ── Hearing safety ─────────────────────────────────────────────────────────
   * NIOSH: 85 dBA for 8 hours, halving the time for every +3 dB. */
  function safeHours(dBA) { return 8 / Math.pow(2, (dBA - 85) / 3); }

  return {
    GEQ_BANDS: GEQ_BANDS,
    PATTERNS: PATTERNS,
    AWG_OHMS_PER_M: AWG_OHMS_PER_M,
    round: round,
    dbPower: dbPower,
    dbAmplitude: dbAmplitude,
    speedOfSound: speedOfSound,
    distanceLoss: distanceLoss,
    spl: spl,
    addSources: addSources,
    coherentSum: coherentSum,
    patternGain: patternGain,
    patternNull: patternNull,
    rejectionDb: rejectionDb,
    gainBeforeFeedback: gainBeforeFeedback,
    createRoom: createRoom,
    loopGain: loopGain,
    eqGain: eqGain,
    ringPoint: ringPoint,
    maxStableGain: maxStableGain,
    nearestBand: nearestBand,
    eqDamage: eqDamage,
    beamingFrequency: beamingFrequency,
    wavelength: wavelength,
    pistonCoverage: pistonCoverage,
    speakerLoad: speakerLoad,
    ampPower: ampPower,
    cableLoss: cableLoss,
    delaySpeaker: delaySpeaker,
    coverage: coverage,
    safeHours: safeHours
  };
}));
