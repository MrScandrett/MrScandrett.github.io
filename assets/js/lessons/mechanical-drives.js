/* Mechanical Drives lesson UI: the Drive Explorer (one animated drawing per drive, with live numbers from
 * mechanical-drives-core.js) and the "narrow down the best drive" picker.
 * Page: lessons/engineering/mechanical-and-civil-design/mechanical-drives.html
 *
 * Drawings work in a 760 × 380 logical canvas. Toothed drives derive the driven angle from the driver angle,
 * so teeth stay in mesh; slipping drives (belts, cones) integrate the driven angle so slip shows.
 * Visual speeds are slowed (a 1200 rpm motor turns the drawing about once every two seconds), but every
 * ratio and direction is the real one.
 */
(function () {
  'use strict';
  const M = window.MechanicalDrives;
  const SCRIPT_URL = document.currentScript && document.currentScript.src;
  const root = document.querySelector('[data-md-explorer]');
  if (!M || !root) return;

  const TAU = Math.PI * 2;
  const W = 760, H = 380;
  const C = {
    bg: '#132131', grid: 'rgba(120, 170, 210, .08)', steel: '#9fb3c8', steelDark: '#5d7186', dark: '#0c1520',
    ink: '#dbe7f1', muted: '#8ea4b8', inp: '#ff9a3c', out: '#5cc8f0', third: '#9ad46a', warn: '#ff6b6b', brass: '#d9a441', oil: '#c98a2b'
  };

  const $ = (sel) => root.querySelector(sel);
  const canvas = $('#md-canvas');
  const famBar = $('#md-families');
  const driveBar = $('#md-drives');
  const paramBox = $('#md-params');
  const rpmIn = $('#md-rpm'), torqueIn = $('#md-torque');
  const holdBtn = $('#md-hold');
  const live = $('#md-live');

  /* drives you can print: explorer drive id → Forge part id */
  const FORGE = { spur: 'gears', helical: 'helical', bevel: 'bevel', worm: 'worm', planetary: 'planetary', rack: 'rack', cycloidal: 'cycloidal', leadscrew: 'leadscrew' };
  const forgeBase = (document.querySelector('link[rel="icon"]')?.getAttribute('href') || '../../../assets/images/favicon.svg').replace(/assets\/images\/favicon\.svg$/, '') + 'forge.html?part=';

  const state = {
    id: 'spur', params: M.defaults('spur'), rpm: 1200, torque: 2,
    th: 0, dir: 1, s: 0, out: 0, belt: 0, pos: 0.5, holdMode: false, holdT: 0, result: null
  };

  /* ───────── controls ───────── */
  function fmt(n, d) {
    if (!isFinite(n)) return '—';
    const a = Math.abs(n);
    if (a >= 10000) return Math.round(n).toLocaleString('en-US');
    if (d != null) return n.toFixed(d);
    return a >= 100 ? n.toFixed(0) : a >= 10 ? n.toFixed(1) : n.toFixed(2);
  }

  function buildFamilies() {
    famBar.innerHTML = '';
    for (const f of M.FAMILIES) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'md-fam'; b.dataset.mdFamily = f.id;
      b.textContent = f.short; b.title = f.note;
      b.addEventListener('click', () => { const first = M.DRIVES.find((d) => d.family === f.id); select(first.id); });
      famBar.appendChild(b);
    }
  }

  function buildDrives() {
    const fam = M.get(state.id).family;
    driveBar.innerHTML = '';
    for (const d of M.DRIVES.filter((x) => x.family === fam)) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'md-drive'; b.dataset.mdDrive = d.id;
      b.setAttribute('aria-pressed', String(d.id === state.id));
      b.textContent = d.name.replace(/ \(.*\)/, '');
      b.addEventListener('click', () => select(d.id));
      driveBar.appendChild(b);
    }
    for (const b of famBar.children) b.setAttribute('aria-pressed', String(b.dataset.mdFamily === fam));
  }

  function buildParams() {
    const d = M.get(state.id);
    paramBox.innerHTML = '';
    if (!d.params.length) {
      paramBox.innerHTML = '<p class="md-note">No ratio to set: the motor shaft <em>is</em> the output shaft.</p>';
      return;
    }
    for (const p of d.params) {
      const id = 'md-p-' + p.key;
      const wrap = document.createElement('label');
      wrap.className = 'md-field';
      wrap.htmlFor = id;
      if (p.type === 'choice') {
        wrap.innerHTML = `<span>${p.label}</span>`;
        const sel = document.createElement('select');
        sel.id = id;
        for (const [v, label] of p.options) {
          const o = document.createElement('option'); o.value = String(v); o.textContent = label;
          if (v === state.params[p.key]) o.selected = true;
          sel.appendChild(o);
        }
        sel.addEventListener('change', () => {
          const opt = p.options.find((o) => String(o[0]) === sel.value);
          state.params[p.key] = opt[0]; update();
        });
        wrap.appendChild(sel);
      } else {
        wrap.innerHTML = `<span>${p.label} <output id="${id}-o">${state.params[p.key]} ${p.unit}</output></span>`;
        const r = document.createElement('input');
        Object.assign(r, { type: 'range', id, min: p.min, max: p.max, step: p.step, value: state.params[p.key] });
        r.addEventListener('input', () => {
          state.params[p.key] = Number(r.value);
          wrap.querySelector('output').textContent = r.value + ' ' + p.unit; update();
        });
        wrap.appendChild(r);
      }
      paramBox.appendChild(wrap);
    }
  }

  function select(id, opts) {
    state.id = id;
    state.params = M.defaults(id);
    state.th = 0; state.s = 0; state.out = 0; state.belt = 0; state.dir = 1; state.holdMode = false; state.pos = 300;
    buildDrives(); buildParams(); update();
    if (!(opts && opts.quiet)) live.textContent = M.get(id).name + ' selected.';
  }

  rpmIn.addEventListener('input', () => { state.rpm = Number(rpmIn.value); $('#md-rpm-o').textContent = state.rpm + ' rpm'; update(); });
  torqueIn.addEventListener('input', () => { state.torque = Number(torqueIn.value); $('#md-torque-o').textContent = state.torque.toFixed(1) + ' N·m'; update(); });
  holdBtn.addEventListener('click', () => {
    state.holdMode = !state.holdMode; state.holdT = 0;
    update();
    live.textContent = state.holdMode ? holdText() : 'Motor back on.';
  });

  function holdText() {
    const h = state.result.hold;
    return (h.holds ? 'It holds. ' : 'It slips back. ') + h.why;
  }

  function update() {
    const d = M.get(state.id);
    const r = state.result = M.compute(state.id, state.params, { rpm: state.rpm, torque: state.torque });
    const g = r.geometry;
    const rows = [];
    rows.push(['Motor in', `${fmt(state.rpm, 0)} rpm × ${fmt(state.torque, 1)} N·m = ${fmt(r.powerIn, 0)} W`]);
    if (r.output === 'rotary') {
      rows.push(['Ratio', `${fmt(g.ratio, g.ratio < 10 ? 2 : 1)} : 1${g.ratio < 1 ? ' (speeds up)' : ''}`]);
      rows.push(['Output speed', `${fmt(r.outRpm)} rpm${r.reverse ? ' · turns the other way' : ''}${g.turn90 ? ' · shaft turned 90°' : ''}`]);
      rows.push(['Output torque', `${fmt(r.outTorque)} N·m`]);
    } else if (state.id === 'hydraulic') {
      rows.push(['Oil pressure', `${fmt(r.pressureBar, 0)} bar (${fmt(r.pressureBar * 14.5, 0)} psi)`]);
      rows.push(['Piston speed', `${fmt(r.speed)} mm/s`]);
      rows.push(['Push force', `${fmt(r.force, 0)} N ≈ ${fmt(r.force / 9.81, 0)} kg lifted`]);
    } else {
      rows.push(['Travel per turn', `${fmt(g.travel)} mm`]);
      rows.push(['Linear speed', `${fmt(r.speed)} mm/s`]);
      rows.push(['Push force', `${fmt(r.force, 0)} N ≈ ${fmt(r.force / 9.81, 0)} kg lifted`]);
    }
    rows.push(['Efficiency', `${fmt(r.eff * 100, 0)} %${g.leadAngle != null ? ` (lead angle ${fmt(g.leadAngle, 1)}°)` : ''}`]);
    rows.push(['Lost as heat', `${fmt(r.heat, r.heat < 10 ? 1 : 0)} W`]);
    rows.push(['Backlash / slip', r.slipping ? `SLIPPING (${fmt(r.slip * 100, 0)} %): the belt is protecting the motor` : (d.slips ? `${d.backlash} · creeps ${fmt(r.slip * 100, 1)} %` : d.backlash)]);
    rows.push(['Motor off, load on', r.hold.holds ? 'Holds its position' : 'Back-drives (needs a brake)']);
    $('#md-readout').innerHTML = rows.map(([k, v]) => `<div${k === 'Backlash / slip' && r.slipping ? ' class="md-alert"' : ''}><dt>${k}</dt><dd>${v}</dd></div>`).join('');

    $('#md-name').textContent = d.name;
    $('#md-motion').textContent = `${d.motion} · typical efficiency ${Math.round(d.eff[0] * 100)}–${Math.round(d.eff[1] * 100)} %`;
    $('#md-summary').textContent = d.summary;
    $('#md-seen').textContent = d.seen;
    $('#md-watch').textContent = d.watch;
    const fp = $('#md-forge');
    sync3d();
    if (FORGE[state.id]) { fp.hidden = false; fp.href = forgeBase + FORGE[state.id]; fp.textContent = `Print a working ${d.name.replace(/ \(.*\)/, '').toLowerCase()} in Forge →`; }
    else { fp.hidden = true; }
    holdBtn.textContent = state.holdMode ? 'Motor back on' : 'Hold test: cut the motor';
    holdBtn.setAttribute('aria-pressed', String(state.holdMode));
    $('#md-hold-result').textContent = state.holdMode ? holdText() : '';
    canvas.setAttribute('aria-label', `${d.name} animation. ${rows.map((x) => x.join(': ')).join('. ')}.`);
  }

  /* ───────── the printable part in 3D (Forge's own parts, assembled and running) ───────── */
  const near = (v, list) => list.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function forgeParams(id, q) {
    switch (id) {
      case 'spur': return { teethA: 12, teethB: q.driven, board: false };
      case 'helical': return { teethA: 12, teethB: q.driven, helix: clamp(q.helix, 10, 40), style: 'helical', board: false };
      case 'bevel': return { teethA: 15, teethB: q.driven };
      case 'worm': return { teeth: clamp(q.teeth, 16, 50), starts: String(Math.min(2, q.starts)) };
      case 'planetary': {
        const sun = near(q.sun, [12, 18, 24, 30]);           // Forge needs planets in multiples of 3 for even spacing
        return { module: '1', sun, planet: (72 - sun) / 2 > 30 ? 30 : (72 - sun) / 2 };
      }
      case 'rack': return { pinion: q.pinion, rackTeeth: 18 };
      case 'cycloidal': return { lobes: clamp(q.lobes, 7, 23) };
      case 'leadscrew': return { pitch: clamp(q.lead, 3, 8) };
      default: return null;
    }
  }
  const view3d = { host: root.querySelector('#md-3d'), none: root.querySelector('#md-3d-none'), play: root.querySelector('#md-3d-play'), viewer: null, loading: false, wanted: false, timer: 0 };
  function sync3d() {
    if (!view3d.host) return;
    const has = Boolean(FORGE[state.id]);
    view3d.host.hidden = !has; view3d.play.hidden = !has; view3d.none.hidden = has;
    if (!has || !view3d.wanted) return;
    if (!view3d.viewer) { load3d(); return; }
    const params = forgeParams(state.id, state.params);
    const key = FORGE[state.id] + JSON.stringify(params);
    if (key === view3d.key) return;                 // motor speed and torque do not change the part
    view3d.key = key;
    clearTimeout(view3d.timer);
    view3d.timer = setTimeout(() => view3d.viewer.show(FORGE[state.id], params), 250);
  }
  function load3d() {
    if (view3d.loading || !SCRIPT_URL) return;
    view3d.loading = true;
    import(new URL('../forge/part-viewer.mjs', SCRIPT_URL).href)
      .then(({ mountPartViewer }) => mountPartViewer(view3d.host, { partId: FORGE[state.id] || null, params: FORGE[state.id] ? forgeParams(state.id, state.params) : {} }))
      .then((viewer) => { view3d.viewer = viewer; view3d.key = FORGE[state.id] + JSON.stringify(forgeParams(state.id, state.params)); sync3d(); })
      .catch(() => { view3d.host.textContent = 'The 3D view could not start in this browser.'; });
  }
  if (view3d.host) {
    view3d.play.addEventListener('click', () => {
      if (!view3d.viewer) return;
      view3d.viewer.setPlaying(!view3d.viewer.playing);
      view3d.play.textContent = view3d.viewer.playing ? 'Pause' : 'Play';
      view3d.play.setAttribute('aria-pressed', String(view3d.viewer.playing));
    });
    // the 3D engine is about 1.4 MB, so only fetch it once the panel is close to the screen
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); view3d.wanted = true; sync3d(); }
    }, { rootMargin: '200px' });
    io.observe(root.querySelector('#md-3d-wrap'));
  }

  /* ───────── drawing helpers ───────── */
  let ctx = null, scale = 1;
  const view = SimKit.canvas2d(canvas, {
    onResize(c, w, h) { ctx = c; scale = Math.min(w / W, h / H); }
  });
  ctx = view.ctx;

  function gearPath(cx, cy, z, m, ang, internal) {
    const r = m * z / 2, p = TAU / z;
    const tip = internal ? r - m : r + m, root = internal ? r + 1.25 * m : r - 1.25 * m;
    ctx.beginPath();
    for (let k = 0; k < z; k++) {
      const a = ang + k * p;
      const pts = [[a - p * 0.5, root], [a - p * 0.27, root], [a - p * 0.15, tip], [a + p * 0.15, tip], [a + p * 0.27, root]];
      for (let i = 0; i < pts.length; i++) {
        const [aa, rr] = pts[i];
        const x = cx + rr * Math.cos(aa), y = cy + rr * Math.sin(aa);
        if (k === 0 && i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    return r;
  }

  function gear(cx, cy, z, m, ang, color, opts) {
    const o = opts || {};
    const r = m * z / 2;
    ctx.save();
    gearPath(cx, cy, z, m, ang, false);
    ctx.fillStyle = color; ctx.globalAlpha = o.alpha || 1; ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = C.dark; ctx.lineWidth = 1.2; ctx.stroke();
    // web and hub
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(4, r - 2.6 * m), 0, TAU);
    ctx.fillStyle = 'rgba(12, 21, 32, .35)'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(3, Math.min(10, r * 0.22)), 0, TAU);
    ctx.fillStyle = C.dark; ctx.fill();
    if (!o.noMark) {
      const mr = r - 1.6 * m;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + mr * Math.cos(ang), cy + mr * Math.sin(ang));
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + mr * Math.cos(ang), cy + mr * Math.sin(ang), 3.2, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
    }
    ctx.restore();
    return r;
  }

  function ringGear(cx, cy, z, m, ang, color) {
    const r = m * z / 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r + 3.2 * m, 0, TAU);
    gearPath(cx, cy, z, m, ang, true);
    ctx.fillStyle = color; ctx.fill('evenodd');
    ctx.strokeStyle = C.dark; ctx.lineWidth = 1.2; ctx.stroke();
    const mr = r + 2.2 * m;
    ctx.beginPath(); ctx.arc(cx + mr * Math.cos(ang), cy + mr * Math.sin(ang), 3.4, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
  }

  function label(text, x, y, color, align) {
    ctx.save();
    ctx.font = '600 12px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 10;
    const x0 = ctx.textAlign === 'center' ? x - w / 2 : ctx.textAlign === 'right' ? x - w : x;
    ctx.fillStyle = 'rgba(12, 21, 32, .78)';
    ctx.fillRect(x0 - (ctx.textAlign === 'left' ? 5 : 0), y - 9, w, 18);
    ctx.fillStyle = color || C.ink;
    ctx.fillText(text, x + (ctx.textAlign === 'left' ? 0 : 0), y + 0.5);
    ctx.restore();
  }

  function dial(x, y, ang, color, text) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, 20, 0, TAU); ctx.fillStyle = C.dark; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    for (let k = 0; k < 12; k++) {
      const a = k * TAU / 12;
      ctx.beginPath(); ctx.moveTo(x + 15 * Math.cos(a), y + 15 * Math.sin(a)); ctx.lineTo(x + 18 * Math.cos(a), y + 18 * Math.sin(a));
      ctx.strokeStyle = C.steelDark; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 16 * Math.cos(ang), y + 16 * Math.sin(ang));
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
    label(text, x, y + 32, color);
  }

  function motor(x, y, ang, h) {
    const hh = h || 56;
    ctx.save();
    ctx.fillStyle = '#2b3b4d'; ctx.strokeStyle = C.steelDark; ctx.lineWidth = 1.5;
    ctx.fillRect(x - 64, y - hh / 2, 58, hh); ctx.strokeRect(x - 64, y - hh / 2, 58, hh);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#22303f'; ctx.fillRect(x - 60 + i * 9, y - hh / 2 - 5, 5, hh + 10); }
    ctx.fillStyle = C.inp; ctx.fillRect(x - 6, y - 4, 10, 8);
    ctx.font = '700 10px ui-monospace, monospace'; ctx.fillStyle = C.ink; ctx.textAlign = 'center';
    ctx.fillText('MOTOR', x - 35, y + 4);
    ctx.restore();
    // spinning shaft collar
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x + 4, y, 4, 9, 0, 0, TAU); ctx.fillStyle = C.inp; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 4, y); ctx.lineTo(x + 4 + 3 * Math.cos(ang), y + 8 * Math.sin(ang));
    ctx.strokeStyle = C.dark; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  function shaft(x0, y0, x1, y1, color, w) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
  }

  /* Side view of a turning cylinder: stripes at y = r·sin(φ), only the front half (cos φ > 0). */
  function spinStripes(x0, x1, yc, r, ang, n, color, slant) {
    ctx.save();
    for (let k = 0; k < n; k++) {
      const a = ang + k * TAU / n;
      if (Math.cos(a) <= 0) continue;
      const y = yc + r * Math.sin(a);
      ctx.globalAlpha = 0.35 + 0.6 * Math.cos(a);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y + (slant || 0)); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
  }

  /* Screw thread side view: slanted stripes that slide along the axis as it turns. */
  function screw(x0, x1, yc, r, pitch, ang, color) {
    ctx.save();
    const g = ctx.createLinearGradient(0, yc - r, 0, yc + r);
    g.addColorStop(0, '#6f8398'); g.addColorStop(0.45, '#c5d3e0'); g.addColorStop(1, '#4b5d70');
    ctx.fillStyle = g; ctx.fillRect(x0, yc - r, x1 - x0, 2 * r);
    ctx.beginPath(); ctx.rect(x0, yc - r, x1 - x0, 2 * r); ctx.clip();
    const off = ((ang / TAU) * pitch) % pitch;
    ctx.strokeStyle = color || 'rgba(20, 32, 46, .75)'; ctx.lineWidth = Math.max(1.5, Math.min(4, pitch * 0.25));
    for (let x = x0 - pitch * 2 + off; x < x1 + pitch * 2; x += pitch) {
      ctx.beginPath(); ctx.moveTo(x, yc - r); ctx.lineTo(x + pitch * 0.5, yc + r); ctx.stroke();
    }
    ctx.restore();
  }

  function belt(c1, r1, c2, r2) {
    const dx = c2[0] - c1[0], dy = c2[1] - c1[1], d = Math.hypot(dx, dy), g = Math.atan2(dy, dx);
    const phi = Math.acos((r1 - r2) / d);
    const P = (c, r, a) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
    const a1 = g - phi, a2 = g + phi;
    const segs = [
      { kind: 'line', p: P(c1, r1, a1), q: P(c2, r2, a1) },
      { kind: 'arc', c: c2, r: r2, from: a1, sweep: 2 * phi },
      { kind: 'line', p: P(c2, r2, a2), q: P(c1, r1, a2) },
      { kind: 'arc', c: c1, r: r1, from: a2, sweep: TAU - 2 * phi }
    ];
    for (const s of segs) s.len = s.kind === 'line' ? Math.hypot(s.q[0] - s.p[0], s.q[1] - s.p[1]) : s.r * s.sweep;
    const total = segs.reduce((a, s) => a + s.len, 0);
    return {
      total,
      stroke(width, color) {
        ctx.save(); ctx.beginPath();
        ctx.moveTo(segs[0].p[0], segs[0].p[1]); ctx.lineTo(segs[0].q[0], segs[0].q[1]);
        ctx.arc(c2[0], c2[1], r2, a1, a2);
        ctx.lineTo(segs[2].q[0], segs[2].q[1]);
        ctx.arc(c1[0], c1[1], r1, a2, a1 + TAU);
        ctx.closePath(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
      },
      at(s) {
        s = ((s % total) + total) % total;
        for (const seg of segs) {
          if (s <= seg.len) {
            if (seg.kind === 'line') {
              const t = s / seg.len, ang = Math.atan2(seg.q[1] - seg.p[1], seg.q[0] - seg.p[0]);
              return { x: seg.p[0] + (seg.q[0] - seg.p[0]) * t, y: seg.p[1] + (seg.q[1] - seg.p[1]) * t, ang, nx: Math.cos(ang - Math.PI / 2), ny: Math.sin(ang - Math.PI / 2) };
            }
            const a = seg.from + s / seg.r;
            return { x: seg.c[0] + seg.r * Math.cos(a), y: seg.c[1] + seg.r * Math.sin(a), ang: a + Math.PI / 2, nx: Math.cos(a), ny: Math.sin(a) };
          }
          s -= seg.len;
        }
        return { x: segs[0].p[0], y: segs[0].p[1], ang: 0, nx: 0, ny: -1 };
      }
    };
  }

  function pulley(cx, cy, r, ang, color, grooved) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = C.dark; ctx.lineWidth = 1.2; ctx.stroke();
    if (grooved) { ctx.beginPath(); ctx.arc(cx, cy, r - 5, 0, TAU); ctx.strokeStyle = 'rgba(12,21,32,.5)'; ctx.lineWidth = 2; ctx.stroke(); }
    for (let k = 0; k < 5; k++) {
      const a = ang + k * TAU / 5;
      ctx.beginPath(); ctx.moveTo(cx + 0.25 * r * Math.cos(a), cy + 0.25 * r * Math.sin(a)); ctx.lineTo(cx + (r - 8) * Math.cos(a), cy + (r - 8) * Math.sin(a));
      ctx.strokeStyle = 'rgba(12, 21, 32, .45)'; ctx.lineWidth = Math.max(3, r * 0.12); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(4, r * 0.2), 0, TAU); ctx.fillStyle = C.dark; ctx.fill();
    ctx.beginPath(); ctx.arc(cx + (r - 4) * Math.cos(ang), cy + (r - 4) * Math.sin(ang), 3, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
  }

  function stamp(text, color) {
    ctx.save();
    ctx.translate(W - 120, 40); ctx.rotate(-0.08);
    ctx.font = '800 20px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 22;
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(-w / 2, -17, w, 34);
    ctx.fillStyle = color; ctx.fillText(text, 0, 1);
    ctx.restore();
  }

  /* ───────── one drawing per drive ───────── */
  const draw = {};

  function faceGears(z1, z2, helix) {
    const m = 4.2, r1 = m * z1 / 2, r2 = m * z2 / 2, cy = 160;
    const cx1 = W / 2 - (r1 + r2) / 2 - 40, cx2 = cx1 + r1 + r2;
    const a1 = state.th, a2 = Math.PI - Math.PI / z2 - a1 * z1 / z2;
    gear(cx1, cy, z1, m, a1, C.inp);
    gear(cx2, cy, z2, m, a2, C.out);
    label('DRIVER · 12 teeth', cx1, cy - r1 - 24, C.inp);
    label(`DRIVEN · ${z2} teeth`, cx2, cy + r2 + 22, C.out);
    // edge view underneath: what the teeth look like across the face
    const y0 = 318, fw = 30;
    ctx.save();
    ctx.fillStyle = '#7a5520'; ctx.fillRect(cx1 - r1, y0, 2 * r1, fw); ctx.fillStyle = '#21566d'; ctx.fillRect(cx2 - r2, y0, 2 * r2, fw);
    const sl = helix ? Math.tan(helix * Math.PI / 180) * fw : 0;
    const strip = (cx, r, z, ang, hand, col) => {
      ctx.save(); ctx.beginPath(); ctx.rect(cx - r, y0, 2 * r, fw); ctx.clip();
      for (let k = 0; k < z; k++) {
        const a = ang + k * TAU / z;
        if (Math.sin(a) <= 0) continue;              // the half facing us (the bottom of the face view)
        const x = cx + r * Math.cos(a);
        ctx.beginPath(); ctx.moveTo(x - hand * sl / 2, y0); ctx.lineTo(x + hand * sl / 2, y0 + fw);
        ctx.strokeStyle = col; ctx.globalAlpha = 0.35 + 0.65 * Math.sin(a); ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.restore();
    };
    strip(cx1, r1, z1, a1, 1, '#ffd39b'); strip(cx2, r2, z2, a2, -1, '#bfeaff');
    ctx.restore();
    label(helix ? `Seen from below: teeth slanted ${helix}° (one gear left-hand, one right-hand)` : 'Seen from below: straight teeth, each one meets the other all at once', W / 2 - 40, y0 - 14, C.muted);
    return { cx2, r2 };
  }

  draw.spur = () => { faceGears(12, state.params.driven, 0); dials(state.th, -state.th * 12 / state.params.driven); };
  draw.helical = () => {
    const { cx2 } = faceGears(12, state.params.driven, state.params.helix);
    label('↔ side thrust', cx2 + 60, 120, C.warn);
    dials(state.th, -state.th * 12 / state.params.driven);
  };

  draw.bevel = () => {
    const z1 = 15, z2 = state.params.driven;
    const a1 = Math.atan(z1 / z2), a2 = Math.PI / 2 - a1;
    const ax = 420, ay = 110;                  // apex, where the two cone axes meet
    const face = 0.32;
    const pinion = (t) => t * Math.tan(a1);     // pinion radius at distance t from the apex (axis toward −x)
    const gearR = (t) => t * Math.tan(a2);      // gear radius at distance t (axis toward +y)
    // both cones share one slant length S along the line where they touch
    const S = Math.min(200, 120 + 2.4 * z2), S0 = S * (1 - face);
    const p0 = S0 * Math.cos(a1), p1 = S * Math.cos(a1);          // pinion axial positions
    const g0 = S0 * Math.cos(a2), g1 = S * Math.cos(a2);          // gear axial positions
    // shafts
    shaft(ax - p1 - 130, ay, ax - p0, ay, C.inp, 8);
    shaft(ax, ay + g0, ax, ay + g1 + 110, C.out, 8);
    motor(ax - p1 - 130, ay, state.th);
    // pinion frustum
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ax - p0, ay - pinion(p0)); ctx.lineTo(ax - p1, ay - pinion(p1)); ctx.lineTo(ax - p1, ay + pinion(p1)); ctx.lineTo(ax - p0, ay + pinion(p0)); ctx.closePath();
    ctx.fillStyle = '#a8681e'; ctx.fill(); ctx.strokeStyle = C.dark; ctx.stroke();
    ctx.clip();
    for (let k = 0; k < z1; k++) {
      const a = state.th + k * TAU / z1; if (Math.cos(a) <= 0) continue;
      ctx.beginPath(); ctx.moveTo(ax - p0, ay + pinion(p0) * Math.sin(a)); ctx.lineTo(ax - p1, ay + pinion(p1) * Math.sin(a));
      ctx.strokeStyle = '#ffd39b'; ctx.globalAlpha = 0.3 + 0.7 * Math.cos(a); ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    // gear frustum
    const ga = -state.th * z1 / z2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ax - gearR(g0), ay + g0); ctx.lineTo(ax - gearR(g1), ay + g1); ctx.lineTo(ax + gearR(g1), ay + g1); ctx.lineTo(ax + gearR(g0), ay + g0); ctx.closePath();
    ctx.fillStyle = '#1f5f7a'; ctx.fill(); ctx.strokeStyle = C.dark; ctx.stroke();
    ctx.clip();
    for (let k = 0; k < z2; k++) {
      const a = ga + k * TAU / z2; if (Math.cos(a) <= 0) continue;
      ctx.beginPath(); ctx.moveTo(ax + gearR(g0) * Math.sin(a), ay + g0); ctx.lineTo(ax + gearR(g1) * Math.sin(a), ay + g1);
      ctx.strokeStyle = '#bfeaff'; ctx.globalAlpha = 0.3 + 0.7 * Math.cos(a); ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = C.muted;
    ctx.beginPath(); ctx.moveTo(ax - p0, ay); ctx.lineTo(ax + 30, ay); ctx.moveTo(ax, ay + g0); ctx.lineTo(ax, ay - 30); ctx.stroke(); ctx.restore();
    label('apex: both axes point here', ax + 34, ay - 30, C.muted, 'left');
    label(`PINION · ${z1} teeth`, ax - p1 + 10, ay - pinion(p1) - 16, C.inp);
    label(`GEAR · ${z2} teeth`, ax + gearR(g1) + 10, ay + g1 + 22, C.out, 'left');
    dials(state.th, ga);
  };

  draw.worm = () => {
    const z = state.params.teeth, starts = state.params.starts;
    const m = 3.4, R = m * z / 2, pitch = Math.PI * m, lead = pitch * starts;
    const wy = 92, wr = 22, cx = 400, cy = wy + wr + R - m * 0.4;
    const travel = state.th / TAU * lead;
    const wa = -Math.PI / 2 - travel / R;      // wheel angle so its top teeth follow the thread
    gear(cx, cy, z, m, wa + Math.PI / z, C.out);
    // worm on top
    shaft(110, wy, 650, wy, C.inp, 8);
    motor(110, wy, state.th);
    ctx.save();
    const g = ctx.createLinearGradient(0, wy - wr, 0, wy + wr);
    g.addColorStop(0, '#b06a1a'); g.addColorStop(0.45, '#ffc078'); g.addColorStop(1, '#7a4510');
    ctx.fillStyle = g; ctx.fillRect(cx - 120, wy - wr, 240, 2 * wr);
    ctx.beginPath(); ctx.rect(cx - 120, wy - wr, 240, 2 * wr); ctx.clip();
    const off = ((-travel % pitch) + pitch) % pitch;
    ctx.strokeStyle = 'rgba(50, 25, 5, .8)'; ctx.lineWidth = 3;
    for (let x = cx - 120 - pitch * 3 + off; x < cx + 140; x += pitch) {
      ctx.beginPath(); ctx.moveTo(x, wy - wr); ctx.lineTo(x + lead * 0.5, wy + wr); ctx.stroke();
    }
    ctx.restore();
    label(`WORM · ${starts} start${starts > 1 ? 's' : ''}`, cx - 175, wy - 36, C.inp);
    label(`WORM WHEEL · ${z} teeth`, cx, Math.min(H - 70, cy + R + 22), C.out);
    label('the thread slides across the teeth → heat', cx + 128, wy + 40, C.muted, 'left');
    dials(state.th, wa);
  };

  draw.planetary = () => {
    const zs = state.params.sun, zr = 72, zp = (zr - zs) / 2, held = state.params.held;
    const m = 3.5, cx = 330, cy = 190;
    let ts = 0, tc = 0;
    if (held === 'ring') { ts = state.th; tc = ts * zs / (zs + zr); }
    else if (held === 'sun') { tc = state.th * zr / (zs + zr); }
    else { ts = state.th; tc = 0; }
    const orbit = m * (zs + zp) / 2;
    const planets = [];
    for (let i = 0; i < 3; i++) {
      const al = tc + i * TAU / 3;
      const s = zs * (al - ts) / TAU;
      const tp = al + Math.PI - (TAU / zp) * (0.5 - s);
      planets.push({ al, tp, x: cx + orbit * Math.cos(al), y: cy + orbit * Math.sin(al) });
    }
    const q0 = zp * (planets[0].al - planets[0].tp) / TAU;
    const tr = planets[0].al - (TAU / zr) * (q0 + 0.5);
    const colors = { sun: held === 'sun' ? C.steelDark : C.inp, ring: held === 'ring' ? C.steelDark : held === 'sun' ? C.inp : C.out, carrier: held === 'carrier' ? C.steelDark : C.out };
    ringGear(cx, cy, zr, m, tr, colors.ring);
    // carrier plate behind the planets
    ctx.save(); ctx.beginPath();
    planets.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.closePath(); ctx.fillStyle = colors.carrier; ctx.globalAlpha = 0.28; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.carrier; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
    for (const p of planets) gear(p.x, p.y, zp, m, p.tp, C.steel, { noMark: true });
    for (const p of planets) { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fillStyle = colors.carrier; ctx.fill(); }
    gear(cx, cy, zs, m, ts, colors.sun);
    const lab = (k) => (held === k ? ' · HELD' : '');
    label(`SUN ${zs}t${lab('sun')}`, cx, cy + m * zs / 2 + 14 > cy + 40 ? cy : cy, colors.sun === C.steelDark ? C.ink : colors.sun);
    label(`RING ${zr}t${lab('ring')}`, cx, cy - m * zr / 2 - 22, colors.ring === C.steelDark ? C.ink : colors.ring);
    label(`3 PLANETS ${zp}t`, cx + orbit + 98, cy - 70, C.steel, 'left');
    label(`CARRIER${lab('carrier')}`, cx + orbit + 98, cy - 46, colors.carrier === C.steelDark ? C.ink : colors.carrier, 'left');
    const g = M.geometry('planetary', state.params);
    label(held === 'ring' ? `1 + ring/sun = 1 + ${zr}/${zs} = ${g.ratio.toFixed(2)} : 1` : held === 'sun' ? `1 + sun/ring = 1 + ${zs}/${zr} = ${g.ratio.toFixed(2)} : 1` : `−ring/sun = −${zr}/${zs} = −${g.ratio.toFixed(2)} : 1 (reverse)`, cx + orbit + 98, cy - 10, C.ink, 'left');
    const outA = held === 'carrier' ? tr : tc;
    dials(held === 'sun' ? tr : ts, outA);
  };

  draw.rack = () => {
    const z = state.params.pinion, m = 4, R = m * z / 2, cx = 380, cy = 168;
    const x = -R * state.th;
    const pitch = Math.PI * m, off = pitch * (z / 4 - 0.5);
    const ry = cy + R;
    // rack body
    ctx.save();
    ctx.fillStyle = '#1f5f7a'; ctx.strokeStyle = C.dark;
    ctx.fillRect(30, ry + 1.25 * m, W - 60, 26);
    ctx.beginPath(); ctx.rect(30, 0, W - 60, H); ctx.clip();
    ctx.beginPath();
    const start = cx + x + off;
    let k0 = Math.floor((30 - start) / pitch) - 1;
    for (let k = k0; start + k * pitch < W - 30 + pitch; k++) {
      const xc = start + k * pitch;
      ctx.moveTo(xc - pitch * 0.5, ry + 1.25 * m); ctx.lineTo(xc - pitch * 0.27, ry + 1.25 * m); ctx.lineTo(xc - pitch * 0.15, ry - m);
      ctx.lineTo(xc + pitch * 0.15, ry - m); ctx.lineTo(xc + pitch * 0.27, ry + 1.25 * m); ctx.lineTo(xc + pitch * 0.5, ry + 1.25 * m);
    }
    ctx.fill(); ctx.restore();
    // carriage riding on the rack
    const cxr = cx + x + 150;
    ctx.save(); ctx.beginPath(); ctx.rect(30, 0, W - 60, H); ctx.clip();
    ctx.fillStyle = C.out; ctx.fillRect(cxr - 40, ry + 1.25 * m + 26, 80, 16);
    ctx.fillStyle = C.dark; ctx.font = '700 10px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText('RACK →', cxr, ry + 1.25 * m + 38);
    ctx.restore();
    gear(cx, cy, z, m, state.th, C.inp);
    label(`PINION · ${z} teeth · ${(Math.PI * 2 * z).toFixed(0)} mm per turn`, cx, cy - R - 22, C.inp);
    label('one turn moves the rack one pinion circumference: π × pitch diameter', W / 2, H - 22, C.muted);
    return x;
  };

  draw.harmonic = () => {
    const zf = state.params.flex, zc = zf + 2;
    const cx = 330, cy = 190, Rc = 142, e = 7, R0 = Rc - 9 - e;
    const tw = state.th, tf = -tw * 2 / zf;
    // circular spline (fixed): fine internal teeth
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, Rc + 16, 0, TAU); ctx.arc(cx, cy, Rc, 0, TAU, true); ctx.fillStyle = C.steelDark; ctx.fill();
    ctx.strokeStyle = 'rgba(12, 21, 32, .8)'; ctx.lineWidth = 1.2;
    for (let k = 0; k < zc; k++) { const a = k * TAU / zc; ctx.beginPath(); ctx.moveTo(cx + Rc * Math.cos(a), cy + Rc * Math.sin(a)); ctx.lineTo(cx + (Rc + 4) * Math.cos(a), cy + (Rc + 4) * Math.sin(a)); ctx.stroke(); }
    ctx.restore();
    // flexspline
    const rf = (a) => R0 + e * Math.cos(2 * (a - tw));
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) { const a = i / 240 * TAU, r = rf(a); const X = cx + r * Math.cos(a), Y = cy + r * Math.sin(a); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
    for (let i = 240; i >= 0; i--) { const a = i / 240 * TAU, r = rf(a) - 12; ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
    ctx.fillStyle = '#2e7f9e'; ctx.fill('evenodd');
    ctx.strokeStyle = '#bfeaff'; ctx.lineWidth = 1.4;
    for (let k = 0; k < zf; k++) {
      const a = tf + k * TAU / zf, r = rf(a);
      ctx.beginPath(); ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); ctx.lineTo(cx + (r + 6) * Math.cos(a), cy + (r + 6) * Math.sin(a)); ctx.stroke();
    }
    // mesh zones glow
    for (const a of [tw, tw + Math.PI]) {
      ctx.beginPath(); ctx.arc(cx, cy, Rc - 2, a - 0.2, a + 0.2); ctx.strokeStyle = 'rgba(154, 212, 106, .85)'; ctx.lineWidth = 6; ctx.stroke();
    }
    ctx.restore();
    // wave generator (input): an ellipse on a thin bearing
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tw);
    ctx.beginPath(); ctx.ellipse(0, 0, R0 + e - 14, R0 - e - 14, 0, 0, TAU); ctx.fillStyle = '#3a2a1a'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, R0 + e - 18, R0 - e - 18, 0, 0, TAU); ctx.fillStyle = C.inp; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(R0 + e - 30, 0, 5, 0, TAU); ctx.fill();
    ctx.restore();
    // output arm on the flexspline
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tf);
    ctx.fillStyle = C.out; ctx.fillRect(0, -5, R0 - 34, 10); ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
    ctx.restore();
    label('CIRCULAR SPLINE · ' + zc + ' teeth · fixed', cx, cy - Rc - 26, C.ink);
    label('FLEXSPLINE · ' + zf + ' teeth · output', cx + Rc + 30, cy + 40, C.out, 'left');
    label('WAVE GENERATOR · input', cx + Rc + 30, cy + 64, C.inp, 'left');
    label('green: the two places the teeth mesh', cx + Rc + 30, cy + 88, C.third, 'left');
    label(`${zf} / (${zc} − ${zf}) = ${zf / 2} : 1`, cx + Rc + 30, cy - 10, C.ink, 'left');
    dials(tw, tf);
  };

  draw.cycloidal = () => {
    const lobes = state.params.lobes, N = lobes + 1;
    const cx = 330, cy = 190, R = 128, e = Math.min(6, 0.7 * R / N), Rr = Math.min(9, Math.PI * R / N * 0.42);
    const te = state.th, rot = -te / (N - 1);
    // housing and pins
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R + Rr + 14, 0, TAU); ctx.arc(cx, cy, R + Rr + 2, 0, TAU, true); ctx.fillStyle = C.steelDark; ctx.fill();
    // disc
    const dx = cx + e * Math.cos(te), dy = cy + e * Math.sin(te);
    ctx.translate(dx, dy); ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i <= 900; i++) {
      const t = i / 900 * TAU;
      const psi = Math.atan2(Math.sin((1 - N) * t), R / (e * N) - Math.cos((1 - N) * t));
      const X = R * Math.cos(t) - Rr * Math.cos(t + psi) - e * Math.cos(N * t);
      const Y = -R * Math.sin(t) + Rr * Math.sin(t + psi) + e * Math.sin(N * t);
      if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
    }
    ctx.closePath();
    // output holes (each bigger than its pin by the eccentricity)
    const hr = 13, hole = 40;
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6; ctx.moveTo(hole * Math.cos(a) + hr + e, hole * Math.sin(a)); ctx.arc(hole * Math.cos(a), hole * Math.sin(a), hr + e, 0, TAU, true); }
    ctx.moveTo(22, 0); ctx.arc(0, 0, 22, 0, TAU, true);
    ctx.fillStyle = '#1f5f7a'; ctx.fill('evenodd'); ctx.strokeStyle = '#bfeaff'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    // eccentric cam (input) inside the disc's centre bore
    ctx.save();
    ctx.beginPath(); ctx.arc(dx, dy, 20, 0, TAU); ctx.fillStyle = C.inp; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, TAU); ctx.fillStyle = C.dark; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(dx + 14 * Math.cos(te), dy + 14 * Math.sin(te)); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
    // housing pins
    for (let k = 0; k < N; k++) { const a = k * TAU / N; ctx.beginPath(); ctx.arc(cx + R * Math.cos(a), cy + R * Math.sin(a), Rr, 0, TAU); ctx.fillStyle = C.steel; ctx.fill(); ctx.strokeStyle = C.dark; ctx.stroke(); }
    // output pins on the output flange (fixed centre, turning with the disc)
    for (let k = 0; k < 6; k++) { const a = rot + k * TAU / 6; ctx.beginPath(); ctx.arc(cx + 40 * Math.cos(a), cy + 40 * Math.sin(a), 13, 0, TAU); ctx.fillStyle = C.out; ctx.fill(); ctx.strokeStyle = C.dark; ctx.stroke(); }
    ctx.restore();
    label(`DISC · ${lobes} lobes`, cx, cy - R - Rr - 28, C.out);
    label(`RING OF ${N} PINS · fixed`, cx + R + 40, cy + 30, C.ink, 'left');
    label('ECCENTRIC CAM · input', cx + R + 40, cy + 54, C.inp, 'left');
    label('OUTPUT PINS ride in the disc holes', cx + R + 40, cy + 78, C.out, 'left');
    label(`one wobble = one lobe back → ${lobes} : 1, reversed`, cx + R + 40, cy - 10, C.ink, 'left');
    dials(te, rot);
  };

  function beltDrive(r1, r2, kind) {
    const c1 = [190, 175], c2 = [560, 175];
    const b = belt(c1, r1, c2, r2);
    const a1 = state.th, a2 = state.belt / r2;
    const slipping = state.result && state.result.slipping;
    if (kind === 'chain') {
      gear(c1[0], c1[1], M.get('chain').t1, 2 * r1 / M.get('chain').t1, a1, C.inp, { noMark: false });
      gear(c2[0], c2[1], state.params.t2, 2 * r2 / state.params.t2, a2, C.out);
    } else if (kind === 'timing') {
      gear(c1[0], c1[1], 20, 2 * r1 / 20 * 0.95, a1, C.inp);
      gear(c2[0], c2[1], state.params.t2, 2 * r2 / state.params.t2 * 0.95, a2, C.out);
    } else {
      pulley(c1[0], c1[1], r1, a1, C.inp, kind === 'vbelt');
      pulley(c2[0], c2[1], r2, a2, C.out, kind === 'vbelt');
    }
    if (kind === 'chain') {
      const p = 15, n = Math.floor(b.total / p);
      const step = b.total / n;
      for (let k = 0; k < n; k++) {
        const s = state.belt + k * step, A = b.at(s), B = b.at(s + step);
        ctx.save(); ctx.strokeStyle = k % 2 ? '#8a99a8' : '#5b6876'; ctx.lineWidth = k % 2 ? 9 : 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.restore();
      }
      for (let k = 0; k < n; k++) { const A = b.at(state.belt + k * step); ctx.beginPath(); ctx.arc(A.x, A.y, 3.4, 0, TAU); ctx.fillStyle = '#d5dde5'; ctx.fill(); }
    } else {
      const width = kind === 'vbelt' ? 11 : kind === 'flat' ? 5 : 7;
      b.stroke(width, kind === 'vbelt' ? '#2a2a2a' : kind === 'flat' ? '#8b5a2b' : '#1d1d1d');
      const n = kind === 'timing' ? Math.round(b.total / 10) : 18;
      const step = b.total / n;
      for (let k = 0; k < n; k++) {
        const A = b.at(state.belt + k * step);
        ctx.save(); ctx.translate(A.x, A.y); ctx.rotate(A.ang);
        ctx.fillStyle = kind === 'timing' ? '#e9e9e9' : 'rgba(255,255,255,.55)';
        if (kind === 'timing') ctx.fillRect(-1.5, 0, 3, 5); else ctx.fillRect(-1, -width / 2, 2, width);
        ctx.restore();
      }
    }
    if (slipping) {
      label('SLIP!', c1[0], c1[1] - r1 - 26, C.warn);
      ctx.save(); ctx.beginPath(); ctx.arc(c1[0], c1[1], r1 + 9, Math.PI * 0.6, Math.PI * 1.4); ctx.strokeStyle = C.warn; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.restore();
    }
    const tag = { vbelt: `DRIVER Ø${M.get('vbelt').d1} mm`, flat: `DRIVER Ø${M.get('flat').d1} mm`, timing: 'DRIVER · 20 teeth', chain: 'SPROCKET · 11 teeth' }[kind];
    const tag2 = { vbelt: `DRIVEN Ø${state.params.d2} mm`, flat: `DRIVEN Ø${state.params.d2} mm`, timing: `DRIVEN · ${state.params.t2} teeth`, chain: `SPROCKET · ${state.params.t2} teeth` }[kind];
    label(tag, c1[0], c1[1] + r1 + 24, C.inp);
    label(tag2, c2[0], Math.min(H - 80, c2[1] + r2 + 22), C.out);
    // a cross-section inset that says what makes each one grip
    const ix = 690, iy = 70;
    ctx.save(); ctx.translate(ix, iy);
    ctx.fillStyle = C.dark; ctx.fillRect(-52, -40, 104, 80); ctx.strokeStyle = C.steelDark; ctx.strokeRect(-52, -40, 104, 80);
    ctx.fillStyle = C.steel;
    if (kind === 'vbelt') {
      ctx.beginPath(); ctx.moveTo(-40, -22); ctx.lineTo(-14, -22); ctx.lineTo(-7, 20); ctx.lineTo(7, 20); ctx.lineTo(14, -22); ctx.lineTo(40, -22); ctx.lineTo(40, 28); ctx.lineTo(-40, 28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.moveTo(-16, -26); ctx.lineTo(16, -26); ctx.lineTo(8, 10); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
    } else if (kind === 'flat') {
      ctx.beginPath(); ctx.moveTo(-40, -6); ctx.quadraticCurveTo(0, -22, 40, -6); ctx.lineTo(40, 28); ctx.lineTo(-40, 28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8b5a2b'; ctx.beginPath(); ctx.moveTo(-26, -15); ctx.quadraticCurveTo(0, -27, 26, -15); ctx.lineTo(26, -10); ctx.quadraticCurveTo(0, -22, -26, -10); ctx.closePath(); ctx.fill();
    } else if (kind === 'timing') {
      ctx.fillRect(-40, 0, 80, 28); ctx.fillStyle = C.dark; for (let x = -36; x < 40; x += 14) ctx.fillRect(x, 0, 7, 6);
      ctx.fillStyle = '#1d1d1d'; ctx.fillRect(-42, -12, 84, 8); ctx.fillStyle = '#e9e9e9'; for (let x = -36; x < 40; x += 14) ctx.fillRect(x + 1, -4, 5, 5);
    } else {
      ctx.fillStyle = '#5b6876'; ctx.fillRect(-40, -12, 80, 10); ctx.fillStyle = '#d5dde5'; for (let x = -32; x < 40; x += 16) { ctx.beginPath(); ctx.arc(x, -7, 4, 0, TAU); ctx.fill(); }
      ctx.fillStyle = C.steel; ctx.beginPath(); ctx.moveTo(-40, 28); for (let x = -40; x <= 40; x += 16) { ctx.lineTo(x + 4, 4); ctx.lineTo(x + 12, 4); ctx.lineTo(x + 16, 28); } ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    label({ vbelt: 'wedge grip', flat: 'crowned pulley', timing: 'teeth mesh', chain: 'rollers in teeth' }[kind], ix, iy + 52, C.muted);
    dials(a1, a2);
  }

  draw.vbelt = () => beltDrive(32, state.params.d2 * 0.4, 'vbelt');
  draw.flat = () => beltDrive(32, state.params.d2 * 0.4, 'flat');
  draw.timing = () => beltDrive(20 * 10.7 / TAU, state.params.t2 * 10.7 / TAU, 'timing');
  draw.chain = () => beltDrive(15 / (2 * Math.sin(Math.PI / 11)), 15 / (2 * Math.sin(Math.PI / state.params.t2)), 'chain');

  function screwDrive(kind) {
    const lead = state.params.lead;
    const yc = 170, r = { leadscrew: 12, ballscrew: 16, rollerscrew: 24 }[kind];
    const pitch = Math.max(9, Math.min(56, lead * 4.2));
    const x0 = 120, x1 = 690;
    shaft(x0 - 10, yc, x0 + 4, yc, C.inp, 8);
    motor(x0 - 10, yc, state.th);
    screw(x0, x1, yc, r, pitch, state.th);
    // bearing blocks
    ctx.fillStyle = C.steelDark; ctx.fillRect(x0 + 6, yc - r - 18, 16, 2 * r + 60); ctx.fillRect(x1 - 18, yc - r - 18, 16, 2 * r + 60);
    // carriage
    const nx = state.pos;
    const nw = kind === 'leadscrew' ? 60 : 86;
    ctx.save();
    ctx.fillStyle = C.out; ctx.fillRect(nx - nw / 2, yc - r - 14, nw, 2 * r + 28);
    ctx.fillStyle = 'rgba(12, 21, 32, .55)'; ctx.fillRect(nx - nw / 2 + 5, yc - r - 2, nw - 10, 2 * r + 4);
    if (kind === 'ballscrew') {
      // balls rolling in the groove, and the return tube that recirculates them
      const off = ((state.th / TAU) * pitch) % pitch;
      for (let x = nx - nw / 2 + 6 + off * 0.5; x < nx + nw / 2 - 6; x += pitch / 2) {
        ctx.beginPath(); ctx.arc(x, yc - r + 3, 3.4, 0, TAU); ctx.arc(x + pitch / 4, yc + r - 3, 3.4, 0, TAU); ctx.fillStyle = '#e7edf3'; ctx.fill();
      }
      ctx.beginPath(); ctx.moveTo(nx - nw / 2 + 10, yc - r - 14); ctx.bezierCurveTo(nx - nw / 2 + 10, yc - r - 44, nx + nw / 2 - 10, yc - r - 44, nx + nw / 2 - 10, yc - r - 14);
      ctx.strokeStyle = '#bfeaff'; ctx.lineWidth = 5; ctx.stroke();
      label('ball return tube', nx, yc - r - 54, C.out);
    } else if (kind === 'rollerscrew') {
      const off = (state.th / TAU) * pitch * 0.3;
      for (let i = 0; i < 5; i++) {
        const x = nx - nw / 2 + 12 + i * (nw - 24) / 4;
        for (const yy of [yc - r - 9, yc + r + 1]) {
          ctx.fillStyle = '#d9e3ec'; ctx.fillRect(x - 5, yy, 10, 8);
          ctx.strokeStyle = 'rgba(12,21,32,.6)'; ctx.lineWidth = 1;
          for (let k = -1; k < 3; k++) { const y = yy + ((k * 3 + off) % 8 + 8) % 8; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y + 2); ctx.stroke(); }
        }
      }
      label('threaded rollers orbit inside the nut', nx, yc - r - 32, C.out);
    } else {
      label('plain bronze nut: the thread slides', nx, yc - r - 32, C.out);
    }
    // load on the carriage
    ctx.fillStyle = '#556677'; ctx.fillRect(nx - 22, yc + r + 14, 44, 46);
    ctx.fillStyle = C.ink; ctx.font = '700 11px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText('LOAD', nx, yc + r + 42);
    ctx.restore();
    label(`lead ${lead} mm: one turn moves the nut ${lead} mm`, W / 2, 60, C.ink);
    const g = M.geometry(kind, state.params);
    label(`lead angle ${g.leadAngle.toFixed(1)}°  vs  friction angle ${g.frictionAngle.toFixed(1)}°  →  ${g.backEff > 0 ? 'back-drives' : 'self-locking'}`, W / 2, H - 70, g.backEff > 0 ? C.out : C.third);
    return { lo: x0 + 70, hi: x1 - 60 };
  }
  draw.leadscrew = () => screwDrive('leadscrew');
  draw.ballscrew = () => screwDrive('ballscrew');
  draw.rollerscrew = () => screwDrive('rollerscrew');

  draw.direct = () => {
    const yc = 170;
    motor(240, yc, state.th, 90);
    // jaw coupling
    ctx.fillStyle = C.inp; ctx.fillRect(250, yc - 18, 22, 36);
    ctx.fillStyle = '#e04f8f'; ctx.fillRect(272, yc - 14, 8, 28);
    ctx.fillStyle = C.out; ctx.fillRect(280, yc - 18, 22, 36);
    shaft(300, yc, 420, yc, C.out, 10);
    // load drum, side view, turning
    ctx.save();
    const g = ctx.createLinearGradient(0, yc - 70, 0, yc + 70);
    g.addColorStop(0, '#1f5f7a'); g.addColorStop(0.45, '#64b9d9'); g.addColorStop(1, '#174a5f');
    ctx.fillStyle = g; ctx.fillRect(420, yc - 70, 200, 140);
    ctx.beginPath(); ctx.rect(420, yc - 70, 200, 140); ctx.clip();
    spinStripes(420, 620, yc, 70, state.th, 16, 'rgba(12,21,32,.6)');
    ctx.restore();
    label('MOTOR', 200, yc - 64, C.inp);
    label('flexible coupling', 276, yc + 40, '#ff9ccc');
    label('LOAD turns at motor speed, 1 : 1', 520, yc - 88, C.out);
    label('no teeth, no belt: zero backlash, nothing to wear', W / 2, H - 70, C.muted);
    dials(state.th, state.th);
  };

  draw.traction = () => {
    const g = M.geometry('traction', state.params);
    const x0 = 160, x1 = 600, k = 1.5, y1 = 112;
    const rS = 20 * k, rB = 60 * k, y2 = y1 + rS + rB + 10;
    const f = state.params.pos / 100, xr = x0 + (x1 - x0) * f;
    const cone = (yc, left, right, ang, col, stripe) => {
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x0, yc - left); ctx.lineTo(x1, yc - right); ctx.lineTo(x1, yc + right); ctx.lineTo(x0, yc + left); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = C.dark; ctx.stroke(); ctx.clip();
      for (let j = 0; j < 14; j++) {
        const a = ang + j * TAU / 14; if (Math.cos(a) <= 0) continue;
        ctx.beginPath(); ctx.moveTo(x0, yc + left * Math.sin(a)); ctx.lineTo(x1, yc + right * Math.sin(a));
        ctx.strokeStyle = stripe; ctx.globalAlpha = 0.25 + 0.6 * Math.cos(a); ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.restore();
    };
    shaft(60, y1, x0, y1, C.inp, 8); motor(60, y1, state.th);
    shaft(x1, y2, 700, y2, C.out, 8);
    cone(y1, rS, rB, state.th, '#a8681e', '#ffd39b');
    cone(y2, rB, rS, state.out, '#1f5f7a', '#bfeaff');
    // the squeezed ring between the cones
    const top = y1 + rS + (rB - rS) * f, bot = y2 - (rB - (rB - rS) * f);
    ctx.fillStyle = '#e04f8f'; ctx.fillRect(xr - 7, top - 2, 14, bot - top + 4);
    label('drag the ring position slider: the ratio changes with no steps', W / 2, 30, C.muted);
    label(`r_in ${g.r1.toFixed(0)} mm`, xr + 16, y1 + 4, C.inp, 'left');
    label(`r_out ${g.r2.toFixed(0)} mm`, xr + 16, y2 - 4, C.out, 'left');
    label(`ratio = r_out / r_in = ${g.ratio.toFixed(2)} : 1`, xr, H - 70, C.ink);
    if (state.result && state.result.slipping) label('SLIPPING: clamp harder or ask for less torque', W / 2, H - 46, C.warn);
    dials(state.th, state.out);
  };

  draw.hydraulic = () => {
    const area = state.params.area;
    const px = 180, py = 200;
    motor(px - 56, py, state.th);
    shaft(px - 52, py, px - 30, py, C.inp, 7);
    // gear pump
    ctx.fillStyle = '#2b3b4d'; ctx.fillRect(px - 32, py - 54, 64, 108); ctx.strokeStyle = C.steelDark; ctx.strokeRect(px - 32, py - 54, 64, 108);
    gear(px, py - 21, 10, 4.2, state.th, C.inp, { noMark: true });
    gear(px, py + 21, 10, 4.2, -state.th + Math.PI / 10, C.steel, { noMark: true });
    label('GEAR PUMP', px, py - 72, C.inp);
    // cylinder
    const bore = 20 + Math.sqrt(area) * 8, cx0 = 360, cx1 = 610, cyl = 190;
    const stroke = (cx1 - cx0 - 30);
    const ppos = cx0 + 10 + stroke * state.s;
    ctx.save();
    ctx.fillStyle = '#3a4a5c'; ctx.fillRect(cx0, cyl - bore / 2 - 8, cx1 - cx0, bore + 16);
    ctx.fillStyle = C.oil; ctx.globalAlpha = 0.9; ctx.fillRect(cx0 + 4, cyl - bore / 2, ppos - cx0 - 4, bore); ctx.globalAlpha = 1;
    ctx.fillStyle = '#1b2633'; ctx.fillRect(ppos + 14, cyl - bore / 2, cx1 - ppos - 18, bore);
    ctx.fillStyle = C.steel; ctx.fillRect(ppos, cyl - bore / 2, 14, bore);
    ctx.fillStyle = '#c7d3df'; ctx.fillRect(ppos + 14, cyl - 7, cx1 - ppos + 40, 14);
    ctx.fillStyle = C.out; ctx.fillRect(cx1 + 40 + (ppos - cx0 - 10), cyl - 40, 50, 80);
    ctx.fillStyle = C.dark; ctx.font = '700 11px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText('LOAD', cx1 + 65 + (ppos - cx0 - 10), cyl + 4);
    ctx.restore();
    // hoses
    ctx.save(); ctx.strokeStyle = C.oil; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px + 32, py - 20); ctx.lineTo(300, py - 20); ctx.lineTo(300, cyl); ctx.lineTo(cx0, cyl); ctx.stroke();
    ctx.setLineDash([6, 6]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(201, 138, 43, .55)';
    ctx.beginPath(); ctx.moveTo(px + 32, py + 30); ctx.lineTo(330, py + 30); ctx.lineTo(330, cyl + bore / 2 + 30); ctx.lineTo(cx1 - 10, cyl + bore / 2 + 30); ctx.lineTo(cx1 - 10, cyl + bore / 2 + 8); ctx.stroke();
    ctx.restore();
    const r = state.result;
    // pressure gauge
    const gx = 300, gy = 92, frac = Math.min(1, r.pressureBar / 400);
    ctx.save(); ctx.beginPath(); ctx.arc(gx, gy, 26, 0, TAU); ctx.fillStyle = '#eef3f7'; ctx.fill(); ctx.strokeStyle = C.dark; ctx.lineWidth = 3; ctx.stroke();
    const a = Math.PI * 0.75 + frac * Math.PI * 1.5;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 20 * Math.cos(a), gy + 20 * Math.sin(a)); ctx.strokeStyle = C.warn; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    label(`${r.pressureBar.toFixed(0)} bar`, gx, gy + 40, C.ink);
    label(`piston ${area} cm²: force = pressure × area`, (cx0 + cx1) / 2, cyl - bore / 2 - 26, C.out);
    label('return line to the tank', (330 + cx1) / 2, cyl + bore / 2 + 46, C.muted);
    label('the same pressure on a bigger piston = more force, less speed', W / 2, H - 22, C.muted);
  };

  /* IN / OUT dials along the bottom, for rotary drives */
  function dials(aIn, aOut) {
    const r = state.result;
    dial(W - 150, H - 62, aIn, C.inp, `IN ${fmt(state.holdMode ? 0 : state.rpm, 0)} rpm`);
    dial(W - 60, H - 62, aOut, C.out, `OUT ${fmt(state.holdMode ? 0 : r.outRpm)} rpm`);
  }

  /* ───────── the loop ───────── */
  function frame(dt) {
    if (!ctx) return;
    const d = M.get(state.id), r = state.result;
    dt = Math.min(dt || 0, 0.05);
    let w = 2.4 * (state.rpm / 1200);                           // visual rad/s at the motor
    if (d.output === 'linear' && state.id !== 'rack') w *= 2.5;
    if (state.holdMode) {
      state.holdT += dt;
      if (r.hold.holds) w = 0;
      else w = -Math.min(1, state.holdT * 0.8) * 2.0 * (d.output === 'linear' ? 2 : 1); // the load spins it back, faster and faster
    }
    const step = w * dt * state.dir;
    state.th += step;
    if (d.slips) {
      const r1 = { vbelt: 32, flat: 32, traction: M.geometry('traction', state.params).r1 }[state.id];
      if (state.id === 'traction') state.out += -step / r.geometry.ratio * (1 - r.slip);
      else state.belt += step * r1 * (1 - r.slip);
    } else if (state.id === 'timing') state.belt += step * 20 * 10.7 / TAU;
    else if (state.id === 'chain') state.belt += step * 15 / (2 * Math.sin(Math.PI / 11));

    if (state.id === 'leadscrew' || state.id === 'ballscrew' || state.id === 'rollerscrew') {
      const pitch = Math.max(9, Math.min(56, state.params.lead * 4.2));
      state.pos += step / TAU * pitch;
    } else if (state.id === 'hydraulic') {
      state.s += step / TAU * (0.06 / Math.sqrt(state.params.area / 20)) * (state.holdMode ? 0 : 1);
      if (state.s > 1) { state.s = 1; state.dir = -1; } else if (state.s < 0) { state.s = 0; state.dir = 1; }
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.save();
    const vw = view.width, vh = view.height;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, vw, vh);
    ctx.translate((vw - W * scale) / 2, (vh - H * scale) / 2);
    ctx.scale(scale, scale);
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 38) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 38) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const res = draw[state.id]();
    // ping-pong the linear drives at the ends of their travel
    // rack position x = −R·θ, so it moves at −R·w·dir: pick dir to head back toward the middle
    if (state.id === 'rack' && typeof res === 'number' && Math.abs(res) > 170 && w !== 0) state.dir = (res > 0 ? 1 : -1) * Math.sign(w);
    if (res && res.lo != null) {
      if (state.pos > res.hi) { state.pos = res.hi; state.dir = w >= 0 ? -1 : 1; }
      if (state.pos < res.lo) { state.pos = res.lo; state.dir = w >= 0 ? 1 : -1; }
    }
    if (state.holdMode) stamp(r.hold.holds ? 'MOTOR OFF · HOLDS' : 'MOTOR OFF · SLIPS BACK', r.hold.holds ? C.third : C.warn);
    ctx.restore();
  }

  /* ───────── the picker ───────── */
  const picker = document.querySelector('[data-md-picker]');
  if (picker) {
    const goalBox = picker.querySelector('#md-goals'), traitBox = picker.querySelector('#md-traits'), out = picker.querySelector('#md-picks');
    const radios = (box, name, items) => {
      box.innerHTML = items.map(([v, t], i) => `<label class="md-radio"><input type="radio" name="${name}" value="${v}"${i === 0 ? ' checked' : ''}><span>${t}</span></label>`).join('');
    };
    radios(goalBox, 'md-goal', M.GOALS);
    radios(traitBox, 'md-trait', M.TRAITS);
    const run = () => {
      const g = picker.querySelector('input[name="md-goal"]:checked').value;
      const t = picker.querySelector('input[name="md-trait"]:checked').value;
      const recs = M.recommend(g, t);
      out.innerHTML = recs.map((r, i) => `<li><div class="md-pick-head"><span class="md-rank">${i + 1}</span><strong>${r.name}</strong></div><p>${r.reason}</p><p class="md-pick-watch"><b>Watch out:</b> ${r.watch}</p><button type="button" class="md-btn" data-md-show="${r.id}">Show it in the explorer ↑</button></li>`).join('');
    };
    picker.addEventListener('change', run);
    picker.querySelector('#md-pick-go').addEventListener('click', run);
    out.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-md-show]'); if (!b) return;
      select(b.dataset.mdShow);
      root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
    run();
  }

  /* links elsewhere in the lesson: <a data-md-open="worm"> */
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-md-open]'); if (!a) return;
    ev.preventDefault(); select(a.dataset.mdOpen);
    root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

  buildFamilies();
  const hash = (location.hash.match(/^#drive-(\w+)/) || [])[1];
  const fromLink = hash && M.DRIVES.some((d) => d.id === hash);
  select(fromLink ? hash : 'spur', { quiet: true });
  if (fromLink) requestAnimationFrame(() => root.closest('section').scrollIntoView({ block: 'start' }));
  SimKit.loop(frame, { el: SimKit.stage(canvas) });
})();
