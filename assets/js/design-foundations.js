(() => {
  'use strict';
  const root = document.querySelector('[data-design-mode]');
  if (!root) return;
  const art = document.getElementById('design-art');
  const inputs = [...root.querySelectorAll('.design-controls input, .design-controls select')];
  const initial = inputs.map(el => ({ el, value: el.value, checked: el.checked }));
  const status = document.getElementById('design-status');
  const notes = document.getElementById('design-notes');
  const metricsEl = document.getElementById('comp-metrics');
  const veil = document.getElementById('comp-veil');
  const veilCountdown = document.getElementById('comp-veil-countdown');
  const flashBtn = document.getElementById('comp-flash-btn');
  const revealBtn = document.getElementById('comp-reveal-btn');
  const tabs = [...root.querySelectorAll('.comp-tablist [role="tab"]')];
  const panels = [...root.querySelectorAll('.comp-tabpanel[role="tabpanel"]')];

  const composition = root.dataset.designMode === 'composition-layout-studio';
  const measure = composition ? document.createElement('canvas').getContext('2d') : null;
  const posterFont = 'Arial, Helvetica, sans-serif';
  const ns = 'http://www.w3.org/2000/svg';
  const get = (name, fallback) => {
    const el = root.querySelector(`[name="${name}"]`);
    if (!el) return fallback;
    return el.type === 'checkbox' ? el.checked : el.value;
  };

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
      if (!word) continue;
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

  function posterText(name, { x, y, width, height, size, weight, anchor = 'start' }) {
    const copy = String(get(name, '')).trim();
    if (!copy) return { h: 0, w: 0 };
    let lines, leading;
    do {
      measure.font = weight + ' ' + size + 'px ' + posterFont;
      lines = wrapPosterText(copy, width);
      leading = Math.ceil(size * 1.22);
      if (lines.length * leading <= height) break;
      size--;
    } while (size > 0);
    const maxLineW = lines.reduce((m, l) => Math.max(m, measure.measureText(l).width), 0);
    const text = add('text', {
      'data-copy': name, fill: '#172554', 'font-family': posterFont, 'font-size': size, 'font-weight': weight, 'text-anchor': anchor
    });
    lines.forEach((line, index) => add('tspan', { x, y: y + size + index * leading }, line, text));
    return { h: lines.length * leading, w: Math.min(width, maxLineW) };
  }

  function renderComposition(accent) {
    add('desc', { id: 'poster-art-description' },
      ['when', 'where', 'action'].map(name => String(get(name, '')).trim()).filter(Boolean).join(' · '));
    const margin = Number(get('margin', 44));
    const width = 480 - margin * 2;
    const align = get('align', 'aligned');
    const gap = Number(get('gap', 14));

    let occupiedArea = 0;
    let leftMass = 0;
    let rightMass = 0;
    const trackMass = (bx, bw, bh) => {
      const area = Math.max(0, bw * bh);
      occupiedArea += area;
      const cx = bx + bw / 2;
      if (cx < 240) leftMass += area * (240 - cx);
      else rightMass += area * (cx - 240);
    };

    const isCentered = align === 'centered';
    const isSplit = align === 'split';
    const detailX = isCentered ? 240 : isSplit ? 250 : margin + (align === 'staggered' ? 42 : 0);
    const emblemX = isCentered ? 206 : margin;
    const headlineX = isCentered ? 240 : margin;
    const headlineAnchor = isCentered ? 'middle' : 'start';
    const headlineW = isSplit ? Math.max(120, 224 - margin) : width;

    add('rect', { x: emblemX, y: 46, width: 68, height: 68, rx: 12, fill: accent });
    add('path', {
      d: `M ${emblemX + 14} 96 L ${emblemX + 34} 61 L ${emblemX + 54} 96 Z`,
      fill: '#fffaf0', stroke: '#172554', 'stroke-width': 1
    });
    trackMass(emblemX, 68, 68);

    const headBox = posterText('title', {
      x: headlineX, y: 142, width: headlineW, height: 148,
      size: Number(get('size', 36)), weight: 800, anchor: headlineAnchor
    });
    trackMass(isCentered ? 240 - headBox.w / 2 : headlineX, headBox.w, headBox.h);

    const ruleY = isSplit ? 142 : 158 + headBox.h;
    if (isSplit) {
      add('rect', { x: 232, y: 142, width: 6, height: 220, fill: accent });
      trackMass(232, 6, 220);
    } else {
      add('rect', { x: margin, y: ruleY, width, height: 7, fill: accent });
      trackMass(margin, width, 7);
    }

    const detailW = isCentered ? width : isSplit ? Math.max(110, 480 - margin - detailX) : 480 - margin - detailX;
    const firstY = isSplit ? 142 : ruleY + 28;
    const first = {
      x: detailX, y: firstY, width: detailW, height: 64, size: 19, weight: 400,
      anchor: isCentered ? 'middle' : 'start'
    };
    const whenBox = posterText('when', first);
    trackMass(isCentered ? 240 - whenBox.w / 2 : detailX, whenBox.w, whenBox.h);

    const whereBox = posterText('where', { ...first, y: first.y + (whenBox.h ? whenBox.h + gap : 0) });
    trackMass(isCentered ? 240 - whereBox.w / 2 : detailX, whereBox.w, whereBox.h);

    const actionBox = posterText('action', {
      x: isCentered ? 240 : margin, y: 492, width, height: 64, size: 21, weight: 700, anchor: headlineAnchor
    });
    trackMass(isCentered ? 240 - actionBox.w / 2 : margin, actionBox.w, actionBox.h);

    if (root.querySelector('[name="guides"]')?.checked) {
      const xs = isCentered ? [margin, 240, 480 - margin] : [margin, detailX, 480 - margin];
      for (const x of new Set(xs)) {
        add('line', { 'data-guide': 'true', x1: x, x2: x, y1: 25, y2: 575, stroke: '#be123c', 'stroke-dasharray': '6 6' });
      }
    }

    if (root.querySelector('[name="thirds"]')?.checked) {
      for (const x of [160, 320]) {
        add('line', { 'data-guide': 'true', x1: x, x2: x, y1: 0, y2: 600, stroke: '#0e7490', 'stroke-width': 0.9, 'stroke-dasharray': '4 5', opacity: 0.75 });
      }
      for (const y of [200, 400]) {
        add('line', { 'data-guide': 'true', x1: 0, x2: 480, y1: y, y2: y, stroke: '#0e7490', 'stroke-width': 0.9, 'stroke-dasharray': '4 5', opacity: 0.75 });
      }
    }

    for (const field of inputs.filter(field => field.type === 'range')) {
      const label = field.labels[0]?.querySelector('[data-slider-value]');
      if (label) label.textContent = field.value + ' px';
    }

    if (metricsEl) {
      const totalArea = 480 * 600;
      const negPct = Math.max(15, Math.min(95, Math.round((1 - occupiedArea / totalArea) * 100)));
      const diff = (leftMass - rightMass) / Math.max(1, leftMass + rightMass);
      const balance = Math.abs(diff) < 0.14 ? 'Balanced' : diff > 0 ? 'Left-weighted' : 'Right-weighted';
      metricsEl.textContent = `Negative space: ${negPct}% · Balance: ${balance}`;
    }
  }

  function render() {
    art.replaceChildren();
    add('title', composition ? { id: 'poster-art-title' } : {},
      composition ? String(get('title', '')).trim() || 'Live poster preview' : 'Your design: editable vector artwork');
    add('rect', { width: 480, height: 600, fill: '#fffaf0' });
    const accent = get('accent', '#155e75');
    if (composition) {
      renderComposition(accent);
    } else if (root.dataset.designMode === 'vector-drawing-studio') {
      const curve = get('curve', 65), stroke = get('stroke', 4), merged = get('overlap', 'separate') === 'merged';
      add('path', { d: `M 130 340 C 100 ${curve} 360 ${curve} 350 340 Q 240 460 130 340 Z`, fill: accent, stroke: '#172554', 'stroke-width': stroke });
      add('circle', { cx: 240, cy: 340, r: 80, fill: merged ? accent : '#fbbf24', stroke: merged ? 'none' : '#172554', 'stroke-width': stroke });
      add('text', { x: 240, y: 510, 'text-anchor': 'middle', fill: '#172554', 'font-family': 'sans-serif', 'font-size': 24 }, 'SHAPES → EMBLEM');
    } else {
      const margin = Number(get('margin', 44)), size = get('size', 32), staggered = get('align', 'aligned') === 'staggered';
      add('rect', { x: margin, y: 48, width: 72, height: 72, rx: 14, fill: accent });
      add('path', { d: `M ${margin + 16} 100 L ${margin + 36} 65 L ${margin + 56} 100 Z`, fill: '#fffaf0' });
      add('text', { x: margin, y: 190, fill: '#172554', 'font-family': 'sans-serif', 'font-size': size, 'font-weight': 800 }, get('title', 'STEAM SHOWCASE'));
      add('rect', { x: margin, y: 222, width: 480 - 2 * margin, height: 12, fill: accent });
      const x = staggered ? margin + 50 : margin;
      [get('when', 'Practice event · Friday, 4–6 PM'), get('where', 'School hall · All families welcome')].forEach((text, i) => add('text', { x, y: 300 + i * 38, fill: '#172554', 'font-family': 'sans-serif', 'font-size': 17 }, text));
      add('text', { x: margin, y: 480, fill: accent, 'font-family': 'sans-serif', 'font-size': 19, 'font-weight': 700 }, get('action', 'Explore student projects'));
      if (root.querySelector('[name="guides"]')?.checked) add('line', { 'data-guide': 'true', x1: margin, x2: margin, y1: 25, y2: 560, stroke: '#be123c', 'stroke-dasharray': '6 6' });
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
    clone.querySelectorAll('[data-guide]').forEach(el => el.remove());
    clone.setAttribute('width', 480); clone.setAttribute('height', 600);
    return new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
  }
  function announce(message) {
    if (status.textContent !== message) status.textContent = message;
  }

  function initTabs() {
    if (!tabs.length) return;
    function activate(tab) {
      const id = tab.getAttribute('aria-controls');
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(p => { p.hidden = p.id !== id; });
    }
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        activate(next);
        next.focus();
      });
    });
  }

  function initFlashTest() {
    if (!flashBtn || !veil) return;
    let timer = null;
    function stop() {
      clearInterval(timer);
      timer = null;
      veil.hidden = true;
      if (veilCountdown) veilCountdown.textContent = '';
      flashBtn.disabled = false;
    }
    flashBtn.addEventListener('click', () => {
      stop();
      const guides = root.querySelector('[name="guides"]');
      const thirds = root.querySelector('[name="thirds"]');
      const prevG = guides?.checked ?? false;
      const prevT = thirds?.checked ?? false;
      if (guides) guides.checked = false;
      if (thirds) thirds.checked = false;
      render();
      flashBtn.disabled = true;
      let secs = 5;
      if (veilCountdown) veilCountdown.textContent = `5-sec test: ${secs}s`;
      announce('5-second test started: ask a partner what catches their eye first.');
      timer = setInterval(() => {
        secs--;
        if (secs > 0) {
          if (veilCountdown) veilCountdown.textContent = `5-sec test: ${secs}s`;
        } else {
          clearInterval(timer);
          timer = null;
          if (veilCountdown) veilCountdown.textContent = '';
          veil.hidden = false;
          if (guides) guides.checked = prevG;
          if (thirds) thirds.checked = prevT;
          render();
          flashBtn.disabled = false;
          revealBtn?.focus();
        }
      }, 1000);
    });
    revealBtn?.addEventListener('click', () => {
      stop();
      announce('Layout revealed. Note what your partner saw first.');
    });
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
        if (el.name === 'thirds' && value === undefined) continue;
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
        let value = project.poster[el.name];
        if (el.name === 'thirds' && value === undefined) value = false;
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
    const name = composition ? String(get('title', '')).toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .slice(0, 60).replace(/^-|-$/g, '') : '';
    return (name || root.dataset.designMode) + extension;
  }

  initTabs();
  initFlashTest();
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
  document.getElementById('export-svg').addEventListener('click', () => download(svgBlob(), filename('.svg')));
  document.getElementById('export-png').addEventListener('click', () => {
    const url = URL.createObjectURL(svgBlob()), img = new Image();
    const name = filename('.png');
    img.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 1200;
      canvas.getContext('2d').drawImage(img, 0, 0, 960, 1200);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => { if (blob) download(blob, name); else status.textContent = 'PNG export failed. Try SVG instead.'; }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); status.textContent = 'PNG export failed. Try SVG instead.'; };
    img.src = url;
  });
  document.getElementById('print-design').addEventListener('click', () => window.print());
  document.getElementById('export-notes').addEventListener('click', () => download(new Blob([notes.value], { type: 'text/plain;charset=utf-8' }), filename('-notes.txt')));
  render();
})();
