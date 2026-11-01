/**
 * Vincent van Gogh Interactive Studio:
 * Chevreul Simultaneous Contrast & 3D Impasto Raking-Light Lab
 */
(function () {
  "use strict";

  function initVanGoghLab() {
    var canvas = document.getElementById("vg-impasto-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");

    var W = 680;
    var H = 380;

    var state = {
      primaryHue: 222,     // Cobalt blue night sky
      complementGap: 175,  // ~180 deg opposite -> golden yellow (~47 deg)
      impastoHeight: 78,   // 0..100 physical ridge thickness
      lightAngle: 32,      // degrees (grazing light from upper-left)
      turbulence: 65,      // swirl curl strength
      userStrokes: []      // custom impasto strokes painted by student
    };

    var elHue = document.getElementById("vg-sky-hue");
    var elGap = document.getElementById("vg-comp-gap");
    var elImpasto = document.getElementById("vg-impasto-height");
    var elLight = document.getElementById("vg-light-angle");
    var elTurb = document.getElementById("vg-turbulence");
    var elReadout = document.getElementById("vg-contrast-readout");

    // Pre-generate procedural stroke anchors across the sky, vortex, and hills
    var baseStrokes = [];
    for (var y = 18; y < H - 70; y += 13) {
      for (var x = 18; x < W - 18; x += 22) {
        baseStrokes.push({
          x: x + ((y * 7) % 9) - 4,
          y: y + ((x * 5) % 7) - 3,
          len: 22 + ((x + y) % 10),
          thick: 6 + ((x * 3 + y) % 4),
          isStar: false
        });
      }
    }

    // Star & moon concentric rings
    var stars = [
      { cx: 565, cy: 78, rings: 4, isMoon: true },
      { cx: 155, cy: 72, rings: 3, isMoon: false },
      { cx: 310, cy: 56, rings: 2, isMoon: false },
      { cx: 430, cy: 96, rings: 2, isMoon: false },
      { cx: 92,  cy: 162, rings: 2, isMoon: false }
    ];

    function flowAngleAt(x, y, turb) {
      var k = turb / 100;
      // Central S-curve eddy inspired by The Starry Night
      var dx1 = x - 275;
      var dy1 = y - 165;
      var r1 = Math.hypot(dx1, dy1);
      var swirl1 = Math.exp(-r1 / 120) * 2.6 * k;

      var dx2 = x - 415;
      var dy2 = y - 195;
      var r2 = Math.hypot(dx2, dy2);
      var swirl2 = -Math.exp(-r2 / 95) * 2.3 * k;

      var wave = Math.sin(x * 0.014) * 0.45 * k;
      return wave + swirl1 + swirl2;
    }

    // Draw a single 3D impasto brushstroke with raking light highlight & shadow ridge
    function drawImpastoStroke(x, y, angle, len, thick, hue, sat, light, ridgePct, lightRad) {
      var dx = Math.cos(angle) * (len * 0.5);
      var dy = Math.sin(angle) * (len * 0.5);
      var x1 = x - dx;
      var y1 = y - dy;
      var x2 = x + dx;
      var y2 = y + dy;

      // Ridge normal is perpendicular to stroke direction
      var nx = -Math.sin(angle);
      var ny = Math.cos(angle);
      var lx = Math.cos(lightRad);
      var ly = Math.sin(lightRad);
      // Dot product between stroke ridge normal and raking light vector
      var dot = nx * lx + ny * ly;
      var ridgeOffset = (ridgePct / 100) * 3.2;

      ctx.lineCap = "round";

      // 1. Cast shadow ridge on the side away from the light source
      if (ridgePct > 6) {
        ctx.strokeStyle = "hsla(" + hue + ", " + sat + "%, " + Math.max(6, light - 24 - ridgePct * 0.14) + "%, " + (0.45 + ridgePct * 0.004) + ")";
        ctx.lineWidth = thick + 1.5;
        ctx.beginPath();
        ctx.moveTo(x1 - lx * ridgeOffset, y1 - ly * ridgeOffset);
        ctx.lineTo(x2 - lx * ridgeOffset, y2 - ly * ridgeOffset);
        ctx.stroke();
      }

      // 2. Main pigment body
      ctx.strokeStyle = "hsl(" + hue + ", " + sat + "%, " + light + "%)";
      ctx.lineWidth = thick;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // 3. Specular impasto crest facing the raking light
      if (ridgePct > 6) {
        var crestBoost = Math.round(12 + Math.abs(dot) * 18 + ridgePct * 0.14);
        ctx.strokeStyle = "hsla(" + hue + ", " + Math.min(100, sat + 8) + "%, " + Math.min(96, light + crestBoost) + "%, " + (0.4 + ridgePct * 0.005) + ")";
        ctx.lineWidth = Math.max(1.5, thick * 0.38);
        ctx.beginPath();
        ctx.moveTo(x1 + lx * (ridgeOffset * 0.65), y1 + ly * (ridgeOffset * 0.65));
        ctx.lineTo(x2 + lx * (ridgeOffset * 0.65), y2 + ly * (ridgeOffset * 0.65));
        ctx.stroke();
      }
    }

    function render() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      ctx.save();
      ctx.scale(dpr, dpr);

      var skyHue = ((state.primaryHue % 360) + 360) % 360;
      var starHue = ((skyHue + state.complementGap) % 360 + 360) % 360;
      var lightRad = (state.lightAngle * Math.PI) / 180;
      var ridge = state.impastoHeight;

      // Underpainting ground
      ctx.fillStyle = "hsl(" + skyHue + ", 58%, 16%)";
      ctx.fillRect(0, 0, W, H);

      // Sky flow-field strokes
      for (var i = 0; i < baseStrokes.length; i++) {
        var st = baseStrokes[i];
        var ang = flowAngleAt(st.x, st.y, state.turbulence);
        // Subtle variation in hue and lightness across the sky
        var hVar = skyHue + Math.sin(st.x * 0.02 + st.y * 0.03) * 14;
        var lVar = 28 + Math.cos(st.y * 0.018 - st.x * 0.01) * 12;
        drawImpastoStroke(st.x, st.y, ang, st.len, st.thick, hVar, 74, lVar, ridge, lightRad);
      }

      // Concentric glowing stars & crescent moon using complementary hue
      for (var s = 0; s < stars.length; s++) {
        var star = stars[s];
        for (var r = 1; r <= star.rings; r++) {
          var rad = r * 11;
          var count = Math.max(8, r * 7);
          for (var k = 0; k < count; k++) {
            var theta = (k / count) * Math.PI * 2;
            var px = star.cx + Math.cos(theta) * rad;
            var py = star.cy + Math.sin(theta) * rad;
            var tangent = theta + Math.PI * 0.5;
            var sLight = star.isMoon ? 64 - r * 3 : 68 - r * 4;
            drawImpastoStroke(px, py, tangent, 15, 5.5, starHue, 92, sLight, ridge, lightRad);
          }
        }
        // Bright star core
        drawImpastoStroke(star.cx, star.cy, 0.2, 8, 9, starHue, 96, 78, ridge, lightRad);
      }

      // Rolling Provençal hills & village horizon along bottom
      for (var hx = 10; hx < W; hx += 20) {
        var hillY = H - 52 + Math.sin(hx * 0.015) * 16;
        for (var hy = hillY; hy < H; hy += 12) {
          var hAng = Math.cos(hx * 0.015) * 0.28;
          drawImpastoStroke(hx, hy, hAng, 24, 7, (skyHue + 18) % 360, 62, 18, ridge, lightRad);
        }
      }

      // Foreground Dark Cypress Flame (left side vertical undulating strokes)
      for (var cy = 68; cy < H; cy += 14) {
        var halfW = 10 + ((cy - 68) / (H - 68)) * 32;
        for (var cx = 68 - halfW; cx <= 68 + halfW; cx += 11) {
          var cAng = -Math.PI / 2 + Math.sin(cy * 0.05 + cx * 0.04) * 0.22;
          drawImpastoStroke(cx, cy, cAng, 22, 6.5, (skyHue - 35 + 360) % 360, 48, 12, ridge, lightRad);
        }
      }

      // User-painted custom impasto strokes
      for (var u = 0; u < state.userStrokes.length; u++) {
        var us = state.userStrokes[u];
        var uHue = us.useStarHue ? starHue : skyHue;
        var uLight = us.useStarHue ? 66 : 38;
        drawImpastoStroke(us.x, us.y, us.angle, 26, 7.5, uHue, 90, uLight, ridge, lightRad);
      }

      // Mini Chevreul Color Wheel badge in bottom-right corner
      var wx = W - 52;
      var wy = H - 52;
      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
      ctx.beginPath();
      ctx.arc(wx, wy, 38, 0, Math.PI * 2);
      ctx.fill();
      for (var deg = 0; deg < 360; deg += 10) {
        var a0 = ((deg - 5) * Math.PI) / 180;
        var a1 = ((deg + 6) * Math.PI) / 180;
        ctx.strokeStyle = "hsl(" + deg + ", 85%, 55%)";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(wx, wy, 26, a0, a1);
        ctx.stroke();
      }
      // Line connecting primary & paired hue on the wheel
      var pRad = (skyHue * Math.PI) / 180;
      var sRad = (starHue * Math.PI) / 180;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(pRad) * 26, wy + Math.sin(pRad) * 26);
      ctx.lineTo(wx + Math.cos(sRad) * 26, wy + Math.sin(sRad) * 26);
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      // Update live scientific readout
      if (elReadout) {
        var oppScore = Math.round((Math.min(state.complementGap, 360 - state.complementGap) / 180) * 100);
        var modeLabel = oppScore >= 85
          ? "Maximum Simultaneous Contrast (Complementary Opposites)"
          : oppScore >= 50
            ? "Moderate Chromatic Tension (Split / Triadic)"
            : "Low Contrast (Analogous / Harmonious)";
        elReadout.innerHTML =
          "<strong>Chevreul Contrast Score: " + oppScore + "%</strong> (" + modeLabel + ") · " +
          "Sky Hue: <code>" + Math.round(skyHue) + "°</code> ↔ Accent Hue: <code>" + Math.round(starHue) + "°</code> (Δ = <code>" + state.complementGap + "°</code>) · " +
          "Impasto Ridge: <code>" + (state.impastoHeight * 0.035).toFixed(1) + " mm</code> under <code>" + state.lightAngle + "°</code> raking light.";
      }
    }

    // Interactive painting on the canvas
    var painting = false;
    var lastPt = null;

    function canvasPt(e) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * W,
        y: ((e.clientY - rect.top) / rect.height) * H
      };
    }

    canvas.addEventListener("pointerdown", function (e) {
      painting = true;
      lastPt = canvasPt(e);
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", function (e) {
      if (!painting || !lastPt) return;
      var pt = canvasPt(e);
      var dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);
      if (dist >= 12) {
        var ang = Math.atan2(pt.y - lastPt.y, pt.x - lastPt.x);
        state.userStrokes.push({
          x: pt.x,
          y: pt.y,
          angle: ang,
          useStarHue: true
        });
        if (state.userStrokes.length > 140) state.userStrokes.shift();
        lastPt = pt;
        render();
      }
    });

    function endPaint() {
      painting = false;
      lastPt = null;
    }
    canvas.addEventListener("pointerup", endPaint);
    canvas.addEventListener("pointercancel", endPaint);

    // Wire sliders and presets
    function bindSlider(el, key) {
      if (!el) return;
      el.addEventListener("input", function () {
        state[key] = parseFloat(el.value);
        render();
      });
    }
    bindSlider(elHue, "primaryHue");
    bindSlider(elGap, "complementGap");
    bindSlider(elImpasto, "impastoHeight");
    bindSlider(elLight, "lightAngle");
    bindSlider(elTurb, "turbulence");

    document.querySelectorAll("[data-vg-preset]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = btn.getAttribute("data-vg-preset");
        state.userStrokes = [];
        if (p === "starry") {
          state.primaryHue = 222; state.complementGap = 175; state.impastoHeight = 82; state.lightAngle = 32; state.turbulence = 70;
        } else if (p === "cafe") {
          state.primaryHue = 248; state.complementGap = 165; state.impastoHeight = 68; state.lightAngle = 140; state.turbulence = 35;
        } else if (p === "analogous") {
          state.primaryHue = 222; state.complementGap = 22; state.impastoHeight = 20; state.lightAngle = 90; state.turbulence = 50;
        }
        if (elHue) elHue.value = String(state.primaryHue);
        if (elGap) elGap.value = String(state.complementGap);
        if (elImpasto) elImpasto.value = String(state.impastoHeight);
        if (elLight) elLight.value = String(state.lightAngle);
        if (elTurb) elTurb.value = String(state.turbulence);
        render();
      });
    });

    var clearBtn = document.getElementById("vg-clear-strokes");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        state.userStrokes = [];
        render();
      });
    }

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initVanGoghLab);
  } else {
    initVanGoghLab();
  }
})();
