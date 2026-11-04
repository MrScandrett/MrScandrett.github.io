(() => {
  'use strict';
  const partner = document.getElementById('opponent');
  const history = document.getElementById('history');
  const status = document.getElementById('game-status');
  const help = document.getElementById('help');
  const hold = document.getElementById('hold');
  let round = 0, yours = 0, theirs = 0, previous = 'help';
  const labels = { help: 'Help', hold: 'Hold back' };
  function updateDisplay(action, other) {
    document.getElementById('your-total').textContent = yours;
    document.getElementById('partner-total').textContent = theirs;
    document.getElementById('shared-total').textContent = yours + theirs;
    document.querySelectorAll('.gt-rounds span').forEach((dot, index) => {
      dot.toggleAttribute('data-played', index < round);
    });
    document.querySelector('.gt-rounds').setAttribute('aria-label', `${round} of 8 rounds completed`);
    const insight = document.getElementById('game-insight');
    if (!round) {
      insight.textContent = 'Make your first move. Watch how today’s choice changes your partner’s next response.';
      return;
    }
    const outcomes = {
      'help-help': 'Mutual help: 6 shared points. Both players benefit together.',
      'help-hold': 'You helped; your partner held back. The 5 shared points went to your partner.',
      'hold-help': 'You held back; your partner helped. You gained 5, but the shared total is lower than mutual help.',
      'hold-hold': 'Both held back: just 2 shared points. Individually safe can be collectively costly.'
    };
    insight.textContent = outcomes[`${action}-${other}`] + (round === 8 ? ` Experiment total: ${yours + theirs}; eight rounds of mutual help would total 48.` : partner.value === 'mirror' ? ` Next round, the reciprocator will ${labels[action].toLowerCase()}.` : '');
  }
  function reset() {
    round = yours = theirs = 0; previous = 'help';
    updateDisplay();
    history.replaceChildren(); help.disabled = hold.disabled = false;
    status.textContent = 'Round 0 of 8. Your score: 0. Partner’s score: 0.';
  }
  function play(action) {
    if (round >= 8) return;
    const other = partner.value === 'mirror' ? previous : partner.value;
    const points = action === 'help' ? (other === 'help' ? [3,3] : [0,5]) : (other === 'help' ? [5,0] : [1,1]);
    round++; yours += points[0]; theirs += points[1]; previous = action;
    const row = document.createElement('tr');
    [round, labels[action], labels[other], points.join(', ')].forEach(value => {
      const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
    });
    history.append(row);
    updateDisplay(action, other);
    status.textContent = `Round ${round} of 8. You: ${labels[action]}. Partner: ${labels[other]}. Your score: ${yours}. Partner’s score: ${theirs}.` + (round === 8 ? ' Experiment complete. Reset to compare another strategy.' : '');
    help.disabled = hold.disabled = round === 8;
  }
  help.addEventListener('click', () => play('help'));
  hold.addEventListener('click', () => play('hold'));
  partner.addEventListener('change', reset);
  document.getElementById('reset-game').addEventListener('click', reset);
})();

(() => {
  'use strict';
  const feedback = document.getElementById('score-feedback');
  const panel = document.getElementById('score-reveal');
  const rule = document.getElementById('club-rule');
  const reveal = document.getElementById('reveal-score');
  const selected = () => document.querySelector('input[name="club-choice"]:checked');
  const names = {drill:'repeat familiar cards',build:'build a difficult project',mentor:'mentor newcomers'};
  let first = null;
  const descriptions = {
    cards: 'Completed cards: quick cards 120 points; project 30; mentoring 10. This rule favors volume, regardless of what participants learn.',
    learning: 'Learning lens: the project may expose gaps in understanding; mentoring may deepen explanations; familiar cards may consolidate knowledge. Ask participants what they can now explain or do. There is no computed winner.',
    process: 'Experience lens: ask what felt absorbing, frustrating, playful, or collaborative. Different participants may have different answers. No numerical ranking is supplied.'
  };
  function describe() { document.getElementById('rule-feedback').textContent = descriptions[rule.value]; }
  reveal.addEventListener('click', () => {
    if (!selected()) { feedback.textContent = 'Choose an approach before revealing the scoreboard.'; return; }
    first = selected().value;
    panel.hidden = false;
    reveal.disabled = true;
    describe();
    feedback.textContent = `Your first choice was to ${names[first]}. Now examine the scoreboard, choose again if you wish, and compare.`;
  });
  document.getElementById('compare-score').addEventListener('click', () => {
    if (!first) { feedback.textContent = 'Make a first choice and reveal the scoreboard before comparing.'; return; }
    const now = selected().value;
    feedback.textContent = `Before: ${names[first]}. After: ${names[now]}. ` + (first === now ? 'Your choice stayed the same. What helped you keep your purpose in view?' : 'Your choice changed. Was that a practical response to the sponsor, or did your idea of a good meeting change?') + ' Neither result alone establishes value capture.';
  });
  rule.addEventListener('change', describe);
  document.getElementById('reset-score').addEventListener('click', () => {
    first = null; panel.hidden = true; reveal.disabled = false; rule.value = 'cards';
    document.querySelectorAll('input[name="club-choice"]').forEach(input => { input.checked = false; });
    document.getElementById('protected-value').value = '';
    feedback.textContent = 'Choose an approach, then reveal the points.';
  });
})();

// Fix one player's choice so the comparison changes only one variable at a time.
(() => {
  const buttons = document.querySelectorAll('[data-partner]');
  function show(choice) {
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.partner === choice)));
    document.querySelectorAll('.gt-payoffs tbody tr').forEach(row => {
      [...row.querySelectorAll('td')].forEach((cell, index) => cell.classList.toggle('gt-selected', index === (choice === 'help' ? 0 : 1)));
    });
    document.getElementById('best-response').textContent = choice === 'help'
      ? 'Compare your points: help earns 3; hold back earns 5. Your best response is hold back.'
      : 'Compare your points: help earns 0; hold back earns 1. Your best response is still hold back. That is why it is strictly dominant in this one-round model.';
  }
  buttons.forEach(button => button.addEventListener('click', () => show(button.dataset.partner)));
  show('help');
})();
