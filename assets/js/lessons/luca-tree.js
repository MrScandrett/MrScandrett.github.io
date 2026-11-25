(function (root) {
  'use strict';

  var TREE_MODELS = {
    '3domain': {
      label: '3-Domain Tree (Woese, 1977)',
      note: 'Carl Woese\'s classic ribosomal-RNA tree divides cellular life into three primary branches radiating from LUCA: Bacteria, Archaea, and Eukarya.',
      nodes: [
        { id: 'luca', label: 'LUCA', x: 400, y: 400, color: '#f0ad4e', radius: 40 },
        { id: 'bacteria', label: 'Bacteria', x: 200, y: 250, color: '#5cb85c', radius: 30 },
        { id: 'cyanobacteria', label: 'Cyanobacteria', x: 100, y: 140, color: '#5cb85c', radius: 20 },
        { id: 'firmicutes', label: 'Firmicutes', x: 210, y: 100, color: '#5cb85c', radius: 20 },
        { id: 'archaea', label: 'Archaea', x: 600, y: 250, color: '#d9534f', radius: 30 },
        { id: 'crenarchaeota', label: 'Crenarchaeota', x: 550, y: 100, color: '#d9534f', radius: 20 },
        { id: 'euryarchaeota', label: 'Euryarchaeota', x: 700, y: 145, color: '#d9534f', radius: 20 },
        { id: 'eukarya', label: 'Eukarya', x: 400, y: 185, color: '#428bca', radius: 30 },
        { id: 'plants', label: 'Plants', x: 300, y: 75, color: '#428bca', radius: 20 },
        { id: 'fungi', label: 'Fungi', x: 400, y: 50, color: '#428bca', radius: 20 },
        { id: 'animals', label: 'Animals', x: 500, y: 75, color: '#428bca', radius: 20 }
      ],
      edges: [
        ['luca', 'bacteria'],
        ['luca', 'archaea'],
        ['luca', 'eukarya'],
        ['bacteria', 'cyanobacteria'],
        ['bacteria', 'firmicutes'],
        ['archaea', 'crenarchaeota'],
        ['archaea', 'euryarchaeota'],
        ['eukarya', 'plants'],
        ['eukarya', 'fungi'],
        ['eukarya', 'animals']
      ],
      symbiosisEdges: []
    },
    '2domain': {
      label: '2-Domain + Endosymbiosis Tree',
      note: 'Modern phylogenomics places Eukarya emerging from within Archaea (Asgard archaea) after an archaeal host engulfed a bacterium that evolved into mitochondria — and plants later engulfed a cyanobacterium (chloroplasts).',
      nodes: [
        { id: 'luca', label: 'LUCA', x: 380, y: 405, color: '#f0ad4e', radius: 40 },
        { id: 'bacteria', label: 'Bacteria', x: 185, y: 270, color: '#5cb85c', radius: 30 },
        { id: 'cyanobacteria', label: 'Cyanobacteria', x: 95, y: 145, color: '#5cb85c', radius: 20 },
        { id: 'firmicutes', label: 'Firmicutes', x: 205, y: 135, color: '#5cb85c', radius: 20 },
        { id: 'archaea', label: 'Archaea', x: 560, y: 280, color: '#d9534f', radius: 30 },
        { id: 'crenarchaeota', label: 'Crenarchaeota', x: 645, y: 165, color: '#d9534f', radius: 20 },
        { id: 'euryarchaeota', label: 'Euryarchaeota', x: 715, y: 245, color: '#d9534f', radius: 20 },
        { id: 'eukarya', label: 'Eukarya', x: 465, y: 175, color: '#428bca', radius: 30 },
        { id: 'plants', label: 'Plants', x: 345, y: 65, color: '#428bca', radius: 20 },
        { id: 'fungi', label: 'Fungi', x: 465, y: 50, color: '#428bca', radius: 20 },
        { id: 'animals', label: 'Animals', x: 585, y: 65, color: '#428bca', radius: 20 }
      ],
      edges: [
        ['luca', 'bacteria'],
        ['luca', 'archaea'],
        ['archaea', 'crenarchaeota'],
        ['archaea', 'euryarchaeota'],
        ['archaea', 'eukarya'],
        ['bacteria', 'cyanobacteria'],
        ['bacteria', 'firmicutes'],
        ['eukarya', 'plants'],
        ['eukarya', 'fungi'],
        ['eukarya', 'animals']
      ],
      symbiosisEdges: [
        { from: 'bacteria', to: 'eukarya', label: 'Mitochondria' },
        { from: 'cyanobacteria', to: 'plants', label: 'Chloroplasts' }
      ]
    }
  };

  var NODE_INFO = {
    luca: {
      title: 'LUCA — the root of every path',
      text: 'Every branch on this tree, no matter which domain it starts in, traces back to this single point. LUCA was a single-celled microbe living roughly 3.5–3.8 billion years ago.'
    },
    bacteria: {
      title: 'Domain Bacteria',
      text: 'The most diverse and ancient-looking domain, including E. coli, Streptococcus, and the cyanobacteria that first filled Earth\'s atmosphere with oxygen.'
    },
    cyanobacteria: {
      title: 'Cyanobacteria',
      text: 'Photosynthetic bacteria that invented oxygen-producing photosynthesis, triggering the Great Oxidation Event about 2.4 billion years ago.'
    },
    firmicutes: {
      title: 'Firmicutes',
      text: 'A huge bacterial group with thick cell walls, including Lactobacillus (used to make yogurt) and Clostridium.'
    },
    archaea: {
      title: 'Domain Archaea',
      text: 'Look like bacteria under a microscope, but their cell membranes and genetic machinery are built differently — many thrive in extreme heat, salt, or acid, similar to the conditions LUCA may have lived in.'
    },
    crenarchaeota: {
      title: 'Crenarchaeota',
      text: 'Many species in this group are extreme thermophiles, living in boiling hot springs and deep-sea vents.'
    },
    euryarchaeota: {
      title: 'Euryarchaeota',
      text: 'Includes methanogens — organisms that produce methane gas as a waste product, and thrive without any oxygen at all.'
    },
    eukarya: {
      title: 'Domain Eukarya',
      text: 'Cells with a nucleus and internal compartments. Plants, fungi, animals, and every protist belong here. Eukaryotic cells arose when an archaeal host engulfed a bacterium that evolved into mitochondria.'
    },
    plants: {
      title: 'Plants',
      text: 'Eukaryotes that capture sunlight using chloroplasts — organelles that were once free-living cyanobacteria, engulfed and kept as permanent partners.'
    },
    fungi: {
      title: 'Fungi',
      text: 'Eukaryotes that digest food outside their bodies and absorb the nutrients. Genetically, fungi are actually closer relatives of animals than of plants.'
    },
    animals: {
      title: 'Animals',
      text: 'Multicellular eukaryotes that eat other organisms for energy — from sponges to blue whales to you.'
    }
  };

  var EVIDENCE_ITEMS = [
    {
      id: 'chiral-aa',
      prompt: 'Every living organism builds proteins almost exclusively from left-handed amino acids, even though right-handed versions work identically in chemistry.',
      answer: 'luca',
      explanation: 'Arbitrary chemical symmetry-breaking (chirality) shared across all three domains points to single inheritance from LUCA.'
    },
    {
      id: 'wings',
      prompt: 'Bats, birds, and dragonflies all have wings used for powered flight, built from completely different anatomical structures.',
      answer: 'convergent',
      explanation: 'Their last common ancestor had no wings; flight evolved independently because aerodynamics rewards wings (convergent evolution).'
    },
    {
      id: 'atp',
      prompt: 'Bacteria, archaea, oak trees, and humans all use the exact same nucleotide (ATP) as their universal energy-transfer molecule.',
      answer: 'luca',
      explanation: 'Other nucleoside triphosphates (like GTP) carry identical bond energy; universal reliance on ATP is a shared molecular inheritance from LUCA.'
    },
    {
      id: 'camera-eye',
      prompt: 'Both octopuses and humans have single-lens camera eyes, yet octopus retinas wire nerves behind photoreceptors with no blind spot while vertebrate retinas wire in front.',
      answer: 'convergent',
      explanation: 'Different embryological origins and wiring show that camera eyes evolved separately in mollusks and vertebrates.'
    }
  ];

  function getTreeLayout(mode) {
    return TREE_MODELS[mode] || TREE_MODELS['3domain'];
  }

  function pathToLuca(id, mode) {
    var layout = getTreeLayout(mode || '3domain');
    var parentOf = {};
    layout.edges.forEach(function (edge) {
      parentOf[edge[1]] = edge[0];
    });
    var path = [];
    var current = id;
    var guard = 0;
    while (current && guard < 20) {
      path.push(current);
      if (current === 'luca') break;
      current = parentOf[current] || null;
      guard++;
    }
    return path;
  }

  function evaluateEvidenceAnswer(itemId, choice) {
    var item = EVIDENCE_ITEMS.find(function (entry) { return entry.id === itemId; });
    if (!item) return { valid: false, correct: false, explanation: '' };
    var correct = item.answer === choice;
    return {
      valid: true,
      correct: correct,
      expected: item.answer,
      explanation: item.explanation
    };
  }

  function mount() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    var box = document.getElementById('simBox');
    var canvas = document.getElementById('treeCanvas');
    var treeInfo = document.getElementById('treeInfo');
    var modeNote = document.getElementById('treeModeNote');
    var branchBar = document.getElementById('treeBranchBar');
    var resetBtn = document.getElementById('treeResetView');
    var modeButtons = document.querySelectorAll('[data-tree-mode]');

    if (box && canvas && typeof window.SimKit !== 'undefined') {
      var mode = '3domain';
      var selectedNodeId = null;
      var selectedPath = [];
      var initialized = false;
      var panX = 0;
      var panY = 0;
      var isPanning = false;
      var lastPanPoint = { x: 0, y: 0 };
      var downPoint = null;
      var DRAG_THRESHOLD = 6;

      function currentLayout() {
        return getTreeLayout(mode);
      }

      function getNode(id) {
        return currentLayout().nodes.find(function (n) { return n.id === id; });
      }

      function centerTree(cw, ch) {
        var nodes = currentLayout().nodes;
        if (!cw || !ch || !nodes.length) return;
        var treeMinX = Math.min.apply(null, nodes.map(function (n) { return n.x - n.radius; }));
        var treeMaxX = Math.max.apply(null, nodes.map(function (n) { return n.x + n.radius; }));
        var treeMinY = Math.min.apply(null, nodes.map(function (n) { return n.y - n.radius; }));
        var treeMaxY = Math.max.apply(null, nodes.map(function (n) { return n.y + n.radius + 22; }));
        panX = (cw - (treeMinX + treeMaxX)) / 2;
        panY = (ch - (treeMinY + treeMaxY)) / 2;
        initialized = true;
      }

      function syncBranchButtons() {
        if (!branchBar) return;
        branchBar.querySelectorAll('button[data-node-id]').forEach(function (btn) {
          var active = btn.dataset.nodeId === selectedNodeId;
          btn.classList.toggle('active', active);
          btn.setAttribute('aria-pressed', String(active));
        });
      }

      function showNodeInfo(id) {
        var info = NODE_INFO[id];
        if (!info || !treeInfo) return;
        selectedNodeId = id;
        selectedPath = pathToLuca(id, mode);
        var readableChain = selectedPath.map(function (pid) {
          var node = getNode(pid);
          return node ? node.label : pid;
        }).join(' → ');
        treeInfo.innerHTML =
          '<h3>' + info.title + '</h3>' +
          '<p>' + info.text + '</p>' +
          '<p class="tree-path">Lineage traced back to LUCA: ' + readableChain + '</p>';
        syncBranchButtons();
      }

      function buildBranchButtons() {
        if (!branchBar) return;
        branchBar.innerHTML = '';
        currentLayout().nodes.forEach(function (node) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'luca-chip-btn';
          btn.dataset.nodeId = node.id;
          btn.setAttribute('aria-pressed', String(node.id === selectedNodeId));
          btn.textContent = node.label;
          btn.addEventListener('click', function () {
            showNodeInfo(node.id);
          });
          branchBar.appendChild(btn);
        });
        syncBranchButtons();
      }

      function isEdgeOnPath(fromId, toId) {
        for (var i = 0; i < selectedPath.length - 1; i++) {
          if ((selectedPath[i] === fromId && selectedPath[i + 1] === toId) ||
              (selectedPath[i] === toId && selectedPath[i + 1] === fromId)) {
            return true;
          }
        }
        return false;
      }

      var sk = null;

      function draw() {
        if (!sk || !sk.ctx || !sk.width) return;
        var ctx = sk.ctx;
        var cw = sk.width;
        var ch = sk.height;
        var layout = currentLayout();
        var nodes = layout.nodes;

        if (!initialized && cw > 0) {
          centerTree(cw, ch);
        }

        ctx.clearRect(0, 0, cw, ch);

        ctx.strokeStyle = '#edf2f7';
        ctx.lineWidth = 1;
        var gridSize = 50;
        var offsetX = ((panX % gridSize) + gridSize) % gridSize;
        var offsetY = ((panY % gridSize) + gridSize) % gridSize;
        for (var gx = offsetX; gx < cw; gx += gridSize) {
          ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, ch); ctx.stroke();
        }
        for (var gy = offsetY; gy < ch; gy += gridSize) {
          ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cw, gy); ctx.stroke();
        }

        function drawEdge(fromId, toId, highlighted) {
          var fromNode = getNode(fromId);
          var toNode = getNode(toId);
          if (!fromNode || !toNode) return;
          ctx.beginPath();
          ctx.moveTo(fromNode.x + panX, fromNode.y + panY);
          ctx.lineTo(toNode.x + panX, toNode.y + panY);
          ctx.strokeStyle = highlighted ? '#f0ad4e' : '#cbd5e1';
          ctx.lineWidth = highlighted ? 5 : 3;
          ctx.stroke();
        }

        layout.edges.forEach(function (pair) {
          if (!isEdgeOnPath(pair[0], pair[1])) drawEdge(pair[0], pair[1], false);
        });
        layout.edges.forEach(function (pair) {
          if (isEdgeOnPath(pair[0], pair[1])) drawEdge(pair[0], pair[1], true);
        });

        (layout.symbiosisEdges || []).forEach(function (sym) {
          var fromNode = getNode(sym.from);
          var toNode = getNode(sym.to);
          if (!fromNode || !toNode) return;
          var fx = fromNode.x + panX;
          var fy = fromNode.y + panY;
          var tx = toNode.x + panX;
          var ty = toNode.y + panY;
          var cxCtrl = (fx + tx) / 2;
          var cyCtrl = Math.min(fy, ty) - 36;
          ctx.save();
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = '#0f766e';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.quadraticCurveTo(cxCtrl, cyCtrl, tx, ty);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#0f766e';
          ctx.font = '600 11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Endosymbiosis: ' + sym.label, cxCtrl, cyCtrl + 12);
          ctx.restore();
        });

        nodes.forEach(function (n) {
          var nx = n.x + panX;
          var ny = n.y + panY;
          var onPath = selectedPath.indexOf(n.id) !== -1;

          ctx.beginPath();
          ctx.arc(nx, ny, n.radius, 0, Math.PI * 2);
          ctx.fillStyle = n.color;
          ctx.fill();
          ctx.strokeStyle = onPath ? '#f0ad4e' : '#ffffff';
          ctx.lineWidth = onPath ? 5 : 3;
          ctx.stroke();

          ctx.fillStyle = n.id === 'luca' ? '#ffffff' : '#1a2c3a';
          ctx.font = n.id === 'luca' ? '700 16px Inter, sans-serif' : '600 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          if (n.id === 'luca') {
            ctx.textBaseline = 'middle';
            ctx.fillText(n.label, nx, ny);
          } else {
            ctx.textBaseline = 'top';
            ctx.fillText(n.label, nx, ny + n.radius + 5);
          }
        });
      }

      sk = window.SimKit.canvas2d(canvas, {
        box: box,
        dpr: 2,
        onResize: function () { draw(); }
      });

      function setMode(nextMode) {
        if (!TREE_MODELS[nextMode]) return;
        mode = nextMode;
        modeButtons.forEach(function (btn) {
          var active = btn.dataset.treeMode === mode;
          btn.classList.toggle('active', active);
          btn.setAttribute('aria-pressed', String(active));
        });
        if (modeNote) modeNote.textContent = currentLayout().note;
        initialized = false;
        centerTree(sk.width, sk.height);
        if (selectedNodeId) showNodeInfo(selectedNodeId);
        draw();
      }

      modeButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          setMode(btn.dataset.treeMode);
        });
      });

      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          centerTree(sk.width, sk.height);
          draw();
        });
      }

      function getMousePos(e) {
        var rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }

      function nodeAtPoint(pos) {
        var nodes = currentLayout().nodes;
        for (var i = nodes.length - 1; i >= 0; i--) {
          var n = nodes[i];
          var dx = pos.x - (n.x + panX);
          var dy = pos.y - (n.y + panY);
          if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 4) return n;
        }
        return null;
      }

      canvas.addEventListener('mousedown', function (e) {
        isPanning = true;
        lastPanPoint = getMousePos(e);
        downPoint = lastPanPoint;
        canvas.style.cursor = 'grabbing';
      });

      window.addEventListener('mouseup', function (e) {
        if (isPanning && downPoint) {
          var pos = getMousePos(e);
          var dx = pos.x - downPoint.x;
          var dy = pos.y - downPoint.y;
          if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) {
            var hit = nodeAtPoint(pos);
            if (hit) showNodeInfo(hit.id);
          }
        }
        isPanning = false;
        downPoint = null;
        canvas.style.cursor = 'grab';
      });

      canvas.addEventListener('mousemove', function (e) {
        var pos = getMousePos(e);
        if (!isPanning) {
          canvas.style.cursor = nodeAtPoint(pos) ? 'pointer' : 'grab';
          return;
        }
        panX += pos.x - lastPanPoint.x;
        panY += pos.y - lastPanPoint.y;
        lastPanPoint = pos;
      });

      canvas.addEventListener('touchstart', function (e) {
        var touch = e.touches[0];
        var rect = canvas.getBoundingClientRect();
        isPanning = true;
        lastPanPoint = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        downPoint = lastPanPoint;
        e.preventDefault();
      }, { passive: false });

      canvas.addEventListener('touchmove', function (e) {
        if (!isPanning) return;
        var touch = e.touches[0];
        var rect = canvas.getBoundingClientRect();
        var pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        panX += pos.x - lastPanPoint.x;
        panY += pos.y - lastPanPoint.y;
        lastPanPoint = pos;
        e.preventDefault();
      }, { passive: false });

      canvas.addEventListener('touchend', function (e) {
        if (downPoint) {
          var touch = (e.changedTouches && e.changedTouches[0]) || null;
          if (touch) {
            var rect = canvas.getBoundingClientRect();
            var pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
            var dx = pos.x - downPoint.x;
            var dy = pos.y - downPoint.y;
            if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) {
              var hit = nodeAtPoint(pos);
              if (hit) showNodeInfo(hit.id);
            }
          }
        }
        isPanning = false;
        downPoint = null;
      });

      canvas.style.cursor = 'grab';
      buildBranchButtons();
      setMode('3domain');

      window.SimKit.loop(function () { draw(); }, { el: window.SimKit.stage(canvas) });
    }

    // ── Universal traits checklist ────────────────────────────────────────
    var traits = [
      {
        id: 'genetic-code',
        title: 'The genetic code',
        text: 'DNA is built from the same 4 bases (A, T, C, G), and the code that translates 3-base "codons" into amino acids is nearly identical in every organism ever tested. There are billions of possible codes that would work just as well — sharing this exact one is a strong sign of common ancestry.'
      },
      {
        id: 'ribosomes',
        title: 'Ribosomes',
        text: 'Every domain of life builds proteins using ribosomes — molecular machines made of RNA and protein that read messenger RNA and link amino acids together in order.'
      },
      {
        id: 'atp',
        title: 'ATP as energy currency',
        text: 'From bacteria to blue whales, cells power their chemistry with the same molecule, ATP (adenosine triphosphate), rather than any of the many other molecules that could plausibly do the job.'
      },
      {
        id: 'cell-membrane',
        title: 'Lipid cell membranes',
        text: 'Every cell is wrapped in a membrane built from lipids, keeping its chemistry separate from the outside world while letting it selectively trade materials and energy.'
      },
      {
        id: 'left-handed-amino-acids',
        title: 'Left-handed amino acids only',
        text: 'Amino acids can form in two mirror-image ("chiral") versions, left- and right-handed. Life on Earth uses almost exclusively left-handed amino acids — an arbitrary choice with no chemical reason to favor one over the other, yet every domain agrees.'
      }
    ];

    var list = document.getElementById('traitChecklist');
    if (list) {
      var summary = document.createElement('p');
      summary.className = 'trait-summary';

      function updateSummary() {
        var checked = list.querySelectorAll('input:checked').length;
        if (checked === 0) {
          summary.textContent = '';
        } else if (checked === traits.length) {
          summary.textContent = 'All ' + traits.length + ' traits checked — that\'s five independent, arbitrary solutions every domain of life shares. Independent origins would be extraordinarily unlikely to land on the same answer five times by chance.';
        } else {
          summary.textContent = checked + ' of ' + traits.length + ' universal traits checked so far.';
        }
      }

      traits.forEach(function (trait) {
        var item = document.createElement('div');
        item.className = 'trait-item';
        item.innerHTML =
          '<input type="checkbox" id="trait-' + trait.id + '" />' +
          '<label for="trait-' + trait.id + '"><strong>' + trait.title + '</strong><span>' + trait.text + '</span></label>';
        list.appendChild(item);

        var checkbox = item.querySelector('input');
        checkbox.addEventListener('change', function () {
          item.classList.toggle('is-checked', checkbox.checked);
          updateSummary();
        });
      });
      list.appendChild(summary);
    }

    // ── Inherited from LUCA vs. Convergent Evolution sort check ──────────
    var evidenceEl = document.getElementById('lucaEvidenceQuiz');
    var evidenceScoreEl = document.getElementById('lucaEvidenceScore');
    if (evidenceEl) {
      var answers = {};
      EVIDENCE_ITEMS.forEach(function (item, idx) {
        var row = document.createElement('div');
        row.className = 'luca-ev-item';
        row.innerHTML =
          '<p class="luca-ev-q"><strong>' + (idx + 1) + '.</strong> ' + item.prompt + '</p>' +
          '<div class="luca-ev-btns" role="group" aria-label="Classify evidence item ' + (idx + 1) + '">' +
            '<button type="button" class="luca-chip-btn" data-choice="luca">Inherited from LUCA</button>' +
            '<button type="button" class="luca-chip-btn" data-choice="convergent">Convergent Evolution</button>' +
          '</div>' +
          '<p class="luca-ev-fb" aria-live="polite"></p>';
        var fb = row.querySelector('.luca-ev-fb');
        var btns = row.querySelectorAll('button');
        btns.forEach(function (btn) {
          btn.addEventListener('click', function () {
            var res = evaluateEvidenceAnswer(item.id, btn.dataset.choice);
            answers[item.id] = res.correct;
            btns.forEach(function (b) {
              var active = b === btn;
              b.classList.toggle('active', active);
              b.setAttribute('aria-pressed', String(active));
            });
            row.classList.toggle('is-correct', res.correct);
            row.classList.toggle('is-wrong', !res.correct);
            fb.textContent = (res.correct ? '✓ Correct. ' : 'Not quite. ') + res.explanation;
            if (evidenceScoreEl) {
              var done = Object.keys(answers).length;
              var score = Object.values(answers).filter(Boolean).length;
              evidenceScoreEl.textContent = score + ' of ' + EVIDENCE_ITEMS.length + ' classified accurately (' + done + ' answered).';
            }
          });
        });
        evidenceEl.appendChild(row);
      });
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount);
    } else {
      mount();
    }
  }

  var api = {
    TREE_MODELS: TREE_MODELS,
    EVIDENCE_ITEMS: EVIDENCE_ITEMS,
    getTreeLayout: getTreeLayout,
    pathToLuca: pathToLuca,
    evaluateEvidenceAnswer: evaluateEvidenceAnswer
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.LucaTreeLab = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
