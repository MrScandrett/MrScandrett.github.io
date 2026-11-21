/**
 * Interactive 20Q & Information Theory Studio Controller
 * Wires Tab 1 (20Q Handheld Orb + AI Inspector + Sparkline + Knowledge Base),
 * Tab 2 (Reverse 20Q: Be the AI), Tab 3 (Binary Entropy + 2^N + LLM Temperature Lab),
 * Studio Challenges, Practice Self-Check, and Print support.
 */

import {
  CATEGORIES,
  InformationTheoryEngine,
  LLM_PROMPTS,
  REVERSE_TIERS,
  Reverse20QSession,
  STUDIO_CHALLENGES,
  binaryEntropy,
  crossEntropy,
  distributionEntropy,
  evaluateChallenges,
  getCategoryIcon,
  perplexity,
  softmaxWithTemperature
} from './twenty-questions-engine.js';

const escapeHTML = value =>
  String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[ch]);

class RetroSynth {
  constructor() {
    this.audioCtx = null;
    this.muted = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  playTone(freq, duration, type = 'square', gain = 0.06) {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      const now = this.audioCtx.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gainNode.gain.setValueAtTime(gain, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(now + duration);
    } catch { /* Audio policy or unsupported */ }
  }

  beepClick() {
    this.playTone(880, 0.06, 'triangle', 0.045);
  }

  beepCompute() {
    this.playTone(440, 0.07, 'sawtooth', 0.035);
    setTimeout(() => this.playTone(660, 0.08, 'sawtooth', 0.035), 55);
  }

  fanfareVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.15, 'square', 0.065), idx * 100);
    });
  }

  soundStumped() {
    this.playTone(330, 0.14, 'sawtooth', 0.06);
    setTimeout(() => this.playTone(261.63, 0.24, 'sawtooth', 0.06), 115);
  }

  revealChime() {
    this.playTone(587.33, 0.1, 'sine', 0.065);
    setTimeout(() => this.playTone(880, 0.17, 'triangle', 0.065), 85);
  }
}

class TwentyQuestionsStudioApp {
  constructor() {
    this.engine = new InformationTheoryEngine();
    this.synth = new RetroSynth();
    this.activeTab = 'play';
    this.inspectorTab = 'splits';
    this.currentMode = 'inspector';
    this.currentBacklight = 'green';
    this.pendingAnswer = null;
    this.usedFuzzyThisRound = false;
    this.randomSecret = null;
    this.secretRevealed = false;
    this.libraryQuery = '';
    this.libraryCategory = 'all';

    // Reverse 20Q state
    this.reverseTier = 'starter';
    this.reverseCoachHint = false;
    this.reverseSession = new Reverse20QSession({ tier: this.reverseTier });
    this.reverseLastFeedback = null;

    // LLM & Entropy lab state
    this.entropyP = 0.5;
    this.llmPromptId = LLM_PROMPTS[0].id;
    this.llmModelKey = 'trained';
    this.llmTemperature = 1.0;

    // Challenge progress
    this.progress = {
      minWinQuestions: 0,
      usedFuzzyAndWon: false,
      taughtCount: this.engine.getCustomEntities().length,
      reverseWonNearOptimal: false,
      testedLlmLowTemp: false,
      testedLlmHighTemp: false
    };

    // Canvas kits
    this.decayKit = null;
    this.entropyKit = null;
    this.themeColors = window.SimKit ? window.SimKit.theme.colors() : {
      bg: '#f5f5f7',
      text: '#1d1d1f',
      textMuted: '#6e6e73',
      accent: '#2563eb'
    };

    this.cacheDOM();
    this.bindEvents();
    this.initCanvases();
    this.renderAll();
    this.initPracticeSelfCheck();
  }

  cacheDOM() {
    // Tabs & Challenges
    this.modeTabs = [...document.querySelectorAll('[data-tq-tab]')];
    this.modePanels = [...document.querySelectorAll('[data-tq-panel]')];
    this.challengePill = document.getElementById('tq-challenge-pill');
    this.challengesDrawer = document.getElementById('tq-challenges-drawer');
    this.challengesList = document.getElementById('tq-challenges-list');
    this.challengesClose = document.getElementById('tq-challenges-close');

    // Tab 1 controls & Orb
    this.playStage = document.getElementById('tq-stage-grid');
    this.inspectorSide = document.getElementById('tq-dashboard-side');
    this.modeToggleBtn = document.getElementById('tq-toggle-mode');
    this.backlightBtn = document.getElementById('tq-toggle-backlight');
    this.soundBtn = document.getElementById('tq-toggle-sound');
    this.newGameBtn = document.getElementById('tq-btn-new-game');
    this.stumpedBtn = document.getElementById('tq-btn-stumped');
    this.statusLive = document.getElementById('tq-status-live');

    this.lcdScreen = document.getElementById('tq-lcd-screen');
    this.lcdQNum = document.getElementById('tq-lcd-qnum');
    this.lcdEntropyBits = document.getElementById('tq-lcd-entropy-val');
    this.lcdFace = document.getElementById('tq-lcd-face');
    this.lcdStatusMsg = document.getElementById('tq-lcd-status-msg');
    this.lcdText = document.getElementById('tq-lcd-text');
    this.lcdSubtext = document.getElementById('tq-lcd-subtext');
    this.lcdMeterFill = document.getElementById('tq-lcd-meter-fill');

    this.controlsCluster = document.getElementById('tq-controls-cluster');
    this.btnYes = document.getElementById('tq-btn-yes');
    this.btnNo = document.getElementById('tq-btn-no');
    this.btnProb = document.getElementById('tq-btn-prob');
    this.btnRarely = document.getElementById('tq-btn-rarely');
    this.btnUnsure = document.getElementById('tq-btn-unsure');
    this.btnUndo = document.getElementById('tq-btn-undo');
    this.btnReset = document.getElementById('tq-btn-reset');
    this.btnGuessNow = document.getElementById('tq-btn-guess-now');

    this.revealBanner = document.getElementById('tq-reveal-banner');
    this.revealTarget = document.getElementById('tq-reveal-target');
    this.revealDesc = document.getElementById('tq-reveal-desc');
    this.btnGuessCorrect = document.getElementById('tq-btn-guess-correct');
    this.btnGuessWrong = document.getElementById('tq-btn-guess-wrong');

    this.teachBox = document.getElementById('tq-teach-box');
    this.teachForm = document.getElementById('tq-teach-form');
    this.inputTeachName = document.getElementById('tq-teach-name');
    this.inputTeachCat = document.getElementById('tq-teach-category');
    this.inputTeachQ = document.getElementById('tq-teach-question');
    this.selectTeachAns = document.getElementById('tq-teach-answer');
    this.btnTeachCancel = document.getElementById('tq-teach-cancel');

    // Inspector metrics & subtabs
    this.statEntropy = document.getElementById('tq-stat-entropy');
    this.statCandidates = document.getElementById('tq-stat-candidates');
    this.statBitsRemoved = document.getElementById('tq-stat-bits-removed');
    this.statEfficiency = document.getElementById('tq-stat-efficiency');
    this.decayCanvas = document.getElementById('tq-decay-canvas');
    this.inspTabs = [...document.querySelectorAll('[data-tq-insp-tab]')];
    this.inspPanels = [...document.querySelectorAll('[data-tq-insp-panel]')];
    this.igList = document.getElementById('tq-ig-list');
    this.candidateBars = document.getElementById('tq-candidate-bars');
    this.historyList = document.getElementById('tq-history-list');

    // Library subpanel
    this.libSearch = document.getElementById('tq-lib-search');
    this.libCategory = document.getElementById('tq-lib-category');
    this.libPickSecretBtn = document.getElementById('tq-lib-pick-secret');
    this.libSecretBanner = document.getElementById('tq-lib-secret-banner');
    this.libClearCustomBtn = document.getElementById('tq-lib-clear-custom');
    this.libList = document.getElementById('tq-lib-list');
    this.libTabCount = document.getElementById('tq-lib-count');

    // Tab 2: Reverse 20Q
    this.revTierBtns = [...document.querySelectorAll('[data-tq-rev-tier]')];
    this.revNewBtn = document.getElementById('tq-rev-new');
    this.revCoachBtn = document.getElementById('tq-rev-coach');
    this.revStatRem = document.getElementById('tq-rev-stat-rem');
    this.revStatTurns = document.getElementById('tq-rev-stat-turns');
    this.revStatOpt = document.getElementById('tq-rev-stat-opt');
    this.revStatH = document.getElementById('tq-rev-stat-h');
    this.revCandidatesGrid = document.getElementById('tq-rev-candidates');
    this.revFeedback = document.getElementById('tq-rev-feedback');
    this.revQuestionsList = document.getElementById('tq-rev-questions');

    // Tab 3: Entropy, Bits & LLM Lab
    this.shannonSlider = document.getElementById('tq-shannon-slider');
    this.shannonPVal = document.getElementById('tq-shannon-pval');
    this.shannonHVal = document.getElementById('tq-shannon-hval');
    this.shannonEffVal = document.getElementById('tq-shannon-effval');
    this.entropyCanvas = document.getElementById('tq-entropy-canvas');

    this.bitsSlider = document.getElementById('tq-bits-slider');
    this.bitsVal = document.getElementById('tq-bits-val');
    this.totalStatesVal = document.getElementById('tq-total-states');
    this.metaphorText = document.getElementById('tq-metaphor-text');

    this.llmPromptSelect = document.getElementById('tq-llm-prompt');
    this.llmModelSelect = document.getElementById('tq-llm-model');
    this.llmTempSlider = document.getElementById('tq-llm-temp');
    this.llmTempVal = document.getElementById('tq-llm-temp-val');
    this.llmPromptDisplay = document.getElementById('tq-llm-prompt-display');
    this.llmHVal = document.getElementById('tq-llm-h');
    this.llmPerpVal = document.getElementById('tq-llm-perp');
    this.llmLossVal = document.getElementById('tq-llm-loss');
    this.llmBars = document.getElementById('tq-llm-bars');
  }

  bindEvents() {
    // Populate category dropdowns from canonical CATEGORIES
    if (this.libCategory) {
      const opts = ['<option value="all">All Categories</option>']
        .concat(CATEGORIES.map(c => `<option value="${escapeHTML(c.id)}">${c.icon} ${escapeHTML(c.label)}</option>`));
      this.libCategory.innerHTML = opts.join('');
    }
    if (this.inputTeachCat) {
      this.inputTeachCat.innerHTML = CATEGORIES
        .map(c => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.label)}</option>`)
        .join('');
    }
    if (this.llmPromptSelect) {
      this.llmPromptSelect.innerHTML = LLM_PROMPTS
        .map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.prompt)}</option>`)
        .join('');
    }

    // Studio mode tabs + arrow key switching
    this.modeTabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => this.switchStudioTab(tab.dataset.tqTab));
      tab.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          const next = this.modeTabs[(idx + dir + this.modeTabs.length) % this.modeTabs.length];
          next.focus();
          this.switchStudioTab(next.dataset.tqTab);
        }
      });
    });

    // Challenges drawer
    this.challengePill?.addEventListener('click', () => {
      if (!this.challengesDrawer) return;
      const opening = this.challengesDrawer.hidden;
      this.challengesDrawer.hidden = !opening;
      this.challengePill.setAttribute('aria-expanded', String(opening));
      if (opening) this.challengesClose?.focus();
    });
    this.challengesClose?.addEventListener('click', () => {
      if (this.challengesDrawer) this.challengesDrawer.hidden = true;
      this.challengePill?.setAttribute('aria-expanded', 'false');
      this.challengePill?.focus();
    });

    // Tab 1 Orb & Inspector controls
    this.btnYes?.addEventListener('click', () => this.handleAnswer('yes'));
    this.btnNo?.addEventListener('click', () => this.handleAnswer('no'));
    this.btnProb?.addEventListener('click', () => this.handleAnswer('probably'));
    this.btnRarely?.addEventListener('click', () => this.handleAnswer('rarely'));
    this.btnUnsure?.addEventListener('click', () => this.handleAnswer('unsure'));

    this.btnUndo?.addEventListener('click', () => this.handleUndo());
    this.btnReset?.addEventListener('click', () => this.handleReset());
    this.newGameBtn?.addEventListener('click', () => this.handleReset());
    this.btnGuessNow?.addEventListener('click', () => this.handleForceGuess());
    this.stumpedBtn?.addEventListener('click', () => this.openTeachDrawer());
    this.btnTeachCancel?.addEventListener('click', () => this.cancelTeachDrawer());

    this.btnGuessCorrect?.addEventListener('click', () => this.handleVictory());
    this.btnGuessWrong?.addEventListener('click', () => this.handleGuessWrong());

    this.teachForm?.addEventListener('submit', e => {
      e.preventDefault();
      this.handleTeachSubmit();
    });

    this.modeToggleBtn?.addEventListener('click', () => this.toggleViewMode());
    this.backlightBtn?.addEventListener('click', () => this.cycleBacklight());
    this.soundBtn?.addEventListener('click', () => this.toggleSound());

    // Inspector subtabs
    this.inspTabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchInspectorTab(tab.dataset.tqInspTab));
    });

    // Alternative question click-to-ask override
    this.igList?.addEventListener('click', e => {
      const btn = e.target.closest('[data-tq-ask-qid]');
      if (!btn) return;
      const qId = btn.dataset.tqAskQid;
      this.handleForceQuestionChoice(qId);
    });

    // Library controls
    this.libSearch?.addEventListener('input', () => {
      this.libraryQuery = this.libSearch.value.trim().toLowerCase();
      this.renderLibrary();
    });
    this.libCategory?.addEventListener('change', () => {
      this.libraryCategory = this.libCategory.value;
      this.renderLibrary();
    });
    this.libPickSecretBtn?.addEventListener('click', () => {
      const list = this.engine.entities;
      this.randomSecret = list[Math.floor(Math.random() * list.length)] || null;
      this.secretRevealed = false;
      this.renderLibrarySecretBanner();
    });
    this.libSecretBanner?.addEventListener('click', e => {
      if (e.target.closest('[data-tq-toggle-secret]')) {
        this.secretRevealed = !this.secretRevealed;
        this.renderLibrarySecretBanner();
      } else if (e.target.closest('[data-tq-clear-secret]')) {
        this.randomSecret = null;
        this.secretRevealed = false;
        this.renderLibrarySecretBanner();
      }
    });
    this.libClearCustomBtn?.addEventListener('click', () => {
      this.engine.clearCustomKnowledge();
      this.progress.taughtCount = this.engine.getCustomEntities().length;
      this.renderAll();
    });
    this.libList?.addEventListener('click', e => {
      const del = e.target.closest('[data-tq-delete-entity]');
      if (!del) return;
      this.engine.deleteCustomEntity(del.dataset.tqDeleteEntity);
      this.progress.taughtCount = this.engine.getCustomEntities().length;
      this.renderAll();
    });

    // Tab 2: Reverse 20Q
    this.revTierBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.reverseTier = btn.dataset.tqRevTier;
        this.startNewReverseGame();
      });
    });
    this.revNewBtn?.addEventListener('click', () => this.startNewReverseGame());
    this.revCoachBtn?.addEventListener('click', () => {
      this.reverseCoachHint = !this.reverseCoachHint;
      this.revCoachBtn.setAttribute('aria-pressed', String(this.reverseCoachHint));
      this.revCoachBtn.classList.toggle('is-active', this.reverseCoachHint);
      this.revCoachBtn.textContent = this.reverseCoachHint ? 'Coach Hint: On' : 'Coach Hint: Off';
      this.renderReverseTab();
    });
    this.revQuestionsList?.addEventListener('click', e => {
      const btn = e.target.closest('[data-tq-rev-ask]');
      if (!btn) return;
      const step = this.reverseSession.askQuestion(btn.dataset.tqRevAsk);
      if (step) {
        this.synth.beepCompute();
        this.reverseLastFeedback = { type: 'question', step };
        this.renderReverseTab();
      }
    });
    this.revCandidatesGrid?.addEventListener('click', e => {
      const btn = e.target.closest('[data-tq-rev-guess]');
      if (!btn || btn.disabled) return;
      const outcome = this.reverseSession.guessEntity(btn.dataset.tqRevGuess);
      if (!outcome) return;
      if (outcome.correct) {
        this.synth.fanfareVictory();
        if (outcome.turns <= outcome.optimalBits + 1) {
          this.progress.reverseWonNearOptimal = true;
        }
      } else {
        this.synth.soundStumped();
      }
      this.reverseLastFeedback = { type: 'guess', outcome };
      this.renderReverseTab();
      this.renderChallenges();
    });

    // Tab 3: Entropy, Bits & LLM Lab
    this.shannonSlider?.addEventListener('input', () => {
      this.entropyP = parseFloat(this.shannonSlider.value);
      this.renderEntropyWidget();
    });
    this.bitsSlider?.addEventListener('input', () => this.renderBitsWidget());
    this.llmPromptSelect?.addEventListener('change', () => {
      this.llmPromptId = this.llmPromptSelect.value;
      this.renderLlmLab();
    });
    this.llmModelSelect?.addEventListener('change', () => {
      this.llmModelKey = this.llmModelSelect.value;
      this.renderLlmLab();
    });
    this.llmTempSlider?.addEventListener('input', () => {
      this.llmTemperature = parseFloat(this.llmTempSlider.value);
      if (this.llmTemperature <= 0.35) this.progress.testedLlmLowTemp = true;
      if (this.llmTemperature >= 1.4) this.progress.testedLlmHighTemp = true;
      this.renderLlmLab();
      this.renderChallenges();
    });

    // Print worksheet button
    document.getElementById('tq-print')?.addEventListener('click', () => {
      document.body.setAttribute('data-print-lesson', '');
      window.print();
    });

    // Fullscreen & resize sync for canvases
    document.addEventListener('creation-app-resize', () => this.resizeCanvases());
    window.addEventListener('resize', () => this.resizeCanvases());

    // Scoped global keyboard shortcuts for Tab 1
    window.addEventListener('keydown', e => {
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      // Close challenges drawer on Escape first
      if (e.key === 'Escape' && this.challengesDrawer && !this.challengesDrawer.hidden) {
        e.preventDefault();
        this.challengesDrawer.hidden = true;
        this.challengePill?.setAttribute('aria-expanded', 'false');
        this.challengePill?.focus();
        return;
      }

      if (
        e.key === 'Escape' &&
        (document.fullscreenElement ||
          document.querySelector('.creation-app-expanded') ||
          document.querySelector('.plb.plb-open'))
      ) {
        return;
      }

      if (this.activeTab !== 'play') return;

      // Keep Enter and Space working normally on focused buttons
      if (e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) return;

      const flashBtn = btn => {
        if (!btn) return;
        btn.classList.add('is-pressed');
        setTimeout(() => btn.classList.remove('is-pressed'), 130);
      };

      const k = e.key.toLowerCase();
      if (this.engine.isGuessing && !this.engine.isGameOver && (k === 'y' || k === '1' || k === 'n' || k === '2')) {
        e.preventDefault();
        if (k === 'y' || k === '1') {
          flashBtn(this.btnGuessCorrect);
          this.handleVictory();
        } else {
          flashBtn(this.btnGuessWrong);
          this.handleGuessWrong();
        }
        return;
      }

      if (k === '1' || k === 'y') { e.preventDefault(); flashBtn(this.btnYes); this.handleAnswer('yes'); }
      else if (k === '2' || k === 'n') { e.preventDefault(); flashBtn(this.btnNo); this.handleAnswer('no'); }
      else if (k === '3' || k === 'p') { e.preventDefault(); flashBtn(this.btnProb); this.handleAnswer('probably'); }
      else if (k === '4' || k === 'r') { e.preventDefault(); flashBtn(this.btnRarely); this.handleAnswer('rarely'); }
      else if (k === '5' || k === 'u') { e.preventDefault(); flashBtn(this.btnUnsure); this.handleAnswer('unsure'); }
      else if (k === 'z' || k === 'backspace') { e.preventDefault(); flashBtn(this.btnUndo); this.handleUndo(); }
      else if (k === 'escape') { e.preventDefault(); flashBtn(this.btnReset); this.handleReset(); }
    });
  }

  initCanvases() {
    if (window.SimKit) {
      window.SimKit.theme.onChange(colors => {
        this.themeColors = colors;
        this.drawDecaySparkline();
        this.drawEntropyCurve();
      });

      if (this.decayCanvas) {
        this.decayKit = window.SimKit.canvas2d(this.decayCanvas, {
          height: 68,
          onResize: () => this.drawDecaySparkline()
        });
      }

      if (this.entropyCanvas) {
        this.entropyKit = window.SimKit.canvas2d(this.entropyCanvas, {
          height: 185,
          onResize: () => this.drawEntropyCurve()
        });
      }
    }

    // Pointer scrubbing on Binary Entropy canvas
    if (this.entropyCanvas) {
      let dragging = false;
      const updateFromPointer = clientX => {
        const rect = this.entropyCanvas.getBoundingClientRect();
        if (rect.width <= 0) return;
        const pad = 28;
        const rel = (clientX - rect.left - pad) / Math.max(1, rect.width - pad * 2);
        const p = Math.round(Math.max(0, Math.min(1, rel)) * 100) / 100;
        this.entropyP = p;
        if (this.shannonSlider) this.shannonSlider.value = String(p);
        this.renderEntropyWidget();
      };
      this.entropyCanvas.addEventListener('pointerdown', e => {
        dragging = true;
        this.entropyCanvas.setPointerCapture(e.pointerId);
        updateFromPointer(e.clientX);
      });
      this.entropyCanvas.addEventListener('pointermove', e => {
        if (dragging) updateFromPointer(e.clientX);
      });
      this.entropyCanvas.addEventListener('pointerup', () => { dragging = false; });
      this.entropyCanvas.addEventListener('pointercancel', () => { dragging = false; });
    }
  }

  resizeCanvases() {
    this.decayKit?.resize();
    this.entropyKit?.resize();
    this.drawDecaySparkline();
    this.drawEntropyCurve();
  }

  switchStudioTab(tabId) {
    if (!tabId) return;
    this.activeTab = tabId;
    this.modeTabs.forEach(tab => {
      const active = tab.dataset.tqTab === tabId;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    this.modePanels.forEach(panel => {
      panel.hidden = panel.dataset.tqPanel !== tabId;
    });
    requestAnimationFrame(() => {
      this.resizeCanvases();
    });
  }

  switchInspectorTab(subTab) {
    this.inspectorTab = subTab;
    this.inspTabs.forEach(tab => {
      const active = tab.dataset.tqInspTab === subTab;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    this.inspPanels.forEach(panel => {
      panel.hidden = panel.dataset.tqInspPanel !== subTab;
    });
    if (subTab === 'library') this.renderLibrary();
  }

  handleAnswer(answer, forcedQId = null) {
    if (this.pendingAnswer || this.engine.isGameOver || this.engine.isGuessing) return;

    let qId = forcedQId;
    if (!qId) {
      const ranked = this.engine.rankQuestions(1);
      if (ranked.length === 0) {
        this.engine.isGuessing = true;
        this.engine.currentGuess = this.engine.getTopCandidates(1)[0]?.entity || null;
        this.renderPlayTab();
        return;
      }
      qId = ranked[0].question.id;
    }

    if (answer !== 'yes' && answer !== 'no') {
      this.usedFuzzyThisRound = true;
    }

    this.synth.beepClick();
    if (this.lcdFace) this.lcdFace.textContent = '( > _ < )';
    if (this.lcdStatusMsg) this.lcdStatusMsg.textContent = 'WEIGHING CLUE…';

    this.pendingAnswer = setTimeout(() => {
      this.pendingAnswer = null;
      this.engine.recordAnswer(qId, answer);
      if (this.engine.isGuessing) this.synth.revealChime();
      else this.synth.beepCompute();
      this.renderPlayTab();
    }, 110);
  }

  handleForceQuestionChoice(qId) {
    if (this.pendingAnswer || this.engine.isGameOver || this.engine.isGuessing) return;
    // Allow answering the chosen suboptimal question directly or putting it onto the LCD
    // Putting it onto the LCD as the active question lets the player answer Yes/No/Prob on the Orb!
    this.forcedQuestionId = qId;
    this.synth.beepClick();
    this.renderPlayTab();
  }

  handleUndo() {
    clearTimeout(this.pendingAnswer);
    this.pendingAnswer = null;
    this.forcedQuestionId = null;
    if (this.engine.undo()) {
      this.synth.beepClick();
      this.renderPlayTab();
    }
  }

  handleReset() {
    this.restartButton?.remove();
    clearTimeout(this.pendingAnswer);
    this.pendingAnswer = null;
    this.forcedQuestionId = null;
    this.usedFuzzyThisRound = false;
    this.synth.beepClick();
    this.engine.reset();
    this.renderPlayTab();
  }

  handleForceGuess() {
    if (this.pendingAnswer || this.engine.isGuessing || this.engine.isGameOver) return;
    const top = this.engine.getTopCandidates(1);
    if (top.length > 0) {
      this.engine.isGuessing = true;
      this.engine.currentGuess = top[0].entity;
      this.synth.revealChime();
      this.renderPlayTab();
    }
  }

  handleVictory() {
    this.synth.fanfareVictory();
    this.engine.isGameOver = true;
    this.engine.isGuessing = false;
    const qCount = this.engine.questionCount;
    if (qCount > 0 && (!this.progress.minWinQuestions || qCount < this.progress.minWinQuestions)) {
      this.progress.minWinQuestions = qCount;
    }
    if (this.usedFuzzyThisRound) {
      this.progress.usedFuzzyAndWon = true;
    }
    this.renderVictoryState();
    this.renderChallenges();
  }

  handleGuessWrong() {
    this.synth.soundStumped();
    this.engine.rejectCurrentGuess();
    this.forcedQuestionId = null;

    if (!this.engine.isGameOver && this.engine.questionCount < this.engine.maxQuestions) {
      this.renderPlayTab();
    } else {
      this.engine.isGameOver = true;
      this.renderStumpedState();
    }
  }

  openTeachDrawer() {
    clearTimeout(this.pendingAnswer);
    this.pendingAnswer = null;
    this.engine.lastRejectedGuess =
      (this.engine.isGuessing && this.engine.currentGuess) || this.engine.lastRejectedGuess || null;
    this.engine.isGameOver = true;
    this.engine.isGuessing = false;
    this.renderStumpedState();
    this.inputTeachName?.focus();
  }

  cancelTeachDrawer() {
    if (this.teachBox) this.teachBox.hidden = true;
    this.handleReset();
  }

  handleTeachSubmit() {
    const name = this.inputTeachName?.value?.trim();
    const cat = this.inputTeachCat?.value?.trim();
    const q = this.inputTeachQ?.value?.trim();
    const ansIsYes = this.selectTeachAns?.value === 'yes';
    if (!name || !q) return;

    this.engine.teachEntity(name, cat, q, ansIsYes);
    this.progress.taughtCount = this.engine.getCustomEntities().length;
    this.synth.fanfareVictory();
    this.teachForm?.reset();
    if (this.teachBox) this.teachBox.hidden = true;
    this.handleReset();
    this.renderLibrary();
    this.renderChallenges();
    if (this.statusLive) {
      this.statusLive.textContent = `Learned ${name}. Saved in this browser when storage is available.`;
    }
  }

  toggleViewMode() {
    this.currentMode = this.currentMode === 'inspector' ? 'toy' : 'inspector';
    if (this.inspectorSide) this.inspectorSide.hidden = this.currentMode === 'toy';
    if (this.playStage) this.playStage.classList.toggle('is-toy-mode', this.currentMode === 'toy');
    if (this.modeToggleBtn) {
      const isInsp = this.currentMode === 'inspector';
      this.modeToggleBtn.textContent = isInsp ? '🔬 Inspector: On' : '🎮 Retro Toy Mode';
      this.modeToggleBtn.classList.toggle('is-active', isInsp);
      this.modeToggleBtn.setAttribute('aria-pressed', String(isInsp));
    }
    requestAnimationFrame(() => this.resizeCanvases());
  }

  cycleBacklight() {
    const lights = ['green', 'amber', 'cyan'];
    this.currentBacklight = lights[(lights.indexOf(this.currentBacklight) + 1) % lights.length];
    if (this.backlightBtn) {
      const labels = { green: 'Emerald', amber: 'Amber', cyan: 'Cyan' };
      this.backlightBtn.textContent = `💡 ${labels[this.currentBacklight]}`;
    }
    if (this.lcdScreen) {
      this.lcdScreen.dataset.backlight = this.currentBacklight;
    }
  }

  toggleSound() {
    this.synth.muted = !this.synth.muted;
    if (this.soundBtn) {
      this.soundBtn.textContent = this.synth.muted ? '🔇 Sound: Off' : '🔊 Sound: On';
      this.soundBtn.setAttribute('aria-pressed', String(!this.synth.muted));
    }
  }

  getActiveQuestionData() {
    const ranked = this.engine.rankQuestions(5);
    if (ranked.length === 0) return { active: null, ranked: [] };
    if (this.forcedQuestionId) {
      const match = this.engine.questions.find(q => q.id === this.forcedQuestionId);
      const alreadyAsked = this.engine.askedQuestions.some(a => a.qId === this.forcedQuestionId);
      if (match && !alreadyAsked) {
        const evalRes = this.engine.evaluateQuestionInformationGain(match.id);
        return {
          active: { question: match, ...evalRes, isOverride: true },
          ranked
        };
      }
      this.forcedQuestionId = null;
    }
    return { active: ranked[0], ranked };
  }

  renderAll() {
    this.renderPlayTab();
    this.renderReverseTab();
    this.renderEntropyWidget();
    this.renderBitsWidget();
    this.renderLlmLab();
    this.renderChallenges();
  }

  renderPlayTab() {
    if (this.revealBanner) this.revealBanner.hidden = !this.engine.isGuessing;
    if (this.teachBox) this.teachBox.hidden = true;
    if (this.controlsCluster) this.controlsCluster.hidden = this.engine.isGuessing || this.engine.isGameOver;

    if (this.btnUndo) {
      this.btnUndo.disabled = this.engine.undoStack.length === 0;
    }
    if (this.btnGuessNow) {
      this.btnGuessNow.disabled = this.engine.isGuessing || this.engine.isGameOver;
    }

    const qNum = this.engine.questionCount + 1;
    const currentH = this.engine.currentEntropy;
    const initialH = this.engine.initialEntropy;

    if (this.lcdQNum) this.lcdQNum.textContent = `Q: ${String(Math.min(20, qNum)).padStart(2, '0')}/20`;
    if (this.lcdEntropyBits) this.lcdEntropyBits.textContent = `H: ${currentH.toFixed(2)} BITS`;

    if (this.lcdMeterFill) {
      const pct = Math.max(0, Math.min(100, (currentH / (initialH || 6.9)) * 100));
      this.lcdMeterFill.style.width = `${pct.toFixed(1)}%`;
    }

    if (this.engine.isGuessing) {
      if (this.lcdFace) this.lcdFace.textContent = '( ★ _ ★ )';
      if (this.lcdStatusMsg) this.lcdStatusMsg.textContent = 'SYNAPSE LOCKED: GUESSING';
    } else if (currentH < 1.2) {
      if (this.lcdFace) this.lcdFace.textContent = '( ^ _ ^ )';
      if (this.lcdStatusMsg) this.lcdStatusMsg.textContent = 'HIGH CONFIDENCE';
    } else if (currentH < 3.2) {
      if (this.lcdFace) this.lcdFace.textContent = '( • _ • )';
      if (this.lcdStatusMsg) this.lcdStatusMsg.textContent = 'DIVIDING SPACE';
    } else {
      if (this.lcdFace) this.lcdFace.textContent = '( ? _ ? )';
      if (this.lcdStatusMsg) this.lcdStatusMsg.textContent = 'PROBING CLUES';
    }

    const { active, ranked } = this.getActiveQuestionData();
    this.currentActiveQId = active?.question?.id || null;

    // Update click handlers so active override question is answered when user clicks Orb buttons!
    // Wait: override handleAnswer uses currentActiveQId if present.
    if (this.engine.isGuessing) {
      const guess = this.engine.currentGuess;
      if (this.lcdText) this.lcdText.textContent = `ARE YOU THINKING OF: ${guess ? guess.name.toUpperCase() : 'UNKNOWN'}?`;
      if (this.lcdSubtext) this.lcdSubtext.textContent = 'Confirm below (Y or N)';
      if (this.revealTarget) this.revealTarget.textContent = guess?.name || '';
      if (this.revealDesc) this.revealDesc.textContent = guess?.desc || '';
    } else if (active) {
      if (this.lcdText) this.lcdText.textContent = active.question.text;
      const pctY = Math.round(active.pYes * 100);
      if (this.lcdSubtext) {
        const prefix = active.isOverride ? 'Custom pick · Gain' : 'Expected Gain';
        this.lcdSubtext.textContent = `${prefix}: +${active.informationGain.toFixed(2)} bits (${pctY}% Yes / ${100 - pctY}% No)`;
      }
    } else {
      if (this.lcdText) this.lcdText.textContent = 'Ready to make my best guess!';
      if (this.lcdSubtext) this.lcdSubtext.textContent = 'Press Guess Now below.';
    }

    // Telemetry stats
    if (this.statEntropy) this.statEntropy.textContent = currentH.toFixed(2);
    if (this.statCandidates) this.statCandidates.textContent = String(this.engine.getActiveCandidateCount());
    const bitsRemoved = Math.max(0, initialH - currentH);
    if (this.statBitsRemoved) this.statBitsRemoved.textContent = bitsRemoved.toFixed(2);
    if (this.statEfficiency) {
      this.statEfficiency.textContent = this.engine.questionCount > 0
        ? `${(bitsRemoved / this.engine.questionCount).toFixed(2)} b/q`
        : '—';
    }

    this.drawDecaySparkline();
    this.renderInformationGainLeaderboard(ranked, active);
    this.renderCandidateLeaderboard();
    this.renderHistoryTrail();
    if (this.libTabCount) this.libTabCount.textContent = String(this.engine.entities.length);
    if (this.inspectorTab === 'library') this.renderLibrary();

    if (this.statusLive) {
      this.statusLive.textContent = this.engine.isGuessing
        ? `The AI guesses: ${this.engine.currentGuess?.name || 'unknown'}`
        : `Question ${qNum}: ${this.lcdText?.textContent || ''}`;
    }
  }

  renderVictoryState() {
    this.restartButton?.remove();
    if (this.lcdText) {
      this.lcdText.textContent = `I GUESSED IT! ${this.engine.currentGuess?.name?.toUpperCase() || ''}!`;
    }
    if (this.lcdSubtext) {
      const removed = (this.engine.initialEntropy - this.engine.currentEntropy).toFixed(2);
      this.lcdSubtext.textContent = `Solved in ${this.engine.questionCount} question${this.engine.questionCount === 1 ? '' : 's'} · ${removed} bits resolved`;
    }
    if (this.lcdFace) this.lcdFace.textContent = '( ^ ▽ ^ )';
    if (this.lcdStatusMsg) this.lcdStatusMsg.textContent = 'TARGET CONFIRMED';
    if (this.revealBanner) this.revealBanner.hidden = true;
    if (this.controlsCluster) this.controlsCluster.hidden = true;
    if (this.btnUndo) this.btnUndo.disabled = this.engine.undoStack.length === 0;
    this.showRestart();
  }

  renderStumpedState() {
    this.restartButton?.remove();
    if (this.lcdText) this.lcdText.textContent = 'YOU OUTSMARTED THE ORACLE!';
    if (this.lcdSubtext) this.lcdSubtext.textContent = 'Teach your item below so the engine learns for next round.';
    if (this.lcdFace) this.lcdFace.textContent = '( × _ × )';
    if (this.lcdStatusMsg) this.lcdStatusMsg.textContent = 'NEW KNOWLEDGE NEEDED';
    if (this.revealBanner) this.revealBanner.hidden = true;
    if (this.controlsCluster) this.controlsCluster.hidden = true;
    if (this.teachBox) this.teachBox.hidden = false;
    this.showRestart();
  }

  showRestart() {
    this.restartButton?.remove();
    const button = document.createElement('button');
    this.restartButton = button;
    button.type = 'button';
    button.className = 'tq-btn-correct tq-lcd-restart';
    button.textContent = 'Play again';
    button.addEventListener('click', () => this.handleReset());
    this.lcdScreen?.appendChild(button);
  }

  drawDecaySparkline() {
    if (!this.decayKit) return;
    const { ctx, width, height } = this.decayKit;
    if (width <= 0 || height <= 0) return;

    ctx.clearRect(0, 0, width, height);
    const padL = 28;
    const padR = 12;
    const padT = 10;
    const padB = 18;
    const plotW = Math.max(10, width - padL - padR);
    const plotH = Math.max(10, height - padT - padB);
    const h0 = this.engine.initialEntropy || 6.9;
    const maxSteps = Math.max(10, Math.ceil(h0) + 2, this.engine.questionCount);

    // Subtle dark slate telemetry plot
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Grid baseline & top line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    // Ideal -1 bit/Q line from (0, h0) to (h0, 0)
    const idealEndX = padL + Math.min(1, h0 / maxSteps) * plotW;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(idealEndX, padT + plotH);
    ctx.stroke();
    ctx.restore();

    // Actual entropy series
    const series = this.engine.getEntropySeries();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    series.forEach((hVal, stepIdx) => {
      const x = padL + (stepIdx / maxSteps) * plotW;
      const y = padT + (1 - Math.max(0, Math.min(1, hVal / h0))) * plotH;
      if (stepIdx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    series.forEach((hVal, stepIdx) => {
      const x = padL + (stepIdx / maxSteps) * plotW;
      const y = padT + (1 - Math.max(0, Math.min(1, hVal / h0))) * plotH;
      ctx.fillStyle = stepIdx === series.length - 1 ? '#4ade80' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(x, y, stepIdx === series.length - 1 ? 3.5 : 2.3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.fillText(h0.toFixed(1), 3, padT + 7);
    ctx.fillText('0', 14, padT + plotH + 3);
    ctx.fillText('Q0', padL - 2, height - 4);
    ctx.fillText(`Q${this.engine.questionCount}`, Math.min(width - 28, padL + (this.engine.questionCount / maxSteps) * plotW - 6), height - 4);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('Actual vs Ideal -1b/Q', Math.max(padL + 36, width - 134), padT + 9);
  }

  renderInformationGainLeaderboard(ranked, active) {
    if (!this.igList) return;
    const list = ranked ? ranked.slice(0, 4) : this.engine.rankQuestions(4);
    this.igList.innerHTML = '';

    if (list.length === 0) {
      this.igList.innerHTML = '<p class="tq-empty-note">All distinguishing clues evaluated.</p>';
      return;
    }

    list.forEach((item, idx) => {
      const pctYes = Math.round(item.pYes * 100);
      const pctNo = 100 - pctYes;
      const isSelected = active && active.question.id === item.question.id;
      const row = document.createElement('div');
      row.className = `tq-ig-item ${isSelected ? 'is-chosen' : ''}`;
      row.innerHTML = `
        <div class="tq-ig-top">
          <div class="tq-ig-q-text">${isSelected ? '★ ' : ''}${escapeHTML(item.question.text)}</div>
          <div class="tq-ig-meta">
            ${idx === 0 ? '<span class="tq-ig-chosen-badge">Best Split</span>' : ''}
            ${isSelected ? '<span class="tq-ig-active-badge">Active</span>' : `<button type="button" class="tq-ig-ask-btn" data-tq-ask-qid="${escapeHTML(item.question.id)}">Ask this</button>`}
            <span class="tq-ig-pill">+${item.informationGain.toFixed(2)} b</span>
          </div>
        </div>
        <div class="tq-ig-split-row">
          <span class="tq-ig-split-bar" aria-hidden="true">
            <span class="tq-ig-split-yes" style="width:${pctYes}%"></span>
          </span>
          <span class="tq-ig-split-nums">${pctYes}% Y / ${pctNo}% N</span>
        </div>
      `;
      this.igList.appendChild(row);
    });
  }

  renderCandidateLeaderboard() {
    if (!this.candidateBars) return;
    const candidates = this.engine.getTopCandidates(5);
    this.candidateBars.innerHTML = '';

    candidates.forEach(cand => {
      const pct = (cand.probability * 100).toFixed(1);
      const icon = getCategoryIcon(cand.entity.category);
      const row = document.createElement('div');
      row.className = 'tq-cand-row';
      row.innerHTML = `
        <div class="tq-cand-name" title="${escapeHTML(cand.entity.name)} (${escapeHTML(cand.entity.category)})">${icon} ${escapeHTML(cand.entity.name)}</div>
        <div class="tq-cand-track"><div class="tq-cand-fill" style="width:${pct}%"></div></div>
        <div class="tq-cand-pct">${pct}%</div>
      `;
      this.candidateBars.appendChild(row);
    });
  }

  renderHistoryTrail() {
    if (!this.historyList) return;
    this.historyList.innerHTML = '';
    if (this.engine.askedQuestions.length === 0) {
      this.historyList.innerHTML = '<p class="tq-empty-note">No clues answered yet. Pick a secret item and press a button on the console.</p>';
      return;
    }

    const qMap = new Map(this.engine.questions.map(q => [q.id, q.text]));
    this.engine.askedQuestions.forEach((rec, idx) => {
      const item = document.createElement('div');
      item.className = 'tq-history-item';
      const qText = qMap.get(rec.qId) || 'Clue';
      const deltaSign = rec.entropyDelta >= 0 ? '−' : '+';
      const deltaAbs = Math.abs(rec.entropyDelta).toFixed(2);
      const surprise = rec.entropyDelta > 1.0 ? '<span class="tq-surprise-pill">High surprise</span>' : '';
      item.innerHTML = `
        <div class="tq-history-q"><strong>Q${idx + 1}:</strong> ${escapeHTML(qText)}</div>
        <div class="tq-history-tags">
          ${surprise}
          <span class="tq-delta-pill" title="Actual entropy change">${deltaSign}${deltaAbs} b</span>
          <span class="tq-ans-pill tq-ans-${escapeHTML(rec.answer)}">${escapeHTML(rec.answer.toUpperCase())}</span>
        </div>
      `;
      this.historyList.appendChild(item);
    });
  }

  renderLibrarySecretBanner() {
    if (!this.libSecretBanner) return;
    if (!this.randomSecret) {
      this.libSecretBanner.hidden = true;
      this.libSecretBanner.innerHTML = '';
      return;
    }
    this.libSecretBanner.hidden = false;
    const icon = getCategoryIcon(this.randomSecret.category);
    this.libSecretBanner.innerHTML = `
      <span>Secret challenge: ${this.secretRevealed
        ? `<strong>${icon} ${escapeHTML(this.randomSecret.name)}</strong> (${escapeHTML(this.randomSecret.category)})`
        : '<strong>[Hidden — keep it secret while playing!]</strong>'
      }</span>
      <span class="tq-secret-actions">
        <button type="button" class="tq-mini-btn" data-tq-toggle-secret>${this.secretRevealed ? 'Hide' : 'Peek'}</button>
        <button type="button" class="tq-mini-btn" data-tq-clear-secret>Clear</button>
      </span>
    `;
  }

  renderLibrary() {
    if (!this.libList) return;
    const customCount = this.engine.getCustomEntities().length;
    if (this.libClearCustomBtn) {
      this.libClearCustomBtn.hidden = customCount === 0;
    }
    this.renderLibrarySecretBanner();

    const filtered = this.engine.entities.filter(e => {
      if (this.libraryCategory !== 'all' && e.category !== this.libraryCategory) return false;
      if (this.libraryQuery) {
        const hay = `${e.name} ${e.category} ${e.desc}`.toLowerCase();
        if (!hay.includes(this.libraryQuery)) return false;
      }
      return true;
    });

    this.libList.innerHTML = '';
    if (filtered.length === 0) {
      this.libList.innerHTML = '<p class="tq-empty-note">No items match that filter.</p>';
      return;
    }

    filtered.forEach(entity => {
      const card = document.createElement('div');
      card.className = 'tq-lib-row';
      const icon = getCategoryIcon(entity.category);
      const isCustom = Boolean(entity.isCustom) || String(entity.id).startsWith('custom_');
      card.innerHTML = `
        <div class="tq-lib-row-main">
          <strong>${icon} ${escapeHTML(entity.name)} ${isCustom ? '<span class="tq-custom-badge">Taught</span>' : ''}</strong>
          <small>${escapeHTML(entity.category)} · ${escapeHTML(entity.desc)}</small>
        </div>
        ${isCustom ? `<button type="button" class="tq-mini-btn tq-mini-btn--danger" data-tq-delete-entity="${escapeHTML(entity.id)}" aria-label="Delete ${escapeHTML(entity.name)}">Delete</button>` : ''}
      `;
      this.libList.appendChild(card);
    });
  }

  // ── TAB 2: REVERSE 20Q ────────────────────────────────────────────────────
  startNewReverseGame() {
    this.reverseSession = new Reverse20QSession({ tier: this.reverseTier });
    this.reverseLastFeedback = null;
    this.synth.beepClick();
    this.renderReverseTab();
  }

  renderReverseTab() {
    this.revTierBtns.forEach(btn => {
      const active = btn.dataset.tqRevTier === this.reverseTier;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    const stats = this.reverseSession.getStats();
    if (this.revStatRem) this.revStatRem.textContent = `${stats.remainingCount} / ${stats.tierSize}`;
    if (this.revStatTurns) this.revStatTurns.textContent = String(stats.turns);
    if (this.revStatOpt) this.revStatOpt.textContent = `${stats.optimalBits} bits`;
    if (this.revStatH) this.revStatH.textContent = `${stats.entropyRemaining.toFixed(2)} b`;

    // Candidate grid
    if (this.revCandidatesGrid) {
      const remainingSet = this.reverseSession.remainingIds;
      const all = this.reverseSession.getAllEntities();
      this.revCandidatesGrid.innerHTML = all.map(e => {
        const alive = remainingSet.has(e.id);
        const isSecret = stats.won && e.id === stats.secretEntity.id;
        const icon = getCategoryIcon(e.category);
        return `
          <button type="button"
            class="tq-rev-card ${alive ? 'is-alive' : 'is-eliminated'} ${isSecret ? 'is-winner' : ''}"
            data-tq-rev-guess="${escapeHTML(e.id)}"
            ${!alive || stats.isFinished ? 'disabled' : ''}
            title="${alive ? `Guess ${escapeHTML(e.name)}` : 'Eliminated'}">
            <span class="tq-rev-card-icon">${icon}</span>
            <span class="tq-rev-card-name">${escapeHTML(e.name)}</span>
          </button>
        `;
      }).join('');
    }

    // Feedback banner
    if (this.revFeedback) {
      if (stats.won) {
        const efficiencyNote = stats.turns <= stats.optimalBits + 1
          ? 'Optimal Shannon efficiency!'
          : `Shannon bound was ${stats.optimalBits} bits — try a closer 50/50 first split!`;
        this.revFeedback.className = 'tq-rev-feedback is-win';
        this.revFeedback.innerHTML = `
          <strong>Solved: ${escapeHTML(stats.secretEntity.name)}!</strong>
          <span>Found in ${stats.turns} turns (${stats.questionTurns} questions, ${stats.optimalHits} optimal splits). ${escapeHTML(efficiencyNote)}</span>
        `;
      } else if (this.reverseLastFeedback?.type === 'question') {
        const s = this.reverseLastFeedback.step;
        this.revFeedback.className = `tq-rev-feedback ${s.isOptimal ? 'is-opt' : 'is-info'}`;
        this.revFeedback.innerHTML = `
          <strong>Answer: ${s.answer.toUpperCase()}</strong>
          <span>${s.remainingBefore} → ${s.remainingAfter} candidates (${s.bitsRemoved.toFixed(2)} bits). Your question IG: +${s.chosenIG.toFixed(2)} b vs Shannon optimal: +${s.bestIG.toFixed(2)} b ${s.isOptimal ? '★ Optimal!' : ''}</span>
        `;
      } else if (this.reverseLastFeedback?.type === 'guess') {
        const g = this.reverseLastFeedback.outcome;
        this.revFeedback.className = 'tq-rev-feedback is-miss';
        this.revFeedback.innerHTML = `
          <strong>Not ${escapeHTML(g.guessed.name)}!</strong>
          <span>Removed from grid (${g.remainingAfter} candidates remain).</span>
        `;
      } else {
        this.revFeedback.className = 'tq-rev-feedback';
        this.revFeedback.innerHTML = `
          <strong>Your turn to play the AI</strong>
          <span>Pick a question below that splits the ${stats.remainingCount} candidates closest to half-and-half, or click any card on the left to guess!</span>
        `;
      }
    }

    // Available questions list
    if (this.revQuestionsList) {
      if (stats.won) {
        this.revQuestionsList.innerHTML = `
          <div class="tq-rev-done-box">
            <p>Round complete! Pick a larger tier or start a new secret item.</p>
          </div>
        `;
      } else {
        const available = this.reverseSession.getAvailableQuestions();
        if (available.length === 0) {
          this.revQuestionsList.innerHTML = '<p class="tq-empty-note">Only one candidate remains — click it on the grid to confirm your guess!</p>';
        } else {
          // Present in stable alphabetical/text order unless Coach Hint is ON, so student inspects splits rather than blindly clicking row 0
          const displayed = this.reverseCoachHint
            ? available.slice(0, 12)
            : [...available].sort((a, b) => a.question.id.localeCompare(b.question.id)).slice(0, 14);

          this.revQuestionsList.innerHTML = displayed.map(item => `
            <button type="button" class="tq-rev-q-btn ${this.reverseCoachHint && item.isOptimal ? 'is-opt-hint' : ''}" data-tq-rev-ask="${escapeHTML(item.question.id)}">
              <span class="tq-rev-q-text">${escapeHTML(item.question.text)}</span>
              ${this.reverseCoachHint
                ? `<span class="tq-rev-q-meta">${item.yesCount}Y / ${item.noCount}N · +${item.informationGain.toFixed(2)}b${item.isOptimal ? ' ★' : ''}</span>`
                : '<span class="tq-rev-q-meta">Ask →</span>'}
            </button>
          `).join('');
        }
      }
    }
  }

  // ── TAB 3: ENTROPY, BITS & LLM LAB ────────────────────────────────────────
  renderEntropyWidget() {
    const p = Math.max(0, Math.min(1, this.entropyP));
    const h = binaryEntropy(p);
    if (this.shannonPVal) this.shannonPVal.textContent = p.toFixed(2);
    if (this.shannonHVal) this.shannonHVal.textContent = h.toFixed(3);
    if (this.shannonEffVal) this.shannonEffVal.textContent = perplexity(h).toFixed(2);
    this.drawEntropyCurve();
  }

  drawEntropyCurve() {
    if (!this.entropyKit) return;
    const { ctx, width, height } = this.entropyKit;
    if (width <= 0 || height <= 0) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const padX = 32;
    const padY = 22;
    const graphW = Math.max(20, width - padX * 2);
    const graphH = Math.max(20, height - padY * 2);

    // Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, padY);
    ctx.lineTo(padX, height - padY);
    ctx.lineTo(width - padX, height - padY);
    ctx.stroke();

    // 50/50 center line
    ctx.save();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padX + graphW * 0.5, padY);
    ctx.lineTo(padX + graphW * 0.5, height - padY);
    ctx.stroke();
    ctx.restore();

    // Curve
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      const ent = binaryEntropy(p);
      const x = padX + p * graphW;
      const y = height - padY - ent * graphH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Marker
    const currentH = binaryEntropy(this.entropyP);
    const dotX = padX + this.entropyP * graphW;
    const dotY = height - padY - currentH * graphH;
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 11px "IBM Plex Mono", ui-monospace, monospace';
    const labelX = Math.max(padX + 4, Math.min(width - padX - 96, dotX - 42));
    const labelY = Math.max(padY + 12, dotY - 12);
    ctx.fillText(`H = ${currentH.toFixed(3)} b`, labelX, labelY);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('p=0', padX - 8, height - 6);
    ctx.fillText('0.5', padX + graphW * 0.5 - 10, height - 6);
    ctx.fillText('p=1', width - padX - 14, height - 6);
    ctx.fillText('1.0', 6, padY + 4);
  }

  renderBitsWidget() {
    if (!this.bitsSlider) return;
    const b = parseInt(this.bitsSlider.value, 10) || 1;
    const total = Math.pow(2, b);
    if (this.bitsVal) this.bitsVal.textContent = String(b);
    if (this.totalStatesVal) this.totalStatesVal.textContent = total.toLocaleString();

    const metaphors = [
      [1, 'Coin flip: Heads or Tails (2 outcomes)'],
      [2, '4 card suits: Spades, Hearts, Diamonds, Clubs'],
      [4, '16 compass directions or hexadecimal digits'],
      [6, '64 squares on a full chessboard'],
      [8, '256 combinations in one classic computer byte'],
      [10, '1,024 possibilities — over a thousand items in 10 questions'],
      [12, '4,096 items in a neighborhood hardware store'],
      [15, '32,768 seats in a packed stadium'],
      [18, '262,144 distinct library volumes'],
      [20, '1,048,576 possibilities — over a million distinct items!']
    ];
    let text = metaphors[metaphors.length - 1][1];
    for (const [k, msg] of metaphors) {
      if (b <= k) { text = msg; break; }
    }
    if (this.metaphorText) this.metaphorText.textContent = text;
  }

  renderLlmLab() {
    const promptObj = LLM_PROMPTS.find(p => p.id === this.llmPromptId) || LLM_PROMPTS[0];
    const modelObj = promptObj.models[this.llmModelKey] || promptObj.models.trained;
    const probs = softmaxWithTemperature(modelObj.logits, this.llmTemperature);
    const h = distributionEntropy(probs);
    const perp = perplexity(h);
    const loss = crossEntropy(promptObj.targetIndex, probs);

    if (this.llmTempVal) this.llmTempVal.textContent = this.llmTemperature.toFixed(2);
    if (this.llmPromptDisplay) this.llmPromptDisplay.textContent = promptObj.prompt;
    if (this.llmHVal) this.llmHVal.textContent = `${h.toFixed(2)} b`;
    if (this.llmPerpVal) this.llmPerpVal.textContent = perp.toFixed(2);
    if (this.llmLossVal) this.llmLossVal.textContent = `${loss.toFixed(2)} b`;

    if (this.llmBars) {
      this.llmBars.innerHTML = promptObj.tokens.map((tok, i) => {
        const pct = (probs[i] * 100).toFixed(1);
        const isTarget = i === promptObj.targetIndex;
        return `
          <div class="tq-llm-row ${isTarget ? 'is-target' : ''}">
            <span class="tq-llm-tok">"${escapeHTML(tok)}" ${isTarget ? '<em class="tq-llm-target-tag">target</em>' : ''}</span>
            <span class="tq-llm-track"><span class="tq-llm-fill" style="width:${pct}%"></span></span>
            <span class="tq-llm-pct">${pct}%</span>
          </div>
        `;
      }).join('');
    }
  }

  renderChallenges() {
    const res = evaluateChallenges(this.progress);
    if (this.challengePill) {
      this.challengePill.textContent = `Challenges: ${res.count} / ${res.total}`;
    }
    if (this.challengesList) {
      this.challengesList.innerHTML = STUDIO_CHALLENGES.map(ch => {
        const done = res.completed[ch.id];
        return `
          <div class="tq-challenge-row ${done ? 'is-done' : ''}">
            <div>
              <strong>${escapeHTML(ch.title)}</strong>
              <p>${escapeHTML(ch.desc)}</p>
            </div>
            <span class="tq-challenge-status">${done ? 'Done ✓' : 'Pending'}</span>
          </div>
        `;
      }).join('');
    }
  }

  // ── EDITORIAL PRACTICE & SELF-CHECK ───────────────────────────────────────
  initPracticeSelfCheck() {
    const scoreEl = document.getElementById('tq-practice-score');
    const buttons = [...document.querySelectorAll('[data-tq-check]')];
    if (!buttons.length) return;
    const solved = new Set();

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.tqCheck;
        const type = btn.dataset.tqType;
        const expected = btn.dataset.tqAnswer;
        const input = document.getElementById(`tqans-${id}`);
        const fb = document.getElementById(`tqfb-${id}`);
        const hint = document.getElementById(`tqhint-${id}`);
        if (!input || !fb) return;

        const raw = String(input.value || '').trim();
        if (!raw) {
          fb.textContent = 'Enter or select an answer first.';
          fb.className = 'tq-feedback is-miss';
          return;
        }

        const correct = type === 'number'
          ? Math.abs(parseFloat(raw) - parseFloat(expected)) < 1e-6
          : raw.toLowerCase() === expected.toLowerCase();

        if (correct) {
          solved.add(id);
          fb.textContent = 'Correct!';
          fb.className = 'tq-feedback is-ok';
          if (hint) hint.hidden = true;
        } else {
          fb.textContent = 'Not quite — check the hint below.';
          fb.className = 'tq-feedback is-miss';
          if (hint) hint.hidden = false;
        }

        if (scoreEl) scoreEl.textContent = `Score: ${solved.size} / ${buttons.length}`;
      });
    });
  }
}

// Wrap handleAnswer to respect forced question selection cleanly
const origHandleAnswer = TwentyQuestionsStudioApp.prototype.handleAnswer;
TwentyQuestionsStudioApp.prototype.handleAnswer = function (answer) {
  const qId = this.forcedQuestionId || null;
  this.forcedQuestionId = null;
  return origHandleAnswer.call(this, answer, qId);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.TwentyQuestionsInstance = new TwentyQuestionsStudioApp();
  });
} else {
  window.TwentyQuestionsInstance = new TwentyQuestionsStudioApp();
}
