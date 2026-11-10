import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// numbers-core.js is a classic browser script of plain top-level functions (the Numbers lesson's
// inline handlers call them as globals), so they land on the sandbox's global object.
const N = {};
vm.runInNewContext(fs.readFileSync('assets/js/lessons/numbers-core.js', 'utf8'), N);
const plain = (value) => JSON.parse(JSON.stringify(value));

test('gcd: Euclid, including zero and coprime pairs', () => {
  assert.equal(N.gcd(12, 18), 6);
  assert.equal(N.gcd(18, 12), 6);
  assert.equal(N.gcd(17, 5), 1);
  assert.equal(N.gcd(9, 0), 9);
  assert.equal(N.gcd(1071, 462), 21); // Euclid's own worked example
});

test('isPrime agrees with the primes below 100 and rejects 0, 1, negatives and squares', () => {
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
  const found = [];
  for (let n = -3; n < 100; n++) if (N.isPrime(n)) found.push(n);
  assert.deepEqual(found, primes);
  assert.equal(N.isPrime(7919), true);       // the 1000th prime
  assert.equal(N.isPrime(7921), false);      // 89²
  assert.equal(N.isPrime(561), false);       // Carmichael number: fools Fermat's test, not trial division
});

test('getFactors lists every divisor once, in order', () => {
  assert.deepEqual(plain(N.getFactors(1)), [1]);
  assert.deepEqual(plain(N.getFactors(36)), [1, 2, 3, 4, 6, 9, 12, 18, 36]); // perfect square: 6 only once
  assert.deepEqual(plain(N.getFactors(97)), [1, 97]);
  assert.deepEqual(plain(N.getFactors(28)), [1, 2, 4, 7, 14, 28]);
  // 28 is perfect: its proper divisors add up to itself
  assert.equal(N.getFactors(28).slice(0, -1).reduce((a, b) => a + b, 0), 28);
});

test('primeFactors multiply back to n and are all prime (fundamental theorem of arithmetic)', () => {
  assert.deepEqual(plain(N.primeFactors(360)), [2, 2, 2, 3, 3, 5]);
  assert.deepEqual(plain(N.primeFactors(97)), [97]);
  assert.deepEqual(plain(N.primeFactors(1)), []);
  for (let n = 2; n <= 500; n++) {
    const factors = N.primeFactors(n);
    assert.equal(factors.reduce((a, b) => a * b, 1), n, `product for ${n}`);
    assert.ok(factors.every((f) => N.isPrime(f)), `all prime for ${n}`);
  }
});

test('generateSequence skip-counts from a start', () => {
  assert.deepEqual(plain(N.generateSequence()), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(plain(N.generateSequence(5, 0, 5)), [0, 5, 10, 15, 20]);
  assert.deepEqual(plain(N.generateSequence(-3, 9, 4)), [9, 6, 3, 0]);
});

test('generateFraction carries its value and never divides by zero', () => {
  assert.deepEqual(plain(N.generateFraction(3, 4)), { numerator: 3, denominator: 4, value: 0.75 });
  assert.equal(N.generateFraction(5, 0).value, 0);
});

test('getDecimalData splits a decimal into tenths and hundredths', () => {
  assert.deepEqual(plain(N.getDecimalData(0.37)), { value: 0.37, hundredths: 37, tenths: 3, fraction: { numerator: 37, denominator: 100 } });
  // 0.29 * 100 is 28.999999999999996 in binary floating point; rounding has to rescue it
  assert.equal(N.getDecimalData(0.29).hundredths, 29);
  assert.equal(N.getDecimalData(1).hundredths, 100);
});

test('getRatioData reduces a ratio to lowest terms', () => {
  assert.deepEqual(plain(N.getRatioData(6, 4)), { a: 6, b: 4, simplifiedA: 3, simplifiedB: 2 });
  assert.deepEqual(plain(N.getRatioData(7, 3)), { a: 7, b: 3, simplifiedA: 7, simplifiedB: 3 });
  for (let a = 1; a <= 20; a++) for (let b = 1; b <= 20; b++) {
    const r = N.getRatioData(a, b);
    assert.equal(N.gcd(r.simplifiedA, r.simplifiedB), 1);
    assert.equal(r.simplifiedA * b, r.simplifiedB * a); // same ratio
  }
});

test('integerNumberWord spells whole numbers up to 999', () => {
  assert.equal(N.integerNumberWord(0), 'zero');
  assert.equal(N.integerNumberWord(13), 'thirteen');
  assert.equal(N.integerNumberWord(40), 'forty');
  assert.equal(N.integerNumberWord(99), 'ninety-nine');
  assert.equal(N.integerNumberWord(100), 'one hundred');
  assert.equal(N.integerNumberWord(215), 'two hundred fifteen');
  assert.equal(N.integerNumberWord(-7), 'negative seven');
  assert.equal(N.integerNumberWord(1000), '1000');
});

test('fractionName reads fractions the way a teacher says them', () => {
  assert.equal(N.fractionName(1, 2), 'one half');
  assert.equal(N.fractionName(3, 4), 'three fourths');
  assert.equal(N.fractionName(0, 3), 'zero thirds');
  assert.equal(N.fractionName(5, 5), 'one whole');
  assert.equal(N.fractionName(7, 4), '1 and three fourths');
  assert.equal(N.fractionName(8, 4), '2 wholes');
  assert.equal(N.fractionName(2, 11), 'two parts');
});

test('decimalWordLabel names tenths when it can, hundredths otherwise', () => {
  assert.equal(N.decimalWordLabel(N.getDecimalData(0)), 'zero hundredths');
  assert.equal(N.decimalWordLabel(N.getDecimalData(0.1)), 'one tenth');
  assert.equal(N.decimalWordLabel(N.getDecimalData(0.7)), 'seven tenths');
  assert.equal(N.decimalWordLabel(N.getDecimalData(0.37)), 'thirty-seven hundredths');
});

test('difficulty levels step up with the numbers', () => {
  assert.equal(N.integerStepLevel(5), 'Level 1');
  assert.equal(N.integerStepLevel(25), 'Level 2');
  assert.equal(N.integerStepLevel(7), 'Level 3');
  assert.equal(N.fractionLevel(4, 1), 'Level 1');
  assert.equal(N.fractionLevel(5, 3), 'Level 2');
  assert.equal(N.fractionLevel(8, 3), 'Level 3');
  assert.equal(N.ratioLevel(5, 5), 'Level 1');
  assert.equal(N.ratioLevel(12, 6), 'Level 2');
  assert.equal(N.ratioLevel(13, 2), 'Level 3');
});

test('describeModFamily names the times-table curve: ×2 cardioid, ×3 nephroid', () => {
  assert.match(N.describeModFamily(2), /Cardioid/);
  assert.match(N.describeModFamily(2.1), /Cardioid/);
  assert.match(N.describeModFamily(3), /Nephroid/);
  assert.match(N.describeModFamily(1.5), /Star lattice/);
  assert.match(N.describeModFamily(3.5), /Petal/);
  assert.match(N.describeModFamily(5), /Orbital/);
  assert.match(N.describeModFamily(9), /Resonant/);
});
