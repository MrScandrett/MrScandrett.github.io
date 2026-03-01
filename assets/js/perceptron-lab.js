const x1Input = document.getElementById("p-x1");
const x2Input = document.getElementById("p-x2");
const x1Value = document.getElementById("p-x1-value");
const x2Value = document.getElementById("p-x2-value");

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

const accuracyOutput = document.getElementById("p-accuracy");
const epochsOutput = document.getElementById("p-epochs");
const separableOutput = document.getElementById("p-separable");
const tableBody = document.getElementById("p-table-body");

const presetButtons = Array.from(document.querySelectorAll("[data-preset]"));
const diagnostics = document.querySelector(".perceptron-diagnostics");
const diagnosticsSummary = diagnostics ? diagnostics.querySelector("summary") : null;

const required = [
  x1Input,
  x2Input,
  x1Value,
  x2Value,
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
  accuracyOutput,
  epochsOutput,
  separableOutput,
  tableBody
];

if (required.some((node) => !node) || presetButtons.length === 0) {
  throw new Error("Perceptron Lab could not initialize. Missing required DOM nodes.");
}

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

const state = {
  datasetKey: "and",
  epochs: 0
};

function round2(value) {
  return Math.round(value * 100) / 100;
}

function asNumber(input, fallback) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function readParams() {
  return {
    w1: asNumber(w1Input, DEFAULT_PARAMS.w1),
    w2: asNumber(w2Input, DEFAULT_PARAMS.w2),
    bias: asNumber(biasInput, DEFAULT_PARAMS.bias),
    lr: Math.max(0.01, asNumber(lrInput, DEFAULT_PARAMS.lr))
  };
}

function writeParams(params) {
  w1Input.value = String(round2(params.w1));
  w2Input.value = String(round2(params.w2));
  biasInput.value = String(round2(params.bias));
  lrInput.value = String(round2(params.lr));
}

function predict(x1, x2, params) {
  const z = x1 * params.w1 + x2 * params.w2 + params.bias;
  const yHat = z >= 0 ? 1 : 0;
  return { z, yHat };
}

function currentDataset() {
  return DATASETS[state.datasetKey] || DATASETS.and;
}

function setPreset(datasetKey) {
  if (!DATASETS[datasetKey]) return;
  state.datasetKey = datasetKey;
  state.epochs = 0;

  for (const button of presetButtons) {
    const isActive = button.dataset.preset === datasetKey;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}

function updateManualReadout() {
  x1Value.textContent = Number(x1Input.value).toFixed(1);
  x2Value.textContent = Number(x2Input.value).toFixed(1);
}

function evaluateDataset(params) {
  const dataset = currentDataset();
  const rows = dataset.samples.map((sample) => {
    const result = predict(sample.x1, sample.x2, params);
    const error = sample.y - result.yHat;
    return {
      ...sample,
      yHat: result.yHat,
      error
    };
  });

  const correct = rows.filter((row) => row.error === 0).length;
  return {
    rows,
    correct,
    total: rows.length,
    separable: dataset.separable,
    caseLabel: dataset.caseLabel
  };
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

function renderManualPrediction(params) {
  const x1 = Number(x1Input.value);
  const x2 = Number(x2Input.value);
  const result = predict(x1, x2, params);

  sumOutput.textContent = result.z.toFixed(2);
  predictionOutput.textContent = String(result.yHat);
  thresholdOutput.textContent = (-params.bias).toFixed(2);
}

function renderAll() {
  const params = readParams();
  updateManualReadout();
  renderManualPrediction(params);

  const evaluation = evaluateDataset(params);
  renderTable(evaluation.rows);

  datasetCaseOutput.textContent = evaluation.caseLabel;
  accuracyOutput.textContent = `${evaluation.correct} / ${evaluation.total}`;
  separableOutput.textContent = evaluation.separable ? "YES" : "NO";
  epochsOutput.textContent = String(state.epochs);
}

function trainOneEpoch() {
  const params = readParams();
  const dataset = currentDataset();

  for (const sample of dataset.samples) {
    const result = predict(sample.x1, sample.x2, params);
    const error = sample.y - result.yHat;

    if (error !== 0) {
      params.w1 += params.lr * error * sample.x1;
      params.w2 += params.lr * error * sample.x2;
      params.bias += params.lr * error;
    }
  }

  writeParams(params);
  state.epochs += 1;
}

function resetParameters() {
  writeParams(DEFAULT_PARAMS);
  state.epochs = 0;
  renderAll();
}

predictButton.addEventListener("click", () => {
  renderAll();
});

train1Button.addEventListener("click", () => {
  trainOneEpoch();
  renderAll();
});

train5Button.addEventListener("click", () => {
  for (let i = 0; i < 5; i += 1) {
    trainOneEpoch();
  }
  renderAll();
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

[x1Input, x2Input, w1Input, w2Input, biasInput, lrInput].forEach((input) => {
  input.addEventListener("input", () => {
    renderAll();
  });
});

if (diagnostics && diagnosticsSummary) {
  diagnostics.addEventListener("toggle", () => {
    diagnosticsSummary.textContent = diagnostics.open ? "CLOSE DIAGNOSTICS" : "OPEN DIAGNOSTICS";
  });
}

setPreset(state.datasetKey);
resetParameters();
