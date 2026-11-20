import { createEliza, computeSlipHashInfo, parseScript } from "./eliza-engine.js";
import { DOCTOR_1966 } from "./eliza-doctor-1966.js";
import {
  BREAK_CHALLENGES,
  CACM_1966_TRANSCRIPT,
  CUSTOM_SCRIPT_PRESETS
} from "./eliza-presets.js";
import { createTeletypeAudio } from "./eliza-audio.js";
import { initEvolutionLab } from "./eliza-evolution.js";

const STORAGE_KEY = "classroomos:eliza1966:v4";

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function getEl(id) {
  return document.getElementById(id);
}

// ---------- DOM References ----------

const studio = getEl("eliza-studio");
const terminalShell = getEl("eliza-terminal-shell");
const chatLog = getEl("eliza-chat-log");
const form = getEl("eliza-form");
const input = getEl("eliza-input");
const clearButton = getEl("eliza-clear");
const resetButton = getEl("eliza-reset");
const scriptSelect = getEl("eliza-script");
const surfaceTeletypeBtn = getEl("eliza-surface-teletype");
const surfaceCrtBtn = getEl("eliza-surface-crt");
const speedSelect = getEl("eliza-speed");
const audioToggleBtn = getEl("eliza-audio-toggle");
const paperStepBtn = getEl("eliza-paper-step");
const paperNoteBanner = getEl("eliza-paper-note");
const typingIndicator = getEl("eliza-typing");
const starters = getEl("eliza-starters");
const crtOverlay = getEl("crt-overlay");

// Front-panel hardware lamps
const lampEls = [1, 2, 3, 4].map((n) => getEl(`eliza-lamp-${n}`));
const readoutKeystack = getEl("eliza-readout-keystack");
const readoutMemory = getEl("eliza-readout-memory");
const readoutBcd = getEl("eliza-readout-bcd");

// Workspace Tabs
const modeTabs = Array.from(document.querySelectorAll("[data-studio-tab]"));
const modePanels = Array.from(document.querySelectorAll("[data-studio-panel]"));

// X-Ray Inspector
const xrayStageButtons = Array.from(document.querySelectorAll("[data-xray-stage]"));
const xrayPrevBtn = getEl("eliza-xray-prev");
const xrayNextBtn = getEl("eliza-xray-next");
const xrayTurnLabel = getEl("eliza-xray-turn-label");
const xrayBody = getEl("eliza-xray-body");

// Tab 2: Challenges & Script Lab
const challengesList = getEl("eliza-challenges-list");
const challengesProgress = getEl("eliza-challenges-progress");
const scriptLabSubtabs = Array.from(document.querySelectorAll("[data-script-subtab]"));
const scriptLabPanels = Array.from(document.querySelectorAll("[data-script-subpanel]"));
const ruleSearchInput = getEl("eliza-rule-search");
const ruleBrowserList = getEl("eliza-rule-browser");
const builderForm = getEl("eliza-rule-builder");
const builderKeyword = getEl("eliza-builder-keyword");
const builderRank = getEl("eliza-builder-rank");
const builderPattern = getEl("eliza-builder-pattern");
const builderReplies = getEl("eliza-builder-replies");
const builderStatus = getEl("eliza-builder-status");
const rawEditorTextarea = getEl("eliza-raw-script");
const rawCompileBtn = getEl("eliza-raw-compile");
const rawRevertBtn = getEl("eliza-raw-revert");
const rawStatus = getEl("eliza-raw-status");

// Tab 3: Evolution Lab
const evolutionMount = getEl("eliza-evolution-mount");

if (!studio || !chatLog || !form || !input || !xrayBody) {
  throw new Error("ELIZA Studio could not initialize: missing required DOM anchors.");
}

// ---------- State ----------

const audio = createTeletypeAudio();
let activeTypewriterTimer = null;
let activeTypewriterFinish = null;
let crtController = null;

const state = {
  activeTab: "console",
  surface: "teletype",
  speed: "fast",
  audioEnabled: false,
  presetId: "doctor-1966",
  scriptText: DOCTOR_1966,
  paperIndex: 0,
  transcript: [],
  inspectedTurnIndex: null,
  xrayStage: "all",
  bcdProbeWord: "HERE",
  challengesSolved: {},
  challengeContext: {
    ruleHistory: new Map()
  },
  scriptSubtab: "rules",
  ruleFilter: ""
};

let eliza = createEliza(state.scriptText);

function getPresetMeta(id) {
  return CUSTOM_SCRIPT_PRESETS.find((p) => p.id === id) || CUSTOM_SCRIPT_PRESETS[0];
}

// ---------- Persistence ----------

function saveState() {
  try {
    const compactTranscript = state.transcript.map((item) => ({
      role: item.role,
      text: item.text,
      paperStep: item.paperStep || null
    }));
    const payload = {
      surface: state.surface,
      speed: state.speed,
      presetId: state.presetId,
      customScript: state.presetId === "custom" ? state.scriptText : null,
      paperIndex: state.paperIndex,
      challengesSolved: state.challengesSolved,
      transcript: compactTranscript
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {
    // Ignore storage quota / privacy errors cleanly.
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (saved.surface === "crt" || saved.surface === "teletype") {
      state.surface = saved.surface;
    }
    if (["fast", "110baud", "instant"].includes(saved.speed)) {
      state.speed = saved.speed;
    }
    if (saved.presetId === "custom" && typeof saved.customScript === "string") {
      try {
        parseScript(saved.customScript);
        state.presetId = "custom";
        state.scriptText = saved.customScript;
      } catch (_) {
        state.presetId = "doctor-1966";
        state.scriptText = DOCTOR_1966;
      }
    } else if (typeof saved.presetId === "string" && CUSTOM_SCRIPT_PRESETS.some((p) => p.id === saved.presetId)) {
      state.presetId = saved.presetId;
      state.scriptText = getPresetMeta(saved.presetId).script;
    }
    if (Number.isInteger(saved.paperIndex) && saved.paperIndex >= 0 && saved.paperIndex <= CACM_1966_TRANSCRIPT.length) {
      state.paperIndex = saved.paperIndex;
    }
    if (saved.challengesSolved && typeof saved.challengesSolved === "object") {
      state.challengesSolved = { ...saved.challengesSolved };
    }
    if (Array.isArray(saved.transcript)) {
      state.transcript = saved.transcript;
    }
    return true;
  } catch (_) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    return false;
  }
}

// ---------- CRT Canvas Overlay (SimKit) ----------

function setupCrtOverlay() {
  if (!crtOverlay || !window.SimKit) return null;
  const ctx = crtOverlay.getContext("2d");
  if (!ctx) return null;

  let w = 1;
  let h = 1;
  let t = 0;

  function resize() {
    const parent = crtOverlay.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    crtOverlay.width = Math.round(w * dpr);
    crtOverlay.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  try {
    new ResizeObserver(resize).observe(crtOverlay.parentElement);
  } catch (_) {}
  window.addEventListener("resize", resize, { passive: true });
  resize();

  const NSIZE = 256;
  const noiseCanvas = document.createElement("canvas");
  noiseCanvas.width = NSIZE;
  noiseCanvas.height = NSIZE;
  const nctx = noiseCanvas.getContext("2d");
  if (nctx) {
    const img = nctx.createImageData(NSIZE, NSIZE);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < 0.04) {
        const v = (80 + Math.random() * 170) | 0;
        data[i] = (v * 0.06) | 0;
        data[i + 1] = (v * 0.9) | 0;
        data[i + 2] = (v * 0.14) | 0;
        data[i + 3] = 22;
      }
    }
    nctx.putImageData(img, 0, 0);
  }

  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const loopHandle = window.SimKit.loop((dt) => {
    if (state.surface !== "crt" || state.activeTab !== "console") return;
    t += dt;
    ctx.clearRect(0, 0, w, h);

    const pat = ctx.createPattern(noiseCanvas, "repeat");
    if (pat) {
      const nx = (Math.random() * NSIZE) | 0;
      const ny = (Math.random() * NSIZE) | 0;
      pat.setTransform(new DOMMatrix().translateSelf(-nx, -ny));
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    const sweepY = ((t * 0.14) % 1) * h;
    const sg = ctx.createLinearGradient(0, sweepY - 36, 0, sweepY + 36);
    sg.addColorStop(0, "rgba(110, 255, 165, 0)");
    sg.addColorStop(0.5, "rgba(110, 255, 165, 0.055)");
    sg.addColorStop(1, "rgba(110, 255, 165, 0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, sweepY - 36, w, 72);

    const vg = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.25, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.48)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }, { el: crtOverlay, maxDt: 0.05 });

  if (reducedMotion || state.surface !== "crt") {
    loopHandle.pause();
  }

  return {
    sync() {
      resize();
      if (!reducedMotion && state.surface === "crt" && state.activeTab === "console") {
        loopHandle.resume();
      } else {
        loopHandle.pause();
        ctx.clearRect(0, 0, w, h);
      }
    }
  };
}

// ---------- Surface, Tabs, Front-Panel Lamps ----------

function applySurface(surface) {
  state.surface = surface === "crt" ? "crt" : "teletype";
  if (terminalShell) {
    terminalShell.dataset.surface = state.surface;
  }
  if (surfaceTeletypeBtn) {
    const isTT = state.surface === "teletype";
    surfaceTeletypeBtn.classList.toggle("is-active", isTT);
    surfaceTeletypeBtn.setAttribute("aria-pressed", String(isTT));
  }
  if (surfaceCrtBtn) {
    const isCrt = state.surface === "crt";
    surfaceCrtBtn.classList.toggle("is-active", isCrt);
    surfaceCrtBtn.setAttribute("aria-pressed", String(isCrt));
  }
  crtController?.sync();
  saveState();
}

function switchTab(tabId) {
  state.activeTab = tabId;
  modeTabs.forEach((btn) => {
    const active = btn.dataset.studioTab === tabId;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", String(active));
  });
  modePanels.forEach((panel) => {
    const active = panel.dataset.studioPanel === tabId;
    panel.hidden = !active;
  });
  crtController?.sync();
  if (tabId === "scripts") {
    renderRuleBrowser();
    renderChallenges();
  }
}

function updateHardwarePanel(trace = null) {
  const limitVal = trace ? trace.limitAfter : eliza.limit;
  const memCount = trace ? trace.memoriesAfter.length : eliza.memories.length;
  const memGateReady = limitVal === 4 && (memCount > 0 || trace?.source === "MEMORY");

  lampEls.forEach((el, idx) => {
    if (!el) return;
    const num = idx + 1;
    el.classList.toggle("is-lit", num === limitVal);
    el.classList.toggle("is-gate-ready", num === 4 && memGateReady);
  });

  if (readoutKeystack) {
    readoutKeystack.textContent = trace
      ? (trace.keystack.length ? trace.keystack[0] : "EMPTY")
      : "READY";
  }
  if (readoutMemory) {
    readoutMemory.textContent = `${memCount} STORED`;
  }
  if (readoutBcd) {
    if (trace?.memorySaved) {
      readoutBcd.textContent = `${trace.memorySaved.lastWord}→#${trace.memorySaved.hashInfo.hashIndex}`;
    } else if (trace?.memoryRecalled) {
      readoutBcd.textContent = "RECALLED";
    } else {
      readoutBcd.textContent = "IDLE";
    }
  }
}

function updatePaperStepperUI() {
  if (!paperStepBtn) return;
  if (state.paperIndex >= CACM_1966_TRANSCRIPT.length) {
    paperStepBtn.textContent = "↺ Replay 1966 Paper (15/15)";
    return;
  }
  const nextStep = state.paperIndex + 1;
  paperStepBtn.textContent = `▶ 1966 Paper (${nextStep}/${CACM_1966_TRANSCRIPT.length})`;
}

// ---------- Transcript Rendering & Typewriter ----------

function finishActiveTypewriter() {
  if (activeTypewriterTimer) {
    clearTimeout(activeTypewriterTimer);
    activeTypewriterTimer = null;
  }
  if (activeTypewriterFinish) {
    const fn = activeTypewriterFinish;
    activeTypewriterFinish = null;
    fn();
  }
}

function renderMessageElement(entry, index) {
  const article = document.createElement("article");
  article.className = "eliza-msg";
  article.dataset.role = entry.role;
  article.dataset.turnIndex = String(index);

  const headRow = document.createElement("div");
  headRow.className = "eliza-msg__head";

  const roleTag = document.createElement("span");
  roleTag.className = "eliza-msg__role";
  roleTag.textContent = entry.role === "YOU" ? "HUMAN>" : entry.role === "ELIZA" ? "ELIZA:" : "CTSS:";
  headRow.appendChild(roleTag);

  if (entry.role === "ELIZA" && entry.trace) {
    const badge = document.createElement("span");
    badge.className = "eliza-msg__badge";
    badge.textContent = entry.trace.source ? `RULE ${entry.trace.source}` : "OPENING";
    headRow.appendChild(badge);

    const inspectBtn = document.createElement("button");
    inspectBtn.type = "button";
    inspectBtn.className = "eliza-msg__inspect";
    inspectBtn.dataset.inspectTurn = String(index);
    inspectBtn.textContent = state.inspectedTurnIndex === index ? "Inspecting" : "Inspect";
    if (state.inspectedTurnIndex === index) {
      article.classList.add("is-inspected");
    }
    headRow.appendChild(inspectBtn);
  }

  const body = document.createElement("p");
  body.className = "eliza-msg__body";
  body.textContent = entry.text;

  article.appendChild(headRow);
  article.appendChild(body);
  return { article, body };
}

function renderTranscript() {
  chatLog.innerHTML = "";
  state.transcript.forEach((entry, idx) => {
    const { article } = renderMessageElement(entry, idx);
    chatLog.appendChild(article);
  });
  chatLog.scrollTop = chatLog.scrollHeight;
}

function appendLiveElizaMessage(text, trace, paperStep = null) {
  const entry = { role: "ELIZA", text, trace, paperStep };
  state.transcript.push(entry);
  const index = state.transcript.length - 1;
  state.inspectedTurnIndex = index;

  // Clear previous inspected highlight
  chatLog.querySelectorAll(".eliza-msg.is-inspected").forEach((node) => {
    node.classList.remove("is-inspected");
    const btn = node.querySelector(".eliza-msg__inspect");
    if (btn) btn.textContent = "Inspect";
  });

  const { article, body } = renderMessageElement(entry, index);
  chatLog.appendChild(article);

  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const charDelay = state.speed === "instant" || reduced ? 0 : state.speed === "110baud" ? 90 : 18;

  if (charDelay === 0) {
    body.textContent = text;
    chatLog.scrollTop = chatLog.scrollHeight;
    return;
  }

  body.textContent = "";
  body.classList.add("is-printing");
  typingIndicator.hidden = false;

  let cursor = 0;
  function completeNow() {
    body.textContent = text;
    body.classList.remove("is-printing");
    typingIndicator.hidden = true;
    chatLog.scrollTop = chatLog.scrollHeight;
    audio.playCarriageReturn();
  }

  activeTypewriterFinish = completeNow;

  function stepChar() {
    if (cursor >= text.length) {
      activeTypewriterTimer = null;
      activeTypewriterFinish = null;
      completeNow();
      return;
    }
    cursor += 1;
    body.textContent = text.slice(0, cursor);
    if (cursor % 2 === 1) audio.playKeyStrike(true);
    chatLog.scrollTop = chatLog.scrollHeight;
    activeTypewriterTimer = setTimeout(stepChar, charDelay);
  }

  stepChar();
}

// ---------- X-Ray Machine Inspector ----------

function getInspectedEntry() {
  if (state.inspectedTurnIndex !== null && state.transcript[state.inspectedTurnIndex]?.trace) {
    return { entry: state.transcript[state.inspectedTurnIndex], index: state.inspectedTurnIndex };
  }
  for (let i = state.transcript.length - 1; i >= 0; i -= 1) {
    if (state.transcript[i].trace) {
      return { entry: state.transcript[i], index: i };
    }
  }
  return null;
}

function renderStage1Clause(trace) {
  if (!trace.clauses.length) {
    return `<p class="xray-empty">No tokens scanned yet.</p>`;
  }
  return `
    <div class="xray-clause-list">
      ${trace.clauses.map((c) => {
        const cls = c.kept ? "is-kept" : c.reason === "discarded-after-delimiter" ? "is-cut" : "is-skipped";
        const badge = c.kept
          ? "KEPT CLAUSE"
          : c.reason === "discarded-after-delimiter"
            ? "CUT AFTER DELIMITER"
            : "SKIPPED (NO KEYWORD)";
        return `
          <div class="xray-clause-item ${cls}">
            <div class="xray-clause-meta">
              <span class="xray-pill">${badge}</span>
              ${c.delimiter ? `<span class="xray-delim">Delim: <code>${esc(c.delimiter)}</code></span>` : ""}
            </div>
            <div class="xray-clause-text">${esc(c.text || "(empty)")}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderStage2Scan(trace) {
  if (!trace.scanTokens.length) {
    return `<p class="xray-empty">Kept clause had zero tokens to scan.</p>`;
  }
  return `
    <div class="xray-token-grid">
      ${trace.scanTokens.map((tok) => `
        <div class="xray-tok ${tok.substituted ? "is-swapped" : ""} ${tok.stackRole !== "none" ? "is-keyword" : ""}">
          <span class="xray-tok-orig">${esc(tok.original)}</span>
          ${tok.substituted ? `<span class="xray-tok-swap">→ ${esc(tok.finalWord)}</span>` : ""}
          ${tok.stackRole !== "none" ? `<span class="xray-tok-rank">rank ${tok.precedence}</span>` : ""}
          ${tok.tags.length ? `<span class="xray-tok-tag">/${esc(tok.tags.join(" "))}</span>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function renderStage3Stack(trace) {
  const stackHtml = trace.keystackDetail.length
    ? `<div class="xray-stack-row">
        ${trace.keystackDetail.map((k, idx) => `
          <span class="xray-stack-chip ${idx === 0 ? "is-top" : ""}">
            <strong>${esc(k.keyword)}</strong>
            <small>rank ${k.precedence}${idx === 0 ? " · TOP" : ""}</small>
          </span>
        `).join("")}
      </div>`
    : `<p class="xray-empty">KEYSTACK is empty (zero keywords matched the kept clause).</p>`;

  const jumps = trace.attempts.filter((a) => !a.matched || a.reassemblyKind === "link" || a.reassemblyKind === "pre" || a.reassemblyKind === "newkey");
  const jumpHtml = jumps.length
    ? `<ul class="xray-jump-list">
        ${jumps.map((a) => {
          if (a.reassemblyKind === "link") {
            return `<li><code>${esc(a.keyword)}</code> → jumped via link <code>(=${esc(a.linkTarget)})</code></li>`;
          }
          if (a.reassemblyKind === "pre") {
            return `<li><code>${esc(a.keyword)}</code> → rewrote clause to <code>${esc(a.preWords.join(" "))}</code> &amp; jumped to <code>(=${esc(a.linkTarget)})</code></li>`;
          }
          if (a.reassemblyKind === "newkey") {
            return `<li><code>${esc(a.keyword)}</code> hit <code>(NEWKEY)</code> → popped to next keyword on stack</li>`;
          }
          return `<li><code>${esc(a.keyword)}</code> failed pattern match → popped</li>`;
        }).join("")}
      </ul>`
    : "";

  return `${stackHtml}${jumpHtml}`;
}

function renderStage4Pattern(trace) {
  if (trace.source === "MEMORY") {
    return `<p class="xray-empty">Bypassed pattern matching: <code>LIMIT = 4</code> triggered oldest core <code>MEMORY</code> recall.</p>`;
  }
  const win = trace.winningAttempt || trace.noneAttempt;
  if (!win) {
    return `<p class="xray-empty">Fallback <code>NOMATCH</code> message used for <code>LIMIT = ${trace.limitAfter}</code>.</p>`;
  }
  return `
    <div class="xray-pattern-box">
      <div class="xray-pattern-head">
        <span>Rule: <code>${esc(win.keyword)}</code></span>
        <span>Pattern: <code>${esc(win.decompositionText)}</code></span>
      </div>
      <div class="xray-slot-row">
        ${win.parts.length
          ? win.parts.map((part, idx) => `
            <span class="xray-slot slot-color-${idx % 5}">
              <b>[${idx + 1}]</b> ${esc(part || "∅")}
            </span>
          `).join("")
          : `<span class="xray-slot slot-color-0"><b>[1]</b> ${esc(trace.clause || "∅")}</span>`}
      </div>
    </div>
  `;
}

function renderStage5Dial(trace) {
  if (trace.source === "MEMORY") {
    return `<p class="xray-callout">Replayed saved memory string directly from FIFO queue.</p>`;
  }
  const win = trace.winningAttempt || trace.noneAttempt;
  if (!win) {
    return `<p class="xray-empty">Built-in <code>NOMATCH[${trace.limitAfter}]</code> reply emitted.</p>`;
  }
  const nextIdx = (win.reassemblyIndex + 1) % win.reassemblyTotal;
  return `
    <div class="xray-dial-list">
      ${win.reassemblyChoices.map((choice, idx) => {
        const isCurrent = idx === win.reassemblyIndex;
        const isNext = idx === nextIdx && win.reassemblyTotal > 1;
        return `
          <div class="xray-dial-item ${isCurrent ? "is-current" : ""} ${isNext ? "is-next" : ""}">
            <span class="xray-dial-idx">#${idx + 1}</span>
            <code>${esc(choice)}</code>
            ${isCurrent ? `<span class="xray-dial-tag">USED</span>` : isNext ? `<span class="xray-dial-tag xray-dial-tag--next">NEXT ▸</span>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderStage6MemoryBcd(trace) {
  const probeWord = trace.memorySaved ? trace.memorySaved.lastWord : state.bcdProbeWord;
  const hashInfo = trace.memorySaved ? trace.memorySaved.hashInfo : computeSlipHashInfo(probeWord);

  return `
    <div class="xray-mem-grid">
      <div class="xray-limit-bar">
        <span>LIMIT Clock: <strong>${trace.limitAfter} / 4</strong></span>
        <span class="xray-mem-status">${trace.limitAfter === 4 ? "Memory Recall Armed" : "Counting Turns"}</span>
      </div>
      <div class="xray-mem-queue">
        <strong>Core MEMORY Queue (${trace.memoriesAfter.length}):</strong>
        ${trace.memoriesAfter.length
          ? `<ol>${trace.memoriesAfter.map((m) => `<li><code>${esc(m)}</code></li>`).join("")}</ol>`
          : `<p class="xray-empty">Queue empty. Mention &ldquo;My ...&rdquo; to hash &amp; store a memory.</p>`}
      </div>
      <div class="xray-bcd-box">
        <div class="xray-bcd-head">
          <span>36-Bit IBM 7094 BCD &amp; SLIP HASH</span>
          <label class="xray-bcd-probe">
            <span>Word:</span>
            <input id="eliza-bcd-probe-input" type="text" maxlength="18" value="${esc(hashInfo.word || "HERE")}" aria-label="Word to inspect 36-bit BCD hash" />
          </label>
        </div>
        <div class="xray-bcd-chars">
          ${hashInfo.bcdChars.map((ch) => `
            <div class="xray-bcd-cell">
              <span class="xray-bcd-ch">${ch.char === " " ? "␣" : esc(ch.char)}</span>
              <span class="xray-bcd-oct">${ch.octal}₈</span>
              <span class="xray-bcd-bits">${ch.bits}</span>
            </div>
          `).join("")}
        </div>
        <div class="xray-bcd-summary">
          <span>36-bit Word: <code>${esc(hashInfo.word36Octal)}₈</code></span>
          <span>Mid-Square Hash → <strong>Memory Form #${hashInfo.hashIndex}</strong></span>
        </div>
      </div>
    </div>
  `;
}

function renderXray() {
  const inspected = getInspectedEntry();
  const stageMode = state.xrayStage;

  xrayStageButtons.forEach((btn) => {
    const active = btn.dataset.xrayStage === stageMode;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });

  if (!inspected) {
    if (xrayTurnLabel) xrayTurnLabel.textContent = "Awaiting input";
    xrayBody.innerHTML = `
      <div class="xray-welcome">
        <h3>Inside the 1966 ELIZA Machine</h3>
        <p>Send a message or click <strong>▶ 1966 Paper (1/15)</strong> to inspect every mechanical step inside Weizenbaum&rsquo;s MAD-SLIP program:</p>
        <ol>
          <li><strong>Clause Guillotine</strong> cuts at <code>,</code> <code>.</code> <code>BUT</code>.</li>
          <li><strong>Pronoun Swap</strong> flips <code>I→YOU</code>, <code>MY→YOUR</code>.</li>
          <li><strong>KEYSTACK</strong> sorts keywords by rank (<code>COMPUTER = 50</code>).</li>
          <li><strong>Pattern Slots</strong> match <code>(0 ... 0)</code> wildcards.</li>
          <li><strong>Rotation Dial</strong> steps through canned replies.</li>
          <li><strong>BCD Memory</strong> hashes 36-bit Hollerith words for <code>LIMIT = 4</code>.</li>
        </ol>
      </div>
    `;
    return;
  }

  const { entry, index } = inspected;
  const { trace } = entry;
  if (xrayTurnLabel) {
    const turnNum = state.transcript.slice(0, index + 1).filter((m) => m.role === "ELIZA").length;
    xrayTurnLabel.textContent = `Turn #${turnNum} · ${trace.source || "NONE"}`;
  }

  const stages = [
    { id: "1", title: "1. Clause Guillotine", html: renderStage1Clause(trace) },
    { id: "2", title: "2. Token Scan & Swaps", html: renderStage2Scan(trace) },
    { id: "3", title: "3. KEYSTACK & Links", html: renderStage3Stack(trace) },
    { id: "4", title: "4. Decomposition Slots", html: renderStage4Pattern(trace) },
    { id: "5", title: "5. Reassembly Rotation Dial", html: renderStage5Dial(trace) },
    { id: "6", title: "6. Core MEMORY & 36-bit BCD", html: renderStage6MemoryBcd(trace) }
  ];

  const visibleStages = stageMode === "all" ? stages : stages.filter((s) => s.id === stageMode);

  xrayBody.innerHTML = visibleStages.map((s) => `
    <section class="xray-card">
      <h3>${s.title}</h3>
      ${s.html}
    </section>
  `).join("");
}

// ---------- Tab 2: Rule Browser, Builder, Raw Editor & Break Challenges ----------

function renderChallenges() {
  if (!challengesList) return;
  const solvedCount = BREAK_CHALLENGES.filter((c) => state.challengesSolved[c.id]).length;
  if (challengesProgress) {
    challengesProgress.textContent = `${solvedCount} / ${BREAK_CHALLENGES.length} Completed`;
  }

  challengesList.innerHTML = BREAK_CHALLENGES.map((ch) => {
    const done = Boolean(state.challengesSolved[ch.id]);
    return `
      <article class="challenge-card ${done ? "is-done" : ""}">
        <div class="challenge-card__head">
          <h3>${esc(ch.title)}</h3>
          <span class="challenge-badge">${done ? "SOLVED ✓" : "OPEN"}</span>
        </div>
        <p>${esc(ch.goal)}</p>
        <p class="challenge-hint"><strong>Tip:</strong> ${esc(ch.hint)}</p>
        <div class="challenge-actions">
          <button type="button" class="eliza-btn eliza-btn--sm" data-try-sample="${esc(ch.samplePrompt)}">Try Sample in Console</button>
          ${ch.id === "zero-meaning" && !done ? `<button type="button" class="eliza-btn eliza-btn--sm" data-mark-zero-meaning>Mark Observed</button>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function renderRuleBrowser() {
  if (!ruleBrowserList) return;
  const rules = eliza.getRuleList();
  const q = state.ruleFilter.trim().toUpperCase();
  const filtered = q
    ? rules.filter((r) =>
      r.keyword.includes(q) ||
      (r.substitute && r.substitute.includes(q)) ||
      r.tags.some((t) => t.toUpperCase().includes(q)) ||
      r.transforms.some((t) => t.decompositionText.includes(q)))
    : rules;

  ruleBrowserList.innerHTML = filtered.slice(0, 60).map((rule) => `
    <article class="rule-item">
      <div class="rule-item__head">
        <strong>${esc(rule.keyword)}</strong>
        <span class="rule-rank">Rank ${rule.precedence}</span>
        ${rule.substitute ? `<span class="rule-meta">→ ${esc(rule.substitute)}</span>` : ""}
        ${rule.tags.length ? `<span class="rule-meta">DLIST ${esc(rule.tags.join(" "))}</span>` : ""}
        ${rule.link ? `<span class="rule-meta">(=${esc(rule.link)})</span>` : ""}
      </div>
      ${rule.transforms.map((t) => `
        <div class="rule-transform">
          <code>${esc(t.decompositionText)}</code>
          <span class="rule-cursor">Cursor: ${t.cursor + 1}/${t.reassembly.length} → ${esc(t.reassembly[t.cursor] || "")}</span>
        </div>
      `).join("")}
    </article>
  `).join("") || `<p class="xray-empty">No rules matched &ldquo;${esc(q)}&rdquo;.</p>`;
}

function switchScriptSubtab(subtabId) {
  state.scriptSubtab = subtabId;
  scriptLabSubtabs.forEach((btn) => {
    const active = btn.dataset.scriptSubtab === subtabId;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  scriptLabPanels.forEach((panel) => {
    panel.hidden = panel.dataset.scriptSubpanel !== subtabId;
  });
  if (subtabId === "rules") renderRuleBrowser();
  if (subtabId === "raw" && rawEditorTextarea) {
    rawEditorTextarea.value = state.scriptText;
  }
}

function evaluateChallenges(trace) {
  let updated = false;
  for (const ch of BREAK_CHALLENGES) {
    if (state.challengesSolved[ch.id]) continue;
    if (ch.check(trace, state.challengeContext)) {
      state.challengesSolved[ch.id] = true;
      updated = true;
    }
  }
  if (updated) {
    saveState();
    if (state.activeTab === "scripts") renderChallenges();
  }
}

// ---------- Core Engine Lifecycle ----------

function loadScriptText(scriptText, presetId, systemNotice) {
  finishActiveTypewriter();
  const compiled = createEliza(scriptText);
  state.scriptText = scriptText;
  state.presetId = presetId;
  eliza = compiled;
  state.paperIndex = 0;
  state.transcript = [
    { role: "SYSTEM", text: systemNotice },
    { role: "ELIZA", text: eliza.opening, trace: null }
  ];
  state.inspectedTurnIndex = null;
  if (scriptSelect) {
    if (Array.from(scriptSelect.options).some((opt) => opt.value === presetId)) {
      scriptSelect.value = presetId;
    } else {
      scriptSelect.value = "custom";
    }
  }
  if (rawEditorTextarea) rawEditorTextarea.value = scriptText;
  if (paperNoteBanner) paperNoteBanner.hidden = true;
  renderTranscript();
  renderXray();
  renderRuleBrowser();
  updateHardwarePanel(null);
  updatePaperStepperUI();
  saveState();
}

function submitUserPrompt(rawPrompt, paperEntry = null) {
  const promptText = String(rawPrompt || "").trim();
  if (!promptText) return;
  finishActiveTypewriter();

  state.transcript.push({ role: "YOU", text: promptText, paperStep: paperEntry?.step || null });
  const { text: replyText, trace } = eliza.respond(promptText);
  evaluateChallenges(trace);

  if (paperEntry && paperNoteBanner) {
    paperNoteBanner.hidden = false;
    paperNoteBanner.textContent = `1966 CACM Turn ${paperEntry.step}/15 · ${paperEntry.mechanismTag} — ${paperEntry.note}`;
  } else if (paperNoteBanner && !paperEntry) {
    paperNoteBanner.hidden = true;
  }

  // Re-render human line quickly then animate ELIZA reply
  const userIdx = state.transcript.length - 1;
  const { article: userEl } = renderMessageElement(state.transcript[userIdx], userIdx);
  chatLog.appendChild(userEl);
  audio.playKeyStrike(false);

  appendLiveElizaMessage(replyText, trace, paperEntry?.step || null);
  updateHardwarePanel(trace);
  renderXray();
  if (state.activeTab === "scripts") renderRuleBrowser();
  saveState();
}

function step1966Paper() {
  if (state.paperIndex >= CACM_1966_TRANSCRIPT.length) {
    loadScriptText(DOCTOR_1966, "doctor-1966", "Restarted 1966 CACM paper demonstration (DOCTOR script).");
    return;
  }
  if (state.paperIndex === 0 && (state.presetId !== "doctor-1966" || state.transcript.some((m) => m.role === "YOU"))) {
    loadScriptText(DOCTOR_1966, "doctor-1966", "Loaded fresh 1966 DOCTOR session for exact CACM paper playback.");
  }
  const entry = CACM_1966_TRANSCRIPT[state.paperIndex];
  state.paperIndex += 1;
  updatePaperStepperUI();
  submitUserPrompt(entry.prompt, entry);
}

// ---------- Event Wiring ----------

modeTabs.forEach((btn, idx) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.studioTab));
  btn.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const dir = event.key === "ArrowRight" ? 1 : -1;
    const next = modeTabs[(idx + dir + modeTabs.length) % modeTabs.length];
    next.focus();
    switchTab(next.dataset.studioTab);
  });
});

surfaceTeletypeBtn?.addEventListener("click", () => applySurface("teletype"));
surfaceCrtBtn?.addEventListener("click", () => applySurface("crt"));

speedSelect?.addEventListener("change", () => {
  state.speed = speedSelect.value;
  saveState();
});

audioToggleBtn?.addEventListener("click", () => {
  state.audioEnabled = !state.audioEnabled;
  audio.setEnabled(state.audioEnabled);
  audioToggleBtn.textContent = state.audioEnabled ? "Audio: On" : "Audio: Off";
  audioToggleBtn.setAttribute("aria-pressed", String(state.audioEnabled));
  audioToggleBtn.classList.toggle("is-active", state.audioEnabled);
});

scriptSelect?.addEventListener("change", () => {
  const id = scriptSelect.value;
  if (id === "custom") return;
  const preset = getPresetMeta(id);
  loadScriptText(preset.script, preset.id, `Loaded script: ${preset.label}.`);
  input.focus();
});

paperStepBtn?.addEventListener("click", () => {
  step1966Paper();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const val = input.value;
  if (!val.trim()) return;
  input.value = "";
  submitUserPrompt(val);
  input.focus();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

chatLog.addEventListener("click", (event) => {
  const inspectBtn = event.target.closest("[data-inspect-turn]");
  if (inspectBtn) {
    const idx = Number(inspectBtn.dataset.inspectTurn);
    if (Number.isInteger(idx)) {
      state.inspectedTurnIndex = idx;
      renderTranscript();
      renderXray();
    }
    return;
  }
  finishActiveTypewriter();
});

clearButton?.addEventListener("click", () => {
  const label = state.presetId === "custom" ? "Custom MAD-SLIP script" : getPresetMeta(state.presetId).label;
  loadScriptText(state.scriptText, state.presetId, `Cleared transcript. Active script: ${label}.`);
  input.focus();
});

resetButton?.addEventListener("click", () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
  state.challengesSolved = {};
  state.challengeContext.ruleHistory.clear();
  loadScriptText(DOCTOR_1966, "doctor-1966", "Reset to Joseph Weizenbaum's 1966 DOCTOR script (CACM, page 44).");
  renderChallenges();
  input.focus();
});

starters?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-prompt]");
  if (!btn) return;
  submitUserPrompt(btn.dataset.prompt || "");
  input.focus();
});

// X-Ray Stage Controls
const STAGE_ORDER = ["all", "1", "2", "3", "4", "5", "6"];
xrayStageButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.xrayStage = btn.dataset.xrayStage;
    renderXray();
  });
});

xrayPrevBtn?.addEventListener("click", () => {
  const i = STAGE_ORDER.indexOf(state.xrayStage);
  state.xrayStage = STAGE_ORDER[(i - 1 + STAGE_ORDER.length) % STAGE_ORDER.length];
  renderXray();
});

xrayNextBtn?.addEventListener("click", () => {
  const i = STAGE_ORDER.indexOf(state.xrayStage);
  state.xrayStage = STAGE_ORDER[(i + 1) % STAGE_ORDER.length];
  renderXray();
});

xrayBody.addEventListener("input", (event) => {
  if (event.target.id === "eliza-bcd-probe-input") {
    state.bcdProbeWord = event.target.value || "HERE";
    const info = computeSlipHashInfo(state.bcdProbeWord);
    const box = event.target.closest(".xray-bcd-box");
    if (!box) return;
    const charsEl = box.querySelector(".xray-bcd-chars");
    const sumEl = box.querySelector(".xray-bcd-summary");
    if (charsEl) {
      charsEl.innerHTML = info.bcdChars.map((ch) => `
        <div class="xray-bcd-cell">
          <span class="xray-bcd-ch">${ch.char === " " ? "␣" : esc(ch.char)}</span>
          <span class="xray-bcd-oct">${ch.octal}₈</span>
          <span class="xray-bcd-bits">${ch.bits}</span>
        </div>
      `).join("");
    }
    if (sumEl) {
      sumEl.innerHTML = `
        <span>36-bit Word: <code>${esc(info.word36Octal)}₈</code></span>
        <span>Mid-Square Hash → <strong>Memory Form #${info.hashIndex}</strong></span>
      `;
    }
  }
});

// Tab 2 Controls
scriptLabSubtabs.forEach((btn) => {
  btn.addEventListener("click", () => switchScriptSubtab(btn.dataset.scriptSubtab));
});

ruleSearchInput?.addEventListener("input", () => {
  state.ruleFilter = ruleSearchInput.value;
  renderRuleBrowser();
});

challengesList?.addEventListener("click", (event) => {
  const sampleBtn = event.target.closest("[data-try-sample]");
  if (sampleBtn) {
    const sample = sampleBtn.dataset.trySample || "";
    switchTab("console");
    input.value = sample;
    input.focus();
    return;
  }
  if (event.target.closest("[data-mark-zero-meaning]")) {
    state.challengesSolved["zero-meaning"] = true;
    saveState();
    renderChallenges();
  }
});

builderForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const kw = (builderKeyword?.value || "").trim().toUpperCase().replace(/[^A-Z0-9']/g, "");
  const rank = Math.max(0, Math.min(99, Number(builderRank?.value) || 25));
  const rawPat = (builderPattern?.value || `(0 ${kw} 0)`).trim().toUpperCase();
  const pat = rawPat.startsWith("(") ? rawPat : `(${rawPat})`;
  const replies = (builderReplies?.value || "")
    .split("\n")
    .map((line) => line.trim().toUpperCase())
    .filter(Boolean);

  if (!kw || !replies.length) {
    if (builderStatus) builderStatus.textContent = "Enter a keyword and at least one reply line.";
    return;
  }

  const ruleBlock = `\n(${kw} ${rank}\n    (${pat}\n${replies.map((r) => `        (${r})`).join("\n")}))\n`;
  const nextScript = /\(\)\s*$/.test(state.scriptText)
    ? state.scriptText.replace(/\(\)\s*$/, `${ruleBlock}\n()\n`)
    : `${state.scriptText}\n${ruleBlock}`;

  try {
    parseScript(nextScript);
    loadScriptText(nextScript, "custom", `Compiled custom rule ${kw}(${rank}) into live ELIZA engine.`);
    if (builderStatus) builderStatus.textContent = `Added ${kw} (rank ${rank}). Switch to Console & X-Ray to test it!`;
  } catch (err) {
    if (builderStatus) builderStatus.textContent = `Syntax error: ${err.message}`;
  }
});

rawCompileBtn?.addEventListener("click", () => {
  if (!rawEditorTextarea) return;
  try {
    parseScript(rawEditorTextarea.value);
    loadScriptText(rawEditorTextarea.value, "custom", "Compiled edited MAD-SLIP script into live engine.");
    if (rawStatus) rawStatus.textContent = "Compiled cleanly and loaded into console.";
  } catch (err) {
    if (rawStatus) rawStatus.textContent = `Parse error: ${err.message}`;
  }
});

rawRevertBtn?.addEventListener("click", () => {
  loadScriptText(DOCTOR_1966, "doctor-1966", "Restored original 1966 DOCTOR script.");
  if (rawStatus) rawStatus.textContent = "Reverted to 1966 DOCTOR script.";
});

// Self-check cards in editorial lesson below the studio
document.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-selfcheck-btn]");
  if (!btn) return;
  const card = btn.closest("[data-selfcheck-card]");
  const feedback = card?.querySelector("[data-selfcheck-feedback]");
  if (!card || !feedback) return;
  const isCorrect = btn.dataset.correct === "true";
  card.querySelectorAll("[data-selfcheck-btn]").forEach((b) => {
    b.classList.remove("is-picked-right", "is-picked-wrong");
  });
  btn.classList.add(isCorrect ? "is-picked-right" : "is-picked-wrong");
  feedback.hidden = false;
  feedback.textContent = btn.dataset.explain || (isCorrect ? "Correct!" : "Check the step trace above.");
});

// ---------- Initialize ----------

function initialize() {
  const restored = loadState();
  applySurface(state.surface);
  if (speedSelect) speedSelect.value = state.speed;
  if (scriptSelect) {
    scriptSelect.value = Array.from(scriptSelect.options).some((o) => o.value === state.presetId)
      ? state.presetId
      : "custom";
  }
  if (rawEditorTextarea) rawEditorTextarea.value = state.scriptText;

  if (restored && state.transcript.length) {
    eliza = createEliza(state.scriptText);
    const rebuilt = [];
    let lastTrace = null;
    for (const msg of state.transcript) {
      if (msg.role === "YOU") {
        rebuilt.push({ role: "YOU", text: msg.text, paperStep: msg.paperStep || null });
        const { text: replyText, trace } = eliza.respond(msg.text);
        rebuilt.push({ role: "ELIZA", text: replyText, trace, paperStep: msg.paperStep || null });
        lastTrace = trace;
      } else if (msg.role === "SYSTEM") {
        rebuilt.push({ role: "SYSTEM", text: msg.text });
      } else if (msg.role === "ELIZA" && !rebuilt.some((r) => r.role === "YOU")) {
        rebuilt.push({ role: "ELIZA", text: msg.text, trace: null });
      }
    }
    state.transcript = rebuilt;
    state.inspectedTurnIndex = rebuilt.length ? rebuilt.length - 1 : null;
    renderTranscript();
    renderXray();
    updateHardwarePanel(lastTrace);
  } else {
    loadScriptText(
      DOCTOR_1966,
      "doctor-1966",
      "IBM 7094 CTSS · MIT PROJECT MAC (1966). DOCTOR SCRIPT LOADED. CLICK ▶ 1966 PAPER OR TYPE BELOW."
    );
  }

  updatePaperStepperUI();
  renderChallenges();
  renderRuleBrowser();
  crtController = setupCrtOverlay();
  initEvolutionLab(evolutionMount);
}

initialize();
