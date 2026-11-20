import { createEliza } from "./eliza-engine.js";
import { DOCTOR_1966 } from "./eliza-doctor-1966.js";
import {
  EVOLUTION_ERAS,
  EVOLUTION_PROMPTS,
  GRAMMAR_PARSES,
  NGRAM_NEXT_WORDS,
  TRANSFORMER_PROFILES,
  WORD2VEC_POINTS
} from "./eliza-presets.js";

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function tokenizeWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function cosineSim(a, b) {
  const dot = a.x * b.x + a.y * b.y;
  const magA = Math.hypot(a.x, a.y) || 1;
  const magB = Math.hypot(b.x, b.y) || 1;
  return dot / (magA * magB);
}

function softmaxWithTemp(logits, temperature) {
  const t = Math.max(0.08, temperature);
  const scaled = logits.map((item) => item.z / t);
  const maxVal = Math.max(...scaled);
  const exps = scaled.map((v) => Math.exp(v - maxVal));
  const sum = exps.reduce((acc, v) => acc + v, 0) || 1;
  return logits.map((item, idx) => ({
    token: item.token,
    z: item.z,
    prob: exps[idx] / sum
  }));
}

function buildFallbackGrammar(tokens) {
  const subj = tokens.slice(0, Math.min(2, tokens.length)).join(" ") || "—";
  const verb = tokens[2] || tokens[1] || "—";
  const rest = tokens.slice(3).join(" ") || "—";
  return {
    slots: [
      { role: "NP (Subject)", text: subj, status: "parsed" },
      { role: "VERB / LINK", text: verb, status: "parsed" },
      { role: "COMPLEMENT", text: rest, status: tokens.length > 5 ? "ambiguous" : "parsed" }
    ],
    idiomTest: "Custom input outside the fixed micro-world lexicon falls back to unknown-word tokens unless someone hand-writes new grammar rules."
  };
}

function buildFallbackNgrams(tokens, n) {
  const last = (tokens[tokens.length - 1] || "").toLowerCase().replace(/[^a-z']/g, "");
  if (last === "bank") {
    return [
      { word: "account", p: 0.36 },
      { word: "river", p: 0.25 },
      { word: "loan", p: 0.22 },
      { word: "today", p: 0.17 }
    ];
  }
  if (n === 3) {
    return [
      { word: "today", p: 0.39 },
      { word: "because", p: 0.28 },
      { word: "now", p: 0.20 },
      { word: "already", p: 0.13 }
    ];
  }
  return [
    { word: "and", p: 0.35 },
    { word: "now", p: 0.27 },
    { word: "because", p: 0.22 },
    { word: "too", p: 0.16 }
  ];
}

function buildFallbackAttention(tokens, focusIdx) {
  const weights = {};
  const total = tokens.length;
  if (!total) return weights;
  let sum = 0;
  for (let i = 0; i < total; i += 1) {
    const dist = Math.abs(i - focusIdx);
    const cleanLen = tokens[i].replace(/[^a-zA-Z]/g, "").length;
    const raw = (i === focusIdx ? 0.35 : 0.15) + (cleanLen > 4 ? 0.25 : 0.08) + 0.35 / (1 + dist * 0.7);
    weights[i] = raw;
    sum += raw;
  }
  for (let i = 0; i < total; i += 1) {
    weights[i] = weights[i] / sum;
  }
  return weights;
}

function buildFallbackLogits(tokens) {
  const last = (tokens[tokens.length - 1] || "").toLowerCase().replace(/[^a-z]/g, "");
  if (last === "too" || last === "very") {
    return [
      { token: "complicated", z: 2.2 },
      { token: "late", z: 1.9 },
      { token: "fast", z: 1.5 },
      { token: "quiet", z: 1.1 },
      { token: "waffle", z: -1.4 }
    ];
  }
  return [
    { token: "today", z: 2.15 },
    { token: "right", z: 1.80 },
    { token: "because", z: 1.52 },
    { token: "anyway", z: 1.10 },
    { token: "penguin", z: -1.35 }
  ];
}

export function initEvolutionLab(container) {
  if (!container) return null;

  const state = {
    promptId: EVOLUTION_PROMPTS[0].id,
    useAlt: false,
    customText: EVOLUTION_PROMPTS[0].text,
    eraId: "1966",
    showIdiomFailure: false,
    ngramN: 2,
    selectedVecWord: "bank",
    showAnalogy: true,
    rnnStep: tokenizeWords(EVOLUTION_PROMPTS[0].text).length,
    rnnTimer: null,
    focusTokenIdx: null,
    temperature: 0.7,
    sampledToken: null
  };

  function currentPromptMeta() {
    return EVOLUTION_PROMPTS.find((p) => p.id === state.promptId) || null;
  }

  function currentPromptText() {
    const meta = currentPromptMeta();
    if (meta && !state.isCustom) {
      return state.useAlt && meta.altText ? meta.altText : meta.text;
    }
    return state.customText;
  }

  function stopRnnPlayback() {
    if (state.rnnTimer) {
      clearInterval(state.rnnTimer);
      state.rnnTimer = null;
    }
  }

  function selectPrompt(promptId, useAlt = false) {
    stopRnnPlayback();
    const meta = EVOLUTION_PROMPTS.find((p) => p.id === promptId);
    if (!meta) return;
    state.promptId = meta.id;
    state.isCustom = false;
    state.useAlt = Boolean(useAlt && meta.altText);
    state.customText = state.useAlt ? meta.altText : meta.text;
    const tokens = tokenizeWords(state.customText);
    state.rnnStep = tokens.length;
    const profile = TRANSFORMER_PROFILES[meta.id];
    state.focusTokenIdx = profile ? profile.focusIndex : Math.max(0, tokens.length - 1);
    state.sampledToken = null;
    render();
  }

  function applyCustomText(text) {
    stopRnnPlayback();
    const cleaned = String(text || "").trim();
    if (!cleaned) return;
    state.isCustom = true;
    state.customText = cleaned;
    const tokens = tokenizeWords(cleaned);
    state.rnnStep = tokens.length;
    state.focusTokenIdx = Math.max(0, tokens.length - 1);
    state.sampledToken = null;
    render();
  }

  function renderEra1966(text) {
    const eliza = createEliza(DOCTOR_1966);
    const { text: reply, trace } = eliza.respond(text);
    const ignoredClauses = trace.clauses.filter((c) => !c.kept);
    return `
      <div class="evo-stage-grid">
        <div class="evo-panel">
          <h3>Live 1966 ELIZA Execution</h3>
          <div class="evo-eliza-io">
            <div class="evo-io-row"><span class="evo-tag">INPUT</span><code>${esc(text)}</code></div>
            <div class="evo-io-row"><span class="evo-tag">KEYSTACK</span><code>${esc(trace.keystack.join(" → ") || "NONE")}</code></div>
            <div class="evo-io-row"><span class="evo-tag">KEPT CLAUSE</span><code>${esc(trace.clause || "(empty)")}</code></div>
            ${ignoredClauses.length ? `<div class="evo-io-row evo-io-warn"><span class="evo-tag">DROPPED</span><code>${esc(ignoredClauses.map((c) => c.text).join(" | "))}</code></div>` : ""}
            <div class="evo-io-row evo-io-reply"><span class="evo-tag">DOCTOR</span><strong>${esc(reply)}</strong></div>
          </div>
          <p class="evo-explain">
            Notice that ELIZA computes <strong>zero word meanings</strong> and keeps <strong>zero probabilities</strong>. It checks a fixed dictionary of ranked triggers (${esc(trace.source)} won), swaps pronouns, and inserts slices into a canned template.
          </p>
        </div>
      </div>
    `;
  }

  function renderEra1972(text) {
    const meta = currentPromptMeta();
    const tokens = tokenizeWords(text);
    const parse = (!state.isCustom && meta && GRAMMAR_PARSES[meta.id]) || buildFallbackGrammar(tokens);
    return `
      <div class="evo-stage-grid">
        <div class="evo-panel">
          <div class="evo-panel-head">
            <h3>Hand-Coded Parse Slots (1972 Symbolic Grammar)</h3>
            <button type="button" class="evo-mini-btn ${state.showIdiomFailure ? "is-active" : ""}" data-evo-action="toggle-idiom" aria-pressed="${state.showIdiomFailure}">
              ${state.showIdiomFailure ? "Hide Idiom Failure" : "Test Idiom / Common Sense"}
            </button>
          </div>
          <div class="evo-parse-tree">
            ${parse.slots.map((slot) => `
              <div class="evo-parse-node ${slot.status === "ambiguous" ? "is-ambiguous" : ""}">
                <span class="evo-parse-role">${esc(slot.role)}</span>
                <strong>${esc(slot.text)}</strong>
                <span class="evo-parse-status">${slot.status === "ambiguous" ? "Ambiguous" : "Matched"}</span>
              </div>
            `).join("")}
          </div>
          ${state.showIdiomFailure ? `<p class="evo-callout evo-callout-warn">${esc(parse.idiomTest)}</p>` : ""}
          <p class="evo-explain">
            Systems like Terry Winograd&rsquo;s <strong>SHRDLU (1972)</strong> parsed sentences into grammatical trees and logical objects—brilliant inside a closed toy blocks world, but fragile whenever everyday idioms or physical common sense appear.
          </p>
        </div>
      </div>
    `;
  }

  function renderEra1990s(text) {
    const meta = currentPromptMeta();
    const tokens = tokenizeWords(text);
    const windowSize = state.ngramN - 1;
    const cutoff = Math.max(0, tokens.length - windowSize);
    const probs = (!state.isCustom && meta && NGRAM_NEXT_WORDS[meta.id])
      ? (state.ngramN === 3 ? NGRAM_NEXT_WORDS[meta.id].trigram : NGRAM_NEXT_WORDS[meta.id].bigram)
      : buildFallbackNgrams(tokens, state.ngramN);

    return `
      <div class="evo-stage-grid">
        <div class="evo-panel">
          <div class="evo-panel-head">
            <h3>Sliding Context Window (Markov N-Gram)</h3>
            <div class="evo-segmented" role="group" aria-label="N-gram order">
              <button type="button" class="evo-mini-btn ${state.ngramN === 2 ? "is-active" : ""}" data-evo-action="ngram-2" aria-pressed="${state.ngramN === 2}">Bigram (n=2)</button>
              <button type="button" class="evo-mini-btn ${state.ngramN === 3 ? "is-active" : ""}" data-evo-action="ngram-3" aria-pressed="${state.ngramN === 3}">Trigram (n=3)</button>
            </div>
          </div>
          <div class="evo-token-strip" aria-label="Tokens visible to n-gram window">
            ${tokens.map((tok, idx) => {
              const visible = idx >= cutoff;
              return `<span class="evo-tok ${visible ? "is-visible" : "is-blind"}">${esc(tok)}<small>${visible ? "IN WINDOW" : "FORGOTTEN"}</small></span>`;
            }).join("")}
            <span class="evo-tok is-next">?</span>
          </div>
          <div class="evo-prob-list">
            ${probs.map((item) => `
              <div class="evo-prob-row">
                <span class="evo-prob-word">${esc(item.word)}</span>
                <div class="evo-prob-track"><div class="evo-prob-fill" style="width:${Math.round(item.p * 100)}%"></div></div>
                <span class="evo-prob-pct">${Math.round(item.p * 100)}%</span>
              </div>
            `).join("")}
          </div>
          <p class="evo-explain">
            An N-gram model only sees the last <strong>${windowSize} word${windowSize === 1 ? "" : "s"}</strong> (dimmed words are mathematically invisible). Notice how much of the sentence is ignored when predicting the next token!
          </p>
        </div>
      </div>
    `;
  }

  function renderEra2013() {
    const selected = WORD2VEC_POINTS.find((pt) => pt.word === state.selectedVecWord) || WORD2VEC_POINTS[8];
    const neighbors = WORD2VEC_POINTS
      .filter((pt) => pt.word !== selected.word)
      .map((pt) => ({ ...pt, sim: cosineSim(selected, pt) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 4);

    const W = 420;
    const H = 228;
    const toSvg = (pt) => ({
      sx: ((pt.x + 1) / 2) * (W - 76) + 38,
      sy: ((1 - pt.y) / 2) * (H - 44) + 22
    });

    const king = WORD2VEC_POINTS.find((p) => p.word === "king");
    const man = WORD2VEC_POINTS.find((p) => p.word === "man");
    const woman = WORD2VEC_POINTS.find((p) => p.word === "woman");
    const queen = WORD2VEC_POINTS.find((p) => p.word === "queen");

    const pKing = toSvg(king);
    const pMan = toSvg(man);
    const pWoman = toSvg(woman);
    const pQueen = toSvg(queen);

    return `
      <div class="evo-stage-grid evo-stage-grid--split">
        <div class="evo-panel">
          <div class="evo-panel-head">
            <h3>2D Semantic Vector Map (Click any word)</h3>
            <button type="button" class="evo-mini-btn ${state.showAnalogy ? "is-active" : ""}" data-evo-action="toggle-analogy" aria-pressed="${state.showAnalogy}">
              king − man + woman ≈ queen
            </button>
          </div>
          <svg class="evo-svg-map" viewBox="0 0 ${W} ${H}" role="img" aria-label="2D word embedding cluster diagram">
            <line x1="20" y1="${H / 2}" x2="${W - 20}" y2="${H / 2}" class="evo-axis" />
            <line x1="${W / 2}" y1="12" x2="${W / 2}" y2="${H - 12}" class="evo-axis" />
            ${state.showAnalogy ? `
              <g class="evo-analogy-arrows">
                <line x1="${pMan.sx}" y1="${pMan.sy}" x2="${pWoman.sx}" y2="${pWoman.sy}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 3" />
                <line x1="${pKing.sx}" y1="${pKing.sy}" x2="${pQueen.sx}" y2="${pQueen.sy}" stroke="#34d399" stroke-width="2.2" stroke-dasharray="4 3" />
              </g>
            ` : ""}
            ${WORD2VEC_POINTS.map((pt) => {
              const { sx, sy } = toSvg(pt);
              const isSel = pt.word === selected.word;
              const isBank = pt.word === "bank";
              return `
                <g class="evo-vec-node ${isSel ? "is-selected" : ""} ${isBank ? "is-polysemy" : ""}" data-vec-word="${esc(pt.word)}" tabindex="0" role="button" aria-label="Select word ${esc(pt.word)}">
                  <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${isSel ? 7 : 5}" />
                  <text x="${(sx + 8).toFixed(1)}" y="${(sy + 4).toFixed(1)}">${esc(pt.word)}</text>
                </g>
              `;
            }).join("")}
          </svg>
        </div>
        <div class="evo-panel">
          <h3>Selected Vector: &ldquo;${esc(selected.word)}&rdquo;</h3>
          <p class="evo-vec-coords">Coords: (${selected.x.toFixed(2)}, ${selected.y.toFixed(2)}) · ${esc(selected.note)}</p>
          <p class="evo-subhead">Nearest Neighbors by Cosine Similarity:</p>
          <div class="evo-prob-list">
            ${neighbors.map((nb) => {
              const pct = Math.max(0, Math.round(nb.sim * 100));
              return `
                <div class="evo-prob-row">
                  <span class="evo-prob-word">${esc(nb.word)}</span>
                  <div class="evo-prob-track"><div class="evo-prob-fill" style="width:${pct}%"></div></div>
                  <span class="evo-prob-pct">${nb.sim.toFixed(2)}</span>
                </div>
              `;
            }).join("")}
          </div>
          <p class="evo-callout evo-callout-info">
            Click <strong>&ldquo;bank&rdquo;</strong> on the map: Word2Vec assigns it <em>one</em> frozen point trapped halfway between <strong>river</strong> and <strong>loan</strong>—it cannot shift meaning by context.
          </p>
        </div>
      </div>
    `;
  }

  function renderEra2014(text) {
    const tokens = tokenizeWords(text);
    const maxStep = Math.max(1, tokens.length);
    const step = Math.min(Math.max(1, state.rnnStep), maxStep);
    const activeTokens = tokens.slice(0, step);
    const weights = activeTokens.map((_, idx) => Math.exp(-0.34 * (step - 1 - idx)));
    const maxW = Math.max(...weights, 1);

    return `
      <div class="evo-stage-grid">
        <div class="evo-panel">
          <div class="evo-panel-head">
            <h3>Sequential Hidden State h<sub>${step}</sub> (${step} / ${maxStep} tokens read)</h3>
            <div class="evo-segmented">
              <button type="button" class="evo-mini-btn" data-evo-action="rnn-replay">Replay Step-by-Step</button>
            </div>
          </div>
          <div class="evo-rnn-controls">
            <label for="evo-rnn-slider">Read up to token #${step}:</label>
            <input id="evo-rnn-slider" type="range" min="1" max="${maxStep}" value="${step}" data-evo-action="rnn-slider" />
          </div>
          <div class="evo-rnn-bars">
            ${tokens.map((tok, idx) => {
              if (idx >= step) {
                return `<div class="evo-rnn-cell is-unread"><span class="evo-rnn-tok">${esc(tok)}</span><span class="evo-rnn-pct">unread</span></div>`;
              }
              const retention = Math.round((weights[idx] / maxW) * 100);
              return `
                <div class="evo-rnn-cell ${retention < 35 ? "is-faded" : ""}">
                  <span class="evo-rnn-tok">${esc(tok)}</span>
                  <div class="evo-rnn-meter"><div style="height:${retention}%"></div></div>
                  <span class="evo-rnn-pct">${retention}%</span>
                </div>
              `;
            }).join("")}
          </div>
          <p class="evo-explain">
            An RNN / LSTM compresses every token seen so far into one fixed-size summary vector <strong>h<sub>t</sub></strong>. By token ${step}, early words have decayed steeply—forming a sequential bottleneck that Transformers solved.
          </p>
        </div>
      </div>
    `;
  }

  function renderEra2017(text) {
    const meta = currentPromptMeta();
    const tokens = tokenizeWords(text);
    const profile = (!state.isCustom && meta && TRANSFORMER_PROFILES[meta.id]) || null;
    const focusIdx = Math.min(
      Math.max(0, state.focusTokenIdx ?? (profile ? profile.focusIndex : tokens.length - 1)),
      Math.max(0, tokens.length - 1)
    );

    let attnMap = null;
    if (profile) {
      const linkSource = state.useAlt && profile.altLinks ? profile.altLinks : profile.links;
      attnMap = linkSource[focusIdx] || null;
    }
    if (!attnMap) {
      attnMap = buildFallbackAttention(tokens, focusIdx);
    }

    const rawLogits = profile
      ? (state.useAlt && profile.altLogits ? profile.altLogits : profile.logits)
      : buildFallbackLogits(tokens);
    const probs = softmaxWithTemp(rawLogits, state.temperature);

    const W = 560;
    const H = 132;
    const stepX = tokens.length > 1 ? (W - 60) / (tokens.length - 1) : 0;
    const xPos = (i) => (tokens.length === 1 ? W / 2 : 30 + i * stepX);
    const fx = xPos(focusIdx);

    return `
      <div class="evo-stage-grid evo-stage-grid--split">
        <div class="evo-panel">
          <div class="evo-panel-head">
            <h3>Self-Attention Arcs (Click any token)</h3>
            <span class="evo-badge">Focus: &ldquo;${esc(tokens[focusIdx] || "")}&rdquo;</span>
          </div>
          <svg class="evo-svg-attn" viewBox="0 0 ${W} ${H}" role="img" aria-label="Transformer self-attention arcs">
            ${tokens.map((tok, i) => {
              const w = attnMap[i] || 0;
              if (w < 0.04) return "";
              const tx = xPos(i);
              const midX = (fx + tx) / 2;
              const arcH = Math.min(82, 18 + Math.abs(tx - fx) * 0.24);
              const strokeW = (1 + w * 9).toFixed(1);
              return `
                <path d="M ${fx.toFixed(1)} ${H - 28} Q ${midX.toFixed(1)} ${(H - 28 - arcH).toFixed(1)} ${tx.toFixed(1)} ${H - 28}"
                  fill="none" stroke="#6ee7b7" stroke-opacity="${(0.28 + w * 0.72).toFixed(2)}" stroke-width="${strokeW}" />
              `;
            }).join("")}
            ${tokens.map((tok, i) => {
              const cx = xPos(i);
              const w = attnMap[i] || 0;
              const isFocus = i === focusIdx;
              return `
                <g class="evo-attn-node ${isFocus ? "is-focus" : ""}" data-attn-idx="${i}" tabindex="0" role="button" aria-label="Focus attention on ${esc(tok)}">
                  <circle cx="${cx.toFixed(1)}" cy="${H - 28}" r="${isFocus ? 7 : 4.5}" />
                  <text x="${cx.toFixed(1)}" y="${H - 9}" text-anchor="middle">${esc(tok.slice(0, 9))}</text>
                  ${w >= 0.08 ? `<text x="${cx.toFixed(1)}" y="${H - 40}" text-anchor="middle" class="evo-attn-pct">${Math.round(w * 100)}%</text>` : ""}
                </g>
              `;
            }).join("")}
          </svg>
          <p class="evo-explain">
            Unlike an RNN, every token connects directly to every other token in parallel. Click <strong>&ldquo;it&rdquo;</strong> or <strong>&ldquo;bank&rdquo;</strong> and toggle the prompt variant above to see attention weights shift immediately.
          </p>
        </div>

        <div class="evo-panel">
          <div class="evo-panel-head">
            <h3>Next-Token Softmax &amp; Temperature</h3>
            <button type="button" class="evo-mini-btn is-active" data-evo-action="sample-token">Sample Next Token</button>
          </div>
          <div class="evo-temp-row">
            <label for="evo-temp-slider">Temperature T = <strong>${state.temperature.toFixed(2)}</strong></label>
            <input id="evo-temp-slider" type="range" min="0.1" max="1.5" step="0.05" value="${state.temperature}" data-evo-action="temp-slider" />
          </div>
          <div class="evo-prob-list">
            ${probs.map((item) => `
              <div class="evo-prob-row ${state.sampledToken === item.token ? "is-sampled" : ""}">
                <span class="evo-prob-word">${esc(item.token)}</span>
                <div class="evo-prob-track"><div class="evo-prob-fill" style="width:${Math.round(item.prob * 100)}%"></div></div>
                <span class="evo-prob-pct">${(item.prob * 100).toFixed(1)}%</span>
              </div>
            `).join("")}
          </div>
          ${state.sampledToken ? `<p class="evo-callout evo-callout-info">Sampled token at T=${state.temperature.toFixed(2)}: <strong>&ldquo;${esc(state.sampledToken)}&rdquo;</strong>. Low T locks onto the top choice; high T flattens the curve and raises wild-card picks.</p>` : `<p class="evo-explain">Adjust Temperature <strong>T</strong> to see <code>softmax(z / T)</code> sharpen or flatten the next-token probability curve in real time.</p>`}
        </div>
      </div>
    `;
  }

  function render() {
    const text = currentPromptText();
    const meta = currentPromptMeta();
    const era = EVOLUTION_ERAS.find((e) => e.id === state.eraId) || EVOLUTION_ERAS[0];

    let stageHtml = "";
    if (era.id === "1966") stageHtml = renderEra1966(text);
    else if (era.id === "1972") stageHtml = renderEra1972(text);
    else if (era.id === "1990s") stageHtml = renderEra1990s(text);
    else if (era.id === "2013") stageHtml = renderEra2013();
    else if (era.id === "2014") stageHtml = renderEra2014(text);
    else stageHtml = renderEra2017(text);

    container.innerHTML = `
      <div class="evo-shell">
        <div class="evo-prompt-bar">
          <div class="evo-prompt-chips" role="group" aria-label="Comparison prompts">
            ${EVOLUTION_PROMPTS.map((p) => `
              <button type="button" class="evo-chip ${!state.isCustom && state.promptId === p.id ? "is-active" : ""}" data-evo-prompt="${esc(p.id)}">${esc(p.label)}</button>
            `).join("")}
          </div>
          <form class="evo-custom-form" data-evo-form>
            <label class="sr-only" for="evo-custom-input">Test sentence across eras</label>
            <input id="evo-custom-input" type="text" value="${esc(text)}" maxlength="180" />
            ${!state.isCustom && meta && meta.altText ? `
              <button type="button" class="evo-alt-btn ${state.useAlt ? "is-active" : ""}" data-evo-action="toggle-alt">${esc(meta.altLabel)}</button>
            ` : ""}
            <button type="submit" class="evo-run-btn">Run</button>
          </form>
        </div>

        <div class="evo-era-tabs" role="tablist" aria-label="Language model eras">
          ${EVOLUTION_ERAS.map((item) => `
            <button type="button" role="tab" aria-selected="${item.id === era.id}" class="evo-era-tab ${item.id === era.id ? "is-active" : ""}" data-evo-era="${esc(item.id)}">
              <span class="evo-era-yr">${esc(item.year)}</span>
              <span class="evo-era-name">${esc(item.shortTitle)}</span>
            </button>
          `).join("")}
        </div>

        <div class="evo-telemetry">
          <div class="evo-tel-item"><span>Learned Weights</span><strong>${esc(era.weights)}</strong></div>
          <div class="evo-tel-item"><span>Context Reach</span><strong>${esc(era.contextReach)}</strong></div>
          <div class="evo-tel-item"><span>Representation</span><strong>${esc(era.knowledge)}</strong></div>
          <div class="evo-tel-item"><span>Key Limit</span><strong>${esc(era.limit)}</strong></div>
        </div>

        <div class="evo-stage-body">
          <h2>${esc(era.title)}</h2>
          ${stageHtml}
        </div>
      </div>
    `;
  }

  container.addEventListener("click", (event) => {
    const promptBtn = event.target.closest("[data-evo-prompt]");
    if (promptBtn) {
      selectPrompt(promptBtn.dataset.evoPrompt, false);
      return;
    }

    const eraBtn = event.target.closest("[data-evo-era]");
    if (eraBtn) {
      stopRnnPlayback();
      state.eraId = eraBtn.dataset.evoEra;
      render();
      return;
    }

    const vecNode = event.target.closest("[data-vec-word]");
    if (vecNode) {
      state.selectedVecWord = vecNode.dataset.vecWord;
      render();
      return;
    }

    const attnNode = event.target.closest("[data-attn-idx]");
    if (attnNode) {
      state.focusTokenIdx = Number(attnNode.dataset.attnIdx);
      render();
      return;
    }

    const actionEl = event.target.closest("[data-evo-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.evoAction;
    if (action === "toggle-alt") {
      selectPrompt(state.promptId, !state.useAlt);
    } else if (action === "toggle-idiom") {
      state.showIdiomFailure = !state.showIdiomFailure;
      render();
    } else if (action === "ngram-2") {
      state.ngramN = 2;
      render();
    } else if (action === "ngram-3") {
      state.ngramN = 3;
      render();
    } else if (action === "toggle-analogy") {
      state.showAnalogy = !state.showAnalogy;
      render();
    } else if (action === "rnn-replay") {
      stopRnnPlayback();
      const total = tokenizeWords(currentPromptText()).length;
      state.rnnStep = 1;
      render();
      state.rnnTimer = setInterval(() => {
        if (state.rnnStep >= total) {
          stopRnnPlayback();
          return;
        }
        state.rnnStep += 1;
        render();
      }, 420);
    } else if (action === "sample-token") {
      const meta = currentPromptMeta();
      const tokens = tokenizeWords(currentPromptText());
      const profile = (!state.isCustom && meta && TRANSFORMER_PROFILES[meta.id]) || null;
      const rawLogits = profile
        ? (state.useAlt && profile.altLogits ? profile.altLogits : profile.logits)
        : buildFallbackLogits(tokens);
      const probs = softmaxWithTemp(rawLogits, state.temperature);
      let r = Math.random();
      let pick = probs[0].token;
      for (const item of probs) {
        r -= item.prob;
        if (r <= 0) {
          pick = item.token;
          break;
        }
      }
      state.sampledToken = pick;
      render();
    }
  });

  container.addEventListener("input", (event) => {
    const action = event.target?.dataset?.evoAction;
    if (action === "rnn-slider") {
      stopRnnPlayback();
      state.rnnStep = Number(event.target.value) || 1;
      render();
    } else if (action === "temp-slider") {
      state.temperature = Number(event.target.value) || 0.7;
      state.sampledToken = null;
      render();
    }
  });

  container.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const vecNode = event.target.closest("[data-vec-word]");
    if (vecNode) {
      event.preventDefault();
      state.selectedVecWord = vecNode.dataset.vecWord;
      render();
      return;
    }
    const attnNode = event.target.closest("[data-attn-idx]");
    if (attnNode) {
      event.preventDefault();
      state.focusTokenIdx = Number(attnNode.dataset.attnIdx);
      render();
    }
  });

  container.addEventListener("submit", (event) => {
    if (!event.target.matches("[data-evo-form]")) return;
    event.preventDefault();
    const inputEl = event.target.querySelector("#evo-custom-input");
    if (inputEl) applyCustomText(inputEl.value);
  });

  render();
  return {
    destroy: stopRnnPlayback
  };
}
