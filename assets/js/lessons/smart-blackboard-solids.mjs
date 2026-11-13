// Developable walls: cylinder arc length and cone slant distances stay fixed.
export function cylinderPoint(r, h, theta, v, t) {
  const q = 1 - t;
  return [q < 1e-7 ? r * theta : r * Math.sin(q * theta) / q,
    h * (v - 0.5), q < 1e-7 ? 0 : r * (Math.cos(q * theta) - 1) / q + r * q];
}
export function conePoint(r, h, theta, v, t) {
  const L = Math.hypot(r, h), k0 = r / L, k = k0 + (1 - k0) * t;
  const angle = theta * k0 / k, s = L * v;
  return [s * k * Math.sin(angle), h / 2 - s * Math.sqrt(Math.max(0, 1 - k * k)), s * k * Math.cos(angle)];
}
export function prismPath(points, t) {
  const lengths = points.map((p, i) => Math.hypot(points[(i + 1) % points.length].x - p.x, points[(i + 1) % points.length].z - p.z));
  const P = lengths.reduce((a, b) => a + b, 0);
  const path = [{ x: points[0].x * (1 - t) - P / 2 * t, z: points[0].z * (1 - t) }];
  let previous;
  points.forEach((p, i) => {
    const next = points[(i + 1) % points.length];
    let angle = Math.atan2(next.z - p.z, next.x - p.x);
    if (previous !== undefined) {
      while (angle < previous - Math.PI) angle += 2 * Math.PI;
      while (angle > previous + Math.PI) angle -= 2 * Math.PI;
    }
    previous = angle;
    path.push({ x: path[i].x + lengths[i] * Math.cos(angle * (1 - t)), z: path[i].z + lengths[i] * Math.sin(angle * (1 - t)) });
  });
  return path;
}

export function makeDevelopable(THREE, group, type, { r, h, points }) {
  const columns = type === 'prism' ? points.length : 96;
  const rows = type === 'cone' ? 16 : 1;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((columns + 1) * (rows + 1) * 3), indices = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const a = j * (columns + 1) + i, b = a + columns + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const material = new THREE.MeshStandardMaterial({ color: type === 'cone' ? 0xfacc15 : 0x4d93e8, side: THREE.DoubleSide, roughness: 0.4, transparent: true, opacity: 0.78 });
  const wall = new THREE.Mesh(geometry, material);
  group.add(wall);
  // The grid follows the same vertices, making the surface correspondence visible.
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position', geometry.attributes.position);
  const gridIndices = [];
  for (let j = 0; j <= rows; j++) {
    if (type === 'cone' && j % 4 !== 0) continue;
    for (let i = 0; i < columns; i++) gridIndices.push(j * (columns + 1) + i, j * (columns + 1) + i + 1);
  }
  for (let i = 0; i <= columns; i++) {
    if (type !== 'prism' && i % 8 !== 0) continue;
    for (let j = 0; j < rows; j++) gridIndices.push(j * (columns + 1) + i, (j + 1) * (columns + 1) + i);
  }
  gridGeometry.setIndex(gridIndices);
  const grid = new THREE.LineSegments(gridGeometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  group.add(grid);
  const caps = [];
  for (const sign of type === 'cone' ? [-1] : [-1, 1]) {
    let capGeometry;
    if (type === 'prism') {
      const shape = new THREE.Shape();
      points.forEach((p, i) => i ? shape.lineTo(p.x - points[0].x, p.z - points[0].z) : shape.moveTo(0, 0));
      shape.closePath();
      capGeometry = new THREE.ShapeGeometry(shape);
    } else {
      capGeometry = new THREE.CircleGeometry(r, 64);
      // Local y maps to world z; the rim at theta=0 is the hinge.
      capGeometry.translate(0, -r, 0);
    }
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(capGeometry, new THREE.MeshStandardMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, roughness: 0.4 }));
    mesh.rotation.x = Math.PI / 2;
    pivot.add(mesh);
    group.add(pivot);
    caps.push({ pivot, sign });
  }
  function update(t) {
    const path = type === 'prism' ? prismPath(points, t) : null;
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
      const theta = -Math.PI + i / columns * 2 * Math.PI;
      const p = type === 'cone' ? conePoint(r, h, theta, j / rows, t) : type === 'cyl' ? cylinderPoint(r, h, theta, j / rows, t) : [path[i].x, h * (j / rows - 0.5), path[i].z];
      positions.set(p, (j * (columns + 1) + i) * 3);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    gridGeometry.computeBoundingSphere();
    caps.forEach(({ pivot, sign }) => {
      if (type === 'cone') {
        const p = conePoint(r, h, 0, 1, t);
        pivot.position.set(...p);
        pivot.rotation.x = -Math.PI * t;
      } else if (type === 'cyl') {
        pivot.position.set(0, sign * h / 2, r * (1 - t));
        pivot.rotation.x = sign * Math.PI / 2 * t;
      } else {
        pivot.position.set(path[0].x, sign * h / 2, path[0].z);
        // Rotate each rigid base about the first wall's edge.
        const firstAngle = Math.atan2(points[1].z - points[0].z, points[1].x - points[0].x);
        const align = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), firstAngle * t);
        const axis = new THREE.Vector3(Math.cos(firstAngle), 0, Math.sin(firstAngle));
        pivot.quaternion.copy(align.multiply(new THREE.Quaternion().setFromAxisAngle(axis, -sign * Math.PI / 2 * t)));
      }
    });
  }
  update(0);
  return update;
}
