// PlaneGeometry orders its rows from -Z to +Z after rotation into the ground plane.
export const segments = 48;
export const sculptBases = {
  meadow: 'Rolling ground',
  flat: 'Flat tile',
  island: 'Island',
  canyon: 'River canyon',
  caldera: 'Volcanic crater',
  pass: 'Mountain pass',
  stone: 'Stepping stone',
  boulder: 'Boulder',
  log: 'Fallen log'
};

export function isProp(base) {
  return ['stone', 'boulder', 'log'].includes(base);
}

function elevation(base, x, z) {
  switch (base) {
    case 'flat': return 0;
    case 'island': {
      const coast = Math.hypot(x * .88, z) + .12 * Math.sin(3 * x + z);
      return 1.4 * Math.exp(-1.4 * coast ** 2) - .17;
    }
    case 'canyon': {
      const bank = x - .5 * Math.sin(1.8 * z);
      return .12 + .94 * (1 - Math.exp(-3.2 * bank ** 2)) + .06 * Math.cos(3 * z);
    }
    case 'caldera': {
      const rim = Math.hypot(x, z) - 1.15 - .1 * Math.sin(3 * x + z);
      return .08 + 1.05 * Math.exp(-8 * rim * rim);
    }
    case 'pass': {
      const trail = x - .4 * Math.sin(1.6 * z);
      return .12 + (1 - Math.exp(-2 * trail * trail)) * (.95 + .3 * Math.cos(2 * z + x));
    }
    case 'boulder': return .16 + 1.15 * Math.sqrt(Math.max(0, 1 - (x / 1.55) ** 2 - (z / 1.12) ** 2)) + .07 * Math.sin(4*x + z);
    case 'log': return .18 + .62 * Math.sqrt(Math.max(0, 1 - (z / .42) ** 2)) + .035 * Math.cos(34*z + Math.sin(x));
    case 'stone': return .28 + .12 * Math.cos(1.3 * x + z) + .06 * Math.sin(3 * z);
    default: return .45 + .18 * Math.cos(x) * Math.cos(z);
  }
}

export function sculptGeometry(THREE, state) {
  const side = segments + 1;
  const geo = new THREE.PlaneGeometry(4, 4, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const prop = isProp(state.sculptBase);
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), z = pos.getZ(i);
    if (prop) {
      const u = x / 2, v = z / 2;
      x = 1.55 * u * Math.sqrt(1 - v * v / 2);
      z = state.sculptBase === 'log' ? .42 * v : 1.12 * v * Math.sqrt(1 - u * u / 2);
    }
    pos.setXYZ(i, x, elevation(state.sculptBase, x, z), z);
  }
  for (const stroke of state.strokes) {
    const smooth = stroke.type === 'smooth';
    const previous = smooth ? pos.array.slice() : null;
    for (let i = 0; i < pos.count; i++) {
      const distance = Math.hypot(pos.getX(i) - stroke.x, pos.getZ(i) - stroke.z);
      if (distance >= stroke.radius) continue;
      const weight = (1 - distance / stroke.radius) ** 2;
      const y = pos.getY(i);
      let delta = stroke.strength;
      if (stroke.type === 'lower') delta = -delta;
      if (stroke.type === 'level') delta = (stroke.target - y) * stroke.strength / .3;
      if (smooth) {
        const row = Math.floor(i / side), col = i % side;
        const neighbors = [col ? i-1 : i, col < segments ? i+1 : i,
          row ? i-side : i, row < segments ? i+side : i];
        const average = neighbors.reduce((sum, j) => sum + previous[3*j+1], 0) / 4;
        delta = (average - y) * .8 * stroke.strength / .3;
      }
      pos.setY(i, prop ? Math.max(.04, y + delta * weight) : y + delta * weight);
    }
  }
  if (prop) closeProp(THREE, geo);
  geo.computeVertexNormals();
  return geo;
}

function closeProp(THREE, geo) {
  const side = segments + 1, rim = [];
  for (let k = 0; k < segments; k++) rim.push(k);
  for (let k = 0; k < segments; k++) rim.push(k * side + segments);
  for (let k = segments; k > 0; k--) rim.push(segments * side + k);
  for (let k = segments; k > 0; k--) rim.push(k * side);
  const vertices = Array.from(geo.attributes.position.array);
  const uv = Array.from(geo.attributes.uv.array);
  const indices = Array.from(geo.index.array);
  const start = vertices.length / 3, center = start + rim.length;
  for (const [k, i] of rim.entries()) {
    const j = (k + 1) % rim.length;
    vertices.push(vertices[3*i] * .9, 0, vertices[3*i+2] * .9);
    uv.push(uv[2*i], uv[2*i+1]);
    indices.push(i, rim[j], start+j, i, start+j, start+k, center, start+k, start+j);
  }
  vertices.push(0, 0, 0);
  uv.push(.5, .5);
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.deleteAttribute('normal');
}

export function heightmap(positions) {
  const side = segments + 1;
  const heights = Array.from({length: side * side}, (_, i) => positions.getY(i));
  const min = Math.min(...heights), max = Math.max(...heights);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = side;
  const ctx = canvas.getContext('2d');
  const pixels = ctx.createImageData(side, side);
  heights.forEach((y, i) => {
    const gray = max === min ? 0 : Math.round(255 * (y - min) / (max - min));
    pixels.data.set([gray, gray, gray, 255], i * 4);
  });
  ctx.putImageData(pixels, 0, 0);
  return {canvas, min, max};
}
