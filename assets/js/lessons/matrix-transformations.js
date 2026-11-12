(function () {
    "use strict";
    var TAU = Math.PI * 2;
    function $(id) { return document.getElementById(id); }
    function col() { return SimKit.theme.colors(); }
    function mk(id, boxId, draw) { return SimKit.canvas2d($(id), { box: $(boxId), onResize: function () { draw(); } }); }

    var matCanvas = $("mat-canvas");
    var inA = $("mat-a"), inB = $("mat-b"), inC = $("mat-c"), inD = $("mat-d");
    var readI = $("read-i"), readJ = $("read-j"), readDet = $("read-det"), readOrient = $("read-orient");
    var invA = $("inv-a"), invB = $("inv-b"), invC = $("inv-c"), invD = $("inv-d");
    var invNote = $("inv-status-note");
    var shapeSel = $("shape-sel");
    var chkGrid = $("chk-grid");

    // Current matrix parameters
    var A = { a: 1, b: 0, c: 0, d: 1 };
    var dragging = null; // 'i' or 'j'

    function getDet() {
      return A.a * A.d - A.b * A.c;
    }

    function worldToScreen(wx, wy, w, h) {
      var sc = Math.min(w, h) / 8; // 8 units across (-4 to 4)
      var cx = w / 2, cy = h / 2;
      return { x: cx + wx * sc, y: cy - wy * sc, sc: sc };
    }

    function screenToWorld(sx, sy, w, h) {
      var sc = Math.min(w, h) / 8;
      var cx = w / 2, cy = h / 2;
      return { x: (sx - cx) / sc, y: (cy - sy) / sc };
    }

    function drawArrow(ctx, x0, y0, x1, y1, color, width) {
      var dx = x1 - x0, dy = y1 - y0;
      var len = Math.hypot(dx, dy);
      if (len < 1) return;
      var angle = Math.atan2(dy, dx);
      var headLen = Math.min(14, len * 0.4);

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width || 3;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - headLen * Math.cos(angle - Math.PI / 6), y1 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x1 - headLen * Math.cos(angle + Math.PI / 6), y1 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }

    function draw() {
      var c = col();
      var ctx = matCanvas.getContext("2d");
      var w = matCanvas.width, h = matCanvas.height;
      if (!ctx || w === 0) return;
      ctx.clearRect(0, 0, w, h);

      var p0 = worldToScreen(0, 0, w, h);
      var sc = p0.sc;

      // 1. Draw static background reference grid
      ctx.strokeStyle = "rgba(100,116,139,0.15)";
      ctx.lineWidth = 1;
      for (var x = -4; x <= 4; x++) {
        var sp1 = worldToScreen(x, -4, w, h);
        var sp2 = worldToScreen(x, 4, w, h);
        ctx.beginPath(); ctx.moveTo(sp1.x, sp1.y); ctx.lineTo(sp2.x, sp2.y); ctx.stroke();
      }
      for (var y = -4; y <= 4; y++) {
        var sp3 = worldToScreen(-4, y, w, h);
        var sp4 = worldToScreen(4, y, w, h);
        ctx.beginPath(); ctx.moveTo(sp3.x, sp3.y); ctx.lineTo(sp4.x, sp4.y); ctx.stroke();
      }

      // 2. Draw transformed grid lines (if checked)
      if (chkGrid.checked) {
        ctx.strokeStyle = "rgba(37,99,235,0.22)";
        ctx.lineWidth = 1.2;
        for (var gx = -3; gx <= 3; gx++) {
          var ta1 = worldToScreen(gx * A.a + -3 * A.b, gx * A.c + -3 * A.d, w, h);
          var ta2 = worldToScreen(gx * A.a + 3 * A.b, gx * A.c + 3 * A.d, w, h);
          ctx.beginPath(); ctx.moveTo(ta1.x, ta1.y); ctx.lineTo(ta2.x, ta2.y); ctx.stroke();
        }
        for (var gy = -3; gy <= 3; gy++) {
          var tb1 = worldToScreen(-3 * A.a + gy * A.b, -3 * A.c + gy * A.d, w, h);
          var tb2 = worldToScreen(3 * A.a + gy * A.b, 3 * A.c + gy * A.d, w, h);
          ctx.beginPath(); ctx.moveTo(tb1.x, tb1.y); ctx.lineTo(tb2.x, tb2.y); ctx.stroke();
        }
      }

      // 3. Axes
      ctx.beginPath();
      ctx.strokeStyle = c.textMuted;
      ctx.lineWidth = 2;
      var axL = worldToScreen(-4, 0, w, h), axR = worldToScreen(4, 0, w, h);
      ctx.moveTo(axL.x, axL.y); ctx.lineTo(axR.x, axR.y);
      var ayB = worldToScreen(0, -4, w, h), ayT = worldToScreen(0, 4, w, h);
      ctx.moveTo(ayB.x, ayB.y); ctx.lineTo(ayT.x, ayT.y);
      ctx.stroke();

      // 4. Draw Transformed Shape
      var shape = shapeSel.value;
      var det = getDet();

      if (shape === "square") {
        // Transformed unit square (0,0) -> (a,c) -> (a+b, c+d) -> (b,d)
        var s0 = worldToScreen(0, 0, w, h);
        var s1 = worldToScreen(A.a, A.c, w, h);
        var s2 = worldToScreen(A.a + A.b, A.c + A.d, w, h);
        var s3 = worldToScreen(A.b, A.d, w, h);

        ctx.beginPath();
        ctx.moveTo(s0.x, s0.y);
        ctx.lineTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.lineTo(s3.x, s3.y);
        ctx.closePath();
        ctx.fillStyle = det < 0 ? "rgba(220,38,38,0.22)" : "rgba(34,197,94,0.25)";
        ctx.fill();
        ctx.strokeStyle = det < 0 ? "#dc2626" : "#16a34a";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (shape === "f-glyph") {
        // Letter F points
        var fPts = [
          [0, 0], [0, 2], [1.2, 2], [1.2, 1.6], [0.4, 1.6],
          [0.4, 1.2], [1.0, 1.2], [1.0, 0.8], [0.4, 0.8], [0.4, 0]
        ];
        ctx.beginPath();
        fPts.forEach(function (pt, idx) {
          var tx = pt[0] * A.a + pt[1] * A.b;
          var ty = pt[0] * A.c + pt[1] * A.d;
          var sp = worldToScreen(tx, ty, w, h);
          if (idx === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        });
        ctx.closePath();
        ctx.fillStyle = "rgba(124,58,237,0.3)";
        ctx.fill();
        ctx.strokeStyle = "#7c3aed";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (shape === "circle") {
        ctx.beginPath();
        var N = 72;
        for (var i = 0; i <= N; i++) {
          var th = (i / N) * TAU;
          var cx0 = Math.cos(th), cy0 = Math.sin(th);
          var tx = cx0 * A.a + cy0 * A.b;
          var ty = cx0 * A.c + cy0 * A.d;
          var sp = worldToScreen(tx, ty, w, h);
          if (i === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(234,88,12,0.25)";
        ctx.fill();
        ctx.strokeStyle = "#ea580c";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 5. Draw basis vectors i-hat and j-hat
      var pi = worldToScreen(A.a, A.c, w, h);
      var pj = worldToScreen(A.b, A.d, w, h);

      drawArrow(ctx, p0.x, p0.y, pi.x, pi.y, "#2563eb", 3.5);
      drawArrow(ctx, p0.x, p0.y, pj.x, pj.y, "#ea580c", 3.5);

      // Handle dots at arrow tips for easy grabbing
      ctx.beginPath(); ctx.fillStyle = "#2563eb"; ctx.arc(pi.x, pi.y, 7, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();

      ctx.beginPath(); ctx.fillStyle = "#ea580c"; ctx.arc(pj.x, pj.y, 7, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.stroke();

      // Labels
      ctx.font = "bold 13px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("î (" + A.a.toFixed(1) + ", " + A.c.toFixed(1) + ")", pi.x + 10, pi.y - 6);

      ctx.fillStyle = "#ea580c";
      ctx.fillText("ĵ (" + A.b.toFixed(1) + ", " + A.d.toFixed(1) + ")", pj.x + 10, pj.y - 6);
    }

    function syncUI() {
      inA.value = A.a.toFixed(1);
      inB.value = A.b.toFixed(1);
      inC.value = A.c.toFixed(1);
      inD.value = A.d.toFixed(1);

      readI.textContent = "(" + A.a.toFixed(2) + ", " + A.c.toFixed(2) + ")";
      readJ.textContent = "(" + A.b.toFixed(2) + ", " + A.d.toFixed(2) + ")";

      var det = getDet();
      readDet.textContent = det.toFixed(2);
      if (Math.abs(det) < 0.001) {
        readOrient.textContent = "Singular (Det = 0)";
        readOrient.style.color = "#dc2626";
      } else if (det < 0) {
        readOrient.textContent = "Flipped (Orientation reversed)";
        readOrient.style.color = "#dc2626";
      } else {
        readOrient.textContent = "Preserved (Standard)";
        readOrient.style.color = "#15803d";
      }

      // Update inverse matrix display
      if (Math.abs(det) < 0.001) {
        invA.textContent = "—";
        invB.textContent = "—";
        invC.textContent = "—";
        invD.textContent = "—";
        invNote.textContent = "Determinant is 0. Inverse does not exist (information was lost/flattened).";
        $("btn-apply-inv").disabled = true;
      } else {
        var invDet = 1 / det;
        invA.textContent = (A.d * invDet).toFixed(2);
        invB.textContent = (-A.b * invDet).toFixed(2);
        invC.textContent = (-A.c * invDet).toFixed(2);
        invD.textContent = (A.a * invDet).toFixed(2);
        invNote.textContent = "det(A) = " + det.toFixed(2) + " ≠ 0. This transformation is fully reversible!";
        $("btn-apply-inv").disabled = false;
      }

      draw();
    }

    // Input changes
    [inA, inB, inC, inD].forEach(function (inp) {
      inp.addEventListener("input", function () {
        A.a = parseFloat(inA.value) || 0;
        A.b = parseFloat(inB.value) || 0;
        A.c = parseFloat(inC.value) || 0;
        A.d = parseFloat(inD.value) || 0;
        syncUI();
      });
    });

    // Preset buttons
    $("btn-ident").addEventListener("click", function () { A = { a: 1, b: 0, c: 0, d: 1 }; syncUI(); });
    $("btn-rot90").addEventListener("click", function () { A = { a: 0, b: -1, c: 1, d: 0 }; syncUI(); });
    $("btn-rot45").addEventListener("click", function () { var v = Math.cos(Math.PI / 4); A = { a: v, b: -v, c: v, d: v }; syncUI(); });
    $("btn-shear").addEventListener("click", function () { A = { a: 1, b: 1.5, c: 0, d: 1 }; syncUI(); });
    $("btn-scale2").addEventListener("click", function () { A = { a: 2, b: 0, c: 0, d: 2 }; syncUI(); });
    $("btn-reflx").addEventListener("click", function () { A = { a: 1, b: 0, c: 0, d: -1 }; syncUI(); });
    $("btn-flatten").addEventListener("click", function () { A = { a: 1.5, b: 3.0, c: 0.75, d: 1.5 }; syncUI(); });

    // Apply inverse
    $("btn-apply-inv").addEventListener("click", function () {
      var det = getDet();
      if (Math.abs(det) < 0.001) return;
      var invDet = 1 / det;
      A = { a: A.d * invDet, b: -A.b * invDet, c: -A.c * invDet, d: A.a * invDet };
      syncUI();
    });

    shapeSel.addEventListener("change", draw);
    chkGrid.addEventListener("change", draw);

    // Canvas dragging for vector heads
    function getPointerPos(e) {
      var rect = matCanvas.getBoundingClientRect();
      var clientX = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      var clientY = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      return {
        x: (clientX - rect.left) * (matCanvas.width / rect.width),
        y: (clientY - rect.top) * (matCanvas.height / rect.height)
      };
    }

    matCanvas.addEventListener("pointerdown", function (e) {
      var p = getPointerPos(e);
      var w = matCanvas.width, h = matCanvas.height;
      var pi = worldToScreen(A.a, A.c, w, h);
      var pj = worldToScreen(A.b, A.d, w, h);

      var distI = Math.hypot(p.x - pi.x, p.y - pi.y);
      var distJ = Math.hypot(p.x - pj.x, p.y - pj.y);

      if (distI < 25) {
        dragging = "i";
        matCanvas.setPointerCapture(e.pointerId);
      } else if (distJ < 25) {
        dragging = "j";
        matCanvas.setPointerCapture(e.pointerId);
      }
    });

    matCanvas.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var p = getPointerPos(e);
      var w = matCanvas.width, h = matCanvas.height;
      var world = screenToWorld(p.x, p.y, w, h);
      // Snap to 0.1
      var sx = Math.round(world.x * 10) / 10;
      var sy = Math.round(world.y * 10) / 10;

      if (dragging === "i") {
        A.a = sx; A.c = sy;
      } else if (dragging === "j") {
        A.b = sx; A.d = sy;
      }
      syncUI();
    });

    function endDrag(e) {
      if (dragging) {
        try { matCanvas.releasePointerCapture(e.pointerId); } catch (err) {}
        dragging = null;
      }
    }
    matCanvas.addEventListener("pointerup", endDrag);
    matCanvas.addEventListener("pointercancel", endDrag);

    var matKit = mk("mat-canvas", "mat-box", draw);
    SimKit.theme.onChange(function () { draw(); });

    /* ── Practice check ── */
    document.querySelectorAll(".tc-practice-item").forEach(function (item) {
      var input = item.querySelector("input"), fb = item.querySelector(".fb");
      function check() {
        var v = parseFloat(input.value.trim());
        if (isNaN(v)) { fb.textContent = "Enter a valid number."; fb.className = "fb no"; return; }
        var target = parseFloat(item.dataset.answer);
        var ok = Math.abs(v - target) <= 0.05;
        fb.textContent = ok ? "✔ Correct!" : "Not quite. Hint: " + item.dataset.hint;
        fb.className = "fb " + (ok ? "ok" : "no");
      }
      item.querySelector("button").addEventListener("click", check);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") check(); });
    });

    syncUI();
  })();
