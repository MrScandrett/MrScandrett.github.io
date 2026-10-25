/* ─────────────────────────────────────────────────────────────────────
   Inside Classic Pong: 8-Segment Paddle Deflection Lab & Quiz
   assets/js/lessons/pong-deflection-lab.js
   ───────────────────────────────────────────────────────────────────── */
(() => {
  'use strict';

  // =========================================================================
  // 1. PADDLE DEFLECTION VISUALIZER LAB
  // =========================================================================
  const canvas = document.getElementById('pong-lab-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const modeBtns = [...document.querySelectorAll('[data-pong-lab-mode]')];
  const slider = document.getElementById('pong-impact-slider');
  const sliderOffsetOut = document.getElementById('pong-impact-offset');
  const zoneChips = [...document.querySelectorAll('[data-pong-zone]')];
  const fireBtn = document.getElementById('pong-lab-fire');
  const telemZone = document.getElementById('pong-telem-zone');
  const telemOffset = document.getElementById('pong-telem-offset');
  const telemAngle = document.getElementById('pong-telem-angle');
  const telemVelocity = document.getElementById('pong-telem-velocity');
  const insightBox = document.getElementById('pong-lab-insight');

  const W = 540, H = 260;
  canvas.width = W;
  canvas.height = H;

  // Paddle specifications (160px tall, 14px wide, centered vertically)
  const PADDLE_W = 14;
  const PADDLE_H = 160;
  const PADDLE_X = 24;
  const PADDLE_Y = (H - PADDLE_H) / 2; // 50px
  const SEG_COUNT = 8;
  const SEG_H = PADDLE_H / SEG_COUNT; // 20px per segment

  // Alcorn 8-Segment Configuration
  const SEG_CONFIG = [
    { num: 1, name: 'Zone 1: Top Tip', angle: 55, vy: -3.8, vx: 2.6, mult: 1.08, color: '#f43f5e', desc: 'Sharp upward slice. Alcorn wired the outer edge to produce the maximum 55° climb angle, forcing the opponent to rush their paddle to the ceiling.' },
    { num: 2, name: 'Zone 2: High Drive', angle: 38, vy: -2.8, vx: 3.6, mult: 1.05, color: '#fb923c', desc: 'Aggressive high-angle drive. Sends the ball diagonally across the court with a 5% speed acceleration.' },
    { num: 3, name: 'Zone 3: Inner High', angle: 18, vy: -1.4, vx: 4.2, mult: 1.02, color: '#facc15', desc: 'Controlled shallow drive upward. Easy to return, safe for building a rally.' },
    { num: 4, name: 'Zone 4: Center Top', angle: 0, vy: 0.0, vx: 4.5, mult: 1.00, color: '#38bdf8', desc: 'Dead center return. Shoots horizontally straight across the court at base velocity.' },
    { num: 5, name: 'Zone 5: Center Bottom', angle: 0, vy: 0.0, vx: 4.5, mult: 1.00, color: '#38bdf8', desc: 'Dead center return. Shoots horizontally straight across the court at base velocity.' },
    { num: 6, name: 'Zone 6: Inner Low', angle: -18, vy: 1.4, vx: 4.2, mult: 1.02, color: '#facc15', desc: 'Controlled shallow drive downward. Safe rally shot toward lower court.' },
    { num: 7, name: 'Zone 7: Low Drive', angle: -38, vy: 2.8, vx: 3.6, mult: 1.05, color: '#fb923c', desc: 'Aggressive low-angle drive. Accelerates downward into the opponent’s floor zone.' },
    { num: 8, name: 'Zone 8: Bottom Tip', angle: -55, vy: 3.8, vx: 2.6, mult: 1.08, color: '#f43f5e', desc: 'Sharp downward slice. Maximum 55° dive angle with 8% speedup. One of Pong’s most decisive offensive kill-shots.' }
  ];

  let currentMode = 'alcorn'; // 'alcorn' | 'naive'
  let currentSegment = 1; // 1 to 8 (1-indexed)
  let ball = {
    x: W - 40,
    y: PADDLE_Y + SEG_H * 0.5,
    vx: -4.5,
    vy: 0,
    r: 6,
    active: true,
    bounces: 0
  };
  let trail = [];

  function getOffsetPx(segIndex) {
    const segCenterY = PADDLE_Y + (segIndex - 0.5) * SEG_H;
    const paddleCenterY = PADDLE_Y + PADDLE_H / 2;
    return Math.round(segCenterY - paddleCenterY);
  }

  function updateTelemetry() {
    const seg = SEG_CONFIG[currentSegment - 1];
    const offset = getOffsetPx(currentSegment);

    if (sliderOffsetOut) {
      sliderOffsetOut.textContent = (offset > 0 ? `+${offset}` : `${offset}`) + ' px';
    }

    if (currentMode === 'naive') {
      if (telemZone) telemZone.textContent = 'Flat Surface';
      if (telemOffset) telemOffset.textContent = `${offset > 0 ? '+' : ''}${offset} px`;
      if (telemAngle) telemAngle.textContent = '0.0° (Locked)';
      if (telemVelocity) telemVelocity.textContent = `(${Math.abs(ball.vx).toFixed(1)}, 0.0)`;
      if (insightBox) {
        insightBox.className = 'pong-lab-insight is-deadlock';
        insightBox.innerHTML = `<strong>⚠️ FLATTENED DEADLOCK:</strong> In pure flat physics reflection, the paddle is treated as a 1D mirror line. Because the incoming horizontal ball has <code>vy = 0</code>, reflection leaves <code>vy = 0</code> unchanged. The ball bounces back and forth on the exact same scanline forever. Players cannot aim, slice, or out-angle their opponent.`;
      }
    } else {
      if (telemZone) telemZone.textContent = `Zone ${seg.num}: ${seg.name.split(':')[1].trim()}`;
      if (telemOffset) telemOffset.textContent = `${offset > 0 ? '+' : ''}${offset} px`;
      const sign = seg.angle > 0 ? '+' : '';
      if (telemAngle) telemAngle.textContent = `${sign}${seg.angle}°`;
      if (telemVelocity) telemVelocity.textContent = `(${seg.vx.toFixed(1)}, ${seg.vy.toFixed(1)}) · ${seg.mult}×`;
      if (insightBox) {
        insightBox.className = 'pong-lab-insight';
        insightBox.innerHTML = `<strong>✓ 1972 ALCORN LOGIC (${seg.name}):</strong> ${seg.desc}`;
      }
    }

    zoneChips.forEach(chip => {
      const chipNum = Number(chip.dataset.pongZone);
      chip.classList.toggle('is-active', chipNum === currentSegment && currentMode === 'alcorn');
    });
  }

  function resetBall() {
    const targetY = PADDLE_Y + (currentSegment - 0.5) * SEG_H;
    ball = {
      x: W - 40,
      y: targetY,
      vx: -4.5,
      vy: 0,
      r: 6,
      active: true,
      bounces: 0
    };
    trail = [];
  }

  function launchTest() {
    resetBall();
  }

  function setSegment(segNum) {
    currentSegment = Math.max(1, Math.min(8, segNum));
    if (slider) slider.value = String(currentSegment);
    updateTelemetry();
    launchTest();
  }

  // Event Listeners for Controls
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      currentMode = btn.dataset.pongLabMode;
      updateTelemetry();
      launchTest();
    });
  });

  if (slider) {
    slider.addEventListener('input', (e) => {
      setSegment(Number(e.target.value));
    });
  }

  zoneChips.forEach(chip => {
    chip.addEventListener('click', () => {
      setSegment(Number(chip.dataset.pongZone));
    });
  });

  if (fireBtn) {
    fireBtn.addEventListener('click', launchTest);
  }

  // Click directly on the canvas paddle to select segment
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (clickX >= PADDLE_X - 10 && clickX <= PADDLE_X + PADDLE_W + 30) {
      if (clickY >= PADDLE_Y && clickY <= PADDLE_Y + PADDLE_H) {
        const segIdx = Math.floor((clickY - PADDLE_Y) / SEG_H) + 1;
        setSegment(segIdx);
      }
    }
  });

  // Animation Loop
  function step() {
    // Physics update
    if (ball.active) {
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Trail tracking
      trail.push({ x: ball.x, y: ball.y });
      if (trail.length > 28) trail.shift();

      // Top & Bottom wall collision
      if (ball.y - ball.r <= 6) {
        ball.y = 6 + ball.r;
        ball.vy *= -1;
      } else if (ball.y + ball.r >= H - 6) {
        ball.y = H - 6 - ball.r;
        ball.vy *= -1;
      }

      // Left Paddle collision check
      const paddleRight = PADDLE_X + PADDLE_W;
      if (ball.vx < 0 && ball.x - ball.r <= paddleRight && ball.x + ball.r >= PADDLE_X) {
        // Hit within paddle vertical bounds?
        if (ball.y >= PADDLE_Y - 4 && ball.y <= PADDLE_Y + PADDLE_H + 4) {
          ball.x = paddleRight + ball.r;
          ball.bounces++;

          if (currentMode === 'naive') {
            // Naive physics: pure normal reflection (vx inverted, vy unchanged)
            ball.vx = Math.abs(ball.vx);
          } else {
            // Alcorn 8-Segment Deflection
            const seg = SEG_CONFIG[currentSegment - 1];
            ball.vx = seg.vx;
            ball.vy = seg.vy;
          }
        }
      }

      // Right boundary bounce back for continuous simulation
      if (ball.x + ball.r >= W - 14) {
        ball.x = W - 14 - ball.r;
        ball.vx = -Math.abs(ball.vx);
        // Add subtle variation if moving in Alcorn mode so rallies feel organic
        if (currentMode === 'alcorn') {
          // preserve general return
        }
      }

      // Ball misses paddle (if misaligned)
      if (ball.x < -20) {
        resetBall();
      }
    }

    // Render Frame
    render();
    requestAnimationFrame(step);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    // Court boundaries
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, W - 12, H - 12);

    // Center court net line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 6);
    ctx.lineTo(W / 2, H - 6);
    ctx.stroke();
    ctx.setLineDash([]);

    // Right dummy return paddle
    ctx.fillStyle = '#334155';
    ctx.fillRect(W - 20, ball.y - 30, 8, 60);

    // Left Paddle: Draw either Flat or 8-Segmented
    if (currentMode === 'naive') {
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(PADDLE_X, PADDLE_Y, PADDLE_W, PADDLE_H, 4);
      ctx.fill();

      // Hit line
      const targetY = PADDLE_Y + (currentSegment - 0.5) * SEG_H;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(PADDLE_X + PADDLE_W / 2, targetY, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 8 Segments
      for (let i = 0; i < SEG_COUNT; i++) {
        const seg = SEG_CONFIG[i];
        const segY = PADDLE_Y + i * SEG_H;
        const isSelected = (i + 1) === currentSegment;

        ctx.fillStyle = seg.color;
        ctx.fillRect(PADDLE_X, segY, PADDLE_W, SEG_H);

        // Segment border line
        ctx.strokeStyle = '#060913';
        ctx.lineWidth = 1;
        ctx.strokeRect(PADDLE_X, segY, PADDLE_W, SEG_H);

        // Active segment indicator outline
        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(PADDLE_X - 2, segY - 1, PADDLE_W + 4, SEG_H + 2);

          // Arrow pointing to zone
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(PADDLE_X - 10, segY + SEG_H / 2);
          ctx.lineTo(PADDLE_X - 4, segY + SEG_H / 2 - 4);
          ctx.lineTo(PADDLE_X - 4, segY + SEG_H / 2 + 4);
          ctx.closePath();
          ctx.fill();
        }

        // Zone text label
        ctx.fillStyle = isSelected ? '#ffffff' : '#64748b';
        ctx.font = '600 9px "JetBrains Mono", monospace';
        ctx.fillText(`${i + 1}`, PADDLE_X + PADDLE_W + 5, segY + 14);
      }
    }

    // Trajectory trail
    if (trail.length > 1) {
      for (let i = 0; i < trail.length; i++) {
        const alpha = (i / trail.length) * 0.45;
        ctx.fillStyle = currentMode === 'naive' ? `rgba(239, 68, 68, ${alpha})` : `rgba(56, 189, 248, ${alpha})`;
        ctx.beginPath();
        ctx.arc(trail[i].x, trail[i].y, ball.r * (0.4 + 0.6 * (i / trail.length)), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Ball
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = currentMode === 'naive' ? '#ef4444' : '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Projected reflection ray guide (dashed)
    if (ball.vx < 0 && ball.x > PADDLE_X + PADDLE_W + 20) {
      const targetY = PADDLE_Y + (currentSegment - 0.5) * SEG_H;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(PADDLE_X + PADDLE_W, targetY);
      if (currentMode === 'naive') {
        ctx.lineTo(PADDLE_X + PADDLE_W + 180, targetY);
      } else {
        const seg = SEG_CONFIG[currentSegment - 1];
        ctx.lineTo(PADDLE_X + PADDLE_W + seg.vx * 40, targetY + seg.vy * 40);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Initialize
  updateTelemetry();
  launchTest();
  requestAnimationFrame(step);

  // =========================================================================
  // 2. SELF-CHECK QUIZ COMPONENT
  // =========================================================================
  const quizCards = [...document.querySelectorAll('.pong-quiz-card')];
  quizCards.forEach(card => {
    const buttons = [...card.querySelectorAll('.pong-quiz-options button')];
    const feedbackEl = card.querySelector('.pong-quiz-feedback');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.removeAttribute('data-selected'));
        const isCorrect = btn.dataset.answer === 'correct';
        btn.dataset.selected = isCorrect ? 'correct' : 'wrong';
        if (feedbackEl) {
          feedbackEl.textContent = btn.dataset.explain || '';
        }
      });
    });
  });

})();

