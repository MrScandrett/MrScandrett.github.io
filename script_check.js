  (function () {
    'use strict';

    /* ══════════════════════════════════════════
       NOISE
    ══════════════════════════════════════════ */
    function hashN(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
    function hash2(x, y) { return hashN(x + y * 57); }
    function sst(t) { return t * t * (3 - 2 * t); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function vn(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      return lerp(lerp(hash2(ix, iy), hash2(ix + 1, iy), sst(fx)),
                  lerp(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), sst(fx)), sst(fy));
    }
    function fbm(x, y, o) {
      let v = 0, a = 0.5, f = 1;
      for (let i = 0; i < o; i++) { v += a * vn(x * f, y * f); a *= 0.5; f *= 2; }
      return v;
    }

    /* ══════════════════════════════════════════
       FAMOUS ERUPTION PRESETS
    ══════════════════════════════════════════ */
    const ERUPTIONS = [
      { id:'vesuvius79',  flag:'🇮🇹', name:'Mt Vesuvius', year:'Aug 24, 79 AD · 1:00 PM', timeOfDay: 13.0, duration: 18, vei:5, vtype:'strato',  intensity:82, column:27, viscosity:70, pyro:80,
        desc:'<strong>Mt Vesuvius — 79 AD · Italy</strong>Pyroclastic surges at 300 °C buried Pompeii and Herculaneum under 4–6 m of ash. 16,000–20,000 killed. Eruption lasted 18 hours, ejecting 3 km³ of material.' },
      { id:'tambora1815', flag:'🇮🇩', name:'Tambora',     year:'Apr 10, 1815 · 7:00 PM', timeOfDay: 19.0, duration: 48, vei:7, vtype:'caldera', intensity:100, column:43, viscosity:80, pyro:95,
        desc:'<strong>Tambora — 1815 · Indonesia</strong>Deadliest eruption in recorded history. 71,000+ killed. Ejected 160 km³ of material. Caused "Year Without Summer" in 1816, triggering crop failures and famine worldwide.' },
      { id:'krakatoa1883',flag:'🇮🇩', name:'Krakatoa',    year:'Aug 27, 1883 · 10:02 AM', timeOfDay: 10.0, duration: 12, vei:6, vtype:'caldera', intensity:95, column:36, viscosity:75, pyro:90,
        desc:'<strong>Krakatoa — 1883 · Indonesia</strong>Explosion heard 4,800 km away — the loudest sound in recorded history. Tsunamis up to 30 m killed 36,000. The island largely collapsed into its magma chamber.' },
      { id:'sthelenr1980',flag:'🇺🇸', name:'Mt St Helens',year:'May 18, 1980 · 8:32 AM', timeOfDay: 8.5, duration: 9, vei:5, vtype:'strato',  intensity:78, column:24, viscosity:65, pyro:72,
        desc:'<strong>Mt St Helens — 1980 · USA</strong>A lateral blast removed the north face in seconds. 57 deaths. Ash column reached 24 km. Lahars and pyroclastic flows devastated 600 km² of forest.' },
      { id:'pinatubo1991', flag:'🇵🇭', name:'Pinatubo',   year:'Jun 15, 1991 · 1:42 PM', timeOfDay: 13.7, duration: 9, vei:6, vtype:'strato',  intensity:92, column:35, viscosity:78, pyro:88,
        desc:'<strong>Pinatubo — 1991 · Philippines</strong>Second-largest 20th-century eruption. Injected 20 Mt of SO₂ into the stratosphere, cooling the Earth by ~0.5 °C for 2 years. 800 deaths.' },
      { id:'eyja2010',     flag:'🇮🇸', name:'Eyjafjallajökull',year:'Apr 14, 2010 · 11:00 AM', timeOfDay: 11.0, duration: 144, vei:4, vtype:'strato',  intensity:48, column:10, viscosity:40, pyro:18,
        desc:'<strong>Eyjafjallajökull — 2010 · Iceland</strong>Subglacial eruption melted the ice cap, sending meltwater floods. Fine ash cloud grounded 100,000 flights across Europe for 6 days.' },
      { id:'maunaloa2022', flag:'🇺🇸', name:'Mauna Loa',  year:'Nov 27, 2022 · 11:30 PM', timeOfDay: 23.5, duration: 300, vei:1, vtype:'shield',  intensity:38, column:4,  viscosity:10, pyro:5,
        desc:'<strong>Mauna Loa — 2022 · Hawaii, USA</strong>Earth\'s largest active volcano erupted for the first time since 1984. Spectacular lava fountains and low-viscosity basaltic flows moved toward populated areas.' },
      { id:'yellowstone',  flag:'🇺🇸', name:'Yellowstone',year:'Hypothetical · Golden Hour', timeOfDay: 17.5, duration: 720, vei:8, vtype:'super', intensity:100, column:45, viscosity:95, pyro:100,
        desc:'<strong>Yellowstone — Hypothetical Supereruption</strong>A full VEI 8 eruption would bury North America in metres of ash and inject enough SO₂ to trigger a decade-long volcanic winter. Last occurred 640,000 years ago.' },
    ];

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

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 500);
    let camDist = 18, camTheta = 0.5, camPhi = 1.1;

    function updateCam() {
      camera.position.set(
        camDist * Math.sin(camPhi) * Math.sin(camTheta),
        camDist * Math.cos(camPhi),
        camDist * Math.sin(camPhi) * Math.cos(camTheta)
      );
      camera.lookAt(0, 2, 0);
    }
    updateCam();

    /* ── Orbit controls ── */
    let isDrag = false, lastMX = 0, lastMY = 0;
    canvas.addEventListener('mousedown', e => { isDrag = true; lastMX = e.clientX; lastMY = e.clientY; });
    window.addEventListener('mouseup',   () => { isDrag = false; });
    canvas.addEventListener('mousemove', e => {
      if (!isDrag) return;
      camTheta -= (e.clientX - lastMX) * 0.009;
      camPhi = clamp(camPhi - (e.clientY - lastMY) * 0.007, 0.22, 1.4);
      lastMX = e.clientX; lastMY = e.clientY; updateCam();
    });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      camDist = clamp(camDist + e.deltaY * 0.04, 5, 50);
      updateCam();
    }, { passive: false });
    let lTD = 0, lTX = 0, lTY = 0;
    canvas.addEventListener('touchstart', e => {
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
        camDist = clamp(camDist - (d - lTD) * 0.04, 5, 50);
        lTD = d; updateCam();
      }
    }, { passive: true });

    /* ── Resize ── */
    function onResize() {
      const W = outer.clientWidth, H = outer.clientHeight;
      renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);
    requestAnimationFrame(onResize);

    /* ══════════════════════════════════════════
       LIGHTING
    ══════════════════════════════════════════ */
    const sunLight = new THREE.DirectionalLight(0xffd090, 1.2);
    sunLight.position.set(8, 14, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -18;
    sunLight.shadow.camera.right = 18;
    sunLight.shadow.camera.top = 18;
    sunLight.shadow.camera.bottom = -18;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0x2a150a, 0.85));
    const fillLight = new THREE.DirectionalLight(0x4060a0, 0.2);
    fillLight.position.set(-6, 2, -5);
    scene.add(fillLight);

    // Lava crater glow — PointLight
    const lavaLight = new THREE.PointLight(0xff5a10, 0, 18, 2);
    lavaLight.position.set(0, 6, 0);
    scene.add(lavaLight);

    // Rim-light for dramatic backlight
    const rimLight = new THREE.DirectionalLight(0xff3010, 0);
    rimLight.position.set(0, -2, -8);
    scene.add(rimLight);

    /* ══════════════════════════════════════════
       SKY
    ══════════════════════════════════════════ */
    const skyGeo = new THREE.SphereGeometry(200, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        ashAmount: { value: 0.0 },
        sunBrightness: { value: 1.0 }
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
        varying vec3 vWorldDirection;
        
        void main() {
          vec3 dir = normalize(vWorldDirection);
          float elevation = clamp(dir.y, 0.0, 1.0);
          
          // Procedural Clear Sky (Day)
          vec3 zenithDay = vec3(0.08, 0.18, 0.45);
          vec3 horizonDay = vec3(0.50, 0.60, 0.72);
          vec3 skyDay = mix(horizonDay, zenithDay, pow(elevation, 0.5));
          
          // Night cycle
          vec3 nightTint = vec3(0.01, 0.02, 0.04);
          vec3 skyTime = mix(nightTint, skyDay, sunBrightness);
          
          // Eruption Ash gradient
          vec3 zenithAsh = vec3(0.02, 0.015, 0.01);
          vec3 horizonAsh = vec3(0.35, 0.14, 0.08); // Glow from lava
          vec3 ashColor = mix(horizonAsh, zenithAsh, pow(elevation, 0.6));
          
          // Blend clear sky into volcanic ash
          vec3 finalColor = mix(skyTime, ashColor, clamp(ashAmount * 1.6, 0.0, 1.0));
          
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
        // Match the clear sky photo horizon
        const f = t / 0.22;
        r = lerp(0.5, 0.45, f); g = lerp(0.6, 0.4, f); b = lerp(0.7, 0.3, f);
      } else if (t < 0.6) {
        // Transition into ash horizon
        const f = (t - 0.22) / 0.38;
        r = lerp(0.45, 0.35, f); g = lerp(0.4, 0.14, f); b = lerp(0.3, 0.08, f);
      } else {
        // Deep ash darkening
        const f = (t - 0.6) / 0.4;
        r = lerp(0.35, 0.15, f); g = lerp(0.14, 0.05, f); b = lerp(0.08, 0.02, f);
      }
      
      scene.fog.color.setRGB(r, g, b);
      scene.fog.density = lerp(0.010, 0.034, t);
    }

    /* ══════════════════════════════════════════
       TERRAIN
    ══════════════════════════════════════════ */
    const TERRAIN_SEGS = 200;
    const TERRAIN_SIZE = 40;

    // Volcano profile functions — height in world units
    function volcanoH(x, z, vtype, stage = 0) {
      const r = Math.sqrt(x * x + z * z);
      const R = TERRAIN_SIZE * 0.38;
      const noise = fbm(x * 0.18, z * 0.18, 6) * 0.9;
      const micro = fbm(x * 0.6 + 99, z * 0.6 + 33, 4) * 0.25;
      const base  = fbm(x * 0.08, z * 0.08, 3) * 0.6;

      let h = 0;
      switch (vtype) {
        case 'shield': {
          const k = Math.max(0, 1 - (r / R) * 1.05);
          h = 4.5 * Math.pow(k, 1.4) + noise * 0.25 + micro * 0.1;
          const craterR = R * 0.05;
          const crater = r < craterR ? -1.1 * Math.pow(1 - r / craterR, 2) : 0;
          const rim = Math.exp(-Math.pow((r - craterR) / (R * 0.03), 2)) * 0.5;
          h += crater + rim;
          break;
        }
        case 'strato': {
          const k = Math.max(0, 1 - r / R);
          h = 10 * Math.pow(k, 2.1) + noise * 0.38 + micro * 0.15;
          const craterR = R * 0.08;
          const crater = r < craterR ? -2.2 * Math.pow(1 - r / craterR, 2.2) : 0;
          const rim = Math.exp(-Math.pow((r - craterR) / (R * 0.035), 2)) * 0.9;
          
          if (activeEruption === 'sthelenr1980' && stage > 0) {
             if (z < 0) {
                const collapse = Math.min(1, Math.max(0, (stage - 0.2) * 2));
                if (collapse > 0) {
                   const blastR = r / R;
                   h -= collapse * 4.5 * Math.max(0, 1 - blastR) * Math.abs(z)/r;
                }
             }
          }
          
          h += crater + rim;
          break;
        }
        case 'caldera': {
          const k = Math.max(0, 1 - r / R);
          const cone = 9 * Math.pow(k, 2.3) + noise * 0.35;
          const cRim = R * 0.16;
          const depression = r < cRim ? -3.8 * Math.pow(1 - r / cRim, 2) : 0;
          const rim = Math.exp(-Math.pow((r - cRim) / (R * 0.05), 2)) * 0.8;
          h = cone + depression + rim + micro * 0.12;
          
          if ((activeEruption === 'tambora1815' || activeEruption === 'krakatoa1883') && stage > 0) {
             const collapseStage = Math.min(1, Math.max(0, (stage - 0.3) * 2));
             if (collapseStage > 0) {
                 const collR = R * 0.55;
                 if (r < collR) {
                    const sink = 10 * Math.pow(1 - r/collR, 2) * collapseStage;
                    h -= sink;
                 }
             }
          }
          break;
        }
        case 'super': {
          const edgeR = R * 0.6;
          const rim = 5.5 * Math.exp(-Math.pow((r - edgeR) / (R * 0.3), 2)) + noise * 0.6;
          const floor = Math.max(0, 0.8 - r / R * 0.5) + micro * 0.15;
          h = Math.max(rim, floor);
          break;
        }
        case 'cinder': {
          const k = Math.max(0, 1 - r / (R * 0.55));
          h = 5 * Math.pow(k, 3) + noise * 0.2 + micro * 0.1;
          break;
        }
      }
      return h + base * Math.max(0, 1 - r / R);
    }

    // Color per vertex
    function terrainColor(x, z, y, maxH, vtype, lavaIntensity) {
      const r = Math.sqrt(x * x + z * z);
      const R = TERRAIN_SIZE * 0.38;
      const hFrac = clamp(y / maxH, 0, 1);

      // Lava channels: radial slots flowing downhill
      const ang = Math.atan2(z, x);
      const channel = Math.abs(Math.sin(ang * 4) * 0.5 + Math.sin(ang * 9) * 0.25);
      const flow = Math.max(0.05, lavaIntensity);
      const isLava = channel < flow * 0.32 && r < R * 0.85 && hFrac > 0.04;
      const heatFrac = isLava ? clamp(1.0 - r / (R * 0.7), 0, 1) * lavaIntensity : 0;

      const craterHot = r < R * 0.07 && lavaIntensity > 0.15;
      if (craterHot) {
        return [1.0, 0.55, 0.12];
      }
      if (isLava && lavaIntensity > 0.1) {
        // Hot lava — white-yellow → orange → dark red
        if (heatFrac > 0.7) return [1.0, 0.95, 0.6];
        if (heatFrac > 0.4) return [1.0, 0.55, 0.1];
        if (heatFrac > 0.1) return [0.7, 0.15, 0.02];
        return [0.25, 0.04, 0.01];
      }

      // Break up perfect horizontal banding with noise
      const nH = hFrac + (fbm(x*0.4, z*0.4, 3) - 0.5) * 0.15;
      const nH2 = clamp(nH, 0, 1);
      
      let rC, gC, bC;
      
      if (vtype === 'shield') {
         // Hawaiian basalt: dark grey/black with slight reddish oxidation and green at sea level
         if (nH2 < 0.1)      { rC=0.25; gC=0.35; bC=0.20; } // tropical base
         else if (nH2 < 0.2) { rC=0.25; gC=0.20; bC=0.18; } // dark brown
         else                { rC=0.15; gC=0.14; bC=0.14; } // black basalt
      } else if (vtype === 'cinder') {
         // Scoria cone: rusty red and black uniform
         rC = lerp(0.35, 0.15, nH2);
         gC = lerp(0.20, 0.10, nH2);
         bC = lerp(0.18, 0.10, nH2);
      } else if (vtype === 'strato') {
         // Stratovolcano: Green base, grey/brown slopes, snowy peak
         if (nH2 < 0.15)      { rC=0.30; gC=0.45; bC=0.25; } // forest
         else if (nH2 < 0.45) { rC=0.45; gC=0.40; bC=0.35; } // dirt/ash
         else if (nH2 < 0.70) { rC=0.55; gC=0.52; bC=0.50; } // grey rock
         else                 { rC=0.90; gC=0.90; bC=0.95; } // snow cap
      } else {
         // Caldera / Super: Desolate ashy/rocky landscape
         if (nH2 < 0.2)       { rC=0.35; gC=0.40; bC=0.30; } // sparse vegetation
         else if (nH2 < 0.6)  { rC=0.50; gC=0.48; bC=0.45; } // ash deposits
         else                 { rC=0.60; gC=0.58; bC=0.55; } // pale tuff/pumice
      }
      
      // Smooth out the sharp if/else boundaries by adding high-frequency noise variance
      const colorNoise = fbm(x*0.9, z*0.9, 2) * 0.15;
      let baseColor = [
         clamp(rC + colorNoise, 0, 1),
         clamp(gC + colorNoise, 0, 1),
         clamp(bC + colorNoise, 0, 1)
      ];
      
      const noise = fbm(x * 0.4, z * 0.4, 4) * 0.1 - 0.05;
      return [
        clamp(baseColor[0] + noise, 0, 1),
        clamp(baseColor[1] + noise, 0, 1),
        clamp(baseColor[2] + noise, 0, 1)
      ];
    }

    // Ocean plane for island volcanoes
    const oceanGeo = new THREE.PlaneGeometry(TERRAIN_SIZE * 3, TERRAIN_SIZE * 3, 1, 1);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0a2a48, roughness: 0.1, metalness: 0.8,
      transparent: true, opacity: 0.88
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.visible = false;
    scene.add(ocean);

    // Detail texture for PBR material
    const texLoader = new THREE.TextureLoader();
    const rockTex = texLoader.load('../../assets/images/lessons/rock-cycle/gneiss.webp');
    rockTex.wrapS = rockTex.wrapT = THREE.RepeatWrapping;
    rockTex.repeat.set(12, 12);
    rockTex.encoding = THREE.sRGBEncoding;

    // High-frequency gritty noise for bump mapping
    function createGritTexture() {
      const size = 512;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(size, size);
      for (let i = 0; i < img.data.length; i += 4) {
        const val = Math.random() * 255;
        img.data[i] = img.data[i+1] = img.data[i+2] = val;
        img.data[i+3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(24, 24);
      return tex;
    }
    const gritTex = createGritTexture();

    let terrainMesh = null;
    let currentMaxH = 10;
    let craterPos = new THREE.Vector3(0, 10, 0);

    function buildTerrain(vtype, lavaIntensity) {
      if (terrainMesh) { scene.remove(terrainMesh); terrainMesh.geometry.dispose(); }

      const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
      geo.rotateX(-Math.PI / 2);

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        map: rockTex,
        bumpMap: gritTex,
        bumpScale: 0.08,
        roughnessMap: gritTex,
        roughness: 0.9,
        metalness: 0.02
      });
      terrainMesh = new THREE.Mesh(geo, mat);
      terrainMesh.receiveShadow = true;
      terrainMesh.castShadow = true;
      scene.add(terrainMesh);
      
      updateTerrain(vtype, lavaIntensity, state.timeline);

      ocean.visible = (vtype === 'shield' || activeEruption === 'krakatoa1883');
      ocean.position.y = -0.2;
      
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

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        let [r, g, b] = terrainColor(x, z, y, maxH, vtype, lavaIntensity);
        
        // Post-eruption ash blanket
        if (stage > 0.4) {
           const ashF = Math.min(1, (stage - 0.4) * 2);
           r = lerp(r, 0.4, ashF * 0.8);
           g = lerp(g, 0.38, ashF * 0.8);
           b = lerp(b, 0.35, ashF * 0.8);
        }
        
        colors.setXYZ(i, r, g, b);
      }
      
      geo.setAttribute('color', colors);
      pos.needsUpdate = true;
      colors.needsUpdate = true;
      geo.computeVertexNormals();

      craterPos.set(0, maxH, 0);
      lavaLight.position.copy(craterPos).addScaledVector(new THREE.Vector3(0, 1, 0), 1.5);
    }

    function terrainHeightAt(x, z) {
      return volcanoH(x, z, state.vtype, state.timeline);
    }

    function slopeDir(x, z) {
      const eps = 0.25;
      const hL = terrainHeightAt(x - eps, z);
      const hR = terrainHeightAt(x + eps, z);
      const hD = terrainHeightAt(x, z - eps);
      const hU = terrainHeightAt(x, z + eps);
      const sx = hL - hR;
      const sz = hD - hU;
      const l = Math.hypot(sx, sz) || 1;
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
          
          // Trees
          if (h < currentMaxH * 0.6 && r > TERRAIN_SIZE * 0.1) {
             if (tCount < MAX_TREES && Math.random() > 0.4) {
                const scale = 0.5 + Math.random() * 0.6;
                const rot = Math.random() * Math.PI;
                dummy.position.set(x, h, z);
                dummy.scale.setScalar(scale);
                dummy.rotation.set(0, rot, 0);
                dummy.updateMatrix();
                treeTrunkMesh.setMatrixAt(tCount, dummy.matrix);
                treeCanopyMesh.setMatrixAt(tCount, dummy.matrix);
                envData.push({ type: 'tree', id: tCount, x, y: h, z, s: scale, r: rot });
                tCount++;
             }
          }
          
          // Houses (Vesuvius Pompeii logic)
          if (activeEruption === 'vesuvius79' && r > TERRAIN_SIZE * 0.25 && h < currentMaxH * 0.28) {
             if (hCount < MAX_HOUSES && Math.random() > 0.85) {
                const scale = 0.7 + Math.random() * 0.4;
                const rot = Math.random() * Math.PI;
                dummy.position.set(x, h, z);
                dummy.scale.setScalar(scale);
                dummy.rotation.set(0, rot, 0);
                dummy.updateMatrix();
                houseBodyMesh.setMatrixAt(hCount, dummy.matrix);
                houseRoofMesh.setMatrixAt(hCount, dummy.matrix);
                envData.push({ type: 'house', id: hCount, x, y: h, z, s: scale, r: rot });
                hCount++;
             }
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
          
          // Devastation logic based on timeline stage
          if (stage > 0.3) {
             const destroyFrac = Math.min(1, (stage - 0.3) * 2.5);
             if (activeEruption === 'sthelenr1980' && env.z < 0) {
                 // Blast zone flattens trees
                 rotX = destroyFrac * Math.PI / 2.2;
             } else {
                 // General ash burial and burning
                 scale = env.s * Math.max(0.1, 1 - destroyFrac * 0.8);
             }
          }
          
          dummy.position.set(env.x, h, env.z);
          dummy.rotation.set(rotX, env.r, 0);
          dummy.scale.setScalar(scale);
          dummy.updateMatrix();
          
          if (env.type === 'tree') {
             treeTrunkMesh.setMatrixAt(env.id, dummy.matrix);
             treeCanopyMesh.setMatrixAt(env.id, dummy.matrix);
             tDirty = true;
          } else {
             // Bury houses
             if (stage > 0.4) {
                 dummy.position.y -= Math.min(0.5, (stage - 0.4) * 2);
                 dummy.updateMatrix();
             }
             houseBodyMesh.setMatrixAt(env.id, dummy.matrix);
             houseRoofMesh.setMatrixAt(env.id, dummy.matrix);
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

    const smokeTex = makeSpriteTexture('rgba(255,255,255,0.85)', 'rgba(255,255,255,0)', true);
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
        for (let i = 0; i < this.max; i++) if (!this.alive[i]) return i;
        return -1;
      }

      emit(px, py, pz, vx, vy, vz, life, r, g, b, size) {
        const i = this.findDead(); if (i < 0) return;
        this.alive[i] = 1; this.age[i] = 0; this.life[i] = life;
        this.pos[i*3]=px; this.pos[i*3+1]=py; this.pos[i*3+2]=pz;
        this.vel[i*3]=vx; this.vel[i*3+1]=vy; this.vel[i*3+2]=vz;
        this.col[i*3]=r;  this.col[i*3+1]=g;  this.col[i*3+2]=b;
        this.sz[i] = size;
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

    // ── ASH COLUMN ──
    const ashPool = new ParticlePool(scene, 3200, new THREE.PointsMaterial({
      size: 0.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      sizeAttenuation: true,
      map: smokeTex,
      alphaTest: 0.05
    }));

    // ── LAVA BOMBS ──
    const bombPool = new ParticlePool(scene, 400, new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      map: emberTex,
      alphaTest: 0.05
    }));

    // ── PYROCLASTIC FLOW ──
    const pyroPool = new ParticlePool(scene, 800, new THREE.PointsMaterial({
      size: 0.75,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      sizeAttenuation: true,
      map: smokeTex,
      alphaTest: 0.04
    }));

    // ── STEAM / GAS ──
    const steamPool = new ParticlePool(scene, 800, new THREE.PointsMaterial({
      size: 0.7,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      sizeAttenuation: true,
      map: smokeTex,
      alphaTest: 0.04
    }));

    function spawnAsh(intensity, column) {
      const n = Math.round(65 * intensity);
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const columnBoost = column / 12;
        // Thrust velocity (higher for larger columns)
        const sp  = (4.0 + columnBoost * 4.0) * (0.7 + Math.random() * 0.6);
        const spread = 0.2 + intensity * 0.4;
        ashPool.emit(
          (Math.random() - 0.5) * 0.8,
          craterPos.y,
          (Math.random() - 0.5) * 0.8,
          Math.cos(ang) * spread, sp, Math.sin(ang) * spread,
          column * 0.15 + 3.0,
          0.18 + Math.random() * 0.1, 0.16, 0.14 + Math.random() * 0.08,
          0.4 + Math.random() * 0.45
        );
      }
    }

    function spawnBomb(intensity) {
      if (Math.random() > intensity * 0.7 + 0.05) return;
      const ang = Math.random() * Math.PI * 2;
      const spd = 6 + intensity * 6 + Math.random() * 4;
      const elev = 0.6 + Math.random() * 0.6; // Steeper angle for bombs
      bombPool.emit(
        0, craterPos.y, 0,
        Math.cos(ang) * spd * Math.cos(elev),
        spd * Math.sin(elev),
        Math.sin(ang) * spd * Math.cos(elev),
        1.8 + Math.random() * 1.5,
        1.0, 0.7 + Math.random() * 0.3, 0.1,
        0.4 + Math.random() * 0.3
      );
    }

    function spawnPyroclastic(pyro, intensity) {
      if (pyro < 0.12 || Math.random() > pyro * 0.8) return;
      const ang = Math.random() * Math.PI * 2;
      // High initial velocity for column collapse
      const spd = 2 + pyro * 5 + intensity * 3;
      // Start slightly above crater, mimicking column collapse
      const collapseHeight = craterPos.y + Math.random() * 3.0;
      pyroPool.emit(
        (Math.random() - 0.5), collapseHeight, (Math.random() - 0.5),
        Math.cos(ang) * spd, -1.5 - Math.random() * 2.0, Math.sin(ang) * spd,
        4.0 + Math.random() * 3.0,
        0.28 + pyro * 0.25, 0.15, 0.08,
        0.65 + Math.random() * 0.45
      );
    }

    function spawnSteam(intensity) {
      if (Math.random() > intensity * 0.45 + 0.12) return;
      const ang = Math.random() * Math.PI * 2;
      steamPool.emit(
        (Math.random() - 0.5) * 1.5, craterPos.y - 0.5, (Math.random() - 0.5) * 1.5,
        Math.cos(ang) * 0.4, 2.0 + Math.random() * 1.5, Math.sin(ang) * 0.4,
        4.5 + Math.random() * 2.5,
        0.85, 0.88, 0.9,
        0.65 + Math.random() * 0.35
      );
    }

    /* ══════════════════════════════════════════
       STATE
    ══════════════════════════════════════════ */
    const state = { intensity:72, column:18, viscosity:50, pyro:40, vtype:'strato', timeline:0.0 };
    let rebuildTimer = 0;
    let activeEruption = 'vesuvius79';
    let simTime = 0;
    const wind = { x: 0, z: 0 };
    let lavaBase = 0;

    function computeStats() {
      const i = state.intensity / 100;
      const vei = clamp(Math.round(i * 6 + state.column / 15), 0, 8);
      const ejecta = Math.pow(10, vei - 4) * 0.1;
      const temp = 700 + i * 450 + (100 - state.viscosity) * 1.5;
      const so2 = ejecta * (0.5 + state.viscosity / 100 * 1.5);
      const ashR = state.column * 18 * i;
      return { vei, ejecta, temp, so2, ashR };
    }

    function updateReadouts() {
      const s = computeStats();
      const i = state.intensity;
      const lvl = i < 25 ? 'low' : i < 55 ? 'medium' : i < 80 ? 'high' : 'extreme';
      document.getElementById('out-ejecta').textContent = s.ejecta < 0.01 ? '<0.01 km³' : s.ejecta.toFixed(2) + ' km³';
      document.getElementById('out-ejecta').className = 'stat-val ' + lvl;
      document.getElementById('out-temp').textContent = Math.round(s.temp).toLocaleString() + ' °C';
      document.getElementById('out-col').textContent = state.column + ' km';
      document.getElementById('out-col').className = 'stat-val ' + lvl;
      document.getElementById('out-so2').textContent = s.so2.toFixed(1) + ' Mt';
      document.getElementById('out-ash').textContent = Math.round(s.ashR) + ' km';
      const veiEl = document.getElementById('out-vei');
      veiEl.textContent = s.vei;
      veiEl.className = 'stat-val ' + (s.vei < 3 ? 'low' : s.vei < 5 ? 'medium' : s.vei < 7 ? 'high' : 'extreme');
      // VEI bar
      document.querySelectorAll('.vei-seg').forEach((seg, idx) => {
        seg.classList.toggle('active', idx <= s.vei);
      });
      document.getElementById('vei-badge').textContent = 'VEI ' + s.vei + ' · ' + vtypeName(state.vtype);
    }

    function vtypeName(t) {
      return { shield:'Shield Volcano', strato:'Stratovolcano', caldera:'Caldera', super:'Supervolcano', cinder:'Cinder Cone' }[t] || t;
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
      const card = document.createElement('div');
      card.className = 'ev-card' + (ev.id === activeEruption ? ' active' : '');
      card.dataset.id = ev.id;
      card.innerHTML = `<div class="ev-flag">${ev.flag}</div><div class="ev-name">${ev.name}</div><div class="ev-year">${ev.year}</div><span class="ev-vei">VEI ${ev.vei}</span>`;
      card.addEventListener('click', () => loadEruption(ev.id));
      scroll.appendChild(card);
    });

    function loadEruption(id) {
      const ev = ERUPTIONS.find(e => e.id === id);
      if (!ev) return;
      activeEruption = id;

      // Update active card
      document.querySelectorAll('.ev-card').forEach(c => c.classList.toggle('active', c.dataset.id === id));

      // Set sliders
      state.timeline  = 0.0;
      state.intensity = 0; // Starts at 0 for pre-eruption
      state.column    = ev.column;
      state.viscosity = ev.viscosity; 
      state.pyro      = ev.pyro;
      state.vtype     = ev.vtype;
      
      const tlSlider = document.getElementById('s-timeline');
      if (tlSlider) tlSlider.value = 0;

      document.getElementById('s-intensity').value = ev.intensity;
      document.getElementById('s-column').value    = ev.column;
      document.getElementById('s-viscosity').value = ev.viscosity;
      document.getElementById('s-pyro').value      = ev.pyro;
      document.getElementById('v-intensity').textContent = '0%';
      document.getElementById('v-column').textContent    = ev.column + ' km';
      document.getElementById('v-viscosity').textContent = viscosityLabel(ev.viscosity);
      document.getElementById('v-pyro').textContent      = ev.pyro + '%';

      // Type tabs
      document.querySelectorAll('.type-tab').forEach(t => t.classList.toggle('active', t.dataset.vtype === ev.vtype));

      // Badges and description
      document.getElementById('vol-name-badge').textContent = ev.flag + ' ' + ev.name + ' — ' + ev.year;
      document.getElementById('event-desc').innerHTML = ev.desc;

      rebuildTerrain();
      updateReadouts();
      updateSky(state.intensity);
      updateLighting(state.intensity / 100);
      updateEnvironments(state.timeline);
    }

    function viscosityLabel(v) {
      if (v < 25) return 'Basalt (fluid)';
      if (v < 50) return 'Andesite';
      if (v < 75) return 'Dacite';
      return 'Rhyolite (thick)';
    }

    function rebuildTerrain() {
      const lavaI = (1 - state.viscosity / 100) * (state.intensity / 100);
      buildTerrain(state.vtype, lavaI);
    }

    // Slider listeners
    function bindSlider(id, key, fmtFn) {
      const el = document.getElementById('s-' + id);
      if (!el) return;
      el.addEventListener('input', function () {
        state[key] = parseFloat(this.value);
        const vel = document.getElementById('v-' + id);
        if (vel) vel.textContent = fmtFn(state[key]);
        if (key === 'viscosity' || key === 'intensity') { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(() => updateTerrain(state.vtype, state.intensity, state.timeline), 50); }
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
       state.timeline = parseFloat(this.value);
       
       // Timeline drives intensity during historical playback
       const ev = ERUPTIONS.find(e => e.id === activeEruption);
       if (ev) {
          // Pre-eruption (0 - 0.2): Intensity builds 0 -> max
          // Eruption (0.2 - 0.6): Intensity max
          // Post-eruption (0.6 - 1.0): Intensity max -> 0
          let simI = 0;
          if (state.timeline > 0 && state.timeline <= 0.2) simI = ev.intensity * (state.timeline / 0.2);
          else if (state.timeline > 0.2 && state.timeline <= 0.6) simI = ev.intensity;
          else if (state.timeline > 0.6) simI = ev.intensity * (1 - (state.timeline - 0.6)/0.4);
          
          state.intensity = simI;
          updateSky(state.intensity);
       }
       
       updateTerrain(state.vtype, state.intensity, state.timeline);
       updateEnvironments(state.timeline);
       updateLighting(state.intensity / 100);
    });

    // Type tab clicks
    document.getElementById('type-tabs').addEventListener('click', e => {
      const btn = e.target.closest('.type-tab');
      if (!btn) return;
      document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      state.vtype = btn.dataset.vtype;
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
      
      sunLight.intensity = lerp(1.1, 0.35, t * 0.7) * sunBrightness;
      fillLight.intensity = lerp(0.2, 0.05, t) + (1.0 - sunBrightness) * 0.4; // More ambient moonlight at night
      
      if (skyMat.uniforms.sunBrightness) {
         skyMat.uniforms.sunBrightness.value = sunBrightness;
      }
      
      // Update fog to darken at night
      if (t < 0.22) {
         const currentFog = scene.fog.color.getHexString();
         // Just darken the fog directly when it's clear sky
         scene.fog.color.lerp(new THREE.Color(0x02040a), 1.0 - sunBrightness);
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
      
      // Convective thrust & thermal buoyancy
      // Rises strongly initially, then buoyancy decreases as it cools and entrains air
      let buoyancy = t < 0.6 ? 8.0 * (0.6 - t) : -0.2;
      pool.vel[i*3+1] += buoyancy * dt;
      
      // Turbulence using fbm noise
      const turbScale = 0.3;
      const nx = fbm(py * turbScale - simTime, pz * turbScale, 2) - 0.5;
      const ny = fbm(pz * turbScale - simTime, px * turbScale, 2) - 0.5;
      const nz = fbm(px * turbScale - simTime, py * turbScale, 2) - 0.5;
      pool.vel[i*3]   += nx * 6.0 * dt;
      pool.vel[i*3+1] += ny * 3.0 * dt;
      pool.vel[i*3+2] += nz * 6.0 * dt;

      // Umbrella spreading region
      if (t > 0.5) {
        const spreadFactor = (t - 0.5) * 4.0 * dt;
        const dist = Math.hypot(px, pz) + 0.001;
        pool.vel[i*3]   += (px / dist) * spreadFactor;
        pool.vel[i*3+2] += (pz / dist) * spreadFactor;
      }

      // Air resistance
      const drag = 1.0 - 0.6 * dt;
      pool.vel[i*3]   *= drag;
      pool.vel[i*3+1] *= drag;
      pool.vel[i*3+2] *= drag;

      pool.vel[i*3]   += wind.x * 2.0 * dt;
      pool.vel[i*3+2] += wind.z * 2.0 * dt;
      
      pool.pos[i*3]   += pool.vel[i*3] * dt;
      pool.pos[i*3+1] += pool.vel[i*3+1] * dt;
      pool.pos[i*3+2] += pool.vel[i*3+2] * dt;
      
      pool.col[i*3] = lerp(0.18, 0.48, t);
      pool.col[i*3+1] = lerp(0.16, 0.44, t);
      pool.col[i*3+2] = lerp(0.15, 0.42, t);
      // Volume expansion due to pressure drop at altitude
      pool.sz[i] = 0.4 + t * 4.5;
    }

    function tickBomb(i, t, pool, dt) {
      pool.vel[i*3+1] -= GRAVITY * dt;
      // Air drag on heavy projectiles
      pool.vel[i*3]   *= (1.0 - 0.2 * dt);
      pool.vel[i*3+2] *= (1.0 - 0.2 * dt);
      
      pool.pos[i*3]   += pool.vel[i*3] * dt;
      pool.pos[i*3+1] += pool.vel[i*3+1] * dt;
      pool.pos[i*3+2] += pool.vel[i*3+2] * dt;
      
      const gx = pool.pos[i*3];
      const gz = pool.pos[i*3+2];
      const ground = terrainHeightAt(gx, gz);
      if (pool.pos[i*3+1] < ground) {
        // Impact cratering or bouncing
        pool.pos[i*3+1] = ground;
        pool.vel[i*3+1] = Math.abs(pool.vel[i*3+1]) * 0.3;
        const slope = slopeDir(gx, gz);
        pool.vel[i*3]   += slope.x * GRAVITY * 0.5 * dt;
        pool.vel[i*3+2] += slope.z * GRAVITY * 0.5 * dt;
      }

      const heat = Math.max(0, 1 - t * 1.5); // cools rapidly
      pool.col[i*3]   = 1.0;
      pool.col[i*3+1] = lerp(0.9, 0.2, t) * heat;
      pool.col[i*3+2] = heat * heat * 0.18;
      pool.sz[i] = lerp(0.45, 0.15, t);
    }

    function tickPyro(i, t, pool, dt) {
      // Density current dynamics (heavier than surrounding air, hugs ground)
      pool.vel[i*3+1] -= GRAVITY * 0.8 * dt; 
      
      // Internal turbulence keeping particles suspended
      pool.vel[i*3]   += (Math.random() - 0.5) * 4.0 * dt;
      pool.vel[i*3+2] += (Math.random() - 0.5) * 4.0 * dt;
      
      // Ground interaction and slope acceleration
      const gx = pool.pos[i*3];
      const gz = pool.pos[i*3+2];
      const ground = terrainHeightAt(gx, gz) + 0.1;
      
      if (pool.pos[i*3+1] < ground) {
        pool.pos[i*3+1] = ground;
        // Loses vertical momentum to friction/suspension
        pool.vel[i*3+1] = Math.abs(pool.vel[i*3+1]) * 0.2; 
        
        const slope = slopeDir(gx, gz);
        // Accelerates strongly down slopes due to high density
        pool.vel[i*3]   += slope.x * GRAVITY * 2.5 * dt;
        pool.vel[i*3+2] += slope.z * GRAVITY * 2.5 * dt;
      }

      // Drag against ground and air
      pool.vel[i*3]   *= (1.0 - 0.4 * dt);
      pool.vel[i*3+2] *= (1.0 - 0.4 * dt);

      pool.pos[i*3]   += pool.vel[i*3] * dt;
      pool.pos[i*3+1] += pool.vel[i*3+1] * dt;
      pool.pos[i*3+2] += pool.vel[i*3+2] * dt;

      pool.col[i*3]   = lerp(0.7, 0.15, t);
      pool.col[i*3+1] = lerp(0.25, 0.05, t);
      pool.col[i*3+2] = lerp(0.06, 0.03, t);
      
      // Expands as it entrains air
      pool.sz[i] = 0.6 + t * 2.0; 
    }

    function tickSteam(i, t, pool, dt) {
      // Strong thermal buoyancy for pure steam/gas
      pool.vel[i*3+1] += 12.0 * dt; 
      
      pool.vel[i*3]   += (Math.random() - 0.5) * 1.5 * dt;
      pool.vel[i*3+2] += (Math.random() - 0.5) * 1.5 * dt;
      
      pool.vel[i*3]   += wind.x * 3.0 * dt;
      pool.vel[i*3+2] += wind.z * 3.0 * dt;
      
      pool.pos[i*3]   += pool.vel[i*3] * dt;
      pool.pos[i*3+1] += pool.vel[i*3+1] * dt;
      pool.pos[i*3+2] += pool.vel[i*3+2] * dt;
      
      // Rapid expansion
      pool.sz[i] = 0.5 + t * 3.5;
      
      const fade = Math.min(1, t * 3) * Math.max(0, 1 - t * 1.4);
      const c = 0.9 * fade + 0.65 * (1 - fade);
      pool.col[i*3] = pool.col[i*3+1] = pool.col[i*3+2] = c;
    }

    /* ══════════════════════════════════════════
       ANIMATION LOOP
    ══════════════════════════════════════════ */
    let lastTs = 0, spawnAcc = 0;

    function animate(ts) {
      requestAnimationFrame(animate);
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      if (!isDrag) { camTheta += dt * 0.04; updateCam(); }

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
          spawnAsh(i, state.column);
          spawnBomb(i);
          spawnSteam(i);
          if (pi > 0.1) spawnPyroclastic(pi, i);
        }
      }

      ashPool.update(dt,  tickAsh);
      bombPool.update(dt, tickBomb);
      pyroPool.update(dt, tickPyro);
      steamPool.update(dt, tickSteam);

      // Organic multi-frequency lava pulse
      const pulse = 0.76 + Math.sin(ts * 0.0031) * 0.13 + Math.sin(ts * 0.0079 + 1.4) * 0.07 + Math.sin(ts * 0.0017 + 2.9) * 0.04;
      lavaLight.intensity = lavaBase * pulse;

      renderer.render(scene, camera);
    }

    /* ══════════════════════════════════════════
       INIT
    ══════════════════════════════════════════ */
    loadEruption('vesuvius79');
    requestAnimationFrame(animate);

  })();
