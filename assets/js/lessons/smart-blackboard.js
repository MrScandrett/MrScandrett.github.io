import { initBoardStudio } from './smart-blackboard-studio.mjs';
import { mapAirPoint, airActionValue, strokeNear, calibrationBounds } from './air-chalk-tools.mjs';
import { makeDevelopable } from './smart-blackboard-solids.mjs';
import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
    import { createScene } from '../sim-kit-three.mjs';
import { solveTriangle, pointsFromSides } from './geometry-engine.mjs';
import { analyzeHand, assessFrame, PoseStabilizer, CommandDetector, SwipeDetector, COMMAND_LABELS } from './hand-gesture-engine.mjs';

    (function () {
      "use strict";

      function $(id) { return document.getElementById(id); }

      /* ── DOM Elements ── */
      var chalkCanvas = $("chalk-canvas");
      var threeCanvas = $("three-canvas");
      var stageWrap = $("stage-wrap");
      var aiToast = $("ai-toast");
      var entityTitle = $("entity-title");
      var entityBadge = $("entity-badge");
      var valM1 = $("val-m1"), valM2 = $("val-m2"), valM3 = $("val-m3"), valM4 = $("val-m4");
      var lblM1 = $("lbl-m1"), lblM2 = $("lbl-m2"), lblM3 = $("lbl-m3"), lblM4 = $("lbl-m4");
      var aiStepText = $("ai-step-text");
      var unfoldSlider = $("unfold-slider"), unfoldPct = $("unfold-pct");
      var sliceSlider = $("slice-slider"), sliceH = $("slice-h");
      var jointSlider = $("joint-slider"), jointPct = $("joint-pct");
      var wrapUnfold = $("wrap-unfold"), wrapSlice = $("wrap-slice"), wrapJoint = $("wrap-joint");
      var deconstructPanel = $("deconstruct-panel");
      var triangleCtrls = $("triangle-ctrls");
      var chkAltitude = $("chk-altitude");
      var selUnknown = $("sel-unknown");
      var btnVoice = $("btn-voice-tutor");
      var liveRegion = $("bb-live");
      var circleCtrls = $("circle-ctrls");
      var inSideA = $("in-side-a"), inSideB = $("in-side-b"), inSideC = $("in-side-c");
      var inRadius = $("in-radius");
      var dimsMsg = $("dims-msg");
      var SCALE = 25; // px per cm
      var selectedVertex = 0; // 0=A 1=B 2=C, for keyboard control

      /* ── Screen-reader announcements (debounced, only when text changes) ── */
      var liveTimer = null, lastLive = "";
      function announce(msg, immediate) {
        if (!liveRegion || !msg || msg === lastLive) return;
        if (liveTimer) clearTimeout(liveTimer);
        liveTimer = setTimeout(function () {
          lastLive = msg;
          liveRegion.textContent = msg;
        }, immediate ? 0 : 700);
      }
      function fmt(v, n) { return Number.isFinite(v) ? v.toFixed(n === undefined ? 2 : n) : "—"; }

      var curColor = "#f8fafc";
      var curMode = "draw"; // "draw", "triangle", "circle", "3d-cube", "3d-cyl", "3d-cone", "3d-sphere", "3d-prism", "3d-conjoined"
      var active3DShape = null;

      /* ── Air Chalk & Camera DOM Elements ── */
      var airCursorCanvas = $("air-cursor-canvas");
      var airCursorCtx = airCursorCanvas ? airCursorCanvas.getContext("2d") : null;
      var airPip = $("air-pip");
      var airVideo = $("air-video");
      var airPipCanvas = $("air-pip-canvas");
      var pipCtx = airPipCanvas ? airPipCanvas.getContext("2d") : null;
      var airStatus = $("air-status");
      var airPinchMeter = $("air-pinch-meter");
      var btnAirChalk = $("btn-air-chalk");
      var btnAirClose = $("btn-air-close");
      var btnAirModeToggle = $("btn-air-mode-toggle");

      /* ── Speech Synthesis AI Tutor ── */
      var isSpeaking = false;
      btnVoice.addEventListener("click", function () {
        if (!("speechSynthesis" in window)) {
          showToast("Speech is not supported on this device. Read the step-by-step text instead.");
          return;
        }
        if (isSpeaking) {
          window.speechSynthesis.cancel();
          isSpeaking = false;
          btnVoice.innerHTML = "<span>🔊 Read Step-by-Step Explanation</span>"; btnVoice.setAttribute("aria-pressed", "false");
          return;
        }
        var text = aiStepText.innerText.replace(/[$_#\\*]/g, "");
        btnVoice.setAttribute("aria-pressed", "true");
        var utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = function () {
          isSpeaking = false;
          btnVoice.innerHTML = "<span>🔊 Read Step-by-Step Explanation</span>"; btnVoice.setAttribute("aria-pressed", "false");
        };
        isSpeaking = true;
        btnVoice.innerHTML = "<span>⏹ Stop Audio Explanation</span>";
        window.speechSynthesis.speak(utterance);
      });

      function showToast(msg) {
        aiToast.textContent = msg;
        announce(msg.replace(/[✨⚠️📹🧹]/g, "").trim(), true);
        aiToast.classList.add("show");
        setTimeout(function () { aiToast.classList.remove("show"); }, 2600);
      }

      /* ── 2D Geometry Model ── */
      var geom2D = {
        type: "triangle",
        pts: [
          { x: 140, y: 360, label: "A" },
          { x: 420, y: 360, label: "B" },
          { x: 220, y: 150, label: "C" }
        ],
        circle: { cx: 280, cy: 260, r: 110 }
      };

      var draggingPoint = null;

      /* ── 2D Chalkboard Drawing & Recognition ── */
      var chalkCtx = chalkCanvas.getContext("2d");
      var currentStroke = [];
      var isDrawing = false;
      var activePointerId = null;
      var appElement = $("smart-blackboard-app");
      var deviceStatus = $("bb-device-status");
      var webglLost = false;
      function deviceMessage(message) {
        deviceStatus.textContent = message;
        deviceStatus.hidden = !message;
      }
      // Display drivers often expose touch as a mouse, so large targets are always on.
      // Larger text is optional and remembered on this browser only.
      try { $("bb-board-mode").checked = localStorage.getItem("smart-blackboard-large-text") === "true"; } catch (_) {}
      appElement.classList.toggle("bb-board-mode", $("bb-board-mode").checked);
      $("bb-board-mode").addEventListener("change", function () {
        appElement.classList.toggle("bb-board-mode", this.checked);
        try { localStorage.setItem("smart-blackboard-large-text", String(this.checked)); } catch (_) {}
        resizeChalk();
      });
      $("bb-pen-only").addEventListener("change", function () {
        cancelPointerStroke();
        announce(this.checked ? "Only stylus pen input is accepted. Turn Pen only off if your stylus behaves like a finger or mouse." : "Finger, mouse and pen input enabled.", true);
      });
      function capturePointer(e) {
        activePointerId = e.pointerId;
        try { chalkCanvas.setPointerCapture(e.pointerId); } catch (_) {}
      }
      function cancelPointerStroke() {
        if (activePointerId === null) return;
        var pointerId = activePointerId;
        activePointerId = null;
        isDrawing = false;
        draggingPoint = null;
        currentStroke = [];
        airInkStroke = null;
        try { chalkCanvas.releasePointerCapture(pointerId); } catch (_) {}
        draw2D();
      }

      function resizeChalk() {
        var rect = stageWrap.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(1920 * 1080 / Math.max(1, rect.width * rect.height)));
        chalkCanvas.width = Math.round(rect.width * dpr);
        chalkCanvas.height = Math.round(rect.height * dpr);
        chalkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (airCursorCanvas && airCursorCtx) {
          airCursorCanvas.width = Math.round(rect.width * dpr);
          airCursorCanvas.height = Math.round(rect.height * dpr);
          airCursorCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        draw2D();
        if (boardStudio) boardStudio.refresh();
      }
      window.addEventListener("resize", resizeChalk);

      /* ── Multi-Stroke & High-Accuracy Shape Recognition Engine ── */
      var recentStrokes = [];
      var multiStrokeTimer = null;

      function applyRecognition(rec) {
        if (!rec) return;
        snapshotState();
        recentStrokes = [];
        currentStroke = [];
        if (multiStrokeTimer) { clearTimeout(multiStrokeTimer); multiStrokeTimer = null; }
        var confTag = rec.confidence ? " (" + Math.round(rec.confidence * 100) + "% match)" : "";

        if (rec.type === "circle") {
          geom2D.type = "circle";
          geom2D.circle.cx = rec.cx;
          geom2D.circle.cy = rec.cy;
          geom2D.circle.r = Math.max(24, rec.r);
          showToast((rec.msg || "✨ Shape recognized: Circle (A = πr²)") + confTag);
          curMode = "circle";
          updateToolbarButtons();
          draw2D();
        } else if (rec.type === "triangle") {
          geom2D.type = "triangle";
          geom2D.pts = rec.pts;
          showToast((rec.msg || "✨ Shape recognized: Triangle (ΔABC)") + confTag);
          curMode = "triangle";
          updateToolbarButtons();
          draw2D();
        } else if (rec.type === "cube_hint") {
          showToast((rec.msg || "✨ Shape recognized: 3D Rectangular Prism / Cube") + confTag);
          switchTo3D("cube");
        } else if (rec.type === "prism_hint") {
          showToast((rec.msg || "✨ Shape recognized:Polygonal Base → 3D Irregular Prism") + confTag);
          switchTo3D("prism");
        } else if (rec.type === "cone_hint") {
          showToast((rec.msg || "✨ Shape recognized: 3D Cone & Sector Net") + confTag);
          switchTo3D("cone");
        } else if (rec.type === "operator_plus") {
          showToast("✨ Shape recognized: Addition / Axes Operator (+)" + confTag);
          draw2D();
        } else if (rec.type === "operator_equals") {
          showToast("✨ Shape recognized: Equality Operator (=)" + confTag);
          draw2D();
        }
      }

      /* Trim pinch/release hooks at the very start & end of an air-drawn stroke */
      function trimStrokeHooks(pts) {
        if (!pts || pts.length < 10) return pts ? pts.slice() : [];
        var out = pts.slice();
        var trimCount = Math.min(4, Math.floor(out.length * 0.08));
        // Trim start if initial segment reverses or has anomalous jump
        for (var s = 0; s < trimCount; s++) {
          if (out.length < 8) break;
          var d0 = Math.hypot(out[1].x - out[0].x, out[1].y - out[0].y);
          var d1 = Math.hypot(out[2].x - out[1].x, out[2].y - out[1].y);
          var vx1 = out[1].x - out[0].x, vy1 = out[1].y - out[0].y;
          var vx2 = out[3].x - out[1].x, vy2 = out[3].y - out[1].y;
          var dot = (vx1 * vx2 + vy1 * vy2) / (Math.max(1e-4, Math.hypot(vx1, vy1) * Math.hypot(vx2, vy2)));
          if (d0 < 2.2 || dot < 0.25 || d0 > d1 * 3.2) out.shift();
          else break;
        }
        // Trim end hook caused by unpinching fingers
        for (var e = 0; e < trimCount; e++) {
          if (out.length < 8) break;
          var n = out.length;
          var de0 = Math.hypot(out[n - 1].x - out[n - 2].x, out[n - 1].y - out[n - 2].y);
          var vxE1 = out[n - 1].x - out[n - 2].x, vyE1 = out[n - 1].y - out[n - 2].y;
          var vxE2 = out[n - 2].x - out[n - 4].x, vyE2 = out[n - 2].y - out[n - 4].y;
          var dotE = (vxE1 * vxE2 + vyE1 * vyE2) / (Math.max(1e-4, Math.hypot(vxE1, vyE1) * Math.hypot(vxE2, vyE2)));
          if (de0 < 2.2 || dotE < 0.25) out.pop();
          else break;
        }
        return out;
      }

      /* Resample stroke to N equidistant points along arc length */
      function resampleStroke(pts, n) {
        if (!pts || pts.length < 2) return pts ? pts.slice() : [];
        var totalLen = 0;
        for (var i = 1; i < pts.length; i++) {
          totalLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        }
        if (totalLen < 1) return pts.slice();
        var step = totalLen / (n - 1);
        var acc = 0;
        var res = [{ x: pts[0].x, y: pts[0].y }];
        var src = pts.slice();
        for (var j = 1; j < src.length; j++) {
          var p1 = src[j - 1], p2 = src[j];
          var d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          if (acc + d >= step) {
            var t = (step - acc) / Math.max(1e-5, d);
            var nx = p1.x + t * (p2.x - p1.x);
            var ny = p1.y + t * (p2.y - p1.y);
            var np = { x: nx, y: ny };
            res.push(np);
            src.splice(j, 0, np);
            acc = 0;
          } else {
            acc += d;
          }
        }
        while (res.length < n) {
          res.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
        }
        return res.slice(0, n);
      }

      /* Ramer-Douglas-Peucker polyline simplification */
      function rdpSimplify(pts, epsilon) {
        if (pts.length <= 2) return pts.slice();
        var maxDist = 0, index = 0;
        var start = pts[0], end = pts[pts.length - 1];
        var dx = end.x - start.x, dy = end.y - start.y;
        var lenSq = dx * dx + dy * dy;

        for (var i = 1; i < pts.length - 1; i++) {
          var d;
          if (lenSq < 1e-4) {
            d = Math.hypot(pts[i].x - start.x, pts[i].y - start.y);
          } else {
            var t = Math.max(0, Math.min(1, ((pts[i].x - start.x) * dx + (pts[i].y - start.y) * dy) / lenSq));
            d = Math.hypot(pts[i].x - (start.x + t * dx), pts[i].y - (start.y + t * dy));
          }
          if (d > maxDist) { maxDist = d; index = i; }
        }
        if (maxDist > epsilon) {
          var left = rdpSimplify(pts.slice(0, index + 1), epsilon);
          var right = rdpSimplify(pts.slice(index), epsilon);
          return left.slice(0, left.length - 1).concat(right);
        }
        return [start, end];
      }

      /* Order and subtly snap 3 triangle vertices so A-B is bottom base and C is apex */
      function normalizeTriangleVertices(rawVerts) {
        var verts = rawVerts.map(function (v) { return { x: v.x, y: v.y }; });
        // Sort by Y descending so the two lowest points on screen (largest Y) become base A, B
        verts.sort(function (p1, p2) { return p2.y - p1.y; });
        var base1 = verts[0], base2 = verts[1], apex = verts[2];
        var pA = base1.x <= base2.x ? base1 : base2;
        var pB = base1.x <= base2.x ? base2 : base1;
        var pC = apex;

        // Subtle geometric beautification: if base AB is within 7° of horizontal, level it
        var baseAng = Math.abs(Math.atan2(pB.y - pA.y, pB.x - pA.x));
        if (baseAng < 0.125) {
          var avgY = (pA.y + pB.y) / 2;
          pA.y = avgY;
          pB.y = avgY;
        }

        // Check if triangle is nearly a right triangle (within 7.5° of 90°)
        var a = Math.hypot(pB.x - pC.x, pB.y - pC.y);
        var b = Math.hypot(pA.x - pC.x, pA.y - pC.y);
        var c = Math.hypot(pA.x - pB.x, pA.y - pB.y);
        var angA = Math.acos(Math.max(-1, Math.min(1, (b * b + c * c - a * a) / Math.max(1e-4, 2 * b * c)))) * (180 / Math.PI);
        var angB = Math.acos(Math.max(-1, Math.min(1, (a * a + c * c - b * b) / Math.max(1e-4, 2 * a * c)))) * (180 / Math.PI);
        var isRight = false;
        if (Math.abs(angA - 90) < 7.5 && baseAng < 0.15) {
          pC.x = pA.x;
          isRight = true;
        } else if (Math.abs(angB - 90) < 7.5 && baseAng < 0.15) {
          pC.x = pB.x;
          isRight = true;
        }

        return {
          isRight: isRight,
          pts: [
            { x: Math.round(pA.x), y: Math.round(pA.y), label: "A" },
            { x: Math.round(pB.x), y: Math.round(pB.y), label: "B" },
            { x: Math.round(pC.x), y: Math.round(pC.y), label: "C" }
          ]
        };
      }

      /* Extract clean closed polygon vertices from resampled loop */
      function extractClosedPolygonVertices(pts, diag) {
        // Rotate point array so index 0 is the sharpest corner (avoids splitting a flat edge at start/end)
        var n = pts.length;
        var win = Math.max(3, Math.floor(n / 12));
        var bestCornerIdx = 0, minCos = 1;
        for (var i = 0; i < n; i++) {
          var prev = pts[(i - win + n) % n];
          var curr = pts[i];
          var next = pts[(i + win) % n];
          var v1x = curr.x - prev.x, v1y = curr.y - prev.y;
          var v2x = next.x - curr.x, v2y = next.y - curr.y;
          var l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
          if (l1 > 1 && l2 > 1) {
            var cos = (v1x * v2x + v1y * v2y) / (l1 * l2);
            if (cos < minCos) { minCos = cos; bestCornerIdx = i; }
          }
        }

        var ordered = [];
        for (var k = 0; k < n; k++) ordered.push(pts[(bestCornerIdx + k) % n]);
        ordered.push({ x: ordered[0].x, y: ordered[0].y });

        var simplified = rdpSimplify(ordered, Math.max(10, diag * 0.075));
        if (simplified.length > 1) simplified.pop(); // remove duplicate closing vertex

        // Prune micro-edges and nearly collinear vertices (interior angle > 152°)
        var minEdge = diag * 0.16;
        var cleaned = simplified.slice();
        var changed = true;
        var iter = 0;
        while (changed && cleaned.length > 3 && iter < 8) {
          changed = false;
          iter++;
          for (var m = 0; m < cleaned.length; m++) {
            var pPrev = cleaned[(m - 1 + cleaned.length) % cleaned.length];
            var pCurr = cleaned[m];
            var pNext = cleaned[(m + 1) % cleaned.length];
            var dEdge = Math.hypot(pNext.x - pCurr.x, pNext.y - pCurr.y);
            if (dEdge < minEdge && cleaned.length > 3) {
              pCurr.x = (pCurr.x + pNext.x) / 2;
              pCurr.y = (pCurr.y + pNext.y) / 2;
              cleaned.splice((m + 1) % cleaned.length, 1);
              changed = true;
              break;
            }
            var ux = pPrev.x - pCurr.x, uy = pPrev.y - pCurr.y;
            var vx = pNext.x - pCurr.x, vy = pNext.y - pCurr.y;
            var lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
            if (lu > 1 && lv > 1) {
              var cosAng = (ux * vx + uy * vy) / (lu * lv);
              // cos(150°) = -0.866; if cosAng < -0.85, angle is >148° (nearly straight line)
              if (cosAng < -0.85 && cleaned.length > 3) {
                cleaned.splice(m, 1);
                changed = true;
                break;
              }
            }
          }
        }
        return cleaned;
      }

      function analyzeStroke(rawStroke) {
        if (!rawStroke || rawStroke.length < 7) return null;
        var trimmed = trimStrokeHooks(rawStroke);
        if (trimmed.length < 6) return null;

        // Detect self-intersection / loop closure if user slightly overshot the starting point in Air Chalk
        var nRaw = trimmed.length;
        var headLimit = Math.max(2, Math.floor(nRaw * 0.22));
        var tailStart = Math.min(nRaw - 2, Math.floor(nRaw * 0.74));
        var bestGap = Infinity, bestHead = 0, bestTail = nRaw - 1;
        for (var hi = 0; hi <= headLimit; hi++) {
          for (var ti = tailStart; ti < nRaw; ti++) {
            var dHT = Math.hypot(trimmed[hi].x - trimmed[ti].x, trimmed[hi].y - trimmed[ti].y);
            if (dHT < bestGap) {
              bestGap = dHT;
              bestHead = hi;
              bestTail = ti;
            }
          }
        }

        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        var pathLen = 0;
        for (var i = 0; i < trimmed.length; i++) {
          var p = trimmed[i];
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
          if (i > 0) pathLen += Math.hypot(p.x - trimmed[i - 1].x, p.y - trimmed[i - 1].y);
        }

        var w = maxX - minX, h = maxY - minY;
        var diag = Math.hypot(w, h);
        if (diag < 38 || pathLen < 75) return null;

        var startEndDist = Math.hypot(trimmed[0].x - trimmed[trimmed.length - 1].x, trimmed[0].y - trimmed[trimmed.length - 1].y);
        var closeThreshold = Math.max(58, diag * 0.44);
        var isClosed = startEndDist < closeThreshold || bestGap < closeThreshold * 0.85;

        // If user closed loop and had a slight overshoot tail, slice to the closed loop
        var loopPts = trimmed;
        if (isClosed && bestGap < startEndDist * 0.65 && (bestTail - bestHead) >= 6) {
          loopPts = trimmed.slice(bestHead, bestTail + 1);
        }

        if (!isClosed) return null;

        var pts = resampleStroke(loopPts, 64);

        // Compute shoelace signed area, centroid, and perimeter of closed loop
        var area2 = 0, perim = 0, sumX = 0, sumY = 0;
        for (var k = 0; k < pts.length; k++) {
          var p0 = pts[k], p1 = pts[(k + 1) % pts.length];
          area2 += (p0.x * p1.y - p1.x * p0.y);
          perim += Math.hypot(p1.x - p0.x, p1.y - p0.y);
          sumX += p0.x;
          sumY += p0.y;
        }
        var polyArea = Math.abs(area2) / 2;
        var cx = sumX / pts.length;
        var cy = sumY / pts.length;

        // Isoperimetric quotient Q = 4 * pi * Area / Perimeter^2 (Circle = 1.0, Square = 0.785, Equilateral Tri = 0.604)
        var isoQ = (4 * Math.PI * polyArea) / Math.max(1, perim * perim);

        // Radial deviation from centroid
        var radii = [];
        var avgR = 0;
        for (var rIdx = 0; rIdx < pts.length; rIdx++) {
          var rad = Math.hypot(pts[rIdx].x - cx, pts[rIdx].y - cy);
          radii.push(rad);
          avgR += rad;
        }
        avgR /= pts.length;

        var rVariance = 0;
        for (var rv = 0; rv < radii.length; rv++) {
          rVariance += Math.abs(radii[rv] - avgR);
        }
        rVariance /= pts.length;
        var relRadialDev = rVariance / Math.max(1, avgR);
        var aspect = Math.min(w, h) / Math.max(1, Math.max(w, h));

        // Extract candidate polygon corners via RDP + angle pruning
        var polyVerts = extractClosedPolygonVertices(pts, diag);

        // 1. Circle Check: High circularity (low radial deviation, high isoperimetric quotient, and not a sharp 3/4-gon)
        var isStrongCircle = relRadialDev < 0.155 && aspect > 0.62 && isoQ > 0.74;
        var isSoftCircle = relRadialDev < 0.23 && aspect > 0.56 && isoQ > 0.78 && polyVerts.length >= 5;
        if (isStrongCircle || isSoftCircle) {
          var confC = Math.max(0.82, Math.min(0.99, 1 - relRadialDev * 1.4));
          return {
            type: "circle",
            cx: Math.round(cx),
            cy: Math.round(cy),
            r: Math.round(avgR),
            confidence: confC,
            msg: "✨ Shape recognized: Circle (A = πr²)"
          };
        }

        // 2. Triangle Check (3 vertices from RDP simplification)
        if (polyVerts.length === 3 && polyArea > 600) {
          var normTri = normalizeTriangleVertices(polyVerts);
          var confT = Math.max(0.84, Math.min(0.99, 0.96 - Math.abs(isoQ - 0.58) * 0.35));
          return {
            type: "triangle",
            confidence: confT,
            msg: normTri.isRight
              ? "✨ Shape recognized: Right Triangle (a² + b² = c²)"
              : "✨ Shape recognized: Triangle (ΔABC)",
            pts: normTri.pts
          };
        }

        // 3. Quad / Cube Check (4 vertices)
        if (polyVerts.length === 4 && w > 50 && h > 50) {
          return {
            type: "cube_hint",
            w: w,
            h: h,
            cx: cx,
            cy: cy,
            confidence: 0.92,
            msg: "✨ Shape recognized: Box → 3D Hexahedron (Cube Net)"
          };
        }

        // 4. Pentagon / Irregular Prism Check (5 vertices and moderate radial variation)
        if (polyVerts.length === 5 && w > 55 && h > 55 && relRadialDev >= 0.14) {
          return {
            type: "prism_hint",
            confidence: 0.89,
            msg: "✨ Shape recognized: 5-Sides → 3D Irregular Polygonal Prism"
          };
        }

        // 5. Fallback for generously rounded Air Chalk circles or triangles
        if (relRadialDev < 0.26 && aspect > 0.55) {
          return {
            type: "circle",
            cx: Math.round(cx),
            cy: Math.round(cy),
            r: Math.round(avgR),
            confidence: 0.80,
            msg: "✨ Shape recognized: Circle (A = πr²)"
          };
        }

        return null;
      }

      /* Break any multi-corner polyline into atomic straight segments so 2-stroke triangles work */
      function decomposeStrokesIntoSegments(strokes) {
        var segs = [];
        strokes.forEach(function (rawS) {
          var s = trimStrokeHooks(rawS);
          if (s.length < 2) return;
          var pStart = s[0], pEnd = s[s.length - 1];
          var chord = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);
          var pathLen = 0;
          for (var i = 1; i < s.length; i++) {
            pathLen += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
          }
          if (chord > 20 && pathLen / Math.max(1, chord) < 1.38) {
            segs.push({ p1: pStart, p2: pEnd, chord: chord, isLine: true });
          } else {
            // Simplify bent stroke (e.g., 2 sides of a triangle drawn in 1 V-stroke)
            var simp = rdpSimplify(s, Math.max(12, pathLen * 0.08));
            if (simp.length >= 3 && simp.length <= 4) {
              for (var j = 0; j < simp.length - 1; j++) {
                var cLen = Math.hypot(simp[j + 1].x - simp[j].x, simp[j + 1].y - simp[j].y);
                if (cLen > 24) {
                  segs.push({ p1: simp[j], p2: simp[j + 1], chord: cLen, isLine: true });
                }
              }
            } else {
              segs.push({ p1: pStart, p2: pEnd, chord: chord, isLine: false });
            }
          }
        });
        return segs;
      }

      function clusterEndpoints(segments, mergeRadius) {
        var pts = [];
        segments.forEach(function (s) { pts.push(s.p1, s.p2); });
        var vertices = [];
        for (var i = 0; i < pts.length; i++) {
          var p = pts[i];
          var found = null;
          for (var v = 0; v < vertices.length; v++) {
            if (Math.hypot(vertices[v].x - p.x, vertices[v].y - p.y) < mergeRadius) {
              found = vertices[v];
              break;
            }
          }
          if (!found) {
            vertices.push({ x: p.x, y: p.y, count: 1 });
          } else {
            found.x = (found.x * found.count + p.x) / (found.count + 1);
            found.y = (found.y * found.count + p.y) / (found.count + 1);
            found.count++;
          }
        }
        return vertices;
      }

      function recognizeMultiStroke(strokes) {
        if (!strokes || strokes.length < 2 || strokes.length > 5) return null;

        var segments = decomposeStrokesIntoSegments(strokes);
        var clusterTol = isAirActive ? 68 : 52;

        // 2 Raw Line Strokes: Plus (+) or Equals (=)
        if (strokes.length === 2 && segments.length === 2 && segments[0].isLine && segments[1].isLine) {
          var s1 = segments[0], s2 = segments[1];
          var mid1 = { x: (s1.p1.x + s1.p2.x) / 2, y: (s1.p1.y + s1.p2.y) / 2 };
          var mid2 = { x: (s2.p1.x + s2.p2.x) / 2, y: (s2.p1.y + s2.p2.y) / 2 };
          var midDist = Math.hypot(mid1.x - mid2.x, mid1.y - mid2.y);
          var a1 = Math.atan2(s1.p2.y - s1.p1.y, s1.p2.x - s1.p1.x);
          var a2 = Math.atan2(s2.p2.y - s2.p1.y, s2.p2.x - s2.p1.x);
          var diff = Math.abs(a1 - a2);
          if (diff > Math.PI) diff = 2 * Math.PI - diff;

          if (midDist < (isAirActive ? 48 : 35) && Math.abs(diff - Math.PI / 2) < 0.45) {
            return { type: "operator_plus", cx: mid1.x, cy: mid1.y, confidence: 0.94 };
          }
          if (midDist < (isAirActive ? 56 : 45) && (diff < 0.32 || Math.abs(diff - Math.PI) < 0.32)) {
            return { type: "operator_equals", confidence: 0.93 };
          }
        }

        // 3 Atomic Segments (from 2 or 3 strokes): Triangle (ΔABC)
        if (segments.length === 3 && segments.every(function (s) { return s.isLine; })) {
          var vertices3 = clusterEndpoints(segments, clusterTol);
          if (vertices3.length === 3 && vertices3.every(function (v) { return v.count >= 2; })) {
            var normTri = normalizeTriangleVertices(vertices3);
            return {
              type: "triangle",
              confidence: 0.95,
              msg: normTri.isRight
                ? "✨ Shape recognized: Multi-Stroke Right Triangle (ΔABC)"
                : "✨ Shape recognized: Multi-Stroke Triangle (ΔABC)",
              pts: normTri.pts
            };
          }
        }

        // 4 Atomic Segments: Rectangle / 3D Cube
        if (segments.length === 4 && segments.every(function (s) { return s.isLine; })) {
          var vertices4 = clusterEndpoints(segments, clusterTol);
          if (vertices4.length === 4 && vertices4.every(function (v) { return v.count >= 2; })) {
            return {
              type: "cube_hint",
              confidence: 0.94,
              msg: "✨ Shape recognized: 4-Stroke Box → 3D Cube"
            };
          }
        }

        return null;
      }

      function scheduleMultiStrokeCheck() {
        if (multiStrokeTimer) clearTimeout(multiStrokeTimer);
        var delay = isAirActive ? 1350 : 620;
        multiStrokeTimer = setTimeout(checkMultiStroke, delay);
      }

      function checkMultiStroke() {
        // Never expire multi-stroke buffer while user is actively mid-stroke
        if (isDrawing || isAirPenDown) {
          scheduleMultiStrokeCheck();
          return;
        }
        if (recentStrokes.length < 2) return;
        var recognized = recognizeMultiStroke(recentStrokes);
        if (recognized) {
          applyRecognition(recognized);
        } else {
          recentStrokes = [];
          draw2D();
        }
      }

      function drawGrid(ctx, w, h) {
        if (!appElement.classList.contains("bb-grid-visible")) return;
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        var sz = 35;
        for (var x = sz; x < w; x += sz) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (var y = sz; y < h; y += sz) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
      }

      function draw2D() {
        if (curMode.startsWith("3d")) {
          chalkCanvas.style.display = "none";
          threeCanvas.style.display = "block";
          triangleCtrls.style.display = "none";
          circleCtrls.style.display = "none";
          return;
        }
        chalkCanvas.style.display = "block";
        threeCanvas.style.display = "none";

        var rect = stageWrap.getBoundingClientRect();
        var w = rect.width, h = rect.height;
        chalkCtx.clearRect(0, 0, w, h);
        drawGrid(chalkCtx, w, h);

        if (geom2D.type === "triangle") {
          triangleCtrls.style.display = "flex";
          circleCtrls.style.display = "none";
          var pA = geom2D.pts[0], pB = geom2D.pts[1], pC = geom2D.pts[2];

          // All maths lives in geometry-engine.mjs (full precision, guarded, tested)
          var T = solveTriangle(pA, pB, pC, SCALE);
          var a = T.a, b = T.b, c = T.c;
          var angA = T.angA, angB = T.angB, angC = T.angC;
          var area = T.area, perim = T.perim;

          // Fill triangle
          chalkCtx.beginPath();
          chalkCtx.moveTo(pA.x, pA.y);
          chalkCtx.lineTo(pB.x, pB.y);
          chalkCtx.lineTo(pC.x, pC.y);
          chalkCtx.closePath();
          chalkCtx.fillStyle = "rgba(73,133,223,0.24)";
          chalkCtx.fill();

          chalkCtx.strokeStyle = "#38bdf8";
          chalkCtx.lineWidth = 3;
          chalkCtx.stroke();

          // Altitude calculation
          // Project C onto line AB
          var dx = pB.x - pA.x, dy = pB.y - pA.y;
          var pD = { x: pA.x + T.u * dx, y: pA.y + T.u * dy }; // foot of altitude
          var altVal = T.h, d1 = T.d1, d2 = T.d2;

          var dropAlt = chkAltitude.checked && T.valid;
          if (dropAlt) {
            // Draw altitude line
            chalkCtx.beginPath();
            chalkCtx.setLineDash([5, 5]);
            chalkCtx.moveTo(pC.x, pC.y);
            chalkCtx.lineTo(pD.x, pD.y);
            chalkCtx.strokeStyle = "#fb7185";
            chalkCtx.lineWidth = 2.5;
            chalkCtx.stroke();
            chalkCtx.setLineDash([]);

            // Altitude foot D marker
            chalkCtx.beginPath();
            chalkCtx.arc(pD.x, pD.y, 5, 0, Math.PI * 2);
            chalkCtx.fillStyle = "#fb7185";
            chalkCtx.fill();

            // Right-angle symbol at foot D
            var normX = -(dy) / Math.hypot(dx, dy);
            var normY = (dx) / Math.hypot(dx, dy);
            if (normX * (pC.x - pD.x) + normY * (pC.y - pD.y) < 0) { normX = -normX; normY = -normY; }
            var tangX = dx / Math.hypot(dx, dy);
            var tangY = dy / Math.hypot(dx, dy);
            var sqSz = 12;
            chalkCtx.beginPath();
            chalkCtx.moveTo(pD.x + tangX * sqSz, pD.y + tangY * sqSz);
            chalkCtx.lineTo(pD.x + tangX * sqSz + normX * sqSz, pD.y + tangY * sqSz + normY * sqSz);
            chalkCtx.lineTo(pD.x + normX * sqSz, pD.y + normY * sqSz);
            chalkCtx.strokeStyle = "#facc15";
            chalkCtx.lineWidth = 1.5;
            chalkCtx.stroke();

            // Label altitude h
            chalkCtx.font = "bold 12px 'Board Sans', system-ui";
            chalkCtx.fillStyle = "#fb7185";
            chalkCtx.fillText("h=" + fmt(altVal,2), (pC.x + pD.x)/2 + 8, (pC.y + pD.y)/2);
          }

          // Draggable handles
          [pA, pB, pC].forEach(function (pt) {
            if (document.activeElement === chalkCanvas && geom2D.pts[selectedVertex] === pt) {
              chalkCtx.beginPath();
              chalkCtx.arc(pt.x, pt.y, 15, 0, Math.PI * 2);
              chalkCtx.strokeStyle = "#facc15";
              chalkCtx.lineWidth = 3;
              chalkCtx.stroke();
            }
            chalkCtx.beginPath();
            chalkCtx.arc(pt.x, pt.y, 11, 0, Math.PI * 2);
            chalkCtx.fillStyle = "#fff";
            chalkCtx.fill();
            chalkCtx.strokeStyle = "#10b981";
            chalkCtx.lineWidth = 2.5;
            chalkCtx.stroke();

            chalkCtx.font = "bold 13px 'Board Sans', system-ui";
            chalkCtx.fillStyle = "#facc15";
            chalkCtx.fillText(pt.label, pt.x - 4, pt.y - 14);
          });

          // Labels on sides
          var unk = selUnknown.value;
          chalkCtx.font = "600 12px 'Board Sans', system-ui";
          chalkCtx.fillStyle = "#ecfdf5";

          var labelC = unk === "side-c" ? "x (UNKNOWN)" : "c = " + c.toFixed(1);
          var labelB = "b = " + b.toFixed(1);
          var labelA = "a = " + a.toFixed(1);
          if (unk === "side-c") chalkCtx.fillStyle = "#fb7185";
          chalkCtx.fillText(labelC, (pA.x + pB.x)/2 - 16, (pA.y + pB.y)/2 + 20);

          chalkCtx.fillStyle = "#ecfdf5";
          chalkCtx.fillText(labelA, (pB.x + pC.x)/2 + 10, (pB.y + pC.y)/2);
          chalkCtx.fillText(labelB, (pA.x + pC.x)/2 - 42, (pA.y + pC.y)/2);

          // Update sidebar inspector
          entityTitle.textContent = "📐 Triangle Deconstruction";
          entityBadge.textContent = "2D Euclidean";
          syncDimInputs(T);
          if (!T.valid) {
            lblM1.textContent = "Perimeter P"; valM1.textContent = "—";
            lblM2.textContent = "Area"; valM2.textContent = "—";
            lblM3.textContent = "Angle A / B"; valM3.textContent = "—";
            lblM4.textContent = "Altitude h / Base c"; valM4.textContent = "—";
            aiStepText.textContent = "Not a valid triangle: " + T.reason + " Drag a vertex away, or type new side lengths.";
            chalkCanvas.setAttribute("aria-label", "Triangle ABC is not valid. " + T.reason);
            announce("Not a valid triangle. " + T.reason);
          } else {
          chalkCanvas.setAttribute("aria-label", "Triangle ABC. Sides a " + fmt(a, 1) + ", b " + fmt(b, 1) + ", c " + fmt(c, 1) + " centimetres. Angles A " + fmt(angA, 1) + ", B " + fmt(angB, 1) + ", C " + fmt(angC, 1) + " degrees. Area " + fmt(area, 1) + " square centimetres. Selected vertex " + geom2D.pts[selectedVertex].label + ". Arrow keys move it.");
          announce("Triangle: a " + fmt(a, 1) + ", b " + fmt(b, 1) + ", c " + fmt(c, 1) + " centimetres. Angles " + fmt(angA, 1) + ", " + fmt(angB, 1) + ", " + fmt(angC, 1) + " degrees. Area " + fmt(area, 1) + ".");
          lblM1.textContent = unk === "side-c" ? "Unknown Side x" : "Perimeter P";
          valM1.textContent = unk === "side-c" ? "x = " + c.toFixed(2) + " cm" : perim.toFixed(2) + " cm";

          lblM2.textContent = "Area A = ½ch";
          valM2.textContent = area.toFixed(2) + " cm²";

          lblM3.textContent = unk === "angle-b" ? "Unknown Angle θ" : "Angle A / B";
          valM3.textContent = unk === "angle-b" ? "θ = " + angB.toFixed(1) + "°" : angA.toFixed(1) + "° · " + angB.toFixed(1) + "°";

          lblM4.textContent = "Altitude h / Base c";
          valM4.textContent = "h=" + fmt(altVal,2) + " · c=" + c.toFixed(1);

          // Step-by-Step AI explanation
          if (unk === "side-c") {
            aiStepText.innerHTML = "<strong>Solving Unknown Side $x$:</strong><br>Law of Cosines: $x = \\sqrt{a^2 + b^2 - 2ab\\cos C} = \\sqrt{" + fmt(a*a,2) + " + " + fmt(b*b,2) + " - 2(" + fmt(a,2) + ")(" + fmt(b,2) + ")\\cos(" + fmt(angC,2) + "^\\circ)} = " + fmt(c,2) + "\\text{ cm}$.<br>Check by altitude: $h = b \\sin A = " + fmt(altVal,2) + "$; " + (T.footInside ? "$x = d_1 + d_2 = " + fmt(d1,2) + " + " + fmt(d2,2) + " = " + fmt(d1+d2,2) + "$." : "the foot of the altitude lies outside the base (obtuse angle), so $x = |d_1 - d_2| = |" + fmt(d1,2) + " - " + fmt(d2,2) + "| = " + fmt(Math.abs(d1-d2),2) + "$.");
          } else if (unk === "angle-b") {
            aiStepText.innerHTML = "<strong>Solving Unknown Angle $\\theta$ ($\\angle B$):</strong><br>Law of Cosines (works for acute and obtuse angles): $\\cos\\theta = \\frac{a^2 + c^2 - b^2}{2ac} = \\frac{" + fmt(a*a,2) + " + " + fmt(c*c,2) + " - " + fmt(b*b,2) + "}{" + fmt(2*a*c,2) + "} = " + fmt((a*a+c*c-b*b)/(2*a*c),4) + "$.<br>$\\theta = \\arccos(" + fmt((a*a+c*c-b*b)/(2*a*c),4) + ") = " + fmt(angB,2) + "^\\circ$." + (angB > 90 ? "<br>Note: $\\theta$ is obtuse. A sine alone ($\\arcsin$) would wrongly give " + fmt(180-angB,2) + "$^\\circ$, so use the cosine." : "");
          } else if (unk === "altitude-h") {
            aiStepText.innerHTML = "<strong>Solving Unknown Altitude $h$:</strong><br>Method 1 (Trigonometry): $h = b \\sin A = " + b.toFixed(1) + " \\times " + Math.sin(angA*Math.PI/180).toFixed(3) + " = " + fmt(altVal,2) + "\\text{ cm}$.<br>Method 2 (Area): Area $= " + area.toFixed(2) + "$. Since $A = \\frac{1}{2} c h$, $h = \\frac{2A}{c} = \\frac{" + (2*area).toFixed(1) + "}{" + c.toFixed(1) + "} = " + fmt(altVal,2) + "\\text{ cm}$.";
          } else if (dropAlt && (Math.abs(T.u) < 1e-9 || Math.abs(T.u - 1) < 1e-9)) {
            aiStepText.innerHTML = "<strong>Right-triangle altitude:</strong><br>The altitude foot coincides with a base vertex. The original triangle is already right-angled, so there is no second nonzero triangle to add or subtract. Area = ½ × base × height = ½ × " + fmt(c,2) + " × " + fmt(altVal,2) + " = " + fmt(area,2) + " cm².";
          } else if (dropAlt) {
            aiStepText.innerHTML = "<strong>Altitude Deconstruction:</strong><br>Dropping altitude $h=" + fmt(altVal,2) + "$ " + (T.footInside ? "forms two right triangles inside the original triangle:" : "requires extending the base to form two overlapping right triangles:") + " $\\Delta ADC$ and $\\Delta BDC$.<br>Pythagoras on $\\Delta ADC$: $d_1^2 + h^2 = " + (d1*d1).toFixed(1) + " + " + (altVal*altVal).toFixed(1) + " = " + (b*b).toFixed(1) + " = b^2$.<br>Pythagoras on $\\Delta BDC$: $d_2^2 + h^2 = " + (d2*d2).toFixed(1) + " + " + (altVal*altVal).toFixed(1) + " = " + (a*a).toFixed(1) + " = a^2$.<br>" + (T.footInside ? "Add the two areas: $A = \\frac{1}{2}(d_1+d_2)h" : "The altitude foot is outside the base. Subtract the smaller right triangle: $A = \\frac{1}{2}|d_1-d_2|h") + " = \\frac{1}{2} c h = " + area.toFixed(2) + "\\text{ cm}^2$.";
          } else {
            aiStepText.innerHTML = "<strong>Euclidean Triangle:</strong><br>Sides: $a=" + a.toFixed(1) + "$, $b=" + b.toFixed(1) + "$, $c=" + c.toFixed(1) + "$.<br>Angles: $\\angle A=" + angA.toFixed(1) + "^\\circ$, $\\angle B=" + angB.toFixed(1) + "^\\circ$, $\\angle C=" + angC.toFixed(1) + "^\\circ$ (Sum: $180^\\circ$).<br>Check <em>Drop Altitude</em> to deconstruct into two right triangles or choose an unknown variable to solve!";
          }
          }
          deconstructPanel.style.display = "none";

        } else if (geom2D.type === "circle") {
          triangleCtrls.style.display = "none";
          circleCtrls.style.display = "flex";
          var circ = geom2D.circle;
          chalkCtx.beginPath();
          chalkCtx.arc(circ.cx, circ.cy, circ.r, 0, Math.PI * 2);
          chalkCtx.fillStyle = "rgba(56,189,248,0.18)";
          chalkCtx.fill();
          chalkCtx.strokeStyle = "#38bdf8";
          chalkCtx.lineWidth = 3;
          chalkCtx.stroke();

          // Center & Radius
          chalkCtx.beginPath();
          chalkCtx.arc(circ.cx, circ.cy, 5, 0, Math.PI * 2);
          chalkCtx.fillStyle = "#fff";
          chalkCtx.fill();

          chalkCtx.beginPath();
          chalkCtx.strokeStyle = "#facc15";
          chalkCtx.lineWidth = 2;
          chalkCtx.moveTo(circ.cx, circ.cy);
          chalkCtx.lineTo(circ.cx + circ.r, circ.cy);
          chalkCtx.stroke();

          chalkCtx.beginPath();
          chalkCtx.arc(circ.cx + circ.r, circ.cy, 11, 0, Math.PI * 2);
          chalkCtx.fillStyle = "#facc15";
          chalkCtx.fill();
          chalkCtx.stroke();

          var rVal = circ.r / 25;
          var circum = 2 * Math.PI * rVal;
          var circArea = Math.PI * rVal * rVal;

          if (inRadius && document.activeElement !== inRadius) inRadius.value = fmt(rVal, 2);
          chalkCanvas.setAttribute("aria-label", "Circle with radius " + fmt(rVal, 1) + " centimetres. Area " + fmt(circArea, 1) + " square centimetres, circumference " + fmt(circum, 1) + ". Arrow keys change the radius.");
          announce("Circle: radius " + fmt(rVal, 2) + ", circumference " + fmt(circum, 2) + ", area " + fmt(circArea, 2) + ".");
          entityTitle.textContent = "⭕ Circle Geometry";
          entityBadge.textContent = "2D Analytic";
          lblM1.textContent = "Radius r"; valM1.textContent = rVal.toFixed(2) + " cm";
          lblM2.textContent = "Diameter d"; valM2.textContent = (rVal * 2).toFixed(2) + " cm";
          lblM3.textContent = "Circumference 2πr"; valM3.textContent = circum.toFixed(2) + " cm";
          lblM4.textContent = "Area A = πr²"; valM4.textContent = circArea.toFixed(2) + " cm²";

          aiStepText.innerHTML = "<strong>Circle Properties:</strong><br>Radius $r = " + rVal.toFixed(2) + "$.<br>Circumference $C = 2\\pi r = " + circum.toFixed(2) + "$.<br>Area $A = \\pi r^2 = " + circArea.toFixed(2) + "$. Drag the golden handle to change radius.";
          deconstructPanel.style.display = "none";
        }

        if (boardStudio) boardStudio.refresh();
        // Air annotations are independent of shape recognition and retain their colour.
        airInk.forEach(function (stroke) { drawSmoothChalkStroke(chalkCtx, stroke.points, stroke.color, 1, stroke.width); });
        if (airInkStroke) drawSmoothChalkStroke(chalkCtx, airInkStroke.points, airInkStroke.color, 1, airInkStroke.width);

        // Render any pending multi-stroke segments and active freehand chalk stroke
        if (recentStrokes.length > 0) {
          recentStrokes.forEach(function (st) {
            drawSmoothChalkStroke(chalkCtx, st, curColor, 0.85);
          });
        }
        if (isDrawing && currentStroke.length > 1) {
          drawSmoothChalkStroke(chalkCtx, currentStroke, curColor, 1.0);
        }
      }

      function drawSmoothChalkStroke(ctx, pts, color, alpha, width) {
        if (!pts || pts.length < 2) return;
        ctx.save();
        ctx.globalAlpha = alpha !== undefined ? alpha : 1.0;
        ctx.strokeStyle = color || curColor;
        ctx.lineWidth = width || 3.6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = color || curColor;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var i = 1; i < pts.length - 1; i++) {
          var mx = (pts[i].x + pts[i + 1].x) / 2;
          var my = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
        }
        var last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
        ctx.restore();
      }

      function findNearest2DHandle(x, y, maxRadius) {
        if (curMode.startsWith("3d")) return null;
        if (geom2D.type === "triangle") {
          var bestPt = null, bestD = maxRadius;
          for (var i = 0; i < geom2D.pts.length; i++) {
            var pt = geom2D.pts[i];
            var d = Math.hypot(pt.x - x, pt.y - y);
            if (d < bestD) { bestD = d; bestPt = pt; }
          }
          if (bestPt) return { type: "vertex", pt: bestPt, x: bestPt.x, y: bestPt.y, label: "Vertex " + bestPt.label };
        } else if (geom2D.type === "circle") {
          var circ = geom2D.circle;
          var hx = circ.cx + circ.r, hy = circ.cy;
          if (Math.hypot(hx - x, hy - y) < maxRadius) {
            return { type: "circle-r", pt: "circle-r", x: hx, y: hy, label: "Radius r" };
          }
        }
        return null;
      }

      chkAltitude.addEventListener("change", draw2D);
      selUnknown.addEventListener("change", draw2D);

      /* Chalk Pointer Events */
      chalkCanvas.addEventListener("pointerdown", function (e) {
        if (activePointerId !== null || isAirPenDown || e.button !== 0) return;
        if ($("bb-pen-only").checked && e.pointerType !== "pen") return;
        e.preventDefault();
        // Commit and leave numeric fields before dragging, so a later blur cannot
        // overwrite the new geometry with a stale typed value.
        chalkCanvas.focus({ preventScroll: true });
        var rect = chalkCanvas.getBoundingClientRect();
        var clientX = e.clientX - rect.left, clientY = e.clientY - rect.top;

        if (["ink", "erase"].includes(appElement.dataset.pointerTool)) {
          startAirStroke(clientX, clientY, 0);
          capturePointer(e);
          return;
        }

        // First check if user clicked a draggable vertex/radius handle (unless explicitly in draw mode)
        if (curMode !== "draw" || appElement.dataset.pointerTool === "select") {
          var hitHandle = findNearest2DHandle(clientX, clientY, 26);
          if (hitHandle) {
            snapshotState();
            draggingPoint = hitHandle.pt;
            capturePointer(e);
            return;
          }
        }

        if (appElement.dataset.pointerTool === "select") return;
        // Otherwise allow sketching new geometry anywhere in open space on the 2D board
        if (!curMode.startsWith("3d")) {
          isDrawing = true;
          currentStroke = [{ x: clientX, y: clientY }];
          capturePointer(e);
        }
      });

      chalkCanvas.addEventListener("pointermove", function (e) {
        if (e.pointerId !== activePointerId) return;
        e.preventDefault();
        var rect = chalkCanvas.getBoundingClientRect();
        var clientX = e.clientX - rect.left, clientY = e.clientY - rect.top;

        if (appElement.dataset.pointerTool === "erase") { eraseAirInk(clientX, clientY); return; }
        if (airInkStroke) {
          airInkStroke.points.push({ x: clientX, y: clientY }); draw2D(); return;
        }

        if (draggingPoint) {
          if (draggingPoint === "circle-r") {
            geom2D.circle.r = Math.max(20, Math.hypot(clientX - geom2D.circle.cx, clientY - geom2D.circle.cy));
          } else {
            draggingPoint.x = clientX;
            draggingPoint.y = clientY;
          }
          draw2D();
          return;
        }

        if (isDrawing && !curMode.startsWith("3d")) {
          var prev = currentStroke[currentStroke.length - 1];
          if (!prev || Math.hypot(clientX - prev.x, clientY - prev.y) >= 2) {
            currentStroke.push({ x: clientX, y: clientY });
            draw2D();
          }
        }
      });

      function stopStroke(e) {
        if (e.pointerId !== activePointerId) return;
        activePointerId = null;
        if (airInkStroke || appElement.dataset.pointerTool === "erase") {
          endAirStroke();
          try { chalkCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
          return;
        }
        if (isDrawing) {
          isDrawing = false;
          try { chalkCanvas.releasePointerCapture(e.pointerId); } catch (err) {}
          var recognized = analyzeStroke(currentStroke);
          if (recognized) {
            applyRecognition(recognized);
          } else if (currentStroke.length >= 3) {
            recentStrokes.push(currentStroke.slice());
            currentStroke = [];
            var instantMulti = recognizeMultiStroke(recentStrokes);
            if (instantMulti) {
              applyRecognition(instantMulti);
            } else {
              scheduleMultiStrokeCheck();
              draw2D();
            }
          } else {
            currentStroke = [];
            draw2D();
          }
        }
        if (draggingPoint) {
          try { chalkCanvas.releasePointerCapture(e.pointerId); } catch (err) {}
          draggingPoint = null;
        }
      }

      chalkCanvas.addEventListener("pointerup", stopStroke);
      chalkCanvas.addEventListener("pointercancel", function (e) {
        if (e.pointerId === activePointerId) cancelPointerStroke();
      });
      chalkCanvas.addEventListener("lostpointercapture", function (e) {
        if (e.pointerId === activePointerId) cancelPointerStroke();
      });
      chalkCanvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      threeCanvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      window.addEventListener("blur", cancelPointerStroke);

      /* ── Keyboard control of vertices / radius ── */
      function clampPt(pt) {
        var r = stageWrap.getBoundingClientRect();
        pt.x = Math.max(10, Math.min(r.width - 10, pt.x));
        pt.y = Math.max(10, Math.min(r.height - 10, pt.y));
      }
      chalkCanvas.addEventListener("focus", draw2D);
      chalkCanvas.addEventListener("blur", draw2D);
      chalkCanvas.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undoLast(); return; }
        if (curMode.startsWith("3d") || e.ctrlKey || e.metaKey) return;
        var step = e.shiftKey ? 20 : (e.altKey ? 1 : 5);
        var dxk = 0, dyk = 0;
        switch (e.key) {
          case "ArrowLeft": dxk = -step; break;
          case "ArrowRight": dxk = step; break;
          case "ArrowUp": dyk = -step; break;
          case "ArrowDown": dyk = step; break;
          default: break;
        }
        if (geom2D.type === "triangle") {
          var k = e.key.toLowerCase();
          var pick = k === "a" || k === "1" ? 0 : (k === "b" || k === "2" ? 1 : (k === "c" || k === "3" ? 2 : -1));
          if (pick >= 0) {
            selectedVertex = pick;
            announce("Vertex " + geom2D.pts[pick].label + " selected. Use arrow keys to move it.", true);
            draw2D();
            e.preventDefault();
            return;
          }
          if (dxk || dyk) {
            var pt = geom2D.pts[selectedVertex];
            pt.x += dxk; pt.y += dyk;
            clampPt(pt);
            draw2D();
            e.preventDefault();
          }
        } else if (geom2D.type === "circle") {
          if (dxk || dyk) {
            var delta = (dxk + (-dyk)) > 0 ? step : -step;
            var rect = stageWrap.getBoundingClientRect();
            var maxR = Math.max(24, Math.min(geom2D.circle.cx, rect.width - geom2D.circle.cx, geom2D.circle.cy, rect.height - geom2D.circle.cy));
            geom2D.circle.r = Math.max(20, Math.min(maxR, geom2D.circle.r + delta));
            draw2D();
            e.preventDefault();
          }
        }
      });

      /* ── Exact numeric inputs ── */
      function syncDimInputs(T) {
        [[inSideA, T.a], [inSideB, T.b], [inSideC, T.c]].forEach(function (pair) {
          if (pair[0] && document.activeElement !== pair[0]) pair[0].value = fmt(pair[1], 2);
        });
        if (dimsMsg && T.valid) dimsMsg.textContent = "";
      }
      function applySides() {
        var a = parseFloat(inSideA.value), b = parseFloat(inSideB.value), c = parseFloat(inSideC.value);
        if (!(a > 0 && b > 0 && c > 0)) { dimsMsg.textContent = "Enter three positive side lengths."; return; }
        var rect = stageWrap.getBoundingClientRect();
        var pts = pointsFromSides(a, b, c, { x: 0, y: 0 }, SCALE, 1);
        if (!pts) {
          dimsMsg.textContent = "These sides can't make a triangle: each side must be shorter than the other two added together.";
          return;
        }
        var minX = Math.min(pts[0].x, pts[1].x, pts[2].x), maxX = Math.max(pts[0].x, pts[1].x, pts[2].x);
        var minY = Math.min(pts[0].y, pts[1].y, pts[2].y), maxY = Math.max(pts[0].y, pts[1].y, pts[2].y);
        var bw = maxX - minX, bh = maxY - minY;
        if (bw > rect.width - 40 || bh > rect.height - 40) {
          dimsMsg.textContent = "That triangle is too large for the board. Try smaller sides.";
          return;
        }
        var ox = (rect.width - bw) / 2 - minX, oy = (rect.height - bh) / 2 - minY;
        pts.forEach(function (pt, i) { geom2D.pts[i].x = pt.x + ox; geom2D.pts[i].y = pt.y + oy; });
        dimsMsg.textContent = "";
        draw2D();
        announce("Triangle updated from typed sides.", true);
      }
      [inSideA, inSideB, inSideC].forEach(function (el) {
        if (el) el.addEventListener("change", applySides);
      });
      if (inRadius) {
        inRadius.addEventListener("change", function () {
          var v = parseFloat(inRadius.value);
          var rect = stageWrap.getBoundingClientRect();
          var c = geom2D.circle;
          var maxR = Math.min(c.cx, rect.width - c.cx, c.cy, rect.height - c.cy);
          if (!(v > 0)) return;
          c.r = Math.max(20, Math.min(maxR, v * SCALE));
          draw2D();
          announce("Radius set to " + fmt(c.r / SCALE, 2) + " centimetres.", true);
        });
      }

      /* ── 3D Three.js Solid & Net Unfolding Engine ── */
      var threeSceneKit = null;
      var current3DGroup = null;
      var netHingeGroups = [];
      var modelControls;
      function frameModel() {
        if (!current3DGroup || !modelControls) return;
        threeSceneKit.syncSize();
        var box = new THREE.Box3().setFromObject(current3DGroup);
        var sphere = box.getBoundingSphere(new THREE.Sphere());
        var camera = threeSceneKit.camera;
        var halfFov = Math.min(camera.fov * Math.PI / 360, Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
        var distance = sphere.radius / Math.sin(halfFov) * 1.75;
        camera.setViewOffset(stageWrap.clientWidth, stageWrap.clientHeight, stageWrap.clientWidth * 0.12, 0, stageWrap.clientWidth, stageWrap.clientHeight);
        var direction = camera.position.clone().sub(modelControls.target).normalize();
        modelControls.target.copy(sphere.center);
        camera.position.copy(sphere.center).addScaledVector(direction, distance);
        modelControls.update();
      }
      var slicePlaneMesh = null;
      var sliceIntersectionMesh = null;
      var conjoinedConeGroup = null;

      function disposeCurrentModel(scene) {
        if (!current3DGroup) return;
        scene.remove(current3DGroup);
        var geometries = new Set(), materials = new Set();
        current3DGroup.traverse(function (object) {
          if (object.geometry) geometries.add(object.geometry);
          if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(function (m) { materials.add(m); });
        });
        geometries.forEach(function (geometry) { geometry.dispose(); });
        materials.forEach(function (material) { material.dispose(); });
      }
      threeCanvas.addEventListener("webglcontextlost", function (e) {
        e.preventDefault();
        webglLost = true;
        deviceMessage("The 3D view paused while the display recovers. Your 2D tools and investigation notes are still available.");
      });
      threeCanvas.addEventListener("webglcontextrestored", function () {
        webglLost = false;
        deviceMessage("");
        frameModel();
      });
      function rotateView(angle) {
        if (!modelControls) return;
        var camera = threeSceneKit.camera;
        var offset = camera.position.clone().sub(modelControls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        camera.position.copy(modelControls.target).add(offset);
        modelControls.update();
      }
      $("bb-rotate-left").addEventListener("click", function () { rotateView(-Math.PI / 8); });
      $("bb-rotate-right").addEventListener("click", function () { rotateView(Math.PI / 8); });
      function zoomView(factor) {
        if (!modelControls) return;
        var camera = threeSceneKit.camera;
        var offset = camera.position.clone().sub(modelControls.target);
        offset.setLength(Math.max(modelControls.minDistance, Math.min(modelControls.maxDistance, offset.length() * factor)));
        camera.position.copy(modelControls.target).add(offset);
        modelControls.update();
      }
      $("bb-zoom-in").addEventListener("click", function () { zoomView(0.8); });
      $("bb-zoom-out").addEventListener("click", function () { zoomView(1.25); });
      $("bb-reset-view").addEventListener("click", function () {
        if (!modelControls) return;
        // Reset controls to clear gesture damping before fitting the model.
        modelControls.reset();
        threeSceneKit.camera.position.copy(modelControls.target).add(new THREE.Vector3(0, 4.2, 7.5));
        frameModel();
      });
      // Full-screen, browser zoom and resolution changes can resize the board without
      // a window resize event. Observe the actual workspace to preserve a usable view.
      if (window.ResizeObserver) {
        new ResizeObserver(function () {
          cancelPointerStroke();
          resizeChalk();
          if (threeSceneKit && curMode.startsWith("3d")) frameModel();
        }).observe(stageWrap);
      }
      [["unfold-slider", "net opening", 10], ["slice-slider", "slice height", 10], ["joint-slider", "joint separation", 10]].forEach(function (spec) {
        var slider = $(spec[0]), row = document.createElement("div");
        row.className = "bb-step-buttons";
        [-1, 1].forEach(function (direction) {
          var button = document.createElement("button");
          button.type = "button";
          button.textContent = (direction < 0 ? "−" : "+") + spec[2];
          button.setAttribute("aria-label", (direction < 0 ? "Decrease " : "Increase ") + spec[1] + " by " + spec[2]);
          button.addEventListener("click", function () {
            slider.value = Math.max(Number(slider.min), Math.min(Number(slider.max), Number(slider.value) + direction * spec[2]));
            slider.dispatchEvent(new Event("input"));
          });
          row.appendChild(button);
        });
        slider.insertAdjacentElement("afterend", row);
      });

      function initThree() {
        if (threeSceneKit) return;
        threeSceneKit = createScene(threeCanvas, { THREE: THREE, alpha: true, fov: 45 });
        var renderer = threeSceneKit.renderer;
        var scene = threeSceneKit.scene;
        var camera = threeSceneKit.camera;

        camera.position.set(0, 4.2, 7.5);
        var controls = new OrbitControls(camera, threeCanvas);
        modelControls = controls;
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = false;
        controls.minDistance = 1.5;
        controls.maxDistance = 60;

        var amb = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(amb);
        var dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        var grid = new THREE.GridHelper(10, 10, 0x555d70, 0x383d49);
        grid.visible = appElement.classList.contains("bb-grid-visible");
        new MutationObserver(function () { grid.visible = appElement.classList.contains("bb-grid-visible"); }).observe(appElement, { attributes: true, attributeFilter: ["class"] });
        grid.position.y = -1.5;
        scene.add(grid);

        // Slicing Plane helper
        var planeGeo = new THREE.PlaneGeometry(5.2, 5.2);
        var planeMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide
        });
        slicePlaneMesh = new THREE.Mesh(planeGeo, planeMat);
        slicePlaneMesh.rotation.x = Math.PI / 2;
        slicePlaneMesh.position.y = 0;
        scene.add(slicePlaneMesh);

        SimKit.loop(function () {
          if (!curMode.startsWith("3d") || webglLost) return;
          controls.update();
          threeSceneKit.syncSize();
          renderer.render(scene, camera);
        });
      }

      /* 1. Cube Net Unfold */
      function buildCubeNet() {
        if (!threeSceneKit) return;
        var scene = threeSceneKit.scene;
        disposeCurrentModel(scene);

        current3DGroup = new THREE.Group();
        netHingeGroups = [];

        var size = 2.0;
        var faceGeo = new THREE.PlaneGeometry(size, size);
        var faceMat = new THREE.MeshStandardMaterial({
          color: 0x6da5ed,
          side: THREE.DoubleSide,
          transparent: true, opacity: 0.18,
          roughness: 0.3,
          metalness: 0.1
        });
        var edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });

        function createFace() {
          var mesh = new THREE.Mesh(faceGeo, faceMat);
          var edges = new THREE.LineSegments(new THREE.EdgesGeometry(faceGeo), edgeMat);
          mesh.add(edges);
          return mesh;
        }

        var bottomFace = createFace();
        bottomFace.rotation.x = -Math.PI / 2;
        bottomFace.position.y = -size / 2;
        current3DGroup.add(bottomFace);

        // 4 Hinges
        var frontHinge = new THREE.Group();
        frontHinge.position.set(0, -size / 2, size / 2);
        var frontFace = createFace();
        frontFace.position.set(0, size / 2, 0);
        frontHinge.add(frontFace);
        current3DGroup.add(frontHinge);
        netHingeGroups.push({ group: frontHinge, axis: "x", targetAng: Math.PI / 2 });

        var backHinge = new THREE.Group();
        backHinge.position.set(0, -size / 2, -size / 2);
        var backFace = createFace();
        backFace.position.set(0, size / 2, 0);
        backHinge.add(backFace);
        current3DGroup.add(backHinge);
        netHingeGroups.push({ group: backHinge, axis: "x", targetAng: -Math.PI / 2 });

        var leftHinge = new THREE.Group();
        leftHinge.position.set(-size / 2, -size / 2, 0);
        var leftFace = createFace();
        leftFace.rotation.y = Math.PI / 2;
        leftFace.position.set(0, size / 2, 0);
        leftHinge.add(leftFace);
        current3DGroup.add(leftHinge);
        netHingeGroups.push({ group: leftHinge, axis: "z", targetAng: Math.PI / 2 });

        var rightHinge = new THREE.Group();
        rightHinge.position.set(size / 2, -size / 2, 0);
        var rightFace = createFace();
        rightFace.rotation.y = -Math.PI / 2;
        rightFace.position.set(0, size / 2, 0);
        rightHinge.add(rightFace);

        var topHinge = new THREE.Group();
        topHinge.position.set(0, size, 0);
        topHinge.rotation.z = Math.PI / 2;
        var topFace = createFace();
        topFace.rotation.y = -Math.PI / 2;
        topFace.position.set(0, size / 2, 0);
        topHinge.add(topFace);
        rightHinge.add(topHinge);

        current3DGroup.add(rightHinge);
        netHingeGroups.push({ group: rightHinge, axis: "z", targetAng: -Math.PI / 2 });
        netHingeGroups.push({ group: topHinge, axis: "z", startAng: Math.PI / 2, targetAng: 0 });

        scene.add(current3DGroup);

        entityTitle.textContent = "🧊 3D Hexahedron (Cube Net)";
        entityBadge.textContent = "3D Polyhedron";
        lblM1.textContent = "Side Length s"; valM1.textContent = "2.0 cm";
        lblM2.textContent = "Surface Area 6s²"; valM2.textContent = "24.00 cm²";
        lblM3.textContent = "Volume V = s³"; valM3.textContent = "8.00 cm³";
        lblM4.textContent = "Euler: V - E + F"; valM4.textContent = "8 - 12 + 6 = 2";

        aiStepText.innerHTML = "<strong>Cube 2D Net Decomposition:</strong><br>A cube consists of 6 congruent square faces. Slide <em>Unfold Net</em> to flatten the faces into a 2D cross pattern. Surface Area $= 6 \\times (2^2) = 24.00\\text{ cm}^2$.";
        wrapUnfold.style.display = "block";
        wrapSlice.style.display = "block";
        wrapJoint.style.display = "none";
        deconstructPanel.style.display = "flex";
      }

      /* 2. Cylinder */
      function buildCylinder() {
        if (!threeSceneKit) return;
        var scene = threeSceneKit.scene;
        disposeCurrentModel(scene);

        current3DGroup = new THREE.Group();
        var r = 1.2, h = 2.4;
        current3DGroup.userData = { type: "cyl", r: r, h: h,
          unfold: makeDevelopable(THREE, current3DGroup, "cyl", { r: r, h: h }) };
        var sliceDisc = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: 0xef4444, side: THREE.DoubleSide }));
        sliceDisc.rotation.x = Math.PI / 2;
        current3DGroup.add(sliceDisc);
        current3DGroup.userData.sliceDiscMesh = sliceDisc;
        scene.add(current3DGroup);

        entityTitle.textContent = "🥫 Cylinder Deconstruction";
        entityBadge.textContent = "3D Solid";
        var sa = 2 * Math.PI * r * h + 2 * Math.PI * r * r;
        var vol = Math.PI * r * r * h;
        lblM1.textContent = "Radius r"; valM1.textContent = r.toFixed(1) + " cm";
        lblM2.textContent = "Height h"; valM2.textContent = h.toFixed(1) + " cm";
        lblM3.textContent = "Circumference 2πr"; valM3.textContent = (2*Math.PI*r).toFixed(2) + " cm";
        lblM4.textContent = "Total SA = 2πrh+2πr²"; valM4.textContent = sa.toFixed(2) + " cm²";

        aiStepText.innerHTML = "<strong>Cylinder Deconstruction:</strong><br>When cut along a vertical seam, the curved wall unrolls into a flat rectangle of height $h=" + h.toFixed(1) + "$ and length equal to circumference $2\\pi r=" + (2*Math.PI*r).toFixed(2) + "$.<br>Total Surface Area $= 2\\pi r h + 2(\\pi r^2) = " + sa.toFixed(2) + "\\text{ cm}^2$.";
        wrapUnfold.style.display = "block";
        wrapSlice.style.display = "block";
        wrapJoint.style.display = "none";
        deconstructPanel.style.display = "flex";
      }

      /* 3. Cone (Flat 2D Sector Net & Cross-Section Slicing) */
      function buildCone() {
        if (!threeSceneKit) return;
        var scene = threeSceneKit.scene;
        disposeCurrentModel(scene);

        current3DGroup = new THREE.Group();
        var r = 1.3, h = 2.4;
        var slant = Math.hypot(r, h);
        var sectorAngRad = 2 * Math.PI * (r / slant);
        var sectorAngDeg = sectorAngRad * (180 / Math.PI);

        var unfoldCone = makeDevelopable(THREE, current3DGroup, "cone", { r: r, h: h });

        // Cross section slice disc on cone
        var sliceDiscGeo = new THREE.CircleGeometry(r * 0.5, 36);
        var sliceDiscMat = new THREE.MeshStandardMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
        var sliceDiscMesh = new THREE.Mesh(sliceDiscGeo, sliceDiscMat);
        sliceDiscMesh.rotation.x = Math.PI / 2;
        sliceDiscMesh.position.y = 0;
        current3DGroup.add(sliceDiscMesh);

        current3DGroup.userData = {
          type: "cone",
          r: r, h: h, slant: slant,
          unfold: unfoldCone,
          sliceDiscMesh: sliceDiscMesh,
          sectorAngDeg: sectorAngDeg
        };

        scene.add(current3DGroup);

        entityTitle.textContent = "🍦 Cone: 2D Sector Net & Slices";
        entityBadge.textContent = "Conic Deconstruction";
        var sa = Math.PI * r * slant + Math.PI * r * r;
        lblM1.textContent = "Base Radius r / Slant L"; valM1.textContent = "r=" + r.toFixed(1) + " · L=" + slant.toFixed(2);
        lblM2.textContent = "Sector Angle θ"; valM2.textContent = sectorAngDeg.toFixed(1) + "°";
        lblM3.textContent = "Arc Length 2πr"; valM3.textContent = (2*Math.PI*r).toFixed(2) + " cm";
        lblM4.textContent = "Total SA = πrL + πr²"; valM4.textContent = sa.toFixed(2) + " cm²";

        aiStepText.innerHTML = "<strong>Cone Deconstruction into 2D Flat Slices &amp; Sector Net:</strong><br>1. <em>Flat Slices:</em> Move <em>Slicing Plane</em> to cut horizontal discs. Height y is measured from the centre: $r' = r(1/2 - y/h)$. Fold the net to 0% before slicing.<br>2. <em>2D Sector Net:</em> Move <em>Unfold Net</em> to 100% to unroll the lateral wall into a 2D circular sector of radius equal to slant height $L=" + slant.toFixed(2) + "$, arc length $2\\pi r=" + (2*Math.PI*r).toFixed(2) + "$, and sector angle $\\theta = 360^\\circ \\times (r/L) = " + sectorAngDeg.toFixed(1) + "^\\circ$!";
        wrapUnfold.style.display = "block";
        wrapSlice.style.display = "block";
        wrapJoint.style.display = "none";
        deconstructPanel.style.display = "flex";
      }

      /* 4. Sphere (Cross-Section Slicing & Archimedes 4πR² Deconstruction) */
      function buildSphere() {
        if (!threeSceneKit) return;
        var scene = threeSceneKit.scene;
        disposeCurrentModel(scene);

        current3DGroup = new THREE.Group();
        var R = 1.6;
        var sphereGeo = new THREE.SphereGeometry(R, 32, 24);
        var sphereMat = new THREE.MeshStandardMaterial({
          color: 0xa855f7,
          roughness: 0.3,
          transparent: true,
          opacity: 0.65
        });
        var sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
        sphereMesh.add(new THREE.LineSegments(new THREE.WireframeGeometry(sphereGeo), new THREE.LineBasicMaterial({ color: 0xd8b4fe, transparent: true, opacity: 0.35 })));
        current3DGroup.add(sphereMesh);

        // Slice disc inside sphere
        var sliceGeo = new THREE.CircleGeometry(R, 36);
        var sliceMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
        var sliceDiscMesh = new THREE.Mesh(sliceGeo, sliceMat);
        sliceDiscMesh.rotation.x = Math.PI / 2;
        sliceDiscMesh.position.y = 0;
        current3DGroup.add(sliceDiscMesh);

        current3DGroup.userData = { type: "sphere", R: R, sliceDiscMesh: sliceDiscMesh };
        scene.add(current3DGroup);

        entityTitle.textContent = "🔮 Sphere: Cross-Sections & Surface Area";
        entityBadge.textContent = "3D Curvature";
        var sa = 4 * Math.PI * R * R;
        var vol = (4/3) * Math.PI * R * R * R;
        lblM1.textContent = "Radius R"; valM1.textContent = R.toFixed(2) + " cm";
        lblM2.textContent = "Mid Slice Area πR²"; valM2.textContent = (Math.PI * R * R).toFixed(2) + " cm²";
        lblM3.textContent = "Surface Area 4πR²"; valM3.textContent = sa.toFixed(2) + " cm²";
        lblM4.textContent = "Volume ⁴⁄₃πR³"; valM4.textContent = vol.toFixed(2) + " cm³";

        aiStepText.innerHTML = "<strong>Sphere Slicing &amp; Cavalieri's Accumulation:</strong><br>A horizontal slice at height $y$ yields a disc of radius $r = \\sqrt{R^2 - y^2}$.<br>By Pythagoras: $y^2 + r^2 = R^2$.<br>Integrating circular discs from $-R$ to $+R$ gives Volume $V = \\int_{-R}^R \\pi(R^2 - y^2) dy = \\frac{4}{3}\\pi R^3$.<br>Archimedes proved the surface area equals exactly 4 flat great circles: $SA = 4\\times (\\pi R^2) = 4\\pi R^2 = " + sa.toFixed(2) + "\\text{ cm}^2$.";
        wrapUnfold.style.display = "none";
        wrapSlice.style.display = "block";
        wrapJoint.style.display = "none";
        deconstructPanel.style.display = "flex";
      }

      /* 5. Irregular Polygonal Prism & Accordion Net */
      function buildIrregularPrism() {
        if (!threeSceneKit) return;
        var scene = threeSceneKit.scene;
        disposeCurrentModel(scene);

        current3DGroup = new THREE.Group();
        // 5 irregular vertices in X-Z
        var polyPts = [
          { x: -1.3, z: -1.0 },
          { x: 1.1, z: -1.2 },
          { x: 1.6, z: 0.4 },
          { x: 0.2, z: 1.4 },
          { x: -1.2, z: 0.7 }
        ];

        var h = 2.2;
        var edgeLens = [];
        var perim = 0;
        for (var i = 0; i < polyPts.length; i++) {
          var nxt = polyPts[(i + 1) % polyPts.length];
          var el = Math.hypot(nxt.x - polyPts[i].x, nxt.z - polyPts[i].z);
          edgeLens.push(el);
          perim += el;
        }

        // Shoelace base area
        var baseArea = 0;
        for (var j = 0; j < polyPts.length; j++) {
          var k = (j + 1) % polyPts.length;
          baseArea += polyPts[j].x * polyPts[k].z - polyPts[k].x * polyPts[j].z;
        }
        baseArea = Math.abs(baseArea) / 2;

        current3DGroup.userData = {
          type: "prism", perim: perim, baseArea: baseArea, h: h,
          unfold: makeDevelopable(THREE, current3DGroup, "prism", { points: polyPts, h: h })
        };

        scene.add(current3DGroup);

        entityTitle.textContent = "⬡ Irregular Polygonal Prism";
        entityBadge.textContent = "3D Prism Net";
        var lsa = perim * h;
        var totalSA = 2 * baseArea + lsa;
        var vol = baseArea * h;
        lblM1.textContent = "Base Perimeter P"; valM1.textContent = perim.toFixed(2) + " cm";
        lblM2.textContent = "Lateral Area P·h"; valM2.textContent = lsa.toFixed(2) + " cm²";
        lblM3.textContent = "Base Area B"; valM3.textContent = baseArea.toFixed(2) + " cm²";
        lblM4.textContent = "Total SA = 2B+P·h"; valM4.textContent = totalSA.toFixed(2) + " cm²";

        aiStepText.innerHTML = "<strong>Irregular Prism Deconstruction:</strong><br>1. <em>Base Perimeter:</em> Sum of the 5 irregular edges $P = s_1+s_2+s_3+s_4+s_5 = " + perim.toFixed(2) + "\\text{ cm}$.<br>2. <em>Accordion Unroll:</em> When the lateral walls are cut along one vertical edge, they unfold into a continuous rectangular flat ribbon of length equal to perimeter $P=" + perim.toFixed(2) + "$ and height $h=" + h.toFixed(1) + "$.<br>Lateral Area $= P \\times h = " + lsa.toFixed(2) + "\\text{ cm}^2$.<br>Total Surface Area $= 2B + P\\cdot h = " + totalSA.toFixed(2) + "\\text{ cm}^2$.";
        wrapUnfold.style.display = "block";
        wrapSlice.style.display = "block";
        wrapJoint.style.display = "none";
        deconstructPanel.style.display = "flex";
      }

      /* 6. Conjoined Composite Solids (Cylinder + Cone) */
      function buildConjoined() {
        if (!threeSceneKit) return;
        var scene = threeSceneKit.scene;
        disposeCurrentModel(scene);

        current3DGroup = new THREE.Group();
        var r = 1.25;
        var hCyl = 2.0;
        var hCone = 1.8;
        var slant = Math.hypot(r, hCone);

        // Lower Cylinder
        var cylGeo = new THREE.CylinderGeometry(r, r, hCyl, 36);
        var cylMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35 });
        var cylMesh = new THREE.Mesh(cylGeo, cylMat);
        cylMesh.position.y = -hCyl / 2;
        cylMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(cylGeo), new THREE.LineBasicMaterial({ color: 0xffffff })));
        current3DGroup.add(cylMesh);

        // Upper Cone inside its own movable group
        conjoinedConeGroup = new THREE.Group();
        var coneGeo = new THREE.ConeGeometry(r, hCone, 36);
        var coneMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
        var coneMesh = new THREE.Mesh(coneGeo, coneMat);
        coneMesh.position.y = hCone / 2;
        coneMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(coneGeo), new THREE.LineBasicMaterial({ color: 0xffffff })));
        conjoinedConeGroup.add(coneMesh);

        // Red glowing joint discs at interface
        var jointGeo = new THREE.CircleGeometry(r, 36);
        var jointMat = new THREE.MeshStandardMaterial({ color: 0xef4444, side: THREE.DoubleSide });

        var jointCylTop = new THREE.Mesh(jointGeo, jointMat);
        jointCylTop.rotation.x = -Math.PI / 2;
        jointCylTop.position.y = 0.005;
        current3DGroup.add(jointCylTop);

        var jointConeBottom = new THREE.Mesh(jointGeo, jointMat);
        jointConeBottom.rotation.x = Math.PI / 2;
        jointConeBottom.position.y = -0.005;
        conjoinedConeGroup.add(jointConeBottom);

        conjoinedConeGroup.position.y = 0; // touching at y=0
        current3DGroup.add(conjoinedConeGroup);

        current3DGroup.userData = {
          type: "conjoined",
          r: r, hCyl: hCyl, hCone: hCone, slant: slant,
          conjoinedConeGroup: conjoinedConeGroup
        };

        scene.add(current3DGroup);

        entityTitle.textContent = "🚀 Conjoined Composite Solid";
        entityBadge.textContent = "Composite Solids";
        var jointArea = Math.PI * r * r;
        var saCylTotal = 2 * Math.PI * r * hCyl + 2 * jointArea;
        var saConeTotal = Math.PI * r * slant + jointArea;
        // Exposed SA: Cone Lateral + Cyl Lateral + Cyl Bottom
        var exposedSA = Math.PI * r * slant + 2 * Math.PI * r * hCyl + jointArea;
        var volTotal = Math.PI * r * r * hCyl + (1/3) * Math.PI * r * r * hCone;

        lblM1.textContent = "Shared Joint Area"; valM1.textContent = jointArea.toFixed(2) + " cm²";
        lblM2.textContent = "Exposed Surface Area"; valM2.textContent = exposedSA.toFixed(2) + " cm²";
        lblM3.textContent = "Cone Slant L"; valM3.textContent = slant.toFixed(2) + " cm";
        lblM4.textContent = "Total Volume"; valM4.textContent = volTotal.toFixed(2) + " cm³";

        aiStepText.innerHTML = "<strong>Conjoined Surface Area Deconstruction:</strong><br>When the cone sits atop the cylinder, the shared circular face of area $A_{\\text{joint}} = \\pi r^2 = " + jointArea.toFixed(2) + "\\text{ cm}^2$ is hidden inside and <strong>not exposed</strong>!<br>Slide <em>Separate Conjoined Joint</em> to pull them apart.<br><strong>Golden Rule:</strong> $SA_{\\text{exposed}} = SA_{\\text{cylinder}} + SA_{\\text{cone}} - 2 \\cdot A_{\\text{joint}}$<br>$= (" + saCylTotal.toFixed(2) + " + " + saConeTotal.toFixed(2) + ") - 2(" + jointArea.toFixed(2) + ") = " + exposedSA.toFixed(2) + "\\text{ cm}^2$.";
        wrapUnfold.style.display = "none";
        wrapSlice.style.display = "block";
        wrapJoint.style.display = "block";
        deconstructPanel.style.display = "flex";
      }

      function switchTo3D(shape) {
        try { initThree(); }
        catch (_) {
          deviceMessage("3D is unavailable in this browser. You can still use Shape Sketch, Triangle and Circle. Try an updated browser or the board’s connected computer for 3D.");
          return;
        }
        if (!webglLost) deviceMessage("");
        curMode = "3d-" + shape;
        active3DShape = shape;
        unfoldSlider.value = 0; unfoldPct.textContent = "0%";
        sliceSlider.value = 0; sliceH.textContent = "0.0";
        jointSlider.value = 0; jointPct.textContent = "0%";
        if (slicePlaneMesh) slicePlaneMesh.visible = ["cyl", "cone", "sphere"].includes(shape);
        updateToolbarButtons();
        draw2D();

        if (shape === "cube") buildCubeNet();
        else if (shape === "cyl") buildCylinder();
        else if (shape === "cone") buildCone();
        else if (shape === "sphere") buildSphere();
        else if (shape === "prism") buildIrregularPrism();
        else if (shape === "conjoined") buildConjoined();
        wrapSlice.style.display = ["cyl", "cone", "sphere"].includes(shape) ? "block" : "none";
        sliceSlider.dispatchEvent(new Event("input"));
        frameModel();
        if (boardStudio) boardStudio.refresh();
      }

      /* Unfold net slider event */
      unfoldSlider.addEventListener("input", function () {
        var val = parseFloat(unfoldSlider.value);
        var t = val / 100;
        unfoldPct.textContent = val + "%";

        if (active3DShape === "cube") {
          netHingeGroups.forEach(function (h) {
            if (h.axis === "x") h.group.rotation.x = (h.startAng || 0) * (1 - t) + h.targetAng * t;
            if (h.axis === "z") h.group.rotation.z = (h.startAng || 0) * (1 - t) + h.targetAng * t;
          });
        } else if (current3DGroup && current3DGroup.userData.unfold) {
          current3DGroup.userData.unfold(t);
        }
        if (current3DGroup && active3DShape === "cone" && t > 0) {
          lblM2.textContent = "Sector Angle θ";
          valM2.textContent = current3DGroup.userData.sectorAngDeg.toFixed(1) + "°";
        } else if (current3DGroup && active3DShape === "cyl" && t > 0) {
          lblM3.textContent = "Net width 2πr";
          valM3.textContent = (2 * Math.PI * current3DGroup.userData.r).toFixed(2) + " cm";
        }
        frameModel();
        // Cross-sections describe the closed solid; fold it before slicing.
        var folded = t === 0;
        wrapSlice.style.display = folded && ["cyl", "cone"].includes(active3DShape) ? "block" : "none";
        if (slicePlaneMesh) slicePlaneMesh.visible = folded && ["cyl", "cone"].includes(active3DShape);
        if (current3DGroup && current3DGroup.userData.sliceDiscMesh) current3DGroup.userData.sliceDiscMesh.visible = folded;
        if (folded && ["cyl", "cone"].includes(active3DShape)) sliceSlider.dispatchEvent(new Event("input"));

      });

      /* Slicing plane slider event */
      sliceSlider.addEventListener("input", function () {
        var val = parseFloat(sliceSlider.value) / 100;
        var u = current3DGroup ? current3DGroup.userData : {};
        var extent = u.type === "sphere" ? u.R : (u.h || 3) / 2;
        var planeY = val * extent;
        if (slicePlaneMesh) {
          slicePlaneMesh.position.y = planeY;
        }
        sliceH.textContent = planeY > 0 ? "+" + planeY.toFixed(1) : planeY.toFixed(1);

        if (current3DGroup && current3DGroup.userData) {
          var u = current3DGroup.userData;
          if (u.type === "sphere") {
            var R = u.R;
            var discR = Math.sqrt(Math.max(0, R*R - planeY*planeY));
            u.sliceDiscMesh.position.y = planeY;
            u.sliceDiscMesh.scale.set(discR / R, discR / R, discR / R);
            var discArea = Math.PI * discR * discR;
            valM2.textContent = discArea.toFixed(2) + " cm²";
            lblM2.textContent = "Slice Area πr² (r=" + discR.toFixed(1) + ")";
          } else if (u.type === "cyl") {
            u.sliceDiscMesh.position.y = planeY;
            lblM3.textContent = "Slice area πr²";
            valM3.textContent = (Math.PI * u.r * u.r).toFixed(2) + " cm²";
          } else if (u.type === "cone") {
            var rTop = u.r;
            var h = u.h;
            // cone runs y from -h/2 to +h/2
            var coneRatio = Math.max(0, Math.min(1, (h/2 - planeY) / h));
            var sliceR = rTop * coneRatio;
            lblM2.textContent = "Slice radius / area";
            valM2.textContent = sliceR.toFixed(2) + " cm / " + (Math.PI * sliceR * sliceR).toFixed(2) + " cm²";
            u.sliceDiscMesh.position.y = planeY;
            u.sliceDiscMesh.scale.set(sliceR / (rTop * 0.5), sliceR / (rTop * 0.5), sliceR / (rTop * 0.5));
          }
        }
      });

      /* Explode Joint Slider */
      jointSlider.addEventListener("input", function () {
        var val = parseFloat(jointSlider.value);
        jointPct.textContent = val + "%";
        if (conjoinedConeGroup) {
          conjoinedConeGroup.position.y = (val / 100) * 1.8;
        }
      });

      /* Toolbar Buttons */
      function updateToolbarButtons() {
        if (isAirPenDown) resetAirInteraction(false);
        cancelPointerStroke();
        $("bb-view-controls").hidden = !curMode.startsWith("3d");
        document.querySelectorAll("#smart-blackboard-app .bb-tool-btn").forEach(function (btn) {
          btn.classList.remove("active");
        });
        if (curMode === "draw") $("btn-mode-draw").classList.add("active");
        else if (curMode === "triangle") $("btn-mode-triangle").classList.add("active");
        else if (curMode === "circle") $("btn-mode-circle").classList.add("active");
        else if (curMode === "3d-cube") $("btn-mode-3d-cube").classList.add("active");
        else if (curMode === "3d-cyl") $("btn-mode-3d-cyl").classList.add("active");
        else if (curMode === "3d-cone") $("btn-mode-3d-cone").classList.add("active");
        else if (curMode === "3d-sphere") $("btn-mode-3d-sphere").classList.add("active");
        else if (curMode === "3d-prism") $("btn-mode-3d-prism").classList.add("active");
        else if (curMode === "3d-conjoined") $("btn-mode-3d-conjoined").classList.add("active");
        document.querySelectorAll('#smart-blackboard-app .bb-tool-btn[id^="btn-mode-"]').forEach(function (btn) {
          btn.setAttribute("aria-pressed", btn.classList.contains("active") ? "true" : "false");
        });
        if (curMode.startsWith("3d")) {
          threeCanvas.setAttribute("aria-label", "3D " + curMode.slice(3) + " model. Use the sliders and the measurements panel to explore it.");
          chalkCanvas.setAttribute("aria-label", "Blackboard hidden while a 3D solid is shown.");
        } else {
          chalkCanvas.setAttribute("aria-label", "Interactive math blackboard. Draw rough shapes or drag geometric points.");
        }
      }

      $("btn-mode-draw").addEventListener("click", function () {
        curMode = "draw";
        updateToolbarButtons();
        draw2D();
      });

      $("btn-mode-triangle").addEventListener("click", function () {
        curMode = "triangle";
        geom2D.type = "triangle";
        updateToolbarButtons();
        draw2D();
      });

      $("btn-mode-circle").addEventListener("click", function () {
        curMode = "circle";
        geom2D.type = "circle";
        updateToolbarButtons();
        draw2D();
      });

      $("btn-mode-3d-cube").addEventListener("click", function () { switchTo3D("cube"); });
      $("btn-mode-3d-cyl").addEventListener("click", function () { switchTo3D("cyl"); });
      $("btn-mode-3d-cone").addEventListener("click", function () { switchTo3D("cone"); });
      $("btn-mode-3d-sphere").addEventListener("click", function () { switchTo3D("sphere"); });
      $("btn-mode-3d-prism").addEventListener("click", function () { switchTo3D("prism"); });
      $("btn-mode-3d-conjoined").addEventListener("click", function () { switchTo3D("conjoined"); });

      // Chalk colors
      document.querySelectorAll(".bb-color-dot").forEach(function (dot) {
        dot.addEventListener("click", function () {
          document.querySelectorAll(".bb-color-dot").forEach(function (d) { d.classList.remove("active"); });
          dot.classList.add("active");
          document.querySelectorAll(".bb-color-dot").forEach(function (d) { d.setAttribute("aria-pressed", d === dot ? "true" : "false"); });
          curColor = dot.dataset.color;
        });
      });

      // Clear button
      $("btn-clear").addEventListener("click", function () {
        if (airInk.length) { saveAirInkUndo(); airInk = []; }
        chalkCtx.clearRect(0, 0, chalkCanvas.width, chalkCanvas.height);
        currentStroke = [];
        recentStrokes = [];
        if (multiStrokeTimer) { clearTimeout(multiStrokeTimer); multiStrokeTimer = null; }
        curMode = "draw";
        updateToolbarButtons();
        draw2D();
        showToast("🧹 Blackboard Cleared");
      });

      /* ── Undo history (toolbar button, Ctrl+Z, 👎 gesture) ── */
      var undoStack = [];
      function snapshotState() {
        undoStack.push({
          mode: curMode,
          type: geom2D.type,
          pts: geom2D.pts.map(function (p) { return { x: p.x, y: p.y, label: p.label }; }),
          circle: { cx: geom2D.circle.cx, cy: geom2D.circle.cy, r: geom2D.circle.r }
        });
        if (undoStack.length > 40) undoStack.shift();
      }
      function undoLast() {
        if (recentStrokes.length) {
          recentStrokes.pop();
          draw2D();
          showToast("↩️ Removed last stroke");
          return true;
        }
        if (!undoStack.length) { showToast("Nothing to undo"); return false; }
        var st = undoStack.pop();
        geom2D.type = st.type; geom2D.pts = st.pts; geom2D.circle = st.circle;
        curMode = st.mode;
        updateToolbarButtons();
        draw2D();
        showToast("↩️ Undone");
        return true;
      }
      $("btn-undo").addEventListener("click", undoLast);

      /* ── Gesture command actions ── */
      var MODE_ORDER = ["draw", "triangle", "circle", "3d-cube", "3d-cyl", "3d-cone", "3d-sphere", "3d-prism", "3d-conjoined"];
      function cycleMode(dir) {
        var i = MODE_ORDER.indexOf(curMode);
        if (i < 0) i = 0;
        var next = MODE_ORDER[(i + dir + MODE_ORDER.length) % MODE_ORDER.length];
        var btn = $("btn-mode-" + next);
        if (btn) { btn.click(); showToast("🖐️ Tool: " + btn.textContent.trim()); }
      }
      function cycleUnknownOrUnfold() {
        if (curMode.startsWith("3d")) {
          if (wrapUnfold && wrapUnfold.style.display !== "none") {
            var target = Number(unfoldSlider.value) > 50 ? 0 : 100;
            unfoldSlider.value = target;
            unfoldSlider.dispatchEvent(new Event("input"));
            showToast(target === 100 ? "📂 Net unfolded" : "📦 Net folded");
          } else {
            showToast("This solid has no net to unfold");
          }
          return;
        }
        if (curMode === "triangle" && geom2D.type === "triangle") {
          var opts = Array.prototype.map.call(selUnknown.options, function (o) { return o.value; });
          var ni = (opts.indexOf(selUnknown.value) + 1) % opts.length;
          selUnknown.value = opts[ni];
          selUnknown.dispatchEvent(new Event("change"));
          showToast("❓ Unknown: " + selUnknown.options[ni].text);
          return;
        }
        showToast("Switch to Triangle or a 3D solid to use 🤟");
      }
      function runAirCommand(name) {
        if (name === "thumbsUp") btnVoice.click();
        else if (name === "thumbsDown") {
          if (["ink", "erase"].includes($("air-tool").value)) $("air-undo-ink").click();
          else undoLast();
        }
        else if (name === "three") cycleUnknownOrUnfold();
        else if (name === "swipeRight") cycleMode(1);
        else if (name === "swipeLeft") cycleMode(-1);
      }

      /* ── Air Chalk: Real-Time Camera & 3D Hand Gesture Tracking Engine ── */
      var isAirActive = false;
      var airGestureMode = "auto"; // "auto" (pinch OR index-point), "hold" (pinch only), "point" (index point only), "tap" (pinch tap latch)
      var isAirPenDown = false;
      var airMediaStream = null;
      var airHandsInstance = null;
      var airRafId = null;
      var isProcessingFrame = false;
      var smoothX = null, smoothY = null;
      var air3DAnchor = null;
      var wasPinching = false;
      var pinchTapCooldown = 0;
      var airDraggingPoint = null;

      var airPaused = false, airRequireRelease = false;
      var airInk = [], airInkUndo = [], airInkStroke = null;
      var airBounds = { left: 0.13, top: 0.13, right: 0.87, bottom: 0.87 };
      var airRawPoint = null, airCalibrationFirst = null, airCalibrating = false;
      var airLastSeen = 0, airLastSendAt = 0;
      function airCoach(message) {
        if ($("air-coach").textContent !== message) $("air-coach").textContent = message;
      }
      function resetAirInteraction(commit) {
        if (commit && isAirPenDown) endAirStroke();
        else {
          if (isAirPenDown && isDrawing) { isDrawing = false; currentStroke = []; }
          airInkStroke = null;
          airDraggingPoint = null;
          air3DAnchor = null;
          if (activePointerId === null) draw2D();
        }
        isAirPenDown = false;
        airRequireRelease = true;
        wasPinching = false;
        penDownConfirmCount = 0; penUpGraceCount = 0;
        poseStab.reset(); cmdDetector.reset(); swipeDetector.reset();
        cmdRing.progress = 0;
      }
      function saveAirInkUndo() {
        airInkUndo.push(airInk.slice());
        if (airInkUndo.length > 20) airInkUndo.shift();
      }
      function eraseAirInk(x, y) {
        var remaining = airInk.filter(function (stroke) { return !strokeNear(stroke, x, y, 24); });
        if (remaining.length !== airInk.length) { airInk = remaining; draw2D(); }
      }
      $("air-pause").addEventListener("click", function () {
        resetAirInteraction(true);
        airPaused = !airPaused;
        this.setAttribute("aria-pressed", String(airPaused));
        this.textContent = airPaused ? "Resume gestures" : "Pause gestures";
        airCoach(airPaused ? "Gestures paused. The camera stays on; you can reposition without drawing." : "Ready. Open your hand once before starting a new gesture.");
      });
      $("air-tool").addEventListener("change", function () { resetAirInteraction(true); airCoach("Tool changed. Open your hand, then pinch or point to begin."); });
      $("air-3d-action").addEventListener("change", function () { resetAirInteraction(true); airCoach("3D action changed. Open your hand before engaging it."); });
      $("air-undo-ink").addEventListener("click", function () {
        resetAirInteraction(false);
        if (airInkUndo.length) { airInk = airInkUndo.pop(); draw2D(); airCoach("Last ink change undone."); }
        else airCoach("No ink change to undo.");
      });
      $("air-clear-ink").addEventListener("click", function () {
        resetAirInteraction(false);
        if (airInk.length) { saveAirInkUndo(); airInk = []; draw2D(); }
        airCoach("Ink cleared. Undo ink restores it. Geometry is unchanged.");
      });
      function updateAirSettings() {
        $("air-width-value").textContent = $("air-ink-width").value + " px";
        var smoothing = Number($("air-smoothing").value);
        $("air-smoothing-value").textContent = smoothing < 35 ? "Responsive" : smoothing > 65 ? "Steady" : "Balanced";
        $("air-sensitivity-value").textContent = (Number($("air-sensitivity").value) / 100).toFixed(1) + "×";
        var pinch = Number($("air-pinch").value);
        $("air-pinch-value").textContent = pinch < 32 ? "Firm" : pinch > 38 ? "Light" : "Normal";
      }
      ["air-ink-width", "air-smoothing", "air-sensitivity", "air-pinch"].forEach(function (id) { $(id).addEventListener("input", updateAirSettings); });
      $("air-calibrate").addEventListener("click", function () {
        if (!isAirActive) { airCoach("Start the camera before calibrating reach."); return; }
        resetAirInteraction(true);
        airCalibrationFirst = null; airCalibrating = true;
        $("air-calibrate-capture").disabled = false;
        $("air-calibration-help").textContent = "Move your pointing hand to the comfortable upper-left corner of its camera reach, then tap Capture corner with your other hand. Drawing is suspended.";
      });
      $("air-calibrate-capture").addEventListener("click", function () {
        if (!airRawPoint || performance.now() - airLastSeen > 500) { airCoach("Show your whole hand clearly before capturing a corner."); return; }
        if (!airCalibrationFirst) {
          airCalibrationFirst = { x: airRawPoint.x, y: airRawPoint.y };
          $("air-calibration-help").textContent = "Now move the same hand to the comfortable lower-right corner and tap Capture corner again.";
        } else {
          var bounds = calibrationBounds(airCalibrationFirst, airRawPoint);
          if (!bounds) { airCoach("The second corner must be farther right and lower. Leave at least one fifth of the camera width and height between corners."); return; }
          airBounds = bounds; airCalibrating = false; airCalibrationFirst = null;
          this.disabled = true; smoothX = smoothY = null; lastFilterTimestamp = 0;
          $("air-calibration-help").textContent = "Reach calibrated. Your chosen camera rectangle now fills the board. Reset tracking restores the default reach.";
          airCoach("Calibration complete. Open your hand before drawing.");
        }
      });
      $("air-reset-settings").addEventListener("click", function () {
        resetAirInteraction(true);
        airBounds = { left: 0.13, top: 0.13, right: 0.87, bottom: 0.87 };
        airCalibrating = false; airCalibrationFirst = null;
        $("air-calibrate-capture").disabled = true;
        $("air-smoothing").value = 50; $("air-sensitivity").value = 100; $("air-pinch").value = 35;
        smoothX = smoothY = null; lastFilterTimestamp = 0;
        updateAirSettings();
        $("air-calibration-help").textContent = "Default reach restored. Calibrate again if the board corners are hard to reach.";
        airCoach("Tracking settings reset. Ink and geometry are unchanged.");
      });
      document.addEventListener("visibilitychange", function () {
        if (document.hidden && isAirActive) {
          resetAirInteraction(false); airPaused = true;
          $("air-pause").setAttribute("aria-pressed", "true"); $("air-pause").textContent = "Resume gestures";
          airCoach("Gestures paused after leaving the page. Resume when you are ready.");
        }
      });

      /* Temporal filtering, One-Euro state & lost-frame resilience */
      var smoothedPinchRatio = 0.55;
      var penDownConfirmCount = 0;
      var penUpGraceCount = 0;
      var handLostFrames = 0;
      var lastFilterTimestamp = 0;
      var dxFilter = 0, dyFilter = 0;
      var lastActiveGestureType = "hover"; // "pinch", "point", "laser", "fist", "hover"
      var poseStab = new PoseStabilizer({ window: 6, minVotes: 4 });
      var cmdDetector = new CommandDetector();
      var swipeDetector = new SwipeDetector();
      var chkAirCommands = $("chk-air-commands");
      var cmdRing = { progress: 0, label: "", fireAt: 0 };

      function oneEuroAlpha(cutoff, dt) {
        var tau = 1.0 / (2 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / Math.max(0.004, dt));
      }

      function filterAirCoord(targetX, targetY, nowMs) {
        if (smoothX === null || smoothY === null || !lastFilterTimestamp) {
          smoothX = targetX;
          smoothY = targetY;
          dxFilter = 0;
          dyFilter = 0;
          lastFilterTimestamp = nowMs;
          return { x: smoothX, y: smoothY };
        }
        var dt = Math.min(0.12, Math.max(0.008, (nowMs - lastFilterTimestamp) / 1000));
        lastFilterTimestamp = nowMs;

        // 1€ (One-Euro) adaptive velocity filter: rock-steady when still, zero-lag when sweeping
        var dCutoff = 1.0;
        var smoothingScale = 1.8 - Number($("air-smoothing").value) / 100 * 1.4;
        var minCutoff = (isAirPenDown ? 1.25 : 1.05) * smoothingScale;
        var beta = (isAirPenDown ? 0.048 : 0.038) * smoothingScale;

        var rawDx = (targetX - smoothX) / dt;
        var rawDy = (targetY - smoothY) / dt;
        var aDeriv = oneEuroAlpha(dCutoff, dt);
        dxFilter = dxFilter + aDeriv * (rawDx - dxFilter);
        dyFilter = dyFilter + aDeriv * (rawDy - dyFilter);

        var speed = Math.hypot(dxFilter, dyFilter);
        var cutoff = minCutoff + beta * (speed / 45);
        var aPos = oneEuroAlpha(cutoff, dt);

        smoothX = smoothX + aPos * (targetX - smoothX);
        smoothY = smoothY + aPos * (targetY - smoothY);
        return { x: smoothX, y: smoothY };
      }

      /* Aspect-corrected 2D + damped Z distance so monocular Z-jitter doesn't break pinches */
      function distHand(p1, p2, aspect, zWeight) {
        var ax = (p1.x - p2.x) * (aspect || 1.333);
        var ay = p1.y - p2.y;
        var az = ((p1.z || 0) - (p2.z || 0)) * (zWeight !== undefined ? zWeight : 0.18);
        return Math.hypot(ax, ay, az);
      }

      /* Rotation- & tilt-invariant hand scale combining palm length and knuckle span */
      function computeHandScale(lm, aspect) {
        var dWristMiddle = distHand(lm[0], lm[9], aspect, 0.12);
        var dWristIndex = distHand(lm[0], lm[5], aspect, 0.12);
        var dWristPinky = distHand(lm[0], lm[17], aspect, 0.12);
        var dKnuckleSpan = distHand(lm[5], lm[17], aspect, 0.12) * 1.22;
        return Math.max(0.07, dWristMiddle, dWristIndex, dWristPinky * 0.95, dKnuckleSpan);
      }

      /* Joint curl & extension analyzer (orientation-independent) */
      function analyzeFingerPose(lm, hScale, aspect, hp) {
        var wrist = lm[0];
        function fingerExtended(mcpIdx, pipIdx, dipIdx, tipIdx) {
          var dTipWrist = distHand(lm[tipIdx], wrist, aspect, 0.1);
          var dPipWrist = distHand(lm[pipIdx], wrist, aspect, 0.1);
          var dMcpWrist = distHand(lm[mcpIdx], wrist, aspect, 0.1);
          // Vector angle at PIP joint (mcp -> pip -> tip)
          var v1x = (lm[mcpIdx].x - lm[pipIdx].x) * aspect;
          var v1y = lm[mcpIdx].y - lm[pipIdx].y;
          var v2x = (lm[tipIdx].x - lm[pipIdx].x) * aspect;
          var v2y = lm[tipIdx].y - lm[pipIdx].y;
          var cosPip = (v1x * v2x + v1y * v2y) / Math.max(1e-5, Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y));
          // Extended if tip is significantly further from wrist than PIP and PIP angle is open (> ~128°, cos < -0.60)
          var extRatio = (dTipWrist - dMcpWrist) / Math.max(0.03, hScale);
          return {
            extended: dTipWrist > dPipWrist * 1.10 && cosPip < -0.58 && extRatio > 0.36,
            curled: dTipWrist < dPipWrist * 1.05 || cosPip > -0.35,
            ratio: extRatio,
            cosPip: cosPip
          };
        }

        var index = fingerExtended(5, 6, 7, 8);
        var middle = fingerExtended(9, 10, 11, 12);
        var ring = fingerExtended(13, 14, 15, 16);
        var pinky = fingerExtended(17, 18, 19, 20);

        // Prefer the joint-angle (3D when world landmarks exist) classification from the gesture engine:
        // it ignores camera tilt, depth and hand rotation, which fooled the 2D distance heuristics.
        if (hp) {
          [["index", index], ["middle", middle], ["ring", ring], ["pinky", pinky]].forEach(function (pair) {
            var fs = hp.fingers[pair[0]];
            pair[1].extended = fs.extended;
            pair[1].curled = fs.curled;
          });
        }

        // Multi-point pinch distance: accounts for tip-to-tip (4-8) AND side-pinch (4-7 or 3-8)
        var dTipToTip = distHand(lm[4], lm[8], aspect, 0.16);
        var dThumbToDip = distHand(lm[4], lm[7], aspect, 0.16) * 1.06;
        var dIpToTip = distHand(lm[3], lm[8], aspect, 0.16) * 1.08;
        var rawPinchDist = Math.min(dTipToTip, dThumbToDip, dIpToTip);
        var rawPinchRatio = rawPinchDist / hScale;

        // Closed-fist guard: all 4 fingers curled into palm and index tip close to palm center (lm[9])
        var indexToPalm = distHand(lm[8], lm[9], aspect, 0.1) / hScale;
        var isClosedFist = index.curled && middle.curled && ring.curled && pinky.curled && indexToPalm < 0.44 && dTipToTip / hScale > 0.25;

        // Peace / Two-finger Laser Hover: Index & Middle both extended while Ring & Pinky are curled
        var dIndexMiddleTips = distHand(lm[8], lm[12], aspect, 0.1) / hScale;
        var isPeaceHover = index.extended && middle.extended && ring.curled && pinky.curled && dIndexMiddleTips > 0.22 && rawPinchRatio > 0.34;

        // Index Point gesture: Index clearly extended, Middle + Ring + Pinky curled
        var isIndexPointing = index.extended && middle.curled && ring.curled && pinky.curled && !isClosedFist;

        return {
          rawPinchRatio: rawPinchRatio,
          index: index,
          middle: middle,
          ring: ring,
          pinky: pinky,
          isClosedFist: isClosedFist,
          isPeaceHover: isPeaceHover,
          isIndexPointing: isIndexPointing
        };
      }

      function loadMediaPipeHands() {
        if (window.Hands) return Promise.resolve(window.Hands);
        return new Promise(function (resolve, reject) {
          var s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js";
          s.crossOrigin = "anonymous";
          s.onload = function () {
            if (window.Hands) resolve(window.Hands);
            else reject(new Error("MediaPipe Hands loaded but window.Hands is missing"));
          };
          s.onerror = function () {
            reject(new Error("Failed to load MediaPipe Hands computer vision library"));
          };
          document.head.appendChild(s);
        });
      }

      async function startAirChalk() {
        if (isAirActive) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showToast("⚠️ Webcam is not supported in this browser environment.");
          return;
        }

        if (btnAirChalk) {
          btnAirChalk.textContent = "⏳ Starting Camera...";
          btnAirChalk.disabled = true;
        }

        try {
          showToast("📹 Requesting camera access...");
          var stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 30 },
              facingMode: "user"
            },
            audio: false
          });
          airMediaStream = stream;
          if (airVideo) {
            airVideo.srcObject = stream;
            await airVideo.play();
          }

          showToast("🤖 Loading AI Hand Tracking model...");
          await loadMediaPipeHands();

          airHandsInstance = new window.Hands({
            locateFile: function (file) {
              return "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/" + file;
            }
          });

          airHandsInstance.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.62,
            minTrackingConfidence: 0.65
          });

          airHandsInstance.onResults(onAirHandResults);

          isAirActive = true;
          airRequireRelease = true; airPaused = false;
          $("air-pause").setAttribute("aria-pressed", "false"); $("air-pause").textContent = "Pause gestures";
          airCoach("Camera ready. Open your hand, then engage your selected pen gesture. Use Pause gestures to reposition.");
          smoothedPinchRatio = 0.55;
          penDownConfirmCount = 0;
          penUpGraceCount = 0;
          handLostFrames = 0;

          if (btnAirChalk) {
            btnAirChalk.textContent = "📹 Air Chalk ON";
            btnAirChalk.classList.add("air-active"); btnAirChalk.setAttribute("aria-pressed", "true");
            btnAirChalk.disabled = false;
          }
          if (airPip) airPip.style.display = "flex";
          resizeChalk();
          showToast("✨ Air Chalk Ready! Pinch thumb+index or point index finger to draw.");

          runAirLoop();
        } catch (err) {
          console.error("Air chalk start error:", err);
          stopAirChalk();
          if (btnAirChalk) {
            btnAirChalk.disabled = false;
            btnAirChalk.textContent = "📹 Air Chalk";
            btnAirChalk.classList.remove("air-active"); btnAirChalk.setAttribute("aria-pressed", "false");
          }
          var msg = err.name === "NotAllowedError" ? "Camera permission denied" : (err.message || "Failed to initialize");
          airCoach("Air Chalk could not start: " + msg + ". Check camera access and your connection, then try again. Touch and mouse tools remain available.");
          showToast("⚠️ Air Chalk: " + msg);
        }
      }

      function stopAirChalk() {
        resetAirInteraction(true);
        isAirActive = false;
        airCalibrating = false; airCalibrationFirst = null; airRawPoint = null;
        $("air-calibrate-capture").disabled = true;
        airCoach("Camera off. Your ink and geometry remain on the board.");
        if (airMediaStream) {
          try {
            airMediaStream.getTracks().forEach(function (t) { t.stop(); });
          } catch (e) {}
          airMediaStream = null;
        }
        if (airRafId) {
          cancelAnimationFrame(airRafId);
          airRafId = null;
        }
        if (airHandsInstance && typeof airHandsInstance.close === "function") {
          try { airHandsInstance.close(); } catch (e) {}
        }
        airHandsInstance = null;
        isProcessingFrame = false;

        if (isAirPenDown) {
          endAirStroke();
          isAirPenDown = false;
        }
        wasPinching = false;
        airDraggingPoint = null;
        air3DAnchor = null;
        smoothX = null;
        smoothY = null;
        penDownConfirmCount = 0;
        penUpGraceCount = 0;
        handLostFrames = 0;
        poseStab.reset(); cmdDetector.reset(); swipeDetector.reset();
        cmdRing.progress = 0;

        if (airCursorCtx && airCursorCanvas) {
          airCursorCtx.clearRect(0, 0, airCursorCanvas.width, airCursorCanvas.height);
        }
        if (airPip) airPip.style.display = "none";
        if (btnAirChalk) {
          btnAirChalk.textContent = "📹 Air Chalk";
          btnAirChalk.classList.remove("air-active"); btnAirChalk.setAttribute("aria-pressed", "false");
          btnAirChalk.disabled = false;
        }
      }

      function runAirLoop() {
        if (!isAirActive) return;
        var now = performance.now();
        if (!document.hidden && now - airLastSendAt >= 1000 / 24 && airVideo && airVideo.readyState >= 2 && !isProcessingFrame && airHandsInstance) {
          airLastSendAt = now;
          isProcessingFrame = true;
          airHandsInstance.send({ image: airVideo }).catch(function (e) {
            resetAirInteraction(false);
            airCoach("Tracking interrupted. Open your hand to resume, or restart Air Chalk if the camera has stopped.");
            console.warn("Hand tracking frame send error:", e);
          }).finally(function () {
            isProcessingFrame = false;
          });
        }
        airRafId = requestAnimationFrame(runAirLoop);
      }

      function onAirHandResults(results) {
        if (!isAirActive) return;

        var rect = stageWrap.getBoundingClientRect();
        var cw = rect.width, ch = rect.height;

        // Render PiP camera preview with skeleton
        drawAirPip(results);

        // Clear cursor canvas
        if (airCursorCtx && airCursorCanvas) {
          airCursorCtx.clearRect(0, 0, cw, ch);
        }

        var handScore = (results.multiHandedness && results.multiHandedness[0]) ? results.multiHandedness[0].score : null;
        var quality = (results.multiHandLandmarks && results.multiHandLandmarks.length)
          ? assessFrame(results.multiHandLandmarks[0], handScore) : { ok: false, reason: "none" };

        if (!quality.ok) {
          handLostFrames++;
          // Grace period: survive brief 1-5 frame motion-blur dropouts without severing an active stroke
          if (performance.now() - airLastSeen < 180 && smoothX !== null && smoothY !== null) {
            if (airStatus) airStatus.textContent = "⚡ Holding track...";
            renderAirCursor(smoothX, smoothY, isAirPenDown, smoothedPinchRatio, true, lastActiveGestureType, null);
            return;
          }
          if (airStatus) airStatus.textContent = "Searching hand...";
          if (airPinchMeter) {
            airPinchMeter.style.width = "0%";
            airPinchMeter.classList.remove("active");
          }
          if (isAirPenDown || !airRequireRelease) resetAirInteraction(false);
          airCoach("Hand not tracked. Show your full hand in good light, then open it before resuming. Partial strokes are discarded.");
          penDownConfirmCount = 0;
          penUpGraceCount = 0;
          smoothX = null;
          smoothY = null;
          poseStab.reset(); cmdDetector.reset(); swipeDetector.reset();
          cmdRing.progress = 0;
          if (quality.reason === "lowScore" && airStatus) airStatus.textContent = "⚠️ " + quality.hint;
          return;
        }

        handLostFrames = 0;
        airLastSeen = performance.now();
        var lm = results.multiHandLandmarks[0];
        var thumbTip = lm[4];
        var indexTip = lm[8];
        var aspect = (airVideo && airVideo.videoWidth && airVideo.videoHeight)
          ? (airVideo.videoWidth / airVideo.videoHeight)
          : (4 / 3);

        var hScale = computeHandScale(lm, aspect);
        var worldLm = (results.multiHandWorldLandmarks && results.multiHandWorldLandmarks[0]) || null;
        var handPose = analyzeHand(lm, worldLm, aspect);
        var pose = analyzeFingerPose(lm, hScale, aspect, handPose);

        // EMA smooth pinch ratio to reject single-frame landmark jitter
        smoothedPinchRatio = smoothedPinchRatio * 0.42 + pose.rawPinchRatio * 0.58;
        var pinchRatio = smoothedPinchRatio;

        // Pinch meter progress (0 = open, 1 = active)
        var pinchProgress = Math.max(0, Math.min(1, (0.54 - pinchRatio) / (0.54 - 0.27)));
        if (pose.isIndexPointing && (airGestureMode === "auto" || airGestureMode === "point")) {
          pinchProgress = Math.max(pinchProgress, 0.92);
        }
        if (airPinchMeter) {
          airPinchMeter.style.width = Math.round(pinchProgress * 100) + "%";
        }

        // Stabilized cursor anchor:
        // Index fingertip (8) is the primary pointer; blending 72% index + 28% thumb prevents
        // the cursor from jumping 25px sideways at the moment the thumb closes in to pinch.
        var usePureIndex = (airGestureMode === "point") || (airGestureMode === "auto" && pose.isIndexPointing && pinchRatio > 0.36);
        var anchorWeightIndex = usePureIndex ? 0.92 : 0.70;
        var midX = indexTip.x * anchorWeightIndex + thumbTip.x * (1 - anchorWeightIndex);
        var midY = indexTip.y * anchorWeightIndex + thumbTip.y * (1 - anchorWeightIndex);
        var midZ = (indexTip.z || 0) * anchorWeightIndex + (thumbTip.z || 0) * (1 - anchorWeightIndex);

        // Mirror X for natural selfie interaction
        var normX = 1 - midX;
        var normY = midY;

        airRawPoint = { x: normX, y: normY };
        var mapped = mapAirPoint(normX, normY, airBounds, cw, ch);
        var targetX = mapped.x, targetY = mapped.y;

        // 1€ (One-Euro) velocity-adaptive filter
        var filtered = filterAirCoord(targetX, targetY, performance.now());
        smoothX = filtered.x;
        smoothY = filtered.y;

        // Hysteresis thresholds
        var PINCH_ON_RATIO = Number($("air-pinch").value) / 100;
        var PINCH_OFF_RATIO = PINCH_ON_RATIO + 0.11;
        var isPinchClose = !pose.isClosedFist && !pose.isPeaceHover && (pinchRatio < PINCH_ON_RATIO);
        var isPinchOpen = pose.isClosedFist || pose.isPeaceHover || (pinchRatio > PINCH_OFF_RATIO);

        if (airRequireRelease && isPinchOpen && !pose.isIndexPointing) airRequireRelease = false;
        if (airPaused || airCalibrating || airRequireRelease || activePointerId !== null || $("air-tool").value === "laser") {
          var message = airPaused ? "Paused — camera remains on" : airCalibrating ? "Calibrating reach" : airRequireRelease ? "Open hand to arm gestures" : activePointerId !== null ? "Touch input has control" : "Laser pointer — no changes";
          if (airStatus) airStatus.textContent = message;
          renderAirCursor(smoothX, smoothY, false, pinchRatio, true, "laser", null);
          return;
        }

        var wantsPenDown = false;
        var wantsPenUp = false;

        if (airGestureMode === "auto") {
          wantsPenDown = isPinchClose || pose.isIndexPointing;
          wantsPenUp = isPinchOpen && !pose.isIndexPointing;
          lastActiveGestureType = pose.isPeaceHover ? "laser" : (pose.isClosedFist ? "fist" : (isPinchClose ? "pinch" : (pose.isIndexPointing ? "point" : "hover")));
        } else if (airGestureMode === "hold") {
          wantsPenDown = isPinchClose;
          wantsPenUp = isPinchOpen;
          lastActiveGestureType = pose.isPeaceHover ? "laser" : (isPinchClose ? "pinch" : "hover");
        } else if (airGestureMode === "point") {
          wantsPenDown = pose.isIndexPointing;
          wantsPenUp = !pose.isIndexPointing;
          lastActiveGestureType = pose.isPeaceHover ? "laser" : (pose.isIndexPointing ? "point" : "hover");
        } else {
          // "tap" latch mode
          if (isPinchClose && !wasPinching && (Date.now() - pinchTapCooldown > 340)) {
            pinchTapCooldown = Date.now();
            isAirPenDown = !isAirPenDown;
            if (isAirPenDown) {
              startAirStroke(smoothX, smoothY, midZ);
              showToast("🖊️ Air Pen Latched ON");
            } else {
              endAirStroke();
              showToast("🖐️ Air Pen Latched OFF");
            }
          }
          lastActiveGestureType = isAirPenDown ? "pinch" : "hover";
        }

        // Temporal debounce for Hold / Auto / Point modes (eliminates mid-stroke flicker splits)
        if (airGestureMode !== "tap") {
          if (!isAirPenDown) {
            if (wantsPenDown) {
              penDownConfirmCount++;
              // Immediate activation on strong pinch (<0.28) or 2 consecutive frames
              if (penDownConfirmCount >= 2 || pinchRatio < 0.28) {
                isAirPenDown = true;
                penUpGraceCount = 0;
                startAirStroke(smoothX, smoothY, midZ);
              }
            } else {
              penDownConfirmCount = 0;
            }
          } else {
            if (wantsPenUp) {
              penUpGraceCount++;
              // Require 3 consecutive open frames (or immediate Peace/Fist cancel) before lifting chalk
              var graceLimit = (pose.isPeaceHover || pose.isClosedFist) ? 2 : 3;
              if (penUpGraceCount >= graceLimit) {
                isAirPenDown = false;
                penDownConfirmCount = 0;
                endAirStroke();
              }
            } else {
              penUpGraceCount = 0;
            }
          }
        }
        wasPinching = isPinchClose;

        /* ── Gesture commands: temporally stabilised, dwell-confirmed, never while drawing ── */
        var nowT = performance.now();
        var stable = poseStab.push(handPose ? handPose.label : "other", nowT);
        var commandsOn = !chkAirCommands || chkAirCommands.checked;
        var cmdBlocked = !commandsOn || isAirPenDown || isPinchClose || airGestureMode === "tap";
        var cmd = cmdDetector.update(stable.label, stable.heldMs, nowT, cmdBlocked);
        cmdRing.progress = cmd.progress < 1 ? cmd.progress : 0;
        cmdRing.label = cmd.candidate ? (COMMAND_LABELS[cmd.candidate] || "") : "";
        var swipe = swipeDetector.push(1 - lm[9].x, lm[9].y, nowT, commandsOn && !isAirPenDown && stable.label === "palm");
        var fired = cmd.fire || (swipe === "swipeLeft" || swipe === "swipeRight" ? swipe : null);
        if (fired) {
          cmdRing.fireAt = nowT;
          runAirCommand(fired);
        }
        if (quality.warn && airStatus && !isAirPenDown) airStatus.textContent = "⚠️ " + quality.hint;

        // Check if hovering near a draggable 2D vertex/radius handle for magnetic visual cue
        var hoverHandle = (!isAirPenDown && !curMode.startsWith("3d") && $("air-tool").value === "geometry")
          ? findNearest2DHandle(smoothX, smoothY, 40)
          : null;

        // Update PiP status indicator
        if (airStatus) {
          if (isAirPenDown) {
            if (curMode.startsWith("3d")) {
              airStatus.textContent = "3D: " + $("air-3d-action").selectedOptions[0].textContent.split(":")[0];
            } else if (airInkStroke) {
              airStatus.textContent = "Ink annotation";
            } else if ($("air-tool").value === "erase") {
              airStatus.textContent = "Erasing ink strokes";
            } else if (airDraggingPoint) {
              airStatus.textContent = "🧲 Dragging Handle";
            } else {
              airStatus.textContent = lastActiveGestureType === "point" ? "☝️ Point Drawing" : "🤏 Pinch Drawing";
            }
            if (airPinchMeter) airPinchMeter.classList.add("active");
          } else {
            if (pose.isPeaceHover) {
              airStatus.textContent = "✌️ Laser Pointer";
            } else if (pose.isClosedFist) {
              airStatus.textContent = "✊ Pen Paused";
            } else if (hoverHandle) {
              airStatus.textContent = "🧲 Ready: " + hoverHandle.label;
            } else {
              airStatus.textContent = "🖐️ Hovering";
            }
            if (airPinchMeter) airPinchMeter.classList.remove("active");
          }
        }

        // Apply motion if pen is down
        if (isAirPenDown) {
          moveAirStroke(smoothX, smoothY, midZ);
        }

        // Render visual cursor on blackboard
        renderAirCursor(smoothX, smoothY, isAirPenDown, pinchRatio, true, lastActiveGestureType, hoverHandle);
        drawCommandRing(smoothX, smoothY);
      }

      function drawCommandRing(x, y) {
        if (!airCursorCtx || cmdRing.progress <= 0.02) return;
        airCursorCtx.save();
        airCursorCtx.lineWidth = 5;
        airCursorCtx.lineCap = "round";
        airCursorCtx.strokeStyle = "rgba(255,255,255,0.25)";
        airCursorCtx.beginPath();
        airCursorCtx.arc(x, y, 30, 0, Math.PI * 2);
        airCursorCtx.stroke();
        airCursorCtx.strokeStyle = "#34d399";
        airCursorCtx.beginPath();
        airCursorCtx.arc(x, y, 30, -Math.PI / 2, -Math.PI / 2 + cmdRing.progress * Math.PI * 2);
        airCursorCtx.stroke();
        airCursorCtx.font = "700 13px system-ui, sans-serif";
        airCursorCtx.fillStyle = "#ecfdf5";
        airCursorCtx.fillText(cmdRing.label, x + 38, y + 4);
        airCursorCtx.restore();
      }

      function startAirStroke(x, y, z) {
        if (activePointerId !== null) return;
        if (curMode.startsWith("3d")) {
          air3DAnchor = { x: x, y: y, z: z, startX: x, startY: y,
            unfold: Number(unfoldSlider.value), slice: Number(sliceSlider.value), joint: Number(jointSlider.value),
            zoomDistance: threeSceneKit.camera.position.distanceTo(modelControls.target) };
          return;
        }

        if ($("air-tool").value === "ink") {
          airInkStroke = { points: [{ x: x, y: y }], color: curColor, width: Number($("air-ink-width").value) };
          return;
        }
        if ($("air-tool").value === "erase") { saveAirInkUndo(); eraseAirInk(x, y); return; }

        // First check if user pinched near a draggable vertex or circle radius handle (magnetic 40px radius)
        var nearHandle = findNearest2DHandle(x, y, 40);
        if (nearHandle && !isDrawing) {
          snapshotState();
          airDraggingPoint = nearHandle.pt;
          return;
        }

        // Otherwise start a freehand AI sketch stroke anywhere on the 2D board!
        isDrawing = true;
        currentStroke = [{ x: x, y: y }];
      }

      function moveAirStroke(x, y, z) {
        if (activePointerId !== null) return;
        if (!curMode.startsWith("3d") && $("air-tool").value === "erase") { eraseAirInk(x, y); return; }
        if (airInkStroke) {
          var previousInkPoint = airInkStroke.points[airInkStroke.points.length - 1];
          if (Math.hypot(x - previousInkPoint.x, y - previousInkPoint.y) > 2) airInkStroke.points.push({ x: x, y: y });
          draw2D(); return;
        }

        if (airDraggingPoint) {
          if (airDraggingPoint === "circle-r") {
            geom2D.circle.r = Math.max(20, Math.hypot(x - geom2D.circle.cx, y - geom2D.circle.cy));
          } else {
            airDraggingPoint.x = x;
            airDraggingPoint.y = y;
          }
          draw2D();
          return;
        }

        if (isDrawing && !curMode.startsWith("3d")) {
          var prev = currentStroke[currentStroke.length - 1];
          if (!prev || Math.hypot(x - prev.x, y - prev.y) >= 2.2) {
            currentStroke.push({ x: x, y: y });
            draw2D();
          }
          return;
        }

        if (curMode.startsWith("3d") && air3DAnchor) {
          var dx = x - air3DAnchor.x;
          var dy = y - air3DAnchor.y;
          var action = $("air-3d-action").value;
          var sensitivity = Number($("air-sensitivity").value) / 100;
          if (action === "orbit" && current3DGroup) {
            // Orbit the camera, leaving slicing coordinates attached to the solid.
            rotateView(dx * 0.009 * sensitivity);
            var cameraOffset = threeSceneKit.camera.position.clone().sub(modelControls.target);
            var spherical = new THREE.Spherical().setFromVector3(cameraOffset);
            spherical.phi = Math.max(0.15, Math.min(Math.PI - 0.15, spherical.phi + dy * 0.009 * sensitivity));
            threeSceneKit.camera.position.copy(modelControls.target).add(new THREE.Vector3().setFromSpherical(spherical));
            modelControls.update();
          } else if (action === "zoom") {
            var distance = air3DAnchor.zoomDistance * Math.exp((y - air3DAnchor.startY) / stageWrap.clientHeight * 2 * sensitivity);
            var offset = threeSceneKit.camera.position.clone().sub(modelControls.target).setLength(Math.max(modelControls.minDistance, Math.min(modelControls.maxDistance, distance)));
            threeSceneKit.camera.position.copy(modelControls.target).add(offset); modelControls.update();
          } else if (action !== "orbit") {
            var slider = action === "unfold" ? unfoldSlider : action === "slice" ? sliceSlider : jointSlider;
            var wrapper = action === "unfold" ? wrapUnfold : action === "slice" ? wrapSlice : wrapJoint;
            if (wrapper.style.display === "none") {
              airCoach("This action is unavailable for the current solid. For slicing a cone or cylinder, fold its net to 0% first.");
            } else {
              slider.value = airActionValue(action, air3DAnchor[action], x - air3DAnchor.startX, y - air3DAnchor.startY, stageWrap.clientWidth, stageWrap.clientHeight, sensitivity);
              slider.dispatchEvent(new Event("input"));
            }
          }
          air3DAnchor.x = x;
          air3DAnchor.y = y;
          air3DAnchor.z = z;
        }
      }

      function endAirStroke() {
        if (activePointerId !== null) return;
        if (airInkStroke) {
          if (airInkStroke.points.length > 1) { saveAirInkUndo(); airInk.push(airInkStroke); }
          airInkStroke = null; draw2D();
        }
        if (isDrawing && !curMode.startsWith("3d")) {
          isDrawing = false;
          var recognized = analyzeStroke(currentStroke);
          if (recognized) {
            applyRecognition(recognized);
          } else if (currentStroke.length >= 4) {
            recentStrokes.push(currentStroke.slice());
            currentStroke = [];
            var instantMulti = recognizeMultiStroke(recentStrokes);
            if (instantMulti) {
              applyRecognition(instantMulti);
            } else {
              scheduleMultiStrokeCheck();
              draw2D();
            }
          } else {
            currentStroke = [];
            draw2D();
          }
        }
        airDraggingPoint = null;
        air3DAnchor = null;
      }

      function drawAirPip(results) {
        if (!pipCtx || !airVideo || !airPipCanvas) return;
        var pw = airPipCanvas.width, ph = airPipCanvas.height;
        pipCtx.clearRect(0, 0, pw, ph);

        // Mirrored camera video
        pipCtx.save();
        pipCtx.translate(pw, 0);
        pipCtx.scale(-1, 1);
        try {
          pipCtx.drawImage(airVideo, 0, 0, pw, ph);
        } catch (e) {}
        pipCtx.restore();

        // High contrast dark tint
        pipCtx.fillStyle = "rgba(2, 18, 11, 0.28)";
        pipCtx.fillRect(0, 0, pw, ph);

        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return;

        var lm = results.multiHandLandmarks[0];

        // 21-point hand skeleton bones
        var bones = [
          [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
          [0, 5], [5, 6], [6, 7], [7, 8],       // Index
          [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
          [0, 13], [13, 14], [14, 15], [15, 16],// Ring
          [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
          [5, 9], [9, 13], [13, 17]             // Palm
        ];

        pipCtx.strokeStyle = "rgba(52, 211, 153, 0.72)";
        pipCtx.lineWidth = 1.5;
        for (var i = 0; i < bones.length; i++) {
          var p1 = lm[bones[i][0]];
          var p2 = lm[bones[i][1]];
          pipCtx.beginPath();
          pipCtx.moveTo((1 - p1.x) * pw, p1.y * ph);
          pipCtx.lineTo((1 - p2.x) * pw, p2.y * ph);
          pipCtx.stroke();
        }

        // Joints
        for (var j = 0; j < lm.length; j++) {
          var p = lm[j];
          pipCtx.beginPath();
          pipCtx.arc((1 - p.x) * pw, p.y * ph, (j === 4 || j === 8) ? 3.8 : 2, 0, Math.PI * 2);
          pipCtx.fillStyle = (j === 4 || j === 8) ? "#facc15" : "#34d399";
          pipCtx.fill();
        }

        // Pinch connection line between Thumb (4) and Index (8)
        var tPt = lm[4], iPt = lm[8];
        var tx = (1 - tPt.x) * pw, ty = tPt.y * ph;
        var ix = (1 - iPt.x) * pw, iy = iPt.y * ph;

        pipCtx.beginPath();
        pipCtx.moveTo(tx, ty);
        pipCtx.lineTo(ix, iy);
        if (isAirPenDown) {
          pipCtx.strokeStyle = "#10b981";
          pipCtx.lineWidth = 3;
          pipCtx.shadowColor = "#10b981";
          pipCtx.shadowBlur = 6;
          pipCtx.stroke();
          pipCtx.shadowBlur = 0;
        } else {
          pipCtx.strokeStyle = "rgba(250, 204, 21, 0.85)";
          pipCtx.lineWidth = 1.5;
          pipCtx.setLineDash([2, 2]);
          pipCtx.stroke();
          pipCtx.setLineDash([]);
        }
      }

      function renderAirCursor(x, y, isPenActive, pinchRatio, isHandVisible, gestureType, hoverHandle) {
        if (!airCursorCtx || !isHandVisible) return;

        airCursorCtx.save();

        // Highlight magnetic 2D handle when hovering or dragging
        if (hoverHandle) {
          airCursorCtx.beginPath();
          airCursorCtx.arc(hoverHandle.x, hoverHandle.y, 22, 0, Math.PI * 2);
          airCursorCtx.strokeStyle = "#facc15";
          airCursorCtx.lineWidth = 2.5;
          airCursorCtx.setLineDash([4, 3]);
          airCursorCtx.stroke();
          airCursorCtx.setLineDash([]);
        }

        if (isPenActive) {
          // Glowing chalk tip
          airCursorCtx.shadowColor = curColor;
          airCursorCtx.shadowBlur = 14;

          airCursorCtx.beginPath();
          airCursorCtx.arc(x, y, $("air-tool").value === "erase" && !curMode.startsWith("3d") ? 24 : 16, 0, Math.PI * 2);
          airCursorCtx.strokeStyle = curColor;
          airCursorCtx.lineWidth = 2.5;
          airCursorCtx.stroke();

          airCursorCtx.beginPath();
          airCursorCtx.arc(x, y, 6, 0, Math.PI * 2);
          airCursorCtx.fillStyle = curColor;
          airCursorCtx.fill();

          airCursorCtx.shadowBlur = 0;
          airCursorCtx.font = "bold 10px system-ui, sans-serif";
          var badge = curMode.startsWith("3d")
            ? "3D " + $("air-3d-action").value.toUpperCase()
            : ($("air-tool").value === "erase" ? "ERASE INK" : airInkStroke ? "INK" : airDraggingPoint ? "DRAG HANDLE" : "GEOMETRY");
          var tw = airCursorCtx.measureText(badge).width;
          airCursorCtx.fillStyle = "rgba(2, 24, 15, 0.88)";
          airCursorCtx.fillRect(x + 16, y - 16, tw + 10, 18);
          airCursorCtx.strokeStyle = curColor;
          airCursorCtx.lineWidth = 1;
          airCursorCtx.strokeRect(x + 16, y - 16, tw + 10, 18);
          airCursorCtx.fillStyle = curColor;
          airCursorCtx.fillText(badge, x + 21, y - 3);
        } else if (gestureType === "laser") {
          // Two-finger Peace Gesture = Classroom Laser Pointer
          airCursorCtx.shadowColor = "#fb7185";
          airCursorCtx.shadowBlur = 16;
          airCursorCtx.beginPath();
          airCursorCtx.arc(x, y, 10, 0, Math.PI * 2);
          airCursorCtx.fillStyle = "rgba(251, 113, 133, 0.35)";
          airCursorCtx.fill();
          airCursorCtx.beginPath();
          airCursorCtx.arc(x, y, 4.5, 0, Math.PI * 2);
          airCursorCtx.fillStyle = "#fb7185";
          airCursorCtx.fill();
          airCursorCtx.shadowBlur = 0;
          airCursorCtx.font = "bold 10px system-ui, sans-serif";
          airCursorCtx.fillStyle = "#fda4af";
          airCursorCtx.fillText(airPaused ? "Paused" : airCalibrating ? "Calibrating" : airRequireRelease ? "Open hand" : "Laser Pointer", x + 15, y + 4);
        } else {
          // Hover ring
          airCursorCtx.beginPath();
          airCursorCtx.arc(x, y, 16, 0, Math.PI * 2);
          airCursorCtx.strokeStyle = "rgba(255, 255, 255, 0.42)";
          airCursorCtx.lineWidth = 1.5;
          airCursorCtx.setLineDash([4, 3]);
          airCursorCtx.stroke();
          airCursorCtx.setLineDash([]);

          // Contracting proximity circle
          var proxR = Math.max(5, Math.min(22, 5 + (pinchRatio || 0.45) * 26));
          airCursorCtx.beginPath();
          airCursorCtx.arc(x, y, proxR, 0, Math.PI * 2);
          airCursorCtx.strokeStyle = hoverHandle ? "#facc15" : "#34d399";
          airCursorCtx.lineWidth = 2;
          airCursorCtx.stroke();

          airCursorCtx.beginPath();
          airCursorCtx.arc(x, y, 3, 0, Math.PI * 2);
          airCursorCtx.fillStyle = "#fff";
          airCursorCtx.fill();

          airCursorCtx.font = "10px system-ui, sans-serif";
          var hint = hoverHandle
            ? ("Pinch/Point to Drag " + hoverHandle.label)
            : (airGestureMode === "auto"
              ? "Pinch or Point ☝️ to Draw"
              : (airGestureMode === "point"
                ? "Point Index ☝️ to Draw"
                : (airGestureMode === "hold" ? "Pinch 🤏 to Draw" : "Pinch Tap to Start")));
          airCursorCtx.fillStyle = "rgba(255, 255, 255, 0.88)";
          airCursorCtx.fillText(hint, x + 18, y + 4);
        }
        airCursorCtx.restore();
      }

      if (btnAirChalk) {
        btnAirChalk.addEventListener("click", function () {
          if (isAirActive) {
            stopAirChalk();
            showToast("📹 Air Chalk Turned Off");
          } else {
            startAirChalk();
          }
        });
      }

      if (btnAirClose) {
        btnAirClose.addEventListener("click", function () {
          stopAirChalk();
          showToast("📹 Air Chalk Closed");
        });
      }

      if (btnAirModeToggle) {
        var modeCycle = [
          { id: "auto", label: "Auto", msg: "Air Chalk Mode: Auto (Pinch 🤏 OR Index Point ☝️ to Draw)" },
          { id: "hold", label: "Pinch", msg: "Air Chalk Mode: Hold Pinch 🤏 to Draw" },
          { id: "point", label: "Point", msg: "Air Chalk Mode: Index Finger Point ☝️ to Draw (Open Hand 🖐️ to Hover)" },
          { id: "tap", label: "Tap", msg: "Air Chalk Mode: Pinch Tap to Latch Pen ON/OFF" }
        ];
        btnAirModeToggle.addEventListener("click", function () {
          var idx = 0;
          for (var i = 0; i < modeCycle.length; i++) {
            if (modeCycle[i].id === airGestureMode) { idx = i; break; }
          }
          var next = modeCycle[(idx + 1) % modeCycle.length];
          resetAirInteraction(true);
          airGestureMode = next.id;
          $("air-input-mode").value = next.id;
          btnAirModeToggle.textContent = next.label;
          if (isAirPenDown) {
            isAirPenDown = false;
            endAirStroke();
          }
          showToast(next.msg);
        });
      }

      $("air-input-mode").addEventListener("change", function () {
        resetAirInteraction(true);
        airGestureMode = this.value;
        if (btnAirModeToggle) btnAirModeToggle.textContent = { auto: "Auto", hold: "Pinch", point: "Point", tap: "Tap" }[this.value];
        airCoach("Pen gesture changed. Open your hand before drawing.");
      });

      window.addEventListener("beforeunload", function () {
        stopAirChalk();
      });

      var investigations = {
        cyl: { answer: 2 * Math.PI * 1.2, tolerance: 0.02,
          prompt: "A cylinder has radius 1.2 cm and height 2.4 cm. Predict the width of its rectangular wall when flat. Give your answer in cm.",
          hint: "The width matches one trip around the base: 2 × π × r.",
          success: "Correct: about 7.54 cm. Unfold the wall and explain why its width equals the base circumference." },
        cone: { answer: 360 * 1.3 / Math.hypot(1.3, 2.4), tolerance: 0.1,
          prompt: "A cone has radius 1.3 cm and height 2.4 cm. Predict its flat sector angle in degrees (nearest tenth). First find the slant height L.",
          hint: "L = √(1.3² + 2.4²). The sector arc equals 2πr, so its angle is 360 × r/L.",
          success: "Correct. Open the cone and explain why the arc length stays 2πr while the sector radius is the slant height." },
        triangle: { answer: 3, tolerance: 0.01,
          prompt: "Triangle A(0,0), B(3,0), C(−1,2) has an altitude outside base AB. Predict its area in cm². Will you add or subtract the two right-triangle areas?",
          hint: "The larger right triangle has base 4 and height 2; the smaller has base 1 and height 2. Subtract their areas.",
          success: "Correct: 3 cm² = 4 − 1. Explore the external altitude and explain why adding would count extra area." }
      };
      var investigationNotes = {};
      var selectedInvestigation = "cyl";
      $("investigation").addEventListener("change", function () {
        investigationNotes[selectedInvestigation] = { answer: $("investigation-answer").value, reason: $("investigation-reason").value };
        selectedInvestigation = this.value;
        var saved = investigationNotes[this.value] || {};
        $("investigation-prompt").textContent = investigations[this.value].prompt;
        $("investigation-answer").value = saved.answer || "";
        $("investigation-reason").value = saved.reason || "";
        $("investigation-feedback").textContent = "";
      });
      $("investigation-check").addEventListener("click", function () {
        var task = investigations[selectedInvestigation], field = $("investigation-answer");
        var answer = Number(field.value);
        $("investigation-feedback").textContent = field.value.trim() === "" || !Number.isFinite(answer) ? "Enter a numerical prediction first." : Math.abs(answer - task.answer) <= task.tolerance ? task.success : "Try again. " + task.hint;
      });
      $("investigation-explore").addEventListener("click", function () {
        $("ai-step-card").open = false;
        if (selectedInvestigation === "triangle") {
          $("btn-mode-triangle").click();
          geom2D.pts = [{ x: 180, y: 320, label: "A" }, { x: 255, y: 320, label: "B" }, { x: 155, y: 270, label: "C" }];
          chkAltitude.checked = true;
          selUnknown.value = "none";
          draw2D();
        } else switchTo3D(selectedInvestigation);
        announce("Investigation model ready. Explore, then write your explanation.", true);
      });

      // Place the initial example inside narrow boards without changing its lengths.
      if (stageWrap.clientWidth < 480) {
        var initialMinX = Math.min.apply(null, geom2D.pts.map(function (point) { return point.x; }));
        geom2D.pts.forEach(function (point) { point.x += 20 - initialMinX; });
        geom2D.circle.cx = stageWrap.clientWidth / 2;
      }
      var boardStudio = initBoardStudio(function () {
        return { mode: curMode, type: geom2D.type, points: geom2D.pts, circle: geom2D.circle };
      });
      resizeChalk();
      if (document.fonts) Promise.all([document.fonts.load("16px 'Board Sans'"), document.fonts.load("24px 'Board Hand'")]).then(resizeChalk);
    })();
