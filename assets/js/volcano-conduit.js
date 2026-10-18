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
  const HISTORICAL_CONDUITS = Object.fromEntries(Object.entries(window.VolcanoHistory).map(([id, record]) => [id, record.conduit]));

  /**
   * VolcanoConduitEngine
   * Manages rendering, interaction, historical baseline loads, and exploration painting.
   */
  class VolcanoConduitEngine {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.surface = window.SimKit.canvas2d(canvas);
      this.ctx = this.surface.ctx;
      this.trueScale = false;
      this.clock = 0;
      this.keyboardPos = {x:0,depth:5};
      this.textureCache = new Map();
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

      canvas.addEventListener('click', e => {
        if (this.mode !== 'historical') return;
        const rect=canvas.getBoundingClientRect();
        const i=this.profile.annotations.findIndex(n=>{const p=this.worldToScreen(n.x,n.depthKm);return Math.hypot(p.x-e.clientX+rect.left,p.y-e.clientY+rect.top)<18;});
        const note=document.querySelectorAll('#cutaway-notes details')[i];
        if(note){note.open=true;note.querySelector('summary').focus();}
      });
      canvas.addEventListener('keydown', e=>{
        if(this.mode!=='exploration') return;
        const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
        if(moves[e.key]) {
          e.preventDefault();this.lastPaintPos={...this.keyboardPos};
          this.keyboardPos.x=Math.max(-this.profile.widthKm/2,Math.min(this.profile.widthKm/2,this.keyboardPos.x+moves[e.key][0]*this.brushSizeKm));
          this.keyboardPos.depth=Math.max(0,Math.min(this.profile.maxDepthKm,this.keyboardPos.depth+moves[e.key][1]*this.brushSizeKm));
        } else if(e.code==='Space') {e.preventDefault();this.pushUndo();this.paintAt(this.keyboardPos);this.recalculateDiagnostics();}
        else return;
        this.render(0);
      });
      this.initEvents();
      this.loadBaseline(this.eruptionId);
    }

    loadBaseline(id) {
      this.eruptionId = id;
      const base = HISTORICAL_CONDUITS[id] || HISTORICAL_CONDUITS.vesuvius79;
      this.profile = JSON.parse(JSON.stringify(base));

      if (this.mode === 'exploration') {
        // Clone historical as starting point for user painting
        this.customChambers = structuredClone(this.profile.reservoirs);
        this.customConduits = structuredClone([...this.profile.dikes, ...this.profile.sills.map(s=>({x1:s.x-s.rxKm,y1:s.depthKm,x2:s.x+s.rxKm,y2:s.depthKm,widthM:50,sill:true}))]);
        this.customAquifers = JSON.parse(JSON.stringify(this.profile.aquifers || []));
        this.undoStack = [];
      }

      this.updateDescription();
      this.recalculateDiagnostics();
    }

    setMode(mode) {
      if (this.mode === mode) return;
      this.mode = mode;
      if (mode === 'exploration') {
        // Transition to exploration: retain current geometry as editable custom layers
        this.customChambers = structuredClone(this.profile.reservoirs);
        this.customConduits = structuredClone([...this.profile.dikes, ...this.profile.sills.map(s=>({x1:s.x-s.rxKm,y1:s.depthKm,x2:s.x+s.rxKm,y2:s.depthKm,widthM:50,sill:true}))]);
        this.customAquifers = JSON.parse(JSON.stringify(this.profile.aquifers || []));
      }
      this.recalculateDiagnostics();
    }

    setTimeline(tl, intensity = null) {
      this.timeline = Math.max(0, Math.min(1, tl));
      if (intensity !== null) this.intensity = intensity;
      this.recalculateDiagnostics();
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
      this.customChambers = structuredClone(base.reservoirs);
      this.customConduits = structuredClone([...base.dikes, ...base.sills.map(s=>({x1:s.x-s.rxKm,y1:s.depthKm,x2:s.x+s.rxKm,y2:s.depthKm,widthM:50,sill:true}))]);
      this.customAquifers = JSON.parse(JSON.stringify(base.aquifers || []));
      this.recalculateDiagnostics();
    }

    /**
     * Coordinate Conversion:
     * Cross-section world coordinates:
     * x: -widthKm/2 to +widthKm/2 (km)
     * depth: 0 km (surface) down to maxDepthKm (e.g. 12 or 14 km)
     */
    layout() {
      if (this.drawingLayout) return this.drawingLayout;
      const w = this.surface.width, h = this.surface.height;
      const rect = this.canvas.getBoundingClientRect();
      let left = 0, right = w;
      for (const selector of ['.panel-left', '.panel-right']) {
        const panel = document.querySelector(selector);
        if (!panel) continue;
        const r = panel.getBoundingClientRect();
        if (r.bottom <= rect.top || r.top >= rect.bottom) continue;
        if (r.left <= rect.left + w / 2 && r.right > rect.left) left = Math.max(left, r.right - rect.left + 12);
        if (r.left > rect.left + w / 2 && r.left < rect.right) right = Math.min(right, r.left - rect.left - 12);
      }
      if (right-left < 180) { left = 0; right = w; }
      const top = window.innerWidth<960 ? 25 : this.mode === 'exploration' ? 90 : 35;
      const peak = this.profile.edifice.summitHeightKm + 0.8;
      const sx = Math.max(1,right-left-72)/this.profile.widthKm;
      const sy = Math.max(1,h-top-55-(window.innerWidth<960?30:235))/(this.profile.maxDepthKm+peak);
      const scaleX = this.trueScale ? Math.min(sx,sy) : sx;
      const scaleY = this.trueScale ? Math.min(sx,sy) : sy;
      return { left:left+68, right:right-17, top, sx:scaleX, sy:scaleY, cx:(left+right+51)/2, ground:top+55+peak*scaleY, ve:scaleY/scaleX };
    }

    worldToScreen(x, depth) {
      const l = this.layout();
      return { x:l.cx+x*l.sx, y:l.ground+depth*l.sy };
    }
    screenToWorld(x, y) {
      const l = this.layout();
      return { x:(x-l.cx)/l.sx, depth:(y-l.ground)/l.sy };
    }
    stage() {
      const rows = this.profile.stages;
      const i = Math.max(0,rows.findLastIndex(s => this.timeline >= s.at));
      const a = rows[i], b = rows[Math.min(i+1, rows.length-1)];
      const t = a === b ? 0 : (this.timeline-a.at)/(b.at-a.at);
      return { ...a, collapse:a.collapse+(b.collapse-a.collapse)*t, withdrawal:a.withdrawal+(b.withdrawal-a.withdrawal)*t };
    }
    reservoirs() { return this.mode === 'exploration' ? this.customChambers : this.profile.reservoirs; }
    sheets() { return this.mode === 'exploration' ? this.customConduits : [...this.profile.dikes, ...this.profile.sills.map(s => ({x1:s.x-s.rxKm,y1:s.depthKm,x2:s.x+s.rxKm,y2:s.depthKm,widthM:50,sill:true}))]; }
    active() { return this.intensity > 0 && this.timeline > 0 && this.timeline < 1 && (this.mode === 'exploration' || this.stage().activity > 0) && this.eruptionId !== 'yellowstone'; }
    updateDescription() {
      if (!this.profile) return;
      const description = document.getElementById('cutaway-description');
      if (description) description.textContent = `${this.profile.name}. ${this.stage().label}. Depth below ${this.profile.section.reference}. Rock layers: ${this.profile.layers.map(l=>l.name).join('; ')}. Reservoirs: ${this.reservoirs().map(r=>`${r.comp}, centre ${r.depthKm} km, ${Math.round((r.meltFraction || 0.35)*100)}% melt (see evidence below)`).join('; ')}. ${this.active() ? 'Illustrative ascent active.' : 'No animated magma ascent.'} Sheet thickness and geometry are illustrative.`;
      const notes = document.getElementById('cutaway-notes');
      if (notes && notes.dataset.preset !== this.eruptionId) {
        notes.dataset.preset = this.eruptionId; notes.replaceChildren();
        const add = (title, body, src, confidence) => {
          const details = document.createElement('details'), summary = document.createElement('summary'), text = document.createElement('p');
          summary.textContent = `${title} · ${confidence}`; text.textContent = body;
          details.append(summary,text);
          const source = this.profile.sources[src];
          if (source?.url) { const link=document.createElement('a'); link.href=source.url; link.textContent=source.title; details.append(link); }
          notes.append(details);
        };
        this.profile.annotations.forEach((n,i)=>add(`${i+1}. ${n.title}`,n.text,n.src,n.confidence));
        const titles={composition:'Composition',temperatureC:'Temperature (°C)',depthRangeKm:'Source storage depth (km)',meltFraction:'Melt fraction (%)',reservoirVolumeKm3:'Reservoir volume (km³)'};
        this.profile.reservoirs.forEach(r=>Object.entries(r.evidence).forEach(([key,e])=>{
          const values=Array.isArray(e.value)?Array.from(e.value):[e.value];
          const display=values.map(v=>key==='meltFraction'?Math.round(v*100):v);
          add(`${r.comp}: ${titles[key] || key}`,`${[...new Set(display)].join('–')}`,e.src,e.confidence);
        }));
        add('Rock layers',this.profile.layers.map(l=>l.name).join('; '),'model','illustrative');
        add('Erupted DRE', this.profile.eruptedDRE.value ? this.profile.eruptedDRE.value.join('–')+' km³ (independent deposit estimate)' : 'Unavailable; no supported DRE entered.',this.profile.eruptedDRE.src,this.profile.eruptedDRE.confidence);
        add('Geometry, textures, zones and stage interpolation','Coordinates, edifice relief and sheet widths are teaching choices. Depths in source studies can use different reference levels; the drawing does not perform a datum correction. CO₂ can exsolve many kilometres deep; water exsolution and fragmentation vary with composition, gas and ascent. Colours compare approximate temperatures, not a calibrated thermometer. Reservoir withdrawal is schematic; this section cannot constrain 3D volume.','mush','illustrative');
      }
    }

    initEvents() {
      const canvas = this.canvas;
      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const dpr = window.devicePixelRatio || 1;
        return {
          sx: (clientX - rect.left),
          sy: (clientY - rect.top)
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
            delete ch.reservoirVolumeKm3;
            ch.rxKm = Math.min(this.profile.widthKm / 2, ch.rxKm + radius * 0.15);
            ch.ryKm = Math.min(this.profile.maxDepthKm / 2, ch.ryKm + radius * 0.12);
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
            delete ch.reservoirVolumeKm3;
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
      const chambers = this.reservoirs();
      const conduits = this.mode === 'exploration' ? this.customConduits : (this.profile.dikes || []);
      const aquifers = this.mode === 'exploration' ? this.customAquifers : (this.profile.aquifers || []);

      let totalVolumeKm3 = 0;
      let meltVolumeKm3 = 0;
      const erupted = this.profile.eruptedDRE.value;
      const withdrawn = erupted ? (erupted[0] + erupted[1]) / 2 * this.stage().withdrawal : 0;
      let primaryDepthKm = 7.0;
      let maxRadiusKm = 0;

      for (const ch of chambers) {
        if (!ch) continue;
        // Oblate spheroid volume V = 4/3 * pi * a^2 * b
        const vol = ch.reservoirVolumeKm3 || (4 / 3) * Math.PI * ch.rxKm * ch.rxKm * ch.ryKm;
        meltVolumeKm3 += Math.max(0, vol * (ch.meltFraction ?? 0.35) - (ch === chambers[0] ? withdrawn : 0));
        totalVolumeKm3 += vol;
        if (ch.rxKm > maxRadiusKm) {
          maxRadiusKm = ch.rxKm;
          primaryDepthKm = ch.depthKm;
        }
      }

      // Column buoyancy is distinct from reservoir overpressure.
      const deltaRho = RHO_CRUST - RHO_MAGMA; // ~250 kg/m^3 buoyant density contrast
      const depthMeters = primaryDepthKm * 1000;
      const buoyancyMPa = deltaRho * GRAVITY * depthMeters / 1e6;
      const rockPressureMPa = RHO_CRUST * GRAVITY * depthMeters / 1e6;

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
        rockPressureMPa: Number(rockPressureMPa.toFixed(1)),
        buoyancyMPa: Number(buoyancyMPa.toFixed(1)),
        meltVolumeKm3: Number(meltVolumeKm3.toFixed(1)),
        eruptedDRE: this.profile.eruptedDRE.value,
        mode: this.mode,
        ventCount: surfaceVents.length,
        surfaceVents: surfaceVents,
        hasSteamInteraction: hasSteamInteraction
      };

      this.updateDescription();
      if (this.onDiagnosticsChange) this.onDiagnosticsChange(diagnostics);
      if (this.onVentChange && surfaceVents.length > 0) this.onVentChange(surfaceVents);

      return diagnostics;
    }

    render(dt = 0.016) {
      const ctx=this.ctx, w=this.surface.width, h=this.surface.height;
      if (!w || !h) return;
      const moving = this.active() && !document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (moving) this.clock += Math.min(dt,0.05);
      ctx.clearRect(0,0,w,h);

      // Deep technical slate plate background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0c131b');
      bgGrad.addColorStop(1, '#080d14');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      this.drawingLayout=null;
      const l=this.layout();
      this.drawingLayout=l;

      // Geological Section Clipping Frame
      const clipH = Math.max(1, h - l.top - (window.innerWidth < 960 ? 15 : 85));
      ctx.save();
      ctx.beginPath();
      ctx.rect(l.left, l.top, Math.max(1, l.right - l.left), clipH);
      ctx.clip();

      // 1. Crustal host rock stratigraphy
      this.drawCrustLayers(ctx);

      // 2. Geothermal field & contact metamorphic aureole around magma bodies
      this.drawThermalHalos(ctx);

      // 3. Volcanic edifice topography
      this.drawEdifice(ctx);

      // 4. Groundwater hydrothermal aquifer systems & convective streamlines
      this.drawAquifers(ctx);

      // 5. Transcrustal Magmatic System (TCMS) reservoirs, crystal mush, & melt lenses
      this.drawChambers(ctx);

      // 6. Feeder conduits, dikes, sills, & decompression volatile exsolution
      this.drawConduits(ctx);

      // 7. Volcanological process horizons (exsolution, bubble growth, fragmentation)
      this.drawZones(ctx);

      // 8. Event-specific geological features (cryptodomes, ring faults, lateral blast scars)
      this.drawSpecialFeatures(ctx);

      ctx.restore();

      // Technical plate frame border
      ctx.strokeStyle = 'rgba(230, 210, 185, 0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(l.left, l.top, Math.max(1, l.right - l.left), clipH);

      // 9. Precision scientific axes, lithostatic pressure scales, & distance datum
      this.drawDepthAxes(ctx);

      // 10. Stratigraphic & empirical literature annotations
      this.drawAnnotations(ctx);

      // 11. Interactive exploration crosshair cursor
      if(this.mode==='exploration'){
        const p=this.worldToScreen(this.keyboardPos.x,this.keyboardPos.depth);
        ctx.strokeStyle='#ff8830';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(4, this.brushSizeKm * l.sx), 0, Math.PI * 2);
        ctx.moveTo(p.x-8,p.y);ctx.lineTo(p.x+8,p.y);
        ctx.moveTo(p.x,p.y-8);ctx.lineTo(p.x,p.y+8);
        ctx.stroke();
      }
      this.drawingLayout=null;
    }

    temperatureColor(temp) {
      const t=Math.max(0,Math.min(1,((parseFloat(temp)||950)-780)/380));
      return `rgb(${Math.round(150+105*t)},${Math.round(38+145*t)},${Math.round(22+25*t)})`;
    }

    drawCrustLayers(ctx) {
      const l=this.layout();
      for (const layer of this.profile.layers) {
        const a=this.worldToScreen(-this.profile.widthKm/2,layer.topKm);
        const b=this.worldToScreen(this.profile.widthKm/2,layer.bottomKm);
        const w = b.x - a.x, h = b.y - a.y;

        // Base lithologic wash
        ctx.fillStyle=layer.color;
        ctx.fillRect(a.x,a.y,w,h);

        // USGS Standard Lithologic Hatch Patterns
        const key=`${layer.pattern}:${Math.round(l.sx)}:${Math.round(l.sy)}`;
        if (!this.textureCache.has(key)) {
          const tile=document.createElement('canvas'); tile.width=64; tile.height=64; const c=tile.getContext('2d');
          c.strokeStyle='rgba(235,225,210,.18)'; c.fillStyle='rgba(235,225,210,.18)'; c.lineWidth=1;

          if (layer.pattern==='blocks') {
            // USGS Carbonate / Limestone brick masonry pattern with staggered joints
            for(let y=0; y<=64; y+=16) {
              c.beginPath(); c.moveTo(0, y); c.lineTo(64, y); c.stroke();
              const offset = (y % 32 === 0) ? 0 : 16;
              for(let x=offset; x<=64; x+=32) {
                c.beginPath(); c.moveTo(x, y); c.lineTo(x, y+16); c.stroke();
              }
            }
          } else if (layer.pattern==='slanted') {
            // Metamorphic Schist / Foliated Gneiss diagonal banding with quartz lens hints
            for(let i=-64; i<=128; i+=16) {
              c.beginPath(); c.moveTo(i, 64); c.lineTo(i+64, 0); c.stroke();
            }
            c.fillStyle = 'rgba(255,255,255,0.08)';
            c.beginPath(); c.ellipse(32, 32, 10, 3, -Math.PI/4, 0, Math.PI*2); c.fill();
          } else if (layer.pattern==='ice') {
            // Glacial firn & columnar ice cleavage cracks
            for(let i=0; i<=64; i+=16) {
              c.beginPath(); c.moveTo(i, 0); c.lineTo(i+5, 24); c.lineTo(i-3, 44); c.lineTo(i, 64); c.stroke();
            }
          } else {
            // Crystalline Plutonic / Granitic plus signs (+) & Basaltic micro-prisms
            for(let y=8; y<=64; y+=20) {
              for(let x=8; x<=64; x+=20) {
                c.beginPath();
                c.moveTo(x-4, y); c.lineTo(x+4, y);
                c.moveTo(x, y-4); c.lineTo(x, y+4);
                c.stroke();
              }
            }
          }
          // Fine lithic speckling
          for(let i=0;i<60;i++) {
            c.fillStyle=`rgba(255,255,255,${((i%4)+1)/180})`;
            c.fillRect((i*29)%64,(i*41)%64,1,1);
          }
          this.textureCache.set(key,ctx.createPattern(tile,'repeat'));
          if(this.textureCache.size>32) this.textureCache.delete(this.textureCache.keys().next().value);
        }
        ctx.fillStyle=this.textureCache.get(key);
        ctx.fillRect(a.x,a.y,w,h);

        // Contact interface boundary lines
        ctx.strokeStyle = 'rgba(240, 225, 205, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, b.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Subtle stratigraphic unit label watermark
        ctx.fillStyle = 'rgba(235, 220, 200, 0.30)';
        ctx.font = '600 10px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(layer.name.toUpperCase(), b.x - 12, b.y - 6);
        ctx.textAlign = 'left';
      }
    }

    drawThermalHalos(ctx) {
      const l = this.layout();

      for (const r of this.reservoirs()) {
        const a = this.worldToScreen(r.x, r.depthKm);
        const rx = r.rxKm * l.sx;
        const ry = r.ryKm * l.sy;

        // Radiative conductive thermal halo into host crust
        const haloGrad = ctx.createRadialGradient(a.x, a.y, rx * 0.3, a.x, a.y, rx * 2.2);
        haloGrad.addColorStop(0, 'rgba(255, 95, 25, 0.38)');
        haloGrad.addColorStop(0.35, 'rgba(220, 60, 15, 0.22)');
        haloGrad.addColorStop(0.68, 'rgba(180, 40, 10, 0.10)');
        haloGrad.addColorStop(1, 'rgba(150, 30, 10, 0.0)');

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(a.x, a.y, rx * 2.2, ry * 2.1, 0, 0, Math.PI * 2);
        ctx.fillStyle = haloGrad;
        ctx.fill();

        // Isotherm contour lines: 600°C and 800°C metamorphic isograds
        ctx.strokeStyle = 'rgba(255, 140, 50, 0.35)';
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(a.x, a.y, rx * 1.5, ry * 1.45, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 80, 20, 0.25)';
        ctx.beginPath();
        ctx.ellipse(a.x, a.y, rx * 1.95, ry * 1.85, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Isotherm label
        ctx.fillStyle = 'rgba(255, 170, 90, 0.65)';
        ctx.font = '9px system-ui, sans-serif';
        ctx.fillText('600°C Isotherm', a.x + rx * 1.5 + 4, a.y);
        ctx.restore();
      }
    }

    surfaceDepth(x) {
      const e=this.profile.edifice, stage=this.stage();
      const slope=Math.max(0,1-Math.abs(x)/e.halfWidthKm);
      const raw=-e.summitHeightKm*(e.shape==='plateau'?Math.min(1,slope*5):Math.pow(slope,e.shape==='shield'?0.65:1));
      let depth=raw;
      if(stage.collapse>0 && Math.abs(x)<e.postEruption.craterHalfWidthKm) depth=raw+(Math.max(raw,-e.postEruption.summitHeightKm+0.8)-raw)*stage.collapse;
      if(this.eruptionId==='sthelenr1980' && x<0) depth=raw+Math.min(1,Math.max(0,(this.timeline-.15)/.04))*Math.max(0,1-Math.abs(x)/e.halfWidthKm)*1.6;
      return depth;
    }

    drawEdifice(ctx) {
      const p=this.profile, e=p.edifice;
      const a=this.worldToScreen(-p.widthKm/2,0),b=this.worldToScreen(p.widthKm/2,0);
      ctx.beginPath();ctx.moveTo(a.x,a.y);
      for(let x=-p.widthKm/2;x<=p.widthKm/2;x+=p.widthKm/160){const v=this.worldToScreen(x,this.surfaceDepth(x));ctx.lineTo(v.x,v.y);}
      ctx.lineTo(b.x,b.y);ctx.closePath();

      // Edifice cross-stratified tephra and lava flows
      const edificeGrad = ctx.createLinearGradient(0, this.worldToScreen(0, -e.summitHeightKm).y, 0, a.y);
      edificeGrad.addColorStop(0, '#5f4f42');
      edificeGrad.addColorStop(0.5, '#4e3f34');
      edificeGrad.addColorStop(1, '#3e3128');
      ctx.fillStyle = edificeGrad;
      ctx.fill();

      // Internal strata lines showing progressive cone accumulation
      ctx.save();ctx.clip();ctx.strokeStyle='rgba(165,145,125,0.32)';ctx.lineWidth=1;
      for(let d=-e.summitHeightKm;d<0;d+=.28){
        const v=this.worldToScreen(0,d);
        ctx.beginPath();ctx.moveTo(a.x,v.y);ctx.lineTo(b.x,v.y);ctx.stroke();
      }
      ctx.restore();

      // Topographic surface outline
      ctx.strokeStyle = '#dfc2a2';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for(let x=-p.widthKm/2;x<=p.widthKm/2;x+=p.widthKm/160){
        const v=this.worldToScreen(x,this.surfaceDepth(x));
        if (x===-p.widthKm/2) ctx.moveTo(v.x, v.y); else ctx.lineTo(v.x, v.y);
      }
      ctx.stroke();

      if(p.waterLevelKm){
        ctx.fillStyle='rgba(45,130,185,.65)';
        ctx.fillRect(a.x,a.y,b.x-a.x,p.waterLevelKm*this.layout().sy);
        // Sea level surface ripple line
        ctx.strokeStyle = 'rgba(140, 215, 255, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, a.y); ctx.stroke();
      }
      if(p.glacierThicknessKm){
        ctx.strokeStyle='#c2edf5';ctx.lineWidth=Math.max(2,p.glacierThicknessKm*this.layout().sy);ctx.beginPath();
        for(let x=-1.2;x<1.2;x+=.05){const v=this.worldToScreen(x,this.surfaceDepth(x));if(x===-1.2)ctx.moveTo(v.x,v.y);else ctx.lineTo(v.x,v.y);}ctx.stroke();
      }
      if(e.rim){
        ctx.strokeStyle='#ebd8b8';ctx.lineWidth=2;ctx.beginPath();
        for(const x of [-1.6,-1,0,1,1.6]){const v=this.worldToScreen(x,this.surfaceDepth(x)+(Math.abs(x)<1?.25:0));ctx.lineTo(v.x,v.y);}ctx.stroke();
      }
    }

    drawAquifers(ctx) {
      const l = this.layout();
      const moving = this.active();

      for(const aq of this.mode==='exploration'?this.customAquifers:this.profile.aquifers){
        const a=this.worldToScreen(aq.x,aq.depthKm);
        const rx = aq.rxKm*l.sx, ry = aq.ryKm*l.sy;

        // Porous fractured saturated aquifer body
        const aqGrad = ctx.createRadialGradient(a.x, a.y, rx * 0.2, a.x, a.y, rx);
        aqGrad.addColorStop(0, 'rgba(80, 200, 235, 0.42)');
        aqGrad.addColorStop(0.7, 'rgba(45, 150, 195, 0.28)');
        aqGrad.addColorStop(1, 'rgba(25, 95, 140, 0.08)');

        ctx.fillStyle=aqGrad;
        ctx.beginPath();
        ctx.ellipse(a.x,a.y,rx,ry,0,0,Math.PI*2);
        ctx.fill();

        ctx.strokeStyle='rgba(120, 220, 255, 0.55)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Hydrothermal convective streamlines
        if (moving) {
          ctx.strokeStyle = 'rgba(200, 240, 255, 0.6)';
          ctx.lineWidth = 1.2;
          const phase = (this.clock * 0.8) % (Math.PI * 2);
          for (let dir = -1; dir <= 1; dir += 2) {
            const cx = a.x + dir * rx * 0.45;
            ctx.beginPath();
            ctx.ellipse(cx, a.y, rx * 0.25, ry * 0.45, 0, phase, phase + Math.PI * 1.2);
            ctx.stroke();
          }
        }

        ctx.fillStyle = 'rgba(180, 235, 255, 0.85)';
        ctx.font = '9px system-ui, sans-serif';
        ctx.fillText('Hydrothermal Aquifer', a.x - rx * 0.7, a.y - ry - 4);
      }
    }

    drawChambers(ctx) {
      const l=this.layout();
      for(const r of this.reservoirs()) {
        const a=this.worldToScreen(r.x,r.depthKm),rx=r.rxKm*l.sx,ry=r.ryKm*l.sy;

        // Chilled crystalline border / contact metamorphic selvage
        ctx.fillStyle='rgba(65, 45, 38, 0.9)';
        ctx.beginPath();
        ctx.ellipse(a.x,a.y,rx+5,ry+5,0,0,Math.PI*2);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(a.x,a.y,rx,ry,0,0,Math.PI*2);
        ctx.clip();

        // 1. Crystal mush matrix (mush reservoir background)
        const mushGrad = ctx.createLinearGradient(a.x, a.y - ry, a.x, a.y + ry);
        mushGrad.addColorStop(0, '#5a3528');
        mushGrad.addColorStop(1, '#3b201a');
        ctx.fillStyle=mushGrad;
        ctx.fillRect(a.x-rx,a.y-ry,rx*2,ry*2);

        // Calculate eruptible melt lens fraction vs. crystalline cumulate floor
        const volume=r.reservoirVolumeKm3 || 4/3*Math.PI*r.rxKm*r.rxKm*r.ryKm;
        const initialMelt=volume*(r.meltFraction??.35);
        const dre=this.profile.eruptedDRE.value;
        const withdrawn=dre && r===this.reservoirs()[0] ? (dre[0]+dre[1])/2*this.stage().withdrawal : 0;
        const fraction=Math.max(0,initialMelt-withdrawn)/volume;

        // 2. High-melt eruptible lens (concentrated in upper reservoir)
        const lensRy = ry * Math.sqrt(fraction) * 0.75;
        const lensRx = rx * 0.82;
        const lensY = a.y - ry * 0.25;

        const meltGrad = ctx.createRadialGradient(a.x, lensY, lensRx * 0.15, a.x, lensY, lensRx);
        const col = this.temperatureColor(r.compositionLayers?.length>1 ? 960 : r.temperatureC||r.temp);
        meltGrad.addColorStop(0, '#fff0a0');
        meltGrad.addColorStop(0.3, col);
        meltGrad.addColorStop(0.85, 'rgba(180, 50, 15, 0.85)');
        meltGrad.addColorStop(1, 'rgba(120, 30, 10, 0.4)');

        ctx.fillStyle = meltGrad;
        ctx.beginPath();
        ctx.ellipse(a.x, lensY, lensRx, Math.max(2, lensRy), 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Fluid convection flow eddies inside melt lens
        if (this.active() && lensRy > 4) {
          ctx.strokeStyle = 'rgba(255, 235, 180, 0.45)';
          ctx.lineWidth = 1;
          const pulse = (this.clock * 0.5) % (Math.PI * 2);
          for(let i=0; i<3; i++) {
            const ex = a.x + (i - 1) * lensRx * 0.4;
            ctx.beginPath();
            ctx.ellipse(ex, lensY, lensRx * 0.2, lensRy * 0.4, 0, pulse, pulse + Math.PI);
            ctx.stroke();
          }
        }

        // 4. Crystalline mush phenocryst framework (feldspar/pyroxene laths)
        for(let i=0;i<75;i++){
          const x=a.x-rx+((i*37)%100)/50*rx;
          const y=a.y-ry+((i*61)%100)/50*ry;
          if (y < lensY && Math.hypot(x - a.x, y - lensY) < lensRx * 0.6) continue;
          ctx.fillStyle=i%2?'rgba(215, 195, 180, 0.75)':'rgba(145, 130, 120, 0.65)';
          ctx.beginPath();
          ctx.moveTo(x,y-3);ctx.lineTo(x+4,y+1);ctx.lineTo(x,y+4);ctx.lineTo(x-3,y);ctx.closePath();
          ctx.fill();
        }

        // 5. Compositional density interface (e.g. mafic recharge underplating felsic melt)
        if(r.compositionLayers?.length>1){
          ctx.strokeStyle='rgba(255, 205, 150, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();ctx.moveTo(a.x-rx,a.y);ctx.lineTo(a.x+rx,a.y);ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(255, 225, 180, 0.9)';
          ctx.font = '8px system-ui, sans-serif';
          ctx.fillText('Magma Mixing / Density Stratification', a.x - rx * 0.8, a.y - 3);
        }

        ctx.restore();

        // Reservoir structural bounding ring
        ctx.strokeStyle='#d6a88b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();ctx.ellipse(a.x,a.y,rx,ry,0,0,Math.PI*2);ctx.stroke();

        // Reservoir petrological label
        ctx.fillStyle = '#ffdfbf';
        ctx.font = '600 10px system-ui, sans-serif';
        ctx.fillText(`${r.comp || 'Silicic Mush Reservoir'} (${Math.round((r.meltFraction || 0.35) * 100)}% melt)`, a.x - rx * 0.75, a.y + ry + 12);
      }
    }

    drawConduits(ctx) {
      const l=this.layout(), active=this.active();
      const fragDepth = this.profile.fragmentationDepthKm ?? 1.5;
      const exsolDepth = this.profile.exsolutionDepthKm ?? 4.0;

      this.sheets().forEach((c,index)=>{
        if(c.flank && (this.timeline<.08 || this.timeline>=.14)) return;
        if(this.eruptionId==='eyja2010' && !c.flank && !c.sill && this.timeline<.14) return;
        const a=this.worldToScreen(c.x1,c.y1);
        const b=this.worldToScreen(c.x2,c.surface?this.surfaceDepth(c.x2):c.y2);

        // Feeder conduit thermal glow
        if (active && !c.sill) {
          ctx.strokeStyle = 'rgba(255, 100, 20, 0.45)';
          ctx.lineWidth = (this.trueScale ? Math.max(1, (c.widthM||50)/1000*l.sx) : 4) + 6;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }

        ctx.strokeStyle=active?this.temperatureColor(this.reservoirs()[0]?.temperatureC):'#79645a';
        ctx.lineWidth=this.trueScale?Math.max(.6,(c.widthM||50)/1000*l.sx):3.5;
        ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();

        if(!active || c.sill || (this.eruptionId==='pinatubo1991' && c.y1>8 && this.timeline>=.18)) return;

        // Animated decompression exsolution & bubbly magma ascent
        const numBubbles = 10;
        for(let i=0;i<numBubbles;i++){
          const t=(this.clock*.25 + i/numBubbles + index*.08)%1;
          const x=a.x+(b.x-a.x)*t;
          const y=a.y+(b.y-a.y)*t;
          const currentDepthKm = c.y1 + (c.y2 - c.y1) * t;

          if (currentDepthKm <= fragDepth) {
            // Above fragmentation: supersonic gas + pyroclast dispersion
            ctx.fillStyle = '#f0ebe0';
            ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
          } else if (currentDepthKm <= exsolDepth) {
            // Decompression bubble growth region: expanding H2O/CO2 vesicles
            const bubbleExpansion = 1.0 + (exsolDepth - currentDepthKm) * 0.8;
            ctx.fillStyle = '#ffdc8a';
            ctx.beginPath();
            ctx.ellipse(x, y, 1.6 * bubbleExpansion, 2.4 * bubbleExpansion, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Deep ascending silicate liquid
            ctx.fillStyle = '#ff9030';
            ctx.beginPath();
            ctx.arc(x, y, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      if(!active){
        const v=this.worldToScreen(0,this.surfaceDepth(0));
        ctx.fillStyle='#b6a18b';
        ctx.fillRect(v.x-5,v.y,10,6);
      }
    }

    drawZones(ctx) {
      if(!this.active()) return;
      const zones=[
        [this.profile.gasOnsetDepthKm,'CO₂ Exsolution (Deep Volatile Saturation)','#e5bf88'],
        [this.profile.exsolutionDepthKm,'H₂O Bubble Exsolution & Rapid Foam Expansion','#f5c065'],
        [this.profile.fragmentationDepthKm,'Brittle Fragmentation Level (Dingwell Criterion: Wi ≥ 0.04)','#f0eee8']
      ];
      for(const [depth,label,color] of zones){
        if(depth===null)continue;
        const a=this.worldToScreen(-this.profile.widthKm/2,depth);
        const b=this.worldToScreen(this.profile.widthKm/2,depth);
        ctx.strokeStyle=color;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        ctx.setLineDash([]);

        // Horizon badge
        ctx.fillStyle='rgba(15, 22, 30, 0.82)';
        ctx.fillRect(a.x + 6, a.y - 12, ctx.measureText(label).width + 8, 14);
        ctx.strokeStyle = color;
        ctx.strokeRect(a.x + 6, a.y - 12, ctx.measureText(label).width + 8, 14);

        ctx.fillStyle=color;
        ctx.font='600 9px system-ui, sans-serif';
        ctx.fillText(label,a.x+10,a.y-2);
      }
    }

    drawSpecialFeatures(ctx) {
      const p=this.profile;
      if(this.eruptionId==='pinatubo1991' && this.timeline<.18){
        const a=this.worldToScreen(0,8.5);
        ctx.fillStyle='#f0ba7e';ctx.font='600 10px system-ui';ctx.fillText('Basalt Underplating & Volatile Recharge',a.x+8,a.y);
      }
      if(p.marineIngress && this.active()){
        const a=this.worldToScreen(p.marineIngress.x,p.marineIngress.depthKm);
        ctx.strokeStyle='#6fbdde';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(a.x-30,a.y-22);ctx.lineTo(a.x,a.y);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle='#a5d1e3';ctx.font='600 10px system-ui';ctx.fillText('Hydrovolcanic Ingress (Phreatomagmatic)',a.x+8,a.y-10);
      }
      if(p.cryptodome && this.timeline<.19){
        const c=p.cryptodome,a=this.worldToScreen(c.x,c.depthKm),l=this.layout();
        ctx.fillStyle='#cf5a36';ctx.beginPath();ctx.ellipse(a.x,a.y,c.rxKm*l.sx,c.ryKm*l.sy,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#ffc0a0';ctx.font='600 9px system-ui';ctx.fillText('Cryptodome Intrusion Bulge',a.x-25,a.y-c.ryKm*l.sy-4);
      }
      if(this.eruptionId==='sthelenr1980' && this.timeline>=.19 && this.timeline<.34){
        const a=this.worldToScreen(-1.6,-1.3);
        ctx.fillStyle='rgba(215, 195, 175, 0.85)';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x-65,a.y-18);ctx.lineTo(a.x-65,a.y+18);ctx.closePath();ctx.fill();
        ctx.fillStyle='#ffe0c0';ctx.font='600 9px system-ui';ctx.fillText('North Flank Lateral Blast Vector', a.x-65, a.y-22);
      }
      if(p.ringFaults && this.stage().collapse>0){
        ctx.strokeStyle='#d9a586';ctx.lineWidth=1.5;ctx.setLineDash([5,3]);
        for(const f of p.ringFaults){
          const a=this.worldToScreen(f.x,f.y1),b=this.worldToScreen(f.x,f.y2);
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }

    drawDepthAxes(ctx) {
      const l=this.layout();
      const h=this.surface.height;
      const clipH = Math.max(1, h - l.top - (window.innerWidth < 960 ? 15 : 85));

      // Sea Level Datum Line (z = 0)
      const seaLevelY = this.worldToScreen(0, 0).y;
      ctx.strokeStyle = 'rgba(80, 180, 240, 0.45)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(l.left, seaLevelY);
      ctx.lineTo(l.right, seaLevelY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '9px "SF Pro Text", -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#65c5f0';
      ctx.textAlign = 'left';
      ctx.fillText('0 km · Sea Level Datum', l.left + 8, seaLevelY - 4);

      // Section Orientation & Technical Legend
      ctx.textAlign='left';
      ctx.fillStyle='#f5e8d8';
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillText(`GEOLOGICAL CRUSTAL PROFILE: ${this.profile.name.toUpperCase()}`, l.left, l.top - 18);

      ctx.font = '9px system-ui, sans-serif';
      ctx.fillStyle = '#c7b29e';
      ctx.fillText(`${this.profile.section.orientation} · Reference Datum: ${this.profile.section.reference}`, l.left, l.top - 6);

      // Axis Column Headers
      ctx.textAlign = 'right';
      ctx.font = '600 8px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(230, 200, 170, 0.9)';
      ctx.fillText('MPa', l.left - 38, seaLevelY - 14);
      ctx.fillStyle = '#f0e2d2';
      ctx.fillText('Depth', l.left - 8, seaLevelY - 14);

      // Left Depth Scale & Lithostatic Pressure Bar
      const step = this.profile.maxDepthKm > 20 ? 10 : 2;
      for(let d=0; d<=this.profile.maxDepthKm; d+=step){
        const a = this.worldToScreen(-this.profile.widthKm/2, d);
        // Overburden pressure P = rho * g * z
        const pressMPa = Math.round((RHO_CRUST * GRAVITY * d * 1000) / 1e6);

        // Tick mark
        ctx.strokeStyle = 'rgba(235, 220, 205, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(l.left - 6, a.y);
        ctx.lineTo(l.left, a.y);
        ctx.stroke();

        // Depth readout
        ctx.font = '9px "SF Pro Text", -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#f0e2d2';
        ctx.textAlign = 'right';
        ctx.fillText(`${d} km`, l.left - 8, a.y + 3);

        // Pressure readout (MPa)
        ctx.fillStyle = 'rgba(230, 200, 170, 0.72)';
        ctx.fillText(`${pressMPa}`, l.left - 38, a.y + 3);
      }

      // Horizontal Distance Scale Bar (km) — positioned in upper right publication header
      const barLenKm = Math.round(this.profile.widthKm / 4);
      const barLenPx = barLenKm * l.sx;
      const scaleBarX = l.right - barLenPx;
      const scaleBarY = l.top - 12;

      ctx.strokeStyle = '#f0e2d2';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(scaleBarX, scaleBarY);
      ctx.lineTo(scaleBarX + barLenPx, scaleBarY);
      ctx.moveTo(scaleBarX, scaleBarY - 4);
      ctx.lineTo(scaleBarX, scaleBarY + 4);
      ctx.moveTo(scaleBarX + barLenPx, scaleBarY - 4);
      ctx.lineTo(scaleBarX + barLenPx, scaleBarY + 4);
      ctx.stroke();

      ctx.fillStyle = '#f0e2d2';
      ctx.font = '9px "SF Pro Text", -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`0`, scaleBarX, scaleBarY - 5);
      ctx.fillText(`${barLenKm} km`, scaleBarX + barLenPx, scaleBarY - 5);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#c7b29e';
      ctx.fillText(`Scale (V.E. ${l.ve.toFixed(2)}× · ${this.trueScale ? '1:1 True Scale' : 'Schematic'})`, scaleBarX - 10, scaleBarY + 3);
    }

    drawAnnotations(ctx) {
      this.profile.annotations.forEach((note,i)=>{
        const a=this.worldToScreen(note.x,note.depthKm);
        ctx.fillStyle='#ff7820';
        ctx.beginPath();ctx.arc(a.x,a.y,8,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#16100c';
        ctx.font='bold 10px system-ui, sans-serif';
        ctx.textAlign='center';
        ctx.fillText(String(i+1),a.x,a.y+3.5);
      });
      ctx.textAlign='left';
    }
  }
  window.VolcanoConduitEngine = VolcanoConduitEngine;
  window.HISTORICAL_CONDUITS = HISTORICAL_CONDUITS;
})();
