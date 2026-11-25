(() => {
  'use strict';

  const root = document.querySelector('[data-design-mode="poster-design-project"]');
  if (!root) return;

  const art = document.getElementById('design-art');
  const status = document.getElementById('design-status');
  const notes = document.getElementById('design-notes');
  const projectFile = document.getElementById('poster-project-file');
  const emblemFile = document.getElementById('poster-emblem-file');
  const restoreBtn = document.getElementById('restore-design');
  const contrastOut = document.getElementById('poster-contrast-readout');
  const briefItems = [...root.querySelectorAll('[data-brief-field]')];
  const veil = document.getElementById('poster-veil');
  const veilCountdown = document.getElementById('poster-veil-countdown');
  const veilRecall = document.getElementById('poster-veil-recall');
  const flashBtn = document.getElementById('poster-flash-btn');
  const revealBtn = document.getElementById('poster-reveal-btn');
  const snapshotBtn = document.getElementById('poster-snapshot-btn');
  const compareBtn = document.getElementById('poster-compare-btn');
  const snapshotBox = document.getElementById('poster-snapshot-box');
  const snapshotThumb = document.getElementById('poster-snapshot-thumb');
  const customEmblemOption = root.querySelector('select[name="emblem"] option[value="custom"]');

  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = [...root.querySelectorAll('[role="tabpanel"]')];
  const inputs = [...root.querySelectorAll('.poster-inspector input:not([type="file"]), .poster-inspector select')];

  const storageKey = 'classroomos:poster-project:v1';
  const version = 1;
  const measureCtx = document.createElement('canvas').getContext('2d');
  const ns = 'http://www.w3.org/2000/svg';

  const fontPairings = {
    editorial: {
      display: 'Georgia, "Times New Roman", serif',
      body: 'Arial, Helvetica, sans-serif'
    },
    modern: {
      display: '"Avenir Next", "Trebuchet MS", Arial, Helvetica, sans-serif',
      body: 'Arial, Helvetica, sans-serif'
    },
    technical: {
      display: '"Courier New", Courier, monospace',
      body: 'Arial, Helvetica, sans-serif'
    }
  };

  const palettes = {
    teal: { accent: '#155e75', paper: '#fffaf0', ink: '#172554' },
    terracotta: { accent: '#b45309', paper: '#fdf6ec', ink: '#292524' },
    midnight: { accent: '#d97706', paper: '#0f172a', ink: '#f8fafc' },
    forest: { accent: '#166534', paper: '#f4f7f2', ink: '#14261c' },
    cobalt: { accent: '#1d4ed8', paper: '#f8fafc', ink: '#0f172a' }
  };

  let customEmblem = null;
  let beforeSvg = '';
  let comparingBefore = false;
  let previous = null;
  let revision = 0;
  let flashTimer = null;

  const getVal = (name, fallback = '') => {
    const el = root.querySelector(`[name="${name}"]`);
    if (!el) return fallback;
    return el.type === 'checkbox' ? el.checked : el.value;
  };

  const sampleState = () => ({
    title: 'STEAM SHOWCASE',
    kicker: 'COMMUNITY STEAM EVENT',
    when: 'Practice event · Friday, 4–6 PM',
    where: 'School hall · All families welcome',
    action: 'Explore student projects',
    template: 'classic',
    emblem: 'prism',
    margin: '40',
    size: '38',
    guides: true,
    accent: '#155e75',
    paper: '#fffaf0',
    ink: '#172554',
    pairing: 'editorial'
  });

  function announce(msg) {
    if (status && status.textContent !== msg) status.textContent = msg;
  }

  function hexToRgb(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return [0, 0, 0];
    return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  }

  function relLuminance(rgb) {
    return rgb.map(c => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }).reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
  }

  function contrastRatio(hexA, hexB) {
    const l1 = relLuminance(hexToRgb(hexA));
    const l2 = relLuminance(hexToRgb(hexB));
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function pickContrastOn(bgHex) {
    return contrastRatio('#ffffff', bgHex) >= contrastRatio('#0f172a', bgHex) ? '#ffffff' : '#0f172a';
  }

  function addSvg(tag, attrs = {}, text, parent = art) {
    const node = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== undefined && v !== null) node.setAttribute(k, String(v));
    }
    if (text !== undefined) node.textContent = text;
    parent.append(node);
    return node;
  }

  function wrapText(text, maxWidth, fontSpec) {
    measureCtx.font = fontSpec;
    const lines = [];
    let current = '';
    for (const word of text.trim().split(/\s+/)) {
      if (!word) continue;
      const candidate = current ? `${current} ${word}` : word;
      if (measureCtx.measureText(candidate).width <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      current = '';
      for (const ch of word) {
        if (current && measureCtx.measureText(current + ch).width > maxWidth) {
          lines.push(current);
          current = '';
        }
        current += ch;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function drawWrappedText(copy, opts) {
    const clean = (copy || '').trim();
    if (!clean) return 0;
    const {
      x, y, width, maxHeight, size: startSize, weight, family, fill,
      anchor = 'start', lineRatio = 1.18, tracking = 0, bg = null
    } = opts;
    let size = startSize;
    let lines = [];
    let leading = 0;
    do {
      const fontSpec = `${weight} ${size}px ${family}`;
      lines = wrapText(clean, width, fontSpec);
      leading = Math.ceil(size * lineRatio);
      if (lines.length * leading <= maxHeight) break;
      size -= 1;
    } while (size > 11);

    const attrs = {
      fill,
      'font-family': family,
      'font-size': size,
      'font-weight': weight,
      'text-anchor': anchor
    };
    if (tracking) attrs['letter-spacing'] = `${tracking}px`;
    // SVG text never paints a CSS background, but HTML_CodeSniffer (pa11y) only reads CSS backgrounds,
    // so text drawn on a filled shape names that fill here to be measured against what readers see.
    if (bg) attrs.style = `background-color: ${bg}`;
    const textEl = addSvg('text', attrs);
    lines.forEach((line, i) => {
      addSvg('tspan', { x, y: y + size + i * leading }, line, textEl);
    });
    return lines.length * leading;
  }

  function drawEmblem(x, y, size, accent, paper, ink) {
    const id = getVal('emblem', 'prism');
    if (id === 'none') return;

    const g = addSvg('g', { transform: `translate(${x} ${y})` });
    const fgOnAccent = pickContrastOn(accent);

    if (id === 'custom' && customEmblem) {
      addSvg('rect', { width: size, height: size, rx: Math.round(size * 0.18), fill: accent }, undefined, g);
      const vb = customEmblem.viewBox;
      const pad = size * 0.14;
      const target = size - pad * 2;
      const scale = Math.min(target / vb.w, target / vb.h);
      const tx = pad + (target - vb.w * scale) / 2 - vb.x * scale;
      const ty = pad + (target - vb.h * scale) / 2 - vb.y * scale;
      const inner = addSvg('g', { transform: `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})` }, undefined, g);
      for (const item of customEmblem.elements) {
        const attrs = { ...item.attrs };
        if (!attrs.fill && !attrs.stroke) attrs.fill = fgOnAccent;
        addSvg(item.tag, attrs, undefined, inner);
      }
      return;
    }

    addSvg('rect', { width: size, height: size, rx: Math.round(size * 0.18), fill: accent }, undefined, g);
    const s = size / 72;
    const icon = addSvg('g', { transform: `scale(${s.toFixed(4)})` }, undefined, g);

    if (id === 'prism') {
      addSvg('polygon', { points: '36,12 58,54 14,54', fill: fgOnAccent }, undefined, icon);
      addSvg('polygon', { points: '36,24 47,48 25,48', fill: accent }, undefined, icon);
    } else if (id === 'starburst') {
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8 - Math.PI / 2;
        const r = i % 2 === 0 ? 25 : 11;
        pts.push(`${(36 + Math.cos(a) * r).toFixed(1)},${(36 + Math.sin(a) * r).toFixed(1)}`);
      }
      addSvg('polygon', { points: pts.join(' '), fill: fgOnAccent }, undefined, icon);
      addSvg('circle', { cx: 36, cy: 36, r: 6, fill: accent }, undefined, icon);
    } else if (id === 'gear') {
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8;
        const r = i % 4 < 2 ? 24 : 18;
        pts.push(`${(36 + Math.cos(a) * r).toFixed(1)},${(36 + Math.sin(a) * r).toFixed(1)}`);
      }
      addSvg('polygon', { points: pts.join(' '), fill: fgOnAccent }, undefined, icon);
      addSvg('circle', { cx: 36, cy: 36, r: 8, fill: accent }, undefined, icon);
    } else if (id === 'orbit') {
      addSvg('circle', { cx: 36, cy: 36, r: 9, fill: fgOnAccent }, undefined, icon);
      addSvg('ellipse', { cx: 36, cy: 36, rx: 24, ry: 9, fill: 'none', stroke: fgOnAccent, 'stroke-width': 3.5, transform: 'rotate(-28 36 36)' }, undefined, icon);
      addSvg('ellipse', { cx: 36, cy: 36, rx: 24, ry: 9, fill: 'none', stroke: fgOnAccent, 'stroke-width': 2.5, transform: 'rotate(32 36 36)' }, undefined, icon);
    } else if (id === 'compass') {
      addSvg('circle', { cx: 36, cy: 36, r: 22, fill: 'none', stroke: fgOnAccent, 'stroke-width': 3.5 }, undefined, icon);
      addSvg('polygon', { points: '36,16 42,36 36,56 30,36', fill: fgOnAccent }, undefined, icon);
      addSvg('circle', { cx: 36, cy: 36, r: 3.5, fill: accent }, undefined, icon);
    } else if (id === 'leaf') {
      addSvg('path', { d: 'M18 52 C18 24, 34 14, 56 14 C56 38, 44 54, 18 52 Z', fill: fgOnAccent }, undefined, icon);
      addSvg('path', { d: 'M20 50 L46 24', fill: 'none', stroke: accent, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, undefined, icon);
    }
  }

  function renderPoster() {
    if (comparingBefore && beforeSvg) return;

    const margin = Number(getVal('margin', '40'));
    const headlineSize = Number(getVal('size', '38'));
    const template = getVal('template', 'classic');
    const accent = getVal('accent', '#155e75');
    const paper = getVal('paper', '#fffaf0');
    const ink = getVal('ink', '#172554');
    const pairing = fontPairings[getVal('pairing', 'editorial')] || fontPairings.editorial;
    const guides = Boolean(getVal('guides', true));
    const width = 480 - margin * 2;

    const title = getVal('title', '');
    const kicker = getVal('kicker', '');
    const when = getVal('when', '');
    const where = getVal('where', '');
    const action = getVal('action', '');

    art.replaceChildren();
    addSvg('title', { id: 'poster-art-title' }, title.trim() || 'Live poster preview');
    addSvg('desc', { id: 'poster-art-description' }, [kicker, title, when, where, action].map(s => s.trim()).filter(Boolean).join(' · '));
    addSvg('rect', { width: 480, height: 600, fill: paper });

    if (template === 'classic') {
      drawEmblem(margin, 44, 68, accent, paper, ink);
      drawWrappedText(kicker.toUpperCase(), {
        x: margin + (getVal('emblem') === 'none' ? 0 : 86),
        y: 66,
        width: width - (getVal('emblem') === 'none' ? 0 : 86),
        maxHeight: 40,
        size: 12,
        weight: 700,
        family: pairing.body,
        fill: accent,
        tracking: 1.5
      });
      const headH = drawWrappedText(title, {
        x: margin, y: 142, width, maxHeight: 150, size: headlineSize, weight: 800, family: pairing.display, fill: ink, lineRatio: 1.12
      });
      const ruleY = Math.max(200, 158 + headH);
      addSvg('rect', { x: margin, y: ruleY, width, height: 7, fill: accent });
      const whenH = drawWrappedText(when, {
        x: margin, y: ruleY + 26, width, maxHeight: 68, size: 19, weight: 700, family: pairing.body, fill: ink
      });
      drawWrappedText(where, {
        x: margin, y: ruleY + 26 + (whenH ? whenH + 14 : 0), width, maxHeight: 72, size: 17, weight: 400, family: pairing.body, fill: ink
      });
      addSvg('rect', { x: margin, y: 492, width, height: 54, rx: 8, fill: accent });
      drawWrappedText(action, {
        x: 240, y: 508, width: width - 28, maxHeight: 36, size: 18, weight: 700, family: pairing.body, fill: pickContrastOn(accent), bg: accent, anchor: 'middle'
      });
    } else if (template === 'band') {
      const bandH = 262;
      addSvg('rect', { x: 0, y: 0, width: 480, height: bandH, fill: accent });
      const bandInk = pickContrastOn(accent);
      drawEmblem(480 - margin - 62, 34, 62, paper, accent, ink);
      drawWrappedText(kicker.toUpperCase(), {
        x: margin, y: 42, width: width - 78, maxHeight: 34, size: 12, weight: 700, family: pairing.body, fill: bandInk, bg: accent, tracking: 1.4
      });
      drawWrappedText(title, {
        x: margin, y: 92, width, maxHeight: 148, size: headlineSize, weight: 800, family: pairing.display, fill: bandInk, bg: accent, lineRatio: 1.12
      });
      const whenH = drawWrappedText(when, {
        x: margin, y: bandH + 34, width, maxHeight: 70, size: 20, weight: 700, family: pairing.body, fill: ink
      });
      drawWrappedText(where, {
        x: margin, y: bandH + 34 + (whenH ? whenH + 16 : 0), width, maxHeight: 75, size: 17, weight: 400, family: pairing.body, fill: ink
      });
      addSvg('line', { x1: margin, x2: 480 - margin, y1: 484, y2: 484, stroke: accent, 'stroke-width': 3 });
      drawWrappedText(action, {
        x: margin, y: 502, width, maxHeight: 54, size: 20, weight: 800, family: pairing.display, fill: accent
      });
    } else if (template === 'split') {
      const railW = Math.max(96, margin + 62);
      addSvg('rect', { x: 0, y: 0, width: railW, height: 600, fill: accent });
      drawEmblem(Math.round((railW - 58) / 2), 46, 58, paper, accent, ink);
      const colX = railW + 24;
      const colW = 480 - colX - margin;
      drawWrappedText(kicker.toUpperCase(), {
        x: colX, y: 48, width: colW, maxHeight: 34, size: 11, weight: 700, family: pairing.body, fill: accent, tracking: 1.4
      });
      const headH = drawWrappedText(title, {
        x: colX, y: 92, width: colW, maxHeight: 170, size: Math.min(headlineSize, 36), weight: 800, family: pairing.display, fill: ink, lineRatio: 1.12
      });
      const ruleY = Math.max(210, 108 + headH);
      addSvg('rect', { x: colX, y: ruleY, width: Math.min(90, colW), height: 6, fill: accent });
      const whenH = drawWrappedText(when, {
        x: colX, y: ruleY + 26, width: colW, maxHeight: 72, size: 18, weight: 700, family: pairing.body, fill: ink
      });
      drawWrappedText(where, {
        x: colX, y: ruleY + 26 + (whenH ? whenH + 14 : 0), width: colW, maxHeight: 80, size: 16, weight: 400, family: pairing.body, fill: ink
      });
      addSvg('rect', { x: colX, y: 492, width: colW, height: 50, rx: 6, fill: accent });
      drawWrappedText(action, {
        x: colX + colW / 2, y: 507, width: colW - 20, maxHeight: 34, size: 16, weight: 700, family: pairing.body, fill: pickContrastOn(accent), bg: accent, anchor: 'middle'
      });
    } else if (template === 'centered') {
      addSvg('rect', { x: 18, y: 18, width: 444, height: 564, fill: 'none', stroke: accent, 'stroke-width': 3 });
      drawEmblem(206, 42, 68, accent, paper, ink);
      drawWrappedText(kicker.toUpperCase(), {
        x: 240, y: 126, width: width - 16, maxHeight: 30, size: 12, weight: 700, family: pairing.body, fill: accent, anchor: 'middle', tracking: 1.6
      });
      const headH = drawWrappedText(title, {
        x: 240, y: 160, width: width - 16, maxHeight: 150, size: headlineSize, weight: 800, family: pairing.display, fill: ink, anchor: 'middle', lineRatio: 1.12
      });
      const ruleY = Math.max(225, 174 + headH);
      addSvg('rect', { x: 180, y: ruleY, width: 120, height: 5, fill: accent });
      const whenH = drawWrappedText(when, {
        x: 240, y: ruleY + 24, width: width - 20, maxHeight: 68, size: 18, weight: 700, family: pairing.body, fill: ink, anchor: 'middle'
      });
      drawWrappedText(where, {
        x: 240, y: ruleY + 24 + (whenH ? whenH + 12 : 0), width: width - 20, maxHeight: 72, size: 16, weight: 400, family: pairing.body, fill: ink, anchor: 'middle'
      });
      addSvg('rect', { x: margin + 20, y: 492, width: width - 40, height: 50, rx: 999, fill: accent });
      drawWrappedText(action, {
        x: 240, y: 507, width: width - 64, maxHeight: 32, size: 17, weight: 700, family: pairing.body, fill: pickContrastOn(accent), bg: accent, anchor: 'middle'
      });
    }

    if (guides) {
      addSvg('rect', {
        'data-guide': 'true', x: margin, y: 24, width, height: 552,
        fill: 'none', stroke: '#be123c', 'stroke-width': 1, 'stroke-dasharray': '6 6'
      });
      addSvg('line', {
        'data-guide': 'true', x1: 240, x2: 240, y1: 16, y2: 584,
        stroke: '#be123c', 'stroke-width': 0.8, 'stroke-dasharray': '3 6', opacity: 0.65
      });
    }

    root.querySelectorAll('[data-slider-value]').forEach(out => {
      const input = out.closest('label')?.querySelector('input[type="range"]');
      if (input) out.textContent = `${input.value} px`;
    });

    updateReadouts(paper, ink, accent, { title, when, where, action });
  }

  function updateReadouts(paper, ink, accent, copy) {
    if (contrastOut) {
      const ratio = contrastRatio(ink, paper);
      const accentRatio = contrastRatio(accent, paper);
      const level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA Large only' : 'Low contrast';
      contrastOut.textContent = `Ink/Paper ${ratio.toFixed(1)}:1 (${level}) · Accent ${accentRatio.toFixed(1)}:1`;
      contrastOut.dataset.grade = ratio >= 4.5 ? 'pass' : 'warn';
    }
    for (const pill of briefItems) {
      const key = pill.dataset.briefField;
      const ok = Boolean((copy[key] || '').trim());
      pill.dataset.complete = String(ok);
    }
  }

  function snapshot() {
    const poster = Object.fromEntries(inputs.map(el => [
      el.name, el.type === 'checkbox' ? el.checked : el.value
    ]));
    return {
      version,
      poster,
      customEmblem,
      notes: notes ? notes.value : ''
    };
  }

  function validate(data) {
    if (!data || data.version !== version || typeof data.notes !== 'string') {
      throw new Error('Invalid project');
    }
    if (notes && data.notes.length > notes.maxLength) throw new Error('Notes too long');
    for (const el of inputs) {
      const v = data.poster?.[el.name];
      if (el.type === 'checkbox') {
        if (typeof v !== 'boolean') throw new Error(`Invalid ${el.name}`);
        continue;
      }
      if (typeof v !== 'string') throw new Error(`Invalid ${el.name}`);
      if (el.type === 'range') {
        const n = Number(v);
        if (!Number.isFinite(n) || n < Number(el.min) || n > Number(el.max)) throw new Error(`Invalid ${el.name}`);
      } else if (el.type === 'color') {
        if (!/^#[0-9a-f]{6}$/i.test(v)) throw new Error(`Invalid ${el.name}`);
      } else if (el.tagName === 'SELECT') {
        if (el.name === 'emblem' && v === 'custom') continue;
        if (![...el.options].some(o => o.value === v)) throw new Error(`Invalid ${el.name}`);
      } else if (v.length > el.maxLength || /[\r\n]/.test(v)) {
        throw new Error(`Invalid ${el.name}`);
      }
    }
    return data;
  }

  function apply(data) {
    customEmblem = data.customEmblem || null;
    if (customEmblemOption) customEmblemOption.disabled = !customEmblem;
    for (const el of inputs) {
      const v = data.poster[el.name];
      if (el.type === 'checkbox') el.checked = v;
      else el.value = v;
    }
    if (notes) notes.value = data.notes;
    comparingBefore = false;
    renderPoster();
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

  function replace(data, message) {
    previous = snapshot();
    if (restoreBtn) restoreBtn.hidden = false;
    revision++;
    apply(data);
    if (autosave()) announce(message);
  }

  function filename(ext) {
    const slug = getVal('title', 'poster').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60).replace(/^-|-$/g, '');
    return (slug || 'poster-design') + ext;
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    announce(`Downloaded ${name}.`);
  }

  function svgString(stripGuides = true) {
    const clone = art.cloneNode(true);
    if (stripGuides) clone.querySelectorAll('[data-guide]').forEach(el => el.remove());
    clone.setAttribute('width', '480');
    clone.setAttribute('height', '600');
    return new XMLSerializer().serializeToString(clone);
  }

  function svgBlob() {
    return new Blob([svgString(true)], { type: 'image/svg+xml;charset=utf-8' });
  }

  function sanitizeUploadedSvg(text) {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const svgEl = doc.documentElement;
    if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) {
      throw new Error('Not a valid SVG file');
    }
    const allowedTags = new Set(['path', 'circle', 'rect', 'ellipse', 'polygon', 'polyline', 'line']);
    const allowedAttrs = new Set(['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'points', 'x1', 'y1', 'x2', 'y2', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform']);
    const vbRaw = (svgEl.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    const wAttr = parseFloat(svgEl.getAttribute('width')) || 100;
    const hAttr = parseFloat(svgEl.getAttribute('height')) || 100;
    const viewBox = vbRaw.length === 4 && vbRaw.every(Number.isFinite) && vbRaw[2] > 0 && vbRaw[3] > 0
      ? { x: vbRaw[0], y: vbRaw[1], w: vbRaw[2], h: vbRaw[3] }
      : { x: 0, y: 0, w: wAttr, h: hAttr };

    const elements = [];
    for (const node of svgEl.querySelectorAll('*')) {
      const tag = node.tagName.toLowerCase();
      if (!allowedTags.has(tag)) continue;
      const attrs = {};
      for (const attr of node.attributes) {
        const name = attr.name.toLowerCase();
        if (!allowedAttrs.has(name)) continue;
        if (/url\(|javascript:|data:/i.test(attr.value)) continue;
        attrs[name] = attr.value;
      }
      if (attrs.fill === 'none' && !attrs.stroke) continue;
      elements.push({ tag, attrs });
      if (elements.length >= 120) break;
    }
    if (!elements.length) throw new Error('No drawable SVG geometry found');
    return { viewBox, elements };
  }

  function activateTab(tab) {
    const targetId = tab.getAttribute('aria-controls');
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    }
    for (const p of panels) {
      p.hidden = p.id !== targetId;
    }
  }

  tabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      activateTab(next);
      next.focus();
    });
  });

  inputs.forEach(el => {
    el.addEventListener('input', () => {
      comparingBefore = false;
      if (compareBtn) compareBtn.setAttribute('aria-pressed', 'false');
      revision++;
      renderPoster();
      if (autosave()) announce('Draft saved in this browser.');
    });
  });

  notes?.addEventListener('input', () => {
    revision++;
    autosave();
  });

  root.querySelectorAll('[data-palette]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = palettes[btn.dataset.palette];
      if (!p) return;
      for (const [k, v] of Object.entries(p)) {
        const input = root.querySelector(`[name="${k}"]`);
        if (input) input.value = v;
      }
      comparingBefore = false;
      revision++;
      renderPoster();
      if (autosave()) announce(`Applied ${btn.textContent.trim()} palette.`);
    });
  });

  document.getElementById('new-design')?.addEventListener('click', () => {
    const blank = { ...sampleState(), title: '', kicker: '', when: '', where: '', action: '' };
    replace({ version, poster: blank, customEmblem: null, notes: '' }, 'Blank poster ready. Restore brings back your previous draft.');
    activateTab(tabs[0]);
    root.querySelector('input[name="title"]')?.focus();
  });

  document.getElementById('reset-design')?.addEventListener('click', () => {
    replace({ version, poster: sampleState(), customEmblem: null, notes: notes ? notes.value : '' }, 'Sample poster loaded. Your critique notes were kept.');
  });

  restoreBtn?.addEventListener('click', () => {
    if (previous) replace(previous, 'Previous draft restored.');
  });

  document.getElementById('save-design')?.addEventListener('click', () => {
    download(new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' }), filename('.poster.json'));
  });

  document.getElementById('open-design')?.addEventListener('click', () => projectFile?.click());

  projectFile?.addEventListener('change', async () => {
    const f = projectFile.files[0];
    projectFile.value = '';
    if (!f) return;
    const started = revision;
    try {
      if (f.size > 200_000) throw new Error('File too large');
      const data = validate(JSON.parse(await f.text()));
      if (started !== revision) {
        announce('Draft changed while opening file. Try opening again.');
        return;
      }
      replace(data, 'Poster project opened.');
    } catch {
      announce('Could not open that file. Choose a valid Poster Design project JSON.');
    }
  });

  document.getElementById('poster-import-emblem')?.addEventListener('click', () => emblemFile?.click());
  emblemFile?.addEventListener('change', async () => {
    const f = emblemFile.files[0];
    emblemFile.value = '';
    if (!f) return;
    try {
      if (f.size > 200_000) throw new Error('SVG too large');
      customEmblem = sanitizeUploadedSvg(await f.text());
      if (customEmblemOption) customEmblemOption.disabled = false;
      const select = root.querySelector('select[name="emblem"]');
      if (select) select.value = 'custom';
      revision++;
      renderPoster();
      if (autosave()) announce('Custom SVG emblem imported into poster.');
    } catch {
      announce('Could not import that SVG. Use simple vector shapes exported from Vector Drawing Studio.');
    }
  });

  document.getElementById('export-svg')?.addEventListener('click', () => {
    download(svgBlob(), filename('.svg'));
  });

  document.getElementById('export-png')?.addEventListener('click', () => {
    const url = URL.createObjectURL(svgBlob());
    const img = new Image();
    const outName = filename('.png');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 1200;
      canvas.getContext('2d').drawImage(img, 0, 0, 960, 1200);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        if (blob) download(blob, outName);
        else announce('PNG export failed. Try SVG instead.');
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      announce('PNG export failed. Try SVG instead.');
    };
    img.src = url;
  });

  document.getElementById('print-design')?.addEventListener('click', () => window.print());

  document.getElementById('export-notes')?.addEventListener('click', () => {
    download(new Blob([notes?.value || ''], { type: 'text/plain;charset=utf-8' }), filename('-notes.txt'));
  });

  function stopFlashTest() {
    clearInterval(flashTimer);
    flashTimer = null;
    if (veil) veil.hidden = true;
    if (veilRecall) veilRecall.hidden = true;
    if (veilCountdown) veilCountdown.textContent = '';
    if (flashBtn) flashBtn.disabled = false;
  }

  flashBtn?.addEventListener('click', () => {
    if (!veil) return;
    stopFlashTest();
    const guideBox = root.querySelector('[name="guides"]');
    const prevGuides = guideBox ? guideBox.checked : false;
    if (guideBox) guideBox.checked = false;
    renderPoster();
    flashBtn.disabled = true;
    let remaining = 5;
    if (veilCountdown) veilCountdown.textContent = `5-sec test: ${remaining}s`;
    announce('5-second audience test running: ask your partner what they see first.');
    flashTimer = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        if (veilCountdown) veilCountdown.textContent = `5-sec test: ${remaining}s`;
      } else {
        clearInterval(flashTimer);
        flashTimer = null;
        if (veilCountdown) veilCountdown.textContent = '';
        veil.hidden = false;
        if (veilRecall) veilRecall.hidden = false;
        if (guideBox) guideBox.checked = prevGuides;
        renderPoster();
        flashBtn.disabled = false;
        revealBtn?.focus();
      }
    }, 1000);
  });

  revealBtn?.addEventListener('click', () => {
    stopFlashTest();
    announce('Poster revealed. Record what your partner recalled below.');
  });

  snapshotBtn?.addEventListener('click', () => {
    beforeSvg = svgString(true);
    if (snapshotBox) snapshotBox.hidden = false;
    if (snapshotThumb) {
      snapshotThumb.innerHTML = beforeSvg;
      const svg = snapshotThumb.querySelector('svg');
      if (svg) {
        svg.removeAttribute('width');
        svg.removeAttribute('height');
      }
    }
    if (compareBtn) {
      compareBtn.disabled = false;
      compareBtn.setAttribute('aria-pressed', 'false');
    }
    announce('Saved "Before" snapshot. Now revise one choice and compare.');
  });

  compareBtn?.addEventListener('click', () => {
    if (!beforeSvg) return;
    comparingBefore = !comparingBefore;
    compareBtn.setAttribute('aria-pressed', String(comparingBefore));
    if (comparingBefore) {
      const parsed = new DOMParser().parseFromString(beforeSvg, 'image/svg+xml').documentElement;
      art.replaceChildren(...[...parsed.childNodes].map(n => document.importNode(n, true)));
      announce('Viewing "Before" snapshot. Click again to return to your current version.');
    } else {
      renderPoster();
      announce('Viewing current revised poster.');
    }
  });

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) apply(validate(JSON.parse(saved)));
    else renderPoster();
  } catch {
    renderPoster();
  }
})();
