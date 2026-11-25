  (function () {
    "use strict";

    /* ─── amino acid data ─── */
    const AA_DATA = {
      arg: { name: "Arginine",       code3: "Arg", code1: "R", essential: false, cat: "charged",     charge: "positive", rgroup: "Guanidinium group (–(CH₂)₃–NH–C(=NH)–NH₂)", role: "Most positively charged amino acid at pH 7.4. Critical in the urea cycle for nitrogen excretion. Arginine is also a precursor to nitric oxide (NO), a key vasodilator.", color: "#7c3aed" },
      his: { name: "Histidine",      code3: "His", code1: "H", essential: true,  cat: "charged",     charge: "positive", rgroup: "Imidazole ring (pKa ~6.0)", role: "Uniquely, histidine can be either protonated or neutral near physiological pH — making it critical in enzyme active sites for proton transfer (e.g. serine proteases). Precursor to histamine.", color: "#7c3aed" },
      lys: { name: "Lysine",         code3: "Lys", code1: "K", essential: true,  cat: "charged",     charge: "positive", rgroup: "–(CH₂)₄–NH₃⁺ (pKa ~10.7)", role: "Long cationic side chain. Essential for collagen cross-linking, ubiquitination (protein tagging), and acetylation in histone modification (gene regulation).", color: "#7c3aed" },
      asp: { name: "Aspartic Acid",  code3: "Asp", code1: "D", essential: false, cat: "charged",     charge: "negative", rgroup: "–CH₂–COO⁻ (pKa ~3.7)", role: "Short negative side chain. A key residue in catalytic triads. Aspartate is also a neurotransmitter and participates in the malate-aspartate shuttle (energy metabolism).", color: "#dc2626" },
      glu: { name: "Glutamic Acid",  code3: "Glu", code1: "E", essential: false, cat: "charged",     charge: "negative", rgroup: "–(CH₂)₂–COO⁻ (pKa ~4.15)", role: "The brain's primary excitatory neurotransmitter. Glutamate is central to the TCA cycle as a carbon backbone donor and in nitrogen metabolism via transamination reactions.", color: "#dc2626" },
      ser: { name: "Serine",         code3: "Ser", code1: "S", essential: false, cat: "polar",       charge: "none",     rgroup: "–CH₂–OH (hydroxyl)", role: "A major phosphorylation site — kinases attach phosphate to serine to activate or silence signaling pathways. Part of the catalytic triad in serine proteases (like trypsin).", color: "#2563eb" },
      thr: { name: "Threonine",      code3: "Thr", code1: "T", essential: true,  cat: "polar",       charge: "none",     rgroup: "–CH(OH)–CH₃", role: "Like serine, threonine can be phosphorylated. It is important in intestinal mucus (O-glycosylated forms) and is a precursor to glycine and pyruvate.", color: "#2563eb" },
      asn: { name: "Asparagine",     code3: "Asn", code1: "N", essential: false, cat: "polar",       charge: "none",     rgroup: "–CH₂–CO–NH₂ (amide)", role: "A key N-glycosylation site: sugar chains can be attached to asparagine side chains in the endoplasmic reticulum. Its amide group makes it useful for hydrogen bonding.", color: "#2563eb" },
      gln: { name: "Glutamine",      code3: "Gln", code1: "Q", essential: false, cat: "polar",       charge: "none",     rgroup: "–(CH₂)₂–CO–NH₂", role: "The most abundant free amino acid in blood. Major vehicle for nitrogen transport between tissues. Critical fuel for rapidly dividing cells (intestinal epithelium, immune cells).", color: "#2563eb" },
      cys: { name: "Cysteine",       code3: "Cys", code1: "C", essential: false, cat: "special",     charge: "none",     rgroup: "–CH₂–SH (thiol, pKa ~8.1)", role: "Forms disulfide (–S–S–) bridges that stabilize protein 3D structure (e.g. insulin, antibodies). A key component of glutathione, the cell's main antioxidant.", color: "#d97706" },
      sec: { name: "Selenocysteine", code3: "Sec", code1: "U", essential: false, cat: "special",     charge: "none",     rgroup: "–CH₂–SeH (selenol, pKa ~5.2)", role: "The 21st proteinogenic amino acid — encoded by UGA (normally a stop codon) via a special SECIS RNA element. Found in glutathione peroxidase, which neutralizes reactive oxygen species.", color: "#d97706" },
      gly: { name: "Glycine",        code3: "Gly", code1: "G", essential: false, cat: "special",     charge: "none",     rgroup: "–H (just a hydrogen)", role: "The only achiral amino acid (both substituents on Cα are identical). Its tiny size gives it unique flexibility — glycine is abundant in collagen (~35%) and in tight protein turns.", color: "#d97706" },
      pro: { name: "Proline",        code3: "Pro", code1: "P", essential: false, cat: "special",     charge: "none",     rgroup: "Pyrrolidine ring (cyclic)", role: "Unique: its side chain loops back to bond with the backbone nitrogen, making it a secondary amine. Proline introduces sharp kinks in helices, is abundant in collagen, and resists digestion.", color: "#d97706" },
      ala: { name: "Alanine",        code3: "Ala", code1: "A", essential: false, cat: "hydrophobic", charge: "none",     rgroup: "–CH₃ (methyl)", role: "Simplest hydrophobic amino acid. Very common in α-helices. Alanine shuttles nitrogen from muscle to liver (glucose-alanine cycle) during fasting and exercise.", color: "#16a34a" },
      val: { name: "Valine",         code3: "Val", code1: "V", essential: true,  cat: "hydrophobic", charge: "none",     rgroup: "–CH(CH₃)₂ (isopropyl)", role: "Branched-chain amino acid (BCAA). A single mutation (Glu→Val at position 6 of hemoglobin) causes sickle cell disease — a dramatic example of how one amino acid can alter protein function.", color: "#16a34a" },
      ile: { name: "Isoleucine",     code3: "Ile", code1: "I", essential: true,  cat: "hydrophobic", charge: "none",     rgroup: "Branched 4-carbon (two chiral centers)", role: "BCAA. Has two chiral centers — one of the few amino acids with more than one stereocentre. Metabolized to both acetyl-CoA and succinyl-CoA; enters both fat and carbohydrate metabolism.", color: "#16a34a" },
      leu: { name: "Leucine",        code3: "Leu", code1: "L", essential: true,  cat: "hydrophobic", charge: "none",     rgroup: "–CH₂–CH(CH₃)₂", role: "Most abundant BCAA; accounts for ~8% of protein residues. A key activator of mTORC1 — the master switch for muscle protein synthesis. Critical for athletes and growing children.", color: "#16a34a" },
      met: { name: "Methionine",     code3: "Met", code1: "M", essential: true,  cat: "hydrophobic", charge: "none",     rgroup: "–(CH₂)₂–S–CH₃ (thioether)", role: "Translation usually starts with methionine (or formylmethionine in bacteria), although that first residue is often removed later. As SAM, methionine donates methyl groups in DNA methylation and many biosynthesis reactions.", color: "#16a34a" },
      phe: { name: "Phenylalanine",  code3: "Phe", code1: "F", essential: true,  cat: "hydrophobic", charge: "none",     rgroup: "–CH₂–C₆H₅ (benzyl)", role: "Aromatic and very hydrophobic. Precursor to tyrosine (via phenylalanine hydroxylase — the enzyme missing in PKU). Also a precursor to several neurotransmitters via the tyrosine pathway.", color: "#16a34a" },
      tyr: { name: "Tyrosine",       code3: "Tyr", code1: "Y", essential: false, cat: "hydrophobic", charge: "none",     rgroup: "–CH₂–C₆H₄–OH (pKa ~10.1)", role: "Although mostly hydrophobic, the –OH makes it a target for phosphorylation (by receptor tyrosine kinases in major signaling cascades). Also the precursor to dopamine, thyroid hormone, and melanin.", color: "#16a34a" },
      trp: { name: "Tryptophan",     code3: "Trp", code1: "W", essential: true,  cat: "hydrophobic", charge: "none",     rgroup: "Indole ring (largest standard amino acid)", role: "Sole dietary precursor to serotonin (mood) and melatonin (sleep). The rarest amino acid in proteins. Strongly absorbs UV at 280 nm — used in labs to measure protein concentration.", color: "#16a34a" },
    };

    /* ─── category details panel ─── */
    const panels = {
      charged:     document.getElementById("detail-charged"),
      polar:       document.getElementById("detail-polar"),
      special:     document.getElementById("detail-special"),
      hydrophobic: document.getElementById("detail-hydrophobic"),
    };

    function chargeTag(aa) {
      if (aa.charge === "positive") return '<span class="aa-detail-tag tag-charged-pos">Positively charged</span>';
      if (aa.charge === "negative") return '<span class="aa-detail-tag tag-charged-neg">Negatively charged</span>';
      if (aa.cat === "polar")       return '<span class="aa-detail-tag tag-polar">Polar uncharged</span>';
      if (aa.cat === "special")     return '<span class="aa-detail-tag tag-special">Special</span>';
      return '<span class="aa-detail-tag tag-hydrophobic">Hydrophobic</span>';
    }

    function openDetail(id) {
      const aa = AA_DATA[id];
      if (!aa) return;
      const panel = panels[aa.cat];
      if (!panel) return;

      // deselect previous in this cat
      document.querySelectorAll('#cat-' + aa.cat + ' .aa-acid-card').forEach(function(c) {
        c.classList.remove('is-selected');
        c.setAttribute('aria-pressed', 'false');
      });
      // select this one
      const card = document.querySelector('[data-id="' + id + '"]');
      if (card) {
        card.classList.add('is-selected');
        card.setAttribute('aria-pressed', 'true');
      }

      // if already open on this AA, close
      if (panel.classList.contains('is-open') && panel.dataset.open === id) {
        panel.classList.remove('is-open');
        panel.dataset.open = '';
        if (card) {
          card.classList.remove('is-selected');
          card.setAttribute('aria-pressed', 'false');
        }
        return;
      }

      panel.dataset.open = id;
      panel.classList.add('is-open');

      // draw a tiny SVG skeleton
      const svgContent = makeMiniSVG(aa);
      panel.innerHTML =
        '<figure class="aa-detail-svg aa-diagram" data-zoomable data-lightbox-group="amino-diagrams"><img src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent) + '" alt="' + aa.name + ' backbone schematic"><figcaption>' + aa.name + ': shared backbone with the variable side chain marked R. ' + (aa.code3 === 'Pro' ? 'The side chain closes a ring to nitrogen; the protonated nitrogen is NH₂⁺.' : 'R-group formula is listed beside the diagram; this is not a full molecular structure.') + ' Original classroom schematic.</figcaption></figure>' +
        '<div class="aa-detail-info">' +
          '<h3>' + aa.name + ' <span style="font-size:0.85rem;color:#9d80cc;font-weight:600;">(' + aa.code3 + ' / ' + aa.code1 + ')</span></h3>' +
          '<p><strong>R group:</strong> ' + aa.rgroup + '</p>' +
          '<p>' + aa.role + '</p>' +
          '<div class="aa-detail-tags">' +
            chargeTag(aa) +
            (aa.essential ? '<span class="aa-detail-tag tag-essential">Essential (dietary)</span>' : '') +
          '</div>' +
        '</div>';
    }

    function makeMiniSVG(aa) {
      // Build a small schematic of backbone + label for R group
      const rc = aa.color || "#7c3aed";
      return '<svg role="img" aria-label="Simplified backbone and R group for ' + aa.name + '" viewBox="0 0 150 160" width="300" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<text x="65" y="18" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" fill="#ef4444" font-weight="700">COO⁻</text>' +
        '<line x1="65" y1="22" x2="65" y2="44" stroke="#555" stroke-width="1.5"/>' +
        '<circle cx="65" cy="56" r="13" fill="rgba(0,0,0,0.04)" stroke="#555" stroke-width="1.5"/>' +
        '<text x="65" y="60" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" fill="#222" font-weight="800">Cα</text>' +
        '<line x1="52" y1="56" x2="30" y2="56" stroke="#555" stroke-width="1.5"/><text x="20" y="60" text-anchor="middle" font-size="10" fill="#222">H</text>' +
        '<line x1="78" y1="56" x2="100" y2="56" stroke="#555" stroke-width="1.5"/>' +
        '<text x="115" y="60" text-anchor="middle" font-family="Arial" font-size="12" fill="#1d4ed8" font-weight="700">' + (aa.code3 === 'Pro' ? 'NH₂⁺' : 'NH₃⁺') + '</text>' +
        '<line x1="65" y1="69" x2="65" y2="100" stroke="#555" stroke-width="1.5"/>' +
        '<rect x="28" y="100" width="74" height="46" rx="10" fill="' + rc + '" fill-opacity="0.13" stroke="' + rc + '" stroke-width="1.5"/>' +
        '<text x="65" y="122" text-anchor="middle" font-family="Manrope" font-size="11" fill="' + rc + '" font-weight="800">R</text>' +
        '<text x="65" y="136" text-anchor="middle" font-family="Manrope" font-size="7.5" fill="' + rc + '" font-weight="600">' + aa.code3 + '</text>' +
      (aa.code3 === 'Pro' ? '<path d="M102 124 L138 124 L138 74" stroke="#475569" stroke-width="1.5" fill="none"/>' : '') + '</svg>';
    }

    /* attach click/keyboard to all aa cards */
    document.querySelectorAll('.aa-acid-card').forEach(function(card) {
      card.setAttribute('role', 'button');
      card.setAttribute('aria-pressed', 'false');
      card.setAttribute('aria-label', 'Open details for ' + AA_DATA[card.dataset.id].name);
      card.addEventListener('click', function() { openDetail(card.dataset.id); });
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(card.dataset.id); }
      });
    });

    /* ─── tabs ─── */
      document.querySelectorAll('.aa-tab').forEach(function(btn) {
      btn.id = 'tab-' + btn.dataset.cat;
      btn.setAttribute('aria-controls', 'cat-' + btn.dataset.cat);
      btn.tabIndex = btn.classList.contains('is-active') ? 0 : -1;
      const categoryPanel = document.getElementById('cat-' + btn.dataset.cat);
      categoryPanel.setAttribute('role', 'tabpanel');
      categoryPanel.setAttribute('aria-labelledby', btn.id);
      btn.addEventListener('click', function() {
        document.querySelectorAll('.aa-tab').forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected','false'); t.tabIndex = -1; });
        document.querySelectorAll('.aa-cat-panel').forEach(p => p.classList.remove('is-active'));
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected','true');
        btn.tabIndex = 0;
        document.getElementById('cat-' + btn.dataset.cat).classList.add('is-active');
      });
      btn.addEventListener('keydown', function(e) {
        if (!['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) return;
        e.preventDefault();
        const tabs = Array.from(document.querySelectorAll('.aa-tab'));
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (tabs.indexOf(btn) + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next].focus();
        tabs[next].click();
      });
    });

    /* ─── peptide builder ─── */
    const PALETTE_AAS = [
      { id:'gly',  cat:'special'     },
      { id:'ala',  cat:'hydrophobic' },
      { id:'val',  cat:'hydrophobic' },
      { id:'leu',  cat:'hydrophobic' },
      { id:'ile',  cat:'hydrophobic' },
      { id:'pro',  cat:'special'     },
      { id:'phe',  cat:'hydrophobic' },
      { id:'trp',  cat:'hydrophobic' },
      { id:'met',  cat:'hydrophobic' },
      { id:'ser',  cat:'polar'       },
      { id:'thr',  cat:'polar'       },
      { id:'cys',  cat:'special'     },
      { id:'tyr',  cat:'hydrophobic' },
      { id:'asn',  cat:'polar'       },
      { id:'gln',  cat:'polar'       },
      { id:'asp',  cat:'charged'     },
      { id:'glu',  cat:'charged'     },
      { id:'lys',  cat:'charged'     },
      { id:'arg',  cat:'charged'     },
      { id:'his',  cat:'charged'     },
    ];

    const CAT_COLORS = {
      charged:     { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)',  color: '#5b21b6', dot: '#7c3aed' },
      polar:       { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.28)', color: '#1d4ed8', dot: '#2563eb' },
      special:     { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.35)', color: '#92400e', dot: '#d97706' },
      hydrophobic: { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.28)', color: '#166534', dot: '#16a34a' },
    };

    const paletteEl   = document.getElementById('palette');
    const chainDisplay= document.getElementById('chain-display');
    const chainEmpty  = document.getElementById('chain-empty');
    const chainInfo   = document.getElementById('chain-info');
    const sequenceLine= document.getElementById('sequence-line');
    const foldPreview = document.getElementById('fold-preview');
    const foldEmpty   = document.getElementById('fold-empty');
    const undoBtn     = document.getElementById('undo-btn');
    const clearBtn    = document.getElementById('clear-btn');
    const copyBtn     = document.getElementById('copy-btn');

    let chain = [];

    PALETTE_AAS.forEach(function(item) {
      const aa = AA_DATA[item.id];
      const c  = CAT_COLORS[item.cat];
      const btn = document.createElement('button');
      btn.className = 'aa-palette-btn';
      btn.innerHTML = '<span class="dot" style="background:' + c.dot + ';"></span>' + aa.code3;
      btn.title = aa.name;
      btn.setAttribute('aria-label', 'Add ' + aa.name + ' to peptide');
      btn.setAttribute('data-id', item.id);
      btn.addEventListener('click', function() { addToChain(item.id); });
      paletteEl.appendChild(btn);
    });

    function addToChain(id) {
      chain.push(id);
      renderChain();
    }

    function renderChain() {
      [undoBtn, clearBtn, copyBtn].forEach(btn => { btn.disabled = chain.length === 0; });
      if (chain.length === 0) {
        chainDisplay.innerHTML = '';
        chainDisplay.appendChild(chainEmpty);
        chainInfo.textContent = 'Add amino acids to see chain properties.';
        sequenceLine.textContent = '';
        renderFold();
        return;
      }
      chainEmpty.remove();
      let html = '';
      chain.forEach(function(id, i) {
        const aa = AA_DATA[id];
        const cat = aa.cat;
        const c = CAT_COLORS[cat];
        html += '<div class="aa-chain-node">';
        if (i > 0) html += '<span class="aa-chain-bond">–</span>';
        html += '<span class="aa-chain-aa" style="--node-bg:' + c.bg + ';--node-border:' + c.border + ';--node-color:' + c.color + ';">' + aa.code3 + '</span>';
        html += '</div>';
      });
      chainDisplay.innerHTML = html;

      // stats
      const bondCount = chain.length - 1;
      const waterReleased = bondCount;
      const hydrophobic = chain.filter(id => AA_DATA[id].cat === 'hydrophobic').length;
      const charged     = chain.filter(id => ['lys','arg','asp','glu'].includes(id)).length;
      const essential   = chain.filter(id => AA_DATA[id].essential).length;

      let infoText = chain.length + ' residue' + (chain.length !== 1 ? 's' : '');
      if (bondCount > 0) infoText += ' · ' + bondCount + ' peptide bond' + (bondCount !== 1 ? 's' : '') + ' · ' + waterReleased + ' H₂O equivalents (net condensation)';
      if (chain.length >= 2) infoText += ' · ' + hydrophobic + ' hydrophobic · ' + charged + ' usually charged near pH 7 · ' + essential + ' essential';
      if (chain.length >= 2) infoText += ' — peptide (no universal length cutoff).';
      chainInfo.textContent = infoText;
      sequenceLine.textContent = 'N–' + chain.map(id => AA_DATA[id].code1).join('') + '–C';
      renderFold();
    }

    function renderFold() {
      const previewImage = document.getElementById('fold-image');
      const caption = document.getElementById('fold-caption');
      foldEmpty.hidden = chain.length >= 3;
      previewImage.hidden = caption.hidden = chain.length < 3;
      if (chain.length < 3) { foldPreview.innerHTML = ''; return; }
      const width = Math.max(600, Math.round(document.querySelector('.aa-fold-stage').clientWidth), chain.length * 68 + 48);
      foldPreview.setAttribute('viewBox', '0 0 ' + width + ' 300');
      foldPreview.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const ns = 'http://www.w3.org/2000/svg';
      foldPreview.innerHTML = '<title>Conceptual side-chain placement, not a protein structure</title>' +
        '<rect width="' + width + '" height="300" fill="#f8fafc"/>' +
        '<rect x="12" y="108" width="' + (width - 24) + '" height="92" rx="16" fill="#dcfce7"/>';
      function label(x, y, value, size, color) {
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-family', 'Arial, sans-serif'); t.setAttribute('font-size', size);
        t.setAttribute('fill', color); t.textContent = value; foldPreview.appendChild(t);
      }
      label(width / 2, 28, 'Water-facing exterior', 19, '#1e40af');
      label(width / 2, 129, 'Interior tendency · hydrophobic side chains', 17, '#166534');
      chain.forEach(function(id, i) {
        const aa = AA_DATA[id], x = 48 + i * (width - 96) / (chain.length - 1);
        const y = aa.cat === 'hydrophobic' ? 163 : (i % 2 ? 240 : 65);
        const circle = document.createElementNS(ns, 'circle');
        circle.setAttribute('cx', x); circle.setAttribute('cy', y); circle.setAttribute('r', 22);
        circle.setAttribute('fill', CAT_COLORS[aa.cat].color);
        circle.setAttribute('stroke', '#fff'); circle.setAttribute('stroke-width', '3');
        foldPreview.appendChild(circle);
        label(x, y + 6, aa.code1, 18, '#fff');
        label(x, y + 39, String(i + 1) + ' · ' + aa.code3, 14, '#334155');
      });
      label(width / 2, 294, 'Sequence positions left → right · no backbone geometry calculated', 16, '#475569');
      const graphic = new XMLSerializer().serializeToString(foldPreview);
      previewImage.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(graphic);
      previewImage.style.width = width + 'px';
      previewImage.alt = 'Side-chain placement of N-to-C sequence ' + chain.map(id => AA_DATA[id].code3).join(', ') + '. Green band marks the interior tendency; other categories are placed toward water.';
    }

    const PRESETS = {
      surface: ['lys','ser','glu','asn','arg','thr','asp','gln'],
      core: ['leu','val','ile','phe','ala','met','trp','leu'],
      mixed: ['met','lys','val','ser','leu','asp','gly','phe','thr','ala']
    };
    document.querySelectorAll('[data-preset]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        chain = PRESETS[btn.dataset.preset].slice();
        renderChain();
      });
    });

    document.getElementById('lab-explanation').addEventListener('input', function(e) {
      document.getElementById('print-explanation').textContent = e.target.value || 'Write an explanation using the evidence above.';
    });
    function clearMutationEvidence() {
      document.getElementById('evidence-sequence').textContent = 'Test to reveal';
      ['bonds','property','placement'].forEach(function(key) {
        document.getElementById('evidence-' + key).textContent = '—';
      });
    }
    document.getElementById('mutation-start').addEventListener('click', function() {
      chain = PRESETS.core.slice(); renderChain();
      clearMutationEvidence();
      document.getElementById('mutation-feedback').textContent = 'Original: residue 4 is Phe, with a hydrophobic aromatic side chain. Predict, then test.';
    });
    document.getElementById('mutation-test').addEventListener('click', function() {
      const prediction = document.getElementById('mutation-prediction').value;
      if (!prediction) { document.getElementById('mutation-feedback').textContent = 'Choose a prediction before testing.'; document.getElementById('mutation-prediction').focus(); return; }
      chain = PRESETS.core.slice(); chain[3] = 'lys'; renderChain();
      document.getElementById('evidence-sequence').textContent = 'LVIKAMWL';
      document.getElementById('evidence-bonds').textContent = '8 / 7 — unchanged';
      document.getElementById('evidence-property').textContent = 'Lys: usually positively charged';
      document.getElementById('evidence-placement').textContent = 'Toward the water-facing exterior';
      document.getElementById('mutation-feedback').textContent = (prediction === 'out' ? 'Your prediction matches the model. ' : 'Compare your prediction with the model. ') + 'Lys has a positively charged side chain near pH 7 and moves outward in this diagram. Both chains still have 8 residues and 7 peptide bonds. This illustrates a chemical tendency; it cannot predict the real fold or protein activity.';
    });
    document.getElementById('mutation-reset').addEventListener('click', function() {
      document.getElementById('mutation-start').click();
      document.getElementById('mutation-prediction').value = '';
    });
    undoBtn.addEventListener('click', function() {
      chain.pop();
      renderChain();
    });

    clearBtn.addEventListener('click', function() {
      chain = [];
      renderChain();
    });

    copyBtn.addEventListener('click', function() {
      if (!chain.length) return;
      const sequence = chain.map(id => AA_DATA[id].code1).join('');
      navigator.clipboard.writeText(sequence).then(function() {
        copyBtn.textContent = 'Copied!';
        window.setTimeout(function() { copyBtn.textContent = 'Copy sequence'; }, 1200);
      }).catch(function() {
        sequenceLine.textContent = 'Sequence: ' + sequence + ' (select and copy)';
      });
    });

    /* ── ionization model ── */
    const phSlider = document.getElementById('ph-slider');
    const phValue = document.getElementById('ph-value');
    const ionAmino = document.getElementById('ion-amino');
    const ionCarboxyl = document.getElementById('ion-carboxyl');
    const chargeOrb = document.getElementById('charge-orb');
    const chargeCopy = document.getElementById('charge-copy');
    function updateIonization() {
      const ph = Number(phSlider.value);
      phValue.textContent = 'pH ' + ph.toFixed(2);
      const ratio1 = Math.pow(10, ph - 2.34);
      const ratio2 = Math.pow(10, ph - 9.60);
      const total = 1 + ratio1 + ratio1 * ratio2;
      const fractions = [1 / total, ratio1 / total, ratio1 * ratio2 / total];
      ['positive','neutral','negative'].forEach(function(state, i) {
        document.getElementById('pop-' + state).value = fractions[i] * 100;
        document.getElementById('pct-' + state).textContent = (fractions[i] * 100).toFixed(1) + '%';
      });
      const charge = fractions[0] - fractions[2];
      chargeOrb.textContent = Math.abs(charge) < 0.005 ? '≈0' : (charge > 0 ? '+' : '−') + Math.abs(charge).toFixed(2);
      chargeOrb.style.background = charge > 0.005 ? '#7c3aed' : charge < -0.005 ? '#2563eb' : '#64748b';
      const dominant = fractions.indexOf(Math.max(...fractions));
      ionAmino.textContent = dominant === 2 ? 'H₂N' : 'H₃N⁺';
      ionCarboxyl.textContent = dominant === 0 ? 'COOH' : 'COO⁻';
      chargeCopy.textContent = 'Average net charge per molecule. ' + (dominant === 0 ? 'Cations are most abundant.' : dominant === 1 ? 'Zwitterions are most abundant; zero net charge does not mean no charges.' : 'Anions are most abundant.');
    }
    phSlider.addEventListener('input', updateIonization);
    document.querySelectorAll('[data-ph]').forEach(function(btn) {
      btn.addEventListener('click', function() { phSlider.value = btn.dataset.ph; updateIonization(); });
    });
    updateIonization();

    /* ── retrieval practice ── */
    const explanations = [
      'The R group varies; the backbone stays the same.',
      'A chain of n residues has n − 1 peptide bonds: 14 − 1 = 13.',
      'Hydrophobic side chains avoid water and tend to pack into the core.',
      'Essential means the body cannot synthesize enough, so food must supply them.'
    ];
    const questions = Array.from(document.querySelectorAll('.aa-question'));
    questions.forEach(function(question, index) {
      question.addEventListener('change', function(e) {
        const correct = e.target.value === question.dataset.answer;
        question.classList.toggle('is-correct', correct);
        question.classList.toggle('is-wrong', !correct);
        question.querySelector('.aa-answer').textContent = (correct ? '✓ ' : 'Try again. ') + explanations[index];
        updateScore();
      });
    });
    function updateScore() {
      const answered = questions.filter(q => q.querySelector('input:checked')).length;
      const score = questions.filter(q => q.querySelector('input:checked') && q.querySelector('input:checked').value === q.dataset.answer).length;
      document.getElementById('quiz-score').textContent = score + '/4';
      document.getElementById('quiz-message').textContent = answered < 4
        ? (4 - answered) + ' question' + (4 - answered === 1 ? '' : 's') + ' left.'
        : (score === 4 ? 'Strong work — you connected structure, bonding, and behavior.' : 'Review the feedback, then revise any answer.');
    }

    /* ── reading progress + active lesson map ── */
    const progressBar = document.getElementById('lesson-progress');
    const mapLinks = Array.from(document.querySelectorAll('.aa-map-link'));
    const lessonSections = Array.from(document.querySelectorAll('[data-lesson-section]'));
    function updateLessonPosition() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = (scrollable > 0 ? Math.min(100, Math.max(0, window.scrollY / scrollable * 100)) : 0) + '%';
      let current = lessonSections[0].id;
      lessonSections.forEach(function(section) {
        if (section.getBoundingClientRect().top <= 180) current = section.id;
      });
      mapLinks.forEach(link => link.classList.toggle('is-current', link.getAttribute('href') === '#' + current));
    }
    window.addEventListener('scroll', updateLessonPosition, { passive: true });
    window.addEventListener('resize', function() {
      updateLessonPosition();
      if (chain.length >= 3) renderFold();
    });
    updateLessonPosition();
    renderChain();

  }());
