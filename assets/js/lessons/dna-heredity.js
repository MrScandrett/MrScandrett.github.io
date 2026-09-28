(function () {
      const GENETIC_ENGINE = {
        traits: {
          height: { dominant: "T", recessive: "t", domName: "Tall plant", recName: "Short plant", description: "Stem height" },
          color: { dominant: "Y", recessive: "y", domName: "Yellow seeds", recName: "Green seeds", description: "Seed color" }
        },
        calculate: function (p1, p2) {
          const alleles1 = p1.split("");
          const alleles2 = p2.split("");
          const outcomes = [];

          alleles1.forEach(function (a1) {
            alleles2.forEach(function (a2) {
              outcomes.push(orderGenotype(a1 + a2));
            });
          });
          return outcomes;
        }
      };

      const traitSelect = document.getElementById("dna-trait-select");
      const parent1Select = document.getElementById("dna-parent-1");
      const parent2Select = document.getElementById("dna-parent-2");
      const squareRoot = document.getElementById("dna-square");
      const probGrid = document.getElementById("dna-prob-grid");
      const trialResults = document.getElementById("trial-results");
      const trialNote = document.getElementById("trial-note");
      const plantSummary = document.getElementById("dna-plant-summary");
      const plantStageWrap = document.getElementById("dna-plant-stage-wrap");
      const plantRig = document.getElementById("dna-plant-rig");
      const plantPhoto = document.getElementById("dna-plant-photo");
      const plantPhotoCap = document.getElementById("dna-plant-photo-cap");
      const plantRegrowBtn = document.getElementById("dna-plant-regrow-btn");
      const selectedGenotype = document.getElementById("dna-selected-genotype");
      const selectedPhenotype = document.getElementById("dna-selected-phenotype");
      const selectedNote = document.getElementById("dna-selected-note");
      const repTemplateRow = document.getElementById("rep-template-row");
      const repSlotRow = document.getElementById("rep-slot-row");
      const repBaseBank = document.getElementById("rep-base-bank");
      const repFeedback = document.getElementById("rep-feedback");
      const repCheckBtn = document.getElementById("rep-check-btn");
      const repResetBtn = document.getElementById("rep-reset-btn");

      const PLANT_PHOTOS = {
        height: {
          dominant: {
            src: "../../assets/images/dna-heredity/mendel-pea-plants.webp",
            alt: "Illustration comparing tall and dwarf pea plants",
            caption: "Tall pea plant (TT or Tt in this model)", credit: "Comparison illustration: Daniel J. Fairbanks, CC BY 4.0, Wikimedia Commons."
          },
          recessive: {
            src: "../../assets/images/dna-heredity/mendel-pea-plants.webp",
            alt: "Illustration comparing tall and dwarf pea plants",
            caption: "Dwarf pea plant (tt in this model)", credit: "Comparison illustration: Daniel J. Fairbanks, CC BY 4.0, Wikimedia Commons."
          }
        },
        color: {
          dominant: {
            src: "../../assets/images/dna-heredity/pea-yellow-seeds.webp",
            alt: "Photograph of yellow split pea seeds",
            caption: "Yellow pea seeds (YY or Yy in this model)", credit: "Mx. Granger, CC0, Wikimedia Commons."
          },
          recessive: {
            src: "../../assets/images/dna-heredity/pea-green-seeds.webp",
            alt: "Photograph of green pea seeds inside open pods",
            caption: "Green peas in pods: color illustration, not evidence of a yy genotype. Mature seed color is the modeled trait", credit: "Bill Ebbesen, CC BY-SA 3.0, Wikimedia Commons."
          }
        }
      };

      const labState = {
        trait: "height",
        parent1: "Tt",
        parent2: "Tt",
        selectedOutcome: "Tt"
      };

      const repState = {
        template: ["A", "C", "T", "G", "G", "A", "T", "C"],
        answers: ["", "", "", "", "", "", "", ""],
        selected: 0
      };

      function orderGenotype(genotype) {
        return genotype.split("").sort(function (a, b) {
          const aUpper = a === a.toUpperCase();
          const bUpper = b === b.toUpperCase();
          if (aUpper !== bUpper) return aUpper ? -1 : 1;
          return a.localeCompare(b);
        }).join("");
      }

      function complementFor(base) {
        return { A: "T", T: "A", C: "G", G: "C" }[base];
      }

      function renderReplicationLab() {
        repTemplateRow.innerHTML = "";
        repSlotRow.innerHTML = "";
        repBaseBank.innerHTML = "";

        repState.template.forEach(function (base) {
          const tile = document.createElement("div");
          tile.className = "rep-base";
          tile.textContent = base;
          repTemplateRow.appendChild(tile);
        });

        repState.answers.forEach(function (base, index) {
          const slot = document.createElement("button");
          slot.type = "button";
          slot.className = "rep-slot" + (base ? " is-filled" : "") + (repState.selected === index ? " is-selected" : "");
          slot.textContent = base || "?";
          slot.setAttribute("aria-label", "Complementary base slot " + (index + 1) + ": " + (base || "empty"));
          slot.addEventListener("click", function () {
            repState.selected = index;
            renderReplicationLab();
            repSlotRow.children[repState.selected].focus();
            repFeedback.textContent = "Slot " + (index + 1) + " selected. Choose the base that pairs with " + repState.template[index] + ".";
          });
          repSlotRow.appendChild(slot);
        });

        ["A", "T", "C", "G"].forEach(function (base) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "base-btn";
          btn.textContent = base;
          btn.addEventListener("click", function () {
            repState.answers[repState.selected] = base;
            const nextEmpty = repState.answers.indexOf("", repState.selected + 1);
            const anyEmpty = repState.answers.indexOf("");
            repState.selected = nextEmpty !== -1 ? nextEmpty : (anyEmpty !== -1 ? anyEmpty : repState.selected);
            renderReplicationLab();
            Array.from(repBaseBank.children).find(b => b.textContent === base).focus();
            repFeedback.textContent = "Placed " + base + ". Continue until every exposed base has a partner.";
          });
          repBaseBank.appendChild(btn);
        });
      }

      function checkReplicationLab() {
        let correct = 0;
        const slots = repSlotRow.querySelectorAll(".rep-slot");
        repState.answers.forEach(function (answer, index) {
          const expected = complementFor(repState.template[index]);
          if (answer === expected) {
            correct++;
            slots[index].classList.add("is-correct");
          } else {
            slots[index].classList.add("is-wrong");
          }
        });
        if (repState.answers.some(function (answer) { return answer === ""; })) {
          repFeedback.textContent = "Some slots are still blank. Fill all 8 bases, then check again.";
          return;
        }
        repFeedback.textContent = correct + " of 8 bases follow the pairing rule. Correct strand: " + repState.template.map(complementFor).join(" ") + ".";
      }

      function resetReplicationLab() {
        repState.answers = ["", "", "", "", "", "", "", ""];
        repState.selected = 0;
        renderReplicationLab();
        repFeedback.textContent = "Select a blank slot, then choose A, T, C, or G.";
      }

      function getTraitOptions(traitKey) {
        const trait = GENETIC_ENGINE.traits[traitKey];
        return [
          trait.dominant + trait.dominant,
          trait.dominant + trait.recessive,
          trait.recessive + trait.recessive
        ];
      }

      function phenotypeFor(traitKey, genotype) {
        const trait = GENETIC_ENGINE.traits[traitKey];
        return genotype.includes(trait.dominant) ? trait.domName : trait.recName;
      }

      const STEM_OFFSET_FULL = 0;
      const STEM_OFFSET_DWARF = 58;
      const GROWTH_DURATION_MS = 1350;

      let plantGrowSeq = 0;
      let plantLastState = null;

      function growPlant(traitKey, genotype, isDominant, photo) {
        const seq = ++plantGrowSeq;

        // Reset to the ungrown state and force layout so re-selecting the
        // same phenotype still replays the full animation from a seed.
        plantStageWrap.classList.remove("is-grown");
        plantRig.classList.remove("is-growing");
        plantRig.classList.toggle("is-dwarf", traitKey === "height" && !isDominant);
        plantRig.classList.toggle("is-yellow", traitKey === "color" && isDominant);
        plantRig.classList.toggle("is-green", traitKey === "color" && !isDominant);
        plantRig.style.setProperty("--stem-off", traitKey === "height" && !isDominant ? STEM_OFFSET_DWARF : STEM_OFFSET_FULL);
        
        void plantStageWrap.offsetWidth;

        requestAnimationFrame(function () {
          if (seq !== plantGrowSeq) return;
          plantRig.classList.add("is-growing");
        });

        setTimeout(function () {
          if (seq !== plantGrowSeq) return;
          plantPhoto.src = photo.src;
          plantPhoto.alt = photo.alt;
          plantPhotoCap.textContent = photo.caption + ". " + photo.credit;
          plantStageWrap.classList.add("is-grown");
        }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : GROWTH_DURATION_MS);
      }

      function updatePlant(traitKey, genotype) {
        const isDominant = genotype.includes(GENETIC_ENGINE.traits[traitKey].dominant);
        const photo = PLANT_PHOTOS[traitKey][isDominant ? "dominant" : "recessive"];
        plantLastState = { traitKey: traitKey, genotype: genotype, isDominant: isDominant, photo: photo };

        growPlant(traitKey, genotype, isDominant, photo);

        if (traitKey === "height") {
          selectedPhenotype.textContent = isDominant ? "Tall plant" : "Short plant";
          selectedNote.textContent = isDominant
            ? "One dominant T allele is enough to build the tall-stem phenotype."
            : "In this model, tt produces the short phenotype; the recessive alleles are still genetic information.";
        } else {
          selectedPhenotype.textContent = isDominant ? "Yellow seeds" : "Green seeds";
          selectedNote.textContent = isDominant
            ? "At least one Y allele makes the seeds yellow."
            : "Only yy leaves the recessive green seed color visible.";
        }
        selectedGenotype.textContent = genotype;
        plantSummary.textContent = "Growing offspring " + genotype + " — based on the cross, it will become the " + phenotypeFor(traitKey, genotype).toLowerCase() + " phenotype.";
      }

      plantRegrowBtn.addEventListener("click", function () {
        if (!plantLastState) return;
        growPlant(plantLastState.traitKey, plantLastState.genotype, plantLastState.isDominant, plantLastState.photo);
      });

      function renderProbabilityCards(outcomes) {
        const total = outcomes.length;
        const genotypeCounts = outcomes.reduce(function (acc, genotype) {
          acc[genotype] = (acc[genotype] || 0) + 1;
          return acc;
        }, {});
        const phenotypeCounts = outcomes.reduce(function (acc, genotype) {
          const phenotype = phenotypeFor(labState.trait, genotype);
          acc[phenotype] = (acc[phenotype] || 0) + 1;
          return acc;
        }, {});

        const cards = [];
        Object.keys(genotypeCounts).sort().forEach(function (key) {
          cards.push(
            '<div class="dna-prob-card"><strong>' +
              Math.round((genotypeCounts[key] / total) * 100) +
              '%</strong><span>' +
              key +
              " genotype</span></div>"
          );
        });
        Object.keys(phenotypeCounts).forEach(function (key) {
          cards.push(
            '<div class="dna-prob-card"><strong>' +
              Math.round((phenotypeCounts[key] / total) * 100) +
              '%</strong><span>' +
              key +
              "</span></div>"
          );
        });
        probGrid.innerHTML = cards.join("");
      }

      function resetTrialResults() {
        document.getElementById('prediction-feedback').textContent = '';
        document.getElementById('dna-prediction').value = '';
        trialResults.innerHTML = '<tr><td colspan="3">Run trials to collect data.</td></tr>';
        trialNote.textContent = "Prediction comes from the square. Evidence comes from repeated trials.";
      }

      function runOffspringTrials(trialCount) {
        const outcomes = GENETIC_ENGINE.calculate(labState.parent1, labState.parent2);
        const expectedCounts = outcomes.reduce(function (acc, genotype) {
          const phenotype = phenotypeFor(labState.trait, genotype);
          acc[phenotype] = (acc[phenotype] || 0) + 1;
          return acc;
        }, {});
        const observedCounts = {};

        for (let i = 0; i < trialCount; i++) {
          const genotype = outcomes[Math.floor(Math.random() * outcomes.length)];
          const phenotype = phenotypeFor(labState.trait, genotype);
          observedCounts[phenotype] = (observedCounts[phenotype] || 0) + 1;
        }

        const predicted = document.getElementById('dna-prediction').value;
        const recessive = GENETIC_ENGINE.traits[labState.trait].recessive.repeat(2);
        const expectedRecessive = outcomes.filter(g => g === recessive).length * 25;
        document.getElementById('prediction-feedback').textContent = predicted === '' ? 'The model predicts ' + expectedRecessive + '% recessive offspring. Make a prediction before your next run.' : 'Your prediction: ' + predicted + '%. Model prediction: ' + expectedRecessive + '% recessive offspring.';
        const phenotypes = Object.keys(expectedCounts);
        trialResults.innerHTML = phenotypes.map(function (phenotype) {
          const expectedPct = Math.round((expectedCounts[phenotype] / outcomes.length) * 100);
          const observed = observedCounts[phenotype] || 0;
          const observedPct = Math.round((observed / trialCount) * 100);
          return "<tr><td>" + phenotype + "</td><td>" + expectedPct + "%</td><td>" + observed + " / " + trialCount + " (" + observedPct + "%)</td></tr>";
        }).join("");

        trialNote.textContent = trialCount < 100
          ? "This small sample can differ noticeably from the prediction. That difference is normal random variation."
          : "With more trials, the observed percentages usually move closer to the Punnett square prediction.";
      }

      function renderPunnettSquare() {
        const trait = GENETIC_ENGINE.traits[labState.trait];
        const alleles1 = labState.parent1.split("");
        const alleles2 = labState.parent2.split("");
        const outcomes = GENETIC_ENGINE.calculate(labState.parent1, labState.parent2);
        const counts = outcomes.reduce(function (acc, genotype) {
          acc[genotype] = (acc[genotype] || 0) + 1;
          return acc;
        }, {});

        if (!outcomes.includes(labState.selectedOutcome)) labState.selectedOutcome = outcomes[0];
        squareRoot.innerHTML = "";
        squareRoot.insertAdjacentHTML("beforeend", '<div class="label"></div>');
        alleles2.forEach(function (allele) {
          squareRoot.insertAdjacentHTML("beforeend", '<div class="label">' + allele + "</div>");
        });

        alleles1.forEach(function (leftAllele) {
          squareRoot.insertAdjacentHTML("beforeend", '<div class="label">' + leftAllele + "</div>");
          alleles2.forEach(function (topAllele) {
            const genotype = orderGenotype(leftAllele + topAllele);
            const phenotype = phenotypeFor(labState.trait, genotype);
            const chance = 25;
            const selectedClass = genotype === labState.selectedOutcome ? " is-selected" : "";
            squareRoot.insertAdjacentHTML(
              "beforeend",
              '<div class="dna-offspring' +
                selectedClass +
                '" role="button" tabindex="0" aria-pressed="' + (genotype === labState.selectedOutcome) + '" data-genotype="' +
                genotype +
                '">' +
                '<div class="genotype">' + genotype + "</div>" +
                '<div class="phenotype">' + phenotype + "</div>" +
                '<div class="chance">' + chance + "% chance</div>" +
              "</div>"
            );
          });
        });

        squareRoot.querySelectorAll(".dna-offspring").forEach(function (cell) {
          cell.addEventListener("click", function () {
            labState.selectedOutcome = cell.dataset.genotype;
            squareRoot.querySelectorAll('.dna-offspring').forEach(function (item) {
              const selected = item.dataset.genotype === labState.selectedOutcome;
              item.classList.toggle('is-selected', selected);
              item.setAttribute('aria-pressed', selected);
            });
            updatePlant(labState.trait, labState.selectedOutcome);
          });
          cell.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              cell.click();
            }
          });
        });

        renderProbabilityCards(outcomes);
        resetTrialResults();
        updatePlant(labState.trait, labState.selectedOutcome);
      }

      function populateParentMenus() {
        const options = getTraitOptions(labState.trait);
        [parent1Select, parent2Select].forEach(function (select, index) {
          const current = index === 0 ? labState.parent1 : labState.parent2;
          select.innerHTML = options.map(function (value) {
            return '<option value="' + value + '"' + (value === current ? " selected" : "") + ">" + value + "</option>";
          }).join("");
        });
      }

      function updateLabForTrait(traitKey) {
        const trait = GENETIC_ENGINE.traits[traitKey];
        labState.trait = traitKey;
        labState.parent1 = trait.dominant + trait.recessive;
        labState.parent2 = trait.dominant + trait.recessive;
        labState.selectedOutcome = trait.dominant + trait.recessive;
        populateParentMenus();
        renderPunnettSquare();
      }

      // ── Punnett Square Practice Quiz ─────────────
      (function () {
        const CROSSES = {
          TtTt: { p1: "Tt", p2: "Tt", dom: "T", rec: "t" },
          TTtt: { p1: "TT", p2: "tt", dom: "T", rec: "t" },
          Tttt: { p1: "Tt", p2: "tt", dom: "T", rec: "t" },
          YyYy: { p1: "Yy", p2: "Yy", dom: "Y", rec: "y" },
          YYyy: { p1: "YY", p2: "yy", dom: "Y", rec: "y" }
        };

        function orderG(a, b) {
          const aUp = a === a.toUpperCase();
          const bUp = b === b.toUpperCase();
          if (aUp !== bUp) return aUp ? a + b : b + a;
          return a + b;
        }

        function buildOptions(dom, rec) {
          const opts = new Set();
          [dom+dom, dom+rec, rec+dom, rec+rec].forEach(function(g) {
            opts.add(orderG(g[0], g[1]));
          });
          return Array.from(opts).sort();
        }

        const crossSelect = document.getElementById("ps-cross-select");
        const resetBtn = document.getElementById("ps-reset-btn");
        const checkBtn = document.getElementById("ps-check-btn");
        const quizGrid = document.getElementById("ps-quiz-grid");
        const pickerBtns = document.getElementById("ps-picker-btns");
        const pickerHint = document.getElementById("ps-picker-hint");
        const feedback = document.getElementById("ps-quiz-feedback");
        const scoreBadge = document.getElementById("ps-score-badge");

        const quizState = { cross: null, answers: ["","","",""], selected: null, locked: false };

        function getCorrects(cross) {
          const a1 = cross.p1[0], a2 = cross.p1[1];
          const b1 = cross.p2[0], b2 = cross.p2[1];
          return [
            orderG(a1, b1),
            orderG(a2, b1),
            orderG(a1, b2),
            orderG(a2, b2)
          ];
        }

        function renderQuiz() {
          const key = crossSelect.value;
          const cross = CROSSES[key];
          quizState.cross = cross;
          quizState.answers = ["","","",""];
          quizState.selected = null;
          quizState.locked = false;
          feedback.className = "ps-quiz-feedback";
          feedback.textContent = "";
          scoreBadge.className = "ps-score-badge";
          scoreBadge.textContent = "";

          const topAlleles = cross.p1.split("");
          const sideAlleles = cross.p2.split("");
          const opts = buildOptions(cross.dom, cross.rec);

          quizGrid.innerHTML = "";

          // corner
          const corner = document.createElement("div");
          corner.className = "pq-corner";
          quizGrid.appendChild(corner);

          // top headers
          topAlleles.forEach(function(a) {
            const h = document.createElement("div");
            h.className = "pq-head";
            h.textContent = a;
            quizGrid.appendChild(h);
          });

          // rows
          sideAlleles.forEach(function(sa, ri) {
            const side = document.createElement("div");
            side.className = "pq-side";
            side.textContent = sa;
            quizGrid.appendChild(side);

            topAlleles.forEach(function(ta, ci) {
              const idx = ri * 2 + ci;
              const cell = document.createElement("div");
              cell.className = "pq-cell";
              cell.dataset.idx = idx;
              cell.setAttribute("tabindex", "0");
              cell.setAttribute("role", "button");
              cell.setAttribute("aria-label", "Cell " + (idx+1) + " — click to fill");
              cell.addEventListener("click", function() {
                if (quizState.locked) return;
                quizState.selected = idx;
                renderPicker(opts);
                renderCells();
              });
              cell.addEventListener("keydown", function(e) {
                if ((e.key === "Enter" || e.key === " ") && !quizState.locked) { e.preventDefault(); cell.click(); }
              });
              quizGrid.appendChild(cell);
            });
          });

          renderCells();
          renderPicker(opts);
        }

        function renderCells() {
          quizGrid.querySelectorAll(".pq-cell").forEach(function(cell) {
            const idx = parseInt(cell.dataset.idx);
            const val = quizState.answers[idx];
            cell.textContent = val || "";
            cell.classList.toggle("pq-filled", !!val);
            cell.classList.toggle("pq-locked", quizState.locked);
            cell.style.outline = (!quizState.locked && idx === quizState.selected)
              ? "2px solid rgba(59,127,232,0.5)" : "";
          });
        }

        function renderPicker(opts) {
          pickerBtns.innerHTML = "";
          if (quizState.locked) {
            pickerHint.textContent = "Quiz locked — click \"New cross\" to try again.";
            return;
          }
          if (quizState.selected === null) {
            pickerHint.textContent = "Click a cell in the grid first.";
            return;
          }
          pickerHint.textContent = "Cell " + (quizState.selected + 1) + " selected.";
          opts.forEach(function(opt) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "ps-picker-btn" + (quizState.answers[quizState.selected] === opt ? " ps-active" : "");
            btn.textContent = opt;
            btn.addEventListener("click", function() {
              quizState.answers[quizState.selected] = opt;
              // auto-advance to next empty
              const next = quizState.answers.indexOf("", quizState.selected + 1);
              const anyEmpty = quizState.answers.indexOf("");
              quizState.selected = next !== -1 ? next : (anyEmpty !== -1 ? anyEmpty : quizState.selected);
              renderCells();
              renderPicker(opts);
              Array.from(pickerBtns.children).find(b => b.textContent === opt).focus();
            });
            pickerBtns.appendChild(btn);
          });
        }

        function checkAnswers() {
          if (quizState.answers.some(function(a){ return a === ""; })) {
            feedback.textContent = "Fill in all four cells before checking.";
            feedback.className = "ps-quiz-feedback fail show";
            return;
          }
          const corrects = getCorrects(quizState.cross);
          let score = 0;
          quizGrid.querySelectorAll(".pq-cell").forEach(function(cell) {
            const idx = parseInt(cell.dataset.idx);
            if (quizState.answers[idx] === corrects[idx]) {
              cell.classList.add("pq-correct");
              score++;
            } else {
              cell.classList.add("pq-wrong");
              cell.textContent = quizState.answers[idx] + " → " + corrects[idx];
              cell.style.fontSize = "0.75rem";
            }
          });
          quizState.locked = true;
          renderPicker([]);
          scoreBadge.textContent = score + " / 4";
          scoreBadge.className = "ps-score-badge show";
          if (score === 4) {
            feedback.textContent = "Perfect! All four cells correct. Every offspring genotype comes from pairing one allele from each parent.";
            feedback.className = "ps-quiz-feedback pass show";
          } else {
            feedback.textContent = "Not quite. The highlighted cells show your answer → the correct answer. Remember: pair the column allele with the row allele, dominant letter first.";
            feedback.className = "ps-quiz-feedback fail show";
          }
        }

        crossSelect.addEventListener("change", renderQuiz);
        resetBtn.addEventListener("click", renderQuiz);
        checkBtn.addEventListener("click", checkAnswers);

        renderQuiz();
      })();

      traitSelect.addEventListener("change", function () {
        updateLabForTrait(traitSelect.value);
      });

      parent1Select.addEventListener("change", function () {
        labState.parent1 = parent1Select.value;
        renderPunnettSquare();
      });

      parent2Select.addEventListener("change", function () {
        labState.parent2 = parent2Select.value;
        renderPunnettSquare();
      });

      document.querySelectorAll("[data-trials]").forEach(function (button) {
        button.addEventListener("click", function () {
          runOffspringTrials(parseInt(button.dataset.trials, 10));
        });
      });

      repCheckBtn.addEventListener("click", checkReplicationLab);
      repResetBtn.addEventListener("click", resetReplicationLab);

      renderReplicationLab();
      updateLabForTrait("height");
    })();
