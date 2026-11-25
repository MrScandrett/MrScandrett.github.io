'use strict';

// ═══ Palettes ════════════════════════════════════════════════════════
const PALETTES = [
  { name:'Trilobite',  swatch:'#a08060', light:'#d0b080', mid:'#8c6e4a', dark:'#4e3520', outline:'#2e1e0a', eye:'#0a0800' },
  { name:'Red Shrimp', swatch:'#c04030', light:'#e47060', mid:'#a83828', dark:'#6a2015', outline:'#3a1008', eye:'#ffe070' },
  { name:'Ocean',      swatch:'#3878a0', light:'#68aac8', mid:'#38689a', dark:'#183f68', outline:'#0a2848', eye:'#f0ffff' },
  { name:'Olive',      swatch:'#6a8040', light:'#96b868', mid:'#587030', dark:'#2e3e10', outline:'#182008', eye:'#ffffb0' },
  { name:'Void',       swatch:'#7050a8', light:'#a888d8', mid:'#6040a0', dark:'#381870', outline:'#1a0840', eye:'#ffb0ff' },
];

// ═══ Trait Definitions ═══════════════════════════════════════════════
const CATS = [
  { key:'body', label:'Body Plan', options:[
    { name:'Segmented',  sci:'Arthropod-grade' },
    { name:'Vermiform',  sci:'Worm-grade' },
    { name:'Bilateral',  sci:'Chordate-grade' },
    { name:'Sclerotized',sci:'Lophotrochozoan' },
  ]},
  { key:'eyes', label:'Vision', options:[
    { name:'Absent',    sci:'Pre-visual' },
    { name:'Simple',    sci:'Ocellus pair' },
    { name:'Compound',  sci:'Stalked' },
    { name:'Five-Eyes', sci:'Opabiniid' },
  ]},
  { key:'limbs', label:'Locomotion', options:[
    { name:'Legs',      sci:'Biramous' },
    { name:'Paddles',   sci:'Nektonic' },
    { name:'Claws',     sci:'Raptorial' },
    { name:'Tentacles', sci:'Soft extensions' },
    { name:'None',      sci:'No drawn limbs' },
  ]},
  { key:'feed', label:'Feeding', options:[
    { name:'Mouth Cone',   sci:'Circular aperture' },
    { name:'Filter Gills', sci:'Suspension' },
    { name:'Radula',       sci:'Grazing rasper' },
    { name:'Proboscis',    sci:'Probing tube' },
  ]},
  { key:'armor', label:'Defense', options:[
    { name:'None',     sci:'Soft-bodied' },
    { name:'Spines',   sci:'Acanthomorph' },
    { name:'Sclerites',sci:'Wiwaxiid' },
    { name:'Shell',    sci:'Mineralized' },
  ]},
  { key:'tail', label:'Tail', options:[
    { name:'Caudal Fan', sci:'Arthropod' },
    { name:'Pygidium',   sci:'Trilobite-grade' },
    { name:'Ribbon',     sci:'Flexible tail' },
    { name:'None',       sci:'Acaudal' },
  ]},
];

// ─── Starting creature (trilobite-like) ──────────────────────────────
const traits = { body:0, eyes:2, limbs:0, feed:2, armor:3, tail:1, color:0 };
let activeCat = 'body';

// ═══ Name Generator ══════════════════════════════════════════════════
const NG = {
  prefix: ['Trilo','Anoma','Halli','Wiwax','Opabi','Pikae','Cambro','Burgessi'],
  mid:    ['caris','inia','ella','ops','genia','lobus','derm','culus'],
  suffix: ['pedalis','natans','brachialis','tentatus','gracilis','armatus','aculeatus','filtrans'],
};
function generateName(t) {
  const p = NG.prefix[(t.body * 2 + t.eyes) % NG.prefix.length];
  const m = NG.mid[(t.eyes + t.feed) % NG.mid.length];
  const s = NG.suffix[(t.limbs + t.armor + t.tail) % NG.suffix.length];
  return p + m + ' ' + s;
}

// ═══ Ecological Stats ════════════════════════════════════════════════
function getEcoStats(t) {
  const feedRoles = ['predator','filter-feeder','grazer','predator'];
  const role = feedRoles[t.feed];
  const limbMob  = [2,3,1,1,0][t.limbs];
  const bodyMob  = [2,3,3,1][t.body];
  const mobility = Math.min(4, Math.round((limbMob + bodyMob) / 1.6));
  const defense  = [0,2,3,4][t.armor];
  const eyePred  = [0,1,2,3][t.eyes];
  const feedPred = [3,0,0,2][t.feed];
  const predation = Math.min(4, Math.max(0, eyePred + feedPred - 1));
  const habitats = ['benthic','burrowing','nektonic','benthic'];
  return { role, mobility, defense, predation, habitat: habitats[t.body] };
}

// ═══ Drawing Utilities ═══════════════════════════════════════════════
function drawBg(ctx, W, H) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#091420');
  bg.addColorStop(0.72, '#050e18');
  bg.addColorStop(1, '#030a10');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(100,190,220,0.1)';
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.arc((i * 137 + 55) % (W - 12) + 6, (i * 89 + 28) % (H - 36) + 8, 1 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(100,75,45,0.22)';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 18) ctx.lineTo(x, H - 11 + Math.sin(x * 0.09) * 4);
  ctx.lineTo(W, H); ctx.fill();
}

function gradEllipse(ctx, x, y, rx, ry, p) {
  const g = ctx.createRadialGradient(x - rx * 0.22, y - ry * 0.3, ry * 0.08, x, y, Math.max(rx, ry) * 0.95);
  g.addColorStop(0, p.light); g.addColorStop(0.55, p.mid); g.addColorStop(1, p.dark);
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = p.outline; ctx.lineWidth = 1.8; ctx.stroke();
}

function getExt(bodyIdx, cx, cy) {
  return [
    { headX: cx + 92,  tailX: cx - 92,  ry: 30 },
    { headX: cx + 118, tailX: cx - 118, ry: 42 },
    { headX: cx + 150, tailX: cx - 150, ry: 19 },
    { headX: cx + 110, tailX: cx - 110, ry: 48 },
  ][bodyIdx] || { headX: cx + 92, tailX: cx - 92, ry: 30 };
}

// ─── Body ────────────────────────────────────────────────────────────
function drawBodyShape(ctx, idx, ext, cy, p) {
  const { headX, tailX, ry } = ext;
  const cx = (headX + tailX) / 2;
  ctx.save();
  if (idx === 0) {
    const segs = [
      { x: cx + 67, rx: 28, ry: 30 }, { x: cx + 30, rx: 25, ry: 28 },
      { x: cx - 4,  rx: 24, ry: 26 }, { x: cx - 37, rx: 23, ry: 25 },
      { x: cx - 67, rx: 21, ry: 23 },
    ];
    for (let i = segs.length - 1; i >= 0; i--) gradEllipse(ctx, segs[i].x, cy, segs[i].rx, segs[i].ry, p);
    gradEllipse(ctx, cx + 72, cy, 30, 32, p);
  } else if (idx === 1) {
    gradEllipse(ctx, cx, cy, 118, 42, p);
    for (let i = 0; i < 4; i++) {
      const fx = tailX + (headX - tailX) * (0.18 + i * 0.18);
      [1, -1].forEach(side => {
        ctx.beginPath(); ctx.ellipse(fx, cy + side * (ry + 5), 18, 9, side * 0.24, 0, Math.PI * 2);
        ctx.fillStyle = p.mid + 'bb'; ctx.fill();
        ctx.strokeStyle = p.outline + '88'; ctx.lineWidth = 1; ctx.stroke();
      });
    }
  } else if (idx === 2) {
    ctx.beginPath();
    const hx = headX, tx = tailX;
    ctx.moveTo(tx, cy);
    ctx.bezierCurveTo(cx - 60, cy - 9, cx + 50, cy + 7, hx, cy - 3);
    ctx.bezierCurveTo(hx, cy + ry * 1.4, cx + 50, cy + ry * 2.2, cx - 60, cy + ry * 2.0);
    ctx.bezierCurveTo(tx, cy + ry * 1.8, tx, cy, tx, cy);
    const g = ctx.createLinearGradient(tx, cy - ry, tx, cy + ry * 2);
    g.addColorStop(0, p.light); g.addColorStop(0.5, p.mid); g.addColorStop(1, p.dark);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = p.outline; ctx.lineWidth = 1.5; ctx.stroke();
  } else {
    gradEllipse(ctx, cx, cy, 110, 48, p);
    ctx.beginPath(); ctx.ellipse(cx, cy, 33, 46, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.light + '88'; ctx.fill();
    ctx.strokeStyle = p.outline + '44'; ctx.lineWidth = 1; ctx.stroke();
    for (let i = 1; i <= 6; i++) {
      const sx = tailX + (headX - tailX) * (i / 7);
      ctx.beginPath(); ctx.moveTo(sx, cy - 48); ctx.lineTo(sx, cy + 48);
      ctx.strokeStyle = p.outline + '44'; ctx.lineWidth = 0.8; ctx.stroke();
    }
  }
  ctx.restore();
}

// ─── Eyes ────────────────────────────────────────────────────────────
function drawEyes(ctx, idx, ext, cy, p) {
  if (idx === 0) return;
  const { headX, ry } = ext;
  const ex = headX - 16;
  ctx.save();
  if (idx === 1) {
    [cy - ry * 0.5, cy + ry * 0.5].forEach(ey => {
      ctx.beginPath(); ctx.arc(ex, ey, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#080600'; ctx.fill();
      ctx.strokeStyle = p.outline; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(ex + 2.5, ey - 2.5, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
    });
  } else if (idx === 2) {
    [cy - ry * 0.45, cy + ry * 0.45].forEach(ey => {
      for (let d = 0; d < 8; d++) {
        const a = (d / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(ex + Math.cos(a) * 6, ey + Math.sin(a) * 4.5, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = '#0e0c00'; ctx.fill();
        ctx.strokeStyle = p.outline + '66'; ctx.lineWidth = 0.5; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0e0c00'; ctx.fill();
    });
  } else {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.8 + (i / 4) * Math.PI * 1.6;
      const ex2 = ex + Math.cos(a) * 14, ey2 = cy + Math.sin(a) * 12;
      ctx.beginPath(); ctx.arc(ex2, ey2, 7, 0, Math.PI * 2);
      ctx.fillStyle = p.dark; ctx.fill();
      ctx.strokeStyle = p.outline; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(ex2 + 2, ey2 - 2, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
    }
  }
  ctx.restore();
}

// ─── Appendages / Limbs ──────────────────────────────────────────────
function drawLimbs(ctx, idx, ext, cy, p) {
  if (idx === 4) return;
  const { headX, tailX, ry } = ext;
  const len = headX - tailX;
  ctx.save(); ctx.lineCap = 'round';
  if (idx === 0) {
    for (let i = 0; i < 8; i++) {
      const lx = tailX + len * (0.1 + i * 0.1);
      [-1, 1].forEach(side => {
        ctx.beginPath();
        ctx.moveTo(lx, cy + ry * 0.8);
        ctx.lineTo(lx + side * 6, cy + ry + 16);
        ctx.lineTo(lx + side * 12, cy + ry + 22);
        ctx.strokeStyle = p.dark; ctx.lineWidth = 2.2; ctx.stroke();
      });
    }
  } else if (idx === 1) {
    for (let i = 0; i < 3; i++) {
      const px = tailX + len * (0.2 + i * 0.25);
      [-1, 1].forEach(side => {
        ctx.save();
        ctx.translate(px, cy + side * (ry + 4)); ctx.rotate(side * 0.28);
        ctx.beginPath(); ctx.ellipse(0, side * 19, 23, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = p.mid + 'cc'; ctx.fill();
        ctx.strokeStyle = p.outline + '88'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      });
    }
  } else if (idx === 2) {
    [-1, 1].forEach(side => {
      const sx = headX - 28, sy = cy + side * ry * 0.35;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx + 25, sy + side * 14, sx + 44, sy + side * 28, sx + 32, sy + side * 44);
      ctx.strokeStyle = p.mid; ctx.lineWidth = 8; ctx.stroke();
      ctx.strokeStyle = p.outline; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(sx + 32, sy + side * 44, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = p.dark; ctx.fill();
      ctx.strokeStyle = p.outline; ctx.lineWidth = 1.5; ctx.stroke();
    });
  } else if (idx === 3) {
    for (let i = 0; i < 5; i++) {
      const a = ((i - 2) / 4) * 0.75;
      const tl = 48 + (2 - Math.abs(i - 2)) * 10;
      ctx.beginPath();
      ctx.moveTo(headX - 8, cy + Math.sin(a) * 6);
      ctx.bezierCurveTo(headX + 18, cy + Math.sin(a) * 22,
        headX + 22 + tl * 0.4, cy + Math.sin(a) * tl * 0.7,
        headX + 10 + tl, cy + Math.sin(a) * tl);
      ctx.strokeStyle = p.mid; ctx.lineWidth = 3.5 - Math.abs(i - 2) * 0.5; ctx.stroke();
    }
  }
  ctx.restore();
}

// ─── Feeding Apparatus ───────────────────────────────────────────────
function drawFeed(ctx, idx, ext, cy, p) {
  const { headX, ry } = ext;
  ctx.save(); ctx.lineCap = 'round';
  if (idx === 0) {
    // Circular mouth cone (Anomalocaris-style)
    const mx = headX + 10, r = ry * 0.62;
    const g = ctx.createRadialGradient(mx, cy, r * 0.1, mx, cy, r);
    g.addColorStop(0, '#000'); g.addColorStop(0.4, p.dark); g.addColorStop(1, p.mid);
    ctx.beginPath(); ctx.arc(mx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = p.outline; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(a) * r * 0.38, cy + Math.sin(a) * r * 0.38);
      ctx.lineTo(mx + Math.cos(a) * r * 0.88, cy + Math.sin(a) * r * 0.88);
      ctx.strokeStyle = p.outline + 'aa'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(mx, cy, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = '#000'; ctx.fill();
  } else if (idx === 1) {
    // Filter gills
    for (let j = -2; j <= 2; j++) {
      const bx = headX + 8, by = cy + j * (ry * 0.38);
      const drawBranch = (x, y, angle, length, depth) => {
        if (depth === 0 || length < 1) return;
        const ex2 = x + Math.cos(angle) * length, ey2 = y + Math.sin(angle) * length;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex2, ey2);
        ctx.strokeStyle = depth === 3 ? p.mid : p.light + 'aa';
        ctx.lineWidth = depth * 1.1; ctx.stroke();
        drawBranch(ex2, ey2, angle - 0.45, length * 0.6, depth - 1);
        drawBranch(ex2, ey2, angle + 0.45, length * 0.6, depth - 1);
      };
      drawBranch(bx, by, 0, ry * 0.85, 3);
    }
  } else if (idx === 2) {
    // Radula (rasping plate)
    const rx2 = ry * 1.3, ry2 = ry * 0.5;
    ctx.beginPath(); ctx.ellipse(headX + 5, cy, rx2, ry2, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.mid + 'cc'; ctx.fill();
    ctx.strokeStyle = p.outline; ctx.lineWidth = 1.5; ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const x = headX + 5 - rx2 * 0.8 + i * (rx2 * 1.6 / 6);
      ctx.beginPath(); ctx.moveTo(x, cy - ry2 * 0.72); ctx.lineTo(x, cy + ry2 * 0.72);
      ctx.strokeStyle = p.outline + '66'; ctx.lineWidth = 0.8; ctx.stroke();
    }
  } else {
    // Proboscis
    ctx.beginPath();
    ctx.moveTo(headX, cy);
    ctx.bezierCurveTo(headX + 24, cy - 10, headX + 46, cy - 22, headX + 40, cy - 40);
    ctx.strokeStyle = p.mid; ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = p.outline; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(headX + 40, cy - 40, 6, 0, Math.PI * 2);
    ctx.fillStyle = p.dark; ctx.fill();
    ctx.strokeStyle = p.outline; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();
}

// ─── Armor ───────────────────────────────────────────────────────────
function drawArmor(ctx, idx, ext, cy, p) {
  if (idx === 0) return;
  const { headX, tailX, ry } = ext;
  const len = headX - tailX;
  ctx.save();
  if (idx === 1) {
    for (let i = 0; i < 7; i++) {
      const sx = tailX + len * (0.08 + i * 0.13);
      const sh = 14 + Math.sin(i * 1.4) * 5;
      ctx.beginPath();
      ctx.moveTo(sx - 5, cy - ry + 4); ctx.lineTo(sx, cy - ry - sh); ctx.lineTo(sx + 5, cy - ry + 4);
      ctx.fillStyle = p.dark; ctx.fill();
      ctx.strokeStyle = p.outline + '88'; ctx.lineWidth = 0.8; ctx.stroke();
    }
  } else if (idx === 2) {
    for (let i = 0; i < 4; i++) {
      const px = tailX + len * (0.14 + i * 0.22);
      const ph = 18 + i * 4;
      ctx.beginPath();
      ctx.moveTo(px - 11, cy - ry + 5); ctx.lineTo(px, cy - ry - ph); ctx.lineTo(px + 11, cy - ry + 5);
      ctx.arc(px, cy - ry + 5, 11, 0, Math.PI, true);
      ctx.fillStyle = p.mid + 'dd'; ctx.fill();
      ctx.strokeStyle = p.outline; ctx.lineWidth = 1.2; ctx.stroke();
    }
  } else if (idx === 3) {
    const shcx = (headX + tailX) / 2, shrx = (headX - tailX) / 2 + 10;
    ctx.beginPath(); ctx.ellipse(shcx, cy, shrx, ry + 9, 0, 0, Math.PI * 2);
    ctx.strokeStyle = p.dark; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = p.outline; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.restore();
}

// ─── Tail ────────────────────────────────────────────────────────────
function drawTail(ctx, idx, ext, cy, p) {
  if (idx === 3) return;
  const { tailX, ry } = ext;
  ctx.save(); ctx.lineCap = 'round';
  if (idx === 0) {
    const tips = [];
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + ((i - 2) / 4) * 0.85;
      const tl = 34 - Math.abs(i - 2) * 5;
      tips.push({ x: tailX + 4 + Math.cos(a) * tl, y: cy + Math.sin(a) * tl });
    }
    ctx.beginPath(); ctx.moveTo(tailX + 4, cy);
    tips.forEach(t => ctx.lineTo(t.x, t.y));
    ctx.closePath(); ctx.fillStyle = p.mid + '55'; ctx.fill();
    tips.forEach((t, i) => {
      ctx.beginPath(); ctx.moveTo(tailX + 4, cy); ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = p.mid; ctx.lineWidth = 3.5 - Math.abs(i - 2) * 0.5; ctx.stroke();
    });
  } else if (idx === 1) {
    ctx.beginPath();
    ctx.moveTo(tailX + 10, cy - ry * 0.38); ctx.lineTo(tailX - 20, cy); ctx.lineTo(tailX + 10, cy + ry * 0.38);
    ctx.fillStyle = p.dark; ctx.fill();
    ctx.strokeStyle = p.outline; ctx.lineWidth = 1.2; ctx.stroke();
  } else if (idx === 2) {
    // Notochord ribbon (sinusoidal)
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const x = tailX - t * 40, y = cy + Math.sin(t * Math.PI * 2.5) * ry * 0.7;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = p.mid; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = p.outline; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();
}

// ═══ Master Draw ═════════════════════════════════════════════════════
function drawCreature(canvas, t) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  drawBg(ctx, W, H);
  const p = PALETTES[t.color];
  ctx.save();
  const scale = Math.min(W / 720, H / 360);
  ctx.translate((W - 720 * scale) / 2, (H - 360 * scale) / 2);
  ctx.scale(scale, scale);
  const cx = 720 * 0.47, cy = 360 * 0.46;
  const ext = getExt(t.body, cx, cy);
  drawTail(ctx, t.tail, ext, cy, p);
  drawLimbs(ctx, t.limbs, ext, cy, p);
  drawBodyShape(ctx, t.body, ext, cy, p);
  drawFeed(ctx, t.feed, ext, cy, p);
  drawArmor(ctx, t.armor, ext, cy, p);
  drawEyes(ctx, t.eyes, ext, cy, p);
  ctx.restore();
}

// ═══ Mini Part Previews ══════════════════════════════════════════════
function renderPreview(canvas, cat, optIdx) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  drawBg(ctx, W, H);

  const p = PALETTES[0];
  const refExt = getExt(0, 0, 0);

  const noneGlyph = () => {
    ctx.fillStyle = 'rgba(224,242,241,0.2)';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('—', W/2, H/2);
  };

  ctx.save();
  ctx.translate(W / 2, H / 2);

  if (cat === 'body') {
    const bodyExt = getExt(optIdx, 0, 0);
    const scaleX = (W * 0.82) / ((bodyExt.headX - bodyExt.tailX) + 20);
    const scaleY = (H * 0.7) / (bodyExt.ry * 2 + 20);
    const s = Math.min(scaleX, scaleY, 0.4);
    ctx.scale(s, s);
    drawBodyShape(ctx, optIdx, bodyExt, 0, p);
  } else if (cat === 'eyes') {
    if (optIdx === 0) { ctx.restore(); noneGlyph(); return; }
    ctx.scale(0.38, 0.38);
    ctx.translate(-refExt.headX * 0.55, 0);
    drawEyes(ctx, optIdx, refExt, 0, p);
  } else if (cat === 'limbs') {
    if (optIdx === 4) { ctx.restore(); noneGlyph(); return; }
    ctx.scale(0.3, 0.3);
    drawLimbs(ctx, optIdx, refExt, 0, p);
  } else if (cat === 'feed') {
    ctx.scale(0.38, 0.38);
    ctx.translate(-refExt.headX * 0.62, 0);
    drawFeed(ctx, optIdx, refExt, 0, p);
  } else if (cat === 'armor') {
    if (optIdx === 0) { ctx.restore(); noneGlyph(); return; }
    ctx.scale(0.3, 0.3);
    drawArmor(ctx, optIdx, refExt, 0, p);
  } else if (cat === 'tail') {
    if (optIdx === 3) { ctx.restore(); noneGlyph(); return; }
    ctx.scale(0.38, 0.38);
    ctx.translate(refExt.tailX * 0.5, 0);
    drawTail(ctx, optIdx, refExt, 0, p);
  }

  ctx.restore();
}

// ═══ UI Rendering ════════════════════════════════════════════════════
function buildCatTabs() {
  const tabs = document.getElementById('cc-cat-tabs');
  tabs.innerHTML = '';
  CATS.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cc-cat' + (cat.key === activeCat ? ' active' : '');
    btn.textContent = cat.label;
    btn.dataset.cat = cat.key;
    btn.setAttribute('aria-pressed', String(cat.key === activeCat));
    btn.addEventListener('click', () => {
      activeCat = cat.key;
      document.querySelectorAll('.cc-cat').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      buildOptRow();
    });
    tabs.appendChild(btn);
  });
}

function buildOptRow() {
  const row = document.getElementById('cc-opt-row');
  row.innerHTML = '';
  const catDef = CATS.find(c => c.key === activeCat);
  if (!catDef) return;

  catDef.options.forEach((opt, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.setAttribute('aria-pressed', String(traits[activeCat] === i));
    card.className = 'cc-opt' + (traits[activeCat] === i ? ' sel' : '');
    card.dataset.idx = i;

    const cv = document.createElement('canvas');
    cv.className = 'cc-opt-cv';
    cv.width = 70; cv.height = 50;
    renderPreview(cv, activeCat, i);

    const name = document.createElement('div');
    name.className = 'cc-opt-name';
    name.textContent = opt.name;

    const sci = document.createElement('div');
    sci.className = 'cc-opt-sci';
    sci.textContent = opt.sci;

    card.appendChild(cv); card.appendChild(name); card.appendChild(sci);

    card.addEventListener('click', () => {
      traits[activeCat] = i;
      document.querySelectorAll('.cc-opt').forEach(c => { c.classList.remove('sel'); c.setAttribute('aria-pressed', 'false'); });
      card.classList.add('sel');
      card.setAttribute('aria-pressed', 'true');
      redraw();
    });

    row.appendChild(card);
  });
}

function buildSwatches() {
  const container = document.getElementById('cc-swatches');
  container.innerHTML = '';
  PALETTES.forEach((pal, i) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.setAttribute('aria-label', pal.name + ' color');
    sw.setAttribute('aria-pressed', String(i === traits.color));
    sw.className = 'cc-swatch' + (i === traits.color ? ' sel' : '');
    sw.style.background = pal.swatch;
    sw.title = pal.name;
    sw.addEventListener('click', () => {
      traits.color = i;
      document.querySelectorAll('.cc-swatch').forEach(s => { s.classList.remove('sel'); s.setAttribute('aria-pressed', 'false'); });
      sw.classList.add('sel');
      sw.setAttribute('aria-pressed', 'true');
      redraw();
    });
    container.appendChild(sw);
  });
}

function updateStats() {
  const s = getEcoStats(traits);
  const statsEl = document.getElementById('cc-stats');
  statsEl.innerHTML = `
    <div>
      <span class="cc-stat-lbl">Mobility ${s.mobility}/4</span>
      <div class="cc-stat-bar"><div class="cc-stat-fill cc-stat-teal" style="width:${s.mobility*25}%"></div></div>
    </div>
    <div>
      <span class="cc-stat-lbl">Defense ${s.defense}/4</span>
      <div class="cc-stat-bar"><div class="cc-stat-fill cc-stat-amber" style="width:${s.defense*25}%"></div></div>
    </div>
    <div>
      <span class="cc-stat-lbl">Predation ${s.predation}/4</span>
      <div class="cc-stat-bar"><div class="cc-stat-fill cc-stat-rust" style="width:${s.predation*25}%"></div></div>
    </div>
  `;
  const roleEl = document.getElementById('creature-role');
  if (roleEl) roleEl.textContent = s.role + ' · ' + s.habitat;
}

function redraw() {
  const canvas = document.getElementById('creatureCanvas');
  drawCreature(canvas, traits);
  const nameEl = document.getElementById('creature-name');
  if (nameEl) nameEl.textContent = generateName(traits);
  updateStats();
  updateExplanation();
}

// ═══ Mutation (random recombination) ═════════════════════════════════
function randomizeCreature() {
  CATS.forEach(cat => {
    traits[cat.key] = Math.floor(Math.random() * cat.options.length);
  });
  traits.color = Math.floor(Math.random() * PALETTES.length);
  // Refresh the picker + swatches so selection highlights match the new genome
  buildOptRow();
  buildSwatches();
  redraw();
}

// ═══ Gallery ═════════════════════════════════════════════════════════
let gallery = [];
function saveCreature() {
  gallery.unshift({ ...traits, name: generateName(traits) });
  if (gallery.length > 6) gallery.pop();
  renderGallery();
  document.getElementById('save-status').textContent = generateName(traits) + ' saved. ' + gallery.length + ' of 6 gallery spaces used.';
}
function renderGallery() {
  const row = document.getElementById('gallery-row');
  if (!row) return;
  row.innerHTML = '';
  if (!gallery.length) {
    row.innerHTML = '<p class="cc-gallery-empty">No creatures saved yet — design one above and hit Save!</p>';
    return;
  }
  gallery.forEach(g => {
    const item = document.createElement('div');
    item.className = 'cc-gallery-item';
    const recall = document.createElement('button');
    recall.type = 'button';
    recall.className = 'cc-save-btn';
    recall.textContent = 'Load design';
    recall.setAttribute('aria-label', 'Load ' + g.name);
    recall.addEventListener('click', () => {
      CATS.forEach(c => traits[c.key] = g[c.key]);
      traits.color = g.color;
      buildOptRow(); buildSwatches(); redraw();
      document.getElementById('save-status').textContent = g.name + ' loaded for comparison.';
    });
    const cv = document.createElement('canvas');
    cv.style.cssText = 'width:158px;height:70px;border-radius:5px;background:#041014;';
    cv.width = 158; cv.height = 70;
    const nm = document.createElement('div');
    nm.className = 'cc-gallery-name';
    nm.textContent = g.name;
    item.appendChild(cv); item.appendChild(nm); item.appendChild(recall);
    row.appendChild(item);
    drawCreature(cv, g);
  });
}

// ═══ Cast Presets ════════════════════════════════════════════════════
const CAST_PRESETS = [
  // Trilobite: handled by model-viewer
  null,
  // Anomalocaris: handled by model-viewer
  null,
  // Hallucigenia: handled by model-viewer (index 2, skip canvas)
  null,
  // Opabinia: bilateral, 5-eyes, paddles, proboscis, none, caudal fan
  { body:2, eyes:3, limbs:1, feed:3, armor:0, tail:0, color:2 },
  // Wiwaxia: sclerotized, simple, none, radula, sclerites, none
  { body:3, eyes:1, limbs:4, feed:2, armor:2, tail:3, color:3 },
  // Pikaia: bilateral, simple, paddles, filter gills, none, ribbon
  { body:2, eyes:1, limbs:1, feed:1, armor:0, tail:2, color:4 },
];

const RECORDS = {
  shell: ['◉  ◉  ◉', 'Hard parts', 'Shells and mineralized plates often survive when soft bodies decay. They reveal shape and protection, but miss many unshelled animals. More shells could mean more animals evolved shells—or that those animals became easier to preserve.'],
  trace: ['〰  ⋯  〰', 'Tracks and burrows', 'A burrow records behavior: an organism moved through sediment. It can reveal animal activity even without a body fossil. It rarely identifies the exact species or the full anatomy.'],
  soft: ['◉  〰  ◉', 'Exceptional preservation', 'Rare deposits such as the Burgess Shale preserve outlines and sometimes guts, limbs, or gills. They reveal organisms missing from a shell-only record. Each deposit still samples particular places, times, and burial conditions.']
};
function showRecord(key) {
  const [marks, title, explanation] = RECORDS[key];
  document.getElementById('evidence-view').innerHTML = `<div class="evidence-trace" aria-hidden="true">${marks}</div><h3>${title}</h3><p>${explanation}</p>`;
  document.querySelectorAll('[data-record]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.record === key)));
}
function updateExplanation() {
  const list = CATS.map(c => c.label + ': ' + c.options[traits[c.key]].name).join('; ');
  const task = document.getElementById('design-challenge').value;
  const feeding = traits.feed === 1 ? 'Filtering structures can collect suspended particles, but require water flow and suitable food.' : traits.feed === 2 ? 'A rasping surface could scrape food from the bottom; it would not be ideal for catching fast prey.' : 'A grasping or probing feeding structure could handle prey, but its shape alone cannot prove a predatory diet.';
  const defense = traits.armor ? 'Armor could discourage attacks, but building and carrying it can cost energy.' : 'A soft body avoids the cost of heavy armor, but may be vulnerable to attacks.';
  const prompt = task === 'graze' ? 'For grazing, compare a rasping feeder with another feeding structure.' : task === 'filter' ? 'For suspended food, compare filtering structures with a grasping feeder.' : 'For escape, compare paddles or armor with your saved design. More eyes do not automatically make an animal faster.';
  document.getElementById('trait-explanation').textContent = list + '. ' + feeding + ' ' + defense + ' ' + prompt;
}

// ═══ Init ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const mainCanvas = document.getElementById('creatureCanvas');
  if (mainCanvas) { mainCanvas.width = 720; mainCanvas.height = 360; }

  showRecord('shell');
  document.querySelectorAll('[data-record]').forEach(b => b.addEventListener('click', () => showRecord(b.dataset.record)));
  document.getElementById('design-challenge').addEventListener('change', updateExplanation);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('model-viewer').forEach(m => m.removeAttribute('auto-rotate'));
  buildCatTabs();
  buildOptRow();
  buildSwatches();

  document.getElementById('save-btn')?.addEventListener('click', saveCreature);
  document.getElementById('mutate-btn')?.addEventListener('click', randomizeCreature);

  redraw();
  renderGallery();

  // Cast canvases (skip index 2 — that's Hallucigenia model-viewer)
  CAST_PRESETS.forEach((preset, i) => {
    if (!preset) return;
    const cv = document.getElementById('cast-canvas-' + i);
    if (cv) drawCreature(cv, preset);
  });
});
