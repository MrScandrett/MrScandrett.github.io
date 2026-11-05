(() => {
  'use strict';
  const root = document.querySelector('[data-design-mode]');
  if (!root) return;
  const art = document.getElementById('design-art');
  const inputs = [...root.querySelectorAll('.design-controls input, .design-controls select')];
  const initial = inputs.map(el => ({el, value: el.value, checked: el.checked}));
  const status = document.getElementById('design-status');
  const notes = document.getElementById('design-notes');
  const composition = root.dataset.designMode === 'composition-layout-studio';
  const measure = composition ? document.createElement('canvas').getContext('2d') : null;
  const posterFont = 'Arial, Helvetica, sans-serif';
  const ns = 'http://www.w3.org/2000/svg';
  const get = (name, fallback) => root.querySelector(`[name="${name}"]`)?.value ?? fallback;
  function add(tag, attrs, text, parent = art) {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, val]) => node.setAttribute(key, val));
    if (text !== undefined) node.textContent = text;
    parent.append(node);
    return node;
  }
  function wrapPosterText(value, width) {
    const lines = [];
    let line = '';
    for (const word of value.trim().split(/\s+/)) {
      const joined = line ? line + ' ' + word : word;
      if (measure.measureText(joined).width <= width) {
        line = joined;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      // Long unbroken text still needs to fit the poster margin.
      for (const character of word) {
        if (line && measure.measureText(line + character).width > width) {
          lines.push(line);
          line = '';
        }
        line += character;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function posterText(name, { x, y, width, height, size, weight }) {
    const copy = get(name).trim();
    if (!copy) return 0;
    let lines, leading;
    do {
      measure.font = weight + ' ' + size + 'px ' + posterFont;
      lines = wrapPosterText(copy, width);
      leading = Math.ceil(size * 1.22);
      if (lines.length * leading <= height) break;
      size--;
    } while (size > 0);
    const text = add('text', {
      'data-copy': name, fill: '#172554', 'font-family': posterFont, 'font-size': size, 'font-weight': weight
    });
    lines.forEach((line, index) => add('tspan', { x, y: y + size + index * leading }, line, text));
    return lines.length * leading;
  }

  function renderComposition(accent) {
    add('desc', { id: 'poster-art-description' },
      ['when', 'where', 'action'].map(name => get(name).trim()).filter(Boolean).join(' · '));
    const margin = Number(get('margin'));
    const width = 480 - margin * 2;
    const detailX = margin + (get('align') === 'staggered' ? 42 : 0);
    const gap = Number(get('gap'));

    add('rect', { x: margin, y: 46, width: 68, height: 68, rx: 12, fill: accent });
    add('path', {
      d: `M ${margin + 14} 96 L ${margin + 34} 61 L ${margin + 54} 96 Z`,
      fill: '#fffaf0', stroke: '#172554', 'stroke-width': 1
    });
    const headlineHeight = posterText('title', { x: margin, y: 142, width, height: 126, size: Number(get('size')), weight: 800 });
    const ruleY = 158 + headlineHeight;
    add('rect', { x: margin, y: ruleY, width, height: 7, fill: accent });

    const first = { x: detailX, y: ruleY + 28, width: 480 - margin - detailX, height: 56, size: 19, weight: 400 };
    const whenHeight = posterText('when', first);
    posterText('where', { ...first, y: first.y + (whenHeight ? whenHeight + gap : 0) });
    posterText('action', { x: margin, y: 492, width, height: 64, size: 21, weight: 700 });

    if (root.querySelector('[name="guides"]').checked) {
      for (const x of new Set([margin, detailX, 480 - margin])) {
        add('line', { 'data-guide': 'true', x1: x, x2: x, y1: 25, y2: 575, stroke: '#be123c', 'stroke-dasharray': '6 6' });
      }
    }
    for (const field of inputs.filter(field => field.type === 'range')) {
      field.labels[0].querySelector('[data-slider-value]').textContent = field.value + ' px';
    }
  }

  function render() {
    art.replaceChildren();
    add('title', composition ? { id: 'poster-art-title' } : {},
      composition ? get('title').trim() || 'Live poster preview' : 'Your design: editable vector artwork');
    add('rect', {width:480,height:600,fill:'#fffaf0'});
    const accent = get('accent', '#155e75');
    if (composition) {
      renderComposition(accent);
    } else if (root.dataset.designMode === 'vector-drawing-studio') {
      const curve = get('curve',65), stroke = get('stroke',4), merged = get('overlap','separate') === 'merged';
      add('path',{d:`M 130 340 C 100 ${curve} 360 ${curve} 350 340 Q 240 460 130 340 Z`,fill:accent,stroke:'#172554','stroke-width':stroke});
      add('circle',{cx:240,cy:340,r:80,fill:merged?accent:'#fbbf24',stroke:merged?'none':'#172554','stroke-width':stroke});
      add('text',{x:240,y:510,'text-anchor':'middle',fill:'#172554','font-family':'sans-serif','font-size':24},'SHAPES → EMBLEM');
    } else {
      const margin = Number(get('margin',44)), size = get('size',32), staggered = get('align','aligned') === 'staggered';
      add('rect',{x:margin,y:48,width:72,height:72,rx:14,fill:accent});
      add('path',{d:`M ${margin+16} 100 L ${margin+36} 65 L ${margin+56} 100 Z`,fill:'#fffaf0'});
      add('text',{x:margin,y:190,fill:'#172554','font-family':'sans-serif','font-size':size,'font-weight':800,textLength:480-2*margin,lengthAdjust:'spacingAndGlyphs'},get('title','STEAM SHOWCASE'));
      add('rect',{x:margin,y:222,width:480-2*margin,height:12,fill:accent});
      const x = staggered ? margin+50 : margin;
      [get('when','Practice event · Friday, 4–6 PM'),get('where','School hall · All families welcome')].forEach((text,i)=>add('text',{x,y:300+i*38,fill:'#172554','font-family':'sans-serif','font-size':17},text));
      add('text',{x:margin,y:480,fill:accent,'font-family':'sans-serif','font-size':19,'font-weight':700},get('action','Explore student projects'));
      if (root.querySelector('[name="guides"]')?.checked) add('line',{'data-guide':'true',x1:margin,x2:margin,y1:25,y2:560,stroke:'#be123c','stroke-dasharray':'6 6'});
    }
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    announce(`Downloaded ${name}.`);
  }
  function svgBlob() {
    const clone = art.cloneNode(true);
    clone.querySelectorAll('[data-guide]').forEach(el=>el.remove());
    clone.setAttribute('width',480); clone.setAttribute('height',600);
    return new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'});
  }
  function announce(message) {
    if (status.textContent !== message) status.textContent = message;
  }

  function initCompositionProject() {
    const storageKey = 'classroomos:composition-project:v1';
    const file = document.getElementById('design-project-file');
    const restore = document.getElementById('restore-design');
    let previous = null;
    let revision = 0;
    const readField = el => el.type === 'checkbox' ? el.checked : el.value;
    const sample = Object.fromEntries(inputs.map(el => [el.name, readField(el)]));

    function snapshot() {
      return { version: 1, poster: Object.fromEntries(inputs.map(el => [el.name, readField(el)])), notes: notes.value };
    }

    function validate(project) {
      if (project?.version !== 1 || typeof project.notes !== 'string' || project.notes.length > notes.maxLength) {
        throw new Error('Invalid project');
      }
      for (const el of inputs) {
        const value = project.poster?.[el.name];
        if (el.type === 'checkbox') {
          if (typeof value !== 'boolean') throw new Error('Invalid guide setting');
          continue;
        }
        if (typeof value !== 'string') throw new Error('Invalid poster field');
        if (el.type === 'range' && (!/^\d+$/.test(value) || Number(value) < Number(el.min) || Number(value) > Number(el.max))) {
          throw new Error('Invalid slider value');
        }
        if (el.type === 'color' && !/^#[0-9a-f]{6}$/i.test(value)) throw new Error('Invalid color');
        if (el.tagName === 'SELECT' && ![...el.options].some(option => option.value === value)) throw new Error('Invalid alignment');
        if (el.type === 'text' && (value.length > el.maxLength || /[\r\n]/.test(value))) throw new Error('Invalid poster copy');
      }
      return project;
    }

    function apply(project) {
      for (const el of inputs) {
        const value = project.poster[el.name];
        if (el.type === 'checkbox') el.checked = value;
        else el.value = value;
      }
      notes.value = project.notes;
      render();
    }

    function autosave() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot()));
        return true;
      } catch {
        announce('Browser autosave is unavailable. Save a project file to keep your work.');
        return false;
      }
    }

    function replace(project, message) {
      previous = snapshot();
      restore.hidden = false;
      revision++;
      apply(project);
      if (autosave()) announce(message);
    }

    inputs.forEach(el => el.addEventListener('input', () => {
      revision++;
      render();
      if (autosave()) announce('Draft saved in this browser.');
    }));
    notes.addEventListener('input', () => {
      revision++;
      autosave();
    });
    document.getElementById('new-design').addEventListener('click', () => {
      const poster = { ...sample, title: '', when: '', where: '', action: '' };
      replace({ poster, notes: '' }, 'Blank poster ready. Restore draft brings back your previous work.');
      root.querySelector('input[name="title"]').focus();
    });
    document.getElementById('reset-design').addEventListener('click', () => {
      replace({ poster: sample, notes: notes.value }, 'Sample loaded. Your critique notes are kept.');
    });
    restore.addEventListener('click', () => replace(previous, 'Previous draft restored.'));

    document.getElementById('save-design').addEventListener('click', () => {
      download(new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' }), filename('.layout.json'));
    });
    document.getElementById('open-design').addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const selected = file.files[0];
      file.value = '';
      if (!selected) return;
      const startedAt = revision;
      try {
        if (selected.size > 128_000) throw new Error('Project file too large');
        const project = validate(JSON.parse(await selected.text()));
        if (startedAt !== revision) {
          announce('The draft changed while the file was opening. Open it again to replace the draft.');
          return;
        }
        replace(project, 'Project opened. Restore draft brings back your previous work.');
      } catch {
        announce('Could not open that file. Choose a valid Composition & Layout Studio project.');
      }
    });

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) apply(validate(JSON.parse(saved)));
    } catch {
      announce('The browser draft could not be loaded. You can open a saved project file.');
    }
  }

  function filename(extension) {
    const name = composition ? get('title').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .slice(0, 60).replace(/^-|-$/g, '') : '';
    return (name || root.dataset.designMode) + extension;
  }

  if (composition) {
    initCompositionProject();
  } else {
    inputs.forEach(el => el.addEventListener('input', render));
    document.getElementById('reset-design').addEventListener('click', () => {
      initial.forEach(({ el, value, checked }) => { el.value = value; el.checked = checked; });
      render();
      announce('Studio reset. Your notes are kept.');
    });
  }
  document.getElementById('export-svg').addEventListener('click',()=>download(svgBlob(),filename('.svg')));
  document.getElementById('export-png').addEventListener('click',()=>{
    const url = URL.createObjectURL(svgBlob()), img = new Image();
    const name = filename('.png');
    img.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width=960;canvas.height=1200;
      canvas.getContext('2d').drawImage(img,0,0,960,1200);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob=>{if(blob)download(blob,name);else status.textContent='PNG export failed. Try SVG instead.';},'image/png');
    };
    img.onerror = ()=>{URL.revokeObjectURL(url);status.textContent='PNG export failed. Try SVG instead.';};
    img.src=url;
  });
  document.getElementById('print-design').addEventListener('click',()=>window.print());
  document.getElementById('export-notes').addEventListener('click',()=>download(new Blob([notes.value],{type:'text/plain;charset=utf-8'}),filename('-notes.txt')));
  render();
})();
