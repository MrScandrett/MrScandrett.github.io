  (function () {
    const C_MPS = 299792458;
    const C_KMS = 299792.458;
    const EARTH_LAPS_PER_SEC = 7.482; // c / 40,075 km equatorial circumference
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function prepareCanvas(el, fallbackW, fallbackH) {
      if (!el) return null;
      const W = el.offsetWidth || fallbackW || 560;
      const H = el.clientHeight || fallbackH || 225;
      if (W <= 0 || H <= 0) return null;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.round(W * dpr);
      const ph = Math.round(H * dpr);
      if (el.width !== pw || el.height !== ph) {
        el.width = pw;
        el.height = ph;
      }
      const c = el.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      return { ctx: c, W, H };
    }

    function formatTime(sec) {
      if (sec < 60) return sec.toFixed(2) + ' s';
      if (sec < 3600) return (sec / 60).toFixed(1) + ' min';
      if (sec < 86400) return (sec / 3600).toFixed(1) + ' h';
      if (sec < 31536000) return (sec / 86400).toFixed(1) + ' days';
      return (sec / 31536000).toFixed(2) + ' years';
    }

    function formatTimeFull(sec) {
      if (sec < 60) return sec.toFixed(2) + ' seconds';
      if (sec < 3600) return (sec / 60).toFixed(1) + ' minutes';
      if (sec < 86400) return (sec / 3600).toFixed(1) + ' hours';
      if (sec < 31536000) return (sec / 86400).toFixed(1) + ' days';
      return (sec / 31536000).toFixed(2) + ' years';
    }

    /* ── 1. Scale Mode Switcher (Log vs Linear) ───────── */
    const scaleBtns = document.querySelectorAll('.sol-scale-btn[data-scale-mode]');
    const scaleRows = document.querySelectorAll('#sol-scale .sol-scale-row[data-speed-mps]');
    const scaleNote = document.getElementById('sol-scale-note');

    function setScaleMode(mode) {
      scaleBtns.forEach((btn) => {
        const active = btn.dataset.scaleMode === mode;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      scaleRows.forEach((row) => {
        const bar = row.querySelector('.sol-scale-bar');
        if (!bar) return;
        if (mode === 'linear') {
          const speed = Number(row.dataset.speedMps || 0);
          const pct = (speed / C_MPS) * 100;
          bar.style.width = `${speed >= C_MPS ? 100 : Math.max(0.45, pct)}%`;
        } else {
          bar.style.width = `${row.dataset.logW || 10}%`;
        }
      });
      if (scaleNote) {
        scaleNote.innerHTML = mode === 'linear'
          ? '<strong>Linear scale:</strong> Even NASA\'s record-setting Parker Solar Probe (192,000 m/s) reaches only <strong>0.064% of c</strong> — every familiar human speed sits practically at zero.'
          : '<strong>Logarithmic scale:</strong> each step represents a multiplication in speed, allowing vastly different speeds to remain visible. Switch to <strong>Linear Scale</strong> to see why everyday travel barely leaves 0%.';
      }
    }
    scaleBtns.forEach((btn) => btn.addEventListener('click', () => setScaleMode(btn.dataset.scaleMode)));

    /* ── 2. Predict–Test–Explain Prompts ──────────────── */
    const PREDICT_FEEDBACK = {
      medium: {
        'both-drop': 'Not quite — wave frequency f is locked by the oscillations arriving at the interface each second. Wavelength λ and phase speed v = c/n drop together instead.',
        'v-lambda-drop': 'Correct! Boundary continuity keeps frequency f fixed, so λ = λ₀ / n and v = λf = c / n both shrink inside matter — and light immediately resumes speed c upon exiting to vacuum.',
        'photons-permanent': 'Not quite — once the electromagnetic wave exits water back into vacuum, there are no polarization dipoles left to couple with, so it propagates again at exact speed c.'
      },
      clock: {
        'gravity': 'Not quite — vacuum speed c stays identical in every inertial frame; cabin motion never slows light down.',
        'diagonal': 'Spot on! Because Earth observers measure the same light speed c along the longer diagonal hypotenuse, more Earth time must elapse for one mirror round-trip.',
        'optical': 'Not quite — even after subtracting signal-delay illusions, the moving clock physically accumulates fewer ticks by factor 1/γ.'
      }
    };

    document.querySelectorAll('fieldset.sol-predict[data-predict]').forEach((fieldset) => {
      const key = fieldset.dataset.predict;
      const fb = fieldset.querySelector('.sol-predict-feedback');
      const btns = fieldset.querySelectorAll('.sol-predict-choice');
      btns.forEach((btn) => {
        btn.addEventListener('click', () => {
          btns.forEach((b) => {
            b.classList.remove('correct', 'wrong');
            b.setAttribute('aria-pressed', 'false');
          });
          btn.setAttribute('aria-pressed', 'true');
          const ok = btn.dataset.correct === 'true';
          btn.classList.add(ok ? 'correct' : 'wrong');
          if (fb) {
            fb.className = `sol-predict-feedback ${ok ? 'correct' : 'wrong'}`;
            fb.textContent = (PREDICT_FEEDBACK[key] && PREDICT_FEEDBACK[key][btn.dataset.choice]) || '';
          }
        });
      });
    });

    /* ── 3. Exhibit 01: Vacuum c vs Phase Speed in Media ── */
    const mediumCanvas = document.getElementById('sol-medium-canvas');
    const mediumSlider = document.getElementById('sol-medium-n');
    const cherenkovToggle = document.getElementById('sol-cherenkov-toggle');
    const mediumPresets = document.querySelectorAll('#sol-medium-lab .sol-preset-btn[data-n]');
    let mediumN = mediumSlider ? Number(mediumSlider.value) : 1.333;
    let cherenkovOn = cherenkovToggle ? cherenkovToggle.checked : false;

    function syncMediumUI() {
      const betaPhase = 1 / mediumN;
      const vKms = Math.round(C_KMS / mediumN);
      const badgeEl = document.getElementById('sol-medium-badge');
      const nValEl = document.getElementById('sol-medium-n-val');
      const vEl = document.getElementById('sol-medium-v');
      const pctEl = document.getElementById('sol-medium-pct');
      const lamEl = document.getElementById('sol-medium-lambda');
      const cherEl = document.getElementById('sol-medium-cherenkov');

      if (nValEl) nValEl.textContent = `n = ${mediumN >= 1.005 || mediumN === 1 ? mediumN.toFixed(3) : mediumN.toFixed(4)}`;
      if (badgeEl) badgeEl.textContent = `v = ${betaPhase.toFixed(3)}c`;
      if (vEl) vEl.textContent = `${vKms.toLocaleString()} km/s`;
      if (pctEl) pctEl.textContent = `${(betaPhase * 100).toFixed(1)}% of c`;
      if (lamEl) lamEl.textContent = `${betaPhase.toFixed(3)} λ₀`;
      if (cherEl) {
        const superluminal = 0.90 > betaPhase;
        cherEl.textContent = superluminal
          ? (cherenkovOn ? `SHOCK ACTIVE · v_th = ${betaPhase.toFixed(2)}c` : `Ready · v_th = ${betaPhase.toFixed(2)}c`)
          : `No cone · 0.90c < ${betaPhase.toFixed(2)}c`;
      }
      mediumPresets.forEach((btn) => {
        const targetN = Number(btn.dataset.n);
        const match = Math.abs(targetN - mediumN) < 0.00025;
        btn.classList.toggle('active', match);
        btn.setAttribute('aria-pressed', match ? 'true' : 'false');
      });
    }

    function drawMediumLab(ts) {
      const prep = prepareCanvas(mediumCanvas, 600, 225);
      if (!prep) return;
      const { ctx: g, W, H } = prep;
      const tSec = reduceMotion.matches ? 1.2 : (ts || 0) / 1000;

      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#091124');
      bg.addColorStop(1, '#060a17');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);

      const xEntry = Math.max(82, W * 0.22);
      const yVac = H * 0.29;
      const yMed = H * 0.72;
      const amp = Math.min(24, H * 0.11);
      const lambda0 = Math.max(48, Math.min(82, W * 0.11));
      const k0 = (Math.PI * 2) / lambda0;
      const omega = Math.PI * 2 * 1.15; // identical frequency f in vacuum and medium

      // Medium optical slab region
      const slabAlpha = Math.min(0.28, 0.05 + (mediumN - 1) * 0.085);
      g.fillStyle = `rgba(56,189,248,${slabAlpha.toFixed(3)})`;
      g.fillRect(xEntry, H * 0.49, W - xEntry - 12, H * 0.45);
      g.strokeStyle = 'rgba(125,211,252,0.42)';
      g.lineWidth = 1.5;
      g.strokeRect(xEntry, H * 0.49, W - xEntry - 12, H * 0.45);

      // Divider and entry interface line
      g.strokeStyle = 'rgba(148,163,184,0.18)';
      g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(12, H * 0.47);
      g.lineTo(W - 12, H * 0.47);
      g.stroke();
      g.setLineDash([]);

      g.strokeStyle = 'rgba(255,255,255,0.22)';
      g.beginPath();
      g.moveTo(xEntry, 16);
      g.lineTo(xEntry, H - 14);
      g.stroke();

      function renderWave(yCenter, color, useMedium, labelText) {
        g.strokeStyle = 'rgba(255,255,255,0.14)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(14, yCenter);
        g.lineTo(W - 12, yCenter);
        g.stroke();

        g.beginPath();
        for (let x = 14; x <= W - 14; x += 2) {
          const dx = x <= xEntry ? x : xEntry + (x - xEntry) * (useMedium ? mediumN : 1);
          const y = yCenter - Math.sin(k0 * dx - omega * tSec) * amp;
          if (x === 14) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.strokeStyle = color;
        g.lineWidth = 2.4;
        g.shadowBlur = 10;
        g.shadowColor = color;
        g.stroke();
        g.shadowBlur = 0;

        // Wavefront crests racing horizontally: both enter together at c up to xEntry, then medium slows to c/n
        const vVac = omega / k0;
        const dVac = Math.max(10, xEntry - 14);
        const dMed = Math.max(10, W - 14 - xEntry);
        const tVac = dVac / vVac;
        const tMed = (dMed * (useMedium ? mediumN : 1)) / vVac;
        const tLocal = tSec % (tVac + tMed);
        const packetX = tLocal <= tVac
          ? 14 + tLocal * vVac
          : xEntry + ((tLocal - tVac) * vVac) / (useMedium ? mediumN : 1);
        g.fillStyle = '#fff';
        g.shadowBlur = 14;
        g.shadowColor = color;
        g.beginPath();
        g.arc(packetX, yCenter, 4.8, 0, Math.PI * 2);
        g.fill();
        g.shadowBlur = 0;

        g.fillStyle = 'rgba(226,232,240,0.86)';
        g.font = '700 10px "Space Mono", monospace';
        g.textAlign = 'left';
        g.fillText(labelText, 16, yCenter - amp - 10);
      }

      renderWave(yVac, '#ffd60a', false, 'VACUUM · v = c · λ = λ₀');
      renderWave(yMed, '#38bdf8', true, `MEDIUM (n = ${mediumN.toFixed(2)}) · v = ${(1 / mediumN).toFixed(2)}c · λ = λ₀/n`);

      // Cherenkov particle + Mach shock cone when active
      if (cherenkovOn) {
        const slabStart = xEntry;
        const slabLen = W - slabStart - 18;
        const particlePxPerSec = (omega / k0) * 0.90;
        const eX = slabStart + ((tSec * particlePxPerSec) % slabLen);
        const phaseRatio = 1 / mediumN;
        const superluminal = 0.90 > phaseRatio;

        if (superluminal) {
          const sinAlpha = Math.min(0.99, phaseRatio / 0.90);
          const halfAngle = Math.asin(sinAlpha);
          const coneLen = Math.min(130, eX - slabStart);
          if (coneLen > 8) {
            const dxBack = coneLen * Math.cos(halfAngle);
            const dySpread = coneLen * Math.sin(halfAngle);
            g.save();
            g.fillStyle = 'rgba(56,189,248,0.19)';
            g.beginPath();
            g.moveTo(eX, yMed);
            g.lineTo(eX - dxBack, yMed - dySpread);
            g.lineTo(eX - dxBack, yMed + dySpread);
            g.closePath();
            g.fill();

            g.strokeStyle = '#60a5fa';
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(eX, yMed);
            g.lineTo(eX - dxBack, yMed - dySpread);
            g.moveTo(eX, yMed);
            g.lineTo(eX - dxBack, yMed + dySpread);
            g.stroke();
            g.restore();
          }
          g.fillStyle = '#7dd3fc';
          g.font = '700 9px "Space Mono", monospace';
          g.textAlign = 'right';
          g.fillText('CHERENKOV CONE: 0.90c > c/n', W - 18, yMed + amp + 17);
        } else {
          g.fillStyle = 'rgba(248,113,113,0.9)';
          g.font = '700 9px "Space Mono", monospace';
          g.textAlign = 'right';
          g.fillText(`BELOW THRESHOLD: 0.90c < ${phaseRatio.toFixed(2)}c`, W - 18, yMed + amp + 17);
        }

        // Fast electron dot
        g.fillStyle = '#e0f2fe';
        g.shadowBlur = 16;
        g.shadowColor = '#38bdf8';
        g.beginPath();
        g.arc(eX, yMed, 5.5, 0, Math.PI * 2);
        g.fill();
        g.shadowBlur = 0;
        g.fillStyle = '#fff';
        g.font = '800 8px "Space Mono", monospace';
        g.textAlign = 'center';
        g.fillText('e⁻ 0.90c', eX, yMed - 10);
      }

      g.fillStyle = 'rgba(203,213,225,0.62)';
      g.font = '600 9px "Space Mono", monospace';
      g.textAlign = 'center';
      g.fillText('ENTRY INTERFACE', xEntry, 13);
    }

    function animateMediumLab(ts) {
      drawMediumLab(ts);
      if (!reduceMotion.matches && mediumCanvas) SimKit.frame('#sol-medium-canvas', animateMediumLab);
    }

    if (mediumSlider) {
      mediumSlider.addEventListener('input', () => {
        mediumN = Number(mediumSlider.value);
        syncMediumUI();
        if (reduceMotion.matches) drawMediumLab(0);
      });
    }
    mediumPresets.forEach((btn) => {
      btn.addEventListener('click', () => {
        mediumN = Number(btn.dataset.n);
        if (mediumSlider) mediumSlider.value = String(mediumN);
        syncMediumUI();
        if (reduceMotion.matches) drawMediumLab(0);
      });
    });
    if (cherenkovToggle) {
      cherenkovToggle.addEventListener('change', () => {
        cherenkovOn = cherenkovToggle.checked;
        syncMediumUI();
        if (reduceMotion.matches) drawMediumLab(0);
      });
    }
    if (mediumCanvas) {
      syncMediumUI();
      animateMediumLab(performance.now());
    }

    /* ── 4. Delay Lab (Preserved) ─────────────────────── */
    const DELAY_DESTS = {
      moon: { oneWay: 1.28, live: 'Yes', target: 'M', label: 'MOON', color: '#94a3b8', modelDuration: 2,
        note: 'Moon communication has a noticeable pause, but astronauts can still hold a conversation with Mission Control.' },
      mars: { oneWay: 180, live: 'No', target: 'R', label: 'ROVER', color: '#ff3b30', modelDuration: 2.6,
        note: 'A Mars rover needs autonomy: by the time a driver sees a rock, sends a turn command, and receives confirmation, several minutes have passed.' },
      jupiter: { oneWay: 2100, live: 'No', target: 'J', label: 'JUPITER', color: '#c0843f', modelDuration: 3.2,
        note: 'Jupiter missions rely on carefully sequenced commands. A quick correction can take more than an hour round trip.' },
      alpha: { oneWay: 137840000, live: 'No', target: 'A', label: 'A. CENTAURI', color: '#ff1493', modelDuration: 4,
        note: 'A message to Alpha Centauri would take about 4.37 years to arrive. The earliest reply would come back 8.7 years after you sent it.' }
    };

    function updateDelayLab(key) {
      const data = DELAY_DESTS[key];
      if (!data) return;
      document.querySelectorAll('[data-delay-dest]').forEach((button) => {
        button.setAttribute('aria-pressed', button.dataset.delayDest === key ? 'true' : 'false');
      });
      document.getElementById('sol-delay-oneway').textContent = formatTime(data.oneWay);
      document.getElementById('sol-delay-roundtrip').textContent = formatTime(data.oneWay * 2);
      document.getElementById('sol-delay-live').textContent = data.live;
      document.getElementById('sol-delay-note').textContent = data.note;
      const target = document.getElementById('sol-delay-target');
      target.textContent = data.target;
      target.dataset.label = data.label;
      target.style.setProperty('--target-color', data.color);
      const route = document.getElementById('sol-delay-route');
      route.style.setProperty('--target-color', data.color);
      route.style.setProperty('--signal-duration', `${data.modelDuration}s`);
      route.style.setProperty('--signal-half', `${data.modelDuration / 2}s`);
      document.getElementById('sol-delay-scale').textContent =
        `Time-compressed · ${formatTime(data.oneWay * 2)} represented`;
    }
    document.querySelectorAll('[data-delay-dest]').forEach((button) => {
      button.addEventListener('click', () => updateDelayLab(button.dataset.delayDest));
    });
    updateDelayLab('mars');

    /* ── 5. Upgraded Cosmic Lookback Timeline & Scrubber ─ */
    const LOOKBACK_DESTS = {
      moon: {
        pos: 4, sliderLbl: '1.28 s ago', time: '1.28 seconds', title: 'The Moon',
        copy: 'The Moon you see is already 1.28 seconds in the past. A laser pulse needs about 2.56 seconds to make the complete Earth–Moon–Earth bounce.',
        history: 'Literally just a single deep breath ago — almost real time, yet laser-ranging telescopes must account for the 2.56 s round trip.'
      },
      sun: {
        pos: 16, sliderLbl: '8.3 min ago', time: '8 min 20 sec', title: 'The Sun',
        copy: 'The sunlight reaching your eyes now left the Sun about eight minutes ago. You never see the Sun exactly as it is “right now.”',
        history: 'Just 8 minutes and 20 seconds ago — a kettle started boiling on your stove would still be hot when that sunlight arrives.'
      },
      proxima: {
        pos: 33, sliderLbl: '4.24 years ago', time: '4.24 years', title: 'Proxima Centauri',
        copy: 'Today’s view of the nearest star shows it as it was more than four years ago. Any signal exchange takes at least 8.48 years.',
        history: 'Around four years ago on Earth — a student entering ninth grade today was still in fifth grade when these photons left Proxima Centauri.'
      },
      sirius: {
        pos: 43, sliderLbl: '8.6 years ago', time: '8.60 years', title: 'Sirius (Brightest Night Star)',
        copy: 'The brilliant light of Sirius traveled for 8.6 years across 81 trillion kilometers before entering your pupil tonight.',
        history: 'Nearly a decade ago on Earth — almost an entire primary-school childhood elapsed while this beam crossed interstellar space.'
      },
      orion: {
        pos: 55, sliderLbl: '1,344 years ago', time: '1,344 years', title: 'Orion Nebula (M42)',
        copy: 'Infrared and visible photons from Orion’s stellar nursery crossed 1,344 light-years — showing young protostars as they looked in the early Middle Ages.',
        history: 'Around the late 600s CE — long before telescopes existed, when Tang dynasty astronomers recorded supernovae and eclipses by naked eye.'
      },
      galactic: {
        pos: 68, sliderLbl: '26,000 years ago', time: '~26,000 years', title: 'Sagittarius A* · Milky Way Core',
        copy: 'Light and radio waves from our galaxy’s central supermassive black hole left roughly 26,000 years ago across dusty spiral arms.',
        history: 'Deep inside the Last Glacial Maximum — glaciers covered northern continents while Ice Age artists painted cave walls.'
      },
      andromeda: {
        pos: 82, sliderLbl: '2.54 million years ago', time: '2.54 million years', title: 'Andromeda Galaxy (M31)',
        copy: 'Andromeda is the farthest object easily spotted with the naked eye — its faint glow began its journey two and a half million years ago.',
        history: 'During the Pliocene/early Pleistocene transition on Earth, when early hominins were first shaping stone tools in East Africa.'
      },
      cmb: {
        pos: 96, sliderLbl: '13.8 billion years ago', time: '~13.8 billion years', title: 'Cosmic Microwave Background',
        copy: 'This oldest light was released ~380,000 years after the Big Bang when atoms first formed. Cosmic expansion stretched its wavelength into microwaves.',
        history: 'More than nine billion years BEFORE Earth and our Sun even coalesced from interstellar gas and dust!'
      }
    };

    const lookbackStage = document.getElementById('sol-lookback-stage');
    const lookbackSlider = document.getElementById('sol-lookback-slider');
    const lookbackSliderVal = document.getElementById('sol-lookback-slider-val');
    const lookbackHistory = document.getElementById('sol-lookback-history');

    function setLookbackHistoryHTML(text) {
      if (!lookbackHistory) return;
      lookbackHistory.innerHTML = `<strong>Earth Clock Sync · What Happened When This Light Left</strong>${text}`;
    }

    function updateLookback(key) {
      const data = LOOKBACK_DESTS[key];
      if (!data) return;
      document.querySelectorAll('[data-lookback]').forEach((button) => {
        button.setAttribute('aria-pressed', button.dataset.lookback === key ? 'true' : 'false');
      });
      if (lookbackStage) lookbackStage.style.setProperty('--lookback-pos', `${data.pos}%`);
      if (lookbackSlider) lookbackSlider.value = String(data.pos);
      if (lookbackSliderVal) lookbackSliderVal.textContent = data.sliderLbl;
      document.getElementById('sol-lookback-time').textContent = data.time;
      document.getElementById('sol-lookback-title').textContent = data.title;
      document.getElementById('sol-lookback-copy').textContent = data.copy;
      setLookbackHistoryHTML(data.history);
    }

    function updateLookbackFromSlider(pos) {
      // Check if close to an anchor milestone
      let closestKey = null;
      let minDist = Infinity;
      Object.keys(LOOKBACK_DESTS).forEach((k) => {
        const d = Math.abs(LOOKBACK_DESTS[k].pos - pos);
        if (d < minDist) { minDist = d; closestKey = k; }
      });
      if (minDist <= 2 && closestKey) {
        updateLookback(closestKey);
        return;
      }

      document.querySelectorAll('[data-lookback]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      if (lookbackStage) lookbackStage.style.setProperty('--lookback-pos', `${pos}%`);

      // Log10 interpolation between 1.28 s (pos=4) and 4.35e17 s (pos=96)
      const logMin = Math.log10(1.28);
      const logMax = Math.log10(4.35e17);
      const sec = Math.pow(10, logMin + ((pos - 4) / 92) * (logMax - logMin));
      const years = sec / 31557600;

      let timeTxt;
      if (sec < 60) timeTxt = `${sec.toFixed(1)} seconds`;
      else if (sec < 3600) timeTxt = `${(sec / 60).toFixed(1)} minutes`;
      else if (sec < 86400) timeTxt = `${(sec / 3600).toFixed(1)} hours`;
      else if (years < 1) timeTxt = `${(sec / 86400).toFixed(1)} days`;
      else if (years < 1e3) timeTxt = `${years.toFixed(1)} years`;
      else if (years < 1e6) timeTxt = `${(years / 1e3).toFixed(1)} thousand years`;
      else if (years < 1e9) timeTxt = `${(years / 1e6).toFixed(2)} million years`;
      else timeTxt = `${(years / 1e9).toFixed(2)} billion years`;

      let eraCopy;
      let historyText;
      if (years < 1) {
        eraCopy = 'Signal depth spans planetary and outer Solar System space.';
        historyText = 'Within modern human clocks — astronauts or robotic probes are within hours or days of communication lag.';
      } else if (years < 150) {
        eraCopy = 'Lookback depth reaches nearby stars inside our local stellar neighborhood.';
        historyText = `Photons from ${timeTxt} ago departed within recorded modern history (radio, flight, and electricity eras).`;
      } else if (years < 50000) {
        eraCopy = 'Lookback spans thousands of light-years across the spiral arms of our Milky Way.';
        historyText = `Left its source ${timeTxt} ago — spanning the rise of cities back through early Ice Age migrations.`;
      } else if (years < 66e6) {
        eraCopy = 'Intergalactic depths among neighboring galaxies in our Local Group and Virgo Supercluster.';
        historyText = 'Before human civilization existed — early mammals and late Cretaceous ecosystems roamed Earth when these photons left.';
      } else if (years < 4.5e9) {
        eraCopy = 'Deep cosmological field spanning hundreds of millions to billions of light-years.';
        historyText = 'Earth was unrecognizable — ranging from early ocean worlds back to molten planetary formation.';
      } else {
        eraCopy = 'Primordial horizon probing the earliest galaxies before our Solar System even existed.';
        historyText = 'Long before the Sun ignited (4.6 billion years ago) — you are looking back past Earth’s entire history.';
      }

      if (lookbackSliderVal) lookbackSliderVal.textContent = `${timeTxt} ago`;
      document.getElementById('sol-lookback-time').textContent = timeTxt;
      document.getElementById('sol-lookback-title').textContent = 'Continuous Depth Inspection';
      document.getElementById('sol-lookback-copy').textContent = eraCopy;
      setLookbackHistoryHTML(historyText);
    }

    document.querySelectorAll('[data-lookback]').forEach((button) => {
      button.addEventListener('click', () => updateLookback(button.dataset.lookback));
    });
    if (lookbackSlider) {
      lookbackSlider.addEventListener('input', () => updateLookbackFromSlider(Number(lookbackSlider.value)));
    }
    updateLookback('sun');

    /* ── 6. Upgraded Light-Travel Simulator ───────────── */
    const DESTS = {
      moon: { label: 'Moon', travelSec: 1.28, dist: '384,400 km', color: '#cbd5e1',
        context: '🌙 The Moon is so close that astronauts in 1969 could converse with Mission Control — a laser bounce completes the round trip in just 2.56 seconds.' },
      sun: { label: 'Sun', travelSec: 500, dist: '150,000,000 km', color: '#ff9500',
        context: '☀️ Light from the Sun takes 8 minutes 20 seconds to reach Earth. We always see the Sun as it was 8m 20s ago.' },
      mars: { label: 'Mars (Closest)', travelSec: 180, dist: '~55,000,000 km', color: '#ff3b30',
        context: '🤖 The "Mars Latency Problem": NASA rovers cannot be joystick-driven because commands take 3–22 minutes one way.' },
      voyager: { label: 'Deep-space probe', travelSec: 82800, dist: '~25 billion km', color: '#7b9fc4',
        context: '🛸 At ~23 light-hours away, a probe receives commands nearly a day after transmission and takes another day to confirm.' },
      alpha: { label: 'Alpha Centauri', travelSec: 126230400, dist: '4.37 light-years', color: '#ff1493',
        context: '⭐ Light from Proxima/Alpha Centauri takes 4.37 years to arrive. Any back-and-forth exchange spans almost 9 years.' }
    };

    const canvas = document.getElementById('sol-canvas');
    const result = document.getElementById('sol-sim-result');
    const contextInfo = document.getElementById('sol-context-info');
    const launchBtn = document.getElementById('sol-launch-btn');
    const pingBtn = document.getElementById('sol-ping-btn');
    const destSelect = document.getElementById('sol-dest');
    const progressBar = document.getElementById('sol-sim-progress');
    const compressionBadge = document.getElementById('sol-compression');
    const routeLabel = document.getElementById('sol-sim-route-label');
    const earthLapsEl = document.getElementById('sol-earth-laps');
    const roundtripValEl = document.getElementById('sol-roundtrip-val');
    const simModeBtns = document.querySelectorAll('.sol-sim-mode-btn[data-sim-mode]');

    let animFrame = null;
    let isAnimating = false;
    let simMode = 'compressed'; // 'compressed' | 'realtime'

    function updateTelemetry(dest, elapsedRealTime, statusText) {
      document.getElementById('sol-distance').textContent = simMode === 'realtime' ? '384,400 km (Moon) · 40,075 km lap' : dest.dist;
      document.getElementById('sol-elapsed').textContent = formatTime(elapsedRealTime);
      document.getElementById('sol-status').textContent = statusText || (isAnimating ? 'IN FLIGHT' : 'IDLE');
      if (earthLapsEl) earthLapsEl.textContent = `${(elapsedRealTime * EARTH_LAPS_PER_SEC).toFixed(simMode === 'realtime' ? 2 : 1)} laps`;
      if (roundtripValEl) roundtripValEl.textContent = simMode === 'realtime' ? '2.56 s' : formatTime(dest.travelSec * 2);
    }

    function drawCompressedTrack(progress, dest, isPing) {
      const prep = prepareCanvas(canvas, 800, 220);
      if (!prep) return;
      const { ctx, W, H } = prep;
      const PAD = Math.max(48, Math.min(72, W * 0.1));
      const trackW = W - PAD * 2;
      const trackY = H * 0.5;
      const planetR = W < 520 ? 18 : 23;
      const destX = PAD + trackW;

      const bg = ctx.createRadialGradient(W * 0.52, trackY, 10, W * 0.52, trackY, W * 0.72);
      bg.addColorStop(0, '#111c3a');
      bg.addColorStop(0.5, '#0a1229');
      bg.addColorStop(1, '#050b17');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 46; i++) {
        const x = (i * 83 + 29) % W;
        const y = (i * 47 + 17) % H;
        ctx.fillStyle = i % 7 === 0 ? 'rgba(116,192,252,0.72)' : 'rgba(255,255,255,0.46)';
        ctx.beginPath();
        ctx.arc(x, y, i % 9 === 0 ? 1.15 : 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(116,192,252,0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PAD, trackY);
      ctx.lineTo(destX, trackY);
      ctx.stroke();

      ctx.font = '700 9px "Space Mono", monospace';
      ctx.textAlign = 'center';
      for (let i = 0; i <= 4; i++) {
        const mx = PAD + (i / 4) * trackW;
        ctx.fillStyle = 'rgba(203,213,225,0.32)';
        ctx.fillRect(mx - 0.5, trackY - 8, 1, 16);
        if (i > 0 && i < 4) {
          ctx.fillStyle = 'rgba(203,213,225,0.48)';
          ctx.fillText(`${i * 25}%`, mx, trackY + 25);
        }
      }

      const earthGrad = ctx.createRadialGradient(PAD - 7, trackY - 8, 2, PAD, trackY, planetR);
      earthGrad.addColorStop(0, '#d8f3ff');
      earthGrad.addColorStop(0.35, '#55b9ff');
      earthGrad.addColorStop(0.7, '#2f80ed');
      earthGrad.addColorStop(1, '#082e5d');
      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.arc(PAD, trackY, planetR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '700 10px "Space Mono", monospace';
      ctx.fillText('EARTH', PAD, trackY + planetR + 22);

      const destGrad = ctx.createRadialGradient(destX - 7, trackY - 8, 1, destX, trackY, planetR);
      destGrad.addColorStop(0, '#fff7df');
      destGrad.addColorStop(0.35, dest.color);
      destGrad.addColorStop(1, '#24142f');
      ctx.fillStyle = destGrad;
      ctx.beginPath();
      ctx.arc(destX, trackY, planetR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      const shortLabel = dest.label === 'Alpha Centauri' ? 'A. CENTAURI' : dest.label.toUpperCase();
      ctx.fillText(shortLabel, destX, trackY + planetR + 22);

      if (progress > 0) {
        const returning = isPing && progress > 0.5;
        const fracPos = !isPing ? progress : (progress <= 0.5 ? progress * 2 : (1 - progress) * 2);
        const px = PAD + fracPos * trackW;
        const color = returning ? '#38bdf8' : '#ffe066';

        ctx.save();
        ctx.strokeStyle = returning ? 'rgba(56,189,248,0.55)' : 'rgba(255,224,102,0.55)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(returning ? destX : PAD, trackY);
        ctx.lineTo(px, trackY);
        ctx.stroke();

        ctx.shadowBlur = 24;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, trackY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(px, trackY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(203,213,225,0.58)';
      ctx.font = '600 9px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(isPing ? 'ROUND-TRIP PING · TIME-COMPRESSED MODEL' : 'NORMALIZED ROUTE · SCREEN DISTANCE IS NOT TO SCALE', W / 2, H - 11);
    }

    function drawRealtimeTrack(elapsedSec, totalDurSec, isPing) {
      const prep = prepareCanvas(canvas, 800, 220);
      if (!prep) return;
      const { ctx, W, H } = prep;

      const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.5, W * 0.72);
      bg.addColorStop(0, '#0f1c38');
      bg.addColorStop(1, '#050b17');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const splitX = Math.max(150, W * 0.34);
      ctx.strokeStyle = 'rgba(148,163,184,0.22)';
      ctx.beginPath();
      ctx.moveTo(splitX, 14);
      ctx.lineTo(splitX, H - 14);
      ctx.stroke();

      // Left sub-panel: 7.48 equatorial Earth laps/sec at exact 1:1 rate
      const ringX = splitX * 0.5;
      const ringY = H * 0.52;
      const ringR = Math.min(splitX * 0.3, H * 0.28);

      ctx.strokeStyle = 'rgba(255,214,10,0.3)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ringX, ringY, ringR + 8, 0, Math.PI * 2);
      ctx.stroke();

      const earthGrad = ctx.createRadialGradient(ringX - 8, ringY - 8, 2, ringX, ringY, ringR);
      earthGrad.addColorStop(0, '#bae6fd');
      earthGrad.addColorStop(0.5, '#2563eb');
      earthGrad.addColorStop(1, '#0c1e4a');
      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
      ctx.fill();

      const theta = elapsedSec * EARTH_LAPS_PER_SEC * Math.PI * 2 - Math.PI / 2;
      const orbX = ringX + Math.cos(theta) * (ringR + 8);
      const orbY = ringY + Math.sin(theta) * (ringR + 8);
      ctx.fillStyle = '#ffe066';
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#ffe066';
      ctx.beginPath();
      ctx.arc(orbX, orbY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(226,232,240,0.86)';
      ctx.font = '700 9px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`EARTH RING · ${(elapsedSec * EARTH_LAPS_PER_SEC).toFixed(2)} LAPS`, ringX, 20);
      ctx.fillStyle = 'rgba(148,163,184,0.72)';
      ctx.fillText('7.48 LAPS / REAL SECOND', ringX, H - 12);

      // Right sub-panel: Exact 1:1 Earth <-> Moon transit (1.28 s one-way)
      const rightStart = splitX + 44;
      const rightEnd = W - 44;
      const trackY = H * 0.52;
      ctx.strokeStyle = 'rgba(116,192,252,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rightStart, trackY);
      ctx.lineTo(rightEnd, trackY);
      ctx.stroke();

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(rightStart, trackY, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(rightEnd, trackY, 10, 0, Math.PI * 2);
      ctx.fill();

      const moonFrac = totalDurSec > 0 ? Math.min(elapsedSec / totalDurSec, 1) : 0;
      const returning = isPing && moonFrac > 0.5;
      const posFrac = !isPing ? moonFrac : (moonFrac <= 0.5 ? moonFrac * 2 : (1 - moonFrac) * 2);
      const px = rightStart + posFrac * (rightEnd - rightStart);
      if (elapsedSec > 0) {
        ctx.fillStyle = returning ? '#38bdf8' : '#ffe066';
        ctx.shadowBlur = 18;
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(px, trackY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#fff';
      ctx.font = '700 9px "Space Mono", monospace';
      ctx.fillText('EARTH', rightStart, trackY + 32);
      ctx.fillText('MOON (384,400 km)', rightEnd, trackY + 32);
      ctx.fillStyle = 'rgba(226,232,240,0.86)';
      ctx.fillText('1:1 REAL-TIME MOON CORRIDOR', (rightStart + rightEnd) / 2, 20);
      ctx.fillStyle = 'rgba(255,224,102,0.85)';
      ctx.fillText(`${elapsedSec.toFixed(2)} s / ${totalDurSec.toFixed(2)} s (EXACT REAL CLOCK)`, (rightStart + rightEnd) / 2, H - 12);
    }

    function syncSimIdleUI() {
      const dest = DESTS[destSelect.value];
      if (simMode === 'realtime') {
        if (routeLabel) routeLabel.textContent = 'Earth equator (7.48 laps/s) & Earth → Moon (1.28 s)';
        compressionBadge.textContent = '1:1 Real-Time Clock';
        contextInfo.innerHTML = '⏱️ <strong>1:1 Real-Time Mode:</strong> Every 1.00 s on your screen is 1.00 real second. Watch light circle Earth 7.48 times/sec while taking 1.28 s to reach the Moon.';
        drawRealtimeTrack(0, 1.28, false);
      } else {
        if (routeLabel) routeLabel.textContent = `Earth → ${dest.label}`;
        compressionBadge.textContent = `5 sec model = ${formatTime(dest.travelSec)}`;
        contextInfo.innerHTML = '📡 ' + dest.context;
        drawCompressedTrack(0, dest, false);
      }
      progressBar.style.width = '0%';
      updateTelemetry(dest, 0, 'IDLE');
    }

    function runSimulation(isPing) {
      if (animFrame) SimKit.frame.cancel('#sol-canvas', animFrame);
      const dest = DESTS[destSelect.value];
      launchBtn.disabled = true;
      if (pingBtn) pingBtn.disabled = true;
      isAnimating = true;
      progressBar.style.width = '0%';

      if (simMode === 'realtime') {
        const realTarget = isPing ? 2.56 : 1.28;
        const animDur = reduceMotion.matches ? 400 : realTarget * 1000;
        const start = performance.now();
        compressionBadge.textContent = isPing ? '1:1 Real-Time Ping (2.56 s)' : '1:1 Real-Time One-Way (1.28 s)';

        function frameRT(now) {
          const frac = Math.min((now - start) / animDur, 1);
          const simSec = frac * realTarget;
          drawRealtimeTrack(simSec, realTarget, isPing);
          progressBar.style.width = `${frac * 100}%`;
          const status = frac < 1 ? (isPing && frac > 0.5 ? 'RETURNING' : 'IN FLIGHT') : 'ARRIVED';
          updateTelemetry(dest, simSec, status);

          if (frac < 1) {
            result.innerHTML = `⏱️ Live 1:1 propagation: <span>${simSec.toFixed(2)} s</span> (${(simSec * EARTH_LAPS_PER_SEC).toFixed(2)} Earth laps)`;
            animFrame = SimKit.frame('#sol-canvas', frameRT);
          } else {
            result.innerHTML = isPing
              ? `✓ <span>ROUND-TRIP ECHO RECEIVED</span> — True lunar bounce: <span>2.56 s</span> (${(2.56 * EARTH_LAPS_PER_SEC).toFixed(1)} Earth laps)`
              : `✓ <span>PHOTON REACHED THE MOON</span> — True one-way time: <span>1.28 s</span> (${(1.28 * EARTH_LAPS_PER_SEC).toFixed(2)} Earth laps)`;
            isAnimating = false;
            launchBtn.disabled = false;
            if (pingBtn) pingBtn.disabled = false;
          }
        }
        animFrame = SimKit.frame('#sol-canvas', frameRT);
        return;
      }

      // Compressed 5-second model mode
      const SIM_DURATION = reduceMotion.matches ? 500 : 5000;
      const totalTravel = isPing ? dest.travelSec * 2 : dest.travelSec;
      const start = performance.now();
      contextInfo.innerHTML = '📡 ' + dest.context;
      compressionBadge.textContent = `5 sec model = ${formatTime(totalTravel)}`;

      function frameComp(now) {
        const frac = Math.min((now - start) / SIM_DURATION, 1);
        drawCompressedTrack(frac, dest, isPing);
        progressBar.style.width = `${frac * 100}%`;
        const actualTime = frac * totalTravel;
        const status = frac < 1 ? (isPing && frac > 0.5 ? 'RETURNING' : 'IN FLIGHT') : 'ARRIVED';
        updateTelemetry(dest, actualTime, status);

        if (frac < 1) {
          result.innerHTML = `🚀 ${isPing ? 'Round-trip ping' : 'In flight'}: <span>${formatTime(actualTime)}</span> / <span>${formatTime(totalTravel)}</span>`;
          animFrame = SimKit.frame('#sol-canvas', frameComp);
        } else {
          result.innerHTML = isPing
            ? `✓ <span>PING COMPLETE (${dest.label} ↔ Earth)</span> — Round-trip light delay: <span>${formatTimeFull(totalTravel)}</span>`
            : `✓ <span>ARRIVED at ${dest.label}</span> — Total travel time: <span>${formatTimeFull(totalTravel)}</span>`;
          isAnimating = false;
          launchBtn.disabled = false;
          if (pingBtn) pingBtn.disabled = false;
        }
      }
      animFrame = SimKit.frame('#sol-canvas', frameComp);
    }

    simModeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isAnimating && animFrame) {
          SimKit.frame.cancel('#sol-canvas', animFrame);
          isAnimating = false;
          launchBtn.disabled = false;
          if (pingBtn) pingBtn.disabled = false;
        }
        simMode = btn.dataset.simMode;
        simModeBtns.forEach((b) => {
          const active = b.dataset.simMode === simMode;
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        result.textContent = simMode === 'realtime'
          ? 'Press Launch (1.28 s one-way) or Round-Trip Ping (2.56 s) in exact 1:1 physical time.'
          : 'Select a destination and press Launch or Round-Trip Ping to begin.';
        syncSimIdleUI();
      });
    });

    if (launchBtn) launchBtn.addEventListener('click', () => runSimulation(false));
    if (pingBtn) pingBtn.addEventListener('click', () => runSimulation(true));
    if (destSelect) {
      destSelect.addEventListener('change', () => {
        if (!isAnimating) syncSimIdleUI();
      });
      syncSimIdleUI();
    }

    /* ── 7. Causal Limit Check & Minkowski Inspector ──── */
    const causalChoices = document.querySelectorAll('[data-causal-choice]');
    const causalFeedback = document.getElementById('sol-causal-feedback');
    causalChoices.forEach((button) => {
      button.addEventListener('click', () => {
        causalChoices.forEach((choice) => {
          choice.classList.remove('correct', 'wrong');
          choice.setAttribute('aria-pressed', 'false');
        });
        button.setAttribute('aria-pressed', 'true');
        const correct = button.dataset.causalChoice === 'inside';
        button.classList.add(correct ? 'correct' : 'wrong');
        causalFeedback.className = `sol-causal-feedback ${correct ? 'correct' : 'wrong'}`;
        causalFeedback.textContent = correct
          ? 'Correct. A massive spacecraft must move below c, so its future worldline stays inside the future cone.'
          : button.dataset.causalChoice === 'surface'
            ? 'The surface is reserved for lightlike motion at exactly c. A massive spacecraft must remain inside it.'
            : 'Reaching an event outside the cone would require a faster-than-light path, so it cannot be the spacecraft’s future event.';
      });
    });

    const coneCanvas = document.getElementById('sol-cone-canvas');
    const coneDxSlider = document.getElementById('sol-cone-dx');
    const coneDtSlider = document.getElementById('sol-cone-dt');
    const conePresets = document.querySelectorAll('#sol-spacetime-lab .sol-preset-btn[data-cone-dx]');
    let coneDx = coneDxSlider ? Number(coneDxSlider.value) : 2.5;
    let coneDt = coneDtSlider ? Number(coneDtSlider.value) : 4.5;

    function updateSpacetimeInspector() {
      const dxValEl = document.getElementById('sol-cone-dx-val');
      const dtValEl = document.getElementById('sol-cone-dt-val');
      const badgeEl = document.getElementById('sol-cone-badge');
      const intEl = document.getElementById('sol-cone-interval');
      const reqVEl = document.getElementById('sol-cone-req-v');
      const verdictEl = document.getElementById('sol-cone-verdict');

      const s2 = coneDt * coneDt - coneDx * coneDx;
      const absDiff = Math.abs(Math.abs(coneDt) - Math.abs(coneDx));
      const isLight = absDiff <= 0.12 && (Math.abs(coneDx) > 0.05 || Math.abs(coneDt) > 0.05);
      const cls = isLight ? 'lightlike' : (s2 >= 0 ? 'timelike' : 'spacelike');

      if (dxValEl) dxValEl.textContent = `${coneDx >= 0 ? '+' : ''}${coneDx.toFixed(1)} ls`;
      if (dtValEl) dtValEl.textContent = `${coneDt >= 0 ? '+' : ''}${coneDt.toFixed(1)} ls`;
      if (intEl) intEl.textContent = `${s2 >= 0 ? '+' : ''}${s2.toFixed(2)} ls²`;

      const reqV = Math.abs(coneDt) < 0.05 ? Infinity : Math.abs(coneDx / coneDt);
      if (reqVEl) reqVEl.textContent = isFinite(reqV) ? `${reqV.toFixed(2)}c` : '∞ (instant)';

      if (badgeEl) {
        badgeEl.className = `sol-cone-badge ${cls}`;
        badgeEl.textContent = cls === 'lightlike'
          ? 'Lightlike · On Light Cone'
          : (cls === 'timelike' ? 'Timelike · Causal' : 'Spacelike · Elsewhere');
      }
      if (verdictEl) {
        if (Math.abs(coneDx) < 0.1 && Math.abs(coneDt) < 0.1) {
          verdictEl.textContent = 'Coincident with O';
        } else if (cls === 'lightlike') {
          verdictEl.textContent = coneDt >= 0 ? 'Photon reaches P from O' : 'Photon from P reaches O';
        } else if (cls === 'timelike') {
          verdictEl.textContent = coneDt >= 0 ? 'Causal future of O' : 'Causal past of O';
        } else {
          verdictEl.textContent = 'No causal link possible (Elsewhere)';
        }
      }

      conePresets.forEach((btn) => {
        const match = Math.abs(Number(btn.dataset.coneDx) - coneDx) < 0.05 && Math.abs(Number(btn.dataset.coneDt) - coneDt) < 0.05;
        btn.classList.toggle('active', match);
        btn.setAttribute('aria-pressed', match ? 'true' : 'false');
      });

      drawMinkowskiCanvas(cls);
    }

    function drawMinkowskiCanvas(cls) {
      const prep = prepareCanvas(coneCanvas, 600, 270);
      if (!prep) return;
      const { ctx: g, W, H } = prep;
      const cx = W * 0.5;
      const cy = H * 0.5;
      const range = 6.2;
      const scaleX = Math.min((W - 84) / (range * 2), (H - 54) / (range * 2)) * 1.15;
      const scaleY = (H - 52) / (range * 2);
      const sx = (x) => cx + x * scaleX;
      const sy = (t) => cy - t * scaleY;

      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0a1229');
      bg.addColorStop(1, '#060a17');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);

      // Shaded future & past light cones
      g.fillStyle = 'rgba(52,199,89,0.12)';
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(sx(-range), sy(range));
      g.lineTo(sx(range), sy(range));
      g.closePath();
      g.fill();

      g.fillStyle = 'rgba(99,102,241,0.12)';
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(sx(-range), sy(-range));
      g.lineTo(sx(range), sy(-range));
      g.closePath();
      g.fill();

      // Grid lines
      g.strokeStyle = 'rgba(148,163,184,0.12)';
      g.lineWidth = 1;
      for (let i = -6; i <= 6; i += 2) {
        if (i === 0) continue;
        g.beginPath();
        g.moveTo(sx(i), sy(-range));
        g.lineTo(sx(i), sy(range));
        g.stroke();
        g.beginPath();
        g.moveTo(sx(-6), sy(i));
        g.lineTo(sx(6), sy(i));
        g.stroke();
      }

      // Main axes
      g.strokeStyle = 'rgba(203,213,225,0.34)';
      g.beginPath();
      g.moveTo(sx(-range), cy);
      g.lineTo(sx(range), cy);
      g.moveTo(cx, sy(-range));
      g.lineTo(cx, sy(range));
      g.stroke();

      // 45° photon worldlines
      g.strokeStyle = '#ffd60a';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(sx(-range), sy(-range));
      g.lineTo(sx(range), sy(range));
      g.moveTo(sx(-range), sy(range));
      g.lineTo(sx(range), sy(-range));
      g.stroke();

      // Vector from O to P
      const px = sx(coneDx);
      const py = sy(coneDt);
      const pColor = cls === 'timelike' ? '#4ade80' : (cls === 'lightlike' ? '#ffd60a' : '#f87171');
      g.strokeStyle = pColor;
      g.lineWidth = 2.2;
      g.setLineDash(cls === 'spacelike' ? [5, 5] : []);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(px, py);
      g.stroke();
      g.setLineDash([]);

      // Origin O
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(cx, cy, 4.5, 0, Math.PI * 2);
      g.fill();
      g.font = '700 9px "Space Mono", monospace';
      g.textAlign = 'left';
      g.fillText('O (0,0)', cx + 7, cy - 6);

      // Event P
      g.fillStyle = pColor;
      g.shadowBlur = 16;
      g.shadowColor = pColor;
      g.beginPath();
      g.arc(px, py, 6.5, 0, Math.PI * 2);
      g.fill();
      g.shadowBlur = 0;
      g.fillStyle = '#fff';
      g.textAlign = coneDx >= 0 ? 'left' : 'right';
      g.fillText(`P (${coneDx.toFixed(1)}, ${coneDt.toFixed(1)})`, px + (coneDx >= 0 ? 10 : -10), py - 8);

      // Labels
      g.fillStyle = 'rgba(226,232,240,0.72)';
      g.textAlign = 'center';
      g.fillText('FUTURE CONE (+cΔt)', cx, 16);
      g.fillText('PAST CONE (−cΔt)', cx, H - 10);
      g.fillStyle = 'rgba(255,214,10,0.85)';
      g.textAlign = 'right';
      g.fillText('PHOTON (45° · v = c)', sx(range) - 4, sy(range) + 14);
      g.fillStyle = 'rgba(248,113,113,0.75)';
      g.textAlign = 'left';
      g.fillText('ELSEWHERE', 14, cy - 10);
    }

    if (coneDxSlider && coneDtSlider) {
      const handleSliderCone = () => {
        coneDx = Number(coneDxSlider.value);
        coneDt = Number(coneDtSlider.value);
        updateSpacetimeInspector();
      };
      coneDxSlider.addEventListener('input', handleSliderCone);
      coneDtSlider.addEventListener('input', handleSliderCone);
      conePresets.forEach((btn) => {
        btn.addEventListener('click', () => {
          coneDx = Number(btn.dataset.coneDx);
          coneDt = Number(btn.dataset.coneDt);
          coneDxSlider.value = String(coneDx);
          coneDtSlider.value = String(coneDt);
          updateSpacetimeInspector();
        });
      });

      if (coneCanvas) {
        let draggingCone = false;
        const setConeFromPointer = (ev) => {
          const rect = coneCanvas.getBoundingClientRect();
          const W = rect.width;
          const H = rect.height;
          if (!W || !H) return;
          const range = 6.2;
          const scaleX = Math.min((W - 84) / (range * 2), (H - 54) / (range * 2)) * 1.15;
          const scaleY = (H - 52) / (range * 2);
          const rawX = (ev.clientX - rect.left - W * 0.5) / scaleX;
          const rawT = (H * 0.5 - (ev.clientY - rect.top)) / scaleY;
          coneDx = Math.max(-6, Math.min(6, Math.round(rawX * 10) / 10));
          coneDt = Math.max(-6, Math.min(6, Math.round(rawT * 10) / 10));
          coneDxSlider.value = String(coneDx);
          coneDtSlider.value = String(coneDt);
          updateSpacetimeInspector();
        };
        coneCanvas.addEventListener('pointerdown', (e) => {
          draggingCone = true;
          coneCanvas.setPointerCapture(e.pointerId);
          setConeFromPointer(e);
        });
        coneCanvas.addEventListener('pointermove', (e) => { if (draggingCone) setConeFromPointer(e); });
        coneCanvas.addEventListener('pointerup', () => { draggingCone = false; });
        coneCanvas.addEventListener('pointercancel', () => { draggingCone = false; });
      }
      updateSpacetimeInspector();
    }

    /* ── 8. Upgraded Relativity Ramp ──────────────────── */
    const relSpeed = document.getElementById('sol-rel-speed');
    const relSpeedPill = document.getElementById('sol-rel-speed-pill');
    const relGamma = document.getElementById('sol-rel-gamma');
    const relShipTime = document.getElementById('sol-rel-ship-time');
    const relLength = document.getElementById('sol-rel-length');
    const relKE = document.getElementById('sol-rel-ke');
    const relFill = document.getElementById('sol-rel-fill');
    const relNote = document.getElementById('sol-rel-note');
    const lightClockCanvas = document.getElementById('sol-light-clock');
    const energyCanvas = document.getElementById('sol-energy-graph');
    const clockCaption = document.getElementById('sol-clock-caption');
    const energyCaption = document.getElementById('sol-energy-caption');
    const relPresetBtns = document.querySelectorAll('.sol-rel-preset-btn[data-rel-pct]');
    const clockGeoBtn = document.getElementById('sol-clock-geo-btn');

    let currentBeta = relSpeed ? Number(relSpeed.value) / 100 : 0.8;
    let showClockGeo = false;

    function drawEnergyGraph(beta) {
      const prep = prepareCanvas(energyCanvas, 500, 240);
      if (!prep) return;
      const { ctx: graph, W, H } = prep;
      const pad = { left: 42, right: 18, top: 22, bottom: 36 };
      const plotW = W - pad.left - pad.right;
      const plotH = H - pad.top - pad.bottom;
      const maxBeta = 0.999;
      const maxGamma = 1 / Math.sqrt(1 - maxBeta * maxBeta);
      const gammaFor = (v) => 1 / Math.sqrt(1 - v * v);
      const xFor = (v) => pad.left + (v / maxBeta) * plotW;
      const yFor = (val) => pad.top + plotH - (Math.log(Math.max(1, val)) / Math.log(maxGamma)) * plotH;

      const bg = graph.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#11183a');
      bg.addColorStop(1, '#070b1d');
      graph.fillStyle = bg;
      graph.fillRect(0, 0, W, H);

      graph.font = '600 9px "Space Mono", monospace';
      graph.textAlign = 'right';
      graph.textBaseline = 'middle';
      [1, 2, 5, 10, 20].forEach((value) => {
        const y = yFor(value);
        graph.strokeStyle = 'rgba(148,163,184,0.16)';
        graph.lineWidth = 1;
        graph.beginPath();
        graph.moveTo(pad.left, y);
        graph.lineTo(W - pad.right, y);
        graph.stroke();
        graph.fillStyle = 'rgba(203,213,225,0.6)';
        graph.fillText(`${value}×`, pad.left - 7, y);
      });

      graph.textAlign = 'center';
      graph.textBaseline = 'top';
      [0, 0.5, 0.9, 0.99].forEach((value) => {
        const x = xFor(value);
        graph.strokeStyle = 'rgba(148,163,184,0.13)';
        graph.beginPath();
        graph.moveTo(x, pad.top);
        graph.lineTo(x, H - pad.bottom);
        graph.stroke();
        graph.fillStyle = 'rgba(203,213,225,0.58)';
        graph.fillText(value === 0 ? '0' : `${value}c`, x, H - pad.bottom + 9);
      });

      // Classical Newtonian 1 + 0.5*beta^2 dashed reference
      graph.save();
      graph.setLineDash([5, 4]);
      graph.strokeStyle = 'rgba(56,189,248,0.82)';
      graph.lineWidth = 2;
      graph.beginPath();
      for (let i = 0; i <= 120; i++) {
        const v = (i / 120) * maxBeta;
        const x = xFor(v);
        const y = yFor(1 + 0.5 * v * v);
        if (i === 0) graph.moveTo(x, y);
        else graph.lineTo(x, y);
      }
      graph.stroke();
      graph.restore();

      const area = graph.createLinearGradient(0, pad.top, 0, H - pad.bottom);
      area.addColorStop(0, 'rgba(255,149,0,0.38)');
      area.addColorStop(1, 'rgba(88,86,214,0.06)');
      graph.beginPath();
      graph.moveTo(xFor(0), yFor(1));
      for (let i = 0; i <= 220; i++) {
        const v = (i / 220) * maxBeta;
        graph.lineTo(xFor(v), yFor(gammaFor(v)));
      }
      graph.lineTo(xFor(maxBeta), H - pad.bottom);
      graph.lineTo(xFor(0), H - pad.bottom);
      graph.closePath();
      graph.fillStyle = area;
      graph.fill();

      graph.beginPath();
      for (let i = 0; i <= 220; i++) {
        const v = (i / 220) * maxBeta;
        const x = xFor(v);
        const y = yFor(gammaFor(v));
        if (i === 0) graph.moveTo(x, y);
        else graph.lineTo(x, y);
      }
      graph.strokeStyle = '#ff9f0a';
      graph.lineWidth = 3;
      graph.shadowBlur = 12;
      graph.shadowColor = 'rgba(255,159,10,0.58)';
      graph.stroke();
      graph.shadowBlur = 0;

      const gamma = gammaFor(beta);
      const markerX = xFor(Math.min(beta, maxBeta));
      const markerY = yFor(Math.min(gamma, maxGamma));
      graph.setLineDash([4, 4]);
      graph.strokeStyle = 'rgba(255,224,102,0.5)';
      graph.beginPath();
      graph.moveTo(markerX, markerY);
      graph.lineTo(markerX, H - pad.bottom);
      graph.stroke();
      graph.setLineDash([]);
      graph.fillStyle = '#ffe066';
      graph.shadowBlur = 16;
      graph.shadowColor = '#ffe066';
      graph.beginPath();
      graph.arc(markerX, markerY, 5.5, 0, Math.PI * 2);
      graph.fill();
      graph.shadowBlur = 0;

      graph.fillStyle = 'rgba(226,232,240,0.72)';
      graph.font = '700 9px "Space Mono", monospace';
      graph.textAlign = 'left';
      graph.textBaseline = 'top';
      graph.fillText('E / (mc²) = γ', pad.left + 2, 7);
      graph.fillStyle = '#7dd3fc';
      graph.fillText('--- Classical 1 + ½β²', pad.left + 2, H - pad.bottom - 20);
      graph.fillStyle = 'rgba(226,232,240,0.72)';
      graph.textAlign = 'right';
      graph.fillText('SPEED → c', W - pad.right, H - 15);
    }

    function drawLightClock(beta, timestamp) {
      const prep = prepareCanvas(lightClockCanvas, 500, 240);
      if (!prep) return;
      const { ctx: clock, W, H } = prep;
      const gamma = 1 / Math.sqrt(1 - beta * beta);
      const half = W / 2;
      const topY = 64;
      const bottomY = H - 54;
      const restX = half * 0.5;
      const movingX = half + half * 0.5;
      const spread = Math.min(half * 0.31, 14 + Math.log2(gamma + 1) * 18);
      const restPhase = reduceMotion.matches ? 0.35 : (timestamp % 1400) / 1400;
      const movingPeriod = 1400 * gamma;
      const movingPhase = reduceMotion.matches ? 0.35 : (timestamp % movingPeriod) / movingPeriod;
      const triangle = (phase) => phase < 0.5 ? phase * 2 : (1 - phase) * 2;

      const bg = clock.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#101736');
      bg.addColorStop(1, '#070b1d');
      clock.fillStyle = bg;
      clock.fillRect(0, 0, W, H);
      clock.strokeStyle = 'rgba(148,163,184,0.18)';
      clock.beginPath();
      clock.moveTo(half, 16);
      clock.lineTo(half, H - 16);
      clock.stroke();

      clock.fillStyle = 'rgba(226,232,240,0.72)';
      clock.font = '700 9px "Space Mono", monospace';
      clock.textAlign = 'center';
      clock.fillText('CLOCK FRAME', restX, 22);
      clock.fillText('EARTH FRAME', movingX, 22);

      function mirror(x, y, width) {
        const grad = clock.createLinearGradient(x - width / 2, y, x + width / 2, y);
        grad.addColorStop(0, 'rgba(116,192,252,0.28)');
        grad.addColorStop(0.5, '#dbeafe');
        grad.addColorStop(1, 'rgba(116,192,252,0.28)');
        clock.strokeStyle = grad;
        clock.lineWidth = 5;
        clock.beginPath();
        clock.moveTo(x - width / 2, y);
        clock.lineTo(x + width / 2, y);
        clock.stroke();
      }

      mirror(restX, topY, 54);
      mirror(restX, bottomY, 54);
      clock.strokeStyle = 'rgba(255,224,102,0.5)';
      clock.lineWidth = 2;
      clock.setLineDash([5, 5]);
      clock.beginPath();
      clock.moveTo(restX, bottomY);
      clock.lineTo(restX, topY);
      clock.stroke();

      mirror(movingX - spread, bottomY, 44);
      mirror(movingX, topY, 44);
      mirror(movingX + spread, bottomY, 44);
      clock.strokeStyle = 'rgba(255,159,10,0.58)';
      clock.beginPath();
      clock.moveTo(movingX - spread, bottomY);
      clock.lineTo(movingX, topY);
      clock.lineTo(movingX + spread, bottomY);
      clock.stroke();
      clock.setLineDash([]);

      if (showClockGeo) {
        // Right-triangle Pythagorean proof overlay on outbound leg
        clock.save();
        clock.fillStyle = 'rgba(56,189,248,0.14)';
        clock.beginPath();
        clock.moveTo(movingX - spread, bottomY);
        clock.lineTo(movingX, bottomY);
        clock.lineTo(movingX, topY);
        clock.closePath();
        clock.fill();

        clock.strokeStyle = '#38bdf8';
        clock.lineWidth = 1.6;
        clock.beginPath();
        clock.moveTo(movingX - spread, bottomY);
        clock.lineTo(movingX, bottomY);
        clock.lineTo(movingX, topY);
        clock.stroke();
        clock.strokeRect(movingX - 9, bottomY - 9, 9, 9);

        clock.fillStyle = '#7dd3fc';
        clock.font = '700 8px "Space Mono", monospace';
        clock.textAlign = 'center';
        clock.fillText('vΔt', movingX - spread * 0.5, bottomY + 13);
        clock.textAlign = 'left';
        clock.fillText('cΔt₀', movingX + 5, (topY + bottomY) * 0.5 + 4);
        clock.fillStyle = '#ffd60a';
        clock.textAlign = 'right';
        clock.fillText('cΔt', movingX - spread * 0.5 - 6, (topY + bottomY) * 0.5);
        clock.fillStyle = '#e0f2fe';
        clock.textAlign = 'center';
        clock.fillText(`γ = ${gamma.toFixed(2)}`, movingX, 40);
        clock.restore();
      }

      function photon(x, y, color) {
        clock.fillStyle = color;
        clock.shadowBlur = 18;
        clock.shadowColor = color;
        clock.beginPath();
        clock.arc(x, y, 5.5, 0, Math.PI * 2);
        clock.fill();
        clock.shadowBlur = 0;
      }

      const restTravel = triangle(restPhase);
      photon(restX, bottomY - restTravel * (bottomY - topY), '#ffe066');

      const movingOutbound = movingPhase < 0.5;
      const movingLeg = movingOutbound ? movingPhase * 2 : (movingPhase - 0.5) * 2;
      photon(
        movingOutbound ? movingX - spread + spread * movingLeg : movingX + spread * movingLeg,
        movingOutbound ? bottomY - movingLeg * (bottomY - topY) : topY + movingLeg * (bottomY - topY),
        '#ff9f0a'
      );

      clock.fillStyle = 'rgba(203,213,225,0.58)';
      clock.font = '600 8px "Space Mono", monospace';
      clock.textAlign = 'center';
      clock.fillText('STRAIGHT PATH', restX, H - 14);
      clock.fillText('LONGER DIAGONAL PATH', movingX, H - 14);
    }

    function animateLightClock(ts) {
      drawLightClock(currentBeta, ts || 0);
      if (!reduceMotion.matches && lightClockCanvas) SimKit.frame('#sol-light-clock', animateLightClock);
    }

    function updateRelativityRamp() {
      if (!relSpeed) return;
      const pct = Number(relSpeed.value);
      const beta = pct / 100;
      const gamma = 1 / Math.sqrt(1 - beta * beta);
      const shipYears = 10 / gamma;
      const lengthPercent = 100 / gamma;
      relSpeedPill.textContent = `${beta.toFixed(3)}c`;
      relGamma.textContent = `${gamma.toFixed(2)}x`;
      relShipTime.textContent = `${shipYears.toFixed(1)} y`;
      relLength.textContent = `${lengthPercent.toFixed(0)}%`;
      if (relKE) relKE.textContent = `${(gamma - 1).toFixed(2)} mc²`;
      relFill.style.width = `${pct}%`;
      currentBeta = beta;
      clockCaption.textContent = `Moving clock runs at ${(100 / gamma).toFixed(0)}% of Earth’s rate`;
      energyCaption.textContent = `E = ${gamma.toFixed(2)} mc²`;
      relPresetBtns.forEach((btn) => btn.classList.toggle('active', Math.abs(Number(btn.dataset.relPct) - pct) < 0.08));
      drawEnergyGraph(beta);
      if (reduceMotion.matches) drawLightClock(beta, 0);

      if (beta < 0.5) {
        relNote.textContent = 'At lower speeds, relativistic offsets are tiny (~6% or less). Newtonian mechanics looks nearly exact.';
      } else if (beta < 0.9) {
        relNote.textContent = `At ${beta.toFixed(3)}c, a 10-year trip measured from Earth feels like about ${shipYears.toFixed(1)} years onboard (γ = ${gamma.toFixed(2)}).`;
      } else {
        relNote.textContent = `Ultra-relativistic regime (${beta.toFixed(3)}c): kinetic energy hits ${(gamma - 1).toFixed(2)} mc² while Earth clocks tick ${gamma.toFixed(2)}× faster than ship clocks.`;
      }
    }

    if (relSpeed) {
      relSpeed.addEventListener('input', updateRelativityRamp);
      relPresetBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          relSpeed.value = btn.dataset.relPct;
          updateRelativityRamp();
        });
      });
      if (clockGeoBtn) {
        clockGeoBtn.addEventListener('click', () => {
          showClockGeo = !showClockGeo;
          clockGeoBtn.setAttribute('aria-pressed', showClockGeo ? 'true' : 'false');
          clockGeoBtn.textContent = showClockGeo ? 'Hide Right-Triangle Proof' : 'Show Right-Triangle Proof';
          if (reduceMotion.matches) drawLightClock(currentBeta, 0);
        });
      }
      updateRelativityRamp();
      animateLightClock(performance.now());
    }

    /* ── 9. Exhibit 04: Fizeau (1849) & Rømer (1676) Lab ─ */
    const measCanvas = document.getElementById('sol-fizeau-canvas');
    const measSlider = document.getElementById('sol-fizeau-slider');
    const measPresetsWrap = document.getElementById('sol-fizeau-presets');
    const measTabs = document.querySelectorAll('#sol-fizeau-lab .sol-lab-tab[data-meas-mode]');
    const measDesc = document.getElementById('sol-fizeau-desc');
    const measSliderLbl = document.getElementById('sol-fizeau-slider-label');
    const measSliderVal = document.getElementById('sol-fizeau-slider-val');

    const FIZEAU_D = 8633;
    const FIZEAU_TEETH = 720;
    let measMode = 'fizeau';
    let fizeauFreq = 12.06;
    let romerAngleDeg = 90;

    function buildMeasPresets() {
      if (!measPresetsWrap) return;
      const list = measMode === 'fizeau'
        ? [
            { val: '4.0', txt: 'Slow Wheel (4 rev/s)' },
            { val: '12.06', txt: 'Exact 1st Eclipse (12.06 rev/s)' },
            { val: '12.6', txt: 'Fizeau Reported (12.6 rev/s)' },
            { val: '24.12', txt: 'Next Gap (24.12 rev/s)' }
          ]
        : [
            { val: '0', txt: 'Opposition (0° · Closest)' },
            { val: '90', txt: 'Quadrature (90° · Mid-Lag)' },
            { val: '180', txt: 'Conjunction (180° · +16.6 min)' }
          ];
      measPresetsWrap.innerHTML = list.map((p) => {
        const cur = measMode === 'fizeau' ? fizeauFreq : romerAngleDeg;
        const active = Math.abs(Number(p.val) - cur) < (measMode === 'fizeau' ? 0.05 : 2);
        return `<button type="button" class="sol-preset-btn${active ? ' active' : ''}" data-meas-val="${p.val}" aria-pressed="${active}">${p.txt}</button>`;
      }).join('');
      measPresetsWrap.querySelectorAll('[data-meas-val]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const v = Number(btn.dataset.measVal);
          if (measMode === 'fizeau') fizeauFreq = v;
          else romerAngleDeg = v;
          if (measSlider) measSlider.value = String(v);
          syncMeasUI();
          if (reduceMotion.matches) drawMeasLab(0);
        });
      });
    }

    function syncMeasUI() {
      const pEl = document.getElementById('sol-meas-primary');
      const pLbl = document.getElementById('sol-meas-primary-lbl');
      const sEl = document.getElementById('sol-meas-secondary');
      const sLbl = document.getElementById('sol-meas-secondary-lbl');
      const eEl = document.getElementById('sol-meas-estimate');
      const eLbl = document.getElementById('sol-meas-estimate-lbl');
      const stEl = document.getElementById('sol-meas-status');
      const stLbl = document.getElementById('sol-meas-status-lbl');

      if (measMode === 'fizeau') {
        const flightSec = (2 * FIZEAU_D) / C_MPS;
        const toothShift = flightSec * fizeauFreq * FIZEAU_TEETH;
        const trans = Math.pow(Math.cos(Math.PI * toothShift), 2);
        const impliedKms = Math.round((4 * FIZEAU_D * FIZEAU_TEETH * fizeauFreq) / 1000);

        if (measSliderVal) measSliderVal.textContent = `${fizeauFreq.toFixed(2)} rev/s`;
        if (pEl) pEl.textContent = `${(flightSec * 1e6).toFixed(1)} μs`;
        if (pLbl) pLbl.textContent = 'Light round-trip flight (17,266 m)';
        if (sEl) sEl.textContent = `${toothShift.toFixed(2)} teeth`;
        if (sLbl) sLbl.textContent = 'Wheel advance during flight';
        if (eEl) eEl.textContent = Math.abs(toothShift - 0.5) < 0.15 ? `${impliedKms.toLocaleString()} km/s` : 'Tune to 0.50 tooth';
        if (eLbl) eLbl.textContent = '1st-eclipse formula 4·N·D·f';
        if (stEl) stEl.textContent = trans < 0.08 ? 'ECLIPSED (DARK)' : `${Math.round(trans * 100)}% BRIGHT`;
        if (stLbl) stLbl.textContent = 'Observer eyepiece brightness';
      } else {
        const rad = (romerAngleDeg * Math.PI) / 180;
        // Distance from Earth orbit (~1 AU) to Jupiter (~5.2 AU) relative to opposition (4.2 AU)
        const dAU = Math.sqrt(1 + 5.2 * 5.2 - 2 * 1 * 5.2 * Math.cos(rad));
        const extraAU = dAU - 4.2;
        const extraSec = extraAU * 499; // ~499 s per AU
        if (measSliderVal) measSliderVal.textContent = `${romerAngleDeg}°`;
        if (pEl) pEl.textContent = `${dAU.toFixed(2)} AU`;
        if (pLbl) pLbl.textContent = 'Earth–Jupiter light path';
        if (sEl) sEl.textContent = `+${(extraSec / 60).toFixed(1)} min`;
        if (sLbl) sLbl.textContent = 'Cumulative Io eclipse lag vs. 0°';
        if (eEl) eEl.textContent = '220,000 km/s';
        if (eLbl) eLbl.textContent = 'Rømer 1676 estimate (modern: 299,792)';
        if (stEl) stEl.textContent = romerAngleDeg < 25 ? 'EARLIEST ECLIPSE' : (romerAngleDeg > 155 ? 'MAXIMUM DELAY' : 'RECEDING PATH');
        if (stLbl) stLbl.textContent = 'Orbital geometry state';
      }
      buildMeasPresets();
    }

    function drawMeasLab(ts) {
      const prep = prepareCanvas(measCanvas, 600, 235);
      if (!prep) return;
      const { ctx: g, W, H } = prep;
      const tSec = reduceMotion.matches ? 0 : (ts || 0) / 1000;

      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#091124');
      bg.addColorStop(1, '#060a17');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);

      if (measMode === 'fizeau') {
        const wheelX = Math.max(105, W * 0.24);
        const wheelY = H * 0.54;
        const wheelR = Math.min(64, H * 0.27);
        const mirrorX = W - 46;
        const toothShift = ((2 * FIZEAU_D) / C_MPS) * fizeauFreq * FIZEAU_TEETH;
        const trans = Math.pow(Math.cos(Math.PI * toothShift), 2);

        // Spinning toothed wheel visual (scaled visual speed so direction matches rev/s)
        const spinAngle = tSec * fizeauFreq * 0.45;
        g.save();
        g.translate(wheelX, wheelY);
        g.rotate(spinAngle);
        const visTeeth = 24;
        for (let i = 0; i < visTeeth; i++) {
          const a = (i / visTeeth) * Math.PI * 2;
          g.save();
          g.rotate(a);
          g.fillStyle = '#94a3b8';
          g.fillRect(wheelR - 9, -3.2, 11, 6.4);
          g.restore();
        }
        g.fillStyle = '#334155';
        g.beginPath();
        g.arc(0, 0, wheelR - 9, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#cbd5e1';
        g.lineWidth = 2;
        g.stroke();
        g.restore();

        // Beam path: source -> wheel -> Montmartre mirror -> wheel -> eyepiece
        const beamY = wheelY - wheelR + 10;
        const retY = wheelY - wheelR + 18;
        g.strokeStyle = '#ffd60a';
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(28, beamY);
        g.lineTo(mirrorX, beamY);
        g.stroke();

        // Distant mirror
        g.fillStyle = '#e2e8f0';
        g.fillRect(mirrorX, beamY - 20, 6, 48);

        // Returning beam
        g.strokeStyle = 'rgba(56,189,248,0.85)';
        g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(mirrorX, retY);
        g.lineTo(wheelX + 8, retY);
        g.stroke();

        // After hitting wheel -> transmitted intensity to eyepiece
        g.strokeStyle = `rgba(56,189,248,${(0.08 + trans * 0.88).toFixed(2)})`;
        g.beginPath();
        g.moveTo(wheelX - 8, retY);
        g.lineTo(28, retY);
        g.stroke();

        // Animated light packet cycling round trip
        const cyc = (tSec * 1.1) % 1;
        const px = cyc < 0.5 ? (wheelX + (mirrorX - wheelX) * (cyc * 2)) : (mirrorX - (mirrorX - wheelX) * ((cyc - 0.5) * 2));
        const py = cyc < 0.5 ? beamY : retY;
        g.fillStyle = cyc < 0.5 ? '#ffe066' : '#38bdf8';
        g.shadowBlur = 12;
        g.shadowColor = g.fillStyle;
        g.beginPath();
        g.arc(px, py, 4.5, 0, Math.PI * 2);
        g.fill();
        g.shadowBlur = 0;

        // Eyepiece indicator bulb
        g.fillStyle = `rgba(255,214,10,${(0.1 + trans * 0.9).toFixed(2)})`;
        g.strokeStyle = 'rgba(226,232,240,0.45)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(28, retY, 10, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        g.fillStyle = 'rgba(226,232,240,0.82)';
        g.font = '700 9px "Space Mono", monospace';
        g.textAlign = 'center';
        g.fillText('720-TOOTH WHEEL', wheelX, H - 12);
        g.fillText('MIRROR (8,633 m)', mirrorX - 38, beamY - 26);
        g.textAlign = 'left';
        g.fillText('EYEPIECE', 14, retY + 24);
        if (trans < 0.08) {
          g.fillStyle = '#4ade80';
          g.textAlign = 'center';
          g.fillText('ECLIPSED BY NEXT TOOTH (Δ = 0.5 TOOTH)', W * 0.58, H - 12);
        }
      } else {
        // Rømer & Io (1676)
        const sunX = W * 0.25;
        const sunY = H * 0.52;
        const orbitR = Math.min(72, H * 0.31);
        const jupX = W * 0.84;
        const jupY = H * 0.52;

        // Earth orbit ring
        g.strokeStyle = 'rgba(116,192,252,0.28)';
        g.setLineDash([4, 4]);
        g.beginPath();
        g.arc(sunX, sunY, orbitR, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);

        // Sun
        g.fillStyle = '#fbbf24';
        g.shadowBlur = 20;
        g.shadowColor = '#f59e0b';
        g.beginPath();
        g.arc(sunX, sunY, 15, 0, Math.PI * 2);
        g.fill();
        g.shadowBlur = 0;

        // Earth position at angle (0° facing Jupiter = rightmost edge of orbit)
        const rad = (romerAngleDeg * Math.PI) / 180;
        const earthX = sunX + Math.cos(rad) * orbitR;
        const earthY = sunY - Math.sin(rad) * orbitR;

        // Closest opposition ghost marker
        g.strokeStyle = 'rgba(148,163,184,0.35)';
        g.beginPath();
        g.arc(sunX + orbitR, sunY, 5, 0, Math.PI * 2);
        g.stroke();

        // Light path from Jupiter/Io to Earth
        g.strokeStyle = 'rgba(255,214,10,0.45)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(jupX, jupY);
        g.lineTo(earthX, earthY);
        g.stroke();

        const pulseFrac = (tSec * 0.45) % 1;
        const lpx = jupX + (earthX - jupX) * pulseFrac;
        const lpy = jupY + (earthY - jupY) * pulseFrac;
        g.fillStyle = '#ffe066';
        g.beginPath();
        g.arc(lpx, lpy, 4.2, 0, Math.PI * 2);
        g.fill();

        // Earth
        g.fillStyle = '#38bdf8';
        g.beginPath();
        g.arc(earthX, earthY, 8, 0, Math.PI * 2);
        g.fill();

        // Jupiter + Orbiting Io
        g.fillStyle = '#d97706';
        g.beginPath();
        g.arc(jupX, jupY, 18, 0, Math.PI * 2);
        g.fill();
        const ioAngle = tSec * 2.1;
        const ioX = jupX + Math.cos(ioAngle) * 32;
        const ioY = jupY + Math.sin(ioAngle) * 14;
        g.strokeStyle = 'rgba(255,255,255,0.22)';
        g.beginPath();
        g.ellipse(jupX, jupY, 32, 14, 0, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = '#fde047';
        g.beginPath();
        g.arc(ioX, ioY, 4, 0, Math.PI * 2);
        g.fill();

        g.fillStyle = 'rgba(226,232,240,0.82)';
        g.font = '700 9px "Space Mono", monospace';
        g.textAlign = 'center';
        g.fillText('SUN', sunX, sunY + 28);
        g.fillText('EARTH', earthX, earthY - 12);
        g.fillText('JUPITER & IO', jupX, jupY + 34);
      }
    }

    function animateMeasLab(ts) {
      drawMeasLab(ts);
      if (!reduceMotion.matches && measCanvas) SimKit.frame('#sol-fizeau-canvas', animateMeasLab);
    }

    if (measCanvas && measSlider) {
      measTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          measMode = tab.dataset.measMode;
          measTabs.forEach((t) => {
            const active = t.dataset.measMode === measMode;
            t.classList.toggle('active', active);
            t.setAttribute('aria-selected', active ? 'true' : 'false');
          });
          if (measMode === 'fizeau') {
            if (measDesc) measDesc.innerHTML = '<strong>Fizeau (1849):</strong> Light passes through a gap in a 720-tooth wheel, travels <strong>D = 8,633 m</strong> to a distant mirror and back (17,266 m round-trip). Tune the wheel frequency until returning pulses hit the very next tooth (first eclipse).';
            if (measSliderLbl) measSliderLbl.textContent = 'Wheel rotation frequency (rev/s)';
            measSlider.min = '1';
            measSlider.max = '30';
            measSlider.step = '0.02';
            measSlider.value = String(fizeauFreq);
          } else {
            if (measDesc) measDesc.innerHTML = '<strong>Rømer (1676):</strong> As Earth moves around the Sun from closest approach (0°) to the far side of its orbit (180°), eclipses of Jupiter\'s moon Io arrive cumulatively <strong>~16.6 min late</strong> because light must cross Earth\'s 2 AU orbital diameter.';
            if (measSliderLbl) measSliderLbl.textContent = 'Earth orbital separation from Jupiter opposition (°)';
            measSlider.min = '0';
            measSlider.max = '180';
            measSlider.step = '1';
            measSlider.value = String(romerAngleDeg);
          }
          syncMeasUI();
          if (reduceMotion.matches) drawMeasLab(0);
        });
      });

      measSlider.addEventListener('input', () => {
        if (measMode === 'fizeau') fizeauFreq = Number(measSlider.value);
        else romerAngleDeg = Number(measSlider.value);
        syncMeasUI();
        if (reduceMotion.matches) drawMeasLab(0);
      });
      syncMeasUI();
      animateMeasLab(performance.now());
    }

    /* ── 10. Hopper Nanosecond & GPS Engineering Bench ── */
    const BENCH_DATA = {
      cpu: { time: '0.333 ns', dist: '9.99 cm', med: '6.66 cm', impact: 'Chip die diameter floor',
        note: 'Forces 3 GHz logic units onto tiny silicon dies so signals cross inside one clock tick.' },
      hopper: { time: '1.00 ns', dist: '29.98 cm (11.8 in)', med: '20.0 cm', impact: 'Grace Hopper’s wire length',
        note: 'Distributed to Pentagon admirals to make one-billionth-of-a-second latency concrete.' },
      fiber: { time: '27.5 ms', dist: '8,244 km (vac)', med: '5,500 km (NYC–LDN)', impact: 'Subsea cable delay floor',
        note: 'Glass refractive index (n ≈ 1.50) slows light to ~200,000 km/s across transatlantic links.' },
      gps: { time: '+38.6 μs / day', dist: '11.57 km drift', med: '7.7 km (in fiber eq.)', impact: 'SR (−7.2) + GR (+45.8) offset',
        note: 'Without atomic clock relativity corrections, GPS coordinates would drift ~11.6 km per day.' },
      micro: { time: '1,000 ns (1 μs)', dist: '299.8 m (984 ft)', med: '200 m', impact: 'Hopper microsecond coil',
        note: 'Explains why millimeter-scale PCB traces save hundreds of clock cycles over long cables.' }
    };

    const benchTabs = document.querySelectorAll('.sol-bench-tab[data-bench]');
    function updateBench(key) {
      const d = BENCH_DATA[key];
      if (!d) return;
      benchTabs.forEach((b) => {
        const active = b.dataset.bench === key;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      const vBar = document.getElementById('sol-bench-bar-vac');
      const mBar = document.getElementById('sol-bench-bar-med');
      if (vBar) vBar.style.width = '100%';
      if (mBar) mBar.style.width = '67%';
      const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setTxt('sol-bench-val-vac', d.dist);
      setTxt('sol-bench-val-med', d.med);
      setTxt('sol-bench-time', d.time);
      setTxt('sol-bench-dist', d.dist);
      setTxt('sol-bench-impact', d.impact);
      setTxt('sol-bench-impact-note', d.note);
    }
    benchTabs.forEach((b) => b.addEventListener('click', () => updateBench(b.dataset.bench)));
    updateBench('cpu');

    /* ── 11. Practice Problems + Conceptual Review ──── */
    window.solCheck = function (num, correct, tol) {
      const input = document.getElementById('sans-' + num);
      const fb = document.getElementById('sfb-' + num);
      const hint = document.getElementById('shint-' + num);
      if (!input || !fb) return;
      const val = parseFloat(input.value);

      fb.className = 'sol-feedback';
      if (isNaN(val)) { fb.textContent = 'Enter a number.'; fb.classList.add('wrong'); return; }

      if (Math.abs(val - correct) <= tol) {
        fb.textContent = '✓ Correct!';
        fb.classList.add('correct');
        if (hint) hint.classList.remove('visible');
        input.style.borderColor = '#34c759';
      } else {
        fb.textContent = '✗ Try again';
        fb.classList.add('wrong');
        if (hint) hint.classList.add('visible');
        input.style.borderColor = '#ff3b30';
      }
    };

    document.querySelectorAll('.sol-ans-input').forEach((inp) => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const btn = inp.parentElement && inp.parentElement.querySelector('.sol-check-btn');
          if (btn) btn.click();
        }
      });
    });

    document.querySelectorAll('#sol-review .sol-review-q').forEach((qEl) => {
      const opts = qEl.querySelectorAll('.sol-review-opt');
      const fb = qEl.querySelector('.sol-review-fb');
      opts.forEach((btn) => {
        btn.addEventListener('click', () => {
          opts.forEach((b) => b.classList.remove('correct', 'wrong'));
          const ok = btn.dataset.correct === 'true';
          btn.classList.add(ok ? 'correct' : 'wrong');
          if (fb) {
            fb.className = `sol-review-fb ${ok ? 'correct' : 'wrong'}`;
            fb.textContent = btn.dataset.why || '';
          }
        });
      });
    });

    const synthBtn = document.getElementById('sol-synthesis-check');
    const synthInput = document.getElementById('sol-synthesis-input');
    const synthFb = document.getElementById('sol-synthesis-fb');
    if (synthBtn && synthInput && synthFb) {
      synthBtn.addEventListener('click', () => {
        const text = synthInput.value.toLowerCase();
        const hasVacuum = /\b(vacuum|maxwell|invari[a-z]*|constant|frame|same speed)\b/.test(text);
        const hasMedium = /\b(medium|media|matter|water|glass|diamond|refractive|phase|wavelength|frequency)\b/.test(text) || text.includes('c/n');
        const hasConseq = /\b(cone|causal[a-z]*|dilation|gamma|gps|chip|silicon|nanosecond|fiber|lookback|telemetry)\b/.test(text) || text.includes('γ');
        const score = (hasVacuum ? 1 : 0) + (hasMedium ? 1 : 0) + (hasConseq ? 1 : 0);

        synthFb.className = 'sol-feedback';
        if (text.trim().length < 25) {
          synthFb.textContent = 'Write 2–4 full sentences first.';
          synthFb.classList.add('wrong');
        } else if (score === 3) {
          synthFb.textContent = '✓ Strong synthesis — connects vacuum c, c/n in matter, and real-world limits!';
          synthFb.classList.add('correct');
        } else {
          const missing = [];
          if (!hasVacuum) missing.push('vacuum constancy (c)');
          if (!hasMedium) missing.push('medium speed (c/n or n)');
          if (!hasConseq) missing.push('a consequence (light cones, γ, GPS, or chip latency)');
          synthFb.textContent = `Good start — also weave in: ${missing.join(', ')}.`;
          synthFb.classList.add('wrong');
        }
      });
    }

    window.addEventListener('resize', () => {
      if (!isAnimating) syncSimIdleUI();
      drawEnergyGraph(currentBeta);
      if (reduceMotion.matches) {
        drawLightClock(currentBeta, 0);
        drawMediumLab(0);
        drawMeasLab(0);
      }
      updateSpacetimeInspector();
    });
  })();
