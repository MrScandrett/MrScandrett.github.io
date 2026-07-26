/**
 * rubiks-cube-solver.js — a real 3x3x3 Rubik's Cube model + layer-by-layer solver.
 * ClassroomOS · Mr. Scandrett's STEAM Lessons
 *
 * Everything here is derived from geometry rather than hand-copied permutation
 * tables, so the model can't silently disagree with the 3D cube on screen.
 *
 * Orientation convention used throughout the lesson:
 *   WHITE on the bottom, GREEN facing you.
 *   => U = yellow, D = white, F = green, B = blue, L = red, R = orange.
 *
 * A "facelet array" is 54 entries of face letters (U R F D L B), indexed
 * U0-8, R9-17, F18-26, D27-35, L36-44, B45-53 (Singmaster/Kociemba order).
 * The letter stored at an index says which face that sticker *belongs* to,
 * so a solved cube reads U,U,U,...,R,R,R,... and colours are only a skin.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RubiksCube = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
  var NORMAL = { U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1], D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1] };
  var AXIS_OF = { U: 1, D: 1, R: 0, L: 0, F: 2, B: 2 };
  var LAYER_OF = { U: 1, D: -1, R: 1, L: -1, F: 1, B: -1 };
  /* A clockwise turn (seen from outside that face) as a rotation of 3D space. */
  var SPIN = { U: 'y1', D: 'y3', R: 'x1', L: 'x3', F: 'z1', B: 'z3' };

  /* The lesson's colour skin: which colour sits on which face. */
  var SCHEME = { U: 'Y', R: 'O', F: 'G', D: 'W', L: 'R', B: 'B' };
  var COLOR_OF_FACE = SCHEME;
  var FACE_OF_COLOR = {};
  FACES.forEach(function (f) { FACE_OF_COLOR[SCHEME[f]] = f; });

  var COLOR_HEX = {
    W: 0xf7f7f5, Y: 0xffd500, G: 0x00a94f, B: 0x0051ba, O: 0xff5800, R: 0xc41e3a
  };
  var COLOR_NAME = { W: 'white', Y: 'yellow', G: 'green', B: 'blue', O: 'orange', R: 'red' };

  function rot(v, kind) {
    switch (kind) {
      case 'x1': return [v[0], v[2], -v[1]];
      case 'x3': return [v[0], -v[2], v[1]];
      case 'y1': return [-v[2], v[1], v[0]];
      case 'y3': return [v[2], v[1], -v[0]];
      case 'z1': return [v[1], -v[0], v[2]];
      case 'z3': return [-v[1], v[0], v[2]];
    }
    return v.slice();
  }

  function faceOfNormal(n) {
    for (var i = 0; i < FACES.length; i++) {
      var m = NORMAL[FACES[i]];
      if (m[0] === n[0] && m[1] === n[1] && m[2] === n[2]) return FACES[i];
    }
    return null;
  }

  /**
   * Index of the sticker on `face` belonging to the cubie at (x, y, z).
   * Rows/columns follow the standard unfolded net, so U's bottom row touches
   * F's top row, R's first column touches F, and so on.
   */
  function faceletIndex(face, x, y, z) {
    switch (face) {
      case 'U': return 0 + (z + 1) * 3 + (x + 1);
      case 'R': return 9 + (1 - y) * 3 + (1 - z);
      case 'F': return 18 + (1 - y) * 3 + (x + 1);
      case 'D': return 27 + (1 - z) * 3 + (x + 1);
      case 'L': return 36 + (1 - y) * 3 + (z + 1);
      case 'B': return 45 + (1 - y) * 3 + (1 - x);
    }
    return -1;
  }

  /* Every (face, cubie) sticker on the cube, with its facelet index. */
  var ALL_FACELETS = (function () {
    var out = [];
    FACES.forEach(function (f) {
      var ax = AXIS_OF[f], lay = LAYER_OF[f];
      var others = [0, 1, 2].filter(function (i) { return i !== ax; });
      for (var a = -1; a <= 1; a++) {
        for (var b = -1; b <= 1; b++) {
          var p = [0, 0, 0];
          p[ax] = lay; p[others[0]] = a; p[others[1]] = b;
          out.push({ face: f, p: p, i: faceletIndex(f, p[0], p[1], p[2]) });
        }
      }
    });
    return out;
  }());

  /* PERM[f][i] = index the sticker now at i came from, after a clockwise f. */
  var PERM = (function () {
    var table = {};
    FACES.forEach(function (f) {
      var src = [];
      for (var i = 0; i < 54; i++) src.push(i);
      var ax = AXIS_OF[f], lay = LAYER_OF[f], kind = SPIN[f];
      ALL_FACELETS.forEach(function (fl) {
        if (fl.p[ax] !== lay) return;
        var np = rot(fl.p, kind);
        var nn = rot(NORMAL[fl.face], kind);
        src[faceletIndex(faceOfNormal(nn), np[0], np[1], np[2])] = fl.i;
      });
      table[f] = src;
    });
    return table;
  }());

  var SOLVED = (function () {
    var f = new Array(54);
    ALL_FACELETS.forEach(function (fl) { f[fl.i] = fl.face; });
    return f;
  }());

  /* ── Slots ───────────────────────────────────────────────────────────── */

  /* Corner faces listed clockwise from the U/D sticker (standard ordering). */
  var CORNER_SLOTS = [
    { name: 'URF', faces: ['U', 'R', 'F'], p: [1, 1, 1] },
    { name: 'UFL', faces: ['U', 'F', 'L'], p: [-1, 1, 1] },
    { name: 'ULB', faces: ['U', 'L', 'B'], p: [-1, 1, -1] },
    { name: 'UBR', faces: ['U', 'B', 'R'], p: [1, 1, -1] },
    { name: 'DFR', faces: ['D', 'F', 'R'], p: [1, -1, 1] },
    { name: 'DLF', faces: ['D', 'L', 'F'], p: [-1, -1, 1] },
    { name: 'DBL', faces: ['D', 'B', 'L'], p: [-1, -1, -1] },
    { name: 'DRB', faces: ['D', 'R', 'B'], p: [1, -1, -1] }
  ];
  var EDGE_SLOTS = [
    { name: 'UR', faces: ['U', 'R'], p: [1, 1, 0] },
    { name: 'UF', faces: ['U', 'F'], p: [0, 1, 1] },
    { name: 'UL', faces: ['U', 'L'], p: [-1, 1, 0] },
    { name: 'UB', faces: ['U', 'B'], p: [0, 1, -1] },
    { name: 'DR', faces: ['D', 'R'], p: [1, -1, 0] },
    { name: 'DF', faces: ['D', 'F'], p: [0, -1, 1] },
    { name: 'DL', faces: ['D', 'L'], p: [-1, -1, 0] },
    { name: 'DB', faces: ['D', 'B'], p: [0, -1, -1] },
    { name: 'FR', faces: ['F', 'R'], p: [1, 0, 1] },
    { name: 'FL', faces: ['F', 'L'], p: [-1, 0, 1] },
    { name: 'BL', faces: ['B', 'L'], p: [-1, 0, -1] },
    { name: 'BR', faces: ['B', 'R'], p: [1, 0, -1] }
  ];

  CORNER_SLOTS.forEach(function (s) {
    s.fl = s.faces.map(function (f) { return faceletIndex(f, s.p[0], s.p[1], s.p[2]); });
  });
  EDGE_SLOTS.forEach(function (s) {
    s.fl = s.faces.map(function (f) { return faceletIndex(f, s.p[0], s.p[1], s.p[2]); });
  });

  function key(list) { return list.slice().sort().join(''); }
  var CORNER_BY_KEY = {}, EDGE_BY_KEY = {};
  CORNER_SLOTS.forEach(function (s, i) { CORNER_BY_KEY[key(s.faces)] = i; });
  EDGE_SLOTS.forEach(function (s, i) { EDGE_BY_KEY[key(s.faces)] = i; });

  /* ── Moves ───────────────────────────────────────────────────────────── */

  function parseMove(m) {
    var face = m.charAt(0);
    if (!PERM[face]) return null;
    var mod = m.slice(1);
    var turns = mod === '2' ? 2 : mod === "'" ? 3 : mod === '' ? 1 : -1;
    if (turns < 0) return null;
    return { face: face, turns: turns };
  }

  /* One permutation per notated move, so applying a move is a single pass. */
  var MOVE_PERM = (function () {
    var table = {};
    FACES.forEach(function (f) {
      var acc = [];
      for (var i = 0; i < 54; i++) acc.push(i);
      for (var t = 1; t <= 3; t++) {
        var next = new Array(54);
        for (var j = 0; j < 54; j++) next[j] = acc[PERM[f][j]];
        acc = next;
        table[f + (t === 2 ? '2' : t === 3 ? "'" : '')] = acc;
      }
    });
    return table;
  }());

  function applyMove(fac, m) {
    var perm = MOVE_PERM[m];
    if (!perm) return fac.slice();
    var out = new Array(54);
    for (var i = 0; i < 54; i++) out[i] = fac[perm[i]];
    return out;
  }

  function applySeq(fac, seq) {
    var out = fac.slice();
    for (var i = 0; i < seq.length; i++) out = applyMove(out, seq[i]);
    return out;
  }

  function invertMove(m) {
    if (m.length === 1) return m + "'";
    if (m.charAt(1) === "'") return m.charAt(0);
    return m;
  }
  function invertSeq(seq) { return seq.slice().reverse().map(invertMove); }

  function isSolved(fac) {
    for (var i = 0; i < 54; i++) if (fac[i] !== SOLVED[i]) return false;
    return true;
  }

  function edgeSolved(fac, slot) {
    var s = EDGE_SLOTS[slot];
    return fac[s.fl[0]] === s.faces[0] && fac[s.fl[1]] === s.faces[1];
  }
  function cornerSolved(fac, slot) {
    var s = CORNER_SLOTS[slot];
    return fac[s.fl[0]] === s.faces[0] && fac[s.fl[1]] === s.faces[1] && fac[s.fl[2]] === s.faces[2];
  }
  /* Where does the edge whose stickers are {a, b} currently live? */
  function findEdge(fac, a, b) {
    var want = key([a, b]);
    for (var i = 0; i < 12; i++) {
      var s = EDGE_SLOTS[i];
      if (key([fac[s.fl[0]], fac[s.fl[1]]]) === want) {
        return { slot: i, oriented: fac[s.fl[0]] === a || fac[s.fl[1]] === a ? null : null, fac: fac };
      }
    }
    return null;
  }
  function findCorner(fac, a, b, c) {
    var want = key([a, b, c]);
    for (var i = 0; i < 8; i++) {
      var s = CORNER_SLOTS[i];
      if (key([fac[s.fl[0]], fac[s.fl[1]], fac[s.fl[2]]]) === want) return i;
    }
    return -1;
  }

  /* ── Validation ──────────────────────────────────────────────────────── */

  function permutationParity(perm) {
    var seen = new Array(perm.length).fill(false), parity = 0;
    for (var i = 0; i < perm.length; i++) {
      if (seen[i]) continue;
      var len = 0, j = i;
      while (!seen[j]) { seen[j] = true; j = perm[j]; len++; }
      parity ^= (len - 1) & 1;
    }
    return parity;
  }

  /**
   * Check a facelet array describes a cube that can actually be twisted back
   * to solved, and explain in plain language when it can't.
   */
  function validate(fac) {
    var errors = [];
    if (!fac || fac.length !== 54) return { ok: false, errors: ['The cube is not fully filled in yet.'] };

    var counts = {};
    FACES.forEach(function (f) { counts[f] = 0; });
    for (var i = 0; i < 54; i++) {
      if (!fac[i]) return { ok: false, errors: ['Some squares are still blank — fill in all 54.'] };
      if (counts[fac[i]] === undefined) return { ok: false, errors: ['Unknown colour in the grid.'] };
      counts[fac[i]]++;
    }
    FACES.forEach(function (f) {
      if (counts[f] !== 9) {
        errors.push('There are ' + counts[f] + ' ' + COLOR_NAME[SCHEME[f]] + ' squares — every colour needs exactly 9.');
      }
    });
    if (errors.length) return { ok: false, errors: errors };

    /* Corners: every corner must be a real corner, and each one used once. */
    var cp = [], co = [], usedC = {};
    for (var c = 0; c < 8; c++) {
      var s = CORNER_SLOTS[c];
      var trio = [fac[s.fl[0]], fac[s.fl[1]], fac[s.fl[2]]];
      var k = CORNER_BY_KEY[key(trio)];
      if (k === undefined || usedC[k]) {
        errors.push('The ' + s.name + ' corner isn\'t a real corner of a Rubik\'s Cube — check those three squares.');
        continue;
      }
      usedC[k] = true;
      var twist = trio.indexOf('U');
      if (twist < 0) twist = trio.indexOf('D');
      cp.push(k); co.push(twist);
    }
    var ep = [], eo = [], usedE = {};
    for (var e = 0; e < 12; e++) {
      var es = EDGE_SLOTS[e];
      var pair = [fac[es.fl[0]], fac[es.fl[1]]];
      var ek = EDGE_BY_KEY[key(pair)];
      if (ek === undefined || usedE[ek]) {
        errors.push('The ' + es.name + ' edge isn\'t a real edge of a Rubik\'s Cube — check those two squares.');
        continue;
      }
      usedE[ek] = true;
      ep.push(ek);
      eo.push(pair[0] === EDGE_SLOTS[ek].faces[0] ? 0 : 1);
    }
    if (errors.length) return { ok: false, errors: errors.slice(0, 3) };

    var twistSum = co.reduce(function (a, b) { return a + b; }, 0) % 3;
    if (twistSum !== 0) {
      errors.push('One corner is twisted in place. That can only happen if a corner was pulled out and put back — re-check the corners (or twist one back).');
    }
    var flipSum = eo.reduce(function (a, b) { return a + b; }, 0) % 2;
    if (flipSum !== 0) {
      errors.push('One edge is flipped in place. Re-check the two colours on each edge — one of them is the wrong way round.');
    }
    if (permutationParity(cp) !== permutationParity(ep)) {
      errors.push('Two pieces are swapped in a way a real cube can\'t reach. Two of your squares are probably mixed up.');
    }
    return { ok: errors.length === 0, errors: errors };
  }

  /* ── Search helper ───────────────────────────────────────────────────── */

  var ALL_MOVES = [];
  FACES.forEach(function (f) { ALL_MOVES.push(f, f + "'", f + '2'); });

  /** Iterative-deepening search for a move sequence reaching `goal`. */
  function search(fac, goal, moves, maxDepth) {
    moves = moves || ALL_MOVES;
    if (goal(fac)) return [];
    var path = [];
    function dfs(state, depth, lastFace) {
      if (depth === 0) return goal(state);
      for (var i = 0; i < moves.length; i++) {
        var m = moves[i];
        if (m.charAt(0) === lastFace) continue;
        var next = applyMove(state, m);
        path.push(m);
        if ((depth === 1 ? goal(next) : dfs(next, depth - 1, m.charAt(0)))) return true;
        path.pop();
      }
      return false;
    }
    for (var d = 1; d <= maxDepth; d++) {
      path.length = 0;
      if (dfs(fac, d, '')) return path.slice();
    }
    return null;
  }

  /**
   * Search over whole algorithms rather than single turns. Used for the last
   * layer, so the solution is made of the same named algorithms cubers use.
   */
  function algSearch(fac, goal, algs, maxAlgs) {
    var AUF = [
      { label: null, moves: [] },
      { label: null, moves: ['U'] },
      { label: null, moves: ["U'"] },
      { label: null, moves: ['U2'] }
    ];
    var found = null;
    function dfs(state, depth, acc) {
      for (var a = 0; a < AUF.length; a++) {
        var s1 = applySeq(state, AUF[a].moves);
        if (goal(s1)) {
          found = acc.concat(AUF[a].moves.length ? [{ label: 'Line up the top face', moves: AUF[a].moves }] : []);
          return true;
        }
        if (depth === 0) continue;
        for (var i = 0; i < algs.length; i++) {
          var s2 = applySeq(s1, algs[i].moves);
          var step = acc.concat(
            AUF[a].moves.length ? [{ label: 'Line up the top face', moves: AUF[a].moves }] : [],
            [{ label: algs[i].label, detail: algs[i].detail, moves: algs[i].moves }]
          );
          if (goal(s2)) { found = step; return true; }
          if (depth > 1 && dfs(s2, depth - 1, step)) return true;
        }
      }
      return false;
    }
    for (var d = 0; d <= maxAlgs; d++) {
      found = null;
      if (dfs(fac, d, [])) return found;
    }
    return null;
  }

  /* ── Frames ──────────────────────────────────────────────────────────── */

  /* Turning the whole cube the way U turns sends F→L→B→R→F. */
  var RING = ['F', 'L', 'B', 'R'];
  function frameOf(face) { return RING.indexOf(face); }
  function sub(face, k) {
    var i = RING.indexOf(face);
    return i < 0 ? face : RING[(i + k) % 4];
  }
  function subSeq(seq, k) {
    return seq.map(function (m) { return sub(m.charAt(0), k) + m.slice(1); });
  }
  /* In frame k: front = RING[k], right = RING[k+3], left = RING[k+1]. */
  function frontOf(k) { return RING[k % 4]; }
  function rightOf(k) { return RING[(k + 3) % 4]; }

  /* ── Algorithms ──────────────────────────────────────────────────────── */

  var ALG = {
    /* Cross: edge sits above its slot but flipped the wrong way. */
    crossFlip: ['U\'', 'R\'', 'F', 'R'],
    /* Lift a piece out of the bottom-right slot into the top layer. */
    trigger: ['R', 'U', 'R\''],
    /* The right-hand trigger — the most used 4 moves in all of cubing. */
    sexy: ['R', 'U', 'R\'', 'U\''],
    /* Dropping a white corner in, by where its white sticker is pointing. */
    cornerRight: ['R', 'U', 'R\''],
    cornerFront: ['F\'', 'U\'', 'F'],
    cornerUp: ['R', 'U2', 'R\'', 'U\'', 'R', 'U', 'R\''],
    /* Middle layer inserts. */
    insertRight: ['U', 'R', 'U\'', 'R\'', 'U\'', 'F\'', 'U', 'F'],
    insertLeft: ['U\'', 'L\'', 'U', 'L', 'U', 'F', 'U\'', 'F\''],
    /* Last layer. */
    edgeOrient: ['F', 'R', 'U', 'R\'', 'U\'', 'F\''],
    sune: ['R', 'U', 'R\'', 'U', 'R', 'U2', 'R\''],
    antisune: ['R', 'U2', 'R\'', 'U\'', 'R', 'U\'', 'R\''],
    cornerCycle: ['U', 'R', 'U\'', 'L\'', 'U', 'R\'', 'U\'', 'L'],
    cornerCycleInv: ['L\'', 'U', 'R', 'U\'', 'L', 'U', 'R\'', 'U\''],
    tPerm: ['R', 'U', 'R\'', 'U\'', 'R\'', 'F', 'R2', 'U\'', 'R\'', 'U\'', 'R', 'U', 'R\'', 'F\''],
    uPermA: ['R', 'U\'', 'R', 'U', 'R', 'U', 'R', 'U\'', 'R\'', 'U\'', 'R2'],
    uPermB: ['R2', 'U', 'R', 'U', 'R\'', 'U\'', 'R\'', 'U\'', 'R\'', 'U', 'R\'']
  };

  /* ── Move-sequence tidying ───────────────────────────────────────────── */

  function simplify(seq) {
    var out = [];
    for (var i = 0; i < seq.length; i++) {
      var mv = parseMove(seq[i]);
      if (!mv) continue;
      var last = out.length ? out[out.length - 1] : null;
      if (last && last.face === mv.face) {
        last.turns = (last.turns + mv.turns) % 4;
        if (last.turns === 0) out.pop();
      } else {
        out.push({ face: mv.face, turns: mv.turns });
      }
    }
    return out.map(function (mv) {
      return mv.face + (mv.turns === 2 ? '2' : mv.turns === 3 ? "'" : '');
    });
  }

  /* ── The solver ──────────────────────────────────────────────────────── */

  function Solver(fac) {
    this.fac = fac.slice();
    this.stages = [];
    this.stage = null;
  }
  Solver.prototype.begin = function (info) {
    this.stage = {
      key: info.key, title: info.title, goal: info.goal, why: info.why, steps: []
    };
    this.stages.push(this.stage);
  };
  Solver.prototype.step = function (label, moves, detail) {
    var tidy = simplify(moves);
    if (!tidy.length) return;
    for (var i = 0; i < tidy.length; i++) this.fac = applyMove(this.fac, tidy[i]);
    this.stage.steps.push({ label: label, detail: detail || '', moves: tidy });
  };
  /**
   * Before reaching for an algorithm, see whether a turn or two already does
   * the job without disturbing anything solved so far. Cubers do this by eye;
   * it keeps nearly-solved cubes from getting a 100-move answer.
   */
  Solver.prototype.shortcut = function (goal) {
    var quick = search(this.fac, goal, ALL_MOVES, 3);
    if (!quick || !quick.length) return !!quick;
    this.step('Just turn it in', quick,
      'No algorithm needed here — this piece is close enough to drop straight into place.');
    return true;
  };
  Solver.prototype.uAlign = function (turns) {
    turns = ((turns % 4) + 4) % 4;
    if (!turns) return;
    this.step('Line up the top face', [turns === 2 ? 'U2' : turns === 3 ? "U'" : 'U']);
  };

  /* Stage 1 — the white cross. */
  function solveCross(S) {
    S.begin({
      key: 'cross',
      title: 'The white cross',
      goal: 'Four white edges around the white centre',
      why: 'Every method starts by building a base to work from. These four edges also have to match the side centres, so the cross is really eight stickers, not four.'
    });
    var order = ['F', 'R', 'B', 'L'];
    var done = [];
    for (var n = 0; n < order.length; n++) {
      var side = order[n];
      var target = EDGE_BY_KEY[key(['D', side])];
      var keep = done.slice();
      var goal = (function (t, k) {
        return function (f) {
          if (!edgeSolved(f, t)) return false;
          for (var i = 0; i < k.length; i++) if (!edgeSolved(f, k[i])) return false;
          return true;
        };
      }(target, keep));
      done.push(target);
      if (S.shortcut(goal)) continue;
      var guard = 0;
      while (!edgeSolved(S.fac, target) && guard++ < 12) {
        var at = findEdge(S.fac, 'D', side).slot;
        if (at >= 4 && at <= 7) {
          /* Sitting in the bottom layer, but wrong: pop it up top. */
          var f = EDGE_SLOTS[at].faces[1];
          S.step('Pop the edge up to the top', [f + '2']);
        } else if (at >= 8) {
          /* Trapped in the middle layer: lift it out with a trigger. */
          var k = frameOf(EDGE_SLOTS[at].faces[0]);
          if (rightOf(k) !== EDGE_SLOTS[at].faces[1]) k = frameOf(EDGE_SLOTS[at].faces[1]);
          S.step('Lift the edge out of the middle', subSeq(ALG.trigger, k));
        } else {
          var kk = frameOf(side);
          var cur = EDGE_SLOTS[at].faces[1];
          S.uAlign(frameOf(side) - frameOf(cur));
          var slot = EDGE_BY_KEY[key(['U', side])];
          var upFacing = S.fac[EDGE_SLOTS[slot].fl[0]];
          if (upFacing === 'D') {
            S.step('Drop it straight down', [side + '2'],
              'The white sticker is already facing up, so half a turn drops it into place.');
          } else {
            S.step('Flip the edge in', subSeq(ALG.crossFlip, kk),
              'The white sticker faces sideways, so the edge has to be turned over on its way down.');
          }
        }
      }
    }
  }

  /* Stage 2 — the white corners. */
  function solveFirstLayer(S) {
    S.begin({
      key: 'corners',
      title: 'The white corners',
      goal: 'The whole bottom layer finished',
      why: 'Each corner goes in with the same four moves repeated — the right-hand trigger, R U R\' U\'. Repeating one short sequence until a piece drops into place is the idea behind every cube algorithm.'
    });
    for (var k = 0; k < 4; k++) {
      var slot = 4 + k;                       /* DFR, DLF, DBL, DRB */
      var faces = CORNER_SLOTS[slot].faces;   /* D + two sides */
      var goal = (function (t) {
        return function (f) {
          if (!cornerSolved(f, t)) return false;
          for (var i = 4; i < 8; i++) if (i < t && !cornerSolved(f, i)) return false;
          for (var e = 4; e < 8; e++) if (!edgeSolved(f, e)) return false;
          return true;
        };
      }(slot));
      if (S.shortcut(goal)) continue;
      var guard = 0;
      while (!cornerSolved(S.fac, slot) && guard++ < 8) {
        var at = findCorner(S.fac, faces[0], faces[1], faces[2]);
        if (at >= 4) {
          S.step('Lift the corner out', subSeq(ALG.trigger, at - 4),
            'The corner is in the bottom layer but facing the wrong way, so it comes out first.');
          continue;
        }
        S.uAlign(k - at);
        /* Above its slot now. Which way is the white sticker pointing? */
        var up = CORNER_SLOTS[k].fl;
        if (S.fac[up[1]] === 'D') {
          S.step('Tuck it in', subSeq(ALG.cornerRight, k),
            'White is facing right, so three moves swing the corner straight down into the gap.');
        } else if (S.fac[up[2]] === 'D') {
          S.step('Tuck it in the other way', subSeq(ALG.cornerFront, k),
            'White is facing front, so the mirror of the same three moves does it.');
        } else {
          S.step('Anti-Sune', subSeq(ALG.cornerUp, k),
            'White is pointing at the ceiling — the hardest case. R U2 R\' U\' R U R\' turns the corner over on its way in. You will meet these seven moves again on the last layer.');
        }
      }
    }
  }

  /* Stage 3 — the middle layer edges. */
  function solveMiddle(S) {
    S.begin({
      key: 'middle',
      title: 'The middle layer',
      goal: 'Two layers finished',
      why: 'There is no white here, so the top layer becomes a staging area: park the edge above the gap, then use an eight-move sequence that opens the slot, drops the piece in, and puts everything else back.'
    });
    for (var k = 0; k < 4; k++) {
      var front = frontOf(k), right = rightOf(k);
      var target = EDGE_BY_KEY[key([front, right])];
      var goal = (function (t) {
        return function (f) {
          if (!edgeSolved(f, t)) return false;
          for (var e = 4; e < 8; e++) if (!edgeSolved(f, e)) return false;
          for (var m = 8; m < t; m++) if (!edgeSolved(f, m)) return false;
          for (var c = 4; c < 8; c++) if (!cornerSolved(f, c)) return false;
          return true;
        };
      }(target));
      if (S.shortcut(goal)) continue;
      var guard = 0;
      while (!edgeSolved(S.fac, target) && guard++ < 8) {
        var at = findEdge(S.fac, front, right).slot;
        if (at >= 8) {
          var kk = frameOf(EDGE_SLOTS[at].faces[0]);
          if (rightOf(kk) !== EDGE_SLOTS[at].faces[1]) kk = frameOf(EDGE_SLOTS[at].faces[1]);
          S.step('Kick the wrong edge out', subSeq(ALG.insertRight, kk),
            'The slot is blocked, so the same insert runs once to eject the intruder into the top layer.');
          continue;
        }
        /* In the top layer. Which way round is it? */
        var s = EDGE_SLOTS[at];
        var upColour = S.fac[s.fl[0]], sideColour = S.fac[s.fl[1]], sideFace = s.faces[1];
        if (upColour === right) {
          /* Side sticker matches the front centre → goes in to the right. */
          S.uAlign(frameOf(front) - frameOf(sideFace));
          S.step('Insert to the right', subSeq(ALG.insertRight, k),
            'Matched the front centre, and the slot is on the right.');
        } else {
          /* Side sticker matches the right centre → goes in to the left. */
          S.uAlign(frameOf(right) - frameOf(sideFace));
          S.step('Insert to the left', subSeq(ALG.insertLeft, (k + 3) % 4),
            'Matched the other centre, so the mirror-image insert sends it left.');
        }
      }
    }
  }

  function topEdgesOriented(fac) {
    for (var i = 0; i < 4; i++) if (fac[EDGE_SLOTS[i].fl[0]] !== 'U') return false;
    return true;
  }
  function topCornersOriented(fac) {
    for (var i = 0; i < 4; i++) if (fac[CORNER_SLOTS[i].fl[0]] !== 'U') return false;
    return true;
  }
  function topCornersPlaced(fac) {
    for (var i = 0; i < 4; i++) if (!cornerSolved(fac, i)) return false;
    return true;
  }

  /* Stage 4 — the yellow cross. */
  function solveTopCross(S) {
    S.begin({
      key: 'topcross',
      title: 'The yellow cross',
      goal: 'A yellow plus sign on top',
      why: 'Only the four top edges are being turned over here — where they sit does not matter yet. Separating "which way up" from "where" is what makes the last layer solvable at all.'
    });
    var steps = algSearch(S.fac, topEdgesOriented, [{
      label: 'Yellow cross algorithm', moves: ALG.edgeOrient,
      detail: 'F R U R\' U\' F\' flips the top edges. A dot becomes an L, an L becomes a line, a line becomes the cross.'
    }], 4);
    (steps || []).forEach(function (st) { S.step(st.label, st.moves, st.detail); });
  }

  /* Stage 5 — orient the last four corners. */
  function solveTopCorners(S) {
    S.begin({
      key: 'topcorners',
      title: 'Turn the yellow corners up',
      goal: 'A solid yellow face',
      why: 'Sune and its mirror twist three corners at a time. Because a corner can only be twisted in groups of three, no algorithm can ever fix just one — that is a real theorem about the cube group.'
    });
    var steps = algSearch(S.fac, topCornersOriented, [
      { label: 'Sune', moves: ALG.sune, detail: 'R U R\' U R U2 R\' — twists three corners one third of a turn.' },
      { label: 'Anti-Sune', moves: ALG.antisune, detail: 'R U2 R\' U\' R U\' R\' — the same idea the other way round.' }
    ], 4);
    (steps || []).forEach(function (st) { S.step(st.label, st.moves, st.detail); });
  }

  /* Stage 6 — put the corners in the right places. */
  function solveCornerPerm(S) {
    S.begin({
      key: 'cornerperm',
      title: 'Move the corners home',
      goal: 'All four corners in their right places',
      why: 'The yellow face stays solid while three corners rotate around each other. If two corners need to swap instead of cycle, the T-permutation handles it — a swap is an odd permutation, and no 3-cycle can ever produce one.'
    });
    var steps = algSearch(S.fac, topCornersPlaced, [
      { label: 'Corner 3-cycle', moves: ALG.cornerCycle, detail: 'U R U\' L\' U R\' U\' L — spins three corners around, leaving the fourth alone.' },
      { label: 'Corner 3-cycle (other way)', moves: ALG.cornerCycleInv, detail: 'The same cycle run backwards.' },
      { label: 'T-permutation', moves: ALG.tPerm, detail: 'R U R\' U\' R\' F R2 U\' R\' U\' R U R\' F\' — swaps a pair of corners and a pair of edges at once.' }
    ], 4);
    (steps || []).forEach(function (st) { S.step(st.label, st.moves, st.detail); });
  }

  /* Stage 7 — the last four edges. */
  function solveEdgePerm(S) {
    S.begin({
      key: 'edgeperm',
      title: 'The last four edges',
      goal: 'Solved',
      why: 'One three-edge cycle, repeated at most twice, finishes the cube. By now the corners are locked, so the edges have nowhere left to hide.'
    });
    var steps = algSearch(S.fac, isSolved, [
      { label: 'U-permutation', moves: ALG.uPermA, detail: 'Cycles three top edges clockwise and touches nothing else.' },
      { label: 'U-permutation (other way)', moves: ALG.uPermB, detail: 'The same cycle in the other direction.' }
    ], 3);
    (steps || []).forEach(function (st) { S.step(st.label, st.moves, st.detail); });
  }

  function solve(fac) {
    var check = validate(fac);
    if (!check.ok) return { ok: false, errors: check.errors };
    var S = new Solver(fac);
    try {
      solveCross(S);
      solveFirstLayer(S);
      solveMiddle(S);
      solveTopCross(S);
      solveTopCorners(S);
      solveCornerPerm(S);
      solveEdgePerm(S);
    } catch (err) {
      return { ok: false, errors: ['The solver hit a snag on that pattern. Double-check the squares and try again.'] };
    }
    if (!isSolved(S.fac)) {
      return { ok: false, errors: ['The solver could not finish that pattern. Double-check the squares and try again.'] };
    }
    var stages = S.stages.filter(function (st) { return st.steps.length; });
    var moves = [];
    stages.forEach(function (st) {
      st.moves = [];
      st.steps.forEach(function (step) {
        step.start = moves.length;
        step.moves.forEach(function (m) { moves.push(m); st.moves.push(m); });
      });
    });
    return { ok: true, stages: stages, moves: moves, errors: [] };
  }

  /* ── Extras ──────────────────────────────────────────────────────────── */

  function randomScramble(n) {
    n = n || 25;
    var seq = [], last = '', last2 = '';
    var faces = FACES.slice();
    while (seq.length < n) {
      var f = faces[Math.floor(Math.random() * 6)];
      if (f === last) continue;
      if (f === last2 && AXIS_OF[f] === AXIS_OF[last]) continue;
      var mod = ['', "'", '2'][Math.floor(Math.random() * 3)];
      seq.push(f + mod);
      last2 = last; last = f;
    }
    return seq;
  }

  function scrambledState(n) { return applySeq(SOLVED, randomScramble(n)); }

  function toColors(fac) {
    return fac.map(function (f) { return f ? SCHEME[f] : null; });
  }
  function fromColors(colors) {
    return colors.map(function (c) { return c ? FACE_OF_COLOR[c] : null; });
  }

  return {
    FACES: FACES,
    SOLVED: SOLVED,
    SCHEME: SCHEME,
    COLOR_OF_FACE: COLOR_OF_FACE,
    FACE_OF_COLOR: FACE_OF_COLOR,
    COLOR_HEX: COLOR_HEX,
    COLOR_NAME: COLOR_NAME,
    CORNER_SLOTS: CORNER_SLOTS,
    EDGE_SLOTS: EDGE_SLOTS,
    ALG: ALG,
    faceletIndex: faceletIndex,
    faceOfNormal: faceOfNormal,
    applyMove: applyMove,
    applySeq: applySeq,
    invertMove: invertMove,
    invertSeq: invertSeq,
    isSolved: isSolved,
    simplify: simplify,
    validate: validate,
    solve: solve,
    search: search,
    randomScramble: randomScramble,
    scrambledState: scrambledState,
    toColors: toColors,
    fromColors: fromColors
  };
}));
