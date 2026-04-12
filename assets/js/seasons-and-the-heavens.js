/* ──────────────────────────────────────────────────────────────────────
   Seasons and the Heavens - Interactive JavaScript
   Orbital simulator, quiz, and interactive controls
   ────────────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function() {
  initializeStages();
  initializeSimulator();
  initializeQuiz();
  initializeMonthSlider();
});

/* ─── Interactive Stages ──────────────────────────────────────────────── */
function initializeStages() {
  const stageButtons = document.querySelectorAll('.sth-stage-btn');
  const stagePanels = document.querySelectorAll('.sth-stage-panel');

  stageButtons.forEach((btn) => {
    btn.addEventListener('click', function() {
      const stage = this.getAttribute('data-stage');

      // Update buttons
      stageButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      // Update panels
      stagePanels.forEach(panel => panel.classList.remove('active'));
      const activePanel = document.querySelector(`.sth-stage-panel[data-stage="${stage}"]`);
      if (activePanel) {
        activePanel.classList.add('active');
      }
    });
  });
}

/* ─── Month Slider ────────────────────────────────────────────────────── */
function initializeMonthSlider() {
  const slider = document.getElementById('sth-month-slider');
  const monthName = document.getElementById('sth-month-name');
  const dateRange = document.getElementById('sth-month-range');

  const months = [
    { name: 'January', range: '(Jan 1–31)' },
    { name: 'February', range: '(Feb 1–28)' },
    { name: 'March', range: '(Mar 1–31)' },
    { name: 'April', range: '(Apr 1–30)' },
    { name: 'May', range: '(May 1–31)' },
    { name: 'June', range: '(Jun 1–30)' },
    { name: 'July', range: '(Jul 1–31)' },
    { name: 'August', range: '(Aug 1–31)' },
    { name: 'September', range: '(Sep 1–30)' },
    { name: 'October', range: '(Oct 1–31)' },
    { name: 'November', range: '(Nov 1–30)' },
    { name: 'December', range: '(Dec 1–31)' }
  ];

  slider.addEventListener('input', function() {
    const monthIndex = parseInt(this.value);
    monthName.textContent = months[monthIndex].name;
    dateRange.textContent = months[monthIndex].range;
    updateSimulator(monthIndex);
  });
}

/* ─── Orbital Simulator ───────────────────────────────────────────────── */
function initializeSimulator() {
  const canvas = document.getElementById('sth-orbit-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const tiltToggle = document.getElementById('sth-show-tilt');
  const daylightToggle = document.getElementById('sth-show-daylight');
  const precessionToggle = document.getElementById('sth-show-precession');
  const animateBtn = document.getElementById('sth-animate-btn');
  const resetBtn = document.getElementById('sth-reset-btn');
  const quickButtons = document.querySelectorAll('.sth-quick-btn');

  let animationRunning = false;
  let precessionAngle = 0;

  // Quick jump buttons
  quickButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const month = parseInt(this.getAttribute('data-month'));
      document.getElementById('sth-month-slider').value = month;
      document.getElementById('sth-month-slider').dispatchEvent(new Event('input'));
      quickButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Toggles
  tiltToggle.addEventListener('change', () => draw());
  daylightToggle.addEventListener('change', () => draw());
  precessionToggle.addEventListener('change', () => {
    if (precessionToggle.checked) {
      precessionAngle = 0;
    }
    draw();
  });

  // Animate Orbit
  animateBtn.addEventListener('click', function() {
    animationRunning = !animationRunning;
    this.textContent = animationRunning ? '⏸ Pause' : '▶ Animate Orbit';

    if (animationRunning) {
      let month = 0;
      const interval = setInterval(() => {
        month = (month + 1) % 12;
        document.getElementById('sth-month-slider').value = month;
        document.getElementById('sth-month-slider').dispatchEvent(new Event('input'));

        if (!animationRunning) {
          clearInterval(interval);
        }
      }, 300);
    }
  });

  // Reset
  resetBtn.addEventListener('click', function() {
    animationRunning = false;
    animateBtn.textContent = '▶ Animate Orbit';
    document.getElementById('sth-month-slider').value = 0;
    document.getElementById('sth-month-slider').dispatchEvent(new Event('input'));
    tiltToggle.checked = true;
    daylightToggle.checked = false;
    precessionToggle.checked = false;
    precessionAngle = 0;
  });

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const month = parseInt(document.getElementById('sth-month-slider').value);
    drawOrbit(ctx, month, tiltToggle.checked, daylightToggle.checked, precessionToggle.checked);
  }

  window.updateSimulator = function(month) {
    if (!animationRunning) {
      precessionAngle = precessionToggle.checked ? (month * 360 / 12 / 26000) * 100 : 0;
      draw();
    }
  };

  draw();
}

function drawOrbit(ctx, month, showTilt, showDaylight, showPrecession) {
  const centerX = ctx.canvas.width / 2;
  const centerY = ctx.canvas.height / 2;
  const orbitRadius = 120;
  const earthRadius = 25;

  // Draw orbit path
  ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw Sun
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffa500';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('☀', centerX, centerY);

  // Calculate Earth position in orbit
  const angle = (month / 12) * Math.PI * 2 - Math.PI / 2;
  const earthX = centerX + orbitRadius * Math.cos(angle);
  const earthY = centerY + orbitRadius * Math.sin(angle);

  // Get season label
  const seasonLabels = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Fall', 'Fall', 'Fall', 'Winter'];
  const season = seasonLabels[month];
  const seasonColors = {
    'Winter': '#b0d4e3',
    'Spring': '#7cb342',
    'Summer': '#d4a574',
    'Fall': '#d4a574'
  };

  // Draw Earth
  ctx.fillStyle = seasonColors[season] || '#4a90e2';
  ctx.beginPath();
  ctx.arc(earthX, earthY, earthRadius, 0, Math.PI * 2);
  ctx.fill();

  // Draw Earth outline
  ctx.strokeStyle = '#1a3a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(earthX, earthY, earthRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw tilt (axis)
  if (showTilt) {
    const tiltAngle = -23.5 * Math.PI / 180;
    const axisLength = earthRadius + 15;

    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(
      earthX + Math.sin(tiltAngle) * axisLength,
      earthY - Math.cos(tiltAngle) * axisLength
    );
    ctx.lineTo(
      earthX - Math.sin(tiltAngle) * axisLength,
      earthY + Math.cos(tiltAngle) * axisLength
    );
    ctx.stroke();

    // North pole indicator
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(
      earthX + Math.sin(tiltAngle) * (earthRadius + 12),
      earthY - Math.cos(tiltAngle) * (earthRadius + 12),
      4,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Show daylight difference
  if (showDaylight) {
    ctx.fillStyle = 'rgba(255, 255, 0, 0.25)';
    const daylightStart = -90 * Math.PI / 180;
    const daylightEnd = (180 - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.arc(earthX, earthY, earthRadius, daylightStart, daylightEnd);
    ctx.lineTo(earthX, earthY);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(earthX, earthY, earthRadius, daylightStart, daylightEnd);
    ctx.stroke();
  }

  // Month label
  ctx.fillStyle = '#1d1d1f';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(season, earthX, earthY + earthRadius + 12);

  // Precession wobble
  if (showPrecession) {
    const wobbleAmount = Math.sin(month * Math.PI / 6) * 8;
    ctx.fillStyle = 'rgba(139, 127, 191, 0.2)';
    ctx.font = '12px Arial';
    ctx.fillText('Precessing...', centerX, 20);
  }

  // Update readouts
  updateReadouts(month);
}

function updateReadouts(month) {
  // Tilt angle relative to sun
  const tiltCurve = Math.sin((month + 3) / 12 * Math.PI * 2) * 23.5;
  document.getElementById('sth-tilt-angle').textContent = tiltCurve.toFixed(1) + '°';

  // Sun altitude at 40°N
  const latitude = 40;
  const declination = 23.5 * Math.sin((month - 9) / 12 * Math.PI * 2);
  const sunAngle = 90 - latitude + declination;
  document.getElementById('sth-sun-altitude').textContent = Math.max(0, sunAngle.toFixed(0)) + '°';

  // Daylight hours at 40°N
  const daylightHours = calculateDaylight(latitude, declination);
  const hours = Math.floor(daylightHours);
  const minutes = Math.round((daylightHours - hours) * 60);
  document.getElementById('sth-daylight-hours').textContent = `${hours}h ${minutes}m`;

  // Season label
  const seasonLabels = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Fall', 'Fall', 'Fall', 'Winter'];
  document.getElementById('sth-season-label').textContent = seasonLabels[month];
}

function calculateDaylight(latitude, declination) {
  const latRad = latitude * Math.PI / 180;
  const declRad = declination * Math.PI / 180;
  const cosH = -Math.tan(latRad) * Math.tan(declRad);

  if (cosH > 1) return 0;
  if (cosH < -1) return 24;

  const H = Math.acos(cosH);
  return (24 / Math.PI) * H;
}

/* ─── Quiz Functionality ──────────────────────────────────────────────── */
function initializeQuiz() {
  const checkBtn = document.getElementById('sth-quiz-check');
  const clearBtn = document.getElementById('sth-quiz-clear');
  const resultDiv = document.getElementById('sth-quiz-result');

  const answers = {
    q1: 'correct',
    q2: 'correct',
    q3: 'correct',
    q4: 'correct',
    q5: 'correct',
    q6: 'correct',
    q7: 'correct',
    q8: 'correct'
  };

  if (checkBtn) {
    checkBtn.addEventListener('click', function() {
      let score = 0;
      let total = 0;

      for (const [questionId, correctAnswer] of Object.entries(answers)) {
        const selected = document.querySelector(`input[name="${questionId}"]:checked`);
        if (selected) {
          total++;
          if (selected.value === correctAnswer) {
            score++;
          }
        }
      }

      if (total === 0) {
        resultDiv.innerHTML = '<p>Please answer at least one question.</p>';
        resultDiv.style.display = 'block';
        return;
      }

      const percentage = Math.round((score / total) * 100);
      let message = '';

      if (percentage === 100) {
        message = `<strong>Perfect! 🎉</strong> You got all ${total} questions correct! You really understand seasons and celestial mechanics.`;
      } else if (percentage >= 80) {
        message = `<strong>Excellent!</strong> ${score}/${total} correct (${percentage}%). You have a strong grasp of the material.`;
      } else if (percentage >= 60) {
        message = `<strong>Good work!</strong> ${score}/${total} correct (${percentage}%). Review the sections you found tricky.`;
      } else {
        message = `<strong>Keep learning!</strong> ${score}/${total} correct (${percentage}%). Review the lesson and try again.`;
      }

      resultDiv.innerHTML = message;
      resultDiv.classList.remove('error');
      resultDiv.style.display = 'block';
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      document.querySelectorAll('.sth-quiz-option input[type="radio"]').forEach(input => {
        input.checked = false;
      });
      resultDiv.style.display = 'none';
    });
  }
}

/* ─── Utility: Arrow marker for SVG ───────────────────────────────────── */
function addArrowMarker() {
  const svg = document.createElement('svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.innerHTML = `
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <polygon points="0 0, 10 3, 0 6" fill="#ff6b6b" />
      </marker>
    </defs>
  `;
  document.body.appendChild(svg);
}

addArrowMarker();

/* ─── Initialize on page load ─────────────────────────────────────────── */
window.addEventListener('load', function() {
  const slider = document.getElementById('sth-month-slider');
  if (slider) {
    slider.dispatchEvent(new Event('input'));
  }
});
