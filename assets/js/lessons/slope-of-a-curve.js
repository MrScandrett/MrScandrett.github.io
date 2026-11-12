(function () {
  "use strict";
  var TAU = Math.PI * 2;
  var SIN = "#2563eb", COS = "#ea580c", GRN = "#16a34a", RED = "#dc2626";
  function $(id) { return document.getElementById(id); }
  function col() { return SimKit.theme.colors(); }
  function f2(x) { return (Math.abs(x) < 0.0005 ? 0 : x).toFixed(3).replace(/\.?0+$/, ""); }
  function line(ctx, x1, y1, x2, y2, color, w, dash) {
    ctx.beginPath(); ctx.setLineDash(dash || []); ctx.strokeStyle = color; ctx.lineWidth = w || 1;
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
  }
  function dot(ctx, x, y, r, color) { ctx.beginPath(); ctx.fillStyle = color; ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function label(ctx, t, x, y, color, align, size) {
    ctx.fillStyle = color; ctx.font = "600 " + (size || 11) + "px 'IBM Plex Mono', monospace";
    ctx.textAlign = align || "left"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y);
  }
  function mk(id, boxId, draw) { return SimKit.canvas2d($(id), { box: $(boxId), onResize: function () { draw(); } }); }

  var FNS = [
    { name: "x²", f: function (x) { return x * x; }, d: function (x) { return 2 * x; }, d2: function () { return 2; }, rule: "slope of x² is 2x" },
    { name: "x³ − 3x", f: function (x) { return x * x * x - 3 * x; }, d: function (x) { return 3 * x * x - 3; }, d2: function (x) { return 6 * x; }, rule: "slope of x³ − 3x is 3x² − 3" },
    { name: "sin x", f: Math.sin, d: Math.cos, d2: function (x) { return -Math.sin(x); }, rule: "slope of sin x is cos x" },
    { name: "eˣ", f: Math.exp, d: Math.exp, d2: Math.exp, rule: "slope of eˣ is eˣ (itself!)" },
    { name: "1/x", f: function (x) { return Math.abs(x) < 0.05 ? (x < 0 ? -20 : 20) : 1 / x; }, d: function (x) { return -1 / (x * x); }, d2: function (x) { return 2 / (x * x * x); }, rule: "slope of 1/x is −1/x²" },
    { name: "ML Loss 0.1x⁴−2x²+x", f: function (x) { return 0.1 * Math.pow(x, 4) - 2 * x * x + x + 4; }, d: function (x) { return 0.4 * Math.pow(x, 3) - 4 * x + 1; }, d2: function (x) { return 1.2 * x * x - 4; }, rule: "loss slope is 0.4x³ − 4x + 1" }
  ];

  function picker(containerId, onPick) {
    var box = $(containerId), state = { fn: FNS[0] };
    box.innerHTML = "";
    FNS.forEach(function (fn, i) {
      var b = document.createElement("button"); b.type = "button"; b.className = "tc-btn" + (i === 0 ? " primary" : ""); b.textContent = "f(x) = " + fn.name;
      b.addEventListener("click", function () {
        state.fn = fn;
        box.querySelectorAll("button").forEach(function (x) { x.classList.toggle("primary", x === b); });
        onPick();
      });
      box.appendChild(b);
    });
    return state;
  }

  function rangeOf(fn, a, b) {
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i <= 200; i++) { var y = fn(a + (b - a) * i / 200); if (y < lo) lo = y; if (y > hi) hi = y; }
    var pad = Math.max((hi - lo) * 0.1, 0.2); return [lo - pad, hi + pad];
  }

  /* ── Lab 1: zoom ────────────────────────────────────── */
  var zmKit, zm = picker("zm-fns", function () { updateZoom(); });
  function zoomFactor() { return Math.pow(10, +$("zm-z").value / 25); }
  function drawZoom() {
    if (!zmKit) return;
    var c = col(), ctx = zmKit.ctx, w = zmKit.width, h = zmKit.height, fn = zm.fn, x0 = +$("zm-x").value, y0 = fn.f(x0), d = fn.d(x0);
    var W = 2 / zoomFactor(), ppu = w / (2 * W);
    function X(x) { return w / 2 + (x - x0) * ppu; }
    function Y(y) { return h / 2 - (y - y0) * ppu; }
    ctx.clearRect(0, 0, w, h);
    line(ctx, 0, h / 2, w, h / 2, c.textMuted, 0.5, [3, 4]);
    line(ctx, w / 2, 0, w / 2, h, c.textMuted, 0.5, [3, 4]);
    if ($("zm-tan").checked) line(ctx, 0, Y(y0 + d * (x0 - W - x0)), w, Y(y0 + d * W), COS, 2.5, [6, 4]);
    ctx.beginPath(); ctx.strokeStyle = SIN; ctx.lineWidth = 3;
    for (var px = 0; px <= w; px += 2) {
      var x = x0 + (px - w / 2) / ppu, y = Y(fn.f(x));
      px ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
    }
    ctx.stroke();
    dot(ctx, w / 2, h / 2, 6, c.accent);
    label(ctx, "window is " + f2(2 * W) + " units wide", 12, 16, c.textMuted, "left", 11);
    label(ctx, "Tangent: y - " + f2(y0) + " = " + f2(d) + "(x - " + f2(x0) + ")", 12, 34, COS, "left", 11);
  }
  function updateZoom() {
    var x0 = +$("zm-x").value, z = zoomFactor(), fn = zm.fn, W = 2 / z;
    $("zm-xv").textContent = x0.toFixed(2); $("zm-zv").textContent = "×" + (z < 10 ? z.toFixed(1) : Math.round(z).toLocaleString("en-US"));
    var box = $("zm-box"), pxPerUnit = box.clientWidth / (2 * W);
    var dev = Math.abs(fn.f(x0 + W) - fn.f(x0) - fn.d(x0) * W) * pxPerUnit;
    $("zm-note").textContent = "Slope at x₀ = " + f2(fn.d(x0)) + ".  Gap between curve and tangent at window edge: " + (dev < 0.5 ? "under 0.5 px (visually identical straight line!)" : dev.toFixed(1) + " px");
    drawZoom();
  }
  zmKit = mk("zm-canvas", "zm-box", drawZoom);
  $("zm-x").addEventListener("input", updateZoom);
  $("zm-z").addEventListener("input", updateZoom);
  $("zm-tan").addEventListener("change", drawZoom);

  /* ── Lab 2: secant ──────────────────────────────────── */
  var seKit, se = picker("se-fns", function () { updateSecant(); });
  function gap() { return 2 * Math.pow(10, -(+$("se-h").value)); }
  function drawSecant() {
    if (!seKit) return;
    var c = col(), ctx = seKit.ctx, w = seKit.width, h = seKit.height, fn = se.fn, x0 = +$("se-x").value, hh = gap();
    var xa = -3, xb = 5, r = rangeOf(fn.f, xa, xb), L = 30, R = 10, T = 10, B = 24;
    function X(x) { return L + (x - xa) / (xb - xa) * (w - L - R); }
    function Y(y) { return h - B - (y - r[0]) / (r[1] - r[0]) * (h - T - B); }
    ctx.clearRect(0, 0, w, h);
    if (r[0] < 0 && r[1] > 0) line(ctx, L, Y(0), w - R, Y(0), c.textMuted, 1);
    line(ctx, X(0), T, X(0), h - B, c.textMuted, 1);
    for (var k = -2; k <= 4; k += 2) label(ctx, "" + k, X(k), h - B + 12, c.textMuted, "center", 10);
    ctx.beginPath(); ctx.strokeStyle = SIN; ctx.lineWidth = 3;
    for (var i = 0; i <= 240; i++) { var x = xa + (xb - xa) * i / 240, y = Y(fn.f(x)); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); }
    ctx.stroke();
    var y0 = fn.f(x0), y1 = fn.f(x0 + hh), m = (y1 - y0) / hh;
    var a = xa, b = xb;
    ctx.save(); ctx.beginPath(); ctx.rect(L, T, w - L - R, h - T - B); ctx.clip();
    line(ctx, X(a), Y(y0 + m * (a - x0)), X(b), Y(y0 + m * (b - x0)), COS, 2.5);
    ctx.restore();
    // Triangle rise and run
    line(ctx, X(x0), Y(y0), X(x0 + hh), Y(y0), "rgba(234,88,12,0.8)", 1.5, [3, 3]);
    line(ctx, X(x0 + hh), Y(y0), X(x0 + hh), Y(y1), "rgba(234,88,12,0.8)", 1.5, [3, 3]);
    label(ctx, "Run = h", (X(x0) + X(x0 + hh)) / 2, Y(y0) + 12, COS, "center", 10);
    label(ctx, "Rise = Δy", X(x0 + hh) + 6, (Y(y0) + Y(y1)) / 2, COS, "left", 10);
    dot(ctx, X(x0), Y(y0), 6, c.accent);
    dot(ctx, X(x0 + hh), Y(y1), 5, COS);
  }
  function updateSecant() {
    var fn = se.fn, x0 = +$("se-x").value, hh = gap(), sec = (fn.f(x0 + hh) - fn.f(x0)) / hh, tan = fn.d(x0);
    $("se-xv").textContent = x0.toFixed(2); $("se-hv").textContent = +hh.toPrecision(3);
    $("se-sec").textContent = f2(sec); $("se-tan").textContent = f2(tan); $("se-diff").textContent = f2(sec - tan);
    var ang = (Math.atan(tan) * 180 / Math.PI).toFixed(1) + "°";
    $("se-ang").textContent = ang;
    drawSecant();
  }
  seKit = mk("se-canvas", "se-box", drawSecant);
  $("se-x").addEventListener("input", updateSecant);
  $("se-h").addEventListener("input", updateSecant);

  /* ── Lab 3: slope function ──────────────────────────── */
  var sfKit, sf = picker("sf-fns", function () { updateSF(); });
  function drawSF() {
    if (!sfKit) return;
    var c = col(), ctx = sfKit.ctx, w = sfKit.width, h = sfKit.height, fn = sf.fn, x0 = +$("sf-x").value;
    var xa = -3, xb = 3, L = 34, R = 10, gapPx = 18, hh = (h - gapPx) / 2;
    var rf = rangeOf(fn.f, xa, xb), rd = rangeOf(fn.d, xa, xb);
    function X(x) { return L + (x - xa) / (xb - xa) * (w - L - R); }
    function YT(y) { return 8 + (rf[1] - y) / (rf[1] - rf[0]) * (hh - 22); }
    function YB(y) { return hh + gapPx + (rd[1] - y) / (rd[1] - rd[0]) * (hh - 22); }
    ctx.clearRect(0, 0, w, h);
    label(ctx, "f(x) Height", 4, 12, c.text, "left", 11);
    label(ctx, "f'(x) Slope", 4, hh + gapPx + 4, c.text, "left", 11);
    [[YT, rf, 0], [YB, rd, 1]].forEach(function (p) {
      var Y = p[0], r = p[1];
      if (r[0] < 0 && r[1] > 0) line(ctx, L, Y(0), w - R, Y(0), c.textMuted, 1, p[2] ? [] : [3, 4]);
    });
    line(ctx, X(0), 8, X(0), h - 4, c.textMuted, 0.5, [3, 4]);
    for (var k = -3; k <= 3; k++) label(ctx, "" + k, X(k), h - 2, c.textMuted, "center", 9);
    var N = 300, prevD = null;
    for (var i = 0; i < N; i++) {
      var xs = xa + (xb - xa) * i / N, xe = xa + (xb - xa) * (i + 1) / N, dm = fn.d((xs + xe) / 2);
      var colr = Math.abs(dm) < 0.04 ? c.textMuted : dm > 0 ? GRN : RED;
      line(ctx, X(xs), YT(fn.f(xs)), X(xe), YT(fn.f(xe)), colr, 3);
      line(ctx, X(xs), YB(fn.d(xs)), X(xe), YB(fn.d(xe)), colr, 3);
      var dEnd = fn.d(xe);
      if (prevD !== null && prevD * dEnd < 0) {
        var xz = xs;
        dot(ctx, X(xz), YT(fn.f(xz)), 5, "#facc15"); dot(ctx, X(xz), YB(fn.d(xz)), 4, "#facc15");
      }
      prevD = dEnd;
    }
    var y0 = fn.f(x0), d0 = fn.d(x0), seg = 0.7;
    line(ctx, X(x0 - seg), YT(y0 - d0 * seg), X(x0 + seg), YT(y0 + d0 * seg), COS, 2.5);
    line(ctx, X(x0), 8, X(x0), h - 12, c.accent, 1.5, [4, 3]);
    dot(ctx, X(x0), YT(y0), 6, c.accent);
    dot(ctx, X(x0), YB(d0), 6, c.accent);
  }
  function updateSF() {
    var fn = sf.fn, x0 = +$("sf-x").value, h = 1e-5, d = (fn.f(x0 + h) - fn.f(x0 - h)) / (2 * h);
    var d2 = fn.d2 ? fn.d2(x0) : 0;
    $("sf-xv").textContent = x0.toFixed(2); $("sf-f").textContent = f2(fn.f(x0)); $("sf-d").textContent = f2(d);
    $("sf-dir").textContent = d > 0.05 ? "rising (+)" : d < -0.05 ? "falling (−)" : "flat (0) peak/valley";
    $("sf-conc").textContent = d2 > 0.05 ? "concave up (holds water)" : d2 < -0.05 ? "concave down (sheds water)" : "inflection point";
    $("sf-rule").textContent = fn.rule + " (at x₀ = " + x0.toFixed(2) + ", slope is " + f2(fn.d(x0)) + ")";
    drawSF();
  }
  sfKit = mk("sf-canvas", "sf-box", drawSF);
  $("sf-x").addEventListener("input", updateSF);

  /* ── Lab 4: power rule & finite differences ─────────── */
  function updatePower() {
    var n = +$("pw-n").value, x = +$("pw-x").value, h = +$("pw-h").value;
    $("pw-nv").textContent = n; $("pw-xv").textContent = x; $("pw-hv").textContent = h.toFixed(3);
    var exact = n === 0 ? 0 : n * Math.pow(x, n - 1);
    var f_x = Math.pow(x, n), f_xh = Math.pow(x + h, n), f_xmh = Math.pow(x - h, n);
    var central = (f_xh - f_xmh) / (2 * h);
    var fwd = (f_xh - f_x) / h;
    $("pw-g").textContent = f2(exact);
    $("pw-m").textContent = f2(central);
    $("pw-fwd").textContent = f2(fwd);
    $("pw-ok").textContent = Math.abs(central - exact) < 0.05 * Math.max(1, Math.abs(exact)) ? "yes ✔" : "approx (step h)";
  }
  $("pw-n").addEventListener("input", updatePower);
  $("pw-x").addEventListener("input", updatePower);
  $("pw-h").addEventListener("input", updatePower);

  /* ── Lab 5: Real-World Engineering Sandbox ──────────── */
  var rwKit, rwScenario = "ada";
  var rwState = { rise: 18, run: 216, grade: -6, skiAngle: 25, roofPitch: 4 };

  function renderRwControls() {
    var ctrl = $("rw-controls"), reads = $("rw-readouts");
    ctrl.innerHTML = ""; reads.innerHTML = "";
    if (rwScenario === "ada") {
      ctrl.innerHTML =
        '<label>Ramp Rise (inches) <input id="rw-ada-rise" type="range" min="6" max="36" step="1" value="' + rwState.rise + '" style="--card-accent:#38bdf8"/> <span id="rw-ada-rise-v" class="tc-mono">' + rwState.rise + ' in</span></label>' +
        '<label>Ramp Run (inches) <input id="rw-ada-run" type="range" min="72" max="432" step="6" value="' + rwState.run + '" style="--card-accent:#38bdf8"/> <span id="rw-ada-run-v" class="tc-mono">' + rwState.run + ' in</span></label>';
      reads.innerHTML =
        '<div>Slope Ratio<strong id="rw-ada-ratio">1 : 12</strong></div>' +
        '<div>Grade %<strong id="rw-ada-pct">8.33%</strong></div>' +
        '<div>Incline Angle<strong id="rw-ada-deg">4.76°</strong></div>' +
        '<div>ADA Compliant?<strong id="rw-ada-status">YES ✔</strong></div>';
      $("rw-ada-rise").addEventListener("input", function (e) { rwState.rise = +e.target.value; $("rw-ada-rise-v").textContent = rwState.rise + " in"; updateRw(); });
      $("rw-ada-run").addEventListener("input", function (e) { rwState.run = +e.target.value; $("rw-ada-run-v").textContent = rwState.run + " in"; updateRw(); });
    } else if (rwScenario === "highway") {
      ctrl.innerHTML =
        '<label>Highway Grade % <input id="rw-hw-grade" type="range" min="-12" max="12" step="0.5" value="' + rwState.grade + '" style="--card-accent:#ea580c"/> <span id="rw-hw-grade-v" class="tc-mono">' + rwState.grade + '%</span></label>';
      reads.innerHTML =
        '<div>Road Slope m<strong id="rw-hw-m">-0.060</strong></div>' +
        '<div>Incline Angle<strong id="rw-hw-deg">-3.43°</strong></div>' +
        '<div>Gravity Pull (g·sinθ)<strong id="rw-hw-acc">-0.59 m/s²</strong></div>' +
        '<div>Safety Rating<strong id="rw-hw-rating">Warning (Steep)</strong></div>';
      $("rw-hw-grade").addEventListener("input", function (e) { rwState.grade = +e.target.value; $("rw-hw-grade-v").textContent = rwState.grade + "%"; updateRw(); });
    } else if (rwScenario === "ski") {
      ctrl.innerHTML =
        '<label>Mountain Slope Angle θ <input id="rw-ski-ang" type="range" min="5" max="50" step="1" value="' + rwState.skiAngle + '" style="--card-accent:#16a34a"/> <span id="rw-ski-ang-v" class="tc-mono">' + rwState.skiAngle + '°</span></label>';
      reads.innerHTML =
        '<div>Slope m = tan(θ)<strong id="rw-ski-m">0.466</strong></div>' +
        '<div>Grade %<strong id="rw-ski-pct">46.6%</strong></div>' +
        '<div>Trail Difficulty<strong id="rw-ski-diff">Black Diamond</strong></div>' +
        '<div>Avalanche Risk<strong id="rw-ski-avalanche">Moderate</strong></div>';
      $("rw-ski-ang").addEventListener("input", function (e) { rwState.skiAngle = +e.target.value; $("rw-ski-ang-v").textContent = rwState.skiAngle + "°"; updateRw(); });
    } else if (rwScenario === "roof") {
      ctrl.innerHTML =
        '<label>Roof Pitch (rise in 12" run) <input id="rw-rf-pitch" type="range" min="0.25" max="12" step="0.25" value="' + rwState.roofPitch + '" style="--card-accent:#a855f7"/> <span id="rw-rf-pitch-v" class="tc-mono">' + rwState.roofPitch + ' : 12</span></label>';
      reads.innerHTML =
        '<div>Pitch Ratio<strong id="rw-rf-ratio">' + rwState.roofPitch + ' : 12</strong></div>' +
        '<div>Slope Grade<strong id="rw-rf-pct">33.3%</strong></div>' +
        '<div>Roof Pitch Angle<strong id="rw-rf-deg">18.4°</strong></div>' +
        '<div>Drainage Status<strong id="rw-rf-drain">Rapid Runoff ✔</strong></div>';
      $("rw-rf-pitch").addEventListener("input", function (e) { rwState.roofPitch = +e.target.value; $("rw-rf-pitch-v").textContent = rwState.roofPitch + " : 12"; updateRw(); });
    }
    updateRw();
  }

  function drawRw() {
    if (!rwKit) return;
    var ctx = rwKit.ctx, w = rwKit.width, h = rwKit.height, c = col();
    ctx.clearRect(0, 0, w, h);

    if (rwScenario === "ada") {
      var rise = rwState.rise, run = rwState.run, ratio = run / rise;
      var scale = Math.min((w - 120) / run, (h - 80) / Math.max(36, rise));
      var ox = 50, oy = h - 40;
      var rwW = run * scale, rwH = rise * scale;

      // Ground line
      line(ctx, 20, oy, w - 20, oy, c.textMuted, 1);
      // Ramp polygon
      ctx.fillStyle = ratio >= 12 ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.25)";
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + rwW, oy); ctx.lineTo(ox + rwW, oy - rwH); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ratio >= 12 ? "#22c55e" : "#ef4444"; ctx.lineWidth = 3; ctx.stroke();

      // Dimensions
      line(ctx, ox, oy + 16, ox + rwW, oy + 16, c.textMuted, 1.5);
      label(ctx, "Run = " + run + " in (" + (run / 12).toFixed(1) + " ft)", ox + rwW / 2, oy + 26, c.textMuted, "center", 11);
      line(ctx, ox + rwW + 10, oy, ox + rwW + 10, oy - rwH, c.textMuted, 1.5);
      label(ctx, "Rise = " + rise + " in", ox + rwW + 18, oy - rwH / 2, c.text, "left", 11);

      // Wheelchair figure
      var wx = ox + rwW * 0.45, wy = oy - rwH * 0.45;
      dot(ctx, wx, wy - 10, 8, "#38bdf8");
      dot(ctx, wx, wy, 12, "rgba(56, 189, 248, 0.4)");
    } else if (rwScenario === "highway") {
      var g = rwState.grade, ox = 40, oy = g < 0 ? 50 : h - 60;
      var ex = w - 60, ey = oy - (g / 100) * (ex - ox) * 0.8;
      // Mountain road
      line(ctx, ox, oy, ex, ey, "#ea580c", 5);
      label(ctx, "Highway Grade = " + g + "%", (ox + ex) / 2, (oy + ey) / 2 - 18, "#ea580c", "center", 13);
      // Truck silhouette
      var tx = ox + (ex - ox) * 0.5, ty = oy + (ey - oy) * 0.5;
      ctx.fillStyle = "#facc15"; ctx.fillRect(tx - 18, ty - 20, 36, 18);
      ctx.fillStyle = "#1e293b"; dot(ctx, tx - 10, ty, 4, "#000"); dot(ctx, tx + 10, ty, 4, "#000");
    } else if (rwScenario === "ski") {
      var ang = rwState.skiAngle, rad = ang * Math.PI / 180;
      var sx = 60, sy = 40, len = 260;
      var ex = sx + len * Math.cos(rad), ey = sy + len * Math.sin(rad);
      line(ctx, sx, sy, ex, ey, "#38bdf8", 4);
      line(ctx, sx, ey, ex, ey, c.textMuted, 1, [3, 3]);
      line(ctx, sx, sy, sx, ey, c.textMuted, 1, [3, 3]);
      label(ctx, "Angle θ = " + ang + "° (Slope m = " + Math.tan(rad).toFixed(2) + ")", (sx + ex) / 2, (sy + ey) / 2 - 14, "#38bdf8", "center", 12);
    } else if (rwScenario === "roof") {
      var p = rwState.roofPitch, rx1 = 50, rx2 = w - 50, rMid = w / 2;
      var rH = (p / 12) * (rMid - rx1);
      var base = h - 50;
      ctx.beginPath(); ctx.moveTo(rx1, base); ctx.lineTo(rMid, base - rH); ctx.lineTo(rx2, base); ctx.closePath();
      ctx.fillStyle = "rgba(168, 85, 247, 0.2)"; ctx.fill();
      ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 3; ctx.stroke();
      label(ctx, "Pitch: " + p + " in 12 (" + ((p / 12) * 100).toFixed(1) + "% slope)", rMid, base - rH - 14, "#a855f7", "center", 12);
    }
  }

  function updateRw() {
    var sbox = $("rw-status-box");
    if (rwScenario === "ada") {
      var rise = rwState.rise, run = rwState.run, m = rise / run, ratio = run / rise, pct = (m * 100).toFixed(2) + "%";
      var deg = (Math.atan(m) * 180 / Math.PI).toFixed(2) + "°";
      $("rw-ada-ratio").textContent = "1 : " + ratio.toFixed(1);
      $("rw-ada-pct").textContent = pct;
      $("rw-ada-deg").textContent = deg;
      var ok = ratio >= 12;
      $("rw-ada-status").textContent = ok ? "YES ✔ (1:" + ratio.toFixed(1) + " ≤ 1:12)" : "NO ❌ (Too Steep!)";
      $("rw-ada-status").style.color = ok ? "#15803d" : "#dc2626";
      sbox.style.background = ok ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)";
      sbox.style.border = ok ? "1px solid #22c55e" : "1px solid #ef4444";
      sbox.style.color = ok ? "#15803d" : "#dc2626";
      sbox.textContent = ok ? "✔ Compliant with ADA Standard 405.2 (Slope ≤ 1:12). Safe for independent wheelchair ascent and descent." : "⚠️ VIOLATION: Ramp slope is 1:" + ratio.toFixed(1) + ". Slopes steeper than 1:12 (8.33%) risk backward tip-over and runaway velocity.";
    } else if (rwScenario === "highway") {
      var g = rwState.grade, m = g / 100, deg = (Math.atan(m) * 180 / Math.PI).toFixed(2) + "°";
      var acc = (9.8 * Math.sin(Math.atan(m))).toFixed(2) + " m/s²";
      $("rw-hw-m").textContent = m.toFixed(3);
      $("rw-hw-deg").textContent = deg;
      $("rw-hw-acc").textContent = acc;
      var warn = Math.abs(g) >= 6;
      $("rw-hw-rating").textContent = warn ? "Severe Mountain Grade" : "Standard Interstate";
      $("rw-hw-rating").style.color = warn ? "#ea580c" : "#15803d";
      sbox.style.background = warn ? "rgba(234, 88, 12, 0.12)" : "rgba(34, 197, 94, 0.12)";
      sbox.style.border = warn ? "1px solid #ea580c" : "1px solid #22c55e";
      sbox.style.color = warn ? "#ea580c" : "#15803d";
      sbox.textContent = warn ? "⚠️ 6% to 8% grades cause intense brake overheating and fade in 18-wheelers. Emergency runaway truck escape ramps (gravel arrester beds +20% slope) are required." : "✔ Grade is under 6%. Vehicles can maintain highway speed without severe brake fading.";
    } else if (rwScenario === "ski") {
      var ang = rwState.skiAngle, m = Math.tan(ang * Math.PI / 180), pct = (m * 100).toFixed(1) + "%";
      $("rw-ski-m").textContent = m.toFixed(3);
      $("rw-ski-pct").textContent = pct;
      var diff = ang < 14 ? "Green Circle (Beginner)" : ang <= 22 ? "Blue Square (Intermediate)" : ang <= 30 ? "Black Diamond (Advanced)" : "Double Black (Expert Only)";
      var aval = (ang >= 30 && ang <= 45) ? "HIGH AVALANCHE DANGER (30°–45°)" : "Low to Moderate";
      $("rw-ski-diff").textContent = diff;
      $("rw-ski-avalanche").textContent = aval;
      $("rw-ski-avalanche").style.color = (ang >= 30 && ang <= 45) ? "#dc2626" : "#15803d";
      sbox.style.background = (ang >= 30 && ang <= 45) ? "rgba(220, 38, 38, 0.12)" : "rgba(14, 165, 233, 0.12)";
      sbox.style.border = (ang >= 30 && ang <= 45) ? "1px solid #dc2626" : "1px solid #0ea5e9";
      sbox.style.color = (ang >= 30 && ang <= 45) ? "#dc2626" : "#0284c7";
      sbox.textContent = (ang >= 30 && ang <= 45) ? "⚠️ AVALANCHE SWEET SPOT: 30° to 45° slopes (58% to 100% grade) produce 90% of all avalanche releases due to gravity shear overcoming snowpack cohesion." : "Trail rating: " + diff + ". Slope angle: " + ang + "°.";
    } else if (rwScenario === "roof") {
      var p = rwState.roofPitch, m = p / 12, pct = (m * 100).toFixed(1) + "%";
      var deg = (Math.atan(m) * 180 / Math.PI).toFixed(1) + "°";
      $("rw-rf-pct").textContent = pct;
      $("rw-rf-deg").textContent = deg;
      var ok = p >= 0.25;
      $("rw-rf-drain").textContent = p >= 4 ? "Rapid Shedding" : p >= 0.25 ? "Slow Drainage (Code Min)" : "Ponding Danger ❌";
      sbox.style.background = ok ? "rgba(34, 197, 94, 0.12)" : "rgba(220, 38, 38, 0.12)";
      sbox.style.border = ok ? "1px solid #22c55e" : "1px solid #dc2626";
      sbox.style.color = ok ? "#15803d" : "#dc2626";
      sbox.textContent = ok ? "✔ Meets International Building Code (IBC) Section 1507. Minimum 1/4\" per foot (2.08% slope) ensures rainwater drains towards scuppers and prevents catastrophic pooling loads." : "❌ DEFECT: Pitch is under 1/4\" per foot. Stagnant rainwater will pool, degrade membranes, and cause roof collapse under standing water weight!";
    }
    drawRw();
  }

  rwKit = mk("rw-canvas", "rw-scenarios", drawRw);
  $("rw-scenarios").addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    rwScenario = btn.dataset.rw;
    $("rw-scenarios").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", b === btn); });
    renderRwControls();
  });
  renderRwControls();

  /* ── Lab 6: Software Development & AI Engineering Sandbox ─ */
  var swKit, swScenario = "gradient";
  var swState = { w: 2.8, alpha: 0.1, charX: 0.2, pidKp: 1.0, pidKd: 0.5 };

  function lossFn(w) { return 0.2 * Math.pow(w, 4) - 1.8 * w * w + 0.3 * w + 4; }
  function lossGrad(w) { return 0.8 * Math.pow(w, 3) - 3.6 * w + 0.3; }

  function renderSwControls() {
    var ctrl = $("sw-controls"), reads = $("sw-readouts");
    ctrl.innerHTML = ""; reads.innerHTML = "";
    if (swScenario === "gradient") {
      ctrl.innerHTML =
        '<label>Parameter w <input id="sw-ml-w" type="range" min="-3" max="3" step="0.05" value="' + swState.w + '" style="--card-accent:#8b5cf6"/> <span id="sw-ml-wv" class="tc-mono">' + swState.w.toFixed(2) + '</span></label>' +
        '<label>Learning Rate α <input id="sw-ml-a" type="range" min="0.02" max="0.8" step="0.02" value="' + swState.alpha + '" style="--card-accent:#8b5cf6"/> <span id="sw-ml-av" class="tc-mono">' + swState.alpha.toFixed(2) + '</span></label>' +
        '<button type="button" class="tc-btn primary" id="sw-ml-step">Step: w ← w − α·∇L</button>' +
        '<button type="button" class="tc-btn" id="sw-ml-auto">Auto Train (5 Steps)</button>';
      reads.innerHTML =
        '<div>Current Weight w<strong id="sw-ml-curw">' + swState.w.toFixed(3) + '</strong></div>' +
        '<div>Loss L(w)<strong id="sw-ml-loss">0</strong></div>' +
        '<div>Loss Slope ∇L<strong id="sw-ml-grad">0</strong></div>' +
        '<div>Step Direction<strong id="sw-ml-dir">Descend</strong></div>';
      $("sw-ml-w").addEventListener("input", function (e) { swState.w = +e.target.value; $("sw-ml-wv").textContent = swState.w.toFixed(2); updateSw(); });
      $("sw-ml-a").addEventListener("input", function (e) { swState.alpha = +e.target.value; $("sw-ml-av").textContent = swState.alpha.toFixed(2); updateSw(); });
      $("sw-ml-step").addEventListener("click", function () {
        var grad = lossGrad(swState.w);
        swState.w = Math.max(-3, Math.min(3, swState.w - swState.alpha * grad));
        $("sw-ml-w").value = swState.w; $("sw-ml-wv").textContent = swState.w.toFixed(2);
        updateSw();
      });
      $("sw-ml-auto").addEventListener("click", function () {
        var count = 0, timer = setInterval(function () {
          var grad = lossGrad(swState.w);
          swState.w = Math.max(-3, Math.min(3, swState.w - swState.alpha * grad));
          $("sw-ml-w").value = swState.w; $("sw-ml-wv").textContent = swState.w.toFixed(2);
          updateSw();
          if (++count >= 5) clearInterval(timer);
        }, 120);
      });
    } else if (swScenario === "game") {
      ctrl.innerHTML =
        '<label>Character Position X <input id="sw-gm-x" type="range" min="-3" max="3" step="0.05" value="' + swState.charX + '" style="--card-accent:#0ea5e9"/> <span id="sw-gm-xv" class="tc-mono">' + swState.charX.toFixed(2) + '</span></label>';
      reads.innerHTML =
        '<div>Terrain Slope m<strong id="sw-gm-m">0</strong></div>' +
        '<div>Incline Angle θ<strong id="sw-gm-ang">0°</strong></div>' +
        '<div>Normal Vector N<strong id="sw-gm-norm">(-m, 1)</strong></div>' +
        '<div>Character State<strong id="sw-gm-state">Standing</strong></div>';
      $("sw-gm-x").addEventListener("input", function (e) { swState.charX = +e.target.value; $("sw-gm-xv").textContent = swState.charX.toFixed(2); updateSw(); });
    } else if (swScenario === "pid") {
      ctrl.innerHTML =
        '<label>Proportional Gain Kp <input id="sw-pid-kp" type="range" min="0.2" max="2.5" step="0.1" value="' + swState.pidKp + '" style="--card-accent:#f59e0b"/> <span id="sw-pid-kpv" class="tc-mono">' + swState.pidKp.toFixed(1) + '</span></label>' +
        '<label>Derivative Gain Kd (Slope) <input id="sw-pid-kd" type="range" min="0" max="1.5" step="0.05" value="' + swState.pidKd + '" style="--card-accent:#f59e0b"/> <span id="sw-pid-kdv" class="tc-mono">' + swState.pidKd.toFixed(2) + '</span></label>';
      reads.innerHTML =
        '<div>Error Slope de/dt<strong id="sw-pid-dedt">-1.42</strong></div>' +
        '<div>D-Term (Braking Force)<strong id="sw-pid-dterm">0</strong></div>' +
        '<div>System Stability<strong id="sw-pid-stab">Damped</strong></div>';
      $("sw-pid-kp").addEventListener("input", function (e) { swState.pidKp = +e.target.value; $("sw-pid-kpv").textContent = swState.pidKp.toFixed(1); updateSw(); });
      $("sw-pid-kd").addEventListener("input", function (e) { swState.pidKd = +e.target.value; $("sw-pid-kdv").textContent = swState.pidKd.toFixed(2); updateSw(); });
    } else if (swScenario === "bezier") {
      ctrl.innerHTML =
        '<label>CSS Timing Function: <code>cubic-bezier(0.25, 0.1, 0.25, 1.0)</code> [Ease-In-Out]</label>';
      reads.innerHTML =
        '<div>Slope at t = 0<strong id="sw-bz-s0">0.40 (Gentle Ease-In)</strong></div>' +
        '<div>Peak Slope (Mid)<strong id="sw-bz-sm">1.75 (Fast Surge)</strong></div>' +
        '<div>Slope at t = 1<strong id="sw-bz-s1">0.00 (Smooth Braking)</strong></div>';
    }
    updateSw();
  }

  function drawSw() {
    if (!swKit) return;
    var ctx = swKit.ctx, w = swKit.width, h = swKit.height, c = col();
    ctx.clearRect(0, 0, w, h);

    if (swScenario === "gradient") {
      var minX = -3, maxX = 3, L = 40, R = 20, T = 20, B = 30;
      function X(x) { return L + (x - minX) / (maxX - minX) * (w - L - R); }
      function Y(y) { return h - B - (y / 8) * (h - T - B); }

      line(ctx, L, Y(0), w - R, Y(0), c.textMuted, 0.8);
      line(ctx, X(0), T, X(0), h - B, c.textMuted, 0.8);

      // Draw loss curve
      ctx.beginPath(); ctx.strokeStyle = "#8b5cf6"; ctx.lineWidth = 3;
      for (var i = 0; i <= 200; i++) {
        var wx = minX + (maxX - minX) * i / 200, wy = lossFn(wx);
        i === 0 ? ctx.moveTo(X(wx), Y(wy)) : ctx.lineTo(X(wx), Y(wy));
      }
      ctx.stroke();

      // Current weight ball
      var cw = swState.w, cl = lossFn(cw), cg = lossGrad(cw);
      dot(ctx, X(cw), Y(cl), 7, "#f43f5e");
      // Tangent slope line
      var tangLen = 0.5;
      line(ctx, X(cw - tangLen), Y(cl - cg * tangLen), X(cw + tangLen), Y(cl + cg * tangLen), "#facc15", 2);
      // Step arrow
      var nextW = cw - swState.alpha * cg;
      line(ctx, X(cw), Y(cl), X(nextW), Y(lossFn(nextW)), "#22c55e", 2.5);
      label(ctx, "w = " + cw.toFixed(2), X(cw), Y(cl) - 16, "#f43f5e", "center", 11);
    } else if (swScenario === "game") {
      var L = 30, R = 20, T = 30, B = 30;
      function terrain(x) { return Math.sin(x * 1.5) * 1.8; }
      function terrainD(x) { return 1.5 * Math.cos(x * 1.5) * 1.8; }
      function X(x) { return L + (x + 3) / 6 * (w - L - R); }
      function Y(y) { return h / 2 - (y / 3) * (h / 2 - 40); }

      // Draw terrain
      ctx.beginPath(); ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 3.5;
      for (var i = 0; i <= 200; i++) {
        var tx = -3 + (6 * i / 200), ty = terrain(tx);
        i === 0 ? ctx.moveTo(X(tx), Y(ty)) : ctx.lineTo(X(tx), Y(ty));
      }
      ctx.stroke();

      var cx = swState.charX, cy = terrain(cx), m = terrainD(cx);
      var ang = Math.atan(m) * 180 / Math.PI;
      var px = X(cx), py = Y(cy);

      // Player circle
      dot(ctx, px, py - 10, 8, "#38bdf8");
      // Normal vector (perpendicular)
      var nLen = 40, normX = -m / Math.sqrt(1 + m * m), normY = 1 / Math.sqrt(1 + m * m);
      line(ctx, px, py, px + normX * nLen, py - normY * nLen, "#f43f5e", 2.5);
      label(ctx, "Normal N", px + normX * nLen + 6, py - normY * nLen, "#f43f5e", "left", 10);
      // Tangent vector
      line(ctx, px - 30, py + 30 * m, px + 30, py - 30 * m, "#facc15", 2);
    } else if (swScenario === "pid") {
      line(ctx, 30, h / 2, w - 30, h / 2, c.textMuted, 1, [3, 3]);
      label(ctx, "Target Setpoint e(t) = 0", 40, h / 2 - 10, c.textMuted, "left", 10);
      // Draw error trajectories
      ctx.beginPath(); ctx.strokeStyle = swState.pidKd < 0.2 ? "#ef4444" : "#22c55e"; ctx.lineWidth = 3;
      var damping = 0.5 + swState.pidKd * 3;
      for (var t = 0; t <= w - 60; t += 2) {
        var err = 60 * Math.exp(-damping * (t / 120)) * Math.cos((swState.pidKp * 2) * (t / 60));
        var ey = h / 2 - err;
        t === 0 ? ctx.moveTo(30 + t, ey) : ctx.lineTo(30 + t, ey);
      }
      ctx.stroke();
    } else if (swScenario === "bezier") {
      var bx = 60, by = h - 40, bw = w - 120, bh = h - 80;
      ctx.strokeStyle = c.textMuted; ctx.strokeRect(bx, by - bh, bw, bh);
      ctx.beginPath(); ctx.strokeStyle = "#ec4899"; ctx.lineWidth = 3;
      ctx.moveTo(bx, by);
      ctx.bezierCurveTo(bx + bw * 0.25, by - bh * 0.1, bx + bw * 0.25, by - bh * 1.0, bx + bw, by - bh);
      ctx.stroke();
      label(ctx, "Slope=0.4 (Ease In)", bx + 10, by + 16, "#facc15", "left", 11);
      label(ctx, "Slope=0.0 (Smooth Stop)", bx + bw, by - bh - 10, "#38bdf8", "right", 11);
    }
  }

  function updateSw() {
    var sbox = $("sw-status-box");
    if (swScenario === "gradient") {
      var w = swState.w, loss = lossFn(w), grad = lossGrad(w);
      $("sw-ml-curw").textContent = w.toFixed(3);
      $("sw-ml-loss").textContent = loss.toFixed(3);
      $("sw-ml-grad").textContent = grad.toFixed(3);
      $("sw-ml-dir").textContent = grad > 0 ? "Step Left (w ← w - α·grad)" : "Step Right (w ← w - α·grad)";
      sbox.style.background = "rgba(139, 92, 246, 0.12)"; sbox.style.border = "1px solid #8b5cf6"; sbox.style.color = "#8b5cf6";
      sbox.textContent = "AI Optimizer Update: w_new = " + w.toFixed(2) + " − (" + swState.alpha.toFixed(2) + " · " + grad.toFixed(2) + ") = " + (w - swState.alpha * grad).toFixed(2) + ". The slope tells the algorithm whether loss is increasing or decreasing!";
    } else if (swScenario === "game") {
      var cx = swState.charX, m = 1.5 * Math.cos(cx * 1.5) * 1.8, ang = Math.atan(m) * 180 / Math.PI;
      $("sw-gm-m").textContent = m.toFixed(2);
      $("sw-gm-ang").textContent = ang.toFixed(1) + "°";
      var isSliding = Math.abs(ang) > 45;
      $("sw-gm-state").textContent = isSliding ? "SLIDING DOWNHILL ⛷️" : "Walking Normally 🚶";
      $("sw-gm-state").style.color = isSliding ? "#ef4444" : "#15803d";
      sbox.style.background = isSliding ? "rgba(239, 68, 68, 0.12)" : "rgba(34, 197, 94, 0.12)";
      sbox.style.border = isSliding ? "1px solid #ef4444" : "1px solid #22c55e";
      sbox.style.color = isSliding ? "#ef4444" : "#15803d";
      sbox.textContent = isSliding ? "⚠️ Slope Angle is " + Math.abs(ang).toFixed(1) + "° (> 45° threshold). The friction cone cannot support player weight. Game engine triggers downward slide velocity along tangent vector!" : "✔ Terrain angle is " + Math.abs(ang).toFixed(1) + "° (≤ 45°). Normal force is sufficient for standard locomotion.";
    } else if (swScenario === "pid") {
      var dterm = (swState.pidKd * 1.42).toFixed(2);
      $("sw-pid-dterm").textContent = dterm;
      var stab = swState.pidKd < 0.2 ? "Underdamped (Severe Overshoot)" : swState.pidKd > 1.0 ? "Overdamped (Sluggish)" : "Critically Damped (Ideal)";
      $("sw-pid-stab").textContent = stab;
      sbox.style.background = swState.pidKd < 0.2 ? "rgba(239, 68, 68, 0.12)" : "rgba(34, 197, 94, 0.12)";
      sbox.style.border = swState.pidKd < 0.2 ? "1px solid #ef4444" : "1px solid #22c55e";
      sbox.style.color = swState.pidKd < 0.2 ? "#ef4444" : "#15803d";
      sbox.textContent = "Derivative term D = Kd · (de/dt): Negative error slope acts as an anticipatory brake. Without the slope term, robots and drones violently oscillate and overshoot their target!";
    } else if (swScenario === "bezier") {
      sbox.style.background = "rgba(236, 72, 153, 0.12)"; sbox.style.border = "1px solid #ec4899"; sbox.style.color = "#ec4899";
      sbox.textContent = "CSS cubic-bezier curves map time t ∈ [0, 1] to property progress. The tangent slope at any point equals the instantaneous animation velocity!";
    }
    drawSw();
  }

  swKit = mk("sw-canvas", "sw-scenarios", drawSw);
  $("sw-scenarios").addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    swScenario = btn.dataset.sw;
    $("sw-scenarios").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", b === btn); });
    renderSwControls();
  });
  renderSwControls();

  /* ── Lab 7: AI Smart Blackboard Studio Engine ──────── */
  var bbCanvas = $("tc-blackboard-canvas");
  var bbCtx = bbCanvas ? bbCanvas.getContext("2d") : null;
  var bbCurrentTool = "pen";
  var bbStrokes = [], bbCurrentStroke = [];
  var bbActiveFigure = { eq: "y = x²", f: function (x) { return x * x; }, d: function (x) { return 2 * x; }, x0: 1.0 };
  var isBbDrawing = false, isBbDraggingTan = false;
  var isBbSpeaking = false;

  function resizeBb() {
    if (!bbCanvas || !bbCtx) return;
    var rect = bbCanvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    bbCanvas.width = Math.round(rect.width * dpr);
    bbCanvas.height = Math.round(rect.height * dpr);
    bbCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBlackboard();
  }

  function drawBlackboard() {
    if (!bbCanvas || !bbCtx) return;
    var w = bbCanvas.width / (window.devicePixelRatio || 1);
    var h = bbCanvas.height / (window.devicePixelRatio || 1);
    bbCtx.fillStyle = "#090d16"; bbCtx.fillRect(0, 0, w, h);

    // Subtle chalk grid
    bbCtx.strokeStyle = "rgba(255, 255, 255, 0.05)"; bbCtx.lineWidth = 1;
    for (var x = 30; x < w; x += 30) { bbCtx.beginPath(); bbCtx.moveTo(x, 0); bbCtx.lineTo(x, h); bbCtx.stroke(); }
    for (var y = 30; y < h; y += 30) { bbCtx.beginPath(); bbCtx.moveTo(0, y); bbCtx.lineTo(w, y); bbCtx.stroke(); }

    // Coordinate axes
    var cx = w / 2, cy = h / 2 + 30, scale = 45;
    bbCtx.strokeStyle = "rgba(255, 255, 255, 0.25)"; bbCtx.lineWidth = 1.5;
    bbCtx.beginPath(); bbCtx.moveTo(0, cy); bbCtx.lineTo(w, cy); bbCtx.stroke();
    bbCtx.beginPath(); bbCtx.moveTo(cx, 0); bbCtx.lineTo(cx, h); bbCtx.stroke();

    function toPx(x, y) { return { x: cx + x * scale, y: cy - y * scale }; }
    function toMath(px, py) { return { x: (px - cx) / scale, y: (cy - py) / scale }; }

    // Active curve
    if (bbActiveFigure && bbActiveFigure.f) {
      bbCtx.beginPath(); bbCtx.strokeStyle = "#38bdf8"; bbCtx.lineWidth = 2.5;
      for (var px = 0; px <= w; px += 2) {
        var mx = (px - cx) / scale, my = bbActiveFigure.f(mx);
        var py = cy - my * scale;
        px === 0 ? bbCtx.moveTo(px, py) : bbCtx.lineTo(px, py);
      }
      bbCtx.stroke();

      // Tangent line at x0
      var x0 = bbActiveFigure.x0, y0 = bbActiveFigure.f(x0), m = bbActiveFigure.d(x0);
      var p0 = toPx(x0, y0);
      var tLen = 2.5;
      var pA = toPx(x0 - tLen, y0 - m * tLen), pB = toPx(x0 + tLen, y0 + m * tLen);
      line(bbCtx, pA.x, pA.y, pB.x, pB.y, "#ea580c", 2.5);

      // Highlight point
      dot(bbCtx, p0.x, p0.y, 7, "#facc15");
      label(bbCtx, "(" + x0.toFixed(2) + ", " + y0.toFixed(2) + ")", p0.x + 10, p0.y - 12, "#facc15", "left", 11);
    }

    // Freehand strokes
    bbStrokes.forEach(function (s) {
      bbCtx.strokeStyle = s.color || "#f8fafc"; bbCtx.lineWidth = s.width || 3;
      bbCtx.beginPath();
      s.pts.forEach(function (pt, idx) { idx === 0 ? bbCtx.moveTo(pt.x, pt.y) : bbCtx.lineTo(pt.x, pt.y); });
      bbCtx.stroke();
    });
    if (bbCurrentStroke.length > 1) {
      bbCtx.strokeStyle = "#facc15"; bbCtx.lineWidth = 3;
      bbCtx.beginPath();
      bbCurrentStroke.forEach(function (pt, idx) { idx === 0 ? bbCtx.moveTo(pt.x, pt.y) : bbCtx.lineTo(pt.x, pt.y); });
      bbCtx.stroke();
    }
  }

  function updateBlackboardReport() {
    if (!bbActiveFigure) return;
    var x0 = bbActiveFigure.x0, y0 = bbActiveFigure.f(x0), m = bbActiveFigure.d(x0);
    var ang = (Math.atan(m) * 180 / Math.PI).toFixed(1);
    var grade = (m * 100).toFixed(1);
    $("tc-bb-fn").textContent = bbActiveFigure.eq;
    $("tc-bb-x0").textContent = x0.toFixed(2);
    $("tc-bb-slope").textContent = m.toFixed(2);
    $("tc-bb-angle").textContent = ang + "°";
    $("tc-bb-grade").textContent = grade + "%";

    var proof = "";
    if (bbActiveFigure.eq.indexOf("x²") >= 0) {
      proof = "<strong>1. Power Rule Application:</strong> For f(x) = x², the derivative is f'(x) = 2x.<br/>" +
              "<strong>2. Slope at Target:</strong> At x₀ = " + x0.toFixed(2) + ", the instantaneous rate of change is f'(" + x0.toFixed(2) + ") = 2(" + x0.toFixed(2) + ") = <strong>" + m.toFixed(2) + "</strong>.<br/>" +
              "<strong>3. Tangent Line Equation:</strong> y − y₀ = m(x − x₀) &rarr; y − " + y0.toFixed(2) + " = " + m.toFixed(2) + "(x − " + x0.toFixed(2) + ").<br/>" +
              "<strong>4. Physical/Software Context:</strong> In machine learning, a gradient descent optimizer taking step &alpha;=0.1 would adjust parameter w &larr; " + x0.toFixed(2) + " − 0.1(" + m.toFixed(2) + ") = " + (x0 - 0.1 * m).toFixed(2) + ".";
    } else if (bbActiveFigure.eq.indexOf("1:12") >= 0) {
      proof = "<strong>1. ADA Federal Regulation Standard:</strong> 1 inch of vertical rise requires at least 12 inches of horizontal run (Slope m = 1/12 ≈ 0.0833).<br/>" +
              "<strong>2. Grade & Angle:</strong> Incline is exactly 8.33% grade (Angle θ = arctan(1/12) ≈ 4.76°).<br/>" +
              "<strong>3. Torque Safety:</strong> Any steeper incline produces unsafe backward rotational moment for manual wheelchair users.";
    } else {
      proof = "<strong>1. Function:</strong> " + bbActiveFigure.eq + "<br/>" +
              "<strong>2. Slope Measurement:</strong> At x₀ = " + x0.toFixed(2) + ", derivative is f'(x₀) = <strong>" + m.toFixed(2) + "</strong>.<br/>" +
              "<strong>3. Angle of Inclination:</strong> θ = arctan(" + m.toFixed(2) + ") = " + ang + "° (Grade: " + grade + "%).";
    }
    $("tc-bb-proof-text").innerHTML = proof;
  }

  function loadPresetToBlackboard(key) {
    if (key === "parabola") {
      bbActiveFigure = { eq: "y = x²", f: function (x) { return x * x; }, d: function (x) { return 2 * x; }, x0: 1.5 };
      $("tc-bb-banner-text").textContent = "✨ Loaded Parabola y = x²: Instantaneous tangent slope f'(1.5) = 3.0";
    } else if (key === "cubic") {
      bbActiveFigure = { eq: "y = x³ − 3x", f: function (x) { return x * x * x - 3 * x; }, d: function (x) { return 3 * x * x - 3; }, x0: 1.0 };
      $("tc-bb-banner-text").textContent = "✨ Loaded Cubic y = x³ − 3x at Valley Minimum (Slope = 0.00)";
    } else if (key === "ada") {
      bbActiveFigure = { eq: "ADA Ramp: y = (1/12)x", f: function (x) { return (1 / 12) * x; }, d: function () { return 1 / 12; }, x0: 6.0 };
      $("tc-bb-banner-text").textContent = "✨ Loaded ADA Accessibility Ramp 1:12 Slope (8.33% Grade, 4.76°)";
    } else if (key === "ml") {
      bbActiveFigure = { eq: "Loss L(w) = 0.5w²", f: function (x) { return 0.5 * x * x; }, d: function (x) { return x; }, x0: 2.2 };
      $("tc-bb-banner-text").textContent = "✨ Loaded ML Loss Gradient Descent: ∇L = 2.20 &rarr; Optimizer steps left!";
    } else if (key === "power") {
      bbActiveFigure = { eq: "Power Expansion y = x³", f: function (x) { return Math.pow(x, 3); }, d: function (x) { return 3 * Math.pow(x, 2); }, x0: 1.0 };
      $("tc-bb-banner-text").textContent = "✨ Loaded Geometric Cube Power Rule: d/dx [x³] = 3x²";
    }
    bbStrokes = [];
    drawBlackboard();
    updateBlackboardReport();
  }

  if (bbCanvas) {
    bbCanvas.addEventListener("pointerdown", function (e) {
      var rect = bbCanvas.getBoundingClientRect(), px = e.clientX - rect.left, py = e.clientY - rect.top;
      if (bbCurrentTool === "tangent" && bbActiveFigure) {
        var cx = (bbCanvas.width / (window.devicePixelRatio || 1)) / 2;
        var scale = 45;
        bbActiveFigure.x0 = (px - cx) / scale;
        isBbDraggingTan = true;
        drawBlackboard();
        updateBlackboardReport();
        return;
      }
      isBbDrawing = true;
      bbCurrentStroke = [{ x: px, y: py }];
    });
    bbCanvas.addEventListener("pointermove", function (e) {
      var rect = bbCanvas.getBoundingClientRect(), px = e.clientX - rect.left, py = e.clientY - rect.top;
      if (isBbDraggingTan && bbActiveFigure) {
        var cx = (bbCanvas.width / (window.devicePixelRatio || 1)) / 2;
        var scale = 45;
        bbActiveFigure.x0 = Math.max(-3, Math.min(3, (px - cx) / scale));
        drawBlackboard();
        updateBlackboardReport();
        return;
      }
      if (isBbDrawing) {
        bbCurrentStroke.push({ x: px, y: py });
        drawBlackboard();
      }
    });
    function stopBb() {
      if (isBbDraggingTan) isBbDraggingTan = false;
      if (isBbDrawing) {
        isBbDrawing = false;
        if (bbCurrentStroke.length > 2) bbStrokes.push({ pts: bbCurrentStroke, color: "#facc15" });
        bbCurrentStroke = [];
        drawBlackboard();
      }
    }
    bbCanvas.addEventListener("pointerup", stopBb);
    bbCanvas.addEventListener("pointercancel", stopBb);

    window.addEventListener("resize", resizeBb);
    setTimeout(resizeBb, 100);
  }

  // Blackboard tool switching
  $("tc-bb-tool-pen").addEventListener("click", function () { bbCurrentTool = "pen"; $("tc-bb-tool-pen").classList.add("active"); $("tc-bb-tool-tan").classList.remove("active"); $("tc-bb-tool-eraser").classList.remove("active"); });
  $("tc-bb-tool-tan").addEventListener("click", function () { bbCurrentTool = "tangent"; $("tc-bb-tool-tan").classList.add("active"); $("tc-bb-tool-pen").classList.remove("active"); $("tc-bb-tool-eraser").classList.remove("active"); });
  $("tc-bb-tool-eraser").addEventListener("click", function () { bbCurrentTool = "eraser"; $("tc-bb-tool-eraser").classList.add("active"); $("tc-bb-tool-pen").classList.remove("active"); $("tc-bb-tool-tan").classList.remove("active"); });
  $("tc-bb-tool-clear").addEventListener("click", function () { bbStrokes = []; drawBlackboard(); });

  // Blackboard presets
  document.querySelectorAll(".tc-bb-preset-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { loadPresetToBlackboard(btn.dataset.preset); });
  });

  // Cross-lab "Analyze on AI Blackboard" buttons
  function scrollToBlackboard() {
    var bb = $("blackboard-studio");
    if (bb) bb.scrollIntoView({ behavior: "smooth" });
  }
  $("zm-to-bb").addEventListener("click", function () {
    var fn = zm.fn, x0 = +$("zm-x").value;
    bbActiveFigure = { eq: "y = " + fn.name, f: fn.f, d: fn.d, x0: x0 };
    $("tc-bb-banner-text").textContent = "✨ Loaded Lab 1 Curve: " + fn.name + " at x₀ = " + x0.toFixed(2);
    drawBlackboard(); updateBlackboardReport(); scrollToBlackboard();
    if (window.SmartBlackboardDock && typeof window.SmartBlackboardDock.loadCalculusCurve === "function") {
      window.SmartBlackboardDock.loadCalculusCurve("y = " + fn.name, x0, fn.d(x0));
    }
  });
  $("se-to-bb").addEventListener("click", function () {
    var fn = se.fn, x0 = +$("se-x").value;
    bbActiveFigure = { eq: "y = " + fn.name + " (Secant Limit)", f: fn.f, d: fn.d, x0: x0 };
    $("tc-bb-banner-text").textContent = "✨ Loaded Lab 2 Secant Limit: " + fn.name + " at x₀ = " + x0.toFixed(2);
    drawBlackboard(); updateBlackboardReport(); scrollToBlackboard();
  });
  $("sf-to-bb").addEventListener("click", function () {
    var fn = sf.fn, x0 = +$("sf-x").value;
    bbActiveFigure = { eq: "f(x) = " + fn.name, f: fn.f, d: fn.d, x0: x0 };
    $("tc-bb-banner-text").textContent = "✨ Loaded Lab 3 Slope Function: f'(x) = " + fn.rule;
    drawBlackboard(); updateBlackboardReport(); scrollToBlackboard();
  });
  $("pw-to-bb").addEventListener("click", function () {
    var n = +$("pw-n").value, x0 = +$("pw-x").value;
    bbActiveFigure = { eq: "y = x^" + n, f: function (x) { return Math.pow(x, n); }, d: function (x) { return n * Math.pow(x, n - 1); }, x0: x0 };
    $("tc-bb-banner-text").textContent = "✨ Loaded Power Rule: d/dx [x^" + n + "] = " + n + "x^" + (n - 1);
    drawBlackboard(); updateBlackboardReport(); scrollToBlackboard();
  });
  $("rw-to-bb").addEventListener("click", function () {
    loadPresetToBlackboard("ada");
    scrollToBlackboard();
  });
  $("sw-to-bb").addEventListener("click", function () {
    loadPresetToBlackboard("ml");
    scrollToBlackboard();
  });

  // Voice tutor
  $("tc-bb-voice").addEventListener("click", function () {
    if (!("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported on this browser.");
      return;
    }
    if (isBbSpeaking) {
      window.speechSynthesis.cancel();
      isBbSpeaking = false;
      $("tc-bb-voice").textContent = "🔊 AI Voice Tutor";
      return;
    }
    var text = $("tc-bb-proof-text").innerText;
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = function () {
      isBbSpeaking = false;
      $("tc-bb-voice").textContent = "🔊 AI Voice Tutor";
    };
    isBbSpeaking = true;
    $("tc-bb-voice").textContent = "⏹ Stop Voice";
    window.speechSynthesis.speak(utterance);
  });

  // Copy proof
  $("tc-bb-copy").addEventListener("click", function () {
    var text = $("tc-bb-proof-text").innerText;
    navigator.clipboard.writeText(text).then(function () {
      var orig = $("tc-bb-copy").textContent;
      $("tc-bb-copy").textContent = "✔ Copied!";
      setTimeout(function () { $("tc-bb-copy").textContent = orig; }, 2000);
    });
  });

  // Floating board toggle
  $("tc-bb-popdock").addEventListener("click", function () {
    if (window.SmartBlackboardDock) {
      window.SmartBlackboardDock.open();
      if (bbActiveFigure && typeof window.SmartBlackboardDock.loadCalculusCurve === "function") {
        window.SmartBlackboardDock.loadCalculusCurve(bbActiveFigure.eq, bbActiveFigure.x0, bbActiveFigure.d(bbActiveFigure.x0));
      }
    }
  });

  // Guided Practice check & AI Blackboard Solver buttons
  document.querySelectorAll(".tc-practice-item").forEach(function (item) {
    var input = item.querySelector("input"), fb = item.querySelector(".fb");
    var bbBtn = item.querySelector(".tc-bb-solve-btn");
    function check() {
      var v = parseFloat(input.value);
      if (isNaN(v)) { fb.textContent = "Enter a number."; fb.className = "fb no"; return; }
      var ok = Math.abs(v - parseFloat(item.dataset.answer)) <= 0.05;
      fb.textContent = ok ? "✔ Correct! Excellent calculation." : "Not yet. Hint: " + item.dataset.hint;
      fb.className = "fb " + (ok ? "ok" : "no");
    }
    item.querySelector(".tc-btn").addEventListener("click", check);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") check(); });

    if (bbBtn) {
      bbBtn.addEventListener("click", function () {
        var qid = bbBtn.dataset.qid;
        if (qid === "1") {
          bbActiveFigure = { eq: "Line through (2,3) & (6,11)", f: function (x) { return 2 * x - 1; }, d: function () { return 2; }, x0: 2 };
          $("tc-bb-banner-text").textContent = "✨ Modeling Question 1: m = (11 - 3)/(6 - 2) = 8/4 = 2.0";
        } else if (qid === "2") {
          bbActiveFigure = { eq: "Average Rate on x² between 1 & 4", f: function (x) { return x * x; }, d: function () { return 5; }, x0: 2.5 };
          $("tc-bb-banner-text").textContent = "✨ Modeling Question 2: Δy/Δx = (16 - 1)/(4 - 1) = 15/3 = 5.0";
        } else if (qid === "3") {
          bbActiveFigure = { eq: "f(x) = x³ at x = 2", f: function (x) { return x * x * x; }, d: function (x) { return 3 * x * x; }, x0: 2 };
          $("tc-bb-banner-text").textContent = "✨ Modeling Question 3: f'(2) = 3(2)² = 12.0";
        } else if (qid === "4") {
          bbActiveFigure = { eq: "f(x) = 2x² − 8x + 5", f: function (x) { return 2 * x * x - 8 * x + 5; }, d: function (x) { return 4 * x - 8; }, x0: 2 };
          $("tc-bb-banner-text").textContent = "✨ Modeling Question 4: Setting slope 4x - 8 = 0 gives minimum at x = 2";
        } else if (qid === "5") {
          loadPresetToBlackboard("ada");
          $("tc-bb-banner-text").textContent = "✨ Modeling Question 5: ADA Run = 24 in · 12 = 288 in (24 feet)";
        } else if (qid === "6") {
          bbActiveFigure = { eq: "Rocket s(t) = −5t² + 50t", f: function (t) { return -5 * t * t + 50 * t; }, d: function (t) { return -10 * t + 50; }, x0: 3 };
          $("tc-bb-banner-text").textContent = "✨ Modeling Question 6: Velocity v(3) = s'(3) = −10(3) + 50 = 20 m/s";
        } else if (qid === "7") {
          loadPresetToBlackboard("ml");
          $("tc-bb-banner-text").textContent = "✨ Modeling Question 7: Gradient Descent w_new = 4 - 0.1(8) = 3.2";
        } else if (qid === "8") {
          bbActiveFigure = { eq: "f(x) = sin(x) at x = π/3", f: Math.sin, d: Math.cos, x0: Math.PI / 3 };
          $("tc-bb-banner-text").textContent = "✨ Modeling Question 8: d/dx[sin x] = cos x. At 60°: cos(π/3) = 0.5";
        }
        drawBlackboard(); updateBlackboardReport(); scrollToBlackboard();
      });
    }
  });

  // Exit ticket verification
  $("tc-exit-check-btn").addEventListener("click", function () {
    var val = ($("tc-exit-input").value || "").toLowerCase();
    var fb = $("tc-exit-feedback");
    if (val.length < 15) {
      fb.style.color = "#dc2626";
      fb.textContent = "Please write a more detailed explanation covering local linearity, secant limits, or gradient descent.";
      return;
    }
    var score = 0, tips = [];
    if (/linear|straight|flat|zoom/i.test(val)) score++;
    else tips.push("mention local linearity (how curves look straight when magnified)");
    if (/secant|tangent|limit|h\s*->|gap/i.test(val)) score++;
    else tips.push("connect secants to tangents as h shrinks");
    if (/gradient|descent|loss|subtract|downhill|learning rate|opposite/i.test(val)) score++;
    if (/ada|ramp|safety|tip|1:12|wheelchair|grade/i.test(val)) score++;

    if (score >= 2) {
      fb.style.color = "#15803d";
      fb.textContent = "✔ Excellent mathematical justification! You accurately tied local linearity and rates of change to the calculus limit and real-world/algorithmic applications.";
    } else {
      fb.style.color = "#ea580c";
      fb.textContent = "Good start! To complete your justification, try to " + tips.join(" and ") + ".";
    }
  });

  $("tc-exit-copy-bb").addEventListener("click", function () {
    $("tc-exit-input").value = "As shown on the AI Blackboard for " + bbActiveFigure.eq + ": zooming in demonstrates local linearity. The secant difference quotient (f(x+h) - f(x))/h approaches the instantaneous slope f'(x) = " + bbActiveFigure.d(bbActiveFigure.x0).toFixed(2) + " as h approaches zero.";
  });

  // Theme changes
  SimKit.theme.onChange(function () {
    drawZoom(); drawSecant(); drawSF(); drawRw(); drawSw(); drawBlackboard();
  });

  // Initialize all labs
  updateZoom(); updateSecant(); updateSF(); updatePower();
  loadPresetToBlackboard("parabola");
})();
