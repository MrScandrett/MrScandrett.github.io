/*
 * Interactive controllers for lessons/physics/electricity-and-magnetism/what-is-electricity.html
 *
 * Modules:
 *  - Hero Atom & Ion Builder (+1 / 0 / -1)
 *  - Sticky section jump bar & sidebar outline scroll-spy
 *  - Section 1: Charge & Scale Explorer
 *  - Section 2: Dual-control Water Analogy (Voltage V + Resistance R) + Prediction check
 *  - Section 3: Material Conductivity Bench + Silicon excitation
 *  - Section 4: Stepped Static Charge / ESD + Triboelectric Series Matcher + Circuit Flow Lab
 *  - Section 5: Enhanced 10-era History Timeline + keyboard/pager navigation
 *  - Section 6: Interactive Power Plant to Wall Grid Stepper
 *  - Section 7: Try It Yourself age filter
 *  - Section 8: Guided Practice (with Hints toggle) & Quick Check Quiz (with score + reset)
 */
(function () {
  'use strict';

  function updatePressed(buttons, activeBtn) {
    buttons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn === activeBtn));
    });
  }

  /* ── 1. Hero Atom & Ion Builder ── */
  function initAtomBuilder() {
    var atom = document.querySelector('.we-atom');
    var readout = document.getElementById('we-atom-readout');
    var catBtn = document.getElementById('we-atom-btn-cat');
    var neuBtn = document.getElementById('we-atom-btn-neu');
    var anBtn = document.getElementById('we-atom-btn-an');
    if (!atom || !readout || !catBtn || !neuBtn || !anBtn) return;

    var states = {
      '+1': {
        btn: catBtn,
        text: 'Positive ion (+1 cation): 4 protons vs. 3 electrons — losing an outer valence electron leaves a net +1 charge.'
      },
      '0': {
        btn: neuBtn,
        text: 'Neutral atom (0 charge): 4 positive protons balance 4 negative electrons — overall electrical neutrality.'
      },
      '-1': {
        btn: anBtn,
        text: 'Negative ion (−1 anion): 4 protons vs. 5 electrons — capturing an extra valence electron gives a net −1 charge.'
      }
    };

    var allBtns = [catBtn, neuBtn, anBtn];

    function setCharge(charge) {
      var info = states[charge];
      if (!info) return;
      atom.dataset.charge = charge;
      updatePressed(allBtns, info.btn);
      readout.textContent = info.text;
    }

    catBtn.addEventListener('click', function () { setCharge('+1'); });
    neuBtn.addEventListener('click', function () { setCharge('0'); });
    anBtn.addEventListener('click', function () { setCharge('-1'); });
    setCharge('0');
  }

  /* ── 2. Jump Navigation & Scroll-Spy ── */
  function initJumpNav() {
    var jumpLinks = Array.prototype.slice.call(
      document.querySelectorAll('.we-jump-bar a[href^="#"]')
    );
    var outlineLinks = Array.prototype.slice.call(
      document.querySelectorAll('#sm-outline a[href^="#"]')
    );
    if (!jumpLinks.length && !outlineLinks.length) return;

    var sectionIds = [];
    jumpLinks.concat(outlineLinks).forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      if (id && sectionIds.indexOf(id) === -1 && document.getElementById(id)) {
        sectionIds.push(id);
      }
    });
    if (!sectionIds.length) return;

    var sections = sectionIds.map(function (id) {
      return document.getElementById(id);
    });

    function setActive(activeId) {
      jumpLinks.forEach(function (a) {
        var match = a.getAttribute('href') === '#' + activeId;
        a.classList.toggle('ll-step-active', match);
        if (match) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
      outlineLinks.forEach(function (a) {
        var match = a.getAttribute('href') === '#' + activeId;
        a.classList.toggle('is-active', match);
        if (match) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    }

    function onLinkClick(ev) {
      var href = ev.currentTarget.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      var target = document.getElementById(href.slice(1));
      if (!target) return;
      ev.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActive(target.id);
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', href);
      }
    }

    jumpLinks.concat(outlineLinks).forEach(function (a) {
      a.addEventListener('click', onLinkClick);
    });

    var simScroll = document.querySelector('.ll-sim');
    var ticking = false;

    function syncActiveFromScroll() {
      ticking = false;
      var refTop = 120;
      if (simScroll && simScroll.scrollHeight > simScroll.clientHeight + 20) {
        refTop = simScroll.getBoundingClientRect().top + 130;
      }
      var activeId = sections[0].id;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top <= refTop) {
          activeId = sections[i].id;
        }
      }
      setActive(activeId);
    }

    function requestSync() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(syncActiveFromScroll);
      }
    }

    window.addEventListener('scroll', requestSync, { passive: true });
    if (simScroll) simScroll.addEventListener('scroll', requestSync, { passive: true });
    syncActiveFromScroll();
  }

  /* ── 3. Section 1: Charge & Scale Explorer ── */
  function initScaleExplorer() {
    var presetWrap = document.getElementById('we-scale-presets');
    var elCoulombs = document.getElementById('we-scale-coulombs');
    var elElectrons = document.getElementById('we-scale-electrons');
    var elVoltage = document.getElementById('we-scale-voltage');
    var elEnergy = document.getElementById('we-scale-energy');
    var elNote = document.getElementById('we-scale-note');
    if (!presetWrap || !elCoulombs || !elElectrons || !elVoltage || !elEnergy || !elNote) return;

    var buttons = Array.prototype.slice.call(presetWrap.querySelectorAll('[data-scale]'));
    var scenarios = {
      led: {
        coulombs: '0.015 C/s (15 mA)',
        electrons: '~9.4 × 10¹⁶ e⁻/s',
        voltage: '3 V DC (coin cell)',
        energy: '0.045 W (45 mW)',
        note: 'A single red LED only needs a gentle 3 V push and 15 milliamps of current — yet nearly 100 quadrillion electrons pass through its semiconductor junction every second.'
      },
      usb: {
        coulombs: '3.0 C/s (3 A)',
        electrons: '~1.9 × 10¹⁹ e⁻/s',
        voltage: '9 V DC (USB-PD)',
        energy: '27 W (27 J/s)',
        note: 'USB-C fast charging raises voltage from 5 V to 9 V so 3 amps delivers 27 watts without overheating the thin charging cable.'
      },
      toaster: {
        coulombs: '10.0 C/s (10 A)',
        electrons: '~6.2 × 10¹⁹ e⁻/s',
        voltage: '120 V AC (wall)',
        energy: '1,200 W (1.2 kW)',
        note: 'High resistance nichrome ribbons resist electron motion, turning 1,200 joules of electrical energy per second directly into radiant heat.'
      },
      spark: {
        coulombs: '~0.000001 C (1 µC)',
        electrons: '~6.2 × 10¹² e⁻',
        voltage: '~10,000 V static',
        energy: '~0.005 J (5 mJ)',
        note: 'Voltage alone does not mean danger: a winter doorknob zap jumps at ~10,000 V, yet moves so few electrons (~1 microcoulomb) that total energy is tiny.'
      },
      lightning: {
        coulombs: '~15 C (15,000–30,000 A peak)',
        electrons: '~9.4 × 10¹⁹ e⁻',
        voltage: '~100,000,000 V',
        energy: '~1.5 × 10⁹ J (1.5 GJ)',
        note: 'A lightning strike pairs tremendous stormcloud voltage with roughly 15 coulombs of charge, heating air along its path to ~30,000 °C in milliseconds.'
      }
    };

    function selectScale(key) {
      var data = scenarios[key];
      if (!data) return;
      elCoulombs.textContent = data.coulombs;
      elElectrons.textContent = data.electrons;
      elVoltage.textContent = data.voltage;
      elEnergy.textContent = data.energy;
      elNote.textContent = data.note;
      buttons.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.dataset.scale === key));
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectScale(btn.dataset.scale);
      });
    });
    selectScale('led');
  }

  /* ── 4. Section 2: Dual-Control Water Analogy + Prediction Check ── */
  function initWaterAnalogy() {
    var towerSlider = document.getElementById('we-tower-slider');
    var waterSlider = document.getElementById('we-water-slider');
    var tankWater = document.getElementById('we-tank-water');
    var valveTop = document.getElementById('we-valve-top');
    var valveBottom = document.getElementById('we-valve-bottom');
    var wheelSpokes = document.getElementById('we-wheel-spokes');
    var levelLabel = document.getElementById('we-water-level-label');
    var outV = document.getElementById('we-water-v');
    var outR = document.getElementById('we-water-r');
    var outI = document.getElementById('we-water-i');
    var outP = document.getElementById('we-water-p');
    var caption = document.getElementById('we-water-caption');
    var drops = document.querySelectorAll('#we-water-demo .we-drop');
    if (!waterSlider || !valveTop || !valveBottom || !wheelSpokes || !levelLabel || !caption) return;

    var voltages = [3, 6, 12];
    var tankGeometry = [
      { y: 98, h: 30, label: '3 V (Low tank head)' },
      { y: 69, h: 59, label: '6 V (Medium tank head)' },
      { y: 38, h: 90, label: '12 V (High tank head)' }
    ];
    var resistances = [
      {
        ohms: 100,
        label: 'Wide Open (100 Ω)',
        topD: 'M110,14 L126,14 L126,23 L110,23 Z',
        bottomD: 'M110,37 L126,37 L126,46 L110,46 Z'
      },
      {
        ohms: 300,
        label: 'Half Closed (300 Ω)',
        topD: 'M110,14 L126,14 L126,26.8 L110,26.8 Z',
        bottomD: 'M110,33.2 L126,33.2 L126,46 L110,46 Z'
      },
      {
        ohms: 1200,
        label: 'Tightly Pinched (1,200 Ω)',
        topD: 'M110,14 L126,14 L126,28.7 L110,28.7 Z',
        bottomD: 'M110,31.3 L126,31.3 L126,46 L110,46 Z'
      }
    ];

    function formatCurrent(mA) {
      return mA >= 10 ? Math.round(mA) + ' mA' : mA.toFixed(1) + ' mA';
    }

    function formatPower(mW) {
      if (mW >= 1000) return (mW / 1000).toFixed(2) + ' W';
      return mW >= 10 ? Math.round(mW) + ' mW' : mW.toFixed(1) + ' mW';
    }

    function updateWater() {
      var vIdx = towerSlider ? Math.min(2, Math.max(0, parseInt(towerSlider.value, 10) || 0)) : 1;
      var rIdx = Math.min(2, Math.max(0, parseInt(waterSlider.value, 10) || 0));
      var V = voltages[vIdx];
      var tank = tankGeometry[vIdx];
      var res = resistances[rIdx];

      var mA = (V / res.ohms) * 1000;
      var mW = V * mA;

      if (tankWater) {
        tankWater.setAttribute('y', String(tank.y));
        tankWater.setAttribute('height', String(tank.h));
      }
      valveTop.setAttribute('d', res.topD);
      valveBottom.setAttribute('d', res.bottomD);

      // Map 2.5 mA .. 120 mA to clean animation durations between 4.8s and 0.6s.
      var norm = Math.sqrt(mA / 120);
      var dropDuration = Math.max(0.6, Math.min(4.8, 0.55 / Math.max(norm, 0.115)));
      var spinDuration = dropDuration * 0.95;

      wheelSpokes.style.animationDuration = spinDuration.toFixed(2) + 's';
      drops.forEach(function (drop, idx) {
        drop.style.animationDuration = dropDuration.toFixed(2) + 's';
        drop.style.animationDelay = (-idx * (dropDuration / 3)).toFixed(2) + 's';
      });

      var currentStr = formatCurrent(mA);
      var powerStr = formatPower(mW);
      levelLabel.textContent = res.label + ' · ' + V + ' V → ' + currentStr;
      if (outV) outV.textContent = V + ' V';
      if (outR) outR.textContent = res.ohms.toLocaleString() + ' Ω';
      if (outI) outI.textContent = currentStr;
      if (outP) outP.textContent = powerStr;

      caption.textContent =
        'With ' + V + ' V of pressure (' + tank.label + ') pushing against ' + res.ohms.toLocaleString() +
        ' Ω of pipe restriction, current is I = V / R = ' + currentStr + ' and the waterwheel does ' +
        powerStr + ' of work.';
    }

    if (towerSlider) towerSlider.addEventListener('input', updateWater);
    waterSlider.addEventListener('input', updateWater);
    updateWater();

    // Micro-prediction question
    var predictButtons = Array.prototype.slice.call(document.querySelectorAll('[data-water-predict]'));
    var predictFeedback = document.getElementById('we-water-predict-feedback');
    if (predictButtons.length && predictFeedback) {
      predictButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var choice = btn.dataset.waterPredict;
          updatePressed(predictButtons, btn);
          if (choice === 'doubles') {
            predictFeedback.className = 'we-predict-feedback is-ok';
            predictFeedback.textContent =
              'Spot on! Because I = V / R, doubling V (6 V → 12 V) at a fixed 300 Ω doubles the current from 20 mA to 40 mA. Try setting Tower = 12 V and Valve = 300 Ω above to verify!';
          } else {
            predictFeedback.className = 'we-predict-feedback is-err';
            predictFeedback.textContent =
              'Close — try testing it with the sliders above! Set Valve to 300 Ω and watch Current change as you slide Water Tower Pressure from 6 V to 12 V.';
          }
        });
      });
    }
  }

  /* ── 5. Section 3: Material Conductivity Bench ── */
  function initMaterialBench() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-mat]'));
    var exciteBtn = document.getElementById('we-silicon-excite');
    var svg = document.getElementById('we-mat-svg');
    var note = document.getElementById('we-mat-note');
    var currentReadout = document.getElementById('we-mat-current');
    var classReadout = document.getElementById('we-mat-class');
    if (!buttons.length || !svg || !note) return;

    var currentMat = 'copper';
    var siliconExcited = false;

    var materials = {
      copper: {
        name: 'Copper',
        kind: 'Conductor (Metal)',
        ampsText: '2,400 mA',
        glow: 1,
        bulbColor: '#fde047',
        carrierType: 'free-e',
        carrierCount: 9,
        note: 'Copper atoms loosely share outer valence electrons in a shared "sea of electrons." Even a tiny voltage sends huge numbers of electrons drifting immediately.'
      },
      graphite: {
        name: 'Graphite (Pencil Lead)',
        kind: 'Resistive Conductor (Carbon)',
        ampsText: '420 mA',
        glow: 0.45,
        bulbColor: '#facc15',
        carrierType: 'free-e',
        carrierCount: 4,
        note: 'Graphite has fewer mobile electrons per atom than copper and more atomic collisions, so the bulb glows dimmer and some electrical energy turns into heat.'
      },
      saltwater: {
        name: 'Saltwater (NaCl + H₂O)',
        kind: 'Ionic Conductor (Electrolyte)',
        ampsText: '185 mA',
        glow: 0.3,
        bulbColor: '#fef08a',
        carrierType: 'ions',
        carrierCount: 5,
        note: 'Pure water hardly conducts, but dissolved table salt splits into mobile Na⁺ and Cl⁻ ions! In liquids, whole charged atoms — not free metallic electrons — carry current.'
      },
      silicon: {
        name: 'Silicon Wafer',
        kind: 'Semiconductor',
        ampsText: '0.2 mA',
        glow: 0.04,
        bulbColor: '#94a3b8',
        carrierType: 'semi',
        carrierCount: 1,
        note: 'Pure silicon locks almost all electrons in crystal bonds at room temperature — practically an insulator until heat, light, or trace dopant atoms shake carriers free.'
      },
      wood: {
        name: 'Dry Wood',
        kind: 'Insulator',
        ampsText: '0.00 mA',
        glow: 0,
        bulbColor: '#64748b',
        carrierType: 'bound',
        carrierCount: 0,
        note: 'Dry wood’s cellulose molecules grip electrons tightly. With essentially zero free charge carriers at 6 V, the bulb stays completely dark (though wet wood conducts!).'
      },
      rubber: {
        name: 'Rubber Insulation',
        kind: 'Strong Insulator',
        ampsText: '0.00 mA',
        glow: 0,
        bulbColor: '#64748b',
        carrierType: 'bound',
        carrierCount: 0,
        note: 'Rubber polymers lock electrons in covalent bonds, keeping current inside copper wire jackets and safely out of your hands.'
      }
    };

    function buildCarrierMarkup(spec, excited) {
      var atoms = [
        [270, 56], [325, 56], [380, 56],
        [270, 112], [325, 112], [380, 112]
      ];
      var out = [];
      out.push('<rect x="235" y="18" width="185" height="130" rx="10" fill="#0f172a" stroke="#334155" stroke-width="1.4"/>');
      out.push('<text x="327" y="34" text-anchor="middle" font-size="9" font-weight="700" fill="#94a3b8">ATOMIC ZOOM: ' + spec.name.toUpperCase() + '</text>');

      if (spec.carrierType === 'ions') {
        var ions = [
          { x: 266, y: 66, q: 'Na⁺', fill: '#f97316' },
          { x: 318, y: 92, q: 'Cl⁻', fill: '#38bdf8' },
          { x: 365, y: 62, q: 'Cl⁻', fill: '#38bdf8' },
          { x: 282, y: 118, q: 'Cl⁻', fill: '#38bdf8' },
          { x: 356, y: 116, q: 'Na⁺', fill: '#f97316' }
        ];
        ions.forEach(function (ion) {
          out.push('<circle cx="' + ion.x + '" cy="' + ion.y + '" r="11" fill="' + ion.fill + '" opacity="0.9"/>');
          out.push('<text x="' + ion.x + '" y="' + (ion.y + 3.5) + '" text-anchor="middle" font-size="8.5" font-weight="800" fill="#0b1323">' + ion.q + '</text>');
        });
        out.push('<text x="327" y="141" text-anchor="middle" font-size="8" fill="#cbd5e1">Mobile + and − ions drift in opposite directions</text>');
        return out.join('');
      }

      atoms.forEach(function (pt) {
        out.push('<circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="10.5" fill="#1e293b" stroke="#64748b" stroke-width="1.3"/>');
        out.push('<text x="' + pt[0] + '" y="' + (pt[1] + 3) + '" text-anchor="middle" font-size="8" font-weight="700" fill="#cbd5e1">+</text>');
        if (spec.carrierType === 'bound' || (spec.carrierType === 'semi' && !excited)) {
          out.push('<circle cx="' + (pt[0] + 13) + '" cy="' + (pt[1] - 4) + '" r="3.5" fill="#94a3b8"/>');
        }
      });

      var freeCount = (spec.carrierType === 'semi' && excited) ? 6 : spec.carrierCount;
      var freeSpots = [
        [255, 84], [286, 80], [312, 86], [344, 82], [372, 86],
        [265, 134], [302, 134], [342, 134], [386, 134]
      ];
      for (var i = 0; i < freeCount && i < freeSpots.length; i++) {
        var fp = freeSpots[i];
        out.push('<circle cx="' + fp[0] + '" cy="' + fp[1] + '" r="4.2" fill="#38bdf8"/>');
        out.push('<line x1="' + (fp[0] + 6) + '" y1="' + fp[1] + '" x2="' + (fp[0] + 14) + '" y2="' + fp[1] + '" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>');
      }

      var captionText = freeCount > 0
        ? (freeCount >= 7 ? 'Dense sea of mobile electrons (−)' : 'Freed mobile electrons drifting under voltage')
        : 'Electrons locked tightly to parent atoms';
      out.push('<text x="327" y="141" text-anchor="middle" font-size="8" fill="#cbd5e1">' + captionText + '</text>');
      return out.join('');
    }

    function renderMaterial() {
      var base = materials[currentMat] || materials.copper;
      var isSiExcited = currentMat === 'silicon' && siliconExcited;
      var spec = isSiExcited ? {
        name: 'Silicon (Light / Heat / Doped)',
        kind: 'Excited Semiconductor',
        ampsText: '85 mA',
        glow: 0.38,
        bulbColor: '#fde047',
        carrierType: 'semi',
        carrierCount: 6,
        note: 'Excited Silicon! Adding light, heat, or impurity atoms ("doping") lifts electrons out of crystal bonds so current surges from 0.2 mA to 85 mA — the exact switch principle behind every microchip transistor.'
      } : base;

      buttons.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.dataset.mat === currentMat));
      });
      if (exciteBtn) {
        exciteBtn.setAttribute('aria-pressed', String(isSiExcited));
      }
      if (currentReadout) currentReadout.textContent = spec.ampsText;
      if (classReadout) classReadout.textContent = spec.kind;
      note.textContent = spec.note;

      var wireStroke = spec.glow > 0 ? '#38bdf8' : '#475569';
      var sampleColor = currentMat === 'copper' ? '#d97706'
        : currentMat === 'graphite' ? '#475569'
        : currentMat === 'saltwater' ? '#0284c7'
        : currentMat === 'silicon' ? (isSiExcited ? '#6366f1' : '#334155')
        : currentMat === 'wood' ? '#92400e'
        : '#1e293b';

      svg.innerHTML =
        '<rect x="0" y="0" width="440" height="165" fill="#0b1323"/>' +
        '<path d="M36,132 L36,36 L205,36 L205,132 L152,132" fill="none" stroke="' + wireStroke + '" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<path d="M90,132 L36,132" fill="none" stroke="' + wireStroke + '" stroke-width="4" stroke-linecap="round"/>' +
        /* Battery */
        '<line x1="22" y1="74" x2="50" y2="74" stroke="#22c55e" stroke-width="4" stroke-linecap="round"/>' +
        '<line x1="28" y1="84" x2="44" y2="84" stroke="#22c55e" stroke-width="3" stroke-linecap="round"/>' +
        '<text x="14" y="68" font-size="9" font-weight="800" fill="#86efac">6V</text>' +
        /* Sample bridge */
        '<rect x="90" y="121" width="62" height="22" rx="5" fill="' + sampleColor + '" stroke="#94a3b8" stroke-width="1.4"/>' +
        /* Keep the label on the dark bench, away from changing sample colors. */
        '<text x="121" y="156" text-anchor="middle" font-size="8" font-weight="800" fill="#f8fafc">' + (currentMat === 'saltwater' ? 'SALT H₂O' : currentMat.toUpperCase()) + ' SAMPLE</text>' +
        /* Test Bulb */
        '<circle cx="121" cy="36" r="24" fill="#fde047" opacity="' + (spec.glow * 0.42).toFixed(2) + '"/>' +
        '<circle cx="121" cy="36" r="13" fill="' + spec.bulbColor + '" stroke="#cbd5e1" stroke-width="1.8"/>' +
        '<path d="M116,40 L118,32 L121,37 L124,32 L126,40" fill="none" stroke="' + (spec.glow > 0.2 ? '#b45309' : '#334155') + '" stroke-width="1.5" stroke-linecap="round"/>' +
        /* Ammeter */
        '<rect x="167" y="64" width="60" height="36" rx="7" fill="#0f172a" stroke="#60a5fa" stroke-width="1.5"/>' +
        '<text x="197" y="77" text-anchor="middle" font-size="7.2" font-weight="700" fill="#94a3b8">AMMETER</text>' +
        '<text x="197" y="92" text-anchor="middle" font-size="10.5" font-weight="800" fill="#38bdf8">' + spec.ampsText + '</text>' +
        buildCarrierMarkup(spec, isSiExcited);
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentMat = btn.dataset.mat;
        if (currentMat !== 'silicon') siliconExcited = false;
        renderMaterial();
      });
    });

    if (exciteBtn) {
      exciteBtn.addEventListener('click', function () {
        if (currentMat !== 'silicon') {
          currentMat = 'silicon';
          siliconExcited = true;
        } else {
          siliconExcited = !siliconExcited;
        }
        renderMaterial();
      });
    }

    renderMaterial();
  }

  /* ── 6. Section 4: Static Charge (3D sync), Triboelectric Series & Current Flow ── */
  function initStaticAndCurrentLabs() {
    // 6a. Stepped Static Balloon + ESD Discharge
    var staticDemo = document.getElementById('we-static-demo');
    var staticBtn = document.getElementById('we-static-btn');
    var dischargeBtn = document.getElementById('we-static-discharge');
    var staticCap = document.getElementById('we-static-caption');
    if (staticDemo && staticBtn && staticCap) {
      var chargeStep = 0; // 0..3
      var captions = [
        'Balloon is electrically neutral — positive protons and negative electrons balance across both balloon and hair.',
        'Rub Level 1/3: Friction transfers a first wave of electrons onto the rubber balloon. Notice the closest hair strands start rising!',
        'Rub Level 2/3: Opposite charges pull strongly now — more strands lift and lean toward the negatively charged balloon.',
        'Rub Level 3/3 (Max): The balloon carries a strong negative charge, standing up every nearby hair strand! Touch the doorknob to discharge a spark.'
      ];
      var btnLabels = [
        'Rub Balloon on Hair (Step 1/3)',
        'Rub Again (Step 2/3)',
        'Rub Again (Step 3/3)',
        'Reset Balloon to Neutral'
      ];

      function syncStaticUI(customText) {
        var norm = chargeStep / 3;
        staticDemo.dataset.chargeLevel = norm.toFixed(2);
        staticDemo.classList.toggle('is-charged', chargeStep > 0);
        staticBtn.textContent = btnLabels[chargeStep];
        staticBtn.setAttribute('aria-pressed', String(chargeStep > 0));
        if (dischargeBtn) dischargeBtn.disabled = chargeStep === 0;
        staticCap.textContent = customText || captions[chargeStep];
      }

      staticBtn.addEventListener('click', function () {
        chargeStep = (chargeStep + 1) % 4;
        syncStaticUI();
      });

      if (dischargeBtn) {
        dischargeBtn.addEventListener('click', function () {
          if (chargeStep === 0) return;
          staticDemo.dataset.spark = 'true';
          chargeStep = 0;
          syncStaticUI(
            'Zap! Excess electrons leaped to the grounded metal knob in a tiny electrostatic discharge (ESD) spark, neutralizing the balloon and dropping the hair.'
          );
        });
      }

      syncStaticUI();
    }

    // 6b. Triboelectric Series Matcher
    var selA = document.getElementById('we-tribo-a');
    var selB = document.getElementById('we-tribo-b');
    var triboOut = document.getElementById('we-tribo-result');
    if (selA && selB && triboOut) {
      var series = {
        hair:    { label: 'Human Hair',    rank: 5 },
        glass:   { label: 'Glass',         rank: 4 },
        nylon:   { label: 'Nylon',         rank: 3 },
        wool:    { label: 'Wool Sweater',  rank: 2 },
        silk:    { label: 'Silk',          rank: 1 },
        paper:   { label: 'Paper',         rank: 0 },
        cotton:  { label: 'Cotton',        rank: -1 },
        wood:    { label: 'Dry Wood',      rank: -2 },
        rubber:  { label: 'Rubber Balloon',rank: -4 },
        pvc:     { label: 'PVC Pipe',      rank: -5 }
      };

      function updateTribo() {
        var a = series[selA.value];
        var b = series[selB.value];
        if (!a || !b) return;
        var diff = a.rank - b.rank;
        if (diff === 0) {
          triboOut.textContent =
            a.label + ' rubbed on ' + b.label + ': No net electron transfer — identical materials pull on their outer electrons with the same strength.';
          return;
        }
        var donor = diff > 0 ? a : b;
        var receiver = diff > 0 ? b : a;
        var gap = Math.abs(diff);
        var strength = gap >= 7 ? 'Very strong' : gap >= 4 ? 'Strong' : gap >= 2 ? 'Moderate' : 'Gentle';
        triboOut.textContent =
          strength + ' charge transfer (series gap ' + gap + '): ' +
          receiver.label + ' pulls electrons OFF ' + donor.label +
          ' — leaving ' + receiver.label + ' NEGATIVELY (−) charged and ' +
          donor.label + ' POSITIVELY (+) charged.';
      }

      selA.addEventListener('change', updateTribo);
      selB.addEventListener('change', updateTribo);
      updateTribo();
    }

    // 6c. Current Flow Lab (Switch + Flow Convention + Load Mode)
    var circuit = document.getElementById('we-circuit-demo');
    var circuitBtn = document.getElementById('we-circuit-btn');
    var circuitCap = document.getElementById('we-circuit-caption');
    var flowBtns = Array.prototype.slice.call(document.querySelectorAll('[data-flow-dir]'));
    var loadBtns = Array.prototype.slice.call(document.querySelectorAll('[data-load-mode]'));
    if (circuit && circuitBtn && circuitCap) {
      var flowDir = 'electrons';
      var loadCount = '1';

      function updateCircuitCaption() {
        var on = circuit.classList.contains('is-on');
        circuitBtn.setAttribute('aria-pressed', String(on));
        circuitBtn.textContent = on ? 'Open Switch (Turn Off)' : 'Close Switch (Turn On)';
        if (!on) {
          circuitCap.textContent =
            'Open circuit — air in the switch gap blocks the loop, so no net current flows through ' +
            (loadCount === '2' ? 'either bulb.' : 'the bulb.');
          return;
        }
        var dirDesc = flowDir === 'electrons'
          ? 'Showing physical Electron Flow (blue dots): negative electrons push out of the − terminal around the closed loop back to +.'
          : 'Showing Conventional Current (orange dots): by Benjamin Franklin’s historical + to − convention, positive arrows trace the opposite direction — engineers still mark schematics this way.';
        var loadDesc = loadCount === '2'
          ? ' With 2 bulbs in series, total resistance doubles, so current is cut in half and both bulbs glow dimmer.'
          : ' With 1 bulb in the loop, full battery voltage drives bright current around the circuit.';
        circuitCap.textContent = dirDesc + loadDesc;
      }

      circuitBtn.addEventListener('click', function () {
        circuit.classList.toggle('is-on');
        updateCircuitCaption();
      });

      flowBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          flowDir = btn.dataset.flowDir === 'conventional' ? 'conventional' : 'electrons';
          circuit.dataset.flowDir = flowDir;
          updatePressed(flowBtns, btn);
          updateCircuitCaption();
        });
      });

      loadBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          loadCount = btn.dataset.loadMode === '2' ? '2' : '1';
          circuit.classList.toggle('is-two-bulbs', loadCount === '2');
          updatePressed(loadBtns, btn);
          updateCircuitCaption();
        });
      });

      updateCircuitCaption();
    }
  }

  /* ── 7. Section 5: History Timeline ── */
  function initTimeline() {
    var nav = document.getElementById('we-timeline-nav');
    var panel = document.getElementById('we-timeline-panel');
    var prevBtn = document.getElementById('we-timeline-prev');
    var nextBtn = document.getElementById('we-timeline-next');
    var countEl = document.getElementById('we-timeline-count');
    var btns = Array.prototype.slice.call(document.querySelectorAll('.we-timeline-btn[data-era]'));
    if (!panel || !btns.length) return;

    var eras = [
      {
        tag: '600 BCE · Electrostatics Observed',
        title: '~600 BCE — Thales & Amber’s Mystery',
        body: 'Ancient Greek thinkers noticed that rubbing fossilized tree resin — called elektron in Greek — made it pick up feathers and bits of straw. For over two thousand years, nobody knew why; it was treated as a curious parlor trick alongside magnetic stones.',
        takeaway: 'Gave electricity its name: the Greek word for amber, "elektron."'
      },
      {
        tag: '1600 · First Systematic Science',
        title: '1600 — William Gilbert Coins "Electricus"',
        body: 'Queen Elizabeth I’s physician William Gilbert tested dozens of materials carefully and separated magnetic pull from electrostatic attraction, naming the amber-like effect electricus — giving us the English word electricity.',
        takeaway: 'Separated magnetism and static electricity as distinct, testable phenomena.'
      },
      {
        tag: '1745 · Storing Charge',
        title: '1745 — The Leyden Jar',
        body: 'Ewald Georg von Kleist and Pieter van Musschenbroek independently built glass jars lined with metal foil inside and out that could store static charge for later release. It was humanity’s first capacitor — and it delivered memorable shocks across Europe.',
        takeaway: 'Proved electric charge could be captured, stored, and discharged on command.'
      },
      {
        tag: '1752 · Unifying Lightning & Spark',
        title: '1752 — Benjamin Franklin’s Kite',
        body: 'Franklin proved that sky lightning and static sparks in a laboratory jar were the exact same force of nature. He coined the terms "positive," "negative," "charge," and "battery," and invented the lightning rod — though his sign guess stuck us with backward conventional current arrows.',
        takeaway: 'Showed atmospheric lightning and tabletop sparks obey the same laws of charge.'
      },
      {
        tag: '1800 · Continuous Current Born',
        title: '1800 — Alessandro Volta’s Battery',
        body: 'Inspired by Luigi Galvani’s twitching frog-leg experiments, Alessandro Volta stacked alternating discs of zinc and copper separated by brine-soaked cloth. For the first time, humans had a steady stream of electric current instead of a single brief static pop.',
        takeaway: 'Enabled steady current circuits — earning Volta’s name on the Volt (V).'
      },
      {
        tag: '1820 · Electricity & Magnetism Link',
        title: '1820 — Hans Christian Ørsted’s Compass',
        body: 'During a university lecture, Ørsted switched on a battery wire near a magnetic compass — and watched the needle snap sideways. Electricity and magnetism were not separate worlds after all, but two faces of electromagnetism.',
        takeaway: 'Revealed that moving electric charge always creates a magnetic field.'
      },
      {
        tag: '1831 · Generating Bulk Power',
        title: '1831 — Michael Faraday Discovers Induction',
        body: 'If electric current can move a magnet, Faraday reasoned, moving a magnet should push an electric current. He plunged a magnet through a coil of wire and saw his meter jump. Every wind turbine, hydro dam, and power plant generator uses Faraday’s principle today.',
        takeaway: 'Unlocked generators and transformers — the core of modern power grids.'
      },
      {
        tag: '1879 · Direct Current Lighting',
        title: '1879 — Edison’s Electric Light & DC Systems',
        body: 'Thomas Edison and his Menlo Park team engineered durable carbon-filament bulbs and built the first commercial power station (Pearl Street, 1882) to wire city streets and homes together in parallel.',
        takeaway: 'Turned electricity from a lab curiosity into an everyday household utility.'
      },
      {
        tag: '1880s–90s · Long-Distance Power Grid',
        title: '1880s–90s — Tesla, Westinghouse & AC Triumph',
        body: 'Nikola Tesla’s polyphase alternating current (AC) system, backed by George Westinghouse, solved Edison’s distance problem: transformers stepped AC voltage up to tens of thousands of volts for low-loss cross-country lines, then stepped it safely back down for neighborhoods.',
        takeaway: 'AC plus transformers made city-to-city electrical grids practical.'
      },
      {
        tag: '1947–Today · The Digital & Clean Energy Era',
        title: '1947–Today — Transistors & Clean Electricity',
        body: 'At Bell Labs in 1947, Bardeen, Brattain, and Shockley invented the solid-state transistor — a tiny semiconductor valve turning current on and off billions of times a second. Today billions of transistors sit on every phone chip while solar, wind, and grids decarbonize electricity.',
        takeaway: 'Shrank electric control down to nanometer switches powering the digital age.'
      }
    ];

    var currentIndex = 0;

    function selectEra(idx) {
      var eraIdx = Math.max(0, Math.min(eras.length - 1, idx));
      currentIndex = eraIdx;
      var era = eras[eraIdx];

      btns.forEach(function (btn) {
        btn.setAttribute('aria-selected', String(parseInt(btn.dataset.era, 10) === eraIdx));
      });

      panel.innerHTML =
        '<span class="we-era-tag">' + era.tag + '</span>' +
        '<h3>' + era.title + '</h3>' +
        '<p>' + era.body + '</p>' +
        '<p class="we-era-takeaway"><strong>Key breakthrough:</strong> ' + era.takeaway + '</p>';

      if (countEl) countEl.textContent = (eraIdx + 1) + ' / ' + eras.length;
      if (prevBtn) prevBtn.disabled = eraIdx === 0;
      if (nextBtn) nextBtn.disabled = eraIdx === eras.length - 1;
    }

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectEra(parseInt(btn.dataset.era, 10));
      });
    });

    if (prevBtn) prevBtn.addEventListener('click', function () { selectEra(currentIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { selectEra(currentIndex + 1); });

    if (nav) {
      nav.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowRight') {
          ev.preventDefault();
          selectEra(currentIndex + 1);
          if (btns[currentIndex]) btns[currentIndex].focus();
        } else if (ev.key === 'ArrowLeft') {
          ev.preventDefault();
          selectEra(currentIndex - 1);
          if (btns[currentIndex]) btns[currentIndex].focus();
        }
      });
    }

    selectEra(0);
  }

  /* ── 8. Section 6: Interactive Power Plant to Wall Grid Stepper ── */
  function initGridStepper() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('#we-grid-svg .we-grid-node[data-grid-stage]'));
    var cards = Array.prototype.slice.call(document.querySelectorAll('.we-grid-stage[data-grid-stage]'));
    var outV = document.getElementById('we-grid-voltage');
    var outT = document.getElementById('we-grid-type');
    var outP = document.getElementById('we-grid-purpose');
    if (!nodes.length || !cards.length || !outV || !outT || !outP) return;

    var stages = [
      {
        voltage: '13.8–24 kV AC',
        type: 'Generation (3-phase 60 Hz)',
        purpose: 'Turbines spin copper coils past strong electromagnets (Faraday induction) to push electrons back and forth 60 times every second.'
      },
      {
        voltage: '138–765 kV AC',
        type: 'Step-Up Transformer',
        purpose: 'Multiplies voltage up so the same power flows with far lower current (I = P / V) — drastically cutting heat losses (I²R) in overhead wires.'
      },
      {
        voltage: '230–500 kV AC',
        type: 'Long-Distance Transmission',
        purpose: 'Steel lattice towers carry bulk power across states along aluminum-steel cables suspended safely high above the ground.'
      },
      {
        voltage: '7.2–13.8 kV AC',
        type: 'Regional Substation',
        purpose: 'Steps ultra-high grid voltage down to safer town distribution voltage and adds protective breakers to isolate faults.'
      },
      {
        voltage: '120 / 240 V AC',
        type: 'Neighborhood Transformer',
        purpose: 'The pole cylinder or green lawn box makes the final step-down right before wires enter your home or school.'
      },
      {
        voltage: '120 V AC (or DC via adapter)',
        type: 'Breaker Panel & Outlets',
        purpose: 'Parallel circuits keep every wall socket at full voltage while breakers cut off unsafe surges; phone bricks then convert AC to low-voltage DC.'
      }
    ];

    function setStage(index) {
      var idx = Math.max(0, Math.min(stages.length - 1, index));
      var data = stages[idx];

      nodes.forEach(function (node) {
        var active = parseInt(node.dataset.gridStage, 10) === idx;
        var box = node.querySelector('rect');
        if (box) {
          box.setAttribute('stroke', active ? '#38bdf8' : '#334155');
          box.setAttribute('stroke-width', active ? '2.4' : '1.3');
          box.setAttribute('fill', active ? '#1e3a5f' : '#111c33');
        }
      });

      cards.forEach(function (card) {
        var active = parseInt(card.dataset.gridStage, 10) === idx;
        card.classList.toggle('is-active', active);
        card.setAttribute('aria-pressed', String(active));
      });

      outV.textContent = data.voltage;
      outT.textContent = data.type;
      outP.textContent = data.purpose;
    }

    nodes.forEach(function (node) {
      node.addEventListener('click', function () {
        setStage(parseInt(node.dataset.gridStage, 10));
      });
      node.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          setStage(parseInt(node.dataset.gridStage, 10));
        }
      });
    });

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        setStage(parseInt(card.dataset.gridStage, 10));
      });
    });

    setStage(0);
  }

  /* ── 9. Section 7: Activities Age Filter ── */
  function initActivityFilter() {
    var btns = Array.prototype.slice.call(document.querySelectorAll('[data-age-filter]'));
    var cards = Array.prototype.slice.call(document.querySelectorAll('.sm-project-card[data-age-group]'));
    if (!btns.length || !cards.length) return;

    function applyFilter(filter) {
      btns.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.dataset.ageFilter === filter));
      });
      cards.forEach(function (card) {
        var show = filter === 'all' || card.dataset.ageGroup === filter;
        card.hidden = !show;
      });
    }

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyFilter(btn.dataset.ageFilter);
      });
    });
    applyFilter('all');
  }

  /* ── 10. Section 8a: Guided Practice Problems + Hints Toggle ── */
  function initPracticeProblems() {
    var list = document.querySelector('.we-practice-list');
    var hintBtn = document.getElementById('we-hints-toggle');
    var problems = Array.prototype.slice.call(document.querySelectorAll('.we-problem'));
    if (hintBtn && list) {
      hintBtn.addEventListener('click', function () {
        var next = hintBtn.getAttribute('aria-checked') !== 'true';
        hintBtn.setAttribute('aria-checked', String(next));
        list.classList.toggle('show-hints', next);
      });
    }

    problems.forEach(function (prob) {
      var input = prob.querySelector('.we-ans-input');
      var checkBtn = prob.querySelector('.we-check-btn');
      var feedback = prob.querySelector('.we-p-feedback');
      if (!input || !checkBtn || !feedback) return;

      function checkAnswer() {
        var expected = prob.dataset.ans;
        var tol = parseFloat(prob.dataset.tol || '0');
        var explanation = prob.dataset.explain || '';
        var raw = String(input.value || '').trim();
        if (!raw) {
          feedback.className = 'we-p-feedback is-err';
          feedback.textContent = 'Enter or select an answer first.';
          return;
        }

        var isCorrect = false;
        if (input.tagName === 'SELECT') {
          isCorrect = raw.toLowerCase() === String(expected).toLowerCase();
        } else {
          var num = parseFloat(raw.replace(/,/g, ''));
          var target = parseFloat(expected);
          if (!isNaN(num) && !isNaN(target)) {
            isCorrect = Math.abs(num - target) <= tol;
          }
        }

        if (isCorrect) {
          feedback.className = 'we-p-feedback is-ok';
          feedback.textContent = 'Correct! ' + explanation;
        } else {
          feedback.className = 'we-p-feedback is-err';
          feedback.textContent = 'Not quite — toggle Hints if you want a nudge, then try again.';
        }
      }

      checkBtn.addEventListener('click', checkAnswer);
      if (input.tagName !== 'SELECT') {
        input.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            checkAnswer();
          }
        });
      }
    });
  }

  /* ── 11. Section 8b: Quick Check Quiz ── */
  function initQuickCheckQuiz() {
    var questions = Array.prototype.slice.call(document.querySelectorAll('.sm-question'));
    var scoreEl = document.getElementById('we-quiz-score');
    var resetBtn = document.getElementById('we-quiz-reset');
    if (!questions.length) return;

    function updateScore() {
      if (!scoreEl) return;
      var answered = 0;
      var correct = 0;
      questions.forEach(function (q) {
        if (q.dataset.state === 'correct') {
          answered++;
          correct++;
        } else if (q.dataset.state === 'wrong') {
          answered++;
        }
      });
      scoreEl.textContent = 'Score: ' + correct + ' / ' + questions.length + (answered ? ' (' + answered + ' answered)' : '');
    }

    questions.forEach(function (q) {
      var answer = q.dataset.answer;
      var exp = q.dataset.explanation || '';
      var fb = q.querySelector('.sm-q-feedback');
      var opts = Array.prototype.slice.call(q.querySelectorAll('.sm-option'));

      opts.forEach(function (btn) {
        btn.addEventListener('click', function () {
          opts.forEach(function (b) { b.disabled = true; });
          var isRight = btn.dataset.choice === answer;
          q.dataset.state = isRight ? 'correct' : 'wrong';
          if (isRight) {
            btn.classList.add('is-correct');
            if (fb) {
              fb.className = 'sm-q-feedback is-ok';
              fb.textContent = 'Correct! ' + exp;
            }
          } else {
            btn.classList.add('is-wrong');
            opts.forEach(function (b) {
              if (b.dataset.choice === answer) b.classList.add('is-correct');
            });
            if (fb) {
              fb.className = 'sm-q-feedback is-err';
              fb.textContent = 'Not quite — ' + exp;
            }
          }
          updateScore();
        });
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        questions.forEach(function (q) {
          delete q.dataset.state;
          var fb = q.querySelector('.sm-q-feedback');
          if (fb) {
            fb.className = 'sm-q-feedback';
            fb.textContent = '';
          }
          q.querySelectorAll('.sm-option').forEach(function (b) {
            b.disabled = false;
            b.classList.remove('is-correct', 'is-wrong');
          });
        });
        updateScore();
      });
    }

    updateScore();
  }

  initAtomBuilder();
  initJumpNav();
  initScaleExplorer();
  initWaterAnalogy();
  initMaterialBench();
  initStaticAndCurrentLabs();
  initTimeline();
  initGridStepper();
  initActivityFilter();
  initPracticeProblems();
  initQuickCheckQuiz();
})();
