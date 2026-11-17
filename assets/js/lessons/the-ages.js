(function () {
  // The lesson's data comes from data/ages-lesson.json through the generated #ages-data block
  // (scripts/build-ages-timeline.mjs). Edit the data file, not this script.
  var data = JSON.parse(document.getElementById("ages-data").textContent);
  var ages = data.ages;
  var eras = ages.filter(function (a) { return !a.bridge; });
  var lenses = data.lenses;
  var allArtifacts = data.artifacts;
  function ageByKey(key) { return ages.find(function (a) { return a.key === key; }); }

  var active = eras[0].key;
  var readout = document.getElementById("ages-readout");
  var panelButtons = document.getElementById("ages-panel-buttons");
  var tooltip = document.getElementById("ages-artifact-tooltip");
  var attFrame = document.getElementById("att-frame");
  var openNode = null;
  var artifactTrigger = null;
  var loadedArtifacts = {};
  var panel = document.getElementById("ages-panel");
  var panelOpenBtn = document.querySelector(".ll-open-btn");
  var panelCloseBtn = document.querySelector(".ll-panel-close");

  // The Grand Timeline (timeline.js) is the lesson's timeline; this script adds the era
  // chapters, the 3D artifact viewer and the Era Atlas sync around it.
  var gtList = document.querySelector(".ages-gt-list");
  var gt = null;
  if (window.ClassroomOSTimeline && gtList) {
    ClassroomOSTimeline.scan(gtList.parentNode);
    gt = ClassroomOSTimeline.get(gtList);
  }

  function makeButton(era, className, index) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.dataset.age = era.key;
    btn.dataset.step = String(index + 1).padStart(2, "0");
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = era.name;
    btn.addEventListener("click", function () { setEra(era.key, { zoom: true }); });
    return btn;
  }

  eras.forEach(function (era, index) {
    panelButtons.appendChild(makeButton(era, "ages-panel-button", index));
  });

  function positionTooltip(node) {
    var rect = node.getBoundingClientRect();
    var tw = Math.min(360, window.innerWidth - 20);
    var margin = 10;
    var left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));
    var top = rect.top - 8;
    tooltip.style.left = left + "px";
    if (top - tooltip.offsetHeight - 12 < margin) {
      tooltip.style.top = (rect.bottom + 10) + "px";
      tooltip.style.bottom = "auto";
    } else {
      tooltip.style.top = "auto";
      tooltip.style.bottom = (window.innerHeight - rect.top + 10) + "px";
    }
  }

  function openArtifact(artifact, node) {
    if (openNode && openNode !== node) openNode.classList.remove("is-open");
    openNode = node;
    artifactTrigger = node;
    node.classList.add("is-open");
    document.getElementById("att-title").textContent = artifact.label;
    document.getElementById("att-date").textContent = artifact.date;
    document.getElementById("att-note").textContent = artifact.note;
    document.getElementById("att-credit").innerHTML = artifact.credit;
    if (!loadedArtifacts[artifact.key] || attFrame.dataset.loaded !== artifact.key) {
      attFrame.src = "https://sketchfab.com/models/" + artifact.sketchfabId + "/embed?autospin=0.3&autostart=1&ui_theme=dark&ui_infos=0&ui_watermark=0";
      loadedArtifacts[artifact.key] = true;
    }
    attFrame.dataset.loaded = artifact.key;
    tooltip.setAttribute("aria-hidden", "false");
    tooltip.classList.add("is-visible");
    positionTooltip(node);
    document.getElementById("att-close").focus();
  }

  function closeTooltip() {
    tooltip.classList.remove("is-visible");
    tooltip.setAttribute("aria-hidden", "true");
    attFrame.src = "about:blank";
    delete attFrame.dataset.loaded;
    if (openNode) { openNode.classList.remove("is-open"); openNode = null; }
    if (artifactTrigger && artifactTrigger.focus) artifactTrigger.focus({ preventScroll: true });
    artifactTrigger = null;
  }

  function artifactByKey(key) {
    return allArtifacts.find(function (a) { return a.key === key; });
  }

  // "View the 3D model" buttons live in the timeline's list and its detail card.
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-ages-artifact]");
    if (btn) {
      var artifact = artifactByKey(btn.dataset.agesArtifact);
      if (artifact) openArtifact(artifact, btn);
      return;
    }
    if (tooltip.classList.contains("is-visible") && !tooltip.contains(e.target) &&
        !(e.target.closest && e.target.closest(".ages-evidence-chip"))) {
      closeTooltip();
    }
  });
  document.getElementById("att-close").addEventListener("click", closeTooltip);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeTooltip();
  });
  window.addEventListener("resize", function () {
    if (openNode && tooltip.classList.contains("is-visible")) positionTooltip(openNode);
  });

  function eraItem(key) {
    return gt ? gt.items.find(function (it) { return it.era && it.li.dataset.key === key; }) : null;
  }

  // Artifacts dated inside the era's band on the timeline.
  function evidenceFor(key) {
    var era = eraItem(key);
    if (!era || !era.parsed) return [];
    return gt.events.filter(function (it) {
      return it.li.dataset.artifact && it.parsed && it.parsed.start >= era.parsed.start && it.parsed.start <= era.parsed.end;
    });
  }

  function buildEvidenceList(key) {
    var related = evidenceFor(key);
    var list = document.createElement("div");
    list.className = "ages-evidence-list";
    var label = document.createElement("strong");
    label.textContent = related.length ? "Evidence to inspect" : "Evidence note";
    list.appendChild(label);
    if (!related.length) {
      var empty = document.createElement("span");
      empty.textContent = "No 3D artifact is dated to this chapter yet; use the Era Atlas below.";
      empty.style.fontSize = "0.7rem";
      list.appendChild(empty);
      return list;
    }
    related.forEach(function (it) {
      var artifact = artifactByKey(it.li.dataset.artifact);
      if (!artifact) return;
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ages-evidence-chip";
      chip.textContent = artifact.label + " · " + artifact.date;
      chip.addEventListener("click", function () {
        gt.selectIndex(gt.events.indexOf(it));
        openArtifact(artifact, chip);
      });
      list.appendChild(chip);
    });
    return list;
  }

  function setEra(key, opts) {
    var age = ageByKey(key);
    if (!age) return;
    var chapter = ageByKey(age.chapter);
    active = key;
    var eraIndex = eras.indexOf(chapter);
    var cells = age.bridge
      ? "<div class=\"ages-readout-cell\"><strong>What changed</strong><span>" + age.text + "</span></div>"
      : "<div class=\"ages-readout-cell\"><strong>System engine</strong><span>" + age.system + "</span></div>" +
        "<div class=\"ages-readout-cell\"><strong>What changed</strong><span>" + age.shift + "</span></div>" +
        "<div class=\"ages-readout-cell\"><strong>Christian history lens</strong><span>" + age.christian + "</span></div>";
    var profile = age.profile ? "<div class=\"ages-readout-systems\" aria-label=\"Four systems in this age\">" + lenses.map(function (l) {
      return "<button type=\"button\" class=\"ages-readout-system\" data-ages-lens=\"" + l.key + "\"><strong>" + l.icon + " " + l.name + "</strong><span>" + age.profile[l.key] + "</span></button>";
    }).join("") + "</div>" : "";
    readout.innerHTML = "<div class=\"ages-readout-head\"><div><span class=\"ages-readout-kicker\">" +
      (age.bridge ? "Bridge age · told inside " + chapter.name : "Chapter " + String(eraIndex + 1).padStart(2, "0") + " of " + eras.length) + "</span>" +
      "<h2>" + age.name + "</h2></div><span class=\"ages-readout-kicker\">" + age.when + "</span></div>" +
      "<div class=\"ages-readout-grid\">" + cells + "</div>" + profile +
      "<div class=\"ages-inquiry\"><strong>Ask of this era</strong><span>" + age.question + "</span></div>";
    readout.appendChild(buildEvidenceList(key));

    var jumpBtn = document.getElementById("ages-jump-atlas-btn");
    if (jumpBtn) {
      jumpBtn.textContent = (age.bridge ? "Read the " + age.name + " in the Era Atlas" : "Explore " + age.name + " in the Era Atlas") + " ↓";
      jumpBtn.setAttribute("href", "#" + age.card);
    }

    document.querySelectorAll(".ages-era-chapter").forEach(function (ch) {
      ch.classList.toggle("is-active", ch.dataset.eraChapter === chapter.key);
    });
    document.querySelectorAll(".ages-atlas-tab").forEach(function (tab) {
      var isTabActive = tab.dataset.eraTab === chapter.key;
      tab.classList.toggle("is-active", isTabActive);
      tab.setAttribute("aria-selected", isTabActive ? "true" : "false");
    });
    var indicator = document.getElementById("ages-chapter-indicator");
    if (indicator) {
      indicator.textContent = "Chapter " + String(eraIndex + 1).padStart(2, "0") + " of " + String(eras.length).padStart(2, "0") + " · " + chapter.name;
    }
    document.querySelectorAll(".systems-lens-cell").forEach(function (cell) {
      cell.classList.toggle("is-current", cell.dataset.agesZoom === chapter.key);
    });

    document.querySelector(".ages-page").dataset.activeEra = key;
    var sel = document.getElementById("ages-selected");
    if (sel) sel.textContent = age.name.split(" ")[0];
    document.querySelectorAll("[data-age]").forEach(function (btn) {
      var isActive = btn.dataset.age === key;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    if (opts && opts.zoom && gt && eraItem(key)) gt.zoomToEra(eraItem(key));
  }

  // Zooming the timeline to an Age opens that chapter here and in the Era Atlas.
  if (gt) {
    gt.root.addEventListener("timeline:era", function (e) {
      var key = e.detail.li.dataset.key;
      if (key && key !== active) setEra(key);
    });
    // Selecting anything opens its age, unless it already sits inside the one that's open.
    gt.root.addEventListener("timeline:select", function (e) {
      var keys = (e.detail.li.dataset.agesEras || "").split(" ").filter(Boolean);
      if (keys.length && keys.indexOf(active) === -1) setEra(keys[0]);
    });
  }

  var prevEraBtn = document.getElementById("ages-prev-era");
  var nextEraBtn = document.getElementById("ages-next-era");
  if (prevEraBtn) {
    prevEraBtn.addEventListener("click", function () {
      var currIdx = eras.indexOf(ageByKey(ageByKey(active).chapter));
      setEra(eras[(currIdx - 1 + eras.length) % eras.length].key);
    });
  }
  if (nextEraBtn) {
    nextEraBtn.addEventListener("click", function () {
      var currIdx = eras.indexOf(ageByKey(ageByKey(active).chapter));
      setEra(eras[(currIdx + 1) % eras.length].key);
    });
  }
  document.querySelectorAll(".ages-atlas-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      setEra(tab.dataset.eraTab);
    });
  });

  document.querySelectorAll(".ll-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var panel = tab.closest(".ll-panel");
      panel.querySelectorAll(".ll-tab").forEach(function (other) {
        other.setAttribute("aria-selected", other === tab ? "true" : "false");
      });
      panel.querySelectorAll(".ll-pane").forEach(function (pane) {
        pane.classList.toggle("ll-active", pane.id === tab.dataset.pane);
      });
    });
  });

  // On phones (<= 680px, lesson-layout.css) the panel is a bottom drawer: collapsed it's just
  // its handle (data-ll-collapsed), so it starts that way and the ✕ / handle toggle it.
  // Wider screens slide it in and out with aria-hidden.
  function isPhoneLayout() { return window.innerWidth <= 680; }
  function setPanel(open) {
    var phone = isPhoneLayout();
    panel.dataset.llCollapsed = open ? "false" : "true";
    panel.setAttribute("aria-hidden", phone ? "false" : String(!open));
    panelOpenBtn.setAttribute("aria-expanded", String(open));
    panelCloseBtn.setAttribute("aria-expanded", String(open));
    panelCloseBtn.setAttribute("aria-label", phone ? (open ? "Collapse panel" : "Open panel") : "Close panel");
  }
  setPanel(false);
  var panelWasPhone = isPhoneLayout();
  window.addEventListener("resize", function () {
    if (isPhoneLayout() === panelWasPhone) return;
    panelWasPhone = isPhoneLayout();
    setPanel(panel.dataset.llCollapsed === "false");
  });

  panelCloseBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    var opening = isPhoneLayout() && panel.dataset.llCollapsed === "true";
    setPanel(opening);
    if (!opening && !isPhoneLayout()) panelOpenBtn.focus({ preventScroll: true });
  });

  panelOpenBtn.addEventListener("click", function () {
    setPanel(true);
    panel.querySelector(".ll-tab").focus();
  });

  // Phone drawer: tapping the handle or a tab opens it; choosing an age folds it away again.
  panel.querySelector(".ll-panel-head").addEventListener("click", function (e) {
    if (!isPhoneLayout() || e.target.closest(".ll-panel-close")) return;
    if (e.target.closest(".ll-tab")) { setPanel(true); return; }
    setPanel(panel.dataset.llCollapsed === "true");
  });
  panelButtons.addEventListener("click", function (e) {
    if (isPhoneLayout() && e.target.closest("button")) setPanel(false);
  });

  // The lens grid is pre-rendered for the first lens; switching lenses re-renders it from data.
  function setSystemsLens(lensKey) {
    var lens = lenses.find(function (l) { return l.key === lensKey; });
    if (!lens) return;
    document.querySelectorAll(".systems-lens-btn").forEach(function (btn) {
      var isCurrent = btn.dataset.lens === lensKey;
      btn.classList.toggle("is-active", isCurrent);
      btn.setAttribute("aria-selected", isCurrent ? "true" : "false");
    });
    document.getElementById("systems-lens-banner").textContent = lens.banner;
    document.getElementById("systems-insight-box").textContent = lens.insight;
    var current = ageByKey(ageByKey(active).chapter).key;
    document.getElementById("systems-lens-grid").innerHTML = eras.map(function (age, idx) {
      return "<button type=\"button\" class=\"systems-lens-cell" + (age.key === current ? " is-current" : "") + "\" data-ages-zoom=\"" + age.key + "\">" +
        "<span class=\"systems-lens-cell-head\"><span class=\"systems-lens-cell-step\">Step " + String(idx + 1).padStart(2, "0") + " · " + age.name + "</span></span>" +
        "<span class=\"systems-lens-cell-name\">" + age.lens[lensKey].tech + "</span>" +
        "<span class=\"systems-lens-cell-content\">" + age.lens[lensKey].text + "</span></button>";
    }).join("");
  }

  document.querySelectorAll(".systems-lens-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setSystemsLens(btn.dataset.lens);
    });
  });

  document.querySelectorAll(".info-filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".info-filter-btn").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var filter = btn.dataset.filter;
      document.querySelectorAll(".info-rev-card").forEach(function (card) {
        var cat = card.dataset.category || "";
        if (filter === "all" || cat.split(" ").includes(filter)) {
          card.style.display = "";
        } else {
          card.style.display = "none";
        }
      });
    });
  });

  document.querySelectorAll(".info-rev-jump").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var targetEra = btn.dataset.jumpEra;
      if (targetEra) {
        setEra(targetEra);
        scrollToLessonSection("#era-atlas", true);
      }
    });
  });

  var quizQuestions = [
    {
      q: "Why do historians consider the transition to the Agricultural Age a 'systems change' rather than merely a new tool?",
      options: [
        "It replaced stone tools with iron swords overnight.",
        "It reorganized food surplus, population density, property rights, and social hierarchy into settled communities.",
        "It completely eliminated all forms of foraging and hunting worldwide immediately.",
        "It was the first time humans ever discovered fire or warmth."
      ],
      correct: 1,
      explain: "Agriculture was far more than planting seeds—it altered the entire social stack: food storage generated surplus, surplus enabled specialized labor, sedentary life established borders and property, and social hierarchies emerged to coordinate and defend surpluses."
    },
    {
      q: "Why did the Industrial Revolution require a shift in the Energy Engine from wood and muscle to coal and steam?",
      options: [
        "Wood was legally banned across Europe in the early 1700s.",
        "Human muscle power became physically weaker due to urbanization.",
        "Deforestation limited timber, while coal provided concentrated, ancient solar energy capable of powering continuous mechanical work.",
        "Steam engines could only operate underwater in maritime ports."
      ],
      correct: 2,
      explain: "Britain faced acute timber shortages for smelting and heating. Coal represented millions of years of stored ancient solar energy in a dense format that, when coupled to Watt's steam engine, removed the biological energy ceiling on human production."
    },
    {
      q: "What structural limitation of human communication was first solved by Neolithic clay tokens and Sumerian cuneiform?",
      options: [
        "Transmission of thoughts across cosmic radio distances.",
        "Externalizing memory outside the human brain so transactions and debts could be audited without trusting fallible recollection.",
        "The ability to speak to another person in the same room.",
        "Instantaneous global broadcasting of spoken speech."
      ],
      correct: 1,
      explain: "Biological memory forgets, dies, and can dispute agreements. Physical tokens and inscribed cuneiform allowed cities to record grain debts, land boundaries, and contracts as permanent, external, verifiable data."
    },
    {
      q: "According to the lesson's core principle, why is it inaccurate to imagine historical 'Ages' as neat worldwide switches?",
      options: [
        "Because technologies spread unevenly; communities across different continents often lived with different systems simultaneously.",
        "Because stone tools have never been found outside of Western Europe.",
        "Because all ancient records were deliberately destroyed in the 16th century.",
        "Because history does not actually involve any changes in energy or materials."
      ],
      correct: 0,
      explain: "Technological systems diffuse unevenly along trade routes and geography. For example, while 19th-century Britain was building steam railroads, pastoralists in Central Asia and hunter-gatherers in Australia were living successfully with traditional ecological systems."
    }
  ];

  function initQuizV2() {
    var container = document.getElementById("ages-quiz-v2");
    var scoreBanner = document.getElementById("ages-score-banner");
    var scoreText = document.getElementById("ages-score-text");
    var resetBtn = document.getElementById("ages-quiz-reset");
    if (!container) return;

    var userAnswers = {};

    function renderQuiz() {
      container.innerHTML = "";
      userAnswers = {};
      if (scoreBanner) scoreBanner.classList.remove("is-visible");

      quizQuestions.forEach(function (item, qIdx) {
        var card = document.createElement("div");
        card.className = "ages-q-card";
        card.id = "quiz-q-" + qIdx;

        var title = document.createElement("h4");
        title.textContent = "Question " + (qIdx + 1) + ": " + item.q;
        card.appendChild(title);

        var optsList = document.createElement("div");
        optsList.className = "ages-opt-list";

        item.options.forEach(function (optText, oIdx) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "ages-opt-btn";
          btn.textContent = optText;
          btn.addEventListener("click", function () {
            handleOptionClick(qIdx, oIdx, card, item);
          });
          optsList.appendChild(btn);
        });
        card.appendChild(optsList);

        var explain = document.createElement("div");
        explain.className = "ages-q-explain";
        explain.id = "quiz-explain-" + qIdx;
        explain.setAttribute("role", "status");
        explain.setAttribute("aria-live", "polite");
        card.appendChild(explain);

        container.appendChild(card);
      });
    }

    function handleOptionClick(qIdx, selectedIdx, card, item) {
      if (userAnswers[qIdx] !== undefined) return;
      userAnswers[qIdx] = selectedIdx;

      var buttons = card.querySelectorAll(".ages-opt-btn");
      buttons.forEach(function (btn, idx) {
        btn.disabled = true;
        if (idx === item.correct) {
          btn.classList.add("is-correct");
        } else if (idx === selectedIdx) {
          btn.classList.add("is-incorrect");
        }
      });

      var explainEl = card.querySelector(".ages-q-explain");
      if (explainEl) {
        var isRight = selectedIdx === item.correct;
        explainEl.className = "ages-q-explain is-visible " + (isRight ? "is-correct" : "is-incorrect");
        explainEl.innerHTML = (isRight ? "<strong>✓ Correct!</strong> " : "<strong>✕ Not quite.</strong> ") + item.explain;
      }

      checkQuizCompletion();
    }

    function checkQuizCompletion() {
      var answeredCount = Object.keys(userAnswers).length;
      if (answeredCount === quizQuestions.length) {
        var correctCount = 0;
        quizQuestions.forEach(function (item, idx) {
          if (userAnswers[idx] === item.correct) correctCount += 1;
        });
        if (scoreBanner && scoreText) {
          scoreBanner.classList.add("is-visible");
          scoreText.textContent = "Your Score: " + correctCount + " / " + quizQuestions.length + " (" + Math.round((correctCount / quizQuestions.length) * 100) + "%) — " +
            (correctCount === quizQuestions.length ? "Mastery achieved! You read history as evolving systems." : "Good effort! Review the explanations above to deepen your systems insights.");
        }
      }
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", renderQuiz);
    }

    renderQuiz();
  }
  initQuizV2();

  function scrollToLessonSection(hash, updateHistory) {
    var target = hash && document.querySelector(hash);
    if (!target) return;
    var details = target.closest("details");
    while (details) {
      details.open = true;
      details = details.parentElement && details.parentElement.closest("details");
    }
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    if (updateHistory) history.pushState(null, "", hash);
  }

  document.querySelectorAll(".ll-lesson-steps a").forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (link.pathname !== window.location.pathname) return;
      event.preventDefault();
      scrollToLessonSection(link.hash, true);
    });
  });

  // Timeline -> lesson: "In this lesson" links open the card's chapter and fold, then flash it.
  function openInLesson(id, updateHistory) {
    var target = document.getElementById(id);
    if (!target) return false;
    var chapterEl = target.closest(".ages-era-chapter");
    if (chapterEl && ageByKey(active).chapter !== chapterEl.dataset.eraChapter) setEra(chapterEl.dataset.eraChapter);
    scrollToLessonSection("#" + id, updateHistory);
    target.classList.remove("ages-flash");
    void target.offsetWidth;
    target.classList.add("ages-flash");
    return true;
  }

  // Lesson -> timeline: select the card's item (or zoom to an age) and bring the timeline into view.
  function showOnTimeline(id) {
    if (!gt) return;
    var i = gt.events.findIndex(function (it) { return it.li.dataset.id === id; });
    if (i === -1) return;
    if (!gt.visible(gt.events[i])) setLayer("all");
    scrollToLessonSection("#grand-timeline", false);
    gt.selectIndex(i);
  }

  var layerButtons = document.querySelectorAll("[data-ages-layer]");
  function setLayer(layer) {
    layerButtons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.agesLayer === layer)); });
    if (gt && layer === "bible") gt.showAllGroups();
    if (gt) gt.setMatch(layer === "lesson" ? function (it) { return it.li.hasAttribute("data-ages-lesson"); }
      : layer === "bible" ? function (it) { return it.group === "Faith & Bible"; } : null);
  }
  layerButtons.forEach(function (b) {
    b.addEventListener("click", function () { setLayer(b.dataset.agesLayer); });
  });

  // First, feel the scale: each bar is the glowing sliver of the bar above. The selected event
  // is pinned on every bar long enough to hold it; pressing a bar flies the timeline there.
  var powers = document.getElementById("ages-powers");
  if (powers && gt) {
    var NOW = ClassroomOSTimeline.NOW;
    var powerRows = Array.prototype.slice.call(powers.querySelectorAll(".ages-powers-row"));
    var powerStatus = powers.querySelector(".ages-powers-status");

    var pinEvent = function (li) {
      var it = gt.events.find(function (ev) { return ev.li === li; });
      if (!it || !it.parsed) return;
      var ago = Math.max(NOW - it.parsed.start, 0);
      var deepest = null;
      powerRows.forEach(function (row) {
        var span = Number(row.dataset.span);
        var pin = row.querySelector(".ages-powers-pin");
        pin.querySelector(".ages-powers-pin-label").textContent = "";
        pin.hidden = ago > span * 1.0001;
        if (pin.hidden) return;
        var at = 100 * (1 - ago / span);
        pin.style.left = at.toFixed(3) + "%";
        pin.classList.toggle("is-flip", at > 62);
        deepest = pin;
      });
      // Name it on the most zoomed-in bar, where it's easiest to see.
      if (deepest) deepest.querySelector(".ages-powers-pin-label").textContent = it.label;
    };

    var distance = function (px) {
      var m = px * 0.0254 / 96;
      if (m < 1000) return Math.round(m).toLocaleString("en-US") + " m";
      return (m < 10000 ? (m / 1000).toFixed(1) : Math.round(m / 1000).toLocaleString("en-US")) + " km";
    };
    var feel = function (px) {
      var km = px * 0.0254 / 96 / 1000;
      if (km < 0.05) return "";
      if (km < 4) return " (about a " + Math.max(1, Math.round(km / 5 * 60)) + "-minute walk)";
      var hours = km / 100;
      return hours < 30 ? " (about " + (hours < 1.5 ? "an hour" : Math.round(hours) + " hours") + " on a highway)" : " (more than " + Math.round(hours / 24) + " days of nonstop highway driving)";
    };

    powerRows.forEach(function (row) {
      row.addEventListener("click", function () {
        var span = Number(row.dataset.span);
        var name = row.dataset.phrase;
        powerRows.forEach(function (r) { r.classList.toggle("is-active", r === row); });
        gt.stopTour();
        gt.setScale("time");
        var shot = gt.zoomToRange(NOW - span, NOW);
        var wide = gt.widthAt(shot.zoom);
        if (shot.zoom <= 1.01) {
          powerStatus.innerHTML = "<strong>True scale, the whole story:</strong> every year gets the same width. All of recorded history is crammed into the last sliver of a pixel at the right-hand end.";
        } else if (shot.fits) {
          powerStatus.innerHTML = "<strong>True scale:</strong> to spread " + name + " across this screen, the whole timeline is now " + distance(wide) + " wide" + feel(wide) + ". Drag back toward the Big Bang and see how far it goes.";
        } else {
          gt.setScale("log");
          gt.zoomToRange(NOW - span, NOW);
          powerStatus.innerHTML = "<strong>True scale can&rsquo;t show this.</strong> To spread " + name + " across this screen, the timeline would have to be " + distance(wide) + " wide" + feel(wide) + ". Switched to Deep time, where each step left is 10&times; further back.";
        }
        var view = gt.root.querySelector(".tl-viewport");
        if (view && view.getBoundingClientRect().bottom > window.innerHeight) view.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    });

    gt.root.addEventListener("timeline:select", function (e) { pinEvent(e.detail.li); });
    if (gt.sel !== -1) pinEvent(gt.events[gt.sel].li);
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("a[data-ages-open], [data-ages-show], [data-ages-zoom], [data-ages-lens]");
    if (!t) return;
    if (t.hasAttribute("data-ages-open")) {
      if (openInLesson(t.getAttribute("href").slice(1), true)) e.preventDefault();
    } else if (t.dataset.agesShow) {
      showOnTimeline(t.dataset.agesShow);
    } else if (t.dataset.agesZoom) {
      scrollToLessonSection("#grand-timeline", false);
      setEra(t.dataset.agesZoom, { zoom: true });
    } else if (t.dataset.agesLens) {
      setSystemsLens(t.dataset.agesLens);
      scrollToLessonSection("#systems-matrix", false);
    }
  });

  if (window.location.hash) {
    requestAnimationFrame(function () {
      if (!openInLesson(window.location.hash.slice(1), false)) scrollToLessonSection(window.location.hash, false);
    });
  }

  setEra(active);

  document.querySelectorAll(".ages-page [data-zoomable] img").forEach(function (image) {
    if (!image.hasAttribute("aria-label")) {
      image.setAttribute("aria-label", "Open enlarged photo: " + (image.alt || "lesson image"));
    }
  });
}());
