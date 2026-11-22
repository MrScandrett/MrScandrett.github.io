/* Measuring Length: the maths behind the lesson's studio, with no DOM.
 *
 *   MeasuringLengthCore.convertValue('length', 1, 'mi', 'km').result  → 1.609344
 *   MeasuringLengthCore.decomposeCaliper(190, 0).inchFraction         → '7 31/64"'
 *   MeasuringLengthCore.parsePracticeNumber('5,280 ft')               → 5280
 *
 * Tests: node --test tests/measuring-length.test.mjs
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MeasuringLengthCore = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Every category maps unit key → { label, sym, f } where f is the factor to the
     category's SI unit. Temperature is affine, so it carries to/from functions. */
  var CATEGORIES = {
    length: {
      label: 'Length', si: 'metre (m)', siSym: 'm', dim: '[L]¹', baseUnits: 'm',
      units: {
        nm: { label: 'Nanometers (nm)', sym: 'nm', f: 1e-9 }, um: { label: 'Micrometers (µm)', sym: 'µm', f: 1e-6 },
        mm: { label: 'Millimeters (mm)', sym: 'mm', f: 0.001 }, cm: { label: 'Centimeters (cm)', sym: 'cm', f: 0.01 },
        m: { label: 'Meters (m)', sym: 'm', f: 1 }, km: { label: 'Kilometers (km)', sym: 'km', f: 1000 },
        in: { label: 'Inches (in)', sym: 'in', f: 0.0254 }, ft: { label: 'Feet (ft)', sym: 'ft', f: 0.3048 },
        yd: { label: 'Yards (yd)', sym: 'yd', f: 0.9144 }, fath: { label: 'Fathoms', sym: 'fathom', f: 1.8288 },
        fur: { label: 'Furlongs', sym: 'furlong', f: 201.168 }, mi: { label: 'Miles (mi)', sym: 'mi', f: 1609.344 },
        nmi: { label: 'Nautical Miles (nmi)', sym: 'nmi', f: 1852 }, au: { label: 'Astronomical Units (au)', sym: 'au', f: 1.495978707e11 },
        ly: { label: 'Light-years (ly)', sym: 'ly', f: 9.4607304725808e15 }, pc: { label: 'Parsecs (pc)', sym: 'pc', f: 3.0856775814913673e16 }
      },
      quick: [[1, 'm', 'ft'], [1, 'mi', 'km'], [1, 'in', 'mm'], [1, 'au', 'km'], [1, 'ly', 'km']]
    },
    mass: {
      label: 'Mass', si: 'kilogram (kg)', siSym: 'kg', dim: '[M]¹', baseUnits: 'kg',
      units: {
        ug: { label: 'Micrograms (µg)', sym: 'µg', f: 1e-9 }, mg: { label: 'Milligrams (mg)', sym: 'mg', f: 1e-6 },
        g: { label: 'Grams (g)', sym: 'g', f: 0.001 }, kg: { label: 'Kilograms (kg)', sym: 'kg', f: 1 },
        t: { label: 'Tonnes (t)', sym: 't', f: 1000 }, ct: { label: 'Carats (ct)', sym: 'ct', f: 0.0002 },
        oz: { label: 'Ounces (oz)', sym: 'oz', f: 0.028349523125 }, lb: { label: 'Pounds (lb)', sym: 'lb', f: 0.45359237 },
        st: { label: 'Stone (st)', sym: 'st', f: 6.35029318 }, ton: { label: 'US short tons', sym: 'short ton', f: 907.18474 },
        u: { label: 'Atomic mass units (u)', sym: 'u', f: 1.66053906892e-27 }
      },
      quick: [[1, 'kg', 'lb'], [1, 'lb', 'g'], [1, 'oz', 'g'], [1, 't', 'lb'], [1, 'ct', 'mg']]
    },
    temperature: {
      label: 'Temperature', si: 'kelvin (K)', siSym: 'K', dim: '[Θ]¹', baseUnits: 'K', affine: true,
      units: {
        K: { label: 'Kelvin (K)', sym: 'K', to: function (v) { return v; }, from: function (v) { return v; } },
        C: { label: 'Celsius (°C)', sym: '°C', to: function (v) { return v + 273.15; }, from: function (v) { return v - 273.15; } },
        F: { label: 'Fahrenheit (°F)', sym: '°F', to: function (v) { return (v - 32) * 5 / 9 + 273.15; }, from: function (v) { return (v - 273.15) * 9 / 5 + 32; } },
        R: { label: 'Rankine (°R)', sym: '°R', to: function (v) { return v * 5 / 9; }, from: function (v) { return v * 9 / 5; } }
      },
      quick: [[0, 'C', 'F'], [100, 'C', 'F'], [98.6, 'F', 'C'], [0, 'K', 'C'], [72, 'F', 'C']]
    },
    area: {
      label: 'Area', si: 'square metre (m²)', siSym: 'm²', dim: '[L]²', baseUnits: 'm²',
      units: {
        mm2: { label: 'Square millimeters (mm²)', sym: 'mm²', f: 1e-6 }, cm2: { label: 'Square centimeters (cm²)', sym: 'cm²', f: 1e-4 },
        m2: { label: 'Square meters (m²)', sym: 'm²', f: 1 }, ha: { label: 'Hectares (ha)', sym: 'ha', f: 10000 },
        km2: { label: 'Square kilometers (km²)', sym: 'km²', f: 1e6 }, in2: { label: 'Square inches (in²)', sym: 'in²', f: 0.00064516 },
        ft2: { label: 'Square feet (ft²)', sym: 'ft²', f: 0.09290304 }, ac: { label: 'Acres', sym: 'acre', f: 4046.8564224 },
        mi2: { label: 'Square miles (mi²)', sym: 'mi²', f: 2589988.110336 }
      },
      quick: [[1, 'm2', 'ft2'], [1, 'ac', 'm2'], [1, 'ha', 'ac'], [1, 'km2', 'mi2']]
    },
    volume: {
      label: 'Volume', si: 'cubic metre (m³)', siSym: 'm³', dim: '[L]³', baseUnits: 'm³',
      units: {
        ml: { label: 'Milliliters (mL)', sym: 'mL', f: 1e-6 }, l: { label: 'Liters (L)', sym: 'L', f: 0.001 },
        m3: { label: 'Cubic meters (m³)', sym: 'm³', f: 1 }, cm3: { label: 'Cubic centimeters (cm³)', sym: 'cm³', f: 1e-6 },
        ft3: { label: 'Cubic feet (ft³)', sym: 'ft³', f: 0.028316846592 }, tsp: { label: 'Teaspoons (US)', sym: 'tsp', f: 4.92892159375e-6 },
        tbsp: { label: 'Tablespoons (US)', sym: 'tbsp', f: 1.478676478125e-5 }, floz: { label: 'Fluid ounces (US)', sym: 'fl oz', f: 2.95735295625e-5 },
        cup: { label: 'Cups (US)', sym: 'cup', f: 2.365882365e-4 }, pt: { label: 'Pints (US)', sym: 'pt', f: 4.73176473e-4 },
        qt: { label: 'Quarts (US)', sym: 'qt', f: 9.46352946e-4 }, gal: { label: 'Gallons (US)', sym: 'gal', f: 0.003785411784 },
        bbl: { label: 'Oil barrels', sym: 'bbl', f: 0.158987294928 }
      },
      quick: [[1, 'l', 'gal'], [1, 'gal', 'l'], [1, 'cup', 'ml'], [1, 'm3', 'l'], [1, 'floz', 'ml']]
    },
    speed: {
      label: 'Speed', si: 'metre per second (m/s)', siSym: 'm/s', dim: '[L]¹[T]⁻¹', baseUnits: 'm·s⁻¹',
      units: {
        mps: { label: 'Meters per second (m/s)', sym: 'm/s', f: 1 }, kph: { label: 'Kilometers per hour (km/h)', sym: 'km/h', f: 1 / 3.6 },
        mph: { label: 'Miles per hour (mph)', sym: 'mph', f: 0.44704 }, kn: { label: 'Knots (kn)', sym: 'kn', f: 1852 / 3600 },
        fps: { label: 'Feet per second (ft/s)', sym: 'ft/s', f: 0.3048 }, mach: { label: 'Mach (sea level, 20 °C)', sym: 'Mach', f: 343 },
        c: { label: 'Speed of light (c)', sym: 'c', f: 299792458 }
      },
      quick: [[1, 'mps', 'kph'], [60, 'mph', 'kph'], [1, 'kn', 'kph'], [1, 'mach', 'mph'], [1, 'c', 'kph']]
    },
    force: {
      label: 'Force', si: 'newton (N)', siSym: 'N', dim: '[M]¹[L]¹[T]⁻²', baseUnits: 'kg·m·s⁻²',
      units: {
        N: { label: 'Newtons (N)', sym: 'N', f: 1 }, kN: { label: 'Kilonewtons (kN)', sym: 'kN', f: 1000 },
        dyn: { label: 'Dynes (dyn)', sym: 'dyn', f: 1e-5 }, kgf: { label: 'Kilograms-force (kgf)', sym: 'kgf', f: 9.80665 },
        lbf: { label: 'Pounds-force (lbf)', sym: 'lbf', f: 4.4482216152605 }
      },
      quick: [[1, 'N', 'lbf'], [1, 'lbf', 'N'], [1, 'kgf', 'N'], [1, 'kN', 'lbf']]
    },
    pressure: {
      label: 'Pressure', si: 'pascal (Pa)', siSym: 'Pa', dim: '[M]¹[L]⁻¹[T]⁻²', baseUnits: 'kg·m⁻¹·s⁻²',
      units: {
        Pa: { label: 'Pascals (Pa)', sym: 'Pa', f: 1 }, hPa: { label: 'Hectopascals (hPa)', sym: 'hPa', f: 100 },
        kPa: { label: 'Kilopascals (kPa)', sym: 'kPa', f: 1000 }, MPa: { label: 'Megapascals (MPa)', sym: 'MPa', f: 1e6 },
        mbar: { label: 'Millibars (mbar)', sym: 'mbar', f: 100 }, bar: { label: 'Bars (bar)', sym: 'bar', f: 100000 },
        atm: { label: 'Atmospheres (atm)', sym: 'atm', f: 101325 }, psi: { label: 'Pounds per sq. inch (psi)', sym: 'psi', f: 6894.757293168 },
        mmHg: { label: 'Millimeters of mercury (mmHg / torr)', sym: 'mmHg', f: 133.322387415 },
        inHg: { label: 'Inches of mercury (inHg)', sym: 'inHg', f: 3386.389 }, mH2O: { label: 'Meters of water', sym: 'mH₂O', f: 9806.65 }
      },
      quick: [[1, 'atm', 'kPa'], [1, 'bar', 'psi'], [32, 'psi', 'kPa'], [760, 'mmHg', 'atm'], [1, 'atm', 'psi']]
    },
    energy: {
      label: 'Energy', si: 'joule (J)', siSym: 'J', dim: '[M]¹[L]²[T]⁻²', baseUnits: 'kg·m²·s⁻²',
      units: {
        J: { label: 'Joules (J)', sym: 'J', f: 1 }, kJ: { label: 'Kilojoules (kJ)', sym: 'kJ', f: 1000 }, MJ: { label: 'Megajoules (MJ)', sym: 'MJ', f: 1e6 },
        cal: { label: 'Calories, physics (cal)', sym: 'cal', f: 4.184 }, kcal: { label: 'Calories, food (kcal / Cal)', sym: 'kcal', f: 4184 },
        Wh: { label: 'Watt-hours (Wh)', sym: 'Wh', f: 3600 }, kWh: { label: 'Kilowatt-hours (kWh)', sym: 'kWh', f: 3.6e6 },
        BTU: { label: 'British thermal units (BTU)', sym: 'BTU', f: 1055.05585262 }, eV: { label: 'Electronvolts (eV)', sym: 'eV', f: 1.602176634e-19 },
        therm: { label: 'Therms (US)', sym: 'therm', f: 1.054804e8 }, tTNT: { label: 'Tons of TNT', sym: 't TNT', f: 4.184e9 }
      },
      quick: [[1, 'kcal', 'kJ'], [1, 'kWh', 'MJ'], [1, 'BTU', 'J'], [2000, 'kcal', 'kWh'], [1, 'eV', 'J']]
    },
    power: {
      label: 'Power', si: 'watt (W)', siSym: 'W', dim: '[M]¹[L]²[T]⁻³', baseUnits: 'kg·m²·s⁻³',
      units: {
        mW: { label: 'Milliwatts (mW)', sym: 'mW', f: 0.001 }, W: { label: 'Watts (W)', sym: 'W', f: 1 }, kW: { label: 'Kilowatts (kW)', sym: 'kW', f: 1000 },
        MW: { label: 'Megawatts (MW)', sym: 'MW', f: 1e6 }, GW: { label: 'Gigawatts (GW)', sym: 'GW', f: 1e9 },
        hp: { label: 'Horsepower (hp)', sym: 'hp', f: 745.6998715822702 }, BTUh: { label: 'BTU per hour', sym: 'BTU/h', f: 0.29307107 },
        cals: { label: 'Calories per second', sym: 'cal/s', f: 4.184 }
      },
      quick: [[1, 'hp', 'kW'], [100, 'W', 'hp'], [1, 'MW', 'hp'], [12000, 'BTUh', 'kW']]
    },
    frequency: {
      label: 'Frequency', si: 'hertz (Hz)', siSym: 'Hz', dim: '[T]⁻¹', baseUnits: 's⁻¹',
      units: {
        Hz: { label: 'Hertz (Hz)', sym: 'Hz', f: 1 }, kHz: { label: 'Kilohertz (kHz)', sym: 'kHz', f: 1000 }, MHz: { label: 'Megahertz (MHz)', sym: 'MHz', f: 1e6 },
        GHz: { label: 'Gigahertz (GHz)', sym: 'GHz', f: 1e9 }, THz: { label: 'Terahertz (THz)', sym: 'THz', f: 1e12 },
        rpm: { label: 'Revolutions per minute (rpm)', sym: 'rpm', f: 1 / 60 }, bpm: { label: 'Beats per minute (bpm)', sym: 'bpm', f: 1 / 60 }
      },
      quick: [[1, 'GHz', 'MHz'], [3000, 'rpm', 'Hz'], [440, 'Hz', 'rpm'], [1, 'THz', 'GHz']]
    },
    charge: {
      label: 'Charge', si: 'coulomb (C)', siSym: 'C', dim: '[I]¹[T]¹', baseUnits: 'A·s',
      units: {
        C: { label: 'Coulombs (C)', sym: 'C', f: 1 }, mC: { label: 'Millicoulombs (mC)', sym: 'mC', f: 0.001 }, uC: { label: 'Microcoulombs (µC)', sym: 'µC', f: 1e-6 },
        Ah: { label: 'Ampere-hours (Ah)', sym: 'Ah', f: 3600 }, mAh: { label: 'Milliampere-hours (mAh)', sym: 'mAh', f: 3.6 },
        e: { label: 'Elementary charges (e)', sym: 'e', f: 1.602176634e-19 }
      },
      quick: [[1, 'Ah', 'C'], [5000, 'mAh', 'C'], [1, 'C', 'e']]
    },
    voltage: {
      label: 'Voltage', si: 'volt (V)', siSym: 'V', dim: '[M]¹[L]²[T]⁻³[I]⁻¹', baseUnits: 'kg·m²·s⁻³·A⁻¹',
      units: {
        uV: { label: 'Microvolts (µV)', sym: 'µV', f: 1e-6 }, mV: { label: 'Millivolts (mV)', sym: 'mV', f: 0.001 }, V: { label: 'Volts (V)', sym: 'V', f: 1 },
        kV: { label: 'Kilovolts (kV)', sym: 'kV', f: 1000 }, MV: { label: 'Megavolts (MV)', sym: 'MV', f: 1e6 }
      },
      quick: [[1, 'kV', 'V'], [1.5, 'V', 'mV'], [230, 'V', 'kV']]
    },
    data: {
      label: 'Data', si: 'bit (b)', siSym: 'b', dim: 'Dimensionless (information)', baseUnits: 'bit',
      units: {
        b: { label: 'Bits (b)', sym: 'b', f: 1 }, B: { label: 'Bytes (B)', sym: 'B', f: 8 }, kB: { label: 'Kilobytes (kB, 10³)', sym: 'kB', f: 8e3 },
        MB: { label: 'Megabytes (MB, 10⁶)', sym: 'MB', f: 8e6 }, GB: { label: 'Gigabytes (GB, 10⁹)', sym: 'GB', f: 8e9 },
        TB: { label: 'Terabytes (TB, 10¹²)', sym: 'TB', f: 8e12 }, KiB: { label: 'Kibibytes (KiB, 2¹⁰)', sym: 'KiB', f: 8 * 1024 },
        MiB: { label: 'Mebibytes (MiB, 2²⁰)', sym: 'MiB', f: 8 * 1048576 }, GiB: { label: 'Gibibytes (GiB, 2³⁰)', sym: 'GiB', f: 8 * 1073741824 }
      },
      quick: [[1, 'GB', 'MB'], [1, 'GiB', 'GB'], [1, 'TB', 'GiB'], [1, 'B', 'b']]
    },
    angle: {
      label: 'Angle', si: 'radian (rad)', siSym: 'rad', dim: 'Dimensionless (m/m)', baseUnits: 'm·m⁻¹',
      units: {
        rad: { label: 'Radians (rad)', sym: 'rad', f: 1 }, deg: { label: 'Degrees (°)', sym: '°', f: Math.PI / 180 },
        arcmin: { label: 'Arcminutes (′)', sym: '′', f: Math.PI / 10800 }, arcsec: { label: 'Arcseconds (″)', sym: '″', f: Math.PI / 648000 },
        grad: { label: 'Gradians (gon)', sym: 'gon', f: Math.PI / 200 }, turn: { label: 'Turns (full circles)', sym: 'turn', f: 2 * Math.PI }
      },
      quick: [[180, 'deg', 'rad'], [1, 'turn', 'deg'], [1, 'deg', 'arcmin'], [1, 'rad', 'deg']]
    },
    radiation: {
      label: 'Radiation', si: 'sievert (Sv)', siSym: 'Sv', dim: '[L]²[T]⁻²', baseUnits: 'm²·s⁻²',
      units: {
        Sv: { label: 'Sieverts (Sv)', sym: 'Sv', f: 1 }, mSv: { label: 'Millisieverts (mSv)', sym: 'mSv', f: 0.001 }, uSv: { label: 'Microsieverts (µSv)', sym: 'µSv', f: 1e-6 },
        rem: { label: 'Rem', sym: 'rem', f: 0.01 }, mrem: { label: 'Millirem', sym: 'mrem', f: 1e-5 },
        Gy: { label: 'Grays (Gy, ×1 for X-rays)', sym: 'Gy', f: 1 }, mGy: { label: 'Milligrays (mGy)', sym: 'mGy', f: 0.001 }, rad: { label: 'Rads', sym: 'rad', f: 0.01 }
      },
      quick: [[1, 'mSv', 'uSv'], [1, 'rem', 'mSv'], [100, 'uSv', 'mrem']]
    },
    light: {
      label: 'Light', si: 'lux (lx)', siSym: 'lx', dim: '[L]⁻²[J]¹', baseUnits: 'cd·sr·m⁻²',
      units: {
        lx: { label: 'Lux (lx)', sym: 'lx', f: 1 }, klx: { label: 'Kilolux (klx)', sym: 'klx', f: 1000 },
        fc: { label: 'Foot-candles (fc)', sym: 'fc', f: 10.763910417 }, phot: { label: 'Phots (ph)', sym: 'ph', f: 10000 }, nox: { label: 'Nox', sym: 'nox', f: 0.001 }
      },
      quick: [[1, 'fc', 'lx'], [500, 'lx', 'fc'], [100000, 'lx', 'klx']]
    }
  };

  function toSI(cat, key, v) { var u = cat.units[key]; return cat.affine ? u.to(v) : v * u.f; }
  function fromSI(cat, key, v) { var u = cat.units[key]; return cat.affine ? u.from(v) : v / u.f; }

  function formatNumber(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    if (n === 0) return '0';
    var a = Math.abs(n);
    if (a >= 1e12 || a < 1e-6) return n.toExponential(4);
    if (a >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 3 });
    return String(parseFloat(n.toPrecision(6)));
  }

  /* Returns the result plus the data the UI needs to draw a factor-label chain. */
  function convertValue(catKey, value, fromKey, toKey) {
    var cat = CATEGORIES[catKey];
    if (!cat || !cat.units[fromKey] || !cat.units[toKey] || typeof value !== 'number' || !isFinite(value)) return null;
    var fromU = cat.units[fromKey], toU = cat.units[toKey];
    var siValue = toSI(cat, fromKey, value);
    var result = fromSI(cat, toKey, siValue);
    var out = { result: result, siValue: siValue, isAffine: !!cat.affine, from: fromU.sym, to: toU.sym, si: cat.siSym };
    if (cat.affine) {
      out.factor = null;
      out.steps = null;
    } else {
      out.factor = fromSI(cat, toKey, toSI(cat, fromKey, 1));
      // value from × (SI per from) × (to per SI) = result to
      out.steps = {
        value: value, from: fromU.sym, to: toU.sym, si: cat.siSym,
        siPerFrom: fromU.f, toPerSi: 1 / toU.f,
        sameUnit: fromKey === toKey
      };
    }
    return out;
  }

  /* ── caliper ── */
  function formatFractionalInch(inches, denom) {
    denom = denom || 64;
    var neg = inches < 0;
    var a = Math.abs(inches);
    var whole = Math.floor(a);
    var num = Math.round((a - whole) * denom);
    if (num === denom) { whole += 1; num = 0; }
    var d = denom;
    while (num && num % 2 === 0) { num /= 2; d /= 2; }
    var s = (neg ? '-' : '') + (num === 0 ? String(whole) : (whole ? whole + ' ' : '') + num + '/' + d);
    return s + '"';
  }

  /* A 0.02 mm vernier: main scale in whole mm, vernier line index 0..49 picks the hundredths. */
  function decomposeCaliper(mm, tareMm) {
    tareMm = tareMm || 0;
    var net = mm - tareMm;
    var neg = net < 0;
    var a = Math.abs(net);
    var hundredths = Math.round(a * 100);
    // The vernier resolves 0.02 mm; snap the reading to that.
    var steps = Math.round(hundredths / 2); // number of 0.02 mm steps
    var snapped = steps * 0.02;
    var main = Math.floor(snapped + 1e-9);
    var vernierIndex = Math.round((snapped - main) / 0.02);
    return {
      netMm: net, netIn: net / 25.4,
      mainMm: neg ? -main : main, vernierIndex: vernierIndex,
      vernierMm: vernierIndex * 0.02, readingMm: neg ? -snapped : snapped,
      inchFraction: formatFractionalInch(net / 25.4, 64)
    };
  }

  /* ── pressure ── */
  var P0 = 101325;
  function pressureAtAltitude(h) {
    if (h < 0) return P0 + 1025 * 9.80665 * (-h);
    return P0 * Math.exp(-h / 8000);
  }

  /* Water's boiling point from the Antoine equation (valid ~1–100 °C range, extended gently).
     log10(P/mmHg) = A − B / (C + T). Capped so deep-water pressure does not run away. */
  function waterBoilingPointC(pa) {
    var mmHg = pa / 133.322387415;
    // Two ranges: 1–100 °C and 99–374 °C.
    var T;
    if (mmHg <= 760) T = 1730.63 / (8.07131 - Math.log10(mmHg)) - 233.426;
    else T = 1735.30 / (8.14019 - Math.log10(mmHg)) - 233.43;
    return Math.min(T, 374);
  }

  /* ── thermal ── */
  var KB_EV = 8.617333262e-5;
  function kineticStats(k) {
    k = Math.max(0, k);
    var regime = k === 0 ? 'ground state' : k < 77 ? 'cryogenic' : k < 273.15 ? 'frozen range' : k < 373.15 ? 'liquid water range' : k < 600 ? 'hot' : 'glowing';
    return {
      speedScale: k === 0 ? 0 : Math.sqrt(k / 293) * 1.5,
      vRmsMs: k === 0 ? 0 : Math.sqrt(3 * 1.380649e-23 * k / 4.65e-26), // N₂ molecule, 28 u
      meanEkMeV: 1.5 * KB_EV * k * 1000,
      regime: regime
    };
  }

  /* ── practice answers ── */
  function parsePracticeNumber(raw) {
    if (raw == null) return NaN;
    var s = String(raw).trim().replace(/,/g, '').replace(/\s+/g, ' ');
    var m = s.match(/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i);
    if (!m) return NaN;
    var rest = s.slice(m[0].length).trim();
    // Allow only a trailing unit word, never more arithmetic.
    if (rest && !/^[a-zA-Zµ°/²³ .]+$/.test(rest)) return NaN;
    return parseFloat(m[0]);
  }

  var SI_PREFIX_BY_EXP = {
    '-30': 'quecto-', '-27': 'ronto-', '-24': 'yocto-', '-21': 'zepto-', '-18': 'atto-', '-15': 'femto-', '-12': 'pico-',
    '-9': 'nano-', '-6': 'micro-', '-3': 'milli-', '-2': 'centi-', '-1': 'deci-', '0': 'base meter',
    '1': 'deca-', '2': 'hecto-', '3': 'kilo-', '6': 'mega-', '9': 'giga-', '12': 'tera-', '15': 'peta-',
    '18': 'exa-', '21': 'zetta-', '24': 'yotta-', '27': 'ronna-', '30': 'quetta-'
  };

  return {
    CATEGORIES: CATEGORIES, convertValue: convertValue, formatNumber: formatNumber,
    decomposeCaliper: decomposeCaliper, formatFractionalInch: formatFractionalInch,
    pressureAtAltitude: pressureAtAltitude, waterBoilingPointC: waterBoilingPointC,
    kineticStats: kineticStats, parsePracticeNumber: parsePracticeNumber, SI_PREFIX_BY_EXP: SI_PREFIX_BY_EXP
  };
}));
