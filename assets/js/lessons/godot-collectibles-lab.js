(() => {
  const lab = document.querySelector('[data-runner-lab]');
  if (!lab || !window.SimKit) return;

  const editor = lab.querySelector('[data-collectible-code]');
  const feedback = lab.querySelector('[data-code-feedback]');
  const canvas = lab.querySelector('[data-runner-canvas]');
  const surface = SimKit.canvas2d(canvas, { box: canvas.parentElement, dpr: 2 });
  const ctx = surface.ctx;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const starterCode = editor.value;
  const presets = {
    coin: { item_id: 'runner_coin', display_name: 'Runner Coin', value: 1, color: '#ffd166', shape: 'coin' },
    crystal: { item_id: 'sky_crystal', display_name: 'Sky Crystal', value: 3, color: '#c58cff', shape: 'diamond' },
    key: { item_id: 'vault_key', display_name: 'Vault Key', value: 1, color: '#ff8c79', shape: 'key' }
  };
  let item = { item_id: 'energy_cell', display_name: 'Energy Cell', value: 2, color: '#69e6ff', shape: 'diamond' };
  let lane = 1;
  let targetLane = 1;
  let distance = 0;
  let runCount = 0;
  let paused = false;
  let spawnClock = .7;
  let messageClock = 0;
  let pickups = [];
  const inventory = {};
  const storage = {};
  let builtCount = 0;
  let activeTab = 'inventory';
  let modelStyle = { dimension: '2.5d', world: 'skyway', shape: 'crystal', detail: 'none', color: '#69e6ff', texture: 'smooth', width: 1, height: 1.2, depth: .65, twist: 15, roughness: .35, glow: true };

  const codeFor = data => `extends Area3D

signal collected(item_id: String, value: int)

@export var item_id := "${data.item_id}"
@export var display_name := "${data.display_name}"
@export var value := ${data.value}
@export var color := "${data.color}"
@export var shape := "${data.shape}"

func collect() -> void:
    collected.emit(item_id, value)
    queue_free()`;

  const readString = (source, name) => {
    const match = source.match(new RegExp(`@export\\s+var\\s+${name}\\s*:?=\\s*["']([^"']+)["']`));
    return match ? match[1].trim() : '';
  };

  const parseCode = source => {
    const parsed = {
      item_id: readString(source, 'item_id'),
      display_name: readString(source, 'display_name'),
      color: readString(source, 'color'),
      shape: readString(source, 'shape')
    };
    const valueMatch = source.match(/@export\s+var\s+value\s*:?=\s*(\d+)/);
    parsed.value = valueMatch ? Number(valueMatch[1]) : NaN;
    if (!parsed.item_id || !/^[a-z][a-z0-9_]*$/.test(parsed.item_id)) throw new Error('item_id needs lowercase letters, numbers, or underscores.');
    if (!parsed.display_name) throw new Error('Add a display_name in quotation marks.');
    if (!Number.isInteger(parsed.value) || parsed.value < 1 || parsed.value > 99) throw new Error('value needs to be a whole number from 1 to 99.');
    if (!/^#[0-9a-f]{6}$/i.test(parsed.color)) throw new Error('color needs a six-digit hex value such as #69e6ff.');
    if (!['diamond', 'coin', 'key', 'sphere', 'cube', 'crystal', 'capsule', 'ring'].includes(parsed.shape)) throw new Error('Use a shape from the model studio.');
    if (!/collected\.emit\(\s*item_id\s*,\s*value\s*\)/.test(source)) throw new Error('Keep collected.emit(item_id, value) inside collect().');
    return parsed;
  };

  const setMessage = (text, hit = false) => {
    const message = lab.querySelector('[data-game-message]');
    message.textContent = text;
    message.classList.toggle('is-hit', hit);
    messageClock = 2.1;
  };

  const loadCode = () => {
    try {
      item = parseCode(editor.value);
      feedback.textContent = `${item.display_name} compiled. Watch for ${item.value}× pickups.`;
      feedback.classList.remove('is-error');
      pickups = [];
      spawnClock = .15;
      setMessage(`${item.display_name} entered the game.`, true);
      lab.querySelector('[data-event-trace]').textContent = `scene_loaded("${item.item_id}") → spawn queue`;
      renderSystem();
    } catch (error) {
      feedback.textContent = error.message;
      feedback.classList.add('is-error');
    }
  };

  const move = direction => {
    if (!paused) targetLane = Math.max(0, Math.min(2, targetLane + direction));
  };

  const updateHud = () => {
    lab.querySelector('[data-distance]').textContent = `${String(Math.floor(distance)).padStart(3, '0')} m`;
    lab.querySelector('[data-run-count]').textContent = String(runCount);
    lab.querySelector('[data-pack-count]').textContent = String(Object.values(inventory).reduce((sum, amount) => sum + amount, 0));
  };

  const addItem = () => {
    inventory[item.item_id] = (inventory[item.item_id] || 0) + item.value;
    runCount += 1;
    lab.querySelector('[data-event-trace]').textContent = `body_entered(Player) → collected.emit("${item.item_id}", ${item.value}) → Inventory.changed`;
    setMessage(`+${item.value} ${item.display_name}`, true);
    updateHud();
    renderSystem();
  };

  const spawn = () => {
    let nextLane = Math.floor(Math.random() * 3);
    if (pickups.length && nextLane === pickups[pickups.length - 1].lane) nextLane = (nextLane + 1) % 3;
    pickups.push({ lane: nextLane, z: 0, spin: Math.random() * Math.PI * 2 });
  };
  const laneX = (laneIndex, z, width) => width / 2 + (laneIndex - 1) * width * (.08 + z * .2);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const projectedPoint = (laneIndex, z, width, height) => {
    if (modelStyle.dimension === '2d') return { x: width * (.88 - z * .72), y: height * (.34 + laneIndex * .21), size: 22 };
    if (modelStyle.dimension === '2.5d') return { x: width / 2 + (laneIndex - 1) * width * (.07 + z * .17) + (z - .5) * width * .045, y: height * (.24 + z * .58), size: 8 + z * 25 };
    return { x: laneX(laneIndex, z, width), y: height * (.24 + z * .58), size: 8 + z * 25 };
  };

  const drawPickup = (pickup, width, height) => {
    const point = projectedPoint(pickup.lane, pickup.z, width, height);
    const { x, y, size } = point;
    const shape = modelStyle.shape || item.shape;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(shape === 'coin' || shape === 'ring' || modelStyle.dimension === '2d' ? 0 : pickup.spin + modelStyle.twist * Math.PI / 180);
    ctx.scale(modelStyle.width, modelStyle.height);
    ctx.shadowColor = modelStyle.color;
    ctx.shadowBlur = modelStyle.glow ? 12 + pickup.z * 18 : 0;
    ctx.fillStyle = modelStyle.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, pickup.z * 2);
    ctx.beginPath();
    if (shape === 'coin' || shape === 'sphere') {
      ctx.ellipse(0, 0, size * .72, size, 0, 0, Math.PI * 2);
    } else if (shape === 'ring') {
      ctx.arc(0, 0, size, 0, Math.PI * 2);
    } else if (shape === 'key') {
      ctx.arc(-size * .25, 0, size * .38, 0, Math.PI * 2);
      ctx.rect(0, -size * .12, size * .85, size * .24);
      ctx.rect(size * .55, 0, size * .18, size * .35);
    } else if (shape === 'cube') {
      ctx.rect(-size * .78, -size * .78, size * 1.56, size * 1.56);
    } else if (shape === 'capsule') {
      ctx.ellipse(0, -size * .45, size * .55, size * .55, 0, Math.PI, 0);
      ctx.lineTo(size * .55, size * .45);
      ctx.ellipse(0, size * .45, size * .55, size * .55, 0, 0, Math.PI);
      ctx.closePath();
    } else {
      ctx.moveTo(0, -size); ctx.lineTo(size * .75, 0); ctx.lineTo(0, size); ctx.lineTo(-size * .75, 0); ctx.closePath();
    }
    if (shape === 'ring') { ctx.lineWidth = Math.max(5, size * .34); ctx.strokeStyle = modelStyle.color; ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; }
    else { ctx.fill(); }
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = .28;
    ctx.strokeStyle = '#071e2c';
    ctx.fillStyle = '#ffffff';
    if (modelStyle.texture === 'stripes') for (let stripe = -size * 2; stripe < size * 2; stripe += Math.max(5, size * .4)) { ctx.beginPath(); ctx.moveTo(stripe, size * 1.3); ctx.lineTo(stripe + size * 1.7, -size * 1.3); ctx.stroke(); }
    if (modelStyle.texture === 'grid') for (let gridLine = -size; gridLine <= size; gridLine += Math.max(5, size * .45)) { ctx.beginPath(); ctx.moveTo(gridLine, -size); ctx.lineTo(gridLine, size); ctx.moveTo(-size, gridLine); ctx.lineTo(size, gridLine); ctx.stroke(); }
    if (modelStyle.texture === 'stone') for (let dot = 0; dot < 15; dot += 1) { ctx.beginPath(); ctx.arc(((dot * 17) % (size * 1.6)) - size * .8, ((dot * 29) % (size * 1.6)) - size * .8, 1.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    ctx.stroke();
    if (modelStyle.detail === 'halo') { ctx.beginPath(); ctx.ellipse(0, 0, size * 1.35, size * .38, -.35, 0, Math.PI * 2); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.stroke(); }
    if (modelStyle.detail === 'core') { ctx.beginPath(); ctx.arc(0, 0, size * .28, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    if (modelStyle.detail === 'fins') { ctx.beginPath(); ctx.moveTo(-size * .75, 0); ctx.lineTo(-size * 1.25, size * .5); ctx.lineTo(-size * .65, size * .45); ctx.moveTo(size * .75, 0); ctx.lineTo(size * 1.25, size * .5); ctx.lineTo(size * .65, size * .45); ctx.strokeStyle = '#ffd166'; ctx.stroke(); }
    ctx.restore();
  };

  const draw = time => {
    const width = surface.width;
    const height = surface.height;
    const horizonY = height * .2;
    const roadBottom = width * .48;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    const worldColors = modelStyle.world === 'ruins'
      ? ['#173b35', '#5d8770', '#d4b676']
      : modelStyle.world === 'neon' ? ['#070b24', '#251650', '#e5429b'] : ['#123f59', '#4f91a7', '#f4b987'];
    sky.addColorStop(0, worldColors[0]); sky.addColorStop(.55, worldColors[1]); sky.addColorStop(1, worldColors[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = modelStyle.world === 'ruins' ? '#254c3e' : modelStyle.world === 'neon' ? '#111339' : '#153447';
    for (let i = 0; i < 12; i += 1) {
      const buildingWidth = width / 10;
      const buildingHeight = 25 + ((i * 29) % 70);
      ctx.fillRect(i * buildingWidth - 8, horizonY - buildingHeight, buildingWidth - 3, buildingHeight);
      if (modelStyle.world === 'neon') { ctx.fillStyle = i % 2 ? '#3be8ff' : '#ff4eb8'; ctx.fillRect(i * buildingWidth + 2, horizonY - buildingHeight + 8, 2, buildingHeight - 14); ctx.fillStyle = '#111339'; }
    }
    ctx.fillStyle = modelStyle.world === 'ruins' ? '#4b5549' : modelStyle.world === 'neon' ? '#0b1030' : '#152d39';
    if (modelStyle.dimension === '2d') {
      ctx.fillRect(0, height * .23, width, height * .67);
      ctx.strokeStyle = modelStyle.world === 'neon' ? 'rgba(63,232,255,.5)' : 'rgba(255,255,255,.24)';
      ctx.lineWidth = 2;
      [0, 1, 2].forEach(track => { const y = height * (.34 + track * .21) + 28; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); });
    } else {
      ctx.beginPath();
      ctx.moveTo(width / 2 - width * .08, horizonY); ctx.lineTo(width / 2 + width * .08, horizonY);
      ctx.lineTo(width / 2 + roadBottom, height); ctx.lineTo(width / 2 - roadBottom, height); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.42)';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 18]);
    ctx.lineDashOffset = reducedMotion ? 0 : (time / 18) % 32;
    if (modelStyle.dimension !== '2d') [-.5, .5].forEach(offset => {
      ctx.beginPath(); ctx.moveTo(width / 2 + offset * width * .08, horizonY); ctx.lineTo(width / 2 + offset * roadBottom, height); ctx.stroke();
    });
    ctx.setLineDash([]);
    pickups.forEach(pickup => drawPickup(pickup, width, height));
    const playerPoint = modelStyle.dimension === '2d' ? projectedPoint(lane, 1, width, height) : { x: laneX(lane, 1, width), y: height * .83 };
    const playerX = modelStyle.dimension === '2d' ? width * .15 : playerPoint.x;
    const playerY = playerPoint.y;
    ctx.save(); ctx.translate(playerX, playerY); ctx.fillStyle = '#ffd166'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(0, -26, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ef7168'; ctx.fillRect(-13, -17, 26, 34); ctx.strokeRect(-13, -17, 26, 34);
    ctx.strokeStyle = '#eaf8ff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-7, 15); ctx.lineTo(-14, 35); ctx.moveTo(7, 15); ctx.lineTo(14, 35); ctx.stroke(); ctx.restore();
  };

  const update = (dt, time) => {
    const capped = Math.min(dt, .05);
    if (!paused) {
      lane += (targetLane - lane) * Math.min(1, capped * 13);
      distance += capped * 8;
      spawnClock -= capped;
      if (spawnClock <= 0) { spawn(); spawnClock = 1.15; }
      pickups.forEach(pickup => { pickup.z += capped * .38; pickup.spin += capped * 2.4; });
      pickups = pickups.filter(pickup => {
        if (pickup.z > .82 && pickup.z < 1.06 && Math.abs(pickup.lane - lane) < .38) { addItem(); return false; }
        return pickup.z < 1.12;
      });
      messageClock -= capped;
      if (messageClock <= 0) {
        lab.querySelector('[data-game-message]').textContent = `Collect ${item.display_name} in any lane.`;
        lab.querySelector('[data-game-message]').classList.remove('is-hit');
      }
      updateHud();
    }
    draw(time);
  };

  const currentAmount = () => inventory[item.item_id] || 0;
  function renderSystem() {
    const view = lab.querySelector('[data-system-view]');
    const amount = currentAmount();
    const icon = modelStyle.shape === 'sphere' || modelStyle.shape === 'coin' ? '●' : modelStyle.shape === 'ring' ? '○' : modelStyle.shape === 'cube' ? '■' : modelStyle.shape === 'capsule' ? '⬭' : '◆';
    const safeName = escapeHtml(item.display_name);
    const safeId = escapeHtml(item.item_id);
    if (activeTab === 'inventory') {
      view.innerHTML = amount ? `<div class="gd-item-row"><span class="gd-item-icon" style="--item-color:${item.color}">${icon}</span><div><b>${safeName}</b><small>${safeId} · updated by Inventory.changed</small></div><span class="gd-item-qty">× ${amount}</span></div><p class="gd-system-note">This view reads item data. It does not change the quantity itself.</p>` : '<div class="gd-empty-state">Collect an item to create its first inventory slot.</div>';
    }
    if (activeTab === 'build') {
      view.innerHTML = `<div class="gd-recipe-row"><span class="gd-item-icon" style="--item-color:#7ed6a3">▣</span><div><b>Build a boost pad</b><small>Recipe: 3 × ${safeName}</small></div><button type="button" data-build ${amount < 3 ? 'disabled' : ''}>Build</button></div><p class="gd-build-log">${builtCount ? `${builtCount} boost pad${builtCount === 1 ? '' : 's'} built.` : 'No objects built yet.'}</p>`;
    }
    if (activeTab === 'shop') {
      view.innerHTML = `<div class="gd-shop-row"><span class="gd-item-icon" style="--item-color:#ff9f7e">★</span><div><b>Runner trail</b><small>Cost: 5 × ${safeName}</small></div><button type="button" data-buy ${amount < 5 ? 'disabled' : ''}>Buy</button></div><p class="gd-system-note">A useful locked button explains its cost instead of silently failing.</p>`;
    }
    if (activeTab === 'storage') {
      const stored = storage[item.item_id] || 0;
      view.innerHTML = `<div class="gd-storage-panes"><div class="gd-storage-box"><span>PLAYER PACK</span><strong>${amount} × ${safeName}</strong></div><div class="gd-transfer-actions"><button type="button" data-store ${amount < 1 ? 'disabled' : ''}>Store →</button><button type="button" data-take ${stored < 1 ? 'disabled' : ''}>← Take</button></div><div class="gd-storage-box"><span>CHEST</span><strong>${stored} × ${safeName}</strong></div></div><p class="gd-system-note">Transfer subtracts from one container before adding to the other.</p>`;
    }
  }

  lab.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.matches('[data-run-code]')) loadCode();
    if (button.matches('[data-reset-code]')) { editor.value = starterCode; loadCode(); }
    if (button.dataset.preset) { editor.value = codeFor(presets[button.dataset.preset]); loadCode(); }
    if (button.dataset.move === 'left') move(-1);
    if (button.dataset.move === 'right') move(1);
    if (button.matches('[data-pause-game]')) {
      paused = !paused;
      button.setAttribute('aria-pressed', String(paused));
      lab.querySelector('[data-pause-label]').textContent = paused ? 'Resume' : 'Pause';
      setMessage(paused ? 'Game paused.' : 'Run resumed.');
    }
    if (button.matches('[data-toggle-inventory]')) {
      const panel = lab.querySelector('[data-inventory-panel]');
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      if (!open) panel.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    }
    if (button.dataset.systemTab) {
      activeTab = button.dataset.systemTab;
      lab.querySelectorAll('[data-system-tab]').forEach(tab => tab.setAttribute('aria-selected', String(tab === button)));
      renderSystem();
      lab.querySelector('[data-system-view]').focus();
    }
    if (button.matches('[data-build]') && currentAmount() >= 3) {
      inventory[item.item_id] -= 3; builtCount += 1;
      lab.querySelector('[data-event-trace]').textContent = `recipe_valid → Inventory.spend("${item.item_id}", 3) → boost_pad instantiated`;
      setMessage('Boost pad built!', true); updateHud(); renderSystem();
    }
    if (button.matches('[data-buy]') && currentAmount() >= 5) {
      inventory[item.item_id] -= 5;
      lab.querySelector('[data-event-trace]').textContent = `purchase_valid → Inventory.spend("${item.item_id}", 5) → trail unlocked`;
      setMessage('Runner trail unlocked!', true); updateHud(); renderSystem();
    }
    if (button.matches('[data-store]') && currentAmount() >= 1) {
      inventory[item.item_id] -= 1; storage[item.item_id] = (storage[item.item_id] || 0) + 1;
      lab.querySelector('[data-event-trace]').textContent = `transfer pack → chest: "${item.item_id}" × 1`;
      updateHud(); renderSystem();
    }
    if (button.matches('[data-take]') && (storage[item.item_id] || 0) >= 1) {
      storage[item.item_id] -= 1; inventory[item.item_id] = currentAmount() + 1;
      lab.querySelector('[data-event-trace]').textContent = `transfer chest → pack: "${item.item_id}" × 1`;
      updateHud(); renderSystem();
    }
  });

  window.addEventListener('keydown', event => {
    if (event.target === editor) return;
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') { event.preventDefault(); move(-1); }
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') { event.preventDefault(); move(1); }
  });

  window.addEventListener('collectible-model-deployed', event => {
    modelStyle = { ...modelStyle, ...event.detail };
    editor.value = editor.value
      .replace(/(@export\s+var\s+color\s*:?=\s*)["'][^"']+["']/, `$1"${modelStyle.color}"`)
      .replace(/(@export\s+var\s+shape\s*:?=\s*)["'][^"']+["']/, `$1"${modelStyle.shape}"`);
    loadCode();
    lab.querySelector('[data-event-trace]').textContent = `asset_deployed("${modelStyle.shape}") → ${modelStyle.world}/${modelStyle.dimension} spawn preset`;
    setMessage(`${modelStyle.shape} deployed to ${modelStyle.world}.`, true);
  });

  renderSystem();
  updateHud();
  SimKit.loop(update);
})();
