(function (root) {
  'use strict';

  var CODON_TABLE = {
    UUU: 'Phe', UUC: 'Phe', UUA: 'Leu', UUG: 'Leu',
    CUU: 'Leu', CUC: 'Leu', CUA: 'Leu', CUG: 'Leu',
    AUU: 'Ile', AUC: 'Ile', AUA: 'Ile', AUG: 'Met',
    GUU: 'Val', GUC: 'Val', GUA: 'Val', GUG: 'Val',
    UCU: 'Ser', UCC: 'Ser', UCA: 'Ser', UCG: 'Ser',
    CCU: 'Pro', CCC: 'Pro', CCA: 'Pro', CCG: 'Pro',
    ACU: 'Thr', ACC: 'Thr', ACA: 'Thr', ACG: 'Thr',
    GCU: 'Ala', GCC: 'Ala', GCA: 'Ala', GCG: 'Ala',
    UAU: 'Tyr', UAC: 'Tyr', UAA: 'STOP', UAG: 'STOP',
    CAU: 'His', CAC: 'His', CAA: 'Gln', CAG: 'Gln',
    AAU: 'Asn', AAC: 'Asn', AAA: 'Lys', AAG: 'Lys',
    GAU: 'Asp', GAC: 'Asp', GAA: 'Glu', GAG: 'Glu',
    UGU: 'Cys', UGC: 'Cys', UGA: 'STOP', UGG: 'Trp',
    CGU: 'Arg', CGC: 'Arg', CGA: 'Arg', CGG: 'Arg',
    AGU: 'Ser', AGC: 'Ser', AGA: 'Arg', AGG: 'Arg',
    GGU: 'Gly', GGC: 'Gly', GGA: 'Gly', GGG: 'Gly'
  };

  var DEFAULT_DNA = 'ATGCTTGGC';

  var SCALES = [
    {
      id: 'molecule',
      tab: 'Molecule',
      tag: 'Zoom 1 · Nanometers',
      title: 'DNA as Code',
      body: [
        'The message here is literal: a sequence of four bases (A, T, C, G), read in triplets, that spells out which proteins get built.',
        'The "reader" is the cellular machinery — RNA polymerase and ribosomes — that transcribes and translates the sequence.',
        'Corruption at this scale is a mutation. Most get silently corrected or ignored thanks to codon redundancy; a rare few change the message enough to matter.'
      ],
      scaleNote: 'scale ≈ 10⁻⁹ m · see: DNA & Heredity'
    },
    {
      id: 'cell',
      tab: 'Cell',
      tag: 'Zoom 2 · Micrometers',
      title: 'Cells as Processors',
      body: [
        'The message is which genes get switched on or off, and in what order — a cell\'s "program," not just its parts list.',
        'The "reader" is the whole regulatory network inside the cell: receptors, signaling cascades, and transcription factors acting like logic gates.',
        'Corruption at this scale looks like miscommunication — a cell that ignores a stop signal and keeps dividing is, informationally, a cell running corrupted code. That\'s one way to describe cancer.'
      ],
      scaleNote: 'scale ≈ 10⁻⁵ m · see: Types of Cells'
    },
    {
      id: 'organism',
      tab: 'Organism',
      tag: 'Zoom 3 · Meters',
      title: 'Bodies as Networks of Networks',
      body: [
        'The message is coordination: nervous and hormonal signals telling billions of cells what to do and when, in sync, to keep one body alive.',
        'The "reader" is the whole organism\'s regulatory systems working together — the same feedback logic as a single cell, just layered many times over.',
        'Corruption here shows up as disease, injury, or simple miscommunication between systems — the body\'s version of a network outage.'
      ],
      scaleNote: 'scale ≈ 10⁰ m · behavior & physiology'
    },
    {
      id: 'ecosystem',
      tab: 'Ecosystem',
      tag: 'Zoom 4 · Kilometers',
      title: 'Ecosystems as Networks',
      body: [
        'The message is population-level: predator numbers, prey numbers, resource availability, all pushing and pulling on each other.',
        'The "reader" is every species in the web at once — no central controller, just millions of local decisions (eat, flee, reproduce) that add up to global patterns.',
        'Corruption here is a disturbance — a species lost, an invasive species added — that ripples outward and either gets absorbed or cascades into collapse.'
      ],
      scaleNote: 'scale ≈ 10³–10⁶ m · see: Ecosystems & Food Webs'
    },
    {
      id: 'evolution',
      tab: 'Generations',
      tag: 'Zoom 5 · Millennia',
      title: 'Evolution as Optimization',
      body: [
        'The message is the gene pool of an entire population, edited slightly with every generation.',
        'The "reader" is the environment itself — it doesn\'t plan anything, it just scores each variant by whether it survives and reproduces.',
        'Corruption isn\'t really the right word here — random mutation is the raw material the whole process runs on. It\'s less a bug than the algorithm\'s only source of new ideas.'
      ],
      scaleNote: 'scale ≈ deep time · see: Natural Selection Lab'
    }
  ];

  var CRITERIA = [
    { id: 'organization', label: 'Made of ordered, bounded structure (e.g. cells/membranes)' },
    { id: 'metabolism', label: 'Uses energy to do work (metabolism)' },
    { id: 'homeostasis', label: 'Maintains a stable internal state (homeostasis)' },
    { id: 'response', label: 'Responds to its environment' },
    { id: 'reproduction', label: 'Reproduces on its own, without borrowing another\'s machinery' },
    { id: 'heredity', label: 'Passes on coded, heritable information' },
    { id: 'evolution', label: 'Populations of it evolve over generations' }
  ];

  var PRESET_SETS = {
    classic: ['organization', 'metabolism', 'homeostasis', 'response', 'reproduction', 'heredity', 'evolution'],
    nasa: ['metabolism', 'heredity', 'evolution'],
    infofirst: ['organization', 'heredity', 'evolution'],
    none: []
  };

  var CANDIDATES = [
    { label: 'Human being', traits: { organization: 1, metabolism: 1, homeostasis: 1, response: 1, reproduction: 1, heredity: 1, evolution: 1 } },
    { label: 'Bacterium', traits: { organization: 1, metabolism: 1, homeostasis: 1, response: 1, reproduction: 1, heredity: 1, evolution: 1 } },
    { label: 'Virus', traits: { organization: 1, metabolism: 0, homeostasis: 0, response: 0, reproduction: 0, heredity: 1, evolution: 1 } },
    { label: 'Growing crystal', traits: { organization: 1, metabolism: 0, homeostasis: 0, response: 0, reproduction: 0, heredity: 0, evolution: 0 } },
    { label: 'Wildfire', traits: { organization: 0, metabolism: 1, homeostasis: 0, response: 1, reproduction: 1, heredity: 0, evolution: 0 } },
    { label: 'Sterile mule', traits: { organization: 1, metabolism: 1, homeostasis: 1, response: 1, reproduction: 0, heredity: 1, evolution: 0 } },
    { label: 'Computer virus', traits: { organization: 1, metabolism: 0, homeostasis: 0, response: 1, reproduction: 1, heredity: 1, evolution: 1 } },
    { label: 'AI language model', traits: { organization: 1, metabolism: 0, homeostasis: 0, response: 1, reproduction: 0, heredity: 0, evolution: 1 } }
  ];

  function dnaToRna(dnaCodon) {
    return String(dnaCodon || '').toUpperCase().replace(/T/g, 'U');
  }

  function translateCodon(codon) {
    var rna = dnaToRna(codon);
    return CODON_TABLE[rna] || '?';
  }

  function classifyCodonChange(originalDna, mutatedDna) {
    var origAa = translateCodon(originalDna);
    var nextAa = translateCodon(mutatedDna);
    if (String(originalDna).toUpperCase() === String(mutatedDna).toUpperCase()) {
      return { kind: 'unchanged', from: origAa, to: nextAa, label: 'Unchanged' };
    }
    if (origAa === nextAa) {
      return { kind: 'silent', from: origAa, to: nextAa, label: 'Silent — redundancy protected the protein!' };
    }
    if (nextAa === 'STOP') {
      return { kind: 'nonsense', from: origAa, to: nextAa, label: 'Nonsense — early STOP truncates the protein!' };
    }
    return { kind: 'missense', from: origAa, to: nextAa, label: 'Missense — amino acid changed (' + origAa + ' → ' + nextAa + ')' };
  }

  function evaluateLifeCandidate(candidate, checkedIds) {
    var active = checkedIds || [];
    var metCount = 0;
    for (var i = 0; i < active.length; i++) {
      if (candidate.traits[active[i]]) metCount++;
    }
    if (active.length === 0) return { met: 0, total: 0, status: 'none' };
    if (metCount === active.length) return { met: metCount, total: active.length, status: 'alive' };
    if (metCount === 0) return { met: 0, total: active.length, status: 'not' };
    return { met: metCount, total: active.length, status: 'partial' };
  }

  function mountCodonTester() {
    var gridEl = document.getElementById('codonBaseGrid');
    var outEl = document.getElementById('codonResult');
    var wobbleBtn = document.getElementById('codonWobbleBtn');
    var resetBtn = document.getElementById('codonResetBtn');
    if (!gridEl || !outEl) return;

    var BASES = ['A', 'T', 'C', 'G'];
    var seq = DEFAULT_DNA.split('');

    function render() {
      gridEl.innerHTML = '';
      for (var c = 0; c < 3; c++) {
        var group = document.createElement('div');
        group.className = 'codon-triplet';
        var origCodon = DEFAULT_DNA.slice(c * 3, c * 3 + 3);
        var curCodon = seq.slice(c * 3, c * 3 + 3).join('');
        var rna = dnaToRna(curCodon);
        var aa = translateCodon(curCodon);
        var cls = classifyCodonChange(origCodon, curCodon);

        var btnsWrap = document.createElement('div');
        btnsWrap.className = 'codon-bases';
        for (var b = 0; b < 3; b++) {
          (function (pos) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'codon-base-btn' + (seq[pos] !== DEFAULT_DNA[pos] ? ' is-mutated' : '');
            btn.textContent = seq[pos];
            btn.setAttribute('aria-label', 'Base ' + (pos + 1) + ', currently ' + seq[pos] + '. Click to mutate');
            btn.addEventListener('click', function () {
              seq[pos] = BASES[(BASES.indexOf(seq[pos]) + 1) % BASES.length];
              render();
            });
            btnsWrap.appendChild(btn);
          })(c * 3 + b);
        }

        var meta = document.createElement('div');
        meta.className = 'codon-meta';
        meta.innerHTML = '<span>mRNA: <code>' + rna + '</code></span><strong>' + aa + '</strong>';

        group.appendChild(btnsWrap);
        group.appendChild(meta);
        if (cls.kind !== 'unchanged') {
          var badge = document.createElement('span');
          badge.className = 'codon-badge is-' + cls.kind;
          badge.textContent = cls.kind;
          group.appendChild(badge);
        }
        gridEl.appendChild(group);
      }

      var statusParts = [];
      for (var k = 0; k < 3; k++) {
        var orig = DEFAULT_DNA.slice(k * 3, k * 3 + 3);
        var cur = seq.slice(k * 3, k * 3 + 3).join('');
        var res = classifyCodonChange(orig, cur);
        if (res.kind !== 'unchanged') {
          statusParts.push('Codon ' + (k + 1) + ' (' + orig + ' → ' + cur + '): ' + res.label);
        }
      }
      outEl.textContent = statusParts.length
        ? statusParts.join(' · ')
        : 'Original sequence: Met – Leu – Gly. Click any DNA letter above to test how codon redundancy absorbs or changes a mutation.';
    }

    if (wobbleBtn) {
      wobbleBtn.addEventListener('click', function () {
        seq = 'ATGCTCGGC'.split(''); // CTT -> CTC (both Leu!)
        render();
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        seq = DEFAULT_DNA.split('');
        render();
      });
    }

    render();
  }

  function mount() {
    if (typeof document === 'undefined') return;

    var tabsEl = document.getElementById('capZoomTabs');
    var panelEl = document.getElementById('capZoomPanel');
    if (tabsEl && panelEl) {
      function renderZoomPanel(scale) {
        var html = '<span class="cap-zoom-tag">' + scale.tag + '</span><h3>' + scale.title + '</h3>';
        for (var i = 0; i < scale.body.length; i++) html += '<p>' + scale.body[i] + '</p>';
        html += '<div class="cap-zoom-scale">' + scale.scaleNote + '</div>';
        panelEl.innerHTML = html;
      }

      function selectScale(id) {
        var buttons = tabsEl.querySelectorAll('.cap-zoom-tab');
        for (var i = 0; i < buttons.length; i++) {
          var isActive = buttons[i].dataset.scale === id;
          buttons[i].classList.toggle('active', isActive);
          buttons[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
        }
        var found = SCALES.find(function (s) { return s.id === id; });
        if (found) renderZoomPanel(found);
      }

      SCALES.forEach(function (scale, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cap-zoom-tab' + (idx === 0 ? ' active' : '');
        btn.textContent = scale.tab;
        btn.dataset.scale = scale.id;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
        btn.addEventListener('click', function () { selectScale(scale.id); });
        tabsEl.appendChild(btn);
      });
      renderZoomPanel(SCALES[0]);
    }

    mountCodonTester();

    var listEl = document.getElementById('capCriteriaList');
    var headEl = document.getElementById('capTableHead');
    var bodyEl = document.getElementById('capTableBody');
    var summaryEl = document.getElementById('capTableSummary');
    if (listEl && headEl && bodyEl) {
      CRITERIA.forEach(function (c) {
        var li = document.createElement('li');
        var checkboxId = 'crit-' + c.id;
        li.innerHTML = '<input type="checkbox" id="' + checkboxId + '" data-crit="' + c.id + '" checked />' +
          '<label for="' + checkboxId + '">' + c.label + '</label>';
        listEl.appendChild(li);
      });

      var headRow = '<th>Candidate</th>';
      CRITERIA.forEach(function (c) {
        headRow += '<th title="' + c.label + '">' + c.id + '</th>';
      });
      headRow += '<th>Verdict</th>';
      headEl.innerHTML = headRow;

      CANDIDATES.forEach(function (cand) {
        var tr = document.createElement('tr');
        tr.dataset.candidate = cand.label;
        bodyEl.appendChild(tr);
      });

      function getChecked() {
        var boxes = listEl.querySelectorAll('input[type="checkbox"]');
        var checked = [];
        for (var i = 0; i < boxes.length; i++) {
          if (boxes[i].checked) checked.push(boxes[i].dataset.crit);
        }
        return checked;
      }

      function renderTable() {
        var checked = getChecked();
        var aliveLabels = [];
        var rows = bodyEl.querySelectorAll('tr');
        rows.forEach(function (tr, idx) {
          var cand = CANDIDATES[idx];
          var html = '<td>' + cand.label + '</td>';
          CRITERIA.forEach(function (c) {
            var has = !!cand.traits[c.id];
            var isChecked = checked.indexOf(c.id) !== -1;
            var cls = has ? 'trait-yes' : 'trait-no';
            if (!isChecked) cls += ' trait-hidden';
            html += '<td class="' + cls + '">' + (has ? '✓' : '—') + '</td>';
          });
          var evalRes = evaluateLifeCandidate(cand, checked);
          var verdictHtml;
          if (evalRes.status === 'none') {
            verdictHtml = '<span class="verdict-partial">no criteria selected</span>';
          } else if (evalRes.status === 'alive') {
            verdictHtml = '<span class="verdict-alive">counts as alive</span>';
            aliveLabels.push(cand.label);
          } else if (evalRes.status === 'not') {
            verdictHtml = '<span class="verdict-not">not alive</span>';
          } else {
            verdictHtml = '<span class="verdict-partial">' + evalRes.met + '/' + evalRes.total + ' criteria met</span>';
          }
          html += '<td class="verdict">' + verdictHtml + '</td>';
          tr.innerHTML = html;
        });

        if (summaryEl) {
          summaryEl.textContent = checked.length === 0
            ? 'Select at least one criterion to classify the eight edge cases.'
            : aliveLabels.length + ' of ' + CANDIDATES.length + ' candidates meet every selected criterion: ' + aliveLabels.join(', ') + '.';
        }
      }

      function applyPreset(name) {
        var targetSet = PRESET_SETS[name] || [];
        listEl.querySelectorAll('input[type="checkbox"]').forEach(function (b) {
          b.checked = targetSet.indexOf(b.dataset.crit) !== -1;
        });
        renderTable();
      }

      listEl.addEventListener('change', renderTable);
      document.querySelectorAll('[data-cap-preset]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          applyPreset(btn.dataset.capPreset);
        });
      });

      renderTable();
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
    CODON_TABLE: CODON_TABLE,
    DEFAULT_DNA: DEFAULT_DNA,
    CRITERIA: CRITERIA,
    PRESET_SETS: PRESET_SETS,
    CANDIDATES: CANDIDATES,
    dnaToRna: dnaToRna,
    translateCodon: translateCodon,
    classifyCodonChange: classifyCodonChange,
    evaluateLifeCandidate: evaluateLifeCandidate
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.LifeAsInformationLab = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
