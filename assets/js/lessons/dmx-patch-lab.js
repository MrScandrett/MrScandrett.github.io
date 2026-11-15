/* DMX Lighting & Addressing lab: page wiring. The maths is in dmx-patch.js (DmxPatch). */
(function () {
  'use strict';
  const D = window.DmxPatch;
  if (!D) return;
  const $ = (id) => document.getElementById(id);
  const KEY = 'classroomos-dmx-patch-v1';
  const TYPES = Object.keys(D.PROFILES);
  const STATUS_MARK = { ok: '✓', note: 'ℹ', warn: '!', error: '✕' };
  const STATUS_WORD = { ok: 'Patched', note: 'Doubled', warn: 'Check', error: 'Fault' };

  const clone = (rig) => rig.map((f) => Object.assign({}, f));
  let state = { version: 1, patch: clone(D.PIRATES_RIG), meta: {}, universe: 1, selected: 13 };

  function validState(s) {
    return s && s.version === 1 && Array.isArray(s.patch) && s.patch.length <= 200 &&
      s.patch.every((f) => f && typeof f === 'object' && D.PROFILES[f.type] && D.PROFILES[f.type].modes[f.mode] &&
        (f.address === null || Number.isFinite(f.address)) && typeof (f.label || '') === 'string');
  }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (validState(saved)) state = Object.assign(state, saved);
  } catch (e) { /* private window: the lab still works */ }

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); $('save-status').textContent = 'Your patch saves on this browser and device.'; }
      catch (e) { $('save-status').textContent = 'This browser cannot save your patch. Print the patch sheet before you leave.'; }
    }, 250);
  }

  const node = (tag, props, text) => {
    const n = document.createElement(tag);
    if (props) Object.keys(props).forEach((k) => { if (k === 'class') n.className = props[k]; else n.setAttribute(k, props[k]); });
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const colorOf = (f) => (D.PROFILES[f.type] || {}).color || '#888';
  const nameOf = (f, i) => f.label || ('Fixture ' + (i + 1));
  const toInt = (v) => { const s = String(v).trim(); if (s === '') return null; const n = Number(s); return Number.isFinite(n) ? n : null; };

  /* ── universe map: 512 cells built once ── */
  const map = $('dmx-map');
  const cells = [];
  for (let a = 1; a <= D.UNIVERSE_SIZE; a++) {
    const c = node('div', { class: 'dmx-cell' + (a % 10 === 1 ? ' tens' : ''), 'data-n': String(a), title: 'Channel ' + a });
    c.addEventListener('click', () => { $('lookup-address').value = a; lookup(); });
    map.appendChild(c);
    cells.push(c);
  }

  /* ── patch table ── */
  const rows = $('patch-rows');
  function renderRows() {
    rows.textContent = '';
    state.patch.forEach((f, i) => {
      const tr = node('tr', { 'data-i': String(i) });
      const num = node('td');
      const sw = node('span', { class: 'dmx-swatch', 'aria-hidden': 'true' });
      sw.style.setProperty('--c', colorOf(f));
      num.append(sw, document.createTextNode(String(i + 1)));
      tr.appendChild(num);

      const label = node('input', { 'data-f': 'label', 'aria-label': 'Fixture ' + (i + 1) + ' name', maxlength: '60' });
      label.value = f.label || '';
      tr.appendChild(td(label));

      const type = node('select', { 'data-f': 'type', 'aria-label': 'Fixture ' + (i + 1) + ' type' });
      TYPES.forEach((t) => { const o = node('option', { value: t }, D.PROFILES[t].short); if (t === f.type) o.selected = true; type.appendChild(o); });
      tr.appendChild(td(type));

      const mode = node('select', { 'data-f': 'mode', 'aria-label': 'Fixture ' + (i + 1) + ' mode' });
      Object.keys(D.PROFILES[f.type].modes).forEach((m) => { const o = node('option', { value: m }, D.PROFILES[f.type].modes[m].name); if (m === f.mode) o.selected = true; mode.appendChild(o); });
      tr.appendChild(td(mode));

      const uni = node('input', { 'data-f': 'universe', type: 'number', min: '1', max: '8', step: '1', inputmode: 'numeric', 'aria-label': 'Fixture ' + (i + 1) + ' universe' });
      uni.value = f.universe || 1;
      tr.appendChild(td(uni));

      const addr = node('input', { 'data-f': 'address', type: 'number', min: '1', max: '512', step: '1', inputmode: 'numeric', placeholder: '—', 'aria-label': 'Fixture ' + (i + 1) + ' start address' });
      addr.value = f.address === null || f.address === undefined ? '' : f.address;
      tr.appendChild(td(addr));

      tr.appendChild(node('td', { class: 'dmx-uses' }));
      const last = node('td');
      const st = node('span', { class: 'dmx-status' });
      st.append(node('b', { 'aria-hidden': 'true' }), node('span', { class: 'visually-hidden' }));
      const rm = node('button', { type: 'button', class: 'dmx-remove', 'aria-label': 'Remove ' + nameOf(f, i) }, '✕');
      rm.addEventListener('click', () => { state.patch.splice(i, 1); state.selected = -1; renderRows(); refresh(); });
      last.append(st, rm);
      tr.appendChild(last);

      tr.addEventListener('focusin', () => { if (state.selected !== i) { state.selected = i; refresh(); } });
      tr.addEventListener('click', () => { if (state.selected !== i) { state.selected = i; refresh(); } });
      rows.appendChild(tr);
    });
  }
  function td(child) { const c = node('td'); c.appendChild(child); return c; }

  rows.addEventListener('input', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const f = state.patch[Number(tr.dataset.i)];
    const field = e.target.dataset.f;
    if (field === 'label') f.label = e.target.value;
    else if (field === 'universe') f.universe = Math.max(1, Math.floor(toInt(e.target.value) || 1));
    else if (field === 'address') f.address = toInt(e.target.value);
    else return;
    refresh();
  });
  rows.addEventListener('change', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const i = Number(tr.dataset.i);
    const f = state.patch[i];
    if (e.target.dataset.f === 'type') { f.type = e.target.value; f.mode = D.firstMode(f.type); renderRows(); refresh(); rows.querySelector('tr[data-i="' + i + '"] select[data-f="type"]').focus(); }
    else if (e.target.dataset.f === 'mode') { f.mode = e.target.value; refresh(); }
  });

  /* ── refresh everything that is computed ── */
  let lastAnalysis = null;
  function refresh() {
    const r = D.analyze(state.patch);
    lastAnalysis = r;

    rows.querySelectorAll('tr').forEach((tr) => {
      const i = Number(tr.dataset.i);
      const f = state.patch[i];
      const s = D.span(f);
      const fx = r.fixtures[i];
      tr.classList.toggle('sel', i === state.selected);
      tr.querySelector('.dmx-uses').textContent = s ? s.start + '–' + s.end + ' (' + s.size + ')' : D.footprint(f.type, f.mode) + ' ch';
      const st = tr.querySelector('.dmx-status');
      st.dataset.s = fx.status;
      st.querySelector('b').textContent = STATUS_MARK[fx.status];
      st.querySelector('span').textContent = STATUS_WORD[fx.status];
      st.title = fx.notes.join('; ');
    });

    /* universe picker */
    const used = new Set([1]);
    state.patch.forEach((f) => used.add(f.universe || 1));
    const pick = $('map-universe');
    const want = Array.from(used).sort((a, b) => a - b);
    if (pick.options.length !== want.length || want.some((u, k) => Number(pick.options[k].value) !== u)) {
      pick.textContent = '';
      want.forEach((u) => pick.appendChild(node('option', { value: String(u) }, String(u))));
    }
    if (!used.has(state.universe)) state.universe = 1;
    pick.value = String(state.universe);

    /* map */
    const chMap = D.channelMap(state.patch, state.universe);
    const sel = state.selected >= 0 ? D.span(state.patch[state.selected]) : null;
    chMap.forEach((owners, k) => {
      const c = cells[k];
      const a = k + 1;
      c.className = 'dmx-cell' + (a % 10 === 1 ? ' tens' : '');
      c.style.removeProperty('--c');
      if (!owners) { c.title = 'Channel ' + a + ': free'; return; }
      const distinct = new Set(owners.map((o) => o.index));
      const doubled = distinct.size > 1 && owners.every((o) => {
        const f = state.patch[o.index], g = state.patch[owners[0].index];
        return f.type === g.type && f.mode === g.mode && f.address === g.address;
      });
      c.classList.add('used');
      if (distinct.size > 1 && !doubled) c.classList.add('clash');
      else c.style.setProperty('--c', colorOf(state.patch[owners[0].index]));
      if (owners.some((o) => o.offset === 1)) c.classList.add('start');
      if (sel && sel.universe === state.universe && a >= sel.start && a <= sel.end) c.classList.add('sel');
      c.title = 'Channel ' + a + ': ' + owners.map((o) => nameOf(state.patch[o.index], o.index) + ' · ' + o.param).join(' + ');
    });
    const n = r.usage[state.universe] || 0;
    $('map-usage').textContent = n + ' of 512 channels used · ' + (512 - n) + ' free';
    map.setAttribute('aria-label', 'Universe ' + state.universe + ' map: ' + n + ' of 512 channels used' +
      (r.issues.some((x) => x.kind === 'overlap' && x.universe === state.universe) ? ', with overlapping channels shown striped red' : ''));

    /* legend */
    const leg = $('dmx-legend');
    leg.textContent = '';
    TYPES.filter((t) => state.patch.some((f) => f.type === t)).forEach((t) => {
      const s = node('span'); const i = node('i'); i.style.setProperty('--c', D.PROFILES[t].color);
      s.append(i, document.createTextNode(D.PROFILES[t].short)); leg.appendChild(s);
    });
    if (r.issues.some((x) => x.kind === 'overlap')) {
      const s = node('span'); const i = node('i'); i.style.background = 'repeating-linear-gradient(45deg,#ff766c 0 3px,#7a1f1a 3px 6px)';
      s.append(i, document.createTextNode('Overlap')); leg.appendChild(s);
    }

    /* issues */
    const box = $('patch-issues');
    box.textContent = '';
    const faults = r.issues.filter((x) => x.level !== 'note');
    box.className = 'te-readout ' + (faults.length ? 'bad' : 'good');
    if (!state.patch.length) { box.className = 'te-readout'; box.textContent = 'No fixtures yet. Load the Pirates rig or add a fixture.'; }
    else if (!r.issues.length) box.textContent = 'Clean patch: every fixture has its own channels and fits inside its universe. Ready for focus call.';
    else {
      box.appendChild(node('strong', null, faults.length ? faults.length + (faults.length === 1 ? ' fault' : ' faults') + ' to fix before focus call:' : 'No faults. One thing to know:'));
      const ul = node('ul');
      r.issues.forEach((x) => ul.appendChild(node('li', null, (x.level === 'note' ? 'ℹ ' : x.level === 'warn' ? '! ' : '✕ ') + x.message)));
      box.appendChild(ul);
    }
    const score = $('dmx-score');
    score.dataset.state = state.patch.length ? (faults.length ? 'bad' : 'ok') : '';
    score.textContent = state.patch.length ? (faults.length ? faults.length + ' to fix' : 'Patch clean ✓') : '';

    lookup();
    renderSheet();
    save();
  }

  function lookup() {
    const a = toInt($('lookup-address').value);
    const out = $('lookup-result');
    cells.forEach((c) => c.classList.remove('look'));
    if (!Number.isInteger(a) || a < 1 || a > 512) { out.textContent = 'Pick a channel from 1 to 512.'; return; }
    cells[a - 1].classList.add('look');
    const owners = D.whoIs(state.patch, state.universe, a);
    if (!owners.length) {
      const free = D.nextFree(state.patch, state.universe, 1, a);
      out.textContent = 'Universe ' + state.universe + ', channel ' + a + ': nothing is listening. It is free.' + (free === a ? '' : '');
      return;
    }
    out.textContent = 'Universe ' + state.universe + ', channel ' + a + ': ' + owners.map((o) => {
      const f = state.patch[o.index];
      return nameOf(f, o.index) + ' → ' + o.param + ' (channel ' + o.offset + ' of ' + D.footprint(f.type, f.mode) + ')';
    }).join(' AND ') + (owners.length > 1 && new Set(owners.map((o) => o.param)).size > 1 ? '. Two fixtures want this channel for different jobs.' : '.');
  }
  $('lookup-address').addEventListener('input', lookup);
  $('map-universe').addEventListener('change', (e) => { state.universe = Number(e.target.value) || 1; refresh(); });

  /* ── patch sheet ── */
  function renderSheet() {
    const body = $('sheet-rows');
    body.textContent = '';
    state.patch.forEach((f, i) => {
      const s = D.span(f);
      const p = D.PROFILES[f.type];
      const dip = Number.isInteger(f.address) ? D.toDip(f.address) : null;
      const on = dip ? dip.map((b, k) => (b ? k + 1 : 0)).filter(Boolean).join(', ') : '—';
      const tr = node('tr');
      [String(i + 1), nameOf(f, i), p.short + ' · ' + p.modes[f.mode].name, String(f.universe || 1),
        s ? String(s.start) : '—', s ? s.start + '–' + s.end : '—', on].forEach((t) => tr.appendChild(node('td', null, t)));
      body.appendChild(tr);
    });
    if (!state.patch.length) { const tr = node('tr'); const c = node('td', { colspan: '7' }, 'No fixtures yet.'); tr.appendChild(c); body.appendChild(tr); }
  }
  ['production', 'names', 'revision'].forEach((k) => {
    const el = $('meta-' + k);
    el.value = (state.meta && state.meta[k]) || '';
    el.addEventListener('input', () => { state.meta = state.meta || {}; state.meta[k] = el.value; save(); });
  });
  $('print-sheet').addEventListener('click', () => window.print());

  /* ── toolbar ── */
  function hasWork() { return state.patch.length && JSON.stringify(state.patch) !== JSON.stringify(D.PIRATES_RIG); }
  function load(rig, msg) {
    if (hasWork() && !window.confirm(msg)) return;
    state.patch = clone(rig); state.selected = -1; state.universe = 1; renderRows(); refresh();
  }
  $('load-pirates').addEventListener('click', () => load(D.PIRATES_RIG, 'Replace your patch with the Pirates rig?'));
  $('load-broken').addEventListener('click', () => {
    load(D.BROKEN_RIG, 'Replace your patch with the rushed load-in?');
  });
  $('add-fixture').addEventListener('click', () => {
    const f = { label: '', type: 'par', mode: '5ch', universe: state.universe };
    f.address = D.nextFree(state.patch, state.universe, D.footprint(f.type, f.mode), 1, 10);
    state.patch.push(f);
    state.selected = state.patch.length - 1;
    renderRows(); refresh();
    const input = rows.querySelector('tr:last-child input[data-f="label"]');
    if (input) input.focus();
  });
  $('auto-patch').addEventListener('click', () => {
    state.patch = D.autoPatch(state.patch, { align: Number($('auto-align').value) || 1 });
    renderRows(); refresh();
  });
  $('clear-patch').addEventListener('click', () => {
    if (state.patch.length && !window.confirm('Remove every fixture from the patch?')) return;
    state.patch = []; state.selected = -1; renderRows(); refresh();
  });

  /* ── DIP switches ── */
  const bank = $('dip-bank');
  const dipButtons = [];
  for (let n = 0; n < D.DIP_SWITCHES; n++) {
    const b = node('button', { type: 'button', 'aria-pressed': 'false', 'aria-label': 'Switch ' + (n + 1) + ', worth ' + Math.pow(2, n) });
    b.append(node('span', { class: 'on' }, 'ON'), node('span', { class: 'slot' }), node('span', null, String(n + 1)));
    b.addEventListener('click', () => {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      if (target === null) $('dip-address').value = readDip() || '';
      showDip();
    });
    bank.appendChild(b); dipButtons.push(b);
  }
  let target = null;
  function readDip() { return D.fromDip(dipButtons.map((b) => b.getAttribute('aria-pressed') === 'true')); }
  function setDip(a) { const bits = D.toDip(a); dipButtons.forEach((b, n) => b.setAttribute('aria-pressed', bits && bits[n] ? 'true' : 'false')); }
  function showDip() {
    const v = readDip();
    const parts = dipButtons.map((b, n) => (b.getAttribute('aria-pressed') === 'true' ? Math.pow(2, n) : 0)).filter(Boolean);
    const sum = $('dip-sum');
    sum.textContent = (parts.length ? parts.join(' + ') : '0') + ' = ' + v + (v === 0 ? '  (0 is not a DMX address)' : '');
    if (target !== null) {
      sum.appendChild(document.createTextNode('   ·   Target ' + target + ' '));
      sum.appendChild(node('span', { class: v === target ? 'good' : 'bad' }, v === target ? '✓ set' : (v < target ? '(too low)' : '(too high)')));
    }
  }
  $('dip-address').addEventListener('input', () => {
    target = null; $('dip-check').hidden = true;
    const a = toInt($('dip-address').value);
    if (Number.isInteger(a) && a >= 1 && a <= 511) setDip(a);
    showDip();
  });
  $('dip-challenge').addEventListener('click', () => {
    const fromRig = state.patch.filter((f) => Number.isInteger(f.address) && f.address < 512 && f.address > 1);
    const pickRig = fromRig.length && Math.random() < 0.6;
    const f = pickRig ? fromRig[Math.floor(Math.random() * fromRig.length)] : null;
    target = f ? f.address : 2 + Math.floor(Math.random() * 509);
    setDip(0);
    $('dip-address').value = '';
    $('dip-sum').textContent = '';
    $('dip-check').hidden = false;
    $('dip-sum').append(document.createTextNode('Set the switches for ' + (f ? nameOf(f, state.patch.indexOf(f)) + ' at ' : 'address ') + target + '.'));
  });
  $('dip-check').addEventListener('click', showDip);

  /* ── data line ── */
  const svgNS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, text) { const n = document.createElementNS(svgNS, tag); Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k])); if (text !== undefined) n.textContent = text; return n; }
  function drawLine() {
    const line = {
      devices: Number($('line-devices').value), terminated: $('line-term').checked, cable: $('line-cable').value,
      split: $('line-split').value, lengthM: Number($('line-length').value),
    };
    $('line-devices-out').textContent = line.devices;
    $('line-length-out').textContent = line.lengthM + ' m';
    const svg = $('line-svg');
    Array.from(svg.childNodes).forEach((c) => { if (c.nodeName !== 'title') svg.removeChild(c); });
    const cableColor = line.cable === 'mic' ? '#ffcc66' : '#59c8d8';
    svg.appendChild(el('rect', { x: 10, y: 60, width: 70, height: 46, rx: 6, fill: '#1f2f44', stroke: '#6a7d93' }));
    svg.appendChild(el('text', { x: 45, y: 81, 'text-anchor': 'middle' }, 'Console'));
    svg.appendChild(el('text', { x: 45, y: 96, 'text-anchor': 'middle' }, 'DMX OUT'));
    const branches = line.split === 'none' ? [83] : [45, 125];
    const perBranch = line.split === 'none' ? [line.devices] : [Math.ceil(line.devices / 2), Math.floor(line.devices / 2)];
    if (line.split !== 'none') {
      const bx = 110;
      svg.appendChild(el('path', { d: 'M80 83 H' + bx, stroke: cableColor, 'stroke-width': 3, fill: 'none' }));
      if (line.split === 'opto') {
        svg.appendChild(el('rect', { x: bx, y: 58, width: 40, height: 50, rx: 5, fill: '#1e4a33', stroke: '#66d28a' }));
        svg.appendChild(el('text', { x: bx + 20, y: 87, 'text-anchor': 'middle' }, 'Opto'));
      } else {
        svg.appendChild(el('circle', { cx: bx + 20, cy: 83, r: 7, fill: '#ff766c' }));
        svg.appendChild(el('text', { x: bx + 20, y: 125, 'text-anchor': 'middle' }, 'Y'));
      }
    }
    branches.forEach((y, bi) => {
      const count = perBranch[bi];
      const shown = Math.min(count, 10);
      const x0 = line.split === 'none' ? 80 : 150;
      const step = (600 - x0) / (shown + 1.2);
      svg.appendChild(el('path', { d: 'M' + x0 + ' 83 ' + (line.split === 'none' ? '' : 'V' + y) + ' H' + (x0 + step * shown + 14), stroke: cableColor, 'stroke-width': 3, fill: 'none' }));
      for (let k = 0; k < shown; k++) {
        const x = x0 + step * (k + 1);
        const over = (k + 1) > 32;
        svg.appendChild(el('rect', { x: x - 11, y: y - 11, width: 22, height: 22, rx: 4, fill: over ? '#5a2420' : '#ff8aa8', stroke: '#0b121b' }));
      }
      const endX = x0 + step * shown + 14;
      if (count > shown) svg.appendChild(el('text', { x: endX - step / 2, y: y - 18, 'text-anchor': 'middle' }, '+' + (count - shown) + ' more'));
      if (line.terminated) {
        svg.appendChild(el('rect', { x: endX, y: y - 7, width: 22, height: 14, rx: 3, fill: '#66d28a' }));
        svg.appendChild(el('text', { x: endX + 11, y: y + 26, 'text-anchor': 'middle' }, '120 Ω'));
      } else {
        svg.appendChild(el('text', { x: endX + 14, y: y + 4, fill: '#ffcc66' }, '⟲ open end'));
      }
    });
    svg.appendChild(el('text', { x: 320, y: 162, 'text-anchor': 'middle' }, line.devices + ' fixtures · ' + line.lengthM + ' m of ' + (line.cable === 'mic' ? 'mic cable' : 'DMX cable')));

    const check = D.checkLine(Object.assign({}, line, { devices: line.split === 'opto' ? Math.max.apply(null, perBranch) : line.devices }));
    const out = $('line-verdict');
    out.textContent = '';
    out.className = 'te-readout ' + (check.ok ? 'good' : check.issues.some((i) => i.level === 'error') ? 'bad' : 'warn');
    if (check.ok) out.textContent = 'Solid line. ' + (line.split === 'opto' ? 'The opto-splitter makes each pipe its own line, so each side counts its own 32. ' : '') + 'Every fixture sees a clean signal.';
    else check.issues.forEach((i) => { out.appendChild(node('p', null, (i.level === 'error' ? '✕ ' : '! ') + i.message)); });
  }
  ['line-devices', 'line-cable', 'line-split', 'line-length', 'line-term'].forEach((id) => $(id).addEventListener('input', drawLine));
  ['line-cable', 'line-split', 'line-term'].forEach((id) => $(id).addEventListener('change', drawLine));

  function drawRate() {
    const n = Number($('rate-slots').value);
    $('rate-slots-out').textContent = n;
    const t = D.frameTiming(n);
    $('rate-out').textContent = 'One packet takes ' + (t.us / 1000).toFixed(2) + ' ms (176 µs break + 12 µs mark + ' + (n + 1) + ' × 44 µs), so the console refreshes every light ' +
      t.hz.toFixed(1) + ' times a second. ' + (n === 512 ? 'A full universe is about 44 Hz: smooth enough that a slow fade never looks stepped.' : 'Sending fewer channels makes the refresh faster.');
  }
  $('rate-slots').addEventListener('input', drawRate);

  /* ── go ── */
  renderRows();
  refresh();
  setDip(37);
  showDip();
  drawLine();
  drawRate();
})();
