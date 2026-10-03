/*
 * Multimeter Lab — a virtual digital multimeter on a small series circuit.
 *
 * The meter is not faked per scenario: every reading comes from a nodal
 * analysis of the circuit with the meter itself inserted as an element
 * between the red and black probes. That is what makes the classic mistakes
 * behave like real life:
 *   • volts mode  → 10 MΩ input, barely disturbs the circuit
 *   • amps modes  → a ~2 Ω (mA) or 0.02 Ω (10 A) shunt, i.e. nearly a wire,
 *                   so placing it across a battery is a short and blows the fuse
 *   • ohms modes  → the meter's own small test source, so a live circuit adds
 *                   to it and corrupts the reading
 *   • red lead in the 10 A jack shorts the probes whatever the dial says
 */
(function () {
  'use strict';

  var bench = document.getElementById('mm-bench');
  if (!bench) return;

  // ── Constants ────────────────────────────────────────────────────────────
  var BATTERY_EMF = 6.0;       // 4 × AA
  var BATTERY_R = 0.8;         // internal resistance, Ω
  // Red LED as a Shockley diode: ~2.0 V at 18 mA, ~1.85 V at 1 mA, ~1.5 V at 1 µA.
  var LED_NVT = 2 * 0.02585;   // emission coefficient × thermal voltage, V
  var LED_IS = 0.018 / Math.exp(2.0 / LED_NVT);
  var LED_VCRIT = LED_NVT * Math.log(LED_NVT / (Math.SQRT2 * LED_IS));
  var GMIN = 1e-12;
  var R_LED = 218.6;           // a "220 Ω ±5 %" resistor, as actually measured
  var R_FIXED = 9930;          // a "10 kΩ ±1 %" resistor
  var METER_RIN = 10e6;        // volts-mode input resistance
  var SHUNT_MA = 2.0;          // mA-jack burden resistance
  var SHUNT_A = 0.02;          // 10 A-jack shunt
  var FUSE_MA = 0.4;           // A
  var FUSE_A = 10;             // A
  var OHM_VS = 0.5, OHM_RS = 1000;      // ohmmeter test source (too low to light an LED)
  var DIODE_VS = 3.0, DIODE_RS = 2000;  // diode-test source (~1 mA)
  var LEAK = 1e-12;            // tiny leak to ground so floating nodes solve to 0 V

  // Node indices. 0 = G (battery −), the reference.
  var G = 0, B = 1, S = 2, J = 3, N = 4, K = 5, NODE_COUNT = 6;
  var NODE_NAMES = ['G', 'B', 'S', 'J', 'N', 'K'];

  var CIRCUITS = {
    led: {
      title: 'LED loop',
      load: 'led',
      points: {
        B: 'battery + terminal', S: 'switch output', J: 'top of the resistor',
        N: 'between resistor and LED', K: 'LED cathode (−)', G: 'battery − terminal'
      }
    },
    divider: {
      title: 'Light-sensor divider',
      load: 'ldr',
      points: {
        B: 'battery + terminal', S: 'switch output', J: 'top of the 10 kΩ resistor',
        N: 'divider output (to an Arduino A0)', K: 'bottom of the photoresistor', G: 'battery − terminal'
      }
    },
    mystery: {
      title: 'Mystery: dead LED',
      load: 'led',
      points: {
        B: 'battery + terminal', S: 'switch output', J: 'top of the resistor',
        N: 'between resistor and LED', K: 'LED cathode (−)', G: 'battery − terminal'
      }
    }
  };

  var FAULTS = {
    wire: {
      label: 'A jumper wire is broken inside its insulation',
      explain: 'Volts across the blue jumper (S to J) read most of the battery voltage, where a good wire reads about 0 V. With power off, its ohms read OL. In a series loop, a break gets nearly all the supply voltage across it, because almost no current flows to drop voltage anywhere else.'
    },
    reversed: {
      label: 'The LED is in backwards',
      explain: 'The whole battery voltage appears across the LED (N to K). Diode test reads OL with red on N and black on K, but about 1.85 V the other way round. A diode only conducts in one direction.'
    },
    resistor: {
      label: 'Wrong resistor: 220 kΩ instead of 220 Ω',
      explain: 'Most of the voltage is across the resistor and the current is only microamps. With power off, ohms across J to N read about 220 kΩ. Red-red-yellow and red-red-brown look alike in poor light.'
    },
    battery: {
      label: 'The batteries are dead',
      explain: 'B to G reads only about 1.6 V. A red LED needs nearly 2 V to light, so almost no current flows. Always check the supply first; it takes five seconds.'
    }
  };

  var MODES = {
    off:  { label: 'OFF' },
    vdc:  { label: 'V⎓', unit: 'V', name: 'DC volts' },
    vac:  { label: 'V~', unit: 'V', name: 'AC volts' },
    ohm:  { label: 'Ω', unit: 'Ω', name: 'resistance' },
    cont: { label: '·)))', unit: 'Ω', name: 'continuity' },
    diode:{ label: '▶|', unit: 'V', name: 'diode test' },
    ma:   { label: 'mA', unit: 'A', name: 'milliamps' },
    a:    { label: '10A', unit: 'A', name: 'amps' }
  };

  var state = {
    circuit: 'led',
    mode: 'vdc',
    jack: 'vom',          // 'vom' (V Ω mA) or 'a10'
    red: null,
    black: null,
    placing: 'red',
    power: true,
    jumperIn: true,
    light: 70,
    fuseMa: true,
    fuseA: true,
    fault: null,
    diagnosed: false,
    done: {}
  };

  // ── Circuit solver ───────────────────────────────────────────────────────
  function ldrOhms(light) {
    // 100 kΩ in the dark down to 1 kΩ in bright light, on a log scale.
    return 100000 * Math.pow(0.01, light / 100);
  }

  function buildElements() {
    var circuit = CIRCUITS[state.circuit];
    var f = state.circuit === 'mystery' ? state.fault : null;
    var els = [];
    els.push({ kind: 'battery', n: G, p: B, emf: f === 'battery' ? 1.6 : BATTERY_EMF, r: BATTERY_R });
    els.push({ kind: 'r', a: B, b: S, r: state.power ? 0.05 : Infinity, name: 'switch' });
    els.push({ kind: 'r', a: S, b: J, r: state.jumperIn && f !== 'wire' ? 0.02 : Infinity, name: 'jumper' });
    if (circuit.load === 'led') {
      els.push({ kind: 'r', a: J, b: N, r: f === 'resistor' ? 219600 : R_LED, name: 'resistor' });
      els.push(f === 'reversed'
        ? { kind: 'diode', a: K, k: N, name: 'led' }
        : { kind: 'diode', a: N, k: K, name: 'led' });
    } else {
      els.push({ kind: 'r', a: J, b: N, r: R_FIXED, name: 'resistor' });
      els.push({ kind: 'r', a: N, b: K, r: ldrOhms(state.light), name: 'ldr' });
    }
    els.push({ kind: 'r', a: K, b: G, r: 0.02, name: 'ground wire' });
    return els;
  }

  // Meter as a circuit element between red and black, or null if a probe is unplaced.
  function meterElement() {
    if (state.red === null || state.black === null) return null;
    var r = state.red, c = state.black;
    if (state.jack === 'a10') {
      // The 10 A jack is wired straight through its shunt to COM, whatever the dial says.
      return { kind: 'r', a: r, b: c, r: state.fuseA ? SHUNT_A : Infinity, meter: 'shuntA' };
    }
    switch (state.mode) {
      case 'ma': return { kind: 'r', a: r, b: c, r: state.fuseMa ? SHUNT_MA : Infinity, meter: 'shuntMa' };
      case 'ohm': case 'cont': return { kind: 'source', p: r, n: c, emf: OHM_VS, r: OHM_RS, meter: 'ohm' };
      case 'diode': return { kind: 'source', p: r, n: c, emf: DIODE_VS, r: DIODE_RS, meter: 'diode' };
      default: return { kind: 'r', a: r, b: c, r: METER_RIN, meter: 'volts' };
    }
  }

  function solveLinear(A, z) {
    var n = z.length, i, j, k;
    for (i = 0; i < n; i++) {
      var max = i;
      for (k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[max][i])) max = k;
      var tmp = A[i]; A[i] = A[max]; A[max] = tmp;
      var t = z[i]; z[i] = z[max]; z[max] = t;
      if (Math.abs(A[i][i]) < 1e-300) continue;
      for (k = i + 1; k < n; k++) {
        var f = A[k][i] / A[i][i];
        if (!f) continue;
        for (j = i; j < n; j++) A[k][j] -= f * A[i][j];
        z[k] -= f * z[i];
      }
    }
    var x = new Array(n).fill(0);
    for (i = n - 1; i >= 0; i--) {
      var s = z[i];
      for (j = i + 1; j < n; j++) s -= A[i][j] * x[j];
      x[i] = Math.abs(A[i][i]) < 1e-300 ? 0 : s / A[i][i];
    }
    return x;
  }

  function diodeCurrent(vd) { return LED_IS * (Math.exp(Math.min(vd, 4) / LED_NVT) - 1); }

  // SPICE-style junction voltage limiting keeps Newton's method from overshooting the exponential.
  function limitJunction(vnew, vold) {
    if (vnew > LED_VCRIT && Math.abs(vnew - vold) > 2 * LED_NVT) {
      if (vold > 0) {
        var arg = 1 + (vnew - vold) / LED_NVT;
        return arg > 0 ? vold + LED_NVT * Math.log(arg) : LED_VCRIT;
      }
      return LED_NVT * Math.log(vnew / LED_NVT);
    }
    return vnew;
  }

  // Nodal analysis, Newton–Raphson on the diodes. Returns node voltages and element currents.
  function solve(els) {
    var diodes = els.filter(function (e) { return e.kind === 'diode'; });
    diodes.forEach(function (d) { d.vd = 0.6; });
    var v;
    for (var iter = 0; iter < 300; iter++) {
      var m = NODE_COUNT - 1;
      var A = [], z = [];
      for (var i = 0; i < m; i++) { A.push(new Array(m).fill(0)); z.push(0); A[i][i] += LEAK; }
      var stamp = function (a, b, g) {
        if (a) A[a - 1][a - 1] += g;
        if (b) A[b - 1][b - 1] += g;
        if (a && b) { A[a - 1][b - 1] -= g; A[b - 1][a - 1] -= g; }
      };
      var inject = function (node, amps) { if (node) z[node - 1] += amps; };
      els.forEach(function (e) {
        if (e.kind === 'r') {
          if (isFinite(e.r)) stamp(e.a, e.b, 1 / e.r);
        } else if (e.kind === 'battery' || e.kind === 'source') {
          stamp(e.p, e.n, 1 / e.r);
          inject(e.p, e.emf / e.r);
          inject(e.n, -e.emf / e.r);
        } else if (e.kind === 'diode') {
          // Linearized companion model at the current guess e.vd.
          var id = diodeCurrent(e.vd);
          var g = LED_IS * Math.exp(Math.min(e.vd, 4) / LED_NVT) / LED_NVT;
          var ieq = id - g * e.vd;
          stamp(e.a, e.k, g + GMIN);
          inject(e.a, -ieq);
          inject(e.k, ieq);
        }
      });
      var x = solveLinear(A, z);
      v = [0].concat(x);
      var converged = true;
      diodes.forEach(function (d) {
        var next = limitJunction(v[d.a] - v[d.k], d.vd);
        if (Math.abs(next - d.vd) > 1e-9) converged = false;
        d.vd = next;
      });
      if (converged) break;
    }
    function current(e) {
      if (e.kind === 'r') return isFinite(e.r) ? (v[e.a] - v[e.b]) / e.r : 0;
      if (e.kind === 'diode') return diodeCurrent(v[e.a] - v[e.k]) + GMIN * (v[e.a] - v[e.k]);
      if (e.kind === 'battery' || e.kind === 'source') return (e.emf - (v[e.p] - v[e.n])) / e.r; // out of +
      return 0;
    }
    return { v: v, current: current };
  }

  // ── Reading ──────────────────────────────────────────────────────────────
  function evaluate(events) {
    events = events || [];
    var els = buildElements();
    var meter = meterElement();
    var bare = solve(els);
    var withMeter = meter ? solve(els.concat([meter])) : bare;
    var led = els.filter(function (e) { return e.kind === 'diode'; })[0];
    var ledCurrent = led ? Math.max(0, withMeter.current(led)) : 0;
    var battery = els[0];
    var batteryCurrent = withMeter.current(battery);
    var res = {
      v: withMeter.v, bare: bare.v, ledCurrent: ledCurrent, batteryCurrent: batteryCurrent,
      meter: meter, display: '', unit: '', flags: [], beep: false, numeric: null, events: events
    };

    // Fuses blow on the meter current.
    if (meter && (meter.meter === 'shuntMa' || meter.meter === 'shuntA')) {
      var im = Math.abs(withMeter.current(meter));
      if (meter.meter === 'shuntMa' && im > FUSE_MA) { state.fuseMa = false; return evaluate(events.concat('fuseMa')); }
      if (meter.meter === 'shuntA' && im > FUSE_A) { state.fuseA = false; return evaluate(events.concat('fuseA')); }
    }

    if (state.mode === 'off') { res.off = true; return res; }
    var probesOn = state.red !== null && state.black !== null;
    var vr = probesOn ? withMeter.v[state.red] - withMeter.v[state.black] : 0;
    var liveBare = probesOn ? bare.v[state.red] - bare.v[state.black] : 0;
    res.live = Math.abs(liveBare) > 0.02;

    var mode = state.mode;
    var wrongJack = (mode === 'a' && state.jack !== 'a10') || (mode !== 'a' && mode !== 'off' && state.jack === 'a10');
    res.wrongJack = wrongJack;
    if (wrongJack) {
      // VΩ input is unplugged (red is in the 10 A jack) or the 10 A input is unplugged.
      res.display = mode === 'a' || mode === 'ma' ? '0.000' : (mode === 'ohm' || mode === 'cont' || mode === 'diode' ? 'OL' : '0.00');
      res.unit = mode === 'a' ? 'A' : mode === 'ma' ? 'mA' : MODES[mode].unit;
      res.numeric = 0;
      if (meter && meter.meter === 'shuntA') res.shortAmps = Math.abs(withMeter.current(meter));
      return res;
    }

    if (mode === 'vdc') {
      fmtVolts(res, probesOn ? vr : 0);
    } else if (mode === 'vac') {
      res.display = '0.00'; res.unit = 'V'; res.numeric = 0; res.flags.push('AC');
    } else if (mode === 'ma' || mode === 'a') {
      var amps = meter && isFinite(meter.r) ? (withMeter.v[meter.a] - withMeter.v[meter.b]) / meter.r : 0;
      res.numeric = amps;
      if (mode === 'ma') {
        var ma = amps * 1000;
        res.display = Math.abs(ma) >= 100 ? ma.toFixed(1) : Math.abs(ma) >= 10 ? ma.toFixed(2) : ma.toFixed(3);
        res.unit = 'mA';
      } else {
        res.display = amps.toFixed(3); res.unit = 'A';
      }
      if (!probesOn) { res.display = mode === 'ma' ? '0.000' : '0.000'; res.numeric = 0; }
      res.flags.push('DC');
    } else if (mode === 'ohm' || mode === 'cont') {
      if (!probesOn) { res.display = 'OL'; res.unit = autoOhmUnit(Infinity); res.numeric = Infinity; }
      else {
        var vs = OHM_VS, rs = OHM_RS;
        var ohms = vr >= vs * 0.99999 ? Infinity : rs * vr / (vs - vr);
        if (res.live) ohms = garble(ohms, liveBare);
        fmtOhms(res, ohms);
        if (mode === 'cont' && ohms < 30 && ohms >= 0) res.beep = true;
      }
    } else if (mode === 'diode') {
      if (!probesOn || vr > 2.8) { res.display = 'OL'; res.numeric = Infinity; }
      else { res.display = vr.toFixed(3); res.numeric = vr; }
      res.unit = 'V';
      if (probesOn && vr < 0.05) res.beep = true;
    }
    return res;
  }

  // A live circuit pushes current through the ohmmeter's own test source.
  function garble(ohms, live) {
    if (live > 0) return -Math.abs(isFinite(ohms) ? ohms : 999) - 1;
    return Infinity;
  }

  function fmtVolts(res, volts) {
    if (Math.abs(volts) < 5e-5) volts = 0;  // no "-0.0 mV"
    res.numeric = volts;
    var a = Math.abs(volts);
    if (a < 0.2) { res.display = (volts * 1000).toFixed(1); res.unit = 'mV'; }
    else { res.display = volts.toFixed(a >= 10 ? 2 : 3); res.unit = 'V'; }
    res.flags.push('DC');
  }

  function autoOhmUnit(ohms) {
    if (!isFinite(ohms) || ohms >= 1e6) return 'MΩ';
    if (ohms >= 1000) return 'kΩ';
    return 'Ω';
  }

  function fmtOhms(res, ohms) {
    res.numeric = ohms;
    if (!isFinite(ohms) || ohms > 40e6) { res.display = 'OL'; res.unit = 'MΩ'; return; }
    if (ohms < 0) { res.display = '-' + (Math.min(999, Math.abs(ohms))).toFixed(1); res.unit = 'Ω'; return; }
    var unit = autoOhmUnit(ohms);
    var val = unit === 'MΩ' ? ohms / 1e6 : unit === 'kΩ' ? ohms / 1000 : ohms;
    res.display = val >= 100 ? val.toFixed(1) : val >= 10 ? val.toFixed(2) : val.toFixed(3);
    res.unit = unit;
  }

  // ── Coaching ─────────────────────────────────────────────────────────────
  function pair(a, b) {
    return (state.red === a && state.black === b) || (state.red === b && state.black === a);
  }

  function coach(res) {
    var name = function (n) { return NODE_NAMES[n]; };
    if (res.events.indexOf('fuseMa') >= 0 || (!state.fuseMa && state.mode === 'ma')) return ['bad', 'Pop. The 400 mA fuse is blown, and the meter now reads 0 mA no matter what.',
      'In mA mode the meter is a 2 Ω wire. Touching it across two points with a voltage difference makes a short circuit, and the current shot past the fuse rating. Amps are only measured in series: break the circuit (pull the jumper) and let the meter fill the gap. Click “Replace fuse” to keep working. On a real meter that fuse costs money and time.'];
    if (res.events.indexOf('fuseA') >= 0) return ['bad', 'The 10 A fuse blew.', 'The meter shorted a source that could deliver more than 10 A.'];
    if (state.mode === 'off') return ['info', 'The meter is off.', 'Pick a dial position. Before you touch anything, say out loud what you are measuring, then check that the dial and the red lead match.'];
    if (res.shortAmps > 1) return ['bad', 'Short circuit: about ' + res.shortAmps.toFixed(1) + ' A is flowing through the meter.',
      'Your red lead is in the 10 A jack. That jack goes straight through a 0.02 Ω shunt to COM, no matter where the dial points. You just put a wire across the battery. The battery and leads heat up fast. Move the red lead back to VΩmA before measuring anything except current.'];
    if (res.wrongJack && state.mode === 'a') return ['warn', 'Reads zero because the red lead is in the wrong jack.', 'The 10 A dial position reads the 10 A jack. Move the red lead there, and only after you have broken the circuit.'];
    if (res.wrongJack) return ['warn', 'Red lead is in the 10 A jack.', 'That jack is a near-zero-ohm path to COM. Move the red lead back to VΩmA for volts, ohms, and diode test.'];
    if (state.red === null || state.black === null) return ['info', 'Place both probes.', 'Click a lettered test point to place the ' + state.placing + ' probe. Black usually goes to the lowest-voltage point (G); red goes where you want to know the voltage.'];

    if (state.mode === 'ma' || state.mode === 'a') {
      if (state.jumperIn && res.live) return ['warn', 'Careful: the meter is in parallel.', 'Ammeters go in series. The circuit is still closed, so the meter is bridging ' + name(state.red) + ' to ' + name(state.black) + '. Pull the jumper and put the probes on S and J so all the current has to pass through the meter.'];
      if (!state.jumperIn && pair(S, J)) {
        if (!state.power) return ['info', 'Meter is in series, but the switch is off.', 'Turn the power on to make current flow.'];
        return ['ok', 'That is a correct current measurement: ' + Math.abs(res.numeric * 1000).toFixed(2) + ' mA.',
          (res.numeric < 0 ? 'The minus sign means the current is going in at black and out at red. Swap the probes. ' : '') +
          'The meter replaced the jumper, so every electron in the loop passes through it. Before the next measurement, move the red lead back to the VΩmA jack and turn the dial off mA.'];
      }
      return ['info', 'Current mode.', 'Current is the same everywhere in one series loop. Open the loop with the jumper, then let the meter close it (probes on S and J).'];
    }

    if (state.mode === 'ohm' || state.mode === 'cont') {
      if (res.live) return ['bad', 'The circuit is live. That ohms reading is meaningless.',
        'An ohmmeter measures resistance by pushing its own tiny current and watching the voltage. The battery is pushing too, so the result is nonsense, and on a bigger supply it can damage the meter. Turn the power off first.'];
      if (state.mode === 'cont' && res.beep) return ['ok', 'Beep: continuity.', name(state.red) + ' and ' + name(state.black) + ' are connected by less than about 30 Ω. Use this to check wires, solder joints, and breadboard rows.'];
      if (pair(J, N) && isFinite(res.numeric)) return ['ok', 'The resistor measures ' + res.display + ' ' + res.unit + '.',
        'Compare it with the color code. A 220 Ω ±5 % resistor can read anywhere from 209 to 231 Ω and still be good. Measuring a part in-circuit only works here because nothing else is connected in parallel with it.'];
      if (res.display === 'OL') return ['info', 'OL means “over limit”: no path the meter can measure.', 'Either the circuit is open between those points, or there is an LED in the way. An ohmmeter’s test voltage is too small to turn on an LED. Try diode test instead.'];
      return ['info', 'Power is off, so this reading is trustworthy.', 'You are reading the total resistance between ' + name(state.red) + ' and ' + name(state.black) + '.'];
    }

    if (state.mode === 'diode') {
      if (res.live) return ['bad', 'Turn the power off for diode test.', 'Diode test uses the meter’s own small source, just like ohms.'];
      if (res.display !== 'OL' && res.numeric > 1.2) return ['ok', 'Forward voltage ' + res.display + ' V.', 'The red probe is on the anode. A red LED shows about 1.8 to 2 V, and a silicon diode about 0.6 V. The LED may glow faintly from the meter’s 1 mA.'];
      if (res.display === 'OL') return ['info', 'OL in diode test.', 'Either this is the reverse direction (swap the probes), or there is no diode between these points.'];
      return ['info', 'Diode test.', 'Put red on the LED’s anode and black on its cathode.'];
    }

    if (state.mode === 'vac') return ['warn', 'AC volts on a DC circuit read zero.', 'The batteries make steady DC. AC mode looks for a changing voltage, so a perfectly good 6 V reads 0.00. Wrong mode, not a dead circuit.'];

    // DC volts
    var v = res.numeric;
    if (pair(S, J) && Math.abs(v) > 1) return state.jumperIn
      ? ['warn', Math.abs(v).toFixed(2) + ' V across a wire?', 'A good wire drops almost nothing, so you would expect about 0 V here. When most of the supply voltage shows up across one spot in a series loop, what does that tell you about current at that spot?']
      : ['ok', 'Most of the battery voltage is across the gap.',
      'With the loop open, almost no current flows, so the resistor drops nothing and ' + Math.abs(v).toFixed(2) + ' V appears across the break. It is not quite the full 6 V because the meter’s own tiny current still trickles through the LED, which keeps about 1.5 V even at a millionth of an amp. That is how you find a broken wire with a voltmeter: a good wire would read about 0 V.'];
    if (v < -0.05) return ['warn', 'Negative reading.', 'The meter is fine. It is telling you that the black probe is at the higher voltage. Swap the probes, or just remember the minus sign means “reversed.”'];
    if (pair(B, G) || (state.red === B && state.black === K)) return ['ok', 'Supply voltage: ' + res.display + ' ' + res.unit + '.', 'Four fresh AA cells read a bit over 6 V with no load, and sag slightly under load. This is always the first measurement when something is not working.'];
    if (pair(J, N)) return ['ok', 'Voltage across the resistor: ' + res.display + ' ' + res.unit + '.', 'Divide by the resistance to get the current (Ohm’s Law: I = V ÷ R). That is a way to find current without breaking the circuit.'];
    if (pair(N, K) && CIRCUITS[state.circuit].load === 'led') return ['ok', 'Voltage across the LED: ' + res.display + ' ' + res.unit + '.', 'Add this to the resistor’s voltage. Together they nearly equal the battery voltage. That is Kirchhoff’s voltage law: the drops around a loop add up to the supply.'];
    if ((pair(N, G) || pair(N, K)) && CIRCUITS[state.circuit].load === 'ldr') return ['ok', 'Divider output: ' + res.display + ' ' + res.unit + '.', 'Move the light slider. More light means less photoresistor resistance, so less of the voltage is dropped across it and the output falls. An Arduino reads this point on A0.'];
    if (Math.abs(v) < 0.005) return ['info', 'About 0 V.', 'Both probes are on points joined by a wire (or no current is flowing). A wire drops almost no voltage, which is why 0 V across a wire is normal.'];
    return ['info', 'DC volts: ' + res.display + ' ' + res.unit + '.', 'Volts are always measured between two points, across a part, with the circuit running.'];
  }

  // ── Missions ─────────────────────────────────────────────────────────────
  var MISSIONS = {
    led: [
      { id: 'supply', text: 'Measure the battery voltage.', hint: 'V⎓, red on B, black on G.',
        test: function (r) { return state.mode === 'vdc' && !r.wrongJack && pair(B, G) && Math.abs(r.numeric) > 5; } },
      { id: 'vr', text: 'Measure the voltage across the resistor.', hint: 'Power on, probes on J and N.',
        test: function (r) { return state.mode === 'vdc' && !r.wrongJack && state.power && state.jumperIn && pair(J, N) && Math.abs(r.numeric) > 1; } },
      { id: 'vled', text: 'Measure the voltage across the LED. Check: V(resistor) + V(LED) ≈ V(battery).', hint: 'Probes on N and K.',
        test: function (r) { return state.mode === 'vdc' && !r.wrongJack && state.power && pair(N, K) && Math.abs(r.numeric) > 1.5; } },
      { id: 'amps', text: 'Measure the LED current with the meter in series.', hint: 'Pull the jumper, dial to mA, red on S, black on J.',
        test: function (r) { return state.mode === 'ma' && !r.wrongJack && !state.jumperIn && state.red === S && state.black === J && r.numeric > 0.005; } },
      { id: 'ohms', text: 'Measure the resistor’s real resistance. Is it within ±5 % of 220 Ω?', hint: 'Power off first. Ω, probes on J and N.',
        test: function (r) { return state.mode === 'ohm' && !r.wrongJack && !r.live && pair(J, N) && r.numeric > 150 && r.numeric < 300; } },
      { id: 'diode', text: 'Use diode test to find the LED’s forward voltage.', hint: 'Power off. ▶|, red on N (anode), black on K.',
        test: function (r) { return state.mode === 'diode' && !r.wrongJack && !r.live && state.red === N && state.black === K && r.numeric > 1.5 && r.numeric < 2.5; } }
    ],
    divider: [
      { id: 'bright', text: 'Measure the divider output in bright light.', hint: 'Light above 70 %, red on N, black on G.',
        test: function (r) { return state.mode === 'vdc' && !r.wrongJack && state.power && state.red === N && (state.black === G || state.black === K) && state.light >= 70; } },
      { id: 'dark', text: 'Measure the divider output in the dark. Which way did it move, and why?', hint: 'Light below 30 %.',
        test: function (r) { return state.mode === 'vdc' && !r.wrongJack && state.power && state.red === N && (state.black === G || state.black === K) && state.light <= 30; } },
      { id: 'ldr', text: 'Measure the photoresistor’s resistance directly.', hint: 'Power off. Ω, probes on N and K.',
        test: function (r) { return state.mode === 'ohm' && !r.wrongJack && !r.live && pair(N, K) && isFinite(r.numeric) && r.numeric > 0; } }
    ]
  };

  // ── DOM ─────────────────────────────────────────────────────────────────
  var svg = bench.querySelector('.mm-circuit svg');
  var display = bench.querySelector('.mm-display');
  var displayValue = bench.querySelector('.mm-display-value');
  var displayUnit = bench.querySelector('.mm-display-unit');
  var flagsLeft = bench.querySelector('[data-flag="left"]');
  var flagsRight = bench.querySelector('[data-flag="right"]');
  var coachBox = bench.querySelector('.mm-coach');
  var missionsBox = bench.querySelector('.mm-missions');
  var fuseText = bench.querySelector('.mm-fuse-status');
  var fuseBtn = bench.querySelector('.mm-fuse button');
  var lightRow = bench.querySelector('.mm-light');
  var lightInput = lightRow.querySelector('input');
  var lightOut = lightRow.querySelector('output');
  var powerBtn = bench.querySelector('[data-action="power"]');
  var jumperBtn = bench.querySelector('[data-action="jumper"]');
  var redBtn = bench.querySelector('[data-placing="red"]');
  var blackBtn = bench.querySelector('[data-placing="black"]');

  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var node = document.createElementNS(NS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  var POS = { B: [70, 60], S: [230, 60], J: [450, 60], N: [450, 170], K: [450, 280], G: [70, 280] };

  function drawCircuit(res) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var circuit = CIRCUITS[state.circuit];
    var f = state.circuit === 'mystery' ? state.fault : null;

    // Wires
    el('path', { class: 'mm-wire', d: 'M70 60 H120 M180 60 H230' }, svg);         // B → switch → S
    el('path', { class: 'mm-wire', d: 'M70 60 V145 M70 195 V280 H450' }, svg);   // battery leads + bottom rail
    el('path', { class: 'mm-wire', d: 'M450 60 V88 M450 142 V170 V198 M450 252 V280' }, svg);

    // Battery
    el('line', { class: 'mm-part-line', x1: 44, y1: 152, x2: 96, y2: 152 }, svg);
    el('line', { class: 'mm-part-line', x1: 56, y1: 166, x2: 84, y2: 166, 'stroke-width': 5 }, svg);
    el('line', { class: 'mm-part-line', x1: 44, y1: 178, x2: 96, y2: 178 }, svg);
    el('line', { class: 'mm-part-line', x1: 56, y1: 192, x2: 84, y2: 192, 'stroke-width': 5 }, svg);
    text(104, 158, '4×AA', 'mm-part-label', 'start');
    text(104, 176, f === 'battery' ? '“6 V”' : '6 V', 'mm-value-label', 'start');
    text(40, 150, '+', 'mm-value-label', 'end');

    // Switch
    el('circle', { cx: 122, cy: 60, r: 4, class: 'mm-part' }, svg);
    el('circle', { cx: 178, cy: 60, r: 4, class: 'mm-part' }, svg);
    el('line', { class: 'mm-part-line', x1: 124, y1: 58, x2: state.power ? 176 : 170, y2: state.power ? 58 : 32 }, svg);
    text(150, 92, state.power ? 'switch ON' : 'switch OFF', 'mm-part-label', 'middle');

    // Jumper wire S → J
    if (state.jumperIn) {
      el('path', { class: 'mm-wire mm-wire--jumper', d: 'M230 60 C 290 20, 390 20, 450 60' }, svg);
      if (f === 'wire') el('path', { d: 'M336 26 l6 10 l-8 2 l6 10', fill: 'none', stroke: 'transparent' }, svg); // the break is invisible
    } else {
      el('path', { class: 'mm-wire mm-wire--jumper', d: 'M300 112 C 330 92, 370 92, 400 112', opacity: .55 }, svg);
      text(350, 132, 'jumper pulled out', 'mm-part-label', 'middle');
    }
    text(340, 22, 'jumper wire', 'mm-part-label', 'middle');

    // Resistor J → N
    var zig = 'M450 88 l-12 5 l24 9 l-24 9 l24 9 l-24 9 l12 5';
    el('path', { class: 'mm-part-line', d: zig }, svg);
    var rLabel = circuit.load === 'led' ? (f === 'resistor' ? '220 k?' : '220 Ω') : '10 kΩ';
    text(478, 120, rLabel, 'mm-value-label', 'start');

    // Load N → K
    if (circuit.load === 'led') {
      var reversed = f === 'reversed';
      var glow = Math.min(1, res.ledCurrent / 0.018);
      if (glow > 0.01) el('circle', { cx: 450, cy: 225, r: 18 + 22 * glow, fill: '#ff3b30', opacity: (0.15 + 0.55 * glow).toFixed(2) }, svg);
      var tri = reversed ? 'M432 246 L468 246 L450 210 Z' : 'M432 206 L468 206 L450 242 Z';
      el('path', { class: 'mm-led-body', d: tri, fill: glow > 0.01 ? '#ff6b5f' : 'var(--mm-sheet)' }, svg);
      el('line', { class: 'mm-part-line', x1: 432, y1: reversed ? 208 : 244, x2: 468, y2: reversed ? 208 : 244 }, svg);
      el('path', { class: 'mm-part-line', d: 'M472 214 l12 -8 m-5 0 h5 v5 M474 228 l12 -8 m-5 0 h5 v5' }, svg);
      text(492, 232, 'red LED', 'mm-part-label', 'start');
    } else {
      el('rect', { class: 'mm-part', x: 434, y: 202, width: 32, height: 46, rx: 14 }, svg);
      el('path', { class: 'mm-part-line', d: 'M442 212 h16 l-16 8 h16 l-16 8 h16 l-16 8 h16', 'stroke-width': 1.6 }, svg);
      text(478, 222, 'photoresistor', 'mm-part-label', 'start');
      text(478, 240, formatOhmsShort(ldrOhms(state.light)), 'mm-value-label', 'start');
    }

    // Test points
    NODE_NAMES.forEach(function (name, idx) {
      var p = POS[name];
      var g = el('g', {
        class: 'mm-tp', tabindex: 0, role: 'button', 'data-node': idx,
        'aria-label': 'Test point ' + name + ', ' + circuit.points[name] + (state.red === idx ? ', red probe here' : '') + (state.black === idx ? ', black probe here' : '')
      }, svg);
      el('circle', { class: 'mm-tp-hit', cx: p[0], cy: p[1], r: 30 }, g);  // finger-sized target on phones
      el('circle', { class: 'mm-tp-ring', cx: p[0], cy: p[1], r: 18, fill: 'none' }, g);
      el('circle', { class: 'mm-tp-dot', cx: p[0], cy: p[1], r: 12 }, g);
      text(p[0], p[1], name, null, 'middle', g);
    });

    // Probes
    drawProbe(state.red, 'red', -1);
    drawProbe(state.black, 'black', 1);

    if (res.shortAmps > 1 || res.events.length) {
      var at = POS[NODE_NAMES[state.red !== null ? state.red : 0]];
      el('path', { class: 'mm-spark', d: 'M' + (at[0] - 6) + ' ' + (at[1] - 34) + ' l10 0 l-6 10 l10 0 l-16 18 l4 -12 l-9 0 z' }, svg);
    }
  }

  function drawProbe(node, color, side) {
    if (node === null) return;
    var p = POS[NODE_NAMES[node]];
    var x = p[0] + side * 22, y = p[1] - 26;
    var len = Math.hypot(x - p[0], y - p[1]);
    var x1 = p[0] + (x - p[0]) * 13 / len, y1 = p[1] + (y - p[1]) * 13 / len;  // start at the dot's rim, not over its letter
    el('line', { x1: x1, y1: y1, x2: x, y2: y, stroke: color === 'red' ? 'var(--mm-red)' : 'var(--mm-black)', 'stroke-width': 4, 'stroke-linecap': 'round', class: 'mm-probe' }, svg);
    el('circle', { cx: x, cy: y, r: 10, class: 'mm-probe mm-probe--' + color }, svg);
    text(x, y, color === 'red' ? '+' : '−', 'mm-probe-text', 'middle');
  }

  function text(x, y, str, cls, anchor, parent) {
    var t = el('text', { x: x, y: y, 'text-anchor': anchor || 'start' }, parent || svg);
    if (cls) t.setAttribute('class', cls);
    t.textContent = str;
    return t;
  }

  function formatOhmsShort(ohms) {
    if (ohms >= 1000) return (ohms / 1000).toFixed(ohms >= 10000 ? 0 : 1) + ' kΩ';
    return Math.round(ohms) + ' Ω';
  }

  function renderMeter(res) {
    display.classList.toggle('is-off', !!res.off);
    display.classList.toggle('is-beep', !!res.beep);
    displayValue.textContent = res.display;
    displayUnit.textContent = res.unit;
    flagsLeft.textContent = res.off ? '' : (res.flags.join(' ') + (MODES[state.mode].name ? ' · AUTO' : ''));
    flagsRight.textContent = res.beep ? '·))) BEEP' : (res.live && (state.mode === 'ohm' || state.mode === 'cont' || state.mode === 'diode') ? '⚠ LIVE' : '');
    bench.querySelectorAll('.mm-dial button').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.dataset.mode === state.mode));
      b.tabIndex = b.dataset.mode === state.mode ? 0 : -1;
    });
    bench.querySelectorAll('.mm-jacks button').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.dataset.jack === state.jack));
      b.classList.toggle('is-red', b.dataset.jack === state.jack);
      b.tabIndex = b.dataset.jack === state.jack ? 0 : -1;
    });
    var blown = [];
    if (!state.fuseMa) blown.push('400 mA');
    if (!state.fuseA) blown.push('10 A');
    fuseText.textContent = blown.length ? 'Fuse blown: ' + blown.join(' and ') : 'Fuses OK';
    fuseText.classList.toggle('is-blown', blown.length > 0);
    fuseBtn.hidden = blown.length === 0;
  }

  function renderCoach(res) {
    var c = coach(res);
    coachBox.dataset.tone = c[0];
    coachBox.innerHTML = '<strong></strong><span></span>';
    coachBox.querySelector('strong').textContent = c[1];
    coachBox.querySelector('span').textContent = c[2];
  }

  function renderMissions(res) {
    if (state.circuit === 'mystery') {
      missionsBox.innerHTML =
        '<h3>Diagnose the dead LED <span>one fault is hidden</span></h3>' +
        '<p>This LED should light, but it doesn’t. Take at least three measurements, then choose the fault. Start with the supply. Then walk the voltage along the loop.</p>' +
        '<div class="mm-diagnose" role="group" aria-label="Choose the fault"></div>' +
        '<p class="mm-feedback" aria-live="polite"></p>' +
        '<button type="button" class="mm-btn" data-action="new-fault">New mystery circuit</button>';
      var group = missionsBox.querySelector('.mm-diagnose');
      Object.keys(FAULTS).forEach(function (key) {
        var b = document.createElement('button');
        b.type = 'button';
        b.dataset.fault = key;
        b.textContent = FAULTS[key].label;
        group.appendChild(b);
      });
      return;
    }
    var list = MISSIONS[state.circuit];
    list.forEach(function (m) { if (!state.done[m.id] && m.test(res)) state.done[m.id] = true; });
    var count = list.filter(function (m) { return state.done[m.id]; }).length;
    missionsBox.innerHTML = '<h3>Measurement missions <span>' + count + ' of ' + list.length + ' done</span></h3><ol></ol>';
    var ol = missionsBox.querySelector('ol');
    list.forEach(function (m) {
      var li = document.createElement('li');
      if (state.done[m.id]) li.className = 'is-done';
      li.textContent = m.text;
      var small = document.createElement('small');
      small.textContent = m.hint;
      li.appendChild(small);
      ol.appendChild(li);
    });
  }

  var lastCircuitRendered = null;
  function update() {
    var res = evaluate();
    drawCircuit(res);
    renderMeter(res);
    renderCoach(res);
    if (state.circuit !== 'mystery' || lastCircuitRendered !== state.circuit + state.fault) {
      renderMissions(res);
      lastCircuitRendered = state.circuit === 'mystery' ? state.circuit + state.fault : null;
    }
    powerBtn.setAttribute('aria-pressed', String(state.power));
    powerBtn.textContent = state.power ? 'Power: ON' : 'Power: OFF';
    jumperBtn.setAttribute('aria-pressed', String(!state.jumperIn));
    jumperBtn.textContent = state.jumperIn ? 'Pull jumper (open the loop)' : 'Replace jumper';
    redBtn.setAttribute('aria-pressed', String(state.placing === 'red'));
    blackBtn.setAttribute('aria-pressed', String(state.placing === 'black'));
    lightRow.hidden = CIRCUITS[state.circuit].load !== 'ldr';
    lightOut.textContent = state.light + '%';
    bench.querySelectorAll('.mm-tabs button').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.circuit === state.circuit));
    });
  }

  function newFault() {
    var keys = Object.keys(FAULTS).filter(function (k) { return k !== state.fault; });
    state.fault = keys[Math.floor(Math.random() * keys.length)];
    state.diagnosed = false;
    state.power = true;
    state.jumperIn = true;
  }

  // ── Events ──────────────────────────────────────────────────────────────
  function placeProbe(node) {
    if (state.placing === 'red') { state.red = node; state.placing = 'black'; }
    else { state.black = node; state.placing = 'red'; }
    update();
  }

  svg.addEventListener('click', function (e) {
    var tp = e.target.closest('.mm-tp');
    if (tp) placeProbe(Number(tp.dataset.node));
  });
  svg.addEventListener('keydown', function (e) {
    var tp = e.target.closest('.mm-tp');
    if (tp && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      var node = Number(tp.dataset.node);
      placeProbe(node);
      var again = svg.querySelector('.mm-tp[data-node="' + node + '"]');
      if (again) again.focus();
    }
  });

  bench.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || !bench.contains(t)) return;
    if (t.dataset.mode) { state.mode = t.dataset.mode; update(); return; }
    if (t.dataset.jack) { state.jack = t.dataset.jack; update(); return; }
    if (t.dataset.placing) { state.placing = t.dataset.placing; update(); return; }
    if (t.dataset.circuit) {
      state.circuit = t.dataset.circuit;
      state.red = state.black = null; state.placing = 'red';
      state.power = true; state.jumperIn = true;
      if (state.circuit === 'mystery') newFault();
      lastCircuitRendered = null;
      update(); return;
    }
    if (t.dataset.fault) {
      var right = t.dataset.fault === state.fault;
      missionsBox.querySelectorAll('.mm-diagnose button').forEach(function (b) { b.classList.remove('is-right', 'is-wrong'); });
      t.classList.add(right ? 'is-right' : 'is-wrong');
      missionsBox.querySelector('.mm-feedback').textContent = right
        ? 'Correct. ' + FAULTS[state.fault].explain
        : 'Not this one. What would the meter show if that were the fault? Compare it with what you measured, and test again.';
      return;
    }
    switch (t.dataset.action) {
      case 'power': state.power = !state.power; break;
      case 'jumper': state.jumperIn = !state.jumperIn; break;
      case 'clear': state.red = state.black = null; state.placing = 'red'; break;
      case 'fuse': state.fuseMa = true; state.fuseA = true; break;
      case 'new-fault': newFault(); lastCircuitRendered = null; break;
      default: return;
    }
    update();
  });

  // Arrow keys move through radio groups (dial and jacks).
  function radioKeys(group, attr) {
    group.addEventListener('keydown', function (e) {
      var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      var buttons = Array.prototype.slice.call(group.querySelectorAll('button'));
      var i = buttons.findIndex(function (b) { return b.getAttribute('aria-checked') === 'true'; });
      var next = buttons[(i + keys[e.key] + buttons.length) % buttons.length];
      state[attr] = next.dataset[attr];
      update();
      next.focus();
    });
  }
  radioKeys(bench.querySelector('.mm-dial'), 'mode');
  radioKeys(bench.querySelector('.mm-jacks'), 'jack');

  lightInput.addEventListener('input', function () { state.light = Number(lightInput.value); update(); });

  // Expose the solver for automated checks.
  window.MultimeterLab = { state: state, evaluate: evaluate, update: update, nodes: { G: G, B: B, S: S, J: J, N: N, K: K } };

  update();
})();

// ── Quick check ───────────────────────────────────────────────────────────
(function () {
  'use strict';
  document.querySelectorAll('.mm-question').forEach(function (q) {
    var feedback = q.querySelector('.mm-q-feedback');
    q.querySelectorAll('.mm-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var right = btn.dataset.choice === q.dataset.answer;
        q.querySelectorAll('.mm-option').forEach(function (b) { b.classList.remove('is-right', 'is-wrong'); });
        btn.classList.add(right ? 'is-right' : 'is-wrong');
        feedback.className = 'mm-q-feedback ' + (right ? 'is-right' : 'is-wrong');
        feedback.textContent = (right ? 'Correct. ' : 'Not quite. ') + q.dataset.explanation;
      });
    });
  });
  var reset = document.getElementById('mm-quiz-reset');
  if (reset) reset.addEventListener('click', function () {
    document.querySelectorAll('.mm-option').forEach(function (b) { b.classList.remove('is-right', 'is-wrong'); });
    document.querySelectorAll('.mm-q-feedback').forEach(function (f) { f.textContent = ''; f.className = 'mm-q-feedback'; });
  });
})();
