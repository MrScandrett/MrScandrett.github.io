// Solar System Walk (vr/solar-system.html): the Sun behind you, the eight planets in a
// line down a walkway. Distances are squashed and small planets swollen (the page says
// so); order, size ranking and every fact are real.
import { THREE } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import { createRig, createPointer, mountVRButton, createPanel } from '../xr-kit.mjs';

const EARTH_KM = 12742;
// km wide, AU from the Sun, day = solar day, year in Earth days, colours for the bands.
const PLANETS = [
  { name: 'Mercury', km: 4879, au: 0.39, day: '176 Earth days', year: 88, colors: ['#9c968f', '#7d776f', '#b5afa6'], note: 'Smallest planet. No air to hold heat: 430 °C by day, −180 °C at night.' },
  { name: 'Venus', km: 12104, au: 0.72, day: '117 Earth days', year: 225, colors: ['#e8cf96', '#d9b77a', '#f1dfb2'], note: 'Hottest planet (about 465 °C) because thick carbon dioxide traps the heat. Spins backwards.' },
  { name: 'Earth', km: 12742, au: 1.0, day: '24 hours', year: 365.25, colors: ['#2a64b8', '#3f8f4a', '#2a64b8', '#e9f2ff'], earth: true, note: 'The only planet known to have life, and liquid water on its surface. One Moon.' },
  { name: 'Mars', km: 6779, au: 1.52, day: '24 h 40 min', year: 687, colors: ['#b5532e', '#9a4325', '#cf7a4f'], note: 'Rusty iron dust makes it red. Home of Olympus Mons, the tallest volcano we know of. Two small moons.' },
  { name: 'Jupiter', km: 139820, au: 5.2, day: '9 h 56 min', year: 4333, colors: ['#d8b48a', '#a8784f', '#efdcc0', '#b98a5e'], note: 'Biggest planet: over 1,300 Earths would fit inside. The Great Red Spot is a storm wider than Earth.' },
  { name: 'Saturn', km: 116460, au: 9.54, day: '10 h 33 min', year: 10759, colors: ['#e6d3a3', '#cdb37c', '#f0e4c4'], rings: true, note: 'Its rings are billions of chunks of ice and rock, some as small as sand, some as big as a house.' },
  { name: 'Uranus', km: 50724, au: 19.2, day: '17 h 14 min', year: 30687, colors: ['#9fdbe3', '#8ccdd6', '#b5e6ec'], tilt: 98, note: 'Tipped on its side (98°), so each pole gets about 42 years of sunlight, then 42 years of dark.' },
  { name: 'Neptune', km: 49244, au: 30.1, day: '16 h 6 min', year: 60190, colors: ['#3b62d6', '#2f50b5', '#5a7ee6'], note: 'Fastest winds in the solar system, over 2,000 km/h. Found by maths before anyone saw it.' }
];

const LIGHT_SECONDS_PER_AU = 499;
const radiusOf = p => 0.22 * Math.pow(p.km / EARTH_KM, 0.55);
const distanceOf = p => 3.5 + 7 * Math.pow(p.au, 0.62);
const fmtKm = km => `${km.toLocaleString('en-US')} km`;
function fmtYear(days) {
  return days < 1000 ? `${days} days` : `${(days / 365.25).toFixed(days < 20000 ? 1 : 0)} years`;
}
function fmtLight(au) {
  const s = au * LIGHT_SECONDS_PER_AU;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  return `${(s / 3600).toFixed(1)} hours`;
}
function facts(p) {
  return [
    `${fmtKm(p.km)} wide · ${p.au} AU from the Sun`,
    `Day: ${p.day} · Year: ${fmtYear(p.year)}`,
    `Sunlight takes ${fmtLight(p.au)} to get here.`,
    p.note
  ];
}

function bandTexture(colors, earth) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  const rand = (() => { let s = colors.length * 97; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  if (earth) {
    g.fillStyle = colors[0];
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = colors[1];
    for (let i = 0; i < 22; i++) {
      g.beginPath();
      g.ellipse(rand() * 256, 24 + rand() * 80, 8 + rand() * 26, 6 + rand() * 16, rand() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = colors[3];
    g.fillRect(0, 0, 256, 9);
    g.fillRect(0, 119, 256, 9);
  } else {
    let y = 0;
    while (y < 128) {
      const h = 4 + rand() * 14;
      g.fillStyle = colors[Math.floor(rand() * colors.length)];
      g.fillRect(0, y, 256, h + 1);
      y += h;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const canvas = document.getElementById('vr-canvas');
const status = document.getElementById('vr-status');
let view;
try {
  view = createScene(canvas, { THREE, clearColor: 0x02040a, fov: 70, far: 400 });
} catch {
  status.textContent = '3D graphics are unavailable on this device. The planet table below has every fact.';
}

if (view) {
  const { renderer, scene, camera, syncSize } = view;
  const rig = createRig(THREE, scene, camera);
  rig.rotation.y = 0; // facing −z, down the walkway
  rig.position.set(0, 0, 0.5);

  scene.add(new THREE.AmbientLight(0x8090b0, 0.35));
  const sunLight = new THREE.PointLight(0xfff1d6, 3.2, 0, 0);
  sunLight.position.set(0, 3, 6);
  scene.add(sunLight);

  // Floor: a dark disc you can teleport anywhere on, with a lit walkway.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(95, 64), new THREE.MeshStandardMaterial({ color: 0x0b1222, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.userData.teleport = true;
  scene.add(floor);
  const walkLength = distanceOf(PLANETS[7]) + 6;
  const walkway = new THREE.Mesh(new THREE.PlaneGeometry(1.2, walkLength), new THREE.MeshBasicMaterial({ color: 0x1b2c4d }));
  walkway.rotation.x = -Math.PI / 2;
  walkway.position.set(0, 0.002, -walkLength / 2 + 4);
  walkway.userData.teleport = true;
  scene.add(walkway);

  // Stars.
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(2400 * 3);
  for (let i = 0; i < 2400; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(180 + Math.random() * 60);
    if (v.y < -10) v.y = -v.y;
    starPos.set([v.x, v.y, v.z], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true })));

  // The Sun, behind the start point (turn around to see it).
  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.4, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffc94a }));
  sun.position.set(0, 3, 6);
  sun.userData.info = {
    title: 'The Sun',
    lines: [
      '1,392,700 km wide: 109 Earths across.',
      'A star made mostly of hydrogen and helium. It holds 99.8% of all the mass in the solar system.',
      'Not to scale here either: at this walk’s size it would fill the room.'
    ]
  };
  const glow = new THREE.Mesh(new THREE.SphereGeometry(3.1, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffa62b, transparent: true, opacity: 0.18 }));
  sun.add(glow);
  scene.add(sun);

  const selectable = [sun];
  const planetMeshes = [];
  PLANETS.forEach((p, i) => {
    const r = radiusOf(p);
    const reach = p.rings ? r * 2.3 : r; // how far it sticks out, rings included
    const side = i % 2 === 0 ? -1 : 1;
    const group = new THREE.Group();
    group.position.set(side * (1.2 + reach), Math.max(1.35, r + 0.25), -distanceOf(p));
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(r, 48, 32),
      new THREE.MeshStandardMaterial({ map: bandTexture(p.colors, p.earth), roughness: 0.9, emissive: 0x000000 })
    );
    if (p.tilt) body.rotation.z = THREE.MathUtils.degToRad(p.tilt);
    group.add(body);
    if (p.rings) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r * 1.25, r * 2.25, 96),
        new THREE.MeshStandardMaterial({ color: 0xd9c89a, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
      );
      ring.rotation.x = -Math.PI / 2 + 0.47; // Saturn's tilt is about 27°
      group.add(ring);
    }
    // A pad on the walkway beside each planet: the obvious place to teleport to.
    const pad = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.36, 40), new THREE.MeshBasicMaterial({ color: 0x7cc4ff }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.004, group.position.z + 0.2);
    pad.userData.teleport = true;
    scene.add(pad);
    const label = createPanel(THREE, { width: 0.9, height: 0.22, title: p.name, lines: [] });
    label.position.set(0, r + 0.22, 0);
    group.add(label);
    group.userData = { info: { title: p.name, lines: facts(p) }, body, reach, spin: 0.25 / (1 + i * 0.3), label };
    scene.add(group);
    selectable.push(group);
    planetMeshes.push(group);
  });

  const welcome = createPanel(THREE, {
    width: 1.5,
    height: 0.95,
    title: 'Solar System Walk',
    lines: [
      'The Sun is behind you. The planets are ahead, in order.',
      'Point at the floor and select to teleport. Point at a planet to read about it. Flick the thumbstick to turn.'
    ]
  });
  welcome.position.set(1.3, 1.5, -1.6);
  welcome.rotation.y = -0.35;
  scene.add(welcome);

  const info = createPanel(THREE, { width: 1.3, height: 0.95 });
  info.visible = false;
  scene.add(info);

  function showInfo(target) {
    const { title, lines } = target.userData.info;
    info.userData.setText(title, lines);
    const at = target.getWorldPosition(new THREE.Vector3());
    const viewer = (renderer.xr.isPresenting ? renderer.xr.getCamera() : camera).getWorldPosition(new THREE.Vector3());
    // Float the card between you and the planet, a little to the side, facing you.
    const toViewer = viewer.clone().sub(at).setY(0).normalize();
    const side = new THREE.Vector3(-toViewer.z, 0, toViewer.x);
    const clearance = target === sun ? 3.4 : target.userData.reach + 0.45;
    info.position.copy(at).addScaledVector(toViewer, clearance).addScaledVector(side, 0.55);
    info.position.y = Math.max(1.3, Math.min(2.2, viewer.y - 0.05));
    info.lookAt(viewer.x, info.position.y, viewer.z);
    info.visible = true;
  }

  const targets = [...selectable, ...scene.children.filter(o => o.userData.teleport)];
  const pointer = createPointer(THREE, renderer, {
    rig,
    camera,
    canvas,
    targets: () => targets,
    onSelect: hit => showInfo(hit.object),
    onHover: obj => {
      for (const group of planetMeshes) group.userData.body.material.emissive.setHex(group === obj ? 0x333333 : 0x000000);
    }
  });

  mountVRButton(renderer, { button: document.getElementById('vr-enter'), status, rig });

  // Flat-page table, with Go buttons that move you to each planet.
  const rows = document.getElementById('planet-rows');
  PLANETS.forEach((p, i) => {
    const tr = document.createElement('tr');
    const cells = [p.name, fmtKm(p.km), `${p.au} AU`, p.day, fmtYear(p.year), fmtLight(p.au)];
    cells.forEach((text, c) => {
      const cell = document.createElement(c === 0 ? 'th' : 'td');
      if (c === 0) cell.scope = 'row';
      cell.textContent = text;
      tr.append(cell);
    });
    const td = document.createElement('td');
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'vr-go';
    go.textContent = 'Go';
    go.setAttribute('aria-label', `Go to ${p.name}`);
    go.addEventListener('click', () => {
      const group = planetMeshes[i];
      pointer.teleportTo(new THREE.Vector3(0, 0, group.position.z + group.userData.reach + 1.6));
      pointer.face(group.position);
      showInfo(group);
      canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    td.append(go);
    tr.append(td);
    rows.append(tr);
  });

  const clock = new THREE.Clock();
  const viewer = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!renderer.xr.isPresenting) syncSize();
    pointer.update();
    (renderer.xr.isPresenting ? renderer.xr.getCamera() : camera).getWorldPosition(viewer);
    for (const group of planetMeshes) {
      group.userData.body.rotation.y += dt * group.userData.spin;
      // Name tags turn to face you, so they read correctly from either side.
      const label = group.userData.label;
      const at = group.position;
      label.rotation.y = Math.atan2(viewer.x - at.x, viewer.z - at.z);
    }
    sun.rotation.y += dt * 0.03;
    renderer.render(scene, camera);
  });
}
