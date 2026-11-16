  (function () {

    // ── Section definitions ──────────────────────────────────────────────
    var SECTIONS = [
      {
        id: 0, name: "Numbers 1–10", rows: [0, 3], focus: [2, 10],
        color: "#ffffff",
        desc: "Binary numbers 1–10 topped-to-bottom above a Row 4 anchor bit—proving mathematics and how split-column 4-bit integers wrap."
      },
      {
        id: 1, name: "Atomic Numbers", rows: [4, 9], focus: [6, 10],
        color: "#cc44ff",
        desc: "Protons per atom: Hydrogen (1), Carbon (6), Nitrogen (7), Oxygen (8), and Phosphorus (15)—the five elements of DNA."
      },
      {
        id: 2, name: "DNA Nucleotides", rows: [10, 29], focus: [11, 7],
        color: "#22dd44",
        desc: "12 molecular blocks giving [H, C, N, O, P] counts for deoxyribose sugar, phosphate, adenine, thymine, cytosine, and guanine residues."
      },
      {
        id: 3, name: "DNA Double Helix", rows: [30, 46], focus: [32, 10],
        color: "#4488ff",
        desc: "Two helical sugar-phosphate strands wrap a 32-bit binary count of 4,294,441,822 (~4.29B)—the 1974 estimate of human genome base pairs."
      },
      {
        id: 4, name: "Human Figure", rows: [47, 54], focus: [48, 10],
        color: "#dd2222",
        desc: "Red human figure. Left: height 14 × λ ≈ 1.76 m. Right: Earth's 1974 population (4,292,853,750 in 32-bit binary)."
      },
      {
        id: 5, name: "Solar System", rows: [55, 59], focus: [56, 10],
        color: "#ffdd00",
        desc: "Sun and 9 worlds (1974 convention, including Pluto). Earth (Col 11) shifts upward directly under humanity to identify home."
      },
      {
        id: 6, name: "Arecibo Telescope", rows: [60, 72], focus: [61, 10],
        color: "#cc44ff",
        desc: "Curved 305 m dish and focal feed horn above binary 2,430 × λ (with blue width arrows) encoding the transmitter aperture."
      }
    ];

    // ── Canonical 73 × 23 = 1,679-bit Arecibo message (Nov 16, 1974) ─────
    var ROWS = [
      // Section 0: Numbers 1–10 (rows 0–3) + separator (row 4)
      "00000010101010000000000", // r0
      "00101000001010000000100", // r1
      "10001000100010010110010", // r2
      "10101010101010100100100", // r3 (bottom LSB anchor markers)
      "00000000000000000000000", // r4 (blank divider)
      // Section 1: Atomic Numbers H=1, C=6, N=7, O=8, P=15 (rows 5–9) + separator (row 10)
      "00000000000011000000000", // r5
      "00000000001101000000000", // r6
      "00000000001101000000000", // r7
      "00000000010101000000000", // r8
      "00000000011111000000000", // r9 (anchor row)
      "00000000000000000000000", // r10 (blank divider)
      // Section 2: Nucleotides & Sugar-Phosphate Backbone (rows 11–29)
      "11000011100011000011000", // r11: Deoxyribose | Adenine | Thymine | Deoxyribose
      "10000000000000110010000", // r12
      "11010001100011000011010", // r13
      "11111011111011111011111", // r14 (anchor row)
      "00000000000000000000000", // r15
      "00010000000000000000010", // r16: Phosphate | (blank) | Phosphate
      "00000000000000000000000", // r17
      "00001000000000000000001", // r18
      "11111000000000000011111", // r19 (anchor row)
      "00000000000000000000000", // r20
      "11000011000011100011000", // r21: Deoxyribose | Cytosine | Guanine | Deoxyribose
      "10000000100000000010000", // r22
      "11010000110001110011010", // r23
      "11111011111011111011111", // r24 (anchor row)
      "00000000000000000000000", // r25
      "00010000001100000000010", // r26: Phosphate + top of 4,294,441,822 spine (cols 10-11)
      "00000000001100000000000", // r27
      "00001000001100000000001", // r28
      "11111000001100000011111", // r29
      // Section 3: DNA Double Helix & Nucleotide Spine (rows 30–46)
      "00000000001100000000000", // r30
      "00100000000100000000100", // r31
      "00010000001100000001000", // r32
      "00001100001100000010000", // r33
      "00000011000100001100000", // r34
      "00000000001100110000000", // r35
      "00000011000100001100000", // r36
      "00001100001100000010000", // r37
      "00010000001000000001000", // r38
      "00100000001100000000100", // r39
      "01000000001100000000100", // r40
      "01000000000100000001000", // r41
      "00100000001000000010000", // r42 (col 10 = spine LSB marker)
      "00010000000000001100000", // r43
      "00001100000000110000000", // r44
      "00100011101011000000000", // r45 (height cap col 2 + helix + human head col 10)
      "00100000001000000000000", // r46 (height line + human neck/head)
      // Section 4: Human Figure, Height 14λ (left) & 1974 Population 4,292,853,750 (right) (rows 47–54)
      "00100000111110000000000", // r47
      "00100001011101001011011", // r48 (col 16 = population LSB anchor)
      "00000010011100100111111", // r49
      "10111000011100000110111", // r50 (cols 0-4 = height 14 = 1110₂ + marker)
      "00000000010100000111011", // r51
      "00100000010100000111111", // r52
      "00100000010100000110000", // r53
      "00100000110110000000000", // r54
      // Section 5: Solar System (rows 55–59)
      "00000000000000000000000", // r55 (blank divider)
      "00111000001000000000000", // r56 (Sun top + shifted Earth col 10)
      "00111010100010101010101", // r57 (Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto)
      "00111000000000101010100", // r58 (Sun bottom + giant planets)
      "00000000000000101000000", // r59 (Jupiter & Saturn lower pixels)
      // Section 6: Arecibo Telescope Dish & Aperture 2,430λ (rows 60–72)
      "00000000111110000000000", // r60
      "00000011111111100000000", // r61
      "00001110000000111000000", // r62
      "00011000000000001100000", // r63
      "00110100000000010110000", // r64
      "01100110000000110011000", // r65
      "01000101000001010001000", // r66
      "01000100100010010001000", // r67
      "00000100010100010000000", // r68
      "00000100001000010000000", // r69
      "00000100000000010000000", // r70
      "00000001001010000000000", // r71 (upper 6 bits of 2,430)
      "01111001111101001111000"  // r72 (blue arrows + lower 6 bits of 2,430 + anchor)
    ];

    var RAW = ROWS.join("");
    var NCOLS = 23;
    var NROWS = 73;

    function sectionForRow(r) {
      for (var i = 0; i < SECTIONS.length; i++) {
        if (r >= SECTIONS[i].rows[0] && r <= SECTIONS[i].rows[1]) return i;
      }
      return -1;
    }

    function sectionForCell(r, c) {
      if (r >= 26 && r <= 44 && (c === 10 || c === 11)) return 3;
      if (r >= 45 && r <= 46 && (c <= 5 || c === 10)) return 4;
      return sectionForRow(r);
    }

    // ── Canvas setup ─────────────────────────────────────────────────────
    var canvas = document.getElementById("areciboCanvas");
    var ctx = canvas.getContext("2d");
    var ZOOM_LEVELS = [5, 6, 8, 10, 12, 14];
    var zoomIdx = 0;
    var CELL = ZOOM_LEVELS[zoomIdx];
    var mirrored = false;
    var inspectedRC = { r: 0, c: 0 };

    function applyZoom() {
      CELL = ZOOM_LEVELS[zoomIdx];
      canvas.width  = NCOLS * CELL;
      canvas.height = NROWS * CELL;
      document.getElementById("zoomLabel").textContent = CELL + "×";
      document.getElementById("zoomOut").disabled = zoomIdx === 0;
      document.getElementById("zoomIn").disabled = zoomIdx === ZOOM_LEVELS.length - 1;
      draw();
    }

    window.setZoom = function(dir) {
      zoomIdx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, zoomIdx + dir));
      applyZoom();
    };

    var mode = "color";
    window.setMode = function(m) {
      mode = m;
      document.getElementById("btnColor").classList.toggle("am-btn--active", m === "color");
      document.getElementById("btnBW").classList.toggle("am-btn--active", m === "bw");
      document.getElementById("btnColor").setAttribute("aria-pressed", m === "color");
      document.getElementById("btnBW").setAttribute("aria-pressed", m === "bw");
      if (animating) return;
      draw();
    };

    window.toggleMirror = function() {
      mirrored = !mirrored;
      var btn = document.getElementById("btnMirror");
      btn.classList.toggle("am-btn--active", mirrored);
      btn.setAttribute("aria-pressed", String(mirrored));
      document.getElementById("gridDimLabel").textContent = mirrored ? "23 × 73 (Mirrored)" : "23 × 73";
      if (!animating) draw();
      inspectCell(inspectedRC.r, inspectedRC.c);
    };

    function pixelColor(r, c, bit) {
      if (!bit || bit === "0") return null;
      if (mode === "bw") return "#ffffff";

      // Human Head & Body (red)
      if ((r === 45 || r === 46) && c === 10) return "#dd2222";
      if (r >= 47 && r <= 54 && c >= 6 && c <= 14) return "#dd2222";
      // Human Height (left cols 0..5) & 1974 Population (right cols 15..22) (white)
      if (r >= 45 && r <= 54 && (c <= 5 || c >= 15)) return "#ffffff";
      // DNA Nucleotide Count Spine (white 32-bit binary across cols 10..11)
      if (r >= 26 && r <= 44 && (c === 10 || c === 11)) return "#ffffff";
      // Arecibo Telescope: aperture 2,430 (white), width arrows (blue), dish (purple)
      if (r >= 60 && r <= 72) {
        if (r >= 71 && c >= 7 && c <= 13) return "#ffffff";
        if (r === 72 && (c <= 4 || c >= 16)) return "#4488ff";
        return "#cc44ff";
      }

      var sid = sectionForRow(r);
      return sid >= 0 ? SECTIONS[sid].color : "#ffffff";
    }

    function draw(revealUpTo) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      var limit = (revealUpTo !== undefined) ? revealUpTo : NROWS * NCOLS;

      for (var r = 0; r < NROWS; r++) {
        var rowStr = ROWS[r] || "";
        for (var drawCol = 0; drawCol < NCOLS; drawCol++) {
          var c = mirrored ? (NCOLS - 1 - drawCol) : drawCol;
          var idx = r * NCOLS + c;
          if (idx >= limit) return;
          var bit = rowStr[c];
          var col = pixelColor(r, c, bit);
          if (col) {
            ctx.fillStyle = col;
            ctx.fillRect(drawCol * CELL, r * CELL, CELL - 1, CELL - 1);
          }
        }
      }

      if (inspectedRC && revealUpTo === undefined) {
        var dc = mirrored ? (NCOLS - 1 - inspectedRC.c) : inspectedRC.c;
        ctx.strokeStyle = "#a6f6df";
        ctx.lineWidth = 1;
        ctx.strokeRect(dc * CELL + 0.5, inspectedRC.r * CELL + 0.5, CELL - 1, CELL - 1);
      }
    }

    // ── Live Cell & Sub-Element Semantic Inspector ───────────────────────
    function describeCell(r, c, bit) {
      if (r === 4 || r === 10 || r === 15 || r === 20 || r === 25 || r === 55) {
        return {
          title: "Blank divider row separating message sections",
          sub: "Empty rows give an external decoder clear visual boundaries between conceptual blocks."
        };
      }
      if (r <= 3) {
        if (r === 3 && bit === "1") {
          return {
            title: "Number anchor bit (bottom LSB indicator for 1–10)",
            sub: "A mandatory 1 at the base of each number tells the receiver which edge marks the units column."
          };
        }
        var numMap = {
          0: "Number 1 (binary 1₂)", 2: "Number 2 (binary 10₂)", 4: "Number 3 (binary 11₂)",
          6: "Number 4 (binary 100₂)", 8: "Number 5 (binary 101₂)", 10: "Number 6 (binary 110₂)",
          12: "Number 7 (binary 111₂)",
          14: "Number 8 — low 3 bits (000₂) of 1000₂", 15: "Number 8 — overflow bit (2³ = 8)",
          17: "Number 9 — low 3 bits (001₂) of 1001₂", 18: "Number 9 — overflow bit (2³ = 8)",
          20: "Number 10 — low 3 bits (010₂) of 1010₂", 21: "Number 10 — overflow bit (2³ = 8)"
        };
        return {
          title: numMap[c] || "Spacer column between numbers 1–10",
          sub: "Values read vertically top-to-bottom from highest bit to lowest bit above Row 4."
        };
      }
      if (r >= 5 && r <= 9) {
        var elMap = {
          9: "Hydrogen (H · Atomic number 1 = 0001₂)",
          10: "Carbon (C · Atomic number 6 = 0110₂)",
          11: "Nitrogen (N · Atomic number 7 = 0111₂)",
          12: "Oxygen (O · Atomic number 8 = 1000₂)",
          13: "Phosphorus (P · Atomic number 15 = 1111₂)"
        };
        return {
          title: elMap[c] || "Empty margin beside atomic number table",
          sub: r === 9 ? "Row 10 anchor markers align directly below H, C, N, O, and P." : "Defines the element order [H, C, N, O, P] reused in Section 3's DNA formulas."
        };
      }
      if (r >= 26 && r <= 42 && (c === 10 || c === 11)) {
        return {
          title: "DNA nucleotide spine: 4,294,441,822 base pairs (32-bit binary)",
          sub: r === 42 ? "Row 43 col 11 serves as the LSB anchor bit below the 2-column 32-bit integer." : "1974 estimate of human DNA length (~4.29B bp); modern sequencing yields ~3.05–3.2B haploid bp."
        };
      }
      if (r >= 11 && r <= 29) {
        if ((r <= 14 || (r >= 21 && r <= 24)) && (c <= 4 || c >= 18)) {
          return {
            title: "Deoxyribose sugar residue: [7H, 5C, 0N, 1O, 0P]",
            sub: "Forms the alternating outer rails along both sides of the DNA ladder."
          };
        }
        if (((r >= 16 && r <= 19) || (r >= 26 && r <= 29)) && (c <= 4 || c >= 18)) {
          return {
            title: "Phosphate group residue (PO₄): [0H, 0C, 0N, 4O, 1P]",
            sub: "Links neighboring deoxyribose sugars cleanly down the two outer strands."
          };
        }
        if (r <= 14 && c >= 6 && c <= 10) return { title: "Adenine (A) base residue: [4H, 5C, 5N, 0O, 0P]", sub: "Purine base that pairs with Thymine (shown immediately to its right)." };
        if (r <= 14 && c >= 12 && c <= 16) return { title: "Thymine (T) base residue: [5H, 5C, 2N, 2O, 0P]", sub: "Pyrimidine base paired opposite Adenine." };
        if (r >= 21 && r <= 24 && c >= 6 && c <= 10) return { title: "Cytosine (C) base residue: [4H, 4C, 3N, 1O, 0P]", sub: "Pyrimidine base that pairs with Guanine (to its right)." };
        if (r >= 21 && r <= 24 && c >= 12 && c <= 16) return { title: "Guanine (G) base residue: [4H, 5C, 5N, 1O, 0P]", sub: "Purine base paired opposite Cytosine." };
        return {
          title: "DNA chemical formula grid margin",
          sub: "Twelve 5-column blocks represent nucleotides using the [H, C, N, O, P] key."
        };
      }
      if (r >= 30 && r <= 44) {
        return {
          title: "DNA double helix backbone strands",
          sub: "Two intertwined strands connect the phosphate rails above down toward the human head."
        };
      }
      if (r >= 45 && r <= 54) {
        if (c <= 4) {
          return {
            title: "Average human height: 14 × λ = 1110₂ × 12.6 cm = 1.764 m",
            sub: "Placed on the left side with a vertical bracket spanning from human head to feet."
          };
        }
        if (c >= 16) {
          return {
            title: "1974 Earth human population: 4,292,853,750 (32-bit binary)",
            sub: (r === 48 && c === 16) ? "LSB anchor marker at Row 49, Col 17 for the right-hand 6×6 population block." : "Note: Today's ~8.1B population overflows a 32-bit integer (max 4,294,967,295)."
          };
        }
        if ((r <= 46 && c === 10) || (r >= 47 && c >= 6 && c <= 14)) {
          return {
            title: "Human figure (head, arms, torso, legs & feet)",
            sub: "Positioned centered above Earth in the Solar System block below."
          };
        }
        return { title: "Blue DNA strand tip / separator near human figure", sub: "DNA double helix terminates just beside the top of the human figure." };
      }
      if (r >= 56 && r <= 59) {
        var solarMap = {
          2: "The Sun (left edge of 3×3 star block)", 3: "The Sun (center of 3×3 star block)", 4: "The Sun (right edge of 3×3 star block)",
          6: "Mercury (1 px inner planet)", 8: "Venus (1 px rocky planet)",
          10: "Earth (1 px, shifted upward directly beneath Humanity)",
          12: "Mars (1 px rocky planet)",
          14: "Jupiter (3 px gas giant)", 16: "Saturn (3 px ringed gas giant)",
          18: "Uranus (2 px ice giant)", 20: "Neptune (2 px ice giant)",
          22: "Pluto (1 px; counted as planet #9 in 1974, dwarf planet since 2006)"
        };
        return {
          title: solarMap[c] || "Interplanetary gap in Solar System map",
          sub: "Earth's upward shift visually names our home planet without any language."
        };
      }
      if (r >= 60 && r <= 72) {
        if (r >= 71 && c >= 7 && c <= 13) {
          return {
            title: "Arecibo dish width: 2,430 × λ (100101111110₂ × 12.6 cm ≈ 306 m)",
            sub: (r === 72 && c === 13) ? "Anchor bit 1 marking the LSB corner of aperture 2,430." : "Matches Arecibo's 305 m spherical reflector diameter in Puerto Rico."
          };
        }
        if (r === 72 && (c <= 4 || c >= 16)) {
          return {
            title: "Blue dimension brackets spanning full telescope aperture",
            sub: "Brackets on both margins link the numeric width 2,430λ to the schematic dish above."
          };
        }
        return {
          title: "Arecibo 305 m parabolic reflector dish & suspended focal feed",
          sub: "Lines converge at the suspended triangular feed platform that broadcast this message (collapsed Dec 1, 2020)."
        };
      }
      return { title: "Signal grid cell", sub: "" };
    }

    function inspectCell(r, c) {
      r = Math.max(0, Math.min(NROWS - 1, r));
      c = Math.max(0, Math.min(NCOLS - 1, c));
      inspectedRC = { r: r, c: c };
      var bit = (ROWS[r] && ROWS[r][c]) || "0";
      var bitIdx = r * NCOLS + c;
      var info = describeCell(r, c, bit);

      document.getElementById("inspCoord").textContent =
        "Row " + (r + 1) + ", Col " + (c + 1) + " · Bit #" + bitIdx + " / 1678";
      var bitEl = document.getElementById("inspBit");
      bitEl.dataset.bit = bit;
      bitEl.textContent = bit === "1"
        ? "1 · 2,380.000005 MHz (+5 Hz)"
        : "0 · 2,379.999995 MHz (−5 Hz)";
      document.getElementById("inspDetail").textContent = info.title;
      document.getElementById("inspSub").textContent = info.sub;
    }

    // ── Animate decode ───────────────────────────────────────────────────
    var animating = false;
    var animFrame;
    window.animateDecode = function() {
      if (audioRunning) stopAudio();
      if (animating) {
        SimKit.frame.cancel("#areciboCanvas", animFrame);
        animating = false;
        document.getElementById("btnAnim").textContent = "▶ Decode";
        draw();
        return;
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { draw(); return; }
      animating = true;
      document.getElementById("btnAnim").textContent = "⏸ Decoding…";
      var total = NROWS * NCOLS;
      var current = 0;
      var speed = 12;

      function step() {
        current += speed;
        if (current >= total) {
          current = total;
          animating = false;
          document.getElementById("btnAnim").textContent = "▶ Decode";
        }
        draw(current);
        if (animating) animFrame = SimKit.frame("#areciboCanvas", step);
      }
      draw(0);
      animFrame = SimKit.frame("#areciboCanvas", step);
    };

    // ── FSK Two-Tone Web Audio Synthesizer ───────────────────────────────
    var audioCtx = null;
    var osc = null;
    var gainNode = null;
    var audioTimer = null;
    var audioRunning = false;
    var audioIdx = 0;

    function stopAudio() {
      audioRunning = false;
      if (audioTimer) { clearInterval(audioTimer); audioTimer = null; }
      if (gainNode && audioCtx) {
        gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.02);
      }
      if (osc) {
        try { osc.stop(audioCtx.currentTime + 0.05); } catch (e) {}
        osc = null;
      }
      var btn = document.getElementById("btnAudio");
      if (btn) {
        btn.classList.remove("am-btn--active");
        btn.setAttribute("aria-pressed", "false");
        btn.textContent = "🔊 Play FSK Tone";
      }
    }

    window.toggleAudio = function() {
      if (audioRunning) { stopAudio(); return; }
      if (animating) window.animateDecode();

      var AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) {
        document.getElementById("inspSub").textContent = "Web Audio API is unavailable in this browser.";
        return;
      }
      if (!audioCtx) audioCtx = new AudioCtor();
      if (audioCtx.state === "suspended") audioCtx.resume();

      osc = audioCtx.createOscillator();
      gainNode = audioCtx.createGain();
      osc.type = "sine";
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();

      audioRunning = true;
      audioIdx = 0;
      var btn = document.getElementById("btnAudio");
      btn.classList.add("am-btn--active");
      btn.setAttribute("aria-pressed", "true");

      function tick() {
        if (!audioRunning || audioIdx >= RAW.length) {
          stopAudio();
          draw();
          return;
        }
        var bit = RAW[audioIdx];
        // Exaggerated audible FSK pitch shift (660 Hz for 0, 880 Hz for 1) at authentic 10 bits/s cadence
        osc.frequency.setValueAtTime(bit === "1" ? 880 : 660, audioCtx.currentTime);
        var r = Math.floor(audioIdx / NCOLS);
        var c = audioIdx % NCOLS;
        inspectCell(r, c);
        highlightSection({ r: r, c: c });
        draw();
        btn.textContent = "⏹ Stop FSK (" + (audioIdx + 1) + "/1679)";
        audioIdx++;
      }

      tick();
      audioTimer = setInterval(tick, 100);
    };

    // ── Hover / click to identify section & cell ─────────────────────────
    function getRC(e) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width  / rect.width;
      var scaleY = canvas.height / rect.height;
      var x = (e.clientX - rect.left) * scaleX;
      var y = (e.clientY - rect.top)  * scaleY;
      var drawCol = Math.max(0, Math.min(NCOLS - 1, Math.floor(x / CELL)));
      var r = Math.max(0, Math.min(NROWS - 1, Math.floor(y / CELL)));
      var c = mirrored ? (NCOLS - 1 - drawCol) : drawCol;
      return { r: r, c: c };
    }

    var selectedSection = -1;
    function highlightSection(rc) {
      var sid = sectionForCell(rc.r, rc.c || 0);
      if (sid < 0 || sid === selectedSection) return;
      selectedSection = sid;
      document.querySelectorAll("[data-section-photo]").forEach(function(fig) {
        fig.hidden = +fig.dataset.sectionPhoto !== sid;
      });
      var sec = SECTIONS[sid];
      document.getElementById("sectionDot").style.background = sec.color;
      document.getElementById("sectionName").textContent = sec.name;
      document.getElementById("sectionDesc").textContent = sec.desc;
      document.getElementById("sectionBar").style.borderColor = sec.color + "55";
      document.querySelectorAll(".am-section-item").forEach(function(el) {
        el.classList.toggle("am--selected", +el.dataset.sid === sid);
        el.setAttribute("aria-pressed", +el.dataset.sid === sid);
        if (+el.dataset.sid === sid) el.style.setProperty("--sc", sec.color);
      });
    }

    canvas.addEventListener("mousemove", function(e) {
      if (animating) return;
      var rc = getRC(e);
      inspectCell(rc.r, rc.c);
      highlightSection(rc);
      draw();
    });
    canvas.addEventListener("click", function(e) {
      var rc = getRC(e);
      inspectCell(rc.r, rc.c);
      highlightSection(rc);
      draw();
    });

    // ── Build section selector buttons ───────────────────────────────────
    var list = document.getElementById("sectionList");
    SECTIONS.forEach(function(sec) {
      var div = document.createElement("button");
      div.type = "button";
      div.setAttribute("aria-pressed", "false");
      div.className = "am-section-item";
      div.dataset.sid = sec.id;
      div.setAttribute("aria-controls", "sectionBar");
      div.innerHTML =
        '<span class="am-section-number">0' + (sec.id + 1) + '</span><span class="am-swatch" data-color="' + sec.color + '"></span>' +
        '<div>' +
          '<div class="am-section-item-name">' + sec.name + '</div>' +
          '<div class="am-section-item-sub">Rows ' + (sec.rows[0] + 1) + '–' + (sec.rows[1] + 1) + '</div>' +
        '</div>';
      div.querySelector(".am-swatch").style.background = sec.color;
      div.addEventListener("click", function() {
        var r = sec.focus[0];
        var c = sec.focus[1];
        inspectCell(r, c);
        highlightSection({ r: r, c: c });
        draw();
      });
      list.appendChild(div);
    });

    // ── Exhibit 2: Semiprime Framing Lab (1,679 = cols × rows + rem) ──────
    var framingCanvas = document.getElementById("framingCanvas");
    var fCtx = framingCanvas.getContext("2d");
    var framingSlider = document.getElementById("framingSlider");

    function renderFraming(cols) {
      cols = Math.max(10, Math.min(80, cols));
      var fullRows = Math.floor(1679 / cols);
      var rem = 1679 % cols;
      var totalRows = Math.ceil(1679 / cols);
      var fCell = cols <= 25 ? 6 : cols <= 45 ? 4 : 3;

      framingCanvas.width = cols * fCell;
      framingCanvas.height = totalRows * fCell;
      fCtx.fillStyle = "#000000";
      fCtx.fillRect(0, 0, framingCanvas.width, framingCanvas.height);

      for (var i = 0; i < totalRows * cols; i++) {
        var fr = Math.floor(i / cols);
        var fc = i % cols;
        if (i >= 1679) {
          // Highlight unused padding slots at the bottom ragged tail
          fCtx.fillStyle = "#3a1b1b";
          fCtx.fillRect(fc * fCell, fr * fCell, fCell - 0.5, fCell - 0.5);
          continue;
        }
        if (RAW[i] === "1") {
          if (cols === 23) {
            fCtx.fillStyle = pixelColor(Math.floor(i / 23), i % 23, "1");
          } else {
            fCtx.fillStyle = cols === 73 ? "#9ecbff" : "#8ce8ca";
          }
          fCtx.fillRect(fc * fCell, fr * fCell, Math.max(1, fCell - 1), Math.max(1, fCell - 1));
        }
      }

      framingSlider.value = cols;
      document.getElementById("framingSliderVal").textContent = cols + " cols";
      document.getElementById("framingEq").textContent = "1,679 = " + cols + " × " + fullRows + " + " + rem;

      var statusEl = document.getElementById("framingStatus");
      var expEl = document.getElementById("framingExplain");
      statusEl.className = "am-status-pill";
      if (cols === 23) {
        statusEl.classList.add("am-status-pill--match");
        statusEl.textContent = "Exact prime factor · Portrait lock";
        expEl.innerHTML = "At <strong>23 columns × 73 rows</strong>, zero bits remain and all seven recognizable diagrams line up vertically.";
      } else if (cols === 73) {
        statusEl.classList.add("am-status-pill--alt");
        statusEl.textContent = "Exact prime factor · Scrambled slant";
        expEl.innerHTML = "<strong>73 × 23</strong> also gives zero remainder—because both are primes—but it slices across the intended 23-column features into unreadable diagonal bands.";
      } else {
        statusEl.classList.add("am-status-pill--ragged");
        statusEl.textContent = "Non-factor · " + rem + " leftover bits";
        expEl.innerHTML = "Every row shears by " + rem + " bits (or fails to tile), leaving a broken remainder row at the bottom. Only prime factors <strong>23</strong> and <strong>73</strong> tile cleanly.";
      }

      document.querySelectorAll("[data-cols]").forEach(function(btn) {
        btn.classList.toggle("am-btn--active", +btn.dataset.cols === cols);
      });
    }

    document.querySelectorAll("[data-cols]").forEach(function(btn) {
      btn.addEventListener("click", function() { renderFraming(+btn.dataset.cols); });
    });
    framingSlider.addEventListener("input", function() { renderFraming(+this.value); });

    // ── Exhibit 3: Decoding Workbench Tabs & Sub-Tools ───────────────────
    var wbTabs = Array.from(document.querySelectorAll(".am-wb-tab"));
    wbTabs.forEach(function(tab) {
      tab.addEventListener("click", function() {
        wbTabs.forEach(function(t) {
          var active = t === tab;
          t.setAttribute("aria-selected", String(active));
          document.getElementById(t.getAttribute("aria-controls")).hidden = !active;
        });
      });
      tab.addEventListener("keydown", function(e) {
        var idx = wbTabs.indexOf(tab);
        if (e.key === "ArrowRight") wbTabs[(idx + 1) % wbTabs.length].click();
        if (e.key === "ArrowLeft")  wbTabs[(idx - 1 + wbTabs.length) % wbTabs.length].click();
      });
    });

    var NUC_DATA = {
      deoxyribose: {
        title: "Deoxyribose Sugar Residue · [7 H, 5 C, 0 N, 1 O, 0 P]",
        counts: [7, 5, 0, 1, 0],
        note: "Appears 4 times on the outer rails (Rows 12–15 & 22–25). Polymer bonding removes 3 O and 3 H from free deoxyribose (C₅H₁₀O₄)."
      },
      phosphate: {
        title: "Phosphate Group · [0 H, 0 C, 0 N, 4 O, 1 P]",
        counts: [0, 0, 0, 4, 1],
        note: "Appears 4 times between deoxyribose sugars (Rows 17–20 & 27–30), carrying Phosphorus (Z=15) along the backbone."
      },
      adenine: {
        title: "Adenine (A) Base Residue · [4 H, 5 C, 5 N, 0 O, 0 P]",
        counts: [4, 5, 5, 0, 0],
        note: "Encoded in Row 12–15 cols 7–11. Forms two hydrogen bonds with Thymine opposite it in DNA."
      },
      thymine: {
        title: "Thymine (T) Base Residue · [5 H, 5 C, 2 N, 2 O, 0 P]",
        counts: [5, 5, 2, 2, 0],
        note: "Encoded in Row 12–15 cols 13–17 directly beside Adenine. Contains two Oxygen atoms absent in Adenine."
      },
      cytosine: {
        title: "Cytosine (C) Base Residue · [4 H, 4 C, 3 N, 1 O, 0 P]",
        counts: [4, 4, 3, 1, 0],
        note: "Encoded in Row 22–25 cols 7–11. Pairs via three hydrogen bonds with Guanine beside it."
      },
      guanine: {
        title: "Guanine (G) Base Residue · [4 H, 5 C, 5 N, 1 O, 0 P]",
        counts: [4, 5, 5, 1, 0],
        note: "Encoded in Row 22–25 cols 13–17. Adding one Oxygen atom distinguishes Guanine from Adenine."
      }
    };
    var EL_LABELS = ["H (Z=1)", "C (Z=6)", "N (Z=7)", "O (Z=8)", "P (Z=15)"];

    function renderNucleotide(key) {
      var item = NUC_DATA[key];
      if (!item) return;
      document.getElementById("nucTitle").textContent = item.title;
      document.getElementById("nucNote").textContent = item.note;
      var bars = document.getElementById("nucBars");
      bars.innerHTML = item.counts.map(function(cnt, idx) {
        var bin = ("000" + cnt.toString(2)).slice(-3);
        return (
          '<div class="am-chem-col">' +
            '<span class="am-chem-el">' + EL_LABELS[idx] + '</span>' +
            '<span class="am-chem-count">' + cnt + '</span>' +
            '<span class="am-chem-bin">' + bin + '₂</span>' +
          '</div>'
        );
      }).join("");
      document.querySelectorAll("[data-nuc]").forEach(function(b) {
        b.setAttribute("aria-pressed", String(b.dataset.nuc === key));
      });
    }
    document.querySelectorAll("[data-nuc]").forEach(function(btn) {
      btn.addEventListener("click", function() { renderNucleotide(btn.dataset.nuc); });
    });

    // Tab 3 Wavelength Ruler Calculator (λ = c / f = 299792458 / 2.38e9 ≈ 12.5963 cm)
    var LAMBDA_CM = 299792458 / 2380000000 * 100;
    var heightSlider = document.getElementById("heightCmSlider");
    function updateHeightRuler() {
      var cm = +heightSlider.value;
      var units = Math.round(cm / LAMBDA_CM);
      document.getElementById("heightCmLabel").textContent = cm + " cm (" + (cm / 100).toFixed(2) + " m)";
      document.getElementById("heightLambdaVal").textContent = units + " λ · " + units.toString(2) + "₂";
    }
    heightSlider.addEventListener("input", updateHeightRuler);

    // ── Exhibit 4: Live Flight Tracker (Nov 16, 1974 17:00 UTC) ──────────
    function updateFlightTracker() {
      var launchMs = Date.UTC(1974, 10, 16, 17, 0, 0);
      var yrMs = 365.2425 * 86400 * 1000;
      var ly = Math.max(0, (Date.now() - launchMs) / yrMs);
      var pct = (ly / 25000) * 100;
      var km = ly * 9.46073e12;
      var exp = Math.floor(Math.log10(km));
      var mant = km / Math.pow(10, exp);

      document.getElementById("trackerYears").textContent = ly.toFixed(2) + " ly";
      document.getElementById("trackerPct").textContent = pct.toFixed(3) + "%";
      document.getElementById("trackerKm").innerHTML = mant.toFixed(2) + " &times; 10<sup>" + exp + "</sup> km";
      document.getElementById("trackerFill").style.width = Math.max(2, Math.min(100, pct)).toFixed(2) + "%";
      document.getElementById("trackerMilestone").textContent =
        "Wavefront ~" + ly.toFixed(1) + " ly out · past Vega (~25 ly) & Pollux (~34 ly)";
    }

    // ── Exhibit 5: Self-Checking Concept Quiz ────────────────────────────
    var QUIZ_ANSWER = [0, 1, 0, 0];
    var QUIZ_NOTES = [
      "Correct! 1,679 = 23 × 73 (both prime), so only 23×73 and 73×23 tile evenly—eliminating dozens of misleading grid widths.",
      "Correct! FSK continuously shifted the 450 kW, 2,380 MHz beam by ±5 Hz (10 Hz separation) at 10 bits/sec.",
      "Correct! Multiplying binary 14 (1110₂) by λ = c / f ≈ 12.6 cm yields 1.764 m—an alien-readable physical length unit.",
      "Correct! Displacing the 3rd pixel upward directly below the human silhouette visually links humanity to Planet #3."
    ];
    var QUIZ_WRONG = [
      "Not quite—test 80 cols in Exhibit 2 above! 1,679's semiprime factorization (23 × 73) leaves zero ambiguity about rectangle geometry.",
      "Careful! Turning a 450 kW radar completely off creates thermal stress and loses phase lock—Arecibo used continuous Frequency-Shift Keying (±5 Hz).",
      "Check Exhibit 3 Tab 3: pixel dimensions differ on any screen, whereas λ = c / f ≈ 12.6 cm is an immutable constant embedded in the wave itself.",
      "Look at Row 57 Col 11: shifting Earth one pixel upward lines Planet 3 straight up beneath the red human figure."
    ];

    document.querySelectorAll(".am-quiz-q").forEach(function(qEl) {
      var qIdx = +qEl.dataset.q;
      var opts = qEl.querySelectorAll(".am-quiz-opt");
      var fb = qEl.querySelector(".am-quiz-feedback");
      opts.forEach(function(btn) {
        btn.addEventListener("click", function() {
          var chosen = +btn.dataset.idx;
          var ok = chosen === QUIZ_ANSWER[qIdx];
          opts.forEach(function(o) { o.classList.remove("is-correct", "is-wrong"); });
          btn.classList.add(ok ? "is-correct" : "is-wrong");
          fb.dataset.state = ok ? "ok" : "wrong";
          fb.textContent = ok ? QUIZ_NOTES[qIdx] : QUIZ_WRONG[qIdx];
        });
      });
    });

    // ── Init ─────────────────────────────────────────────────────────────
    applyZoom();
    highlightSection({ r: 0, c: 0 });
    inspectCell(0, 0);
    renderFraming(23);
    renderNucleotide("deoxyribose");
    updateHeightRuler();
    updateFlightTracker();

  })();
