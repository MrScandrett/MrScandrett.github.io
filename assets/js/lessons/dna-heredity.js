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
      const repBoard = document.getElementById("rep-board");
      const repHelixSvg = document.getElementById("rep-helix-svg");
      const repTemplateRow = document.getElementById("rep-template-row");
      const repSlotRow = document.getElementById("rep-slot-row");
      const repBaseBank = document.getElementById("rep-base-bank");
      const repFeedback = document.getElementById("rep-feedback");
      const repCheckBtn = document.getElementById("rep-check-btn");
      const repResetBtn = document.getElementById("rep-reset-btn");
      const repStepBtn = document.getElementById("rep-step-btn");
      const repMismatchBtn = document.getElementById("rep-mismatch-btn");
      const repProofreadBtn = document.getElementById("rep-proofread-btn");
      const repRandomBtn = document.getElementById("rep-random-btn");
      const repClearLogBtn = document.getElementById("rep-clear-log-btn");
      const repPresetTitle = document.getElementById("rep-preset-title");
      const repPresetBadge = document.getElementById("rep-preset-badge");
      const repPresetDesc = document.getElementById("rep-preset-desc");
      const repNewStrandLabel = document.getElementById("rep-new-strand-label");
      const repPairProgress = document.getElementById("rep-pair-progress");
      const repStatPairs = document.getElementById("rep-stat-pairs");
      const repStatNucleotides = document.getElementById("rep-stat-nucleotides");
      const repStatHbonds = document.getElementById("rep-stat-hbonds");
      const repStatWidth = document.getElementById("rep-stat-width");
      const repInspHeading = document.getElementById("rep-insp-heading");
      const repInspChemistry = document.getElementById("rep-insp-chemistry");
      const repInspGeometry = document.getElementById("rep-insp-geometry");
      const repInspCodon = document.getElementById("rep-insp-codon");
      const repChargaffParity = document.getElementById("rep-chargaff-parity");
      const repChargaffBars = document.getElementById("rep-chargaff-bars");
      const repChargaffNote = document.getElementById("rep-chargaff-note");
      const repLogCount = document.getElementById("rep-log-count");
      const repLogBody = document.getElementById("rep-log-body");

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

      function orderGenotype(genotype) {
        return genotype.split("").sort(function (a, b) {
          const aUpper = a === a.toUpperCase();
          const bUpper = b === b.toUpperCase();
          if (aUpper !== bUpper) return aUpper ? -1 : 1;
          return a.localeCompare(b);
        }).join("");
      }

      /* ── Nucleotide Anatomy Explorer (#nucleotides) ──────────── */
      const NUCLEOTIDE_DATA = {
        A: {
          letter: "A",
          fullName: "Deoxyadenosine monophosphate (dAMP)",
          baseName: "Adenine",
          ringClass: "2-Ring Purine",
          isPurine: true,
          partner: "T",
          hBonds: 2,
          sugar: "Deoxyribose (2′-H · DNA)",
          isRna: false,
          color: "#2dd4bf",
          stroke: "#5eead4",
          baseTuple: "[4, 5, 5, 0, 0]",
          sugarTuple: "[7, 5, 0, 1, 0]",
          totalTuple: "[11, 10, 5, 5, 1]",
          partNotes: {
            phosphate: "The negatively charged phosphate group (PO₄⁻) attaches to the 5′ carbon of deoxyribose and bonds covalently to the 3′-OH of the previous nucleotide, building a sturdy outer rail.",
            sugar: "Deoxyribose is a 5-carbon ring (1′–5′). Its 2′ carbon carries only a hydrogen atom (2′-H) rather than an -OH group, making DNA chemically tougher than RNA.",
            base: "Adenine is a two-ring purine (fused 6- and 5-membered rings). Its top amino and ring-nitrogen groups present one H-bond donor and one acceptor tailored specifically for Thymine.",
            bonds: "Strong covalent bonds hold the sugar–phosphate backbone together (P–O–C) and anchor the base at 1′. Two weaker hydrogen bonds connect Adenine to Thymine across the helix center."
          }
        },
        T: {
          letter: "T",
          fullName: "Deoxythymidine monophosphate (dTMP)",
          baseName: "Thymine",
          ringClass: "1-Ring Pyrimidine",
          isPurine: false,
          partner: "A",
          hBonds: 2,
          sugar: "Deoxyribose (2′-H · DNA)",
          isRna: false,
          hasMethyl: true,
          color: "#fbbf24",
          stroke: "#fde68a",
          baseTuple: "[5, 5, 2, 2, 0]",
          sugarTuple: "[7, 5, 0, 1, 0]",
          totalTuple: "[12, 10, 2, 7, 1]",
          partNotes: {
            phosphate: "Identical phosphate group (PO₄⁻) at the 5′ carbon. Regardless of whether the base is A, T, C, or G, the phosphate–sugar rail repeats uniformly.",
            sugar: "Deoxyribose links the 5′ phosphate, the 3′-OH of the next nucleotide, and Thymine at the 1′ carbon—keeping the base protected inside the helix.",
            base: "Thymine is a single-ring pyrimidine with a distinctive methyl group (-CH₃). That methyl tag helps DNA repair enzymes spot accidental C→U chemical damage.",
            bonds: "Covalent phosphodiester bonds preserve sequence order along the strand, while two reversible hydrogen bonds pair Thymine cleanly with two-ring Adenine."
          }
        },
        C: {
          letter: "C",
          fullName: "Deoxycytidine monophosphate (dCMP)",
          baseName: "Cytosine",
          ringClass: "1-Ring Pyrimidine",
          isPurine: false,
          partner: "G",
          hBonds: 3,
          sugar: "Deoxyribose (2′-H · DNA)",
          isRna: false,
          color: "#fb7185",
          stroke: "#fda4af",
          baseTuple: "[4, 4, 3, 1, 0]",
          sugarTuple: "[7, 5, 0, 1, 0]",
          totalTuple: "[11, 9, 3, 6, 1]",
          partNotes: {
            phosphate: "5′ phosphate group ([0,0,0,4,1] residue) carries a negative charge at cell pH, making the outside of DNA water-soluble and attracting positively charged histones.",
            sugar: "Deoxyribose positions the 1-ring Cytosine ring inward so its three H-bond donor/acceptor sites line up across the 2.0 nm helix diameter.",
            base: "Cytosine is a single-ring pyrimidine with one H-bond donor and two acceptors—matching Guanine like three interlocking magnetic latches.",
            bonds: "G≡C pairs form three hydrogen bonds instead of two, making C–G-rich DNA regions noticeably harder to unzip with heat than A=T-rich regions."
          }
        },
        G: {
          letter: "G",
          fullName: "Deoxyguanosine monophosphate (dGMP)",
          baseName: "Guanine",
          ringClass: "2-Ring Purine",
          isPurine: true,
          partner: "C",
          hBonds: 3,
          sugar: "Deoxyribose (2′-H · DNA)",
          isRna: false,
          color: "#60a5fa",
          stroke: "#93c5fd",
          baseTuple: "[4, 5, 5, 1, 0]",
          sugarTuple: "[7, 5, 0, 1, 0]",
          totalTuple: "[11, 10, 5, 6, 1]",
          partNotes: {
            phosphate: "Phosphate bridges 5′ and 3′ carbons along the backbone via strong covalent phosphodiester bonds that helicase does not break during copying.",
            sugar: "Deoxyribose anchors the large two-ring Guanine base. Pairing a 2-ring purine with a 1-ring pyrimidine (C) keeps the double helix a constant 2.0 nm wide.",
            base: "Guanine is a two-ring purine containing one oxygen atom that Adenine lacks. That carbonyl oxygen creates a third hydrogen-bond latch with Cytosine.",
            bonds: "Three hydrogen bonds lock G to C across the strands while covalent bonds hold each strand’s sequence intact during unzipping."
          }
        },
        U: {
          letter: "U",
          fullName: "Uridine monophosphate (UMP · RNA)",
          baseName: "Uracil",
          ringClass: "1-Ring Pyrimidine",
          isPurine: false,
          partner: "A",
          hBonds: 2,
          sugar: "Ribose (2′-OH · RNA)",
          isRna: true,
          color: "#c084fc",
          stroke: "#d8b4fe",
          baseTuple: "[3, 4, 2, 2, 0]",
          sugarTuple: "[7, 5, 0, 2, 0]",
          totalTuple: "[10, 9, 2, 8, 1]",
          partNotes: {
            phosphate: "RNA uses the exact same 5′ phosphate group as DNA to connect nucleotides into a single-stranded genetic message (mRNA).",
            sugar: "RNA uses ribose sugar, which keeps an extra hydroxyl group (-OH) on the 2′ carbon. That oxygen makes RNA flexible for folding, though less stable for long-term storage.",
            base: "Uracil is a 1-ring pyrimidine chemically identical to Thymine except it lacks Thymine’s methyl (-CH₃) group. It pairs with Adenine using 2 hydrogen bonds.",
            bonds: "During transcription, RNA polymerase uses covalent bonds to stitch UMP onto the growing mRNA strand wherever the DNA template exposes an Adenine (A)."
          }
        }
      };

      const nucState = {
        base: "A",
        scale: "1nt",
        part: "phosphate"
      };

      function svgBaseShape(base, x, y, dir, scale) {
        const meta = NUCLEOTIDE_DATA[base] || NUCLEOTIDE_DATA.A;
        const s = scale || 1;
        const isPur = meta.isPurine;
        const dx = dir === "left" ? -1 : 1;
        if (isPur) {
          // 5-member ring fused with 6-member ring
          const pts1 = [
            [x, y - 16 * s],
            [x + dx * 28 * s, y - 22 * s],
            [x + dx * 42 * s, y],
            [x + dx * 28 * s, y + 22 * s],
            [x, y + 16 * s]
          ].map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
          const pts2 = [
            [x + dx * 40 * s, y - 18 * s],
            [x + dx * 70 * s, y - 24 * s],
            [x + dx * 96 * s, y - 14 * s],
            [x + dx * 96 * s, y + 14 * s],
            [x + dx * 70 * s, y + 24 * s],
            [x + dx * 40 * s, y + 18 * s]
          ].map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
          return '<polygon points="' + pts1 + '" fill="' + meta.color + '" fill-opacity="0.22" stroke="' + meta.stroke + '" stroke-width="2" />' +
                 '<polygon points="' + pts2 + '" fill="' + meta.color + '" fill-opacity="0.3" stroke="' + meta.stroke + '" stroke-width="2" />' +
                 '<text x="' + (x + dx * 56 * s).toFixed(1) + '" y="' + (y + 6 * s).toFixed(1) + '" text-anchor="middle" fill="#ffffff" font-size="' + (18 * s).toFixed(1) + '" font-weight="800" font-family="IBM Plex Mono, monospace">' + base + '</text>';
        }
        const pts = [
          [x, y - 16 * s],
          [x + dx * 26 * s, y - 24 * s],
          [x + dx * 58 * s, y - 16 * s],
          [x + dx * 58 * s, y + 16 * s],
          [x + dx * 26 * s, y + 24 * s],
          [x, y + 16 * s]
        ].map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
        const methyl = meta.hasMethyl
          ? '<circle cx="' + (x + dx * 26 * s).toFixed(1) + '" cy="' + (y - 34 * s).toFixed(1) + '" r="' + (8 * s).toFixed(1) + '" fill="#fde68a" fill-opacity="0.28" stroke="#fde68a" stroke-width="1.5" />' +
            '<text x="' + (x + dx * 26 * s).toFixed(1) + '" y="' + (y - 31 * s).toFixed(1) + '" text-anchor="middle" fill="#fde68a" font-size="' + (8.5 * s).toFixed(1) + '" font-weight="700" font-family="IBM Plex Mono, monospace">CH₃</text>'
          : "";
        return '<polygon points="' + pts + '" fill="' + meta.color + '" fill-opacity="0.28" stroke="' + meta.stroke + '" stroke-width="2" />' +
               methyl +
               '<text x="' + (x + dx * 30 * s).toFixed(1) + '" y="' + (y + 6 * s).toFixed(1) + '" text-anchor="middle" fill="#ffffff" font-size="' + (18 * s).toFixed(1) + '" font-weight="800" font-family="IBM Plex Mono, monospace">' + base + '</text>';
      }

      function renderNucleotideExplorer() {
        const svg = document.getElementById("nuc-anatomy-svg");
        if (!svg) return;
        const info = NUCLEOTIDE_DATA[nucState.base] || NUCLEOTIDE_DATA.A;
        const part = nucState.part;

        document.querySelectorAll("#nuc-base-tabs .nuc-tab-btn").forEach(function (btn) {
          const active = btn.dataset.nuc === nucState.base;
          btn.classList.toggle("is-active", active);
          btn.setAttribute("aria-pressed", String(active));
        });
        document.querySelectorAll("#nuc-scale-tabs .nuc-scale-btn").forEach(function (btn) {
          const active = btn.dataset.scale === nucState.scale;
          btn.classList.toggle("is-active", active);
          btn.setAttribute("aria-pressed", String(active));
        });
        document.querySelectorAll("#nuc-part-tabs .nuc-part-btn").forEach(function (btn) {
          const active = btn.dataset.part === nucState.part;
          btn.classList.toggle("is-active", active);
          btn.setAttribute("aria-pressed", String(active));
        });

        let markup = '<rect width="560" height="280" rx="10" fill="#18263c" />';

        if (nucState.scale === "1nt") {
          const phosGlow = part === "phosphate" ? ' stroke="#fde047" stroke-width="3.5"' : ' stroke="#93c5fd" stroke-width="2"';
          const sugGlow = part === "sugar" ? ' stroke="#fde047" stroke-width="3.5"' : ' stroke="#5eead4" stroke-width="2"';
          const baseGlow = part === "base" ? ' filter="url(#nucGlow)"' : "";
          const bondGlow = part === "bonds" ? "#fde047" : "#94a3b8";

          markup += '<defs><filter id="nucGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#fde047" flood-opacity="0.7" /></filter></defs>';
          markup += '<text x="18" y="26" fill="#cbd5e1" font-size="11" font-weight="700" font-family="IBM Plex Mono, monospace">SINGLE NUCLEOTIDE ANATOMY · ' + (info.isRna ? "RNA" : "DNA") + ' MONOMER</text>';

          // Covalent backbone bonds group
          markup += '<g class="nuc-svg-part" data-part="bonds" tabindex="0" role="button" aria-label="Covalent and hydrogen bonds">';
          markup += '<line x1="108" y1="86" x2="148" y2="112" stroke="' + bondGlow + '" stroke-width="4" stroke-linecap="round" />';
          markup += '<line x1="230" y1="138" x2="274" y2="138" stroke="' + bondGlow + '" stroke-width="4" stroke-linecap="round" />';
          markup += '<line x1="162" y1="184" x2="140" y2="218" stroke="' + bondGlow + '" stroke-width="3" stroke-dasharray="4 3" />';
          markup += '<text x="140" y="232" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="IBM Plex Mono, monospace">3′-OH backbone link</text>';

          // H-bond donor/acceptor prongs
          const tipX = info.isPurine ? 378 : 340;
          const hCount = info.hBonds;
          const yOffsets = hCount === 3 ? [-14, 0, 14] : [-9, 9];
          yOffsets.forEach(function (dy) {
            markup += '<line x1="' + tipX + '" y1="' + (138 + dy) + '" x2="438" y2="' + (138 + dy) + '" stroke="' + (part === "bonds" ? "#fde047" : "#38bdf8") + '" stroke-width="2.5" stroke-dasharray="5 4" />';
          });
          markup += '<rect x="442" y="108" width="96" height="60" rx="8" fill="#0f172a" fill-opacity="0.55" stroke="#475569" stroke-dasharray="4 3" />';
          markup += '<text x="490" y="134" text-anchor="middle" fill="#cbd5e1" font-size="11" font-weight="700" font-family="IBM Plex Mono, monospace">Pairs w/ ' + info.partner + '</text>';
          markup += '<text x="490" y="152" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="700" font-family="IBM Plex Mono, monospace">' + hCount + ' H-bonds</text>';
          markup += '</g>';

          // Phosphate
          markup += '<g class="nuc-svg-part" data-part="phosphate" tabindex="0" role="button" aria-label="Phosphate group at 5-prime carbon">';
          markup += '<circle cx="84" cy="78" r="28" fill="#1d4ed8" fill-opacity="0.45"' + phosGlow + ' />';
          markup += '<text x="84" y="84" text-anchor="middle" fill="#ffffff" font-size="20" font-weight="800" font-family="IBM Plex Mono, monospace">P</text>';
          markup += '<text x="84" y="122" text-anchor="middle" fill="#bae6fd" font-size="10.5" font-weight="700" font-family="IBM Plex Mono, monospace">5′ Phosphate</text>';
          markup += '</g>';

          // Sugar pentagon
          markup += '<g class="nuc-svg-part" data-part="sugar" tabindex="0" role="button" aria-label="5-carbon pentose sugar">';
          markup += '<polygon points="190,104 232,136 216,184 164,184 148,136" fill="#0d9488" fill-opacity="0.35"' + sugGlow + ' />';
          markup += '<text x="190" y="122" text-anchor="middle" fill="#99f6e4" font-size="10" font-weight="700" font-family="IBM Plex Mono, monospace">O</text>';
          markup += '<text x="190" y="152" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="800" font-family="Manrope, sans-serif">' + (info.isRna ? "Ribose" : "Deoxyribose") + '</text>';
          markup += '<text x="148" y="130" text-anchor="end" fill="#cbd5e1" font-size="9.5" font-family="IBM Plex Mono, monospace">5′</text>';
          markup += '<text x="234" y="130" text-anchor="start" fill="#cbd5e1" font-size="9.5" font-family="IBM Plex Mono, monospace">1′</text>';
          markup += '<rect x="194" y="190" width="56" height="20" rx="5" fill="' + (info.isRna ? "#7e22ce" : "#0f766e") + '" stroke="' + (info.isRna ? "#d8b4fe" : "#5eead4") + '" />';
          markup += '<text x="222" y="204" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="700" font-family="IBM Plex Mono, monospace">' + (info.isRna ? "2′-OH" : "2′-H") + '</text>';
          markup += '</g>';

          // Base
          markup += '<g class="nuc-svg-part" data-part="base" tabindex="0" role="button" aria-label="Nitrogenous base ' + info.baseName + '"' + baseGlow + '>';
          markup += svgBaseShape(info.letter, 276, 138, "right", 1.0);
          markup += '<text x="328" y="196" text-anchor="middle" fill="' + info.stroke + '" font-size="11" font-weight="700" font-family="Manrope, sans-serif">' + info.baseName + ' (' + info.ringClass + ')</text>';
          markup += '</g>';

          markup += '<text x="280" y="264" text-anchor="middle" fill="#94a3b8" font-size="10.5" font-family="Manrope, sans-serif">Click Phosphate, Sugar, Base, or Bonds in the diagram to inspect each part</text>';
        } else if (nucState.scale === "1bp") {
          const partnerKey = info.partner;
          const pInfo = NUCLEOTIDE_DATA[partnerKey];
          markup += '<text x="18" y="26" fill="#cbd5e1" font-size="11" font-weight="700" font-family="IBM Plex Mono, monospace">1 BASE PAIR = 2 ANTIPARALLEL NUCLEOTIDES · 2.0 nm HELIX WIDTH</text>';
          // Width caliper
          markup += '<line x1="126" y1="48" x2="434" y2="48" stroke="#5eead4" stroke-width="1.5" />';
          markup += '<line x1="126" y1="42" x2="126" y2="54" stroke="#5eead4" stroke-width="1.5" />';
          markup += '<line x1="434" y1="42" x2="434" y2="54" stroke="#5eead4" stroke-width="1.5" />';
          markup += '<rect x="195" y="38" width="170" height="20" rx="4" fill="#18263c" />';
          markup += '<text x="280" y="52" text-anchor="middle" fill="#5eead4" font-size="10.5" font-weight="700" font-family="IBM Plex Mono, monospace">2.0 nm (Purine + Pyrimidine)</text>';

          // Left nucleotide (5'->3')
          markup += '<circle cx="52" cy="96" r="20" fill="#1d4ed8" fill-opacity="0.5" stroke="#93c5fd" stroke-width="2" />';
          markup += '<text x="52" y="101" text-anchor="middle" fill="#fff" font-size="14" font-weight="800" font-family="IBM Plex Mono, monospace">P</text>';
          markup += '<line x1="68" y1="108" x2="94" y2="128" stroke="#94a3b8" stroke-width="3" />';
          markup += '<polygon points="118,114 148,138 136,174 100,174 88,138" fill="#0d9488" fill-opacity="0.4" stroke="#5eead4" stroke-width="2" />';
          markup += '<text x="118" y="150" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">S</text>';
          markup += '<line x1="148" y1="142" x2="170" y2="142" stroke="#94a3b8" stroke-width="3" />';
          markup += svgBaseShape(info.letter, 170, 142, "right", 0.85);
          markup += '<text x="52" y="196" text-anchor="middle" fill="#93c5fd" font-size="10" font-family="IBM Plex Mono, monospace">5′ → 3′</text>';

          // Right nucleotide (3'<-5', flipped sugar)
          markup += '<circle cx="508" cy="186" r="20" fill="#1d4ed8" fill-opacity="0.5" stroke="#93c5fd" stroke-width="2" />';
          markup += '<text x="508" y="191" text-anchor="middle" fill="#fff" font-size="14" font-weight="800" font-family="IBM Plex Mono, monospace">P</text>';
          markup += '<line x1="492" y1="174" x2="466" y2="154" stroke="#94a3b8" stroke-width="3" />';
          markup += '<polygon points="442,172 412,148 424,112 460,112 472,148" fill="#0d9488" fill-opacity="0.4" stroke="#5eead4" stroke-width="2" />';
          markup += '<text x="442" y="146" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">S</text>';
          markup += '<line x1="412" y1="142" x2="390" y2="142" stroke="#94a3b8" stroke-width="3" />';
          markup += svgBaseShape(partnerKey, 390, 142, "left", 0.85);
          markup += '<text x="508" y="102" text-anchor="middle" fill="#93c5fd" font-size="10" font-family="IBM Plex Mono, monospace">3′ ← 5′</text>';

          // Center H-bonds
          const lx = 170 + (info.isPurine ? 82 : 50);
          const rx = 390 - (pInfo.isPurine ? 82 : 50);
          const ys = info.hBonds === 3 ? [129, 142, 155] : [134, 150];
          ys.forEach(function (yy) {
            markup += '<line x1="' + lx + '" y1="' + yy + '" x2="' + rx + '" y2="' + yy + '" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="5 3" />';
          });
          markup += '<text x="280" y="218" text-anchor="middle" fill="#7dd3fc" font-size="12" font-weight="700" font-family="IBM Plex Mono, monospace">' + info.letter + '–' + partnerKey + ' Base Pair (' + info.hBonds + ' H-bonds)</text>';
          markup += '<text x="280" y="256" text-anchor="middle" fill="#cbd5e1" font-size="11" font-family="Manrope, sans-serif">2 Phosphates + 2 Sugars + 2 Paired Bases = 2 Nucleotides total</text>';
        } else {
          // 4 Base Pairs = 8 Nucleotides
          const seq = info.isRna ? ["A", "U", "C", "G"] : ["A", "T", "C", "G"];
          markup += '<text x="18" y="26" fill="#cbd5e1" font-size="11" font-weight="700" font-family="IBM Plex Mono, monospace">4 BASE PAIRS = 8 NUCLEOTIDES · ' + seq.join("") + ' PAIRED WITH ' + seq.map(function (b) { return NUCLEOTIDE_DATA[b].partner; }).join("") + '</text>';
          // Top and bottom rails
          markup += '<line x1="78" y1="74" x2="482" y2="74" stroke="#60a5fa" stroke-width="4" />';
          markup += '<line x1="78" y1="208" x2="482" y2="208" stroke="#60a5fa" stroke-width="4" />';
          markup += '<text x="36" y="78" text-anchor="middle" fill="#93c5fd" font-size="11" font-weight="700" font-family="IBM Plex Mono, monospace">5′</text>';
          markup += '<text x="522" y="78" text-anchor="middle" fill="#93c5fd" font-size="11" font-weight="700" font-family="IBM Plex Mono, monospace">3′</text>';
          markup += '<text x="36" y="212" text-anchor="middle" fill="#93c5fd" font-size="11" font-weight="700" font-family="IBM Plex Mono, monospace">3′</text>';
          markup += '<text x="522" y="212" text-anchor="middle" fill="#93c5fd" font-size="11" font-weight="700" font-family="IBM Plex Mono, monospace">5′</text>';

          seq.forEach(function (b, idx) {
            const cx = 128 + idx * 102;
            const p = NUCLEOTIDE_DATA[b].partner;
            const bMeta = NUCLEOTIDE_DATA[b];
            const pMeta = NUCLEOTIDE_DATA[p];
            // Top nucleotide
            markup += '<circle cx="' + (cx - 26) + '" cy="74" r="10" fill="#1d4ed8" stroke="#93c5fd" stroke-width="1.5" />';
            markup += '<text x="' + (cx - 26) + '" y="77.5" text-anchor="middle" fill="#fff" font-size="9" font-weight="700">P</text>';
            markup += '<polygon points="' + cx + ',60 ' + (cx + 15) + ',74 ' + (cx + 10) + ',88 ' + (cx - 10) + ',88 ' + (cx - 15) + ',74" fill="#0d9488" stroke="#5eead4" stroke-width="1.5" />';
            markup += '<text x="' + cx + '" y="78" text-anchor="middle" fill="#fff" font-size="9" font-weight="700">S</text>';

            const topH = bMeta.isPurine ? 44 : 28;
            const botH = pMeta.isPurine ? 44 : 28;
            markup += '<rect x="' + (cx - 18) + '" y="90" width="36" height="' + topH + '" rx="6" fill="' + bMeta.color + '" fill-opacity="0.3" stroke="' + bMeta.stroke + '" stroke-width="1.8" />';
            markup += '<text x="' + cx + '" y="' + (90 + topH / 2 + 5) + '" text-anchor="middle" fill="#fff" font-size="14" font-weight="800" font-family="IBM Plex Mono, monospace">' + b + '</text>';

            // Bottom nucleotide
            markup += '<circle cx="' + (cx + 26) + '" cy="208" r="10" fill="#1d4ed8" stroke="#93c5fd" stroke-width="1.5" />';
            markup += '<text x="' + (cx + 26) + '" y="211.5" text-anchor="middle" fill="#fff" font-size="9" font-weight="700">P</text>';
            markup += '<polygon points="' + cx + ',222 ' + (cx - 15) + ',208 ' + (cx - 10) + ',194 ' + (cx + 10) + ',194 ' + (cx + 15) + ',208" fill="#0d9488" stroke="#5eead4" stroke-width="1.5" />';
            markup += '<text x="' + cx + '" y="211" text-anchor="middle" fill="#fff" font-size="9" font-weight="700">S</text>';

            const botTop = 192 - botH;
            markup += '<rect x="' + (cx - 18) + '" y="' + botTop + '" width="36" height="' + botH + '" rx="6" fill="' + pMeta.color + '" fill-opacity="0.3" stroke="' + pMeta.stroke + '" stroke-width="1.8" />';
            markup += '<text x="' + cx + '" y="' + (botTop + botH / 2 + 5) + '" text-anchor="middle" fill="#fff" font-size="14" font-weight="800" font-family="IBM Plex Mono, monospace">' + p + '</text>';

            // H-bonds in center
            const topEnd = 90 + topH;
            const hb = bMeta.hBonds;
            const xs = hb === 3 ? [cx - 8, cx, cx + 8] : [cx - 5, cx + 5];
            xs.forEach(function (hx) {
              markup += '<line x1="' + hx + '" y1="' + (topEnd + 2) + '" x2="' + hx + '" y2="' + (botTop - 2) + '" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3 2" />';
            });
          });
          markup += '<text x="280" y="256" text-anchor="middle" fill="#cbd5e1" font-size="11" font-family="Manrope, sans-serif">8 Phosphates + 8 Sugars + 8 Bases = 8 Nucleotides · 10 Hydrogen Bonds</text>';
        }

        svg.innerHTML = markup;

        svg.querySelectorAll(".nuc-svg-part").forEach(function (el) {
          el.addEventListener("click", function () {
            nucState.part = el.dataset.part;
            renderNucleotideExplorer();
          });
          el.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              nucState.part = el.dataset.part;
              renderNucleotideExplorer();
            }
          });
        });

        const inspTitle = document.getElementById("nuc-insp-title");
        const inspPart = document.getElementById("nuc-insp-part");
        const ringBadge = document.getElementById("nuc-ring-badge");
        const hbondBadge = document.getElementById("nuc-hbond-badge");
        const sugarBadge = document.getElementById("nuc-sugar-badge");
        const tupleBadge = document.getElementById("nuc-tuple-badge");
        const scaleSummary = document.getElementById("nuc-scale-summary");

        if (inspTitle) inspTitle.textContent = info.fullName + " · " + info.ringClass;
        if (inspPart) inspPart.textContent = info.partNotes[nucState.part];
        if (ringBadge) ringBadge.textContent = info.ringClass;
        if (hbondBadge) hbondBadge.textContent = info.hBonds + " Hydrogen Bonds (pairs with " + info.partner + ")";
        if (sugarBadge) sugarBadge.textContent = info.sugar;
        if (tupleBadge) {
          const tupleVal = nucState.part === "base" ? info.baseTuple : (nucState.part === "phosphate" ? "[0, 0, 0, 4, 1]" : (nucState.part === "sugar" ? info.sugarTuple : info.totalTuple));
          const tupleLabel = nucState.part === "base" ? "Base" : (nucState.part === "phosphate" ? "Phosphate" : (nucState.part === "sugar" ? "Sugar" : "Total"));
          tupleBadge.textContent = tupleLabel + " [H,C,N,O,P]: " + tupleVal;
        }
        if (scaleSummary) {
          if (nucState.scale === "1nt") scaleSummary.textContent = "1 phosphate + 1 sugar + 1 base = 1 nucleotide (" + (info.isRna ? "RNA" : "DNA") + " building block).";
          else if (nucState.scale === "1bp") scaleSummary.textContent = "2 phosphates + 2 sugars + 2 paired bases = 2 nucleotides (1 base pair across antiparallel strands).";
          else scaleSummary.textContent = "8 phosphates + 8 sugars + 8 bases = 8 nucleotides (4 base pairs: ATCG paired with TAGC).";
        }
      }

      function initNucleotideExplorer() {
        const baseTabs = document.getElementById("nuc-base-tabs");
        const scaleTabs = document.getElementById("nuc-scale-tabs");
        const partTabs = document.getElementById("nuc-part-tabs");
        if (!baseTabs || !scaleTabs || !partTabs) return;

        baseTabs.querySelectorAll(".nuc-tab-btn").forEach(function (btn) {
          btn.addEventListener("click", function () {
            nucState.base = btn.dataset.nuc;
            renderNucleotideExplorer();
          });
        });
        scaleTabs.querySelectorAll(".nuc-scale-btn").forEach(function (btn) {
          btn.addEventListener("click", function () {
            nucState.scale = btn.dataset.scale;
            renderNucleotideExplorer();
          });
        });
        partTabs.querySelectorAll(".nuc-part-btn").forEach(function (btn) {
          btn.addEventListener("click", function () {
            nucState.part = btn.dataset.part;
            renderNucleotideExplorer();
          });
        });

        renderNucleotideExplorer();
      }

      /* ── Evolved Replication & Base-Pairing Exhibit (#copy) ──── */
      const REP_PRESETS = {
        starter: {
          label: "Classic 8-bp Teaching Strand",
          badge: "Foundations · 20 H-bonds",
          template: ["A", "C", "T", "G", "G", "A", "T", "C"],
          mutIndex: -1,
          desc: "Balanced 8-base template (4 A–T pairs + 4 G–C pairs) demonstrating antiparallel 5′→3′ / 3′←5′ pairing and Chargaff’s parity rules.",
          alleleNote: "Reference sequence: Codon 1 (ACT → Thr) · Codon 2 (GGA → Gly). Every A–T forms 2 H-bonds and every G–C forms 3 H-bonds."
        },
        "pea-tall": {
          label: "Pea Height Gene · Dominant Tall Allele (T / Le)",
          badge: "Wild-Type Allele (T) · Tall Stem",
          template: ["A", "T", "G", "G", "C", "C", "T", "A"],
          mutIndex: 3,
          desc: "Active-site coding segment of Mendel’s pea stem-height gene (Le, gibberellin 3β-hydroxylase). Position 4 is G, forming Codon 2 (GCC = Alanine).",
          alleleNote: "Produces functional enzyme → gibberellin growth hormone → Tall pea plant (TT or Tt in the Punnett square below)."
        },
        "pea-dwarf": {
          label: "Pea Height Gene · Recessive Dwarf Allele (t / le)",
          badge: "Point Mutation G→A at Pos 4 · Short Stem",
          template: ["A", "T", "G", "A", "C", "C", "T", "A"],
          mutIndex: 3,
          desc: "Compare Position 4 with the Tall (T) allele! A single G→A substitution changes Codon 2 from GCC (Alanine) to ACC (Threonine), crippling enzyme activity.",
          alleleNote: "Replication copies this mutation faithfully into every new cell. Two copies (tt) produce Mendel’s short (dwarf) pea plant."
        },
        "pea-seed": {
          label: "Pea Seed Color Gene · Dominant Yellow Allele (Y / I)",
          badge: "Stay-Green Gene (SGR) · Yellow Seeds",
          template: ["T", "A", "C", "G", "G", "C", "A", "T"],
          mutIndex: -1,
          desc: "Coding segment from the pea chlorophyll-breakdown gene. Functional alleles break down green chlorophyll as seeds mature, turning them yellow (YY or Yy).",
          alleleNote: "Connects DNA sequence directly to the Seed Color (Y/y) cross in the Breeding Lab below."
        },
        "gc-clamp": {
          label: "GC-Clamp vs. AT-Rich Replication Origin",
          badge: "Thermodynamics · 3 H-bonds vs. 2 H-bonds",
          template: ["G", "C", "G", "C", "A", "T", "A", "T"],
          mutIndex: -1,
          desc: "Positions 1–4 (GCGC) form 3 H-bonds per pair (12 H-bonds); Positions 5–8 (ATAT) form 2 H-bonds per pair (8 H-bonds). Cells initiate DNA unzipping at AT-rich origins because 2 H-bonds take less energy to separate!",
          alleleNote: "Compare total hydrogen bonds on the left half (12) vs. the right half (8) as you pair this strand."
        }
      };

      const CODON_TABLE = {
        UUU: "Phe", UUC: "Phe", UUA: "Leu", UUG: "Leu",
        CUU: "Leu", CUC: "Leu", CUA: "Leu", CUG: "Leu",
        AUU: "Ile", AUC: "Ile", AUA: "Ile", AUG: "Met",
        GUU: "Val", GUC: "Val", GUA: "Val", GUG: "Val",
        UCU: "Ser", UCC: "Ser", UCA: "Ser", UCG: "Ser",
        CCU: "Pro", CCC: "Pro", CCA: "Pro", CCG: "Pro",
        ACU: "Thr", ACC: "Thr", ACA: "Thr", ACG: "Thr",
        GCU: "Ala", GCC: "Ala", GCA: "Ala", GCG: "Ala",
        UAU: "Tyr", UAC: "Tyr", UAA: "Stop", UAG: "Stop",
        CAU: "His", CAC: "His", CAA: "Gln", CAG: "Gln",
        AAU: "Asn", AAC: "Asn", AAA: "Lys", AAG: "Lys",
        GAU: "Asp", GAC: "Asp", GAA: "Glu", GAG: "Glu",
        UGU: "Cys", UGC: "Cys", UGA: "Stop", UGG: "Trp",
        CGU: "Arg", CGC: "Arg", CGA: "Arg", CGG: "Arg",
        AGU: "Ser", AGC: "Ser", AGA: "Arg", AGG: "Arg",
        GGU: "Gly", GGC: "Gly", GGA: "Gly", GGG: "Gly"
      };

      const REP_STAGE_NOTES = {
        1: "Stage 1 · Helicase unzips hydrogen bonds between paired bases while keeping both covalent sugar–phosphate backbones intact.",
        2: "Stage 2 · Polymerase pairs free nucleotides onto the antiparallel 3′ ← 5′ partner strand following A–T (or A–U) and C–G rules.",
        3: "Stage 3 · Proofreading checks helix width (2.0 nm) and H-bond geometry to catch steric clashes, narrow gaps, or misaligned donors.",
        4: "Stage 4 · Semiconservative outcome: complete all 8 complementary bases to see two identical daughter molecules (each 1 old + 1 new strand)."
      };

      const repState = {
        presetKey: "starter",
        mode: "dna",
        stage: 2,
        template: ["A", "C", "T", "G", "G", "A", "T", "C"],
        answers: ["", "", "", "", "", "", "", ""],
        selected: 0,
        checked: false,
        mismatchCycle: 0,
        log: []
      };

      function complementFor(base, mode) {
        const useMode = mode || repState.mode;
        if (useMode === "rna") return { A: "U", T: "A", C: "G", G: "C" }[base];
        return { A: "T", T: "A", C: "G", G: "C" }[base];
      }

      function isPurine(base) {
        return base === "A" || base === "G";
      }

      function hBondsForPair(tBase, ansBase, mode) {
        if (!ansBase || ansBase !== complementFor(tBase, mode)) return 0;
        return (tBase === "C" || tBase === "G") ? 3 : 2;
      }

      function diagnosePair(tBase, ansBase, mode) {
        const expected = complementFor(tBase, mode);
        if (!ansBase) {
          return {
            status: "empty",
            hBonds: 0,
            widthLabel: "Awaiting nucleotide",
            summary: "Slot is empty. Template " + tBase + " (" + (isPurine(tBase) ? "2-ring purine" : "1-ring pyrimidine") + ") requires " + expected + " (" + (isPurine(expected) ? "2-ring purine" : "1-ring pyrimidine") + ")."
          };
        }
        if (ansBase === expected) {
          const hb = hBondsForPair(tBase, ansBase, mode);
          return {
            status: "correct",
            hBonds: hb,
            widthLabel: "2.0 nm (Purine + Pyrimidine)",
            summary: tBase + " pairs with " + ansBase + " using " + hb + " hydrogen bonds. Combining one 2-ring purine with one 1-ring pyrimidine keeps the helix exactly 2.0 nm wide."
          };
        }
        if (isPurine(tBase) && isPurine(ansBase)) {
          return {
            status: "clash",
            hBonds: 0,
            widthLabel: ">2.0 nm Bulge (2 Purines)",
            summary: "Steric clash! Both " + tBase + " and " + ansBase + " are 2-ring purines. Together they are too wide for the 2.0 nm helix, distorting the backbone."
          };
        }
        if (!isPurine(tBase) && !isPurine(ansBase)) {
          return {
            status: "gap",
            hBonds: 0,
            widthLabel: "<2.0 nm Gap (2 Pyrimidines)",
            summary: "Helix pinch! Both " + tBase + " and " + ansBase + " are 1-ring pyrimidines. They are too narrow to bridge the 2.0 nm gap between backbones."
          };
        }
        return {
          status: "misaligned",
          hBonds: 0,
          widthLabel: "2.0 nm (H-bonds misaligned)",
          summary: "Width fits (1 purine + 1 pyrimidine), but " + tBase + " and " + ansBase + " cannot align their hydrogen-bond donors and acceptors. Replace " + ansBase + " with " + expected + "."
        };
      }

      function translateTriplet(b1, b2, b3) {
        const rna = (b1 + b2 + b3).replace(/T/g, "U");
        return { rna: rna, aa: CODON_TABLE[rna] || "—" };
      }

      function getCurrentPresetMeta() {
        if (repState.presetKey === "random") {
          return {
            label: "Random 8-bp Template",
            badge: "Custom Sequence",
            mutIndex: -1,
            desc: "Freshly generated 8-base DNA template. Apply Watson–Crick base pairing and inspect the resulting codons and Chargaff parity.",
            alleleNote: "Custom template sequence: verify every rung follows A–T/U (2 H-bonds) and C–G (3 H-bonds)."
          };
        }
        return REP_PRESETS[repState.presetKey] || REP_PRESETS.starter;
      }

      function renderReplicationSVG() {
        if (!repHelixSvg) return;
        const preset = getCurrentPresetMeta();
        const isRna = repState.mode === "rna";
        const allMatched = repState.template.every(function (b, i) {
          return repState.answers[i] === complementFor(b, repState.mode);
        });
        const expectedHBonds = repState.template.reduce(function (sum, b) {
          return sum + ((b === "C" || b === "G") ? 3 : 2);
        }, 0);

        let svg = '<rect width="760" height="270" rx="10" fill="#18263c" />';

        // Stage 4 Semiconservative split duplex view when completed in DNA mode
        if (repState.stage === 4 && allMatched && !isRna) {
          svg += '<text x="20" y="25" fill="#5eead4" font-size="11.5" font-weight="700" font-family="IBM Plex Mono, monospace">STAGE 4 · SEMICONSERVATIVE REPLICATION COMPLETE (2 IDENTICAL DUPLEXES)</text>';
          svg += '<text x="740" y="25" text-anchor="end" fill="#cbd5e1" font-size="10.5" font-family="IBM Plex Mono, monospace">Each daughter = 1 old + 1 new strand</text>';

          [0, 1].forEach(function (duplexIdx) {
            const topY = duplexIdx === 0 ? 54 : 162;
            const botY = topY + 56;
            const title = duplexIdx === 0
              ? "Daughter DNA #1 · Original Template (Teal) + Newly Synthesized Partner (Amber)"
              : "Daughter DNA #2 · Complementary Template (Amber) + Newly Synthesized Partner (Teal)";
            const topColor = duplexIdx === 0 ? "#2dd4bf" : "#fbbf24";
            const botColor = duplexIdx === 0 ? "#fbbf24" : "#2dd4bf";

            svg += '<text x="20" y="' + (topY - 8) + '" fill="#e2e8f0" font-size="10.5" font-weight="700" font-family="Manrope, sans-serif">' + title + '</text>';
            svg += '<line x1="56" y1="' + topY + '" x2="704" y2="' + topY + '" stroke="' + topColor + '" stroke-width="3.5" />';
            svg += '<line x1="56" y1="' + botY + '" x2="704" y2="' + botY + '" stroke="' + botColor + '" stroke-width="3.5" />';
            svg += '<text x="24" y="' + (topY + 4) + '" fill="' + topColor + '" font-size="10.5" font-weight="700" font-family="IBM Plex Mono, monospace">5′</text>';
            svg += '<text x="722" y="' + (topY + 4) + '" fill="' + topColor + '" font-size="10.5" font-weight="700" font-family="IBM Plex Mono, monospace">3′</text>';
            svg += '<text x="24" y="' + (botY + 4) + '" fill="' + botColor + '" font-size="10.5" font-weight="700" font-family="IBM Plex Mono, monospace">3′</text>';
            svg += '<text x="722" y="' + (botY + 4) + '" fill="' + botColor + '" font-size="10.5" font-weight="700" font-family="IBM Plex Mono, monospace">5′</text>';

            repState.template.forEach(function (tBase, i) {
              const cx = 104 + i * 78;
              const pBase = repState.answers[i];
              const hb = hBondsForPair(tBase, pBase, "dna");
              svg += '<rect x="' + (cx - 17) + '" y="' + (topY + 4) + '" width="34" height="19" rx="4" fill="#0f172a" stroke="' + topColor + '" stroke-width="1.4" />';
              svg += '<text x="' + cx + '" y="' + (topY + 18) + '" text-anchor="middle" fill="#fff" font-size="12" font-weight="800" font-family="IBM Plex Mono, monospace">' + tBase + '</text>';

              const xs = hb === 3 ? [cx - 6, cx, cx + 6] : [cx - 4, cx + 4];
              xs.forEach(function (hx) {
                svg += '<line x1="' + hx + '" y1="' + (topY + 24) + '" x2="' + hx + '" y2="' + (botY - 24) + '" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="2 2" />';
              });

              svg += '<rect x="' + (cx - 17) + '" y="' + (botY - 23) + '" width="34" height="19" rx="4" fill="#0f172a" stroke="' + botColor + '" stroke-width="1.4" />';
              svg += '<text x="' + cx + '" y="' + (botY - 9) + '" text-anchor="middle" fill="#fff" font-size="12" font-weight="800" font-family="IBM Plex Mono, monospace">' + pBase + '</text>';
            });
          });
          repHelixSvg.innerHTML = svg;
          return;
        }

        // Standard molecular workbench ladder / fork view
        const stageTitles = {
          1: "STAGE 1 · HELICASE UNZIPS " + expectedHBonds + " HYDROGEN BONDS (BACKBONE INTACT)",
          2: isRna ? "STAGE 2 · RNA POLYMERASE TRANSCRIBING 3′ ← 5′ mRNA STRAND" : "STAGE 2 · DNA POLYMERASE BUILDING 3′ ← 5′ PARTNER STRAND",
          3: "STAGE 3 · EXONUCLEASE PROOFREADING · 2.0 nm HELIX GEOMETRY",
          4: allMatched && isRna ? "STAGE 4 · mRNA TRANSCRIPT RELEASED FOR TRANSLATION" : "STAGE 4 · COMPLETE ALL 8 BASES TO VIEW DAUGHTER DUPLEXES"
        };
        svg += '<text x="18" y="22" fill="#cbd5e1" font-size="11" font-weight="700" font-family="IBM Plex Mono, monospace">' + stageTitles[repState.stage] + '</text>';

        // 2.0 nm width rail guides on right edge
        svg += '<line x1="712" y1="68" x2="712" y2="188" stroke="#475569" stroke-width="1.5" stroke-dasharray="3 3" />';
        svg += '<text x="720" y="132" fill="#94a3b8" font-size="10" font-weight="700" font-family="IBM Plex Mono, monospace">2.0</text>';
        svg += '<text x="720" y="144" fill="#94a3b8" font-size="10" font-weight="700" font-family="IBM Plex Mono, monospace">nm</text>';

        // Top template covalent backbone (always intact)
        svg += '<line x1="56" y1="50" x2="684" y2="50" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" />';
        svg += '<text x="30" y="54" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="800" font-family="IBM Plex Mono, monospace">5′ PO₄</text>';
        svg += '<text x="720" y="54" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="800" font-family="IBM Plex Mono, monospace">3′ OH</text>';

        // Bottom strand end labels
        svg += '<text x="30" y="210" text-anchor="middle" fill="' + (isRna ? "#d8b4fe" : "#fcd34d") + '" font-size="11" font-weight="800" font-family="IBM Plex Mono, monospace">3′ OH</text>';
        svg += '<text x="720" y="210" text-anchor="middle" fill="' + (isRna ? "#d8b4fe" : "#fcd34d") + '" font-size="11" font-weight="800" font-family="IBM Plex Mono, monospace">5′ PO₄</text>';

        // Bottom covalent backbone segments where adjacent slots are filled
        for (let i = 0; i < 7; i++) {
          if (repState.answers[i] && repState.answers[i + 1]) {
            const x1 = 104 + i * 78;
            const x2 = 104 + (i + 1) * 78;
            svg += '<line x1="' + x1 + '" y1="206" x2="' + x2 + '" y2="206" stroke="' + (isRna ? "#c084fc" : "#fbbf24") + '" stroke-width="4" stroke-linecap="round" />';
          }
        }

        // Draw 8 columns
        repState.template.forEach(function (tBase, i) {
          const cx = 104 + i * 78;
          const pBase = repState.answers[i];
          const diag = diagnosePair(tBase, pBase, repState.mode);
          const isSel = repState.selected === i;
          const isMut = i === preset.mutIndex;
          const tMeta = NUCLEOTIDE_DATA[tBase];
          const tLen = tMeta.isPurine ? 62 : 40;
          const tEnd = 68 + tLen;

          // Selection column highlight
          if (isSel) {
            svg += '<rect x="' + (cx - 34) + '" y="32" width="68" height="196" rx="10" fill="#ffffff" fill-opacity="0.07" stroke="#fde047" stroke-width="1.8" stroke-dasharray="4 3" />';
          } else if (isMut) {
            svg += '<rect x="' + (cx - 32) + '" y="34" width="64" height="192" rx="10" fill="#a855f7" fill-opacity="0.1" stroke="#c084fc" stroke-width="1.3" />';
          }

          // Top Phosphate & Sugar
          svg += '<circle cx="' + (cx - 24) + '" cy="50" r="8" fill="#1d4ed8" stroke="#93c5fd" stroke-width="1.5" />';
          svg += '<text x="' + (cx - 24) + '" y="53" text-anchor="middle" fill="#fff" font-size="8.5" font-weight="700">P</text>';
          svg += '<polygon points="' + cx + ',38 ' + (cx + 12) + ',50 ' + (cx + 8) + ',62 ' + (cx - 8) + ',62 ' + (cx - 12) + ',50" fill="#0f766e" stroke="#5eead4" stroke-width="1.5" />';
          svg += '<text x="' + cx + '" y="54" text-anchor="middle" fill="#fff" font-size="8.5" font-weight="700">S</text>';

          // Template base (2-ring purine longer than 1-ring pyrimidine)
          svg += '<rect x="' + (cx - 17) + '" y="68" width="34" height="' + tLen + '" rx="6" fill="' + tMeta.color + '" fill-opacity="0.34" stroke="' + tMeta.stroke + '" stroke-width="1.8" />';
          svg += '<text x="' + cx + '" y="' + (68 + tLen / 2 + 5) + '" text-anchor="middle" fill="#fff" font-size="14" font-weight="800" font-family="IBM Plex Mono, monospace">' + tBase + '</text>';

          // Partner nucleotide if placed
          if (pBase) {
            const pMeta = NUCLEOTIDE_DATA[pBase] || NUCLEOTIDE_DATA.T;
            const pLen = pMeta.isPurine ? 62 : 40;
            const pTop = 188 - pLen;
            const isWrong = diag.status !== "correct";
            const strokeCol = isWrong ? "#f87171" : pMeta.stroke;
            const fillCol = isWrong ? "#ef4444" : pMeta.color;

            // Hydrogen bonds or diagnostic alert
            if (diag.status === "correct") {
              if (repState.stage === 1) {
                svg += '<text x="' + cx + '" y="131" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="IBM Plex Mono, monospace">unzipped</text>';
              } else {
                const xs = diag.hBonds === 3 ? [cx - 8, cx, cx + 8] : [cx - 5, cx + 5];
                xs.forEach(function (hx) {
                  svg += '<line x1="' + hx + '" y1="' + (tEnd + 2) + '" x2="' + hx + '" y2="' + (pTop - 2) + '" stroke="#38bdf8" stroke-width="2.2" stroke-dasharray="3 2" />';
                });
              }
            } else if (diag.status === "clash") {
              svg += '<rect x="' + (cx - 26) + '" y="119" width="52" height="18" rx="4" fill="#991b1b" stroke="#fca5a5" stroke-width="1.2" />';
              svg += '<text x="' + cx + '" y="131.5" text-anchor="middle" fill="#fff" font-size="8.5" font-weight="800" font-family="IBM Plex Mono, monospace">CLASH!</text>';
            } else if (diag.status === "gap") {
              svg += '<line x1="' + cx + '" y1="' + (tEnd + 3) + '" x2="' + cx + '" y2="' + (pTop - 3) + '" stroke="#f87171" stroke-width="1.6" stroke-dasharray="2 3" />';
              svg += '<rect x="' + (cx - 24) + '" y="119" width="48" height="18" rx="4" fill="#991b1b" stroke="#fca5a5" stroke-width="1.2" />';
              svg += '<text x="' + cx + '" y="131.5" text-anchor="middle" fill="#fff" font-size="8.5" font-weight="800" font-family="IBM Plex Mono, monospace">GAP!</text>';
            } else {
              svg += '<line x1="' + (cx - 6) + '" y1="' + (tEnd + 3) + '" x2="' + (cx + 6) + '" y2="' + (pTop - 3) + '" stroke="#f87171" stroke-width="2" />';
              svg += '<line x1="' + (cx + 6) + '" y1="' + (tEnd + 3) + '" x2="' + (cx - 6) + '" y2="' + (pTop - 3) + '" stroke="#f87171" stroke-width="2" />';
              svg += '<text x="' + cx + '" y="118" text-anchor="middle" fill="#fca5a5" font-size="8" font-weight="800" font-family="IBM Plex Mono, monospace">BAD H</text>';
            }

            // Partner base shape
            svg += '<rect x="' + (cx - 17) + '" y="' + pTop + '" width="34" height="' + pLen + '" rx="6" fill="' + fillCol + '" fill-opacity="0.34" stroke="' + strokeCol + '" stroke-width="1.8" />';
            svg += '<text x="' + cx + '" y="' + (pTop + pLen / 2 + 5) + '" text-anchor="middle" fill="#fff" font-size="14" font-weight="800" font-family="IBM Plex Mono, monospace">' + pBase + '</text>';

            // Partner sugar (flipped) and phosphate
            svg += '<polygon points="' + cx + ',218 ' + (cx - 12) + ',206 ' + (cx - 8) + ',194 ' + (cx + 8) + ',194 ' + (cx + 12) + ',206" fill="' + (isRna ? "#7e22ce" : "#0f766e") + '" stroke="' + (isRna ? "#d8b4fe" : "#5eead4") + '" stroke-width="1.5" />';
            svg += '<text x="' + cx + '" y="209" text-anchor="middle" fill="#fff" font-size="8.5" font-weight="700">' + (isRna ? "R" : "S") + '</text>';
            svg += '<circle cx="' + (cx + 24) + '" cy="206" r="8" fill="#1d4ed8" stroke="#93c5fd" stroke-width="1.5" />';
            svg += '<text x="' + (cx + 24) + '" y="209" text-anchor="middle" fill="#fff" font-size="8.5" font-weight="700">P</text>';
          } else {
            // Empty slot guide
            svg += '<rect x="' + (cx - 17) + '" y="148" width="34" height="38" rx="6" fill="#0f172a" fill-opacity="0.55" stroke="' + (isSel ? "#fde047" : "#64748b") + '" stroke-width="1.5" stroke-dasharray="4 3" />';
            svg += '<text x="' + cx + '" y="172" text-anchor="middle" fill="' + (isSel ? "#fde047" : "#94a3b8") + '" font-size="14" font-weight="800" font-family="IBM Plex Mono, monospace">?</text>';
          }

          // Clickable column hit zone
          svg += '<rect class="rep-svg-hit" data-rung-index="' + i + '" x="' + (cx - 35) + '" y="32" width="70" height="196" fill="transparent" tabindex="0" role="button" aria-label="Select rung ' + (i + 1) + ', template ' + tBase + ', partner ' + (pBase || "empty") + '" />';
        });

        // Codon brackets along bottom
        const c1 = translateTriplet(repState.template[0], repState.template[1], repState.template[2]);
        const c2 = translateTriplet(repState.template[3], repState.template[4], repState.template[5]);
        svg += '<path d="M 74 234 L 74 242 L 290 242 L 290 234" fill="none" stroke="#64748b" stroke-width="1.5" />';
        svg += '<text x="182" y="258" text-anchor="middle" fill="#cbd5e1" font-size="10.5" font-weight="700" font-family="IBM Plex Mono, monospace">Codon 1 (1–3): ' + repState.template.slice(0, 3).join("") + ' → ' + c1.rna + ' (' + c1.aa + ')</text>';

        svg += '<path d="M 308 234 L 308 242 L 524 242 L 524 234" fill="none" stroke="' + (preset.mutIndex >= 3 && preset.mutIndex <= 5 ? "#c084fc" : "#64748b") + '" stroke-width="1.5" />';
        svg += '<text x="416" y="258" text-anchor="middle" fill="' + (preset.mutIndex >= 3 && preset.mutIndex <= 5 ? "#e9d5ff" : "#cbd5e1") + '" font-size="10.5" font-weight="700" font-family="IBM Plex Mono, monospace">Codon 2 (4–6): ' + repState.template.slice(3, 6).join("") + ' → ' + c2.rna + ' (' + c2.aa + ')</text>';

        repHelixSvg.innerHTML = svg;

        repHelixSvg.querySelectorAll(".rep-svg-hit").forEach(function (hit) {
          hit.addEventListener("click", function () {
            repState.selected = parseInt(hit.dataset.rungIndex, 10);
            renderReplicationLab();
          });
          hit.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              repState.selected = parseInt(hit.dataset.rungIndex, 10);
              renderReplicationLab();
            }
          });
        });
      }

      function renderReplicationTelemetry() {
        let matched = 0;
        let filled = 0;
        let actualHBonds = 0;
        let expectedHBonds = 0;
        let hasError = false;

        repState.template.forEach(function (tBase, i) {
          const ans = repState.answers[i];
          const expH = (tBase === "C" || tBase === "G") ? 3 : 2;
          expectedHBonds += expH;
          if (ans) {
            filled++;
            const diag = diagnosePair(tBase, ans, repState.mode);
            if (diag.status === "correct") {
              matched++;
              actualHBonds += diag.hBonds;
            } else {
              hasError = true;
            }
          }
        });

        if (repPairProgress) repPairProgress.textContent = filled + " / 8 bases paired";
        if (repStatPairs) repStatPairs.textContent = matched + " / 8";
        if (repStatNucleotides) repStatNucleotides.textContent = (8 + filled) + " / 16";
        if (repStatHbonds) repStatHbonds.textContent = actualHBonds + " / " + expectedHBonds;
        if (repStatWidth) {
          repStatWidth.textContent = hasError ? "Distorted" : (filled === 8 ? "2.0 nm Uniform" : "Incomplete");
          repStatWidth.dataset.state = hasError ? "error" : (filled === 8 ? "good" : "pending");
        }

        // Chargaff's Parity & Thermal Stability
        if (repChargaffBars && repChargaffParity && repChargaffNote) {
          const isRna = repState.mode === "rna";
          const counts = { A: 0, T: 0, U: 0, C: 0, G: 0 };
          repState.template.forEach(function (b) { counts[b]++; });
          repState.answers.forEach(function (b) { if (b) counts[b]++; });

          const totalBases = 8 + filled;
          const keys = isRna ? ["A", "T", "U", "C", "G"] : ["A", "T", "C", "G"];
          repChargaffParity.textContent = keys.map(function (k) { return k + "=" + counts[k]; }).join(" · ");

          repChargaffBars.innerHTML = keys.map(function (k) {
            const pct = totalBases ? Math.round((counts[k] / totalBases) * 100) : 0;
            const barClass = "rep-ch-fill rep-ch-" + k.toLowerCase();
            return '<div class="rep-ch-row">' +
              '<span class="rep-ch-lbl">' + k + '</span>' +
              '<div class="rep-ch-track"><div class="' + barClass + '" style="width:' + pct + '%"></div></div>' +
              '<span class="rep-ch-pct">' + counts[k] + ' (' + pct + '%)</span>' +
              '</div>';
          }).join("");

          const purines = counts.A + counts.G;
          const pyrimidines = counts.T + counts.U + counts.C;
          const gcCount = counts.G + counts.C;
          const gcPct = totalBases ? Math.round((gcCount / totalBases) * 100) : 0;
          if (filled === 8 && !hasError && !isRna) {
            repChargaffNote.textContent = "Chargaff’s Rule verified: A (" + counts.A + ") = T (" + counts.T + ") and G (" + counts.G + ") = C (" + counts.C + "). Total Purines (" + purines + ") = Pyrimidines (" + pyrimidines + "). GC content: " + gcPct + "%.";
          } else {
            repChargaffNote.textContent = "Purines (A+G): " + purines + " · Pyrimidines (" + (isRna ? "T+U+C" : "T+C") + "): " + pyrimidines + " · GC content: " + gcPct + "%.";
          }
        }
      }

      function renderRungInspector() {
        if (!repInspHeading || !repInspChemistry || !repInspGeometry || !repInspCodon) return;
        const idx = repState.selected;
        const tBase = repState.template[idx];
        const ans = repState.answers[idx];
        const tMeta = NUCLEOTIDE_DATA[tBase];
        const diag = diagnosePair(tBase, ans, repState.mode);
        const preset = getCurrentPresetMeta();

        repInspHeading.textContent = "Rung #" + (idx + 1) + " · Template 5′-pos " + (idx + 1) + ": " + tBase + " (" + tMeta.baseName + ")";
        repInspChemistry.textContent = "Template nucleotide: 5′ Phosphate + Deoxyribose + " + tMeta.baseName + " (" + tMeta.ringClass + "). " +
          (ans ? "Partner slot holds " + ans + " (" + NUCLEOTIDE_DATA[ans].baseName + ", " + NUCLEOTIDE_DATA[ans].ringClass + ")." : "Partner slot is empty.");
        repInspGeometry.textContent = diag.summary;

        // Codon & allele context
        let codonInfo = "";
        if (idx < 3) {
          const c1 = translateTriplet(repState.template[0], repState.template[1], repState.template[2]);
          codonInfo = "<strong>Codon 1 (Pos 1–3):</strong> DNA <code>" + repState.template.slice(0, 3).join("") + "</code> → mRNA <code>" + c1.rna + "</code> (" + c1.aa + "). ";
        } else if (idx < 6) {
          const c2 = translateTriplet(repState.template[3], repState.template[4], repState.template[5]);
          codonInfo = "<strong>Codon 2 (Pos 4–6):</strong> DNA <code>" + repState.template.slice(3, 6).join("") + "</code> → mRNA <code>" + c2.rna + "</code> (" + c2.aa + "). ";
        } else {
          codonInfo = "<strong>Flanking Pair (Pos 7–8):</strong> Continues the reading frame downstream of Codon 2. ";
        }
        repInspCodon.innerHTML = codonInfo + "<span>" + preset.alleleNote + "</span>";
      }

      function renderReplicationLog() {
        if (!repLogBody || !repLogCount) return;
        repLogCount.textContent = repState.log.length + (repState.log.length === 1 ? " strand verified" : " strands verified");
        if (!repState.log.length) {
          repLogBody.innerHTML = '<tr><td colspan="5">Complete and check a strand above to log your molecular evidence.</td></tr>';
          return;
        }
        repLogBody.innerHTML = repState.log.map(function (entry) {
          return "<tr>" +
            "<td>" + entry.preset + "</td>" +
            "<td><code>5′-" + entry.template + "-3′</code></td>" +
            "<td><code>3′-" + entry.partner + "-5′</code></td>" +
            "<td>" + entry.hBonds + " H-bonds</td>" +
            "<td>" + entry.outcome + "</td>" +
            "</tr>";
        }).join("");
      }

      function renderReplicationLab() {
        if (!repTemplateRow || !repSlotRow || !repBaseBank) return;
        const preset = getCurrentPresetMeta();
        const isRna = repState.mode === "rna";

        if (repPresetTitle) repPresetTitle.textContent = preset.label + " (5′-" + repState.template.join("") + "-3′)";
        if (repPresetBadge) repPresetBadge.textContent = preset.badge;
        if (repPresetDesc) repPresetDesc.textContent = preset.desc;
        if (repNewStrandLabel) {
          repNewStrandLabel.textContent = isRna
            ? "Transcribed mRNA strand (3′ ← 5′ antiparallel)"
            : "New partner strand (3′ ← 5′ antiparallel)";
        }

        document.querySelectorAll("#rep-preset-group .rep-preset-btn").forEach(function (btn) {
          if (btn.id === "rep-random-btn") {
            const activeRand = repState.presetKey === "random";
            btn.classList.toggle("is-active", activeRand);
            btn.setAttribute("aria-pressed", String(activeRand));
            return;
          }
          const active = btn.dataset.preset === repState.presetKey;
          btn.classList.toggle("is-active", active);
          btn.setAttribute("aria-pressed", String(active));
        });

        document.querySelectorAll("#rep-mode-group .rep-mode-btn").forEach(function (btn) {
          const active = btn.dataset.mode === repState.mode;
          btn.classList.toggle("is-active", active);
          btn.setAttribute("aria-pressed", String(active));
        });

        document.querySelectorAll("#rep-phase-strip .rep-phase-btn").forEach(function (btn) {
          const active = parseInt(btn.dataset.repStage, 10) === repState.stage;
          btn.classList.toggle("is-active", active);
          btn.setAttribute("aria-pressed", String(active));
        });

        repTemplateRow.innerHTML = "";
        repSlotRow.innerHTML = "";
        repBaseBank.innerHTML = "";

        repState.template.forEach(function (base, index) {
          const meta = NUCLEOTIDE_DATA[base];
          const tile = document.createElement("button");
          tile.type = "button";
          tile.className = "rep-base" +
            (repState.selected === index ? " is-selected-col" : "") +
            (index === preset.mutIndex ? " is-mutation" : "");
          tile.innerHTML =
            '<span class="rep-tile-pos">' + (index + 1) + '</span>' +
            '<span class="rep-tile-letter">' + base + '</span>' +
            '<span class="rep-tile-ring">' + (meta.isPurine ? "2-ring" : "1-ring") + '</span>';
          tile.setAttribute("aria-label", "Template position " + (index + 1) + ": " + meta.baseName + " (" + meta.ringClass + ")");
          tile.addEventListener("click", function () {
            repState.selected = index;
            renderReplicationLab();
            repFeedback.textContent = "Inspecting rung " + (index + 1) + " (" + meta.baseName + "). Choose " + complementFor(base) + " to pair cleanly.";
          });
          repTemplateRow.appendChild(tile);
        });

        repState.answers.forEach(function (base, index) {
          const tBase = repState.template[index];
          const diag = diagnosePair(tBase, base, repState.mode);
          const slot = document.createElement("button");
          slot.type = "button";
          let statusClass = "";
          if (repState.checked || (repState.stage === 3 && base)) {
            statusClass = diag.status === "correct" ? " is-correct" : " is-wrong";
          }
          slot.className = "rep-slot" +
            (base ? " is-filled" : "") +
            (repState.selected === index ? " is-selected" : "") +
            statusClass;

          let subTag = "slot " + (index + 1);
          if (base) {
            if (diag.status === "correct") subTag = diag.hBonds + "H";
            else if (diag.status === "clash") subTag = "CLASH";
            else if (diag.status === "gap") subTag = "GAP";
            else subTag = "BAD H";
          }
          slot.innerHTML =
            '<span class="rep-tile-letter">' + (base || "?") + '</span>' +
            '<span class="rep-tile-ring">' + subTag + '</span>';
          slot.setAttribute("aria-label", "Complementary base slot " + (index + 1) + ": " + (base || "empty"));
          slot.addEventListener("click", function () {
            repState.selected = index;
            renderReplicationLab();
            repSlotRow.children[repState.selected].focus();
            repFeedback.textContent = "Slot " + (index + 1) + " selected. Choose the base that pairs with " + repState.template[index] + ".";
          });
          repSlotRow.appendChild(slot);
        });

        const bankBases = isRna ? ["A", "U", "C", "G"] : ["A", "T", "C", "G"];
        bankBases.forEach(function (base) {
          const meta = NUCLEOTIDE_DATA[base];
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "base-btn";
          btn.dataset.base = base;
          btn.innerHTML =
            '<span class="base-btn-letter">' + base + '</span>' +
            '<span class="base-btn-meta">' + meta.baseName + ' · ' + (meta.isPurine ? "Purine" : "Pyrimidine") + '</span>';
          btn.setAttribute("aria-label", "Place " + meta.baseName + " (" + base + ")");
          btn.addEventListener("click", function () {
            placeBaseInSelected(base);
            const targetBtn = Array.from(repBaseBank.children).find(function (b) { return b.dataset.base === base; });
            if (targetBtn) targetBtn.focus();
          });
          repBaseBank.appendChild(btn);
        });

        renderReplicationSVG();
        renderReplicationTelemetry();
        renderRungInspector();
      }

      function placeBaseInSelected(base) {
        const idx = repState.selected;
        const tBase = repState.template[idx];
        const diag = diagnosePair(tBase, base, repState.mode);
        repState.answers[idx] = base;
        repState.checked = false;
        const nextEmpty = repState.answers.indexOf("", idx + 1);
        const anyEmpty = repState.answers.indexOf("");
        repState.selected = nextEmpty !== -1 ? nextEmpty : (anyEmpty !== -1 ? anyEmpty : idx);
        renderReplicationLab();
        if (diag.status === "correct") {
          repFeedback.textContent = "Placed " + base + " opposite " + tBase + " (" + diag.hBonds + " H-bonds · 2.0 nm). Continue until every exposed base has a partner.";
        } else {
          repFeedback.textContent = "Placed " + base + " opposite " + tBase + " — watch the helix geometry warning! " + diag.summary;
        }
      }

      function selectPreset(presetKey, customTemplate) {
        repState.presetKey = presetKey;
        if (customTemplate) {
          repState.template = customTemplate;
        } else {
          const preset = REP_PRESETS[presetKey] || REP_PRESETS.starter;
          repState.template = preset.template.slice();
        }
        repState.answers = ["", "", "", "", "", "", "", ""];
        repState.selected = 0;
        repState.checked = false;
        repState.stage = 2;
        renderReplicationLab();
        repFeedback.textContent = "Loaded " + getCurrentPresetMeta().label + ". Pair each exposed template base using A–" + (repState.mode === "rna" ? "U" : "T") + " and C–G.";
      }

      function setSynthesisMode(mode) {
        if (mode !== "dna" && mode !== "rna") return;
        repState.mode = mode;
        repState.checked = false;
        repState.answers = repState.answers.map(function (b) {
          if (mode === "rna" && b === "T") return "U";
          if (mode === "dna" && b === "U") return "T";
          return b;
        });
        renderReplicationLab();
        repFeedback.textContent = mode === "rna"
          ? "Switched to mRNA Transcription mode: RNA polymerase places Uracil (U) opposite template Adenine (A)."
          : "Switched to DNA Replication mode: DNA polymerase places Thymine (T) opposite template Adenine (A).";
      }

      function stepPolymerase() {
        let idx = repState.selected;
        const expectedAtSelected = complementFor(repState.template[idx], repState.mode);
        if (repState.answers[idx] === expectedAtSelected) {
          const firstNeeding = repState.answers.findIndex(function (a, i) {
            return a !== complementFor(repState.template[i], repState.mode);
          });
          if (firstNeeding !== -1) idx = firstNeeding;
        }
        const tBase = repState.template[idx];
        const comp = complementFor(tBase, repState.mode);
        const hb = hBondsForPair(tBase, comp, repState.mode);
        repState.answers[idx] = comp;
        repState.checked = false;
        const nextEmpty = repState.answers.indexOf("", idx + 1);
        const anyEmpty = repState.answers.indexOf("");
        repState.selected = nextEmpty !== -1 ? nextEmpty : (anyEmpty !== -1 ? anyEmpty : idx);
        repState.stage = 2;
        renderReplicationLab();
        repFeedback.textContent = (repState.mode === "rna" ? "RNA" : "DNA") + " polymerase paired " + comp + " opposite " + tBase + " at position " + (idx + 1) + " (" + hb + " hydrogen bonds, 2.0 nm fit).";
      }

      function introduceMismatch() {
        const idx = repState.selected;
        const tBase = repState.template[idx];
        const comp = complementFor(tBase, repState.mode);
        const pool = repState.mode === "rna" ? ["A", "U", "C", "G"] : ["A", "T", "C", "G"];
        const wrongChoices = pool.filter(function (b) { return b !== comp; });
        const picked = wrongChoices[repState.mismatchCycle % wrongChoices.length];
        repState.mismatchCycle++;
        repState.answers[idx] = picked;
        repState.stage = 3;
        repState.checked = false;
        const diag = diagnosePair(tBase, picked, repState.mode);
        renderReplicationLab();
        repFeedback.textContent = "Simulated polymerase error at position " + (idx + 1) + " (" + tBase + "–" + picked + "): " + diag.summary + " Click Proofread & repair to fix it.";
      }

      function proofreadStrand() {
        let fixed = 0;
        repState.answers = repState.answers.map(function (ans, idx) {
          if (!ans) return "";
          const expected = complementFor(repState.template[idx], repState.mode);
          if (ans !== expected) {
            fixed++;
            return expected;
          }
          return ans;
        });
        repState.stage = 3;
        repState.checked = true;
        renderReplicationLab();
        if (fixed > 0) {
          repFeedback.textContent = "Exonuclease proofreading excised and repaired " + fixed + (fixed === 1 ? " mismatch" : " mismatches") + " back to uniform 2.0 nm Watson–Crick geometry.";
        } else if (repState.answers.every(function (a) { return a !== ""; })) {
          repFeedback.textContent = "Proofreading scan complete: 0 mismatches found across all 8 base pairs (uniform 2.0 nm helix).";
        } else {
          repFeedback.textContent = "No mismatches detected in placed bases. Fill the remaining blank slots or click Step polymerase (+1).";
        }
      }

      function checkReplicationLab() {
        let correct = 0;
        let totalH = 0;
        repState.answers.forEach(function (answer, index) {
          const expected = complementFor(repState.template[index], repState.mode);
          if (answer === expected) {
            correct++;
            totalH += hBondsForPair(repState.template[index], answer, repState.mode);
          }
        });
        repState.checked = true;
        if (correct === 8 && repState.mode === "dna" && repState.stage === 2) {
          repState.stage = 4;
        }
        renderReplicationLab();

        if (repState.answers.some(function (answer) { return answer === ""; })) {
          repFeedback.textContent = "Some slots are still blank. Fill all 8 bases, then check again.";
          return;
        }
        const expectedStrand = repState.template.map(function (b) { return complementFor(b, repState.mode); });
        const preset = getCurrentPresetMeta();
        repFeedback.textContent = correct + " of 8 bases follow the pairing rule. Correct strand: " + expectedStrand.join(" ") + ". (" + totalH + " H-bonds formed" + (correct === 8 ? " — uniform 2.0 nm fidelity!)" : " — inspect highlighted mismatches.)");

        const entry = {
          preset: preset.label + (repState.mode === "rna" ? " [mRNA]" : ""),
          template: repState.template.join(""),
          partner: repState.answers.join(""),
          hBonds: totalH,
          outcome: correct === 8 ? "8/8 exact · " + preset.badge : correct + "/8 paired · Repair needed"
        };
        const last = repState.log[0];
        if (!last || last.template !== entry.template || last.partner !== entry.partner || last.preset !== entry.preset) {
          repState.log.unshift(entry);
          renderReplicationLog();
        }
      }

      function resetReplicationLab() {
        repState.answers = ["", "", "", "", "", "", "", ""];
        repState.selected = 0;
        repState.checked = false;
        repState.stage = 2;
        renderReplicationLab();
        repFeedback.textContent = "Select a blank slot, then choose A, " + (repState.mode === "rna" ? "U" : "T") + ", C, or G.";
      }

      function initReplicationLab() {
        document.querySelectorAll("#rep-preset-group .rep-preset-btn").forEach(function (btn) {
          if (btn.id === "rep-random-btn") return;
          btn.addEventListener("click", function () {
            selectPreset(btn.dataset.preset);
          });
        });

        if (repRandomBtn) {
          repRandomBtn.addEventListener("click", function () {
            const bases = ["A", "T", "C", "G"];
            const rand = Array.from({ length: 8 }, function () {
              return bases[Math.floor(Math.random() * bases.length)];
            });
            selectPreset("random", rand);
          });
        }

        document.querySelectorAll("#rep-mode-group .rep-mode-btn").forEach(function (btn) {
          btn.addEventListener("click", function () {
            setSynthesisMode(btn.dataset.mode);
          });
        });

        document.querySelectorAll("#rep-phase-strip .rep-phase-btn").forEach(function (btn) {
          btn.addEventListener("click", function () {
            repState.stage = parseInt(btn.dataset.repStage, 10);
            renderReplicationLab();
            repFeedback.textContent = REP_STAGE_NOTES[repState.stage] || "";
          });
        });

        if (repCheckBtn) repCheckBtn.addEventListener("click", checkReplicationLab);
        if (repResetBtn) repResetBtn.addEventListener("click", resetReplicationLab);
        if (repStepBtn) repStepBtn.addEventListener("click", stepPolymerase);
        if (repMismatchBtn) repMismatchBtn.addEventListener("click", introduceMismatch);
        if (repProofreadBtn) repProofreadBtn.addEventListener("click", proofreadStrand);
        if (repClearLogBtn) {
          repClearLogBtn.addEventListener("click", function () {
            repState.log = [];
            renderReplicationLog();
          });
        }

        if (repBoard) {
          repBoard.addEventListener("keydown", function (e) {
            if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA")) return;
            const key = e.key.toUpperCase();
            const allowed = repState.mode === "rna" ? ["A", "U", "C", "G"] : ["A", "T", "C", "G"];
            if (allowed.indexOf(key) !== -1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
              e.preventDefault();
              placeBaseInSelected(key);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              repState.selected = (repState.selected + 1) % 8;
              renderReplicationLab();
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              repState.selected = (repState.selected + 7) % 8;
              renderReplicationLab();
            } else if (e.key === "Backspace" || e.key === "Delete") {
              e.preventDefault();
              repState.answers[repState.selected] = "";
              repState.checked = false;
              renderReplicationLab();
            }
          });
        }

        renderReplicationLab();
        renderReplicationLog();
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

      initNucleotideExplorer();
      initReplicationLab();
      updateLabForTrait("height");
    })();
