import { THREE, GLTFLoader, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

const root = document.querySelector('[data-asset-sim="animation3d"]');

if (root) {
  const q = selector => root.querySelector(selector);
  const qa = selector => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const names = ['CONTACT', 'DOWN', 'PASSING', 'UP'];
  const defaults = { height: .5, stride: .5, arm: .5, lift: .5 };
  const styles = {
    natural: { label: 'NATURALISTIC', brief: 'Prioritize observed weight, modest vertical motion, and continuous spacing.', frames: 16, timing: 'smooth', stage: 0xbad1d8, grid: 0x6e929d, accent: 0x56b8ad, tint: 0xdde8dc, targets: [{height:.54,stride:.72,arm:.58,lift:.06},{height:.34,stride:.57,arm:.48,lift:.05},{height:.53,stride:.18,arm:.24,lift:.62},{height:.72,stride:.35,arm:.34,lift:.5}] },
    cartoon: { label: 'CARTOON', brief: 'Push contrast between squash and stretch, widen the silhouette, and favor generous arcs.', frames: 16, timing: 'elastic', stage: 0xf4c99e, grid: 0xb97f6a, accent: 0xf05b3c, tint: 0xffcf83, targets: [{height:.62,stride:.98,arm:.96,lift:.03},{height:.04,stride:.7,arm:.76,lift:.02},{height:.5,stride:.08,arm:.38,lift:.96},{height:.98,stride:.45,arm:.62,lift:.82}] },
    anime: { label: 'ANIME-INSPIRED', brief: 'Hold strong silhouettes, then move decisively through short, designed transitions.', frames: 12, timing: 'held', stage: 0xd9cae8, grid: 0x8f7eaa, accent: 0xa64fc5, tint: 0xe5bbdf, targets: [{height:.58,stride:.9,arm:.84,lift:.04},{height:.25,stride:.64,arm:.72,lift:.03},{height:.54,stride:.1,arm:.2,lift:.88},{height:.9,stride:.36,arm:.48,lift:.72}] },
    retro: { label: 'LOW-POLY RETRO', brief: 'Use stepped timing, angular joints, and economical poses that survive a distant game camera.', frames: 8, timing: 'stepped', stage: 0xaebbe3, grid: 0x6573a4, accent: 0x5f78de, tint: 0xb7c1f0, targets: [{height:.55,stride:.82,arm:.7,lift:.02},{height:.22,stride:.6,arm:.56,lift:.02},{height:.5,stride:.14,arm:.2,lift:.72},{height:.82,stride:.4,arm:.4,lift:.58}] }
  };

  let style = 'natural';
  let poses = styles.natural.targets.map(() => ({ ...defaults }));
  let selected = 0;
  let playing = false;
  let time = 0;
  let speed = 1;
  let showRig = true;
  let showArcs = true;
  let model;
  let mixer;
  let walkClip;
  let skeletonHelper;
  let controls;
  let bones = {};
  let restPose = {};
  let hipsWorldScale = 1;

  const canvas = q('canvas');
  const stage = q('.asset-sim-stage');
  const state = createScene(canvas, { THREE, fov: 34, near: .01, far: 60, clearColor: styles.natural.stage });
  const { renderer, scene, camera } = state;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  camera.position.set(4.8, 1.7, .25);

  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.35, 0);
  controls.enablePan = false;
  controls.minDistance = 3.6;
  controls.maxDistance = 7;
  controls.minPolarAngle = Math.PI * .25;
  controls.maxPolarAngle = Math.PI * .68;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x355060, 2.25));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(3, 6, 4);
  keyLight.castShadow = true;
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x9edfff, 1.8);
  rimLight.position.set(-4, 3, -4);
  scene.add(rimLight);

  const floorMaterial = new THREE.MeshStandardMaterial({ color: styles.natural.stage, roughness: .92, metalness: 0 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3.6, 64), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(6.4, 16, styles.natural.grid, styles.natural.grid);
  grid.position.y = .006;
  grid.material.transparent = true;
  grid.material.opacity = .36;
  scene.add(grid);

  const contactMaterial = new THREE.MeshBasicMaterial({ color: styles.natural.accent, transparent: true, opacity: .78, side: THREE.DoubleSide });
  const contacts = [0, 1].map(() => {
    const marker = new THREE.Mesh(new THREE.RingGeometry(.12, .2, 28), contactMaterial);
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = .018;
    scene.add(marker);
    return marker;
  });
  const arcMaterial = new THREE.LineBasicMaterial({ color: styles.natural.accent, transparent: true, opacity: .58 });
  const arcLines = ['Head', 'LeftHand', 'RightFoot'].map(() => {
    const line = new THREE.Line(new THREE.BufferGeometry(), arcMaterial.clone());
    scene.add(line);
    return line;
  });

  const profile = () => styles[style];
  const targets = () => profile().targets;
  const currentPose = () => poses[selected];
  const ease = value => value * value * (3 - 2 * value);
  const poseAt = rawTime => {
    const phase = ((rawTime % 4) + 4) % 4;
    const a = Math.floor(phase);
    const b = (a + 1) % 4;
    let mix = phase - a;
    if (profile().timing === 'held') mix = mix < .62 ? 0 : ease((mix - .62) / .38);
    else if (profile().timing === 'stepped') mix = Math.floor(mix * 3) / 3;
    else if (profile().timing === 'elastic') mix = ease(clamp(mix * 1.12, 0, 1));
    else mix = ease(mix);
    const pose = { phase };
    Object.keys(defaults).forEach(key => pose[key] = poses[a][key] * (1 - mix) + poses[b][key] * mix);
    return pose;
  };
  const sampledPhase = rawTime => {
    const phase = ((rawTime % 4) + 4) % 4;
    if (profile().timing === 'held' || profile().timing === 'stepped') {
      return Math.floor(phase / 4 * profile().frames) / profile().frames * 4;
    }
    return phase;
  };

  function setBoneRotation(bone, axis, amount) {
    if (bone) bone.rotation[axis] += amount;
  }

  function applyAt(rawTime) {
    if (!mixer || !walkClip) return;
    const phase = sampledPhase(rawTime);
    Object.entries(bones).forEach(([name, bone]) => {
      const rest = restPose[name];
      if (!rest) return;
      bone.position.copy(rest.position);
      bone.quaternion.copy(rest.quaternion);
      bone.scale.copy(rest.scale);
    });
    mixer.setTime(phase / 4 * walkClip.duration);
    const pose = poseAt(phase);
    const step = Math.cos(phase / 4 * Math.PI);
    const travel = Math.sin(phase / 4 * Math.PI);
    if (bones.Hips) bones.Hips.position.y += (pose.height - .5) * .32 / hipsWorldScale;
    const stride = (pose.stride - .5) * .72;
    setBoneRotation(bones.LeftUpLeg, 'x', stride * step);
    setBoneRotation(bones.RightUpLeg, 'x', -stride * step);
    const arm = (pose.arm - .5) * .82;
    setBoneRotation(bones.LeftArm, 'x', -arm * step);
    setBoneRotation(bones.RightArm, 'x', arm * step);
    const lift = Math.max(0, pose.lift - .15) * travel;
    setBoneRotation(bones.RightLeg, 'x', lift * .62);
    setBoneRotation(bones.RightUpLeg, 'x', -lift * .26);
    if (style === 'cartoon') {
      setBoneRotation(bones.Spine2, 'z', Math.sin(phase * Math.PI / 2) * .07);
      setBoneRotation(bones.Head, 'z', -Math.sin(phase * Math.PI / 2) * .08);
    } else if (style === 'anime') {
      setBoneRotation(bones.Spine2, 'x', -.08);
      setBoneRotation(bones.Head, 'x', .06);
    }
    model.updateMatrixWorld(true);
  }

  function grade() {
    const target = targets();
    const checks = [
      poses[1].height < poses[0].height - (target[0].height - target[1].height) * .65,
      poses[3].height > poses[2].height + (target[3].height - target[2].height) * .65,
      poses[0].stride > poses[1].stride + (target[0].stride - target[1].stride) * .6,
      poses[2].stride < poses[3].stride - (target[3].stride - target[2].stride) * .6,
      poses[0].arm > target[0].arm * .78,
      poses[2].lift > target[2].lift * .78,
      poses[0].lift < Math.max(.2, target[0].lift + .14),
      poses[1].lift < Math.max(.2, target[1].lift + .14)
    ];
    return { checks, score: checks.filter(Boolean).length / checks.length * 100 };
  }

  function diagnostic() {
    if (!model) return '<strong>Loading the humanoid rig:</strong> The viewport will activate when the CC0 GLB is ready.';
    const { checks, score } = grade();
    if (!checks[0]) return '<strong>Find the down:</strong> Lower the Down pose clearly below Contact so the landing has weight.';
    if (!checks[1]) return '<strong>Show the push:</strong> Raise Up above Passing to create a visible vertical rhythm.';
    if (!checks[2]) return '<strong>Open the contact:</strong> Contact needs a longer stride than Down; let the limbs reach before weight lands.';
    if (!checks[3]) return '<strong>Close the passing pose:</strong> Bring the feet nearer together as the free leg travels under the hips.';
    if (!checks[4]) return '<strong>Clarify opposition:</strong> Increase arm swing on Contact so the silhouette reads from a distance.';
    if (!checks[6] || !checks[7]) return '<strong>Protect contact:</strong> Keep Foot lift low on Contact and Down so the planted foot does not skate.';
    if (!checks[5]) return '<strong>Clear the floor:</strong> Raise Foot lift on Passing to keep the toe from dragging.';
    return score === 100 ? `<strong>${profile().label.toLowerCase()} cycle reads:</strong> The skinned character, skeleton, cadence, and pose contrast agree with this art direction.` : '<strong>Nearly there:</strong> Rotate the viewport and compare the rig, silhouette, and contact markers.';
  }

  function updateMeter() {
    const result = grade();
    q('.asset-meter span').style.width = `${result.score}%`;
    q('.asset-sim-score').textContent = `${Math.round(result.score)} / 100`;
    q('.asset-sim-status').innerHTML = diagnostic();
  }

  function syncReadout() {
    const frames = profile().frames;
    const frame = Math.min(frames, Math.floor(time / 4 * frames) + 1);
    const poseIndex = Math.floor((time + .5) % 4);
    q('[data-animation-readout]').textContent = `${profile().label} · FRAME ${String(frame).padStart(2, '0')} · ${names[poseIndex]}`;
    q('[data-animation-pose-name]').textContent = names[selected];
    q('[data-animation-time]').value = Math.round(time / 4 * 100);
    q('output[for="animTime"]').textContent = String(frame).padStart(2, '0');
  }

  function updateContacts() {
    if (!model) return;
    const feet = [bones.LeftFoot, bones.RightFoot];
    feet.forEach((bone, index) => {
      if (!bone) return;
      bone.getWorldPosition(contacts[index].position);
      const footHeight = contacts[index].position.y;
      contacts[index].position.y = .018;
      contacts[index].visible = footHeight < .2;
    });
  }

  function updateArcs() {
    if (!model || !mixer) return;
    const tracked = [bones.Head, bones.LeftHand, bones.RightFoot];
    tracked.forEach((bone, index) => {
      const points = [];
      for (let sample = 0; sample < profile().frames; sample++) {
        applyAt(sample / profile().frames * 4);
        const point = new THREE.Vector3();
        bone?.getWorldPosition(point);
        points.push(point);
      }
      arcLines[index].geometry.dispose();
      arcLines[index].geometry = new THREE.BufferGeometry().setFromPoints(points);
      arcLines[index].visible = showArcs;
    });
  }

  function applyLook() {
    const selectedStyle = profile();
    renderer.setClearColor(selectedStyle.stage);
    floorMaterial.color.setHex(selectedStyle.stage).offsetHSL(0, -.04, -.05);
    grid.material.color.setHex(selectedStyle.grid);
    contactMaterial.color.setHex(selectedStyle.accent);
    arcLines.forEach(line => line.material.color.setHex(selectedStyle.accent));
    if (skeletonHelper) skeletonHelper.material.color.setHex(selectedStyle.accent);
    model?.traverse(child => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(material => {
        if (!material.userData.animationBaseColor) material.userData.animationBaseColor = material.color?.clone();
        if (material.color && material.userData.animationBaseColor) {
          material.color.copy(material.userData.animationBaseColor).lerp(new THREE.Color(selectedStyle.tint), style === 'natural' ? .08 : .2);
        }
        material.flatShading = style === 'retro';
        material.needsUpdate = true;
      });
    });
  }

  function render() {
    state.syncSize();
    if (model) {
      applyAt(time);
      updateContacts();
      if (skeletonHelper) skeletonHelper.visible = showRig;
    }
    controls.update();
    renderer.render(scene, camera);
    syncReadout();
    updateMeter();
  }

  function setPlaying(value) {
    playing = value;
    q('[data-animation-play]').textContent = playing ? '❚❚ Pause loop' : '▶ Play loop';
  }

  function selectPose(index) {
    selected = (index + 4) % 4;
    setPlaying(false);
    time = selected;
    qa('[data-pose]').forEach((button, buttonIndex) => {
      const active = buttonIndex === selected;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const pose = currentPose();
    qa('[data-control]').forEach(input => {
      input.value = Math.round(pose[input.dataset.control] * 100);
      q(`output[for="${input.id}"]`).textContent = input.value;
    });
    updateArcs();
    render();
  }

  qa('[data-pose]').forEach(button => button.addEventListener('click', () => selectPose(+button.dataset.pose)));
  qa('[data-control]').forEach(input => input.addEventListener('input', () => {
    currentPose()[input.dataset.control] = +input.value / 100;
    q(`output[for="${input.id}"]`).textContent = input.value;
    time = selected;
    updateArcs();
    render();
  }));
  q('[data-animation-time]').addEventListener('input', event => {
    setPlaying(false);
    time = Math.min(3.999, +event.target.value / 100 * 4);
    render();
  });
  q('[data-animation-speed]').addEventListener('input', event => {
    speed = +event.target.value / 100;
    q(`output[for="${event.target.id}"]`).textContent = `${speed}×`;
  });
  q('[data-animation-play]').addEventListener('click', () => { setPlaying(!playing); render(); });
  q('[data-animation-guide]').addEventListener('click', () => { poses = targets().map(pose => ({ ...pose })); selectPose(selected); });
  q('[data-animation-reset]').addEventListener('click', () => { poses = targets().map(() => ({ ...defaults })); selectPose(0); });
  q('[data-animation-onion]').addEventListener('click', event => {
    showRig = !showRig;
    event.currentTarget.classList.toggle('is-active', showRig);
    event.currentTarget.setAttribute('aria-pressed', String(showRig));
    render();
  });
  q('[data-animation-arcs]').addEventListener('click', event => {
    showArcs = !showArcs;
    event.currentTarget.classList.toggle('is-active', showArcs);
    event.currentTarget.setAttribute('aria-pressed', String(showArcs));
    arcLines.forEach(line => line.visible = showArcs);
    render();
  });
  qa('[data-animation-style]').forEach(button => button.addEventListener('click', () => {
    style = button.dataset.animationStyle;
    root.dataset.motionStyle = style;
    poses = targets().map(pose => ({ ...pose }));
    qa('[data-animation-style]').forEach(styleButton => {
      const active = styleButton === button;
      styleButton.classList.toggle('is-active', active);
      styleButton.setAttribute('aria-pressed', String(active));
    });
    q('[data-animation-style-label]').textContent = profile().label;
    q('[data-animation-style-brief]').textContent = profile().brief;
    applyLook();
    selectPose(selected);
  }));
  canvas.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      setPlaying(false);
      time = (time + (event.key === 'ArrowLeft' ? -.125 : .125) + 4) % 4;
      render();
    } else if (event.key === ' ') {
      event.preventDefault();
      setPlaying(!playing);
      render();
    } else if (/^[1-4]$/.test(event.key)) {
      event.preventDefault();
      selectPose(+event.key - 1);
    }
  });

  // Shared 3D test dummy: the rigging lesson's sim (character-rigging-sim.mjs)
  // loads this same GLB so a student rigs the exact model they animate here.
  new GLTFLoader().load(new URL('../../models/animation-studio/quaternius-human.glb', import.meta.url).href, gltf => {
    model = gltf.scene;
    model.traverse(child => {
      if (child.isBone) {
        bones[child.name] = child;
        restPose[child.name] = {
          position: child.position.clone(),
          quaternion: child.quaternion.clone(),
          scale: child.scale.clone()
        };
      }
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = Array.isArray(child.material) ? child.material.map(material => material.clone()) : child.material.clone();
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
    // The source rig's Armature node carries a large hidden scale (a leftover
    // unit-conversion factor from the original Blender/glTF export), so a raw
    // local-space position offset on Hips would land many world-units away.
    // Divide by the bone's actual world scale to keep the offset in world units.
    hipsWorldScale = bones.Hips.getWorldScale(new THREE.Vector3()).y;
    mixer = new THREE.AnimationMixer(model);
    walkClip = gltf.animations.find(clip => /\|Walk$/i.test(clip.name)) || gltf.animations[0];
    mixer.clipAction(walkClip).play();
    skeletonHelper = new THREE.SkeletonHelper(model);
    skeletonHelper.material.depthTest = false;
    skeletonHelper.material.transparent = true;
    skeletonHelper.material.opacity = .72;
    skeletonHelper.renderOrder = 4;
    scene.add(skeletonHelper);
    applyLook();
    q('[data-model-state]').textContent = `RIG READY · ${Object.keys(bones).length} BONES · ${gltf.animations.length} CLIPS`;
    q('[data-model-state]').classList.add('is-ready');
    updateArcs();
    render();
  }, undefined, error => {
    q('[data-model-state]').textContent = 'RIG FAILED TO LOAD';
    q('[data-model-state]').classList.add('is-error');
    q('.asset-sim-status').innerHTML = '<strong>Model unavailable:</strong> Check the local GLB path and reload the page.';
    console.error('Character animation model failed to load.', error);
  });

  window.SimKit.loop(delta => {
    if (playing) time = (time + delta * 1.6 * speed) % 4;
    render();
  });
}
