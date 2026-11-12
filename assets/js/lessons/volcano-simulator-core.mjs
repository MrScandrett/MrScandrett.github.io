/* DOM-free helpers of the Volcano Simulator (lessons/earth-science/volcano-simulator.html): the smooth heightmap
 * sampler that turns real-volcano elevation images into terrain, and the labels for volcano type and magma
 * viscosity. Moved unchanged out of the page's inline module <script>; volcano-simulator.mjs imports them.
 * Tested in tests/volcano-simulator-core.test.mjs. */
    // High-precision smooth Hermite bilinear heightmap sampler
    function sampleHeightmap(hmap, u, v) {
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

    function lerp(a, b, t) { return a + (b - a) * t; }

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function vtypeName(t) {
      return { shield:'Shield Volcano', strato:'Stratovolcano', caldera:'Caldera', super:'Supervolcano', cinder:'Cinder Cone' }[t] || t;
    }

    function viscosityLabel(v) {
      if (v < 25) return 'Basaltic (~50% SiO₂)';
      if (v < 50) return 'Andesitic (~58% SiO₂)';
      if (v < 75) return 'Dacitic (~65% SiO₂)';
      return 'Rhyolitic (~73% SiO₂)';
    }
  export { sampleHeightmap, lerp, clamp, vtypeName, viscosityLabel };
