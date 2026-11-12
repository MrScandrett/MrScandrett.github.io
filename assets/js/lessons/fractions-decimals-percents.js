(function () {
    "use strict";
    var TAU = Math.PI * 2;
    function $(id) { return document.getElementById(id); }
    function col() { return SimKit.theme.colors(); }
    function mk(id, boxId, draw) { return SimKit.canvas2d($(id), { box: $(boxId), onResize: function () { draw(); } }); }

    function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

    /* ── Lab 1: Tripartite Number Line ── */
    var nlSlider = $("nl-slider");
    var nlCanvas = $("nl-canvas");
    var valFrac = $("val-frac");
    var valDec = $("val-dec");
    var valPct = $("val-pct");
    var nlValSpan = $("nl-slider-val");

    function getSimpleFrac(x) {
      // Look for nice denominators up to 16
      var bestN = 0, bestD = 1, minDiff = 999;
      for (var d = 1; d <= 16; d++) {
        var n = Math.round(x * d);
        var diff = Math.abs(x - n / d);
        if (diff < minDiff && diff < 0.005) {
          minDiff = diff;
          bestN = n;
          bestD = d;
        }
      }
      if (bestD > 0 && minDiff < 0.005) {
        var g = gcd(bestN, bestD);
        return (bestN / g) + "/" + (bestD / g);
      }
      return Math.round(x * 100) + "/100";
    }

    function drawNL() {
      var c = col();
      var ctx = nlCanvas.getContext("2d");
      var w = nlCanvas.width, h = nlCanvas.height;
      if (!ctx || w === 0) return;
      ctx.clearRect(0, 0, w, h);

      var pad = 40;
      var trackY = h / 2 - 10;
      var trackW = w - pad * 2;
      var val = parseFloat(nlSlider.value) / 1000;

      // Track line
      ctx.beginPath();
      ctx.strokeStyle = c.textMuted;
      ctx.lineWidth = 4;
      ctx.moveTo(pad, trackY);
      ctx.lineTo(w - pad, trackY);
      ctx.stroke();

      // Major tick marks (0, 1/4, 1/2, 3/4, 1)
      var ticks = [
        { v: 0, label: "0" },
        { v: 0.25, label: "1/4" },
        { v: 0.5, label: "1/2" },
        { v: 0.75, label: "3/4" },
        { v: 1.0, label: "1" }
      ];

      ctx.font = "600 11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ticks.forEach(function (t) {
        var tx = pad + t.v * trackW;
        ctx.beginPath();
        ctx.strokeStyle = c.text;
        ctx.lineWidth = 2;
        ctx.moveTo(tx, trackY - 10);
        ctx.lineTo(tx, trackY + 10);
        ctx.stroke();

        ctx.fillStyle = c.textMuted;
        ctx.fillText(t.label, tx, trackY + 26);
        ctx.fillText((t.v * 100).toFixed(0) + "%", tx, trackY - 18);
      });

      // Active fill bar
      var curX = pad + val * trackW;
      ctx.beginPath();
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 6;
      ctx.moveTo(pad, trackY);
      ctx.lineTo(curX, trackY);
      ctx.stroke();

      // Thumb
      ctx.beginPath();
      ctx.fillStyle = c.accent;
      ctx.arc(curX, trackY, 10, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    function updateNL() {
      var val = parseFloat(nlSlider.value) / 1000;
      nlValSpan.textContent = val.toFixed(3);
      valDec.textContent = val.toFixed(2);
      valPct.textContent = (val * 100).toFixed(1).replace(/\.0$/, "") + "%";
      valFrac.textContent = getSimpleFrac(val);
      drawNL();
    }

    var nlKit = mk("nl-canvas", "nl-box", drawNL);
    nlSlider.addEventListener("input", updateNL);

    // Bench buttons
    document.querySelectorAll("#bench-btns button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var n = parseFloat(btn.dataset.n);
        var d = parseFloat(btn.dataset.d);
        nlSlider.value = Math.round((n / d) * 1000);
        updateNL();
      });
    });

    /* ── Lab 2: Area Models (Strip & Pie) ── */
    var stripCanvas = $("strip-canvas");
    var pieCanvas = $("pie-canvas");
    var amN = $("am-n");
    var amD = $("am-d");

    function drawStrip() {
      var c = col();
      var ctx = stripCanvas.getContext("2d");
      var w = stripCanvas.width, h = stripCanvas.height;
      if (!ctx || w === 0) return;
      ctx.clearRect(0, 0, w, h);

      var n = parseInt(amN.value, 10);
      var d = parseInt(amD.value, 10);
      if (n > d) n = d; // clamp

      // 1. Draw Fraction Strip
      var barX = 25, barY = 25, barW = w - 50, barH = 50;
      ctx.fillStyle = "rgba(100,116,139,0.12)";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeStyle = c.text;
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, barH);

      var cellW = barW / d;
      for (var i = 0; i < d; i++) {
        var cx = barX + i * cellW;
        if (i < n) {
          ctx.fillStyle = c.accent;
          ctx.fillRect(cx, barY, cellW, barH);
        }
        ctx.beginPath();
        ctx.strokeStyle = c.text;
        ctx.lineWidth = 1.5;
        ctx.moveTo(cx, barY);
        ctx.lineTo(cx, barY + barH);
        ctx.stroke();
      }

      ctx.fillStyle = c.text;
      ctx.font = "600 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Fraction Strip: " + n + " of " + d + " parts shaded (" + n + "/" + d + ")", barX, barY + barH + 18);

      // 2. Draw 100-Grid Percent Matrix
      var gridX = barX, gridY = barY + barH + 35;
      var gridSide = 12;
      var frac = n / d;
      var shadedBlocks = Math.round(frac * 100);

      ctx.fillStyle = c.textMuted;
      ctx.fillText("100-Grid (Percent = parts per 100): " + shadedBlocks + "/100", gridX, gridY - 8);

      for (var r = 0; r < 10; r++) {
        for (var colIdx = 0; colIdx < 10; colIdx++) {
          var idx = r * 10 + colIdx;
          var bx = gridX + colIdx * (gridSide + 2);
          var by = gridY + r * (gridSide + 2);
          if (idx < shadedBlocks) {
            ctx.fillStyle = "#ea580c";
          } else {
            ctx.fillStyle = "rgba(100,116,139,0.15)";
          }
          ctx.fillRect(bx, by, gridSide, gridSide);
        }
      }
    }

    function drawPie() {
      var c = col();
      var ctx = pieCanvas.getContext("2d");
      var w = pieCanvas.width, h = pieCanvas.height;
      if (!ctx || w === 0) return;
      ctx.clearRect(0, 0, w, h);

      var n = parseInt(amN.value, 10);
      var d = parseInt(amD.value, 10);
      if (n > d) n = d;

      var cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.38;
      var frac = n / d;

      // Base circle
      ctx.beginPath();
      ctx.fillStyle = "rgba(100,116,139,0.1)";
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();

      // Shaded sector
      if (n > 0) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * TAU);
        ctx.closePath();
        ctx.fillStyle = c.accent;
        ctx.fill();
      }

      // Slice lines
      ctx.strokeStyle = c.text;
      ctx.lineWidth = 1.5;
      for (var i = 0; i < d; i++) {
        var ang = -Math.PI / 2 + (i / d) * TAU;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();

      ctx.fillStyle = c.text;
      ctx.font = "600 12px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText((frac * 360).toFixed(0) + "° / 360°", cx, h - 14);
    }

    function updateAreaModels() {
      var n = parseInt(amN.value, 10);
      var d = parseInt(amD.value, 10);
      if (n > d) { n = d; amN.value = n; }
      $("am-nv").textContent = n;
      $("am-dv").textContent = d;

      var frac = n / d;
      $("am-frac-read").textContent = n + "/" + d;
      $("am-dec-read").textContent = frac.toFixed(3);
      $("am-pct-read").textContent = (frac * 100).toFixed(1) + "%";
      $("am-ang-read").textContent = (frac * 360).toFixed(0) + "°";

      drawStrip();
      drawPie();
    }

    mk("strip-canvas", "strip-box", drawStrip);
    mk("pie-canvas", "pie-box", drawPie);
    amN.addEventListener("input", updateAreaModels);
    amD.addEventListener("input", updateAreaModels);

    /* ── Lab 3: Equivalent Fractions ── */
    var eqCanvas = $("eq-canvas");
    var eqBase = $("eq-base");
    var eqK = $("eq-k");

    function drawEquiv() {
      var c = col();
      var ctx = eqCanvas.getContext("2d");
      var w = eqCanvas.width, h = eqCanvas.height;
      if (!ctx || w === 0) return;
      ctx.clearRect(0, 0, w, h);

      var parts = eqBase.value.split("/");
      var baseN = parseInt(parts[0], 10);
      var baseD = parseInt(parts[1], 10);
      var k = parseInt(eqK.value, 10);
      var newN = baseN * k;
      var newD = baseD * k;

      var pad = 30;
      var barW = w - pad * 2;
      var barH = 45;

      // Top bar: Base fraction
      var y1 = 40;
      ctx.fillStyle = "rgba(100,116,139,0.12)";
      ctx.fillRect(pad, y1, barW, barH);
      ctx.strokeStyle = c.text;
      ctx.lineWidth = 2;
      ctx.strokeRect(pad, y1, barW, barH);

      var w1 = barW / baseD;
      for (var i = 0; i < baseD; i++) {
        if (i < baseN) {
          ctx.fillStyle = "rgba(37,99,235,0.7)";
          ctx.fillRect(pad + i * w1, y1, w1, barH);
        }
        ctx.beginPath();
        ctx.moveTo(pad + i * w1, y1);
        ctx.lineTo(pad + i * w1, y1 + barH);
        ctx.stroke();
      }
      ctx.fillStyle = c.text;
      ctx.font = "600 12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Original: " + baseN + "/" + baseD, pad, y1 - 10);

      // Bottom bar: Sliced into k times as many pieces
      var y2 = y1 + barH + 45;
      ctx.fillStyle = "rgba(100,116,139,0.12)";
      ctx.fillRect(pad, y2, barW, barH);
      ctx.strokeRect(pad, y2, barW, barH);

      var w2 = barW / newD;
      for (var j = 0; j < newD; j++) {
        if (j < newN) {
          ctx.fillStyle = "#16a34a";
          ctx.fillRect(pad + j * w2, y2, w2, barH);
        }
        ctx.beginPath();
        ctx.moveTo(pad + j * w2, y2);
        ctx.lineTo(pad + j * w2, y2 + barH);
        ctx.stroke();
      }
      ctx.fillStyle = c.text;
      ctx.fillText("Each slice cut into " + k + " parts: " + newN + "/" + newD, pad, y2 - 10);

      $("eq-math-display").innerHTML = baseN + "/" + baseD + " = (" + baseN + " × " + k + ") / (" + baseD + " × " + k + ") = " + newN + "/" + newD + " = " + ((baseN / baseD) * 100).toFixed(1) + "%";
    }

    function updateEquiv() {
      $("eq-kv").textContent = "×" + eqK.value;
      drawEquiv();
    }

    mk("eq-canvas", "eq-box", drawEquiv);
    eqBase.addEventListener("change", updateEquiv);
    eqK.addEventListener("input", updateEquiv);

    SimKit.theme.onChange(function () {
      drawNL();
      drawStrip();
      drawPie();
      drawEquiv();
    });

    /* ── Practice check ── */
    document.querySelectorAll(".tc-practice-item").forEach(function (item) {
      var input = item.querySelector("input"), fb = item.querySelector(".fb");
      function check() {
        var v = parseFloat(input.value.trim().replace("%", ""));
        if (isNaN(v)) { fb.textContent = "Enter a valid number."; fb.className = "fb no"; return; }
        var target = parseFloat(item.dataset.answer);
        var ok = Math.abs(v - target) <= 0.01;
        fb.textContent = ok ? "✔ Correct!" : "Not quite. Hint: " + item.dataset.hint;
        fb.className = "fb " + (ok ? "ok" : "no");
      }
      item.querySelector("button").addEventListener("click", check);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") check(); });
    });

    updateNL();
    updateAreaModels();
    updateEquiv();
  })();
