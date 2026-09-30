/* VideoFX: shared "signal treatment" helpers for lessons that bend a picture the
   way analog video artists (Nam June Paik) and demo coders do. Every function works
   on plain RGBA byte arrays (Uint8ClampedArray, length W*H*4), so it runs with no
   canvas and no build step. Pipeline order matches a real set:

     picture → peel (décollage) → magnetWarp → scramble → zenDraw (sweep squeeze)

   Used by lessons/computer-science/graphics-and-games/demoscene.html. The Paik
   TV Lab (assets/js/lessons/nam-june-paik-lab.js) has the same algorithms inline
   and can migrate to this file whenever that lesson is next touched. */
(function (global) {
  'use strict';
  if (global.VideoFX) return;

  /* Magnet: every output pixel is resampled from a position rotated around (mx, my).
     The rotation angle falls off as a Gaussian, so lines swirl near the magnet and
     settle far away. Returns false (and writes nothing) when the strength is ~0. */
  function magnetWarp(src, dst, W, H, mx, my, strength, radius) {
    if (Math.abs(strength) < 0.01) return false;
    var R2 = radius * radius;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var dx = x - mx, dy = y - my;
        var a = strength * Math.exp(-(dx * dx + dy * dy) / R2);
        var ca = Math.cos(a), sa = Math.sin(a);
        var sx = Math.round(mx + dx * ca - dy * sa), sy = Math.round(my + dx * sa + dy * ca);
        var o = (y * W + x) * 4;
        if (sx < 0 || sy < 0 || sx >= W || sy >= H) { dst[o] = dst[o + 1] = dst[o + 2] = 0; dst[o + 3] = 255; }
        else { var s = (sy * W + sx) * 4; dst[o] = src[s]; dst[o + 1] = src[s + 1]; dst[o + 2] = src[s + 2]; dst[o + 3] = 255; }
      }
    }
    return true;
  }

  /* Signal scramble + scan lines. amount 0..1. Tears bands of rows sideways, rolls the
     picture vertically past 0.6, drifts red/blue apart, and sprinkles static.
     With amount 0 it only lays the dark scan lines over the picture. */
  function scramble(src, out, W, H, amount, t) {
    var sc = amount;
    var roll = sc > 0.6 ? Math.floor((t * 30 * sc) % H) : 0;
    var split = Math.round(sc * 8), tear = sc * 40, band = 0;
    for (var y = 0; y < H; y++) {
      if (y % 12 === 0) band = Math.random() < sc * 0.55 ? (Math.random() - 0.5) * tear * 2 : 0;
      var shift = sc > 0 ? Math.round(band + (Math.random() - 0.5) * sc * 6) : 0;
      var sy = (y + roll) % H;
      var line = (y & 1 ? 0.74 : 1) * (0.92 + 0.08 * Math.sin((y / H - t * 0.35) * Math.PI * 2));
      for (var x = 0; x < W; x++) {
        var o = (y * W + x) * 4;
        if (sc === 0) {
          out[o] = src[o] * line; out[o + 1] = src[o + 1] * line; out[o + 2] = src[o + 2] * line;
        } else {
          for (var c = 0; c < 3; c++) {
            var sx = x - shift + (c === 0 ? -split : c === 2 ? split : 0);
            sx = ((sx % W) + W) % W;
            out[o + c] = src[(sy * W + sx) * 4 + c] * line;
          }
          if (Math.random() < sc * 0.02) out[o] = out[o + 1] = out[o + 2] = 120 + Math.random() * 135;
        }
        out[o + 3] = 255;
      }
    }
  }

  /* Décollage: `mask` (Float32Array W*H) marks pixels torn away. Stamp a ragged disc
     into it, or drag a line of stamps; composite() shows `under` wherever mask > 0.5. */
  function peelStamp(mask, W, H, px, py, r) {
    var r2 = r * r;
    var x0 = Math.max(0, Math.floor(px - r * 1.4)), x1 = Math.min(W - 1, Math.ceil(px + r * 1.4));
    var y0 = Math.max(0, Math.floor(py - r * 1.4)), y1 = Math.min(H - 1, Math.ceil(py + r * 1.4));
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var dx = x - px, dy = y - py;
        // Jitter the radius by position so the edge looks torn, not cut.
        var j = 1 + 0.35 * Math.sin(x * 0.9 + y * 1.3) * Math.cos(y * 0.7 - x * 0.4);
        if (dx * dx + dy * dy <= r2 * j * j) mask[y * W + x] = 1;
      }
    }
  }

  function peelLine(mask, W, H, from, to, r) {
    if (!from) { peelStamp(mask, W, H, to.x, to.y, r); return; }
    var steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 3));
    for (var i = 1; i <= steps; i++) {
      peelStamp(mask, W, H, from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps, r);
    }
  }

  function healMask(mask, amount) {
    for (var i = 0; i < mask.length; i++) if (mask[i] > 0) mask[i] = Math.max(0, mask[i] - amount);
  }

  function peelComposite(top, under, mask, dst) {
    for (var q = 0, n = mask.length; q < n; q++) {
      var s = mask[q] > 0.5 ? under : top, k = q * 4;
      dst[k] = s[k]; dst[k + 1] = s[k + 1]; dst[k + 2] = s[k + 2]; dst[k + 3] = 255;
    }
  }

  /* Zen for TV: kill the sideways sweep and every row lands in one column. `s` is the
     remaining sweep width, 1 = full picture, 0 = a single glowing line. `mid` is a
     canvas holding the finished W×H picture, `data` its pixels (for row averages),
     `avg` a 1×H scratch canvas. Draws onto ctx (cw × ch). */
  function zenDraw(ctx, cw, ch, mid, data, W, H, s, t, avg) {
    var bandW = Math.max(3, s * cw), x0 = (cw - bandW) / 2;
    var wobble = Math.sin(t * 40) * 0.6 * (1 - s);
    ctx.globalAlpha = Math.min(1, s * 2.2);
    ctx.drawImage(mid, 0, 0, W, H, x0, 0, bandW, ch);
    if (s < 0.62) {
      // Fully squeezed rows blend to their average color.
      var actx = avg.getContext('2d');
      for (var y = 0; y < H; y++) {
        var r = 0, g = 0, b = 0;
        for (var x = 0; x < W; x++) { var k = (y * W + x) * 4; r += data[k]; g += data[k + 1]; b += data[k + 2]; }
        actx.fillStyle = 'rgb(' + Math.round(r / W) + ',' + Math.round(g / W) + ',' + Math.round(b / W) + ')';
        actx.fillRect(0, y, 1, 1);
      }
      ctx.globalAlpha = Math.max(0, 1 - s * 1.6);
      ctx.drawImage(avg, 0, 0, 1, H, x0 + wobble, 0, bandW, ch);
    }
    ctx.globalAlpha = 1;
    // The same beam energy lands on a thinner strip, so it glows harder.
    var boost = Math.min(1, (1 - s) * 1.2);
    if (boost > 0.02) {
      var cx = cw / 2 + wobble, gl = ctx.createLinearGradient(cx - 18, 0, cx + 18, 0);
      gl.addColorStop(0, 'rgba(255,255,255,0)');
      gl.addColorStop(0.5, 'rgba(255,255,255,' + 0.55 * boost + ')');
      gl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(cx - 18, 0, 36, ch);
      ctx.fillStyle = 'rgba(255,255,255,' + 0.9 * boost + ')';
      ctx.fillRect(cx - 1.5, 0, 3, ch);
    }
  }

  global.VideoFX = {
    magnetWarp: magnetWarp, scramble: scramble,
    peelStamp: peelStamp, peelLine: peelLine, healMask: healMask, peelComposite: peelComposite,
    zenDraw: zenDraw
  };
})(window);
