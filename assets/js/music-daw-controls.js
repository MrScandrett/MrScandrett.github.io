/* Analog-style controls for Track Studio: rotary knobs, a dB-scaled fader and
 * lamp switches. Every control is a real ARIA slider/switch (keyboard, touch and
 * screen-reader friendly); the visuals are SVG/CSS. The math is DOM-free so it can
 * be unit-tested in Node.
 *
 * Controls live inside any container that calls `mount(container, handlers)`:
 *   knob(spec)  → HTML string   (drag up/down, arrows, double-click = reset)
 *   fader(spec) → HTML string   (vertical, dB scale)
 * Handlers receive (key, value, el) — `onInput` while dragging, `onCommit` on release.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MusicDawControls = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SWEEP = 270;                 // knob travel in degrees (−135° … +135°)
  const FADER_EXP = 2.5;             // audio-taper exponent for the fader
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ── Taper math ─────────────────────────────────────────────────────────── */
  // pos is always 0…1 along the control's travel; value is in real units.
  function toPos(value, s) {
    const v = clamp(Number(value), s.min, s.max);
    if (s.scale === 'log') return Math.log(v / s.min) / Math.log(s.max / s.min);
    if (s.scale === 'fader') return Math.pow(v / s.max, 1 / FADER_EXP);
    return (v - s.min) / (s.max - s.min);
  }
  function fromPos(pos, s) {
    const p = clamp(pos, 0, 1);
    let v;
    if (s.scale === 'log') v = s.min * Math.pow(s.max / s.min, p);
    else if (s.scale === 'fader') v = s.max * Math.pow(p, FADER_EXP);
    else v = s.min + p * (s.max - s.min);
    return snap(v, s);
  }
  function snap(v, s) {
    if (s.scale === 'fader' || s.scale === 'log' || !s.step) return clamp(Number(v.toFixed(4)), s.min, s.max);
    return clamp(Number((Math.round((v - s.min) / s.step) * s.step + s.min).toFixed(6)), s.min, s.max);
  }
  const toDb = g => (g <= 0.0001 ? -Infinity : 20 * Math.log10(g));
  function fmtDb(g) { const d = toDb(g); return d === -Infinity ? '−∞' : (d > 0.05 ? '+' : '') + d.toFixed(1).replace('-', '−'); }
  function fmtHz(v) { return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + ' k' : Math.round(v) + ''; }
  function panText(p) { return Math.abs(p) < 0.025 ? 'C' : (p < 0 ? 'L' : 'R') + Math.round(Math.abs(p) * 100); }
  // Visible readout and spoken text for a value.
  function format(value, s) {
    const v = Number(value);
    switch (s.fmt) {
      case 'gain': return { text: fmtDb(v), unit: 'dB', spoken: fmtDb(v).replace('−∞', 'minus infinity') + ' decibels' };
      case 'pan': return { text: panText(v), unit: '', spoken: Math.abs(v) < 0.025 ? 'center' : Math.round(Math.abs(v) * 100) + ' percent ' + (v < 0 ? 'left' : 'right') };
      case 'hz': return { text: fmtHz(v), unit: 'Hz', spoken: Math.round(v) + ' hertz' };
      case 'db': { const t = (v > 0 ? '+' : '') + (Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v) : v.toFixed(1)); return { text: t.replace('-', '−'), unit: 'dB', spoken: t + ' decibels' }; }
      case 'pct': return { text: Math.round(v * 100) + '', unit: '%', spoken: Math.round(v * 100) + ' percent' };
      default: { const d = s.digits ?? ((String(s.step || '').split('.')[1] || '').length); const t = v.toFixed(d); return { text: t, unit: s.unit || '', spoken: t + (s.unit ? ' ' + s.unit : '') }; }
    }
  }
  // Fader scale marks: dB label → position.
  const FADER_MARKS = [[1.2, '+1.6'], [1, '0'], [0.5623, '−5'], [0.3162, '−10'], [0.1, '−20'], [0.0316, '−30'], [0.01, '−40']];
  const faderMarks = max => FADER_MARKS.filter(([g]) => g <= max + 1e-9).map(([g, label]) => ({ label, pos: toPos(g, { scale: 'fader', max, min: 0 }) }));

  /* ── Markup ─────────────────────────────────────────────────────────────── */
  function knobArcPath() { return 'M 14.54 65.46 A 36 36 0 1 1 65.46 65.46'; }   // 270° ring, start lower-left
  function ticks(n) {
    let out = '';
    for (let i = 0; i < n; i++) {
      const a = (-SWEEP / 2 + (SWEEP * i) / (n - 1)) * Math.PI / 180, major = i === 0 || i === n - 1 || i === (n - 1) / 2;
      const r1 = major ? 36 : 37.5, r2 = 40;
      out += `<line class="${major ? 'mk-tick mk-tick-major' : 'mk-tick'}" x1="${(40 + Math.sin(a) * r1).toFixed(2)}" y1="${(40 - Math.cos(a) * r1).toFixed(2)}" x2="${(40 + Math.sin(a) * r2).toFixed(2)}" y2="${(40 - Math.cos(a) * r2).toFixed(2)}"/>`;
    }
    return out;
  }
  const specAttrs = s => `data-min="${s.min}" data-max="${s.max}" data-step="${s.step || ''}" data-def="${s.def}" data-scale="${s.scale || 'lin'}" data-fmt="${s.fmt || ''}" data-unit="${esc(s.unit || '')}" data-digits="${s.digits ?? ''}"`;

  function knob(s) {
    const f = format(s.value, s), pos = toPos(s.value, s);
    return `<div class="mk mk-knob${s.bipolar ? ' is-bipolar' : ''}${s.size ? ' mk-' + s.size : ''}" ${s.disabled ? 'data-disabled="1"' : ''}>
      <div class="mk-dial" role="slider" tabindex="${s.disabled ? -1 : 0}" data-ctl="knob" data-key="${esc(s.key)}" ${s.attrs || ''} ${specAttrs(s)}
        ${s.bipolar ? 'data-bipolar="1"' : ''} aria-label="${esc(s.label)}" aria-valuemin="${s.min}" aria-valuemax="${s.max}" aria-valuenow="${s.value}"
        aria-valuetext="${esc(f.spoken)}" ${s.disabled ? 'aria-disabled="true"' : ''} style="--p:${pos.toFixed(4)}" title="${esc(s.title || s.label + ' — drag up/down, arrow keys, double-click to reset')}">
        <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
          ${ticks(11)}
          <path class="mk-ring" d="${knobArcPath()}" pathLength="100"/>
          <path class="mk-arc" d="${knobArcPath()}" pathLength="100"/>
          <g class="mk-cap"><circle class="mk-cap-body" cx="40" cy="40" r="26"/><circle class="mk-cap-top" cx="40" cy="40" r="20"/><line class="mk-pointer" x1="40" y1="19" x2="40" y2="30"/></g>
        </svg>
      </div>
      <span class="mk-label" aria-hidden="true">${esc(s.short || s.label)}</span>
      <output class="mk-out" aria-hidden="true"><b>${esc(f.text)}</b> <i>${esc(f.unit)}</i></output>
    </div>`;
  }

  function fader(s) {
    const f = format(s.value, s), pos = toPos(s.value, s);
    return `<div class="mk mk-fader${s.disabled ? ' is-disabled' : ''}">
      <div class="mk-fader-body">
        <div class="mk-fader-scale" aria-hidden="true">${faderMarks(s.max).map(m => `<span style="--m:${m.pos.toFixed(4)}">${m.label}</span>`).join('')}</div>
        <div class="mk-fader-track" role="slider" tabindex="${s.disabled ? -1 : 0}" aria-orientation="vertical" data-ctl="fader" data-key="${esc(s.key)}" ${s.attrs || ''} ${specAttrs(s)}
          aria-label="${esc(s.label)}" aria-valuemin="${s.min}" aria-valuemax="${s.max}" aria-valuenow="${s.value}" aria-valuetext="${esc(f.spoken)}"
          style="--p:${pos.toFixed(4)}" title="${esc(s.label)} — drag, arrow keys, double-click for 0 dB">
          <span class="mk-slot" aria-hidden="true"></span><span class="mk-fcap" aria-hidden="true"></span>
        </div>
        ${s.meter ? `<span class="mk-ladder" aria-hidden="true" data-ladder="${esc(s.meter)}">${Array.from({ length: 14 }, (_, i) => `<i class="${i >= 12 ? 'is-red' : i >= 9 ? 'is-amber' : ''}"></i>`).join('')}</span>` : ''}
      </div>
      <output class="mk-out mk-out-lcd" aria-hidden="true"><b>${esc(f.text)}</b> <i>${esc(f.unit)}</i></output>
    </div>`;
  }

  // A hardware push-switch with a lamp. Plain <button aria-pressed> so it works everywhere.
  function sw(s) {
    return `<button type="button" class="mk-sw mk-sw-${s.tone || 'amber'}${s.wide ? ' is-wide' : ''}" ${s.attrs || ''} aria-pressed="${!!s.on}" ${s.label ? `aria-label="${esc(s.label)}"` : ''} ${s.title ? `title="${esc(s.title)}"` : ''}>
      <span class="mk-lamp" aria-hidden="true"></span><span class="mk-sw-text">${s.text}</span></button>`;
  }

  /* ── Behaviour ──────────────────────────────────────────────────────────── */
  function specOf(el) {
    const d = el.dataset;
    return { min: Number(d.min), max: Number(d.max), step: d.step === '' ? 0 : Number(d.step), def: Number(d.def), scale: d.scale, fmt: d.fmt, unit: d.unit, digits: d.digits === '' ? undefined : Number(d.digits), bipolar: !!d.bipolar };
  }
  function paint(el, value) {
    const s = specOf(el), pos = toPos(value, s), f = format(value, s);
    el.style.setProperty('--p', pos.toFixed(4));
    el.setAttribute('aria-valuenow', String(value));
    el.setAttribute('aria-valuetext', f.spoken);
    el.dataset.value = String(value);
    if (el.dataset.ctl === 'knob') {
      const arc = el.querySelector('.mk-arc');
      const mid = s.bipolar ? toPos(s.def, s) : 0, from = Math.min(pos, mid), len = Math.abs(pos - mid);
      arc.style.strokeDasharray = `${(len * 100).toFixed(2)} 200`;
      arc.style.strokeDashoffset = `${(-from * 100).toFixed(2)}`;
      el.querySelector('.mk-cap').style.transform = `rotate(${(-SWEEP / 2 + pos * SWEEP).toFixed(1)}deg)`;
    }
    const out = (el.closest('.mk') || {}).querySelector && el.closest('.mk').querySelector('.mk-out');
    if (out) out.innerHTML = `<b>${esc(f.text)}</b> <i>${esc(f.unit)}</i>`;
  }
  function valueOf(el) { return Number(el.getAttribute('aria-valuenow')); }
  function set(el, value) { paint(el, clamp(value, Number(el.dataset.min), Number(el.dataset.max))); }
  function init(container) { container.querySelectorAll('[data-ctl]').forEach(el => paint(el, valueOf(el))); }

  function mount(container, handlers = {}) {
    init(container);
    let drag = null, lastTap = { t: 0, el: null };
    const emit = (kind, el) => { const fn = handlers[kind]; if (fn) fn(el.dataset.key, valueOf(el), el); };
    const commitValue = (el, v, live) => { const s = specOf(el); const next = snap(v, s); if (next !== valueOf(el)) { paint(el, next); emit('onInput', el); } if (!live) emit('onCommit', el); };
    const reset = el => { commitValue(el, Number(el.dataset.def), false); };

    container.addEventListener('pointerdown', e => {
      const el = e.target.closest('[data-ctl]');
      if (!el || !container.contains(el) || el.getAttribute('aria-disabled') === 'true' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const now = performance.now();
      if (lastTap.el === el && now - lastTap.t < 320) { e.preventDefault(); lastTap = { t: 0, el: null }; reset(el); return; }
      lastTap = { t: now, el };
      const rect = el.getBoundingClientRect(), vertical = el.dataset.ctl === 'fader';
      drag = { el, id: e.pointerId, y: e.clientY, pos: toPos(valueOf(el), specOf(el)), moved: false, span: vertical ? Math.max(60, rect.height - 28) : 160, vertical, rect };
      el.focus({ preventScroll: true });
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* synthetic events */ }
      // A fader jumps to where you press the slot; a knob never jumps.
      if (vertical) {
        const p = clamp(1 - (e.clientY - rect.top - 14) / drag.span, 0, 1);
        drag.pos = p; drag.y = e.clientY; commitValue(el, fromPos(p, specOf(el)), true); drag.moved = true;
      }
      e.preventDefault();
    });
    container.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const fine = e.shiftKey ? 0.2 : 1, dy = (drag.y - e.clientY) * fine / drag.span;
      const s = specOf(drag.el);
      let pos = clamp(drag.pos + dy, 0, 1);
      if (e.shiftKey) { drag.pos = pos; drag.y = e.clientY; }                    // fine mode re-bases so it can't snap back
      if (s.bipolar) { const mid = toPos(s.def, s); if (Math.abs(pos - mid) < 0.015) pos = mid; }  // centre detent
      drag.moved = true; commitValue(drag.el, fromPos(pos, s), true);
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const { el, moved } = drag; drag = null;
      try { el.releasePointerCapture(e.pointerId); } catch (_) { /* already released */ }
      if (moved) emit('onCommit', el);
    };
    container.addEventListener('pointerup', end);
    container.addEventListener('pointercancel', end);
    container.addEventListener('dblclick', e => { const el = e.target.closest('[data-ctl]'); if (el && container.contains(el) && el.getAttribute('aria-disabled') !== 'true') { e.preventDefault(); reset(el); } });
    container.addEventListener('keydown', e => {
      const el = e.target.closest('[data-ctl]');
      if (!el || e.target !== el || el.getAttribute('aria-disabled') === 'true' || e.altKey || e.ctrlKey || e.metaKey) return;
      const s = specOf(el), cur = valueOf(el), pos = toPos(cur, s), curved = s.scale === 'log' || s.scale === 'fader' || !s.step;
      const unit = curved ? 0.02 : s.step / (s.max - s.min), big = e.shiftKey ? 0.2 : 0.1;
      let next;
      switch (e.key) {
        case 'ArrowUp': case 'ArrowRight': next = curved ? fromPos(pos + unit, s) : snap(cur + s.step, s); break;
        case 'ArrowDown': case 'ArrowLeft': next = curved ? fromPos(pos - unit, s) : snap(cur - s.step, s); break;
        case 'PageUp': next = fromPos(pos + big, s); break;
        case 'PageDown': next = fromPos(pos - big, s); break;
        case 'Home': next = s.min; break;
        case 'End': next = s.max; break;
        case 'Enter': case 'Delete': case 'Backspace': next = s.def; break;
        default: return;
      }
      e.preventDefault(); e.stopPropagation();
      if (next === cur && s.scale !== 'lin') next = fromPos(pos + (e.key.includes('Up') || e.key.includes('Right') ? 1 : -1) * unit, s);
      commitValue(el, next, false);
    });
    // Wheel adjusts only a focused control, so the page still scrolls normally.
    container.addEventListener('wheel', e => {
      const el = e.target.closest('[data-ctl]');
      if (!el || document.activeElement !== el) return;
      e.preventDefault();
      const s = specOf(el), pos = toPos(valueOf(el), s);
      commitValue(el, fromPos(pos + (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 0.005 : 0.02), s), false);
    }, { passive: false });
  }

  return { SWEEP, toPos, fromPos, snap, format, toDb, fmtDb, panText, faderMarks, knob, fader, sw, mount, paint, set, init, valueOf };
}));
