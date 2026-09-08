(() => {
  'use strict';
  const milestones = {
    '2017': 'July 25, 2017: Adobe announces its plan to end Flash Player support in 2020 and encourages migration to open web formats. A migration takes planning: an old SWF does not become HTML by renaming it.',
    '2020': 'December 31, 2020: Adobe ends Flash Player support. This is the end of the supported browser plugin, not the disappearance of every animation tool or every archived Flash work.',
    '2021': 'January 12, 2021: Adobe begins blocking content from running in Flash Player. A site that depended only on that plugin loses its normal playback route.',
    'preserve': 'Preservation today: Ruffle emulates Flash. Compatibility varies with the content and implementation. The emulator license does not grant permission to copy someone else’s game, music, or artwork.'
  };
  document.querySelectorAll('[data-flash-year]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-flash-year]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    document.getElementById('flash-event').textContent = milestones[button.dataset.flashYear];
  }));
  const star = document.getElementById('collect-star');
  if (star) {
    let score = 0;
    star.addEventListener('click', () => {
      score += 1;
      document.getElementById('star-score').textContent = `Stars collected: ${score}`;
      star.textContent = score % 2 ? '✦ Collect another star' : '★ Collect a star';
    });
    document.getElementById('star-reset').addEventListener('click', () => {
      score = 0;
      document.getElementById('star-score').textContent = 'Stars collected: 0';
    });
  }
  const canvas = document.getElementById('motion-canvas');
  if (!canvas || !window.SimKit) return;
  const view = SimKit.canvas2d(canvas, { dpr: true });
  let position = 0, distance = 0, running = false, reportTime = 0;
  const status = document.getElementById('motion-status');
  const speed = document.getElementById('motion-speed');
  const toggle = document.getElementById('motion-toggle');
  const report = () => { status.textContent = `${running ? 'Running' : 'Paused'}. Distance: ${Math.round(distance)} pixels. Speed: ${speed.value} pixels per second.`; };
  toggle.addEventListener('click', () => { running = !running; toggle.textContent = running ? 'Pause' : 'Start'; toggle.setAttribute('aria-pressed', String(running)); report(); });
  speed.addEventListener('input', () => { document.getElementById('motion-speed-value').textContent = speed.value; report(); });
  document.getElementById('motion-reset').addEventListener('click', () => { position = 0; distance = 0; report(); });
  SimKit.loop(dt => {
    const colors = SimKit.theme.colors();
    const width = Math.max(1, view.width - 32);
    if (running) { const step = Number(speed.value) * Math.min(dt, 0.05); distance += step; position = (position + step) % width; }
    const ctx = view.ctx;
    ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, view.width, view.height);
    ctx.strokeStyle = colors.text; ctx.beginPath(); ctx.moveTo(16, view.height / 2 + 22); ctx.lineTo(view.width - 16, view.height / 2 + 22); ctx.stroke();
    ctx.fillStyle = colors.accent; ctx.beginPath(); ctx.arc(16 + position, view.height / 2, 12, 0, Math.PI * 2); ctx.fill();
    reportTime += dt;
    if (running && reportTime >= 1) { report(); reportTime = 0; }
  });
  report();
})();
