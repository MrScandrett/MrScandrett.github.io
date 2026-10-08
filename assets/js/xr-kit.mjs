// xr-kit.mjs — shared WebXR helpers for the VR Lab experiences (vr/*.html) and any
// lesson sim that wants an "Enter VR" button. Pairs with assets/vendor/three-bundle.min.js
// and sim-kit-three.mjs's createScene(); pass the THREE namespace in, like createScene.
//
//   const view = createScene(canvas, { THREE });
//   const rig = createRig(THREE, view.scene, view.camera);            // you stand in this
//   const pointer = createPointer(THREE, view.renderer, { rig, camera: view.camera,
//     canvas, targets: () => clickable, onSelect: hit => …, onHover: obj => … });
//   mountVRButton(view.renderer, { button, status, rig });
//   view.renderer.setAnimationLoop((t, frame) => { pointer.update(); …; view.renderer.render(view.scene, view.camera); });
//
// Use renderer.setAnimationLoop, not requestAnimationFrame: a headset pauses the page's
// rAF while an immersive session runs, so a rAF loop freezes the moment VR starts.
//
// Conventions: metres, y up, the floor is y = 0. Meshes with userData.teleport = true are
// floors you can point at and jump to. Comfort first: teleport and 30° snap turns, no
// smooth artificial motion, which is what makes people queasy.

/** Can this device/browser open an immersive VR session? Never throws. */
export async function xrSupport() {
  if (!window.isSecureContext) return { supported: false, reason: 'WebXR needs HTTPS or localhost. A LAN http:// address is not enough.' };
  if (!navigator.xr) return { supported: false, reason: 'This browser does not expose WebXR. Open this page in the headset browser.' };
  try {
    const supported = await navigator.xr.isSessionSupported('immersive-vr');
    return supported
      ? { supported: true, reason: 'Headset ready. Press Enter VR.' }
      : { supported: false, reason: 'No VR headset available to this browser. The preview below still works with a mouse.' };
  } catch {
    return { supported: false, reason: 'Browser policy blocked the VR check. The preview below still works.' };
  }
}

/** A group you stand in. The camera (and the controllers) live inside it, so moving
 *  the rig is how teleport and snap turn move you without fighting head tracking. */
export function createRig(THREE, scene, camera, { eyeHeight = 1.6 } = {}) {
  const rig = new THREE.Group();
  rig.name = 'xr-rig';
  rig.userData.eyeHeight = eyeHeight;
  scene.add(rig);
  rig.add(camera);
  camera.position.set(0, eyeHeight, 0);
  return rig;
}

const SESSION_INIT = { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] };

/**
 * Wires an Enter/Exit VR button. `status` (optional) is a live region that always says
 * what this device can do. Returns { start(), end(), session() }.
 */
export function mountVRButton(renderer, { button, status, rig, onStart, onEnd, enterLabel = 'Enter VR', exitLabel = 'Exit VR' } = {}) {
  let session = null;
  renderer.xr.enabled = true;
  const say = text => { if (status) status.textContent = text; };
  button.textContent = enterLabel;
  button.disabled = true;

  async function begin(granted) {
    button.disabled = true;
    try {
      session = granted || await navigator.xr.requestSession('immersive-vr', SESSION_INIT);
      // local-floor puts y = 0 on the real floor; fall back to 'local' (y = 0 at the
      // head) and lift the rig to eye height instead.
      let floor = true;
      try {
        renderer.xr.setReferenceSpaceType('local-floor');
        await renderer.xr.setSession(session);
      } catch {
        floor = false;
        renderer.xr.setReferenceSpaceType('local');
        await renderer.xr.setSession(session);
      }
      if (rig && !floor) rig.position.y += rig.userData.eyeHeight || 1.6;
      session.addEventListener('end', () => finish(floor), { once: true });
      button.textContent = exitLabel;
      button.disabled = false;
      say('In VR. Point and pull the trigger (or pinch) to select. Exit with this button or the headset menu.');
      onStart?.(session);
    } catch (error) {
      if (session) await session.end().catch(() => {});
      session = null;
      button.textContent = enterLabel;
      button.disabled = false;
      say(`Could not enter VR (${error.name || 'error'}). Check the headset is awake and allowed this site.`);
    }
  }

  function finish(floor) {
    session = null;
    if (rig && !floor) rig.position.y -= rig.userData.eyeHeight || 1.6;
    button.textContent = enterLabel;
    button.disabled = false;
    say('VR ended. The preview below still works, or press Enter VR again.');
    onEnd?.();
  }

  button.addEventListener('click', () => {
    if (session) session.end().catch(() => say('Use the headset menu to leave VR.'));
    else begin();
  });

  xrSupport().then(({ supported, reason }) => {
    say(reason);
    button.disabled = !supported;
    if (!supported) return;
    // Arriving from another VR page (Quest keeps you immersive across a link).
    navigator.xr.addEventListener?.('sessiongranted', () => { if (!session) begin(); });
  });

  return {
    start: () => (session ? Promise.resolve() : begin()),
    end: () => (session ? session.end() : Promise.resolve()),
    session: () => session
  };
}

/**
 * Laser pointers for both controllers (or pinching hands) in VR, and mouse/touch on the
 * flat preview: drag to look around, click to select, arrow keys to turn and step.
 *
 *   targets()    → array of Object3Ds that can be hovered/selected (floors included)
 *   onSelect(hit)  hit = THREE raycast intersection; teleport floors are handled for you
 *   onHover(object | null)
 *
 * Returns { update(), teleportTo(point), turn(radians), face(point) }. Call update() every frame.
 */
export function createPointer(THREE, renderer, { rig, camera, canvas, targets, onSelect, onHover, maxDistance = 40 }) {
  const raycaster = new THREE.Raycaster();
  raycaster.far = maxDistance;
  const tmpMatrix = new THREE.Matrix4();
  const tmpVec = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let hovered = null;

  function setHover(object) {
    if (object === hovered) return;
    hovered = object;
    onHover?.(object);
  }

  function selectableAncestor(object) {
    // Return the first ancestor that's in targets(), so a click on a child mesh
    // (a planet's ring, a frame's picture) counts as the thing itself.
    const list = targets();
    for (let o = object; o; o = o.parent) if (list.includes(o)) return o;
    return object;
  }

  function cast() {
    const hits = raycaster.intersectObjects(targets(), true);
    return hits.find(h => h.object.visible !== false) || null;
  }

  function viewerWorldPosition(out) {
    const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
    return cam.getWorldPosition(out);
  }

  function teleportTo(point) {
    const feet = viewerWorldPosition(tmpVec);
    rig.position.x += point.x - feet.x;
    rig.position.z += point.z - feet.z;
  }

  function turn(angle) {
    const pivot = viewerWorldPosition(new THREE.Vector3());
    rig.position.sub(pivot).applyAxisAngle(up, angle).add(pivot);
    rig.rotation.y += angle;
  }

  function activate(hit) {
    if (!hit) return;
    const target = selectableAncestor(hit.object);
    if (target.userData.teleport) teleportTo(hit.point);
    else onSelect?.({ ...hit, object: target });
  }

  /* ── VR controllers / hands ─────────────────────────────────── */
  const controllers = [0, 1].map(i => {
    const controller = renderer.xr.getController(i);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.85 })
    );
    line.scale.z = 5;
    line.visible = false;
    controller.add(line);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    dot.visible = false;
    controller.userData = { line, dot, hit: null, connected: false, turnArmed: true, gamepad: null };
    controller.addEventListener('connected', e => {
      controller.userData.connected = e.data.targetRayMode !== 'gaze';
      controller.userData.gamepad = e.data.gamepad || null;
      line.visible = controller.userData.connected;
    });
    controller.addEventListener('disconnected', () => {
      controller.userData.connected = false;
      line.visible = false;
      dot.visible = false;
    });
    controller.addEventListener('select', () => activate(controller.userData.hit));
    rig.add(controller);
    rig.parent.add(dot);
    return controller;
  });

  function aim(controller) {
    tmpMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpMatrix);
  }

  function snapTurn(controller) {
    // 30° per flick of either thumbstick; the stick has to recentre before the next.
    const pad = controller.userData.gamepad;
    if (!pad || !pad.axes) return;
    const x = pad.axes.length >= 4 ? pad.axes[2] : pad.axes[0];
    if (Math.abs(x) < 0.3) controller.userData.turnArmed = true;
    else if (controller.userData.turnArmed && Math.abs(x) > 0.75) {
      controller.userData.turnArmed = false;
      turn(x > 0 ? -Math.PI / 6 : Math.PI / 6);
    }
  }

  /* ── Flat preview: drag to look, click to select ─────────────── */
  let yaw = 0;
  let pitch = 0;
  let drag = null;
  const ndc = new THREE.Vector2();
  function applyLook() {
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }
  function castFromScreen(e) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return cast();
  }
  canvas.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId };
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (renderer.xr.isPresenting) return;
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
      yaw += dx * 0.005;
      pitch = Math.max(-1.2, Math.min(1.2, pitch + dy * 0.005));
      applyLook();
      return;
    }
    const hit = castFromScreen(e);
    const target = hit ? selectableAncestor(hit.object) : null;
    setHover(target);
    canvas.style.cursor = target ? 'pointer' : 'grab';
  });
  canvas.addEventListener('pointerup', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const click = drag.moved < 6;
    drag = null;
    if (click && !renderer.xr.isPresenting) activate(castFromScreen(e));
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('pointerleave', () => { if (!drag) setHover(null); });
  if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;
  canvas.addEventListener('keydown', e => {
    const step = new THREE.Vector3();
    if (e.key === 'ArrowLeft') yaw += 0.15;
    else if (e.key === 'ArrowRight') yaw -= 0.15;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      camera.getWorldDirection(step);
      step.y = 0;
      step.normalize().multiplyScalar(e.key === 'ArrowUp' ? 0.6 : -0.6);
      rig.position.add(step);
    } else return;
    e.preventDefault();
    applyLook();
  });
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';

  renderer.xr.addEventListener?.('sessionend', () => {
    // The headset pose was written into the camera; put the preview camera back.
    camera.position.set(0, rig.userData.eyeHeight || 1.6, 0);
    applyLook();
  });

  function update() {
    if (!renderer.xr.isPresenting) return;
    let anyHover = null;
    for (const controller of controllers) {
      const data = controller.userData;
      if (!data.connected) continue;
      snapTurn(controller);
      aim(controller);
      const hit = cast();
      data.hit = hit;
      data.line.scale.z = hit ? hit.distance : 5;
      data.dot.visible = !!hit;
      if (hit) {
        data.dot.position.copy(hit.point);
        anyHover = anyHover || selectableAncestor(hit.object);
      }
    }
    setHover(anyHover);
  }

  /** Point the flat-preview camera at a world position (e.g. after a "Go to" button). */
  function face(point) {
    const from = camera.getWorldPosition(new THREE.Vector3());
    const d = point.clone().sub(from);
    d.applyAxisAngle(up, -rig.rotation.y);
    yaw = Math.atan2(-d.x, -d.z);
    pitch = Math.max(-1.2, Math.min(1.2, Math.atan2(d.y, Math.hypot(d.x, d.z))));
    applyLook();
  }

  return { update, teleportTo, turn, face };
}

/**
 * A flat text panel (a canvas texture on a plane) for labels and info cards in VR,
 * where HTML can't follow you. setText(title, lines) redraws it.
 */
export function createPanel(THREE, { width = 1.2, height = 0.7, title = '', lines = [], accent = '#7cc4ff', background = 'rgba(10,18,32,0.92)' } = {}) {
  const scale = 640;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
  );

  function wrap(text, maxWidth) {
    const words = String(text).split(/\s+/);
    const out = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) { out.push(line); line = word; }
      else line = test;
    }
    if (line) out.push(line);
    return out;
  }

  function setText(nextTitle, nextLines = []) {
    const w = canvas.width;
    const h = canvas.height;
    const pad = 36;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = background;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(0, 0, w, h, 36) : ctx.rect(0, 0, w, h);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(pad, pad, 90, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 58px system-ui, -apple-system, "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'top';
    let y = pad + 28;
    for (const row of wrap(nextTitle, w - pad * 2)) { ctx.fillText(row, pad, y); y += 66; }
    y += 10;
    ctx.font = '400 36px system-ui, -apple-system, "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#d7e3f4';
    for (const paragraph of nextLines) {
      for (const row of wrap(paragraph, w - pad * 2)) {
        if (y > h - pad - 36) break;
        ctx.fillText(row, pad, y);
        y += 46;
      }
      y += 12;
    }
    texture.needsUpdate = true;
  }

  setText(title, lines);
  mesh.userData.setText = setText;
  return mesh;
}
