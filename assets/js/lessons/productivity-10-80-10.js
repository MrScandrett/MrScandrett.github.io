(function () {
  'use strict';

  const audioEngine = {
    ctx: null,
    focusNodes: [],
    ensure: function () {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return null;
        this.ctx = new AudioContext();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(function () {});
      }
      return this.ctx;
    },
    stopFocus: function () {
      this.focusNodes.forEach(function (node) {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (err) {}
      });
      this.focusNodes = [];
    },
    playPlanChime: function () {
      const ctx = this.ensure();
      if (!ctx) return;
      [523.25, 659.25].forEach(function (freq, index) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.02 + (index * 0.03));
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.36 + (index * 0.04));
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + (index * 0.05));
        osc.stop(ctx.currentTime + 0.42 + (index * 0.05));
      });
    },
    playFocusDrone: function () {
      const ctx = this.ensure();
      if (!ctx) return;
      this.stopFocus();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.value = 74;
      filter.type = 'lowpass';
      filter.frequency.value = 180;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.018, ctx.currentTime + 0.18);
      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start();
      this.focusNodes = [osc, gain, filter];
    },
    playReviewChord: function () {
      const ctx = this.ensure();
      if (!ctx) return;
      this.stopFocus();
      [392, 493.88, 587.33].forEach(function (freq, index) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 0.03 + (index * 0.02));
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + (index * 0.03));
        osc.stop(ctx.currentTime + 0.75);
      });
    }
  };

  const contexts = {
    study: {
      summary: 'Use the opening minutes to decode the assignment, the middle stretch to produce a full attempt, and the ending to compare your work to the directions.',
      plan: [
        'Read the prompt or rubric all the way through once.',
        'List the materials, tabs, or notes you will actually use.',
        'Pick the first question or first paragraph before you begin.'
      ],
      focus: [
        'Work straight through to a halfway checkpoint.',
        'Aim for a complete draft or full first pass, not scattered fragments.',
        'Ignore polishing until the review block.'
      ],
      review: [
        'Check directions, missing parts, and obvious mistakes.',
        'Fix the weakest answer first.',
        'Write the next step if another session is needed.'
      ]
    },
    build: {
      summary: 'Front-load the success criteria, protect a long build window, and save time at the end for testing instead of guessing that it works.',
      plan: [
        'Define what working means before you start building.',
        'Set up tools, files, or materials in one pass.',
        'Choose one milestone you should hit by the halfway mark.'
      ],
      focus: [
        'Stay in build mode long enough to create a meaningful chunk.',
        'Keep notes on problems, but do not derail the session chasing every side idea.',
        'Reach the milestone before switching into cleanup.'
      ],
      review: [
        'Test the weakest point, edge case, or failure mode.',
        'Compare the result to the goal you wrote at the start.',
        'Capture one improvement for the next iteration.'
      ]
    },
    team: {
      summary: 'Teams need shared clarity first, protected execution time second, and a debrief at the end so confusion does not carry into the next meeting.',
      plan: [
        'Agree on the goal, roles, and constraints.',
        'Decide what each person owns before work spreads out.',
        'Name the checkpoint or handoff point in advance.'
      ],
      focus: [
        'Let people stay with their role instead of constantly re-syncing.',
        'Use one scheduled check-in instead of nonstop interruption.',
        'Track blockers without turning every blocker into a full group discussion.'
      ],
      review: [
        'Compare what was finished to what was promised.',
        'Note what slowed the team down or created confusion.',
        'Leave with clear next owners and next actions.'
      ]
    }
  };

  const taskName = document.getElementById('task-name');
  const taskContext = document.getElementById('task-context');
  const totalRange = document.getElementById('total-minutes-range');
  const totalNumber = document.getElementById('total-minutes-number');
  if (!taskName || !taskContext || !totalRange || !totalNumber) return;

  const presets = Array.from(document.querySelectorAll('.p1080-preset'));

  const planTitle = document.getElementById('p1080-plan-title');
  const summary = document.getElementById('p1080-summary');
  const planDuration = document.getElementById('p1080-plan-duration');
  const focusDuration = document.getElementById('p1080-focus-duration');
  const reviewDuration = document.getElementById('p1080-review-duration');
  const planWindow = document.getElementById('p1080-plan-window');
  const focusWindow = document.getElementById('p1080-focus-window');
  const reviewWindow = document.getElementById('p1080-review-window');
  const planList = document.getElementById('p1080-plan-list');
  const focusList = document.getElementById('p1080-focus-list');
  const reviewList = document.getElementById('p1080-review-list');
  const barPlan = document.getElementById('p1080-bar-plan');
  const barFocus = document.getElementById('p1080-bar-focus');
  const barReview = document.getElementById('p1080-bar-review');
  const barPlanLabel = document.getElementById('p1080-bar-plan-label');
  const barFocusLabel = document.getElementById('p1080-bar-focus-label');
  const barReviewLabel = document.getElementById('p1080-bar-review-label');
  const startSessionButton = document.getElementById('p1080-start-session');
  const distractionButton = document.getElementById('p1080-distraction-btn');
  const endSessionButton = document.getElementById('p1080-end-session');
  const efficiencyScore = document.getElementById('p1080-efficiency-score');
  const livePhase = document.getElementById('p1080-live-phase');
  const penaltyCount = document.getElementById('p1080-penalty-count');
  const nextShift = document.getElementById('p1080-next-shift');
  const gaugeNeedle = document.getElementById('p1080-gauge-needle');
  const gaugeArc = document.getElementById('p1080-gauge-arc');
  const sessionLayer = document.getElementById('p1080-session-layer');
  const sessionPhaseLabel = document.getElementById('p1080-session-phase-label');
  const sessionTimer = document.getElementById('p1080-session-timer');
  const planPane = document.getElementById('p1080-phase-plan');
  const focusPane = document.getElementById('p1080-phase-focus');
  const reviewPane = document.getElementById('p1080-phase-review');
  const sessionPlanList = document.getElementById('p1080-session-plan-list');
  const sessionReviewList = document.getElementById('p1080-session-review-list');
  const focusMessage = document.getElementById('p1080-focus-message');
  const reviewReflection = document.getElementById('p1080-review-reflection');
  const sessionManifest = document.getElementById('p1080-session-manifest');
  const manifestLog = document.getElementById('p1080-manifest-log');
  const mainContent = document.getElementById('main-content');
  const footerLandmark = document.querySelector('.p1080-footer');
  let lastFocusedBeforeSession = null;

  const WORKFLOW_ENGINE = {
    active: false,
    timerId: null,
    penaltyCount: 0,
    phase: 'idle',
    schedule: null,
    startedAt: null,
    endedAt: null,
    lastFocusLossAt: 0,
    updateEfficiency: function () {
      const score = Math.max(0, 100 - (this.penaltyCount * 2));
      efficiencyScore.textContent = score + '%';
      penaltyCount.textContent = String(this.penaltyCount);
      const dashTotal = 239;
      gaugeArc.style.strokeDasharray = dashTotal;
      gaugeArc.style.strokeDashoffset = dashTotal * (1 - score / 100);
      const angle = -90 + (score / 100) * 180;
      const radians = angle * (Math.PI / 180);
      const x = 100 + Math.cos(radians) * 56;
      const y = 100 + Math.sin(radians) * 56;
      gaugeNeedle.setAttribute('x2', x.toFixed(2));
      gaugeNeedle.setAttribute('y2', y.toFixed(2));
    },
    logPenalty: function (source) {
      if (!this.active) return;
      const now = Date.now();
      if (now - this.lastFocusLossAt < 1200) return;
      this.lastFocusLossAt = now;
      this.penaltyCount += 1;
      this.updateEfficiency();
      nextShift.textContent = 'Penalty logged via ' + source;
    },
    start: function (sessionData) {
      this.stop(false);
      this.active = true;
      this.penaltyCount = 0;
      this.phase = 'plan';
      this.schedule = sessionData;
      this.startedAt = new Date();
      this.endedAt = null;
      reviewReflection.value = '';
      sessionManifest.classList.remove('is-visible');
      manifestLog.textContent = '';
      this.updateEfficiency();
      document.body.classList.add('session-active', 'session-phase-plan');
      document.body.classList.remove('session-phase-focus', 'session-phase-review');
      sessionLayer.classList.add('is-open');
      lastFocusedBeforeSession = document.activeElement;
      mainContent.setAttribute('inert', '');
      if (footerLandmark) footerLandmark.setAttribute('inert', '');
      distractionButton.disabled = false;
      endSessionButton.disabled = false;
      startSessionButton.disabled = true;
      sessionPlanList.innerHTML = listMarkup(sessionData.context.plan);
      sessionReviewList.innerHTML = listMarkup([
        'Compare the result to the original goal or rubric.',
        'Fix the weakest part first.',
        'Write one improvement for the next session.'
      ]);
      focusMessage.textContent = 'Deep work on: ' + sessionData.title + '. Protect this block from tab switching and micro-checking.';
      this.applyPhase('plan');
      this.tick();
      const self = this;
      this.timerId = window.setInterval(function () { self.tick(); }, 1000);
      endSessionButton.focus();
    },
    stop: function (showManifest) {
      const shouldShow = showManifest === undefined ? true : showManifest;
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
      audioEngine.stopFocus();
      if (!this.active && !shouldShow) return;
      if (this.active) {
        this.endedAt = new Date();
      }
      this.active = false;
      this.phase = 'idle';
      sessionLayer.classList.remove('is-open');
      document.body.classList.remove('session-active', 'session-phase-plan', 'session-phase-focus', 'session-phase-review');
      mainContent.removeAttribute('inert');
      if (footerLandmark) footerLandmark.removeAttribute('inert');
      distractionButton.disabled = true;
      endSessionButton.disabled = true;
      startSessionButton.disabled = false;
      if (lastFocusedBeforeSession && lastFocusedBeforeSession !== document.body && document.body.contains(lastFocusedBeforeSession)) {
        lastFocusedBeforeSession.focus();
      } else {
        startSessionButton.focus();
      }
      livePhase.textContent = 'Idle';
      nextShift.textContent = 'Session complete';
      if (shouldShow && this.startedAt) {
        const score = Math.max(0, 100 - (this.penaltyCount * 2));
        const reflection = reviewReflection.value.trim() || 'No reflection entered.';
        manifestLog.textContent =
          'SESSION MANIFEST\n' +
          'task=' + (this.schedule ? this.schedule.title : 'Unknown task') + '\n' +
          'context=' + (taskContext.options[taskContext.selectedIndex].textContent) + '\n' +
          'start=' + this.startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '\n' +
          'stop=' + (this.endedAt ? this.endedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--') + '\n' +
          'penalties=' + this.penaltyCount + '\n' +
          'efficiency=' + score + '%\n' +
          'reflection=' + reflection;
        sessionManifest.classList.add('is-visible');
      }
    },
    tick: function () {
      if (!this.active || !this.schedule) return;
      const now = Date.now();
      const elapsed = Math.floor((now - this.startedAt.getTime()) / 1000);
      const totalSeconds = this.schedule.totalSeconds;
      const remainingTotal = Math.max(0, totalSeconds - elapsed);
      const planSeconds = this.schedule.plan * 60;
      const focusSeconds = this.schedule.focus * 60;

      if (elapsed < planSeconds) {
        this.applyPhase('plan', planSeconds - elapsed);
      } else if (elapsed < planSeconds + focusSeconds) {
        this.applyPhase('focus', planSeconds + focusSeconds - elapsed);
      } else if (elapsed < totalSeconds) {
        this.applyPhase('review', totalSeconds - elapsed);
      } else {
        this.applyPhase('review', 0);
        this.stop(true);
        return;
      }

      if (remainingTotal <= 0) {
        this.stop(true);
      }
    },
    applyPhase: function (phase, remainingSeconds) {
      if (this.phase !== phase) {
        this.phase = phase;
        document.body.classList.remove('session-phase-plan', 'session-phase-focus', 'session-phase-review');
        document.body.classList.add('session-phase-' + phase);
        if (phase === 'plan') {
          audioEngine.playPlanChime();
        } else if (phase === 'focus') {
          audioEngine.playFocusDrone();
        } else if (phase === 'review') {
          audioEngine.playReviewChord();
        }
      }
      livePhase.textContent = phase.charAt(0).toUpperCase() + phase.slice(1);
      sessionPhaseLabel.textContent = 'Current Phase: ' + livePhase.textContent;
      sessionTimer.textContent = formatTime(remainingSeconds);
      nextShift.textContent = phase === 'plan'
        ? 'Focus begins at ' + formatTime(this.schedule.focus * 60)
        : phase === 'focus'
          ? 'Review starts with ' + minuteLabel(this.schedule.review)
          : 'Wrap with reflection and quality checks';
      planPane.classList.toggle('is-active', phase === 'plan');
      focusPane.classList.toggle('is-active', phase === 'focus');
      reviewPane.classList.toggle('is-active', phase === 'review');
    }
  };

  function clampMinutes(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 60;
    const rounded = Math.round(numeric / 5) * 5;
    return Math.min(240, Math.max(20, rounded));
  }

  function minuteLabel(value) {
    return value === 1 ? '1 minute' : value + ' minutes';
  }

  function windowLabel(start, end) {
    return start + '-' + end + ' min';
  }

  function formatTime(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds || 0));
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return mins + ':' + secs;
  }

  function listMarkup(items) {
    return items.map(function (item) { return '<li>' + item + '</li>'; }).join('');
  }

  function setMinutes(value) {
    const next = clampMinutes(value);
    totalRange.value = next;
    totalNumber.value = next;
    presets.forEach(function (button) {
      button.classList.toggle('is-active', Number(button.dataset.minutes) === next);
    });
    updatePlan();
  }

  function updatePlan() {
    const total = clampMinutes(totalRange.value);
    const plan = Math.max(1, Math.round(total * 0.1));
    const review = Math.max(1, Math.round(total * 0.1));
    const focus = total - plan - review;
    const context = contexts[taskContext.value];
    const title = taskName.value.trim() || 'Your task';

    planTitle.textContent = title;
    summary.textContent =
      'For a ' + total + '-minute block, spend ' + minuteLabel(plan) + ' setting direction, ' +
      minuteLabel(focus) + ' doing the work, and ' + minuteLabel(review) +
      ' checking quality and deciding the next step. ' + context.summary;

    planDuration.textContent = minuteLabel(plan);
    focusDuration.textContent = minuteLabel(focus);
    reviewDuration.textContent = minuteLabel(review);

    planWindow.textContent = windowLabel(0, plan);
    focusWindow.textContent = windowLabel(plan, plan + focus);
    reviewWindow.textContent = windowLabel(plan + focus, total);

    planList.innerHTML = listMarkup(context.plan);
    focusList.innerHTML = listMarkup(context.focus);
    reviewList.innerHTML = listMarkup(context.review);

    barPlan.style.width = (plan / total) * 100 + '%';
    barFocus.style.width = (focus / total) * 100 + '%';
    barReview.style.width = (review / total) * 100 + '%';

    barPlanLabel.textContent = plan + 'm';
    barFocusLabel.textContent = focus + 'm';
    barReviewLabel.textContent = review + 'm';

    return { total: total, plan: plan, focus: focus, review: review, context: context, title: title };
  }

  taskName.addEventListener('input', updatePlan);
  taskContext.addEventListener('change', updatePlan);
  totalRange.addEventListener('input', function (event) { setMinutes(event.target.value); });
  totalNumber.addEventListener('input', function (event) { setMinutes(event.target.value); });

  presets.forEach(function (button) {
    button.addEventListener('click', function () { setMinutes(button.dataset.minutes); });
  });

  startSessionButton.addEventListener('click', function () {
    const sessionData = updatePlan();
    sessionData.totalSeconds = sessionData.total * 60;
    audioEngine.ensure();
    WORKFLOW_ENGINE.start(sessionData);
  });

  distractionButton.addEventListener('click', function () {
    WORKFLOW_ENGINE.logPenalty('manual-report');
  });

  endSessionButton.addEventListener('click', function () {
    WORKFLOW_ENGINE.stop(true);
  });

  window.addEventListener('blur', function () {
    WORKFLOW_ENGINE.logPenalty('window-blur');
  });

  sessionLayer.addEventListener('keydown', function (event) {
    if (!sessionLayer.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      WORKFLOW_ENGINE.stop(true);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      sessionLayer.querySelectorAll("button, textarea, [href], [tabindex]:not([tabindex='-1'])")
    ).filter(function (el) { return el.offsetParent !== null && !el.disabled; });
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  WORKFLOW_ENGINE.updateEfficiency();
  updatePlan();
})();
