import { osmosisProfile, gillProfile, tailKinematics } from './lessons/fish-biomechanics.mjs';

const water = document.querySelector('#water');
const slider = document.querySelector('#stroke');
const stiffnessSlider = document.querySelector('#stiffness');
const balanceEl = document.getElementById('balance');
const directionEl = document.getElementById('direction');
const phaseValueEl = document.getElementById('phase-value');
const stiffnessValueEl = document.getElementById('stiffness-value');
const thrustReadoutEl = document.getElementById('thrust-readout');
const tailEl = document.getElementById('tail');

const gillWaterVals = document.getElementById('gillWaterVals');
const gillBloodVals = document.getElementById('gillBloodVals');
const gillBloodDir = document.getElementById('gillBloodDir');
const gillModeNote = document.getElementById('gillModeNote');
const gillModeBtns = document.querySelectorAll('[data-gill-flow]');
let gillFlow = 'countercurrent';

function getStiffness() {
  return stiffnessSlider ? Number(stiffnessSlider.value) / 100 : 0.55;
}

function updateOsmosisCopy() {
  if (!water || !balanceEl || !directionEl) return;
  const profile = osmosisProfile(water.value);
  directionEl.textContent = profile.direction;
  balanceEl.textContent = profile.summary;
}

if (water) {
  water.addEventListener('change', updateOsmosisCopy);
  updateOsmosisCopy();
}

function drawTail() {
  if (!slider || !phaseValueEl || !tailEl) return;
  const phase01 = Number(slider.value) / 100;
  const stiffness = getStiffness();
  const kin = tailKinematics(phase01, stiffness);

  phaseValueEl.value = `${slider.value}%`;
  if (stiffnessValueEl) {
    stiffnessValueEl.value = `${Math.round(stiffness * 100)}% (${kin.stiffnessLabel})`;
  }
  if (thrustReadoutEl) {
    thrustReadoutEl.textContent =
      `${kin.stiffnessLabel} · Relative thrust ${kin.thrustScore}% · Predicted 10 s robot run: ${kin.estimatedDistanceM.toFixed(1)} m`;
  }

  const base = kin.baseOffset;
  const tip = kin.tipOffset;
  tailEl.setAttribute(
    'd',
    `M145 44 Q180 ${54 + base} 218 ${55 + tip} L244 ${36 + tip} L240 ${62 + tip} L244 ${88 + tip} L218 ${69 + tip} Q180 ${70 + base} 145 80Z`
  );
}

if (slider) {
  slider.addEventListener('input', drawTail);
}
if (stiffnessSlider) {
  stiffnessSlider.addEventListener('input', drawTail);
}
drawTail();

function setGillFlow(mode) {
  const profile = gillProfile(mode);
  gillFlow = profile.mode;
  gillModeBtns.forEach((btn) => {
    const active = btn.dataset.gillFlow === gillFlow;
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('active', active);
  });
  if (gillWaterVals) gillWaterVals.innerHTML = profile.water.map((v) => `<b>${v}</b>`).join('');
  if (gillBloodVals) gillBloodVals.innerHTML = profile.blood.map((v) => `<b>${v}</b>`).join('');
  if (gillBloodDir) gillBloodDir.textContent = profile.bloodLabel;
  if (gillModeNote) gillModeNote.textContent = profile.note;
}

gillModeBtns.forEach((btn) => {
  btn.addEventListener('click', () => setGillFlow(btn.dataset.gillFlow));
});

function createDots(groupId, count, color, radius = 4) {
  const parent = document.getElementById(groupId);
  if (!parent) return [];
  return Array.from({ length: count }, () => {
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', radius);
    dot.setAttribute('fill', color);
    parent.append(dot);
    return dot;
  });
}

function place(dot, x, y) {
  dot.setAttribute('cx', x.toFixed(1));
  dot.setAttribute('cy', y.toFixed(1));
}

const waterParticles = createDots('water-dots', 12, '#a4f0ef', 4);
const saltLeftDots = createDots('salt-dots', 10, '#f6c453', 5.2);
const saltRightDots = createDots('salt-dots', 10, '#f6c453', 5.2);
const streams = [createDots('flow-dots', 8, '#8ce3df', 4), createDots('flow-dots', 8, '#ffaba7', 4)];
const oxygen = createDots('flow-dots', 5, '#ffdc78', 4);
const wakeRings = createDots('wake-rings', 6, 'rgba(155, 240, 223, 0.45)', 6);

function renderSalt(time) {
  const profile = osmosisProfile(water ? water.value : 'sea');
  waterParticles.forEach((dot, i) => {
    const progress = (time / 4 + i * 0.38197) % 1;
    place(dot, 35 + 330 * (i < profile.outwardDots ? progress : 1 - progress), 9 + i * 7);
  });

  saltLeftDots.forEach((dot, i) => {
    const visible = i < profile.insideSaltDots;
    dot.style.display = visible ? '' : 'none';
    if (!visible) return;
    const x = 32 + ((i * 53 + 18) % 148) + Math.sin(time * 1.4 + i) * 7;
    const y = 14 + ((i * 29 + 11) % 68) + Math.cos(time * 1.1 + i * 1.7) * 5;
    place(dot, x, y);
  });

  saltRightDots.forEach((dot, i) => {
    const visible = i < profile.outsideSaltDots;
    dot.style.display = visible ? '' : 'none';
    if (!visible) return;
    const x = 218 + ((i * 47 + 14) % 154) + Math.sin(time * 1.3 + i * 1.3) * 7;
    const y = 14 + ((i * 31 + 17) % 68) + Math.cos(time * 1.2 + i * 1.9) * 5;
    place(dot, x, y);
  });
}

function renderGills(time) {
  const concurrent = gillFlow === 'concurrent';
  streams.forEach((row, side) => row.forEach((dot, i) => {
    const x = (time * 42 + i * 50) % 400;
    const posX = side === 0 ? x : (concurrent ? x : 400 - x);
    place(dot, posX, side ? 62 : 14);
  }));
  oxygen.forEach((dot, i) => {
    const x = concurrent ? 40 + i * 38 : 40 + i * 80;
    place(dot, x, 14 + 48 * ((time / 2 + i / 5) % 1));
  });
}

function renderSwim(time) {
  if (!slider) return;
  slider.value = Math.round((time % 2) * 50);
  drawTail();

  const kin = tailKinematics(Number(slider.value) / 100, getStiffness());
  const thrustScale = kin.thrustScore / 100;
  wakeRings.forEach((ring, i) => {
    const travel = (time * (0.45 + thrustScale * 0.65) + i / wakeRings.length) % 1;
    const x = 248 + travel * (90 + thrustScale * 75);
    const y = 62 + Math.sin(travel * 8 + i) * (10 + (1 - thrustScale) * 8);
    place(ring, x, y);
    ring.setAttribute('r', (3 + travel * (5 + thrustScale * 6)).toFixed(1));
    ring.setAttribute('opacity', ((1 - travel) * (0.25 + thrustScale * 0.6)).toFixed(2));
  });
}

const models = {
  salt: renderSalt,
  gills: renderGills,
  swim: renderSwim
};

document.querySelectorAll('[data-play]').forEach((button) => {
  const name = button.dataset.play;
  const render = models[name];
  const label = button.textContent.slice(5);
  const tankSvg = button.closest('section')?.querySelector('.tank svg') || button.closest('section');
  let playing = false;
  let time = 0;

  const clock = window.SimKit.loop((dt) => {
    time += dt;
    render(time);
  }, { el: window.SimKit.stage(tankSvg), maxDt: 0.1 });
  clock.pause();
  render(time);

  function setPlaying(active) {
    playing = active;
    button.textContent = (active ? 'Pause ' : 'Play ') + label;
    button.setAttribute('aria-pressed', String(active));
    if (active) clock.resume();
    else clock.pause();
  }

  button.addEventListener('click', () => setPlaying(!playing));
  if (name === 'salt' && water) water.addEventListener('change', () => render(time));
  if (name === 'gills') {
    gillModeBtns.forEach((btn) => btn.addEventListener('click', () => render(time)));
  }
  if (name === 'swim') {
    if (slider) {
      slider.addEventListener('input', () => {
        setPlaying(false);
        time = Number(slider.value) / 50;
        render(time);
      });
    }
    if (stiffnessSlider) {
      stiffnessSlider.addEventListener('input', () => render(time));
    }
  }
});

// Quick check grading
const quizCards = Array.from(document.querySelectorAll('.fish-quiz-q'));
const quizScoreEl = document.getElementById('fish-quiz-score');
const quizCheckBtn = document.getElementById('fish-quiz-check');
const quizResetBtn = document.getElementById('fish-quiz-reset');

function gradeQuiz() {
  let correctCount = 0;
  let answeredCount = 0;
  quizCards.forEach((card, idx) => {
    const expected = card.dataset.answer;
    const selected = card.querySelector(`input[name="fish-q${idx + 1}"]:checked`);
    const feedback = card.querySelector('.fish-quiz-fb');
    card.classList.remove('is-ok', 'is-err');
    if (!selected) {
      if (feedback) feedback.textContent = 'Pick an answer first.';
      return;
    }
    answeredCount += 1;
    const ok = selected.value === expected;
    if (ok) correctCount += 1;
    card.classList.add(ok ? 'is-ok' : 'is-err');
    if (feedback) {
      feedback.textContent = ok ? card.dataset.ok : card.dataset.err;
    }
  });
  if (quizScoreEl) {
    quizScoreEl.textContent = answeredCount
      ? `Score: ${correctCount} / ${quizCards.length} correct.`
      : 'Select answers above and press Check answers.';
  }
}

function resetQuiz() {
  quizCards.forEach((card) => {
    card.classList.remove('is-ok', 'is-err');
    card.querySelectorAll('input[type="radio"]').forEach((input) => { input.checked = false; });
    const fb = card.querySelector('.fish-quiz-fb');
    if (fb) fb.textContent = '';
  });
  if (quizScoreEl) quizScoreEl.textContent = '';
}

if (quizCheckBtn) quizCheckBtn.addEventListener('click', gradeQuiz);
if (quizResetBtn) quizResetBtn.addEventListener('click', resetQuiz);
