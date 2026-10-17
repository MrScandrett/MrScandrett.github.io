/* templates.mjs — Workbench starter projects. Each one is a working model a
 * student can take apart: real dimensions, holes doing real work, groups with
 * meaningful pivots, and (for the animated ones) a loop that exports to GLB.
 *
 * Nodes are written in the project's own units. A shape may give `base`
 * instead of pos[2]: the height its bottom sits at, in its parent's space
 * (for shapes turned only about Z). finishTemplate() turns that into a
 * centre once the shape's size is known, then validates the result.
 */

import { FORMAT, VERSION, PRESETS, validateProject, walk } from './model.mjs';

const S = (shape, params, o = {}) => ({ type: 'shape', shape, params, ...o });
const G = (name, children, o = {}) => ({ type: 'group', name, children, ...o });
const at = (x, y, base, o = {}) => ({ pos: [x, y, 0], base, ...o });

const C = {
  orange: '#e8792a', blue: '#2f6fd6', green: '#2f9e5a', red: '#d6403a', white: '#f2f0ea', black: '#2b2b2e', purple: '#8a5cd0', yellow: '#f2c230',
  grey: '#9aa3ad', hole: '#8b95a1', cream: '#efe6d2', stone: '#d9cfb8', terracotta: '#b5523b', brick: '#8c3b2e', wood: '#8a5a2b', gold: '#d9a521',
  leaf: '#2f7d4a', grass: '#6aa84f', steel: '#7d8894', concrete: '#b9b4aa', marble: '#ece8df', teal: '#2b8a8a',
};

/* ── fidgets & toys ───────────────────────────────────────────────────── */

function spinner() {
  const lobes = [90, 210, 330].map((a) => [27 * Math.cos((a * Math.PI) / 180), 27 * Math.sin((a * Math.PI) / 180)]);
  const cap = (y) => G('Finger cap', [
    S('cylinder', { d: 20, h: 1.6, sides: 64 }, { name: 'Cap disc', color: C.blue, ...at(0, 0, 0) }),
    S('cylinder', { d: 7.9, h: 3.4, sides: 48 }, { name: 'Peg (fits the bearing’s 8 mm hole)', color: C.blue, ...at(0, 0, 1.59) }),
  ], { pos: [64, y, 0] });
  return {
    preset: 'print', name: 'fidget-spinner',
    objects: [
      G('Spinner', [
        S('cylinder', { d: 30, h: 7, sides: 72 }, { name: 'Hub', color: C.orange, pos: [0, 0, 0] }),
        ...lobes.map(([x, y], i) => S('cylinder', { d: 30, h: 7, sides: 72 }, { name: `Lobe ${i + 1}`, color: C.orange, pos: [x, y, 0] })),
        S('cylinder', { d: 22.3, h: 9, sides: 72 }, { name: 'Bearing seat (608 bearing, 22 mm)', hole: true, color: C.hole, pos: [0, 0, 0] }),
        ...lobes.map(([x, y], i) => S('cylinder', { d: 22.3, h: 9, sides: 72 }, { name: `Weight pocket ${i + 1}`, hole: true, color: C.hole, pos: [x, y, 0] })),
      ], { pos: [0, 0, 3.5] }),
      cap(-14), cap(14),
    ],
  };
}

function top() {
  return {
    preset: 'print', name: 'spinning-top',
    objects: [G('Spinning top', [
      S('cone', { d1: 3, d2: 44, h: 24, sides: 72 }, { name: 'Body (tip on the bed)', color: C.purple, ...at(0, 0, 0) }),
      S('cylinder', { d: 44, h: 3, sides: 72 }, { name: 'Rim', color: C.purple, ...at(0, 0, 23.99) }),
      S('cylinder', { d: 8, h: 18, sides: 48 }, { name: 'Stem', color: C.yellow, ...at(0, 0, 26.9) }),
      S('cone', { d1: 8, d2: 11, h: 6, sides: 12 }, { name: 'Grip', color: C.yellow, ...at(0, 0, 38) }),
    ])],
  };
}

function gearToy() {
  // 24 and 12 teeth at module 2 mesh with centres (24 + 12) × 2 ÷ 2 = 36 mm apart
  const ax = -16, bx = 20;
  return {
    preset: 'print', name: 'gear-desk-toy',
    objects: [
      G('Peg board', [
        S('box', { w: 96, d: 60, h: 4, r: 6 }, { name: 'Plate', color: C.white, ...at(-4, 0, 0) }),
        S('cylinder', { d: 4.6, h: 11, sides: 40 }, { name: 'Peg A', color: C.white, ...at(ax, 0, 3.9) }),
        S('cylinder', { d: 4.6, h: 11, sides: 40 }, { name: 'Peg B', color: C.white, ...at(bx, 0, 3.9) }),
        S('cylinder', { d: 9, h: 0.6, sides: 40 }, { name: 'Washer A', color: C.white, ...at(ax, 0, 3.9) }),
        S('cylinder', { d: 9, h: 0.6, sides: 40 }, { name: 'Washer B', color: C.white, ...at(bx, 0, 3.9) }),
      ]),
      G('Big gear', [
        S('gear', { teeth: 24, module: 2, t: 6, bore: 5, play: 0.15 }, { name: 'Gear (24 teeth)', color: C.orange, pos: [0, 0, 0] }),
        S('cylinder', { d: 6, h: 10, sides: 32 }, { name: 'Crank handle', color: C.orange, pos: [15, 0, 8] }),
      ], { pos: [ax, 0, 7.5] }),
      S('gear', { teeth: 12, module: 2, t: 6, bore: 5, play: 0.15 }, { name: 'Small gear (12 teeth)', color: C.blue, pos: [bx, 0, 7.5], rot: [0, 0, 15] }),
    ],
    print: { arrange: 'apart' },
    // the small gear has half the teeth, so it turns twice for every turn of the big one, the other way
    spins: [['Big gear', 'z', -1], ['Small gear (12 teeth)', 'z', 2]],
    duration: 4,
  };
}

function hinge() {
  return {
    preset: 'print', name: 'hinge-keychain',
    objects: [G('Hinge keychain', [
      S('hinge', { l: 36, leaf: 14, t: 3, knuckles: 5, gap: 0.4 }, { name: 'Print-in-place hinge', color: C.teal, ...at(0, 0, 0) }),
      S('text', { text: 'OPEN', size: 6, depth: 1 }, { name: 'Label', color: C.white, ...at(0, -10.4, 2.99) }),
      S('cylinder', { d: 5, h: 8, sides: 32 }, { name: 'Keyring hole', hole: true, color: C.hole, ...at(13, 10.4, -1) }),
    ])],
  };
}

/* ── architecture (metres; prints at 1:100) ───────────────────────────── */

function house() {
  const wall = (o) => ({ h: 2.8, t: 0.25, ww: 1.2, wh: 1.2, sill: 0.9, dw: 1, dh: 2.1, ...o });
  return {
    preset: 'building', name: 'house-with-lift-off-roof',
    objects: [
      G('House', [
        S('box', { w: 10, d: 8, h: 0.3, r: 0 }, { name: 'Floor slab', color: C.concrete, ...at(0, 0, 0) }),
        S('wall', wall({ l: 10, windows: 2, door: 'center' }), { name: 'Front wall', color: C.cream, ...at(0, -3.875, 0.29) }),
        S('wall', wall({ l: 10, windows: 3, door: 'none' }), { name: 'Back wall', color: C.cream, ...at(0, 3.875, 0.29) }),
        S('wall', wall({ l: 7.6, windows: 1, door: 'none' }), { name: 'Left wall', color: C.cream, ...at(-4.875, 0, 0.29, { rot: [0, 0, 90] }) }),
        S('wall', wall({ l: 7.6, windows: 2, door: 'none' }), { name: 'Right wall', color: C.cream, ...at(4.875, 0, 0.29, { rot: [0, 0, 90] }) }),
        S('wall', wall({ l: 3.7, t: 0.15, windows: 0, door: 'center', dw: 0.9 }), { name: 'Inside wall', color: C.white, ...at(1.5, -1.95, 0.29, { rot: [0, 0, 90] }) }),
      ]),
      G('Roof (lifts off)', [
        S('roof-gable', { l: 10.6, span: 8.6, rise: 2.6, t: 0 }, { name: 'Gable roof', color: C.terracotta, ...at(0, 0, 3.1) }),
        S('box', { w: 0.7, d: 0.7, h: 1.8, r: 0 }, { name: 'Chimney', color: C.brick, ...at(2.6, 1.6, 4.1) }),
      ]),
    ],
    print: { arrange: 'apart' },
  };
}

function temple() {
  const xs = [-6, -3.6, -1.2, 1.2, 3.6, 6];
  const col = (x, y) => S('column', { d: 0.9, h: 6, flutes: 16, classical: true }, { name: 'Column', color: C.marble, ...at(x, y, 1.19) });
  return {
    preset: 'building', name: 'greek-temple',
    objects: [G('Temple', [
      S('box', { w: 16, d: 9.2, h: 0.4, r: 0 }, { name: 'Bottom step', color: C.stone, ...at(0, 0, 0) }),
      S('box', { w: 15.2, d: 8.4, h: 0.4, r: 0 }, { name: 'Middle step', color: C.stone, ...at(0, 0, 0.39) }),
      S('box', { w: 14.4, d: 7.6, h: 0.4, r: 0 }, { name: 'Top step (stylobate)', color: C.stone, ...at(0, 0, 0.78) }),
      ...xs.map((x) => col(x, -3.1)), ...xs.map((x) => col(x, 3.1)),
      col(-6, -1.033), col(-6, 1.033), col(6, -1.033), col(6, 1.033),
      S('box', { w: 9, d: 4.4, h: 6, r: 0 }, { name: 'Inner room (cella)', color: C.cream, ...at(0, 0, 1.19) }),
      S('box', { w: 1.6, d: 1, h: 3.2, r: 0 }, { name: 'Doorway', hole: true, color: C.hole, ...at(0, -2.2, 1.15) }),
      S('box', { w: 14.6, d: 7.8, h: 1, r: 0 }, { name: 'Entablature', color: C.marble, ...at(0, 0, 7.18) }),
      S('roof-gable', { l: 14.8, span: 8, rise: 1.7, t: 0 }, { name: 'Pediment roof', color: C.marble, ...at(0, 0, 8.17) }),
    ])],
  };
}

function bridge() {
  const beams = [-9, -6, -3, 0, 3, 6, 9];
  const truss = (y) => S('truss', { l: 24, h: 3, bays: 8, m: 0.22, d: 0.22, style: 'pratt' }, { name: 'Pratt truss', color: C.steel, finish: 'metal', ...at(0, y, 2.28) });
  return {
    preset: 'building', name: 'truss-bridge',
    objects: [G('Bridge', [
      S('box', { w: 1.2, d: 4.4, h: 2, r: 0 }, { name: 'Pier', color: C.concrete, ...at(-11.4, 0, 0) }),
      S('box', { w: 1.2, d: 4.4, h: 2, r: 0 }, { name: 'Pier', color: C.concrete, ...at(11.4, 0, 0) }),
      S('box', { w: 24, d: 3.8, h: 0.3, r: 0 }, { name: 'Deck', color: C.concrete, ...at(0, 0, 1.99) }),
      truss(-1.75), truss(1.75),
      ...beams.map((x) => S('box', { w: 0.18, d: 3.5, h: 0.18, r: 0 }, { name: 'Top brace', color: C.steel, finish: 'metal', pos: [x, 0, 5.39] })),
    ])],
  };
}

/* ── product prototypes (millimetres) ─────────────────────────────────── */

function phoneStand() {
  return {
    preset: 'product', name: 'phone-stand',
    objects: [G('Phone stand', [
      S('box', { w: 80, d: 90, h: 6, r: 4 }, { name: 'Base', color: C.black, ...at(0, 4, 0) }),
      S('box', { w: 80, d: 6, h: 18, r: 2 }, { name: 'Front lip', color: C.black, ...at(0, -38, 0) }),
      G('Back rest', [
        S('box', { w: 80, d: 6, h: 100, r: 0 }, { name: 'Back plate', color: C.black, pos: [0, 0, 0] }),
        S('cylinder', { d: 16, h: 20, sides: 48 }, { name: 'Charging-cable hole', hole: true, color: C.hole, pos: [0, 0, -28], rot: [90, 0, 0] }),
      ], { pos: [0, 27.1, 53], rot: [-20, 0, 0] }),
    ])],
  };
}

function controller() {
  const shell = { w: 116, d: 56, h: 18, wall: 2, r: 14, gap: 0.3 };
  const button = (x, y, name) => S('cylinder', { d: 8.5, h: 20, sides: 40 }, { name, hole: true, color: C.hole, ...at(x, y, -5) });
  return {
    preset: 'product', name: 'game-controller-shell',
    objects: [
      G('Shell', [
        S('enclosure', { ...shell, part: 'box' }, { name: 'Bottom shell', color: C.blue, ...at(0, 0, 0) }),
        ...[[-46, -16], [46, -16], [-46, 16], [46, 16]].map(([x, y]) => S('standoff', { d: 7, hole: 2.6, h: 10, gusset: false }, { name: 'Screw post', color: C.blue, ...at(x, y, 1.99) })),
      ]),
      G('Lid with buttons', [
        S('enclosure', { ...shell, part: 'lid' }, { name: 'Lid', color: C.white, ...at(0, 0, 0) }),
        button(36, 9, 'Button A'), button(36, -9, 'Button B'), button(27, 0, 'Button X'), button(45, 0, 'Button Y'),
        S('box', { w: 22, d: 7, h: 20, r: 1 }, { name: 'D-pad (across)', hole: true, color: C.hole, ...at(-36, 0, -5) }),
        S('box', { w: 7, d: 22, h: 20, r: 1 }, { name: 'D-pad (up/down)', hole: true, color: C.hole, ...at(-36, 0, -5) }),
        S('box', { w: 9, d: 3.5, h: 20, r: 1.5 }, { name: 'Select', hole: true, color: C.hole, ...at(-7, -14, -5) }),
        S('box', { w: 9, d: 3.5, h: 20, r: 1.5 }, { name: 'Start', hole: true, color: C.hole, ...at(7, -14, -5) }),
      ], { pos: [0, 74, 0] }),
    ],
    print: { arrange: 'apart' },
  };
}

function vase() {
  const outline = (r) => Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * Math.PI * 2, rr = r + (r * 6 / 38) * Math.cos(8 * a); return [Number((rr * Math.cos(a)).toFixed(2)) || 0, Number((rr * Math.sin(a)).toFixed(2)) || 0]; });
  return {
    preset: 'print', name: 'twist-vase',
    objects: [G('Twist vase', [
      S('sketch-extrude', { points: outline(38), h: 120, twist: 90, top: 120, smooth: 0 }, { name: 'Vase', color: C.teal, finish: 'satin', pos: [0, 0, 0] }),
      // the same outline, smaller, twisting at the same rate: it hollows the vase and leaves a 2 mm floor
      S('sketch-extrude', { points: outline(38), h: 130, twist: 97.5, top: 121.67, smooth: 0 }, { name: 'Hollow inside', hole: true, color: C.hole, pos: [0, 0, 7], rot: [0, 0, 1.5], scale: [0.86, 0.86, 1] }),
    ], { pos: [0, 0, 60] })],
  };
}

/* ── game assets & animation (metres) ─────────────────────────────────── */

function chest() {
  return {
    preset: 'game', name: 'treasure-chest',
    objects: [
      G('Chest', [
        S('crate', { w: 1, d: 0.6, h: 0.5, frame: 0.07 }, { name: 'Body', color: C.wood, ...at(0, 0, 0) }),
        S('box', { w: 0.86, d: 0.46, h: 0.6, r: 0 }, { name: 'Hollow inside', hole: true, color: C.hole, ...at(0, 0, 0.08) }),
      ]),
      // the lid's origin sits on the back edge, so rotating it swings it open like a real hinge
      G('Lid', [
        S('cylinder', { d: 0.6, h: 1, sides: 24 }, { name: 'Lid barrel', color: C.wood, pos: [0, -0.3, 0], rot: [0, 90, 0] }),
        S('tube', { d: 0.64, wall: 0.04, h: 0.07, sides: 24 }, { name: 'Gold band', color: C.gold, finish: 'metal', pos: [-0.38, -0.3, 0], rot: [0, 90, 0] }),
        S('tube', { d: 0.64, wall: 0.04, h: 0.07, sides: 24 }, { name: 'Gold band', color: C.gold, finish: 'metal', pos: [0.38, -0.3, 0], rot: [0, 90, 0] }),
        S('box', { w: 0.12, d: 0.05, h: 0.14, r: 0 }, { name: 'Lock', color: C.gold, finish: 'metal', pos: [0, -0.615, 0.06] }),
        S('box', { w: 1.3, d: 0.8, h: 0.4, r: 0 }, { name: 'Cut the barrel in half', hole: true, color: C.hole, pos: [0, -0.3, -0.2] }),
      ], { pos: [0, 0.3, 0.5] }),
      S('gem', { d: 0.18, h: 0.22, facets: 8, table: 55 }, { name: 'Gem', color: C.red, finish: 'glow', ...at(0.18, 0.02, 0.08) }),
      S('coin', { d: 0.14, t: 0.03, emblem: 'star', sides: 32 }, { name: 'Coin', color: C.gold, finish: 'metal', ...at(-0.15, -0.05, 0.08) }),
      S('coin', { d: 0.14, t: 0.03, emblem: 'star', sides: 32 }, { name: 'Coin', color: C.gold, finish: 'metal', ...at(-0.05, 0.08, 0.08) }),
      S('coin', { d: 0.14, t: 0.03, emblem: 'heart', sides: 32 }, { name: 'Coin', color: C.gold, finish: 'metal', ...at(-0.12, 0.04, 0.11) }),
    ],
    duration: 3,
    tracks: {
      Lid: [
        { t: 0, rot: [0, 0, 0], ease: 'smooth' }, { t: 1, rot: [-105, 0, 0], ease: 'linear' },
        { t: 2, rot: [-105, 0, 0], ease: 'in' }, { t: 2.7, rot: [0, 0, 0], ease: 'linear' }, { t: 3, rot: [0, 0, 0] },
      ],
      Gem: [{ t: 0, rot: [0, 0, 0], ease: 'linear' }, { t: 3, rot: [0, 0, 360] }],
    },
  };
}

function windmill() {
  const blade = (i) => {
    const a = (i * Math.PI) / 2;
    return S('box', { w: 0.42, d: 0.05, h: 2.5, r: 0 }, { name: 'Sail', color: C.white, pos: [Number((1.45 * Math.sin(a)).toFixed(4)), -0.06, Number((1.45 * Math.cos(a)).toFixed(4))], rot: [0, 90 * i, 0] });
  };
  return {
    preset: 'game', name: 'windmill',
    objects: [
      S('terrain', { w: 8, d: 8, base: 0.2, amp: 0.5, feature: 3, seed: 4, detail: 24 }, { name: 'Hill', color: C.grass, ...at(0, 0, 0) }),
      G('Tower', [
        S('cone', { d1: 2.4, d2: 1.5, h: 6, sides: 8 }, { name: 'Tower', color: C.stone, ...at(0, 0, 0.3, { rot: [0, 0, 22.5] }) }),
        S('cone', { d1: 1.9, d2: 0, h: 1.4, sides: 8 }, { name: 'Roof', color: C.brick, ...at(0, 0, 6.29, { rot: [0, 0, 22.5] }) }),
        S('box', { w: 0.6, d: 0.6, h: 1.1, r: 0 }, { name: 'Door', hole: true, color: C.hole, ...at(0, -1.15, 0.25) }),
        S('box', { w: 0.4, d: 0.6, h: 0.5, r: 0 }, { name: 'Window', hole: true, color: C.hole, ...at(0, -0.85, 3.5) }),
      ]),
      G('Sails', [
        S('cylinder', { d: 0.36, h: 0.3, sides: 16 }, { name: 'Hub', color: C.black, pos: [0, 0, 0], rot: [90, 0, 0] }),
        S('cylinder', { d: 0.12, h: 0.5, sides: 12 }, { name: 'Shaft', color: C.black, pos: [0, 0.3, 0], rot: [90, 0, 0] }),
        blade(0), blade(1), blade(2), blade(3),
      ], { pos: [0, -1.05, 5.6] }),
    ],
    duration: 4,
    spins: [['Sails', 'y', 1]],
    print: { printScale: 50 },
  };
}

function bouncingBall() {
  const k = (t, z, s, ease) => ({ t, pos: [0, 0, z], scale: [s[0], s[0], s[1]], ease });
  return {
    preset: 'game', name: 'bouncing-ball',
    objects: [
      S('box', { w: 3, d: 1.6, h: 0.1, r: 0 }, { name: 'Floor', color: C.steel, ...at(0, 0, 0) }),
      // the pivot is the bottom of the ball, so squashing keeps it on the floor
      S('sphere', { d: 0.5, detail: 32 }, { name: 'Ball', color: C.red, finish: 'gloss', pos: [0, 0, 0.1], pivot: [0, 0, -0.25] }),
    ],
    duration: 1,
    tracks: {
      Ball: [
        k(0, 1.5, [1, 1], 'in'), k(0.4, 0.35, [0.88, 1.18], 'linear'), k(0.47, 0.1, [1.35, 0.62], 'linear'),
        k(0.55, 0.3, [0.9, 1.15], 'out'), k(1, 1.5, [1, 1]),
      ],
    },
  };
}

function forestKit() {
  const tree = (x, y, h, crown, style) => S('tree', { h, crown, trunk: 0.18, style, sides: 7 }, { name: `Tree (${style})`, color: C.leaf, ...at(x, y, 0.3) });
  return {
    preset: 'game', name: 'low-poly-forest-kit',
    objects: [
      S('cylinder', { d: 6, h: 0.3, sides: 6 }, { name: 'Hex tile', color: C.grass, ...at(0, 0, 0) }),
      tree(-1.2, 0.8, 2.2, 1.1, 'pine'), tree(-0.4, 1.7, 2.6, 1.2, 'pine'), tree(1.5, 1.0, 1.6, 0.9, 'pine'),
      tree(1.2, -1.2, 1.8, 1.2, 'round'), tree(-1.6, -0.9, 1.5, 1.2, 'cluster'),
      S('rock', { d: 0.6, flat: 65, rough: 30, seed: 7, detail: 16 }, { name: 'Rock', color: C.grey, ...at(0.3, 0.2, 0.28) }),
      S('rock', { d: 0.4, flat: 70, rough: 35, seed: 21, detail: 16 }, { name: 'Rock', color: C.grey, ...at(0.85, 0.55, 0.28) }),
      S('barrel', { d: 0.55, h: 0.75, bulge: 14, hoops: 2, sides: 16 }, { name: 'Barrel', color: C.wood, ...at(-0.2, -1.6, 0.3) }),
      S('crate', { w: 0.6, d: 0.6, h: 0.6, frame: 0.06 }, { name: 'Crate', color: C.wood, ...at(0.55, -0.5, 0.3, { rot: [0, 0, 18] }) }),
    ],
    print: { printScale: 40 },
  };
}

/* ── the gallery ──────────────────────────────────────────────────────── */

export const REALMS = ['Fidgets & toys', 'Architecture', 'Product prototypes', 'Game assets', 'Animation'];

export const TEMPLATES = [
  { id: 'spinner', title: 'Fidget spinner', realm: 'Fidgets & toys', blurb: 'Three lobes and four bearing pockets, made with a circular pattern of holes.', make: spinner },
  { id: 'top', title: 'Spinning top', realm: 'Fidgets & toys', blurb: 'A cone steep enough to print without supports, balanced on its tip.', make: top },
  { id: 'gears', title: 'Gear desk toy', realm: 'Fidgets & toys', blurb: 'Two meshing gears on pegs, animated at their real 2 : 1 ratio.', make: gearToy },
  { id: 'hinge', title: 'Hinge keychain', realm: 'Fidgets & toys', blurb: 'A hinge that prints already assembled, if the clearance suits your printer.', make: hinge },
  { id: 'house', title: 'House with lift-off roof', realm: 'Architecture', blurb: 'Walls with real window and door sizes; prints as a 1:100 model.', make: house },
  { id: 'temple', title: 'Greek temple', realm: 'Architecture', blurb: 'Fluted columns on a stepped base, under an entablature and pediment.', make: temple },
  { id: 'bridge', title: 'Truss bridge', realm: 'Architecture', blurb: 'Two Pratt trusses carry a 24 m deck between concrete piers.', make: bridge },
  { id: 'stand', title: 'Phone stand', realm: 'Product prototypes', blurb: 'A back rest tipped 20° with a cable hole, on a weighted base.', make: phoneStand },
  { id: 'controller', title: 'Game controller shell', realm: 'Product prototypes', blurb: 'A rounded enclosure with screw posts, and a lid with button cut-outs.', make: controller },
  { id: 'vase', title: 'Twist vase', realm: 'Product prototypes', blurb: 'A sketched outline, twisted and flared, hollowed by a matching hole.', make: vase },
  { id: 'chest', title: 'Treasure chest', realm: 'Game assets', blurb: 'A hinged lid that opens and slams shut. Exports as an animated GLB.', make: chest },
  { id: 'forest', title: 'Low-poly forest kit', realm: 'Game assets', blurb: 'Trees, rocks, a barrel and a crate on a hex tile, ready for a level.', make: forestKit },
  { id: 'windmill', title: 'Windmill', realm: 'Animation', blurb: 'Sails that turn on a loop, on a tower with a door and window cut in.', make: windmill },
  { id: 'ball', title: 'Bouncing ball', realm: 'Animation', blurb: 'The classic first animation: squash and stretch, slow in and slow out.', make: bouncingBall },
];

export const BLANKS = Object.values(PRESETS).map((p) => ({ id: `blank-${p.id}`, preset: p.id, title: `Empty ${p.label.toLowerCase()} project`, hint: p.hint }));

/* Ids, `base` placement, animation tracks by name, then validation.
   sizeOf(node) → [x, y, z] size of the shape before its own transform. */
export function finishTemplate(template, sizeOf) {
  const t = template.make();
  let n = 0;
  const byName = new Map();
  walk(t.objects, (node) => {
    node.id = `n${++n}`;
    if (!byName.has(node.name)) byName.set(node.name, node);
    node.pos = node.pos || [0, 0, 0];
    if (node.base !== undefined) {
      const size = sizeOf(node);
      node.pos = [node.pos[0], node.pos[1], node.base + (Math.abs(size[2] * (node.scale?.[2] ?? 1))) / 2];
      delete node.base;
    }
  });
  const duration = t.duration ?? 2;
  const tracks = {};
  for (const [name, keys] of Object.entries(t.tracks || {})) {
    const node = byName.get(name);
    tracks[node.id] = keys.map((k) => ({ t: k.t, pos: k.pos || node.pos, rot: k.rot || node.rot || [0, 0, 0], scale: k.scale || node.scale || [1, 1, 1], ease: k.ease || 'smooth' }));
  }
  for (const [name, axis, turns] of t.spins || []) {
    const node = byName.get(name);
    const rot = node.rot || [0, 0, 0], end = [...rot];
    end[{ x: 0, y: 1, z: 2 }[axis]] += 360 * turns;
    tracks[node.id] = [
      { t: 0, pos: node.pos, rot, scale: node.scale || [1, 1, 1], ease: 'linear' },
      { t: duration, pos: node.pos, rot: end, scale: node.scale || [1, 1, 1], ease: 'linear' },
    ];
  }
  return validateProject({
    format: FORMAT, version: VERSION, name: t.name, preset: t.preset, objects: t.objects,
    animation: { duration, loop: true, tracks },
    print: { arrange: t.print?.arrange || 'asBuilt', printScale: t.print?.printScale || PRESETS[t.preset].printScale },
  });
}

export const templateById = (id) => TEMPLATES.find((t) => t.id === id);
