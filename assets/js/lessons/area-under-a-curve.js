(function () {
    "use strict";
    function $(id) { return document.getElementById(id); }
    function col() { return SimKit.theme.colors(); }
    function mk(id, boxId, draw) { return SimKit.canvas2d($(id), { box: $(boxId), onResize: function () { draw(); } }); }

    /* Curves definitions */
    var curves = {
      parabola: {
        name: "f(x) = x²",
        f: function (x) { return x * x; },
        F: function (x) { return (x * x * x) / 3; },
        a: 0, b: 3, yMax: 10
      },
      dome: {
        name: "f(x) = 4 - x²",
        f: function (x) { return Math.max(0, 4 - x * x); },
        F: function (x) { return 4 * x - (x * x * x) / 3; },
        a: 0, b: 2, yMax: 5
      },
      wave: {
        name: "f(x) = sin(x) + 1.2",
        f: function (x) { return Math.sin(x) + 1.2; },
        F: function (x) { return -Math.cos(x) + 1.2 * x + 1; },
        a: 0, b: Math.PI, yMax: 3
      },
      exp: {
        name: "f(x) = e^(0.5x)",
        f: function (x) { return Math.exp(0.5 * x); },
        F: function (x) { return 2 * Math.exp(0.5 * x) - 2; },
        a: 0, b: 3, yMax: 5.5
      }
    };

    var activeFn = "parabola";
    var activeMethod = "left";

    var rmCanvas = $("rm-canvas");
    var rmN = $("rm-n"), rmNv = $("rm-nv");
    var readApprox = $("read-approx"), readExact = $("read-exact"), readErr = $("read-err"), readDx = $("read-dx");

    function computeRiemann(cDef, N, method) {
      var dx = (cDef.b - cDef.a) / N;
      var sum = 0;
      var rects = [];

      for (var i = 0; i < N; i++) {
        var xL = cDef.a + i * dx;
        var xR = xL + dx;
        var evalX;
        if (method === "left") evalX = xL;
        else if (method === "right") evalX = xR;
        else if (method === "mid") evalX = (xL + xR) / 2;
        else if (method === "trap") {
          var yAvg = (cDef.f(xL) + cDef.f(xR)) / 2;
          sum += yAvg * dx;
          rects.push({ xL: xL, xR: xR, yL: cDef.f(xL), yR: cDef.f(xR), isTrap: true });
          continue;
        }

        var h = cDef.f(evalX);
        sum += h * dx;
        rects.push({ xL: xL, xR: xR, h: h, isTrap: false });
      }

      var exact = cDef.F(cDef.b) - cDef.F(cDef.a);
      return { sum: sum, exact: exact, dx: dx, rects: rects };
    }

    function drawRiemann() {
      var c = col();
      var ctx = rmCanvas.getContext("2d");
      var w = rmCanvas.width, h = rmCanvas.height;
      if (!ctx || w === 0) return;
      ctx.clearRect(0, 0, w, h);

      var cDef = curves[activeFn];
      var N = parseInt(rmN.value, 10);
      var res = computeRiemann(cDef, N, activeMethod);

      rmNv.textContent = "N = " + N + " slices";
      readApprox.textContent = res.sum.toFixed(3);
      readExact.textContent = res.exact.toFixed(3);
      var err = Math.abs(res.sum - res.exact);
      var pct = (err / res.exact) * 100;
      readErr.textContent = err.toFixed(3) + " (" + pct.toFixed(1) + "%)";
      readDx.textContent = res.dx.toFixed(3);

      var pad = 40;
      var ox = pad + 15, oy = h - pad;
      var gw = w - ox - pad, gh = oy - pad;

      var sx = gw / (cDef.b - cDef.a);
      var sy = gh / cDef.yMax;

      function toX(x) { return ox + (x - cDef.a) * sx; }
      function toY(y) { return oy - y * sy; }

      // 1. Draw Rectangles / Trapezoids
      res.rects.forEach(function (r) {
        var rx1 = toX(r.xL), rx2 = toX(r.xR);
        if (r.isTrap) {
          ctx.beginPath();
          ctx.moveTo(rx1, oy);
          ctx.lineTo(rx1, toY(r.yL));
          ctx.lineTo(rx2, toY(r.yR));
          ctx.lineTo(rx2, oy);
          ctx.closePath();
          ctx.fillStyle = "rgba(37,99,235,0.28)";
          ctx.fill();
          ctx.strokeStyle = "rgba(37,99,235,0.7)";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          var ry = toY(r.h);
          ctx.fillStyle = "rgba(37,99,235,0.28)";
          ctx.fillRect(rx1, ry, rx2 - rx1, oy - ry);
          ctx.strokeStyle = "rgba(37,99,235,0.7)";
          ctx.lineWidth = 1;
          ctx.strokeRect(rx1, ry, rx2 - rx1, oy - ry);
        }
      });

      // 2. Continuous Curve
      ctx.beginPath();
      ctx.strokeStyle = "#ea580c";
      ctx.lineWidth = 3;
      var steps = 150;
      for (var s = 0; s <= steps; s++) {
        var xVal = cDef.a + (s / steps) * (cDef.b - cDef.a);
        var cx = toX(xVal), cy = toY(cDef.f(xVal));
        if (s === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      // 3. Axes
      ctx.beginPath();
      ctx.strokeStyle = c.textMuted;
      ctx.lineWidth = 1.5;
      ctx.moveTo(ox, pad); ctx.lineTo(ox, oy); ctx.lineTo(w - pad, oy);
      ctx.stroke();

      // Axis ticks
      ctx.font = "600 11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = c.textMuted;
      ctx.textAlign = "center";
      ctx.fillText(cDef.a.toFixed(1), toX(cDef.a), oy + 16);
      ctx.fillText(cDef.b.toFixed(1), toX(cDef.b), oy + 16);
      ctx.fillText(cDef.name, w - pad - 60, pad + 15);
    }

    mk("rm-canvas", "rm-box", drawRiemann);
    rmN.addEventListener("input", drawRiemann);

    document.querySelectorAll("#fn-btns button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("#fn-btns button").forEach(function (b) { b.classList.remove("primary"); });
        btn.classList.add("primary");
        activeFn = btn.dataset.fn;
        drawRiemann();
        drawAccum();
      });
    });

    document.querySelectorAll("#method-btns button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("#method-btns button").forEach(function (b) { b.classList.remove("primary"); });
        btn.classList.add("primary");
        activeMethod = btn.dataset.m;
        drawRiemann();
      });
    });

    /* ── Lab 2: Accumulation Stacked Graphs ── */
    var accCanvas = $("acc-canvas");
    var accX = $("acc-x"), accXv = $("acc-xv");
    var accHeight = $("acc-height"), accArea = $("acc-area"), accSlope = $("acc-slope");

    function drawAccum() {
      var c = col();
      var ctx = accCanvas.getContext("2d");
      var w = accCanvas.width, h = accCanvas.height;
      if (!ctx || w === 0) return;
      ctx.clearRect(0, 0, w, h);

      var cDef = curves[activeFn];
      var curX = Math.min(cDef.b, Math.max(cDef.a, parseFloat(accX.value)));

      accX.min = cDef.a; accX.max = cDef.b;
      accXv.textContent = "x = " + curX.toFixed(2);

      var heightVal = cDef.f(curX);
      var areaVal = cDef.F(curX) - cDef.F(cDef.a);

      accHeight.textContent = heightVal.toFixed(2);
      accArea.textContent = areaVal.toFixed(2);
      accSlope.textContent = heightVal.toFixed(2);

      var pad = 35;
      var gap = 30;
      var subH = (h - pad * 2 - gap) / 2;

      var ox = pad + 15;
      var gw = w - ox - pad;
      var sx = gw / (cDef.b - cDef.a);

      function toX(x) { return ox + (x - cDef.a) * sx; }

      // Top Graph: f(t) with shaded area up to curX
      var oy1 = pad + subH;
      var sy1 = (subH - 15) / cDef.yMax;
      function toY1(y) { return oy1 - y * sy1; }

      ctx.fillStyle = c.text;
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("1. Rate curve f(t) · Shaded area = " + areaVal.toFixed(2), ox, pad - 8);

      // Shaded area under f(t) from a to curX
      ctx.beginPath();
      ctx.moveTo(toX(cDef.a), oy1);
      var stepsA = 80;
      for (var s = 0; s <= stepsA; s++) {
        var tx = cDef.a + (s / stepsA) * (curX - cDef.a);
        ctx.lineTo(toX(tx), toY1(cDef.f(tx)));
      }
      ctx.lineTo(toX(curX), oy1);
      ctx.closePath();
      ctx.fillStyle = "rgba(37,99,235,0.3)";
      ctx.fill();

      // Top curve
      ctx.beginPath();
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2.5;
      for (var i = 0; i <= 100; i++) {
        var xVal1 = cDef.a + (i / 100) * (cDef.b - cDef.a);
        var px1 = toX(xVal1), py1 = toY1(cDef.f(xVal1));
        if (i === 0) ctx.moveTo(px1, py1);
        else ctx.lineTo(px1, py1);
      }
      ctx.stroke();

      // Top axes
      ctx.strokeStyle = c.textMuted;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ox, pad); ctx.lineTo(ox, oy1); ctx.lineTo(w - pad, oy1); ctx.stroke();

      // Bottom Graph: F(x) = Accumulated Area
      var oy2 = h - pad;
      var maxArea = cDef.F(cDef.b) - cDef.F(cDef.a);
      var sy2 = (subH - 15) / (maxArea || 1);
      function toY2(y) { return oy2 - y * sy2; }

      ctx.fillStyle = c.text;
      ctx.fillText("2. Accumulation Function F(x) = ∫ f(t) dt", ox, oy1 + gap - 10);

      // Bottom curve
      ctx.beginPath();
      ctx.strokeStyle = "#ea580c";
      ctx.lineWidth = 2.5;
      for (var j = 0; j <= 100; j++) {
        var xVal2 = cDef.a + (j / 100) * (cDef.b - cDef.a);
        var yVal2 = cDef.F(xVal2) - cDef.F(cDef.a);
        var px2 = toX(xVal2), py2 = toY2(yVal2);
        if (j === 0) ctx.moveTo(px2, py2);
        else ctx.lineTo(px2, py2);
      }
      ctx.stroke();

      // Bottom axes
      ctx.strokeStyle = c.textMuted;
      ctx.beginPath(); ctx.moveTo(ox, oy1 + gap); ctx.lineTo(ox, oy2); ctx.lineTo(w - pad, oy2); ctx.stroke();

      // Vertical tracker line linking both graphs
      var curPx = toX(curX);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = c.text;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(curPx, pad);
      ctx.lineTo(curPx, oy2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight dots
      ctx.beginPath();
      ctx.fillStyle = "#2563eb";
      ctx.arc(curPx, toY1(heightVal), 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = "#ea580c";
      ctx.arc(curPx, toY2(areaVal), 5, 0, Math.PI * 2);
      ctx.fill();
    }

    mk("acc-canvas", "acc-box", drawAccum);
    accX.addEventListener("input", drawAccum);

    SimKit.theme.onChange(function () {
      drawRiemann();
      drawAccum();
    });

    /* ── Practice check ── */
    document.querySelectorAll(".tc-practice-item").forEach(function (item) {
      var input = item.querySelector("input"), fb = item.querySelector(".fb");
      function check() {
        var v = parseFloat(input.value.trim());
        if (isNaN(v)) { fb.textContent = "Enter a number."; fb.className = "fb no"; return; }
        var target = parseFloat(item.dataset.answer);
        var ok = Math.abs(v - target) <= 0.05;
        fb.textContent = ok ? "✔ Correct!" : "Not quite. Hint: " + item.dataset.hint;
        fb.className = "fb " + (ok ? "ok" : "no");
      }
      item.querySelector("button").addEventListener("click", check);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") check(); });
    });

    drawRiemann();
    drawAccum();
  })();
