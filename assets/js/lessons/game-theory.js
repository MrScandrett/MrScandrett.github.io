(() => {
  'use strict';

  /* ================================================================
     1. 2x2 Strategic Matrix Explorer & Solver
     ================================================================ */
  const PRESETS = {
    pd: {
      name: 'Prisoner’s Dilemma',
      story: 'Makerspace cleanup: helping costs effort, while a clean room benefits both. Temptation to hold back (5 > 3) and fear of working alone (1 > 0) collide.',
      rowTitle: 'You ↓',
      colTitle: 'Partner →',
      rows: ['Help', 'Hold back'],
      cols: ['Help', 'Hold back'],
      matrix: [
        [[3, 3], [0, 5]],
        [[5, 0], [1, 1]]
      ],
      takeaway: 'Both players have a strictly dominant action (Hold back), trapping them at (1, 1) even though mutual Help (3, 3) makes both strictly better off.'
    },
    stag: {
      name: 'Stag Hunt (Assurance Game)',
      story: 'Robotics build vs. solo worksheet: building a joint robot pays (4, 4) only if both commit. Working solo pays a guaranteed 2, even if your partner bails.',
      rowTitle: 'You ↓',
      colTitle: 'Partner →',
      rows: ['Team build', 'Solo task'],
      cols: ['Team build', 'Solo task'],
      matrix: [
        [[4, 4], [0, 3]],
        [[3, 0], [2, 2]]
      ],
      takeaway: 'Two pure Nash equilibria exist: (Team build, Team build) and (Solo task, Solo task). Greed is not the problem here—lack of mutual assurance is.'
    },
    coord: {
      name: 'Pure Coordination',
      story: 'Shared file format: neither teammate cares whether you pick Format A or Format B—only that you match each other so the project compiles.',
      rowTitle: 'You ↓',
      colTitle: 'Partner →',
      rows: ['Format A', 'Format B'],
      cols: ['Format A', 'Format B'],
      matrix: [
        [[2, 2], [0, 0]],
        [[0, 0], [2, 2]]
      ],
      takeaway: 'Both matched outcomes are Nash equilibria and Pareto efficient. A quick message or shared standard settles it because neither side gains from breaking the agreement.'
    },
    chicken: {
      name: 'Hawk–Dove / Chicken',
      story: 'Narrow bridge merge: yielding lets the other driver pass first (1, 4), yielding together shares time (2, 2), and both pushing forward crashes (-3, -3).',
      rowTitle: 'You ↓',
      colTitle: 'Other driver →',
      rows: ['Yield', 'Push forward'],
      cols: ['Yield', 'Push forward'],
      matrix: [
        [[2, 2], [1, 4]],
        [[4, 1], [-3, -3]]
      ],
      takeaway: 'Anti-coordination: the best response is the opposite of your rival. Two asymmetric pure equilibria exist, plus a risky mixed equilibrium where crashes still happen.'
    },
    zero: {
      name: 'Penalty Kick (Zero-Sum)',
      story: 'Kicker vs. goalkeeper: the kicker wants to shoot opposite the dive (+1, -1); the goalkeeper wants to match the kick (-1, +1). Total points always sum to 0.',
      rowTitle: 'Kicker ↓',
      colTitle: 'Keeper →',
      rows: ['Kick Left', 'Kick Right'],
      cols: ['Dive Left', 'Dive Right'],
      matrix: [
        [[-1, 1], [1, -1]],
        [[1, -1], [-1, 1]]
      ],
      takeaway: 'Zero pure Nash equilibria exist because any predictable pattern is exploited. Only a 50% / 50% mixed strategy prevents the opponent from gaining an edge.'
    }
  };

  function solve2x2(matrix) {
    const rowBR = [
      matrix[0][0][0] === matrix[1][0][0] ? [0, 1] : [matrix[0][0][0] > matrix[1][0][0] ? 0 : 1],
      matrix[0][1][0] === matrix[1][1][0] ? [0, 1] : [matrix[0][1][0] > matrix[1][1][0] ? 0 : 1]
    ];
    const colBR = [
      matrix[0][0][1] === matrix[0][1][1] ? [0, 1] : [matrix[0][0][1] > matrix[0][1][1] ? 0 : 1],
      matrix[1][0][1] === matrix[1][1][1] ? [0, 1] : [matrix[1][0][1] > matrix[1][1][1] ? 0 : 1]
    ];

    let rowDom = null;
    if (matrix[0][0][0] > matrix[1][0][0] && matrix[0][1][0] > matrix[1][1][0]) rowDom = 0;
    else if (matrix[1][0][0] > matrix[0][0][0] && matrix[1][1][0] > matrix[0][1][0]) rowDom = 1;

    let colDom = null;
    if (matrix[0][0][1] > matrix[0][1][1] && matrix[1][0][1] > matrix[1][1][1]) colDom = 0;
    else if (matrix[0][1][1] > matrix[0][0][1] && matrix[1][1][1] > matrix[1][0][1]) colDom = 1;

    const pureNE = [];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        if (rowBR[c].includes(r) && colBR[r].includes(c)) pureNE.push([r, c]);
      }
    }

    // Interior mixed-strategy Nash equilibrium:
    // Col mixes with prob q on Col 0 so Row is indifferent:
    // q*a00 + (1-q)*a01 = q*a10 + (1-q)*a11 => q*(a00 - a01 - a10 + a11) = a11 - a01
    const a00 = matrix[0][0][0], a01 = matrix[0][1][0], a10 = matrix[1][0][0], a11 = matrix[1][1][0];
    const b00 = matrix[0][0][1], b01 = matrix[0][1][1], b10 = matrix[1][0][1], b11 = matrix[1][1][1];
    const denomQ = (a00 - a01 - a10 + a11);
    const denomP = (b00 - b10 - b01 + b11);
    let mixed = null;
    if (denomQ !== 0 && denomP !== 0) {
      const q = (a11 - a01) / denomQ;
      const p = (b11 - b10) / denomP;
      if (p > 0 && p < 1 && q > 0 && q < 1) {
        const euRow = p * (q * a00 + (1 - q) * a01) + (1 - p) * (q * a10 + (1 - q) * a11);
        const euCol = q * (p * b00 + (1 - p) * b10) + (1 - q) * (p * b01 + (1 - p) * b11);
        mixed = { p, q, euRow, euCol };
      }
    }

    // Pareto efficiency: no other cell has >= on both and > on at least one.
    const pareto = [];
    const cells = [[0, 0], [0, 1], [1, 0], [1, 1]];
    for (const [r, c] of cells) {
      const [u1, u2] = matrix[r][c];
      const dominated = cells.some(([r2, c2]) => {
        const [v1, v2] = matrix[r2][c2];
        return v1 >= u1 && v2 >= u2 && (v1 > u1 || v2 > u2);
      });
      if (!dominated) pareto.push([r, c]);
    }

    return { rowBR, colBR, rowDom, colDom, pureNE, mixed, pareto };
  }

  (() => {
    const table = document.getElementById('matrix-table');
    if (!table) return;

    let currentPresetKey = 'pd';
    let currentGame = structuredClone(PRESETS.pd);
    let isCustom = false;
    let inspectSide = 'partner'; // 'partner' holds col fixed; 'you' holds row fixed
    let fixedIdx = 0;

    const presetButtons = document.querySelectorAll('[data-preset]');
    const sideButtons = document.querySelectorAll('[data-inspect-side]');
    const fixedButtons = document.querySelectorAll('[data-fixed-idx]');
    const storyEl = document.getElementById('preset-story');
    const bestRespEl = document.getElementById('best-response');

    const inputIds = [
      ['payoff-00-r', 'payoff-00-c'],
      ['payoff-01-r', 'payoff-01-c'],
      ['payoff-10-r', 'payoff-10-c'],
      ['payoff-11-r', 'payoff-11-c']
    ];

    function syncInputsFromMatrix() {
      const coords = [[0, 0], [0, 1], [1, 0], [1, 1]];
      coords.forEach(([r, c], idx) => {
        const elR = document.getElementById(inputIds[idx][0]);
        const elC = document.getElementById(inputIds[idx][1]);
        if (elR) elR.value = currentGame.matrix[r][c][0];
        if (elC) elC.value = currentGame.matrix[r][c][1];
      });
      const labels = [
        `${currentGame.rows[0]} / ${currentGame.cols[0]}`,
        `${currentGame.rows[0]} / ${currentGame.cols[1]}`,
        `${currentGame.rows[1]} / ${currentGame.cols[0]}`,
        `${currentGame.rows[1]} / ${currentGame.cols[1]}`
      ];
      ['custom-label-00', 'custom-label-01', 'custom-label-10', 'custom-label-11'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = labels[i];
      });
    }

    function updateInspectorControls() {
      sideButtons.forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn.dataset.inspectSide === inspectSide));
      });
      fixedButtons.forEach((btn, idx) => {
        btn.setAttribute('aria-pressed', String(idx === fixedIdx));
        if (inspectSide === 'partner') {
          btn.textContent = `Partner: ${currentGame.cols[idx]}`;
          btn.dataset.partner = idx === 0 ? 'help' : 'hold';
        } else {
          btn.textContent = `You: ${currentGame.rows[idx]}`;
        }
      });
    }

    function renderMatrix() {
      const analysis = solve2x2(currentGame.matrix);
      document.getElementById('row-player-title').textContent = currentGame.rowTitle;
      document.getElementById('col-player-title').textContent = currentGame.colTitle;
      document.getElementById('row-label-0').textContent = currentGame.rows[0];
      document.getElementById('row-label-1').textContent = currentGame.rows[1];
      document.getElementById('col-label-0').textContent = currentGame.cols[0];
      document.getElementById('col-label-1').textContent = currentGame.cols[1];
      storyEl.textContent = isCustom
        ? `Custom Payoff Matrix (based on ${currentGame.name}): edit any payoff below to test how incentives reshape equilibria.`
        : currentGame.story;

      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          const cell = table.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
          if (!cell) continue;
          const scoreEl = cell.querySelector('.gt-cell-score');
          const badgesEl = cell.querySelector('.gt-cell-badges');
          scoreEl.textContent = `${currentGame.matrix[r][c][0]}, ${currentGame.matrix[r][c][1]}`;
          badgesEl.replaceChildren();

          const isNash = analysis.pureNE.some(([nr, nc]) => nr === r && nc === c);
          const isPareto = analysis.pareto.some(([pr, pc]) => pr === r && pc === c);

          if (isNash) {
            const b = document.createElement('span');
            b.className = 'gt-badge gt-badge-nash';
            b.textContent = '★ Nash';
            badgesEl.append(b);
          }
          if (isPareto) {
            const b = document.createElement('span');
            b.className = 'gt-badge';
            b.textContent = '✓ Pareto';
            badgesEl.append(b);
          }

          const highlighted = inspectSide === 'partner' ? c === fixedIdx : r === fixedIdx;
          cell.classList.toggle('gt-selected', highlighted);
        }
      }

      // Best-response status copy
      if (inspectSide === 'partner') {
        const s0 = currentGame.matrix[0][fixedIdx][0];
        const s1 = currentGame.matrix[1][fixedIdx][0];
        const br = analysis.rowBR[fixedIdx];
        const brLabel = br.length === 2
          ? `either ${currentGame.rows[0]} or ${currentGame.rows[1]} (tie)`
          : currentGame.rows[br[0]];
        const domSuffix = analysis.rowDom !== null
          ? ` ${currentGame.rows[analysis.rowDom]} is strictly dominant in this matrix.`
          : '';
        bestRespEl.textContent = `Compare your points against Partner’s "${currentGame.cols[fixedIdx]}": ${currentGame.rows[0]} earns ${s0}; ${currentGame.rows[1]} earns ${s1}. Your best response is ${brLabel}.${domSuffix}`;
      } else {
        const s0 = currentGame.matrix[fixedIdx][0][1];
        const s1 = currentGame.matrix[fixedIdx][1][1];
        const br = analysis.colBR[fixedIdx];
        const brLabel = br.length === 2
          ? `either ${currentGame.cols[0]} or ${currentGame.cols[1]} (tie)`
          : currentGame.cols[br[0]];
        bestRespEl.textContent = `Compare partner’s points against your "${currentGame.rows[fixedIdx]}": ${currentGame.cols[0]} earns ${s0}; ${currentGame.cols[1]} earns ${s1}. Partner’s best response is ${brLabel}.`;
      }

      // Diagnostic summary cards
      document.getElementById('diag-dom-you').textContent =
        analysis.rowDom === null ? 'None' : currentGame.rows[analysis.rowDom];
      document.getElementById('diag-dom-partner').textContent =
        analysis.colDom === null ? 'None' : currentGame.cols[analysis.colDom];
      document.getElementById('diag-pure-ne').textContent =
        analysis.pureNE.length
          ? analysis.pureNE.map(([r, c]) => `(${currentGame.rows[r]}, ${currentGame.cols[c]})`).join(' · ')
          : 'None (no pure NE)';
      document.getElementById('diag-mixed-ne').textContent =
        analysis.mixed
          ? `You ${Math.round(analysis.mixed.p * 100)}% ${currentGame.rows[0]} · Partner ${Math.round(analysis.mixed.q * 100)}% ${currentGame.cols[0]} (E=${analysis.mixed.euRow.toFixed(2)}, ${analysis.mixed.euCol.toFixed(2)})`
          : 'None (pure dominance / boundary)';
      document.getElementById('diag-pareto').textContent =
        analysis.pareto.map(([r, c]) => `(${currentGame.rows[r]}, ${currentGame.cols[c]})`).join(' · ');

      const takeawayEl = document.getElementById('diag-takeaway');
      if (!isCustom) {
        takeawayEl.textContent = currentGame.takeaway;
      } else if (analysis.pureNE.length === 0 && analysis.mixed) {
        takeawayEl.textContent = 'Custom analysis: no pure Nash equilibrium exists, so players must randomize via the mixed equilibrium above to avoid exploitation.';
      } else if (analysis.pureNE.length === 2) {
        takeawayEl.textContent = 'Custom analysis: two pure equilibria exist. Check whether both yield equal payoffs (Coordination), one dominates both players (Stag Hunt), or players prefer opposite moves (Hawk–Dove).';
      } else if (analysis.pureNE.length === 1) {
        const [nr, nc] = analysis.pureNE[0];
        const neIsPareto = analysis.pareto.some(([pr, pc]) => pr === nr && pc === nc);
        takeawayEl.textContent = neIsPareto
          ? `Custom analysis: the unique Nash equilibrium (${currentGame.rows[nr]}, ${currentGame.cols[nc]}) is also Pareto efficient—individual and collective incentives align.`
          : `Custom analysis: (${currentGame.rows[nr]}, ${currentGame.cols[nc]}) is a Nash equilibrium yet NOT Pareto efficient—a classic social dilemma gap!`;
      } else {
        takeawayEl.textContent = 'Custom analysis updated above.';
      }
    }

    function loadPreset(key) {
      currentPresetKey = key;
      currentGame = structuredClone(PRESETS[key]);
      isCustom = false;
      presetButtons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.preset === key)));
      syncInputsFromMatrix();
      updateInspectorControls();
      renderMatrix();
    }

    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => loadPreset(btn.dataset.preset));
    });

    sideButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        inspectSide = btn.dataset.inspectSide;
        updateInspectorControls();
        renderMatrix();
      });
    });

    fixedButtons.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        fixedIdx = idx;
        updateInspectorControls();
        renderMatrix();
      });
    });

    document.getElementById('apply-custom')?.addEventListener('click', () => {
      const coords = [[0, 0], [0, 1], [1, 0], [1, 1]];
      coords.forEach(([r, c], idx) => {
        const vR = Number(document.getElementById(inputIds[idx][0]).value);
        const vC = Number(document.getElementById(inputIds[idx][1]).value);
        currentGame.matrix[r][c] = [Number.isFinite(vR) ? vR : 0, Number.isFinite(vC) ? vC : 0];
      });
      isCustom = true;
      renderMatrix();
    });

    document.getElementById('reset-preset')?.addEventListener('click', () => loadPreset(currentPresetKey));
    loadPreset('pd');
  })();

  /* ================================================================
     Shared Repeated-Dilemma Strategy Engine
     ================================================================ */
  const STRATEGIES = {
    mirror: {
      name: 'Tit for Tat',
      style: 'Nice · Provocable · Forgiving',
      choose: (myHist, oppHist) => (oppHist.length === 0 ? 'help' : oppHist[oppHist.length - 1])
    },
    tf2t: {
      name: 'Tit for Two Tats',
      style: 'Nice · Very Forgiving',
      choose: (myHist, oppHist) => {
        const n = oppHist.length;
        if (n >= 2 && oppHist[n - 1] === 'hold' && oppHist[n - 2] === 'hold') return 'hold';
        return 'help';
      }
    },
    grim: {
      name: 'Grim Trigger',
      style: 'Nice · Unforgiving',
      choose: (myHist, oppHist) => (oppHist.includes('hold') ? 'hold' : 'help')
    },
    pavlov: {
      name: 'Pavlov (Win-Stay)',
      style: 'Nice · Opportunistic',
      choose: (myHist, oppHist) => {
        const n = myHist.length;
        if (n === 0) return 'help';
        // Win (3 or 5) means opp helped -> stay; lose (0 or 1) means opp held back -> switch.
        return oppHist[n - 1] === 'help' ? myHist[n - 1] : (myHist[n - 1] === 'help' ? 'hold' : 'help');
      }
    },
    help: {
      name: 'Always Help',
      style: 'Unconditionally Nice',
      choose: () => 'help'
    },
    hold: {
      name: 'Always Hold Back',
      style: 'Always Exploitative',
      choose: () => 'hold'
    }
  };

  function pdPayoff(a, b) {
    if (a === 'help') return b === 'help' ? [3, 3] : [0, 5];
    return b === 'help' ? [5, 0] : [1, 1];
  }

  /* ================================================================
     2. Repeated Dilemma Lab + SimKit Trajectory Canvas
     ================================================================ */
  (() => {
    const partnerEl = document.getElementById('opponent');
    const horizonEl = document.getElementById('game-horizon');
    const noiseEl = document.getElementById('game-noise');
    const historyEl = document.getElementById('history');
    const statusEl = document.getElementById('game-status');
    const insightEl = document.getElementById('game-insight');
    const roundsBar = document.getElementById('rounds-bar');
    const helpBtn = document.getElementById('help');
    const holdBtn = document.getElementById('hold');
    const chartCanvas = document.getElementById('repeated-chart');
    if (!partnerEl || !historyEl || !helpBtn || !holdBtn) return;

    const labels = { help: 'Help', hold: 'Hold back' };
    let round = 0;
    let maxRounds = 8;
    let finished = false;
    let yours = 0;
    let theirs = 0;
    let yourObsHist = [];
    let partnerObsHist = [];
    let trajectory = [{ r: 0, you: 0, partner: 0 }];

    // Simple PRNG for deterministic-feeling indefinite length & noise per match
    let seed = 1337;
    function rand() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    function computeHorizon() {
      if (horizonEl && horizonEl.value === 'indefinite') {
        let len = 6;
        while (len < 16 && rand() < 0.75) len++;
        return len;
      }
      return 8;
    }

    let chartSurface = null;
    let themeColors = window.SimKit ? window.SimKit.theme.colors() : {
      bg: '#f5f5f7', text: '#1d1d1f', textMuted: '#6e6e73', accent: '#0071e3'
    };

    function drawChart() {
      if (!chartSurface || !chartCanvas) return;
      const { ctx, width, height } = chartSurface;
      if (width < 10 || height < 10) return;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = themeColors.bg;
      ctx.fillRect(0, 0, width, height);

      const pad = { top: 34, right: 24, bottom: 34, left: 48 };
      const plotW = Math.max(40, width - pad.left - pad.right);
      const plotH = Math.max(40, height - pad.top - pad.bottom);

      const maxX = Math.max(8, maxRounds, trajectory[trajectory.length - 1].r);
      const maxVal = Math.max(24, maxX * 3, ...trajectory.map(d => Math.max(d.you, d.partner)));
      const yMax = Math.ceil(maxVal / 6) * 6;

      const xPos = r => pad.left + (r / maxX) * plotW;
      const yPos = v => pad.top + plotH - (v / yMax) * plotH;

      // Grid lines
      ctx.strokeStyle = themeColors.textMuted;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      for (let t = 0; t <= 4; t++) {
        const val = (yMax * t) / 4;
        const y = yPos(val);
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + plotW, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Axes & labels
      ctx.fillStyle = themeColors.textMuted;
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let t = 0; t <= 4; t++) {
        const val = Math.round((yMax * t) / 4);
        ctx.fillText(String(val), pad.left - 8, yPos(val));
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let r = 0; r <= maxX; r += maxX > 10 ? 2 : 1) {
        ctx.fillText(String(r), xPos(r), pad.top + plotH + 8);
      }

      // Mutual-help benchmark (3 * round)
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = themeColors.textMuted;
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.moveTo(xPos(0), yPos(0));
      ctx.lineTo(xPos(maxX), yPos(maxX * 3));
      ctx.stroke();
      ctx.restore();

      // Legend
      ctx.font = '600 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const legY = 16;
      ctx.fillStyle = themeColors.accent;
      ctx.fillRect(pad.left, legY - 3, 14, 4);
      ctx.fillStyle = themeColors.text;
      ctx.fillText('You', pad.left + 19, legY);

      ctx.fillStyle = themeColors.text;
      ctx.fillRect(pad.left + 64, legY - 3, 14, 4);
      ctx.fillText('Partner', pad.left + 83, legY);

      ctx.fillStyle = themeColors.textMuted;
      ctx.fillText('--- Mutual Help (3/rd)', pad.left + 148, legY);

      if (trajectory.length <= 1) {
        ctx.fillStyle = themeColors.textMuted;
        ctx.textAlign = 'center';
        ctx.font = '13px system-ui, -apple-system, sans-serif';
        ctx.fillText('Play Round 1 to trace scores against the Mutual-Help benchmark.', pad.left + plotW / 2, pad.top + plotH / 2);
        return;
      }

      // Partner trajectory (solid dark text line)
      ctx.strokeStyle = themeColors.text;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      trajectory.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(xPos(pt.r), yPos(pt.partner));
        else ctx.lineTo(xPos(pt.r), yPos(pt.partner));
      });
      ctx.stroke();

      // Your trajectory (accent line)
      ctx.strokeStyle = themeColors.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      trajectory.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(xPos(pt.r), yPos(pt.you));
        else ctx.lineTo(xPos(pt.r), yPos(pt.you));
      });
      ctx.stroke();

      // Point markers
      trajectory.forEach(pt => {
        ctx.fillStyle = themeColors.text;
        ctx.beginPath();
        ctx.arc(xPos(pt.r), yPos(pt.partner), 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = themeColors.accent;
        ctx.beginPath();
        ctx.arc(xPos(pt.r), yPos(pt.you), 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (chartCanvas && window.SimKit) {
      chartSurface = window.SimKit.canvas2d(chartCanvas, {
        height: 240,
        onResize: drawChart
      });
      window.SimKit.theme.onChange(colors => {
        themeColors = colors;
        drawChart();
      });
    }

    function syncRoundsBar() {
      if (!roundsBar) return;
      const dotsNeeded = horizonEl && horizonEl.value === 'indefinite' ? Math.max(8, round + (finished ? 0 : 1)) : 8;
      if (roundsBar.children.length !== dotsNeeded) {
        roundsBar.replaceChildren();
        for (let i = 0; i < dotsNeeded; i++) {
          roundsBar.append(document.createElement('span'));
        }
      }
      [...roundsBar.children].forEach((dot, idx) => {
        dot.toggleAttribute('data-played', idx < round);
      });
      const labelTotal = horizonEl && horizonEl.value === 'indefinite'
        ? (finished ? `${round}` : `${round}+`)
        : '8';
      roundsBar.setAttribute('aria-label', `${round} of ${labelTotal} rounds completed`);
    }

    function updateDisplay(action, other, note) {
      document.getElementById('your-total').textContent = yours;
      document.getElementById('partner-total').textContent = theirs;
      document.getElementById('shared-total').textContent = yours + theirs;
      syncRoundsBar();
      drawChart();

      if (!round) {
        insightEl.textContent = 'Make your first move. Watch how today’s choice changes your partner’s next response.';
        return;
      }

      const outcomes = {
        'help-help': 'Mutual help: 6 shared points. Both players benefit together.',
        'help-hold': 'You helped; your partner held back. The 5 shared points went to your partner.',
        'hold-help': 'You held back; your partner helped. You gained 5, while the shared total slipped below mutual help.',
        'hold-hold': 'Both held back: just 2 shared points. Individually safe can be collectively costly.'
      };
      const nextHint = !finished && partnerEl.value === 'mirror'
        ? ` Next round, Tit for Tat will ${labels[action].toLowerCase()}.`
        : '';
      const endSummary = finished
        ? ` Experiment total: ${yours + theirs}; ${round} rounds of mutual help would total ${round * 6}.`
        : '';
      const noiseMsg = note ? ` (${note})` : '';
      insightEl.textContent = outcomes[`${action}-${other}`] + noiseMsg + nextHint + endSummary;
    }

    function reset() {
      round = 0;
      yours = 0;
      theirs = 0;
      finished = false;
      yourObsHist = [];
      partnerObsHist = [];
      trajectory = [{ r: 0, you: 0, partner: 0 }];
      seed = (Date.now() ^ (partnerEl.selectedIndex * 997)) >>> 0 || 4242;
      maxRounds = computeHorizon();
      historyEl.replaceChildren();
      helpBtn.disabled = holdBtn.disabled = false;
      const targetStr = horizonEl && horizonEl.value === 'indefinite' ? '6+ (uncertain end)' : '8';
      statusEl.textContent = `Round 0 of ${targetStr}. Your score: 0. Partner’s score: 0.`;
      updateDisplay();
    }

    function play(intendedYou) {
      if (finished) return;
      const strat = STRATEGIES[partnerEl.value] || STRATEGIES.mirror;
      const intendedOther = strat.choose(partnerObsHist, yourObsHist);

      const noiseProb = noiseEl ? Number(noiseEl.value) : 0;
      let actualYou = intendedYou;
      let actualOther = intendedOther;
      const notes = [];

      if (noiseProb > 0 && rand() < noiseProb) {
        actualYou = intendedYou === 'help' ? 'hold' : 'help';
        notes.push(`Your move slipped to ${labels[actualYou]}`);
      }
      if (noiseProb > 0 && rand() < noiseProb) {
        actualOther = intendedOther === 'help' ? 'hold' : 'help';
        notes.push(`Partner slipped to ${labels[actualOther]}`);
      }

      const points = pdPayoff(actualYou, actualOther);
      round++;
      yours += points[0];
      theirs += points[1];
      yourObsHist.push(actualYou);
      partnerObsHist.push(actualOther);
      trajectory.push({ r: round, you: yours, partner: theirs });

      finished = round >= maxRounds;

      const row = document.createElement('tr');
      const noteText = notes.length ? notes.join('; ') : 'Clear';
      [round, labels[actualYou], labels[actualOther], points.join(', '), noteText].forEach(val => {
        const cell = document.createElement('td');
        cell.textContent = val;
        row.append(cell);
      });
      historyEl.append(row);

      const targetStr = horizonEl && horizonEl.value === 'indefinite'
        ? (finished ? String(round) : '6+')
        : '8';
      statusEl.textContent =
        `Round ${round} of ${targetStr}. You: ${labels[actualYou]}. Partner: ${labels[actualOther]}. Your score: ${yours}. Partner’s score: ${theirs}.` +
        (finished ? ' Experiment complete. Reset to test another strategy.' : '');

      helpBtn.disabled = holdBtn.disabled = finished;
      updateDisplay(actualYou, actualOther, notes.join('; '));
    }

    helpBtn.addEventListener('click', () => play('help'));
    holdBtn.addEventListener('click', () => play('hold'));
    partnerEl.addEventListener('change', reset);
    horizonEl?.addEventListener('change', reset);
    noiseEl?.addEventListener('change', reset);
    document.getElementById('reset-game')?.addEventListener('click', reset);
    reset();
  })();

  /* ================================================================
     3. Axelrod Round-Robin & Evolutionary Tournament
     ================================================================ */
  (() => {
    const lab = document.getElementById('tournament-lab');
    const canvas = document.getElementById('tournament-chart');
    const summaryEl = document.getElementById('tournament-summary');
    const tableHead = document.getElementById('tournament-table-head');
    const tableBody = document.getElementById('tournament-table-body');
    const rrBtn = document.getElementById('run-round-robin');
    const evoBtn = document.getElementById('run-evolution');
    const roundsSel = document.getElementById('tourney-rounds');
    const noiseSel = document.getElementById('tourney-noise');
    if (!lab || !canvas || !summaryEl || !tableBody) return;

    let mode = 'roundrobin'; // 'roundrobin' | 'evolution'
    let lastData = null;

    let chartSurface = null;
    let themeColors = window.SimKit ? window.SimKit.theme.colors() : {
      bg: '#f5f5f7', text: '#1d1d1f', textMuted: '#6e6e73', accent: '#0071e3'
    };

    const LINE_PALETTE = ['#0071e3', '#c2410c', '#15803d', '#7e22ce', '#0f766e', '#b91c1c'];

    function seededRng(init) {
      let s = init >>> 0;
      return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
    }

    function playPair(keyA, keyB, rounds, noise, seedBase) {
      const stratA = STRATEGIES[keyA];
      const stratB = STRATEGIES[keyB];
      const trials = noise > 0 ? 6 : 1;
      let totalA = 0;
      let totalB = 0;

      for (let t = 0; t < trials; t++) {
        const rng = seededRng(seedBase + t * 7919);
        const histA = [];
        const histB = [];
        for (let r = 0; r < rounds; r++) {
          let moveA = stratA.choose(histA, histB);
          let moveB = stratB.choose(histB, histA);
          if (noise > 0 && rng() < noise) moveA = moveA === 'help' ? 'hold' : 'help';
          if (noise > 0 && rng() < noise) moveB = moveB === 'help' ? 'hold' : 'help';
          const [pA, pB] = pdPayoff(moveA, moveB);
          totalA += pA;
          totalB += pB;
          histA.push(moveA);
          histB.push(moveB);
        }
      }
      return [totalA / (trials * rounds), totalB / (trials * rounds)];
    }

    function selectedStrategies() {
      return [...lab.querySelectorAll('input[name="tourney-strat"]:checked')].map(el => el.value);
    }

    function buildPayoffMatrix(keys, rounds, noise) {
      const n = keys.length;
      const avg = Array.from({ length: n }, () => Array(n).fill(0));
      for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
          const [a, b] = playPair(keys[i], keys[j], rounds, noise, (i + 1) * 131 + (j + 1) * 977);
          avg[i][j] = a;
          avg[j][i] = b;
        }
      }
      return avg;
    }

    function computeTournament() {
      const keys = selectedStrategies();
      if (keys.length < 2) {
        summaryEl.textContent = 'Select at least 2 strategies to run a tournament.';
        tableBody.replaceChildren();
        lastData = { empty: true };
        drawTournamentChart();
        return;
      }

      const rounds = Number(roundsSel.value) || 20;
      const noise = Number(noiseSel.value) || 0;
      const M = buildPayoffMatrix(keys, rounds, noise);

      if (mode === 'roundrobin') {
        const rows = keys.map((key, i) => {
          const mean = M[i].reduce((sum, v) => sum + v, 0) / keys.length;
          return { key, name: STRATEGIES[key].name, style: STRATEGIES[key].style, score: mean };
        }).sort((a, b) => b.score - a.score);

        lastData = { mode: 'roundrobin', rows };
        summaryEl.textContent =
          `Round-Robin winner (${rounds} rounds/pair, ${Math.round(noise * 100)}% noise): ${rows[0].name} (${rows[0].score.toFixed(2)} pts/round).`;

        tableHead.innerHTML = '<tr><th scope="col">Rank</th><th scope="col">Strategy</th><th scope="col">Avg pts / round</th><th scope="col">Style</th></tr>';
        tableBody.replaceChildren();
        rows.forEach((row, idx) => {
          const tr = document.createElement('tr');
          [idx + 1, row.name, row.score.toFixed(2), row.style].forEach(val => {
            const td = document.createElement('td');
            td.textContent = String(val);
            tr.append(td);
          });
          tableBody.append(tr);
        });
      } else {
        const gens = 12;
        let shares = Array(keys.length).fill(1 / keys.length);
        const history = [shares.slice()];

        for (let g = 0; g < gens; g++) {
          const fitness = shares.map((_, i) =>
            shares.reduce((acc, sJ, j) => acc + sJ * M[i][j], 0)
          );
          const avgFit = shares.reduce((acc, sI, i) => acc + sI * fitness[i], 0) || 1;
          shares = shares.map((sI, i) => (sI * fitness[i]) / avgFit);
          history.push(shares.slice());
        }

        const finalRows = keys.map((key, i) => ({
          key,
          name: STRATEGIES[key].name,
          style: STRATEGIES[key].style,
          share: shares[i],
          color: LINE_PALETTE[i % LINE_PALETTE.length]
        })).sort((a, b) => b.share - a.share);

        lastData = { mode: 'evolution', keys, history, gens, finalRows };
        summaryEl.textContent =
          `After 12 evolutionary generations (${rounds} rounds/pair, ${Math.round(noise * 100)}% noise), ${finalRows[0].name} holds ${Math.round(finalRows[0].share * 100)}% of the population.`;

        tableHead.innerHTML = '<tr><th scope="col">Rank</th><th scope="col">Strategy</th><th scope="col">Final share</th><th scope="col">Style</th></tr>';
        tableBody.replaceChildren();
        finalRows.forEach((row, idx) => {
          const tr = document.createElement('tr');
          [idx + 1, row.name, `${(row.share * 100).toFixed(1)}%`, row.style].forEach(val => {
            const td = document.createElement('td');
            td.textContent = String(val);
            tr.append(td);
          });
          tableBody.append(tr);
        });
      }
      drawTournamentChart();
    }

    function drawTournamentChart() {
      if (!chartSurface || !canvas || !lastData) return;
      const { ctx, width, height } = chartSurface;
      if (width < 10 || height < 10) return;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = themeColors.bg;
      ctx.fillRect(0, 0, width, height);

      if (lastData.empty) {
        ctx.fillStyle = themeColors.textMuted;
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Select at least 2 strategies to plot tournament results.', width / 2, height / 2);
        return;
      }

      if (lastData.mode === 'roundrobin') {
        const rows = lastData.rows;
        const pad = { top: 24, right: 56, bottom: 26, left: 136 };
        const plotW = Math.max(40, width - pad.left - pad.right);
        const plotH = Math.max(40, height - pad.top - pad.bottom);
        const step = plotH / rows.length;
        const barH = Math.min(26, step * 0.62);

        // Benchmark vertical line at 3.0 (mutual cooperation)
        const x3 = pad.left + (3 / 5) * plotW;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = themeColors.textMuted;
        ctx.beginPath();
        ctx.moveTo(x3, pad.top - 6);
        ctx.lineTo(x3, pad.top + plotH);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = themeColors.textMuted;
        ctx.font = '11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('3.0 (Mutual Help)', x3, pad.top - 12);

        rows.forEach((row, idx) => {
          const y = pad.top + idx * step + (step - barH) / 2;
          const barW = Math.max(2, (row.score / 5) * plotW);
          ctx.fillStyle = idx === 0 ? themeColors.accent : themeColors.text;
          ctx.globalAlpha = idx === 0 ? 1 : 0.72;
          ctx.fillRect(pad.left, y, barW, barH);
          ctx.globalAlpha = 1;

          ctx.fillStyle = themeColors.text;
          ctx.font = '600 12px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(row.name, pad.left - 10, y + barH / 2);

          ctx.textAlign = 'left';
          ctx.fillText(row.score.toFixed(2), pad.left + barW + 8, y + barH / 2);
        });
      } else {
        const { keys, history, gens } = lastData;
        const pad = { top: 38, right: 24, bottom: 34, left: 48 };
        const plotW = Math.max(40, width - pad.left - pad.right);
        const plotH = Math.max(40, height - pad.top - pad.bottom);
        const xPos = g => pad.left + (g / gens) * plotW;
        const yPos = share => pad.top + plotH - share * plotH;

        // Horizontal share lines (0%, 25%, 50%, 75%, 100%)
        ctx.strokeStyle = themeColors.textMuted;
        ctx.font = '11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        [0, 0.25, 0.5, 0.75, 1].forEach(frac => {
          const y = yPos(frac);
          ctx.globalAlpha = 0.22;
          ctx.beginPath();
          ctx.moveTo(pad.left, y);
          ctx.lineTo(pad.left + plotW, y);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = themeColors.textMuted;
          ctx.fillText(`${Math.round(frac * 100)}%`, pad.left - 8, y);
        });

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let g = 0; g <= gens; g += 2) {
          ctx.fillStyle = themeColors.textMuted;
          ctx.fillText(`G${g}`, xPos(g), pad.top + plotH + 8);
        }

        // Draw lines & compact legend
        let lx = pad.left;
        let ly = 14;
        keys.forEach((key, i) => {
          const color = LINE_PALETTE[i % LINE_PALETTE.length];
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          history.forEach((genShares, g) => {
            if (g === 0) ctx.moveTo(xPos(g), yPos(genShares[i]));
            else ctx.lineTo(xPos(g), yPos(genShares[i]));
          });
          ctx.stroke();

          const label = STRATEGIES[key].name;
          if (lx + 115 > width - 16) {
            lx = pad.left;
            ly += 15;
          }
          ctx.fillStyle = color;
          ctx.fillRect(lx, ly - 3, 10, 4);
          ctx.fillStyle = themeColors.text;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, lx + 14, ly);
          lx += Math.max(96, label.length * 6.8 + 24);
        });
      }
    }

    if (window.SimKit) {
      chartSurface = window.SimKit.canvas2d(canvas, {
        height: 270,
        onResize: drawTournamentChart
      });
      window.SimKit.theme.onChange(colors => {
        themeColors = colors;
        drawTournamentChart();
      });
    }

    rrBtn?.addEventListener('click', () => {
      mode = 'roundrobin';
      rrBtn.setAttribute('aria-pressed', 'true');
      evoBtn?.setAttribute('aria-pressed', 'false');
      computeTournament();
    });

    evoBtn?.addEventListener('click', () => {
      mode = 'evolution';
      evoBtn.setAttribute('aria-pressed', 'true');
      rrBtn?.setAttribute('aria-pressed', 'false');
      computeTournament();
    });

    lab.querySelectorAll('input[name="tourney-strat"]').forEach(cb => {
      cb.addEventListener('change', computeTournament);
    });
    roundsSel?.addEventListener('change', computeTournament);
    noiseSel?.addEventListener('change', computeTournament);

    computeTournament();
  })();

  /* ================================================================
     4. Sequential Game Tree Lab (SVG + Backward Induction)
     ================================================================ */
  (() => {
    const svg = document.getElementById('game-tree-svg');
    const readout = document.getElementById('tree-readout');
    const controls = document.getElementById('tree-move-controls');
    const commitBtn = document.getElementById('tree-commitment');
    const backBtn = document.getElementById('tree-backward');
    const resetBtn = document.getElementById('tree-reset');
    const scenarioBtns = document.querySelectorAll('[data-tree-scenario]');
    if (!svg || !readout || !controls) return;

    let scenario = 'entry';
    let committed = false;
    let backward = false;
    let selectedPath = null; // e.g., 'out', 'enter-share', 'enter-war', 'fair-acc', etc.

    function svgEl(tag, attrs, text) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, String(v)));
      if (text !== undefined) el.textContent = text;
      return el;
    }

    function renderEntryTree() {
      const warPayoff = committed ? [-1, 3] : [-1, -1];
      const spneBranch = committed ? 'out' : 'enter-share';
      const incumbentBest = committed ? 'war' : 'share';

      // Coordinates
      const root = { x: 80, y: 160 };
      const outLeaf = { x: 280, y: 72 };
      const incNode = { x: 310, y: 230 };
      const shareLeaf = { x: 560, y: 165 };
      const warLeaf = { x: 560, y: 270 };

      // Edges
      const edges = [
        {
          id: 'out',
          x1: root.x, y1: root.y, x2: outLeaf.x, y2: outLeaf.y,
          lx: 165, ly: 96, label: 'Stay Out',
          active: selectedPath === 'out' || (backward && spneBranch === 'out'),
          pruned: backward && spneBranch !== 'out'
        },
        {
          id: 'enter',
          x1: root.x, y1: root.y, x2: incNode.x, y2: incNode.y,
          lx: 175, ly: 215, label: 'Enter',
          active: (selectedPath && selectedPath.startsWith('enter')) || (backward && spneBranch.startsWith('enter')),
          pruned: backward && !spneBranch.startsWith('enter')
        },
        {
          id: 'enter-share',
          x1: incNode.x, y1: incNode.y, x2: shareLeaf.x, y2: shareLeaf.y,
          lx: 430, ly: 182, label: 'Share Market',
          active: selectedPath === 'enter-share' || (backward && incumbentBest === 'share'),
          pruned: backward && incumbentBest !== 'share'
        },
        {
          id: 'enter-war',
          x1: incNode.x, y1: incNode.y, x2: warLeaf.x, y2: warLeaf.y,
          lx: 430, ly: 268, label: committed ? 'Price War (Locked)' : 'Price War',
          active: selectedPath === 'enter-war' || (backward && incumbentBest === 'war'),
          pruned: backward && incumbentBest !== 'war'
        }
      ];

      edges.forEach(e => {
        const line = svgEl('line', {
          x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2,
          class: `gt-tree-edge${e.active ? ' is-active' : ''}${e.pruned ? ' is-pruned' : ''}`
        });
        svg.append(line);
        const lbl = svgEl('text', {
          x: e.lx, y: e.ly, 'text-anchor': 'middle',
          class: `gt-tree-label${e.pruned ? ' is-pruned' : ''}`
        }, e.label);
        svg.append(lbl);
      });

      // Leaves
      const leaves = [
        { id: 'out', x: outLeaf.x, y: outLeaf.y, text: '(0, 4)' },
        { id: 'enter-share', x: shareLeaf.x, y: shareLeaf.y, text: '(2, 2)' },
        { id: 'enter-war', x: warLeaf.x, y: warLeaf.y, text: `(${warPayoff[0]}, ${warPayoff[1]})` }
      ];

      leaves.forEach(lf => {
        const isActive = selectedPath === lf.id || (backward && spneBranch === lf.id);
        const g = svgEl('g', { class: `gt-tree-leaf${isActive ? ' is-active' : ''}` });
        g.append(svgEl('rect', { x: lf.x, y: lf.y - 18, width: 92, height: 36 }));
        g.append(svgEl('text', { x: lf.x + 46, y: lf.y + 5, 'text-anchor': 'middle', class: 'gt-tree-payoff' }, lf.text));
        svg.append(g);
      });

      // Decision nodes
      const nodes = [
        { x: root.x, y: root.y, name: 'Challenger', r: 22, active: true },
        { x: incNode.x, y: incNode.y, name: 'Incumbent', r: 22, active: (selectedPath && selectedPath.startsWith('enter')) || backward }
      ];
      nodes.forEach(n => {
        const g = svgEl('g', { class: `gt-tree-node${n.active ? ' is-active' : ''}` });
        g.append(svgEl('circle', { cx: n.x, cy: n.y, r: n.r }));
        g.append(svgEl('text', { x: n.x, y: n.y - 30, 'text-anchor': 'middle', class: 'gt-tree-label' }, n.name));
        svg.append(g);
      });

      // Interactive move buttons
      controls.replaceChildren();
      [
        { id: 'out', label: 'Challenger: Stay Out → (0, 4)' },
        { id: 'enter-share', label: 'Enter → Incumbent Shares → (2, 2)' },
        { id: 'enter-war', label: `Enter → Price War → (${warPayoff[0]}, ${warPayoff[1]})` }
      ].forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = opt.label;
        btn.setAttribute('aria-pressed', String(selectedPath === opt.id));
        btn.addEventListener('click', () => {
          selectedPath = opt.id;
          renderTree();
        });
        controls.append(btn);
      });

      if (backward) {
        readout.textContent = committed
          ? 'Backward induction with Binding Commitment: If Challenger enters, Incumbent now prefers War (3 > 2). Foreseeing (-1), Challenger chooses Stay Out → Subgame-Perfect Equilibrium: (0, 4). A credible commitment changed the opponent’s move!'
          : 'Backward induction (no commitment): Start at Incumbent’s node—Share (2) beats Price War (-1), so Incumbent will not carry out the threat. Foreseeing (2 > 0), Challenger enters → Subgame-Perfect Equilibrium: (2, 2).';
      } else if (selectedPath === 'out') {
        readout.textContent = 'Challenger stayed out (0, 4). Ask: would the Incumbent actually fight if challenged, or was the threat bluffing?';
      } else if (selectedPath === 'enter-share') {
        readout.textContent = 'Challenger entered and Incumbent shared the market (2, 2). Both avoid a destructive war.';
      } else if (selectedPath === 'enter-war') {
        readout.textContent = committed
          ? 'With the binding contract active, fighting earns the Incumbent 3 while hurting the Challenger (-1).'
          : 'Price war (-1, -1): without a commitment device, fighting hurts the Incumbent too—making the threat non-credible.';
      } else {
        readout.textContent = 'Payoffs are (Challenger, Incumbent). Step through a path or click "Solve by Backward Induction" to prune non-credible branches.';
      }
    }

    function renderUltimatumTree() {
      const root = { x: 85, y: 160 };
      const offers = [
        { id: '91', label: 'Offer 9 / 1', y: 65, acc: '(9, 1)', rej: '(0, 0)' },
        { id: '73', label: 'Offer 7 / 3', y: 160, acc: '(7, 3)', rej: '(0, 0)' },
        { id: '55', label: 'Offer 5 / 5', y: 255, acc: '(5, 5)', rej: '(0, 0)' }
      ];

      offers.forEach(o => {
        const respX = 330;
        const leafX = 565;
        const isSpne = o.id === '91';
        const branchSelected = selectedPath && selectedPath.startsWith(o.id);

        // Proposer -> Responder edge
        svg.append(svgEl('line', {
          x1: root.x, y1: root.y, x2: respX, y2: o.y,
          class: `gt-tree-edge${(branchSelected || (backward && isSpne)) ? ' is-active' : ''}${backward && !isSpne ? ' is-pruned' : ''}`
        }));
        svg.append(svgEl('text', {
          x: 205, y: o.y + (o.y < 160 ? -8 : o.y > 160 ? 18 : -10),
          'text-anchor': 'middle',
          class: `gt-tree-label${backward && !isSpne ? ' is-pruned' : ''}`
        }, o.label));

        // Accept & Reject edges
        const accY = o.y - 22;
        const rejY = o.y + 22;
        svg.append(svgEl('line', {
          x1: respX, y1: o.y, x2: leafX, y2: accY,
          class: `gt-tree-edge${(selectedPath === `${o.id}-acc` || (backward && isSpne)) ? ' is-active' : ''}`
        }));
        svg.append(svgEl('text', { x: 455, y: accY - 4, 'text-anchor': 'middle', class: 'gt-tree-label' }, `Accept ${o.acc}`));

        svg.append(svgEl('line', {
          x1: respX, y1: o.y, x2: leafX, y2: rejY,
          class: `gt-tree-edge${selectedPath === `${o.id}-rej` ? ' is-active' : ''}${backward ? ' is-pruned' : ''}`
        }));
        svg.append(svgEl('text', {
          x: 455, y: rejY + 14, 'text-anchor': 'middle',
          class: `gt-tree-label${backward ? ' is-pruned' : ''}`
        }, `Reject ${o.rej}`));

        // Responder node
        const gNode = svgEl('g', { class: `gt-tree-node${(branchSelected || (backward && isSpne)) ? ' is-active' : ''}` });
        gNode.append(svgEl('circle', { cx: respX, cy: o.y, r: 16 }));
        gNode.append(svgEl('text', { x: respX, y: o.y + 4, 'text-anchor': 'middle', class: 'gt-tree-label' }, 'R'));
        svg.append(gNode);

        // Leaf summary pill on right
        const gLeaf = svgEl('g', { class: `gt-tree-leaf${(selectedPath === `${o.id}-acc` || (backward && isSpne)) ? ' is-active' : ''}` });
        gLeaf.append(svgEl('rect', { x: leafX, y: accY - 14, width: 78, height: 28 }));
        gLeaf.append(svgEl('text', { x: leafX + 39, y: accY + 5, 'text-anchor': 'middle', class: 'gt-tree-payoff' }, o.acc));
        svg.append(gLeaf);
      });

      const gRoot = svgEl('g', { class: 'gt-tree-node is-active' });
      gRoot.append(svgEl('circle', { cx: root.x, cy: root.y, r: 22 }));
      gRoot.append(svgEl('text', { x: root.x, y: root.y - 30, 'text-anchor': 'middle', class: 'gt-tree-label' }, 'Proposer'));
      svg.append(gRoot);

      controls.replaceChildren();
      [
        { id: '91-acc', label: '9 / 1 → Accept (9, 1)' },
        { id: '91-rej', label: '9 / 1 → Reject (0, 0)' },
        { id: '55-acc', label: '5 / 5 → Accept (5, 5)' }
      ].forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = opt.label;
        btn.setAttribute('aria-pressed', String(selectedPath === opt.id));
        btn.addEventListener('click', () => {
          selectedPath = opt.id;
          renderTree();
        });
        controls.append(btn);
      });

      if (backward) {
        readout.textContent = 'Textbook backward induction: Since 1 > 0, Responder accepts 9/1—making (9, 1) the unique Subgame-Perfect Equilibrium. Yet real lab experiments show most Responders reject 9/1 offers as unfair! That gap proves fairness preferences belong in the payoff model.';
      } else {
        readout.textContent = 'Proposer splits 10 tokens; Responder accepts or rejects (leaving 0, 0). Test how textbook money-maximizing math compares with human fairness.';
      }
    }

    function renderTree() {
      svg.replaceChildren();
      if (commitBtn) {
        commitBtn.hidden = scenario !== 'entry';
        commitBtn.setAttribute('aria-pressed', String(committed));
      }
      backBtn?.setAttribute('aria-pressed', String(backward));
      scenarioBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.treeScenario === scenario)));

      if (scenario === 'entry') renderEntryTree();
      else renderUltimatumTree();
    }

    scenarioBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        scenario = btn.dataset.treeScenario;
        selectedPath = null;
        renderTree();
      });
    });

    commitBtn?.addEventListener('click', () => {
      committed = !committed;
      renderTree();
    });

    backBtn?.addEventListener('click', () => {
      backward = !backward;
      renderTree();
    });

    resetBtn?.addEventListener('click', () => {
      selectedPath = null;
      backward = false;
      committed = false;
      renderTree();
    });

    renderTree();
  })();

  /* ================================================================
     5. Redesign the Game Incentive Lever Lab
     ================================================================ */
  (() => {
    const scenarioEl = document.getElementById('redesign-scenario');
    const lab = document.getElementById('redesign-lab');
    const shiftEl = document.getElementById('redesign-shift');
    const mechEl = document.getElementById('redesign-mechanism');
    const riskEl = document.getElementById('redesign-risk');
    if (!scenarioEl || !lab || !shiftEl || !mechEl || !riskEl) return;

    const SCENARIOS = {
      makerspace: {
        baseShift: 'Prisoner’s Dilemma (baseline: hold back to save time)',
        baseMech: 'Without rules, each student saves effort by leaving cleanup to others.',
        baseRisk: 'Shared tools vanish or stay messy, hurting the whole class.'
      },
      slides: {
        baseShift: 'Prisoner’s Dilemma / Unequal Load',
        baseMech: 'One conscientious teammate finishes the deck while others coast on the shared grade.',
        baseRisk: 'Resentment builds and less experienced students miss practice.'
      },
      printer: {
        baseShift: 'Commons Dilemma (overuse of shared queue)',
        baseMech: 'Everyone submits large prints before deadlines, jamming the queue for small fixes.',
        baseRisk: 'Late-night bottlenecks cause failed or abandoned jobs.'
      },
      merge: {
        baseShift: 'Hawk–Dove / Coordination Tension',
        baseMech: 'Without signals or right-of-way norms, people hesitate together or push at once.',
        baseRisk: 'Near-collisions or slow gridlock.'
      }
    };

    function updateRedesign() {
      const base = SCENARIOS[scenarioEl.value] || SCENARIOS.makerspace;
      const levers = new Set([...lab.querySelectorAll('input[name="redesign-lever"]:checked')].map(c => c.value));

      if (levers.size === 0) {
        shiftEl.textContent = base.baseShift;
        mechEl.textContent = base.baseMech;
        riskEl.textContent = base.baseRisk;
        return;
      }

      const shifts = [];
      const mechs = [];
      const risks = [];

      if (levers.has('roles')) {
        shifts.push('Prisoner’s Dilemma → Stag Hunt / Threshold Coordination');
        mechs.push('Distinct, non-overlapping responsibilities make each person’s effort clearly necessary.');
        risks.push('If a teammate is absent, rigid roles can stall the whole group without a backup plan.');
      }
      if (levers.has('repeated')) {
        shifts.push('One-Shot Game → Repeated Interaction');
        mechs.push('Shadow of the future lets reciprocity reward steady partners over multiple weeks.');
        risks.push('Fixed cliques can exclude newcomers unless teams rotate occasionally.');
      }
      if (levers.has('visibility')) {
        shifts.push('Hidden Actions → Public Accountability');
        mechs.push('Visible logs deter quiet free-riding and let teammates see who needs help.');
        risks.push('Metric trap (Goodhart’s Law): people may pad visible chores while ignoring invisible care.');
      }
      if (levers.has('safeguard')) {
        shifts.push('Punitive Check → Supportive Safety Net');
        mechs.push('Check-ins distinguish overload or confusion from apathy before penalties kick in.');
        risks.push('Needs brief human conversation—not just an automated dashboard.');
      }

      shiftEl.textContent = shifts.join(' + ');
      mechEl.textContent = mechs.join(' ');
      riskEl.textContent = risks.join(' ');
    }

    scenarioEl.addEventListener('change', updateRedesign);
    lab.querySelectorAll('input[name="redesign-lever"]').forEach(cb => cb.addEventListener('change', updateRedesign));
    updateRedesign();
  })();

  /* ================================================================
     6. Whose Scoreboard Lab & Scoreboard Agreement Builder
     ================================================================ */
  (() => {
    const feedback = document.getElementById('score-feedback');
    const panel = document.getElementById('score-reveal');
    const rule = document.getElementById('club-rule');
    const reveal = document.getElementById('reveal-score');
    const respFeedback = document.getElementById('club-response-feedback');
    const respBtns = document.querySelectorAll('[data-club-response]');
    if (!feedback || !panel || !rule || !reveal) return;

    const selected = () => document.querySelector('input[name="club-choice"]:checked');
    const names = {
      drill: 'repeat familiar cards',
      build: 'build a difficult project',
      mentor: 'mentor newcomers'
    };
    let first = null;

    const descriptions = {
      cards: 'Completed cards: quick cards 120 points; project 30; mentoring 10. This rule rewards volume, regardless of what participants learn.',
      learning: 'Learning lens: the difficult project exposes conceptual gaps; mentoring deepens explanations; familiar cards consolidate basics. Ask what members can now explain or build—there is no single computed winner.',
      process: 'Experience lens: ask what felt absorbing, playful, frustrating, or welcoming. Different participants will report different experiences; no numerical ranking is supplied.'
    };

    const responseAnalyses = {
      optimize: 'Optimizing for 120 points secures sponsor funding in the short term—yet if students start believing quick card repetition IS learning, value capture has taken hold.',
      'care-score': 'Inventing a "Care Score" (e.g., +15 points per question answered) creates Goodhart’s Law in a new coat: members may stage quick, shallow questions just to earn care points.',
      portfolio: 'Negotiating portfolio demos and short student narratives keeps card counts as limited background evidence while defending space for difficult projects and unhurried mentoring.'
    };

    function describe() {
      document.getElementById('rule-feedback').textContent = descriptions[rule.value];
    }

    reveal.addEventListener('click', () => {
      if (!selected()) {
        feedback.textContent = 'Choose an approach before revealing the scoreboard.';
        return;
      }
      first = selected().value;
      panel.hidden = false;
      reveal.disabled = true;
      describe();
      feedback.textContent = `Your first choice was to ${names[first]}. Now examine the scoreboard, choose again if you wish, and compare.`;
    });

    document.getElementById('compare-score')?.addEventListener('click', () => {
      if (!first) {
        feedback.textContent = 'Make a first choice and reveal the scoreboard before comparing.';
        return;
      }
      const now = selected().value;
      feedback.textContent =
        `Before: ${names[first]}. After: ${names[now]}. ` +
        (first === now
          ? 'Your choice stayed the same. What helped you keep your purpose in view?'
          : 'Your choice changed. Was that a practical response to sponsor pressure, or did your idea of a good club meeting shift?') +
        ' Neither result alone establishes value capture.';
    });

    respBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.clubResponse;
        respBtns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        if (respFeedback) respFeedback.textContent = responseAnalyses[key] || '';
      });
    });

    rule.addEventListener('change', describe);

    document.getElementById('reset-score')?.addEventListener('click', () => {
      first = null;
      panel.hidden = true;
      reveal.disabled = false;
      rule.value = 'cards';
      document.querySelectorAll('input[name="club-choice"]').forEach(input => {
        input.checked = false;
      });
      respBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
      if (respFeedback) respFeedback.textContent = '';
      document.getElementById('protected-value').value = '';
      feedback.textContent = 'Choose an approach, then reveal the points.';
    });
  })();

  (() => {
    const preview = document.getElementById('agreement-preview');
    if (!preview) return;

    const fields = [
      { id: 'agree-purpose', label: 'Purpose', fallback: 'Name a purpose that resists simple counting.' },
      { id: 'agree-evidence', label: 'Limited evidence', fallback: 'Specify what a metric may inform, and what it must never decide alone.' },
      { id: 'agree-agency', label: 'Agency protection', fallback: 'Note when to pause a streak, hide counts, or challenge a rule.' },
      { id: 'agree-process', label: 'Unscored space', fallback: 'Reserve regular time to experiment without rankings.' },
      { id: 'agree-review', label: 'Weekly check-in', fallback: 'Ask whether the metric helped your purpose or quietly reshaped it.' }
    ];

    function renderAgreement() {
      preview.replaceChildren();
      const title = document.createElement('h4');
      title.textContent = 'Draft Scoreboard Agreement (local-only preview)';
      const ul = document.createElement('ul');

      fields.forEach(f => {
        const input = document.getElementById(f.id);
        const val = input && input.value.trim() ? input.value.trim() : f.fallback;
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = `${f.label}: `;
        li.append(strong, document.createTextNode(val));
        ul.append(li);
      });
      preview.append(title, ul);
    }

    fields.forEach(f => {
      document.getElementById(f.id)?.addEventListener('input', renderAgreement);
    });
    document.getElementById('agree-clear')?.addEventListener('click', () => {
      fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el) el.value = '';
      });
      renderAgreement();
    });

    renderAgreement();
  })();
})();
