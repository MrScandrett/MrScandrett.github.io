import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import { writeBinaryStl, writeObj } from '../fab-io.mjs';
import { ACCEPT, readMesh, UNIT_MM } from '../mesh-import.mjs';
import { clayGeometry, clayGlb, potGeometry, prepareClayExport, prepareClayImport, readGlb } from './clay-mesh.mjs';
import {
  BODIES, FINISHES, STAGES, POT_PRESETS, SCULPT_PRESETS, newPot, addCoil,
  shapePot, newSculpture, importClay, brushClay, saveClay, openClay,
} from './clay-core.mjs';

const POT_TOOLS = {
  center: ['Center', 'Start the wheel, then touch the clay to center it.'],
  open: ['Open', 'With the wheel spinning, press into the centered clay to make a hollow.'],
  pull: ['Pull wall', 'Start the wheel and drag up to lift and thin the wall. Move right to widen it, or left to collar it.'],
  pinch: ['Pinch', 'Stop the wheel and drag sideways to pinch a section of the wall. Repeated pinching makes it thinner.'],
  rib: ['Smooth rib', 'Brush over ring marks to blend them and even the profile.'],
  trim: ['Trim foot', 'At leather-hard, turn the wheel and brush low on the vessel to trim the base.'],
};
const SCULPT_TOOLS = {
  join: ['Join clay', 'Drag to attach fresh clay and build connected masses. On real clay, score both surfaces and add slip before joining.'],
  thumb: ['Model with thumb', 'Build and blend shallow masses with the broad pressure of a thumb.'],
  loop: ['Cut with loop', 'Drag to scoop clay from the surface. Use a small tool to incise details.'],
  rib: ['Smooth rib', 'Draw the rib across seams and tool marks to smooth them.'],
};
const MAX_IMPORT_BYTES = 24 * 1024 * 1024;
const DRAFT_DB = 'classroomos-clay-drafts';
const DRAFT_STORE = 'drafts';

function openDraftDb() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('no-idb')); return; }
    const req = indexedDB.open(DRAFT_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DRAFT_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function writeDraft(mode, json) {
  try {
    const db = await openDraftDb();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(DRAFT_STORE, 'readwrite');
        tx.objectStore(DRAFT_STORE).put(json, mode);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  } catch {}
}

async function readDraft(mode) {
  try {
    const db = await openDraftDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(DRAFT_STORE, 'readonly');
        const req = tx.objectStore(DRAFT_STORE).get(mode);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } finally { db.close(); }
  } catch { return null; }
}

function saveFile(data, name, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

class ClayStudio {
  constructor(root) {
    this.root = root;
    this.mode = root.dataset.clayStudio === 'pottery' ? 'pottery' : 'sculpture';
    this.isPottery = this.mode === 'pottery';
    this.ui = Object.fromEntries([...root.querySelectorAll('[data-control]')].map(element => [element.dataset.control, element]));
    this.history = [];
    this.redoHistory = [];
    this.tool = this.isPottery ? 'pull' : 'join';
    this.project = this.isPottery ? newPot('greek') : newSculpture('bust');
    this.rotating = false;
    this.symmetry = false;
    this.silhouette = false;
    this.raking = false;
    this.request = 0;

    const view = createScene(this.ui.canvas, { THREE, clearColor: 0x211d1a, maxDpr: 1.65 });
    Object.assign(this, view);
    this.camera.position.set(3.7, 3.3, 5.5);
    this.part = new THREE.Group();
    this.scene.add(this.part);
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84 });
    this.model = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
    this.part.add(this.model);
    this.hemiLight = new THREE.HemisphereLight(0xffead4, 0x554339, 2.15);
    this.keyLight = new THREE.DirectionalLight(0xffdfbe, 2.45);
    this.keyLight.position.set(3, 6, 4);
    this.rimLight = new THREE.DirectionalLight(0xc3d8e8, 1.5);
    this.rimLight.position.set(-3, 3, -4);
    this.scene.add(this.hemiLight, this.keyLight, this.rimLight);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(2.16, 2.08, 0.14, 96), new THREE.MeshStandardMaterial({ color: 0x575053, roughness: 0.8 }));
    wheel.position.y = -0.072;
    this.part.add(wheel);
    for (const radius of [1.78, 1.94, 2.06]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.008, 6, 96), new THREE.MeshStandardMaterial({ color: 0x88807a }));
      ring.rotation.x = Math.PI / 2;
      this.part.add(ring);
    }
    this.cursor = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffdeab, side: THREE.DoubleSide, depthWrite: false }));
    this.cursor.visible = false;
    this.mirrorCursor = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 48), new THREE.MeshBasicMaterial({ color: 0x99d6ff, side: THREE.DoubleSide, depthWrite: false }));
    this.mirrorCursor.visible = false;
    this.scene.add(this.cursor, this.mirrorCursor);

    this.orbit = new OrbitControls(this.camera, this.ui.canvas);
    this.orbit.target.set(0, 1.15, 0);
    this.orbit.minDistance = 2.4;
    this.orbit.maxDistance = 13;
    this.orbit.maxPolarAngle = Math.PI * 0.52;
    this.orbit.update();
    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.populate();
    this.bind();
    this.refresh();
    this.rebuild();
    this.restoreDraft();
    let last = 0;
    this.renderer.setAnimationLoop(now => {
      if (document.hidden || !this.ui.canvas.clientWidth) return;
      const delta = Math.min(0.045, (now - last) / 1000);
      last = now;
      this.syncSize();
      if (this.rotating) this.part.rotation.y += delta * 3.2;
      if (this.dirty) this.rebuild();
      this.renderer.render(this.scene, this.camera);
    });
  }

  populate() {
    const presets = this.isPottery ? POT_PRESETS : SCULPT_PRESETS;
    for (const [id, preset] of Object.entries(presets)) this.ui.preset.add(new Option(preset.label ?? preset, id));
    this.ui.preset.value = this.isPottery ? 'greek' : 'bust';
    for (const [id, body] of Object.entries(BODIES)) this.ui.body.add(new Option(body.label, id));
    for (const [id, finish] of Object.entries(FINISHES)) this.ui.finish.add(new Option(finish.label, id));
    this.ui.file.accept = ACCEPT + ',.glb,.clay';
  }

  bind() {
    const { ui } = this;
    ui.start.addEventListener('click', () => {
      const id = ui.preset.value;
      this.replace(this.isPottery ? newPot(id) : newSculpture(id), 'Started a new piece.');
      this.tool = !this.isPottery ? 'join' : id === 'lump' ? 'center' : id === 'pinch' || id === 'coil' ? 'pinch' : 'pull';
      this.refresh();
    });
    ui.undo.addEventListener('click', () => {
      if (!this.history.length) return;
      this.request++;
      const kind = this.project.kind;
      this.redoHistory.push(structuredClone(this.project));
      if (this.redoHistory.length > 14) this.redoHistory.shift();
      this.project = this.history.pop();
      if (kind !== this.project.kind) {
        this.tool = this.project.kind === 'pot' ? 'pull' : 'join';
        this.rotating = false;
        this.part.rotation.y = 0;
      }
      if (!this.canUse(this.tool)) this.tool = 'look';
      this.dirty = true;
      this.scheduleSave();
      this.announce('Undid the last change.');
      this.refresh();
    });
    ui.redo?.addEventListener('click', () => {
      if (!this.redoHistory.length) return;
      this.request++;
      const kind = this.project.kind;
      this.history.push(structuredClone(this.project));
      if (this.history.length > 14) this.history.shift();
      this.project = this.redoHistory.pop();
      if (kind !== this.project.kind) {
        this.tool = this.project.kind === 'pot' ? 'pull' : 'join';
        this.rotating = false;
        this.part.rotation.y = 0;
      }
      if (!this.canUse(this.tool)) this.tool = 'look';
      this.dirty = true;
      this.scheduleSave();
      this.announce('Restored the undone change.');
      this.refresh();
    });
    ui.symmetry?.addEventListener('click', () => {
      this.symmetry = !this.symmetry;
      this.mirrorCursor.visible = false;
      this.refresh();
      this.announce(this.symmetry ? 'X-axis mirror symmetry on.' : 'X-axis mirror symmetry off.');
    });
    ui.silhouette?.addEventListener('click', () => {
      this.silhouette = !this.silhouette;
      this.applyInspection();
      this.refresh();
      this.announce(this.silhouette ? 'Silhouette view: read the outline from multiple angles.' : 'Clay surface view restored.');
    });
    ui.raking?.addEventListener('click', () => {
      this.raking = !this.raking;
      this.applyInspection();
      this.refresh();
      this.announce(this.raking ? 'Raking light: low angle exaggerates form and texture.' : 'Studio lighting restored.');
    });
    for (const button of this.root.querySelectorAll('[data-view]')) {
      button.addEventListener('click', () => this.setView(button.dataset.view));
    }
    ui.spin.addEventListener('click', () => {
      this.rotating = !this.rotating;
      this.cursor.visible = false;
      this.mirrorCursor.visible = false;
      this.refresh();
    });
    ui.coil.addEventListener('click', () => {
      if (this.project.stage !== 0 || this.project.kind !== 'pot') return;
      const next = structuredClone(this.project);
      if (!addCoil(next.pot)) return this.announce('Open the lump first, or finish the vessel at its current height.');
      this.checkpoint();
      this.project = next;
      this.dirty = true;
      this.refresh();
      this.announce('Added a coil to the lip. Blend the seam with the rib.');
    });
    ui.advance.addEventListener('click', () => {
      if (this.project.stage >= 3) return;
      if (!this.model.visible) return this.announce('Shape a piece before drying it.');
      this.checkpoint();
      this.project.stage++;
      if (!this.canUse(this.tool)) {
        this.tool = this.project.stage === 1 ? (this.project.kind === 'pot' ? 'trim' : 'loop') : 'look';
      }
      this.dirty = true;
      this.refresh();
      this.announce(['', 'Leather-hard clay holds detail. Trim or carve now.', 'Bone-dry clay is ready for the simulated firing.', 'Fired. The model has shrunk by the amount shown.'][this.project.stage]);
    });
    for (const key of ['body', 'finish', 'height']) ui[key].addEventListener('change', () => {
      this.checkpoint();
      const value = ui[key].value;
      if (key === 'height') this.project.heightMm = Math.max(20, Math.min(500, Number(value) || 120));
      else this.project[key] = value;
      this.dirty = true;
      this.refresh();
    });
    ui.open.addEventListener('click', () => ui.file.click());
    ui.file.addEventListener('change', async () => {
      const [file] = ui.file.files;
      ui.file.value = '';
      if (file) await this.load(file);
    });
    ui.save.addEventListener('click', () => saveFile(saveClay(this.project), this.filename() + '.clay', 'application/json'));
    ui.export.addEventListener('click', () => this.exportModel());
    document.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.isComposing || event.altKey || !(event.metaKey || event.ctrlKey)) return;
      if (this.root.offsetParent === null) return;
      if (event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey && !ui.undo.disabled) { event.preventDefault(); ui.undo.click(); }
      else if (((key === 'z' && event.shiftKey) || key === 'y') && ui.redo && !ui.redo.disabled) { event.preventDefault(); ui.redo.click(); }
      else if (key === 's') { event.preventDefault(); ui.save.click(); }
    });
    ui.canvas.addEventListener('keydown', event => {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const offset = this.camera.position.clone().sub(this.orbit.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      if (event.key === 'ArrowLeft') spherical.theta -= 0.14;
      if (event.key === 'ArrowRight') spherical.theta += 0.14;
      if (event.key === 'ArrowUp') spherical.phi = Math.max(0.08, spherical.phi - 0.12);
      if (event.key === 'ArrowDown') spherical.phi = Math.min(this.orbit.maxPolarAngle, spherical.phi + 0.12);
      if (event.key === '+' || event.key === '=') spherical.radius = Math.max(this.orbit.minDistance, spherical.radius * 0.9);
      if (event.key === '-') spherical.radius = Math.min(this.orbit.maxDistance, spherical.radius * 1.1);
      this.camera.position.setFromSpherical(spherical).add(this.orbit.target);
      this.orbit.update();
    });

    ui.canvas.addEventListener('contextmenu', event => event.preventDefault());
    ui.canvas.addEventListener('pointerdown', event => this.pointerDown(event), { capture: true });
    ui.canvas.addEventListener('pointermove', event => this.pointerMove(event), { capture: true });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      ui.canvas.addEventListener(name, event => {
        if (this.stroke?.id !== event.pointerId) return;
        this.stroke = null;
        this.scheduleSave();
        this.refresh();
      }, { capture: true });
    }
    ui.canvas.addEventListener('pointerleave', () => { this.cursor.visible = false; this.mirrorCursor.visible = false; });
  }

  async restoreDraft() {
    const startRequest = this.request;
    const saved = await readDraft(this.mode);
    if (!saved || this.request !== startRequest) return;
    try {
      const loaded = openClay(saved);
      this.project = loaded;
      this.tool = loaded.kind === 'pot' ? 'pull' : 'join';
      if (!this.canUse(this.tool)) this.tool = 'look';
      this.dirty = true;
      this.refresh();
      this.announce('Restored your saved browser draft.');
    } catch {}
  }

  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => writeDraft(this.mode, saveClay(this.project)), 450);
  }

  setView(name) {
    const views = { front: [0, 1.8, 6.6], side: [6.6, 1.8, 0], top: [0, 8.2, 0.25], reset: [3.7, 3.3, 5.5] };
    const pos = views[name] || views.reset;
    this.orbit.target.set(0, 1.15, 0);
    this.camera.position.set(...pos);
    this.orbit.update();
    this.announce(name === 'reset' ? 'Default camera view restored.' : `${name[0].toUpperCase() + name.slice(1)} view.`);
  }

  applyInspection() {
    this.keyLight.position.set(...(this.raking ? [7, 1.8, 1.5] : [3, 6, 4]));
    this.keyLight.intensity = this.raking ? 3.1 : 2.45;
    this.hemiLight.intensity = this.raking ? 0.65 : 2.15;
    this.rimLight.intensity = this.raking ? 0.5 : 1.5;
    if (this.silhouette) {
      this.material.color.setHex(0x000000);
      this.material.vertexColors = false;
      this.material.roughness = 1;
    } else {
      this.material.color.setHex(0xffffff);
      this.material.vertexColors = true;
      const { project } = this;
      this.material.roughness = project.stage === 3 ? FINISHES[project.finish].roughness : project.stage === 0 ? 0.57 : 0.85;
    }
    this.material.needsUpdate = true;
  }

  filename() {
    return this.isPottery ? 'pottery-study' : 'clay-sculpture';
  }

  announce(text) {
    this.ui.status.textContent = text;
  }

  checkpoint() {
    this.history.push(structuredClone(this.project));
    if (this.history.length > 14) this.history.shift();
    this.redoHistory.length = 0;
    this.request++;
    this.scheduleSave();
  }

  replace(project, status) {
    this.checkpoint();
    this.project = project;
    this.rotating = false;
    this.part.rotation.y = 0;
    this.tool = project.kind === 'pot' ? 'pull' : 'join';
    this.dirty = true;
    this.refresh();
    this.announce(status);
  }

  refresh() {
    const { ui, project } = this;
    const pottery = project.kind === 'pot';
    if (this.toolKind !== project.kind) {
      this.toolKind = project.kind;
      const tools = pottery ? POT_TOOLS : SCULPT_TOOLS;
      ui.tools.replaceChildren(...Object.entries({ ...tools, look: ['Orbit', 'Drag to orbit. Scroll or pinch to zoom.'] }).map(([id, [name, help]]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = name;
        button.title = help;
        button.dataset.tool = id;
        button.addEventListener('click', () => {
          this.tool = id;
          this.cursor.visible = false;
          this.refresh();
        });
        return button;
      }));
    }
    for (const button of ui.tools.children) {
      button.setAttribute('aria-pressed', String(button.dataset.tool === this.tool));
      button.disabled = !this.canUse(button.dataset.tool);
    }
    ui.hint.textContent = (pottery ? POT_TOOLS : SCULPT_TOOLS)[this.tool]?.[1] ?? 'Drag to orbit. Scroll or pinch to zoom.';
    ui.spin.hidden = !pottery;
    ui.spin.textContent = this.rotating ? 'Stop wheel' : 'Start wheel';
    ui.spin.setAttribute('aria-pressed', String(this.rotating));
    ui.coil.hidden = !pottery;
    ui.coil.disabled = project.stage !== 0 || !project.pot?.open || project.pot.height >= 3.3;
    if (ui.symmetry) {
      ui.symmetry.hidden = pottery;
      ui.symmetry.setAttribute('aria-pressed', String(this.symmetry));
    }
    ui.silhouette?.setAttribute('aria-pressed', String(this.silhouette));
    ui.raking?.setAttribute('aria-pressed', String(this.raking));
    ui.advance.textContent = ['Firm to leather-hard', 'Dry completely', 'Fire clay', 'Fired'][project.stage];
    ui.advance.disabled = project.stage >= 3;
    ui.undo.disabled = !this.history.length;
    if (ui.redo) ui.redo.disabled = !this.redoHistory.length;
    ui.size.disabled = this.tool === 'look';
    ui.body.value = project.body;
    ui.body.disabled = project.stage >= 3;
    ui.finish.value = project.finish;
    ui.finish.disabled = project.stage >= 3;
    ui.height.value = project.heightMm;
    this.metrics();
  }

  canUse(tool) {
    const { project } = this;
    if (tool === 'look') return true;
    if (project.stage >= 2) return false;
    if (project.kind === 'pot') {
      if (tool === 'trim') return project.stage === 1;
      if (tool === 'rib') return true;
      if (project.stage !== 0) return false;
      if (tool === 'center') return true;
      if (tool === 'open') return !project.pot.open;
      return project.pot.open;
    }
    return project.stage === 0 || tool === 'loop' || tool === 'rib';
  }

  scale() {
    return this.project.stage === 3 ? 1 - BODIES[this.project.body].shrink : 1;
  }

  metrics() {
    const { project, ui } = this;
    const finishedHeight = project.heightMm * this.scale();
    ui.stage.textContent = STAGES[project.stage];
    ui.measure.textContent = `${Math.round(finishedHeight)} mm tall`;
    if (project.stage === 3) ui.measure.textContent += ` · ${Math.round((1 - this.scale()) * 100)}% shrinkage`;
    if (project.kind !== 'pot' || !project.pot.open) return;
    const wallMm = Math.min(...project.pot.wall) * finishedHeight / project.pot.height;
    ui.measure.textContent += ` · ~${wallMm.toFixed(1)} mm wall`;
    if (wallMm < 1.5) ui.measure.textContent += ' · thin wall';
  }

  tint(geometry) {
    const { project } = this;
    const body = BODIES[project.body], finish = FINISHES[project.finish];
    const fired = project.stage === 3;
    const color = new THREE.Color(fired ? (finish.color || body.fired) : body.wet);
    if (project.stage === 2) color.lerp(new THREE.Color(0xffdfc7), 0.23);
    const p = geometry.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const shade = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const grain = Math.sin(93 * x + 117 * y) * Math.cos(83 * z + 111 * y);
      const rings = project.kind === 'pot' ? Math.sin(y * 210) * 0.028 : 0;
      shade.copy(color).multiplyScalar(1 + grain * 0.046 + rings);
      shade.toArray(colors, i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  rebuild() {
    const { project } = this;
    const geometry = project.kind === 'pot' ? potGeometry(project.pot) : clayGeometry(project.field);
    if (geometry) {
      this.tint(geometry);
      this.model.geometry.dispose();
      this.model.geometry = geometry;
    }
    this.model.visible = !!geometry;
    this.model.scale.setScalar(this.scale());
    this.applyInspection();
    this.dirty = false;
    this.metrics();
  }

  hit(event) {
    if (!this.model.visible) return null;
    const rect = this.ui.canvas.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.model.updateWorldMatrix(true, false);
    this.ray.setFromCamera(this.pointer, this.camera);
    return this.ray.intersectObject(this.model)[0] ?? null;
  }

  pointerDown(event) {
    if (event.button !== 0 || this.tool === 'look' || this.stroke) return;
    event.stopImmediatePropagation();
    if (!this.canUse(this.tool)) {
      this.announce('Choose a tool suitable for this clay stage, or switch to Orbit.');
      return;
    }
    const pottery = this.project.kind === 'pot';
    if (pottery && ['center', 'open', 'pull', 'trim'].includes(this.tool) && !this.rotating) {
      this.announce('Start the wheel to use this tool.');
      return;
    }
    if (pottery && this.tool === 'pinch' && this.rotating) {
      this.announce('Stop the wheel before pinching the wall.');
      return;
    }
    if (pottery && this.tool === 'open' && this.project.pot.wobble > 0.06) {
      this.announce('Center the lump before opening it.');
      return;
    }
    const hit = this.hit(event);
    if (!hit) return;
    this.checkpoint();
    const point = this.model.worldToLocal(hit.point.clone());
    this.stroke = {
      id: event.pointerId, x: event.clientX, y: event.clientY, targetY: hit.point.y,
      angle: Math.atan2(point.x, point.z),
    };
    this.ui.canvas.setPointerCapture(event.pointerId);
    this.mark(hit, 0, 0);
    this.announce(pottery && this.tool === 'open' ? 'Opened the lump. Use Pull wall to lift the clay.' : '');
    if (pottery && this.tool === 'open') this.tool = 'pull';
    this.refresh();
  }

  pointerMove(event) {
    const stroke = this.stroke;
    if (stroke && stroke.id !== event.pointerId) return;
    if ((stroke && (this.tool === 'pull' || this.tool === 'pinch')) && this.project.kind === 'pot') {
      const dx = event.clientX - stroke.x, dy = stroke.y - event.clientY;
      if (Math.hypot(dx, dy) < 2) return;
      stroke.targetY = Math.max(0, stroke.targetY + dy * 0.004);
      this.mark({ point: { y: stroke.targetY } }, dx, dy);
      stroke.x = event.clientX;
      stroke.y = event.clientY;
      return;
    }
    const hit = this.tool !== 'look' && this.canUse(this.tool) ? this.hit(event) : null;
    const size = Number(this.ui.size.value) / 100;
    this.cursor.visible = !!hit && this.project.kind === 'volume' && event.pointerType !== 'touch';
    this.mirrorCursor.visible = this.cursor.visible && this.symmetry;
    if (this.cursor.visible) {
      const normal = hit.face.normal.clone().transformDirection(this.model.matrixWorld);
      this.cursor.position.copy(hit.point).addScaledVector(normal, 0.014);
      this.cursor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      this.cursor.scale.setScalar(0.11 + size * 0.59);
      if (this.mirrorCursor.visible) {
        const localPoint = this.model.worldToLocal(hit.point.clone());
        localPoint.x = -localPoint.x;
        const worldMirror = this.model.localToWorld(localPoint);
        const mirrorNormal = hit.face.normal.clone();
        mirrorNormal.x = -mirrorNormal.x;
        mirrorNormal.transformDirection(this.model.matrixWorld);
        this.mirrorCursor.position.copy(worldMirror).addScaledVector(mirrorNormal, 0.014);
        this.mirrorCursor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), mirrorNormal);
        this.mirrorCursor.scale.setScalar(0.11 + size * 0.59);
      }
    }
    if (!stroke || !hit || Math.hypot(event.clientX - stroke.x, event.clientY - stroke.y) < 5) return;
    this.mark(hit, event.clientX - stroke.x, stroke.y - event.clientY);
    stroke.x = event.clientX;
    stroke.y = event.clientY;
  }

  mark(hit, dx, dy) {
    const size = Number(this.ui.size.value) / 100;
    if (this.project.kind === 'pot') {
      shapePot(this.project.pot, this.tool, hit.point.y, dx, dy, size, this.stroke.angle);
    } else {
      const point = this.model.worldToLocal(hit.point.clone());
      const normal = hit.face.normal;
      const radius = 0.11 + size * 0.59;
      const strength = this.tool === 'thumb' ? 0.5 : this.tool === 'loop' ? 0.78 : 0.82;
      brushClay(this.project.field, this.tool, point.toArray(), normal.toArray(), radius, strength);
      if (this.symmetry && Math.abs(point.x) > 0.02) {
        brushClay(this.project.field, this.tool, [-point.x, point.y, point.z], [-normal.x, normal.y, normal.z], radius, strength);
      }
    }
    this.dirty = true;
  }

  async load(file) {
    const request = ++this.request;
    this.announce(`Opening ${file.name}…`);
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('Choose a file smaller than 24 MB.');
      let project;
      let message;
      if (/\.clay$/i.test(file.name)) {
        project = openClay(await file.text());
        message = 'Editable clay project opened.';
      } else {
        const buffer = await file.arrayBuffer();
        let data;
        if (/\.glb$/i.test(file.name)) data = await readGlb(buffer);
        else {
          const mesh = await readMesh(buffer, file.name);
          data = { positions: mesh.positions, up: 'z', mm: mesh.units.certain || mesh.format !== 'stl' ? UNIT_MM[mesh.units.unit] : 1 };
        }
        const { positions, heightMm } = prepareClayImport(data);
        project = importClay(positions, data.up);
        project.heightMm = heightMm >= 20 && heightMm <= 500 ? Math.round(heightMm) : 120;
        message = 'Model opened as editable clay. Fine details may soften during remeshing.';
      }
      if (request === this.request) this.replace(project, message);
    } catch (error) {
      if (request === this.request) this.announce(error.message || 'That file could not be opened.');
    }
  }

  async exportModel() {
    const { ui } = this;
    let precise;
    const wasSilhouette = this.silhouette;
    try {
      if (this.dirty) this.rebuild();
      if (!this.model.visible) throw new Error('Shape some clay before exporting.');
      if (wasSilhouette) { this.silhouette = false; this.applyInspection(); }
      const format = ui.format.value;
      const height = this.project.heightMm * this.scale();
      const { printable, edges, refined } = prepareClayExport(this.model.geometry, height, this.project.field);
      precise = refined;
      if (precise && format === 'glb') this.tint(precise);
      const geometry = precise || this.model.geometry;
      const name = this.filename();
      if (format === 'stl') saveFile(writeBinaryStl(printable, name), name + '.stl', 'model/stl');
      if (format === 'obj') saveFile(writeObj([{ positions: printable, name }]), name + '.obj', 'model/obj');
      if (format === 'glb') {
        const result = await clayGlb(geometry, this.material, height, name);
        saveFile(result, name + '.glb', 'model/gltf-binary');
      }
      this.announce(edges.watertight ? `${format.toUpperCase()} exported · ${Math.round(height)} mm tall · closed mesh.` :
        `${format.toUpperCase()} exported. Repair open or non-manifold edges in your slicer or 3D editor.`);
    } catch (error) {
      this.announce(error.message || 'The model could not be exported.');
    } finally {
      if (wasSilhouette) { this.silhouette = true; this.applyInspection(); }
      precise?.dispose();
    }
  }
}

for (const root of document.querySelectorAll('[data-clay-studio]')) {
  try {
    new ClayStudio(root);
  } catch (error) {
    root.querySelector('[data-control="status"]').textContent = 'The 3D viewport needs WebGL. Open this lesson in a browser with hardware acceleration enabled.';
    console.error(error);
  }
}
