/* Circles & complex roots: the exact maths behind the lesson, with no DOM.
 *
 *   CircleComplex.circleFromGeneral({ A: 1, D: 10, E: -6, F: 18 })
 *     → centre (−5, 3), r² = 16, radius 4, and every completing-the-square step
 *   CircleComplex.quadratic({ a: 5, b: -5, c: 6, v: 'y' })
 *     → (5 ± i√95)/10 = 1/2 ± (√95/10)i, with the quadratic-formula steps
 *   CircleComplex.parseNumber('√95/10')   → 0.9746…
 *
 * Everything is exact: fractions stay fractions and radicals are simplified
 * (√48 = 4√3), so the steps read the way a student would write them.
 * Output uses the typographic minus (−) and superscript ².
 *
 * Generators take an rng (a function returning [0, 1)) so tests can seed them.
 * Tests: node --test tests/circle-complex-math.test.mjs
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CircleComplex = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MINUS = '−';

  /* ── Integers and fractions ─────────────────────────────────── */
  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }
  function fr(n, d) {
    if (d === undefined) d = 1;
    if (d === 0) throw new Error('zero denominator');
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d) || 1;
    return { n: n / g, d: d / g };
  }
  // A decimal from a slider (0.5, 6.25) as an exact fraction.
  function fromNumber(x) {
    if (typeof x === 'object') return x;
    for (var d = 1; d <= 10000; d *= 10) {
      for (var m = 1; m <= 8; m *= 2) {
        var n = x * d * m;
        if (Math.abs(n - Math.round(n)) < 1e-9) return fr(Math.round(n), d * m);
      }
    }
    return fr(Math.round(x * 10000), 10000);
  }
  function add(a, b) { return fr(a.n * b.d + b.n * a.d, a.d * b.d); }
  function sub(a, b) { return fr(a.n * b.d - b.n * a.d, a.d * b.d); }
  function mul(a, b) { return fr(a.n * b.n, a.d * b.d); }
  function div(a, b) { return fr(a.n * b.d, a.d * b.n); }
  function neg(a) { return fr(-a.n, a.d); }
  function val(a) { return a.n / a.d; }
  function isZero(a) { return a.n === 0; }

  function fmtInt(n) { return n < 0 ? MINUS + (-n) : String(n); }
  function fmtFrac(a) { return a.d === 1 ? fmtInt(a.n) : fmtInt(a.n) + '/' + a.d; }
  // In brackets when negative or a fraction, for squaring: (−2)², (7/2)².
  function fmtParen(a) { return a.n < 0 || a.d !== 1 ? '(' + fmtFrac(a) + ')' : fmtFrac(a); }

  /* ── Radicals ───────────────────────────────────────────────── */
  // n = out² · inside, inside square-free.  simplifyRadical(48) → { out: 4, inside: 3 }
  function simplifyRadical(n) {
    if (n < 0 || n !== Math.floor(n)) throw new Error('simplifyRadical needs a whole number ≥ 0');
    if (n === 0) return { out: 0, inside: 1 };
    var out = 1, inside = n;
    for (var f = 2; f * f <= inside; f++) {
      while (inside % (f * f) === 0) { inside /= f * f; out *= f; }
    }
    return { out: out, inside: inside };
  }
  // "4√3", "√95", "7"
  function fmtRad(out, inside) {
    if (inside === 1) return String(out);
    return (out === 1 ? '' : String(out)) + '√' + inside;
  }
  // √(n/d) exactly: √(n·d)/d, simplified.  { text, value, rational }
  function sqrtFrac(a) {
    var rad = simplifyRadical(a.n * a.d);
    var g = gcd(rad.out, a.d);
    var top = rad.out / g, bottom = a.d / g;
    var text = fmtRad(top, rad.inside) + (bottom === 1 ? '' : '/' + bottom);
    return { text: text, value: Math.sqrt(val(a)), rational: rad.inside === 1 };
  }

  /* ── Pretty polynomials ─────────────────────────────────────── */
  // One signed term. term(fr(-4), 'x', false) → " − 4x"; first terms carry no space.
  function term(c, name, first) {
    if (isZero(c)) return '';
    var negative = c.n < 0, mag = fr(Math.abs(c.n), c.d);
    var magText = name && mag.n === 1 && mag.d === 1 ? '' : fmtFrac(mag);
    if (name && mag.d !== 1) magText = '(' + magText + ')';   // (4/7)x, never 4/7x
    var sign = first ? (negative ? MINUS : '') : (negative ? ' ' + MINUS + ' ' : ' + ');
    return sign + magText + (name || '');
  }
  function poly(terms) {
    var out = '';
    terms.forEach(function (t) { out += term(t[0], t[1], out === ''); });
    return out || '0';
  }
  // (x − 2)², (y + 7/2)², or x² when the centre coordinate is 0.
  function shifted(name, c) {
    if (isZero(c)) return name + '²';
    return '(' + name + (c.n > 0 ? ' ' + MINUS + ' ' : ' + ') + fmtFrac(fr(Math.abs(c.n), c.d)) + ')²';
  }

  /* ── Circles ────────────────────────────────────────────────── */
  // General form A·x² + A·y² + D·x + E·y + F = 0 as text.
  function generalText(A, D, E, F) {
    A = fromNumber(A); D = fromNumber(D); E = fromNumber(E); F = fromNumber(F);
    return poly([[A, 'x²'], [A, 'y²'], [D, 'x'], [E, 'y'], [F, '']]) + ' = 0';
  }
  function standardText(h, k, r2) {
    return shifted('x', fromNumber(h)) + ' + ' + shifted('y', fromNumber(k)) + ' = ' + fmtFrac(fromNumber(r2));
  }
  // Centre and radius → expanded general form (A = 1).
  function expandCircle(h, k, r) {
    h = fromNumber(h); k = fromNumber(k); r = fromNumber(r);
    var D = mul(fr(-2), h), E = mul(fr(-2), k);
    var F = sub(add(mul(h, h), mul(k, k)), mul(r, r));
    return { D: D, E: E, F: F, r2: mul(r, r), general: generalText(1, D, E, F), standard: standardText(h, k, mul(r, r)) };
  }

  // Complete the square on A·x² + A·y² + D·x + E·y + F = 0.
  function circleFromGeneral(p) {
    var A = fromNumber(p.A === undefined ? 1 : p.A), D = fromNumber(p.D), E = fromNumber(p.E), F = fromNumber(p.F);
    if (isZero(A)) throw new Error('A must not be 0');
    var steps = [];
    steps.push({ title: 'Start', math: generalText(A, D, E, F) });
    if (!(A.n === 1 && A.d === 1)) {
      D = div(D, A); E = div(E, A); F = div(F, A);
      steps.push({
        title: 'Divide every term by ' + fmtFrac(A),
        note: 'x² and y² need a coefficient of 1 before the half-and-square trick works.',
        math: generalText(1, D, E, F)
      });
    }
    var halfD = div(D, fr(2)), halfE = div(E, fr(2));
    var sqD = mul(halfD, halfD), sqE = mul(halfE, halfE);
    var right = neg(F);
    var gx = isZero(D) ? 'x²' : '(' + poly([[fr(1), 'x²'], [D, 'x']]) + ')';
    var gy = isZero(E) ? 'y²' : '(' + poly([[fr(1), 'y²'], [E, 'y']]) + ')';
    steps.push({
      title: 'Group x with x, y with y, and move the constant across',
      math: gx + ' + ' + gy + ' = ' + fmtFrac(right)
    });
    var halfParts = [];
    if (!isZero(D)) halfParts.push('x: (' + fmtFrac(D) + ' ÷ 2)² = ' + fmtParen(halfD) + '² = ' + fmtFrac(sqD));
    else halfParts.push('x: no x-term, so x² is already a perfect square (add 0)');
    if (!isZero(E)) halfParts.push('y: (' + fmtFrac(E) + ' ÷ 2)² = ' + fmtParen(halfE) + '² = ' + fmtFrac(sqE));
    else halfParts.push('y: no y-term, so y² is already a perfect square (add 0)');
    steps.push({ title: 'Half each middle coefficient, then square it', math: halfParts.join('     ') });
    var gx2 = isZero(D) ? 'x²' : '(' + poly([[fr(1), 'x²'], [D, 'x'], [sqD, '']]) + ')';
    var gy2 = isZero(E) ? 'y²' : '(' + poly([[fr(1), 'y²'], [E, 'y'], [sqE, '']]) + ')';
    var rhs = [fmtFrac(right)];
    if (!isZero(sqD)) rhs.push(fmtFrac(sqD));
    if (!isZero(sqE)) rhs.push(fmtFrac(sqE));
    var r2 = add(add(right, sqD), sqE);
    steps.push({
      title: 'Add those squares to BOTH sides',
      note: 'Adding to one side only changes the equation. This is the most common slip.',
      math: gx2 + ' + ' + gy2 + ' = ' + rhs.join(' + ').replace(/\+ −/g, MINUS + ' ')
    });
    var h = neg(halfD), k = neg(halfE);
    steps.push({ title: 'Factor each group as a perfect square', math: standardText(h, k, r2) });
    var kind = r2.n > 0 ? 'circle' : (r2.n === 0 ? 'point' : 'none');
    var radius = kind === 'circle' ? sqrtFrac(r2) : null;
    var read;
    if (kind === 'circle') {
      var rootOf = '\u221A' + (r2.d === 1 ? r2.n : '(' + fmtFrac(r2) + ')');
      read = 'Centre (' + fmtFrac(h) + ', ' + fmtFrac(k) + '). r² = ' + fmtFrac(r2) + ', so r = ' +
        (radius.rational ? radius.text : rootOf + (radius.text === rootOf ? '' : ' = ' + radius.text) + ' \u2248 ' + round(radius.value, 2)) + '.';
      if (!isZero(h)) read += ' Watch the sign: (x ' + (h.n > 0 ? MINUS : '+') + ' ' + fmtFrac(fr(Math.abs(h.n), h.d)) + ')² means h = ' + fmtFrac(h) + '.';
    } else if (kind === 'point') {
      read = 'r² = 0: the only solution is the single point (' + fmtFrac(h) + ', ' + fmtFrac(k) + '). A "circle" of radius 0.';
    } else {
      read = 'r² = ' + fmtFrac(r2) + ' is negative. Two squares can never add to a negative number, so no real point works: there is no graph.';
    }
    steps.push({ title: 'Read the centre and radius', math: read });
    return {
      h: h, k: k, r2: r2, kind: kind,
      hValue: val(h), kValue: val(k), r2Value: val(r2),
      radiusText: radius ? radius.text : null,
      radiusValue: radius ? radius.value : (kind === 'point' ? 0 : NaN),
      standard: standardText(h, k, r2),
      steps: steps
    };
  }

  /* ── Quadratics and complex roots ───────────────────────────── */
  function fmtQuadratic(a, b, c, v) {
    v = v || 'x';
    return poly([[fr(a), v + '²'], [fr(b), v], [fr(c), '']]) + ' = 0';
  }
  // "i√95", "3i", "i", "2i√3"
  function fmtImag(out, inside) {
    if (inside === 1) return (out === 1 ? '' : String(out)) + 'i';
    return (out === 1 ? '' : String(out)) + 'i√' + inside;
  }
  // The imaginary part on its own: "√95/10", "3/2", "2√3"
  function fmtCoef(out, inside, den) {
    var g = gcd(out, den);
    out /= g; den /= g;
    return { text: fmtRad(out, inside) + (den === 1 ? '' : '/' + den), out: out, den: den };
  }

  function quadratic(p) {
    var a = p.a, b = p.b, c = p.c, v = p.v || 'x';
    if (!a) throw new Error('a must not be 0');
    [a, b, c].forEach(function (n) { if (n !== Math.floor(n)) throw new Error('whole-number coefficients only'); });
    var D = b * b - 4 * a * c;
    var kind = D > 0 ? 'two-real' : (D === 0 ? 'one-real' : 'complex');
    var steps = [];
    steps.push({ title: 'Read off a, b and c', math: fmtQuadratic(a, b, c, v) + '     a = ' + fmtInt(a) + ', b = ' + fmtInt(b) + ', c = ' + fmtInt(c) });
    steps.push({
      title: 'Find the discriminant',
      math: 'b² − 4ac = ' + fmtParen(fr(b)) + '² − 4' + '(' + fmtInt(a) + ')(' + fmtInt(c) + ') = ' +
        fmtInt(b * b) + ' ' + (4 * a * c < 0 ? '+ ' + (-4 * a * c) : MINUS + ' ' + (4 * a * c)) + ' = ' + fmtInt(D)
    });
    steps.push({
      title: D > 0 ? 'Positive: two real roots' : (D === 0 ? 'Zero: one repeated real root' : 'Negative: no real roots, two complex roots'),
      note: D > 0 ? 'The parabola crosses the x-axis twice.' :
        (D === 0 ? 'The vertex sits exactly on the x-axis.' :
          'The parabola never touches the x-axis. The roots still exist; they are a conjugate pair p ± qi.')
    });
    var rad = simplifyRadical(Math.abs(D));
    var den = 2 * a, top = -b, s = rad.out, t = rad.inside;
    if (D < 0) {
      var rootMath = '√(' + fmtInt(D) + ') = √' + (-D) + ' · √(' + MINUS + '1) = ';
      if (t === 1) rootMath += fmtImag(s, 1);
      else if (s > 1) rootMath += 'i√' + (-D) + ' = i√(' + (s * s) + ' · ' + t + ') = ' + fmtImag(s, t);
      else rootMath += 'i√' + (-D);
      steps.push({ title: 'Square root of a negative: pull out i = √(−1)', math: rootMath });
    } else if (D > 0 && s > 1 && t > 1) {
      steps.push({ title: 'Simplify the radical', math: '√' + D + ' = √(' + (s * s) + ' · ' + t + ') = ' + fmtRad(s, t) });
    }
    var unreduced = '(' + fmtInt(top) + ' ± ' + (D < 0 ? 'i√' + (-D) : '√' + D) + ') / ' + fmtInt(den);
    steps.push({ title: 'Substitute into ' + v + ' = (−b ± √(b² − 4ac)) / 2a', math: v + ' = ' + unreduced });

    var out = { a: a, b: b, c: c, v: v, D: D, kind: kind, steps: steps };
    out.re = -b / (2 * a);
    out.im = D < 0 ? Math.sqrt(-D) / (2 * Math.abs(a)) : 0;
    out.reText = fmtFrac(fr(-b, 2 * a));

    if (D >= 0 && t === 1) {
      // Rational roots.
      var r1 = fr(-b + s, den), r2 = fr(-b - s, den);
      out.roots = D === 0 ? [r1] : [r1, r2];
      out.rootValues = out.roots.map(val);
      out.exact = D === 0 ? v + ' = ' + fmtFrac(r1) : v + ' = ' + fmtFrac(r1) + ' or ' + v + ' = ' + fmtFrac(r2);
      steps.push({ title: D === 0 ? 'Only one value: ± 0 changes nothing' : 'Take + and − separately', math: out.exact });
      return out;
    }
    // Irrational or complex: reduce (top ± s·√t)/den by the common factor.
    var g = gcd(gcd(top, s), den) || 1;
    var T = top / g, S = s / g, Den = den / g;
    if (Den < 0) { T = -T; Den = -Den; }
    var radText = D < 0 ? fmtImag(S, t) : fmtRad(S, t);
    var numer = (T === 0 ? '±' + radText : fmtInt(T) + ' ± ' + radText);
    var combined = Den === 1 ? numer : (T === 0 ? numer + '/' + Den : '(' + numer + ')/' + Den);
    if (g > 1) steps.push({ title: 'Divide top and bottom by ' + g, math: v + ' = ' + combined });
    var coef = fmtCoef(s, t, Math.abs(den));
    var imagPart = D < 0 ? (coef.den === 1 ? fmtImag(coef.out, t) : '(' + coef.text + ')i') : coef.text;
    var split = top === 0 ? '±' + imagPart : out.reText + ' ± ' + imagPart;
    out.exact = v + ' = ' + combined;
    out.split = v + ' = ' + split;
    out.imText = coef.text;
    if (D < 0) {
      steps.push({
        title: 'Split into real and imaginary parts',
        math: out.split + (/[√/]/.test(out.split) ? '   ≈ ' + round(out.re, 3) + ' ± ' + round(out.im, 3) + 'i' : ''),
        note: 'Real part = −b/2a, the x of the vertex. Imaginary part = √|b² − 4ac| / 2|a|.'
      });
      var chk = evalComplex(a, b, c, out.re, out.im);
      steps.push({
        title: 'Check one root',
        math: fmtInt(a) + '(' + round(out.re, 3) + ' + ' + round(out.im, 3) + 'i)² ' + (b < 0 ? MINUS + ' ' + (-b) : '+ ' + b) +
          '(' + round(out.re, 3) + ' + ' + round(out.im, 3) + 'i) ' + (c < 0 ? MINUS + ' ' + (-c) : '+ ' + c) +
          ' = ' + round(chk.re, 6) + ' + ' + round(chk.im, 6) + 'i ✔',
        note: 'Use i² = −1 when you expand (p + qi)². Both parts come out 0, so it is a root.'
      });
    } else {
      out.rootValues = [out.re + Math.sqrt(D) / (2 * a), out.re - Math.sqrt(D) / (2 * a)];
      steps.push({ title: 'Approximate', math: v + ' ≈ ' + round(out.rootValues[0], 3) + ' or ' + v + ' ≈ ' + round(out.rootValues[1], 3) });
    }
    return out;
  }

  // a·z² + b·z + c for z = re + im·i.
  function evalComplex(a, b, c, re, im) {
    var zr = re * re - im * im, zi = 2 * re * im;
    var r = a * zr + b * re + c, i = a * zi + b * im;
    return { re: Math.abs(r) < 1e-9 ? 0 : r, im: Math.abs(i) < 1e-9 ? 0 : i };
  }

  // Roots of any real a, b, c (sliders), as points in the complex plane.
  function rootsNumeric(a, b, c) {
    if (!a) return b ? [{ re: -c / b, im: 0 }] : [];
    var D = b * b - 4 * a * c, p = -b / (2 * a);
    if (D >= 0) { var q = Math.sqrt(D) / (2 * Math.abs(a)); return [{ re: p - q, im: 0 }, { re: p + q, im: 0 }]; }
    var w = Math.sqrt(-D) / (2 * Math.abs(a));
    return [{ re: p, im: w }, { re: p, im: -w }];
  }

  function round(x, dp) {
    var m = Math.pow(10, dp), r = Math.round(x * m) / m;
    if (Object.is(r, -0)) r = 0;
    return (r < 0 ? MINUS + (-r) : String(r));
  }

  /* ── Student answers ────────────────────────────────────────── */
  // Reads what students type: 3, −2.5, 7/2, √95/10, 2√3, sqrt(12)/4, (5+√13)/2.
  // A trailing i (an imaginary part typed as "√95/10 i") is ignored. NaN if unreadable.
  function parseNumber(str) {
    var s = String(str == null ? '' : str).trim().toLowerCase()
      .replace(/[−–—]/g, '-').replace(/×/g, '*').replace(/÷/g, '/')
      .replace(/\s+/g, '').replace(/sqrt/g, '√').replace(/^\+/, '');
    s = s.replace(/^\((.*)\)i$/, '$1').replace(/i$/, '').replace(/^i(?=√)/, '');
    if (!s) return NaN;
    var pos = 0;
    function peek() { return s[pos]; }
    function expr() {
      var v = termP();
      while (peek() === '+' || peek() === '-') { var op = s[pos++]; var r = termP(); v = op === '+' ? v + r : v - r; }
      return v;
    }
    function termP() {
      var v = factor();
      for (;;) {
        var ch = peek();
        if (ch === '*' || ch === '/') { pos++; var r = factor(); v = ch === '*' ? v * r : v / r; }
        else if (ch === '√' || ch === '(' || (ch && /[0-9.]/.test(ch) && /[√)]/.test(s[pos - 1]))) v *= factor();
        else return v;
      }
    }
    function factor() {
      var ch = peek();
      if (ch === '-') { pos++; return -factor(); }
      if (ch === '√') { pos++; return Math.sqrt(factor()); }
      if (ch === '(') { pos++; var v = expr(); if (peek() !== ')') throw 0; pos++; return v; }
      var m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(pos));
      if (!m) throw 0;
      pos += m[0].length;
      return parseFloat(m[0]);
    }
    try {
      var v = expr();
      return pos === s.length && isFinite(v) ? v : NaN;
    } catch (e) { return NaN; }
  }
  function matches(typed, value, tol) {
    var v = parseNumber(typed);
    return !isNaN(v) && Math.abs(v - value) <= (tol == null ? 0.011 : tol);
  }

  /* ── Problem generators ─────────────────────────────────────── */
  function pick(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function nonzero(rng, lo, hi) { var v = 0; while (!v) v = pick(rng, lo, hi); return v; }
  var SQUARE_FREE_R2 = [2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 17, 18, 20, 24, 27, 28, 32, 45, 50];

  // level: 'starter' | 'radical' | 'scaled' | 'halves'
  function makeCircleProblem(rng, level) {
    var A = 1, h, k, r2;
    h = nonzero(rng, -6, 6); k = pick(rng, -6, 6);
    if (rng() < 0.5) { var t = h; h = k; k = t; }
    if (h === 0 && k === 0) h = 3;
    if (level === 'radical') r2 = SQUARE_FREE_R2[pick(rng, 0, SQUARE_FREE_R2.length - 1)];
    else { var r = pick(rng, 1, 7); r2 = r * r; }
    if (level === 'scaled') A = pick(rng, 2, 5);
    var hf = fr(h), kf = fr(k);
    if (level === 'halves') {
      // An odd middle coefficient puts the centre on a half: x² + 5x → (x + 5/2)².
      var D2, E2, F2, r2q;
      do {
        D2 = (2 * pick(rng, 0, 4) + 1) * (rng() < 0.5 ? -1 : 1);   // odd: ±1 … ±9
        E2 = pick(rng, -8, 8);
        F2 = pick(rng, -12, 12);
        r2q = (D2 * D2 + E2 * E2) / 4 - F2;
      } while (r2q < 2 || r2q > 30);
      if (rng() < 0.5) { var sw = D2; D2 = E2; E2 = sw; }
      return { A: 1, D: D2, E: E2, F: F2, text: generalText(1, D2, E2, F2), level: level };
    }
    var base = expandCircle(hf, kf, Math.sqrt(r2));
    var F = sub(add(mul(hf, hf), mul(kf, kf)), fr(r2));
    var Af = fr(A);
    var D = mul(Af, base.D), E = mul(Af, base.E), FF = mul(Af, F);
    if (D.d !== 1 || E.d !== 1 || FF.d !== 1) {
      // Clear fractions by scaling (keeps whole-number coefficients on the page).
      var L = lcm(lcm(D.d, E.d), FF.d);
      Af = fr(A * L); D = mul(D, fr(L)); E = mul(E, fr(L)); FF = mul(FF, fr(L));
    }
    return { A: val(Af), D: val(D), E: val(E), F: val(FF), text: generalText(Af, D, E, FF), level: level };
  }
  function lcm(a, b) { return a / gcd(a, b) * b; }

  // level: 'whole' (x² + bx + c, roots p ± qi with whole p, q) | 'radical' | 'leading'
  function makeComplexProblem(rng, level) {
    var a = 1, b, c, v = rng() < 0.3 ? 'y' : 'x';
    if (level === 'whole') {
      var p = pick(rng, -5, 5), q = pick(rng, 1, 5);
      b = -2 * p; c = p * p + q * q;
    } else {
      if (level === 'leading') a = pick(rng, 2, 6) * (rng() < 0.2 ? -1 : 1);
      do {
        b = pick(rng, -9, 9);
        c = pick(rng, 1, 12) * (a < 0 ? -1 : 1);
      } while (b * b - 4 * a * c >= 0 || (level === 'radical' && simplifyRadical(4 * a * c - b * b).inside === 1 && rng() < 0.8));
    }
    return { a: a, b: b, c: c, v: v, text: fmtQuadratic(a, b, c, v), level: level };
  }

  return {
    MINUS: MINUS,
    gcd: gcd, fr: fr, fromNumber: fromNumber, add: add, sub: sub, mul: mul, div: div, val: val,
    fmtFrac: fmtFrac, round: round,
    simplifyRadical: simplifyRadical, sqrtFrac: sqrtFrac,
    generalText: generalText, standardText: standardText, expandCircle: expandCircle, circleFromGeneral: circleFromGeneral,
    fmtQuadratic: fmtQuadratic, quadratic: quadratic, evalComplex: evalComplex, rootsNumeric: rootsNumeric,
    parseNumber: parseNumber, matches: matches,
    makeCircleProblem: makeCircleProblem, makeComplexProblem: makeComplexProblem
  };
}));
