/* volcano-conduit.js — Subsurface Magma Conduit & Plumbing Cross-Section
   Scientifically grounded geological cutaways for historical presets and
   interactive "paint-your-own" subsurface plumbing in exploration mode. */

(function () {
  'use strict';

  // Physical constants for crustal geomechanics
  const RHO_CRUST = 2700; // kg/m^3 (average upper crustal density)
  const RHO_MAGMA = 2450; // kg/m^3 (dacitic/rhyolitic melt with dissolved gas)
  const GRAVITY = 9.81;   // m/s^2

  // Historical conduit profiles for the 8 presets
  const HISTORICAL_CONDUITS = {
    vesuvius79: {
      name: 'Mt Vesuvius — 79 AD',
      peakHeightKm: 1.3,
      maxDepthKm: 12.0,
      widthKm: 16.0,
      layers: [
        { topKm: 0, bottomKm: 2.0, name: 'Quaternary Volcanic Tuffs & Sediments', color: '#3d2a22', pattern: 'dots' },
        { topKm: 2.0, bottomKm: 8.0, name: 'Mesozoic Carbonate Platform (Limestone/Dolomite)', color: '#4a4440', pattern: 'blocks' },
        { topKm: 8.0, bottomKm: 12.0, name: 'Hercynian Metamorphic Crystalline Basement', color: '#2b232c', pattern: 'slanted' }
      ],
      chamber: { x: 0, depthKm: 7.5, rxKm: 2.3, ryKm: 1.2, comp: 'Phonolite-Tephrite', temp: '900 °C' },
      conduits: [
        { type: 'pipe', x1: 0, y1: 6.3, x2: 0, y2: 0, widthM: 55 }
      ],
      sills: [],
      aquifers: [
        { x: 0, depthKm: 1.8, rxKm: 3.0, ryKm: 0.4 }
      ],
      exsolutionDepthKm: 2.5,
      annotations: [
        { x: 0, depthKm: 7.5, title: 'Phonolitic Magma Chamber', text: '7–8 km depth in Mesozoic carbonate rocks. Magma assimilated limestone, enriching volatiles.' },
        { x: 0, depthKm: 2.5, title: 'Exsolution & Fragmentation Zone', text: 'Dissolved H₂O & CO₂ boil out of solution into supersonic pumice froth.' }
      ]
    },

    tambora1815: {
      name: 'Mount Tambora — 1815',
      peakHeightKm: 4.3,
      maxDepthKm: 12.0,
      widthKm: 20.0,
      layers: [
        { topKm: 0, bottomKm: 3.0, name: 'Sunda Arc Volcanic Strata & Clastics', color: '#3c2b24', pattern: 'dots' },
        { topKm: 3.0, bottomKm: 12.0, name: 'Diorite-Granodiorite Arc Basement', color: '#332f38', pattern: 'blocks' }
      ],
      chamber: { x: 0, depthKm: 5.2, rxKm: 4.0, ryKm: 1.8, comp: 'Trachydacite', temp: '980 °C' },
      conduits: [
        { type: 'pipe', x1: 0, y1: 3.4, x2: 0, y2: 0, widthM: 110 }
      ],
      sills: [],
      ringFaults: [
        { x: -3.0, y1: 0, y2: 3.5 },
        { x: 3.0, y1: 0, y2: 3.5 }
      ],
      aquifers: [],
      exsolutionDepthKm: 2.8,
      calderaCollapse: true,
      annotations: [
        { x: 0, depthKm: 5.2, title: 'High-Level Trachydacite Reservoir', text: 'Massive 4–6 km chamber with >40 km³ magma evacuated during the climax.' },
        { x: -3.0, depthKm: 2.0, title: 'Caldera Ring Faults', text: 'Piston collapse of the roof block dropped the summit by 1,400 m, forming a 6 km caldera.' }
      ]
    },

    krakatoa1883: {
      name: 'Krakatoa — 1883',
      peakHeightKm: 0.8,
      maxDepthKm: 12.0,
      widthKm: 16.0,
      waterLevelKm: 0.05,
      layers: [
        { topKm: 0, bottomKm: 2.5, name: 'Sunda Strait Graben Marine Sediments', color: '#2a353c', pattern: 'dots' },
        { topKm: 2.5, bottomKm: 12.0, name: 'Tectonized Basement Crust', color: '#352e35', pattern: 'blocks' }
      ],
      chamber: { x: 0, depthKm: 4.2, rxKm: 3.2, ryKm: 1.5, comp: 'Dacite', temp: '900 °C' },
      conduits: [
        { type: 'pipe', x1: 0, y1: 2.7, x2: 0, y2: 0, widthM: 70 },
        { type: 'pipe', x1: 0, y1: 2.7, x2: -1.2, y2: 0, widthM: 45 },
        { type: 'pipe', x1: 0, y1: 2.7, x2: 1.0, y2: 0, widthM: 40 }
      ],
      sills: [],
      marineIngress: { x: -0.6, depthKm: 1.3 },
      aquifers: [
        { x: 0, depthKm: 0.5, rxKm: 5.0, ryKm: 0.5 }
      ],
      exsolutionDepthKm: 2.2,
      calderaCollapse: true,
      annotations: [
        { x: 0, depthKm: 4.2, title: 'Shallow Dacite Chamber', text: '3–5 km deep chamber under marine Sunda Strait.' },
        { x: -0.6, depthKm: 1.3, title: 'Seawater Ingress Zone', text: 'Seawater penetrated fractured conduits, triggering supersonic steam cataclysms.' }
      ]
    },

    sthelenr1980: {
      name: 'Mount St. Helens — 1980',
      peakHeightKm: 2.95,
      maxDepthKm: 12.0,
      widthKm: 16.0,
      layers: [
        { topKm: 0, bottomKm: 3.0, name: 'Tertiary Volcanic & Volcaniclastic Strata', color: '#382f28', pattern: 'dots' },
        { topKm: 3.0, bottomKm: 12.0, name: 'Spirit Lake Granodiorite Pluton', color: '#3b3542', pattern: 'blocks' }
      ],
      chamber: { x: 0, depthKm: 8.0, rxKm: 2.2, ryKm: 1.4, comp: 'Dacite', temp: '880 °C' },
      conduits: [
        { type: 'pipe', x1: 0, y1: 6.6, x2: 0, y2: 2.4, widthM: 50 },
        { type: 'pipe', x1: 0, y1: 2.4, x2: -1.6, y2: 1.2, widthM: 65 }
      ],
      cryptodome: { x: -1.6, depthKm: 1.2, rxKm: 1.1, ryKm: 0.7 },
      sills: [],
      aquifers: [],
      exsolutionDepthKm: 2.0,
      annotations: [
        { x: 0, depthKm: 8.0, title: 'Deep Dacite Reservoir', text: 'Primary magma chamber at 7–9 km depth feeding shallow ascent.' },
        { x: -1.6, depthKm: 1.2, title: 'North-Flank Cryptodome', text: 'Pressurized shallow intrusion unroofed by landslide to produce the lateral blast.' }
      ]
    },

    pinatubo1991: {
      name: 'Mount Pinatubo — 1991',
      peakHeightKm: 1.74,
      maxDepthKm: 14.0,
      widthKm: 16.0,
      layers: [
        { topKm: 0, bottomKm: 3.5, name: 'Andesite-Dacite Pyroclastic Apron', color: '#362f27', pattern: 'dots' },
        { topKm: 3.5, bottomKm: 14.0, name: 'Zambales Ophiolite (Gabbro/Basalt/Serpentinite)', color: '#2c3632', pattern: 'blocks' }
      ],
      chamber: { x: 0, depthKm: 6.5, rxKm: 2.8, ryKm: 1.5, comp: 'Dacite', temp: '790 °C' },
      deepBasaltChamber: { x: 0, depthKm: 12.0, rxKm: 3.2, ryKm: 1.2, comp: 'Basaltic Recharge', temp: '1150 °C' },
      conduits: [
        { type: 'pipe', x1: 0, y1: 5.0, x2: 0, y2: 0, widthM: 80 },
        { type: 'pipe', x1: 0, y1: 10.8, x2: 0, y2: 8.0, widthM: 60 }
      ],
      sills: [],
      aquifers: [],
      exsolutionDepthKm: 3.0,
      annotations: [
        { x: 0, depthKm: 6.5, title: 'Upper Dacite Chamber', text: 'Volatile-saturated dacite at 6–8 km depth.' },
        { x: 0, depthKm: 12.0, title: 'Deep Basaltic Recharge', text: 'Hot basalt from >12 km injected into dacite, triggering explosive convective mixing.' }
      ]
    },

    eyja2010: {
      name: 'Eyjafjallajökull — 2010',
      peakHeightKm: 1.66,
      maxDepthKm: 12.0,
      widthKm: 16.0,
      glacierThicknessKm: 0.2,
      layers: [
        { topKm: 0, bottomKm: 0.2, name: 'Glacial Ice Cap (200 m)', color: '#4ba7c2', pattern: 'ice' },
        { topKm: 0.2, bottomKm: 5.0, name: 'Upper Basalt Lavas & Hyaloclastites', color: '#333339', pattern: 'dots' },
        { topKm: 5.0, bottomKm: 12.0, name: 'Lower Oceanic Crust (Sheeted Dikes/Gabbro)', color: '#272c2f', pattern: 'blocks' }
      ],
      chamber: { x: 0, depthKm: 4.8, rxKm: 3.0, ryKm: 0.8, comp: 'Basaltic-Benmoreite Sill Complex', temp: '1020 °C' },
      conduits: [
        { type: 'pipe', x1: 0.6, y1: 4.0, x2: 0, y2: 0.2, widthM: 45 }
      ],
      sills: [
        { x: -1.2, depthKm: 5.2, rxKm: 2.2, ryKm: 0.3 },
        { x: 1.5, depthKm: 4.2, rxKm: 2.0, ryKm: 0.3 }
      ],
      aquifers: [
        { x: 0, depthKm: 0.2, rxKm: 1.5, ryKm: 0.2 }
      ],
      exsolutionDepthKm: 1.5,
      annotations: [
        { x: 0, depthKm: 0.1, title: '200 m Glacial Ice Cap', text: 'Meltwater flooded into the vent, shattering magma into ultrafine glass particles.' },
        { x: 0, depthKm: 4.8, title: 'Mid-Crustal Sill Complex', text: 'Layered horizontal sills at 4–6 km depth fed by deep mantle conduit.' }
      ]
    },

    maunaloa2022: {
      name: 'Mauna Loa — 2022',
      peakHeightKm: 4.17,
      maxDepthKm: 14.0,
      widthKm: 28.0,
      layers: [
        { topKm: 0, bottomKm: 5.0, name: 'Subaerial Basaltic Shield Lavas', color: '#382e27', pattern: 'dots' },
        { topKm: 5.0, bottomKm: 10.0, name: 'Oceanic Crust & Volcanic Edifice Base', color: '#2e2d36', pattern: 'blocks' },
        { topKm: 10.0, bottomKm: 14.0, name: 'Mantle Lithosphere Overlying Hotspot Plume', color: '#3f1a14', pattern: 'slanted' }
      ],
      chamber: { x: 0, depthKm: 3.5, rxKm: 2.5, ryKm: 1.2, comp: 'Tholeiitic Basalt', temp: '1160 °C' },
      conduits: [
        { type: 'pipe', x1: 0, y1: 14.0, x2: 0, y2: 3.5, widthM: 80 },
        { type: 'pipe', x1: 0, y1: 2.3, x2: 0, y2: 0, widthM: 40 },
        // Northeast Rift Zone lateral blade dike
        { type: 'pipe', x1: 0, y1: 2.5, x2: 6.5, y2: 1.5, widthM: 50 },
        { type: 'pipe', x1: 6.5, y1: 1.5, x2: 6.8, y2: 0, widthM: 45 }
      ],
      sills: [],
      aquifers: [],
      exsolutionDepthKm: 1.0,
      annotations: [
        { x: 0, depthKm: 3.5, title: 'Summit Caldera Reservoir', text: 'Shallow 3–4 km reservoir beneath Mokuʻāweoweo fed by the Hawaiian hotspot plume.' },
        { x: 6.5, depthKm: 1.2, title: 'Northeast Rift Zone Lateral Dike', text: 'Blade dike propagated 15+ km laterally to feed Fissure 3 fountains.' }
      ]
    },

    yellowstone: {
      name: 'Yellowstone Supervolcano',
      peakHeightKm: 2.8,
      maxDepthKm: 16.0,
      widthKm: 36.0,
      layers: [
        { topKm: 0, bottomKm: 4.0, name: 'Rhyolite Caldera-Fill & Geothermal Aquifers', color: '#3d332c', pattern: 'dots' },
        { topKm: 4.0, bottomKm: 16.0, name: 'Continental Granitic Crust', color: '#3b3442', pattern: 'blocks' }
      ],
      chamber: { x: 0, depthKm: 8.5, rxKm: 14.0, ryKm: 3.8, comp: 'Rhyolite Partial Melt', temp: '820 °C' },
      deepBasaltChamber: { x: 0, depthKm: 18.0, rxKm: 16.0, ryKm: 4.0, comp: 'Lower Basaltic Mush', temp: '1100 °C' },
      conduits: [
        { type: 'pipe', x1: -6.0, y1: 4.7, x2: -6.0, y2: 0, widthM: 70 },
        { type: 'pipe', x1: 6.0, y1: 4.7, x2: 6.0, y2: 0, widthM: 70 },
        { type: 'pipe', x1: 0, y1: 4.7, x2: 0, y2: 0, widthM: 50 }
      ],
      sills: [],
      aquifers: [
        { x: -5.0, depthKm: 1.5, rxKm: 3.0, ryKm: 0.8 },
        { x: 5.0, depthKm: 1.5, rxKm: 3.0, ryKm: 0.8 }
      ],
      exsolutionDepthKm: 3.5,
      annotations: [
        { x: 0, depthKm: 8.5, title: 'Giant Upper Rhyolite Reservoir', text: 'Immense 5–14 km deep partial-melt reservoir holding ~10,000 km³ of silicic magma.' },
        { x: -6.0, depthKm: 2.2, title: 'Caldera Ring Fractures', text: 'Channel hydrothermal fluid to surface geysers and perimeter resurgent domes.' }
      ]
    }
  };

  /**
   * VolcanoConduitEngine
   * Manages rendering, interaction, historical baseline loads, and exploration painting.
   */
  class VolcanoConduitEngine {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.mode = options.mode || 'historical';
      this.eruptionId = options.eruptionId || 'vesuvius79';
      this.timeline = 0;
      this.intensity = 0;
      this.onVentChange = options.onVentChange || null;
      this.onDiagnosticsChange = options.onDiagnosticsChange || null;

      // Painting state in exploration mode
      this.activeTool = 'chamber'; // 'chamber', 'conduit', 'sill', 'aquifer', 'bedrock'
      this.brushSizeKm = 0.6;      // radius in km
      this.isPainting = false;
      this.lastPaintPos = null;

      // User custom plumbing elements (when in exploration mode)
      this.customChambers = [];
      this.customConduits = [];
      this.customAquifers = [];
      this.undoStack = [];

      // Particles for animated magma ascent & gas exsolution bubbles
      this.bubbles = [];
      this.magmaPulses = [];
      this.initParticles();

      this.initEvents();
      this.loadBaseline(this.eruptionId);
    }

    initParticles() {
      this.bubbles = [];
      for (let i = 0; i < 40; i++) {
        this.bubbles.push({
          x: (Math.random() - 0.5) * 0.4,
          depthKm: 1.0 + Math.random() * 4.0,
          speed: 0.4 + Math.random() * 0.8,
          radius: 1.5 + Math.random() * 3.0,
          opacity: 0.3 + Math.random() * 0.5
        });
      }

      this.magmaPulses = [];
      for (let i = 0; i < 25; i++) {
        this.magmaPulses.push({
          conduitIndex: 0,
          t: Math.random(),
          speed: 0.15 + Math.random() * 0.25,
          size: 3 + Math.random() * 4
        });
      }
    }

    loadBaseline(id) {
      this.eruptionId = id;
      const base = HISTORICAL_CONDUITS[id] || HISTORICAL_CONDUITS.vesuvius79;
      this.profile = JSON.parse(JSON.stringify(base));

      if (this.mode === 'exploration') {
        // Clone historical as starting point for user painting
        this.customChambers = [JSON.parse(JSON.stringify(this.profile.chamber))];
        if (this.profile.deepBasaltChamber) {
          this.customChambers.push(JSON.parse(JSON.stringify(this.profile.deepBasaltChamber)));
        }
        this.customConduits = JSON.parse(JSON.stringify(this.profile.conduits || []));
        this.customAquifers = JSON.parse(JSON.stringify(this.profile.aquifers || []));
        this.undoStack = [];
      }

      this.recalculateDiagnostics();
    }

    setMode(mode) {
      if (this.mode === mode) return;
      this.mode = mode;
      if (mode === 'exploration') {
        // Transition to exploration: retain current geometry as editable custom layers
        this.customChambers = [JSON.parse(JSON.stringify(this.profile.chamber))];
        if (this.profile.deepBasaltChamber) {
          this.customChambers.push(JSON.parse(JSON.stringify(this.profile.deepBasaltChamber)));
        }
        this.customConduits = JSON.parse(JSON.stringify(this.profile.conduits || []));
        this.customAquifers = JSON.parse(JSON.stringify(this.profile.aquifers || []));
      }
      this.recalculateDiagnostics();
    }

    setTimeline(tl, intensity = null) {
      this.timeline = Math.max(0, Math.min(1, tl));
      if (intensity !== null) this.intensity = intensity;
    }

    setTool(tool) {
      this.activeTool = tool;
    }

    setBrushSize(sizeKm) {
      this.brushSizeKm = sizeKm;
    }

    undo() {
      if (this.undoStack.length === 0) return;
      const state = this.undoStack.pop();
      this.customChambers = state.chambers;
      this.customConduits = state.conduits;
      this.customAquifers = state.aquifers;
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
      this.customChambers = [JSON.parse(JSON.stringify(base.chamber))];
      if (base.deepBasaltChamber) {
        this.customChambers.push(JSON.parse(JSON.stringify(base.deepBasaltChamber)));
      }
      this.customConduits = JSON.parse(JSON.stringify(base.conduits || []));
      this.customAquifers = JSON.parse(JSON.stringify(base.aquifers || []));
      this.recalculateDiagnostics();
    }

    /**
     * Coordinate Conversion:
     * Cross-section world coordinates:
     * x: -widthKm/2 to +widthKm/2 (km)
     * depth: 0 km (surface) down to maxDepthKm (e.g. 12 or 14 km)
     */
    worldToScreen(xKm, depthKm) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const marginL = 60;
      const marginR = 30;
      const marginT = 45;
      const marginB = 30;
      const plotW = w - marginL - marginR;
      const plotH = h - marginT - marginB;

      const profileW = this.profile.widthKm;
      const profileD = this.profile.maxDepthKm;

      const sx = marginL + ((xKm + profileW / 2) / profileW) * plotW;
      const sy = marginT + (depthKm / profileD) * plotH;
      return { x: sx, y: sy };
    }

    screenToWorld(sx, sy) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const marginL = 60;
      const marginR = 30;
      const marginT = 45;
      const marginB = 30;
      const plotW = w - marginL - marginR;
      const plotH = h - marginT - marginB;

      const profileW = this.profile.widthKm;
      const profileD = this.profile.maxDepthKm;

      const xKm = ((sx - marginL) / plotW) * profileW - profileW / 2;
      const depthKm = ((sy - marginT) / plotH) * profileD;
      return { x: xKm, depth: depthKm };
    }

    initEvents() {
      const canvas = this.canvas;
      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const dpr = window.devicePixelRatio || 1;
        return {
          sx: (clientX - rect.left) * (canvas.width / rect.width),
          sy: (clientY - rect.top) * (canvas.height / rect.height)
        };
      };

      const startPaint = (e) => {
        if (this.mode !== 'exploration') return;
        e.preventDefault();
        const { sx, sy } = getPos(e);
        const wPos = this.screenToWorld(sx, sy);
        if (wPos.depth < -0.5 || wPos.depth > this.profile.maxDepthKm + 1) return;
        this.pushUndo();
        this.isPainting = true;
        this.lastPaintPos = wPos;
        this.paintAt(wPos);
      };

      const movePaint = (e) => {
        if (!this.isPainting || this.mode !== 'exploration') return;
        e.preventDefault();
        const { sx, sy } = getPos(e);
        const wPos = this.screenToWorld(sx, sy);
        this.paintAt(wPos);
        this.lastPaintPos = wPos;
      };

      const endPaint = () => {
        if (this.isPainting) {
          this.isPainting = false;
          this.lastPaintPos = null;
          this.recalculateDiagnostics();
        }
      };

      canvas.addEventListener('mousedown', startPaint);
      canvas.addEventListener('mousemove', movePaint);
      window.addEventListener('mouseup', endPaint);

      canvas.addEventListener('touchstart', startPaint, { passive: false });
      canvas.addEventListener('touchmove', movePaint, { passive: false });
      window.addEventListener('touchend', endPaint);
    }

    paintAt(wPos) {
      const { x, depth } = wPos;
      const radius = this.brushSizeKm;

      if (this.activeTool === 'chamber') {
        // Find existing chamber near click to enlarge, or add new chamber
        let merged = false;
        for (const ch of this.customChambers) {
          const dx = ch.x - x;
          const dy = ch.depthKm - depth;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < ch.rxKm + radius) {
            ch.rxKm = Math.min(25.0, ch.rxKm + radius * 0.15);
            ch.ryKm = Math.min(10.0, ch.ryKm + radius * 0.12);
            ch.x = (ch.x * 7 + x) / 8;
            ch.depthKm = (ch.depthKm * 7 + depth) / 8;
            merged = true;
            break;
          }
        }
        if (!merged && depth > 1.5) {
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
        // Draw vertical / inclined feeder pipe segment
        if (this.lastPaintPos) {
          this.customConduits.push({
            type: 'pipe',
            x1: this.lastPaintPos.x,
            y1: this.lastPaintPos.depth,
            x2: x,
            y2: depth,
            widthM: Math.round(radius * 120)
          });
        }
      } else if (this.activeTool === 'sill') {
        // Horizontal intrusion blade
        this.customConduits.push({
          type: 'pipe',
          x1: x - radius * 1.8,
          y1: depth,
          x2: x + radius * 1.8,
          y2: depth,
          widthM: Math.round(radius * 80)
        });
      } else if (this.activeTool === 'aquifer') {
        // Groundwater hydrothermal reservoir
        this.customAquifers.push({
          x: x,
          depthKm: depth,
          rxKm: radius * 1.6,
          ryKm: radius * 0.5
        });
      } else if (this.activeTool === 'bedrock') {
        // Eraser: shrink or remove chambers, conduits, aquifers within brush
        for (let i = this.customChambers.length - 1; i >= 0; i--) {
          const ch = this.customChambers[i];
          const dist = Math.hypot(ch.x - x, ch.depthKm - depth);
          if (dist < ch.rxKm + radius) {
            ch.rxKm -= radius * 0.3;
            ch.ryKm -= radius * 0.2;
            if (ch.rxKm < 0.3 || ch.ryKm < 0.2) this.customChambers.splice(i, 1);
          }
        }
        for (let i = this.customConduits.length - 1; i >= 0; i--) {
          const c = this.customConduits[i];
          const midX = (c.x1 + c.x2) / 2;
          const midY = (c.y1 + c.y2) / 2;
          if (Math.hypot(midX - x, midY - depth) < radius * 1.5) {
            this.customConduits.splice(i, 1);
          }
        }
        for (let i = this.customAquifers.length - 1; i >= 0; i--) {
          const aq = this.customAquifers[i];
          if (Math.hypot(aq.x - x, aq.depthKm - depth) < aq.rxKm + radius) {
            this.customAquifers.splice(i, 1);
          }
        }
      }
    }

    recalculateDiagnostics() {
      const chambers = this.mode === 'exploration' ? this.customChambers : [this.profile.chamber];
      const conduits = this.mode === 'exploration' ? this.customConduits : (this.profile.conduits || []);
      const aquifers = this.mode === 'exploration' ? this.customAquifers : (this.profile.aquifers || []);

      let totalVolumeKm3 = 0;
      let primaryDepthKm = 7.0;
      let maxRadiusKm = 0;

      for (const ch of chambers) {
        if (!ch) continue;
        // Oblate spheroid volume V = 4/3 * pi * a^2 * b
        const vol = (4 / 3) * Math.PI * ch.rxKm * ch.rxKm * ch.ryKm;
        totalVolumeKm3 += vol;
        if (ch.rxKm > maxRadiusKm) {
          maxRadiusKm = ch.rxKm;
          primaryDepthKm = ch.depthKm;
        }
      }

      // Lithostatic overpressure ΔP = (ρ_crust - ρ_magma) * g * depth
      const deltaRho = RHO_CRUST - RHO_MAGMA; // ~250 kg/m^3 buoyant density contrast
      const depthMeters = primaryDepthKm * 1000;
      const overpressureMPa = ((deltaRho * GRAVITY * depthMeters) / 1e6) + (totalVolumeKm3 > 20 ? 8 : 4);

      // Detect active surface vents (conduits reaching surface y <= 0.2 km)
      const surfaceVents = [];
      for (const c of conduits) {
        if (c.y2 <= 0.25 || c.y1 <= 0.25) {
          const ventX = c.y2 <= 0.25 ? c.x2 : c.x1;
          const normalizedX = ventX / (this.profile.widthKm / 2);
          surfaceVents.push({ xKm: ventX, normalizedX: Math.max(-1, Math.min(1, normalizedX)) });
        }
      }

      // Aquifer steam interaction
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

      const diagnostics = {
        primaryDepthKm: Number(primaryDepthKm.toFixed(1)),
        totalVolumeKm3: Number(totalVolumeKm3.toFixed(1)),
        overpressureMPa: Number(overpressureMPa.toFixed(1)),
        ventCount: surfaceVents.length,
        surfaceVents: surfaceVents,
        hasSteamInteraction: hasSteamInteraction
      };

      if (this.onDiagnosticsChange) this.onDiagnosticsChange(diagnostics);
      if (this.onVentChange && surfaceVents.length > 0) this.onVentChange(surfaceVents);

      return diagnostics;
    }

    render(dt = 0.016) {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      if (!w || !h) return;

      ctx.clearRect(0, 0, w, h);

      // 1. Draw Geological Crust Layers
      this.drawCrustLayers(ctx);

      // 2. Draw Marine Water / Glacial Ice Cap if applicable
      this.drawSurfaceOverburden(ctx);

      // 3. Draw Aquifers & Hydrothermal Zones
      this.drawAquifers(ctx);

      // 4. Draw Conduits & Sills
      this.drawConduits(ctx, dt);

      // 5. Draw Magma Reservoirs & Chambers
      this.drawChambers(ctx, dt);

      // 6. Draw Gas Exsolution Bubble Physics
      this.drawExsolutionBubbles(ctx, dt);

      // 7. Draw Special Historical Features (Cryptodome, Ring Faults)
      this.drawSpecialFeatures(ctx);

      // 8. Draw Depth Axis & Lithostatic Pressure Ruler
      this.drawDepthAxes(ctx);

      // 9. Draw Educational Annotations (Historical mode)
      if (this.mode === 'historical') {
        this.drawAnnotations(ctx);
      }
    }

    drawCrustLayers(ctx) {
      const layers = this.profile.layers || [];
      const profileW = this.profile.widthKm;

      for (const lyr of layers) {
        const p1 = this.worldToScreen(-profileW / 2, lyr.topKm);
        const p2 = this.worldToScreen(profileW / 2, lyr.bottomKm);
        const layerH = p2.y - p1.y;

        ctx.fillStyle = lyr.color;
        ctx.fillRect(p1.x, p1.y, p2.x - p1.x, layerH);

        // Subtle geological texture
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        if (lyr.pattern === 'dots') {
          for (let y = p1.y + 6; y < p2.y; y += 14) {
            ctx.beginPath();
            ctx.moveTo(p1.x, y);
            ctx.lineTo(p2.x, y);
            ctx.stroke();
          }
        } else if (lyr.pattern === 'blocks') {
          for (let y = p1.y + 10; y < p2.y; y += 18) {
            ctx.beginPath();
            ctx.moveTo(p1.x, y);
            ctx.lineTo(p2.x, y);
            ctx.stroke();
          }
        }
        ctx.restore();

        // Layer Name Label on right
        ctx.fillStyle = 'rgba(235, 205, 175, 0.45)';
        ctx.font = '10px "Space Grotesk", system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(lyr.name, p2.x - 8, p1.y + 15);
      }
    }

    drawSurfaceOverburden(ctx) {
      const profileW = this.profile.widthKm;

      // Seawater (Krakatoa)
      if (this.profile.waterLevelKm) {
        const pTop = this.worldToScreen(-profileW / 2, 0);
        const pBot = this.worldToScreen(profileW / 2, this.profile.waterLevelKm * 10);
        const grad = ctx.createLinearGradient(0, pTop.y, 0, pBot.y);
        grad.addColorStop(0, 'rgba(15, 60, 110, 0.7)');
        grad.addColorStop(1, 'rgba(10, 35, 70, 0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(pTop.x, pTop.y, pBot.x - pTop.x, pBot.y - pTop.y);

        ctx.fillStyle = '#60b8ff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🌊 Sunda Strait Seawater (~50 m depth)', pTop.x + 10, pTop.y + 16);
      }

      // Glacial Ice Cap (Eyjafjallajökull)
      if (this.profile.glacierThicknessKm) {
        const pTop = this.worldToScreen(-profileW / 2, 0);
        const pBot = this.worldToScreen(profileW / 2, this.profile.glacierThicknessKm);
        ctx.fillStyle = 'rgba(85, 185, 215, 0.65)';
        ctx.fillRect(pTop.x, pTop.y, pBot.x - pTop.x, pBot.y - pTop.y);

        ctx.fillStyle = '#d8f4ff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('❄️ Glacial Ice Cap (Gígjökull · 200 m ice thickness)', pTop.x + 10, pTop.y + 14);
      }
    }

    drawAquifers(ctx) {
      const aquifers = this.mode === 'exploration' ? this.customAquifers : (this.profile.aquifers || []);
      for (const aq of aquifers) {
        const center = this.worldToScreen(aq.x, aq.depthKm);
        const pRadius = this.worldToScreen(aq.x + aq.rxKm, aq.depthKm + aq.ryKm);
        const rx = Math.abs(pRadius.x - center.x);
        const ry = Math.abs(pRadius.y - center.y);

        const grad = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, rx);
        grad.addColorStop(0, 'rgba(50, 160, 220, 0.55)');
        grad.addColorStop(0.8, 'rgba(30, 120, 180, 0.35)');
        grad.addColorStop(1, 'rgba(20, 80, 140, 0.0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(100, 210, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    drawConduits(ctx, dt) {
      const conduits = this.mode === 'exploration' ? this.customConduits : (this.profile.conduits || []);

      for (const c of conduits) {
        const p1 = this.worldToScreen(c.x1, c.y1);
        const p2 = this.worldToScreen(c.x2, c.y2);
        const widthPx = Math.max(4, (c.widthM || 60) * 0.12);

        // Outer heated rock halo
        ctx.strokeStyle = 'rgba(255, 80, 20, 0.35)';
        ctx.lineWidth = widthPx + 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Molten magma core
        const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        grad.addColorStop(0, '#ff3b10');
        grad.addColorStop(0.5, '#ff8020');
        grad.addColorStop(1, '#ffc040');

        ctx.strokeStyle = grad;
        ctx.lineWidth = widthPx;
        ctx.stroke();

        // Animated ascending magma pulses
        const pulseCount = 3;
        const now = performance.now() * 0.001;
        for (let i = 0; i < pulseCount; i++) {
          const t = ((now * 0.6) + (i / pulseCount)) % 1.0;
          const px = p1.x + (p2.x - p1.x) * (1 - t);
          const py = p1.y + (p2.y - p1.y) * (1 - t);

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px, py, widthPx * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    drawChambers(ctx, dt) {
      const chambers = this.mode === 'exploration' ? this.customChambers : [this.profile.chamber];
      if (this.profile.deepBasaltChamber && this.mode !== 'exploration') {
        chambers.push(this.profile.deepBasaltChamber);
      }

      const now = performance.now() * 0.002;

      for (const ch of chambers) {
        if (!ch) continue;
        const center = this.worldToScreen(ch.x, ch.depthKm);
        const edge = this.worldToScreen(ch.x + ch.rxKm, ch.depthKm + ch.ryKm);
        const rx = Math.abs(edge.x - center.x);
        const ry = Math.abs(edge.y - center.y);

        // Breathing/pulsing magma reservoir
        const pulse = 1.0 + Math.sin(now * 1.5 + ch.depthKm) * 0.02;
        const prx = rx * pulse;
        const pry = ry * pulse;

        // Thermal contact aureole (metamorphosed baked wall rock)
        const aureoleGrad = ctx.createRadialGradient(center.x, center.y, prx * 0.6, center.x, center.y, prx * 1.3);
        aureoleGrad.addColorStop(0, 'rgba(255, 60, 10, 0.45)');
        aureoleGrad.addColorStop(0.7, 'rgba(180, 40, 10, 0.2)');
        aureoleGrad.addColorStop(1, 'rgba(100, 20, 5, 0)');

        ctx.fillStyle = aureoleGrad;
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, prx * 1.3, pry * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Molten Magma Reservoir Core
        const magmaGrad = ctx.createRadialGradient(center.x, center.y * 0.96, 0, center.x, center.y, prx);
        magmaGrad.addColorStop(0, '#fff4d0');
        magmaGrad.addColorStop(0.3, '#ffaa30');
        magmaGrad.addColorStop(0.75, '#e03a10');
        magmaGrad.addColorStop(1, '#8c1a05');

        ctx.fillStyle = magmaGrad;
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, prx, pry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffd880';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Convective circulation streaks
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 240, 200, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(center.x - prx * 0.35, center.y, prx * 0.2, pry * 0.45, 0.2, 0, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(center.x + prx * 0.35, center.y, prx * 0.2, pry * 0.45, -0.2, 0, Math.PI);
        ctx.stroke();
        ctx.restore();

        // Chamber Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px "Space Grotesk", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ch.comp || 'Magma Chamber', center.x, center.y - 2);

        ctx.fillStyle = 'rgba(255, 230, 200, 0.85)';
        ctx.font = '10px monospace';
        ctx.fillText(`${ch.depthKm} km depth · ${ch.temp || '950 °C'}`, center.x, center.y + 12);
      }
    }

    drawExsolutionBubbles(ctx, dt) {
      const exDepth = this.profile.exsolutionDepthKm || 2.5;
      const exPos = this.worldToScreen(0, exDepth);
      const profileW = this.profile.widthKm;

      // Exsolution dashed boundary line across the crust
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 200, 80, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      const pL = this.worldToScreen(-profileW / 2, exDepth);
      const pR = this.worldToScreen(profileW / 2, exDepth);
      ctx.moveTo(pL.x, exPos.y);
      ctx.lineTo(pR.x, exPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255, 215, 100, 0.7)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`— Gas Exsolution / Fragmentation Level (~${exDepth} km)`, pL.x + 8, exPos.y - 4);
      ctx.restore();

      // Animate bubbles rising above exsolution depth
      for (const b of this.bubbles) {
        b.depthKm -= b.speed * dt;
        if (b.depthKm < 0.1) {
          b.depthKm = exDepth + Math.random() * 0.5;
          b.x = (Math.random() - 0.5) * 0.35;
        }

        const bPos = this.worldToScreen(b.x, b.depthKm);
        const expansion = Math.max(1, (exDepth - b.depthKm) * 1.4);

        ctx.fillStyle = `rgba(255, 245, 220, ${b.opacity})`;
        ctx.beginPath();
        ctx.arc(bPos.x, bPos.y, b.radius * expansion, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawSpecialFeatures(ctx) {
      // 1. Mount St. Helens Cryptodome
      if (this.profile.cryptodome) {
        const cd = this.profile.cryptodome;
        const center = this.worldToScreen(cd.x, cd.depthKm);
        const edge = this.worldToScreen(cd.x + cd.rxKm, cd.depthKm + cd.ryKm);
        const rx = Math.abs(edge.x - center.x);
        const ry = Math.abs(edge.y - center.y);

        ctx.fillStyle = 'rgba(255, 120, 20, 0.9)';
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, rx, ry, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd880';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('North-Flank Cryptodome', center.x, center.y);
      }

      // 2. Tambora Ring Faults & Roof Collapse
      if (this.profile.ringFaults && this.timeline >= 0.55) {
        ctx.save();
        ctx.strokeStyle = '#ff3020';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);

        for (const rf of this.profile.ringFaults) {
          const p1 = this.worldToScreen(rf.x, rf.y1);
          const p2 = this.worldToScreen(rf.x, rf.y2);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        // Downward slip arrows
        const pMid = this.worldToScreen(0, 1.8);
        ctx.fillStyle = '#ff6040';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⬇ Piston Roof Block Subsidence ⬇', pMid.x, pMid.y);
        ctx.restore();
      }
    }

    drawDepthAxes(ctx) {
      const marginL = 60;
      const maxD = this.profile.maxDepthKm;

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;

      // Vertical depth line
      const topP = this.worldToScreen(-this.profile.widthKm / 2, 0);
      const botP = this.worldToScreen(-this.profile.widthKm / 2, maxD);
      ctx.beginPath();
      ctx.moveTo(marginL, topP.y);
      ctx.lineTo(marginL, botP.y);
      ctx.stroke();

      // Tick marks every 2 km with Lithostatic Pressure (P = ρ g z)
      ctx.fillStyle = '#f0c080';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';

      for (let d = 0; d <= maxD; d += 2) {
        const p = this.worldToScreen(-this.profile.widthKm / 2, d);
        ctx.beginPath();
        ctx.moveTo(marginL - 6, p.y);
        ctx.lineTo(marginL, p.y);
        ctx.stroke();

        const lithoP = Math.round((RHO_CRUST * GRAVITY * (d * 1000)) / 1e6); // MPa
        ctx.fillText(`${d} km`, marginL - 10, p.y + 3);

        ctx.fillStyle = 'rgba(200, 160, 120, 0.45)';
        ctx.fillText(`${lithoP} MPa`, marginL - 10, p.y + 13);
        ctx.fillStyle = '#f0c080';
      }

      ctx.restore();
    }

    drawAnnotations(ctx) {
      const annotations = this.profile.annotations || [];
      for (const note of annotations) {
        const p = this.worldToScreen(note.x, note.depthKm);

        // Pin icon
        ctx.fillStyle = '#ff8020';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Tooltip badge
        const badgeW = 210;
        const badgeX = p.x > this.canvas.width / 2 ? p.x - badgeW - 12 : p.x + 12;
        const badgeY = p.y - 18;

        ctx.fillStyle = 'rgba(10, 4, 2, 0.82)';
        ctx.strokeStyle = 'rgba(255, 120, 40, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, 44, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffb060';
        ctx.font = 'bold 10px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(note.title, badgeX + 8, badgeY + 14);

        ctx.fillStyle = 'rgba(240, 220, 195, 0.8)';
        ctx.font = '9px system-ui, sans-serif';
        ctx.fillText(note.text.slice(0, 42) + '...', badgeX + 8, badgeY + 28);
      }
    }
  }

  // Export to window
  window.VolcanoConduitEngine = VolcanoConduitEngine;
  window.HISTORICAL_CONDUITS = HISTORICAL_CONDUITS;
})();
