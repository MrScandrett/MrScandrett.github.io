import { THREE, GLTFLoader, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

const root = document.querySelector('[data-asset-sim="rig3d"]');

if (root) {
  const q = selector => root.querySelector(selector);
  const qa = selector => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  let model, mesh, skeleton, bones = {}, restPose = {};
  let upperIndex = -1, lowerIndex = -1;
  let editable = [];
  let selectedBone = 'lower';
  let brush = .8;
  let angle = 70;
  let controls;

  const canvas = q('canvas');
  const state = createScene(canvas, { THREE, fov: 32, near: .01, far: 60, clearColor: 0xbad1d8 });
  const { renderer, scene, camera } = state;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minDistance = 1.2;
  controls.maxDistance = 4;
  controls.minPolarAngle = Math.PI * .2;
  controls.maxPolarAngle = Math.PI * .72;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x355060, 2.25));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(3, 6, 4);
  keyLight.castShadow = true;
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x9edfff, 1.8);
  rimLight.position.set(-4, 3, -4);
  scene.add(rimLight);

  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xbad1d8, roughness: .92, metalness: 0 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3.6, 64), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(6.4, 16, 0x6e929d, 0x6e929d);
  grid.position.y = .006;
  grid.material.transparent = true;
  grid.material.opacity = .3;
  scene.add(grid);

  const upperColor = new THREE.Color(0x4f8ef0);
  const lowerColor = new THREE.Color(0xe15a4a);
  const neutralColor = new THREE.Color(0xffffff);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function idealLower(t) {
    const width = .32;
    return clamp((t + width) / (width * 2), 0, 1);
  }

  function applyAngle() {
    if (!bones.LeftForeArm || !restPose.LeftForeArm) return;
    bones.LeftForeArm.quaternion.copy(restPose.LeftForeArm.quaternion);
    bones.LeftForeArm.rotation.x += angle * Math.PI / 180;
    model.updateMatrixWorld(true);
  }

  function writeVertex(entry) {
    const weightAttr = mesh.geometry.attributes.skinWeight;
    const indexAttr = mesh.geometry.attributes.skinIndex;
    const colorAttr = mesh.geometry.attributes.color;
    indexAttr.setXYZW(entry.index, upperIndex, lowerIndex, 0, 0);
    weightAttr.setXYZW(entry.index, 1 - entry.lower, entry.lower, 0, 0);
    const c = upperColor.clone().lerp(lowerColor, entry.lower);
    colorAttr.setXYZ(entry.index, c.r, c.g, c.b);
  }

  function flushAttributes() {
    mesh.geometry.attributes.skinWeight.needsUpdate = true;
    mesh.geometry.attributes.skinIndex.needsUpdate = true;
    mesh.geometry.attributes.color.needsUpdate = true;
  }

  function grade() {
    if (!editable.length) return { score: 0 };
    const error = editable.reduce((sum, entry) => sum + Math.abs(entry.lower - idealLower(entry.t)), 0) / editable.length;
    return { score: clamp((1 - error) * 100, 0, 100) };
  }

  function diagnostic(score) {
    if (!model) return '<strong>Loading the shared character:</strong> The same rigged Quaternius dummy used in the animation lesson is on its way.';
    if (angle > 6) return '<strong>Return to rest:</strong> This lab keeps brush strokes predictable near the neutral pose, just like a real weight-paint loop—bring the elbow angle back down to keep editing.';
    if (score > 90) return '<strong>Weights clean:</strong> The elbow keeps volume while the upper-arm and forearm vertices follow the correct bone.';
    if (score > 70) return '<strong>Blend improving:</strong> Smooth the blue/red transition around the elbow; protect the vertices far from the joint.';
    return '<strong>Stray influence:</strong> Paint upper-arm vertices blue, forearm vertices red, and leave a short gradient through the elbow.';
  }

  function updateMeter() {
    const { score } = grade();
    q('.asset-meter span').style.width = `${score}%`;
    q('.asset-sim-score').textContent = `${Math.round(score)} / 100`;
    q('.asset-sim-status').innerHTML = diagnostic(score);
  }

  function render() {
    state.syncSize();
    controls.update();
    renderer.render(scene, camera);
    updateMeter();
  }

  function paintNear(point, targetLower) {
    const radius = .16;
    editable.forEach(entry => {
      const dist = entry.worldPosition.distanceTo(point);
      if (dist > radius) return;
      const falloff = 1 - dist / radius;
      entry.lower = clamp(entry.lower + (targetLower - entry.lower) * brush * falloff, 0, 1);
      writeVertex(entry);
    });
    flushAttributes();
    render();
  }

  canvas.addEventListener('pointerdown', event => {
    if (!model || angle > 6) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(mesh, false)[0];
    if (!hit) return;
    paintNear(hit.point, selectedBone === 'lower' ? 1 : 0);
  });

  canvas.addEventListener('keydown', event => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!model || angle > 6 || !controls.target) return;
    paintNear(controls.target, selectedBone === 'lower' ? 1 : 0);
  });

  qa('[data-bone]').forEach(button => button.addEventListener('click', () => {
    selectedBone = button.dataset.bone;
    qa('[data-bone]').forEach(b => b.classList.toggle('is-active', b === button));
  }));
  q('[data-control="brush"]').addEventListener('input', event => {
    brush = +event.target.value / 100;
    q(`output[for="${event.target.id}"]`).textContent = event.target.value;
  });
  q('[data-control="angle"]').addEventListener('input', event => {
    angle = +event.target.value;
    q(`output[for="${event.target.id}"]`).textContent = event.target.value;
    applyAngle();
    render();
  });
  q('[data-rig-auto]').addEventListener('click', () => {
    editable.forEach(entry => { entry.lower = idealLower(entry.t); writeVertex(entry); });
    flushAttributes();
    render();
  });

  // Shared 3D test dummy: keep this pointed at the same GLB the animation lesson
  // uses so a student rigs the exact model they later animate.
  new GLTFLoader().load(new URL('../../models/animation-studio/quaternius-human.glb', import.meta.url).href, gltf => {
    model = gltf.scene;
    model.traverse(child => {
      if (child.isBone) {
        bones[child.name] = child;
        restPose[child.name] = { position: child.position.clone(), quaternion: child.quaternion.clone(), scale: child.scale.clone() };
      }
      if (child.isSkinnedMesh) {
        mesh = child;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(m => m.clone()) : mesh.material.clone();
        [mesh.material].flat().forEach(material => { material.vertexColors = true; material.needsUpdate = true; });
      }
    });
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    model.scale.setScalar(2.75 / size.y);
    model.updateMatrixWorld(true);
    const fitted = new THREE.Box3().setFromObject(model);
    const center = fitted.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= fitted.min.y;
    scene.add(model);
    model.updateMatrixWorld(true);

    skeleton = mesh.skeleton;
    upperIndex = skeleton.bones.indexOf(bones.LeftArm);
    lowerIndex = skeleton.bones.indexOf(bones.LeftForeArm);

    const shoulder = bones.LeftArm.getWorldPosition(new THREE.Vector3());
    const elbow = bones.LeftForeArm.getWorldPosition(new THREE.Vector3());
    const wrist = bones.LeftHand.getWorldPosition(new THREE.Vector3());
    const upperVec = new THREE.Vector3().subVectors(elbow, shoulder);
    const lowerVec = new THREE.Vector3().subVectors(wrist, elbow);
    const upperLenSq = upperVec.lengthSq();
    const lowerLenSq = lowerVec.lengthSq();
    const elbowRadius = new THREE.Vector3().subVectors(shoulder, elbow).length() * .22;

    const colorAttr = new THREE.Float32BufferAttribute(mesh.geometry.attributes.position.count * 3, 3);
    mesh.geometry.setAttribute('color', colorAttr);
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      colorAttr.setXYZ(i, neutralColor.r, neutralColor.g, neutralColor.b);
    }

    // Trust the artist's original rig, not raw geometry: only vertices the source
    // GLB already skinned to the upper-arm or forearm bone are eligible for the
    // practice zone, so we never pull in unrelated torso/cape/leg vertices that
    // simply happen to sit near the arm in world space.
    const position = mesh.geometry.attributes.position;
    const srcJoints = mesh.geometry.attributes.skinIndex;
    const srcWeights = mesh.geometry.attributes.skinWeight;
    const skinned = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      let armInfluence = 0;
      for (let slot = 0; slot < 4; slot++) {
        const joint = srcJoints.getComponent(i, slot);
        if (joint === upperIndex || joint === lowerIndex) armInfluence += srcWeights.getComponent(i, slot);
      }
      if (armInfluence < .2) continue;

      // applyBoneTransform (not a raw position*matrixWorld multiply) is required:
      // the mesh's bind matrix is not the same transform as mesh.matrixWorld, so a
      // naive multiply put "world" positions nearly a meter away from the bones.
      skinned.fromBufferAttribute(position, i);
      mesh.applyBoneTransform(i, skinned);
      const world = mesh.localToWorld(skinned.clone());
      const distToElbow = world.distanceTo(elbow);
      if (distToElbow > elbowRadius * 4.5) continue;

      const toWorld = new THREE.Vector3().subVectors(world, shoulder);
      const tUpper = toWorld.dot(upperVec) / upperLenSq;
      const t = tUpper < 1 ? tUpper - 1 : new THREE.Vector3().subVectors(world, elbow).dot(lowerVec) / lowerLenSq;

      const entry = { index: i, t, lower: .5, worldPosition: world.clone() };
      editable.push(entry);
      writeVertex(entry);
    }
    flushAttributes();
    mesh.geometry.attributes.skinIndex.usage = THREE.DynamicDrawUsage;
    mesh.geometry.attributes.skinWeight.usage = THREE.DynamicDrawUsage;
    mesh.geometry.attributes.color.usage = THREE.DynamicDrawUsage;

    controls.target.copy(elbow).add(new THREE.Vector3(-.12, .05, 0));
    camera.position.copy(elbow).add(new THREE.Vector3(.42, .64, 1.85));
    controls.update();

    applyAngle();
    q('[data-model-state]').textContent = `RIG READY · ${editable.length} EDITABLE VERTICES`;
    q('[data-model-state]').classList.add('is-ready');
    render();
  }, undefined, error => {
    q('[data-model-state]').textContent = 'RIG FAILED TO LOAD';
    q('[data-model-state]').classList.add('is-error');
    q('.asset-sim-status').innerHTML = '<strong>Model unavailable:</strong> Check the local GLB path and reload the page.';
    console.error('Character rigging model failed to load.', error);
  });

  window.SimKit.loop(() => render());
}
