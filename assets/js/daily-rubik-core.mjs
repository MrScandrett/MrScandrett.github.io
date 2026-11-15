// Date-seeded quarter-turn challenges. Cube is the shared lesson's RubiksCube model.
import { rngFor, parseDayKey } from './daily-puzzles-core.mjs';

// Meet in the middle: every route shorter than ten quarter turns splits into
// at most four turns from solved and five from the candidate. This certifies
// the actual minimum, rather than using scramble length as an estimate.
const tables = new WeakMap();
export function minimumAtLeast(facelets, target, Cube) {
  let table = tables.get(Cube);
  if (!table) {
    const moves = Cube.FACES.flatMap((f) => [f, f + "'"]);
    const perms = moves.map((m) => Cube.applyMove(Array.from({ length: 54 }, (_, i) => i), m));
    const apply = (state, perm) => { let out = ''; for (let i = 0; i < 54; i++) out += state[perm[i]]; return out; };
    const distances = new Map();
    function build(state, depth, last) {
      if (distances.has(state) && distances.get(state) <= depth) return;
      distances.set(state, depth);
      if (depth === 4) return;
      perms.forEach((perm, i) => { if (last < 0 || i !== (last ^ 1)) build(apply(state, perm), depth + 1, i); });
    }
    build(Cube.SOLVED.join(''), 0, -1);
    table = { perms, distances, apply }; tables.set(Cube, table);
  }
  const limit = target - 1;
  function shorter(state, depth, last) {
    if ((table.distances.get(state) ?? Infinity) + depth <= limit) return true;
    if (depth >= Math.max(0, limit - 4)) return false;
    return table.perms.some((perm, i) => (last < 0 || i !== (last ^ 1)) && shorter(table.apply(state, perm), depth + 1, i));
  }
  return !shorter(facelets.join(''), 0, -1);
}

export function makeRubik(key, Cube) {
  const date = parseDayKey(key);
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const target = ((day % 10) + 10) % 10 + 1;
  const random = rngFor(`rubik:v1:${key}`);
  let scramble, facelets;
  const axes = { U: 1, D: 1, R: 0, L: 0, F: 2, B: 2 };
  do {
    scramble = [];
    while (scramble.length < target) {
      const face = Cube.FACES[Math.floor(random() * 6)];
      if (scramble.length && axes[face] === axes[scramble.at(-1)[0]]) continue;
      scramble.push(face + (random() < 0.5 ? "'" : ''));
    }
    facelets = Cube.applySeq(Cube.SOLVED, scramble);
  } while (!minimumAtLeast(facelets, target, Cube));
  return { key, id: `rubik-v1:${key}`, target, scramble,
    facelets, solution: Cube.invertSeq(scramble) };
}

// Always works, even after an unlimited number of student turns. This is a
// teaching algorithm with a known route, not a claim of a shortest solution.
export function recoveryPlan(puzzle, moves, Cube) {
  return [
    ...Cube.invertSeq(moves).map((move) => ({ move, phase: 'Undo your turns' })),
    ...puzzle.solution.map((move) => ({ move, phase: 'Reverse the scramble' }))
  ];
}
