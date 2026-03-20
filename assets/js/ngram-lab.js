(function () {
  const byId = (id) => document.getElementById(id);

  const corpusEl = byId("ngram-corpus");
  const nEl = byId("ngram-order");
  const smoothingEl = byId("ngram-smoothing");
  const buildEl = byId("ngram-build");
  const loadSampleEl = byId("ngram-load-sample");
  const seedEl = byId("ngram-seed");
  const lengthEl = byId("ngram-length");
  const tempEl = byId("ngram-temp");
  const generateEl = byId("ngram-generate");
  const predictionsEl = byId("ngram-predictions");
  const outputEl = byId("ngram-output");
  const metricsEl = byId("ngram-metrics");
  const statusEl = byId("ngram-status");
  const metricCardsEl = byId("ngram-metric-cards");
  const modeGuidanceEl = byId("ngram-mode-guidance");
  const consoleRoot = byId("ngram-console");
  const contrastToggle = byId("ngram-toggle-contrast");
  const dyslexiaToggle = byId("ngram-toggle-dyslexia");
  const advancedDetailsEl = document.querySelector(".ngram-metrics-details");

  const corpusLabelEl = byId("ngram-corpus-label");
  const corpusHelpEl = byId("ngram-corpus-help");
  const orderLabelEl = byId("ngram-order-label");
  const orderHelpEl = byId("ngram-order-help");
  const smoothingLabelEl = byId("ngram-smoothing-label");
  const smoothingHelpEl = byId("ngram-smoothing-help");
  const seedLabelEl = byId("ngram-seed-label");
  const seedHelpEl = byId("ngram-seed-help");
  const lengthLabelEl = byId("ngram-length-label");
  const lengthHelpEl = byId("ngram-length-help");
  const tempLabelEl = byId("ngram-temp-label");
  const tempHelpEl = byId("ngram-temp-help");
  const predictionHeadingEl = byId("ngram-prediction-heading");

  const gradeButtons = Array.from(document.querySelectorAll("button[data-grade-mode]"));
  const presetButtons = Array.from(document.querySelectorAll("button[data-preset]"));
  const compactPanelButtons = Array.from(document.querySelectorAll("button[data-compact-panel]"));
  const compactPanelPanels = Array.from(document.querySelectorAll("[data-compact-panel-group]"));
  const compactLayoutMedia = window.matchMedia("(max-width: 980px), (max-height: 820px)");

  const required = [
    corpusEl,
    nEl,
    smoothingEl,
    buildEl,
    loadSampleEl,
    seedEl,
    lengthEl,
    tempEl,
    generateEl,
    predictionsEl,
    outputEl,
    metricsEl,
    statusEl,
    metricCardsEl,
    modeGuidanceEl,
    consoleRoot,
    contrastToggle,
    dyslexiaToggle,
    corpusLabelEl,
    corpusHelpEl,
    orderLabelEl,
    orderHelpEl,
    smoothingLabelEl,
    smoothingHelpEl,
    seedLabelEl,
    seedHelpEl,
    lengthLabelEl,
    lengthHelpEl,
    tempLabelEl,
    tempHelpEl,
    predictionHeadingEl
  ];

  if (
    required.some((node) => !node) ||
    gradeButtons.length === 0 ||
    presetButtons.length === 0 ||
    compactPanelButtons.length === 0 ||
    compactPanelPanels.length === 0
  ) {
    throw new Error("N-gram lab could not initialize. Missing required DOM nodes.");
  }

  const PRESETS = {
    animals: {
      label: "Animal Story",
      seed: "our class",
      corpus: [
        "Our class watches the rabbit nibble lettuce every morning.",
        "The rabbit twitches its nose when we open the hutch door.",
        "A curious gecko climbs the warm rock under the bright lamp.",
        "We record what each animal eats and how it moves.",
        "The class caretaker refills the water dish before science starts.",
        "By Friday we know which animal likes quiet corners and which one likes to explore."
      ].join(" ")
    },
    space: {
      label: "Space Story",
      seed: "the moon",
      corpus: [
        "The moon glows above the school field while the telescope waits.",
        "Students take turns spotting craters and tracing the bright edge of the lunar surface.",
        "A tiny rover model rolls across a map of dusty gray rocks.",
        "The class cheers when a streaking satellite crosses the dark sky.",
        "Our notes compare stars, planets, and the cold silence of space.",
        "By the end of the night we can explain why the moon seems to change shape."
      ].join(" ")
    },
    school: {
      label: "School News",
      seed: "today our",
      corpus: [
        "Today our class tested paper bridges during the engineering block.",
        "The strongest bridge held a stack of science books without bending.",
        "After lunch the news team interviewed students about the spring showcase.",
        "The art room painted banners while the robotics group practiced code updates.",
        "Teachers shared shout-outs for teamwork, revision, and brave problem solving.",
        "The afternoon ended with music, applause, and a hallway full of proud families."
      ].join(" ")
    },
    poetry: {
      label: "Poetry",
      seed: "soft light",
      corpus: [
        "Soft light slips across the window and paints the floor gold.",
        "Rain taps a quiet rhythm while the classroom settles into a hush.",
        "A pencil scratches bright ideas into the wide blue notebook lines.",
        "Outside, wind gathers leaves and spins them into a dancing swirl.",
        "Inside, each whisper grows into a story waiting for its next word.",
        "The final bell rings like a silver note at the end of a song."
      ].join(" ")
    },
    classroom: {
      label: "Classroom Sample",
      seed: "teamwork helps",
      corpus: [
        "Our class builds robots to solve real problems.",
        "We test each design, then improve the code.",
        "Curiosity helps us ask better questions.",
        "Teamwork helps us build better answers.",
        "When we share results, everyone learns faster.",
        "Good data and clear thinking guide strong decisions."
      ].join(" ")
    }
  };

  const MODE_META = {
    discover: {
      guidance:
        "Discover mode: Start with a sample, teach the robot, and watch which words it likes to guess next.",
      labels: {
        corpus: "Story Text",
        corpusHelp: "Tip: 3 to 8 sentences works great.",
        order: "Memory Window",
        orderHelp: "How many previous words the robot remembers.",
        smoothing: "Fairness Boost",
        smoothingHelp: "Gives rare words a tiny chance instead of getting stuck.",
        seed: "Starter Phrase",
        seedHelp: 'Try something short like "our class" or "the moon".',
        length: "How Long?",
        lengthHelp: "How many new words to write.",
        temp: "Randomness",
        tempHelp: "Lower is safer. Higher is wilder.",
        predictionHeading: "Top Next-Word Guesses"
      }
    },
    explorer: {
      guidance:
        "Explorer mode: Compare how context size and randomness change the robot's best next-word prediction.",
      labels: {
        corpus: "Corpus Text",
        corpusHelp: "Use a short training corpus with repeated patterns.",
        order: "Context Window",
        orderHelp: "How many earlier words become part of the current context.",
        smoothing: "Smoothing",
        smoothingHelp: "Use Laplace smoothing to soften zero-probability dead ends.",
        seed: "Seed Text",
        seedHelp: "Use a seed that matches the corpus if you want stronger predictions.",
        length: "Generated Tokens",
        lengthHelp: "How many new tokens to sample.",
        temp: "Temperature",
        tempHelp: "Lower is more predictable. Higher increases variation.",
        predictionHeading: "Top Next-Token Predictions"
      }
    },
    analyst: {
      guidance:
        "Analyst mode: Inspect the corpus, n-gram order, smoothing, and temperature like a compact language-model lab.",
      labels: {
        corpus: "Training Corpus",
        corpusHelp: "Each sentence becomes tokens with start and end markers.",
        order: "N-gram Order (n)",
        orderHelp: "Higher n increases local context but needs more matching history.",
        smoothing: "Laplace Smoothing",
        smoothingHelp: "Adds one count to each token in the prediction vocabulary.",
        seed: "Seed Text",
        seedHelp: "The active context comes from the trailing n-1 tokens in this seed.",
        length: "Sampled Tokens",
        lengthHelp: "Number of generated steps before the run stops.",
        temp: "Temperature",
        tempHelp: "Probability weights are adjusted before sampling.",
        predictionHeading: "Top Next-Token Predictions"
      }
    }
  };

  const state = {
    presetKey: "animals",
    gradeMode: "discover",
    highContrast: false,
    dyslexicFont: false,
    renderVersion: 0,
    compactPanel: "play"
  };

  let model = null;

  function splitSentences(text) {
    const clean = String(text || "").replace(/\r/g, " ").replace(/\n+/g, " ");
    const parts = clean.match(/[^.!?]+[.!?]?/g) || [];
    return parts.map((sentence) => sentence.trim()).filter(Boolean);
  }

  function tokenize(text, options) {
    const lowercase = options?.lowercase !== false;
    const sentences = splitSentences(text);
    const tokens = [];

    for (const sentence of sentences) {
      const normalized = lowercase ? sentence.toLowerCase() : sentence;
      const pieces = normalized.match(/[a-z0-9]+(?:'[a-z0-9]+)?|[.,!?;:()"-]/gi) || [];

      if (!pieces.length) continue;

      tokens.push("<s>");
      for (const token of pieces) {
        tokens.push(token);
      }
      tokens.push("</s>");
    }

    return tokens;
  }

  function makeKey(tokens) {
    return tokens.join("\u0001");
  }

  class NGramModel {
    constructor(n, smoothing) {
      this.n = Math.max(1, Number(n) || 2);
      this.smoothing = smoothing === "laplace" ? "laplace" : "none";
      this.vocab = new Set();
      this.counts = new Map();
      this.contextTotals = new Map();
      this.unigramTotals = new Map();
      this.totalTokens = 0;
    }

    train(tokens) {
      this.vocab = new Set(tokens);
      this.counts = new Map();
      this.contextTotals = new Map();
      this.unigramTotals = new Map();
      this.totalTokens = tokens.length;

      const contextSize = this.n - 1;

      for (let i = 0; i < tokens.length; i += 1) {
        const nextToken = tokens[i];
        this.unigramTotals.set(nextToken, (this.unigramTotals.get(nextToken) || 0) + 1);

        const context = contextSize === 0 ? [] : tokens.slice(Math.max(0, i - contextSize), i);
        while (context.length < contextSize) {
          context.unshift("<s>");
        }

        const key = makeKey(context);
        if (!this.counts.has(key)) {
          this.counts.set(key, new Map());
        }

        const row = this.counts.get(key);
        row.set(nextToken, (row.get(nextToken) || 0) + 1);
        this.contextTotals.set(key, (this.contextTotals.get(key) || 0) + 1);
      }
    }

    contextKeyFromTokens(contextTokens) {
      const contextSize = this.n - 1;
      const context = contextSize === 0 ? [] : contextTokens.slice(-contextSize);
      while (context.length < contextSize) {
        context.unshift("<s>");
      }
      return makeKey(context);
    }

    getGlobalUnigramDistribution() {
      const distribution = [];
      let total = 0;

      for (const [token, count] of this.unigramTotals.entries()) {
        if (token === "<s>") continue;
        total += count;
      }

      if (total <= 0) {
        return [["</s>", 1]];
      }

      for (const [token, count] of this.unigramTotals.entries()) {
        if (token === "<s>") continue;
        distribution.push([token, count / total]);
      }

      distribution.sort((a, b) => b[1] - a[1]);
      return distribution;
    }

    getDistribution(contextTokens) {
      const key = this.contextKeyFromTokens(contextTokens);
      const row = this.counts.get(key);

      if (!row) {
        return {
          distribution: this.getGlobalUnigramDistribution(),
          contextSeen: false
        };
      }

      const total = this.contextTotals.get(key) || 0;
      const distribution = [];

      if (this.smoothing === "laplace") {
        const predictionVocab = Array.from(this.vocab).filter((token) => token !== "<s>");
        const vocabSize = predictionVocab.length || 1;

        for (const token of predictionVocab) {
          const count = row.get(token) || 0;
          distribution.push([token, (count + 1) / (total + vocabSize)]);
        }
      } else {
        for (const [token, count] of row.entries()) {
          if (token === "<s>") continue;
          distribution.push([token, count / total]);
        }
      }

      distribution.sort((a, b) => b[1] - a[1]);
      return {
        distribution,
        contextSeen: true
      };
    }

    sample(distribution, temperature) {
      const t = Math.max(0, Number.isFinite(temperature) ? temperature : 1);

      if (!distribution.length) return "</s>";
      if (t === 0) return distribution[0][0];

      const weighted = distribution.map(([token, probability]) => {
        const safeProbability = Math.max(probability, 1e-12);
        return [token, Math.pow(safeProbability, 1 / t)];
      });

      let sum = 0;
      for (const [, weight] of weighted) {
        sum += weight;
      }

      let threshold = Math.random() * sum;
      for (const [token, weight] of weighted) {
        threshold -= weight;
        if (threshold <= 0) {
          return token;
        }
      }

      return weighted[weighted.length - 1][0];
    }

    generate(seedTokens, steps, temperature) {
      const out = seedTokens.slice();
      const totalSteps = Math.max(1, Number(steps) || 30);
      let seenContextHits = 0;

      for (let i = 0; i < totalSteps; i += 1) {
        const { distribution, contextSeen } = this.getDistribution(out);

        if (contextSeen) {
          seenContextHits += 1;
        }

        const nextToken = this.sample(distribution, temperature);
        out.push(nextToken);
      }

      return {
        tokens: out,
        coverage: seenContextHits / totalSteps
      };
    }
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function stripBoundaries(tokens) {
    return tokens.filter((token) => token !== "<s>" && token !== "</s>");
  }

  function prettyText(tokens) {
    const noSpaceBefore = new Set([",", ".", "!", "?", ";", ":", ")"]);
    const noSpaceAfter = new Set(["("]);

    let text = "";
    let previous = "";

    for (const token of tokens) {
      if (token === "<s>") continue;
      if (token === "</s>") {
        text = text.trimEnd() + "\n";
        previous = token;
        continue;
      }

      const addSpace =
        text.length > 0 &&
        !text.endsWith("\n") &&
        !noSpaceBefore.has(token) &&
        !noSpaceAfter.has(previous);

      text += (addSpace ? " " : "") + token;
      previous = token;
    }

    return text.trim();
  }

  function printMetrics(data) {
    metricsEl.textContent = JSON.stringify(data, null, 2);
  }

  function currentSeedTokens() {
    const seed = seedEl.value || "";
    return stripBoundaries(tokenize(seed, { lowercase: true }));
  }

  function nLabel(n) {
    if (n === 1) return "Unigram";
    if (n === 2) return "Bigram";
    if (n === 3) return "Trigram";
    return `${n}-gram`;
  }

  function smoothingLabel(smoothing) {
    return smoothing === "laplace" ? "Laplace (+1)" : "None";
  }

  function randomnessLabel(temperature) {
    if (temperature <= 0.35) return "Focused";
    if (temperature <= 0.95) return "Balanced";
    return "Wild";
  }

  function formatPredictionToken(token) {
    if (!token) return "None yet";
    if (token === "</s>") return "END";
    return token;
  }

  function updateConsoleClasses() {
    consoleRoot.classList.toggle("ngram-high-contrast", state.highContrast);
    consoleRoot.classList.toggle("ngram-dyslexic", state.dyslexicFont);
  }

  function applyCompactPanels() {
    const isCompact = compactLayoutMedia.matches;

    for (const button of compactPanelButtons) {
      const active = button.dataset.compactPanel === state.compactPanel;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    }

    for (const panel of compactPanelPanels) {
      const active = panel.dataset.compactPanelGroup === state.compactPanel;
      const visible = isCompact ? active : true;
      panel.classList.toggle("is-active", visible);
      panel.hidden = !visible;
    }
  }

  function setCompactPanel(panelKey) {
    if (!compactPanelPanels.some((panel) => panel.dataset.compactPanelGroup === panelKey)) return;
    state.compactPanel = panelKey;
    applyCompactPanels();
  }

  function renderMetricCards(cards) {
    metricCardsEl.innerHTML = "";

    for (const card of cards) {
      const article = document.createElement("article");
      article.className = "ngram-metric-card";

      const label = document.createElement("span");
      label.className = "ngram-metric-label";
      label.textContent = card.label;

      const value = document.createElement("strong");
      value.className = "ngram-metric-value";
      value.textContent = card.value;

      const detail = document.createElement("p");
      detail.className = "ngram-metric-detail";
      detail.textContent = card.detail;

      article.appendChild(label);
      article.appendChild(value);
      article.appendChild(detail);
      metricCardsEl.appendChild(article);
    }
  }

  function showStaticOutput(text) {
    state.renderVersion += 1;
    outputEl.textContent = text;
  }

  function animateOutput(text) {
    state.renderVersion += 1;
    const version = state.renderVersion;
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      outputEl.textContent = text;
      return;
    }

    const pieces = text.match(/\S+\s*/g) || [text];
    if (pieces.length <= 6) {
      outputEl.textContent = text;
      return;
    }

    outputEl.textContent = "";
    const delay = Math.max(18, Math.min(60, Math.round(1800 / pieces.length)));
    let index = 0;

    const step = () => {
      if (version !== state.renderVersion) return;
      outputEl.textContent += pieces[index];
      index += 1;
      if (index < pieces.length) {
        window.setTimeout(step, delay);
      }
    };

    step();
  }

  function getPredictionSnapshot() {
    if (!model) {
      return {
        distribution: [],
        contextSeen: false,
        topToken: null,
        topProbability: 0
      };
    }

    const { distribution, contextSeen } = model.getDistribution(currentSeedTokens());
    return {
      distribution,
      contextSeen,
      topToken: distribution[0]?.[0] || null,
      topProbability: distribution[0]?.[1] || 0
    };
  }

  function updateSummaryCards(stage, extra) {
    if (!model) {
      renderMetricCards([
        {
          label: "Status",
          value: "Waiting",
          detail: "Pick a sample or paste your own text."
        },
        {
          label: "Step 1",
          value: "Teach",
          detail: "Build the robot's word memory."
        },
        {
          label: "Step 2",
          value: "Predict",
          detail: "Type a short starter phrase."
        },
        {
          label: "Step 3",
          value: "Generate",
          detail: "See what the robot writes next."
        }
      ]);
      return;
    }

    const snapshot = getPredictionSnapshot();
    const cards =
      stage === "generated"
        ? [
            {
              label: state.gradeMode === "discover" ? "Words Learned" : "Total Tokens",
              value: String(model.totalTokens),
              detail: "How much text the robot studied."
            },
            {
              label: state.gradeMode === "discover" ? "Unique Words" : "Vocabulary Size",
              value: String(model.vocab.size),
              detail: "How many different words it noticed."
            },
            {
              label: "Context Match",
              value: `${Math.round((extra?.coverage || 0) * 100)}%`,
              detail: "How often it found a familiar pattern while generating."
            },
            {
              label: "Randomness",
              value: randomnessLabel(extra?.temperature || 0),
              detail: "Lower is safer. Higher is more surprising."
            }
          ]
        : [
            {
              label: state.gradeMode === "discover" ? "Words Learned" : "Total Tokens",
              value: String(model.totalTokens),
              detail: "How much text the robot has studied."
            },
            {
              label: state.gradeMode === "discover" ? "Unique Words" : "Vocabulary Size",
              value: String(model.vocab.size),
              detail: "How many different words it has seen."
            },
            {
              label: state.gradeMode === "discover" ? "Memory Mode" : "N-gram Order",
              value: nLabel(model.n),
              detail: "More context can help, but it also needs more matches."
            },
            {
              label: stage === "trained" ? "Best Next Guess" : "Top Prediction",
              value:
                snapshot.topToken
                  ? `${formatPredictionToken(snapshot.topToken)} ${
                      snapshot.topProbability ? `(${(snapshot.topProbability * 100).toFixed(0)}%)` : ""
                    }`.trim()
                  : "Waiting",
              detail: snapshot.contextSeen
                ? "This guess comes from a matching pattern in the corpus."
                : "No exact match yet, so the robot is using overall word counts."
            }
          ];

    renderMetricCards(cards);
  }

  function renderPredictions(distribution) {
    predictionsEl.innerHTML = "";

    const top = distribution.slice(0, 8);
    if (!top.length) {
      const li = document.createElement("li");
      li.className = "ngram-prediction-empty";
      li.textContent = "Teach the robot to unlock predictions.";
      predictionsEl.appendChild(li);
      return;
    }

    for (const [token, probability] of top) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ngram-prediction-chip";
      button.dataset.token = token;
      button.setAttribute(
        "aria-label",
        `Use ${formatPredictionToken(token)} as the next token with ${(probability * 100).toFixed(1)} percent probability`
      );

      const tokenSpan = document.createElement("span");
      tokenSpan.className = "ngram-prediction-token";
      tokenSpan.textContent = formatPredictionToken(token);

      const bar = document.createElement("span");
      bar.className = "ngram-prediction-bar";
      bar.setAttribute("aria-hidden", "true");

      const fill = document.createElement("span");
      fill.className = "ngram-prediction-fill";
      fill.style.width = `${Math.max(6, probability * 100)}%`;
      bar.appendChild(fill);

      const probabilitySpan = document.createElement("span");
      probabilitySpan.className = "ngram-prediction-prob";
      probabilitySpan.textContent = `${(probability * 100).toFixed(1)}%`;

      button.appendChild(tokenSpan);
      button.appendChild(bar);
      button.appendChild(probabilitySpan);
      li.appendChild(button);
      predictionsEl.appendChild(li);
    }
  }

  function refreshPredictions() {
    const snapshot = getPredictionSnapshot();
    renderPredictions(snapshot.distribution);
    updateSummaryCards("live");
  }

  function applyMode(modeKey) {
    const meta = MODE_META[modeKey] || MODE_META.discover;
    state.gradeMode = modeKey;
    consoleRoot.dataset.gradeMode = modeKey;

    corpusLabelEl.textContent = meta.labels.corpus;
    corpusHelpEl.textContent = meta.labels.corpusHelp;
    orderLabelEl.textContent = meta.labels.order;
    orderHelpEl.textContent = meta.labels.orderHelp;
    smoothingLabelEl.textContent = meta.labels.smoothing;
    smoothingHelpEl.textContent = meta.labels.smoothingHelp;
    seedLabelEl.textContent = meta.labels.seed;
    seedHelpEl.textContent = meta.labels.seedHelp;
    lengthLabelEl.textContent = meta.labels.length;
    lengthHelpEl.textContent = meta.labels.lengthHelp;
    tempLabelEl.textContent = meta.labels.temp;
    tempHelpEl.textContent = meta.labels.tempHelp;
    predictionHeadingEl.textContent = meta.labels.predictionHeading;
    modeGuidanceEl.textContent = meta.guidance;

    for (const button of gradeButtons) {
      const active = button.dataset.gradeMode === modeKey;
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.classList.toggle("is-active", active);
    }

    if (advancedDetailsEl) {
      advancedDetailsEl.open = modeKey === "analyst";
    }

    updateSummaryCards("live");
  }

  function syncPresetButtons() {
    for (const button of presetButtons) {
      const active = button.dataset.preset === state.presetKey;
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.classList.toggle("is-active", active);
    }
  }

  function loadPreset(presetKey, options) {
    const preset = PRESETS[presetKey] || PRESETS.animals;
    state.presetKey = presetKey in PRESETS ? presetKey : "animals";
    corpusEl.value = preset.corpus;
    seedEl.value = preset.seed;
    syncPresetButtons();

    if (options?.autoBuild) {
      setStatus(`${preset.label} loading.`);
      buildModel({ announce: true });
      return;
    }

    model = null;
    showStaticOutput(`${preset.label} loaded. Click Teach the Robot to build its word memory.`);
    renderPredictions([]);
    updateSummaryCards("waiting");
    printMetrics({
      status: "preset-loaded",
      preset: preset.label
    });
    setStatus(`${preset.label} ready. Click Teach.`);
  }

  function buildModel(options) {
    setCompactPanel("play");
    const corpusText = (corpusEl.value || "").trim();
    if (!corpusText) {
      model = null;
      showStaticOutput("Paste or load a story first.");
      updateSummaryCards("waiting");
      setStatus("Add a story so the robot can learn.");
      printMetrics({
        status: "error",
        reason: "missing-corpus"
      });
      renderPredictions([]);
      return;
    }

    const tokens = tokenize(corpusText, { lowercase: true });
    if (!tokens.length) {
      model = null;
      showStaticOutput("No usable words were found. Try a slightly larger story.");
      updateSummaryCards("waiting");
      setStatus("That text did not give the robot enough words.");
      printMetrics({
        status: "error",
        reason: "no-valid-tokens"
      });
      renderPredictions([]);
      return;
    }

    model = new NGramModel(Math.max(1, Number(nEl.value) || 2), smoothingEl.value);
    model.train(tokens);

    if (!(seedEl.value || "").trim()) {
      seedEl.value = PRESETS[state.presetKey]?.seed || "our class";
    }

    refreshPredictions();
    const snapshot = getPredictionSnapshot();
    showStaticOutput(`Robot ready. Starter phrase: "${seedEl.value.trim()}". Click Generate to watch it continue the sentence.`);
    updateSummaryCards("trained");

    printMetrics({
      status: "trained",
      gradeMode: state.gradeMode,
      n: model.n,
      nLabel: nLabel(model.n),
      smoothing: model.smoothing,
      smoothingLabel: smoothingLabel(model.smoothing),
      totalTokens: model.totalTokens,
      vocabSize: model.vocab.size,
      uniqueContexts: model.counts.size,
      topPrediction: formatPredictionToken(snapshot.topToken),
      topPredictionProbability: `${(snapshot.topProbability * 100).toFixed(1)}%`
    });

    if (options?.announce !== false) {
      setStatus(
        `Ready: ${model.totalTokens} tokens, ${model.vocab.size} words, top guess ${formatPredictionToken(snapshot.topToken)}.`
      );
    }
  }

  function generateText() {
    setCompactPanel("play");
    if (!model) {
      showStaticOutput("Teach the robot before asking it to write.");
      updateSummaryCards("waiting");
      setStatus("Click Teach so the robot can learn first.");
      return;
    }

    const steps = Math.max(1, Math.min(200, Number(lengthEl.value) || 30));
    const temperature = Math.max(0, Number.isFinite(Number(tempEl.value)) ? Number(tempEl.value) : 0.9);
    const generated = model.generate(currentSeedTokens(), steps, temperature);
    const generatedText = prettyText(generated.tokens);

    animateOutput(generatedText);
    updateSummaryCards("generated", {
      coverage: generated.coverage,
      temperature
    });

    printMetrics({
      status: "generated",
      gradeMode: state.gradeMode,
      n: model.n,
      nLabel: nLabel(model.n),
      smoothing: model.smoothing,
      smoothingLabel: smoothingLabel(model.smoothing),
      steps,
      temperature,
      temperatureLabel: randomnessLabel(temperature),
      vocabSize: model.vocab.size,
      uniqueContexts: model.counts.size,
      generationCoverage: `${(generated.coverage * 100).toFixed(1)}%`
    });

    setStatus(`Generated ${steps} words with ${nLabel(model.n).toLowerCase()} memory and ${randomnessLabel(temperature).toLowerCase()} randomness.`);
  }

  function addPredictionToSeed(token) {
    const noSpaceBefore = new Set([",", ".", "!", "?", ";", ":", ")"]);
    const current = seedEl.value.trimEnd();

    if (token === "</s>") {
      seedEl.value = current && !/[.!?]$/.test(current) ? `${current}.` : current;
      setStatus("Sentence end added. Generate again or start fresh.");
      refreshPredictions();
      return;
    }

    if (!current) {
      seedEl.value = token;
    } else if (noSpaceBefore.has(token)) {
      seedEl.value = `${current}${token}`;
    } else {
      seedEl.value = `${current} ${token}`;
    }

    refreshPredictions();
    setStatus(`${formatPredictionToken(token)} added. Generate again to keep going.`);
    seedEl.focus();
  }

  buildEl.addEventListener("click", () => {
    buildModel({ announce: true });
  });

  nEl.addEventListener("change", () => {
    if (!(corpusEl.value || "").trim()) return;
    buildModel({ announce: true });
  });

  smoothingEl.addEventListener("change", () => {
    if (!(corpusEl.value || "").trim()) return;
    buildModel({ announce: true });
  });

  loadSampleEl.addEventListener("click", () => {
    loadPreset("classroom", { autoBuild: true });
  });

  generateEl.addEventListener("click", () => {
    generateText();
  });

  seedEl.addEventListener("input", () => {
    if (!model) return;
    refreshPredictions();
    setStatus("Starter phrase updated.");
  });

  predictionsEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-token]");
    if (!button) return;
    addPredictionToSeed(button.dataset.token || "");
  });

  for (const button of presetButtons) {
    button.addEventListener("click", () => {
      loadPreset(button.dataset.preset || "animals", { autoBuild: true });
    });
  }

  for (const button of gradeButtons) {
    button.addEventListener("click", () => {
      applyMode(button.dataset.gradeMode || "discover");
    });
  }

  for (const button of compactPanelButtons) {
    button.addEventListener("click", () => {
      setCompactPanel(button.dataset.compactPanel || "play");
    });
  }

  contrastToggle.addEventListener("change", () => {
    state.highContrast = contrastToggle.checked;
    updateConsoleClasses();
  });

  dyslexiaToggle.addEventListener("change", () => {
    state.dyslexicFont = dyslexiaToggle.checked;
    updateConsoleClasses();
  });

  const handleCompactLayoutChange = () => {
    applyCompactPanels();
  };

  if (typeof compactLayoutMedia.addEventListener === "function") {
    compactLayoutMedia.addEventListener("change", handleCompactLayoutChange);
  } else if (typeof compactLayoutMedia.addListener === "function") {
    compactLayoutMedia.addListener(handleCompactLayoutChange);
  }

  applyMode(state.gradeMode);
  updateConsoleClasses();
  applyCompactPanels();
  updateSummaryCards("waiting");
  printMetrics({
    status: "waiting"
  });

  loadPreset(state.presetKey, { autoBuild: true });
})();
