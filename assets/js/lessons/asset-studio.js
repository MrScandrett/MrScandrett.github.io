(() => {
  const key = 'classroomos-asset-studio';
  const getProgress = () => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
  const saveProgress = value => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const refresh = () => {
    const done = getProgress();
    document.querySelectorAll('[data-asset-card]').forEach(card => card.classList.toggle('is-complete', done.includes(card.dataset.assetCard)));
    document.querySelectorAll('[data-complete-asset]').forEach(button => {
      const complete = done.includes(button.dataset.completeAsset);
      button.classList.toggle('is-done', complete);
      button.textContent = complete ? 'Completed ✓' : 'Mark lesson complete';
    });
    const bar = document.querySelector('[data-asset-progress]');
    if (bar) bar.style.width = `${done.length / 6 * 100}%`;
    const label = document.querySelector('[data-asset-progress-label]');
    if (label) label.textContent = `${done.length} of 6 lessons complete`;
  };
  document.querySelectorAll('[data-complete-asset]').forEach(button => button.addEventListener('click', () => {
    const done = getProgress();
    const id = button.dataset.completeAsset;
    if (!done.includes(id)) {
      const section = button.closest('.asset-section');
      const checks = [...(section?.querySelectorAll('.asset-checklist input') || [])];
      if (checks.some(input => !input.checked)) {
        const status = section.querySelector('[data-check-status]');
        if (status) { status.textContent = 'Verify every definition-of-done item first.'; status.style.color = '#9a413d'; }
        checks.find(input => !input.checked)?.focus();
        return;
      }
    }
    saveProgress(done.includes(id) ? done.filter(item => item !== id) : [...done,id]);
    refresh();
  }));
  document.querySelectorAll('.asset-checklist input').forEach(input => input.addEventListener('change', () => {
    const list = input.closest('.asset-checklist');
    const status = list.parentElement.querySelector('[data-check-status]');
    if (status) status.textContent = `${list.querySelectorAll('input:checked').length}/${list.querySelectorAll('input').length} checked`;
  }));
  document.querySelectorAll('[data-question]').forEach(question => {
    const result = question.querySelector('.asset-result');
    question.querySelectorAll('button[data-answer]').forEach(button => button.addEventListener('click', () => {
      question.querySelectorAll('button').forEach(item => item.classList.remove('is-correct','is-wrong'));
      const correct = button.dataset.answer === 'correct';
      button.classList.add(correct ? 'is-correct' : 'is-wrong');
      if (result) { result.textContent = correct ? question.dataset.correct : question.dataset.retry; result.style.color = correct ? '#28775b' : '#9a413d'; }
    }));
  });
  const notes = {
    plan:['Plan','Choose a purpose, target scale, reference, texture size, and triangle budget before shaping anything.'],
    model:['Model','Build clean forms with useful edge flow, correct scale, sensible pivots, and reusable parts.'],
    surface:['Surface','Unwrap UVs and author materials that explain what the object is made from.'],
    animate:['Rig + animate','Create controls and motion only where the design needs deformation or movement.'],
    export:['Export','Apply transforms, name assets, export glTF/GLB, and test the real file in-engine.']
  };
  document.querySelectorAll('.pipeline-stage').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.pipeline-stage').forEach(item => item.classList.remove('is-active'));
    button.classList.add('is-active');
    const [name,note] = notes[button.dataset.stage];
    const out = document.querySelector('.pipeline-readout');
    if (out) out.innerHTML = `<strong>${name}:</strong> ${note}`;
  }));
  refresh();
})();
