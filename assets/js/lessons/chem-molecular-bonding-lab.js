    const atomCatalog = {
      Na: {
        symbol: 'Na',
        name: 'Sodium',
        type: 'metal',
        valence: 1,
        fullShell: 8,
        electronegativity: 0.93,
        glow: 'rgba(255, 183, 94, 0.38)',
        deep: '#3a2414',
        core: '#9f6024'
      },
      Cl: {
        symbol: 'Cl',
        name: 'Chlorine',
        type: 'nonmetal',
        valence: 7,
        fullShell: 8,
        electronegativity: 3.16,
        glow: 'rgba(102, 241, 158, 0.38)',
        deep: '#103125',
        core: '#22724e'
      },
      Mg: {
        symbol: 'Mg',
        name: 'Magnesium',
        type: 'metal',
        valence: 2,
        fullShell: 8,
        electronegativity: 1.31,
        glow: 'rgba(255, 174, 104, 0.36)',
        deep: '#3f2719',
        core: '#b46b2d'
      },
      O: {
        symbol: 'O',
        name: 'Oxygen',
        type: 'nonmetal',
        valence: 6,
        fullShell: 8,
        electronegativity: 3.44,
        glow: 'rgba(105, 226, 222, 0.36)',
        deep: '#0d2831',
        core: '#1b7284'
      },
      H: {
        symbol: 'H',
        name: 'Hydrogen',
        type: 'nonmetal',
        valence: 1,
        fullShell: 2,
        electronegativity: 2.2,
        glow: 'rgba(147, 219, 255, 0.34)',
        deep: '#14324a',
        core: '#26628a'
      },
      K: {
        symbol: 'K',
        name: 'Potassium',
        type: 'metal',
        valence: 1,
        fullShell: 8,
        electronegativity: 0.82,
        glow: 'rgba(255, 148, 178, 0.36)',
        deep: '#3a1a26',
        core: '#a83f66'
      },
      F: {
        symbol: 'F',
        name: 'Fluorine',
        type: 'nonmetal',
        valence: 7,
        fullShell: 8,
        electronegativity: 3.98,
        glow: 'rgba(198, 164, 255, 0.36)',
        deep: '#241a3a',
        core: '#6a4bb0'
      }
    };

    const pairPresets = {
      'na-cl': {
        id: 'na-cl',
        left: 'Na',
        right: 'Cl',
        title: 'Sodium + Chlorine',
        preview: 'A metal with a loose outer electron is meeting a nonmetal that strongly wants one more. Bring them together to see whether the electron transfers.',
        result: 'Sodium transfers its one valence electron to chlorine. The atoms become oppositely charged ions, and ionic attraction locks them into a crystal lattice.',
        electronText: '1 electron transferred',
        structure: 'Ionic lattice',
        octet: 'Sodium loses 1 valence electron and reveals a full inner shell. Chlorine gains 1 electron and completes its octet of 8.',
        properties: [
          'Usually forms a repeating crystal lattice.',
          'High melting point compared with many molecular substances.',
          'Conducts electricity when melted or dissolved in water.'
        ]
      },
      'mg-o': {
        id: 'mg-o',
        left: 'Mg',
        right: 'O',
        title: 'Magnesium + Oxygen',
        preview: 'Magnesium has 2 outer electrons it can lose, while oxygen needs 2 more to fill its valence shell. Drag them together to test the transfer.',
        result: 'Magnesium gives up 2 electrons to oxygen. Both atoms reach more stable shells, and the resulting ions fit into a strong ionic solid.',
        electronText: '2 electrons transferred',
        structure: 'Ionic lattice',
        octet: 'Magnesium loses 2 valence electrons and reveals a full inner shell. Oxygen gains 2 electrons and completes an octet of 8.',
        properties: [
          'Builds a rigid ionic solid with strong attractions.',
          'Very high melting point because many ions pull on each other.',
          'Harder and less molecule-like than covalent substances.'
        ]
      },
      'h-cl': {
        id: 'h-cl',
        left: 'H',
        right: 'Cl',
        title: 'Hydrogen + Chlorine',
        preview: 'These are two nonmetals, so expect sharing instead of full transfer. Chlorine still pulls harder because it is more electronegative.',
        result: 'Hydrogen and chlorine overlap around a shared pair of electrons. The sharing is uneven, so this is a polar covalent bond rather than an ionic one.',
        electronText: '1 shared pair',
        structure: 'Polar covalent molecule',
        octet: 'Hydrogen fills its first shell with 2 electrons. Chlorine counts the shared pair and reaches a stable outer shell of 8.',
        properties: [
          'Forms discrete molecules instead of a giant ionic lattice.',
          'Electrons are shared unevenly because chlorine is more electronegative.',
          'Molecular substances often have lower melting and boiling points than ionic salts.'
        ]
      },
      'cl-cl': {
        id: 'cl-cl',
        left: 'Cl',
        right: 'Cl',
        title: 'Chlorine + Chlorine',
        preview: 'Two identical nonmetals have the same electronegativity, so expect equal sharing when the atoms overlap.',
        result: 'Each chlorine contributes one electron to a shared pair. Because the atoms pull equally, the covalent bond is nonpolar.',
        electronText: '1 shared pair',
        structure: 'Nonpolar covalent molecule',
        octet: 'Each chlorine counts the shared pair and reaches an octet of 8 valence electrons.',
        properties: [
          'Forms separate molecules rather than a crystal lattice.',
          'Equal sharing means no strongly positive or negative end.',
          'Usually has a much lower boiling point than an ionic compound.'
        ]
      },
      'k-f': {
        id: 'k-f',
        left: 'K',
        right: 'F',
        title: 'Potassium + Fluorine',
        preview: 'Potassium has one loose outer electron. Fluorine is the most electronegative element on the periodic table and wants that electron more than almost anything else. Expect the widest gap in this lab.',
        result: 'Potassium transfers its one valence electron to fluorine. This is the largest electronegativity gap in the lab. Attractions among the resulting ions stabilize the ionic lattice.',
        electronText: '1 electron transferred',
        structure: 'Ionic lattice',
        octet: 'Potassium loses 1 valence electron and reveals a full inner shell. Fluorine gains 1 electron and completes its octet of 8.',
        properties: [
          'Forms a rigid, tightly bound ionic lattice.',
          'Lattice attractions stabilize the solid; ion charge and size both matter.',
          'Conducts electricity when melted or dissolved in water.'
        ]
      },
      'h-f': {
        id: 'h-f',
        left: 'H',
        right: 'F',
        title: 'Hydrogen + Fluorine',
        preview: 'Fluorine pulls on electrons about as strongly as any atom can. That gap looks ionic-sized — but both atoms here are nonmetals, so watch what actually happens when they meet.',
        result: 'Even with a gap almost as wide as some ionic pairs, hydrogen and fluorine are both nonmetals: they share a pair of electrons instead of transferring one. The sharing is extremely uneven, making this one of the most polar covalent bonds known.',
        electronText: '1 shared pair (highly polar)',
        structure: 'Polar covalent molecule',
        octet: 'Hydrogen fills its first shell with 2 electrons. Fluorine counts the shared pair and reaches a stable octet of 8.',
        properties: [
          'Forms discrete molecules, not an ionic lattice, despite the large EN gap.',
          'One of the most polar covalent bonds known.',
          'A reminder that an EN gap alone does not determine bond type.'
        ]
      }
    };

    const stage = document.getElementById('bondStage');
    const atomElements = {
      left: document.getElementById('atomLeft'),
      right: document.getElementById('atomRight')
    };

    const pairButtons = Array.from(document.querySelectorAll('[data-pair]'));
    const actionButtons = Array.from(document.querySelectorAll('[data-action]'));
    const sharedPair = document.getElementById('sharedPair');
    const transferTag = document.getElementById('transferTag');
    const statusBanner = document.getElementById('statusBanner');

    const resultBadge = document.getElementById('resultBadge');
    const pairTitle = document.getElementById('pairTitle');
    const resultSummary = document.getElementById('resultSummary');
    const bondTypeValue = document.getElementById('bondTypeValue');
    const electronBehaviorValue = document.getElementById('electronBehaviorValue');
    const deltaValue = document.getElementById('deltaValue');
    const structureValue = document.getElementById('structureValue');
    const leftEN = document.getElementById('leftEN');
    const rightEN = document.getElementById('rightEN');
    const meterFill = document.getElementById('meterFill');
    const octetNote = document.getElementById('octetNote');
    const propertyList = document.getElementById('propertyList');

    const atomState = {
      left: { x: 0, y: 0 },
      right: { x: 0, y: 0 }
    };

    const bondState = {
      active: false,
      type: null,
      donor: null
    };

    let currentPair = pairPresets['na-cl'];
    let dragState = null;
    let transferTimeout = null;

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function atomRef(side) {
      const root = atomElements[side];
      return {
        root,
        symbol: root.querySelector('.bondlab-symbol'),
        name: root.querySelector('.bondlab-name'),
        valence: root.querySelector('.bondlab-valence'),
        electrons: root.querySelector('.bondlab-electrons'),
        charge: root.querySelector('.bondlab-charge')
      };
    }

    const atomRefs = {
      left: atomRef('left'),
      right: atomRef('right')
    };

    function getPairGap() {
      const leftAtom = atomCatalog[currentPair.left];
      const rightAtom = atomCatalog[currentPair.right];
      return Math.abs(leftAtom.electronegativity - rightAtom.electronegativity);
    }

    function getPredictedType() {
      const leftAtom = atomCatalog[currentPair.left];
      const rightAtom = atomCatalog[currentPair.right];

      if (
        (leftAtom.type === 'metal' && rightAtom.type === 'nonmetal') ||
        (leftAtom.type === 'nonmetal' && rightAtom.type === 'metal')
      ) {
        return 'ionic';
      }

      if (leftAtom.type === 'nonmetal' && rightAtom.type === 'nonmetal') {
        return 'covalent';
      }

      return 'metallic';
    }

    function formatCharge(count, sign) {
      return count === 1 ? sign : `${count}${sign}`;
    }

    function getTransferCount() {
      const leftAtom = atomCatalog[currentPair.left];
      const rightAtom = atomCatalog[currentPair.right];
      const donorAtom = leftAtom.type === 'metal' ? leftAtom : rightAtom;
      const acceptorAtom = donorAtom === leftAtom ? rightAtom : leftAtom;
      return Math.min(donorAtom.valence, acceptorAtom.fullShell - acceptorAtom.valence);
    }

    function getElectronDisplay(side) {
      const atomSymbol = currentPair[side];
      const atom = atomCatalog[atomSymbol];

      if (!bondState.active) return atom.valence;
      // Each atom contributes one electron to the separately drawn shared pair.
      if (bondState.type === 'covalent') return atom.valence - 1;

      const transferCount = getTransferCount();
      if (side === bondState.donor) {
        return Math.max(0, atom.valence - transferCount);
      }

      return Math.min(atom.fullShell, atom.valence + transferCount);
    }

    function getChargeDisplay(side) {
      if (!bondState.active || bondState.type !== 'ionic') {
        return '';
      }

      const transferCount = getTransferCount();
      return side === bondState.donor
        ? formatCharge(transferCount, '+')
        : formatCharge(transferCount, '-');
    }

    function placeElectronDots(container, count) {
      container.innerHTML = '';
      if (count <= 0) return;

      const angles = count === 1
        ? [-90]
        : Array.from({ length: count }, (_, index) => (-90 + (360 / count) * index));

      angles.forEach((angle) => {
        const electron = document.createElement('span');
        electron.className = 'bondlab-electron';
        const radians = angle * Math.PI / 180;
        const radius = container.parentElement.offsetWidth / 2 - 18;
        electron.style.left = `calc(50% + ${Math.cos(radians) * radius}px)`;
        electron.style.top = `calc(50% + ${Math.sin(radians) * radius}px)`;
        container.appendChild(electron);
      });
    }

    function renderAtom(side) {
      const ref = atomRefs[side];
      const atom = atomCatalog[currentPair[side]];
      const chargeText = getChargeDisplay(side);
      const displayedElectrons = getElectronDisplay(side);
      const valenceLabel = bondState.active && bondState.type === 'ionic'
        ? (side === bondState.donor ? 'inner shell full' : '8 outer electrons')
        : bondState.active ? `${displayedElectrons} unshared` : `${atom.valence} valence`;

      ref.root.style.left = `${atomState[side].x}px`;
      ref.root.style.top = `${atomState[side].y}px`;
      ref.root.style.setProperty('--atom-glow', atom.glow);
      ref.root.style.setProperty('--atom-deep', atom.deep);
      ref.root.style.setProperty('--atom-core', atom.core);

      ref.symbol.textContent = atom.symbol;
      ref.name.textContent = atom.name;
      ref.valence.textContent = valenceLabel;
      ref.charge.textContent = chargeText;

      ref.root.classList.toggle('has-charge', Boolean(chargeText));
      ref.root.classList.toggle('is-bonded', bondState.active);
      ref.root.classList.toggle('is-draggable', !bondState.active);

      ref.root.setAttribute('aria-label', `${atom.name}: ${valenceLabel}${chargeText ? ', charge ' + chargeText : ''}`);
      placeElectronDots(ref.electrons, displayedElectrons);
    }

    function renderStage() {
      renderAtom('left');
      renderAtom('right');
      stage.classList.toggle('has-bond', bondState.active);
    }

    function defaultPositions() {
      const rect = stage.getBoundingClientRect();
      const margin = atomElements.left.offsetWidth / 2 + 12;
      const minX = margin;
      const maxX = rect.width - margin;
      const centerY = rect.height * 0.5;

      atomState.left.x = clamp(rect.width * 0.26, minX, maxX);
      atomState.left.y = centerY;
      atomState.right.x = clamp(rect.width * 0.74, minX, maxX);
      atomState.right.y = centerY;
    }

    function bondedPositions() {
      const rect = stage.getBoundingClientRect();

      const separation = bondState.type === 'ionic' ? Math.min(180, rect.width - atomElements.left.offsetWidth - 24) : 104;
      atomState.left.x = rect.width / 2 - separation / 2;
      atomState.right.x = rect.width / 2 + separation / 2;
      atomState.left.y = rect.height * 0.43;
      atomState.right.y = rect.height * 0.43;
    }

    function clearAnimations() {
      sharedPair.classList.remove('is-visible');
      transferTag.classList.remove('is-visible');
      transferTag.style.left = '';
      transferTag.style.top = '';
      if (transferTimeout) {
        window.clearTimeout(transferTimeout);
        transferTimeout = null;
      }
    }

    function cancelDrag() {
      if (!dragState) return;
      atomElements[dragState.side].classList.remove('is-dragging');
      dragState = null;
    }

    function updateStatus(text, state = 'ready') {
      statusBanner.textContent = text;
      statusBanner.dataset.state = state;
    }

    function updatePropertyList(items) {
      propertyList.innerHTML = '';
      items.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        propertyList.appendChild(li);
      });
    }

    function updateReadout() {
      const leftAtom = atomCatalog[currentPair.left];
      const rightAtom = atomCatalog[currentPair.right];
      const predictedType = getPredictedType();
      const gap = getPairGap();
      document.getElementById('evidence-pair').textContent = currentPair.title;
      document.getElementById('evidence-valence').textContent = `${leftAtom.symbol}: ${leftAtom.valence} · ${rightAtom.symbol}: ${rightAtom.valence}`;
      document.getElementById('evidence-gap').textContent = `${leftAtom.electronegativity.toFixed(2)} vs ${rightAtom.electronegativity.toFixed(2)} → ${gap.toFixed(2)}`;
      const evidence = document.getElementById('evidence-result');
      evidence.dataset.type = bondState.active ? bondState.type : 'ready';
      evidence.querySelector('strong').textContent = bondState.active ? currentPair.structure : 'Test this pair';
      evidence.querySelector('p').textContent = bondState.active ? currentPair.result : 'The dots represent outer electrons. Watch their count and location as the atoms bond.';
      document.getElementById('evidence-shell').textContent = bondState.active ? currentPair.octet : 'Use the outer-electron counts to make your prediction.';

      pairTitle.textContent = currentPair.title;
      leftEN.textContent = `${leftAtom.symbol} ${leftAtom.electronegativity.toFixed(2)}`;
      rightEN.textContent = `${rightAtom.symbol} ${rightAtom.electronegativity.toFixed(2)}`;
      deltaValue.textContent = gap.toFixed(2);
      meterFill.style.width = `${Math.min(100, (gap / 3.5) * 100)}%`;

      if (!bondState.active) {
        const pairingBySide = {
          ionic: 'Metal + nonmetal',
          covalent: 'Two nonmetals',
          metallic: 'Two metals'
        };
        const behaviorBySide = {
          ionic: 'Watch for transfer',
          covalent: 'Watch for overlap',
          metallic: 'Watch for a shared electron sea'
        };
        const structureBySide = {
          ionic: 'Likely ionic lattice',
          covalent: 'Likely molecule',
          metallic: 'Likely metallic solid'
        };

        resultBadge.textContent = 'Prediction';
        resultBadge.dataset.type = 'ready';
        resultSummary.textContent = currentPair.preview;
        bondTypeValue.textContent = pairingBySide[predictedType];
        electronBehaviorValue.textContent = behaviorBySide[predictedType];
        structureValue.textContent = structureBySide[predictedType];
        octetNote.textContent = currentPair.octet;
        updatePropertyList(currentPair.properties);
        return;
      }

      resultBadge.textContent = bondState.type === 'ionic' ? 'Ionic bond' : 'Covalent bond';
      resultBadge.dataset.type = bondState.type;
      resultSummary.textContent = currentPair.result;
      bondTypeValue.textContent = bondState.type === 'ionic' ? 'Ionic' : 'Covalent';
      electronBehaviorValue.textContent = currentPair.electronText;
      structureValue.textContent = currentPair.structure;
      octetNote.textContent = currentPair.octet;
      updatePropertyList(currentPair.properties);
    }

    let prediction = null;
    const predictionFeedback = document.getElementById('prediction-feedback');
    const predictionButtons = [...document.querySelectorAll('[data-prediction]')];
    function clearPrediction() {
      prediction = null;
      predictionButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
      predictionFeedback.textContent = 'Choose a prediction, then snap the atoms together to test it.';
    }
    predictionButtons.forEach(button => button.addEventListener('click', () => {
      if (bondState.active) resetPair();
      prediction = button.dataset.prediction;
      predictionButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      predictionFeedback.textContent = 'Prediction recorded. Snap together and watch the electrons.';
    }));
    function setPair(pairId) {
      clearPrediction();
      cancelDrag();
      currentPair = pairPresets[pairId];
      bondState.active = false;
      bondState.type = null;
      bondState.donor = null;
      clearAnimations();
      defaultPositions();
      renderStage();
      updateReadout();

      pairButtons.forEach((button) => {
        button.classList.toggle('is-active', button.dataset.pair === pairId);
        button.setAttribute('aria-pressed', String(button.dataset.pair === pairId));
      });

      document.querySelectorAll('[data-preset]').forEach(button => {
        const active = button.dataset.preset === pairId;
        button.classList.toggle('ll-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      updateStatus('Predict, then snap or drag the atoms together.', 'ready');
    }

    function positionSharedPair() {
      const gapShift = clamp((atomCatalog[currentPair.right].electronegativity - atomCatalog[currentPair.left].electronegativity) * 10, -12, 12);
      const x = ((atomState.left.x + atomState.right.x) / 2) + gapShift;
      const y = ((atomState.left.y + atomState.right.y) / 2) - 56;
      sharedPair.style.left = `${x}px`;
      sharedPair.style.top = `${y}px`;
      sharedPair.classList.add('is-visible');
    }

    function animateTransfer() {
      clearAnimations();

      const donorSide = bondState.donor;
      const acceptorSide = donorSide === 'left' ? 'right' : 'left';
      const donorX = atomState[donorSide].x + (donorSide === 'left' ? 48 : -48);
      const acceptorX = atomState[acceptorSide].x + (acceptorSide === 'left' ? 48 : -48);
      const startY = atomState[donorSide].y - 14;
      const endY = atomState[acceptorSide].y - 6;
      const count = getTransferCount();

      transferTag.textContent = count === 1 ? 'e-' : `${count}e-`;
      transferTag.style.left = `${donorX}px`;
      transferTag.style.top = `${startY}px`;
      transferTag.classList.add('is-visible');

      requestAnimationFrame(() => {
        transferTag.style.left = `${acceptorX}px`;
        transferTag.style.top = `${endY}px`;
      });

      transferTimeout = window.setTimeout(() => {
        transferTag.classList.remove('is-visible');
      }, 820);
    }

    function resolveBond() {
      if (bondState.active) return;

      const predictedType = getPredictedType();
      predictionFeedback.textContent = (prediction ? (prediction === predictedType ? 'Your prediction matches. ' : 'Compare with your prediction. ') : 'Observe the result. ') + currentPair.electronText + '. Try another pair and compare.';
      bondState.active = true;
      bondState.type = predictedType;
      bondState.donor = predictedType === 'ionic' && atomCatalog[currentPair.left].type === 'metal' ? 'left' : 'right';

      bondedPositions();
      renderStage();

      if (predictedType === 'ionic') {
        animateTransfer();
        updateStatus(`Ionic bond formed: ${currentPair.electronText}.`, 'ionic');
      } else {
        clearAnimations();
        positionSharedPair();
        updateStatus(`Covalent bond formed: ${currentPair.electronText}.`, 'covalent');
      }

      updateReadout();
      recordExperiment();
    }

    function resetPair() {
      clearPrediction();
      cancelDrag();
      bondState.active = false;
      bondState.type = null;
      bondState.donor = null;
      clearAnimations();
      defaultPositions();
      renderStage();
      updateReadout();

      updateStatus('Pair reset. Make a new prediction and test again.', 'ready');
    }

    function maybeBondFromDistance() {
      if (bondState.active) return;
      const dx = atomState.left.x - atomState.right.x;
      const dy = atomState.left.y - atomState.right.y;
      const distance = Math.hypot(dx, dy);
      const threshold = stage.getBoundingClientRect().width < 600 ? 150 : 170;

      if (distance <= threshold) {
        resolveBond();
      }
    }

    function startDrag(event) {
      if (bondState.active) return;

      const side = event.currentTarget.dataset.side;
      const rect = stage.getBoundingClientRect();

      dragState = {
        side,
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left - atomState[side].x,
        offsetY: event.clientY - rect.top - atomState[side].y
      };

      event.currentTarget.classList.add('is-dragging');
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch (error) {
        // Pointer capture is optional.
      }
    }

    function moveDrag(event) {
      if (!dragState || event.pointerId !== dragState.pointerId) return;

      const rect = stage.getBoundingClientRect();
      const atomSize = atomElements.left.getBoundingClientRect().width;
      const minX = atomSize / 2 + 12;
      const maxX = rect.width - atomSize / 2 - 12;
      const minY = atomSize / 2 + 16;
      const maxY = rect.height - atomSize / 2 - 54;

      atomState[dragState.side].x = clamp(event.clientX - rect.left - dragState.offsetX, minX, maxX);
      atomState[dragState.side].y = clamp(event.clientY - rect.top - dragState.offsetY, minY, maxY);
      renderStage();
    }

    function endDrag(event) {
      if (!dragState || event.pointerId !== dragState.pointerId) return;

      const side = dragState.side;
      atomElements[side].classList.remove('is-dragging');
      try {
        atomElements[side].releasePointerCapture(event.pointerId);
      } catch (error) {
        // Safe to ignore if capture was already released.
      }

      dragState = null;
      maybeBondFromDistance();
    }

    pairButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setPair(button.dataset.pair);
      });
    });

    actionButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'snap') {
          resolveBond();
        }
        if (action === 'reset') {
          resetPair();
        }
      });
    });

    Object.values(atomElements).forEach((atom) => {
      atom.addEventListener('pointerdown', startDrag);
    });

    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', cancelDrag);

    window.addEventListener('resize', () => {
      if (bondState.active) {
        bondedPositions();
      } else {
        defaultPositions();
      }

      renderStage();

      if (bondState.active && bondState.type === 'covalent') {
        positionSharedPair();
      }
    });

    const experimentRecords = new Map();
    function renderRecord() {
      const tbody = document.getElementById('experiment-record');
      tbody.replaceChildren();
      if (!experimentRecords.size) {
        const row = tbody.insertRow();
        const cell = row.insertCell(); cell.colSpan = 4;
        cell.textContent = 'Your first result will appear here.';
      }
      experimentRecords.forEach(record => {
        const row = tbody.insertRow();
        record.forEach(text => { row.insertCell().textContent = text; });
      });
      document.getElementById('record-count').textContent = `${experimentRecords.size} of 6 pairs tested`;
    }
    function recordExperiment() {
      experimentRecords.set(currentPair.id, [
        `${currentPair.left} + ${currentPair.right}`,
        prediction ? (prediction === 'ionic' ? 'Transfer' : 'Share') : 'Observed without prediction',
        `${bondState.type === 'ionic' ? 'Transfer' : 'Share'} · ${currentPair.structure}`,
        getPairGap().toFixed(2)
      ]);
      renderRecord();
    }
    document.getElementById('clear-record').addEventListener('click', () => {
      experimentRecords.clear(); renderRecord();
    });
    setPair('na-cl');
  
