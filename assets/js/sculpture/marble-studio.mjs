// Marble Studio: carve a block of marble into a likeness. Mounts on every
// [data-marble-studio] element. The stone itself (voxels, tools, maquettes, pointing,
// autopilot, likeness) lives in marble-core.mjs; this file draws it with Three.js and
// wires up the controls. Used by lessons/3d-design/sculpture/marble-sculpture.html.
import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import * as M from './marble-core.mjs';

const SAVE_KEY = 'classroomos:marble-studio:v1';
const SOUND_KEY = 'classroomos:marble-studio:sound';

const MARBLES = {
  carrara: { label: 'Carrara (white, grey veins)', base: '#e8e6e0', base2: '#d4d8db', vein: '#6c7176', amt: 0.55, width: 0.09, freq: 0.34, turb: 6, scale: 0.06 },
  statuario: { label: 'Statuario (bright white)', base: '#f5f3ee', base2: '#ebe7df', vein: '#55585c', amt: 0.6, width: 0.045, freq: 0.2, turb: 8, scale: 0.05 },
  nero: { label: 'Nero Marquina (black)', base: '#1d1e21', base2: '#2a2b2f', vein: '#ecebe6', amt: 0.85, width: 0.04, freq: 0.3, turb: 7, scale: 0.06 },
  rosa: { label: 'Rosa Portogallo (pink)', base: '#e9cbbf', base2: '#dcb3a5', vein: '#a06f63', amt: 0.45, width: 0.1, freq: 0.28, turb: 6, scale: 0.07 },
  verde: { label: 'Verde Alpi (green)', base: '#24503f', base2: '#33735a', vein: '#d6e9df', amt: 0.7, width: 0.05, freq: 0.32, turb: 7, scale: 0.06 }
};

const LIGHTS = {
  studio: { label: 'Studio' },
  raking: { label: 'Raking light' },
  museum: { label: 'Museum spot' },
  daylight: { label: 'Daylight' }
};

const STEPS = [
  { id: 'subject', label: 'Choose a subject', text: 'Pick a maquette, draw your own front and side views, or load a model you designed.' },
  { id: 'drill', label: 'Point the block', tool: 'drill' },
  { id: 'rough', label: 'Rough out', tool: 'point' },
  { id: 'model', label: 'Model the forms', tool: 'claw' },
  { id: 'define', label: 'Define planes', tool: 'flat' },
  { id: 'rasp', label: 'Rasp smooth', tool: 'rasp' },
  { id: 'polish', label: 'Polish', tool: 'polish' },
  { id: 'present', label: 'Test and present', text: 'Silhouette test from four sides, a raking-light check, then photograph or print it.' }
];
for (const st of M.STAGES) { const step = STEPS.find(s => s.id === st.id); if (step) step.text = st.why; }

const TOOL_ICONS = {
  point: '<path d="M4 20 15 9M15 9l3-5 2 2-5 3" /><path d="M3 21l2-2" />',
  claw: '<path d="M6 18 16 8" /><path d="M16 8l1-4h3l-1 4M17 4v4M18.5 4v4" />',
  flat: '<path d="M5 19 15 9" /><path d="M14 6h6v4h-6z" transform="rotate(45 17 8)" />',
  drill: '<path d="M12 3v11M9 3h6M12 14l-1.5 3 1.5 4 1.5-4z" />',
  rasp: '<rect x="4" y="9" width="16" height="6" rx="1" /><path d="M7 9v6M10 9v6M13 9v6M16 9v6" />',
  polish: '<ellipse cx="12" cy="15" rx="7" ry="3" /><path d="M12 12V5M9 5h6" /><path d="M6 8l-1-1M18 8l1-1" />'
};

const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids) if (kid != null) n.append(kid);
  return n;
};

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }
};

function download(name, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ── Shaders ───────────────────────────────────────────────────── */

const MARBLE_GLSL = /* glsl */`
uniform float uH; uniform vec3 uBase; uniform vec3 uBase2; uniform vec3 uVein;
uniform float uVeinAmt; uniform float uVeinScale; uniform float uVeinFreq; uniform float uVeinTurb; uniform float uVeinWidth;
uniform float uGuide; uniform float uSil;
varying vec3 vMsPos; varying vec3 vMsNrm; varying float vMsFinish; varying float vMsAO; varying float vMsGuide;
float msHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float msNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(msHash(i), msHash(i + vec3(1, 0, 0)), f.x), mix(msHash(i + vec3(0, 1, 0)), msHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(msHash(i + vec3(0, 0, 1)), msHash(i + vec3(1, 0, 1)), f.x), mix(msHash(i + vec3(0, 1, 1)), msHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float msFbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * msNoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
// Veins run through the whole block, so carving reveals the inside of the stone.
vec3 marbleColor(vec3 p, float f) {
  vec3 col = mix(uBase, uBase2, smoothstep(0.35, 0.78, msFbm(p * 0.045 + 3.1)));
  float v1 = abs(sin((p.x * 0.62 + p.y * 0.41 + p.z * 0.27) * uVeinFreq + msFbm(p * uVeinScale) * uVeinTurb));
  float v2 = abs(sin((p.y * 0.5 - p.z * 0.63 + p.x * 0.18) * uVeinFreq * 1.7 + msFbm(p * uVeinScale * 1.9 + 7.0) * uVeinTurb * 1.25));
  float vein = (1.0 - smoothstep(0.0, uVeinWidth, v1)) * (0.55 + 0.45 * msNoise(p * 0.3));
  float vein2 = (1.0 - smoothstep(0.0, uVeinWidth * 0.55, v2)) * 0.55 * smoothstep(0.4, 0.7, msNoise(p * 0.09 + 11.0));
  col = mix(col, uVein, clamp(vein + vein2, 0.0, 1.0) * uVeinAmt);
  col *= 0.97 + 0.06 * msNoise(p * 9.0);
  // the chalky white bruise ("stun") a point chisel leaves in the crystals
  float stun = (1.0 - smoothstep(0.05, 0.4, f)) * mix(0.5, smoothstep(0.45, 0.8, msNoise(p * 2.6)), 1.0 - smoothstep(0.15, 0.5, length(fwidth(p))));
  return mix(col, vec3(1.0), stun * 0.2);
}
// Height of the tool marks: point pits, claw grooves, flat facets, rasp scratches.
// aa: how many cm one pixel covers, so marks finer than a pixel fade out instead of shimmering
float toolMarks(vec3 p, float f, vec3 n, float aa) {
  float fine = 1.0 - smoothstep(0.06, 0.25, aa), mid = 1.0 - smoothstep(0.2, 0.7, aa);
  float pits = smoothstep(0.45, 0.85, msNoise(p * 2.2)) * 0.14 * mid + msNoise(p * 5.0) * 0.035 * fine;
  vec3 ax = normalize(cross(n, normalize(vec3(0.35, 1.0, 0.2))) + vec3(1e-4));
  float grooves = (0.5 + 0.5 * sin(dot(p, ax) * 9.0 + msNoise(p * 0.7) * 5.0)) * 0.09;
  float facets = msNoise(p * 0.9) * 0.12;
  float scratch = msNoise(p * 18.0) * 0.02 * fine;
  float wPit = 1.0 - smoothstep(0.12, 0.25, f);
  float wGroove = smoothstep(0.12, 0.25, f) * (1.0 - smoothstep(0.4, 0.55, f));
  float wFacet = smoothstep(0.4, 0.55, f) * (1.0 - smoothstep(0.65, 0.8, f));
  float wScratch = smoothstep(0.65, 0.8, f) * (1.0 - smoothstep(0.86, 0.97, f));
  return pits * wPit + grooves * wGroove + facets * wFacet + scratch * wScratch;
}
vec3 guideColor(float g) {
  if (g < -0.25) return vec3(0.62, 0.32, 0.9);
  vec3 near = vec3(0.16, 0.72, 0.38), mid = vec3(0.98, 0.78, 0.18), far = vec3(0.92, 0.26, 0.2);
  return g < 1.0 ? mix(near, mid, smoothstep(0.2, 1.0, g)) : mix(mid, far, smoothstep(1.0, 3.5, g));
}
vec3 msPerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
  vec3 sx = dFdx(surfPos), sy = dFdy(surfPos);
  vec3 r1 = cross(sy, surfNorm), r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}
`;

function marbleMaterial(uniforms) {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, specularIntensity: 0.7 });
  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute float aFinish; attribute float aAO; attribute float aGuide;
varying vec3 vMsPos; varying vec3 vMsNrm; varying float vMsFinish; varying float vMsAO; varying float vMsGuide;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vMsPos = position; vMsNrm = normal; vMsFinish = aFinish; vMsAO = aAO; vMsGuide = aGuide;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + MARBLE_GLSL)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec3 msP = vMsPos * uH;
  float msF = clamp(vMsFinish, 0.0, 1.0);
  diffuseColor.rgb = marbleColor(msP, msF);
  if (uGuide > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, guideColor(vMsGuide * uH), 0.62);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = mix(0.9, 0.07, smoothstep(0.55, 1.0, msF));`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  float msHgt = toolMarks(msP, msF, normalize(vMsNrm), length(fwidth(msP)));
  normal = msPerturb(-vViewPosition, normal, vec2(dFdx(msHgt), dFdy(msHgt)), faceDirection);`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
  float msAO = clamp(vMsAO, 0.0, 1.0);
  reflectedLight.indirectDiffuse *= msAO;
  reflectedLight.indirectSpecular *= mix(0.35, 1.0, msAO);
  reflectedLight.directDiffuse *= mix(0.6, 1.0, msAO);`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
  if (uSil > 0.5) gl_FragColor = vec4(0.05, 0.05, 0.06, 1.0);`);
  };
  mat.customProgramCacheKey = () => 'classroomos-marble-1';
  return mat;
}

function ghostMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color('#62c8ff') } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; varying vec3 vN; varying vec3 vV; void main() { float r = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(uColor * (0.05 + 0.5 * pow(r, 2.5)), 1.0); }'
  });
}

/* ── Sound ─────────────────────────────────────────────────────── */

function makeSound() {
  let ctx = null, noise = null, last = 0, on = store.get(SOUND_KEY) !== 'off';
  const ensure = () => {
    if (!on) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const burst = (t, dur, type, freq, q, gain) => {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t, Math.random() * 0.3); src.stop(t + dur + 0.02);
  };
  const tone = (t, freq, dur, gain, type = 'sine') => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  return {
    get on() { return on; },
    toggle() { on = !on; store.set(SOUND_KEY, on ? 'on' : 'off'); if (on) ensure(); return on; },
    unlock() { ensure(); },
    play(kind, vol = 1) {
      const c = ensure();
      if (!c) return;
      const now = c.currentTime;
      if (kind !== 'crack' && now - last < 0.06) return;
      last = now;
      const v = 0.5 * vol, j = 0.9 + Math.random() * 0.2;
      if (kind === 'point' || kind === 'claw' || kind === 'flat') {
        tone(now, 190 * j, 0.07, 0.35 * v);
        tone(now + 0.004, (kind === 'flat' ? 3300 : 2700) * j, 0.09, 0.07 * v);
        tone(now + 0.004, 4300 * j, 0.06, 0.04 * v);
        burst(now + 0.003, kind === 'point' ? 0.09 : 0.06, 'bandpass', kind === 'point' ? 2400 : 3400, 1.2, 0.45 * v);
      } else if (kind === 'drill') {
        tone(now, 150 * j, 0.14, 0.12 * v, 'sawtooth');
        burst(now, 0.14, 'bandpass', 1800, 2, 0.18 * v);
      } else if (kind === 'rasp') {
        burst(now, 0.1, 'bandpass', 3200 * j, 0.8, 0.22 * v);
      } else if (kind === 'polish') {
        burst(now, 0.09, 'lowpass', 900, 0.5, 0.18 * v);
      } else if (kind === 'crack') {
        burst(now, 0.35, 'lowpass', 1600, 0.7, 0.9 * v);
        tone(now, 70, 0.3, 0.6 * v);
        burst(now + 0.25, 0.25, 'bandpass', 900, 1, 0.5 * v);
      }
    }
  };
}

/* ── Scene pieces ──────────────────────────────────────────────── */

function makeEnvironment(renderer) {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(60, 30, 60), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.32, 0.31, 0.3), side: THREE.BackSide }));
  room.position.y = 10;
  scene.add(room);
  const panel = (w, h, x, y, z, k, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k * 0.96), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); scene.add(m);
  };
  panel(16, 10, -14, 14, 10, 7, Math.PI / 3);
  panel(12, 12, 16, 10, -6, 4, -Math.PI / 2.4);
  panel(30, 30, 0, 24.9, 0, 2.2, 0, Math.PI / 2);
  panel(8, 20, 0, 8, -29.5, 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 0.11, 0.1) }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -4.9; scene.add(floor);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.04);
  pmrem.dispose();
  return target.texture;
}

function backdrop() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTop: { value: new THREE.Color('#3b3f46') }, uBottom: { value: new THREE.Color('#15161a') } },
    vertexShader: 'varying vec3 vW; void main() { vW = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uTop; uniform vec3 uBottom; varying vec3 vW; void main() { float t = smoothstep(-0.25, 0.6, vW.y); gl_FragColor = vec4(mix(uBottom, uTop, t), 1.0); }'
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), mat);
  m.renderOrder = -10;
  m.frustumCulled = false;
  return m;
}

// The sculptor's banker: a sturdy stand with a turntable top.
function makeBanker() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#6f4a30', roughness: 0.82 });
  const top = new THREE.MeshStandardMaterial({ color: '#8c6a4c', roughness: 0.7 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 3, 48), top);
  disc.position.y = -1.5; disc.receiveShadow = true; disc.castShadow = true;
  const post = new THREE.Mesh(new THREE.BoxGeometry(40, 74, 40), wood);
  post.position.y = -3 - 37; post.receiveShadow = true; post.castShadow = true;
  const foot = new THREE.Mesh(new THREE.BoxGeometry(56, 6, 56), wood);
  foot.position.y = -77 - 3 + 3; foot.receiveShadow = true;
  g.add(disc, post, foot);
  return { group: g, disc, floorY: -80 };
}

function makeToolModels() {
  const steel = new THREE.MeshStandardMaterial({ color: '#9aa1a8', metalness: 0.85, roughness: 0.32 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2b2e33', metalness: 0.6, roughness: 0.5 });
  const wood = new THREE.MeshStandardMaterial({ color: '#a3754c', roughness: 0.7 });
  const felt = new THREE.MeshStandardMaterial({ color: '#c9b48a', roughness: 1 });
  const models = {};
  const shaft = (len = 17, r = 0.55) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), steel); m.position.y = len / 2 + 1.6; return m; };
  const mk = (...parts) => { const g = new THREE.Group(); g.add(...parts); return g; };
  const pointTip = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.8, 10), steel); pointTip.rotation.x = Math.PI; pointTip.position.y = 0.9;
  models.point = mk(pointTip, shaft());
  const claw = new THREE.Group();
  for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.4, 0.3), steel); t.position.set((i - 1.5) * 0.48, 0.7, 0); claw.add(t); }
  const clawBlade = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.32), steel); clawBlade.position.y = 1.5; claw.add(clawBlade);
  models.claw = mk(claw, shaft());
  const flatBlade = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 0.22), steel); flatBlade.position.y = 0.9;
  models.flat = mk(flatBlade, shaft());
  const bit = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.12, 5, 8), steel); bit.position.y = 2.5;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 9, 16), dark); body.position.y = 9.5;
  const chuck = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 1.4, 12), steel); chuck.position.y = 5.5;
  models.drill = mk(bit, chuck, body);
  const raspBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 9, 0.6), dark); raspBody.position.y = 4.5;
  const raspHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.6, 8, 10), wood); raspHandle.position.y = 13;
  models.rasp = mk(raspBody, raspHandle);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1, 20), felt); pad.position.y = 0.5;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(1.4, 14, 10), wood); knob.position.y = 2.2;
  models.polish = mk(pad, knob);
  // the mallet (mazzuolo) for the chisels
  const mallet = new THREE.Group();
  const head = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 6, 14), dark); head.rotation.z = Math.PI / 2;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 14, 8), wood); handle.position.y = -7;
  mallet.add(head, handle);
  for (const g of [...Object.values(models), mallet]) g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { models, mallet };
}

/* ── The studio ────────────────────────────────────────────────── */

class Studio {
  constructor(host) {
    this.host = host;
    this.sound = makeSound();
    this.toolId = 'point';
    this.size = 1;
    this.view = { ghost: false, guide: false, points: false, silhouette: false };
    this.mode = 'carve';
    this.marble = 'carrara';
    this.light = 'studio';
    this.quality = 'standard';
    this.heightMm = 100;
    this.speed = 3;
    this.stoneRules = false;
    this.undo = []; this.redo = [];
    this.breaks = 0; this.strikes = 0;
    this.refSpec = { type: 'none' };
    this.ref = null; this.points = null; this.depths = null;
    this.pointer = { x: 0, y: 0, inside: false, down: false, id: null, touches: new Map() };
    this.hover = null;
    this.stroke = null;
    this.auto = null;
    this.falling = [];
    this.turn = { angle: 0, target: 0 };
    this.needsRender = true;
    this.metricsDue = 0; this.pointsDue = 0; this.saveDue = 0; this.changed = false;
    this.buildDom();
    this.buildScene();
    this.newStone(this.quality, { restore: true });
    this.bind();
    this.startLoop();
  }

  /* DOM */
  buildDom() {
    const h = this.host;
    h.classList.add('ms-studio');
    h.setAttribute('data-present', 'off');
    h.setAttribute('data-memory-ignore', '');
    h.setAttribute('data-night-keep', '');
    const caption = h.querySelector('figcaption');
    const sel = (cls, label, opts, value, onchange) => {
      const s = el('select', { class: cls, 'aria-label': label, onchange });
      for (const [v, t] of opts) s.append(el('option', { value: v, selected: v === value }, t));
      return el('label', { class: 'ms-field' }, el('span', {}, label), s);
    };
    const subjectOpts = [['none', 'Free carve (no maquette)'], ...M.REFERENCES.map(r => ['preset:' + r.id, 'Maquette: ' + r.label]), ['draw', 'Draw my own on the block…'], ['stl', 'Use my 3D model (STL)…']];
    this.subjectSel = sel('ms-subject', 'Subject', subjectOpts, 'none', e => this.onSubject(e.target.value)).querySelector('select');
    const toggle = (key, label, title) => el('button', { type: 'button', class: 'ms-toggle', 'aria-pressed': 'false', title, 'data-view': key, onclick: () => this.setView(key, !this.view[key]) }, label);
    this.toggles = {
      ghost: toggle('ghost', 'Ghost', 'See the maquette inside the stone (G)'),
      guide: toggle('guide', 'Guide colours', 'Colour the stone by how much is left to remove (C)'),
      points: toggle('points', 'Points', 'Pointing-machine marks (P)'),
      silhouette: toggle('silhouette', 'Silhouette', 'The likeness test: black shape on white (S)')
    };
    this.undoBtn = el('button', { type: 'button', class: 'ms-btn', title: 'Undo (Ctrl+Z)', onclick: () => this.doUndo() }, '↶ Undo');
    this.redoBtn = el('button', { type: 'button', class: 'ms-btn', title: 'Redo (Ctrl+Shift+Z)', onclick: () => this.doRedo() }, '↷ Redo');
    this.soundBtn = el('button', { type: 'button', class: 'ms-btn', 'aria-pressed': String(this.sound.on), title: 'Chisel sounds', onclick: () => { const on = this.sound.toggle(); this.soundBtn.setAttribute('aria-pressed', String(on)); this.soundBtn.textContent = on ? '🔊 Sound' : '🔇 Sound'; } }, this.sound.on ? '🔊 Sound' : '🔇 Sound');
    this.fullBtn = el('button', { type: 'button', class: 'ms-btn', title: 'Full screen (F)', 'aria-label': 'Full screen', onclick: () => this.toggleFull() }, '⛶ Full screen');
    const bar = el('div', { class: 'ms-bar' },
      el('div', { class: 'ms-bar-group' },
        this.subjectSel.parentElement,
        sel('ms-marble', 'Marble', Object.entries(MARBLES).map(([k, v]) => [k, v.label]), this.marble, e => this.setMarble(e.target.value)),
        sel('ms-light', 'Light', Object.entries(LIGHTS).map(([k, v]) => [k, v.label]), this.light, e => this.setLight(e.target.value))),
      el('div', { class: 'ms-bar-group', role: 'group', 'aria-label': 'Views' }, ...Object.values(this.toggles)),
      el('div', { class: 'ms-bar-group' },
        el('button', { type: 'button', class: 'ms-btn', title: 'Turn the banker left (Q)', 'aria-label': 'Turn the sculpture left', onclick: () => this.turnBy(-Math.PI / 4) }, '⟲'),
        el('button', { type: 'button', class: 'ms-btn', title: 'Turn the banker right (E)', 'aria-label': 'Turn the sculpture right', onclick: () => this.turnBy(Math.PI / 4) }, '⟳'),
        this.undoBtn, this.redoBtn, this.soundBtn, this.fullBtn));
    this.toolBtns = {};
    const tools = el('div', { class: 'ms-tools', role: 'toolbar', 'aria-label': 'Carving tools' });
    for (const [id, t] of Object.entries(M.TOOLS)) {
      const b = el('button', { type: 'button', class: 'ms-tool', 'aria-pressed': String(id === this.toolId), title: `${t.label} (${t.key}) · ${t.use}`, onclick: () => this.setTool(id) },
        el('span', { class: 'ms-tool-icon', 'aria-hidden': 'true', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${TOOL_ICONS[id]}</svg>` }),
        el('span', { class: 'ms-tool-name' }, t.label),
        el('span', { class: 'ms-tool-it', lang: 'it' }, t.native));
      this.toolBtns[id] = b;
      tools.append(b);
    }
    this.sizeInput = el('input', { type: 'range', min: '0.5', max: '2.5', step: '0.1', value: '1', 'aria-label': 'Tool size', oninput: e => { this.size = +e.target.value; this.sizeOut.textContent = this.size.toFixed(1) + '×'; } });
    this.sizeOut = el('output', {}, '1.0×');
    this.modeBtn = el('button', { type: 'button', class: 'ms-btn ms-mode', 'aria-pressed': 'false', title: 'Look mode: drag to turn the view instead of carving (hold Space)', onclick: () => this.setMode(this.mode === 'carve' ? 'look' : 'carve') }, '👁 Look');
    tools.append(el('label', { class: 'ms-size' }, el('span', {}, 'Size'), this.sizeInput, this.sizeOut), this.modeBtn);
    this.toolUse = el('p', { class: 'ms-tool-use', 'aria-live': 'polite' }, M.TOOLS[this.toolId].use);
    tools.append(this.toolUse);

    this.canvas = el('canvas', { class: 'ms-canvas', tabindex: '0', 'aria-label': 'Marble block. Drag on the stone to carve with the selected tool; right-drag, two fingers, or Look mode to turn the view.' });
    this.toast = el('div', { class: 'ms-toast', role: 'status', 'aria-live': 'polite' });
    this.legend = el('div', { class: 'ms-legend', hidden: true });
    this.busy = el('div', { class: 'ms-busy', hidden: true }, 'Preparing the maquette…');
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    this.hint = el('p', { class: 'ms-hint' }, coarse ? 'Drag on the stone to carve · two fingers to turn and zoom · 👁 Look to orbit' : 'Drag on the stone to carve · right-drag to turn · scroll to zoom · Space+drag to look');
    this.viewBox = el('div', { class: 'ms-view' }, this.canvas, this.toast, this.legend, this.busy, this.hint);

    // process steps
    this.stepRows = {};
    const steps = el('ol', { class: 'ms-steps' });
    for (const st of STEPS) {
      const bar = el('span', { class: 'ms-step-bar' }, el('i'));
      const actions = el('span', { class: 'ms-step-actions' });
      if (st.tool) {
        actions.append(el('button', { type: 'button', class: 'ms-mini', onclick: () => this.setTool(st.tool) }, 'Use ' + M.TOOLS[st.tool].label.toLowerCase()));
        actions.append(el('button', { type: 'button', class: 'ms-mini ms-auto', 'data-auto': st.id, onclick: () => this.runAuto(st.id, false) }, 'Autopilot ▶'));
      } else if (st.id === 'subject') {
        actions.append(el('button', { type: 'button', class: 'ms-mini', onclick: () => this.subjectSel.focus() }, 'Choose'));
      } else {
        actions.append(el('button', { type: 'button', class: 'ms-mini', onclick: () => this.setView('silhouette', true) }, 'Silhouette'));
        actions.append(el('button', { type: 'button', class: 'ms-mini', onclick: () => { this.lightSel.value = 'raking'; this.setLight('raking'); } }, 'Raking light'));
      }
      const row = el('li', { class: 'ms-step', 'data-step': st.id },
        el('div', { class: 'ms-step-head' }, el('strong', {}, st.label), bar),
        el('p', {}, st.text || ''), actions);
      this.stepRows[st.id] = { row, bar: bar.firstChild };
      steps.append(row);
    }
    this.speedBtns = {};
    const speeds = el('div', { class: 'ms-speed', role: 'group', 'aria-label': 'Autopilot speed' }, el('span', {}, 'Speed'));
    for (const [v, t] of [[1, '1×'], [3, '3×'], [10, '10×'], [100, 'Max']]) {
      const b = el('button', { type: 'button', class: 'ms-mini', 'aria-pressed': String(v === this.speed), onclick: () => { this.speed = v; for (const [k, bb] of Object.entries(this.speedBtns)) bb.setAttribute('aria-pressed', String(+k === v)); } }, t);
      this.speedBtns[v] = b; speeds.append(b);
    }
    this.allBtn = el('button', { type: 'button', class: 'ms-btn ms-primary', onclick: () => this.runAuto(null, true) }, 'Autopilot every step ▶▶');
    this.stopBtn = el('button', { type: 'button', class: 'ms-btn', disabled: true, onclick: () => this.stopAuto('Autopilot stopped. The chisel is yours.') }, '■ Stop');
    this.autoNote = el('p', { class: 'ms-note' });
    const process = el('section', { class: 'ms-panel', 'aria-label': 'Sculptor’s process' },
      el('h3', {}, 'Sculptor’s process'), steps, speeds, el('div', { class: 'ms-row' }, this.allBtn, this.stopBtn), this.autoNote);

    this.meter = el('div', { class: 'ms-meter' }, el('i'));
    this.likeOut = el('strong', { class: 'ms-like-num' }, '—');
    this.likeList = el('dl', { class: 'ms-stats' });
    const likeness = el('section', { class: 'ms-panel', 'aria-label': 'Likeness' },
      el('h3', {}, 'Likeness'), el('div', { class: 'ms-like' }, this.likeOut, this.meter), this.likeList);

    this.heightSel = el('select', { 'aria-label': 'Print height', onchange: e => { this.heightMm = +e.target.value; } });
    for (const v of [60, 80, 100, 150]) this.heightSel.append(el('option', { value: v, selected: v === this.heightMm }, v + ' mm tall'));
    this.qualitySel = el('select', { 'aria-label': 'Block detail', onchange: e => this.askNewBlock(e.target.value) });
    for (const [v, t] of [['fast', 'Fast (7 mm grains)'], ['standard', 'Standard (5 mm)'], ['fine', 'Fine (4 mm)']]) this.qualitySel.append(el('option', { value: v, selected: v === this.quality }, t));
    this.rulesBox = el('input', { type: 'checkbox', onchange: e => this.setStoneRules(e.target.checked) });
    this.fileIn = el('input', { type: 'file', accept: '.json,.marble.json,application/json', hidden: true, onchange: e => this.openFile(e.target.files[0]) });
    this.stlIn = el('input', { type: 'file', accept: '.stl,model/stl', hidden: true, onchange: e => this.loadStl(e.target.files[0]) });
    const make = el('section', { class: 'ms-panel', 'aria-label': 'Save and print' },
      el('h3', {}, 'Save, photograph, print'),
      el('div', { class: 'ms-row' }, el('label', { class: 'ms-field' }, el('span', {}, 'Print'), this.heightSel), el('button', { type: 'button', class: 'ms-btn ms-primary', onclick: () => this.exportStl() }, 'Download STL')),
      el('div', { class: 'ms-row' },
        el('button', { type: 'button', class: 'ms-btn', onclick: () => this.photograph() }, '📷 Photograph'),
        el('button', { type: 'button', class: 'ms-btn', onclick: () => this.saveFile() }, 'Save file'),
        el('button', { type: 'button', class: 'ms-btn', onclick: () => this.fileIn.click() }, 'Open file'),
        el('button', { type: 'button', class: 'ms-btn', onclick: () => this.askNewBlock(this.quality) }, 'New block')),
      el('div', { class: 'ms-row' }, el('label', { class: 'ms-field' }, el('span', {}, 'Detail'), this.qualitySel),
        el('label', { class: 'ms-check', title: 'Real marble has no undo' }, this.rulesBox, el('span', {}, 'Stone rules (no undo)'))),
      this.fileIn, this.stlIn);

    const side = el('aside', { class: 'ms-side' }, process, likeness, make);
    this.drawer = this.buildDrawer();
    this.shell = el('div', { class: 'ms-shell' }, bar, el('div', { class: 'ms-body' }, tools, this.viewBox, side), this.drawer);
    h.prepend(this.shell);
    if (caption) h.append(caption);
    this.lightSel = h.querySelector('.ms-light');
    this.marbleSel = h.querySelector('.ms-marble');
  }

  // "Draw it on the block": front and side silhouettes that become a block-out.
  buildDrawer() {
    const mk = (title, which) => {
      const c = el('canvas', { class: 'ms-draw-canvas', 'data-which': which, 'aria-label': title + ' drawing area' });
      return { c, wrap: el('figure', { class: 'ms-draw-fig' }, c, el('figcaption', {}, title)) };
    };
    this.drawFront = mk('Front: as you face it', 'front');
    this.drawSide = mk('Side: its front faces right →', 'side');
    this.drawMode = 'stone';
    this.drawBrush = 5;
    this.drawMirror = true;
    const modeBtn = (m, t) => el('button', { type: 'button', class: 'ms-mini', 'aria-pressed': String(m === this.drawMode), 'data-draw-mode': m, onclick: () => { this.drawMode = m; this.drawer.querySelectorAll('[data-draw-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.drawMode === m))); } }, t);
    const d = el('div', { class: 'ms-drawer', hidden: true, role: 'dialog', 'aria-label': 'Draw your sculpture on the block' },
      el('div', { class: 'ms-drawer-card' },
        el('h3', {}, 'Draw it on the block'),
        el('p', {}, 'Michelangelo drew his figure on the faces of the block and cut in from there. Paint the shape you see from the front, then from the side. Keep it standing on the bottom edge: stone that touches nothing falls off.'),
        el('div', { class: 'ms-row' }, modeBtn('stone', 'Draw stone'), modeBtn('erase', 'Erase'),
          el('label', { class: 'ms-size' }, el('span', {}, 'Brush'), el('input', { type: 'range', min: '1', max: '14', value: '5', 'aria-label': 'Brush size', oninput: e => { this.drawBrush = +e.target.value; } })),
          el('label', { class: 'ms-check' }, el('input', { type: 'checkbox', checked: true, onchange: e => { this.drawMirror = e.target.checked; } }), el('span', {}, 'Mirror the front')),
          el('button', { type: 'button', class: 'ms-mini', onclick: () => this.clearDrawings(false) }, 'Clear'),
          el('button', { type: 'button', class: 'ms-mini', onclick: () => this.clearDrawings(true) }, 'Start from the whole block')),
        el('div', { class: 'ms-draw-row' }, this.drawFront.wrap, this.drawSide.wrap),
        el('div', { class: 'ms-row' },
          el('button', { type: 'button', class: 'ms-btn ms-primary', onclick: () => this.useDrawings() }, 'Carve from these drawings'),
          el('button', { type: 'button', class: 'ms-btn', onclick: () => this.closeDrawer() }, 'Cancel'))));
    for (const { c } of [this.drawFront, this.drawSide]) {
      let drawing = false;
      const paint = e => {
        const r = c.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * c.width, y = ((e.clientY - r.top) / r.height) * c.height;
        const g = c.getContext('2d');
        g.globalCompositeOperation = this.drawMode === 'stone' ? 'source-over' : 'destination-out';
        g.fillStyle = '#e8e3d8';
        const rad = this.drawBrush * (c.width / 80);
        const dot = px => { g.beginPath(); g.arc(px, y, rad, 0, Math.PI * 2); g.fill(); };
        dot(x);
        if (c === this.drawFront.c && this.drawMirror) dot(c.width - x);
        this.paintDrawGrid(c);
      };
      c.addEventListener('pointerdown', e => { e.preventDefault(); drawing = true; c.setPointerCapture(e.pointerId); paint(e); });
      c.addEventListener('pointermove', e => { if (drawing) paint(e); });
      c.addEventListener('pointerup', () => { drawing = false; });
      c.addEventListener('pointercancel', () => { drawing = false; });
    }
    return d;
  }

  /* Three.js scene */
  buildScene() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = renderer;
    const scene = new THREE.Scene();
    this.scene = scene;
    scene.environment = makeEnvironment(renderer);
    this.backdrop = backdrop();
    scene.add(this.backdrop);
    this.camera = new THREE.PerspectiveCamera(34, 1, 2, 6000);
    this.camera.position.set(62, 52, 118);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 27, 0);
    this.controls.enableDamping = true;
    this.controls.minDistance = 35;
    this.controls.maxDistance = 320;
    this.controls.maxPolarAngle = Math.PI * 0.62;
    this.controls.addEventListener('change', () => { this.needsRender = true; });
    this.applyMode();

    this.hemi = new THREE.HemisphereLight('#ffffff', '#3a342e', 0.6);
    this.key = new THREE.DirectionalLight('#fff4e6', 2.4);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    const sc = this.key.shadow.camera;
    sc.left = -50; sc.right = 50; sc.top = 50; sc.bottom = -50; sc.near = 10; sc.far = 400;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.35;
    this.rim = new THREE.DirectionalLight('#cfe0ff', 1.1);
    this.spot = new THREE.SpotLight('#fff1dc', 0, 0, 0.42, 0.65, 0);
    this.spot.castShadow = true;
    this.spot.shadow.mapSize.set(1024, 1024);
    this.spot.shadow.bias = -0.0004;
    this.spot.shadow.normalBias = 0.35;
    const aim = new THREE.Object3D(); aim.position.set(0, 26, 0);
    scene.add(aim);
    this.key.target = aim; this.rim.target = aim; this.spot.target = aim;
    scene.add(this.hemi, this.key, this.rim, this.spot);

    const banker = makeBanker();
    this.banker = banker;
    scene.add(banker.group);
    this.floor = new THREE.Mesh(new THREE.CircleGeometry(700, 64), new THREE.MeshStandardMaterial({ color: '#33302c', roughness: 0.95 }));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = banker.floorY;
    this.floor.receiveShadow = true;
    scene.add(this.floor);

    this.turntable = new THREE.Group();
    scene.add(this.turntable);
    this.stoneGroup = new THREE.Group();
    this.turntable.add(this.stoneGroup);

    this.uniforms = {
      uH: { value: 0.5 }, uBase: { value: new THREE.Color() }, uBase2: { value: new THREE.Color() }, uVein: { value: new THREE.Color() },
      uVeinAmt: { value: 0.5 }, uVeinScale: { value: 0.06 }, uVeinFreq: { value: 0.3 }, uVeinTurb: { value: 6 }, uVeinWidth: { value: 0.08 },
      uGuide: { value: 0 }, uSil: { value: 0 }
    };
    this.material = marbleMaterial(this.uniforms);
    this.chunkMeshes = new Map();

    // hover ring and the tool in hand
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 40), new THREE.MeshBasicMaterial({ color: '#ffcf4a', transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    this.ring.visible = false;
    this.ring.renderOrder = 5;
    scene.add(this.ring);
    const { models, mallet } = makeToolModels();
    this.toolModels = models;
    this.toolHolder = new THREE.Group();
    for (const m of Object.values(models)) { m.visible = false; this.toolHolder.add(m); }
    this.mallet = mallet;
    this.toolHolder.add(mallet);
    this.toolHolder.visible = false;
    scene.add(this.toolHolder);
    this.swing = 0;

    // chips and dust
    const chipGeo = new THREE.IcosahedronGeometry(1, 0);
    const p = chipGeo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.6 + Math.random() * 0.8), p.getY(i) * (0.4 + Math.random() * 0.6), p.getZ(i) * (0.6 + Math.random() * 0.8));
    chipGeo.computeVertexNormals();
    this.chipMat = new THREE.MeshStandardMaterial({ color: '#e8e6e0', roughness: 0.75 });
    this.chips = new THREE.InstancedMesh(chipGeo, this.chipMat, 360);
    this.chips.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.chips.castShadow = true;
    this.chips.frustumCulled = false;
    this.chipState = Array.from({ length: 360 }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3(), s: 1 }));
    this.chipNext = 0;
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < 360; i++) this.chips.setMatrixAt(i, hide);
    scene.add(this.chips);
    const DUST = 300;
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST * 3), 3).setUsage(THREE.DynamicDrawUsage));
    dg.setAttribute('aLife', new THREE.BufferAttribute(new Float32Array(DUST), 1).setUsage(THREE.DynamicDrawUsage));
    this.dust = new THREE.Points(dg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color('#f2efe8') }, uScale: { value: 300 } },
      vertexShader: 'attribute float aLife; varying float vL; uniform float uScale; void main() { vL = aLife; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = (1.0 + (1.0 - aLife) * 5.0) * uScale / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uColor; varying float vL; void main() { if (vL <= 0.0) discard; float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vL * 0.32; gl_FragColor = vec4(uColor, a); }'
    }));
    this.dust.frustumCulled = false;
    this.dustState = Array.from({ length: DUST }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3() }));
    this.dustNext = 0;
    scene.add(this.dust);

    this.setMarble(this.marble);
    this.setLight(this.light);
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.viewBox);
    this.resize();
  }

  resize() {
    const w = this.viewBox.clientWidth, h = this.viewBox.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dust.material.uniforms.uScale.value = h * 0.9;
    this.needsRender = true;
  }

  /* Stone lifecycle */
  newStone(quality, { restore = false } = {}) {
    this.stopAuto();
    this.quality = quality;
    if (this.qualitySel) this.qualitySel.value = quality;
    this.stone = M.createStone({ h: M.QUALITY[quality] });
    this.uniforms.uH.value = this.stone.h;
    const s = this.stone;
    this.stoneGroup.scale.setScalar(s.h);
    this.stoneGroup.position.set(-(s.nx - 1) / 2 * s.h, -0.5 * s.h, -(s.nz - 1) / 2 * s.h);
    for (const m of this.chunkMeshes.values()) { m.geometry.dispose(); this.stoneGroup.remove(m); }
    this.chunkMeshes.clear();
    this.undo = []; this.redo = [];
    this.breaks = 0; this.strikes = 0;
    this.blockKg = M.measure(s, null).massKg;
    let restored = false;
    if (restore) restored = this.restoreSaved();
    if (!restored) this.setReference({ type: 'none' }, { silent: true });
    this.updateUndo();
    this.metricsDue = 0;
    this.needsRender = true;
  }

  askNewBlock(quality) {
    this.confirmToast('Start a new block? Your carving will be replaced.', 'New block', () => {
      const keep = quality === this.quality || this.refSpec.type === 'preset' || this.refSpec.type === 'none';
      this.newStone(quality);
      this.setReference(keep ? this.refSpec : { type: 'none' }, { silent: true });
      this.drilled = false;
      this.changed = true;
      this.say('A fresh block, 40 × 56 × 36 cm, about ' + Math.round(this.blockKg) + ' kg of marble.');
    }, () => { this.qualitySel.value = this.quality; });
  }

  /* Reference / maquette */
  onSubject(value) {
    if (value === 'draw') { this.openDrawer(); return; }
    if (value === 'stl') { this.stlIn.click(); this.subjectSel.value = this.subjectValue(); return; }
    if (value === 'none') this.setReference({ type: 'none' });
    else this.setReference({ type: 'preset', id: value.slice(7) });
  }

  subjectValue() {
    const r = this.refSpec;
    return r.type === 'preset' ? 'preset:' + r.id : r.type === 'none' ? 'none' : r.type === 'profiles' ? 'draw' : 'stl';
  }

  setReference(spec, { silent = false } = {}) {
    this.stopAuto();
    const s = this.stone;
    this.busy.hidden = spec.type === 'none';
    const finish = () => {
      try {
        if (spec.type === 'preset') this.ref = M.referenceFromPreset(s, spec.id);
        else if (spec.type === 'profiles') this.ref = M.referenceFromProfiles(s, M.unrle(M.fromBase64(spec.front), s.nx * s.ny), M.unrle(M.fromBase64(spec.side), s.nz * s.ny));
        else if (spec.type === 'mask') this.ref = M.referenceFromMask(s, M.unrle(M.fromBase64(spec.mask), s.nx * s.ny * s.nz));
        else this.ref = null;
      } catch (err) {
        this.ref = null; spec = { type: 'none' };
        this.say('That subject could not be used: ' + err.message);
      }
      this.refSpec = spec;
      this.subjectSel.value = this.subjectValue();
      this.points = this.ref ? M.pointingPoints(s, this.ref, 72) : null;
      this.depths = null;
      this.buildGhost();
      this.buildPointMarkers();
      M.markAll(s);
      this.busy.hidden = true;
      this.metricsDue = 0; this.pointsDue = 0;
      this.changed = true;
      this.needsRender = true;
      for (const b of this.shell.querySelectorAll('.ms-auto')) b.disabled = !this.ref;
      this.allBtn.disabled = !this.ref;
      this.autoNote.textContent = this.ref ? '' : 'Choose a subject to switch on the pointing machine and the autopilot.';
      if (!silent) {
        const preset = spec.type === 'preset' && M.REFERENCES.find(r => r.id === spec.id);
        this.say(preset ? `${preset.label}: ${preset.note}` : spec.type === 'none' ? 'Free carve: no maquette, no measuring. Trust your eye.' : 'Your maquette is ready. Turn on Ghost to see it inside the stone.');
      }
    };
    if (spec.type === 'none') finish(); else setTimeout(finish, 30);
  }

  buildGhost() {
    if (this.ghost) { this.ghost.geometry.dispose(); this.stoneGroup.remove(this.ghost); this.ghost = null; }
    if (!this.ref) return;
    const s = this.stone, g = { nx: s.nx, ny: s.ny, nz: s.nz, h: s.h, density: new Uint8Array(this.ref.length), finish: new Uint8Array(this.ref.length) };
    for (let i = 0; i < this.ref.length; i++) g.density[i] = Math.round(255 * Math.min(1, Math.max(0, 0.5 - this.ref[i] / 1.25)));
    const m = M.meshRegion(g, 0, 0, 0, s.nx - 1, s.ny - 1, s.nz - 1);
    if (!m) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
    geo.setIndex(new THREE.BufferAttribute(m.index, 1));
    this.ghost = new THREE.Mesh(geo, ghostMaterial());
    this.ghost.renderOrder = 4;
    this.ghost.visible = this.view.ghost;
    this.stoneGroup.add(this.ghost);
  }

  buildPointMarkers() {
    if (this.marks) { this.stoneGroup.remove(this.marks); this.marks.geometry.dispose(); this.marks = null; }
    if (!this.points || !this.points.length) { this.legend.hidden = true; return; }
    const n = this.points.length / 6;
    const geo = new THREE.SphereGeometry(0.62 / this.stone.h, 12, 8);
    this.marks = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), n);
    this.marks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.marks.visible = this.view.points;
    this.marks.renderOrder = 3;
    this.stoneGroup.add(this.marks);
    for (let k = 0; k < n; k++) this.marks.setColorAt(k, new THREE.Color('#ffffff'));
  }

  updatePoints() {
    if (!this.marks || !this.view.points) return;
    const s = this.stone, pts = this.points, n = pts.length / 6;
    this.depths = M.pointDepths(s, pts);
    const m = new THREE.Matrix4(), c = new THREE.Color();
    const tally = { deep: 0, close: 0, done: 0, over: 0 };
    for (let k = 0; k < n; k++) {
      const d = this.depths[k], cm = d * s.h;
      const t = Math.max(d, 0);
      m.makeTranslation(pts[k * 6] + pts[k * 6 + 3] * t, pts[k * 6 + 1] + pts[k * 6 + 4] * t, pts[k * 6 + 2] + pts[k * 6 + 5] * t);
      this.marks.setMatrixAt(k, m);
      if (cm < -0.3) { c.set('#9b51e0'); tally.over++; }
      else if (cm <= 0.35) { c.set('#2fbf71'); tally.done++; }
      else if (cm <= 1.2) { c.set('#f2c94c'); tally.close++; }
      else if (cm <= 3) { c.set('#f2994a'); tally.deep++; }
      else { c.set('#e5484d'); tally.deep++; }
      this.marks.setColorAt(k, c);
    }
    this.marks.instanceMatrix.needsUpdate = true;
    this.marks.instanceColor.needsUpdate = true;
    this.pointTally = tally;
    this.renderLegend();
    this.needsRender = true;
  }

  renderLegend() {
    const parts = [];
    if (this.view.points && this.pointTally) {
      const t = this.pointTally;
      parts.push(`<p><b>Pointing machine</b> ${t.deep} still deep · ${t.close} close · ${t.done} reached · ${t.over} over-cut</p>`);
      parts.push('<p class="ms-key"><i style="--c:#e5484d"></i>3 cm+ <i style="--c:#f2994a"></i>1–3 cm <i style="--c:#f2c94c"></i>under 1 cm <i style="--c:#2fbf71"></i>reached <i style="--c:#9b51e0"></i>cut too deep</p>');
    }
    if (this.view.guide) parts.push('<p class="ms-key"><b>Guide</b> <i style="--c:#eb4233"></i>lots to remove <i style="--c:#fac72e"></i>about 1 cm <i style="--c:#29b861"></i>at the surface <i style="--c:#9e52e6"></i>too deep</p>');
    if (this.view.silhouette) parts.push('<p><b>Silhouette test</b> Could a classmate name it from this shape alone? Turn it with ⟲ ⟳.</p>');
    this.legend.innerHTML = parts.join('');
    this.legend.hidden = !parts.length;
  }

  /* Drawing panel */
  openDrawer() {
    this.subjectSel.value = this.subjectValue();
    this.drawer.hidden = false;
    const s = this.stone;
    for (const [c, w] of [[this.drawFront.c, s.nx - 2], [this.drawSide.c, s.nz - 2]]) {
      if (c.width !== w * 4) {
        c.width = w * 4; c.height = (s.ny - 2) * 4;
        this.clearCanvas(c, false);
      }
      c.style.aspectRatio = `${c.width} / ${c.height}`;
      this.paintDrawGrid(c);
    }
    this.drawer.querySelector('button')?.focus();
  }

  closeDrawer() { this.drawer.hidden = true; this.canvas.focus({ preventScroll: true }); }

  clearCanvas(c, fill) {
    const g = c.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, c.width, c.height);
    if (fill) { g.fillStyle = '#e8e3d8'; g.fillRect(0, 0, c.width, c.height); }
  }

  clearDrawings(fill) {
    for (const c of [this.drawFront.c, this.drawSide.c]) { this.clearCanvas(c, fill); this.paintDrawGrid(c); }
  }

  // The grid lives in the canvas's CSS background; nothing to repaint into the bitmap.
  paintDrawGrid(c) {
    const cm = 4 / this.stone.h * 5;
    c.style.backgroundSize = `${(cm / c.width) * 100}% ${(cm / c.height) * 100}%`;
  }

  useDrawings() {
    const s = this.stone;
    const grab = (c, w) => {
      const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, mask = new Uint8Array(w * s.ny);
      let n = 0;
      for (let y = 1; y < s.ny - 1; y++) for (let x = 1; x < w - 1; x++) {
        const px = (x - 1) * 4 + 2, py = (s.ny - 2 - y) * 4 + 2;
        if (data[(py * c.width + px) * 4 + 3] > 100) { mask[x + w * y] = 1; n++; }
      }
      return { mask, n };
    };
    const f = grab(this.drawFront.c, s.nx), sd = grab(this.drawSide.c, s.nz);
    if (f.n < 20 || sd.n < 20) { this.say('Draw both views first: the front and the side.'); return; }
    this.closeDrawer();
    this.setReference({ type: 'profiles', front: M.toBase64(M.rle(f.mask)), side: M.toBase64(M.rle(sd.mask)) });
  }

  async loadStl(file, up = 'z') {
    this.stlIn.value = '';
    if (!file) return;
    try {
      const tris = M.parseSTL(await file.arrayBuffer());
      this.lastStl = { tris, name: file.name };
      this.applyStl(up);
    } catch (err) {
      this.say(err.message || 'That file could not be read.');
    }
  }

  applyStl(up) {
    const { tris, name } = this.lastStl;
    const { mask } = M.voxelizeMesh(this.stone, tris, { up });
    let n = 0;
    for (const v of mask) n += v;
    if (n < 50) { this.say('That model came out almost empty. Is it a closed solid?'); return; }
    this.lastStl.up = up;
    this.setReference({ type: 'mask', mask: M.toBase64(M.rle(mask)) }, { silent: true });
    this.confirmToast(`${name} is your maquette now. Lying on its side?`, 'Turn it upright', () => this.applyStl(up === 'z' ? 'y' : 'z'));
  }

  /* Settings */
  setMarble(id) {
    const m = MARBLES[id] || MARBLES.carrara;
    this.marble = id;
    const u = this.uniforms;
    u.uBase.value.set(m.base); u.uBase2.value.set(m.base2); u.uVein.value.set(m.vein);
    u.uVeinAmt.value = m.amt; u.uVeinWidth.value = m.width; u.uVeinFreq.value = m.freq; u.uVeinTurb.value = m.turb; u.uVeinScale.value = m.scale;
    this.chipMat.color.set(m.base);
    this.dust.material.uniforms.uColor.value.set(m.base).lerp(new THREE.Color('#ffffff'), 0.4);
    this.changed = true;
    this.needsRender = true;
  }

  setLight(id) {
    this.light = id;
    const L = { hemi: this.hemi, key: this.key, rim: this.rim, spot: this.spot };
    const bd = this.backdrop.material.uniforms;
    const set = (o, color, i, pos) => { o.color.set(color); o.intensity = i; if (pos) o.position.set(...pos); };
    this.floor.material.color.set('#33302c');
    if (id === 'raking') {
      set(L.hemi, '#ffffff', 0.08); set(L.key, '#fff1e0', 3.6, [-140, 34, 18]); set(L.rim, '#cfe0ff', 0); L.spot.intensity = 0;
      this.scene.environmentIntensity = 0.12; bd.uTop.value.set('#1c1d21'); bd.uBottom.value.set('#0a0a0c');
    } else if (id === 'museum') {
      set(L.hemi, '#ffffff', 0.12); set(L.key, '#ffffff', 0); set(L.rim, '#bcd2ff', 0.5, [60, 50, -90]);
      L.spot.position.set(30, 190, 90); L.spot.intensity = 5; L.spot.angle = 0.3;
      this.scene.environmentIntensity = 0.25; bd.uTop.value.set('#17181c'); bd.uBottom.value.set('#060607');
    } else if (id === 'daylight') {
      set(L.hemi, '#dcecff', 1.1); set(L.key, '#fff6e8', 2.2, [70, 160, 60]); set(L.rim, '#ffffff', 0.3, [-60, 40, -80]); L.spot.intensity = 0;
      this.scene.environmentIntensity = 0.9; bd.uTop.value.set('#a9c8ea'); bd.uBottom.value.set('#e8e2d6'); this.floor.material.color.set('#b9b0a2');
    } else {
      set(L.hemi, '#ffffff', 0.45); set(L.key, '#fff4e6', 2.3, [-70, 110, 100]); set(L.rim, '#cfe0ff', 1.3, [90, 60, -100]); L.spot.intensity = 0;
      this.scene.environmentIntensity = 0.6; bd.uTop.value.set('#40444c'); bd.uBottom.value.set('#16171b');
    }
    L.key.castShadow = L.key.intensity > 0;
    L.spot.castShadow = L.spot.intensity > 0;
    if (this.lightSel) this.lightSel.value = id;
    this.needsRender = true;
  }

  setView(key, on) {
    this.view[key] = on;
    this.toggles[key].setAttribute('aria-pressed', String(on));
    if (key === 'ghost' && this.ghost) this.ghost.visible = on;
    if (key === 'guide') this.uniforms.uGuide.value = on ? 1 : 0;
    if (key === 'points') { if (this.marks) this.marks.visible = on; if (on) this.updatePoints(); }
    if (key === 'silhouette') {
      this.uniforms.uSil.value = on ? 1 : 0;
      this.banker.group.visible = !on; this.floor.visible = !on;
      this.scene.background = on ? new THREE.Color('#ffffff') : null;
      this.backdrop.visible = !on;
    }
    if ((key === 'ghost' || key === 'guide' || key === 'points') && on && !this.ref) this.say('Choose a subject first: these views compare the stone with a maquette.');
    this.renderLegend();
    this.needsRender = true;
  }

  setTool(id) {
    this.toolId = id;
    for (const [k, b] of Object.entries(this.toolBtns)) b.setAttribute('aria-pressed', String(k === id));
    this.toolUse.textContent = M.TOOLS[id].use;
    for (const [k, m] of Object.entries(this.toolModels)) m.visible = k === id;
    this.mallet.visible = ['point', 'claw', 'flat'].includes(id);
    if (this.mode === 'look') this.setMode('carve');
    this.needsRender = true;
  }

  setMode(mode) {
    this.mode = mode;
    this.modeBtn.setAttribute('aria-pressed', String(mode === 'look'));
    this.modeBtn.textContent = mode === 'look' ? '✋ Carve' : '👁 Look';
    this.applyMode();
  }

  applyMode() {
    const c = this.controls, look = this.mode === 'look' || this.spaceHeld;
    c.mouseButtons = { LEFT: look ? THREE.MOUSE.ROTATE : null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: look ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE };
    c.touches = { ONE: look ? THREE.TOUCH.ROTATE : null, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.canvas.classList.toggle('ms-looking', look);
    if (look) { this.ring.visible = false; this.toolHolder.visible = false; }
  }

  setStoneRules(on) {
    this.stoneRules = on;
    if (on) { this.undo = []; this.redo = []; }
    this.updateUndo();
    this.say(on ? 'Stone rules: every cut is final, like real marble. Michelangelo had no undo.' : 'Undo is back on.');
  }

  turnBy(a) { this.turn.target += a; this.needsRender = true; }

  toggleFull() {
    const root = this.host;
    const doc = document;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) { (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc); return; }
    if (root.classList.contains('ms-fs-fallback')) { root.classList.remove('ms-fs-fallback'); this.resize(); return; }
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (req) req.call(root).catch(() => root.classList.add('ms-fs-fallback'));
    else root.classList.add('ms-fs-fallback');
    setTimeout(() => this.resize(), 120);
  }

  /* Messages */
  say(text, ms = 4800) {
    clearTimeout(this.toastTimer);
    this.toast.replaceChildren(el('p', {}, text));
    this.toast.classList.add('is-on');
    this.toastTimer = setTimeout(() => this.toast.classList.remove('is-on'), ms);
  }

  confirmToast(text, yes, onYes, onNo) {
    clearTimeout(this.toastTimer);
    const close = () => this.toast.classList.remove('is-on');
    this.toast.replaceChildren(el('p', {}, text), el('div', { class: 'ms-row' },
      el('button', { type: 'button', class: 'ms-mini ms-primary', onclick: () => { close(); onYes(); } }, yes),
      el('button', { type: 'button', class: 'ms-mini', onclick: () => { close(); onNo?.(); } }, 'Cancel')));
    this.toast.classList.add('is-on');
    this.toastTimer = setTimeout(close, 12000);
  }

  /* Input */
  bind() {
    const cv = this.canvas;
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => this.onDown(e));
    cv.addEventListener('pointermove', e => this.onMove(e));
    cv.addEventListener('pointerup', e => this.onUp(e));
    cv.addEventListener('pointercancel', e => this.onUp(e));
    cv.addEventListener('pointerleave', e => { this.pointer.inside = false; if (!this.pointer.down) { this.hover = null; this.ring.visible = false; this.toolHolder.visible = false; this.needsRender = true; } this.pointer.touches.delete(e.pointerId); });
    this.host.addEventListener('keydown', e => this.onKey(e));
    this.host.addEventListener('keyup', e => { if (e.code === 'Space' && this.spaceHeld) { this.spaceHeld = false; this.applyMode(); } });
    document.addEventListener('fullscreenchange', () => setTimeout(() => this.resize(), 60));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
    window.addEventListener('pagehide', () => this.save());
  }

  onKey(e) {
    if (e.target.closest('input, select, textarea') && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
    if (!this.drawer.hidden) { if (e.key === 'Escape') this.closeDrawer(); return; }
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) this.doRedo(); else this.doUndo(); return; }
    if (mod && k === 'y') { e.preventDefault(); this.doRedo(); return; }
    if (mod || e.altKey) return;
    const tool = Object.entries(M.TOOLS).find(([, t]) => t.key === e.key);
    if (tool) { this.setTool(tool[0]); return; }
    if (e.key === '[' || e.key === ']') { this.size = Math.min(2.5, Math.max(0.5, this.size + (e.key === ']' ? 0.1 : -0.1))); this.sizeInput.value = this.size; this.sizeOut.textContent = this.size.toFixed(1) + '×'; return; }
    if (k === 'q') this.turnBy(-Math.PI / 4);
    else if (k === 'e') this.turnBy(Math.PI / 4);
    else if (k === 'g') this.setView('ghost', !this.view.ghost);
    else if (k === 'c') this.setView('guide', !this.view.guide);
    else if (k === 'p') this.setView('points', !this.view.points);
    else if (k === 's') this.setView('silhouette', !this.view.silhouette);
    else if (k === 'f') this.toggleFull();
    else if (e.code === 'Space' && e.target === this.canvas) { e.preventDefault(); if (!this.spaceHeld) { this.spaceHeld = true; this.applyMode(); } }
    else return;
  }

  ndc(e) {
    const r = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  // Ray from the pointer into lattice space; returns the hit plus local stroke vectors.
  pick(clientX, clientY) {
    const ndc = this.ndc({ clientX, clientY });
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    this.stoneGroup.updateWorldMatrix(true, false);
    const o = this.stoneGroup.worldToLocal(ray.ray.origin.clone());
    const f = this.stoneGroup.worldToLocal(ray.ray.origin.clone().addScaledVector(ray.ray.direction, 100));
    const dir = f.sub(o).normalize();
    const hit = M.raycast(this.stone, [o.x, o.y, o.z], [dir.x, dir.y, dir.z]);
    if (!hit) return null;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const a = this.stoneGroup.worldToLocal(new THREE.Vector3(0, 0, 0)), b = this.stoneGroup.worldToLocal(right.clone());
    const side = b.sub(a).normalize();
    hit.ray = [dir.x, dir.y, dir.z];
    hit.side = [side.x, side.y, side.z];
    return hit;
  }

  onDown(e) {
    this.sound.unlock();
    this.canvas.focus({ preventScroll: true });
    if (e.pointerType === 'touch') {
      this.pointer.touches.set(e.pointerId, true);
      if (this.pointer.touches.size > 1) { this.endStroke(); return; }
    }
    if (e.button !== 0 || this.mode === 'look' || this.spaceHeld || this.view.silhouette) return;
    this.pointer.x = e.clientX; this.pointer.y = e.clientY;
    this.hover = this.pick(e.clientX, e.clientY);
    if (!this.hover) return;
    if (this.auto) this.stopAuto('Autopilot paused: you took the chisel.');
    this.canvas.setPointerCapture(e.pointerId);
    this.pointer.down = true; this.pointer.id = e.pointerId;
    M.beginEdit(this.stone);
    this.stroke = { acc: 1, count: 0, spalls: 0, tooRough: 0 };
  }

  onMove(e) {
    this.pointer.x = e.clientX; this.pointer.y = e.clientY; this.pointer.inside = true;
    if (this.mode === 'look' || this.spaceHeld || (e.pointerType === 'touch' && !this.pointer.down)) return;
    this.hover = this.pick(e.clientX, e.clientY);
    this.needsRender = true;
  }

  onUp(e) {
    this.pointer.touches.delete(e.pointerId);
    if (this.pointer.down && e.pointerId === this.pointer.id) this.endStroke();
    if (e.pointerType === 'touch') { this.hover = null; this.ring.visible = false; this.toolHolder.visible = false; this.needsRender = true; }
  }

  endStroke() {
    if (!this.stroke) return;
    this.pointer.down = false;
    this.checkBreaks();
    const j = M.endEdit(this.stone);
    if (j) this.pushUndo(j);
    const st = this.stroke;
    this.stroke = null;
    if (st.spalls) this.say('Spall! You struck toward a thin edge and it broke away. Strike toward the mass of the block, not off its edges.');
    else if (st.tooRough > 20) this.say('Polish won’t take on chisel marks. Rasp this area smooth first.');
    this.metricsDue = 0; this.pointsDue = 0;
  }

  doStrike() {
    const hit = this.hover;
    if (!hit) return;
    const tool = M.TOOLS[this.toolId];
    const n = hit.normal, r = hit.ray;
    const dir = [r[0] * 0.65 - n[0] * 0.35, r[1] * 0.65 - n[1] * 0.35, r[2] * 0.65 - n[2] * 0.35];
    const res = M.strike(this.stone, tool, hit.point, dir, hit.side, { size: this.size });
    this.strikes++;
    this.stroke.count++;
    if (res.spalled) this.stroke.spalls++;
    if (res.tooRough) this.stroke.tooRough += res.tooRough;
    this.sound.play(this.toolId, 0.9);
    this.swing = 1;
    if (res.removed > 0.3) this.spray(hit.point, n, res.removed, tool);
    if (this.stroke.count % 12 === 0) this.checkBreaks();
    this.changed = true;
    this.needsRender = true;
  }

  /* Undo */
  pushUndo(j) {
    if (this.stoneRules) return;
    this.undo.push(j);
    if (this.undo.length > 40) this.undo.shift();
    this.redo = [];
    this.updateUndo();
  }

  doUndo() {
    if (this.stoneRules || !this.undo.length) return;
    this.stopAuto();
    this.redo.push(M.restore(this.stone, this.undo.pop()));
    this.afterRestore();
  }

  doRedo() {
    if (this.stoneRules || !this.redo.length) return;
    this.undo.push(M.restore(this.stone, this.redo.pop()));
    this.afterRestore();
  }

  afterRestore() {
    this.updateUndo();
    this.metricsDue = 0; this.pointsDue = 0; this.changed = true; this.needsRender = true;
  }

  updateUndo() {
    // while the autopilot runs, Undo stops it and takes back everything it carved
    this.undoBtn.disabled = this.stoneRules || (!this.undo.length && !this.auto);
    this.redoBtn.disabled = this.stoneRules || !this.redo.length;
  }

  /* Breaking stone */
  checkBreaks() {
    const s = this.stone, pieces = M.findDetached(s);
    if (!pieces.length) return;
    let kg = 0, big = 0;
    for (const piece of pieces) {
      if (piece.length >= 12 && big < 5) { this.dropPiece(piece); big++; kg += piece.length * s.h ** 3 * M.MARBLE_G_PER_CM3 / 1000; }
      M.removePiece(s, piece);
    }
    if (!big) return;
    this.breaks++;
    this.sound.play('crack');
    this.say(`Crack! ${kg >= 1 ? kg.toFixed(1) + ' kg' : Math.round(kg * 1000) + ' g'} of stone broke off: nothing held it to the base. Stone can’t hang on air.`, 6500);
    this.metricsDue = 0;
  }

  dropPiece(piece) {
    const g = M.pieceGrid(this.stone, piece);
    const m = M.meshRegion(g, 0, 0, 0, g.nx - 1, g.ny - 1, g.nz - 1, { ao: true });
    if (!m) return;
    const geo = this.geometryFrom(m);
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.castShadow = true;
    // pivot about the piece's own centre so it tumbles
    const cx = g.nx / 2, cy = g.ny / 2, cz = g.nz / 2;
    geo.translate(-cx, -cy, -cz);
    const holder = new THREE.Object3D();
    holder.position.set(g.origin[0] + cx, g.origin[1] + cy, g.origin[2] + cz);
    holder.add(mesh);
    this.stoneGroup.add(holder);
    const out = new THREE.Vector3(g.origin[0] + cx - this.stone.nx / 2, 0, g.origin[2] + cz - this.stone.nz / 2).normalize();
    this.falling.push({ holder, mesh, v: new THREE.Vector3(out.x * 30, 10, out.z * 30), w: new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3), life: 2.4 });
  }

  /* Chips and dust */
  spray(point, normal, amount, tool) {
    const world = this.stoneGroup.localToWorld(new THREE.Vector3(...point));
    const n = new THREE.Vector3(...normal).transformDirection(this.stoneGroup.matrixWorld);
    const count = Math.min(14, 2 + Math.round(amount * (tool === M.TOOLS.point ? 0.35 : 0.2)));
    const chipSize = tool === M.TOOLS.point ? 0.55 : tool === M.TOOLS.claw ? 0.38 : 0.24;
    if (!tool.smooth && !tool.polish && tool !== M.TOOLS.drill) {
      for (let k = 0; k < count; k++) {
        const c = this.chipState[this.chipNext];
        this.chipNext = (this.chipNext + 1) % this.chipState.length;
        c.life = 2.2 + Math.random();
        c.p.copy(world);
        c.v.copy(n).multiplyScalar(40 + Math.random() * 70).add(new THREE.Vector3((Math.random() - 0.5) * 60, 20 + Math.random() * 50, (Math.random() - 0.5) * 60));
        c.q.setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
        c.w.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
        c.s = chipSize * (0.5 + Math.random());
      }
    }
    const puffs = tool.smooth || tool.polish || tool === M.TOOLS.drill ? 8 : 5;
    for (let k = 0; k < puffs; k++) {
      const d = this.dustState[this.dustNext];
      this.dustNext = (this.dustNext + 1) % this.dustState.length;
      d.life = 1;
      d.p.copy(world).addScaledVector(n, 0.5);
      d.v.copy(n).multiplyScalar(6 + Math.random() * 10).add(new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 8, (Math.random() - 0.5) * 12));
    }
    this.particlesLive = true;
  }

  stepParticles(dt) {
    let live = false;
    const m = new THREE.Matrix4(), sc = new THREE.Vector3(), dq = new THREE.Quaternion(), hide = new THREE.Matrix4().makeScale(0, 0, 0);
    const discR = 30, top = 0, floorY = this.banker.floorY;
    this.chipState.forEach((c, i) => {
      if (c.life <= 0) return;
      live = true;
      c.life -= dt;
      c.v.y -= 980 * dt;
      c.p.addScaledVector(c.v, dt);
      const onDisc = Math.hypot(c.p.x, c.p.z) < discR;
      const ground = onDisc && c.p.y > top - 4 ? top : floorY;
      if (c.p.y < ground + c.s * 0.5) {
        c.p.y = ground + c.s * 0.5;
        c.v.y = Math.abs(c.v.y) * 0.25;
        c.v.x *= 0.55; c.v.z *= 0.55; c.w.multiplyScalar(0.6);
      }
      dq.setFromEuler(new THREE.Euler(c.w.x * dt, c.w.y * dt, c.w.z * dt));
      c.q.multiply(dq);
      const fade = Math.min(1, c.life * 2);
      sc.setScalar(c.s * fade);
      if (c.life <= 0) this.chips.setMatrixAt(i, hide);
      else this.chips.setMatrixAt(i, m.compose(c.p, c.q, sc));
    });
    this.chips.instanceMatrix.needsUpdate = true;
    const pos = this.dust.geometry.attributes.position, life = this.dust.geometry.attributes.aLife;
    this.dustState.forEach((d, i) => {
      if (d.life <= 0) { life.array[i] = 0; return; }
      live = true;
      d.life -= dt * 0.7;
      d.v.multiplyScalar(1 - dt * 1.6);
      d.v.y -= 2 * dt;
      d.p.addScaledVector(d.v, dt);
      pos.array.set([d.p.x, d.p.y, d.p.z], i * 3);
      life.array[i] = Math.max(0, d.life);
    });
    pos.needsUpdate = true; life.needsUpdate = true;
    for (let k = this.falling.length - 1; k >= 0; k--) {
      const f = this.falling[k];
      live = true;
      f.life -= dt;
      f.v.y -= 980 / this.stone.h * dt * 0.5;
      f.holder.position.addScaledVector(f.v, dt);
      f.holder.rotation.x += f.w.x * dt; f.holder.rotation.y += f.w.y * dt; f.holder.rotation.z += f.w.z * dt;
      if (f.life <= 0) { this.stoneGroup.remove(f.holder); f.mesh.geometry.dispose(); this.falling.splice(k, 1); }
    }
    this.particlesLive = live;
    return live;
  }

  /* Autopilot */
  runAuto(id, all) {
    if (!this.ref) { this.say('Choose a subject first: the autopilot carves toward a maquette.'); return; }
    this.sound.unlock();
    this.stopAuto();
    const order = M.STAGES.map(s => s.id);
    let start = id || order.find(sid => !this.stageDone(sid)) || 'polish';
    if (this.view.silhouette) this.setView('silhouette', false);
    M.beginEdit(this.stone);
    this.auto = { all, index: order.indexOf(start), plan: null, k: 0, holes: 0 };
    this.stopBtn.disabled = false;
    this.allBtn.disabled = true;
    this.updateUndo();
    this.startStage();
  }

  stageDone(id) {
    const m = this.metrics;
    if (!m || !m.stages) return false;
    if (id === 'drill') return (m.stages.rough ?? 0) > 0.3 || this.drilled;
    if (id === 'rasp') return m.rasped > 0.9;
    if (id === 'polish') return m.polished > 0.9;
    return (m.stages[id] ?? 0) > 0.985;
  }

  startStage() {
    const a = this.auto, stage = M.STAGES[a.index];
    if (!stage) { this.finishAuto('Autopilot finished. Now look hard: silhouette, raking light, and what would make it more like your subject?'); return; }
    if (stage.id === 'drill') { a.plan = { stage, drill: true }; a.k = 0; }
    else a.plan = M.planStage(this.stone, this.ref, stage, 3 + a.index);
    this.setTool(stage.tool);
    for (const [sid, r] of Object.entries(this.stepRows)) r.row.classList.toggle('is-active', sid === stage.id);
    this.autoNote.textContent = `Autopilot: ${stage.label.toLowerCase()} with the ${M.TOOLS[stage.tool].label.toLowerCase()}. ${stage.why}`;
  }

  stepAuto(dt) {
    const a = this.auto;
    if (!a) return;
    const plan = a.plan, stage = plan.stage;
    const budgetMs = this.speed >= 100 ? 26 : 12;
    const perFrame = this.speed >= 100 ? 1e9 : Math.max(1, Math.round(this.speed * (stage.id === 'rasp' || stage.id === 'polish' ? 6 : stage.id === 'drill' ? 0.35 : 1.4)));
    const t0 = performance.now();
    let done = 0, lastHit = null;
    if (plan.drill) {
      a.acc = (a.acc || 0) + perFrame * dt * 4;
      while (a.acc >= 1 && a.k < this.points.length / 6 && performance.now() - t0 < budgetMs) {
        a.acc--;
        const hole = M.drillOne(this.stone, this.ref, this.points, a.k++);
        if (hole) { lastHit = [...hole[1], [hole[1][0] - hole[0][0], hole[1][1] - hole[0][1], hole[1][2] - hole[0][2]]]; done++; }
      }
      if (a.k >= this.points.length / 6) { this.drilled = true; this.nextStage(); }
    } else {
      while (done < perFrame && plan.pos < plan.queue.length && performance.now() - t0 < budgetMs) {
        const r = M.autoStep(this.stone, this.ref, plan, plan.queue[plan.pos++]);
        if (r) { done++; lastHit = r; if (this.speed < 100 || done % 25 === 0) this.spray([r[0], r[1], r[2]], r[3].map(v => -v), stage.id === 'rough' ? 30 : 8, M.TOOLS[stage.tool]); }
      }
      if (plan.pos >= plan.queue.length) this.nextStage();
    }
    if (lastHit) {
      this.strikes += done;
      this.sound.play(stage.tool, 0.7);
      this.swing = 1;
      const [x, y, z, dir] = lastHit;
      const d = new THREE.Vector3(...dir).normalize();
      this.hover = { point: [x - d.x * 0.5, y - d.y * 0.5, z - d.z * 0.5], normal: [-d.x, -d.y, -d.z], ray: [d.x, d.y, d.z], side: [1, 0, 0], auto: true };
      this.changed = true;
    }
    this.needsRender = true;
  }

  nextStage() {
    const a = this.auto;
    this.checkBreaks();
    if (a.all) { a.index++; this.startStage(); return; }
    const stage = a.plan.stage;
    const next = M.STAGES[a.index + 1];
    this.finishAuto(`${stage.label} done.` + (next ? ` Next: ${next.label.toLowerCase()} with the ${M.TOOLS[next.tool].label.toLowerCase()}. Try it yourself, or run the autopilot again.` : ''));
  }

  finishAuto(msg) {
    const j = M.endEdit(this.stone);
    if (j) this.pushUndo(j);
    this.auto = null;
    this.stopBtn.disabled = true;
    this.allBtn.disabled = !this.ref;
    this.autoNote.textContent = '';
    this.updateUndo();
    for (const r of Object.values(this.stepRows)) r.row.classList.remove('is-active');
    this.hover = null;
    this.metricsDue = 0; this.pointsDue = 0;
    if (msg) this.say(msg, 7000);
  }

  stopAuto(msg) {
    if (!this.auto) return;
    this.finishAuto(msg);
  }

  /* Metrics panel */
  updateMetrics() {
    const m = M.measure(this.stone, this.ref);
    this.metrics = m;
    const removed = this.blockKg - m.massKg;
    const rows = [];
    if (this.ref) {
      const pct = Math.round(m.likeness * 100);
      this.likeOut.textContent = pct + '%';
      this.meter.firstChild.style.width = pct + '%';
      rows.push(['Front silhouette', Math.round(m.silhouetteFront * 100) + '%'], ['Side silhouette', Math.round(m.silhouetteSide * 100) + '%'],
        ['Waste stone removed', Math.round(m.roughedOut * 100) + '%'],
        ['Over-cut', m.overcutCm3 < 1 ? 'none' : Math.round(m.overcutCm3) + ' cm³']);
    } else {
      this.likeOut.textContent = '—';
      this.meter.firstChild.style.width = '0%';
    }
    rows.push(['Marble removed', `${Math.round(removed)} of ${Math.round(this.blockKg)} kg`], ['Statue weighs', Math.round(m.massKg) + ' kg'], ['Strikes', this.strikes.toLocaleString()], ['Breaks', String(this.breaks)]);
    this.likeList.replaceChildren(...rows.flatMap(([k, v]) => [el('dt', {}, k), el('dd', { class: k === 'Over-cut' && v !== 'none' ? 'is-warn' : k === 'Breaks' && this.breaks ? 'is-warn' : '' }, v)]));
    const progress = {
      subject: this.ref ? 1 : this.refSpec.type === 'none' && this.strikes ? 1 : 0,
      drill: this.drilled || (m.stages?.rough ?? 0) > 0.3 ? 1 : 0,
      rough: m.stages?.rough ?? 0, model: m.stages?.model ?? 0, define: m.stages?.define ?? 0,
      rasp: m.rasped, polish: m.polished,
      present: this.presented ? 1 : 0
    };
    for (const [id, r] of Object.entries(this.stepRows)) {
      const v = Math.max(0, Math.min(1, progress[id] || 0));
      r.bar.style.width = Math.round(v * 100) + '%';
      r.row.classList.toggle('is-done', v >= 0.985);
    }
  }

  /* Saving */
  serialize() {
    return { app: 'ClassroomOS Marble Studio', v: 1, quality: this.quality, marble: this.marble, light: this.light, ref: this.refSpec, breaks: this.breaks, strikes: this.strikes, drilled: !!this.drilled, stoneRules: this.stoneRules, stone: M.encodeStone(this.stone) };
  }

  save() {
    if (!this.changed) return;
    this.changed = false;
    if (!store.set(SAVE_KEY, JSON.stringify(this.serialize())) && !this.saveWarned) {
      this.saveWarned = true;
      this.say('This browser is full, so the carving isn’t autosaving. Use Save file to keep it.');
    }
  }

  restoreSaved() {
    const raw = store.get(SAVE_KEY);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      return this.load(data, 'Welcome back: your carving is where you left it.');
    } catch { return false; }
  }

  load(data, msg) {
    if (!data || data.app !== 'ClassroomOS Marble Studio') throw new Error('That is not a Marble Studio file.');
    if (!M.QUALITY[data.quality]) throw new Error('That file has an unknown block size.');
    if (data.quality !== this.quality) this.newStone(data.quality);
    M.decodeInto(this.stone, data.stone);
    this.breaks = data.breaks || 0; this.strikes = data.strikes || 0; this.drilled = !!data.drilled;
    this.marbleSel.value = data.marble in MARBLES ? data.marble : 'carrara';
    this.setMarble(this.marbleSel.value);
    this.setLight(data.light in LIGHTS ? data.light : 'studio');
    this.rulesBox.checked = !!data.stoneRules; this.stoneRules = !!data.stoneRules;
    this.setReference(data.ref || { type: 'none' }, { silent: true });
    this.undo = []; this.redo = []; this.updateUndo();
    if (msg) setTimeout(() => this.say(msg), 400);
    return true;
  }

  saveFile() {
    download('my-sculpture.marble.json', JSON.stringify(this.serialize()), 'application/json');
    this.say('Saved. Open the file here later to keep carving.');
  }

  async openFile(file) {
    this.fileIn.value = '';
    if (!file) return;
    try { this.load(JSON.parse(await file.text()), 'Opened ' + file.name + '.'); this.changed = true; }
    catch (err) { this.say(err.message || 'That file could not be opened.'); }
  }

  exportStl() {
    try {
      download(`my-sculpture-${this.heightMm}mm.stl`, M.exportSTL(this.stone, { heightMm: this.heightMm }), 'model/stl');
      this.presented = true;
      this.say(`STL saved, ${this.heightMm} mm tall, base flat on the bed. Slice it with supports where your figure overhangs.`);
    } catch (err) { this.say(err.message); }
  }

  photograph() {
    const ring = this.ring.visible, tool = this.toolHolder.visible;
    this.ring.visible = false; this.toolHolder.visible = false;
    this.renderer.render(this.scene, this.camera);
    const url = this.canvas.toDataURL('image/png');
    this.ring.visible = ring; this.toolHolder.visible = tool;
    fetch(url).then(r => r.blob()).then(b => download('my-sculpture.png', b));
    this.presented = true;
    this.metricsDue = 0;
    this.say('Photo saved. Light it from one side first: sculptors judge form by its shadows.');
  }

  /* Meshing */
  geometryFrom(m) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
    geo.setAttribute('aFinish', new THREE.BufferAttribute(m.finish, 1));
    geo.setAttribute('aAO', new THREE.BufferAttribute(m.ao || new Float32Array(m.finish.length).fill(1), 1));
    geo.setAttribute('aGuide', new THREE.BufferAttribute(m.guide || new Float32Array(m.finish.length), 1));
    geo.setIndex(new THREE.BufferAttribute(m.index, 1));
    geo.computeBoundingSphere();
    return geo;
  }

  remesh(budgetMs) {
    const s = this.stone;
    if (!s.dirty.size) return;
    const t0 = performance.now();
    for (const c of s.dirty) {
      s.dirty.delete(c);
      const cx = c % s.cx, cy = ((c / s.cx) | 0) % s.cy, cz = (c / (s.cx * s.cy)) | 0;
      const m = M.meshRegion(s, cx * M.CHUNK, cy * M.CHUNK, cz * M.CHUNK, cx * M.CHUNK + M.CHUNK, cy * M.CHUNK + M.CHUNK, cz * M.CHUNK + M.CHUNK, { ao: true, ref: this.ref });
      const old = this.chunkMeshes.get(c);
      if (!m) {
        if (old) { old.geometry.dispose(); this.stoneGroup.remove(old); this.chunkMeshes.delete(c); }
      } else if (old) {
        old.geometry.dispose();
        old.geometry = this.geometryFrom(m);
      } else {
        const mesh = new THREE.Mesh(this.geometryFrom(m), this.material);
        mesh.castShadow = true; mesh.receiveShadow = true;
        this.stoneGroup.add(mesh);
        this.chunkMeshes.set(c, mesh);
      }
      this.needsRender = true;
      if (performance.now() - t0 > budgetMs) break;
    }
  }

  /* Frame */
  placeTool(dt) {
    const hit = this.hover;
    const show = !!hit && !this.view.silhouette && this.mode === 'carve' && !this.spaceHeld && (this.pointer.inside || this.pointer.down || hit.auto);
    this.ring.visible = show && !hit.auto;
    this.toolHolder.visible = show;
    if (!show) return;
    const p = this.stoneGroup.localToWorld(new THREE.Vector3(...hit.point));
    const n = new THREE.Vector3(...hit.normal).transformDirection(this.stoneGroup.matrixWorld);
    const tool = M.TOOLS[this.toolId];
    this.ring.position.copy(p).addScaledVector(n, 0.08);
    this.ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    this.ring.scale.setScalar(tool.radius * this.size);
    const camUp = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    const camRight = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const axis = n.clone().multiplyScalar(0.7).addScaledVector(camUp, 0.5).addScaledVector(camRight, 0.42).normalize();
    this.swing = Math.max(0, this.swing - dt * 7);
    const s = this.swing, jab = s > 0.6 ? (1 - s) * 2.5 : s * 0.6;
    this.toolHolder.position.copy(p).addScaledVector(axis, 0.15 + jab * 0.6);
    if (tool.smooth || tool.polish) {
      const t = performance.now() / 120;
      this.toolHolder.position.addScaledVector(camRight, Math.sin(t) * 0.6 * (this.pointer.down || hit.auto ? 1 : 0));
    }
    this.toolHolder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    // the mallet hovers behind the chisel's head and comes down on it
    this.mallet.position.set(2.5 + s * 5, 21 + s * 3, 0);
    this.mallet.rotation.set(0, 0, -0.5 - s * 0.9);
    if (s > 0) this.needsRender = true;
  }

  frame(dt) {
    dt = Math.min(dt, 0.05);
    if (this.stroke && this.pointer.down) {
      const tool = M.TOOLS[this.toolId];
      this.stroke.acc += dt * tool.rate * (0.7 + 0.3 * this.size);
      let n = 0;
      while (this.stroke.acc >= 1 && n < 4) {
        this.stroke.acc -= 1; n++;
        this.hover = this.pick(this.pointer.x, this.pointer.y);
        this.doStrike();
      }
    }
    this.stepAuto(dt);
    // a whole new block meshes in one go rather than popping in chunk by chunk
    this.remesh(this.stone.dirty.size > 60 && !this.stroke && !this.auto ? 400 : this.auto && this.speed >= 100 ? 14 : 9);
    // turntable
    if (Math.abs(this.turn.target - this.turn.angle) > 1e-3) {
      this.turn.angle += (this.turn.target - this.turn.angle) * Math.min(1, dt * 6);
      this.turntable.rotation.y = this.turn.angle;
      this.banker.disc.rotation.y = this.turn.angle;
      if (this.hover && !this.pointer.down && !this.auto) this.hover = null;
      this.needsRender = true;
    }
    const now = performance.now();
    if (!this.metricsDue || now - this.metricsDue > 1500) {
      if (!this.metricsDue || this.changed || this.auto) { this.updateMetrics(); }
      this.metricsDue = now;
    }
    if (this.view.points && (!this.pointsDue || now - this.pointsDue > 350) && !this.stone.dirty.size) { this.updatePoints(); this.pointsDue = now; }
    if (this.changed && now - this.saveDue > 15000) { this.saveDue = now; this.save(); }
    const moving = this.controls.update();
    const particles = this.particlesLive && this.stepParticles(dt);
    this.placeTool(dt);
    if (this.needsRender || moving || particles || this.auto || this.stroke) {
      this.needsRender = false;
      this.renderer.render(this.scene, this.camera);
    }
  }

  startLoop() {
    const SimKit = window.SimKit;
    const tick = dt => this.frame(dt);
    if (SimKit && SimKit.loop) this.loop = SimKit.loop(tick, { el: SimKit.stage ? SimKit.stage(this.canvas) : this.canvas, maxDt: 0.1 });
    else {
      let last = performance.now();
      const raf = t => { this.frame((t - last) / 1000); last = t; requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
}

function mountAll() {
  for (const host of document.querySelectorAll('[data-marble-studio]')) {
    if (host.marbleStudio) continue;
    try { host.marbleStudio = new Studio(host); }
    catch (err) {
      console.error(err);
      host.prepend(el('p', { class: 'ms-fallback' }, 'The Marble Studio needs WebGL, which this browser has switched off. The lesson’s photos and steps still work without it.'));
    }
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
else mountAll();

export { Studio, MARBLES };
