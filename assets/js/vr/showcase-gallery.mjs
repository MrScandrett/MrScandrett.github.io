// Student Showcase Hall (vr/showcase-gallery.html): every project in apps/manifest.json,
// framed around the walls of a round room, newest at eye level. Selecting a frame shows
// its card; "Open project" leaves VR and opens the project page.
import { THREE } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import { createRig, createPointer, mountVRButton, createPanel } from '../xr-kit.mjs';

const SITE = new URL('../../../', import.meta.url);
const FRAME_W = 1.15;
const FRAME_H = 0.72;
const SPACING = 1.45;
const TIER_Y = [1.55, 0.78, 2.32]; // eye level first, then below, then above
const BORDER = 0x2a3550;
const BORDER_HOVER = 0x7cc4ff;

const canvas = document.getElementById('vr-canvas');
const status = document.getElementById('vr-status');
const list = document.getElementById('project-list');
const count = document.getElementById('project-count');

const projectHref = p => new URL(`project.html?id=${encodeURIComponent(`app-${p.slug}`)}`, SITE).href;

async function loadProjects() {
  const res = await fetch(new URL('apps/manifest.json', SITE));
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  const projects = await res.json();
  return projects
    .filter(p => p && p.slug && p.name)
    .sort((a, b) => String(b.date_added || '').localeCompare(String(a.date_added || '')));
}

function fillList(projects) {
  count.textContent = `${projects.length} projects, newest first.`;
  list.replaceChildren(...projects.map(p => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = projectHref(p);
    a.textContent = p.name;
    li.append(a, ` — ${p.student || 'Class project'}${p.category ? ` · ${p.category}` : ''}`);
    return li;
  }));
}

// Thumbnails are a mix of SVG, PNG, JPG and WebP at any size; letterbox each onto a
// fixed canvas so every frame shows the whole picture.
function thumbTexture(url, onReady) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#16203a';
  g.fillRect(0, 0, c.width, c.height);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (!url) return texture;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    const w = img.naturalWidth || 512;
    const h = img.naturalHeight || 320;
    const s = Math.min(c.width / w, c.height / h);
    g.drawImage(img, (c.width - w * s) / 2, (c.height - h * s) / 2, w * s, h * s);
    texture.needsUpdate = true;
    onReady?.();
  };
  img.src = new URL(url, SITE).href;
  return texture;
}

let view;
try {
  view = createScene(canvas, { THREE, clearColor: 0x0a0f1c, fov: 70, far: 120 });
} catch {
  status.textContent = '3D graphics are unavailable on this device. Every project is listed below.';
}

if (view) boot(view);
else loadProjects().then(fillList).catch(() => { count.textContent = 'Could not load the showcase list.'; });

async function boot({ renderer, scene, camera, syncSize }) {
  const rig = createRig(THREE, scene, camera);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1f2e, 1.4));

  let projects = [];
  try {
    projects = await loadProjects();
    fillList(projects);
  } catch {
    count.textContent = 'Could not load the showcase list.';
  }

  const perTier = Math.max(12, Math.ceil(projects.length / TIER_Y.length));
  const radius = Math.max(5, (perTier * SPACING) / (Math.PI * 2));

  const floor = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.4, 64), new THREE.MeshStandardMaterial({ color: 0x1b2333, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.userData.teleport = true;
  scene.add(floor);
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(radius + 0.1, radius + 0.1, 3.4, 96, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x2b3448, side: THREE.BackSide, roughness: 1 })
  );
  wall.position.y = 1.7;
  scene.add(wall);
  const inlay = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.18, 64), new THREE.MeshBasicMaterial({ color: 0x7cc4ff }));
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.y = 0.003;
  scene.add(inlay);

  const sign = createPanel(THREE, {
    width: 1.6,
    height: 0.9,
    title: 'Student Showcase Hall',
    lines: [`${projects.length} projects made by the class, newest at eye level.`, 'Point at a frame and select it. Point at the floor to move.']
  });
  sign.position.set(0, 1.55, -1.6);
  scene.add(sign);

  const frames = [];
  projects.forEach((p, i) => {
    const tier = Math.floor(i / perTier);
    const slot = i % perTier;
    // Start straight ahead (−z) and go round; offset upper/lower tiers by half a slot.
    const angle = Math.PI + ((slot + (tier % 2) * 0.5) / perTier) * Math.PI * 2;
    const frame = new THREE.Group();
    frame.position.set(Math.sin(angle) * radius, TIER_Y[tier] ?? 1.55, Math.cos(angle) * radius);
    frame.lookAt(0, frame.position.y, 0);
    const border = new THREE.Mesh(new THREE.BoxGeometry(FRAME_W + 0.08, FRAME_H + 0.08, 0.04), new THREE.MeshStandardMaterial({ color: BORDER, roughness: 0.6 }));
    const picture = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_W, FRAME_H), new THREE.MeshBasicMaterial({ map: thumbTexture(p.thumbnail) }));
    picture.position.z = 0.022;
    frame.add(border, picture);
    frame.userData = { project: p, border };
    scene.add(frame);
    frames.push(frame);
  });

  // The card for the selected project, plus its Open button.
  const card = createPanel(THREE, { width: 1.2, height: 0.78 });
  const open = createPanel(THREE, { width: 0.7, height: 0.2, title: 'Open project ▶', lines: [], accent: '#5fe0a8', background: 'rgba(22,92,64,0.95)' });
  card.visible = false;
  open.visible = false;
  scene.add(card, open);
  let current = null;

  function showCard(frame) {
    const p = frame.userData.project;
    current = p;
    card.userData.setText(p.name, [
      `By ${p.student || 'the class'}${p.category ? ` · ${p.category}` : ''}`,
      (p.tech || []).length ? `Made with ${p.tech.join(', ')}` : '',
      (p.tags || []).length ? `Tags: ${p.tags.slice(0, 5).join(', ')}` : ''
    ].filter(Boolean));
    // In front of the frame, toward the middle of the room, at a comfortable height.
    const inward = new THREE.Vector3(-frame.position.x, 0, -frame.position.z).normalize();
    card.position.copy(frame.position).addScaledVector(inward, 1.1).setY(1.45);
    card.lookAt(0, 1.45, 0); // a plane's front is +z, so this faces the middle of the room
    open.position.copy(card.position).setY(0.93);
    open.quaternion.copy(card.quaternion);
    card.visible = true;
    open.visible = true;
  }

  async function openCurrent() {
    if (!current) return;
    const href = projectHref(current);
    const session = renderer.xr.getSession();
    if (session) await session.end().catch(() => {});
    location.href = href;
  }

  const teleports = [floor];
  const pointer = createPointer(THREE, renderer, {
    rig,
    camera,
    canvas,
    targets: () => [open, ...frames, ...teleports],
    onSelect: hit => {
      if (hit.object === open) openCurrent();
      else if (hit.object.userData.project) showCard(hit.object);
    },
    onHover: obj => {
      for (const f of frames) f.userData.border.material.color.setHex(f === obj ? BORDER_HOVER : BORDER);
    }
  });
  // An invisible Open button must not catch the laser.
  open.raycast = function (...args) { if (open.visible) THREE.Mesh.prototype.raycast.apply(this, args); };

  mountVRButton(renderer, { button: document.getElementById('vr-enter'), status, rig });

  renderer.setAnimationLoop(() => {
    if (!renderer.xr.isPresenting) syncSize();
    pointer.update();
    renderer.render(scene, camera);
  });
}
