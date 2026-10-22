// sphere-environment.mjs — the world around the 360° page sphere (vr/page-sphere.html).
// One big inward-facing sphere, one fragment shader, a look per site theme (sphere-theme.mjs):
// the Lava Lamp theme becomes wax rising all around you, Vaporwave a neon grid floor in every
// direction, Mandelbrot a revolving fractal, Night a star field, and so on.
//
//   const env = createEnvironment(THREE, { LiquidEngine: window.LiquidEngine });
//   scene.add(env.mesh);
//   env.setTheme(ClassroomOSThemeRegistry.get(id));
//   each frame:  env.update(dt, scale, headPosition)      // scale 0 freezes it (see motionScale)
//
// Directions, not positions, drive every look, so it is seamless and has no parallax to
// fight the page screens, which are drawn over it.
import { LOOK, environmentFor, blobToSphere, LAVA_BOX } from './sphere-theme.mjs';

const MAX_BALLS = 24;
const BLOBS = 10; // two lobes each (body and tail) + four heater lumps = 24

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uLowPower;
uniform int uLook;
uniform int uCount;
uniform vec3 uP0, uP1, uP2, uP3;
uniform vec3 uAccent;
uniform vec4 uBlob[${MAX_BALLS}];   // xyz = unit direction, w = angular radius
uniform vec3 uBlobColor[${MAX_BALLS}];
varying vec3 vDir;

vec3 calmWorld(vec3 d) {
  vec3 horizon = mix(uP0, uP1, 0.34);
  vec3 zenith = mix(uP0, uP2, 0.22);
  vec3 floorColor = mix(uP0, uP3, 0.18) * 0.72;
  vec3 col = d.y >= 0.0
    ? mix(horizon, zenith, pow(d.y, 0.72))
    : mix(horizon, floorColor, pow(-d.y, 0.62));
  float glow = pow(max(0.0, 1.0 - abs(d.y)), 8.0);
  return col + uAccent * glow * 0.06;
}

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; }
  return s;
}

// Light themes: a soft sky above the horizon, a tinted ground below, slow clouds.
vec3 sky(vec3 d) {
  vec3 up = mix(uP0, uP1, 0.42);
  vec3 horizon = mix(uP0, vec3(1.0), 0.45);
  vec3 ground = mix(uP0, uP1, 0.22) * 0.88;
  vec3 col = d.y > 0.0 ? mix(horizon, up, pow(d.y, 0.7)) : mix(horizon, ground, pow(-d.y, 0.6));
  float n = fbm(vec3(d.x * 2.2 + uTime * 0.02, d.y * 3.0, d.z * 2.2));
  float cloud = smoothstep(0.5, 0.82, n) * smoothstep(-0.1, 0.4, d.y);
  return mix(col, vec3(1.0), cloud * 0.55);
}

// Night: deep gradient, a faint band of galaxy, twinkling stars.
vec3 night(vec3 d) {
  vec3 col = mix(uP0 * 0.35, uP1 * 0.55, smoothstep(-0.4, 0.9, d.y));
  float band = exp(-pow(dot(d, normalize(vec3(0.3, 0.9, 0.5))) * 3.2, 2.0));
  col += uP2 * 0.10 * band * (0.4 + fbm(d * 5.0));
  // Two layers: many small stars and a few big bright ones, so some read in a headset.
  for (int layer = 0; layer < 2; layer++) {
    float density = layer == 0 ? 46.0 : 18.0;
    float rare = layer == 0 ? 0.93 : 0.975;
    vec3 p = d * density + float(layer) * 11.3;
    float h = hash(floor(p));
    float star = smoothstep(layer == 0 ? 0.34 : 0.42, 0.0, length(fract(p) - 0.5)) * step(rare, h);
    float twinkle = 0.7 + 0.3 * sin(uTime * 1.6 + h * 80.0);
    col += mix(uP3, vec3(1.0), 0.5) * star * twinkle * (0.55 + 0.45 * fract(h * 97.0)) * smoothstep(-0.15, 0.2, d.y);
  }
  return col;
}

// Bark: dark wood grain wrapped round the room, warm glow at the floor.
vec3 bark(vec3 d) {
  float warp = fbm(d * 3.0);
  float rings = 0.5 + 0.5 * sin((d.y * 14.0 + warp * 5.0) * 3.14159);
  float fine = noise(d * vec3(40.0, 4.0, 40.0));
  vec3 col = mix(uP0, uP1, rings * 0.65 + warp * 0.35);
  col = mix(col, uP0 * 0.6, smoothstep(0.62, 0.9, fine) * 0.5);
  col += uP2 * 0.10 * smoothstep(-0.2, -1.0, d.y);
  return col;
}

// Vaporwave: striped sun behind you, neon grid floor in every direction.
vec3 vaporwave(vec3 d) {
  vec3 col;
  if (d.y >= 0.0) {
    col = mix(uP1 * 0.55, uP0, pow(d.y, 0.55));
    vec3 sd = normalize(vec3(0.0, 0.16, 1.0));
    float ang = acos(clamp(dot(d, sd), -1.0, 1.0));
    float disc = smoothstep(0.36, 0.34, ang);
    float cut = smoothstep(0.0, 0.02, sin((d.y - 0.02) * 170.0) * 0.5 + (d.y * 3.0 - 0.1));
    col = mix(col, mix(uP2, uP1, smoothstep(0.0, 0.5, d.y + 0.1)) * 1.1, disc * clamp(cut, 0.0, 1.0));
    col += uP1 * 0.25 * exp(-d.y * 9.0);
  } else {
    float t = 0.5 / max(-d.y, 0.012);
    vec2 g = d.xz * t + vec2(0.0, uTime * 0.7);
    vec2 w = abs(fract(g) - 0.5);
    float line = max(smoothstep(0.47, 0.5, w.x), smoothstep(0.47, 0.5, w.y));
    float fade = exp(-t * 0.07);
    col = uP0 * 0.9 + uP1 * 0.10 * exp(d.y * 5.0);
    col += uP2 * line * fade * 1.1;
    col += uP1 * 0.25 * exp(d.y * 14.0);
  }
  return col;
}

// Mandelbrot: each hemisphere is a stereographic disc (mirrored, so there is no seam at
// the horizon), a slow spin and zoom into the seahorse valley.
vec3 mandelbrot(vec3 d) {
  vec2 p = d.xz / (1.0 + abs(d.y));
  float spin = uTime * 0.05;
  p = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * p;
  // At eye level |p| is about 1, so the zoom is how far from the seahorse valley you can see:
  // wide enough to take in the set's boundary, where all the detail is.
  float zoom = 0.45 + 0.25 * sin(uTime * 0.04);
  vec2 c = vec2(-0.745, 0.12) + p * zoom;
  vec2 z = vec2(0.0);
  float n = 0.0;
  float m2 = 0.0;
  for (int i = 0; i < 56; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    m2 = dot(z, z);
    if (m2 > 256.0) break;
    n += 1.0;
  }
  if (m2 <= 256.0) return uP0 * 0.6;
  float s = (n - log2(log2(m2)) + 4.0) / 24.0;
  float k = fract(s) * 3.0;
  vec3 col = k < 1.0 ? mix(uP0, uP1, k) : k < 2.0 ? mix(uP1, uP2, k - 1.0) : mix(uP2, uP3, k - 2.0);
  return col * (0.55 + 0.45 * smoothstep(0.0, 1.0, d.y * 0.5 + 0.5));
}

// Lava lamp: ThermalBlobs wax as a metaball field over the sphere, heater glow at the floor.
vec3 lava(vec3 d) {
  float field = 0.0;
  vec3 grad = vec3(0.0);
  vec3 tint = vec3(0.0);
  for (int i = 0; i < ${MAX_BALLS}; i++) {
    if (i >= uCount) break;
    vec3 off = d - uBlob[i].xyz;
    float r = uBlob[i].w;
    float dd = dot(off, off);
    float q = dd + r * r * 0.16;
    // A metaball's 1/d^2 tail is harmless on a flat screen, but on a sphere two dozen tails add
    // up to the threshold everywhere. Fade each blob's reach out past about three radii.
    float reach = 1.0 - smoothstep(1.6 * r, 3.0 * r, sqrt(dd));
    float f = r * r / q * reach;
    field += f;
    grad += -2.0 * r * r * off / (q * q) * reach;
    tint += uBlobColor[i] * f;
  }
  tint /= max(field, 0.001);
  float heater = smoothstep(-0.25, -1.0, d.y);
  float glass = 0.5 + 0.5 * d.y;
  vec3 bg = uP0 * 0.05 + uP3 * 0.07 * glass * glass + uP3 * 0.30 * heater * heater;
  float edge = exp(-max(0.0, field - 1.0) * 1.5);
  vec3 tangent = grad - d * dot(grad, d);
  vec3 normal = normalize(-d * 0.65 - tangent * 0.9);
  float gloss = pow(max(0.0, dot(normal, normalize(vec3(-0.4, 0.85, 0.35)))), 18.0);
  vec3 wax = tint * (0.5 + 0.3 * edge) + tint * heater * 0.7 + uP3 * edge * 0.12 + mix(uP3, uP2, 0.5) * gloss * 0.55;
  return mix(bg, wax, smoothstep(0.96, 1.04, field));
}

void main() {
  vec3 d = normalize(vDir);
  if (uLowPower > 0.5) {
    gl_FragColor = vec4(calmWorld(d), 1.0);
    return;
  }
  vec3 col;
  if (uLook == ${LOOK.night}) col = night(d);
  else if (uLook == ${LOOK.bark}) col = bark(d);
  else if (uLook == ${LOOK.vaporwave}) col = vaporwave(d);
  else if (uLook == ${LOOK.mandelbrot}) col = mandelbrot(d);
  else if (uLook == ${LOOK.lava}) col = lava(d);
  else col = sky(d);
  gl_FragColor = vec4(col, 1.0);
}`;

export function createEnvironment(THREE, { LiquidEngine, radius = 20 } = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uLowPower: { value: 0 },
    uLook: { value: LOOK.sky },
    uCount: { value: 0 },
    uP0: { value: new THREE.Vector3() },
    uP1: { value: new THREE.Vector3() },
    uP2: { value: new THREE.Vector3() },
    uP3: { value: new THREE.Vector3() },
    uAccent: { value: new THREE.Vector3() },
    uBlob: { value: Array.from({ length: MAX_BALLS }, () => new THREE.Vector4()) },
    uBlobColor: { value: Array.from({ length: MAX_BALLS }, () => new THREE.Vector3()) }
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false
  });
  const mesh = new THREE.Mesh(
    // Geodesic, like Sphere's exoskeleton: even triangles everywhere, so no thin slivers
    // pinch at the zenith and under your feet (where a UV sphere crowds its poles).
    new THREE.IcosahedronGeometry(radius, 8),
    material
  );
  mesh.renderOrder = -10; // behind the page screens
  mesh.frustumCulled = false;
  mesh.name = 'sphere-environment';

  // The wax: real LiquidEngine physics, started settled so a frozen world still looks alive.
  let blobs = null;
  if (LiquidEngine && LiquidEngine.ThermalBlobs) {
    blobs = new LiquidEngine.ThermalBlobs({ count: BLOBS }).resize(LAVA_BOX.width, LAVA_BOX.height);
    for (let i = 0; i < 90; i++) blobs.update(0.1);
  }
  let env = environmentFor({ id: 'day', swatch: ['#dff1ff', '#6eb6ff'], accentRGB: [0, 113, 227] });

  function setTheme(theme) {
    env = environmentFor(theme);
    uniforms.uLook.value = env.look;
    ['uP0', 'uP1', 'uP2', 'uP3'].forEach((name, i) => uniforms[name].value.set(...env.palette[i]));
    uniforms.uAccent.value.set(...env.accent);
    feedWax();
    return env;
  }

  // Two lobes per body (body + a stretched tail) and a ring of heater lumps on the floor.
  const wax = new THREE.Vector3();
  function feedWax() {
    if (env.look !== LOOK.lava || !blobs) { uniforms.uCount.value = 0; return; }
    let n = 0;
    for (const b of blobs.bodies) {
      const tail = Math.min(b.r * 0.85, Math.abs(b.vy) * 0.7);
      for (let k = 0; k < 2 && n < MAX_BALLS - 4; k++) {
        const at = blobToSphere({ x: b.x, y: b.y + (k ? tail * (b.vy < 0 ? 1 : -1) : 0), r: b.r * (k ? 0.55 : 0.88) });
        uniforms.uBlob.value[n].set(at.dir[0], at.dir[1], at.dir[2], at.radius);
        wax.set(...env.palette[1]).multiplyScalar(b.mix[0]).addScaledVector(new THREE.Vector3(...env.palette[2]), b.mix[1]);
        uniforms.uBlobColor.value[n].copy(wax);
        n++;
      }
    }
    for (let i = 0; i < 4 && n < MAX_BALLS; i++, n++) {
      const lon = (i / 4) * Math.PI * 2 + 0.4;
      const lat = (-66 * Math.PI) / 180;
      uniforms.uBlob.value[n].set(Math.cos(lat) * Math.sin(lon), Math.sin(lat), -Math.cos(lat) * Math.cos(lon), 0.42);
      uniforms.uBlobColor.value[n].set(...env.palette[3]);
    }
    uniforms.uCount.value = n;
  }

  /** scale: 1 = full speed, 0 = frozen (motionScale in sphere-theme.mjs). */
  function update(dt, scale = 1, follow) {
    if (scale > 0) {
      uniforms.uTime.value += dt * scale;
      if (blobs && env.look === LOOK.lava) blobs.update(dt * scale);
    }
    if (env.look === LOOK.lava) feedWax();
    if (follow) mesh.position.copy(follow);
  }

  function dispose() {
    mesh.geometry.dispose();
    material.dispose();
  }

  function setLowPower(on) {
    uniforms.uLowPower.value = on ? 1 : 0;
  }

  return { mesh, setTheme, setLowPower, update, dispose, uniforms, get look() { return env.look; }, get environment() { return env; } };
}
