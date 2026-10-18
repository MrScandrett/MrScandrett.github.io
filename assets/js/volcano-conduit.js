/* volcano-conduit.js — Advanced 3D Subsurface Magma Conduit & Volcanic Block Cutaway Engine
   Scientifically grounded 3D geological cutaways for historical presets and
   interactive "paint-your-own" subsurface plumbing in exploration mode.
   Quantitative volcanological rendering: Transcrustal Magmatic Systems (TCMS, Cashman et al. 2017),
   Poiseuille conduit fluid dynamics, decompression volatile exsolution (Henry's Law),
   Dingwell brittle fragmentation criterion (1996), live crustal geomechanics (Griffith failure),
   and peer-reviewed historical volcanic architecture. */

(function () {
  'use strict';

  // Physical constants for crustal geomechanics
  const RHO_CRUST = 2700; // kg/m^3 (average upper crustal density)
  const GRAVITY = 9.81;   // m/s^2

  // Magma densities by composition (kg/m^3)
  const MAGMA_DENSITIES = {
    vesuvius79: 2380,   // Phonolite to tephriphonolite
    tambora1815: 2500,  // Trachyandesite
    krakatoa1883: 2420, // Dacite
    sthelenr1980: 2400, // Dacite
    pinatubo1991: 2420, // Dacite (deep recharge basalt 2700)
    eyja2010: 2550,     // Benmoreite-basalt
    maunaloa2022: 2650, // Tholeiitic basalt
    yellowstone: 2300,  // Rhyolite partial melt
    default: 2450
  };

  // Historical conduit profiles for the 8 presets
  const HISTORICAL_CONDUITS = Object.fromEntries(
    Object.entries(window.VolcanoHistory || {}).map(([id, record]) => [id, record.conduit])
  );

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /**
   * VolcanoConduitEngine (Full 3D Subterranean Cutaway)
   */
  class VolcanoConduitEngine {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.options = options;
      this.THREE = options.THREE || window.THREE;
      this.OrbitControls = options.OrbitControls || window.OrbitControls;
      this.surface = { resize: () => this.onResize() };

      this.mode = options.mode || 'historical';
      this.eruptionId = options.eruptionId || 'vesuvius79';
      this.timeline = 0;
      this.intensity = 0;
      this.trueScale = false;
      this.clock = 0;
      this.onVentChange = options.onVentChange || null;
      this.onDiagnosticsChange = options.onDiagnosticsChange || null;

      // Painting state in exploration mode
      this.activeTool = 'chamber';
      this.brushSizeKm = 0.6;
      this.isPainting = false;
      this.keyboardPos = { x: 0, depth: 5 };

      this.customChambers = [];
      this.customConduits = [];
      this.customAquifers = [];
      this.undoStack = [];

      this.seismicEvents = [];
      this.nextSeismicTime = 0;

      // Smooth camera transition state
      this.isCameraLerping = false;
      this.cameraLerpTargetPos = null;
      this.cameraLerpTargetLook = null;

      // Active annotation tooltip state
      this.activeAnnotation = null;

      // Initialize 3D WebGL Renderer & Scene
      this.init3D();
      this.initEvents();
      this.loadBaseline(this.eruptionId);
    }

    init3D() {
      const THREE = this.THREE;
      if (!THREE) {
        console.error('Three.js is required for VolcanoConduitEngine 3D');
        return;
      }

      const canvas = this.canvas;
      const width = canvas.clientWidth || 800;
      const height = canvas.clientHeight || 600;

      this.renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(width, height, false);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (THREE.sRGBEncoding) this.renderer.outputEncoding = THREE.sRGBEncoding;

      this.scene = new THREE.Scene();

      // Camera: 34° FOV for balanced isometric geological block framing
      this.camera = new THREE.PerspectiveCamera(34, width / height, 0.4, 600);
      this.defaultCamPos = new THREE.Vector3(21, 5.5, 23);
      this.defaultCamTarget = new THREE.Vector3(0, -4.8, 0);
      this.camera.position.copy(this.defaultCamPos);

      // OrbitControls
      if (this.OrbitControls) {
        this.controls = new this.OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.target.copy(this.defaultCamTarget);
        this.controls.maxPolarAngle = Math.PI * 0.88;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 160;
      }

      // Lighting configuration for dramatic geological cutaway
      this.ambientLight = new THREE.AmbientLight(0x444d5c, 1.7);
      this.scene.add(this.ambientLight);

      this.dirLight = new THREE.DirectionalLight(0xfff6ec, 2.5);
      this.dirLight.position.set(-22, 30, 24);
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.scene.add(this.dirLight);

      // Secondary fill light for subterranean strata face
      this.fillLight = new THREE.DirectionalLight(0x90a0b8, 1.2);
      this.fillLight.position.set(22, -8, 18);
      this.scene.add(this.fillLight);

      // Front fill light specifically aimed at subterranean cut face (Z = 0)
      this.frontLight = new THREE.DirectionalLight(0xfff6ec, 1.8);
      this.frontLight.position.set(-6, -6, 28);
      this.scene.add(this.frontLight);

      // PointLight inside Magma Chamber
      this.chamberLight = new THREE.PointLight(0xff6818, 5.2, 38);
      this.chamberLight.position.set(0, -7.5, 0);
      this.scene.add(this.chamberLight);

      // PointLight at Crater Vent
      this.ventLight = new THREE.PointLight(0xffaa40, 3.5, 20);
      this.ventLight.position.set(0, 2, 0);
      this.scene.add(this.ventLight);

      // 3D Object Groups
      this.crustGroup = new THREE.Group();
      this.waterGroup = new THREE.Group();
      this.edificeGroup = new THREE.Group();
      this.chamberGroup = new THREE.Group();
      this.conduitGroup = new THREE.Group();
      this.particleGroup = new THREE.Group();
      this.aquiferGroup = new THREE.Group();
      this.seismicGroup = new THREE.Group();
      this.scaleGroup = new THREE.Group();
      this.annotationGroup = new THREE.Group();

      this.scene.add(this.crustGroup);
      this.scene.add(this.waterGroup);
      this.scene.add(this.edificeGroup);
      this.scene.add(this.chamberGroup);
      this.scene.add(this.conduitGroup);
      this.scene.add(this.particleGroup);
      this.scene.add(this.aquiferGroup);
      this.scene.add(this.seismicGroup);
      this.scene.add(this.scaleGroup);
      this.scene.add(this.annotationGroup);

      // Raycaster for 3D interactions
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();
      this.cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Z = 0 cross-section face
    }

    loadBaseline(id) {
      this.eruptionId = id;
      const base = HISTORICAL_CONDUITS[id] || HISTORICAL_CONDUITS.vesuvius79;
      this.profile = JSON.parse(JSON.stringify(base));

      if (this.mode === 'exploration') {
        this.customChambers = structuredClone(this.profile.reservoirs || []);
        this.customConduits = structuredClone([
          ...(this.profile.dikes || []),
          ...(this.profile.sills || []).map(s => ({ x1: s.x - s.rxKm, y1: s.depthKm, x2: s.x + s.rxKm, y2: s.depthKm, widthM: 50, sill: true }))
        ]);
        this.customAquifers = JSON.parse(JSON.stringify(this.profile.aquifers || []));
        this.undoStack = [];
      }

      this.seismicEvents = [];
      this.rebuild3DScene();
      this.setCameraPreset(this.currentCameraPreset || 'iso');
      this.updateDescription();
      this.recalculateDiagnostics();
    }

    setMode(mode) {
      if (this.mode === mode) return;
      this.mode = mode;
      if (mode === 'exploration') {
        this.customChambers = structuredClone(this.profile.reservoirs || []);
        this.customConduits = structuredClone([
          ...(this.profile.dikes || []),
          ...(this.profile.sills || []).map(s => ({ x1: s.x - s.rxKm, y1: s.depthKm, x2: s.x + s.rxKm, y2: s.depthKm, widthM: 50, sill: true }))
        ]);
        this.customAquifers = JSON.parse(JSON.stringify(this.profile.aquifers || []));
      }
      this.rebuild3DScene();
      this.recalculateDiagnostics();
    }

    setTimeline(tl, intensity = null) {
      this.timeline = Math.max(0, Math.min(1, tl));
      if (intensity !== null) this.intensity = intensity;
      this.updateDynamicMeshes();
      this.recalculateDiagnostics();
    }

    setTool(tool) { this.activeTool = tool; }
    setBrushSize(sizeKm) { this.brushSizeKm = sizeKm; }

    undo() {
      if (this.undoStack.length === 0) return;
      const state = this.undoStack.pop();
      this.customChambers = state.chambers;
      this.customConduits = state.conduits;
      this.customAquifers = state.aquifers;
      this.rebuild3DScene();
      this.recalculateDiagnostics();
    }

    pushUndo() {
      this.undoStack.push({
        chambers: JSON.parse(JSON.stringify(this.customChambers)),
        conduits: JSON.parse(JSON.stringify(this.customConduits)),
        aquifers: JSON.parse(JSON.stringify(this.customAquifers))
      });
      if (this.undoStack.length > 20) this.undoStack.shift();
    }

    resetCustom() {
      this.pushUndo();
      const base = HISTORICAL_CONDUITS[this.eruptionId] || HISTORICAL_CONDUITS.vesuvius79;
      this.customChambers = structuredClone(base.reservoirs || []);
      this.customConduits = structuredClone([
        ...(base.dikes || []),
        ...(base.sills || []).map(s => ({ x1: s.x - s.rxKm, y1: s.depthKm, x2: s.x + s.rxKm, y2: s.depthKm, widthM: 50, sill: true }))
      ]);
      this.customAquifers = JSON.parse(JSON.stringify(base.aquifers || []));
      this.rebuild3DScene();
      this.recalculateDiagnostics();
    }

    stage() {
      const rows = this.profile.stages || [];
      if (!rows.length) return { at: 0, key: 'Baseline', label: 'Baseline', activity: 0, withdrawal: 0, collapse: 0 };
      const i = Math.max(0, rows.findLastIndex(s => this.timeline >= s.at));
      const a = rows[i], b = rows[Math.min(i + 1, rows.length - 1)];
      const t = a === b ? 0 : (this.timeline - a.at) / (b.at - a.at);
      return {
        ...a,
        collapse: a.collapse + (b.collapse - a.collapse) * t,
        withdrawal: a.withdrawal + (b.withdrawal - a.withdrawal) * t
      };
    }

    reservoirs() {
      return this.mode === 'exploration' ? this.customChambers : (this.profile.reservoirs || []);
    }

    sheets() {
      if (this.mode === 'exploration') return this.customConduits;
      return [
        ...(this.profile.dikes || []),
        ...(this.profile.sills || []).map(s => ({ x1: s.x - s.rxKm, y1: s.depthKm, x2: s.x + s.rxKm, y2: s.depthKm, widthM: 50, sill: true, rxKm: s.rxKm, ryKm: s.ryKm, depthKm: s.depthKm }))
      ];
    }

    active() {
      return this.intensity > 0 && this.timeline > 0 && this.timeline < 1 &&
        (this.mode === 'exploration' || this.stage().activity > 0) &&
        this.eruptionId !== 'yellowstone';
    }

    setCameraPreset(preset) {
      if (!this.camera || !this.controls) return;
      this.currentCameraPreset = preset;
      const THREE = this.THREE;
      let targetPos, targetLook;
      const widthKm = this.profile.widthKm || 16;
      const depthKm = this.profile.maxDepthKm || 12;

      if (preset === 'iso') {
        targetPos = new THREE.Vector3(widthKm * 1.22, depthKm * 0.52, depthKm * 1.82);
        targetLook = new THREE.Vector3(-widthKm * 0.12, -depthKm * 0.38, 0);
      } else if (preset === 'profile') {
        // Orthogonal 2D cross-section view (perpendicular to Z=0 cut plane, centered on front face)
        targetPos = new THREE.Vector3(-widthKm / 4, -depthKm / 2, depthKm * 1.45);
        targetLook = new THREE.Vector3(-widthKm / 4, -depthKm / 2, 0);
      } else if (preset === 'chamber') {
        const r = this.reservoirs()[0] || { depthKm: 7.5, x: 0 };
        targetPos = new THREE.Vector3(r.x + widthKm * 0.35, -r.depthKm + depthKm * 0.1, depthKm * 0.85);
        targetLook = new THREE.Vector3(r.x, -r.depthKm, 0);
      } else if (preset === 'vent') {
        const coneH = this.profile.edifice.summitHeightKm || 2.4;
        targetPos = new THREE.Vector3(0, coneH + depthKm * 0.25, widthKm * 0.45);
        targetLook = new THREE.Vector3(0, coneH, 0);
      } else if (preset === 'orbit') {
        targetPos = this.defaultCamPos.clone();
        targetLook = this.defaultCamTarget.clone();
      }

      if (targetPos && targetLook) {
        this.isCameraLerping = true;
        this.cameraLerpTargetPos = targetPos;
        this.cameraLerpTargetLook = targetLook;
      }
    }

    /**
     * Procedural High-Resolution Stratigraphic & Lithology Texture Generator
     * Synthesizes authentic lithological patterns (carbonate stylolites, foliation folds,
     * crystalline diorite/gabbro, volcanic ash beds, ophiolites, glacial ice, faults).
     */
    generateStratigraphyTexture(w = 2048, h = 2048) {
      const cvs = document.createElement('canvas');
      cvs.width = w; cvs.height = h;
      const ctx = cvs.getContext('2d');

      const maxDepth = this.profile.maxDepthKm || 12;
      const id = this.eruptionId;

      // Dark lithospheric baseline gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#121824');
      bg.addColorStop(0.5, '#181b26');
      bg.addColorStop(1, '#28140c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Stratigraphic layers
      const layers = this.profile.layers || [];
      for (const layer of layers) {
        const yTop = (layer.topKm / maxDepth) * h;
        const yBot = (layer.bottomKm / maxDepth) * h;
        const layerH = yBot - yTop;

        // Base stratum fill with tailored geological tone
        ctx.fillStyle = layer.color || '#333';
        ctx.fillRect(0, yTop, w, layerH);

        // Sub-bedding micro-lamination gradient
        for (let dy = 0; dy < layerH; dy += 14) {
          const shade = ((dy % 28 === 0) ? 0.06 : -0.05);
          ctx.fillStyle = shade > 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
          ctx.fillRect(0, yTop + dy, w, 7);
        }

        // Distinct lithological pattern rendering
        ctx.lineWidth = 1.4;

        if (layer.pattern === 'blocks') {
          // Mesozoic Carbonates (Limestone/Dolomite): thick horizontal beds, stylolites, joints
          ctx.strokeStyle = 'rgba(250, 240, 225, 0.32)';
          for (let y = yTop; y <= yBot; y += 52) {
            // Bedding plane
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();

            // Stylolitic suture teeth
            ctx.save();
            ctx.strokeStyle = 'rgba(190, 170, 150, 0.48)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (let x = 0; x <= w; x += 14) {
              const tooth = (x % 28 === 0) ? -4.5 : 4.5;
              if (x === 0) ctx.moveTo(x, y + tooth); else ctx.lineTo(x, y + tooth);
            }
            ctx.stroke();
            ctx.restore();

            // Staggered vertical tectonic joints
            const offset = (y % 104 === 0) ? 0 : 50;
            ctx.strokeStyle = 'rgba(240, 225, 205, 0.25)';
            for (let x = offset; x <= w; x += 100) {
              ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 52); ctx.stroke();
            }
          }
        } else if (layer.pattern === 'slanted') {
          // Metamorphic Schist & Gneiss: ductile foliation waves & quartz augen
          ctx.strokeStyle = 'rgba(235, 215, 230, 0.26)';
          for (let i = -w; i <= w * 2; i += 32) {
            ctx.beginPath();
            for (let s = yTop; s <= yBot; s += 16) {
              const wave = Math.sin((s + i) * 0.035) * 8;
              const px = i + (s - yTop) * 0.75 + wave;
              if (s === yTop) ctx.moveTo(px, s); else ctx.lineTo(px, s);
            }
            ctx.stroke();
          }
          // Augen quartz lenses
          ctx.fillStyle = 'rgba(255, 240, 220, 0.2)';
          for (let y = yTop + 24; y <= yBot; y += 80) {
            for (let x = 40; x <= w; x += 120) {
              ctx.beginPath();
              ctx.ellipse(x, y, 14, 5, Math.PI / 4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (layer.pattern === 'ice') {
          // Glacial Ice Cap & Firn (Eyjafjallajökull)
          ctx.fillStyle = 'rgba(180, 235, 255, 0.38)';
          ctx.fillRect(0, yTop, w, layerH);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = 1.8;
          for (let x = 0; x <= w; x += 36) {
            ctx.beginPath();
            ctx.moveTo(x, yTop);
            ctx.lineTo(x + 6, yTop + layerH * 0.5);
            ctx.lineTo(x - 4, yBot);
            ctx.stroke();
          }
        } else {
          // Volcanic Tuffs, Sediments & Plutonic Diorite/Granodiorite Grains
          ctx.strokeStyle = 'rgba(245, 225, 205, 0.24)';
          for (let y = yTop + 14; y <= yBot; y += 36) {
            for (let x = 14; x <= w; x += 36) {
              ctx.beginPath();
              ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y);
              ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8);
              ctx.stroke();
            }
          }
        }

        // Contact Metamorphic Aureole (Thermal Halo) around primary magma chamber
        const pR = this.reservoirs()[0];
        if (pR) {
          const cy = (pR.depthKm / maxDepth) * h;
          const cx = (0.5 + pR.x / (this.profile.widthKm || 16)) * w;
          const rGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, 340);
          rGrad.addColorStop(0, 'rgba(255, 125, 30, 0.28)');
          rGrad.addColorStop(0.5, 'rgba(220, 65, 15, 0.14)');
          rGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = rGrad;
          ctx.fillRect(0, yTop, w, layerH);
        }

        // Crisp Stratigraphic Boundary Line
        ctx.strokeStyle = 'rgba(255, 235, 215, 0.6)';
        ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(0, yBot); ctx.lineTo(w, yBot); ctx.stroke();

        // Elegant Stratigraphic Horizon Typography placed at LEFT edge (clear of center conduit!)
        ctx.save();
        ctx.fillStyle = 'rgba(10, 6, 4, 0.72)';
        ctx.fillRect(24, yBot - 44, 480, 36);
        ctx.strokeStyle = 'rgba(255, 180, 90, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(24, yBot - 44, 480, 36);

        ctx.fillStyle = '#fff0d8';
        ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(layer.name.toUpperCase(), 36, yBot - 18);
        ctx.restore();
      }

      // Tectonic Fault Planes & Ring Fracture Traces
      ctx.strokeStyle = 'rgba(255, 140, 60, 0.6)';
      ctx.lineWidth = 2.8;
      ctx.setLineDash([12, 8]);
      ctx.beginPath(); ctx.moveTo(w * 0.22, 0); ctx.lineTo(w * 0.48, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w * 0.78, 0); ctx.lineTo(w * 0.62, h); ctx.stroke();
      ctx.setLineDash([]);

      const tex = new this.THREE.CanvasTexture(cvs);
      tex.wrapS = this.THREE.ClampToEdgeWrapping;
      tex.wrapT = this.THREE.ClampToEdgeWrapping;
      if (this.THREE.sRGBEncoding) tex.encoding = this.THREE.sRGBEncoding;
      return tex;
    }

    /**
     * Normal Map Generator via Sobel Gradient
     */
    generateStratigraphyNormalMap(w = 1024, h = 1024) {
      const cvs = document.createElement('canvas');
      cvs.width = w; cvs.height = h;
      const ctx = cvs.getContext('2d');
      const img = ctx.createImageData(w, h);
      const d = img.data;

      const maxDepth = this.profile.maxDepthKm || 12;
      const layers = this.profile.layers || [];

      for (let y = 0; y < h; y++) {
        const depthRatio = y / h;
        const currentKm = depthRatio * maxDepth;
        let isBoundary = false;
        for (const l of layers) {
          if (Math.abs(l.bottomKm - currentKm) < 0.15) {
            isBoundary = true; break;
          }
        }

        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          let nx = 0, ny = 0, nz = 1;

          if (isBoundary) {
            ny = -0.45;
          }
          const grain = Math.sin(x * 0.25) * Math.cos(y * 0.25);
          nx += grain * 0.15;
          ny += grain * 0.15;

          const len = Math.hypot(nx, ny, nz) || 1;
          d[idx]     = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
          d[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
          d[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
          d[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);

      const nTex = new this.THREE.CanvasTexture(cvs);
      nTex.wrapS = this.THREE.ClampToEdgeWrapping;
      nTex.wrapT = this.THREE.ClampToEdgeWrapping;
      return nTex;
    }

    /**
     * Procedural Radial Surface Texture Generator (Y = 0 Bedrock Plain)
     */
    generateTopSurfaceTexture(widthKm = 16, lenKm = 18, w = 1024, h = 1024) {
      const cvs = document.createElement('canvas');
      cvs.width = w; cvs.height = h;
      const ctx = cvs.getContext('2d');
      const id = this.eruptionId;

      let baseColor = '#1f2227';
      let ashColor = '#141110';
      let ringColor = 'rgba(255, 200, 150, 0.08)';

      if (id === 'maunaloa2022') {
        baseColor = '#1c1815';
        ashColor = '#0f0b09';
      } else if (id === 'eyja2010') {
        baseColor = '#242a2d';
        ashColor = '#141a1e';
      } else if (id === 'yellowstone') {
        baseColor = '#322c26';
        ashColor = '#241f1a';
        ringColor = 'rgba(240, 220, 180, 0.12)';
      } else if (id === 'krakatoa1883') {
        baseColor = '#1a2228';
        ashColor = '#11171c';
      }

      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.5;

      const radGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.48);
      radGrad.addColorStop(0, ashColor);
      radGrad.addColorStop(0.35, 'rgba(28, 22, 18, 0.7)');
      radGrad.addColorStop(0.7, 'rgba(38, 32, 28, 0.3)');
      radGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, w, h);

      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const noise = (Math.random() - 0.5) * 16;
        d[i] = Math.min(255, Math.max(0, d[i] + noise));
        d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise));
        d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise));
      }
      ctx.putImageData(img, 0, 0);

      ctx.lineWidth = 1.2;
      for (let r = 50; r < w * 0.46; r += 60) {
        ctx.strokeStyle = ringColor;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2; a += 0.05) {
          const wobble = Math.sin(a * 8) * 4 + Math.cos(a * 3) * 6;
          const px = cx + Math.cos(a) * (r + wobble);
          const py = cy + Math.sin(a) * (r + wobble);
          if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      if (id === 'yellowstone') {
        ctx.strokeStyle = 'rgba(255, 120, 40, 0.4)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.35, h * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const tex = new this.THREE.CanvasTexture(cvs);
      tex.wrapS = this.THREE.ClampToEdgeWrapping;
      tex.wrapT = this.THREE.ClampToEdgeWrapping;
      return tex;
    }

    /**
     * Rebuild All 3D Volcanological Cutaway Meshes
     */
    rebuild3DScene() {
      const THREE = this.THREE;
      if (!THREE || !this.scene) return;

      // Clear existing 3D groups
      while (this.crustGroup.children.length) this.crustGroup.remove(this.crustGroup.children[0]);
      while (this.waterGroup.children.length) this.waterGroup.remove(this.waterGroup.children[0]);
      while (this.edificeGroup.children.length) this.edificeGroup.remove(this.edificeGroup.children[0]);
      while (this.chamberGroup.children.length) this.chamberGroup.remove(this.chamberGroup.children[0]);
      while (this.conduitGroup.children.length) this.conduitGroup.remove(this.conduitGroup.children[0]);
      while (this.particleGroup.children.length) this.particleGroup.remove(this.particleGroup.children[0]);
      while (this.aquiferGroup.children.length) this.aquiferGroup.remove(this.aquiferGroup.children[0]);
      while (this.scaleGroup.children.length) this.scaleGroup.remove(this.scaleGroup.children[0]);
      while (this.annotationGroup.children.length) this.annotationGroup.remove(this.annotationGroup.children[0]);

      const widthKm = this.profile.widthKm || 16;
      const depthKm = this.profile.maxDepthKm || 12;
      const lenKm = Math.round(widthKm * 1.1);

      // 1. Build 3D Crustal Lithosphere Cutaway Block
      const strataTex = this.generateStratigraphyTexture();
      const normalTex = this.generateStratigraphyNormalMap();

      const cutMat = new THREE.MeshStandardMaterial({
        map: strataTex,
        normalMap: normalTex,
        normalScale: new THREE.Vector2(0.7, 0.7),
        roughness: 0.82,
        metalness: 0.08,
        side: THREE.DoubleSide
      });

      const outerMat = new THREE.MeshStandardMaterial({
        color: 0x121620,
        roughness: 0.94,
        metalness: 0.05
      });

      // Front Cut Face (Z = 0, X in [-widthKm/2, 0], Y in [-depthKm, 0])
      const frontGeo = new THREE.PlaneGeometry(widthKm / 2, depthKm);
      const frontMesh = new THREE.Mesh(frontGeo, cutMat);
      frontMesh.position.set(-widthKm / 4, -depthKm / 2, 0);
      frontMesh.receiveShadow = true;
      this.crustGroup.add(frontMesh);

      // Side Cut Face (X = 0, Z in [-lenKm/2, 0], Y in [-depthKm, 0])
      const sideGeo = new THREE.PlaneGeometry(lenKm / 2, depthKm);
      const sideMesh = new THREE.Mesh(sideGeo, cutMat);
      sideMesh.rotation.y = -Math.PI / 2;
      sideMesh.position.set(0, -depthKm / 2, -lenKm / 4);
      sideMesh.receiveShadow = true;
      this.crustGroup.add(sideMesh);

      // Outer Bedrock Walls (Left, Back, Right, Front-Left, Bottom)
      // Left Wall (X = -widthKm/2, Z in [-lenKm/2, lenKm/2])
      const leftGeo = new THREE.PlaneGeometry(lenKm, depthKm);
      const leftMesh = new THREE.Mesh(leftGeo, outerMat);
      leftMesh.rotation.y = Math.PI / 2;
      leftMesh.position.set(-widthKm / 2, -depthKm / 2, 0);
      this.crustGroup.add(leftMesh);

      // Back Wall (Z = -lenKm/2, X in [-widthKm/2, widthKm/2])
      const backGeo = new THREE.PlaneGeometry(widthKm, depthKm);
      const backMesh = new THREE.Mesh(backGeo, outerMat);
      backMesh.position.set(0, -depthKm / 2, -lenKm / 2);
      this.crustGroup.add(backMesh);

      // Right Wall (X = +widthKm/2, Z in [-lenKm/2, 0])
      const rightGeo = new THREE.PlaneGeometry(lenKm / 2, depthKm);
      const rightMesh = new THREE.Mesh(rightGeo, outerMat);
      rightMesh.rotation.y = -Math.PI / 2;
      rightMesh.position.set(widthKm / 2, -depthKm / 2, -lenKm / 4);
      this.crustGroup.add(rightMesh);

      // Front-Left Outer Wall (Z = +lenKm/2, X in [-widthKm/2, 0])
      const frontOuterGeo = new THREE.PlaneGeometry(widthKm / 2, depthKm);
      const frontOuterMesh = new THREE.Mesh(frontOuterGeo, outerMat);
      frontOuterMesh.rotation.y = Math.PI;
      frontOuterMesh.position.set(-widthKm / 4, -depthKm / 2, lenKm / 2);
      this.crustGroup.add(frontOuterMesh);

      // L-Shaped Shape for Top & Bottom Planes (omitting +X, +Z cutaway quadrant)
      // Since mesh.rotation.x = -Math.PI / 2 maps 2D (x, y) to 3D (x, 0, -y),
      // to keep 3D X in [-W/2, 0] when Z in [0, L/2], and omit X > 0, Z > 0:
      // In 2D (x, y) space, Z > 0 corresponds to y < 0.
      const blockShape = new THREE.Shape();
      blockShape.moveTo(-widthKm / 2, -lenKm / 2); // 3D: (-W/2, +L/2) Front-Left
      blockShape.lineTo(0, -lenKm / 2);            // 3D: (0, +L/2) Front-Cut-Edge
      blockShape.lineTo(0, 0);                     // 3D: (0, 0) Center-Origin
      blockShape.lineTo(widthKm / 2, 0);           // 3D: (+W/2, 0) Right-Cut-Edge
      blockShape.lineTo(widthKm / 2, lenKm / 2);   // 3D: (+W/2, -L/2) Back-Right
      blockShape.lineTo(-widthKm / 2, lenKm / 2);  // 3D: (-W/2, -L/2) Back-Left
      blockShape.closePath();

      // Bottom Bedrock Plain (Y = -depthKm)
      const bottomGeo = new THREE.ShapeGeometry(blockShape);
      const bottomMesh = new THREE.Mesh(bottomGeo, outerMat);
      bottomMesh.rotation.x = -Math.PI / 2;
      bottomMesh.position.set(0, -depthKm, 0);
      this.crustGroup.add(bottomMesh);

      // Top Surface Bedrock Plain (Y = 0)
      const topGeo = new THREE.ShapeGeometry(blockShape);
      const topTex = this.generateTopSurfaceTexture(widthKm, lenKm);
      const topMat = new THREE.MeshStandardMaterial({
        map: topTex,
        roughness: 0.88,
        metalness: 0.05,
        side: THREE.DoubleSide
      });
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.rotation.x = -Math.PI / 2;
      topMesh.position.set(0, 0, 0);
      topMesh.receiveShadow = true;
      this.crustGroup.add(topMesh);

      // 2. Build 3D Volcanic Edifice (Authentic Geomorphology per Volcano)
      this.buildEdifice(widthKm);

      // 3. Build 3D Marine Environment (Krakatoa Ocean Water Body)
      if (this.profile.waterLevelKm || this.eruptionId === 'krakatoa1883') {
        this.buildMarineWater(widthKm, lenKm);
      }

      // 4. Build 3D Transcrustal Magma System (TCMS Chambers & Mush Shells)
      this.buildChambers();

      // 5. Build 3D Feeder Conduits, Sills & Dikes
      this.buildPlumbing();

      // 6. Build 3D Multiphase Particle System (Decompression Vesicles & Ash)
      this.initParticleSystem();

      // 7. Build 3D Hydrothermal Aquifers
      this.buildAquifers();

      // 8. Build 3D Metric Depth Ruler & Lithostatic Stress Markers
      this.buildScaleAxes(widthKm, depthKm);

      // 9. Build 3D Interactive Scientific Annotation Pins
      this.buildAnnotations();
    }

    /**
     * Builds authentic 3D volcanic edifice geomorphology matching the historical preset
     */
    buildEdifice(widthKm) {
      const THREE = this.THREE;
      const e = this.profile.edifice || {};
      const coneR = Math.min(widthKm * 0.38, e.halfWidthKm || 6);
      const coneH = e.summitHeightKm || 2.4;
      const id = this.eruptionId;

      const edificeMat = new THREE.MeshStandardMaterial({
        color: 0x42362e,
        roughness: 0.86,
        metalness: 0.08,
        side: THREE.DoubleSide
      });

      if (id === 'maunaloa2022') {
        // Broad Hawaiian Shield Volcano (gentle 6-8° slope)
        const shieldGeo = new THREE.CylinderGeometry(1.2, coneR, coneH, 32, 10, false, 0, Math.PI * 1.5);
        const shieldMesh = new THREE.Mesh(shieldGeo, new THREE.MeshStandardMaterial({ color: 0x2e2723, roughness: 0.92 }));
        shieldMesh.rotation.y = -Math.PI;
        shieldMesh.position.set(0, coneH / 2, 0);
        shieldMesh.castShadow = true;
        this.edificeGroup.add(shieldMesh);

        // Summit Mokuʻāweoweo Caldera Depression
        const mokuGeo = new THREE.CylinderGeometry(1.3, 1.2, 0.45, 24);
        const mokuMesh = new THREE.Mesh(mokuGeo, new THREE.MeshStandardMaterial({ color: 0x181412, roughness: 0.95 }));
        mokuMesh.position.set(0, coneH - 0.22, 0);
        this.edificeGroup.add(mokuMesh);

      } else if (id === 'vesuvius79') {
        // Somma-Vesuvius Asymmetrical Complex
        // 1. Ancestral Monte Somma caldera rim curving around the northern flank
        const sommaGeo = new THREE.CylinderGeometry(1.4, coneR * 1.05, coneH * 0.92, 32, 8, false, Math.PI * 0.4, Math.PI * 0.9);
        const sommaMat = new THREE.MeshStandardMaterial({ color: 0x483a32, roughness: 0.9, side: THREE.DoubleSide });
        const sommaMesh = new THREE.Mesh(sommaGeo, sommaMat);
        sommaMesh.position.set(0, (coneH * 0.92) / 2, 0);
        this.edificeGroup.add(sommaMesh);

        // 2. Central Vesuvius Cone
        const vesGeo = new THREE.CylinderGeometry(0.7, coneR * 0.75, coneH, 32, 8, false, 0, Math.PI * 1.5);
        const vesMesh = new THREE.Mesh(vesGeo, edificeMat);
        vesMesh.rotation.y = -Math.PI;
        vesMesh.position.set(0, coneH / 2, 0);
        this.edificeGroup.add(vesMesh);

      } else if (id === 'sthelenr1980') {
        // Mount St. Helens: Stratocone with North-Flank Cryptodome Bulge
        const mshGeo = new THREE.CylinderGeometry(0.65, coneR, coneH, 32, 8, false, 0, Math.PI * 1.5);
        const mshMesh = new THREE.Mesh(mshGeo, edificeMat);
        mshMesh.rotation.y = -Math.PI;
        mshMesh.position.set(0, coneH / 2, 0);
        this.edificeGroup.add(mshMesh);
        this.edificeGroup.userData.mshCone = mshMesh;

        // North-Flank Cryptodome Intrusion (pressurized dacite magma body bulging in north slope)
        const crypto = this.profile.cryptodome || { x: -1.6, depthKm: -1.3, rxKm: 1.1, ryKm: 0.35 };
        const cryptoGeo = new THREE.SphereGeometry(1, 24, 16);
        cryptoGeo.scale(crypto.rxKm, crypto.ryKm, crypto.rxKm * 0.85);
        const cryptoMat = new THREE.MeshStandardMaterial({
          color: 0xff5015,
          emissive: 0xee2805,
          emissiveIntensity: 2.2,
          roughness: 0.35
        });
        const cryptoMesh = new THREE.Mesh(cryptoGeo, cryptoMat);
        cryptoMesh.position.set(crypto.x, -crypto.depthKm, 0); // depthKm is negative above datum
        this.edificeGroup.add(cryptoMesh);
        this.edificeGroup.userData.cryptoMesh = cryptoMesh;

        // North Flank Landslide Detachment Fault Line
        const faultPoints = [
          new THREE.Vector3(0, coneH - 0.2, 0),
          new THREE.Vector3(-0.9, coneH * 0.65, 0),
          new THREE.Vector3(-2.2, coneH * 0.2, 0),
          new THREE.Vector3(-3.8, 0, 0)
        ];
        const faultGeo = new THREE.BufferGeometry().setFromPoints(faultPoints);
        const faultMat = new THREE.LineDashedMaterial({ color: 0xffa050, dashSize: 0.3, gapSize: 0.15, linewidth: 2 });
        const faultLine = new THREE.Line(faultGeo, faultMat);
        faultLine.computeLineDistances();
        this.edificeGroup.add(faultLine);
        this.edificeGroup.userData.faultLine = faultLine;

      } else if (id === 'tambora1815') {
        // Mount Tambora: Towering pre-1815 cone with dynamic piston caldera collapse
        const tamGeo = new THREE.CylinderGeometry(0.9, coneR, coneH, 32, 10, false, 0, Math.PI * 1.5);
        const tamMesh = new THREE.Mesh(tamGeo, edificeMat);
        tamMesh.rotation.y = -Math.PI;
        tamMesh.position.set(0, coneH / 2, 0);
        this.edificeGroup.add(tamMesh);
        this.edificeGroup.userData.tamboraCone = tamMesh;

        // Central 6-km Caldera Piston Block (dynamically subsides down ring faults)
        const pistonR = 3.0; // 6 km diameter
        const pistonGeo = new THREE.CylinderGeometry(pistonR, pistonR, coneH, 24, 6, false, 0, Math.PI * 1.5);
        const pistonMat = new THREE.MeshStandardMaterial({ color: 0x362b24, roughness: 0.9, side: THREE.DoubleSide });
        const pistonMesh = new THREE.Mesh(pistonGeo, pistonMat);
        pistonMesh.rotation.y = -Math.PI;
        pistonMesh.position.set(0, coneH / 2, 0);
        this.edificeGroup.add(pistonMesh);
        this.edificeGroup.userData.pistonMesh = pistonMesh;

      } else if (id === 'eyja2010') {
        // Eyjafjallajökull: Stratocone + 3D Glacial Ice Cap
        const eyjaGeo = new THREE.CylinderGeometry(1.0, coneR, coneH - 0.2, 32, 8, false, 0, Math.PI * 1.5);
        const eyjaMesh = new THREE.Mesh(eyjaGeo, edificeMat);
        eyjaMesh.rotation.y = -Math.PI;
        eyjaMesh.position.set(0, (coneH - 0.2) / 2, 0);
        this.edificeGroup.add(eyjaMesh);

        // 3D Summit Glacial Ice Cap (200 m thick ice)
        const iceGeo = new THREE.CylinderGeometry(0.85, 1.25, 0.28, 24, 4, false, 0, Math.PI * 1.5);
        const iceMat = new THREE.MeshStandardMaterial({
          color: 0x9be8ff,
          roughness: 0.2,
          metalness: 0.1,
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide
        });
        const iceMesh = new THREE.Mesh(iceGeo, iceMat);
        iceMesh.rotation.y = -Math.PI;
        iceMesh.position.set(0, coneH - 0.14, 0);
        this.edificeGroup.add(iceMesh);
        this.edificeGroup.userData.iceMesh = iceMesh;

      } else if (id === 'krakatoa1883') {
        // Krakatoa Island Complex: NNW-SSE chain of Rakata, Danan, and Perboewatan cones
        // 1. Rakata (southern peak, stays standing as the famous sheared cliff)
        const rakataGeo = new THREE.CylinderGeometry(0.3, 2.2, coneH, 28, 8, false, 0, Math.PI * 1.5);
        const rakataMesh = new THREE.Mesh(rakataGeo, edificeMat);
        rakataMesh.rotation.y = -Math.PI;
        rakataMesh.position.set(0, coneH / 2, -2.2);
        this.edificeGroup.add(rakataMesh);
        this.edificeGroup.userData.rakataMesh = rakataMesh;

        // 2. Danan (central andesitic cone)
        const dananGeo = new THREE.CylinderGeometry(0.25, 1.5, 0.45, 24, 6, false, 0, Math.PI * 1.5);
        const dananMesh = new THREE.Mesh(dananGeo, edificeMat);
        dananMesh.rotation.y = -Math.PI;
        dananMesh.position.set(0, 0.45 / 2, 0);
        this.edificeGroup.add(dananMesh);
        this.edificeGroup.userData.dananMesh = dananMesh;

        // 3. Perboewatan (northern crater cone)
        const perbGeo = new THREE.CylinderGeometry(0.2, 1.2, 0.25, 20, 4, false, 0, Math.PI * 1.5);
        const perbMesh = new THREE.Mesh(perbGeo, edificeMat);
        perbMesh.rotation.y = -Math.PI;
        perbMesh.position.set(0, 0.25 / 2, 2.0);
        this.edificeGroup.add(perbMesh);
        this.edificeGroup.userData.perbMesh = perbMesh;

      } else if (id === 'pinatubo1991') {
        // Mount Pinatubo: Composite dacite stratocone with dynamic summit caldera collapse block
        const pinaGeo = new THREE.CylinderGeometry(0.5, coneR, coneH, 32, 8, false, 0, Math.PI * 1.5);
        const pinaMesh = new THREE.Mesh(pinaGeo, edificeMat);
        pinaMesh.rotation.y = -Math.PI;
        pinaMesh.position.set(0, coneH / 2, 0);
        this.edificeGroup.add(pinaMesh);
        this.edificeGroup.userData.pinatuboCone = pinaMesh;

      } else if (id === 'yellowstone') {
        // Yellowstone Supervolcano: Continental Rhyolite Caldera High-Plateau
        // 1. Broad regional volcanic plateau
        const platGeo = new THREE.CylinderGeometry(coneR * 0.95, coneR, 0.9, 32, 4, false, 0, Math.PI * 1.5);
        const platMesh = new THREE.Mesh(platGeo, new THREE.MeshStandardMaterial({ color: 0x3d352d, roughness: 0.92, side: THREE.DoubleSide }));
        platMesh.rotation.y = -Math.PI;
        platMesh.position.set(0, 0.45, 0);
        this.edificeGroup.add(platMesh);

        // 2. Sunken 70-km Caldera Basin Depression
        const basinGeo = new THREE.CylinderGeometry(coneR * 0.65, coneR * 0.6, 0.35, 28, 2);
        const basinMesh = new THREE.Mesh(basinGeo, new THREE.MeshStandardMaterial({ color: 0x241d18, roughness: 0.95 }));
        basinMesh.position.set(0, 0.75, 0);
        this.edificeGroup.add(basinMesh);

        // 3. Mallard Lake Resurgent Dome (western resurgent uplift)
        const mlGeo = new THREE.SphereGeometry(1, 20, 14);
        mlGeo.scale(2.2, 0.35, 1.8);
        const mlMesh = new THREE.Mesh(mlGeo, new THREE.MeshStandardMaterial({ color: 0x483e35, roughness: 0.9 }));
        mlMesh.position.set(-4.2, 0.85, -1.5);
        this.edificeGroup.add(mlMesh);

        // 4. Sour Creek Resurgent Dome (eastern resurgent uplift)
        const scGeo = new THREE.SphereGeometry(1, 20, 14);
        scGeo.scale(2.2, 0.35, 1.8);
        const scMesh = new THREE.Mesh(scGeo, new THREE.MeshStandardMaterial({ color: 0x483e35, roughness: 0.9 }));
        scMesh.position.set(3.8, 0.85, -2.0);
        this.edificeGroup.add(scMesh);

      } else {
        // Generic Composite Stratovolcano
        const coneGeo = new THREE.CylinderGeometry(0.8, coneR, coneH, 32, 8, false, 0, Math.PI * 1.5);
        const coneMesh = new THREE.Mesh(coneGeo, edificeMat);
        coneMesh.rotation.y = -Math.PI;
        coneMesh.position.set(0, coneH / 2, 0);
        this.edificeGroup.add(coneMesh);
      }

      // Summit Crater Throat Rim (for stratocones & calderas)
      if (id !== 'yellowstone') {
        const craterGeo = new THREE.CylinderGeometry(0.85, 0.42, 0.8, 20);
        const craterMat = new THREE.MeshStandardMaterial({ color: 0x1d1410, roughness: 0.92 });
        const craterMesh = new THREE.Mesh(craterGeo, craterMat);
        const craterY = (id === 'krakatoa1883') ? 0.38 : coneH - 0.4;
        craterMesh.position.set(0, craterY, 0);
        this.edificeGroup.add(craterMesh);
      }
    }

    /**
     * Builds 3D marine ocean water body for marine settings (Krakatoa 1883)
     */
    buildMarineWater(widthKm, lenKm) {
      const THREE = this.THREE;
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x1878aa,
        roughness: 0.15,
        metalness: 0.2,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide
      });

      const waterShape = new THREE.Shape();
      waterShape.moveTo(-widthKm / 2, -lenKm / 2); // 3D: (-W/2, +L/2) Front-Left
      waterShape.lineTo(0, -lenKm / 2);            // 3D: (0, +L/2) Front-Cut-Edge
      waterShape.lineTo(0, 0);                     // 3D: (0, 0) Center-Origin
      waterShape.lineTo(widthKm / 2, 0);           // 3D: (+W/2, 0) Right-Cut-Edge
      waterShape.lineTo(widthKm / 2, lenKm / 2);   // 3D: (+W/2, -L/2) Back-Right
      waterShape.lineTo(-widthKm / 2, lenKm / 2);  // 3D: (-W/2, -L/2) Back-Left
      waterShape.closePath();

      const waterGeo = new THREE.ShapeGeometry(waterShape);
      const waterMesh = new THREE.Mesh(waterGeo, waterMat);
      waterMesh.rotation.x = -Math.PI / 2;
      waterMesh.position.set(0, 0.05, 0);
      this.waterGroup.add(waterMesh);
    }

    /**
     * Builds 3D Transcrustal Magma System (TCMS) Chambers (Cashman et al. 2017)
     */
    buildChambers() {
      const THREE = this.THREE;
      const id = this.eruptionId;

      this.chamberMeshes = [];

      for (const r of this.reservoirs()) {
        const chamberGroup = new THREE.Group();
        chamberGroup.position.set(r.x, -r.depthKm, 0);

        // 1. Outer Crystalline Mush Shell (50–85% crystals, cumulate mesh framework)
        const mushGeo = new THREE.SphereGeometry(1, 32, 24);
        mushGeo.scale(r.rxKm, r.ryKm, r.rxKm * 0.9);
        const mushMat = new THREE.MeshStandardMaterial({
          color: 0x4a2418,
          roughness: 0.88,
          metalness: 0.15,
          transparent: true,
          opacity: 0.68
        });
        const mushMesh = new THREE.Mesh(mushGeo, mushMat);
        chamberGroup.add(mushMesh);

        // 2. Inner Eruptible Melt Lens (>50% melt fraction, glowing incandescent core)
        const coreGeo = new THREE.SphereGeometry(0.85, 32, 24);
        coreGeo.scale(r.rxKm * 0.76, r.ryKm * 0.65, r.rxKm * 0.72);

        const isBasalt = (r.comp || '').toLowerCase().includes('basalt');
        const coreColor = isBasalt ? 0xff480a : 0xffc870;
        const emissiveCol = isBasalt ? 0xee2002 : 0xff3b08;

        const coreMat = new THREE.MeshStandardMaterial({
          color: coreColor,
          emissive: emissiveCol,
          emissiveIntensity: 2.5,
          roughness: 0.28,
          metalness: 0.12
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        chamberGroup.add(coreMesh);
        chamberGroup.userData.coreMesh = coreMesh;

        // Vesuvius 79 AD: Stratified Melt Lens (White Phonolite over Grey Tephriphonolite)
        if (id === 'vesuvius79' && r === this.reservoirs()[0]) {
          const upperPhonoGeo = new THREE.SphereGeometry(0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
          upperPhonoGeo.scale(r.rxKm * 0.75, r.ryKm * 0.64, r.rxKm * 0.71);
          const phonoMat = new THREE.MeshStandardMaterial({
            color: 0xfff0c8,
            emissive: 0xff8515,
            emissiveIntensity: 2.8,
            roughness: 0.2
          });
          const phonoMesh = new THREE.Mesh(upperPhonoGeo, phonoMat);
          chamberGroup.add(phonoMesh);
          chamberGroup.userData.phonoMesh = phonoMesh;
        }

        // Convective Flow Torus Rings
        const torusMat = new THREE.MeshBasicMaterial({ color: 0xfff090, transparent: true, opacity: 0.45 });
        const torus1 = new THREE.Mesh(new THREE.TorusGeometry(r.rxKm * 0.42, 0.08, 12, 32), torusMat);
        const torus2 = new THREE.Mesh(new THREE.TorusGeometry(r.rxKm * 0.32, 0.06, 12, 32), torusMat);
        torus1.rotation.x = Math.PI / 4;
        torus2.rotation.y = Math.PI / 4;
        chamberGroup.add(torus1);
        chamberGroup.add(torus2);
        chamberGroup.userData.torus1 = torus1;
        chamberGroup.userData.torus2 = torus2;

        this.chamberGroup.add(chamberGroup);
        this.chamberMeshes.push(chamberGroup);
      }

      const pR = this.reservoirs()[0];
      if (pR) this.chamberLight.position.set(pR.x, -pR.depthKm, 0);
    }

    /**
     * Builds 3D Feeder Conduits, Sills & Dikes
     */
    buildPlumbing() {
      const THREE = this.THREE;
      const coneH = this.profile.edifice.summitHeightKm || 2.4;

      for (const c of this.sheets()) {
        if (c.sill) {
          // Horizontal Tabular Sill Intrusion (Disc/Saucer shape)
          const rx = c.rxKm || 2.0;
          const ry = c.ryKm || 0.3;
          const sillGeo = new THREE.CylinderGeometry(rx, rx, ry, 24, 1);
          const sillMat = new THREE.MeshStandardMaterial({
            color: 0xff520c,
            emissive: 0xee2202,
            emissiveIntensity: 2.2,
            roughness: 0.35
          });
          const sillMesh = new THREE.Mesh(sillGeo, sillMat);
          sillMesh.position.set((c.x1 + c.x2) / 2, -c.y1, 0);
          this.conduitGroup.add(sillMesh);

        } else {
          // Vertical Feeder Dike / Conduit Pipe
          let topY = -c.y2;
          if ((c.y2 <= 0 || c.surface) && Math.abs(c.x2) < 1.0) {
            topY = coneH;
          } else if (c.y2 <= 0 && this.eruptionId === 'maunaloa2022' && Math.abs(c.x2) >= 1.0) {
            topY = Math.max(0.2, coneH * (1 - Math.abs(c.x2) / (this.profile.edifice.halfWidthKm || 14)));
          }

          const p1 = new THREE.Vector3(c.x1, -c.y1, 0);
          const p2 = new THREE.Vector3(c.x2, topY, 0);
          const dist = p1.distanceTo(p2);
          const mid = p1.clone().lerp(p2, 0.5);

          const radiusM = (c.widthM || 50);
          const radius3D = Math.max(0.12, radiusM / 380);

          const condGeo = new THREE.CylinderGeometry(radius3D, radius3D, dist, 16, 1, false);
          const condMat = new THREE.MeshStandardMaterial({
            color: 0xff6510,
            emissive: 0xee2804,
            emissiveIntensity: 2.4,
            roughness: 0.32
          });
          const condMesh = new THREE.Mesh(condGeo, condMat);
          condMesh.position.copy(mid);

          const dir = p2.clone().sub(p1).normalize();
          condMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          this.conduitGroup.add(condMesh);
        }
      }
    }

    /**
     * Multiphase Particle System
     */
    initParticleSystem() {
      const THREE = this.THREE;
      const count = 260;
      const pos = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);

      const pR = this.reservoirs()[0] || { depthKm: 7.5, x: 0 };
      const coneH = this.profile.edifice.summitHeightKm || 2.4;
      const topY = coneH + 1.2;
      const botY = -pR.depthKm;

      this.particlesData = [];

      for (let i = 0; i < count; i++) {
        const t = Math.random();
        const y = botY + (topY - botY) * t;
        const radial = (Math.random() - 0.5) * 0.32;
        const angle = Math.random() * Math.PI * 2;

        pos[i * 3] = pR.x + Math.cos(angle) * radial;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = Math.sin(angle) * radial;

        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.5;
        colors[i * 3 + 2] = 0.1;
        sizes[i] = 3.5;

        this.particlesData.push({
          radial,
          angle,
          t,
          speed: 0.07 + Math.random() * 0.11
        });
      }

      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      pGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const pMat = new THREE.PointsMaterial({
        size: 0.38,
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending
      });

      this.particlePoints = new THREE.Points(pGeo, pMat);
      this.particleGroup.add(this.particlePoints);
    }

    /**
     * Builds 3D Hydrothermal Aquifer Volumes
     */
    buildAquifers() {
      const THREE = this.THREE;
      const aquifers = this.mode === 'exploration' ? this.customAquifers : (this.profile.aquifers || []);

      for (const aq of aquifers) {
        const aqGeo = new THREE.SphereGeometry(1, 24, 16);
        aqGeo.scale(aq.rxKm, aq.ryKm, aq.rxKm * 0.8);
        const aqMat = new THREE.MeshStandardMaterial({
          color: 0x30c8f5,
          roughness: 0.25,
          metalness: 0.1,
          transparent: true,
          opacity: 0.45
        });
        const aqMesh = new THREE.Mesh(aqGeo, aqMat);
        aqMesh.position.set(aq.x, -aq.depthKm, 0);
        this.aquiferGroup.add(aqMesh);
      }
    }

    /**
     * Creates crisp 3D text plane billboard
     */
    createLabelPlane(text, width3D, height3D, bgColor = 'rgba(12,8,6,0.85)', textColor = '#ffe0b8') {
      const THREE = this.THREE;
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 128;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = bgColor;
      ctx.fillRect(8, 8, 496, 112);
      ctx.strokeStyle = 'rgba(255,140,50,0.5)';
      ctx.lineWidth = 3;
      ctx.strokeRect(8, 8, 496, 112);

      ctx.fillStyle = textColor;
      ctx.font = 'bold 36px monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 64);

      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width3D, height3D), mat);
      return mesh;
    }

    /**
     * Builds 3D Metric Depth Ruler & Lithostatic Stress Markers
     */
    buildScaleAxes(widthKm, depthKm) {
      const THREE = this.THREE;

      // Vertical Depth Pillar along Front-Left Cut Edge
      const rulerGeo = new THREE.CylinderGeometry(0.08, 0.08, depthKm, 8);
      const rulerMat = new THREE.MeshBasicMaterial({ color: 0xefd8b8 });
      const rulerMesh = new THREE.Mesh(rulerGeo, rulerMat);
      rulerMesh.position.set(-widthKm / 2, -depthKm / 2, 0);
      this.scaleGroup.add(rulerMesh);

      // Sea Level Datum Line (Y = 0)
      const seaLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-widthKm / 2 - 1.2, 0, 0),
        new THREE.Vector3(1.2, 0, 0)
      ]);
      const seaLineMat = new THREE.LineDashedMaterial({
        color: 0x50c0f0,
        dashSize: 0.5,
        gapSize: 0.25
      });
      const seaLine = new THREE.Line(seaLineGeo, seaLineMat);
      seaLine.computeLineDistances();
      this.scaleGroup.add(seaLine);

      // Depth ticks every 2 km with Lithostatic Confining Pressure labels
      for (let d = 0; d <= depthKm; d += 2) {
        const tickGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-widthKm / 2 - 0.7, -d, 0),
          new THREE.Vector3(-widthKm / 2, -d, 0)
        ]);
        const tickLine = new THREE.Line(tickGeo, new THREE.LineBasicMaterial({ color: 0xdfcaa8 }));
        this.scaleGroup.add(tickLine);

        // Quantitative lithostatic stress at this depth: P = rho * g * z
        const pMPa = Math.round((RHO_CRUST * GRAVITY * (d * 1000)) / 1e6);
        const labelText = d === 0 ? '0 km (Datum)' : `-${d} km · ${pMPa} MPa`;
        const labelMesh = this.createLabelPlane(labelText, 2.8, 0.7);
        labelMesh.position.set(-widthKm / 2 - 2.2, -d, 0.05);
        this.scaleGroup.add(labelMesh);
      }

      // Add physical boundary lines across cut face for Fragmentation & Exsolution
      const fragD = this.profile.fragmentationDepthKm ?? 0.8;
      if (fragD !== null && fragD < depthKm) {
        const fragLineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-widthKm / 2, -fragD, 0.02),
          new THREE.Vector3(0, -fragD, 0.02)
        ]);
        const fragLine = new THREE.Line(fragLineGeo, new THREE.LineDashedMaterial({ color: 0xffe880, dashSize: 0.4, gapSize: 0.2 }));
        fragLine.computeLineDistances();
        this.scaleGroup.add(fragLine);

        const fragTag = this.createLabelPlane(`⚡ Dingwell Fragmentation (${fragD} km)`, 3.2, 0.65, 'rgba(40,20,5,0.85)', '#ffea90');
        fragTag.position.set(-widthKm / 4, -fragD + 0.4, 0.05);
        this.scaleGroup.add(fragTag);
      }

      const exsolD = this.profile.exsolutionDepthKm ?? 2.5;
      if (exsolD !== null && exsolD < depthKm) {
        const exsolLineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-widthKm / 2, -exsolD, 0.02),
          new THREE.Vector3(0, -exsolD, 0.02)
        ]);
        const exsolLine = new THREE.Line(exsolLineGeo, new THREE.LineDashedMaterial({ color: 0x70d8ff, dashSize: 0.4, gapSize: 0.2 }));
        exsolLine.computeLineDistances();
        this.scaleGroup.add(exsolLine);

        const exsolTag = this.createLabelPlane(`🫧 Volatile Exsolution (${exsolD} km)`, 3.0, 0.65, 'rgba(5,20,35,0.85)', '#8be8ff');
        exsolTag.position.set(-widthKm / 4, -exsolD - 0.4, 0.05);
        this.scaleGroup.add(exsolTag);
      }
    }

    /**
     * Builds 3D Interactive Scientific Annotation Pins
     */
    buildAnnotations() {
      const THREE = this.THREE;
      const annotations = this.profile.annotations || [];

      annotations.forEach((a, i) => {
        const pinGroup = new THREE.Group();
        pinGroup.position.set(a.x || 0, -(a.depthKm || 5), 0.2);

        // Glowing Marker Sphere
        const pinGeo = new THREE.SphereGeometry(0.26, 16, 16);
        const pinMat = new THREE.MeshStandardMaterial({
          color: 0xff9530,
          emissive: 0xff6010,
          emissiveIntensity: 2.4,
          roughness: 0.2
        });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        pinMesh.userData = { annotation: a, index: i };
        pinGroup.add(pinMesh);

        // Pulsing Halo Ring
        const ringGeo = new THREE.RingGeometry(0.32, 0.46, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffb550, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        pinGroup.add(ringMesh);

        // 3D Text Title Badge above Pin
        const badgeMesh = this.createLabelPlane(`[${i + 1}] ${a.title}`, 3.2, 0.65, 'rgba(15,8,4,0.92)', '#ffdaaa');
        badgeMesh.position.set(0, 0.6, 0.05);
        badgeMesh.userData = { annotation: a, index: i };
        pinGroup.add(badgeMesh);

        this.annotationGroup.add(pinGroup);
      });
    }

    /**
     * Real-time dynamic updates (withdrawal deflation, collapse morphology, cryptodome unroofing)
     */
    updateDynamicMeshes() {
      const stage = this.stage();
      const id = this.eruptionId;

      // 1. Magma Chamber Deflation & Mush Compaction
      this.chamberMeshes.forEach(cg => {
        if (cg.userData.coreMesh) {
          const deflate = Math.max(0.18, 1.0 - stage.withdrawal * 0.52);
          cg.userData.coreMesh.scale.setScalar(deflate);
        }
        if (cg.userData.phonoMesh) {
          const phonoDeflate = Math.max(0, 1.0 - stage.withdrawal * 1.8);
          cg.userData.phonoMesh.scale.setScalar(phonoDeflate);
          cg.userData.phonoMesh.visible = phonoDeflate > 0.05;
        }
      });

      // 2. Tambora 1815: Piston Caldera Downdrop down Ring Faults
      if (id === 'tambora1815' && this.edificeGroup.userData.pistonMesh) {
        const dropKm = stage.collapse * 1.4;
        const coneH = this.profile.edifice.summitHeightKm || 4.3;
        this.edificeGroup.userData.pistonMesh.position.y = (coneH / 2) - dropKm;
      }

      // 3. Mount St. Helens 1980: Cryptodome Unroofing & Avalanche
      if (id === 'sthelenr1980' && this.edificeGroup.userData.cryptoMesh) {
        if (stage.activity > 0.3) {
          this.edificeGroup.userData.cryptoMesh.material.emissiveIntensity = 4.0;
        }
      }

      // 4. Eyjafjallajökull 2010: Subglacial Ice Cauldron Melting
      if (id === 'eyja2010' && this.edificeGroup.userData.iceMesh) {
        if (this.timeline >= 0.14) {
          this.edificeGroup.userData.iceMesh.material.opacity = Math.max(0.2, 0.65 - this.intensity * 0.005);
        }
      }

      // 5. Krakatoa 1883: Marine Caldera Collapse of Danan & Perboewatan
      if (id === 'krakatoa1883') {
        const collapseAmount = stage.collapse || 0;
        if (this.edificeGroup.userData.dananMesh) {
          const sy = Math.max(0.05, 1.0 - collapseAmount * 1.2);
          this.edificeGroup.userData.dananMesh.scale.y = sy;
          this.edificeGroup.userData.dananMesh.position.y = (0.45 * sy) / 2 - collapseAmount * 0.3;
        }
        if (this.edificeGroup.userData.perbMesh) {
          const sy = Math.max(0.05, 1.0 - collapseAmount * 1.3);
          this.edificeGroup.userData.perbMesh.scale.y = sy;
          this.edificeGroup.userData.perbMesh.position.y = (0.25 * sy) / 2 - collapseAmount * 0.2;
        }
      }

      // 6. Pinatubo 1991: Summit Caldera Subsidence
      if (id === 'pinatubo1991' && this.edificeGroup.userData.pinatuboCone) {
        if (stage.collapse > 0) {
          const sy = Math.max(0.65, 1.0 - stage.collapse * 0.35);
          this.edificeGroup.userData.pinatuboCone.scale.y = sy;
        }
      }
    }

    /**
     * Live Seismicity Simulation (Volcanic-Tectonic VT Earthquakes & LP Tremor)
     */
    updateSeismicity(dt) {
      const THREE = this.THREE;
      if (!THREE || !this.active()) return;

      if (this.clock > this.nextSeismicTime) {
        this.nextSeismicTime = this.clock + 0.35 + Math.random() * 0.55;
        const pR = this.reservoirs()[0];
        if (pR) {
          const sx = pR.x + (Math.random() - 0.5) * pR.rxKm * 1.5;
          const sy = -pR.depthKm + pR.ryKm * (0.7 + Math.random() * 0.5);
          const sz = (Math.random() - 0.5) * 2;

          const sMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffea90 })
          );
          sMesh.position.set(sx, sy, sz);

          const ringMesh = new THREE.Mesh(
            new THREE.RingGeometry(0.2, 0.32, 16),
            new THREE.MeshBasicMaterial({ color: 0xff6520, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
          );
          ringMesh.rotation.x = Math.PI / 2;
          ringMesh.position.set(sx, sy, sz);

          this.seismicGroup.add(sMesh);
          this.seismicGroup.add(ringMesh);

          this.seismicEvents.push({
            sMesh,
            ringMesh,
            age: 0,
            maxAge: 0.75 + Math.random() * 0.45
          });
        }
      }

      for (let i = this.seismicEvents.length - 1; i >= 0; i--) {
        const ev = this.seismicEvents[i];
        ev.age += dt;
        const p = ev.age / ev.maxAge;
        if (p >= 1.0) {
          this.seismicGroup.remove(ev.sMesh);
          this.seismicGroup.remove(ev.ringMesh);
          ev.sMesh.geometry.dispose();
          ev.ringMesh.geometry.dispose();
          this.seismicEvents.splice(i, 1);
        } else {
          ev.ringMesh.scale.setScalar(1.0 + p * 7.5);
          ev.ringMesh.material.opacity = (1.0 - p) * 0.85;
          ev.sMesh.material.opacity = (1.0 - p);
        }
      }
    }

    render(dt = 0.016) {
      if (!this.renderer || !this.scene || !this.camera) return;

      // Handle Smooth Camera Lerp Transitions
      if (this.isCameraLerping && this.cameraLerpTargetPos && this.cameraLerpTargetLook) {
        this.camera.position.lerp(this.cameraLerpTargetPos, 0.08);
        if (this.controls) {
          this.controls.target.lerp(this.cameraLerpTargetLook, 0.08);
        }
        if (this.camera.position.distanceTo(this.cameraLerpTargetPos) < 0.1) {
          this.isCameraLerping = false;
        }
      }

      const moving = this.active() && !document.hidden;
      if (moving) {
        this.clock += Math.min(dt, 0.05);

        // Rotate magma chamber convection rings
        this.chamberMeshes.forEach(cg => {
          if (cg.userData.torus1) cg.userData.torus1.rotation.z += 0.018;
          if (cg.userData.torus2) cg.userData.torus2.rotation.x += 0.014;
        });

        // Advance 3D multiphase particles up the conduit
        if (this.particlePoints && this.particlesData) {
          const pos = this.particlePoints.geometry.attributes.position.array;
          const colors = this.particlePoints.geometry.attributes.color.array;
          const pR = this.reservoirs()[0] || { depthKm: 7.5, x: 0 };
          const coneH = this.profile.edifice.summitHeightKm || 2.4;
          const topY = coneH + 1.2;
          const botY = -pR.depthKm;
          const fragY = -(this.profile.fragmentationDepthKm ?? 0.8);
          const exsolY = -(this.profile.exsolutionDepthKm ?? 2.5);

          const speedMultiplier = 1.0 + (this.intensity / 100) * 2.8;

          for (let i = 0; i < this.particlesData.length; i++) {
            const p = this.particlesData[i];
            p.t += dt * p.speed * speedMultiplier;
            if (p.t >= 1.0) p.t = 0;

            const curY = botY + (topY - botY) * p.t;
            pos[i * 3 + 1] = curY;

            if (curY >= coneH) {
              // Supersonic Jet / Atmospheric Plume Expansion above Crater Rim
              const jetT = (curY - coneH) / 1.2;
              pos[i * 3] = pR.x + Math.cos(p.angle) * (p.radial + jetT * 1.6);
              pos[i * 3 + 2] = Math.sin(p.angle) * (p.radial + jetT * 1.6);
              colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.85;
            } else if (curY >= fragY) {
              // Dingwell Brittle Fragmentation Zone: White-Hot Ash Shards
              colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.98; colors[i * 3 + 2] = 0.92;
            } else if (curY >= exsolY) {
              // Henry's Law Volatile Exsolution Level: Expanding Golden Gas Vesicles
              colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.82; colors[i * 3 + 2] = 0.25;
            } else {
              // Dense Laminar Silicate Melt: Deep Incandescent Orange
              colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.42; colors[i * 3 + 2] = 0.09;
            }
          }
          this.particlePoints.geometry.attributes.position.needsUpdate = true;
          this.particlePoints.geometry.attributes.color.needsUpdate = true;
        }

        // Live seismicity
        this.updateSeismicity(dt);
      }

      // Update camera controls
      if (this.controls) this.controls.update();

      // Render 3D Scene
      this.renderer.render(this.scene, this.camera);
    }

    onResize() {
      if (!this.renderer || !this.camera || !this.canvas) return;
      const w = this.canvas.clientWidth || 800;
      const h = this.canvas.clientHeight || 600;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    }

    initEvents() {
      const canvas = this.canvas;

      window.addEventListener('resize', () => this.onResize());

      // Raycasting for Annotation Clicks and Exploration Mode Painting
      const onPointerDown = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        this.mouse.x = ((clientX - rect.left) / canvas.clientWidth) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / canvas.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check Annotation Pins Click
        const pinIntersects = this.raycaster.intersectObjects(this.annotationGroup.children, true);
        if (pinIntersects.length > 0) {
          const hit = pinIntersects[0].object;
          if (hit.userData && hit.userData.annotation) {
            this.handleAnnotationClick(hit.userData.annotation);
            return;
          }
        }

        // Exploration Mode Painting
        if (this.mode !== 'exploration') return;
        const target = new this.THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.cutPlane, target)) {
          const wPos = { x: target.x, depth: -target.y };
          if (wPos.depth >= -0.5 && wPos.depth <= this.profile.maxDepthKm + 1) {
            this.pushUndo();
            this.isPainting = true;
            this.paintAt(wPos);
          }
        }
      };

      const onPointerMove = (e) => {
        if (!this.isPainting || this.mode !== 'exploration') return;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        this.mouse.x = ((clientX - rect.left) / canvas.clientWidth) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / canvas.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const target = new this.THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.cutPlane, target)) {
          const wPos = { x: target.x, depth: -target.y };
          this.paintAt(wPos);
        }
      };

      const onPointerUp = () => {
        if (this.isPainting) {
          this.isPainting = false;
          this.recalculateDiagnostics();
        }
      };

      canvas.addEventListener('mousedown', onPointerDown);
      canvas.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);

      canvas.addEventListener('touchstart', onPointerDown, { passive: false });
      canvas.addEventListener('touchmove', onPointerMove, { passive: false });
      window.addEventListener('touchend', onPointerUp);
    }

    handleAnnotationClick(ann) {
      if (!ann) return;
      const targetLook = new this.THREE.Vector3(ann.x || 0, -(ann.depthKm || 5), 0);
      const targetPos = new this.THREE.Vector3((ann.x || 0) + 5.5, -(ann.depthKm || 5) + 1.5, 10);
      this.isCameraLerping = true;
      this.cameraLerpTargetPos = targetPos;
      this.cameraLerpTargetLook = targetLook;

      const descEl = document.getElementById('cutaway-description');
      if (descEl) {
        descEl.textContent = `${ann.title}: ${ann.text}`;
      }

      const cardEl = document.getElementById('conduit-annotation-card');
      const cardTitle = document.getElementById('ann-card-title');
      const cardText = document.getElementById('ann-card-text');
      const cardDepth = document.getElementById('ann-card-depth');
      if (cardEl && cardTitle && cardText) {
        cardTitle.textContent = ann.title || 'Geological Feature';
        cardText.textContent = ann.text || '';
        const d = ann.depthKm || 0;
        const pMPa = Math.round((RHO_CRUST * GRAVITY * (d * 1000)) / 1e6);
        if (cardDepth) cardDepth.textContent = `Depth: ${d} km · Lithostatic Confining Stress: ${pMPa} MPa`;
        cardEl.style.display = 'block';
      }
    }

    paintAt(wPos) {
      const { x, depth } = wPos;
      const radius = this.brushSizeKm;

      if (this.activeTool === 'chamber') {
        let merged = false;
        for (const ch of this.customChambers) {
          const dist = Math.hypot(ch.x - x, ch.depthKm - depth);
          if (dist < ch.rxKm + radius) {
            delete ch.reservoirVolumeKm3;
            ch.rxKm = Math.min((this.profile.widthKm || 16) / 2, ch.rxKm + radius * 0.15);
            ch.ryKm = Math.min((this.profile.maxDepthKm || 12) / 2, ch.ryKm + radius * 0.12);
            ch.x = (ch.x * 7 + x) / 8;
            ch.depthKm = (ch.depthKm * 7 + depth) / 8;
            merged = true;
            break;
          }
        }
        if (!merged && depth > 1.2) {
          this.customChambers.push({
            x: x,
            depthKm: depth,
            rxKm: Math.max(0.8, radius),
            ryKm: Math.max(0.5, radius * 0.6),
            comp: 'Custom Magma',
            temp: '950 °C'
          });
        }
      } else if (this.activeTool === 'conduit') {
        this.customConduits.push({
          type: 'pipe',
          x1: x,
          y1: depth,
          x2: 0,
          y2: 0,
          widthM: Math.round(radius * 120)
        });
      } else if (this.activeTool === 'sill') {
        this.customConduits.push({
          sill: true,
          x1: x - radius * 1.8,
          y1: depth,
          x2: x + radius * 1.8,
          y2: depth,
          rxKm: radius * 1.8,
          ryKm: radius * 0.35,
          widthM: Math.round(radius * 80)
        });
      } else if (this.activeTool === 'aquifer') {
        this.customAquifers.push({
          x: x,
          depthKm: depth,
          rxKm: radius * 1.6,
          ryKm: radius * 0.5
        });
      } else if (this.activeTool === 'bedrock') {
        for (let i = this.customChambers.length - 1; i >= 0; i--) {
          const ch = this.customChambers[i];
          if (Math.hypot(ch.x - x, ch.depthKm - depth) < ch.rxKm + radius) {
            this.customChambers.splice(i, 1);
          }
        }
      }

      this.rebuild3DScene();
    }

    recalculateDiagnostics() {
      const chambers = this.reservoirs();
      const conduits = this.mode === 'exploration' ? this.customConduits : (this.profile.dikes || []);
      const aquifers = this.mode === 'exploration' ? this.customAquifers : (this.profile.aquifers || []);

      let totalVolumeKm3 = 0;
      let meltVolumeKm3 = 0;
      const erupted = this.profile.eruptedDRE?.value;
      const withdrawn = erupted ? (erupted[0] + erupted[1]) / 2 * this.stage().withdrawal : 0;
      let primaryDepthKm = 7.0;
      let maxRadiusKm = 0;

      for (const ch of chambers) {
        if (!ch) continue;
        const vol = ch.reservoirVolumeKm3 || ((4 / 3) * Math.PI * ch.rxKm * ch.rxKm * ch.ryKm);
        meltVolumeKm3 += Math.max(0, vol * (ch.meltFraction ?? 0.35) - (ch === chambers[0] ? withdrawn : 0));
        totalVolumeKm3 += vol;
        if (ch.rxKm > maxRadiusKm) {
          maxRadiusKm = ch.rxKm;
          primaryDepthKm = ch.depthKm;
        }
      }

      // Lithostatic Confining Stress (MPa) & Magma Buoyancy Overpressure
      const rhoMagma = MAGMA_DENSITIES[this.eruptionId] || MAGMA_DENSITIES.default;
      const deltaRho = RHO_CRUST - rhoMagma;
      const depthMeters = primaryDepthKm * 1000;
      const buoyancyMPa = deltaRho * GRAVITY * depthMeters / 1e6;
      const rockPressureMPa = RHO_CRUST * GRAVITY * depthMeters / 1e6;

      const surfaceVents = [];
      for (const c of conduits) {
        if (c.y2 <= 0.25 || c.y1 <= 0.25) {
          const ventX = c.y2 <= 0.25 ? c.x2 : c.x1;
          const normalizedX = ventX / ((this.profile.widthKm || 16) / 2);
          surfaceVents.push({ xKm: ventX, normalizedX: Math.max(-1, Math.min(1, normalizedX)) });
        }
      }

      let hasSteamInteraction = false;
      for (const aq of aquifers) {
        for (const c of conduits) {
          const midX = (c.x1 + c.x2) / 2;
          const midY = (c.y1 + c.y2) / 2;
          if (Math.hypot(midX - aq.x, midY - aq.depthKm) < aq.rxKm + 0.5) {
            hasSteamInteraction = true;
            break;
          }
        }
      }

      // Physical conduit dynamics
      const conduitRadiusM = 15;
      const conduitArea = Math.PI * conduitRadiusM * conduitRadiusM;
      const ascentSpeed = this.active() ? (1.5 + (this.intensity / 100) * 8.5) : 0;
      const massFluxTps = this.active() ? Math.round((rhoMagma * conduitArea * ascentSpeed) / 1000) : 0;
      const exitVel = this.active() ? Math.round(ascentSpeed * (12 + (this.intensity / 100) * 32)) : 0;
      const vesicularity = this.active() ? Math.min(78, Math.round(38 + (this.intensity / 100) * 40)) : 0;

      const diagnostics = {
        primaryDepthKm: Number(primaryDepthKm.toFixed(1)),
        totalVolumeKm3: Number(totalVolumeKm3.toFixed(1)),
        rockPressureMPa: Number(rockPressureMPa.toFixed(1)),
        buoyancyMPa: Number(buoyancyMPa.toFixed(1)),
        meltVolumeKm3: Number(meltVolumeKm3.toFixed(1)),
        eruptedDRE: this.profile.eruptedDRE?.value,
        mode: this.mode,
        ventCount: surfaceVents.length,
        surfaceVents: surfaceVents,
        hasSteamInteraction: hasSteamInteraction,
        massFluxTps: massFluxTps,
        exitVel: exitVel,
        vesicularity: vesicularity
      };

      this.updateDescription();
      if (this.onDiagnosticsChange) this.onDiagnosticsChange(diagnostics);
      if (this.onVentChange && surfaceVents.length > 0) this.onVentChange(surfaceVents);

      return diagnostics;
    }

    updateDescription() {
      if (!this.profile) return;
      const description = document.getElementById('cutaway-description');
      if (description) {
        description.textContent = `${this.profile.name}. ${this.stage().label}. Depth below ${this.profile.section.reference}. 3D Geological Block Diagram showing lithospheric stratigraphy, Transcrustal Magmatic System (TCMS) storage, and Poiseuille conduit fluid dynamics.`;
      }
      const notes = document.getElementById('cutaway-notes');
      if (notes && notes.dataset.preset !== this.eruptionId) {
        notes.dataset.preset = this.eruptionId;
        notes.replaceChildren();
        const add = (title, body, src, confidence) => {
          const details = document.createElement('details'), summary = document.createElement('summary'), text = document.createElement('p');
          summary.textContent = `${title} · ${confidence}`; text.textContent = body;
          details.append(summary, text);
          const source = this.profile.sources ? this.profile.sources[src] : null;
          if (source?.url) { const link = document.createElement('a'); link.href = source.url; link.textContent = source.title; details.append(link); }
          notes.append(details);
        };
        (this.profile.annotations || []).forEach((n, i) => add(`${i + 1}. ${n.title}`, n.text, n.src, n.confidence));
        const titles = { composition: 'Composition', temperatureC: 'Temperature (°C)', depthRangeKm: 'Source storage depth (km)', meltFraction: 'Melt fraction (%)', reservoirVolumeKm3: 'Reservoir volume (km³)' };
        this.reservoirs().forEach(r => {
          if (r.evidence) {
            Object.entries(r.evidence).forEach(([key, e]) => {
              const values = Array.isArray(e.value) ? Array.from(e.value) : [e.value];
              const display = values.map(v => key === 'meltFraction' ? Math.round(v * 100) : v);
              add(`${r.comp}: ${titles[key] || key}`, `${[...new Set(display)].join('–')}`, e.src, e.confidence);
            });
          }
        });
        add('Rock layers', (this.profile.layers || []).map(l => l.name).join('; '), 'model', 'illustrative');
        add('Erupted DRE', this.profile.eruptedDRE?.value ? this.profile.eruptedDRE.value.join('–') + ' km³ (independent deposit estimate)' : 'Unavailable; no supported DRE entered.', this.profile.eruptedDRE?.src, this.profile.eruptedDRE?.confidence);
      }
    }
  }

  window.VolcanoConduitEngine = VolcanoConduitEngine;
  window.HISTORICAL_CONDUITS = HISTORICAL_CONDUITS;
})();
