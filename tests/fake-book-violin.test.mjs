import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const V = createRequire(import.meta.url)('../assets/js/lessons/fake-book-violin.js');

test('C major triad in first position: every dot is a C, E or G', () => {
  const map = V.toneMap([0, 4, 7]);
  const spots = V.spots(0, map);
  assert.ok(spots.length >= 6);
  spots.forEach((s) => assert.ok([0, 4, 7].includes(((s.midi % 12) + 12) % 12 === 0 ? 0 : ((s.midi % 12) + 12) % 12), `midi ${s.midi}`));
  assert.ok(spots.every((s) => s.off >= 0 && s.off <= V.SPAN));
  assert.ok(spots.filter((s) => s.root).every((s) => s.midi % 12 === 0));
});

test('fingers match first position, with low and high placements', () => {
  const find = (mid) => V.spots(mid % 12, V.toneMap([0])).filter((s) => s.midi === mid).sort((a, b) => a.off - b.off)[0];
  assert.deepEqual([find(62).finger, find(62).place], [0, '']);        // open D
  assert.deepEqual([find(63).finger, find(63).place], [1, 'low']);     // low 1 on D string
  assert.deepEqual([find(68).finger, find(68).place], [3, 'high']);    // high 3
  assert.equal(find(69).finger, 0);                                    // open A
});

test('climb starts on the lowest root and keeps chord order', () => {
  assert.deepEqual(V.climb(2, [0, 4, 7]), [62, 66, 69]);               // D F# A from the open D
  assert.deepEqual(V.climb(7, [0, 2, 4], true), [55, 57, 59, 67]);
});

test('draw and mini produce one dot per spot', () => {
  const map = V.toneMap([0, 4, 7, 10]);
  const n = V.spots(7, map).length;
  assert.equal((V.draw(7, map).match(/class="fb-vv-spot/g) || []).length, n);
  assert.equal((V.mini(7, map).match(/fb-vv-mdot/g) || []).length, n);
});
