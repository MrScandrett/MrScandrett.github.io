import {
  MarsLanderGame,
  MARS_SITES,
  WORLDS,
  SAFE_LIMITS,
  BRAKING_TARGET_VSPD,
} from './mars-rover-lander-engine.mjs';

(function () {
  const canvas = document.getElementById('mrl-canvas');
  if (!canvas) return;

  const dom = {
    siteChips: document.getElementById('mrl-site-chips'),
    siteSelect: document.getElementById('mrl-site-select'),
    siteDesc: document.getElementById('mrl-site-desc'),
    worldBtns: [...document.querySelectorAll('[data-world]')],
    worldDesc: document.getElementById('mrl-world-desc'),
    windSlider: document.getElementById('mrl-wind-slider'),
    windVal: document.getElementById('mrl-wind-val'),
    windRandom: document.getElementById('mrl-wind-random'),
    fuelSlider: document.getElementById('mrl-fuel-slider'),
    fuelVal: document.getElementById('mrl-fuel-val'),
    toggleArc: document.getElementById('mrl-toggle-arc'),
    toggleVec: document.getElementById('mrl-toggle-vec'),
    toggleBrake: document.getElementById('mrl-toggle-brake'),
    toggleSas: document.getElementById('mrl-toggle-sas'),
    toggleMute: document.getElementById('mrl-toggle-mute'),
    btnLaunchTop: document.getElementById('mrl-launch-top'),
    btnRestart: document.getElementById('mrl-restart-btn'),
    btnPause: document.getElementById('mrl-pause-btn'),
    btnAuto: document.getElementById('mrl-autopilot-btn'),
    btnSound: document.getElementById('mrl-sound-btn'),
    btnSas: document.getElementById('mrl-sas-btn'),
    btnArc: document.getElementById('mrl-arc-btn'),
    overlay: document.getElementById('mrl-overlay'),
    overlayBadge: document.getElementById('mrl-overlay-badge'),
    overlayTitle: document.getElementById('mrl-overlay-title'),
    overlayDesc: document.getElementById('mrl-overlay-desc'),
    overlayStats: document.getElementById('mrl-overlay-stats'),
    overlayTip: document.getElementById('mrl-overlay-tip'),
    overlayPrimary: document.getElementById('mrl-overlay-primary'),
    overlaySecondary: document.getElementById('mrl-overlay-secondary'),
    logBody: document.getElementById('mrl-flight-log'),
    logAttempts: document.getElementById('mrl-log-attempts'),
    logSafe: document.getElementById('mrl-log-safe'),
    logBestFuel: document.getElementById('mrl-log-best-fuel'),
    clearLog: document.getElementById('mrl-clear-log'),
    chart: document.getElementById('mrl-chart'),
    chartTitle: document.getElementById('mrl-chart-title'),
    chartNote: document.getElementById('mrl-chart-note'),
    logTab: document.querySelector('.ll-tab[data-pane="mrl-log-pane"]'),
    announcer: document.getElementById('mrl-announcer'),
  };

  let attemptCount = 0;
  let safeCount = 0;
  let bestFuel = null;
  let startWindSnapshot = 0;
  let flights = [];
  let shownFlight = null;

  function populateSites() {
    if (dom.siteChips) {
      dom.siteChips.replaceChildren();
      for (const site of MARS_SITES) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mrl-chip';
        btn.dataset.site = site.id;
        btn.textContent = site.name.replace(' Planitia', '').replace(' Ice Plains', '');
        btn.title = `${site.name} (${site.subtitle}) — ${site.tier}`;
        btn.addEventListener('click', () => selectSite(site.id, false));
        dom.siteChips.appendChild(btn);
      }
    }
    if (dom.siteSelect) {
      dom.siteSelect.replaceChildren();
      for (const site of MARS_SITES) {
        const opt = document.createElement('option');
        opt.value = site.id;
        opt.textContent = `${site.name} (${site.tier})`;
        dom.siteSelect.appendChild(opt);
      }
      dom.siteSelect.addEventListener('change', () => selectSite(dom.siteSelect.value, false));
    }
  }

  function formatWindText(val) {
    if (Math.abs(val) < 0.05) return '0.0 m/s';
    return `${val > 0 ? '→' : '←'} ${Math.abs(val).toFixed(1)} m/s`;
  }

  function syncUi(state) {
    const { site, world, options, env } = state;

    if (dom.siteChips) {
      dom.siteChips.querySelectorAll('[data-site]').forEach((btn) => {
        btn.setAttribute('aria-pressed', btn.dataset.site === site.id ? 'true' : 'false');
      });
    }
    if (dom.siteSelect && dom.siteSelect.value !== site.id) {
      dom.siteSelect.value = site.id;
    }
    if (dom.siteDesc) {
      dom.siteDesc.textContent = `${site.subtitle} · ${site.description}`;
    }

    dom.worldBtns.forEach((btn) => {
      btn.setAttribute('aria-pressed', btn.dataset.world === world.id ? 'true' : 'false');
    });
    if (dom.worldDesc) {
      dom.worldDesc.textContent = world.subtitle;
    }

    const isVacuum = world.dragCoeff <= 0;
    if (dom.windRandom) dom.windRandom.disabled = isVacuum;
    if (dom.windSlider) {
      dom.windSlider.disabled = isVacuum || Boolean(dom.windRandom?.checked);
      if (dom.windVal) {
        dom.windVal.textContent = isVacuum ? 'Vacuum (0)' : dom.windRandom?.checked ? `Auto (${formatWindText(env.baseWind)})` : formatWindText(Number(dom.windSlider.value));
      }
    }

    if (dom.fuelVal && dom.fuelSlider) {
      dom.fuelVal.textContent = `${dom.fuelSlider.value}%`;
    }

    if (dom.toggleArc) dom.toggleArc.checked = options.showTrajectory;
    if (dom.toggleVec) dom.toggleVec.checked = options.showVector;
    if (dom.toggleBrake) dom.toggleBrake.checked = options.showBrakingGuide;
    if (dom.toggleSas) dom.toggleSas.checked = options.sasEnabled;
    if (dom.toggleMute) dom.toggleMute.checked = !options.muted;

    if (dom.btnSound) {
      dom.btnSound.setAttribute('aria-pressed', options.muted ? 'false' : 'true');
      dom.btnSound.textContent = options.muted ? 'Audio: Off' : 'Audio: On';
    }
    if (dom.btnSas) {
      dom.btnSas.setAttribute('aria-pressed', options.sasEnabled ? 'true' : 'false');
      dom.btnSas.textContent = options.sasEnabled ? 'SAS: On' : 'SAS: Off';
    }
    if (dom.btnArc) {
      dom.btnArc.setAttribute('aria-pressed', options.showTrajectory ? 'true' : 'false');
      dom.btnArc.textContent = options.showTrajectory ? 'Arc: On' : 'Arc: Off';
    }
    if (dom.btnPause) {
      dom.btnPause.disabled = state.state !== 'playing' && state.state !== 'paused';
      dom.btnPause.textContent = state.state === 'paused' ? 'Resume' : 'Pause';
    }
    if (dom.btnAuto) {
      const flying = state.state === 'playing' && state.autopilot;
      dom.btnAuto.setAttribute('aria-pressed', flying ? 'true' : 'false');
      dom.btnAuto.textContent = flying ? 'Autopilot: flying' : 'Watch Autopilot';
    }
    if (dom.btnLaunchTop) {
      dom.btnLaunchTop.textContent = state.state === 'ready' ? 'Launch' : 'Restart';
    }

    renderOverlay(state);
  }

  function renderOverlay(state) {
    if (!dom.overlay) return;
    if (state.state === 'playing') {
      dom.overlay.hidden = true;
      dom.overlay.classList.remove('mrl-overlay-top');
      return;
    }

    dom.overlay.hidden = false;
    dom.overlayStats.replaceChildren();
    dom.overlayPrimary.parentElement.querySelectorAll('button:not([id])').forEach((b) => b.remove());
    dom.overlayTip.hidden = true;
    dom.overlaySecondary.hidden = true;

    if (state.state === 'ready') {
      dom.overlay.classList.remove('mrl-overlay-top');
      dom.overlayBadge.textContent = `${state.site.tier} · ${state.site.subtitle}`;
      dom.overlayBadge.className = 'mrl-badge mrl-badge-ready';
      dom.overlayTitle.textContent = `${state.site.name} (${state.world.name})`;
      dom.overlayDesc.textContent = state.site.description;
      addStat('Gravity', `${state.world.gravity.toFixed(2)} m/s²`);
      addStat('Wind', state.world.dragCoeff <= 0 ? 'Vacuum' : formatWindText(state.env.baseWind));
      addStat('Safe V-SPD', `< ${SAFE_LIMITS.vspd.toFixed(1)} m/s`);
      addStat('Safe Tilt', `≤ ${SAFE_LIMITS.tilt.toFixed(0)}°`);
      dom.overlayPrimary.textContent = 'Launch Descent';
      dom.overlayPrimary.onclick = () => {
        startWindSnapshot = game.getState().env.baseWind;
        game.launch();
      };
      dom.overlaySecondary.hidden = false;
      dom.overlaySecondary.textContent = 'Watch Autopilot';
      dom.overlaySecondary.onclick = () => flyAutopilot();
      return;
    }

    if (state.state === 'paused') {
      dom.overlay.classList.remove('mrl-overlay-top');
      dom.overlayBadge.textContent = 'PAUSED';
      dom.overlayBadge.className = 'mrl-badge mrl-badge-ready';
      dom.overlayTitle.textContent = 'Simulation Paused';
      dom.overlayDesc.textContent = 'Press P or click Resume to continue your descent.';
      dom.overlayPrimary.textContent = 'Resume';
      dom.overlayPrimary.onclick = () => game.togglePause();
      dom.overlaySecondary.hidden = false;
      dom.overlaySecondary.textContent = 'Restart';
      dom.overlaySecondary.onclick = () => restartMission();
      return;
    }

    if (state.state === 'landed' && state.outcome) {
      dom.overlay.classList.add('mrl-overlay-top');
      const { snapshot, pad } = state.outcome;
      const score = state.scoreBreakdown;
      dom.overlayBadge.textContent = `${'★'.repeat(score.stars)}${'☆'.repeat(3 - score.stars)} · ${score.grade}`;
      dom.overlayBadge.className = 'mrl-badge mrl-badge-safe';
      dom.overlayTitle.textContent = 'Touchdown Confirmed!';
      dom.overlayDesc.textContent = `Landed on ${pad.label} (${pad.multiplier}×) · Score ${score.total.toLocaleString()}`;
      addStat('V-SPD', `${snapshot.vspd.toFixed(1)} m/s`, true);
      addStat('H-SPD', `${snapshot.hspd.toFixed(1)} m/s`, true);
      addStat('Tilt', `${snapshot.tilt.toFixed(1)}°`, true);
      addStat('Fuel Left', `${snapshot.fuel.toFixed(1)}%`, true);

      const idx = MARS_SITES.findIndex((s) => s.id === state.site.id);
      const nextSite = MARS_SITES[(idx + 1) % MARS_SITES.length];
      dom.overlayPrimary.textContent = `Next: ${nextSite.name}`;
      dom.overlayPrimary.onclick = () => selectSite(nextSite.id, true);
      dom.overlaySecondary.hidden = false;
      dom.overlaySecondary.textContent = 'Fly Again (R)';
      dom.overlaySecondary.onclick = () => restartMission();
      addGraphLink();
      if (state.autopilotFlew) dom.overlayDesc.textContent += state.autopilot ? ' · flown by the autopilot' : ' · autopilot, then you';
      return;
    }

    if (state.state === 'crashed' && state.outcome) {
      dom.overlay.classList.remove('mrl-overlay-top');
      const { snapshot, headline, causes, tip } = state.outcome;
      dom.overlayBadge.textContent = 'MISSION LOST';
      dom.overlayBadge.className = 'mrl-badge mrl-badge-crash';
      dom.overlayTitle.textContent = headline;
      dom.overlayDesc.textContent = causes[0] || 'Impact exceeded safe structural limits.';
      addStat('V-SPD', `${snapshot.vspd.toFixed(1)} m/s`, snapshot.vspd < SAFE_LIMITS.vspd);
      addStat('H-SPD', `${snapshot.hspd.toFixed(1)} m/s`, snapshot.hspd < SAFE_LIMITS.hspd);
      addStat('Tilt', `${snapshot.tilt.toFixed(1)}°`, snapshot.tilt <= SAFE_LIMITS.tilt);
      addStat('Fuel Left', `${snapshot.fuel.toFixed(1)}%`);
      dom.overlayTip.hidden = false;
      dom.overlayTip.textContent = `Flight Tip: ${tip}`;
      dom.overlayPrimary.textContent = 'Retry Descent (R)';
      dom.overlayPrimary.onclick = () => restartMission();
      addGraphLink();
      if (state.autopilot) {
        dom.overlayTip.textContent = state.world.id === 'earth'
          ? 'Even the autopilot cannot land this lander on Earth: its full thrust is barely more than Earth\'s gravity, so hovering burns fuel almost as fast as full power.'
          : 'The autopilot ran out of options here (usually fuel against strong wind). Can you do better?';
      }
    }
  }

  function addGraphLink() {
    if (!dom.chart || !flights.length) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mrl-btn';
    btn.textContent = 'Flight graph';
    btn.addEventListener('click', () => dom.logTab?.click());
    dom.overlayPrimary.parentElement.appendChild(btn);
  }

  function addStat(label, value, ok = null) {
    const item = document.createElement('div');
    item.className = 'mrl-stat';
    if (ok === true) item.classList.add('is-ok');
    if (ok === false) item.classList.add('is-bad');
    const lbl = document.createElement('span');
    lbl.textContent = label;
    const val = document.createElement('strong');
    val.textContent = value;
    item.append(lbl, val);
    dom.overlayStats.appendChild(item);
  }

  function recordOutcome({ outcome, scoreBreakdown, state, trace }) {
    attemptCount += 1;
    if (outcome.safe) {
      safeCount += 1;
      if (bestFuel === null || outcome.snapshot.fuel > bestFuel) {
        bestFuel = outcome.snapshot.fuel;
      }
    }

    if (dom.logAttempts) dom.logAttempts.textContent = String(attemptCount);
    if (dom.logSafe) dom.logSafe.textContent = String(safeCount);
    if (dom.logBestFuel) dom.logBestFuel.textContent = bestFuel === null ? '–' : `${bestFuel.toFixed(1)}%`;

    if (dom.logBody) {
      const empty = dom.logBody.querySelector('.mrl-log-empty');
      if (empty) empty.remove();
      const row = document.createElement('tr');
      row.className = outcome.safe ? 'is-safe' : 'is-crash';
      row.dataset.flight = String(attemptCount);
      const snap = outcome.snapshot;
      const cells = [
        String(attemptCount),
        `${state.site.name.split(' ')[0]} (${state.world.name})`,
        state.world.dragCoeff <= 0 ? '0.0' : formatWindText(startWindSnapshot || snap.wind),
        `${snap.vspd.toFixed(1)}`,
        `${snap.hspd.toFixed(1)}`,
        `${snap.tilt.toFixed(1)}°`,
        `${snap.fuel.toFixed(0)}%`,
        (outcome.safe ? `SAFE ${'★'.repeat(scoreBreakdown.stars)}` : outcome.headline) + pilotTag(state),
      ];
      cells.forEach((text, i) => {
        const td = document.createElement('td');
        if (i === 0) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'mrl-row-btn';
          btn.textContent = text;
          btn.setAttribute('aria-label', `Show the graph of flight ${text}`);
          btn.addEventListener('click', () => showFlight(Number(text)));
          td.appendChild(btn);
        } else {
          td.textContent = text;
        }
        row.appendChild(td);
      });
      dom.logBody.prepend(row);
    }

    flights.push({
      n: attemptCount,
      site: state.site.name,
      world: state.world,
      safe: outcome.safe,
      headline: (outcome.safe ? `Safe landing ${'★'.repeat(scoreBreakdown.stars)}` : outcome.headline) + pilotTag(state),
      trace: Array.isArray(trace) ? trace : [],
    });
    if (flights.length > 30) flights.shift();
    showFlight(attemptCount);

    if (dom.announcer) {
      dom.announcer.textContent = outcome.safe
        ? `Touchdown confirmed at ${state.site.name}. Fuel remaining ${outcome.snapshot.fuel.toFixed(1)} percent.`
        : `${outcome.headline}. ${outcome.tip}`;
    }
  }

  function pilotTag(state) {
    if (!state.autopilotFlew) return '';
    return state.autopilot ? ' (autopilot)' : ' (took over)';
  }

  function flyAutopilot() {
    game.flyAutopilot(currentMissionOpts(true));
    startWindSnapshot = game.getState().env.baseWind;
  }

  function currentMissionOpts(autoLaunch) {
    const useAutoWind = dom.windRandom ? dom.windRandom.checked : true;
    const customWind = useAutoWind || !dom.windSlider ? null : Number(dom.windSlider.value);
    const fuelMultiplier = dom.fuelSlider ? Number(dom.fuelSlider.value) / 100 : 1.0;
    return { customWind, fuelMultiplier, autoLaunch };
  }

  function selectSite(siteId, autoLaunch = false) {
    game.loadMission({ ...currentMissionOpts(autoLaunch), siteId });
    startWindSnapshot = game.getState().env.baseWind;
  }

  function selectWorld(worldId) {
    game.loadMission({ ...currentMissionOpts(false), worldId });
    startWindSnapshot = game.getState().env.baseWind;
  }

  function restartMission() {
    game.restart(currentMissionOpts(true));
    startWindSnapshot = game.getState().env.baseWind;
  }

  // ── Flight graph ─────────────────────────────────────────────────────
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs, text) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    if (text != null) el.textContent = text;
    return el;
  }

  function niceMax(v, step) {
    return Math.max(step, Math.ceil(v / step) * step);
  }

  // Where did the student start braking, and when was the last moment a full burn could still work?
  function analyseFlight(trace) {
    let firstBurn = null;
    let lastChance = null;
    for (const s of trace) {
      if (!firstBurn && s.throttle >= 0.5) firstBurn = s;
      if (!lastChance && s.alt > 0 && s.vspd > BRAKING_TARGET_VSPD && (s.stopDist == null || s.stopDist >= s.alt)) {
        lastChance = s;
      }
    }
    return { firstBurn, lastChance };
  }

  function showFlight(n) {
    if (!dom.chart) return;
    shownFlight = n;
    dom.logBody?.querySelectorAll('tr[data-flight]').forEach((tr) => {
      tr.classList.toggle('is-shown', Number(tr.dataset.flight) === n);
    });
    const flight = flights.find((f) => f.n === n);
    dom.chart.replaceChildren();
    if (!flight || flight.trace.length < 2) {
      if (dom.chartTitle) dom.chartTitle.textContent = 'Flight graph';
      if (dom.chartNote) dom.chartNote.textContent = 'Land (or crash) once and your altitude, stopping distance and descent speed appear here.';
      dom.chart.setAttribute('hidden', '');
      return;
    }
    dom.chart.removeAttribute('hidden');
    drawFlight(flight);
  }

  function drawFlight(flight) {
    const { trace } = flight;
    const W = 300;
    const left = 30;
    const right = W - 8;
    const top1 = 14;
    const h1 = 104;
    const top2 = top1 + h1 + 26;
    const h2 = 70;
    const H = top2 + h2 + 22;
    const tMax = Math.max(1, trace[trace.length - 1].t);
    const altMax = niceMax(Math.max(...trace.map((s) => s.alt)), 20);
    const vMax = niceMax(Math.max(SAFE_LIMITS.vspd + 1, ...trace.map((s) => Math.abs(s.vspd))), 5);
    const vMin = Math.min(0, ...trace.map((s) => s.vspd));
    const vLo = vMin < 0 ? -niceMax(-vMin, 5) : 0;
    const xOf = (t) => left + ((right - left) * t) / tMax;
    const y1Of = (a) => top1 + h1 - (h1 * Math.min(a, altMax)) / altMax;
    const y2Of = (v) => top2 + h2 - (h2 * (v - vLo)) / (vMax - vLo);

    const svg = dom.chart;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('aria-label', `Flight ${flight.n} at ${flight.site} on ${flight.world.name}: ${flight.headline}. Altitude, stopping distance and descent speed over ${tMax.toFixed(1)} seconds.`);

    // Panel frames, gridlines and labels
    const axis = (y, label) => {
      svg.append(svgEl('line', { x1: left, x2: right, y1: y, y2: y, class: 'mrl-ch-grid' }));
      svg.append(svgEl('text', { x: left - 4, y: y + 3, class: 'mrl-ch-tick', 'text-anchor': 'end' }, label));
    };
    for (let a = 0; a <= altMax; a += altMax / 4) axis(y1Of(a), Math.round(a));
    const vStep = vMax - vLo > 20 ? 10 : 5;
    for (let v = vLo; v <= vMax + 1e-6; v += vStep) axis(y2Of(v), v);
    svg.append(svgEl('text', { x: left, y: top1 - 4, class: 'mrl-ch-head' }, 'Altitude & stopping distance (m)'));
    svg.append(svgEl('text', { x: left, y: top2 - 4, class: 'mrl-ch-head' }, 'Descent speed (m/s, down is +)'));
    const tStep = tMax > 40 ? 10 : tMax > 16 ? 5 : 2;
    for (let t = 0; t <= tMax + 1e-6; t += tStep) {
      svg.append(svgEl('text', { x: xOf(t), y: top2 + h2 + 12, class: 'mrl-ch-tick', 'text-anchor': 'middle' }, `${t}s`));
    }

    // Throttle shading behind the altitude panel
    for (let i = 1; i < trace.length; i++) {
      const s = trace[i - 1];
      if (s.throttle < 0.05) continue;
      svg.append(svgEl('rect', {
        x: xOf(s.t), y: top1, width: Math.max(0.6, xOf(trace[i].t) - xOf(s.t)), height: h1,
        class: 'mrl-ch-burn', 'fill-opacity': (0.08 + 0.22 * s.throttle).toFixed(2),
      }));
    }

    // Safe touchdown band
    svg.append(svgEl('rect', {
      x: left, width: right - left, y: y2Of(SAFE_LIMITS.vspd), height: y2Of(Math.max(vLo, 0)) - y2Of(SAFE_LIMITS.vspd),
      class: 'mrl-ch-safe',
    }));
    svg.append(svgEl('text', { x: right - 2, y: y2Of(SAFE_LIMITS.vspd) + 9, class: 'mrl-ch-tick mrl-ch-safe-label', 'text-anchor': 'end' }, `safe < ${SAFE_LIMITS.vspd}`));

    const line = (pts, cls) => {
      if (pts.length < 2) return;
      svg.append(svgEl('polyline', { points: pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), class: cls }));
    };
    line(trace.map((s) => [xOf(s.t), y1Of(s.alt)]), 'mrl-ch-alt');
    line(trace.filter((s) => s.stopDist != null && s.stopDist > 0).map((s) => [xOf(s.t), y1Of(s.stopDist)]), 'mrl-ch-stop');
    line(trace.map((s) => [xOf(s.t), y2Of(s.vspd)]), 'mrl-ch-v');

    const { firstBurn, lastChance } = analyseFlight(trace);
    const marker = (s, cls, label, row) => {
      const x = xOf(s.t);
      svg.append(svgEl('line', { x1: x, x2: x, y1: top1, y2: top2 + h2, class: `mrl-ch-mark ${cls}` }));
      // Labels sit left of their line when there is no room on the right.
      const anchor = x > right - 50 ? 'end' : 'start';
      svg.append(svgEl('text', { x: x + (anchor === 'end' ? -3 : 3), y: top1 + 10 + row * 10, class: `mrl-ch-tick ${cls}`, 'text-anchor': anchor }, label));
    };
    if (firstBurn) marker(firstBurn, 'mrl-ch-mark-burn', 'burn', 0);
    if (lastChance) marker(lastChance, 'mrl-ch-mark-late', 'last chance', firstBurn ? 1 : 0);

    const end = trace[trace.length - 1];
    svg.append(svgEl('circle', { cx: xOf(end.t), cy: y2Of(end.vspd), r: 3, class: flight.safe ? 'mrl-ch-end-ok' : 'mrl-ch-end-bad' }));

    // Legend
    const legend = [['mrl-ch-alt', 'altitude'], ['mrl-ch-stop', 'stopping distance'], ['mrl-ch-v', 'descent speed']];
    let lx = left;
    legend.forEach(([cls, label]) => {
      svg.append(svgEl('line', { x1: lx, x2: lx + 12, y1: H - 3, y2: H - 3, class: cls }));
      const t = svgEl('text', { x: lx + 15, y: H, class: 'mrl-ch-tick' }, label);
      svg.append(t);
      lx += 22 + label.length * 4.6;
    });

    if (dom.chartTitle) dom.chartTitle.textContent = `Flight ${flight.n} · ${flight.site.split(' ')[0]} (${flight.world.name}) · ${flight.headline}`;
    if (dom.chartNote) {
      let note;
      if (lastChance && flight.safe) {
        note = `Close call: your stopping distance reached your altitude at ${lastChance.t.toFixed(1)} s (${Math.round(lastChance.alt)} m up), right at the edge of what a full burn can save. Burning that late saves the most fuel, with no room for error.`;
      } else if (lastChance && firstBurn && firstBurn.t >= lastChance.t) {
        note = `You fired at ${firstBurn.t.toFixed(1)} s, ${Math.round(firstBurn.alt)} m up, but the stopping distance had already reached your altitude at ${lastChance.t.toFixed(1)} s (${Math.round(lastChance.alt)} m). Start the burn before the dashed line meets the solid one.`;
      } else if (lastChance && !firstBurn) {
        note = `The stopping distance caught up with your altitude at ${lastChance.t.toFixed(1)} s (${Math.round(lastChance.alt)} m up). After that point even a full burn could not slow you below ${BRAKING_TARGET_VSPD} m/s in time.`;
      } else if (firstBurn && lastChance) {
        note = `You started braking at ${firstBurn.t.toFixed(1)} s, ${Math.round(firstBurn.alt)} m up, but later let the stopping distance catch your altitude (${lastChance.t.toFixed(1)} s, ${Math.round(lastChance.alt)} m). Look for where the two lines meet.`;
      } else if (firstBurn) {
        note = `You started braking at ${firstBurn.t.toFixed(1)} s, ${Math.round(firstBurn.alt)} m up, and the stopping distance never reached your altitude. Braking later, closer to where the lines would meet, saves fuel; braking after it fails.`;
      } else {
        note = 'You never fired the main engine. Gravity added speed the whole way down: the descent-speed line climbs in a straight line, a slope of g.';
      }
      dom.chartNote.textContent = note;
    }
  }

  populateSites();

  const game = new MarsLanderGame(canvas, {
    siteId: 'jezero',
    worldId: 'mars',
    showTrajectory: true,
    showVector: true,
    showBrakingGuide: true,
    sasEnabled: true,
    onStateChange: syncUi,
    onOutcome: recordOutcome,
  });
  startWindSnapshot = game.getState().env.baseWind;

  // Bind controls
  dom.worldBtns.forEach((btn) => {
    btn.addEventListener('click', () => selectWorld(btn.dataset.world));
  });

  dom.windRandom?.addEventListener('change', () => {
    game.loadMission(currentMissionOpts(false));
    startWindSnapshot = game.getState().env.baseWind;
  });

  dom.windSlider?.addEventListener('input', () => {
    if (dom.windRandom) dom.windRandom.checked = false;
    game.loadMission(currentMissionOpts(false));
    startWindSnapshot = game.getState().env.baseWind;
  });

  dom.fuelSlider?.addEventListener('input', () => {
    if (dom.fuelVal) dom.fuelVal.textContent = `${dom.fuelSlider.value}%`;
  });
  dom.fuelSlider?.addEventListener('change', () => {
    game.loadMission(currentMissionOpts(false));
  });

  dom.toggleArc?.addEventListener('change', () => game.setOption('showTrajectory', dom.toggleArc.checked));
  dom.toggleVec?.addEventListener('change', () => game.setOption('showVector', dom.toggleVec.checked));
  dom.toggleBrake?.addEventListener('change', () => game.setOption('showBrakingGuide', dom.toggleBrake.checked));
  dom.toggleSas?.addEventListener('change', () => game.setOption('sasEnabled', dom.toggleSas.checked));
  dom.toggleMute?.addEventListener('change', () => game.setOption('muted', !dom.toggleMute.checked));

  dom.btnLaunchTop?.addEventListener('click', () => {
    if (game.getState().state === 'ready') {
      startWindSnapshot = game.getState().env.baseWind;
      game.launch();
    } else {
      restartMission();
    }
  });
  dom.btnRestart?.addEventListener('click', restartMission);
  dom.btnAuto?.addEventListener('click', () => {
    const st = game.getState();
    if (st.state === 'playing' && st.autopilot) game.takeOver();
    else flyAutopilot();
  });
  dom.btnPause?.addEventListener('click', () => game.togglePause());
  dom.btnSound?.addEventListener('click', () => game.setOption('muted', !game.getState().options.muted));
  dom.btnSas?.addEventListener('click', () => game.setOption('sasEnabled', !game.getState().options.sasEnabled));
  dom.btnArc?.addEventListener('click', () => game.setOption('showTrajectory', !game.getState().options.showTrajectory));

  dom.clearLog?.addEventListener('click', () => {
    attemptCount = 0;
    safeCount = 0;
    bestFuel = null;
    if (dom.logAttempts) dom.logAttempts.textContent = '0';
    if (dom.logSafe) dom.logSafe.textContent = '0';
    if (dom.logBestFuel) dom.logBestFuel.textContent = '–';
    if (dom.logBody) {
      dom.logBody.innerHTML = '<tr class="mrl-log-empty"><td colspan="8">Fly a descent to log your landing telemetry.</td></tr>';
    }
    flights = [];
    showFlight(null);
  });

  // Multi-touch pointer controls
  function bindTouch(id, controlName) {
    const el = document.getElementById(id);
    if (!el) return;
    const on = (e) => {
      e.preventDefault();
      el.classList.add('is-active');
      game.setControl(controlName, true);
    };
    const off = (e) => {
      e.preventDefault();
      el.classList.remove('is-active');
      game.setControl(controlName, false);
    };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
  }

  bindTouch('tc-left', 'left');
  bindTouch('tc-hover', 'hover');
  bindTouch('tc-thrust', 'thrust');
  bindTouch('tc-right', 'right');

  syncUi(game.getState());
})();
