// Volcano Simulator terrain: height field and vertex colours (pure, no DOM, no Three.js).
//
// A volcano's height at a point is split in two:
//   baseHeight()   the expensive part that never changes during an eruption: the real
//                  heightmap plus its noise micro-relief, or the whole parametric cone.
//   finishHeight() the cheap part the timeline drives (St Helens' bulge and collapse,
//                  Tambora/Krakatoa caldera collapse, Eyjafjallajökull ice melt) plus the
//                  fade to the surrounding landscape.
// height() = finishHeight(baseHeight()) gives the same numbers the lesson always drew.
//
// createTerrainGrid() caches baseHeight and the colour noise for every vertex (and the four
// slope neighbours each one samples), so scrubbing or playing the timeline only redoes the
// cheap part, and reports when nothing moved so the page can skip re-uploading the mesh.

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Slope samples sit this far either side of a point (world units).
export const SLOPE_EPS = 0.25;

// High-precision smooth Hermite bilinear heightmap sampler
export function sampleHeightmap(hmap, u, v) {
  if (!hmap || !hmap.data) return 0;
  const fx = Math.max(0, Math.min(1, u)) * (hmap.width - 1);
  const fy = Math.max(0, Math.min(1, v)) * (hmap.height - 1);
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const x1 = Math.min(x0 + 1, hmap.width - 1);
  const y1 = Math.min(y0 + 1, hmap.height - 1);
  const tx = fx - x0, ty = fy - y0;
  // Hermite S-curve smoothing
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const d = hmap.data;
  const w = hmap.width;
  const h00 = d[y0 * w + x0];
  const h10 = d[y0 * w + x1];
  const h01 = d[y1 * w + x0];
  const h11 = d[y1 * w + x1];
  const top = h00 + (h10 - h00) * sx;
  const bot = h01 + (h11 - h01) * sx;
  return top + (bot - top) * sy;
}

/**
 * @param {{ size: number, fbm: (x: number, y: number, octaves: number) => number }} opts
 *   size: the terrain square's side (world units); fbm: SimKit.noise.fbm.
 */
export function createVolcanoTerrain({ size, fbm }) {
  const TERRAIN_SIZE = size;

  // Timeline-independent height. `hmap` is the eruption's heightmap, or null for the
  // parametric (Exploration) models.
  function baseHeight(x, z, vtype, hmap) {
    if (hmap) {
      // Continuous UV coordinate mapping
      const u = (x + TERRAIN_SIZE / 2) / TERRAIN_SIZE;
      const v = (z + TERRAIN_SIZE / 2) / TERRAIN_SIZE;
      let rawH = sampleHeightmap(hmap, u, v) * 12.0;

      // Sub-grid geological micro-relief to eliminate 8-bit stairstepping
      const micro = (fbm(x * 0.45 + 12.3, z * 0.45 + 87.1, 3) - 0.5) * 0.14
                  + (fbm(x * 1.4 + 54.1, z * 1.4 + 21.7, 2) - 0.5) * 0.04;
      rawH += micro;
      return rawH;
    }

    // Procedural Geomorphological Models (Exploration Mode)
    const r = Math.hypot(x, z);
    const R = TERRAIN_SIZE * 0.38;
    const theta = Math.atan2(z, x);
    const noise = (fbm(x * 0.16 + 1.7, z * 0.16 + 4.9, 5) - 0.5) * 1.1;
    const micro = (fbm(x * 0.65 + 99.1, z * 0.65 + 33.4, 3) - 0.5) * 0.28;

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
    return h;
  }

  // Timeline-driven landform changes and the fade to the landscape, applied to baseHeight().
  function finishHeight(x, z, vtype, stage, hmap, eruption, base) {
    const isIsland = (vtype === 'shield' || eruption === 'krakatoa1883' || eruption === 'maunaloa2022');
    const baseH = isIsland ? -0.45 : 0.08;
    const boxDist = Math.max(Math.abs(x), Math.abs(z)) / (TERRAIN_SIZE * 0.5);

    if (hmap) {
      let rawH = base;
      // Dynamic historical morphological changes:
      if (eruption === 'sthelenr1980') {
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

      if ((eruption === 'tambora1815' || eruption === 'krakatoa1883') && stage > 0) {
        const collapseStart = eruption === 'tambora1815' ? 0.52 : 0.62;
        const collapseStage = Math.min(1, Math.max(0, (stage - collapseStart) / 0.22));
        if (collapseStage > 0) {
          const r = Math.hypot(x, z);
          const collR = eruption === 'tambora1815' ? 7.2 : 6.0;
          if (r < collR) {
            const depth = eruption === 'tambora1815' ? 8.2 : 9.5;
            rawH -= Math.pow(1 - r / collR, 1.7) * collapseStage * depth;
          }
        }
      }

      if (eruption === 'eyja2010' && stage >= 0.14) {
        const meltStage = Math.min(1, (stage - 0.14) / 0.20);
        const r = Math.hypot(x, z);
        if (r < 3.5) {
          rawH -= meltStage * 1.5 * Math.pow(1 - r / 3.5, 2);
        }
      }

      // Smooth perimeter falloff to ambient landscape (eliminates floating slab / cliff edges)
      if (isIsland && eruption === 'krakatoa1883') {
        rawH = Math.max(-0.55, rawH - 0.28);
      }
      if (boxDist <= 0.65) return rawH;
      if (boxDist >= 0.98) return baseH;
      const t = (boxDist - 0.65) / 0.33;
      const s = t * t * t * (t * (t * 6 - 15) + 10);
      return lerp(rawH, baseH, s);
    }

    // Smooth edge falloff to ambient landscape
    const h = base;
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

  function height(x, z, vtype, stage, hmap, eruption) {
    return finishHeight(x, z, vtype, stage, hmap, eruption, baseHeight(x, z, vtype, hmap));
  }

  // Noise terms of the vertex colour that depend only on position.
  const heightNoise = (x, z) => (fbm(x * 0.35, z * 0.35, 3) - 0.5) * 0.12;
  const strataNoise = (x, z) => fbm(x * 0.8, z * 0.8, 2) * 2.2;
  const colourNoise = (x, z) => (fbm(x * 0.85, z * 0.85, 2) - 0.5) * 0.08;
  // Brightness variation under a real colour map.
  const mapStrata = (x, z) => 0.96 + (fbm(x * 0.7, z * 0.7, 2) - 0.5) * 0.10;

  // High-Fidelity Geological Vertex Coloring & Slope Shading. hL/hR/hD/hU are the heights
  // SLOPE_EPS to the -x/+x/-z/+z side; nN/sN/cN are heightNoise/strataNoise/colourNoise here.
  function colourFrom(x, z, y, maxH, vtype, stage, eruption, hL, hR, hD, hU, nN, sN, cN) {
    const r = Math.hypot(x, z);
    const theta = Math.atan2(z, x);
    const hFrac = clamp(y / Math.max(0.1, maxH), 0, 1);

    // Local slope grade calculation
    const slopeGrade = Math.hypot(hL - hR, hD - hU) / (SLOPE_EPS * 2.0);
    const cliff = clamp((slopeGrade - 0.25) / 0.55, 0, 1);

    // Procedural height noise variance
    const nH = clamp(hFrac + nN, 0, 1);

    // Geological strata layering for cliffs & rock faces
    const strata = Math.sin(y * 6.5 + sN) * 0.5 + 0.5;
    const rockTone = lerp(0.24, 0.46, strata);
    const cliffColor = [rockTone * 1.05, rockTone * 0.98, rockTone * 0.92];

    let rC, gC, bC;

    if (eruption === 'eyja2010') {
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
    } else if (vtype === 'shield' || eruption === 'maunaloa2022') {
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
    return [
      clamp(rC + cN, 0, 1),
      clamp(gC + cN, 0, 1),
      clamp(bC + cN, 0, 1)
    ];
  }

  // Vertex colour at one point, sampling everything itself (the uncached reference path).
  function colour(x, z, y, maxH, vtype, stage, hmap, eruption) {
    const e = SLOPE_EPS;
    return colourFrom(x, z, y, maxH, vtype, stage, eruption,
      height(x - e, z, vtype, stage, hmap, eruption), height(x + e, z, vtype, stage, hmap, eruption),
      height(x, z - e, vtype, stage, hmap, eruption), height(x, z + e, vtype, stage, hmap, eruption),
      heightNoise(x, z), strataNoise(x, z), colourNoise(x, z));
  }

  // Shading under a satellite colour map: cliffs darken, plus a little strata variation.
  function mapShadeFrom(hL, hR, hD, hU, strata) {
    const sx = (hR - hL) / (SLOPE_EPS * 2.0);
    const sz = (hU - hD) / (SLOPE_EPS * 2.0);
    const slopeGrade = Math.hypot(sx, sz);
    const cliffShade = clamp(1.0 - slopeGrade * 0.28, 0.72, 1.05);
    return cliffShade * strata;
  }

  /**
   * A cached terrain grid over fixed vertex positions xs/zs (Float64Array or plain arrays).
   * update() writes heights and colours into `out` ({ heights, colors }; pass a Float32Array
   * for heights, since colours read the height back at the precision the mesh stores it)
   * and returns { maxH, changed }. `changed` is false when no height
   * (or slope neighbour) and no colour input differs from the last call, so the caller
   * can skip recomputing normals and re-uploading the mesh.
   */
  function createTerrainGrid(xs, zs) {
    const n = xs.length;
    const e = SLOPE_EPS;
    // Five sample sets: the vertex itself and its four slope neighbours.
    const OFF = [[0, 0], [-e, 0], [e, 0], [0, -e], [0, e]];
    // (x + 0 would turn -0 into +0, which atan2 tells apart, so unshifted coordinates stay as given.)
    const px = OFF.map(([dx]) => Float64Array.from(xs, (x) => (dx ? x + dx : x)));
    const pz = OFF.map(([, dz]) => Float64Array.from(zs, (z) => (dz ? z + dz : z)));
    let baseKey = null;
    let base = null;
    let noise = null;    // [heightNoise, strataNoise, colourNoise] per vertex
    let mapNoise = null; // mapStrata per vertex
    const cur = OFF.map(() => new Float64Array(n));
    const prev = OFF.map(() => new Float64Array(n));
    let last = null;

    // `force` (a freshly built mesh) always writes `out`, even if nothing changed.
    function update({ vtype, stage, hmap, eruption, hasColormap, force = false }, out) {
      if (force) last = null;
      // Base heights depend on the model (heightmap or parametric type) only.
      const key = hmap || vtype;
      if (key !== baseKey) {
        baseKey = key;
        base = OFF.map((_, k) => {
          const b = new Float64Array(n);
          for (let i = 0; i < n; i++) b[i] = baseHeight(px[k][i], pz[k][i], vtype, hmap);
          return b;
        });
        last = null;
      }

      for (let k = 0; k < 5; k++) {
        const c = cur[k], b = base[k], x = px[k], z = pz[k];
        for (let i = 0; i < n; i++) c[i] = finishHeight(x[i], z[i], vtype, stage, hmap, eruption, b[i]);
      }

      let maxH = 0;
      const h0 = cur[0];
      for (let i = 0; i < n; i++) if (h0[i] > maxH) maxH = h0[i];

      // Colours read only heights, maxH, the model, and (for Eyjafjallajökull) the stage.
      const sameInputs = last && last.vtype === vtype && last.eruption === eruption &&
        last.hasColormap === hasColormap && (hasColormap || eruption !== 'eyja2010' || last.stage === stage);
      let same = !!sameInputs;
      for (let k = 0; same && k < 5; k++) {
        const c = cur[k], p = prev[k];
        for (let i = 0; i < n; i++) if (c[i] !== p[i]) { same = false; break; }
      }
      for (let k = 0; k < 5; k++) prev[k].set(cur[k]);
      last = { vtype, stage, eruption, hasColormap };
      if (same) return { maxH, changed: false };

      const { heights, colors } = out;
      for (let i = 0; i < n; i++) heights[i] = h0[i];

      const [, hL, hR, hD, hU] = cur;
      if (hasColormap) {
        if (!mapNoise) mapNoise = Float64Array.from(xs, (x, i) => mapStrata(x, zs[i]));
        for (let i = 0; i < n; i++) {
          const f = mapShadeFrom(hL[i], hR[i], hD[i], hU[i], mapNoise[i]);
          colors[i * 3] = f; colors[i * 3 + 1] = f; colors[i * 3 + 2] = f;
        }
      } else {
        if (!noise) {
          noise = [heightNoise, strataNoise, colourNoise].map((fn) => Float64Array.from(xs, (x, i) => fn(x, zs[i])));
        }
        const [nN, sN, cN] = noise;
        for (let i = 0; i < n; i++) {
          // y is the stored (Float32) height, as the mesh holds it.
          const [r, g, b] = colourFrom(xs[i], zs[i], heights[i], maxH, vtype, stage, eruption,
            hL[i], hR[i], hD[i], hU[i], nN[i], sN[i], cN[i]);
          colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
        }
      }
      return { maxH, changed: true };
    }

    return { update, count: n };
  }

  /**
   * height() for callers that keep sampling the same points (the lava flow's grids re-read the
   * ground whenever it moves): each point's baseHeight is remembered until the model changes.
   * Don't use it for one-off random points; they would only fill the cache.
   */
  function createHeightSampler() {
    let key = null;
    let rows = new Map();
    return function sample(x, z, vtype, stage, hmap, eruption) {
      const k = hmap || vtype;
      if (k !== key) { key = k; rows = new Map(); }
      let row = rows.get(x);
      if (!row) rows.set(x, (row = new Map()));
      let base = row.get(z);
      if (base === undefined) row.set(z, (base = baseHeight(x, z, vtype, hmap)));
      return finishHeight(x, z, vtype, stage, hmap, eruption, base);
    };
  }

  return { baseHeight, finishHeight, height, colour, colourFrom, mapShadeFrom, mapStrata, createTerrainGrid, createHeightSampler };
}
