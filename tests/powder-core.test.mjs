import test from 'node:test';
import assert from 'node:assert/strict';
import {
  E, ELEMENTS, REACTIONS, createWorld, step, paint, blow, explode, render, encode, decode, count, initialTemperature, thermalBrush, inspect
} from '../assets/js/powder/powder-core.mjs';

const at = (w, x, y) => w.type[y * w.W + x];
const put = (w, x, y, t, life = 0) => { const i = y*w.W+x; w.type[i] = t; w.life[i] = life; w.temperature[i] = initialTemperature(t); w.oxygen[i] = t === E.EMPTY ? 0.21 : t === E.OXYGEN ? 1 : 0; };
const run = (w, n) => { for (let i = 0; i < n; i++) step(w); };
const tally = (w, t) => w.type.reduce((n, v) => n + (v === t), 0);
const found = (w, key) => w.found[REACTIONS.findIndex(r => r.key === key)] === 1;
const box = (w) => { // walled tub so nothing piles against the world edge
  for (let x = 0; x < w.W; x++) put(w, x, w.H - 1, E.WALL);
  for (let y = 0; y < w.H; y++) { put(w, 0, y, E.WALL); put(w, w.W - 1, y, E.WALL); }
};

test('element table is complete and ids line up', () => {
  ELEMENTS.forEach((el, i) => {
    assert.equal(el.id, i, el.name);
    assert.ok(el.hint && el.name && el.color.length === 3, el.key);
  });
  assert.equal(new Set(ELEMENTS.map(el => el.key)).size, ELEMENTS.length);
});

test('same seed, same world: the automaton is deterministic', () => {
  const a = createWorld(40, 30, 7), b = createWorld(40, 30, 7);
  for (const w of [a, b]) { paint(w, 10, 4, 3, E.SAND); paint(w, 28, 4, 3, E.WATER); paint(w, 20, 20, 2, E.LAVA); }
  run(a, 120); run(b, 120);
  assert.deepEqual(a.type, b.type);
  assert.deepEqual(a.temperature, b.temperature);
  assert.deepEqual(a.oxygen, b.oxygen);
});

test('sand falls and piles; mass is conserved', () => {
  const w = createWorld(30, 30, 1);
  box(w);
  paint(w, 15, 5, 4, E.SAND);
  const n = tally(w, E.SAND);
  run(w, 200);
  assert.equal(tally(w, E.SAND), n);
  assert.equal(at(w, 15, 28), E.SAND, 'reaches the floor');
  let top = 0;
  while (at(w, 15, top) !== E.SAND) top++;
  assert.ok(top > 20, 'forms a low pile, not a column');
});

test('water levels out; oil floats on water; sand sinks through it', () => {
  const w = createWorld(30, 20, 3);
  box(w);
  for (let x = 1; x < 29; x++) for (let y = 15; y < 19; y++) put(w, x, y, E.WATER);
  for (let x = 5; x < 15; x++) put(w, x, 3, E.OIL);
  put(w, 22, 2, E.SAND);
  run(w, 400);
  assert.equal(at(w, 22, 18), E.SAND, 'sand sank to the floor');
  let oilAboveWater = 0;
  for (let x = 1; x < 29; x++) for (let y = 1; y < 18; y++) {
    if (at(w, x, y) === E.OIL && at(w, x, y + 1) === E.WATER) oilAboveWater++;
    if (at(w, x, y) === E.WATER) assert.notEqual(at(w, x, y - 1), E.SAND);
  }
  assert.ok(oilAboveWater >= 5, 'oil sits on top of the water');
  for (let y = 1; y < 14; y++) for (let x = 1; x < 29; x++) assert.notEqual(at(w, x, y), E.WATER, 'water stays level');
});

test('lava meeting water makes stone and steam', () => {
  const w = createWorld(20, 20, 2);
  box(w);
  for (let x = 1; x < 19; x++) put(w, x, 18, E.WATER);
  put(w, 10, 10, E.LAVA);
  run(w, 40);
  assert.equal(tally(w, E.LAVA), 0);
  assert.equal(tally(w, E.STONE), 1);
  assert.ok(found(w, 'quench'));
});

test('fire consumes fuel; cool water extinguishes it without instant boiling', () => {
  const w = createWorld(30, 30, 4);
  box(w);
  for (let x = 5; x < 25; x++) for (let y = 20; y < 24; y++) put(w, x, y, E.WOOD);
  put(w, 15, 19, E.FIRE, 30);
  run(w, 900);
  assert.ok(tally(w, E.WOOD) < 80, 'some wood burned before oxygen became limited');
  assert.ok(found(w, 'burn'));

  const v = createWorld(10, 10, 5);
  for (let x = 0; x < 10; x++) put(v, x, 9, E.WATER);
  put(v, 5, 8, E.FIRE, 40);
  step(v);
  assert.equal(tally(v, E.FIRE), 0, 'the flame is out');
  assert.equal(tally(v, E.STEAM), 0, 'cool water does not instantly become vapor');
  assert.equal(found(v, 'boil'), false);
  assert.ok(v.temperature.some(t => t > 20), 'water gains heat');
});

test('a spark pulse runs the length of a metal wire and lights gunpowder', () => {
  const w = createWorld(60, 10, 6);
  for (let x = 2; x < 50; x++) put(w, x, 5, E.METAL);
  put(w, 45, 4, E.GUNPOWDER); // resting on the far end of the wire
  paint(w, 2, 5, 0, E.SPARK);
  run(w, 60);
  assert.ok(found(w, 'circuit'));
  assert.ok(found(w, 'boom'), 'the far end detonated');
  assert.equal(tally(w, E.METAL), 48, 'the wire survives');
});

test('a battery keeps pulsing a circuit', () => {
  const w = createWorld(20, 5, 8);
  put(w, 2, 2, E.POWER);
  for (let x = 3; x < 18; x++) put(w, x, 2, E.METAL);
  let heads = 0;
  for (let i = 0; i < 120; i++) { step(w); if (w.charge[2 * w.W + 17] === 1) heads++; }
  assert.ok(heads >= 3, `pulses reached the end ${heads} times`);
});

test('salt water conducts; pure water mostly does not', () => {
  const pulse = (liquid) => {
    const w = createWorld(40, 3, 9);
    for (let x = 0; x < 40; x++) { put(w, x, 0, E.WALL); put(w, x, 2, E.WALL); put(w, x, 1, liquid); }
    w.charge[1 * w.W] = 1;
    let reached = 0;
    for (let i = 0; i < 80; i++) { step(w); for (let x = 0; x < 40; x++) if (w.charge[w.W + x] === 1) reached = Math.max(reached, x); }
    return reached;
  };
  assert.ok(pulse(E.SALTWATER) >= 30, 'salt water carries the pulse');
  assert.ok(pulse(E.WATER) < 15, 'pure water damps it');
});

test('seed on wet dirt grows a stem', () => {
  const w = createWorld(20, 40, 10);
  box(w);
  for (let x = 1; x < 19; x++) put(w, x, 38, E.DIRT);
  put(w, 9, 37, E.WATER); put(w, 10, 30, E.SEED);
  run(w, 600);
  assert.ok(found(w, 'sprout'));
  assert.ok(tally(w, E.PLANT) >= 10, 'grew a plant');
});

test('salt dissolves; acid eats metal but not glass', () => {
  const w = createWorld(10, 10, 11);
  put(w, 5, 5, E.SALT); put(w, 5, 4, E.WATER); put(w, 4, 5, E.WALL); put(w, 6, 5, E.WALL);
  put(w, 4, 4, E.WALL); put(w, 6, 4, E.WALL); put(w, 5, 6, E.WALL);
  run(w, 60);
  assert.ok(found(w, 'dissolve'));

  const a = createWorld(12, 12, 12);
  for (let x = 0; x < 12; x++) { put(a, x, 11, E.GLASS); put(a, x, 8, E.METAL); }
  for (let x = 2; x < 10; x++) put(a, x, 7, E.ACID);
  run(a, 400);
  assert.ok(tally(a, E.METAL) < 12, 'acid ate through metal');
  assert.equal(tally(a, E.GLASS), 12, 'glass is untouched');
});

test('explosions spare walls and clones copy their source', () => {
  const w = createWorld(20, 20, 13);
  for (let x = 0; x < 20; x++) put(w, x, 12, E.WALL);
  explode(w, 10, 10, 4);
  assert.equal(tally(w, E.WALL), 20);

  const c = createWorld(10, 10, 14);
  put(c, 5, 2, E.CLONE); put(c, 5, 1, E.WATER);
  run(c, 30);
  assert.ok(tally(c, E.WATER) > 3, 'the clone became a tap');
});

test('wind brush shoves loose particles, not walls', () => {
  const w = createWorld(30, 5, 15);
  put(w, 10, 2, E.SAND); put(w, 11, 2, E.WALL);
  put(w, 10, 3, E.SAND);
  blow(w, 10, 2, 1, 1, 0, 3);
  assert.equal(at(w, 11, 2), E.WALL);
  assert.equal(at(w, 13, 3), E.SAND, 'the free grain moved');
});

test('render writes a pixel per cell; encode/decode round-trips', () => {
  const w = createWorld(32, 16, 16);
  paint(w, 8, 8, 3, E.WALL); paint(w, 20, 8, 3, E.SAND); put(w, 2, 2, E.CLONE, E.WATER);
  const out = new Uint32Array(32 * 16);
  render(w, out);
  assert.ok(out.every(px => px >>> 24 === 255), 'opaque');
  const saved = encode(w);
  const v = createWorld(32, 16, 99);
  decode(v, JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(v.type, w.type);
  assert.equal(v.life[2 * 32 + 2], E.WATER, 'clone source survives');
  assert.ok(count(v) > 0);
  assert.throws(() => decode(createWorld(10, 10), saved), /does not match/);
  assert.throws(() => decode(v, { width: 32, height: 16, cells: 'zz?*2' }), /damaged/);
});

test('sealed diagonal corners do not leak grains or fluids', () => {
  for (const t of [E.SAND, E.WATER, E.OIL, E.LAVA]) {
    const w = createWorld(3, 3, 21);
    w.type.fill(E.WALL);
    put(w, 1, 1, t); put(w, 2, 2, E.EMPTY);
    run(w, 30);
    assert.equal(at(w, 1, 1), t);
    assert.equal(at(w, 2, 2), E.EMPTY);
  }
});

test('salt dissolves into existing water without creating extra liquid', () => {
  const w = createWorld(3, 4, 22);
  w.type.fill(E.WALL);
  put(w, 1, 1, E.WATER); put(w, 1, 2, E.SALT);
  run(w, 100);
  assert.equal(tally(w, E.SALTWATER), 1);
  assert.equal(tally(w, E.WATER), 0);
  assert.equal(tally(w, E.SALT), 0);
});

test('sustained heating of brine leaves vapor and salt; water extinguishes wood', () => {
  const w = createWorld(5, 5, 23);
  w.type.fill(E.WALL);
  put(w, 2, 3, E.HEATER); put(w, 2, 2, E.SALTWATER); put(w, 2, 1, E.EMPTY);
  run(w, 400);
  assert.equal(tally(w, E.STEAM), 1);
  assert.equal(tally(w, E.SALT), 1);
  assert.ok(found(w, 'evaporate'));

  const v = createWorld(3, 4, 24);
  v.type.fill(E.WALL);
  put(v, 1, 1, E.WOOD, 100); put(v, 1, 2, E.SALTWATER);
  step(v);
  assert.equal(v.life[4], 0, 'brine douses wood without instant boiling');
  assert.equal(tally(v, E.SALTWATER), 1);
});

test('ice does not manufacture cold; its stored temperature survives saving', () => {
  const w = createWorld(10, 10, 25);
  w.type.fill(E.WATER); put(w, 5, 5, E.ICE, 3);
  const saved = encode(w), copy = createWorld(10, 10, 26);
  decode(copy, saved);
  assert.equal(copy.temperature[55], -15);
  run(w, 2000);
  assert.ok(tally(w, E.ICE) <= 2, 'small cold reserve cannot freeze the whole warm pool');
});

test('walls shield material behind them from explosions', () => {
  const w = createWorld(12, 12, 27);
  for (let y = 0; y < 12; y++) put(w, 6, y, E.WALL);
  put(w, 7, 5, E.WOOD); put(w, 8, 5, E.GUNPOWDER);
  explode(w, 4, 5, 5);
  assert.equal(at(w, 7, 5), E.WOOD);
  assert.equal(at(w, 8, 5), E.GUNPOWDER);
  assert.equal(w.life[5 * w.W + 8], 0);
});

test('large gunpowder charges use delayed fuses without recursive detonation', () => {
  const w = createWorld(80, 40, 28);
  w.type.fill(E.GUNPOWDER);
  put(w, 40, 20, E.SPARK, 24);
  run(w, 60);
  assert.ok(found(w, 'boom'));
  assert.ok(tally(w, E.GUNPOWDER) < 100);
});

test('salt deices without manufacturing a second water particle', () => {
  const w = createWorld(3, 4, 29);
  w.type.fill(E.WALL);
  put(w, 1, 1, E.ICE, 12); put(w, 1, 2, E.SALT);
  run(w, 1000);
  assert.equal(tally(w, E.SALTWATER), 1);
  assert.equal(tally(w, E.WATER), 0);
  assert.equal(tally(w, E.ICE), 0);
});

test('a torch heats water directly even when no flame fits in the container', () => {
  const w = createWorld(3, 4, 30);
  w.type.fill(E.WALL);
  put(w, 1, 2, E.TORCH); put(w, 1, 1, E.WATER);
  run(w, 30);
  assert.equal(tally(w, E.STEAM), 1);
  assert.ok(found(w, 'boil'));
});


test('water needs sustained heat to boil, and a powered cooler freezes it', () => {
  for (const [machine, result, discovery] of [[E.HEATER,E.STEAM,'boil'], [E.COOLER,E.ICE,'freeze']]) {
    const w = createWorld(3, 4, 51); w.type.fill(E.WALL);
    put(w,1,2,machine); put(w,1,1,E.WATER);
    step(w);
    assert.equal(at(w,1,1), E.WATER, 'one frame is not enough');
    run(w,500);
    assert.equal(at(w,1,1),result);
    assert.ok(found(w,discovery));
  }
});

test('vapor condenses on a cold plate and preserves water particle count', () => {
  const w = createWorld(3,4,52); w.type.fill(E.WALL);
  put(w,1,1,E.COOLER); put(w,1,2,E.STEAM);
  run(w,500);
  assert.equal(tally(w,E.STEAM),0);
  assert.equal(tally(w,E.WATER)+tally(w,E.ICE),1);
  assert.ok(found(w,'rain'));
});

test('metal transfers heat faster than glass and wood; an insulated pair conserves heat', () => {
  const endTemperature = t => {
    const w = createWorld(12,3,53); w.type.fill(E.WALL);
    for (let x=1;x<11;x++) put(w,x,1,t);
    w.temperature[13]=120;
    const before = w.temperature.reduce((a,b)=>a+b,0);
    run(w,100);
    assert.ok(Math.abs(w.temperature.reduce((a,b)=>a+b,0)-before)<0.02);
    return w.temperature[22];
  };
  const metal=endTemperature(E.METAL), glass=endTemperature(E.GLASS), wood=endTemperature(E.WOOD);
  assert.ok(metal>glass && glass>=wood);
});

test('vinegar and baking soda consume both reactants and retain the solution product', () => {
  const w=createWorld(3,4,54); w.type.fill(E.WALL);
  put(w,1,1,E.VINEGAR); put(w,1,2,E.BAKING);
  run(w,10);
  assert.equal(tally(w,E.VINEGAR)+tally(w,E.BAKING),0);
  assert.equal(tally(w,E.CO2),1);
  assert.equal(tally(w,E.ACETATE),1);
  assert.ok(found(w,'fizz'));
});

test('wax melts and solidifies; oxygen alone is not fuel and CO₂ smothers fire', () => {
  const w=createWorld(3,4,55); w.type.fill(E.WALL);
  put(w,1,1,E.WAX); put(w,1,2,E.HEATER); run(w,300);
  assert.equal(tally(w,E.MELTEDWAX),1);
  put(w,1,2,E.COOLER); run(w,300);
  assert.equal(tally(w,E.WAX),1);
  assert.ok(found(w,'waxmelt') && found(w,'waxfreeze'));
  const a=createWorld(5,5,56); a.type.fill(E.CO2); a.oxygen.fill(0);
  put(a,2,2,E.FIRE,30); step(a);
  assert.equal(tally(a,E.FIRE),0);
  assert.ok(found(a,'smother'));
  const b=createWorld(5,5,57); b.type.fill(E.OXYGEN); b.oxygen.fill(1); run(b,100);
  assert.equal(tally(b,E.FIRE),0);
});

test('iron requires both moisture and oxygen to rust', () => {
  const sample = (wet, air) => {
    const w=createWorld(5,5,58); w.type.fill(E.WALL); w.oxygen.fill(0);
    put(w,2,3,E.IRON);
    if (wet) put(w,1,3,E.SALTWATER);
    if (air) put(w,2,2,E.OXYGEN);
    run(w,3000); return found(w,'rust');
  };
  assert.equal(sample(false,true),false);
  assert.equal(sample(true,false),false);
  assert.equal(sample(true,true),true);
});

test('thermal tools, inspector, save validation and legacy projects', () => {
  const w=createWorld(3,3,59); paint(w,1,1,0,E.METAL);
  thermalBrush(w,1,1,0,80);
  assert.equal(inspect(w,1,1).temperature,100);
  assert.equal(inspect(w,1,1).name,'Metal');
  w.phase[4]=3.5; w.oxygen[0]=0.213; w.found[0]=1;
  const saved=encode(w), copy=createWorld(3,3);
  decode(copy,saved);
  assert.equal(copy.temperature[4],100); assert.equal(copy.phase[4],3.5);
  assert.ok(Math.abs(copy.oxygen[0]-.213)<.0001); assert.equal(copy.found[0],1);
  assert.throws(()=>decode(copy,{...saved,temperature:'NaN'}),/damaged/);
  assert.throws(()=>decode(copy,{...saved,oxygen:'zzz*9'}),/damaged/);
  decode(copy,{width:3,height:3,cells:'c*9'});
  assert.equal(copy.temperature[0],-15,'old ice projects receive a sensible temperature');
});

test('distillation starter collects fresh water separately while retaining salt', async () => {
  const { loadExperiment } = await import('../assets/js/powder/powder-lab.mjs');
  const w = createWorld(80,60,40);
  loadExperiment(w,'distill');
  const startingWater = tally(w,E.SALTWATER);
  run(w,6000);
  let collected=0, escapedSalt=0;
  for (let y=0;y<w.H;y++) for (let x=Math.floor(w.W/2)+1;x<w.W;x++) {
    const t=at(w,x,y);
    if (t===E.WATER) collected++;
    if (t===E.SALT || t===E.SALTWATER) escapedSalt++;
  }
  assert.ok(collected>0,'condensate reaches the separate collector');
  assert.equal(escapedSalt,0,'salt does not travel with vapor');
  assert.equal(tally(w,E.SALT)+tally(w,E.SALTWATER),startingWater,'all salt is retained');
  assert.equal(tally(w,E.WATER)+tally(w,E.STEAM)+tally(w,E.ICE)+tally(w,E.SALTWATER),startingWater,'all water is retained');
  assert.ok(found(w,'evaporate') && found(w,'rain'));
});


test('sealed heated brine remains saveable when there is no space for salt residue', () => {
  const w=createWorld(3,4,61); w.type.fill(E.WALL);
  put(w,1,1,E.SALTWATER); put(w,1,2,E.HEATER);
  run(w,1000);
  assert.equal(tally(w,E.SALTWATER),1,'no products are lost to make space');
  assert.ok(w.phase[4]<=35,'stored phase budget stays bounded');
  const copy=createWorld(3,4);
  decode(copy,encode(w));
  assert.deepEqual(copy.type,w.type);
});
