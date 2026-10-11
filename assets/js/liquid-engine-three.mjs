// CGI-Water-standard renderer for LiquidEngine.
// Uses the repo-pinned Three.js bundle and keeps simulation/material state in
// LiquidEngine-compatible terms. This is a real-time approximation: layered
// waves, analytical normals, Fresnel response, depth color, foam, and caustic
// hints—not a full photon or Navier–Stokes solver.

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
    fragmentShader: FRAGMENT_SHADER,
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

export function createUnderwaterLighting(THREE, options = {}) {
  const color = options.color || 0x2bc4e8;
  const light = new THREE.HemisphereLight(color, options.groundColor || 0x02131c, options.intensity || 1.1);
  return { light, update: () => light.intensity = options.intensity || 1.1 };
}
