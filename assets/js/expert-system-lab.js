const expertLab = document.getElementById("expert-lab");

const factsContainer = document.getElementById("expert-facts");
const rulesEditor = document.getElementById("expert-rules-editor");
const rulesStatus = document.getElementById("expert-rules-status");
const rulesDetails = document.getElementById("expert-rules-details");

const runButton = document.getElementById("expert-run");
const clearFactsButton = document.getElementById("expert-clear-facts");
const loadDefaultsButton = document.getElementById("expert-load-defaults");

const modeEasyButton = document.getElementById("expert-mode-easy");
const modeAdvancedButton = document.getElementById("expert-mode-advanced");
const modeNote = document.getElementById("expert-mode-note");
const runningStatus = document.getElementById("expert-running-status");

const conflictSelect = document.getElementById("expert-conflict");
const conflictHelp = document.getElementById("expert-conflict-help");
const maxPassesInput = document.getElementById("expert-max-passes");

const metricRules = document.getElementById("expert-metric-rules");
const metricFired = document.getElementById("expert-metric-fired");
const metricPasses = document.getElementById("expert-metric-passes");
const metricConclusions = document.getElementById("expert-metric-conclusions");

const conclusionsBody = document.getElementById("expert-conclusions");
const whyPanel = document.getElementById("expert-why");
const traceList = document.getElementById("expert-trace");

const required = [
  expertLab,
  factsContainer,
  rulesEditor,
  rulesStatus,
  rulesDetails,
  runButton,
  clearFactsButton,
  loadDefaultsButton,
  modeEasyButton,
  modeAdvancedButton,
  modeNote,
  runningStatus,
  conflictSelect,
  conflictHelp,
  maxPassesInput,
  metricRules,
  metricFired,
  metricPasses,
  metricConclusions,
  conclusionsBody,
  whyPanel,
  traceList
];

if (required.some((node) => !node)) {
  throw new Error("Expert System Lab could not initialize. Missing required DOM nodes.");
}

const EVIDENCE_CATALOG = [
  {
    key: "battery_low",
    label: "Battery seems low",
    icon: "\ud83d\udd0b",
    hint: "Robot moves slowly or battery meter is low.",
    easy: true
  },
  {
    key: "power_led_off",
    label: "Power LED is off",
    icon: "\ud83d\udd34",
    hint: "The main power light does not turn on.",
    easy: true
  },
  {
    key: "power_led_blinking",
    label: "Power LED is blinking",
    icon: "\ud83d\udca1",
    hint: "Power light flashes instead of staying steady.",
    easy: true
  },
  {
    key: "motor_not_spinning",
    label: "Motor is not spinning",
    icon: "\u2699\ufe0f",
    hint: "Motor does not move when code should run.",
    easy: true
  },
  {
    key: "motor_stuttering",
    label: "Motor is stuttering",
    icon: "\ud83e\udd16",
    hint: "Motor starts and stops rapidly.",
    easy: false
  },
  {
    key: "wheels_slipping",
    label: "Wheels are slipping",
    icon: "\ud83d\udefb",
    hint: "Wheels spin but robot barely moves.",
    easy: true
  },
  {
    key: "servo_jitter",
    label: "Servo is jittering",
    icon: "\ud83d\udcaa",
    hint: "Servo shakes instead of holding position.",
    easy: false
  },
  {
    key: "sensor_no_signal",
    label: "Sensor has no signal",
    icon: "\ud83d\udce1",
    hint: "Sensor reads blank or constant zero.",
    easy: true
  },
  {
    key: "distance_sensor_erratic",
    label: "Distance sensor is erratic",
    icon: "\ud83d\udcf6",
    hint: "Readings jump around without stable values.",
    easy: false
  },
  {
    key: "line_sensor_inconsistent",
    label: "Line sensor is inconsistent",
    icon: "\u27b0",
    hint: "Line-tracking values drift or flip unexpectedly.",
    easy: false
  },
  {
    key: "bluetooth_wont_pair",
    label: "Bluetooth will not pair",
    icon: "\ud83d\udd35",
    hint: "Controller or app cannot connect by Bluetooth.",
    easy: true
  },
  {
    key: "wifi_drops",
    label: "Wi-Fi connection drops",
    icon: "\ud83d\udce1",
    hint: "Robot disconnects from Wi-Fi repeatedly.",
    easy: false
  },
  {
    key: "overheating",
    label: "Robot is overheating",
    icon: "\ud83d\udd25",
    hint: "Parts feel very hot. Stop and ask an adult.",
    easy: true
  }
];

const EVIDENCE_LOOKUP = Object.fromEntries(EVIDENCE_CATALOG.map((item) => [item.key, item]));

const CONCLUSION_META = {
  low_battery: { label: "Low battery", kind: "Likely cause" },
  loose_connection: { label: "Loose connection", kind: "Likely cause" },
  motor_driver_fault: { label: "Motor driver fault", kind: "Likely cause" },
  sensor_misaligned: { label: "Sensor misaligned", kind: "Likely cause" },
  wheel_traction_issue: { label: "Wheel traction issue", kind: "Likely cause" },
  interference_noise: { label: "Interference noise", kind: "Likely cause" },
  calibration_needed: { label: "Calibration needed", kind: "Likely cause" },
  code_bug_likely: { label: "Code bug likely", kind: "Likely cause" },
  safety_stop_adult_help: { label: "Safety stop: get adult help", kind: "Safety action" },
  check_wiring: { label: "Check wiring", kind: "Recommended action" },
  recharge_battery: { label: "Recharge battery", kind: "Recommended action" },
  recalibrate_sensors: { label: "Recalibrate sensors", kind: "Recommended action" },
  reduce_load: { label: "Reduce mechanical load", kind: "Recommended action" },
  move_away_from_interference: { label: "Move away from interference", kind: "Recommended action" }
};

const DEFAULT_RULES = [
  {
    id: "R1",
    if: [{ fact: "battery_low", min: 0.6 }],
    then: { fact: "low_battery", certainty: 0.75, sign: 1 },
    note: "Low battery evidence supports a low battery cause."
  },
  {
    id: "R2",
    if: [
      { fact: "power_led_blinking", min: 0.5 },
      { fact: "motor_stuttering", min: 0.4 }
    ],
    then: { fact: "low_battery", certainty: 0.55, sign: 1 },
    note: "Blinking power plus stuttering often appears when charge is weak."
  },
  {
    id: "R3",
    if: [
      { fact: "power_led_off", min: 0.6 },
      { fact: "motor_not_spinning", min: 0.5 }
    ],
    then: { fact: "loose_connection", certainty: 0.72, sign: 1 },
    note: "No power light and no motor motion can point to a loose wire."
  },
  {
    id: "R4",
    if: [
      { fact: "motor_not_spinning", min: 0.6 },
      { fact: "power_led_blinking", min: 0.5 }
    ],
    then: { fact: "motor_driver_fault", certainty: 0.7, sign: 1 },
    note: "Power exists, but the motor still fails to run."
  },
  {
    id: "R5",
    if: [{ fact: "sensor_no_signal", min: 0.6 }],
    then: { fact: "sensor_misaligned", certainty: 0.7, sign: 1 },
    note: "No sensor signal can happen when sensor placement is off."
  },
  {
    id: "R6",
    if: [
      { fact: "distance_sensor_erratic", min: 0.5 },
      { fact: "line_sensor_inconsistent", min: 0.5 }
    ],
    then: { fact: "calibration_needed", certainty: 0.78, sign: 1 },
    note: "Erratic readings from multiple sensors suggest recalibration."
  },
  {
    id: "R7",
    if: [{ fact: "wheels_slipping", min: 0.5 }],
    then: { fact: "wheel_traction_issue", certainty: 0.84, sign: 1 },
    note: "Wheel slip points to traction or surface problems."
  },
  {
    id: "R8",
    if: [
      { fact: "bluetooth_wont_pair", min: 0.5 },
      { fact: "wifi_drops", min: 0.5 }
    ],
    then: { fact: "interference_noise", certainty: 0.68, sign: 1 },
    note: "Multiple wireless issues can come from nearby interference."
  },
  {
    id: "R9",
    if: [
      { fact: "power_led_off", min: 0.7 },
      { fact: "battery_low", min: 0.4 }
    ],
    then: { fact: "low_battery", certainty: 0.45, sign: -1 },
    note: "A totally off power LED can point to wiring instead of battery level."
  },
  {
    id: "R10",
    if: [
      { fact: "power_led_off", min: 0.7 },
      { fact: "sensor_no_signal", min: 0.6 }
    ],
    then: { fact: "interference_noise", certainty: 0.42, sign: -1 },
    note: "If the system has no power, wireless interference is less likely."
  },
  {
    id: "R11",
    if: [{ fact: "low_battery", min: 0.6 }],
    then: { fact: "recharge_battery", certainty: 0.86, sign: 1 },
    note: "Low battery best action: recharge before deeper debugging."
  },
  {
    id: "R12",
    if: [{ fact: "loose_connection", min: 0.6 }],
    then: { fact: "check_wiring", certainty: 0.9, sign: 1 },
    note: "Loose connection suggests checking and reseating wires."
  },
  {
    id: "R13",
    if: [{ fact: "calibration_needed", min: 0.6 }],
    then: { fact: "recalibrate_sensors", certainty: 0.84, sign: 1 },
    note: "When calibration is likely, run the classroom calibration routine."
  },
  {
    id: "R14",
    if: [
      { fact: "motor_driver_fault", min: 0.6 },
      { fact: "wheel_traction_issue", min: 0.5 }
    ],
    then: { fact: "reduce_load", certainty: 0.72, sign: 1 },
    note: "If drive strain is high, lower payload or speed to test safely."
  },
  {
    id: "R15",
    if: [{ fact: "overheating", min: 0.5 }],
    then: { fact: "safety_stop_adult_help", certainty: 0.98, sign: 1 },
    note: "Safety rule: stop the robot and ask an adult for help."
  }
];

const CONFLICT_HELP = {
  mycin: "Combine confidence from multiple rules into one blended score.",
  max: "Keep only the strongest single rule and ignore weaker ones.",
  latest: "Use the newest fired rule and replace earlier confidence."
};

const MODE_NOTES = {
  easy: "Easy mode shows core evidence cards and simple explanations.",
  advanced: "Advanced mode shows the full evidence set, controls, and editable rules."
};

const state = {
  mode: "easy",
  lastRun: null,
  selectedWhyFact: null
};

function titleCaseFact(value) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function displayFactName(key) {
  if (EVIDENCE_LOOKUP[key]) return EVIDENCE_LOOKUP[key].label;
  if (CONCLUSION_META[key]) return CONCLUSION_META[key].label;
  return titleCaseFact(key);
}

function clamp01(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function getFactControls(key) {
  return {
    card: document.getElementById(`fact-${key}-card`),
    checked: document.getElementById(`fact-${key}-checked`),
    confidence: document.getElementById(`fact-${key}-confidence`),
    value: document.getElementById(`fact-${key}-value`),
    preset: document.getElementById(`fact-${key}-preset`)
  };
}

function syncEvidenceCard(key) {
  const controls = getFactControls(key);
  if (!controls.card || !controls.checked || !controls.confidence || !controls.value) return;

  const active = controls.checked.checked;
  controls.confidence.disabled = !active;
  if (controls.preset) controls.preset.disabled = !active;
  controls.card.classList.toggle("is-inactive", !active);
  controls.value.textContent = Number(controls.confidence.value).toFixed(1);
}

function buildFactsUi() {
  factsContainer.innerHTML = "";

  for (const fact of EVIDENCE_CATALOG) {
    const card = document.createElement("article");
    card.className = "expert-evidence-card is-inactive";
    card.id = `fact-${fact.key}-card`;
    card.dataset.level = fact.easy ? "easy" : "advanced";

    const row = document.createElement("div");
    row.className = "expert-evidence-main";

    const icon = document.createElement("span");
    icon.className = "expert-evidence-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = fact.icon;

    const labelWrap = document.createElement("div");
    labelWrap.className = "expert-evidence-label-wrap";

    const name = document.createElement("label");
    name.className = "expert-evidence-name";
    name.htmlFor = `fact-${fact.key}-checked`;
    name.textContent = fact.label;

    const keyText = document.createElement("span");
    keyText.className = "expert-evidence-key";
    keyText.textContent = fact.key;

    labelWrap.append(name, keyText);

    const checked = document.createElement("input");
    checked.type = "checkbox";
    checked.className = "expert-evidence-toggle";
    checked.id = `fact-${fact.key}-checked`;
    checked.setAttribute("aria-label", `Use evidence: ${fact.label}`);

    const confidenceWrap = document.createElement("div");
    confidenceWrap.className = "expert-evidence-confidence-inline";

    const confidence = document.createElement("input");
    confidence.type = "range";
    confidence.id = `fact-${fact.key}-confidence`;
    confidence.setAttribute("aria-label", `How sure are you for ${fact.label}?`);
    confidence.min = "0.1";
    confidence.max = "1";
    confidence.step = "0.1";
    confidence.value = "0.7";
    confidence.disabled = true;

    const value = document.createElement("strong");
    value.className = "expert-evidence-value";
    value.id = `fact-${fact.key}-value`;
    value.textContent = "0.7";

    const preset = document.createElement("select");
    preset.className = "expert-evidence-preset";
    preset.id = `fact-${fact.key}-preset`;
    preset.setAttribute("aria-label", `Presets for ${fact.label}`);
    preset.disabled = true;
    preset.innerHTML =
      '<option value="">Presets</option><option value="0.3">Low</option><option value="0.6">Medium</option><option value="0.9">High</option>';
    preset.addEventListener("change", () => {
      if (!preset.value) return;
      confidence.value = preset.value;
      confidence.dispatchEvent(new Event("input", { bubbles: true }));
      preset.value = "";
      confidence.focus();
    });

    const info = document.createElement("button");
    info.type = "button";
    info.className = "expert-evidence-info";
    info.setAttribute("aria-label", `${fact.label} hint`);
    info.title = fact.hint;
    info.textContent = "i";

    confidenceWrap.append(confidence, value);

    checked.addEventListener("change", () => {
      if (checked.checked) {
        confidence.value = "0.7";
      } else {
        preset.value = "";
      }
      syncEvidenceCard(fact.key);
    });

    confidence.addEventListener("input", () => {
      value.textContent = Number(confidence.value).toFixed(1);
    });

    row.append(icon, labelWrap, checked, confidenceWrap, preset, info);
    card.append(row);
    factsContainer.appendChild(card);
  }
}

function readJsonRules() {
  let parsed;
  try {
    parsed = JSON.parse(rulesEditor.value);
  } catch (_error) {
    throw new Error("I could not read the rules JSON. Check commas, brackets, and quotes, then try again.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Rules JSON must be an array of rule objects.");
  }

  for (let i = 0; i < parsed.length; i += 1) {
    const rule = parsed[i];
    const prefix = `Rule ${i + 1}`;

    if (!rule || typeof rule !== "object") {
      throw new Error(`${prefix} must be an object.`);
    }

    if (typeof rule.id !== "string" || !rule.id.trim()) {
      throw new Error(`${prefix} needs an id string.`);
    }

    if (!Array.isArray(rule.if) || rule.if.length === 0) {
      throw new Error(`${prefix} needs at least one IF condition.`);
    }

    if (!rule.then || typeof rule.then !== "object") {
      throw new Error(`${prefix} must include a THEN object.`);
    }

    if (typeof rule.then.fact !== "string" || !rule.then.fact.trim()) {
      throw new Error(`${prefix} then.fact must be a fact name string.`);
    }

    const certainty = Number(rule.then.certainty);
    if (!Number.isFinite(certainty) || certainty < 0 || certainty > 1) {
      throw new Error(`${prefix} then.certainty must be between 0 and 1.`);
    }

    if (rule.then.sign !== 1 && rule.then.sign !== -1) {
      throw new Error(`${prefix} then.sign must be 1 or -1.`);
    }

    if (typeof rule.note !== "string" || !rule.note.trim()) {
      throw new Error(`${prefix} needs a short note explanation.`);
    }

    for (const cond of rule.if) {
      if (!cond || typeof cond.fact !== "string" || !cond.fact.trim()) {
        throw new Error(`${prefix} each condition needs a fact string.`);
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

function evaluateConditions(rule, factState) {
  let strength = 1;
  const matched = [];

  for (const condition of rule.if) {
    const requiredMin = clamp01(condition.min ?? 0.5);
    const known = clamp01(factState.get(condition.fact) ?? 0);

    if (known < requiredMin) {
      return { met: false, strength: 0, matched };
    }

    matched.push({
      fact: condition.fact,
      known: round2(known),
      min: round2(requiredMin)
    });

    strength = Math.min(strength, known);
  }

  return { met: true, strength, matched };
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
      const ruleId = rule.id;
      if (fired.has(ruleId)) continue;

      const { met, strength, matched } = evaluateConditions(rule, factState);
      if (!met) continue;

      const sign = rule.then.sign === -1 ? -1 : 1;
      const incoming = round2(strength * Number(rule.then.certainty) * sign);
      const targetFact = rule.then.fact;
      const before = round2(factState.get(targetFact) ?? 0);
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
        note: rule.note,
        matched
      });
    }
  }

  return { factState, trace, passes: pass, rulesFired: fired.size };
}

function readInitialFacts() {
  const facts = new Map();

  for (const fact of EVIDENCE_CATALOG) {
    if (state.mode === "easy" && !fact.easy) continue;

    const controls = getFactControls(fact.key);
    if (!controls.checked || !controls.confidence) continue;

    if (controls.checked.checked) {
      facts.set(fact.key, round2(clamp01(controls.confidence.value)));
    }
  }

  return facts;
}

function statusLabel(confidence) {
  if (confidence >= 0.7) return "Strong support";
  if (confidence >= 0.35) return "Supported";
  if (confidence > 0) return "Weak support";
  if (confidence <= -0.35) return "Opposed";
  if (confidence < 0) return "Slightly opposed";
  return "Neutral";
}

function modeAdvanced() {
  return state.mode === "advanced";
}

function formatMatchedEvidence(matched) {
  if (!matched.length) return "No evidence details recorded.";
  return matched
    .map((item) => `${displayFactName(item.fact)} (${item.known.toFixed(2)} >= ${item.min.toFixed(2)})`)
    .join(", ");
}

function renderWhyPanel(targetFact, finalConfidence, entries) {
  state.selectedWhyFact = targetFact;

  whyPanel.innerHTML = "";

  const heading = document.createElement("h4");
  heading.textContent = `${displayFactName(targetFact)}: ${finalConfidence.toFixed(2)}`;

  const intro = document.createElement("p");
  intro.textContent =
    "This score comes from rules that matched your evidence and then combined confidence values using the selected policy.";

  whyPanel.append(heading, intro);

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "expert-note";
    empty.textContent = "No fired rules contributed to this guess.";
    whyPanel.appendChild(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = "expert-why-list";

  for (const entry of entries) {
    const li = document.createElement("li");
    const matchedText = formatMatchedEvidence(entry.matched);

    if (modeAdvanced()) {
      li.textContent = `${entry.ruleId}: ${entry.note} Matched: ${matchedText}. Score moved ${entry.before.toFixed(
        2
      )} -> ${entry.after.toFixed(2)} using incoming ${entry.incoming.toFixed(2)}.`;
    } else {
      li.textContent = `${entry.ruleId}: ${entry.note} Matched: ${matchedText}.`;
    }

    list.appendChild(li);
  }

  const combine = document.createElement("p");
  combine.textContent = `Policy used: ${CONFLICT_HELP[conflictSelect.value] || CONFLICT_HELP.mycin}`;

  whyPanel.append(list, combine);
}

function renderTrace(trace) {
  traceList.innerHTML = "";

  for (const item of trace) {
    const li = document.createElement("li");
    li.textContent = `${item.ruleId} (pass ${item.pass}) set ${displayFactName(item.targetFact)} ${item.before.toFixed(
      2
    )} -> ${item.after.toFixed(2)} using ${item.incoming.toFixed(2)}.`;
    traceList.appendChild(li);
  }
}

function renderConclusions(factState, initialFacts, trace) {
  const rows = [];
  const byFact = new Map();

  for (const item of trace) {
    if (!byFact.has(item.targetFact)) byFact.set(item.targetFact, []);
    byFact.get(item.targetFact).push(item);
  }

  for (const [fact, confidence] of factState.entries()) {
    if (initialFacts.has(fact)) continue;
    rows.push({ fact, confidence: round2(confidence) });
  }

  rows.sort((a, b) => Math.abs(b.confidence) - Math.abs(a.confidence));

  conclusionsBody.innerHTML = "";

  if (!rows.length) {
    const emptyRow = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "No new guesses yet. Add evidence and run the rules.";
    emptyRow.appendChild(cell);
    conclusionsBody.appendChild(emptyRow);
    metricConclusions.textContent = "0";

    whyPanel.innerHTML = '<p class="expert-note">No explanations yet. Run the rules first.</p>';
    return;
  }

  for (const row of rows) {
    const tr = document.createElement("tr");

    const factTd = document.createElement("td");
    const meta = CONCLUSION_META[row.fact];
    factTd.textContent = meta ? `${meta.label} (${meta.kind})` : displayFactName(row.fact);

    const cfTd = document.createElement("td");
    cfTd.textContent = row.confidence.toFixed(2);

    const statusTd = document.createElement("td");
    statusTd.textContent = statusLabel(row.confidence);

    const whyTd = document.createElement("td");
    const related = byFact.get(row.fact) || [];

    const whyButton = document.createElement("button");
    whyButton.type = "button";
    whyButton.className = "expert-why-trigger";
    whyButton.textContent = "Why?";
    whyButton.disabled = related.length === 0;
    whyButton.setAttribute("aria-label", `Why for ${displayFactName(row.fact)}`);

    whyButton.addEventListener("click", () => {
      renderWhyPanel(row.fact, row.confidence, related);
    });

    whyTd.appendChild(whyButton);
    tr.append(factTd, cfTd, statusTd, whyTd);
    conclusionsBody.appendChild(tr);
  }

  metricConclusions.textContent = String(rows.length);

  const preferredFact = state.selectedWhyFact && byFact.has(state.selectedWhyFact) ? state.selectedWhyFact : rows[0].fact;
  const preferredConfidence = rows.find((row) => row.fact === preferredFact)?.confidence ?? rows[0].confidence;
  renderWhyPanel(preferredFact, preferredConfidence, byFact.get(preferredFact) || []);
}

function updateConflictHelp() {
  const mode = conflictSelect.value;
  conflictHelp.textContent = CONFLICT_HELP[mode] || CONFLICT_HELP.mycin;
}

function clearFacts() {
  for (const fact of EVIDENCE_CATALOG) {
    const controls = getFactControls(fact.key);
    if (!controls.checked || !controls.confidence) continue;

    controls.checked.checked = false;
    controls.confidence.value = "0.7";
    if (controls.preset) controls.preset.value = "";
    syncEvidenceCard(fact.key);
  }

  state.lastRun = null;
  state.selectedWhyFact = null;
  conclusionsBody.innerHTML = "";
  traceList.innerHTML = "";
  whyPanel.innerHTML = '<p class="expert-note">Run the rules and choose "Why?" on a result to see a compact explanation.</p>';

  metricFired.textContent = "0";
  metricPasses.textContent = "0";
  metricConclusions.textContent = "0";
  runningStatus.textContent = "Evidence cleared.";
}

function loadDefaultRules() {
  rulesEditor.value = JSON.stringify(DEFAULT_RULES, null, 2);
  metricRules.textContent = String(DEFAULT_RULES.length);
  rulesStatus.textContent = "Loaded robotics rule base (15 rules).";
  rulesStatus.classList.remove("is-error");
}

function applyMode(mode) {
  state.mode = mode === "advanced" ? "advanced" : "easy";
  expertLab.dataset.mode = state.mode;

  const easyActive = state.mode === "easy";

  modeEasyButton.classList.toggle("is-active", easyActive);
  modeAdvancedButton.classList.toggle("is-active", !easyActive);
  modeEasyButton.setAttribute("aria-pressed", easyActive ? "true" : "false");
  modeAdvancedButton.setAttribute("aria-pressed", easyActive ? "false" : "true");

  modeNote.textContent = MODE_NOTES[state.mode];

  for (const fact of EVIDENCE_CATALOG) {
    const controls = getFactControls(fact.key);
    if (!controls.card || !controls.checked || !controls.confidence) continue;

    const hideCard = easyActive && !fact.easy;
    controls.card.hidden = hideCard;

    if (hideCard) {
      controls.checked.checked = false;
      controls.confidence.value = "0.7";
      if (controls.preset) controls.preset.value = "";
    }

    syncEvidenceCard(fact.key);
  }

  rulesDetails.open = false;
}

function runEngineNow() {
  let rules;
  try {
    rules = readJsonRules();
    rulesStatus.textContent = "Rules look valid.";
    rulesStatus.classList.remove("is-error");
  } catch (error) {
    rulesStatus.textContent = error.message;
    rulesStatus.classList.add("is-error");
    runningStatus.textContent = "Could not run. Please fix the rules JSON and try again.";
    return;
  }

  const initialFacts = readInitialFacts();
  const maxPasses = Math.max(1, Math.min(20, Number(maxPassesInput.value) || 8));
  const conflictMode = conflictSelect.value;

  const result = runForwardChaining(rules, initialFacts, conflictMode, maxPasses);

  state.lastRun = {
    factState: result.factState,
    trace: result.trace,
    initialFacts,
    conflictMode
  };

  metricRules.textContent = String(rules.length);
  metricFired.textContent = String(result.rulesFired);
  metricPasses.textContent = String(result.passes);

  renderConclusions(result.factState, initialFacts, result.trace);
  renderTrace(result.trace);

  runningStatus.textContent = `Finished. Fired ${result.rulesFired} rules across ${result.passes} pass(es).`;
}

function runEngine() {
  runningStatus.textContent = "Running the rules...";
  runButton.disabled = true;

  window.setTimeout(() => {
    try {
      runEngineNow();
    } finally {
      runButton.disabled = false;
    }
  }, 25);
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

modeEasyButton.addEventListener("click", () => {
  applyMode("easy");
  clearFacts();
});

modeAdvancedButton.addEventListener("click", () => {
  applyMode("advanced");
  clearFacts();
});

conflictSelect.addEventListener("change", () => {
  updateConflictHelp();

  if (!state.lastRun || !state.selectedWhyFact) return;
  const entries = state.lastRun.trace.filter((item) => item.targetFact === state.selectedWhyFact);
  const confidence = round2(state.lastRun.factState.get(state.selectedWhyFact) ?? 0);
  renderWhyPanel(state.selectedWhyFact, confidence, entries);
});

buildFactsUi();
loadDefaultRules();
updateConflictHelp();
applyMode("easy");
clearFacts();
