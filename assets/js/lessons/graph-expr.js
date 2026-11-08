/* Graph expressions: the maths behind the Graphing Calculator lesson, with no DOM.
 *
 *   GraphExpr.evaluate('y = 2x^2 - 3', 1.5)   → 1.5
 *   GraphExpr.isValid('sin x')                → true
 *   GraphExpr.normalize('2πx')                → '2*(3.14159…)*x'
 *
 * Students type the way they write: implicit multiplication (2x, 3(x+1), x sin(x)),
 * |x| for absolute value, π √ ² ³ × ÷ and typographic minus signs, an optional leading
 * "y =" or "f(x) =", and function names without brackets (sin x, sqrt x, ln x).
 *
 * Precedence follows the maths classroom, not every programming language:
 *   -x^2 = -(x^2)        a leading minus applies after the power
 *   2^-1 = 0.5           a minus may start an exponent
 *   2^3^2 = 2^9          powers group from the right
 *   sin x^2 = sin(x^2)   a bare function takes the power with it (as Desmos does)
 *
 * Anything it can't read evaluates to NaN; nothing throws.
 * Tests: node --test tests/graph-expr.test.mjs
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GraphExpr = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FN_NAMES = ['floor', 'round', 'sqrt', 'ceil', 'sin', 'cos', 'tan', 'abs', 'log', 'ln'];
  var TOKEN_NAMES = FN_NAMES.concat(['pi', 'x', 'e']);

  var FNS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs,
    log: Math.log10, ln: Math.log, floor: Math.floor, ceil: Math.ceil, round: Math.round
  };

  function isNumberToken(token) {
    return /^(?:\d+\.?\d*|\.\d+)$/.test(token);
  }

  // Split into numbers, known names (longest listed first, so "sqrt" beats "x"…),
  // unknown identifiers, and single characters.
  function tokenize(str) {
    var tokens = [];
    var i = 0;
    while (i < str.length) {
      var ch = str[i];
      if (/\d|\./.test(ch)) {
        var num = ch;
        i++;
        while (i < str.length && /[\d.]/.test(str[i])) num += str[i++];
        tokens.push(num);
        continue;
      }
      if (/[a-z]/.test(ch)) {
        var match = null;
        for (var n = 0; n < TOKEN_NAMES.length; n++) {
          if (str.startsWith(TOKEN_NAMES[n], i)) { match = TOKEN_NAMES[n]; break; }
        }
        if (match) {
          tokens.push(match);
          i += match.length;
          continue;
        }
        var ident = ch;
        i++;
        while (i < str.length && /[a-z]/.test(str[i])) ident += str[i++];
        tokens.push(ident);
        continue;
      }
      tokens.push(ch);
      i++;
    }
    return tokens;
  }

  function endsAtom(token) {
    return token === ')' || isNumberToken(token) || token === 'x' || token === 'pi' || token === 'e';
  }

  function startsAtom(token) {
    return token === '(' || isNumberToken(token) || token === 'x' || token === 'pi' || token === 'e' ||
      FN_NAMES.indexOf(token) !== -1;
  }

  // Clean up what a student typed and return the token list the parser reads.
  function prepare(rawExpr) {
    var str = String(rawExpr || '')
      .replace(/[−‒–—]/g, '-')
      .replace(/[×⋅]/g, '*')
      .replace(/÷/g, '/')
      .replace(/π/g, 'pi')
      .replace(/√/g, 'sqrt')
      .replace(/²/g, '^2')
      .replace(/³/g, '^3')
      .trim();

    str = str.replace(/^\s*(?:y|f\(x\))\s*=\s*/i, '').replace(/\s+/g, '').toLowerCase();

    var prev;
    do {
      prev = str;
      str = str.replace(/\|([^|]+)\|/g, 'abs($1)');
    } while (str !== prev);

    var out = [];
    tokenize(str).forEach(function (token) {
      var before = out[out.length - 1];
      if (before && endsAtom(before) && startsAtom(token)) out.push('*');
      out.push(token);
    });
    return out;
  }

  // Readable normalised form (what the parser sees), e.g. for showing a student "2*x".
  function normalize(rawExpr) {
    return prepare(rawExpr).map(function (t) {
      if (t === 'pi') return '(' + Math.PI + ')';
      if (t === 'e') return '(' + Math.E + ')';
      return t;
    }).join('');
  }

  /* Recursive descent over tokens:
       sum     := product (('+' | '-') product)*
       product := unary (('*' | '/') unary)*
       unary   := ('-' | '+') unary | power
       power   := primary ('^' unary)?          right-associative through unary
       primary := number | x | pi | e | '(' sum ')' | fn '(' sum ')' | fn power
  */
  function evaluate(rawExpr, xVal) {
    var tokens = prepare(rawExpr);
    var pos = 0;

    function peek() { return tokens[pos]; }
    function next() { return tokens[pos++]; }

    function sum() {
      var left = product();
      while (peek() === '+' || peek() === '-') {
        var op = next();
        var right = product();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    }

    function product() {
      var left = unary();
      while (peek() === '*' || peek() === '/') {
        var op = next();
        var right = unary();
        left = op === '*' ? left * right : left / right;
      }
      return left;
    }

    function unary() {
      if (peek() === '-') { next(); return -unary(); }
      if (peek() === '+') { next(); return unary(); }
      return power();
    }

    function power() {
      var base = primary();
      if (peek() === '^') {
        next();
        return Math.pow(base, unary());
      }
      return base;
    }

    function primary() {
      var token = next();
      if (token === undefined) return NaN;
      if (isNumberToken(token)) return parseFloat(token);
      if (token === 'x') return xVal;
      if (token === 'pi') return Math.PI;
      if (token === 'e') return Math.E;
      if (token === '(') {
        var inner = sum();
        if (peek() === ')') next();   // a missing ")" at the end is forgiven
        return inner;
      }
      if (Object.prototype.hasOwnProperty.call(FNS, token)) {
        if (peek() === '(') {
          next();
          var arg = sum();
          if (peek() === ')') next();
          return FNS[token](arg);
        }
        return FNS[token](power());   // sin x, sqrt x, sin x^2 = sin(x^2)
      }
      return NaN;                     // unknown name or stray symbol
    }

    try {
      var result = sum();
      while (peek() === ')') next();               // extra closing brackets are forgiven
      if (pos < tokens.length) return NaN;         // anything else left over is not maths we read
      return isFinite(result) ? result : NaN;
    } catch (e) {
      return NaN;
    }
  }

  // A function is usable if it gives a number somewhere on a few sample x values
  // (sqrt(x) and ln(x) are undefined on the left, which is fine).
  function isValid(expr) {
    if (!String(expr || '').trim()) return false;
    return [-3, -1, 0, 1, 3, 5].some(function (x) { return !isNaN(evaluate(expr, x)); });
  }

  return { evaluate: evaluate, isValid: isValid, normalize: normalize, tokenize: tokenize, FN_NAMES: FN_NAMES.slice() };
}));
