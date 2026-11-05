(() => {
  'use strict';

  const studio = document.getElementById('studio-section');
  const preview = document.getElementById('preview-stage');
  const status = studio.querySelector('.th-project-status');
  const fileInput = studio.querySelector('[data-project-file]');
  const action = name => studio.querySelector('[data-action="' + name + '"]');
  const copyFields = [...studio.querySelectorAll('[data-copy]')];
  const settings = [...studio.querySelectorAll('[data-setting]')];
  const previewFields = Object.fromEntries(copyFields.map(field => [
    field.dataset.copy, document.getElementById('pv-' + field.dataset.copy)
  ]));
  const storageKey = 'classroomos:typography-project:v1';
  const version = 1;
  const sampleCopy = Object.fromEntries(Object.entries(previewFields).map(([key, node]) => [
    key, node.textContent.trim()
  ]));
  const defaultSettings = Object.fromEntries(settings.map(field => [
    field.dataset.setting, field.type === 'checkbox' ? field.checked : field.value
  ]));
  let previous = null;
  let revision = 0;

  function readControls() {
    return {
      version,
      copy: Object.fromEntries(copyFields.map(field => [field.dataset.copy, field.value])),
      settings: Object.fromEntries(settings.map(field => [
        field.dataset.setting, field.type === 'checkbox' ? field.checked : field.value
      ]))
    };
  }

  function readProject(data) {
    if (data?.version !== version) throw new Error('Unsupported project version');
    for (const field of copyFields) {
      const value = data.copy?.[field.dataset.copy];
      if (typeof value !== 'string' || value.length > field.maxLength ||
          (field.tagName === 'INPUT' && /[\r\n]/.test(value))) {
        throw new Error('Invalid copy');
      }
    }
    for (const field of settings) {
      const value = data.settings?.[field.dataset.setting];
      if (field.type === 'checkbox') {
        if (typeof value !== 'boolean') throw new Error('Invalid guide setting');
      } else if (field.type === 'range') {
        const number = Number(value);
        const steps = (number - Number(field.min)) / Number(field.step);
        if (typeof value !== 'string' || !value.trim() || !Number.isFinite(number) ||
            number < Number(field.min) || number > Number(field.max) || Math.abs(steps - Math.round(steps)) > 1e-8) {
          throw new Error('Invalid range setting');
        }
      } else if (![...field.options].some(option => option.value === value)) {
        throw new Error('Invalid select setting');
      }
    }
    return data;
  }

  function render(project) {
    let rank = 0;
    for (const [key, node] of Object.entries(previewFields)) {
      node.textContent = project.copy[key];
      const anchor = node.parentElement;
      anchor.hidden = !project.copy[key].trim();
      if (!anchor.hidden) anchor.querySelector('.eye-rank').textContent = ++rank;
    }
    preview.querySelector('.th-empty-preview').hidden = rank > 0;
    action('export').disabled = rank === 0;

    const { pairing, scale, weight, leading, tracking, guide } = project.settings;
    const ratio = Number(scale);
    const base = 16;
    const h3 = base * ratio;
    const h2 = h3 * ratio;
    const h1 = h2 * ratio;
    preview.dataset.pairing = pairing;
    preview.style.setProperty('--th-title-size', h1.toFixed(2) + 'px');
    preview.style.setProperty('--th-title-weight', weight);
    preview.style.setProperty('--th-title-tracking', -Number(tracking) / 2 + 'px');
    preview.style.setProperty('--th-deck-size', h3.toFixed(2) + 'px');
    preview.style.setProperty('--th-deck-leading', Number(leading) * 0.95);
    preview.style.setProperty('--th-body-leading', leading);
    preview.style.setProperty('--th-body-tracking', tracking + 'px');
    preview.classList.toggle('show-heat', guide);

    document.getElementById('leading-val').textContent = leading;
    document.getElementById('tracking-val').textContent = tracking + ' px';
    document.getElementById('scale-h1').textContent = h1.toFixed(2) + ' px';
    document.getElementById('scale-h2').textContent = h2.toFixed(2) + ' px';
    document.getElementById('scale-h3').textContent = h3.toFixed(2) + ' px';
    document.getElementById('scale-caption').textContent = (base / ratio).toFixed(2) + ' px';
  }

  function apply(project) {
    for (const field of copyFields) field.value = project.copy[field.dataset.copy];
    for (const field of settings) {
      const value = project.settings[field.dataset.setting];
      if (field.type === 'checkbox') field.checked = value;
      else field.value = value;
    }
    render(readControls());
  }

  function autosave(project) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(project));
      return true;
    } catch {
      announce('Browser autosave is unavailable. Download a project file to keep editing later.');
      return false;
    }
  }

  function announce(message) {
    if (status.textContent !== message) status.textContent = message;
  }

  function replace(project, message) {
    previous = readControls();
    action('restore').hidden = false;
    revision++;
    apply(project);
    if (autosave(readControls())) status.textContent = message;
  }

  for (const field of [...copyFields, ...settings]) {
    field.addEventListener('input', () => {
      revision++;
      const project = readControls();
      render(project);
      if (autosave(project)) announce('Draft saved in this browser.');
    });
  }

  action('new').addEventListener('click', () => {
    const copy = Object.fromEntries(copyFields.map(field => [field.dataset.copy, '']));
    replace({ copy, settings: defaultSettings }, 'Blank project ready. Restore previous draft brings back your last project.');
    document.getElementById('copy-title').focus();
  });
  action('sample').addEventListener('click', () => {
    replace({ copy: sampleCopy, settings: defaultSettings }, 'Sample loaded. Restore previous draft brings back your last project.');
  });
  action('restore').addEventListener('click', () => replace(previous, 'Previous draft restored.'));

  action('open').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    const openedAt = revision;
    try {
      if (file.size > 64_000) throw new Error('Project file too large');
      const project = readProject(JSON.parse(await file.text()));
      if (revision !== openedAt) {
        status.textContent = 'The draft changed while the file was opening. Open it again to replace the draft.';
        return;
      }
      replace(project, 'Project opened. Restore previous draft brings back your last project.');
    } catch {
      status.textContent = 'Could not open that file. Choose a valid Typography Hierarchy Studio project.';
    }
  });

  function download(suffix, data, type) {
    const name = previewFields.title.textContent.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').slice(0, 60).replace(/^-|-$/g, '') || 'typography-project';
    const url = URL.createObjectURL(new Blob([data], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name + suffix;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  action('save').addEventListener('click', () => {
    download('.typography.json', JSON.stringify(readControls(), null, 2), 'application/json');
    status.textContent = 'Editable project downloaded.';
  });

  action('export').addEventListener('click', () => {
    const doc = document.implementation.createHTMLDocument(previewFields.title.textContent.trim() || 'Typography project');
    doc.documentElement.lang = 'en';
    const charset = doc.createElement('meta');
    charset.setAttribute('charset', 'utf-8');
    const viewport = doc.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1';
    const style = doc.createElement('style');
    style.textContent = document.getElementById('typography-artwork-css').textContent + `
      body { margin: 0; background: #edf1f5 }
      .th-artwork { box-sizing: border-box; max-width: 48rem; margin: 0 auto; padding: clamp(1.25rem, 5vw, 3rem); min-height: 100vh }
    `;
    doc.head.prepend(charset, viewport);
    doc.head.append(style);
    const artwork = doc.createElement('main');
    artwork.className = 'th-artwork';
    artwork.dataset.pairing = preview.dataset.pairing;
    artwork.style.cssText = preview.style.cssText;
    for (const [key, source] of Object.entries(previewFields)) {
      if (source.parentElement.hidden) continue;
      const node = doc.createElement(key === 'title' ? 'h1' : 'p');
      node.className = source.className;
      node.textContent = source.textContent;
      artwork.append(node);
    }
    doc.body.append(artwork);
    download('.html', '<!doctype html>\n' + doc.documentElement.outerHTML, 'text/html;charset=utf-8');
    status.textContent = 'Standalone HTML downloaded.';
  });

  apply({ copy: sampleCopy, settings: defaultSettings });
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) apply(readProject(JSON.parse(saved)));
  } catch {
    status.textContent = 'The browser draft could not be loaded. You can open a saved project file.';
  }
})();
