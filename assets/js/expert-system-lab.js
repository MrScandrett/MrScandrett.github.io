const factsContainer = document.getElementById("expert-facts");
const rulesEditor = document.getElementById("expert-rules-editor");
const rulesStatus = document.getElementById("expert-rules-status");

const runButton = document.getElementById("expert-run");
const clearFactsButton = document.getElementById("expert-clear-facts");
const loadDefaultsButton = document.getElementById("expert-load-defaults");

const conflictSelect = document.getElementById("expert-conflict");
const maxPassesInput = document.getElementById("expert-max-passes");

const metricRules = document.getElementById("expert-metric-rules");
const metricFired = document.getElementById("expert-metric-fired");
const metricPasses = document.getElementById("expert-metric-passes");
const metricConclusions = document.getElementById("expert-metric-conclusions");

const conclusionsBody = document.getElementById("expert-conclusions");
const traceList = document.getElementById("expert-trace");

const required = [
  factsContainer,
  rulesEditor,
  rulesStatus,
  runButton,
  clearFactsButton,
  loadDefaultsButton,
  conflictSelect,
  maxPassesInput,
  metricRules,
  metricFired,
  metricPasses,
  metricConclusions,
  conclusionsBody,
  traceList
];

if (required.some((node) => !node)) {
  throw new Error("Expert System Lab could not initialize. Missing required DOM nodes.");
}

const FACT_CATALOG = [
  "fever",
  "cough",
  "body_aches",
  "sore_throat",
  "strep_test_positive",
  "runny_nose",
  "sneezing",
  "itchy_eyes",
  "fatigue",
  "chills",
  "nausea",
  "chest_pain"
];

const DEFAULT_RULES = [
  {
    id: "R1",
    if: [
      { fact: "fever", min: 0.6 },
      { fact: "cough", min: 0.5 },
      { fact: "body_aches", min: 0.5 }
    ],
    then: { fact: "flu", certainty: 0.75, sign: 1 },
    note: "Fever + cough + aches supports influenza pattern"
  },
  {
    id: "R2",
    if: [
      { fact: "chills", min: 0.5 },
      { fact: "fatigue", min: 0.5 }
    ],
    then: { fact: "flu", certainty: 0.55, sign: 1 },
    note: "Chills + fatigue adds supporting evidence for flu"
  },
  {
    id: "R3",
    if: [
      { fact: "strep_test_positive", min: 0.8 },
      { fact: "sore_throat", min: 0.5 }
    ],
    then: { fact: "strep", certainty: 0.92, sign: 1 },
    note: "Positive strep test strongly supports strep"
  },
  {
    id: "R4",
    if: [
      { fact: "sneezing", min: 0.5 },
      { fact: "itchy_eyes", min: 0.5 },
      { fact: "runny_nose", min: 0.4 }
    ],
    then: { fact: "allergy", certainty: 0.8, sign: 1 },
    note: "Classic allergy cluster"
  },
  {
    id: "R5",
    if: [
      { fact: "runny_nose", min: 0.5 },
      { fact: "cough", min: 0.4 }
    ],
    then: { fact: "cold", certainty: 0.65, sign: 1 },
    note: "Runny nose + cough aligns with common cold"
  },
  {
    id: "R6",
    if: [
      { fact: "fever", min: 0.5 },
      { fact: "sneezing", min: 0.5 }
    ],
    then: { fact: "allergy", certainty: 0.45, sign: -1 },
    note: "Fever pushes against pure allergy explanation"
  },
  {
    id: "R7",
    if: [
      { fact: "strep", min: 0.7 }
    ],
    then: { fact: "antibiotic_discussion", certainty: 0.75, sign: 1 },
    note: "Likely bacterial path may require targeted treatment"
  },
  {
    id: "R8",
    if: [
      { fact: "flu", min: 0.65 }
    ],
    then: { fact: "rest_hydrate", certainty: 0.8, sign: 1 },
    note: "Supportive care recommendation for flu-like presentation"
  },
  {
    id: "R9",
    if: [
      { fact: "cold", min: 0.6 }
    ],
    then: { fact: "rest_hydrate", certainty: 0.6, sign: 1 },
    note: "Supportive care recommendation for cold"
  },
  {
    id: "R10",
    if: [
      { fact: "chest_pain", min: 0.5 }
    ],
    then: { fact: "urgent_eval", certainty: 0.95, sign: 1 },
    note: "Safety escalation rule"
  },
  {
    id: "R11",
    if: [
      { fact: "flu", min: 0.6 },
      { fact: "nausea", min: 0.4 }
    ],
    then: { fact: "school_absence", certainty: 0.7, sign: 1 },
    note: "Composite severity may justify absence"
  },
  {
    id: "R12",
    if: [
      { fact: "allergy", min: 0.6 }
    ],
    then: { fact: "antibiotic_discussion", certainty: 0.55, sign: -1 },
    note: "Allergy evidence argues against antibiotic path"
  },
  {
    id: "R13",
    if: [
      { fact: "strep", min: 0.65 },
      { fact: "flu", min: 0.65 }
    ],
    then: { fact: "diagnostic_conflict", certainty: 0.85, sign: 1 },
    note: "Competing strong conclusions require deeper review"
  }
];

function titleCaseFact(value) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function readJsonRules() {
  let parsed;
  try {
    parsed = JSON.parse(rulesEditor.value);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Rule base must be an array of rule objects.");
  }

  for (let i = 0; i < parsed.length; i += 1) {
    const rule = parsed[i];
    const prefix = `Rule ${i + 1}`;

    if (!rule || typeof rule !== "object") {
      throw new Error(`${prefix} must be an object.`);
    }

    if (!Array.isArray(rule.if) || rule.if.length === 0) {
      throw new Error(`${prefix} must include non-empty 'if' conditions.`);
    }

    if (!rule.then || typeof rule.then !== "object") {
      throw new Error(`${prefix} must include a 'then' object.`);
    }

    if (typeof rule.then.fact !== "string") {
      throw new Error(`${prefix} then.fact must be a string.`);
    }

    const certainty = Number(rule.then.certainty);
    if (!Number.isFinite(certainty) || certainty < 0 || certainty > 1) {
      throw new Error(`${prefix} then.certainty must be between 0 and 1.`);
    }

    for (const cond of rule.if) {
      if (!cond || typeof cond.fact !== "string") {
        throw new Error(`${prefix} every condition must include fact string.`);
      }
      const min = Number(cond.min ?? 0.5);
      if (!Number.isFinite(min) || min < 0 || min > 1) {
        throw new Error(`${prefix} condition min must be between 0 and 1.`);
      }
    }
  }

  return parsed;
}

function mycinCombine(a, b) {
  if (a === 0) return b;
  if (b === 0) return a;

  if (Math.sign(a) === Math.sign(b)) {
    return a + b * (1 - Math.abs(a));
  }

  const denominator = 1 - Math.min(Math.abs(a), Math.abs(b));
  if (denominator <= 0) return 0;
  return (a + b) / denominator;
}

function combineConfidence(existing, incoming, mode) {
  if (mode === "max") {
    return Math.abs(incoming) > Math.abs(existing) ? incoming : existing;
  }

  if (mode === "latest") {
    return incoming;
  }

  return mycinCombine(existing, incoming);
}

function readInitialFacts() {
  const facts = new Map();

  for (const fact of FACT_CATALOG) {
    const checked = document.getElementById(`fact-${fact}-checked`);
    const confidence = document.getElementById(`fact-${fact}-confidence`);
    if (!checked || !confidence) continue;

    if (checked.checked) {
      const value = Number(confidence.value);
      const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.6));
      facts.set(fact, clamped);
    }
  }

  return facts;
}

function evaluateConditions(rule, factState) {
  let strength = 1;

  for (const condition of rule.if) {
    const sign = condition.sign === -1 ? -1 : 1;
    const requiredMin = Number(condition.min ?? 0.5);
    const known = factState.get(condition.fact) ?? 0;
    const directed = known * sign;

    if (directed < requiredMin) {
      return { met: false, strength: 0 };
    }

    strength = Math.min(strength, directed);
  }

  return { met: true, strength };
}

function runForwardChaining(rules, initialFacts, conflictMode, maxPasses) {
  const factState = new Map(initialFacts);
  const fired = new Set();
  const trace = [];

  let pass = 0;
  let changed = true;

  while (changed && pass < maxPasses) {
    changed = false;
    pass += 1;

    for (const rule of rules) {
      const ruleId = rule.id || `R${trace.length + 1}`;
      if (fired.has(ruleId)) continue;

      const { met, strength } = evaluateConditions(rule, factState);
      if (!met) continue;

      const sign = rule.then.sign === -1 ? -1 : 1;
      const incoming = round2(strength * Number(rule.then.certainty) * sign);
      const targetFact = rule.then.fact;
      const before = factState.get(targetFact) ?? 0;
      const after = round2(combineConfidence(before, incoming, conflictMode));

      fired.add(ruleId);

      if (after !== before) {
        factState.set(targetFact, after);
        changed = true;
      }

      trace.push({
        pass,
        ruleId,
        targetFact,
        before,
        incoming,
        after,
        note: rule.note || ""
      });
    }
  }

  return { factState, trace, passes: pass, rulesFired: fired.size };
}

function renderConclusions(factState, initialFacts) {
  const rows = [];

  for (const [fact, confidence] of factState.entries()) {
    if (initialFacts.has(fact)) continue;
    rows.push({ fact, confidence });
  }

  rows.sort((a, b) => Math.abs(b.confidence) - Math.abs(a.confidence));

  conclusionsBody.innerHTML = "";

  for (const row of rows) {
    const tr = document.createElement("tr");

    const factTd = document.createElement("td");
    factTd.textContent = titleCaseFact(row.fact);

    const cfTd = document.createElement("td");
    cfTd.textContent = row.confidence.toFixed(2);

    const statusTd = document.createElement("td");
    if (row.confidence > 0) statusTd.textContent = "Supported";
    else if (row.confidence < 0) statusTd.textContent = "Opposed";
    else statusTd.textContent = "Neutral";

    tr.append(factTd, cfTd, statusTd);
    conclusionsBody.appendChild(tr);
  }

  metricConclusions.textContent = String(rows.length);
}

function renderTrace(trace) {
  traceList.innerHTML = "";

  for (const item of trace) {
    const li = document.createElement("li");
    const detail = `${item.ruleId} fired (pass ${item.pass}): ${titleCaseFact(item.targetFact)} ${item.before.toFixed(
      2
    )} -> ${item.after.toFixed(2)} using ${item.incoming.toFixed(2)} evidence.`;
    li.textContent = item.note ? `${detail} ${item.note}` : detail;
    traceList.appendChild(li);
  }
}

function runEngine() {
  let rules;
  try {
    rules = readJsonRules();
    rulesStatus.textContent = "Rules parsed successfully.";
  } catch (error) {
    rulesStatus.textContent = error.message;
    rulesStatus.classList.add("is-error");
    return;
  }

  rulesStatus.classList.remove("is-error");

  const initialFacts = readInitialFacts();
  const maxPasses = Math.max(1, Math.min(20, Number(maxPassesInput.value) || 8));
  const conflictMode = conflictSelect.value;

  const result = runForwardChaining(rules, initialFacts, conflictMode, maxPasses);

  metricRules.textContent = String(rules.length);
  metricFired.textContent = String(result.rulesFired);
  metricPasses.textContent = String(result.passes);

  renderConclusions(result.factState, initialFacts);
  renderTrace(result.trace);
}

function buildFactsUi() {
  factsContainer.innerHTML = "";

  for (const fact of FACT_CATALOG) {
    const row = document.createElement("div");
    row.className = "expert-fact-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `fact-${fact}-checked`;

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = titleCaseFact(fact);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0.1";
    slider.max = "1";
    slider.step = "0.1";
    slider.value = "0.7";
    slider.id = `fact-${fact}-confidence`;
    slider.disabled = true;

    const value = document.createElement("strong");
    value.className = "expert-fact-value";
    value.textContent = "0.7";

    checkbox.addEventListener("change", () => {
      slider.disabled = !checkbox.checked;
    });

    slider.addEventListener("input", () => {
      value.textContent = Number(slider.value).toFixed(1);
    });

    row.append(checkbox, label, slider, value);
    factsContainer.appendChild(row);
  }
}

function clearFacts() {
  for (const fact of FACT_CATALOG) {
    const checked = document.getElementById(`fact-${fact}-checked`);
    const confidence = document.getElementById(`fact-${fact}-confidence`);
    if (!checked || !confidence) continue;

    checked.checked = false;
    confidence.disabled = true;
    confidence.value = "0.7";

    const value = confidence.parentElement ? confidence.parentElement.querySelector(".expert-fact-value") : null;
    if (value) value.textContent = "0.7";
  }

  conclusionsBody.innerHTML = "";
  traceList.innerHTML = "";
  metricFired.textContent = "0";
  metricPasses.textContent = "0";
  metricConclusions.textContent = "0";
}

function loadDefaultRules() {
  rulesEditor.value = JSON.stringify(DEFAULT_RULES, null, 2);
  metricRules.textContent = String(DEFAULT_RULES.length);
  rulesStatus.textContent = "Loaded default rule base (13 rules).";
  rulesStatus.classList.remove("is-error");
}

runButton.addEventListener("click", () => {
  runEngine();
});

clearFactsButton.addEventListener("click", () => {
  clearFacts();
});

loadDefaultsButton.addEventListener("click", () => {
  loadDefaultRules();
});

buildFactsUi();
loadDefaultRules();
clearFacts();
