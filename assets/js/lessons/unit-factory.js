// The Unit Factory, played like a point-and-click adventure: the 3D room is the
// interface (click the lever, the breaker, the shelves, the machine), Gauge the
// foreman talks you through it, and every action also has a real button in the
// verb bar so the whole thing works from the keyboard and a screen reader.
// Maths lives in unit-factory-core.mjs (tested).
import { THREE } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import {
  INPUT, UNITS, MATERIALS, WORLDS, MODES, materialById, worldById,
  unitsFor, modeFor, convert, format, gradePrediction, cubeSideCm,
} from './unit-factory-core.mjs';

const $ = (id) => document.getElementById(id);
const OUT_X = 2.7;            // the output bay, right of the machine
const BRIDGES = MATERIALS.length + WORLDS.length;
const DEFAULT_UNIT = { fantasy: 'V', real: 'g', density: 'L', gravity: 'N' };

const state = {
  mode: 'fantasy', unit: 'V', material: 'water', world: 'earth',
  recipe: 'manual', auto: false,
  still: matchMedia('(prefers-reduced-motion: reduce)').matches,
};
let phase = 'empty', elapsed = 0, autoTime = 0, current = null, records = [], sequence = 0, lastSay = null;
const discovered = new Set(), bridgesTried = new Set(), made = new Set(), questsDone = new Set();
let predictedWell = false;
let view, cargo = [], result = null, press, handle, rollers = [], sparks = [], sceneTime = 0;
const reduced = () => state.still;
const busy = () => ['loading', 'working'].includes(phase);

/* ── Work orders (quests) ─────────────────────────────────── */

const QUESTS = [
  { id: 'imagine', title: 'Make 10 V, 10 L and 10 in', hint: 'Imagination mode. What does each one measure?', done: () => ['V', 'L', 'in'].every((u) => made.has(`fantasy:${u}`)) },
  { id: 'same', title: 'Convert 10 kg to grams and to pounds', hint: 'Flip the breaker to Same mass. Watch the balance.', done: () => made.has('real:g') && made.has('real:lb') },
  { id: 'predict', title: 'Predict a real conversion within 10%', hint: 'Type a number in Predict before you press Transform.', done: () => predictedWell },
  { id: 'density', title: 'Make 10 kg cubes of gold, water and cork', hint: 'Take the crates off the Materials shelf.', done: () => ['gold', 'water', 'cork'].every((m) => bridgesTried.has(`material:${m}`)) },
  { id: 'gravity', title: 'Weigh 10 kg on the Moon and on Jupiter', hint: 'Pick planets off the Worlds shelf.', done: () => bridgesTried.has('world:moon') && bridgesTried.has('world:jupiter') },
  { id: 'all', title: `Discover all ${UNITS.length} units`, hint: 'The inventory along the bottom fills as you go.', done: () => discovered.size === UNITS.length },
];

function checkQuests() {
  const fresh = QUESTS.filter((q) => !questsDone.has(q.id) && q.done());
  for (const q of fresh) questsDone.add(q.id);
  $('quest-count').textContent = `${questsDone.size}/${QUESTS.length}`;
  if (fresh.length) {
    const chip = $('open-quests');
    chip.classList.remove('uf-pulse'); void chip.offsetWidth; chip.classList.add('uf-pulse');
  }
  return fresh;
}

/* ── Talking ──────────────────────────────────────────────── */

function say(title, detail) {
  $('status').textContent = title;
  if (detail !== undefined) $('explanation').textContent = detail;
  const speech = document.querySelector('.uf-speech');
  speech.classList.remove('uf-new'); void speech.offsetWidth; speech.classList.add('uf-new');
  document.querySelector('.uf-portrait').classList.toggle('uf-talk', !state.still);
}

/* ── State setters (shared by the room, the verb bar, menus and side panel) ── */

function setMode(next, { quiet = false } = {}) {
  if (busy() || !MODES[next]) return;
  const changed = next !== state.mode;
  state.mode = next;
  if (!unitsFor(next).some((u) => u.symbol === state.unit)) state.unit = DEFAULT_UNIT[next];
  if (changed) $('chain').hidden = true;
  syncUI();
  if (changed && !quiet) {
    say(`Breaker flipped: ${MODES[next].short}.`, {
      fantasy: 'Imagination keeps the number 10 and invents a new quantity. Fun, but it is not a physical conversion.',
      real: 'Same mass: the 10 kg stays 10 kg and only its unit changes. I’ll print the conversion factors.',
      density: 'A density bridge turns mass into volume, but only for one material at a time. Take a crate off the Materials shelf.',
      gravity: 'A gravity bridge turns mass into weight, a force in newtons. Pick a world off the shelf: the answer depends on where you stand.',
    }[next]);
  }
}

function setUnit(symbol) {
  if (busy()) return;
  if (!unitsFor(state.mode).some((u) => u.symbol === symbol)) setMode(modeFor(symbol, state.mode), { quiet: true });
  state.unit = symbol;
  syncUI();
  const u = UNITS.find((x) => x.symbol === symbol);
  say(`Dial set: make ${u.symbol} (${u.name}).`, `${u.family}. ${phase === 'ready' ? 'Press Transform, or click the machine.' : 'Pull the lever to bring a weight in.'}`);
}

function setBridge(kind, id) {
  if (busy()) return;
  if (kind === 'material') { setMode('density', { quiet: true }); state.material = id; }
  else { setMode('gravity', { quiet: true }); state.world = id; }
  syncUI();
  if (kind === 'material') {
    const m = materialById[id];
    say(`${m.name} crate: ${m.density} kg in every litre.`, `${m.note} ${phase === 'ready' ? 'Press Transform to see 10 kg of it.' : 'Pull the lever, then transform.'}`);
  } else {
    const w = worldById[id];
    say(`Destination: ${w.name}. Gravity ${w.g} N/kg.`, `Each kilogram is pulled with ${w.g} newtons there. ${phase === 'ready' ? 'Press Transform to hang the weight on the spring.' : 'Pull the lever, then transform.'}`);
  }
}

const cap = (s) => s.replace(/^the /, 'The ');

function syncUI() {
  const u = UNITS.find((x) => x.symbol === state.unit);
  $('mode-name').textContent = MODES[state.mode].short;
  $('mode-badge').textContent = MODES[state.mode].short;
  $('mode-badge').dataset.mode = state.mode;
  $('unit-name').textContent = u.symbol;
  $('pick-unit').title = `${u.name} (${u.family})`;
  const bridge = state.mode === 'density' ? 'material' : state.mode === 'gravity' ? 'world' : null;
  $('pick-bridge').hidden = !bridge;
  if (bridge) {
    $('bridge-kind').textContent = bridge === 'material' ? 'Material' : 'World';
    $('bridge-name').textContent = bridge === 'material' ? materialById[state.material].name : cap(worldById[state.world].name);
  }
  $('predict-row').hidden = state.mode === 'fantasy';
  const busyNow = busy();
  for (const id of ['lever', 'uf-panel-lever']) $(id).disabled = busyNow;
  for (const id of ['transform', 'uf-panel-transform']) $(id).disabled = phase !== 'ready';
  for (const id of ['pick-mode', 'pick-unit', 'pick-bridge', 'predict']) $(id).disabled = busyNow;
  $('counter').textContent = `${discovered.size} / ${UNITS.length} units discovered`;
  $('bridge-count').textContent = `Bridges ${bridgesTried.size}/${BRIDGES}`;
  $('uf-p-count').textContent = `${discovered.size} / ${UNITS.length}`;
  $('uf-p-bridges').textContent = `${bridgesTried.size} / ${BRIDGES}`;
  $('uf-p-mode').textContent = MODES[state.mode].short;
  $('uf-p-unit').textContent = state.unit;
  syncRoom();
}

/* ── Menus (the accessible face of every hotspot) ─────────── */

let menuOpener = null;
function button(text, sub, onClick, cls = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `uf-opt ${cls}`.trim();
  const strong = document.createElement('strong'); strong.textContent = text; b.append(strong);
  if (sub) { const small = document.createElement('small'); small.textContent = sub; b.append(small); }
  b.addEventListener('click', onClick);
  return b;
}

function openMenu(kind, opener = document.activeElement) {
  if (busy() && kind !== 'quests' && kind !== 'settings') return;
  menuOpener = opener;
  const body = $('uf-menu-body');
  body.replaceChildren();
  body.className = `uf-menu-body uf-menu-${kind}`;
  let title = '', lede = '';
  const close = () => closeMenu();
  if (kind === 'mode') {
    title = 'The mode breaker'; lede = 'What should the machine keep the same?';
    for (const [id, m] of Object.entries(MODES)) {
      const sub = { fantasy: 'Keeps the number 10. Invents a new quantity.', real: 'Keeps the mass. Changes the unit.', density: 'Mass → volume, using one material’s density.', gravity: 'Mass → weight, using one world’s gravity.' }[id];
      body.append(button(m.short, sub, () => { close(); setMode(id); }, id === state.mode ? 'is-on' : ''));
    }
  } else if (kind === 'unit') {
    title = 'The unit dial'; lede = state.mode === 'fantasy' ? 'Pick anything. The number stays 10.' : `${MODES[state.mode].short}: only these units make sense.`;
    for (const family of [...new Set(unitsFor(state.mode).map((u) => u.family))]) {
      const group = document.createElement('div'); group.className = 'uf-opt-group';
      const h = document.createElement('h4'); h.textContent = family; group.append(h);
      for (const u of unitsFor(state.mode).filter((x) => x.family === family)) {
        group.append(button(u.symbol, `${u.name}${discovered.has(u.symbol) ? ' ✓' : ''}`, () => { close(); setUnit(u.symbol); }, `${u.symbol === state.unit ? 'is-on' : ''} uf-fam-${slug(family)}`));
      }
      body.append(group);
    }
  } else if (kind === 'bridge') {
    const isMat = state.mode === 'density';
    title = isMat ? 'The materials shelf' : 'The worlds shelf';
    lede = isMat ? 'Each crate holds a measured fact: how many kilograms fit in one litre.' : 'Each world pulls every kilogram with its own force.';
    for (const item of isMat ? MATERIALS : WORLDS) {
      const tag = isMat ? 'material' : 'world';
      const on = isMat ? item.id === state.material : item.id === state.world;
      body.append(button(isMat ? item.name : cap(item.name), `${isMat ? `${item.density} kg/L` : `${item.g} N/kg`}${bridgesTried.has(`${tag}:${item.id}`) ? ' ✓' : ''}`, () => { close(); setBridge(tag, item.id); }, on ? 'is-on' : ''));
    }
  } else if (kind === 'quests') {
    title = 'Work orders'; lede = `${questsDone.size} of ${QUESTS.length} complete.`;
    const list = document.createElement('ol'); list.className = 'uf-quests';
    for (const q of QUESTS) {
      const li = document.createElement('li');
      li.className = questsDone.has(q.id) ? 'is-done' : '';
      const t = document.createElement('strong'); t.textContent = q.title;
      const h = document.createElement('span'); h.textContent = questsDone.has(q.id) ? 'Done.' : q.hint;
      li.append(t, h); list.append(li);
    }
    body.append(list);
  } else if (kind === 'settings') {
    title = 'Factory settings'; lede = '';
    const row = (labelText, input) => { const l = document.createElement('label'); l.className = 'uf-set'; l.append(input, ` ${labelText}`); return l; };
    const auto = document.createElement('input'); auto.type = 'checkbox'; auto.checked = state.auto;
    auto.addEventListener('change', () => { state.auto = auto.checked; autoTime = 0; });
    const motion = document.createElement('input'); motion.type = 'checkbox'; motion.checked = state.still;
    motion.addEventListener('change', () => { state.still = motion.checked; });
    const recipe = document.createElement('select'); recipe.id = 'recipe';
    for (const [v, t] of [['manual', 'I choose'], ['cycle', 'Next untried'], ['random', 'Surprise me']]) { const o = document.createElement('option'); o.value = v; o.textContent = t; recipe.append(o); }
    recipe.value = state.recipe;
    recipe.addEventListener('change', () => { state.recipe = recipe.value; });
    const recipeLabel = document.createElement('label'); recipeLabel.className = 'uf-set'; recipeLabel.append('Unit picker on Transform ', recipe);
    const actions = document.createElement('div'); actions.className = 'uf-set-actions';
    actions.append(
      button('Reset factory', 'Clears discoveries and work orders', () => { close(); reset(); }),
      button('Download discoveries', 'Your runs as a JSON file', download),
    );
    body.append(row('Run the conveyor and machine automatically', auto), recipeLabel, row('Reduce motion', motion), actions);
  }
  $('uf-menu-title').textContent = title;
  $('uf-menu-lede').textContent = lede;
  $('uf-menu-lede').hidden = !lede;
  $('uf-menu').hidden = false;
  $('uf-menu').dataset.kind = kind;
  (body.querySelector('.is-on') || body.querySelector('button, input, select'))?.focus({ preventScroll: true });
}
function closeMenu() {
  if ($('uf-menu').hidden) return;
  $('uf-menu').hidden = true;
  if (menuOpener && document.contains(menuOpener) && menuOpener !== $('factory-canvas')) menuOpener.focus({ preventScroll: true });
  menuOpener = null;
}
const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '-');

/* ── Inventory ────────────────────────────────────────────── */

function renderInventory(fresh) {
  const host = $('inventory');
  host.replaceChildren();
  for (const u of UNITS.filter((x) => discovered.has(x.symbol))) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `uf-token uf-fam-${slug(u.family)}${u.symbol === fresh ? ' is-new' : ''}`;
    b.textContent = u.symbol;
    b.title = `${u.name} · ${u.family}`;
    b.setAttribute('aria-label', `Set the dial to ${u.name}`);
    b.addEventListener('click', () => setUnit(u.symbol));
    host.append(b);
  }
  host.hidden = discovered.size === 0;
}

/* ── 3D helpers ───────────────────────────────────────────── */

function remove(group) {
  if (!group || !view) return;
  view.scene.remove(group);
  group.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) for (const m of [].concat(o.material)) { m.map?.dispose(); m.dispose(); }
  });
}
function mesh(geometry, color, parent, x = 0, y = 0, z = 0, extra = {}) {
  const o = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...extra }));
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
function box(parent, w, h, d, color, x = 0, y = 0, z = 0, extra = {}) {
  return mesh(new THREE.BoxGeometry(w, h, d), color, parent, x, y, z, extra);
}
function rod(parent, from, to, r, color, extra = {}) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const o = mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8), color, parent, 0, 0, 0, extra);
  o.position.copy(a).add(b).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return o;
}

// A jagged mini lightning-bolt: the small crackling shards that ring an electrical object.
const boltShape = new THREE.Shape([[0, 0.19], [0.06, 0.035], [0.02, 0.026], [0.078, -0.19], [-0.017, -0.017], [-0.07, -0.009]].map(([x, y]) => new THREE.Vector2(x, y)));
function addSparks(parent, cy, count) {
  for (let i = 0; i < count; i++) {
    const bolt = mesh(new THREE.ExtrudeGeometry(boltShape, { depth: 0.02, bevelEnabled: false }), 0xfff45c, parent, 0, cy, 0, { emissive: 0xffe14d, emissiveIntensity: 2.6, roughness: 0.25 });
    bolt.visible = false;
    bolt.userData = { angle: (i / count) * Math.PI * 2, radius: 0.6 + (i % 3) * 0.13, cy, seed: i * 1.7 + 0.4 };
    sparks.push(bolt);
  }
}

function label(parent, text, y = 1.4, w = 1.4, { x = 0, z = 0.55, ink = '#173451', paper = '#f9fcff' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = paper;
  ctx.beginPath(); ctx.roundRect(0, 0, 512, 128, 22); ctx.fill();
  ctx.fillStyle = ink;
  ctx.font = 'bold 58px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 67, 480);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.scale.set(w, w / 4, 1);
  sprite.position.set(x, y, z);
  sprite.renderOrder = 10;
  parent.add(sprite);
  return sprite;
}
const labelWidth = (text) => Math.min(2.8, Math.max(1.3, text.length * 0.17));

// An OIML-style calibration mass: cylindrical body + lifting knob.
function metalWeight(parent, scale = 1, x = 0, y = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, 0);
  mesh(new THREE.CylinderGeometry(0.5 * scale, 0.52 * scale, 0.6 * scale, 28), 0x4b5b68, g, 0, 0.3 * scale, 0, { metalness: 0.65, roughness: 0.32 });
  mesh(new THREE.CylinderGeometry(0.16 * scale, 0.2 * scale, 0.24 * scale, 20), 0x30404d, g, 0, 0.72 * scale, 0, { metalness: 0.6, roughness: 0.3 });
  const ring = mesh(new THREE.TorusGeometry(0.5 * scale, 0.04 * scale, 10, 28), 0x2a3742, g, 0, 0.03 * scale, 0, { metalness: 0.6, roughness: 0.35 });
  ring.rotation.x = Math.PI / 2;
  parent.add(g);
  return g;
}
function weight(x) {
  const g = new THREE.Group();
  metalWeight(g, 1);
  label(g, '10 kg', 1.12, 1.15);
  g.position.set(x, 0.62, 0);
  view.scene.add(g);
  return g;
}

/* ── What the machine builds ──────────────────────────────── */

// Real conversion: an equal-arm balance. 10 kg on the left, the relabelled mass on
// the right. The beam settles level: same mass, new number.
function balance(g, text) {
  box(g, 1.1, 0.1, 0.62, 0x2f4f6e, 0, 0.05);
  rod(g, [0, 0.1, 0], [0, 1.58, 0], 0.055, 0x9fb3c4, { metalness: 0.6 });
  mesh(new THREE.ConeGeometry(0.1, 0.18, 4), 0x9fb3c4, g, 0, 1.6, 0, { metalness: 0.6 });
  const beam = new THREE.Group();
  beam.position.set(0, 1.68, 0);
  box(beam, 2.3, 0.07, 0.1, 0xd9a93a, 0, 0, 0, { metalness: 0.5, roughness: 0.3 });
  mesh(new THREE.ConeGeometry(0.035, 0.32, 8), 0xb82e37, beam, 0, 0.18, 0.06);   // pointer
  g.add(beam);
  const pans = [-1.08, 1.08].map((x, i) => {
    const pan = new THREE.Group();
    for (const [dx, dz] of [[-0.3, 0], [0.3, 0], [0, 0.3]]) rod(pan, [0, 0.95, 0], [dx, 0.05, dz], 0.014, 0x6b7c8b);
    mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.05, 28), 0xb7c6d3, pan, 0, 0.03, 0, { metalness: 0.6, roughness: 0.3 });
    metalWeight(pan, 0.5, 0, 0.06);
    label(pan, i ? text : '10 kg', 0.62, labelWidth(i ? text : '10 kg') * 0.62, { z: 0.45 });
    g.add(pan);
    return { pan, x };
  });
  g.userData.tick = (t) => {
    // Starts tipped (the right pan arrives empty-looking), then a damped settle to level.
    const a = reduced() ? 0 : 0.28 * Math.exp(-t * 2.2) * Math.cos(t * 5.5);
    beam.rotation.z = a;
    for (const { pan, x } of pans) pan.position.set(x * Math.cos(a), 1.68 + x * Math.sin(a) - 0.98, 0);
  };
  g.userData.tick(0);
  return 2.25;
}

// Density bridge: the same 10 kg as a cube of the chosen material, drawn to scale
// against a dashed outline of 10 kg of water (10 L, a cube 21.5 cm on a side).
const CM = 0.8 / cubeSideCm(10);       // scene units per centimetre (water cube = 0.8)
const CUBE_MAX = 2.1;
function materialCube(g, litres, material) {
  const real = cubeSideCm(litres) * CM;
  const side = Math.min(real, CUBE_MAX);
  const extra = material.metal ? { metalness: 0.75, roughness: 0.28 }
    : material.glass ? { transparent: true, opacity: material.id === 'air' ? 0.22 : 0.6, roughness: 0.08, depthWrite: false }
    : { roughness: 0.75 };
  mesh(new THREE.BoxGeometry(side, side, side), material.color, g, 0, side / 2, 0, extra);
  if (material.id !== 'water') {
    // 10 kg of water beside it, as a dashed outline, for comparison.
    const w = cubeSideCm(10) * CM;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, w, w)), new THREE.LineDashedMaterial({ color: 0x1b6fa8, dashSize: 0.06, gapSize: 0.04 }));
    edges.computeLineDistances();
    edges.position.set(side / 2 + w / 2 + 0.18, w / 2, 0);
    g.add(edges);
    label(g, '10 kg water', w + 0.2, 0.9, { x: edges.position.x, z: 0.3 });
  }
  g.userData.scaledBy = real / side;
  return side + 0.5;
}

// Gravity bridge: the 10 kg weight hanging from a spring scale. The spring stretches
// in proportion to the force; the weight itself never changes size.
const SPRING_TOP = 2.2;
const stretchFor = (newtons) => 0.2 + (newtons / 250) * 1.25;
function springScale(g, newtons, world) {
  box(g, 1.2, 0.1, 0.7, 0x2f4f6e, -0.15, 0.05);
  rod(g, [-0.62, 0.1, 0], [-0.62, SPRING_TOP + 0.12, 0], 0.06, 0x9fb3c4, { metalness: 0.6 });
  rod(g, [-0.66, SPRING_TOP + 0.08, 0], [0.08, SPRING_TOP + 0.08, 0], 0.05, 0x9fb3c4, { metalness: 0.6 });
  // A ruler on the post: a tick every 25 N, a long one every 100 N.
  for (let n = 0; n <= 250; n += 25) {
    const y = SPRING_TOP - stretchFor(n) - 0.02;
    box(g, n % 100 ? 0.1 : 0.2, 0.014, 0.02, 0x173451, -0.5 + (n % 100 ? 0 : 0.05), y, 0.07);
  }
  const marker = box(g, 0.34, 0.03, 0.04, 0xb82e37, -0.42, SPRING_TOP, 0.08);
  mesh(new THREE.SphereGeometry(0.17, 24, 16), world.color, g, -0.62, SPRING_TOP + 0.36, 0, { roughness: 0.7 });
  const pts = [];
  for (let i = 0; i <= 140; i++) { const a = (i / 140) * Math.PI * 16; pts.push(new THREE.Vector3(Math.cos(a) * 0.13, -i / 140, Math.sin(a) * 0.13)); }
  const spring = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.022, 6, false), 0xe6ad38, g, 0, SPRING_TOP + 0.04, 0, { metalness: 0.5, roughness: 0.3 });
  const hang = new THREE.Group();
  rod(hang, [0, 0, 0], [0, -0.12, 0], 0.015, 0x6b7c8b);
  metalWeight(hang, 0.55, 0, -0.12 - 0.55 * 0.84);
  hang.children.at(-1).rotation.x = Math.PI;   // hang by its knob
  hang.children.at(-1).position.y = -0.12;
  g.add(hang);
  const target = stretchFor(newtons);
  g.userData.tick = (t) => {
    const s = reduced() ? target : target + (0.2 - target) * Math.exp(-t * 2.6) * Math.cos(t * 7);
    spring.scale.y = s;
    hang.position.set(0, SPRING_TOP + 0.04 - s, 0);
    marker.position.y = SPRING_TOP + 0.04 - s - 0.06;
  };
  g.userData.tick(0);
  return SPRING_TOP + 0.62;
}

function imaginary(g, u) {
  const blue = 0x22aee0, yellow = 0xffd24f;
  const kind = u.kind;
  if (kind === 'weight') {
    metalWeight(g, { kg: 1, g: 0.45, mg: 0.22, lb: 0.85, oz: 0.6, t: 1.55 }[u.symbol]);
    return u.symbol === 't' ? 1.5 : 1.15;
  }
  if (['liquid', 'drop', 'tank'].includes(kind)) {
    const s = kind === 'drop' ? 0.45 : kind === 'tank' ? 1.3 : 1;
    box(g, 1.25 * s, 1.3 * s, 1 * s, 0xb1ecff, 0, 0.65 * s, 0, { transparent: true, opacity: 0.22, depthWrite: false });
    g.userData.liquid = box(g, 1.13 * s, 0.9 * s, 0.9 * s, blue, 0, 0.46 * s, 0, { transparent: true, opacity: 0.8 });
    box(g, 1.32 * s, 0.09, 1.07 * s, 0x47789c, 0, 0.045);
    for (let i = 0; i < 5; i++) box(g, 0.17, 0.025, 0.02, 0xffffff, 0.48 * s, 0.25 + i * 0.19 * s, 0.52 * s);
    return 1.3 * s + 0.35;
  }
  if (kind === 'resistor') {
    const body = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.85, 20), 0xe7c491, g, 0, 0.55, 0, { roughness: 0.55 });
    body.rotation.z = Math.PI / 2;
    for (const x of [-0.62, 0.62]) { const lead = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), 0xb8bec4, g, x, 0.55, 0, { metalness: 0.7, roughness: 0.3 }); lead.rotation.z = Math.PI / 2; }
    [0x6b4a2f, 0x1a1a1a, 0xc23b3b, 0xd4af37].forEach((c, i) => { const band = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20), c, g, -0.28 + i * 0.19, 0.55, 0, { roughness: 0.4 }); band.rotation.z = Math.PI / 2; });
    return 1.1;
  }
  if (kind === 'bulb') {
    mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.34, 20), 0xc7c7c7, g, 0, 0.17, 0, { metalness: 0.65, roughness: 0.35 });
    for (let i = 0; i < 4; i++) mesh(new THREE.TorusGeometry(0.155, 0.024, 8, 20), 0xb0b0b0, g, 0, 0.07 + i * 0.085, 0, { metalness: 0.65, roughness: 0.4 });
    mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.24, 20), 0xfff7e0, g, 0, 0.46, 0, { transparent: true, opacity: 0.35, roughness: 0.08 });
    mesh(new THREE.SphereGeometry(0.44, 24, 16), 0xfff7e0, g, 0, 0.98, 0, { transparent: true, opacity: 0.35, roughness: 0.08 });
    const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(Math.sin(t * Math.PI * 6) * 0.08, 0.68 + t * 0.5, Math.cos(t * Math.PI * 6) * 0.08)); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.012, 6, false), 0xffb347, g, 0, 0, 0, { emissive: 0xffae21, emissiveIntensity: 1.2 });
    addSparks(g, 0.98, 9);
    return 1.75;
  }
  if (['electric', 'current', 'energy'].includes(kind)) {
    mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 24), 0x2d4c7b, g, 0, 0.55, 0, { metalness: 0.35, roughness: 0.4 });
    mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.15, 16), 0xd8b23a, g, 0, 1.09, 0, { metalness: 0.6, roughness: 0.35 });
    mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 24), 0xb08d3e, g, 0, 0.08, 0, { metalness: 0.6, roughness: 0.3 });
    if (kind === 'energy') {
      const points = [[-0.25, 1.38], [0.22, 1.38], [-0.07, 0.91], [0.3, 0.91], [-0.3, 0.3], [-0.09, 0.8], [-0.4, 0.8]].map(([x, y]) => new THREE.Vector2(x, y));
      mesh(new THREE.ExtrudeGeometry(new THREE.Shape(points), { depth: 0.13, bevelEnabled: false }), yellow, g, 0, 0, 0.15, { emissive: 0xffbb20, emissiveIntensity: 0.4 });
    }
    addSparks(g, 0.7, 9);
    return 1.6;
  }
  if (kind === 'length') {
    const length = { mm: 0.22, cm: 0.65, in: 1.1, ft: 1.7, m: 2.15, km: 2.7 }[u.symbol];
    box(g, length, 0.22, 0.42, yellow, 0, 0.2);
    for (let i = 0; i <= 10; i++) box(g, 0.018, 0.015, i % 5 === 0 ? 0.3 : 0.15, 0x253e56, -length / 2 + (i * length) / 10, 0.32, 0.03);
    return 0.8;
  }
  if (kind === 'area') {
    box(g, 1.6, 0.1, 1.1, 0x62c5ad, 0, 0.1);
    for (let i = 0; i < 5; i++) box(g, 0.018, 0.015, 1.1, 0x226d69, -0.8 + i * 0.32, 0.16);
    box(g, 1.6, 0.015, 0.018, 0x226d69, 0, 0.16);
    return 0.75;
  }
  if (kind === 'clock') {
    const dial = mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.16, 32), 0xffe9a3, g, 0, 0.73); dial.rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) box(g, 0.045, 0.09, 0.03, 0x173451, Math.sin((i * Math.PI) / 6) * 0.51, 0.73 + Math.cos((i * Math.PI) / 6) * 0.51, 0.1);
    const minute = new THREE.Group(); minute.position.set(0, 0.73, 0.12); box(minute, 0.035, 0.43, 0.035, 0xb92f3c, 0, 0.18); g.add(minute);
    box(g, 0.28, 0.04, 0.03, 0x173451, 0.12, 0.73, 0.13);
    g.userData.tick = (t) => { if (!reduced()) minute.rotation.z = -t * 0.6; };
    return 1.65;
  }
  if (kind === 'ice') {
    for (let i = 0; i < 3; i++) {
      const cx = (i - 1) * 0.5, cy = 0.55 + (i % 2) * 0.35, mat = { metalness: 0.15, roughness: 0.08, transparent: true, opacity: 0.85 };
      mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 6), 0x9fe6f5, g, cx, cy, 0, mat).rotation.y = Math.PI / 6;
      mesh(new THREE.ConeGeometry(0.22, 0.22, 6), 0x9fe6f5, g, cx, cy + 0.41, 0, mat).rotation.y = Math.PI / 6;
      mesh(new THREE.ConeGeometry(0.22, 0.22, 6), 0x9fe6f5, g, cx, cy - 0.41, 0, mat).rotation.set(Math.PI, Math.PI / 6, 0);
    }
    return 1.7;
  }
  if (kind === 'cold') {
    box(g, 0.25, 1.25, 0.22, 0xe7f6ff, 0, 0.7); box(g, 0.075, 0.55, 0.25, 0x25a0d0, 0, 0.38, 0.04);
    mesh(new THREE.SphereGeometry(0.21, 16, 12), blue, g, 0, 0.18, 0.05);
    return 1.6;
  }
  if (kind === 'spring') {
    const pts = []; for (let i = 0; i <= 160; i++) { const a = (i / 160) * Math.PI * 12; pts.push(new THREE.Vector3(Math.cos(a) * 0.28, 0.2 + i / 160, Math.sin(a) * 0.28)); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.045, 8, false), 0xe6ad38, g);
    box(g, 0.8, 0.12, 0.8, 0x345c86, 0, 0.08); box(g, 0.8, 0.12, 0.8, 0x345c86, 0, 1.3);
    return 1.7;
  }
  if (kind === 'wave') {
    const pts = []; for (let i = 0; i < 70; i++) pts.push(new THREE.Vector3((i / 69 - 0.5) * 1.9, 0.7 + Math.sin((i / 69) * Math.PI * 6) * 0.35, 0));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.045, 8, false), 0xb447b9, g);
    box(g, 2, 0.1, 0.5, 0x35597d, 0, 0.08);
    return 1.4;
  }
  return 1.2;
}

function output(u, text, run) {
  const g = new THREE.Group();
  let top;
  if (run.mode === 'real') top = balance(g, text);
  else if (run.mode === 'density') top = materialCube(g, run.litres, run.bridge.material);
  else if (run.mode === 'gravity') top = springScale(g, run.newtons, run.bridge.world);
  else top = imaginary(g, u);
  label(g, text, top + 0.32, labelWidth(text));
  g.position.set(0, 0.62, 0);
  g.userData.born = sceneTime;
  view.scene.add(g);
  return g;
}

/* ── The room ─────────────────────────────────────────────── */

const hotspots = [];
const room = { modeSwitches: {}, crates: {}, planets: {}, dialNeedle: null, dialLabel: null, marker: null };

function hot(obj, id, verb, name) {
  obj.userData.hot = { id, verb, name };
  hotspots.push(obj);
  return obj;
}

function retext(sprite, text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#173451'; ctx.beginPath(); ctx.roundRect(0, 0, 512, 128, 22); ctx.fill();
  ctx.fillStyle = '#ffce52'; ctx.font = 'bold 60px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 67, 480);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  sprite.material.map?.dispose();
  sprite.material.map = texture;
  sprite.material.needsUpdate = true;
}

function buildRoom() {
  const s = view.scene;
  // Back wall, skirting and a painted safety stripe: it's a room now, not a void.
  box(s, 40, 10, 0.2, 0xcfdfec, 0, 3.6, -3.1);
  box(s, 40, 0.5, 0.25, 0x2f4f6e, 0, -0.65, -2.98);
  box(s, 40, 0.12, 0.22, 0xffc941, 0, 1.15, -2.98);
  for (const x of [-9, -2.2, 3.4, 9.5]) box(s, 0.3, 10, 0.3, 0xb7cbdc, x, 3.6, -2.95);

  // Mode breaker: four big switches, the live one lit.
  const breaker = new THREE.Group(); breaker.position.set(-4.0, 2.55, -2.9); s.add(breaker);
  box(breaker, 2.5, 1.6, 0.16, 0x37516b, 0, 0, 0, { metalness: 0.4 });
  box(breaker, 2.35, 1.45, 0.05, 0x24384c, 0, 0, 0.09);
  const plate = new THREE.Group(); plate.position.set(0, 1.08, 0.1); label(plate, 'MODE BREAKER', 0, 1.6, { z: 0 }); breaker.add(plate);
  const names = { fantasy: 'IMAGINE', real: 'SAME', density: 'DENSITY', gravity: 'GRAVITY' };
  Object.keys(MODES).forEach((id, i) => {
    const sw = new THREE.Group(); sw.position.set(-0.84 + i * 0.56, 0.08, 0.12); breaker.add(sw);
    box(sw, 0.2, 0.62, 0.06, 0x0f1c28);
    const knob = box(sw, 0.16, 0.26, 0.16, 0xd8dee4, 0, 0.14, 0.06, { metalness: 0.5 });
    const lamp = mesh(new THREE.SphereGeometry(0.075, 16, 12), 0x3a4652, sw, 0, 0.45, 0.02);
    const tag = new THREE.Group(); tag.position.set(0, -0.48, 0.02); label(tag, names[id], 0, 0.55, { z: 0 }); sw.add(tag);
    hot(sw, `mode:${id}`, 'Flip', `the ${MODES[id].short} switch`);
    room.modeSwitches[id] = { knob, lamp };
  });

  // Materials shelf: ten sample crates.
  const shelfA = new THREE.Group(); shelfA.position.set(-7.0, 0, -2.75); s.add(shelfA);
  const signA = new THREE.Group(); signA.position.set(0, 4.15, 0); label(signA, 'MATERIALS', 0, 1.5, { z: 0.1 }); shelfA.add(signA);
  for (const y of [2.35, 3.25]) { box(shelfA, 3.0, 0.08, 0.55, 0x8a6a48, 0, y, 0); for (const x of [-1.35, 1.35]) box(shelfA, 0.06, 0.3, 0.5, 0x5f4a35, x, y - 0.18, 0); }
  MATERIALS.forEach((m, i) => {
    const x = -1.12 + (i % 5) * 0.56, y = (i < 5 ? 3.25 : 2.35) + 0.22;
    const extra = m.metal ? { metalness: 0.75, roughness: 0.3 } : m.glass ? { transparent: true, opacity: m.id === 'air' ? 0.25 : 0.65, roughness: 0.1 } : { roughness: 0.8 };
    const crate = new THREE.Group(); crate.position.set(x, y, 0.05); shelfA.add(crate);
    mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), m.color, crate, 0, 0, 0, extra);
    if (m.glass) crate.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.37, 0.37, 0.37)), new THREE.LineBasicMaterial({ color: 0x5c7186 })));
    hot(crate, `material:${m.id}`, 'Take', `the ${m.name.toLowerCase()} crate (${m.density} kg/L)`);
    room.crates[m.id] = crate;
  });

  // Worlds shelf: seven little planets on stands.
  const shelfB = new THREE.Group(); shelfB.position.set(6.6, 0, -2.75); s.add(shelfB);
  const signB = new THREE.Group(); signB.position.set(0, 4.15, 0); label(signB, 'WORLDS', 0, 1.2, { z: 0.1 }); shelfB.add(signB);
  for (const y of [2.35, 3.25]) { box(shelfB, 3.0, 0.08, 0.55, 0x8a6a48, 0, y, 0); for (const x of [-1.35, 1.35]) box(shelfB, 0.06, 0.3, 0.5, 0x5f4a35, x, y - 0.18, 0); }
  WORLDS.forEach((w, i) => {
    const top = i < 4, x = top ? -1.05 + i * 0.7 : -0.7 + (i - 4) * 0.7, y = (top ? 3.25 : 2.35);
    const r = w.id === 'jupiter' ? 0.3 : w.id === 'pluto' || w.id === 'moon' ? 0.14 : 0.2;
    const planet = new THREE.Group(); planet.position.set(x, y + 0.04, 0.05); shelfB.add(planet);
    mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.08, 16), 0x37516b, planet, 0, 0.04, 0);
    const ball = mesh(new THREE.SphereGeometry(r, 24, 16), w.color, planet, 0, 0.08 + r, 0, { roughness: 0.7 });
    if (w.id === 'jupiter') for (const dy of [-0.1, 0, 0.1]) { const band = mesh(new THREE.TorusGeometry(Math.sqrt(r * r - dy * dy), 0.018, 6, 32), 0xa56b3f, planet, 0, 0.08 + r + dy, 0); band.rotation.x = Math.PI / 2; }
    if (w.id === 'earth') mesh(new THREE.SphereGeometry(r * 1.01, 12, 8), 0x4caf50, planet, 0.04, 0.08 + r + 0.04, 0.05, { roughness: 0.8 }).scale.set(0.6, 0.5, 0.6);
    ball.userData.spin = true;
    hot(planet, `world:${w.id}`, 'Visit', `${w.name} (${w.g} N/kg)`);
    planet.userData.markerY = 0.08 + 2 * r + 0.2;
    room.planets[w.id] = planet;
  });

  // A bobbing arrow over whichever crate or planet is loaded.
  room.marker = mesh(new THREE.ConeGeometry(0.1, 0.22, 12), 0xffce52, s, 0, 0, 0, { emissive: 0xffaa00, emissiveIntensity: 0.8 });
  room.marker.rotation.x = Math.PI;

  // Control desk: the lever and the unit dial.
  box(s, 2.3, 0.5, 0.9, 0x2864a0, -3.3, 0.05, 1.85);
  box(s, 2.3, 0.05, 0.92, 0x1d4a78, -3.3, 0.32, 1.85);
  const dial = new THREE.Group(); dial.position.set(-2.75, 0.36, 1.85); dial.rotation.x = 0.75; s.add(dial);
  mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.08, 32), 0xf9fcff, dial, 0, 0.02, 0);
  mesh(new THREE.TorusGeometry(0.37, 0.03, 8, 32), 0xffce52, dial, 0, 0.07, 0).rotation.x = Math.PI / 2;
  for (let i = 0; i < 9; i++) { const a = -2.2 + (i / 8) * 4.4; box(dial, 0.02, 0.02, 0.08, 0x173451, Math.sin(a) * 0.28, 0.07, -Math.cos(a) * 0.28).rotation.y = -a; }
  room.dialNeedle = new THREE.Group(); room.dialNeedle.position.y = 0.08; dial.add(room.dialNeedle);
  box(room.dialNeedle, 0.03, 0.02, 0.28, 0xb82e37, 0, 0, -0.12);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), 0x173451, dial, 0, 0.09, 0);
  hot(dial, 'dial', 'Turn', 'the unit dial');
  const dialTag = new THREE.Group(); dialTag.position.set(-2.75, 0.92, 2.2); s.add(dialTag);
  room.dialLabel = label(dialTag, 'MAKE: V', 0, 1.0, { z: 0 });
}

function syncRoom() {
  if (!view || !room.dialNeedle) return;
  for (const [id, sw] of Object.entries(room.modeSwitches)) {
    const on = id === state.mode;
    sw.knob.position.y = on ? 0.14 : -0.14;
    sw.lamp.material.color.setHex(on ? 0x7dff8a : 0x3a4652);
    sw.lamp.material.emissive.setHex(on ? 0x2fcf4a : 0x000000);
  }
  const pool = unitsFor(state.mode);
  const idx = Math.max(0, pool.findIndex((u) => u.symbol === state.unit));
  room.dialNeedle.rotation.y = -(-2.2 + (pool.length > 1 ? idx / (pool.length - 1) : 0.5) * 4.4);
  if (room.dialText !== state.unit) { room.dialText = state.unit; retext(room.dialLabel, `MAKE: ${state.unit}`); }
  const target = state.mode === 'density' ? room.crates[state.material] : state.mode === 'gravity' ? room.planets[state.world] : null;
  room.marker.visible = !!target;
  room.markerTarget = target;
}

/* ── Scene ────────────────────────────────────────────────── */

function setup() {
  view = createScene($('factory-canvas'), { THREE, clearColor: 0xdce9f4, maxDpr: 1.7, fov: 30 });
  view.scene.add(new THREE.HemisphereLight(0xffffff, 0x537087, 2.6));
  const light = new THREE.DirectionalLight(0xfff2d8, 2.8);
  light.position.set(-3, 8, 6);
  view.scene.add(light);
  box(view.scene, 200, 0.15, 200, 0xbcd0e0, 0, -0.9, 0);
  box(view.scene, 12, 0.35, 2.15, 0x285783, 0, 0.23);
  box(view.scene, 12, 0.12, 1.78, 0x334657, 0, 0.48);
  for (let x = -5.8; x <= 5.8; x += 0.38) { const roller = mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 12), 0x6f8597, view.scene, x, 0.46); roller.rotation.x = Math.PI / 2; rollers.push(roller); }
  for (const x of [-4.8, 4.8]) for (const z of [-0.75, 0.75]) box(view.scene, 0.24, 1.15, 0.24, 0x315579, x, -0.3, z);
  for (const z of [-1.08, 1.08]) box(view.scene, 12, 0.12, 0.1, 0xffc941, 0, 0.8, z);
  // The machine: two pillars, a header with its sign, and the stamping press.
  const machine = new THREE.Group(); view.scene.add(machine);
  for (const x of [-1.55, 1.55]) box(machine, 0.38, 3.8, 0.5, 0x2466b0, x, 1.45, -0.78);
  box(machine, 3.5, 0.65, 1.75, 0x2875bf, 0, 3.4, -0.24);
  const sign = new THREE.Group(); sign.position.set(0, 2.87, 0.3); label(sign, 'UNIT FACTORY', 0.6, 2.7); machine.add(sign);
  press = new THREE.Group(); box(press, 0.28, 0.75, 0.28, 0xb7cad9, 0, 0); box(press, 1.8, 0.23, 1.4, 0xffcc45, 0, -0.4); press.position.set(0, 2.7, 0); machine.add(press);
  hot(machine, 'machine', 'Use', 'the stamping machine');
  handle = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.75, 12), 0xc8d6e2, handle, 0, 0.38);
  mesh(new THREE.SphereGeometry(0.16, 16, 12), 0xc72f40, handle, 0, 0.79);
  handle.position.set(-3.85, 0.33, 1.85); handle.rotation.z = -0.4;
  view.scene.add(handle);
  hot(handle, 'lever', 'Pull', 'the lever');
  buildRoom();
  cargo = [cargoWeight(-3.2), cargoWeight(-5.5)];
}
function cargoWeight(x) { return hot(weight(x), 'cargo', 'Look at', 'the 10 kg weight'); }
function forget(group) { const i = hotspots.indexOf(group); if (i >= 0) hotspots.splice(i, 1); remove(group); }

/* ── Pointing and clicking ────────────────────────────────── */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;

function pick(event) {
  if (!view) return null;
  const rect = view.renderer.domElement.getBoundingClientRect();
  pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, view.camera);
  for (const hit of raycaster.intersectObjects(hotspots, true)) {
    let o = hit.object;
    if (!o.visible) continue;
    while (o && !o.userData.hot) o = o.parent;
    if (o) return o;
  }
  return null;
}

function glow(obj, on) {
  obj?.traverse((o) => {
    const m = o.material;
    if (!m?.emissive) return;
    if (on) { o.userData.baseEmissive ??= m.emissive.getHex(); o.userData.baseIntensity ??= m.emissiveIntensity; if (o.userData.baseEmissive === 0) { m.emissive.setHex(0x2a4a66); m.emissiveIntensity = 0.9; } }
    else if (o.userData.baseEmissive !== undefined) { m.emissive.setHex(o.userData.baseEmissive); m.emissiveIntensity = o.userData.baseIntensity; delete o.userData.baseEmissive; delete o.userData.baseIntensity; }
  });
}

function hover(event) {
  const target = pick(event);
  if (target !== hovered) { glow(hovered, false); hovered = target; glow(hovered, true); syncRoom(); }
  const tip = $('uf-tip'), canvas = $('factory-canvas');
  canvas.style.cursor = target ? 'pointer' : 'default';
  if (!target) { tip.hidden = true; return; }
  const { verb, name, id } = target.userData.hot;
  const locked = busy() && id !== 'cargo' && id !== 'result';
  tip.textContent = `${verb} ${name}${locked ? ' (busy…)' : ''}`;
  const fig = canvas.parentElement.getBoundingClientRect();
  tip.hidden = false;
  tip.style.left = `${Math.min(event.clientX - fig.left + 14, fig.width - tip.offsetWidth - 8)}px`;
  tip.style.top = `${Math.max(8, event.clientY - fig.top - 34)}px`;
}

function act(id) {
  if (id === 'cargo') return say('A 10 kg calibration mass.', 'Polished steel, the kind labs use to check scales. It contains the same amount of matter wherever it goes: the Moon, Jupiter, or a different unit.');
  if (id === 'result') return lastSay ? say(...lastSay) : null;
  if (busy()) return say('Hang on, the line is moving.', '');
  if (id === 'lever') return load();
  if (id === 'machine') return phase === 'ready' ? transform() : say('The press is empty.', 'Pull the lever first so a 10 kg weight rolls under the machine.');
  if (id === 'dial') return openMenu('unit', $('pick-unit'));
  const [kind, value] = id.split(':');
  if (kind === 'mode') return setMode(value);
  if (kind === 'material' || kind === 'world') return setBridge(kind, value);
}

/* ── The run ──────────────────────────────────────────────── */

function load() {
  if (busy()) return;
  closeMenu();
  phase = 'loading'; elapsed = 0;
  say('Conveyor moving…', 'The next 10 kg weight is rolling under the machine.');
  syncUI();
}

// Automatic selection. In a bridge mode the interesting variable is the fact, not
// the unit, so "next" walks the untried materials or worlds.
function choose() {
  if (state.recipe === 'manual') return;
  const pick1 = (list) => list[Math.floor(Math.random() * list.length)];
  if (state.mode === 'density' || state.mode === 'gravity') {
    const list = state.mode === 'density' ? MATERIALS : WORLDS;
    const tag = state.mode === 'density' ? 'material' : 'world';
    const next = state.recipe === 'random' ? pick1(list) : (list.find((x) => !bridgesTried.has(`${tag}:${x.id}`)) || list[sequence++ % list.length]);
    state[tag] = next.id;
    return;
  }
  const pool = unitsFor(state.mode);
  state.unit = (state.recipe === 'random' ? pick1(pool) : (pool.find((u) => !discovered.has(u.symbol)) || pool[sequence++ % pool.length])).symbol;
}

function transform() {
  if (phase !== 'ready') return;
  closeMenu();
  choose();
  current = UNITS.find((u) => u.symbol === state.unit);
  phase = 'working'; elapsed = 0;
  say(state.mode === 'fantasy' ? `Stamping 10 ${current.symbol}…` : 'Running the numbers…', '');
  syncUI();
}

const fullNumber = (v) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 13 }).format(v);

// The factor-label chain, built as DOM: 10 kg × (1000 g / 1 kg) = 10,000 g, with each
// unit that cancels struck through.
function renderChain(run) {
  const host = $('chain');
  host.replaceChildren();
  host.hidden = run.imaginary;
  if (run.imaginary) return '';
  const tokens = [];
  const unitEl = (u) => { const s = document.createElement('span'); s.className = 'uf-u'; s.textContent = u; return s; };
  const term = (n, u) => { const s = document.createElement('span'); s.append(`${fullNumber(n)} `, unitEl(u)); return s; };
  const start = term(INPUT.value, INPUT.symbol);
  start.className = 'uf-start';
  tokens.push({ unit: INPUT.symbol, el: start.lastChild });
  host.append(start);
  for (const step of run.steps) {
    const frac = document.createElement('span');
    frac.className = `uf-frac${step.kind === 'measured' ? ' uf-measured' : ''}`;
    const top = term(step.top, step.topUnit), bottom = term(step.bottom, step.bottomUnit);
    top.className = 'uf-top'; bottom.className = 'uf-bot';
    frac.append(top, bottom);
    if (step.kind === 'measured') {
      const tag = document.createElement('span'); tag.className = 'uf-tag'; tag.textContent = run.bridge.type === 'density' ? `${run.bridge.material.name.toLowerCase()} density` : `gravity on ${run.bridge.world.name}`;
      frac.append(tag);
    }
    const times = document.createElement('span'); times.className = 'uf-op'; times.textContent = '×';
    host.append(times, frac);
    const match = [...tokens].reverse().find((t) => t.unit === step.bottomUnit && !t.cancelled);
    if (match) { match.cancelled = true; match.el.classList.add('uf-cancel'); bottom.lastChild.classList.add('uf-cancel'); }
    tokens.push({ unit: step.topUnit, el: top.lastChild });
  }
  const eq = document.createElement('span'); eq.className = 'uf-op'; eq.textContent = run.approx ? '≈' : '=';
  const answer = document.createElement('strong'); answer.className = 'uf-answer-val';
  answer.textContent = `${format(run.value)} ${run.symbol}`;
  host.append(eq, answer);
  if (!run.steps.length) { const note = document.createElement('span'); note.className = 'uf-note'; note.textContent = 'already in kg: no factor needed'; host.append(note); }
  const spoken = run.steps.length
    ? `10 kg${run.steps.map((s) => ` times ${fullNumber(s.top)} ${s.topUnit} per ${fullNumber(s.bottom)} ${s.bottomUnit}`).join('')} ${run.approx ? 'is about' : 'equals'} ${format(run.value)} ${run.symbol}`
    : `10 kg ${run.approx ? 'is about' : 'equals'} ${format(run.value)} ${run.symbol}`;
  host.setAttribute('role', 'img');
  host.setAttribute('aria-label', `Conversion chain: ${spoken}`);
  return spoken;
}

function predictionNote(run) {
  const raw = $('predict').value.trim();
  if (run.imaginary || raw === '') return '';
  const r = gradePrediction(Number(raw.replace(/,/g, '')), run.value);
  if (!r) return ` (I couldn’t read “${raw}” as a number.)`;
  if (r.grade !== 'off') predictedWell = true;
  if (r.grade === 'spot') return ` Your prediction, ${raw}, was spot on.`;
  if (r.grade === 'close') return ` Your prediction, ${raw}, was within 10%. Nice estimate.`;
  if (r.flipped) return ` Your prediction, ${raw}, looks upside down: the factor was probably flipped. The unit you want to cancel goes on the bottom.`;
  if (r.tenPower) return ` Your prediction, ${raw}, was off by a factor of ${fullNumber(10 ** Math.abs(r.tenPower))}. Check the prefix: a smaller unit needs a bigger number.`;
  return ` Your prediction, ${raw}, was ${r.ratio > 1 ? 'too big' : 'too small'}. Walk through the chain one factor at a time.`;
}

function finish() {
  const run = convert({ mode: state.mode, unit: current.symbol, material: state.material, world: state.world });
  run.mode = state.mode;
  const text = `${format(run.value)} ${run.symbol}`;
  if (run.bridge?.type === 'density') {
    run.litres = convert({ mode: 'density', unit: 'L', material: run.bridge.material.id }).value;
    bridgesTried.add(`material:${run.bridge.material.id}`);
  } else if (run.bridge?.type === 'gravity') {
    run.newtons = convert({ mode: 'gravity', unit: 'N', world: run.bridge.world.id }).value;
    bridgesTried.add(`world:${run.bridge.world.id}`);
  }
  if (view) { forget(cargo.shift()); result = hot(output(current, text, run), 'result', 'Look at', text); }
  const chain = renderChain(run);

  let title, detail;
  if (run.mode === 'fantasy') {
    title = `Ta-da: 10 kg → ${text}!`;
    detail = `That’s imaginary: mass → ${current.family.toLowerCase()}. ${current.fact}`;
  } else if (run.mode === 'real') {
    title = `Converted: 10 kg ${run.approx ? '≈' : '='} ${text}`;
    detail = `See the balance? It settles level: same mass, new number. Each factor equals 1, so it changes the number but not the amount. ${current.fact}`;
  } else if (run.mode === 'density') {
    const m = run.bridge.material, cube = cubeSideCm(run.litres);
    const scaled = result?.userData.scaledBy > 1.01 ? ` I had to shrink it ${format(result.userData.scaledBy)}× to fit the bay.` : '';
    title = `10 kg of ${m.name.toLowerCase()} ≈ ${text}`;
    detail = `No definition links mass to volume. Density (${m.density} kg/L) is a measured fact about ${m.name.toLowerCase()}. As a cube it would be ${format(cube)} cm on each side${m.id === 'water' ? '.' : '; the dashed outline is 10 kg of water.'}${scaled} ${m.note}`;
  } else {
    const w = run.bridge.world;
    title = `On ${w.name}, 10 kg pulls the spring with ${text}`;
    detail = `The weight on the hook is the same 10 kg it always was. Weight is a force, and it depends on where you are: gravity on ${w.name} is ${w.g} N/kg.${w.note ? ` ${w.note}` : ''}`;
  }
  detail += predictionNote(run);
  const isNew = !discovered.has(current.symbol);
  discovered.add(current.symbol);
  made.add(`${run.mode}:${current.symbol}`);
  const fresh = checkQuests();
  if (fresh.length) detail += ` ★ Work order complete: ${fresh.map((q) => q.title).join('; ')}.`;
  lastSay = [title, detail];
  say(title, detail);

  records.unshift({ output: text, mode: MODES[run.mode].short, family: current.family, chain, note: detail });
  records = records.slice(0, 40);
  renderHistory();
  renderInventory(isNew ? current.symbol : null);
  $('predict').value = '';
  phase = 'done'; autoTime = 0;
  syncUI();
}

function renderHistory() {
  $('history').replaceChildren();
  $('empty').hidden = records.length > 0;
  for (const r of records) {
    const li = document.createElement('li'), title = document.createElement('strong'), note = document.createElement('span');
    title.textContent = `10 kg → ${r.output} · ${r.mode}`;
    note.textContent = r.chain ? `${r.chain}. ${r.note}` : r.note;
    li.append(title, note);
    $('history').append(li);
  }
}

function reset() {
  phase = 'empty'; elapsed = autoTime = 0; current = null; records = []; sequence = 0; lastSay = null; predictedWell = false;
  for (const set of [discovered, bridgesTried, made, questsDone]) set.clear();
  state.auto = false;
  if (view) {
    cargo.forEach(forget); forget(result);
    cargo = [cargoWeight(-3.2), cargoWeight(-5.5)]; result = null; sparks = [];
    press.position.y = 2.7; handle.rotation.z = -0.4;
  }
  $('chain').hidden = true;
  renderHistory(); renderInventory(); checkQuests();
  setMode('fantasy', { quiet: true });
  say('Fresh shift. Pull the lever to load a 10 kg weight.', 'Imagination invents a new object. The other three modes keep the 10 kg real.');
  syncUI();
}

function download() {
  const blob = new Blob([JSON.stringify({ lesson: 'The Unit Factory', discovered: [...discovered], bridges: [...bridgesTried], workOrders: [...questsDone], runs: records }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'unit-factory-discoveries.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── Wiring ───────────────────────────────────────────────── */

$('lever').addEventListener('click', load);
$('transform').addEventListener('click', transform);
$('pick-mode').addEventListener('click', (e) => openMenu('mode', e.currentTarget));
$('pick-unit').addEventListener('click', (e) => openMenu('unit', e.currentTarget));
$('pick-bridge').addEventListener('click', (e) => openMenu('bridge', e.currentTarget));
$('open-quests').addEventListener('click', (e) => openMenu('quests', e.currentTarget));
$('open-settings').addEventListener('click', (e) => openMenu('settings', e.currentTarget));
document.querySelector('.uf-menu-close').addEventListener('click', closeMenu);
$('uf-menu').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); } });
$('predict').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); transform(); } });

const canvas = $('factory-canvas');
canvas.addEventListener('pointermove', hover);
canvas.addEventListener('pointerleave', () => { glow(hovered, false); hovered = null; $('uf-tip').hidden = true; syncRoom(); });
canvas.addEventListener('click', (event) => {
  const target = pick(event);
  if (!$('uf-menu').hidden) { closeMenu(); if (!target) return; }
  if (target) act(target.userData.hot.id);
});
canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); $('fallback').hidden = false; view = null; });

for (const b of document.querySelectorAll('.uf-answer')) b.addEventListener('click', () => {
  $('quiz').textContent = b.dataset.correct === 'true'
    ? 'Correct! 10 kg × (1,000 g / 1 kg) = 10,000 g. The kg cancels, and the mass is unchanged.'
    : 'Try again: 1 kg = 1,000 g. Multiply 10 by 1,000; a smaller unit needs a larger number.';
});

// Side panel: shortcuts into a family or a bridge, and the big buttons.
$('uf-panel-lever').addEventListener('click', load);
$('uf-panel-transform').addEventListener('click', transform);
for (const btn of document.querySelectorAll('.uf-panel-preset')) btn.addEventListener('click', () => {
  if (busy()) return;
  if (btn.dataset.mode) setMode(btn.dataset.mode, { quiet: true });
  setUnit(btn.dataset.unit);
});

try { setup(); } catch (error) { console.warn('Unit Factory 3D unavailable:', error); view = null; $('fallback').hidden = false; }
syncUI();
renderInventory();

SimKit.loop((dt) => {
  dt = Math.min(dt, 0.05); elapsed += dt; sceneTime += dt;
  const still = state.still;
  if (phase === 'loading') {
    const p = Math.min(1, elapsed / (still ? 0.12 : 1.1));
    if (view) {
      if (result) result.position.x = OUT_X + p * 4.5;
      cargo.forEach((g, i) => { g.position.x = (-3.2 - i * 2.3) * (1 - p) + -i * 3.2 * p; });
      handle.rotation.z = -0.4 + Math.sin(p * Math.PI) * 1.2;
      rollers.forEach((r) => { r.rotation.y += dt * 5; });
    }
    if (p === 1) {
      forget(result); result = null; sparks = [];
      phase = 'ready'; elapsed = 0;
      if (view) { handle.rotation.z = -0.4; if (cargo.length < 2) cargo.push(cargoWeight(-3.2)); }
      say('Weight’s under the press. Ready when you are.', state.mode === 'fantasy' ? 'Set the unit dial, then press Transform (or click the machine).' : 'Set the dial, type a prediction if you dare, then press Transform.');
      syncUI();
    }
  } else if (phase === 'working') {
    const p = Math.min(1, elapsed / (still ? 0.15 : 1.3));
    if (view) press.position.y = 2.7 - Math.sin(p * Math.PI) * 0.75;
    if (p === 1) { if (view) press.position.y = 2.7; finish(); }
  }
  if (state.auto && !busy()) {
    autoTime += dt;
    if (autoTime > 2.6) { autoTime = 0; phase === 'ready' ? transform() : load(); }
  } else if (!state.auto) autoTime = 0;

  if (!view) return;
  if (result && phase !== 'loading') {
    // The finished object rolls out of the machine into the output bay.
    const age = sceneTime - result.userData.born;
    const e = still ? 1 : Math.min(1, age / 0.9);
    result.position.x = OUT_X * (1 - (1 - e) ** 3);
    if (e < 1) rollers.forEach((r) => { r.rotation.y += dt * 5; });
    result.userData.tick?.(age);
  }
  if (room.marker?.visible && room.markerTarget) {
    room.markerTarget.getWorldPosition(room.marker.position);
    room.marker.position.y += (room.markerTarget.userData.markerY || 0.45) + (still ? 0 : Math.sin(sceneTime * 3) * 0.06);
  }
  if (!still) for (const p of Object.values(room.planets)) p.rotation.y += dt * 0.4;
  if (result && !still) {
    if (result.userData.liquid) result.userData.liquid.rotation.z = Math.sin(sceneTime * 2) * 0.035;
    for (const spark of sparks) {
      const { angle, radius, cy, seed } = spark.userData, t = sceneTime * 9 + seed * 13;
      const flash = Math.sin(t) + Math.sin(t * 2.3 + seed) > 0.15;
      spark.visible = flash;
      if (flash) {
        const a = angle + Math.sin(sceneTime * 2.2 + seed) * 0.5, r = radius + Math.sin(t * 3) * 0.08;
        spark.position.set(Math.cos(a) * r, cy + Math.sin(a * 1.7 + seed) * 0.28, Math.sin(a) * r * 0.6);
        spark.rotation.set(seed, seed * 2, t * 4);
        spark.scale.setScalar(1.1 + ((t * 37) % 1) * 0.9);
      }
    }
  } else for (const spark of sparks) spark.visible = false;
  view.syncSize();
  // Wide screens frame the whole room, shelf to shelf, with the dialogue box over the
  // floor. Phones (dialogue below the canvas) frame the line and the output bay.
  const narrow = view.camera.aspect < 1.25;
  const cx = narrow ? 0.6 : -0.2, cy = narrow ? 2.1 : 0.95;
  const distance = Math.max(narrow ? 7 : 10.5, (narrow ? 5.0 : 8.4) / (view.camera.aspect * Math.tan(THREE.MathUtils.degToRad(15))));
  view.camera.position.set(cx, (narrow ? 1.2 : cy + 0.05) + distance * 0.17, distance);
  view.camera.lookAt(cx, cy, -0.4);
  view.renderer.render(view.scene, view.camera);
}, { el: SimKit.stage(canvas) });
