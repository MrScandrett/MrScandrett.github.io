(() => {
  'use strict';
  const readings = {
    need: ['Bread necessary for life', 'A proposed connection with ousia (being or substance) points toward what sustains existence. It emphasizes dependence on God for real, material needs.', 'What counts as a necessity rather than a luxury?'],
    coming: ['Bread for the coming day', 'A proposed connection with language for the following day points toward tomorrow’s provision. Some interpreters also connect this with the future kingdom’s feast; that theological extension is not established by the word alone.', 'How would asking for tomorrow’s bread change the sense of the prayer?'],
    spiritual: ['Bread read in a spiritual sense', 'Early Christians connected bread with Christ and spiritual nourishment. Eucharistic readings are important in Catholic and Orthodox tradition. This is a history of interpretation, rather than a universally agreed lexical definition.', 'Can a request concern both bodily hunger and spiritual nourishment?']
  };
  document.querySelectorAll('[data-reading]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-reading]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    const [heading, explanation, question] = readings[button.dataset.reading];
    const panel = document.querySelector('#bread-reading');
    panel.replaceChildren();
    const title = document.createElement('h3'); title.textContent = heading;
    const body = document.createElement('p'); body.textContent = explanation;
    const prompt = document.createElement('p'); prompt.textContent = 'Question: ' + question;
    panel.append(title, body, prompt);
  }));
  document.querySelector('#prayer-quiz').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const score = ['q1', 'q2', 'q3'].filter(key => data.get(key) === 'right').length;
    document.querySelector('#quiz-result').textContent = score + ' of 3 correct. ' + (score === 3 ? 'You distinguished evidence from interpretation.' : 'Review the answer explanations below, then try again.');
  });
})();
