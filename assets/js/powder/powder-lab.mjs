// Powder Lab: the falling-sand mode of the homepage Physics & Drawing Board.
// index-sandbox.js imports this on first use and drives start/stop/resize, so the
// loop only runs while the Powder tab is on screen. All physics is in powder-core.mjs.
import {
  E, ELEMENTS, REACTIONS, createWorld, clear, step, paint, blow, render, encode, decode, count, thermalBrush, inspect, initialTemperature
} from './powder-core.mjs';

const GROUPS = [
  ['science', 'Science tools'],
  ['powder', 'Powders'], ['liquid', 'Liquids'], ['energy', 'Energy & gas'], ['gas', null],
  ['solid', 'Solids'], ['machine', 'Machines'], ['tool', 'Tools']
];
const WIND = { key: 'wind', name: 'Wind', color: [190, 220, 255], hint: 'Drag to blow loose particles around.' };
const SCIENCE_TOOLS = [
  { key: 'inspect', name: 'Inspect', color: [210, 210, 220], hint: 'Point to read material, temperature, state and last change. Arrow keys move the probe when the canvas is focused.' },
  { key: 'heat', name: 'Heat', color: [245, 95, 70], hint: 'Hold to add heat. Watch the thermometer; boiling needs sustained heating.' },
  { key: 'cool', name: 'Cool', color: [90, 170, 245], hint: 'Hold to remove heat. Try condensing vapor or freezing water.' }
];
const BG = '#0c0d14';

export function cellSizeFor(board) { return board.width >= 900 ? 4 : 3; }

export function mount(panel, host) {
  const canvas = panel.querySelector('#ppowder-canvas');
  const ctx = canvas.getContext('2d');
  const palette = panel.querySelector('#ppowder-palette');
  const sizeInput = panel.querySelector('#ppowder-size');
  const pauseBtn = panel.querySelector('#ppowder-pause');
  const hintEl = panel.querySelector('#ppowder-hint');
  const countEl = panel.querySelector('#ppowder-count');
  const foundEl = panel.querySelector('#ppowder-found');
  const listEl = panel.querySelector('#ppowder-reactions');
  const coach = panel.querySelector('#ppowder-coach');
  const probe = panel.querySelector('#ppowder-probe');
  const thermalToggle = panel.querySelector('#ppowder-thermal');
  let thermalView = false;
  let lastProbe = '';
  function updateProbe() {
    const value = world && hover ? inspect(world, hover.x, hover.y) : null;
    const text = value ? `${value.name} · ${value.state} · ${value.temperature} °C` +
      (value.oxygen === null ? '' : ` · oxygen ${value.oxygen}%`) +
      (value.change ? ` · ${value.change}` : '') : 'Probe: point at the world to measure temperature.';
    if (text !== lastProbe) { probe.textContent = text; lastProbe = text; }
  }
  thermalToggle.addEventListener('change', () => { thermalView = thermalToggle.checked; draw(); });

  let world = null, cell = 3, off = null, offCtx = null, image = null, pixels = null;
  let element = 'sand', brush = +sizeInput.value, paused = false;
  let raf = 0, lastT = 0, acc = 0, frames = 0;
  let pointer = null, hover = null; // { x, y } in cells
  const shown = new Uint8Array(REACTIONS.length);

  // Palette ------------------------------------------------------------
  const byKey = new Map(ELEMENTS.map(el => [el.key, el]));
  byKey.set('wind', WIND);
  SCIENCE_TOOLS.forEach(tool => byKey.set(tool.key, tool));
  for (const [group, label] of GROUPS) {
    const items = group === 'science' ? SCIENCE_TOOLS : ELEMENTS.filter(el => el.group === group && el.id !== E.SMOKE);
    if (group === 'tool') items.push(WIND);
    if (!items.length) continue;
    let row = label ? null : palette.lastElementChild?.querySelector('.powder-row');
    if (!row) {
      const set = document.createElement('div');
      set.className = 'powder-set';
      set.innerHTML = '<span class="powder-set-label"></span><div class="powder-row"></div>';
      set.firstChild.textContent = label;
      row = set.lastChild;
      (group === 'science' ? panel.querySelector('#ppowder-science-tools') : palette).append(set);
    }
    for (const el of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'powder-el';
      b.dataset.el = el.key;
      b.style.setProperty('--el', `rgb(${el.color.join(',')})`);
      b.setAttribute('aria-pressed', 'false');
      b.title = el.hint;
      b.innerHTML = '<span class="powder-swatch" aria-hidden="true"></span>';
      b.append(el.name);
      row.append(b);
    }
  }
  function select(key) {
    if (!byKey.has(key)) key = 'sand';
    element = key;
    panel.querySelectorAll('.powder-el').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.el === key)));
    const el = byKey.get(key);
    hintEl.textContent = el.name + ': ' + el.hint;
  }
  panel.addEventListener('click', e => {
    const b = e.target.closest('.powder-el');
    if (b) select(b.dataset.el);
  });
  sizeInput.addEventListener('input', () => { brush = +sizeInput.value; draw(); });
  select(element);

  // World + drawing ----------------------------------------------------
  function ensureWorld() {
    const board = host.board();
    if (!board) return false;
    cell = cellSizeFor(board);
    const cols = Math.floor(board.width / cell), rows = Math.floor(board.height / cell);
    if (!world || world.W !== cols || world.H !== rows) {
      world = createWorld(cols, rows, (Math.random() * 2 ** 31) | 0);
      off = document.createElement('canvas');
      off.width = cols; off.height = rows;
      offCtx = off.getContext('2d');
      image = offCtx.createImageData(cols, rows);
      pixels = new Uint32Array(image.data.buffer);
      shown.fill(0);
      listEl.replaceChildren();
      updateStats();
    }
    return true;
  }

  function draw() {
    if (!world) return;
    const board = host.board();
    render(world, pixels, thermalView);
    offCtx.putImageData(image, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, board.width, board.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, world.W * cell, world.H * cell);
    if (hover) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc((hover.x + 0.5) * cell, (hover.y + 0.5) * cell, Math.max(1.5, (brush + 0.5) * cell), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function updateStats() {
    const n = world ? count(world) : 0;
    countEl.textContent = n.toLocaleString() + (n === 1 ? ' particle' : ' particles');
    if (coach) coach.classList.toggle('is-hidden', n > 0 || !!pointer);
    updateProbe();
    if (!world) return;
    let total = 0, fresh = null;
    for (let i = 0; i < REACTIONS.length; i++) {
      if (!world.found[i]) continue;
      total++;
      if (!shown[i]) {
        shown[i] = 1;
        fresh = REACTIONS[i];
        const li = document.createElement('li');
        li.textContent = fresh.label;
        listEl.append(li);
      }
    }
    foundEl.textContent = total + '/' + REACTIONS.length + ' discoveries';
    if (fresh) hintEl.textContent = 'Discovered: ' + fresh.label;
  }

  // Painting -----------------------------------------------------------
  function toCell(e) {
    const p = host.point(canvas, e);
    return { x: Math.max(0, Math.min(world.W - 1, Math.floor(p.x / cell))), y: Math.max(0, Math.min(world.H - 1, Math.floor(p.y / cell))) };
  }
  function apply(at, from) {
    if (element === 'wind') {
      if (from) blow(world, at.x, at.y, Math.max(2, brush), at.x - from.x, at.y - from.y, 3);
      return;
    }
    if (element === 'inspect') { updateProbe(); return; }
    const t = byKey.get(element).id;
    // Interpolate so a fast stroke leaves no gaps.
    const steps = from ? Math.max(1, Math.ceil(Math.hypot(at.x - from.x, at.y - from.y) / Math.max(1, brush))) : 1;
    for (let s = 1; s <= steps; s++) {
      const x = from ? Math.round(from.x + (at.x - from.x) * s / steps) : at.x;
      const y = from ? Math.round(from.y + (at.y - from.y) * s / steps) : at.y;
      if (element === 'heat' || element === 'cool') thermalBrush(world, x, y, brush, element === 'heat' ? 8 : -8);
      else paint(world, x, y, brush, t);
    }
  }
  canvas.addEventListener('pointerdown', e => {
    if (!ensureWorld() || (e.button && e.button !== 0)) return;
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    pointer = hover = toCell(e);
    apply(pointer, null);
    if (paused) draw();
    updateStats();
  });
  canvas.addEventListener('pointermove', e => {
    if (!world) return;
    const at = toCell(e);
    hover = e.pointerType === 'mouse' || pointer ? at : null;
    if (pointer) { apply(at, pointer); pointer = at; }
    updateProbe();
    if (paused || !raf) draw();
  });
  const release = () => { pointer = null; updateStats(); };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hover = null; if (!raf || paused) draw(); } });

  canvas.addEventListener('keydown', e => {
    if (!ensureWorld()) return;
    const directions = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] };
    if (directions[e.key]) {
      e.preventDefault(); const [dx,dy] = directions[e.key];
      hover ||= { x: Math.floor(world.W/2), y: Math.floor(world.H/2) };
      hover = { x: Math.max(0, Math.min(world.W-1, hover.x+dx)), y: Math.max(0, Math.min(world.H-1, hover.y+dy)) };
      updateProbe(); draw();
    } else if (e.key === 'Enter' && hover) { e.preventDefault(); apply(hover, null); draw(); updateStats(); }
  });

  // Loop ---------------------------------------------------------------
  function frame(ts) {
    raf = 0;
    if (!host.canAnimate()) return;
    const dt = lastT ? Math.min(50, ts - lastT) : 16.7;
    lastT = ts;
    if (!paused) {
      // Holding still keeps pouring, like a tap.
      if (pointer && element !== 'wind') apply(pointer, null);
      acc += dt;
      let n = 0;
      while (acc >= 16.6 && n < 2) { step(world); acc -= 16.6; n++; }
      if (n === 2) acc = 0;
      if (++frames % 15 === 0) updateStats();
    }
    // Paused edits draw from their input handlers; no full-grid repaint at idle.
    if (!paused) draw();
    raf = requestAnimationFrame(frame);
  }

  function setPaused(next) {
    paused = next;
    pauseBtn.textContent = paused ? '▶ Play' : '⏸ Pause';
    pauseBtn.setAttribute('aria-pressed', String(paused));
  }
  pauseBtn.addEventListener('click', () => setPaused(!paused));
  panel.querySelector('#ppowder-step').addEventListener('click', () => {
    if (!ensureWorld()) return;
    setPaused(true); step(world); draw(); updateStats();
  });
  panel.querySelector('#ppowder-clear').addEventListener('click', () => {
    if (!ensureWorld()) return;
    clear(world); world.found.fill(0); shown.fill(0); listEl.replaceChildren();
    panel.querySelector('#ppowder-question').textContent = 'Choose a setup, or build your own. Use Inspect, Heat and Cool in Tools.';
    draw(); updateStats();
  });
  panel.querySelector('#ppowder-demo').addEventListener('click', () => {
    if (!ensureWorld()) return;
    world.found.fill(0); shown.fill(0); listEl.replaceChildren();
    panel.querySelector('#ppowder-question').textContent = 'Demo: explore the volcano, garden and electrical fuse.';
    demo(world); setPaused(false); draw(); updateStats();
    hintEl.textContent = 'Demo: close the gap beside the red battery with Metal to light the fuse.';
  });
  panel.querySelector('#ppowder-load-experiment').addEventListener('click', () => {
    if (!ensureWorld()) return;
    const key = panel.querySelector('#ppowder-experiment').value;
    const instruction = loadExperiment(world, key);
    shown.fill(0); listEl.replaceChildren(); setPaused(false); draw(); updateStats();
    panel.querySelector('#ppowder-question').textContent = instruction;
    select('inspect');
  });
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space' || !panel.classList.contains('is-active') || panel.closest('[hidden]')) return;
    if (/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    e.preventDefault(); setPaused(!paused);
  });

  return {
    start() {
      if (!ensureWorld()) return;
      if (!raf && host.canAnimate()) { lastT = 0; raf = requestAnimationFrame(frame); }
    },
    stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } },
    resize() { if (host.fit(canvas, ctx) && ensureWorld()) draw(); },
    capture() {
      if (!ensureWorld()) return null;
      return { element, brush, paused, grid: encode(world) };
    },
    apply(saved) {
      ensureWorld();
      shown.fill(0); listEl.replaceChildren();
      panel.querySelector('#ppowder-question').textContent = 'Use Inspect to measure this world, or load an experiment to start again.';
      if (!saved) { clear(world); world.found.fill(0); }
      else {
        decode(world, saved.grid);
        select(saved.element);
        brush = saved.brush;
        sizeInput.value = String(brush);
      }
      setPaused(true);
      draw(); updateStats();
    },
    validate(saved, board) {
      const keys = [...byKey.keys()];
      if (!saved || typeof saved !== 'object' || !keys.includes(saved.element) ||
          !Number.isInteger(saved.brush) || saved.brush < 0 || saved.brush > 12 || typeof saved.paused !== 'boolean') return false;
      const c = cellSizeFor(board);
      const probe = createWorld(Math.floor(board.width / c), Math.floor(board.height / c));
      try { decode(probe, saved.grid); } catch { return false; }
      return true;
    }
  };
}

// A starter scene that shows off several reactions at once.
function demo(w) {
  clear(w);
  const { W, H } = w;
  const put = (x, y, t, life = 0) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    w.type[i] = t; w.temperature[i] = initialTemperature(t); w.oxygen[i] = t === E.EMPTY ? 0.21 : t === E.OXYGEN ? 1 : 0; w.life[i] = life; w.shade[i] = (w.rand() * 256) | 0;
  };
  const ground = H - 6;
  for (let x = 0; x < W; x++) for (let y = ground; y < H; y++) put(x, y, E.WALL);
  // Volcano: a rock cone with a lava spring (a clone) at the summit.
  const vx = Math.round(W * 0.78), vh = Math.round(H * 0.42);
  for (let y = 0; y < vh; y++) {
    const half = Math.round((vh - y) * 0.9) + 1;
    for (let x = vx - half; x <= vx + half; x++) put(x, ground - y, E.WALL);
  }
  put(vx, ground - vh, E.CLONE, E.LAVA);
  // Garden on the far left: dirt, damp, seeds.
  const gx = Math.round(W * 0.04), gw = Math.round(W * 0.2);
  for (let x = gx; x < gx + gw; x++) { for (let y = ground - 4; y < ground; y++) put(x, y, E.DIRT); put(x, ground - 5, x % 2 ? E.WATER : E.EMPTY); }
  for (let x = gx + 2; x < gx + gw; x += 4) put(x, ground - 10, E.SEED);
  // Pond between the garden and the volcano, with ice on it: lava that reaches it turns to stone.
  const px = gx + gw + 4, pw = Math.round(W * 0.3);
  for (let x = px; x < px + pw; x++) for (let y = ground - 8; y < ground; y++) put(x, y, E.WATER);
  for (let y = ground - 12; y < ground; y++) { put(px - 1, y, E.WALL); put(px + pw, y, E.WALL); }
  for (let x = px + 4; x < px + 10; x++) for (let y = ground - 10; y < ground - 7; y++) put(x, y, E.ICE);
  // Fuse: battery, a one-cell gap (close it with Metal), wire, gunpowder on a wooden shelf.
  const fy = Math.round(H * 0.25), fx = Math.round(W * 0.05);
  put(fx, fy, E.POWER);
  const wireEnd = Math.round(W * 0.5);
  for (let x = fx + 2; x < wireEnd; x++) put(x, fy, E.METAL);
  for (let x = wireEnd - 10; x < wireEnd + 8; x++) put(x, fy + 1 + 4, E.WOOD);
  for (let x = wireEnd - 4; x < wireEnd + 4; x++) for (let y = fy + 1; y < fy + 5; y++) put(x, y, E.GUNPOWDER);
}


// Editable classroom setups. Each starts from a clean board; machines supply
// or remove energy so students can measure a sustained change.
export function loadExperiment(w, key) {
  clear(w); w.found.fill(0);
  const { W, H } = w;
  const rect = (x0,y0,x1,y1,t) => {
    for (let y=Math.floor(y0*H); y<Math.ceil(y1*H); y++)
      for (let x=Math.floor(x0*W); x<Math.ceil(x1*W); x++) {
        const i=y*W+x; w.type[i]=t; w.temperature[i]=initialTemperature(t);
        w.oxygen[i] = t === E.EMPTY ? 0.21 : t === E.OXYGEN ? 1 : 0;
        w.shade[i]=(w.rand()*256)|0;
      }
  };
  const line = (x0,y0,x1,y1,t) => {
    const ax=Math.floor(x0*W), ay=Math.floor(y0*H), bx=Math.floor(x1*W), by=Math.floor(y1*H);
    const n=Math.max(Math.abs(bx-ax),Math.abs(by-ay));
    for (let k=0;k<=n;k++) {
      const i=Math.round(ay+(by-ay)*k/(n||1))*W+Math.round(ax+(bx-ax)*k/(n||1));
      w.type[i]=t; w.temperature[i]=initialTemperature(t); w.oxygen[i]=0;
    }
  };
  if (key === 'distill' || key === 'cycle') {
    line(.1,.25,.9,.25,E.GLASS); line(.1,.25,.1,.9,E.GLASS);
    line(.9,.25,.9,.9,E.GLASS); line(.1,.9,.9,.9,E.GLASS);
    line(.5,.58,.5,.9,E.GLASS);
    line(.13,.89,.45,.89,E.METAL); line(.13,.9,.45,.9,E.HEATER);
    line(.57,.25,.87,.25,E.COOLER);
    rect(.14,.79,.44,.88,key === 'distill' ? E.SALTWATER : E.WATER);
    return key === 'distill'
      ? 'Distillation: heated salt water is on the left; the cold lid is on the right. Where does the salt stay? Inspect droplets collected on the right: are they fresh water?'
      : 'Water cycle: watch water evaporate and boil on the left, then condense under the cold lid on the right. Use Cool on the collected water to freeze it. Which changes create a new substance?';
  }
  if (key === 'fizz') {
    line(.25,.5,.25,.9,E.GLASS); line(.75,.5,.75,.9,E.GLASS); line(.25,.9,.75,.9,E.GLASS);
    rect(.3,.78,.7,.88,E.VINEGAR); rect(.42,.57,.58,.62,E.BAKING);
    return 'Fizz: baking soda falls into vinegar. Inspect the bubbles and the remaining solution. Which reactant runs out first? Add more of each to test your prediction.';
  }
  if (key === 'conduct') {
    for (const [y,t] of [[.35,E.METAL],[.55,E.GLASS],[.75,E.WOOD]]) {
      line(.2,y,.8,y,t); line(.18,y-.02,.18,y+.02,E.HEATER);
      line(.19,y,.2,y,t);
    }
    return 'Heat transfer: identical-length strips of metal (top), glass (middle), and wood (bottom). Turn on Temperature colors. Which far end warms first? This compares modeled conductivity, not measured heating times.';
  }
  if (key === 'wax') {
    line(.2,.8,.8,.8,E.GLASS); rect(.3,.7,.45,.79,E.WAX);
    line(.25,.8,.5,.8,E.METAL);
    for (let x=Math.floor(.25*W); x<=Math.floor(.5*W); x++) {
      const i=(Math.floor(.8*H)+1)*W+x;
      w.type[i]=E.HEATER; w.temperature[i]=150; w.oxygen[i]=0;
    }
    line(.68,.8,.8,.8,E.COOLER);
    return 'Wax: heat the solid wax until it melts. Use Cool on the liquid to solidify it. Melting changes its state; burning molten wax with Fire is a chemical change.';
  }
  if (key === 'rust') {
    line(.15,.85,.85,.85,E.GLASS);
    rect(.2,.8,.35,.84,E.IRON); rect(.42,.8,.57,.84,E.IRON); rect(.65,.8,.8,.84,E.IRON);
    rect(.42,.78,.57,.8,E.WATER); rect(.65,.78,.8,.8,E.SALTWATER);
    return 'Corrosion: compare dry iron (left), fresh-water iron (middle), and salt-water iron (right). Air supplies oxygen. Which rusts fastest? Rusting is accelerated; cell counts are not reaction stoichiometry.';
  }
  return '';
}
