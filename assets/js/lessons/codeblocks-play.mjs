import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import {
  DEFAULT_PRINTER,
  printerFit,
  prepareForPrint,
  writeBinaryStl,
  write3mf
} from '../fab-io.mjs';
import { sendAndOpen } from '../handoff.mjs';
import {
  STARTERS,
  SHAPE_TYPES,
  SHAPE_FIELDS,
  compile,
  expression,
  parseBlocks,
  serializeBlocks
} from './codeblocks-play-model.mjs';

const $ = (id) => document.getElementById('xp-' + id);
const editor = $('code');
const statusEl = $('status');
const canvas = $('canvas');
const undoBtn = $('undo');
const redoBtn = $('redo');
const blocksEl = $('blocks');
const blocksWrap = $('blocks-wrap');
const loopBadge = $('loop-badge');
const modeBlocksBtn = $('mode-blocks');
const modeCodeBtn = $('mode-code');
const playBtn = $('play');
const speedBtn = $('speed');
const wireBtn = $('wire');
const axesBtn = $('axes');
const dimsEl = $('dims');
const paletteTabsEl = $('palette-tabs');
const operatorsEl = $('operators');

const DRAFT_KEY = 'classroomos.codeblocks-play.v1';
const controlsSpec = {
  count: ['Repeats', 1, 60, 1],
  twist: ['Twist °', -180, 180, 0.5],
  rise: ['Rise / repeat', -6, 10, 0.5],
  radius: ['Reach', 0, 40, 0.5],
  size: ['Shape size', 1, 12, 0.5]
};

const PALETTE = {
  shapes: {
    label: 'Shapes',
    color: '#0e7490',
    items: [
      ['Box', 'w · d · h block', 'box 0 0 size/2 size size size 0 0 0 190'],
      ['Sphere', 'ellipsoid', 'sphere radius 0 i*rise+size size size size 0 i*twist 0 i*12'],
      ['Cylinder', 'round column', 'cylinder 0 0 i*rise+size/2 size size size 0 0 0 30'],
      ['Cone', 'tapered spire', 'cone 0 0 i*rise+size/2 size size size*1.5 0 0 0 35'],
      ['Torus', 'donut ring', 'torus radius 0 i*rise+size/2 size*2 size*2 size 90 i*twist 0 i*20'],
      ['Hex Prism', '6-sided column', 'prism 0 0 i*rise+size/2 size size size*1.4 0 i*twist 0 210'],
      ['Hollow Tube', 'pipe or sleeve', 'tube 0 0 i*rise+size/2 size*1.8 size*1.8 size 0 0 0 170']
    ]
  },
  modify: {
    label: 'Modify',
    color: '#6d28d9',
    items: [
      ['Move', 'offset X · Y · Z', 'move 0 0 i*rise'],
      ['Rotate', 'local X · Y · Z deg', 'rotate 0 0 i*twist'],
      ['Scale', 'X · Y · Z multipliers', 'scale 1 1 1.5'],
      ['Set color', 'hue angle (0–360)', 'color i*20']
    ]
  },
  data: {
    label: 'Data',
    color: '#15803d',
    items: [
      ['Create variable', 'let name formula', 'let angle i*twist'],
      ['Change variable', 'add to variable', 'change angle 5'],
      ['i (counter)', '0, 1, 2…', 'i', true],
      ['radius', 'reach slider', 'radius', true],
      ['size', 'size slider', 'size', true],
      ['sin(i*twist)', 'sine wave', 'sin(i*twist)', true],
      ['cos(i*twist)', 'cosine wave', 'cos(i*twist)', true],
      ['(radius+size)/2', 'midpoint', '(radius+size)/2', true]
    ]
  }
};

const SHAPE_LABELS = {
  box: 'Box',
  sphere: 'Sphere',
  cylinder: 'Cylinder',
  cone: 'Cone',
  torus: 'Torus',
  prism: 'Hex Prism',
  tube: 'Tube'
};

const FIELD_LABELS = ['X', 'Y', 'Z', 'W', 'D', 'H', 'Tilt', 'Orbit', 'Lean', 'Hue'];
const PRIMARY_FIELD_INDICES = [0, 1, 2, 3, 4, 5, 7, 9];
const TILT_FIELD_INDICES = [6, 8];
const MODIFY_FIELD_LABELS = {
  move: ['X', 'Y', 'Z'],
  rotate: ['X', 'Y', 'Z'],
  scale: ['X', 'Y', 'Z'],
  color: ['Hue']
};

const SPEEDS = [1, 2, 4];
const SPEED_MS = [280, 130, 60];

let world, orbit, model, gridHelper, axesHelper;
let built = [];
let visible = 0;
let timer = null;
let playTimer = null;
let playing = false;
let speedIdx = 0;
let wireframe = false;
let axesVisible = true;
let activeView = 'perspective';
let activeCategory = 'shapes';
let editorMode = 'blocks';
let blocksState = [];
let selectedBlockIndex = -1;
let inspectedLine = null;
let lastFocusedExprInput = null;
let pointerDownPos = null;

const undoStack = [];
const redoStack = [];
let currentSnap = null;

function params() {
  return Object.fromEntries(Object.keys(controlsSpec).map((k) => [k, Number($('param-' + k).value)]));
}

for (const [k, [label, min, max, step]] of Object.entries(controlsSpec)) {
  const wrap = document.createElement('label');
  const head = document.createElement('span');
  head.className = 'xp-param-head';
  const title = document.createElement('span');
  title.textContent = label;
  const output = document.createElement('output');
  output.id = 'xp-out-' + k;
  const input = document.createElement('input');
  input.id = 'xp-param-' + k;
  input.type = 'range';
  Object.assign(input, { min, max, step });
  output.htmlFor = input.id;
  input.addEventListener('input', () => {
    stopPlay();
    syncOutputs();
    updateLoopBadge();
    schedule();
  });
  head.append(title, output);
  wrap.append(head, input);
  $('parameters').append(wrap);
}

function syncOutputs() {
  for (const [k, v] of Object.entries(params())) $('out-' + k).textContent = v;
}

function updateLoopBadge() {
  if (!loopBadge) return;
  const n = params().count;
  loopBadge.textContent = `Repeat ${n} ${n === 1 ? 'time' : 'times'} · i = 0 … ${n - 1}`;
}

function makeSnapshot() {
  return JSON.stringify({ code: editor.value, params: params() });
}

function updateHistoryButtons() {
  if (undoBtn) undoBtn.disabled = undoStack.length === 0;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

function commitHistory(snap) {
  if (currentSnap && currentSnap !== snap) {
    undoStack.push(currentSnap);
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0;
  }
  currentSnap = snap;
  updateHistoryButtons();
}

function applySnapshot(raw) {
  stopPlay();
  const s = JSON.parse(raw);
  editor.value = s.code;
  for (const k of Object.keys(controlsSpec)) $('param-' + k).value = s.params[k];
  syncOutputs();
  updateLoopBadge();
  currentSnap = raw;
  updateHistoryButtons();
  blocksState = parseBlocks(editor.value);
  if (editorMode === 'blocks') renderBlocks();
  run({ record: false });
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, ...params(), code: editor.value }));
  } catch (_) {}
}

function previewHue(exprText, idx) {
  try {
    const vars = { ...params(), i: 0 };
    for (let k = 0; k < idx; k++) {
      const b = blocksState[k];
      if (b?.kind === 'data') {
        const val = expression(b.args[1], vars);
        vars[b.args[0]] = (b.op === 'change' ? (vars[b.args[0]] || 0) : 0) + val;
      }
    }
    const h = expression(exprText, vars);
    const wrapped = ((h % 360) + 360) % 360;
    return `hsl(${wrapped}, 68%, 50%)`;
  } catch (_) {
    return '#64748b';
  }
}

function syncCodeFromBlocks({ immediate = false } = {}) {
  editor.value = serializeBlocks(blocksState);
  blocksState.forEach((b, i) => {
    b.line = i + 1;
  });
  if (immediate) run();
  else schedule();
}

function selectBlock(idx) {
  selectedBlockIndex = idx;
  if (blocksEl) {
    blocksEl.querySelectorAll('.xp-block').forEach((node) => {
      const match = Number(node.dataset.blockIndex) === idx;
      node.classList.toggle('is-selected', match);
    });
  }
  const block = blocksState[idx];
  inspectedLine = block ? block.line : null;
  applyHighlight();
}

function renderBlocks() {
  if (!blocksEl) return;
  blocksState = parseBlocks(editor.value);
  blocksEl.replaceChildren();
  if (!blocksState.length) {
    const empty = document.createElement('p');
    empty.className = 'xp-blocks-empty';
    empty.textContent = 'No blocks yet. Pick a shape from the palette to begin.';
    blocksEl.append(empty);
    return;
  }

  blocksState.forEach((block, idx) => {
    const card = document.createElement('div');
    card.className = 'xp-block';
    card.dataset.kind = block.kind;
    card.dataset.blockIndex = String(idx);
    if (idx === selectedBlockIndex) card.classList.add('is-selected');

    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      selectBlock(idx);
    });

    const head = document.createElement('div');
    head.className = 'xp-block-head';

    let swatchEl = null;
    if (block.kind === 'shape') {
      const sel = document.createElement('select');
      sel.className = 'xp-op-select';
      sel.setAttribute('aria-label', `Block ${idx + 1} shape type`);
      for (const st of SHAPE_TYPES) {
        const opt = document.createElement('option');
        opt.value = st;
        opt.textContent = SHAPE_LABELS[st] || st;
        if (st === block.op) opt.selected = true;
        sel.append(opt);
      }
      sel.addEventListener('change', () => {
        stopPlay();
        block.op = sel.value;
        selectedBlockIndex = idx;
        syncCodeFromBlocks({ immediate: true });
      });
      head.append(sel);

      swatchEl = document.createElement('span');
      swatchEl.className = 'xp-swatch';
      swatchEl.title = 'Preview hue (i = 0)';
      swatchEl.style.background = previewHue(block.args[9], idx);
      head.append(swatchEl);
    } else if (block.kind === 'modify') {
      const badge = document.createElement('span');
      badge.className = 'xp-op-badge';
      badge.textContent = block.op === 'color' ? 'Set color' : block.op[0].toUpperCase() + block.op.slice(1);
      head.append(badge);
      if (block.op === 'color') {
        swatchEl = document.createElement('span');
        swatchEl.className = 'xp-swatch';
        swatchEl.title = 'Preview hue (i = 0)';
        swatchEl.style.background = previewHue(block.args[0], idx);
        head.append(swatchEl);
      }
    } else if (block.kind === 'data') {
      const badge = document.createElement('span');
      badge.className = 'xp-op-badge';
      badge.textContent = block.op === 'let' ? 'Let' : 'Change';
      head.append(badge);
    } else if (block.kind === 'comment') {
      const badge = document.createElement('span');
      badge.className = 'xp-op-badge';
      badge.textContent = '# Note';
      head.append(badge);
    } else {
      const badge = document.createElement('span');
      badge.className = 'xp-op-badge';
      badge.textContent = 'Text';
      head.append(badge);
    }

    const actions = document.createElement('div');
    actions.className = 'xp-block-actions';

    let tiltToggle = null;
    let tiltRow = null;
    if (block.kind === 'shape') {
      const hasTilt = block.args[6] !== '0' || block.args[8] !== '0';
      tiltToggle = document.createElement('button');
      tiltToggle.type = 'button';
      tiltToggle.className = 'xp-mini-btn xp-tilt-btn';
      tiltToggle.textContent = 'Tilt/Lean';
      tiltToggle.setAttribute('aria-expanded', String(hasTilt));
      tiltToggle.title = 'Toggle tilt and lean angles';
      actions.append(tiltToggle);
    }

    const mkAction = (symbol, label, disabled, onClick) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'xp-mini-btn';
      btn.textContent = symbol;
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.disabled = disabled;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
      });
      return btn;
    };

    actions.append(
      mkAction('↑', `Move block ${idx + 1} up`, idx === 0, () => {
        stopPlay();
        [blocksState[idx - 1], blocksState[idx]] = [blocksState[idx], blocksState[idx - 1]];
        selectedBlockIndex = idx - 1;
        syncCodeFromBlocks({ immediate: true });
        renderBlocks();
      }),
      mkAction('↓', `Move block ${idx + 1} down`, idx === blocksState.length - 1, () => {
        stopPlay();
        [blocksState[idx], blocksState[idx + 1]] = [blocksState[idx + 1], blocksState[idx]];
        selectedBlockIndex = idx + 1;
        syncCodeFromBlocks({ immediate: true });
        renderBlocks();
      }),
      mkAction('⧉', `Duplicate block ${idx + 1}`, false, () => {
        stopPlay();
        const clone = { ...block, args: [...block.args] };
        blocksState.splice(idx + 1, 0, clone);
        selectedBlockIndex = idx + 1;
        syncCodeFromBlocks({ immediate: true });
        renderBlocks();
      }),
      mkAction('×', `Remove block ${idx + 1}`, false, () => {
        stopPlay();
        blocksState.splice(idx, 1);
        if (selectedBlockIndex >= blocksState.length) selectedBlockIndex = blocksState.length - 1;
        syncCodeFromBlocks({ immediate: true });
        renderBlocks();
      })
    );

    head.append(actions);
    card.append(head);

    const makePill = (labelText, value, onInput, ariaLabel, wide = false) => {
      const pill = document.createElement('label');
      pill.className = 'xp-pill' + (wide ? ' xp-pill-wide' : '');
      const span = document.createElement('span');
      span.textContent = labelText;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      input.spellcheck = false;
      input.setAttribute('aria-label', ariaLabel);
      input.size = Math.max(3, Math.min(18, String(value).length + 1));
      input.addEventListener('focus', () => {
        lastFocusedExprInput = input;
        selectBlock(idx);
      });
      input.addEventListener('input', () => {
        stopPlay();
        input.size = Math.max(3, Math.min(18, input.value.length + 1));
        onInput(input.value.trim());
      });
      pill.append(span, input);
      return pill;
    };

    if (block.kind === 'shape') {
      const fields = document.createElement('div');
      fields.className = 'xp-block-fields';
      for (const fi of PRIMARY_FIELD_INDICES) {
        const fname = FIELD_LABELS[fi];
        fields.append(
          makePill(
            fname,
            block.args[fi],
            (val) => {
              block.args[fi] = val || '0';
              if (fi === 9 && swatchEl) swatchEl.style.background = previewHue(block.args[9], idx);
              syncCodeFromBlocks();
            },
            `${SHAPE_LABELS[block.op] || block.op} ${SHAPE_FIELDS[fi]}`
          )
        );
      }
      card.append(fields);

      tiltRow = document.createElement('div');
      tiltRow.className = 'xp-block-fields xp-tilt-row';
      const hasTilt = block.args[6] !== '0' || block.args[8] !== '0';
      tiltRow.hidden = !hasTilt;
      for (const fi of TILT_FIELD_INDICES) {
        const fname = FIELD_LABELS[fi];
        tiltRow.append(
          makePill(
            fname,
            block.args[fi],
            (val) => {
              block.args[fi] = val || '0';
              syncCodeFromBlocks();
            },
            `${SHAPE_LABELS[block.op] || block.op} ${SHAPE_FIELDS[fi]}`
          )
        );
      }
      tiltToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = tiltRow.hidden;
        tiltRow.hidden = !open;
        tiltToggle.setAttribute('aria-expanded', String(open));
      });
      card.append(tiltRow);
    } else if (block.kind === 'modify') {
      const fields = document.createElement('div');
      fields.className = 'xp-block-fields';
      const labels = MODIFY_FIELD_LABELS[block.op] || [];
      labels.forEach((lbl, ai) => {
        fields.append(
          makePill(
            lbl,
            block.args[ai],
            (val) => {
              block.args[ai] = val || '0';
              if (block.op === 'color' && swatchEl) swatchEl.style.background = previewHue(block.args[0], idx);
              syncCodeFromBlocks();
            },
            `${block.op} ${lbl}`
          )
        );
      });
      card.append(fields);
    } else if (block.kind === 'data') {
      const fields = document.createElement('div');
      fields.className = 'xp-block-fields';
      fields.append(
        makePill(
          'Var',
          block.args[0],
          (val) => {
            block.args[0] = val || 'angle';
            syncCodeFromBlocks();
          },
          `${block.op} variable name`
        ),
        makePill(
          block.op === 'let' ? '=' : '+=',
          block.args[1],
          (val) => {
            block.args[1] = val || '0';
            syncCodeFromBlocks();
          },
          `${block.op} formula`,
          true
        )
      );
      card.append(fields);
    } else if (block.kind === 'comment') {
      const fields = document.createElement('div');
      fields.className = 'xp-block-fields';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'xp-raw-input';
      input.value = block.comment;
      input.placeholder = 'Write a note…';
      input.setAttribute('aria-label', 'Comment note');
      input.addEventListener('input', () => {
        stopPlay();
        block.comment = input.value;
        syncCodeFromBlocks();
      });
      fields.append(input);
      card.append(fields);
    } else {
      const fields = document.createElement('div');
      fields.className = 'xp-block-fields';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'xp-raw-input';
      input.value = block.raw;
      input.spellcheck = false;
      input.setAttribute('aria-label', 'Raw program line');
      input.addEventListener('input', () => {
        stopPlay();
        block.raw = input.value;
        syncCodeFromBlocks();
      });
      fields.append(input);
      card.append(fields);
    }

    blocksEl.append(card);
  });
}

function setMode(mode) {
  editorMode = mode;
  const isBlocks = mode === 'blocks';
  if (modeBlocksBtn) modeBlocksBtn.setAttribute('aria-pressed', String(isBlocks));
  if (modeCodeBtn) modeCodeBtn.setAttribute('aria-pressed', String(!isBlocks));
  if (blocksWrap) blocksWrap.hidden = !isBlocks;
  if (editor) editor.hidden = isBlocks;
  if (isBlocks) {
    renderBlocks();
  } else {
    editor.focus();
  }
}

function renderPaletteTabs() {
  if (!paletteTabsEl || !operatorsEl) return;
  paletteTabsEl.replaceChildren();
  for (const [catKey, cat] of Object.entries(PALETTE)) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = 'xp-tab-' + catKey;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(catKey === activeCategory));
    tab.setAttribute('aria-controls', 'xp-operators');
    tab.textContent = cat.label;
    tab.style.setProperty('--tab-color', cat.color);
    tab.addEventListener('click', () => {
      activeCategory = catKey;
      renderPaletteTabs();
      renderOperators();
    });
    paletteTabsEl.append(tab);
  }
}

function insertTextIntoField(field, text) {
  const a = field.selectionStart ?? field.value.length;
  const b = field.selectionEnd ?? field.value.length;
  field.setRangeText(text, a, b, 'end');
  field.focus();
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

function insertOperator(text, inline = false) {
  stopPlay();
  if (inline) {
    if (editorMode === 'blocks') {
      if (lastFocusedExprInput && lastFocusedExprInput.isConnected) {
        insertTextIntoField(lastFocusedExprInput, text);
        return;
      }
      statusEl.textContent = `Click a formula pill in a block first, then click "${text}" to insert it.`;
      return;
    }
    insertTextIntoField(editor, text);
    return;
  }

  if (editorMode === 'blocks') {
    const parsed = parseBlocks(text);
    const insertAt = selectedBlockIndex >= 0 && selectedBlockIndex < blocksState.length
      ? selectedBlockIndex + 1
      : blocksState.length;
    blocksState.splice(insertAt, 0, ...parsed);
    selectedBlockIndex = insertAt;
    syncCodeFromBlocks({ immediate: true });
    renderBlocks();
    return;
  }

  const a = editor.selectionStart;
  const b = editor.selectionEnd;
  const before = editor.value.slice(0, a);
  const value = (before && !before.endsWith('\n') ? '\n' : '') + text + '\n';
  editor.setRangeText(value, a, b, 'end');
  editor.focus();
  schedule();
}

function renderOperators() {
  if (!operatorsEl) return;
  const cat = PALETTE[activeCategory];
  operatorsEl.setAttribute('aria-labelledby', 'xp-tab-' + activeCategory);
  operatorsEl.style.setProperty('--operator-color', cat.color);
  operatorsEl.replaceChildren();
  for (const [name, hint, text, inline] of cat.items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    const small = document.createElement('small');
    small.textContent = hint;
    button.append(small);
    button.addEventListener('click', () => insertOperator(text, Boolean(inline)));
    operatorsEl.append(button);
  }
}

renderPaletteTabs();
renderOperators();

for (const [key, preset] of Object.entries(STARTERS)) {
  const b = document.createElement('button');
  b.textContent = preset.name;
  b.type = 'button';
  b.dataset.preset = key;
  b.addEventListener('click', () => load(preset, key));
  $('presets').append(b);
}

function themeBgHex() {
  const c = window.SimKit?.theme?.colors?.();
  if (c && c.bg) {
    try {
      return new THREE.Color(c.bg).getHex();
    } catch (_) {}
  }
  return 0xeaf2f5;
}

function rebuildGrid(isDark) {
  if (!world) return;
  if (gridHelper) {
    world.scene.remove(gridHelper);
    gridHelper.geometry?.dispose();
    if (Array.isArray(gridHelper.material)) gridHelper.material.forEach((m) => m.dispose());
    else gridHelper.material?.dispose();
  }
  gridHelper = new THREE.GridHelper(
    160,
    16,
    isDark ? 0x64748b : 0x7c9fae,
    isDark ? 0x334155 : 0xc4d7df
  );
  world.scene.add(gridHelper);
}

function syncThemeBg() {
  if (!world) return;
  const bg = window.SimKit?.theme?.colors?.()?.bg;
  const bgColor = new THREE.Color(bg || 0xeaf2f5);
  world.scene.background = bgColor;
  if (canvas) canvas.style.background = bg || '#eaf2f5';
  const lum = bgColor.r * 0.299 + bgColor.g * 0.587 + bgColor.b * 0.114;
  rebuildGrid(lum < 0.5);
  draw();
}

try {
  world = createScene(canvas, { THREE, far: 3000, clearColor: themeBgHex() });
  world.scene.add(new THREE.HemisphereLight(0xffffff, 0x53657b, 2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(60, 120, 80);
  world.scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xcbe4ff, 0.85);
  fillLight.position.set(-50, 40, -60);
  world.scene.add(fillLight);

  model = new THREE.Group();
  model.rotation.x = -Math.PI / 2;
  world.scene.add(model);

  axesHelper = new THREE.AxesHelper(45);
  axesHelper.visible = axesVisible;
  model.add(axesHelper);

  syncThemeBg();
  window.SimKit?.theme?.onChange?.(syncThemeBg);

  orbit = new OrbitControls(world.camera, canvas);
  orbit.maxDistance = 1800;
  orbit.minDistance = 5;
  orbit.addEventListener('change', draw);
  new ResizeObserver(draw).observe(canvas);
} catch (e) {
  statusEl.textContent = '3D needs WebGL in this browser. You can still edit and save your program.';
}

function draw() {
  if (world) {
    world.syncSize();
    world.renderer.render(world.scene, world.camera);
  }
}

const rad = THREE.MathUtils.degToRad;

function createPrimitiveGeometry(shape, w, d, h) {
  if (shape === 'box') return new THREE.BoxGeometry(w, d, h);
  if (shape === 'sphere') {
    const g = new THREE.SphereGeometry(0.5, 24, 16);
    g.scale(w, d, h);
    return g;
  }
  if (shape === 'cone') {
    const g = new THREE.ConeGeometry(0.5, 1, 32);
    g.rotateX(Math.PI / 2);
    g.scale(w, d, h);
    return g;
  }
  if (shape === 'torus') {
    const g = new THREE.TorusGeometry(0.35, 0.15, 16, 36);
    g.scale(w, d, h);
    return g;
  }
  if (shape === 'prism') {
    const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
    g.rotateX(Math.PI / 2);
    g.scale(w, d, h);
    return g;
  }
  if (shape === 'tube') {
    const outer = new THREE.Shape();
    outer.absarc(0, 0, 0.5, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.32, 0, Math.PI * 2, true);
    outer.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(outer, { depth: 1, bevelEnabled: false, curveSegments: 32 });
    g.translate(0, 0, -0.5);
    g.scale(w, d, h);
    return g;
  }
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 48);
  g.rotateX(Math.PI / 2);
  g.scale(w, d, h);
  return g;
}

function applyHighlight() {
  if (!model) return;
  for (const child of model.children) {
    if (!child.isMesh) continue;
    const match = inspectedLine !== null && child.userData.line === inspectedLine;
    child.material.emissive.setHex(match ? 0x6d28d9 : 0x000000);
    child.material.emissiveIntensity = match ? 0.55 : 0;
  }
  draw();
}

function updateDimensionsReadout() {
  if (!dimsEl) return;
  if (!model) {
    dimsEl.textContent = '';
    return;
  }
  model.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const child of model.children) {
    if (child.isMesh && child.visible) box.expandByObject(child);
  }
  if (box.isEmpty()) {
    dimsEl.textContent = 'Empty build plate';
    delete dimsEl.dataset.fit;
    return;
  }
  const threeSize = new THREE.Vector3();
  box.getSize(threeSize);
  // Model Z-up maps to Three's Y-up: width=X, depth=Z, height=Y
  const sizeMm = [threeSize.x, threeSize.z, threeSize.y];
  const fitRes = printerFit(sizeMm, DEFAULT_PRINTER);
  const f = (n) => Number(n.toFixed(1)).toString();
  dimsEl.textContent = `${f(sizeMm[0])} × ${f(sizeMm[1])} × ${f(sizeMm[2])} mm · ${
    fitRes.fits ? 'Fits ' + DEFAULT_PRINTER.name : 'Exceeds ' + DEFAULT_PRINTER.name
  }`;
  dimsEl.dataset.fit = fitRes.fits ? 'ok' : 'warn';
}

function run({ record = true } = {}) {
  clearTimeout(timer);
  try {
    const next = compile(editor.value, params());
    if (model) {
      for (let i = model.children.length - 1; i >= 0; i--) {
        const m = model.children[i];
        if (!m.isMesh) continue;
        model.remove(m);
        m.geometry.dispose();
        m.material.dispose();
      }
      for (const item of next) {
        const [x, y, z, w, d, h, tilt, turn, lean, hue] = item.values;
        const t = item.transform;
        const geometry = createPrimitiveGeometry(item.shape, w, d, h);
        const hueVal = ((((t.color ?? hue) % 360) + 360) % 360) / 360;
        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(hueVal, 0.65, 0.5),
            roughness: 0.45,
            wireframe
          })
        );
        mesh.scale.set(...t.scale);
        mesh.rotation.set(rad(tilt + t.rotate[0]), rad(lean + t.rotate[1]), rad(t.rotate[2]));
        mesh.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rad(turn)));
        const a = rad(turn);
        mesh.position.set(
          x * Math.cos(a) - y * Math.sin(a) + t.move[0],
          x * Math.sin(a) + y * Math.cos(a) + t.move[1],
          z + t.move[2]
        );
        mesh.userData = { iteration: item.iteration, line: item.line, shape: item.shape };
        model.add(mesh);
      }
    }
    built = next;
    visible = params().count;
    if (record) commitHistory(makeSnapshot());
    saveDraft();
    show();
    return true;
  } catch (e) {
    statusEl.textContent = e.message + ' Preview keeps your last successful run.';
    editor.setAttribute('aria-invalid', 'true');
    return false;
  }
}

function show() {
  editor.removeAttribute('aria-invalid');
  if (model) {
    for (const m of model.children) {
      if (m.isMesh) m.visible = m.userData.iteration < visible;
    }
  }
  applyHighlight();
  updateDimensionsReadout();
  const shapeCount = built.filter((s) => s.iteration < visible).length;
  statusEl.textContent = `${visible} / ${params().count} repeats · ${shapeCount} shapes.${
    world ? '' : ' 3D unavailable; editing and saving still work.'
  }`;
  draw();
}

function step() {
  stopPlay();
  const nextVisible = visible >= params().count ? 1 : visible + 1;
  if (run()) {
    visible = nextVisible;
    show();
  }
}

function stopPlay() {
  clearTimeout(playTimer);
  playTimer = null;
  if (!playing) return;
  playing = false;
  if (playBtn) {
    playBtn.textContent = '▶ Play';
    playBtn.setAttribute('aria-pressed', 'false');
  }
}

function tickPlay() {
  if (!playing) return;
  const total = params().count;
  if (visible < total) {
    visible++;
    show();
    playTimer = setTimeout(tickPlay, SPEED_MS[speedIdx]);
  } else {
    stopPlay();
  }
}

function startPlay() {
  if (playing) {
    stopPlay();
    return;
  }
  if (!run()) return;
  const total = params().count;
  if (total <= 1) return;
  playing = true;
  if (playBtn) {
    playBtn.textContent = '⏸ Pause';
    playBtn.setAttribute('aria-pressed', 'true');
  }
  if (visible >= total) {
    visible = 1;
    show();
  }
  playTimer = setTimeout(tickPlay, SPEED_MS[speedIdx]);
}

function setViewButtons(mode) {
  if (mode === 'perspective' || mode === 'front' || mode === 'top') {
    activeView = mode;
  }
  for (const name of ['perspective', 'front', 'top']) {
    const btn = $(name);
    if (btn) btn.setAttribute('aria-pressed', String(name === activeView));
  }
}

function fit(mode = 'fit') {
  if (!world) return;
  setViewButtons(mode);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const child of model.children) {
    if (child.isMesh && child.visible) box.expandByObject(child);
  }
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  if (box.isEmpty()) {
    center.set(0, 0, 0);
    size.set(30, 30, 30);
  } else {
    box.getCenter(center);
    box.getSize(size);
  }
  const distance = Math.max(size.x, size.y, size.z, 20) * 1.9;
  let offset;
  if (mode === 'top') offset = new THREE.Vector3(0, distance, 0.001);
  else if (mode === 'front') offset = new THREE.Vector3(0, size.y * 0.18, distance);
  else if (mode === 'perspective') offset = new THREE.Vector3(distance * 0.8, distance * 0.65, distance * 0.9);
  else {
    const dir = world.camera.position.clone().sub(orbit.target);
    offset = (dir.lengthSq() > 1e-4 ? dir.normalize() : new THREE.Vector3(0.8, 0.65, 0.9).normalize()).multiplyScalar(distance);
  }
  orbit.target.copy(center);
  world.camera.position.copy(center).add(offset);
  orbit.update();
  draw();
}

function collectTriangleSoup() {
  const items = built.filter((s) => s.iteration < visible);
  if (!items.length) throw new Error('Run a program with at least one shape first.');
  if (model) {
    model.updateMatrixWorld(true);
    const chunks = [];
    let total = 0;
    for (const m of model.children) {
      if (!m.isMesh || !m.visible) continue;
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry).clone();
      g.applyMatrix4(m.matrixWorld);
      const arr = g.attributes.position.array;
      chunks.push(new Float32Array(arr));
      total += arr.length;
      g.dispose();
    }
    if (!total) throw new Error('No visible geometry to export.');
    const soup = new Float32Array(total);
    let offset = 0;
    for (const c of chunks) {
      soup.set(c, offset);
      offset += c.length;
    }
    return prepareForPrint(soup, { yUp: true });
  }
  throw new Error('3D geometry is unavailable without WebGL.');
}

function load(p, key = '', { resetHistory = false } = {}) {
  stopPlay();
  inspectedLine = null;
  selectedBlockIndex = -1;
  editor.value = p.code;
  for (const k of Object.keys(controlsSpec)) $('param-' + k).value = p[k];
  $('presets')
    .querySelectorAll('button')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === key)));
  syncOutputs();
  updateLoopBadge();
  blocksState = parseBlocks(editor.value);
  if (editorMode === 'blocks') renderBlocks();
  if (resetHistory) {
    undoStack.length = 0;
    redoStack.length = 0;
    currentSnap = null;
  }
  run({ record: !resetHistory });
  if (resetHistory) {
    currentSnap = makeSnapshot();
    updateHistoryButtons();
  }
  fit('perspective');
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => run(), 280);
}

editor.addEventListener('input', () => {
  stopPlay();
  schedule();
});

$('run').addEventListener('click', () => {
  stopPlay();
  if (run()) fit('fit');
});
$('step').addEventListener('click', step);
if (playBtn) playBtn.addEventListener('click', startPlay);
if (speedBtn) {
  speedBtn.addEventListener('click', () => {
    speedIdx = (speedIdx + 1) % SPEEDS.length;
    speedBtn.textContent = `${SPEEDS[speedIdx]}×`;
  });
}

if (modeBlocksBtn) modeBlocksBtn.addEventListener('click', () => setMode('blocks'));
if (modeCodeBtn) modeCodeBtn.addEventListener('click', () => setMode('code'));

$('fit').addEventListener('click', () => fit('fit'));
$('top').addEventListener('click', () => fit('top'));
if ($('front')) $('front').addEventListener('click', () => fit('front'));
$('perspective').addEventListener('click', () => fit('perspective'));

if (wireBtn) {
  wireBtn.addEventListener('click', () => {
    wireframe = !wireframe;
    wireBtn.setAttribute('aria-pressed', String(wireframe));
    if (model) {
      for (const m of model.children) {
        if (m.isMesh) m.material.wireframe = wireframe;
      }
      draw();
    }
  });
}

if (axesBtn) {
  axesBtn.addEventListener('click', () => {
    axesVisible = !axesVisible;
    axesBtn.setAttribute('aria-pressed', String(axesVisible));
    if (axesHelper) {
      axesHelper.visible = axesVisible;
      draw();
    }
  });
}

if (undoBtn) {
  undoBtn.addEventListener('click', () => {
    if (!undoStack.length) return;
    redoStack.push(currentSnap);
    applySnapshot(undoStack.pop());
  });
}
if (redoBtn) {
  redoBtn.addEventListener('click', () => {
    if (!redoStack.length) return;
    undoStack.push(currentSnap);
    applySnapshot(redoStack.pop());
  });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

$('stl').addEventListener('click', () => {
  try {
    const stl = writeBinaryStl(collectTriangleSoup(), 'ClassroomOS Codeblocks Studio (mm)');
    triggerDownload(new Blob([stl], { type: 'model/stl' }), 'my-codeblocks-design.stl');
    statusEl.textContent = 'STL (mm) downloaded. Inspect wall thickness and separate parts in your slicer.';
  } catch (error) {
    statusEl.textContent = 'STL export unavailable: ' + error.message;
  }
});

if ($('3mf')) {
  $('3mf').addEventListener('click', () => {
    try {
      const soup = collectTriangleSoup();
      const bytes = write3mf([{ name: 'Codeblocks Design', positions: soup }], {
        title: 'Codeblocks Studio Design',
        application: 'ClassroomOS Codeblocks Studio'
      });
      triggerDownload(new Blob([bytes], { type: 'model/3mf' }), 'my-codeblocks-design.3mf');
      statusEl.textContent = '3MF (mm) downloaded with unit metadata for slicers.';
    } catch (error) {
      statusEl.textContent = '3MF export unavailable: ' + error.message;
    }
  });
}

$('workbench').addEventListener('click', async () => {
  try {
    const stl = writeBinaryStl(collectTriangleSoup(), 'ClassroomOS Codeblocks Studio (mm)');
    await sendAndOpen('../../../workbench.html', {
      bytes: new Uint8Array(stl),
      filename: 'codeblocks-design.stl',
      from: 'Codeblocks studio'
    });
  } catch (error) {
    statusEl.textContent = 'Could not send to Workbench: ' + error.message;
  }
});

$('save').addEventListener('click', () => {
  const payload = JSON.stringify({ version: 1, ...params(), code: editor.value }, null, 2);
  triggerDownload(new Blob([payload], { type: 'application/json' }), 'my-codeblocks-idea.json');
});

$('load').addEventListener('change', async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100000) throw Error('Program file is too large.');
    const p = JSON.parse(await file.text());
    if (typeof p.code !== 'string') throw Error('Missing program text.');
    for (const [k, [, min, max]] of Object.entries(controlsSpec)) {
      if (!Number.isFinite(p[k]) || p[k] < min || p[k] > max || (k === 'count' && !Number.isInteger(p[k]))) {
        throw Error('Invalid parameter: ' + k);
      }
    }
    compile(p.code, p);
    load(p);
  } catch (error) {
    statusEl.textContent = 'Could not open program: ' + error.message;
  }
  e.target.value = '';
});

if (canvas) {
  canvas.addEventListener('pointerdown', (e) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!pointerDownPos || !world || !model) return;
    const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    pointerDownPos = null;
    if (dist >= 5) return;

    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, world.camera);
    const hits = raycaster.intersectObjects(
      model.children.filter((c) => c.isMesh && c.visible),
      false
    );
    if (hits.length) {
      const hitMesh = hits[0].object;
      inspectedLine = hitMesh.userData.line;
      const idx = blocksState.findIndex((b) => b.line === inspectedLine);
      selectedBlockIndex = idx;
      if (editorMode === 'blocks' && idx >= 0) {
        blocksEl.querySelectorAll('.xp-block').forEach((node) => {
          const match = Number(node.dataset.blockIndex) === idx;
          node.classList.toggle('is-selected', match);
          if (match) node.scrollIntoView({ block: 'nearest' });
        });
      }
      applyHighlight();
      statusEl.textContent = `Selected line ${inspectedLine} · repeat i = ${hitMesh.userData.iteration} (${SHAPE_LABELS[hitMesh.userData.shape] || hitMesh.userData.shape}).`;
    } else if (inspectedLine !== null) {
      inspectedLine = null;
      applyHighlight();
    }
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPlay();
});

const studioRoot = document.getElementById('xp-studio');
if (studioRoot) {
  studioRoot.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      stopPlay();
      run();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && editorMode === 'blocks') {
      e.preventDefault();
      if (e.shiftKey) redoBtn?.click();
      else undoBtn?.click();
    }
  });
}

let restored = false;
try {
  const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
  if (
    saved &&
    typeof saved.code === 'string' &&
    Object.entries(controlsSpec).every(
      ([k, [, min, max]]) =>
        Number.isFinite(saved[k]) &&
        saved[k] >= min &&
        saved[k] <= max &&
        (k !== 'count' || Number.isInteger(saved[k]))
    )
  ) {
    compile(saved.code, saved);
    load(saved, '', { resetHistory: true });
    restored = true;
  }
} catch (_) {}
if (!restored) load(STARTERS.helix, 'helix', { resetHistory: true });
