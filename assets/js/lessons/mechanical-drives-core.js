/* Mechanical drives: pure, DOM-free model for lessons/engineering/mechanical-and-civil-design/mechanical-drives.html
 *
 * Eighteen drives in four families (gears, belts & chains, screws, friction/direct/fluid). For each one:
 *   DRIVES[i]          plain data: family, motion, efficiency range, backlash, params (the sliders), and what it is good at
 *   compute(id, input) the numbers for one setting: ratio, output speed (rpm or mm/s), output torque (N·m) or force (N),
 *                      efficiency, power in / out / lost as heat, whether it is slipping, and the hold test
 *   holdTest(id, p)    does the load stay put when the motor stops? (screw-thread friction for worms and leadscrews)
 *   recommend(goal, t) the "narrow down the best drive" picker: ranked drives with reasons
 *
 * Screw physics (worm, leadscrew, ball screw, roller screw) uses the square-thread result
 *   lead angle  λ = atan(lead / (π d))      friction angle  ρ = atan(μ)
 *   driving efficiency  η = tan λ / tan(λ + ρ)        it holds (self-locks) when λ ≤ ρ_static
 * ignoring thread-flank angle, which makes real Acme threads a little worse. Belt slip is a teaching model:
 * each friction drive can carry a set torque at its input before it slips, and V / flat belts always creep ~1–2 %.
 * Numbers are classroom-scale (a 0.5–20 N·m motor), not catalogue values.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MechanicalDrives = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TAU = Math.PI * 2;
  const DEG = 180 / Math.PI;

  const FAMILIES = [
    { id: 'gear', label: 'Gear drives', short: 'Gears', note: 'Toothed wheels: positive, compact, precise.' },
    { id: 'flex', label: 'Belt & chain drives', short: 'Belts & chains', note: 'Flexible links between shafts that are far apart.' },
    { id: 'screw', label: 'Linear & screw drives', short: 'Screws', note: 'Turn rotation into a straight push.' },
    { id: 'other', label: 'Friction, direct & fluid drives', short: 'Friction · direct · fluid', note: 'No teeth at all.' }
  ];

  /* Screw-thread efficiency and self-locking. lead and d in the same units. */
  function leadAngle(lead, d) { return Math.atan(lead / (Math.PI * d)); }
  function screwEfficiency(lead, d, mu) {
    const lam = leadAngle(lead, d), rho = Math.atan(mu);
    return Math.tan(lam) / Math.tan(lam + rho);
  }
  /* Back-driving efficiency: how much of the load's push reaches the motor shaft. ≤ 0 means it locks. */
  function backDriveEfficiency(lead, d, muStatic) {
    const lam = leadAngle(lead, d), rho = Math.atan(muStatic);
    if (lam <= rho) return 0;
    return Math.tan(lam - rho) / Math.tan(lam);
  }

  /* Planetary set: which member is held. Returns input→output ratio (negative = output turns the other way). */
  function planetaryRatio(held, sun, ring) {
    if (held === 'ring') return 1 + ring / sun;          // sun in, carrier out
    if (held === 'sun') return 1 + sun / ring;           // ring in, carrier out
    return -ring / sun;                                   // carrier held: sun in, ring out (reversed)
  }

  /* Each param: { key, label, min, max, step, value, unit } or { key, label, type:'choice', options:[[value,label]], value }.
     score: 0–3 for each picker goal and trait. */
  const DRIVES = [
    {
      id: 'spur', family: 'gear', name: 'Spur gears', motion: 'Rotary · parallel shafts', output: 'rotary',
      eff: [0.94, 0.99], backlash: 'Low', slips: false,
      params: [{ key: 'driven', label: 'Teeth on the driven gear (driver has 12)', min: 12, max: 60, step: 1, value: 36, unit: 'teeth' }],
      summary: 'Straight-cut teeth on two parallel shafts. Simple, cheap to make and very efficient, but each tooth hits all at once, so they whine at high speed.',
      seen: 'Hand drills, washing machines, clocks, LEGO and VEX kits, 3D-printed robot gearboxes.',
      watch: 'Noisy at speed. A pair reverses direction; add an idler gear to keep it the same.',
      score: { robot: 2, cnc: 1, vehicle: 2, basics: 3, torque: 2, precision: 2, cost: 3, locking: 0 }
    },
    {
      id: 'helical', family: 'gear', name: 'Helical gears', motion: 'Rotary · parallel (or crossed) shafts', output: 'rotary',
      eff: [0.94, 0.98], backlash: 'Low', slips: false,
      params: [
        { key: 'driven', label: 'Teeth on the driven gear (driver has 12)', min: 12, max: 60, step: 1, value: 36, unit: 'teeth' },
        { key: 'helix', label: 'Helix angle', min: 10, max: 35, step: 1, value: 20, unit: '°' }
      ],
      summary: 'Teeth cut at an angle, so each one slides into mesh gradually and two or three share the load. Smoother, quieter and stronger than spur gears.',
      seen: 'Car gearboxes, industrial speed reducers, printers, anything that must run quietly.',
      watch: 'The angle pushes the gear sideways (axial thrust), so the shaft needs thrust bearings. Steeper angle = more thrust, a little less efficiency.',
      score: { robot: 2, cnc: 1, vehicle: 3, basics: 2, torque: 3, precision: 2, cost: 2, locking: 0 }
    },
    {
      id: 'bevel', family: 'gear', name: 'Bevel gears', motion: 'Rotary · shafts at an angle (usually 90°)', output: 'rotary',
      eff: [0.93, 0.98], backlash: 'Low', slips: false,
      params: [{ key: 'driven', label: 'Teeth on the driven gear (pinion has 15)', min: 15, max: 45, step: 1, value: 30, unit: 'teeth' }],
      summary: 'Cone-shaped gears whose shafts meet at a point, so power turns a corner, most often 90°.',
      seen: 'Hand drills (the chuck key), a car\'s differential, egg beaters, boat drives.',
      watch: 'Both shafts must point exactly at the shared apex or the teeth wear fast.',
      score: { robot: 2, cnc: 1, vehicle: 3, basics: 2, torque: 2, precision: 2, cost: 2, locking: 0 }
    },
    {
      id: 'worm', family: 'gear', name: 'Worm gear', motion: 'Rotary · 90°, not intersecting', output: 'rotary',
      eff: [0.40, 0.85], backlash: 'Low', slips: false,
      params: [
        { key: 'teeth', label: 'Teeth on the worm wheel', min: 20, max: 80, step: 1, value: 40, unit: 'teeth' },
        { key: 'starts', label: 'Thread starts on the worm', type: 'choice', options: [[1, '1 start'], [2, '2 starts'], [4, '4 starts']], value: 1 }
      ],
      summary: 'A screw (the worm) turns a toothed wheel. One turn of a single-start worm moves the wheel by just one tooth, so you get 40:1 in one small stage.',
      seen: 'Guitar tuning pegs, gate openers, winches, lifts, conveyor reducers.',
      watch: 'The worm slides across the teeth instead of rolling, so a lot of power becomes heat. That same friction is why many worms hold a load when the motor stops.',
      worm: { module: 2, diameter: 25, mu: 0.055, muStatic: 0.10 },
      score: { robot: 2, cnc: 1, vehicle: 2, basics: 2, torque: 3, precision: 2, cost: 2, locking: 3 }
    },
    {
      id: 'planetary', family: 'gear', name: 'Planetary (epicyclic) gears', motion: 'Rotary · in line', output: 'rotary',
      eff: [0.90, 0.97], backlash: 'Very low', slips: false,
      params: [
        { key: 'sun', label: 'Teeth on the sun (ring has 72)', min: 12, max: 36, step: 6, value: 18, unit: 'teeth' },
        { key: 'held', label: 'Member held still', type: 'choice', options: [['ring', 'Ring held: sun in, carrier out'], ['sun', 'Sun held: ring in, carrier out'], ['carrier', 'Carrier held: sun in, ring out']], value: 'ring' }
      ],
      ring: 72,
      summary: 'A sun gear in the middle, planet gears orbiting it on a carrier, and a ring with teeth on the inside. Three planets share the load, so a small round box carries big torque, input and output on one line.',
      seen: 'Cordless drills and screwdrivers, robot joints, automatic transmissions, wind turbines, the Mars rover wheels.',
      watch: 'More parts and tighter tolerances than a spur pair. Tooth counts must fit: planets = (ring − sun) / 2, and (ring + sun) must divide by the number of planets.',
      score: { robot: 3, cnc: 2, vehicle: 3, basics: 1, torque: 3, precision: 3, cost: 1, locking: 0 }
    },
    {
      id: 'rack', family: 'gear', name: 'Rack and pinion', motion: 'Rotary → linear', output: 'linear',
      eff: [0.90, 0.97], backlash: 'Low', slips: false,
      params: [{ key: 'pinion', label: 'Teeth on the pinion (2 mm module)', min: 10, max: 30, step: 1, value: 16, unit: 'teeth' }],
      rackModule: 2,
      summary: 'A round gear (the pinion) rolls along a straight toothed bar (the rack). Each turn moves the rack one pinion circumference.',
      seen: 'Car steering, sliding gates, funicular railways, big CNC router gantries, the focus knob on a microscope.',
      watch: 'Long travel is cheap (just add rack), but it has some backlash and does not hold position by itself.',
      score: { robot: 2, cnc: 2, vehicle: 2, basics: 3, torque: 1, precision: 1, cost: 3, locking: 0 }
    },
    {
      id: 'harmonic', family: 'gear', name: 'Harmonic (strain-wave) drive', motion: 'Rotary · in line', output: 'rotary',
      eff: [0.60, 0.90], backlash: 'Near zero', slips: false,
      params: [{ key: 'flex', label: 'Teeth on the flexspline (circular spline has 2 more)', min: 60, max: 320, step: 2, value: 200, unit: 'teeth' }],
      summary: 'An oval wave generator bends a thin steel cup (the flexspline) so its teeth mesh with a rigid ring at two places. The ring has two more teeth, so each turn of the oval walks the cup back two teeth: 200 teeth gives 100:1.',
      seen: 'Robot arm joints, humanoid robots, satellite antennas, the Apollo lunar rover wheels.',
      watch: 'Expensive and a little springy (it twists under load). Not for shock loads.',
      score: { robot: 3, cnc: 2, vehicle: 0, basics: 1, torque: 2, precision: 3, cost: 0, locking: 0 }
    },
    {
      id: 'cycloidal', family: 'gear', name: 'Cycloidal drive', motion: 'Rotary · in line', output: 'rotary',
      eff: [0.85, 0.93], backlash: 'Very low', slips: false,
      params: [{ key: 'lobes', label: 'Lobes on the disc (pins = lobes + 1)', min: 9, max: 39, step: 1, value: 15, unit: 'lobes' }],
      summary: 'An eccentric cam wobbles a lobed disc around a ring of pins. The disc has one lobe fewer than there are pins, so each wobble rolls it back by one lobe: 15 lobes gives 15:1, reversed.',
      seen: 'Industrial robot bases, excavator swing drives, heavy conveyors, many 3D-printable robot actuators.',
      watch: 'The wobble has to be balanced (two discs 180° apart) or it shakes. Many lobes in contact makes it tough against shock.',
      score: { robot: 3, cnc: 1, vehicle: 1, basics: 1, torque: 3, precision: 3, cost: 1, locking: 0 }
    },

    {
      id: 'vbelt', family: 'flex', name: 'V-belt', motion: 'Rotary · shafts far apart', output: 'rotary',
      eff: [0.92, 0.97], backlash: 'Slips under overload', slips: true, creep: 0.02,
      params: [
        { key: 'd2', label: 'Driven pulley diameter (driver is 80 mm)', min: 80, max: 320, step: 10, value: 200, unit: 'mm' },
        { key: 'tension', label: 'Belt tension', type: 'choice', options: [[6, 'Loose'], [12, 'Correct'], [18, 'Tight']], value: 12 }
      ],
      d1: 80,
      summary: 'A belt with a trapezoid cross-section wedges into a grooved pulley. The wedge multiplies the grip, and if the load jams, the belt slips instead of breaking the motor.',
      seen: 'Drill presses, lawnmowers, car engine accessories, air compressors, go-kart CVTs.',
      watch: 'It always creeps a percent or two, so the shafts never stay exactly in step. Belts stretch and need re-tensioning.',
      score: { robot: 0, cnc: 0, vehicle: 3, basics: 2, torque: 2, precision: 0, cost: 3, locking: 0 }
    },
    {
      id: 'timing', family: 'flex', name: 'Timing (synchronous) belt', motion: 'Rotary · shafts far apart, in step', output: 'rotary',
      eff: [0.95, 0.98], backlash: 'Zero slip', slips: false,
      params: [{ key: 't2', label: 'Teeth on the driven pulley (driver has 20)', min: 16, max: 60, step: 1, value: 40, unit: 'teeth' }],
      t1: 20,
      summary: 'A belt with teeth that mesh with notched pulleys, like a gear you can stretch across a gap. It cannot slip, so the two shafts stay exactly in step.',
      seen: '3D printer X and Y axes (GT2 belts), laser cutters, car engine cams, sewing machines.',
      watch: 'Overload makes it jump a tooth, which throws everything out of step. Needs correct tension and enough teeth wrapped on the small pulley.',
      score: { robot: 2, cnc: 3, vehicle: 1, basics: 2, torque: 1, precision: 2, cost: 2, locking: 0 }
    },
    {
      id: 'flat', family: 'flex', name: 'Flat belt', motion: 'Rotary · shafts far apart', output: 'rotary',
      eff: [0.95, 0.98], backlash: 'Slips under overload', slips: true, creep: 0.015,
      params: [
        { key: 'd2', label: 'Driven pulley diameter (driver is 80 mm)', min: 80, max: 320, step: 10, value: 160, unit: 'mm' },
        { key: 'tension', label: 'Belt tension', type: 'choice', options: [[2, 'Loose'], [4, 'Correct'], [7, 'Tight']], value: 4 }
      ],
      d1: 80,
      summary: 'A smooth flat belt on slightly domed (crowned) pulleys. The crown makes the belt climb to the middle and stay on. Light, fast and quiet.',
      seen: 'Conveyors at the grocery checkout, treadmills, vacuum cleaner brush rolls, old factory line shafts.',
      watch: 'Grip comes only from friction, so it carries little torque for its size. Good for high speed, low torque.',
      score: { robot: 0, cnc: 0, vehicle: 1, basics: 2, torque: 0, precision: 0, cost: 3, locking: 0 }
    },
    {
      id: 'chain', family: 'flex', name: 'Roller chain', motion: 'Rotary · shafts far apart', output: 'rotary',
      eff: [0.95, 0.98], backlash: 'Zero slip', slips: false,
      params: [{ key: 't2', label: 'Teeth on the driven sprocket (driver has 11)', min: 11, max: 52, step: 1, value: 33, unit: 'teeth' }],
      t1: 11,
      summary: 'Steel links with rollers that drop into sprocket teeth. Strong, cannot slip, and works over long distances, a bit loose and rattly.',
      seen: 'Bicycles, motorcycles, go-karts, forklifts, escalators, heavy conveyors.',
      watch: 'Needs oil and a little slack. On small sprockets the chain rises and falls as it wraps (chordal action), which makes it pulse.',
      score: { robot: 1, cnc: 0, vehicle: 3, basics: 3, torque: 3, precision: 1, cost: 3, locking: 0 }
    },

    {
      id: 'leadscrew', family: 'screw', name: 'Leadscrew', motion: 'Rotary → linear', output: 'linear',
      eff: [0.15, 0.70], backlash: 'Moderate', slips: false,
      params: [{ key: 'lead', label: 'Lead (travel per turn), 10 mm screw', min: 1, max: 12, step: 1, value: 2, unit: 'mm' }],
      screw: { diameter: 10, mu: 0.15, muStatic: 0.20 },
      summary: 'A threaded rod turning inside a plain nut. The thread slides, so it is cheap and quiet, and a fine thread is often self-locking: it holds the load when the power goes off.',
      seen: 'Vises, car jacks, 3D printer Z axes, C-clamps, the bench drill table lift.',
      watch: 'Sliding friction wastes most of the power on fine threads, and the plain nut wears and develops backlash. Anti-backlash nuts help.',
      score: { robot: 1, cnc: 2, vehicle: 2, basics: 3, torque: 2, precision: 1, cost: 3, locking: 3 }
    },
    {
      id: 'ballscrew', family: 'screw', name: 'Ball screw', motion: 'Rotary → linear', output: 'linear',
      eff: [0.85, 0.99], backlash: 'Minimal (preloaded)', slips: false,
      params: [{ key: 'lead', label: 'Lead (travel per turn), 16 mm screw', min: 2, max: 20, step: 1, value: 5, unit: 'mm' }],
      screw: { diameter: 16, mu: 0.005, muStatic: 0.006 },
      summary: 'Steel balls roll between the screw and the nut, then a return tube sends them back to the start. Rolling instead of sliding means 90 % efficiency and precise, repeatable motion.',
      seen: 'CNC mill axes, aircraft flap actuators, electric power steering, injection moulding machines.',
      watch: 'So efficient it never self-locks: a vertical axis falls when the power goes off, so it needs a brake. Dirt ruins it, so it is covered.',
      score: { robot: 1, cnc: 3, vehicle: 0, basics: 1, torque: 2, precision: 3, cost: 1, locking: 0 }
    },
    {
      id: 'rollerscrew', family: 'screw', name: 'Planetary roller screw', motion: 'Rotary → linear', output: 'linear',
      eff: [0.70, 0.96], backlash: 'Minimal', slips: false,
      params: [{ key: 'lead', label: 'Lead (travel per turn), 30 mm screw', min: 2, max: 20, step: 1, value: 6, unit: 'mm' }],
      screw: { diameter: 30, mu: 0.009, muStatic: 0.011 },
      summary: 'Threaded rollers orbit the screw inside the nut like planets, touching it along lines instead of at points. Many more contacts than a ball screw, so it carries far bigger loads and lasts longer.',
      seen: 'Electric press brakes, rocket engine steering (thrust vector control), heavy industrial actuators, flight simulator motion bases.',
      watch: 'Expensive and made only by specialists. Like a ball screw it back-drives, so it needs a brake for vertical loads.',
      score: { robot: 1, cnc: 3, vehicle: 2, basics: 0, torque: 3, precision: 3, cost: 0, locking: 0 }
    },

    {
      id: 'direct', family: 'other', name: 'Direct drive', motion: 'Rotary · 1:1', output: 'rotary',
      eff: [0.97, 0.99], backlash: 'None', slips: false,
      params: [],
      summary: 'The motor shaft is coupled straight to the load: no gears, no belts. Nothing to wear, no backlash, nothing to slip.',
      seen: 'Turntables, washing machine drums, ceiling fans, hub motors in e-bikes and scooters, gimbals.',
      watch: 'The motor must make all of the torque at the load\'s own speed, so it ends up big, heavy and expensive.',
      score: { robot: 2, cnc: 2, vehicle: 1, basics: 3, torque: 0, precision: 3, cost: 1, locking: 0 }
    },
    {
      id: 'traction', family: 'other', name: 'Friction / traction drive (cone CVT)', motion: 'Rotary · stepless ratio', output: 'rotary',
      eff: [0.85, 0.94], backlash: 'Slips under overload', slips: true, creep: 0.01,
      params: [
        { key: 'pos', label: 'Ring position along the cones', min: 0, max: 100, step: 1, value: 50, unit: '%' },
        { key: 'tension', label: 'Clamping force', type: 'choice', options: [[4, 'Light'], [9, 'Firm'], [15, 'Hard']], value: 9 }
      ],
      cone: { rSmall: 20, rBig: 60 },
      summary: 'Smooth wheels pressed hard together pass power by friction. Slide the contact point and the ratio changes smoothly with no steps: a continuously variable transmission.',
      seen: 'Evans friction-cone countershafts (early 1900s workshops), Nissan and Torotrak toroidal CVTs, record turntables, some e-bike hubs.',
      watch: 'Grip is limited by clamping force × friction, so it slips if overloaded, and the huge clamp loads the bearings. Real traction drives use special oil that turns glassy under pressure.',
      score: { robot: 0, cnc: 0, vehicle: 2, basics: 2, torque: 0, precision: 0, cost: 2, locking: 0 }
    },
    {
      id: 'hydraulic', family: 'other', name: 'Hydraulic drive (pump + cylinder)', motion: 'Rotary → linear, by pressure', output: 'linear',
      eff: [0.60, 0.85], backlash: 'Very stiff (oil barely compresses)', slips: false,
      params: [{ key: 'area', label: 'Cylinder piston area (pump moves 2 cm³ per turn)', min: 5, max: 100, step: 5, value: 20, unit: 'cm²' }],
      pump: { disp: 2, eff: 0.75 },
      summary: 'A pump pushes oil down a hose into a cylinder. Pressure is the same everywhere in the oil, so a big piston gets a huge force (Pascal\'s law). Air does the same job in pneumatics, softer and springier.',
      seen: 'Excavators, car brakes, garbage trucks, aircraft landing gear, factory presses; pneumatics in grippers, bus doors and dentists\' drills.',
      watch: 'Leaks, heat, pumps and hoses. But it can sit anywhere the hose reaches and, with no sparks, works where electric motors are unsafe.',
      score: { robot: 1, cnc: 0, vehicle: 3, basics: 1, torque: 3, precision: 1, cost: 0, locking: 2 }
    }
  ];

  const BY_ID = Object.fromEntries(DRIVES.map((d) => [d.id, d]));
  function get(id) { const d = BY_ID[id]; if (!d) throw new Error('Unknown drive ' + id); return d; }

  function defaults(id) {
    const out = {};
    for (const p of get(id).params) out[p.key] = p.value;
    return out;
  }

  /* Ratio (input revolutions per output revolution, or for linear drives mm per input turn) and efficiency. */
  function geometry(id, p) {
    const d = get(id);
    const q = Object.assign(defaults(id), p || {});
    switch (id) {
      case 'spur': return { ratio: q.driven / 12, reverse: true, eff: 0.98 };
      case 'helical': {
        // a little extra sliding (and thrust-bearing loss) as the helix gets steeper
        const eff = 0.985 - 0.0006 * q.helix;
        return { ratio: q.driven / 12, reverse: true, eff, thrust: Math.tan(q.helix / DEG) };
      }
      case 'bevel': return { ratio: q.driven / 15, reverse: false, turn90: true, eff: 0.96 };
      case 'worm': {
        const w = d.worm, lead = Math.PI * w.module * q.starts;
        return {
          ratio: q.teeth / q.starts, reverse: false, turn90: true,
          eff: screwEfficiency(lead, w.diameter, w.mu),
          leadAngle: leadAngle(lead, w.diameter) * DEG, frictionAngle: Math.atan(w.muStatic) * DEG,
          backEff: backDriveEfficiency(lead, w.diameter, w.muStatic)
        };
      }
      case 'planetary': {
        const r = planetaryRatio(q.held, q.sun, d.ring);
        const eff = q.held === 'carrier' ? 0.95 : q.held === 'sun' ? 0.965 : 0.97;
        return { ratio: Math.abs(r), reverse: r < 0, eff, planet: (d.ring - q.sun) / 2 };
      }
      case 'rack': {
        const pitchDia = d.rackModule * q.pinion;            // mm
        return { travel: Math.PI * pitchDia, pitchDia, eff: 0.95 };
      }
      case 'harmonic': return { ratio: q.flex / 2, reverse: true, eff: 0.80 - 0.0004 * (q.flex - 100) };
      case 'cycloidal': return { ratio: q.lobes, reverse: true, eff: 0.92 - 0.001 * q.lobes };
      case 'vbelt': return { ratio: q.d2 / d.d1, reverse: false, eff: 0.95, capacity: q.tension };
      case 'flat': return { ratio: q.d2 / d.d1, reverse: false, eff: 0.97, capacity: q.tension };
      case 'timing': return { ratio: q.t2 / d.t1, reverse: false, eff: 0.97, capacity: 14 };
      case 'chain': return { ratio: q.t2 / d.t1, reverse: false, eff: 0.97 };
      case 'leadscrew': case 'ballscrew': case 'rollerscrew': {
        const s = d.screw;
        return {
          travel: q.lead, eff: screwEfficiency(q.lead, s.diameter, s.mu),
          leadAngle: leadAngle(q.lead, s.diameter) * DEG, frictionAngle: Math.atan(s.muStatic) * DEG,
          backEff: backDriveEfficiency(q.lead, s.diameter, s.muStatic)
        };
      }
      case 'direct': return { ratio: 1, reverse: false, eff: 0.99 };
      case 'traction': {
        // Evans cones: ring at position x touches the driving cone at r1 and the opposed driven cone at r2
        const c = d.cone, f = q.pos / 100;
        const r1 = c.rSmall + (c.rBig - c.rSmall) * f, r2 = c.rBig - (c.rBig - c.rSmall) * f;
        return { ratio: r2 / r1, reverse: true, eff: 0.90, capacity: q.tension, r1, r2 };
      }
      case 'hydraulic': return { area: q.area, eff: d.pump.eff, disp: d.pump.disp };
      default: throw new Error('No geometry for ' + id);
    }
  }

  /* Hold test: motor stops with a load on the output. */
  function holdTest(id, p) {
    const d = get(id), g = geometry(id, p);
    if (g.backEff !== undefined) {
      const holds = g.backEff <= 0;
      return {
        holds,
        why: holds
          ? `Lead angle ${g.leadAngle.toFixed(1)}° is smaller than the friction angle ${g.frictionAngle.toFixed(1)}°, so the load cannot push the thread round. It locks.`
          : `Lead angle ${g.leadAngle.toFixed(1)}° is bigger than the friction angle ${g.frictionAngle.toFixed(1)}°, so the load spins the ${id === 'worm' ? 'worm' : 'screw'} backwards and drops. It needs a brake.`
      };
    }
    if (id === 'hydraulic') return { holds: true, why: 'A closed check valve traps the oil, and oil barely compresses, so the cylinder holds (until seals leak, so real machines add a lock valve).' };
    if (id === 'cycloidal') return { holds: false, why: 'Hard to back-drive (the lobes push almost straight at the pins), but not self-locking. Robot arms still use a brake.' };
    if (id === 'harmonic') return { holds: false, why: 'It back-drives with some effort. Robots add a brake on the motor.' };
    return { holds: false, why: d.output === 'linear' ? 'Nothing stops the load pushing the pinion round. It runs back.' : 'Rolling teeth and belts pass torque both ways, so the load turns the motor backwards.' };
  }

  /* One setting. input: { rpm, torque } at the motor (rpm, N·m). */
  function compute(id, params, input) {
    const d = get(id), g = geometry(id, params);
    const rpm = Math.max(0, input && input.rpm != null ? input.rpm : 1200);
    const torque = Math.max(0, input && input.torque != null ? input.torque : 2);
    const omega = rpm * TAU / 60;
    const powerIn = torque * omega;
    let eff = g.eff, slipping = false, slip = 0;
    const out = { id, name: d.name, output: d.output, geometry: g };

    if (d.slips) {
      slip = d.creep || 0;
      if (torque > g.capacity) { slipping = true; slip = Math.min(0.95, slip + (1 - g.capacity / torque) * 0.9); }
      // torque that actually crosses the belt is capped by its grip
      const carried = Math.min(torque, g.capacity);
      eff = g.eff * (1 - slip) * (carried / torque || 1);
    }

    if (d.output === 'rotary') {
      out.ratio = g.ratio;
      out.reverse = !!g.reverse;
      out.outRpm = rpm / g.ratio * (1 - slip);
      const carried = d.slips ? Math.min(torque, g.capacity) : torque;
      out.outTorque = carried * g.ratio * g.eff;
    } else if (id === 'hydraulic') {
      const flow = g.disp * rpm / 60;                          // cm³/s
      const pressure = TAU * torque * g.eff / (g.disp * 1e-6); // Pa
      out.pressureBar = pressure / 1e5;
      out.speed = flow / g.area * 10;                          // mm/s  (cm/s × 10)
      out.force = pressure * g.area * 1e-4;                    // N
      out.travel = g.disp / g.area * 10;                       // mm per pump turn
    } else {
      out.travel = g.travel;                                   // mm per input turn
      out.speed = rpm / 60 * g.travel;                         // mm/s
      out.force = TAU * torque * eff / (g.travel / 1000);      // N
    }

    out.eff = eff;
    out.slipping = slipping;
    out.slip = slip;
    out.powerIn = powerIn;
    out.powerOut = powerIn * eff;
    out.heat = powerIn - out.powerOut;
    out.hold = holdTest(id, params);
    return out;
  }

  /* The "narrow down the best drive" picker. */
  const GOALS = [
    ['robot', 'A robotics or 3D-printed mechanism'],
    ['cnc', 'A CNC, linear actuator or sliding track'],
    ['vehicle', 'A vehicle, kart or heavy-load lift'],
    ['basics', 'Just learning mechanical engineering basics']
  ];
  const TRAITS = [
    ['torque', 'High torque / lifting power'],
    ['precision', 'High precision / low backlash'],
    ['cost', 'Low cost & easy to build'],
    ['locking', 'Self-locking (holds position unpowered)']
  ];
  const TRAIT_WORDS = { torque: 'torque', precision: 'precision', cost: 'low cost', locking: 'holding' };
  const GOAL_WORDS = { robot: 'robots', cnc: 'CNC and linear motion', vehicle: 'vehicles and lifts', basics: 'learning the basics' };

  function recommend(goal, trait, count) {
    if (!GOAL_WORDS[goal]) throw new Error('Unknown goal ' + goal);
    if (!TRAIT_WORDS[trait]) throw new Error('Unknown trait ' + trait);
    const n = count || 3;
    const ranked = DRIVES.map((d) => {
      const s = d.score;
      // the trait you said matters most counts most; the goal decides among the drives that have it
      const total = s[trait] * 1.5 + s[goal];
      return { id: d.id, name: d.name, total, d };
    })
      .filter((r) => r.d.score[trait] >= 1 && r.d.score[goal] >= 1)
      .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
    return ranked.slice(0, n).map((r) => {
      const s = r.d.score;
      const strengths = Object.keys(TRAIT_WORDS).filter((k) => s[k] >= 3 && k !== trait).map((k) => TRAIT_WORDS[k]);
      const bits = [`${['weak', 'some', 'good', 'excellent'][s[trait]]} ${TRAIT_WORDS[trait]}`, `${['poor', 'an OK', 'a good', 'a great'][s[goal]]} fit for ${GOAL_WORDS[goal]}`];
      if (strengths.length) bits.push('also strong on ' + strengths.join(' and '));
      return { id: r.id, name: r.name, score: Math.round(r.total * 10) / 10, reason: bits.join('; ') + '.', watch: r.d.watch };
    });
  }

  return {
    TAU, FAMILIES, DRIVES, GOALS, TRAITS, get, defaults,
    leadAngle, screwEfficiency, backDriveEfficiency, planetaryRatio,
    geometry, compute, holdTest, recommend
  };
});
