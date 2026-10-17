/* Weather Watch cockpit graphics.
 * Every telemetry card draws its reading as a small scene (static SVG, shaded with
 * gradients) and gets a data-level (0 good … 5 severe) that tints the card. The main
 * dial shows a sky that matches the one outside.
 *
 * Lightweight by design: no canvas, no per-frame JS. Motion is CSS transform/opacity
 * on a few grouped elements (never one animation per particle), and it pauses when
 * the cockpit scrolls offscreen.
 *
 *   WWCockpitViz.render(data)            weather-engine result
 *   WWCockpitViz.renderAir(air, pollen)  async air-quality feed (null = unavailable)
 */
(function () {
  'use strict';

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const num = (v) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
  const rand = (i) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const polar = (cx, cy, r, deg) => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  };
  const f1 = (n) => n.toFixed(1);
  const arc = (cx, cy, r, a1, a2) => {
    const [x1, y1] = polar(cx, cy, r, a1);
    const [x2, y2] = polar(cx, cy, r, a2);
    return `M${f1(x1)} ${f1(y1)}A${r} ${r} 0 0 1 ${f1(x2)} ${f1(y2)}`;
  };
  const text = (x, y, s, anchor = 'middle', cls = '') =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" class="ww-vt ${cls}">${s}</text>`;
  const svg = (inner) => `<svg viewBox="0 0 160 72" focusable="false">${inner}</svg>`;
  const stopsOf = (stops) => stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('');
  const lg = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stopsOf(stops)}</linearGradient>`;
  const rg = (id, stops) => `<radialGradient id="${id}">${stopsOf(stops)}</radialGradient>`;

  // Sky state shared by the scene cards, set each render from the live reading.
  const sky = { day: true, cover: 30, storm: false, rain: false, snow: false, fog: false };
  function skyStops() {
    if (!sky.day) return sky.cover > 60 ? [[0, '#0f1729'], [1, '#2b364f']] : [[0, '#040a1c'], [1, '#1f3159']];
    if (sky.storm) return [[0, '#262c3b'], [1, '#6a7589']];
    if (sky.rain || sky.snow || sky.cover > 80) return [[0, '#58687c'], [1, '#aab5c3']];
    if (sky.fog) return [[0, '#7d8896'], [1, '#c4cbd3']];
    if (sky.cover > 40) return [[0, '#4a82c4'], [1, '#c4dcef']];
    return [[0, '#2a74c6'], [1, '#c1e4f8']];
  }
  const cloudStops = () => (sky.storm ? [[0, '#8a95a6'], [1, '#444d5e']] : sky.rain || sky.cover > 85 ? [[0, '#cbd3de'], [1, '#6f7a8c']] : sky.day ? [[0, '#ffffff'], [1, '#b4bfcf']] : [[0, '#aab4c4'], [1, '#4b5568']]);
  const grassStops = () => (sky.day ? [[0, '#2f6b3c'], [1, '#183d25']] : [[0, '#16301f'], [1, '#0a1a10']]);

  function put(key, html, level) {
    const slot = document.querySelector(`[data-viz="${key}"]`);
    if (!slot) return;
    slot.innerHTML = html;
    const card = slot.closest('.ww-telemetry-stat');
    if (!card) return;
    if (level == null) card.removeAttribute('data-level');
    else card.setAttribute('data-level', String(level));
  }

  // ── Dew point: comfort scale, glossy droplet riding it ─────────────────────
  const DEW_STOPS = [[0, '#38bdf8'], [0.3, '#34d399'], [0.5, '#a3e635'], [0.62, '#fbbf24'], [0.75, '#f97316'], [0.88, '#ef4444'], [1, '#a855f7']];
  function dewColor(t) {
    for (let i = DEW_STOPS.length - 1; i >= 0; i--) if (t >= DEW_STOPS[i][0]) return DEW_STOPS[i][1];
    return DEW_STOPS[0][1];
  }
  function dewViz(dew) {
    if (dew == null) return null;
    const t = clamp((dew - 40) / 40);
    const x = Math.max(14, Math.min(146, 8 + 144 * t));
    const col = dewColor(t);
    const level = dew < 55 ? 0 : dew < 65 ? 1 : dew < 70 ? 2 : dew < 75 ? 3 : 4;
    const ticks = [50, 60, 70].map((d) => {
      const tx = 8 + 144 * ((d - 40) / 40);
      return `<line x1="${tx}" y1="50" x2="${tx}" y2="54" stroke="#94a3b8" stroke-width=".8"/>${text(tx, 61, d + '°')}`;
    }).join('');
    return {
      level,
      html: svg(`
      <defs>${lg('wwvDew', DEW_STOPS, 1, 0)}${lg('wwvDewGloss', [[0, '#fff', 0.55], [1, '#fff', 0]])}${rg('wwvDrop', [[0, '#fff', 0.9], [0.35, col], [1, col]])}</defs>
      <rect x="8" y="40" width="144" height="10" rx="5" fill="url(#wwvDew)"/>
      <rect x="8" y="40" width="144" height="5" rx="2.5" fill="url(#wwvDewGloss)"/>
      ${ticks}
      <ellipse cx="${x}" cy="52" rx="6" ry="1.6" fill="#000" opacity=".3"/>
      <g class="ww-bob"><path d="M${x} 14C${x - 1} 20 ${x - 8} 25 ${x - 8} 31A8 8 0 0 0 ${x + 8} 31C${x + 8} 25 ${x + 1} 20 ${x} 14Z" fill="url(#wwvDrop)" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>
      <ellipse cx="${x - 3}" cy="29" rx="1.7" ry="3" fill="#fff" opacity=".7" transform="rotate(18 ${x - 3} 29)"/></g>
      ${text(8, 70, 'DRY', 'start')}${text(152, 70, 'TROPICAL', 'end')}`),
    };
  }

  // ── Cloud base: ceiling height above a house, cloud shadow on the ground ───
  function cloudViz(ft, cover) {
    if (ft == null) return null;
    const ys = (f) => 56 - clamp(f / 12000) * 40;
    const base = ys(ft);
    const w = 0.7 + 0.6 * clamp((cover == null ? 60 : cover) / 100);
    const flat = ft < 1500 ? 0.6 : 1;
    const wide = ft < 1500 ? 1.3 : 1;
    const level = ft < 500 ? 3 : ft < 1000 ? 2 : ft < 2000 ? 1 : 0;
    const puffs = [[-18, 2, 13, 7], [-4, -3, 15, 10], [12, -1, 14, 9], [25, 3, 11, 6]]
      .map(([x, y, rx, ry]) => `<ellipse cx="${x * wide}" cy="${y * flat - 2}" rx="${rx * wide}" ry="${ry * flat}"/>`).join('');
    const ruler = [5000, 10000].map((f) =>
      `<line x1="14" y1="${f1(ys(f))}" x2="18" y2="${f1(ys(f))}" stroke="#94a3b8" stroke-width=".8"/>${text(12, f1(ys(f) + 2.5), f / 1000 + 'k', 'end')}`).join('');
    const night = !sky.day;
    const html = svg(`
      <defs>${lg('wwvCSky', skyStops())}${lg('wwvCCl', cloudStops())}${lg('wwvCGr', grassStops())}</defs>
      <rect width="160" height="72" rx="6" fill="url(#wwvCSky)"/>
      <path d="M0 52Q25 44 55 50T110 48T160 51V60H0Z" fill="#27465f" opacity=".55"/>
      <line x1="18" y1="56" x2="18" y2="16" stroke="#94a3b8" stroke-width=".8" opacity=".8"/>${ruler}
      <ellipse cx="${100 + 12}" cy="58" rx="${f1(26 * w)}" ry="2.6" fill="#000" opacity=".3"/>
      <g class="ww-rise" fill="none" stroke="#fbbf24" stroke-width="1.2" stroke-dasharray="3 3" opacity=".8">
        ${[64, 94, 124].map((x) => `<path d="M${x} 56V${f1(base + 6)}M${x - 3} ${f1(base + 9)}L${x} ${f1(base + 5)}L${x + 3} ${f1(base + 9)}"/>`).join('')}
      </g>
      <g class="ww-drift"><g transform="translate(100 ${f1(base - 4)}) scale(${w.toFixed(2)})" fill="url(#wwvCCl)" opacity="${(0.5 + 0.5 * clamp((cover || 0) / 100)).toFixed(2)}">${puffs}<ellipse cx="3" cy="3" rx="${f1(30 * wide)}" ry="3.2"/></g></g>
      <line x1="22" y1="${f1(base)}" x2="152" y2="${f1(base)}" stroke="#fbbf24" stroke-width="1" stroke-dasharray="4 3"/>
      ${text(26, f1(base - 3), 'LCL', 'start', 'hi')}
      <rect y="56" width="160" height="16" fill="url(#wwvCGr)"/>
      <rect x="30" y="47" width="15" height="10" fill="#d8dee8"/><path d="M28 47L37.5 39L47 47Z" fill="#b83a3a"/>
      <rect x="35" y="50" width="4.5" height="4.5" fill="${night ? '#fde68a' : '#7aa7d8'}"/><rect x="40.5" y="51" width="3" height="6" fill="#7c5a3a"/>
      <rect x="137" y="49" width="3" height="8" fill="#6b4a2f"/><circle cx="138.5" cy="46" r="6" fill="#1f7a3c"/><circle cx="136" cy="44" r="3.4" fill="#2f9a50" opacity=".8"/>`);
    return { html, level };
  }

  // ── Wind: compass (where it's going), windsock (how hard), a tree that leans ──
  function windViz(mph, from, bn, gustBf) {
    if (mph == null) return null;
    bn = bn == null ? 0 : bn;
    const gb = gustBf == null ? bn : gustBf;
    const lv = Math.max(bn, Math.round(gb * 0.8));
    const level = lv <= 3 ? 0 : lv <= 5 ? 1 : lv === 6 ? 2 : lv <= 8 ? 3 : 4;
    const toward = from == null ? null : (from + 180) % 360;
    const dir = toward == null || Math.sin((toward * Math.PI) / 180) >= 0 ? 1 : -1;
    const droop = (1 - clamp(mph / 15)) * 72;
    const flutter = mph < 1 ? 0 : clamp(mph / 4, 1.2, 8);
    const sock = [0, 1, 2, 3].map((i) => {
      const x0 = i * 8; const x1 = x0 + 8; const h0 = 5.2 - i * 0.9; const h1 = h0 - 0.9;
      return `<polygon points="${x0},${-h0} ${x1},${-h1} ${x1},${h1} ${x0},${h0}" fill="${i % 2 ? '#fff' : '#f97316'}"/>`;
    }).join('');
    const lean = mph < 1 ? 0 : dir * clamp(mph / 3, 0, 14);
    const sway = clamp(bn * 1.2 + 0.6, 0.6, 9);
    const arrow = toward == null
      ? text(28, 31, 'VRB', 'middle', 'hi')
      : `<g transform="rotate(${toward} 28 28)"><polygon points="28,10 32.5,30 28,26 23.5,30" fill="var(--lv)"/><polygon points="28,46 32.5,30 28,26 23.5,30" fill="#475569"/></g>`;
    const pips = Array.from({ length: 12 }, (_, i) => {
      const n = i + 1; const lit = n <= bn; const gusty = !lit && n <= gb; const h = 3 + i * 0.5;
      return `<rect x="${8 + i * 12.2}" y="${f1(70 - h)}" width="9" height="${f1(h)}" rx="1.2" fill="${lit ? 'var(--lv)' : 'none'}" stroke="${lit ? 'none' : gusty ? 'var(--lv)' : '#475569'}" stroke-width=".9" opacity="${gusty ? 0.7 : 1}"/>`;
    }).join('');
    const html = svg(`
      <defs>${lg('wwvWSky', skyStops())}${rg('wwvBez', [[0, '#1b2b45'], [1, '#0b1424']])}${lg('wwvWGr', grassStops())}</defs>
      <rect x="62" y="0" width="98" height="52" rx="6" fill="url(#wwvWSky)" opacity=".85"/>
      <rect x="62" y="48" width="98" height="4" fill="url(#wwvWGr)"/>
      <circle cx="28" cy="28" r="20" fill="url(#wwvBez)" stroke="#64748b" stroke-width="1.4"/>
      <path d="M28 8v3M28 45v3M8 28h3M45 28h3" stroke="#94a3b8" stroke-width="1"/>${text(28, 7, 'N', 'middle', 'hi')}
      ${arrow}<circle cx="28" cy="28" r="2" fill="#e2e8f0"/>
      <line x1="80" y1="50" x2="80" y2="15" stroke="#cbd5e1" stroke-width="1.6"/><circle cx="80" cy="14" r="1.8" fill="#e2e8f0"/>
      <g transform="translate(80 17)"><g transform="scale(${dir} 1)"><g class="${flutter ? 'ww-flutter' : ''}" style="--fl:${flutter}deg"><g transform="rotate(${droop.toFixed(0)})">${sock}</g></g></g></g>
      <g transform="rotate(${lean.toFixed(1)} 136 50)"><g class="ww-sway" style="--sw:${sway.toFixed(1)}deg">
        <rect x="134.8" y="38" width="2.6" height="12" fill="#6b4a2f"/><circle cx="136" cy="33" r="9" fill="#1f7a3c"/><circle cx="132" cy="31" r="5" fill="#2f9a50" opacity=".85"/><circle cx="140" cy="35" r="4.5" fill="#16603a" opacity=".8"/>
      </g></g>
      ${text(8, 58, 'BEAUFORT ' + bn + (gb > bn ? ' · GUSTS ' + gb : ''), 'start')}${pips}`);
    return { html, level };
  }

  // ── Barometer: a brass weather-glass ───────────────────────────────────────
  function pressureViz(hPa) {
    if (hPa == null) return null;
    const ang = (p) => -90 + 180 * clamp((p - 970) / 80);
    const zones = [[970, 995, '#ef4444'], [995, 1005, '#f97316'], [1005, 1014, '#fbbf24'], [1014, 1022, '#34d399'], [1022, 1050, '#22d3ee']];
    const arcs = zones.map(([a, b, c]) => `<path d="${arc(80, 64, 44, ang(a), ang(b))}" fill="none" stroke="${c}" stroke-width="7"/>`).join('');
    const ticks = Array.from({ length: 9 }, (_, i) => {
      const a = -90 + i * 22.5;
      const [x1, y1] = polar(80, 64, 50, a); const [x2, y2] = polar(80, 64, 53, a);
      return `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"/>`;
    }).join('');
    const inHg = [[29, 982], [30, 1015.9]].map(([v, p]) => { const [x, y] = polar(80, 64, 32, ang(p)); return text(f1(x), f1(y + 2), v + '', 'middle', 'hi'); }).join('');
    const level = hPa >= 1014 ? 0 : hPa >= 1005 ? 1 : hPa >= 995 ? 2 : hPa >= 985 ? 3 : 4;
    return {
      level,
      html: svg(`
      <defs>${lg('wwvBrass', [[0, '#f5d98a'], [0.5, '#a9772b'], [1, '#e8c26a']], 1, 1)}${rg('wwvFace', [[0, '#13243d'], [1, '#08111f']])}${lg('wwvGloss', [[0, '#fff', 0.2], [1, '#fff', 0]])}</defs>
      <path d="M22 64A58 58 0 0 1 138 64Z" fill="url(#wwvFace)" stroke="url(#wwvBrass)" stroke-width="3"/>
      ${arcs}<g stroke="#94a3b8" stroke-width="1">${ticks}</g>${inHg}${text(80, 50, 'inHg', 'middle')}
      <g class="ww-needle" style="--a:${ang(hPa).toFixed(1)}deg"><path d="M78.4 66L80 22L81.6 66Z" fill="#fff"/><path d="M78.4 66L80 22L80 66Z" fill="#cbd5e1"/></g>
      <circle cx="80" cy="64" r="4.6" fill="url(#wwvBrass)"/>
      <path d="M26 60A54 54 0 0 1 134 60Q80 36 26 60Z" fill="url(#wwvGloss)"/>
      ${text(22, 71, 'STORMY', 'start')}${text(138, 71, 'FAIR', 'end')}`),
    };
  }

  // ── UV: a glowing sun whose rays grow with the index, plus the 11-step scale ──
  function uvSeg(i) { return i < 3 ? '#4caf50' : i < 6 ? '#ffc107' : i < 8 ? '#ff9800' : i < 11 ? '#f44336' : '#9c27b0'; }
  function uvViz(uv, color) {
    if (uv == null) return null;
    const col = color || uvSeg(Math.round(uv));
    const len = 5 + Math.min(uv, 12) * 1.3;
    const rays = Array.from({ length: 12 }, (_, i) => {
      const a = i * 30;
      const [ax, ay] = polar(42, 36, 14, a - 7); const [bx, by] = polar(42, 36, 14, a + 7); const [tx, ty] = polar(42, 36, 15 + len, a);
      return `<polygon points="${f1(ax)},${f1(ay)} ${f1(tx)},${f1(ty)} ${f1(bx)},${f1(by)}"/>`;
    }).join('');
    const lit = Math.round(uv);
    const bars = Array.from({ length: 11 }, (_, i) => {
      const h = 8 + i * 3.4;
      return `<rect x="${86 + i * 6.6}" y="${f1(58 - h)}" width="5" height="${f1(h)}" rx="1.2" fill="${i + 1 <= lit ? uvSeg(i) : 'rgba(148,163,184,.18)'}"/>`;
    }).join('');
    const level = uv < 3 ? 0 : uv < 6 ? 1 : uv < 8 ? 2 : uv < 11 ? 3 : 4;
    return {
      level,
      html: svg(`
      <defs>${rg('wwvGlow', [[0, col, 0.55], [1, col, 0]])}${rg('wwvCore', [[0, '#fff'], [0.45, col], [1, col]])}</defs>
      <circle class="ww-pulse" cx="42" cy="36" r="${f1(16 + len * 0.9)}" fill="url(#wwvGlow)"/>
      <g class="ww-spin" fill="${col}" opacity="${uv < 1 ? 0.4 : 0.92}">${rays}</g>
      <circle cx="42" cy="36" r="12" fill="url(#wwvCore)"/>
      ${bars}${text(86, 67, '0', 'start')}${text(125, 67, '5')}${text(152, 67, '11+', 'end')}`),
    };
  }

  // ── Relative humidity: a glass that fills, sweats when the air is wet ──────
  function humidityViz(rh) {
    if (rh == null) return null;
    const y = 58 - clamp(rh / 100) * 50;
    const wave = `M0 ${f1(y)}` + 'q5 -3 10 0t10 0'.repeat(10) + 'V72H0Z';
    const ry = (v) => 58 - clamp(v / 100) * 50;
    const level = rh >= 85 ? 3 : rh >= 70 ? 2 : rh < 20 ? 3 : rh < 30 ? 1 : rh <= 60 ? 0 : 1;
    const beads = Array.from({ length: clamp(Math.round((rh - 55) / 4), 0, 11) }, (_, i) => {
      const yy = 14 + rand(i + 3) * 40;
      const edge = i % 2 ? 1 : -1;
      const x = (edge < 0 ? 14 + (yy - 8) * 0.12 : 54 - (yy - 8) * 0.12) + edge * 1.2;
      return `<circle cx="${f1(x)}" cy="${f1(yy)}" r="${f1(0.8 + rand(i) * 0.7)}" fill="#e0f2fe" opacity=".75"/>`;
    }).join('');
    const bubbles = [[28, 50], [38, 52], [33, 44]].map(([x, yy]) => `<circle cx="${x}" cy="${yy}" r="1.1" fill="#fff" opacity=".6"/>`).join('');
    return {
      level,
      html: svg(`
      <defs><clipPath id="wwvGlassClip"><path d="M14 8L20 58H48L54 8Z"/></clipPath>${lg('wwvWater', [[0, '#7dd3fc'], [1, '#0369a1']])}${lg('wwvRefl', [[0, '#fff', 0.35], [1, '#fff', 0]], 1, 0)}</defs>
      <ellipse cx="34" cy="59" rx="18" ry="2" fill="#000" opacity=".3"/>
      <g clip-path="url(#wwvGlassClip)"><path class="ww-wave" d="${wave}" fill="url(#wwvWater)" opacity=".9"/><g class="ww-bubble">${bubbles}</g></g>
      <path d="M14 8L20 58H48L54 8Z" fill="url(#wwvRefl)" stroke="#cbd5e1" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M18 12L22 52" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".35"/>
      <ellipse cx="34" cy="8" rx="20" ry="2" fill="none" stroke="#e2e8f0" stroke-width="1" opacity=".8"/>${beads}
      <rect x="98" y="8" width="9" height="50" rx="4.5" fill="rgba(148,163,184,.16)"/>
      <rect x="98" y="${f1(ry(60))}" width="9" height="${f1(ry(30) - ry(60))}" fill="#34d399" opacity=".85"/>
      <path d="M92 ${f1(ry(rh))}L98 ${f1(ry(rh) - 3.5)}V${f1(ry(rh) + 3.5)}Z" fill="#fff"/>
      <line x1="98" y1="${f1(ry(rh))}" x2="107" y2="${f1(ry(rh))}" stroke="#fff" stroke-width="1.4"/>
      ${text(113, 14, 'SOGGY', 'start')}${text(113, f1((ry(60) + ry(30)) / 2 + 2.5), 'IDEAL', 'start', 'hi')}${text(113, 56, 'DRY', 'start')}`),
    };
  }

  // ── Visibility: ridges and posts fade with the real visual-range law ───────
  function visibilityViz(vis) {
    if (vis == null) return null;
    const v = Math.max(vis, 0.05);
    const fade = (d) => Math.exp((-3.912 * d) / v);
    const xs = [14, 36, 56, 74, 90, 104, 116, 126, 134, 140];
    const ds = [0.1, 0.25, 0.5, 1, 2, 3, 5, 8, 12, 20];
    const hs = [34, 27, 22, 17, 14, 11, 8.5, 6.5, 5, 4];
    const posts = xs.map((x, i) =>
      `<rect x="${x - 1.4}" y="${f1(54 - hs[i])}" width="2.8" height="${hs[i]}" fill="#e2e8f0" opacity="${fade(ds[i]).toFixed(3)}"/><rect x="${x - 1.4}" y="${f1(54 - hs[i])}" width="2.8" height="${f1(Math.max(1.4, hs[i] * 0.18))}" fill="#fb923c" opacity="${fade(ds[i]).toFixed(3)}"/>`).join('');
    const fog = clamp(1 - v / 9);
    const labels = [[1, '¼ mi'], [3, '1'], [5, '3'], [7, '8'], [9, '20']].map(([i, s]) => text(xs[i], 65, s)).join('');
    const level = vis >= 6 ? 0 : vis >= 3 ? 1 : vis >= 1 ? 2 : vis >= 0.25 ? 3 : 4;
    return {
      level,
      html: svg(`
      <defs>${lg('wwvVSky', skyStops())}${lg('wwvVGr', grassStops())}${lg('wwvVFog', [[0, '#dfe5ec', 0], [1, '#dfe5ec', 1]])}</defs>
      <rect width="160" height="72" rx="6" fill="url(#wwvVSky)"/>
      <path d="M0 50L20 40L38 46L58 35L80 44L100 37L130 46L160 40V56H0Z" fill="#5e7391" opacity="${fade(15).toFixed(3)}"/>
      <path d="M0 52L25 44L50 50L85 41L120 50L160 43V56H0Z" fill="#41567a" opacity="${fade(6).toFixed(3)}"/>
      <path d="M0 55Q40 46 80 53T160 50V56H0Z" fill="#2d4a3e" opacity="${fade(2).toFixed(3)}"/>
      <rect y="54" width="160" height="18" fill="url(#wwvVGr)"/>
      ${posts}
      <rect y="${f1(30 - fog * 6)}" width="160" height="${f1(24 + fog * 6)}" fill="url(#wwvVFog)" opacity="${(fog * 0.8).toFixed(2)}"/>
      <rect class="ww-fogveil" width="160" height="72" rx="6" fill="#e5e7eb" opacity="${(fog * 0.5).toFixed(2)}"/>
      ${labels}${text(152, 10, 'DISTANCE ▸', 'end')}`),
    };
  }

  // ── Pollen and air quality arrive later from their own feed ────────────────
  const POLLEN_LEVEL = { Low: 0, Moderate: 2, High: 3, 'Very high': 4 };
  function pollenViz(level, peak) {
    const n = { 0: 4, 2: 12, 3: 22, 4: 34 }[level] || 0;
    const live = level != null;
    const grain = (i) => `<circle cx="${f1(8 + rand(i + 11) * 144)}" cy="${f1(10 + rand(i + 31) * 40)}" r="${f1(1 + rand(i + 2) * 0.9)}"/>`;
    const gA = Array.from({ length: Math.ceil(n / 2) }, (_, i) => grain(i)).join('');
    const gB = Array.from({ length: Math.floor(n / 2) }, (_, i) => grain(i + 40)).join('');
    const blades = Array.from({ length: 18 }, (_, i) => {
      const x = 6 + i * 8.4; const h = 8 + rand(i + 5) * 8;
      return `<path d="M${x} 66Q${x + 2} ${f1(66 - h / 2)} ${x + (i % 2 ? 3 : -3)} ${f1(66 - h)}"/>`;
    }).join('');
    const flowers = [30, 80, 130].map((x, i) => {
      const y = 50 - i * 2;
      const petals = Array.from({ length: 5 }, (_, k) => { const [px, py] = polar(x, y, 3.3, k * 72); return `<circle cx="${f1(px)}" cy="${f1(py)}" r="2" fill="${live ? '#fef08a' : '#94a3b8'}"/>`; }).join('');
      return `<line x1="${x}" y1="66" x2="${x}" y2="${y}" stroke="#16a34a" stroke-width="1.3"/>${petals}<circle cx="${x}" cy="${y}" r="2" fill="${live ? '#f59e0b' : '#64748b'}"/>`;
    }).join('');
    const note = !live ? text(80, 24, 'NO LOCAL POLLEN MODEL', 'middle') : peak != null ? text(152, 10, Math.round(peak) + ' grains/m³', 'end') : '';
    return svg(`
      <defs>${lg('wwvPHaze', [[0, '#fde047', 0], [1, '#fde047', 0.35]])}</defs>
      <rect width="160" height="72" rx="6" fill="url(#wwvPHaze)" opacity="${live ? (0.25 + 0.2 * level).toFixed(2) : 0}"/>
      <g class="ww-float" fill="#fde047">${gA}</g><g class="ww-float b" fill="#fde047">${gB}</g>
      <g stroke="#22c55e" stroke-width="1.5" fill="none" opacity="${live ? 0.85 : 0.4}">${blades}</g>${flowers}${note}`);
  }

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
    const haze = clamp(aqi / 250);
    const far = [[6, 18], [22, 26], [38, 20], [58, 30], [80, 22], [100, 28], [120, 18], [138, 24]]
      .map(([x, h]) => `<rect x="${x}" y="${52 - h}" width="13" height="${h}"/>`).join('');
    const nearB = [[12, 22], [28, 34], [44, 26], [60, 40], [78, 30], [94, 36], [112, 24], [126, 32], [142, 20]];
    const near = nearB.map(([x, h]) => `<rect x="${x}" y="${52 - h}" width="${x === 60 ? 16 : 12}" height="${h}"/>`).join('');
    const lights = sky.day ? '' : nearB.map(([x, h], i) => `<rect x="${x + 3}" y="${52 - h + 4 + (i % 3) * 5}" width="2.4" height="2.4" fill="#fde68a"/><rect x="${x + 7}" y="${52 - h + 8 + (i % 2) * 6}" width="2.4" height="2.4" fill="#fde68a"/>`).join('');
    const speck = (i) => `<circle cx="${f1(6 + rand(i + 3) * 148)}" cy="${f1(8 + rand(i + 17) * 42)}" r="1.1"/>`;
    const total = Math.round(clamp(aqi / 300) * 26);
    const sA = Array.from({ length: Math.ceil(total / 2) }, (_, i) => speck(i)).join('');
    const sB = Array.from({ length: Math.floor(total / 2) }, (_, i) => speck(i + 50)).join('');
    const segs = AQI_BANDS.map(([, , c], i) => `<rect x="${8 + i * 24}" y="56" width="23" height="6" rx="1.5" fill="${c}" opacity=".9"/>`).join('');
    const x = 8 + 144 * aqiPos(aqi);
    return {
      level,
      html: svg(`
      <defs>${lg('wwvASky', skyStops())}${lg('wwvAHaze', [[0, band[2], 0], [1, band[2], 1]])}</defs>
      <rect width="160" height="54" rx="6" fill="url(#wwvASky)"/>
      ${sky.day ? `<circle cx="126" cy="26" r="7" fill="#fde68a" opacity="${(1 - haze * 0.9).toFixed(2)}"/>` : ''}
      <g fill="#64748b" opacity="${(0.55 - haze * 0.2).toFixed(2)}">${far}</g>
      <g fill="#334155" opacity=".95">${near}</g>${lights}
      <rect width="160" height="54" fill="url(#wwvAHaze)" opacity="${(haze * 0.7).toFixed(2)}"/>
      <g class="ww-float" fill="#d6c3a0">${sA}</g><g class="ww-float b" fill="#d6c3a0">${sB}</g>
      ${segs}<path d="M${x} 54L${x - 3.5} 49H${x + 3.5}Z" fill="#fff"/><line x1="${x}" y1="54" x2="${x}" y2="64" stroke="#fff" stroke-width="1.6"/>
      ${text(8, 71, 'GOOD', 'start')}${text(152, 71, 'HAZARDOUS', 'end')}`),
    };
  }

  // ── Main dial: a sky that matches the one outside ──────────────────────────
  function skyState(d) {
    const code = num(d.weatherCode);
    const precip = num(d.precipCurrent) || 0;
    const cover = num(d.cloudCover);
    const storm = code != null && code >= 95;
    const snow = code != null && ((code >= 71 && code <= 77) || code === 85 || code === 86);
    const fog = code === 45 || code === 48;
    const rain = !snow && ((code != null && ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))) || storm || precip > 0.01);
    return { precip, cover: cover == null ? 30 : cover, day: d.isDay !== false, storm, snow, fog, rain };
  }
  function cloudShape(x, y, s) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="6" rx="26" ry="11"/><ellipse cx="14" cy="-3" rx="20" ry="14"/><ellipse cx="-14" cy="0" rx="16" ry="11"/><ellipse cx="2" cy="-8" rx="14" ry="11"/><rect x="-36" y="6" width="74" height="11" rx="5"/></g>`;
  }
  // One tile of falling streaks, doubled so a single group animation loops seamlessly:
  // the group slides by one tile along the slant (--fx, 130) and the copy lands on the original.
  function fallGroup(cls, n, seed, len, slant, stroke, width, opacity) {
    const fx = (slant * 130) / len;
    const tile = (dx, dy) => `<g transform="translate(${f1(dx)} ${dy})">${Array.from({ length: n }, (_, i) => {
      const x = rand(i + seed) * 340 - 20; const y = rand(i + seed + 60) * 130;
      return `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x + slant)}" y2="${f1(y + len)}"/>`;
    }).join('')}</g>`;
    return `<g class="${cls}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}" style="--fx:${f1(fx)}px">${tile(0, 0)}${tile(-fx, -130)}</g>`;
  }
  function skyViz(d) {
    const dial = document.querySelector('.ww-main-dial');
    const host = document.getElementById('ww-dial-sky');
    if (!dial || !host) return;
    const s = skyState(d);
    Object.assign(sky, { day: s.day, cover: s.cover, storm: s.storm, rain: s.rain, snow: s.snow, fog: s.fog });
    let grad; let kind;
    if (s.storm) { grad = ['#2e2548', '#0b0e1c']; kind = 'storm'; }
    else if (s.snow) { grad = ['#6b7c95', '#2a3650']; kind = 'snow'; }
    else if (s.rain) { grad = ['#34445e', '#111b2e']; kind = 'rain'; }
    else if (s.fog) { grad = ['#7b8696', '#2f3a4a']; kind = 'fog'; }
    else if (!s.day) { grad = s.cover > 60 ? ['#1d2638', '#0a0f1c'] : ['#0b1636', '#050a1a']; kind = 'night'; }
    else { grad = s.cover > 70 ? ['#4a5d78', '#1b2a42'] : s.cover > 35 ? ['#3a74b8', '#17325a'] : ['#2f7fd0', '#0f3a72']; kind = 'day'; }
    dial.dataset.sky = kind;

    const nClouds = s.fog ? 0 : s.cover < 10 ? 0 : s.cover < 30 ? 1 : s.cover < 55 ? 2 : s.cover < 80 ? 3 : 4;
    const heavy = s.rain || s.storm || s.cover > 85;
    const cloudId = heavy ? 'wwvCD' : s.day ? 'wwvCL' : 'wwvCN';
    const clouds = Array.from({ length: nClouds }, (_, i) => {
      const x = 60 + i * 62 + rand(i + 4) * 20; const y = 40 + (i % 2) * 36 + rand(i + 8) * 14;
      return `<g class="ww-drift" fill="url(#${cloudId})" opacity="${heavy ? 0.9 : 0.82}" style="--dx:${14 + i * 5}px;animation-duration:${14 + i * 4}s">${cloudShape(x.toFixed(0), y.toFixed(0), (1.1 + rand(i + 1) * 0.5).toFixed(2))}</g>`;
    }).join('');

    let body = '';
    const open = s.cover < 80 && !s.rain && !s.snow && !s.fog;
    if (s.day && open) {
      body += `<circle class="ww-pulse" cx="212" cy="52" r="64" fill="url(#wwvSun)"/><circle cx="212" cy="52" r="19" fill="#fff6bf"/>`;
    } else if (!s.day && open) {
      body += `<mask id="wwvMoon"><rect width="300" height="260" fill="#fff"/><circle cx="221" cy="44" r="15" fill="#000"/></mask><circle cx="212" cy="52" r="46" fill="url(#wwvMoonGlow)"/><circle cx="212" cy="52" r="17" fill="#f1f5f9" mask="url(#wwvMoon)"/>`;
      body += `<g class="ww-twinkle" fill="#fff">${Array.from({ length: 16 }, (_, i) => `<circle cx="${(10 + rand(i + 2) * 280).toFixed(0)}" cy="${(8 + rand(i + 9) * 120).toFixed(0)}" r="${(0.8 + rand(i) * 0.9).toFixed(1)}"/>`).join('')}</g>`;
    }
    body += clouds;
    if (s.fog) body += [70, 130, 190].map((y, i) => `<rect class="ww-drift" x="-40" y="${y}" width="380" height="44" rx="22" fill="#e2e8f0" opacity=".22" style="--dx:${20 + i * 8}px;animation-duration:${10 + i * 3}s"/>`).join('');
    if (s.rain || s.storm) {
      const n = s.storm ? 20 : s.precip > 0.15 ? 18 : s.precip > 0.04 ? 13 : 8;
      body += fallGroup('ww-rain', n, 21, 14, -4, '#a5c8ff', 1.4, 0.6);
      body += fallGroup('ww-rain slow', Math.round(n * 0.7), 90, 9, -3, '#a5c8ff', 1, 0.35);
    }
    if (s.snow) {
      body += `<g class="ww-snow" fill="#fff" opacity=".9">${Array.from({ length: 22 }, (_, i) => `<circle cx="${(rand(i + 2) * 300).toFixed(0)}" cy="${(rand(i + 7) * 130).toFixed(0)}" r="${(1.3 + rand(i) * 1.4).toFixed(1)}"/><circle cx="${(rand(i + 2) * 300).toFixed(0)}" cy="${(rand(i + 7) * 130 - 130).toFixed(0)}" r="${(1.3 + rand(i) * 1.4).toFixed(1)}"/>`).join('')}</g>`;
    }
    if (s.storm) body += `<rect class="ww-bolt" width="300" height="260" fill="#fff"/><polygon class="ww-bolt" points="206,70 190,116 204,116 192,160 226,104 210,104 222,70" fill="#fde047"/>`;
    host.innerHTML = `<svg viewBox="0 0 300 260" preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs><linearGradient id="wwvSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${grad[0]}"/><stop offset="1" stop-color="${grad[1]}"/></linearGradient>
      ${lg('wwvCL', [[0, '#ffffff'], [1, '#b7c2d3']])}${lg('wwvCD', [[0, '#9aa5b5'], [1, '#4b5567']])}${lg('wwvCN', [[0, '#9aa6bb'], [1, '#475268']])}
      ${rg('wwvSun', [[0, '#fff3b0', 0.9], [0.3, '#fde047', 0.35], [1, '#fde047', 0]])}${rg('wwvMoonGlow', [[0, '#dbeafe', 0.35], [1, '#dbeafe', 0]])}</defs>
      <rect width="300" height="260" fill="url(#wwvSky)"/>${body}</svg>`;
  }

  function thermo(d) {
    const dot = document.getElementById('ww-dial-thermo-dot');
    if (!dot) return;
    const lo = num(d.min); const hi = num(d.max); const t = num(d.temperature);
    if (lo == null || hi == null || t == null) return;
    dot.style.left = (hi > lo ? clamp((t - lo) / (hi - lo)) * 100 : 50).toFixed(1) + '%';
  }

  function beaufortFromMph(m) {
    if (m == null) return null;
    return [1, 4, 8, 13, 19, 25, 32, 39, 47, 55, 64, 73].filter((c) => m >= c).length;
  }

  function render(d) {
    if (!d) return;
    const set = (key, r) => (r ? put(key, r.html, r.level) : put(key, '', null));
    skyViz(d); // first: sets the shared sky state the scene cards read
    set('dew', dewViz(num(d.dewPoint)));
    set('cloud', cloudViz(d.cloudBase ? num(d.cloudBase.feet) : null, num(d.cloudCover)));
    set('wind', windViz(num(d.wind), num(d.windDirection), d.beaufort ? num(d.beaufort.number) : null, beaufortFromMph(num(d.windGusts))));
    set('pressure', pressureViz(d.pressure ? num(d.pressure.hPa) : null));
    set('uv', uvViz(num(d.uvIndex), d.uvInfo && d.uvInfo.color));
    set('humidity', humidityViz(num(d.humidity)));
    set('visibility', visibilityViz(num(d.visibilityMiles)));
    thermo(d);
    if (lastAir) renderAir(lastAir.air, lastAir.pollen); // re-skin with the new sky
  }

  let lastAir = null;
  function renderAir(air, pollen) {
    lastAir = { air, pollen };
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

  // Pause every animation while the cockpit is offscreen.
  const grid = document.querySelector('.ww-cockpit-grid');
  if (grid && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      grid.classList.toggle('ww-offscreen', !entries[entries.length - 1].isIntersecting);
    }).observe(grid);
  }

  window.WWCockpitViz = { render, renderAir };
})();
