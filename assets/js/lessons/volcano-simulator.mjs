/* Volcano Simulator lesson (lessons/earth-science/volcano-simulator.html).
 * Moved out of the page's inline module <script>; only the import paths changed (they now
 * resolve from this file), and five DOM-free helpers live in volcano-simulator-core.mjs. */
  import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
  import { createDepthFieldMesh } from '../liquid-engine-three.mjs';
  import { sampleHeightmap, lerp, clamp, vtypeName, viscosityLabel } from './volcano-simulator-core.mjs';
  window.THREE = THREE;
  window.OrbitControls = OrbitControls;
  (function () {

    const lavaMaterial = window.LiquidEngine?.material('lava') || { viscosity: 0.72, flow: 0.08 };

    /* ══════════════════════════════════════════
       REAL HEIGHTMAPS
    ══════════════════════════════════════════ */
    const heightmaps = {};
    const imgLoader = new THREE.ImageLoader();


    function fetchHeightmap(id) {
        if (!id) return Promise.resolve(null);
        if (heightmaps[id]) return Promise.resolve(heightmaps[id]);
        return new Promise((resolve) => {
            imgLoader.load(`../../assets/images/lessons/volcano-simulator/${id}-height.png`, (img) => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const data = ctx.getImageData(0, 0, img.width, img.height).data;
                const hData = new Float32Array(img.width * img.height);
                for (let i=0; i<data.length; i+=4) hData[i/4] = data[i]/255.0;
                heightmaps[id] = { width: img.width, height: img.height, data: hData };
                resolve(heightmaps[id]);
            }, undefined, () => resolve(null));
        });
    }

    const colormaps = {};
    const imgTexLoader = new THREE.TextureLoader();
    function fetchColormap(id) {
        if (!id) return Promise.resolve(null);
        if (colormaps[id]) return Promise.resolve(colormaps[id]);
        return new Promise((resolve) => {
            imgTexLoader.load(`../../assets/images/lessons/volcano-simulator/${id}-color.jpg`, (tex) => {
                tex.encoding = THREE.sRGBEncoding;
                tex.generateMipmaps = true;
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.magFilter = THREE.LinearFilter;
                colormaps[id] = tex;
                resolve(tex);
            }, undefined, () => resolve(null));
        });
    }

    const { fbm } = SimKit.noise;

    // Multi-scale procedural volcanic normal & detail texture generator
    function createVolcanicDetailMaps() {
      const size = 512;
      const hCanvas = document.createElement('canvas');
      hCanvas.width = hCanvas.height = size;
      const hCtx = hCanvas.getContext('2d');
      const hImg = hCtx.createImageData(size, size);
      const hData = new Float32Array(size * size);

      // Multi-octave periodic noise field for seamless tiling
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const u = x / size, v = y / size;
          const nx = Math.cos(u * Math.PI * 2) * 1.5;
          const ny = Math.sin(u * Math.PI * 2) * 1.5;
          const nz = Math.cos(v * Math.PI * 2) * 1.5;
          const nw = Math.sin(v * Math.PI * 2) * 1.5;
          // Coarse rock structure + micro vesicles
          const base = fbm(nx * 1.8 + nz * 2.2, ny * 1.8 + nw * 2.2, 4);
          const fine = fbm(nx * 5.4 - nz * 4.1, ny * 5.4 - nw * 4.1, 2) * 0.35;
          const pore = Math.pow(Math.abs(Math.sin((x * 0.15) + (y * 0.15) * 1.3)), 8.0) * 0.25;
          const val = clamp(base + fine - pore, 0, 1);
          hData[y * size + x] = val;

          const idx = (y * size + x) * 4;
          // R: coarse rock grain, G: micro phenocrysts, B: vesicle pores
          hImg.data[idx]     = Math.floor(val * 255);
          hImg.data[idx + 1] = Math.floor(clamp(fine * 3.0, 0, 1) * 255);
          hImg.data[idx + 2] = Math.floor(clamp(base * 0.8 + 0.2, 0, 1) * 255);
          hImg.data[idx + 3] = 255;
        }
      }
      hCtx.putImageData(hImg, 0, 0);

      const detailTex = new THREE.CanvasTexture(hCanvas);
      detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping;
      detailTex.repeat.set(16, 16);

      // Compute normal map via Sobel gradient
      const nCanvas = document.createElement('canvas');
      nCanvas.width = nCanvas.height = size;
      const nCtx = nCanvas.getContext('2d');
      const nImg = nCtx.createImageData(size, size);

      for (let y = 0; y < size; y++) {
        const yprev = (y - 1 + size) % size;
        const ynext = (y + 1) % size;
        for (let x = 0; x < size; x++) {
          const xprev = (x - 1 + size) % size;
          const xnext = (x + 1) % size;
          const dx = (hData[y * size + xnext] - hData[y * size + xprev]) * 3.5;
          const dy = (hData[ynext * size + x] - hData[yprev * size + x]) * 3.5;
          const dz = 1.0;
          const len = Math.hypot(dx, dy, dz) || 1;
          const nx = -dx / len;
          const ny = -dy / len;
          const nz = dz / len;

          const idx = (y * size + x) * 4;
          nImg.data[idx]     = Math.floor((nx * 0.5 + 0.5) * 255);
          nImg.data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
          nImg.data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
          nImg.data[idx + 3] = 255;
        }
      }
      nCtx.putImageData(nImg, 0, 0);

      const normalTex = new THREE.CanvasTexture(nCanvas);
      normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
      normalTex.repeat.set(16, 16);

      // Roughness texture
      const rCanvas = document.createElement('canvas');
      rCanvas.width = rCanvas.height = 256;
      const rCtx = rCanvas.getContext('2d');
      const rImg = rCtx.createImageData(256, 256);
      for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 256; x++) {
          const hVal = hData[(y * 2) * size + (x * 2)];
          const rough = clamp(0.72 + hVal * 0.26, 0, 1);
          const idx = (y * 256 + x) * 4;
          const b = Math.floor(rough * 255);
          rImg.data[idx] = rImg.data[idx+1] = rImg.data[idx+2] = b;
          rImg.data[idx+3] = 255;
        }
      }
      rCtx.putImageData(rImg, 0, 0);
      const roughnessTex = new THREE.CanvasTexture(rCanvas);
      roughnessTex.wrapS = roughnessTex.wrapT = THREE.RepeatWrapping;
      roughnessTex.repeat.set(16, 16);

      return { detailMap: detailTex, normalMap: normalTex, roughnessMap: roughnessTex };
    }
    const volcanicMaps = createVolcanicDetailMaps();

    /* ══════════════════════════════════════════
       FAMOUS ERUPTION PRESETS
    ══════════════════════════════════════════ */
    const ERUPTIONS = Object.values(window.VolcanoHistory).map(record => record.preset);

    /* ══════════════════════════════════════════
       THREE.JS SETUP
    ══════════════════════════════════════════ */
    const canvas  = document.getElementById('vol-canvas');
    const outer   = document.getElementById('vol-outer');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x0b0606, 1);

    const scene  = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x180805, 0.018);

    const state = { mode:'historical', intensity:72, column:18, viscosity:50, pyro:40, vtype:'strato', timeline:0.0 };
    let currentMaxH = 10;

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 800);
    let camDist = 32, camTheta = 0.5, camPhi = 1.12;
    let targetLookAt = new THREE.Vector3(0, 3, 0);
    let currentLookAt = new THREE.Vector3(0, 3, 0);
    let userDistOffset = 0;

    let isAutoSpin = true;
    let isCamLerping = false;
    let targetCamTheta = 0.5;
    let targetCamPhi = 1.12;
    let targetDistOffset = 0;
    let targetYOffset = 0;

    const camPresets = {
      orbit: { theta: 0.5, phi: 1.12, distOffset: 0, yOffset: 0 },
      vent:  { theta: 0.0, phi: 0.55, distOffset: -16, yOffset: 5.0 },
      flank: { theta: 1.57, phi: 1.32, distOffset: -4, yOffset: 1.2 },
      plume: { theta: 0.35, phi: 1.38, distOffset: 12, yOffset: 15.0 },
      flow:  { theta: -1.42, phi: 1.42, distOffset: -10, yOffset: -1.8 }
    };

    function setCameraPreset(mode) {
      document.querySelectorAll('.cam-btn:not(#btn-cam-spin)').forEach(b => {
        b.classList.toggle('active', b.dataset.cam === mode);
      });
      const preset = camPresets[mode];
      if (!preset) return;

      targetCamTheta = preset.theta;
      targetCamPhi = preset.phi;
      targetDistOffset = preset.distOffset;
      targetYOffset = preset.yOffset;
      isCamLerping = true;
    }

    function updateCam() {
      // Dynamic camera elevation and distance based on eruptive column height
      const colNorm = clamp(state.column / 45, 0, 1);
      const intensityNorm = clamp(state.intensity / 100, 0, 1);

      // In quiescent state: focus on volcano edifice (y = 2.8, dist = 30)
      // In climactic state: smoothly elevate target and pull back so the towering plume and umbrella cloud are framed!
      const targetY = lerp(2.8 + targetYOffset, currentMaxH * 0.45 + colNorm * 7.5 + targetYOffset, intensityNorm);
      const baseDist = lerp(30, 40 + colNorm * 14, intensityNorm);
      const effDist = clamp(baseDist + userDistOffset, 8, 85);

      targetLookAt.set(0, targetY, 0);
      currentLookAt.lerp(targetLookAt, 0.08);

      camera.position.set(
        currentLookAt.x + effDist * Math.sin(camPhi) * Math.sin(camTheta),
        currentLookAt.y + effDist * Math.cos(camPhi),
        currentLookAt.z + effDist * Math.sin(camPhi) * Math.cos(camTheta)
      );
      camera.lookAt(currentLookAt);
    }
    updateCam();

    /* ── Orbit controls ── */
    let isDrag = false, lastMX = 0, lastMY = 0;
    canvas.addEventListener('mousedown', e => { isDrag = true; isCamLerping = false; lastMX = e.clientX; lastMY = e.clientY; });
    window.addEventListener('mouseup',   () => { isDrag = false; });
    canvas.addEventListener('mousemove', e => {
      if (!isDrag) return;
      camTheta -= (e.clientX - lastMX) * 0.009;
      camPhi = clamp(camPhi - (e.clientY - lastMY) * 0.007, 0.22, 1.4);
      lastMX = e.clientX; lastMY = e.clientY; updateCam();
    });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      isCamLerping = false;
      userDistOffset = clamp(userDistOffset + e.deltaY * 0.04, -22, 45);
      updateCam();
    }, { passive: false });
    let lTD = 0, lTX = 0, lTY = 0;
    canvas.addEventListener('touchstart', e => {
      isCamLerping = false;
      if (e.touches.length === 1) { isDrag = true; lTX = e.touches[0].clientX; lTY = e.touches[0].clientY; }
      if (e.touches.length === 2) lTD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }, { passive: true });
    canvas.addEventListener('touchend', () => { isDrag = false; });
    canvas.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && isDrag) {
        camTheta -= (e.touches[0].clientX - lTX) * 0.012;
        camPhi = clamp(camPhi - (e.touches[0].clientY - lTY) * 0.009, 0.22, 1.4);
        lTX = e.touches[0].clientX; lTY = e.touches[0].clientY; updateCam();
      }
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        userDistOffset = clamp(userDistOffset - (d - lTD) * 0.04, -22, 45);
        lTD = d; updateCam();
      }
    }, { passive: true });

    let conduitEngine = null;
    /* ── Resize ── */
    function resizeConduitCanvas() {
      const conduitOuter = document.getElementById('conduit-outer');
      const conduitCanvas = document.getElementById('conduit-canvas');
      if (!conduitOuter || !conduitCanvas || !conduitEngine) return;
      if (typeof conduitEngine.onResize === 'function') conduitEngine.onResize();
      else if (conduitEngine.surface?.resize) conduitEngine.surface.resize();
    }

    function onResize() {
      const W = outer.clientWidth, H = outer.clientHeight;
      if (W > 0 && H > 0) {
        renderer.setSize(W, H, false);
        camera.aspect = W / H; camera.updateProjectionMatrix();
      }
      resizeConduitCanvas();
    }
    window.addEventListener('resize', onResize);
    onResize();

    /* ══════════════════════════════════════════
       LIGHTING
    ══════════════════════════════════════════ */
    const sunLight = new THREE.DirectionalLight(0xffecd0, 1.35);
    sunLight.position.set(8, 16, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 70;
    sunLight.shadow.camera.left = -22;
    sunLight.shadow.camera.right = 22;
    sunLight.shadow.camera.top = 22;
    sunLight.shadow.camera.bottom = -22;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);
    const ambientLight = new THREE.AmbientLight(0x2d1c14, 0.9);
    scene.add(ambientLight);
    const fillLight = new THREE.DirectionalLight(0x758bc6, 0.25);
    fillLight.position.set(-6, 12, -5);
    scene.add(fillLight);

    // Lava crater glow — PointLight
    const lavaLight = new THREE.PointLight(0xff5205, 0, 24, 2);
    lavaLight.position.set(0, 6, 0);
    scene.add(lavaLight);

    // Rim-light for dramatic backlight
    const rimLight = new THREE.DirectionalLight(0xff3a10, 0);
    rimLight.position.set(0, -2, -8);
    scene.add(rimLight);

    // ── VOLCANIC LIGHTNING SYSTEM ──
    // Triboelectric charging in dense tephra plume produces branching electrical discharges
    const MAX_LIGHTNING_SEGS = 64;
    const lightningGeo = new THREE.BufferGeometry();
    const lightningPos = new Float32Array(MAX_LIGHTNING_SEGS * 2 * 3);
    lightningGeo.setAttribute('position', new THREE.BufferAttribute(lightningPos, 3));
    const lightningMat = new THREE.LineBasicMaterial({
      color: 0x9be8ff,
      linewidth: 2.0,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    const lightningMesh = new THREE.LineSegments(lightningGeo, lightningMat);
    lightningMesh.frustumCulled = false;
    scene.add(lightningMesh);

    const lightningLight = new THREE.PointLight(0x8ae0ff, 0, 35, 2);
    scene.add(lightningLight);

    let lightningTimer = 0;
    let lightningDuration = 0;

    function triggerVolcanicLightning() {
      if (state.intensity < 40 || state.column < 8) return;
      const count = 12 + Math.floor(Math.random() * 16);
      let idx = 0;
      let curX = (Math.random() - 0.5) * 1.5;
      let curY = craterPos.y + 2.5 + Math.random() * 2.0;
      let curZ = (Math.random() - 0.5) * 1.5;
      const colTop = craterPos.y + (state.column / 45) * 22;

      for (let s = 0; s < count && idx < MAX_LIGHTNING_SEGS * 2; s++) {
        const nextX = curX + (Math.random() - 0.5) * 2.2;
        const nextY = Math.min(colTop, curY + 0.8 + Math.random() * 2.2);
        const nextZ = curZ + (Math.random() - 0.5) * 2.2;

        lightningPos[idx * 3]     = curX;
        lightningPos[idx * 3 + 1] = curY;
        lightningPos[idx * 3 + 2] = curZ;
        lightningPos[(idx + 1) * 3]     = nextX;
        lightningPos[(idx + 1) * 3 + 1] = nextY;
        lightningPos[(idx + 1) * 3 + 2] = nextZ;
        idx += 2;

        // Sub-branch
        if (Math.random() > 0.55 && idx < MAX_LIGHTNING_SEGS * 2) {
          lightningPos[idx * 3]     = nextX;
          lightningPos[idx * 3 + 1] = nextY;
          lightningPos[idx * 3 + 2] = nextZ;
          lightningPos[(idx + 1) * 3]     = nextX + (Math.random() - 0.5) * 1.8;
          lightningPos[(idx + 1) * 3 + 1] = nextY + (Math.random() - 0.2) * 1.5;
          lightningPos[(idx + 1) * 3 + 2] = nextZ + (Math.random() - 0.5) * 1.8;
          idx += 2;
        }

        curX = nextX; curY = nextY; curZ = nextZ;
      }

      // Zero out remaining vertices
      for (let j = idx * 3; j < MAX_LIGHTNING_SEGS * 2 * 3; j++) lightningPos[j] = 0;
      lightningGeo.attributes.position.needsUpdate = true;

      lightningDuration = 0.08 + Math.random() * 0.12;
      lightningMat.opacity = 1.0;
      lightningLight.position.set(curX, (craterPos.y + curY) * 0.5, curZ);
      lightningLight.intensity = 8.5 + (state.intensity / 100) * 10.0;
    }

    /* ══════════════════════════════════════════
       ATMOSPHERIC SKY & HORIZON SHADER
    ══════════════════════════════════════════ */
    const skyGeo = new THREE.SphereGeometry(220, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        ashAmount: { value: 0.0 },
        sunBrightness: { value: 1.0 },
        sunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3) },
        time: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vWorldDirection;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldDirection = normalize(worldPosition.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float ashAmount;
        uniform float sunBrightness;
        uniform vec3 sunDir;
        uniform float time;
        varying vec3 vWorldDirection;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }

        void main() {
          vec3 dir = normalize(vWorldDirection);
          float elevation = clamp(dir.y, 0.0, 1.0);

          // 1. Daytime Atmospheric Rayleigh Gradient
          vec3 zenithDay = vec3(0.09, 0.22, 0.52);
          vec3 horizonDay = vec3(0.65, 0.72, 0.82);
          vec3 skyDay = mix(horizonDay, zenithDay, pow(elevation, 0.45));

          // 2. Solar Disc & Atmospheric Corona
          float cosSun = dot(dir, normalize(sunDir));
          float sunDisc = smoothstep(0.9993, 0.9998, cosSun) * sunBrightness * (1.0 - ashAmount * 0.95);
          float sunHalo = pow(max(0.0, cosSun), 16.0) * 0.65 * sunBrightness * (1.0 - ashAmount * 0.8);
          vec3 sunColor = vec3(1.0, 0.92, 0.78) * (sunDisc * 8.0 + sunHalo * 1.5);

          // 3. Twilight & Golden Hour Scattering (when sun is low)
          float sunElev = normalize(sunDir).y;
          float sunsetFactor = clamp(1.0 - abs(sunElev) * 2.5, 0.0, 1.0);
          vec3 sunsetHorizon = vec3(0.85, 0.42, 0.15);
          skyDay = mix(skyDay, sunsetHorizon, sunsetFactor * (1.0 - elevation));

          // 4. Night Sky & Scintillating Star Field
          vec3 nightSky = vec3(0.015, 0.022, 0.035);
          if (elevation > 0.04 && sunBrightness < 0.3) {
            float starN = hash(floor(dir.xz * 180.0));
            if (starN > 0.985) {
              float twinkle = 0.5 + 0.5 * sin(time * 6.0 + starN * 62.0);
              nightSky += vec3(0.75, 0.85, 1.0) * twinkle * (1.0 - sunBrightness * 3.3) * (elevation * 1.5);
            }
          }

          // Blend Day into Night
          vec3 ambientSky = mix(nightSky, skyDay + sunColor, clamp(sunBrightness * 1.2, 0.0, 1.0));

          // 5. Volcanic Ash Umbrella Overcast & Atmospheric Occlusion
          // Eerie copper-sulfur twilight at horizon, deep ash darkness overhead
          vec3 zenithAsh = vec3(0.018, 0.014, 0.012);
          vec3 horizonAsh = vec3(0.42, 0.18, 0.07);
          float ashNoise = noise(dir.xz * 4.5 + vec2(time * 0.02, 0.0)) * 0.18;
          vec3 ashSkyColor = mix(horizonAsh, zenithAsh, clamp(pow(elevation, 0.55) + ashNoise, 0.0, 1.0));

          vec3 finalColor = mix(ambientSky, ashSkyColor, clamp(ashAmount * 1.45, 0.0, 1.0));

          // 6. Distant Horizon Mountain Silhouette Skirt (eliminates empty void boundary)
          if (dir.y >= 0.0 && dir.y < 0.075) {
            float mH = sin(dir.x * 22.0) * 0.012 + sin(dir.x * 9.0 + 1.2) * 0.018 + 0.022;
            if (dir.y < mH) {
              float mDist = (dir.y / mH);
              vec3 ridgeColor = mix(vec3(0.12, 0.15, 0.20), horizonDay * 0.6, 0.45);
              if (ashAmount > 0.2) ridgeColor = mix(ridgeColor, horizonAsh * 0.4, ashAmount);
              finalColor = mix(ridgeColor, finalColor, mDist * 0.65);
            }
          }

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    function updateSky(intensity) {
      const t = intensity / 100;
      skyMat.uniforms.ashAmount.value = t;

      // Update fog to match the horizon color of the shader so terrain blends seamlessly
      let r, g, b;
      if (t < 0.22) {
        // Clear daytime atmosphere
        const f = t / 0.22;
        r = lerp(0.65, 0.55, f); g = lerp(0.72, 0.50, f); b = lerp(0.82, 0.40, f);
      } else if (t < 0.6) {
        // Transition into volcanic ash horizon
        const f = (t - 0.22) / 0.38;
        r = lerp(0.55, 0.42, f); g = lerp(0.50, 0.22, f); b = lerp(0.40, 0.12, f);
      } else {
        // Deep ash stratospheric darkening
        const f = (t - 0.6) / 0.4;
        r = lerp(0.42, 0.18, f); g = lerp(0.22, 0.08, f); b = lerp(0.12, 0.04, f);
      }

      scene.fog.color.setRGB(r, g, b);
      scene.fog.density = lerp(0.008, 0.030, t);
    }

    /* ══════════════════════════════════════════
       TERRAIN
    ══════════════════════════════════════════ */
    const TERRAIN_SEGS = 200;
    const TERRAIN_SIZE = 40;

    // Advanced Geomorphological Volcano Elevation Model
    function volcanoH(x, z, vtype, stage = 0) {
      const isProcedural = (state.mode === 'exploration' && !activeEruption);
      const hmap = !isProcedural ? heightmaps[activeEruption] : null;

      if (hmap) {
        // Continuous UV coordinate mapping
        const u = (x + TERRAIN_SIZE / 2) / TERRAIN_SIZE;
        const v = (z + TERRAIN_SIZE / 2) / TERRAIN_SIZE;
        let rawH = sampleHeightmap(hmap, u, v) * 12.0;

        // Sub-grid geological micro-relief to eliminate 8-bit stairstepping
        const micro = (fbm(x * 0.45 + 12.3, z * 0.45 + 87.1, 3) - 0.5) * 0.14
                    + (fbm(x * 1.4 + 54.1, z * 1.4 + 21.7, 2) - 0.5) * 0.04;
        rawH += micro;

        // Dynamic historical morphological changes:
        if (activeEruption === 'sthelenr1980') {
          if (stage < 0.15 && z < 0) {
            // March-May cryptodome bulge growth on north flank
            const dBulge = Math.hypot(x, z + 2.0);
            if (dBulge < 3.8) {
              rawH += (stage / 0.15) * 1.6 * Math.pow(1 - dBulge / 3.8, 2);
            }
          } else if (stage >= 0.15 && z < 0) {
            // Catastrophic debris avalanche and north amphitheater collapse
            const collapse = Math.min(1, (stage - 0.15) / 0.12);
            const r = Math.hypot(x, z);
            const R = TERRAIN_SIZE * 0.38;
            const blastR = r / R;
            if (blastR < 1.0) {
              const sector = Math.abs(z) / (r + 0.001);
              const chute = Math.max(0, 1 - Math.abs(x) / 4.2);
              const sink = collapse * 5.2 * Math.pow(Math.max(0, 1 - blastR * 0.85), 1.6) * sector * (0.6 + chute * 0.4);
              rawH -= sink;
            }
          }
        }

        if ((activeEruption === 'tambora1815' || activeEruption === 'krakatoa1883') && stage > 0) {
          const collapseStart = activeEruption === 'tambora1815' ? 0.52 : 0.62;
          const collapseStage = Math.min(1, Math.max(0, (stage - collapseStart) / 0.22));
          if (collapseStage > 0) {
            const r = Math.hypot(x, z);
            const collR = activeEruption === 'tambora1815' ? 7.2 : 6.0;
            if (r < collR) {
              const depth = activeEruption === 'tambora1815' ? 8.2 : 9.5;
              rawH -= Math.pow(1 - r / collR, 1.7) * collapseStage * depth;
            }
          }
        }

        if (activeEruption === 'eyja2010' && stage >= 0.14) {
          const meltStage = Math.min(1, (stage - 0.14) / 0.20);
          const r = Math.hypot(x, z);
          if (r < 3.5) {
            rawH -= meltStage * 1.5 * Math.pow(1 - r / 3.5, 2);
          }
        }

        // Smooth perimeter falloff to ambient landscape (eliminates floating slab / cliff edges)
        const boxDist = Math.max(Math.abs(x), Math.abs(z)) / (TERRAIN_SIZE * 0.5);
        const isIsland = (vtype === 'shield' || activeEruption === 'krakatoa1883' || activeEruption === 'maunaloa2022');
        if (isIsland && activeEruption === 'krakatoa1883') {
          rawH = Math.max(-0.55, rawH - 0.28);
        }
        const baseH = isIsland ? -0.45 : 0.08;
        if (boxDist <= 0.65) return rawH;
        if (boxDist >= 0.98) return baseH;
        const t = (boxDist - 0.65) / 0.33;
        const s = t * t * t * (t * (t * 6 - 15) + 10);
        return lerp(rawH, baseH, s);
      }

      // Procedural Geomorphological Models (Exploration Mode)
      const r = Math.hypot(x, z);
      const R = TERRAIN_SIZE * 0.38;
      const theta = Math.atan2(z, x);
      const noise = (fbm(x * 0.16 + 1.7, z * 0.16 + 4.9, 5) - 0.5) * 1.1;
      const micro = (fbm(x * 0.65 + 99.1, z * 0.65 + 33.4, 3) - 0.5) * 0.28;
      const base  = (fbm(x * 0.07, z * 0.07, 3) - 0.5) * 0.5;

      let h = 0;
      switch (vtype) {
        case 'shield': {
          // Broad, low-angle basaltic shield (slopes 4°-8°)
          const normR = r / (R * 1.15);
          const shieldSlope = Math.exp(-Math.pow(normR, 1.6) * 2.8);
          h = 5.2 * shieldSlope + noise * 0.22 + micro * 0.12;

          // Southwest & Northeast rift zone swells
          const riftAngle = 0.55;
          const xRot = x * Math.cos(riftAngle) - z * Math.sin(riftAngle);
          const zRot = x * Math.sin(riftAngle) + z * Math.cos(riftAngle);
          const riftSwell = 0.65 * Math.exp(-Math.pow(xRot / 2.0, 2)) * Math.exp(-Math.pow(zRot / 12.0, 2));
          h += riftSwell;

          // Summit caldera (Moku'aweoweo style pit crater)
          const craterR = R * 0.14;
          if (r < craterR) {
            const pitDepth = 1.35 * Math.pow(1 - r / craterR, 0.4);
            h -= pitDepth;
          }
          const rim = Math.exp(-Math.pow((r - craterR) / 0.5, 2)) * 0.45;
          h += rim;
          break;
        }
        case 'strato': {
          // Concave composite cone with steepening slopes toward the summit (10° to 33°)
          const k = clamp(1 - r / R, 0, 1);
          const cone = 11.8 * (Math.pow(k, 2.5) * 0.78 + Math.pow(k, 1.4) * 0.22);

          // Deep radial barrancos (drainage erosion ribs)
          const ribHarmonics = Math.sin(theta * 7 + Math.sin(theta * 3) * 0.5) * 0.7
                             + Math.sin(theta * 14 + 1.8) * 0.3;
          const valleys = ribHarmonics * 0.85 * Math.pow(k, 1.5) * (1 - Math.exp(-r / 2.2));

          // Asymmetric summit crater with central dacite dome
          const craterR = R * 0.10;
          let crater = 0;
          if (r < craterR) {
            crater = -2.6 * Math.pow(1 - r / craterR, 1.8);
            const domeR = craterR * 0.55;
            if (r < domeR) {
              crater += 1.4 * Math.exp(-Math.pow(r / (domeR * 0.65), 2));
            }
          }
          const rim = Math.exp(-Math.pow((r - craterR) / 0.65, 2)) * (0.95 + Math.sin(theta * 4) * 0.25);

          // Flank adventive cinder cone on lower flank
          const adventDist = Math.hypot(x - 5.5, z - 4.5);
          const adventCone = 1.6 * Math.exp(-Math.pow(adventDist / 1.8, 2));

          h = cone + valleys + crater + rim + adventCone + noise * 0.35 + micro * 0.16;
          break;
        }
        case 'caldera': {
          // Stratocone with colossal collapsed caldera depression
          const k = clamp(1 - r / R, 0, 1);
          const outerFlanks = 8.5 * Math.pow(k, 2.2) + noise * 0.32;
          const cRim = R * 0.28;
          let caldera = 0;
          if (r < cRim) {
            const wallT = r / cRim;
            const sink = -5.8 * (1 - Math.pow(wallT, 4.0));
            caldera = sink;

            // Central resurgent cone (Wizard Island style)
            const resurgR = cRim * 0.38;
            if (r < resurgR) {
              const resurgCone = 2.2 * Math.pow(1 - r / resurgR, 1.8);
              const resurgCrater = r < resurgR * 0.25 ? -0.5 * (1 - r / (resurgR * 0.25)) : 0;
              caldera += resurgCone + resurgCrater;
            }
          }
          const rim = Math.exp(-Math.pow((r - cRim) / 0.7, 2)) * 0.9;
          h = outerFlanks + caldera + rim + micro * 0.14;
          break;
        }
        case 'super': {
          // Resurgent supervolcano (Yellowstone-scale caldera basin)
          const rimR = R * 0.65;
          const rimScarp = 4.2 * Math.exp(-Math.pow((r - rimR) / (R * 0.22), 2)) + noise * 0.45;
          const basinFloor = 2.4 + (fbm(x * 0.12, z * 0.12, 3) - 0.5) * 0.6;
          const dome1 = 2.1 * Math.exp(-(Math.pow(x - 2.5, 2) + Math.pow(z + 1.5, 2)) / 8.0);
          const dome2 = 1.8 * Math.exp(-(Math.pow(x + 3.0, 2) + Math.pow(z - 2.0, 2)) / 7.0);
          h = Math.max(rimScarp, basinFloor + dome1 + dome2) + micro * 0.18;
          break;
        }
        case 'cinder': {
          // Steep monogenetic scoria cone at 32° angle of repose
          const k = clamp(1 - r / (R * 0.58), 0, 1);
          const cone = 6.2 * Math.pow(k, 1.8);
          const cR = R * 0.16;
          let crater = 0;
          if (r < cR) {
            crater = -2.2 * Math.pow(1 - r / cR, 1.6);
          }
          let breach = 0;
          if (z > 0 && Math.abs(x) < 2.0 && r > cR * 0.8) {
            breach = -1.5 * (1 - Math.abs(x) / 2.0) * Math.min(1, (r - cR * 0.8) / 3.0);
          }
          const rim = Math.exp(-Math.pow((r - cR) / 0.5, 2)) * 0.7;
          h = cone + crater + breach + rim + noise * 0.18 + micro * 0.1;
          break;
        }
      }

      // Smooth edge falloff to ambient landscape
      const boxDist = Math.max(Math.abs(x), Math.abs(z)) / (TERRAIN_SIZE * 0.5);
      const isIsland = (vtype === 'shield' || activeEruption === 'krakatoa1883' || activeEruption === 'maunaloa2022');
      const baseH = isIsland ? -0.45 : 0.08;
      if (boxDist <= 0.65) {
        return Math.max(baseH, h);
      } else if (boxDist >= 0.98) {
        return baseH;
      } else {
        const t = (boxDist - 0.65) / 0.33;
        const s = t * t * t * (t * (t * 6 - 15) + 10);
        return Math.max(baseH, lerp(h, baseH, s));
      }
    }

    // High-Fidelity Geological Vertex Coloring & Slope Shading
    function terrainColor(x, z, y, maxH, vtype, lavaIntensity, stage = 0) {
      const r = Math.hypot(x, z);
      const theta = Math.atan2(z, x);
      const hFrac = clamp(y / Math.max(0.1, maxH), 0, 1);

      // Local slope grade calculation
      const eps = 0.25;
      const hL = volcanoH(x - eps, z, vtype, stage);
      const hR = volcanoH(x + eps, z, vtype, stage);
      const hD = volcanoH(x, z - eps, vtype, stage);
      const hU = volcanoH(x, z + eps, vtype, stage);
      const slopeGrade = Math.hypot(hL - hR, hD - hU) / (eps * 2.0);
      const cliff = clamp((slopeGrade - 0.25) / 0.55, 0, 1);

      // Procedural height noise variance
      const nH = clamp(hFrac + (fbm(x * 0.35, z * 0.35, 3) - 0.5) * 0.12, 0, 1);

      // Geological strata layering for cliffs & rock faces
      const strata = Math.sin(y * 6.5 + fbm(x * 0.8, z * 0.8, 2) * 2.2) * 0.5 + 0.5;
      const rockTone = lerp(0.24, 0.46, strata);
      const cliffColor = [rockTone * 1.05, rockTone * 0.98, rockTone * 0.92];

      let rC, gC, bC;

      if (activeEruption === 'eyja2010') {
        // Icelandic subglacial volcano: summit glacier, retreat, jökulhlaup mudflows, mossy tundra
        const melt = clamp(stage / 0.35, 0, 1);
        const snowLine = 0.48 + melt * 0.38;
        if (nH > snowLine) {
          // Summit glacier ice cap with cyan crevasse shading
          rC = 0.92; gC = 0.95; bC = 0.98;
          if (cliff > 0.4) { rC = 0.65; gC = 0.78; bC = 0.88; }
        } else if (nH > snowLine - 0.22 && melt > 0.04) {
          // Dynamic jökulhlaup meltwater runout / wet basalt tephra
          rC = 0.14; gC = 0.14; bC = 0.15;
        } else if (nH < 0.20) {
          // Mossy arctic tundra
          rC = 0.26; gC = 0.34; bC = 0.20;
        } else {
          // Dark basaltic volcanic rock
          rC = 0.32; gC = 0.30; bC = 0.29;
        }
      } else if (vtype === 'shield' || activeEruption === 'maunaloa2022') {
        // Hawaiian basalt: dark pahoehoe/a'a, oxidized spatter, coastal fringe
        if (nH < 0.08 && r > TERRAIN_SIZE * 0.28) {
          rC = 0.22; gC = 0.32; bC = 0.18; // tropical coastal fringe
        } else if (cliff > 0.6 || (r < TERRAIN_SIZE * 0.15 && Math.sin(theta * 5.0) > 0.2)) {
          rC = 0.38; gC = 0.18; bC = 0.12; // oxidized reddish spatter rampart
        } else {
          rC = 0.12; gC = 0.12; bC = 0.13; // dark tholeiitic basalt
        }
      } else if (vtype === 'cinder') {
        // Scoria cone: rusty oxidized iron lapilli and charcoal cinder
        const scoria = lerp(0.36, 0.18, nH);
        rC = scoria; gC = scoria * 0.55; bC = scoria * 0.45;
      } else if (vtype === 'strato') {
        // Stratovolcano: Lush basal forest, subalpine talus, craggy rock, snow/glacier summit
        if (nH < 0.20) {
          rC = 0.22; gC = 0.38; bC = 0.18; // forest
        } else if (nH < 0.55) {
          rC = 0.44; gC = 0.39; bC = 0.34; // volcanic dirt & colluvium
        } else if (nH < 0.78) {
          rC = 0.54; gC = 0.51; bC = 0.48; // andesite bedrock
        } else {
          rC = 0.94; gC = 0.95; bC = 0.98; // summit snow cap
        }
        // Fumarolic sulfur staining near summit vent
        if (r < 2.5 && nH > 0.75) {
          rC = lerp(rC, 0.85, 0.6);
          gC = lerp(gC, 0.82, 0.6);
          bC = lerp(bC, 0.25, 0.6);
        }
      } else {
        // Caldera / Supervolcano: Ignimbrite tuff, hydrothermal terraces
        if (nH < 0.18) {
          rC = 0.32; gC = 0.36; bC = 0.28;
        } else if (nH < 0.65) {
          rC = 0.54; gC = 0.50; bC = 0.44; // pumice tuff
        } else {
          rC = 0.62; gC = 0.58; bC = 0.52; // pale rhyolite
        }
        // Hydrothermal basin yellow/orange sinter terraces
        if (r < 4.0 && nH > 0.25 && nH < 0.50) {
          rC = 0.78; gC = 0.65; bC = 0.22;
        }
      }

      // Blend in exposed cliff rock on steep angles (preserving summit glacial ice/snow)
      const isSnow = (rC > 0.85 && gC > 0.88 && bC > 0.90);
      if (isSnow) {
        rC = lerp(rC, 0.65, cliff * 0.45);
        gC = lerp(gC, 0.78, cliff * 0.45);
        bC = lerp(bC, 0.90, cliff * 0.45);
      } else {
        rC = lerp(rC, cliffColor[0], cliff * 0.75);
        gC = lerp(gC, cliffColor[1], cliff * 0.75);
        bC = lerp(bC, cliffColor[2], cliff * 0.75);
      }

      // Micro-noise color variance
      const colorNoise = (fbm(x * 0.85, z * 0.85, 2) - 0.5) * 0.08;
      return [
        clamp(rC + colorNoise, 0, 1),
        clamp(gC + colorNoise, 0, 1),
        clamp(bC + colorNoise, 0, 1)
      ];
    }

    // Ocean plane for island volcanoes
    const oceanGeo = new THREE.PlaneGeometry(TERRAIN_SIZE * 3.2, TERRAIN_SIZE * 3.2, 1, 1);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0c3254, roughness: 0.14, metalness: 0.75,
      transparent: true, opacity: 0.90
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.visible = false;
    scene.add(ocean);

    // Caldera lake water body (for collapsed calderas e.g. Pinatubo, Tambora, Crater Lake)
    const calderaLakeGeo = new THREE.CircleGeometry(6.2, 48);
    calderaLakeGeo.rotateX(-Math.PI / 2);
    const calderaLakeMat = new THREE.MeshStandardMaterial({
      color: 0x127b72, roughness: 0.12, metalness: 0.25,
      transparent: true, opacity: 0.88
    });
    const calderaLake = new THREE.Mesh(calderaLakeGeo, calderaLakeMat);
    calderaLake.visible = false;
    scene.add(calderaLake);

    // Regional landscape skirt (seamlessly continues terrain to horizon)
    const skirtGeo = new THREE.PlaneGeometry(TERRAIN_SIZE * 3.5, TERRAIN_SIZE * 3.5, 32, 32);
    skirtGeo.rotateX(-Math.PI / 2);
    const skirtPos = skirtGeo.attributes.position;
    for (let k = 0; k < skirtPos.count; k++) {
      const sx = skirtPos.getX(k), sz = skirtPos.getZ(k);
      const sDist = Math.max(Math.abs(sx), Math.abs(sz));
      const sEdge = Math.max(0, (sDist - TERRAIN_SIZE * 0.48) / (TERRAIN_SIZE * 0.7));
      skirtPos.setY(k, 0.08 - sEdge * 1.8);
    }
    skirtGeo.computeVertexNormals();
    const skirtMat = new THREE.MeshStandardMaterial({
      color: 0x2e3028,
      roughness: 0.92,
      metalness: 0.02,
      normalMap: volcanicMaps.normalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: volcanicMaps.roughnessMap
    });
    const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
    skirtMesh.receiveShadow = true;
    scene.add(skirtMesh);

    // Detail texture for PBR material
    const texLoader = new THREE.TextureLoader();
    const rockTex = texLoader.load('../../assets/images/lessons/rock-cycle/gneiss.webp');
    rockTex.wrapS = rockTex.wrapT = THREE.RepeatWrapping;
    rockTex.repeat.set(12, 12);
    rockTex.encoding = THREE.sRGBEncoding;

    const gritTex = volcanicMaps.roughnessMap;
    skirtMat.map = rockTex;

    let terrainMesh = null;
    let craterPos = new THREE.Vector3(0, 10, 0);
    const lavaStreamGroup = new THREE.Group();
    scene.add(lavaStreamGroup);

    // A bounded shallow-layer teaching model (LiquidEngine.DepthField):
    // material moves to lower terrain + deposit surfaces, splits between
    // outlets, and fills hollows. Cooling immobilizes crust. The draped mesh is
    // an illustrative surface, not a hazard forecast or a numerical
    // lava-inundation model. Units and time are illustrative.
    const LAVA_N = 101, LAVA_STEP = 0.4;
    const lavaField = new LiquidEngine.DepthField({ material: 'lava', cols: LAVA_N, cellSize: LAVA_STEP });

    // Custom HDR incandescent blackbody shader material for lava deposit
    const lavaDepositMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        fluidity: { value: 0.5 },
        threshold: { value: 0.018 }
      },
      vertexShader: `
        varying vec2 flowUV;
        varying vec2 lavaState;
        attribute vec2 deposit;
        void main() {
          flowUV = uv;
          lavaState = deposit;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float fluidity;
        uniform float threshold;
        varying vec2 flowUV;
        varying vec2 lavaState;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                     mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
        }
        void main() {
          if (lavaState.x < threshold) discard;
          float heatLevel = clamp(lavaState.y, 0.0, 1.0);
          vec2 p = flowUV * 2.4;
          p.y -= time * 0.16 * heatLevel * fluidity;

          // Multi-octave convective crust fissures
          float n1 = noise(p + noise(p * 0.5) * 2.2);
          float n2 = noise(p * 2.8 + vec2(time * 0.08, -time * 0.12));
          float n = mix(n1, n2, 0.35);

          // Glowing fracture cracks opening between cooling crust plates
          float crackDist = abs(n - 0.5);
          float cracks = 1.0 - smoothstep(0.012, 0.10, crackDist);
          float coreCrack = 1.0 - smoothstep(0.004, 0.035, crackDist);

          // Blackbody temperature curve (1200°C core down to 500°C basalt crust)
          vec3 chilledCrust = mix(vec3(0.012, 0.011, 0.014), vec3(0.040, 0.034, 0.032), n);
          vec3 deepRedMolten = vec3(1.1, 0.10, 0.01);
          vec3 vividOrange = vec3(2.5, 0.72, 0.05);
          vec3 whiteHotCore = vec3(3.5, 2.4, 0.95);

          float heat = heatLevel * (0.22 + cracks * 0.78);
          vec3 moltenColor = mix(deepRedMolten, vividOrange, smoothstep(0.2, 0.7, heat));
          moltenColor = mix(moltenColor, whiteHotCore, coreCrack * heatLevel);

          vec3 finalColor = mix(chilledCrust, moltenColor, smoothstep(0.12, 0.75, heat));
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const lavaDeposit = createDepthFieldMesh(THREE, lavaField, { subdivisions: 2, material: lavaDepositMat });
    lavaStreamGroup.add(lavaDeposit.mesh);

    // ══════════════════════════════════════════
    // VOLUMETRIC PLUME COLUMN & UMBRELLA CANOPY
    // ══════════════════════════════════════════
    // Empirical fluid dynamics (Morton, Taylor & Turner 1956; Sparks 1986; Mastin et al. 2009 USGS)
    const PLUME_RADIAL_SEGS = 64;
    const PLUME_HEIGHT_SEGS = 72;
    const plumeCoreGeo = new THREE.CylinderGeometry(1, 1, 1, PLUME_RADIAL_SEGS, PLUME_HEIGHT_SEGS, true);
    plumeCoreGeo.translate(0, 0.5, 0);

    const plumeCoreMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: true,
      uniforms: {
        craterPos: { value: new THREE.Vector3(0, 10, 0) },
        plumeHeight: { value: 20.0 },
        ventRadius: { value: 0.8 },
        umbrellaRadius: { value: 12.0 },
        intensity: { value: 0.7 },
        time: { value: 0.0 },
        wind: { value: new THREE.Vector2(0, 0) },
        sunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3) },
        sunColor: { value: new THREE.Color(0xffecd0) },
        ambientColor: { value: new THREE.Color(0x352824) },
        lavaGlow: { value: 0.0 }
      },
      vertexShader: `
        uniform vec3 craterPos;
        uniform float plumeHeight;
        uniform float ventRadius;
        uniform float umbrellaRadius;
        uniform float intensity;
        uniform float time;
        uniform vec2 wind;

        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vNormY;
        varying float vCraterGlow;
        varying float vBillow;

        // Dave Hoskins 3D hash with decorrelating offset (never evaluates to 0)
        float hash(vec3 p) {
          p = fract((p + vec3(71.17, 31.41, 19.83)) * 0.1031);
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
        }

        float noise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }

        float fbm(vec3 p) {
          float v = 0.0;
          float a = 0.55;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = p * 2.05 + vec3(0.15, -0.25, 0.35);
            a *= 0.48;
          }
          return v;
        }

        void main() {
          float yNorm = clamp(position.y, 0.0, 1.0);
          vNormY = yNorm;

          // Empirical Volcanological Plume Profile (Morton, Taylor, Turner + Mastin 2009):
          // 0.0 to 0.65: Convective trunk (linear air entrainment b(z) ~ alpha * z)
          // 0.65 to 0.88: Stratospheric umbrella expansion (gravity current spreading at NBL)
          // 0.88 to 1.00: Momentum overshoot dome closing inward to peak
          float R = ventRadius;
          float trunkTopR = ventRadius + umbrellaRadius * 0.22;
          float ny = 0.0;

          if (yNorm < 0.65) {
            float tTrunk = yNorm / 0.65;
            R = mix(ventRadius, trunkTopR, pow(tTrunk, 0.85));
            ny = -0.15;
          } else if (yNorm < 0.88) {
            float tUmb = (yNorm - 0.65) / 0.23;
            float expansion = sin(tUmb * 1.5707963);
            R = mix(trunkTopR, umbrellaRadius, expansion);
            ny = -0.55 * (1.0 - tUmb);
          } else {
            float tDome = (yNorm - 0.88) / 0.12;
            float contraction = cos(tDome * 1.5707963);
            R = umbrellaRadius * contraction;
            ny = 0.85 * tDome;
          }

          vec2 radialDir = normalize(position.xz);
          if (length(position.xz) < 0.0001) radialDir = vec2(1.0, 0.0);

          float worldY = craterPos.y + yNorm * plumeHeight;
          vec3 unperturbedPos = vec3(craterPos.x + radialDir.x * R, worldY, craterPos.z + radialDir.y * R);

          // Multi-frequency turbulent billow displacement in 3D space across column & umbrella
          float flowSpeed = time * (1.6 + intensity * 2.4);
          vec3 turbCoord1 = vec3(unperturbedPos.x * 0.22, worldY * 0.28 - flowSpeed, unperturbedPos.z * 0.22);
          vec3 turbCoord2 = turbCoord1 * 2.2 + vec3(5.2, 1.8, 8.4);
          float billow1 = fbm(turbCoord1);
          float billow2 = fbm(turbCoord2);
          float billow = billow1 * 0.68 + billow2 * 0.32;
          vBillow = billow;

          float billowAmp = 0.45 + R * 0.28;
          float rDisplace = (billow - 0.44) * billowAmp;
          float effectiveR = max(0.2, R + rDisplace);

          vec3 basePos = vec3(craterPos.x + radialDir.x * effectiveR, worldY, craterPos.z + radialDir.y * effectiveR);

          // Vertical billow churning (lumpy umbrella dome & convective boiling)
          basePos.y += (billow - 0.45) * (0.6 + R * 0.25);

          // Stratospheric wind shear advection
          float windShear = pow(clamp((yNorm - 0.18) / 0.82, 0.0, 1.0), 1.4);
          basePos.x += wind.x * windShear * (3.8 + plumeHeight * 0.28);
          basePos.z += wind.y * windShear * (3.8 + plumeHeight * 0.28);

          vWorldPos = basePos;
          vec3 nPerturb = vec3(
            radialDir.x * 0.85 + (billow1 - 0.5) * 0.55,
            ny + (billow2 - 0.5) * 0.65,
            radialDir.y * 0.85 + (billow1 - 0.5) * 0.55
          );
          vNormal = normalize(nPerturb);
          vCraterGlow = clamp((1.0 - yNorm / 0.18), 0.0, 1.0) * intensity;

          gl_Position = projectionMatrix * viewMatrix * vec4(basePos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        uniform vec3 ambientColor;
        uniform vec3 craterPos;
        uniform float lavaGlow;
        uniform float intensity;

        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vNormY;
        varying float vCraterGlow;
        varying float vBillow;

        void main() {
          if (intensity <= 0.01) discard;

          vec3 norm = normalize(vNormal);
          vec3 sunD = normalize(sunDir);

          float NdotL = dot(norm, sunD);
          float wrapLight = max(0.0, (NdotL + 0.32) / 1.32);
          float creviceShadow = smoothstep(-0.25, 0.45, NdotL);

          // Volcanic tephra albedo:
          // Juvenile basaltic scoria at vent -> weathered dacitic/pumice ash aloft
          vec3 juvenileBasalt = vec3(0.18, 0.17, 0.16);
          vec3 weatheredTephra = vec3(0.32, 0.30, 0.28);
          vec3 pumiceAloft = vec3(0.55, 0.52, 0.49);

          vec3 ashAlbedo;
          if (vNormY < 0.35) {
            ashAlbedo = mix(juvenileBasalt, weatheredTephra, vNormY / 0.35);
          } else {
            ashAlbedo = mix(weatheredTephra, pumiceAloft, (vNormY - 0.35) / 0.65);
          }

          // Ambient + Sun illumination with crevice self-shadowing
          vec3 litAsh = ashAlbedo * (ambientColor * 2.2 + sunColor * (0.24 + wrapLight * 1.15 * creviceShadow));

          vec3 toCrater = craterPos - vWorldPos;
          float cDist2 = dot(toCrater, toCrater);
          float cLight = clamp((lavaGlow + 1.2) * (18.0 / (cDist2 + 2.5)), 0.0, 1.2);
          vec3 throatIncandescence = vec3(2.6, 0.80, 0.08) * vCraterGlow * 1.5;
          vec3 undersideGlow = vec3(1.4, 0.42, 0.05) * cLight * max(0.0, -norm.y);

          vec3 finalColor = litAsh + throatIncandescence + undersideGlow;
          float alpha = clamp(intensity * 1.5, 0.0, 0.98);
          gl_FragColor = vec4(finalColor, alpha);
        }
      `
    });

    const plumeCoreMesh = new THREE.Mesh(plumeCoreGeo, plumeCoreMat);
    plumeCoreMesh.frustumCulled = false;
    plumeCoreMesh.visible = false;
    scene.add(plumeCoreMesh);

    function resetLavaField() {
      lavaField.reset();
      lavaFlow?.clear();
      syncLavaField();
    }

    function resetPdcField() {
      pyroPool?.clear();
      pyroSurgePool?.clear();
      resetEnvironments();
    }

    function rebuildLavaStreams() {
      lavaField.setGround(terrainHeightAt);
      lavaDeposit.setGround(terrainHeightAt);
      lavaField.clearSources();
      const rimRadius = state.vtype === 'super' ? 9 : state.vtype === 'caldera' ? 2.7 : 1.5;
      for (let sector = 0; sector < 5; sector++) {
        let best = null, high = -Infinity;
        for (let j = 0; j < 14; j++) {
          const angle = (sector + j / 14) * Math.PI * 2 / 5;
          for (let r = rimRadius * 0.75; r <= rimRadius * 1.25; r += LAVA_STEP) {
            const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
            const ground = lavaField.ground[lavaField.cellAt(x, z)];
            if (ground > high) { high = ground; best = [x, z]; }
          }
        }
        if (best) lavaField.addSource(best[0], best[1], 1.2);
      }
      syncLavaField();
    }

    function syncLavaField() {
      lavaDeposit.sync();
      const { covered, hot, maxDepth, volume, supplied, balanceError } = lavaField.stats();
      const status = document.getElementById('lava-flow-status');
      if (status) status.textContent = covered === 0 ? 'No lava deposited yet.'
        : `${covered} model cells covered · ${hot} still hot · crust remains as lava cools.`;
      document.getElementById('lava-diagnostics').textContent = `${covered} covered cells · ${hot} hot cells · max depth ${maxDepth.toFixed(2)} model units · supplied ${supplied.toFixed(3)} · stored ${volume.toFixed(3)} model volume units · balance error ${balanceError.toExponential(2)}`;
      lavaDeposit.mesh.userData.diagnostics = { covered, hot, maxDepth, volume };
    }

    function updateLavaField(dt) {
      if (state.intensity === 0 && !lavaDeposit.mesh.visible) return;
      lavaField.fluidity = 1 - state.viscosity / 100;
      lavaField.supply = state.intensity / 100;
      if (lavaField.update(dt)) syncLavaField();
    }

    function buildTerrain(vtype, lavaIntensity) {
      if (terrainMesh) { scene.remove(terrainMesh); terrainMesh.geometry.dispose(); }

      const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
      geo.rotateX(-Math.PI / 2);

      const hasColormap = !!(activeEruption && colormaps[activeEruption]);
      const mapTex = hasColormap ? colormaps[activeEruption] : rockTex;
      if (mapTex) {
        mapTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        map: mapTex,
        normalMap: volcanicMaps.normalMap,
        normalScale: new THREE.Vector2(0.85, 0.85),
        roughnessMap: volcanicMaps.roughnessMap,
        roughness: 0.86,
        metalness: 0.03
      });

      mat.userData.uniforms = {
        uTime: { value: 0 },
        uDetailTex: { value: volcanicMaps.detailMap },
        uHasColormap: { value: hasColormap ? 1.0 : 0.0 },
        uTimeline: { value: state.timeline },
        uIntensity: { value: state.intensity },
        uCraterPos: { value: craterPos.clone() },
        uWind: { value: new THREE.Vector2(wind.x, wind.z) },
        uMaxH: { value: currentMaxH },
        uPyroActivity: { value: state.pyro }
      };

      mat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, mat.userData.uniforms);

        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
           varying vec3 vTerrainWorldPos;
           varying vec3 vTerrainWorldNormal;
           varying float vTerrainSlope;
          `
        );

        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vec4 twp = modelMatrix * vec4(position, 1.0);
           vTerrainWorldPos = twp.xyz;
           vTerrainWorldNormal = normalize(mat3(modelMatrix) * normal);
           vTerrainSlope = 1.0 - clamp(vTerrainWorldNormal.y, 0.0, 1.0);
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           uniform sampler2D uDetailTex;
           uniform float uHasColormap;
           uniform float uTimeline;
           uniform float uIntensity;
           uniform vec3 uCraterPos;
           uniform vec2 uWind;
           uniform float uMaxH;
           uniform float uPyroActivity;

           varying vec3 vTerrainWorldPos;
           varying vec3 vTerrainWorldNormal;
           varying float vTerrainSlope;
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           // High-frequency multi-scale procedural rock detail
           vec2 microUV1 = vTerrainWorldPos.xz * 0.45;
           vec2 microUV2 = vTerrainWorldPos.xz * 1.8;
           float rockGrit1 = texture2D(uDetailTex, microUV1).r;
           float rockGrit2 = texture2D(uDetailTex, microUV2).g;
           float microDetail = (rockGrit1 * 0.65 + rockGrit2 * 0.35);

           // Geological rock strata on cliffs & steep slopes
           float strata = sin(vTerrainWorldPos.y * 6.5 + microDetail * 2.2) * 0.5 + 0.5;
           float cliffFactor = smoothstep(0.32, 0.75, vTerrainSlope);

           // Detect glacial snow or ice cover from albedo (high brightness and cool hue)
           bool isSnowOrIce = (diffuseColor.r > 0.62 && diffuseColor.g > 0.65 && diffuseColor.b > 0.68);

           if (uHasColormap > 0.5) {
             // SATELLITE FUSION:
             // Modulate low-res satellite albedo with micro rock detail to eliminate pixelation
             diffuseColor.rgb *= (0.78 + microDetail * 0.44);

             if (isSnowOrIce) {
               // Glacial ice & snow: preserve pristine white/cyan ice albedo with subtle crevasse strata
               vec3 glacierIce = vec3(0.55, 0.75, 0.90) * (0.88 + strata * 0.20);
               diffuseColor.rgb = mix(diffuseColor.rgb, glacierIce, cliffFactor * 0.35);
             } else {
               // On steep cliffs where satellite imagery is stretched, blend in crisp exposed rock strata
               vec3 cliffRock = mix(vec3(0.18, 0.17, 0.17), vec3(0.38, 0.35, 0.32), strata);
               diffuseColor.rgb = mix(diffuseColor.rgb, cliffRock, cliffFactor * 0.55);
             }
           } else {
             // PROCEDURAL / EXPLORATION MODE:
             // Enhance vertex colors with micro detail and rock strata
             diffuseColor.rgb *= (0.82 + microDetail * 0.36);
             if (isSnowOrIce) {
               vec3 glacierIce = vec3(0.58, 0.78, 0.92) * (0.88 + strata * 0.20);
               diffuseColor.rgb = mix(diffuseColor.rgb, glacierIce, cliffFactor * 0.35);
             } else {
               vec3 darkStrata = diffuseColor.rgb * (0.82 + strata * 0.36);
               diffuseColor.rgb = mix(diffuseColor.rgb, darkStrata, cliffFactor * 0.6);
             }
           }

           // Dynamic Tephra Fallout accumulation
           if (uTimeline > 0.22) {
             float ashAccum = clamp((uTimeline - 0.22) * 1.5, 0.0, 1.0);
             float upward = smoothstep(0.40, 0.85, vTerrainWorldNormal.y);
             vec2 windDir = normalize(uWind + vec2(0.001, 0.001));
             float downwind = clamp(dot(vTerrainWorldNormal.xz, windDir) * 0.5 + 0.5, 0.0, 1.0);
             float ashCoverage = ashAccum * upward * (0.65 + downwind * 0.35);
             vec3 ashColor = vec3(0.44, 0.41, 0.38);
             diffuseColor.rgb = mix(diffuseColor.rgb, ashColor, ashCoverage * 0.82);
           }

           // Dynamic Pyroclastic Density Current Ignimbrite Deposit & Thermal Scorch
           // PDCs leave thick pumice/ash valley fills and thermal burn scars along drainage paths
           if (uPyroActivity > 3.0 && uTimeline > 0.12) {
             float valleyBed = 1.0 - smoothstep(0.10, 0.55, vTerrainSlope);
             float dCrater = length(vTerrainWorldPos.xz - uCraterPos.xz);
             float runoutLimit = 4.0 + (uPyroActivity / 100.0) * 15.5;
             if (dCrater < runoutLimit) {
               float distFactor = clamp((runoutLimit - dCrater) / runoutLimit, 0.0, 1.0);
               float depositCoverage = distFactor * clamp((uTimeline - 0.12) * 2.2, 0.0, 1.0) * (uPyroActivity / 100.0);
               depositCoverage = clamp(depositCoverage, 0.0, 0.88);

               // Scorch / ignimbrite pumice veneer: charcoal burn scar margins with bleached buff pumice deposit
               vec3 ignimbritePumice = vec3(0.40, 0.36, 0.30);
               vec3 scorchCharcoal = vec3(0.10, 0.08, 0.07);
               vec3 depositColor = mix(scorchCharcoal, ignimbritePumice, smoothstep(0.20, 0.75, distFactor));
               diffuseColor.rgb = mix(diffuseColor.rgb, depositColor, depositCoverage * (0.55 + valleyBed * 0.45));
             }
           }

           // Summit crater / breach geothermal incandescence
           float dVent = length(vTerrainWorldPos.xz - uCraterPos.xz);
           if (dVent < 3.2 && uIntensity > 3.0) {
             float heatRadius = clamp(1.0 - dVent / 3.2, 0.0, 1.0);
             float heat = heatRadius * (uIntensity / 100.0);
             float crackNoise = abs(sin(vTerrainWorldPos.x * 5.0 + vTerrainWorldPos.z * 5.0 + microDetail * 4.0) - 0.5);
             float fissure = 1.0 - smoothstep(0.02, 0.15, crackNoise);
             vec3 deepMolten = vec3(1.8, 0.35, 0.04);
             vec3 hotCore = vec3(3.5, 1.8, 0.4);
             vec3 thermalColor = mix(deepMolten, hotCore, fissure);
             diffuseColor.rgb += thermalColor * (heat * 0.95 + fissure * heat * 0.6) * (0.85 + 0.15 * sin(uTime * 4.0));
           }
          `
        );
      };

      terrainMesh = new THREE.Mesh(geo, mat);
      terrainMesh.receiveShadow = true;
      terrainMesh.castShadow = true;
      scene.add(terrainMesh);

      updateTerrain(vtype, lavaIntensity, state.timeline);

      const isIsland = (vtype === 'shield' || activeEruption === 'krakatoa1883' || activeEruption === 'maunaloa2022');
      ocean.visible = isIsland;
      ocean.position.y = -0.15;
      skirtMesh.visible = !isIsland;

      buildEnvironments();
    }

    function updateTerrain(vtype, lavaIntensity, stage) {
      if (!terrainMesh) return;
      const geo = terrainMesh.geometry;
      const pos = geo.attributes.position;
      const colors = geo.attributes.color || new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3);

      let maxH = 0;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        const h = volcanoH(x, z, vtype, stage);
        pos.setY(i, h);
        if (h > maxH) maxH = h;
      }
      currentMaxH = maxH;

      const hasColormap = !!(activeEruption && colormaps[activeEruption]);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        let [r, g, b] = terrainColor(x, z, y, maxH, vtype, lavaIntensity, stage);

        if (hasColormap) {
          // Provide subtle geological relief and cliff modulation under satellite texture
          const slopeGrade = terrainSlope(x, z);
          const cliffShade = clamp(1.0 - slopeGrade * 0.28, 0.72, 1.05);
          const strataNoise = 0.96 + (fbm(x * 0.7, z * 0.7, 2) - 0.5) * 0.10;
          const factor = cliffShade * strataNoise;
          r = factor; g = factor; b = factor;
        }

        colors.setXYZ(i, r, g, b);
      }

      geo.setAttribute('color', colors);
      pos.needsUpdate = true;
      colors.needsUpdate = true;
      geo.computeVertexNormals();

      craterPos.set(0, maxH, 0);
      if (activeEruption === 'sthelenr1980' && stage >= 0.15) {
        const breachF = Math.min(1, (stage - 0.15) / 0.15);
        craterPos.z = -1.4 * breachF;
        craterPos.y = terrainHeightAt(0, craterPos.z) + 0.15;
      } else if ((activeEruption === 'tambora1815' || activeEruption === 'krakatoa1883') && stage > 0.5) {
        craterPos.y = terrainHeightAt(0, 0) + 0.15;
      } else if (vtype === 'caldera') {
        craterPos.y = terrainHeightAt(0, 0) + 0.15;
      }
      lavaLight.position.copy(craterPos).addScaledVector(new THREE.Vector3(0, 1, 0), 1.5);

      // Caldera lake positioning and visibility
      if (calderaLake) {
        const hasCalderaLake = (vtype === 'caldera' && !activeEruption) ||
          (activeEruption === 'pinatubo1991' && stage >= 0.76) ||
          (activeEruption === 'tambora1815' && stage >= 0.78);
        calderaLake.visible = hasCalderaLake;
        if (hasCalderaLake) {
          if (vtype === 'caldera') {
            calderaLake.position.set(0, 1.9, 0);
            calderaLake.scale.setScalar(1.0);
          } else if (activeEruption === 'pinatubo1991') {
            calderaLake.position.set(0, 4.3, 0);
            calderaLake.scale.setScalar(0.48);
          } else {
            calderaLake.position.set(0, 2.8, 0);
            calderaLake.scale.setScalar(0.75);
          }
        }
      }

      if (terrainMesh.material.userData && terrainMesh.material.userData.uniforms) {
        const u = terrainMesh.material.userData.uniforms;
        u.uMaxH.value = maxH;
        u.uCraterPos.value.copy(craterPos);
        u.uTimeline.value = stage;
        u.uIntensity.value = state.intensity;
        u.uHasColormap.value = hasColormap ? 1.0 : 0.0;
        if (u.uPyroActivity) u.uPyroActivity.value = state.pyro;
        if (u.uWind) u.uWind.value.set(wind.x, wind.z);
      }

      rebuildLavaStreams(lavaIntensity);
    }

    function terrainHeightAt(x, z) {
      return volcanoH(x, z, state.vtype, state.timeline);
    }

    function terrainSlope(x, z) {
      const eps = 0.25;
      const hL = terrainHeightAt(x - eps, z);
      const hR = terrainHeightAt(x + eps, z);
      const hD = terrainHeightAt(x, z - eps);
      const hU = terrainHeightAt(x, z + eps);
      const sx = (hR - hL) / (eps * 2.0);
      const sz = (hU - hD) / (eps * 2.0);
      return Math.hypot(sx, sz);
    }

    function slopeDir(x, z) {
      const eps = 0.25;
      const hL = terrainHeightAt(x - eps, z);
      const hR = terrainHeightAt(x + eps, z);
      const hD = terrainHeightAt(x, z - eps);
      const hU = terrainHeightAt(x, z + eps);
      const sx = hL - hR;
      const sz = hD - hU;
      const l = Math.hypot(sx, sz) || 1e-5;
      return { x: sx / l, z: sz / l };
    }

    let treeTrunkMesh = null;
    let treeCanopyMesh = null;
    let houseBodyMesh = null;
    let houseRoofMesh = null;
    let envData = []; // Store original transforms

    function buildEnvironments() {
       if (treeTrunkMesh) {
          scene.remove(treeTrunkMesh, treeCanopyMesh, houseBodyMesh, houseRoofMesh);
          treeTrunkMesh.geometry.dispose();
          treeCanopyMesh.geometry.dispose();
          houseBodyMesh.geometry.dispose();
          houseRoofMesh.geometry.dispose();
       }
       envData = [];

       // Tree Parts
       const trunkGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.3, 5);
       trunkGeo.translate(0, 0.15, 0);
       const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 1.0 });

       const canopyGeo = new THREE.ConeGeometry(0.22, 0.65, 6);
       canopyGeo.translate(0, 0.45, 0);
       const canopyMat = new THREE.MeshStandardMaterial({ color: 0x183b15, roughness: 0.9 });

       // House Parts
       const bodyGeo = new THREE.BoxGeometry(0.35, 0.25, 0.45);
       bodyGeo.translate(0, 0.125, 0);
       const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd8c8b8, roughness: 0.95 });

       const roofGeo = new THREE.ConeGeometry(0.35, 0.2, 4);
       roofGeo.rotateY(Math.PI / 4);
       roofGeo.translate(0, 0.35, 0);
       const roofMat = new THREE.MeshStandardMaterial({ color: 0x9b4a32, roughness: 0.8 });

       const MAX_TREES = 3000;
       const MAX_HOUSES = 300;

       treeTrunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, MAX_TREES);
       treeCanopyMesh = new THREE.InstancedMesh(canopyGeo, canopyMat, MAX_TREES);

       houseBodyMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, MAX_HOUSES);
       houseRoofMesh = new THREE.InstancedMesh(roofGeo, roofMat, MAX_HOUSES);

       const dummy = new THREE.Object3D();
       let tCount = 0;
       let hCount = 0;

       for(let i=0; i<8000; i++) {
          const x = (Math.random() - 0.5) * TERRAIN_SIZE;
          const z = (Math.random() - 0.5) * TERRAIN_SIZE;
          const r = Math.hypot(x, z);
          const h = terrainHeightAt(x, z);

          if (h < 0.2) continue; // Under water

          // Slope constraint: trees and houses cannot cling to sheer cliffs or steep scree
          const slopeGrade = terrainSlope(x, z);
          if (slopeGrade > 0.65) continue;

          // Vent proximity constraint: no vegetation inside crater
          const dCrater = Math.hypot(x - craterPos.x, z - craterPos.z);
          if (dCrater < 3.2) continue;

          // Biome-specific vegetation rules
          let allowTree = true;
          if (activeEruption === 'eyja2010') {
             // Subarctic Iceland: sparse dwarf birch and moss, only at low elevation, none on glacier
             if (h > currentMaxH * 0.22 || Math.random() > 0.25) allowTree = false;
          } else if (activeEruption === 'maunaloa2022' || state.vtype === 'shield') {
             // Hawaiian shield: barren high-altitude basalt, sparse coastal trees only
             if (h > currentMaxH * 0.28 || r < TERRAIN_SIZE * 0.22) allowTree = false;
          } else if (state.vtype === 'caldera' && h < 2.5) {
             // Under or right beside caldera lake
             allowTree = false;
          }

          // Trees
          if (allowTree && h < currentMaxH * 0.62 && r > TERRAIN_SIZE * 0.08) {
             if (tCount < MAX_TREES && Math.random() > 0.42) {
                const scale = 0.5 + Math.random() * 0.6;
                const rot = Math.random() * Math.PI;
                dummy.position.set(x, h, z);
                dummy.scale.setScalar(scale);
                dummy.rotation.set(0, rot, 0);
                dummy.updateMatrix();
                treeTrunkMesh.setMatrixAt(tCount, dummy.matrix);
                treeCanopyMesh.setMatrixAt(tCount, dummy.matrix);
                envData.push({ type: 'tree', id: tCount, x, y: h, z, s: scale, r: rot, fallen: false, fallDirX: 0, fallDirZ: 0, charFrac: 0 });
                tCount++;
             }
          }

          // Houses (Pompeii / lowland settlements in gentle valleys)
          const allowHouse = (activeEruption === 'vesuvius79')
             ? (r > TERRAIN_SIZE * 0.24 && h < currentMaxH * 0.26 && slopeGrade < 0.22 && Math.random() > 0.82)
             : (activeEruption !== 'maunaloa2022' && activeEruption !== 'eyja2010' && r > TERRAIN_SIZE * 0.26 && h < currentMaxH * 0.24 && slopeGrade < 0.20 && Math.random() > 0.94);

          if (allowHouse && hCount < MAX_HOUSES) {
             const scale = 0.7 + Math.random() * 0.4;
             const rot = Math.random() * Math.PI;
             dummy.position.set(x, h, z);
             dummy.scale.setScalar(scale);
             dummy.rotation.set(0, rot, 0);
             dummy.updateMatrix();
             houseBodyMesh.setMatrixAt(hCount, dummy.matrix);
             houseRoofMesh.setMatrixAt(hCount, dummy.matrix);
             envData.push({ type: 'house', id: hCount, x, y: h, z, s: scale, r: rot, roofDestroyed: false, charFrac: 0 });
             hCount++;
          }
       }

       treeTrunkMesh.count = treeCanopyMesh.count = tCount;
       houseBodyMesh.count = houseRoofMesh.count = hCount;

       [treeTrunkMesh, treeCanopyMesh, houseBodyMesh, houseRoofMesh].forEach(m => {
           m.instanceMatrix.needsUpdate = true;
           m.castShadow = true;
           m.receiveShadow = true;
           scene.add(m);
       });

       buildSpatialGrid();
    }

    // Spatial partitioning for fast PDC environmental blast checks
    const GRID_SIZE = 8;
    const GRID_CELL = TERRAIN_SIZE / GRID_SIZE;
    let envSpatialGrid = [];
    let envDirty = false;

    function buildSpatialGrid() {
      envSpatialGrid = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => []);
      for (const env of envData) {
        const cx = clamp(Math.floor((env.x + TERRAIN_SIZE / 2) / GRID_CELL), 0, GRID_SIZE - 1);
        const cz = clamp(Math.floor((env.z + TERRAIN_SIZE / 2) / GRID_CELL), 0, GRID_SIZE - 1);
        envSpatialGrid[cz * GRID_SIZE + cx].push(env);
      }
    }

    function checkPdcEnvironmentalImpact(px, pz, speed) {
      if (speed < 2.5) return;
      const dynPressureKPa = (0.5 * 1.8 * speed * speed) * 0.12;
      if (dynPressureKPa < 2.5) return;

      const cx = clamp(Math.floor((px + TERRAIN_SIZE / 2) / GRID_CELL), 0, GRID_SIZE - 1);
      const cz = clamp(Math.floor((pz + TERRAIN_SIZE / 2) / GRID_CELL), 0, GRID_SIZE - 1);

      const impactRadius = 1.6;
      for (let dz = -1; dz <= 1; dz++) {
        const gz = cz + dz;
        if (gz < 0 || gz >= GRID_SIZE) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const gx = cx + dx;
          if (gx < 0 || gx >= GRID_SIZE) continue;

          const cell = envSpatialGrid[gz * GRID_SIZE + gx];
          if (!cell) continue;

          for (let k = 0; k < cell.length; k++) {
            const env = cell[k];
            if (env.fallen && env.roofDestroyed) continue;

            const distSq = (env.x - px) * (env.x - px) + (env.z - pz) * (env.z - pz);
            if (distSq < impactRadius * impactRadius) {
              if (env.type === 'tree' && !env.fallen) {
                env.fallen = true;
                const d = Math.hypot(env.x - craterPos.x, env.z - craterPos.z) || 1;
                env.fallDirX = (env.x - craterPos.x) / d;
                env.fallDirZ = (env.z - craterPos.z) / d;
                envDirty = true;
              } else if (env.type === 'house' && dynPressureKPa > 8.0 && !env.roofDestroyed) {
                env.roofDestroyed = true;
                envDirty = true;
              }
            }
          }
        }
      }
    }

    function resetEnvironments() {
      for (const env of envData) {
        env.fallen = false;
        env.roofDestroyed = false;
        env.charFrac = 0;
      }
      envDirty = true;
      updateEnvironments(state.timeline);
    }

    function updateEnvironments(stage) {
       if (!treeTrunkMesh) return;
       const dummy = new THREE.Object3D();
       let tDirty = false;
       let hDirty = false;

       for (const env of envData) {
          const h = volcanoH(env.x, env.z, state.vtype, stage);
          let scale = env.s;
          let rotX = 0;
          let rotZ = 0;
          let canopyScale = scale;

          // Devastation: dynamic PDC blast blowdown takes precedence
          if (env.fallen) {
             rotX = env.fallDirZ * (Math.PI / 2.15);
             rotZ = -env.fallDirX * (Math.PI / 2.15);
             canopyScale = scale * 0.05; // Canopy stripped by blast
          } else if (stage > 0.3) {
             const destroyFrac = Math.min(1, (stage - 0.3) * 2.5);
             if (activeEruption === 'sthelenr1980' && env.z < 0) {
                 // North flank lateral blast blowdown
                 rotX = destroyFrac * Math.PI / 2.2;
                 canopyScale = scale * Math.max(0.05, 1 - destroyFrac);
             } else {
                 scale = env.s * Math.max(0.1, 1 - destroyFrac * 0.8);
                 canopyScale = scale;
             }
          }

          dummy.position.set(env.x, h, env.z);
          dummy.rotation.set(rotX, env.r, rotZ);
          dummy.scale.setScalar(scale);
          dummy.updateMatrix();

          if (env.type === 'tree') {
             treeTrunkMesh.setMatrixAt(env.id, dummy.matrix);
             dummy.scale.setScalar(canopyScale);
             dummy.updateMatrix();
             treeCanopyMesh.setMatrixAt(env.id, dummy.matrix);
             tDirty = true;
          } else {
             // Bury houses or blast roofs off
             if (env.roofDestroyed || stage > 0.4) {
                 dummy.position.y -= Math.min(0.5, (stage - 0.4) * 2);
                 dummy.updateMatrix();
             }
             houseBodyMesh.setMatrixAt(env.id, dummy.matrix);
             if (!env.roofDestroyed) {
                houseRoofMesh.setMatrixAt(env.id, dummy.matrix);
             } else {
                dummy.scale.set(0.01, 0.01, 0.01);
                dummy.updateMatrix();
                houseRoofMesh.setMatrixAt(env.id, dummy.matrix);
             }
             hDirty = true;
          }
       }

       if (tDirty) { treeTrunkMesh.instanceMatrix.needsUpdate = true; treeCanopyMesh.instanceMatrix.needsUpdate = true; }
       if (hDirty) { houseBodyMesh.instanceMatrix.needsUpdate = true; houseRoofMesh.instanceMatrix.needsUpdate = true; }
    }

    /* ══════════════════════════════════════════
       PARTICLE POOLS
    ══════════════════════════════════════════ */
    function makeSpriteTexture(inner, outer, noise = false) {
      const size = 128;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      const cx = size / 2, cy = size / 2;
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
      grad.addColorStop(0, inner);
      grad.addColorStop(1, outer);
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);

      if (noise) {
        const imgData = g.getImageData(0, 0, size, size);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const x = (i / 4) % size;
          const y = Math.floor((i / 4) / size);
          const r = Math.hypot(x - cx, y - cy);
          if (r < size / 2) {
            // High frequency pseudo-random noise for puffy clouds
            const n = 0.5 + Math.random() * 0.5;
            d[i + 3] *= n;
          }
        }
        g.putImageData(imgData, 0, 0);
      }

      const tex = new THREE.CanvasTexture(c);
      tex.encoding = THREE.sRGBEncoding;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    }

    const hasCloudEngine = typeof window !== 'undefined' && window.CloudEngine && typeof window.CloudEngine.createThreeTexture === 'function';
    const smokeTex = hasCloudEngine
      ? window.CloudEngine.createThreeTexture(THREE, 'mono', 128)
      : makeSpriteTexture('rgba(255,255,255,0.85)', 'rgba(255,255,255,0)', true);

    const ashTex = hasCloudEngine
      ? window.CloudEngine.createThreeTexture(THREE, 'ash', 128)
      : smokeTex;

    const pyroTex = hasCloudEngine
      ? window.CloudEngine.createThreeTexture(THREE, 'pyroclastic', 128)
      : smokeTex;

    const steamTex = hasCloudEngine
      ? window.CloudEngine.createThreeTexture(THREE, 'steam_3d', 128)
      : smokeTex;

    const emberTex = makeSpriteTexture('rgba(255,210,140,0.95)', 'rgba(255,80,20,0)', false);

    class ParticlePool {
      constructor(scene, maxN, mat) {
        this.max = maxN;
        this.pos = new Float32Array(maxN * 3);
        this.vel = new Float32Array(maxN * 3);
        this.age = new Float32Array(maxN);
        this.life = new Float32Array(maxN);
        this.alive = new Uint8Array(maxN);
        this.col = new Float32Array(maxN * 3);
        this.sz  = new Float32Array(maxN);
        this.cursor = 0;

        this.geo = new THREE.BufferGeometry();
        this.posAttr = new THREE.BufferAttribute(this.pos, 3); this.posAttr.setUsage(THREE.DynamicDrawUsage);
        this.colAttr = new THREE.BufferAttribute(this.col, 3); this.colAttr.setUsage(THREE.DynamicDrawUsage);
        this.szAttr  = new THREE.BufferAttribute(this.sz,  1); this.szAttr.setUsage(THREE.DynamicDrawUsage);
        this.geo.setAttribute('position', this.posAttr);
        this.geo.setAttribute('color',    this.colAttr);
        this.geo.setAttribute('size',     this.szAttr);
        this.mat = mat;
        this.pts = new THREE.Points(this.geo, mat);
        this.pts.frustumCulled = false;
        scene.add(this.pts);
      }

      findDead() {
        for (let k = 0; k < this.max; k++) {
          const idx = (this.cursor + k) % this.max;
          if (!this.alive[idx]) {
            this.cursor = (idx + 1) % this.max;
            return idx;
          }
        }
        return -1;
      }

      emit(px, py, pz, vx, vy, vz, life, r, g, b, size) {
        const i = this.findDead(); if (i < 0) return -1;
        this.alive[i] = 1; this.age[i] = 0; this.life[i] = life;
        this.pos[i*3]=px; this.pos[i*3+1]=py; this.pos[i*3+2]=pz;
        this.vel[i*3]=vx; this.vel[i*3+1]=vy; this.vel[i*3+2]=vz;
        this.col[i*3]=r;  this.col[i*3+1]=g;  this.col[i*3+2]=b;
        this.sz[i] = size;
        return i;
      }

      clear() {
        for (let i = 0; i < this.max; i++) {
          this.alive[i] = 0;
          this.pos[i*3+1] = -9999;
        }
        this.cursor = 0;
        this.posAttr.needsUpdate = true;
      }

      update(dt, onTick) {
        for (let i = 0; i < this.max; i++) {
          if (!this.alive[i]) { this.pos[i*3+1] = -9999; continue; }
          this.age[i] += dt;
          if (this.age[i] >= this.life[i]) { this.alive[i] = 0; this.pos[i*3+1] = -9999; continue; }
          const t = this.age[i] / this.life[i];
          onTick(i, t, this, dt);
        }
        this.posAttr.needsUpdate = true;
        this.colAttr.needsUpdate = true;
        this.szAttr.needsUpdate  = true;
      }
    }

    // ── VOLUMETRIC POINT SPRITE MATERIAL GENERATOR ──
    function createVolumetricPointsMaterial(options = {}) {
      const isEmissive = !!options.isEmissive;
      const isSteam = !!options.isSteam;
      const isAdditive = !!options.additive;
      const isPyroclastic = !!options.isPyroclastic;
      const alphaCutoff = options.alphaTest || 0.02;

      return new THREE.ShaderMaterial({
        uniforms: {
          map: { value: options.map || smokeTex },
          sunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3) },
          sunColor: { value: new THREE.Color(0xffecd0) },
          ambientColor: { value: new THREE.Color(0x352824) },
          craterPos: { value: new THREE.Vector3(0, 10, 0) },
          lavaGlow: { value: 0.0 },
          time: { value: 0.0 },
          opacity: { value: options.opacity || 0.88 }
        },
        vertexShader: `
          uniform vec3 sunDir;
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          varying vec3 vWorldPos;
          varying vec3 vSunDirView;
          varying vec3 vUpView;

          void main() {
            vColor = color;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vec4 mvPosition = viewMatrix * worldPos;

            // Varying lighting directions transformed to view space
            vSunDirView = normalize((viewMatrix * vec4(sunDir, 0.0)).xyz);
            vUpView = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);

            // True size attenuation honoring per-particle size attribute
            float pSize = size * (340.0 / max(0.1, -mvPosition.z));
            gl_PointSize = clamp(pSize, 1.0, 480.0);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D map;
          uniform vec3 sunColor;
          uniform vec3 ambientColor;
          uniform vec3 craterPos;
          uniform float lavaGlow;
          uniform float opacity;
          varying vec3 vColor;
          varying vec3 vWorldPos;
          varying vec3 vSunDirView;
          varying vec3 vUpView;

          void main() {
            vec2 uv = gl_PointCoord;
            vec4 texCol = texture2D(map, uv);
            if (texCol.a < ${alphaCutoff.toFixed(3)}) discard;

            // Spherical billow surface normal in view space
            vec2 p = uv * 2.0 - 1.0;
            float r2 = dot(p, p);
            if (r2 > 1.0) discard;
            float z = sqrt(max(0.0, 1.0 - r2));
            vec3 normalView = vec3(p.x, -p.y, z);

            // Wrap lighting: allows light to permeate cloud edges realistically
            float wrapLight = max(0.0, (dot(normalView, vSunDirView) + 0.38) / 1.38);

            // Crater upward volcanic incandescence (lights underside of plume)
            vec3 toCrater = craterPos - vWorldPos;
            float craterDist2 = dot(toCrater, toCrater);
            float craterLight = clamp(lavaGlow * (6.0 / (craterDist2 + 4.0)), 0.0, 0.75);
            float underside = max(0.0, -dot(normalView, vUpView));
            vec3 lavaUplight = vec3(1.15, 0.35, 0.04) * craterLight * (0.2 + underside * 0.8);

            ${isEmissive ? `
              // Incandescent projectile / glowing molten ejecta
              vec3 finalColor = vColor * (1.6 + texCol.rgb * 1.4);
              float alpha = texCol.a * opacity * (1.0 - r2 * 0.25);
              gl_FragColor = vec4(finalColor, alpha);
            ` : isSteam ? `
              // Condensing steam / volcanic gas plume with forward scattering
              float forwardScatter = pow(max(0.0, dot(normalView, vSunDirView)), 2.5) * 0.55;
              vec3 diffuse = vColor * (ambientColor * 1.8 + sunColor * (0.35 + wrapLight * 0.95 + forwardScatter));
              vec3 finalColor = diffuse + lavaUplight * 0.5;
              float alpha = texCol.a * opacity * (1.0 - smoothstep(0.72, 1.0, r2));
              gl_FragColor = vec4(finalColor, alpha);
            ` : isPyroclastic ? `
              // Churning Pyroclastic Density Current: turbulent ash mantle with hot incandescent core
              float coreDist = r2;
              float heat = clamp(vColor.r, 0.0, 1.0);
              vec3 hotWhite = vec3(1.2, 1.1, 0.9);
              vec3 moltenOrange = vec3(1.4, 0.45, 0.06);
              vec3 cherryRed = vec3(0.75, 0.14, 0.03);
              vec3 incandescentCore = mix(cherryRed, mix(moltenOrange, hotWhite, smoothstep(0.65, 1.0, heat)), heat);

              vec3 ashAlbedo = vec3(0.24, 0.20, 0.18) * (texCol.rgb * 1.5 + 0.12);
              vec3 litAsh = ashAlbedo * (ambientColor * 2.4 + sunColor * (0.32 + wrapLight * 1.4));

              float coreReveal = (1.0 - smoothstep(0.0, 0.72, coreDist)) * heat;
              vec3 finalColor = mix(litAsh, incandescentCore * 2.2, coreReveal * 0.92) + lavaUplight * 0.85;
              float alpha = min(1.0, texCol.a * 1.6) * opacity * (1.0 - smoothstep(0.80, 1.0, r2));
              gl_FragColor = vec4(finalColor, alpha);
            ` : `
              // Dense tephra / ash cloud with self-shadowing and crater rim glow
              vec3 ashAlbedo = vColor * (texCol.rgb * 1.5 + 0.04);
              vec3 litAsh = ashAlbedo * (ambientColor * 2.2 + sunColor * (0.35 + wrapLight * 1.35));
              vec3 finalColor = litAsh + lavaUplight;
              float alpha = min(1.0, texCol.a * 1.4) * opacity * (1.0 - smoothstep(0.82, 1.0, r2));
              gl_FragColor = vec4(finalColor, alpha);
            `}
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: isAdditive ? THREE.AdditiveBlending : THREE.NormalBlending
      });
    }

    // ── ASH COLUMN ──
    const ashPool = new ParticlePool(scene, 4800, createVolumetricPointsMaterial({
      map: ashTex,
      opacity: 0.88,
      alphaTest: 0.03
    }));

    // ── LAVA BOMBS ──
    const bombPool = new ParticlePool(scene, 600, createVolumetricPointsMaterial({
      map: emberTex,
      isEmissive: true,
      additive: true,
      opacity: 0.95,
      alphaTest: 0.04
    }));

    // ── PYROCLASTIC DENSITY CURRENT (PDC) DUAL-PHASE ENGINE ──
    // Phase A: Dense basal granular avalanche (ground-hugging, channelized, high dynamic pressure, incandescent clasts)
    const pyroPool = new ParticlePool(scene, 2400, createVolumetricPointsMaterial({
      map: pyroTex,
      isPyroclastic: true,
      opacity: 0.92,
      alphaTest: 0.03
    }));

    // Phase B: Dilute co-ignimbrite ash surge (elutriation plume: buoyant, towering, billowing phoenix clouds)
    const pyroSurgePool = new ParticlePool(scene, 2800, createVolumetricPointsMaterial({
      map: pyroTex,
      isPyroclastic: true,
      opacity: 0.76,
      alphaTest: 0.02
    }));

    // ── STEAM / GAS ──
    const steamPool = new ParticlePool(scene, 1200, createVolumetricPointsMaterial({
      map: steamTex,
      isSteam: true,
      opacity: 0.65,
      alphaTest: 0.02
    }));

    // A separate hot-material field makes the lava itself continuous and
    // readable: ash and bombs can fly through the air, while these particles
    // follow the terrain and cool as they spread downslope.
    const lavaRenderMax = 900;
    const lavaRenderPos = new Float32Array(lavaRenderMax * 3);
    const lavaRenderCol = new Float32Array(lavaRenderMax * 3);
    const lavaRenderSize = new Float32Array(lavaRenderMax);
    const lavaRenderGeo = new THREE.BufferGeometry();
    lavaRenderGeo.setAttribute('position', new THREE.BufferAttribute(lavaRenderPos, 3));
    lavaRenderGeo.setAttribute('color', new THREE.BufferAttribute(lavaRenderCol, 3));
    lavaRenderGeo.setAttribute('size', new THREE.BufferAttribute(lavaRenderSize, 1));
    const lavaRenderMat = createVolumetricPointsMaterial({
      map: emberTex,
      isEmissive: true,
      additive: true,
      opacity: 0.95,
      alphaTest: 0.03
    });
    const lavaRenderPoints = new THREE.Points(lavaRenderGeo, lavaRenderMat);
    lavaRenderPoints.frustumCulled = false;
    scene.add(lavaRenderPoints);

    function spawnAsh(intensity, column) {
      const colNorm = column / 45;
      const n = Math.round((22 + colNorm * 28) * intensity);
      const targetH = Math.max(2.0, colNorm * 22.0);
      const ventRadius = 0.35 + intensity * 0.45;
      const umbrellaRadius = Math.max(1.2, colNorm * 14.5 * Math.pow(intensity, 0.45));

      for (let i = 0; i < n; i++) {
        const pRegime = Math.random();

        if (pRegime < 0.45) {
          // ── 1. CONVECTIVE JET VENT REGIME ──
          const ang = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * ventRadius;
          const vx = Math.cos(ang) * (0.3 + intensity * 0.6);
          const vz = Math.sin(ang) * (0.3 + intensity * 0.6);
          const vy = (7.5 + colNorm * 11.0) * (0.85 + Math.random() * 0.4);
          const lifetime = 3.8 + colNorm * 3.5 + Math.random() * 2.0;

          ashPool.emit(
            craterPos.x + Math.cos(ang) * r,
            craterPos.y + 0.1,
            craterPos.z + Math.sin(ang) * r,
            vx, vy, vz,
            lifetime,
            0.88, 0.85, 0.82,
            2.8 + intensity * 1.6
          );
        } else if (pRegime < 0.75 && colNorm > 0.1) {
          // ── 2. CONVECTIVE COLUMN SHEAR BILLOW REGIME ──
          // Detaching Kelvin-Helmholtz vortices along rising buoyant trunk
          const colFrac = 0.15 + Math.random() * 0.52;
          const trunkY = targetH * colFrac;
          const trunkR = (ventRadius + (ventRadius + umbrellaRadius * 0.22) * Math.pow(colFrac, 0.85)) * (0.8 + Math.random() * 0.45);
          const ang = Math.random() * Math.PI * 2;
          const billowSpd = (3.5 + colNorm * 6.0) * (0.8 + Math.random() * 0.4);
          const vx = Math.cos(ang) * (billowSpd * 0.35) + (Math.random() - 0.5) * 1.5;
          const vz = Math.sin(ang) * (billowSpd * 0.35) + (Math.random() - 0.5) * 1.5;
          const vy = billowSpd * 0.75;
          const lifetime = 4.2 + colNorm * 3.8 + Math.random() * 2.2;

          ashPool.emit(
            craterPos.x + Math.cos(ang) * trunkR,
            craterPos.y + trunkY,
            craterPos.z + Math.sin(ang) * trunkR,
            vx, vy, vz,
            lifetime,
            1.05, 1.02, 0.98,
            4.5 + colNorm * 5.0 + Math.random() * 2.5
          );
        } else if (colNorm > 0.12) {
          // ── 3. STRATOSPHERIC UMBRELLA GRAVITY CURRENT REGIME ──
          // Spreading radially outward at Neutral Buoyancy Level
          const uAlt = targetH * (0.72 + Math.random() * 0.20);
          const uAng = Math.random() * Math.PI * 2;
          const uDist = Math.pow(Math.random(), 0.55) * (umbrellaRadius * 0.85);
          const spreadSpeed = (3.2 + colNorm * 5.5) * (0.75 + Math.random() * 0.5);
          const vx = Math.cos(uAng) * spreadSpeed;
          const vz = Math.sin(uAng) * spreadSpeed;
          const vy = (Math.random() - 0.45) * 0.8;
          const lifetime = 4.8 + colNorm * 4.2 + Math.random() * 2.5;

          ashPool.emit(
            craterPos.x + Math.cos(uAng) * uDist,
            craterPos.y + uAlt,
            craterPos.z + Math.sin(uAng) * uDist,
            vx, vy, vz,
            lifetime,
            1.22, 1.18, 1.14,
            9.5 + colNorm * 10.5 + Math.random() * 5.0
          );
        }
      }
    }

    function spawnBomb(intensity) {
      if (Math.random() > intensity * 0.8 + 0.08) return;
      const count = 1 + Math.floor(Math.random() * (1 + intensity * 3));
      for (let k = 0; k < count; k++) {
        const ang = Math.random() * Math.PI * 2;
        // Proximal ballistic trajectory confined to volcanic edifice
        const spd = 4.5 + intensity * 6.5 + Math.random() * 3.5;
        const elev = 0.70 + Math.random() * 0.50; // High arc
        bombPool.emit(
          (Math.random() - 0.5) * 0.35, craterPos.y + 0.1, (Math.random() - 0.5) * 0.35,
          Math.cos(ang) * spd * Math.cos(elev),
          spd * Math.sin(elev),
          Math.sin(ang) * spd * Math.cos(elev),
          2.0 + Math.random() * 1.5,
          1.0, 0.75 + Math.random() * 0.25, 0.12,
          0.75 + Math.random() * 0.45
        );
      }
    }

    function spawnPyroclastic(pyro, intensity) {
      const isStHelensBlast = activeEruption === 'sthelenr1980' && state.timeline >= 0.15 && state.timeline <= 0.32;

      if (isStHelensBlast) {
        // High-velocity directed lateral blast roaring northward out of the collapsed breach
        const count = Math.round(6 + intensity * 9);
        for (let k = 0; k < count; k++) {
          const spread = (-Math.PI / 2) + (Math.random() - 0.5) * (Math.PI * 0.60);
          const spd = 20 + intensity * 22 + Math.random() * 12;
          const blastY = craterPos.y - 0.2 + Math.random() * 1.4;
          const px = (Math.random() - 0.5) * 1.8;
          const pz = -0.5 - Math.random() * 1.0;
          const vx = Math.cos(spread) * spd;
          const vz = Math.sin(spread) * spd;
          const vy = (Math.random() - 0.25) * 3.5;

          // Emit dense basal blast clasts
          pyroPool.emit(
            px, blastY, pz,
            vx, vy, vz,
            5.2 + Math.random() * 3.0,
            1.0, 0.45, 0.15,
            2.4 + Math.random() * 1.6
          );

          // Emit dilute trailing blast ash surge
          if (Math.random() < 0.65) {
            pyroSurgePool.emit(
              px + (Math.random() - 0.5) * 1.2, blastY + 0.5, pz,
              vx * 0.85, 3.5 + Math.random() * 4.5, vz * 0.85,
              6.5 + Math.random() * 3.5,
              0.55, 0.35, 0.25,
              4.5 + Math.random() * 3.0
            );
          }
        }
        return;
      }

      if (pyro < 0.08 || Math.random() > pyro * 0.90 + 0.10) return;

      // ── ANNULAR COLUMN COLLAPSE REGIME (Woods 1988, Sparks 1986) ──
      // When mass discharge rate overwhelms convective entrainment, fountain collapse occurs at height Hc
      const collapseHeight = craterPos.y + (1.2 + 2.8 * (intensity / 100)) * (pyro / 100);
      const ringRadius = 0.45 + (pyro / 100) * 1.4;
      const count = Math.round(4 + pyro * 8 + intensity * 4);

      for (let k = 0; k < count; k++) {
        const ang = Math.random() * Math.PI * 2;
        // Radial outward momentum as collapsing curtain spills over crater rim
        const radialSpd = 3.5 + pyro * 7.5 + intensity * 4.2;
        const vx = Math.cos(ang) * radialSpd + (Math.random() - 0.5) * 1.5;
        const vz = Math.sin(ang) * radialSpd + (Math.random() - 0.5) * 1.5;
        const vy = -(2.0 + pyro * 4.0 + Math.random() * 2.5);

        const px = craterPos.x + Math.cos(ang) * ringRadius + (Math.random() - 0.5) * 0.6;
        const pz = craterPos.z + Math.sin(ang) * ringRadius + (Math.random() - 0.5) * 0.6;
        const py = collapseHeight + (Math.random() - 0.5) * 0.8;

        // Emit dense basal granular avalanche particle
        pyroPool.emit(
          px, py, pz,
          vx, vy, vz,
          5.5 + Math.random() * 4.0,
          1.0, 0.55, 0.15,
          2.2 + Math.random() * 1.4
        );

        // Emit initial collapsing co-ignimbrite turbulent cloud
        if (Math.random() < 0.45) {
          pyroSurgePool.emit(
            px, py + 0.8, pz,
            vx * 0.65, 1.8 + Math.random() * 3.5, vz * 0.65,
            6.0 + Math.random() * 4.0,
            0.65, 0.40, 0.28,
            3.8 + Math.random() * 2.5
          );
        }
      }
    }

    function spawnSteam(intensity) {
      const isEyjaIceMelt = activeEruption === 'eyja2010' && state.timeline >= 0.14 && state.timeline <= 0.35;
      const chance = isEyjaIceMelt ? 0.95 : (intensity * 0.55 + 0.15);
      if (Math.random() > chance) return;
      const count = isEyjaIceMelt ? 4 : 2;
      for (let k = 0; k < count; k++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = isEyjaIceMelt ? (0.4 + Math.random() * 1.8) : 0.85;
        steamPool.emit(
          Math.cos(ang) * rad, craterPos.y - 0.25, Math.sin(ang) * rad,
          Math.cos(ang) * 0.6, 3.0 + Math.random() * 2.8, Math.sin(ang) * 0.6,
          4.8 + Math.random() * 2.8,
          0.88, 0.90, 0.94,
          isEyjaIceMelt ? (2.4 + Math.random() * 1.5) : (1.8 + Math.random() * 1.2)
        );
      }
    }

    function spawnSecondaryVentPuff(vent, intensity) {
      if (Math.random() > intensity * 0.5 + 0.12) return;
      const vx = vent.normalizedX * 8.5;
      const vz = Math.sin(vent.normalizedX * 9.7) * 1.5;
      const vy = terrainHeightAt(vx, vz) + 0.15;
      const spd = 3.0 + intensity * 4.0;

      ashPool.emit(
        vx + (Math.random() - 0.5) * 0.35, vy, vz + (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.7, spd, (Math.random() - 0.5) * 0.7,
        3.2 + Math.random() * 2.2,
        0.90, 0.88, 0.85, 2.0 + Math.random() * 1.0
      );

      if (Math.random() < 0.45) {
        steamPool.emit(
          vx, vy, vz,
          (Math.random() - 0.5) * 0.5, 4.0 + Math.random() * 2.2, (Math.random() - 0.5) * 0.5,
          3.6 + Math.random() * 2.4,
          0.90, 0.92, 0.96, 2.2 + Math.random() * 1.0
        );
      }
    }

    function spawnLava(intensity) {
      if (!lavaFlow || intensity < 0.025) return;
      const fluidity = 1 - state.viscosity / 100;
      const count = Math.max(1, Math.round(2 + intensity * (4 + fluidity * 6)));
      for (let n = 0; n < count; n++) {
        const ang = Math.random() * Math.PI * 2;
        const radius = 0.08 + Math.random() * 0.42;
        const x = Math.cos(ang) * radius;
        const z = Math.sin(ang) * radius;
        const slope = slopeDir(x, z);
        const radial = 0.35 + Math.random() * 0.9;
        const speed = (0.45 + fluidity * 1.8) * (0.7 + Math.random() * 0.6);
        const fountain = intensity * (0.7 + Math.random() * 2.4) * (0.45 + fluidity * 0.7);
        lavaFlow.emit({
          x, z, y: terrainHeightAt(x, z) + 0.14,
          vx: slope.x * speed + Math.cos(ang) * radial * intensity,
          vy: fountain,
          vz: slope.z * speed + Math.sin(ang) * radial * intensity,
          life: 3.5 + fluidity * 4.5 + Math.random() * 2.5,
          size: 0.11 + Math.random() * (0.07 + fluidity * 0.1),
          temperature: 0.82 + Math.random() * 0.18
        });
      }
    }

    /* ══════════════════════════════════════════
       STATE
    ══════════════════════════════════════════ */
    let rebuildTimer = 0;
    let activeEruption = 'vesuvius79';
    let simTime = 0;
    const wind = { x: 0, z: 0 };
    let lavaBase = 0;

    let customVents = [];
    let currentView = 'surface';

    const lavaFlow = window.LiquidEngine?.createFlowParticles({
      material: 'lava', max: lavaRenderMax, gravity: 4.5,
      groundAt: (x, z) => terrainHeightAt(x, z),
      slopeAt: (x, z) => slopeDir(x, z),
      bounds: { left: -19, right: 19, front: -19, back: 19 }
    });

    function syncLavaParticles() {
      for (let i = 0; i < lavaRenderMax; i++) {
        const particle = lavaFlow?.particles[i];
        const p3 = i * 3;
        if (!particle) {
          lavaRenderPos[p3 + 1] = -9999;
          lavaRenderSize[i] = 0;
          continue;
        }
        lavaRenderPos[p3] = particle.x;
        lavaRenderPos[p3 + 1] = particle.y;
        lavaRenderPos[p3 + 2] = particle.z;
        const heat = particle.temperature;
        lavaRenderCol[p3] = 1;
        lavaRenderCol[p3 + 1] = 0.16 + heat * 0.72;
        lavaRenderCol[p3 + 2] = 0.02 + heat * 0.12;
        lavaRenderSize[i] = particle.size * (0.8 + heat * 1.8);
      }
      lavaRenderGeo.attributes.position.needsUpdate = true;
      lavaRenderGeo.attributes.color.needsUpdate = true;
      lavaRenderGeo.attributes.size.needsUpdate = true;
    }

    let isPlaying = false;
    let playbackSpeed = 1.0;
    const ERUPTION_BASE_DURATION = 32;

    function updateTelemetryHUD() {
      const ev = ERUPTIONS.find(e => e.id === activeEruption) || ERUPTIONS[0];
      const record = window.VolcanoHistory[activeEruption] || {};
      const isHistorical = state.mode === 'historical';

      // 1. Mass Discharge Rate (MDR) via Sparks (1986): H_t = 1.67 * M_dot^0.259 => M_dot = (H_t / 1.67)^3.861
      let mdrKgPerSec = 0;
      if (state.intensity > 0 && state.column > 0) {
        const theoreticalMaxMdr = Math.pow(state.column / 1.67, 3.861);
        mdrKgPerSec = theoreticalMaxMdr * (state.intensity / 100);
      }

      const mdrEl = document.getElementById('hud-telem-mdr');
      const meterMdrEl = document.getElementById('hud-meter-mdr');
      if (mdrEl) {
        if (mdrKgPerSec < 10) {
          mdrEl.innerHTML = `0.0 <small>kg/s</small>`;
        } else if (mdrKgPerSec < 1e5) {
          mdrEl.innerHTML = `${(mdrKgPerSec / 1000).toFixed(1)} <small>t/s</small>`;
        } else if (mdrKgPerSec < 1e8) {
          mdrEl.innerHTML = `${(mdrKgPerSec / 1e6).toFixed(2)} <small>×10⁶ kg/s</small>`;
        } else {
          mdrEl.innerHTML = `${(mdrKgPerSec / 1e8).toFixed(2)} <small>×10⁸ kg/s</small>`;
        }
      }
      if (meterMdrEl) {
        const pct = mdrKgPerSec > 1 ? clamp(Math.log10(mdrKgPerSec) / 8.8 * 100, 0, 100) : 0;
        meterMdrEl.style.width = pct.toFixed(1) + '%';
      }

      // 2. Cumulative Erupted DRE Volume (V)
      let maxDRE = 1.0;
      if (record.ejecta && typeof record.ejecta === 'string') {
        const match = record.ejecta.match(/([0-9.]+)\s*km/);
        if (match) maxDRE = parseFloat(match[1]);
      } else if (ev.vei !== undefined) {
        const dreByVei = [0.00001, 0.0001, 0.002, 0.02, 0.2, 2.5, 20.0, 120.0, 1100.0];
        maxDRE = dreByVei[ev.vei] || 1.0;
      }
      const curDRE = maxDRE * Math.min(1.0, Math.pow(state.timeline / 0.85, 1.6));
      const volEl = document.getElementById('hud-telem-vol');
      const veiEl = document.getElementById('hud-telem-vei');
      if (volEl) {
        if (curDRE < 0.01) {
          volEl.innerHTML = `${(curDRE * 1000).toFixed(1)} <small>×10⁶ m³</small>`;
        } else {
          volEl.innerHTML = `${curDRE.toFixed(2)} <small>km³ DRE</small>`;
        }
      }
      if (veiEl) {
        let dynamicVei = 0;
        if (curDRE >= 1000) dynamicVei = 8;
        else if (curDRE >= 100) dynamicVei = 7;
        else if (curDRE >= 10) dynamicVei = 6;
        else if (curDRE >= 1) dynamicVei = 5;
        else if (curDRE >= 0.1) dynamicVei = 4;
        else if (curDRE >= 0.01) dynamicVei = 3;
        else if (curDRE >= 0.001) dynamicVei = 2;
        else if (curDRE >= 0.0001) dynamicVei = 1;
        veiEl.textContent = `VEI ${dynamicVei} · ${isHistorical ? 'Historical' : 'Model'}`;
      }

      // 3. Plume Altitude & Atmospheric Boundary Stratification
      const colEl = document.getElementById('hud-telem-col');
      const stratEl = document.getElementById('hud-telem-strat');
      if (colEl) {
        colEl.innerHTML = `${state.column.toFixed(1)} <small>km</small>`;
      }
      if (stratEl) {
        if (state.column > 20) {
          stratEl.className = 'telem-pill strat-high';
          stratEl.textContent = 'Upper Stratosphere';
        } else if (state.column > 11) {
          stratEl.className = 'telem-pill strat-mid';
          stratEl.textContent = 'Lower Stratosphere';
        } else {
          stratEl.className = 'telem-pill strat-low';
          stratEl.textContent = 'Troposphere (ABL)';
        }
      }

      // 4. Petrological Temperature & Silicate Melt Composition
      const meltTempC = Math.round(1220 - (state.viscosity / 100) * 440);
      const tempEl = document.getElementById('hud-telem-temp');
      const compEl = document.getElementById('hud-telem-comp');
      if (tempEl) {
        tempEl.innerHTML = `${meltTempC.toLocaleString()} <small>°C</small>`;
      }
      if (compEl) {
        if (state.viscosity < 25) {
          compEl.textContent = `Basaltic · 50% SiO₂`;
        } else if (state.viscosity < 50) {
          compEl.textContent = `Andesitic · 58% SiO₂`;
        } else if (state.viscosity < 75) {
          compEl.textContent = `Dacitic · 65% SiO₂`;
        } else {
          compEl.textContent = `Rhyolitic · 74% SiO₂`;
        }
      }

      // 5. Stratospheric SO2 Mass
      const so2El = document.getElementById('hud-telem-so2');
      if (so2El) {
        if (state.column >= 11 && curDRE > 0.01) {
          const partitionFactor = (100 - state.viscosity) / 100 * 1.8 + 0.3;
          const so2Mt = Math.min(60.0, curDRE * partitionFactor * 0.85);
          so2El.innerHTML = `${so2Mt.toFixed(1)} <small>Mt SO₂</small>`;
        } else {
          so2El.innerHTML = `0.0 <small>Mt</small>`;
        }
      }

      // 6. Dynamic Physical Hazard Matrix
      const hazardEl = document.getElementById('hud-telem-hazard');
      if (hazardEl) {
        const isStHelensBlast = activeEruption === 'sthelenr1980' && state.timeline >= 0.15 && state.timeline <= 0.32;
        if (isStHelensBlast || (state.intensity > 15 && state.pyro > 20)) {
          hazardEl.className = 'telem-hazard-status status-danger';
          const pFront = Math.round(35 + (state.pyro / 100) * 85 + (state.intensity / 100) * 25);
          const pDyn = (2.5 + Math.pow(state.pyro / 100, 2) * 32.0).toFixed(1);
          const pTemp = Math.round(450 + (state.pyro / 100) * 380);
          hazardEl.textContent = `DANGER: Pyroclastic Density Current (${pFront} m/s · ${pDyn} kPa · ${pTemp} °C)`;
        } else if (state.intensity > 40 && state.column > 25) {
          hazardEl.className = 'telem-hazard-status status-plume';
          hazardEl.textContent = 'EXTREME: Umbrella Cloud & Stratospheric Plume';
        } else if (activeEruption === 'eyja2010' && state.timeline >= 0.14 && state.timeline <= 0.40) {
          hazardEl.className = 'telem-hazard-status status-ice';
          hazardEl.textContent = 'ALERT: Jökulhlaup Subglacial Outburst Flood';
        } else if (state.intensity > 35 && state.viscosity < 35) {
          hazardEl.className = 'telem-hazard-status status-lava';
          hazardEl.textContent = 'HAZARD: Rapid Basaltic Effusion & Inundation';
        } else if (state.intensity > 20) {
          hazardEl.className = 'telem-hazard-status status-warn';
          hazardEl.textContent = 'ADVISORY: Ash Fall & Airborne Tephra Hazard';
        } else {
          hazardEl.className = 'telem-hazard-status status-green';
          hazardEl.textContent = 'Quiescent · Pre-Eruptive Baseline';
        }
      }
    }

    function updateReadouts() {
      const ev = ERUPTIONS.find(e => e.id === activeEruption);
      const historical = state.mode === 'historical';
      const record = window.VolcanoHistory[activeEruption] || {};
      const values = {
        ejecta: historical && record.ejecta ? record.ejecta : 'Unavailable',
        temp: historical && record.temp ? record.temp : 'Not modeled',
        col: historical && record.column ? record.column : (state.column + ' km · model input'),
        so2: historical && record.so2 ? record.so2 : 'Unavailable',
        ash: historical && record.ash ? record.ash : 'Not modeled',
        vei: historical ? ev.vei + ' · historical classification' : 'Not inferred'
      };
      for (const [key, value] of Object.entries(values)) document.getElementById('out-' + key).textContent = value;
      document.querySelectorAll('.vei-seg').forEach((seg, idx) => seg.classList.toggle('active', historical && idx <= ev.vei));
      document.getElementById('vei-badge').textContent = historical ? 'Historical sequence · VEI ' + ev.vei : 'Hypothetical model';
      document.getElementById('readout-note').textContent = historical
        ? 'Historical readouts cite published geological literature and satellite observations. Unmodeled metrics are marked unavailable.'
        : 'Hypothetical exploration model. No calibrated ejecta, temperature, SO₂ or ash-dispersal solver is available for user-adjusted parameters. Plume height is a scene input, not an observed measurement.';

      // Dynamic PDC Laboratory Metrics
      const outPdcSpd = document.getElementById('out-pdc-spd');
      const outPdcDyn = document.getElementById('out-pdc-dyn');
      const outPdcTemp = document.getElementById('out-pdc-temp');
      const outPdcRunout = document.getElementById('out-pdc-runout');
      const outPdcRegime = document.getElementById('out-pdc-regime');

      if (outPdcSpd) {
        const isStHelensBlast = activeEruption === 'sthelenr1980' && state.timeline >= 0.15 && state.timeline <= 0.32;
        if (isStHelensBlast) {
          const spd = Math.round(110 + (state.intensity / 100) * 45);
          outPdcSpd.textContent = `${spd} m/s (${Math.round(spd * 3.6)} km/h)`;
          if (outPdcDyn) outPdcDyn.textContent = `${(18.0 + (state.intensity / 100) * 24.0).toFixed(1)} kPa`;
          if (outPdcTemp) outPdcTemp.textContent = '780 °C';
          if (outPdcRunout) outPdcRunout.textContent = '28.5 km';
          if (outPdcRegime) {
            outPdcRegime.innerHTML = 'Regime: <strong>Directed Lateral Blast</strong> — Supersonic northward decompression blast unroofing cryptodome; extreme dynamic pressure (>30 kPa) felling timber and obliterating topography across 600 km².';
          }
        } else if (state.pyro >= 12 && state.intensity > 5) {
          const pdcSpeed = Math.round(35 + (state.pyro / 100) * 80 + (state.intensity / 100) * 35);
          const pdcDyn = (2.5 + Math.pow(state.pyro / 100, 2) * 34.0).toFixed(1);
          const pdcTemp = Math.round(420 + (state.pyro / 100) * 420);
          const pdcRunout = (3.2 + (state.pyro / 100) * 16.5).toFixed(1);

          outPdcSpd.textContent = `${pdcSpeed} m/s (${Math.round(pdcSpeed * 3.6)} km/h)`;
          if (outPdcDyn) outPdcDyn.textContent = `${pdcDyn} kPa`;
          if (outPdcTemp) outPdcTemp.textContent = `${pdcTemp} °C`;
          if (outPdcRunout) outPdcRunout.textContent = `${pdcRunout} km`;
          if (outPdcRegime) {
            if (state.pyro > 65) {
              outPdcRegime.innerHTML = 'Regime: <strong>Total Column Collapse</strong> — Mass eruption rate overwhelms convective air entrainment; dense fountain collapse cascades radially down all flanks in continuous ground-hugging density currents.';
            } else {
              outPdcRegime.innerHTML = 'Regime: <strong>Partial Column Collapse & Valley Inundation</strong> — Pulsing annular collapse sheets channelizing into radial ravines with co-ignimbrite ash surge lofting.';
            }
          }
        } else {
          outPdcSpd.textContent = '0 m/s';
          if (outPdcDyn) outPdcDyn.textContent = '0.0 kPa';
          if (outPdcTemp) outPdcTemp.textContent = 'Ambient';
          if (outPdcRunout) outPdcRunout.textContent = '0.0 km';
          if (outPdcRegime) {
            outPdcRegime.innerHTML = 'Regime: <strong>Buoyant Plume</strong> — Convective air entrainment sustains upward thermal ascent; column remains gravitationally stable.';
          }
        }
      }

      updateTelemetryHUD();
    }

    function syncSliderProgress(slider) {
      if (!slider) return;
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      const val = parseFloat(slider.value);
      const minVal = isFinite(min) ? min : 0;
      const maxVal = isFinite(max) ? max : 100;
      const currVal = isFinite(val) ? val : minVal;
      const pct = maxVal === minVal ? 0 : Math.max(0, Math.min(100, ((currVal - minVal) / (maxVal - minVal)) * 100));
      slider.style.setProperty('--range-pct', pct.toFixed(2) + '%');
    }

    function syncAllSliderProgress() {
      document.querySelectorAll('.param-row input[type="range"], #s-timeline').forEach(syncSliderProgress);
    }

    function syncMode() {
      const historical = state.mode === 'historical';
      document.getElementById('eruption-mode').value = state.mode;
      document.getElementById('mode-note').textContent = historical
        ? 'Documented event sequence; locked illustrative animation. Use exploration to change parameters.'
        : 'Hypothetical model — settings and flow paths do not reconstruct the selected event.';
      document.querySelectorAll('#s-intensity, #s-column, #s-viscosity, #s-pyro, .type-tab').forEach(el => el.disabled = historical);
      document.querySelector('[data-id="yellowstone"]').hidden = historical;
      syncAllSliderProgress();
      conduitEngine?.setMode(state.mode);
      const conduitToolbar = document.getElementById('conduit-toolbar');
      if (conduitToolbar) {
        conduitToolbar.style.display = state.mode === 'exploration' ? 'flex' : 'none';
      }
    }

    function applyPhase() {
      const record = window.VolcanoHistory[activeEruption];
      const frames = record.timeline;
      let n = frames.findLastIndex(f => state.timeline >= f.at);
      n = Math.max(0, n);
      const a = frames[n], b = frames[Math.min(n + 1, frames.length - 1)];
      document.getElementById('phase-label').textContent = (state.mode === 'historical' ? 'Historical phase: ' : 'Reference phase only: ') + a.label;
      document.getElementById('s-timeline').setAttribute('aria-valuetext', a.label);
      conduitEngine?.setTimeline(state.timeline, state.intensity);
      if (state.mode !== 'historical') return;
      // Hold each phase's level so the scene matches its label; ease into the
      // next phase only over the last quarter of the span.
      const span = a === b ? 0 : (state.timeline - a.at) / (b.at - a.at);
      const ramp = clamp((span - 0.75) / 0.25, 0, 1);
      const t = ramp * ramp * (3 - 2 * ramp);
      const ev = ERUPTIONS.find(e => e.id === activeEruption);
      state.intensity = ev.intensity * lerp(a.intensity, b.intensity, t);
      state.pyro = ev.pyro * lerp(a.pyro, b.pyro, t);
      conduitEngine?.setTimeline(state.timeline, state.intensity);
      const sIntensity = document.getElementById('s-intensity');
      const sPyro = document.getElementById('s-pyro');
      sIntensity.value = state.intensity;
      syncSliderProgress(sIntensity);
      document.getElementById('v-intensity').textContent = Math.round(state.intensity) + '%';
      sPyro.value = state.pyro;
      syncSliderProgress(sPyro);
      document.getElementById('v-pyro').textContent = Math.round(state.pyro) + '%';
    }


    function rebuildTimelinePips() {
      const pipsContainer = document.getElementById('tl-pips');
      if (!pipsContainer) return;
      pipsContainer.replaceChildren();

      const record = window.VolcanoHistory[activeEruption];
      if (!record || !record.timeline) return;

      record.timeline.forEach((frame, idx) => {
        const pip = document.createElement('button');
        pip.type = 'button';
        pip.className = 'tl-pip';
        pip.style.left = (frame.at * 100).toFixed(2) + '%';
        pip.setAttribute('aria-label', `Phase ${idx + 1}: ${frame.label}`);
        pip.title = `Phase ${idx + 1}: ${frame.label} (at ${(frame.at * 100).toFixed(0)}%)`;
        pip.innerHTML = `<span class="tl-pip-num">${idx + 1}</span>`;
        pip.addEventListener('click', (e) => {
          e.stopPropagation();
          jumpToTimeline(frame.at);
        });
        pipsContainer.appendChild(pip);
      });
    }

    function updateTimelinePips() {
      const record = window.VolcanoHistory[activeEruption];
      if (!record || !record.timeline) return;

      const frames = record.timeline;
      let activeIdx = frames.findLastIndex(f => state.timeline >= f.at);
      if (activeIdx < 0) activeIdx = 0;

      const pips = document.querySelectorAll('.tl-pip');
      pips.forEach((p, idx) => {
        p.classList.toggle('active', idx === activeIdx);
        p.classList.toggle('passed', idx < activeIdx);
      });

      const phasePill = document.getElementById('tl-phase-pill');
      const phaseTitle = document.getElementById('tl-phase-title');
      const timestampEl = document.getElementById('tl-timestamp');

      if (phasePill) phasePill.textContent = `PHASE ${activeIdx + 1} / ${frames.length}`;
      if (phaseTitle) phaseTitle.textContent = frames[activeIdx]?.label || 'Active Phase';

      if (timestampEl) {
        const ev = ERUPTIONS.find(e => e.id === activeEruption);
        if (ev && ev.duration) {
          const elapsedHours = state.timeline * ev.duration;
          const h = Math.floor(elapsedHours);
          const m = Math.floor((elapsedHours - h) * 60);
          timestampEl.textContent = `T+${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
        } else {
          const totalSec = Math.floor(state.timeline * 86400);
          const h = Math.floor(totalSec / 3600);
          const m = Math.floor((totalSec % 3600) / 60);
          const s = totalSec % 60;
          timestampEl.textContent = `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
      }
    }

    function jumpToTimeline(val) {
      const prevStage = state.timeline;
      state.timeline = clamp(val, 0, 1);
      const sTl = document.getElementById('s-timeline');
      if (sTl) {
        sTl.value = state.timeline;
        syncSliderProgress(sTl);
      }
      if (state.timeline < prevStage || state.timeline === 0) { resetLavaField(); resetPdcField(); }
      applyPhase();
      updateSky(state.intensity);
      const lavaI = (1 - state.viscosity / 100) * (state.intensity / 100);
      updateTerrain(state.vtype, lavaI, state.timeline);
      updateEnvironments(state.timeline);
      updateLighting(state.intensity / 100);
      updateReadouts();
      updateTimelinePips();
    }

    function stepPhase(dir) {
      const record = window.VolcanoHistory[activeEruption];
      if (!record || !record.timeline) return;
      const frames = record.timeline;
      let idx = frames.findLastIndex(f => state.timeline >= f.at);
      if (idx < 0) idx = 0;
      const targetIdx = clamp(idx + dir, 0, frames.length - 1);
      jumpToTimeline(frames[targetIdx].at);
    }

    function togglePlay() {
      if (state.timeline >= 1.0) {
        jumpToTimeline(0.0);
      }
      isPlaying = !isPlaying;
      updatePlayBtnState();
    }

    function updatePlayBtnState() {
      const btn = document.getElementById('btn-tl-play');
      if (!btn) return;
      if (isPlaying) {
        btn.textContent = '⏸';
        btn.classList.add('playing');
        btn.title = 'Pause Eruption Sequence (Space)';
        btn.setAttribute('aria-label', 'Pause Eruption');
      } else {
        btn.textContent = '▶';
        btn.classList.remove('playing');
        btn.title = 'Play Eruption Sequence (Space)';
        btn.setAttribute('aria-label', 'Play Eruption');
      }
    }

    /* ══════════════════════════════════════════
       UI BINDINGS
    ══════════════════════════════════════════ */
    // Build VEI bar
    const veiColors = ['#90c860','#b0e040','#f0d030','#f0a020','#f06020','#e03010','#c01010','#a00808','#800000'];
    const veiBar = document.getElementById('vei-bar');
    veiColors.forEach((c, idx) => {
      const seg = document.createElement('div');
      seg.className = 'vei-seg' + (idx <= 5 ? ' active' : '');
      seg.style.background = c;
      veiBar.appendChild(seg);
    });

    // Build eruption cards
    const scroll = document.getElementById('eruption-scroll');
    ERUPTIONS.forEach(ev => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'ev-card' + (ev.id === activeEruption ? ' active' : '');
      card.dataset.id = ev.id;
      card.innerHTML = `<div class="ev-flag">${ev.flag}</div><div class="ev-name">${ev.name}</div><div class="ev-year">${ev.year}</div><span class="ev-vei">${ev.id === 'yellowstone' ? 'Hypothetical' : 'Historical VEI ' + ev.vei}</span>`;
      card.addEventListener('click', () => loadEruption(ev.id));
      scroll.appendChild(card);
    });

    function loadEruption(id) {
      const ev = ERUPTIONS.find(e => e.id === id);
      if (id === 'yellowstone') state.mode = 'exploration';
      else state.mode = 'historical';
      activeEruption = id;
      resetLavaField();
      resetPdcField();

      isPlaying = false;
      updatePlayBtnState();

      // Update active card
      document.querySelectorAll('.ev-card').forEach(c => c.classList.toggle('active', c.dataset.id === id));
      // Keep the active card visible (scrolling only the strip, never the page).
      const activeCard = scroll.querySelector(`[data-id="${id}"]`);
      if (activeCard) scroll.scrollLeft = activeCard.offsetLeft - scroll.offsetLeft - 4;

      // Set sliders
      state.timeline  = 0.0;
      state.intensity = 0; // Starts at 0 for pre-eruption
      state.column    = ev.column;
      state.viscosity = ev.viscosity;
      state.pyro      = ev.pyro;
      state.vtype     = ev.vtype;

      const tlSlider = document.getElementById('s-timeline');
      if (tlSlider) tlSlider.value = 0;

      document.getElementById('s-intensity').value = 0;
      document.getElementById('s-column').value    = ev.column;
      document.getElementById('s-viscosity').value = ev.viscosity;
      document.getElementById('s-pyro').value      = ev.pyro;
      syncAllSliderProgress();
      document.getElementById('v-intensity').textContent = '0%';
      document.getElementById('v-column').textContent    = ev.column + ' km';
      document.getElementById('v-viscosity').textContent = viscosityLabel(ev.viscosity);
      document.getElementById('v-pyro').textContent      = ev.pyro + '%';

      // Type tabs
      document.querySelectorAll('.type-tab').forEach(t => t.classList.toggle('active', t.dataset.vtype === ev.vtype));

      // Badges and description
      document.getElementById('vol-name-badge').textContent = ev.flag + ' ' + ev.name + ' — ' + ev.year;
      const record = window.VolcanoHistory[id];
      if (record && record.wind) {
        wind.x = record.wind.x;
        wind.z = record.wind.z;
      } else {
        wind.x = 0;
        wind.z = 0;
      }
      document.getElementById('event-desc').textContent = record.note;
      const evidence = document.getElementById('historical-evidence');
      evidence.replaceChildren();
      const phases = document.createElement('ol');
      record.timeline.forEach(f => { const item = document.createElement('li'); item.textContent = f.label; phases.append(item); });
      const source = document.createElement('a'); source.href = record.source; source.textContent = 'Read the evidence and its context';
      evidence.append(phases, source);
      conduitEngine?.loadBaseline(id);
      conduitEngine?.setTimeline(0, 0);

      const cardHost = document.getElementById('card-ch-host');
      if (cardHost) cardHost.textContent = record.host || 'Continental';
      syncMode();
      applyPhase();
      rebuildTimelinePips();
      updateTimelinePips();

      const photoContainer = document.getElementById('event-photo-container');
      const photoImg = document.getElementById('event-photo');
      const photoCaption = document.getElementById('event-photo-caption');

      if (ev.photoCaption && ev.photoCredit) {
         photoImg.src = ev.photo;
         photoImg.alt = ev.photoCaption;
         photoCaption.replaceChildren();
         const capText = document.createElement('span');
         capText.className = 'plb-caption';
         capText.textContent = ev.photoCaption;
         const creditText = document.createElement('span');
         creditText.className = 'plb-credit';
         creditText.style.display = 'block';
         creditText.style.fontSize = '0.68rem';
         creditText.style.color = 'var(--text-muted, #9fb4d6)';
         creditText.style.marginTop = '0.25rem';
         creditText.textContent = ev.photoCredit;
         photoCaption.append(capText, creditText);
         photoContainer.style.display = 'block';
      } else {
         photoContainer.style.display = 'none';
      }

      // Real footage, when the eruption has a public-domain film in the video library
      const videoBox = document.getElementById('event-video');
      videoBox.querySelectorAll('video').forEach(v => v.pause());
      videoBox.replaceChildren();
      if (ev.video) {
         const fig = document.createElement('figure');
         fig.dataset.video = ev.video;
         const cap = document.createElement('figcaption');
         cap.textContent = ev.videoCaption || '';
         fig.append(cap);
         videoBox.append(fig);
      }

      rebuildTerrain();
      updateReadouts();
      updateSky(state.intensity);
      updateLighting(state.intensity / 100);
      updateEnvironments(state.timeline);
    }


    let terrainRequest = 0;
    function rebuildTerrain() {
      const request = ++terrainRequest;
      const eruption = activeEruption;
      Promise.all([
        fetchHeightmap(eruption),
        fetchColormap(eruption)
      ]).then(() => {
        if (request !== terrainRequest || eruption !== activeEruption) return;
        const lavaI = (1 - state.viscosity / 100) * (state.intensity / 100);
        buildTerrain(state.vtype, lavaI);
      });
    }

    // Slider listeners
    function bindSlider(id, key, fmtFn) {
      const el = document.getElementById('s-' + id);
      if (!el) return;
      el.addEventListener('input', function () {
        if (state.mode !== 'exploration') return;
        state[key] = parseFloat(this.value);
        syncSliderProgress(this);
        const vel = document.getElementById('v-' + id);
        if (vel) vel.textContent = fmtFn(state[key]);
        if (key === 'viscosity' || key === 'intensity') {
          clearTimeout(rebuildTimer);
          rebuildTimer = setTimeout(() => {
            const lavaI = (1 - state.viscosity / 100) * (state.intensity / 100);
            updateTerrain(state.vtype, lavaI, state.timeline);
          }, 50);
        }
        if (key === 'intensity') {
          conduitEngine?.setTimeline(state.timeline, state.intensity);
        }
        updateReadouts();
        updateSky(state.intensity);
        updateLighting(state.intensity / 100);
      });
    }
    bindSlider('intensity', 'intensity', v => v + '%');
    bindSlider('column',    'column',    v => v + ' km');
    bindSlider('viscosity', 'viscosity', viscosityLabel);
    bindSlider('pyro',      'pyro',      v => v + '%');

    document.getElementById('s-timeline').addEventListener('input', function() {
       jumpToTimeline(parseFloat(this.value));
    });

    // Transport buttons
    document.getElementById('btn-tl-play')?.addEventListener('click', togglePlay);
    document.getElementById('btn-tl-prev')?.addEventListener('click', () => stepPhase(-1));
    document.getElementById('btn-tl-next')?.addEventListener('click', () => stepPhase(1));
    document.getElementById('btn-tl-reset')?.addEventListener('click', () => {
      isPlaying = false;
      updatePlayBtnState();
      jumpToTimeline(0.0);
    });

    // Speed chips
    document.querySelectorAll('.tl-speed-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.tl-speed-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        playbackSpeed = parseFloat(chip.dataset.speed) || 1.0;
      });
    });

    // Camera Director buttons
    document.querySelectorAll('.cam-btn').forEach(btn => {
      if (btn.id === 'btn-cam-spin') {
        btn.addEventListener('click', () => {
          isAutoSpin = !isAutoSpin;
          btn.classList.toggle('active', isAutoSpin);
        });
      } else if (btn.dataset.cam) {
        btn.addEventListener('click', () => {
          setCameraPreset(btn.dataset.cam);
        });
      }
    });

    // Tab Switching for both panels
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const panel = tab.closest('.blender-panel');
        if (!panel) return;
        const targetTabId = tab.dataset.tab;
        panel.querySelectorAll('.panel-tab').forEach(t => {
          t.classList.toggle('active', t === tab);
          t.setAttribute('aria-selected', String(t === tab));
        });
        panel.querySelectorAll('.panel-tab-pane').forEach(pane => {
          pane.classList.toggle('active', pane.id === targetTabId);
        });
      });
    });

    // Panel Collapse / Expand Drawer Controls
    function togglePanel(side, open) {
      const panel = document.getElementById('panel-' + side);
      const launcher = document.getElementById('btn-open-' + side);
      if (!panel || !launcher) return;

      const willCollapse = open !== undefined ? !open : !panel.classList.contains('collapsed');
      panel.classList.toggle('collapsed', willCollapse);
      launcher.classList.toggle('visible', willCollapse);
    }

    document.getElementById('btn-close-left')?.addEventListener('click', () => togglePanel('left', false));
    document.getElementById('btn-open-left')?.addEventListener('click', () => togglePanel('left', true));
    document.getElementById('btn-close-right')?.addEventListener('click', () => togglePanel('right', false));
    document.getElementById('btn-open-right')?.addEventListener('click', () => togglePanel('right', true));

    // Clean View Toggle
    function toggleCleanView() {
      const workspace = document.querySelector('.vol-workspace');
      const btn = document.getElementById('btn-clean-view');
      if (!workspace) return;
      const isClean = workspace.classList.toggle('hud-hidden');
      if (btn) btn.classList.toggle('active', isClean);
    }
    document.getElementById('btn-clean-view')?.addEventListener('click', toggleCleanView);

    // Preset Filter Chips
    document.querySelectorAll('.preset-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.preset-filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;

        document.querySelectorAll('.ev-card').forEach(card => {
          const id = card.dataset.id;
          const ev = ERUPTIONS.find(e => e.id === id);
          if (!ev) return;

          let show = false;
          if (filter === 'all') {
            show = true;
          } else if (filter === 'plinian') {
            show = ev.column >= 20 || ev.vei >= 4;
          } else if (filter === 'effusive') {
            show = ev.viscosity < 30 || ev.vtype === 'shield';
          } else if (filter === 'caldera') {
            show = ev.vtype === 'caldera' || ev.vtype === 'super';
          } else if (filter === 'super') {
            show = ev.id === 'taupo' || ev.id === 'yellowstone';
          }
          card.hidden = !show;
        });
      });
    });

    // Preset Scroll Arrows
    const presetScroll = document.getElementById('eruption-scroll');
    document.getElementById('btn-scroll-left')?.addEventListener('click', () => {
      presetScroll?.scrollBy({ left: -160, behavior: 'smooth' });
    });
    document.getElementById('btn-scroll-right')?.addEventListener('click', () => {
      presetScroll?.scrollBy({ left: 160, behavior: 'smooth' });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyH' || (e.code === 'Tab' && e.altKey)) {
        e.preventDefault();
        toggleCleanView();
      } else if (e.code === 'KeyO') {
        isAutoSpin = !isAutoSpin;
        document.getElementById('btn-cam-spin')?.classList.toggle('active', isAutoSpin);
      } else if (e.code === 'KeyR') {
        isPlaying = false;
        updatePlayBtnState();
        jumpToTimeline(0.0);
      } else if (e.shiftKey && e.code === 'ArrowLeft') {
        e.preventDefault();
        stepPhase(-1);
      } else if (e.shiftKey && e.code === 'ArrowRight') {
        e.preventDefault();
        stepPhase(1);
      } else if (e.code === 'Digit1') {
        setCameraPreset('orbit');
      } else if (e.code === 'Digit2') {
        setCameraPreset('vent');
      } else if (e.code === 'Digit3') {
        setCameraPreset('flank');
      } else if (e.code === 'Digit4') {
        setCameraPreset('plume');
      } else if (e.code === 'Digit5') {
        setCameraPreset('flow');
      }
    });

    document.getElementById('eruption-mode').addEventListener('change', function() {
      const targetMode = this.value;
      if (targetMode === 'historical' && activeEruption === 'yellowstone') {
        state.mode = 'historical';
        loadEruption('vesuvius79');
        return;
      }
      state.mode = targetMode;
      syncMode();
      if (state.mode === 'historical') {
        applyPhase();
      }
      syncAllSliderProgress();
      updateReadouts();
    });

    // Type tab clicks
    document.getElementById('type-tabs').addEventListener('click', e => {
      const btn = e.target.closest('.type-tab');
      if (!btn || state.mode !== 'exploration') return;
      document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      state.vtype = btn.dataset.vtype;
      activeEruption = null;
      document.querySelectorAll('.ev-card').forEach(c => c.classList.remove('active'));
      document.getElementById('vol-name-badge').textContent = 'Parametric ' + vtypeName(state.vtype);
      document.getElementById('vei-badge').textContent = 'Parametric model';
      resetLavaField();
      resetPdcField();
      rebuildTerrain();
      updateReadouts();
    });

    function updateLighting(t) {
      const flow = 1 - state.viscosity / 100;
      lavaBase = t * (1.6 + flow * 3.2);
      lavaLight.color.setRGB(1.0, 0.35 + t * 0.25, 0.05);
      rimLight.intensity = t * 0.65;

      // Calculate current time of day based on the timeline and active eruption
      let currentHour = 12; // Default noon
      const ev = ERUPTIONS.find(e => e.id === activeEruption);
      if (ev && ev.timeOfDay !== undefined) {
         currentHour = (ev.timeOfDay + state.timeline * ev.duration) % 24;
      }

      // Sun positioning and intensity
      const sunAngle = ((currentHour - 12) / 24) * Math.PI * 2; // Noon = 0 rad (top)
      sunLight.position.set(Math.sin(sunAngle) * 20, Math.cos(sunAngle) * 20, 6);

      const sunH = Math.cos(sunAngle); // 1 at noon, -1 at midnight
      const sunBrightness = clamp(sunH * 2.5 + 0.2, 0.0, 1.0); // 0 at night, 1 at day

      // Make night time darker, but leave enough moonlight to see by
      const ambientBrightness = sunBrightness * (1.0 - Math.min(t, 1.0) * 0.7);
      ambientLight.intensity = lerp(0.5, 0.85, ambientBrightness);
      sunLight.intensity = lerp(1.1, 0.1, t * 0.7) * sunBrightness;
      fillLight.intensity = lerp(0.2, 0.05, t) * sunBrightness + (1.0 - sunBrightness) * 1.4; // Moonlight — brighter, cool-toned fill at night

      // Match scene fog color to atmospheric sky and volcanic horizon
      const skyDayFog = new THREE.Color(0xa2b2c4);
      const skyAshFog = new THREE.Color(0x281810);
      const skyNightFog = new THREE.Color(0x02040a);
      const baseFog = skyNightFog.clone().lerp(skyDayFog, sunBrightness);
      const ashFogFactor = Math.min(1.0, (state.intensity / 100) * (state.column / 16));
      baseFog.lerp(skyAshFog, ashFogFactor * 0.75);
      scene.fog.color.copy(baseFog);

      // Sky shader synchronization
      if (skyMat && skyMat.uniforms) {
        if (skyMat.uniforms.sunBrightness) skyMat.uniforms.sunBrightness.value = sunBrightness;
        if (skyMat.uniforms.sunDir) skyMat.uniforms.sunDir.value.copy(sunLight.position).normalize();
        if (skyMat.uniforms.ashAmount) skyMat.uniforms.ashAmount.value = Math.min(1.0, (state.intensity / 100) * (state.column / 15));
        if (skyMat.uniforms.time) skyMat.uniforms.time.value = simTime;
      }

      // Particle shader lighting synchronization
      const glowVal = lavaBase * (1.0 + (1.0 - sunBrightness) * 2.5);
      [ashPool, bombPool, pyroPool, pyroSurgePool, steamPool].forEach(pool => {
        if (pool && pool.mat && pool.mat.uniforms) {
          if (pool.mat.uniforms.sunDir) pool.mat.uniforms.sunDir.value.copy(sunLight.position).normalize();
          if (pool.mat.uniforms.sunColor) pool.mat.uniforms.sunColor.value.copy(sunLight.color);
          if (pool.mat.uniforms.ambientColor) pool.mat.uniforms.ambientColor.value.copy(ambientLight.color);
          if (pool.mat.uniforms.lavaGlow) pool.mat.uniforms.lavaGlow.value = glowVal;
          if (pool.mat.uniforms.craterPos) pool.mat.uniforms.craterPos.value.copy(craterPos);
          if (pool.mat.uniforms.time) pool.mat.uniforms.time.value = simTime;
        }
      });
      if (lavaRenderMat && lavaRenderMat.uniforms) {
        if (lavaRenderMat.uniforms.sunDir) lavaRenderMat.uniforms.sunDir.value.copy(sunLight.position).normalize();
        if (lavaRenderMat.uniforms.lavaGlow) lavaRenderMat.uniforms.lavaGlow.value = glowVal;
        if (lavaRenderMat.uniforms.craterPos) lavaRenderMat.uniforms.craterPos.value.copy(craterPos);
      }

      // Volumetric plume column core shader synchronization
      if (plumeCoreMat && plumeCoreMat.uniforms) {
        const colNorm = state.column / 45;
        const intNorm = state.intensity / 100;
        const plumeH = Math.max(1.0, colNorm * 22.0);
        const ventR = 0.35 + intNorm * 0.55;
        const umbrellaR = Math.max(1.2, colNorm * 14.5 * Math.pow(intNorm, 0.45));

        plumeCoreMat.uniforms.craterPos.value.copy(craterPos);
        plumeCoreMat.uniforms.plumeHeight.value = plumeH;
        plumeCoreMat.uniforms.ventRadius.value = ventR;
        plumeCoreMat.uniforms.umbrellaRadius.value = umbrellaR;
        plumeCoreMat.uniforms.intensity.value = intNorm;
        plumeCoreMat.uniforms.time.value = simTime;
        plumeCoreMat.uniforms.wind.value.set(wind.x, wind.z);
        plumeCoreMat.uniforms.sunDir.value.copy(sunLight.position).normalize();
        plumeCoreMat.uniforms.sunColor.value.copy(sunLight.color);
        plumeCoreMat.uniforms.ambientColor.value.copy(ambientLight.color);
        plumeCoreMat.uniforms.lavaGlow.value = glowVal;
      }
      if (plumeCoreMesh) {
        plumeCoreMesh.visible = (state.intensity > 1 && state.column > 0.5);
      }
    }

    /* ══════════════════════════════════════════
       PARTICLE TICK CALLBACKS
    ══════════════════════════════════════════ */
    const GRAVITY = 4.5;

    function tickAsh(i, t, pool, dt) {
      const px = pool.pos[i*3];
      const py = pool.pos[i*3+1];
      const pz = pool.pos[i*3+2];

      const altitude = Math.max(0, py - craterPos.y);
      const colNorm = state.column / 45;
      const targetColumnH = Math.max(2.0, colNorm * 22.0);
      const nblH = targetColumnH * 0.74; // Neutral Buoyancy Level

      // 1. Morton, Taylor & Turner (1956) Buoyant Jet Dynamics
      let buoyancy;
      if (altitude < nblH) {
        // Convective buoyancy acceleration of hot entrained mixture
        const buoyantFrac = 1.0 - (altitude / nblH);
        buoyancy = 8.5 * Math.pow(buoyantFrac, 0.75) - GRAVITY * 0.15;
      } else {
        // Stratospheric deceleration above NBL / momentum overshoot
        const overshoot = (altitude - nblH) / (targetColumnH * 0.28 + 0.1);
        buoyancy = -GRAVITY * (0.8 + overshoot * 1.5);
      }
      // Falling virga / tephra precipitation from older cloud base
      if (t > 0.55 && altitude > targetColumnH * 0.4) {
        buoyancy -= GRAVITY * 0.45 * (t - 0.55);
      }
      pool.vel[i*3+1] += buoyancy * dt;

      // 2. Multi-frequency turbulence (turbulent Kelvin-Helmholtz billow eddies)
      const turbScale = 0.18;
      const nx = (fbm(py * turbScale - simTime * 0.65, pz * turbScale, 2) - 0.5);
      const ny = (fbm(pz * turbScale - simTime * 0.65, px * turbScale, 2) - 0.5);
      const nz = (fbm(px * turbScale - simTime * 0.65, py * turbScale, 2) - 0.5);
      const turbAmp = 4.2 + (t * 5.5);
      pool.vel[i*3]   += nx * turbAmp * dt;
      pool.vel[i*3+1] += ny * (turbAmp * 0.4) * dt;
      pool.vel[i*3+2] += nz * turbAmp * dt;

      // 3. Stratospheric Umbrella Gravity Current (Sparks 1986; Mastin et al. 2009)
      // Horizontal intrusive gravity current spreading at NBL: u_r ~ 1 / sqrt(r)
      if (altitude > targetColumnH * 0.60) {
        const dx = px - craterPos.x;
        const dz = pz - craterPos.z;
        const dist = Math.hypot(dx, dz) + 0.01;
        const radialSpeed = (4.8 + colNorm * 6.5) / Math.max(1.0, Math.sqrt(dist));
        pool.vel[i*3]   += (dx / dist) * radialSpeed * dt;
        pool.vel[i*3+2] += (dz / dist) * radialSpeed * dt;
      }

      // 4. Aerodynamic drag
      const drag = 1.0 - 0.38 * dt;
      pool.vel[i*3]   *= drag;
      pool.vel[i*3+1] *= drag;
      pool.vel[i*3+2] *= drag;

      // 5. Stratospheric wind shear advection increasing with altitude
      const windFactor = Math.min(2.8, Math.max(0.1, altitude / 4.8));
      pool.vel[i*3]   += wind.x * windFactor * 3.2 * dt;
      pool.vel[i*3+2] += wind.z * windFactor * 3.2 * dt;

      pool.pos[i*3]   += pool.vel[i*3] * dt;
      pool.pos[i*3+1] += pool.vel[i*3+1] * dt;
      pool.pos[i*3+2] += pool.vel[i*3+2] * dt;

      // 6. Ash color gradation (darker juvenile tephra at base, pale pumice aloft)
      const ashTint = lerp(0.85, 1.25, Math.min(1.0, altitude / (targetColumnH * 0.8 + 0.1)));
      pool.col[i*3]   = ashTint * 1.02;
      pool.col[i*3+1] = ashTint * 0.98;
      pool.col[i*3+2] = ashTint * 0.94;

      // 7. Volumetric cauliflower expansion (air entrainment expands billow volume)
      pool.sz[i] += (2.5 + colNorm * 3.8) * dt;
      if (pool.sz[i] > 26.0) pool.sz[i] = 26.0;
    }

    function tickBomb(i, t, pool, dt) {
      pool.vel[i*3+1] -= GRAVITY * 2.2 * dt;
      pool.vel[i*3]   *= (1.0 - 0.15 * dt);
      pool.vel[i*3+2] *= (1.0 - 0.15 * dt);

      pool.pos[i*3]   += pool.vel[i*3] * dt;
      pool.pos[i*3+1] += pool.vel[i*3+1] * dt;
      pool.pos[i*3+2] += pool.vel[i*3+2] * dt;

      const gx = pool.pos[i*3];
      const gz = pool.pos[i*3+2];
      const ground = terrainHeightAt(gx, gz) + 0.08;
      if (pool.pos[i*3+1] <= ground) {
        pool.pos[i*3+1] = ground;
        pool.vel[i*3+1] = Math.abs(pool.vel[i*3+1]) * 0.25;
        const slope = slopeDir(gx, gz);
        pool.vel[i*3]   += slope.x * GRAVITY * 0.8 * dt;
        pool.vel[i*3+2] += slope.z * GRAVITY * 0.8 * dt;
      }

      // Radiative cooling: incandescent white-yellow -> glowing red-orange -> dark crust
      const heat = Math.max(0, 1.0 - t * 1.35);
      pool.col[i*3]   = 1.0;
      pool.col[i*3+1] = heat * 0.85;
      pool.col[i*3+2] = heat * heat * 0.25;
      pool.sz[i] = lerp(0.85, 0.35, t);
    }

    function tickPyroBasal(i, t, pool, dt) {
      const gx = pool.pos[i*3];
      const gz = pool.pos[i*3+2];
      const ground = terrainHeightAt(gx, gz) + 0.12;
      const distToGround = pool.pos[i*3+1] - ground;

      if (distToGround <= 0.28) {
        // ── DENSE BASAL GRANULAR FLOW (UNDERFLOW) ──
        pool.pos[i*3+1] = ground;
        pool.vel[i*3+1] *= 0.08; // Normal velocity damped against bed

        // Valley-following slope acceleration (flows accelerate along steepest descent)
        const slope = slopeDir(gx, gz);
        const slopeMag = terrainSlope(gx, gz);
        const gravAcc = GRAVITY * (2.8 + slopeMag * 2.2);
        pool.vel[i*3]   += slope.x * gravAcc * dt;
        pool.vel[i*3+2] += slope.z * gravAcc * dt;

        // Ravine steering: lateral pressure gradient pulls flow toward valley bottom
        const eps = 0.35;
        const vx = pool.vel[i*3];
        const vz = pool.vel[i*3+2];
        const vLen = Math.hypot(vx, vz) || 1e-4;
        const normX = -vz / vLen;
        const normZ =  vx / vLen;
        const hL = terrainHeightAt(gx + normX * eps, gz + normZ * eps);
        const hR = terrainHeightAt(gx - normX * eps, gz - normZ * eps);
        const valleyCrossSlope = (hR - hL) / (eps * 2.0);
        pool.vel[i*3]   += normX * valleyCrossSlope * GRAVITY * 1.4 * dt;
        pool.vel[i*3+2] += normZ * valleyCrossSlope * GRAVITY * 1.4 * dt;

        // Fluidized bed friction: high pore-gas pressure lowers effective friction
        const fluidFriction = Math.max(0.12, 0.32 - (state.pyro / 100) * 0.14);
        const drag = Math.max(0.0, 1.0 - fluidFriction * dt);
        pool.vel[i*3]   *= drag;
        pool.vel[i*3+2] *= drag;

        // Continuous Elutriation: hot ground-hugging avalanche heats air and lofts fine ash into co-ignimbrite surge
        if (Math.random() < 0.20 && t > 0.05 && t < 0.80) {
          const surgeVx = pool.vel[i*3] * 0.45 + (Math.random() - 0.5) * 1.5;
          const surgeVz = pool.vel[i*3+2] * 0.45 + (Math.random() - 0.5) * 1.5;
          const surgeVy = 3.2 + Math.random() * 4.0;
          pyroSurgePool.emit(
            gx, ground + 0.25, gz,
            surgeVx, surgeVy, surgeVz,
            5.2 + Math.random() * 3.5,
            pool.col[i*3] * 0.7, 0.32, 0.22,
            3.2 + Math.random() * 2.0
          );
        }

        // Dynamic environmental impact: blast damage to trees and structures
        checkPdcEnvironmentalImpact(gx, gz, vLen);
      } else {
        // Free-falling collapsing fountain / airborne clast
        pool.vel[i*3+1] -= GRAVITY * 1.8 * dt;
        pool.vel[i*3]   *= (1.0 - 0.12 * dt);
        pool.vel[i*3+2] *= (1.0 - 0.12 * dt);
      }

      pool.pos[i*3]   += pool.vel[i*3] * dt;
      pool.pos[i*3+1] += pool.vel[i*3+1] * dt;
      pool.pos[i*3+2] += pool.vel[i*3+2] * dt;

      // Thermal Incandescence: hot juvenile clasts (850°C) cool to dark crusted tephra (400°C)
      const heat = Math.max(0.0, 1.0 - Math.pow(t, 0.65) * 1.25);
      pool.col[i*3]   = heat; // Red component carries normalized heat (1.0 = incandescent, 0.0 = cold ash)
      pool.col[i*3+1] = lerp(0.20, 0.45, 1.0 - heat);
      pool.col[i*3+2] = lerp(0.12, 0.38, 1.0 - heat);

      // Basal billow expansion
      pool.sz[i] += (3.2 + state.pyro / 22) * dt;
      if (pool.sz[i] > 20.0) pool.sz[i] = 20.0;
    }

    function tickPyroSurge(i, t, pool, dt) {
      const gx = pool.pos[i*3];
      const gz = pool.pos[i*3+2];
      const ground = terrainHeightAt(gx, gz) + 0.2;

      // ── DILUTE CO-IGNIMBRITE ASH SURGE (PHOENIX CLOUD) ──
      // Strong thermal convective buoyancy (heated entrained air ascends rapidly)
      const buoyancy = (4.8 * Math.max(0.0, 1.0 - t * 0.85)) + (t < 0.25 ? 2.5 : 0.0);
      pool.vel[i*3+1] += buoyancy * dt;

      // Atmospheric shear, lateral turbulent billowing & wind drift
      pool.vel[i*3]   += ((Math.random() - 0.5) * 3.8 + wind.x * 2.0) * dt;
      pool.vel[i*3+2] += ((Math.random() - 0.5) * 3.8 + wind.z * 2.0) * dt;

      // Aerodynamic drag
      const drag = Math.max(0.0, 1.0 - 0.28 * dt);
      pool.vel[i*3]   *= drag;
      pool.vel[i*3+1] *= Math.max(0.0, 1.0 - 0.16 * dt);
      pool.vel[i*3+2] *= drag;

      pool.pos[i*3]   += pool.vel[i*3] * dt;
      pool.pos[i*3+1] += pool.vel[i*3+1] * dt;
      pool.pos[i*3+2] += pool.vel[i*3+2] * dt;

      // Ensure surge stays above terrain
      if (pool.pos[i*3+1] < ground) {
        pool.pos[i*3+1] = ground;
        pool.vel[i*3+1] = Math.max(0.0, pool.vel[i*3+1]) + 1.2;
      }

      // Volumetric cauliflower expansion (air entrainment swells plume volume)
      pool.sz[i] += (4.5 + (1.0 - t) * 6.0) * dt;
      if (pool.sz[i] > 38.0) pool.sz[i] = 38.0;

      // Rapid cooling of fine suspended ash
      const surgeHeat = Math.max(0.0, (1.0 - t * 2.4) * 0.6);
      pool.col[i*3]   = surgeHeat;
      pool.col[i*3+1] = lerp(0.24, 0.42, t);
      pool.col[i*3+2] = lerp(0.20, 0.38, t);
    }

    function tickSteam(i, t, pool, dt) {
      // Strong thermal buoyancy
      pool.vel[i*3+1] += (9.5 - t * 4.0) * dt;

      pool.vel[i*3]   += (Math.random() - 0.5) * 1.8 * dt + wind.x * 2.5 * dt;
      pool.vel[i*3+2] += (Math.random() - 0.5) * 1.8 * dt + wind.z * 2.5 * dt;

      const drag = 1.0 - 0.4 * dt;
      pool.vel[i*3]   *= drag;
      pool.vel[i*3+1] *= drag;
      pool.vel[i*3+2] *= drag;

      pool.pos[i*3]   += pool.vel[i*3] * dt;
      pool.pos[i*3+1] += pool.vel[i*3+1] * dt;
      pool.pos[i*3+2] += pool.vel[i*3+2] * dt;

      // Rapid expansion and dispersion
      pool.sz[i] += 2.2 * dt;
      if (pool.sz[i] > 18.0) pool.sz[i] = 18.0;

      const fade = Math.min(1.0, t * 4.0) * Math.max(0.0, 1.0 - t * 1.2);
      const c = 0.88 * fade + 0.6 * (1.0 - fade);
      pool.col[i*3] = pool.col[i*3+1] = pool.col[i*3+2] = c;
    }

    /* ══════════════════════════════════════════
       ANIMATION LOOP
    ══════════════════════════════════════════ */
    let spawnAcc = 0;

    function animate(dt, ts) {
      dt = Math.min(dt, 0.05);

      if (currentView !== 'cross-section') {
        if (!isDrag) {
          if (isAutoSpin) { camTheta += dt * 0.04; }
          if (isCamLerping) {
            camTheta = lerp(camTheta, targetCamTheta, 0.06);
            camPhi = lerp(camPhi, targetCamPhi, 0.06);
            userDistOffset = lerp(userDistOffset, targetDistOffset, 0.06);
            if (Math.abs(camTheta - targetCamTheta) < 0.01 && Math.abs(camPhi - targetCamPhi) < 0.01) {
              isCamLerping = false;
            }
          }
        }
        updateCam();
      }

      // Timeline Playback Transport loop
      if (isPlaying) {
        const step = (dt / ERUPTION_BASE_DURATION) * playbackSpeed;
        const prevTimeline = state.timeline;
        state.timeline = Math.min(1.0, state.timeline + step);
        const sTl = document.getElementById('s-timeline');
        if (sTl) {
          sTl.value = state.timeline;
          syncSliderProgress(sTl);
        }
        if (state.timeline < prevTimeline || state.timeline === 0) { resetLavaField(); resetPdcField(); }
        applyPhase();
        updateSky(state.intensity);
        const lavaI = (1 - state.viscosity / 100) * (state.intensity / 100);
        updateTerrain(state.vtype, lavaI, state.timeline);
        updateEnvironments(state.timeline);
        updateLighting(state.intensity / 100);
        updateReadouts();
        updateTimelinePips();

        if (state.timeline >= 1.0) {
          isPlaying = false;
          updatePlayBtnState();
        }
      }

      simTime += dt;
      const i = state.intensity / 100;
      const windStrength = lerp(0.05, 0.75, i) + state.column / 120;
      wind.x = Math.sin(simTime * 0.35) * windStrength + 0.05;
      wind.z = Math.cos(simTime * 0.28 + 1.4) * windStrength;

      spawnAcc += dt;
      const tickRate = 0.04;
      if (spawnAcc >= tickRate) {
        spawnAcc = 0;
        const pi = state.pyro / 100;

        if (i > 0.02) {
          spawnLava(i);
          spawnAsh(i, state.column);
          spawnBomb(i);
          spawnSteam(i);
          if (pi > 0.1) spawnPyroclastic(pi, i);

          if (state.mode === 'exploration' && customVents.length > 0) {
            for (const vent of customVents) {
              if (Math.abs(vent.normalizedX) > 0.15) {
                spawnSecondaryVentPuff(vent, i);
              }
            }
          }
        }
      }

      ashPool.update(dt,  tickAsh);
      bombPool.update(dt, tickBomb);
      pyroPool.update(dt, tickPyroBasal);
      pyroSurgePool.update(dt, tickPyroSurge);
      steamPool.update(dt, tickSteam);
      if (envDirty) { envDirty = false; updateEnvironments(state.timeline); }
      lavaFlow?.update(dt);
      syncLavaParticles();
      updateLavaField(dt);
      lavaDeposit.uniforms.time.value = simTime;

      // Volcanic lightning timing during vigorous Plinian & sub-Plinian phases
      if (lightningDuration > 0) {
        lightningDuration -= dt;
        lightningMat.opacity = Math.max(0.0, lightningDuration / 0.12);
        lightningLight.intensity = (lightningDuration / 0.12) * (10.0 + (state.intensity / 100) * 12.0);
      } else {
        lightningMat.opacity = 0.0;
        lightningLight.intensity = 0.0;
        lightningTimer += dt;
        const lightningInterval = Math.max(0.35, 3.2 - (state.intensity / 100) * 1.8 - (state.column / 45) * 1.2);
        if (lightningTimer >= lightningInterval) {
          lightningTimer = 0;
          if (state.intensity >= 45 && state.column >= 10 && Math.random() < 0.75) {
            triggerVolcanicLightning();
          }
        }
      }

      // Keep lighting and shader uniforms synchronized each frame
      updateLighting(i);

      // Organic multi-frequency lava pulse
      const pulse = 0.76 + Math.sin(ts * 0.0031) * 0.13 + Math.sin(ts * 0.0079 + 1.4) * 0.07 + Math.sin(ts * 0.0017 + 2.9) * 0.04;

      // Calculate sun brightness based on time of day for night boost
      let currentHour = 12;
      const ev = ERUPTIONS.find(e => e.id === activeEruption);
      if (ev && ev.timeOfDay !== undefined) currentHour = (ev.timeOfDay + state.timeline * ev.duration) % 24;
      const sunAngle = ((currentHour - 12) / 24) * Math.PI * 2;
      const sunH = Math.cos(sunAngle);
      const sunBrightness = clamp(sunH * 2.5 + 0.2, 0.0, 1.0);

      const nightBoost = 1.0 + (1.0 - sunBrightness) * 4.0; // Glows 5x as bright relative to dark scene at night
      lavaLight.intensity = lavaBase * pulse * nightBoost;

      if (terrainMesh && terrainMesh.material && terrainMesh.material.userData && terrainMesh.material.userData.uniforms) {
        const u = terrainMesh.material.userData.uniforms;
        u.uTime.value = simTime;
        u.uTimeline.value = state.timeline;
        u.uIntensity.value = state.intensity;
      }

      if (currentView !== 'cross-section') {
        renderer.render(scene, camera);
      }

      if (currentView !== 'surface' && conduitEngine) {
        conduitEngine.render(dt);
      }
    }

    function updateConduitHUD(diag) {
      if (!diag) return;
      const depthEl = document.getElementById('hud-chamber-depth');
      const volEl = document.getElementById('hud-magma-vol');
      const pressEl = document.getElementById('hud-overpressure');
      const ventsEl = document.getElementById('hud-vents');

      if (depthEl) depthEl.textContent = `Depth: ${diag.primaryDepthKm} km`;
      if (volEl) volEl.textContent = `Reservoir: ${diag.totalVolumeKm3} km³`;
      if (pressEl) pressEl.textContent = `Lithostatic: ${diag.rockPressureMPa} MPa`;
      if (ventsEl) ventsEl.textContent = `Paths: ${diag.ventCount}`;

      const meltEl = document.getElementById('hud-melt-vol');
      if (meltEl) meltEl.textContent = `Melt: ${diag.meltVolumeKm3} km³`;
      const buoyEl = document.getElementById('hud-buoyancy');
      if (buoyEl) buoyEl.textContent = `Buoyancy: ${diag.buoyancyMPa} MPa`;
      const fluxEl = document.getElementById('hud-conduit-flux');
      if (fluxEl) fluxEl.textContent = diag.massFluxTps ? `Ascent: ${diag.massFluxTps} t/s` : 'Ascent: 0 t/s';
      const velEl = document.getElementById('hud-conduit-vel');
      if (velEl) velEl.textContent = diag.exitVel ? `Exit: ${diag.exitVel} m/s` : 'Exit: 0 m/s';
      const dreEl = document.getElementById('hud-erupted-dre');
      if (dreEl) dreEl.textContent = `Erupted DRE: ${diag.eruptedDRE ? diag.eruptedDRE.join('–') + ' km³' : 'unavailable'}`;
      const cardDepth = document.getElementById('card-ch-depth');
      const cardPress = document.getElementById('card-ch-pressure');
      const cardVol = document.getElementById('card-ch-vol');
      if (cardDepth) cardDepth.textContent = `${diag.primaryDepthKm} km`;
      if (cardPress) cardPress.textContent = `${diag.rockPressureMPa} MPa`;
      if (cardVol) cardVol.textContent = `${diag.totalVolumeKm3} km³`;
    }

    function setSimulationView(view) {
      currentView = view;
      const stage = document.querySelector('.vol-workspace');
      const volOuter = document.getElementById('vol-outer');
      const conduitOuter = document.getElementById('conduit-outer');
      const btnToggleCutaway = document.getElementById('btn-toggle-cutaway');

      document.querySelectorAll('.view-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === view);
      });

      const telemHud = document.getElementById('vol-telemetry-hud');
      const camHud = document.getElementById('cam-director-hud');
      if (view === 'surface') {
        stage?.classList.remove('view-split', 'view-cross-section');
        stage?.classList.add('view-surface');
        if (volOuter) volOuter.style.display = 'block';
        if (conduitOuter) conduitOuter.style.display = 'none';
        if (btnToggleCutaway) btnToggleCutaway.textContent = '🔬 Inspect Subsurface Magma Conduit Cutaway';
        if (telemHud) telemHud.style.display = 'flex';
        if (camHud) camHud.style.display = 'flex';
      } else if (view === 'cross-section') {
        stage?.classList.remove('view-split', 'view-surface');
        stage?.classList.add('view-cross-section');
        if (volOuter) volOuter.style.display = 'none';
        if (conduitOuter) conduitOuter.style.display = 'flex';
        if (btnToggleCutaway) btnToggleCutaway.textContent = '🌋 Return to 3D Surface Dynamics View';
        togglePanel('left', false);
        togglePanel('right', false);
        if (telemHud) telemHud.style.display = 'none';
        if (camHud) camHud.style.display = 'none';
      } else if (view === 'split') {
        stage?.classList.remove('view-surface', 'view-cross-section');
        stage?.classList.add('view-split');
        if (volOuter) volOuter.style.display = 'block';
        if (conduitOuter) conduitOuter.style.display = 'flex';
        if (btnToggleCutaway) btnToggleCutaway.textContent = '🔬 View Magma Conduit Cutaway Only';
        togglePanel('left', false);
        togglePanel('right', false);
        if (telemHud) telemHud.style.display = 'flex';
        if (camHud) camHud.style.display = 'flex';
      }

      requestAnimationFrame(() => {
        onResize();
        conduitEngine?.render(0);
      });
    }

    // Annotation card close button
    document.getElementById('btn-close-ann')?.addEventListener('click', () => {
      const card = document.getElementById('conduit-annotation-card');
      if (card) card.style.display = 'none';
    });

    // View toggle listeners
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setSimulationView(btn.dataset.view);
      });
    });

    const btnToggleCutaway = document.getElementById('btn-toggle-cutaway');
    if (btnToggleCutaway) {
      btnToggleCutaway.addEventListener('click', () => {
        if (currentView === 'surface') {
          setSimulationView('cross-section');
        } else {
          setSimulationView('surface');
        }
      });
    }

    // Conduit painting tools
    document.querySelectorAll('.c-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.c-tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        conduitEngine?.setTool(btn.dataset.tool);
      });
    });

    document.querySelectorAll('.c-brush-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.c-brush-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        conduitEngine?.setBrushSize(parseFloat(btn.dataset.size));
      });
    });

    document.getElementById('btn-conduit-undo')?.addEventListener('click', () => {
      conduitEngine?.undo();
    });

    document.getElementById('btn-conduit-reset')?.addEventListener('click', () => {
      conduitEngine?.resetCustom();
    });

    // Initialize 3D Conduit Engine
    const conduitCanvas = document.getElementById('conduit-canvas');
    if (conduitCanvas && window.VolcanoConduitEngine) {
      conduitEngine = new window.VolcanoConduitEngine(conduitCanvas, {
        THREE: THREE,
        OrbitControls: OrbitControls,
        mode: state.mode,
        eruptionId: activeEruption,
        onVentChange: (vents) => {
          customVents = vents;
        },
        onDiagnosticsChange: (diag) => {
          updateConduitHUD(diag);
        }
      });
      window.conduitEngine = conduitEngine;
    }

    // 3D Conduit Camera Director Listeners
    document.querySelectorAll('.c-cam-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.c-cam-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        conduitEngine?.setCameraPreset(btn.dataset.ccam);
      });
    });

    document.getElementById('cutaway-true-scale').addEventListener('click', function() {
      conduitEngine.trueScale = !conduitEngine.trueScale;
      this.setAttribute('aria-pressed', String(conduitEngine.trueScale));
      conduitEngine.render(0);
    });

    window.loadEruption = loadEruption;
    loadEruption('vesuvius79');
    document.getElementById('btn-cam-spin')?.classList.add('active');
    window.addEventListener('beforeprint', () => {
      const figure = document.getElementById('vol-print-still');
      renderer.render(scene, camera);
      const image = currentView === 'cross-section' ? conduitCanvas : canvas;
      figure.querySelector('img').src = image.toDataURL('image/png');
      figure.querySelector('figcaption').textContent = document.getElementById('vol-name-badge').textContent + ' — illustrative model; ' + document.getElementById('phase-label').textContent;
      figure.hidden = false;
    });
    window.addEventListener('afterprint', () => { document.getElementById('vol-print-still').hidden = true; });
    SimKit.loop(animate);

  })();
