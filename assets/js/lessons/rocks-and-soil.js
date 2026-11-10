/* Rocks and Soil lesson (lessons/earth-science/rocks-and-soil.html).
 * Moved out of the page's inline <script>, unchanged. */
  (()=>{
    const { classifySoil } = RocksSoilCore;
    /* =========================================================================
       1. HORIZONS INTERACTIVE DATA & LOGIC
       ========================================================================= */
    const horizonsData = {
      O: {
        title: "O Horizon: Organic Humus Layer",
        desc: "The uppermost skin of the forest or meadow. Consists of decomposing plant debris, decomposing leaf litter, mycelial networks, insects, and dark decomposed organic matter (humus). Humus acts like a sponge, holding up to 90% of its weight in water.",
        organic: "> 20–90%",
        bio: "Maximal (Earthworms, Fungi)",
        water: "Extremely High (Spongy)",
        agri: "Critical Top Soil Conditioner",
        note: "In cultivated farmland, the O and A horizons are often churned together by plowing into an Ap horizon."
      },
      A: {
        title: "A Horizon: Topsoil (Mineral & Humus)",
        desc: "The vital agricultural layer where mineral particles (sand, silt, clay) are intimately bonded with humified organic matter. It possesses a granular crumb structure that roots easily penetrate, rich in bio-available nitrogen, phosphorus, and potassium.",
        organic: "5–20%",
        bio: "Very High (Bacterial colonies, root rhizosphere)",
        water: "High (Balanced retention and drainage)",
        agri: "Prime Crop Production Zone",
        note: "Topsoil loss through erosion (wind and sheet wash) is one of the most critical threats to global food security."
      },
      E: {
        title: "E Horizon: Eluviation / Leaching Layer",
        desc: "A distinctly bleached, pale grayish layer common in acidic forest soils. Percolating rainwater dissolves and flushes out ('eluviates') fine clay silicate platelets, organic acids, and iron/aluminum oxides downward into the B horizon.",
        organic: "< 2%",
        bio: "Low (Few active feeder roots)",
        water: "Moderate Drainage",
        agri: "Nutrient-Poor Zone",
        note: "The 'E' stands for eluviation (French: washing out). Resistant quartz sand and silt grains dominate this layer."
      },
      B: {
        title: "B Horizon: Subsoil (Illuviation / Accumulation)",
        desc: "The zone of illuviation where clays, iron/aluminum oxides, and soluble compounds leached from higher horizons accumulate. Often exhibits a rich reddish-brown or yellowish color from iron oxidation (rusting) and develops blocky or prismatic structure.",
        organic: "1–3%",
        bio: "Moderate (Deep taproots, burrowing fauna)",
        water: "High (Clay stores moisture during droughts)",
        agri: "Nutrient Reservoir for Perennial Roots",
        note: "In arid regions, evaporating groundwater can deposit hard cement-like calcium carbonate crusts here called 'caliche'."
      },
      C: {
        title: "C Horizon: Weathered Bedrock (Regolith / Saprolite)",
        desc: "Partially decomposed, crumbling parent material unaffected by biological soil-forming processes. It consists of fractured boulders, weathered gravel, and disintegrated minerals that have not yet undergone pedogenesis.",
        organic: "Near 0%",
        bio: "Minimal (Deep subterranean microbes)",
        water: "Low storage, fracture flow",
        agri: "Negligible (Mineral reservoir only)",
        note: "The C horizon directly reflects the parent mineralogy of the local bedrock or alluvial sediment deposit."
      },
      R: {
        title: "R Horizon: Solid Unweathered Bedrock",
        desc: "Continuous, dense solid parent stone (such as granite, limestone, basalt, or shale) that cannot be dug with a spade. This is the impenetrable geologic foundation of the landscape upon which all upper horizons are slowly manufactured over millions of years.",
        organic: "0%",
        bio: "Zero (Except deep endolithic extremophiles)",
        water: "Impenetrable except along major fault fissures",
        agri: "None (Foundation stratum)",
        note: "The depth to R bedrock ranges from zero (outcrops on steep mountain peaks) to tens of meters in tropical rainforest valleys."
      }
    };

    const horizonBtns = document.querySelectorAll('.horizon-btn');
    const hTitle = document.getElementById('hDetailTitle');
    const hDesc = document.getElementById('hDetailDesc');
    const hOrg = document.getElementById('hDetailOrganic');
    const hBio = document.getElementById('hDetailBio');
    const hWater = document.getElementById('hDetailWater');
    const hAgri = document.getElementById('hDetailAgri');
    const hNote = document.getElementById('hDetailNote');

    horizonBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        horizonBtns.forEach(b => b.setAttribute('aria-selected', 'false'));
        btn.setAttribute('aria-selected', 'true');
        const code = btn.dataset.h;
        const d = horizonsData[code];
        if (!d) return;
        hTitle.textContent = d.title;
        hDesc.textContent = d.desc;
        hOrg.textContent = d.organic;
        hBio.textContent = d.bio;
        hWater.textContent = d.water;
        hAgri.textContent = d.agri;
        hNote.textContent = d.note;
      });
    });

    /* =========================================================================
       2. WEATHERING SIMULATOR CANVAS & MECHANICS (PHYSICALLY-BASED REALISM)
       ========================================================================= */
    const canvas = document.getElementById('weatheringCanvas');
    const ctx = canvas.getContext('2d');
    let animId = null;

    let rockIntegrity = 100;
    let gravelMass = 0;
    let soilMass = 0;
    let simYears = 0;
    let particles = [];
    let cracks = [];
    let iceCrystals = [];
    let effervescenceBubbles = [];
    let oxidationHalos = [];
    let talusMound = [];
    let simTime = 0;

    // Generate natural multi-faceted rock boulder silhouette
    function generateBoulderContour(scale = 1.0) {
      const pts = [];
      const numPts = 28;
      // Fixed pseudo-random seed table for reproducible organic rock geometry
      const offsets = [
        0.98, 1.04, 1.12, 1.08, 0.95, 0.88, 0.92, 1.06, 1.14, 1.10, 1.02, 0.94,
        0.89, 0.85, 0.92, 1.02, 1.10, 1.15, 1.08, 0.98, 0.91, 0.87, 0.94, 1.05,
        1.12, 1.08, 0.99, 0.95
      ];
      for (let i = 0; i < numPts; i++) {
        const ang = (i / numPts) * Math.PI * 2;
        const radX = 145 * scale * offsets[i];
        const radY = 105 * scale * offsets[(i + 7) % numPts];
        pts.push({
          x: Math.cos(ang) * radX,
          y: Math.sin(ang) * radY
        });
      }
      return pts;
    }

    let boulderPoints = generateBoulderContour(1.0);

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = (rect.height || 360) * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawWeatheringScene();
    }
    window.addEventListener('resize', resizeCanvas);

    function initRock() {
      rockIntegrity = 100;
      gravelMass = 0;
      soilMass = 0;
      simYears = 0;
      particles = [];
      cracks = [];
      iceCrystals = [];
      effervescenceBubbles = [];
      oxidationHalos = [];
      talusMound = [];
      boulderPoints = generateBoulderContour(1.0);
      updateHud();
      drawWeatheringScene();
    }

    function updateHud() {
      document.getElementById('hudIntegrity').textContent = Math.max(0, Math.round(rockIntegrity)) + '%';
      document.getElementById('hudGravel').textContent = Math.round(gravelMass) + ' kg';
      document.getElementById('hudSoil').textContent = Math.round(soilMass) + ' kg';
      document.getElementById('hudYears').textContent = simYears + ' Yrs';
    }

    function drawWeatheringScene() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);

      simTime += 0.016;

      const rockType = document.getElementById('rockSelect').value;
      const agent = document.getElementById('agentSelect').value;

      // 1. Dynamic Environment Backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.72);
      if (agent === 'freeze-thaw') {
        // Frosty alpine sky
        skyGrad.addColorStop(0, '#0c1a2e');
        skyGrad.addColorStop(0.5, '#1e293b');
        skyGrad.addColorStop(1, '#64748b');
      } else if (agent === 'acid-rain') {
        // Stormy overcast sky with acidic rain
        skyGrad.addColorStop(0, '#0f172a');
        skyGrad.addColorStop(0.5, '#334155');
        skyGrad.addColorStop(1, '#475569');
      } else if (agent === 'oxidation') {
        // Arid desert sunrise / oxygenating sun
        skyGrad.addColorStop(0, '#1c1917');
        skyGrad.addColorStop(0.5, '#451a03');
        skyGrad.addColorStop(1, '#78350f');
      } else {
        // Hydrolysis temperate humid sky
        skyGrad.addColorStop(0, '#062016');
        skyGrad.addColorStop(0.5, '#134e4a');
        skyGrad.addColorStop(1, '#334155');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.72);

      // Distant mountain ridgelines with atmospheric aerial perspective
      ctx.save();
      ctx.fillStyle = agent === 'freeze-thaw' ? '#334155' : '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.52);
      for (let x = 0; x <= w; x += 30) {
        const peakY = h * 0.44 + Math.sin(x * 0.015) * 22 + Math.cos(x * 0.035) * 14;
        ctx.lineTo(x, peakY);
      }
      ctx.lineTo(w, h * 0.72);
      ctx.lineTo(0, h * 0.72);
      ctx.fill();

      // Atmospheric Weather Phenomena
      if (agent === 'freeze-thaw') {
        // Falling snowflakes / frost crystals
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        for (let s = 0; s < 30; s++) {
          const sx = (s * 41 + simTime * 25) % w;
          const sy = (s * 33 + simTime * 45) % (h * 0.72);
          ctx.beginPath();
          ctx.arc(sx, sy, Math.sin(s) * 1.2 + 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (agent === 'acid-rain') {
        // Slanted acidic rain streaks
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1.2;
        for (let r = 0; r < 25; r++) {
          const rx = (r * 37 + simTime * 90) % w;
          const ry = (r * 29 + simTime * 140) % (h * 0.72);
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 8, ry + 16);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 2. Stratified Soil Ground Cross-Section (O, A, B horizons visible)
      const groundY = h * 0.72;
      const soilGrad = ctx.createLinearGradient(0, groundY, 0, h);
      soilGrad.addColorStop(0, '#1c1917'); // O-horizon: dark organic humus topsoil
      soilGrad.addColorStop(0.18, '#3d2614'); // A-horizon: rich mineral loam
      soilGrad.addColorStop(0.55, '#78350f'); // B-horizon: clay/iron accumulation subsoil
      soilGrad.addColorStop(1, '#292524'); // C-horizon: weathered bedrock saprolite
      ctx.fillStyle = soilGrad;
      ctx.fillRect(0, groundY, w, h - groundY);

      // Soil horizon boundary lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 15); ctx.lineTo(w, groundY + 15);
      ctx.moveTo(0, groundY + 45); ctx.lineTo(w, groundY + 45);
      ctx.stroke();

      // Horizon labels on the side
      ctx.font = '600 9px Inter, sans-serif';
      ctx.fillStyle = 'rgba(226, 232, 240, 0.4)';
      ctx.fillText('O/A Topsoil (Humus)', 12, groundY + 12);
      ctx.fillText('B Subsoil (Clay/Iron)', 12, groundY + 38);
      ctx.fillText('C Saprolite Bedrock', 12, groundY + 68);

      // 3. Accumulated Talus Apron / Scree Cone at Boulder Base
      if (talusMound.length > 0) {
        ctx.save();
        talusMound.forEach(t => {
          ctx.fillStyle = t.color;
          ctx.beginPath();
          if (t.isAngular) {
            ctx.rect(t.x - t.size * 0.5, t.y - t.size * 0.5, t.size, t.size);
          } else {
            ctx.arc(t.x, t.y, t.size * 0.5, 0, Math.PI * 2);
          }
          ctx.fill();
        });
        ctx.restore();
      }

      // 4. Center Photorealistic Faceted Boulder
      const scale = Math.max(0.25, rockIntegrity / 100);
      const cx = w * 0.5;
      const cy = groundY - 45 * scale;

      // Contact ambient occlusion shadow under boulder
      const shadowGrad = ctx.createRadialGradient(cx, groundY - 5, 20, cx, groundY - 5, 160 * scale);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
      shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.45)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(cx, groundY - 5, 165 * scale, 22 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(cx, cy);

      // Base shading gradient across the boulder volume
      const rockSunGrad = ctx.createLinearGradient(-120 * scale, -90 * scale, 120 * scale, 90 * scale);
      if (rockType === 'granite') {
        rockSunGrad.addColorStop(0, '#c7c2be');
        rockSunGrad.addColorStop(0.35, '#9e9690');
        rockSunGrad.addColorStop(0.7, '#6b6661');
        rockSunGrad.addColorStop(1, '#3b3734');
      } else if (rockType === 'basalt') {
        rockSunGrad.addColorStop(0, '#475569');
        rockSunGrad.addColorStop(0.3, '#334155');
        rockSunGrad.addColorStop(0.7, '#1e293b');
        rockSunGrad.addColorStop(1, '#090d16');
      } else if (rockType === 'sandstone') {
        rockSunGrad.addColorStop(0, '#fcd34d');
        rockSunGrad.addColorStop(0.35, '#d97706');
        rockSunGrad.addColorStop(0.7, '#b45309');
        rockSunGrad.addColorStop(1, '#78350f');
      } else if (rockType === 'limestone') {
        rockSunGrad.addColorStop(0, '#f1f5f9');
        rockSunGrad.addColorStop(0.35, '#cbd5e1');
        rockSunGrad.addColorStop(0.7, '#94a3b8');
        rockSunGrad.addColorStop(1, '#475569');
      }

      // Draw faceted boulder contour path
      ctx.beginPath();
      boulderPoints.forEach((pt, idx) => {
        const px = pt.x * scale;
        const py = pt.y * scale - 25 * scale;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = rockSunGrad;
      ctx.fill();

      // Clip to boulder boundary to paint authentic mineral textures
      ctx.save();
      ctx.clip();

      // MINERAL TEXTURES BY ROCK TYPE
      if (rockType === 'granite') {
        // Phaneritic coarse crystalline texture (Quartz, Pink Feldspar, White Plagioclase, Biotite Mica)
        // 1. Salmon-pink potassium feldspar phenocrysts
        ctx.fillStyle = 'rgba(244, 162, 97, 0.45)';
        for (let i = 0; i < 40; i++) {
          const fx = ((i * 37) % 240 - 120) * scale;
          const fy = ((i * 29) % 180 - 90) * scale;
          ctx.beginPath();
          ctx.ellipse(fx, fy, (12 + (i % 6) * 2) * scale, (8 + (i % 4) * 2) * scale, (i * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
        // 2. Translucent glassy quartz crystals
        ctx.fillStyle = 'rgba(241, 245, 249, 0.55)';
        for (let i = 0; i < 50; i++) {
          const qx = ((i * 47) % 250 - 125) * scale;
          const qy = ((i * 31) % 190 - 95) * scale;
          ctx.beginPath();
          ctx.arc(qx, qy, (4 + (i % 4)) * scale, 0, Math.PI * 2);
          ctx.fill();
        }
        // 3. Black sparkling biotite mica flakes (with specular sparkle)
        for (let i = 0; i < 70; i++) {
          const mx = ((i * 53) % 260 - 130) * scale;
          const my = ((i * 43) % 200 - 100) * scale;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(mx, my, (5 + (i % 3)) * scale, (2 + (i % 2)) * scale);
          // Specular glint
          if ((i + Math.floor(simTime * 4)) % 12 === 0) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(mx + 1, my, 1.5, 1.5);
          }
        }
      } else if (rockType === 'basalt') {
        // Extrusive volcanic basalt with vesicular gas bubbles & olivine crystals
        // 1. Gas vesicles (elliptical cavities)
        for (let i = 0; i < 55; i++) {
          const vx = ((i * 43) % 240 - 120) * scale;
          const vy = ((i * 37) % 180 - 90) * scale;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.ellipse(vx, vy, (4 + (i % 4)) * scale, (3 + (i % 3)) * scale, 0.3, 0, Math.PI * 2);
          ctx.fill();
          // Cavity rim highlight
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        // 2. Translucent olive-green olivine phenocrysts
        ctx.fillStyle = 'rgba(132, 204, 22, 0.65)';
        for (let i = 0; i < 30; i++) {
          const ox = ((i * 61) % 230 - 115) * scale;
          const oy = ((i * 47) % 170 - 85) * scale;
          ctx.beginPath();
          ctx.arc(ox, oy, (3 + (i % 3)) * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (rockType === 'sandstone') {
        // Clastic sedimentary sandstone with rhythmic cross-bedding laminations
        for (let y = -100; y <= 90; y += 6) {
          const wave = Math.sin(y * 0.08) * 8 * scale;
          ctx.strokeStyle = (y % 12 === 0) ? 'rgba(180, 83, 9, 0.45)' : 'rgba(254, 215, 170, 0.35)';
          ctx.lineWidth = 2.5 * scale;
          ctx.beginPath();
          ctx.moveTo(-130 * scale, (y + wave) * scale);
          ctx.lineTo(130 * scale, (y - wave * 0.5) * scale);
          ctx.stroke();
        }
        // Quartz sand grains
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        for (let i = 0; i < 90; i++) {
          const sx = ((i * 39) % 240 - 120) * scale;
          const sy = ((i * 31) % 180 - 90) * scale;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (rockType === 'limestone') {
        // Bioclastic marine carbonate with fossil fragments and stylolite seams
        // Fossil fragments (crinoid rings & shell cross-sections)
        ctx.strokeStyle = 'rgba(241, 245, 249, 0.65)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 35; i++) {
          const fx = ((i * 51) % 230 - 115) * scale;
          const fy = ((i * 41) % 170 - 85) * scale;
          ctx.beginPath();
          ctx.arc(fx, fy, (5 + (i % 4) * 2) * scale, 0, Math.PI * 1.4);
          ctx.stroke();
        }
        // Dark stylolite suture line
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let sx = -110 * scale, sy = 5 * scale;
        ctx.moveTo(sx, sy);
        while (sx < 110 * scale) {
          sx += (8 + (sx % 5)) * scale;
          sy += Math.sin(sx * 0.2) * 5 * scale;
          ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // 5. Active Weathering Visual Phenomena Overlay on Rock
      // A) Chemical Oxidation Halos (Rust Creep)
      if (oxidationHalos.length > 0) {
        oxidationHalos.forEach(h => {
          const rustGrad = ctx.createRadialGradient(h.x * scale, h.y * scale, 2, h.x * scale, h.y * scale, h.radius * scale);
          rustGrad.addColorStop(0, 'rgba(185, 28, 28, 0.75)'); // Brick hematite
          rustGrad.addColorStop(0.5, 'rgba(217, 119, 6, 0.55)'); // Golden limonite
          rustGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
          ctx.fillStyle = rustGrad;
          ctx.beginPath();
          ctx.arc(h.x * scale, h.y * scale, h.radius * scale, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // B) Freeze-Thaw Dendritic Ice Needles in Fissures
      if (agent === 'freeze-thaw' && cracks.length > 0) {
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.9)';
        ctx.lineWidth = 2.2;
        cracks.forEach(c => {
          ctx.beginPath();
          ctx.moveTo(c.x1 * scale, c.y1 * scale - 25 * scale);
          ctx.lineTo(c.x2 * scale, c.y2 * scale - 25 * scale);
          ctx.stroke();
        });
        // Frost frostwork on top facets
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(-80 * scale, -95 * scale, 160 * scale, 12 * scale);
      }

      // C) Chemical Dissolution Effervescence Bubbles (Acid Rain / Carbonation)
      if (agent === 'acid-rain' && effervescenceBubbles.length > 0) {
        effervescenceBubbles.forEach(b => {
          ctx.fillStyle = 'rgba(254, 249, 195, 0.75)';
          ctx.beginPath();
          ctx.arc(b.x * scale, b.y * scale - 25 * scale, b.r * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        });
      }

      ctx.restore(); // end clip

      // Boulder border & fracture cleavage edges
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      boulderPoints.forEach((pt, idx) => {
        const px = pt.x * scale;
        const py = pt.y * scale - 25 * scale;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();

      // Deep structural fracture cracks
      ctx.strokeStyle = '#05070a';
      ctx.lineWidth = 2.5;
      cracks.forEach(c => {
        ctx.beginPath();
        ctx.moveTo(c.x1 * scale, c.y1 * scale - 25 * scale);
        ctx.lineTo(c.x2 * scale, c.y2 * scale - 25 * scale);
        ctx.stroke();
        // Branch
        ctx.strokeStyle = 'rgba(10, 15, 25, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const mx = (c.x1 + c.x2) * 0.5 * scale;
        const my = (c.y1 + c.y2) * 0.5 * scale - 25 * scale;
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.sin(c.x1) * 16 * scale, my + Math.cos(c.y1) * 16 * scale);
        ctx.stroke();
      });

      ctx.restore(); // end translate boulder

      // 6. Falling and Dynamic Debris Particles
      particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (p.isAngular) {
          ctx.rect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
        } else {
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        }
        ctx.fill();
      });

      // Update falling particle physics
      particles.forEach(p => {
        p.vy += 0.45; // gravity
        p.x += p.vx;
        p.y += p.vy;
        if (p.y >= groundY - 5) {
          p.y = groundY - Math.random() * 8;
          p.vy = -p.vy * 0.25; // bounce
          p.vx *= 0.6;
          // Add to permanent talus mound
          if (talusMound.length < 180) {
            talusMound.push({
              x: p.x,
              y: p.y,
              size: p.size,
              color: p.color,
              isAngular: p.isAngular
            });
          }
        }
      });
      // Filter out settled particles
      particles = particles.filter(p => p.y < groundY - 4 || Math.abs(p.vy) > 0.5);

      // Float effervescence bubbles upwards
      effervescenceBubbles.forEach(b => {
        b.y -= 0.6;
        b.x += Math.sin(simTime * 5 + b.y) * 0.3;
      });
      effervescenceBubbles = effervescenceBubbles.filter(b => b.y > -80);
    }

    // Animation Loop for live physical weathering
    function startWeatheringLoop() {
      function frame() {
        drawWeatheringScene();
        animId = SimKit.frame('#weatheringCanvas', frame);
      }
      if (animId) SimKit.frame.cancel('#weatheringCanvas', animId);
      animId = SimKit.frame('#weatheringCanvas', frame);
    }
    startWeatheringLoop();

    function applyWeatheringStep() {
      if (rockIntegrity <= 8) return;

      const rockType = document.getElementById('rockSelect').value;
      const agent = document.getElementById('agentSelect').value;
      let rate = 14;

      // Realistic differential weathering rates
      if (rockType === 'limestone' && agent === 'acid-rain') rate = 32; // Highly soluble calcite
      if (rockType === 'granite' && agent === 'freeze-thaw') rate = 22; // Frost wedging along quartz/feldspar boundaries
      if (rockType === 'basalt' && agent === 'oxidation') rate = 26; // High mafic iron/olivine content oxidizes rapidly
      if (rockType === 'sandstone' && agent === 'freeze-thaw') rate = 24; // High porosity allows water absorption

      rockIntegrity = Math.max(5, rockIntegrity - rate);
      const brokenKg = rate * 28;
      gravelMass += brokenKg * 0.42;
      soilMass += brokenKg * 0.58;
      simYears += Math.round(60 + Math.random() * 90);

      // Deform boulder contour by chipping away points
      const chipIdx = Math.floor(Math.random() * boulderPoints.length);
      boulderPoints[chipIdx].x *= 0.88;
      boulderPoints[chipIdx].y *= 0.88;
      boulderPoints[(chipIdx + 1) % boulderPoints.length].x *= 0.92;

      // Spawn structural cracks
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 55;
      cracks.push({
        x1: Math.cos(angle) * r,
        y1: Math.sin(angle) * r,
        x2: Math.cos(angle + 0.6) * (r + 48),
        y2: Math.sin(angle + 0.6) * (r + 48)
      });

      // Spawn Agent-Specific Weathering Phenomena
      if (agent === 'oxidation') {
        for (let i = 0; i < 4; i++) {
          oxidationHalos.push({
            x: (Math.random() - 0.5) * 160,
            y: (Math.random() - 0.5) * 120,
            radius: Math.random() * 25 + 15
          });
        }
      }

      if (agent === 'acid-rain') {
        for (let i = 0; i < 28; i++) {
          effervescenceBubbles.push({
            x: (Math.random() - 0.5) * 180,
            y: (Math.random() - 0.5) * 100,
            r: Math.random() * 2.5 + 1.2
          });
        }
      }

      // Spawn falling debris particles with authentic granular colors
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const groundY = h * 0.72;

      let colorPalette = ['#d4a359', '#967d5e', '#a85832', '#64748b'];
      if (rockType === 'sandstone') colorPalette = ['#d97706', '#f59e0b', '#b45309', '#fed7aa'];
      else if (rockType === 'basalt') colorPalette = ['#334155', '#1e293b', '#64748b', '#78350f'];
      else if (rockType === 'limestone') colorPalette = ['#cbd5e1', '#94a3b8', '#e2e8f0', '#64748b'];

      for (let i = 0; i < 24; i++) {
        const isAngular = Math.random() > 0.35;
        particles.push({
          x: w * 0.5 + (Math.random() - 0.5) * 160,
          y: groundY - 60 + (Math.random() * 30),
          vx: (Math.random() - 0.5) * 4.5,
          vy: -Math.random() * 3 - 1,
          size: isAngular ? Math.random() * 6 + 3 : Math.random() * 3 + 1.2,
          color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
          isAngular: isAngular
        });
      }

      updateHud();
    }

    document.getElementById('startWeatheringBtn').addEventListener('click', applyWeatheringStep);
    document.getElementById('resetWeatheringBtn').addEventListener('click', initRock);
    document.getElementById('rockSelect').addEventListener('change', initRock);

    /* =========================================================================
       3. USDA SOIL TEXTURE TRIANGLE INTERACTIVE WITH MICROSCOPIC MORPHOLOGY SWATCH
       ========================================================================= */
    const triCanvas = document.getElementById('triangleCanvas');
    const tCtx = triCanvas.getContext('2d');
    const sandSlider = document.getElementById('sandSlider');
    const siltSlider = document.getElementById('siltSlider');
    const claySlider = document.getElementById('claySlider');
    const sandVal = document.getElementById('sandVal');
    const siltVal = document.getElementById('siltVal');
    const clayVal = document.getElementById('clayVal');

    let currentSand = 40;
    let currentSilt = 40;
    let currentClay = 20;


    function updateClassification() {
      sandVal.textContent = Math.round(currentSand) + '%';
      siltVal.textContent = Math.round(currentSilt) + '%';
      clayVal.textContent = Math.round(currentClay) + '%';

      const info = classifySoil(currentSand, currentSilt, currentClay);
      document.getElementById('soilClassTitle').textContent = info.name;
      document.getElementById('soilClassDesc').textContent = info.desc;

      document.getElementById('meterDrainVal').textContent = info.drain > 70 ? "Fast (" + (info.drain/10).toFixed(1) + " cm/hr)" : info.drain > 40 ? "Moderate (" + (info.drain/15).toFixed(1) + " cm/hr)" : "Slow (< 0.5 cm/hr)";
      document.getElementById('meterDrainBar').style.width = info.drain + '%';

      document.getElementById('meterNutrientVal').textContent = info.cec > 75 ? "High (Rich)" : info.cec > 40 ? "Moderate" : "Low (Leached)";
      document.getElementById('meterNutrientBar').style.width = info.cec + '%';

      document.getElementById('meterAirVal').textContent = info.air > 70 ? "Excellent" : info.air > 40 ? "Good" : "Poor (Compacted)";
      document.getElementById('meterAirBar').style.width = info.air + '%';

      document.getElementById('meterWorkVal').textContent = info.work > 70 ? "Easy (Friable)" : info.work > 40 ? "Medium" : "Hard (Heavy)";
      document.getElementById('meterWorkBar').style.width = info.work + '%';

      drawTriangle();
    }

    function drawTriangle() {
      const w = triCanvas.width;
      const h = triCanvas.height;
      tCtx.clearRect(0, 0, w, h);

      // Equilateral triangle vertices:
      // Top: 100% Clay
      // Bottom-Left: 100% Sand
      // Bottom-Right: 100% Silt
      const top = { x: w * 0.5, y: 35 };
      const bl = { x: 50, y: h - 45 };
      const br = { x: w - 50, y: h - 45 };

      // Background triangle
      tCtx.beginPath();
      tCtx.moveTo(top.x, top.y);
      tCtx.lineTo(br.x, br.y);
      tCtx.lineTo(bl.x, bl.y);
      tCtx.closePath();
      tCtx.fillStyle = '#f1f5f9';
      tCtx.fill();
      tCtx.strokeStyle = '#475569';
      tCtx.lineWidth = 2.5;
      tCtx.stroke();

      // Interior grid lines (every 20%)
      tCtx.strokeStyle = '#cbd5e1';
      tCtx.lineWidth = 1;
      for (let p = 20; p <= 80; p += 20) {
        const frac = p / 100;
        // Clay lines (horizontal)
        const y = bl.y - frac * (bl.y - top.y);
        const x1 = bl.x + frac * (top.x - bl.x);
        const x2 = br.x - frac * (br.x - top.x);
        tCtx.beginPath();
        tCtx.moveTo(x1, y);
        tCtx.lineTo(x2, y);
        tCtx.stroke();
      }

      // Vertex Labels
      tCtx.font = "bold 13px Inter, sans-serif";
      tCtx.textAlign = "center";
      tCtx.fillStyle = "#a85832";
      tCtx.fillText("100% CLAY", top.x, top.y - 12);

      tCtx.textAlign = "left";
      tCtx.fillStyle = "#d4a359";
      tCtx.fillText("100% SAND", bl.x - 20, bl.y + 25);

      tCtx.textAlign = "right";
      tCtx.fillStyle = "#967d5e";
      tCtx.fillText("100% SILT", br.x + 20, br.y + 25);

      // Current Point Calculation (Barycentric coordinates)
      // Point P = sand * bl + silt * br + clay * top (normalized to 1)
      const s = currentSand / 100;
      const si = currentSilt / 100;
      const c = currentClay / 100;

      const px = s * bl.x + si * br.x + c * top.x;
      const py = s * bl.y + si * br.y + c * top.y;

      // Draw active point
      tCtx.beginPath();
      tCtx.arc(px, py, 9, 0, Math.PI * 2);
      tCtx.fillStyle = '#dc2626';
      tCtx.fill();
      tCtx.strokeStyle = '#ffffff';
      tCtx.lineWidth = 3;
      tCtx.stroke();

      tCtx.beginPath();
      tCtx.arc(px, py, 14, 0, Math.PI * 2);
      tCtx.strokeStyle = 'rgba(220, 38, 38, 0.4)';
      tCtx.lineWidth = 2;
      tCtx.stroke();

      // 4. Realistic 50× Microscopic Soil Morphology Swatch (Upper Right Corner)
      const lensR = 38;
      const lensX = w - lensR - 18;
      const lensY = lensR + 16;

      tCtx.save();
      // Drop shadow for the microscope lens
      tCtx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      tCtx.shadowBlur = 10;
      tCtx.fillStyle = '#0f172a';
      tCtx.beginPath();
      tCtx.arc(lensX, lensY, lensR, 0, Math.PI * 2);
      tCtx.fill();
      tCtx.shadowBlur = 0;

      // Clip lens interior
      tCtx.beginPath();
      tCtx.arc(lensX, lensY, lensR - 2, 0, Math.PI * 2);
      tCtx.clip();

      // Background matrix inside microscope lens
      const lensBg = tCtx.createRadialGradient(lensX, lensY, 4, lensX, lensY, lensR);
      lensBg.addColorStop(0, '#2d1b0d');
      lensBg.addColorStop(1, '#180e07');
      tCtx.fillStyle = lensBg;
      tCtx.fillRect(lensX - lensR, lensY - lensR, lensR * 2, lensR * 2);

      // Microscopic Clay platelets & cohesive shrink-swell fissures
      if (c > 0.15) {
        tCtx.fillStyle = 'rgba(180, 83, 9, 0.65)';
        tCtx.fillRect(lensX - lensR, lensY - lensR, lensR * 2, lensR * 2);
        // Drying shrinkage fissures if clay is high
        if (c > 0.35) {
          tCtx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
          tCtx.lineWidth = 1.2;
          for (let f = 0; f < 6; f++) {
            tCtx.beginPath();
            tCtx.moveTo(lensX - 25 + f * 9, lensY - 20);
            tCtx.lineTo(lensX - 22 + f * 9, lensY + 20);
            tCtx.stroke();
          }
        }
      }

      // Microscopic Silt powdery micro-aggregates
      const numSilt = Math.round(si * 90);
      tCtx.fillStyle = 'rgba(214, 191, 152, 0.75)';
      for (let i = 0; i < numSilt; i++) {
        const sx = lensX + ((i * 29) % 64 - 32);
        const sy = lensY + ((i * 23) % 64 - 32);
        tCtx.beginPath();
        tCtx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        tCtx.fill();
      }

      // Microscopic Sand grains (Coarse quartz grains with specular facets and pore spaces)
      const numSand = Math.round(s * 22);
      for (let i = 0; i < numSand; i++) {
        const qx = lensX + ((i * 37) % 60 - 30);
        const qy = lensY + ((i * 47) % 60 - 30);
        const grR = (3.5 + (i % 4) * 1.5);
        // Translucent quartz grain
        tCtx.fillStyle = 'rgba(254, 240, 138, 0.85)';
        tCtx.beginPath();
        tCtx.arc(qx, qy, grR, 0, Math.PI * 2);
        tCtx.fill();
        tCtx.strokeStyle = 'rgba(180, 83, 9, 0.7)';
        tCtx.lineWidth = 1;
        tCtx.stroke();
        // Quartz specular glint
        tCtx.fillStyle = '#ffffff';
        tCtx.fillRect(qx - 1, qy - 1, 1.5, 1.5);
      }
      tCtx.restore();

      // Microscope lens metal bezel
      tCtx.strokeStyle = '#d97706';
      tCtx.lineWidth = 3;
      tCtx.beginPath();
      tCtx.arc(lensX, lensY, lensR, 0, Math.PI * 2);
      tCtx.stroke();

      tCtx.font = 'bold 9px Inter, sans-serif';
      tCtx.fillStyle = '#0f172a';
      tCtx.textAlign = 'center';
      tCtx.fillText('50× Micro-View', lensX, lensY + lensR + 13);
    }

    sandSlider.addEventListener('input', e => {
      currentSand = parseFloat(e.target.value);
      const rem = 100 - currentSand;
      const ratio = (currentSilt + currentClay) > 0 ? currentSilt / (currentSilt + currentClay) : 0.5;
      currentSilt = rem * ratio;
      currentClay = rem * (1 - ratio);
      siltSlider.value = Math.round(currentSilt);
      claySlider.value = Math.round(currentClay);
      updateClassification();
    });

    siltSlider.addEventListener('input', e => {
      currentSilt = parseFloat(e.target.value);
      const rem = 100 - currentSilt;
      const ratio = (currentSand + currentClay) > 0 ? currentSand / (currentSand + currentClay) : 0.5;
      currentSand = rem * ratio;
      currentClay = rem * (1 - ratio);
      sandSlider.value = Math.round(currentSand);
      claySlider.value = Math.round(currentClay);
      updateClassification();
    });

    claySlider.addEventListener('input', e => {
      currentClay = parseFloat(e.target.value);
      const rem = 100 - currentClay;
      const ratio = (currentSand + currentSilt) > 0 ? currentSand / (currentSand + currentSilt) : 0.5;
      currentSand = rem * ratio;
      currentSilt = rem * (1 - ratio);
      sandSlider.value = Math.round(currentSand);
      siltSlider.value = Math.round(currentSilt);
      updateClassification();
    });

    // Click on triangle to set coordinate
    triCanvas.addEventListener('click', e => {
      const rect = triCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (triCanvas.width / rect.width);
      const y = (e.clientY - rect.top) * (triCanvas.height / rect.height);

      const top = { x: triCanvas.width * 0.5, y: 35 };
      const bl = { x: 50, y: triCanvas.height - 45 };
      const br = { x: triCanvas.width - 50, y: triCanvas.height - 45 };

      // Barycentric coordinate solve:
      const detT = (br.y - bl.y) * (top.x - bl.x) + (bl.x - br.x) * (top.y - bl.y);
      const l1 = ((br.y - bl.y) * (x - bl.x) + (bl.x - br.x) * (y - bl.y)) / detT;
      const l2 = ((bl.y - top.y) * (x - bl.x) + (top.x - bl.x) * (y - bl.y)) / detT;
      const l3 = 1 - l1 - l2;

      // l1 = clay, l2 = silt, l3 = sand
      if (l1 >= 0 && l2 >= 0 && l3 >= 0) {
        currentClay = Math.min(100, Math.max(0, l1 * 100));
        currentSilt = Math.min(100, Math.max(0, l2 * 100));
        currentSand = Math.min(100, Math.max(0, l3 * 100));
        sandSlider.value = Math.round(currentSand);
        siltSlider.value = Math.round(currentSilt);
        claySlider.value = Math.round(currentClay);
        updateClassification();
      }
    });

    /* =========================================================================
       4. STOKES' JAR SIMULATION LOGIC
       ========================================================================= */
    const shakeBtn = document.getElementById('shakeJarBtn');
    const resetJarBtn = document.getElementById('resetJarBtn');
    const layerSand = document.getElementById('layerSand');
    const layerSilt = document.getElementById('layerSilt');
    const layerClay = document.getElementById('layerClay');
    const jarLiquid = document.getElementById('jarLiquid');
    const jarStatus = document.getElementById('jarStatus');

    shakeBtn.addEventListener('click', () => {
      jarStatus.textContent = "Shaking jar vigorously... Turbid suspension created!";
      jarLiquid.style.background = "rgba(120, 80, 40, 0.85)";
      layerSand.style.height = "0px";
      layerSilt.style.height = "0px";
      layerClay.style.height = "0px";

      setTimeout(() => {
        jarStatus.textContent = "10s: Heavy coarse sand particles rapidly settle to bottom (Stokes' Law v ~ d²)...";
        layerSand.style.height = "60px";
      }, 1000);

      setTimeout(() => {
        jarStatus.textContent = "2 Hours (Simulated): Silky silt settles on top of sand...";
        layerSilt.style.bottom = "60px";
        layerSilt.style.height = "80px";
        jarLiquid.style.background = "rgba(180, 140, 100, 0.45)";
      }, 2500);

      setTimeout(() => {
        jarStatus.textContent = "48 Hours (Simulated): Fine clay colloidal particles settle. Water clears completely!";
        layerClay.style.bottom = "140px";
        layerClay.style.height = "50px";
        jarLiquid.style.background = "rgba(56, 189, 248, 0.2)";
      }, 4200);
    });

    resetJarBtn.addEventListener('click', () => {
      layerSand.style.height = "0px";
      layerSilt.style.height = "0px";
      layerClay.style.height = "0px";
      jarLiquid.style.background = "rgba(56, 189, 248, 0.3)";
      jarStatus.textContent = "Status: Jar emptied and rinsed with clean water.";
    });

    /* =========================================================================
       5. PERCOLATION & INFILTRATION SANDBOX
       ========================================================================= */
    const pourWaterBtn = document.getElementById('pourWaterBtn');
    const waterSand = document.getElementById('waterSand');
    const waterLoam = document.getElementById('waterLoam');
    const waterClay = document.getElementById('waterClay');
    const beakerSand = document.getElementById('beakerSand');
    const beakerLoam = document.getElementById('beakerLoam');
    const beakerClay = document.getElementById('beakerClay');

    pourWaterBtn.addEventListener('click', () => {
      // Reset
      waterSand.style.height = '0%';
      waterLoam.style.height = '0%';
      waterClay.style.height = '0%';
      beakerSand.style.height = '0%';
      beakerLoam.style.height = '0%';
      beakerClay.style.height = '0%';

      // Pour water into tubes
      setTimeout(() => {
        waterSand.style.height = '100%';
        waterLoam.style.height = '100%';
        waterClay.style.height = '100%';
      }, 100);

      // Sand drains fast (90 mL out, 10 mL held)
      setTimeout(() => {
        beakerSand.style.height = '90%';
        document.getElementById('drainSandVal').textContent = '90 mL';
      }, 1200);

      // Loam drains steady (50 mL out, 50 mL held in capillary pores)
      setTimeout(() => {
        beakerLoam.style.height = '50%';
        document.getElementById('drainLoamVal').textContent = '50 mL';
      }, 3500);

      // Clay drains very slow (15 mL out, ponding on top)
      setTimeout(() => {
        beakerClay.style.height = '15%';
        document.getElementById('drainClayVal').textContent = '15 mL';
      }, 6500);
    });

    /* =========================================================================
       6. FIELD FEEL TEST CHALLENGE / DIAGNOSTIC QUIZ
       ========================================================================= */
    const samples = [
      {
        name: "Sample #1: Georgia Piedmont Subsoil",
        scenario: "You take a moist walnut-sized soil ball and squeeze it between your thumb and forefinger. It pushes out into a long, shiny, cohesive ribbon over 6 cm long before snapping. When rubbed in your wet palm, it feels greasy and sticky with virtually zero grit.",
        clues: ["Ball test: Very tight cohesive ball", "Ribbon length: > 5 cm", "Palm feel: Pure sticky clay"],
        ans: "clay",
        expl: "Correct! Heavy clay forms ribbons exceeding 5 cm and feels shiny and sticky without graininess."
      },
      {
        name: "Sample #2: Atlantic Barrier Island Dune",
        scenario: "You scoop up damp soil and attempt to squeeze it in your palm. As soon as you open your hand, the ball shatters and falls apart into individual mineral particles. When rubbed between fingers, it feels extremely abrasive and scratchy.",
        clues: ["Ball test: Crumbles immediately", "Ribbon length: 0 cm (Cannot form ribbon)", "Palm feel: Very gritty"],
        ans: "sand",
        expl: "Spot on! Pure sand cannot hold a ball shape because it lacks fine cohesive clay platelets and humus."
      },
      {
        name: "Sample #3: Iowa Corn Belt Mollisol",
        scenario: "You squeeze a moist sample into a firm ball. It ribbons out smoothly to about 3.5 cm before breaking under gravity. When moistened in your palm, it feels both slightly gritty and smooth, offering an even balance of textures.",
        clues: ["Ball test: Holds ball well", "Ribbon length: 2.5 to 5 cm", "Palm feel: Balanced grit and smoothness"],
        ans: "sandy-loam", // Acceptable or clay loam
        expl: "Well done! Medium ribbons (2.5–5 cm) indicate a loam or clay loam with mixed mineral sizes."
      },
      {
        name: "Sample #4: Mississippi River Loess Bluff",
        scenario: "You take a damp sample that forms a moderate ribbon about 2 cm long. When rubbed with water in your palm, it feels exceptionally silky and soft, like wet flour or velvet makeup, with zero scratchy grit.",
        clues: ["Ball test: Forms weak ball", "Ribbon length: < 2.5 cm", "Palm feel: Silky, floury, velvety smooth"],
        ans: "silt-loam",
        expl: "Accurate! A floury, silky feel with a short ribbon under 2.5 cm is the trademark of Silt Loam."
      }
    ];

    let currentSampleIdx = 0;
    let quizScore = 0;

    function renderSample(idx) {
      const s = samples[idx];
      document.getElementById('sampleName').textContent = s.name;
      document.getElementById('sampleScenario').textContent = s.scenario;
      document.getElementById('quizFeedback').textContent = '';
      document.getElementById('nextSampleBtn').style.display = 'none';

      const btns = document.querySelectorAll('.quiz-opt');
      btns.forEach(b => {
        b.className = 'quiz-opt';
        b.disabled = false;
      });
    }

    document.querySelectorAll('.quiz-opt').forEach(btn => {
      btn.addEventListener('click', e => {
        const choice = btn.dataset.ans;
        const s = samples[currentSampleIdx];
        const isCorrect = choice === s.ans;

        document.querySelectorAll('.quiz-opt').forEach(b => b.disabled = true);

        if (isCorrect) {
          btn.classList.add('correct');
          quizScore++;
          document.getElementById('quizFeedback').innerHTML = `<span style="color:#15803d;">✓ ${s.expl}</span>`;
        } else {
          btn.classList.add('incorrect');
          document.querySelector(`.quiz-opt[data-ans="${s.ans}"]`)?.classList.add('correct');
          document.getElementById('quizFeedback').innerHTML = `<span style="color:#b91c1c;">✗ Incorrect. The correct answer is <b>${s.ans.toUpperCase()}</b>. ${s.expl}</span>`;
        }

        document.getElementById('quizScore').textContent = `Score: ${quizScore} / ${samples.length}`;

        if (currentSampleIdx < samples.length - 1) {
          document.getElementById('nextSampleBtn').style.display = 'inline-block';
        }
      });
    });

    document.getElementById('nextSampleBtn').addEventListener('click', () => {
      currentSampleIdx++;
      renderSample(currentSampleIdx);
    });

    // Initializations
    resizeCanvas();
    initRock();
    updateClassification();
    renderSample(0);

  })();
