// CGI-Water-standard renderer for LiquidEngine.
// Uses the repo-pinned Three.js bundle and keeps simulation/material state in
// LiquidEngine-compatible terms. This is a real-time approximation: layered
// waves, analytical normals, Fresnel response, depth color, foam, and caustic
// hints—not a full photon or Navier–Stokes solver. createDepthFieldMesh()
// renders a LiquidEngine.DepthField (lava fields) draped over terrain.

const MATERIALS = {
  water: { surface: 0x3cb9d2, deep: 0x062e58, foam: 0xd8fbff, roughness: 0.08, opacity: 0.82, glow: 0x1b8fb5, damping: 2.0, typeId: 0 },
  lava: { surface: 0xf04a18, deep: 0x3d0804, foam: 0xffe277, roughness: 0.7, opacity: 1, glow: 0xf04a18, damping: 6.0, typeId: 1 },
  honey: { surface: 0xd9951d, deep: 0x482007, foam: 0xffeea1, roughness: 0.28, opacity: 0.98, glow: 0xb86609, damping: 6.5, typeId: 2 },
  oil: { surface: 0x526b78, deep: 0x081117, foam: 0xd4f3ff, roughness: 0.16, opacity: 0.94, glow: 0x203c4d, damping: 3.5, typeId: 3 },
  coldWater: { surface: 0x38bdf8, deep: 0x072540, foam: 0xe0f7ff, roughness: 0.05, opacity: 0.86, glow: 0x0284c7, damping: 2.4, typeId: 4 },
  boilingWater: { surface: 0x67e8f9, deep: 0x0b4260, foam: 0xffffff, roughness: 0.11, opacity: 0.80, glow: 0x7dd3fc, damping: 1.4, typeId: 5 },
  glycerol: { surface: 0x34d399, deep: 0x063d2d, foam: 0xd1fae5, roughness: 0.12, opacity: 0.90, glow: 0x10b981, damping: 5.0, typeId: 6 },
  magma: { surface: 0xdc2626, deep: 0x1c0504, foam: 0xffc66d, roughness: 0.84, opacity: 1, glow: 0xe11d48, damping: 8.5, typeId: 7 },
  mercury: { surface: 0xd6e1ea, deep: 0x4b5965, foam: 0xffffff, roughness: 0.03, opacity: 1, glow: 0xe2e8f0, damping: 1.8, typeId: 8 }
};

const MATERIAL_ALIASES = {
  'cold-water': 'coldWater',
  'boiling-water': 'boilingWater'
};

function normalizeMaterialName(name) {
  if (typeof name !== 'string') return 'water';
  const key = MATERIAL_ALIASES[name] || name;
  return MATERIALS[key] ? key : 'water';
}

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uWaveHeight;
  uniform float uDetail;
  uniform float uFlow;
  uniform float uChoppiness;
  uniform float uVisualScale;
  uniform vec2 uImpulseCenter;
  uniform float uImpulseAge;
  uniform float uImpulseStrength;
  uniform float uImpulseDamping;
  varying vec3 vWorldPosition;
  varying vec3 vNormalWorld;
  varying vec2 vLocalPos;
  varying float vWave;
  varying float vCrest;

  float impulseAt(vec2 p) {
    if (uImpulseAge <= 0.0 || uImpulseStrength <= 0.001) return 0.0;
    float dist = length(p - uImpulseCenter);
    float wave = sin(dist * 7.5 - uImpulseAge * 9.0);
    float env = exp(-dist * 0.85 - uImpulseAge * uImpulseDamping);
    return wave * env * uImpulseStrength * 0.14;
  }

  float waveAt(vec2 p) {
    float t = uTime * uFlow;
    float a = sin(p.x * 0.42 + t * 1.1) * 0.42;
    float b = sin(p.y * 0.31 - t * 0.72 + p.x * 0.16) * 0.28;
    float c = sin((p.x + p.y) * 0.77 + t * 1.65) * 0.16 * uDetail;
    float d = sin((p.x * 1.7 - p.y * 1.15) + t * 2.2) * 0.08 * uDetail;
    float chop = sin(p.x * 1.35 + p.y * .55 + t * 2.8) * 0.045 * uDetail;
    return (a + b + c + d + chop) * uWaveHeight * uVisualScale + impulseAt(p);
  }

  void main() {
    vec3 p = position;
    vLocalPos = p.xy;
    float eps = 0.055;
    float h = waveAt(p.xy);
    float dx = (waveAt(p.xy + vec2(eps, 0.0)) - waveAt(p.xy - vec2(eps, 0.0))) / (2.0 * eps);
    float dy = (waveAt(p.xy + vec2(0.0, eps)) - waveAt(p.xy - vec2(0.0, eps))) / (2.0 * eps);
    p.z += h;
    p.x += dx * uChoppiness * 0.035;
    p.y += dy * uChoppiness * 0.035;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorldPosition = world.xyz;
    vWave = h;
    vCrest = smoothstep(0.08, 0.28, abs(h)) * uDetail;
    vNormalWorld = normalize(mat3(modelMatrix) * normalize(vec3(-dx, -dy, 1.0)));
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uSurfaceColor;
  uniform vec3 uDeepColor;
  uniform vec3 uFoamColor;
  uniform vec3 uLightColor;
  uniform float uRoughness;
  uniform float uOpacity;
  uniform float uDepth;
  uniform float uMaterialType;
  uniform float uDiscRadius;
  varying vec3 vWorldPosition;
  varying vec3 vNormalWorld;
  varying vec2 vLocalPos;
  varying float vWave;
  varying float vCrest;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    if (uDiscRadius > 0.0 && length(vLocalPos) > uDiscRadius) discard;
    vec2 p = vWorldPosition.xz;
    float small = noise(p * 5.0 + vec2(uTime * .23, -uTime * .17));
    float fine = noise(p * 17.0 - vec2(uTime * .35, uTime * .24));
    float micro = (small - .5) * .075 + (fine - .5) * .025;
    if (uMaterialType > 4.5 && uMaterialType < 5.5) {
      float roil = noise(p * 12.0 + vec2(uTime * 1.4, -uTime * 1.1));
      micro += (roil - 0.5) * 0.16;
    }
    vec3 n = normalize(vNormalWorld + vec3(micro, 0.0, micro * .7));
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 lightDir = normalize(vec3(-.61, .57, -.55));
    float facing = clamp(dot(n, viewDir), 0.0, 1.0);
    float fresnel = .035 + .965 * pow(1.0 - facing, 5.0);
    float diffuse = max(dot(n, lightDir), 0.0);
    vec3 reflected = reflect(-viewDir, n);
    vec3 sky = mix(vec3(.23, .39, .52), vec3(.78, .88, .91), smoothstep(-.1, .75, reflected.y));
    float softbox = exp(-pow((dot(reflected, lightDir) - .88) * 8.0, 2.0));
    sky += vec3(.56, .62, .64) * softbox;
    float sun = pow(max(dot(reflected, lightDir), 0.0), mix(28.0, 220.0, 1.0 - uRoughness));
    vec3 color;
    if (uMaterialType < .5) {
      // Water: dark transmitted body, sky reflection at grazing angles, sharp sun glints.
      vec3 body = mix(uDeepColor, uSurfaceColor, .22 + .34 * diffuse + .12 * small);
      color = mix(body, sky, fresnel * .88);
      color += vec3(1.0, .94, .79) * sun * .9;
      float foam = smoothstep(.16, .32, vWave) * smoothstep(.54, .86, small) * .25;
      color = mix(color, uFoamColor, foam);
    } else if (uMaterialType < 1.5) {
      // Lava: a dark cooling skin with irregular, luminous molten seams.
      float crust = noise(p * .95 + vec2(uTime * .055, 0.0) + noise(p * .3) * .8);
      float cracks = 1.0 - smoothstep(.025, .085, abs(crust - .48));
      float heat = max(cracks * (.6 + .4 * small), smoothstep(.18, .33, vWave) * .32);
      color = mix(uDeepColor * (1.25 + .35 * small), uSurfaceColor * 1.7 + uFoamColor * .35, heat);
      color += vec3(.12, .025, .005) * diffuse;
    } else if (uMaterialType < 2.5) {
      // Honey: amber absorption in troughs and broad viscous highlights.
      vec3 amber = mix(uDeepColor, uSurfaceColor, .48 + .22 * vWave + .20 * small + .12 * diffuse);
      color = mix(amber, vec3(1.0, .77, .31), fresnel * .46);
      color += vec3(1.0, .83, .50) * (sun * .68 + softbox * .24);
    } else if (uMaterialType < 3.5) {
      // Oil: almost black body with low-angle sky reflection and thin-film color.
      vec3 body = mix(uDeepColor, uSurfaceColor, .12 + .12 * diffuse);
      color = mix(body, sky * .72, fresnel * .94);
      float film = dot(reflected, lightDir) * 10.0 + small * 2.0;
      color += (vec3(.06, .13, .19) + vec3(.11, .035, .12) * sin(film)) * fresnel;
      color += vec3(.9, .94, 1.0) * sun * .75;
    } else if (uMaterialType < 4.5) {
      // Cold water (2°C): crisp icy cyan-blue body, sharp frost specular, crystal shimmer.
      vec3 body = mix(uDeepColor, uSurfaceColor, .25 + .30 * diffuse + .14 * small);
      vec3 coldSky = mix(vec3(.28, .48, .66), vec3(.86, .95, 1.0), smoothstep(-.1, .75, reflected.y));
      color = mix(body, coldSky, fresnel * .90);
      float glint = pow(fine, 4.0) * 0.25;
      color += vec3(.88, .97, 1.0) * (sun * 1.05 + glint);
    } else if (uMaterialType < 5.5) {
      // Boiling water (100°C): rapid roiling normal perturbation and bright boiling foam cells.
      float boilCell = noise(p * 11.0 + vec2(uTime * 1.35, -uTime * 1.15));
      float bubbleRing = smoothstep(0.58, 0.88, boilCell);
      vec3 body = mix(uDeepColor, uSurfaceColor, .32 + .28 * diffuse + .20 * small);
      color = mix(body, sky, fresnel * .82);
      color += vec3(1.0, .96, .88) * sun * .8;
      float foam = clamp(bubbleRing * 0.65 + smoothstep(.08, .22, abs(vWave)) * 0.45, 0.0, 0.85);
      color = mix(color, uFoamColor, foam);
    } else if (uMaterialType < 6.5) {
      // Glycerol: clear refractive emerald-aqua tint with high-gloss syrup highlights.
      vec3 syrup = mix(uDeepColor, uSurfaceColor, .38 + .25 * diffuse + .16 * small);
      color = mix(syrup, mix(sky, vec3(.65, .98, .86), 0.35), fresnel * .62);
      color += vec3(.85, 1.0, .94) * (sun * .95 + softbox * .22);
    } else if (uMaterialType < 7.5) {
      // Silicic Magma (850°C): thick dark crimson-black crust with folding glowing fissures.
      float fold = noise(p * .68 + vec2(uTime * .018, uTime * .012) + noise(p * .24) * 1.2);
      float fissure = 1.0 - smoothstep(.018, .065, abs(fold - .5));
      float glow = clamp(fissure * (.75 + .25 * small) + smoothstep(.14, .28, vWave) * .22, 0.0, 1.0);
      vec3 darkCrust = mix(uDeepColor * 1.15, vec3(0.08, 0.025, 0.025), small * 0.6);
      vec3 hotCore = uSurfaceColor * 1.45 + uFoamColor * 0.55;
      color = mix(darkCrust, hotCore, glow);
      color += vec3(.08, .02, .015) * diffuse;
    } else {
      // Mercury: mirror-like liquid chrome reflection.
      vec3 chromeBody = mix(uDeepColor, uSurfaceColor, .45 + .40 * diffuse);
      color = mix(chromeBody, sky * 1.15, 0.72 + 0.25 * fresnel);
      color += vec3(1.0) * (sun * 1.3 + softbox * 0.35);
    }
    gl_FragColor = vec4(color, clamp(uOpacity + fresnel * .12, .08, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Open-water shading filters metre-scale ripples at distance instead of
// applying tank caustics to kilometres of sea. Geometry remains in metres.
const OCEAN_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uSurfaceColor;
  uniform vec3 uDeepColor;
  varying vec3 vWorldPosition;
  varying vec3 vNormalWorld;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 cell=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(cell),hash(cell+vec2(1.0,0.0)),f.x),
      mix(hash(cell+vec2(0.0,1.0)),hash(cell+vec2(1.0,1.0)),f.x),f.y);
  }
  float rippleHeight(vec2 p, float footprint) {
    float t=uTime;
    return noise(p*.19+vec2(t*.16,-t*.08)) * .28 * (1.0-smoothstep(3.0,12.0,footprint))
      + noise(p*.63+vec2(-t*.22,t*.09)) * .075 * (1.0-smoothstep(1.0,4.0,footprint))
      + noise(p*1.9+vec2(t*.3,t*.2)) * .015 * (1.0-smoothstep(.3,1.5,footprint));
  }
  vec2 slope(vec2 p, vec2 direction, float frequency, float speed, float weight) {
    float phase = dot(p, direction) * frequency + uTime * speed;
    float footprint = max(length(dFdx(p)), length(dFdy(p)));
    float filterWeight = 1.0 - smoothstep(0.5, 2.5, footprint * frequency);
    return direction * cos(phase) * weight * filterWeight;
  }
  void main() {
    vec2 p = vWorldPosition.xz;
    vec2 gradient = slope(p, normalize(vec2(1.0, 0.35)), .42, 1.1, .024);
    gradient += slope(p, normalize(vec2(-.6, 1.0)), .31, -.72, .019);
    gradient += slope(p, normalize(vec2(.7, .7)), .77, 1.65, .015);
    gradient += slope(p, normalize(vec2(1.7, -1.15)), 2.05, 2.2, .008);
    float footprint=max(length(dFdx(p)),length(dFdy(p)));
    const float eps=.15;
    gradient += vec2(rippleHeight(p+vec2(eps,0.0),footprint)-rippleHeight(p-vec2(eps,0.0),footprint),
      rippleHeight(p+vec2(0.0,eps),footprint)-rippleHeight(p-vec2(0.0,eps),footprint)) / (2.0*eps);
    vec3 n = normalize(vec3(-gradient.x, 1.0, -gradient.y));
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = .02 + .98 * pow(1.0 - max(dot(n, viewDir), 0.0), 5.0);
    vec3 reflected = reflect(-viewDir, n);
    vec3 sky = mix(vec3(.73,.85,.89), vec3(.30,.55,.73), clamp(reflected.y * 4.0, 0.0, 1.0));
    vec3 body = mix(uDeepColor, uSurfaceColor, .35);
    vec3 color = mix(body, sky, fresnel * .85);
    vec3 sunDir = normalize(vec3(-.35, .16, -.7));
    float specular = pow(max(dot(reflect(-sunDir, n), viewDir), 0.0), 180.0);
    color += vec3(1.0,.91,.72) * specular * .7;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function preset(name, override = {}) {
  const key = normalizeMaterialName(name);
  return { ...(MATERIALS[key] || MATERIALS.water), ...override };
}

export function createLiquidSurface(THREE, options = {}) {
  const materialName = normalizeMaterialName(options.material || 'water');
  const presetData = preset(materialName, options);
  const width = options.width || 18;
  const depth = options.depth || 18;
  const segments = Math.min(180, Math.max(24, options.segments || 112));
  const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
  const discRadius = options.discRadius ?? (options.shape === 'disc' ? (options.radius || Math.min(width, depth) * 0.5) : 0);
  const defaultWave = (materialName === 'lava' || materialName === 'magma') ? 0.18 : materialName === 'honey' ? 0.12 : materialName === 'boilingWater' ? 0.42 : 0.34;
  const defaultFlow = materialName === 'honey' ? 0.35 : materialName === 'magma' ? 0.18 : materialName === 'boilingWater' ? 1.55 : 1;
  const uniforms = {
    uTime: { value: 0 },
    uWaveHeight: { value: options.waveHeight ?? defaultWave },
    uDetail: { value: options.detail ?? 1 },
    uFlow: { value: options.flow ?? defaultFlow },
    uChoppiness: { value: options.choppiness ?? (materialName === 'water' || materialName === 'boilingWater' || materialName === 'coldWater' ? 1 : 0.35) },
    uVisualScale: { value: options.visualScale ?? 1 },
    uSurfaceColor: { value: new THREE.Color(presetData.surface) },
    uDeepColor: { value: new THREE.Color(presetData.deep) },
    uFoamColor: { value: new THREE.Color(presetData.foam) },
    uLightColor: { value: new THREE.Color(options.lightColor || 0xffffff) },
    uRoughness: { value: presetData.roughness },
    uOpacity: { value: presetData.opacity },
    uDepth: { value: options.depthTint ?? 1 },
    uMaterialType: { value: presetData.typeId ?? 0 },
    uDiscRadius: { value: discRadius },
    uImpulseCenter: { value: new THREE.Vector2(0, 0) },
    uImpulseAge: { value: 0 },
    uImpulseStrength: { value: 0 },
    uImpulseDamping: { value: presetData.damping ?? 2.0 }
  };
  const shader = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: options.openWater ? OCEAN_FRAGMENT_SHADER : FRAGMENT_SHADER,
    transparent: presetData.opacity < 1,
    side: THREE.DoubleSide,
    depthWrite: presetData.opacity >= 1,
    blending: THREE.NormalBlending
  });
  const mesh = new THREE.Mesh(geometry, shader);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = options.y || 0;

  function update(deltaSeconds = 1 / 60) {
    const dt = Math.min(0.05, Math.max(0, deltaSeconds));
    uniforms.uTime.value += dt;
    if (uniforms.uImpulseAge.value > 0) {
      uniforms.uImpulseAge.value += dt;
      if (uniforms.uImpulseAge.value > 15) {
        uniforms.uImpulseAge.value = 0;
        uniforms.uImpulseStrength.value = 0;
      }
    }
  }
  function impulse(strength = 1, x = 0, y = 0) {
    uniforms.uImpulseCenter.value.set(x, y);
    uniforms.uImpulseAge.value = 0.001;
    uniforms.uImpulseStrength.value = strength;
    return api;
  }
  function setMaterial(name, override = {}) {
    const next = preset(name, override);
    uniforms.uSurfaceColor.value.set(next.surface);
    uniforms.uDeepColor.value.set(next.deep);
    uniforms.uFoamColor.value.set(next.foam);
    uniforms.uRoughness.value = next.roughness;
    uniforms.uOpacity.value = next.opacity;
    uniforms.uMaterialType.value = next.typeId ?? 0;
    uniforms.uImpulseDamping.value = next.damping ?? 2.0;
    shader.transparent = next.opacity < 1;
    shader.depthWrite = next.opacity >= 1;
    return api;
  }
  function setQuality(quality = 'balanced') {
    const values = { low: [64, 0.8], balanced: [112, 1], high: [160, 1.25] };
    const [detail, waveScale] = values[quality] || values.balanced;
    uniforms.uDetail.value = waveScale;
    return detail;
  }
  function dispose() { geometry.dispose(); shader.dispose(); }
  const api = { mesh, geometry, material: shader, uniforms, update, impulse, setMaterial, setQuality, dispose };
  return api;
}

// Lava deposit shading for a DepthField mesh: fresh, hot material opens
// irregular glowing cracks that crawl downhill; cold deposits stop moving and
// read as dark crust. `deposit` = (depth, heat) per vertex.
const DEPOSIT_VERTEX_SHADER = `
  varying vec2 flowUV;
  varying vec2 lavaState;
  varying vec3 vWorldPos;
  attribute vec2 deposit;
  void main() {
    flowUV = uv;
    lavaState = deposit;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;

const LAVA_DEPOSIT_FRAGMENT_SHADER = `
  uniform float time;
  uniform float fluidity;
  uniform float threshold;
  uniform vec3 uSurfaceColor;
  uniform vec3 uDeepColor;
  uniform vec3 uFoamColor;
  uniform float uIsIncandescent;
  uniform float uUsePalette;
  uniform float uOpacity;
  varying vec2 flowUV;
  varying vec2 lavaState;
  varying vec3 vWorldPos;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  void main() {
    if (lavaState.x < threshold) discard;
    float heatLevel = clamp(lavaState.y, 0.0, 1.0);
    vec2 p = flowUV * 1.8;
    p.y -= time * 0.16 * max(0.25, heatLevel) * fluidity;
    float n = noise(p + noise(p * 0.45) * 2.5);
    float cracks = 1.0 - smoothstep(0.025, 0.12, abs(n - 0.5));
    float heat = heatLevel * (0.25 + cracks * 0.75);
    if (uUsePalette < 0.5) {
      vec3 crust = mix(vec3(0.012, 0.014, 0.016), vec3(0.045, 0.038, 0.035), n);
      vec3 molten = mix(vec3(0.9, 0.065, 0.005), vec3(1.8, 0.65, 0.06), heat);
      gl_FragColor = vec4(mix(crust, molten, smoothstep(0.15, 0.8, heat)), 1.0);
    } else if (uIsIncandescent > 0.5) {
      vec3 crust = mix(uDeepColor * 0.45, vec3(0.055, 0.032, 0.03), n);
      vec3 molten = mix(uSurfaceColor * 1.15, uSurfaceColor * 1.55 + uFoamColor * 0.45, heat);
      gl_FragColor = vec4(mix(crust, molten, smoothstep(0.14, 0.82, heat)), 1.0);
    } else {
      float depthFactor = clamp(lavaState.x * 2.6, 0.0, 1.0);
      float ripple = noise(flowUV * 4.5 - vec2(0.0, time * (0.3 + fluidity * 1.4)));
      float sheen = smoothstep(0.55, 0.92, ripple) * 0.32 + smoothstep(0.0, 0.06, lavaState.x) * 0.12;
      vec3 body = mix(uSurfaceColor, uDeepColor, depthFactor * 0.72);
      vec3 col = mix(body, uFoamColor, sheen);
      gl_FragColor = vec4(col, clamp(uOpacity, 0.5, 1.0));
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

// Drapes a LiquidEngine.DepthField over terrain. The mesh is `subdivisions`×
// finer than the simulation grid so it can follow the terrain's own
// tessellation (pass the same `groundAt` the terrain uses) instead of cutting
// through ridges, and only covered triangles are submitted. Call sync() after
// the field steps; update(dt) advances the shader clock.
export function createDepthFieldMesh(THREE, field, options = {}) {
  const sub = Math.max(1, Math.floor(options.subdivisions ?? 2));
  const lift = options.lift ?? 0.035;
  const threshold = options.threshold ?? 0.018;
  const cols = (field.cols - 1) * sub + 1, rows = (field.rows - 1) * sub + 1, count = cols * rows;
  const spacing = field.cellSize / sub;
  const ground = new Float32Array(count);
  const positions = new Float32Array(count * 3);
  const deposits = new Float32Array(count * 2);
  const uvs = new Float32Array(count * 2);
  for (let z = 0; z < rows; z++) for (let x = 0; x < cols; x++) {
    const i = z * cols + x;
    positions[i * 3] = field.originX + x * spacing;
    positions[i * 3 + 2] = field.originZ + z * spacing;
    uvs[i * 2] = x * spacing;
    uvs[i * 2 + 1] = z * spacing;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('deposit', new THREE.BufferAttribute(deposits, 2).setUsage(THREE.DynamicDrawUsage));
  const indices = new Uint32Array((cols - 1) * (rows - 1) * 6);
  geometry.setIndex(new THREE.BufferAttribute(indices, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setDrawRange(0, 0);
  const initFluid = options.fluid ? preset(options.fluid) : preset('lava');
  const usePalette = options.fluid ? 1.0 : 0.0;
  const isIncandescent = options.fluid ? ((normalizeMaterialName(options.fluid) === 'lava' || normalizeMaterialName(options.fluid) === 'magma') ? 1.0 : 0.0) : 1.0;
  const uniforms = {
    time: { value: 0 },
    fluidity: { value: field.fluidity },
    threshold: { value: threshold },
    uSurfaceColor: { value: new THREE.Color(initFluid.surface) },
    uDeepColor: { value: new THREE.Color(initFluid.deep) },
    uFoamColor: { value: new THREE.Color(initFluid.foam) },
    uIsIncandescent: { value: isIncandescent },
    uUsePalette: { value: usePalette },
    uOpacity: { value: initFluid.opacity ?? 0.92 }
  };
  const material = options.material || new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms,
    transparent: usePalette > 0.5 && (initFluid.opacity ?? 1) < 1,
    vertexShader: DEPOSIT_VERTEX_SHADER,
    fragmentShader: LAVA_DEPOSIT_FRAGMENT_SHADER
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;

  function setFluidPalette(name, override = {}) {
    const key = normalizeMaterialName(name);
    const next = preset(key, override);
    uniforms.uUsePalette.value = 1.0;
    uniforms.uSurfaceColor.value.set(next.surface);
    uniforms.uDeepColor.value.set(next.deep);
    uniforms.uFoamColor.value.set(next.foam);
    uniforms.uIsIncandescent.value = (key === 'lava' || key === 'magma') ? 1.0 : 0.0;
    uniforms.uOpacity.value = next.opacity ?? 0.92;
    if (!options.material) {
      material.transparent = (next.opacity ?? 1) < 1;
      material.needsUpdate = true;
    }
    return api;
  }
  function setGround(groundAt) {
    for (let i = 0; i < count; i++) ground[i] = groundAt(positions[i * 3], positions[i * 3 + 2]);
    return api;
  }
  function sync() {
    for (let z = 0; z < rows; z++) for (let x = 0; x < cols; x++) {
      const r = z * cols + x, gx = x / sub, gz = z / sub;
      const depth = field.sample(field.depth, gx, gz), energy = field.sample(field.energy, gx, gz);
      positions[r * 3 + 1] = ground[r] + lift + depth;
      deposits[r * 2] = depth;
      deposits[r * 2 + 1] = depth > 0.001 ? energy / depth : 0;
    }
    let drawCount = 0;
    for (let z = 0; z < rows - 1; z++) for (let x = 0; x < cols - 1; x++) {
      const i = z * cols + x, j = i + cols;
      if (Math.max(deposits[i * 2], deposits[(i + 1) * 2], deposits[j * 2], deposits[(j + 1) * 2]) < threshold) continue;
      indices[drawCount++] = i; indices[drawCount++] = j; indices[drawCount++] = i + 1;
      indices[drawCount++] = i + 1; indices[drawCount++] = j; indices[drawCount++] = j + 1;
    }
    geometry.setDrawRange(0, drawCount);
    geometry.index.needsUpdate = true;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.deposit.needsUpdate = true;
    mesh.visible = drawCount > 0;
    uniforms.fluidity.value = field.fluidity;
    return api;
  }
  function update(deltaSeconds = 1 / 60) { uniforms.time.value += Math.max(0, deltaSeconds); return api; }
  function dispose() { geometry.dispose(); if (!options.material) material.dispose(); }
  const api = { mesh, geometry, material, uniforms, setFluidPalette, setGround, sync, update, dispose };
  if (options.groundAt) setGround(options.groundAt);
  return api;
}

export function createUnderwaterLighting(THREE, options = {}) {
  const color = options.color || 0x2bc4e8;
  const light = new THREE.HemisphereLight(color, options.groundColor || 0x02131c, options.intensity || 1.1);
  return { light, update: () => light.intensity = options.intensity || 1.1 };
}
