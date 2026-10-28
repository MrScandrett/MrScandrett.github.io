(() => {
  'use strict';
  const habitats = {
    wetlands: ['Everglades · A slow-moving wetland', 'Shallow water moves through sawgrass marshes and other habitats. Small changes in elevation change which plants grow. Alligators and wading birds are part of this connected system.', 'Drainage and altered water flow.', 'If less clean water reaches a marsh, what could happen to fish and the birds that eat them?'],
    mangroves: ['Mangroves · Where fresh and salt water meet', 'Salt-tolerant coastal trees grow in tidal water. Their tangled roots shelter young fish, while birds feed and nest nearby.', 'Coastal construction and changes in water quality.', 'How might removing a nursery habitat affect adult fish farther offshore?'],
    reef: ['Coral reef · Built by animals', 'Corals are tiny animals whose colonies build reef structures. Many reef-building corals depend on algae living inside their tissues. Florida’s reefs support diverse marine life.', 'Ocean warming, disease, and pollution.', 'Why can losing living coral affect fish that do not eat coral?'],
    springs: ['Springs · Groundwater comes to light', 'Water stored in the limestone aquifer emerges at springs and feeds rivers. Some warm-water spring areas provide winter refuges for manatees.', 'Groundwater withdrawals and excess nutrients in runoff.', 'How can a decision made inland change a river downstream?'],
    pine: ['Pine flatwoods · A landscape shaped by fire', 'Pine trees, grasses, and low shrubs live on flat land. Many plants are adapted to periodic fire. Carefully managed prescribed fire can help maintain habitat.', 'Development, habitat fragmentation, and disrupted fire cycles.', 'Why might preventing every fire change which plants and animals can live here?']
  };
  const readout = document.getElementById('habitat-readout');
  document.querySelectorAll('[data-habitat]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-habitat]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      const [title, description, pressure, question] = habitats[button.dataset.habitat];
      readout.dataset.activeHabitat = button.dataset.habitat;
      readout.replaceChildren();
      const heading = document.createElement('h3'); heading.textContent = title;
      const text = document.createElement('p'); text.textContent = description;
      const prompt = document.createElement('p'); prompt.textContent = `Pressure: ${pressure} Think: ${question}`;
      readout.append(heading, text, prompt);
    });
  });
  const quiz = document.getElementById('fl-quiz');
  const result = document.getElementById('quiz-result');
  quiz.addEventListener('submit', event => {
    event.preventDefault();
    let score = 0, answered = 0;
    quiz.querySelectorAll('fieldset').forEach(field => {
      const selected = field.querySelector('input:checked');
      if (selected) answered++;
      const correct = selected && selected.value === field.dataset.answer;
      if (correct) score++;
      field.querySelector('.fl-feedback').textContent = !selected ? 'Choose an answer, then check again.' : `${correct ? 'Correct.' : 'Try again.'} ${field.dataset.explanation}`;
    });
    result.textContent = `${score} of 5 correct.${answered < 5 ? ` Answer the remaining ${5 - answered} question(s).` : score === 5 ? ' Field mission complete! Explain one connection in your own words.' : ' Review the feedback and try again.'}`;
  });
  quiz.addEventListener('reset', () => {
    quiz.querySelectorAll('.fl-feedback').forEach(item => { item.textContent = ''; });
    result.textContent = '';
  });
})();
