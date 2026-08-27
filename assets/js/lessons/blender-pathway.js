(() => {
  const key = 'classroomos-blender-pathway';
  const totalLessons = 7;
  const readProgress = () => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
  const saveProgress = value => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

  const refresh = () => {
    const done = readProgress();
    document.querySelectorAll('[data-lesson-card]').forEach(card => card.classList.toggle('is-complete', done.includes(card.dataset.lessonCard)));
    document.querySelectorAll('[data-complete-lesson]').forEach(button => {
      const complete = done.includes(button.dataset.completeLesson);
      button.classList.toggle('is-done', complete);
      button.textContent = complete ? 'Lesson completed ✓' : 'Mark lesson complete';
    });
    const bar = document.querySelector('[data-course-progress]');
    if (bar) { bar.style.width = `${(done.length / totalLessons) * 100}%`; bar.parentElement?.setAttribute('aria-valuenow', String(done.length)); }
    const label = document.querySelector('[data-progress-label]');
    if (label) label.textContent = `${done.length} of ${totalLessons} lessons complete`;
  };

  document.querySelectorAll('[data-complete-lesson]').forEach(button => button.addEventListener('click', () => {
    const done = readProgress();
    const id = button.dataset.completeLesson;
    if (!done.includes(id)) {
      const section = button.closest('.lesson-section, .finish-line')?.closest('.lesson-section') || button.closest('.finish-line')?.parentElement;
      const checks = [...(section?.querySelectorAll('.checklist input') || [])];
      if (checks.length && checks.some(input => !input.checked)) {
        const status = section.querySelector('[data-check-status]');
        if (status) { status.textContent = 'Check every definition-of-done item before completing the lesson.'; status.style.color = '#a3483f'; }
        checks.find(input => !input.checked)?.focus();
        return;
      }
    }
    const next = done.includes(id) ? done.filter(item => item !== id) : [...done, id];
    saveProgress(next);
    refresh();
  }));

  document.querySelectorAll('.checklist input').forEach(input => input.addEventListener('change', () => {
    const wrap = input.closest('.checklist');
    const status = wrap?.parentElement.querySelector('[data-check-status]');
    if (status) status.textContent = `${wrap.querySelectorAll('input:checked').length}/${wrap.querySelectorAll('input').length} checked`;
  }));

  // generic click-to-explain diagrams: [data-diagram] > [data-diagram-item][data-title][data-note] + [data-diagram-readout]
  document.querySelectorAll('[data-diagram]').forEach(diagram => {
    const readout = diagram.querySelector('[data-diagram-readout]');
    diagram.querySelectorAll('[data-diagram-item]').forEach(item => item.addEventListener('click', () => {
      diagram.querySelectorAll('[data-diagram-item]').forEach(other => other.classList.remove('is-active'));
      item.classList.add('is-active');
      if (readout) readout.innerHTML = `<strong>${item.dataset.title}:</strong> ${item.dataset.note}`;
    }));
  });

  // generic tabsets: [data-tabset] holding [data-tab] buttons and sibling [data-tabset-panel]
  document.querySelectorAll('[data-tabset]').forEach(tabset => {
    const panels = document.querySelectorAll(`[data-tabset-panel][data-tabset-for="${tabset.dataset.tabset}"]`);
    tabset.querySelectorAll('[data-tab]').forEach(tab => tab.addEventListener('click', () => {
      tabset.querySelectorAll('[data-tab]').forEach(other => other.classList.remove('is-active'));
      tab.classList.add('is-active');
      panels.forEach(panel => panel.classList.toggle('is-active', panel.dataset.tabsetPanel === tab.dataset.tab));
    }));
  });

  // generic quizzes: .quiz containing fieldsets named q1..qN with radio value correct/wrong, [data-quiz-check], [data-quiz-result]
  document.querySelectorAll('.quiz').forEach(quiz => {
    const button = quiz.querySelector('[data-quiz-check]');
    const result = quiz.querySelector('[data-quiz-result]');
    button?.addEventListener('click', () => {
      const groups = [...new Set([...quiz.querySelectorAll('input[type=radio]')].map(input => input.name))];
      const answers = groups.map(name => quiz.querySelector(`input[name="${name}"]:checked`));
      if (answers.some(answer => !answer)) {
        result.textContent = 'Choose one answer for every question.';
        result.style.color = '#b45309';
        return;
      }
      const score = answers.filter(answer => answer.value === 'correct').length;
      result.textContent = score === groups.length ? `${score}/${groups.length} — solid work.` : `${score}/${groups.length} — revisit this lesson, then try again.`;
      result.style.color = score === groups.length ? '#047857' : '#b45309';
    });
  });

  // copy-code buttons: [data-copy-target="#id"]
  document.querySelectorAll('[data-copy-target]').forEach(button => button.addEventListener('click', async () => {
    const target = document.querySelector(button.dataset.copyTarget);
    if (!target) return;
    try { await navigator.clipboard.writeText(target.textContent); button.textContent = 'Copied'; }
    catch { button.textContent = 'Select and copy'; }
    window.setTimeout(() => { button.textContent = 'Copy'; }, 1800);
  }));

  // pathway goal picker: highlight the shortest useful route without hiding the full library
  const routeMessages = {
    all: '<strong>Full pathway:</strong> complete Lessons 01–07 in order for the broadest foundation.',
    architecture: '<strong>Architecture route:</strong> 01 Interface → 02 Windows & Doors → 04 Environments → 07 Materials & Render.',
    props: '<strong>Props route:</strong> 01 Interface → 03 Furniture → 06 Props & Tools → 07 Materials & Render.',
    character: '<strong>Character route:</strong> 01 Interface → 05 Character → 07 Materials & Render → rigging in Game Asset Studio.',
    game: '<strong>Game route:</strong> start with 01, choose the asset lesson you need, finish 07, then continue into Game Asset Studio for GLB and Godot.'
  };
  const routeStatus = document.querySelector('[data-route-status]');
  document.querySelectorAll('[data-route-picker]').forEach(button => button.addEventListener('click', () => {
    const route = button.dataset.routePicker;
    document.querySelectorAll('[data-route-picker]').forEach(other => {
      const active = other === button;
      other.classList.toggle('is-active', active);
      other.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-route-node]').forEach(node => {
      const routes = node.dataset.routeNode.split(/\s+/);
      node.classList.toggle('is-route-dimmed', route !== 'all' && !routes.includes(route));
      node.classList.toggle('is-route-picked', route !== 'all' && routes.includes(route));
    });
    document.querySelectorAll('[data-route-lane]').forEach(lane => lane.classList.toggle('is-route-dimmed', route !== 'all' && lane.dataset.routeLane !== route && !(route === 'game')));
    if (routeStatus) routeStatus.innerHTML = routeMessages[route];
  }));

  // guide/vocab side panel (shared shell)
  document.querySelectorAll('.ll-tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.ll-tab').forEach(item => item.setAttribute('aria-selected', 'false'));
    document.querySelectorAll('.ll-pane').forEach(pane => pane.classList.remove('ll-active'));
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(tab.dataset.pane)?.classList.add('ll-active');
  }));
  const panel = document.querySelector('.ll-panel');
  const openButton = document.querySelector('.ll-open-btn');
  const closeButton = document.querySelector('.ll-panel-close');
  const setPanelOpen = open => { panel?.setAttribute('aria-hidden', String(!open)); openButton?.setAttribute('aria-expanded', String(open)); };
  if (window.matchMedia('(max-width:680px)').matches) setPanelOpen(false);
  openButton?.addEventListener('click', () => setPanelOpen(true));
  closeButton?.addEventListener('click', () => setPanelOpen(false));

  refresh();
})();
