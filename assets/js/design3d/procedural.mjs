export const layouts = ['Line', 'Grid', 'Ring', 'Spiral'];
export const shapes = ['Box', 'Cylinder', 'Cone', 'Imported mesh'];
export const fields = ['Wave', 'Uniform', 'Ramp', 'Seeded random'];
export const presets = {
  Fence: {count: 8, spacing: .8, height: 2, variation: 0, layout: 0, shape: 0, field: 1},
  Plaza: {count: 16, spacing: 1.1, height: 1, variation: .6, layout: 1, shape: 1, field: 2},
  Crown: {count: 12, spacing: .8, height: 2.5, variation: .6, layout: 2, shape: 2, field: 0},
  Spiral: {count: 24, spacing: .8, height: 1.8, variation: .7, layout: 3, shape: 1, field: 3},
};

export function makeInstances(p) {
  const count = Math.round(p.count);
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const ringRadius = p.spacing / (2 * Math.sin(Math.PI / count));
  let seed = p.seed >>> 0;
  return Array.from({length: count}, (_, i) => {
    let x = (i - (count - 1) / 2) * p.spacing;
    let z = 0;
    let angle = 0;
    if (p.layout === 1) {
      x = (i % columns - (columns - 1) / 2) * p.spacing;
      z = (Math.floor(i / columns) - (rows - 1) / 2) * p.spacing;
    }
    if (p.layout === 2 || p.layout === 3) {
      angle = i * (p.layout === 2 ? 2 * Math.PI / count : Math.PI / 3);
      const radius = p.layout === 2 ? ringRadius : i * p.spacing / 3;
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
    }
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const signals = [Math.sin(i * 1.4), 0, 2 * i / (count - 1) - 1, 2 * seed / 4294967296 - 1];
    return {x, z, yaw: p.twist * i * Math.PI / 180 - angle,
      height: Math.max(.02, p.height * (1 + p.variation * signals[p.field]))};
  });
}

export function describePattern(p) {
  const instances = makeInstances(p);
  const span = axis => {
    const values = instances.map(item => item[axis]);
    return (Math.max(...values) - Math.min(...values)).toFixed(2);
  };
  const heights = instances.map(item => item.height);
  return `${layouts[p.layout]} · ${instances.length} × ${shapes[p.shape]} · ${fields[p.field]} field · center span ${span('x')} × ${span('z')} · height setting ${Math.min(...heights).toFixed(2)}–${Math.max(...heights).toFixed(2)} units`;
}

// One mesh with baked object transforms. Fit it inside a unit box, centered
// horizontally and resting at Y=0 so every generated copy sits on the grid.
export function importPatternSource(THREE, root) {
  root.updateMatrixWorld(true);
  const parts = [];
  let vertices = 0;
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const {position} = mesh.geometry.attributes;
    const index = mesh.geometry.index;
    const count = index?.count ?? position.count;
    vertices += count;
    if (vertices > 4500) throw Error('Use an OBJ with at most 1,500 triangles.');
    if (count) parts.push({mesh, position, index, count});
  });
  if (!vertices || vertices % 3) throw Error('The OBJ needs triangle faces.');
  const point = new THREE.Vector3();
  const bounds = new THREE.Box3();
  const positions = [];
  for (const {mesh, position, index, count} of parts) {
    for (let i = 0; i < count; i++) {
      point.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
      if (![point.x, point.y, point.z].every(Number.isFinite)) throw Error('The OBJ contains invalid coordinates.');
      positions.push(point.x, point.y, point.z);
      bounds.expandByPoint(point);
    }
  }
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const width = Math.max(size.x, size.z) || size.y;
  if (!(width > 0) || !Number.isFinite(width) || !Number.isFinite(size.y)) throw Error('The OBJ needs finite dimensions.');
  // A flat source remains flat, while a solid source follows the height field.
  const normalized = positions.map((value, i) => {
    if (i % 3 === 1) return size.y ? (value - bounds.min.y) / size.y : 0;
    return (value - (i % 3 === 0 ? center.x : center.z)) / width;
  });
  if (!normalized.every(value => Number.isFinite(value) && Math.abs(value) <= 2)) throw Error('The OBJ could not be normalized.');
  return {positions: normalized, uv: []};
}
