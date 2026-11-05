import { bakePixels } from './project-io.mjs';
import { WORLD } from './engine.mjs';
export function createStage(canvas, project) {
  canvas.width = WORLD.width; canvas.height = WORLD.height;
  const ctx = canvas.getContext('2d'), cache = new Map();
  function image(pose) {
    if (!cache.has(pose.pixels)) cache.set(pose.pixels, bakePixels(project, pose.pixels));
    return cache.get(pose.pixels);
  }
  return function draw(s, colours = {}, inspect = true) {
    const text = colours.text || '#1a1c2c', bg = colours.bg || '#e4eaf0';
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = bg; ctx.fillRect(0, 0, 640, 300); ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle = '#94b0c244'; ctx.lineWidth = 1;
    for (let x = 0; x <= 640; x += 32) { ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, 280); ctx.stroke(); }
    for (let y = 60; y <= 280; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke(); }
    ctx.fillStyle = text; ctx.font = '14px sans-serif'; ctx.fillText(`${project.view === 'side' ? 'Side-scrolling' : 'Top-down'} asset test`, 14, 24);
    ctx.fillText(`Health ${s.health}/100    Target hits ${s.hits}`, 14, 46);
    if (project.view === 'side') { ctx.fillStyle = '#257179'; ctx.fillRect(0, WORLD.floor, 640, 5); }
    const targetY = project.view === 'top' ? 205 : WORLD.floor;
    ctx.fillStyle = '#8a542b'; ctx.fillRect(WORLD.target.x - 3, targetY - 45, 6, 45);
    ctx.fillStyle = '#ffc93c'; ctx.fillRect(WORLD.target.x - 14, targetY - 42, 28, 25); ctx.strokeStyle = '#1a1c2c'; ctx.strokeRect(WORLD.target.x - 14, targetY - 42, 28, 25);
    ctx.fillStyle = text; ctx.font = '12px sans-serif'; ctx.fillText('Practice target', WORLD.target.x - 42, targetY + 22);
    const wall = WORLD.wall;
    ctx.fillStyle = '#566c86'; ctx.fillRect(wall.x, wall.y, wall.w, wall.h); ctx.fillStyle = '#f4f4f4'; ctx.fillText('Wall', wall.x, wall.y + 17);
    ctx.fillStyle = '#566c8666'; ctx.beginPath(); ctx.ellipse(s.x, s.y - 1, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
    let offset = 0;
    if (s.state === 'gameover') {
      const t = s.actionMs; offset = t < 350 ? 0 : t < 650 ? -Math.sin((t - 350) / 300 * Math.PI) * 25 : Math.min(400, ((t - 650) / 600) ** 2 * 300);
    }
    const scale = project.size === 16 ? 3 : 2, width = project.size * scale;
    ctx.drawImage(image(s.pose), Math.round(s.x - width / 2), Math.round(s.y - s.z - width + offset), width, width);
    if (inspect) {
      ctx.strokeStyle = text; ctx.strokeRect(Math.round(s.x - 10), Math.round(s.y - s.z - 30), 20, 30);
      ctx.beginPath(); ctx.moveTo(s.x - 6, s.y); ctx.lineTo(s.x + 6, s.y); ctx.moveTo(s.x, s.y - 5); ctx.lineTo(s.x, s.y + 5); ctx.stroke();
      if (s.attackActive) {
        ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 3;
        const x = s.facing === 'left' ? s.x - 65 : s.facing === 'right' ? s.x : s.x - 30;
        const y = s.facing === 'up' ? s.y - 65 : s.facing === 'down' ? s.y : s.y - 45;
        ctx.strokeRect(x, y, ['left', 'right'].includes(s.facing) ? 65 : 60, ['left', 'right'].includes(s.facing) ? 50 : 65);
      }
    }
    if (s.benefitActive) { ctx.fillStyle = text; ctx.fillText('Recovering', s.x - 30, s.y - s.z - width - 10); }
    if (s.state === 'gameover' && s.actionMs > 1000) { ctx.fillStyle = text; ctx.font = 'bold 20px sans-serif'; ctx.fillText('Attempt over — use Retry', 200, 90); }
    if (s.state === 'victory') { ctx.fillStyle = text; ctx.font = 'bold 20px sans-serif'; ctx.fillText('Goal reached!', 245, 90); }
  };
}
