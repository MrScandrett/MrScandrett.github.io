// CGI-Water-standard renderer for LiquidEngine.
// Uses the repo-pinned Three.js bundle and keeps simulation/material state in
// LiquidEngine-compatible terms. This is a real-time approximation: layered
// waves, analytical normals, Fresnel response, depth color, foam, and caustic
// hints—not a full photon or Navier–Stokes solver. createDepthFieldMesh()
// renders a LiquidEngine.DepthField (lava fields) draped over terrain.

const MATERIALS = {
  water: { surface: 0x3cb9d2, deep: 0x062e58, foam: 0xd8fbff, roughness: 0.08, opacity: 0.82, glow: 0x1b8fb5 },
  lava: { surface: 0xf04a18, deep: 0x3d0804, foam: 0xffe277, roughness: 0.7, opacity: 1, glow: 0xf04a18 },
  honey: { surface: 0xd9951d, deep: 0x482007, foam: 0xffeea1, roughness: 0.28, opacity: 0.98, glow: 0xb86609 },
  oil: { surface: 0x526b78, deep: 0x081117, foam: 0xd4f3ff, roughness: 0.16, opacity: 0.94, glow: 0x203c4d }
};

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uWaveHeight;
  uniform float uDetail;
  uniform float uFlow;
  uniform float uChoppiness;
  varying vec3 vWorldPosition;
  varying vec3 vNormalWorld;
  varying float vWave;
  varying float vCrest;

  float waveAt(vec2 p) {
    float t = uTime * uFlow;
    float a = sin(p.x * 0.42 + t * 1.1) * 0.42;
    float b = sin(p.y * 0.31 - t * 0.72 + p.x * 0.16) * 0.28;
    float c = sin((p.x + p.y) * 0.77 + t * 1.65) * 0.16 * uDetail;
    float d = sin((p.x * 1.7 - p.y * 1.15) + t * 2.2) * 0.08 * uDetail;
    float chop = sin(p.x * 1.35 + p.y * .55 + t * 2.8) * 0.045 * uDetail;
    return (a + b + c + d + chop) * uWaveHeight;
  }

  void main() {
    vec3 p = position;
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
  varying vec3 vWorldPosition;
  varying vec3 vNormalWorld;
  varying float vWave;
  varying float vCrest;

  void main() {
    vec3 n = normalize(vNormalWorld);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 lightDir = normalize(vec3(-0.35, 0.86, 0.42));
    float facing = max(dot(n, viewDir), 0.0);
    float fresnel = pow(1.0 - facing, 3.0);
    float light = max(dot(n, lightDir), 0.0);
    float crest = smoothstep(0.18, 0.42, abs(vWave)) * vCrest;
    float depthMix = clamp(0.55 + light * 0.24, 0.0, 1.0);
    vec3 body = mix(uDeepColor, uSurfaceColor, depthMix);
    body = mix(body, uFoamColor, crest * 0.2);
    float streaks = smoothstep(0.7, 0.98, sin(vWorldPosition.x * 2.8 + uTime * 1.15) * 0.5 + 0.5);
    float caustic = smoothstep(0.5, 0.94, sin(vWorldPosition.x * 2.6 + uTime * 1.7) * sin(vWorldPosition.z * 2.1 - uTime * 1.25) * 0.5 + 0.5);
    vec3 color = body + uLightColor * (light * 0.2 + fresnel * 0.58 + streaks * 0.08 + caustic * 0.1);
    float alpha = clamp(uOpacity + fresnel * 0.12, 0.08, 1.0);
    gl_FragColor = vec4(color, alpha);
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
  return { ...(MATERIALS[name] || MATERIALS.water), ...override };
}

export function createLiquidSurface(THREE, options = {}) {
  const materialName = options.material || 'water';
  const presetData = preset(materialName, options);
  const width = options.width || 18;
  const depth = options.depth || 18;
  const segments = Math.min(180, Math.max(24, options.segments || 112));
  const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
  const uniforms = {
    uTime: { value: 0 },
    uWaveHeight: { value: options.waveHeight ?? (materialName === 'lava' ? 0.18 : 0.34) },
    uDetail: { value: options.detail ?? 1 },
    uFlow: { value: options.flow ?? (materialName === 'honey' ? 0.35 : 1) },
    uChoppiness: { value: options.choppiness ?? (materialName === 'water' ? 1 : 0.35) },
    uSurfaceColor: { value: new THREE.Color(presetData.surface) },
    uDeepColor: { value: new THREE.Color(presetData.deep) },
    uFoamColor: { value: new THREE.Color(presetData.foam) },
    uLightColor: { value: new THREE.Color(options.lightColor || 0xffffff) },
    uRoughness: { value: presetData.roughness },
    uOpacity: { value: presetData.opacity },
    uDepth: { value: options.depthTint ?? 1 }
  };
  const shader = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: options.openWater ? OCEAN_FRAGMENT_SHADER : FRAGMENT_SHADER,
    transparent: presetData.opacity < 1,
    side: THREE.DoubleSide,
    depthWrite: presetData.opacity >= 1,
    blending: presetData.opacity < 1 ? THREE.NormalBlending : THREE.NormalBlending
  });
  const mesh = new THREE.Mesh(geometry, shader);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = options.y || 0;

  function update(deltaSeconds = 1 / 60) {
    uniforms.uTime.value += Math.min(0.05, Math.max(0, deltaSeconds));
  }
  function setMaterial(name, override = {}) {
    const next = preset(name, override);
    uniforms.uSurfaceColor.value.set(next.surface);
    uniforms.uDeepColor.value.set(next.deep);
    uniforms.uFoamColor.value.set(next.foam);
    uniforms.uRoughness.value = next.roughness;
    uniforms.uOpacity.value = next.opacity;
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
  const api = { mesh, geometry, material: shader, uniforms, update, setMaterial, setQuality, dispose };
  return api;
}

// Lava deposit shading for a DepthField mesh: fresh, hot material opens
// irregular glowing cracks that crawl downhill; cold deposits stop moving and
// read as dark crust. `deposit` = (depth, heat) per vertex.
const DEPOSIT_VERTEX_SHADER = `
  varying vec2 flowUV;
  varying vec2 lavaState;
  attribute vec2 deposit;
  void main() {
    flowUV = uv;
    lavaState = deposit;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const LAVA_DEPOSIT_FRAGMENT_SHADER = `
  uniform float time;
  uniform float fluidity;
  uniform float threshold;
  varying vec2 flowUV;
  varying vec2 lavaState;
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
    p.y -= time * 0.16 * heatLevel * fluidity;
    float n = noise(p + noise(p * 0.45) * 2.5);
    float cracks = 1.0 - smoothstep(0.025, 0.12, abs(n - 0.5));
    float heat = heatLevel * (0.25 + cracks * 0.75);
    vec3 crust = mix(vec3(0.012, 0.014, 0.016), vec3(0.045, 0.038, 0.035), n);
    vec3 molten = mix(vec3(0.9, 0.065, 0.005), vec3(1.8, 0.65, 0.06), heat);
    gl_FragColor = vec4(mix(crust, molten, smoothstep(0.15, 0.8, heat)), 1.0);
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
  const uniforms = {
    time: { value: 0 },
    fluidity: { value: field.fluidity },
    threshold: { value: threshold }
  };
  const material = options.material || new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms,
    vertexShader: DEPOSIT_VERTEX_SHADER,
    fragmentShader: LAVA_DEPOSIT_FRAGMENT_SHADER
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;

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
  const api = { mesh, geometry, material, uniforms, setGround, sync, update, dispose };
  if (options.groundAt) setGround(options.groundAt);
  return api;
}

export function createUnderwaterLighting(THREE, options = {}) {
  const color = options.color || 0x2bc4e8;
  const light = new THREE.HemisphereLight(color, options.groundColor || 0x02131c, options.intensity || 1.1);
  return { light, update: () => light.intensity = options.intensity || 1.1 };
}
