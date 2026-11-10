/* Breadboard Basics lesson (lessons/engineering/arduino-and-electronics/breadboard-basics.html).
 * Moved out of the page's inline <script>, unchanged. */
  (function () {
    'use strict';
    const { COLS, ROW_META, TIE_ROWS_TOP, TIE_ROWS_BOT, RAIL_ROWS, getConnected, pointMatches, connects, hasPoweredRails, hasResistor, hasLed, hasLoopWires, allowedEndpoints } = BreadboardCore;

    /* ═══════════════════════════════════════════════════════
       BREADBOARD CONSTANTS & HELPERS
    ═══════════════════════════════════════════════════════ */
    const HOLE_R = 6;             // hole radius px
    const COL_SP = 26;            // column spacing px
    const ROW_SP = 24;            // row spacing px
    const LEFT_PAD = 44;          // left margin (for row labels)
    const RIGHT_PAD = 18;

    // Y coordinates for each zone
    const Y = {
      'rail-top-plus':  22,
      'rail-top-minus': 46,
      'a': 92, 'b': 116, 'c': 140, 'd': 164, 'e': 188,
      'gap': 213,
      'f': 234, 'g': 258, 'h': 282, 'i': 306, 'j': 330,
      'rail-bot-minus': 360,
      'rail-bot-plus':  384,
    };



    function holeX(col) { return LEFT_PAD + (col - 1) * COL_SP; }
    function holeY(row) { return Y[row]; }


    /* ═══════════════════════════════════════════════════════
       CALIBRATED EXPLORER
    ═══════════════════════════════════════════════════════ */
    const explorerSvg = document.getElementById('bb-board-svg');
    const explorerMetalLayer = document.getElementById('bb-metal-layer');
    const explorerHoleLayer = document.getElementById('bb-hole-layer');
    const explorerTitle = document.getElementById('bb-inspector-title');
    const explorerDesc = document.getElementById('bb-inspector-desc');
    const explorerSignalText = document.getElementById('bb-signal-text');
    const explorerSignalDot = document.getElementById('bb-signal-dot');
    const explorerSignalBar = document.getElementById('bb-signal-bar-fill');
    const explorerXrayToggle = document.getElementById('bb-xray-toggle');

    const EXPLORER_CONFIG = {
      cols: 30,
      startX: 80,
      spacing: 28.5,
      railYs: {
        topPos: 52,
        topNeg: 96,
        bottomPos: 474,
        bottomNeg: 518,
      },
      tieRowsTop: ['a', 'b', 'c', 'd', 'e'],
      tieRowsBottom: ['f', 'g', 'h', 'i', 'j'],
      tieYs: {
        a: 156,
        b: 184.5,
        c: 213,
        d: 241.5,
        e: 270,
        f: 320,
        g: 348.5,
        h: 377,
        i: 405.5,
        j: 434,
      },
      selectedHole: null,
      selectedStripId: null,
      xray: false,
    };

    const explorerStripMeta = new Map();
    const explorerHoleGroups = [];
    const SVG_NS = 'http://www.w3.org/2000/svg';

    function createSvgEl(tag, attrs) {
      const el = document.createElementNS(SVG_NS, tag);
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
      return el;
    }

    function explorerColumnX(colIndex) {
      return EXPLORER_CONFIG.startX + (colIndex * EXPLORER_CONFIG.spacing);
    }

    function explorerSetStripState(stripId, state) {
      const strip = explorerStripMeta.get(stripId);
      if (!strip) return;
      strip.metal.classList.remove('is-active', 'is-visible');
      strip.flow.classList.remove('is-active', 'is-visible');
      if (state === 'active') {
        strip.metal.classList.add('is-active');
        strip.flow.classList.add('is-active');
      } else if (state === 'visible') {
        strip.metal.classList.add('is-visible');
        strip.flow.classList.add('is-visible');
      }
    }

    function explorerClearSelection() {
      explorerHoleGroups.forEach(group => group.classList.remove('is-selected'));
      explorerStripMeta.forEach((_, stripId) => {
        explorerSetStripState(stripId, EXPLORER_CONFIG.xray ? 'visible' : 'hidden');
      });
      EXPLORER_CONFIG.selectedHole = null;
      EXPLORER_CONFIG.selectedStripId = null;
      explorerTitle.textContent = 'Ready to Probe';
      explorerDesc.textContent = 'Click any socket on the board to visualize the hidden metal strip that connects it to the rest of the circuit.';
      explorerSignalText.textContent = 'Circuit inactive';
      explorerSignalDot.classList.remove('is-live');
      explorerSignalBar.style.width = '0%';
    }

    function explorerSelect(stripId, holeGroup, type) {
      if (EXPLORER_CONFIG.selectedStripId === stripId) {
        explorerClearSelection();
        return;
      }

      explorerHoleGroups.forEach(group => group.classList.remove('is-selected'));
      explorerStripMeta.forEach((_, id) => {
        explorerSetStripState(id, EXPLORER_CONFIG.xray ? 'visible' : 'hidden');
      });

      holeGroup.classList.add('is-selected');
      explorerSetStripState(stripId, 'active');
      EXPLORER_CONFIG.selectedHole = holeGroup;
      EXPLORER_CONFIG.selectedStripId = stripId;
      explorerSignalDot.classList.add('is-live');
      explorerSignalBar.style.width = '100%';

      if (type === 'pos') {
        explorerTitle.textContent = 'Positive Power Rail';
        explorerDesc.textContent = 'This full horizontal rail shares one metal strip. Use it to distribute positive voltage to components anywhere along the row.';
        explorerSignalText.textContent = 'VCC potential shared across the rail';
      } else if (type === 'neg') {
        explorerTitle.textContent = 'Ground Rail';
        explorerDesc.textContent = 'This rail is the return path back to the power source. All of these holes are electrically the same ground node.';
        explorerSignalText.textContent = '0V ground reference active';
      } else {
        explorerTitle.textContent = 'Vertical Terminal Group';
        explorerDesc.textContent = 'In the tie-point area, the five holes in one column share a single hidden metal clip. Components connect by bridging between different strips.';
        explorerSignalText.textContent = 'Shared local node detected';
      }
    }

    function explorerCreateStrip(stripId, points, color, flowColor) {
      const xs = points.map(point => point.x);
      const ys = points.map(point => point.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const isHorizontal = (maxX - minX) >= (maxY - minY);
      const metal = createSvgEl('rect', {
        x: String(minX - 11),
        y: String(minY - 11),
        width: String(Math.max(maxX - minX, 0) + 22),
        height: String(Math.max(maxY - minY, 0) + 22),
        rx: '7',
        fill: color,
        class: 'bb-internal-metal',
      });
      const flow = createSvgEl('line', {
        x1: String(isHorizontal ? minX : points[0].x),
        y1: String(isHorizontal ? points[0].y : minY),
        x2: String(isHorizontal ? maxX : points[0].x),
        y2: String(isHorizontal ? points[0].y : maxY),
        stroke: flowColor,
        'stroke-width': isHorizontal ? '7' : '6',
        class: 'bb-flow-line',
      });
      explorerMetalLayer.appendChild(metal);
      explorerMetalLayer.appendChild(flow);
      explorerStripMeta.set(stripId, { metal, flow });
    }

    function explorerCreateHole(point, stripId, type) {
      const group = createSvgEl('g', { class: 'bb-hole-group' });
      const hitbox = createSvgEl('circle', {
        cx: String(point.x),
        cy: String(point.y),
        r: '13',
        class: 'bb-hole-hitbox',
        tabindex: '0',
        role: 'button',
        'aria-label': point.label,
      });
      const visual = createSvgEl('circle', {
        cx: String(point.x),
        cy: String(point.y),
        r: '5',
        class: 'bb-hole-visual',
      });

      const activate = () => explorerSelect(stripId, group, type);
      hitbox.addEventListener('click', activate);
      hitbox.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });

      group.appendChild(hitbox);
      group.appendChild(visual);
      explorerHoleLayer.appendChild(group);
      explorerHoleGroups.push(group);
    }

    function initExplorer() {
      if (!explorerSvg || !explorerMetalLayer || !explorerHoleLayer) return;

      const railDefinitions = [
        { id: 'rail-top-pos', key: 'topPos', type: 'pos', color: '#fecaca', flow: '#ef4444', label: 'Top positive rail' },
        { id: 'rail-top-neg', key: 'topNeg', type: 'neg', color: '#bfdbfe', flow: '#2563eb', label: 'Top ground rail' },
        { id: 'rail-bottom-pos', key: 'bottomPos', type: 'pos', color: '#fecaca', flow: '#ef4444', label: 'Bottom positive rail' },
        { id: 'rail-bottom-neg', key: 'bottomNeg', type: 'neg', color: '#bfdbfe', flow: '#2563eb', label: 'Bottom ground rail' },
      ];

      railDefinitions.forEach(definition => {
        const points = Array.from({ length: EXPLORER_CONFIG.cols }, (_, index) => ({
          x: explorerColumnX(index),
          y: EXPLORER_CONFIG.railYs[definition.key],
          label: `${definition.label}, hole ${index + 1}`,
        }));
        explorerCreateStrip(definition.id, points, definition.color, definition.flow);
        points.forEach(point => explorerCreateHole(point, definition.id, definition.type));
      });

      for (let col = 0; col < EXPLORER_CONFIG.cols; col += 1) {
        const topStripId = `terminal-top-${col}`;
        const bottomStripId = `terminal-bottom-${col}`;
        const topPoints = EXPLORER_CONFIG.tieRowsTop.map(row => ({
          x: explorerColumnX(col),
          y: EXPLORER_CONFIG.tieYs[row],
          label: `Column ${col + 1}, row ${row}`,
        }));
        const bottomPoints = EXPLORER_CONFIG.tieRowsBottom.map(row => ({
          x: explorerColumnX(col),
          y: EXPLORER_CONFIG.tieYs[row],
          label: `Column ${col + 1}, row ${row}`,
        }));
        explorerCreateStrip(topStripId, topPoints, '#dcfce7', '#16a34a');
        explorerCreateStrip(bottomStripId, bottomPoints, '#dcfce7', '#16a34a');
        topPoints.forEach(point => explorerCreateHole(point, topStripId, 'terminal'));
        bottomPoints.forEach(point => explorerCreateHole(point, bottomStripId, 'terminal'));
      }

      const labelLayer = document.getElementById('bb-label-layer');
      if (labelLayer) {
        for (let col = 0; col < EXPLORER_CONFIG.cols; col += 2) {
          labelLayer.appendChild(createSvgEl('text', {
            x: String(explorerColumnX(col)),
            y: '546',
            class: 'bb-col-label',
            'text-anchor': 'middle',
            'font-size': '10',
            fill: '#94a3b8',
          })).textContent = String(col + 1);
        }
      }

      explorerClearSelection();
    }

    if (explorerXrayToggle) {
      explorerXrayToggle.addEventListener('click', function () {
        EXPLORER_CONFIG.xray = !EXPLORER_CONFIG.xray;
        explorerXrayToggle.classList.toggle('is-on', EXPLORER_CONFIG.xray);
        explorerXrayToggle.setAttribute('aria-pressed', EXPLORER_CONFIG.xray ? 'true' : 'false');
        explorerXrayToggle.textContent = EXPLORER_CONFIG.xray ? 'Disable X-Ray' : 'Enable X-Ray';
        explorerStripMeta.forEach((_, stripId) => {
          const state = stripId === EXPLORER_CONFIG.selectedStripId ? 'active' : (EXPLORER_CONFIG.xray ? 'visible' : 'hidden');
          explorerSetStripState(stripId, state);
        });
      });
    }

    initExplorer();

    /* ═══════════════════════════════════════════════════════
       CIRCUIT CHALLENGE ENGINE
    ═══════════════════════════════════════════════════════ */
    const chalCanvas  = document.getElementById('bb-chal-canvas');
    const chalCtx     = chalCanvas ? chalCanvas.getContext('2d') : null;
    const chalFeedback = document.getElementById('bb-chal-feedback');
    const nextBtn     = document.getElementById('bb-next-btn');
    const resetBtn    = document.getElementById('bb-reset-btn');
    const palette     = document.getElementById('bb-palette');
    const hintText    = document.getElementById('bb-hint-text');
    const chalGoal    = document.getElementById('chal-goal');
    const chalTitle   = document.getElementById('chal-title');
    const chalInstr   = document.getElementById('chal-instruction');

    // Challenge breadboard uses 12 columns, same row layout
    const CHAL_COLS  = 12;
    const CHAL_LEFT  = 70;
    const CHAL_COL_SP = 58;

    function chalHoleX(col) { return CHAL_LEFT + (col - 1) * CHAL_COL_SP; }
    function chalHoleY(row) { return Y[row]; }

    // ── State ──────────────────────────────────────────────
    const state = {
      challenge: 1,          // 1-4
      selectedTool: null,    // 'wire-red' | 'wire-black' | 'resistor' | 'led'
      pendingFrom: null,     // { row, col } — first click
      placedComponents: [],  // { type, from:{row,col}, to:{row,col} }
      chalComplete: [false, false, false, false], // per challenge
      ledOn: false,
    };








    function isAllowedStart(point) {
      return allowedEndpoints(state.challenge, state.selectedTool)
        .some(expected => pointMatches(point, expected));
    }

    function isAllowedPlacement(from, to) {
      const test = { type: state.selectedTool, from, to };
      if (state.challenge === 1 && state.selectedTool === 'wire-red') {
        return connects(test, { special: 'bat+' }, { row: 'rail-top-plus' });
      }
      if (state.challenge === 1 && state.selectedTool === 'wire-black') {
        return connects(test, { special: 'bat-' }, { row: 'rail-top-minus' });
      }
      if (state.challenge === 2 && state.selectedTool === 'resistor') {
        return connects(test, { row: 'a', col: 3 }, { row: 'a', col: 6 });
      }
      if (state.challenge === 3 && state.selectedTool === 'led') {
        return pointMatches(from, { row: 'b', col: 6 })
          && pointMatches(to, { row: 'b', col: 9 });
      }
      if (state.challenge === 4 && state.selectedTool === 'wire-red') {
        return connects(test, { row: 'rail-top-plus' }, { row: 'a', col: 3 });
      }
      if (state.challenge === 4 && state.selectedTool === 'wire-black') {
        return connects(test, { row: 'rail-top-minus' }, { row: 'a', col: 9 });
      }
      return false;
    }

    // ── Challenge definitions ──────────────────────────────
    const CHALLENGES = [
      {
        id: 1,
        goal: 'Challenge 1 of 4',
        title: 'Power Up the Rails',
        instruction: 'Connect the battery to the breadboard. Select <strong>Red Wire</strong>, click the battery <strong>+ terminal</strong> (glowing red dot, top-left), then click anywhere on the <strong>+ power rail</strong>. Then select <strong>Black Wire</strong> and connect the battery <strong>−</strong> to the <strong>− rail</strong>.',
        hint: 'A complete circuit needs power. The battery terminals are the two dots to the left of the board. Connect + (red) to the + rail, and − (black) to the − rail.',
        availableTools: ['wire-red', 'wire-black'],
        // Validate: need wire-red from battery+ to rail-top-plus, wire-black from battery- to rail-top-minus
        validate(comps) {
          return hasPoweredRails(comps);
        }
      },
      {
        id: 2,
        goal: 'Challenge 2 of 4',
        title: 'Add the Resistor',
        instruction: 'Select <strong>Resistor</strong> from the palette. Click hole <strong>row a, column 3</strong> as the first lead, then click <strong>row a, column 6</strong> as the second lead. This places a 220 Ω current-limiting resistor.',
        hint: 'A resistor limits the current flowing to the LED. Place it flat across the board — both leads in the same half (rows a–e), connecting column 3 to column 6.',
        availableTools: ['wire-red', 'wire-black', 'resistor'],
        validate(comps) {
          return hasResistor(comps);
        }
      },
      {
        id: 3,
        goal: 'Challenge 3 of 4',
        title: 'Place the LED',
        instruction: 'Select <strong>LED</strong>. Click <strong>row b, column 6</strong> for the anode (+), then <strong>row b, column 9</strong> for the cathode (−). Rows a–e share each column, so the LED joins the resistor through column 6 without sharing a hole.',
        hint: 'Polarity matters: place the LED anode at b6 and cathode at b9. The hidden vertical strips connect a6 to b6 and a9 to b9.',
        availableTools: ['wire-red', 'wire-black', 'resistor', 'led'],
        validate(comps) {
          return hasLed(comps);
        }
      },
      {
        id: 4,
        goal: 'Challenge 4 of 4',
        title: 'Close the Loop',
        instruction: 'Finish both sides of the loop. Use <strong>Red Wire</strong> from the <strong>+ rail</strong> to <strong>a3</strong>. Then use <strong>Black Wire</strong> from <strong>a9</strong> to the <strong>− rail</strong>.',
        hint: 'Current must have a complete path: + rail → wire → resistor → LED → wire → − rail. Without both wires the circuit is open and the LED stays dark.',
        availableTools: ['wire-red', 'wire-black', 'resistor', 'led'],
        validate(comps) {
          return hasPoweredRails(comps) && hasResistor(comps) && hasLed(comps) && hasLoopWires(comps);
        }
      },
    ];

    // ── Battery terminal positions (special anchors left of board) ──
    const BAT_PLUS_X  = 28;
    const BAT_PLUS_Y  = chalHoleY('rail-top-plus');
    const BAT_MINUS_X = 28;
    const BAT_MINUS_Y = chalHoleY('rail-top-minus');

    // ── Drawing the challenge board ────────────────────────
    let ledGlowPhase = 0;
    let animFrame = null;

    function drawChalBoard() {
      if (!chalCtx) return;
      const W = chalCanvas.width;
      const H = chalCanvas.height;
      chalCtx.clearRect(0, 0, W, H);

      // Background
      chalCtx.fillStyle = '#1a1a2e';
      chalCtx.beginPath();
      if (chalCtx.roundRect) chalCtx.roundRect(0, 0, W, H, 10);
      else chalCtx.rect(0, 0, W, H);
      chalCtx.fill();

      // Board body
      chalCtx.fillStyle = '#2d2d1e';
      chalCtx.beginPath();
      if (chalCtx.roundRect) chalCtx.roundRect(6, 6, W - 12, H - 12, 8);
      else chalCtx.rect(6, 6, W - 12, H - 12);
      chalCtx.fill();

      // Rail bands
      function railBand(row, color) {
        const y = chalHoleY(row);
        chalCtx.fillStyle = color + '22';
        chalCtx.fillRect(CHAL_LEFT - 4, y - HOLE_R - 5, (CHAL_COLS - 1) * CHAL_COL_SP + 8, HOLE_R * 2 + 10);
      }
      railBand('rail-top-plus', '#ff3b30');
      railBand('rail-top-minus', '#0a84ff');
      railBand('rail-bot-minus', '#0a84ff');
      railBand('rail-bot-plus', '#ff3b30');

      // Center gap
      chalCtx.fillStyle = '#ff950033';
      chalCtx.fillRect(CHAL_LEFT - 4, Y['gap'] - 2, (CHAL_COLS - 1) * CHAL_COL_SP + 8, 14);

      // Draw placed components (wires / resistor / LED)
      state.placedComponents.forEach(comp => drawComponent(comp));

      // Pending wire preview (from source)
      if (state.pendingFrom) {
        const pf = state.pendingFrom;
        const fx = pf.special === 'bat+' ? BAT_PLUS_X  :
                   pf.special === 'bat-' ? BAT_MINUS_X :
                   chalHoleX(pf.col);
        const fy = pf.special === 'bat+' ? BAT_PLUS_Y  :
                   pf.special === 'bat-' ? BAT_MINUS_Y :
                   chalHoleY(pf.row);
        chalCtx.strokeStyle = state.selectedTool === 'wire-red' ? '#ff3b30aa' : '#b8b8beaa';
        chalCtx.lineWidth = 2;
        chalCtx.setLineDash([4, 4]);
        chalCtx.beginPath();
        chalCtx.arc(fx, fy, HOLE_R + 4, 0, Math.PI * 2);
        chalCtx.stroke();
        chalCtx.setLineDash([]);
      }

      // Row labels
      const rowKeys = Object.keys(ROW_META);
      rowKeys.forEach(row => {
        if (row === 'gap') return;
        const meta = ROW_META[row];
        const y = chalHoleY(row);
        chalCtx.fillStyle = meta.color + 'cc';
        chalCtx.font = 'bold 9px Inter, sans-serif';
        chalCtx.textAlign = 'right';
        chalCtx.fillText(meta.label, CHAL_LEFT - 8, y + 3);
      });

      // Holes
      rowKeys.forEach(row => {
        if (row === 'gap') return;
        const meta = ROW_META[row];
        const y = chalHoleY(row);
        for (let col = 1; col <= CHAL_COLS; col++) {
          const x = chalHoleX(col);
          const isTarget = isTargetHole(row, col);
          const isPending = state.pendingFrom &&
                            !state.pendingFrom.special &&
                            state.pendingFrom.row === row &&
                            state.pendingFrom.col === col;
          // Outer
          chalCtx.beginPath();
          chalCtx.arc(x, y, HOLE_R + 1, 0, Math.PI * 2);
          chalCtx.fillStyle = isPending ? '#ffcc00' : isTarget ? '#ffd60a66' : '#ffffff11';
          chalCtx.fill();
          // Metal face
          chalCtx.beginPath();
          chalCtx.arc(x, y, HOLE_R, 0, Math.PI * 2);
          chalCtx.fillStyle = isPending ? '#ffcc00' : isTarget ? '#ffd60a' : meta.color + '99';
          chalCtx.fill();
          // Inner
          chalCtx.beginPath();
          chalCtx.arc(x, y, HOLE_R - 2.5, 0, Math.PI * 2);
          chalCtx.fillStyle = '#111118';
          chalCtx.fill();
        }
      });

      // Column numbers
      chalCtx.fillStyle = '#ffffff33';
      chalCtx.font = '8px Inter, sans-serif';
      chalCtx.textAlign = 'center';
      for (let col = 1; col <= CHAL_COLS; col++) {
        chalCtx.fillText(String(col), chalHoleX(col), H - 8);
      }

      // Battery terminals
      drawBatteryTerminals();

      // LED glow if on
      if (state.ledOn) {
        drawLEDGlow();
      }
    }

    function drawBatteryTerminals() {
      function drawTargetRing(special, x, y) {
        const point = { special };
        const isTarget = state.pendingFrom
          ? isAllowedPlacement(state.pendingFrom, point)
          : (state.selectedTool && isAllowedStart(point));
        if (!isTarget) return;
        chalCtx.beginPath();
        chalCtx.arc(x, y, 14, 0, Math.PI * 2);
        chalCtx.strokeStyle = '#ffd60a';
        chalCtx.lineWidth = 3;
        chalCtx.stroke();
      }

      drawTargetRing('bat+', BAT_PLUS_X, BAT_PLUS_Y);
      drawTargetRing('bat-', BAT_MINUS_X, BAT_MINUS_Y);

      // + terminal
      chalCtx.beginPath();
      chalCtx.arc(BAT_PLUS_X, BAT_PLUS_Y, 9, 0, Math.PI * 2);
      chalCtx.fillStyle = '#ff3b30';
      chalCtx.fill();
      chalCtx.fillStyle = '#fff';
      chalCtx.font = 'bold 11px Inter, sans-serif';
      chalCtx.textAlign = 'center';
      chalCtx.fillText('+', BAT_PLUS_X, BAT_PLUS_Y + 4);

      // − terminal
      chalCtx.beginPath();
      chalCtx.arc(BAT_MINUS_X, BAT_MINUS_Y, 9, 0, Math.PI * 2);
      chalCtx.fillStyle = '#0a84ff';
      chalCtx.fill();
      chalCtx.fillStyle = '#fff';
      chalCtx.font = 'bold 14px Inter, sans-serif';
      chalCtx.textAlign = 'center';
      chalCtx.fillText('−', BAT_MINUS_X, BAT_MINUS_Y + 4);

      // Battery label
      chalCtx.fillStyle = '#ffffff66';
      chalCtx.font = '8px Inter, sans-serif';
      chalCtx.textAlign = 'center';
      chalCtx.fillText('BAT', BAT_PLUS_X, BAT_PLUS_Y - 14);
    }

    function drawComponent(comp) {
      const { type, from, to } = comp;
      const fx = from.special === 'bat+' ? BAT_PLUS_X  :
                 from.special === 'bat-' ? BAT_MINUS_X :
                 chalHoleX(from.col);
      const fy = from.special === 'bat+' ? BAT_PLUS_Y  :
                 from.special === 'bat-' ? BAT_MINUS_Y :
                 chalHoleY(from.row);
      const tx = to.special === 'bat+' ? BAT_PLUS_X  :
                 to.special === 'bat-' ? BAT_MINUS_X :
                 chalHoleX(to.col);
      const ty = to.special === 'bat+' ? BAT_PLUS_Y  :
                 to.special === 'bat-' ? BAT_MINUS_Y :
                 chalHoleY(to.row);

      if (type === 'wire-red' || type === 'wire-black') {
        chalCtx.strokeStyle = type === 'wire-red' ? '#ff3b30' : '#a1a1aa';
        chalCtx.lineWidth = 3.5;
        chalCtx.lineCap = 'round';
        chalCtx.shadowColor = type === 'wire-red' ? '#ff3b3066' : '#ffffff33';
        chalCtx.shadowBlur = 6;
        chalCtx.beginPath();
        chalCtx.moveTo(fx, fy);
        // Slight curve for visual interest
        const mx = (fx + tx) / 2;
        const my = (fy + ty) / 2 - 8;
        chalCtx.quadraticCurveTo(mx, my, tx, ty);
        chalCtx.stroke();
        chalCtx.shadowBlur = 0;
      } else if (type === 'resistor') {
        drawResistor(fx, fy, tx, ty);
      } else if (type === 'led') {
        drawLED(fx, fy, tx, ty);
      }
    }

    function drawResistor(fx, fy, tx, ty) {
      // Lead lines
      chalCtx.strokeStyle = '#c8a84b';
      chalCtx.lineWidth = 2;
      const cx = (fx + tx) / 2;
      const bw = Math.abs(tx - fx) * 0.45;
      const bh = 7;

      chalCtx.beginPath();
      chalCtx.moveTo(fx, fy);
      chalCtx.lineTo(cx - bw, fy);
      chalCtx.stroke();
      chalCtx.beginPath();
      chalCtx.moveTo(tx, ty);
      chalCtx.lineTo(cx + bw, ty);
      chalCtx.stroke();

      // Body
      chalCtx.fillStyle = '#d4a017';
      chalCtx.strokeStyle = '#a07808';
      chalCtx.lineWidth = 1.5;
      chalCtx.beginPath();
      if (chalCtx.roundRect) chalCtx.roundRect(cx - bw, fy - bh, bw * 2, bh * 2, 3);
      else chalCtx.rect(cx - bw, fy - bh, bw * 2, bh * 2);
      chalCtx.fill();
      chalCtx.stroke();

      // Color bands (220Ω: red-red-brown)
      const bands = ['#cc0000', '#cc0000', '#7b3f00', '#c0a000'];
      bands.forEach((color, i) => {
        const bx = cx - bw + 4 + i * ((bw * 2 - 8) / 3.5);
        chalCtx.fillStyle = color;
        chalCtx.fillRect(bx, fy - bh + 1, 3.5, bh * 2 - 2);
      });

      // Label
      chalCtx.fillStyle = '#ffffff88';
      chalCtx.font = '7px Inter, sans-serif';
      chalCtx.textAlign = 'center';
      chalCtx.fillText('220Ω', cx, fy - bh - 3);
    }

    function drawLED(fx, fy, tx, ty) {
      // Leads
      const cx = (fx + tx) / 2;
      const sw = Math.abs(tx - fx) * 0.35;
      chalCtx.strokeStyle = '#aaa';
      chalCtx.lineWidth = 1.5;
      chalCtx.beginPath();
      chalCtx.moveTo(fx, fy);
      chalCtx.lineTo(cx - sw, fy);
      chalCtx.stroke();
      chalCtx.beginPath();
      chalCtx.moveTo(tx, ty);
      chalCtx.lineTo(cx + sw, ty);
      chalCtx.stroke();

      // Triangle (diode body)
      const h = 9;
      chalCtx.fillStyle = state.ledOn ? '#34c759' : '#2d5a3d';
      chalCtx.strokeStyle = state.ledOn ? '#30d158' : '#3a7a50';
      chalCtx.lineWidth = 1.5;
      chalCtx.beginPath();
      chalCtx.moveTo(cx - sw, fy - h);
      chalCtx.lineTo(cx - sw, fy + h);
      chalCtx.lineTo(cx + sw, fy);
      chalCtx.closePath();
      chalCtx.fill();
      chalCtx.stroke();

      // Cathode bar
      chalCtx.strokeStyle = state.ledOn ? '#30d158' : '#3a7a50';
      chalCtx.lineWidth = 2.5;
      chalCtx.beginPath();
      chalCtx.moveTo(cx + sw, fy - h);
      chalCtx.lineTo(cx + sw, fy + h);
      chalCtx.stroke();

      // Light rays when on
      if (state.ledOn) {
        const alpha = 0.4 + 0.3 * Math.sin(ledGlowPhase);
        const rays = [[1, -1], [1.4, -0.5], [1.4, 0.5]];
        rays.forEach(([dx, dy]) => {
          chalCtx.strokeStyle = `rgba(52,199,89,${alpha})`;
          chalCtx.lineWidth = 1.5;
          chalCtx.beginPath();
          chalCtx.moveTo(cx + sw + 4, fy + dy * 3);
          chalCtx.lineTo(cx + sw + 4 + dx * 8, fy + dy * 10);
          chalCtx.stroke();
        });
      }

      // Label
      chalCtx.fillStyle = state.ledOn ? '#34c759' : '#ffffff55';
      chalCtx.font = '7px Inter, sans-serif';
      chalCtx.textAlign = 'center';
      chalCtx.fillText('LED', cx, fy - h - 3);
    }

    function drawLEDGlow() {
      // Large ambient glow around LED position
      const cx = chalHoleX(6) + (chalHoleX(9) - chalHoleX(6)) / 2;
      const cy = chalHoleY('b');
      const alpha = 0.15 + 0.1 * Math.sin(ledGlowPhase);
      const grad = chalCtx.createRadialGradient(cx, cy, 5, cx, cy, 45);
      grad.addColorStop(0, `rgba(52,199,89,${alpha + 0.2})`);
      grad.addColorStop(1, 'rgba(52,199,89,0)');
      chalCtx.fillStyle = grad;
      chalCtx.beginPath();
      chalCtx.arc(cx, cy, 45, 0, Math.PI * 2);
      chalCtx.fill();
    }

    function animateGlow(ts) {
      ledGlowPhase = ts / 600;
      drawChalBoard();
      if (state.ledOn) animFrame = SimKit.frame('#bb-chal-canvas', animateGlow);
    }

    // ── Target hole highlighting ───────────────────────────
    function isTargetHole(row, col) {
      if (!state.selectedTool) return false;
      const point = { row, col };
      return state.pendingFrom
        ? isAllowedPlacement(state.pendingFrom, point)
        : isAllowedStart(point);
    }

    // ── Palette selection ──────────────────────────────────
    if (palette) {
      palette.addEventListener('click', function (e) {
        const btn = e.target.closest('.bb-palette-btn');
        if (!btn || btn.disabled) return;
        const tool = btn.dataset.tool;
        if (state.selectedTool === tool) {
          state.selectedTool = null;
          btn.classList.remove('is-selected');
          btn.setAttribute('aria-pressed', 'false');
        } else {
          palette.querySelectorAll('.bb-palette-btn').forEach(b => {
            b.classList.remove('is-selected');
            b.setAttribute('aria-pressed', 'false');
          });
          state.selectedTool = tool;
          btn.classList.add('is-selected');
          btn.setAttribute('aria-pressed', 'true');
        }
        state.pendingFrom = null;
        if (state.selectedTool) showFeedback('Part selected. Click its first highlighted connection point.', 'info');
        drawChalBoard();
      });
    }

    // ── Hit test on challenge canvas ───────────────────────
    function hitTestChal(mx, my) {
      // Check battery terminals first
      if (Math.hypot(mx - BAT_PLUS_X, my - BAT_PLUS_Y) <= 12)  return { special: 'bat+' };
      if (Math.hypot(mx - BAT_MINUS_X, my - BAT_MINUS_Y) <= 12) return { special: 'bat-' };

      // Check board holes
      const rowKeys = Object.keys(ROW_META);
      for (const row of rowKeys) {
        if (row === 'gap') continue;
        const y = chalHoleY(row);
        for (let col = 1; col <= CHAL_COLS; col++) {
          const x = chalHoleX(col);
          if (Math.hypot(mx - x, my - y) <= HOLE_R + 5) return { row, col };
        }
      }
      return null;
    }

    // ── Canvas click handler ───────────────────────────────
    if (chalCanvas) {
      chalCanvas.addEventListener('click', function (e) {
        if (state.chalComplete[state.challenge - 1]) {
          showFeedback('This step is complete. Choose Next Step to continue.', 'correct');
          return;
        }
        if (!state.selectedTool) {
          showFeedback('Select a component from the palette first.', 'info');
          return;
        }
        const rect = chalCanvas.getBoundingClientRect();
        const scaleX = chalCanvas.width  / rect.width;
        const scaleY = chalCanvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top)  * scaleY;
        const hit = hitTestChal(mx, my);
        if (!hit) return;

        if (!state.pendingFrom) {
          if (!isAllowedStart(hit)) {
            showFeedback('That point is not used for this part in the current step. Check the task card and try again.', 'wrong');
            return;
          }
          // First click — set source
          state.pendingFrom = hit;
          showFeedback('First connection selected. The valid destination is highlighted in yellow.', 'info');
          drawChalBoard();
        } else {
          // Second click — complete placement
          const from = state.pendingFrom;
          const to   = hit;
          state.pendingFrom = null;

          // Avoid placing on same hole
          if (from.row === to.row && from.col === to.col && !from.special && !to.special) {
            showFeedback('Pick two different holes.', 'wrong');
            drawChalBoard();
            return;
          }

          if (!isAllowedPlacement(from, to)) {
            showFeedback('That connection does not match this step. No part was placed—follow the yellow target and try again.', 'wrong');
            drawChalBoard();
            return;
          }

          // Place the component
          state.placedComponents.push({ type: state.selectedTool, from, to });

          // Validate challenge
          const ch = CHALLENGES[state.challenge - 1];
          if (ch.validate(state.placedComponents)) {
            state.chalComplete[state.challenge - 1] = true;
            updateStepPip(state.challenge, 'done');
            if (state.challenge === 4) {
              // All done — light the LED!
              state.ledOn = true;
              showFeedback('🎉 Circuit complete! The LED is lit — you did it!', 'correct');
              if (animFrame) SimKit.frame.cancel('#bb-chal-canvas', animFrame);
              animFrame = SimKit.frame('#bb-chal-canvas', animateGlow);
              nextBtn.textContent = '↺ Try Again';
              nextBtn.classList.add('visible');
            } else {
              showFeedback('✓ Correct connection! Move to the next step.', 'correct');
              nextBtn.textContent = 'Next Step →';
              nextBtn.classList.add('visible');
            }
          } else {
            showFeedback('Placed! Keep adding connections to complete this step.', 'info');
          }
          drawChalBoard();
        }
      });
    }

    function showFeedback(msg, type) {
      if (!chalFeedback) return;
      chalFeedback.textContent = msg;
      chalFeedback.className = 'bb-chal-feedback ' + type;
    }

    function updateStepPip(step, status) {
      const pip = document.getElementById('pip-' + step);
      if (!pip) return;
      pip.classList.remove('is-active', 'is-done');
      if (status === 'done')   pip.classList.add('is-done');
      if (status === 'active') pip.classList.add('is-active');
    }

    // ── Next / Reset buttons ───────────────────────────────
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (state.challenge === 4) {
          // Reset all
          resetChallenge(1);
          return;
        }
        state.challenge++;
        loadChallenge(state.challenge);
        nextBtn.classList.remove('visible');
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        resetChallenge(1);
      });
    }

    function resetChallenge(toStep) {
      state.selectedTool = null;
      state.pendingFrom = null;
      state.placedComponents = [];
      state.ledOn = false;
      state.chalComplete = [false, false, false, false];
      if (animFrame) { SimKit.frame.cancel('#bb-chal-canvas', animFrame); animFrame = null; }

      if (palette) {
        palette.querySelectorAll('.bb-palette-btn').forEach(b => {
          b.classList.remove('is-selected');
          b.setAttribute('aria-pressed', 'false');
        });
      }
      nextBtn.classList.remove('visible');
      chalFeedback.className = 'bb-chal-feedback info';
      chalFeedback.textContent = 'Choose the red wire to begin powering the positive rail.';

      // Reset pips
      for (let i = 1; i <= 4; i++) {
        const pip = document.getElementById('pip-' + i);
        if (pip) { pip.classList.remove('is-active','is-done'); }
      }

      loadChallenge(toStep);
    }

    function loadChallenge(num) {
      state.challenge = num;
      state.selectedTool = null;
      state.pendingFrom = null;
      const ch = CHALLENGES[num - 1];
      if (!ch) return;

      if (chalGoal)  chalGoal.textContent   = ch.goal;
      if (chalTitle) chalTitle.textContent  = ch.title;
      if (chalInstr) chalInstr.innerHTML    = ch.instruction;
      if (hintText)  hintText.textContent   = ch.hint;

      // Enable / disable palette buttons
      if (palette) {
        palette.querySelectorAll('.bb-palette-btn').forEach(btn => {
          const tool = btn.dataset.tool;
          btn.disabled = !ch.availableTools.includes(tool);
          btn.classList.remove('is-selected');
          btn.setAttribute('aria-pressed', 'false');
        });
      }

      updateStepPip(num, 'active');
      if (num > 1) showFeedback('Choose the part named in the task card to continue building.', 'info');
      drawChalBoard();
    }

    // ── Init ───────────────────────────────────────────────
    if (chalCanvas) {
      loadChallenge(1);
    }

    /* ═══════════════════════════════════════════════════════
       3D BREADBOARD VIEW PRESETS
    ═══════════════════════════════════════════════════════ */
    const breadboardModel = document.getElementById('bb-model');
    const modelViewButtons = document.querySelectorAll('.bb-view-btn');
    const modelRuleButtons = document.querySelectorAll('.bb-model-rule[data-rule]');
    const modelFeedbackTitle = document.getElementById('bb-model-feedback-title');
    const modelFeedbackText = document.getElementById('bb-model-feedback-text');
    const modelProgress = document.getElementById('bb-model-progress');
    const exploredRules = new Set();
    const explodeSlider = document.getElementById('bb-explode');
    let selectedModelRule = null;
    function updateShell() {
      const amount = Number(explodeSlider.value);
      document.getElementById('bb-explode-value').textContent = `${amount}% · ${amount === 0 ? 'Assembled' : amount === 100 ? 'Exploded' : 'Opening'}`;
      explodeSlider.setAttribute('aria-valuetext', `${amount} percent, ${amount === 0 ? 'assembled' : 'shell lifted'}`);
      if (breadboardModel.loaded) {
        breadboardModel.pause();
        breadboardModel.currentTime = amount / 100 * .999;
        const lift = -1.3 * (1 - amount / 100);
        breadboardModel.updateHotspot({name: 'hotspot-rail', position: `-4.5 ${1.82 + lift} 3.35`});
        breadboardModel.updateHotspot({name: 'hotspot-gap', position: `0 ${1.82 + lift} 0`});
      }
    }
    function highlightModelRule(name) {
      selectedModelRule = name;
      const colors = {rail: [1, .12, .04], five: [.02, .8, .12], gap: [1, .45, .02]};
      if (breadboardModel.model) {
        ['rail', 'five', 'gap'].forEach(key => {
          const material = breadboardModel.model.materials.find(m => m.name === `breadboard-focus${key[0].toUpperCase() + key.slice(1)}`);
          if (material) material.setEmissiveFactor(key === name ? colors[key] : [0, 0, 0]);
        });
      }
      document.querySelectorAll('.bb-hotspot').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.rule === name)));
    }
    explodeSlider.addEventListener('input', updateShell);
    breadboardModel.addEventListener('load', () => {
      explodeSlider.disabled = false;
      updateShell();
      highlightModelRule(selectedModelRule);
      document.getElementById('bb-model-status').textContent = 'Move the slider or use its arrow keys to assemble and open the board.';
    });
    breadboardModel.addEventListener('error', () => {
      document.getElementById('bb-model-status').textContent = 'The 3D model could not load. Use the connection rules and the interactive board below.';
    });
    const modelViews = {
      cutaway: {
        title: 'Cutaway view: match holes to clips',
        text: 'The raised plastic shell lets you trace each dark socket straight down to the gold strip that grips it.'
      },
      top: {
        title: 'Top view: where components are placed',
        text: 'From above you see the layout printed on a real board. Rotate back to the cutaway whenever you need to check what connects underneath.'
      },
      underneath: {
        title: 'Underside view: the hidden circuit map',
        text: 'Long gold strips distribute power. Short gold strips join groups of five. Empty space at the center keeps the two halves separate.'
      }
    };
    const modelRules = {
      rail: {
        orbit: '18deg 112deg 105%',
        view: 'underneath',
        title: 'Power rail: one long connection',
        text: 'Follow one gold strip from left to right. Every socket directly above that strip is electrically connected—even when the holes are far apart. Each rail is separate; colored lines do not supply power. Real boards may split a rail halfway.'
      },
      five: {
        orbit: '325deg 78deg 100%',
        view: 'cutaway',
        title: 'Tie points: one group of five',
        text: 'This short gold clip sits below five sockets in one column. A lead in any one of those five can connect to a lead in any of the other four.'
      },
      gap: {
        orbit: '0deg 24deg 105%',
        view: 'top',
        title: 'Center gap: a deliberate break',
        text: 'No metal crosses the trench. A chip straddles it so pins on opposite sides do not accidentally share the same connection.'
      }
    };

    function setModelCamera(orbit, viewName) {
      if (breadboardModel) breadboardModel.setAttribute('camera-orbit', orbit);
      modelViewButtons.forEach(function (button) {
        const isActive = button.dataset.view === viewName;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function activateModelRule(ruleName) {
      const rule = modelRules[ruleName];
      if (!rule) return;
      explodeSlider.value = ruleName === 'gap' ? 55 : 100;
      updateShell();
      highlightModelRule(ruleName);
      setModelCamera(rule.orbit, rule.view);
      exploredRules.add(ruleName);
      modelRuleButtons.forEach(function (button) {
        const isCurrent = button.dataset.rule === ruleName;
        button.classList.toggle('is-active', isCurrent);
        button.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
        if (exploredRules.has(button.dataset.rule)) button.classList.add('is-explored');
      });
      if (modelFeedbackTitle) modelFeedbackTitle.textContent = rule.title;
      if (modelFeedbackText) modelFeedbackText.textContent = rule.text;
      if (modelProgress) {
        modelProgress.textContent = exploredRules.size === 3
          ? 'All 3 ideas explored ✓'
          : `${exploredRules.size} of 3 ideas explored`;
      }
    }

    modelViewButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        highlightModelRule(null);
        setModelCamera(button.dataset.orbit, button.dataset.view);
        modelRuleButtons.forEach(function (ruleButton) {
          ruleButton.classList.remove('is-active');
          ruleButton.setAttribute('aria-pressed', 'false');
        });
        const view = modelViews[button.dataset.view];
        if (view && modelFeedbackTitle) modelFeedbackTitle.textContent = view.title;
        if (view && modelFeedbackText) modelFeedbackText.textContent = view.text;
      });
    });
    document.getElementById('bb-model-reset').addEventListener('click', () => {
      explodeSlider.value = 100;
      updateShell();
      document.querySelector('.bb-view-btn[data-view="cutaway"]').click();
      breadboardModel.setAttribute('camera-target', '0m .65m 0m');
    });
    modelRuleButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function () { activateModelRule(button.dataset.rule); });
    });
    document.querySelectorAll('.bb-hotspot[data-rule]').forEach(function (button) {
      button.addEventListener('click', function () { activateModelRule(button.dataset.rule); });
    });

    /* ═══════════════════════════════════════════════════════
       QUICK CHECK QUIZ
    ═══════════════════════════════════════════════════════ */
    document.querySelectorAll('.bb-question').forEach(function (question) {
      const answer      = question.dataset.answer;
      const explanation = question.dataset.explanation;
      const feedback    = question.querySelector('.bb-q-feedback');
      const options     = question.querySelectorAll('.bb-option');

      options.forEach(function (opt) {
        opt.addEventListener('click', function () {
          if (opt.disabled) return;
          options.forEach(function (o) {
            o.disabled = true;
            o.classList.remove('is-correct', 'is-wrong');
            if (o.dataset.choice === answer) o.classList.add('is-correct');
          });
          if (opt.dataset.choice !== answer) opt.classList.add('is-wrong');

          if (opt.dataset.choice === answer) {
            feedback.textContent = '✓ Correct. ' + explanation;
            feedback.style.color = '#34c759';
          } else {
            feedback.textContent = '✗ Not quite. ' + explanation;
            feedback.style.color = '#ff3b30';
          }
        });
      });
    });

  })();
