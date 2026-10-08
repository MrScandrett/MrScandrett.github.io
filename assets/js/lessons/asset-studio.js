(() => {
  const key = 'classroomos-asset-studio';
  const briefKey = `${key}:brief`;
  const read = (name, fallback) => { try { return JSON.parse(localStorage.getItem(name) || 'null') ?? fallback; } catch { return fallback; } };
  const write = (name, value) => { try { localStorage.setItem(name, JSON.stringify(value)); } catch {} };
  const getProgress = () => read(key, []);
  const saveProgress = value => write(key, value);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));

  // The six lessons are one production line: each ships a file the next one opens,
  // made in whatever app the student uses. The Asset Bench (assets/js/asset-bench.mjs)
  // checks each handoff file against the brief below.
  // `brief` lists which studio-brief fields matter on that lesson's page.
  const LESSONS = [
    { id:'1', file:'game-asset-textures.html', short:'Textures', color:'#287ea8', bring:'Your studio brief and one real reference photo', ship:'A tileable material: base color + roughness (+ normal) PNGs', brief:['style','palette','texel','texture'] },
    { id:'2', file:'game-asset-furniture.html', short:'Furniture', color:'#a66339', bring:'Lesson 1’s material and your palette', ship:'One game prop .glb with applied scale and a floor-level origin', brief:['style','palette','propTris'] },
    { id:'3', file:'game-asset-modular-rooms.html', short:'Rooms', color:'#527998', bring:'Your prop as a scale check and Lesson 1’s material', ship:'A grid-snapped room kit: floor, wall, doorway, corner', brief:['style','module'] },
    { id:'4', file:'game-asset-uv-export.html', short:'UV & Export', color:'#8768a4', bring:'Your prop and room kit, from whatever 3D app you used', ship:'An engine-ready .glb set, Bench-checked and tested in your engine', brief:['texel','texture','propTris'] },
    { id:'5', file:'game-asset-character-rigging.html', short:'Rigging', color:'#308162', bring:'A character mesh at your character budget', ship:'A rigged, weight-painted character that bends cleanly', brief:['style','charTris'] },
    { id:'6', file:'game-asset-character-animation.html', short:'Animation', color:'#cb4840', bring:'Lesson 5’s rigged character', ship:'Named idle + walk clips in one .glb, tested in the engine', brief:['style','motion'] }
  ];
  const STYLES = { cozy:'Cozy spaceship cabin', lab:'Abandoned research lab', bedroom:'Stylized bedroom', workshop:'Fantasy workshop' };
  const MOTION = { natural:'Naturalistic', cartoon:'Cartoon', anime:'Anime-inspired', retro:'Low-poly retro' };
  const DEFAULT_BRIEF = { project:'', style:'', styleOther:'', palette:['#3b5b6e','#c98a4b','#e9e2d0'], module:'4', texel:'512', texture:'1024', propTris:'2000', charTris:'5000', motion:'natural' };
  const getBrief = () => ({ ...DEFAULT_BRIEF, ...read(briefKey, {}) });
  const styleName = brief => brief.style === 'other' ? (brief.styleOther || 'Your own idea') : (STYLES[brief.style] || '');
  const BRIEF_CHIPS = {
    style: b => styleName(b) && `<span><b>Look</b> ${esc(styleName(b))}</span>`,
    palette: b => `<span><b>Palette</b> ${b.palette.map(c => `<i style="background:${esc(c)}" title="${esc(c)}"></i>`).join('')}</span>`,
    module: b => `<span><b>Grid module</b> ${esc(b.module)} m</span>`,
    texel: b => `<span><b>Texel density</b> ${esc(b.texel)} px/m</span>`,
    texture: b => `<span><b>Texture size</b> ${esc(b.texture)} px</span>`,
    propTris: b => `<span><b>Prop budget</b> ${esc(b.propTris)} tris</span>`,
    charTris: b => `<span><b>Character budget</b> ${esc(b.charTris)} tris</span>`,
    motion: b => `<span><b>Motion style</b> ${esc(MOTION[b.motion] || b.motion)}</span>`
  };

  const here = location.pathname.split('/').pop();
  const lesson = LESSONS.find(item => item.file === here);
  const pathway = 'game-asset-studio-pathway.html';

  // Course route: shown under every lesson hero so students always see the whole line.
  if (lesson) {
    const hero = document.querySelector('.asset-lesson-hero');
    const route = document.createElement('nav');
    route.className = 'asset-route';
    route.setAttribute('aria-label', 'Game Asset Studio lessons');
    route.innerHTML = `<ol>${LESSONS.map(item => `<li><a href="${item.file}" data-asset-card="${item.id}" style="--card-color:${item.color}"${item === lesson ? ' aria-current="step"' : ''}><b>0${item.id}</b><span>${item.short}</span></a></li>`).join('')}</ol>`;
    const handoff = document.createElement('section');
    handoff.className = 'asset-handoff';
    handoff.setAttribute('aria-label', 'What this lesson needs and produces');
    handoff.innerHTML = `<div><span>Bring in</span><p>${esc(lesson.bring)}</p></div><div><span>Ship out</span><p>${esc(lesson.ship)}${document.getElementById('bench') ? ' <a href="#bench">Check it on the Bench ↓</a>' : ''}</p></div><div class="asset-brief-strip" data-asset-brief-strip></div>`;
    hero?.after(route, handoff);
    const strip = handoff.querySelector('[data-asset-brief-strip]');
    const stored = read(briefKey, null);
    if (stored && (stored.project || stored.style)) {
      const brief = getBrief();
      strip.innerHTML = `<span>Studio brief${brief.project ? ` · ${esc(brief.project)}` : ''}</span><p>${lesson.brief.map(field => BRIEF_CHIPS[field](brief)).filter(Boolean).join('')}<a href="${pathway}#studio-brief">Edit</a></p>`;
    } else {
      strip.innerHTML = `<span>Studio brief</span><p>Not set yet. <a href="${pathway}#studio-brief">Choose your look, palette, and budgets</a> so every lesson builds the same world.</p>`;
    }
  }

  // Pathway: the brief form that every lesson reads back.
  const form = document.querySelector('[data-asset-brief]');
  if (form) {
    const brief = getBrief();
    const fields = [...form.querySelectorAll('[name]')];
    fields.forEach(field => {
      const match = field.name.match(/^palette(\d)$/);
      field.value = match ? brief.palette[+match[1]] : brief[field.name];
    });
    const other = form.querySelector('[data-brief-other]');
    const status = form.querySelector('[data-brief-status]');
    const sync = () => { if (other) other.hidden = form.elements.style.value !== 'other'; };
    sync();
    form.addEventListener('input', () => {
      const next = { ...getBrief(), palette: [] };
      fields.forEach(field => {
        const match = field.name.match(/^palette(\d)$/);
        if (match) next.palette[+match[1]] = field.value; else next[field.name] = field.value.trim ? field.value.trim() : field.value;
      });
      write(briefKey, next);
      sync();
      if (status) status.textContent = 'Saved in this browser. Every lesson now shows your brief.';
    });
    // Typing already saves; the button is for students who expect one (and gives the form a submit control).
    form.addEventListener('submit', event => {
      event.preventDefault();
      form.dispatchEvent(new Event('input'));
      if (status) status.textContent = 'Brief saved in this browser. Every lesson and Asset Bench now uses it.';
    });
  }

  // Definition-of-done ticks persist per lesson, so a reload doesn't undo the checklist.
  document.querySelectorAll('.asset-checklist').forEach((list, index) => {
    const listKey = `${key}:checks:${lesson?.id || here}:${index}`;
    const inputs = [...list.querySelectorAll('input')];
    const saved = read(listKey, []);
    const status = list.parentElement.querySelector('[data-check-status]');
    const update = () => { if (status) { status.textContent = `${inputs.filter(input => input.checked).length}/${inputs.length} checked`; status.style.color = ''; } };
    inputs.forEach((input, i) => {
      input.checked = !!saved[i];
      input.addEventListener('change', () => { write(listKey, inputs.map(item => item.checked)); update(); });
    });
    if (saved.some(Boolean)) update();
  });

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
