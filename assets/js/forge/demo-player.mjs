/* demo-player.mjs — plays a Forge part's demo (build(...).demo) on Three.js meshes.
 *
 * A demo poses each printed body with a list of steps in the part's own millimetres
 * (Z up, before Forge laid the bodies out on the bed): ['x'|'y'|'z', degrees, pivot?] turns,
 * ['t', x, y, z] moves. engine.applyOps() does the same to manifold solids for the overlap check,
 * so what students watch is exactly what was checked.
 *
 *   const player = createDemoPlayer(THREE, { group, meshes, bodies, demo });
 *   player.tick(dt)  advances the motion (call every frame while playing)
 *   player.stop()    puts every mesh back where it sits on the print bed
 *
 * demo.ghost lists bodies that cover the works (a carrier, an output plate); viewers draw them see-through.
 * `group` holds the meshes in the Z-up frame; while playing it is shifted so the assembly is centred
 * and stands on Z = 0. Used by forge.html and the Mechanical Drives lesson.
 */

export function poseMatrix(THREE, ops, offset = [0, 0, 0]) {
  const m = new THREE.Matrix4().makeTranslation(-offset[0], -offset[1], -offset[2]);
  const step = new THREE.Matrix4();
  for (const op of ops || []) {
    if (op[0] === 't') { m.premultiply(step.makeTranslation(op[1], op[2], op[3])); continue; }
    const p = op[2] || [0, 0, 0];
    const a = (op[1] * Math.PI) / 180;
    m.premultiply(step.makeTranslation(-p[0], -p[1], -p[2]));
    m.premultiply(op[0] === 'x' ? step.makeRotationX(a) : op[0] === 'y' ? step.makeRotationY(a) : step.makeRotationZ(a));
    m.premultiply(step.makeTranslation(p[0], p[1], p[2]));
  }
  return m;
}

/* Input position for a time: spins turn steadily (fast enough that slow outputs still visibly move),
   swings go back and forth. */
export function demoInput(demo, seconds) {
  if (demo.mode === 'swing') return Math.sin((2 * Math.PI * seconds) / 5);
  const turnsPerSecond = Math.min(3, Math.max(0.3, (demo.turns || 1) / 8));
  return seconds * turnsPerSecond;
}

export function createDemoPlayer(THREE, { group, meshes, bodies, demo }) {
  let time = 0;
  const box = new THREE.Box3(), part = new THREE.Box3();
  const apply = (u) => {
    const pose = demo.pose(u);
    meshes.forEach((mesh, i) => {
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(poseMatrix(THREE, pose[i], bodies[i].offset));
      mesh.matrixWorldNeedsUpdate = true;
    });
  };
  // centre the assembly once, from its starting pose, so it does not drift as it moves
  apply(0);
  box.makeEmpty();
  for (const mesh of meshes) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    box.union(part.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrix));
  }
  const saved = group.position.clone();
  group.position.set(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -box.min.z);
  const size = box.getSize(new THREE.Vector3());
  return {
    size: [size.x, size.y, size.z],
    get u() { return demo.mode === 'swing' ? Math.sin((2 * Math.PI * time) / 5) : demoInput(demo, time); },
    tick(dt) { time += dt; apply(demoInput(demo, time)); },
    stop() {
      for (const mesh of meshes) { mesh.matrix.identity(); mesh.matrixAutoUpdate = true; mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); mesh.updateMatrix(); }
      group.position.copy(saved);
    },
  };
}
