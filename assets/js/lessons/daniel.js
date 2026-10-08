(function () {
  'use strict';
  const chapters = [
    ['Learning in exile', '1:1–21', 'Daniel and three friends are taken from Judah into Babylonian court training. They receive new names and seek a different diet while learning to serve in a foreign setting.', 'Compare what they learn with what Daniel resolves not to do. The ten-day test is a narrative detail, not a universal nutrition experiment.', 'How does Daniel combine a firm conviction with a respectful request?'],
    ['A dream of kingdoms', '2:17–23, 31–45', 'Nebuchadnezzar demands an explanation of his dream. Daniel and his friends pray. The statue and stone contrast successive human kingdoms with God’s enduring rule.', 'Follow the materials from head to feet. Daniel credits God for revealing the mystery.', 'What makes the stone’s kingdom different from the kingdoms in the statue?'],
    ['The furnace', '3:13–28', 'Shadrach, Meshach, and Abednego refuse the king’s command to worship a golden image. The king sees a fourth figure in the furnace, and the three emerge unharmed.', 'The friends express loyalty before rescue is certain. Daniel is not named among those thrown into the furnace.', 'What does their response in verses 16–18 reveal about trust without a guaranteed outcome?'],
    ['The humbled king', '4:19–37', 'A dream of a great tree warns Nebuchadnezzar. Daniel urges a change in conduct; the king is humbled and later acknowledges a rule higher than his own.', 'Watch the movement from royal pride to recognition of God. Notice Daniel’s call to care for the oppressed.', 'How does power change the king’s view of himself?'],
    ['Writing on the wall', '5:1–31', 'At Belshazzar’s feast, vessels from Jerusalem’s temple are used while other gods are praised. Daniel interprets the writing as judgment on the king; that night the kingdom changes hands.', 'Compare Belshazzar’s actions with the lesson he could have learned from Nebuchadnezzar.', 'Why does Daniel connect the present feast with the earlier king’s humbling?'],
    ['The lions’ den', '6:1–28', 'Officials exploit Daniel’s prayer habits to trap him through a royal decree. Under Darius the Mede, Daniel continues praying, is thrown into the den, and is preserved.', 'Daniel prays as he did before. The law turns an established habit into an accusation.', 'What can verses 4–10 tell us about Daniel’s public conduct and private habits?'],
    ['Beasts and a lasting kingdom', '7:1–18', 'Daniel sees four beasts, a heavenly court, and a figure like a son of man receiving dominion. The vision’s explanation connects the beasts with kingdoms and the kingdom with the holy ones.', 'The vision returns to Belshazzar’s first year. Compare its images with chapter 2 rather than assuming it follows chapter 6 in time.', 'How does the contrast between beasts and the humanlike figure shape the picture of rule?'],
    ['The ram and the goat', '8:1–27', 'A ram, a goat, and horns depict conflict and destructive power. Gabriel identifies the ram with Media and Persia and the goat with Greece.', 'Here the text names kingdoms. Separate those identifications from later proposals about other details.', 'Which parts of the vision does the explanation identify directly?'],
    ['A prayer and an answer', '9:1–27', 'Reading Jeremiah, Daniel prays with confession and asks for mercy for Jerusalem. Gabriel brings an answer involving seventy weeks, a passage interpreted in different ways.', 'Begin with the prayer before constructing a timeline. Daniel includes himself in the community’s confession.', 'What reasons does Daniel give for asking God to act?'],
    ['Strength for a troubled reader', '10:1–21', 'Daniel mourns and receives an overwhelming vision. A heavenly messenger reassures and strengthens him while describing conflict beyond what Daniel can see.', 'Chapters 10–12 form one extended final vision. Daniel needs help; receiving revelation does not make him invulnerable.', 'How does the messenger respond to Daniel’s weakness?'],
    ['Conflict among rulers', '11:1–45', 'The final vision describes rival rulers, alliances, betrayal, and persecution. Its attention to violent power prepares the reader for the hope of chapter 12.', 'Ask how ordinary faithful people are affected by rulers’ ambitions. Distinguish the descriptions from debated historical identifications.', 'What does this chapter show about the cost of imperial conflict?'],
    ['Hope beyond death', '12:1–13', 'The book closes with distress, deliverance, resurrection, and a call to endure. Daniel receives a promise concerning his own rest and future portion.', 'Read the hope of awakening in verses 2–3 beside the command to continue in verse 13.', 'How does resurrection hope answer a problem that rescue from one danger cannot settle?']
  ];
  const scenes = [
    ['The royal food', 'Daniel wants to avoid defilement. Which response fits Daniel 1:8–16?', ['Request a limited test through the officials.', 'Refuse to learn anything in Babylon.', 'Threaten the official until he agrees.'], 0, 'Daniel requests permission and proposes a ten-day test. His resolve and his manner of asking belong together.'],
    ['The command to bow', 'The friends face a furnace. Which response fits Daniel 3:16–18?', ['Obey because the king’s demand settles what is right.', 'Refuse only if God guarantees their rescue.', 'Remain loyal to God even if rescue does not come.'], 2, 'Their loyalty is not conditional on survival. They believe God can deliver them and still refuse the image without making rescue a condition.'],
    ['The prayer decree', 'A decree forbids petitions to anyone but the king. What does Daniel do in 6:10?', ['Start praying only to provoke the officials.', 'Continue his established pattern of prayer.', 'Give up prayer for the length of the decree.'], 1, 'Daniel continues praying and giving thanks as before. The text presents continuity of faithfulness, not a newly staged protest.']
  ];
  const questions = [
    ['Who is thrown into the furnace in Daniel 3?', ['Daniel alone', 'Shadrach, Meshach, and Abednego', 'Daniel and Darius'], 1, 'Read Daniel 3:20–23: the three friends are named.'],
    ['Which statement fits the structure of Daniel?', ['The visions in 7–12 follow the court stories in 1–6, but book order is not always time order.', 'Every chapter follows the previous chapter chronologically.', 'Only the last chapter contains a vision.'], 0, 'Daniel 7:1 returns to the first year of Belshazzar.'],
    ['What does Daniel 2:44 say about God’s kingdom?', ['It lasts only as long as Babylon.', 'It depends on the statue remaining intact.', 'It will not be destroyed.'], 2, 'Read Daniel 2:44 alongside the stone in verses 34–35.'],
    ['What is a careful approach to a disputed vision?', ['State a preferred timeline as the only possible reading.', 'Observe the symbols, use the passage’s explanation, and identify additional interpretation.', 'Ignore the explanation and match every image to today’s news.'], 1, 'Use the text’s own explanation before making further claims.']
  ];
  const $ = id => document.getElementById(id);
  const key = 'classroomos:daniel';
  let visited = new Set();
  let currentChapter = 0;
  let storage = true;
  try { const saved = JSON.parse(localStorage.getItem(key) || '{}'); visited = new Set((Array.isArray(saved.visited) ? saved.visited : []).filter(n => Number.isInteger(n) && n >= 0 && n < 12)); $('dan-notes').value = typeof saved.notes === 'string' ? saved.notes : ''; } catch (_) { storage = false; }
  function save() {
    try { localStorage.setItem(key, JSON.stringify({visited: [...visited], notes: $('dan-notes').value})); $('notes-status').textContent = 'Progress and notes saved in this browser.'; }
    catch (_) { storage = false; $('notes-status').textContent = 'Browser storage is unavailable. Copy your notes before leaving.'; }
  }
  function openChapter(index, mark = true) {
    const chapter = chapters[index];
    if (!chapter) return;
    currentChapter = index;
    $('chapter-kind').textContent = index < 6 ? 'Court stories · Chapters 1–6' : 'Visions · Chapters 7–12';
    $('chapter-prev').disabled = index === 0;
    $('chapter-next').disabled = index === 11;
    if (mark) visited.add(index);
    $('chapter-ref').textContent = 'Daniel ' + chapter[1];
    $('chapter-heading').textContent = (index + 1) + '. ' + chapter[0];
    $('chapter-summary').textContent = chapter[2]; $('chapter-notice').textContent = chapter[3]; $('chapter-question').textContent = chapter[4];
    $('chapter-read').href = '../../bible.html#/read/daniel/' + (index + 1);
    document.querySelectorAll('[data-chapter]').forEach(b => { b.setAttribute('aria-pressed', String(Number(b.dataset.chapter) === index)); b.classList.toggle('is-visited', visited.has(Number(b.dataset.chapter))); });
    $('chapter-progress').textContent = visited.size + ' of 12 chapters explored.';
    if (mark) save();
  }
  chapters.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.chapter = i; b.textContent = (i + 1) + '. ' + c[0]; b.addEventListener('click', () => {
      openChapter(i);
      if (window.matchMedia('(max-width: 650px)').matches) {
        $('chapter-heading').setAttribute('tabindex', '-1');
        $('chapter-heading').focus({preventScroll: true});
        document.querySelector('.dan-panel').scrollIntoView({block: 'start', behavior: 'instant'});
      }
    }); $(i < 6 ? 'story-buttons' : 'vision-buttons').append(b); });
  $('chapter-prev').addEventListener('click', () => openChapter(currentChapter - 1));
  $('chapter-next').addEventListener('click', () => openChapter(currentChapter + 1));
  document.querySelectorAll('[data-jump-chapter]').forEach(b => b.addEventListener('click', () => {
    openChapter(Number(b.dataset.jumpChapter));
    $('chapter-heading').setAttribute('tabindex', '-1');
    $('chapter-heading').focus({preventScroll: true});
    $('chapter-heading').scrollIntoView({block: 'center', behavior: 'instant'});
  }));
  const evidenceClaims = [
    ['The statue has feet made from iron and clay.', 0, 'Daniel 2:33 describes what the king sees. That makes this an image in the dream.'],
    ['The mixed feet mean a divided kingdom.', 1, 'Daniel 2:41 explicitly explains the mixture as a divided kingdom.'],
    ['The iron legs represent Rome.', 2, 'Rome is an identification in a traditional Christian reading. Daniel 2:40 describes a fourth kingdom but does not name it.'],
    ['The stone becomes a mountain that fills the earth.', 0, 'Daniel 2:35 describes the event within the dream, before Daniel gives its explanation.'],
    ['God establishes a kingdom that will never be destroyed.', 1, 'Daniel 2:44 gives this explanation of the dream.'],
    ['The fourth kingdom represents the Hellenistic world.', 2, 'The USCCB notes offer this historical reading; the empire name is not stated in Daniel 2.']
  ];
  let claimIndex = 0;
  const classified = new Set();
  function renderEvidence() {
    $('evidence-progress').textContent = 'Claim ' + (claimIndex + 1) + ' of ' + evidenceClaims.length;
    $('evidence-claim').textContent = evidenceClaims[claimIndex][0];
    $('evidence-feedback').textContent = 'Choose a claim type and explain your reasoning.';
    $('evidence-next').disabled = true;
    $('evidence-next').textContent = claimIndex === evidenceClaims.length - 1 ? 'Finish evidence activity' : 'Next claim';
    document.querySelectorAll('[data-evidence]').forEach(b => { b.disabled = false; b.setAttribute('aria-pressed', 'false'); });
  }
  document.querySelectorAll('[data-evidence]').forEach(b => b.addEventListener('click', () => {
    const correct = Number(b.dataset.evidence) === evidenceClaims[claimIndex][1];
    document.querySelectorAll('[data-evidence]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('evidence-feedback').textContent = (correct ? 'That fits. ' : 'Reconsider the kind of claim. ') + evidenceClaims[claimIndex][2];
    if (correct) classified.add(claimIndex);
    $('evidence-next').disabled = !classified.has(claimIndex);
  }));
  $('evidence-next').addEventListener('click', () => {
    if (claimIndex < evidenceClaims.length - 1) { claimIndex++; renderEvidence(); }
    else {
      $('evidence-feedback').textContent = 'All six claims explored. Now explain why naming an empire is a different kind of claim from describing a material.';
      $('evidence-next').disabled = true;
      document.querySelectorAll('[data-evidence]').forEach(b => { b.disabled = true; });
    }
  });
  function resetEvidence() { claimIndex = 0; classified.clear(); renderEvidence(); }
  $('evidence-reset').addEventListener('click', resetEvidence);
  $('dan-reset').addEventListener('click', resetEvidence);
  resetEvidence();
  function renderScene() {
    const s = scenes[Number($('pressure-scene').value)];
    $('pressure-heading').textContent = s[0]; $('pressure-prompt').textContent = s[1]; $('pressure-options').replaceChildren();
    $('pressure-feedback').textContent = 'Choose a response to compare it with the text.';
    s[2].forEach((label, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => { [...$('pressure-options').children].forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('pressure-feedback').textContent = (i === s[3] ? 'This fits the passage. ' : 'Compare that prediction with the passage. ') + s[4]; }); $('pressure-options').append(b); });
  }
  $('pressure-scene').addEventListener('change', renderScene);
  questions.forEach((q, i) => { const f = document.createElement('fieldset'); const l = document.createElement('legend'); l.textContent = q[0]; f.append(l); q[1].forEach((answer, j) => { const label = document.createElement('label'); const input = document.createElement('input'); input.type = 'radio'; input.name = 'q' + i; input.value = j; label.append(input, document.createTextNode(answer)); f.append(label); }); const explanation = document.createElement('p'); explanation.id = 'q-result-' + i; f.append(explanation); $('check-questions').append(f); });
  $('dan-check').addEventListener('submit', e => { e.preventDefault(); let correct = 0; const data = new FormData(e.target); questions.forEach((q, i) => { const picked = data.get('q' + i); const ok = picked !== null && Number(picked) === q[2]; if (ok) correct++; $('q-result-' + i).textContent = (picked === null ? 'Choose an answer. ' : ok ? 'Correct. ' : 'Revisit the passage. ') + q[3]; }); $('check-feedback').textContent = correct === questions.length ? 'All four answers fit. Use your passage evidence in the writing prompt below.' : correct + ' of 4 correct. Review the passage guidance under each question, then try again.'; });
  $('dan-notes').addEventListener('input', save);
  $('dan-reset').addEventListener('click', () => { visited.clear(); $('dan-notes').value = ''; $('pressure-scene').value = '0'; renderScene(); $('dan-check').reset(); questions.forEach((_, i) => $('q-result-' + i).textContent = ''); $('check-feedback').textContent = ''; openChapter(0, false); save(); $('notes-status').textContent = storage ? 'This lesson’s progress and notes were reset.' : 'Reset complete. Browser storage is unavailable.'; });
  renderScene(); openChapter(0, false);
  if (!storage) $('notes-status').textContent = 'Browser storage is unavailable. Copy your notes before leaving.';
})();
