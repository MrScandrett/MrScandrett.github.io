/* Print-in-Place Fidgets — the two design labs on lessons/print-fidgets.html.
 *
 *  1. Clearance Lab (2D)  — a cross-section of two neighbouring walls, drawn
 *     bead by bead, so students can see the moment a designed gap stops being
 *     air and starts being a weld.
 *  2. Spiral Cone Lab (3D) — the capstone fidget rebuilt live from its five
 *     real design numbers, with the same pass/fail rules a slicer applies.
 *
 * Geometry is generated here rather than loaded: the whole point is that the
 * numbers on the sliders are the numbers you type into Blender.
 */

import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

const SimKit = window.SimKit;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const INK = '#241a12';
const FIXED = '#8a6a4d';
const MOVING = '#e8792a';
const WELD = '#d9463c';
const AIR = '#7bd88f';
const PAPER = '#f4e3d3';
const round = (value, places = 2) => Number(value.toFixed(places));

/* Reads every [data-pf-input] inside a lab into a plain {name: number} object
   and mirrors each value into its <output>, so markup stays the single source
   of truth for ranges, steps, and units. */
function bindControls(root, onChange) {
  const inputs = [...root.querySelectorAll('[data-pf-input]')];
  const read = () => {
    const values = {};
    for (const input of inputs) {
      values[input.dataset.pfInput] = input.type === 'checkbox' ? input.checked : Number(input.value);
    }
    return values;
  };
  const sync = () => {
    for (const input of inputs) {
      const out = root.querySelector(`[data-pf-output="${input.dataset.pfInput}"]`);
      if (out) out.textContent = `${input.value}${input.dataset.pfUnit || ''}`;
    }
    onChange(read());
  };
  inputs.forEach(input => input.addEventListener('input', sync));
  root.querySelectorAll('[data-pf-preset]').forEach(button => button.addEventListener('click', () => {
    const preset = JSON.parse(button.dataset.pfPreset);
    for (const input of inputs) {
      if (!(input.dataset.pfInput in preset)) continue;
      if (input.type === 'checkbox') input.checked = Boolean(preset[input.dataset.pfInput]);
      else input.value = preset[input.dataset.pfInput];
    }
    root.querySelectorAll('[data-pf-preset]').forEach(other => other.classList.toggle('is-active', other === button));
    sync();
  }));
  return { read, sync };
}

/* Verdict lists share one shape: {tone, tag, text}. */
function renderVerdicts(list, verdicts) {
  list.replaceChildren(...verdicts.map(verdict => {
    const li = document.createElement('li');
    li.className = `is-${verdict.tone}`;
    const tag = document.createElement('b');
    tag.textContent = verdict.tag;
    const text = document.createElement('span');
    text.textContent = verdict.text;
    li.append(tag, text);
    return li;
  }));
}

function renderStats(list, stats) {
  list.replaceChildren(...stats.map(stat => {
    const li = document.createElement('li');
    const label = document.createElement('b');
    label.textContent = stat.label;
    const value = document.createElement('span');
    value.textContent = stat.value;
    li.append(label, value);
    return li;
  }));
}

/* ══ 1. Clearance Lab ═══════════════════════════════════════════════════════
   Two neighbouring walls in cross-section. In XY mode they sit side by side
   (the gap is a vertical slot); in Z mode one sits above the other (the gap is
   a ceiling the moving part has to bridge). Those two cases have different
   safe numbers, which is the whole lesson.
*/
function clearanceLab(root) {
  const canvas = root.querySelector('[data-pf-canvas]');
  const verdictList = root.querySelector('[data-pf-verdicts]');
  const statList = root.querySelector('[data-pf-stats]');
  let params = null;
  let view = null;

  function evaluate(p) {
    const stacked = p.mode === 1;
    const beadWidth = p.nozzle * 1.08;              // a squashed bead spreads past the nozzle
    const spill = (beadWidth - p.nozzle) / 2;        // ...by this much on each side
    const airLeft = stacked ? p.gap - 0.05 : p.gap - spill * 2;
    const layers = p.gap / p.layer;

    const stats = [
      { label: 'Designed gap', value: `${round(p.gap, 2)} mm` },
      { label: 'Bead width', value: `${round(beadWidth, 2)} mm` },
      { label: stacked ? 'Layers of air' : 'Air after squish', value: stacked ? `${round(layers, 1)}` : `${round(Math.max(airLeft, 0), 2)} mm` },
      { label: 'Verdict', value: airLeft <= 0 ? 'welded' : stacked && p.gap > 0.6 ? 'sags' : 'free' }
    ];

    const verdicts = [];
    if (stacked) {
      if (layers < 1) verdicts.push({ tone: 'bad', tag: 'WELDED', text: `A ${round(p.gap, 2)} mm ceiling gap is less than one ${p.layer} mm layer. The nozzle presses hot plastic straight onto the part below and the two fuse into one solid lump.` });
      else if (p.gap <= 0.3) verdicts.push({ tone: 'ok', tag: 'FREE', text: `One to two layers of air. The moving part's first layer sags just enough to land on the surface below, cools, and peels apart with a twist. This is the sweet spot for a Z gap.` });
      else if (p.gap <= 0.6) verdicts.push({ tone: 'warn', tag: 'ROUGH', text: 'It will still separate, but the first layer droops across that much air, so the underside comes out stringy and the part rattles.' });
      else verdicts.push({ tone: 'bad', tag: 'DROOPS', text: 'Too much air. The moving part\'s first layer has nothing close enough to land on, so it curls up, catches the nozzle, and drags the print off course.' });
      verdicts.push({ tone: 'ok', tag: 'RULE', text: 'A gap in Z is a ceiling: aim for one to one-and-a-half layer heights — about 0.2–0.3 mm at a 0.2 mm layer.' });
    } else {
      if (airLeft <= 0) verdicts.push({ tone: 'bad', tag: 'WELDED', text: `Each bead spreads ${round(spill, 2)} mm past the nozzle on both sides. At ${round(p.gap, 2)} mm the two walls touch while molten and print as one piece.` });
      else if (p.gap < p.nozzle) verdicts.push({ tone: 'warn', tag: 'GAP FILL', text: `The gap is narrower than one ${p.nozzle} mm bead, so the slicer may squeeze a thin gap-fill bead into the slot — and that bead welds both walls together.` });
      else if (p.gap <= p.nozzle * 1.75) verdicts.push({ tone: 'ok', tag: 'FREE', text: 'One full bead width of air or more. The slicer draws two separate perimeters with nothing between them, and the parts come off the bed already moving.' });
      else verdicts.push({ tone: 'warn', tag: 'LOOSE', text: 'It will definitely move — sloppily. Big side gaps make a fidget feel rattly and wobbly instead of crisp.' });
      verdicts.push({ tone: 'ok', tag: 'RULE', text: `A gap in XY is a slot: give it at least one full nozzle width — ${p.nozzle} mm here.` });
    }
    return { stats, verdicts, stacked, beadWidth, spill, airLeft };
  }

  function draw() {
    if (!params || !view) return;
    const { ctx, width, height } = view;
    const p = params;
    const model = evaluate(p);
    const viewMM = 7;
    const scale = width / viewMM;
    const layerPx = p.layer * scale;
    const beadPx = model.beadWidth * scale;

    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, width, height);

    // faint mm grid so the drawing reads as a measured cross-section
    ctx.strokeStyle = 'rgba(244,227,211,.1)';
    ctx.lineWidth = 1;
    for (let mm = 0; mm <= viewMM; mm++) {
      ctx.beginPath();
      ctx.moveTo(mm * scale, 0);
      ctx.lineTo(mm * scale, height);
      ctx.stroke();
    }

    const bead = (x, y, w, h, fill) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h / 2, w, h, Math.min(h, w) / 2);
      ctx.fill();
    };

    const bedY = height - 26;
    const rows = Math.max(3, Math.floor((height - 90) / Math.max(layerPx, 3)));

    if (model.stacked) {
      // fixed part below, moving part above, separated by the ceiling gap
      const fixedRows = Math.max(2, Math.round(rows * 0.45));
      const wallW = 3.4 * scale;
      const cx = width / 2;
      for (let i = 0; i < fixedRows; i++) {
        const y = bedY - i * layerPx - layerPx / 2;
        for (let b = 0; b < Math.round(wallW / beadPx); b++) {
          bead(cx - wallW / 2 + beadPx / 2 + b * beadPx, y, beadPx, layerPx, FIXED);
        }
      }
      const topOfFixed = bedY - fixedRows * layerPx;
      const gapPx = p.gap * scale;
      const movingBase = topOfFixed - gapPx;
      const sag = Math.min(gapPx, 0.18 * scale);
      for (let i = 0; i < Math.max(2, Math.round(rows * 0.32)); i++) {
        const y = movingBase - i * layerPx - layerPx / 2 + sag;   // the whole part settles onto the gap
        for (let b = 0; b < Math.round(wallW / beadPx); b++) {
          bead(cx - wallW / 2 + beadPx / 2 + b * beadPx, y, beadPx, layerPx, MOVING);
        }
      }
      // the air gap itself: from the underside of the moving part down to the fixed part
      const airTop = movingBase + sag;
      ctx.fillStyle = model.airLeft <= 0 ? 'rgba(217,70,60,.5)' : 'rgba(123,216,143,.28)';
      ctx.fillRect(cx - wallW / 2, airTop, wallW, Math.max(topOfFixed - airTop, 1));
      ctx.strokeStyle = model.airLeft <= 0 ? WELD : AIR;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(cx - wallW / 2, airTop, wallW, Math.max(topOfFixed - airTop, 1));
      ctx.setLineDash([]);
      ctx.fillStyle = PAPER;
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${round(p.gap, 2)} mm of air`, cx + wallW / 2 + 12, airTop + Math.max(gapPx, 2) / 2 + 4);
      ctx.textAlign = 'center';
      ctx.fillText('moving part', cx, movingBase - rows * 0.32 * layerPx - 16);
      ctx.textAlign = 'right';
      ctx.fillText('fixed part', cx - wallW / 2 - 12, bedY - (fixedRows * layerPx) / 2);
    } else {
      // two walls side by side; the slot between them is the design gap
      const gapPx = p.gap * scale;
      const wallW = Math.max(beadPx * 3, 1.2 * scale);
      const leftRight = width / 2 - gapPx / 2;
      const rightLeft = width / 2 + gapPx / 2;
      for (let i = 0; i < rows; i++) {
        const y = bedY - i * layerPx - layerPx / 2;
        for (let b = 0; b < Math.round(wallW / beadPx); b++) {
          bead(leftRight - beadPx / 2 - b * beadPx, y, beadPx, layerPx, FIXED);
          bead(rightLeft + beadPx / 2 + b * beadPx, y, beadPx, layerPx, MOVING);
        }
      }
      const slotTop = bedY - rows * layerPx;
      ctx.fillStyle = model.airLeft <= 0 ? 'rgba(217,70,60,.55)' : 'rgba(123,216,143,.26)';
      ctx.fillRect(leftRight, slotTop, Math.max(gapPx, 1), bedY - slotTop);
      ctx.strokeStyle = model.airLeft <= 0 ? WELD : AIR;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(leftRight, slotTop);
      ctx.lineTo(leftRight, bedY);
      ctx.moveTo(rightLeft, slotTop);
      ctx.lineTo(rightLeft, bedY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = PAPER;
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${round(p.gap, 2)} mm slot`, width / 2, slotTop - 12);
      ctx.textAlign = 'right';
      ctx.fillText('fixed', leftRight - wallW - 12, (slotTop + bedY) / 2);
      ctx.textAlign = 'left';
      ctx.fillText('moves', rightLeft + wallW + 12, (slotTop + bedY) / 2);
    }

    // the bed
    ctx.fillStyle = 'rgba(244,227,211,.3)';
    ctx.fillRect(0, bedY, width, 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(244,227,211,.55)';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillText(`1 square = 1 mm · ${p.layer} mm layers`, width - 12, 24);

    renderStats(statList, model.stats);
    renderVerdicts(verdictList, model.verdicts);
    canvas.setAttribute('aria-label', `Cross-section of two printed walls with a ${round(p.gap, 2)} millimetre ${model.stacked ? 'ceiling' : 'side'} gap. ${model.verdicts[0].tag}: ${model.verdicts[0].text}`);
  }

  view = SimKit.canvas2d(canvas, { box: canvas.parentElement, onResize: () => draw() });
  bindControls(root, values => { params = values; draw(); }).sync();
}

/* ══ 2. Spiral Cone Lab ═════════════════════════════════════════════════════
   The ribbon is swept along a helix that lies on the cone's surface: at each
   sample we build a local frame (surface normal + slant direction) and place a
   rectangular cross-section, exactly like the profile the Blender build
   revolves with the Screw modifier.
*/
const TIP_RADIUS = 3;

/* The helical slot is cut by a flat sheet, so `gap` is the cutter's thickness in
   Z — the number typed into the cutter profile. Everything else follows from it:
   the windings are separated vertically by that slot, and the real air distance
   between two ribbon faces is that slot leaned over by the cone's angle. */
function coneMath(p, stretch = 0) {
  const height = p.height * (1 + 1.35 * stretch);
  const lean = Math.atan2(p.radius - TIP_RADIUS, p.height);      // radians from vertical
  const cos = Math.cos(lean);
  const pitch = p.height / p.turns;                               // mm of rise per turn
  const slantPitch = pitch / cos;                                 // ...measured along the slant
  const bandVertical = Math.max(pitch - p.gap, 0.2);              // vertical height of one winding
  const band = bandVertical / cos;                                // ribbon width along the slant
  const airGap = p.gap * cos;                                     // true clearance between faces
  return { height, lean, leanDeg: (lean * 180) / Math.PI, cos, pitch, slantPitch, band, bandVertical, airGap };
}

function buildSpiral(p, stretch) {
  const { height, band } = coneMath(p, stretch);
  const segments = Math.min(900, Math.max(160, Math.round(p.turns * 46)));
  const half = p.thickness / 2;
  const halfBand = band / 2;
  const positions = [];
  const push = (v) => positions.push(v[0], v[1], v[2]);

  const ring = (t) => {
    const angle = Math.PI * 2 * p.turns * t;
    const radius = p.radius - (p.radius - TIP_RADIUS) * t;
    const y = height * t;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // outward cone normal: radial component H, axial component R (perpendicular to the slant)
    const nLen = Math.hypot(p.height, p.radius - TIP_RADIUS);
    const nR = p.height / nLen;
    const nY = (p.radius - TIP_RADIUS) / nLen;
    // up-slope direction, perpendicular to the normal
    const sR = -(p.radius - TIP_RADIUS) / nLen;
    const sY = p.height / nLen;
    const corner = (dn, ds) => {
      const rr = radius + dn * half * nR + ds * halfBand * sR;
      const yy = y + dn * half * nY + ds * halfBand * sY;
      return [rr * cos, yy, rr * sin];
    };
    return [corner(1, 1), corner(1, -1), corner(-1, -1), corner(-1, 1)];
  };

  const quad = (a, b, c, d) => { push(a); push(b); push(c); push(a); push(c); push(d); };

  let previous = ring(0);
  quad(previous[3], previous[2], previous[1], previous[0]);        // start cap
  for (let i = 1; i <= segments; i++) {
    const current = ring(i / segments);
    for (let k = 0; k < 4; k++) {
      const next = (k + 1) % 4;
      quad(previous[k], current[k], current[next], previous[next]);
    }
    previous = current;
  }
  quad(previous[0], previous[1], previous[2], previous[3]);        // end cap

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function spiralVerdicts(p) {
  const { leanDeg, band, bandVertical, airGap, slantPitch } = coneMath(p);
  const perimeters = p.thickness / p.nozzle;
  const beads = Math.floor(perimeters + 1e-6);
  const bandLayers = bandVertical / p.layer;
  const verdicts = [];

  if (airGap < p.layer) verdicts.push({ tone: 'bad', tag: 'WELDED', text: `The lean tips your ${p.gap} mm slot down to ${round(airGap, 2)} mm of real air — less than one ${p.layer} mm layer. This prints as a solid cone.` });
  else if (airGap < 0.25) verdicts.push({ tone: 'warn', tag: 'TIGHT', text: `${round(airGap, 2)} mm between the ribbon faces. It may free up with a hard twist, but only on a well-tuned printer. Make the cutter thicker.` });
  else if (airGap <= 0.6) verdicts.push({ tone: 'ok', tag: 'ARTICULATED', text: `${round(airGap, 2)} mm between the ribbon faces — enough to stay separate, tight enough that each layer still lands cleanly on the winding below.` });
  else verdicts.push({ tone: 'warn', tag: 'LOOSE', text: `${round(airGap, 2)} mm of air is more than a layer can bridge neatly. The undersides will droop and the spiral will feel sloppy.` });

  if (leanDeg > 45) verdicts.push({ tone: 'bad', tag: 'OVERHANG', text: `The wall leans ${round(leanDeg, 1)}° from vertical. Past 45° each layer hangs off the edge of the one below, and the only fix — supports — would fill the spiral and lock it solid.` });
  else if (leanDeg > 38) verdicts.push({ tone: 'warn', tag: 'OVERHANG', text: `${round(leanDeg, 1)}° from vertical is close to the 45° limit. Slow the outer walls down and run the fan at 100%, or make the cone taller.` });
  else verdicts.push({ tone: 'ok', tag: 'SELF-SUPPORTING', text: `The wall leans ${round(leanDeg, 1)}° from vertical, inside the 45° rule, so every layer lands on the one below. No supports needed.` });

  if (beads < 2) verdicts.push({ tone: 'bad', tag: 'TOO THIN', text: `${round(p.thickness, 2)} mm is under two ${p.nozzle} mm beads. The slicer prints a single-bead ribbon that snaps the first time it is stretched.` });
  else if (beads < 3) verdicts.push({ tone: 'warn', tag: 'THIN', text: `${beads} beads thick. It will flex nicely but is fragile near the tip — bump it to ${round(p.nozzle * 3, 1)} mm for a fidget that survives a backpack.` });
  else verdicts.push({ tone: 'ok', tag: 'STRONG', text: `${beads} beads thick — solid perimeters all the way through, no infill required.` });

  if (bandLayers < 5) verdicts.push({ tone: 'bad', tag: 'RIBBON', text: `Each winding is only ${round(bandLayers, 1)} layers tall. Too few layers to hold its shape — reduce the turns or make the cone taller.` });
  else if (bandLayers < 10) verdicts.push({ tone: 'warn', tag: 'RIBBON', text: `${round(bandLayers, 1)} layers per winding. Springy, but delicate to pull.` });

  const stats = [
    { label: 'Rise per turn', value: `${round(p.height / p.turns, 2)} mm` },
    { label: 'Ribbon width', value: `${round(band, 2)} mm` },
    { label: 'Air between windings', value: `${round(airGap, 2)} mm` },
    { label: 'Wall lean', value: `${round(leanDeg, 1)}°` },
    { label: 'Beads per wall', value: `${beads}` },
    { label: 'Layers per winding', value: `${round(bandLayers, 0)}` },
    { label: 'Slant pitch', value: `${round(slantPitch, 2)} mm` }
  ];
  return { stats, verdicts };
}

function spiralLab(root) {
  const canvas = root.querySelector('[data-pf-canvas]');
  const fallback = root.querySelector('[data-pf-nogl]');
  const verdictList = root.querySelector('[data-pf-verdicts]');
  const statList = root.querySelector('[data-pf-stats]');
  const pullButton = root.querySelector('[data-pf-pull]');
  let params = null;

  const refreshReadout = () => {
    if (!params) return;
    const { stats, verdicts } = spiralVerdicts(params);
    renderStats(statList, stats);
    renderVerdicts(verdictList, verdicts);
    canvas.setAttribute('aria-label', `Spiral cone ${params.radius * 2} millimetres across and ${params.height} tall with ${params.turns} turns. ${verdicts.map(v => `${v.tag}: ${v.text}`).join(' ')}`);
  };

  let webglOK = true;
  let scene, camera, renderer, syncSize, controls, mesh, material;
  try {
    const built = createScene(canvas, { THREE, fov: 40, near: 1, far: 4000, clearColor: 0x241a12 });
    ({ scene, camera, renderer, syncSize } = built);
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 60;
    controls.maxDistance = 520;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.7;
    scene.add(new THREE.HemisphereLight(0xfff0e0, 0x2a1d12, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(90, 160, 110);
    scene.add(key);
    const grid = new THREE.GridHelper(240, 24, 0x8a6a4d, 0x4a382a);
    grid.material.opacity = 0.45;
    grid.material.transparent = true;
    scene.add(grid);
    material = new THREE.MeshStandardMaterial({ color: MOVING, roughness: 0.62, metalness: 0.04, flatShading: true, side: THREE.DoubleSide });
  } catch (error) {
    webglOK = false;
    canvas.hidden = true;
    if (fallback) fallback.hidden = false;
  }

  let stretch = 0;
  let stretchTarget = 0;
  let dirty = true;

  /* Keeps the whole cone in frame as it grows — dollies along whatever
     direction the viewer has orbited to rather than snapping the camera back. */
  let lastReach = null;
  const fitCamera = (height) => {
    const reach = Math.max(height, params.radius * 2);
    if (lastReach !== null && Math.abs(reach - lastReach) < 0.5) return;
    lastReach = reach;
    const target = new THREE.Vector3(0, height * 0.4, 0);
    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 1) direction.set(1, 0.9, 1);
    direction.normalize().multiplyScalar(reach * 1.85);
    controls.target.copy(target);
    camera.position.copy(target).add(direction);
    controls.update();
  };

  const rebuild = () => {
    if (!webglOK || !params) return;
    const geometry = buildSpiral(params, stretch);
    if (mesh) { mesh.geometry.dispose(); mesh.geometry = geometry; }
    else { mesh = new THREE.Mesh(geometry, material); scene.add(mesh); }
    material.color.set(coneMath(params).airGap < params.layer ? WELD : MOVING);
    fitCamera(coneMath(params, stretch).height);
  };


  if (webglOK) {
    SimKit.loop(() => {
      if (Math.abs(stretch - stretchTarget) > 0.002) {
        stretch += (stretchTarget - stretch) * (reduceMotion ? 1 : 0.08);
        dirty = true;
      }
      if (dirty) { rebuild(); dirty = false; }
      controls.update();
      syncSize();
      renderer.render(scene, camera);
    });
  }

  pullButton?.addEventListener('click', () => {
    stretchTarget = stretchTarget > 0.5 ? 0 : 1;
    if (reduceMotion) stretch = stretchTarget;
    pullButton.textContent = stretchTarget > 0.5 ? 'Let it spring back' : 'Pull the tip';
    pullButton.classList.toggle('is-active', stretchTarget > 0.5);
    dirty = true;
  });

  const controlsApi = bindControls(root, values => {
    const first = params === null;
    params = values;
    dirty = true;
    refreshReadout();
    if (first && webglOK) { camera.position.set(1, 0.9, 1); rebuild(); }
  });
  controlsApi.sync();
}

/* ══ lesson completion (own key: this lesson is not part of the 7-lesson
   Blender pathway, so it must not write into that pathway's progress) ══ */
function completion() {
  const button = document.querySelector('[data-pf-complete]');
  if (!button) return;
  const key = 'classroomos-print-fidgets';
  const status = document.querySelector('[data-check-status]');
  let stored = false;
  let writable = true;
  const read = () => { try { return localStorage.getItem(key) === 'done'; } catch { return stored; } };
  const paint = () => {
    const done = read();
    button.classList.toggle('is-done', done);
    button.setAttribute('aria-pressed', String(done));
    button.textContent = done ? 'Lesson completed ✓' : 'Mark lesson complete';
  };
  button.addEventListener('click', () => {
    const checks = [...document.querySelectorAll('.checklist input')];
    if (!read() && checks.some(input => !input.checked)) {
      if (status) { status.textContent = 'Check every definition-of-done item before completing the lesson.'; status.style.color = '#a3483f'; }
      checks.find(input => !input.checked)?.focus();
      return;
    }
    stored = !read();
    try { localStorage.setItem(key, stored ? 'done' : ''); } catch { writable = false; }
    paint();
    if (!writable && status) status.textContent = 'Browser storage is unavailable, so this only lasts while the page is open.';
  });
  paint();
}

/* The shared blender-pathway.js already switches [data-tabset] panels; it only
   toggles classes, so keep the buttons' pressed state in sync for screen readers. */
function tabState() {
  document.querySelectorAll('[data-tabset]').forEach(tabset => {
    const buttons = [...tabset.querySelectorAll('[data-tab]')];
    buttons.forEach(button => button.addEventListener('click', () => {
      buttons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    }));
  });
}

document.querySelectorAll('[data-pf-lab="clearance"]').forEach(clearanceLab);
document.querySelectorAll('[data-pf-lab="spiral"]').forEach(spiralLab);
tabState();
completion();
