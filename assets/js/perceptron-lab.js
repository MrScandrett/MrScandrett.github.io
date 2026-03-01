const x1Input = document.getElementById("p-x1");
const x2Input = document.getElementById("p-x2");
const x1Value = document.getElementById("p-x1-value");
const x2Value = document.getElementById("p-x2-value");

const w1Range = document.getElementById("p-w1-range");
const w2Range = document.getElementById("p-w2-range");
const biasRange = document.getElementById("p-bias-range");
const lrRange = document.getElementById("p-lr-range");

const w1Input = document.getElementById("p-w1");
const w2Input = document.getElementById("p-w2");
const biasInput = document.getElementById("p-bias");
const lrInput = document.getElementById("p-lr");

const predictButton = document.getElementById("p-predict");
const train1Button = document.getElementById("p-train-1");
const train5Button = document.getElementById("p-train-5");
const resetButton = document.getElementById("p-reset");

const sumOutput = document.getElementById("p-sum");
const predictionOutput = document.getElementById("p-prediction");
const thresholdOutput = document.getElementById("p-threshold");
const datasetCaseOutput = document.getElementById("p-dataset-case");
const scoreLabel = document.getElementById("p-score-label");

const accuracyInline = document.getElementById("p-accuracy-inline");
const accuracyBar = document.getElementById("p-accuracy-bar");

const accuracyOutput = document.getElementById("p-accuracy");
const epochsOutput = document.getElementById("p-epochs");
const separableOutput = document.getElementById("p-separable");
const tableBody = document.getElementById("p-table-body");

const graphCanvas = document.getElementById("p-graph");
const xorToggle = document.getElementById("p-xor-toggle");
const xorPanel = document.getElementById("p-xor-proof");
const xorCanvas = document.getElementById("p-xor-canvas");
const xorAngle = document.getElementById("p-xor-angle");
const xorOffset = document.getElementById("p-xor-offset");
const xorProofText = document.getElementById("p-xor-proof-text");

const eqTermW1 = document.getElementById("p-eq-term-w1");
const eqTermW2 = document.getElementById("p-eq-term-w2");
const eqTermBias = document.getElementById("p-eq-term-bias");

const analystBlock = document.getElementById("p-analyst-block");
const architectBlock = document.getElementById("p-architect-block");
const modeGuidance = document.getElementById("p-mode-guidance");
const eraNote = document.getElementById("p-era-note");

const consoleRoot = document.getElementById("perceptron-console");
const diagnostics = document.getElementById("p-diagnostics");
const diagnosticsSummary = diagnostics ? diagnostics.querySelector("summary") : null;

const contrastToggle = document.getElementById("p-toggle-contrast");
const dyslexiaToggle = document.getElementById("p-toggle-dyslexia");
const printButton = document.getElementById("p-print");

const presetButtons = Array.from(document.querySelectorAll("button[data-preset]"));
const gradeButtons = Array.from(document.querySelectorAll("button[data-grade-mode]"));
const eraButtons = Array.from(document.querySelectorAll("button[data-era-mode]"));

const required = [
  x1Input,
  x2Input,
  x1Value,
  x2Value,
  w1Range,
  w2Range,
  biasRange,
  lrRange,
  w1Input,
  w2Input,
  biasInput,
  lrInput,
  predictButton,
  train1Button,
  train5Button,
  resetButton,
  sumOutput,
  predictionOutput,
  thresholdOutput,
  datasetCaseOutput,
  scoreLabel,
  accuracyInline,
  accuracyBar,
  accuracyOutput,
  epochsOutput,
  separableOutput,
  tableBody,
  graphCanvas,
  xorToggle,
  xorPanel,
  xorCanvas,
  xorAngle,
  xorOffset,
  xorProofText,
  eqTermW1,
  eqTermW2,
  eqTermBias,
  analystBlock,
  architectBlock,
  modeGuidance,
  eraNote,
  consoleRoot,
  diagnostics,
  contrastToggle,
  dyslexiaToggle,
  printButton
];

if (required.some((node) => !node) || presetButtons.length === 0 || gradeButtons.length === 0 || eraButtons.length === 0) {
  throw new Error("Perceptron Lab v2 could not initialize. Missing required DOM nodes.");
}

const STORAGE_KEY = "perceptron_lab_state_v2";

const DEFAULT_PARAMS = {
  w1: 0.4,
  w2: 0.4,
  bias: -0.2,
  lr: 0.2
};

const DATASETS = {
  and: {
    caseLabel: "AND: WORKING CASE",
    separable: true,
    samples: [
      { x1: 0, x2: 0, y: 0 },
      { x1: 0, x2: 1, y: 0 },
      { x1: 1, x2: 0, y: 0 },
      { x1: 1, x2: 1, y: 1 }
    ]
  },
  or: {
    caseLabel: "OR: WORKING CASE",
    separable: true,
    samples: [
      { x1: 0, x2: 0, y: 0 },
      { x1: 0, x2: 1, y: 1 },
      { x1: 1, x2: 0, y: 1 },
      { x1: 1, x2: 1, y: 1 }
    ]
  },
  nand: {
    caseLabel: "NAND: WORKING CASE",
    separable: true,
    samples: [
      { x1: 0, x2: 0, y: 1 },
      { x1: 0, x2: 1, y: 1 },
      { x1: 1, x2: 0, y: 1 },
      { x1: 1, x2: 1, y: 0 }
    ]
  },
  xor: {
    caseLabel: "XOR: IMPOSSIBLE CASE (SINGLE LAYER)",
    separable: false,
    samples: [
      { x1: 0, x2: 0, y: 0 },
      { x1: 0, x2: 1, y: 1 },
      { x1: 1, x2: 0, y: 1 },
      { x1: 1, x2: 1, y: 0 }
    ]
  }
};

const MODE_META = {
  explorer: {
    scoreLabel: "SCORE BEFORE DECISION",
    guidance:
      "Explorer mode: Use plain-language cues. Start with presets, move one control, and watch line + points together."
  },
  analyst: {
    scoreLabel: "Z (WEIGHTED SUM)",
    guidance:
      "Analyst mode: Track z, y^, and the update rule w = w + eta*error*x as each epoch shifts the boundary."
  },
  architect: {
    scoreLabel: "Z (WEIGHTED SUM)",
    guidance:
      "Architect mode: Compare single-layer behavior with hidden-layer intuition for XOR and non-linear boundaries."
  }
};

const ERA_META = {
  "1958": {
    note: "1958 Hardware Mode: slower training, mild channel noise, and constrained learning rate to simulate physical demo limits.",
    stepDelay: 140,
    interpSteps: 8,
    noise: 0.04,
    lrCap: 0.35
  },
  "2012": {
    note: "2012 Deep Learning Mode: faster training feedback and modern comparison framing around scaling and representation depth.",
    stepDelay: 45,
    interpSteps: 4,
    noise: 0,
    lrCap: 1
  }
};

const state = {
  datasetKey: "and",
  epochs: 0,
  gradeMode: "explorer",
  eraMode: "1958",
  showXorProof: false,
  highContrast: false,
  dyslexicFont: false,
  activeSampleIndex: null,
  trainingBusy: false
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function setPair(rangeInput, numberInput, value) {
  const v = round2(value);
  rangeInput.value = String(v);
  numberInput.value = String(v);
}

function readParams() {
  return {
    w1: Number(w1Input.value),
    w2: Number(w2Input.value),
    bias: Number(biasInput.value),
    lr: clamp(Number(lrInput.value), 0.05, ERA_META[state.eraMode].lrCap)
  };
}

function writeParams(params) {
  setPair(w1Range, w1Input, params.w1);
  setPair(w2Range, w2Input, params.w2);
  setPair(biasRange, biasInput, params.bias);
  setPair(lrRange, lrInput, clamp(params.lr, 0.05, ERA_META[state.eraMode].lrCap));
}

function predict(x1, x2, params) {
  const z = x1 * params.w1 + x2 * params.w2 + params.bias;
  const yHat = z >= 0 ? 1 : 0;
  return { z, yHat };
}

function currentDataset() {
  return DATASETS[state.datasetKey] || DATASETS.and;
}

function updateControlClasses() {
  consoleRoot.classList.toggle("perceptron-high-contrast", state.highContrast);
  consoleRoot.classList.toggle("perceptron-dyslexic", state.dyslexicFont);
  consoleRoot.dataset.gradeMode = state.gradeMode;
  consoleRoot.dataset.era = state.eraMode;
}

function setGradeMode(mode) {
  if (!MODE_META[mode]) return;
  state.gradeMode = mode;

  for (const button of gradeButtons) {
    const active = button.dataset.gradeMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }

  const meta = MODE_META[mode];
  modeGuidance.textContent = meta.guidance;
  scoreLabel.textContent = meta.scoreLabel;

  analystBlock.hidden = mode === "explorer";
  architectBlock.hidden = mode !== "architect";

  if (mode === "explorer") {
    diagnostics.open = false;
  }

  updateControlClasses();
}

function setEraMode(mode) {
  if (!ERA_META[mode]) return;
  state.eraMode = mode;

  for (const button of eraButtons) {
    const active = button.dataset.eraMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }

  eraNote.textContent = ERA_META[mode].note;

  const params = readParams();
  if (params.lr > ERA_META[mode].lrCap) {
    params.lr = ERA_META[mode].lrCap;
    writeParams(params);
  }

  updateControlClasses();
}

function setPreset(datasetKey) {
  if (!DATASETS[datasetKey]) return;
  state.datasetKey = datasetKey;
  state.epochs = 0;

  for (const button of presetButtons) {
    const active = button.dataset.preset === datasetKey;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }

  if (datasetKey === "xor") {
    separableOutput.textContent = "NO - PROOF TOOL";
  }
}

function toCanvas(point, width, height, padding) {
  return {
    x: padding + point.x * (width - padding * 2),
    y: height - padding - point.y * (height - padding * 2)
  };
}

function boundaryIntersections(params) {
  const eps = 1e-6;
  const points = [];

  if (Math.abs(params.w2) > eps) {
    const yAtX0 = -(params.bias) / params.w2;
    const yAtX1 = -(params.w1 + params.bias) / params.w2;
    if (yAtX0 >= 0 && yAtX0 <= 1) points.push({ x: 0, y: yAtX0 });
    if (yAtX1 >= 0 && yAtX1 <= 1) points.push({ x: 1, y: yAtX1 });
  }

  if (Math.abs(params.w1) > eps) {
    const xAtY0 = -(params.bias) / params.w1;
    const xAtY1 = -(params.w2 + params.bias) / params.w1;
    if (xAtY0 >= 0 && xAtY0 <= 1) points.push({ x: xAtY0, y: 0 });
    if (xAtY1 >= 0 && xAtY1 <= 1) points.push({ x: xAtY1, y: 1 });
  }

  const unique = [];
  for (const pt of points) {
    const dup = unique.some((u) => Math.abs(u.x - pt.x) < 0.001 && Math.abs(u.y - pt.y) < 0.001);
    if (!dup) unique.push(pt);
  }

  return unique.slice(0, 2);
}

function drawGraph(params, evaluation) {
  const ctx = graphCanvas.getContext("2d");
  const w = graphCanvas.width;
  const h = graphCanvas.height;
  const pad = 22;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f8fbff";
  ctx.fillRect(0, 0, w, h);

  const cols = 30;
  const rows = 24;
  for (let gx = 0; gx < cols; gx += 1) {
    for (let gy = 0; gy < rows; gy += 1) {
      const x = (gx + 0.5) / cols;
      const y = (gy + 0.5) / rows;
      const { yHat } = predict(x, y, params);
      ctx.fillStyle = yHat === 1 ? "rgba(67, 145, 87, 0.17)" : "rgba(183, 76, 76, 0.14)";
      const p = toCanvas({ x: gx / cols, y: (gy + 1) / rows }, w, h, pad);
      const q = toCanvas({ x: (gx + 1) / cols, y: gy / rows }, w, h, pad);
      ctx.fillRect(p.x, p.y, q.x - p.x + 1, q.y - p.y + 1);
    }
  }

  ctx.strokeStyle = "#a7afb9";
  ctx.lineWidth = 1;
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

  const linePts = boundaryIntersections(params);
  if (linePts.length === 2) {
    const p0 = toCanvas(linePts[0], w, h, pad);
    const p1 = toCanvas(linePts[1], w, h, pad);
    ctx.strokeStyle = "#1f2933";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  for (let i = 0; i < evaluation.rows.length; i += 1) {
    const row = evaluation.rows[i];
    const point = toCanvas({ x: row.x1, y: row.x2 }, w, h, pad);
    const isMis = row.error !== 0;

    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = isMis ? "#d32222" : row.y === 1 ? "#1b5fcb" : "#2f3b47";
    ctx.fill();

    if (isMis) {
      ctx.strokeStyle = "rgba(211, 34, 34, 0.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (state.activeSampleIndex === i) {
      ctx.strokeStyle = "#f39c12";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 13, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function xorLineParams() {
  const theta = (Number(xorAngle.value) * Math.PI) / 180;
  const offset = Number(xorOffset.value);
  const w1 = Math.cos(theta);
  const w2 = Math.sin(theta);
  const bias = offset - 0.5 * (w1 + w2);
  return { w1, w2, bias };
}

function drawXorProof() {
  if (xorPanel.hidden) return;

  const ctx = xorCanvas.getContext("2d");
  const w = xorCanvas.width;
  const h = xorCanvas.height;
  const pad = 20;
  const params = xorLineParams();
  const xorData = DATASETS.xor.samples;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f9fafc";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#a7afb9";
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

  const linePts = boundaryIntersections(params);
  if (linePts.length === 2) {
    const p0 = toCanvas(linePts[0], w, h, pad);
    const p1 = toCanvas(linePts[1], w, h, pad);
    ctx.strokeStyle = "#1e2730";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  let mis = 0;
  for (const sample of xorData) {
    const point = toCanvas({ x: sample.x1, y: sample.x2 }, w, h, pad);
    const pred = predict(sample.x1, sample.x2, params).yHat;
    const wrong = pred !== sample.y;
    if (wrong) mis += 1;

    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = wrong ? "#d32222" : sample.y === 1 ? "#1b5fcb" : "#2f3b47";
    ctx.fill();
  }

  xorProofText.textContent = `Current line misses ${mis} / 4 XOR points. A single line cannot reach 0 / 4.`;
}

function renderEquation(params) {
  const x1 = Number(x1Input.value);
  const x2 = Number(x2Input.value);

  eqTermW1.textContent = `${params.w1.toFixed(2)}*${x1.toFixed(1)}`;
  eqTermW2.textContent = `${params.w2.toFixed(2)}*${x2.toFixed(1)}`;
  eqTermBias.textContent = `${params.bias.toFixed(2)}`;

  eqTermW1.classList.toggle("is-active", x1 > 0);
  eqTermW2.classList.toggle("is-active", x2 > 0);
  eqTermBias.classList.toggle("is-active", Math.abs(params.bias) > 0.01);
}

function renderTable(rows) {
  tableBody.innerHTML = "";

  for (const row of rows) {
    const tr = document.createElement("tr");
    if (row.error !== 0) tr.classList.add("perceptron-row-error");

    const cells = [row.x1, row.x2, row.y, row.yHat, row.error];
    for (const value of cells) {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.appendChild(td);
    }

    tableBody.appendChild(tr);
  }
}

function evaluateDataset(params) {
  const dataset = currentDataset();
  const rows = dataset.samples.map((sample) => {
    const { yHat } = predict(sample.x1, sample.x2, params);
    const error = sample.y - yHat;
    return { ...sample, yHat, error };
  });

  const correct = rows.filter((row) => row.error === 0).length;
  return {
    rows,
    correct,
    total: rows.length,
    caseLabel: dataset.caseLabel,
    separable: dataset.separable
  };
}

function renderAll({ save = true } = {}) {
  const params = readParams();
  x1Value.textContent = Number(x1Input.value).toFixed(1);
  x2Value.textContent = Number(x2Input.value).toFixed(1);

  const pred = predict(Number(x1Input.value), Number(x2Input.value), params);
  sumOutput.textContent = pred.z.toFixed(2);
  predictionOutput.textContent = String(pred.yHat);
  thresholdOutput.textContent = (-params.bias).toFixed(2);

  const evaluation = evaluateDataset(params);
  datasetCaseOutput.textContent = evaluation.caseLabel;

  const percent = Math.round((evaluation.correct / evaluation.total) * 100);
  accuracyInline.textContent = `ACCURACY ${percent}%`;
  accuracyBar.style.width = `${percent}%`;

  accuracyOutput.textContent = `${evaluation.correct} / ${evaluation.total}`;
  epochsOutput.textContent = String(state.epochs);
  separableOutput.textContent = evaluation.separable ? "YES" : "NO (XOR FAILS)";

  renderEquation(params);
  renderTable(evaluation.rows);
  drawGraph(params, evaluation);
  drawXorProof();

  if (save) saveState();
}

async function animateParamTransition(fromParams, toParams) {
  const steps = ERA_META[state.eraMode].interpSteps;
  const delay = Math.max(20, Math.floor(ERA_META[state.eraMode].stepDelay / steps));

  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const p = {
      w1: fromParams.w1 + (toParams.w1 - fromParams.w1) * t,
      w2: fromParams.w2 + (toParams.w2 - fromParams.w2) * t,
      bias: fromParams.bias + (toParams.bias - fromParams.bias) * t,
      lr: toParams.lr
    };
    writeParams(p);
    renderAll({ save: false });
    await wait(delay);
  }
}

async function trainEpochs(count) {
  if (state.trainingBusy) return;
  state.trainingBusy = true;

  const dataset = currentDataset();
  const era = ERA_META[state.eraMode];

  for (let epoch = 0; epoch < count; epoch += 1) {
    let params = readParams();

    for (let i = 0; i < dataset.samples.length; i += 1) {
      const sample = dataset.samples[i];
      state.activeSampleIndex = i;

      const noisyX1 = clamp(sample.x1 + (Math.random() * 2 - 1) * era.noise, 0, 1);
      const noisyX2 = clamp(sample.x2 + (Math.random() * 2 - 1) * era.noise, 0, 1);

      const result = predict(noisyX1, noisyX2, params);
      const error = sample.y - result.yHat;

      if (error !== 0) {
        const nextParams = {
          ...params,
          w1: params.w1 + params.lr * error * noisyX1,
          w2: params.w2 + params.lr * error * noisyX2,
          bias: params.bias + params.lr * error
        };
        await animateParamTransition(params, nextParams);
        params = nextParams;
      } else {
        renderAll({ save: false });
        await wait(Math.floor(era.stepDelay * 0.5));
      }

      writeParams(params);
      renderAll({ save: false });
      await wait(era.stepDelay);
    }

    state.epochs += 1;
  }

  state.activeSampleIndex = null;
  state.trainingBusy = false;
  renderAll();
}

function resetParameters() {
  writeParams(DEFAULT_PARAMS);
  state.epochs = 0;
  state.activeSampleIndex = null;
  renderAll();
}

function saveState() {
  const payload = {
    datasetKey: state.datasetKey,
    epochs: state.epochs,
    gradeMode: state.gradeMode,
    eraMode: state.eraMode,
    showXorProof: state.showXorProof,
    highContrast: state.highContrast,
    dyslexicFont: state.dyslexicFont,
    x1: Number(x1Input.value),
    x2: Number(x2Input.value),
    params: readParams(),
    xorAngle: Number(xorAngle.value),
    xorOffset: Number(xorOffset.value),
    diagnosticsOpen: diagnostics.open
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_error) {
    // ignore localStorage failures
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);

    if (saved.datasetKey && DATASETS[saved.datasetKey]) state.datasetKey = saved.datasetKey;
    if (MODE_META[saved.gradeMode]) state.gradeMode = saved.gradeMode;
    if (ERA_META[saved.eraMode]) state.eraMode = saved.eraMode;

    state.epochs = Number.isFinite(saved.epochs) ? saved.epochs : 0;
    state.showXorProof = Boolean(saved.showXorProof);
    state.highContrast = Boolean(saved.highContrast);
    state.dyslexicFont = Boolean(saved.dyslexicFont);

    x1Input.value = String(clamp(finiteOr(Number(saved.x1), Number(x1Input.value)), 0, 1));
    x2Input.value = String(clamp(finiteOr(Number(saved.x2), Number(x2Input.value)), 0, 1));

    const params = saved.params || DEFAULT_PARAMS;
    writeParams({
      w1: Number.isFinite(params.w1) ? params.w1 : DEFAULT_PARAMS.w1,
      w2: Number.isFinite(params.w2) ? params.w2 : DEFAULT_PARAMS.w2,
      bias: Number.isFinite(params.bias) ? params.bias : DEFAULT_PARAMS.bias,
      lr: Number.isFinite(params.lr) ? params.lr : DEFAULT_PARAMS.lr
    });

    xorAngle.value = String(clamp(Number(saved.xorAngle), -85, 85));
    xorOffset.value = String(clamp(Number(saved.xorOffset), -1, 1));

    diagnostics.open = Boolean(saved.diagnosticsOpen);
  } catch (_error) {
    // ignore invalid storage
  }
}

function syncRangeAndNumber(rangeInput, numberInput, min, max) {
  const syncFromRange = () => {
    numberInput.value = rangeInput.value;
    renderAll();
  };

  const syncFromNumber = () => {
    const value = clamp(Number(numberInput.value), min, max);
    rangeInput.value = String(value);
    numberInput.value = String(value);
    renderAll();
  };

  rangeInput.addEventListener("input", syncFromRange);
  numberInput.addEventListener("input", syncFromNumber);
}

predictButton.addEventListener("click", () => {
  renderAll();
});

train1Button.addEventListener("click", async () => {
  await trainEpochs(1);
});

train5Button.addEventListener("click", async () => {
  await trainEpochs(5);
});

resetButton.addEventListener("click", () => {
  resetParameters();
});

for (const button of presetButtons) {
  button.addEventListener("click", () => {
    setPreset(button.dataset.preset || "and");
    resetParameters();
  });
}

for (const button of gradeButtons) {
  button.addEventListener("click", () => {
    setGradeMode(button.dataset.gradeMode || "explorer");
    renderAll();
  });
}

for (const button of eraButtons) {
  button.addEventListener("click", () => {
    setEraMode(button.dataset.eraMode || "1958");
    renderAll();
  });
}

x1Input.addEventListener("input", () => renderAll());
x2Input.addEventListener("input", () => renderAll());

syncRangeAndNumber(w1Range, w1Input, -2, 2);
syncRangeAndNumber(w2Range, w2Input, -2, 2);
syncRangeAndNumber(biasRange, biasInput, -2, 2);
syncRangeAndNumber(lrRange, lrInput, 0.05, 1);

xorToggle.addEventListener("click", () => {
  state.showXorProof = !state.showXorProof;
  xorPanel.hidden = !state.showXorProof;
  xorToggle.textContent = state.showXorProof ? "Hide XOR proof" : "Show why XOR fails";
  drawXorProof();
  saveState();
});

xorAngle.addEventListener("input", () => {
  drawXorProof();
  saveState();
});

xorOffset.addEventListener("input", () => {
  drawXorProof();
  saveState();
});

contrastToggle.addEventListener("change", () => {
  state.highContrast = contrastToggle.checked;
  updateControlClasses();
  saveState();
});

dyslexiaToggle.addEventListener("change", () => {
  state.dyslexicFont = dyslexiaToggle.checked;
  updateControlClasses();
  saveState();
});

printButton.addEventListener("click", () => {
  window.print();
});

if (diagnostics && diagnosticsSummary) {
  diagnostics.addEventListener("toggle", () => {
    diagnosticsSummary.textContent = diagnostics.open ? "CLOSE DIAGNOSTICS" : "OPEN DIAGNOSTICS";
    saveState();
  });
}

loadState();
setGradeMode(state.gradeMode);
setEraMode(state.eraMode);
setPreset(state.datasetKey);

contrastToggle.checked = state.highContrast;
dyslexiaToggle.checked = state.dyslexicFont;
updateControlClasses();

xorPanel.hidden = !state.showXorProof;
xorToggle.textContent = state.showXorProof ? "Hide XOR proof" : "Show why XOR fails";

if (diagnosticsSummary) {
  diagnosticsSummary.textContent = diagnostics.open ? "CLOSE DIAGNOSTICS" : "OPEN DIAGNOSTICS";
}

renderAll({ save: false });
saveState();
