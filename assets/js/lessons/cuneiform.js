(() => {
  'use strict';

  // --- 1. SIGN DATA & DEFINITIONS ---
  const SIGNS = [
    { id: 'an', glyph: '𒀭', label: 'an', meaning: 'sky / heaven', note: 'AN sign · also read dingir ("deity") or serves as a divine classifier (^d).' },
    { id: 'ki', glyph: '𒆠', label: 'ki', meaning: 'earth / place', note: 'KI sign · represents ground or place; also serves as a geographic classifier (^ki).' },
    { id: 'e₂', glyph: '𒂍', label: 'e₂', meaning: 'house / temple', note: 'E₂ sign · numeric subscript 2 distinguishes it from other "e" homophones.' },
    { id: 'lugal', glyph: '𒈗', label: 'lugal', meaning: 'king / sovereign', note: 'LUGAL sign · written as a composite of LU₂ (man) + GAL (great).' },
    { id: 'lu₂', glyph: '𒇽', label: 'lu₂', meaning: 'man / person', note: 'LU₂ sign · adult human male; also serves as a profession classifier (^lu₂).' },
    { id: 'gal', glyph: '𒃲', label: 'gal', meaning: 'great / noble', note: 'GAL sign · adjective for big, majestic, or chief.' },
    { id: 'sag', glyph: '𒊕', label: 'sag', meaning: 'head / source', note: 'SAG sign · originally drawn as a human head profile at Uruk c. 3200 BCE.' },
    { id: 'ka', glyph: '𒅗', label: 'ka', meaning: 'mouth / speech', note: 'KA sign · created by adding hatching lines over the mouth area of SAG.' },
    { id: 'kur', glyph: '𒆳', label: 'kur', meaning: 'mountain / land', note: 'KUR sign · mountains, highland foreign territory, or the netherworld.' },
    { id: 'dub', glyph: '𒁾', label: 'dub', meaning: 'clay tablet', note: 'DUB sign · inscribed clay document or record.' },
    { id: 'sar', glyph: '𒊬', label: 'sar', meaning: 'write / inscribe', note: 'SAR sign · to carve, record, or plant a garden.' },
    { id: 'a', glyph: '𒀀', label: 'a', meaning: 'water / canal', note: 'A sign · water, canal stream, semen, or son.' }
  ];

  // --- 2. GUIDED MISSIONS ---
  const MISSIONS = {
    'an-ki': {
      title: 'Mission 1: The Cosmos',
      target: ['an', 'ki'],
      translit: 'an ki',
      translation: 'heaven and earth (the universe / cosmos)',
      prompt: 'Build "an ki" (the universe): place the sky sign (an) before the earth sign (ki).'
    },
    'lugal': {
      title: 'Mission 2: The Sovereign',
      target: ['lu₂', 'gal'],
      translit: 'lu₂ gal → lugal',
      translation: 'king (literally "great man")',
      prompt: 'Construct the etymology of King: combine the sign for man (lu₂) with great (gal).'
    },
    'dubsar': {
      title: 'Mission 3: The Scribe',
      target: ['dub', 'sar'],
      translit: 'dub sar → dubsar',
      translation: 'scribe (literally "tablet writer")',
      prompt: 'Assemble the ancient scribe\'s title: place clay tablet (dub) before to write (sar).'
    },
    'egal': {
      title: 'Mission 4: The Palace',
      target: ['e₂', 'gal'],
      translit: 'e₂ gal → egal',
      translation: 'palace (literally "great house")',
      prompt: 'Build the royal residence: place house (e₂) before great (gal).'
    },
    'ekur': {
      title: 'Mission 5: Mountain Temple',
      target: ['e₂', 'kur'],
      translit: 'e₂ kur → Ekur',
      translation: 'Ekur ("Mountain House", sacred temple of Enlil at Nippur)',
      prompt: 'Build the sacred shrine of Nippur: place house (e₂) before mountain (kur).'
    },
    'free': {
      title: 'Free Scribe Composition',
      target: null,
      translit: '',
      translation: 'Free composition on clay',
      prompt: 'Explore freely: select any signs from the bank to stamp your own inscription of up to 12 signs.'
    }
  };

  const STYLUS_STROKES = {
    vertical: {
      name: 'Vertical Wedge (Diš)',
      glyph: '𒁹',
      sumerian: 'diš',
      value: '1 (one) · Word divider · Personal name marker',
      technique: 'Hold the triangular reed stylus upright. Tilt the tip slightly forward and press downward into the damp clay. The triangular head sinks deepest while the tail tapers off smoothly.',
      funFact: 'Scribes placed this single vertical mark before a man’s name in administrative records as an identity marker (like a bullet point).'
    },
    horizontal: {
      name: 'Horizontal Wedge (Aš / Išten)',
      glyph: '𒀸',
      sumerian: 'aš / išten',
      value: 'Crossbar · Syllabic stroke · Cardinal marker',
      technique: 'Turn your hand and the reed 90° to the side. Press the left edge deeply into the clay and lower the right shaft to form the horizontal tail trailing rightward.',
      funFact: 'Horizontal wedges form the backbone and crossbars of hundreds of compound signs, including the star sign AN.'
    },
    angle: {
      name: 'Angle Wedge / Winkelhaken (U)',
      glyph: '𒌋',
      sumerian: 'u',
      value: '10 (ten) · Plural marker · Angle joint',
      technique: 'Drive only the corner point of the triangular reed into the clay at approximately 45°. Sinking just the corner creates a distinct open arrowhead notch.',
      funFact: 'In the sexagesimal (base-60) counting system, one Winkelhaken represents the number 10, while five of them together represent 50.'
    },
    slanted: {
      name: 'Slanted / Diagonal Wedge',
      glyph: '𒀹',
      sumerian: 'aš₂ / diagonal',
      value: 'Directional stroke · Radial ray in star signs',
      technique: 'Tilt the stylus obliquely at a 30° to 60° diagonal angle. Scribes used this stroke to create radiant starburst rays and cross-hatching.',
      funFact: 'Diagonal strokes were common in archaic scripts but were gradually replaced by orthogonal horizontal and vertical wedges for speed.'
    }
  };

  const CONTEXT_READINGS = {
    sky: 'an · sky / heaven: a direct Sumerian logogram (word sign) referring to the physical firmament or sky realm.',
    deity: 'dingir · deity / divine being: the exact same sign read as the Sumerian word for a god or goddess.',
    marker: 'Superscript d (^d) in transliteration: an unpronounced determinative (classifier) placed immediately before a divine name (e.g. ^dInanna, ^dEnlil) to notify the reader that the following name is a god.',
    phonetic: 'an · phonetic syllable: used purely for its sound value "an" to spell out words or grammatical prefixes, regardless of whether heaven is involved.'
  };

  // --- STATE ---
  let currentMissionKey = 'an-ki';
  let selectedSign = null;
  let tabletSequence = [];

  const $ = id => document.getElementById(id);

  // --- INITIALIZATION ---
  function init() {
    setupStylusLab();
    setupSignBank();
    setupMissionSelector();
    setupWorkshopControls();
    setupCalculator();
    setupQuiz();
    setupContextDropdown();
    setupReflectionStorage();
    renderTablet();
  }

  // --- 1. STYLUS LAB ---
  function setupStylusLab() {
    const buttons = document.querySelectorAll('.cu-stylus-btn');
    const preview = $('stylus-wedge-preview');
    const title = $('stylus-stroke-title');
    const sumerian = $('stylus-sumerian');
    const value = $('stylus-stroke-value');
    const tech = $('stylus-technique');
    const fact = $('stylus-fun-fact');

    if (!buttons.length || !preview) return;

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.stroke;
        const info = STYLUS_STROKES[type];
        if (!info) return;

        buttons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));

        preview.textContent = info.glyph;
        preview.style.transform = 'scale(0.88)';
        setTimeout(() => {
          preview.style.transform = 'scale(1)';
        }, 80);

        if (title) title.textContent = info.name;
        if (sumerian) sumerian.textContent = `Sumerian: ${info.sumerian}`;
        if (value) value.textContent = info.value;
        if (tech) tech.textContent = info.technique;
        if (fact) fact.textContent = info.funFact;
      });
    });
  }

  // --- 2. SIGN BANK & INSPECTION ---
  function setupSignBank() {
    const signBank = $('sign-bank');
    if (!signBank) return;

    signBank.innerHTML = '';
    SIGNS.forEach(sign => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.sign = sign.id;
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = `
        <span class="as-glyph" aria-hidden="true">${sign.glyph}</span>
        <strong>${sign.label}</strong>
        <small>${sign.meaning}</small>
      `;
      btn.addEventListener('click', () => inspectSign(sign, btn));
      signBank.appendChild(btn);
    });
  }

  function inspectSign(sign, btnElement) {
    selectedSign = sign;
    const allButtons = document.querySelectorAll('#sign-bank [data-sign]');
    allButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btnElement)));

    const inspectPanel = $('inspect');
    if (inspectPanel) {
      inspectPanel.innerHTML = `<strong>${sign.label}</strong> (${sign.glyph}) · <em>${sign.meaning}</em>. ${sign.note}`;
    }

    const addBtn = $('add');
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.textContent = `Add "${sign.label}" (${sign.glyph}) to tablet`;
    }
  }

  // --- 3. MISSION SELECTOR ---
  function setupMissionSelector() {
    const bar = $('mission-bar');
    if (!bar) return;

    bar.querySelectorAll('.cu-mission-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        bar.querySelectorAll('.cu-mission-btn').forEach(b => b.setAttribute('aria-selected', String(b === btn)));
        currentMissionKey = btn.dataset.mission;
        const mission = MISSIONS[currentMissionKey];
        if (!mission) return;

        const taskEl = $('build-task');
        if (taskEl) taskEl.textContent = mission.prompt;

        const feedbackEl = $('build-feedback');
        if (feedbackEl) feedbackEl.textContent = `Loaded ${mission.title}. Ready to assemble.`;

        tabletSequence = [];
        renderTablet();
      });
    });
  }

  // --- 4. WORKSHOP CONTROLS ---
  function setupWorkshopControls() {
    const addBtn = $('add');
    const undoBtn = $('undo');
    const resetBtn = $('reset');
    const checkBtn = $('check');
    const fireBtn = $('fire-tablet');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (!selectedSign) return;
        if (tabletSequence.length >= 12) {
          const fb = $('build-feedback');
          if (fb) fb.textContent = 'Tablet limit reached: 12 signs max per practice session. Undo or reset to continue.';
          return;
        }
        tabletSequence.push(selectedSign);
        renderTablet();
      });
    }

    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        tabletSequence.pop();
        renderTablet();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        tabletSequence = [];
        renderTablet();
        const fb = $('build-feedback');
        if (fb) fb.textContent = 'Practice tablet cleared. Choose a sign above to start.';
      });
    }

    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        const mission = MISSIONS[currentMissionKey];
        const fb = $('build-feedback');
        if (!mission || !fb) return;

        if (!mission.target) {
          // Free mode
          if (tabletSequence.length === 0) {
            fb.textContent = 'Tablet is empty. Add signs from the bank to create a practice inscription.';
          } else {
            const translit = tabletSequence.map(s => s.label).join(' ');
            const gloss = tabletSequence.map(s => `${s.label} (${s.meaning})`).join(' + ');
            fb.textContent = `Custom inscription stamped! Transliteration: "${translit}" · Components: ${gloss}.`;
          }
          return;
        }

        const currentSeq = tabletSequence.map(s => s.id).join(' ');
        const targetSeq = mission.target.join(' ');

        if (currentSeq === targetSeq) {
          fb.innerHTML = `<span style="color:#1b5e20;">✔ Masterful work!</span> Correct: <strong>${mission.translit}</strong> = "${mission.translation}".`;
        } else {
          fb.innerHTML = `<span style="color:#b71c1c;">Revise your tablet:</span> Expected ${mission.target.length} signs: <strong>${mission.target.join(' → ')}</strong>. You have: ${tabletSequence.map(s => s.label).join(' → ') || '(none)'}. Use Undo or Reset.`;
        }
      });
    }

    if (fireBtn) {
      fireBtn.addEventListener('click', () => {
        if (tabletSequence.length === 0) {
          alert('Add at least one sign to the practice tablet before firing!');
          return;
        }
        const glyphs = tabletSequence.map(s => s.glyph).join(' ');
        const translit = tabletSequence.map(s => s.label).join(' ');
        const citation = `Sumerian Cuneiform Practice Tablet\nInscribed: ${glyphs}\nTransliteration: ${translit}\nCreated in ClassroomOS Scribe Workshop`;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(citation).then(() => {
            const fb = $('build-feedback');
            if (fb) fb.textContent = 'Clay tablet fired! Inscription copied to clipboard for your notes.';
          }).catch(() => {
            alert(citation);
          });
        } else {
          alert(citation);
        }
      });
    }
  }

  function renderTablet() {
    const inscription = $('inscription');
    const transliteration = $('transliteration');
    const undoBtn = $('undo');
    const countBadge = $('tablet-count-badge');

    if (inscription) {
      inscription.textContent = tabletSequence.length ? tabletSequence.map(s => s.glyph).join(' ') : '';
      inscription.setAttribute('aria-label', tabletSequence.length ? `Inscribed signs: ${tabletSequence.map(s => s.label).join(', ')}` : 'Empty practice tablet');
    }

    if (transliteration) {
      transliteration.textContent = tabletSequence.length
        ? `Transliteration: ${tabletSequence.map(s => s.label).join(' ')}`
        : 'No signs stamped yet.';
    }

    if (countBadge) {
      countBadge.textContent = `${tabletSequence.length}/12 signs`;
    }

    if (undoBtn) {
      undoBtn.disabled = tabletSequence.length === 0;
    }
  }

  // --- 5. BASE-60 CALCULATOR ---
  function setupCalculator() {
    const input = $('cu-number-input');
    const display = $('cu-abacus-glyphs');
    const breakdown = $('cu-abacus-breakdown');
    const presets = document.querySelectorAll('.cu-preset-btn');

    if (!input || !display || !breakdown) return;

    function updateNumber(n) {
      const val = parseInt(n, 10);
      if (isNaN(val) || val < 1) {
        display.textContent = '—';
        breakdown.textContent = 'Enter a positive whole number (e.g. 1 to 59).';
        return;
      }

      if (val < 60) {
        const tens = Math.floor(val / 10);
        const ones = val % 10;
        const tensGlyphs = '𒌋'.repeat(tens);
        const onesGlyphs = '𒁹'.repeat(ones);
        display.textContent = `${tensGlyphs} ${onesGlyphs}`.trim();
        breakdown.textContent = `${val} = ${tens} ten${tens === 1 ? '' : 's'} (${tens * 10}) + ${ones} one${ones === 1 ? '' : 's'} (${ones})`;
      } else {
        // Sexagesimal place value
        const sixties = Math.floor(val / 60);
        const remainder = val % 60;
        const sixtyTens = Math.floor(sixties / 10);
        const sixtyOnes = sixties % 10;
        const remTens = Math.floor(remainder / 10);
        const remOnes = remainder % 10;

        const sixtyPart = ('𒌋'.repeat(sixtyTens) + '𒁹'.repeat(sixtyOnes)) || '𒁹';
        const remPart = ('𒌋'.repeat(remTens) + '𒁹'.repeat(remOnes)) || ' ';

        display.textContent = `${sixtyPart} ; ${remPart}`;
        breakdown.innerHTML = `${val} in Sexagesimal: <strong>${sixties}</strong> × 60 + <strong>${remainder}</strong> × 1. Scribes used positional base-60 just like our clock (60 seconds, 60 minutes)!`;
      }
    }

    input.addEventListener('input', e => updateNumber(e.target.value));

    presets.forEach(btn => {
      btn.addEventListener('click', () => {
        const num = btn.dataset.num;
        input.value = num;
        updateNumber(num);
      });
    });

    updateNumber(input.value || 23);
  }

  // --- 6. MULTI-QUESTION EVIDENCE QUIZ ---
  function setupQuiz() {
    const quizItems = document.querySelectorAll('.cu-quiz-item');
    quizItems.forEach(item => {
      const buttons = item.querySelectorAll('.cu-quiz-btn');
      const fb = item.querySelector('.cu-quiz-feedback');

      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          buttons.forEach(b => {
            b.classList.remove('correct', 'incorrect');
          });

          const isCorrect = btn.dataset.correct === 'true';
          if (isCorrect) {
            btn.classList.add('correct');
            if (fb) fb.innerHTML = `<span style="color:#1b5e20;">✔ Correct!</span> ${btn.dataset.explain}`;
          } else {
            btn.classList.add('incorrect');
            if (fb) fb.innerHTML = `<span style="color:#b71c1c;">✘ Not quite.</span> ${btn.dataset.explain}`;
          }
        });
      });
    });
  }

  // --- 7. CONTEXT DROPDOWN ---
  function setupContextDropdown() {
    const sel = $('reading');
    const note = $('reading-note');
    if (!sel || !note) return;

    sel.addEventListener('change', () => {
      note.textContent = CONTEXT_READINGS[sel.value] || '';
    });
  }

  // --- 8. REFLECTION LOCAL STORAGE ---
  function setupReflectionStorage() {
    const textarea = $('reflection');
    if (!textarea) return;

    const saved = localStorage.getItem('classroom_cuneiform_reflection');
    if (saved) textarea.value = saved;

    textarea.addEventListener('input', () => {
      localStorage.setItem('classroom_cuneiform_reflection', textarea.value);
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
