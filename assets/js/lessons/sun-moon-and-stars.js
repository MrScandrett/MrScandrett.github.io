/* Sun, Moon and Stars lesson (lessons/earth-science/sun-moon-and-stars.html).
 * Moved out of the page's inline <script>; its astronomy is in sun-moon-and-stars-core.js, which must load first. */
  (()=>{
    const { formatTime, moonPhasesData } = SunMoonCore;
    /* =========================================================================
       1. DAY, NIGHT & SHADOWS SIMULATOR
       ========================================================================= */
    const timeSlider = document.getElementById('timeSlider');
    const timeDisplay = document.getElementById('timeDisplay');
    const playDayBtn = document.getElementById('playDayBtn');
    const latSelect = document.getElementById('latSelect');

    const spaceCanvas = document.getElementById('spaceDayCanvas');
    const sCtx = spaceCanvas.getContext('2d');
    const groundCanvas = document.getElementById('groundDayCanvas');
    const gCtx = groundCanvas.getContext('2d');

    let currentHour = 12.0;
    let isDayPlaying = true;
    let dayAnimId = null;


    function resizeDayCanvases() {
      const sRect = spaceCanvas.getBoundingClientRect();
      spaceCanvas.width = sRect.width * (window.devicePixelRatio || 1);
      spaceCanvas.height = sRect.height * (window.devicePixelRatio || 1);
      sCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

      const gRect = groundCanvas.getBoundingClientRect();
      groundCanvas.width = gRect.width * (window.devicePixelRatio || 1);
      groundCanvas.height = gRect.height * (window.devicePixelRatio || 1);
      gCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

      drawDayNightScene();
    }
    window.addEventListener('resize', resizeDayCanvases);

    function drawDayNightScene() {
      const sw = spaceCanvas.width / (window.devicePixelRatio || 1);
      const sh = spaceCanvas.height / (window.devicePixelRatio || 1);
      const gw = groundCanvas.width / (window.devicePixelRatio || 1);
      const gh = groundCanvas.height / (window.devicePixelRatio || 1);

      // --- SPACE VIEW (Top-Down on North Pole with Photorealistic Earth) ---
      sCtx.clearRect(0, 0, sw, sh);

      // Deep space backdrop with subtle stars
      const spaceGrad = sCtx.createRadialGradient(sw * 0.5, sh * 0.5, 10, sw * 0.5, sh * 0.5, sw * 0.6);
      spaceGrad.addColorStop(0, '#040714');
      spaceGrad.addColorStop(1, '#020409');
      sCtx.fillStyle = spaceGrad;
      sCtx.fillRect(0, 0, sw, sh);

      // Distant stars
      sCtx.fillStyle = '#ffffff';
      for (let i = 0; i < 28; i++) {
        const sx = (i * 37) % sw;
        const sy = (i * 29) % sh;
        sCtx.globalAlpha = 0.3 + (i % 5) * 0.15;
        sCtx.fillRect(sx, sy, 1.2, 1.2);
      }
      sCtx.globalAlpha = 1.0;

      // Radiant Sun on Left with Solar Corona & Collimated Light Rays
      const sunCenterY = sh * 0.5;
      const sunRad = 26;
      // Solar corona glow
      const coronaGrad = sCtx.createRadialGradient(0, sunCenterY, 5, 0, sunCenterY, 80);
      coronaGrad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
      coronaGrad.addColorStop(0.35, 'rgba(251, 191, 36, 0.45)');
      coronaGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.18)');
      coronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = coronaGrad;
      sCtx.beginPath();
      sCtx.arc(0, sunCenterY, 80, -Math.PI * 0.5, Math.PI * 0.5);
      sCtx.fill();

      // Parallel Golden Sunlight Beam Streaks
      sCtx.lineWidth = 1.5;
      for (let y = 20; y < sh; y += 22) {
        const beamGrad = sCtx.createLinearGradient(0, y, sw * 0.48, y);
        beamGrad.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
        beamGrad.addColorStop(0.7, 'rgba(251, 191, 36, 0.25)');
        beamGrad.addColorStop(1, 'rgba(245, 158, 11, 0.02)');
        sCtx.strokeStyle = beamGrad;
        sCtx.beginPath();
        sCtx.moveTo(12, y);
        sCtx.lineTo(sw * 0.48, y);
        sCtx.stroke();
      }

      sCtx.fillStyle = '#fde047';
      sCtx.font = 'bold 11px Inter, sans-serif';
      sCtx.fillText('☀️ Parallel Sunlight', 14, sh - 14);

      // Polar Earth Globe (Centered at ecx, ecy)
      const ecx = sw * 0.56;
      const ecy = sh * 0.5;
      const er = 68;

      // Atmospheric Rayleigh scattering halo around Earth
      const atmoGrad = sCtx.createRadialGradient(ecx, ecy, er * 0.96, ecx, ecy, er * 1.16);
      atmoGrad.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
      atmoGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.35)');
      atmoGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = atmoGrad;
      sCtx.beginPath();
      sCtx.arc(ecx, ecy, er * 1.16, 0, Math.PI * 2);
      sCtx.fill();

      // Base Oceans (Daylit deep blue)
      sCtx.save();
      sCtx.beginPath();
      sCtx.arc(ecx, ecy, er, 0, Math.PI * 2);
      sCtx.clip();

      const oceanGrad = sCtx.createLinearGradient(ecx - er, ecy, ecx + er, ecy);
      oceanGrad.addColorStop(0, '#0284c7'); // Sunlit cyan/blue ocean
      oceanGrad.addColorStop(0.48, '#0369a1');
      oceanGrad.addColorStop(0.52, '#0c1a2e'); // Night ocean
      oceanGrad.addColorStop(1, '#070d18');
      sCtx.fillStyle = oceanGrad;
      sCtx.fillRect(ecx - er, ecy - er, er * 2, er * 2);

      // Polar Landmasses (Greenland, Eurasia, North America around Arctic Basin)
      // North Pole Top-down continental silhouettes
      function drawPolarContinent(pts, colDay, colNight) {
        sCtx.beginPath();
        pts.forEach((p, idx) => {
          const px = ecx + p[0] * er;
          const py = ecy + p[1] * er;
          if (idx === 0) sCtx.moveTo(px, py);
          else sCtx.lineTo(px, py);
        });
        sCtx.closePath();
        // Fill based on day/night position
        const avgX = pts.reduce((acc, p) => acc + p[0], 0) / pts.length;
        sCtx.fillStyle = avgX < 0 ? colDay : colNight;
        sCtx.fill();
      }

      // Greenland / Arctic Archipelago
      drawPolarContinent([[-0.12, -0.15], [-0.18, -0.35], [-0.08, -0.48], [0.02, -0.38], [-0.02, -0.18]], '#e0f2fe', '#334155');
      // North American Craton (Alaska / Canada)
      drawPolarContinent([[-0.22, -0.22], [-0.55, -0.38], [-0.75, -0.15], [-0.62, 0.25], [-0.35, 0.12], [-0.25, -0.05]], '#15803d', '#1e293b');
      // Eurasian Landmass (Scandinavia / Siberia)
      drawPolarContinent([[0.15, -0.32], [0.45, -0.52], [0.72, -0.22], [0.65, 0.35], [0.28, 0.42], [0.12, 0.08]], '#166534', '#1e293b');
      // Arctic Sea Ice cap (central white ice)
      sCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      sCtx.beginPath();
      sCtx.arc(ecx, ecy, er * 0.22, 0, Math.PI * 2);
      sCtx.fill();

      // Atmospheric Clouds (White swirls)
      sCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      sCtx.lineWidth = 3.5;
      sCtx.beginPath();
      sCtx.arc(ecx, ecy, er * 0.65, 0.8, 2.4);
      sCtx.stroke();
      sCtx.beginPath();
      sCtx.arc(ecx, ecy, er * 0.42, 3.2, 5.0);
      sCtx.stroke();

      // Night Hemisphere Shadow & City Lights Overlay
      const nightGrad = sCtx.createLinearGradient(ecx - 8, ecy, ecx + 12, ecy);
      nightGrad.addColorStop(0, 'rgba(3, 7, 18, 0)');
      nightGrad.addColorStop(0.3, 'rgba(3, 7, 18, 0.82)');
      nightGrad.addColorStop(1, 'rgba(3, 7, 18, 0.94)');
      sCtx.fillStyle = nightGrad;
      sCtx.fillRect(ecx - 8, ecy - er, er + 12, er * 2);

      // City Night Lights on the Dark Hemisphere
      sCtx.fillStyle = '#fde047';
      const cityLights = [
        [0.35, -0.25], [0.42, -0.18], [0.55, -0.12], [0.48, 0.15],
        [0.38, 0.28], [0.62, 0.08], [0.25, 0.32], [0.52, -0.32]
      ];
      cityLights.forEach(pt => {
        const lx = ecx + pt[0] * er;
        const ly = ecy + pt[1] * er;
        sCtx.beginPath();
        sCtx.arc(lx, ly, 1.2, 0, Math.PI * 2);
        sCtx.fill();
      });

      // Day/Night Terminator Line (Warm Golden Sunrise/Sunset Rim Diffusion)
      const termGrad = sCtx.createLinearGradient(ecx - 4, 0, ecx + 4, 0);
      termGrad.addColorStop(0, 'rgba(251, 191, 36, 0.7)');
      termGrad.addColorStop(0.5, 'rgba(234, 88, 12, 0.8)');
      termGrad.addColorStop(1, 'rgba(14, 165, 233, 0.1)');
      sCtx.strokeStyle = termGrad;
      sCtx.lineWidth = 3;
      sCtx.beginPath();
      sCtx.moveTo(ecx, ecy - er);
      sCtx.lineTo(ecx, ecy + er);
      sCtx.stroke();
      sCtx.restore();

      // Observer dot on rotating Earth
      const rotAngle = ((currentHour - 12) / 24) * Math.PI * 2 + Math.PI;
      const ox = ecx + Math.cos(rotAngle) * er;
      const oy = ecy + Math.sin(rotAngle) * er;

      // Local Horizon Tangent Line
      sCtx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
      sCtx.lineWidth = 1.5;
      sCtx.setLineDash([3, 3]);
      sCtx.beginPath();
      sCtx.moveTo(ox - Math.sin(rotAngle) * 20, oy + Math.cos(rotAngle) * 20);
      sCtx.lineTo(ox + Math.sin(rotAngle) * 20, oy - Math.cos(rotAngle) * 20);
      sCtx.stroke();
      sCtx.setLineDash([]);

      // Observer marker pin
      sCtx.beginPath();
      sCtx.arc(ox, oy, 6.5, 0, Math.PI * 2);
      sCtx.fillStyle = '#ef4444';
      sCtx.fill();
      sCtx.strokeStyle = '#ffffff';
      sCtx.lineWidth = 2.5;
      sCtx.stroke();

      sCtx.fillStyle = '#f8fafc';
      sCtx.font = 'bold 10px Inter, sans-serif';
      sCtx.fillText('Observer (Local Horizon)', ox + 9, oy - 5);

      // --- GROUND VIEW (Realistic Sky Dome, Gnomon & Soft Penumbra Shadow) ---
      gCtx.clearRect(0, 0, gw, gh);

      const lat = parseFloat(latSelect.value);
      const maxAlt = 90 - lat;
      const hourAngle = (currentHour - 12) * 15; // deg
      const sinAlt = SunMoonCore.sinAltitude(lat, hourAngle);
      const altDeg = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180 / Math.PI;

      // Physically-Inspired Sky Dome Atmospheric Gradient
      const groundH = gh * 0.72;
      const skyGrad = gCtx.createLinearGradient(0, 0, 0, groundH);
      if (altDeg > 18) {
        // High Sun: Vibrant Rayleigh deep azure to horizon haze
        skyGrad.addColorStop(0, '#0284c7');
        skyGrad.addColorStop(0.65, '#38bdf8');
        skyGrad.addColorStop(1, '#bae6fd');
      } else if (altDeg > 5) {
        // Late Afternoon / Golden Hour
        skyGrad.addColorStop(0, '#1e3a8a');
        skyGrad.addColorStop(0.45, '#3b82f6');
        skyGrad.addColorStop(0.8, '#f59e0b');
        skyGrad.addColorStop(1, '#fed7aa');
      } else if (altDeg > -4) {
        // Sunset / Sunrise: Fiery twilight
        skyGrad.addColorStop(0, '#0f172a');
        skyGrad.addColorStop(0.4, '#4338ca');
        skyGrad.addColorStop(0.7, '#c026d3');
        skyGrad.addColorStop(0.9, '#ea580c');
        skyGrad.addColorStop(1, '#fde047');
      } else if (altDeg > -12) {
        // Civil / Nautical Twilight: Deep indigo
        skyGrad.addColorStop(0, '#020617');
        skyGrad.addColorStop(0.6, '#0f172a');
        skyGrad.addColorStop(1, '#1e1b4b');
      } else {
        // Night: Star-filled obsidian sky
        skyGrad.addColorStop(0, '#020409');
        skyGrad.addColorStop(1, '#070d18');
      }
      gCtx.fillStyle = skyGrad;
      gCtx.fillRect(0, 0, gw, groundH);

      // Night Stars in Ground Sky if Sun is below horizon
      if (altDeg <= 0) {
        gCtx.fillStyle = '#ffffff';
        const nightAlpha = Math.min(1, Math.max(0, -altDeg / 10));
        gCtx.globalAlpha = nightAlpha;
        const groundStars = [[0.15, 0.2], [0.28, 0.35], [0.45, 0.15], [0.65, 0.28], [0.82, 0.18], [0.75, 0.42], [0.35, 0.5]];
        groundStars.forEach(st => {
          gCtx.fillRect(st[0] * gw, st[1] * groundH, 1.5, 1.5);
        });
        gCtx.globalAlpha = 1.0;
      }

      // Ground Landscape (Textured Grass Meadow with Sundial markings)
      const landGrad = gCtx.createLinearGradient(0, groundH, 0, gh);
      landGrad.addColorStop(0, '#14532d'); // Rich meadow green
      landGrad.addColorStop(0.3, '#166534');
      landGrad.addColorStop(1, '#0f291e');
      gCtx.fillStyle = landGrad;
      gCtx.fillRect(0, groundH, gw, gh - groundH);

      // Compass Cardinal Directions & Dial Ring on Ground
      const gcx = gw * 0.5;
      const gcy = groundH + 20;

      gCtx.save();
      gCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      gCtx.lineWidth = 1;
      gCtx.beginPath();
      gCtx.ellipse(gcx, gcy, gw * 0.38, 28, 0, 0, Math.PI * 2);
      gCtx.stroke();

      gCtx.font = 'bold 10px Inter, sans-serif';
      gCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      gCtx.textAlign = 'center';
      gCtx.fillText('WEST (Evening)', gcx - gw * 0.38 + 14, gcy + 4);
      gCtx.fillText('EAST (Morning)', gcx + gw * 0.38 - 14, gcy + 4);
      gCtx.fillText('SOUTH (Solar Noon)', gcx, gcy + 22);
      gCtx.restore();

      const stickH = 58;

      // Realistic Sun & Soft Penumbra Shadow
      if (altDeg > 0) {
        const sunX = gcx - Math.sin(hourAngle * Math.PI / 180) * (gw * 0.40);
        const sunY = groundH - Math.sin(altDeg * Math.PI / 180) * (groundH * 0.85);

        // Sun Corona Flare
        const sunGlow = gCtx.createRadialGradient(sunX, sunY, 3, sunX, sunY, 45);
        sunGlow.addColorStop(0, '#ffffff');
        sunGlow.addColorStop(0.25, 'rgba(254, 240, 138, 0.9)');
        sunGlow.addColorStop(0.6, 'rgba(251, 191, 36, 0.35)');
        sunGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
        gCtx.fillStyle = sunGlow;
        gCtx.beginPath();
        gCtx.arc(sunX, sunY, 45, 0, Math.PI * 2);
        gCtx.fill();

        // Sun Core Disk
        gCtx.beginPath();
        gCtx.arc(sunX, sunY, 13, 0, Math.PI * 2);
        gCtx.fillStyle = '#ffffff';
        gCtx.fill();
        gCtx.strokeStyle = '#fde047';
        gCtx.lineWidth = 2.5;
        gCtx.stroke();

        // Realistic Gnomon Shadow with Soft Penumbra
        const shadowL = stickH / Math.tan(Math.max(4, altDeg) * Math.PI / 180);
        const shadowDirX = Math.sin(hourAngle * Math.PI / 180);
        const shadowEndX = gcx + shadowDirX * Math.min(180, shadowL);

        // Outer soft penumbra
        gCtx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        gCtx.lineWidth = 8;
        gCtx.lineCap = 'round';
        gCtx.beginPath();
        gCtx.moveTo(gcx, gcy);
        gCtx.lineTo(shadowEndX, gcy);
        gCtx.stroke();

        // Inner dense umbra
        gCtx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
        gCtx.lineWidth = 4;
        gCtx.beginPath();
        gCtx.moveTo(gcx, gcy);
        gCtx.lineTo(shadowEndX * 0.85 + gcx * 0.15, gcy);
        gCtx.stroke();

        document.getElementById('sunAlt').textContent = altDeg.toFixed(1) + '°';
        document.getElementById('sunAz').textContent = hourAngle < 0 ? 'East' : hourAngle > 0 ? 'West' : 'South (Noon)';
        document.getElementById('shadowLen').textContent = (shadowL / 58).toFixed(2) + ' m';
        document.getElementById('shadowDir').textContent = shadowDirX < 0 ? 'West' : shadowDirX > 0 ? 'East' : 'True North';
      } else {
        document.getElementById('sunAlt').textContent = 'Below Horizon';
        document.getElementById('sunAz').textContent = 'Night Sky';
        document.getElementById('shadowLen').textContent = 'None (Darkness)';
        document.getElementById('shadowDir').textContent = 'Stars Overhead';
      }

      // Wooden Gnomon Post with Brass Finial
      // Post
      gCtx.strokeStyle = '#854d0e';
      gCtx.lineWidth = 6;
      gCtx.lineCap = 'square';
      gCtx.beginPath();
      gCtx.moveTo(gcx, gcy);
      gCtx.lineTo(gcx, gcy - stickH);
      gCtx.stroke();
      // Brass tip finial
      gCtx.fillStyle = '#fde047';
      gCtx.beginPath();
      gCtx.arc(gcx, gcy - stickH, 4, 0, Math.PI * 2);
      gCtx.fill();
      gCtx.strokeStyle = '#b45309';
      gCtx.lineWidth = 1;
      gCtx.stroke();
    }

    function tickDayNight() {
      if (isDayPlaying) {
        currentHour = (currentHour + 0.05) % 24;
        timeSlider.value = currentHour;
        timeDisplay.textContent = formatTime(currentHour);
        drawDayNightScene();
      }
      dayAnimId = SimKit.frame('#spaceDayCanvas', tickDayNight);
    }

    timeSlider.addEventListener('input', e => {
      currentHour = parseFloat(e.target.value);
      timeDisplay.textContent = formatTime(currentHour);
      drawDayNightScene();
    });

    playDayBtn.addEventListener('click', () => {
      isDayPlaying = !isDayPlaying;
      playDayBtn.textContent = isDayPlaying ? '⏸ Pause Spin' : '▶ Play Spin';
      playDayBtn.classList.toggle('lab-btn-active', isDayPlaying);
    });

    latSelect.addEventListener('change', drawDayNightScene);

    /* =========================================================================
       2. MOON PHASES ORBITAL LAB
       ========================================================================= */
    const moonOrbitCanvas = document.getElementById('moonOrbitCanvas');
    const moCtx = moonOrbitCanvas.getContext('2d');
    const moonCanvasView = document.getElementById('moonCanvasView');
    const mvCtx = moonCanvasView.getContext('2d');
    const orbitScrubber = document.getElementById('orbitScrubber');
    const angleDisplay = document.getElementById('angleDisplay');

    let currentMoonAngle = 90; // Deg


    function resizeMoonOrbitCanvas() {
      const rect = moonOrbitCanvas.getBoundingClientRect();
      moonOrbitCanvas.width = rect.width * (window.devicePixelRatio || 1);
      moonOrbitCanvas.height = rect.height * (window.devicePixelRatio || 1);
      moCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      drawMoonLab();
    }
    window.addEventListener('resize', resizeMoonOrbitCanvas);

    function drawMoonLab() {
      const w = moonOrbitCanvas.width / (window.devicePixelRatio || 1);
      const h = moonOrbitCanvas.height / (window.devicePixelRatio || 1);

      // --- ORBIT VIEW ---
      moCtx.clearRect(0, 0, w, h);
      moCtx.fillStyle = '#030712';
      moCtx.fillRect(0, 0, w, h);

      // Sunlight arrows from Right
      moCtx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
      moCtx.lineWidth = 1.5;
      for (let y = 30; y < h; y += 40) {
        moCtx.beginPath();
        moCtx.moveTo(w, y);
        moCtx.lineTo(w * 0.65, y);
        moCtx.stroke();
      }
      moCtx.fillStyle = '#fbbf24';
      moCtx.font = 'bold 11px Inter, sans-serif';
      moCtx.textAlign = 'right';
      moCtx.fillText('Parallel Sunlight ☀️', w - 14, 25);

      const ecx = w * 0.45;
      const ecy = h * 0.5;
      const orbitR = Math.min(w * 0.35, h * 0.38);

      // Orbit circle
      moCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      moCtx.lineWidth = 1.5;
      moCtx.beginPath();
      moCtx.arc(ecx, ecy, orbitR, 0, Math.PI * 2);
      moCtx.stroke();

      // Earth in Center
      const er = 24;
      moCtx.beginPath();
      moCtx.arc(ecx, ecy, er, Math.PI * 0.5, Math.PI * 1.5);
      moCtx.fillStyle = '#0f172a'; // Earth night
      moCtx.fill();
      moCtx.beginPath();
      moCtx.arc(ecx, ecy, er, Math.PI * 1.5, Math.PI * 0.5);
      moCtx.fillStyle = '#0284c7'; // Earth day facing right sun
      moCtx.fill();
      moCtx.strokeStyle = '#ffffff';
      moCtx.lineWidth = 1;
      moCtx.stroke();

      // Moon position:
      // angle 0 = New Moon (Between Earth and Sun -> right of Earth)
      // angle 90 = First Quarter (Above Earth)
      // angle 180 = Full Moon (Left of Earth)
      // angle 270 = Third Quarter (Below Earth)
      const rad = currentMoonAngle * Math.PI / 180;
      const mx = ecx + Math.cos(rad) * orbitR;
      const my = ecy - Math.sin(rad) * orbitR; // inverted Y in canvas

      // Sight line from Earth to Moon
      moCtx.setLineDash([4, 4]);
      moCtx.strokeStyle = 'rgba(253, 224, 71, 0.4)';
      moCtx.beginPath();
      moCtx.moveTo(ecx, ecy);
      moCtx.lineTo(mx, my);
      moCtx.stroke();
      moCtx.setLineDash([]);

      // Draw Moon in orbit (Notice: Right half ALWAYS lit by Sun!)
      const mr = 14;
      moCtx.beginPath();
      moCtx.arc(mx, my, mr, Math.PI * 0.5, Math.PI * 1.5);
      moCtx.fillStyle = '#1e293b'; // Unlit left half
      moCtx.fill();
      moCtx.beginPath();
      moCtx.arc(mx, my, mr, Math.PI * 1.5, Math.PI * 0.5);
      moCtx.fillStyle = '#f8fafc'; // Lit right half
      moCtx.fill();
      moCtx.strokeStyle = '#fbbf24';
      moCtx.lineWidth = 2;
      moCtx.stroke();

      // --- EARTH TELESCOPIC VIEW (Photorealistic Moon Cartography & 3D Relief) ---
      const mw = moonCanvasView.width;
      const mh = moonCanvasView.height;
      mvCtx.clearRect(0, 0, mw, mh);

      const cx = mw * 0.5;
      const cy = mh * 0.5;
      const r = 62;

      // Telescope circular eyepiece vignette / outer darkness
      const scopeGrad = mvCtx.createRadialGradient(cx, cy, r * 0.8, cx, cy, mw * 0.52);
      scopeGrad.addColorStop(0, '#030712');
      scopeGrad.addColorStop(0.85, '#050a18');
      scopeGrad.addColorStop(1, '#000000');
      mvCtx.fillStyle = scopeGrad;
      mvCtx.fillRect(0, 0, mw, mh);

      const normAngle = ((currentMoonAngle % 360) + 360) % 360;
      const phaseFrac = SunMoonCore.illuminatedFraction(normAngle); // 0 to 1

      // 1. Ghostly Earthshine on Unlit Lunar Disc (faint reflection from Earth)
      const earthshineAlpha = (1 - phaseFrac) * 0.18 + 0.04;
      mvCtx.save();
      mvCtx.beginPath();
      mvCtx.arc(cx, cy, r, 0, Math.PI * 2);
      mvCtx.fillStyle = `rgba(148, 163, 184, ${earthshineAlpha})`;
      mvCtx.fill();
      mvCtx.restore();

      // 2. Base Highlands Texture Function (draws authentic lunar features onto context)
      function drawLunarSurfaceFeatures(targetCtx) {
        // Lunar Maria (Dark volcanic basalt plains)
        targetCtx.fillStyle = 'rgba(71, 85, 105, 0.72)'; // Basalt maria tone

        // Oceanus Procellarum (Ocean of Storms - broad NW region)
        targetCtx.beginPath();
        targetCtx.ellipse(cx - 24, cy - 8, 20, 32, -0.2, 0, Math.PI * 2);
        targetCtx.fill();

        // Mare Imbrium (Sea of Rains - circular NW basin)
        targetCtx.beginPath();
        targetCtx.arc(cx - 16, cy - 24, 16, 0, Math.PI * 2);
        targetCtx.fill();

        // Mare Serenitatis (Sea of Serenity - central-NE)
        targetCtx.beginPath();
        targetCtx.arc(cx + 12, cy - 18, 12, 0, Math.PI * 2);
        targetCtx.fill();

        // Mare Tranquillitatis (Sea of Tranquility - Apollo 11 landing site!)
        targetCtx.beginPath();
        targetCtx.arc(cx + 22, cy - 4, 13, 0, Math.PI * 2);
        targetCtx.fill();

        // Mare Crisium (Sea of Crises - isolated eastern sea)
        targetCtx.beginPath();
        targetCtx.ellipse(cx + 42, cy - 12, 9, 7, 0.3, 0, Math.PI * 2);
        targetCtx.fill();

        // Mare Fecunditatis & Mare Nectaris (SE)
        targetCtx.beginPath();
        targetCtx.ellipse(cx + 28, cy + 18, 14, 11, 0.4, 0, Math.PI * 2);
        targetCtx.ellipse(cx + 14, cy + 22, 9, 8, -0.2, 0, Math.PI * 2);
        targetCtx.fill();

        // Mare Nubium & Mare Humorum (SW)
        targetCtx.beginPath();
        targetCtx.ellipse(cx - 15, cy + 22, 14, 11, 0.1, 0, Math.PI * 2);
        targetCtx.ellipse(cx - 32, cy + 18, 9, 8, -0.4, 0, Math.PI * 2);
        targetCtx.fill();

        // Impact Craters with Bright Radial Ejecta Rays (Tycho, Copernicus, Kepler)
        // Tycho Crater Ejecta Rays (Southern crater with spectacular rays across whole disc)
        const tychoX = cx - 8, tychoY = cy + 40;
        targetCtx.save();
        targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        targetCtx.lineWidth = 1.0;
        const rayAngles = [-2.2, -1.8, -1.4, -1.1, -0.8, -0.4, 0.1, 0.6, 2.5, 2.8];
        rayAngles.forEach(ang => {
          targetCtx.beginPath();
          targetCtx.moveTo(tychoX, tychoY);
          targetCtx.lineTo(tychoX + Math.cos(ang) * 75, tychoY + Math.sin(ang) * 75);
          targetCtx.stroke();
        });

        // Tycho Crater Central Peak & Rim
        targetCtx.fillStyle = '#ffffff';
        targetCtx.beginPath();
        targetCtx.arc(tychoX, tychoY, 3.5, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
        targetCtx.lineWidth = 1;
        targetCtx.stroke();

        // Copernicus Crater (Terraced Rim in Oceanus Procellarum)
        const copX = cx - 18, copY = cy - 4;
        targetCtx.fillStyle = '#ffffff';
        targetCtx.beginPath();
        targetCtx.arc(copX, copY, 4.2, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
        targetCtx.lineWidth = 1;
        targetCtx.stroke();
        // Copernicus bright halo
        targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        targetCtx.beginPath();
        targetCtx.arc(copX, copY, 8, 0, Math.PI * 2);
        targetCtx.stroke();

        // Kepler & Aristarchus (Brightest spot on the Moon)
        targetCtx.fillStyle = '#ffffff';
        targetCtx.beginPath();
        targetCtx.arc(cx - 34, cy - 2, 2.5, 0, Math.PI * 2);
        targetCtx.arc(cx - 28, cy - 18, 2.5, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.restore();
      }

      // Draw faint features on unlit face under Earthshine
      mvCtx.save();
      mvCtx.beginPath();
      mvCtx.arc(cx, cy, r, 0, Math.PI * 2);
      mvCtx.clip();
      drawLunarSurfaceFeatures(mvCtx);
      mvCtx.restore();

      // 3. Sunlit Moon Disc with Clip Geometry & High-Contrast Features
      mvCtx.save();
      mvCtx.beginPath();
      mvCtx.arc(cx, cy, r, 0, Math.PI * 2);
      mvCtx.clip();

      // Build clipping path for the illuminated lunar portion
      mvCtx.beginPath();
      if (normAngle <= 180) {
        // Waxing (Right side lit)
        mvCtx.arc(cx, cy, r, -Math.PI * 0.5, Math.PI * 0.5);
        const xOffset = Math.cos(normAngle * Math.PI / 180) * r;
        mvCtx.ellipse(cx, cy, Math.abs(xOffset), r, 0, Math.PI * 0.5, -Math.PI * 0.5, normAngle < 90);
      } else {
        // Waning (Left side lit)
        mvCtx.arc(cx, cy, r, Math.PI * 0.5, Math.PI * 1.5);
        const xOffset = Math.cos(normAngle * Math.PI / 180) * r;
        mvCtx.ellipse(cx, cy, Math.abs(xOffset), r, 0, -Math.PI * 0.5, Math.PI * 0.5, normAngle > 270);
      }
      mvCtx.closePath();
      mvCtx.clip();

      // Base bright anorthositic highlands
      const moonAlbedo = mvCtx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      moonAlbedo.addColorStop(0, '#f8fafc');
      moonAlbedo.addColorStop(0.7, '#e2e8f0');
      moonAlbedo.addColorStop(0.95, '#cbd5e1');
      moonAlbedo.addColorStop(1, '#94a3b8'); // Limb darkening
      mvCtx.fillStyle = moonAlbedo;
      mvCtx.fillRect(cx - r, cy - r, r * 2, r * 2);

      // Paint Maria, Craters, and Ejecta onto the sunlit hemisphere
      drawLunarSurfaceFeatures(mvCtx);

      // 4. 3D Relief & Elongated Shadows Along the Grazing Terminator
      const cosTerm = Math.cos(normAngle * Math.PI / 180);
      mvCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      for (let yStep = -r + 8; yStep <= r - 8; yStep += 10) {
        const halfChord = Math.sqrt(Math.max(0, r * r - yStep * yStep));
        const termX = cx + cosTerm * halfChord;
        const termY = cy + yStep;
        // Crater rim shadow along terminator
        mvCtx.beginPath();
        mvCtx.ellipse(termX, termY, 3.5, 2.5, 0.2, 0, Math.PI * 2);
        mvCtx.fill();
        // Bright rim crest facing sun
        mvCtx.fillStyle = '#ffffff';
        mvCtx.fillRect(normAngle < 180 ? termX + 2 : termX - 2, termY - 1, 1.5, 1.5);
        mvCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      }
      mvCtx.restore();

      // Delicate outer limb ring
      mvCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      mvCtx.lineWidth = 1;
      mvCtx.beginPath();
      mvCtx.arc(cx, cy, r, 0, Math.PI * 2);
      mvCtx.stroke();

      // Find closest named phase
      let closest = SunMoonCore.nearestPhase(normAngle);

      document.getElementById('phaseName').textContent = closest.name;
      document.getElementById('phaseIllum').textContent = Math.round(phaseFrac * 100) + '%';
      document.getElementById('phaseDay').textContent = ((normAngle / 360) * 29.5).toFixed(1);
      document.getElementById('phaseDesc').textContent = closest.desc;
      angleDisplay.textContent = Math.round(normAngle) + '°';
    }

    orbitScrubber.addEventListener('input', e => {
      currentMoonAngle = parseFloat(e.target.value);
      drawMoonLab();
      updatePhaseButtons();
    });

    document.querySelectorAll('.phase-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        currentMoonAngle = parseFloat(btn.dataset.angle);
        orbitScrubber.value = currentMoonAngle;
        drawMoonLab();
        updatePhaseButtons();
      });
    });

    function updatePhaseButtons() {
      const norm = ((currentMoonAngle % 360) + 360) % 360;
      document.querySelectorAll('.phase-chip').forEach(btn => {
        const ba = parseFloat(btn.dataset.angle);
        btn.classList.toggle('is-active', Math.abs(ba - norm) < 22.5 || (ba === 0 && norm > 337.5));
      });
    }

    /* =========================================================================
       3. CIRCUMPOLAR STAR TRAILS PLANETARIUM
       ========================================================================= */
    const starCanvas = document.getElementById('starCanvas');
    const stCtx = starCanvas.getContext('2d');
    const playSkyBtn = document.getElementById('playSkyBtn');
    const togglePointersBtn = document.getElementById('togglePointersBtn');
    const toggleTrailsBtn = document.getElementById('toggleTrailsBtn');
    const clearTrailsBtn = document.getElementById('clearTrailsBtn');

    let isSkyPlaying = true;
    let showPointers = false;
    let showTrails = true;
    let skyAngle = 0;
    let starTrails = []; // Historical positions

    // Base star catalog centered near Polaris (x:0, y:0)
    const baseStars = [
      { id: 'polaris', name: 'Polaris (North Star)', r: 6, theta: 0, mag: 2.0, color: '#fef08a' },
      // Big Dipper (Ursa Major)
      { id: 'dubhe', name: 'Dubhe', r: 120, theta: 0.85, mag: 1.8, color: '#ffffff' },
      { id: 'merak', name: 'Merak', r: 135, theta: 0.98, mag: 2.3, color: '#ffffff' },
      { id: 'phecda', name: 'Phecda', r: 155, theta: 1.15, mag: 2.4, color: '#ffffff' },
      { id: 'megrez', name: 'Megrez', r: 140, theta: 1.30, mag: 3.3, color: '#cbd5e1' },
      { id: 'alioth', name: 'Alioth', r: 165, theta: 1.48, mag: 1.7, color: '#ffffff' },
      { id: 'mizar', name: 'Mizar', r: 185, theta: 1.62, mag: 2.2, color: '#ffffff' },
      { id: 'alkaid', name: 'Alkaid', r: 215, theta: 1.78, mag: 1.8, color: '#bfdbfe' },
      // Cassiopeia
      { id: 'schedar', name: 'Schedar', r: 130, theta: 3.8, mag: 2.2, color: '#fed7aa' },
      { id: 'caph', name: 'Caph', r: 145, theta: 3.6, mag: 2.3, color: '#ffffff' },
      { id: 'gamma_cas', name: 'Navi', r: 135, theta: 4.05, mag: 2.1, color: '#bfdbfe' },
      { id: 'ruchbah', name: 'Ruchbah', r: 150, theta: 4.25, mag: 2.7, color: '#ffffff' },
      { id: 'segin', name: 'Segin', r: 170, theta: 4.45, mag: 3.3, color: '#cbd5e1' },
      // Background field stars
      ...Array.from({ length: 80 }, () => ({
        id: 'bg',
        r: 30 + Math.random() * 240,
        theta: Math.random() * Math.PI * 2,
        mag: 3 + Math.random() * 2.5,
        color: Math.random() > 0.3 ? '#ffffff' : '#93c5fd'
      }))
    ];

    function resizeStarCanvas() {
      const rect = starCanvas.getBoundingClientRect();
      starCanvas.width = rect.width * (window.devicePixelRatio || 1);
      starCanvas.height = rect.height * (window.devicePixelRatio || 1);
      stCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      drawStarField();
    }
    window.addEventListener('resize', resizeStarCanvas);

    function drawStarField() {
      const w = starCanvas.width / (window.devicePixelRatio || 1);
      const h = starCanvas.height / (window.devicePixelRatio || 1);

      // Dim trails effect
      if (!showTrails) {
        stCtx.fillStyle = '#020617';
        stCtx.fillRect(0, 0, w, h);

        // Soft Milky Way Galaxy dust wash
        stCtx.save();
        const mwGrad = stCtx.createLinearGradient(0, 0, w, h);
        mwGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        mwGrad.addColorStop(0.35, 'rgba(147, 197, 253, 0.05)');
        mwGrad.addColorStop(0.5, 'rgba(192, 132, 252, 0.07)');
        mwGrad.addColorStop(0.65, 'rgba(147, 197, 253, 0.05)');
        mwGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        stCtx.fillStyle = mwGrad;
        stCtx.beginPath();
        stCtx.ellipse(cx, cy, w * 0.45, h * 0.85, 0.65, 0, Math.PI * 2);
        stCtx.fill();
        stCtx.restore();
      } else {
        stCtx.fillStyle = 'rgba(2, 6, 23, 0.08)';
        stCtx.fillRect(0, 0, w, h);
      }

      const cx = w * 0.5;
      const cy = h * 0.5;

      // Draw concentric guidance rings
      stCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      stCtx.lineWidth = 1;
      for (let r = 60; r <= 240; r += 60) {
        stCtx.beginPath();
        stCtx.arc(cx, cy, r, 0, Math.PI * 2);
        stCtx.stroke();
      }

      // Draw all stars rotated by skyAngle
      let dubhePos = null;
      let merakPos = null;
      let polarisPos = null;
      const starPositions = {};

      baseStars.forEach(s => {
        const angle = s.theta + skyAngle;
        const sx = cx + Math.cos(angle) * s.r;
        const sy = cy + Math.sin(angle) * s.r;
        starPositions[s.id] = { x: sx, y: sy };

        if (s.id === 'dubhe') dubhePos = { x: sx, y: sy };
        if (s.id === 'merak') merakPos = { x: sx, y: sy };
        if (s.id === 'polaris') polarisPos = { x: sx, y: sy };

        const radius = Math.max(1, 4.5 - s.mag * 0.6);

        // Diffraction spikes for bright first/second-magnitude stars
        if (s.mag < 2.3 && !showTrails) {
          stCtx.save();
          stCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          stCtx.lineWidth = 0.8;
          const spikeLen = (4.5 - s.mag) * 6;
          stCtx.beginPath();
          stCtx.moveTo(sx - spikeLen, sy); stCtx.lineTo(sx + spikeLen, sy);
          stCtx.moveTo(sx, sy - spikeLen); stCtx.lineTo(sx, sy + spikeLen);
          stCtx.stroke();
          stCtx.restore();
        }

        stCtx.beginPath();
        stCtx.arc(sx, sy, radius, 0, Math.PI * 2);
        stCtx.fillStyle = s.color;
        stCtx.fill();

        if (s.name && !showTrails) {
          stCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          stCtx.font = '9px Inter, sans-serif';
          stCtx.fillText(s.name, sx + 5, sy + 3);
        }
      });

      // Constellation Stick Figures (when not in trail accumulation mode)
      if (!showTrails) {
        stCtx.save();
        stCtx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        stCtx.lineWidth = 1;
        stCtx.setLineDash([2, 3]);

        // Big Dipper bowl & handle
        const dipperOrder = ['alkaid', 'mizar', 'alioth', 'megrez', 'phecda', 'merak', 'dubhe', 'megrez'];
        stCtx.beginPath();
        for (let i = 0; i < dipperOrder.length; i++) {
          const pt = starPositions[dipperOrder[i]];
          if (pt) {
            if (i === 0) stCtx.moveTo(pt.x, pt.y);
            else stCtx.lineTo(pt.x, pt.y);
          }
        }
        stCtx.stroke();

        // Cassiopeia "W"
        const casOrder = ['caph', 'schedar', 'gamma_cas', 'ruchbah', 'segin'];
        stCtx.beginPath();
        for (let i = 0; i < casOrder.length; i++) {
          const pt = starPositions[casOrder[i]];
          if (pt) {
            if (i === 0) stCtx.moveTo(pt.x, pt.y);
            else stCtx.lineTo(pt.x, pt.y);
          }
        }
        stCtx.stroke();
        stCtx.restore();
      }

      // Pointer Line from Merak through Dubhe directly to Polaris!
      if (showPointers && dubhePos && merakPos && polarisPos) {
        stCtx.strokeStyle = '#ef4444';
        stCtx.lineWidth = 2;
        stCtx.setLineDash([5, 4]);
        stCtx.beginPath();
        stCtx.moveTo(merakPos.x, merakPos.y);
        stCtx.lineTo(dubhePos.x, dubhePos.y);
        // Extend 5x distance to Polaris
        stCtx.lineTo(polarisPos.x, polarisPos.y);
        stCtx.stroke();
        stCtx.setLineDash([]);

        stCtx.fillStyle = '#ef4444';
        stCtx.font = 'bold 11px Inter, sans-serif';
        stCtx.fillText('★ Pointer Line to Polaris (5x Merak-Dubhe)', polarisPos.x + 12, polarisPos.y - 8);
      }
    }

    function tickStars() {
      if (isSkyPlaying) {
        skyAngle += 0.003;
        drawStarField();
      }
      SimKit.frame('#starCanvas', tickStars);
    }

    playSkyBtn.addEventListener('click', () => {
      isSkyPlaying = !isSkyPlaying;
      playSkyBtn.textContent = isSkyPlaying ? '⏸ Pause Sky' : '▶ Rotate Night Sky';
      playSkyBtn.classList.toggle('lab-btn-active', isSkyPlaying);
    });

    togglePointersBtn.addEventListener('click', () => {
      showPointers = !showPointers;
      togglePointersBtn.classList.toggle('lab-btn-active', showPointers);
    });

    toggleTrailsBtn.addEventListener('click', () => {
      showTrails = !showTrails;
      toggleTrailsBtn.textContent = showTrails ? '💫 Star Trails: ON' : '💫 Star Trails: OFF';
      toggleTrailsBtn.classList.toggle('lab-btn-active', showTrails);
    });

    clearTrailsBtn.addEventListener('click', () => {
      const w = starCanvas.width / (window.devicePixelRatio || 1);
      const h = starCanvas.height / (window.devicePixelRatio || 1);
      stCtx.fillStyle = '#020617';
      stCtx.fillRect(0, 0, w, h);
    });

    /* =========================================================================
       4. CELESTIAL QUIZ
       ========================================================================= */
    const quizData = [
      {
        q: "You walk outside at 8:00 AM in the morning and look down at your shadow. In which direction is your shadow pointing?",
        opts: ["Toward the East", "Toward the West", "Toward the South", "Directly underneath your feet"],
        correct: 1,
        expl: "Correct! The Sun rises in the East in the morning, which casts shadows in the exact opposite direction: toward the West."
      },
      {
        q: "Why do we see Moon phases from Earth?",
        opts: [
          "Earth's shadow covers different portions of the Moon each night.",
          "Clouds in Earth's atmosphere block the Moon.",
          "We view the lit half of the Moon from different angles as it orbits Earth.",
          "The Moon moves closer and farther from the Sun."
        ],
        correct: 2,
        expl: "Spot on! Exactly 50% of the Moon is always lit by the Sun. As the Moon circles Earth, our perspective changes how much of that lit hemisphere we can see."
      },
      {
        q: "What causes long-exposure night photographs to show circular star trails in the sky?",
        opts: [
          "Stars are literally flying in circles around the galaxy.",
          "Earth is rotating eastward on its axis under a relatively stationary sphere of stars.",
          "The Moon's gravity pulls the stars in circular orbits.",
          "Atmospheric winds bend the starlight in swirls."
        ],
        correct: 1,
        expl: "Brilliant! Earth's 24-hour spin makes the entire celestial dome appear to revolve counterclockwise around Polaris."
      },
      {
        q: "During a Total Lunar Eclipse, why does the Moon turn a coppery reddish color ('Blood Moon') instead of disappearing completely?",
        opts: [
          "Heat from Earth's core radiates red infrared light.",
          "Rayleigh scattering bends all the red sunrises and sunsets around Earth into our shadow cone.",
          "The Moon's iron-rich surface rocks rust in space.",
          "Solar flares bounce red light off the back of the Moon."
        ],
        correct: 1,
        expl: "Exquisite! Earth's atmosphere scatters blue light away and refracts red wavelengths inward into Earth's umbral shadow, illuminating the Moon with all the planet's sunrises and sunsets."
      }
    ];

    let currentQ = 0;
    let quizScore = 0;

    function renderQuiz() {
      const q = quizData[currentQ];
      document.getElementById('quizTitle').textContent = `Question ${currentQ + 1} of ${quizData.length}`;
      document.getElementById('quizQuestion').textContent = q.q;
      document.getElementById('quizFeedback').textContent = '';
      document.getElementById('nextQuizBtn').style.display = 'none';

      const container = document.getElementById('quizAnswers');
      container.innerHTML = '';
      q.opts.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => selectAnswer(idx));
        container.appendChild(btn);
      });
    }

    function selectAnswer(selectedIdx) {
      const q = quizData[currentQ];
      const btns = document.querySelectorAll('.quiz-btn');
      btns.forEach(b => b.disabled = true);

      if (selectedIdx === q.correct) {
        btns[selectedIdx].classList.add('correct');
        quizScore++;
        document.getElementById('quizFeedback').innerHTML = `<span style="color:#15803d;">✓ ${q.expl}</span>`;
      } else {
        btns[selectedIdx].classList.add('incorrect');
        btns[q.correct].classList.add('correct');
        document.getElementById('quizFeedback').innerHTML = `<span style="color:#b91c1c;">✗ Incorrect. ${q.expl}</span>`;
      }

      document.getElementById('quizScoreText').textContent = `Score: ${quizScore} / ${quizData.length}`;

      if (currentQ < quizData.length - 1) {
        document.getElementById('nextQuizBtn').style.display = 'inline-block';
      }
    }

    document.getElementById('nextQuizBtn').addEventListener('click', () => {
      currentQ++;
      renderQuiz();
    });

    // Initialize all
    resizeDayCanvases();
    resizeMoonOrbitCanvas();
    resizeStarCanvas();
    tickDayNight();
    tickStars();
    renderQuiz();

  })();
