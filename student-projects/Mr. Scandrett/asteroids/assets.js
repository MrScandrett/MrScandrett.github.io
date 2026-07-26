// Newwave — the 3D asset library for Vector Rocks.
//
// Every model here is generated from primitives at load time: there are no
// meshes to download, no textures, no rigs. The whole kit is a few hundred
// triangles, which is the point. The 1979 original drew the same shapes as
// glowing outlines because that was all the hardware could do; this kit keeps
// the outline and fills it in, so each object reads as a flat-shaded solid
// wearing its own wireframe.
//
// Convention for every model: +X is forward, +Z is up, and one unit is one
// pixel of the old 2D playfield, so gameplay maths needs no rescaling.
import * as THREE from "three";

export const PALETTE = {
  space: "#05050c",
  hull: "#2e7f92",
  hullEdge: "#9df6ff",
  thrust: "#ffb84d",
  rock: "#232c47",
  rockEdge: "#8fa4d4",
  bullet: "#7cffe0",
  saucer: "#ff6ac1",
  saucerEdge: "#ffc2e6",
  grid: "#1b2a4a",
  star: "#cfe6ff",
};

// One radial-gradient sprite, shared by every glow in the game.
let glowTexture = null;
export function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(c);
  return glowTexture;
}

function solidMaterial(color, emissive, emissiveIntensity = 0.35) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: emissive ?? color,
    emissiveIntensity,
    flatShading: true,
    roughness: 0.55,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
}

function edgeMaterial(color, opacity = 0.9) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity });
}

// A solid plus its own silhouette — the whole visual thesis of the kit.
function shell(geometry, fillColor, lineColor, opts = {}) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, solidMaterial(fillColor, opts.emissive, opts.emissiveIntensity));
  const lines = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, opts.edgeAngle ?? 12),
    edgeMaterial(lineColor, opts.edgeOpacity)
  );
  group.add(mesh, lines);
  group.userData.mesh = mesh;
  group.userData.lines = lines;
  return group;
}

// Builds a flat-shaded polyhedron from a vertex table and a triangle list.
function polyhedron(points, faces) {
  const positions = [];
  for (const [a, b, c] of faces) {
    positions.push(...points[a], ...points[b], ...points[c]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

// --- Ship -----------------------------------------------------------------
// The classic three-line dart, given a raised spine and a keel so the tilt of
// the camera actually has something to catch.
export function createShip(size = 16) {
  const s = size;
  const points = [
    [s, 0, 0], // 0 nose
    [-s * 0.7, s * 0.7, 0], // 1 port tail
    [-s * 0.4, 0, 0], // 2 notch
    [-s * 0.7, -s * 0.7, 0], // 3 starboard tail
    [0, 0, s * 0.34], // 4 spine
    [-s * 0.05, 0, -s * 0.18], // 5 keel
  ];
  const geo = polyhedron(points, [
    [0, 1, 4],
    [1, 2, 4],
    [2, 3, 4],
    [3, 0, 4],
    [0, 5, 1],
    [1, 5, 2],
    [2, 5, 3],
    [3, 5, 0],
  ]);
  const group = shell(geo, PALETTE.hull, PALETTE.hullEdge, { emissiveIntensity: 0.3 });

  // Exhaust cone, hidden until the thrust key is down.
  const flameGeo = new THREE.ConeGeometry(s * 0.22, s * 0.9, 6, 1, true);
  flameGeo.rotateZ(Math.PI / 2);
  flameGeo.translate(-s * 0.85, 0, 0);
  const flame = new THREE.Mesh(
    flameGeo,
    new THREE.MeshBasicMaterial({
      color: PALETTE.thrust,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  flame.visible = false;
  group.add(flame);
  group.userData.flame = flame;
  return group;
}

// --- Asteroids ------------------------------------------------------------
// A subdivided icosahedron with its vertices pushed around by a seeded random
// walk. Cached per size so a whole wave shares a handful of geometries.
const rockCache = new Map();

function seededRandom(seed) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rockGeometry(radius, variant) {
  const key = `${radius}:${variant}`;
  if (rockCache.has(key)) return rockCache.get(key);
  const detail = radius > 35 ? 1 : radius > 18 ? 1 : 0;
  const geo = new THREE.IcosahedronGeometry(radius, detail).toNonIndexed();
  const rnd = seededRandom(variant * 7919 + Math.round(radius));
  const pos = geo.attributes.position;
  // Displace by grid cell rather than per-vertex so shared corners stay welded
  // and the silhouette reads as faceted rock instead of confetti.
  const offsets = new Map();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
    let scale = offsets.get(k);
    if (scale === undefined) {
      scale = 0.74 + rnd() * 0.44;
      offsets.set(k, scale);
    }
    v.multiplyScalar(scale);
    pos.setXYZ(i, v.x, v.y, v.z * 0.72); // squashed: still a top-down game
  }
  geo.computeVertexNormals();
  rockCache.set(key, geo);
  return geo;
}

export const ROCK_VARIANTS = 5;

export function createAsteroid(radius, variant = 0) {
  return shell(rockGeometry(radius, variant % ROCK_VARIANTS), PALETTE.rock, PALETTE.rockEdge, {
    emissive: "#0d1226",
    emissiveIntensity: 0.4,
    edgeOpacity: 0.95,
  });
}

// --- Saucer ---------------------------------------------------------------
// Two shallow cones and a dome, lathed at low resolution so the facets show.
export function createSaucer(radius = 18) {
  const r = radius;
  const profile = [
    new THREE.Vector2(0, -r * 0.22),
    new THREE.Vector2(r * 0.45, -r * 0.1),
    new THREE.Vector2(r, 0),
    new THREE.Vector2(r * 0.45, r * 0.12),
    new THREE.Vector2(r * 0.4, r * 0.3),
    new THREE.Vector2(r * 0.22, r * 0.42),
    new THREE.Vector2(0, r * 0.46),
  ];
  const geo = new THREE.LatheGeometry(profile, 12);
  geo.rotateX(Math.PI / 2); // lathe spins around +Y; this kit stands on +Z
  const group = shell(geo, "#7a2a56", PALETTE.saucerEdge, {
    emissive: PALETTE.saucer,
    emissiveIntensity: 0.18,
  });

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color: PALETTE.saucer,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  // Kept wide and faint: it should suggest a lit underside, not erase the
  // facets it sits behind.
  glow.scale.setScalar(r * 4.5);
  glow.position.z = -r * 0.3;
  group.add(glow);
  return group;
}

// --- Shots ----------------------------------------------------------------
// An octahedral slug with a sprite halo, which is as close as this kit gets to
// a particle effect.
export function createBullet(size = 2.6) {
  const geo = new THREE.OctahedronGeometry(size, 0);
  geo.scale(2.2, 1, 1);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: PALETTE.bullet })
  );
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color: PALETTE.bullet,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.setScalar(size * 7);
  const group = new THREE.Group();
  group.add(mesh, glow);
  return group;
}

// --- Debris ---------------------------------------------------------------
// One Points cloud for every spark in the game; the caller writes positions
// straight into the buffer each frame.
export function createDebrisField(capacity) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(capacity * 3), 3));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(capacity * 3), 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 5,
      map: getGlowTexture(),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  points.frustumCulled = false;
  return points;
}

// --- Backdrop -------------------------------------------------------------
// A parallax starfield sunk below the playfield. Depth is the one thing the
// flat original could never sell.
export function createStarfield(width, height, count = 420) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const tint = new THREE.Color(PALETTE.star);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * width * 2.2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * height * 2.2;
    positions[i * 3 + 2] = -120 - Math.random() * 520;
    const b = 0.25 + Math.random() * 0.75;
    colors[i * 3] = tint.r * b;
    colors[i * 3 + 1] = tint.g * b;
    colors[i * 3 + 2] = tint.b * b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 3.2,
      map: getGlowTexture(),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  stars.frustumCulled = false;
  return stars;
}

// The floor grid: a plain lattice under the action that gives the tilt
// somewhere to land, and marks the wrap boundary honestly.
export function createGridFloor(width, height, step = 50) {
  const pts = [];
  const z = -34;
  for (let x = 0; x <= width; x += step) pts.push(x, 0, z, x, -height, z);
  for (let y = 0; y <= height; y += step) pts.push(0, -y, z, width, -y, z);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(geo, edgeMaterial(PALETTE.grid, 0.5));
}

// The wrap boundary itself, drawn brighter than the grid.
export function createBoundary(width, height) {
  const z = -33;
  const pts = [
    0, 0, z, width, 0, z,
    width, 0, z, width, -height, z,
    width, -height, z, 0, -height, z,
    0, -height, z, 0, 0, z,
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(geo, edgeMaterial(PALETTE.rockEdge, 0.28));
}

// Drops the whole kit's lighting in one call: enough to shade a facet, not
// enough to cost anything.
export function createLighting(scene, width, height) {
  // Deliberately dim. The fills only need enough light to separate one facet
  // from the next; the edges are what the eye actually reads.
  scene.add(new THREE.HemisphereLight(0x6f8dc4, 0x05050c, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(width * 0.3, -height * 0.1, 400);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7cffe0, 0.35);
  rim.position.set(-width * 0.4, -height * 1.2, 160);
  scene.add(rim);
}

// Frees a shell() group's per-instance line geometry. Shared fill geometries
// and materials are cached, so they are deliberately left alone.
export function disposeShell(group) {
  const lines = group.userData.lines;
  if (lines) lines.geometry.dispose();
}
