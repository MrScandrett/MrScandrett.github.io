// Small arithmetic language: numbers, named parameters, + - * / % ( ), pi, and degree math functions.
export const SHAPE_TYPES = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'prism', 'tube'];
export const SHAPE_FIELDS = ['x', 'y', 'z', 'w', 'd', 'h', 'tilt', 'orbit', 'lean', 'hue'];

export const STARTERS = {
  helix: {
    name: 'Twisting ladder',
    count: 24,
    twist: 18,
    rise: 3,
    radius: 16,
    size: 3,
    code: '# Each repeat adds a rung and two beads.\nbox 0 0 i*rise radius*2 size size 0 i*twist 0 i*12\nsphere radius 0 i*rise size size size 0 i*twist 0 i*12\nsphere -radius 0 i*rise size size size 0 i*twist 0 i*12+180'
  },
  bloom: {
    name: 'Mechanical bloom',
    count: 18,
    twist: 137.5,
    rise: 0.5,
    radius: 14,
    size: 4,
    code: '# Rotate a petal, then place it around the center.\nbox radius 0 i*rise+size size*5 size size 0 i*twist 25 i*12'
  },
  tower: {
    name: 'Turning tower',
    count: 20,
    twist: 12,
    rise: 3,
    radius: 12,
    size: 3,
    code: '# Thin floors become a twisting architectural model.\nbox 0 0 i*rise radius*2 radius*2 size 0 i*twist 0 i*10'
  },
  wave: {
    name: 'Sine pavilion',
    count: 24,
    twist: 20,
    rise: 0,
    radius: 14,
    size: 3.5,
    code: '# sin() curves the height across each repeat.\nlet h abs(sin(i*twist))*radius+size\nprism i*size-count*size/2 0 h/2 size size h 0 0 0 i*10+170'
  },
  crown: {
    name: 'Ring crown',
    count: 12,
    twist: 30,
    rise: 1.5,
    radius: 18,
    size: 6,
    code: '# Orbiting hollow tubes topped with cones.\ntube radius 0 size/2 size*1.8 size*1.8 size 90 i*twist 0 i*24\ncone radius 0 size*1.6 size*0.8 size*0.8 size*1.2 0 i*twist 0 i*24+180'
  },
  blank: {
    name: 'Your idea',
    count: 1,
    twist: 0,
    rise: 4,
    radius: 12,
    size: 4,
    code: '# Start with a shape. Add lines to build your idea.\nbox 0 0 size/2 size size size 0 0 0 190'
  }
};

const FN1 = {
  sin: (x) => Math.sin((x * Math.PI) / 180),
  cos: (x) => Math.cos((x * Math.PI) / 180),
  abs: (x) => Math.abs(x),
  sqrt: (x) => Math.sqrt(x),
  round: (x) => Math.round(x)
};

const FN2 = {
  min: (a, b) => Math.min(a, b),
  max: (a, b) => Math.max(a, b)
};

export function expression(source, vars) {
  const tokens = source.match(/[A-Za-z]+|(?:\d*\.)?\d+|[()+*/%,-]/g) || [];
  if (tokens.join('') !== source) throw Error('Use numbers, parameters, + - * / % ( ), or math functions.');
  let at = 0;
  function atom() {
    const t = tokens[at++];
    if (t === '-') return -atom();
    if (t === '+') return atom();
    if (t === '(') {
      const v = sum();
      if (tokens[at++] !== ')') throw Error('Missing closing parenthesis.');
      return v;
    }
    if (t && /^[A-Za-z]+$/.test(t) && tokens[at] === '(') {
      at++;
      const a = sum();
      if (Object.hasOwn(FN1, t)) {
        if (tokens[at] === ',') throw Error(`${t}() takes 1 value.`);
        if (tokens[at++] !== ')') throw Error('Missing closing parenthesis.');
        return FN1[t](a);
      }
      if (Object.hasOwn(FN2, t)) {
        if (tokens[at++] !== ',') throw Error(`${t}() needs two comma-separated values.`);
        const b = sum();
        if (tokens[at++] !== ')') throw Error('Missing closing parenthesis.');
        return FN2[t](a, b);
      }
      throw Error(`Unknown function: ${t}().`);
    }
    if (Object.hasOwn(vars, t)) return vars[t];
    if (t === 'pi') return Math.PI;
    if (t && /^(?:\d*\.)?\d+$/.test(t)) return Number(t);
    throw Error('Unknown value: ' + (t || 'empty expression'));
  }
  function product() {
    let v = atom();
    while (tokens[at] === '*' || tokens[at] === '/' || tokens[at] === '%') {
      const op = tokens[at++];
      const n = atom();
      v = op === '*' ? v * n : op === '/' ? v / n : v % n;
    }
    return v;
  }
  function sum() {
    let v = product();
    while (tokens[at] === '+' || tokens[at] === '-') {
      const op = tokens[at++];
      const n = product();
      v = op === '+' ? v + n : v - n;
    }
    return v;
  }
  const value = sum();
  if (at !== tokens.length || !Number.isFinite(value)) throw Error('Expression must produce a finite number.');
  return value;
}

export function compile(code, p) {
  const lines = code
    .split('\n')
    .map((text, i) => ({ text: text.split('#')[0].trim(), line: i + 1 }))
    .filter((l) => l.text);
  if (!lines.length) return [];
  if (lines.length * p.count > 600) throw Error('Keep the design under 600 shapes.');
  const result = [];
  for (let i = 0; i < p.count; i++) {
    const vars = { ...p, i };
    const state = { move: [0, 0, 0], rotate: [0, 0, 0], scale: [1, 1, 1], color: null };
    for (const line of lines) {
      try {
        const [shape, ...args] = line.text.split(/\s+/);
        if (['let', 'change'].includes(shape)) {
          if (args.length !== 2 || !/^[a-zA-Z]+$/.test(args[0]) || Object.hasOwn(p, args[0]) || args[0] === 'i' || args[0] === 'pi') {
            throw Error('Use a new variable name and one expression, for example: let angle i*twist');
          }
          if (shape === 'change' && !Object.hasOwn(vars, args[0])) throw Error('Create ' + args[0] + ' with let first.');
          vars[args[0]] = (shape === 'change' ? vars[args[0]] : 0) + expression(args[1], vars);
          continue;
        }
        if (['move', 'rotate', 'scale', 'color'].includes(shape)) {
          if (args.length !== (shape === 'color' ? 1 : 3)) throw Error(shape + ' needs ' + (shape === 'color' ? 1 : 3) + ' values.');
          const v = args.map((a) => expression(a, vars));
          if (shape === 'move' && v.some((n) => Math.abs(n) > 500)) throw Error('Move values must stay within ±500 mm.');
          if (shape === 'scale' && v.some((n) => n <= 0 || n > 10)) throw Error('Scale factors must be above 0 and at most 10.');
          state[shape] = shape === 'color' ? v[0] : v;
          continue;
        }
        if (!SHAPE_TYPES.includes(shape)) {
          throw Error('Choose box, sphere, cylinder, cone, torus, prism or tube.');
        }
        if (args.length !== 10) throw Error('A shape needs 10 values: x y z width depth height tilt orbit lean hue.');
        const values = args.map((a) => expression(a, vars));
        if (values.slice(3, 6).some((n) => n <= 0 || n > 200)) throw Error('Shape dimensions must be above 0 and at most 200 mm.');
        if (values.slice(0, 3).some((n) => Math.abs(n) > 500)) throw Error('Keep positions within 500 mm of the origin.');
        result.push({ shape, values, iteration: i, line: line.line, transform: structuredClone(state) });
      } catch (e) {
        throw Error('Line ' + line.line + ': ' + e.message);
      }
    }
  }
  return result;
}

export function parseBlocks(code) {
  const blocks = [];
  const rawLines = String(code ?? '').split('\n');
  rawLines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();
    if (!trimmed) return;
    const hash = rawLine.indexOf('#');
    const codePart = (hash === -1 ? trimmed : rawLine.slice(0, hash)).trim();
    const comment = hash === -1 ? '' : rawLine.slice(hash + 1).trim();
    const line = idx + 1;
    if (!codePart) {
      blocks.push({ kind: 'comment', op: '#', args: [], comment, raw: rawLine, line });
      return;
    }
    const [op, ...args] = codePart.split(/\s+/);
    if (SHAPE_TYPES.includes(op) && args.length === 10) {
      blocks.push({ kind: 'shape', op, args, comment, raw: rawLine, line });
    } else if (((op === 'move' || op === 'rotate' || op === 'scale') && args.length === 3) || (op === 'color' && args.length === 1)) {
      blocks.push({ kind: 'modify', op, args, comment, raw: rawLine, line });
    } else if ((op === 'let' || op === 'change') && args.length === 2) {
      blocks.push({ kind: 'data', op, args, comment, raw: rawLine, line });
    } else {
      blocks.push({ kind: 'raw', op: op || '', args, comment, raw: rawLine, line });
    }
  });
  return blocks;
}

export function serializeBlocks(blocks) {
  return blocks
    .map((b) => {
      if (b.kind === 'comment') return b.comment ? `# ${b.comment}` : '#';
      if (b.kind === 'raw') return b.raw;
      const head = [b.op, ...b.args].join(' ');
      return b.comment ? `${head} # ${b.comment}` : head;
    })
    .join('\n');
}
