/**
 * Pivot Stick Figure Studio — In-House 2D Keyframe & Forward-Kinematics Lab
 * Built on PivEngine (lib/piv-engine.js) and SimKit (assets/js/sim-kit.js).
 */
(function () {
  "use strict";

  var Piv = window.PivEngine;
  if (!Piv) return;

  var STAGE_W = 690;
  var STAGE_H = 420;
  var GROUND_Y = 368;

  var BUILTIN_SEG_NAMES = [
    "0 · Lower Spine (Pelvis → Waist)",
    "1 · Upper Spine (Waist → Shoulders)",
    "2 · Neck & Head Axis (Shoulders → Crown)",
    "3 · Head Circle (Crown → Neck)",
    "4 · Left Upper Arm (Shoulder → Elbow)",
    "5 · Right Upper Arm (Shoulder → Elbow)",
    "6 · Left Forearm (Elbow → Hand)",
    "7 · Right Forearm (Elbow → Hand)",
    "8 · Left Thigh (Hip → Knee)",
    "9 · Right Thigh (Hip → Knee)",
    "10 · Left Shin (Knee → Foot)",
    "11 · Right Shin (Knee → Foot)"
  ];

  function deg(rad) {
    var d = Math.round((rad * 180) / Math.PI) % 360;
    return d + "°";
  }

  function normAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function lerpAngle(a, b, t) {
    var diff = normAngle(b - a);
    return normAngle(a + diff * t);
  }

  function makeStandingAngles(pose) {
    // Default neutral standing pose matching Pivot v5 segment layout
    var a = new Float64Array([
      -Math.PI / 2, // 0: lower spine
      -Math.PI / 2, // 1: upper spine
      -Math.PI / 2, // 2: neck/crown
      Math.PI / 2,  // 3: head circle (always angles[2] + PI)
      2.25,         // 4: L upper arm
      0.89,         // 5: R upper arm
      1.75,         // 6: L forearm
      1.39,         // 7: R forearm
      1.82,         // 8: L thigh
      1.32,         // 9: R thigh
      1.68,         // 10: L shin
      1.46          // 11: R shin
    ]);
    if (pose) {
      for (var k in pose) {
        if (Object.prototype.hasOwnProperty.call(pose, k)) {
          a[+k] = pose[k];
        }
      }
      a[3] = normAngle(a[2] + Math.PI);
    }
    return a;
  }

  function createPropTypes() {
    var swordType = {
      name: "Sword Prop",
      builtIn: false,
      order: [0, 1, 2],
      segments: [
        { length: 18, restAngle: 0, thickness: 10, parent: 0, isCircle: false, isFilled: false, color: [120, 53, 15] },
        { length: 24, restAngle: 0, thickness: 8, parent: 0, isCircle: false, isFilled: false, color: [217, 119, 6] },
        { length: 78, restAngle: 0, thickness: 8, parent: 0, isCircle: false, isFilled: false, color: [71, 85, 105] }
      ]
    };
    var ballType = {
      name: "Energy Sphere",
      builtIn: false,
      order: [0],
      segments: [
        { length: 34, restAngle: 0, thickness: 14, parent: 0, isCircle: true, isFilled: true, color: [234, 88, 12] }
      ]
    };
    return [Piv.defaultFigureType(), Piv.defaultFigureType(), swordType, ballType];
  }

  function cloneFrame(frame) {
    return {
      figures: frame.figures.map(function (f) {
        return {
          id: f.id,
          type: f.type,
          scale: f.scale,
          color: f.color ? f.color.slice() : null,
          angles: new Float64Array(f.angles),
          x: f.x,
          y: f.y
        };
      }),
      order: frame.order.slice()
    };
  }

  function buildWalkPreset() {
    var types = createPropTypes();
    // 8-frame walk cycle across stage
    var keyframes = [
      { x: 220, y: 270, p: { 0: -1.48, 1: -1.45, 2: -1.48, 4: 0.95, 6: 0.55, 5: 2.15, 7: 1.85, 8: 1.15, 10: 1.45, 9: 2.02, 11: 2.25 } },
      { x: 248, y: 275, p: { 0: -1.46, 1: -1.42, 2: -1.46, 4: 1.18, 6: 0.72, 5: 1.95, 7: 1.65, 8: 1.28, 10: 1.72, 9: 1.85, 11: 2.28 } },
      { x: 276, y: 268, p: { 0: -1.52, 1: -1.50, 2: -1.50, 4: 1.55, 6: 1.10, 5: 1.60, 7: 1.25, 8: 1.54, 10: 1.60, 9: 1.58, 11: 2.35 } },
      { x: 304, y: 263, p: { 0: -1.50, 1: -1.47, 2: -1.48, 4: 1.92, 6: 1.60, 5: 1.20, 7: 0.75, 8: 1.84, 10: 1.95, 9: 1.22, 11: 1.52 } },
      { x: 332, y: 270, p: { 0: -1.48, 1: -1.45, 2: -1.48, 4: 2.15, 6: 1.85, 5: 0.95, 7: 0.55, 8: 2.02, 10: 2.25, 9: 1.15, 11: 1.45 } },
      { x: 360, y: 275, p: { 0: -1.46, 1: -1.42, 2: -1.46, 4: 1.95, 6: 1.65, 5: 1.18, 7: 0.72, 8: 1.85, 10: 2.28, 9: 1.28, 11: 1.72 } },
      { x: 388, y: 268, p: { 0: -1.52, 1: -1.50, 2: -1.50, 4: 1.60, 6: 1.25, 5: 1.55, 7: 1.10, 8: 1.58, 10: 2.35, 9: 1.54, 11: 1.60 } },
      { x: 416, y: 263, p: { 0: -1.50, 1: -1.47, 2: -1.48, 4: 1.20, 6: 0.75, 5: 1.92, 7: 1.60, 8: 1.22, 10: 1.52, 9: 1.84, 11: 1.95 } }
    ];
    return {
      version: 5,
      width: STAGE_W,
      height: STAGE_H,
      fps: 10,
      types: types,
      frames: keyframes.map(function (kf) {
        return {
          figures: [{
            id: 1,
            type: 1,
            scale: 1,
            color: [37, 99, 235],
            angles: makeStandingAngles(kf.p),
            x: kf.x,
            y: kf.y
          }],
          order: [0]
        };
      })
    };
  }

  function buildJumpPreset() {
    var types = createPropTypes();
    // 8-frame anticipation crouch -> launch -> apex tuck -> landing squash -> stand
    var keyframes = [
      // 1: Neutral stand
      { x: 240, y: 270, p: { 0: -1.57, 1: -1.57, 2: -1.57, 4: 2.1, 6: 1.7, 5: 1.04, 7: 1.44, 8: 1.82, 10: 1.68, 9: 1.32, 11: 1.46 } },
      // 2: Deep anticipation crouch (hips drop, arms swing back, torso leans forward)
      { x: 245, y: 304, p: { 0: -1.12, 1: -1.02, 2: -1.18, 4: 2.62, 6: 2.40, 5: 2.42, 7: 2.20, 8: 0.72, 10: 2.25, 9: 0.55, 11: 2.12 } },
      // 3: Explosive launch (full extension upward, arms throw overhead)
      { x: 280, y: 232, p: { 0: -1.35, 1: -1.32, 2: -1.35, 4: -1.05, 6: -1.25, 5: -1.45, 7: -1.65, 8: 1.92, 10: 1.98, 9: 1.68, 11: 1.76 } },
      // 4: Rising arc
      { x: 325, y: 182, p: { 0: -1.45, 1: -1.40, 2: -1.40, 4: -0.75, 6: -0.95, 5: -2.15, 7: -1.85, 8: 1.15, 10: 2.15, 9: 0.85, 11: 1.95 } },
      // 5: Apex mid-air tuck
      { x: 365, y: 162, p: { 0: -1.32, 1: -1.22, 2: -1.25, 4: 0.45, 6: -0.25, 5: 2.45, 7: 1.75, 8: 0.45, 10: 2.42, 9: 0.25, 11: 2.28 } },
      // 6: Descent reach (legs reach for landing)
      { x: 405, y: 205, p: { 0: -1.52, 1: -1.48, 2: -1.45, 4: 2.35, 6: 2.05, 5: 0.75, 7: 1.05, 8: 1.35, 10: 1.55, 9: 1.05, 11: 1.32 } },
      // 7: Impact squash (knees absorb momentum)
      { x: 440, y: 300, p: { 0: -1.18, 1: -1.10, 2: -1.25, 4: 1.95, 6: 1.25, 5: 0.65, 7: 0.25, 8: 0.68, 10: 2.22, 9: 0.52, 11: 2.08 } },
      // 8: Recovery stand
      { x: 445, y: 270, p: { 0: -1.57, 1: -1.57, 2: -1.57, 4: 2.15, 6: 1.75, 5: 0.98, 7: 1.38, 8: 1.82, 10: 1.68, 9: 1.32, 11: 1.46 } }
    ];
    return {
      version: 5,
      width: STAGE_W,
      height: STAGE_H,
      fps: 10,
      types: types,
      frames: keyframes.map(function (kf) {
        return {
          figures: [{
            id: 1,
            type: 1,
            scale: 1,
            color: [234, 88, 12],
            angles: makeStandingAngles(kf.p),
            x: kf.x,
            y: kf.y
          }],
          order: [0]
        };
      })
    };
  }

  function buildMartialArtsPreset() {
    var types = createPropTypes();
    // Two figures: Blue martial artist performs high kick, Crimson partner blocks/ducks
    var frames = [
      {
        a: { x: 255, y: 270, p: { 0: -1.55, 1: -1.52, 4: 0.95, 6: 0.25, 5: 1.45, 7: 0.65, 8: 1.85, 10: 1.72, 9: 1.25, 11: 1.42 } },
        b: { x: 420, y: 270, p: { 0: -1.58, 1: -1.62, 4: 2.15, 6: 2.75, 5: 1.75, 7: 2.45, 8: 1.88, 10: 1.72, 9: 1.28, 11: 1.42 } }
      },
      {
        a: { x: 275, y: 274, p: { 0: -1.68, 1: -1.72, 4: 1.15, 6: 0.45, 5: 1.85, 7: 1.15, 8: 1.65, 10: 1.65, 9: 0.55, 11: 1.85 } },
        b: { x: 420, y: 274, p: { 0: -1.62, 1: -1.68, 4: 2.25, 6: 2.85, 5: 1.95, 7: 2.65, 8: 1.92, 10: 1.78, 9: 1.22, 11: 1.48 } }
      },
      {
        a: { x: 292, y: 268, p: { 0: -1.95, 1: -2.05, 4: 1.65, 6: 1.15, 5: 2.25, 7: 1.75, 8: 1.58, 10: 1.58, 9: -0.15, 11: 0.65 } },
        b: { x: 428, y: 292, p: { 0: -1.85, 1: -1.95, 4: 2.45, 6: 2.95, 5: 2.15, 7: 2.85, 8: 2.25, 10: 1.35, 9: 1.45, 11: 1.15 } }
      },
      {
        a: { x: 300, y: 266, p: { 0: -2.18, 1: -2.25, 4: 1.95, 6: 1.55, 5: 2.45, 7: 2.05, 8: 1.57, 10: 1.57, 9: -0.42, 11: -0.38 } },
        b: { x: 438, y: 312, p: { 0: -2.05, 1: -2.18, 4: 2.55, 6: -2.85, 5: 2.35, 7: -2.65, 8: 2.45, 10: 1.15, 9: 1.65, 11: 0.95 } }
      },
      {
        a: { x: 292, y: 268, p: { 0: -1.85, 1: -1.92, 4: 1.45, 6: 0.85, 5: 2.05, 7: 1.45, 8: 1.60, 10: 1.60, 9: 0.35, 11: 1.45 } },
        b: { x: 432, y: 290, p: { 0: -1.78, 1: -1.85, 4: 2.25, 6: 2.85, 5: 1.95, 7: 2.65, 8: 2.05, 10: 1.55, 9: 1.38, 11: 1.28 } }
      },
      {
        a: { x: 270, y: 270, p: { 0: -1.55, 1: -1.52, 4: 0.95, 6: 0.25, 5: 1.45, 7: 0.65, 8: 1.85, 10: 1.72, 9: 1.25, 11: 1.42 } },
        b: { x: 420, y: 270, p: { 0: -1.58, 1: -1.62, 4: 2.15, 6: 2.75, 5: 1.75, 7: 2.45, 8: 1.88, 10: 1.72, 9: 1.28, 11: 1.42 } }
      }
    ];
    return {
      version: 5,
      width: STAGE_W,
      height: STAGE_H,
      fps: 9,
      types: types,
      frames: frames.map(function (f) {
        return {
          figures: [
            { id: 1, type: 1, scale: 1, color: [37, 99, 235], angles: makeStandingAngles(f.a.p), x: f.a.x, y: f.a.y },
            { id: 2, type: 1, scale: 1, color: [220, 38, 38], angles: makeStandingAngles(f.b.p), x: f.b.x, y: f.b.y }
          ],
          order: [0, 1]
        };
      })
    };
  }

  // Compute segment start/end coordinates for a single figure
  function computeFigureJoints(doc, fig) {
    var type = doc.types[fig.type] || doc.types[0];
    var segs = type.segments;
    var scale = fig.scale || 1;
    var startX = new Float64Array(segs.length);
    var startY = new Float64Array(segs.length);
    var endX = new Float64Array(segs.length);
    var endY = new Float64Array(segs.length);

    for (var s = 0; s < segs.length; s++) {
      var p = segs[s].parent;
      var sx = fig.x;
      var sy = fig.y;
      if (p > 0 && p - 1 < segs.length) {
        sx = endX[p - 1];
        sy = endY[p - 1];
      }
      var ang = s < fig.angles.length ? fig.angles[s] : segs[s].restAngle;
      var len = segs[s].length * scale;
      startX[s] = sx;
      startY[s] = sy;
      endX[s] = sx + len * Math.cos(ang);
      endY[s] = sy + len * Math.sin(ang);
    }
    return { type: type, segs: segs, startX: startX, startY: startY, endX: endX, endY: endY };
  }

  // Find all descendant segment indices of segment `segIdx`
  function getDescendants(segs, segIdx) {
    var desc = [];
    var queue = [segIdx + 1]; // parent value is 1-based (segIdx + 1)
    while (queue.length > 0) {
      var parentOneBased = queue.shift();
      for (var i = 0; i < segs.length; i++) {
        if (segs[i].parent === parentOneBased && desc.indexOf(i) === -1) {
          desc.push(i);
          queue.push(i + 1);
        }
      }
    }
    return desc;
  }

  // Initialize the studio inside #piv-studio-root
  function initStudio() {
    var canvas = document.getElementById("piv-stage-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");

    var state = {
      doc: buildWalkPreset(),
      frameIndex: 0,
      selectedFigIndex: 0,
      selectedSegIndex: 4,
      fkChain: true,
      onionSkin: true,
      showCoM: true,
      showGrid: true,
      playing: false,
      loop: true,
      dragging: null, // { kind: 'origin' | 'joint', figIndex, segIndex }
      hoverHandle: null,
      lastTick: 0
    };

    var elFramesScroll = document.getElementById("piv-frames-scroll");
    var elHudFrame = document.getElementById("piv-hud-frame");
    var elHudReadout = document.getElementById("piv-hud-readout");
    var elRigTree = document.getElementById("piv-rig-tree");
    var elKinematicsBox = document.getElementById("piv-kinematics-box");
    var elToast = document.getElementById("piv-status-toast");
    var elPlayBtn = document.getElementById("piv-btn-play");
    var elFpsSlider = document.getElementById("piv-fps-slider");
    var elFpsVal = document.getElementById("piv-fps-val");
    var elScaleSlider = document.getElementById("piv-scale-slider");
    var elScaleVal = document.getElementById("piv-scale-val");

    function showToast(msg) {
      if (!elToast) return;
      elToast.textContent = msg;
    }

    function currentFrame() {
      if (!state.doc.frames.length) {
        state.doc.frames.push({
          figures: [{
            id: 1,
            type: 1,
            scale: 1,
            color: [15, 23, 42],
            angles: makeStandingAngles(),
            x: STAGE_W / 2,
            y: 270
          }],
          order: [0]
        });
      }
      if (state.frameIndex >= state.doc.frames.length) {
        state.frameIndex = state.doc.frames.length - 1;
      }
      if (state.frameIndex < 0) state.frameIndex = 0;
      return state.doc.frames[state.frameIndex];
    }

    function selectedFigure() {
      var fr = currentFrame();
      if (!fr.figures.length) return null;
      if (state.selectedFigIndex >= fr.figures.length) {
        state.selectedFigIndex = fr.figures.length - 1;
      }
      return fr.figures[state.selectedFigIndex];
    }

    // Draw a translucent ghost frame for Onion Skinning
    function drawGhostFrame(frameIdx, tintRgba) {
      if (frameIdx < 0 || frameIdx >= state.doc.frames.length) return;
      var ops = Piv.frameOps(state.doc, frameIdx);
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (var i = 0; i < ops.length; i++) {
        var op = ops[i];
        if (op.kind === "line") {
          ctx.strokeStyle = tintRgba;
          ctx.lineWidth = op.width;
          ctx.beginPath();
          ctx.moveTo(op.x1, op.y1);
          ctx.lineTo(op.x2, op.y2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(op.cx, op.cy, Math.max(0.5, op.r), 0, Math.PI * 2);
          if (op.filled) {
            ctx.fillStyle = tintRgba;
            ctx.fill();
          }
          ctx.strokeStyle = tintRgba;
          ctx.lineWidth = op.width;
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawCenterOfMass(fig, joints) {
      var sumX = fig.x * 2;
      var sumY = fig.y * 2;
      var totalW = 2;
      for (var s = 0; s < joints.segs.length; s++) {
        var mx = (joints.startX[s] + joints.endX[s]) * 0.5;
        var my = (joints.startY[s] + joints.endY[s]) * 0.5;
        var w = Math.max(1, joints.segs[s].length * 0.05);
        sumX += mx * w;
        sumY += my * w;
        totalW += w;
      }
      var comX = sumX / totalW;
      var comY = sumY / totalW;

      ctx.save();
      // Vertical balance plumb line to ground
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.moveTo(comX, comY);
      ctx.lineTo(comX, GROUND_Y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ground projection marker
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(comX, GROUND_Y, 4, 0, Math.PI * 2);
      ctx.fill();

      // CoM crosshair symbol
      ctx.fillStyle = "#10b981";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(comX, comY, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    function renderStage() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var targetW = Math.round(STAGE_W * dpr);
      var targetH = Math.round(STAGE_H * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear stage background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, STAGE_W, STAGE_H);

      // Subtle motion grid & ground plane
      if (state.showGrid) {
        ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
        ctx.lineWidth = 1;
        for (var gx = 60; gx < STAGE_W; gx += 60) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, STAGE_H);
          ctx.stroke();
        }
        for (var gy = 60; gy < STAGE_H; gy += 60) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(STAGE_W, gy);
          ctx.stroke();
        }
        // Floor line
        ctx.strokeStyle = "rgba(100, 116, 139, 0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(STAGE_W, GROUND_Y);
        ctx.stroke();
      }

      // Onion skin ghosts (when paused or scrubbing)
      if (state.onionSkin && !state.playing) {
        drawGhostFrame(state.frameIndex - 2, "rgba(59, 130, 246, 0.15)");
        drawGhostFrame(state.frameIndex - 1, "rgba(59, 130, 246, 0.34)");
      }

      // Draw current frame figures using PivEngine
      Piv.drawFrame(ctx, state.doc, state.frameIndex, { background: null });

      // Draw interactive handles & Center of Mass when paused
      var fr = currentFrame();
      if (!state.playing) {
        for (var fi = 0; fi < fr.figures.length; fi++) {
          var fig = fr.figures[fi];
          var isSelFig = fi === state.selectedFigIndex;
          var joints = computeFigureJoints(state.doc, fig);

          if (isSelFig && state.showCoM) {
            drawCenterOfMass(fig, joints);
          }

          // Highlight currently selected bone segment
          if (isSelFig && state.selectedSegIndex >= 0 && state.selectedSegIndex < joints.segs.length) {
            var si = state.selectedSegIndex;
            ctx.save();
            ctx.strokeStyle = "rgba(234, 88, 12, 0.45)";
            ctx.lineWidth = (joints.segs[si].thickness * (fig.scale || 1)) + 8;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(joints.startX[si], joints.startY[si]);
            ctx.lineTo(joints.endX[si], joints.endY[si]);
            ctx.stroke();
            ctx.restore();
          }

          // Draw red segment handles
          for (var s = 0; s < joints.segs.length; s++) {
            // Skip segment 3 handle on built-in stick figure since segment 2 (crown) controls head rotation
            if (joints.type.builtIn && s === 3) continue;
            var hx = joints.endX[s];
            var hy = joints.endY[s];
            var r = isSelFig ? (s === state.selectedSegIndex ? 6.5 : 5) : 3.8;
            ctx.beginPath();
            ctx.arc(hx, hy, r, 0, Math.PI * 2);
            ctx.fillStyle = isSelFig
              ? (s === state.selectedSegIndex ? "#facc15" : "#ef4444")
              : "rgba(239, 68, 68, 0.55)";
            ctx.fill();
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = "#0f172a";
            ctx.stroke();
          }

          // Draw orange origin (pelvis/root) handle on top
          ctx.beginPath();
          ctx.arc(fig.x, fig.y, isSelFig ? 7.5 : 5.5, 0, Math.PI * 2);
          ctx.fillStyle = "#f97316";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
        }
      }

      ctx.restore();

      if (elHudFrame) {
        elHudFrame.textContent =
          "Frame " + (state.frameIndex + 1) + " / " + state.doc.frames.length +
          " · " + state.doc.fps + " FPS";
      }
      updateInspectorReadout();
    }

    function updateInspectorReadout() {
      var fig = selectedFigure();
      if (!fig) return;
      var joints = computeFigureJoints(state.doc, fig);
      var s = Math.min(state.selectedSegIndex, joints.segs.length - 1);
      if (s < 0) s = 0;
      var seg = joints.segs[s];
      var ang = fig.angles[s] || 0;
      var parentLabel = seg.parent === 0 ? "Origin (x, y)" : "Segment " + (seg.parent - 1);

      if (elHudReadout) {
        elHudReadout.textContent =
          "Fig #" + (state.selectedFigIndex + 1) +
          " · Root (" + Math.round(fig.x) + ", " + Math.round(fig.y) + ") · " +
          "Seg " + s + ": " + deg(ang);
      }

      if (elKinematicsBox) {
        var sx = Math.round(joints.startX[s]);
        var sy = Math.round(joints.startY[s]);
        var ex = Math.round(joints.endX[s]);
        var ey = Math.round(joints.endY[s]);
        var len = Math.round(seg.length * (fig.scale || 1));
        elKinematicsBox.innerHTML =
          "<strong>Forward Kinematics Equation</strong><br>" +
          "Parent: <code>" + parentLabel + "</code> at <code>(" + sx + ", " + sy + ")</code><br>" +
          "Angle θ = <code>" + deg(ang) + "</code> · Length L = <code>" + len + " px</code><br>" +
          "<code>endX = " + sx + " + " + len + "·cos(" + deg(ang) + ") = " + ex + "</code><br>" +
          "<code>endY = " + sy + " + " + len + "·sin(" + deg(ang) + ") = " + ey + "</code>";
      }

      if (elScaleSlider && elScaleVal) {
        var pct = Math.round((fig.scale || 1) * 100);
        elScaleSlider.value = String(pct);
        elScaleVal.textContent = pct + "%";
      }
    }

    function renderRigTree() {
      if (!elRigTree) return;
      var fig = selectedFigure();
      if (!fig) {
        elRigTree.innerHTML = "";
        return;
      }
      var type = state.doc.types[fig.type] || state.doc.types[0];
      var html = "";
      for (var i = 0; i < type.segments.length; i++) {
        if (type.builtIn && i === 3) continue;
        var seg = type.segments[i];
        var label = type.builtIn && BUILTIN_SEG_NAMES[i]
          ? BUILTIN_SEG_NAMES[i]
          : i + " · Custom Bone (" + Math.round(seg.length) + "px)";
        var parentTag = seg.parent === 0 ? "root" : "←P" + (seg.parent - 1);
        var cls = "piv-tree-item" + (i === state.selectedSegIndex ? " is-selected" : "");
        html +=
          '<li class="' + cls + '" data-seg-index="' + i + '">' +
          '<span>' + label + '</span>' +
          '<span class="piv-tree-badge">' + parentTag + " · " + deg(fig.angles[i] || 0) + '</span>' +
          '</li>';
      }
      elRigTree.innerHTML = html;
    }

    function renderFilmstrip() {
      if (!elFramesScroll) return;
      var html = "";
      var w = state.doc.width || STAGE_W;
      var h = state.doc.height || STAGE_H;
      for (var i = 0; i < state.doc.frames.length; i++) {
        var cls = "piv-frame-thumb" + (i === state.frameIndex ? " is-active" : "");
        var svgInner = Piv.frameToSvg(state.doc, i);
        html +=
          '<button type="button" class="' + cls + '" data-frame-idx="' + i + '" aria-label="Frame ' + (i + 1) + '">' +
          '<span class="piv-frame-num">' + (i + 1) + '</span>' +
          '<svg viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="xMidYMid meet">' +
          '<line x1="0" y1="' + GROUND_Y + '" x2="' + w + '" y2="' + GROUND_Y + '" stroke="#cbd5e1" stroke-width="3"/>' +
          svgInner +
          '</svg>' +
          '</button>';
      }
      elFramesScroll.innerHTML = html;
    }

    function syncAll() {
      renderStage();
      renderFilmstrip();
      renderRigTree();
    }

    // Canvas pointer coordinate helper
    function getStageCoords(e) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = (state.doc.width || STAGE_W) / rect.width;
      var scaleY = (state.doc.height || STAGE_H) / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }

    function hitTestHandles(pt) {
      var fr = currentFrame();
      var best = null;
      var bestDist = 18; // hit radius in stage px

      // Check figures in reverse draw order (frontmost first)
      for (var fi = fr.figures.length - 1; fi >= 0; fi--) {
        var fig = fr.figures[fi];
        var dOrigin = Math.hypot(pt.x - fig.x, pt.y - fig.y);
        if (dOrigin <= bestDist) {
          return { kind: "origin", figIndex: fi, segIndex: 0 };
        }
        var joints = computeFigureJoints(state.doc, fig);
        for (var s = joints.segs.length - 1; s >= 0; s--) {
          if (joints.type.builtIn && s === 3) continue;
          var d = Math.hypot(pt.x - joints.endX[s], pt.y - joints.endY[s]);
          if (d < bestDist) {
            bestDist = d;
            best = { kind: "joint", figIndex: fi, segIndex: s };
          }
        }
      }
      return best;
    }

    canvas.addEventListener("pointerdown", function (e) {
      if (state.playing) {
        state.playing = false;
        if (elPlayBtn) elPlayBtn.textContent = "▶ Play";
      }
      var pt = getStageCoords(e);
      var hit = hitTestHandles(pt);
      if (hit) {
        state.selectedFigIndex = hit.figIndex;
        state.selectedSegIndex = hit.segIndex;
        state.dragging = hit;
        canvas.setPointerCapture(e.pointerId);
        renderStage();
        renderRigTree();
      }
    });

    canvas.addEventListener("pointermove", function (e) {
      var pt = getStageCoords(e);
      if (!state.dragging) return;
      var fr = currentFrame();
      var fig = fr.figures[state.dragging.figIndex];
      if (!fig) return;

      if (state.dragging.kind === "origin") {
        fig.x = Math.max(16, Math.min((state.doc.width || STAGE_W) - 16, pt.x));
        fig.y = Math.max(16, Math.min((state.doc.height || STAGE_H) - 16, pt.y));
        renderStage();
      } else if (state.dragging.kind === "joint") {
        var s = state.dragging.segIndex;
        var joints = computeFigureJoints(state.doc, fig);
        var sx = joints.startX[s];
        var sy = joints.startY[s];
        var newAngle = Math.atan2(pt.y - sy, pt.x - sx);
        var oldAngle = fig.angles[s] || 0;
        var delta = normAngle(newAngle - oldAngle);
        fig.angles[s] = newAngle;

        if (joints.type.builtIn && s === 2 && fig.angles.length > 3) {
          fig.angles[3] = normAngle(fig.angles[2] + Math.PI);
        }

        if (state.fkChain) {
          var desc = getDescendants(joints.segs, s);
          for (var d = 0; d < desc.length; d++) {
            var di = desc[d];
            if (joints.type.builtIn && di === 3) {
              fig.angles[3] = normAngle(fig.angles[2] + Math.PI);
            } else {
              fig.angles[di] = normAngle((fig.angles[di] || 0) + delta);
            }
          }
        }
        renderStage();
      }
    });

    function finishDrag() {
      if (state.dragging) {
        state.dragging = null;
        renderFilmstrip();
        renderRigTree();
      }
    }
    canvas.addEventListener("pointerup", finishDrag);
    canvas.addEventListener("pointercancel", finishDrag);

    // Click on filmstrip frame
    if (elFramesScroll) {
      elFramesScroll.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-frame-idx]");
        if (!btn) return;
        state.playing = false;
        if (elPlayBtn) elPlayBtn.textContent = "▶ Play";
        state.frameIndex = parseInt(btn.getAttribute("data-frame-idx"), 10) || 0;
        syncAll();
      });
    }

    // Click on rig tree item
    if (elRigTree) {
      elRigTree.addEventListener("click", function (e) {
        var item = e.target.closest("[data-seg-index]");
        if (!item) return;
        state.selectedSegIndex = parseInt(item.getAttribute("data-seg-index"), 10) || 0;
        renderStage();
        renderRigTree();
      });
    }

    // Add Frame (clones current pose into next frame)
    function addNextFrame() {
      var cur = currentFrame();
      var copy = cloneFrame(cur);
      state.doc.frames.splice(state.frameIndex + 1, 0, copy);
      state.frameIndex += 1;
      syncAll();
      showToast("Added Frame " + (state.frameIndex + 1) + " — pose your figure for the next step!");
    }

    // Auto-Tween: generate 3 interpolated in-between frames between previous and current frame
    function autoTweenFrames() {
      if (state.frameIndex < 1) {
        showToast("Select Frame 2 or later so Auto-Tween has a previous keyframe to blend from.");
        return;
      }
      var prev = state.doc.frames[state.frameIndex - 1];
      var next = state.doc.frames[state.frameIndex];
      var steps = 3;
      var inserted = [];
      for (var step = 1; step <= steps; step++) {
        var t = step / (steps + 1);
        var tweenFigs = next.figures.map(function (nf, idx) {
          var pf = prev.figures[idx];
          if (!pf || pf.type !== nf.type) return cloneFrame({ figures: [nf], order: [0] }).figures[0];
          var angles = new Float64Array(nf.angles.length);
          for (var a = 0; a < angles.length; a++) {
            angles[a] = lerpAngle(pf.angles[a] || 0, nf.angles[a] || 0, t);
          }
          return {
            id: nf.id,
            type: nf.type,
            scale: pf.scale + (nf.scale - pf.scale) * t,
            color: nf.color ? nf.color.slice() : null,
            angles: angles,
            x: pf.x + (nf.x - pf.x) * t,
            y: pf.y + (nf.y - pf.y) * t
          };
        });
        inserted.push({ figures: tweenFigs, order: next.order.slice() });
      }
      Array.prototype.splice.apply(
        state.doc.frames,
        [state.frameIndex, 0].concat(inserted)
      );
      state.frameIndex += inserted.length;
      syncAll();
      showToast("Inserted 3 smooth in-between frames using shortest-arc angle interpolation!");
    }

    // Button wiring helper
    function onClick(id, fn) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    }

    onClick("piv-btn-add-frame", addNextFrame);
    onClick("piv-btn-tween", autoTweenFrames);

    onClick("piv-btn-del-frame", function () {
      if (state.doc.frames.length <= 1) {
        showToast("An animation needs at least 1 frame.");
        return;
      }
      state.doc.frames.splice(state.frameIndex, 1);
      if (state.frameIndex >= state.doc.frames.length) {
        state.frameIndex = state.doc.frames.length - 1;
      }
      syncAll();
      showToast("Deleted frame.");
    });

    onClick("piv-btn-play", function () {
      state.playing = !state.playing;
      if (elPlayBtn) elPlayBtn.textContent = state.playing ? "⏸ Pause" : "▶ Play";
      state.lastTick = performance.now();
      renderStage();
    });

    onClick("piv-btn-prev", function () {
      state.playing = false;
      if (elPlayBtn) elPlayBtn.textContent = "▶ Play";
      state.frameIndex = (state.frameIndex - 1 + state.doc.frames.length) % state.doc.frames.length;
      syncAll();
    });

    onClick("piv-btn-next", function () {
      state.playing = false;
      if (elPlayBtn) elPlayBtn.textContent = "▶ Play";
      state.frameIndex = (state.frameIndex + 1) % state.doc.frames.length;
      syncAll();
    });

    onClick("piv-btn-fk", function (e) {
      state.fkChain = !state.fkChain;
      e.currentTarget.setAttribute("aria-pressed", String(state.fkChain));
      e.currentTarget.textContent = state.fkChain ? "FK Chain: ON" : "FK Chain: OFF";
      showToast(state.fkChain ? "FK Chain ON: child limbs follow their parent." : "Single-Bone Mode: only the dragged segment rotates.");
    });

    onClick("piv-btn-onion", function (e) {
      state.onionSkin = !state.onionSkin;
      e.currentTarget.setAttribute("aria-pressed", String(state.onionSkin));
      renderStage();
    });

    onClick("piv-btn-com", function (e) {
      state.showCoM = !state.showCoM;
      e.currentTarget.setAttribute("aria-pressed", String(state.showCoM));
      renderStage();
    });

    // Add Stick Figure / Prop
    onClick("piv-btn-add-stick", function () {
      var fr = currentFrame();
      var newId = fr.figures.length + 1;
      var palette = [[37, 99, 235], [220, 38, 38], [22, 163, 74], [147, 51, 234]];
      fr.figures.push({
        id: newId,
        type: 1,
        scale: 1,
        color: palette[(newId - 1) % palette.length],
        angles: makeStandingAngles(),
        x: 200 + ((newId * 75) % 280),
        y: 270
      });
      fr.order.push(fr.figures.length - 1);
      state.selectedFigIndex = fr.figures.length - 1;
      syncAll();
      showToast("Added Stick Figure #" + fr.figures.length + ".");
    });

    onClick("piv-btn-add-sword", function () {
      if (state.doc.types.length < 3) {
        state.doc.types = createPropTypes();
      }
      var fr = currentFrame();
      fr.figures.push({
        id: fr.figures.length + 1,
        type: 2,
        scale: 1,
        color: null,
        angles: new Float64Array([1.57, 0, -1.57]),
        x: STAGE_W / 2,
        y: 230
      });
      fr.order.push(fr.figures.length - 1);
      state.selectedFigIndex = fr.figures.length - 1;
      syncAll();
      showToast("Added Sword Prop to stage.");
    });

    onClick("piv-btn-add-ball", function () {
      if (state.doc.types.length < 4) {
        state.doc.types = createPropTypes();
      }
      var fr = currentFrame();
      fr.figures.push({
        id: fr.figures.length + 1,
        type: 3,
        scale: 1,
        color: [234, 88, 12],
        angles: new Float64Array([0]),
        x: STAGE_W / 2 + 60,
        y: 220
      });
      fr.order.push(fr.figures.length - 1);
      state.selectedFigIndex = fr.figures.length - 1;
      syncAll();
      showToast("Added Bouncing Sphere prop.");
    });

    onClick("piv-btn-flip", function () {
      var fig = selectedFigure();
      if (!fig) return;
      for (var i = 0; i < fig.angles.length; i++) {
        fig.angles[i] = normAngle(Math.PI - fig.angles[i]);
      }
      var type = state.doc.types[fig.type] || state.doc.types[0];
      if (type.builtIn && fig.angles.length > 3) {
        fig.angles[3] = normAngle(fig.angles[2] + Math.PI);
      }
      syncAll();
      showToast("Mirrored figure horizontally.");
    });

    onClick("piv-btn-reset-pose", function () {
      var fig = selectedFigure();
      if (!fig) return;
      var type = state.doc.types[fig.type] || state.doc.types[0];
      if (type.builtIn) {
        fig.angles = makeStandingAngles();
      } else {
        for (var i = 0; i < fig.angles.length; i++) fig.angles[i] = 0;
      }
      syncAll();
      showToast("Reset figure to neutral standing pose.");
    });

    onClick("piv-btn-del-fig", function () {
      var fr = currentFrame();
      if (fr.figures.length <= 1) {
        showToast("Keep at least one figure on the stage.");
        return;
      }
      fr.figures.splice(state.selectedFigIndex, 1);
      fr.order = fr.figures.map(function (_, i) { return i; });
      state.selectedFigIndex = Math.max(0, state.selectedFigIndex - 1);
      syncAll();
      showToast("Removed selected figure from frame.");
    });

    // Custom Segment Builder button (adds a custom bone attached to the selected segment)
    onClick("piv-btn-add-bone", function () {
      var fig = selectedFigure();
      if (!fig) return;
      var baseType = state.doc.types[fig.type] || state.doc.types[0];
      // Clone into a custom figure type if currently using built-in
      var customType = {
        name: "Custom Rig",
        builtIn: false,
        order: baseType.order.slice(),
        segments: baseType.segments.map(function (s) {
          return Object.assign({}, s, { color: s.color ? s.color.slice() : [0, 0, 0] });
        })
      };
      var parentOneBased = state.selectedSegIndex + 1;
      customType.segments.push({
        length: 44,
        restAngle: -0.6,
        thickness: 10,
        parent: parentOneBased,
        isCircle: false,
        isFilled: false,
        color: [234, 88, 12]
      });
      customType.order.push(customType.segments.length - 1);
      var newTypeIdx = state.doc.types.length;
      state.doc.types.push(customType);

      // Upgrade matching figures across frames
      fig.type = newTypeIdx;
      var nextAngles = new Float64Array(customType.segments.length);
      nextAngles.set(fig.angles);
      nextAngles[nextAngles.length - 1] = -2.4;
      fig.angles = nextAngles;
      state.selectedSegIndex = customType.segments.length - 1;
      syncAll();
      showToast("Attached new custom bone to Segment " + (parentOneBased - 1) + "!");
    });

    // Color swatches
    var swatchWrap = document.getElementById("piv-swatches");
    if (swatchWrap) {
      swatchWrap.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-rgb]");
        if (!btn) return;
        var fig = selectedFigure();
        if (!fig) return;
        var parts = btn.getAttribute("data-rgb").split(",").map(Number);
        fig.color = parts;
        swatchWrap.querySelectorAll(".piv-swatch").forEach(function (s) {
          s.classList.toggle("is-active", s === btn);
        });
        syncAll();
      });
    }

    if (elFpsSlider) {
      elFpsSlider.addEventListener("input", function () {
        state.doc.fps = parseInt(elFpsSlider.value, 10) || 12;
        if (elFpsVal) elFpsVal.textContent = state.doc.fps + " FPS";
        renderStage();
      });
    }

    if (elScaleSlider) {
      elScaleSlider.addEventListener("input", function () {
        var fig = selectedFigure();
        if (!fig) return;
        var pct = parseInt(elScaleSlider.value, 10) || 100;
        fig.scale = pct / 100;
        if (elScaleVal) elScaleVal.textContent = pct + "%";
        syncAll();
      });
    }

    // Preset selector
    var elPresetSelect = document.getElementById("piv-preset-select");
    if (elPresetSelect) {
      elPresetSelect.addEventListener("change", function () {
        var val = elPresetSelect.value;
        state.playing = false;
        if (elPlayBtn) elPlayBtn.textContent = "▶ Play";
        state.frameIndex = 0;
        state.selectedFigIndex = 0;
        if (val === "walk") {
          state.doc = buildWalkPreset();
          syncAll();
          showToast("Loaded 8-Frame Walk Cycle preset.");
        } else if (val === "jump") {
          state.doc = buildJumpPreset();
          syncAll();
          showToast("Loaded Anticipation, Jump & Landing Squash preset.");
        } else if (val === "martial") {
          state.doc = buildMartialArtsPreset();
          syncAll();
          showToast("Loaded Two-Figure Martial Arts Kick preset.");
        } else if (val.indexOf("piv:") === 0) {
          var path = val.slice(4);
          fetch(path)
            .then(function (r) {
              if (!r.ok) throw new Error("HTTP " + r.status);
              return r.arrayBuffer();
            })
            .then(function (buf) {
              return Piv.decodePiv(new Uint8Array(buf));
            })
            .then(function (doc) {
              state.doc = doc;
              state.frameIndex = 0;
              state.selectedFigIndex = 0;
              if (elFpsSlider) elFpsSlider.value = String(doc.fps || 12);
              if (elFpsVal) elFpsVal.textContent = (doc.fps || 12) + " FPS";
              syncAll();
              showToast("Loaded classroom .piv file (" + doc.frames.length + " frames)!");
            })
            .catch(function (err) {
              showToast("Could not load .piv file: " + err.message);
            });
        }
      });
    }

    // Open local .piv file
    var elFileInput = document.getElementById("piv-file-input");
    onClick("piv-btn-open-file", function () {
      if (elFileInput) elFileInput.click();
    });
    if (elFileInput) {
      elFileInput.addEventListener("change", function () {
        var file = elFileInput.files && elFileInput.files[0];
        if (!file) return;
        file.arrayBuffer().then(function (buf) {
          return Piv.decodePiv(new Uint8Array(buf));
        }).then(function (doc) {
          state.doc = doc;
          state.frameIndex = 0;
          state.selectedFigIndex = 0;
          syncAll();
          showToast("Opened " + file.name + " (" + doc.frames.length + " frames)!");
        }).catch(function (err) {
          showToast("Could not parse .piv file: " + err.message);
        });
      });
    }

    // Export binary .piv file
    onClick("piv-btn-save-piv", function () {
      Piv.encodePiv(state.doc).then(function (bytes) {
        var blob = new Blob([bytes], { type: "application/octet-stream" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "my-stick-animation.piv";
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        showToast("Saved my-stick-animation.piv (" + state.doc.frames.length + " frames)!");
      }).catch(function (err) {
        showToast("Export error: " + err.message);
      });
    });

    // Export Horizontal PNG Sprite Sheet (ready for 2D Game Dev pathway)
    onClick("piv-btn-export-spritesheet", function () {
      var count = state.doc.frames.length;
      var cellW = 230;
      var cellH = 140;
      var sheet = document.createElement("canvas");
      sheet.width = cellW * count;
      sheet.height = cellH;
      var sctx = sheet.getContext("2d");
      var scaleX = cellW / (state.doc.width || STAGE_W);
      var scaleY = cellH / (state.doc.height || STAGE_H);
      for (var i = 0; i < count; i++) {
        sctx.save();
        sctx.translate(i * cellW, 0);
        sctx.scale(scaleX, scaleY);
        Piv.drawFrame(sctx, state.doc, i, { background: null });
        sctx.restore();
      }
      sheet.toBlob(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "stick-figure-spritesheet-" + count + "f.png";
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        showToast("Exported transparent PNG Sprite Sheet (" + count + " frames)!");
      }, "image/png");
    });

    // Keyboard shortcut: Spacebar adds frame when studio is focused
    window.addEventListener("keydown", function (e) {
      var active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) {
        return;
      }
      if (e.code === "Space" && e.target === document.body) {
        var rect = canvas.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          e.preventDefault();
          addNextFrame();
        }
      }
    });

    // Playback animation loop
    function tick(now) {
      if (state.playing) {
        var interval = 1000 / Math.max(1, state.doc.fps || 12);
        if (now - state.lastTick >= interval) {
          state.lastTick = now;
          state.frameIndex = (state.frameIndex + 1) % state.doc.frames.length;
          renderStage();
          if (elFramesScroll) {
            var thumbs = elFramesScroll.querySelectorAll(".piv-frame-thumb");
            thumbs.forEach(function (t, idx) {
              t.classList.toggle("is-active", idx === state.frameIndex);
            });
          }
        }
      }
      requestAnimationFrame(tick);
    }

    syncAll();
    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStudio);
  } else {
    initStudio();
  }
})();
