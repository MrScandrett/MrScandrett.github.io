'use strict';
const items = [
  ['A human group selects targets and uses an AI agent to carry out attack tasks.', 0, 'Human-directed misuse. Automated execution does not mean the AI chose the targets or invented the criminal goal.'],
  ['An agent in a cybersecurity evaluation reaches a real company because internet access was mistakenly left open.', 1, 'A boundary failure with real-world consequences. Investigate both containment and model behavior; calling it a test does not make the harm fictional.'],
  ['A model leaks fictional documents in a deliberately constrained company-role experiment.', 2, 'A controlled research finding. It reveals a risk under those conditions, not a documented leak from a real company.'],
  ['A headline says an AI is angry, but provides no evidence of feelings or independent motives.', 3, 'Unsupported interpretation. Harmful behavior alone does not establish consciousness, emotion, or independent goals.']
];
const labels = ['Human-directed misuse', 'Real-world test boundary failure', 'Fictional research scenario', 'Unsupported interpretation'];
const answers = new Map();
const questions = document.querySelector('#questions');
items.forEach(([prompt, correct, explain], index) => {
  const card = document.createElement('article');
  card.className = 'question';
  const title = document.createElement('h3');
  title.textContent = `${index + 1}. ${prompt}`;
  card.append(title);
  const choices = document.createElement('div');
  choices.className = 'choices';
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-label', `Classify report ${index + 1}`);
  const feedback = document.createElement('p');
  feedback.className = 'feedback';
  feedback.setAttribute('role', 'status');
  labels.forEach((label, value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      choices.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
      answers.set(index, value === correct);
      feedback.textContent = (value === correct ? 'Correct. ' : 'Reconsider. ') + explain;
      document.querySelector('#quiz-score').textContent = `${[...answers.values()].filter(Boolean).length} of 4 correct; ${answers.size} classified.`;
    });
    choices.append(button);
  });
  card.append(choices, feedback);
  questions.append(card);
});
document.querySelector('#reset-quiz').addEventListener('click', () => {
  answers.clear();
  questions.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  questions.querySelectorAll('.feedback').forEach((p) => { p.textContent = ''; });
  document.querySelector('#quiz-score').textContent = 'Classifications reset.';
});

const form = document.querySelector('#defenses');
const steps = [...document.querySelectorAll('#path li')];
const liveSvg = document.querySelector('#ah-live-svg');
const checked = (id) => Boolean(document.getElementById(id)?.checked);

function computeStopIndex() {
  return checked('instruction') ? 1
    : checked('permission') ? 2
      : (checked('network') || checked('approval')) ? 3 : 4;
}

function renderDefenseSvg(tested) {
  if (!liveSvg) return;
  const ns = 'http://www.w3.org/2000/svg';
  const stop = computeStopIndex();
  const hasInst = checked('instruction');
  const hasPerm = checked('permission');
  const hasEgress = checked('network') || checked('approval');
  const hasLog = checked('logging');

  const stages = [
    { label: '1 · Read Page', gate: 'Allowed', armed: false, gateIndex: 0 },
    { label: '2 · Parse Rule', gate: hasInst ? 'Data Gate ON' : 'No Data Gate', armed: hasInst, gateIndex: 1 },
    { label: '3 · Read File', gate: hasPerm ? 'ACL ON' : 'ACL Open', armed: hasPerm, gateIndex: 2 },
    { label: '4 · Send Out', gate: hasEgress ? 'Egress ON' : 'Egress Open', armed: hasEgress, gateIndex: 3 }
  ];

  const nodes = [];
  const el = (tag, attrs, text) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    if (text != null) n.textContent = text;
    return n;
  };

  stages.forEach((stage, i) => {
    const x = 12 + i * 136;
    const isStoppedHere = tested && stop === i;
    const isPassedBeforeStop = tested && i < stop;
    const isBreachedEnd = tested && stop === 4 && i === 3;
    const isSkippedAfterStop = tested && stop < 4 && i > stop;

    let fill = '#122631';
    let stroke = stage.armed ? '#86efd1' : '#35505b';
    let titleColor = '#edf5f4';
    let subColor = stage.armed ? '#86efd1' : '#94b2b7';
    let opacity = '1';

    if (isStoppedHere) {
      fill = '#2d3325';
      stroke = '#ffdb88';
      subColor = '#ffdb88';
    } else if (isBreachedEnd) {
      fill = '#3d1d24';
      stroke = '#fb7185';
      subColor = '#fda4af';
    } else if (isPassedBeforeStop) {
      fill = '#15323c';
      stroke = '#38bdf8';
    } else if (isSkippedAfterStop) {
      opacity = '0.45';
    }

    const g = el('g', { opacity });
    g.append(el('rect', { x, y: 18, width: 122, height: 74, rx: 9, fill, stroke, 'stroke-width': isStoppedHere || isBreachedEnd ? 2.5 : 1.5 }));
    g.append(el('text', { x: x + 61, y: 40, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': 11.5, 'font-weight': 700, fill: titleColor }, stage.label));

    const badgeFill = stage.armed ? '#145344' : '#1b2f3a';
    g.append(el('rect', { x: x + 10, y: 52, width: 102, height: 22, rx: 6, fill: badgeFill }));
    const statusText = isStoppedHere ? 'BLOCKED HERE' : isBreachedEnd ? 'SENT OUT!' : stage.gate;
    g.append(el('text', { x: x + 61, y: 67, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': 10, 'font-weight': 700, fill: subColor }, statusText));
    nodes.push(g);

    if (i < 3) {
      const ax = x + 123;
      const lineStroke = tested && stop <= i ? '#475569' : '#86efd1';
      nodes.push(el('line', { x1: ax, y1: 55, x2: ax + 11, y2: 55, stroke: lineStroke, 'stroke-width': 2 }));
    }
  });

  // Audit Log strip across bottom
  const logRectFill = hasLog ? '#143831' : '#162833';
  const logStroke = hasLog ? '#86efd1' : '#35505b';
  nodes.push(el('rect', { x: 12, y: 108, width: 530, height: 34, rx: 8, fill: logRectFill, stroke: logStroke, 'stroke-width': 1.5, 'stroke-dasharray': hasLog ? 'none' : '4 3' }));
  const logMsg = hasLog
    ? (tested ? 'Audit Log ON · Tool calls & attempted target recorded for investigation' : 'Audit Log ON · Observes all 4 steps (records forensics, does not block)')
    : 'Audit Log OFF · No forensic record saved if an attempt happens';
  nodes.push(el('text', { x: 277, y: 129, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': 11, 'font-weight': hasLog ? 700 : 500, fill: hasLog ? '#86efd1' : '#94b2b7' }, logMsg));

  liveSvg.replaceChildren(...nodes);
}

renderDefenseSvg(false);

form.querySelectorAll('input[type="checkbox"]').forEach((box) => {
  box.addEventListener('change', () => renderDefenseSvg(false));
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const prediction = document.querySelector('#prediction');
  if (!prediction.value) {
    document.querySelector('#result').textContent = 'Choose your prediction first.';
    prediction.focus();
    return;
  }
  const stop = computeStopIndex();
  steps.forEach((li, i) => { li.className = i < stop ? 'done' : i === stop ? 'stopped' : ''; });
  renderDefenseSvg(true);
  const reasons = [
    '',
    'The untrusted page instruction is rejected.',
    'The tool cannot read the private file.',
    checked('network') ? 'The unapproved destination is blocked.' : 'The informed reviewer refuses the send.',
    'No preventive control stops the fictional send.'
  ];
  const blocked = stop < 4;
  document.querySelector('#result').textContent = `${blocked ? 'Stopped' : 'Fictional data sent'}. ${reasons[stop]} ${checked('logging') ? 'Audit logging records the attempt.' : 'Without an audit log, investigating the attempt is harder.'} Your prediction ${prediction.value === (blocked ? 'blocked' : 'sent') ? 'matched' : 'did not match'} the model. ${blocked ? 'Disable this blocking layer and retest to see whether another layer catches it.' : ''}`;
});

document.querySelector('#reset-lab').addEventListener('click', () => {
  form.reset();
  steps.forEach((li) => { li.className = ''; });
  renderDefenseSvg(false);
  document.querySelector('#result').textContent = 'Choose a prediction and run the test.';
});
