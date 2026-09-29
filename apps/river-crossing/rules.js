// Rules for the wolf, goat, and cabbage river crossing (Alcuin of York, about 800 AD),
// free of page code. A state records which bank each traveler is on: 0 = left, 1 = right.

export const TRAVELERS = ["farmer", "wolf", "goat", "cabbage"];

export function startState() {
  return { farmer: 0, wolf: 0, goat: 0, cabbage: 0 };
}

export function isGoal(s) {
  return TRAVELERS.every((t) => s[t] === 1);
}

// what goes wrong when the farmer is away, or null if the state is safe
export function danger(s) {
  if (s.wolf === s.goat && s.farmer !== s.goat) return "The wolf ate the goat!";
  if (s.goat === s.cabbage && s.farmer !== s.goat) return "The goat ate the cabbage!";
  return null;
}

// the farmer rows across alone or with one passenger from his own bank
export function crossings(s) {
  const options = [null, "wolf", "goat", "cabbage"].filter((p) => p === null || s[p] === s.farmer);
  return options.map((passenger) => {
    const next = { ...s, farmer: 1 - s.farmer };
    if (passenger) next[passenger] = 1 - s[passenger];
    return { passenger, next };
  });
}

export function key(s) {
  return TRAVELERS.map((t) => s[t]).join("");
}

// breadth-first search: explore all states one crossing away, then two, and so on.
// Returns every shortest solution (lists of passengers; null = farmer alone)
// and how many safe states exist.
export function solveAll() {
  const start = startState();
  const dist = new Map([[key(start), 0]]);
  const parents = new Map([[key(start), []]]);
  const byKey = new Map([[key(start), start]]);
  const queue = [start];
  while (queue.length) {
    const s = queue.shift();
    for (const { passenger, next } of crossings(s)) {
      if (danger(next)) continue;
      const k = key(next);
      const d = dist.get(key(s)) + 1;
      if (!dist.has(k)) {
        dist.set(k, d);
        parents.set(k, []);
        byKey.set(k, next);
        queue.push(next);
      }
      if (dist.get(k) === d) parents.get(k).push({ from: key(s), passenger });
    }
  }
  const goalKey = "1111";
  const paths = [];
  (function back(k, suffix) {
    if (k === key(start)) {
      paths.push(suffix);
      return;
    }
    for (const { from, passenger } of parents.get(k)) back(from, [passenger, ...suffix]);
  })(goalKey, []);
  return { shortest: dist.get(goalKey), solutions: paths, safeStates: dist.size };
}
