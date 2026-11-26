(function () {
  var milestones = [
    {
      key: "water",
      short: "Wood evolves",
      tag: "~407 Mya · Early Devonian",
      era: "407",
      title: "Wood evolves — for water, not height",
      text: "The oldest confirmed woody plant, Armoricaphyton chateaupannense, has narrow woody stems but no real height advantage over its herbaceous neighbors. Scans of its tissue show its structure prioritized water conduction, likely because falling atmospheric CO2 forced plants to keep their pores open longer and lose more water."
    },
    {
      key: "trees",
      short: "First forests",
      tag: "~393–359 Mya · Middle–Late Devonian",
      era: "385",
      title: "Archaeopteris builds the first forests",
      text: "Archaeopteris, a tree-sized progymnosperm, co-opts existing woody tissue for structural support instead of just plumbing. It comes to dominate Late Devonian landscapes, forming Earth's first true forests before going extinct near the Devonian–Carboniferous boundary."
    },
    {
      key: "gap",
      short: "Coal swamps",
      tag: "~359–299 Mya · Carboniferous",
      era: "330",
      title: "Coal swamps accumulate at record scale",
      text: "Tropical swamp forests bury enormous volumes of plant debris in wet, low-oxygen sediment, which is the main reason so little of it decays. This period produces most of the coal in use today."
    },
    {
      key: "fungi",
      short: "Fungi debate",
      tag: "~290 Mya · Permian (debated)",
      era: "290",
      title: "Did fungi finally learn to eat lignin?",
      text: "A 2012 genomic study proposed that white-rot fungi evolved lignin-degrading peroxidase enzymes around this time, and linked that to the end of major coal formation. Later research (Nelsen et al., 2016) challenged the idea, arguing some fungi could likely break down lignin earlier, and that wet burial conditions and tectonics mattered more than any single fungal innovation. Scientists still debate how much either factor explains the coal record."
    },
    {
      key: "today",
      short: "Fast decay",
      tag: "Today",
      era: "0",
      title: "Decomposition, restored",
      text: "Modern wood-decay fungi (white-rot and brown-rot) recycle dead wood on a scale of years to decades, not tens of millions of years. Whatever combination of causes ended the Carboniferous coal boom, today's fast decomposition is the normal state of Earth's carbon cycle."
    }
  ];

  var track = document.getElementById("timelineTrack");
  var readout = document.getElementById("tlReadout");

  if (track && readout) {
    milestones.forEach(function (m) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tl-node";
      btn.setAttribute("role", "tab");
      btn.dataset.key = m.key;
      btn.innerHTML = '<span class="tl-dot" aria-hidden="true"></span><b>' + m.short + "</b><small>" + m.tag.split(" · ")[0] + "</small>";
      btn.addEventListener("click", function () { setMilestone(m.key); });
      track.appendChild(btn);
    });

    function setMilestone(key) {
      var m = milestones.find(function (item) { return item.key === key; });
      readout.innerHTML =
        '<span class="tl-tag">' + m.tag + '</span>' +
        "<h3>" + m.title + "</h3>" +
        "<p>" + m.text + "</p>";
      document.querySelectorAll(".tl-node").forEach(function (node) {
        node.classList.toggle("active", node.dataset.key === key);
      });
    }

    setMilestone("water");
  }

  var checkBtn = document.getElementById("checkAnswers");
  if (checkBtn) {
    checkBtn.addEventListener("click", function () {
      var score = 0;
      if (document.getElementById("wq1").value === "water") score += 1;
      if (document.getElementById("wq2").value === "debated") score += 1;
      if (document.getElementById("wq3").value === "coal") score += 1;
      var feedback = document.getElementById("quizFeedback");
      feedback.className = "feedback " + (score === 3 ? "correct" : "try");
      feedback.textContent = score === 3
        ? "Correct! Wood began as plumbing, the Carboniferous coal boom's exact cause is still debated by scientists, and coal is the fuel that formed from it."
        : score + "/3 correct. Revisit the timeline and the fossil fuel comparison, then try again.";
    });
  }
}());

(function () {
  // Simplified teaching model, not measured data: illustrates what each
  // hypothesis in the "No-Rot Gap" debate predicts for buried vs.
  // decomposed wood over deep time.
  var canvasEl = document.getElementById("carbonCanvas");
  var slider = document.getElementById("carbonSlider");
  var yearOut = document.getElementById("carbonYearOut");
  var readout = document.getElementById("labReadout");
  var playBtn = document.getElementById("labPlay");
  var hypBtns = [document.getElementById("hypNorot"), document.getElementById("hypNelsen")];
  if (!canvasEl || !window.SimKit) return;

  var rootStyle = getComputedStyle(document.documentElement);
  function cssVar(name, fallback) {
    var v = rootStyle.getPropertyValue(name).trim();
    return v || fallback;
  }
  var colors = {
    wood: cssVar("--wood", "#d69e4f"),
    moss: cssVar("--moss", "#7cae51"),
    text: cssVar("--text", "#f8f0e3")
  };
  var NELSEN_COLOR = "#38bdf8";

  function lerpRange(m, mHigh, mLow, vHigh, vLow) {
    var frac = (mHigh - m) / (mHigh - mLow);
    return vHigh + (vLow - vHigh) * frac;
  }

  // Wood production/burial rate, in arbitrary model units, at a given "mya" (millions of years ago).
  function productionRate(m) {
    if (m > 407) return 0;
    if (m >= 393) return lerpRange(m, 407, 393, 0.10, 0.35);
    if (m >= 359) return lerpRange(m, 393, 359, 0.35, 0.65);
    if (m >= 299) return lerpRange(m, 359, 299, 0.65, 1.0);
    if (m >= 252) return lerpRange(m, 299, 252, 1.0, 0.45);
    return 0.3;
  }

  // Fraction of produced wood that decomposes rather than being buried undecayed.
  function decayFraction(m, hyp) {
    if (hyp === "norot") return m >= 290 ? 0.05 : 0.85;
    var frac = (407 - m) / 407;
    return 0.2 + frac * 0.65;
  }

  function eraName(m) {
    if (m > 359) return "Devonian";
    if (m > 299) return "Carboniferous";
    if (m > 252) return "Permian";
    if (m > 66) return "Mesozoic";
    return "Cenozoic";
  }

  var CUM = { norot: [], nelsen: [] };
  ["norot", "nelsen"].forEach(function (hyp) {
    var buried = 0;
    for (var t = 0; t <= 407; t++) {
      var m = 407 - t;
      buried += productionRate(m) * (1 - decayFraction(m, hyp));
      CUM[hyp].push(buried);
    }
  });
  var maxCum = Math.max(CUM.norot[407], CUM.nelsen[407]) || 1;

  var activeHyp = "norot";
  var isPlaying = false;
  var targetPileFrac = 0;
  var pileFrac = 0;
  var spawnTimer = 0;
  var particles = [];

  var stage = SimKit.canvas2d(canvasEl, { height: 260 });

  function currentT() { return Number(slider.value); }

  function updateReadout() {
    var t = currentT();
    var m = 407 - t;
    var d = decayFraction(m, activeHyp);
    var pct = Math.round(d * 100);
    var hypLabel = activeHyp === "norot" ? "No-Rot hypothesis" : "Nelsen et al.’s gradual model";
    var label = m <= 0 ? "Today" : ("~" + Math.round(m) + " Mya · " + eraName(m));
    var note;
    if (activeHyp === "norot") {
      note = m >= 290
        ? "This falls inside the proposed 100-million-year gap, before lignin-degrading fungi evolve — almost nothing decomposes."
        : "Lignin-degrading fungi have now evolved in this model, so decomposition catches up quickly.";
    } else {
      note = "This model assumes some decomposition capability exists throughout, rising gradually rather than switching on suddenly.";
    }
    readout.innerHTML = "<strong>" + label + "</strong> — under the " + hypLabel + ", roughly " + pct + "% of buried wood decomposes here; the rest piles up as coal precursor. " + note;
    yearOut.textContent = m <= 0 ? "Today" : ("~" + Math.round(m) + " Mya");
  }

  function setHyp(hyp) {
    activeHyp = hyp;
    hypBtns.forEach(function (btn) { btn.classList.toggle("active", btn.dataset.hyp === hyp); });
    updateReadout();
  }

  hypBtns.forEach(function (btn) {
    btn.addEventListener("click", function () { setHyp(btn.dataset.hyp); });
  });

  slider.addEventListener("input", function () {
    isPlaying = false;
    playBtn.classList.remove("playing");
    playBtn.textContent = "▶ Play through time";
    updateReadout();
  });

  playBtn.addEventListener("click", function () {
    isPlaying = !isPlaying;
    playBtn.classList.toggle("playing", isPlaying);
    playBtn.textContent = isPlaying ? "❚❚ Pause" : "▶ Play through time";
    if (isPlaying && currentT() >= 407) slider.value = 0;
  });

  function drawChart(ctx, w, chartH) {
    var padL = 34, padR = 10, padT = 14, padB = 16;
    var plotW = w - padL - padR, plotH = chartH - padT - padB;
    ctx.strokeStyle = "rgba(248,240,227,.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    function plot(hyp, color, active) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = active ? 1 : 0.32;
      ctx.lineWidth = active ? 2.2 : 1.4;
      ctx.beginPath();
      for (var i = 0; i <= 407; i += 2) {
        var x = padL + (i / 407) * plotW;
        var y = padT + plotH - (CUM[hyp][i] / maxCum) * plotH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    plot("nelsen", NELSEN_COLOR, activeHyp === "nelsen");
    plot("norot", colors.wood, activeHyp === "norot");

    var t = currentT();
    var mx = padL + (t / 407) * plotW;
    ctx.strokeStyle = "rgba(248,240,227,.4)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(mx, padT); ctx.lineTo(mx, padT + plotH); ctx.stroke();
    ctx.setLineDash([]);
    var activeY = padT + plotH - (CUM[activeHyp][Math.round(t)] / maxCum) * plotH;
    ctx.fillStyle = activeHyp === "norot" ? colors.wood : NELSEN_COLOR;
    ctx.beginPath(); ctx.arc(mx, activeY, 4, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "rgba(248,240,227,.55)";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText("cumulative buried, undecayed carbon (model units)", padL, padT - 3);
  }

  function drawPile(ctx, w, top, h) {
    var groundY = top + h - 10;
    var maxBarH = h - 26;
    var barW = Math.min(120, w * 0.22);
    var barX = w - barW - 24;

    ctx.strokeStyle = "rgba(248,240,227,.2)";
    ctx.beginPath(); ctx.moveTo(24, groundY); ctx.lineTo(w - 24, groundY); ctx.stroke();

    var barH = pileFrac * maxBarH;
    ctx.fillStyle = colors.wood;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(barX, groundY - barH, barW, barH);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.strokeRect(barX, groundY - barH, barW, barH);
    ctx.fillStyle = "rgba(248,240,227,.55)";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText("buried pile", barX, groundY + 20);

    particles.forEach(function (p) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.decayed ? colors.moss : colors.wood;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 3, p.size, p.size * 0.6);
      ctx.globalAlpha = 1;
    });
  }

  SimKit.loop(function (dt) {
    if (dt > 0.25) dt = 0.25;
    var t = currentT();
    if (isPlaying) {
      t = Math.min(407, t + dt * 34);
      slider.value = t;
      if (t >= 407) {
        isPlaying = false;
        playBtn.classList.remove("playing");
        playBtn.textContent = "▶ Play through time";
      }
      updateReadout();
    }
    var m = 407 - t;
    var rate = productionRate(m);
    targetPileFrac = CUM[activeHyp][Math.round(t)] / maxCum;
    pileFrac += (targetPileFrac - pileFrac) * Math.min(1, dt * 3);

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = 0.9 - rate * 0.55;
      var groundY = stage.height - 10;
      var barTopY = groundY - pileFrac * (stage.height * 0.5 - 26);
      particles.push({
        x: stage.width - Math.min(120, stage.width * 0.22) - 24 + Math.random() * Math.min(120, stage.width * 0.22),
        y: stage.height * 0.5 + 4,
        targetY: barTopY,
        size: 6 + Math.random() * 4,
        decayed: Math.random() < decayFraction(m, activeHyp),
        alpha: 1,
        landed: false
      });
    }
    particles.forEach(function (p) {
      if (!p.landed) {
        p.y += dt * 90;
        if (p.y >= p.targetY) { p.y = p.targetY; p.landed = true; }
      } else if (p.decayed) {
        p.alpha -= dt * 0.7;
      }
    });
    particles = particles.filter(function (p) { return p.alpha > 0; });

    var ctx = stage.ctx, w = stage.width, h = stage.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0e0904";
    ctx.fillRect(0, 0, w, h);
    var chartH = h * 0.5;
    drawChart(ctx, w, chartH);
    drawPile(ctx, w, chartH, h - chartH);
  }, { el: SimKit.stage(canvasEl) });

  setHyp("norot");
  updateReadout();
}());
