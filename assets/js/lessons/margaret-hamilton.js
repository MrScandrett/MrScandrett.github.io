(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const policy = el('policy'), load = el('load');
  const tasks = {
    guidance: { label: 'Guidance (essential)', units: 3, symbol: 'G' },
    attitude: { label: 'Attitude control (essential)', units: 2, symbol: 'A' },
    display: { label: 'Routine display', units: 3, symbol: 'D' }
  };
  const radarLoads = { normal: 2, burst: 5, extreme: 8 };
  const records = new Map();
  let cycle = 0, recoveries = 0, misses = 0, finished = false, timer = null;
  const flight = document.querySelector('.mh-flight');
  function updateFlight(phase) {
    flight.dataset.phase = phase;
    const stateLabels = { ready: 'Awaiting sequence', descent: 'Essential tasks complete', recovery: 'Overload · essential work protected', stopped: 'Stopped · essential deadline missed', landed: 'Touchdown · model completed' };
    el('flight-state').textContent = stateLabels[phase];
    el('flight-progress').textContent = `Descent ${cycle} / 8`;
    const startY = matchMedia('(max-width: 700px)').matches ? 190 : 145;
    el('lander').style.setProperty('--craft-y', `${startY + cycle * (366 - startY) / 8}px`);
    el('craft-shadow').setAttribute('opacity', String(0.18 + cycle * 0.055));
    el('craft-shadow').setAttribute('rx', String(48 + cycle * 3));
    flight.querySelectorAll('.mh-progress-rail i').forEach((tick, i) => tick.classList.toggle('is-complete', i < cycle));
  }
  matchMedia('(max-width: 700px)').addEventListener('change', () => updateFlight(flight.dataset.phase));
  function stop() {
    clearInterval(timer); timer = null;
    flight.dataset.running = 'false';
    el('run').textContent = 'Run landing';
  }
  function paintSlots(slots) {
    el('work-slots').replaceChildren(...slots.map(name => {
      const slot = document.createElement('span');
      slot.className = 'mh-slot'; slot.dataset.task = name;
      slot.textContent = name === 'radar' ? 'R' : tasks[name]?.symbol || '—';
      slot.title = name === 'radar' ? 'Radar interrupt' : tasks[name]?.label || 'Spare time';
      return slot;
    }));
  }
  function rows(done) {
    el('task-rows').replaceChildren(...Object.entries(tasks).map(([name, task]) => {
      const row = document.createElement('tr');
      [task.label, task.units, done ? done[name] : '—', done ? (done[name] === task.units ? 'Complete' : name === 'display' && policy.value === 'protected' && misses === 0 ? 'Deferred by recovery' : 'Unfinished') : 'Awaiting cycle'].forEach(value => {
        const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
      });
      return row;
    }));
  }
  function record(safe) {
    const key = `${policy.selectedOptions[0].textContent} / ${load.selectedOptions[0].textContent}`;
    records.set(key, [safe ? 'Model landing completed' : 'Model descent stopped', misses, recoveries]);
    el('results').replaceChildren(...Array.from(records, ([name, values]) => {
      const row = document.createElement('tr');
      [name, ...values].forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); });
      return row;
    }));
  }
  function step() {
    if (finished) return;
    cycle++;
    const slots = Array(radarLoads[load.value]).fill('radar');
    let budget = 10 - slots.length;
    const done = {};
    const order = policy.value === 'protected' ? ['guidance', 'attitude', 'display'] : ['display', 'guidance', 'attitude'];
    for (const name of order) {
      done[name] = Math.min(tasks[name].units, budget);
      budget -= done[name]; slots.push(...Array(done[name]).fill(name));
    }
    slots.push(...Array(budget).fill('spare'));
    const missed = ['guidance', 'attitude'].filter(name => done[name] < tasks[name].units).length;
    misses += missed;
    if (!missed && done.display < tasks.display.units && policy.value === 'protected') recoveries++;
    paintSlots(slots); rows(done);
    el('cycle').textContent = `${cycle} / 8`;
    el('recoveries').textContent = recoveries;
    el('misses').textContent = misses;
    updateFlight(missed ? 'stopped' : cycle === 8 ? 'landed' : done.display < tasks.display.units ? 'recovery' : 'descent');
    if (missed || cycle === 8) {
      finished = true; stop();
      el('step').disabled = true; el('run').disabled = true;
      el('lab-status').textContent = missed
        ? `Descent stopped at cycle ${cycle}: ${missed} essential deadline${missed === 1 ? '' : 's'} missed. Compare another policy or reduce radar load; priorities cannot create extra time.`
        : `Model landing completed. ${recoveries} recovery events; no essential deadlines missed. ${recoveries ? 'Display work was deferred so essential work could finish.' : 'Every task fit within the available time.'}`;
      record(!missed);
    } else {
      el('lab-status').textContent = recoveries
        ? `Cycle ${cycle}: overload recovery. Guidance and attitude control completed; routine display deferred. Continue to check the remaining cycles.`
        : `Cycle ${cycle}: all tasks completed within the budget. Continue to the next cycle.`;
    }
  }
  function reset() {
    stop(); cycle = 0; recoveries = 0; misses = 0; finished = false;
    el('step').disabled = false; el('run').disabled = false;
    el('cycle').textContent = '0 / 8'; el('recoveries').textContent = '0'; el('misses').textContent = '0';
    updateFlight('ready'); paintSlots(Array(10).fill('spare')); rows(null);
    el('lab-status').textContent = 'Ready. Choose a policy, predict an outcome, then run or step through eight cycles.';
  }
  el('step').addEventListener('click', () => { stop(); step(); });
  el('run').addEventListener('click', () => {
    if (timer) { stop(); return; }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      while (!finished) step();
    } else {
      step();
      if (!finished) { timer = setInterval(step, 850); el('run').textContent = 'Pause'; flight.dataset.running = 'true'; }
    }
  });
  el('reset').addEventListener('click', reset);
  policy.addEventListener('change', reset); load.addEventListener('change', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  document.querySelectorAll('.mh-question').forEach(question => {
    question.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      question.querySelectorAll('button').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
      question.querySelector('[role=status]').textContent = `${button.dataset.choice === question.dataset.answer ? 'Correct.' : 'Try again.'} ${question.dataset.explanation}`;
    }));
  });
  // These steps explain small excerpts; they do not emulate AGC arithmetic or timing.
  const walkthroughs = {
    phase: {
      initial: { 'A register': '0 (illustrative starting value)', WCHPHOLD: 'Previous phase', WCHPHASE: 'Previous phase' },
      steps: [
        { lines: [0], changes: { 'A register': '2' }, text: 'CAF TWO: load the constant named TWO into A. The value is 2; no phase memory has changed yet.' },
        { lines: [1], changes: { WCHPHOLD: '2' }, text: 'TS WCHPHOLD: store A in WCHPHOLD. With this small value and no overflow, A still contains 2.' },
        { lines: [2], changes: { WCHPHASE: '2' }, text: 'TS WCHPHASE: store the same value in WCHPHASE. The phase marker is now 2, identified in the listing as vertical landing.' }
      ]
    },
    protection: {
      initial: { 'Routine being called': 'None yet', 'Group 5': 'Before phase change', 'Group 3': 'Before phase change' },
      steps: [
        { lines: [0, 1], changes: { 'Routine being called': 'PHASCHNG', 'Group 5': 'Retain accelerometer task (per source comment)' }, text: 'TC PHASCHNG calls the phase-change routine; OCT 00035 supplies a parameter. The source comment says this call retains the PIPA accelerometer task. The parameter is data, not another processor instruction.' },
        { lines: [2, 3, 4], changes: { 'Group 3': 'Guidance protected; priority configured' }, text: 'The second call supplies two octal parameter words. The original comments identify guidance protection and its priority. This step summarizes the called routine; its internal operations are outside this excerpt.' }
      ]
    },
    alarm: {
      initial: { Q: 'Caller return information', 'A register': 'Previous value', 'Control flow': 'Executive: no free core set', 'Alarm parameter': 'Not passed yet' },
      steps: [
        { lines: [0], changes: { 'A register': 'Copy of Q (caller information)' }, text: 'CA Q copies Q into A before the next control transfer changes Q. The walkthrough shows symbolic information, not an invented numeric address.' },
        { lines: [1, 2], changes: { 'Control flow': 'BAILOUT1 routine', 'Alarm parameter': '1202 octal / 642 decimal' }, text: 'TC BAILOUT1 transfers control to the bailout routine. The following word contains its 1202 alarm parameter. The routine consumes that data; the processor does not execute an instruction called OCT.' }
      ]
    },
    vector: {
      initial: { 'Execution mode': 'Native AGC instructions', 'UNIT/R/': '(1, 0, 0) — illustrative unit vector', 'Interpreter accumulator': 'Previous vector', 'UNWC/2': 'Previous vector' },
      steps: [
        { lines: [0], changes: { 'Execution mode': 'AGC software interpreter' }, text: 'TC INTPRET calls the interpreter. It will read the mathematical instructions that follow.' },
        { lines: [1, 2], changes: { 'Interpreter accumulator': '(1, 0, 0)' }, text: 'VLOAD reads the vector at UNIT/R/. Its operand is on the next line. We use an invented unit vector to show the data flow; it is not a recorded Apollo flight value.' },
        { lines: [3], changes: { 'UNWC/2': '(1, 0, 0)' }, text: 'STORE UNWC/2 writes the working vector to that named destination. It copies several components, rather than treating the vector as a single ordinary scalar.' },
        { lines: [4], changes: { 'Execution mode': 'Native AGC instructions again' }, text: 'EXIT leaves the interpreter. Execution resumes with the next basic instruction, TCF STEER?, shown in the full listing.' }
      ]
    }
  };
  const codeChoice = el('code-example');
  let codeIndex = 0, codeState = {};
  function paintCodeState() {
    el('trace-memory').replaceChildren(...Object.entries(codeState).flatMap(([name, value]) => {
      const term = document.createElement('dt'), description = document.createElement('dd');
      term.textContent = name; description.textContent = value;
      return [term, description];
    }));
  }
  function restartCode() {
    codeIndex = 0;
    codeState = { ...walkthroughs[codeChoice.value].initial };
    const source = document.querySelector(`[data-code-example="${codeChoice.value}"] .mh-code code`).textContent;
    el('trace-lines').replaceChildren(...source.split('\n').map(line => {
      const span = document.createElement('span'); span.className = 'mh-code-line';
      span.textContent = line; return span;
    }));
    paintCodeState(); el('code-step').disabled = false;
    el('code-explanation').textContent = 'Ready. Predict which value or control state will change, then select Next code step.';
  }
  el('code-step').addEventListener('click', () => {
    const example = walkthroughs[codeChoice.value];
    const current = example.steps[codeIndex];
    if (!current) return;
    Object.assign(codeState, current.changes);
    el('trace-lines').querySelectorAll('.mh-code-line').forEach((line, i) => line.classList.toggle('is-current', current.lines.includes(i)));
    paintCodeState(); codeIndex++;
    el('code-explanation').textContent = `Step ${codeIndex} of ${example.steps.length}. ${current.text}${codeIndex === example.steps.length ? ' Walkthrough complete. Restart or choose another excerpt.' : ''}`;
    el('code-step').disabled = codeIndex === example.steps.length;
  });
  el('code-reset').addEventListener('click', restartCode);
  codeChoice.addEventListener('change', restartCode);
  restartCode();
  reset();
})();
