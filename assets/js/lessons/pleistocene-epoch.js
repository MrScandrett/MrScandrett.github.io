(() => {
  "use strict";

  const horizons = [
    {
      date: "2.58 million years ago",
      kind: "Boundary",
      climate: "Long-term cooling",
      title: "The Pleistocene begins",
      story: "The formal boundary sits at 2.58 million years ago. Large Northern Hemisphere ice sheets had begun expanding as Earth entered a new pattern of glaciation.",
      evidence: "Marine sediment · oxygen isotopes"
    },
    {
      date: "About 1.8 million years ago",
      kind: "Human movement",
      climate: "Variable environments",
      title: "Hominins move beyond Africa",
      story: "Homo erectus populations were living beyond Africa by this time. The Pleistocene human story is a branching one, with several human species adapting to changing environments.",
      evidence: "Fossils · stone tools · dated sediments"
    },
    {
      date: "About 800,000 years ago",
      kind: "Climate rhythm",
      climate: "Longer glacial cycles",
      title: "The pacing changes",
      story: "Earlier glacial cycles strongly followed a roughly 41,000-year rhythm. By about 800,000 years ago, larger cycles near 100,000 years became prominent. Why this transition occurred remains an active research question.",
      evidence: "Deep-sea cores · oxygen-isotope stacks"
    },
    {
      date: "About 300,000 years ago",
      kind: "Human evolution",
      climate: "Repeated fluctuations",
      title: "Homo sapiens appears",
      story: "The oldest known fossils assigned to our species date to roughly 300,000 years ago in Africa. Other human species also lived during this part of the Pleistocene.",
      evidence: "Human fossils · archaeology · dating methods"
    },
    {
      date: "About 125,000 years ago",
      kind: "Interglacial",
      climate: "Relatively warm",
      title: "Ice retreats, seas rise",
      story: "During the last interglacial, global climate was warmer than during the glacial interval that followed. Smaller ice sheets meant higher seas and shifting coastlines.",
      evidence: "Coral terraces · marine sediment · ice cores"
    },
    {
      date: "About 21,000 years ago",
      kind: "Glacial maximum",
      climate: "Large ice sheets",
      title: "Ice volume reaches a peak",
      story: "Near the Last Glacial Maximum, immense ice sheets covered much of northern North America and northern Europe. So much water was stored on land that sea level was roughly 120 meters lower than today.",
      evidence: "Glacial landforms · coastlines · ocean cores"
    },
    {
      date: "11,700 years ago",
      kind: "Boundary",
      climate: "Rapid transition",
      title: "The Holocene begins",
      story: "The Pleistocene ends at 11,700 years ago. This boundary does not mean every glacier vanished or every ecosystem changed at once; it marks the start of the current Holocene Epoch.",
      evidence: "Greenland ice core · formal stratigraphy"
    }
  ];

  const slider = document.querySelector("#time-slider");
  const fields = {
    date: document.querySelector("#time-output"),
    kind: document.querySelector("#horizon-kind"),
    climate: document.querySelector("#horizon-climate"),
    title: document.querySelector("#horizon-title"),
    story: document.querySelector("#horizon-story"),
    evidence: document.querySelector("#horizon-evidence")
  };

  function updateHorizon() {
    const horizon = horizons[Number(slider.value)];
    Object.entries(fields).forEach(([key, node]) => { node.textContent = horizon[key]; });
    slider.setAttribute("aria-valuetext", horizon.date);
    const layers = document.querySelectorAll("#core-layers span");
    layers.forEach((layer, index) => {
      layer.style.opacity = index === horizons.length - 1 - Number(slider.value) ? "1" : ".48";
      layer.style.boxShadow = index === horizons.length - 1 - Number(slider.value) ? "inset 0 0 0 5px #e15f32" : "none";
    });
  }
  slider?.addEventListener("input", updateHorizon);
  updateHorizon();

  const canvas = document.querySelector("#orbit-canvas");
  const cycleInputs = [...document.querySelectorAll("[data-cycle]")];
  const playButton = document.querySelector("#play-signal");
  const signalStatus = document.querySelector("#signal-status");
  let phase = 0;
  let playing = false;
  let signalLoop = null;

  const colors = { eccentricity: "#e15f32", obliquity: "#d4ad67", precession: "#7db8c3" };
  const period = { eccentricity: 100, obliquity: 41, precession: 22 };

  function selectedCycles() {
    return cycleInputs.filter(input => input.checked).map(input => input.dataset.cycle);
  }

  function signalAt(thousandYears, selected) {
    if (!selected.length) return 0;
    return selected.reduce((sum, key) => {
      const amplitude = key === "eccentricity" ? .72 : key === "obliquity" ? .55 : .38;
      return sum + Math.sin((thousandYears / period[key]) * Math.PI * 2 + phase) * amplitude;
    }, 0) / Math.sqrt(selected.length);
  }

  function drawSignal() {
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(320, Math.round(box.width));
    const height = Math.max(230, Math.round(box.height));
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const pad = { x: 28, y: 26 };
    const selected = selectedCycles();

    ctx.strokeStyle = "rgba(243,239,223,.13)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i += 1) {
      const x = pad.x + (width - pad.x * 2) * i / 8;
      ctx.beginPath(); ctx.moveTo(x, pad.y); ctx.lineTo(x, height - pad.y); ctx.stroke();
    }
    [-1, 0, 1].forEach(level => {
      const y = height / 2 - level * (height * .27);
      ctx.beginPath(); ctx.moveTo(pad.x, y); ctx.lineTo(width - pad.x, y); ctx.stroke();
    });

    selected.forEach(key => {
      ctx.beginPath();
      ctx.strokeStyle = colors[key];
      ctx.globalAlpha = .32;
      ctx.lineWidth = 1.5;
      for (let px = 0; px <= width - pad.x * 2; px += 2) {
        const ky = 400 - (px / (width - pad.x * 2)) * 400;
        const val = Math.sin((ky / period[key]) * Math.PI * 2 + phase) * .6;
        const y = height / 2 - val * height * .28;
        px === 0 ? ctx.moveTo(pad.x + px, y) : ctx.lineTo(pad.x + px, y);
      }
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.strokeStyle = selected.length ? "#f3efdf" : "rgba(243,239,223,.35)";
    ctx.lineWidth = 3;
    for (let px = 0; px <= width - pad.x * 2; px += 2) {
      const ky = 400 - (px / (width - pad.x * 2)) * 400;
      const y = height / 2 - signalAt(ky, selected) * height * .25;
      px === 0 ? ctx.moveTo(pad.x + px, y) : ctx.lineTo(pad.x + px, y);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(243,239,223,.65)";
    ctx.font = "11px 'Spline Sans Mono', monospace";
    ctx.fillText("more", 2, pad.y + 5);
    ctx.fillText("less", 4, height - pad.y);
  }

  function announceCycles() {
    const selected = selectedCycles();
    signalStatus.textContent = selected.length ? `${selected.join(", ")} ${selected.length === 1 ? "rhythm is" : "rhythms are"} shown.` : "No orbital rhythms are shown; the combined trace is flat.";
  }

  cycleInputs.forEach(input => input.addEventListener("change", () => { drawSignal(); announceCycles(); }));
  window.addEventListener("resize", drawSignal);

  playButton?.addEventListener("click", () => {
    playing = !playing;
    playButton.setAttribute("aria-pressed", String(playing));
    playButton.textContent = playing ? "Pause the trace" : "Animate the trace";
    if (playing) {
      signalLoop = window.SimKit.loop(dt => {
        phase += dt * .7;
        drawSignal();
      });
    } else if (signalLoop) {
      signalLoop.stop();
      signalLoop = null;
    }
  });
  drawSignal();

  const evidenceButton = document.querySelector("#check-evidence");
  const evidenceFeedback = document.querySelector("#evidence-feedback");
  evidenceButton?.addEventListener("click", () => {
    const selected = [...document.querySelectorAll(".evidence-card input:checked")].map(input => input.value);
    const hasDirect = selected.includes("pollen") && selected.includes("snails");
    const hasWeak = selected.includes("mammoth") || selected.includes("painting");
    evidenceFeedback.className = "feedback";
    if (hasDirect && !hasWeak) {
      evidenceFeedback.classList.add("good");
      evidenceFeedback.textContent = "Strong case. The dated local pollen connects the layer to cooler conditions, and the freshwater shells independently support a wetter habitat.";
    } else if (hasDirect) {
      evidenceFeedback.classList.add("revise");
      evidenceFeedback.textContent = "Your two strongest clues work together. Remove the distant, undated tooth and the artist’s reconstruction: neither directly tests this valley, layer, and climate.";
    } else if (!selected.length) {
      evidenceFeedback.classList.add("revise");
      evidenceFeedback.textContent = "Choose at least two clues. Ask whether each is local, dated, and tied to temperature or moisture.";
    } else {
      evidenceFeedback.classList.add("revise");
      evidenceFeedback.textContent = "Keep investigating. Look for two independent clues from the dated valley layer that directly reveal plants or water conditions.";
    }
  });

  const quiz = document.querySelector("#knowledge-form");
  const quizResult = document.querySelector("#quiz-result");
  quiz?.addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(quiz);
    const answers = [form.get("q1"), form.get("q2"), form.get("q3")];
    const correct = ["b", "a", "c"];
    const score = answers.filter((answer, index) => answer === correct[index]).length;
    quizResult.className = `quiz-result ${score === 3 ? "good" : "revise"}`;
    quizResult.textContent = score === 3 ? "3/3 — Field notes verified. You connected cycles, proxies, and sea level." : `${score}/3 — Revisit ${score === 2 ? "the idea behind the missed question" : "the briefing and Beringia case"}, then try again.`;
  });
})();
