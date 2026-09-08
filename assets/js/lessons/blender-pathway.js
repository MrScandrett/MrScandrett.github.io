(() => {
  const key = 'classroomos-blender-pathway';
  const lessonIds = ['1', '2', '3', '4', '5', '6', '7'];
  const totalLessons = lessonIds.length;
  const routeKey = `${key}-route`;
  const routes = {
    all: { ids: lessonIds, name: 'Full pathway', note: 'Build a broad foundation, from your first objects to a finished render.' },
    architecture: { ids: ['1', '2', '3', '4', '7'], name: 'Room or building', note: 'Make the window and chair first, then bring them together in a modular room.' },
    props: { ids: ['1', '3', '6', '7'], name: 'Furniture or props', note: 'Practice on a chair, build a tool, then light and render your work.' },
    character: { ids: ['1', '5', '7'], name: 'Character', note: 'Model and render a character, then continue to rigging in Game Asset Studio.' },
    game: { ids: ['1', '6', '7'], name: 'First game prop', note: 'Start with one manageable prop. After rendering it, use Game Asset Studio for export and engine setup. For a room or character, choose that route instead.' }
  };
  let sessionProgress = [];
  let storageAvailable = true;
  const readProgress = () => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? [...new Set(value.map(String).filter(id => lessonIds.includes(id)))] : [];
    } catch { return sessionProgress; }
  };
  const saveProgress = value => {
    sessionProgress = value;
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { storageAvailable = false; }
  };
  const readRoute = () => {
    try { const value = localStorage.getItem(routeKey); return Object.hasOwn(routes, value) ? value : 'all'; }
    catch { return 'all'; }
  };
  let selectedRoute = readRoute();
  const refreshRoute = done => {
    const plan = document.querySelector('[data-route-plan]');
    if (!plan) return;
    const route = routes[selectedRoute];
    const cards = [...document.querySelectorAll('[data-lesson-card]')];
    const nextId = route.ids.find(id => !done.includes(id));
    const nextCard = cards.find(card => card.dataset.lessonCard === nextId);
    document.querySelectorAll('[data-route-picker]').forEach(button => {
      const active = button.dataset.routePicker === selectedRoute;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    cards.forEach(card => {
      const inRoute = route.ids.includes(card.dataset.lessonCard);
      card.classList.toggle('is-route-picked', inRoute && selectedRoute !== 'all');
      const status = card.querySelector('[data-card-status]');
      if (status) status.textContent = done.includes(card.dataset.lessonCard) ? 'Completed ✓' : card.dataset.lessonCard === nextId ? 'Up next' : inRoute && selectedRoute !== 'all' ? 'In your route' : 'Not started';
    });
    plan.replaceChildren(...route.ids.map(id => {
      const card = cards.find(item => item.dataset.lessonCard === id);
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = card.href;
      const label = document.createElement('span');
      label.textContent = `Lesson ${id.padStart(2, '0')} · ${done.includes(id) ? 'Completed ✓' : id === nextId ? 'Up next' : 'To do'}`;
      const title = document.createElement('b');
      title.textContent = card.querySelector('.bl-path-copy b').textContent;
      link.append(label, title);
      if (id === nextId) { li.className = 'is-next'; link.setAttribute('aria-current', 'step'); }
      if (done.includes(id)) li.classList.add('is-complete');
      li.append(link);
      return li;
    }));
    document.querySelector('[data-route-status]').textContent = `${route.name}: ${route.note}`;
    document.querySelector('[data-route-progress]').textContent = `${route.ids.length} lessons · ${route.ids.filter(id => done.includes(id)).length} complete`;
    document.querySelectorAll('[data-continue-link], [data-route-continue]').forEach(link => {
      link.href = nextCard ? nextCard.href : '#capstone';
      link.textContent = nextCard ? `${done.some(id => route.ids.includes(id)) ? 'Continue' : 'Start'} Lesson ${nextId} →` : 'Route complete · Show your work →';
    });
    const note = document.querySelector('[data-save-note]');
    if (note && !storageAvailable) note.textContent = 'Browser storage is unavailable. Progress lasts only while this page stays open.';
  };

  const refresh = () => {
    const done = readProgress();
    document.querySelectorAll('[data-lesson-card]').forEach(card => card.classList.toggle('is-complete', done.includes(card.dataset.lessonCard)));
    document.querySelectorAll('[data-complete-lesson]').forEach(button => {
      const complete = done.includes(button.dataset.completeLesson);
      button.classList.toggle('is-done', complete);
      button.setAttribute('aria-pressed', String(complete));
      button.textContent = complete ? 'Lesson completed ✓' : 'Mark lesson complete';
    });
    const bar = document.querySelector('[data-course-progress]');
    if (bar) { bar.style.width = `${(done.length / totalLessons) * 100}%`; bar.parentElement?.setAttribute('aria-valuenow', String(done.length)); }
    const label = document.querySelector('[data-progress-label]');
    if (label) label.textContent = `${done.length} of ${totalLessons} lessons complete`;
    refreshRoute(done);
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

  // Keep the selected route and completion in sync when returning from a lesson.
  document.querySelectorAll('[data-route-picker]').forEach(button => button.addEventListener('click', () => {
    if (!Object.hasOwn(routes, button.dataset.routePicker)) return;
    selectedRoute = button.dataset.routePicker;
    try { localStorage.setItem(routeKey, selectedRoute); } catch { storageAvailable = false; }
    refresh();
  }));
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === routeKey || event.key === null) { selectedRoute = readRoute(); refresh(); }
  });
  window.addEventListener('pageshow', refresh);

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
