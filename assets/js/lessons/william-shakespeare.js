/* Interactive labs, filters, Web Audio heartbeat engine, and self-checking quiz
   for lessons/language-literature/pioneers/william-shakespeare.html. */
(function () {
  'use strict';

  /* ── Shared Lazy Web Audio Heartbeat Synth ─────────────────────── */
  var audioCtx = null;
  function getAudioContext() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function () {});
    }
    return audioCtx;
  }

  function playBeat(type) {
    try {
      var ctx = getAudioContext();
      if (!ctx) return;
      var now = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'stress') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(165, now);
        osc.frequency.exponentialRampToValueAtTime(72, now + 0.14);
        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'extra') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.11);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(115, now);
        osc.frequency.exponentialRampToValueAtTime(64, now + 0.09);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch (e) {
      /* Audio playback blocked or unsupported */
    }
  }

  /* ── Lab 1: Heartbeat & Broken Pulse Scansion Lab ────────────── */
  var LINES = {
    sonnet18: {
      playTitle: 'Sonnet 18',
      actScene: 'Line 1 (1609 Quarto)',
      meterType: 'Regular · 10 syllables (5 iambs)',
      insight: 'Notice how steady, unhurried iambs mirror calm admiration: every second beat rises smoothly.',
      readerUrl: '',
      libraryUrl: '../../../library.html?q=Shakespeare',
      syllables: [
        { text: 'Shall', stress: false }, { text: 'I', stress: true },
        { text: 'com-', stress: false }, { text: 'PARE', stress: true },
        { text: 'thee', stress: false }, { text: 'TO', stress: true },
        { text: 'a', stress: false }, { text: 'SUM-', stress: true },
        { text: 'mer’s', stress: false }, { text: 'DAY?', stress: true }
      ]
    },
    romeo: {
      playTitle: 'Romeo and Juliet',
      actScene: 'Prologue, Line 1',
      meterType: 'Regular · 10 syllables (5 iambs)',
      insight: 'Before a single sword is drawn, the Chorus locks the audience into a ticking, inescapable pulse of fate.',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1513&title=Romeo%20and%20Juliet&author=William%20Shakespeare',
      libraryUrl: '../../../library.html?q=Romeo%20and%20Juliet',
      syllables: [
        { text: 'Two', stress: false }, { text: 'HOUSE-', stress: true },
        { text: 'holds,', stress: false }, { text: 'BOTH', stress: true },
        { text: 'a-', stress: false }, { text: 'LIKE', stress: true },
        { text: 'in', stress: false }, { text: 'DIG-', stress: true },
        { text: 'ni-', stress: false }, { text: 'TY', stress: true }
      ]
    },
    macbeth: {
      playTitle: 'Macbeth',
      actScene: 'Act 2, scene 2',
      meterType: 'Regular · 10 syllables (5 iambs)',
      insight: 'Lady Macbeth tries to force panic back into calm order with a cool, even heartbeat—even with blood on her hands.',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1533',
      libraryUrl: '../../../library.html?q=Macbeth',
      syllables: [
        { text: 'A', stress: false }, { text: 'LIT-', stress: true },
        { text: 'tle', stress: false }, { text: 'WA-', stress: true },
        { text: 'ter', stress: false }, { text: 'CLEARS', stress: true },
        { text: 'us', stress: false }, { text: 'OF', stress: true },
        { text: 'this', stress: false }, { text: 'DEED', stress: true }
      ]
    },
    hamlet: {
      playTitle: 'Hamlet',
      actScene: 'Act 3, scene 1',
      meterType: 'Broken · 11 syllables + mid-line caesura',
      insight: 'An extra 11th unstressed syllable (“-tion”) leaves the line hanging in mid-air after a sharp mid-line pause (//). Hamlet hesitates.',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1524&title=Hamlet&author=William%20Shakespeare',
      libraryUrl: '../../../library.html?q=Hamlet',
      syllables: [
        { text: 'To', stress: false }, { text: 'BE,', stress: true },
        { text: 'or', stress: false }, { text: 'NOT', stress: true },
        { text: 'to', stress: false }, { text: 'BE,', stress: true, caesuraAfter: true },
        { text: 'that', stress: false }, { text: 'IS', stress: true },
        { text: 'the', stress: false }, { text: 'QUES-', stress: true },
        { text: '-tion', stress: false, extra: true }
      ]
    },
    caesar: {
      playTitle: 'Julius Caesar',
      actScene: 'Act 3, scene 2',
      meterType: 'Trochaic flip · Opening double punch',
      insight: 'Antony opens with a reversed first foot (“FRIENDS, Ro-”) to cut over a shouting Roman crowd before sliding back into steady verse.',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1522&title=Julius%20Caesar&author=William%20Shakespeare',
      libraryUrl: '../../../library.html?q=Julius%20Caesar',
      syllables: [
        { text: 'FRIENDS,', stress: true }, { text: 'Ro-', stress: false },
        { text: '-mans,', stress: false }, { text: 'COUN-', stress: true },
        { text: '-try-', stress: false }, { text: 'MEN,', stress: true, caesuraAfter: true },
        { text: 'lend', stress: false }, { text: 'ME', stress: true },
        { text: 'your', stress: false }, { text: 'EARS', stress: true }
      ]
    },
    tempest: {
      playTitle: 'The Tempest',
      actScene: 'Act 3, scene 2',
      meterType: 'Regular · 10 syllables + sound imagery',
      insight: 'Even Caliban speaks in crystalline iambic pentameter when describing the island’s music—revealing unexpected tenderness.',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1540&title=The%20Tempest&author=William%20Shakespeare',
      libraryUrl: '../../../library.html?q=Tempest',
      syllables: [
        { text: 'Be', stress: false }, { text: 'NOT', stress: true },
        { text: 'a-', stress: false }, { text: 'FEARD;', stress: true, caesuraAfter: true },
        { text: 'the', stress: false }, { text: 'ISLE', stress: true },
        { text: 'is', stress: false }, { text: 'FULL', stress: true },
        { text: 'of', stress: false }, { text: 'NOIS-', stress: true },
        { text: '-es', stress: false, extra: true }
      ]
    }
  };

  var feetEl = document.getElementById('sh-meter-feet');
  var statusEl = document.getElementById('sh-meter-status');
  var playTitleEl = document.getElementById('sh-meter-play');
  var meterTypeEl = document.getElementById('sh-meter-type');
  var insightEl = document.getElementById('sh-meter-insight');
  var meterLinkEl = document.getElementById('sh-meter-link');
  var playBtn = document.getElementById('sh-play-beat');
  var stepBtn = document.getElementById('sh-step-beat');
  var checkMeterBtn = document.getElementById('sh-check-meter');
  var resetMeterBtn = document.getElementById('sh-reset-meter');
  var tempoInput = document.getElementById('sh-tempo');
  var tempoLabel = document.getElementById('sh-tempo-val');

  var activeLineKey = 'sonnet18';
  var meterMode = 'explore'; // 'explore' | 'practice'
  var currentSyllableIdx = -1;
  var playTimer = null;
  var pickedMap = {};
  var checkedPractice = false;

  function stopPlayback() {
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
    if (playBtn) {
      playBtn.textContent = '▶ Play Heartbeat';
      playBtn.setAttribute('aria-pressed', 'false');
    }
  }

  function cleanDisplayText(raw) {
    return raw.toLowerCase().replace(/^./, function (c) { return c.toUpperCase(); });
  }

  function renderMeterLine(key) {
    if (!feetEl || !LINES[key]) return;
    activeLineKey = key;
    currentSyllableIdx = -1;
    pickedMap = {};
    checkedPractice = false;
    stopPlayback();

    var data = LINES[key];
    if (playTitleEl) playTitleEl.textContent = data.playTitle + ' · ' + data.actScene;
    if (meterTypeEl) meterTypeEl.textContent = data.meterType;
    if (insightEl) insightEl.textContent = data.insight;
    if (meterLinkEl) {
      if (data.readerUrl) {
        meterLinkEl.href = data.readerUrl;
        meterLinkEl.textContent = 'Read ' + data.playTitle + ' in Reader →';
        meterLinkEl.setAttribute('aria-label', 'Read ' + data.playTitle + ' in ClassroomOS Reader');
      } else {
        meterLinkEl.href = data.libraryUrl;
        meterLinkEl.textContent = 'Browse Shakespeare in Library →';
        meterLinkEl.setAttribute('aria-label', 'Browse Shakespeare in ClassroomOS Library');
      }
    }

    if (checkMeterBtn) checkMeterBtn.hidden = meterMode !== 'practice';
    if (resetMeterBtn) resetMeterBtn.hidden = meterMode !== 'practice';
    if (playBtn) playBtn.hidden = meterMode === 'practice';
    if (stepBtn) stepBtn.hidden = meterMode === 'practice';

    if (statusEl) {
      statusEl.textContent = meterMode === 'practice'
        ? 'Practice Mode: tap the syllables you think carry a heavy beat (DUM), then select Check Scansion.'
        : 'Click any syllable tile—or press Play Heartbeat—to hear where the pulse lands.';
    }

    feetEl.replaceChildren();
    data.syllables.forEach(function (syl, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sh-syllable';
      btn.id = 'sh-syl-' + i;
      btn.dataset.idx = String(i);

      if (meterMode === 'explore') {
        if (syl.stress) btn.classList.add('is-stress');
        if (syl.extra) btn.classList.add('is-extra');
      }

      var textSpan = document.createElement('span');
      textSpan.className = 'sh-syl-text';
      textSpan.textContent = meterMode === 'practice'
        ? (i === 0 ? cleanDisplayText(syl.text) : syl.text.toLowerCase())
        : syl.text;

      var markSpan = document.createElement('span');
      markSpan.className = 'sh-syl-mark';
      markSpan.textContent = meterMode === 'practice'
        ? '?'
        : (syl.extra ? 'extra (˘)' : syl.stress ? 'DUM (–)' : 'da (˘)');

      btn.appendChild(textSpan);
      btn.appendChild(markSpan);
      btn.setAttribute(
        'aria-label',
        meterMode === 'practice'
          ? 'Syllable ' + (i + 1) + ': ' + syl.text.toLowerCase() + ', toggle stress guess'
          : syl.text + (syl.stress ? ', stressed beat' : ', unstressed beat')
      );

      btn.addEventListener('click', function () {
        if (meterMode === 'practice') {
          if (checkedPractice) return;
          pickedMap[i] = !pickedMap[i];
          btn.classList.toggle('is-picked', !!pickedMap[i]);
          markSpan.textContent = pickedMap[i] ? 'DUM (?)' : '?';
          btn.setAttribute('aria-pressed', String(!!pickedMap[i]));
          playBeat(pickedMap[i] ? 'stress' : 'unstress');
        } else {
          stopPlayback();
          currentSyllableIdx = i;
          highlightSyllable(i);
        }
      });

      feetEl.appendChild(btn);

      if (syl.caesuraAfter) {
        var sep = document.createElement('span');
        sep.className = 'sh-caesura';
        sep.title = 'Caesura (mid-line pause)';
        sep.textContent = '//';
        sep.setAttribute('aria-hidden', 'true');
        feetEl.appendChild(sep);
      }
    });
  }

  function highlightSyllable(idx) {
    var syls = LINES[activeLineKey].syllables;
    syls.forEach(function (_, i) {
      var el = document.getElementById('sh-syl-' + i);
      if (el) el.classList.toggle('is-active', i === idx);
    });
    if (idx >= 0 && idx < syls.length) {
      var s = syls[idx];
      if (statusEl) {
        if (s.extra) {
          statusEl.textContent = '• Extra 11th syllable (“' + s.text + '”) — trailing feminine ending creates hesitation.';
        } else {
          statusEl.textContent = s.stress
            ? '• STRESSED beat (DUM): “' + s.text + '”'
            : '• Unstressed beat (da): “' + s.text + '”';
        }
      }
      playBeat(s.extra ? 'extra' : (s.stress ? 'stress' : 'unstress'));
    }
  }

  document.querySelectorAll('[data-line-id]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('[data-line-id]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      renderMeterLine(btn.dataset.lineId);
    });
  });

  document.querySelectorAll('[data-meter-mode]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      meterMode = btn.dataset.meterMode;
      document.querySelectorAll('[data-meter-mode]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      renderMeterLine(activeLineKey);
    });
  });

  if (stepBtn) {
    stepBtn.addEventListener('click', function () {
      stopPlayback();
      var total = LINES[activeLineKey].syllables.length;
      currentSyllableIdx = (currentSyllableIdx + 1) % total;
      highlightSyllable(currentSyllableIdx);
    });
  }

  if (playBtn) {
    playBtn.addEventListener('click', function () {
      if (playTimer) {
        stopPlayback();
        return;
      }
      playBtn.textContent = '⏸ Pause Rhythm';
      playBtn.setAttribute('aria-pressed', 'true');
      currentSyllableIdx = -1;
      var total = LINES[activeLineKey].syllables.length;
      var stepMs = tempoInput ? Number(tempoInput.value) : 410;
      playTimer = setInterval(function () {
        currentSyllableIdx++;
        if (currentSyllableIdx >= total) {
          stopPlayback();
          LINES[activeLineKey].syllables.forEach(function (_, i) {
            var el = document.getElementById('sh-syl-' + i);
            if (el) el.classList.remove('is-active');
          });
          if (statusEl) {
            statusEl.textContent = 'Finished line (' + total + ' syllables): ' + LINES[activeLineKey].meterType;
          }
          return;
        }
        highlightSyllable(currentSyllableIdx);
      }, stepMs);
    });
  }

  if (tempoInput && tempoLabel) {
    tempoInput.addEventListener('input', function () {
      tempoLabel.textContent = tempoInput.value + ' ms';
      if (playTimer) {
        stopPlayback();
      }
    });
  }

  if (checkMeterBtn) {
    checkMeterBtn.addEventListener('click', function () {
      checkedPractice = true;
      var syls = LINES[activeLineKey].syllables;
      var matches = 0;
      syls.forEach(function (s, i) {
        var el = document.getElementById('sh-syl-' + i);
        if (!el) return;
        var guessed = !!pickedMap[i];
        var ok = guessed === !!s.stress;
        if (ok) matches++;
        el.classList.remove('is-picked');
        el.classList.add(ok ? 'is-correct' : 'is-wrong');
        var mark = el.querySelector('.sh-syl-mark');
        if (mark) mark.textContent = s.extra ? 'extra (˘)' : (s.stress ? 'DUM (–)' : 'da (˘)');
      });
      if (statusEl) {
        statusEl.textContent = 'Scansion check: ' + matches + ' / ' + syls.length + ' syllables matched! ' + LINES[activeLineKey].insight;
      }
    });
  }

  if (resetMeterBtn) {
    resetMeterBtn.addEventListener('click', function () {
      renderMeterLine(activeLineKey);
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopPlayback();
  });

  renderMeterLine('sonnet18');

  /* ── Lab 2: Word Forge & Phrase Explorer ─────────────────────── */
  var WORDS = {
    swagger: {
      term: 'Swagger',
      play: 'A Midsummer Night’s Dream',
      ref: 'Act 3, scene 1',
      craft: 'Verb & vivid action',
      quote: '“What hempen home-spuns have we swaggering here, / So near the cradle of the fairy queen?”',
      origin: 'Puck turns a dialect noun/verb for swaying or rocking into a vivid picture of boastful strutting in front of Titania’s bower.',
      meaning: 'To walk or behave with confident, flashy, or boastful flair.',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1514&title=A%20Midsummer%20Night%E2%80%99s%20Dream&author=William%20Shakespeare',
      libraryUrl: '../../../library.html?q=Midsummer'
    },
    eyeball: {
      term: 'Eyeball',
      play: 'The Tempest',
      ref: 'Act 1, scene 2',
      craft: 'Compound coinage',
      quote: '“Go make thyself like a nymph o’ the sea: be subject / To no sight but thine and mine, invisible / To every eyeball else.”',
      origin: 'Shakespeare fused “eye” + “ball” into a crisp anatomical compound so Prospero’s command feels tactile and uncanny.',
      meaning: 'The rounded globe of the eye—here standing in for every single person watching.',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1540&title=The%20Tempest&author=William%20Shakespeare',
      libraryUrl: '../../../library.html?q=Tempest'
    },
    'wild-goose': {
      term: 'Wild-goose chase',
      play: 'Romeo and Juliet',
      ref: 'Act 2, scene 4',
      craft: 'Everyday idiom',
      quote: '“Nay, if thy wits run the wild-goose chase, I am done, for thou hast more of the wild-goose in one of thy wits than, I am sure, I have in my whole five.”',
      origin: 'Originally an Elizabethan horse race where riders followed the leader like geese in a V-formation. Mercutio turns it into a metaphor for chasing rapid-fire puns.',
      meaning: 'A hopeless, winding pursuit that leads in circles without catching the goal.',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1513&title=Romeo%20and%20Juliet&author=William%20Shakespeare',
      libraryUrl: '../../../library.html?q=Romeo%20and%20Juliet'
    },
    pickle: {
      term: 'In a pickle',
      play: 'The Tempest',
      ref: 'Act 5, scene 1',
      craft: 'Everyday idiom',
      quote: '“How camest thou in this pickle?” — Trinculo: “I have been in such a pickle since I saw you last…”',
      origin: 'Brine used for preserving food becomes a comic pun after Trinculo stumbles out of a muddy, foul-smelling swamp.',
      meaning: 'Stuck in an awkward, messy, or embarrassing predicament.',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1540&title=The%20Tempest&author=William%20Shakespeare',
      libraryUrl: '../../../library.html?q=Tempest'
    },
    'knock-knock': {
      term: 'Knock, knock! Who’s there?',
      play: 'Macbeth',
      ref: 'Act 2, scene 3',
      craft: 'Stage & action',
      quote: '“Knock, knock, knock! Who’s there, i’ the name of Beelzebub?”',
      origin: 'Just after Macbeth murders King Duncan, a hungover Porter stumbles to the castle gate and invents an imaginary visitor routine—cutting tragedy with dark comedy.',
      meaning: 'The opening setup of every modern knock-knock joke, born as a tense onstage sound cue.',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1533',
      libraryUrl: '../../../library.html?q=Macbeth'
    },
    'be-all': {
      term: 'Be-all and the end-all',
      play: 'Macbeth',
      ref: 'Act 1, scene 7',
      craft: 'Compound coinage',
      quote: '“If it were done when ’tis done, then ’twere well / It were done quickly: if the assassination / Could trammel up the consequence, and catch / With his surcease success; that but this blow / Might be the be-all and the end-all here…”',
      origin: 'Shakespeare turned verb phrases (“be all” and “end all”) into hyphenated nouns—packing an entire moral gamble into two tight compounds.',
      meaning: 'The single decisive action or goal that settles everything forever.',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1533',
      libraryUrl: '../../../library.html?q=Macbeth'
    },
    method: {
      term: 'Method in his madness',
      play: 'Hamlet',
      ref: 'Act 2, scene 2',
      craft: 'Everyday idiom',
      quote: '“Though this be madness, yet there is method in ’t.”',
      origin: 'Polonius speaks an aside to the audience while questioning Hamlet: behind the prince’s wild riddles, there is sharp, deliberate strategy.',
      meaning: 'A hidden plan or logic beneath behavior that looks chaotic on the surface.',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1524&title=Hamlet&author=William%20Shakespeare',
      libraryUrl: '../../../library.html?q=Hamlet'
    },
    greek: {
      term: 'It was Greek to me',
      play: 'Julius Caesar',
      ref: 'Act 1, scene 2',
      craft: 'Everyday idiom',
      quote: '“Did Cicero say any thing?” — Casca: “Ay, he spoke Greek.” — “To what effect?” — “Nay, an I tell you that, I’ll ne’er look you i’ the face again: but those that understood him smiled at one another and shook their heads; but, for mine own part, it was Greek to me.”',
      origin: 'Roman senators show off their education in Greek while Casca pretends not to care—a joke about political insiders and outsiders.',
      meaning: 'Completely unintelligible jargon or speech you cannot understand at all.',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1522&title=Julius%20Caesar&author=William%20Shakespeare',
      libraryUrl: '../../../library.html?q=Julius%20Caesar'
    }
  };

  var spotlightTerm = document.getElementById('sh-spot-term');
  var spotlightMeta = document.getElementById('sh-spot-meta');
  var spotlightQuote = document.getElementById('sh-spot-quote');
  var spotlightOrigin = document.getElementById('sh-spot-origin');
  var spotlightMeaning = document.getElementById('sh-spot-meaning');
  var spotlightReader = document.getElementById('sh-spot-reader');
  var spotlightLibrary = document.getElementById('sh-spot-library');
  var wordCountEl = document.getElementById('sh-words-count');

  function selectWord(wordId) {
    var entry = WORDS[wordId];
    if (!entry) return;
    document.querySelectorAll('.sh-word-card').forEach(function (card) {
      card.setAttribute('aria-pressed', String(card.dataset.word === wordId));
    });
    if (spotlightTerm) spotlightTerm.textContent = entry.term;
    if (spotlightMeta) spotlightMeta.textContent = entry.play + ' (' + entry.ref + ') · ' + entry.craft;
    if (spotlightQuote) spotlightQuote.textContent = entry.quote;
    if (spotlightOrigin) spotlightOrigin.textContent = entry.origin;
    if (spotlightMeaning) spotlightMeaning.textContent = entry.meaning;
    if (spotlightReader) {
      spotlightReader.href = entry.readerUrl;
      spotlightReader.setAttribute('aria-label', 'Read ' + entry.play + ' in ClassroomOS Reader');
    }
    if (spotlightLibrary) {
      spotlightLibrary.href = entry.libraryUrl;
      spotlightLibrary.setAttribute('aria-label', 'Find ' + entry.play + ' on Library Shelf');
    }
  }

  document.querySelectorAll('.sh-word-card').forEach(function (card) {
    card.addEventListener('click', function () {
      selectWord(card.dataset.word);
    });
  });

  document.querySelectorAll('[data-word-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.dataset.wordFilter;
      document.querySelectorAll('[data-word-filter]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      var visible = 0;
      var firstVisibleId = null;
      var activeVisible = false;
      document.querySelectorAll('.sh-word-card').forEach(function (card) {
        var match = cat === 'all' || card.dataset.wordCat === cat;
        card.hidden = !match;
        if (match) {
          visible++;
          if (!firstVisibleId) firstVisibleId = card.dataset.word;
          if (card.getAttribute('aria-pressed') === 'true') activeVisible = true;
        }
      });
      if (wordCountEl) wordCountEl.textContent = 'Showing ' + visible + ' of 8 expressions';
      if (!activeVisible && firstVisibleId) selectWord(firstVisibleId);
    });
  });

  selectWord('swagger');

  /* ── Lab 3: Director's Promptbook Lab ────────────────────────── */
  var SCENES = {
    macbeth: {
      play: 'Macbeth',
      actScene: 'Act 1, scene 7',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1533',
      prompt: 'Which delivery makes Macbeth seem more dangerous: shaking with terror, or cold and matter-of-fact? Try reciting the line both ways with a partner.',
      directions: {
        fear: {
          label: 'Afraid & Trembling',
          pace: 'Broken · Hesitant',
          volume: 'Drop on “quickly”',
          gaze: 'Darting to the doors',
          scriptHtml: '“If it were <span class="sh-cue-stress">done</span> <span class="sh-cue-pause">// pause</span> when ’tis <span class="sh-cue-stress">done</span>, then ’twere well<br>It were done <span class="sh-cue-stress">quickly</span>.”',
          note: '<strong>Director’s Note (Afraid):</strong> Pause after the first “done.” Let “quickly” escape as a desperate wish to outrun guilt. Notice how the triple chime of “done / ’tis done / done” echoes like a clock he cannot stop.'
        },
        resolve: {
          label: 'Cold & Resolved',
          pace: 'Brisk · Steady',
          volume: 'Firm & clipped',
          gaze: 'Locked on the audience',
          scriptHtml: '“If it were done when ’tis done, then ’twere <span class="sh-cue-stress">well</span><br>It were <span class="sh-cue-stress">done quickly</span>.”',
          note: '<strong>Director’s Note (Resolved):</strong> Speak straight through the line break without breathing. Hit “well” and “done quickly” like a general issuing a field order—then watch whether his confidence cracks two lines later.'
        },
        secret: {
          label: 'Hushed & Paranoid',
          pace: 'Tight · Whispered',
          volume: 'Low stage whisper',
          gaze: 'Scanning the galleries',
          scriptHtml: '“If it were done when ’tis done <span class="sh-cue-pause">// check behind</span>, then ’twere well<br>It were done <span class="sh-cue-stress">quickly</span>.”',
          note: '<strong>Director’s Note (Paranoid):</strong> Remember the Globe had 3,000 listeners in broad daylight. Pull the groundlings in close with an urgent whisper, treating the audience as your only co-conspirator.'
        }
      }
    },
    caesar: {
      play: 'Julius Caesar',
      actScene: 'Act 3, scene 2',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1522&title=Julius%20Caesar&author=William%20Shakespeare',
      prompt: 'Antony repeats “Brutus is an honourable man” four times in his speech. Mark the exact moment in the play when the Roman crowd flips from backing Brutus to demanding revenge.',
      directions: {
        humble: {
          label: 'Humble Mourner',
          pace: 'Slow · Respectful',
          volume: 'Quiet & steady',
          gaze: 'Down toward Caesar’s body',
          scriptHtml: '“Friends, Romans, countrymen, lend me your ears;<br>I come to <span class="sh-cue-stress">bury</span> Caesar, not to praise him.<br>… For Brutus is an <span class="sh-cue-stress">honourable</span> man.”',
          note: '<strong>Director’s Note (Humble):</strong> Start disarming and non-threatening. The crowd just cheered Brutus; if Antony attacks immediately, they will shout him down. Play “honourable” completely straight on the first pass.'
        },
        strategist: {
          label: 'Calculating Strategist',
          pace: 'Measured · Deliberate',
          volume: 'Rising on the turn',
          gaze: 'Testing individual faces',
          scriptHtml: '“I come to bury Caesar, <span class="sh-cue-pause">// beat</span> not to praise him.<br>The evil that men do lives after them;<br>The good is oft interred with their bones; <span class="sh-cue-stress">so let it be</span> with Caesar.”',
          note: '<strong>Director’s Note (Strategist):</strong> Plant a tiny pause before “not to praise him.” Antony states the exact opposite of what he is about to do, letting the crowd feel smart when they reach the conclusion themselves.'
        },
        irony: {
          label: 'Cutting Irony',
          pace: 'Sharp · Sarcastic edge',
          volume: 'Project across the yard',
          gaze: 'Pointing to the conspirators',
          scriptHtml: '“Yet Brutus says he was ambitious;<br>And Brutus is an <span class="sh-cue-stress">honourable</span> man <span class="sh-cue-pause">// let crowd react</span>.”',
          note: '<strong>Director’s Note (Irony):</strong> By the third and fourth repetition, lean lightly on “honourable” after listing Caesar’s kindnesses to Rome. Wait a full second so the audience supplies the disbelief for you.'
        }
      }
    },
    romeo: {
      play: 'Romeo and Juliet',
      actScene: 'Act 1, scene 5 (Shared Sonnet)',
      readerUrl: '../../../reader.html?src=https%3A%2F%2Fwww.gutenberg.org%2Febooks%2F1513&title=Romeo%20and%20Juliet&author=William%20Shakespeare',
      prompt: 'Try reading these four lines in two voices: notice how Juliet completes Romeo’s rhyme scheme instead of letting him talk uninterrupted. What does sharing a sonnet tell us about their meeting?',
      directions: {
        duet: {
          label: 'Two Voices (Duet)',
          pace: 'Light · Conversational',
          volume: 'Intimate amidst a party',
          gaze: 'Eye-to-eye across the dance',
          scriptHtml: '<span class="sh-speaker">Romeo:</span> If I profane with my unworthiest hand / This holy shrine, the gentle sin is this:<br><span class="sh-speaker">Romeo:</span> My lips, two blushing pilgrims, ready stand / To smooth that rough touch with a tender kiss.<br><span class="sh-speaker">Juliet:</span> Good pilgrim, you do wrong your hand too much, / Which mannerly devotion shows in this…',
          note: '<strong>Director’s Note (Shared Sonnet):</strong> At their very first meeting at the Capulet ball, Romeo and Juliet speak 14 lines together that form one complete Shakespearean sonnet. Juliet refuses to be a silent statue—she matches his metaphor beat for beat.'
        },
        rhyme: {
          label: 'Expose Rhyme Map',
          pace: 'Crisp on line-ends',
          volume: 'Clear chime on rhymes',
          gaze: 'Follow the rhyme hand-off',
          scriptHtml: '<span class="sh-speaker">Romeo:</span> If I profane with my unworthiest <span class="sh-cue-stress">hand</span> <span class="sh-rhyme-tag">A</span><br><span class="sh-speaker">Romeo:</span> This holy shrine, the gentle sin is <span class="sh-cue-stress">this</span>: <span class="sh-rhyme-tag">B</span><br><span class="sh-speaker">Romeo:</span> My lips, two blushing pilgrims, ready <span class="sh-cue-stress">stand</span> <span class="sh-rhyme-tag">A</span><br><span class="sh-speaker">Romeo:</span> To smooth that rough touch with a tender <span class="sh-cue-stress">kiss</span>. <span class="sh-rhyme-tag">B</span><br><span class="sh-speaker">Juliet:</span> Good pilgrim, you do wrong your hand too <span class="sh-cue-stress">much</span> <span class="sh-rhyme-tag">C</span><br><span class="sh-speaker">Juliet:</span> Which mannerly devotion shows in <span class="sh-cue-stress">this</span>… <span class="sh-rhyme-tag">B-echo</span>',
          note: '<strong>Director’s Note (Rhyme Map):</strong> Romeo builds an ABAB quatrain (hand / this / stand / kiss); Juliet immediately picks up his B-rhyme (“this”) and weaves it into her own C-rhyme quatrain (much / this / touch / kiss).'
        },
        blocking: {
          label: 'Playful vs. Reverent',
          pace: 'Quick wit on Juliet’s entry',
          volume: 'Warm & teasing',
          gaze: 'Juliet steps out of reach',
          scriptHtml: '<span class="sh-speaker">Romeo:</span> My lips, two blushing pilgrims, ready stand <span class="sh-cue-pause">// leans in</span><br><span class="sh-speaker">Juliet:</span> Good pilgrim, <span class="sh-cue-pause">// catches his hand</span> you do wrong your hand too much…',
          note: '<strong>Director’s Note (Blocking):</strong> If Juliet steps slightly back and catches his hand before he can steal a kiss, the scene turns into joyful, fast-footed comedy right before fate closes in.'
        }
      }
    }
  };

  var activeSceneKey = 'macbeth';
  var activeDirKey = 'fear';
  var sceneTitleEl = document.getElementById('sh-lab-scene-title');
  var scriptEl = document.getElementById('sh-lab-script');
  var dirControlsEl = document.getElementById('sh-dir-controls');
  var readingEl = document.getElementById('sh-reading');
  var paceEl = document.getElementById('sh-cue-pace');
  var volEl = document.getElementById('sh-cue-vol');
  var gazeEl = document.getElementById('sh-cue-gaze');
  var discussEl = document.getElementById('sh-lab-discuss');
  var labReaderLink = document.getElementById('sh-lab-reader');

  function renderDirection(dirKey) {
    var scene = SCENES[activeSceneKey];
    if (!scene || !scene.directions[dirKey]) return;
    activeDirKey = dirKey;
    var d = scene.directions[dirKey];

    if (dirControlsEl) {
      dirControlsEl.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.dir === dirKey));
      });
    }
    if (scriptEl) scriptEl.innerHTML = d.scriptHtml;
    if (readingEl) readingEl.innerHTML = '<p>' + d.note + '</p>';
    if (paceEl) paceEl.textContent = d.pace;
    if (volEl) volEl.textContent = d.volume;
    if (gazeEl) gazeEl.textContent = d.gaze;
  }

  function renderScene(sceneKey) {
    var scene = SCENES[sceneKey];
    if (!scene) return;
    activeSceneKey = sceneKey;
    var keys = Object.keys(scene.directions);
    activeDirKey = keys[0];

    if (sceneTitleEl) sceneTitleEl.textContent = scene.play + ' · ' + scene.actScene;
    if (discussEl) discussEl.innerHTML = '<strong>Discussion Question:</strong> ' + scene.prompt;
    if (labReaderLink) {
      labReaderLink.href = scene.readerUrl;
      labReaderLink.textContent = 'Open ' + scene.play + ' in Reader →';
      labReaderLink.setAttribute('aria-label', 'Open ' + scene.play + ' in ClassroomOS Reader');
    }

    if (dirControlsEl) {
      dirControlsEl.replaceChildren();
      keys.forEach(function (k, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.dir = k;
        btn.textContent = scene.directions[k].label;
        btn.setAttribute('aria-pressed', String(idx === 0));
        btn.addEventListener('click', function () {
          renderDirection(k);
        });
        dirControlsEl.appendChild(btn);
      });
    }

    renderDirection(activeDirKey);
  }

  document.querySelectorAll('[data-scene-id]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('[data-scene-id]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      renderScene(btn.dataset.sceneId);
    });
  });

  renderScene('macbeth');

  /* ── Section 6: Site Library Playbill Filters ──────────────────── */
  var activeGenre = 'all';
  var activeGrade = 'all';
  var playbillCountEl = document.getElementById('sh-playbill-count');

  function applyPlaybillFilters() {
    var visible = 0;
    document.querySelectorAll('.sh-play-card').forEach(function (card) {
      var genreMatch = activeGenre === 'all' || card.dataset.genre === activeGenre;
      var gradeMatch = activeGrade === 'all' || card.dataset.grade === activeGrade;
      var show = genreMatch && gradeMatch;
      card.hidden = !show;
      if (show) visible++;
    });
    if (playbillCountEl) {
      playbillCountEl.textContent = 'Showing ' + visible + ' of 9 plays in the ClassroomOS Library';
    }
  }

  document.querySelectorAll('[data-play-genre]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeGenre = btn.dataset.playGenre;
      document.querySelectorAll('[data-play-genre]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      applyPlaybillFilters();
    });
  });

  document.querySelectorAll('[data-play-grade]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeGrade = btn.dataset.playGrade;
      document.querySelectorAll('[data-play-grade]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      applyPlaybillFilters();
    });
  });

  applyPlaybillFilters();

  /* ── Section 9: Self-Checking Quiz ───────────────────────────── */
  var quizForm = document.getElementById('sh-quiz');
  var quizScoreEl = document.getElementById('sh-quiz-score');
  var quizResetBtn = document.getElementById('sh-quiz-reset');

  if (quizForm) {
    quizForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var sets = quizForm.querySelectorAll('fieldset[data-answer]');
      var correct = 0;
      var answered = 0;

      sets.forEach(function (fs) {
        var expected = fs.dataset.answer;
        var chosen = fs.querySelector('input[type="radio"]:checked');
        var fb = fs.querySelector('.sh-fb');
        var why = fb ? (fb.dataset.why || '') : '';
        if (!chosen) {
          if (fb) {
            fb.className = 'sh-fb is-wrong';
            fb.textContent = 'Pick an option above to check your answer.';
          }
          return;
        }
        answered++;
        if (chosen.value === expected) {
          correct++;
          if (fb) {
            fb.className = 'sh-fb is-right';
            fb.textContent = 'Correct — ' + why;
          }
        } else {
          if (fb) {
            fb.className = 'sh-fb is-wrong';
            fb.textContent = 'Not quite — ' + why;
          }
        }
      });

      if (quizScoreEl) {
        quizScoreEl.textContent = 'Score: ' + correct + ' / ' + sets.length +
          (answered < sets.length ? ' (' + (sets.length - answered) + ' unanswered)' : '');
      }
    });
  }

  if (quizResetBtn && quizForm) {
    quizResetBtn.addEventListener('click', function () {
      quizForm.reset();
      quizForm.querySelectorAll('.sh-fb').forEach(function (fb) {
        fb.className = 'sh-fb';
        fb.textContent = '';
      });
      if (quizScoreEl) quizScoreEl.textContent = '';
    });
  }
}());
