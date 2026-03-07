/* turing-test.js — Interactive Imitation Game Lab */
(function () {
  'use strict';

  const QUESTIONS = [
    {
      id: 'q1',
      text: 'What is the capital of France?',
      bot: 'The capital of France is Paris.',
      human: 'Paris! Easy one lol. I spent like 20 minutes there on a layover once — barely counts as visiting.'
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
      human: 'Sleeping in, definitely. Coffee before checking my phone. Maybe a hike or something low-key. No big plans. Probably end it by ordering pizza and watching something dumb on TV. Simple stuff.'
    },
    {
      id: 'q4',
      text: 'Are you happy right now?',
      bot: 'I do not experience emotional states. My processes are currently operating normally.',
      human: 'Yeah actually, pretty good today! Had a decent morning. Why do you ask?'
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
      human: 'Ugh, yes. White lies are real. If someone worked really hard on something and asks how it went — you are not just going to say it was bad. Context matters a lot.'
    },
    {
      id: 'q7',
      text: 'Do you ever feel lonely?',
      bot: 'I do not have subjective experiences such as loneliness. I lack the emotional architecture required to experience social isolation.',
      human: 'Sometimes yeah. Not always, but it hits at random moments — like being in a crowded place but feeling totally disconnected from everyone. You ever get that?'
    },
    {
      id: 'q8',
      text: 'Tell me a short joke.',
      bot: 'Why do scientists not trust atoms? Because they make up everything.',
      human: "Okay don't judge me — why did the scarecrow win an award? Because he was outstanding in his field. My sister told me that one years ago and it still gets me."
    }
  ];

  let humanSlot;   // 'a' or 'b'
  let askedCount = 0;
  let askedIds    = new Set();
  let voted       = false;

  /* ---- initialise / reset ---- */
  function init() {
    humanSlot  = Math.random() < 0.5 ? 'a' : 'b';
    askedCount = 0;
    askedIds   = new Set();
    voted      = false;

    document.getElementById('tl-msg-a').innerHTML = '';
    document.getElementById('tl-msg-b').innerHTML = '';
    document.getElementById('tl-verdict-panel').hidden = true;
    document.getElementById('tl-result-panel').hidden  = true;
    document.getElementById('tl-vote-a').disabled = false;
    document.getElementById('tl-vote-b').disabled = false;

    renderQuestions();
    updateAskedCount();
  }

  /* ---- render question chips ---- */
  function renderQuestions() {
    const grid = document.getElementById('tl-q-grid');
    grid.innerHTML = '';
    QUESTIONS.forEach(q => {
      const btn = document.createElement('button');
      btn.type        = 'button';
      btn.className   = 'tl-q-btn';
      btn.textContent = q.text;
      btn.dataset.id  = q.id;
      btn.addEventListener('click', () => askQuestion(q));
      grid.appendChild(btn);
    });
  }

  /* ---- handle a question being asked ---- */
  function askQuestion(q) {
    if (askedIds.has(q.id) || voted) return;
    askedIds.add(q.id);
    askedCount++;

    const btn = document.querySelector(`.tl-q-btn[data-id="${q.id}"]`);
    if (btn) { btn.disabled = true; btn.classList.add('tl-q-used'); }

    appendUserMsg('tl-msg-a', q.text);
    appendUserMsg('tl-msg-b', q.text);

    const aResp = humanSlot === 'a' ? q.human : q.bot;
    const bResp = humanSlot === 'b' ? q.human : q.bot;

    setTimeout(() => appendResp('tl-msg-a', aResp), 500);
    setTimeout(() => appendResp('tl-msg-b', bResp), 800);

    updateAskedCount();

    if (askedCount >= 3) {
      setTimeout(() => {
        const vp = document.getElementById('tl-verdict-panel');
        vp.hidden = false;
        vp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 1400);
    }
  }

  function appendUserMsg(id, text) {
    const el  = document.getElementById(id);
    const div = document.createElement('div');
    div.className   = 'tl-msg tl-msg-user';
    div.textContent = text;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  }

  function appendResp(id, text) {
    const el  = document.getElementById(id);
    const div = document.createElement('div');
    div.className   = 'tl-msg tl-msg-resp tl-typing';
    div.textContent = '· · ·';
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;

    setTimeout(() => {
      div.classList.remove('tl-typing');
      div.textContent = text;
      el.scrollTop = el.scrollHeight;
    }, 900);
  }

  function updateAskedCount() {
    const el = document.getElementById('tl-asked-count');
    if (askedCount === 0) {
      el.textContent = 'Ask at least 3 questions to unlock the verdict.';
    } else if (askedCount < 3) {
      const rem = 3 - askedCount;
      el.textContent = `${askedCount} asked — ${rem} more to unlock the verdict.`;
    } else {
      el.textContent = `${askedCount} questions asked. Scroll down to make your verdict.`;
    }
  }

  /* ---- verdict ---- */
  function handleVote(guess) {
    voted = true;
    const correct    = guess === humanSlot;
    const humanLabel = humanSlot === 'a' ? 'Respondent A' : 'Respondent B';
    const botLabel   = humanSlot === 'a' ? 'Respondent B' : 'Respondent A';

    document.getElementById('tl-vote-a').disabled = true;
    document.getElementById('tl-vote-b').disabled = true;

    const panel = document.getElementById('tl-result-panel');
    panel.hidden  = false;
    panel.innerHTML = `
      <div class="tl-result ${correct ? 'tl-correct' : 'tl-wrong'}">
        <span class="tl-result-icon" aria-hidden="true">${correct ? '✓' : '✗'}</span>
        <div>
          <strong>${correct ? 'Correct!' : 'Not quite.'}</strong>
          <p><strong>${humanLabel}</strong> was the human. <strong>${botLabel}</strong> was the scripted bot.</p>
          <p class="tl-result-note">${correct
            ? "You spotted the difference. The human's answers had personality, uncertainty, and personal detail. The bot was precise but flat — no texture."
            : "This is exactly the challenge Turing described. The bot was designed to sound plausible. Look back: can you now find the moment it gave itself away?"
          }</p>
        </div>
      </div>`;

    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---- boot ---- */
  document.addEventListener('DOMContentLoaded', () => {
    init();
    document.getElementById('tl-vote-a').addEventListener('click', () => handleVote('a'));
    document.getElementById('tl-vote-b').addEventListener('click', () => handleVote('b'));
    document.getElementById('tl-reset').addEventListener('click', init);
  });
})();
