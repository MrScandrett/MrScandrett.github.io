import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

(() => {
  'use strict';

  // Real-object metadata is kept separate from the standardized practice signs.
  // These signs do not claim to transcribe or locate marks in any photograph.
  const PRACTICE_SIGNS = [
    {
      id: 'an', location: 'Practice sign 1', glyph: '𒀭', codepoint: 'U+1202D',
      translit: 'an / dingir', pronounce: 'Read an (sky) or dingir (deity), depending on context.',
      meaning: 'sky / deity / silent divine marker', shortGloss: 'Sky or deity',
      role: 'Logogram or determinative',
      literal: 'AN can mean sky or deity; before a divine name it can be an unspoken classifier.',
      notes: 'The actual reading of any ancient sign depends on the language, period, and surrounding text. This is a standardized example, not a reading of the photograph.',
      pos3d: { u: -0.26, v: 0.22, w: 0.34, h: 0.23 }
    },
    {
      id: 'ki', location: 'Practice sign 2', glyph: '𒆠', codepoint: 'U+121A0',
      translit: 'ki', pronounce: 'Sumerian reading: ki.',
      meaning: 'earth / place', shortGloss: 'Earth or place', role: 'Logogram or determinative',
      literal: 'KI may mean earth or place; after a geographical name it can mark a place.',
      notes: 'This standardized sign is shown for comparison and is not mapped to a location on the selected artifact.',
      pos3d: { u: 0.26, v: 0.22, w: 0.34, h: 0.23 }
    },
    {
      id: 'e2', location: 'Practice sign 3', glyph: '𒂍', codepoint: 'U+1208D',
      translit: 'e₂', pronounce: 'Sumerian reading: e₂.',
      meaning: 'house / temple', shortGloss: 'House or temple', role: 'Logogram',
      literal: 'E₂ is a word sign for a house or temple. The subscript distinguishes homophonous readings in modern transliteration.',
      notes: 'The font glyph is a standardized later sign form; archaic and regional forms can look different.',
      pos3d: { u: -0.26, v: -0.22, w: 0.34, h: 0.23 }
    },
    {
      id: 'lugal', location: 'Practice sign 4', glyph: '𒈗', codepoint: 'U+12217',
      translit: 'lugal', pronounce: 'Sumerian reading: lugal.',
      meaning: 'king', shortGloss: 'King', role: 'Logogram',
      literal: 'LUGAL is a Sumerian word sign for king; Akkadian readers could supply their own word for king.',
      notes: 'This is a practice example, not a verified reading from the selected artifact photograph.',
      pos3d: { u: 0.26, v: -0.22, w: 0.34, h: 0.23 }
    }
  ];

  const TABLETS = {
    adab: {
      id: 'adab', name: 'Adab Administrative Tablet',
      museumId: 'Schøyen Collection MS 3029 · ca. 2600–2500 BCE',
      photoUrl: '../../assets/images/lessons/the-ages/sumerian-cuneiform-adab.webp',
      photoAlt: 'Detail of an early Sumerian administrative clay tablet from Adab; enlarge for discussion',
      sourceUrl: 'https://cdli.earth/P252035',
      context: 'CDLI P252035 identifies this as a clay administrative tablet from Adab. Its published transliteration is an account, not a royal dedication. The photograph shows only part of one face.',
      shape: 'slab', materialColor: 0xbda37d, materialRoughness: 0.72,
      signs: PRACTICE_SIGNS
    },
    cyrus: {
      id: 'cyrus', name: 'The Cyrus Cylinder',
      museumId: 'British Museum BM 90920 · 539 BCE',
      photoUrl: '../../assets/images/lessons/daniel/cyrus-cylinder.jpg',
      photoAlt: 'Clay Cyrus Cylinder with Babylonian cuneiform; enlarge for discussion',
      sourceUrl: 'https://www.britishmuseum.org/collection/object/W_1880-0617-1941',
      context: 'The cylinder presents Cyrus’s conquest of Babylon in Babylonian royal-inscription style. The practice signs below are not a line-by-line reading of this cylinder.',
      shape: 'cylinder', materialColor: 0xc98f57, materialRoughness: 0.65,
      signs: PRACTICE_SIGNS
    },
    jehoiachin: {
      id: 'jehoiachin', name: 'Jehoiachin Ration Tablet',
      museumId: 'Vorderasiatisches Museum VAT 16378 · 6th century BCE',
      photoUrl: '../../assets/images/lessons/ezekiel/jehoiachin-ration-tablet.jpg',
      photoAlt: 'Neo-Babylonian clay tablet recording oil rations; enlarge for discussion',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Jehoiachin_Ration_Tablet_(VAT_16378).jpg',
      context: 'This Babylonian palace record belongs to a group of ration lists naming Jehoiachin and royal children. The practice signs are not positioned or transcribed from this tablet.',
      shape: 'cushion', materialColor: 0x7a4e32, materialRoughness: 0.78,
      signs: PRACTICE_SIGNS
    },
    worldmap: {
      id: 'worldmap', name: 'Babylonian Map of the World',
      museumId: 'British Museum BM 92687 · 6th century BCE',
      photoUrl: '../../assets/images/lessons/genesis-10/babylonian-world-map.jpg',
      photoAlt: 'Babylonian clay tablet showing a circular world map and cuneiform text; enlarge for discussion',
      sourceUrl: 'https://www.britishmuseum.org/collection/object/W_1882-0714-509',
      context: 'This map places Babylon and the Euphrates within a surrounding ring of water. Its labels and accompanying text require a published object-specific reading; the signs below are general practice examples.',
      shape: 'worldmap', materialColor: 0x9b7a4f, materialRoughness: 0.7,
      signs: PRACTICE_SIGNS
    }
  };

  // =========================================================================
  // 2. STATE & DOM REFERENCES
  // =========================================================================
  let currentTabletKey = 'adab';
  let currentSignIndex = 0;
  let viewMode = 'split';
  let rtiAzimuth = 45;
  let rtiElevation = 28;
  let autoSweep = false;

  const $ = id => document.getElementById(id);

  // =========================================================================
  // 3. INITIALIZE DIGITAL EPIGRAPHER'S BENCH
  // =========================================================================
  function initEpigraphyBench() {
    const bench = document.querySelector('.cu-epi-bench');
    if (!bench) return;

    setupTabletTabs();
    setupModeButtons();
    setupRtiControls();
    setupStepButtons();

    loadTablet(currentTabletKey);
    init3DViewport();
  }

  // --- TABLET TABS ---
  function setupTabletTabs() {
    const tabContainer = $('cu-epi-tabs');
    if (!tabContainer) return;

    tabContainer.querySelectorAll('.cu-epi-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.tablet;
        if (!TABLETS[key]) return;
        tabContainer.querySelectorAll('.cu-epi-tab').forEach(b => {
          b.setAttribute('aria-selected', String(b === btn));
        });
        loadTablet(key);
      });
    });
  }

  // --- VIEW MODE SWITCHER (Split / Photo / 3D) ---
  function setupModeButtons() {
    const workspace = $('cu-epi-workspace');
    const modeBtns = document.querySelectorAll('.cu-epi-mode-btn');
    if (!workspace || !modeBtns.length) return;

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        viewMode = btn.dataset.mode || 'split';
        workspace.dataset.viewMode = viewMode;
        modeBtns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        if (threeApi && threeApi.onResize) {
          requestAnimationFrame(() => threeApi.onResize());
        }
      });
    });
  }

  // --- LIGHT CONTROLS FOR THE ILLUSTRATIVE MODEL ---
  function setupRtiControls() {
    const azInput = $('cu-rti-azimuth');
    const elInput = $('cu-rti-elevation');
    const azVal = $('cu-rti-azimuth-val');
    const elVal = $('cu-rti-elevation-val');
    const sweepBtn = $('cu-rti-sweep');

    function syncRtiUI() {
      if (azVal) azVal.textContent = `${Math.round(rtiAzimuth)}°`;
      if (elVal) elVal.textContent = `${Math.round(rtiElevation)}°`;
      if (azInput) azInput.value = String(Math.round(rtiAzimuth));
      if (elInput) elInput.value = String(Math.round(rtiElevation));
      if (threeApi && threeApi.updateLight) {
        threeApi.updateLight(rtiAzimuth, rtiElevation);
      }
    }

    if (azInput) {
      azInput.addEventListener('input', () => {
        rtiAzimuth = Number(azInput.value);
        syncRtiUI();
      });
    }
    if (elInput) {
      elInput.addEventListener('input', () => {
        rtiElevation = Number(elInput.value);
        syncRtiUI();
      });
    }
    if (sweepBtn) {
      sweepBtn.addEventListener('click', () => {
        autoSweep = !autoSweep;
        sweepBtn.setAttribute('aria-pressed', String(autoSweep));
      });
    }

  }

  // --- PREV / NEXT CHARACTER STEPPING ---
  function setupStepButtons() {
    const prevBtn = $('cu-epi-prev');
    const nextBtn = $('cu-epi-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const signs = TABLETS[currentTabletKey].signs;
        selectSign((currentSignIndex - 1 + signs.length) % signs.length);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const signs = TABLETS[currentTabletKey].signs;
        selectSign((currentSignIndex + 1) % signs.length);
      });
    }
  }

  // =========================================================================
  // 4. LOAD TABLET & RENDER PHOTO HOTSPOTS + INTERLINEAR STRIP
  // =========================================================================
  function loadTablet(tabletKey) {
    currentTabletKey = tabletKey;
    currentSignIndex = 0;
    const tablet = TABLETS[tabletKey];
    if (!tablet) return;

    const img = $('cu-epi-photo-img');
    const museumBadge = $('cu-photo-museum-id');
    const paneTitle = $('cu-photo-pane-title');
    const photoCaption = $('cu-epi-photo-caption');
    const context = $('cu-epi-object-context');

    if (img) {
      img.src = tablet.photoUrl;
      img.alt = tablet.photoAlt;
      img.style.transform = 'none';
    }
    if (museumBadge) museumBadge.textContent = tablet.museumId.split('·')[0].trim();
    if (paneTitle) paneTitle.textContent = `Real object photograph · click to enlarge`;
    if (photoCaption) photoCaption.textContent = `${tablet.name}, ${tablet.museumId}. ${tablet.context}`;
    if (context) {
      context.replaceChildren(document.createTextNode(`${tablet.context} `));
      const link = document.createElement('a');
      link.href = tablet.sourceUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Open object record';
      context.appendChild(link);
    }

    renderSignStrip(tablet);

    if (threeApi && threeApi.rebuildTablet) {
      threeApi.rebuildTablet(tablet);
    }

    selectSign(0);
  }

  function renderSignStrip(tablet) {
    const strip = $('cu-epi-sign-strip');
    if (!strip) return;
    strip.innerHTML = '';

    tablet.signs.forEach((sign, idx) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cu-epi-chip';
      chip.role = 'option';
      chip.dataset.index = String(idx);
      chip.innerHTML = `
        <span class="cu-epi-chip-glyph" aria-hidden="true">${sign.glyph}</span>
        <span class="cu-epi-chip-translit">${sign.translit}</span>
        <span class="cu-epi-chip-gloss">${sign.shortGloss}</span>
      `;
      chip.addEventListener('pointerenter', () => selectSign(idx));
      chip.addEventListener('click', () => selectSign(idx, true));
      strip.appendChild(chip);
    });
  }

  // =========================================================================
  // 5. SYNCHRONIZED SELECTION & LIVE MEANING DISPLAY PANEL
  // =========================================================================
  function selectSign(index, focus3D = false) {
    const tablet = TABLETS[currentTabletKey];
    if (!tablet || !tablet.signs[index]) return;

    currentSignIndex = index;
    const sign = tablet.signs[index];

    // Highlight the illustrative sign selection.
    document.querySelectorAll('#cu-epi-sign-strip .cu-epi-chip').forEach((el, i) => {
      const active = i === index;
      el.classList.toggle('active', active);
      el.setAttribute('aria-selected', String(active));
    });

    // 3. Update counter
    const counter = $('cu-epi-counter');
    if (counter) {
      counter.textContent = `${index + 1} / ${tablet.signs.length}`;
    }

    // 4. Update 3D HUD & 3D Highlighted Plaque
    const hudGlyph = $('cu-3d-hud-glyph');
    const hudText = $('cu-3d-hud-text');
    if (hudGlyph) hudGlyph.textContent = sign.glyph;
    if (hudText) hudText.textContent = `${sign.translit} — “${sign.meaning}”`;

    if (threeApi && threeApi.setActiveSign) {
      threeApi.setActiveSign(index, focus3D);
    }

    // 5. Populate Right-Hand Word Meaning & Lexicon Inspector
    const locEl = $('cu-insp-location');
    const roleEl = $('cu-insp-role');
    const glyphEl = $('cu-insp-glyph');
    const codeEl = $('cu-insp-codepoint');
    const meaningEl = $('cu-insp-meaning');
    const translitEl = $('cu-insp-translit');
    const pronEl = $('cu-insp-pronounce');
    const litEl = $('cu-insp-literal');
    const notesEl = $('cu-insp-notes');
    const fullTranslitEl = $('cu-insp-full-translit');
    const fullTransEl = $('cu-insp-full-translation');

    if (locEl) locEl.textContent = sign.location;
    if (roleEl) roleEl.textContent = sign.role;
    if (glyphEl) glyphEl.textContent = sign.glyph;
    if (codeEl) codeEl.textContent = sign.codepoint;
    if (meaningEl) meaningEl.textContent = `“${sign.meaning}”`;
    if (translitEl) translitEl.textContent = sign.translit;
    if (pronEl) pronEl.textContent = sign.pronounce;
    if (litEl) litEl.textContent = sign.literal;
    if (notesEl) notesEl.textContent = sign.notes;

    // Practice examples, not an interlinear transcription.
    if (fullTranslitEl) {
      fullTranslitEl.innerHTML = tablet.signs
        .map((s, i) => (i === index ? `<span class="cu-epi-hi">${s.translit}</span>` : s.translit))
        .join(' · ');
    }
    if (fullTransEl) {
      fullTransEl.innerHTML = tablet.signs
        .map((s, i) => (i === index ? `<span class="cu-epi-hi">${s.meaning}</span>` : s.shortGloss))
        .join(' · ');
    }
  }

  // =========================================================================
  // 6. ILLUSTRATIVE 3D CLAY MODEL (THREE.JS + RAYCASTING)
  // =========================================================================
  let threeApi = null;

  function createReliefTextures(tablet) {
    const width = 1024;
    const height = 1024;

    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = width;
    colorCanvas.height = height;
    const cctx = colorCanvas.getContext('2d');

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = width;
    bumpCanvas.height = height;
    const bctx = bumpCanvas.getContext('2d');

    // Base mineral clay / stone color & neutral bump height
    const baseHex = `#${tablet.materialColor.toString(16).padStart(6, '0')}`;
    cctx.fillStyle = baseHex;
    cctx.fillRect(0, 0, width, height);

    bctx.fillStyle = '#909090';
    bctx.fillRect(0, 0, width, height);

    // Procedural clay grain; this is not a scan of an object.
    const noiseFn = window.SimKit && window.SimKit.noise ? window.SimKit.noise.fbm : null;
    for (let y = 0; y < height; y += 6) {
      for (let x = 0; x < width; x += 6) {
        const n = noiseFn ? noiseFn(x * 0.025, y * 0.025, 3) : ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1 + 1) % 1;
        const delta = Math.floor((n - 0.5) * 34);
        const shade = Math.max(40, Math.min(220, 144 + delta));
        bctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        bctx.fillRect(x, y, 6, 6);

        cctx.fillStyle = delta > 0 ? `rgba(255,242,215,${(delta / 255).toFixed(3)})` : `rgba(45,25,10,${(-delta / 220).toFixed(3)})`;
        cctx.fillRect(x, y, 6, 6);
      }
    }

    // Incised register lines & compartments
    bctx.strokeStyle = '#282828';
    bctx.lineWidth = 6;
    cctx.strokeStyle = 'rgba(42, 24, 10, 0.58)';
    cctx.lineWidth = 4;

    if (tablet.shape === 'slab') {
      // Adab compartments
      const rows = [0.14, 0.36, 0.60, 0.84];
      rows.forEach(ry => {
        bctx.beginPath();
        bctx.moveTo(40, ry * height);
        bctx.lineTo(width - 40, ry * height);
        bctx.stroke();

        cctx.beginPath();
        cctx.moveTo(40, ry * height);
        cctx.lineTo(width - 40, ry * height);
        cctx.stroke();
      });
    } else if (tablet.shape === 'cylinder') {
      // 18 circumferential cuneiform ruled registers
      for (let i = 1; i < 18; i++) {
        const ry = (i / 18) * height;
        bctx.beginPath();
        bctx.moveTo(20, ry);
        bctx.lineTo(width - 20, ry);
        bctx.stroke();

        cctx.beginPath();
        cctx.moveTo(20, ry);
        cctx.lineTo(width - 20, ry);
        cctx.stroke();
      }
    } else if (tablet.shape === 'worldmap') {
      // Babylonian Map of the World circular Bitter River + Euphrates + Nagû triangles
      const cx = width * 0.5;
      const cy = height * 0.56;
      const rInner = width * 0.25;
      const rOuter = width * 0.31;

      [rInner, rOuter].forEach(r => {
        bctx.beginPath();
        bctx.arc(cx, cy, r, 0, Math.PI * 2);
        bctx.stroke();
        cctx.beginPath();
        cctx.arc(cx, cy, r, 0, Math.PI * 2);
        cctx.stroke();
      });

      // Euphrates vertical channel
      bctx.strokeRect(cx - 24, cy - rInner + 25, 48, rInner * 1.75);
      cctx.strokeRect(cx - 24, cy - rInner + 25, 48, rInner * 1.75);

      // 7 Outer triangular nagû islands
      for (let a = 0; a < 7; a++) {
        const ang = (a / 7) * Math.PI * 2 - Math.PI * 0.5;
        const bx = cx + Math.cos(ang) * rOuter;
        const by = cy + Math.sin(ang) * rOuter;
        const tx = cx + Math.cos(ang) * (rOuter + 78);
        const ty = cy + Math.sin(ang) * (rOuter + 78);
        const px = -Math.sin(ang) * 34;
        const py = Math.cos(ang) * 34;

        [bctx, cctx].forEach(ctx => {
          ctx.beginPath();
          ctx.moveTo(bx + px, by + py);
          ctx.lineTo(tx, ty);
          ctx.lineTo(bx - px, by - py);
          ctx.closePath();
          ctx.stroke();
        });
      }
    } else {
      // Administrative ration tablet ruled lines
      for (let i = 1; i < 12; i++) {
        const ry = (i / 12) * height;
        bctx.beginPath();
        bctx.moveTo(48, ry);
        bctx.lineTo(width - 48, ry);
        bctx.stroke();
        cctx.beginPath();
        cctx.moveTo(48, ry);
        cctx.lineTo(width - 48, ry);
        cctx.stroke();
      }
    }

    // Carve each cuneiform sign deeply into the bump & color maps
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    cctx.textAlign = 'center';
    cctx.textBaseline = 'middle';

    tablet.signs.forEach(sign => {
      const px = (0.5 + sign.pos3d.u) * width;
      const py = (0.5 - sign.pos3d.v) * height;
      const boxW = sign.pos3d.w * width;
      const boxH = sign.pos3d.h * height;

      // Subtle compartment outline
      bctx.strokeStyle = '#383838';
      bctx.lineWidth = 3;
      bctx.strokeRect(px - boxW / 2, py - boxH / 2, boxW, boxH);

      // Outer bevel ridge (bright in bump map)
      const fontSize = Math.max(26, Math.min(54, Math.floor((boxW / Math.max(1.6, sign.glyph.length * 0.55)) * 0.95)));
      bctx.font = `${fontSize}px Cuneiform, serif`;
      cctx.font = `${fontSize}px Cuneiform, serif`;

      bctx.fillStyle = '#d8d8d8';
      bctx.fillText(sign.glyph, px + 2, py + 2);

      // Deeply recessed wedge cavity (dark in bump map)
      bctx.fillStyle = '#0e0e0e';
      bctx.fillText(sign.glyph, px, py);

      // Dark incised shadow in color map
      cctx.fillStyle = 'rgba(32, 18, 8, 0.88)';
      cctx.fillText(sign.glyph, px, py);
    });

    const colorTex = new THREE.CanvasTexture(colorCanvas);
    colorTex.colorSpace = THREE.SRGBColorSpace;
    const bumpTex = new THREE.CanvasTexture(bumpCanvas);

    return { colorTex, bumpTex, colorCanvas };
  }

  function createSignPlaqueTexture(sign) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle recessed cartouche plate
    ctx.fillStyle = 'rgba(36, 22, 10, 0.22)';
    ctx.beginPath();
    ctx.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 14);
    ctx.fill();

    // Rim highlight
    ctx.strokeStyle = 'rgba(255, 224, 150, 0.55)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Incised cuneiform glyph
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '56px Cuneiform, serif';
    ctx.fillStyle = 'rgba(255, 240, 200, 0.55)';
    ctx.fillText(sign.glyph, canvas.width / 2 + 1.5, canvas.height * 0.44 + 1.5);
    ctx.fillStyle = '#241407';
    ctx.fillText(sign.glyph, canvas.width / 2, canvas.height * 0.44);

    // Transliteration strip
    ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#ffecb3';
    ctx.fillText(sign.translit, canvas.width / 2, canvas.height * 0.82);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function init3DViewport() {
    const canvas = $('cu-epi-3d-canvas');
    if (!canvas) return;

    let sceneBundle = null;
    try {
      sceneBundle = createScene(canvas, {
        THREE,
        fov: 38,
        near: 0.1,
        far: 60,
        clearColor: 0x1c140d,
        clearAlpha: 1
      });
    } catch (_err) {
      init2DFallbackCanvas(canvas);
      return;
    }

    const { renderer, scene, camera, syncSize } = sceneBundle;
    camera.position.set(0, 0.15, 3.35);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.6;
    controls.maxDistance = 5.5;
    controls.maxPolarAngle = Math.PI * 0.85;

    // Ambient + movable model light + point indicator
    const ambientLight = new THREE.AmbientLight(0xffe9c8, 0.58);
    scene.add(ambientLight);

    const rtiLight = new THREE.DirectionalLight(0xfff1d0, 2.55);
    scene.add(rtiLight);

    const rimLight = new THREE.DirectionalLight(0x6fa8dc, 0.45);
    rimLight.position.set(-2.5, -1.8, -2.0);
    scene.add(rimLight);

    // Torch indicator orb showing the direction of the simulated light
    const torchOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffd54f })
    );
    scene.add(torchOrb);

    const artifactGroup = new THREE.Group();
    scene.add(artifactGroup);

    let hitMeshes = [];
    let highlightFrames = [];

    function updateLight(azDeg, elDeg) {
      const az = (azDeg * Math.PI) / 180;
      const el = (elDeg * Math.PI) / 180;
      const radius = 2.6;
      const lx = Math.cos(el) * Math.cos(az) * radius;
      const ly = Math.cos(el) * Math.sin(az) * radius;
      const lz = Math.sin(el) * radius;

      rtiLight.position.set(lx, ly, lz);
      torchOrb.position.set(lx * 0.58, ly * 0.58, Math.max(0.35, lz * 0.58));
    }

    function rebuildTablet(tablet) {
      while (artifactGroup.children.length > 0) {
        artifactGroup.remove(artifactGroup.children[0]);
      }
      hitMeshes = [];
      highlightFrames = [];

      const { colorTex, bumpTex } = createReliefTextures(tablet);

      const clayMat = new THREE.MeshStandardMaterial({
        map: colorTex,
        bumpMap: bumpTex,
        bumpScale: 0.065,
        roughness: tablet.materialRoughness,
        metalness: 0.06
      });

      let bodyMesh;
      if (tablet.shape === 'cylinder') {
        // Barrel-shaped Cyrus Cylinder
        const cylGeo = new THREE.CylinderGeometry(0.56, 0.56, 2.25, 48, 24, false);
        const pos = cylGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          const normY = y / 1.125;
          const bulge = 1 + 0.18 * (1 - normY * normY);
          pos.setX(i, pos.getX(i) * bulge);
          pos.setZ(i, pos.getZ(i) * bulge);
        }
        cylGeo.computeVertexNormals();
        cylGeo.rotateZ(Math.PI / 2);
        bodyMesh = new THREE.Mesh(cylGeo, clayMat);
      } else {
        // Generic slab or cushion-shaped clay model
        const boxGeo = new THREE.BoxGeometry(2.15, 1.85, 0.24, 36, 36, 4);
        const pos = boxGeo.attributes.position;
        const isCushion = tablet.shape === 'cushion' || tablet.shape === 'worldmap';
        for (let i = 0; i < pos.count; i++) {
          const vx = pos.getX(i);
          const vy = pos.getY(i);
          const vz = pos.getZ(i);
          const nx = vx / 1.075;
          const ny = vy / 0.925;
          if (isCushion) {
            const dome = Math.max(0, 1 - 0.35 * (nx * nx + ny * ny));
            pos.setZ(i, vz * dome);
          } else {
            // Subtle chiseled stone edge bevel
            const edge = Math.max(Math.abs(nx), Math.abs(ny));
            if (edge > 0.92) {
              pos.setZ(i, vz * 0.82);
            }
          }
        }
        boxGeo.computeVertexNormals();
        bodyMesh = new THREE.Mesh(boxGeo, clayMat);
      }

      artifactGroup.add(bodyMesh);

      // Create interactive 3D character plaques & wedge reliefs for each sign
      tablet.signs.forEach((sign, idx) => {
        const plaqueTex = createSignPlaqueTexture(sign);
        const pw = sign.pos3d.w * 2.05;
        const ph = sign.pos3d.h * 1.75;

        const plaqueGeo = new THREE.PlaneGeometry(pw, ph);
        const plaqueMat = new THREE.MeshStandardMaterial({
          map: plaqueTex,
          transparent: true,
          roughness: 0.55,
          metalness: 0.1
        });
        const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
        plaqueMesh.userData = { signIndex: idx };

        // Glowing highlight border around active character
        const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(pw * 1.04, ph * 1.04, 0.02));
        const frameMat = new THREE.LineBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.35 });
        const frameLines = new THREE.LineSegments(frameGeo, frameMat);
        plaqueMesh.add(frameLines);

        // Add 3D recessed triangular wedge impressions inside each plaque
        const wedgeGroup = new THREE.Group();
        const totalWedges = 3;
        for (let w = 0; w < totalWedges; w++) {
          const wedgeGeo = new THREE.ConeGeometry(0.018, 0.065, 3);
          const wedgeMat = new THREE.MeshStandardMaterial({
            color: 0x3b2410,
            roughness: 0.85,
            metalness: 0.05
          });
          const wedgeMesh = new THREE.Mesh(wedgeGeo, wedgeMat);
          const offsetX = ((w / Math.max(1, totalWedges - 1)) - 0.5) * (pw * 0.55);
          wedgeMesh.position.set(offsetX, 0.015, 0.004);
          wedgeMesh.rotation.z = (w % 2 === 0) ? 0 : -Math.PI / 2;
          wedgeGroup.add(wedgeMesh);
        }
        plaqueMesh.add(wedgeGroup);

        if (tablet.shape === 'cylinder') {
          const xPos = sign.pos3d.u * 2.1;
          const angle = sign.pos3d.v * 1.2;
          const normX = xPos / 1.125;
          const r = 0.56 * (1 + 0.18 * (1 - normX * normX)) + 0.018;
          plaqueMesh.position.set(xPos, Math.sin(angle) * r, Math.cos(angle) * r);
          plaqueMesh.rotation.x = -angle;
        } else {
          const px = sign.pos3d.u * 2.15;
          const py = sign.pos3d.v * 1.85;
          let pz = 0.128;
          if (tablet.shape === 'cushion' || tablet.shape === 'worldmap') {
            const nx = px / 1.075;
            const ny = py / 0.925;
            pz = 0.12 * Math.max(0, 1 - 0.35 * (nx * nx + ny * ny)) + 0.012;
          }
          plaqueMesh.position.set(px, py, pz);
        }

        artifactGroup.add(plaqueMesh);
        hitMeshes.push(plaqueMesh);
        highlightFrames.push({ plaqueMat, frameMat, mesh: plaqueMesh });
      });

      setActiveSign(currentSignIndex, false);
    }

    function setActiveSign(index, animateFocus) {
      highlightFrames.forEach((item, i) => {
        const isSelected = i === index;
        item.frameMat.color.setHex(isSelected ? 0xffd54f : 0xc8a870);
        item.frameMat.opacity = isSelected ? 1.0 : 0.32;
        item.plaqueMat.emissive.setHex(isSelected ? 0x5c3d08 : 0x000000);
        item.plaqueMat.emissiveIntensity = isSelected ? 0.55 : 0;
        item.mesh.scale.setScalar(isSelected ? 1.06 : 1.0);
      });

      if (animateFocus && highlightFrames[index]) {
        artifactGroup.rotation.y = -highlightFrames[index].mesh.position.x * 0.12;
      }
    }

    // Raycaster for hovering and clicking 3D cuneiform characters
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function handlePointer(event, isClick) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(hitMeshes, false);
      if (intersects.length > 0) {
        const idx = intersects[0].object.userData.signIndex;
        canvas.style.cursor = 'pointer';
        if (idx !== undefined && (idx !== currentSignIndex || isClick)) {
          selectSign(idx, isClick);
        }
      } else {
        canvas.style.cursor = 'grab';
      }
    }

    canvas.addEventListener('pointermove', e => handlePointer(e, false));
    canvas.addEventListener('click', e => handlePointer(e, true));

    const resetBtn = $('cu-epi-reset-cam');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        controls.reset();
        camera.position.set(0, 0.15, 3.35);
        artifactGroup.rotation.set(0, 0, 0);
      });
    }

    threeApi = {
      updateLight,
      rebuildTablet,
      setActiveSign,
      onResize: syncSize
    };

    updateLight(rtiAzimuth, rtiElevation);
    rebuildTablet(TABLETS[currentTabletKey]);

    const runLoop = window.SimKit && window.SimKit.loop
      ? window.SimKit.loop
      : (fn) => {
          let last = performance.now();
          function step(now) {
            fn((now - last) / 1000, now);
            last = now;
            requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        };

    runLoop((dt) => {
      syncSize();
      if (autoSweep) {
        rtiAzimuth = (rtiAzimuth + dt * 42) % 360;
        const azInput = $('cu-rti-azimuth');
        const azVal = $('cu-rti-azimuth-val');
        if (azInput) azInput.value = String(Math.round(rtiAzimuth));
        if (azVal) azVal.textContent = `${Math.round(rtiAzimuth)}°`;
        updateLight(rtiAzimuth, rtiElevation);
      }
      controls.update();
      renderer.render(scene, camera);
    }, { el: canvas, maxDt: 0.1 });
  }

  // =========================================================================
  // 7. GRACEFUL 2.5D RELIEF FALLBACK FOR HEADLESS / NON-WEBGL ENVIRONMENTS
  // =========================================================================
  function init2DFallbackCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function drawFallback() {
      const w = (canvas.width = canvas.clientWidth || 420);
      const h = (canvas.height = canvas.clientHeight || 360);
      const tablet = TABLETS[currentTabletKey];
      if (!tablet) return;

      ctx.fillStyle = '#1c140d';
      ctx.fillRect(0, 0, w, h);

      const padX = w * 0.09;
      const padY = h * 0.09;
      const tw = w - padX * 2;
      const th = h - padY * 2;

      const rad = (rtiAzimuth * Math.PI) / 180;
      const gx = w * 0.5 + Math.cos(rad) * tw * 0.45;
      const gy = h * 0.5 - Math.sin(rad) * th * 0.45;

      const grad = ctx.createRadialGradient(gx, gy, 10, w * 0.5, h * 0.5, tw * 0.75);
      grad.addColorStop(0, '#ebd2a9');
      grad.addColorStop(1, '#9d7646');

      ctx.fillStyle = grad;
      ctx.strokeStyle = '#6e4e2a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(padX, padY, tw, th, tablet.shape === 'cylinder' ? 36 : 16);
      ctx.fill();
      ctx.stroke();

      tablet.signs.forEach((sign, i) => {
        const sx = padX + (0.5 + sign.pos3d.u) * tw;
        const sy = padY + (0.5 - sign.pos3d.v) * th;
        const bw = sign.pos3d.w * tw * 0.92;
        const bh = sign.pos3d.h * th * 0.85;
        const isSelected = i === currentSignIndex;

        ctx.fillStyle = isSelected ? 'rgba(255, 213, 79, 0.34)' : 'rgba(40, 24, 10, 0.18)';
        ctx.strokeStyle = isSelected ? '#ffd54f' : 'rgba(255, 235, 190, 0.45)';
        ctx.lineWidth = isSelected ? 2.5 : 1.2;
        ctx.strokeRect(sx - bw / 2, sy - bh / 2, bw, bh);
        ctx.fillRect(sx - bw / 2, sy - bh / 2, bw, bh);

        ctx.font = '20px Cuneiform, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#2b1808';
        ctx.fillText(sign.glyph, sx, sy);
      });
    }

    canvas.addEventListener('pointermove', e => {
      const rect = canvas.getBoundingClientRect();
      const tablet = TABLETS[currentTabletKey];
      if (!tablet || !rect.width) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const padX = rect.width * 0.09;
      const padY = rect.height * 0.09;
      const tw = rect.width - padX * 2;
      const th = rect.height - padY * 2;

      tablet.signs.forEach((sign, i) => {
        const sx = padX + (0.5 + sign.pos3d.u) * tw;
        const sy = padY + (0.5 - sign.pos3d.v) * th;
        const bw = sign.pos3d.w * tw * 0.92;
        const bh = sign.pos3d.h * th * 0.85;
        if (Math.abs(mx - sx) <= bw / 2 && Math.abs(my - sy) <= bh / 2) {
          selectSign(i, false);
        }
      });
    });

    threeApi = {
      updateLight: drawFallback,
      rebuildTablet: drawFallback,
      setActiveSign: drawFallback,
      onResize: drawFallback
    };

    drawFallback();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEpigraphyBench);
  } else {
    initEpigraphyBench();
  }
})();
