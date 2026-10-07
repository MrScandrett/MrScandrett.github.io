/**
 * Katsushika Hokusai Interactive Lesson Script
 * - Moku-hanga Woodblock Printing Studio with Kentō Registration & Bokashi
 * - Logarithmic Spiral & Wave Geometry Explorer
 * - Ryakuga Haya-oshi (Compass & Ruler) Drawing Studio
 * - Prussian Blue UV Lightfastness Chemistry Simulator
 */
(function () {
  'use strict';

  // --- Utility Toast Helper ---
  function toast(msg) {
    if (window.LessonContent && typeof window.LessonContent.toast === 'function') {
      window.LessonContent.toast(msg);
    }
  }

  // =========================================================================
  // 1. MOKU-HANGA WOODBLOCK PRINT STUDIO
  // =========================================================================
  function initMokuhangaStudio() {
    var canvas = document.getElementById('moku-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    // Layer state
    var layers = {
      sky: true,
      fuji: true,
      wave_deep: true,
      wave_mid: true,
      boats: true,
      foam: true,
      keyblock: true,
      cartouche: true
    };

    var kentoX = 0;
    var kentoY = 0;
    var kentoAngle = 0;
    var bokashiWipe = 60; // percentage
    var isRubbing = false;
    var barenX = -100;
    var barenY = -100;

    function renderPrint() {
      var w = canvas.width;
      var h = canvas.height;

      // 1. Paper Base (Washi with subtle grain)
      ctx.save();
      ctx.fillStyle = '#faf6ed';
      ctx.fillRect(0, 0, w, h);

      // Paper fiber texture simulation
      ctx.fillStyle = 'rgba(180, 160, 130, 0.04)';
      for (var i = 0; i < 40; i++) {
        var rx = (i * 97) % w;
        var ry = (i * 131) % h;
        ctx.fillRect(rx, ry, (i % 5) * 8 + 10, 1.5);
      }
      ctx.restore();

      // Apply Kento offset for color blocks (Keyblock stays fixed as reference!)
      function applyKentoTransform() {
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate((kentoAngle * Math.PI) / 180);
        ctx.translate(-w / 2 + kentoX, -h / 2 + kentoY);
      }

      // --- Color Layer 1: Sky Bokashi Gradient ---
      if (layers.sky) {
        applyKentoTransform();
        var skyH = (h * bokashiWipe) / 100;
        var skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);
        skyGrad.addColorStop(0, '#103965');
        skyGrad.addColorStop(0.35, '#3b6e9f');
        skyGrad.addColorStop(0.75, '#b9d2e7');
        skyGrad.addColorStop(1, 'rgba(250, 246, 237, 0)');

        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, skyH);
        ctx.restore();
      }

      // --- Color Layer 2: Mount Fuji ---
      if (layers.fuji) {
        applyKentoTransform();
        // Dark mountain base
        ctx.fillStyle = '#1c3144';
        ctx.beginPath();
        ctx.moveTo(330, 370);
        ctx.lineTo(395, 270);
        ctx.lineTo(460, 370);
        ctx.closePath();
        ctx.fill();

        // Snow Cap
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(380, 295);
        ctx.lineTo(395, 270);
        ctx.lineTo(410, 295);
        ctx.quadraticCurveTo(395, 305, 380, 295);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // --- Color Layer 3: Prussian Blue Deep Shadows ---
      if (layers.wave_deep) {
        applyKentoTransform();
        ctx.fillStyle = '#08213b';
        // Base trough shadow
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, 340);
        ctx.quadraticCurveTo(120, 360, 240, 430);
        ctx.quadraticCurveTo(460, 490, w, 440);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

        // Wave hollow shadow
        ctx.beginPath();
        ctx.moveTo(180, 260);
        ctx.bezierCurveTo(240, 160, 380, 140, 450, 220);
        ctx.bezierCurveTo(400, 280, 280, 320, 180, 260);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // --- Color Layer 4: Prussian Blue Mid-tones ---
      if (layers.wave_mid) {
        applyKentoTransform();
        ctx.fillStyle = '#174878';
        // Main wave arch body
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.bezierCurveTo(100, 480, 160, 380, 190, 280);
        ctx.bezierCurveTo(220, 180, 280, 100, 420, 110);
        ctx.bezierCurveTo(500, 120, 560, 210, 520, 270);
        ctx.bezierCurveTo(460, 330, 380, 300, 410, 240);
        ctx.bezierCurveTo(360, 220, 310, 240, 270, 300);
        ctx.bezierCurveTo(220, 380, 160, 470, 0, h);
        ctx.closePath();
        ctx.fill();

        // Secondary small wave in foreground
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.quadraticCurveTo(110, 380, 240, 420);
        ctx.quadraticCurveTo(340, 450, 420, h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // --- Color Layer 5: Cargo Boats & Rowers ---
      if (layers.boats) {
        applyKentoTransform();
        // Boat 1 (Foreground trough)
        ctx.fillStyle = '#cf9d69';
        ctx.beginPath();
        ctx.moveTo(220, 470);
        ctx.quadraticCurveTo(380, 420, 540, 410);
        ctx.lineTo(545, 420);
        ctx.quadraticCurveTo(380, 435, 215, 482);
        ctx.closePath();
        ctx.fill();

        // Boatmen (simplified ochre heads/garments)
        ctx.fillStyle = '#5c4033';
        for (var b = 0; b < 7; b++) {
          var bx = 280 + b * 32;
          var by = 438 - b * 3;
          ctx.beginPath();
          ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Boat 2 (Under breaking crest)
        ctx.fillStyle = '#d4a26e';
        ctx.beginPath();
        ctx.moveTo(60, 410);
        ctx.quadraticCurveTo(160, 360, 260, 340);
        ctx.lineTo(265, 348);
        ctx.quadraticCurveTo(160, 372, 55, 422);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // --- Color Layer 6: White Foam Spray & Claws ---
      if (layers.foam) {
        applyKentoTransform();
        ctx.fillStyle = '#ffffff';
        // Massive crest foam
        ctx.beginPath();
        ctx.moveTo(260, 115);
        ctx.bezierCurveTo(330, 95, 420, 105, 490, 160);
        ctx.bezierCurveTo(530, 200, 540, 240, 510, 260);
        ctx.bezierCurveTo(480, 280, 440, 240, 450, 210);
        ctx.bezierCurveTo(420, 180, 370, 180, 340, 210);
        ctx.bezierCurveTo(310, 180, 280, 140, 260, 115);
        ctx.closePath();
        ctx.fill();

        // Foam claw tips
        var claws = [
          [490, 160, 520, 150, 510, 175],
          [450, 130, 475, 110, 465, 140],
          [400, 105, 420, 80, 410, 115],
          [350, 100, 365, 75, 355, 110],
          [300, 105, 310, 80, 295, 115],
          [240, 140, 245, 115, 230, 145]
        ];
        claws.forEach(function (c) {
          ctx.beginPath();
          ctx.moveTo(c[0], c[1]);
          ctx.quadraticCurveTo(c[2], c[3], c[4], c[5]);
          ctx.closePath();
          ctx.fill();
        });

        // Spray droplets
        for (var d = 0; d < 35; d++) {
          var dx = 320 + ((d * 47) % 240);
          var dy = 80 + ((d * 31) % 180);
          ctx.beginPath();
          ctx.arc(dx, dy, (d % 3) + 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // --- Keyblock Layer (Master Sumi Outline - Anchored!) ---
      if (layers.keyblock) {
        ctx.save();
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 2.4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Outer wave crest curve
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.bezierCurveTo(100, 480, 160, 380, 190, 280);
        ctx.bezierCurveTo(220, 180, 280, 100, 420, 110);
        ctx.bezierCurveTo(500, 120, 560, 210, 520, 270);
        ctx.stroke();

        // Inner claw curl
        ctx.beginPath();
        ctx.moveTo(520, 270);
        ctx.bezierCurveTo(460, 330, 380, 300, 410, 240);
        ctx.bezierCurveTo(360, 220, 310, 240, 270, 300);
        ctx.stroke();

        // Secondary foreground wave
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.quadraticCurveTo(110, 380, 240, 420);
        ctx.quadraticCurveTo(340, 450, 420, h);
        ctx.stroke();

        // Mount Fuji outline
        ctx.beginPath();
        ctx.moveTo(330, 370);
        ctx.lineTo(395, 270);
        ctx.lineTo(460, 370);
        ctx.stroke();

        // Boat 1 outline
        ctx.beginPath();
        ctx.moveTo(220, 470);
        ctx.quadraticCurveTo(380, 420, 540, 410);
        ctx.stroke();

        // Boat 2 outline
        ctx.beginPath();
        ctx.moveTo(60, 410);
        ctx.quadraticCurveTo(160, 360, 260, 340);
        ctx.stroke();

        // Water ripple ridges
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(120, 320);
        ctx.quadraticCurveTo(200, 290, 260, 350);
        ctx.moveTo(200, 410);
        ctx.quadraticCurveTo(300, 380, 380, 420);
        ctx.stroke();

        ctx.restore();
      }

      // --- Cartouche & Publisher Inscription ---
      if (layers.cartouche) {
        ctx.save();
        // Title box (Top Left)
        ctx.fillStyle = '#faf5ec';
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 1.5;
        ctx.fillRect(40, 35, 120, 140);
        ctx.strokeRect(40, 35, 120, 140);

        // Kanji Simulation in Title
        ctx.fillStyle = '#18181b';
        ctx.font = 'bold 12px serif';
        ctx.fillText('富嶽三十六景', 52, 60);
        ctx.font = '11px serif';
        ctx.fillText('神奈川沖浪裏', 52, 82);
        ctx.font = '9.5px serif';
        ctx.fillText('北斎改爲一筆', 52, 115);

        // Red Censor / Artist Seal
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(52, 130, 22, 28);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('極', 58, 148);

        ctx.restore();
      }

      // --- Baren Rubbing Animation Overlay ---
      if (isRubbing) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(barenX, barenY, 45, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139, 90, 43, 0.45)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#5a3d1e';
        ctx.stroke();
        // Bamboo sheath spiral ribs
        ctx.beginPath();
        ctx.arc(barenX, barenY, 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Bind Layer Toggles
    document.querySelectorAll('.hoku-layer-item').forEach(function (btn) {
      btn.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.click(); }
      });
      btn.addEventListener('click', function () {
        var layerKey = this.dataset.layer;
        layers[layerKey] = !layers[layerKey];
        this.classList.toggle('active', layers[layerKey]);
        this.setAttribute('aria-pressed', layers[layerKey]);
        renderPrint();
      });
    });

    // Kentō sliders
    var sliderX = document.getElementById('kento-x');
    var sliderY = document.getElementById('kento-y');
    var sliderAngle = document.getElementById('kento-angle');
    var valX = document.getElementById('val-kento-x');
    var valY = document.getElementById('val-kento-y');
    var valAngle = document.getElementById('val-kento-angle');

    function updateKento() {
      if (sliderX) { kentoX = parseFloat(sliderX.value); valX.textContent = (kentoX > 0 ? '+' : '') + kentoX.toFixed(1) + ' units'; }
      if (sliderY) { kentoY = parseFloat(sliderY.value); valY.textContent = (kentoY > 0 ? '+' : '') + kentoY.toFixed(1) + ' units'; }
      if (sliderAngle) { kentoAngle = parseFloat(sliderAngle.value); valAngle.textContent = (kentoAngle > 0 ? '+' : '') + kentoAngle.toFixed(1) + '°'; }
      document.getElementById('print-feedback').textContent = (kentoX || kentoY || kentoAngle) ? 'Misaligned: compare the color edges with the fixed dark outlines. Restore Kentō to remove the gaps.' : 'Aligned: colors and outlines share the same position.';
      renderPrint();
    }

    if (sliderX) sliderX.addEventListener('input', updateKento);
    if (sliderY) sliderY.addEventListener('input', updateKento);
    if (sliderAngle) sliderAngle.addEventListener('input', updateKento);

    // Bokashi Slider
    var sliderBokashi = document.getElementById('bokashi-slider');
    var valBokashi = document.getElementById('val-bokashi');
    if (sliderBokashi) {
      sliderBokashi.addEventListener('input', function () {
        bokashiWipe = parseInt(this.value, 10);
        if (valBokashi) valBokashi.textContent = bokashiWipe + '%';
        renderPrint();
      });
    }

    // Reset Kentō to Perfect 0.0mm
    var btnResetKento = document.getElementById('btn-reset-kento');
    if (btnResetKento) {
      btnResetKento.addEventListener('click', function () {
        if (sliderX) sliderX.value = 0;
        if (sliderY) sliderY.value = 0;
        if (sliderAngle) sliderAngle.value = 0;
        updateKento();
        toast('✓ Perfect Kentō registration achieved (zero offset)');
      });
    }

    // Misalign Kentō
    var btnSlipKento = document.getElementById('btn-slip-kento');
    if (btnSlipKento) {
      btnSlipKento.addEventListener('click', function () {
        if (sliderX) sliderX.value = 6.5;
        if (sliderY) sliderY.value = -4.2;
        if (sliderAngle) sliderAngle.value = 1.8;
        updateKento();
        toast('Paper slipped off Kentō notch! Notice color bleeding past lines.');
      });
    }

    // Baren Rubbing Animation
    var btnRubBaren = document.getElementById('btn-rub-baren');
    if (btnRubBaren) {
      btnRubBaren.addEventListener('click', function () {
        if (isRubbing) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          document.getElementById('print-feedback').textContent = 'Baren demonstration complete: printers rub the back of the paper to transfer pigment.';
          return;
        }
        isRubbing = true;
        btnRubBaren.disabled = true;
        var start = performance.now();
        var duration = 900;

        function animateBaren(time) {
          var elapsed = time - start;
          var p = elapsed / duration;
          if (p < 1) {
            // Spiral trajectory
            var angle = p * Math.PI * 6;
            var radius = 180 * (1 - p * 0.5);
            barenX = canvas.width / 2 + Math.cos(angle) * radius;
            barenY = canvas.height / 2 + Math.sin(angle) * radius;
            renderPrint();
            requestAnimationFrame(animateBaren);
          } else {
            isRubbing = false;
            btnRubBaren.disabled = false;
            renderPrint();
            document.getElementById('print-feedback').textContent = 'Baren demonstration complete: printers rub the back of the paper to transfer pigment.';
          }
        }
        requestAnimationFrame(animateBaren);
      });
    }

    // Initial render
    renderPrint();
  }

  // =========================================================================
  // 2. LOGARITHMIC SPIRAL & WAVE GEOMETRY EXPLORER
  // =========================================================================
  function initWaveGeometryStudio() {
    var canvas = document.getElementById('geo-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var showSpiral = true;
    var showTriangles = true;
    var showFractals = false;
    var spiralGrowth = 0.22;

    function renderGeometry() {
      var w = canvas.width;
      var h = canvas.height;

      // Dark dramatic background
      ctx.fillStyle = '#0a192f';
      ctx.fillRect(0, 0, w, h);

      // Base Wave Wireframe
      ctx.save();
      ctx.fillStyle = '#102e50';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.bezierCurveTo(80, 460, 140, 360, 170, 260);
      ctx.bezierCurveTo(200, 160, 260, 80, 400, 90);
      ctx.bezierCurveTo(480, 100, 540, 190, 500, 250);
      ctx.bezierCurveTo(440, 310, 360, 280, 390, 220);
      ctx.bezierCurveTo(340, 200, 290, 220, 250, 280);
      ctx.bezierCurveTo(200, 360, 140, 450, 0, h);
      ctx.closePath();
      ctx.fill();

      // Wave outline
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Mount Fuji in distance
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.moveTo(330, 370);
      ctx.lineTo(395, 270);
      ctx.lineTo(460, 370);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // OVERLAY 1: Logarithmic Spiral
      if (showSpiral) {
        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([6, 3]);

        var cx = 410;
        var cy = 210;
        var a = 2.8;

        ctx.beginPath();
        for (var theta = 0; theta < Math.PI * 4.2; theta += 0.05) {
          var r = a * Math.exp(spiralGrowth * theta);
          var x = cx - r * Math.cos(theta);
          var y = cy - r * Math.sin(theta);
          if (theta === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Origin Eye
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('Spiral Origin (r = a · e^(bθ))', cx + 12, cy + 4);
        ctx.restore();
      }

      // OVERLAY 2: Framing Triangles
      if (showTriangles) {
        ctx.save();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([4, 4]);

        // Dynamic Wave Triangle
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(400, 90);
        ctx.lineTo(540, h);
        ctx.closePath();
        ctx.stroke();

        // Static Fuji Triangle
        ctx.strokeStyle = '#e0e7ff';
        ctx.beginPath();
        ctx.moveTo(330, 370);
        ctx.lineTo(395, 270);
        ctx.lineTo(460, 370);
        ctx.closePath();
        ctx.stroke();

        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#06b6d4';
        ctx.fillText('Dynamic Water Triangle', 390, 75);
        ctx.fillStyle = '#e0e7ff';
        ctx.fillText('Static Mount Fuji Triangle', 340, 395);
        ctx.restore();
      }

      // OVERLAY 3: Fractal Claws
      if (showFractals) {
        ctx.save();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;

        var clawPoints = [
          [480, 150, 40],
          [440, 110, 30],
          [390, 90, 25],
          [340, 95, 20]
        ];

        clawPoints.forEach(function (cp, idx) {
          ctx.beginPath();
          ctx.arc(cp[0], cp[1], cp[2], 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#d8b4fe';
          ctx.font = '10px monospace';
          ctx.fillText('Claw ' + (idx + 1), cp[0] - 18, cp[1] - cp[2] - 4);
        });
        ctx.restore();
      }
    }

    // Bind Toggles
    var chkSpiral = document.getElementById('chk-spiral');
    var chkTriangles = document.getElementById('chk-triangles');
    var chkFractals = document.getElementById('chk-fractals');
    var sliderPitch = document.getElementById('spiral-pitch');
    var valPitch = document.getElementById('val-spiral-pitch');

    if (chkSpiral) chkSpiral.addEventListener('change', function () { showSpiral = this.checked; renderGeometry(); });
    if (chkTriangles) chkTriangles.addEventListener('change', function () { showTriangles = this.checked; renderGeometry(); });
    if (chkFractals) chkFractals.addEventListener('change', function () { showFractals = this.checked; renderGeometry(); });

    if (sliderPitch) {
      sliderPitch.addEventListener('input', function () {
        spiralGrowth = parseFloat(this.value);
        if (valPitch) valPitch.textContent = spiralGrowth.toFixed(2);
        renderGeometry();
      });
    }

    renderGeometry();
  }

  // =========================================================================
  // 3. RYAKUGA HAYA-OSHI DRAWING STUDIO (COMPASS & RULER)
  // =========================================================================
  function initRyakugaStudio() {
    var canvas = document.getElementById('ryakuga-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var currentSubject = 'sparrow';
    var blendRatio = 0.5; // 0 = Pure Geometry, 1 = Pure Ink Brush

    function renderRyakuga() {
      var w = canvas.width;
      var h = canvas.height;

      ctx.fillStyle = '#faf7f0';
      ctx.fillRect(0, 0, w, h);

      var geoAlpha = 1 - blendRatio * 0.75;
      var inkAlpha = 0.25 + blendRatio * 0.75;

      if (currentSubject === 'sparrow') {
        var cx1 = 280, cy1 = 200, r1 = 55; // head
        var cx2 = 360, cy2 = 270, r2 = 90; // body
        var cx3 = 420, cy3 = 170, r3 = 75; // wing

        // Compass Geometry (Red/Blue dashed)
        if (geoAlpha > 0.05) {
          ctx.save();
          ctx.globalAlpha = geoAlpha;
          ctx.strokeStyle = '#e11d48';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);

          ctx.beginPath(); ctx.arc(cx1, cy1, r1, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx2, cy2, r2, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = '#2563eb';
          ctx.beginPath(); ctx.arc(cx3, cy3, r3, 0, Math.PI * 2); ctx.stroke();

          // Centers
          ctx.fillStyle = '#e11d48';
          ctx.beginPath(); ctx.arc(cx1, cy1, 4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx2, cy2, 4, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }

        // Finished Ink Brush Lines
        ctx.save();
        ctx.globalAlpha = inkAlpha;
        ctx.strokeStyle = '#18181b';
        ctx.fillStyle = '#18181b';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Beak
        ctx.beginPath();
        ctx.moveTo(cx1 - r1, cy1);
        ctx.lineTo(cx1 - r1 - 22, cy1 - 4);
        ctx.lineTo(cx1 - r1, cy1 - 10);
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.beginPath();
        ctx.arc(cx1 - 25, cy1 - 10, 5, 0, Math.PI * 2);
        ctx.fill();

        // Head crown
        ctx.beginPath();
        ctx.arc(cx1, cy1, r1, Math.PI * 1.1, Math.PI * 1.8);
        ctx.stroke();

        // Throat & Belly
        ctx.beginPath();
        ctx.moveTo(cx1 - r1, cy1);
        ctx.quadraticCurveTo(cx2 - 40, cy2 + 70, cx2 + 80, cy2 + 50);
        ctx.stroke();

        // Wing feathers
        ctx.beginPath();
        ctx.moveTo(cx1 + 10, cy1 - 10);
        ctx.quadraticCurveTo(cx3, cy3 - 70, cx3 + 70, cy3 - 30);
        ctx.quadraticCurveTo(cx3 + 20, cy3 + 20, cx1 + 20, cy1 + 20);
        ctx.stroke();

        // Tail
        ctx.beginPath();
        ctx.moveTo(cx2 + 60, cy2 + 20);
        ctx.lineTo(cx2 + 130, cy2 + 55);
        ctx.lineTo(cx2 + 100, cy2 + 70);
        ctx.stroke();
        ctx.restore();

      } else if (currentSubject === 'torii') {
        // Torii Shrine Gate built on Equilateral Triangle
        var tx = w / 2, ty = 70, baseW = 340, baseH = 340;

        if (geoAlpha > 0.05) {
          ctx.save();
          ctx.globalAlpha = geoAlpha;
          ctx.strokeStyle = '#e11d48';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);

          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx - baseW / 2, ty + baseH);
          ctx.lineTo(tx + baseW / 2, ty + baseH);
          ctx.closePath();
          ctx.stroke();

          ctx.strokeStyle = '#2563eb';
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx, ty + baseH);
          ctx.stroke();
          ctx.restore();
        }

        // Ink and vermilion Torii
        ctx.save();
        ctx.globalAlpha = inkAlpha;
        ctx.strokeStyle = '#18181b';
        ctx.fillStyle = '#b91c1c';
        ctx.lineWidth = 2.5;

        // Top lintel kasagi
        ctx.beginPath();
        ctx.moveTo(tx - 190, ty + 50);
        ctx.quadraticCurveTo(tx, ty + 65, tx + 190, ty + 50);
        ctx.lineTo(tx + 190, ty + 68);
        ctx.quadraticCurveTo(tx, ty + 83, tx - 190, ty + 68);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Lower tie-beam nuki
        ctx.fillRect(tx - 140, ty + 105, 280, 16);
        ctx.strokeRect(tx - 140, ty + 105, 280, 16);

        // Pillars slanted with triangle legs
        ctx.beginPath();
        ctx.moveTo(tx - 90, ty + 68);
        ctx.lineTo(tx - 76, ty + 68);
        ctx.lineTo(tx - 110, ty + baseH);
        ctx.lineTo(tx - 128, ty + baseH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(tx + 90, ty + 68);
        ctx.lineTo(tx + 76, ty + 68);
        ctx.lineTo(tx + 110, ty + baseH);
        ctx.lineTo(tx + 128, ty + baseH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    var sliderBlend = document.getElementById('ryakuga-blend');
    var valBlend = document.getElementById('val-ryakuga-blend');
    if (sliderBlend) {
      sliderBlend.addEventListener('input', function () {
        blendRatio = parseFloat(this.value);
        if (valBlend) valBlend.textContent = Math.round(blendRatio * 100) + '% Inked';
        renderRyakuga();
      });
    }

    document.querySelectorAll('.ryakuga-subject-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentSubject = this.dataset.subject;
        document.querySelectorAll('.ryakuga-subject-btn').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.subject === currentSubject); });
        document.querySelectorAll('.ryakuga-subject-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        renderRyakuga();
      });
    });

    renderRyakuga();
  }

  // =========================================================================
  // 4. PRUSSIAN BLUE VS INDIGO LIGHTFASTNESS UV LAB
  // =========================================================================
  function initPigmentLab() {
    var explanations = {
      window: 'Direct sunlight adds a large light exposure. Colors and paper can change; use a reproduction for a bright classroom display.',
      rotate: 'Yes: limited light and periods in storage reduce cumulative exposure. A high-quality reproduction can stay available while the original rests.',
      blue: 'Prussian blue can also change under light. No pigment makes an entire print immune to damage.'
    };
    document.querySelectorAll('[data-conserve]').forEach(function (button) {
      button.addEventListener('click', function () {
        document.getElementById('conservation-feedback').textContent = explanations[button.dataset.conserve];
      });
    });
    document.querySelectorAll('.ryakuga-subject-btn').forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.subject === 'sparrow');
    });
  }

  // --- Initialize when DOM is ready ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initMokuhangaStudio();
      initWaveGeometryStudio();
      initRyakugaStudio();
      initPigmentLab();
    });
  } else {
    initMokuhangaStudio();
    initWaveGeometryStudio();
    initRyakugaStudio();
    initPigmentLab();
  }
})();

