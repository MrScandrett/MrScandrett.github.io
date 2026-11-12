/* Board maths: what the AI Smart Blackboard does with a line once it can read it. No DOM.
 *
 *   BoardMath.interpret('y = x^2 - 4')        → { kind: 'graph', fn, analysis: { roots: [-2, 2], … } }
 *   BoardMath.interpret('z = x^2 + y^2')      → { kind: 'surface', fn }
 *   BoardMath.interpret('x^2 + y^2 = 25')     → { kind: 'implicit', fn }   (fn = left − right)
 *   BoardMath.interpret('2x + 5 = 15')        → { kind: 'solve', roots: [5], steps: [...] }
 *   BoardMath.interpret('3/4 + 5/8')          → { kind: 'arithmetic', value: 1.375, fraction: '11/8' }
 *   BoardMath.interpret('H2 + O2 = H2O')      → { kind: 'chem', balanced: '2H₂ + O₂ → 2H₂O' }
 *   BoardMath.sliceSolid('cube', { tilt, spin, offset }) → { shape, area, perimeter, points }
 *
 * The expression parser is a small recursive-descent one (no eval, no Function): numbers, x y,
 * + − × ÷ ^, brackets, implicit multiplication (2x, 3(x+1), xy), sin cos tan sqrt abs ln log exp,
 * pi and e. Anything it can't read gives null from compile(); nothing throws.
 * Tests: node --test tests/smart-board.test.mjs
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BoardMath = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ── Expressions ── */
  var FNS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs,
    ln: Math.log, log: Math.log10, exp: Math.exp
  };
  var FN_NAMES = ['sqrt', 'sin', 'cos', 'tan', 'abs', 'exp', 'log', 'ln'];
  var SUPERS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
  var SUBS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

  function normalize(text) {
    return String(text == null ? '' : text)
      .replace(/[−–—]/g, '-')
      .replace(/[×·⋅]/g, '*')
      .replace(/÷/g, '/')
      .replace(/π/g, 'pi')
      .replace(/√/g, 'sqrt')
      .replace(/[⁰¹²³⁴-⁹]+/g, function (run) {
        return '^' + run.split('').map(function (c) { return SUPERS[c]; }).join('');
      })
      .replace(/\*\*/g, '^')
      .trim();
  }

  function tokenize(src) {
    var s = normalize(src).toLowerCase();
    var out = [];
    var i = 0;
    while (i < s.length) {
      var c = s[i];
      if (c === ' ' || c === '\t') { i++; continue; }
      var num = /^(?:\d+\.?\d*|\.\d+)/.exec(s.slice(i));
      if (num) { out.push({ t: 'num', v: parseFloat(num[0]) }); i += num[0].length; continue; }
      if ('+-*/^(),'.indexOf(c) >= 0) { out.push({ t: c }); i++; continue; }
      var matched = false;
      for (var k = 0; k < FN_NAMES.length; k++) {
        if (s.substr(i, FN_NAMES[k].length) === FN_NAMES[k]) {
          out.push({ t: 'fn', v: FN_NAMES[k] }); i += FN_NAMES[k].length; matched = true; break;
        }
      }
      if (matched) continue;
      if (s.substr(i, 2) === 'pi') { out.push({ t: 'num', v: Math.PI }); i += 2; continue; }
      if (c === 'e') { out.push({ t: 'num', v: Math.E }); i++; continue; }
      if (c === 'x' || c === 'y') { out.push({ t: 'var', v: c }); i++; continue; }
      return null;
    }
    return out;
  }

  // Grammar: sum → term (± term)* ; term → unary ((*|/|implicit) unary)* ;
  // unary → -unary | power ; power → atom (^ unary)? ; atom → num | var | fn atom | ( sum )
  function parse(tokens) {
    var pos = 0;
    function peek() { return tokens[pos]; }
    function startsAtom(tk) { return tk && (tk.t === 'num' || tk.t === 'var' || tk.t === 'fn' || tk.t === '('); }
    function sum() {
      var node = term();
      while (peek() && (peek().t === '+' || peek().t === '-')) {
        var op = tokens[pos++].t;
        node = { op: op, a: node, b: term() };
      }
      return node;
    }
    function term() {
      var node = unary();
      for (;;) {
        var tk = peek();
        if (tk && (tk.t === '*' || tk.t === '/')) { pos++; node = { op: tk.t, a: node, b: unary() }; }
        else if (startsAtom(tk)) node = { op: '*', a: node, b: power() };
        else return node;
      }
    }
    function unary() {
      if (peek() && peek().t === '-') { pos++; return { op: 'neg', a: unary() }; }
      if (peek() && peek().t === '+') { pos++; return unary(); }
      return power();
    }
    function power() {
      var base = atom();
      if (peek() && peek().t === '^') { pos++; return { op: '^', a: base, b: unary() }; }
      return base;
    }
    function atom() {
      var tk = tokens[pos++];
      if (!tk) throw new Error('end');
      if (tk.t === 'num') return { num: tk.v };
      if (tk.t === 'var') return { v: tk.v };
      if (tk.t === 'fn') {
        // sin(x)^2 squares the sine; sin x^2 takes the power with it.
        if (peek() && peek().t === '(') return { fn: tk.v, a: atom() };
        return { fn: tk.v, a: power() };
      }
      if (tk.t === '(') {
        var inner = sum();
        if (!peek() || peek().t !== ')') throw new Error('bracket');
        pos++;
        return inner;
      }
      throw new Error('unexpected');
    }
    var tree = sum();
    if (pos !== tokens.length) throw new Error('trailing');
    return tree;
  }

  function evalNode(n, x, y) {
    if ('num' in n) return n.num;
    if ('v' in n) return n.v === 'x' ? x : y;
    if (n.fn) return FNS[n.fn](evalNode(n.a, x, y));
    var a = evalNode(n.a, x, y);
    if (n.op === 'neg') return -a;
    var b = evalNode(n.b, x, y);
    switch (n.op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return a / b;
      default: return Math.pow(a, b);
    }
  }

  function usesVars(n, seen) {
    if (!n || typeof n !== 'object') return seen;
    if ('v' in n) seen[n.v] = true;
    usesVars(n.a, seen); usesVars(n.b, seen);
    return seen;
  }

  /** compile('2x + 1') → f(x, y) with f.vars = { x: true }; null when it can't be read. */
  function compile(src) {
    var tokens = tokenize(src);
    if (!tokens || !tokens.length) return null;
    var tree;
    try { tree = parse(tokens); } catch (_) { return null; }
    var fn = function (x, y) { return evalNode(tree, x, y || 0); };
    fn.vars = usesVars(tree, {});
    return fn;
  }

  /* ── Graph analysis (numeric, on the window students see) ── */
  function tidy(v) {
    var r = Math.round(v * 1000) / 1000;
    return Object.is(r, -0) ? 0 : r;
  }

  function bisect(f, lo, hi) {
    var flo = f(lo);
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2, fm = f(mid);
      if ((flo < 0) === (fm < 0)) { lo = mid; flo = fm; } else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function findRoots(f, lo, hi, steps) {
    var roots = [];
    var step = (hi - lo) / steps;
    var prevX = lo, prevY = f(lo);
    function add(r) {
      if (!roots.some(function (q) { return Math.abs(q - r) < 1e-4; })) roots.push(r);
    }
    for (var i = 1; i <= steps; i++) {
      var x = lo + i * step, y = f(x);
      if (isFinite(prevY) && isFinite(y)) {
        if (prevY === 0) add(prevX);
        else if ((prevY < 0) !== (y < 0) && Math.abs(y - prevY) < 1e6) add(bisect(f, prevX, x));
      }
      prevX = x; prevY = y;
    }
    // Roots the curve only touches (y = x^2): a local minimum of |f| that reaches zero.
    for (var j = 1; j < steps; j++) {
      var xm = lo + j * step;
      var a = Math.abs(f(xm - step)), b = Math.abs(f(xm)), c = Math.abs(f(xm + step));
      if (b <= a && b <= c && b < 1e-3) {
        var l = xm - step, r = xm + step;
        for (var k = 0; k < 50; k++) {
          var m1 = l + (r - l) / 3, m2 = r - (r - l) / 3;
          if (Math.abs(f(m1)) < Math.abs(f(m2))) r = m2; else l = m1;
        }
        if (Math.abs(f((l + r) / 2)) < 1e-7) add((l + r) / 2);
      }
    }
    return roots.sort(function (p, q) { return p - q; }).map(tidy);
  }

  function analyzeGraph(fn) {
    var f = function (x) { return fn(x, 0); };
    var out = { roots: findRoots(f, -20, 20, 4000), yIntercept: null, turning: [] };
    var y0 = f(0);
    if (isFinite(y0)) out.yIntercept = tidy(y0);
    var h = 1e-4;
    var d = function (x) { return (f(x + h) - f(x - h)) / (2 * h); };
    findRoots(d, -20, 20, 2000).slice(0, 6).forEach(function (x) {
      var y = f(x);
      if (!isFinite(y)) return;
      var curve = f(x + 0.01) + f(x - 0.01) - 2 * y;
      if (Math.abs(curve) < 1e-9) return;
      out.turning.push({ x: x, y: tidy(y), kind: curve > 0 ? 'min' : 'max' });
    });
    return out;
  }

  /* ── Equations in x ── */
  function fractionOf(v) {
    if (!isFinite(v)) return null;
    for (var den = 1; den <= 64; den++) {
      var numr = Math.round(v * den);
      if (Math.abs(numr / den - v) < 1e-9) return den === 1 ? String(numr) : numr + '/' + den;
    }
    return null;
  }

  function coef(v) { var t = tidy(v); return t === 1 ? '' : (t === -1 ? '−' : String(t)); }

  function solveEquation(lhsSrc, rhsSrc) {
    var L = compile(lhsSrc), R = compile(rhsSrc);
    if (!L || !R) return null;
    var h = function (x) { return L(x, 0) - R(x, 0); };
    var h0 = h(0), h1 = h(1), h2 = h(2), h3 = h(3), hm = h(-1);
    var eq = normalize(lhsSrc) + ' = ' + normalize(rhsSrc);
    var steps = [];
    var d2 = h2 - 2 * h1 + h0;
    var d3 = h3 - 3 * h2 + 3 * h1 - h0;
    var d2b = h1 - 2 * h0 + hm;
    var polyLike = [h0, h1, h2, h3, hm].every(isFinite);
    if (polyLike && Math.abs(d2) < 1e-9 && Math.abs(d2b) < 1e-9) {
      var slope = h1 - h0;
      if (Math.abs(slope) < 1e-12) {
        return { kind: 'solve', equation: eq, roots: [], steps: [Math.abs(h0) < 1e-12 ? 'Both sides are always equal: every x works.' : 'The x terms cancel and the sides never match: no solution.'] };
      }
      var x = -h0 / slope;
      steps.push('Move everything to one side: ' + coef(slope) + 'x ' + (h0 < 0 ? '− ' + tidy(-h0) : '+ ' + tidy(h0)) + ' = 0');
      steps.push('Take the constant across: ' + coef(slope) + 'x = ' + tidy(-h0));
      steps.push('Divide by ' + tidy(slope) + ': x = ' + (fractionOf(x) || tidy(x)));
      return { kind: 'solve', equation: eq, degree: 1, roots: [tidy(x)], steps: steps };
    }
    if (polyLike && Math.abs(d3) < 1e-7 && Math.abs(d2 - d2b) < 1e-7) {
      var a = d2 / 2, c = h0, b = h1 - h0 - a;
      var disc = b * b - 4 * a * c;
      steps.push('Standard form: ' + coef(a) + 'x² ' + (b < 0 ? '− ' + coef(-b) : '+ ' + coef(b)) + 'x ' + (c < 0 ? '− ' + tidy(-c) : '+ ' + tidy(c)) + ' = 0');
      steps.push('Discriminant b² − 4ac = ' + tidy(disc));
      if (disc < -1e-12) {
        steps.push('It is negative, so the parabola never crosses the x-axis: no real solution.');
        return { kind: 'solve', equation: eq, degree: 2, roots: [], steps: steps };
      }
      var sq = Math.sqrt(Math.max(0, disc));
      var roots = disc < 1e-12 ? [tidy(-b / (2 * a))] : [tidy((-b - sq) / (2 * a)), tidy((-b + sq) / (2 * a))].sort(function (p, q) { return p - q; });
      steps.push('x = (−b ± √' + tidy(Math.max(0, disc)) + ') ÷ 2a → x = ' + roots.join(' or x = '));
      return { kind: 'solve', equation: eq, degree: 2, roots: roots, steps: steps };
    }
    var found = findRoots(h, -50, 50, 10000);
    steps.push('Not a straight line or a parabola, so the board looks for where the two sides meet between −50 and 50.');
    steps.push(found.length ? 'They meet at x ≈ ' + found.join(', ') : 'They do not meet in that range.');
    return { kind: 'solve', equation: eq, roots: found, steps: steps, numeric: true };
  }

  /* ── Chemistry: balance by exact null space ── */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }

  function parseFormula(src) {
    var s = String(src).replace(/[₀-₉]/g, function (c) { return String(SUBS.indexOf(c)); }).replace(/\s+/g, '');
    var i = 0;
    function group(closer) {
      var atoms = {};
      while (i < s.length && s[i] !== closer) {
        var part;
        if (s[i] === '(' || s[i] === '[') {
          var close = s[i] === '(' ? ')' : ']';
          i++;
          part = group(close);
          if (s[i] !== close) throw new Error('bracket');
          i++;
        } else {
          var el = /^[A-Z][a-z]?/.exec(s.slice(i));
          if (!el) throw new Error('element');
          i += el[0].length;
          part = {};
          part[el[0]] = 1;
        }
        var n = /^\d+/.exec(s.slice(i));
        var mult = n ? parseInt(n[0], 10) : 1;
        if (n) i += n[0].length;
        Object.keys(part).forEach(function (k) { atoms[k] = (atoms[k] || 0) + part[k] * mult; });
      }
      return atoms;
    }
    var atoms = group(null);
    if (i !== s.length || !Object.keys(atoms).length) throw new Error('formula');
    return atoms;
  }

  function prettyFormula(src) {
    return String(src).replace(/\s+/g, '').replace(/\d+/g, function (d, at) {
      return at === 0 ? d : d.split('').map(function (c) { return SUBS[+c]; }).join('');
    });
  }

  function looksChemical(text) {
    var s = normalize(text).replace(/[₀-₉]/g, function (c) { return String(SUBS.indexOf(c)); });
    if (!/(=|->|→|⟶)/.test(s)) return false;
    var sides = s.split(/=|->|→|⟶/);
    if (sides.length !== 2) return false;
    return sides.every(function (side) {
      var terms = side.split('+').map(function (t) { return t.trim(); });
      return terms.length && terms.every(function (t) { return /^\d*\s*(?:[A-Z][a-z]?\d*|[()[\]]\d*)+$/.test(t) && /[A-Z]/.test(t); });
    }) && /[A-Z][a-z]?\d|[A-Z][A-Za-z]|\+/.test(s);
  }

  /** balance('H2 + O2 = H2O') → { ok, coefficients: [2,1,2], balanced, atoms: [{ el, left, right }] } */
  function balance(text) {
    var s = normalize(text).replace(/->|→|⟶/g, '=');
    var sides = s.split('=');
    if (sides.length !== 2) return { ok: false, reason: 'Write reactants, an arrow or =, then products.' };
    var species = [];
    try {
      sides.forEach(function (side, si) {
        side.split('+').forEach(function (termSrc) {
          var t = termSrc.trim().replace(/^\d+\s*/, '');
          if (!t) throw new Error('empty');
          species.push({ src: t, atoms: parseFormula(t), side: si });
        });
      });
    } catch (_) {
      return { ok: false, reason: 'One of the formulas could not be read. Use capitals for elements: NaCl, H2O, Ca(OH)2.' };
    }
    var elements = [];
    species.forEach(function (sp) { Object.keys(sp.atoms).forEach(function (el) { if (elements.indexOf(el) < 0) elements.push(el); }); });
    var n = species.length;
    // Rows: one per element; products negative. Exact fractions as [num, den].
    var M = elements.map(function (el) {
      return species.map(function (sp) { return [(sp.atoms[el] || 0) * (sp.side ? -1 : 1), 1]; });
    });
    function fr(a, b) { if (b < 0) { a = -a; b = -b; } var g = gcd(a, b); return [a / g, b / g]; }
    function sub(p, q) { return fr(p[0] * q[1] - q[0] * p[1], p[1] * q[1]); }
    function mul(p, q) { return fr(p[0] * q[0], p[1] * q[1]); }
    function div(p, q) { return fr(p[0] * q[1], p[1] * q[0]); }
    var pivots = [];
    var row = 0;
    for (var col = 0; col < n && row < M.length; col++) {
      var pr = -1;
      for (var r = row; r < M.length; r++) if (M[r][col][0] !== 0) { pr = r; break; }
      if (pr < 0) continue;
      var tmp = M[row]; M[row] = M[pr]; M[pr] = tmp;
      var pv = M[row][col];
      M[row] = M[row].map(function (v) { return div(v, pv); });
      for (var r2 = 0; r2 < M.length; r2++) {
        if (r2 === row || M[r2][col][0] === 0) continue;
        var f = M[r2][col];
        M[r2] = M[r2].map(function (v, c) { return sub(v, mul(f, M[row][c])); });
      }
      pivots.push(col);
      row++;
    }
    var free = [];
    for (var c2 = 0; c2 < n; c2++) if (pivots.indexOf(c2) < 0) free.push(c2);
    if (free.length !== 1) {
      return { ok: false, reason: free.length === 0 ? 'These substances cannot be balanced: an element appears on only one side.' : 'More than one way to balance this; it is really two reactions written as one.' };
    }
    var sol = [];
    for (var c3 = 0; c3 < n; c3++) sol.push([0, 1]);
    sol[free[0]] = [1, 1];
    pivots.forEach(function (pc, ri) { sol[pc] = fr(-M[ri][free[0]][0], M[ri][free[0]][1]); });
    var lcm = sol.reduce(function (acc, v) { return acc * v[1] / gcd(acc, v[1]); }, 1);
    var ints = sol.map(function (v) { return v[0] * (lcm / v[1]); });
    var g = ints.reduce(function (acc, v) { return gcd(acc, v); }, 0);
    ints = ints.map(function (v) { return v / g; });
    if (ints[0] < 0) ints = ints.map(function (v) { return -v; });
    if (ints.some(function (v) { return v <= 0; })) return { ok: false, reason: 'No balance with every substance on the side it is written on.' };
    function sideText(si) {
      return species.map(function (sp, i) { return sp.side === si ? (ints[i] === 1 ? '' : ints[i]) + prettyFormula(sp.src) : null; })
        .filter(Boolean).join(' + ');
    }
    return {
      ok: true,
      coefficients: ints,
      species: species.map(function (sp) { return sp.src; }),
      balanced: sideText(0) + ' → ' + sideText(1),
      atoms: elements.map(function (el) {
        var left = 0, right = 0;
        species.forEach(function (sp, i) { if (sp.side) right += (sp.atoms[el] || 0) * ints[i]; else left += (sp.atoms[el] || 0) * ints[i]; });
        return { el: el, left: left, right: right };
      })
    };
  }

  /* ── One line in, one meaning out ── */
  function interpret(text) {
    var raw = String(text == null ? '' : text).trim();
    if (!raw) return { kind: 'unknown', text: raw };
    if (looksChemical(raw)) {
      var bal = balance(raw);
      return { kind: 'chem', text: raw, ok: bal.ok, balanced: bal.balanced, coefficients: bal.coefficients, atoms: bal.atoms, reason: bal.reason };
    }
    var s = normalize(raw).toLowerCase().replace(/^f\s*\(\s*x\s*\)\s*=/, 'y =').replace(/^f\s*\(\s*x\s*,\s*y\s*\)\s*=/, 'z =');
    var parts = s.split('=');
    if (parts.length > 2) return { kind: 'unknown', text: raw };
    if (parts.length === 2) {
      var lhs = parts[0].trim(), rhs = parts[1].trim();
      if (!lhs && rhs) { lhs = rhs; rhs = ''; }
      if (lhs === 'y' || lhs === 'z') {
        var f = compile(rhs);
        if (!f) return { kind: 'unknown', text: raw };
        if (lhs === 'z' || f.vars.y) return { kind: 'surface', text: 'z = ' + rhs, expr: rhs, fn: f };
        return { kind: 'graph', text: 'y = ' + rhs, expr: rhs, fn: f, analysis: analyzeGraph(f) };
      }
      if (!rhs) {
        // "3 + 4 =" asks for the answer.
        var only = compile(lhs);
        if (only && !only.vars.x && !only.vars.y) return arithmetic(lhs, only);
        return { kind: 'unknown', text: raw };
      }
      var L = compile(lhs), R = compile(rhs);
      if (!L || !R) return { kind: 'unknown', text: raw };
      var hasY = L.vars.y || R.vars.y, hasX = L.vars.x || R.vars.x;
      if (hasY) {
        return { kind: 'implicit', text: lhs + ' = ' + rhs, fn: function (x, y) { return L(x, y) - R(x, y); } };
      }
      if (hasX) return Object.assign(solveEquation(lhs, rhs), { text: raw });
      var lv = L(0, 0), rv = R(0, 0);
      return { kind: 'check', text: raw, left: tidy(lv), right: tidy(rv), isTrue: Math.abs(lv - rv) < 1e-9 };
    }
    var fn = compile(s);
    if (!fn) return { kind: 'unknown', text: raw };
    if (fn.vars.x && fn.vars.y) return { kind: 'surface', text: 'z = ' + s, expr: s, fn: fn };
    if (fn.vars.x) return { kind: 'graph', text: 'y = ' + s, expr: s, fn: fn, analysis: analyzeGraph(fn) };
    if (fn.vars.y) return { kind: 'unknown', text: raw };
    return arithmetic(s, fn);
  }

  function arithmetic(src, fn) {
    var v = fn(0, 0);
    return { kind: 'arithmetic', text: src, value: isFinite(v) ? Math.round(v * 1e9) / 1e9 : v, fraction: Number.isInteger(v) ? null : fractionOf(v) };
  }

  /* ── Cross-sections: a plane through a solid ──
   * Solids are centred on the origin, y up, in board units. The plane's normal starts as +y
   * (a level cut), tilts by `tilt` degrees toward +x, then spins `spin` degrees about y.
   * `offset` (−1…1) slides the plane along its normal across the solid. */
  var SOLIDS = {
    cube: { label: 'Cube', side: 4 },
    cylinder: { label: 'Cylinder', r: 2, h: 4 },
    cone: { label: 'Cone', r: 2, h: 4 },
    sphere: { label: 'Sphere', r: 2 }
  };
  var ROUND_N = 180;

  function solidVertices(kind) {
    var v = [], e = [], i;
    if (kind === 'cube') {
      var s = SOLIDS.cube.side / 2;
      for (i = 0; i < 8; i++) v.push([i & 1 ? s : -s, i & 2 ? s : -s, i & 4 ? s : -s]);
      for (i = 0; i < 8; i++) for (var j = i + 1; j < 8; j++) {
        var diff = i ^ j;
        if (diff === 1 || diff === 2 || diff === 4) e.push([i, j]);
      }
    } else if (kind === 'cylinder' || kind === 'cone') {
      var S = SOLIDS[kind], r = S.r, hh = S.h / 2;
      for (i = 0; i < ROUND_N; i++) {
        var t = (i / ROUND_N) * Math.PI * 2;
        v.push([r * Math.cos(t), -hh, r * Math.sin(t)]);
      }
      if (kind === 'cylinder') {
        for (i = 0; i < ROUND_N; i++) v.push([v[i][0], hh, v[i][2]]);
        for (i = 0; i < ROUND_N; i++) {
          var nx = (i + 1) % ROUND_N;
          e.push([i, nx], [ROUND_N + i, ROUND_N + nx], [i, ROUND_N + i]);
        }
      } else {
        v.push([0, hh, 0]);
        for (i = 0; i < ROUND_N; i++) e.push([i, (i + 1) % ROUND_N], [i, ROUND_N]);
      }
    }
    return { v: v, e: e };
  }

  function planeOf(kind, opts) {
    var tilt = ((opts && opts.tilt) || 0) * Math.PI / 180;
    var spin = ((opts && opts.spin) || 0) * Math.PI / 180;
    var n = [Math.sin(tilt) * Math.cos(spin), Math.cos(tilt), Math.sin(tilt) * Math.sin(spin)];
    var reach;
    if (kind === 'sphere') reach = SOLIDS.sphere.r;
    else {
      reach = 0;
      solidVertices(kind).v.forEach(function (p) { reach = Math.max(reach, Math.abs(p[0] * n[0] + p[1] * n[1] + p[2] * n[2])); });
    }
    var off = Math.max(-1, Math.min(1, (opts && opts.offset) || 0));
    // In-plane axes u, w (u is the tilt direction lying in the plane).
    var u = [Math.cos(tilt) * Math.cos(spin), -Math.sin(tilt), Math.cos(tilt) * Math.sin(spin)];
    var w = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
    return { n: n, d: off * reach, u: u, w: w, reach: reach };
  }

  function polygonMeasure(pts, plane) {
    var flat = pts.map(function (p) {
      return [p[0] * plane.u[0] + p[1] * plane.u[1] + p[2] * plane.u[2], p[0] * plane.w[0] + p[1] * plane.w[1] + p[2] * plane.w[2]];
    });
    var area = 0, perim = 0;
    for (var i = 0; i < flat.length; i++) {
      var a = flat[i], b = flat[(i + 1) % flat.length];
      area += a[0] * b[1] - b[0] * a[1];
      perim += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return { area: Math.abs(area) / 2, perimeter: perim };
  }

  var POLY_NAMES = { 3: 'Triangle', 4: 'Quadrilateral', 5: 'Pentagon', 6: 'Hexagon' };

  function nameCubeSection(pts) {
    var n = pts.length;
    if (n !== 4) {
      if (n === 3 || n === 6) {
        var sides = pts.map(function (p, i) { var q = pts[(i + 1) % n]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); });
        var same = sides.every(function (s) { return Math.abs(s - sides[0]) < 1e-3; });
        if (same) return n === 3 ? 'Equilateral triangle' : 'Regular hexagon';
      }
      return POLY_NAMES[n] || n + '-sided polygon';
    }
    function len(i) { var p = pts[i], q = pts[(i + 1) % 4]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); }
    function dot(i) {
      var p = pts[i], q = pts[(i + 1) % 4], r = pts[(i + 2) % 4];
      return (q[0] - p[0]) * (r[0] - q[0]) + (q[1] - p[1]) * (r[1] - q[1]) + (q[2] - p[2]) * (r[2] - q[2]);
    }
    var right = [0, 1, 2, 3].every(function (i) { return Math.abs(dot(i)) < 1e-6; });
    var equal = Math.abs(len(0) - len(1)) < 1e-6;
    var para = Math.abs(len(0) - len(2)) < 1e-6 && Math.abs(len(1) - len(3)) < 1e-6;
    if (right) return equal ? 'Square' : 'Rectangle';
    if (para) return equal ? 'Rhombus' : 'Parallelogram';
    return 'Trapezoid';
  }

  /** sliceSolid('cube', { tilt, spin, offset }) → { shape, area, perimeter, points, plane } */
  function sliceSolid(kind, opts) {
    if (!SOLIDS[kind]) return null;
    var plane = planeOf(kind, opts);
    var n = plane.n, d = plane.d;
    var tiltDeg = Math.abs((opts && opts.tilt) || 0);
    if (kind === 'sphere') {
      var R = SOLIDS.sphere.r;
      var rad = Math.sqrt(Math.max(0, R * R - d * d));
      var ring = [];
      for (var k = 0; k < 64; k++) {
        var a = (k / 64) * Math.PI * 2, cu = rad * Math.cos(a), cw = rad * Math.sin(a);
        ring.push([n[0] * d + plane.u[0] * cu + plane.w[0] * cw, n[1] * d + plane.u[1] * cu + plane.w[1] * cw, n[2] * d + plane.u[2] * cu + plane.w[2] * cw]);
      }
      return {
        shape: rad < 1e-9 ? 'Point' : (Math.abs(d) < 1e-9 ? 'Great circle' : 'Circle'),
        area: Math.PI * rad * rad, perimeter: 2 * Math.PI * rad, radius: rad, points: ring, plane: plane, exact: true
      };
    }
    var solid = solidVertices(kind);
    var dist = solid.v.map(function (p) { return p[0] * n[0] + p[1] * n[1] + p[2] * n[2] - d; });
    var pts = [];
    function add(p) {
      if (!pts.some(function (q) { return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-7; })) pts.push(p);
    }
    solid.e.forEach(function (edge) {
      var da = dist[edge[0]], db = dist[edge[1]];
      var A = solid.v[edge[0]], B = solid.v[edge[1]];
      if (Math.abs(da) < 1e-9) add(A);
      if (Math.abs(db) < 1e-9) add(B);
      if ((da < -1e-9 && db > 1e-9) || (da > 1e-9 && db < -1e-9)) {
        var t = da / (da - db);
        add([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
      }
    });
    if (pts.length < 3) return { shape: pts.length ? 'Edge or corner only' : 'The plane misses the solid', area: 0, perimeter: 0, points: pts, plane: plane };
    var c = [0, 0, 0];
    pts.forEach(function (p) { c[0] += p[0] / pts.length; c[1] += p[1] / pts.length; c[2] += p[2] / pts.length; });
    function ang(p) {
      var rx = p[0] - c[0], ry = p[1] - c[1], rz = p[2] - c[2];
      return Math.atan2(rx * plane.w[0] + ry * plane.w[1] + rz * plane.w[2], rx * plane.u[0] + ry * plane.u[1] + rz * plane.u[2]);
    }
    pts.sort(function (p, q) { return ang(p) - ang(q); });
    var m = polygonMeasure(pts, plane);
    var shape;
    if (kind === 'cube') shape = nameCubeSection(pts);
    else if (kind === 'cylinder') {
      var hitsCaps = pts.some(function (p) { return Math.abs(Math.abs(p[1]) - SOLIDS.cylinder.h / 2) < 1e-6; });
      if (tiltDeg < 1e-6) shape = 'Circle';
      else if (Math.abs(tiltDeg - 90) < 1e-6) shape = 'Rectangle';
      else shape = hitsCaps ? 'Ellipse cut off by an end' : 'Ellipse';
      if (!hitsCaps && tiltDeg < 90 - 1e-6) {
        // A whole ellipse: semi-axes r and r / cos(tilt), so the area is exact.
        m.area = Math.PI * SOLIDS.cylinder.r * SOLIDS.cylinder.r / Math.cos(tiltDeg * Math.PI / 180);
      }
    } else {
      var S = SOLIDS.cone;
      var side = Math.atan2(S.h, S.r) * 180 / Math.PI; // slope of the cone's side, from the base
      var throughApex = Math.abs(n[1] * S.h / 2 - d) < 1e-6;
      if (throughApex && tiltDeg > side) shape = 'Triangle';
      else if (tiltDeg < 1e-6) shape = 'Circle';
      else if (tiltDeg < side - 0.5) shape = pts.some(function (p) { return Math.abs(p[1] + S.h / 2) < 1e-6; }) ? 'Ellipse cut off by the base' : 'Ellipse';
      else if (tiltDeg <= side + 0.5) shape = 'Parabola';
      else shape = 'Hyperbola (one branch)';
    }
    return { shape: shape, area: m.area, perimeter: m.perimeter, points: pts, plane: plane, sides: kind === 'cube' ? pts.length : null };
  }

  return {
    normalize: normalize,
    compile: compile,
    analyzeGraph: analyzeGraph,
    solveEquation: solveEquation,
    fractionOf: fractionOf,
    looksChemical: looksChemical,
    parseFormula: parseFormula,
    prettyFormula: prettyFormula,
    balance: balance,
    interpret: interpret,
    SOLIDS: SOLIDS,
    solidVertices: solidVertices,
    sliceSolid: sliceSolid
  };
}));
