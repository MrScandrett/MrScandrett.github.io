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
      return { left:left+55, right:right-17, top, sx:scaleX, sy:scaleY, cx:(left+right+38)/2, ground:top+55+peak*scaleY, ve:scaleY/scaleX };
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
      ctx.fillStyle='#111a24'; ctx.fillRect(0,0,w,h);
      this.drawingLayout=null;
      const l=this.layout();
      this.drawingLayout=l;
      ctx.save(); ctx.beginPath(); ctx.rect(l.left,l.top,Math.max(1,l.right-l.left),Math.max(1,h-l.top-(window.innerWidth<960?15:85))); ctx.clip();
      this.drawCrustLayers(ctx); this.drawEdifice(ctx); this.drawAquifers(ctx);
      this.drawChambers(ctx); this.drawConduits(ctx); this.drawZones(ctx);
      this.drawSpecialFeatures(ctx);
      ctx.restore(); this.drawDepthAxes(ctx); this.drawAnnotations(ctx);
      if(this.mode==='exploration'){const p=this.worldToScreen(this.keyboardPos.x,this.keyboardPos.depth);ctx.strokeStyle='#f4d4ad';ctx.beginPath();ctx.moveTo(p.x-6,p.y);ctx.lineTo(p.x+6,p.y);ctx.moveTo(p.x,p.y-6);ctx.lineTo(p.x,p.y+6);ctx.stroke();}
      this.drawingLayout=null;
    }
    temperatureColor(temp) {
      const t=Math.max(0,Math.min(1,((parseFloat(temp)||950)-780)/380));
      return `rgb(${Math.round(150+100*t)},${Math.round(38+139*t)},${Math.round(22+23*t)})`;
    }
    drawCrustLayers(ctx) {
      const l=this.layout();
      for (const layer of this.profile.layers) {
        const a=this.worldToScreen(-this.profile.widthKm/2,layer.topKm), b=this.worldToScreen(this.profile.widthKm/2,layer.bottomKm);
        ctx.fillStyle=layer.color; ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);
        const key=`${layer.pattern}:${Math.round(l.sx)}:${Math.round(l.sy)}`;
        if (!this.textureCache.has(key)) {
          const tile=document.createElement('canvas'); tile.width=64; tile.height=64; const c=tile.getContext('2d');
          c.strokeStyle='rgba(230,220,205,.16)'; c.fillStyle='rgba(230,220,205,.16)'; c.lineWidth=1;
          for(let i=0;i<64;i+=16) {
            c.beginPath();
            if(layer.pattern==='slanted') {c.moveTo(i-64,64);c.lineTo(i+64,0);}
            else if(layer.pattern==='ice') {c.moveTo(i,0);c.lineTo(i+8,32);c.lineTo(i,64);}
            else if(layer.pattern==='blocks') {c.moveTo(0,i);c.lineTo(64,i);c.moveTo(i, i);c.lineTo(i,i+16);}
            else {c.arc((i*7)%64,i,1.5,0,Math.PI*2);c.fill();}
            c.stroke();
          }
          for(let i=0;i<90;i++) {c.fillStyle=`rgba(255,255,255,${(i%5)/150})`;c.fillRect((i*23)%64,(i*37)%64,1,1);}
          this.textureCache.set(key,ctx.createPattern(tile,'repeat'));
          if(this.textureCache.size>32) this.textureCache.delete(this.textureCache.keys().next().value);
        }
        ctx.fillStyle=this.textureCache.get(key);ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);
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
      ctx.lineTo(b.x,b.y);ctx.closePath();ctx.fillStyle='#55483d';ctx.fill();
      ctx.save();ctx.clip();ctx.strokeStyle='#82705c';ctx.lineWidth=1;
      for(let d=-e.summitHeightKm;d<0;d+=.25){const v=this.worldToScreen(0,d);ctx.beginPath();ctx.moveTo(a.x,v.y);ctx.lineTo(b.x,v.y);ctx.stroke();}ctx.restore();
      if(p.waterLevelKm){ctx.fillStyle='rgba(55,140,195,.7)';ctx.fillRect(a.x,a.y,b.x-a.x,p.waterLevelKm*this.layout().sy);}
      if(p.glacierThicknessKm){ctx.strokeStyle='#b4e3ec';ctx.lineWidth=Math.max(1,p.glacierThicknessKm*this.layout().sy);ctx.beginPath();for(let x=-1.2;x<1.2;x+=.05){const v=this.worldToScreen(x,this.surfaceDepth(x));if(x===-1.2)ctx.moveTo(v.x,v.y);else ctx.lineTo(v.x,v.y);}ctx.stroke();}
      if(e.rim){ctx.strokeStyle='#cbbda0';ctx.lineWidth=2;ctx.beginPath();for(const x of [-1.6,-1,0,1,1.6]){const v=this.worldToScreen(x,this.surfaceDepth(x)+(Math.abs(x)<1?.25:0));ctx.lineTo(v.x,v.y);}ctx.stroke();}
    }
    drawAquifers(ctx) {
      for(const aq of this.mode==='exploration'?this.customAquifers:this.profile.aquifers){const a=this.worldToScreen(aq.x,aq.depthKm),l=this.layout();ctx.fillStyle='rgba(60,170,205,.23)';ctx.beginPath();ctx.ellipse(a.x,a.y,aq.rxKm*l.sx,aq.ryKm*l.sy,0,0,Math.PI*2);ctx.fill();}
    }
    drawChambers(ctx) {
      const l=this.layout();
      for(const r of this.reservoirs()) {
        const a=this.worldToScreen(r.x,r.depthKm),rx=r.rxKm*l.sx,ry=r.ryKm*l.sy;
        ctx.fillStyle='#766153';ctx.beginPath();ctx.ellipse(a.x,a.y,rx+4,ry+4,0,0,Math.PI*2);ctx.fill();
        ctx.save();ctx.beginPath();ctx.ellipse(a.x,a.y,rx,ry,0,0,Math.PI*2);ctx.clip();ctx.fillStyle='#593c37';ctx.fillRect(a.x-rx,a.y-ry,rx*2,ry*2);
        // Distributed melt lenses occupy a fraction of the section, not an empty tank.
        const volume=r.reservoirVolumeKm3 || 4/3*Math.PI*r.rxKm*r.rxKm*r.ryKm;
        const initialMelt=volume*(r.meltFraction??.35);
        const dre=this.profile.eruptedDRE.value;
        const withdrawn=dre && r===this.reservoirs()[0] ? (dre[0]+dre[1])/2*this.stage().withdrawal : 0;
        const fraction=Math.max(0,initialMelt-withdrawn)/volume;
        for(let i=0;i<12;i++) {const x=a.x+Math.sin(i*2.4)*rx*.68,y=a.y+Math.cos(i*1.7)*ry*.62;ctx.fillStyle=this.temperatureColor(r.compositionLayers?.length>1 && y>a.y ? 950 : r.temperatureC||r.temp);ctx.beginPath();ctx.ellipse(x,y,rx*Math.sqrt(fraction)/4,ry*Math.sqrt(fraction)/2.5,0,0,Math.PI*2);ctx.fill();}
        for(let i=0;i<65;i++){const x=a.x-rx+((i*37)%100)/50*rx,y=a.y-ry+((i*61)%100)/50*ry;ctx.fillStyle=i%2?'#b3a397':'#7f746c';ctx.beginPath();ctx.moveTo(x,y-3);ctx.lineTo(x+4,y+1);ctx.lineTo(x,y+4);ctx.lineTo(x-3,y);ctx.closePath();ctx.fill();}
        if(r.compositionLayers?.length>1){ctx.strokeStyle='#dbb69e';ctx.beginPath();ctx.moveTo(a.x-rx,a.y);ctx.lineTo(a.x+rx,a.y);ctx.stroke();}
        ctx.restore();ctx.strokeStyle='#b7957e';ctx.beginPath();ctx.ellipse(a.x,a.y,rx,ry,0,0,Math.PI*2);ctx.stroke();
      }
    }
    drawConduits(ctx) {
      const l=this.layout(), active=this.active();
      this.sheets().forEach((c,index)=>{
        if(c.flank && (this.timeline<.08 || this.timeline>=.14)) return;
        if(this.eruptionId==='eyja2010' && !c.flank && !c.sill && this.timeline<.14) return;
        const a=this.worldToScreen(c.x1,c.y1),b=this.worldToScreen(c.x2,c.surface?this.surfaceDepth(c.x2):c.y2);
        ctx.strokeStyle=active?this.temperatureColor(this.reservoirs()[0]?.temperatureC):'#79645a';ctx.lineWidth=this.trueScale?Math.max(.4,(c.widthM||50)/1000*l.sx):3;ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        if(!active || c.sill || (this.eruptionId==='pinatubo1991' && c.y1>8 && this.timeline>=.18)) return;
        for(let i=0;i<5;i++){const t=(this.clock*.2+i/5+index*.1)%1,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;ctx.fillStyle=c.y1+(c.y2-c.y1)*t<(this.profile.fragmentationDepthKm??-99)?'#c8bca9':'#e8bc7a';ctx.beginPath();ctx.arc(x,y,1.4+t*1.5,0,Math.PI*2);ctx.fill();}
      });
      if(!active){const v=this.worldToScreen(0,this.surfaceDepth(0));ctx.fillStyle='#b6a18b';ctx.fillRect(v.x-5,v.y,10,6);}
    }
    drawZones(ctx) {
      if(!this.active()) return;
      const zones=[[this.profile.gasOnsetDepthKm,'CO₂ exsolution (illustrative)','#cbaa81'],[this.profile.exsolutionDepthKm,'Bubble growth (illustrative)','#dca756'],[this.profile.fragmentationDepthKm,'Fragmentation / ash + gas (illustrative)','#bebbb3']];
      for(const [depth,label,color] of zones){if(depth===null)continue;const a=this.worldToScreen(-this.profile.widthKm/2,depth),b=this.worldToScreen(this.profile.widthKm/2,depth);ctx.strokeStyle=color;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=color;ctx.font='10px system-ui';ctx.fillText(label,a.x+5,a.y-4);}
    }
    drawSpecialFeatures(ctx) {
      const p=this.profile;
      if(this.eruptionId==='pinatubo1991' && this.timeline<.18){const a=this.worldToScreen(0,8.5);ctx.fillStyle='#e2aa71';ctx.font='10px system-ui';ctx.fillText('Basalt recharge: heat + gas (inferred)',a.x+8,a.y);}
      if(p.marineIngress && this.active()){const a=this.worldToScreen(p.marineIngress.x,p.marineIngress.depthKm);ctx.strokeStyle='#6fbdde';ctx.setLineDash([2,4]);ctx.beginPath();ctx.moveTo(a.x-25,a.y-20);ctx.lineTo(a.x,a.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#a5d1e3';ctx.font='10px system-ui';ctx.fillText('Water–magma interaction: debated',a.x+8,a.y-10);}
      if(p.cryptodome && this.timeline<.19){const c=p.cryptodome,a=this.worldToScreen(c.x,c.depthKm),l=this.layout();ctx.fillStyle='#b95434';ctx.beginPath();ctx.ellipse(a.x,a.y,c.rxKm*l.sx,c.ryKm*l.sy,0,0,Math.PI*2);ctx.fill();}
      if(this.eruptionId==='sthelenr1980' && this.timeline>=.19 && this.timeline<.34){const a=this.worldToScreen(-1.6,-1.3);ctx.fillStyle='#cbb8a0';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x-55,a.y-15);ctx.lineTo(a.x-55,a.y+15);ctx.closePath();ctx.fill();}
      if(p.ringFaults && this.stage().collapse>0){ctx.strokeStyle='#b99576';ctx.setLineDash([5,3]);for(const f of p.ringFaults){const a=this.worldToScreen(f.x,f.y1),b=this.worldToScreen(f.x,f.y2);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.setLineDash([]);}
      if(this.timeline===0){ctx.fillStyle='#e2b978';for(let i=0;i<12;i++){const a=this.worldToScreen(Math.sin(i*4)*2,2+(i%5));ctx.fillRect(a.x,a.y,2,2);}}
    }
    drawDepthAxes(ctx) {
      const l=this.layout();ctx.font='10px system-ui';ctx.fillStyle='#eee0cf';ctx.textAlign='right';
      const step=this.profile.maxDepthKm>20?10:2;
      for(let d=0;d<=this.profile.maxDepthKm;d+=step){const a=this.worldToScreen(-this.profile.widthKm/2,d);ctx.fillText(`${d} km`,l.left-8,a.y+3);}
      ctx.textAlign='left';ctx.fillText(`Depth below ${this.profile.section.reference}`,l.left,l.top-12);
      const y=l.top+10, length=this.profile.widthKm/5;ctx.strokeStyle='#eee0cf';ctx.beginPath();ctx.moveTo(l.left,y);ctx.lineTo(l.left+length*l.sx,y);ctx.stroke();
      ctx.fillText(`${length} km · V.E. ${l.ve.toFixed(2)}× · sheets ${this.trueScale?'at scale':'enlarged'}`,l.left,y+15);
      ctx.fillText(this.profile.section.orientation,l.left,y+30);
    }
    drawAnnotations(ctx) {
      this.profile.annotations.forEach((note,i)=>{const a=this.worldToScreen(note.x,note.depthKm);ctx.fillStyle='#ffd4a2';ctx.beginPath();ctx.arc(a.x,a.y,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#271b17';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText(String(i+1),a.x,a.y+3);});ctx.textAlign='left';
    }
  }
  window.VolcanoConduitEngine = VolcanoConduitEngine;
  window.HISTORICAL_CONDUITS = HISTORICAL_CONDUITS;
})();
