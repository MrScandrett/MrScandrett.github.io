/**
 * Horror in Literature · Interactive Reading Room Engine
 * Mr. Scandrett's ClassroomOS
 *
 * Powers:
 * 1. Dual-Axis Filtering (Genre + Grade Band)
 * 2. In-Page Excerpt Drawers
 * 3. 3-Pass Close-Reading Studio ("The Evidence Lab")
 * 4. Ann Radcliffe's Dial: Terror vs. Horror Analyzer
 * 5. Forensic Dossier Investigator (Hysteria vs. Due Process)
 * 6. Syntax & Pacing Rhythm Demonstrator
 * 7. Persistent Student Evidence Journal & Checklist (localStorage)
 */

(function () {
  'use strict';

  function initHistoryPresentation() {
    const section = document.getElementById('history');
    const slides = Array.from(section?.querySelectorAll('[data-history-slide]') || []);
    const controls = document.getElementById('history-controls');
    const counter = document.getElementById('history-counter');
    const previous = document.getElementById('history-prev');
    const next = document.getElementById('history-next');
    const stops = Array.from(section?.querySelectorAll('[data-history-go]') || []);
    if (!section || !slides.length || !controls || !counter || !previous || !next) return;

    let current = 0;
    function showSlide(index) {
      current = Math.max(0, Math.min(index, slides.length - 1));
      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle('is-active', slideIndex === current);
        slide.setAttribute('aria-hidden', slideIndex === current ? 'false' : 'true');
      });
      stops.forEach((button, stopIndex) => {
        if (stopIndex === current) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      counter.textContent = `Stop ${current + 1} of ${slides.length}`;
      previous.disabled = current === 0;
      next.disabled = current === slides.length - 1;
    }

    section.classList.add('is-presenting');
    controls.hidden = false;
    counter.hidden = false;
    previous.addEventListener('click', () => showSlide(current - 1));
    next.addEventListener('click', () => showSlide(current + 1));
    stops.forEach(button => {
      button.addEventListener('click', () => showSlide(Number(button.dataset.historyGo)));
    });
    showSlide(0);
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Dual-Axis Shelf Filter & Excerpt Drawers
  // ─────────────────────────────────────────────────────────────
  function initFilteringAndDrawers() {
    const genreBtns = Array.from(document.querySelectorAll('[data-filter-genre]'));
    const gradeBtns = Array.from(document.querySelectorAll('[data-filter-grade]'));
    const workCards = Array.from(document.querySelectorAll('.horror-work, .horror-scripture > li'));
    const sections = Array.from(document.querySelectorAll('.horror-shelf-section'));
    const countBadge = document.getElementById('horror-visible-count');

    let currentGenre = 'all';
    let currentGrade = 'all';

    function applyFilters() {
      let visibleWorks = 0;

      workCards.forEach(card => {
        const cardGenre = card.dataset.genre || (card.closest('[data-shelf]') ? card.closest('[data-shelf]').dataset.shelf : '');
        const cardGrades = (card.dataset.grade || '').split(' ');

        const matchesGenre = (currentGenre === 'all' || cardGenre === currentGenre);
        const matchesGrade = (currentGrade === 'all' || cardGrades.includes(currentGrade));

        if (matchesGenre && matchesGrade) {
          card.style.display = '';
          visibleWorks++;
        } else {
          card.style.display = 'none';
        }
      });

      // Show/hide parent sections based on whether any child works are visible
      sections.forEach(sec => {
        const hasVisibleChild = Array.from(sec.querySelectorAll('.horror-work, .horror-scripture > li')).some(c => c.style.display !== 'none');
        sec.style.display = hasVisibleChild ? '' : 'none';
      });

      if (countBadge) {
        countBadge.textContent = visibleWorks + ' works displayed';
      }
    }

    genreBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        genreBtns.forEach(b => {
          const active = (b === btn);
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        currentGenre = btn.getAttribute('data-filter-genre');
        applyFilters();
      });
    });

    gradeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        gradeBtns.forEach(b => {
          const active = (b === btn);
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        currentGrade = btn.getAttribute('data-filter-grade');
        applyFilters();
      });
    });

    // In-page excerpt toggle buttons
    document.querySelectorAll('.horror-drawer-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const drawer = btn.closest('.horror-work')?.querySelector('.horror-drawer');
        if (!drawer) return;
        const isHidden = drawer.hidden;
        drawer.hidden = !isHidden;
        btn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        btn.textContent = isHidden ? 'Close excerpt ▲' : 'Read excerpt in page ▼';
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. 3-Pass Close-Reading Studio ("The Evidence Lab")
  // ─────────────────────────────────────────────────────────────
  const PASSAGES = {
    poe: {
      title: 'Edgar Allan Poe · The Tell-Tale Heart (1843)',
      tradition: 'Gothic & Moral Dread',
      textHtml: `Was it possible they heard not? <span class="lab-token notice" data-note="notice-1">Almighty God!—no, no! They heard!—they suspected!—they knew!</span>—<span class="lab-token trace" data-note="trace-1">they were making a mockery of my horror!</span>—this I thought, and this I think. But anything was better than this agony! Anything was more tolerable than this derision! I could bear those hypocritical smiles no longer! I felt that I must scream or die!—and now—again!—<span class="lab-token notice" data-note="notice-2">hark! louder! louder! louder! louder!—</span><br><br>“Villains!” I shrieked, “<span class="lab-token trace" data-note="trace-2">dissemble no more!</span> <span class="lab-token discuss" data-note="discuss-1">I admit the deed!—tear up the planks!—here, here!—it is the beating of his hideous heart!</span>”`,
      notes: {
        'notice-1': {
          layer: 'Notice · Auditory & Rhythm',
          heading: 'Staccato repetition and gasping cadence',
          body: 'Poe uses short exclamations broken by dashes. The narrator speaks in frantic triples ("heard... suspected... knew"). The punctuation forces the reader to breathe at a panic pace.'
        },
        'notice-2': {
          layer: 'Notice · Acoustic crescendo',
          heading: 'The inescapable rhythm',
          body: 'The word "louder" repeats four times in unbroken succession, culminating in a dash. Notice that the sound exists entirely in his unhinged perception—the police officers continue smiling calmly.'
        },
        'trace-1': {
          layer: 'Trace · Narrator unreliability & paranoia',
          heading: 'Projecting guilt onto the listeners',
          body: 'The narrator accuses the officers of "mockery" and "hypocritical smiles." Conscience projects its own agony onto the outside world; he cannot conceive that they genuinely do not hear what is deafening him.'
        },
        'trace-2': {
          layer: 'Trace · Concealment imploding',
          heading: 'The word "dissemble"',
          body: 'He commands the officers to "dissemble no more" (stop concealing), when he himself was the only dissembler in the room. His own defense mechanisms shatter under moral panic.'
        },
        'discuss-1': {
          layer: 'Discuss · Moral & Theological stakes',
          heading: 'The voice of unconfessed guilt',
          body: 'Why does Poe make the heartbeat unquenchable? In Daniel Webster’s words (and Proverbs 28:1), human guilt cannot stay buried. The narrator’s confession is not legal remorse, but the involuntary surrender of a tortured conscience that cannot exist in silence.'
        }
      }
    },
    shelley: {
      title: 'Mary Shelley · Frankenstein (1818)',
      tradition: 'Sci-Fi & Speculative Dread',
      textHtml: `It was on a <span class="lab-token notice" data-note="notice-1">dreary night of November</span> that I beheld the accomplishment of my toils. With an anxiety that almost amounted to agony, I collected the instruments of life around me, that I might <span class="lab-token trace" data-note="trace-1">infuse a spark of being into the lifeless thing</span> that lay at my feet. It was already one in the morning; the rain pattered dismally against the panes, and my candle was nearly burnt out, when, by the glimmer of the half-extinguished light, <span class="lab-token notice" data-note="notice-2">I saw the dull yellow eye of the creature open</span>; it breathed hard, and a convulsive motion agitated its limbs...<br><br><span class="lab-token discuss" data-note="discuss-1">Now that I had finished, the beauty of the dream vanished, and breathless horror and disgust filled my heart.</span> Unable to endure the aspect of the being I had created, <span class="lab-token discuss" data-note="discuss-2">I rushed out of the room</span>...`,
      notes: {
        'notice-1': {
          layer: 'Notice · Atmosphere & Somber lighting',
          heading: 'Flickering candlelight and cold rain',
          body: 'Shelley sets the creation scene not in a dazzling laboratory of lightning sparks (as cinema later invented), but in dim, dying candlelight, rain tapping dismally, and cold solitary exhaustion.'
        },
        'notice-2': {
          layer: 'Notice · The awakening detail',
          heading: 'The dull yellow eye',
          body: 'Look at the color choice: not blazing fire, but "dull yellow." The creature does not attack; it merely opens an eye and breathes. The terror is Victor’s immediate revulsion.'
        },
        'trace-1': {
          layer: 'Trace · Usurping creation',
          heading: 'Playing God without divine love',
          body: 'Victor describes his goal as infusing a "spark of being," echoing Prometheus and Genesis. Yet he sought the glory of creation without any concept of fatherhood, stewardship, or care for the creature.'
        },
        'discuss-1': {
          layer: 'Discuss · The vanishing of the dream',
          heading: 'Hubris meeting reality',
          body: 'The exact second the experiment succeeds, "the beauty of the dream vanished." Scientific pride imagines total mastery; the actual reality of bodily frailty and responsibility immediately horrifies the creator.'
        },
        'discuss-2': {
          layer: 'Discuss · Moral abandonment',
          heading: 'Flight from ethical responsibility',
          body: 'Victor’s first act as a creator is to flee the room and abandon a newborn creature to fend for itself. Shelley locates true horror not in the monster, but in the creator’s moral cowardice and refusal of parental covenant.'
        }
      }
    },
    webster: {
      title: 'Daniel Webster · Murder of Capt. White (1830 Courtroom Speech)',
      tradition: 'Forensic & Conscience Dread',
      textHtml: `<span class="lab-token trace" data-note="trace-1">The secret is his own, and it is horrifying to him.</span> He thinks that the whole world sees it in his face, reads it in his eyes, and hears its whisperings in every breeze. It has become his master. It betrays his discretion, it breaks down his courage, it conquers his will... <span class="lab-token notice" data-note="notice-1">The whole creation of God has neither nook nor corner where the guilty can bestow it, and say it is safe.</span><br><br><span class="lab-token notice" data-note="notice-2">A thousand eyes inspect him, a thousand ears catch every syllable, and the very walls echo his guilt.</span> <span class="lab-token discuss" data-note="discuss-1">He has confessed it in his heart; he must soon confess it with his tongue.</span>`,
      notes: {
        'notice-1': {
          layer: 'Notice · Spatial imagery',
          heading: 'No nook nor corner in creation',
          body: 'Webster expands the physical setting from a Salem parlor to "the whole creation of God." The criminal searches for a hiding place, but finds that the cosmos itself is morally structured against concealment.'
        },
        'notice-2': {
          layer: 'Notice · Sensory amplification',
          heading: 'Whispering breezes and echoing walls',
          body: 'Webster shows how hidden guilt transforms harmless natural surroundings into witnesses. Notice the sensory words: eyes inspect, ears catch syllables, walls echo.'
        },
        'trace-1': {
          layer: 'Trace · Conscience as an internal tyrant',
          heading: 'The secret becomes his master',
          body: 'The perpetrator believed keeping the secret gave him power. Webster traces how concealment inverts this: the secret enslaves him, destroying his courage and discretion from within.'
        },
        'discuss-1': {
          layer: 'Discuss · The inevitability of justice',
          heading: 'God’s witness in the breast',
          body: 'Webster argues that God implanted conscience so deeply that truth must inevitably break through human deception. This historic speech was studied by Edgar Allan Poe before writing "The Tell-Tale Heart."'
        }
      }
    },
    salem: {
      title: 'Salem Court Records · Examination of Rebecca Nurse (1692)',
      tradition: 'Forensic Dread & False Accusation',
      textHtml: `<em>Magistrate Hathorne:</em> “What do you say (speaking to one afflicted) have you seen this woman hurt you?”<br><em>Afflicted:</em> “<span class="lab-token trace" data-note="trace-1">Yes, she beat me this morning.</span>”<br><em>Magistrate:</em> “What do you say to them?”<br><em>Rebecca Nurse:</em> “<span class="lab-token notice" data-note="notice-1">I can say before my Maker, the living God, that I am innocent, and God will clear my innocency.</span>”<br><em>Magistrate:</em> “<span class="lab-token trace" data-note="trace-2">They accuse you of hurting them, and see what a condition they are in even now before us.</span>”<br><em>Rebecca Nurse:</em> “<span class="lab-token discuss" data-note="discuss-1">I have nobody to look to but God. I cannot help what they say. I will not belie my own soul for all the world.</span>”`,
      notes: {
        'notice-1': {
          layer: 'Notice · Calm dignity vs. theatrical screams',
          heading: 'A 71-year-old grandmother before judges',
          body: 'Notice the quiet, steady tone of Rebecca Nurse compared to the chaotic courtroom. She appeals directly to her Maker rather than matching the magistrates’ aggressive rhetoric.'
        },
        'trace-1': {
          layer: 'Trace · Spectral evidence loophole',
          heading: 'Unfalsifiable accusations',
          body: 'The accusers claim her "spectre" pinched them while her physical body was at home. Because spectral evidence cannot be tested by eyes or cross-examination, the court abandoned real forensic inquiry for mass delusion.'
        },
        'trace-2': {
          layer: 'Trace · Judicial presumption of guilt',
          heading: 'Reversing the burden of proof',
          body: 'The magistrate points to the girls falling into fits as "proof" of Nurse’s guilt, demanding she prove why they are acting that way. The court abandons biblical standards of two physical witnesses (Deut. 19:15).'
        },
        'discuss-1': {
          layer: 'Discuss · Choosing death over a lie',
          heading: 'Christian integrity against tyranny',
          body: 'Under Salem law, those who falsely confessed to witchcraft were spared; those who maintained innocence were hanged. Nurse refused to "belie her own soul." Her martyrdom broke the Salem hysteria by showing that Christian truth matters more than mortal life.'
        }
      }
    },
    daniel: {
      title: 'Daniel 5 · The Writing on the Wall (Holy Awe)',
      tradition: 'Holy Awe (Biblical Fear)',
      textHtml: `Belshazzar the king made a great feast... and <span class="lab-token trace" data-note="trace-1">drank wine in the golden vessels that were taken out of the temple of the house of God</span>...<br><br>In the same hour came forth <span class="lab-token notice" data-note="notice-1">fingers of a man’s hand, and wrote over against the candlestick upon the plaister of the wall</span> of the king’s palace: and the king saw the part of the hand that wrote.<br><br>Then <span class="lab-token notice" data-note="notice-2">the king’s countenance was changed, and his thoughts troubled him, so that the joints of his loins were loosed, and his knees smote one against another</span>.<br><br><span class="lab-token discuss" data-note="discuss-1">And this is the writing: MENE, MENE, TEKEL, UPHARSIN... Thou art weighed in the balances, and art found wanting.</span>`,
      notes: {
        'notice-1': {
          layer: 'Notice · Lighting and visual starkness',
          heading: 'Fingers on the whitewashed plaster',
          body: 'The hand writes right beside the royal candlestick, against the bright white plaster. The vision is silent, stark, and impossible to mistake or dismiss.'
        },
        'notice-2': {
          layer: 'Notice · Physical collapse',
          heading: 'Knees smiting together',
          body: 'The imperial monarch who felt invincible minutes before collapses physically: his face pales, his hip joints loosen, and his knees knock together. Worldly bravado dissolves in an instant before divine presence.'
        },
        'trace-1': {
          layer: 'Trace · Deliberate desecration',
          heading: 'The pride that preceded the fall',
          body: 'Belshazzar did not merely drink wine; he deliberately summoned the consecrated vessels of the Jerusalem temple to toast pagan idols. The dread that follows is not random misfortune, but divine response to intentional blasphemy.'
        },
        'discuss-1': {
          layer: 'Discuss · Divine sovereignty & accountability',
          heading: 'Weighed and found wanting',
          body: 'The fear here is not Gothic superstition or psychological projection; it is the holy terror of an earthly ruler brought before the Judge of the universe. The kingdom fell that very night, proving the solemn reality of God’s covenantal word.'
        }
      }
    }
  };

  function initReadingLab() {
    const passageSelect = document.getElementById('lab-passage-select');
    const passageTitle = document.getElementById('lab-passage-title');
    const passageTradition = document.getElementById('lab-passage-tradition');
    const textContainer = document.getElementById('lab-text-container');
    const noteHeading = document.getElementById('lab-note-heading');
    const noteLayer = document.getElementById('lab-note-layer');
    const noteBody = document.getElementById('lab-note-body');
    const layerButtons = Array.from(document.querySelectorAll('[data-layer-toggle]'));

    if (!passageSelect || !textContainer) return;

    let activeLayer = 'all';
    let currentPassageKey = passageSelect.value || 'poe';

    function renderPassage(key) {
      const data = PASSAGES[key];
      if (!data) return;

      currentPassageKey = key;
      passageTitle.textContent = data.title;
      passageTradition.textContent = data.tradition;
      textContainer.innerHTML = data.textHtml;

      // Reset note card
      const firstNoteKey = Object.keys(data.notes)[0];
      showNote(firstNoteKey, data.notes[firstNoteKey]);

      // Apply layer filtering
      applyLayerVisibility();

      // Attach token click handlers
      textContainer.querySelectorAll('.lab-token').forEach(token => {
        token.addEventListener('click', () => {
          textContainer.querySelectorAll('.lab-token').forEach(t => t.classList.remove('selected'));
          token.classList.add('selected');
          const noteKey = token.dataset.note;
          if (data.notes[noteKey]) {
            showNote(noteKey, data.notes[noteKey]);
          }
        });
      });
    }

    function showNote(key, note) {
      if (!note) return;
      noteLayer.textContent = note.layer;
      noteHeading.textContent = note.heading;
      noteBody.textContent = note.body;
    }

    function applyLayerVisibility() {
      const tokens = textContainer.querySelectorAll('.lab-token');
      tokens.forEach(tok => {
        if (activeLayer === 'all') {
          tok.classList.remove('dimmed');
        } else if (tok.classList.contains(activeLayer)) {
          tok.classList.remove('dimmed');
        } else {
          tok.classList.add('dimmed');
        }
      });
    }

    passageSelect.addEventListener('change', () => {
      renderPassage(passageSelect.value);
    });

    layerButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        layerButtons.forEach(b => {
          const isActive = (b === btn);
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        activeLayer = btn.dataset.layerToggle;
        applyLayerVisibility();
      });
    });

    renderPassage('poe');
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Ann Radcliffe's Dial: Terror vs. Horror Analyzer
  // ─────────────────────────────────────────────────────────────
  const RADCLIFFE_PRESETS = {
    paw: {
      title: "W.W. Jacobs · The Monkey's Paw (1902)",
      quote: "The knock at the door comes in the dead of night. The mother struggles frantic with the top bolt; the father fumbles desperately on the floor for the paw to make his third and final wish. The bolt slides back; the door swings wide into the cold darkness — and the street lamp flickers on a quiet, deserted road.",
      terrorHorror: 92, // High Terror
      obscurity: 90,     // High Obscurity (we never see what was knocking)
      anticipation: 95,  // Huge Anticipation
      moralGravity: 85,  // Tampering with Providence
      analysis: "Radcliffe’s ideal of sublime terror: the faculties are expanded to maximum pitch by the sound of the knock and what the reader’s mind imagines on the doorstep. By opening onto an empty, silent street, Jacobs preserves awe, grief, and moral consequence without resorting to gruesome physical spectacle."
    },
    frankenstein: {
      title: "Mary Shelley · Frankenstein (1818)",
      quote: "Victor beholds the yellow eye open and immediately flees into the streets of Ingolstadt, pacing through the pouring rain in frantic dread, dreading to return to his apartment yet terrified of what lurks in the city.",
      terrorHorror: 80,
      obscurity: 75,
      anticipation: 85,
      moralGravity: 95,
      analysis: "Shelley combines speculative terror with intense moral dread. The creature is not an unseen phantom, but Victor’s terror stems from the immediate moral realization of what his pride has unleashed and his total ethical abdication."
    },
    sleepy: {
      title: "Washington Irving · Sleepy Hollow (1820)",
      quote: "Ichabod cranes his neck into the dark shadow of the trees at Wiley’s Swamp. A huge, misshapen black form looms on the roadside, refusing to answer his trembling challenge, before spurring forward in silent gallop.",
      terrorHorror: 70,
      obscurity: 85,
      anticipation: 80,
      moralGravity: 40,
      analysis: "Playful folklore terror. Irving delays the reveal with lush autumn landscape, fireside superstition, and Ichabod’s superstitious imagination. The climax preserves mystery: was it a spectral Hessian or Brom Bones with a shattered pumpkin?"
    },
    slasher: {
      title: "Modern Shock / Graphic Horror (Contrast Case)",
      quote: "A monster or masked figure suddenly leaps through a shattered glass window directly into the camera lens with a blaring audio stinger, revealing detailed graphic carnage.",
      terrorHorror: 15, // High Horror / Low Terror
      obscurity: 10,     // Total graphic clarity
      anticipation: 20,  // Jump shock with little atmosphere
      moralGravity: 10,  // Visceral startle without moral choice
      analysis: "What Ann Radcliffe warned against as mere 'horror': it contracts and freezes the soul through sensory disgust and sudden physical shock. There is no space for anticipation, conscience, or awe. The effect is momentary and depleting rather than contemplative."
    }
  };

  function initRadcliffeDial() {
    const presetBtns = Array.from(document.querySelectorAll('[data-radcliffe-preset]'));
    const quoteEl = document.getElementById('radcliffe-quote');
    const titleEl = document.getElementById('radcliffe-title');
    const meterFill = document.getElementById('radcliffe-meter-fill');
    const meterLabel = document.getElementById('radcliffe-meter-label');
    const barObscurity = document.getElementById('bar-obscurity');
    const barAnticipation = document.getElementById('bar-anticipation');
    const barMoral = document.getElementById('bar-moral');
    const analysisEl = document.getElementById('radcliffe-analysis');

    if (!quoteEl || !meterFill) return;

    function applyPreset(key) {
      const data = RADCLIFFE_PRESETS[key];
      if (!data) return;

      titleEl.textContent = data.title;
      quoteEl.textContent = data.quote;
      meterFill.style.width = data.terrorHorror + '%';

      if (data.terrorHorror >= 60) {
        meterFill.style.background = 'linear-gradient(90deg, #a96767, #c49b69, #e1c48d)';
        meterLabel.textContent = data.terrorHorror + '% Terror (Soul-Expanding Dread & Suspense)';
      } else {
        meterFill.style.background = '#8faeac';
        meterLabel.textContent = (100 - data.terrorHorror) + '% Horror (Contracting Graphic Shock)';
      }

      barObscurity.style.width = data.obscurity + '%';
      barAnticipation.style.width = data.anticipation + '%';
      barMoral.style.width = data.moralGravity + '%';
      analysisEl.textContent = data.analysis;
    }

    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => {
          const active = (b === btn);
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        applyPreset(btn.dataset.radcliffePreset);
      });
    });

    applyPreset('paw');
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Forensic Dossier Investigator (Hysteria vs. Due Process)
  // ─────────────────────────────────────────────────────────────
  const FORENSIC_CASES = {
    salem: {
      title: "Salem Court (1692) · The Trial of Rebecca Nurse",
      rumorHeading: "The Hysteria & Spectral Claim",
      rumorText: "Afflicted young girls fell into fits, claiming that Rebecca Nurse’s invisible 'spectre' was biting, pinching, and choking them. Magistrates believed Satan could not represent an innocent person’s shape, meaning any spectral vision was infallible proof of guilt.",
      evidenceHeading: "What Truth & Biblical Due Process Proved",
      evidenceText: "Thirty-nine neighbors signed a brave petition attesting to Nurse’s blameless Christian charity. The 'evidence' was entirely invisible hallucination. Nurse refused to save her life with a false confession, upholding the Ninth Commandment (Exodus 20:16). Salem later repented and compensated her heirs.",
      principle: "Biblical & Legal Due Process: Two physical, accountable witnesses required (Deuteronomy 19:15); unfalsifiable rumors cannot justify judicial punishment."
    },
    webster: {
      title: "Salem Court (1830) · Daniel Webster on the Murder of Capt. White",
      rumorHeading: "The Myth of the Flawless Secret Crime",
      rumorText: "The Knapp brothers believed they had hired an assassin who struck an elderly merchant in total midnight silence, leaving zero witnesses, no forced entry, and zero clues. They celebrated believing human justice was permanently blinded.",
      evidenceHeading: "The Inward Collapse of the Guilty Mind",
      evidenceText: "Conscience became their undoing. Paranoia drove one brother to send anonymous blackmail letters that exposed the conspiracy. Webster demonstrated to the jury that God built human psychology such that unconfessed guilt eats the mind alive until it demands confession.",
      principle: "Proverbs 28:1: 'The wicked flee when no man pursueth.' Conscience acts as God’s internal witness against the wrongdoer."
    },
    edalji: {
      title: "Great Wyrley (1906) · Arthur Conan Doyle & George Edalji",
      rumorHeading: "The Scapegoat & Racial Preconceptions",
      rumorText: "When livestock were mysteriously maimed at night across Staffordshire, local police pinned the blame on George Edalji, a quiet solicitor of Indian descent. Police fabricated handwriting matches and claimed he prowled pitch-black fields without light.",
      evidenceHeading: "Forensic Optics & Soil Science",
      evidenceText: "Sir Arthur Conan Doyle personally examined Edalji and discovered he suffered from 8 diopters of severe myopia—he could not recognize someone across a room, let alone navigate nocturnal bogs. Doyle analyzed the mud on his boots, proving it mismatched the crime scene soil, completely exonerating him.",
      principle: "Proverbs 31:8: 'Open thy mouth for the dumb in the cause of all such as are appointed to destruction.' Rigorous empirical observation dismantles racial prejudice."
    },
    celeste: {
      title: "Atlantic Ocean (1872) · The Mystery of the Mary Celeste",
      rumorHeading: "Sensational Rumors & Monster Myths",
      rumorText: "Newspaper tabloids spun wild fantasies: mutinous bloodbath, sea monsters, alien abduction, or a demonic curse. Writers claimed half-eaten breakfasts and still-steaming teacups were found on the salon table.",
      evidenceHeading: "The Navigational Log & Alcohol Vapor",
      evidenceText: "The official Court of Inquiry found zero bloodstains, no weapon marks, and cargo intact: 1,701 barrels of industrial alcohol, 9 of which were empty. The crew left in their single yawl with navigational charts and compass. A pressure build-up of flammable alcohol vapors likely caused the captain to order temporary evacuation before an ocean squall cut the towline.",
      principle: "Deductive Forensic Care: Separating verified physical logs from sensational narrative embellishment."
    }
  };

  function initForensicCasebook() {
    const caseBtns = Array.from(document.querySelectorAll('[data-forensic-case]'));
    const titleEl = document.getElementById('forensic-title');
    const rumorHead = document.getElementById('forensic-rumor-head');
    const rumorBody = document.getElementById('forensic-rumor-body');
    const factHead = document.getElementById('forensic-fact-head');
    const factBody = document.getElementById('forensic-fact-body');
    const principleEl = document.getElementById('forensic-principle');

    if (!titleEl || !rumorBody) return;

    function renderCase(key) {
      const data = FORENSIC_CASES[key];
      if (!data) return;

      titleEl.textContent = data.title;
      rumorHead.textContent = data.rumorHeading;
      rumorBody.textContent = data.rumorText;
      factHead.textContent = data.evidenceHeading;
      factBody.textContent = data.evidenceText;
      principleEl.textContent = data.principle;
    }

    caseBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        caseBtns.forEach(b => {
          const active = (b === btn);
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        renderCase(btn.dataset.forensicCase);
      });
    });

    renderCase('salem');
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Syntax & Pacing Rhythm Demonstrator
  // ─────────────────────────────────────────────────────────────
  function initSyntaxVisualizer() {
    const btnPoe = document.getElementById('syntax-btn-poe');
    const btnIrving = document.getElementById('syntax-btn-irving');
    const passageBox = document.getElementById('syntax-passage');
    const statsBox = document.getElementById('syntax-stats');
    const pulseBox = document.getElementById('syntax-pulse-indicator');

    if (!btnPoe || !btnIrving || !passageBox) return;

    const POE_DATA = {
      text: "Was it possible they heard not? Almighty God!—no, no! They heard!—they suspected!—they knew!—they were making a mockery of my horror!—this I thought, and this I think. But anything was better than this agony! Anything was more tolerable than this derision! I could bear those hypocritical smiles no longer!",
      avgWords: "4.8 words per clause",
      dashes: "6 dashes in 3 lines",
      rhythm: "Rapid, hyper-ventilating staccato (130+ BPM equivalent)",
      pulseSpeed: "0.5s"
    };

    const IRVING_DATA = {
      text: "In the dark shadow of the grove, on the margin of the brook, he beheld something huge, misshapen, black and towering. It stirred not, but seemed gathered up in the gloom, like some gigantic monster ready to spring upon the traveller. The hair of the affrighted pedagogue rose upon his head with terror. What was to be done?",
      avgWords: "14.2 words per clause",
      dashes: "0 dashes (periodic clauses with commas)",
      rhythm: "Deliberate, creeping, atmospheric suspension (65 BPM equivalent)",
      pulseSpeed: "1.2s"
    };

    function setSyntax(data, isPoe) {
      btnPoe.classList.toggle('active', isPoe);
      btnPoe.setAttribute('aria-pressed', isPoe ? 'true' : 'false');
      btnIrving.classList.toggle('active', !isPoe);
      btnIrving.setAttribute('aria-pressed', !isPoe ? 'true' : 'false');

      passageBox.textContent = data.text;
      statsBox.innerHTML = `<strong>Average clause length:</strong> ${data.avgWords}<br><strong>Punctuation style:</strong> ${data.dashes}<br><strong>Syntactic tempo:</strong> ${data.rhythm}`;
      if (pulseBox) {
        pulseBox.style.animationDuration = data.pulseSpeed;
      }
    }

    btnPoe.addEventListener('click', () => setSyntax(POE_DATA, true));
    btnIrving.addEventListener('click', () => setSyntax(IRVING_DATA, false));

    setSyntax(POE_DATA, true);
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Persistent Student Evidence Journal & Checklist (localStorage)
  // ─────────────────────────────────────────────────────────────
  function initEvidenceJournal() {
    const storageKey = 'classroomos-horror-literature-v1';
    const select = document.getElementById('horror-journal-work');
    const status = document.getElementById('horror-save-status');
    const fields = ['journal-notice', 'journal-trace', 'journal-discuss', 'journal-revision'];
    const checks = Array.from(document.querySelectorAll('[data-read-work]'));
    const downloadBtn = document.getElementById('horror-download-journal');
    const printBtn = document.getElementById('horror-print-journal');
    const clearBtn = document.getElementById('horror-clear-journal');
    const confirmBox = document.getElementById('horror-clear-confirm');
    const confirmYes = document.getElementById('horror-confirm-clear');
    const confirmNo = document.getElementById('horror-cancel-clear');
    const progressEl = document.getElementById('horror-journal-progress');

    let state = {
      studentName: '',
      entries: {},
      read: []
    };
    let storageAvailable = true;

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && typeof saved === 'object') {
        state.studentName = typeof saved.studentName === 'string' ? saved.studentName : '';
        state.entries = (saved.entries && typeof saved.entries === 'object') ? saved.entries : {};
        state.read = Array.isArray(saved.read) ? saved.read : [];
      }
    } catch (_) {
      storageAvailable = false;
    }

    function saveState() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
        storageAvailable = true;
        if (status) status.textContent = 'Saved in this browser. Download a copy to share or print for seminar.';
      } catch (_) {
        storageAvailable = false;
        if (status) status.textContent = 'Browser storage is unavailable. Download notes before navigating away.';
      }
    }

    function updateProgress() {
      if (!progressEl) return;
      const count = checks.filter(c => c.checked).length;
      progressEl.textContent = `${count} of ${checks.length} works studied.`;
    }

    function loadActiveEntry() {
      if (!select) return;
      const currentWork = select.value;
      const entry = state.entries[currentWork] || {};
      fields.forEach(fid => {
        const el = document.getElementById(fid);
        if (el) el.value = entry[fid] || '';
      });
    }

    function captureActiveEntry() {
      if (!select) return;
      const currentWork = select.value;
      const entry = {};
      fields.forEach(fid => {
        const el = document.getElementById(fid);
        if (el) entry[fid] = el.value;
      });
      state.entries[currentWork] = entry;
    }

    if (select) {
      select.addEventListener('change', loadActiveEntry);
    }

    const journalFieldsContainer = document.querySelector('.horror-journal-fields');
    if (journalFieldsContainer) {
      journalFieldsContainer.addEventListener('input', () => {
        captureActiveEntry();
        saveState();
      });
    }

    checks.forEach(chk => {
      chk.checked = state.read.includes(chk.dataset.readWork);
      chk.addEventListener('change', () => {
        state.read = checks.filter(c => c.checked).map(c => c.dataset.readWork);
        updateProgress();
        saveState();
      });
    });

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        captureActiveEntry();
        let out = "Horror in Literature · Student Evidence Journal\n";
        out += "Mr. Scandrett's ClassroomOS\n";
        out += "Works studied: " + (state.read.join(', ') || 'None marked') + "\n";
        out += "=========================================================\n\n";

        const workKeys = Object.keys(state.entries);
        if (!workKeys.length) {
          out += "No journal entries recorded yet.\n";
        } else {
          workKeys.forEach(key => {
            const entry = state.entries[key];
            const hasData = fields.some(f => entry[f] && entry[f].trim());
            if (!hasData) return;

            out += `WORK / PASSAGE: ${key.toUpperCase()}\n`;
            out += `1. Notice (Textual detail & scene): ${entry['journal-notice'] || '—'}\n`;
            out += `2. Trace (Concealment & irony): ${entry['journal-trace'] || '—'}\n`;
            out += `3. Discuss (Moral choice & stakes): ${entry['journal-discuss'] || '—'}\n`;
            out += `4. Revised thinking after seminar: ${entry['journal-revision'] || '—'}\n`;
            out += "---------------------------------------------------------\n\n";
          });
        }

        const blob = new Blob([out], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'horror-in-literature-evidence-journal.txt';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    }

    if (printBtn) {
      printBtn.addEventListener('click', () => {
        captureActiveEntry();
        window.print();
      });
    }

    if (clearBtn && confirmBox) {
      clearBtn.addEventListener('click', () => { confirmBox.hidden = false; });
      confirmNo.addEventListener('click', () => { confirmBox.hidden = true; });
      confirmYes.addEventListener('click', () => {
        state = { studentName: '', entries: {}, read: [] };
        try { localStorage.removeItem(storageKey); } catch (_) {}
        checks.forEach(c => { c.checked = false; });
        loadActiveEntry();
        updateProgress();
        confirmBox.hidden = true;
        if (status) status.textContent = 'Saved notes and reading checks cleared.';
      });
    }

    loadActiveEntry();
    updateProgress();
  }

  // ─────────────────────────────────────────────────────────────
  // DOMContentLoaded bootstrap
  // ─────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initHistoryPresentation();
    initFilteringAndDrawers();
    initReadingLab();
    initRadcliffeDial();
    initForensicCasebook();
    initSyntaxVisualizer();
    initEvidenceJournal();
  });
})();

