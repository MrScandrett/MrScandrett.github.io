/* samples.mjs — practice files drawn with code, so they carry no license
 * baggage: a layered starter poster to take apart and a beach photo with
 * litter to retouch away.
 */
import { LayerDoc, makeCanvas, newLayer } from './doc.mjs';
import { defaultParams } from './pixels.mjs';

function rng(seed) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
}

export function buildPoster() {
  const W = 1080, H = 1350;
  const doc = new LayerDoc(W, H, 'STEAM Night poster');
  const bg = makeCanvas(W, H), b = bg.getContext('2d');
  const g = b.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#070b1f'); g.addColorStop(0.55, '#33186b'); g.addColorStop(0.82, '#b4386b'); g.addColorStop(1, '#f59e0b');
  b.fillStyle = g; b.fillRect(0, 0, W, H);
  doc.addPixelLayer('Background', bg);

  const stars = makeCanvas(W, H), s = stars.getContext('2d'), r = rng(42);
  for (let i = 0; i < 420; i++) {
    const x = r() * W, y = r() * H * 0.7, rad = r() < 0.92 ? r() * 1.4 + 0.4 : r() * 2.6 + 1.2;
    s.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.65})`;
    s.beginPath(); s.arc(x, y, rad, 0, Math.PI * 2); s.fill();
  }
  const starLayer = doc.addPixelLayer('Stars', stars);
  starLayer.blend = 'screen';

  doc.add(newLayer('shape', {
    name: 'Planet', x: 300, y: 250, shape: { type: 'ellipse', w: 480, h: 480, radius: 0, fill: '#fbbf24', stroke: '#ffffff', strokeWidth: 0 },
    fx: { glow: { on: true, color: '#fde68a', opacity: 0.85, blur: 60 } },
  }));
  const bands = makeCanvas(W, H), bc = bands.getContext('2d');
  bc.strokeStyle = '#b45309'; bc.lineCap = 'round';
  for (const [y, w] of [[380, 26], [450, 14], [540, 34], [610, 12]]) { bc.lineWidth = w; bc.beginPath(); bc.moveTo(300, y); bc.bezierCurveTo(450, y - 30, 640, y + 30, 780, y); bc.stroke(); }
  const bandLayer = doc.addPixelLayer('Planet bands', bands);
  bandLayer.blend = 'multiply'; bandLayer.opacity = 0.55;
  // a mask keeps the bands inside the planet: the band strokes are still all there underneath
  const m = makeCanvas(W, H), mc = m.getContext('2d');
  mc.fillStyle = '#fff'; mc.beginPath(); mc.arc(540, 490, 238, 0, Math.PI * 2); mc.fill();
  bandLayer.mask = { x: 0, y: 0, canvas: m, enabled: true };

  const hills = makeCanvas(W, H), h = hills.getContext('2d');
  h.fillStyle = '#0f172a'; h.beginPath(); h.moveTo(0, H);
  for (let x = 0; x <= W; x += 40) h.lineTo(x, 1010 + Math.sin(x / 90) * 40 + Math.sin(x / 33) * 14);
  h.lineTo(W, H); h.closePath(); h.fill();
  doc.addPixelLayer('Hills', hills);

  // Impact is missing on Chromebooks, Android and Linux, and the fallback sans is much wider:
  // shrink the title until it fits so the poster never opens with its headline cut off.
  const titleFont = 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif';
  const probe = makeCanvas(1, 1).getContext('2d');
  probe.font = `400 160px ${titleFont}`;
  const titleW = probe.measureText('STEAM NIGHT').width + 10 * 4;
  const titleSize = titleW > W - 180 ? Math.floor((160 * (W - 180)) / titleW) : 160;
  doc.add(newLayer('text', {
    name: 'Title', x: 90, y: 790 + Math.round((160 - titleSize) * 0.55),
    text: { content: 'STEAM NIGHT', font: titleFont, size: titleSize, color: '#ffffff', bold: false, italic: false, align: 'left', lineHeight: 1.1, tracking: 4 },
    fx: { shadow: { on: true, color: '#000000', opacity: 0.6, dx: 0, dy: 12, blur: 24 } },
  }));
  doc.add(newLayer('text', {
    name: 'Details', x: 100, y: 1150,
    text: { content: 'Thursday · 6 PM · Room 204\nRobots · Rockets · Pixel art', font: 'Inter, "Segoe UI", system-ui, sans-serif', size: 46, color: '#fde68a', bold: true, italic: false, align: 'left', lineHeight: 1.3, tracking: 0 },
  }));
  const warm = newLayer('adjust', { name: 'Warm filter', adjust: { kind: 'temperature', params: { ...defaultParams('temperature'), warmth: 30 } }, opacity: 0.7 });
  const wm = makeCanvas(W, H); const wc = wm.getContext('2d'); wc.fillStyle = '#fff'; wc.fillRect(0, 0, W, H);
  warm.mask = { x: 0, y: 0, canvas: wm, enabled: true };
  doc.add(warm);
  doc.activeId = doc.layers.find((l) => l.name === 'Title').id;
  return doc;
}

export function buildBeach() {
  const W = 1200, H = 800;
  const c = makeCanvas(W, H), ctx = c.getContext('2d');
  const r = rng(7);
  let g = ctx.createLinearGradient(0, 0, 0, 340);
  g.addColorStop(0, '#5fa8e8'); g.addColorStop(1, '#cfe8fb');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 340);
  ctx.filter = 'blur(18px)';
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (const [x, y, w] of [[220, 110, 160], [300, 95, 120], [820, 150, 200], [920, 135, 120]]) { ctx.beginPath(); ctx.ellipse(x, y, w, 34, 0, 0, 7); ctx.fill(); }
  ctx.filter = 'none';
  g = ctx.createLinearGradient(0, 330, 0, 470);
  g.addColorStop(0, '#1d6fa3'); g.addColorStop(1, '#4fb3c9');
  ctx.fillStyle = g; ctx.fillRect(0, 330, W, 145);
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 160; i++) { const x = r() * W, y = 340 + r() * 125; ctx.lineWidth = 1 + r(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8 + r() * 26, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.moveTo(0, 470);
  for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 466 + Math.sin(x / 40) * 6);
  ctx.lineTo(W, 486); ctx.lineTo(0, 486); ctx.fill();
  g = ctx.createLinearGradient(0, 475, 0, H);
  g.addColorStop(0, '#e7d3a8'); g.addColorStop(1, '#cfae74');
  ctx.fillStyle = g; ctx.fillRect(0, 478, W, H - 478);
  // sand grain
  const img = ctx.getImageData(0, 478, W, H - 478);
  for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * 34; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n * 0.8; }
  ctx.putImageData(img, 0, 478);
  // litter: a can, a bottle, a bag, each with a soft shadow
  const shadow = (x, y, w) => { ctx.filter = 'blur(6px)'; ctx.fillStyle = 'rgba(80,55,20,.35)'; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.28, 0, 0, 7); ctx.fill(); ctx.filter = 'none'; };
  shadow(752, 676, 48);
  ctx.save(); ctx.translate(745, 650); ctx.rotate(-0.35);
  ctx.fillStyle = '#d62828'; ctx.fillRect(-46, -20, 92, 40);
  ctx.fillStyle = '#e9ecef'; ctx.fillRect(-52, -20, 8, 40); ctx.fillRect(44, -20, 8, 40);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-40, -14, 80, 6);
  ctx.restore();
  shadow(352, 592, 64);
  ctx.save(); ctx.translate(350, 570); ctx.rotate(0.2);
  ctx.fillStyle = 'rgba(56,160,214,.85)'; ctx.beginPath(); ctx.roundRect(-70, -18, 110, 36, 12); ctx.fill();
  ctx.fillRect(40, -9, 22, 18); ctx.fillStyle = '#1e40af'; ctx.fillRect(60, -10, 10, 20);
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-60, -10, 90, 5);
  ctx.restore();
  shadow(965, 548, 40);
  ctx.fillStyle = 'rgba(250,250,250,.9)';
  ctx.beginPath(); ctx.moveTo(930, 540); ctx.bezierCurveTo(940, 500, 990, 495, 1000, 532); ctx.bezierCurveTo(1004, 548, 950, 556, 930, 540); ctx.fill();
  ctx.strokeStyle = 'rgba(160,160,160,.7)'; ctx.lineWidth = 2; ctx.stroke();
  const doc = new LayerDoc(W, H, 'Beach litter');
  doc.addPixelLayer('Background', c);
  return doc;
}
