/* qr.js — a small, dependency-free QR Code encoder (byte mode, versions 1–10, ECC L/M/Q/H).
 * Enough for a URL of ~150 characters, which is all a groove link needs. The algorithm follows the
 * public ISO/IEC 18004 construction: Reed–Solomon over GF(256), eight masks, lowest penalty wins.
 *
 *   var qr = QR.encode('https://example.com/#g1=…', 'M');   // { size, version, modules[y][x] }
 *   el.innerHTML = QR.toSvg(qr);                              // crisp at any print size
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QR = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ECL_INDEX = { L: 0, M: 1, Q: 2, H: 3 };
  var ECL_FORMAT = { L: 1, M: 0, Q: 3, H: 2 };
  // index: [ecl][version - 1]
  var ECC_PER_BLOCK = [
    [7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
    [10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
    [13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
    [17, 28, 22, 16, 22, 28, 26, 26, 24, 28]
  ];
  var BLOCKS = [
    [1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
    [1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
    [1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
    [1, 1, 2, 4, 4, 4, 5, 6, 8, 8]
  ];
  var MAX_VERSION = 10;

  function rawModules(ver) {
    var n = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var a = Math.floor(ver / 7) + 2;
      n -= (25 * a - 10) * a - 55;
      if (ver >= 7) n -= 36;
    }
    return n;
  }
  function dataCodewords(ver, ecl) {
    var e = ECL_INDEX[ecl];
    return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[e][ver - 1] * BLOCKS[e][ver - 1];
  }

  function utf8(str) {
    if (typeof TextEncoder !== 'undefined') return Array.prototype.slice.call(new TextEncoder().encode(str));
    var s = unescape(encodeURIComponent(str)), out = [];
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  /* ---- Reed–Solomon over GF(256), polynomial 0x11D ---- */
  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
    return z;
  }
  function rsDivisor(degree) {
    var r = [], i, j, root = 1;
    for (i = 0; i < degree - 1; i++) r.push(0);
    r.push(1);
    for (i = 0; i < degree; i++) {
      for (j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
      root = gfMul(root, 0x02);
    }
    return r;
  }
  function rsRemainder(data, divisor) {
    var r = divisor.map(function () { return 0; });
    data.forEach(function (b) {
      var factor = b ^ r.shift();
      r.push(0);
      divisor.forEach(function (coef, i) { r[i] ^= gfMul(coef, factor); });
    });
    return r;
  }

  function interleave(data, ver, ecl) {
    var e = ECL_INDEX[ecl], nBlocks = BLOCKS[e][ver - 1], eccLen = ECC_PER_BLOCK[e][ver - 1];
    var raw = Math.floor(rawModules(ver) / 8), nShort = nBlocks - raw % nBlocks, shortLen = Math.floor(raw / nBlocks);
    var blocks = [], div = rsDivisor(eccLen), k = 0, i;
    for (i = 0; i < nBlocks; i++) {
      var dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1));
      k += dat.length;
      var ecc = rsRemainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var out = [];
    for (i = 0; i < blocks[0].length; i++) {
      blocks.forEach(function (blk, j) { if (i !== shortLen - eccLen || j >= nShort) out.push(blk[i]); });
    }
    return out;
  }

  function alignmentPositions(ver) {
    if (ver === 1) return [];
    var n = Math.floor(ver / 7) + 2, size = ver * 4 + 17;
    var step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    var r = [6];
    for (var pos = size - 7; r.length < n; pos -= step) r.splice(1, 0, pos);
    return r;
  }

  function bit(x, i) { return ((x >>> i) & 1) !== 0; }

  function build(codewords, ver, ecl, mask) {
    var size = ver * 4 + 17, modules = [], isFn = [], x, y;
    for (y = 0; y < size; y++) { modules.push(new Array(size).fill(false)); isFn.push(new Array(size).fill(false)); }
    function setFn(x2, y2, v) { modules[y2][x2] = v; isFn[y2][x2] = true; }

    for (x = 0; x < size; x++) { setFn(6, x, x % 2 === 0); setFn(x, 6, x % 2 === 0); }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = cx + dx, yy = cy + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) setFn(xx, yy, d !== 2 && d !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    var al = alignmentPositions(ver), n = al.length;
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) setFn(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }

    function formatBits(m) {
      var data = (ECL_FORMAT[ecl] << 3) | m, rem = data, k;
      for (k = 0; k < 10; k++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var bits = ((data << 10) | rem) ^ 0x5412, b;
      for (b = 0; b <= 5; b++) setFn(8, b, bit(bits, b));
      setFn(8, 7, bit(bits, 6)); setFn(8, 8, bit(bits, 7)); setFn(7, 8, bit(bits, 8));
      for (b = 9; b < 15; b++) setFn(14 - b, 8, bit(bits, b));
      for (b = 0; b < 8; b++) setFn(size - 1 - b, 8, bit(bits, b));
      for (b = 8; b < 15; b++) setFn(8, size - 15 + b, bit(bits, b));
      setFn(8, size - 8, true);
    }
    formatBits(0);                                            // reserve the cells; redrawn with the real mask below
    if (ver >= 7) {
      var rem = ver, k;
      for (k = 0; k < 12; k++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var vbits = (ver << 12) | rem;
      for (k = 0; k < 18; k++) {
        var a = size - 11 + k % 3, b2 = Math.floor(k / 3);
        setFn(a, b2, bit(vbits, k)); setFn(b2, a, bit(vbits, k));
      }
    }

    var idx = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (var jj = 0; jj < 2; jj++) {
        var xx = right - jj, up = ((right + 1) & 2) === 0, yy = up ? size - 1 - vert : vert;
        if (!isFn[yy][xx] && idx < codewords.length * 8) { modules[yy][xx] = bit(codewords[idx >>> 3], 7 - (idx & 7)); idx++; }
      }
    }

    for (y = 0; y < size; y++) for (x = 0; x < size; x++) {
      if (isFn[y][x]) continue;
      var inv;
      switch (mask) {
        case 0: inv = (x + y) % 2 === 0; break;
        case 1: inv = y % 2 === 0; break;
        case 2: inv = x % 3 === 0; break;
        case 3: inv = (x + y) % 3 === 0; break;
        case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: inv = x * y % 2 + x * y % 3 === 0; break;
        case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break;
        default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
      }
      if (inv) modules[y][x] = !modules[y][x];
    }
    formatBits(mask);
    return modules;
  }

  function penalty(m) {
    var size = m.length, score = 0, x, y, run, line;
    function lineScore(get) {
      var s = 0, i, runLen = 1, hist = '';
      for (i = 0; i < size; i++) {
        var v = get(i);
        hist += v ? '1' : '0';
        if (i > 0 && v === get(i - 1)) { runLen++; if (runLen === 5) s += 3; else if (runLen > 5) s++; } else runLen = 1;
      }
      // finder-like 1:1:3:1:1 with a light margin on either side
      var re = /(?=(1011101(0000)|(0000)1011101))/g, mm;
      while ((mm = re.exec(hist))) { s += 40; re.lastIndex = mm.index + 1; }
      return s;
    }
    for (y = 0; y < size; y++) score += lineScore(function (i) { return m[y][i]; });
    for (x = 0; x < size; x++) score += lineScore(function (i) { return m[i][x]; });
    for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) {
      var c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
    }
    var dark = 0;
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (m[y][x]) dark++;
    var total = size * size;
    score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return score;
  }

  function encode(text, ecl) {
    ecl = ecl || 'M';
    if (!(ecl in ECL_INDEX)) throw new Error('QR: unknown error-correction level ' + ecl);
    var bytes = utf8(String(text)), ver = 0, v;
    for (v = 1; v <= MAX_VERSION; v++) {
      var used = 4 + (v <= 9 ? 8 : 16) + bytes.length * 8;
      if (used <= dataCodewords(v, ecl) * 8) { ver = v; break; }
    }
    if (!ver) throw new Error('QR: ' + bytes.length + ' bytes will not fit (max version ' + MAX_VERSION + ')');

    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(0x4, 4); put(bytes.length, ver <= 9 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    var cap = dataCodewords(ver, ecl) * 8;
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var data = [];
    for (var i = 0; i < bits.length; i += 8) { var byte = 0; for (var j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j]; data.push(byte); }

    var codewords = interleave(data, ver, ecl), best = null, bestScore = Infinity;
    for (var mask = 0; mask < 8; mask++) {
      var mod = build(codewords, ver, ecl, mask), sc = penalty(mod);
      if (sc < bestScore) { bestScore = sc; best = mod; }
    }
    return { version: ver, size: best.length, ecl: ecl, modules: best };
  }

  /* One <path> of unit squares, with a 4-module quiet zone, scaled by the SVG's viewBox. */
  function toSvg(qr, opts) {
    opts = opts || {};
    var border = opts.border == null ? 4 : opts.border, d = [];
    for (var y = 0; y < qr.size; y++) {
      var x = 0;
      while (x < qr.size) {
        if (!qr.modules[y][x]) { x++; continue; }
        var x0 = x;
        while (x < qr.size && qr.modules[y][x]) x++;
        d.push('M' + (x0 + border) + ' ' + (y + border) + 'h' + (x - x0) + 'v1h-' + (x - x0) + 'z');
      }
    }
    var dim = qr.size + border * 2;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim + '" shape-rendering="crispEdges" role="img" aria-label="' +
      (opts.label || 'QR code') + '"><rect width="' + dim + '" height="' + dim + '" fill="#fff"/><path d="' + d.join('') + '" fill="#000"/></svg>';
  }

  return { encode: encode, toSvg: toSvg, capacity: function (ver, ecl) { return dataCodewords(ver, ecl || 'M') - (ver <= 9 ? 2 : 3); } };
}));
