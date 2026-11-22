/* Original canvas artwork for the robotics lessons. Draw in simulation units
   so lighting, paint and shadows leave hit targets and sensor math intact. */
(function (global) {
  'use strict';

  function gradient(ctx, x0, y0, x1, y1, colors) {
    const paint = ctx.createLinearGradient(x0, y0, x1, y1);
    colors.forEach((color, i) => paint.addColorStop(i / (colors.length - 1), color));
    return paint;
  }

  function plate(ctx, x, y, w, h, r, fill, edge, weight = 1) {
    if (w <= 0 || h <= 0) return;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    ctx.fillStyle = fill;
    ctx.fill();
    if (edge) {
      ctx.strokeStyle = edge;
      ctx.lineWidth = weight;
      ctx.stroke();
    }
  }

  function disc(ctx, x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function shadow(ctx, x, y, rx, ry, opacity = 0.44) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    shade.addColorStop(0.18, 'rgba(3,10,19,' + opacity + ')');
    shade.addColorStop(1, 'rgba(3,10,19,0)');
    disc(ctx, 0, 0, 1, shade);
    ctx.restore();
  }

  function floor(ctx, w, h, { x = 0, y = 0, step = 24, light = false, frame = false } = {}) {
    if (w <= 0 || h <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    const wash = ctx.createRadialGradient(w * .35, h * .33, 0, w * .35, h * .33, Math.max(w, h) * .78);
    wash.addColorStop(0, light ? '#f0ede1' : '#234451');
    wash.addColorStop(1, light ? '#c9cec3' : '#101e29');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    if (step > 0) {
      for (const major of [false, true]) {
        ctx.beginPath();
        for (let i = 1; i * step < w; i++) {
          if ((i % 4 === 0) !== major) continue;
          ctx.moveTo(i * step, 0);
          ctx.lineTo(i * step, h);
        }
        for (let i = 1; i * step < h; i++) {
          if ((i % 4 === 0) !== major) continue;
          ctx.moveTo(0, i * step);
          ctx.lineTo(w, i * step);
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = light
          ? (major ? '#516d6933' : '#516d6919')
          : (major ? '#a2deef29' : '#a2deef12');
        ctx.stroke();
      }
    }
    if (frame) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = light ? '#536c6a' : '#6496a2';
      ctx.strokeRect(1, 1, w - 2, h - 2);
    }
    ctx.restore();
  }

  // The shaded edges are inset, so the visible top matches the collision footprint.
  function barrier(ctx, x, y, w, h, material = 'steel') {
    if (w <= 0 || h <= 0) return;
    const wood = material === 'wood';
    const rim = Math.min(4, w / 5, h / 5);
    ctx.save();
    shadow(ctx, x + w / 2 + 3, y + h / 2 + 4, w / 2 + 8, h / 2 + 8);
    plate(ctx, x, y, w, h, 2,
      gradient(ctx, x, y, x + w * .25, y + h, wood ? ['#edc88e', '#bd8958', '#7d5237'] : ['#89a6ab', '#48676e', '#253e4c']),
      wood ? '#63442f' : '#12252e');
    ctx.fillStyle = '#ffffff44';
    ctx.fillRect(x + rim, y + rim, w - 2 * rim, 1);
    ctx.fillStyle = '#00000033';
    ctx.fillRect(x + rim, y + h - rim - 1, w - 2 * rim, 1);
    if (Math.min(w, h) >= 19) {
      for (const bx of [x + rim * 2, x + w - rim * 2]) {
        for (const by of [y + rim * 2, y + h - rim * 2]) disc(ctx, bx, by, 1.4, '#24343b');
      }
    }
    ctx.restore();
  }

  function sonar(ctx, x, y, heading, reach, halfAngle, near) {
    if (reach <= 0) return;
    ctx.save();
    const glow = ctx.createRadialGradient(x, y, 0, x, y, reach);
    glow.addColorStop(0, near ? '#ff967447' : '#79d9ff4a');
    glow.addColorStop(.8, near ? '#ff967420' : '#79d9ff22');
    glow.addColorStop(1, near ? '#ff96744c' : '#79d9ff4a');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, reach, heading - halfAngle, heading + halfAngle);
    ctx.closePath();
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.strokeStyle = near ? '#ffac92a8' : '#9ae6ff9c';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(heading) * reach, y + Math.sin(heading) * reach);
    ctx.stroke();
    ctx.restore();
  }

  // The front of every rover points along local +X. Use a normalized sprite
  // so the same surface details work for map markers and large previews.
  function rover(ctx, x, y, a, r, { body = '#2193b1', outline = '#bfe6ef', ghost = 1, face, light = '#ffcf64', sensor = 'bar', car = false, pan = 0, led } = {}) {
    ctx.save();
    ctx.globalAlpha *= ghost;
    shadow(ctx, x + r * .16, y + r * .23, r * 1.43, r * 1.31);
    ctx.translate(x, y);
    ctx.rotate(a || 0);
    ctx.scale(r, r);
    for (const side of [-1, 1]) {
      const wy = side < 0 ? -1.08 : .65;
      for (const tx of car ? [-.81, .37] : [-.68]) {
        const tw = car ? .44 : 1.21;
        plate(ctx, tx, wy, tw, .43, .11, gradient(ctx, 0, wy, 0, wy + .43, ['#465561', '#070d14']));
        for (let t = tx + .08; t < tx + tw - .035; t += .12) {
          ctx.beginPath();
          ctx.moveTo(t, wy + .055);
          ctx.lineTo(t - .035, wy + .35);
          ctx.strokeStyle = '#a5bac245';
          ctx.lineWidth = .032;
          ctx.stroke();
        }
      }
    }
    const shell = gradient(ctx, -.7, -.9, .8, .9, ['#ecf6f633', '#ffffff00', '#07172090']);
    if (car) {
      plate(ctx, -1, -.74, 2, 1.48, .28, body, outline, .075);
      plate(ctx, -1, -.74, 2, 1.48, .28, shell);
    } else {
      disc(ctx, 0, 0, .98, body);
      disc(ctx, 0, 0, .98, shell);
      ctx.strokeStyle = outline;
      ctx.lineWidth = .085;
      ctx.stroke();
    }
    if (face) {
      plate(ctx, -.56, -.48, 1.06, .96, .26, '#122734', '#d3f5ff6b', .04);
      disc(ctx, .19, -.22, .095, '#bceaf3');
      disc(ctx, .19, .22, .095, '#bceaf3');
      ctx.beginPath();
      ctx.moveTo(-.22, -.21);
      ctx.quadraticCurveTo(face === 'oops' ? -.06 : -.44, 0, -.22, .21);
      ctx.strokeStyle = '#bceaf3';
      ctx.lineWidth = .065;
      ctx.stroke();
    } else {
      plate(ctx, -.60, -.41, .66, .82, .11, '#17353f', '#d0f3f266', .035);
      for (const sign of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = '#e3c98b';
          ctx.fillRect(-.53 + i * .13, sign * .28 - .045, .064, .09);
        }
      }
      plate(ctx, -.45, -.15, .34, .30, .04, '#091720');
      disc(ctx, -.48, .24, .055, led || '#bce76a');
    }
    for (const sy of [-.53, .53]) disc(ctx, -.43, sy, .055, '#d8e4e6');
    if (sensor === 'bump') {
      ctx.beginPath();
      ctx.arc(0, 0, 1.08, -.89, .89);
      ctx.strokeStyle = light;
      ctx.lineWidth = .18;
      ctx.stroke();
    } else if (sensor === 'sonar') {
      ctx.save();
      ctx.translate(car ? .77 : .61, 0);
      ctx.rotate(pan);
      plate(ctx, -.17, -.50, .34, 1, .1, '#112632');
      for (const sy of [-.25, .25]) {
        disc(ctx, .035, sy, .18, '#d2e6e9');
        disc(ctx, .055, sy, .117, '#344e5a');
        disc(ctx, .087, sy - .035, .039, light);
      }
      ctx.restore();
    } else {
      plate(ctx, .65, -.31, .16, .62, .06, light);
    }
    ctx.restore();
  }

  function link(ctx, a, b, w, color) {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (!length) return;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
    plate(ctx, -w * .43, -w * .39, length + w * .9, w, w / 2, '#08141dc9');
    plate(ctx, -w / 2, -w / 2, length + w, w, w / 2, color, '#3b2926', 1.4);
    plate(ctx, -w / 2, -w / 2, length + w, w, w / 2,
      gradient(ctx, 0, -w / 2, 0, w / 2, ['#fff2ca8c', '#ffffff00', '#1c13196b']));
    plate(ctx, w * .55, -w * .12, length - w * 1.1, w * .24, w * .12, '#14273777');
    ctx.restore();
  }

  function joint(ctx, x, y, r) {
    ctx.save();
    disc(ctx, x + 1, y + 2, r + 1, '#09141b');
    disc(ctx, x, y, r, gradient(ctx, x - r, y - r, x + r, y + r, ['#fff2ae', '#da9c46', '#754529']));
    disc(ctx, x, y, r * .57, '#344852');
    disc(ctx, x, y, r * .35, gradient(ctx, x - r, y - r, x + r, y + r, ['#e4f2f6', '#637c86']));
    ctx.strokeStyle = '#25343d';
    ctx.lineWidth = Math.max(1, r * .12);
    ctx.beginPath();
    ctx.moveTo(x - r * .21, y + r * .11);
    ctx.lineTo(x + r * .21, y - r * .11);
    ctx.stroke();
    ctx.restore();
  }

  global.RoboticsVisuals = { gradient, plate, disc, shadow, floor, barrier, sonar, rover, link, joint };
})(window);
