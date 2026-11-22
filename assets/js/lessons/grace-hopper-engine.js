/**
 * Pure Grace Hopper Studio Engine:
 *   1. FLOW-MATIC / COBOL mini-compiler (lexer, symbol table, assembly, 32-bit binary, CPU VM)
 *   2. Nanosecond & Speed-of-Light signal propagation physics model
 *   3. 1947 Harvard Mark II Relay Panel F fault-isolation simulator
 *   4. Unspoiled hand-trace exercises & mastery challenges
 * Zero DOM dependencies.
 */

/* ============================================================================
   1. FLOW-MATIC / COBOL MINI-COMPILER & CPU VIRTUAL MACHINE
   ============================================================================ */

export const COBOL_PRESET_ORDER = ['payroll', 'reorder', 'supply-budget', 'navy-range'];

export const COBOL_PRESETS = {
  payroll: {
    id: 'payroll',
    title: 'Payroll Calculation',
    subtitle: 'Multiply hours & rate, subtract tax, display net pay',
    source: [
      '* UNIVAC Payroll Routine (FLOW-MATIC / COBOL)',
      'SET HOURS TO 40.',
      'SET RATE TO 18.',
      'MULTIPLY HOURS BY RATE GIVING PAY.',
      'SUBTRACT 95 FROM PAY GIVING NET.',
      'DISPLAY "NET PAY" NET.',
    ].join('\n'),
  },
  reorder: {
    id: 'reorder',
    title: 'Inventory Reorder Alert',
    subtitle: 'Conditional branch + restock difference',
    source: [
      '* Warehouse Stock Check',
      'SET STOCK TO 7.',
      'SET MINIMUM TO 10.',
      'IF STOCK LESS THAN MINIMUM DISPLAY "REORDER PARTS".',
      'SUBTRACT STOCK FROM MINIMUM GIVING NEEDED.',
      'DISPLAY "NEEDED" NEEDED.',
    ].join('\n'),
  },
  'supply-budget': {
    id: 'supply-budget',
    title: 'Naval Supply Budget',
    subtitle: 'Multiply, add overhead, check approval threshold',
    source: [
      '* Naval Supply Depot Estimate',
      'SET CREW TO 24.',
      'SET RATIONS TO 15.',
      'MULTIPLY CREW BY RATIONS GIVING COST.',
      'ADD 120 TO COST GIVING TOTAL.',
      'IF TOTAL GREATER THAN 400 DISPLAY "APPROVAL REQUIRED".',
      'DISPLAY "TOTAL" TOTAL.',
    ].join('\n'),
  },
  'navy-range': {
    id: 'navy-range',
    title: 'Fleet Fuel Range',
    subtitle: 'Divide fuel by burn rate, multiply by speed',
    source: [
      '* Destroyer Endurance Estimator',
      'SET FUEL TO 3600.',
      'SET BURN TO 120.',
      'DIVIDE FUEL BY BURN GIVING HOURS.',
      'MULTIPLY HOURS BY 22 GIVING MILES.',
      'DISPLAY "RANGE NM" MILES.',
    ].join('\n'),
  },
};

const OPCODES = {
  LOADI: 0x10,
  LOAD: 0x12,
  STORE: 0x1b,
  ADD: 0x21,
  SUB: 0x25,
  MUL: 0x2c,
  DIV: 0x2e,
  CMP: 0x31,
  BR_FALSE: 0x46,
  PRINT_STR: 0x78,
  PRINT_VAL: 0x79,
};

const IDENT_RE = /^[A-Z][A-Z0-9_-]*$/;
const NUM_RE = /^-?(?:\d+\.?\d*|\.\d+)$/;

function toByteBin(n) {
  return ((Math.trunc(n) & 0xff) >>> 0).toString(2).padStart(8, '0');
}

function toWord16Bin(n) {
  const val = Math.trunc(n) & 0xffff;
  return `${toByteBin((val >> 8) & 0xff)} ${toByteBin(val & 0xff)}`;
}

function encodeInsn32(opcodeName, regNum, operand16) {
  const op = OPCODES[opcodeName] ?? 0;
  return `${toByteBin(op)} ${toByteBin(regNum)} ${toWord16Bin(operand16)}`;
}

function formatHex16(n) {
  return `0x${((Math.trunc(n) & 0xffff) >>> 0).toString(16).toUpperCase().padStart(4, '0')}`;
}

function formatNumDisplay(n) {
  if (!Number.isFinite(n)) return 'NaN';
  const rounded = Math.round(n * 10000) / 10000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function tokenizeCobolLine(rawLine) {
  const stripped = rawLine.trim().replace(/\.$/, '').trim();
  const tokens = [];
  let i = 0;
  while (i < stripped.length) {
    if (/\s/.test(stripped[i])) {
      i += 1;
      continue;
    }
    if (stripped[i] === '"') {
      const closeIdx = stripped.indexOf('"', i + 1);
      if (closeIdx === -1) {
        return { ok: false, error: 'Unclosed quotation mark.' };
      }
      tokens.push({ type: 'string', value: stripped.slice(i + 1, closeIdx) });
      i = closeIdx + 1;
      continue;
    }
    let j = i;
    while (j < stripped.length && !/\s/.test(stripped[j]) && stripped[j] !== '"') {
      j += 1;
    }
    const word = stripped.slice(i, j);
    const upper = word.toUpperCase();
    if (NUM_RE.test(word)) {
      tokens.push({ type: 'number', value: Number(word), raw: word });
    } else {
      tokens.push({ type: 'word', value: upper, raw: word });
    }
    i = j;
  }
  return { ok: true, tokens };
}

function parseValueRef(token, definedVars, lineNum, rawLine) {
  if (!token) {
    return {
      ok: false,
      error: {
        line: lineNum,
        text: rawLine,
        message: 'Expected a variable name or number.',
        hint: 'Use a number like 10 or a variable defined earlier with SET.',
      },
    };
  }
  if (token.type === 'number') {
    return { ok: true, ref: { kind: 'lit', value: token.value, label: String(token.value) } };
  }
  if (token.type === 'word' && IDENT_RE.test(token.value)) {
    if (!definedVars.has(token.value)) {
      return {
        ok: false,
        error: {
          line: lineNum,
          text: rawLine,
          message: `Variable "${token.value}" has not been defined yet.`,
          hint: `Add "SET ${token.value} TO <number>." above line ${lineNum} first.`,
        },
      };
    }
    return { ok: true, ref: { kind: 'var', name: token.value, label: token.value } };
  }
  return {
    ok: false,
    error: {
      line: lineNum,
      text: rawLine,
      message: `"${token.raw || token.value}" is not a valid number or variable name.`,
      hint: 'Variable names start with a letter and use letters, digits, or hyphens (e.g. NET_PAY).',
    },
  };
}

function formatPyExpr(ref) {
  return ref.kind === 'lit' ? String(ref.value) : ref.name.toLowerCase();
}

/**
 * Compile FLOW-MATIC / COBOL-like statements into:
 *   - symbolTable (variable -> memory address starting at 0x0104)
 *   - instructions (symbolic assembly + 32-bit binary words)
 *   - pythonLines (equivalent modern Python lines)
 */
export function compileCobol(sourceText, options = {}) {
  const injectHandCodeBug = Boolean(options.injectHandCodeBug);
  const rawLines = String(sourceText ?? '').split(/\r?\n/);

  const parsedStatements = [];
  const errors = [];
  const symbolMap = new Map();
  const definedVars = new Set();
  const stringPool = [];
  let nextAddr = 0x0104;

  const ensureSymbol = (name, lineNum) => {
    definedVars.add(name);
    if (!symbolMap.has(name)) {
      symbolMap.set(name, {
        name,
        address: nextAddr,
        hexAddr: formatHex16(nextAddr),
        declaredLine: lineNum,
      });
      nextAddr += 4;
    }
    return symbolMap.get(name);
  };

  const internString = (text) => {
    let idx = stringPool.indexOf(text);
    if (idx === -1) {
      idx = stringPool.length;
      stringPool.push(text);
    }
    return idx;
  };

  for (let idx = 0; idx < rawLines.length; idx += 1) {
    const lineNum = idx + 1;
    const rawLine = rawLines[idx];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('*') || trimmed.startsWith('//')) continue;

    const lexed = tokenizeCobolLine(trimmed);
    if (!lexed.ok) {
      errors.push({
        line: lineNum,
        text: trimmed,
        message: lexed.error,
        hint: 'Close every string with a matching " quotation mark.',
      });
      continue;
    }

    const tokens = lexed.tokens;
    if (!tokens.length) continue;
    const kw = tokens[0].type === 'word' ? tokens[0].value : '';
    const tokenText = tokens.map((t) => (t.type === 'string' ? `"${t.value}"` : String(t.value)));

    if (kw === 'SET') {
      // SET <VAR> TO <NUM>
      if (
        tokens.length !== 4 ||
        tokens[1].type !== 'word' ||
        !IDENT_RE.test(tokens[1].value) ||
        tokens[2].value !== 'TO' ||
        tokens[3].type !== 'number'
      ) {
        errors.push({
          line: lineNum,
          text: trimmed,
          message: 'Invalid SET syntax.',
          hint: 'Use: SET HOURS TO 40.',
        });
        continue;
      }
      const sym = ensureSymbol(tokens[1].value, lineNum);
      parsedStatements.push({
        kind: 'SET',
        line: lineNum,
        sourceText: trimmed,
        tokens: tokenText,
        dest: sym.name,
        value: tokens[3].value,
      });
    } else if (
      (kw === 'ADD' || kw === 'SUBTRACT' || kw === 'MULTIPLY' || kw === 'DIVIDE')
    ) {
      const prepMap = {
        ADD: 'TO',
        SUBTRACT: 'FROM',
        MULTIPLY: 'BY',
        DIVIDE: 'BY',
      };
      const expectedPrep = prepMap[kw];
      if (
        tokens.length !== 6 ||
        tokens[2]?.value !== expectedPrep ||
        tokens[4]?.value !== 'GIVING' ||
        tokens[5]?.type !== 'word' ||
        !IDENT_RE.test(tokens[5].value)
      ) {
        errors.push({
          line: lineNum,
          text: trimmed,
          message: `Invalid ${kw} syntax.`,
          hint: `Use: ${kw} <A> ${expectedPrep} <B> GIVING <RESULT>.`,
        });
        continue;
      }
      const refA = parseValueRef(tokens[1], definedVars, lineNum, trimmed);
      if (!refA.ok) {
        errors.push(refA.error);
        continue;
      }
      const refB = parseValueRef(tokens[3], definedVars, lineNum, trimmed);
      if (!refB.ok) {
        errors.push(refB.error);
        continue;
      }
      const destSym = ensureSymbol(tokens[5].value, lineNum);
      parsedStatements.push({
        kind: kw,
        line: lineNum,
        sourceText: trimmed,
        tokens: tokenText,
        a: refA.ref,
        b: refB.ref,
        dest: destSym.name,
      });
    } else if (kw === 'IF') {
      // IF <A> LESS THAN <B> DISPLAY "<MSG>"
      // IF <A> GREATER THAN <B> DISPLAY "<MSG>"
      // IF <A> EQUALS <B> DISPLAY "<MSG>"
      let comparator = null;
      let bIdx = -1;
      let dispIdx = -1;
      if (tokens[2]?.value === 'LESS' && tokens[3]?.value === 'THAN') {
        comparator = 'LT';
        bIdx = 4;
        dispIdx = 5;
      } else if (tokens[2]?.value === 'GREATER' && tokens[3]?.value === 'THAN') {
        comparator = 'GT';
        bIdx = 4;
        dispIdx = 5;
      } else if (tokens[2]?.value === 'EQUALS') {
        comparator = 'EQ';
        bIdx = 3;
        dispIdx = 4;
      }
      if (
        !comparator ||
        tokens.length !== dispIdx + 2 ||
        tokens[dispIdx]?.value !== 'DISPLAY' ||
        tokens[dispIdx + 1]?.type !== 'string'
      ) {
        errors.push({
          line: lineNum,
          text: trimmed,
          message: 'Invalid IF statement syntax.',
          hint: 'Use: IF STOCK LESS THAN 10 DISPLAY "REORDER". (Supports LESS THAN, GREATER THAN, or EQUALS)',
        });
        continue;
      }
      const refA = parseValueRef(tokens[1], definedVars, lineNum, trimmed);
      if (!refA.ok) {
        errors.push(refA.error);
        continue;
      }
      const refB = parseValueRef(tokens[bIdx], definedVars, lineNum, trimmed);
      if (!refB.ok) {
        errors.push(refB.error);
        continue;
      }
      const msg = tokens[dispIdx + 1].value;
      const strId = internString(msg);
      parsedStatements.push({
        kind: 'IF',
        line: lineNum,
        sourceText: trimmed,
        tokens: tokenText,
        comparator,
        a: refA.ref,
        b: refB.ref,
        message: msg,
        strId,
      });
    } else if (kw === 'DISPLAY') {
      if (tokens.length === 2 && tokens[1].type === 'string') {
        const strId = internString(tokens[1].value);
        parsedStatements.push({
          kind: 'DISPLAY',
          line: lineNum,
          sourceText: trimmed,
          tokens: tokenText,
          label: tokens[1].value,
          strId,
          variable: null,
        });
      } else if (tokens.length === 2 && tokens[1].type === 'word') {
        const ref = parseValueRef(tokens[1], definedVars, lineNum, trimmed);
        if (!ref.ok) {
          errors.push(ref.error);
          continue;
        }
        parsedStatements.push({
          kind: 'DISPLAY',
          line: lineNum,
          sourceText: trimmed,
          tokens: tokenText,
          label: null,
          strId: null,
          variable: ref.ref.name,
        });
      } else if (tokens.length === 3 && tokens[1].type === 'string' && tokens[2].type === 'word') {
        const ref = parseValueRef(tokens[2], definedVars, lineNum, trimmed);
        if (!ref.ok) {
          errors.push(ref.error);
          continue;
        }
        const strId = internString(tokens[1].value);
        parsedStatements.push({
          kind: 'DISPLAY',
          line: lineNum,
          sourceText: trimmed,
          tokens: tokenText,
          label: tokens[1].value,
          strId,
          variable: ref.ref.name,
        });
      } else {
        errors.push({
          line: lineNum,
          text: trimmed,
          message: 'Invalid DISPLAY syntax.',
          hint: 'Use: DISPLAY "NET PAY" NET. or DISPLAY "HELLO".',
        });
      }
    } else {
      errors.push({
        line: lineNum,
        text: trimmed,
        message: `Unrecognized statement "${tokens[0].raw || kw}".`,
        hint: 'Supported verbs: SET, ADD, SUBTRACT, MULTIPLY, DIVIDE, IF ... DISPLAY, DISPLAY.',
      });
    }
  }

  if (!errors.length && !parsedStatements.length) {
    errors.push({
      line: 1,
      text: '',
      message: 'No executable statements found.',
      hint: 'Write at least one statement such as: SET HOURS TO 40.',
    });
  }

  if (errors.length) {
    return {
      ok: false,
      sourceText: String(sourceText ?? ''),
      injectHandCodeBug,
      errors,
      symbolTable: [],
      instructions: [],
      pythonLines: [],
      stringPool: [],
    };
  }

  const symbolTable = [...symbolMap.values()];
  const addrByVar = Object.fromEntries(symbolTable.map((s) => [s.name, s.address]));
  const nameByAddr = Object.fromEntries(symbolTable.map((s) => [s.address, s.name]));

  const instructions = [];
  const pythonLines = [];
  let bugInjected = false;
  let bugSummary = null;

  const pushInsn = ({
    sourceLine,
    sourceText: srcTxt,
    tokens,
    pyLine,
    opcode,
    reg = 1,
    operands,
    comment,
    addr = null,
    imm = null,
    mode = 'none', // 'addr' | 'imm' | 'jump' | 'str'
    cmpMode = null,
    bugCorrupted = false,
    bugNote = null,
  }) => {
    const operand16 =
      mode === 'addr'
        ? addr
        : mode === 'imm'
          ? Math.round(imm)
          : mode === 'jump'
            ? imm
            : mode === 'str'
              ? imm
              : 0;
    const insn = {
      index: instructions.length,
      sourceLine,
      sourceText: srcTxt,
      tokens,
      pyLine,
      opcode,
      reg,
      operands,
      comment,
      addr,
      imm,
      mode,
      cmpMode,
      binary: encodeInsn32(opcode, reg, operand16),
      hex: `0x${toByteBin(OPCODES[opcode]).replace(/^/, '')}`, // kept internal; real hex below
      bugCorrupted,
      bugNote,
    };
    const hexByte = (n) => ((n & 0xff) >>> 0).toString(16).toUpperCase().padStart(2, '0');
    const opHex = hexByte(OPCODES[opcode] ?? 0);
    const regHex = hexByte(reg);
    const hiHex = hexByte((operand16 >> 8) & 0xff);
    const loHex = hexByte(operand16 & 0xff);
    insn.hex = `${opHex} ${regHex} ${hiHex} ${loHex}`;
    instructions.push(insn);
    return insn;
  };

  const loadRef = (ref, regNum, pyLine, stmt) => {
    if (ref.kind === 'var') {
      const addr = addrByVar[ref.name];
      pushInsn({
        sourceLine: stmt.line,
        sourceText: stmt.sourceText,
        tokens: stmt.tokens,
        pyLine,
        opcode: 'LOAD',
        reg: regNum,
        operands: `R${regNum}, [${formatHex16(addr)}]`,
        comment: ref.name,
        addr,
        mode: 'addr',
      });
    } else {
      pushInsn({
        sourceLine: stmt.line,
        sourceText: stmt.sourceText,
        tokens: stmt.tokens,
        pyLine,
        opcode: 'LOADI',
        reg: regNum,
        operands: `R${regNum}, #${ref.value}`,
        comment: `literal ${ref.value}`,
        imm: ref.value,
        mode: 'imm',
      });
    }
  };

  for (const stmt of parsedStatements) {
    if (stmt.kind === 'SET') {
      const pyLine = pythonLines.length;
      pythonLines.push(`${stmt.dest.toLowerCase()} = ${stmt.value}`);
      const addr = addrByVar[stmt.dest];
      pushInsn({
        sourceLine: stmt.line,
        sourceText: stmt.sourceText,
        tokens: stmt.tokens,
        pyLine,
        opcode: 'LOADI',
        reg: 1,
        operands: `R1, #${stmt.value}`,
        comment: `load ${stmt.value}`,
        imm: stmt.value,
        mode: 'imm',
      });
      pushInsn({
        sourceLine: stmt.line,
        sourceText: stmt.sourceText,
        tokens: stmt.tokens,
        pyLine,
        opcode: 'STORE',
        reg: 1,
        operands: `[${formatHex16(addr)}], R1`,
        comment: stmt.dest,
        addr,
        mode: 'addr',
      });
    } else if (
      stmt.kind === 'ADD' ||
      stmt.kind === 'SUBTRACT' ||
      stmt.kind === 'MULTIPLY' ||
      stmt.kind === 'DIVIDE'
    ) {
      const pyLine = pythonLines.length;
      const destVar = stmt.dest.toLowerCase();
      // Note: SUBTRACT A FROM B GIVING DEST => B - A
      const leftRef = stmt.kind === 'SUBTRACT' ? stmt.b : stmt.a;
      const rightRef = stmt.kind === 'SUBTRACT' ? stmt.a : stmt.b;
      const pyOp =
        stmt.kind === 'ADD' ? '+' : stmt.kind === 'SUBTRACT' ? '-' : stmt.kind === 'MULTIPLY' ? '*' : '/';
      const asmOp =
        stmt.kind === 'ADD' ? 'ADD' : stmt.kind === 'SUBTRACT' ? 'SUB' : stmt.kind === 'MULTIPLY' ? 'MUL' : 'DIV';
      pythonLines.push(`${destVar} = ${formatPyExpr(leftRef)} ${pyOp} ${formatPyExpr(rightRef)}`);

      loadRef(leftRef, 1, pyLine, stmt);

      let rightAddr = rightRef.kind === 'var' ? addrByVar[rightRef.name] : null;
      let rightImm = rightRef.kind === 'lit' ? rightRef.value : null;
      let rightMode = rightRef.kind === 'var' ? 'addr' : 'imm';
      let rightOperands =
        rightMode === 'addr' ? `R1, [${formatHex16(rightAddr)}]` : `R1, #${rightImm}`;
      let rightComment = rightRef.kind === 'var' ? rightRef.name : `literal ${rightImm}`;
      let corrupted = false;
      let bugNote = null;

      if (injectHandCodeBug && !bugInjected) {
        bugInjected = true;
        corrupted = true;
        if (rightMode === 'addr') {
          const intendedAddr = rightAddr;
          const wrongAddr = intendedAddr === 0x0104 ? 0x0100 : 0x0104;
          const wrongName = nameByAddr[wrongAddr] || 'UNINIT (0)';
          rightAddr = wrongAddr;
          rightOperands = `R1, [${formatHex16(wrongAddr)}]`;
          rightComment = `BUG! typed ${formatHex16(wrongAddr)} (${wrongName}) instead of ${formatHex16(intendedAddr)} (${rightRef.name})`;
          bugNote = `Hand-coding bug: programmer misread ${formatHex16(intendedAddr)} (${rightRef.name}) and punched ${formatHex16(wrongAddr)} (${wrongName}).`;
        } else {
          const intendedImm = rightImm;
          const wrongAddr = 0x0104;
          const wrongName = nameByAddr[wrongAddr] || '0x0104';
          rightMode = 'addr';
          rightAddr = wrongAddr;
          rightImm = null;
          rightOperands = `R1, [${formatHex16(wrongAddr)}]`;
          rightComment = `BUG! punched address ${formatHex16(wrongAddr)} (${wrongName}) instead of #${intendedImm}`;
          bugNote = `Hand-coding bug: programmer looked up address ${formatHex16(wrongAddr)} instead of literal #${intendedImm}.`;
        }
        bugSummary = bugNote;
      }

      pushInsn({
        sourceLine: stmt.line,
        sourceText: stmt.sourceText,
        tokens: stmt.tokens,
        pyLine,
        opcode: asmOp,
        reg: 1,
        operands: rightOperands,
        comment: rightComment,
        addr: rightAddr,
        imm: rightImm,
        mode: rightMode,
        bugCorrupted: corrupted,
        bugNote,
      });

      const destAddr = addrByVar[stmt.dest];
      pushInsn({
        sourceLine: stmt.line,
        sourceText: stmt.sourceText,
        tokens: stmt.tokens,
        pyLine,
        opcode: 'STORE',
        reg: 1,
        operands: `[${formatHex16(destAddr)}], R1`,
        comment: stmt.dest,
        addr: destAddr,
        mode: 'addr',
      });
    } else if (stmt.kind === 'IF') {
      const pyLine = pythonLines.length;
      const pyCmp = stmt.comparator === 'LT' ? '<' : stmt.comparator === 'GT' ? '>' : '==';
      pythonLines.push(`if ${formatPyExpr(stmt.a)} ${pyCmp} ${formatPyExpr(stmt.b)}:`);
      pythonLines.push(`    print(${JSON.stringify(stmt.message)})`);

      loadRef(stmt.a, 1, pyLine, stmt);
      if (stmt.b.kind === 'var') {
        const bAddr = addrByVar[stmt.b.name];
        pushInsn({
          sourceLine: stmt.line,
          sourceText: stmt.sourceText,
          tokens: stmt.tokens,
          pyLine,
          opcode: 'CMP',
          reg: 1,
          operands: `R1, [${formatHex16(bAddr)}]`,
          comment: `${stmt.comparator} ${stmt.b.name}`,
          addr: bAddr,
          mode: 'addr',
          cmpMode: stmt.comparator,
        });
      } else {
        pushInsn({
          sourceLine: stmt.line,
          sourceText: stmt.sourceText,
          tokens: stmt.tokens,
          pyLine,
          opcode: 'CMP',
          reg: 1,
          operands: `R1, #${stmt.b.value}`,
          comment: `${stmt.comparator} #${stmt.b.value}`,
          imm: stmt.b.value,
          mode: 'imm',
          cmpMode: stmt.comparator,
        });
      }
      const skipTarget = instructions.length + 2;
      pushInsn({
        sourceLine: stmt.line,
        sourceText: stmt.sourceText,
        tokens: stmt.tokens,
        pyLine,
        opcode: 'BR_FALSE',
        reg: 0,
        operands: `@INSN_${skipTarget}`,
        comment: 'skip if false',
        imm: skipTarget,
        mode: 'jump',
      });
      pushInsn({
        sourceLine: stmt.line,
        sourceText: stmt.sourceText,
        tokens: stmt.tokens,
        pyLine: pyLine + 1,
        opcode: 'PRINT_STR',
        reg: 0,
        operands: `STR[${stmt.strId}]`,
        comment: JSON.stringify(stmt.message),
        imm: stmt.strId,
        mode: 'str',
      });
    } else if (stmt.kind === 'DISPLAY') {
      const pyLine = pythonLines.length;
      if (stmt.label !== null && stmt.variable) {
        pythonLines.push(`print(${JSON.stringify(stmt.label)}, "=", ${stmt.variable.toLowerCase()})`);
        const addr = addrByVar[stmt.variable];
        pushInsn({
          sourceLine: stmt.line,
          sourceText: stmt.sourceText,
          tokens: stmt.tokens,
          pyLine,
          opcode: 'PRINT_VAL',
          reg: 1,
          operands: `STR[${stmt.strId}], [${formatHex16(addr)}]`,
          comment: `"${stmt.label}" + ${stmt.variable}`,
          addr,
          imm: stmt.strId,
          mode: 'addr',
        });
      } else if (stmt.label !== null) {
        pythonLines.push(`print(${JSON.stringify(stmt.label)})`);
        pushInsn({
          sourceLine: stmt.line,
          sourceText: stmt.sourceText,
          tokens: stmt.tokens,
          pyLine,
          opcode: 'PRINT_STR',
          reg: 0,
          operands: `STR[${stmt.strId}]`,
          comment: JSON.stringify(stmt.label),
          imm: stmt.strId,
          mode: 'str',
        });
      } else {
        pythonLines.push(`print(${stmt.variable.toLowerCase()})`);
        const addr = addrByVar[stmt.variable];
        pushInsn({
          sourceLine: stmt.line,
          sourceText: stmt.sourceText,
          tokens: stmt.tokens,
          pyLine,
          opcode: 'PRINT_VAL',
          reg: 1,
          operands: `[${formatHex16(addr)}]`,
          comment: stmt.variable,
          addr,
          mode: 'addr',
        });
      }
    }
  }

  return {
    ok: true,
    sourceText: String(sourceText ?? ''),
    injectHandCodeBug,
    bugSummary,
    errors: [],
    statements: parsedStatements,
    symbolTable,
    stringPool,
    instructions,
    pythonLines,
  };
}

/**
 * Step-by-step execution of a compiled COBOL/FLOW-MATIC program.
 * Emits 3 compiler-pipeline steps followed by each executed CPU instruction.
 */
export function executeCompiledProgram(compiled) {
  if (!compiled || !compiled.ok) {
    return { ok: false, steps: [], output: [], runtimeError: 'Cannot execute program with compile errors.' };
  }

  const memory = {};
  compiled.symbolTable.forEach((sym) => {
    memory[sym.hexAddr] = { name: sym.name, value: 0 };
  });

  const regs = { R1: 0, R2: 0, PC: 0, FLAGS: '—' };
  const output = [];
  const steps = [];

  const snapMem = () =>
    Object.fromEntries(
      Object.entries(memory).map(([addr, entry]) => [addr, { ...entry }]),
    );

  // Stage 1: Lex Tokens
  const firstStmt = compiled.statements[0];
  steps.push({
    stepIndex: steps.length,
    stage: 'compile-lex',
    phase: 'Compiler · 1. Lexer',
    detail: `Lexer scans ${compiled.statements.length} English-like statement(s) into keywords, numbers, and variable identifiers (first line: ${firstStmt.tokens.join(' · ')}).`,
    sourceLine: firstStmt.line,
    pyLine: 0,
    insnIndex: -1,
    regs: { ...regs },
    memory: snapMem(),
    readAddr: null,
    writeAddr: null,
    output: [],
    bugActive: false,
    runtimeError: null,
  });

  // Stage 2: Symbol Table
  const symPreview = compiled.symbolTable
    .slice(0, 4)
    .map((s) => `${s.name}→${s.hexAddr}`)
    .join(', ');
  steps.push({
    stepIndex: steps.length,
    stage: 'compile-sym',
    phase: 'Compiler · 2. Symbol Table',
    detail: `Compiler assigns ${compiled.symbolTable.length} memory address(es) automatically (${symPreview}) — programmers never track hex addresses by hand.`,
    sourceLine: firstStmt.line,
    pyLine: 0,
    insnIndex: -1,
    regs: { ...regs },
    memory: snapMem(),
    readAddr: null,
    writeAddr: null,
    output: [],
    bugActive: false,
    runtimeError: null,
  });

  // Stage 3: Code Generation
  steps.push({
    stepIndex: steps.length,
    stage: 'compile-gen',
    phase: compiled.injectHandCodeBug ? 'Compiler · 3. Code Gen (Manual Bug!)' : 'Compiler · 3. Code Gen',
    detail: compiled.injectHandCodeBug && compiled.bugSummary
      ? `Emitted ${compiled.instructions.length} machine instructions, with a simulated manual hand-coding address typo: ${compiled.bugSummary}`
      : `Code generator emits ${compiled.instructions.length} symbolic assembly & 32-bit binary machine instructions ready for the CPU.`,
    sourceLine: firstStmt.line,
    pyLine: 0,
    insnIndex: 0,
    regs: { ...regs },
    memory: snapMem(),
    readAddr: null,
    writeAddr: null,
    output: [],
    bugActive: Boolean(compiled.injectHandCodeBug && compiled.bugSummary),
    runtimeError: null,
  });

  let pc = 0;
  let guard = 0;
  const maxCycles = 512;
  let runtimeError = null;

  while (pc < compiled.instructions.length && guard < maxCycles) {
    guard += 1;
    const insn = compiled.instructions[pc];
    regs.PC = pc;

    let readAddr = null;
    let writeAddr = null;
    let detail = '';
    let nextPc = pc + 1;

    const readMemVal = (addr) => {
      const hex = formatHex16(addr);
      return memory[hex]?.value ?? 0;
    };

    if (insn.opcode === 'LOADI') {
      regs.R1 = insn.imm;
      detail = `CPU loads literal #${formatNumDisplay(insn.imm)} into R1.`;
    } else if (insn.opcode === 'LOAD') {
      const hex = formatHex16(insn.addr);
      const val = readMemVal(insn.addr);
      readAddr = hex;
      regs.R1 = val;
      detail = `CPU reads [${hex}] (${memory[hex]?.name || 'mem'} = ${formatNumDisplay(val)}) into R1.`;
    } else if (insn.opcode === 'STORE') {
      const hex = formatHex16(insn.addr);
      writeAddr = hex;
      if (!memory[hex]) memory[hex] = { name: insn.comment, value: 0 };
      memory[hex].value = regs.R1;
      detail = `CPU stores R1 (${formatNumDisplay(regs.R1)}) into [${hex}] (${memory[hex].name}).`;
    } else if (
      insn.opcode === 'ADD' ||
      insn.opcode === 'SUB' ||
      insn.opcode === 'MUL' ||
      insn.opcode === 'DIV'
    ) {
      let rhs;
      if (insn.mode === 'addr') {
        const hex = formatHex16(insn.addr);
        readAddr = hex;
        rhs = readMemVal(insn.addr);
      } else {
        rhs = insn.imm;
      }
      const lhs = regs.R1;
      regs.R2 = rhs;
      if (insn.opcode === 'DIV' && rhs === 0) {
        runtimeError = `Division by zero at instruction #${insn.index} (${insn.sourceText}).`;
        steps.push({
          stepIndex: steps.length,
          stage: 'execute',
          phase: 'CPU Halt · Division by Zero',
          detail: runtimeError,
          sourceLine: insn.sourceLine,
          pyLine: insn.pyLine,
          insnIndex: insn.index,
          regs: { ...regs },
          memory: snapMem(),
          readAddr,
          writeAddr: null,
          output: [...output],
          bugActive: true,
          runtimeError,
        });
        break;
      }
      let result = lhs;
      if (insn.opcode === 'ADD') result = lhs + rhs;
      else if (insn.opcode === 'SUB') result = lhs - rhs;
      else if (insn.opcode === 'MUL') result = lhs * rhs;
      else if (insn.opcode === 'DIV') result = Math.round((lhs / rhs) * 10000) / 10000;
      regs.R1 = result;
      detail = insn.bugCorrupted
        ? `Hand-coding bug executed! ALU ran ${formatNumDisplay(lhs)} ${insn.opcode} ${formatNumDisplay(rhs)} (from ${readAddr}) → ${formatNumDisplay(result)}.`
        : `ALU computes ${formatNumDisplay(lhs)} ${insn.opcode} ${formatNumDisplay(rhs)} → R1 = ${formatNumDisplay(result)}.`;
    } else if (insn.opcode === 'CMP') {
      let rhs;
      if (insn.mode === 'addr') {
        const hex = formatHex16(insn.addr);
        readAddr = hex;
        rhs = readMemVal(insn.addr);
      } else {
        rhs = insn.imm;
      }
      regs.R2 = rhs;
      const lhs = regs.R1;
      let passed = false;
      if (insn.cmpMode === 'LT') passed = lhs < rhs;
      else if (insn.cmpMode === 'GT') passed = lhs > rhs;
      else if (insn.cmpMode === 'EQ') passed = lhs === rhs;
      regs.FLAGS = passed ? 'TRUE' : 'FALSE';
      detail = `Comparator checks ${formatNumDisplay(lhs)} ${insn.cmpMode} ${formatNumDisplay(rhs)} → FLAGS = ${regs.FLAGS}.`;
    } else if (insn.opcode === 'BR_FALSE') {
      if (regs.FLAGS === 'FALSE') {
        nextPc = insn.imm;
        detail = `FLAGS is FALSE — branch skips DISPLAY and jumps to instruction #${nextPc}.`;
      } else {
        detail = 'FLAGS is TRUE — fall through to execute DISPLAY.';
      }
    } else if (insn.opcode === 'PRINT_STR') {
      const msg = compiled.stringPool[insn.imm] ?? '';
      output.push(msg);
      detail = `Teletype prints "${msg}".`;
    } else if (insn.opcode === 'PRINT_VAL') {
      const hex = formatHex16(insn.addr);
      readAddr = hex;
      const val = readMemVal(insn.addr);
      const label = insn.imm !== null ? compiled.stringPool[insn.imm] : null;
      const lineOut = label ? `${label} = ${formatNumDisplay(val)}` : formatNumDisplay(val);
      output.push(lineOut);
      detail = `Teletype reads [${hex}] and prints "${lineOut}".`;
    }

    steps.push({
      stepIndex: steps.length,
      stage: 'execute',
      phase: insn.bugCorrupted
        ? `CPU · Insn #${insn.index} (${insn.opcode} BUG)`
        : `CPU · Insn #${insn.index} (${insn.opcode})`,
      detail,
      sourceLine: insn.sourceLine,
      pyLine: insn.pyLine,
      insnIndex: insn.index,
      regs: { ...regs },
      memory: snapMem(),
      readAddr,
      writeAddr,
      output: [...output],
      bugActive: Boolean(insn.bugCorrupted),
      runtimeError: null,
    });

    pc = nextPc;
  }

  return {
    ok: !runtimeError,
    steps,
    output,
    runtimeError,
  };
}

/* ============================================================================
   2. NANOSECOND & SIGNAL LATENCY PHYSICS MODEL
   ============================================================================ */

export const SPEED_OF_LIGHT_M_S = 299792458;

export const SIGNAL_MEDIA = {
  vacuum: {
    id: 'vacuum',
    label: 'Vacuum / Space (1.00c)',
    shortLabel: 'Vacuum (1.00c)',
    factor: 1.0,
    note: 'Speed of light in free space: 29.98 cm per nanosecond.',
  },
  copper: {
    id: 'copper',
    label: 'Copper Wire (0.67c)',
    shortLabel: 'Copper (0.67c)',
    factor: 0.67,
    note: 'Typical insulated copper wire propagates pulses at ~2/3 c (~20.1 cm/ns).',
  },
  fiber: {
    id: 'fiber',
    label: 'Fiber Optic Glass (0.67c)',
    shortLabel: 'Fiber (0.67c)',
    factor: 0.67,
    note: 'Refractive index of glass (~1.49) slows light to ~20.1 cm/ns.',
  },
  pcb: {
    id: 'pcb',
    label: 'Silicon / PCB Trace (0.50c)',
    shortLabel: 'PCB / Silicon (0.50c)',
    factor: 0.5,
    note: 'High-dielectric FR-4 boards and chip metal layers slow signals to ~15 cm/ns.',
  },
};

export const WIRE_PRESET_ORDER = ['ns-1', 'ghz-3', 'univac', 'us-1', 'ms-1', 'sec-1'];

export const WIRE_PRESETS = {
  'ns-1': {
    id: 'ns-1',
    label: '1 ns · Hopper’s Wire (1 GHz)',
    timeNs: 1,
    mediumId: 'vacuum',
    wireLengthCm: 29.9,
  },
  'ghz-3': {
    id: 'ghz-3',
    label: '3 GHz CPU Tick (0.333 ns)',
    timeNs: 1 / 3,
    mediumId: 'pcb',
    wireLengthCm: 15,
  },
  univac: {
    id: 'univac',
    label: 'UNIVAC I Clock (444.4 ns)',
    timeNs: 1000 / 2.25,
    mediumId: 'copper',
    wireLengthCm: 500,
  },
  'us-1': {
    id: 'us-1',
    label: '1 µs · 984-ft Wire Coil',
    timeNs: 1000,
    mediumId: 'vacuum',
    wireLengthCm: 30000,
  },
  'ms-1': {
    id: 'ms-1',
    label: '1 ms · 186 Miles',
    timeNs: 1e6,
    mediumId: 'fiber',
    wireLengthCm: 20000000,
  },
  'sec-1': {
    id: 'sec-1',
    label: '1 Second · 7.5× Earth',
    timeNs: 1e9,
    mediumId: 'vacuum',
    wireLengthCm: 30000000000,
  },
};

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '—';
  const abs = Math.abs(meters);
  if (abs < 0.01) return `${(meters * 1000).toFixed(2)} mm`;
  if (abs < 1) return `${(meters * 100).toFixed(2)} cm (${(meters * 39.3700787).toFixed(2)} in)`;
  if (abs < 1000) return `${meters.toFixed(2)} m (${(meters * 3.28084).toFixed(1)} ft)`;
  const km = meters / 1000;
  const mi = meters / 1609.344;
  return `${km >= 100 ? Math.round(km).toLocaleString('en-US') : km.toFixed(2)} km (${mi >= 100 ? Math.round(mi).toLocaleString('en-US') : mi.toFixed(2)} mi)`;
}

export function formatDurationNs(timeNs) {
  if (!Number.isFinite(timeNs) || timeNs <= 0) return '—';
  if (timeNs < 1) return `${timeNs.toFixed(3)} ns`;
  if (timeNs < 1000) return `${Number(timeNs.toFixed(2))} ns`;
  if (timeNs < 1e6) return `${Number((timeNs / 1e3).toFixed(2))} µs`;
  if (timeNs < 1e9) return `${Number((timeNs / 1e6).toFixed(2))} ms`;
  return `${Number((timeNs / 1e9).toFixed(2))} s`;
}

export function formatFrequency(hz) {
  if (!Number.isFinite(hz) || hz <= 0) return '—';
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(2)} GHz`;
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)} MHz`;
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(2)} kHz`;
  return `${hz.toFixed(2)} Hz`;
}

export function computeSignalPhysics({
  timeNs = 1,
  mediumId = 'copper',
  wireLengthCm = 30,
} = {}) {
  const safeTimeNs = Math.max(0.05, Number(timeNs) || 1);
  const medium = SIGNAL_MEDIA[mediumId] || SIGNAL_MEDIA.copper;
  const safeWireCm = Math.max(0.5, Number(wireLengthCm) || 30);

  const timeSec = safeTimeNs * 1e-9;
  const vacuumMeters = SPEED_OF_LIGHT_M_S * timeSec;
  const vacuumCm = vacuumMeters * 100;
  const vacuumInches = vacuumCm / 2.54;

  const mediumSpeedMps = SPEED_OF_LIGHT_M_S * medium.factor;
  const mediumMeters = mediumSpeedMps * timeSec;
  const mediumCm = mediumMeters * 100;
  const mediumInches = mediumCm / 2.54;

  const wireMeters = safeWireCm / 100;
  const requiredTimeNs = (wireMeters / mediumSpeedMps) * 1e9;
  const arrivesInTick = requiredTimeNs <= safeTimeNs + 1e-9;
  const fractionReached = Math.min(1, mediumCm / safeWireCm);
  const frequencyHz = 1 / timeSec;

  let analogy = '';
  if (mediumCm < 2) {
    analogy = 'Shorter than a postage stamp — why modern gigahertz CPUs pack billions of transistors millimeters apart.';
  } else if (mediumCm < 45) {
    analogy = 'Comparable to Hopper’s famous 11.8-inch piece of wire — the length of a sheet of paper.';
  } else if (mediumCm < 50000) {
    analogy = 'Hopper carried a 984-foot coil for a microsecond and joked about hanging it around careless programmers’ necks.';
  } else if (mediumMeters < 500000) {
    analogy = 'Across cities and states — why cross-country internet ping takes tens of milliseconds.';
  } else {
    analogy = '7.5 times around Earth per second — even light feels slow at planetary scale.';
  }

  return {
    timeNs: safeTimeNs,
    durationLabel: formatDurationNs(safeTimeNs),
    frequencyHz,
    frequencyLabel: formatFrequency(frequencyHz),
    medium,
    wireLengthCm: safeWireCm,
    vacuumMeters,
    vacuumCm,
    vacuumInches,
    mediumMeters,
    mediumCm,
    mediumInches,
    requiredTimeNs,
    arrivesInTick,
    fractionReached,
    analogy,
  };
}

/* ============================================================================
   3. 1947 HARVARD MARK II RELAY PANEL F DEBUGGER
   ============================================================================ */

export const MARK_II_CASE_ORDER = ['relay-70-moth', 'stuck-carry', 'swapped-wire', 'clock-skew'];

export const MARK_II_CASES = {
  'relay-70-moth': {
    id: 'relay-70-moth',
    title: 'Case 1 · Relay #70, Panel F (Sept 9, 1947)',
    shortTitle: 'Case 1 · Relay #70 (Moth)',
    defaultInput: 13, // 1101 -> bit 2 (R70, weight 4) should be ON!
    faultRelay: 'R70',
    faultType: 'moth',
    symptom: 'Bit 2 (weight 4) stays 0 whenever input bit 2 is 1.',
    logbookEntry:
      '1545 · Relay #70 Panel F (moth) in relay. First actual case of bug being found.',
    inspectionNote:
      'A moth is wedged between the silver contacts of Relay #70! Even though the electromagnet coil energizes, the mechanical armature cannot close the circuit.',
    repairAction: 'Remove moth with tweezers & tape into 1947 Mark II logbook',
  },
  'stuck-carry': {
    id: 'stuck-carry',
    title: 'Case 2 · Welded Contact (Relay #71)',
    shortTitle: 'Case 2 · Relay #71 (Fused)',
    defaultInput: 5, // 0101 -> bit 3 (R71, weight 8) should be OFF, stuck ON!
    faultRelay: 'R71',
    faultType: 'stuck-closed',
    symptom: 'Bit 3 (weight 8) reads 1 even when the input switch is 0.',
    logbookEntry:
      '1612 · Relay #71 Panel F contacts fused closed after arcing. Burnished contacts.',
    inspectionNote:
      'Electrical arcing welded Relay #71’s contacts shut. Current leaks continuously to the output bus even with no coil voltage.',
    repairAction: 'Burnish welded contacts & verify open state',
  },
  'swapped-wire': {
    id: 'swapped-wire',
    title: 'Case 3 · Crossed Patch Wire (Relay #68)',
    shortTitle: 'Case 3 · Relay #68 (Wired)',
    defaultInput: 6, // 0110 -> bit 0 (R68=0) vs bit 1 (R69=1)
    faultRelay: 'R68',
    faultType: 'swapped-wire',
    symptom: 'Bit 0 mirrors Bit 1 instead of its own switch input.',
    logbookEntry:
      '1704 · Relay #68 Panel F jumper patched to Bit 1 lug in error. Re-soldered.',
    inspectionNote:
      'A technician accidentally soldered Relay #68’s sense wire onto adjacent Relay #69’s terminal lug.',
    repairAction: 'Move jumper wire back to Bit 0 lug',
  },
  'clock-skew': {
    id: 'clock-skew',
    title: 'Case 4 · Long-Wire Timing Skew (Relay #72)',
    shortTitle: 'Case 4 · Relay #72 (Timing)',
    defaultInput: 15,
    faultRelay: 'R72',
    faultType: 'timing-skew',
    symptom: 'Panel F clock strobe drops out during high-speed runs.',
    logbookEntry:
      '1738 · Relay #72 strobe cable exceeded delay budget. Shortened harness.',
    inspectionNote:
      'Relay #72’s strobe wire ran an extra loop around the rack, arriving too late for the 100 Hz Mark II timing pulse — cutting off the output latch.',
    repairAction: 'Shorten strobe lead to meet clock window',
  },
};

const MARK_II_RELAYS = [
  { id: 'R67', label: 'Power', bitIndex: null, bitWeight: null, role: '24V Bus' },
  { id: 'R68', label: 'Bit 0 (×1)', bitIndex: 0, bitWeight: 1, role: 'Data Bit 0' },
  { id: 'R69', label: 'Bit 1 (×2)', bitIndex: 1, bitWeight: 2, role: 'Data Bit 1' },
  { id: 'R70', label: 'Bit 2 (×4)', bitIndex: 2, bitWeight: 4, role: 'Data Bit 2' },
  { id: 'R71', label: 'Bit 3 (×8)', bitIndex: 3, bitWeight: 8, role: 'Data Bit 3' },
  { id: 'R72', label: 'Strobe', bitIndex: null, bitWeight: null, role: 'Clock Latch' },
];

export function simulateMarkIIRelays(caseId = 'relay-70-moth', inputValue = 13, repaired = false) {
  const c = MARK_II_CASES[caseId] || MARK_II_CASES['relay-70-moth'];
  const clamped = Math.max(0, Math.min(15, Math.trunc(Number(inputValue) || 0)));
  const bitOf = (idx) => (clamped >> idx) & 1;

  const strobeBroken = !repaired && c.faultType === 'timing-skew';

  const relays = MARK_II_RELAYS.map((spec) => {
    if (spec.id === 'R67') {
      return {
        ...spec,
        inputHigh: true,
        coilEnergized: true,
        contactClosed: true,
        expectedOut: 1,
        actualOut: 1,
        isFaulty: false,
        faultSummary: 'Nominal 24V supply',
      };
    }

    if (spec.id === 'R72') {
      const faulty = !repaired && c.faultRelay === 'R72';
      return {
        ...spec,
        inputHigh: true,
        coilEnergized: true,
        contactClosed: !faulty,
        expectedOut: 1,
        actualOut: faulty ? 0 : 1,
        isFaulty: faulty,
        faultSummary: faulty ? 'Strobe signal arrived late — latch open' : 'Clock strobe synchronized',
      };
    }

    const expected = bitOf(spec.bitIndex);
    let coilEnergized = expected === 1;
    let contactClosed = coilEnergized;
    let actualOut = contactClosed ? 1 : 0;
    let isFaulty = false;
    let faultSummary = 'Contacts healthy';

    if (!repaired && c.faultRelay === spec.id) {
      if (c.faultType === 'moth') {
        isFaulty = true;
        contactClosed = false;
        actualOut = 0;
        faultSummary = 'Moth trapped between contacts — stuck OPEN';
      } else if (c.faultType === 'stuck-closed') {
        isFaulty = true;
        contactClosed = true;
        actualOut = 1;
        faultSummary = 'Contacts welded shut — stuck CLOSED';
      } else if (c.faultType === 'swapped-wire') {
        isFaulty = true;
        const bit1 = bitOf(1);
        coilEnergized = bit1 === 1;
        contactClosed = coilEnergized;
        actualOut = contactClosed ? 1 : 0;
        faultSummary = 'Sensing Bit 1 lug instead of Bit 0';
      }
    }

    if (strobeBroken) {
      actualOut = 0;
    }

    return {
      ...spec,
      inputHigh: expected === 1,
      coilEnergized,
      contactClosed,
      expectedOut: expected,
      actualOut,
      isFaulty,
      faultSummary,
    };
  });

  let actualValue = 0;
  relays.forEach((r) => {
    if (r.bitWeight && r.actualOut) {
      actualValue += r.bitWeight;
    }
  });

  const expectedBinary = clamped.toString(2).padStart(4, '0');
  const actualBinary = actualValue.toString(2).padStart(4, '0');
  const allMatch = actualValue === clamped && !strobeBroken;

  return {
    caseInfo: c,
    repaired: Boolean(repaired),
    inputValue: clamped,
    expectedValue: clamped,
    actualValue,
    expectedBinary,
    actualBinary,
    allMatch,
    relays,
    logbookEntry: repaired ? c.logbookEntry : null,
  };
}

/* ============================================================================
   4. UNSPOILED HAND-TRACE EXERCISES & CHECKER
   ============================================================================ */

export const TRACE_EXERCISES = {
  'cobol-trace': {
    id: 'cobol-trace',
    title: 'COBOL Compiler Execution Trace',
    given: ['Memory starts clear (0)', 'Addresses assigned automatically by compiler'],
    rows: [
      {
        id: 'c1',
        step: 'Line 1',
        op: 'SET HOURS TO 12.',
        dest: 'HOURS [0x0104]',
        answer: 12,
        hint: 'SET loads the literal 12 into HOURS at 0x0104.',
      },
      {
        id: 'c2',
        step: 'Line 2',
        op: 'SET RATE TO 15.',
        dest: 'RATE [0x0108]',
        answer: 15,
        hint: 'SET loads the literal 15 into RATE at 0x0108.',
      },
      {
        id: 'c3',
        step: 'Line 3',
        op: 'MULTIPLY HOURS BY RATE GIVING PAY.',
        dest: 'PAY [0x010C]',
        answer: 180,
        hint: 'Multiply HOURS (12) × RATE (15) = 180.',
      },
      {
        id: 'c4',
        step: 'Line 4',
        op: 'SUBTRACT 20 FROM PAY GIVING NET.',
        dest: 'NET [0x0110]',
        answer: 160,
        hint: 'Note the English word order: SUBTRACT 20 FROM PAY means PAY (180) − 20 = 160.',
      },
    ],
  },
  'nanosecond-trace': {
    id: 'nanosecond-trace',
    title: 'Nanosecond Signal Distance Trace (c ≈ 30 cm/ns)',
    given: ['c ≈ 30 cm per nanosecond (0.3 m/ns)', '1 meter = 100 cm'],
    rows: [
      {
        id: 'n1',
        step: '1 ns',
        op: '1.0 ns × 30 cm/ns',
        dest: 'Distance (cm)',
        answer: 30,
        hint: '1 × 30 = 30 cm (more precisely 29.98 cm, or 11.8 inches).',
      },
      {
        id: 'n2',
        step: '2 GHz tick',
        op: '0.5 ns × 30 cm/ns',
        dest: 'Distance (cm)',
        answer: 15,
        hint: 'A 2 GHz clock tick lasts 0.5 ns: 0.5 × 30 = 15 cm.',
      },
      {
        id: 'n3',
        step: '10 ns',
        op: '10 ns × 0.3 m/ns',
        dest: 'Distance (m)',
        answer: 3,
        hint: '10 × 0.3 m = 3 meters.',
      },
      {
        id: 'n4',
        step: '1 µs coil',
        op: '1000 ns × 0.3 m/ns',
        dest: 'Distance (m)',
        answer: 300,
        hint: '1 microsecond = 1,000 nanoseconds → 300 meters (984 feet — Hopper’s wire coil!).',
      },
    ],
  },
};

export function parseTraceInput(raw) {
  if (raw == null) return null;
  const cleaned = String(raw)
    .trim()
    .replace(/−/g, '-')
    .replace(/,/g, '')
    .replace(/(?:cm|m|in|ft|hours?|hrs?)$/i, '')
    .trim();
  if (!cleaned || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const val = Number(cleaned);
  return Number.isFinite(val) ? val : null;
}

export function checkTraceSubmission(exerciseId, submittedValues) {
  const exercise = TRACE_EXERCISES[exerciseId];
  if (!exercise) throw new Error(`Unknown trace exercise: ${exerciseId}`);

  const results = exercise.rows.map((row, idx) => {
    const parsed = parseTraceInput(submittedValues?.[idx]);
    const tol = Math.max(0.05, Math.abs(row.answer) * 0.01);
    const ok = parsed !== null && Math.abs(parsed - row.answer) <= tol;
    return {
      id: row.id,
      step: row.step,
      op: row.op,
      dest: row.dest,
      expected: String(row.answer),
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

/* ============================================================================
   5. STUDIO MASTERY CHALLENGES
   ============================================================================ */

export const CHALLENGES = [
  {
    id: 'compile-run',
    title: 'Compile & Run English Code',
    description: 'Compile a COBOL program in Tab 1 and step or play it through to the teletype output.',
    tab: 'compiler',
  },
  {
    id: 'edit-cobol',
    title: 'Author Your Own Source Code',
    description: 'Edit any number or add a statement in the COBOL editor and click Compile & Run.',
    tab: 'compiler',
  },
  {
    id: 'catch-handcode-bug',
    title: 'Catch a Hand-Coding Bug',
    description: 'Toggle Hand-Code Bug ON in Tab 1 to see how a single hex address typo corrupts output.',
    tab: 'compiler',
  },
  {
    id: 'break-light-barrier',
    title: 'Break the Speed-of-Light Limit',
    description: 'In Tab 2, trigger a TIMING VIOLATION where a wire or trace is too long for one clock tick.',
    tab: 'wire',
  },
  {
    id: 'debug-relay-70',
    title: 'Debug Relay #70, Panel F',
    description: 'In Tab 3, inspect Relay #70 on Case 1 to find the trapped moth, then repair & log it.',
    tab: 'bug',
  },
];

export function evaluateChallenges(progress = {}) {
  return CHALLENGES.map((challenge) => ({
    ...challenge,
    completed: Boolean(progress[challenge.id]),
  }));
}
