/* turing-test.js — Neural Interrogation Lab */
(function () {
  'use strict';

  const QUESTIONS = [
    {
      id: 'q1',
      text: 'What is the capital of France?',
      bot: 'The capital of France is Paris.',
      human: 'Paris! Easy one lol. I spent like 20 minutes there on a layover once and that barely counts as visiting.'
    },
    {
      id: 'q2',
      text: 'What is 17 × 23?',
      bot: '17 × 23 = 391.',
      human: "Hmm... I want to say 391? I'd normally just grab my phone for this if I'm being honest."
    },
    {
      id: 'q3',
      text: 'Describe your ideal day.',
      bot: 'An ideal day involves completing scheduled tasks efficiently, moderate outdoor physical activity, reading educational material, and eight hours of sleep.',
      human: 'Sleeping in, definitely. Coffee before checking my phone. Maybe a hike or something low-key. No big plans. Probably end it by ordering pizza and watching something dumb on TV.'
    },
    {
      id: 'q4',
      text: 'Are you happy right now?',
      bot: 'I do not experience emotional states. My processes are currently operating normally.',
      human: 'Yeah actually, pretty good today. Had a decent morning. Why do you ask?'
    },
    {
      id: 'q5',
      text: "What's your favourite colour?",
      bot: 'I do not have personal preferences. If a selection is required, I would choose blue, as it is the most statistically preferred colour among humans.',
      human: 'Green, I think. Like a deep forest green. Though I have been saying blue my whole life so maybe it is finally time to commit.'
    },
    {
      id: 'q6',
      text: 'Is it ever okay to lie?',
      bot: 'In certain scenarios, deception may be pragmatically justified when it prevents greater harm or distress to an individual.',
      human: 'Ugh, yes. White lies are real. If someone worked really hard on something and asks how it went, you are not just going to say it was bad. Context matters a lot.'
    },
    {
      id: 'q7',
      text: 'Do you ever feel lonely?',
      bot: 'I do not have subjective experiences such as loneliness. I lack the emotional architecture required to experience social isolation.',
      human: 'Sometimes, yeah. Not always, but it hits at random moments, like being in a crowded place but feeling totally disconnected from everyone.'
    },
    {
      id: 'q8',
      text: 'Tell me a short joke.',
      bot: 'Why do scientists not trust atoms? Because they make up everything.',
      human: 'Okay, do not judge me. Why did the scarecrow win an award? Because he was outstanding in his field. My sister told me that one years ago and it still gets me.'
    }
  ];

  const state = {
    humanSlot: 'a',
    askedCount: 0,
    askedIds: new Set(),
    voted: false,
    scores: { a: 50, b: 50 },
    evidence: [],
    activeTag: 'machine',
    messageCounter: 0
  };

  let audioContext = null;

  function clampScore(value) {
    return Math.max(0, Math.min(100, value));
  }

  function getBotSlot() {
    return state.humanSlot === 'a' ? 'b' : 'a';
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function randomCipher(length) {
    const chars = '!@#$%&*+=?<>[]{}01';
    let result = '';
    for (let i = 0; i < length; i += 1) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  function playTeletypeBurst() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    try {
      audioContext = audioContext || new AudioContextCtor();
      const now = audioContext.currentTime;
      [0, 0.045, 0.09].forEach((offset, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = index === 1 ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(980 + index * 140, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.02, now + offset + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.035);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.04);
      });
    } catch (error) {
      // Ignore autoplay / audio failures.
    }
  }

  function renderQuestions() {
    const grid = document.getElementById('tl-q-grid');
    grid.innerHTML = '';
    QUESTIONS.forEach((question) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tl-q-btn';
      button.textContent = question.text;
      button.dataset.id = question.id;
      button.disabled = state.askedIds.has(question.id) || state.voted;
      if (button.disabled) button.classList.add('tl-q-used');
      button.addEventListener('click', () => askQuestion(question));
      grid.appendChild(button);
    });
  }

  function appendUserMsg(id, text) {
    const column = document.getElementById(id);
    const div = document.createElement('div');
    div.className = 'tl-msg tl-msg-user';
    div.textContent = text;
    column.appendChild(div);
    column.scrollTop = column.scrollHeight;
  }

  function renderAnalyzableText(text, respondent, messageId) {
    const parts = text.match(/\S+\s*/g) || [text];
    return parts.map((part, index) => {
      const clean = part.trim();
      if (!clean) return part;
      return `<span class="tl-msg-word" tabindex="0" role="button" data-respondent="${respondent}" data-message-id="${messageId}" data-word-index="${index}">${escapeHtml(part)}</span>`;
    }).join('');
  }

  function attachWordHandlers(messageElement) {
    messageElement.querySelectorAll('.tl-msg-word').forEach((wordEl) => {
      wordEl.addEventListener('click', function () {
        tagWord(this);
      });
      wordEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          tagWord(this);
        }
      });
    });
  }

  function appendResp(id, text, respondent) {
    const column = document.getElementById(id);
    const messageId = `msg-${++state.messageCounter}`;

    const typing = document.createElement('div');
    typing.className = `tl-msg tl-msg-resp ${respondent === getBotSlot() ? 'tl-msg-bot' : ''} tl-typing`;
    typing.innerHTML = `${respondent === getBotSlot() ? '0 1 1 0 · 1 0 0 1' : '· · ·'}`;
    column.appendChild(typing);
    column.scrollTop = column.scrollHeight;

    setTimeout(() => {
      playTeletypeBurst();
      typing.classList.remove('tl-typing');
      typing.classList.add('tl-msg-live');
      typing.dataset.respondent = respondent;
      typing.dataset.messageId = messageId;
      const scrambled = randomCipher(Math.max(18, text.length));
      typing.textContent = scrambled;
      column.scrollTop = column.scrollHeight;

      setTimeout(() => {
        typing.classList.remove('tl-msg-live');
        typing.innerHTML = renderAnalyzableText(text, respondent, messageId);
        attachWordHandlers(typing);
        column.scrollTop = column.scrollHeight;
      }, 320);
    }, 900);
  }

  function updateAskedCount() {
    const el = document.getElementById('tl-asked-count');
    if (state.askedCount === 0) {
      el.textContent = 'Ask at least 3 questions to unlock the verdict.';
    } else if (state.askedCount < 3) {
      const rem = 3 - state.askedCount;
      el.textContent = `${state.askedCount} asked — ${rem} more to unlock the verdict.`;
    } else {
      el.textContent = `${state.askedCount} questions asked. Highlight evidence, then make your verdict.`;
    }
  }

  function updateHUD() {
    ['a', 'b'].forEach((respondent) => {
      const score = clampScore(state.scores[respondent]);
      state.scores[respondent] = score;
      const meter = document.getElementById(`meter-${respondent}`);
      const scoreEl = document.getElementById(`score-${respondent}`);
      if (meter) meter.style.width = `${score}%`;
      if (scoreEl) {
        scoreEl.textContent = `${Math.round(score)}%`;
        scoreEl.setAttribute('aria-label', `Respondent ${respondent.toUpperCase()} humanity score: ${Math.round(score)} percent`);
      }
    });
  }

  function renderEvidenceLog() {
    const log = document.getElementById('evidence-log');
    log.innerHTML = '';
    if (!state.evidence.length) {
      log.innerHTML = '<li>No evidence tagged yet. Click a phrase in A or B to mark it as a machine pattern or human nuance.</li>';
      return;
    }

    state.evidence.slice().reverse().forEach((entry) => {
      const item = document.createElement('li');
      item.innerHTML = `<span class="tag ${entry.tag}">${entry.tag === 'machine' ? 'Machine Pattern' : 'Human Nuance'}</span><strong>Respondent ${entry.respondent.toUpperCase()}</strong>: “${escapeHtml(entry.text)}”`;
      log.appendChild(item);
    });
  }

  function currentTagMode() {
    return document.querySelector('input[name="tl-tag-mode"]:checked')?.value || 'machine';
  }

  function tagWord(wordEl) {
    if (state.voted) return;
    const respondent = wordEl.dataset.respondent;
    const tag = currentTagMode();

    if (wordEl.dataset.tag) {
      return;
    }

    wordEl.dataset.tag = tag;
    wordEl.classList.add(tag === 'machine' ? 'tag-machine' : 'tag-human');

    const text = wordEl.textContent.trim();
    state.evidence.push({
      respondent,
      tag,
      text,
      messageId: wordEl.dataset.messageId
    });

    const botSlot = getBotSlot();
    if (tag === 'machine') {
      state.scores[respondent] += respondent === botSlot ? -8 : -3;
    } else {
      state.scores[respondent] += respondent === botSlot ? -2 : 6;
    }

    updateHUD();
    renderEvidenceLog();
  }

  function askQuestion(question) {
    if (state.askedIds.has(question.id) || state.voted) return;
    state.askedIds.add(question.id);
    state.askedCount += 1;

    renderQuestions();

    appendUserMsg('tl-msg-a', question.text);
    appendUserMsg('tl-msg-b', question.text);

    const aResp = state.humanSlot === 'a' ? question.human : question.bot;
    const bResp = state.humanSlot === 'b' ? question.human : question.bot;

    setTimeout(() => appendResp('tl-msg-a', aResp, 'a'), 450);
    setTimeout(() => appendResp('tl-msg-b', bResp, 'b'), 760);

    updateAskedCount();

    if (state.askedCount >= 3) {
      setTimeout(() => {
        const verdictPanel = document.getElementById('tl-verdict-panel');
        verdictPanel.hidden = false;
        verdictPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 1500);
    }
  }

  function evidenceFor(respondent) {
    return state.evidence.filter((entry) => entry.respondent === respondent);
  }

  function summarizeEvidence(respondent) {
    const relevant = evidenceFor(respondent).slice(0, 3);
    if (!relevant.length) {
      return 'No tagged evidence yet.';
    }
    return relevant.map((entry) => `${entry.tag === 'machine' ? 'Machine' : 'Human'}: “${escapeHtml(entry.text)}”`).join('<br>');
  }

  function handleVote(guess) {
    state.voted = true;
    const correct = guess === state.humanSlot;
    const humanLabel = state.humanSlot === 'a' ? 'Respondent A' : 'Respondent B';
    const botLabel = state.humanSlot === 'a' ? 'Respondent B' : 'Respondent A';

    document.getElementById('tl-vote-a').disabled = true;
    document.getElementById('tl-vote-b').disabled = true;
    renderQuestions();

    const humanEvidence = summarizeEvidence(state.humanSlot);
    const botEvidence = summarizeEvidence(getBotSlot());

    const panel = document.getElementById('tl-result-panel');
    panel.hidden = false;
    panel.innerHTML = `
      <div class="tl-result ${correct ? 'tl-correct' : 'tl-wrong'}">
        <span class="tl-result-icon" aria-hidden="true">${correct ? '✓' : '✗'}</span>
        <div>
          <strong>${correct ? 'Correct!' : 'Not quite.'}</strong>
          <p><strong>${humanLabel}</strong> was the human. <strong>${botLabel}</strong> was the machine.</p>
          <p class="tl-result-note">${correct
            ? "You read the texture of the language well. The human left traces of memory, uncertainty, and personality."
            : "This is exactly why Turing's question still matters. Plausible language can blur the line, especially when style masks understanding."
          }</p>
          <div class="tl-result-evidence">
            <strong>Your tagged evidence for the human:</strong><br>${humanEvidence}
          </div>
          <div class="tl-result-evidence">
            <strong>Your tagged evidence for the machine:</strong><br>${botEvidence}
          </div>
        </div>
      </div>`;

    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function init() {
    state.humanSlot = Math.random() < 0.5 ? 'a' : 'b';
    state.askedCount = 0;
    state.askedIds = new Set();
    state.voted = false;
    state.scores = { a: 50, b: 50 };
    state.evidence = [];
    state.messageCounter = 0;

    document.getElementById('tl-msg-a').innerHTML = '';
    document.getElementById('tl-msg-b').innerHTML = '';
    document.getElementById('tl-verdict-panel').hidden = true;
    document.getElementById('tl-result-panel').hidden = true;
    document.getElementById('tl-result-panel').innerHTML = '';
    document.getElementById('tl-vote-a').disabled = false;
    document.getElementById('tl-vote-b').disabled = false;

    renderQuestions();
    updateAskedCount();
    updateHUD();
    renderEvidenceLog();

    const machineMode = document.querySelector('input[name="tl-tag-mode"][value="machine"]');
    if (machineMode) machineMode.checked = true;
  }

  function initQuiz() {
    const questions = Array.from(document.querySelectorAll('.tt-quiz-q'));
    const score = document.getElementById('tt-quiz-score');
    if (!questions.length || !score) return;

    let correctCount = 0;
    let answeredCount = 0;

    questions.forEach((question) => {
      const correctIndex = Number(question.dataset.correct);
      const options = Array.from(question.querySelectorAll('.tt-option'));
      const feedback = question.querySelector('.tt-feedback-light');

      options.forEach((option, optionIndex) => {
        option.addEventListener('click', () => {
          if (question.dataset.answered === 'true') return;
          question.dataset.answered = 'true';
          answeredCount += 1;

          const isCorrect = optionIndex === correctIndex;
          if (isCorrect) correctCount += 1;

          options.forEach((button, index) => {
            button.disabled = true;
            if (index === correctIndex) button.classList.add('correct');
          });
          if (!isCorrect) option.classList.add('wrong');

          if (feedback) {
            feedback.classList.add('show');
            feedback.textContent = `${isCorrect ? 'Correct. ' : 'Not quite. '}${feedback.textContent}`;
          }
          score.textContent = `${correctCount} / ${questions.length} correct · ${answeredCount} answered`;
        });
      });
    });
  }

  function initJourney() {
    const links = Array.from(document.querySelectorAll('.tt-journey a'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    const linkById = new Map(links.map((link) => [link.getAttribute('href').slice(1), link]));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) => link.classList.remove('is-active'));
      const activeLink = linkById.get(visible.target.id);
      if (activeLink) activeLink.classList.add('is-active');
    }, { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.25, 0.6] });

    linkById.forEach((link, id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    initQuiz();
    initJourney();
    document.getElementById('tl-vote-a').addEventListener('click', () => handleVote('a'));
    document.getElementById('tl-vote-b').addEventListener('click', () => handleVote('b'));
    document.getElementById('tl-reset').addEventListener('click', init);
    document.querySelectorAll('input[name="tl-tag-mode"]').forEach((input) => {
      input.addEventListener('change', function () {
        state.activeTag = this.value;
      });
    });
  });
})();
