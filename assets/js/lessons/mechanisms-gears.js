/* Mechanisms and Gear Systems: the Mechanical Advantage Studio (gear-pair hoist lab).
 * Page: lessons/engineering/mechanical-and-civil-design/mechanisms-gears.html (moved out of an inline <script>).
 */
(function () {
  const INPUT_TORQUE = 420;
  const INPUT_SPEED_RPM = 120;
  const EFFICIENCY = 0.92;
  const DRUM_RADIUS_METERS = 0.18;
  const GRAVITY = 9.81;
  const SAFE_OUTPUT_SPEED_RPM = 52;
  const LIFT_TARGET = 150;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.getElementById('gearCanvas');
  const ctx = canvas.getContext('2d');
  const stageCopy = document.getElementById('gear-stage-copy');
  const stageLoad = document.getElementById('gear-stage-load');
  const stageNote = document.getElementById('gear-stage-note');
  const signal = document.getElementById('gear-signal');
  const statusPill = document.getElementById('gear-status-pill');
  const verdictEl = document.getElementById('gear-verdict');
  const verdictCopy = document.getElementById('gear-verdict-copy');
  const ratioDisplay = document.getElementById('gear-ratio-display');
  const torqueValue = document.getElementById('gear-torque-value');
  const speedValue = document.getElementById('gear-speed-value');
  const torqueBar = document.getElementById('gear-torque-bar');
  const speedBar = document.getElementById('gear-speed-bar');
  const balanceNeedle = document.getElementById('gear-balance-needle');
  const outputTorqueEl = document.getElementById('gear-output-torque');
  const requiredTorqueEl = document.getElementById('gear-required-torque');
  const outputSpeedEl = document.getElementById('gear-output-speed');
  const driverSlider = document.getElementById('gear-driver-slider');
  const drivenSlider = document.getElementById('gear-driven-slider');
  const loadSlider = document.getElementById('gear-load-slider');
  const driverLabel = document.getElementById('gear-driver-label');
  const drivenLabel = document.getElementById('gear-driven-label');
  const loadLabel = document.getElementById('gear-load-label');
  const testButton = document.getElementById('gear-test-btn');
  const feedback = document.getElementById('gear-test-feedback');
  const predictions = Array.from(document.querySelectorAll('input[name="gear-prediction"]'));
  const presets = Array.from(document.querySelectorAll('[data-gear-preset]'));
  const presetValues = {
    stall: [20, 28, 500],
    overspeed: [16, 24, 250],
    safe: [8, 40, 500]
  };
  let stallTimer = null;
  let compactCanvas = false;

  const system = {
    driverTeeth: 20,
    drivenTeeth: 28,
    loadKg: 500,
    ratio: 1.4,
    outputTorque: 0,
    requiredTorque: 0,
    outputSpeed: 0,
    rotation: 0,
    running: false,
    mode: 'ready',
    lift: 0,
    bounce: 0,
    lastTime: 0,
    stallPhase: 0,
    particles: []
  };

  function clamp(min, value, max) {
    return Math.max(min, Math.min(value, max));
  }

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    compactCanvas = bounds.width < 500;
    canvas.width = Math.round(bounds.width * dpr);
    canvas.height = Math.round(bounds.height * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(canvas.width / (compactCanvas ? 380 : 840), canvas.height / (compactCanvas ? 300 : 470));
  }

  function computeState() {
    system.driverTeeth = Number(driverSlider.value);
    system.drivenTeeth = Number(drivenSlider.value);
    system.loadKg = Number(loadSlider.value);
    system.ratio = system.drivenTeeth / system.driverTeeth;
    system.outputTorque = INPUT_TORQUE * system.ratio * EFFICIENCY;
    system.requiredTorque = system.loadKg * GRAVITY * DRUM_RADIUS_METERS;
    system.outputSpeed = INPUT_SPEED_RPM / system.ratio;
  }

  function setReadyState() {
    window.clearTimeout(stallTimer);
    system.running = false;
    system.mode = 'ready';
    system.lift = 0;
    system.bounce = 0;
    system.stallPhase = 0;
    system.particles = [];
    testButton.disabled = !predictions.some(function (input) { return input.checked; });
    testButton.textContent = testButton.disabled ? 'Choose a prediction to test' : 'Engage motor';
    statusPill.textContent = 'System ready';
    statusPill.className = 'gear-status-pill';
  }

  function updateUi() {
    computeState();

    driverLabel.textContent = system.driverTeeth + 'T';
    drivenLabel.textContent = system.drivenTeeth + 'T';
    loadLabel.textContent = system.loadKg + ' kg';
    stageLoad.textContent = system.loadKg + ' kg crate on a ' + DRUM_RADIUS_METERS.toFixed(2) + ' m winch drum';

    ratioDisplay.textContent = system.drivenTeeth + ' \u00F7 ' + system.driverTeeth + ' = ' + system.ratio.toFixed(2) + ' : 1';

    const torqueMultiplier = system.ratio * EFFICIENCY;
    const speedMultiplier = 1 / system.ratio;
    torqueValue.textContent = torqueMultiplier.toFixed(2) + 'x';
    speedValue.textContent = speedMultiplier.toFixed(2) + 'x';
    torqueBar.style.width = Math.min(100, torqueMultiplier * 28) + '%';
    speedBar.style.width = Math.min(100, speedMultiplier * 80) + '%';

    const balance = clamp(0, ((system.ratio - 0.5) / (6 - 0.5)) * 100, 100);
    balanceNeedle.style.left = balance.toFixed(1) + '%';

    outputTorqueEl.textContent = Math.round(system.outputTorque) + ' Nm';
    requiredTorqueEl.textContent = Math.round(system.requiredTorque) + ' Nm';
    outputSpeedEl.textContent = Math.round(system.outputSpeed) + ' rpm';

    if (system.outputTorque < system.requiredTorque) {
      verdictEl.textContent = 'Undersized';
      verdictCopy.textContent = 'The motor is currently short on torque. Increase the reduction ratio to gain lifting force.';
      stageCopy.textContent = 'Your output shaft is too weak for this load. A larger driven gear or a smaller driver gear will trade speed for lifting force.';
      stageNote.textContent = 'This setup stalls because the output torque never beats the load torque on the drum.';
      signal.textContent = 'Torque deficit';
      signal.className = 'gear-signal is-danger';
    } else if (system.outputSpeed > SAFE_OUTPUT_SPEED_RPM) {
      verdictEl.textContent = 'Too fast';
      verdictCopy.textContent = 'The load can move, but the winch rpm is too high for a safe lift. Reduce the output speed before testing.';
      stageCopy.textContent = 'This transmission has enough force, but it is tuned like a race car instead of a hoist. You need more control.';
      stageNote.textContent = 'The crate will surge upward too quickly. Increase reduction until the lift speed comes back into the safe band.';
      signal.textContent = 'Overspeed risk';
      signal.className = 'gear-signal is-warn';
    } else {
      verdictEl.textContent = 'Lift-capable';
      verdictCopy.textContent = 'This ratio has enough torque and a safe enough output speed to hoist the crate steadily.';
      stageCopy.textContent = 'The ratio now favors the kind of slow, controlled force a hoist needs. Engage the motor and watch the reduction do its job.';
      stageNote.textContent = 'This setup should lift safely because output torque exceeds the load while winch speed stays controlled.';
      signal.textContent = 'Safe operating band';
      signal.className = 'gear-signal';
    }
  }

  function setStatus(text, className) {
    statusPill.textContent = text;
    statusPill.className = 'gear-status-pill ' + className;
  }

  function toothPath(radius, teeth, toothDepth) {
    const path = new Path2D();
    const step = (Math.PI * 2) / teeth;

    for (let tooth = 0; tooth < teeth; tooth += 1) {
      const start = tooth * step;
      const outerA = start + (step * 0.18);
      const outerB = start + (step * 0.52);
      const innerB = start + (step * 0.76);
      const innerRadius = radius * 0.92;
      const outerRadius = radius + toothDepth;

      const points = [
        [Math.cos(start) * innerRadius, Math.sin(start) * innerRadius],
        [Math.cos(outerA) * radius, Math.sin(outerA) * radius],
        [Math.cos(outerA + (step * 0.08)) * outerRadius, Math.sin(outerA + (step * 0.08)) * outerRadius],
        [Math.cos(outerB) * outerRadius, Math.sin(outerB) * outerRadius],
        [Math.cos(innerB) * radius, Math.sin(innerB) * radius]
      ];

      if (tooth === 0) {
        path.moveTo(points[0][0], points[0][1]);
      }

      points.forEach(function (point) {
        path.lineTo(point[0], point[1]);
      });
    }

    path.closePath();
    return path;
  }

  function drawGear(config) {
    const toothDepth = Math.max(8, config.radius * 0.12);
    ctx.save();
    ctx.translate(config.x, config.y);
    ctx.rotate(config.angle);

    const gearPath = toothPath(config.radius, config.teeth, toothDepth);
    const fill = ctx.createRadialGradient(-config.radius * 0.2, -config.radius * 0.24, 10, 0, 0, config.radius + toothDepth);
    fill.addColorStop(0, config.innerColor);
    fill.addColorStop(1, config.outerColor);

    ctx.fillStyle = fill;
    ctx.strokeStyle = config.stroke;
    ctx.lineWidth = 2;
    ctx.fill(gearPath);
    ctx.stroke(gearPath);

    ctx.beginPath();
    ctx.arc(0, 0, config.radius * 0.46, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(9, 16, 28, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(201, 226, 255, 0.16)';
    ctx.stroke();

    for (let spoke = 0; spoke < 6; spoke += 1) {
      const theta = (Math.PI * 2 * spoke) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(theta) * config.radius * 0.18, Math.sin(theta) * config.radius * 0.18);
      ctx.lineTo(Math.cos(theta) * config.radius * 0.78, Math.sin(theta) * config.radius * 0.78);
      ctx.strokeStyle = 'rgba(225, 239, 255, 0.16)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#dfe7f2';
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = 'rgba(228, 238, 250, 0.82)';
    ctx.font = '700 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(config.label, config.x, config.y + config.radius + 30);
  }

  function drawMotor(x, y) {
    ctx.save();
    ctx.fillStyle = '#121d30';
    ctx.strokeStyle = 'rgba(246, 193, 85, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 78, y - 42, 110, 84, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f7c95d';
    ctx.font = '800 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MOTOR', x - 22, y - 8);
    ctx.fillStyle = 'rgba(225, 235, 248, 0.8)';
    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillText('420 Nm · 120 rpm', x - 22, y + 14);
    ctx.restore();
  }

  function drawTorqueArrow(x, y, width, color, label) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width - 12, y - 8);
    ctx.moveTo(x + width, y);
    ctx.lineTo(x + width - 12, y + 8);
    ctx.stroke();

    ctx.font = '700 10px JetBrains Mono, monospace';
    ctx.textAlign = width >= 0 ? 'left' : 'right';
    ctx.fillText(label, x + width + (width >= 0 ? 10 : -10), y + 4);
    ctx.restore();
  }

  function drawCrate(x, groundY, dt) {
    const ropeTop = 104;
    const crateSize = 54;
    const crateY = groundY - system.lift;

    const decayRate1 = Math.pow(0.9, dt / 16.6667);
    const decayRate2 = Math.pow(0.84, dt / 16.6667);

    if (system.mode === 'overspeed') {
      system.bounce += dt * 0.015;
    } else if (system.mode === 'lifting') {
      system.bounce = Math.max(0, system.bounce * decayRate1);
    } else {
      system.bounce *= decayRate2;
    }

    const shake = system.mode === 'overspeed' ? Math.sin(system.bounce) * 7 : 0;
    const sway = system.mode === 'stall' ? Math.sin(system.stallPhase) * 2 : 0;
    const finalX = x + shake + sway;

    ctx.save();
    ctx.strokeStyle = 'rgba(196, 211, 225, 0.86)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(x, ropeTop);
    ctx.lineTo(finalX, crateY - crateSize);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#6b3412';
    ctx.strokeStyle = '#f3a24c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(finalX - (crateSize * 0.5), crateY - crateSize, crateSize, crateSize, 8);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 213, 146, 0.62)';
    ctx.beginPath();
    ctx.moveTo(finalX - 17, crateY - crateSize + 8);
    ctx.lineTo(finalX + 17, crateY - 8);
    ctx.moveTo(finalX + 17, crateY - crateSize + 8);
    ctx.lineTo(finalX - 17, crateY - 8);
    ctx.stroke();

    ctx.fillStyle = '#f4f8ff';
    ctx.font = '700 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(system.loadKg + ' KG', finalX, crateY - 22);
    ctx.restore();
  }

  function drawHud(width, height) {
    ctx.save();
    const panelX = width - 220;
    const panelY = 92;
    ctx.fillStyle = 'rgba(6, 14, 24, 0.74)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, 176, 116, 18);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f7c95d';
    ctx.font = '800 10px JetBrains Mono, monospace';
    ctx.fillText('TRANSMISSION READOUT', panelX + 16, panelY + 22);

    ctx.fillStyle = 'rgba(230, 240, 252, 0.9)';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillText('Ratio: ' + system.ratio.toFixed(2) + ' : 1', panelX + 16, panelY + 48);
    ctx.fillText('Torque: ' + Math.round(system.outputTorque) + ' Nm', panelX + 16, panelY + 68);
    ctx.fillText('Speed: ' + Math.round(system.outputSpeed) + ' rpm', panelX + 16, panelY + 88);
    ctx.fillText('Load req: ' + Math.round(system.requiredTorque) + ' Nm', panelX + 16, panelY + 108);
    ctx.restore();
  }

  function drawCompactScene() {
    const driverRadius = system.driverTeeth * 1.25;
    const drivenRadius = system.drivenTeeth * 1.25;
    const driverX = 145;
    const drivenX = driverX + driverRadius + drivenRadius + 5;
    const centerY = 122;
    ctx.save();
    ctx.fillStyle = '#192f3a';
    ctx.strokeStyle = '#e8a444';
    ctx.lineWidth = 2;
    ctx.fillRect(16, 95, 64, 54);
    ctx.strokeRect(16, 95, 64, 54);
    ctx.fillStyle = '#ffe0a1';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MOTOR', 48, 127);
    ctx.strokeStyle = '#e8a444';
    ctx.beginPath();
    ctx.moveTo(80, centerY);
    ctx.lineTo(driverX - driverRadius - 3, centerY);
    ctx.stroke();
    ctx.restore();
    drawGear({ x: driverX, y: centerY, radius: driverRadius, teeth: system.driverTeeth,
      angle: system.rotation, label: system.driverTeeth + 'T IN', innerColor: '#f7d06c',
      outerColor: '#c4811f', stroke: 'rgba(255,226,165,.45)' });
    drawGear({ x: drivenX, y: centerY, radius: drivenRadius, teeth: system.drivenTeeth,
      angle: -(system.rotation * system.driverTeeth / system.drivenTeeth) + Math.PI / system.drivenTeeth,
      label: system.drivenTeeth + 'T OUT', innerColor: '#8ccbff', outerColor: '#2d70d8',
      stroke: 'rgba(193,229,255,.45)' });
    const crateTop = 246 - system.lift * .43;
    ctx.save();
    ctx.strokeStyle = '#a9c1d1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(drivenX + drivenRadius + 4, centerY);
    ctx.lineTo(340, centerY);
    ctx.lineTo(340, crateTop);
    ctx.stroke();
    ctx.fillStyle = '#8c491e';
    ctx.strokeStyle = '#f5ab59';
    ctx.fillRect(312, crateTop, 56, 48);
    ctx.strokeRect(312, crateTop, 56, 48);
    ctx.fillStyle = '#fff2dd';
    ctx.font = '700 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(system.loadKg + ' kg', 340, crateTop + 28);
    ctx.restore();
  }

  function render(timestamp) {
    if (!system.lastTime) {
      system.lastTime = timestamp;
    }

    const dt = Math.min(50, Math.max(0, timestamp - system.lastTime));
    system.lastTime = timestamp;

    const width = compactCanvas ? 380 : 840;
    const height = compactCanvas ? 300 : 470;
    ctx.clearRect(0, 0, width, height);

    const driverRadius = system.driverTeeth * 2.4;
    const drivenRadius = system.drivenTeeth * 2.4;
    const centerY = height * 0.49;
    const driverX = clamp(180, (width * 0.34), width * 0.42);
    const drivenX = driverX + driverRadius + drivenRadius + 6;
    const drumX = Math.min(width - 138, drivenX + drivenRadius + 92);

    if (system.running) {
      const baseAngular = (INPUT_SPEED_RPM / 60) * Math.PI * 2;
      const scaled = baseAngular / 60;

      if (system.mode === 'lifting') {
        system.rotation += scaled * (dt / 16.6667);
        const liftRate = ((SAFE_OUTPUT_SPEED_RPM / Math.max(system.outputSpeed, 1)) * 0.8) + ((system.outputSpeed / SAFE_OUTPUT_SPEED_RPM) * 0.6);
        system.lift = Math.min(LIFT_TARGET, system.lift + liftRate * (dt / 16.6667));
        if (system.lift >= LIFT_TARGET) {
          system.running = false;
          system.mode = 'success';
          testButton.disabled = false;
          setStatus('Lift complete', '');
          stageNote.textContent = 'Success. The transmission produced enough torque and kept the winch in a safe speed band.';
          signal.textContent = 'Successful lift';
          signal.className = 'gear-signal';
        }
      } else if (system.mode === 'overspeed') {
        system.rotation += (scaled * 1.4) * (dt / 16.6667);
        const overspeedRate = (system.outputSpeed / SAFE_OUTPUT_SPEED_RPM) * 2.8;
        system.lift = Math.min(LIFT_TARGET * 0.62, system.lift + overspeedRate * (dt / 16.6667));

        const spawnCount = (0.6 + Math.random() * 1.5) * (dt / 16.6667);
        for (let i = 0; i < Math.floor(spawnCount) + (Math.random() < (spawnCount % 1) ? 1 : 0); i++) {
          system.particles.push({
            x: driverX + driverRadius + 3,
            y: centerY + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.8) * 8,
            life: 1.0 + Math.random() * 0.5,
            decay: 0.03 + Math.random() * 0.05
          });
        }
        if (system.lift >= LIFT_TARGET * 0.62) {
          system.running = false;
          testButton.disabled = false;
          setStatus('Overspeed failure', 'is-warn');
          stageNote.textContent = 'The hoist had enough force, but it exceeded this exercise’s speed limit. The test stopped before the lift finished.';
          signal.textContent = 'Unsafe lift stopped';
          signal.className = 'gear-signal is-warn';
        }
      } else if (system.mode === 'stall') {
        system.stallPhase += dt * 0.025;
        system.rotation += Math.sin(system.stallPhase) * 0.02 * (dt / 16.6667);
      }
    }

    if (compactCanvas) {
      drawCompactScene();
      SimKit.frame('#gearCanvas', render);
      return;
    }

    drawMotor(driverX - driverRadius - 44, centerY);

    drawGear({
      x: driverX,
      y: centerY,
      radius: driverRadius,
      teeth: system.driverTeeth,
      angle: system.rotation,
      label: 'DRIVER',
      innerColor: '#f7d06c',
      outerColor: '#c4811f',
      stroke: 'rgba(255, 226, 165, 0.34)'
    });

    drawGear({
      x: drivenX,
      y: centerY,
      radius: drivenRadius,
      teeth: system.drivenTeeth,
      angle: -(system.rotation * (system.driverTeeth / system.drivenTeeth)) + (Math.PI / system.drivenTeeth),
      label: 'DRIVEN',
      innerColor: '#8ccbff',
      outerColor: '#2d70d8',
      stroke: 'rgba(193, 229, 255, 0.32)'
    });

    const torqueArrowWidth = clamp(46, (system.outputTorque / Math.max(system.requiredTorque, 1)) * 90, 108);
    const speedArrowWidth = clamp(34, (system.outputSpeed / SAFE_OUTPUT_SPEED_RPM) * 88, 108);
    drawTorqueArrow(driverX - 40, centerY - driverRadius - 34, 58, 'rgba(245, 200, 92, 0.92)', 'Input');
    drawTorqueArrow(drivenX + 36, centerY - drivenRadius - 34, torqueArrowWidth, 'rgba(121, 214, 255, 0.9)', 'Output');
    drawTorqueArrow(drumX - 20, centerY + 114, -speedArrowWidth, 'rgba(255, 169, 92, 0.74)', 'Winch rpm');

    for (let i = system.particles.length - 1; i >= 0; i--) {
      const p = system.particles[i];
      p.x += p.vx * (dt / 16.6667);
      p.y += p.vy * (dt / 16.6667);
      p.vy += 0.25 * (dt / 16.6667);
      p.life -= p.decay * (dt / 16.6667);
      
      if (p.life <= 0) {
        system.particles.splice(i, 1);
      } else {
        ctx.save();
        ctx.fillStyle = `rgba(255, ${Math.floor(150 + Math.min(1, p.life) * 105)}, 50, ${Math.min(1, p.life)})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(255, 180, 50, 0.8)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1 + Math.min(1, p.life) * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(146, 181, 214, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(drivenX + drivenRadius + 10, centerY);
    ctx.lineTo(drumX, centerY);
    ctx.lineTo(drumX, 108);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(drumX, 108, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#15253a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(188, 216, 244, 0.5)';
    ctx.stroke();
    ctx.restore();

    drawCrate(drumX, height - 62, dt);
    drawHud(width, height);

    SimKit.frame('#gearCanvas', render);
  }

  function engageMotor() {
    computeState();
    const prediction = predictions.find(function (input) { return input.checked; });
    if (!prediction) return;
    const actual = system.outputTorque < system.requiredTorque ? 'stall' : (system.outputSpeed > SAFE_OUTPUT_SPEED_RPM ? 'overspeed' : 'lifting');
    const reasons = {
      stall: 'Output torque is below the load requirement.',
      overspeed: 'Output torque is sufficient, but the winch exceeds 52 rpm.',
      lifting: 'Output torque exceeds the load requirement and the winch stays at or below 52 rpm.'
    };
    const names = { stall: 'stall', overspeed: 'lift too fast', lifting: 'lift safely' };
    feedback.textContent = (prediction.value === actual ? 'Correct prediction. ' : 'Revise your prediction: it will ' + names[actual] + '. ') + reasons[actual];
    feedback.className = 'gear-test-feedback ' + (prediction.value === actual ? 'is-correct' : 'is-incorrect');
    if (prefersReducedMotion) {
      system.running = false;
      system.mode = actual === 'lifting' ? 'success' : actual;
      system.lift = actual === 'lifting' ? LIFT_TARGET : 0;
      setStatus(actual === 'lifting' ? 'Lift complete' : (actual === 'stall' ? 'Motor stalled' : 'Overspeed stop'), actual === 'stall' ? 'is-danger' : (actual === 'overspeed' ? 'is-warn' : ''));
      stageNote.textContent = reasons[actual];
      signal.textContent = actual === 'lifting' ? 'Successful lift' : (actual === 'stall' ? 'Stall' : 'Unsafe lift stopped');
      signal.className = 'gear-signal ' + (actual === 'stall' ? 'is-danger' : (actual === 'overspeed' ? 'is-warn' : ''));
      return;
    }
    system.rotation = 0;
    system.lift = 0;
    system.bounce = 0;
    system.stallPhase = 0;
    system.particles = [];
    system.running = true;
    testButton.disabled = true;

    if (system.outputTorque < system.requiredTorque) {
      system.mode = 'stall';
      setStatus('Motor stalled', 'is-danger');
      stageNote.textContent = 'The motor cannot turn the loaded drum because output torque is below the required torque.';
      signal.textContent = 'Stall';
      signal.className = 'gear-signal is-danger';
      stallTimer = window.setTimeout(function () {
        system.running = false;
        testButton.disabled = false;
      }, 1100);
      return;
    }

    if (system.outputSpeed > SAFE_OUTPUT_SPEED_RPM) {
      system.mode = 'overspeed';
      setStatus('Overspeed lift', 'is-warn');
      stageNote.textContent = 'The load is moving, but the winch is spinning too quickly for a safe hoist.';
      signal.textContent = 'Overspeed';
      signal.className = 'gear-signal is-warn';
      return;
    }

    system.mode = 'lifting';
    setStatus('Lifting load', '');
    stageNote.textContent = 'The reduction ratio is doing exactly what a hoist needs: controlled speed with enough force to beat gravity.';
    signal.textContent = 'Lifting';
    signal.className = 'gear-signal';
  }

  function onControlInput() {
    presets.forEach(function (button) { button.setAttribute('aria-pressed', 'false'); });
    predictions.forEach(function (input) { input.checked = false; });
    feedback.textContent = 'The setup changed. Make a new prediction, then engage the motor.';
    feedback.className = 'gear-test-feedback';
    setReadyState();
    updateUi();
  }

  presets.forEach(function (button) {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', function () {
      const values = presetValues[button.dataset.gearPreset];
      driverSlider.value = values[0];
      drivenSlider.value = values[1];
      loadSlider.value = values[2];
      onControlInput();
      button.setAttribute('aria-pressed', 'true');
    });
  });
  predictions.forEach(function (input) {
    input.addEventListener('change', function () {
      testButton.disabled = false;
      testButton.textContent = 'Engage motor';
    });
  });

  driverSlider.addEventListener('input', onControlInput);
  drivenSlider.addEventListener('input', onControlInput);
  loadSlider.addEventListener('input', onControlInput);
  testButton.addEventListener('click', engageMotor);
  window.addEventListener('resize', resizeCanvas);

  resizeCanvas();
  updateUi();
  if ('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(canvas);
  SimKit.frame('#gearCanvas', render);
}());

/* The 3D bench: every example in the lesson as Forge would print it, assembled and turning
   (assets/js/forge/part-viewer.mjs), with its own settings and an "Open in Forge" link that carries them
   (forge.html?part=<id>&<param>=<value>). The 3D engine is about 1.4 MB, so it loads only when the panel
   comes near the screen, or when a "See it in 3D" button asks for it. */
(function () {
  'use strict';
  const host = document.getElementById('gear-3d');
  const script = document.currentScript && document.currentScript.src;
  if (!host || !script) return;
  const driver = document.getElementById('gear-driver-slider');
  const driven = document.getElementById('gear-driven-slider');
  const controlsEl = document.getElementById('gear-bench-controls');
  const statsEl = document.getElementById('gear-bench-stats');
  const noteEl = document.getElementById('gear-bench-note');
  const forgeLink = document.getElementById('gear-bench-forge');
  const playBtn = document.getElementById('gear-bench-play');
  const tabs = [...document.querySelectorAll('[data-bench]')];
  const FORGE = '../../../forge.html';

  /* Each model: the Forge part, its settings, which of them students can change here, and what to notice. */
  const MODELS = {
    lab: { part: 'gears', tab: 'lab', follow: true, params: () => ({ module: '2', teethA: Number(driver.value), teethB: Number(driven.value), board: true }),
      note: 'The gear pair from the lab. Change the driver and driven sliders above and it rebuilds. Watch the orange driver and the blue driven gear: the driven one turns the other way, and slower.' },
    idler: { part: 'gear-train', tab: 'idler', params: { layout: 'idler', module: '1.5', teethA: 12, teethI: 20, teethB: 36 }, edit: ['teethA', 'teethI', 'teethB'],
      note: 'An idler between the driver (orange) and the output. Change the idler’s teeth: the output speed never changes, but it now turns the same way as the driver.' },
    compound: { part: 'gear-train', tab: 'compound', params: { layout: 'compound', module: '1.5', teethA: 12, teethB: 36, teethC: 12, teethD: 36 }, edit: ['teethA', 'teethB', 'teethC', 'teethD'],
      note: '12→36 then 12→36. The middle gears B and C print as one piece, so they turn together, and the two 3 : 1 stages multiply to 9 : 1.' },
    mission: { part: 'gear-train', tab: 'mission', params: { layout: 'compound', module: '1.5', teethA: 12, teethB: 24, teethC: 12, teethD: 28 }, edit: ['teethA', 'teethB', 'teethC', 'teethD'],
      note: 'The 900 kg mission’s compound train: 12→24 then 12→28, 2 × 2.33 = 4.67 : 1, more than the 4.1 : 1 the crate needs.' },
    worm: { part: 'worm', tab: 'worm', params: { teeth: 30, starts: '1' }, edit: ['teeth', 'starts'],
      note: 'A single-start worm advances the wheel one tooth per turn, so a 30-tooth wheel gives 30 : 1 in one stage. Shallow threads make many worms self-locking.' },
    planetary: { part: 'planetary', tab: 'planetary', params: { sun: 12, planet: 18 }, edit: ['sun', 'planet'],
      note: 'The sun drives three planets inside a ring. Hold the ring and the planet carrier is the output: input and output share one axis.' },
    bevel: { part: 'bevel', tab: 'bevel', params: { teethA: 15, teethB: 30 }, edit: ['teethA', 'teethB'],
      note: 'Cone-shaped teeth turn the drive through a right angle. The ratio maths is the same tooth count rule: 30 ÷ 15 = 2 : 1.' },
    rack: { part: 'rack', tab: 'rack', params: { pinion: 16, rackTeeth: 18 }, edit: ['pinion', 'rackTeeth'],
      note: 'The pinion turns and the rack slides. Each pinion turn moves the rack by its circumference: teeth × π × module.' },
    leadscrew: { part: 'leadscrew', tab: 'leadscrew', params: { pitch: 4, starts: '1' }, edit: ['pitch', 'starts'],
      note: 'Each turn of the screw moves the nut one lead (pitch × starts). A fine pitch is a huge force multiplier: a car jack lifts a car by hand.' },
    q1: { part: 'gears', tab: 'lab', params: { module: '2', teethA: 10, teethB: 40, board: true }, edit: ['teethA', 'teethB'],
      note: 'Question 1: a 10-tooth driver and a 40-tooth driven gear, 4 : 1. The output turns the opposite way at a quarter of the speed.' },
    q2: { part: 'gear-train', tab: 'idler', params: { layout: 'idler', module: '1.5', teethA: 10, teethI: 25, teethB: 40 }, edit: ['teethA', 'teethI', 'teethB'],
      note: 'Question 2: the same 10 → 40 pair with a 25-tooth idler. Still 4 : 1, but now the output turns the same way as the driver.' },
    q3: { part: 'gear-train', tab: 'compound', params: { layout: 'compound', module: '1.5', teethA: 12, teethB: 36, teethC: 15, teethD: 45 }, edit: ['teethA', 'teethB', 'teethC', 'teethD'],
      note: 'Question 3: 12→36 then 15→45. 3 × 3 = 9 : 1, so an 1800 rpm motor gives 200 rpm.' },
  };

  let viewer = null, partById = null, current = 'lab', values = {}, loading = null, timer = 0, key = '';

  const paramsFor = (name) => {
    const m = MODELS[name];
    return { ...(typeof m.params === 'function' ? m.params() : m.params), ...(values[name] || {}) };
  };

  function forgeHref(partId, params) {
    const q = new URLSearchParams({ part: partId });
    for (const [k, v] of Object.entries(params)) q.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
    return `${FORGE}?${q}`;
  }

  function renderStats(result) {
    statsEl.textContent = '';
    for (const s of (result && result.stats) || []) {
      const dt = document.createElement('dt'); dt.textContent = s.label;
      const dd = document.createElement('dd'); dd.textContent = s.value;
      statsEl.append(dt, dd);
    }
  }

  function renderControls() {
    const m = MODELS[current];
    controlsEl.textContent = '';
    if (m.follow) {
      const p = document.createElement('p');
      p.className = 'gear-bench-follow';
      p.textContent = 'Follows the lab: set the driver and driven gears with the sliders in the Mechanical Advantage Studio.';
      controlsEl.append(p);
      return;
    }
    if (!partById) return;
    const part = partById(m.part);
    const now = paramsFor(current);
    for (const id of m.edit || []) {
      const spec = part.params.find((s) => s.id === id);
      if (!spec) continue;
      const label = document.createElement('label');
      const head = document.createElement('span');
      head.textContent = spec.label;
      label.append(head);
      let input;
      if (spec.type === 'select') {
        input = document.createElement('select');
        for (const o of spec.options) input.append(new Option(o.label, o.value));
        input.value = String(now[id]);
      } else {
        input = document.createElement('input');
        input.type = 'range';
        input.min = spec.min; input.max = spec.max; input.step = spec.step;
        input.value = now[id];
        const out = document.createElement('output');
        out.textContent = `${now[id]}${spec.unit ? ' ' + spec.unit : ''}`;
        head.append(out);
        input.addEventListener('input', () => { out.textContent = `${input.value}${spec.unit ? ' ' + spec.unit : ''}`; });
      }
      input.addEventListener(spec.type === 'select' ? 'change' : 'input', () => {
        values[current] = { ...(values[current] || {}), [id]: spec.type === 'select' ? input.value : Number(input.value) };
        update();
      });
      label.append(input);
      controlsEl.append(label);
    }
  }

  function update(now = false) {
    const m = MODELS[current];
    const p = paramsFor(current);
    forgeLink.href = forgeHref(m.part, p);
    if (!viewer) return;
    const k = m.part + JSON.stringify(p);
    if (k === key) return;
    key = k;
    clearTimeout(timer);
    timer = setTimeout(() => renderStats(viewer.show(m.part, p)), now ? 0 : 250);
  }

  function select(name) {
    if (!MODELS[name]) return;
    current = name;
    const m = MODELS[name];
    tabs.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bench === m.tab)));
    noteEl.textContent = m.note;
    renderControls();
    update(true);
  }

  function load() {
    if (loading) return loading;
    loading = Promise.all([
      import(new URL('../forge/part-viewer.mjs', script).href),
      import(new URL('../forge/parts.mjs', script).href),
    ]).then(([{ mountPartViewer }, parts]) => {
      partById = parts.partById;
      const m = MODELS[current];
      return mountPartViewer(host, { partId: m.part, params: paramsFor(current), onReport: renderStats });
    }).then((v) => {
      viewer = v;
      key = MODELS[current].part + JSON.stringify(paramsFor(current));
      renderControls();
      update();
    }).catch(() => { host.textContent = 'The 3D view could not start in this browser.'; });
    return loading;
  }

  tabs.forEach((b) => b.addEventListener('click', () => select(b.dataset.bench)));
  document.querySelectorAll('[data-show-3d]').forEach((b) => b.addEventListener('click', () => {
    select(b.getAttribute('data-show-3d'));
    load();
    document.getElementById('gear-3d-card').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }));
  playBtn.addEventListener('click', () => {
    if (!viewer) return;
    const on = !viewer.playing;
    viewer.setPlaying(on);
    playBtn.textContent = on ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-pressed', String(on));
  });
  const followLab = () => { if (MODELS[current].follow) update(); };
  driver.addEventListener('input', followLab);
  driven.addEventListener('input', followLab);
  document.querySelectorAll('[data-gear-preset]').forEach((b) => b.addEventListener('click', () => setTimeout(followLab, 0)));

  forgeLink.href = forgeHref('gears', paramsFor('lab'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      load();
    }, { rootMargin: '200px' });
    io.observe(host);
  } else load();
}());
