import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import {
  PRESETS,
  MISSIONS,
  computeClimate,
  computeEnergyBudget,
  computeLocalProbe,
  evaluateMissions,
} from './climate-model.mjs';

(function () {
  'use strict';

  const { fbm } = SimKit.noise;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ══════════════════════════════════════════
     EARTH TEXTURES & SHADER
  ══════════════════════════════════════════ */
  let earthMesh, cloudMesh, atmMesh, atmUniforms, earthUniforms, auroraUniforms;
  let meltFrontVisibility = 1.0;

  // Accurate Natural Earth land is available immediately, even offline.
  function makeFallbackDayTex() {
    const cnv = EarthEngine.landCanvas(512, 256, { ocean: '#0b2e6b', land: '#3b6e38' });
    const tex = new THREE.CanvasTexture(cnv);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  // Binary land/ocean mask from Natural Earth 50m so shaders and Click-to-Probe distinguish continents from ocean
  const landMaskCanvas = EarthEngine.landCanvas(720, 360, { ocean: '#000000', land: '#ffffff' });
  const landMaskCtx = landMaskCanvas.getContext('2d', { willReadFrequently: true });
  function makeLandMaskTex() {
    const tex = new THREE.CanvasTexture(landMaskCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  function sampleIsLand(lon, lat) {
    const uv = EarthEngine.lonLatToUV(lon, lat);
    const px = clamp(Math.floor(uv.u * landMaskCanvas.width), 0, landMaskCanvas.width - 1);
    const py = clamp(Math.floor(uv.v * landMaskCanvas.height), 0, landMaskCanvas.height - 1);
    return landMaskCtx.getImageData(px, py, 1, 1).data[0] > 128;
  }

  // No invented lights when the historical NASA night composite is absent.
  function makeFallbackNightTex() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 32;
    c.getContext('2d').fillStyle = '#020408';
    c.getContext('2d').fillRect(0, 0, 64, 32);
    return new THREE.CanvasTexture(c);
  }

  // Neutral 1x1 fallback until assets/data/rayleigh-benard.png loads
  function makeNeutralRbTex() {
    const c = document.createElement('canvas'); c.width = 4; c.height = 4;
    c.getContext('2d').fillStyle = '#808080';
    c.getContext('2d').fillRect(0, 0, 4, 4);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  const cloudCanvasCache = new Map();
  function buildCloudTexture(month = 9) {
    if (cloudCanvasCache.has(month)) return cloudCanvasCache.get(month);
    const W = 512, H = 256;
    const cnv = document.createElement('canvas');
    cnv.width = W; cnv.height = H;
    const ctx = cnv.getContext('2d');
    const img = ctx.createImageData(W, H);
    const d = img.data;
    for (let py = 0; py < H; py++) {
      const ny = py / H;
      const lat = (0.5 - ny) * 180;
      const absLat = Math.abs(lat);
      const itczCenter = 7 * Math.sin((month - 3) * Math.PI / 6);
      const itcz       = Math.exp(-Math.pow((lat - itczCenter) / 7.5, 2)) * 0.42;
      const stormTrack = Math.exp(-Math.pow((absLat - 50) / 11, 2)) * 0.34;
      const polarFront = Math.exp(-Math.pow((absLat - 67) /  7, 2)) * 0.22;
      const dryBelt    = Math.exp(-Math.pow((absLat - 26) /  7, 2)) * 0.32;
      const latBias = (itcz + stormTrack + polarFront) * (1 - dryBelt) + 0.04;
      const zonalShear = Math.sin(lat * Math.PI / 60) * 0.08;
      for (let px = 0; px < W; px++) {
        const nx = px / W;
        const theta = (nx + zonalShear) * Math.PI * 2;
        const cx = Math.cos(theta);
        const sx = Math.sin(theta);
        const v = fbm(cx * 2.3 + 120, sx * 2.3 + ny * 3.6 + 240, 5);
        const detail = fbm(cx * 5.2 + 310, sx * 5.2 - ny * 7.5 + 410, 3) * 0.15;
        const alpha = clamp((v + detail - 0.50 + latBias * 0.22) / 0.22 * (0.68 + latBias * 0.65), 0, 1);
        const lum = Math.round(alpha * 255);
        const idx = (py * W + px) * 4;
        d[idx] = lum; d[idx + 1] = lum; d[idx + 2] = lum; d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    cloudCanvasCache.set(month, cnv);
    return cnv;
  }

  /* ══════════════════════════════════════════
     THREE.JS SCENE
  ══════════════════════════════════════════ */
  const canvas = document.getElementById('earth-canvas');
  const globe = document.getElementById('globe-outer');

  const { renderer, scene, camera, syncSize } = createScene(canvas, {
    THREE, fov: 42, near: 0.1, far: 1000, maxDpr: 2, antialias: true, alpha: true
  });
  const camDist = 5.2;
  camera.position.set(0, 1.05, camDist);
  camera.lookAt(0, 0, 0);

  // Stars — multiple groups with varying sizes and warm/cool color tints
  (function () {
    const groups = [
      { count: 2200, size: 0.13, color: 0xffffff, opacity: 0.80 },
      { count: 700,  size: 0.24, color: 0xfff8e8, opacity: 0.65 },
      { count: 400,  size: 0.09, color: 0xaad0ff, opacity: 0.55 },
      { count: 200,  size: 0.32, color: 0xffe0a0, opacity: 0.50 },
    ];
    groups.forEach(({ count, size, color, opacity }) => {
      const geo = new THREE.BufferGeometry();
      const verts = [];
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 90 + Math.random() * 30;
        verts.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity })));
    });
  })();

  // Lighting
  const sunLight = new THREE.DirectionalLight(0xfff5e8, 1.4);
  sunLight.position.set(5, 2, 4);
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x1a2850, 0.6));
  const fillLight = new THREE.DirectionalLight(0x4466cc, 0.25);
  fillLight.position.set(-4, -1, -3);
  scene.add(fillLight);

  // Earth — GPU ShaderMaterial with landMask, ocean sun-glint, Rayleigh-Bénard convection,
  // polar/land amplified GISTEMP anomaly heat map, uniformLit mode, and distinct sea/continental ice
  const earthGeo = new THREE.SphereGeometry(2, 64, 32);
  earthUniforms = {
    dayMap:       { value: makeFallbackDayTex() },
    nightMap:     { value: makeFallbackNightTex() },
    landMask:     { value: makeLandMaskTex() },
    rbMap:        { value: makeNeutralRbTex() },
    hasRb:        { value: 0.0 },
    uTime:        { value: 0.0 },
    sunDir:       { value: new THREE.Vector3(5, 2, 4).normalize() },
    sunIntensity: { value: 0.88 },
    sunColor:     { value: new THREE.Color(1.0, 0.96, 0.91) },
    iceLevel:     { value: 0.60 },
    tempAnomaly:  { value: 1.34 },
    deforest:     { value: 0.30 },
    oceanHeat:    { value: 0.70 },
    heatMap:      { value: 0.0 },
    uniformLit:   { value: 0.0 },
  };
  const earthMat = new THREE.ShaderMaterial({
    uniforms: earthUniforms,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      precision mediump float;
      uniform sampler2D dayMap;
      uniform sampler2D nightMap;
      uniform sampler2D landMask;
      uniform sampler2D rbMap;
      uniform float hasRb;
      uniform float uTime;
      uniform vec3  sunDir;
      uniform float sunIntensity;
      uniform vec3  sunColor;
      uniform float iceLevel;
      uniform float tempAnomaly;
      uniform float deforest;
      uniform float oceanHeat;
      uniform float heatMap;
      uniform float uniformLit;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;

      // Diverging NASA GISTEMP temperature anomaly palette (-2°C .. +6°C)
      vec3 gistempColor(float degC) {
        float x = clamp((degC + 2.0) / 8.0, 0.0, 1.0); // 0.25 = 0°C
        vec3 cCold2 = vec3(0.17, 0.51, 0.73); // -2°C deep cool blue
        vec3 cCold1 = vec3(0.50, 0.80, 0.76); // -0.8°C cyan
        vec3 cZero  = vec3(0.95, 0.96, 0.96); //  0.0°C neutral white
        vec3 cWarm1 = vec3(0.99, 0.86, 0.48); // +1.2°C warm yellow-amber
        vec3 cWarm2 = vec3(0.96, 0.43, 0.26); // +2.8°C orange-red
        vec3 cHot1  = vec3(0.72, 0.09, 0.17); // +4.5°C crimson
        vec3 cHot2  = vec3(0.45, 0.00, 0.16); // +6.0°C deep maroon
        if (x < 0.15) return mix(cCold2, cCold1, x / 0.15);
        if (x < 0.25) return mix(cCold1, cZero,  (x - 0.15) / 0.10);
        if (x < 0.42) return mix(cZero,  cWarm1, (x - 0.25) / 0.17);
        if (x < 0.62) return mix(cWarm1, cWarm2, (x - 0.42) / 0.20);
        if (x < 0.82) return mix(cWarm2, cHot1,  (x - 0.62) / 0.20);
        return mix(cHot1, cHot2, (x - 0.82) / 0.18);
      }

      void main() {
        vec3  norm   = normalize(vWorldNormal);
        vec3  viewDir= normalize(cameraPosition - vWorldPos);
        float sunDot = dot(norm, sunDir);
        float dayMix = mix(smoothstep(-0.16, 0.22, sunDot), 1.0, uniformLit);

        vec4  dayTex   = texture2D(dayMap,   vUv);
        vec4  nightTex = texture2D(nightMap, vUv);
        float land     = texture2D(landMask, vUv).r; // 1.0 = continent, 0.0 = ocean

        // Rayleigh-Bénard convection cells (The Well) over ocean
        vec2  rbUv1 = vec2(vUv.x * 2.5 + uTime * 0.003, vUv.y * 1.5 - uTime * 0.0015);
        vec2  rbUv2 = vec2(vUv.x * 4.0 - uTime * 0.002, vUv.y * 2.5 + uTime * 0.002);
        float rbSample = mix(texture2D(rbMap, rbUv1).r, texture2D(rbMap, rbUv2).r, 0.35);
        float rbActive = hasRb * (1.0 - land) * clamp((max(0.0, tempAnomaly) * 0.16 + oceanHeat * 0.25), 0.0, 0.75);

        // Ocean thermal tint & RB convection cell structure on day texture
        vec3 dayRgb = dayTex.rgb;
        if (land < 0.45) {
          float convShift = (rbSample - 0.5) * rbActive * 0.22;
          float warmSea   = clamp(tempAnomaly / 5.5, -0.3, 1.0) * (1.0 - abs(vUv.y * 2.0 - 1.0) * 0.65);
          dayRgb.r = clamp(dayRgb.r + warmSea * 0.04 + convShift * 0.4, 0.0, 1.0);
          dayRgb.g = clamp(dayRgb.g + warmSea * 0.03 + convShift * 0.7, 0.0, 1.0);
          dayRgb.b = clamp(dayRgb.b - warmSea * 0.03 + convShift * 0.9, 0.0, 1.0);
        }

        // Deforestation & heat-drought dieback — strictly on LAND (never turns oceans brown)
        float latNorm    = vUv.y * 2.0 - 1.0; // -1 south pole .. +1 north pole
        float pole       = abs(latNorm);
        float vegBelt    = smoothstep(0.72, 0.15, pole); // tropical & temperate forests
        float heatStress = clamp(max(0.0, tempAnomaly - 0.8) / 4.5, 0.0, 1.0);
        float greenness  = clamp((dayRgb.g - dayRgb.r * 0.65) * 3.0, 0.25, 1.0);
        float dfShift    = land * vegBelt * greenness * clamp(deforest * 0.85 + heatStress * 0.40, 0.0, 1.0) * 0.42;
        dayRgb.r = min(1.0, dayRgb.r + dfShift * 0.58);
        dayRgb.g = max(0.0, dayRgb.g - dfShift * 0.30);
        dayRgb.b = max(0.0, dayRgb.b - dfShift * 0.22);

        // Lambertian diffuse + twilight terminator warm Rayleigh scatter
        float NdotL      = max(0.0, sunDot);
        float shadeBase  = clamp(NdotL * sunIntensity + 0.09, 0.0, 1.0);
        float shadeFlat  = clamp(0.76 + NdotL * 0.24 * sunIntensity, 0.68, 1.0);
        float shade      = mix(shadeBase, shadeFlat, uniformLit);
        float termArg    = (sunDot - 0.02) / 0.14;
        float terminator = exp(-(termArg * termArg)) * 0.16 * (1.0 - uniformLit);
        vec3  twilightCol= vec3(1.0, 0.52, 0.22) * terminator * sunIntensity;

        // Cryosphere: Continental ice sheets vs. Polar sea-ice pack with coastline/fracture detail
        float lonRad     = vUv.x * 6.2831853;
        float waveMod    = (sin(lonRad * 5.0 + 1.2) * 0.022 + cos(lonRad * 11.0 - 0.7) * 0.014 + sin(lonRad * 23.0) * 0.008);
        float landIceBias= land * 0.045;
        float iceLatDeg  = 75.0 - iceLevel * 25.0 + tempAnomaly * 3.5;
        float iceEdge    = clamp(iceLatDeg / 90.0 - landIceBias + waveMod, 0.05, 0.985);
        float iceMask    = smoothstep(iceEdge - 0.055, iceEdge + 0.035, pole);
        float packLeads  = (1.0 - land) * smoothstep(iceEdge + 0.06, iceEdge - 0.02, pole) * (0.85 + 0.15 * sin(lonRad * 31.0 + pole * 40.0));
        float finalIce   = clamp(iceMask * mix(1.0, packLeads, 0.35), 0.0, 1.0);

        // Ocean specular sun-glint (only on open liquid water, never on continents or sea ice)
        vec3  halfVec    = normalize(sunDir + viewDir);
        float NdotH      = clamp(dot(norm, halfVec), 0.0, 1.0);
        float NdotV      = clamp(dot(norm, viewDir), 0.0, 1.0);
        float fresnel    = 0.04 + 0.96 * pow(1.0 - NdotV, 4.0);
        float specGlint  = pow(NdotH, 48.0) * (0.28 + 0.45 * fresnel) * (1.0 - land) * (1.0 - finalIce) * smoothstep(-0.02, 0.25, sunDot);
        vec3  glintCol   = sunColor * specGlint * sunIntensity * 0.65;

        vec3  litDay     = dayRgb * sunColor * shade + twilightCol + glintCol;
        vec3  litNight   = nightTex.rgb * (1.15 * (1.0 - finalIce * 0.85)) + dayRgb * 0.035;
        vec3  baseRgb    = mix(litNight, litDay, dayMix);

        // Apply polar ice albedo across both day and night hemispheres
        float iceLit     = mix(clamp(NdotL * sunIntensity * 1.06 + 0.12, 0.08, 1.0), 0.95, uniformLit);
        vec3  iceTint    = mix(vec3(0.83, 0.92, 1.0), vec3(0.95, 0.98, 1.0), land);
        vec3  iceCol     = iceTint * iceLit;
        baseRgb          = mix(baseRgb, iceCol, finalIce);

        // Heat Map mode — NASA GISTEMP diverging anomaly scale with Arctic & Continental Amplification
        if (heatMap > 0.5) {
          float northPolar = smoothstep(0.35, 0.92, latNorm) * 1.05;
          float southPolar = smoothstep(0.45, 0.92, -latNorm) * 0.55;
          float polarAmp   = 0.82 + northPolar + southPolar;
          float landAmp    = mix(0.88, 1.24, land);
          float spatialMod = 1.0 + 0.10 * sin(lonRad * 3.0 + latNorm * 4.0) + (rbSample - 0.5) * rbActive * 0.35;
          float localDegC  = tempAnomaly * polarAmp * landAmp * spatialMod;

          vec3  anomCol    = gistempColor(localDegC);
          float anomWeight = clamp(abs(localDegC) / 3.2, 0.18, 0.78);
          float lum        = dot(baseRgb, vec3(0.299, 0.587, 0.114));
          vec3  shadedAnom = anomCol * (0.42 + 0.68 * clamp(lum + 0.18, 0.0, 1.0));
          baseRgb          = mix(baseRgb, shadedAnom, anomWeight);
        }

        gl_FragColor = vec4(clamp(baseRgb, 0.0, 1.0), 1.0);
      }
    `,
  });
  earthMesh = new THREE.Mesh(earthGeo, earthMat);
  scene.add(earthMesh);

  // Load NASA textures & Rayleigh-Bénard convection dataset (non-blocking)
  const texLoader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  texLoader.load('../../assets/textures/earth/blue-marble.jpg',
    tex => {
      tex.anisotropy = maxAniso;
      tex.wrapS = THREE.RepeatWrapping;
      earthUniforms.dayMap.value = tex;
    }, undefined, () => {}
  );
  texLoader.load('../../assets/textures/earth/black-marble.jpg',
    tex => {
      tex.anisotropy = maxAniso;
      tex.wrapS = THREE.RepeatWrapping;
      earthUniforms.nightMap.value = tex;
    }, undefined, () => {}
  );
  texLoader.load('../../assets/data/rayleigh-benard.png',
    tex => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      earthUniforms.rbMap.value = tex;
      earthUniforms.hasRb.value = 1.0;
      const badge = document.getElementById('rb-badge');
      if (badge) badge.style.display = 'block';
    }, undefined, () => {}
  );

  // Clouds — aligned with Earth's rotational axis
  const cloudGeo = new THREE.SphereGeometry(2.026, 64, 32);
  const cloudTex = new THREE.CanvasTexture(buildCloudTexture(9));
  cloudTex.wrapS = THREE.RepeatWrapping;
  const cloudMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    alphaMap: cloudTex,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  scene.add(cloudMesh);

  // CloudEngine billows painted into a transparent satellite-style storm atlas.
  const stormCanvas = document.createElement('canvas');
  stormCanvas.width = 2048;
  stormCanvas.height = 1024;
  const stormTexture = new THREE.CanvasTexture(stormCanvas);
  stormTexture.wrapS = THREE.RepeatWrapping;
  stormTexture.minFilter = THREE.LinearMipmapLinearFilter;
  const stormMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.041, 64, 32),
    new THREE.MeshPhongMaterial({ map: stormTexture, transparent: true, opacity: 0.94, depthWrite: false })
  );
  scene.add(stormMesh);

  function paintStormAtlas() {
    const ctx = stormCanvas.getContext('2d');
    const W = stormCanvas.width, H = stormCanvas.height;
    ctx.clearRect(0, 0, W, H);
    const body = CloudEngine.getSprite('cumulus_body');
    const highlight = CloudEngine.getSprite('cumulus_highlight');
    const shadow = CloudEngine.getSprite('cumulus_shadow');
    const drawPuff = (sprite, x, y, size, alpha) => {
      ctx.globalAlpha = alpha;
      for (const offset of [-W, 0, W]) {
        if (x + offset > -size && x + offset < W + size) {
          ctx.drawImage(sprite, x + offset - size / 2, y - size / 2, size, size);
        }
      }
    };
    weather.basins.forEach((basin, index) => {
      const uv = EarthEngine.lonLatToUV(basin.lon, basin.lat);
      const cx = uv.u * W, cy = uv.v * H;
      const radius = 56 + basin.season * 12;
      const spin = basin.hemisphere === 'north' ? -1 : 1;
      const phase = index * 1.73 + 0.4;
      for (let arm = 0; arm < 3; arm++) {
        for (let step = 0; step < 63; step++) {
          const t = step / 62;
          const theta = phase + arm * Math.PI * 2 / 3 + spin * t * Math.PI * 2.0;
          const r = 9 + t * radius;
          const wobble = 2.7 * Math.sin(step * 1.37 + arm * 2.9 + index);
          const x = cx + (r + wobble) * Math.cos(theta);
          const y = cy + (r + wobble) * Math.sin(theta);
          const width = 14 + 10 * t + 3 * Math.sin(step * 0.71 + arm);
          const opacity = (0.50 + 0.28 * Math.sin(Math.PI * t)) * basin.season;
          drawPuff(shadow, x + 2, y + 3, width * 1.48, opacity * 0.52);
          drawPuff(body, x, y, width, opacity);
          if (step % 3 === 0) drawPuff(highlight, x - 2, y - 2, width * 0.75, opacity * 0.42);
        }
      }
      for (let i = 0; i < 34; i++) {
        const a = i * Math.PI * 2 / 34;
        drawPuff(body, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 16, 0.87 * basin.season);
        if (i % 2 === 0) drawPuff(highlight, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 11, 0.42 * basin.season);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 0.94 * basin.season;
      ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    stormTexture.needsUpdate = true;
  }

  // Atmosphere — Rayleigh limb-glow + solar forward-scattering phase function
  const atmGeo = new THREE.SphereGeometry(2.155, 64, 32);
  atmUniforms = {
    atmColor:    { value: new THREE.Color(0x2870ff) },
    sunDir:      { value: new THREE.Vector3(5, 2, 4).normalize() },
    rimStrength: { value: 0.74 },
    uniformLit:  { value: 0.0 },
  };
  const atmMat = new THREE.ShaderMaterial({
    uniforms: atmUniforms,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vWorldNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3  atmColor;
      uniform vec3  sunDir;
      uniform float rimStrength;
      uniform float uniformLit;
      varying vec3  vNormal;
      varying vec3  vViewDir;
      varying vec3  vWorldNormal;
      void main() {
        float rim = 1.0 - abs(dot(vNormal, vViewDir));
        rim = pow(clamp(rim, 0.0, 1.0), 3.0);
        float sDot = dot(vWorldNormal, sunDir);
        float sunFacing = mix(smoothstep(-0.35, 0.65, sDot), 1.0, uniformLit);
        float twArg = sDot / 0.25;
        float twilight  = exp(-(twArg * twArg)) * 0.35 * (1.0 - uniformLit);
        vec3  col = mix(atmColor * 0.35, atmColor, sunFacing) + vec3(1.0, 0.45, 0.15) * twilight;
        gl_FragColor = vec4(col * rimStrength, rim * (0.45 + 0.55 * sunFacing));
      }
    `,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  atmMesh = new THREE.Mesh(atmGeo, atmMat);
  scene.add(atmMesh);

  // Polar Auroral Curtains — vertical ribbon cylinders around ~67° geomagnetic ovals
  auroraUniforms = {
    uTime:     { value: 0.0 },
    intensity: { value: 0.35 },
  };
  function makeAuroraCurtain(isNorth) {
    const rTop = isNorth ? 0.76 : 0.82;
    const rBot = isNorth ? 0.82 : 0.76;
    const geo = new THREE.CylinderGeometry(rTop, rBot, 0.22, 96, 1, true);
    const mat = new THREE.ShaderMaterial({
      uniforms: auroraUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform float uTime;
        uniform float intensity;
        varying vec2 vUv;
        void main() {
          float angle = vUv.x * 6.2831853;
          float rays  = 0.5 + 0.5 * sin(angle * 18.0 + uTime * 1.4 + sin(angle * 5.0 - uTime * 0.7) * 2.5);
          rays *= 0.5 + 0.5 * sin(angle * 31.0 - uTime * 2.1);
          float vert  = smoothstep(0.0, 0.22, vUv.y) * pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.5);
          vec3  lowCol  = vec3(0.10, 1.00, 0.55);
          vec3  highCol = vec3(0.55, 0.25, 0.95);
          vec3  col     = mix(lowCol, highCol, clamp(vUv.y * 1.15, 0.0, 1.0));
          float alpha   = rays * vert * intensity;
          gl_FragColor  = vec4(col, clamp(alpha, 0.0, 0.85));
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, isNorth ? 1.92 : -1.92, 0);
    mesh.rotation.z = isNorth ? 0.06 : -0.06;
    scene.add(mesh);
    return mesh;
  }
  makeAuroraCurtain(true);
  makeAuroraCurtain(false);

  // Ice melt-front — thin pulsing ring at each hemisphere's mean ice edge latitude
  const meltFrontGeo = new THREE.TorusGeometry(1, 0.007, 6, 80);
  const meltFrontNorth = new THREE.Mesh(meltFrontGeo, new THREE.MeshBasicMaterial({
    color: 0xcdeaff, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  meltFrontNorth.rotation.x = Math.PI / 2;
  scene.add(meltFrontNorth);
  const meltFrontSouth = new THREE.Mesh(meltFrontGeo, meltFrontNorth.material.clone());
  meltFrontSouth.rotation.x = Math.PI / 2;
  scene.add(meltFrontSouth);

  function updateMeltFront(iceLevel01, tempAnomaly) {
    const iceLatDeg = clamp(75 - iceLevel01 * 25 + tempAnomaly * 3.5, 5, 89);
    meltFrontVisibility = clamp((88 - iceLatDeg) / 6, 0, 1);
    const latRad = iceLatDeg * Math.PI / 180;
    const ringR = 2.008 * Math.cos(latRad);
    const y = 2.008 * Math.sin(latRad);
    meltFrontNorth.scale.set(ringR, ringR, 1);
    meltFrontNorth.position.y = y;
    meltFrontSouth.scale.set(ringR, ringR, 1);
    meltFrontSouth.position.y = -y;
    meltFrontNorth.visible = meltFrontVisibility > 0.02;
    meltFrontSouth.visible = meltFrontVisibility > 0.02;
  }

  // Sun glow — radial gradient sprite positioned along seasonal solar declination
  const sunSprite = (function () {
    const cnv = document.createElement('canvas');
    cnv.width = 64; cnv.height = 64;
    const ctx2d = cnv.getContext('2d');
    const grad = ctx2d.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0,   'rgba(255,245,190,1)');
    grad.addColorStop(0.2, 'rgba(255,210,90,0.7)');
    grad.addColorStop(0.6, 'rgba(255,150,25,0.2)');
    grad.addColorStop(1,   'rgba(255,100,0,0)');
    ctx2d.fillStyle = grad;
    ctx2d.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cnv);
    const mat = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(7, 7, 1);
    scene.add(sprite);
    return sprite;
  })();

  function updateSolarDeclination(monthNum) {
    // 23.44° axial tilt: ~+23.4° in June (month 6), ~-23.4° in December (month 12)
    const declRad = (23.44 * Math.PI / 180) * Math.sin((monthNum - 3) * Math.PI / 6);
    const sunVec = new THREE.Vector3(
      Math.cos(declRad) * 0.78,
      Math.sin(declRad),
      Math.cos(declRad) * 0.62
    ).normalize();
    sunLight.position.copy(sunVec).multiplyScalar(8);
    earthUniforms.sunDir.value.copy(sunVec);
    atmUniforms.sunDir.value.copy(sunVec);
    sunSprite.position.copy(sunVec).multiplyScalar(88);
  }
  updateSolarDeclination(9);

  /* ══════════════════════════════════════════
     ORBIT CONTROLS & CAMERA PRESETS
  ══════════════════════════════════════════ */
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 2.6;
  controls.maxDistance = 10;
  controls.minPolarAngle = 0.28;
  controls.maxPolarAngle = Math.PI - 0.28;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;
  controls.target.set(0, 0, 0);

  let camAnim = null;
  const CAM_PRESETS = {
    global:     { lat: 12,  dist: 5.2 },
    arctic:     { lat: 74,  dist: 4.3 },
    tropics:    { lat: 4,   dist: 4.6 },
    antarctica: { lat: -74, dist: 4.3 },
  };
  controls.addEventListener('start', () => { camAnim = null; });

  function animateCameraTo(presetKey) {
    const cfg = CAM_PRESETS[presetKey];
    if (!cfg) return;
    const curSph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const targetPhi = clamp((90 - cfg.lat) * Math.PI / 180, controls.minPolarAngle, controls.maxPolarAngle);
    camAnim = {
      startPhi: curSph.phi,
      startDist: curSph.radius,
      targetPhi,
      targetDist: cfg.dist,
      progress: 0,
      duration: 0.55,
    };
    document.querySelectorAll('[data-cam]').forEach(b => {
      b.classList.toggle('active', b.dataset.cam === presetKey);
    });
  }

  canvas.addEventListener('keydown', e => {
    const rotateStep = 0.12, zoomStep = 0.4;
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    let handled = true;
    switch (e.key) {
      case 'ArrowLeft':  spherical.theta -= rotateStep; break;
      case 'ArrowRight': spherical.theta += rotateStep; break;
      case 'ArrowUp':    spherical.phi = clamp(spherical.phi - rotateStep, controls.minPolarAngle, controls.maxPolarAngle); break;
      case 'ArrowDown':  spherical.phi = clamp(spherical.phi + rotateStep, controls.minPolarAngle, controls.maxPolarAngle); break;
      case '+': case '=': spherical.radius = clamp(spherical.radius - zoomStep, controls.minDistance, controls.maxDistance); break;
      case '-': case '_': spherical.radius = clamp(spherical.radius + zoomStep, controls.minDistance, controls.maxDistance); break;
      default: handled = false;
    }
    if (!handled) return;
    e.preventDefault();
    camAnim = null;
    spherical.makeSafe();
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  });

  /* ══════════════════════════════════════════
     SVG PARTICLE & PROBE SYSTEM
  ══════════════════════════════════════════ */
  const pRoot = document.getElementById('particle-root');
  const probeRoot = document.getElementById('probe-root');
  const svg = document.getElementById('particle-svg');
  let svgW = Math.max(1, globe.clientWidth || 800);
  let svgH = Math.max(1, globe.clientHeight || 600);
  let mode = 'weather';
  let showLabels = true;
  let persistentParticles = [];
  let transientParticles = [];
  let activeProbe = null; // { lat, lon, isLand, el }

  const geoPoints = {
    industry: [
      { lat: 35, lon: 115, label: 'East Asia' },
      { lat: 40, lon: -84, label: 'N. America' },
      { lat: 51, lon:   9, label: 'Europe' },
      { lat: 22, lon:  79, label: 'South Asia' },
      { lat: -23, lon: -46, label: 'S. America' },
      { lat: -26, lon:  28, label: 'S. Africa' },
    ],
    permafrost: [
      { lat: 67, lon:  88, label: 'Siberian Tundra' },
      { lat: 68, lon: -133, label: 'Mackenzie Delta' },
      { lat: 64, lon: 152, label: 'Kolyma Basin' },
    ],
    sinks: [
      { lat: -4, lon: -62, kind: 'forest', label: 'Amazon Sink' },
      { lat:  1, lon:  22, kind: 'forest', label: 'Congo Sink' },
      { lat: 58, lon:  98, kind: 'forest', label: 'Boreal Taiga' },
      { lat: -1, lon: 114, kind: 'forest', label: 'SE Asia' },
      { lat: 54, lon: -32, kind: 'ocean',  label: 'N. Atlantic' },
      { lat: -52, lon:  20, kind: 'ocean', label: 'Southern Ocean' },
    ],
    currents: [
      { lat: 34, lon: -66, dLat: 10, dLon: 22, name: 'Gulf Stream' },
      { lat: 30, lon: 142, dLat:  8, dLon: 24, name: 'Kuroshio' },
      { lat:  8, lon: -135, dLat: 0, dLon: -26, name: 'Trade Drift' },
      { lat: -12, lon:  75, dLat: -2, dLon: -24, name: 'S. Equatorial' },
      { lat: -54, lon: -45, dLat:  0, dLon: 28, name: 'Circumpolar' },
    ],
    heat: [
      { lat: 74, lon:  40, polar: true,  label: 'Barents-Kara' },
      { lat: 72, lon: -110, polar: true, label: 'Can. Arctic' },
      { lat: 24, lon:  46, polar: false, label: 'Arabia' },
      { lat: -4, lon: -58, polar: false, label: 'Amazonia' },
      { lat: 15, lon:  20, polar: false, label: 'Sahel' },
      { lat: -25, lon: 134, polar: false, label: 'Australia' },
    ]
  };

  function geoToSVG(lat, lon) {
    const position = EarthEngine.lonLatToVector(lon, lat, 2);
    const vec = new THREE.Vector3(position.x, position.y, position.z);
    earthMesh.updateMatrixWorld();
    vec.applyMatrix4(earthMesh.matrixWorld);

    const camDir = camera.position.clone().normalize();
    const surfNorm = vec.clone().normalize();
    const facing = surfNorm.dot(camDir);
    if (facing < 0.08) return null;

    vec.project(camera);
    return {
      x: (vec.x + 1) * svgW / 2,
      y: (-vec.y + 1) * svgH / 2,
      depth: facing
    };
  }

  function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  function appendLabel(parent, text, offsetX = 11, offsetY = 3) {
    if (!text) return null;
    const lg = svgEl('g', { class: 'p-label-group' });
    const w = Math.max(38, text.length * 5.7 + 10);
    lg.innerHTML = `
      <rect x="${offsetX}" y="${offsetY - 10}" width="${w.toFixed(0)}" height="14" rx="4" class="p-label-bg"/>
      <text x="${offsetX + 5}" y="${offsetY}" class="p-label-txt">${text}</text>
    `;
    parent.appendChild(lg);
    return lg;
  }

  function makeCO2Particle(x, y, size = 1, isMethane = false) {
    const g = svgEl('g', { transform: `translate(${x.toFixed(1)},${y.toFixed(1)})`, filter: 'url(#glow)' });
    const cMain = isMethane ? 'rgba(195,110,255,0.9)'  : 'rgba(255,130,40,0.9)';
    const cSub  = isMethane ? 'rgba(155,75,240,0.75)'  : 'rgba(255,100,20,0.75)';
    const cTop  = isMethane ? 'rgba(225,165,255,0.65)' : 'rgba(255,160,60,0.6)';
    g.innerHTML = `
      <circle r="${(3 * size).toFixed(1)}" fill="${cMain}"/>
      <circle cx="${(5.2*size).toFixed(1)}" cy="${(-2*size).toFixed(1)}" r="${(2*size).toFixed(1)}" fill="${cSub}"/>
      <circle cx="${(-5.2*size).toFixed(1)}" cy="${(-2*size).toFixed(1)}" r="${(2*size).toFixed(1)}" fill="${cSub}"/>
      <circle cx="0" cy="${(-5.8*size).toFixed(1)}" r="${(1.5*size).toFixed(1)}" fill="${cTop}"/>
    `;
    const dx = (Math.random() - 0.5) * 28;
    const dur = 2.4 + Math.random() * 1.6;
    g.style.cssText = `animation: floatUp ${dur.toFixed(2)}s ease-out forwards; --dx:${dx.toFixed(1)}px; --dy:${(-52 - Math.random() * 35).toFixed(1)}px;`;
    return { el: g, maxAge: dur };
  }

  function reticleMarkup(r, color, withCircle = true) {
    const t = Math.max(2, r * 0.22);
    const circle = withCircle
      ? `<circle r="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="2,3" opacity="0.55"/>`
      : '';
    return `
      ${circle}
      <line x1="0" y1="${(-r-t).toFixed(1)}" x2="0" y2="${(-r+t).toFixed(1)}" stroke="${color}" stroke-width="1"/>
      <line x1="0" y1="${(r-t).toFixed(1)}" x2="0" y2="${(r+t).toFixed(1)}" stroke="${color}" stroke-width="1"/>
      <line x1="${(-r-t).toFixed(1)}" y1="0" x2="${(-r+t).toFixed(1)}" y2="0" stroke="${color}" stroke-width="1"/>
      <line x1="${(r-t).toFixed(1)}" y1="0" x2="${(r+t).toFixed(1)}" y2="0" stroke="${color}" stroke-width="1"/>
    `;
  }

  function makeHeatRing(x, y, scale, isPolar = false, label = '') {
    const g = svgEl('g', { transform: `translate(${x.toFixed(1)},${y.toFixed(1)})` });
    const dur = 1.5 + Math.random() * 0.8;
    const delay = Math.random() * 1.5;
    const stroke1 = isPolar ? 'rgba(255,70,90,0.70)'  : 'rgba(255,105,30,0.62)';
    const stroke2 = isPolar ? 'rgba(255,50,110,0.38)' : 'rgba(255,80,20,0.32)';
    g.innerHTML = `
      <circle r="6" fill="none" stroke="${stroke1}" stroke-width="1.6"
              style="animation:heatRing ${dur.toFixed(2)}s ease-in-out ${delay.toFixed(2)}s infinite"/>
      <circle r="12" fill="none" stroke="${stroke2}" stroke-width="1"
              style="animation:heatRing ${(dur+0.4).toFixed(2)}s ease-in-out ${(delay+0.2).toFixed(2)}s infinite"/>
      ${reticleMarkup(9 * scale, isPolar ? 'rgba(255,120,150,0.48)' : 'rgba(255,140,70,0.42)', false)}
    `;
    const labelEl = appendLabel(g, label, 12, 3);
    return { el: g, labelEl };
  }

  function makeCarbonSink(x, y, scale, kind = 'forest', health = 1, label = '') {
    const g = svgEl('g', { transform: `translate(${x.toFixed(1)},${y.toFixed(1)})`, filter: 'url(#glow)' });
    if (kind === 'ocean') {
      g.innerHTML = `
        <circle r="${(6.5*scale).toFixed(1)}" fill="rgba(40,150,235,0.28)" stroke="rgba(90,195,255,0.75)" stroke-width="1.3" stroke-dasharray="3,2"/>
        <circle r="${(2.6*scale).toFixed(1)}" fill="rgba(120,215,255,0.85)"/>
        ${reticleMarkup(8.5 * scale, 'rgba(90,195,255,0.38)', false)}
      `;
    } else {
      const s = scale * (0.55 + 0.45 * health);
      const green = Math.round(115 + 75 * health);
      const red   = Math.round(140 - 95 * health);
      g.innerHTML = `
        <g style="animation:leafSway 2.5s ease-in-out infinite; transform-origin:0 4px">
          <ellipse rx="${(7*s).toFixed(1)}" ry="${(5*s).toFixed(1)}" fill="rgba(${red},${green},55,0.78)" transform="rotate(-30)"/>
          <line x1="0" y1="0" x2="0" y2="${(6*s).toFixed(1)}" stroke="rgba(${red},${Math.max(80, green-30)},45,0.85)" stroke-width="1.1"/>
        </g>
        ${reticleMarkup(9 * scale, 'rgba(100,220,120,0.35)', false)}
      `;
    }
    const labelEl = appendLabel(g, label, 11, 3);
    return { el: g, labelEl };
  }

  function makeOceanCurrent(x, y, angleDeg = 0, vigor = 1, label = '') {
    const g = svgEl('g', { transform: `translate(${x.toFixed(1)},${y.toFixed(1)})` });
    const arrow = svgEl('g', { transform: `rotate(${angleDeg.toFixed(1)})` });
    const w = 32;
    const dur = (2.6 - vigor * 1.1).toFixed(2);
    arrow.innerHTML = `
      <path d="M-${w/2},0 Q-${w/4},-6 0,0 T${w/2},0" fill="none"
            stroke="rgba(95,195,255,0.62)" stroke-width="1.6" stroke-dasharray="6,6"
            style="animation:streamFlow ${dur}s linear infinite"/>
      <polygon points="${w/2},0 ${w/2-5},-3 ${w/2-5},3" fill="rgba(120,210,255,0.72)"/>
    `;
    g.appendChild(arrow);
    const labelEl = appendLabel(g, label, 12, -8);
    return { el: g, arrowEl: arrow, labelEl };
  }

  function makeBasinMarker(x, y, label = '') {
    const g = svgEl('g', { transform: `translate(${x.toFixed(1)},${y.toFixed(1)})` });
    g.innerHTML = `<circle r="3" fill="rgba(125,211,252,0.75)" stroke="rgba(255,255,255,0.6)" stroke-width="0.9"/>`;
    const labelEl = appendLabel(g, label, 8, 3);
    return { el: g, labelEl };
  }

  function clearParticles() {
    while (pRoot.firstChild) pRoot.removeChild(pRoot.firstChild);
    persistentParticles = [];
    transientParticles = [];
  }

  function spawnPersistent() {
    clearParticles();

    if (mode === 'weather') {
      const vigor = clamp(state.ocean / 100, 0.2, 1);
      geoPoints.currents.forEach(pt => {
        const pos = geoToSVG(pt.lat, pt.lon);
        const { el, arrowEl, labelEl } = makeOceanCurrent(pos ? pos.x : 0, pos ? pos.y : 0, 0, vigor, pt.name);
        if (!pos) el.style.opacity = '0';
        pRoot.appendChild(el);
        persistentParticles.push({ el, arrowEl, labelEl, lat: pt.lat, lon: pt.lon, dLat: pt.dLat, dLon: pt.dLon, type: 'current' });
      });
      weather.basins.forEach(basin => {
        const pos = geoToSVG(basin.lat, basin.lon);
        const { el, labelEl } = makeBasinMarker(pos ? pos.x : 0, pos ? pos.y : 0, basin.name);
        if (!pos) el.style.opacity = '0';
        pRoot.appendChild(el);
        persistentParticles.push({ el, labelEl, lat: basin.lat, lon: basin.lon, type: 'basin' });
      });

    } else if (mode === 'carbon') {
      const forestHealth = clamp(1 - state.deforest / 100, 0.1, 1);
      geoPoints.sinks.forEach(pt => {
        const pos = geoToSVG(pt.lat, pt.lon);
        const { el, labelEl } = makeCarbonSink(pos ? pos.x : 0, pos ? pos.y : 0, pos ? (0.7 + pos.depth * 0.45) : 0.85, pt.kind, forestHealth, pt.label);
        if (!pos) el.style.opacity = '0';
        pRoot.appendChild(el);
        persistentParticles.push({ el, labelEl, lat: pt.lat, lon: pt.lon, type: 'sink' });
      });

    } else if (mode === 'temperature') {
      geoPoints.heat.forEach(pt => {
        const pos = geoToSVG(pt.lat, pt.lon);
        const { el, labelEl } = makeHeatRing(pos ? pos.x : 0, pos ? pos.y : 0, pos ? (0.7 + pos.depth * 0.55) : 0.85, pt.polar, pt.label);
        if (!pos) el.style.opacity = '0';
        pRoot.appendChild(el);
        persistentParticles.push({ el, labelEl, lat: pt.lat, lon: pt.lon, type: 'heat' });
      });
      geoPoints.industry.forEach(pt => {
        const pos = geoToSVG(pt.lat, pt.lon);
        const { el, labelEl } = makeHeatRing(pos ? pos.x : 0, pos ? pos.y : 0, 0.52, false, '');
        if (!pos) el.style.opacity = '0';
        pRoot.appendChild(el);
        persistentParticles.push({ el, labelEl, lat: pt.lat, lon: pt.lon, type: 'heat' });
      });
    }
  }

  function updatePersistentPositions() {
    persistentParticles.forEach(p => {
      const pos = geoToSVG(p.lat, p.lon);
      if (pos) {
        p.el.setAttribute('transform', `translate(${pos.x.toFixed(1)},${pos.y.toFixed(1)})`);
        if (p.type === 'current' && p.arrowEl && (p.dLat || p.dLon)) {
          const p2 = geoToSVG(p.lat + p.dLat * 0.35, p.lon + p.dLon * 0.35);
          const deg = p2 ? Math.atan2(p2.y - pos.y, p2.x - pos.x) * 180 / Math.PI : 0;
          p.arrowEl.setAttribute('transform', `rotate(${deg.toFixed(1)})`);
        }
        p.el.style.opacity = (pos.depth * 0.9 + 0.1).toFixed(2);
        if (p.labelEl) {
          p.labelEl.style.display = showLabels && pos.depth > 0.35 ? '' : 'none';
        }
      } else {
        p.el.style.opacity = '0';
      }
    });

    if (activeProbe && activeProbe.el) {
      const pos = geoToSVG(activeProbe.lat, activeProbe.lon);
      if (pos) {
        activeProbe.el.setAttribute('transform', `translate(${pos.x.toFixed(1)},${pos.y.toFixed(1)})`);
        activeProbe.el.style.opacity = '1';
      } else {
        activeProbe.el.style.opacity = '0';
      }
    }
  }

  let spawnTimer = 0;
  function spawnTransient(climateObj, dt) {
    for (let i = transientParticles.length - 1; i >= 0; i--) {
      const tp = transientParticles[i];
      tp.age += dt;
      if (tp.age >= tp.maxAge) {
        if (tp.el.parentNode === pRoot) pRoot.removeChild(tp.el);
        transientParticles.splice(i, 1);
      }
    }

    spawnTimer += dt;
    if (spawnTimer < 0.20) return;
    spawnTimer = 0;

    if (mode === 'carbon') {
      const co2Rate = clamp((state.co2 - 280) / 300, 0, 1);
      if (Math.random() < co2Rate * 0.85 + 0.12) {
        const src = geoPoints.industry[Math.floor(Math.random() * geoPoints.industry.length)];
        const pos = geoToSVG(src.lat + (Math.random() - 0.5) * 5, src.lon + (Math.random() - 0.5) * 5);
        if (pos) {
          const { el, maxAge } = makeCO2Particle(pos.x, pos.y, 0.6 + pos.depth * 0.5, false);
          pRoot.appendChild(el);
          transientParticles.push({ el, age: 0, maxAge });
        }
      }
      const ch4Rate = clamp((state.ch4 - 722) / 2500, 0, 1);
      if ((state.ch4 > 1400 || climateObj.tempAnomaly > 1.8) && Math.random() < ch4Rate * 0.65) {
        const pool = climateObj.tempAnomaly > 1.8 ? geoPoints.permafrost : geoPoints.industry;
        const src = pool[Math.floor(Math.random() * pool.length)];
        const pos = geoToSVG(src.lat + (Math.random() - 0.5) * 4, src.lon + (Math.random() - 0.5) * 4);
        if (pos) {
          const { el, maxAge } = makeCO2Particle(pos.x, pos.y, 0.55 + pos.depth * 0.45, true);
          pRoot.appendChild(el);
          transientParticles.push({ el, age: 0, maxAge });
        }
      }
    }
  }

  /* ══════════════════════════════════════════
     RESIZE
  ══════════════════════════════════════════ */
  function onResize() {
    syncSize();
    svgW = Math.max(1, globe.clientWidth);
    svgH = Math.max(1, globe.clientHeight);
    svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
    updatePersistentPositions();
  }
  if (window.ResizeObserver) {
    new ResizeObserver(onResize).observe(globe);
  }
  window.addEventListener('resize', onResize);

  /* ══════════════════════════════════════════
     UI STATE & BINDINGS
  ══════════════════════════════════════════ */
  const state = { ...PRESETS.today };
  delete state.label;
  let climate = computeClimate(state);
  let month = 9;
  let weather = ClimateWeather.conditions(month, climate.tempAnomaly);
  paintStormAtlas();
  let feedbackDriftEnabled = false;
  let activePreset = 'today';
  let userInteracted = false;
  let probedArctic = false;
  let probedTropics = false;
  let completedMissions = new Set();

  const labels = {
    co2: document.getElementById('v-co2'),
    solar: document.getElementById('v-solar'),
    ice: document.getElementById('v-ice'),
    deforest: document.getElementById('v-deforest'),
    ch4: document.getElementById('v-ch4'),
    ocean: document.getElementById('v-ocean'),
  };
  const outs = {
    temp: document.getElementById('out-temp'),
    sea:  document.getElementById('out-sea'),
    ph:   document.getElementById('out-ph'),
    storm: document.getElementById('out-storm'),
    forcing: document.getElementById('out-forcing'),
    icecover: document.getElementById('out-icecover'),
  };
  const alertBar = document.getElementById('alert-bar');
  const statusLinesEl = document.getElementById('status-lines');
  const modeBadge = document.getElementById('mode-badge');
  const heatmapLegend = document.getElementById('heatmap-legend');
  const feedbackToggleBtn = document.getElementById('feedback-toggle');
  const feedbackStateLbl = document.getElementById('feedback-state');
  const feedbackRatesEl = document.getElementById('feedback-rates');
  const probeCard = document.getElementById('probe-card');
  const missionListEl = document.getElementById('mission-list');
  const missionBadgeEl = document.getElementById('mission-badge');

  function fmt(n, dec = 1) { return n.toFixed(dec); }
  function fmtSign(n, dec = 1) { return (n >= 0 ? '+' : '') + n.toFixed(dec); }

  function setAlert(cls, label, detail) {
    alertBar.className = 'alert-bar ' + cls;
    alertBar.innerHTML = `<span class="alert-dot"></span><span class="alert-label">${label}</span><span class="alert-detail">${detail}</span>`;
  }

  function statusLine(tag, cls, text) {
    return `<div class="status-line"><span class="status-tag ${cls}">${tag}</span><span class="status-text">${text}</span></div>`;
  }

  function updateStatusPanel(c) {
    const lines = [];

    if (c.iceLeft > 70) lines.push(statusLine('Ice', 'blue', 'Polar ice sheets and seasonal sea-ice pack stable or expanding.'));
    else if (c.iceLeft > 40) lines.push(statusLine('Ice', 'warm', 'Arctic sea ice retreating; polar amplification accelerating.'));
    else if (c.iceLeft > 15) lines.push(statusLine('Ice', 'hot', 'Major cryosphere loss — summer Arctic sea ice near collapse.'));
    else lines.push(statusLine('Ice', 'critical', 'Greenland and West Antarctic ice sheets in critical decline.'));

    lines.push(statusLine('Weather', 'blue', `${weather.basins.length} seasonally favored basin examples; cloud symbols are not active storms.`));
    lines.push(statusLine('Moisture', weather.moistureFactor < 1.15 ? 'neutral' : 'warm', `Warmer air can hold about ${Math.round((weather.moistureFactor - 1) * 100)}% more water vapor in this approximation; actual rainfall also depends on circulation.`));

    if (c.oceanPH > 8.08) lines.push(statusLine('Ocean', 'neutral', 'Carbonate chemistry near pre-industrial equilibrium; reefs healthy.'));
    else if (c.oceanPH > 7.95) lines.push(statusLine('Ocean', 'warm', 'Aragonite saturation dropping — coral calcification slowing.'));
    else lines.push(statusLine('Ocean', 'acid', 'Severe ocean acidification — reef and pteropod shell dissolution risk.'));

    const bioStress = state.deforest + clamp(c.tempAnomaly / 6, 0, 1) * 35;
    if (bioStress < 30) lines.push(statusLine('Biome', 'neutral', 'Terrestrial forest carbon sinks intact (~2.6 Gt C/yr uptake).'));
    else if (bioStress < 60) lines.push(statusLine('Biome', 'warm', 'Deforestation and heat stress weakening tropical carbon sinks.'));
    else lines.push(statusLine('Biome', 'hot', 'Severe forest dieback and permafrost thaw — land sinks flipping to source.'));

    if (c.seaLevel < 0) lines.push(statusLine('Coast', 'blue', `Glacial ice sheets locking ocean water (${fmtSign(c.seaLevel, 1)} m sea level drop).`));
    else if (c.seaLevel < 0.35) lines.push(statusLine('Coast', 'blue', 'Thermosteric and meltwater sea level rise within adaptive range.'));
    else if (c.seaLevel < 1.0) lines.push(statusLine('Coast', 'warm', 'Chronic king-tide flooding and coastal erosion accelerating.'));
    else lines.push(statusLine('Coast', 'critical', 'Multi-meter sea level commitment — low-lying coastlines inundated.'));

    statusLinesEl.innerHTML = lines.join('');
  }

  function updateEnergyBudgetUI() {
    const eb = computeEnergyBudget(state, climate);
    const incEl = document.getElementById('eb-incoming');
    if (!incEl) return;

    incEl.textContent = `${eb.incomingSolar.toFixed(1)} W/m²`;
    document.getElementById('eb-albedo').textContent = `${Math.round(eb.albedo * 100)}%`;
    document.getElementById('eb-reflected').textContent = `${eb.reflectedSolar.toFixed(1)} W/m²`;
    document.getElementById('eb-absorbed').textContent = `${eb.absorbedSolar.toFixed(1)} W/m²`;
    document.getElementById('eb-surface-ir').textContent = `${eb.surfaceIR.toFixed(1)} W/m²`;
    document.getElementById('eb-backrad').textContent = `${eb.backRadiation.toFixed(1)} W/m²`;
    document.getElementById('eb-outgoing').textContent = `${eb.outgoingIR.toFixed(1)} W/m²`;

    const imbEl = document.getElementById('eb-imbalance');
    imbEl.textContent = `Net Imbalance: ${fmtSign(eb.netImbalance, 1)} W/m²`;
    imbEl.className = 'eb-imbalance ' + (eb.netImbalance > 0.25 ? 'warming' : eb.netImbalance < -0.25 ? 'cooling' : '');

    const fillEl = document.getElementById('eb-meter-fill');
    const pct = clamp(Math.abs(eb.netImbalance) / 8.0, 0, 1) * 50;
    if (eb.netImbalance >= 0) {
      fillEl.style.left = '50%';
      fillEl.style.width = `${pct.toFixed(1)}%`;
      fillEl.style.backgroundColor = eb.netImbalance > 3.5 ? '#ef4444' : '#fb923c';
    } else {
      fillEl.style.left = `${(50 - pct).toFixed(1)}%`;
      fillEl.style.width = `${pct.toFixed(1)}%`;
      fillEl.style.backgroundColor = '#38bdf8';
    }

    const sumEl = document.getElementById('eb-summary');
    if (Math.abs(eb.netImbalance) < 0.25) {
      sumEl.textContent = 'Planetary radiative equilibrium: absorbed solar energy closely balances outgoing thermal infrared radiation.';
    } else if (eb.netImbalance > 0) {
      sumEl.textContent = `Earth absorbs ${eb.netImbalance.toFixed(1)} W/m² more energy than it radiates to space, driving warming until outgoing IR catches up.`;
    } else {
      sumEl.textContent = `Earth radiates ${Math.abs(eb.netImbalance).toFixed(1)} W/m² more energy than it absorbs, cooling the surface and expanding ice cover.`;
    }
  }

  function updateProbeCard() {
    if (!activeProbe || !probeCard) return;
    const p = computeLocalProbe({
      lat: activeProbe.lat,
      lon: activeProbe.lon,
      isLand: activeProbe.isLand,
      state,
      climate,
    });
    const latStr = `${Math.abs(p.lat).toFixed(1)}°${p.lat >= 0 ? 'N' : 'S'}`;
    const lonStr = `${Math.abs(p.lon).toFixed(1)}°${p.lon >= 0 ? 'E' : 'W'}`;
    document.getElementById('probe-coords').textContent = `${latStr}, ${lonStr}`;
    document.getElementById('probe-surface').textContent = p.surfaceType;
    document.getElementById('probe-temp').textContent = `${fmtSign(p.localAnomaly, 1)}°C`;
    document.getElementById('probe-amp').textContent = `${p.multiplier.toFixed(2)}×`;
    document.getElementById('probe-albedo').textContent = `${Math.round(p.localAlbedo * 100)}%`;
    document.getElementById('probe-note').textContent = p.note;
    probeCard.hidden = false;
  }

  function renderMissions() {
    if (!missionListEl || !missionBadgeEl) return;
    missionBadgeEl.textContent = `${completedMissions.size}/${MISSIONS.length}`;
    missionListEl.innerHTML = MISSIONS.map(m => {
      const done = completedMissions.has(m.id);
      return `
        <article class="mission-card${done ? ' done' : ''}" data-mission="${m.id}">
          <div class="mission-head">
            <h4 class="mission-title">${m.title}</h4>
            <span class="mission-status">${done ? '✓ Complete' : 'In Progress'}</span>
          </div>
          <p class="mission-goal">${m.goal}</p>
          <p class="mission-hint"><strong>Tip:</strong> ${m.hint}</p>
        </article>
      `;
    }).join('');
  }

  function refreshMissions() {
    const next = evaluateMissions({
      state,
      climate,
      mode,
      feedbackDriftEnabled,
      probedArctic,
      probedTropics,
      userInteracted,
      completedIds: completedMissions,
    });
    const changed = next.size !== completedMissions.size;
    completedMissions = next;
    if (changed || !missionListEl.children.length) {
      renderMissions();
    }
  }

  function updateFeedbackRatesUI() {
    if (!feedbackRatesEl) return;
    if (!feedbackDriftEnabled) {
      feedbackRatesEl.hidden = true;
      return;
    }
    feedbackRatesEl.hidden = false;
    const parts = [];
    if (state.deforest > 35 && state.co2 < 700) {
      const rate = ((state.deforest - 35) / 65) * 4.5;
      parts.push(`CO₂ +${rate.toFixed(1)} ppm/s`);
    }
    if (climate.tempAnomaly > 1.6 && state.ch4 < 4000) {
      const rate = (climate.tempAnomaly - 1.6) * 18.0;
      parts.push(`CH₄ +${rate.toFixed(0)} ppb/s`);
    }
    if (climate.tempAnomaly > 1.3 && state.ice > 5) {
      const rate = (climate.tempAnomaly - 1.3) * 0.55;
      parts.push(`Ice −${rate.toFixed(2)}%/s`);
    }
    feedbackRatesEl.textContent = parts.length
      ? `Active drift: ${parts.join(' · ')}`
      : 'Holding steady — raise Deforestation >35% or ΔT >1.3°C to trigger drift.';
  }

  function updateReadouts() {
    const c = climate;
    const t = c.tempAnomaly;

    outs.temp.textContent = fmtSign(t) + '°C';
    outs.sea.textContent  = fmtSign(c.seaLevel, 2) + ' m';
    outs.ph.textContent   = fmt(c.oceanPH, 2);
    outs.storm.textContent = fmt(weather.moistureFactor, 2) + '×';
    outs.forcing.textContent = fmtSign(c.totalForcing, 1) + ' W/m²';
    outs.icecover.textContent = fmt(c.iceLeft, 0) + '%';

    const tempClass = t < 0 ? 'blue' : t < 1.5 ? 'neutral' : t < 2.5 ? 'warm' : t < 4 ? 'hot' : 'critical';
    outs.temp.className = 'readout-val ' + tempClass;
    outs.ph.className   = 'readout-val ' + (c.oceanPH > 8.05 ? 'neutral' : c.oceanPH > 7.93 ? 'warm' : 'acid');
    outs.storm.className = 'readout-val ' + (weather.moistureFactor < 1.15 ? 'neutral' : weather.moistureFactor < 1.3 ? 'warm' : 'hot');
    outs.icecover.className = 'readout-val ' + (c.iceLeft > 50 ? 'blue' : c.iceLeft > 25 ? 'warm' : 'hot');
    outs.forcing.className  = 'readout-val ' + (c.totalForcing < 0 ? 'blue' : c.totalForcing < 2.2 ? 'neutral' : c.totalForcing < 4.2 ? 'warm' : 'hot');

    if (t < -1.0) {
      setAlert('safe', 'Threat Level: Glacial', 'Ice-albedo cooling locks water in continental ice sheets.');
    } else if (t < 1.5) {
      setAlert('safe', 'Threat Level: Nominal', 'Within the 1.5°C Paris guardband — rapid decarbonization can stabilize warming.');
    } else if (t < 2.5) {
      setAlert('warning', 'Threat Level: Elevated', 'Exceeding 1.5°C — coral reef die-off, glacier retreat, and extreme heat waves.');
    } else if (t < 4) {
      setAlert('danger', 'Threat Level: Severe', 'Severe radiative imbalance — multi-system tipping points and ice-sheet instability.');
    } else {
      setAlert('critical', 'Threat Level: Critical', 'Hothouse Earth trajectory — cascading biosphere and cryosphere collapse.');
    }

    updateStatusPanel(c);
    updateEnergyBudgetUI();
    updateProbeCard();
    updateFeedbackRatesUI();
    refreshMissions();

    window.dispatchEvent(new CustomEvent('climate:update', {
      detail: { state: { ...state }, climate: { ...climate }, preset: activePreset }
    }));
  }

  function syncVisualUniforms() {
    earthUniforms.iceLevel.value    = state.ice / 100;
    earthUniforms.tempAnomaly.value = climate.tempAnomaly;
    earthUniforms.deforest.value    = state.deforest / 100;
    earthUniforms.oceanHeat.value   = state.ocean / 100;

    const t = clamp(climate.tempAnomaly / 6, 0, 1);
    atmUniforms.atmColor.value.setRGB(lerp(0.16, 0.65, t), lerp(0.44, 0.24, t), lerp(1.0, 0.12, t));
    atmUniforms.rimStrength.value = lerp(0.72, 1.12, t);

    updateMeltFront(state.ice / 100, climate.tempAnomaly);
    cloudMat.opacity = cloudOpacityFor(state.ocean);
  }

  function cloudOpacityFor(ocean) {
    const moisture = clamp((weather.moistureFactor - 1) / 0.5, 0, 1);
    return clamp(0.38 + moisture * 0.13 + (ocean / 100) * 0.07, 0.3, 0.62);
  }

  function onParamChange(rebuildParticles = true) {
    climate = computeClimate(state);
    weather = ClimateWeather.conditions(month, climate.tempAnomaly);
    document.getElementById('weather-explainer').textContent = `${weather.basins.map(b => b.name).join(', ') || 'No featured tropical basin'}: seasonally favored examples. Warm water alone cannot produce a cyclone; wind shear and a disturbance matter. These are not active storms.`;
    updateReadouts();
    syncVisualUniforms();
    if (rebuildParticles) spawnPersistent();
  }

  function setActivePresetButton(presetName) {
    activePreset = presetName;
    document.querySelectorAll('#preset-row .preset-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.preset === presetName);
    });
  }

  const SLIDER_FORMATTERS = {
    co2:      v => Math.round(v) + ' ppm',
    solar:    v => v.toFixed(1) + '%',
    ice:      v => Math.round(v) + '%',
    deforest: v => Math.round(v) + '%',
    ch4:      v => Math.round(v).toLocaleString() + ' ppb',
    ocean:    v => Math.round(v) + '%',
  };

  let applyingPreset = false;
  function bindSlider(id, key) {
    const el = document.getElementById('s-' + id);
    const lbl = labels[id];
    el.addEventListener('input', () => {
      userInteracted = true;
      state[key] = parseFloat(el.value);
      lbl.textContent = SLIDER_FORMATTERS[key](state[key]);
      if (!applyingPreset) {
        setActivePresetButton(null);
        onParamChange(true);
      }
    });
  }

  bindSlider('co2',     'co2');
  bindSlider('solar',   'solar');
  bindSlider('ice',     'ice');
  bindSlider('deforest','deforest');
  bindSlider('ch4',     'ch4');
  bindSlider('ocean',   'ocean');

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('s-month').addEventListener('input', e => {
    month = Number(e.target.value);
    cloudTex.image = buildCloudTexture(month);
    cloudTex.needsUpdate = true;
    updateSolarDeclination(month);
    document.getElementById('v-month').textContent = monthNames[month - 1];
    weather = ClimateWeather.conditions(month, climate.tempAnomaly);
    paintStormAtlas();
    document.getElementById('weather-explainer').textContent = `${weather.basins.map(b => b.name).join(', ') || 'No featured tropical basin'}: seasonally favored examples. Warm water alone cannot produce a cyclone; wind shear and a disturbance matter. These are not active storms.`;
    updateReadouts();
    spawnPersistent();
  });

  function applyPreset(presetKey, syncCompareChart = true) {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    userInteracted = true;
    applyingPreset = true;
    Object.keys(SLIDER_FORMATTERS).forEach(id => {
      const el = document.getElementById('s-' + id);
      el.value = preset[id];
      state[id] = preset[id];
      labels[id].textContent = SLIDER_FORMATTERS[id](state[id]);
    });
    applyingPreset = false;
    setActivePresetButton(presetKey);
    onParamChange(true);

    if (syncCompareChart) {
      const pathBtn = document.querySelector(`#climate-p3-actions [data-climate-path="${presetKey}"]`);
      if (pathBtn) pathBtn.click();
    }
  }

  document.getElementById('preset-row').addEventListener('click', e => {
    const btn = e.target.closest('.preset-btn');
    if (!btn) return;
    applyPreset(btn.dataset.preset, true);
  });

  const compareActions = document.getElementById('climate-p3-actions');
  if (compareActions) {
    compareActions.addEventListener('click', e => {
      const btn = e.target.closest('[data-climate-path]');
      if (!btn) return;
      const pathKey = btn.dataset.climatePath;
      if (PRESETS[pathKey] && activePreset !== pathKey) {
        applyPreset(pathKey, false);
      }
    });
  }

  if (feedbackToggleBtn) {
    feedbackToggleBtn.addEventListener('click', () => {
      userInteracted = true;
      feedbackDriftEnabled = !feedbackDriftEnabled;
      feedbackToggleBtn.setAttribute('aria-pressed', String(feedbackDriftEnabled));
      feedbackStateLbl.textContent = feedbackDriftEnabled ? 'Active' : 'Hold Steady';
      updateFeedbackRatesUI();
      refreshMissions();
    });
  }

  // Mode switching
  document.getElementById('mode-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.mode-tab');
    if (!btn) return;
    document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    stormMesh.visible = mode === 'weather';
    document.getElementById('weather-season-card').hidden = mode !== 'weather';

    const modeLabels = { weather: '🌪️ Seasonal storm regions', carbon: '♻️ Carbon Cycle', temperature: '🌡️ Heat Map' };
    modeBadge.textContent = modeLabels[mode];
    if (heatmapLegend) heatmapLegend.classList.toggle('visible', mode === 'temperature');

    earthUniforms.heatMap.value = mode === 'temperature' ? 1.0 : 0.0;
    spawnPersistent();
    refreshMissions();
  });

  // Globe HUD controls (Spin, Lighting, Labels, Camera Presets)
  const btnSpin = document.getElementById('btn-spin');
  const btnLighting = document.getElementById('btn-lighting');
  const btnLabels = document.getElementById('btn-labels');

  if (btnSpin) {
    btnSpin.addEventListener('click', () => {
      controls.autoRotate = !controls.autoRotate;
      btnSpin.setAttribute('aria-pressed', String(controls.autoRotate));
      btnSpin.textContent = controls.autoRotate ? '⏸ Pause' : '▶ Spin';
    });
  }
  if (btnLighting) {
    btnLighting.addEventListener('click', () => {
      const next = earthUniforms.uniformLit.value < 0.5 ? 1.0 : 0.0;
      earthUniforms.uniformLit.value = next;
      atmUniforms.uniformLit.value = next;
      btnLighting.setAttribute('aria-pressed', String(next > 0.5));
      btnLighting.textContent = next > 0.5 ? '☀ Full Sun' : '☀ Day/Night';
    });
  }
  if (btnLabels) {
    btnLabels.addEventListener('click', () => {
      showLabels = !showLabels;
      btnLabels.setAttribute('aria-pressed', String(showLabels));
      updatePersistentPositions();
    });
  }

  document.querySelectorAll('[data-cam]').forEach(btn => {
    btn.addEventListener('click', () => animateCameraTo(btn.dataset.cam));
  });

  // Click-to-Probe 3D Earth Raycaster
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  let downPos = null;

  function placeProbePin(lat, lon) {
    while (probeRoot.firstChild) probeRoot.removeChild(probeRoot.firstChild);
    const g = svgEl('g', {});
    g.innerHTML = `
      <circle r="6" fill="none" stroke="#38bdf8" stroke-width="1.6" class="p-probe-ring" style="animation:probePulse 1.6s ease-in-out infinite"/>
      <circle r="3.2" fill="#7dd3fc" stroke="#082f49" stroke-width="1.2"/>
    `;
    probeRoot.appendChild(g);
    const isLand = sampleIsLand(lon, lat);
    activeProbe = { lat, lon, isLand, el: g };

    if (lat >= 60) probedArctic = true;
    if (Math.abs(lat) <= 25) probedTropics = true;

    updateProbeCard();
    updatePersistentPositions();
    refreshMissions();
  }

  canvas.addEventListener('pointerdown', e => {
    downPos = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', e => {
    if (!downPos) return;
    const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    downPos = null;
    if (dist > 6) return; // ignore orbit drags

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointerNDC, camera);
    earthMesh.updateMatrixWorld();
    const hits = raycaster.intersectObject(earthMesh, false);
    if (!hits.length) return;

    const localPt = earthMesh.worldToLocal(hits[0].point.clone());
    const [lon, lat] = EarthEngine.vectorToLonLat(localPt);
    placeProbePin(lat, lon);
  });

  const probeCloseBtn = document.getElementById('probe-close');
  if (probeCloseBtn) {
    probeCloseBtn.addEventListener('click', () => {
      activeProbe = null;
      while (probeRoot.firstChild) probeRoot.removeChild(probeRoot.firstChild);
      if (probeCard) probeCard.hidden = true;
    });
  }

  /* ══════════════════════════════════════════
     ANIMATION LOOP
  ══════════════════════════════════════════ */
  let feedbackSyncAccum = 0;
  function animate(dtRaw, ts) {
    const dt = Math.min(dtRaw, 0.05);
    const sec = ts * 0.001;

    if (camAnim) {
      const camDt = Math.min(dtRaw, 0.25);
      camAnim.progress = Math.min(1, camAnim.progress + camDt / camAnim.duration);
      const ease = 1 - Math.pow(1 - camAnim.progress, 3);
      const curSph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      curSph.phi = lerp(camAnim.startPhi, camAnim.targetPhi, ease);
      curSph.radius = lerp(camAnim.startDist, camAnim.targetDist, ease);
      curSph.makeSafe();
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(curSph));
      if (camAnim.progress >= 1) camAnim = null;
    }

    controls.update();

    // Weather cloud layers share Earth's rotation, keeping basin examples aligned.
    earthMesh.rotation.y += dt * 0.015;
    cloudMesh.rotation.y = earthMesh.rotation.y;
    stormMesh.rotation.y = earthMesh.rotation.y;
    earthUniforms.uTime.value = sec;
    auroraUniforms.uTime.value = sec;

    // Solar irradiance — update scene light and Earth shader
    const solarFactor = state.solar / 100;
    sunLight.intensity = 1.4 * solarFactor;
    const sunSat = clamp(0.15 * (1 - (solarFactor - 1) * 5), 0.02, 0.35);
    sunLight.color.setHSL(0.1, sunSat, 0.95);
    earthUniforms.sunIntensity.value = 0.88 * solarFactor;
    earthUniforms.sunColor.value.setHSL(0.1, sunSat, 0.95);

    // Polar aurora intensity driven by Solar Irradiance
    const solarActivity = clamp((state.solar - 94) / 11, 0.15, 1.0);
    auroraUniforms.intensity.value = solarActivity * (0.28 + 0.14 * Math.sin(sec * 1.3));

    // Melt-front ring — slow pulse scaled by visibility so ice-free poles have no phantom ring
    const meltPulse = (0.28 + 0.22 * Math.sin(sec * 1.8)) * meltFrontVisibility;
    meltFrontNorth.material.opacity = meltPulse;
    meltFrontSouth.material.opacity = meltPulse * 0.85;

    // Coupled Earth-system feedback loop
    if (feedbackDriftEnabled) {
      let changed = false;
      if (state.deforest > 35 && state.co2 < 700) {
        const co2Rate = ((state.deforest - 35) / 65) * 4.5;
        state.co2 = Math.min(700, state.co2 + co2Rate * dt);
        document.getElementById('s-co2').value = Math.round(state.co2);
        labels.co2.textContent = SLIDER_FORMATTERS.co2(state.co2);
        changed = true;
      }
      if (climate.tempAnomaly > 1.6 && state.ch4 < 4000) {
        const ch4Rate = (climate.tempAnomaly - 1.6) * 18.0;
        state.ch4 = Math.min(4000, state.ch4 + ch4Rate * dt);
        document.getElementById('s-ch4').value = Math.round(state.ch4);
        labels.ch4.textContent = SLIDER_FORMATTERS.ch4(state.ch4);
        changed = true;
      }
      if (climate.tempAnomaly > 1.3 && state.ice > 5) {
        const meltRate = (climate.tempAnomaly - 1.3) * 0.55;
        state.ice = Math.max(0, state.ice - meltRate * dt);
        document.getElementById('s-ice').value = Math.round(state.ice);
        labels.ice.textContent = SLIDER_FORMATTERS.ice(state.ice);
        changed = true;
      }
      if (changed) {
        setActivePresetButton(null);
        feedbackSyncAccum += dt;
        climate = computeClimate(state);
        weather = ClimateWeather.conditions(month, climate.tempAnomaly);
        syncVisualUniforms();
        if (feedbackSyncAccum > 0.25) {
          feedbackSyncAccum = 0;
          updateReadouts();
        }
      }
    }

    updatePersistentPositions();
    spawnTransient(climate, dt);

    renderer.render(scene, camera);
  }

  /* ══════════════════════════════════════════
     INIT
  ══════════════════════════════════════════ */
  onResize();
  renderMissions();
  onParamChange(true);
  SimKit.loop(animate, { el: document.getElementById('earth-canvas') });

})();
