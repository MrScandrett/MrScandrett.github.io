/* Weather Watch cockpit graphics.
 * Every telemetry card gets a small SVG that draws the reading, not just prints it,
 * and a data-level (0 good … 5 severe) that tints the card. The main dial gets a
 * sky that matches the sky outside. All input comes from weather-watch.js:
 *   WWCockpitViz.render(data)            weather-engine result
 *   WWCockpitViz.renderAir(air, pollen)  async air-quality feed (null = unavailable)
 */
(function () {
  'use strict';

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : null);
  const rand = (i) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const polar = (cx, cy, r, deg) => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  };
  const arc = (cx, cy, r, a1, a2) => {
    const [x1, y1] = polar(cx, cy, r, a1);
    const [x2, y2] = polar(cx, cy, r, a2);
    return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const text = (x, y, s, anchor = 'middle', cls = '') =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" class="ww-vt ${cls}">${s}</text>`;
  const svg = (inner) => `<svg viewBox="0 0 160 72" focusable="false">${inner}</svg>`;

  function put(key, html, level) {
    const slot = document.querySelector(`[data-viz="${key}"]`);
    if (!slot) return;
    slot.innerHTML = html;
    const card = slot.closest('.ww-telemetry-stat');
    if (!card) return;
    if (level == null) card.removeAttribute('data-level');
    else card.setAttribute('data-level', String(level));
  }

  // ── Dew point: comfort scale with a droplet that rides it ──────────────────
  function dewColor(t) {
    const stops = [[0, '#38bdf8'], [0.3, '#34d399'], [0.5, '#a3e635'], [0.62, '#fbbf24'], [0.75, '#f97316'], [0.88, '#ef4444'], [1, '#a855f7']];
    for (let i = stops.length - 1; i >= 0; i--) if (t >= stops[i][0]) return stops[i][1];
    return stops[0][1];
  }
  function dewViz(dew) {
    if (dew == null) return null;
    const t = clamp((dew - 40) / 40);
    const x = Math.max(14, Math.min(146, 8 + 144 * t));
    const col = dewColor(t);
    const level = dew < 55 ? 0 : dew < 65 ? 1 : dew < 70 ? 2 : dew < 75 ? 3 : 4;
    const stops = [[0, '#38bdf8'], [0.3, '#34d399'], [0.5, '#a3e635'], [0.62, '#fbbf24'], [0.75, '#f97316'], [0.88, '#ef4444'], [1, '#a855f7']]
      .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
    const ticks = [50, 60, 70].map((d) => {
      const tx = 8 + 144 * ((d - 40) / 40);
      return `<line x1="${tx}" y1="50" x2="${tx}" y2="54" stroke="#94a3b8" stroke-width=".8"/>${text(tx, 61, d + '°')}`;
    }).join('');
    const html = svg(`
      <defs><linearGradient id="wwvDew">${stops}</linearGradient></defs>
      <rect x="8" y="40" width="144" height="10" rx="5" fill="url(#wwvDew)" opacity=".9"/>
      ${ticks}
      <g class="ww-bob"><path d="M${x} 16C${x - 1} 21 ${x - 7} 26 ${x - 7} 31A7 7 0 0 0 ${x + 7} 31C${x + 7} 26 ${x + 1} 21 ${x} 16Z" fill="${col}" stroke="#fff" stroke-width="1.4"/>
      <ellipse cx="${x - 2.5}" cy="29" rx="1.6" ry="2.6" fill="#fff" opacity=".55"/></g>
      ${text(8, 70, 'DRY', 'start')}${text(152, 70, 'TROPICAL', 'end')}`);
    return { html, level };
  }

  // ── Cloud base: how high the ceiling sits above a house ────────────────────
  function cloudViz(ft, cover) {
    if (ft == null) return null;
    const ys = (f) => 60 - clamp(f / 12000) * 44;
    const base = ys(ft);
    const cy = base - 6;
    const op = (0.4 + 0.6 * clamp((cover == null ? 60 : cover) / 100)).toFixed(2);
    const level = ft < 500 ? 3 : ft < 1000 ? 2 : ft < 2000 ? 1 : 0;
    const arrows = [62, 92, 122].map((x, i) => `
      <g class="ww-rise" style="animation-delay:${i * -0.7}s">
        <line x1="${x}" y1="60" x2="${x}" y2="${(base + 5).toFixed(1)}" stroke="#fbbf24" stroke-width="1.2" stroke-dasharray="3 3" opacity=".75"/>
        <path d="M${x - 3} ${(base + 9).toFixed(1)}L${x} ${(base + 4).toFixed(1)}L${x + 3} ${(base + 9).toFixed(1)}" fill="none" stroke="#fbbf24" stroke-width="1.2" opacity=".85"/>
      </g>`).join('');
    const ruler = [5000, 10000].map((f) =>
      `<line x1="14" y1="${ys(f)}" x2="18" y2="${ys(f)}" stroke="#94a3b8" stroke-width=".8"/>${text(12, ys(f) + 2.5, f / 1000 + 'k', 'end')}`).join('');
    const html = svg(`
      <defs><linearGradient id="wwvSkyC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14305c"/><stop offset="1" stop-color="#2b5a8f"/></linearGradient></defs>
      <rect x="0" y="0" width="160" height="72" rx="6" fill="url(#wwvSkyC)" opacity=".55"/>
      <line x1="18" y1="60" x2="18" y2="16" stroke="#94a3b8" stroke-width=".8"/>${ruler}
      ${arrows}
      <g class="ww-drift" style="--dx:7px">
        <g opacity="${op}" fill="#e2e8f0">
          <ellipse cx="94" cy="${(cy + 1).toFixed(1)}" rx="13" ry="6"/><ellipse cx="107" cy="${(cy - 3).toFixed(1)}" rx="14" ry="8"/>
          <ellipse cx="121" cy="${(cy + 1).toFixed(1)}" rx="13" ry="6"/><rect x="82" y="${(cy + 1).toFixed(1)}" width="52" height="5" rx="2.5"/>
        </g>
      </g>
      <line x1="22" y1="${base.toFixed(1)}" x2="152" y2="${base.toFixed(1)}" stroke="#fbbf24" stroke-width="1" stroke-dasharray="4 3"/>
      ${text(26, (base - 3).toFixed(1), 'LCL', 'start', 'hi')}
      <rect x="0" y="60" width="160" height="12" fill="#1f3b2a" opacity=".9"/>
      <rect x="32" y="52" width="14" height="9" fill="#cbd5e1"/><path d="M30 52L39 45L48 52Z" fill="#ef4444"/>
      <rect x="136" y="53" width="3" height="7" fill="#7c5a3a"/><circle cx="137.5" cy="50" r="5" fill="#16a34a"/>`);
    return { html, level };
  }

  // ── Wind: compass that points where the air is going, streaks that move at its pace ──
  function windViz(mph, gust, from, bf, gustBf) {
    if (mph == null) return null;
    const bn = bf == null ? 0 : bf;
    const lv = Math.max(bn, Math.round((gustBf == null ? bn : gustBf) * 0.8));
    const lvl = lv <= 3 ? 0 : lv <= 5 ? 1 : lv === 6 ? 2 : lv <= 8 ? 3 : 4;
    const toward = from == null ? null : (from + 180) % 360;
    const arrow = toward == null
      ? text(34, 41, 'VRB', 'middle', 'hi')
      : `<g transform="rotate(${toward} 34 38)"><polygon points="34,17 39.5,42 34,37 28.5,42" fill="var(--lv)"/></g><circle cx="34" cy="38" r="2" fill="#0b1630"/>`;
    const rows = clamp(Math.round(1 + bn / 2), 1, 5);
    const dur = clamp(3.2 - mph / 12, 0.45, 3.2);
    const calm = mph < 1;
    const streaks = Array.from({ length: rows }, (_, i) => {
      const y = 14 + i * (32 / Math.max(rows, 1)) + 4;
      const x1 = 78 + (i % 2) * 10;
      const len = 40 + rand(i + 3) * 30;
      return `<line class="${calm ? '' : 'ww-streak'}" x1="${x1}" y1="${y.toFixed(1)}" x2="${(x1 + len).toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--lv)" stroke-width="2" stroke-linecap="round" stroke-dasharray="${calm ? '2 6' : '16 11'}" opacity="${calm ? 0.35 : 0.85}" style="--d:${dur.toFixed(2)}s;animation-delay:${(-i * 0.37).toFixed(2)}s"/>`;
    }).join('');
    const gb = gustBf == null ? bn : gustBf;
    const pips = Array.from({ length: 12 }, (_, i) => {
      const n = i + 1;
      const lit = n <= bn;
      const gusty = !lit && n <= gb;
      return `<rect x="${78 + i * 6.5}" y="${(65.5 - (4 + i * 0.5)).toFixed(1)}" width="5" height="${4 + i * 0.5}" rx="1" fill="${lit ? 'var(--lv)' : 'none'}" stroke="${lit ? 'none' : gusty ? 'var(--lv)' : '#475569'}" stroke-width=".9" opacity="${gusty ? 0.7 : 1}"/>`;
    }).join('');
    const html = svg(`
      <circle cx="34" cy="38" r="24" fill="rgba(255,255,255,.04)" stroke="#475569" stroke-width="1"/>
      ${text(34, 11, 'N', 'middle', 'hi')}${text(60, 41, 'E')}${text(34, 70, 'S')}${text(8, 41, 'W')}
      ${arrow}${streaks}
      ${text(78, 56, 'BEAUFORT ' + bn + (gb > bn ? ' · GUSTS ' + gb : ''), 'start')}${pips}`);
    return { html, level: lvl };
  }

  // ── Barometer: an old-fashioned weather-glass dial ─────────────────────────
  function pressureViz(hPa) {
    if (hPa == null) return null;
    const ang = (p) => -90 + 180 * clamp((p - 970) / 80);
    const zones = [[970, 995, '#ef4444'], [995, 1005, '#f97316'], [1005, 1014, '#fbbf24'], [1014, 1022, '#34d399'], [1022, 1050, '#22d3ee']];
    const arcs = zones.map(([a, b, c]) => `<path d="${arc(80, 62, 46, ang(a), ang(b))}" fill="none" stroke="${c}" stroke-width="8" opacity=".9"/>`).join('');
    const level = hPa >= 1014 ? 0 : hPa >= 1005 ? 1 : hPa >= 995 ? 2 : hPa >= 985 ? 3 : 4;
    const html = svg(`
      ${arcs}
      <line class="ww-needle" x1="80" y1="62" x2="80" y2="26" stroke="#fff" stroke-width="2" stroke-linecap="round" style="--a:${ang(hPa).toFixed(1)}deg"/>
      <circle cx="80" cy="62" r="4.5" fill="#e2e8f0"/>
      ${text(14, 70, 'STORMY', 'start')}${text(146, 70, 'FAIR', 'end')}`);
    return { html, level };
  }

  // ── UV: a sun whose rays grow with the index, plus the 11-step scale ───────
  function uvSeg(i) { return i < 3 ? '#4caf50' : i < 6 ? '#ffc107' : i < 8 ? '#ff9800' : i < 11 ? '#f44336' : '#9c27b0'; }
  function uvViz(uv, color) {
    if (uv == null) return null;
    const col = color || uvSeg(Math.round(uv));
    const len = 5 + Math.min(uv, 12) * 1.3;
    const rays = Array.from({ length: 12 }, (_, i) => {
      const [x1, y1] = polar(42, 38, 14, i * 30);
      const [x2, y2] = polar(42, 38, 14 + len, i * 30);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }).join('');
    const lit = Math.round(uv);
    const bars = Array.from({ length: 11 }, (_, i) => {
      const h = 8 + i * 3.4;
      const on = i + 1 <= lit;
      return `<rect x="${86 + i * 6.6}" y="${(58 - h).toFixed(1)}" width="5" height="${h.toFixed(1)}" rx="1.2" fill="${on ? uvSeg(i) : 'rgba(148,163,184,.18)'}"/>`;
    }).join('');
    const level = uv < 3 ? 0 : uv < 6 ? 1 : uv < 8 ? 2 : uv < 11 ? 3 : 4;
    const html = svg(`
      <circle cx="42" cy="38" r="${(13 + len * 0.55).toFixed(1)}" fill="${col}" opacity=".13" class="ww-pulse"/>
      <g class="ww-spin" stroke="${col}" stroke-width="2.4" stroke-linecap="round" opacity="${uv < 1 ? 0.4 : 0.95}">${rays}</g>
      <circle cx="42" cy="38" r="11" fill="${col}"/>
      ${bars}${text(86, 67, '0', 'start')}${text(125, 67, '5')}${text(152, 67, '11+', 'end')}`);
    return { html, level };
  }

  // ── Relative humidity: a glass that fills, beside the 30–60% comfort band ──
  function humidityViz(rh) {
    if (rh == null) return null;
    const y = 58 - clamp(rh / 100) * 50;
    const wave = `M0 ${y.toFixed(1)}` + 'q5 -3 10 0t10 0'.repeat(10) + 'V72H0Z';
    const ry = (v) => 58 - clamp(v / 100) * 50;
    const level = rh >= 85 ? 3 : rh >= 70 ? 2 : rh < 20 ? 3 : rh < 30 ? 1 : rh <= 60 ? 0 : 1;
    const html = svg(`
      <defs><clipPath id="wwvGlass"><path d="M14 8L20 58H48L54 8Z"/></clipPath></defs>
      <g clip-path="url(#wwvGlass)"><path class="ww-wave" d="${wave}" fill="#38bdf8" opacity=".72"/></g>
      <path d="M14 8L20 58H48L54 8Z" fill="none" stroke="#cbd5e1" stroke-width="1.4" stroke-linejoin="round"/>
      <rect x="98" y="8" width="9" height="50" rx="4.5" fill="rgba(148,163,184,.16)"/>
      <rect x="98" y="${ry(60).toFixed(1)}" width="9" height="${(ry(30) - ry(60)).toFixed(1)}" fill="#34d399" opacity=".85"/>
      <path d="M92 ${ry(rh).toFixed(1)}L98 ${(ry(rh) - 3.5).toFixed(1)}V${(ry(rh) + 3.5).toFixed(1)}Z" fill="#fff"/>
      <line x1="98" y1="${ry(rh).toFixed(1)}" x2="107" y2="${ry(rh).toFixed(1)}" stroke="#fff" stroke-width="1.4"/>
      ${text(113, 14, 'SOGGY', 'start')}${text(113, ((ry(60) + ry(30)) / 2 + 2.5).toFixed(1), 'IDEAL', 'start', 'hi')}${text(113, 56, 'DRY', 'start')}`);
    return { html, level };
  }

  // ── Visibility: posts fade into haze using the real contrast law ───────────
  function visibilityViz(vis) {
    if (vis == null) return null;
    const xs = [14, 36, 56, 74, 90, 104, 116, 126, 134, 140];
    const ds = [0.1, 0.25, 0.5, 1, 2, 3, 5, 8, 12, 20];
    const hs = [38, 30, 24, 19, 15, 12, 9, 7, 5, 4];
    const v = Math.max(vis, 0.05);
    const posts = xs.map((x, i) => {
      const o = Math.exp((-3.912 * ds[i]) / v);
      return `<rect x="${x - 1.5}" y="${52 - hs[i]}" width="3" height="${hs[i]}" fill="#e2e8f0" opacity="${o.toFixed(3)}"/>`;
    }).join('');
    const fog = clamp(1 - v / 9) * 0.6;
    const labels = [[1, '¼ mi'], [3, '1'], [5, '3'], [7, '8'], [9, '20']].map(([i, s]) => text(xs[i], 63, s)).join('');
    const level = vis >= 6 ? 0 : vis >= 3 ? 1 : vis >= 1 ? 2 : vis >= 0.25 ? 3 : 4;
    const html = svg(`
      <defs><linearGradient id="wwvVis" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c3b66"/><stop offset="1" stop-color="#3a6a9e"/></linearGradient></defs>
      <rect x="0" y="0" width="160" height="72" rx="6" fill="url(#wwvVis)" opacity=".5"/>
      <rect x="0" y="52" width="160" height="20" fill="#1f3b2a" opacity=".85"/>
      ${posts}
      <rect x="0" y="0" width="160" height="72" rx="6" fill="#e5e7eb" opacity="${fog.toFixed(2)}" class="ww-fogveil"/>
      ${labels}${text(152, 10, 'DISTANCE ▸', 'end')}`);
    return { html, level };
  }

  // ── Pollen and air quality arrive later from their own feed ────────────────
  function pollenViz(level, peak) {
    const grains = { 0: 4, 2: 12, 3: 22, 4: 34 }[level] || 0;
    const blades = Array.from({ length: 18 }, (_, i) => {
      const x = 6 + i * 8.4;
      const h = 8 + rand(i + 5) * 8;
      return `<path d="M${x} 66Q${x + 2} ${66 - h / 2} ${x + (i % 2 ? 3 : -3)} ${66 - h}" stroke="#22c55e" stroke-width="1.5" fill="none" opacity=".8"/>`;
    }).join('');
    const flowers = [30, 80, 130].map((x, i) => `<line x1="${x}" y1="66" x2="${x}" y2="${50 - i * 2}" stroke="#16a34a" stroke-width="1.4"/><circle cx="${x}" cy="${50 - i * 2}" r="3.4" fill="#fde047"/>`).join('');
    const dots = Array.from({ length: grains }, (_, i) => {
      const x = 8 + rand(i + 11) * 144;
      const y = 10 + rand(i + 31) * 42;
      return `<circle class="ww-float" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1 + rand(i + 2) * 0.9).toFixed(1)}" fill="#fde047" style="animation-delay:${(-rand(i + 7) * 4).toFixed(2)}s;animation-duration:${(3 + rand(i + 9) * 3).toFixed(1)}s"/>`;
    }).join('');
    const note = level == null ? text(80, 24, 'NO LOCAL POLLEN MODEL', 'middle') : peak != null ? text(152, 10, Math.round(peak) + ' grains/m³', 'end') : '';
    return svg(`${dots}${blades}${flowers}${note}`);
  }
  const POLLEN_LEVEL = { Low: 0, Moderate: 2, High: 3, 'Very high': 4 };

  const AQI_BANDS = [[0, 50, '#00e400'], [50, 100, '#ffff00'], [100, 150, '#ff7e00'], [150, 200, '#ff0000'], [200, 300, '#8f3f97'], [300, 500, '#7e0023']];
  function aqiPos(a) {
    for (let i = 0; i < AQI_BANDS.length; i++) {
      const [lo, hi] = AQI_BANDS[i];
      if (a <= hi || i === AQI_BANDS.length - 1) return (i + clamp((a - lo) / (hi - lo))) / AQI_BANDS.length;
    }
    return 0;
  }
  function aqiViz(aqi) {
    const band = AQI_BANDS.find(([, hi]) => aqi <= hi) || AQI_BANDS[5];
    const level = aqi <= 50 ? 0 : aqi <= 100 ? 1 : aqi <= 150 ? 2 : aqi <= 200 ? 3 : aqi <= 300 ? 4 : 5;
    const haze = clamp(aqi / 250) * 0.75;
    const bldg = [[10, 22], [26, 34], [42, 26], [56, 40], [74, 30], [90, 36], [108, 24], [122, 32], [138, 20]]
      .map(([x, h]) => `<rect x="${x}" y="${52 - h}" width="${x === 56 ? 16 : 12}" height="${h}" fill="#94a3b8" opacity=".55"/>`).join('');
    const specks = Array.from({ length: Math.round(clamp(aqi / 300) * 26) }, (_, i) =>
      `<circle class="ww-float" cx="${(6 + rand(i + 3) * 148).toFixed(1)}" cy="${(8 + rand(i + 17) * 42).toFixed(1)}" r="1.1" fill="#d6c3a0" style="animation-delay:${(-rand(i + 5) * 4).toFixed(2)}s"/>`).join('');
    const segs = AQI_BANDS.map(([, , c], i) => `<rect x="${8 + i * 24}" y="56" width="23" height="6" rx="1.5" fill="${c}" opacity=".9"/>`).join('');
    const x = 8 + 144 * aqiPos(aqi);
    return {
      level,
      html: svg(`${bldg}<rect x="0" y="0" width="160" height="54" fill="${band[2]}" opacity="${(haze * 0.55).toFixed(2)}"/>${specks}
        ${segs}<path d="M${x} 54L${x - 3.5} 49H${x + 3.5}Z" fill="#fff"/><line x1="${x}" y1="54" x2="${x}" y2="64" stroke="#fff" stroke-width="1.6"/>
        ${text(8, 71, 'GOOD', 'start')}${text(152, 71, 'HAZARDOUS', 'end')}`),
    };
  }

  // ── Main dial: a sky that matches the one outside ──────────────────────────
  function skyState(d) {
    const code = num(d.weatherCode);
    const precip = num(d.precipCurrent) || 0;
    const cover = num(d.cloudCover);
    const day = d.isDay !== false;
    const storm = code != null && code >= 95;
    const snow = code != null && ((code >= 71 && code <= 77) || code === 85 || code === 86);
    const fog = code === 45 || code === 48;
    const rain = !snow && ((code != null && ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))) || storm || precip > 0.01);
    return { code, precip, cover: cover == null ? 30 : cover, day, storm, snow, fog, rain };
  }
  function cloudShape(x, y, s, fill, op) {
    return `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}" opacity="${op}"><ellipse cx="0" cy="6" rx="26" ry="11"/><ellipse cx="14" cy="-2" rx="20" ry="14"/><ellipse cx="-14" cy="0" rx="16" ry="11"/><rect x="-36" y="6" width="74" height="11" rx="5"/></g>`;
  }
  function skyViz(d) {
    const dial = document.querySelector('.ww-main-dial');
    const host = document.getElementById('ww-dial-sky');
    if (!dial || !host) return;
    const s = skyState(d);
    let grad;
    let kind;
    if (s.storm) { grad = ['#2e2548', '#0b0e1c']; kind = 'storm'; }
    else if (s.snow) { grad = ['#6b7c95', '#2a3650']; kind = 'snow'; }
    else if (s.rain) { grad = ['#34445e', '#111b2e']; kind = 'rain'; }
    else if (s.fog) { grad = ['#7b8696', '#2f3a4a']; kind = 'fog'; }
    else if (!s.day) { grad = s.cover > 60 ? ['#1d2638', '#0a0f1c'] : ['#0b1636', '#050a1a']; kind = 'night'; }
    else { grad = s.cover > 70 ? ['#4a5d78', '#1b2a42'] : s.cover > 35 ? ['#3a74b8', '#17325a'] : ['#2f7fd0', '#0f3a72']; kind = 'day'; }
    dial.dataset.sky = kind;

    const nClouds = s.fog ? 0 : s.cover < 10 ? 0 : s.cover < 30 ? 1 : s.cover < 55 ? 2 : s.cover < 80 ? 3 : 4;
    const heavy = s.rain || s.storm || s.cover > 85;
    const cloudFill = s.storm ? '#4b5563' : heavy ? '#94a3b8' : s.day ? '#f1f5f9' : '#64748b';
    const clouds = Array.from({ length: nClouds }, (_, i) => {
      const x = 60 + i * 62 + rand(i + 4) * 20;
      const y = 40 + (i % 2) * 36 + rand(i + 8) * 14;
      return `<g class="ww-drift" style="--dx:${14 + i * 5}px;animation-duration:${14 + i * 4}s">${cloudShape(x.toFixed(0), y.toFixed(0), (1.1 + rand(i + 1) * 0.5).toFixed(2), cloudFill, heavy ? 0.85 : 0.75)}</g>`;
    }).join('');

    let body = '';
    const open = s.cover < 80 && !s.rain && !s.snow && !s.fog;
    if (s.day && open) {
      body += `<g class="ww-pulse"><circle cx="238" cy="52" r="46" fill="#fde68a" opacity=".16"/><circle cx="238" cy="52" r="22" fill="#fde047"/></g>`;
    } else if (!s.day && open) {
      body += `<mask id="wwvMoon"><rect width="300" height="260" fill="#fff"/><circle cx="246" cy="44" r="15" fill="#000"/></mask><circle cx="238" cy="52" r="17" fill="#f1f5f9" mask="url(#wwvMoon)"/>`;
      body += Array.from({ length: 16 }, (_, i) => `<circle class="ww-twinkle" cx="${(10 + rand(i + 2) * 280).toFixed(0)}" cy="${(8 + rand(i + 9) * 120).toFixed(0)}" r="${(0.8 + rand(i) * 0.9).toFixed(1)}" fill="#fff" style="animation-delay:${(-rand(i + 3) * 3).toFixed(1)}s"/>`).join('');
    }
    body += clouds;
    if (s.fog) {
      body += [70, 130, 190].map((y, i) => `<rect class="ww-drift" x="-40" y="${y}" width="380" height="44" rx="22" fill="#e2e8f0" opacity=".22" style="--dx:${20 + i * 8}px;animation-duration:${10 + i * 3}s"/>`).join('');
    }
    if (s.rain || s.storm) {
      const n = s.storm ? 44 : s.precip > 0.15 ? 40 : s.precip > 0.04 ? 28 : 18;
      body += Array.from({ length: n }, (_, i) => {
        const x = rand(i + 21) * 320;
        const y = rand(i + 5) * 120;
        return `<line class="ww-rain" x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - 4).toFixed(0)}" y2="${(y + 12).toFixed(0)}" stroke="#93c5fd" stroke-width="1.4" stroke-linecap="round" opacity=".7" style="animation-delay:${(-rand(i + 13) * 1.2).toFixed(2)}s;animation-duration:${(0.7 + rand(i) * 0.5).toFixed(2)}s"/>`;
      }).join('');
    }
    if (s.snow) {
      body += Array.from({ length: 36 }, (_, i) => `<circle class="ww-snow" cx="${(rand(i + 2) * 300).toFixed(0)}" cy="${(rand(i + 7) * 100).toFixed(0)}" r="${(1.3 + rand(i) * 1.5).toFixed(1)}" fill="#fff" opacity=".9" style="animation-delay:${(-rand(i + 4) * 6).toFixed(1)}s;animation-duration:${(5 + rand(i + 6) * 4).toFixed(1)}s"/>`).join('');
    }
    if (s.storm) {
      body += `<polygon class="ww-bolt" points="206,70 190,116 204,116 192,160 226,104 210,104 222,70" fill="#fde047"/>`;
    }
    host.innerHTML = `<svg viewBox="0 0 300 260" preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs><linearGradient id="wwvSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${grad[0]}"/><stop offset="1" stop-color="${grad[1]}"/></linearGradient></defs>
      <rect width="300" height="260" fill="url(#wwvSky)"/>${body}</svg>`;
  }

  function thermo(d) {
    const dot = document.getElementById('ww-dial-thermo-dot');
    if (!dot) return;
    const lo = num(d.min);
    const hi = num(d.max);
    const t = num(d.temperature);
    if (lo == null || hi == null || t == null) return;
    const pct = hi > lo ? clamp((t - lo) / (hi - lo)) * 100 : 50;
    dot.style.left = pct.toFixed(1) + '%';
  }

  function render(d) {
    if (!d) return;
    const set = (key, r) => (r ? put(key, r.html, r.level) : put(key, '', null));
    set('dew', dewViz(num(d.dewPoint)));
    set('cloud', cloudViz(d.cloudBase ? num(d.cloudBase.feet) : null, num(d.cloudCover)));
    set('wind', windViz(num(d.wind), num(d.windGusts), num(d.windDirection), d.beaufort ? num(d.beaufort.number) : null, d.windGusts != null ? beaufortFromMph(num(d.windGusts)) : null));
    set('pressure', pressureViz(d.pressure ? num(d.pressure.hPa) : null));
    set('uv', uvViz(num(d.uvIndex), d.uvInfo && d.uvInfo.color));
    set('humidity', humidityViz(num(d.humidity)));
    set('visibility', visibilityViz(num(d.visibilityMiles)));
    skyViz(d);
    thermo(d);
  }
  function beaufortFromMph(m) {
    if (m == null) return null;
    const cuts = [1, 4, 8, 13, 19, 25, 32, 39, 47, 55, 64, 73];
    return cuts.filter((c) => m >= c).length;
  }

  function renderAir(air, pollen) {
    if (air && num(air.aqi) != null) {
      const r = aqiViz(num(air.aqi));
      put('aqi', r.html, r.level);
    } else put('aqi', '', null);

    if (pollen && pollen.category && POLLEN_LEVEL[pollen.category] != null) {
      const lv = POLLEN_LEVEL[pollen.category];
      put('pollen', pollenViz(lv, pollen.peak), lv);
    } else {
      put('pollen', pollenViz(null, null), null);
    }
  }

  window.WWCockpitViz = { render, renderAir };
})();
