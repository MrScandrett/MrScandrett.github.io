/* Numbers lesson: the arithmetic behind the labs (lessons/mathematics/foundations/numbers.html).
 * Plain top-level functions with no DOM in them, moved unchanged out of the page's inline <script>;
 * numbers.js and the page's inline handlers call them as globals, so this file loads first.
 * Tested in tests/numbers-core.test.mjs. */
    function generateSequence(step = 1, start = 0, length = 11) {
      return Array.from({ length }, (_, i) => start + i * step);
    }

    function generateFraction(numerator, denominator) {
      return { numerator, denominator, value: denominator ? numerator / denominator : 0 };
    }

    function getDecimalData(value) {
      const hundredths = Math.round(value * 100);
      const tenths = Math.floor(value * 10);
      return {
        value,
        hundredths,
        tenths,
        fraction: {
          numerator: hundredths,
          denominator: 100
        }
      };
    }

    function getRatioData(a, b) {
      const g = gcd(a, b);
      return {
        a,
        b,
        simplifiedA: a / g,
        simplifiedB: b / g
      };
    }

    function integerStepLevel(step) {
      if ([1, 2, 5, 10].includes(step)) return 'Level 1';
      if ([3, 4, 20, 25].includes(step)) return 'Level 2';
      return 'Level 3';
    }

    function integerNumberWord(n) {
      if (n < 0) return `negative ${integerNumberWord(-n)}`;
      const ones = ['zero','one','two','three','four','five','six','seven','eight','nine'];
      const teens = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
      const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) {
        const ten = Math.floor(n / 10);
        const one = n % 10;
        return one ? `${tens[ten]}-${ones[one]}` : tens[ten];
      }
      if (n < 1000) {
        const hundred = Math.floor(n / 100);
        const rem = n % 100;
        return rem ? `${ones[hundred]} hundred ${integerNumberWord(rem)}` : `${ones[hundred]} hundred`;
      }
      return String(n);
    }

    function gcd(a, b) {
      return b === 0 ? a : gcd(b, a % b);
    }

    function fractionLevel(denominator, numerator) {
      if ([2, 3, 4].includes(denominator) && numerator <= 1) return 'Level 1';
      if (denominator <= 5 && numerator <= denominator) return 'Level 2';
      return 'Level 3';
    }

    function fractionName(numerator, denominator) {
      const singular = { 2: 'half', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth' };
      const plural = { 2: 'halves', 3: 'thirds', 4: 'fourths', 5: 'fifths', 6: 'sixths', 7: 'sevenths', 8: 'eighths', 9: 'ninths', 10: 'tenths' };
      if (numerator === 0) return `zero ${plural[denominator] || 'parts'}`;
      if (numerator === denominator) return 'one whole';
      if (numerator > denominator) {
        const wholes = Math.floor(numerator / denominator);
        const rem = numerator % denominator;
        return rem ? `${wholes} and ${fractionName(rem, denominator)}` : `${wholes} wholes`;
      }
      if (numerator === 1) return `one ${singular[denominator] || 'part'}`;
      return `${integerNumberWord(numerator)} ${plural[denominator] || 'parts'}`;
    }

    function decimalWordLabel(data) {
      if (data.hundredths === 0) return 'zero hundredths';
      if (data.hundredths % 10 === 0) {
        const tenths = Math.round(data.value * 10);
        return `${integerNumberWord(tenths)} tenth${tenths === 1 ? '' : 's'}`;
      }
      return `${integerNumberWord(data.hundredths)} hundredths`;
    }

    function ratioLevel(a, b) {
      if (a <= 5 && b <= 5) return 'Level 1';
      if (a <= 12 && b <= 12) return 'Level 2';
      return 'Level 3';
    }

    function isPrime(n) {
      if (n < 2) return false;
      if (n === 2) return true;
      if (n % 2 === 0) return false;
      for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
      return true;
    }

    function getFactors(n) {
      const f = [];
      for (let i = 1; i * i <= n; i++) {
        if (n % i === 0) {
          f.push(i);
          if (i !== n / i) f.push(n / i);
        }
      }
      return f.sort((a, b) => a - b);
    }

    function primeFactors(n) {
      const r = []; let d = 2;
      while (d * d <= n) { while (n % d === 0) { r.push(d); n /= d; } d++; }
      if (n > 1) r.push(n);
      return r;
    }

    function describeModFamily(multiplier) {
      if (Math.abs(multiplier - 2) < 0.16) return 'Family: Cardioid threshold';
      if (Math.abs(multiplier - 3) < 0.16) return 'Family: Nephroid threshold';
      if (multiplier < 2) return 'Family: Star lattice';
      if (multiplier < 4) return 'Family: Petal curve';
      if (multiplier < 7) return 'Family: Orbital web';
      return 'Family: Resonant mesh';
    }
