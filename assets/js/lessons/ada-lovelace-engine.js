/**
 * Pure Ada Lovelace Analytical Engine, Note G Bernoulli VM, Punch-Card VM,
 * Poetical Science Loom encoder, trace checker, and challenge evaluator.
 * Zero DOM dependencies.
 */

/* ── Exact Rational Arithmetic (BigInt-backed Fraction) ───────────────────── */

function bigAbs(n) {
  return n < 0n ? -n : n;
}

function bigGcd(a, b) {
  let x = bigAbs(a);
  let y = bigAbs(b);
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
}

/** Create an exact reduced Fraction { num: BigInt, den: BigInt }. */
export function frac(num, den = 1) {
  let n = typeof num === 'bigint' ? num : BigInt(Math.trunc(Number(num)));
  let d = typeof den === 'bigint' ? den : BigInt(Math.trunc(Number(den)));
  if (d === 0n) throw new RangeError('Division by zero');
  if (n === 0n) return { num: 0n, den: 1n };
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = bigGcd(n, d);
  return { num: n / g, den: d / g };
}

export function fAdd(a, b) {
  return frac(a.num * b.den + b.num * a.den, a.den * b.den);
}

export function fSub(a, b) {
  return frac(a.num * b.den - b.num * a.den, a.den * b.den);
}

export function fMul(a, b) {
  return frac(a.num * b.num, a.den * b.den);
}

export function fDiv(a, b) {
  if (b.num === 0n) throw new RangeError('Division by zero');
  return frac(a.num * b.den, a.den * b.num);
}

export function fNeg(a) {
  return frac(-a.num, a.den);
}

export function fEq(a, b) {
  return a.num === b.num && a.den === b.den;
}

export function fToNumber(a) {
  return Number(a.num) / Number(a.den);
}

export function formatFraction(a) {
  if (!a) return '—';
  const sign = a.num < 0n ? '−' : '';
  const absN = bigAbs(a.num);
  if (a.den === 1n) return `${sign}${absN}`;
  return `${sign}${absN}/${a.den}`;
}

export function formatDecimal(a, digits = 4) {
  if (!a) return '—';
  if (a.den === 1n) return formatFraction(a);
  const val = fToNumber(a);
  const rounded = Number(val.toFixed(digits));
  const absStr = Math.abs(rounded).toString();
  return rounded < 0 ? `−${absStr}` : absStr;
}

/* ── Modern Exact Bernoulli Recurrence ────────────────────────────────────── */

function bigComb(n, k) {
  if (k < 0 || k > n) return 0n;
  let kk = k > n - k ? n - k : k;
  let num = 1n;
  let den = 1n;
  for (let i = 1n; i <= BigInt(kk); i++) {
    num *= BigInt(n) - i + 1n;
    den *= i;
  }
  return num / den;
}

/**
 * Compute modern Bernoulli numbers through `limit` using exact Fractions.
 * Note: Ada's 1843 Note G indexed nonzero even terms as B1, B3, B5, B7
 * (corresponding to modern B2, B4, B6, B8).
 */
export function computeBernoulliModern(limit = 8) {
  const B = { 0: frac(1), 1: frac(-1, 2) };
  for (let m = 1; m <= Math.floor(limit / 2); m++) {
    const j = 2 * m;
    let acc = frac(0);
    for (let k = 0; k < m; k++) {
      const coeff = frac(bigComb(j + 1, 2 * k), 1n);
      acc = fAdd(acc, fMul(coeff, B[2 * k]));
    }
    acc = fAdd(acc, fMul(frac(j + 1, 1), B[1]));
    B[j] = fDiv(fNeg(acc), frac(j + 1, 1));
  }
  for (let i = 3; i <= limit; i += 2) {
    B[i] = frac(0);
  }
  return B;
}

export function adaIndexToModern(adaOddIndex) {
  return adaOddIndex + 1;
}

/* ── Note G Presets & Analytical Engine Trace VM ──────────────────────────── */

export const PRESET_ORDER = [
  'note-g-n1',
  'warmup',
  'note-g-n2',
  'note-g-n4',
  'note-g-sequence',
];

export const NOTE_G_PRESETS = {
  'note-g-n1': {
    id: 'note-g-n1',
    title: "Ada's Note G · n = 1 (First Bernoulli B₁ = 1/6)",
    shortTitle: 'Note G · n=1 (B₁)',
    badge: '1843 Note G',
    supportsBug: true,
    startN: 1,
    endN: 1,
    preloadResults: [],
    description:
      'Runs Operations 1–7, tests conditional branch V10 = 0 (skipping Ops 8–23), writes B₁ = 1/6 into V21, and advances n.',
  },
  warmup: {
    id: 'warmup',
    title: 'Warm-Up: Ticket Bill (Whole Numbers)',
    shortTitle: 'Warm-Up · Whole Numbers',
    badge: 'Starter',
    supportsBug: false,
    description:
      'A gentle whole-number trace showing read → Mill → store and how overwriting V4 reuses memory.',
  },
  'note-g-n2': {
    id: 'note-g-n2',
    title: "Ada's Note G · n = 2 (Second Bernoulli B₃ = −1/30)",
    shortTitle: 'Note G · n=2 (B₃)',
    badge: '1843 Note G',
    supportsBug: true,
    startN: 2,
    endN: 2,
    preloadResults: [{ reg: 'V21', label: 'B1', val: frac(1, 6) }],
    description:
      'Runs Ops 1–12 with B₁ preloaded, branches past the inner loop at V10 = 0, and outputs B₃ = −1/30.',
  },
  'note-g-n4': {
    id: 'note-g-n4',
    title: "Ada's 1843 Table · n = 4 (Full 25 Ops + Inner Loop → B₇ = −1/30)",
    shortTitle: 'Note G · n=4 (Full 25 Ops)',
    badge: '1843 Table',
    supportsBug: true,
    startN: 4,
    endN: 4,
    preloadResults: [
      { reg: 'V21', label: 'B1', val: frac(1, 6) },
      { reg: 'V22', label: 'B3', val: frac(-1, 30) },
      { reg: 'V23', label: 'B5', val: frac(1, 42) },
    ],
    description:
      'Matches the published 1843 table at n = 4: executes the inner loop (Ops 13–23) twice to compute B₇ = −1/30.',
  },
  'note-g-sequence': {
    id: 'note-g-sequence',
    title: 'Outer Loop · Compute B₁, B₃, B₅, B₇ from Scratch',
    shortTitle: 'Outer Loop · B₁ through B₇',
    badge: 'Nested Loops',
    supportsBug: true,
    startN: 1,
    endN: 4,
    preloadResults: [],
    description:
      'Starts with empty result columns and runs Op 25’s outer loop for n = 1, 2, 3, and 4 to build all four Bernoulli numbers.',
  },
};

const NOTE_G_ROLES = {
  V1: 'Constant 1',
  V2: 'Constant 2',
  V3: 'Counter n',
  V4: 'Work (2n−1)',
  V5: 'Work (2n+1)',
  V6: 'Num factor',
  V7: 'Den factor',
  V8: 'Ratio 1',
  V9: 'Ratio 2',
  V10: 'Loop rem.',
  V11: 'Term A_k',
  V12: 'Product B·A',
  V13: 'Sum acc.',
  V21: 'Result B₁',
  V22: 'Result B₃',
  V23: 'Result B₅',
  V24: 'Result B₇',
};

const NOTE_G_COLS = [
  'V1', 'V2', 'V3',
  'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13',
  'V21', 'V22', 'V23', 'V24',
];

const WARMUP_COLS = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7'];

const WARMUP_ROLES = {
  V1: 'Ticket price',
  V2: 'Ticket count',
  V3: 'Service fee',
  V4: 'Scratchpad',
  V5: 'Total bill',
  V6: 'Half share',
  V7: 'Bonus sum',
};

const WARMUP_PYTHON = [
  'v1, v2, v3 = 10, 4, 6        # Load inputs into Store',
  'v4 = v1 * v2                 # Ticket subtotal -> 40',
  'v5 = v4 + v3                 # Add fee -> 46',
  'v6 = v5 // 2                 # Split two ways -> 23',
  'v4 = v2 * v3                 # Overwrite V4 (40 -> 24)',
  'v7 = v4 + v6                 # Combine reused V4 + V6 -> 47',
];

function getNoteGPythonLines(injectBug) {
  const op4Line = injectBug
    ? '    v11 = Fraction(v5, v4)          # Op 4 BUG! Inverted V5 / V4'
    : '    v11 = Fraction(v4, v5)          # Op 4: (2n - 1) / (2n + 1)';
  return [
    'v1, v2, v3 = 1, 2, start_n          # Data cards: 1, 2, n',
    'while v3 <= end_n:',
    '    v4 = v5 = v6 = v2 * v3          # Op 1: 2n across V4, V5, V6',
    '    v4 -= v1; v5 += v1              # Ops 2–3: 2n - 1 and 2n + 1',
    op4Line,
    '    v13 -= v11 / v2                 # Ops 5–6: A0 in accumulator V13',
    '    v10 = v3 - v1                   # Op 7: branch check (n - 1)',
    '    if v10 > 0:',
    '        v7 = v2; v11 = Fraction(v6, v7)         # Ops 8–9: A1',
    '        v13 += results[0] * v11                 # Ops 10–11: + B1*A1',
    '        v10 -= v1                               # Op 12: inner check',
    '        k = 1',
    '        while v10 > 0:                          # Ops 13–23: Inner loop',
    '            v11 *= Fraction(v6 - 1, v7 + 1) * Fraction(v6 - 2, v7 + 2)',
    '            v6 -= 2; v7 += 2; v13 += results[k] * v11',
    '            k += 1; v10 -= v1',
    '    results.append(-v13)            # Op 24: Store Bernoulli result',
    '    v3 += v1                        # Op 25: Outer loop n += 1',
  ];
}

function snapshotCols(regs, cols, roles) {
  return cols.map((id) => {
    const val = regs[id];
    const group =
      id === 'V1' || id === 'V2' || id === 'V3'
        ? 'data'
        : id.startsWith('V2')
          ? 'result'
          : 'work';
    return {
      id,
      role: roles[id] || 'Register',
      group,
      value: val ? formatFraction(val) : '—',
      decimal: val ? formatDecimal(val, 4) : '—',
      raw: val,
    };
  });
}

function buildWarmupTrace() {
  const regs = {
    V1: frac(10),
    V2: frac(4),
    V3: frac(6),
    V4: null,
    V5: null,
    V6: null,
    V7: null,
  };
  const steps = [];
  const pushStep = ({
    opNum,
    opSymbol,
    cardText,
    millText,
    reads,
    writes,
    overwrote,
    phase,
    detail,
    pyLine,
    tape,
  }) => {
    steps.push({
      stepIndex: steps.length,
      opNum,
      opSymbol,
      cardText,
      millText,
      reads: [...reads],
      writes: [...writes],
      overwrote: overwrote || null,
      phase,
      detail,
      n: 1,
      bugActive: false,
      bugNote: null,
      pythonLines: WARMUP_PYTHON,
      pythonActiveLine: pyLine,
      tape: tape.map((t) => ({ ...t })),
      columns: snapshotCols(regs, WARMUP_COLS, WARMUP_ROLES),
    });
  };

  pushStep({
    opNum: 0,
    opSymbol: 'LOAD',
    cardText: 'Load V1 ← 10, V2 ← 4, V3 ← 6',
    millText: 'Number Cards → Store V1, V2, V3',
    reads: [],
    writes: ['V1', 'V2', 'V3'],
    phase: 'Setup',
    detail: 'Decimal Number Cards load 10, 4, and 6 into Store columns V1, V2, and V3.',
    pyLine: 0,
    tape: [],
  });

  regs.V4 = fMul(regs.V1, regs.V2);
  pushStep({
    opNum: 1,
    opSymbol: '×',
    cardText: 'V4 ← V1 × V2',
    millText: '10 × 4 = 40',
    reads: ['V1', 'V2'],
    writes: ['V4'],
    phase: 'Step 1 · Multiply',
    detail: 'The Mill multiplies V1 (10) by V2 (4) and stores 40 in scratchpad V4.',
    pyLine: 1,
    tape: [],
  });

  regs.V5 = fAdd(regs.V4, regs.V3);
  pushStep({
    opNum: 2,
    opSymbol: '+',
    cardText: 'V5 ← V4 + V3',
    millText: '40 + 6 = 46',
    reads: ['V4', 'V3'],
    writes: ['V5'],
    phase: 'Step 2 · Add',
    detail: 'The Mill adds V4 (40) and V3 (6) to store the total bill 46 in V5.',
    pyLine: 2,
    tape: [],
  });

  regs.V6 = fDiv(regs.V5, frac(2));
  pushStep({
    opNum: 3,
    opSymbol: '÷',
    cardText: 'V6 ← V5 ÷ 2',
    millText: '46 ÷ 2 = 23',
    reads: ['V5'],
    writes: ['V6'],
    phase: 'Step 3 · Divide',
    detail: 'The Mill divides V5 (46) by 2 and stores each person’s share (23) in V6.',
    pyLine: 3,
    tape: [],
  });

  const prevV4 = formatFraction(regs.V4);
  regs.V4 = fMul(regs.V2, regs.V3);
  pushStep({
    opNum: 4,
    opSymbol: '×',
    cardText: 'V4 ← V2 × V3',
    millText: '4 × 6 = 24',
    reads: ['V2', 'V3'],
    writes: ['V4'],
    overwrote: { reg: 'V4', oldVal: prevV4, newVal: formatFraction(regs.V4) },
    phase: 'Step 4 · Overwrite',
    detail: `V4 receives 24, replacing its previous value ${prevV4}. Registers hold one value at a time.`,
    pyLine: 4,
    tape: [],
  });

  regs.V7 = fAdd(regs.V4, regs.V6);
  const finalTape = [{ label: 'V7', modernLabel: 'Result', value: '47', decimal: '47', isBuggy: false }];
  pushStep({
    opNum: 5,
    opSymbol: '+',
    cardText: 'V7 ← V4 + V6',
    millText: '24 + 23 = 47',
    reads: ['V4', 'V6'],
    writes: ['V7'],
    phase: 'Step 5 · Printer Output',
    detail: 'The Mill reads the new V4 (24) plus V6 (23) to store and print 47.',
    pyLine: 5,
    tape: finalTape,
  });

  return {
    preset: NOTE_G_PRESETS.warmup,
    injectOp4Bug: false,
    steps,
    tableRows: [],
  };
}

/**
 * Execute Ada Lovelace's 1843 Note G algorithm (or Warm-Up preset) into
 * immutable step snapshots with exact Fraction state.
 */
export function buildEngineTrace(presetId = 'note-g-n1', options = {}) {
  const preset = NOTE_G_PRESETS[presetId] || NOTE_G_PRESETS['note-g-n1'];
  if (preset.id === 'warmup') return buildWarmupTrace();

  const injectOp4Bug = Boolean(options.injectOp4Bug);
  const pyLines = getNoteGPythonLines(injectOp4Bug);

  const regs = {};
  for (const col of NOTE_G_COLS) {
    regs[col] = col.startsWith('V2') ? null : frac(0);
  }
  regs.V1 = frac(1);
  regs.V2 = frac(2);
  regs.V3 = frac(preset.startN);

  const tape = [];
  for (const pre of preset.preloadResults) {
    regs[pre.reg] = pre.val;
    tape.push({
      label: pre.label,
      modernLabel: `B${adaIndexToModern(Number(pre.label.slice(1)))}`,
      value: formatFraction(pre.val),
      decimal: formatDecimal(pre.val, 5),
      isBuggy: false,
      preloaded: true,
    });
  }

  const steps = [];
  let currentN = preset.startN;

  const record = ({
    opNum,
    opSymbol,
    cardText,
    millText,
    reads = [],
    writes = [],
    overwrote = null,
    phase,
    detail,
    pyLine,
    bugActive = false,
    bugNote = null,
    branchTaken = null,
    formula1843 = '',
  }) => {
    steps.push({
      stepIndex: steps.length,
      opNum,
      opSymbol,
      cardText,
      millText,
      reads: [...reads],
      writes: [...writes],
      overwrote,
      phase,
      detail,
      n: currentN,
      bugActive,
      bugNote,
      branchTaken,
      formula1843,
      pythonLines: pyLines,
      pythonActiveLine: pyLine,
      tape: tape.map((t) => ({ ...t })),
      columns: snapshotCols(regs, NOTE_G_COLS, NOTE_G_ROLES),
    });
  };

  const writeReg = (id, newVal) => {
    const prev = regs[id];
    const prevStr = prev ? formatFraction(prev) : '—';
    const nextStr = formatFraction(newVal);
    const overwrote = prev !== null && !fEq(prev, newVal) && (prev.num !== 0n || id.startsWith('V2'))
      ? { reg: id, oldVal: prevStr, newVal: nextStr }
      : null;
    regs[id] = newVal;
    return overwrote;
  };

  record({
    opNum: 0,
    opSymbol: 'DATA',
    cardText: `Load V1←1, V2←2, V3←${currentN}`,
    millText: `Data Cards set n = ${currentN}`,
    reads: [],
    writes: ['V1', 'V2', 'V3'],
    phase: 'Data Cards · Setup',
    detail: `Number cards initialize V1 = 1, V2 = 2, and V3 = ${currentN} (pass counter n). Working columns V4–V13 start at 0.`,
    pyLine: 0,
    formula1843: `V1=1, V2=2, V3=${currentN}`,
  });

  while (currentN <= preset.endN) {
    // Op 1: V4, V5, V6 <- V2 * V3
    const twoN = fMul(regs.V2, regs.V3);
    writeReg('V4', twoN);
    writeReg('V5', twoN);
    writeReg('V6', twoN);
    record({
      opNum: 1,
      opSymbol: '×',
      cardText: 'V4, V5, V6 ← V2 × V3',
      millText: `2 × ${currentN} = ${formatFraction(twoN)}`,
      reads: ['V2', 'V3'],
      writes: ['V4', 'V5', 'V6'],
      phase: `n=${currentN} · Op 1`,
      detail: `The Mill multiplies V2 (2) × V3 (${currentN}) = ${formatFraction(twoN)} and distributes 2n into three Store columns: V4, V5, and V6.`,
      pyLine: 2,
      formula1843: `= 2n = ${formatFraction(twoN)}`,
    });

    // Op 2: V4 <- V4 - V1
    const ov2 = writeReg('V4', fSub(regs.V4, regs.V1));
    record({
      opNum: 2,
      opSymbol: '−',
      cardText: 'V4 ← V4 − V1',
      millText: `${formatFraction(twoN)} − 1 = ${formatFraction(regs.V4)}`,
      reads: ['V4', 'V1'],
      writes: ['V4'],
      overwrote: ov2,
      phase: `n=${currentN} · Op 2`,
      detail: `Computes 2n − 1 = ${formatFraction(regs.V4)} and overwrites V4.`,
      pyLine: 3,
      formula1843: `= 2n − 1 = ${formatFraction(regs.V4)}`,
    });

    // Op 3: V5 <- V5 + V1
    const ov3 = writeReg('V5', fAdd(regs.V5, regs.V1));
    record({
      opNum: 3,
      opSymbol: '+',
      cardText: 'V5 ← V5 + V1',
      millText: `${formatFraction(twoN)} + 1 = ${formatFraction(regs.V5)}`,
      reads: ['V5', 'V1'],
      writes: ['V5'],
      overwrote: ov3,
      phase: `n=${currentN} · Op 3`,
      detail: `Computes 2n + 1 = ${formatFraction(regs.V5)} and overwrites V5.`,
      pyLine: 3,
      formula1843: `= 2n + 1 = ${formatFraction(regs.V5)}`,
    });

    // Op 4: V11 <- V4 / V5 (or buggy V5 / V4)
    const expectedOp4 = fDiv(regs.V4, regs.V5);
    const actualOp4 = injectOp4Bug ? fDiv(regs.V5, regs.V4) : expectedOp4;
    const ov4 = writeReg('V11', actualOp4);
    record({
      opNum: 4,
      opSymbol: '÷',
      cardText: injectOp4Bug ? 'V11 ← V5 ÷ V4 [1843 TYPO!]' : 'V11 ← V4 ÷ V5',
      millText: injectOp4Bug
        ? `${formatFraction(regs.V5)} ÷ ${formatFraction(regs.V4)} = ${formatFraction(actualOp4)}`
        : `${formatFraction(regs.V4)} ÷ ${formatFraction(regs.V5)} = ${formatFraction(actualOp4)}`,
      reads: injectOp4Bug ? ['V5', 'V4'] : ['V4', 'V5'],
      writes: ['V11'],
      overwrote: ov4,
      phase: injectOp4Bug ? `n=${currentN} · Op 4 (1843 BUG)` : `n=${currentN} · Op 4`,
      detail: injectOp4Bug
        ? `1843 printing bug triggered! The published table swapped the operands to V5 ÷ V4 = ${formatFraction(actualOp4)} instead of V4 ÷ V5 = ${formatFraction(expectedOp4)}.`
        : `Divides V4 (${formatFraction(regs.V4)}) by V5 (${formatFraction(regs.V5)}) to get ${formatFraction(actualOp4)} in V11.`,
      pyLine: 4,
      bugActive: injectOp4Bug,
      bugNote: injectOp4Bug
        ? {
            expected: formatFraction(expectedOp4),
            actual: formatFraction(actualOp4),
            message: 'History’s first printed bug: V5 ÷ V4 inverted the fraction.',
          }
        : null,
      formula1843: `= (2n−1)/(2n+1) → ${formatFraction(actualOp4)}`,
    });

    // Op 5: V11 <- V11 / V2
    const beforeOp5 = formatFraction(regs.V11);
    const ov5 = writeReg('V11', fDiv(regs.V11, regs.V2));
    record({
      opNum: 5,
      opSymbol: '÷',
      cardText: 'V11 ← V11 ÷ V2',
      millText: `${beforeOp5} ÷ 2 = ${formatFraction(regs.V11)}`,
      reads: ['V11', 'V2'],
      writes: ['V11'],
      overwrote: ov5,
      phase: `n=${currentN} · Op 5`,
      detail: `Halves V11 to get ½·${beforeOp5} = ${formatFraction(regs.V11)}.`,
      pyLine: 5,
      formula1843: `= ½·(2n−1)/(2n+1) = ${formatFraction(regs.V11)}`,
    });

    // Op 6: V13 <- V13 - V11 (= A0)
    const beforeOp6 = formatFraction(regs.V13);
    const ov6 = writeReg('V13', fSub(regs.V13, regs.V11));
    record({
      opNum: 6,
      opSymbol: '−',
      cardText: 'V13 ← V13 − V11',
      millText: `${beforeOp6} − ${formatFraction(regs.V11)} = ${formatFraction(regs.V13)}`,
      reads: ['V13', 'V11'],
      writes: ['V13'],
      overwrote: ov6,
      phase: `n=${currentN} · Op 6`,
      detail: `Stores A₀ = ${formatFraction(regs.V13)} in accumulator V13.`,
      pyLine: 5,
      formula1843: `= A₀ = ${formatFraction(regs.V13)}`,
    });

    // Op 7: V10 <- V3 - V1 (= n - 1)
    const ov7 = writeReg('V10', fSub(regs.V3, regs.V1));
    const skipTo24After7 = regs.V10.num === 0n;
    record({
      opNum: 7,
      opSymbol: '−',
      cardText: 'V10 ← V3 − V1 (Branch check)',
      millText: `${currentN} − 1 = ${formatFraction(regs.V10)} → ${skipTo24After7 ? 'Skip to Op 24' : 'Continue to Op 8'}`,
      reads: ['V3', 'V1'],
      writes: ['V10'],
      overwrote: ov7,
      branchTaken: skipTo24After7 ? 'skip-to-24' : 'continue',
      phase: `n=${currentN} · Op 7 · Branch`,
      detail: skipTo24After7
        ? 'Conditional branch: V10 = 0 (n = 1), so no A₁ or inner loop terms exist. Jump straight to Operation 24!'
        : `Conditional branch: V10 = ${formatFraction(regs.V10)} > 0, so continue to Operation 8 for the B₁·A₁ term.`,
      pyLine: 6,
      formula1843: `= n − 1 = ${formatFraction(regs.V10)}`,
    });

    if (!skipTo24After7) {
      // Op 8: V7 <- V2 + V7 (= 2)
      const ov8 = writeReg('V7', fAdd(regs.V2, regs.V7));
      record({
        opNum: 8,
        opSymbol: '+',
        cardText: 'V7 ← V2 + V7',
        millText: `2 + 0 = ${formatFraction(regs.V7)}`,
        reads: ['V2', 'V7'],
        writes: ['V7'],
        overwrote: ov8,
        phase: `n=${currentN} · Op 8`,
        detail: 'Sets initial denominator factor V7 = 2 for A₁ = 2n / 2.',
        pyLine: 8,
        formula1843: `= 2`,
      });

      // Op 9: V11 <- V6 / V7 (= A1)
      const ov9 = writeReg('V11', fDiv(regs.V6, regs.V7));
      record({
        opNum: 9,
        opSymbol: '÷',
        cardText: 'V11 ← V6 ÷ V7',
        millText: `${formatFraction(regs.V6)} ÷ ${formatFraction(regs.V7)} = ${formatFraction(regs.V11)}`,
        reads: ['V6', 'V7'],
        writes: ['V11'],
        overwrote: ov9,
        phase: `n=${currentN} · Op 9`,
        detail: `Computes A₁ = 2n / 2 = ${formatFraction(regs.V11)} in V11.`,
        pyLine: 8,
        formula1843: `= A₁ = ${formatFraction(regs.V11)}`,
      });

      // Op 10: V12 <- V21 * V11 (= B1 * A1)
      const b1Val = regs.V21 || frac(0);
      const ov10 = writeReg('V12', fMul(b1Val, regs.V11));
      record({
        opNum: 10,
        opSymbol: '×',
        cardText: 'V12 ← V21 × V11',
        millText: `${formatFraction(b1Val)} × ${formatFraction(regs.V11)} = ${formatFraction(regs.V12)}`,
        reads: ['V21', 'V11'],
        writes: ['V12'],
        overwrote: ov10,
        phase: `n=${currentN} · Op 10`,
        detail: `Multiplies saved B₁ (${formatFraction(b1Val)}) from Result V21 by A₁ (${formatFraction(regs.V11)}) → ${formatFraction(regs.V12)}.`,
        pyLine: 9,
        formula1843: `= B₁·A₁ = ${formatFraction(regs.V12)}`,
      });

      // Op 11: V13 <- V12 + V13
      const prev13 = formatFraction(regs.V13);
      const ov11 = writeReg('V13', fAdd(regs.V12, regs.V13));
      record({
        opNum: 11,
        opSymbol: '+',
        cardText: 'V13 ← V12 + V13',
        millText: `${formatFraction(regs.V12)} + (${prev13}) = ${formatFraction(regs.V13)}`,
        reads: ['V12', 'V13'],
        writes: ['V13'],
        overwrote: ov11,
        phase: `n=${currentN} · Op 11`,
        detail: `Accumulates A₀ + B₁A₁ = ${formatFraction(regs.V13)} into V13.`,
        pyLine: 9,
        formula1843: `= A₀ + B₁A₁ = ${formatFraction(regs.V13)}`,
      });

      // Op 12: V10 <- V10 - V1 (= n - 2)
      const ov12 = writeReg('V10', fSub(regs.V10, regs.V1));
      const skipTo24After12 = regs.V10.num === 0n;
      record({
        opNum: 12,
        opSymbol: '−',
        cardText: 'V10 ← V10 − V1 (Loop check)',
        millText: `${currentN - 1} − 1 = ${formatFraction(regs.V10)} → ${skipTo24After12 ? 'Skip to Op 24' : 'Enter Ops 13–23 Loop'}`,
        reads: ['V10', 'V1'],
        writes: ['V10'],
        overwrote: ov12,
        branchTaken: skipTo24After12 ? 'skip-to-24' : 'enter-loop',
        phase: `n=${currentN} · Op 12 · Branch`,
        detail: skipTo24After12
          ? 'Conditional branch: V10 = 0 (n = 2), so jump over the inner loop directly to Operation 24.'
          : `V10 = ${formatFraction(regs.V10)} > 0: enter the inner loop (Operations 13–23), which will repeat ${formatFraction(regs.V10)} time(s).`,
        pyLine: 10,
        formula1843: `= n − 2 = ${formatFraction(regs.V10)}`,
      });

      // Inner Loop Ops 13–23
      let innerPass = 1;
      while (regs.V10.num > 0n) {
        const resultIdx = 21 + innerPass; // V22 for pass 1 (B3), V23 for pass 2 (B5)
        const resultReg = `V${resultIdx}`;
        const termSub = 2 * innerPass + 1;

        // Op 13
        const ov13 = writeReg('V6', fSub(regs.V6, regs.V1));
        record({
          opNum: 13,
          opSymbol: '−',
          cardText: 'V6 ← V6 − V1',
          millText: `${formatFraction(regs.V6)} (Inner pass #${innerPass})`,
          reads: ['V6', 'V1'],
          writes: ['V6'],
          overwrote: ov13,
          phase: `n=${currentN} · Loop #${innerPass} · Op 13`,
          detail: `Inner loop pass #${innerPass}: decrements numerator factor V6 to ${formatFraction(regs.V6)}.`,
          pyLine: 13,
          formula1843: `= ${formatFraction(regs.V6)}`,
        });

        // Op 14
        const ov14 = writeReg('V7', fAdd(regs.V1, regs.V7));
        record({
          opNum: 14,
          opSymbol: '+',
          cardText: 'V7 ← V1 + V7',
          millText: `Denominator V7 = ${formatFraction(regs.V7)}`,
          reads: ['V1', 'V7'],
          writes: ['V7'],
          overwrote: ov14,
          phase: `n=${currentN} · Loop #${innerPass} · Op 14`,
          detail: `Advances denominator factor V7 to ${formatFraction(regs.V7)}.`,
          pyLine: 13,
          formula1843: `= ${formatFraction(regs.V7)}`,
        });

        // Op 15
        const ov15 = writeReg('V8', fDiv(regs.V6, regs.V7));
        record({
          opNum: 15,
          opSymbol: '÷',
          cardText: 'V8 ← V6 ÷ V7',
          millText: `${formatFraction(regs.V6)} ÷ ${formatFraction(regs.V7)} = ${formatFraction(regs.V8)}`,
          reads: ['V6', 'V7'],
          writes: ['V8'],
          overwrote: ov15,
          phase: `n=${currentN} · Loop #${innerPass} · Op 15`,
          detail: `Computes first multiplier ratio V8 = ${formatFraction(regs.V8)}.`,
          pyLine: 13,
          formula1843: `= ${formatFraction(regs.V8)}`,
        });

        // Op 16
        const prev11a = formatFraction(regs.V11);
        const ov16 = writeReg('V11', fMul(regs.V8, regs.V11));
        record({
          opNum: 16,
          opSymbol: '×',
          cardText: 'V11 ← V8 × V11',
          millText: `${formatFraction(regs.V8)} × ${prev11a} = ${formatFraction(regs.V11)}`,
          reads: ['V8', 'V11'],
          writes: ['V11'],
          overwrote: ov16,
          phase: `n=${currentN} · Loop #${innerPass} · Op 16`,
          detail: `Updates running A-factor V11 to ${formatFraction(regs.V11)}.`,
          pyLine: 13,
          formula1843: `= ${formatFraction(regs.V11)}`,
        });

        // Op 17
        const ov17 = writeReg('V6', fSub(regs.V6, regs.V1));
        record({
          opNum: 17,
          opSymbol: '−',
          cardText: 'V6 ← V6 − V1',
          millText: `Numerator V6 = ${formatFraction(regs.V6)}`,
          reads: ['V6', 'V1'],
          writes: ['V6'],
          overwrote: ov17,
          phase: `n=${currentN} · Loop #${innerPass} · Op 17`,
          detail: `Decrements V6 once more to ${formatFraction(regs.V6)}.`,
          pyLine: 14,
          formula1843: `= ${formatFraction(regs.V6)}`,
        });

        // Op 18
        const ov18 = writeReg('V7', fAdd(regs.V1, regs.V7));
        record({
          opNum: 18,
          opSymbol: '+',
          cardText: 'V7 ← V1 + V7',
          millText: `Denominator V7 = ${formatFraction(regs.V7)}`,
          reads: ['V1', 'V7'],
          writes: ['V7'],
          overwrote: ov18,
          phase: `n=${currentN} · Loop #${innerPass} · Op 18`,
          detail: `Advances denominator V7 to ${formatFraction(regs.V7)}.`,
          pyLine: 14,
          formula1843: `= ${formatFraction(regs.V7)}`,
        });

        // Op 19
        const ov19 = writeReg('V9', fDiv(regs.V6, regs.V7));
        record({
          opNum: 19,
          opSymbol: '÷',
          cardText: 'V9 ← V6 ÷ V7',
          millText: `${formatFraction(regs.V6)} ÷ ${formatFraction(regs.V7)} = ${formatFraction(regs.V9)}`,
          reads: ['V6', 'V7'],
          writes: ['V9'],
          overwrote: ov19,
          phase: `n=${currentN} · Loop #${innerPass} · Op 19`,
          detail: `Computes second multiplier ratio V9 = ${formatFraction(regs.V9)}.`,
          pyLine: 13,
          formula1843: `= ${formatFraction(regs.V9)}`,
        });

        // Op 20
        const prev11b = formatFraction(regs.V11);
        const ov20 = writeReg('V11', fMul(regs.V9, regs.V11));
        record({
          opNum: 20,
          opSymbol: '×',
          cardText: 'V11 ← V9 × V11',
          millText: `${formatFraction(regs.V9)} × ${prev11b} = ${formatFraction(regs.V11)}`,
          reads: ['V9', 'V11'],
          writes: ['V11'],
          overwrote: ov20,
          phase: `n=${currentN} · Loop #${innerPass} · Op 20`,
          detail: `Completes A${termSub} = ${formatFraction(regs.V11)} in V11.`,
          pyLine: 13,
          formula1843: `= A${termSub} = ${formatFraction(regs.V11)}`,
        });

        // Op 21
        const prevB = regs[resultReg] || frac(0);
        const ov21 = writeReg('V12', fMul(prevB, regs.V11));
        record({
          opNum: 21,
          opSymbol: '×',
          cardText: `V12 ← ${resultReg} × V11`,
          millText: `${formatFraction(prevB)} × ${formatFraction(regs.V11)} = ${formatFraction(regs.V12)}`,
          reads: [resultReg, 'V11'],
          writes: ['V12'],
          overwrote: ov21,
          phase: `n=${currentN} · Loop #${innerPass} · Op 21`,
          detail: `Variable card selects Result ${resultReg} (B${termSub} = ${formatFraction(prevB)}) × V11 (A${termSub}) = ${formatFraction(regs.V12)}.`,
          pyLine: 14,
          formula1843: `= B${termSub}·A${termSub} = ${formatFraction(regs.V12)}`,
        });

        // Op 22
        const prevAcc = formatFraction(regs.V13);
        const ov22 = writeReg('V13', fAdd(regs.V12, regs.V13));
        record({
          opNum: 22,
          opSymbol: '+',
          cardText: 'V13 ← V12 + V13',
          millText: `${formatFraction(regs.V12)} + (${prevAcc}) = ${formatFraction(regs.V13)}`,
          reads: ['V12', 'V13'],
          writes: ['V13'],
          overwrote: ov22,
          phase: `n=${currentN} · Loop #${innerPass} · Op 22`,
          detail: `Adds B${termSub}·A${termSub} into accumulator V13 → ${formatFraction(regs.V13)}.`,
          pyLine: 14,
          formula1843: `= Σ = ${formatFraction(regs.V13)}`,
        });

        // Op 23
        const ov23 = writeReg('V10', fSub(regs.V10, regs.V1));
        const loopAgain = regs.V10.num > 0n;
        record({
          opNum: 23,
          opSymbol: '−',
          cardText: 'V10 ← V10 − V1 (Repeat check)',
          millText: `V10 = ${formatFraction(regs.V10)} → ${loopAgain ? 'Loop back to Op 13!' : 'Exit inner loop → Op 24'}`,
          reads: ['V10', 'V1'],
          writes: ['V10'],
          overwrote: ov23,
          branchTaken: loopAgain ? 'loop-to-13' : 'exit-loop',
          phase: `n=${currentN} · Loop #${innerPass} · Op 23`,
          detail: loopAgain
            ? `V10 = ${formatFraction(regs.V10)} > 0: rewind operation cards back to Op 13 and advance variable card from ${resultReg} to V${resultIdx + 1}.`
            : 'V10 reaches 0: all inner summation terms are complete. Proceed to Operation 24!',
          pyLine: 15,
          formula1843: `= ${formatFraction(regs.V10)}`,
        });

        innerPass++;
      }
    }

    // Op 24: Result register V{20+n} <- -V13
    const destResult = `V${20 + currentN}`;
    const bLabel = `B${2 * currentN - 1}`;
    const bModernLabel = `B${2 * currentN}`;
    const resultVal = fNeg(regs.V13);
    const ov24 = writeReg(destResult, resultVal);
    const resultStr = formatFraction(resultVal);
    tape.push({
      label: bLabel,
      modernLabel: bModernLabel,
      value: resultStr,
      decimal: formatDecimal(resultVal, 5),
      isBuggy: injectOp4Bug,
      preloaded: false,
    });
    record({
      opNum: 24,
      opSymbol: 'STORE',
      cardText: `${destResult} ← −V13 (${bLabel})`,
      millText: `−(${formatFraction(regs.V13)}) = ${resultStr}${injectOp4Bug ? ' [corrupted by Op 4]' : ''}`,
      reads: ['V13'],
      writes: [destResult],
      overwrote: ov24,
      phase: `n=${currentN} · Op 24 · Output`,
      detail: `Writes ${bLabel} (modern ${bModernLabel}) = ${resultStr} into Result ${destResult} and sends it to the Printer Tape. (In the 1843 table, sign inversion from V13 happens on transfer.)`,
      pyLine: 16,
      bugActive: injectOp4Bug,
      formula1843: `= ${bLabel} = ${resultStr}`,
    });

    // Op 25: V3 <- V1 + V3 (n <- n + 1) and reset working columns V4..V13 to 0
    const nextN = currentN + 1;
    const ov25 = writeReg('V3', fAdd(regs.V1, regs.V3));
    const hasMoreOuter = nextN <= preset.endN;
    for (let wi = 4; wi <= 13; wi++) {
      regs[`V${wi}`] = frac(0);
    }
    record({
      opNum: 25,
      opSymbol: '+',
      cardText: 'V3 ← V1 + V3 (Advance n & clear work)',
      millText: `n becomes ${nextN}${hasMoreOuter ? ' → Repeat outer loop at Op 1' : ' → Program Complete'}`,
      reads: ['V1', 'V3'],
      writes: ['V3'],
      overwrote: ov25,
      branchTaken: hasMoreOuter ? 'outer-loop' : 'halt',
      phase: `n=${currentN} · Op 25 · Outer Loop`,
      detail: hasMoreOuter
        ? `Increments counter V3 to ${nextN}, zeros working columns V4–V13, and rewinds the operation cards to Op 1.`
        : `Increments counter V3 to ${nextN} and clears working columns V4–V13. Final printer tape: ${tape.map((t) => `${t.label}=${t.value}`).join(', ')}.`,
      pyLine: 17,
      formula1843: `= n + 1 = ${nextN}`,
    });

    currentN = nextN;
  }

  return {
    preset,
    injectOp4Bug,
    steps,
    tableRows: buildStatic1843Table(),
  };
}

function buildStatic1843Table() {
  return [
    { op: 1, instr: 'V4, V5, V6 ← V2 × V3', meaning: '2n (copied to 3 columns)' },
    { op: 2, instr: 'V4 ← V4 − V1', meaning: '2n − 1' },
    { op: 3, instr: 'V5 ← V5 + V1', meaning: '2n + 1' },
    { op: 4, instr: 'V11 ← V4 ÷ V5', meaning: '(2n−1)/(2n+1) [1843 print typo: V5÷V4]' },
    { op: 5, instr: 'V11 ← V11 ÷ V2', meaning: '½ · (2n−1)/(2n+1)' },
    { op: 6, instr: 'V13 ← V13 − V11', meaning: 'A₀ (first term)' },
    { op: 7, instr: 'V10 ← V3 − V1', meaning: 'n − 1 (if 0, jump to Op 24)' },
    { op: 8, instr: 'V7 ← V2 + V7', meaning: '2' },
    { op: 9, instr: 'V11 ← V6 ÷ V7', meaning: 'A₁ = 2n / 2' },
    { op: 10, instr: 'V12 ← V21 × V11', meaning: 'B₁ · A₁' },
    { op: 11, instr: 'V13 ← V12 + V13', meaning: 'A₀ + B₁A₁' },
    { op: 12, instr: 'V10 ← V10 − V1', meaning: 'n − 2 (if 0, jump to Op 24)' },
    { op: 13, instr: 'V6 ← V6 − V1', meaning: 'Inner loop: numerator − 1' },
    { op: 14, instr: 'V7 ← V1 + V7', meaning: 'Inner loop: denominator + 1' },
    { op: 15, instr: 'V8 ← V6 ÷ V7', meaning: 'Ratio 1' },
    { op: 16, instr: 'V11 ← V8 × V11', meaning: 'Scale A factor' },
    { op: 17, instr: 'V6 ← V6 − V1', meaning: 'Numerator − 1' },
    { op: 18, instr: 'V7 ← V1 + V7', meaning: 'Denominator + 1' },
    { op: 19, instr: 'V9 ← V6 ÷ V7', meaning: 'Ratio 2' },
    { op: 20, instr: 'V11 ← V9 × V11', meaning: 'Complete A_{2k+1}' },
    { op: 21, instr: 'V12 ← V{21+k} × V11', meaning: 'B_{2k+1} · A_{2k+1}' },
    { op: 22, instr: 'V13 ← V12 + V13', meaning: 'Accumulate sum in V13' },
    { op: 23, instr: 'V10 ← V10 − V1', meaning: 'If V10 > 0, repeat Ops 13–23' },
    { op: 24, instr: 'V{20+n} ← −V13', meaning: 'Output B_{2n−1}' },
    { op: 25, instr: 'V3 ← V1 + V3', meaning: 'n ← n + 1; outer loop to Op 1' },
  ];
}

/* ── Decimal & Binary Punch-Card Encoders ─────────────────────────────────── */

export function encodeDecimalCard(value) {
  const clamped = Math.max(0, Math.min(999, Math.trunc(Number(value) || 0)));
  return [
    Math.floor(clamped / 100),
    Math.floor((clamped % 100) / 10),
    clamped % 10,
  ];
}

export function decodeDecimalCard(digits) {
  const [h = 0, t = 0, o = 0] = digits || [];
  return Math.max(0, Math.min(9, h)) * 100 +
    Math.max(0, Math.min(9, t)) * 10 +
    Math.max(0, Math.min(9, o));
}

export function encodeBinaryCard(value) {
  const clamped = Math.max(0, Math.min(255, Math.trunc(Number(value) || 0)));
  const bits = [];
  for (let i = 7; i >= 0; i--) {
    bits.push((clamped >> i) & 1);
  }
  return bits;
}

export function decodeBinaryCard(bits) {
  let total = 0;
  for (let i = 0; i < 8; i++) {
    if (bits && bits[i]) total += 1 << (7 - i);
  }
  return total;
}

/* ── Punch-Card Programmer VM ─────────────────────────────────────────────── */

export const CARD_DECK_PRESETS = {
  'ticket-bill': {
    id: 'ticket-bill',
    title: 'Ticket Bill & Overwrite',
    initialRegisters: { V0: 0, V1: 10, V2: 4, V3: 6, V4: 2, V5: 0, V6: 0 },
    repeatCount: 1,
    cards: [
      { op: '*', a: 'V1', b: 'V2', dest: 'V5', note: 'Subtotal = price × tickets' },
      { op: '+', a: 'V5', b: 'V3', dest: 'V5', note: 'Overwrite V5 with fee added' },
      { op: '/', a: 'V5', b: 'V4', dest: 'V6', note: 'Each person’s share' },
    ],
  },
  'powers-of-2': {
    id: 'powers-of-2',
    title: 'Powers of 2 (Loop 5×)',
    initialRegisters: { V0: 0, V1: 1, V2: 2, V3: 0, V4: 0, V5: 0, V6: 0 },
    repeatCount: 5,
    cards: [
      { op: '*', a: 'V1', b: 'V2', dest: 'V1', note: 'Double V1 in place' },
    ],
  },
  'fibonacci-loop': {
    id: 'fibonacci-loop',
    title: 'Fibonacci Sequence (Loop 5×)',
    initialRegisters: { V0: 0, V1: 0, V2: 1, V3: 0, V4: 0, V5: 0, V6: 0 },
    repeatCount: 5,
    cards: [
      { op: '+', a: 'V1', b: 'V2', dest: 'V4', note: 'Next term = V1 + V2' },
      { op: '+', a: 'V2', b: 'V0', dest: 'V1', note: 'Shift V1 ← V2' },
      { op: '+', a: 'V4', b: 'V0', dest: 'V2', note: 'Shift V2 ← V4' },
    ],
  },
};

const OP_SYMBOLS = { '+': '+', '-': '−', '*': '×', '/': '÷' };

export function executeCardDeck({ initialRegisters = {}, cards = [], repeatCount = 1 }) {
  const repeats = Math.max(1, Math.min(5, Math.trunc(Number(repeatCount) || 1)));
  const regs = {
    V0: frac(0),
    V1: frac(initialRegisters.V1 ?? 0),
    V2: frac(initialRegisters.V2 ?? 0),
    V3: frac(initialRegisters.V3 ?? 0),
    V4: frac(initialRegisters.V4 ?? 0),
    V5: frac(initialRegisters.V5 ?? 0),
    V6: frac(initialRegisters.V6 ?? 0),
  };

  const formatRegs = () => {
    const out = {};
    for (const k of Object.keys(regs)) out[k] = formatFraction(regs[k]);
    return out;
  };

  const steps = [];
  let haltedError = null;

  for (let pass = 1; pass <= repeats && !haltedError; pass++) {
    for (let cardIndex = 0; cardIndex < cards.length; cardIndex++) {
      const card = cards[cardIndex];
      const dest = card.dest === 'V0' ? 'V1' : card.dest;
      const aVal = regs[card.a] || frac(0);
      const bVal = regs[card.b] || frac(0);
      const prevStr = formatFraction(regs[dest]);
      const sym = OP_SYMBOLS[card.op] || card.op;

      let result;
      try {
        if (card.op === '+') result = fAdd(aVal, bVal);
        else if (card.op === '-') result = fSub(aVal, bVal);
        else if (card.op === '*') result = fMul(aVal, bVal);
        else if (card.op === '/') result = fDiv(aVal, bVal);
        else result = frac(0);
      } catch (err) {
        haltedError = `Pass ${pass}, Card ${cardIndex + 1}: ${err.message} (${card.a} ÷ ${card.b} where ${card.b} = 0)`;
        steps.push({
          stepIndex: steps.length,
          pass,
          cardIndex,
          card: { ...card },
          reads: [card.a, card.b],
          dest,
          overwrote: false,
          calcText: `${dest} ← ${card.a} (${formatFraction(aVal)}) ${sym} ${card.b} (${formatFraction(bVal)}) → Error`,
          error: haltedError,
          registers: formatRegs(),
        });
        break;
      }

      const overwrote = !fEq(regs[dest], result) && regs[dest].num !== 0n;
      regs[dest] = result;
      steps.push({
        stepIndex: steps.length,
        pass,
        cardIndex,
        card: { ...card },
        reads: [card.a, card.b],
        dest,
        prevVal: prevStr,
        newVal: formatFraction(result),
        overwrote,
        calcText: `${dest} ← ${card.a} (${formatFraction(aVal)}) ${sym} ${card.b} (${formatFraction(bVal)}) = ${formatFraction(result)}`,
        error: null,
        registers: formatRegs(),
      });
    }
  }

  return {
    initialRegisters: {
      V0: '0',
      V1: formatFraction(frac(initialRegisters.V1 ?? 0)),
      V2: formatFraction(frac(initialRegisters.V2 ?? 0)),
      V3: formatFraction(frac(initialRegisters.V3 ?? 0)),
      V4: formatFraction(frac(initialRegisters.V4 ?? 0)),
      V5: formatFraction(frac(initialRegisters.V5 ?? 0)),
      V6: formatFraction(frac(initialRegisters.V6 ?? 0)),
    },
    finalRegisters: formatRegs(),
    repeatCount: repeats,
    steps,
    error: haltedError,
  };
}

export function generateDeckPython({ initialRegisters = {}, cards = [], repeatCount = 1 }) {
  const repeats = Math.max(1, Math.min(5, Math.trunc(Number(repeatCount) || 1)));
  const lines = [
    'from fractions import Fraction',
    `v0 = Fraction(0)  # Constant zero`,
    `v1, v2, v3 = Fraction(${Number(initialRegisters.V1 ?? 0)}), Fraction(${Number(initialRegisters.V2 ?? 0)}), Fraction(${Number(initialRegisters.V3 ?? 0)})`,
    `v4, v5, v6 = Fraction(${Number(initialRegisters.V4 ?? 0)}), Fraction(${Number(initialRegisters.V5 ?? 0)}), Fraction(${Number(initialRegisters.V6 ?? 0)})`,
  ];
  if (!cards.length) {
    lines.push('# Add operation cards to build your program');
    return lines.join('\n');
  }
  const indent = repeats > 1 ? '    ' : '';
  if (repeats > 1) {
    lines.push(`for pass_num in range(1, ${repeats + 1}):`);
  }
  for (const card of cards) {
    const dest = (card.dest === 'V0' ? 'V1' : card.dest).toLowerCase();
    const a = card.a.toLowerCase();
    const b = card.b.toLowerCase();
    const note = card.note ? `  # ${card.note}` : '';
    lines.push(`${indent}${dest} = ${a} ${card.op} ${b}${note}`);
  }
  lines.push('print(v1, v2, v3, v4, v5, v6)');
  return lines.join('\n');
}

/* ── Poetical Science Loom & Music Matrix ─────────────────────────────────── */

export const LOOM_NOTES = [
  { row: 0, name: 'C5', freq: 523.25, color: '#10b981', warpLabel: 'Silk Emerald' },
  { row: 1, name: 'A4', freq: 440.00, color: '#f43f5e', warpLabel: 'Crimson Weft' },
  { row: 2, name: 'G4', freq: 392.00, color: '#f59e0b', warpLabel: 'Gold Thread' },
  { row: 3, name: 'E4', freq: 329.63, color: '#a855f7', warpLabel: 'Violet Brocade' },
  { row: 4, name: 'D4', freq: 293.66, color: '#0ea5e9', warpLabel: 'Cerulean Dye' },
  { row: 5, name: 'C4', freq: 261.63, color: '#14b8a6', warpLabel: 'Teal Warp' },
];

export const LOOM_COLS = 8;

export const LOOM_PRESETS = {
  'victorian-chime': [
    [0, 0, 0, 1, 0, 0, 1, 0], // C5
    [0, 0, 1, 0, 0, 1, 0, 0], // A4
    [0, 1, 0, 0, 1, 0, 0, 1], // G4
    [1, 0, 0, 1, 0, 0, 1, 0], // E4
    [0, 1, 0, 0, 0, 1, 0, 0], // D4
    [1, 0, 0, 0, 1, 0, 0, 1], // C4
  ],
  'jacquard-diamond': [
    [0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [0, 1, 0, 0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0, 1, 0, 0],
  ],
  'bernoulli-symmetry': [
    [1, 0, 1, 1, 1, 1, 0, 1],
    [0, 1, 0, 0, 0, 0, 1, 0],
    [1, 0, 1, 0, 0, 1, 0, 1],
    [0, 1, 0, 1, 1, 0, 1, 0],
    [0, 0, 1, 0, 0, 1, 0, 0],
    [1, 0, 0, 1, 1, 0, 0, 1],
  ],
  clear: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
};

export function cloneLoomGrid(presetName = 'victorian-chime') {
  const src = LOOM_PRESETS[presetName] || LOOM_PRESETS['victorian-chime'];
  return src.map((row) => [...row]);
}

/** Encode one column (beat 0..7) into binary, decimal, musical notes, and lifted heddles. */
export function encodeLoomColumn(grid, col) {
  const c = Math.max(0, Math.min(LOOM_COLS - 1, col));
  const bits = [];
  const activeNotes = [];
  const liftedHeddles = [];
  let decimal = 0;

  for (let r = 0; r < LOOM_NOTES.length; r++) {
    const bit = grid[r]?.[c] ? 1 : 0;
    bits.push(bit);
    if (bit) {
      decimal += 1 << (LOOM_NOTES.length - 1 - r);
      activeNotes.push(LOOM_NOTES[r].name);
      liftedHeddles.push(r + 1);
    }
  }

  return {
    col: c,
    bits,
    binary: bits.join(''),
    decimal,
    activeNotes,
    liftedHeddles,
  };
}

/* ── Trace Table Exercises (Unspoiled) ────────────────────────────────────── */

export const TRACE_EXERCISES = {
  'warmup-overwrite': {
    id: 'warmup-overwrite',
    title: 'Warm-Up: Register Overwrite (V1 = 10, V2 = 4, V3 = 6)',
    rows: [
      {
        id: 'w1',
        step: 1,
        op: 'V4 ← V1 × V2',
        dest: 'V4',
        answer: frac(40),
        hint: 'Read V1 (10) × V2 (4) = 40.',
      },
      {
        id: 'w2',
        step: 2,
        op: 'V5 ← V4 + V3',
        dest: 'V5',
        answer: frac(46),
        hint: 'Read V4 from Step 1 (40) + V3 (6) = 46.',
      },
      {
        id: 'w3',
        step: 3,
        op: 'V6 ← V5 ÷ 2',
        dest: 'V6',
        answer: frac(23),
        hint: 'Divide V5 from Step 2 (46) by 2 = 23.',
      },
      {
        id: 'w4',
        step: 4,
        op: 'V4 ← V2 × V3',
        dest: 'V4',
        answer: frac(24),
        hint: 'V2 (4) × V3 (6) = 24 — this overwrites the old 40 in V4!',
      },
      {
        id: 'w5',
        step: 5,
        op: 'V7 ← V4 + V6',
        dest: 'V7',
        answer: frac(47),
        hint: 'Add the NEW V4 (24) + V6 (23) = 47.',
      },
    ],
  },
  'note-g-bug-hunt': {
    id: 'note-g-bug-hunt',
    title: '1843 Note G Ops 1–6 (V1 = 1, V2 = 2, V3 = 4)',
    rows: [
      {
        id: 'ng1',
        step: 'Op 1',
        op: 'V4, V5, V6 ← V2 × V3',
        dest: 'V4',
        answer: frac(8),
        hint: '2 × 4 = 8.',
      },
      {
        id: 'ng2',
        step: 'Op 2',
        op: 'V4 ← V4 − V1',
        dest: 'V4',
        answer: frac(7),
        hint: '8 − 1 = 7.',
      },
      {
        id: 'ng3',
        step: 'Op 3',
        op: 'V5 ← V5 + V1',
        dest: 'V5',
        answer: frac(9),
        hint: '8 + 1 = 9.',
      },
      {
        id: 'ng4',
        step: 'Op 4 (Fixed)',
        op: 'V11 ← V4 ÷ V5',
        dest: 'V11',
        answer: frac(7, 9),
        hint: 'Divide V4 (7) by V5 (9) → 7/9 (not 9/7, which was the 1843 print typo!).',
      },
      {
        id: 'ng5',
        step: 'Op 5',
        op: 'V11 ← V11 ÷ V2',
        dest: 'V11',
        answer: frac(7, 18),
        hint: 'Divide 7/9 by V2 (2) → 7/18.',
      },
      {
        id: 'ng6',
        step: 'Op 6',
        op: 'V13 ← V13 − V11',
        dest: 'V13',
        answer: frac(-7, 18),
        hint: 'V13 starts at 0, so 0 − 7/18 = −7/18 (A₀).',
      },
    ],
  },
};

/** Parse student input supporting integers, decimals, and signed fractions (e.g. "-7/18", "−7/18"). */
export function parseStudentNumber(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).trim().replace(/−/g, '-').replace(/\s+/g, '');
  if (!cleaned) return null;

  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    if (parts.length !== 2) return null;
    if (!/^[+-]?\d+$/.test(parts[0]) || !/^[+-]?\d+$/.test(parts[1])) return null;
    const den = BigInt(parts[1]);
    if (den === 0n) return null;
    return { kind: 'fraction', value: frac(BigInt(parts[0]), den) };
  }

  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return { kind: 'decimal', value: num };
}

export function checkTraceSubmission(exerciseId, submittedValues) {
  const exercise = TRACE_EXERCISES[exerciseId];
  if (!exercise) throw new Error(`Unknown trace exercise: ${exerciseId}`);

  const results = exercise.rows.map((row, idx) => {
    const raw = submittedValues?.[idx] ?? '';
    const parsed = parseStudentNumber(raw);
    let ok = false;
    if (parsed) {
      if (parsed.kind === 'fraction') {
        ok = fEq(parsed.value, row.answer);
      } else {
        ok = Math.abs(parsed.value - fToNumber(row.answer)) <= 0.005;
      }
    }
    return {
      id: row.id,
      step: row.step,
      op: row.op,
      dest: row.dest,
      expected: formatFraction(row.answer),
      hint: row.hint,
      ok,
    };
  });

  const correctCount = results.filter((r) => r.ok).length;
  return {
    exerciseId,
    total: exercise.rows.length,
    correctCount,
    allCorrect: correctCount === exercise.rows.length,
    results,
  };
}

/* ── Studio Mastery Challenges ────────────────────────────────────────────── */

export const CHALLENGES = [
  {
    id: 'run-note-g',
    title: 'First Published Program',
    description: 'Step or play Ada’s Note G (n = 1) to Op 24 and print B₁ = 1/6.',
    tab: 'engine',
    preset: 'note-g-n1',
  },
  {
    id: 'catch-1843-bug',
    title: 'Catch History’s First Bug',
    description: 'Toggle 1843 Op 4 Bug ON and observe V11 ← V5 ÷ V4 corrupt the calculation.',
    tab: 'engine',
    preset: 'note-g-n1',
  },
  {
    id: 'witness-inner-loop',
    title: 'Witness the Inner Loop',
    description: 'Run n = 4 (Full 25 Ops) through Op 24 to compute B₇ = −1/30.',
    tab: 'engine',
    preset: 'note-g-n4',
  },
  {
    id: 'program-mill',
    title: 'Feed the Mill',
    description: 'Execute a custom or preset card deck in the Punch-Card Programmer.',
    tab: 'cards',
  },
  {
    id: 'weave-music',
    title: 'Poetical Science Loom',
    description: 'Punch notes on the loom card and play or weave an 8-beat symbolic pattern.',
    tab: 'loom',
  },
];

export function evaluateChallenges(progress = {}) {
  return CHALLENGES.map((challenge) => ({
    ...challenge,
    completed: Boolean(progress[challenge.id]),
  }));
}
