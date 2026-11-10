// The Unit Factory's maths: unit catalogue, the facts that bridge one quantity to
// another, and the factor-label chains the machine shows. Pure: no DOM, no Three.js.
// Tests: node --test tests/unit-factory-core.test.mjs

export const INPUT = { value: 10, symbol: 'kg', name: 'kilograms' };

// [symbol, name, family, kind (what the 3D machine builds), fact]
export const UNITS = [
  ['kg', 'kilograms', 'Mass', 'weight', 'Mass measures how much matter an object contains.'],
  ['g', 'grams', 'Mass', 'weight', '1 kg = 1,000 g. Ten grams is a much smaller mass than ten kilograms.'],
  ['mg', 'milligrams', 'Mass', 'weight', '1 kg = 1,000,000 mg. Milligrams describe very small masses.'],
  ['lb', 'pounds', 'Mass', 'weight', '1 lb = 0.45359237 kg exactly. Pounds here describe mass.'],
  ['oz', 'ounces', 'Mass', 'weight', '16 avoirdupois ounces make one pound. These are mass ounces, not fluid ounces.'],
  ['t', 'tonnes', 'Mass', 'weight', '1 tonne = 1,000 kg. A 10 tonne object has 1,000 times the input mass.'],
  ['V', 'volts', 'Electricity', 'electric', 'Voltage is electric potential difference: energy transferred per unit of charge. Sparks are a cartoon symbol; 10 V does not imply visible lightning.'],
  ['A', 'amperes', 'Electricity', 'current', 'Current is the rate of flow of electric charge. 10 A and 10 V describe different quantities.'],
  ['Ω', 'ohms', 'Electricity', 'resistor', 'Resistance relates voltage to current. For an ohmic resistor, V = I × R.'],
  ['W', 'watts', 'Energy & power', 'bulb', 'Power is the rate of energy transfer. 10 W means 10 joules per second.'],
  ['J', 'joules', 'Energy & power', 'energy', 'Energy can be stored or transferred. A 10 J energy token does not specify how quickly it is used.'],
  ['L', 'litres', 'Volume', 'liquid', 'Volume measures occupied space. 10 L = 10,000 mL.'],
  ['mL', 'millilitres', 'Volume', 'drop', '1,000 mL = 1 L. This little vial represents just 10 mL.'],
  ['cm³', 'cubic centimetres', 'Volume', 'drop', '1 cm³ = 1 mL exactly: a cube 1 cm on each side holds one millilitre.'],
  ['m³', 'cubic metres', 'Volume', 'tank', '1 m³ = 1,000 L. A 10 m³ tank holds 10,000 L.'],
  ['mm', 'millimetres', 'Length', 'length', '10 mm = 1 cm. Length measures distance, not mass.'],
  ['cm', 'centimetres', 'Length', 'length', '10 cm = 100 mm. Ten centimetres is shorter than ten inches.'],
  ['in', 'inches', 'Length', 'length', '10 in = 25.4 cm exactly.'],
  ['ft', 'feet', 'Length', 'length', '10 ft = 3.048 m. One foot is exactly 12 inches.'],
  ['m', 'metres', 'Length', 'length', '10 m = 1,000 cm. Long outputs are scaled down to fit the factory.'],
  ['km', 'kilometres', 'Length', 'length', '10 km = 10,000 m. This is a model of a distance, not a full-size object.'],
  ['cm²', 'square centimetres', 'Area', 'area', 'Area measures a surface. A 2 cm × 5 cm rectangle has an area of 10 cm².'],
  ['m²', 'square metres', 'Area', 'area', 'A 2 m × 5 m floor covers 10 m². Area is measured in square units.'],
  ['s', 'seconds', 'Time', 'clock', 'Duration measures how long something lasts. 10 s is one sixth of a minute.'],
  ['min', 'minutes', 'Time', 'clock', '10 min = 600 s. This clock is a symbol for a duration.'],
  ['°C', 'degrees Celsius', 'Temperature', 'cold', '10 °C = 50 °F = 283.15 K. Cool, but water does not freeze at this temperature at ordinary pressure.'],
  ['K', 'kelvins', 'Temperature', 'ice', '10 K = −263.15 °C. Kelvin uses no degree symbol. The icy sculpture symbolizes extreme cold.'],
  ['N', 'newtons', 'Force', 'spring', 'Force is a push or pull. A 10 kg mass weighs about 98 N near Earth’s surface, not 10 N.'],
  ['lbf', 'pounds-force', 'Force', 'spring', '1 lbf = 4.4482216152605 N exactly: the pull of Earth’s standard gravity on one pound of mass.'],
  ['Hz', 'hertz', 'Frequency', 'wave', '10 Hz means 10 cycles per second. The visible wave is slowed down so you can inspect it.'],
].map(([symbol, name, family, kind, fact]) => ({ symbol, name, family, kind, fact }));

export const unitBySymbol = Object.fromEntries(UNITS.map((u) => [u.symbol, u]));

// Densities in kg per litre (= g/cm³), at room temperature and sea-level pressure
// unless noted. Wood and cork vary sample to sample; the note says so.
export const MATERIALS = [
  { id: 'gold', name: 'Gold', density: 19.32, color: 0xe2b33c, metal: true, note: 'Gold is the densest metal most people will ever hold.' },
  { id: 'lead', name: 'Lead', density: 11.34, color: 0x737d87, metal: true, note: 'Lead is dense enough to use as shielding and fishing weights.' },
  { id: 'iron', name: 'Iron', density: 7.874, color: 0x8a8f96, metal: true, note: 'Steel is mostly iron, so a steel weight is about this size.' },
  { id: 'aluminium', name: 'Aluminium', density: 2.70, color: 0xc9d1d9, metal: true, note: 'Aluminium is light for a metal, which is why aircraft use it.' },
  { id: 'glass', name: 'Glass', density: 2.5, color: 0x9fd8d0, glass: true, note: 'Window glass is about 2.5 times as dense as water.' },
  { id: 'water', name: 'Water', density: 1.0, color: 0x2a9fd6, glass: true, note: 'Water is the reference: about 1 kg per litre (exactly 0.99997 near 4 °C, 0.998 at 20 °C).' },
  { id: 'ice', name: 'Ice', density: 0.917, color: 0xcdeffa, glass: true, note: 'Ice is less dense than liquid water, so it floats.' },
  { id: 'oak', name: 'Oak wood', density: 0.75, color: 0xa0703f, note: 'Wood density varies from tree to tree; 0.75 kg/L is a typical dry oak.' },
  { id: 'cork', name: 'Cork', density: 0.24, color: 0xc89a62, note: 'Cork is mostly trapped air, so a little mass takes a lot of room.' },
  { id: 'air', name: 'Air', density: 0.0012, color: 0xdbeeff, glass: true, note: 'Air has mass too: about 1.2 g in every litre at sea level and 20 °C.' },
];
export const materialById = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

// Surface gravity in N/kg (= m/s²). Earth uses standard gravity; gas giants are
// measured at the cloud tops, where the pressure is about one Earth atmosphere.
export const WORLDS = [
  { id: 'pluto', name: 'Pluto', g: 0.62, color: 0xc9b39a },
  { id: 'moon', name: 'the Moon', g: 1.62, color: 0xbfc4c9 },
  { id: 'mercury', name: 'Mercury', g: 3.70, color: 0x9c8f86 },
  { id: 'mars', name: 'Mars', g: 3.71, color: 0xc1603a },
  { id: 'venus', name: 'Venus', g: 8.87, color: 0xe3c07a },
  { id: 'earth', name: 'Earth', g: 9.80665, color: 0x3f8fd8 },
  { id: 'jupiter', name: 'Jupiter', g: 24.79, color: 0xd2a679, note: 'Jupiter has no solid surface; this is the pull at its cloud tops.' },
];
export const worldById = Object.fromEntries(WORLDS.map((w) => [w.id, w]));

export const MODES = {
  fantasy: { label: 'Imagination: keep the number 10', short: 'Imagination' },
  real: { label: 'Real conversion: same mass, new unit', short: 'Same mass' },
  density: { label: 'Bridge with density: mass → volume', short: 'Density bridge' },
  gravity: { label: 'Bridge with gravity: mass → weight', short: 'Gravity bridge' },
};

const MASS_TO = ['kg', 'g', 'mg', 'lb', 'oz', 't'];
const VOLUME_TO = ['L', 'mL', 'cm³', 'm³'];
const FORCE_TO = ['N', 'lbf'];

/** The output units the machine accepts in a mode. */
export function unitsFor(mode) {
  if (mode === 'real') return UNITS.filter((u) => MASS_TO.includes(u.symbol));
  if (mode === 'density') return UNITS.filter((u) => VOLUME_TO.includes(u.symbol));
  if (mode === 'gravity') return UNITS.filter((u) => FORCE_TO.includes(u.symbol));
  return UNITS;
}

/** The mode a unit belongs to when the current one can't make it (for family shortcuts). */
export function modeFor(symbol, current) {
  if (unitsFor(current).some((u) => u.symbol === symbol)) return current;
  for (const mode of ['real', 'density', 'gravity']) if (unitsFor(mode).some((u) => u.symbol === symbol)) return mode;
  return 'fantasy';
}

const LB_KG = 0.45359237;
const LBF_N = 4.4482216152605;
// A conversion factor is a fraction equal to 1 (or, for a bridge, a measured rate).
const f = (top, topUnit, bottom, bottomUnit, kind = 'exact') => ({ top, topUnit, bottom, bottomUnit, kind });

const MASS_STEPS = {
  kg: [],
  g: [f(1000, 'g', 1, 'kg')],
  mg: [f(1000, 'g', 1, 'kg'), f(1000, 'mg', 1, 'g')],
  t: [f(1, 't', 1000, 'kg')],
  lb: [f(1, 'lb', LB_KG, 'kg')],
  oz: [f(1, 'lb', LB_KG, 'kg'), f(16, 'oz', 1, 'lb')],
};
const VOLUME_STEPS = {
  L: [],
  mL: [f(1000, 'mL', 1, 'L')],
  'cm³': [f(1000, 'cm³', 1, 'L')],
  'm³': [f(1, 'm³', 1000, 'L')],
};
const FORCE_STEPS = { N: [], lbf: [f(1, 'lbf', LBF_N, 'N')] };

/**
 * Run the machine. Returns { value, symbol, steps, approx, exact, bridge } where
 * `steps` are the factor-label fractions that turn 10 kg into the answer.
 * Imagination mode has no steps: the number stays 10 and the quantity changes.
 */
export function convert({ mode = 'fantasy', unit, material = 'water', world = 'earth' }) {
  const out = unitBySymbol[unit];
  if (!out) throw new Error(`Unknown unit ${unit}`);
  if (!unitsFor(mode).includes(out)) throw new Error(`${unit} is not available in ${mode} mode`);
  let steps = [];
  let bridge = null;
  if (mode === 'real') steps = MASS_STEPS[unit];
  else if (mode === 'density') {
    const m = materialById[material];
    if (!m) throw new Error(`Unknown material ${material}`);
    bridge = { type: 'density', material: m, rate: `${m.density} kg/L` };
    steps = [f(1, 'L', m.density, 'kg', 'measured'), ...VOLUME_STEPS[unit]];
  } else if (mode === 'gravity') {
    const w = worldById[world];
    if (!w) throw new Error(`Unknown world ${world}`);
    bridge = { type: 'gravity', world: w, rate: `${w.g} N/kg` };
    steps = [f(w.g, 'N', 1, 'kg', 'measured'), ...FORCE_STEPS[unit]];
  }
  if (mode === 'fantasy') return { value: INPUT.value, symbol: unit, steps: [], approx: false, exact: false, bridge: null, imaginary: true };
  const value = steps.reduce((v, s) => (v * s.top) / s.bottom, INPUT.value);
  const exact = steps.every((s) => s.kind === 'exact');
  // Repeating decimals (lb, oz) and measured rates are rounded for display.
  const approx = !exact || !isTidy(value);
  return { value, symbol: unit, steps, approx, exact, bridge, imaginary: false };
}

// True when the value has at most six decimal places (10,000 g, 0.01 t; not 22.0462… lb).
function isTidy(v) {
  const r = Number(v.toPrecision(12));
  return Math.abs(r * 1e6 - Math.round(r * 1e6)) < 1e-6;
}

/** Display a number the way the factory prints it: up to 4 significant decimals, grouped. */
export function format(value) {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 2 : abs >= 1 ? 3 : abs >= 0.01 ? 4 : 6;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

/** Every unit that appears on top must be cancelled below, leaving only the answer's unit. */
export function remainingUnit(steps, start = INPUT.symbol) {
  const count = new Map([[start, 1]]);
  for (const s of steps) {
    count.set(s.topUnit, (count.get(s.topUnit) || 0) + 1);
    count.set(s.bottomUnit, (count.get(s.bottomUnit) || 0) - 1);
  }
  const left = [...count].filter(([, n]) => n !== 0);
  return left.length === 1 && left[0][1] === 1 ? left[0][0] : null;
}

/** Grade a student's prediction against the machine's answer. */
export function gradePrediction(guess, answer) {
  if (!Number.isFinite(guess)) return null;
  if (answer === 0) return guess === 0 ? { grade: 'spot', ratio: 1 } : { grade: 'off', ratio: Infinity };
  const ratio = guess / answer;
  const err = Math.abs(ratio - 1);
  if (err <= 0.01) return { grade: 'spot', ratio };
  if (err <= 0.1) return { grade: 'close', ratio };
  // Off by a power of ten usually means the factor was flipped or a step was skipped.
  const decades = Math.log10(Math.abs(ratio));
  const tenish = ratio > 0 && Math.abs(decades - Math.round(decades)) < 0.02 && Math.round(decades) !== 0;
  const flipped = ratio > 0 && Math.abs(guess * answer - INPUT.value * INPUT.value) <= 0.02 * INPUT.value * INPUT.value;
  return { grade: 'off', ratio, tenPower: tenish ? Math.round(decades) : 0, flipped };
}

/** Side of a cube holding `litres`, in centimetres. */
export function cubeSideCm(litres) {
  return Math.cbrt(litres * 1000);
}
