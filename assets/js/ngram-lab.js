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
    metricsEl
  ];

  if (required.some((node) => !node)) {
    throw new Error("N-gram lab could not initialize. Missing required DOM nodes.");
  }

  const SAMPLE_CORPUS = [
    "Our class builds robots to solve real problems.",
    "We test each design, then improve the code.",
    "Curiosity helps us ask better questions.",
    "Teamwork helps us build better answers.",
    "When we share results, everyone learns faster.",
    "Good data and clear thinking guide strong decisions."
  ].join(" ");

  function splitSentences(text) {
    const clean = String(text || "").replace(/\r/g, " ").replace(/\n+/g, " ");
    const parts = clean.match(/[^.!?]+[.!?]?/g) || [];
    return parts.map((s) => s.trim()).filter(Boolean);
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
      const dist = [];
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
        dist.push([token, count / total]);
      }

      dist.sort((a, b) => b[1] - a[1]);
      return dist;
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
      const dist = [];

      if (this.smoothing === "laplace") {
        const predictionVocab = Array.from(this.vocab).filter((token) => token !== "<s>");
        const vocabSize = predictionVocab.length || 1;

        for (const token of predictionVocab) {
          const count = row.get(token) || 0;
          const prob = (count + 1) / (total + vocabSize);
          dist.push([token, prob]);
        }
      } else {
        for (const [token, count] of row.entries()) {
          if (token === "<s>") continue;
          dist.push([token, count / total]);
        }
      }

      dist.sort((a, b) => b[1] - a[1]);
      return {
        distribution: dist,
        contextSeen: true
      };
    }

    sample(distribution, temperature) {
      const t = Math.max(0, Number.isFinite(temperature) ? temperature : 1);

      if (!distribution.length) return "</s>";
      if (t === 0) return distribution[0][0];

      const weighted = distribution.map(([token, prob]) => {
        const safeProb = Math.max(prob, 1e-12);
        return [token, Math.pow(safeProb, 1 / t)];
      });

      let sum = 0;
      for (const [, w] of weighted) {
        sum += w;
      }

      let threshold = Math.random() * sum;
      for (const [token, w] of weighted) {
        threshold -= w;
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

  function stripBoundaries(tokens) {
    return tokens.filter((t) => t !== "<s>" && t !== "</s>");
  }

  function renderPredictions(distribution) {
    predictionsEl.innerHTML = "";

    const top = distribution.slice(0, 12);
    if (!top.length) {
      const li = document.createElement("li");
      li.textContent = "No predictions yet.";
      predictionsEl.appendChild(li);
      return;
    }

    for (const [token, prob] of top) {
      const li = document.createElement("li");
      const code = document.createElement("code");
      code.textContent = token;
      const label = document.createTextNode(` - ${(prob * 100).toFixed(1)}%`);
      li.appendChild(code);
      li.appendChild(label);
      predictionsEl.appendChild(li);
    }
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

      const addSpace = text.length > 0 && !text.endsWith("\n") && !noSpaceBefore.has(token) && !noSpaceAfter.has(previous);
      text += (addSpace ? " " : "") + token;
      previous = token;
    }

    return text.trim();
  }

  function printMetrics(data) {
    metricsEl.textContent = JSON.stringify(data, null, 2);
  }

  let model = null;

  function currentSeedTokens() {
    const seed = seedEl.value || "";
    const tokens = tokenize(seed, { lowercase: true });
    return stripBoundaries(tokens);
  }

  function refreshPredictions() {
    if (!model) {
      renderPredictions([]);
      return;
    }

    const seedTokens = currentSeedTokens();
    const { distribution } = model.getDistribution(seedTokens);
    renderPredictions(distribution);
  }

  loadSampleEl.addEventListener("click", () => {
    corpusEl.value = SAMPLE_CORPUS;
    outputEl.textContent = "Sample corpus loaded. Click Build Tables.";
  });

  buildEl.addEventListener("click", () => {
    const corpusText = (corpusEl.value || "").trim();

    if (!corpusText) {
      outputEl.textContent = "Paste a corpus first.";
      return;
    }

    const n = Math.max(1, Number(nEl.value) || 2);
    const smoothing = smoothingEl.value;
    const tokens = tokenize(corpusText, { lowercase: true });

    if (!tokens.length) {
      outputEl.textContent = "No valid tokens found. Try a larger corpus.";
      return;
    }

    model = new NGramModel(n, smoothing);
    model.train(tokens);

    outputEl.textContent = "Tables built. Type a seed and click Generate.";

    printMetrics({
      n: model.n,
      smoothing: model.smoothing,
      totalTokens: model.totalTokens,
      vocabSize: model.vocab.size,
      uniqueContexts: model.counts.size
    });

    refreshPredictions();
  });

  seedEl.addEventListener("input", () => {
    refreshPredictions();
  });

  generateEl.addEventListener("click", () => {
    if (!model) {
      outputEl.textContent = "Click Build Tables first.";
      return;
    }

    const steps = Math.max(1, Math.min(200, Number(lengthEl.value) || 30));
    const temperature = Math.max(0, Number.isFinite(Number(tempEl.value)) ? Number(tempEl.value) : 0.9);
    const seedTokens = currentSeedTokens();

    const generated = model.generate(seedTokens, steps, temperature);
    outputEl.textContent = prettyText(generated.tokens);

    printMetrics({
      n: model.n,
      smoothing: model.smoothing,
      steps,
      temperature,
      vocabSize: model.vocab.size,
      uniqueContexts: model.counts.size,
      generationCoverage: `${(generated.coverage * 100).toFixed(1)}%`
    });

    refreshPredictions();
  });

  printMetrics({
    status: "waiting"
  });
})();
