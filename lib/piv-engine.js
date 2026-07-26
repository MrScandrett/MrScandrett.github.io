/*
 * piv-engine — reads Pivot Animator ".piv" files and turns a frame into draw ops.
 *
 * Runs unchanged in Node (build-time thumbnails) and in the browser (the player).
 * Nothing here touches the DOM; `drawFrame` just needs a canvas 2D-ish context.
 *
 * ── File layout (version 5, little-endian) ────────────────────────────────────
 *   u8   version            always 5 here; anything else is rejected
 *   i32  width, i32 height  stage size in px
 *   u8, u8                  unread (1, 0 in every file we have)
 *   u16  typeCount          figure types, *including* the 2 built-ins
 *
 *   (typeCount - 2) figure definitions, each:
 *     u8   fieldMask        bit set = that per-segment field is omitted
 *     u16  segCount
 *     u16  parent of segment 0
 *     segCount segment records:
 *       f32 length; f64 restAngle; f32 thickness
 *       u8  isCircle          if !(mask & 0x01)
 *       u8  isFilled          if !(mask & 0x02)
 *       u8  r, g, b           if !(mask & 0x04)
 *       u16 parent of the NEXT segment   if !(mask & 0x40)
 *     u16  spare parent slot (the shifted-by-one table runs off the end)
 *     u16  drawOrder[segCount]           if !(mask & 0x10)
 *     u8   nameLength; name bytes
 *
 *   i32  frameCount
 *   frameCount frames, each:
 *     i32 (1), u8 (0), u16 figureCount
 *     figureCount figure records:
 *       u16 figureId; u8, u8; u16 typeIndex; f32 scale
 *       u8  r, g, b, colorOverrideFlag, u8
 *       f64 angle[segCount of that type]
 *       f32 x, f32 y          stage position of the figure's origin
 *       u8[5]
 *     u16 drawOrder[figureCount]
 *     u8  (1)
 *
 *   u8   framesPerSecond
 *   i32  (0)
 *
 * Parent values are 1-based with a twist: 0 means "the figure origin", and v > 0
 * means "the far end of segment v-1". They are stored shifted one slot late, so
 * segment 0's parent lives in the figure header and each record carries the
 * parent of the segment after it.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PivEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Mask bits we know the width of. If any other bit is *clear* the file wants a
  // field we've never seen, and we'd silently desync — so we bail instead.
  var KNOWN_MASK_BITS = 0x01 | 0x02 | 0x04 | 0x10 | 0x40;
  var UNKNOWN_MASK_BITS = 0xff & ~KNOWN_MASK_BITS; // 0x08 | 0x20 | 0x80

  // Pivot's built-in stick figure. Not stored in the file, so it's reconstructed
  // here from a saved copy of it (Cooper's "rocet" is this figure plus 3 extra
  // segments). length, thickness, parent.
  var DEFAULT_FIGURE = [
    [32, 14, 0], // lower spine, from the hip
    [32, 14, 1], // upper spine
    [33, 14, 2], // neck
    [20, 20, 3], // head (circle, filled)
    [38, 14, 2], // upper arm
    [38, 14, 2], // upper arm
    [40, 14, 5], // forearm
    [40, 14, 6], // forearm
    [50, 14, 0], // thigh
    [50, 14, 0], // thigh
    [50, 14, 9], // shin
    [50, 14, 10], // shin
  ];

  function defaultFigureType() {
    return {
      name: "Stick figure",
      builtIn: true,
      order: DEFAULT_FIGURE.map(function (_, i) {
        return i;
      }),
      segments: DEFAULT_FIGURE.map(function (s, i) {
        return {
          length: s[0],
          restAngle: 0,
          thickness: s[1],
          parent: s[2],
          isCircle: i === 3,
          isFilled: i === 3,
          color: [0, 0, 0],
        };
      }),
    };
  }

  function Reader(bytes) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.pos = 0;
  }
  Reader.prototype.need = function (n) {
    if (this.pos + n > this.bytes.length) throw new Error("Pivot file ended early");
  };
  Reader.prototype.u8 = function () {
    this.need(1);
    return this.bytes[this.pos++];
  };
  Reader.prototype.u16 = function () {
    this.need(2);
    var v = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  };
  Reader.prototype.i32 = function () {
    this.need(4);
    var v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  };
  Reader.prototype.f32 = function () {
    this.need(4);
    var v = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return v;
  };
  Reader.prototype.f64 = function () {
    this.need(8);
    var v = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return v;
  };
  Reader.prototype.skip = function (n) {
    this.need(n);
    this.pos += n;
  };
  Reader.prototype.str = function () {
    var n = this.u8();
    this.need(n);
    var out = "";
    for (var i = 0; i < n; i++) out += String.fromCharCode(this.bytes[this.pos + i]);
    this.pos += n;
    return out;
  };

  function readFigureType(r) {
    var mask = r.u8();
    if ((mask & UNKNOWN_MASK_BITS) !== UNKNOWN_MASK_BITS) {
      // A clear bit means the field is present, and we can't size these ones.
      throw new Error("Unsupported Pivot figure variant (field mask 0x" + mask.toString(16) + ")");
    }
    var segCount = r.u16();
    var nextParent = r.u16();
    var segments = [];
    for (var i = 0; i < segCount; i++) {
      var length = r.f32();
      var restAngle = r.f64();
      var thickness = r.f32();
      var isCircle = mask & 0x01 ? 0 : r.u8();
      var isFilled = mask & 0x02 ? 0 : r.u8();
      var color = [0, 0, 0];
      if (!(mask & 0x04)) color = [r.u8(), r.u8(), r.u8()];
      var parent = nextParent;
      if (!(mask & 0x40)) nextParent = r.u16();
      segments.push({
        length: length,
        restAngle: restAngle,
        thickness: thickness,
        parent: parent,
        isCircle: !!isCircle,
        isFilled: !!isFilled,
        color: color,
      });
    }
    r.skip(2); // spare parent slot
    var order = [];
    if (!(mask & 0x10)) {
      for (var j = 0; j < segCount; j++) order.push(r.u16());
    } else {
      for (var k = 0; k < segCount; k++) order.push(k);
    }
    return { name: r.str(), builtIn: false, order: order, segments: segments };
  }

  /**
   * Parse decompressed .piv bytes.
   * @param {Uint8Array} bytes
   * @returns {{version:number,width:number,height:number,fps:number,types:Array,frames:Array}}
   */
  function parsePiv(bytes) {
    var r = new Reader(bytes);
    var version = r.u8();
    if (version !== 5) {
      throw new Error("Unsupported Pivot file version " + version + " (expected 5)");
    }
    var width = r.i32();
    var height = r.i32();
    r.skip(2);
    var typeCount = r.u16();
    if (typeCount < 2 || typeCount > 4096) throw new Error("Implausible figure-type count");

    var types = [defaultFigureType(), defaultFigureType()];
    for (var t = 2; t < typeCount; t++) types.push(readFigureType(r));

    var frameCount = r.i32();
    if (frameCount < 0 || frameCount > 1000000) throw new Error("Implausible frame count");

    var frames = [];
    for (var f = 0; f < frameCount; f++) {
      r.skip(5); // i32 (1) + u8 (0)
      var figureCount = r.u16();
      var figures = [];
      for (var g = 0; g < figureCount; g++) {
        var id = r.u16();
        r.skip(2);
        var typeIndex = r.u16();
        var scale = r.f32();
        var cr = r.u8(), cg = r.u8(), cb = r.u8(), override = r.u8();
        r.skip(1);
        var type = types[typeIndex];
        if (!type) throw new Error("Frame " + f + " references unknown figure type " + typeIndex);
        var angles = new Float64Array(type.segments.length);
        for (var a = 0; a < angles.length; a++) angles[a] = r.f64();
        var x = r.f32();
        var y = r.f32();
        r.skip(5);
        figures.push({
          id: id,
          type: typeIndex,
          scale: scale,
          color: override ? [cr, cg, cb] : null,
          angles: angles,
          x: x,
          y: y,
        });
      }
      var order = [];
      for (var o = 0; o < figureCount; o++) order.push(r.u16());
      r.skip(1);
      frames.push({ figures: figures, order: order });
    }

    var fps = r.pos < bytes.length ? r.u8() : 12;
    if (!(fps > 0 && fps <= 120)) fps = 12;

    return {
      version: version,
      width: width,
      height: height,
      fps: fps,
      types: types,
      frames: frames,
    };
  }

  function rgb(c) {
    return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
  }

  /**
   * Flatten one frame into renderer-agnostic draw ops, back to front.
   * Line ops are {kind:"line", x1,y1,x2,y2, width, color}.
   * Circle ops are {kind:"circle", cx,cy,r, width, color, filled}.
   */
  function frameOps(doc, frameIndex) {
    var frame = doc.frames[frameIndex];
    var ops = [];
    if (!frame) return ops;

    var order = frame.order.length === frame.figures.length
      ? frame.order
      : frame.figures.map(function (_, i) { return i; });

    for (var oi = 0; oi < order.length; oi++) {
      var fig = frame.figures[order[oi]];
      if (!fig) continue;
      var type = doc.types[fig.type];
      if (!type) continue;
      var segs = type.segments;
      var scale = fig.scale || 1;

      // Walk segments in index order so a parent's endpoint is always known
      // before its children need it; draw order only affects painting.
      var endX = new Float64Array(segs.length);
      var endY = new Float64Array(segs.length);
      var startX = new Float64Array(segs.length);
      var startY = new Float64Array(segs.length);
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

      var segOrder = type.order.length === segs.length
        ? type.order
        : segs.map(function (_, i) { return i; });

      for (var so = 0; so < segOrder.length; so++) {
        var i = segOrder[so];
        var seg = segs[i];
        if (!seg) continue;
        var color = rgb(fig.color || seg.color);
        var width = Math.max(1, seg.thickness * scale);
        if (seg.isCircle) {
          ops.push({
            kind: "circle",
            cx: (startX[i] + endX[i]) / 2,
            cy: (startY[i] + endY[i]) / 2,
            r: (seg.length * scale) / 2,
            width: width,
            color: color,
            filled: seg.isFilled,
          });
        } else {
          ops.push({
            kind: "line",
            x1: startX[i], y1: startY[i],
            x2: endX[i], y2: endY[i],
            width: width,
            color: color,
          });
        }
      }
    }
    return ops;
  }

  /** Paint a frame onto a canvas 2D context, including the white stage. */
  function drawFrame(ctx, doc, frameIndex, options) {
    var opts = options || {};
    var background = opts.background === undefined ? "#ffffff" : opts.background;
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, doc.width, doc.height);
    } else {
      ctx.clearRect(0, 0, doc.width, doc.height);
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    var ops = frameOps(doc, frameIndex);
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (op.kind === "line") {
        ctx.strokeStyle = op.color;
        ctx.lineWidth = op.width;
        ctx.beginPath();
        ctx.moveTo(op.x1, op.y1);
        ctx.lineTo(op.x2, op.y2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(op.cx, op.cy, Math.max(0.5, op.r), 0, Math.PI * 2);
        if (op.filled) {
          ctx.fillStyle = op.color;
          ctx.fill();
        }
        ctx.strokeStyle = op.color;
        ctx.lineWidth = op.width;
        ctx.stroke();
      }
    }
  }

  function num(n) {
    return Math.round(n * 100) / 100;
  }

  /** Render a frame as SVG elements (no <svg> wrapper) — used for thumbnails. */
  function frameToSvg(doc, frameIndex) {
    var ops = frameOps(doc, frameIndex);
    var out = [];
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (op.kind === "line") {
        out.push(
          '<line x1="' + num(op.x1) + '" y1="' + num(op.y1) +
          '" x2="' + num(op.x2) + '" y2="' + num(op.y2) +
          '" stroke="' + op.color + '" stroke-width="' + num(op.width) +
          '" stroke-linecap="round"/>'
        );
      } else {
        out.push(
          '<circle cx="' + num(op.cx) + '" cy="' + num(op.cy) + '" r="' + num(Math.max(0.5, op.r)) +
          '" fill="' + (op.filled ? op.color : "none") +
          '" stroke="' + op.color + '" stroke-width="' + num(op.width) + '"/>'
        );
      }
    }
    return out.join("");
  }

  /** The frame that best represents the animation, for a still thumbnail. */
  function bestThumbnailFrame(doc) {
    var best = 0;
    var bestScore = -1;
    for (var i = 0; i < doc.frames.length; i++) {
      var n = doc.frames[i].figures.length;
      // Prefer busy frames, and among equals the one nearest the middle.
      var centreBias = 1 - Math.abs(i - doc.frames.length / 2) / (doc.frames.length || 1);
      var score = n * 10 + centreBias;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  /**
   * Inflate a raw .piv (zlib) and parse it. Browser-only — Node callers should
   * use zlib.inflateSync and call parsePiv directly.
   */
  function decodePiv(rawBytes) {
    if (typeof DecompressionStream !== "function") {
      return Promise.reject(new Error("This browser can't decompress Pivot files."));
    }
    var attempt = function (format) {
      var stream = new Blob([rawBytes]).stream().pipeThrough(new DecompressionStream(format));
      return new Response(stream).arrayBuffer().then(function (buf) {
        return parsePiv(new Uint8Array(buf));
      });
    };
    return attempt("deflate").catch(function () {
      return attempt("deflate-raw");
    });
  }

  return {
    parsePiv: parsePiv,
    decodePiv: decodePiv,
    frameOps: frameOps,
    drawFrame: drawFrame,
    frameToSvg: frameToSvg,
    bestThumbnailFrame: bestThumbnailFrame,
  };
});
