/**
 * Pablo Picasso Interactive Studio:
 * Cubist Multi-Viewpoint Unfolding, Analytic Facets & Synthetic Papier Collé Lab
 */
(function () {
  "use strict";

  function initPicassoLab() {
    var canvas = document.getElementById("pc-cubism-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");

    var W = 680;
    var H = 390;

    var state = {
      subject: "portrait", // 'portrait' | 'guitar'
      phase: "analytic",   // 'single' | 'analytic' | 'synthetic'
      unfold: 85,          // 0..100 multi-viewpoint separation
      fracture: 65,        // 0..100 geometric facet subdivision
      selectedPlane: -1,
      dragging: false,
      dragOffset: { x: 0, y: 0 },
      offsets: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 }
      ]
    };

    var elUnfold = document.getElementById("pc-unfold-slider");
    var elFracture = document.getElementById("pc-fracture-slider");
    var elReadout = document.getElementById("pc-cubism-readout");

    function drawNewsprintTexture(x, y, w, h) {
      ctx.save();
      ctx.fillStyle = "#f5f0e1";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 15px Georgia, serif";
      ctx.fillText("LE JOURNAL", x + 10, y + 22);
      ctx.strokeStyle = "rgba(30, 41, 59, 0.38)";
      ctx.lineWidth = 1.5;
      for (var ly = y + 30; ly < y + h - 6; ly += 6) {
        ctx.beginPath();
        ctx.moveTo(x + 8, ly);
        ctx.lineTo(x + w - 8, ly);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawWoodgrainTexture(x, y, w, h) {
      ctx.save();
      ctx.fillStyle = "#b45309";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(69, 26, 3, 0.45)";
      ctx.lineWidth = 2;
      for (var gx = x + 8; gx < x + w; gx += 11) {
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.bezierCurveTo(gx + 5, y + h * 0.33, gx - 5, y + h * 0.66, gx, y + h);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawSheetMusicTexture(x, y, w, h) {
      ctx.save();
      ctx.fillStyle = "#fef9c3";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      for (var s = 0; s < 2; s++) {
        var base = y + 16 + s * 28;
        for (var l = 0; l < 5; l++) {
          ctx.beginPath();
          ctx.moveTo(x + 6, base + l * 3.5);
          ctx.lineTo(x + w - 6, base + l * 3.5);
          ctx.stroke();
        }
      }
      ctx.fillStyle = "#0f172a";
      for (var n = 0; n < 5; n++) {
        ctx.beginPath();
        ctx.arc(x + 18 + n * 18, y + 24 + (n % 3) * 4, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function getPlaneAnchors() {
      var u = state.phase === "single" ? 0 : state.unfold / 100;
      var cx = W * 0.5;
      var cy = H * 0.52;
      return [
        // 0: Frontal View (0 deg)
        { x: cx - u * 44 + state.offsets[0].x, y: cy - u * 12 + state.offsets[0].y, view: "Front View (0°)" },
        // 1: Profile View (90 deg)
        { x: cx + u * 48 + state.offsets[1].x, y: cy - u * 8 + state.offsets[1].y, view: "Side Profile (90°)" },
        // 2: Top Rim / Overhead View (+60 deg)
        { x: cx + u * 8 + state.offsets[2].x, y: cy - 78 - u * 26 + state.offsets[2].y, view: "Top-Down Plan (+60°)" },
        // 3: Three-Quarter Jaw / Lower Body (-45 deg)
        { x: cx - u * 18 + state.offsets[3].x, y: cy + 68 + u * 18 + state.offsets[3].y, view: "3/4 Oblique (−45°)" },
        // 4: Collage / Table / Shoulder Plane
        { x: cx + u * 72 + state.offsets[4].x, y: cy + 62 + u * 14 + state.offsets[4].y, view: "Rotated Plane (+120°)" }
      ];
    }

    function render() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      ctx.save();
      ctx.scale(dpr, dpr);

      var u = state.phase === "single" ? 0 : state.unfold / 100;
      var frac = state.phase === "single" ? 0 : state.fracture / 100;
      var isSynth = state.phase === "synthetic";
      var isAnalytic = state.phase === "analytic";

      // Background ground
      ctx.fillStyle = isSynth ? "#1e293b" : isAnalytic ? "#292524" : "#f8fafc";
      ctx.fillRect(0, 0, W, H);

      // Background Analytic Cubism crystalline facet grid
      if (frac > 0.05) {
        var cols = Math.round(4 + frac * 6);
        var rows = Math.round(3 + frac * 4);
        var cellW = W / cols;
        var cellH = H / rows;
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            var x0 = c * cellW;
            var y0 = r * cellH;
            var shade = ((r * 3 + c * 5) % 4);
            var analyticColors = [
              "rgba(120, 113, 108, 0.34)",
              "rgba(180, 83, 9, 0.24)",
              "rgba(71, 85, 105, 0.34)",
              "rgba(214, 211, 209, 0.16)"
            ];
            var synthColors = [
              "rgba(37, 99, 235, 0.22)",
              "rgba(234, 88, 12, 0.20)",
              "rgba(250, 204, 21, 0.16)",
              "rgba(148, 163, 184, 0.18)"
            ];
            ctx.fillStyle = isSynth ? synthColors[shade] : analyticColors[shade];
            ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x0 + cellW, y0 + ((c % 2) * 14 - 7) * frac);
            ctx.lineTo(x0 + cellW - ((r % 2) * 12) * frac, y0 + cellH);
            ctx.lineTo(x0, y0 + cellH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
      }

      var anchors = getPlaneAnchors();

      if (state.subject === "portrait") {
        // Plane 2: Top/Forehead & Hair Crown Plane
        var p2 = anchors[2];
        ctx.save();
        ctx.fillStyle = isSynth ? "#eab308" : isAnalytic ? "#a8a29e" : "#fde68a";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(p2.x - 78, p2.y + 30);
        ctx.lineTo(p2.x - 20, p2.y - 26);
        ctx.lineTo(p2.x + 76, p2.y - 12);
        ctx.lineTo(p2.x + 54, p2.y + 42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Plane 0: Left Cheek & Frontal Eye (0 deg viewpoint)
        var p0 = anchors[0];
        ctx.save();
        if (isSynth) {
          drawNewsprintTexture(p0.x - 74, p0.y - 54, 118, 118);
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(p0.x - 74, p0.y - 54, 118, 118);
        } else {
          ctx.fillStyle = isAnalytic ? "#d6d3d1" : "#fed7aa";
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(p0.x - 72, p0.y - 52);
          ctx.lineTo(p0.x + 42, p0.y - 42);
          ctx.lineTo(p0.x + 32, p0.y + 68);
          ctx.lineTo(p0.x - 62, p0.y + 52);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        // Frontal wide-open eye
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(p0.x - 16, p0.y - 8, 24, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = isSynth ? "#2563eb" : "#0f172a";
        ctx.beginPath();
        ctx.arc(p0.x - 16, p0.y - 8, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Plane 1: Sharp Side-Profile Nose & Profile Eye (90 deg viewpoint)
        var p1 = anchors[1];
        ctx.save();
        ctx.fillStyle = isSynth ? "#3b82f6" : isAnalytic ? "#b45309" : "#fdba74";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(p1.x - 28, p1.y - 64);
        ctx.lineTo(p1.x + 68, p1.y - 38);
        ctx.lineTo(p1.x + 48, p1.y + 66);
        ctx.lineTo(p1.x - 36, p1.y + 48);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Angular profile nose ridge + profile triangular eye
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(p1.x - 12, p1.y - 48);
        ctx.lineTo(p1.x - 42, p1.y + 8);
        ctx.lineTo(p1.x - 8, p1.y + 14);
        ctx.stroke();

        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.moveTo(p1.x + 2, p1.y - 16);
        ctx.lineTo(p1.x + 36, p1.y - 26);
        ctx.lineTo(p1.x + 32, p1.y - 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Plane 3: Three-Quarter Jaw & Dual-Angle Mouth
        var p3 = anchors[3];
        ctx.save();
        ctx.fillStyle = isSynth ? "#dc2626" : isAnalytic ? "#78716c" : "#fca5a5";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(p3.x - 58, p3.y - 26);
        ctx.lineTo(p3.x + 64, p3.y - 18);
        ctx.lineTo(p3.x + 38, p3.y + 38);
        ctx.lineTo(p3.x - 42, p3.y + 32);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Mouth divided into front & profile halves
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(p3.x - 26, p3.y - 4, 52, 14);
        ctx.strokeRect(p3.x - 26, p3.y - 4, 52, 14);
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y - 4);
        ctx.lineTo(p3.x, p3.y + 10);
        ctx.stroke();
        ctx.restore();

        // Plane 4: Collage / Shoulder Geometric Plane
        var p4 = anchors[4];
        ctx.save();
        if (isSynth) {
          drawWoodgrainTexture(p4.x - 48, p4.y - 32, 96, 68);
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(p4.x - 48, p4.y - 32, 96, 68);
        } else {
          ctx.fillStyle = isAnalytic ? "#57534e" : "#94a3b8";
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(p4.x - 48, p4.y - 28);
          ctx.lineTo(p4.x + 52, p4.y - 12);
          ctx.lineTo(p4.x + 36, p4.y + 42);
          ctx.lineTo(p4.x - 54, p4.y + 34);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      } else {
        // SUBJECT 2: SPANISH GUITAR & CAFE TABLE
        var g0 = anchors[0];
        var g1 = anchors[1];
        var g2 = anchors[2];
        var g3 = anchors[3];
        var g4 = anchors[4];

        // Plane 0: Left Guitar Bout & Soundhole (Front 0 deg)
        ctx.save();
        if (isSynth) {
          drawWoodgrainTexture(g0.x - 75, g0.y - 62, 115, 132);
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(g0.x - 75, g0.y - 62, 115, 132);
        } else {
          ctx.fillStyle = isAnalytic ? "#b45309" : "#d97706";
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(g0.x - 15, g0.y - 25, 42, Math.PI * 0.5, Math.PI * 1.5);
          ctx.arc(g0.x - 15, g0.y + 35, 54, Math.PI * 1.5, Math.PI * 0.5, true);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        // Soundhole seen dead-on
        ctx.fillStyle = "#0f172a";
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g0.x - 4, g0.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Plane 1: Right Guitar Waist & Strings (Oblique / Profile View)
        ctx.save();
        if (isSynth) {
          drawSheetMusicTexture(g1.x - 36, g1.y - 52, 112, 110);
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(g1.x - 36, g1.y - 52, 112, 110);
        } else {
          ctx.fillStyle = isAnalytic ? "#a8a29e" : "#f59e0b";
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(g1.x - 32, g1.y - 54);
          ctx.lineTo(g1.x + 68, g1.y - 32);
          ctx.lineTo(g1.x + 52, g1.y + 64);
          ctx.lineTo(g1.x - 28, g1.y + 48);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        // Parallel guitar strings
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.6;
        for (var st = -12; st <= 12; st += 6) {
          ctx.beginPath();
          ctx.moveTo(g1.x + st, g1.y - 68);
          ctx.lineTo(g1.x + st, g1.y + 52);
          ctx.stroke();
        }
        ctx.restore();

        // Plane 2: Fretboard & Tuning Scroll (Top / Side Profile)
        ctx.save();
        ctx.fillStyle = isSynth ? "#2563eb" : "#44403c";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.5;
        ctx.fillRect(g2.x - 22, g2.y - 38, 46, 86);
        ctx.strokeRect(g2.x - 22, g2.y - 38, 46, 86);
        ctx.restore();

        // Plane 3: Lower Bridge & Tailpiece Plane
        ctx.save();
        if (isSynth) {
          drawNewsprintTexture(g3.x - 62, g3.y - 24, 124, 58);
          ctx.strokeRect(g3.x - 62, g3.y - 24, 124, 58);
        } else {
          ctx.fillStyle = "#78716c";
          ctx.fillRect(g3.x - 56, g3.y - 22, 112, 52);
          ctx.strokeRect(g3.x - 56, g3.y - 22, 112, 52);
        }
        ctx.restore();

        // Plane 4: Café Glass showing BOTH top circular rim AND side elevation
        ctx.save();
        ctx.fillStyle = isSynth ? "#facc15" : "#d6d3d1";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(g4.x - 28, g4.y - 24);
        ctx.lineTo(g4.x + 28, g4.y - 24);
        ctx.lineTo(g4.x + 18, g4.y + 36);
        ctx.lineTo(g4.x - 18, g4.y + 36);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Top-down circle of rim drawn simultaneously
        ctx.beginPath();
        ctx.arc(g4.x, g4.y - 24, 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Viewpoint Badges on each plane when unfolded
      if (u > 0.12) {
        for (var i = 0; i < anchors.length; i++) {
          var a = anchors[i];
          ctx.save();
          ctx.fillStyle = i === state.selectedPlane ? "#ea580c" : "rgba(15, 23, 42, 0.84)";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          var label = a.view;
          ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
          var tw = ctx.measureText(label).width + 14;
          ctx.fillRect(a.x - tw * 0.5, a.y - 10, tw, 20);
          ctx.strokeRect(a.x - tw * 0.5, a.y - 10, tw, 20);
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, a.x, a.y);
          ctx.restore();
        }
      }

      ctx.restore();

      if (elReadout) {
        var viewCount = state.phase === "single" || state.unfold < 12 ? 1 : 5;
        var phaseDesc = state.phase === "single"
          ? "Single-Point Renaissance Perspective (1 fixed camera angle)"
          : state.phase === "analytic"
            ? "Analytic Cubism (1908–1912): monochrome geometric facets unfolding 5 camera angles onto one flat plane"
            : "Synthetic Cubism (1912–1914): papier collé collage (Le Journal newsprint, woodgrain, sheet music) + bold flat planes";
        elReadout.innerHTML =
          "<strong>Active Mode:</strong> " + phaseDesc + " · " +
          "Simultaneous Viewpoints Visible: <code>" + viewCount + "</code> · " +
          "Unfold Separation: <code>" + (state.phase === "single" ? 0 : state.unfold) + "%</code>.";
      }
    }

    function canvasPt(e) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * W,
        y: ((e.clientY - rect.top) / rect.height) * H
      };
    }

    canvas.addEventListener("pointerdown", function (e) {
      var pt = canvasPt(e);
      var anchors = getPlaneAnchors();
      var best = -1;
      var bestDist = 65;
      for (var i = anchors.length - 1; i >= 0; i--) {
        var d = Math.hypot(pt.x - anchors[i].x, pt.y - anchors[i].y);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      if (best !== -1) {
        state.selectedPlane = best;
        state.dragging = true;
        state.dragOffset.x = pt.x - state.offsets[best].x;
        state.dragOffset.y = pt.y - state.offsets[best].y;
        canvas.setPointerCapture(e.pointerId);
        render();
      }
    });

    canvas.addEventListener("pointermove", function (e) {
      if (!state.dragging || state.selectedPlane < 0) return;
      var pt = canvasPt(e);
      state.offsets[state.selectedPlane].x = Math.max(-140, Math.min(140, pt.x - state.dragOffset.x));
      state.offsets[state.selectedPlane].y = Math.max(-110, Math.min(110, pt.y - state.dragOffset.y));
      render();
    });

    function endDrag() {
      state.dragging = false;
    }
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    if (elUnfold) {
      elUnfold.addEventListener("input", function () {
        state.unfold = parseFloat(elUnfold.value);
        if (state.phase === "single" && state.unfold > 5) {
          state.phase = "analytic";
        }
        render();
      });
    }

    if (elFracture) {
      elFracture.addEventListener("input", function () {
        state.fracture = parseFloat(elFracture.value);
        render();
      });
    }

    document.querySelectorAll("[data-pc-phase]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.phase = btn.getAttribute("data-pc-phase");
        if (state.phase === "single" && elUnfold) {
          elUnfold.value = "0";
        } else if (state.unfold < 30) {
          state.unfold = 85;
          if (elUnfold) elUnfold.value = "85";
        }
        render();
      });
    });

    document.querySelectorAll("[data-pc-subject]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.subject = btn.getAttribute("data-pc-subject");
        state.offsets.forEach(function (o) { o.x = 0; o.y = 0; });
        render();
      });
    });

    var resetBtn = document.getElementById("pc-reset-planes");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        state.offsets.forEach(function (o) { o.x = 0; o.y = 0; });
        render();
      });
    }

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPicassoLab);
  } else {
    initPicassoLab();
  }
})();
