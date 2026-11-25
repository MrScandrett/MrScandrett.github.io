(function (root) {
  'use strict';

  var FOOD_WEB_NODES = [
    { id: 'grass', label: 'Grass', x: 150, y: 500, color: '#5cb85c', level: 'Producer' },
    { id: 'berries', label: 'Berries', x: 350, y: 500, color: '#5cb85c', level: 'Producer' },
    { id: 'rabbit', label: 'Rabbit', x: 150, y: 350, color: '#f0ad4e', level: 'Primary Consumer' },
    { id: 'mouse', label: 'Mouse', x: 350, y: 350, color: '#f0ad4e', level: 'Primary Consumer' },
    { id: 'grasshopper', label: 'Grasshopper', x: 550, y: 350, color: '#f0ad4e', level: 'Primary Consumer' },
    { id: 'frog', label: 'Frog', x: 550, y: 200, color: '#d9534f', level: 'Secondary Consumer' },
    { id: 'snake', label: 'Snake', x: 350, y: 200, color: '#d9534f', level: 'Secondary Consumer' },
    { id: 'owl', label: 'Owl', x: 450, y: 80, color: '#8c564b', level: 'Tertiary Consumer' },
    { id: 'fox', label: 'Fox', x: 200, y: 100, color: '#8c564b', level: 'Tertiary Consumer' }
  ];

  var FOOD_WEB_EDGES = [
    ['grass', 'rabbit'],
    ['grass', 'mouse'],
    ['grass', 'grasshopper'],
    ['berries', 'mouse'],
    ['rabbit', 'fox'],
    ['mouse', 'fox'],
    ['mouse', 'snake'],
    ['mouse', 'owl'],
    ['grasshopper', 'frog'],
    ['frog', 'snake'],
    ['snake', 'owl'],
    ['frog', 'owl']
  ];

  var PP_PRESETS = {
    balanced: {
      label: 'Balanced Cycle',
      rabbits: 40, foxes: 8, rabbitRepro: 1.10, predation: 0.045, foxGrowth: 0.020, foxDeath: 0.90, logistic: false
    },
    overpredation: {
      label: 'Over-Predation Crash',
      rabbits: 35, foxes: 18, rabbitRepro: 0.85, predation: 0.090, foxGrowth: 0.030, foxDeath: 0.65, logistic: false
    },
    removal: {
      label: 'Predator Removal Boom',
      rabbits: 30, foxes: 1, rabbitRepro: 1.40, predation: 0.010, foxGrowth: 0.010, foxDeath: 1.60, logistic: true
    },
    slowprey: {
      label: 'Slow-Breeding Prey',
      rabbits: 60, foxes: 6, rabbitRepro: 0.55, predation: 0.035, foxGrowth: 0.018, foxDeath: 0.70, logistic: true
    }
  };

  var CHECK_QUESTIONS = [
    {
      id: 'arrows',
      prompt: 'In a food web diagram, what does an arrow from Grass → Rabbit represent?',
      options: [
        { key: 'a', text: 'Rabbits chase grass across the field' },
        { key: 'b', text: 'Energy and matter flow from grass into the rabbit when eaten' },
        { key: 'c', text: 'Grass depends on rabbits for sunlight' }
      ],
      answer: 'b',
      explanation: 'Food web arrows always point in the direction energy and matter move: from food source to consumer.'
    },
    {
      id: 'cascade',
      prompt: 'In our meadow web, suppose Mouse and Rabbit are both removed. What happens to Fox?',
      options: [
        { key: 'a', text: 'Fox starves because both of its prey sources are gone' },
        { key: 'b', text: 'Fox switches to eating Grass directly' },
        { key: 'c', text: 'Fox population immediately doubles' }
      ],
      answer: 'a',
      explanation: 'In this web, Fox feeds only on Rabbit and Mouse; losing every incoming food arrow triggers starvation.'
    },
    {
      id: 'tenpercent',
      prompt: 'Why is only roughly 10% of energy passed from one trophic level to the next?',
      options: [
        { key: 'a', text: 'Predators ignore 90% of the ecosystem' },
        { key: 'b', text: 'Most energy is used in cellular respiration, movement, and lost as heat or indigestible waste' },
        { key: 'c', text: 'Decomposers destroy sunlight before plants absorb it' }
      ],
      answer: 'b',
      explanation: 'Organisms burn most consumed chemical energy just staying alive, radiating heat and leaving undigested matter behind.'
    },
    {
      id: 'lag',
      prompt: 'Why does the fox population keep rising briefly even after the rabbit population starts falling?',
      options: [
        { key: 'a', text: 'Rabbits are still abundant enough that fox birth rate temporarily exceeds fox death rate' },
        { key: 'b', text: 'Foxes reproduce faster when they are starving' },
        { key: 'c', text: 'Time runs backward in predator-prey models' }
      ],
      answer: 'a',
      explanation: 'As long as rabbit density stays above the break-even threshold (c·R > d), foxes continue to show net positive growth before scarcity catches up.'
    }
  ];

  function computeStarving(removedIds, nodes, edges) {
    var nodeList = nodes || FOOD_WEB_NODES;
    var edgeList = edges || FOOD_WEB_EDGES;
    var removed = removedIds instanceof Set ? removedIds : new Set(removedIds || []);
    var starving = new Set();
    var changed = true;
    while (changed) {
      changed = false;
      nodeList.forEach(function (n) {
        if (removed.has(n.id) || starving.has(n.id)) return;
        var incoming = edgeList.filter(function (e) { return e[1] === n.id; });
        if (incoming.length === 0) return;
        var allGone = incoming.every(function (e) {
          return removed.has(e[0]) || starving.has(e[0]);
        });
        if (allGone) {
          starving.add(n.id);
          changed = true;
        }
      });
    }
    return starving;
  }

  function computeEnergyPyramid(producerEnergy, efficiencyPct) {
    var base = Math.max(100, Number(producerEnergy) || 10000);
    var eff = Math.max(0.01, Math.min(0.5, (Number(efficiencyPct) || 10) / 100));
    var labels = ['Producers', 'Primary Consumers', 'Secondary Consumers', 'Tertiary Consumers'];
    var levels = [];
    var current = base;
    for (var i = 0; i < labels.length; i++) {
      var passed = i < labels.length - 1 ? current * eff : 0;
      var lost = i < labels.length - 1 ? current - passed : current;
      levels.push({
        tier: i + 1,
        label: labels[i],
        energy: current,
        passedToNext: passed,
        lostAsHeat: lost
      });
      current = current * eff;
    }
    return { efficiencyPct: Math.round(eff * 100), levels: levels };
  }

  function stepLotkaVolterra(state, p, dt) {
    var R = Math.max(0, state.R);
    var F = Math.max(0, state.F);
    var t = state.t || 0;
    var subSteps = 8;
    var h = dt / subSteps;
    var K = p.carryingCapacity || 120;
    for (var i = 0; i < subSteps; i++) {
      var growthTerm = p.logistic ? p.a * R * (1 - R / K) : p.a * R;
      var dR = (growthTerm - p.b * R * F) * h;
      R = Math.max(0, R + dR);
      var dF = (p.c * R * F - p.d * F) * h;
      F = Math.max(0, F + dF);
      t += h;
    }
    return { R: R, F: F, t: t };
  }

  function mountFoodWeb() {
    var box = document.getElementById('simBox');
    var canvas = document.getElementById('fwCanvas');
    if (!box || !canvas || typeof window.SimKit === 'undefined') return;

    var initialized = false;
    var draggedNode = null;
    var hoveredNode = null;
    var dragOffsetX = 0;
    var dragOffsetY = 0;
    var clickCandidate = null;
    var downX = 0;
    var downY = 0;
    var touchDownPos = null;
    var removed = new Set();
    var statusEl = document.getElementById('fwStatus');
    var nodes = FOOD_WEB_NODES.map(function (n) { return Object.assign({}, n); });
    var edges = FOOD_WEB_EDGES;

    var speciesControls = document.getElementById('fwSpecies');
    var connections = document.getElementById('fwConnections');
    nodes.forEach(function (n) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'eco-sim-btn';
      button.style.margin = '0 .4rem .4rem 0';
      button.textContent = n.label;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function () { toggleRemoved(n); });
      if (speciesControls) speciesControls.appendChild(button);
      n.control = button;
    });
    if (connections) {
      edges.forEach(function (pair) {
        var item = document.createElement('li');
        var fromNode = nodes.find(function (n) { return n.id === pair[0]; });
        var toNode = nodes.find(function (n) { return n.id === pair[1]; });
        item.textContent = fromNode.label + ' → ' + toNode.label;
        connections.appendChild(item);
      });
    }

    function updateStatus() {
      if (!statusEl) return;
      nodes.forEach(function (n) {
        n.control.setAttribute('aria-pressed', String(removed.has(n.id)));
        n.control.textContent = (removed.has(n.id) ? 'Restore ' : 'Remove ') + n.label;
      });
      if (removed.size === 0) {
        statusEl.textContent = 'Every species is present. Select one to remove it.';
        return;
      }
      var starving = computeStarving(removed, nodes, edges);
      var removedNames = Array.from(removed).map(function (id) {
        return nodes.find(function (n) { return n.id === id; }).label;
      });
      var msg = 'Removed: ' + removedNames.join(', ') + '.';
      if (starving.size > 0) {
        var starvingNames = Array.from(starving).map(function (id) {
          return nodes.find(function (n) { return n.id === id; }).label;
        });
        msg += ' Starving because their food is gone: ' + starvingNames.join(', ') + '.';
      }
      statusEl.textContent = msg;
    }

    function toggleRemoved(n) {
      if (removed.has(n.id)) removed.delete(n.id);
      else removed.add(n.id);
      updateStatus();
    }

    var sk = null;

    function drawArrow(ctx, fromNode, toNode, dimmed) {
      var dx = toNode.x - fromNode.x;
      var dy = toNode.y - fromNode.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var r = 35;
      if (dist < r * 2) return;
      var dirX = dx / dist;
      var dirY = dy / dist;
      var startX = fromNode.x + dirX * r;
      var startY = fromNode.y + dirY * r;
      var endX = toNode.x - dirX * r;
      var endY = toNode.y - dirY * r;

      ctx.save();
      if (dimmed) ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = dimmed ? '#e2b8b8' : '#9aaea2';
      ctx.lineWidth = 2;
      ctx.stroke();

      var arrowSize = 10;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - dirX * arrowSize - dirY * arrowSize, endY - dirY * arrowSize + dirX * arrowSize);
      ctx.lineTo(endX - dirX * arrowSize + dirY * arrowSize, endY - dirY * arrowSize - dirX * arrowSize);
      ctx.fillStyle = dimmed ? '#e2b8b8' : '#9aaea2';
      ctx.fill();
      ctx.restore();
    }

    function draw() {
      if (!sk || !sk.ctx || !sk.width) return;
      var ctx = sk.ctx;
      var cw = sk.width;
      var ch = sk.height;

      if (!initialized && cw > 0) {
        nodes.forEach(function (n) {
          n.x = n.x + (cw / 2 - 350);
          if (ch < 560) n.y = n.y * (ch / 600);
        });
        initialized = true;
      }

      ctx.clearRect(0, 0, cw, ch);
      var starving = computeStarving(removed, nodes, edges);

      edges.forEach(function (pair) {
        var fromNode = nodes.find(function (n) { return n.id === pair[0]; });
        var toNode = nodes.find(function (n) { return n.id === pair[1]; });
        if (fromNode && toNode) {
          var dimmed = removed.has(pair[0]) || starving.has(pair[0]);
          drawArrow(ctx, fromNode, toNode, dimmed);
        }
      });

      nodes.forEach(function (n) {
        var isRemoved = removed.has(n.id);
        var isStarving = starving.has(n.id);
        ctx.save();
        if (isRemoved) ctx.globalAlpha = 0.3;

        ctx.beginPath();
        ctx.arc(n.x, n.y, 35, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();

        if (isStarving) {
          ctx.strokeStyle = '#d9534f';
          ctx.lineWidth = 4;
        } else {
          ctx.strokeStyle = (n === hoveredNode || n === draggedNode) ? '#333' : '#fff';
          ctx.lineWidth = (n === hoveredNode || n === draggedNode) ? 3 : 2;
        }
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '600 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x, n.y);
        ctx.restore();

        if (isRemoved) {
          ctx.save();
          ctx.strokeStyle = '#8c1f1f';
          ctx.lineWidth = 4;
          var r = 25;
          ctx.beginPath();
          ctx.moveTo(n.x - r, n.y - r);
          ctx.lineTo(n.x + r, n.y + r);
          ctx.moveTo(n.x + r, n.y - r);
          ctx.lineTo(n.x - r, n.y + r);
          ctx.stroke();
          ctx.restore();
        }
      });
    }

    sk = window.SimKit.canvas2d(canvas, { box: box, dpr: 2, onResize: draw });

    function getMousePos(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    canvas.addEventListener('mousemove', function (e) {
      var pos = getMousePos(e);
      if (draggedNode) {
        draggedNode.x = pos.x - dragOffsetX;
        draggedNode.y = pos.y - dragOffsetY;
        canvas.style.cursor = 'grabbing';
        return;
      }
      hoveredNode = null;
      for (var i = nodes.length - 1; i >= 0; i--) {
        var n = nodes[i];
        var dx = pos.x - n.x;
        var dy = pos.y - n.y;
        if (dx * dx + dy * dy < 35 * 35) {
          hoveredNode = n;
          break;
        }
      }
      canvas.style.cursor = hoveredNode ? 'grab' : 'default';
    });

    canvas.addEventListener('mousedown', function (e) {
      if (hoveredNode) {
        draggedNode = hoveredNode;
        clickCandidate = hoveredNode;
        var pos = getMousePos(e);
        dragOffsetX = pos.x - draggedNode.x;
        dragOffsetY = pos.y - draggedNode.y;
        downX = pos.x;
        downY = pos.y;
      } else {
        clickCandidate = null;
      }
    });

    window.addEventListener('mouseup', function (e) {
      if (clickCandidate) {
        var pos = getMousePos(e);
        if (Math.hypot(pos.x - downX, pos.y - downY) < 6) toggleRemoved(clickCandidate);
      }
      draggedNode = null;
      clickCandidate = null;
    });

    canvas.addEventListener('touchstart', function (e) {
      var touch = e.touches[0];
      var rect = canvas.getBoundingClientRect();
      var pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      for (var i = nodes.length - 1; i >= 0; i--) {
        var n = nodes[i];
        var dx = pos.x - n.x;
        var dy = pos.y - n.y;
        if (dx * dx + dy * dy < 35 * 35) {
          draggedNode = n;
          dragOffsetX = pos.x - n.x;
          dragOffsetY = pos.y - n.y;
          touchDownPos = pos;
          e.preventDefault();
          break;
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', function (e) {
      if (draggedNode) {
        var touch = e.touches[0];
        var rect = canvas.getBoundingClientRect();
        draggedNode.x = (touch.clientX - rect.left) - dragOffsetX;
        draggedNode.y = (touch.clientY - rect.top) - dragOffsetY;
        e.preventDefault();
      }
    }, { passive: false });

    canvas.addEventListener('touchend', function (e) {
      if (draggedNode && touchDownPos) {
        var touch = e.changedTouches[0];
        var rect = canvas.getBoundingClientRect();
        var pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        if (Math.hypot(pos.x - touchDownPos.x, pos.y - touchDownPos.y) < 6) toggleRemoved(draggedNode);
      }
      draggedNode = null;
      touchDownPos = null;
    });

    var resetBtn = document.getElementById('fwReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        removed.clear();
        updateStatus();
      });
    }

    updateStatus();
    window.SimKit.loop(draw, { el: window.SimKit.stage('#fwCanvas') });
  }

  function mountEnergyPyramid() {
    var energySlider = document.getElementById('pyrEnergy');
    var effSlider = document.getElementById('pyrEff');
    var energyVal = document.getElementById('pyrEnergyVal');
    var effVal = document.getElementById('pyrEffVal');
    var tiersEl = document.getElementById('pyrTiers');
    var summaryEl = document.getElementById('pyrSummary');
    if (!energySlider || !effSlider || !tiersEl) return;

    function renderPyramid() {
      var model = computeEnergyPyramid(Number(energySlider.value), Number(effSlider.value));
      if (energyVal) energyVal.textContent = Number(energySlider.value).toLocaleString() + ' kcal';
      if (effVal) effVal.textContent = model.efficiencyPct + '%';

      var widths = [100, 72, 48, 30];
      var colors = ['#2e8540', '#d97706', '#c2410c', '#7c2d12'];
      var html = '';
      for (var i = model.levels.length - 1; i >= 0; i--) {
        var lvl = model.levels[i];
        var energyText = lvl.energy >= 10 ? Math.round(lvl.energy).toLocaleString() : lvl.energy.toFixed(1);
        var lostText = lvl.lostAsHeat >= 10 ? Math.round(lvl.lostAsHeat).toLocaleString() : lvl.lostAsHeat.toFixed(1);
        html +=
          '<div class="pyr-row">' +
            '<div class="pyr-bar" style="width:' + widths[i] + '%;background:' + colors[i] + ';">' +
              '<strong>' + lvl.label + '</strong>' +
              '<span>' + energyText + ' kcal</span>' +
            '</div>' +
            '<span class="pyr-loss">' +
              (i < 3 ? '−' + lostText + ' kcal heat/waste' : 'Top tier') +
            '</span>' +
          '</div>';
      }
      tiersEl.innerHTML = html;

      if (summaryEl) {
        var top = model.levels[3];
        var topPct = (top.energy / model.levels[0].energy) * 100;
        summaryEl.textContent =
          'At ' + model.efficiencyPct + '% trophic transfer, only ' +
          (top.energy >= 10 ? Math.round(top.energy).toLocaleString() : top.energy.toFixed(1)) +
          ' kcal (' + topPct.toFixed(2) + '% of producer energy) reaches tertiary consumers.';
      }
    }

    energySlider.addEventListener('input', renderPyramid);
    effSlider.addEventListener('input', renderPyramid);
    renderPyramid();
  }

  function mountPredatorPrey() {
    var box = document.getElementById('ppBox');
    var canvas = document.getElementById('ppCanvas');
    if (!box || !canvas || typeof window.SimKit === 'undefined') return;

    var els = {
      rabbits: document.getElementById('ppRabbits'),
      foxes: document.getElementById('ppFoxes'),
      rabbitRepro: document.getElementById('ppRabbitRepro'),
      predation: document.getElementById('ppPredation'),
      foxGrowth: document.getElementById('ppFoxGrowth'),
      foxDeath: document.getElementById('ppFoxDeath'),
      rabbitsVal: document.getElementById('ppRabbitsVal'),
      foxesVal: document.getElementById('ppFoxesVal'),
      rabbitReproVal: document.getElementById('ppRabbitReproVal'),
      predationVal: document.getElementById('ppPredationVal'),
      foxGrowthVal: document.getElementById('ppFoxGrowthVal'),
      foxDeathVal: document.getElementById('ppFoxDeathVal'),
      rabbitCount: document.getElementById('ppRabbitCount'),
      foxCount: document.getElementById('ppFoxCount'),
      time: document.getElementById('ppTime'),
      toggle: document.getElementById('ppToggle'),
      reset: document.getElementById('ppReset'),
      logistic: document.getElementById('ppLogisticToggle'),
      message: document.getElementById('ppMessage')
    };

    var R = Number(els.rabbits.value);
    var F = Number(els.foxes.value);
    var t = 0;
    var running = true;
    var history = [];
    var samples = document.getElementById('ppSamples');
    var nextSample = 5;
    var HISTORY_WINDOW = 80;

    function params() {
      return {
        a: Number(els.rabbitRepro.value),
        b: Number(els.predation.value),
        c: Number(els.foxGrowth.value),
        d: Number(els.foxDeath.value),
        logistic: !!(els.logistic && els.logistic.checked),
        carryingCapacity: 120
      };
    }

    function syncLabels() {
      els.rabbitsVal.textContent = els.rabbits.value;
      els.foxesVal.textContent = els.foxes.value;
      els.rabbitReproVal.textContent = Number(els.rabbitRepro.value).toFixed(2);
      els.predationVal.textContent = Number(els.predation.value).toFixed(3);
      els.foxGrowthVal.textContent = Number(els.foxGrowth.value).toFixed(3);
      els.foxDeathVal.textContent = Number(els.foxDeath.value).toFixed(2);
    }

    function updateReadout() {
      els.rabbitCount.textContent = Math.round(R);
      els.foxCount.textContent = Math.round(F);
      els.time.textContent = t.toFixed(1);
    }

    function addSample() {
      if (!samples) return;
      var row = document.createElement('tr');
      [t.toFixed(1), Math.round(R), Math.round(F)].forEach(function (value) {
        var cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      samples.appendChild(row);
      while (samples.rows.length > 20) samples.deleteRow(0);
    }

    function resetSim() {
      R = Number(els.rabbits.value);
      F = Number(els.foxes.value);
      t = 0;
      history = [{ t: t, R: R, F: F }];
      nextSample = 5;
      if (samples) samples.innerHTML = '';
      addSample();
      running = true;
      els.toggle.textContent = 'Pause';
      els.message.textContent = '';
      syncLabels();
      updateReadout();
    }

    function step(dt) {
      if (!running) return;
      var next = stepLotkaVolterra({ R: R, F: F, t: t }, params(), dt);
      R = next.R;
      F = next.F;
      t = next.t;
      history.push({ t: t, R: R, F: F });
      if (t >= nextSample) {
        addSample();
        nextSample += 5;
      }
      while (history.length && history[0].t < t - HISTORY_WINDOW) history.shift();

      if (R <= 0.05 && F <= 0.05) {
        els.message.textContent = 'Both populations collapsed to zero. Try lowering the predation rate or raising the reproduction rate, then reset.';
        running = false;
        els.toggle.textContent = 'Play';
      } else if (F <= 0.05) {
        els.message.textContent = params().logistic
          ? 'The foxes died out — rabbits will now level off at carrying capacity K = 120.'
          : 'The foxes died out — with no predators left, rabbits will now grow unchecked.';
      } else if (R <= 0.05) {
        els.message.textContent = 'The rabbits died out, so the foxes have nothing left to eat.';
      } else {
        els.message.textContent = '';
      }
      updateReadout();
    }

    function niceMax(v) {
      if (v <= 0) return 10;
      var mag = Math.pow(10, Math.floor(Math.log10(v)));
      var n = v / mag;
      var s = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
      return s * mag;
    }

    var sk = null;

    function draw() {
      if (!sk || !sk.ctx || !sk.width) return;
      var ctx = sk.ctx;
      var cw = sk.width;
      var ch = sk.height;
      ctx.clearRect(0, 0, cw, ch);

      var padL = 46, padR = 16, padT = 16, padB = 28;
      var plotW = cw - padL - padR;
      var plotH = ch - padT - padB;
      if (plotW <= 0 || plotH <= 0 || history.length < 2) return;

      var tMin = history[0].t;
      var tMax = Math.max(history[history.length - 1].t, tMin + 1);
      var maxPop = Math.max(10, Math.max.apply(null, history.map(function (p) { return Math.max(p.R, p.F); })));
      var yMax = niceMax(maxPop * 1.1);

      function xFor(pt) { return padL + ((pt - tMin) / (tMax - tMin)) * plotW; }
      function yFor(pop) { return padT + plotH - (pop / yMax) * plotH; }

      ctx.strokeStyle = '#e3ede6';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#536d5f';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      var gridLines = 4;
      for (var i = 0; i <= gridLines; i++) {
        var pop = (yMax / gridLines) * i;
        var y = yFor(pop);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + plotW, y);
        ctx.stroke();
        ctx.fillText(Math.round(pop), padL - 8, y);
      }

      if (els.logistic && els.logistic.checked && yMax >= 120) {
        var ky = yFor(120);
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = 'rgba(26, 127, 75, 0.5)';
        ctx.beginPath();
        ctx.moveTo(padL, ky);
        ctx.lineTo(padL + plotW, ky);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#1a7f4b';
        ctx.fillText('K = 120', padL + plotW - 4, ky - 8);
        ctx.restore();
      }

      function drawLine(color, key) {
        ctx.beginPath();
        history.forEach(function (p, idx) {
          var x = xFor(p.t);
          var y = yFor(p[key]);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      drawLine('#2a6bd6', 'R');
      drawLine('#d9534f', 'F');

      ctx.textAlign = 'left';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillStyle = '#2a6bd6';
      ctx.fillText('— Rabbits', padL, padT + 4);
      ctx.fillStyle = '#d9534f';
      ctx.fillText('— Foxes', padL + 90, padT + 4);
    }

    sk = window.SimKit.canvas2d(canvas, { box: box, dpr: 2, onResize: draw });

    Object.keys(els).forEach(function (key) {
      var el = els[key];
      if (el && el.tagName === 'INPUT' && el.type === 'range') {
        el.addEventListener('input', syncLabels);
      }
    });
    [els.rabbits, els.foxes].forEach(function (el) {
      if (el) el.addEventListener('change', resetSim);
    });

    document.querySelectorAll('[data-pp-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var preset = PP_PRESETS[btn.dataset.ppPreset];
        if (!preset) return;
        els.rabbits.value = preset.rabbits;
        els.foxes.value = preset.foxes;
        els.rabbitRepro.value = preset.rabbitRepro;
        els.predation.value = preset.predation;
        els.foxGrowth.value = preset.foxGrowth;
        els.foxDeath.value = preset.foxDeath;
        if (els.logistic) els.logistic.checked = !!preset.logistic;
        resetSim();
      });
    });

    els.toggle.addEventListener('click', function () {
      running = !running;
      els.toggle.textContent = running ? 'Pause' : 'Play';
    });
    els.reset.addEventListener('click', resetSim);

    resetSim();

    var TIME_SCALE = 2;
    window.SimKit.loop(function (dt) {
      step(Math.min(dt, 0.1) * TIME_SCALE);
      draw();
    }, { el: window.SimKit.stage('#ppCanvas') });
  }

  function mountQuiz() {
    var host = document.getElementById('ecoQuiz');
    var scoreEl = document.getElementById('ecoQuizScore');
    if (!host) return;
    var results = {};
    CHECK_QUESTIONS.forEach(function (q, idx) {
      var card = document.createElement('div');
      card.className = 'eco-quiz-item';
      var optsHtml = q.options.map(function (opt) {
        return '<button type="button" class="eco-quiz-btn" data-opt="' + opt.key + '">' + opt.text + '</button>';
      }).join('');
      card.innerHTML =
        '<p class="eco-quiz-q"><strong>' + (idx + 1) + '.</strong> ' + q.prompt + '</p>' +
        '<div class="eco-quiz-opts">' + optsHtml + '</div>' +
        '<p class="eco-quiz-fb" aria-live="polite"></p>';
      var fb = card.querySelector('.eco-quiz-fb');
      var btns = card.querySelectorAll('.eco-quiz-btn');
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var ok = btn.dataset.opt === q.answer;
          results[q.id] = ok;
          btns.forEach(function (b) {
            var active = b === btn;
            b.classList.toggle('is-selected', active);
            b.setAttribute('aria-pressed', String(active));
          });
          card.classList.toggle('is-correct', ok);
          card.classList.toggle('is-wrong', !ok);
          fb.textContent = (ok ? '✓ Correct. ' : 'Try again. ') + q.explanation;
          if (scoreEl) {
            var count = Object.values(results).filter(Boolean).length;
            scoreEl.textContent = count + ' of ' + CHECK_QUESTIONS.length + ' answered correctly.';
          }
        });
      });
      host.appendChild(card);
    });
  }

  function mount() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    mountFoodWeb();
    mountEnergyPyramid();
    mountPredatorPrey();
    mountQuiz();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount);
    } else {
      mount();
    }
  }

  var api = {
    FOOD_WEB_NODES: FOOD_WEB_NODES,
    FOOD_WEB_EDGES: FOOD_WEB_EDGES,
    PP_PRESETS: PP_PRESETS,
    computeStarving: computeStarving,
    computeEnergyPyramid: computeEnergyPyramid,
    stepLotkaVolterra: stepLotkaVolterra
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.EcosystemsLab = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
