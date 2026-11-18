/* SteamEngineModel: the physics behind the James Watt lesson's Engine House lab.
   DOM-free so tests/steam-engine-model.test.mjs can check it.

   One stroke of an atmospheric pumping engine:
   - Steam at about 1 atm fills the cylinder (volume V). That steam is the useful part.
   - The steam is condensed. What is left behind is water vapour at the temperature
     of the cold spot (vapour pressure p_v(T)), so the atmosphere (or, in Watt's closed
     cylinder, low-pressure steam) pushes the piston down with Δp = p_atm − p_v(T).
     Work per stroke = Δp · V.
   - Newcomen sprays cold water into the cylinder itself, so the iron walls and piston
     cool to T too. Next stroke, incoming steam condenses on them until they are back at
     100 °C: extra steam = C_wall · (100 − T) / L. That is the waste Watt found.
   - Watt condenses in a separate vessel and keeps the cylinder in a steam jacket, so the
     walls barely cool; he pays a little work to run the air pump instead.
   Coal follows from steam: each kg of steam needs H_RAISE of heat from a boiler of
   efficiency BOILER_EFF burning coal of COAL_ENERGY. "Duty" is the 18th-century score:
   foot-pounds of work per bushel (84 lb) of coal.

   WALL_C, BOILER_EFF and MECH_EFF are not measured values for one engine: they are set so
   the model lands near the duties engineers actually measured (Smeaton's 1769 survey of
   Newcomen engines averaged about 5.6 million; early Boulton & Watt engines about 20). */
(function (root) {
  'use strict';

  var P_ATM = 101.325;          // kPa
  var LATENT = 2257;            // kJ/kg, latent heat of steam at 100 °C
  var STEAM_DENSITY = 0.598;    // kg/m³, saturated steam at 100 °C
  var H_RAISE = 2470;           // kJ to turn 1 kg of ~50 °C feed water into steam
  var COAL_ENERGY = 29000;      // kJ/kg
  var BOILER_EFF = 0.6;         // share of the coal's heat that reaches the water
  var MECH_EFF = 0.75;          // friction, leaks, imperfect valves
  var BUSHEL_KG = 38.1;         // a bushel of coal: 84 lb
  var FTLB_PER_J = 0.737562;
  var BORE = 0.762;             // m: a 30-inch cylinder
  var STROKE = 2.134;           // m: a 7-foot stroke
  var AREA = Math.PI * BORE * BORE / 4;
  var VOLUME = AREA * STROKE;   // ≈ 0.97 m³
  var WALL_C = 80;              // kJ/K: iron skin and piston whose temperature swings each stroke
  var JACKET_SWING = 3;         // K: how far the jacketed Watt cylinder still cools
  var AIR_PUMP = 0.07;          // share of the Watt engine's work spent on its air pump
  var STROKES_PER_MIN = 12;
  var G = 9.81;
  var CHILL_MIN = 25, CHILL_MAX = 95;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* Vapour pressure of water in kPa (Antoine equation, good from 1 to 100 °C). */
  function vapourPressure(tC) {
    return 0.133322 * Math.pow(10, 8.07131 - 1730.63 / (233.426 + tC));
  }

  /* One stroke. engine: 'newcomen' | 'watt'. chill: °C of the cold spot (Newcomen: the
     cylinder itself after the spray; Watt: the separate condenser). */
  function stroke(engine, chill) {
    var watt = engine === 'watt';
    var t = clamp(+chill, CHILL_MIN, CHILL_MAX);
    var back = vapourPressure(t);
    var dp = P_ATM - back;                                   // kPa
    var gross = dp * VOLUME * MECH_EFF;                       // kJ (kPa·m³ = kJ)
    var work = watt ? gross * (1 - AIR_PUMP) : gross;
    var swing = watt ? JACKET_SWING : 100 - t;
    var fillSteam = STEAM_DENSITY * VOLUME;                   // kg
    var wasteSteam = WALL_C * swing / LATENT;                 // kg
    var steam = fillSteam + wasteSteam;
    var coal = steam * H_RAISE / (COAL_ENERGY * BOILER_EFF);  // kg
    return {
      engine: watt ? 'watt' : 'newcomen',
      chill: t,
      backPressure: back,
      pressureDiff: dp,
      forceKN: dp * AREA * MECH_EFF,
      workKJ: work,
      fillSteam: fillSteam,
      wasteSteam: wasteSteam,
      steam: steam,
      wasteShare: wasteSteam / steam,
      coalKg: coal,
      duty: work * 1000 * FTLB_PER_J * BUSHEL_KG / coal / 1e6, // million ft·lb per bushel
      powerKW: work * STROKES_PER_MIN / 60,
      horsepower: work * 1000 * STROKES_PER_MIN / 60 / 745.7
    };
  }

  /* Kilograms of water one stroke lifts from a mine `depth` metres deep. */
  function waterPerStroke(s, depth) { return s.workKJ * 1000 / (G * depth); }

  /* Coal (kg) burned to lift `tonnes` of water from `depth` metres. */
  function coalToLift(s, tonnes, depth) {
    return tonnes * 1000 / waterPerStroke(s, depth) * s.coalKg;
  }

  function coalPerDay(s) { return s.coalKg * STROKES_PER_MIN * 60 * 24; }

  /* The chill temperature that gives a Newcomen engine its best duty. */
  function bestNewcomenChill() {
    var best = CHILL_MIN, top = -1;
    for (var t = CHILL_MIN; t <= CHILL_MAX; t += 0.5) {
      var d = stroke('newcomen', t).duty;
      if (d > top) { top = d; best = t; }
    }
    return { chill: best, duty: top };
  }

  /* Piston and valve state through one cycle, u in [0, 1).
     0–0.42 steam in (piston rises), 0.42–0.52 condense, 0.52–0.92 power stroke, then rest. */
  function phase(u) {
    u = ((u % 1) + 1) % 1;
    function ease(x) { return x * x * (3 - 2 * x); }
    if (u < 0.42) return { name: 'steam', piston: ease(u / 0.42), t: u / 0.42 };
    if (u < 0.52) return { name: 'condense', piston: 1, t: (u - 0.42) / 0.1 };
    if (u < 0.92) return { name: 'power', piston: 1 - ease((u - 0.52) / 0.4), t: (u - 0.52) / 0.4 };
    return { name: 'rest', piston: 0, t: (u - 0.92) / 0.08 };
  }

  /* Cylinder wall temperature (°C) through a cycle. */
  function wallTemp(engine, chill, u) {
    var p = phase(u);
    var low = engine === 'watt' ? 100 - JACKET_SWING : clamp(chill, CHILL_MIN, CHILL_MAX);
    if (p.name === 'steam') return low + (100 - low) * (1 - Math.exp(-5 * p.t));
    if (p.name === 'condense') {
      var start = low + (100 - low) * (1 - Math.exp(-5));
      return start + (low - start) * p.t;
    }
    return low;
  }

  /* Great Britain's coal output, million tonnes, rounded from B. R. Mitchell,
     British Historical Statistics (1988) and E. A. Wrigley, Energy and the English
     Industrial Revolution (2010). Early figures are estimates. */
  var COAL_OUTPUT = [
    [1700, 3], [1750, 5], [1775, 9], [1800, 15], [1815, 22], [1830, 30],
    [1850, 60], [1870, 115], [1890, 185], [1900, 225], [1913, 287]
  ];

  /* Measured duties, million ft·lb per bushel. */
  var HISTORICAL_DUTY = [
    { label: 'Newcomen engines, average (Smeaton, 1769)', duty: 5.6, engine: 'newcomen' },
    { label: "Smeaton's best Newcomen (1772)", duty: 9.5, engine: 'newcomen' },
    { label: 'Early Boulton & Watt engines', duty: 20, engine: 'watt' }
  ];

  var api = {
    P_ATM: P_ATM, LATENT: LATENT, STEAM_DENSITY: STEAM_DENSITY, VOLUME: VOLUME, AREA: AREA,
    BORE: BORE, STROKE: STROKE, WALL_C: WALL_C, STROKES_PER_MIN: STROKES_PER_MIN,
    CHILL_MIN: CHILL_MIN, CHILL_MAX: CHILL_MAX,
    vapourPressure: vapourPressure, stroke: stroke, waterPerStroke: waterPerStroke,
    coalToLift: coalToLift, coalPerDay: coalPerDay, bestNewcomenChill: bestNewcomenChill,
    phase: phase, wallTemp: wallTemp,
    COAL_OUTPUT: COAL_OUTPUT, HISTORICAL_DUTY: HISTORICAL_DUTY
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SteamEngineModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
