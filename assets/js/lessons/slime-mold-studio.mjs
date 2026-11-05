const railNodes = [
  [96, 185, 'Harbor'], [295, 85, 'Central'], [508, 185, 'Market'],
  [240, 285, 'West Junction'], [397, 285, 'East Junction'],
];
const logicNodes = [[66, 180, 'Culture'], [300, 85], [300, 275], [534, 180, 'Output']];
const stepsPerRun = 32;
const seedStrength = 0.14;
const grownStrength = 0.39;
const cases = [[0, 0], [0, 1], [1, 0], [1, 1]];
const exercises = {
  and: { brief: 'A and B are keys. Open the lock only when both keys are turned.', target: [0, 0, 0, 1] },
  or: { brief: 'A and B are power supplies. Keep the lights on if either supply is working.', target: [0, 1, 1, 1] },
  xor: { brief: 'A and B are signal requests. Grant access when exactly one request is active.', target: [0, 1, 1, 0] },
  custom: { brief: 'Set the target for each input pair. Then program the tracks to match your rule.', target: [0, 0, 0, 0] },
};
const gates = {
  never: { label: 'Never opens', open: () => false },
  always: { label: 'Always open', open: () => true },
  a: { label: 'A is on', open: ([a]) => a === 1 },
  b: { label: 'B is on', open: ([, b]) => b === 1 },
  notA: { label: 'A is off', open: ([a]) => a === 0 },
  notB: { label: 'B is off', open: ([, b]) => b === 0 },
};

function makeEdges(nodes, links) {
  return links.map(([from, to], index) => {
    const [x1, y1, name1] = nodes[from];
    const [x2, y2, name2] = nodes[to];
    const distance = Math.hypot(x2 - x1, y2 - y1);
    return { from, to, distance, label: name1 && name2 ? `${name1} to ${name2}` : String(index + 1) };
  });
}

const railEdges = makeEdges(railNodes, [[0, 1], [1, 2], [0, 3], [3, 1], [1, 4], [4, 2], [3, 4]]);
const logicEdges = makeEdges(logicNodes, [[0, 1], [1, 3], [0, 2], [2, 3]]);

function reachable(edges, usable) {
  const seen = new Set([0]);
  for (const node of seen) {
    edges.forEach(({ from, to }, i) => {
      if (!usable[i]) return;
      if (from === node) seen.add(to);
      if (to === node) seen.add(from);
    });
  }
  return seen;
}

function newTrial(nodes, edges, open, sinks, prior) {
  const strength = edges.map((_, i) => open[i] ? (prior?.[i] ?? seedStrength) : 0);
  const connected = reachable(edges, open);
  const neighbors = nodes.map(() => []);
  edges.forEach(({ from, to }, i) => {
    if (!open[i]) return;
    neighbors[from].push([to, i]);
    neighbors[to].push([from, i]);
  });
  return { nodes, edges, open, strength, sinks: sinks.filter(node => connected.has(node)), neighbors, step: 0 };
}

function grow(trial) {
  const { edges, strength, sinks, neighbors } = trial;
  const conductance = edges.map(({ distance }, i) => strength[i] / distance);
  const flow = edges.map(() => 0);

  // Solve pressures for each source-to-station pair so a station may also
  // carry traffic onward. Normalize by that pair's total outflow.
  for (const sink of sinks) {
    const pressure = neighbors.map(() => 0);
    pressure[0] = 1;
    for (let pass = 0; pass < 36; pass++) {
      for (let node = 1; node < neighbors.length; node++) {
        if (node === sink || neighbors[node].length === 0) continue;
        let weightedPressure = 0;
        let totalConductance = 0;
        for (const [next, edge] of neighbors[node]) {
          weightedPressure += conductance[edge] * pressure[next];
          totalConductance += conductance[edge];
        }
        pressure[node] = weightedPressure / totalConductance;
      }
    }
    const outflow = neighbors[0].reduce((total, [node, edge]) =>
      total + conductance[edge] * (1 - pressure[node]), 0);
    edges.forEach(({ from, to }, i) => {
      flow[i] += conductance[i] * Math.abs(pressure[from] - pressure[to]) / outflow;
    });
  }

  strength.forEach((value, i) => {
    if (!trial.open[i]) return;
    // A small exploration floor lets previously unused bypasses grow back.
    const reinforced = seedStrength + 0.86 * Math.min(1, flow[i]) ** 1.7;
    strength[i] += (reinforced - value) * 0.28;
  });
  trial.step++;
}

function activeTracks(trial) {
  return trial.strength.map(value => value >= grownStrength);
}

const get = id => document.getElementById(`physarum-${id}`);
const canvas = get('canvas');
const stationButtons = [...get('stations').querySelectorAll('button')];
const modeButtons = [...document.querySelectorAll('[data-slime-mode]')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let mode = 'rail';
let railJob;
let logicJob;
let fed = [false, false, false];
let initialRail;
let railTrial;
let logicTrial;
let currentCase = -1;
let observed = [];
let target = [...exercises.and.target];

function drawBoard(ctx, width, height) {
  const isRail = mode === 'rail';
  const nodes = isRail ? railNodes : logicNodes;
  const edges = isRail ? railEdges : logicEdges;
  const trial = isRail ? railTrial : logicTrial;
  const scaleX = width / 600;
  const scaleY = height / 360;
  ctx.fillStyle = '#19253a';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#455573';
  for (let x = 12; x < width; x += 18) {
    for (let y = 12; y < height; y += 18) ctx.fillRect(x, y, 1, 1);
  }

  const point = index => [nodes[index][0] * scaleX, nodes[index][1] * scaleY];
  edges.forEach(({ from, to }, index) => {
    const [x1, y1] = point(from);
    const [x2, y2] = point(to);
    const blocked = trial?.open[index] === false;
    const strength = trial?.strength[index] ?? seedStrength;
    const reinforced = strength >= grownStrength;
    ctx.setLineDash(blocked ? [2, 5] : reinforced ? [] : [5, 6]);
    ctx.lineWidth = blocked ? 2 : reinforced ? 3 + strength * 8 : 1.5;
    ctx.strokeStyle = blocked ? '#ff91a7' : reinforced ? '#ffd765' : '#91a8d7';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (!isRail || blocked) {
      const x = (x1 + x2) / 2;
      const y = (y1 + y2) / 2;
      ctx.fillStyle = '#19253a';
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = blocked ? '#ff9fb0' : '#ecf2ff';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isRail ? '×' : String(index + 1), x, y);
    }
  });

  ctx.setLineDash([]);
  const outputOn = !isRail && trial && reachable(edges, activeTracks(trial)).has(3);
  nodes.forEach(([, , name], index) => {
    if (isRail && index < 3) return;
    const [x, y] = point(index);
    ctx.fillStyle = index === 0 || (index === 3 && outputOn) ? '#ffd765' : '#19253a';
    ctx.strokeStyle = '#bfcef2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, name && !isRail ? 10 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!name || isRail) return;
    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = '#ecf2ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(name, x, y + 16);
  });

  if (!isRail && currentCase >= 0) {
    const [a, b] = cases[currentCase];
    ctx.fillStyle = '#ecf2ff';
    ctx.font = 'bold 13px system-ui';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    const output = logicTrial?.step === stepsPerRun ? observed[currentCase] : undefined;
    ctx.fillText(`A = ${a}    B = ${b}    Output = ${output ?? '…'}`, 12, height - 11);
  }
}

const board = SimKit.canvas2d(canvas, { onResize: drawBoard });
const paint = () => drawBoard(board.ctx, board.width, board.height);

function setRailControls() {
  stationButtons.forEach((button, i) => {
    button.setAttribute('aria-pressed', String(fed[i]));
    button.disabled = Boolean(railJob || initialRail);
  });
  const count = fed.filter(Boolean).length;
  get('grow').disabled = count < 3 || Boolean(railJob || initialRail);
  get('closure').hidden = !initialRail;
  get('close-edge').disabled = Boolean(railJob);
  get('regrow').disabled = Boolean(railJob);
}

function railSummary(trial) {
  const active = activeTracks(trial);
  const stations = [...reachable(railEdges, active)].filter(node => node < 3).length;
  const distance = Math.round(railEdges.reduce((sum, { distance }, i) => sum + (active[i] ? distance : 0), 0) / 10);
  const routes = railEdges.filter((_, i) => active[i]).map(({ label }) => label).join(', ');
  return { active, stations, distance, routes, text: `${stations}/3 linked · ${distance} length units` };
}

function runRail(closedIndex = -1) {
  const trial = newTrial(railNodes, railEdges, railEdges.map((_, i) => i !== closedIndex), [1, 2], initialRail?.strength);
  railTrial = trial;
  railJob = { trial, done: () => {
    railJob = null;
    const summary = railSummary(trial);
    get('routes').textContent = `Reinforced routes: ${summary.routes}.`;
    if (closedIndex === -1) {
      initialRail = trial;
      get('original').textContent = summary.text;
      get('close-edge').replaceChildren(...railEdges.flatMap(({ label }, i) =>
        summary.active[i] ? [new Option(label, i)] : []));
      get('tokyo').hidden = false;
      setInstruction();
      get('rail-status').textContent = 'Network grown. Pick a route to close.';
    } else {
      const delta = summary.distance - railSummary(initialRail).distance;
      const comparison = delta ? ` (${delta > 0 ? '+' : ''}${delta})` : ' (same length)';
      get('after').textContent = summary.text + comparison;
      get('rail-status').textContent = summary.stations === 3
        ? 'All three stations reconnected through a detour.'
        : `${summary.stations} of 3 stations reconnected.`;
    }
    setRailControls();
  } };
  get('rail-status').textContent = closedIndex === -1 ? 'Growing the network…' : 'Regrowing around the closure…';
  setRailControls();
  startAnimation();
}

stationButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    fed[index] = !fed[index];
    get('rail-status').textContent = fed.every(Boolean) ? 'All stations fed. Grow the network.' : `${fed.filter(Boolean).length} of 3 stations fed.`;
    setRailControls();
  });
});
get('grow').addEventListener('click', () => runRail());
get('regrow').addEventListener('click', () => runRail(Number(get('close-edge').value)));
get('reset-rail').addEventListener('click', () => {
  fed = [false, false, false];
  railJob = initialRail = railTrial = null;
  get('rail-status').textContent = '0 of 3 stations fed.';
  get('after').textContent = 'Awaiting a closure';
  get('routes').textContent = '';
  setInstruction();
  setRailControls();
  paint();
});

const gateSelects = logicEdges.map(({ label }) => {
  const control = document.createElement('label');
  control.textContent = `Track ${label}`;
  const select = document.createElement('select');
  select.append(...Object.entries(gates).map(([value, { label: text }]) => new Option(text, value)));
  control.append(select);
  get('gates').append(control);
  select.addEventListener('change', clearLogicResults);
  select.id = `physarum-track-${label}`;
  return select;
});

const rows = cases.map(([a, b], index) => {
  const row = get('rows').insertRow();
  row.insertCell().textContent = a;
  row.insertCell().textContent = b;
  const expected = row.insertCell();
  const fixed = document.createElement('span');
  const editable = document.createElement('select');
  editable.setAttribute('aria-label', `Target when A is ${a} and B is ${b}`);
  editable.append(new Option('0', 0), new Option('1', 1));
  editable.addEventListener('change', () => {
    target[index] = Number(editable.value);
    renderTruthTable();
    describeLogicResults();
  });
  expected.append(fixed, editable);
  const result = row.insertCell();
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Run';
  button.setAttribute('aria-label', `Run with A ${a} and B ${b}`);
  button.addEventListener('click', () => runLogic([index]));
  row.insertCell().append(button);
  return { row, fixed, editable, result, button };
});

function renderTruthTable() {
  const custom = get('mission').value === 'custom';
  rows.forEach(({ row, fixed, editable, result }, i) => {
    row.dataset.current = String(i === currentCase);
    fixed.hidden = custom;
    editable.hidden = !custom;
    fixed.textContent = editable.value = target[i];
    if (observed[i] === undefined) {
      result.textContent = '—';
      delete result.dataset.match;
    } else {
      const match = observed[i] === target[i];
      result.dataset.match = String(match);
      result.textContent = `${observed[i]} ${match ? '✓' : '✕'}`;
      result.setAttribute('aria-label', `${observed[i]}, ${match ? 'matches target' : 'differs from target'}`);
      return;
    }
    result.removeAttribute('aria-label');
  });
}

function describeLogicResults() {
  const tried = observed.filter(value => value !== undefined).length;
  const matches = observed.filter((value, i) => value === target[i]).length;
  if (tried === 0) {
    get('logic-status').textContent = 'Set the tracks, then test your circuit.';
  } else if (matches === 4) {
    get('logic-status').textContent = 'Rule verified. All four outputs match.';
  } else {
    const next = matches < tried ? 'Check the mismatched rows.' : 'Try the remaining inputs.';
    get('logic-status').textContent = `${matches} of ${tried} tested outputs match. ${next}`;
  }
}

function clearLogicResults() {
  logicJob = logicTrial = null;
  observed = [];
  currentCase = -1;
  setLogicControls(false);
  renderTruthTable();
  describeLogicResults();
  paint();
}

function setLogicControls(busy) {
  get('test-all').disabled = busy;
  gateSelects.forEach(select => { select.disabled = busy; });
  rows.forEach(({ button, editable }) => { button.disabled = editable.disabled = busy; });
}

function runLogic(indices) {
  if (indices.length === 4) observed = [];
  const inputs = [...indices];
  const beginCase = () => {
    currentCase = inputs.shift();
    const input = cases[currentCase];
    const open = gateSelects.map(select => gates[select.value].open(input));
    logicTrial = newTrial(logicNodes, logicEdges, open, [3]);
    logicJob = { trial: logicTrial, done: () => {
      observed[currentCase] = Number(reachable(logicEdges, activeTracks(logicTrial)).has(3));
      if (inputs.length) {
        beginCase();
        return;
      }
      logicJob = null;
      setLogicControls(false);
      renderTruthTable();
      describeLogicResults();
    } };
    renderTruthTable();
  };
  get('logic-status').textContent = indices.length === 4 ? 'Testing all four input pairs…' : 'Testing the selected input pair…';
  setLogicControls(true);
  beginCase();
  startAnimation();
}

function resetCircuit() {
  gateSelects.forEach(select => { select.value = 'never'; });
  clearLogicResults();
}
get('reset-logic').addEventListener('click', resetCircuit);
get('mission').addEventListener('change', event => {
  const exercise = exercises[event.target.value];
  target = [...exercise.target];
  get('brief').textContent = exercise.brief;
  resetCircuit();
});
get('test-all').addEventListener('click', () => runLogic([0, 1, 2, 3]));

function setInstruction() {
  get('instruction').textContent = mode === 'logic'
    ? 'Set when each track opens. Can the mold reach the output?'
    : initialRail ? 'Close a reinforced route and see if the mold finds a detour.'
      : 'Drop food at all three stations to grow a subway map.';
}

function currentJob() {
  return mode === 'rail' ? railJob : logicJob;
}

let elapsed = 0;
const animation = SimKit.loop(dt => {
  const job = currentJob();
  if (!job) {
    animation.pause();
    return;
  }
  elapsed += Math.min(dt, 0.08);
  if (elapsed < 0.035) return;
  elapsed = 0;
  grow(job.trial);
  if (job.trial.step === stepsPerRun) job.done();
  paint();
});
animation.pause();

function startAnimation() {
  if (reducedMotion.matches) {
    let job;
    while ((job = currentJob())) {
      while (job.trial.step < stepsPerRun) grow(job.trial);
      job.done();
    }
    paint();
  } else {
    animation.resume();
  }
}

modeButtons.forEach(button => {
  button.addEventListener('click', () => {
    mode = button.dataset.slimeMode;
    const isRail = mode === 'rail';
    modeButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    get('rail').hidden = get('stations').hidden = !isRail;
    get('logic').hidden = isRail;
    canvas.setAttribute('aria-label', isRail
      ? 'Subway map with three stations and two bypass junctions. Results are listed beside the map.'
      : 'Circuit with four numbered tracks. Tracks 1 and 2 make one branch. Tracks 3 and 4 make the other. Results are in the truth table.');
    setInstruction();
    paint();
    if (currentJob()) startAnimation();
  });
});

renderTruthTable();
