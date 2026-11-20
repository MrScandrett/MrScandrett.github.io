/**
 * Pure Finite State Machine engine, analyzer, code generator, Moore/Mealy
 * comparator, and challenge evaluator. Zero DOM dependencies.
 */

export const STATE_PALETTE = [
  '#22c55e',
  '#38bdf8',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
];

export const PRESET_ORDER = [
  'traffic',
  'vacuum',
  'vending',
  'lock',
  'enemy',
  'binary-dfa',
];

const RAW_PRESETS = {
  traffic: {
    id: 'traffic',
    title: 'Traffic Light',
    subtitle: '3-state cyclic controller',
    category: 'Hardware & Control',
    kind: 'moore',
    start: 'RED',
    auto: true,
    autoEvent: 'timer',
    autoDelayMs: 1600,
    description:
      'A traffic intersection cycles through RED, GREEN, and YELLOW on timer ticks, with an emergency override back to RED.',
    prompt: 'Predict the next color before firing timer or emergency override.',
    quickSequence: {
      label: 'Full cycle',
      events: ['timer', 'timer', 'timer'],
    },
    states: [
      { id: 'RED', label: 'RED', color: '#ef4444', output: 'STOP', accepting: false, x: 0.5, y: 0.2 },
      { id: 'GREEN', label: 'GREEN', color: '#22c55e', output: 'GO', accepting: false, x: 0.78, y: 0.74 },
      { id: 'YELLOW', label: 'YELLOW', color: '#eab308', output: 'SLOW', accepting: false, x: 0.22, y: 0.74 },
    ],
    events: [
      { id: 'timer', label: 'Timer Tick', icon: '⏱', keyHint: '1' },
      { id: 'emergency', label: 'Emergency', icon: '🚨', keyHint: '2' },
    ],
    transitions: [
      { from: 'RED', event: 'timer', to: 'GREEN', output: 'Cross traffic halted → GO' },
      { from: 'GREEN', event: 'timer', to: 'YELLOW', output: 'Amber caution → SLOW' },
      { from: 'YELLOW', event: 'timer', to: 'RED', output: 'Stop line active → RED' },
      { from: 'GREEN', event: 'emergency', to: 'RED', output: 'Override halt → STOP' },
      { from: 'YELLOW', event: 'emergency', to: 'RED', output: 'Override halt → STOP' },
      { from: 'RED', event: 'emergency', to: 'RED', output: 'Hold RED' },
    ],
  },

  vacuum: {
    id: 'vacuum',
    title: 'Robot Vacuum',
    subtitle: 'Autonomous cleaner with missing edge case',
    category: 'Robotics',
    kind: 'moore',
    start: 'Clean',
    auto: false,
    description:
      'Classroom model of an autonomous floor cleaner: Clean → Avoid → Clean, plus a low-battery return route to Dock and Charge.',
    prompt: 'Try Obstacle Sensed before and after Battery Low. What happens if an obstacle hits while Docking?',
    quickSequence: {
      label: 'Obstacle → Low battery → Dock',
      events: ['obstacle', 'lowBattery', 'docked'],
    },
    states: [
      { id: 'Clean', label: 'Clean', color: '#22c55e', output: 'Suction ON', accepting: false, x: 0.24, y: 0.26 },
      { id: 'Avoid', label: 'Avoid', color: '#f97316', output: 'Reverse & Turn', accepting: false, x: 0.76, y: 0.26 },
      { id: 'Dock', label: 'Dock', color: '#38bdf8', output: 'Seek Charger', accepting: false, x: 0.76, y: 0.76 },
      { id: 'Charge', label: 'Charge', color: '#8b5cf6', output: 'Charging', accepting: true, x: 0.24, y: 0.76 },
    ],
    events: [
      { id: 'obstacle', label: 'Obstacle', icon: '🧱', keyHint: '1' },
      { id: 'clear', label: 'Path Clear', icon: '↪', keyHint: '2' },
      { id: 'lowBattery', label: 'Battery Low', icon: '🔋', keyHint: '3' },
      { id: 'docked', label: 'Dock Reached', icon: '⌂', keyHint: '4' },
      { id: 'charged', label: 'Charged', icon: '✓', keyHint: '5' },
    ],
    transitions: [
      { from: 'Clean', event: 'obstacle', to: 'Avoid', output: 'Bumper pressed → back up' },
      { from: 'Clean', event: 'lowBattery', to: 'Dock', output: 'Drop brushes → seek dock' },
      { from: 'Avoid', event: 'clear', to: 'Clean', output: 'Resume cleaning' },
      { from: 'Avoid', event: 'lowBattery', to: 'Dock', output: 'Abort avoid → seek dock' },
      { from: 'Dock', event: 'docked', to: 'Charge', output: 'Engage charger pins' },
      { from: 'Charge', event: 'charged', to: 'Clean', output: 'Undock & clean' },
    ],
  },

  vending: {
    id: 'vending',
    title: 'Vending Machine',
    subtitle: 'Mealy-style coin & dispense flow',
    category: 'Hardware & Control',
    kind: 'mealy',
    start: 'Idle',
    auto: false,
    description:
      'Models coin acceptance, selection, refund, and item collection. Output actions happen right on the transitions.',
    prompt: 'Notice how outputs like "Balance: $1" or "Return coin" live on the transition arrows.',
    quickSequence: {
      label: 'Buy item',
      events: ['coin', 'select', 'collect'],
    },
    states: [
      { id: 'Idle', label: 'Idle', color: '#6366f1', output: 'Insert coin', accepting: false, x: 0.2, y: 0.52 },
      { id: 'HasMoney', label: 'HasMoney', color: '#f59e0b', output: 'Pick item', accepting: false, x: 0.52, y: 0.22 },
      { id: 'Dispensing', label: 'Dispensing', color: '#22c55e', output: 'Dropping item', accepting: true, x: 0.82, y: 0.68 },
    ],
    events: [
      { id: 'coin', label: 'Insert Coin', icon: '🪙', keyHint: '1' },
      { id: 'select', label: 'Select Item', icon: '🎰', keyHint: '2' },
      { id: 'refund', label: 'Refund', icon: '↩', keyHint: '3' },
      { id: 'collect', label: 'Collect Item', icon: '📦', keyHint: '4' },
    ],
    transitions: [
      { from: 'Idle', event: 'coin', to: 'HasMoney', output: 'Balance: $1' },
      { from: 'HasMoney', event: 'select', to: 'Dispensing', output: 'Motor pulse' },
      { from: 'HasMoney', event: 'refund', to: 'Idle', output: 'Return coin' },
      { from: 'Dispensing', event: 'collect', to: 'Idle', output: 'Door closed' },
    ],
  },

  lock: {
    id: 'lock',
    title: 'Door Lock (3-Digit)',
    subtitle: 'Sequential passcode & error trap',
    category: 'Security & Parsing',
    kind: 'moore',
    start: 'Locked',
    auto: false,
    description:
      'Tracks progress through a 3-digit code using only 5 finite states: Locked, Digit1, Digit2, Unlocked, and Error.',
    prompt: 'Enter 3 correct digits to reach Unlocked, or trigger a wrong digit to see how the Error state traps input.',
    quickSequence: {
      label: 'Unlock (3 correct)',
      events: ['correct', 'correct', 'correct'],
    },
    states: [
      { id: 'Locked', label: 'Locked', color: '#ef4444', output: 'LED: Red', accepting: false, x: 0.16, y: 0.48 },
      { id: 'Digit1', label: 'Digit1', color: '#f97316', output: '●○○', accepting: false, x: 0.39, y: 0.22 },
      { id: 'Digit2', label: 'Digit2', color: '#eab308', output: '●●○', accepting: false, x: 0.67, y: 0.22 },
      { id: 'Unlocked', label: 'Unlocked', color: '#22c55e', output: 'Bolt Open', accepting: true, x: 0.85, y: 0.56 },
      { id: 'Error', label: 'Error', color: '#94a3b8', output: 'Alarm / Wait', accepting: false, x: 0.5, y: 0.78 },
    ],
    events: [
      { id: 'correct', label: 'Correct Digit', icon: '✓', keyHint: '1' },
      { id: 'wrong', label: 'Wrong Digit', icon: '✗', keyHint: '2' },
      { id: 'lock', label: 'Lock Door', icon: '🔒', keyHint: '3' },
      { id: 'reset', label: 'Reset Alarm', icon: '↺', keyHint: '4' },
    ],
    transitions: [
      { from: 'Locked', event: 'correct', to: 'Digit1', output: 'Beep 1' },
      { from: 'Locked', event: 'wrong', to: 'Error', output: 'Lockout buzzer' },
      { from: 'Digit1', event: 'correct', to: 'Digit2', output: 'Beep 2' },
      { from: 'Digit1', event: 'wrong', to: 'Error', output: 'Lockout buzzer' },
      { from: 'Digit2', event: 'correct', to: 'Unlocked', output: 'Retract deadbolt' },
      { from: 'Digit2', event: 'wrong', to: 'Error', output: 'Lockout buzzer' },
      { from: 'Unlocked', event: 'lock', to: 'Locked', output: 'Engage deadbolt' },
      { from: 'Error', event: 'reset', to: 'Locked', output: 'Clear alarm' },
    ],
  },

  enemy: {
    id: 'enemy',
    title: 'Game Enemy AI',
    subtitle: 'Patrol, chase, attack & flee logic',
    category: 'Game AI',
    kind: 'moore',
    start: 'Patrol',
    auto: false,
    description:
      'Classic stealth/action NPC behavior tree implemented as a deterministic FSM: Patrol → Chase → Attack, with Flee when HP drops.',
    prompt: 'Spot the player, close into attack range, then trigger Low HP to force a retreat.',
    quickSequence: {
      label: 'Engage → Flee → Recover',
      events: ['spotPlayer', 'inRange', 'lowHP', 'healed'],
    },
    states: [
      { id: 'Patrol', label: 'Patrol', color: '#38bdf8', output: 'Walk waypoints', accepting: false, x: 0.18, y: 0.5 },
      { id: 'Chase', label: 'Chase', color: '#f59e0b', output: 'Sprint to player', accepting: false, x: 0.5, y: 0.22 },
      { id: 'Attack', label: 'Attack', color: '#ef4444', output: 'Swing / Fire', accepting: false, x: 0.82, y: 0.48 },
      { id: 'Flee', label: 'Flee', color: '#a855f7', output: 'Retreat & heal', accepting: false, x: 0.52, y: 0.78 },
    ],
    events: [
      { id: 'spotPlayer', label: 'Spot Player', icon: '👁', keyHint: '1' },
      { id: 'inRange', label: 'In Range', icon: '⚔', keyHint: '2' },
      { id: 'outOfRange', label: 'Out of Range', icon: '🏃', keyHint: '3' },
      { id: 'lostPlayer', label: 'Lost Sight', icon: '🌫', keyHint: '4' },
      { id: 'lowHP', label: 'Low HP', icon: '💔', keyHint: '5' },
      { id: 'healed', label: 'HP Restored', icon: '💚', keyHint: '6' },
    ],
    transitions: [
      { from: 'Patrol', event: 'spotPlayer', to: 'Chase', output: 'Show ! alert' },
      { from: 'Chase', event: 'inRange', to: 'Attack', output: 'Wind up strike' },
      { from: 'Chase', event: 'lostPlayer', to: 'Patrol', output: 'Return to route' },
      { from: 'Attack', event: 'outOfRange', to: 'Chase', output: 'Resume pursuit' },
      { from: 'Chase', event: 'lowHP', to: 'Flee', output: 'Break pursuit' },
      { from: 'Attack', event: 'lowHP', to: 'Flee', output: 'Disengage' },
      { from: 'Flee', event: 'healed', to: 'Patrol', output: 'Resume patrol' },
    ],
  },

  'binary-dfa': {
    id: 'binary-dfa',
    title: 'Even-Zeros DFA',
    subtitle: 'Formal acceptor for binary strings',
    category: 'Automata Theory',
    kind: 'dfa',
    start: 'Even0',
    auto: false,
    description:
      'Accepts any binary string containing an even number of 0s (including empty string ""). Double circle marks the accepting state.',
    prompt: 'Feed bits 0 and 1 (or run a sequence like 1010 vs 101). Notice every (state, symbol) pair is defined.',
    quickSequence: {
      label: 'Run 1010',
      events: ['1', '0', '1', '0'],
    },
    states: [
      { id: 'Even0', label: 'Even0', color: '#22c55e', output: 'ACCEPT', accepting: true, x: 0.3, y: 0.52 },
      { id: 'Odd0', label: 'Odd0', color: '#f43f5e', output: 'REJECT', accepting: false, x: 0.7, y: 0.52 },
    ],
    events: [
      { id: '0', label: 'Bit 0', icon: '0', keyHint: '1' },
      { id: '1', label: 'Bit 1', icon: '1', keyHint: '2' },
    ],
    transitions: [
      { from: 'Even0', event: '0', to: 'Odd0', output: 'Parity → Odd' },
      { from: 'Even0', event: '1', to: 'Even0', output: 'Stay Even' },
      { from: 'Odd0', event: '0', to: 'Even0', output: 'Parity → Even' },
      { from: 'Odd0', event: '1', to: 'Odd0', output: 'Stay Odd' },
    ],
  },
};

export function cloneMachine(machine) {
  return JSON.parse(JSON.stringify(machine));
}

export const PRESETS = Object.freeze(
  Object.fromEntries(
    Object.entries(RAW_PRESETS).map(([id, def]) => [id, deepFreeze(cloneMachine(def))])
  )
);

function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const val of Object.values(obj)) {
      deepFreeze(val);
    }
  }
  return obj;
}

export function getPreset(id) {
  return cloneMachine(RAW_PRESETS[id] || RAW_PRESETS.traffic);
}

export function listPresets() {
  return PRESET_ORDER.map((id) => cloneMachine(RAW_PRESETS[id]));
}

export function computeCircleLayout(states) {
  const list = Array.isArray(states) ? states : [];
  const n = list.length;
  if (n === 0) return [];
  if (n === 1) {
    return [{ ...list[0], x: 0.5, y: 0.5 }];
  }
  if (n === 2) {
    return [
      { ...list[0], x: 0.3, y: 0.52 },
      { ...list[1], x: 0.7, y: 0.52 },
    ];
  }
  const rx = 0.31;
  const ry = 0.3;
  return list.map((s, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      ...s,
      x: Number((0.5 + rx * Math.cos(angle)).toFixed(3)),
      y: Number((0.5 + ry * Math.sin(angle)).toFixed(3)),
    };
  });
}

export function createBlankMachine(title = 'Custom Machine') {
  return {
    id: 'custom',
    title,
    subtitle: 'Custom student-built FSM',
    category: 'Custom',
    kind: 'moore',
    start: 'Start',
    auto: false,
    description: 'Custom finite state machine built in the Studio Builder.',
    prompt: 'Add states and transitions, check for gaps, then test in the Simulator.',
    states: [
      { id: 'Start', label: 'Start', color: '#22c55e', output: 'Ready', accepting: false, x: 0.3, y: 0.52 },
      { id: 'Active', label: 'Active', color: '#38bdf8', output: 'Running', accepting: true, x: 0.7, y: 0.52 },
    ],
    events: [
      { id: 'go', label: 'go', icon: '▶', keyHint: '1' },
      { id: 'stop', label: 'stop', icon: '■', keyHint: '2' },
    ],
    transitions: [
      { from: 'Start', event: 'go', to: 'Active', output: 'Begin work' },
      { from: 'Active', event: 'stop', to: 'Start', output: 'Return idle' },
    ],
  };
}

export function validateMachine(machine) {
  const errors = [];
  if (!machine || typeof machine !== 'object') {
    return { valid: false, errors: ['Machine definition must be an object.'] };
  }
  const states = Array.isArray(machine.states) ? machine.states : [];
  const transitions = Array.isArray(machine.transitions) ? machine.transitions : [];

  if (states.length === 0) {
    errors.push('Machine must define at least one state.');
  }

  const seenStates = new Set();
  for (const state of states) {
    if (!state || !String(state.id || '').trim()) {
      errors.push('Every state must have a non-empty id.');
      continue;
    }
    if (seenStates.has(state.id)) {
      errors.push(`Duplicate state id "${state.id}".`);
    }
    seenStates.add(state.id);
  }

  if (!machine.start || !seenStates.has(machine.start)) {
    errors.push(`Start state "${machine.start || ''}" does not exist.`);
  }

  const seenPairs = new Set();
  for (const tr of transitions) {
    if (!seenStates.has(tr.from)) {
      errors.push(`Transition source "${tr.from}" is not a defined state.`);
    }
    if (!seenStates.has(tr.to)) {
      errors.push(`Transition target "${tr.to}" is not a defined state.`);
    }
    if (!String(tr.event || '').trim()) {
      errors.push(`Transition from "${tr.from}" has an empty event.`);
    }
    const key = `${tr.from}\u0000${tr.event}`;
    if (seenPairs.has(key)) {
      errors.push(`Non-deterministic duplicate rule for (${tr.from}, ${tr.event}).`);
    }
    seenPairs.add(key);
  }

  return { valid: errors.length === 0, errors };
}

export function createRuntime(machineDef) {
  const machine = cloneMachine(machineDef);
  const stateMap = new Map((machine.states || []).map((s) => [s.id, s]));
  const eventSet = new Set((machine.events || []).map((e) => e.id));
  for (const tr of machine.transitions || []) {
    if (tr.event) eventSet.add(tr.event);
  }

  let currentState = stateMap.has(machine.start)
    ? machine.start
    : (machine.states[0]?.id ?? null);
  let stepCount = 0;
  let history = [];

  function getStateObj(id = currentState) {
    return stateMap.get(id) || null;
  }

  function getTransition(fromId, eventId) {
    return (machine.transitions || []).find(
      (t) => t.from === fromId && t.event === eventId
    ) || null;
  }

  function getValidEvents(fromId = currentState) {
    return (machine.transitions || [])
      .filter((t) => t.from === fromId)
      .map((t) => t.event);
  }

  function step(eventId) {
    const from = currentState;
    const fromObj = getStateObj(from);
    if (!from || !fromObj) {
      return {
        ok: false,
        transitioned: false,
        from: null,
        event: eventId,
        to: null,
        mooreOutput: '',
        mealyOutput: '',
        accepting: false,
        stepIndex: stepCount,
        message: 'No active state in machine.',
      };
    }

    const tr = getTransition(from, eventId);
    if (!tr) {
      const entry = {
        ok: true,
        transitioned: false,
        from,
        event: eventId,
        to: from,
        mooreOutput: fromObj.output || '',
        mealyOutput: '',
        accepting: Boolean(fromObj.accepting),
        stepIndex: stepCount,
        message: `${from}: '${eventId}' has no rule — stays in ${from}`,
      };
      history.push(entry);
      return entry;
    }

    const toObj = getStateObj(tr.to);
    currentState = tr.to;
    stepCount += 1;

    const entry = {
      ok: true,
      transitioned: true,
      from,
      event: eventId,
      to: tr.to,
      mooreOutput: toObj?.output || '',
      mealyOutput: tr.output || '',
      accepting: Boolean(toObj?.accepting),
      stepIndex: stepCount,
      message: `${from} —[${eventId}]→ ${tr.to}`,
    };
    history.push(entry);
    return entry;
  }

  function runSequence(eventIds) {
    const steps = [];
    let unhandledCount = 0;
    for (const evt of eventIds) {
      const res = step(evt);
      steps.push(res);
      if (!res.transitioned) unhandledCount += 1;
    }
    const endObj = getStateObj(currentState);
    return {
      steps,
      finalState: currentState,
      accepting: Boolean(endObj?.accepting),
      unhandledCount,
    };
  }

  function reset() {
    currentState = stateMap.has(machine.start)
      ? machine.start
      : (machine.states[0]?.id ?? null);
    stepCount = 0;
    history = [];
    return currentState;
  }

  return {
    machine,
    getState: () => currentState,
    getStateObj,
    getStepCount: () => stepCount,
    getHistory: () => history.slice(),
    isAccepting: () => Boolean(getStateObj(currentState)?.accepting),
    getMooreOutput: () => getStateObj(currentState)?.output || '',
    getValidEvents,
    getTransition,
    step,
    runSequence,
    reset,
    getAllEventIds: () => Array.from(eventSet),
  };
}

export function parseEventSequence(machine, rawText) {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return [];
  const declaredIds = (machine?.events || []).map((e) => e.id);
  const allSingleChar =
    declaredIds.length > 0 && declaredIds.every((id) => id.length === 1);

  if (allSingleChar && !/[\s,;>|]/.test(trimmed)) {
    return trimmed.split('');
  }
  return trimmed
    .split(/[\s,;>|]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function analyzeMachine(machine) {
  const states = Array.isArray(machine?.states) ? machine.states : [];
  const transitions = Array.isArray(machine?.transitions) ? machine.transitions : [];
  const stateIds = states.map((s) => s.id);
  const stateSet = new Set(stateIds);

  const eventIds = [];
  const seenEvent = new Set();
  for (const e of machine?.events || []) {
    if (e?.id && !seenEvent.has(e.id)) {
      seenEvent.add(e.id);
      eventIds.push(e.id);
    }
  }
  for (const tr of transitions) {
    if (tr?.event && !seenEvent.has(tr.event)) {
      seenEvent.add(tr.event);
      eventIds.push(tr.event);
    }
  }

  // BFS from start
  const reachableSet = new Set();
  const queue = [];
  if (machine?.start && stateSet.has(machine.start)) {
    reachableSet.add(machine.start);
    queue.push(machine.start);
  }
  while (queue.length > 0) {
    const curr = queue.shift();
    for (const tr of transitions) {
      if (tr.from === curr && stateSet.has(tr.to) && !reachableSet.has(tr.to)) {
        reachableSet.add(tr.to);
        queue.push(tr.to);
      }
    }
  }

  const unreachable = stateIds.filter((id) => !reachableSet.has(id));

  // Dead ends: reachable non-accepting states with 0 outgoing transitions
  const outgoingCount = new Map(stateIds.map((id) => [id, 0]));
  for (const tr of transitions) {
    if (outgoingCount.has(tr.from)) {
      outgoingCount.set(tr.from, outgoingCount.get(tr.from) + 1);
    }
  }
  const deadEnds = states
    .filter((s) => reachableSet.has(s.id) && !s.accepting && outgoingCount.get(s.id) === 0)
    .map((s) => s.id);

  // Determinism & completeness
  const pairSet = new Set();
  let isDeterministic = true;
  for (const tr of transitions) {
    const key = `${tr.from}\u0000${tr.event}`;
    if (pairSet.has(key)) isDeterministic = false;
    pairSet.add(key);
  }

  const missingPairs = [];
  for (const sid of stateIds) {
    for (const eid of eventIds) {
      if (!pairSet.has(`${sid}\u0000${eid}`)) {
        missingPairs.push({ state: sid, event: eid });
      }
    }
  }

  const totalCells = stateIds.length * eventIds.length;
  const definedCells = totalCells - missingPairs.length;
  const completeness = totalCells > 0 ? Math.round((definedCells / totalCells) * 100) : 100;

  // Cycle detection among reachable states via DFS 3-color
  const color = new Map(); // 0/undef = unvisited, 1 = visiting, 2 = done
  let hasCycle = false;
  function dfs(u) {
    color.set(u, 1);
    for (const tr of transitions) {
      if (tr.from !== u || !stateSet.has(tr.to)) continue;
      const c = color.get(tr.to) || 0;
      if (c === 1) {
        hasCycle = true;
        return;
      }
      if (c === 0) dfs(tr.to);
      if (hasCycle) return;
    }
    color.set(u, 2);
  }
  if (machine?.start && stateSet.has(machine.start)) {
    dfs(machine.start);
  }

  return {
    stateCount: stateIds.length,
    transitionCount: transitions.length,
    eventCount: eventIds.length,
    reachable: Array.from(reachableSet),
    unreachable,
    deadEnds,
    missingPairs,
    completeness,
    hasCycle,
    isDeterministic,
  };
}

/* ── Custom Machine Mutation Helpers (immutable clones) ─────────────────── */

function syncEventsFromTransitions(machine) {
  const next = cloneMachine(machine);
  const existingMap = new Map((next.events || []).map((e) => [e.id, e]));
  const ordered = [];
  const used = new Set();

  for (const e of next.events || []) {
    if (!e?.id || used.has(e.id)) continue;
    used.add(e.id);
    ordered.push(e);
  }
  for (const tr of next.transitions || []) {
    if (tr.event && !used.has(tr.event)) {
      used.add(tr.event);
      ordered.push(
        existingMap.get(tr.event) || {
          id: tr.event,
          label: tr.event,
          icon: '•',
          keyHint: String(ordered.length + 1),
        }
      );
    }
  }
  ordered.forEach((ev, idx) => {
    ev.keyHint = idx < 9 ? String(idx + 1) : '';
  });
  next.events = ordered;
  return next;
}

export function addState(machine, spec) {
  const next = cloneMachine(machine);
  const id = String(spec?.id || '').trim().replace(/\s+/g, '_');
  if (!id) throw new Error('State name cannot be empty.');
  if (next.states.some((s) => s.id === id)) {
    throw new Error(`State "${id}" already exists.`);
  }
  const color = spec?.color || STATE_PALETTE[next.states.length % STATE_PALETTE.length];
  next.states.push({
    id,
    label: String(spec?.label || id).trim(),
    color,
    output: String(spec?.output || '').trim(),
    accepting: Boolean(spec?.accepting),
    x: typeof spec?.x === 'number' ? spec.x : 0.5,
    y: typeof spec?.y === 'number' ? spec.y : 0.5,
  });

  // Reposition cleanly if caller did not specify coordinates
  if (typeof spec?.x !== 'number' || typeof spec?.y !== 'number') {
    next.states = computeCircleLayout(next.states);
  }
  if (!next.start) next.start = id;
  return next;
}

export function removeState(machine, stateId) {
  const next = cloneMachine(machine);
  if (next.states.length <= 1) {
    throw new Error('A state machine needs at least one state.');
  }
  next.states = next.states.filter((s) => s.id !== stateId);
  next.transitions = next.transitions.filter(
    (t) => t.from !== stateId && t.to !== stateId
  );
  if (next.start === stateId) {
    next.start = next.states[0].id;
  }
  return syncEventsFromTransitions(next);
}

export function setStartState(machine, stateId) {
  const next = cloneMachine(machine);
  if (!next.states.some((s) => s.id === stateId)) {
    throw new Error(`State "${stateId}" not found.`);
  }
  next.start = stateId;
  return next;
}

export function toggleAccepting(machine, stateId) {
  const next = cloneMachine(machine);
  const target = next.states.find((s) => s.id === stateId);
  if (!target) throw new Error(`State "${stateId}" not found.`);
  target.accepting = !target.accepting;
  return next;
}

export function upsertTransition(machine, { from, event, to, output = '' }) {
  const next = cloneMachine(machine);
  const cleanEvent = String(event || '').trim();
  if (!cleanEvent) throw new Error('Event name cannot be empty.');
  if (!next.states.some((s) => s.id === from)) {
    throw new Error(`Unknown source state "${from}".`);
  }
  if (!next.states.some((s) => s.id === to)) {
    throw new Error(`Unknown target state "${to}".`);
  }
  const existing = next.transitions.find(
    (t) => t.from === from && t.event === cleanEvent
  );
  if (existing) {
    existing.to = to;
    existing.output = String(output || '').trim();
  } else {
    next.transitions.push({
      from,
      event: cleanEvent,
      to,
      output: String(output || '').trim(),
    });
  }
  return syncEventsFromTransitions(next);
}

export function removeTransition(machine, from, event) {
  const next = cloneMachine(machine);
  next.transitions = next.transitions.filter(
    (t) => !(t.from === from && t.event === event)
  );
  return syncEventsFromTransitions(next);
}

/* ── Multi-Language Code Export ────────────────────────────────────────── */

function toEnumIdent(raw, prefix = 'S_') {
  const cleaned = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!cleaned) return `${prefix}ITEM`;
  return /^[0-9]/.test(cleaned) ? `${prefix}${cleaned}` : cleaned;
}

export function generateCode(machine, lang = 'js') {
  const states = machine?.states || [];
  const transitions = machine?.transitions || [];
  const start = machine?.start || states[0]?.id || 'START';

  if (lang === 'python') {
    const lines = [
      `# ${machine.title || 'Finite State Machine'}`,
      `state = ${JSON.stringify(start)}`,
      '',
      'TRANSITIONS = {',
    ];
    for (const s of states) {
      const edges = transitions.filter((t) => t.from === s.id);
      const inner = edges.map((t) => `${JSON.stringify(t.event)}: ${JSON.stringify(t.to)}`).join(', ');
      lines.push(`    ${JSON.stringify(s.id)}: {${inner}},`);
    }
    lines.push('}', '');
    lines.push('def handle_event(event: str) -> str:');
    lines.push('    global state');
    lines.push('    next_state = TRANSITIONS.get(state, {}).get(event)');
    lines.push('    if next_state is not None:');
    lines.push('        state = next_state');
    lines.push('    return state');
    return lines.join('\n');
  }

  if (lang === 'arduino') {
    const stateEnum = states.map((s) => `  ${toEnumIdent(s.id, 'STATE_')}`);
    const eventIds = [];
    const seen = new Set();
    for (const e of machine.events || []) {
      if (e?.id && !seen.has(e.id)) {
        seen.add(e.id);
        eventIds.push(e.id);
      }
    }
    for (const t of transitions) {
      if (t?.event && !seen.has(t.event)) {
        seen.add(t.event);
        eventIds.push(t.event);
      }
    }
    const eventEnum = eventIds.map((e) => `  ${toEnumIdent(e, 'EVT_')}`);
    const lines = [
      `// ${machine.title || 'Finite State Machine'} (Arduino C++)`,
      'enum State {',
      stateEnum.join(',\n'),
      '};',
      '',
      'enum Event {',
      (eventEnum.length ? eventEnum : ['  EVT_NONE']).join(',\n'),
      '};',
      '',
      `State currentState = ${toEnumIdent(start, 'STATE_')};`,
      '',
      'void handleEvent(Event evt) {',
      '  switch (currentState) {',
    ];
    for (const s of states) {
      const sConst = toEnumIdent(s.id, 'STATE_');
      lines.push(`    case ${sConst}:`);
      const edges = transitions.filter((t) => t.from === s.id);
      edges.forEach((t, idx) => {
        const kw = idx === 0 ? 'if' : 'else if';
        lines.push(`      ${kw} (evt == ${toEnumIdent(t.event, 'EVT_')}) currentState = ${toEnumIdent(t.to, 'STATE_')};`);
      });
      lines.push('      break;');
    }
    lines.push('  }', '}');
    return lines.join('\n');
  }

  // Default: JavaScript
  const lines = [
    `// ${machine.title || 'Finite State Machine'}`,
    `let currentState = ${JSON.stringify(start)};`,
    '',
    'const TRANSITIONS = {',
  ];
  for (const s of states) {
    const edges = transitions.filter((t) => t.from === s.id);
    const inner = edges.map((t) => `${JSON.stringify(t.event)}: ${JSON.stringify(t.to)}`).join(', ');
    lines.push(`  ${JSON.stringify(s.id)}: { ${inner} },`);
  }
  lines.push('};', '');
  lines.push('function handleEvent(event) {');
  lines.push('  const next = TRANSITIONS[currentState]?.[event];');
  lines.push('  if (next) currentState = next;');
  lines.push('  return currentState;');
  lines.push('}');
  return lines.join('\n');
}

/* ── Moore vs. Mealy "10" Sequence Detector Comparison ──────────────────── */

export const MOORE_10_MACHINE = deepFreeze({
  id: 'moore-10',
  title: 'Moore "10" Detector (3 States)',
  kind: 'moore',
  start: 'S0',
  states: [
    { id: 'S0', label: 'S0 / 0', color: '#38bdf8', output: '0', accepting: false, x: 0.2, y: 0.54 },
    { id: 'S1', label: 'S1 / 0', color: '#f59e0b', output: '0', accepting: false, x: 0.52, y: 0.26 },
    { id: 'S10', label: 'S10 / 1', color: '#22c55e', output: '1', accepting: true, x: 0.82, y: 0.58 },
  ],
  events: [
    { id: '0', label: '0', icon: '0', keyHint: '1' },
    { id: '1', label: '1', icon: '1', keyHint: '2' },
  ],
  transitions: [
    { from: 'S0', event: '0', to: 'S0', output: '' },
    { from: 'S0', event: '1', to: 'S1', output: '' },
    { from: 'S1', event: '1', to: 'S1', output: '' },
    { from: 'S1', event: '0', to: 'S10', output: '' },
    { from: 'S10', event: '0', to: 'S0', output: '' },
    { from: 'S10', event: '1', to: 'S1', output: '' },
  ],
});

export const MEALY_10_MACHINE = deepFreeze({
  id: 'mealy-10',
  title: 'Mealy "10" Detector (2 States)',
  kind: 'mealy',
  start: 'M0',
  states: [
    { id: 'M0', label: 'M0', color: '#38bdf8', output: '', accepting: false, x: 0.28, y: 0.52 },
    { id: 'M1', label: 'M1', color: '#f59e0b', output: '', accepting: false, x: 0.72, y: 0.52 },
  ],
  events: [
    { id: '0', label: '0', icon: '0', keyHint: '1' },
    { id: '1', label: '1', icon: '1', keyHint: '2' },
  ],
  transitions: [
    { from: 'M0', event: '0', to: 'M0', output: '0' },
    { from: 'M0', event: '1', to: 'M1', output: '0' },
    { from: 'M1', event: '1', to: 'M1', output: '0' },
    { from: 'M1', event: '0', to: 'M0', output: '1' },
  ],
});

export function createMooreMealyComparison() {
  const moore = createRuntime(MOORE_10_MACHINE);
  const mealy = createRuntime(MEALY_10_MACHINE);
  let rows = [];

  function feedBit(rawBit) {
    const bit = String(rawBit);
    if (bit !== '0' && bit !== '1') {
      throw new Error(`Expected binary bit "0" or "1", got "${rawBit}".`);
    }
    const mRes = moore.step(bit);
    const yRes = mealy.step(bit);
    const row = {
      tick: rows.length + 1,
      bit,
      mooreFrom: mRes.from,
      mooreTo: mRes.to,
      mooreOut: mRes.mooreOutput,
      mealyFrom: yRes.from,
      mealyTo: yRes.to,
      mealyOut: yRes.mealyOutput,
      detected: yRes.mealyOutput === '1',
    };
    rows.push(row);
    return row;
  }

  function feedString(bits) {
    return String(bits || '')
      .replace(/[^01]/g, '')
      .split('')
      .map((b) => feedBit(b));
  }

  function reset() {
    moore.reset();
    mealy.reset();
    rows = [];
  }

  return {
    moore,
    mealy,
    feedBit,
    feedString,
    reset,
    getRows: () => rows.slice(),
    getMooreState: () => moore.getState(),
    getMealyState: () => mealy.getState(),
  };
}

export function computeNestingStates(maxDepth) {
  const d = Math.max(1, Math.floor(Number(maxDepth) || 1));
  return {
    maxDepth: d,
    minimumStates: d + 2, // D0..Dd valid depths + 1 Dead/Error state
    sampleBalanced: '('.repeat(d) + ')'.repeat(d),
    stateNames: [...Array.from({ length: d + 1 }, (_, i) => `Depth${i}`), 'Error'],
  };
}

/* ── Classroom Challenges ──────────────────────────────────────────────── */

export const CHALLENGES = Object.freeze([
  {
    id: 'predict-3',
    title: '1. Predict Three Transitions',
    desc: 'Enable Predict Mode in Tab 1, click your predicted next state on the graph, and score 3 correct predictions.',
    hint: 'Click "Predict Mode" above the graph, click the expected target node, then click an event button.',
  },
  {
    id: 'vacuum-route',
    title: '2. Guide the Vacuum Home',
    desc: 'In Robot Vacuum, traverse Clean → Avoid → Dock → Charge.',
    hint: 'Fire Obstacle, then Battery Low, then Dock Reached.',
  },
  {
    id: 'fix-vacuum-gap',
    title: '3. Fix the Dock + Obstacle Gap',
    desc: 'Open Tab 2 (Build & Debug), fork Robot Vacuum, and add a safe rule when Obstacle fires in Dock.',
    hint: 'In Tab 2 click "Fork Active Preset", then add From: Dock · Event: obstacle · To: Avoid (or Dock).',
  },
  {
    id: 'dfa-test',
    title: '4. Prove Both Outcomes on Even-Zeros DFA',
    desc: 'In Even-Zeros DFA, test at least one accepted string (even 0s) and one rejected string (odd 0s).',
    hint: 'Switch to Even-Zeros DFA, run "1010" (ACCEPT), then reset and run "101" (REJECT).',
  },
  {
    id: 'build-custom-loop',
    title: '5. Design a Healthy 3+ State Loop',
    desc: 'In Tab 2, build a valid FSM with ≥ 3 states, 0 unreachable states, 0 dead-ends, and a cycle.',
    hint: 'Connect every state so you can reach all of them from Start and loop back without trapping.',
  },
]);

export function evaluateChallenges(progress = {}, customMachine = null) {
  const customAnalysis = customMachine ? analyzeMachine(customMachine) : null;
  const customValid = customMachine ? validateMachine(customMachine).valid : false;

  // Check if customMachine is a robot-like machine with Dock + obstacle defined
  const hasDockObstacleFix = Boolean(
    customMachine &&
      customValid &&
      customMachine.states.some((s) => s.id === 'Dock') &&
      customMachine.transitions.some((t) => t.from === 'Dock' && t.event === 'obstacle')
  );

  const allowCustomCheck = progress.customEdited !== false;
  const healthyCustomLoop = Boolean(
    allowCustomCheck &&
      customMachine &&
      customValid &&
      customAnalysis &&
      customAnalysis.stateCount >= 3 &&
      customAnalysis.unreachable.length === 0 &&
      customAnalysis.deadEnds.length === 0 &&
      customAnalysis.hasCycle
  );

  const completed = {
    'predict-3': (progress.predictCorrectCount || 0) >= 3,
    'vacuum-route': Boolean(progress.vacuumRouteDone),
    'fix-vacuum-gap': Boolean(progress.vacuumGapFixed || hasDockObstacleFix),
    'dfa-test': Boolean(progress.dfaAcceptedSeen && progress.dfaRejectedSeen),
    'build-custom-loop': Boolean(progress.customLoopBuilt || healthyCustomLoop),
  };

  const count = Object.values(completed).filter(Boolean).length;
  return {
    completed,
    count,
    total: CHALLENGES.length,
  };
}
