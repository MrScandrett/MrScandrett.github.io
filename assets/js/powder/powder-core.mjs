// Powder Lab core: a falling-sand cellular automaton. Pure (no DOM), seeded, and
// deterministic, so every reaction is testable in Node. One cell = one particle.
//
// Per cell: type (element id), life (timer / growth budget / clone source),
// shade (colour jitter), charge (0 idle, 1 head, 2-3 refractory: electricity).
// Temperature (°C), phase-change budget and local oxygen travel with particles.
// Movement scans bottom-up; `stamp` stops a particle moving twice in one frame.

export const E = Object.freeze({
  EMPTY: 0, WALL: 1, SAND: 2, DIRT: 3, WATER: 4, OIL: 5, FIRE: 6, SMOKE: 7, STEAM: 8,
  WOOD: 9, PLANT: 10, SEED: 11, ICE: 12, LAVA: 13, STONE: 14, GLASS: 15, GUNPOWDER: 16,
  METAL: 17, SPARK: 18, SALT: 19, SALTWATER: 20, ACID: 21, MUD: 22, TORCH: 23,
  CLONE: 24, POWER: 25, HEATER: 26, COOLER: 27, VINEGAR: 28, BAKING: 29,
  CO2: 30, OXYGEN: 31, WAX: 32, MELTEDWAX: 33, IRON: 34, RUST: 35, ACETATE: 36
});

const STATIC = 0, POWDER = 1, LIQUID = 2, GAS = 3, ENERGY = 4;
export const KINDS = Object.freeze({ STATIC, POWDER, LIQUID, GAS, ENERGY });

// group drives the palette; hint is the science one-liner shown when it's picked.
export const ELEMENTS = [
  { id: E.EMPTY, key: 'erase', name: 'Erase', kind: STATIC, color: [12, 13, 20], group: 'tool',
    hint: 'Wipes away anything, even walls.' },
  { id: E.WALL, key: 'wall', name: 'Wall', kind: STATIC, color: [128, 128, 138], vary: 6, group: 'solid',
    hint: 'Unbreakable. Build containers, ramps and pipes.' },
  { id: E.SAND, key: 'sand', name: 'Sand', kind: POWDER, density: 1.6, color: [226, 196, 120], vary: 22, group: 'powder',
    hint: 'Piles at its angle of repose. Lava or lightning fuses it into glass.' },
  { id: E.DIRT, key: 'dirt', name: 'Dirt', kind: POWDER, density: 1.4, color: [120, 82, 48], vary: 22, group: 'powder',
    hint: 'Soaks up water into mud. Seeds sprout in it.' },
  { id: E.WATER, key: 'water', name: 'Water', kind: LIQUID, density: 1.0, color: [52, 112, 230], vary: 14, group: 'liquid',
    hint: 'Finds its own level. Puts out fire, boils to steam, quenches lava into stone.' },
  { id: E.OIL, key: 'oil', name: 'Oil', kind: LIQUID, density: 0.8, color: [92, 64, 30], vary: 10, group: 'liquid',
    hint: 'Less dense than water, so it floats on it. Very flammable.' },
  { id: E.FIRE, key: 'fire', name: 'Fire', kind: GAS, density: 0.05, color: [255, 140, 30], group: 'energy',
    hint: 'Combustion needs fuel, heat and oxygen. Water takes the heat away.' },
  { id: E.SMOKE, key: 'smoke', name: 'Smoke', kind: GAS, density: 0.1, color: [90, 90, 96], vary: 18, group: 'gas',
    hint: 'Hot, light gas from burning. It rises, cools and thins out.' },
  { id: E.STEAM, key: 'steam', name: 'Water vapor', kind: GAS, density: 0.2, color: [196, 206, 222], vary: 18, group: 'gas',
    hint: 'Invisible water gas, shown tinted here. Cooling to the model dew point makes liquid droplets.' },
  { id: E.WOOD, key: 'wood', name: 'Wood', kind: STATIC, color: [138, 92, 50], vary: 16, group: 'solid',
    hint: 'A solid fuel: once lit it burns slowly and drops embers.' },
  { id: E.PLANT, key: 'plant', name: 'Plant', kind: STATIC, color: [52, 168, 72], vary: 26, group: 'solid',
    hint: 'Drinks neighbouring water and grows into it. Burns.' },
  { id: E.SEED, key: 'seed', name: 'Seed', kind: POWDER, density: 1.2, color: [204, 170, 90], vary: 20, group: 'powder',
    hint: 'Drop on dirt and add water: it sprouts and grows a stem.' },
  { id: E.ICE, key: 'ice', name: 'Ice', kind: STATIC, color: [170, 220, 250], vary: 14, group: 'solid',
    hint: 'Solid water. Melts at 0 °C; freezing releases heat. Salt lowers the freezing point.' },
  { id: E.LAVA, key: 'lava', name: 'Lava', kind: LIQUID, density: 2.5, color: [240, 80, 20], vary: 30, group: 'liquid',
    hint: 'Molten rock above 700 °C. Water cools it into stone; it melts sand into glass.' },
  { id: E.STONE, key: 'stone', name: 'Stone', kind: POWDER, density: 2.4, color: [104, 100, 100], vary: 18, group: 'powder',
    hint: 'Heavy rubble. Lava turns into this when water cools it.' },
  { id: E.GLASS, key: 'glass', name: 'Glass', kind: STATIC, color: [176, 214, 220], vary: 10, group: 'solid',
    hint: 'Melted, cooled sand. Acid cannot eat it, so it makes a safe jar.' },
  { id: E.GUNPOWDER, key: 'gunpowder', name: 'Gunpowder', kind: POWDER, density: 1.3, color: [64, 64, 70], vary: 16, group: 'powder',
    hint: 'Fuel and oxidiser mixed together: one spark and it all goes at once.' },
  { id: E.METAL, key: 'metal', name: 'Metal', kind: STATIC, color: [150, 160, 176], vary: 10, group: 'solid',
    hint: 'Conducts heat and electricity. Compare its heat transfer with glass or wood.' },
  { id: E.SPARK, key: 'spark', name: 'Spark', kind: ENERGY, color: [255, 250, 160], group: 'energy',
    hint: 'Electricity. It runs through metal and salt water and lights what it touches.' },
  { id: E.SALT, key: 'salt', name: 'Salt', kind: POWDER, density: 1.5, color: [236, 236, 240], vary: 12, group: 'powder',
    hint: 'Dissolves into salt water and melts ice (why roads get salted).' },
  { id: E.SALTWATER, key: 'saltwater', name: 'Salt water', kind: LIQUID, density: 1.1, color: [64, 140, 206], vary: 14, group: 'liquid',
    hint: 'Dissolved ions carry current, so it conducts far better than pure water.' },
  { id: E.ACID, key: 'acid', name: 'Sandbox acid', kind: LIQUID, density: 1.05, color: [150, 240, 60], vary: 20, group: 'liquid',
    hint: 'Legacy fantasy solvent, not a real acid model. Choose Vinegar for acid–base chemistry.' },
  { id: E.MUD, key: 'mud', name: 'Mud', kind: POWDER, density: 1.7, color: [88, 60, 38], vary: 14, group: 'powder',
    hint: 'Wet dirt: slumps slowly. Heat dries it back into dirt.' },
  { id: E.TORCH, key: 'torch', name: 'Torch', kind: STATIC, color: [255, 190, 70], vary: 10, group: 'machine',
    hint: 'Burns forever. Put it under things to heat them.' },
  { id: E.CLONE, key: 'clone', name: 'Clone', kind: STATIC, color: [210, 200, 60], vary: 8, group: 'machine',
    hint: 'Copies the first material that touches it, forever. A tap, a spring, a volcano.' },
  { id: E.POWER, key: 'power', name: 'Battery', kind: STATIC, color: [230, 70, 90], vary: 8, group: 'machine',
    hint: 'Sends a pulse into touching conductors every half second; salt water carries it best.' },
  { id: E.HEATER, key: 'heater', name: 'Heater', kind: STATIC, color: [240, 80, 65], group: 'machine',
    hint: 'Powered plate held at 150 °C. Transfers heat through a container without flames.' },
  { id: E.COOLER, key: 'cooler', name: 'Cooler', kind: STATIC, color: [90, 180, 250], group: 'machine',
    hint: 'Powered plate held at −30 °C. Condense vapor or freeze water; removes heat continuously.' },
  { id: E.VINEGAR, key: 'vinegar', name: 'Vinegar', kind: LIQUID, density: 1.01, color: [236, 209, 149], vary: 8, group: 'liquid',
    hint: 'A mild acetic acid solution. Baking soda makes CO₂ bubbles and sodium acetate solution.' },
  { id: E.BAKING, key: 'baking', name: 'Baking soda', kind: POWDER, density: 1.3, color: [245, 239, 219], vary: 8, group: 'powder',
    hint: 'Sodium bicarbonate. Reacts with vinegar; both reactants are used up.' },
  { id: E.CO2, key: 'co2', name: 'Carbon dioxide', kind: GAS, density: 0.3, color: [166, 139, 189], group: 'gas',
    hint: 'Invisible gas shown purple. Bubbles through liquids, settles in air and displaces oxygen; does not fuel fire.' },
  { id: E.OXYGEN, key: 'oxygen', name: 'Oxygen', kind: GAS, density: 0.22, color: [138, 213, 221], group: 'gas',
    hint: 'Invisible gas shown cyan. Supports combustion but is not a fuel; flames consume it.' },
  { id: E.WAX, key: 'wax', name: 'Wax', kind: STATIC, color: [245, 221, 175], vary: 8, group: 'solid',
    hint: 'Model paraffin melts at 60 °C and solidifies on cooling. Real wax melts over a range; molten wax is fuel.' },
  { id: E.MELTEDWAX, key: 'meltedwax', name: 'Molten wax', kind: LIQUID, density: 0.85, color: [227, 189, 113], vary: 8, group: 'liquid',
    hint: 'Liquid wax; cool below 60 °C to solidify. Candle combustion is simplified (no wick or fuel vapor model).' },
  { id: E.IRON, key: 'iron', name: 'Iron', kind: STATIC, color: [130, 145, 160], vary: 8, group: 'solid',
    hint: 'Conducts heat and electricity. Moisture and oxygen form rust; salt water speeds this up.' },
  { id: E.RUST, key: 'rust', name: 'Rust', kind: POWDER, density: 2, color: [173, 82, 40], vary: 20, group: 'powder',
    hint: 'A new substance made by corrosion of iron. Rusting is greatly accelerated in this model.' },
  { id: E.ACETATE, key: 'acetate', name: 'Acetate solution', kind: LIQUID, density: 1.03, color: [169, 196, 170], group: 'liquid',
    hint: 'Water with dissolved sodium acetate, left after vinegar reacts with baking soda. Not table salt.' }
];

export const REACTIONS = [
  { key: 'quench', label: 'Lava + water → stone + steam' },
  { key: 'boil', label: 'Physical: boiling water → water vapor' },
  { key: 'burn', label: 'Fire + wood → embers' },
  { key: 'oilfire', label: 'Fire + oil → blaze' },
  { key: 'boom', label: 'Gunpowder explodes' },
  { key: 'melt', label: 'Physical: ice gains heat → water' },
  { key: 'freeze', label: 'Physical: water loses heat → ice' },
  { key: 'rain', label: 'Physical: water vapor condenses → liquid' },
  { key: 'dissolve', label: 'Salt + water → salt water' },
  { key: 'mud', label: 'Dirt + water → mud' },
  { key: 'sprout', label: 'Seed + dirt + water → plant' },
  { key: 'grow', label: 'Plant + water → more plant' },
  { key: 'glass', label: 'Sand + lava → glass' },
  { key: 'fulgurite', label: 'Spark + sand → glass (fulgurite)' },
  { key: 'circuit', label: 'Current flows through metal' },
  { key: 'brine', label: 'Current flows through salt water' },
  { key: 'corrode', label: 'Acid dissolves a solid' },
  { key: 'dry', label: 'Heat + mud → dirt' },
  { key: 'evaporate', label: 'Heat + salt water → salt + steam' },
  { key: 'deice', label: 'Salt + ice → water' },
  { key: 'shock', label: 'Electricity sets something alight' },
  { key: 'surface', label: 'Physical: surface water evaporates below boiling' },
  { key: 'fizz', label: 'Chemical: vinegar + baking soda → CO₂ + water + sodium acetate' },
  { key: 'waxmelt', label: 'Physical: solid wax → liquid wax' },
  { key: 'waxfreeze', label: 'Physical: liquid wax → solid wax' },
  { key: 'rust', label: 'Chemical: iron + oxygen + moisture → rust' },
  { key: 'smother', label: 'Combustion stops without enough oxygen' }
];
const R = Object.fromEntries(REACTIONS.map((r, i) => [r.key, i]));

const N = ELEMENTS.length;
const KIND = new Uint8Array(N), DENS = new Float32Array(N);
ELEMENTS.forEach(el => { KIND[el.id] = el.kind; DENS[el.id] = el.density || 0; });
DENS[E.SPARK] = 9;
// Chance per frame that a burning neighbour lights it.
const FLAM = new Float32Array(N);
FLAM[E.WOOD] = 0.1; FLAM[E.OIL] = 0.35; FLAM[E.PLANT] = 0.12; FLAM[E.SEED] = 0.15; FLAM[E.GUNPOWDER] = 1; FLAM[E.MELTEDWAX] = 0.12;
// Chance per frame that an idle conductor beside a pulse picks it up.
const COND = new Float32Array(N);
COND[E.METAL] = COND[E.IRON] = 1; COND[E.SALTWATER] = 0.95; COND[E.WATER] = 0.3;
// What acid can't eat.
const ACIDPROOF = new Uint8Array(N);
[E.EMPTY, E.WALL, E.GLASS, E.ACID, E.CLONE, E.POWER, E.FIRE, E.SMOKE, E.STEAM, E.SPARK].forEach(t => { ACIDPROOF[t] = 1; });

const NB8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWorld(width, height, seed = 1) {
  const size = width * height;
  return {
    W: width, H: height, frame: 0, tick: 0,
    type: new Uint8Array(size), life: new Uint8Array(size), shade: new Uint8Array(size),
    temperature: new Float32Array(size).fill(20), phase: new Float32Array(size),
    thermalNext: new Float32Array(size), oxygen: new Float32Array(size).fill(0.21),
    lastChange: new Uint8Array(size),
    charge: new Uint8Array(size), next: new Uint8Array(size), stamp: new Uint8Array(size),
    found: new Uint8Array(REACTIONS.length), rand: mulberry32(seed)
  };
}

export function clear(w) {
  w.temperature.fill(20); w.phase.fill(0); w.oxygen.fill(0.21); w.lastChange.fill(0);
  w.type.fill(0); w.life.fill(0); w.charge.fill(0); w.next.fill(0); w.stamp.fill(0);
}

export function defaultLife(w, t) {
  const r = w.rand();
  if (t === E.FIRE) return 12 + (r * 26) | 0;
  if (t === E.STEAM) return 140 + (r * 110) | 0;
  if (t === E.SMOKE) return 40 + (r * 70) | 0;
  if (t === E.SPARK) return 24;
  if (t === E.ICE) return 12;
  return 0;
}

export function initialTemperature(t) {
  return t === E.ICE ? -15 : t === E.STEAM ? 110 : t === E.FIRE ? 600 :
    t === E.LAVA ? 1000 : t === E.TORCH ? 650 : t === E.HEATER ? 150 :
    t === E.COOLER ? -30 : t === E.MELTEDWAX ? 80 : 20;
}
function set(w, i, t, life = 0) {
  w.temperature[i] = initialTemperature(t); w.phase[i] = 0; w.lastChange[i] = 0;
  w.oxygen[i] = t === E.EMPTY ? 0.21 : t === E.OXYGEN ? 1 : 0;
  w.type[i] = t; w.life[i] = life; w.shade[i] = (w.rand() * 256) | 0;
  w.charge[i] = 0; w.stamp[i] = w.tick;
}
function swap(w, i, j) {
  const { type, life, shade, charge } = w;
  let s = type[i]; type[i] = type[j]; type[j] = s;
  s = life[i]; life[i] = life[j]; life[j] = s;
  s = shade[i]; shade[i] = shade[j]; shade[j] = s;
  s = charge[i]; charge[i] = charge[j]; charge[j] = s;
  for (const field of ['temperature', 'phase', 'oxygen', 'lastChange']) {
    s = w[field][i]; w[field][i] = w[field][j]; w[field][j] = s;
  }
  w.stamp[i] = w.tick; w.stamp[j] = w.tick;
}
function idx(w, x, y) { return x < 0 || y < 0 || x >= w.W || y >= w.H ? -1 : y * w.W + x; }
function hot(w, j) {
  const t = w.type[j];
  return t === E.FIRE || t === E.LAVA || t === E.TORCH || (t === E.WOOD && w.life[j] > 0);
}

// Can mover m drop into a cell holding t (empty, or a lighter fluid)?
function sinksInto(m, t) {
  if (t === E.EMPTY) return true;
  const k = KIND[t];
  return (k === LIQUID || k === GAS) && DENS[t] < DENS[m];
}
function moveTo(w, i, x, y, test) {
  const j = idx(w, x, y);
  if (j < 0 || w.stamp[j] === w.tick || !test(w.type[i], w.type[j])) return false;
  // A diagonal must have an open route around the corner.
  const ox = i % w.W, oy = (i / w.W) | 0;
  if (x !== ox && y !== oy &&
      !test(w.type[i], w.type[oy * w.W + x]) &&
      !test(w.type[i], w.type[y * w.W + ox])) return false;
  swap(w, i, j);
  return true;
}
const rises = (m, t) => t === E.EMPTY || KIND[t] === LIQUID || (KIND[t] === GAS && t !== m && DENS[t] > DENS[m]);
const isEmpty = (m, t) => t === E.EMPTY;

function powder(w, x, y, i) {
  if (moveTo(w, i, x, y + 1, sinksInto)) return true;
  const d = w.rand() < 0.5 ? -1 : 1;
  return moveTo(w, i, x + d, y + 1, sinksInto) || moveTo(w, i, x - d, y + 1, sinksInto);
}

function liquid(w, x, y, i, spread) {
  if (moveTo(w, i, x, y + 1, sinksInto)) return;
  const d = w.rand() < 0.5 ? -1 : 1;
  if (moveTo(w, i, x + d, y + 1, sinksInto) || moveTo(w, i, x - d, y + 1, sinksInto)) return;
  for (const dir of [d, -d]) {
    let far = 0;
    for (let s = 1; s <= spread; s++) {
      const j = idx(w, x + dir * s, y);
      if (j < 0) break;
      const t = w.type[j];
      if (t !== E.EMPTY && KIND[t] !== GAS) break;
      far = s;
      // Stop at a ledge so a sheet of water pours over it.
      const below = idx(w, x + dir * s, y + 1);
      if (below >= 0 && sinksInto(w.type[i], w.type[below])) break;
    }
    if (far) {
      const target = y * w.W + x + dir * far;
      if (w.stamp[target] !== w.tick) { swap(w, i, target); return; }
    }
  }
}

function gas(w, x, y, i, upChance) {
  if (w.rand() < upChance) {
    const dx = ((w.rand() * 3) | 0) - 1;
    if (moveTo(w, i, x + dx, y - 1, rises) || moveTo(w, i, x, y - 1, rises)) return;
  }
  moveTo(w, i, x + (w.rand() < 0.5 ? -1 : 1), y, isEmpty);
}

// Walls and machine casings shield cells behind them from a blast.
const BLASTPROOF = new Set([E.WALL, E.METAL, E.CLONE, E.POWER, E.TORCH]);
function shielded(w, cx, cy, dx, dy) {
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  for (let s = 1; s < n; s++) {
    const j = idx(w, cx + Math.round(dx * s / n), cy + Math.round(dy * s / n));
    if (j >= 0 && BLASTPROOF.has(w.type[j])) return true;
  }
  return false;
}

export function explode(w, cx, cy, r) {
  w.found[R.boom] = 1;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const j = idx(w, cx + dx, cy + dy);
      if (j < 0) continue;
      const t = w.type[j];
      if (BLASTPROOF.has(t) || shielded(w, cx, cy, dx, dy)) continue;
      if (t === E.GUNPOWDER && (dx || dy)) { if (!w.life[j]) { w.life[j] = 1; w.stamp[j] = w.tick; } continue; } // fuse: goes off next frame
      if (w.rand() < 0.85) set(w, j, E.FIRE, 8 + (w.rand() * 22) | 0);
      else set(w, j, E.SMOKE, defaultLife(w, E.SMOKE));
    }
  }
}

// Something hot (or a live pulse) touches cell j. Returns true if it caught.
function ignite(w, j, electric) {
  const t = w.type[j];
  const chance = FLAM[t];
  if (!chance) return false;
  if (t === E.GUNPOWDER) {
    if (electric) w.found[R.shock] = 1;
    // Queue the fuse; never recurse through a large powder pile.
    if (!w.life[j]) { w.life[j] = 1; w.stamp[j] = w.tick; }
    return true;
  }
  // Ordinary fuel needs access to air; gunpowder carries its own oxidiser.
  let air = false;
  forNeighbours(w, j % w.W, (j / w.W) | 0, (_, n) => {
    if ((n === E.EMPTY || n === E.OXYGEN) && w.oxygen[_] > 0.05) air = true;
  });
  if (!air) return false;
  if (w.rand() >= (electric ? Math.max(chance, 0.3) : chance)) return false;
  if (electric) w.found[R.shock] = 1;
  if (t === E.WOOD) { if (!w.life[j]) { w.life[j] = 90 + (w.rand() * 120) | 0; w.found[R.burn] = 1; } }
  else {
    if (t === E.OIL) w.found[R.oilfire] = 1;
    set(w, j, E.FIRE, t === E.OIL ? 30 + (w.rand() * 30) | 0 : defaultLife(w, E.FIRE));
  }
  return true;
}

function forNeighbours(w, x, y, fn) {
  for (let k = 0; k < 8; k++) {
    const j = idx(w, x + NB8[k][0], y + NB8[k][1]);
    if (j >= 0) {
      const [dx, dy] = NB8[k];
      if (dx && dy && KIND[w.type[y * w.W + x + dx]] === STATIC &&
          w.type[y * w.W + x + dx] !== E.EMPTY &&
          KIND[w.type[(y + dy) * w.W + x]] === STATIC &&
          w.type[(y + dy) * w.W + x] !== E.EMPTY) continue;
      if (fn(j, w.type[j]) === false) return;
    }
  }
}
function randomNeighbour(w, x, y) {
  const o = NB8[(w.rand() * 8) | 0];
  return idx(w, x + o[0], y + o[1]);
}

function electricEffects(w, x, y) {
  forNeighbours(w, x, y, (j, t) => {
    if (t === E.SAND && w.rand() < 0.02) { set(w, j, E.GLASS); w.found[R.fulgurite] = 1; }
    else if (FLAM[t]) ignite(w, j, true);
  });
}

const UPDATE = [];
UPDATE[E.SAND] = UPDATE[E.DIRT] = UPDATE[E.STONE] = UPDATE[E.SALT] = (w, x, y, i) => powder(w, x, y, i);

UPDATE[E.GUNPOWDER] = (w, x, y, i) => {
  if (w.life[i]) { explode(w, x, y, 4); return; }
  powder(w, x, y, i);
};

UPDATE[E.MUD] = (w, x, y, i) => {
  if (w.rand() < 0.08) {
    const j = randomNeighbour(w, x, y);
    if (j >= 0 && hot(w, j)) { set(w, i, E.DIRT); w.found[R.dry] = 1; return; }
  }
  if (w.rand() < 0.35) powder(w, x, y, i);
};

UPDATE[E.SEED] = (w, x, y, i) => {
  if (powder(w, x, y, i)) return;
  const below = idx(w, x, y + 1);
  const ground = below >= 0 ? w.type[below] : E.WALL;
  if (ground !== E.DIRT && ground !== E.MUD) return;
  let water = -1;
  forNeighbours(w, x, y, (j, t) => { if (t === E.WATER) { water = j; return false; } });
  if (ground === E.MUD || water >= 0) {
    if (water >= 0) set(w, water, E.EMPTY);
    else set(w, below, E.DIRT);
    set(w, i, E.PLANT, 14 + (w.rand() * 26) | 0);
    w.found[R.sprout] = 1;
  }
};

UPDATE[E.PLANT] = (w, x, y, i) => {
  const budget = w.life[i];
  if (budget) {
    if (w.rand() > 0.18) return;
    const dx = w.rand() < 0.6 ? 0 : (w.rand() < 0.5 ? -1 : 1);
    const j = idx(w, x + dx, y - 1);
    if (j >= 0 && (w.type[j] === E.EMPTY || w.type[j] === E.WATER)) {
      set(w, j, E.PLANT, budget - 1);
      if (budget === 1) { // leaves at the top of the stem
        for (let k = 0; k < 8; k++) {
          const leaf = idx(w, x + ((w.rand() * 7) | 0) - 3, y - 1 - ((w.rand() * 4) | 0));
          if (leaf >= 0 && w.type[leaf] === E.EMPTY) set(w, leaf, E.PLANT);
        }
      }
    }
    w.life[i] = 0;
    return;
  }
  if (w.rand() < 0.05) {
    const j = randomNeighbour(w, x, y);
    if (j >= 0 && w.type[j] === E.WATER) { set(w, j, E.PLANT); w.found[R.grow] = 1; }
  }
};

UPDATE[E.WATER] = (w, x, y, i) => {
  if (w.charge[i] === 1) electricEffects(w, x, y);
  const j = randomNeighbour(w, x, y);
  if (j >= 0) {
    const t = w.type[j];
    if (t === E.SALT) {
      const temp = w.temperature[i];
      set(w, j, E.EMPTY); set(w, i, E.SALTWATER); w.temperature[i] = temp;
      w.found[R.dissolve] = 1; return;
    }
    else if (t === E.DIRT && w.rand() < 0.15) { set(w, j, E.MUD); set(w, i, E.EMPTY); w.found[R.mud] = 1; return; }
  }
  liquid(w, x, y, i, 5);
};

UPDATE[E.SALTWATER] = (w, x, y, i) => {
  if (w.charge[i] === 1) electricEffects(w, x, y);
  liquid(w, x, y, i, 4);
};

UPDATE[E.OIL] = (w, x, y, i) => liquid(w, x, y, i, 3);

UPDATE[E.ACID] = (w, x, y, i) => {
  const j = randomNeighbour(w, x, y);
  if (j >= 0 && !ACIDPROOF[w.type[j]] && w.rand() < 0.2) {
    const solid = KIND[w.type[j]] !== LIQUID;
    set(w, j, w.rand() < 0.25 ? E.SMOKE : E.EMPTY, defaultLife(w, E.SMOKE));
    if (solid) w.found[R.corrode] = 1;
    if (w.rand() < 0.3) { set(w, i, E.EMPTY); return; }
  }
  liquid(w, x, y, i, 3);
};

function deposit(w, x, y, t) {
  let placed = false;
  forNeighbours(w, x, y, (j, n) => {
    if (n === E.EMPTY) { set(w, j, t, defaultLife(w, t)); placed = true; return false; }
  });
  return placed;
}
const depositSalt = (w, x, y) => deposit(w, x, y, E.SALT);

UPDATE[E.LAVA] = (w, x, y, i) => {
  let cooled = false;
  forNeighbours(w, x, y, (j, t) => {
    if (t === E.WATER || t === E.SALTWATER) {
      if (t === E.SALTWATER && !depositSalt(w, x, y)) return;
      set(w, j, E.STEAM, defaultLife(w, E.STEAM));
      set(w, i, E.STONE); w.temperature[i] = 200;
      w.found[R.quench] = 1;
      if (t === E.SALTWATER) w.found[R.evaporate] = 1;
      if (t === E.WATER) w.found[R.boil] = 1;
      cooled = true;
      return false;
    }
    if (t === E.SAND && w.rand() < 0.012) { set(w, j, E.GLASS); w.found[R.glass] = 1; }
    else if (FLAM[t]) ignite(w, j, false);
  });
  if (cooled) return;
  const up = idx(w, x, y - 1);
  if (up >= 0 && w.type[up] === E.EMPTY && w.rand() < 0.004) set(w, up, E.FIRE, 6 + (w.rand() * 8) | 0);
  if (w.rand() < 0.45) liquid(w, x, y, i, 1);
};

UPDATE[E.FIRE] = (w, x, y, i) => {
  let fuel = false, wet = false, air = -1;
  forNeighbours(w, x, y, (j, t) => {
    if (t === E.WATER || t === E.SALTWATER) { w.temperature[j] += 8; wet = true; }
    if ((t === E.EMPTY || t === E.OXYGEN) && w.oxygen[j] > 0.05) air = j;
    if (FLAM[t]) { fuel = true; ignite(w, j, false); }
  });
  if (air >= 0) w.oxygen[air] = Math.max(0, w.oxygen[air] - 0.012);
  if (wet || air < 0 || w.life[i] <= 1) {
    if (air < 0) w.found[R.smother] = 1;
    set(w, i, E.CO2); w.temperature[i] = wet ? 30 : 150; return;
  }
  w.life[i]--;
  if (!fuel || w.rand() < 0.15) gas(w, x, y, i, 0.65);
};

UPDATE[E.SMOKE] = (w, x, y, i) => {
  const life = w.life[i];
  if (life <= 1) { set(w, i, E.EMPTY); return; }
  w.life[i] = life - 1;
  gas(w, x, y, i, 0.7);
};

UPDATE[E.STEAM] = (w, x, y, i) => gas(w, x, y, i, 0.75);

UPDATE[E.WOOD] = (w, x, y, i) => {
  if (!w.life[i]) return;
  let wet = false, air = false;
  forNeighbours(w, x, y, (j, t) => {
    if (t === E.WATER || t === E.SALTWATER) { w.temperature[j] += 4; wet = true; }
    if ((t === E.EMPTY || t === E.OXYGEN) && w.oxygen[j] > 0.05) {
      air = true; w.oxygen[j] = Math.max(0, w.oxygen[j] - 0.002);
      if (w.rand() < 0.08) set(w, j, E.FIRE, 20);
    } else if (FLAM[t]) ignite(w, j, false);
  });
  if (!air && !wet) {
    // A flame occupies space between fuel and air; do not treat that flame
    // cell as an airtight lid over the burning surface.
    forNeighbours(w, x, y, (j,t) => {
      if (t !== E.FIRE) return;
      forNeighbours(w, j % w.W, (j / w.W) | 0, (n,material) => {
        if ((material === E.EMPTY || material === E.OXYGEN) && w.oxygen[n] > 0.05) {
          air = true; w.oxygen[n] = Math.max(0, w.oxygen[n] - 0.002); return false;
        }
      });
    });
  }
  if (wet || !air) { w.life[i] = 0; return; }
  w.temperature[i] = Math.max(300, w.temperature[i]);
  if (--w.life[i] <= 1) { set(w, i, E.CO2); w.temperature[i] = 150; }
};

UPDATE[E.ICE] = (w, x, y, i) => {
  const j = randomNeighbour(w, x, y);
  if (j >= 0 && w.type[j] === E.SALT && w.temperature[i] >= -5) {
    const temp = w.temperature[i];
    set(w, i, E.SALTWATER); w.temperature[i] = temp; set(w, j, E.EMPTY);
    w.found[R.deice] = 1;
  }
};

UPDATE[E.METAL] = (w, x, y, i) => { if (w.charge[i] === 1) electricEffects(w, x, y); };

UPDATE[E.TORCH] = (w, x, y, i) => {
  const j = idx(w, x, y - 1);
  if (j >= 0 && w.type[j] === E.EMPTY && w.rand() < 0.3) set(w, j, E.FIRE, 20);
};

UPDATE[E.BAKING] = (w, x, y, i) => powder(w, x, y, i);
UPDATE[E.RUST] = (w, x, y, i) => powder(w, x, y, i);
UPDATE[E.ACETATE] = (w, x, y, i) => liquid(w, x, y, i, 4);
UPDATE[E.VINEGAR] = (w, x, y, i) => {
  let reacted = false;
  forNeighbours(w, x, y, (j, t) => {
    if (t !== E.BAKING) return;
    const temp = (w.temperature[i] + w.temperature[j]) / 2 - 3;
    set(w, j, E.CO2); set(w, i, E.ACETATE);
    w.temperature[i] = w.temperature[j] = temp;
    w.lastChange[i] = R.fizz + 1; w.found[R.fizz] = 1;
    reacted = true; return false;
  });
  if (!reacted) liquid(w, x, y, i, 4);
};
UPDATE[E.OXYGEN] = (w, x, y, i) => {
  if (w.oxygen[i] < 0.05) { set(w, i, E.EMPTY); w.oxygen[i] = 0; return; }
  gas(w, x, y, i, 0.3);
};
UPDATE[E.CO2] = (w, x, y, i) => {
  if (w.temperature[i] > 60) { gas(w, x, y, i, 0.7); return; }
  const below = idx(w, x, y + 1);
  if (below >= 0 && KIND[w.type[below]] === LIQUID) { gas(w, x, y, i, 0.8); return; }
  let submerged = false;
  forNeighbours(w, x, y, (_, t) => { if (KIND[t] === LIQUID) submerged = true; });
  if (submerged) gas(w, x, y, i, 0.8);
  else if (!moveTo(w, i, x, y + 1, (m, t) => t === E.EMPTY || t === E.OXYGEN))
    moveTo(w, i, x + (w.rand() < 0.5 ? -1 : 1), y, isEmpty);
};
UPDATE[E.MELTEDWAX] = (w, x, y, i) => liquid(w, x, y, i, 2);
UPDATE[E.IRON] = (w, x, y, i) => {
  UPDATE[E.METAL](w, x, y, i);
  let moisture = false, salty = false, oxygen = -1;
  forNeighbours(w, x, y, (j, t) => {
    if (t === E.WATER || t === E.SALTWATER) moisture = true;
    if (t === E.SALTWATER) salty = true;
    if ((t === E.EMPTY || t === E.OXYGEN) && w.oxygen[j] > 0.05) oxygen = j;
  });
  if (moisture && oxygen >= 0 && w.rand() < (salty ? 0.006 : 0.0006)) {
    w.oxygen[oxygen] = Math.max(0, w.oxygen[oxygen] - 0.05);
    set(w, i, E.RUST); w.lastChange[i] = R.rust + 1; w.found[R.rust] = 1;
  }
};

UPDATE[E.CLONE] = (w, x, y, i) => {
  const source = w.life[i];
  if (!source) {
    forNeighbours(w, x, y, (j, t) => {
      if (t !== E.EMPTY && t !== E.CLONE && t !== E.WALL && t !== E.POWER) { w.life[i] = t; return false; }
    });
    return;
  }
  const j = randomNeighbour(w, x, y);
  if (j >= 0 && w.type[j] === E.EMPTY && w.rand() < 0.5) set(w, j, source, defaultLife(w, source));
};

UPDATE[E.POWER] = (w, x, y, i) => {
  if ((w.frame + i) % 30) return;
  forNeighbours(w, x, y, (j, t) => { if (COND[t] && !w.charge[j]) w.charge[j] = 1; });
};

UPDATE[E.SPARK] = (w, x, y, i) => {
  let spent = false;
  forNeighbours(w, x, y, (j, t) => {
    if (COND[t]) { if (!w.charge[j]) w.charge[j] = 1; spent = true; return false; }
    if (t === E.SAND && w.rand() < 0.3) { set(w, j, E.GLASS); w.found[R.fulgurite] = 1; spent = true; }
    else if (FLAM[t] && ignite(w, j, true)) spent = true;
  });
  const life = w.life[i];
  if (spent || life <= 1) { set(w, i, E.EMPTY); return; }
  w.life[i] = life - 1;
  // A bolt falls fast and jitters sideways.
  let cx = x, cy = y, at = i;
  for (let s = 0; s < 3; s++) {
    const nx = cx + ((w.rand() * 3) | 0) - 1;
    const j = idx(w, nx, cy + 1);
    if (j < 0 || w.type[j] !== E.EMPTY) break;
    swap(w, at, j); at = j; cx = nx; cy++;
  }
};

// Classroom thermal model: equal effective cell heat capacities, conservative
// face-to-face conduction, and finite phase-change budgets. Time, gas volume,
// latent heats and brine concentration are illustrative, not quantitative.
const conductivity = t => t === E.WALL ? 0 : t === E.METAL || t === E.IRON ? 0.22 :
  t === E.WOOD || t === E.WAX ? 0.008 : t === E.GLASS ? 0.025 :
  t === E.EMPTY || KIND[t] === GAS ? 0.006 : 0.09;
function changePhase(w, i, t, key, temperature) {
  set(w, i, t, defaultLife(w, t)); w.temperature[i] = temperature;
  w.lastChange[i] = R[key] + 1; w.found[R[key]] = 1;
}
function updateThermal(w) {
  const { W, H, type, temperature: T, thermalNext: next } = w;
  next.set(T);
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    for (const j of [x + 1 < W ? i + 1 : -1, y + 1 < H ? i + W : -1]) {
      if (j < 0) continue;
      const k = Math.min(conductivity(type[i]), conductivity(type[j]));
      const q = (T[j] - T[i]) * k;
      next[i] += q; next[j] -= q;
      // Diffusion of oxygen in air; a sealed pocket can run out.
      if ((type[i] === E.EMPTY || type[i] === E.OXYGEN) &&
          (type[j] === E.EMPTY || type[j] === E.OXYGEN)) {
        const gas = (w.oxygen[j] - w.oxygen[i]) * 0.05;
        w.oxygen[i] += gas; w.oxygen[j] -= gas;
      }
    }
  }
  T.set(next);
  for (let i = 0; i < type.length; i++) {
    const t = type[i], y = (i / W) | 0, x = i % W;
    // Open top exchanges with room air; upper atmosphere is cooler in this model.
    if (t === E.EMPTY || KIND[t] === GAS) T[i] += ((20 - 20 * (1 - y / H)) - T[i]) * 0.002;
    if (y === 0 && t === E.EMPTY) w.oxygen[i] += (0.21 - w.oxygen[i]) * 0.1;
    if (t === E.HEATER) T[i] = 150;
    if (t === E.COOLER) T[i] = -30;
    if (t === E.TORCH) T[i] = 650;
    if (t === E.FIRE) T[i] = Math.max(T[i], 450);
    if (FLAM[t] && T[i] >= (t === E.GUNPOWDER ? 200 : 300)) ignite(w, i, false);
    if (t === E.ICE && T[i] >= 0) {
      w.phase[i] = Math.min(12, w.phase[i] + T[i]); T[i] = 0;
      if (w.phase[i] >= 12) changePhase(w, i, E.WATER, 'melt', 0);
    } else if (t === E.WATER || t === E.SALTWATER) {
      const boiling = t === E.WATER ? 100 : 102;
      if (T[i] >= boiling) {
        w.phase[i] = Math.min(35, w.phase[i] + T[i] - boiling); T[i] = boiling;
        if (w.phase[i] >= 35) {
          if (t === E.SALTWATER && !depositSalt(w, x, y)) continue;
          changePhase(w, i, E.STEAM, t === E.WATER ? 'boil' : 'evaporate', boiling);
        }
      } else if (t === E.WATER && T[i] <= 0) {
        w.phase[i] = Math.min(12, w.phase[i] - T[i]); T[i] = 0;
        if (w.phase[i] >= 12) changePhase(w, i, E.ICE, 'freeze', 0);
      } else {
        w.phase[i] = 0;
        const up = idx(w, x, y - 1);
        if (T[i] > 0 && up >= 0 && type[up] === E.EMPTY && w.rand() < 0.00002 * (1 + T[i] / 10)) {
          if (t === E.SALTWATER && !depositSalt(w, x, y)) continue;
          changePhase(w, i, E.STEAM, t === E.WATER ? 'surface' : 'evaporate', Math.max(0, T[i] - 5));
        }
      }
    } else if (t === E.STEAM && T[i] <= 10) {
      changePhase(w, i, E.WATER, 'rain', 15);
    } else if (t === E.WAX && T[i] >= 60) changePhase(w, i, E.MELTEDWAX, 'waxmelt', 60);
    else if (t === E.MELTEDWAX && T[i] < 60) changePhase(w, i, E.WAX, 'waxfreeze', 60);
  }
}

export function thermalBrush(w, cx, cy, r, delta) {
  for (let y = Math.max(0, cy-r); y <= Math.min(w.H-1, cy+r); y++)
    for (let x = Math.max(0, cx-r); x <= Math.min(w.W-1, cx+r); x++) {
      if ((x-cx)**2 + (y-cy)**2 > r*r+r) continue;
      const i = y*w.W+x;
      w.temperature[i] = Math.max(-100, Math.min(1200, w.temperature[i] + delta));
    }
}
export function inspect(w, x, y) {
  const i = idx(w, x, y);
  if (i < 0) return null;
  const t = w.type[i];
  return { name: t === E.EMPTY ? 'Air' : ELEMENTS[t].name,
    state: t === E.SPARK ? 'electrical pulse' : t === E.FIRE ? 'combustion' :
      t === E.EMPTY || KIND[t] === GAS ? 'gas' : KIND[t] === LIQUID ? 'liquid' : 'solid',
    temperature: Math.round(w.temperature[i]),
    oxygen: t === E.EMPTY || t === E.OXYGEN ? Math.round(w.oxygen[i] * 100) : null,
    change: w.lastChange[i] ? REACTIONS[w.lastChange[i]-1].label : null };
}

// Electricity: head → refractory → refractory → idle, so pulses travel as a
// wave instead of sloshing back. Double-buffered, so it moves one cell a frame.
function updateCharge(w) {
  const { W, H, type, charge: C, next: Nx, found } = w;
  for (let y = 0, i = 0; y < H; y++) {
    for (let x = 0; x < W; x++, i++) {
      const t = type[i];
      const cond = COND[t];
      const c = C[i];
      if (!cond) { Nx[i] = 0; continue; }
      if (c === 1) Nx[i] = 2;
      else if (c === 2) Nx[i] = 3;
      else if (c === 3) Nx[i] = 0;
      else if ((x > 0 && C[i - 1] === 1) || (x < W - 1 && C[i + 1] === 1) ||
               (y > 0 && C[i - W] === 1) || (y < H - 1 && C[i + W] === 1)) {
        if (cond >= 1 || w.rand() < cond) {
          Nx[i] = 1;
          if (t === E.METAL) found[R.circuit] = 1;
          else if (t === E.SALTWATER) found[R.brine] = 1;
        } else Nx[i] = 0;
      } else Nx[i] = 0;
    }
  }
  w.charge = Nx; w.next = C;
}

export function step(w) {
  w.frame++;
  w.tick = w.tick >= 255 ? 1 : w.tick + 1;
  if (w.tick === 1) w.stamp.fill(0);
  updateCharge(w);
  updateThermal(w);
  const { W, H, type, stamp } = w;
  for (let y = H - 1; y >= 0; y--) {
    const flip = w.rand() < 0.5;
    for (let k = 0; k < W; k++) {
      const x = flip ? W - 1 - k : k;
      const i = y * W + x;
      const t = type[i];
      if (t === E.EMPTY || t === E.WALL || t === E.GLASS || stamp[i] === w.tick) continue;
      const fn = UPDATE[t];
      if (fn) fn(w, x, y, i);
    }
  }
}

// Brush: fills a disc. Loose materials are sprinkled so they pour naturally;
// only empty cells are filled (Erase and Spark are the exceptions).
export function paint(w, cx, cy, r, t) {
  const kind = KIND[t];
  const density = t === E.SPARK ? 0.06 : kind === POWDER || kind === LIQUID ? 0.5 : kind === GAS ? 0.4 : 1;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r) continue;
      const j = idx(w, cx + dx, cy + dy);
      if (j < 0) continue;
      const here = w.type[j];
      if (t === E.EMPTY) { set(w, j, E.EMPTY); continue; }
      if (t === E.SPARK && COND[here]) { if (!w.charge[j]) w.charge[j] = 1; continue; }
      if (here !== E.EMPTY || (density < 1 && w.rand() > density)) continue;
      set(w, j, t, defaultLife(w, t));
    }
  }
}

// Wind brush: shove loose particles in the brush up to `strength` cells along (dx, dy).
export function blow(w, cx, cy, r, dx, dy, strength = 3) {
  const len = Math.hypot(dx, dy);
  if (!len) return;
  const ux = dx / len, uy = dy / len;
  const cells = [];
  for (let oy = -r; oy <= r; oy++) {
    for (let ox = -r; ox <= r; ox++) {
      if (ox * ox + oy * oy > r * r + r) continue;
      const j = idx(w, cx + ox, cy + oy);
      if (j >= 0 && w.type[j] !== E.EMPTY && KIND[w.type[j]] !== STATIC) cells.push([cx + ox, cy + oy, ox * ux + oy * uy]);
    }
  }
  cells.sort((a, b) => b[2] - a[2]); // leading edge first so particles don't block each other
  for (const [x, y] of cells) {
    let at = idx(w, x, y);
    for (let s = 1; s <= strength; s++) {
      const j = idx(w, x + Math.round(ux * s), y + Math.round(uy * s));
      if (j < 0 || j === at) continue;
      if (w.type[j] !== E.EMPTY) break;
      swap(w, at, j); at = j;
    }
  }
}

export function count(w) {
  let n = 0;
  for (let i = 0; i < w.type.length; i++) if (w.type[i] !== E.EMPTY && w.type[i] !== E.WALL) n++;
  return n;
}

// Colours ----------------------------------------------------------------
const pack = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r; // little-endian RGBA
const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
const LUT = new Uint32Array(N * 16);
ELEMENTS.forEach(el => {
  for (let s = 0; s < 16; s++) {
    const v = ((s / 15) - 0.5) * 2 * (el.vary || 0);
    LUT[el.id * 16 + s] = pack(clamp(el.color[0] + v), clamp(el.color[1] + v), clamp(el.color[2] + v));
  }
});
const FIRE_LUT = new Uint32Array(64);
for (let l = 0; l < 64; l++) {
  const t = Math.min(1, l / 30);
  FIRE_LUT[l] = pack(255, clamp(60 + 190 * t), clamp(10 + 120 * t * t));
}
const HEAD = pack(255, 255, 210), TAIL = pack(110, 190, 255), EMBER = pack(255, 120, 40);

// Writes one pixel per cell into a Uint32Array view of ImageData.
export function render(w, out, thermal = false) {
  const { type, life, shade, charge, frame } = w;
  for (let i = 0; i < type.length; i++) {
    const t = type[i];
    const c = charge[i];
    if (thermal && t !== E.EMPTY) {
      const heat = Math.max(0, Math.min(1, (w.temperature[i] + 30) / 180));
      out[i] = pack(255 * heat, 80 + 80 * (1-Math.abs(heat*2-1)), 255 * (1-heat));
    } else if (c === 1) out[i] = HEAD;
    else if (c === 2) out[i] = TAIL;
    else if (t === E.FIRE) out[i] = FIRE_LUT[Math.min(63, life[i] + (shade[i] & 7))];
    else if (t === E.LAVA) out[i] = LUT[t * 16 + (((shade[i] >> 4) + (frame >> 2)) & 15)];
    else if (t === E.WOOD && life[i]) out[i] = (shade[i] + frame) & 4 ? EMBER : LUT[t * 16 + (shade[i] >> 4)];
    else if (t === E.SPARK) out[i] = HEAD;
    else out[i] = LUT[t * 16 + (t ? shade[i] >> 4 : 0)];
  }
}

// Save format: run-length "type[.life]*count" tokens in base 36. Life is kept
// only where it is state worth saving (clone source, growth, legacy ice metadata).
// Optional thermal fields are RLE snapshots; old files get material temperatures.
export function encode(w) {
  const { type, life } = w;
  const keep = t => t === E.CLONE || t === E.PLANT || t === E.ICE;
  const parts = [];
  let i = 0;
  while (i < type.length) {
    const t = type[i], l = keep(t) ? life[i] : 0;
    let n = 1;
    while (i + n < type.length && type[i + n] === t && (keep(t) ? life[i + n] : 0) === l) n++;
    parts.push(t.toString(36) + (l ? '.' + l.toString(36) : '') + (n > 1 ? '*' + n.toString(36) : ''));
    i += n;
  }
  const rle = (values, scale = 10) => {
    const tokens = [];
    for (let j = 0; j < values.length;) {
      const v = Math.round(values[j] * scale); let n = 1;
      while (j+n < values.length && Math.round(values[j+n]*scale) === v) n++;
      tokens.push(v.toString(36) + (n > 1 ? '*' + n.toString(36) : '')); j += n;
    }
    return tokens.join(',');
  };
  return { width: w.W, height: w.H, cells: parts.join(','),
    temperature: rle(w.temperature), phase: rle(w.phase), oxygen: rle(w.oxygen, 1000), discoveries: Array.from(w.found) };
}

export function decode(w, data) {
  if (!data || data.width !== w.W || data.height !== w.H || typeof data.cells !== 'string') {
    throw new Error('Powder grid does not match this board.');
  }
  const size = w.W * w.H;
  const type = new Uint8Array(size), life = new Uint8Array(size);
  let i = 0;
  for (const token of data.cells.split(',')) {
    const m = /^([0-9a-z]+)(?:\.([0-9a-z]+))?(?:\*([0-9a-z]+))?$/.exec(token);
    if (!m) throw new Error('Powder grid is damaged.');
    const t = parseInt(m[1], 36), l = m[2] ? parseInt(m[2], 36) : 0, n = m[3] ? parseInt(m[3], 36) : 1;
    if (t >= N || l > 255 || n < 1 || i + n > size) throw new Error('Powder grid is damaged.');
    type.fill(t, i, i + n); life.fill(l, i, i + n);
    i += n;
  }
  if (i !== size) throw new Error('Powder grid is damaged.');
  const readField = (key, min, max, scale = 10) => {
    if (data[key] === undefined) return null;
    if (typeof data[key] !== 'string') throw new Error('Powder thermal data is damaged.');
    const out = new Float32Array(size); let at = 0;
    for (const token of data[key].split(',')) {
      const m = /^(-?[0-9a-z]+)(?:\*([0-9a-z]+))?$/.exec(token);
      if (!m) throw new Error('Powder thermal data is damaged.');
      const v = parseInt(m[1], 36)/scale, n = m[2] ? parseInt(m[2], 36) : 1;
      if (!Number.isFinite(v) || v < min || v > max || n < 1 || at+n > size) throw new Error('Powder thermal data is damaged.');
      out.fill(v, at, at+n); at += n;
    }
    if (at !== size) throw new Error('Powder thermal data is damaged.');
    return out;
  };
  const temperatures = readField('temperature', -100, 2000);
  const phases = readField('phase', 0, 2000), oxygen = readField('oxygen', 0, 1, 1000);
  if (data.discoveries !== undefined && (!Array.isArray(data.discoveries) || data.discoveries.length > REACTIONS.length || data.discoveries.some(v => v !== 0 && v !== 1))) throw new Error('Powder discoveries are damaged.');
  clear(w); w.found.fill(0);
  if (data.discoveries) w.found.set(data.discoveries);
  for (let k = 0; k < size; k++) {
    w.temperature[k] = temperatures ? temperatures[k] : initialTemperature(type[k]);
    w.oxygen[k] = oxygen ? oxygen[k] : type[k] === E.EMPTY ? 0.21 : type[k] === E.OXYGEN ? 1 : 0;
  }
  if (phases) w.phase.set(phases);
  w.type.set(type); w.life.set(life);
  for (let k = 0; k < size; k++) w.shade[k] = (w.rand() * 256) | 0;
}
