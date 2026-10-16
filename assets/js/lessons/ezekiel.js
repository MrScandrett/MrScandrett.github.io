(() => {
  'use strict';
  const form = document.getElementById('ez-evidence-form');
  if (!form) return;
  const categories = ['Observation', 'Passage’s explanation', 'Later interpretation'];
  const claims = [
    ['Ezekiel is told to speak to the bones and then to the breath.', 0, '37:4 and 37:9 record the commands Ezekiel is given. This describes what happens in the vision.'],
    ['Bodies have formed, but they have no breath.', 0, '37:8 describes what Ezekiel sees before the breath enters.'],
    ['The bones represent the whole house of Israel.', 1, '37:11 explicitly identifies the bones and names the people’s lost hope.'],
    ['This vision foreshadows resurrection.', 2, 'Jewish and Christian commentators have made this connection. Distinguish it from the explanation about Israel in 37:11–14.'],
    ['The two sticks that follow show the divided kingdoms reunited.', 1, '37:19–22 explains the sign itself: one people under one shepherd.'],
    ['God promises to settle the people in their land and give them his spirit.', 1, '37:14 explains the restoration promised to the people.']
  ];
  const host = document.getElementById('ez-evidence-items');
  claims.forEach(([claim], i) => {
    const field = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = `${i + 1}. ${claim}`;
    field.append(legend);
    categories.forEach((category, n) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio'; input.name = `evidence-${i}`; input.value = n; input.required = true;
      label.append(input, document.createTextNode(` ${category}`)); field.append(label);
    });
    const feedback = document.createElement('p');
    feedback.className = 'ez-item-feedback'; feedback.hidden = true;
    field.append(feedback); host.append(field);
  });
  const status = document.getElementById('ez-evidence-status');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const answers = new FormData(form); let score = 0;
    claims.forEach(([, answer, explanation], i) => {
      const correct = Number(answers.get(`evidence-${i}`)) === answer;
      if (correct) score++;
      const feedback = host.children[i].querySelector('p'); feedback.hidden = false;
      feedback.textContent = `${correct ? 'Correct' : 'Revisit'} · ${categories[answer]}. ${explanation}`;
    });
    status.textContent = `${score} of ${claims.length} matched. Read each explanation, then revise any answer you want to reconsider.`;
  });
  form.addEventListener('reset', () => {
    host.querySelectorAll('.ez-item-feedback').forEach(p => { p.hidden = true; p.textContent = ''; });
    status.textContent = 'Choose a category for each claim. You can revise and check again.';
  });
})();

(() => {
  'use strict';
  const list = document.getElementById('presence-stops');
  if (!list) return;
  const scenes = [
    ['Babylon', 'Ezekiel 1:1–28', 'Glory beside the Chebar canal', 'Ezekiel, living in exile, sees a radiant throne-vision among creatures and wheels (1:1–3, 26–28). The place is a foreign canal, not the temple.', 'Why might it matter that this appears in Babylonia rather than Jerusalem?', 'Ezekiel 1', '1:1-3; 1:26-28'],
    ['Leaving', 'Ezekiel 10:18–19; 11:22–23', 'Glory leaves the temple and the city', 'The glory moves from the threshold to the east gate, then up from the city to the mountain on its east side. Wrongdoing in the temple is shown as the cause.', 'What would the exiles hear in this? What does 11:16 add, where God is “a sanctuary” for them in the lands where they have gone?', 'Ezekiel 11', '10:18-19; 11:16; 11:22-23'],
    ['Silence broken', 'Ezekiel 33:21–22', 'News that the city has fallen', 'A survivor reports that Jerusalem has been struck down. Ezekiel’s speech, held back until now, is opened again, and the book turns toward hope.', 'How does the tone change after the news arrives? What does that suggest about the purpose of the earlier warnings?', 'Ezekiel 33', '33:21-22'],
    ['Returning', 'Ezekiel 43:1–5; 48:35', 'Glory returns and fills the renewed temple', 'The glory comes back by the east gate, the way it left, and fills the house. The book ends with the city’s new name, “The LORD is there.”', 'Trace the route: which direction did the glory leave, and which does it return from? What does that reversal say to the exiles’ fear?', 'Ezekiel 43', '43:1-5; 48:35']
  ];
  const $ = id => document.getElementById(id);
  const read = $('presence-read');
  const show = i => {
    const [, ref, heading, text, question, go] = scenes[i];
    $('presence-ref').textContent = ref;
    $('presence-heading').textContent = heading;
    $('presence-text').textContent = text;
    $('presence-question').textContent = question;
    read.href = '../../bible.html#/go/' + go;
    window.EzekielPassages && window.EzekielPassages.mount($('presence-passage'), scenes[i][6]);
    list.querySelectorAll('button').forEach((b, n) => {
      b.setAttribute('aria-pressed', String(n === i));
      b.parentElement.classList.toggle('is-here', n === i);
      b.parentElement.classList.toggle('is-past', n < i);
    });
  };
  scenes.forEach(([label], i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = `${i + 1} · ${label}`; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => show(i));
    li.append(b); list.append(li);
  });
  show(0);
})();

// Route panel: show the chosen section's focus passages inline.
(() => {
  'use strict';
  const buttons = document.getElementById('route-buttons');
  const host = document.getElementById('route-passage');
  const data = window.MajorProphets && window.MajorProphets.ezekiel;
  if (!buttons || !host || !data) return;
  const sync = () => {
    const i = [...buttons.querySelectorAll('button')].findIndex(b => b.getAttribute('aria-pressed') === 'true');
    if (i < 0 || !window.EzekielPassages) return;
    window.EzekielPassages.mount(host, data.route[i][2]);
  };
  buttons.addEventListener('click', sync);
  sync();
})();
