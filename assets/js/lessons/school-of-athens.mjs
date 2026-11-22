import {
  VISUAL_EXHIBITS,
  HARLEM_MUSICIANS,
  GATHERING_WORKS,
  COMPARE_PRESETS,
  filterHarlemMusicians,
  compareGatherings,
  computeAnamorphicTransform
} from './school-of-athens-data.mjs';

const exploredKeys = new Set();
const totalVisualFigures = Object.values(VISUAL_EXHIBITS).reduce(
  (sum, ex) => sum + ex.figures.length,
  0
);
const TOTAL_EXPLORABLE = totalVisualFigures + HARLEM_MUSICIANS.length;

function updateGlobalProgress() {
  const pill = document.getElementById('athens-global-progress');
  if (!pill) return;
  pill.textContent = `Explored ${exploredKeys.size} / ${TOTAL_EXPLORABLE}`;
}

function computeLoupePosition(exhibit, fig) {
  const zx = 4.6;
  const zy = zx * (exhibit.height / exhibit.width);
  const px = Math.max(0, Math.min(100, (zx * fig.x - 50) / (zx - 1)));
  const py = Math.max(0, Math.min(100, (zy * fig.y - 50) / (zy - 1)));
  return { px: px.toFixed(2), py: py.toFixed(2) };
}

function initVisualExhibit(exhibit) {
  const root = document.querySelector(`[data-exhibit="${exhibit.id}"]`);
  if (!root) return;

  const stage = root.querySelector(`[data-stage="${exhibit.id}"]`);
  const stageImg = stage?.querySelector('.athens-stage-img');
  const figureEl = root.querySelector(`[data-figure="${exhibit.id}"]`);
  const hotspotsHost = root.querySelector(`[data-hotspots="${exhibit.id}"]`);
  const rosterHost = root.querySelector(`[data-roster="${exhibit.id}"]`);
  const progressBadge = root.querySelector('[data-exhibit-progress]');

  const bioPanel = root.querySelector(`[data-bio="${exhibit.id}"]`);
  const loupe = bioPanel?.querySelector('[data-loupe]');
  const bioName = bioPanel?.querySelector('[data-bio-name]');
  const bioRole = bioPanel?.querySelector('[data-bio-role]');
  const bioNobel = bioPanel?.querySelector('[data-bio-nobel]');
  const bioSummary = bioPanel?.querySelector('[data-bio-summary]');
  const bioImpact = bioPanel?.querySelector('[data-bio-impact]');
  const bioLookfor = bioPanel?.querySelector('[data-bio-lookfor]');
  const bioSystem = bioPanel?.querySelector('[data-bio-system]');
  const bioTag = bioPanel?.querySelector('[data-bio-tag]');
  const prevBtn = bioPanel?.querySelector('[data-prev]');
  const nextBtn = bioPanel?.querySelector('[data-next]');

  const cleanBtn = root.querySelector('[data-toggle-clean]');
  const guideBtn = root.querySelector('[data-toggle-guide]');
  const enlargeBtn = root.querySelector('[data-enlarge]');
  const filterBtns = Array.from(root.querySelectorAll('[data-exhibit-filter]'));
  const filterStatus = root.querySelector('[data-filter-status]');

  const exhibitExplored = new Set();
  let activeId = exhibit.initialId;
  let activeFilter = 'all';

  function matchesFilter(fig) {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'nobel') return Boolean(fig.nobel);
    return fig.row === activeFilter;
  }

  function updateExhibitProgress() {
    if (progressBadge) {
      progressBadge.textContent = `Explored ${exhibitExplored.size} / ${exhibit.figures.length}`;
    }
  }

  function renderBio(fig) {
    if (!fig || !bioPanel) return;
    if (bioName) bioName.textContent = fig.name;
    if (bioRole) bioRole.textContent = fig.role;
    if (bioNobel) {
      if (fig.nobel) {
        bioNobel.textContent = `Nobel Prize · ${fig.nobel}`;
        bioNobel.hidden = false;
      } else {
        bioNobel.textContent = '';
        bioNobel.hidden = true;
      }
    }
    if (bioSummary) bioSummary.textContent = fig.summary;
    if (bioImpact) bioImpact.textContent = fig.impact;
    if (bioLookfor) bioLookfor.textContent = fig.lookfor;
    if (bioSystem) bioSystem.textContent = fig.systemLens;
    if (bioTag) bioTag.textContent = fig.tag;

    if (loupe) {
      const { px, py } = computeLoupePosition(exhibit, fig);
      loupe.style.backgroundImage = `url("${exhibit.image}")`;
      loupe.style.backgroundSize = '460% auto';
      loupe.style.backgroundPosition = `${px}% ${py}%`;
    }
  }

  function setActive(id, { markExplored = true, focusHotspot = false } = {}) {
    const fig = exhibit.figures.find((item) => item.id === id);
    if (!fig) return;
    activeId = id;

    if (markExplored) {
      exhibitExplored.add(id);
      exploredKeys.add(`${exhibit.id}:${id}`);
      updateExhibitProgress();
      updateGlobalProgress();
    }

    hotspotsHost?.querySelectorAll('.athens-hotspot').forEach((btn) => {
      const btnId = btn.dataset.id;
      const isActive = btnId === id;
      btn.classList.toggle('is-active', isActive);
      btn.classList.toggle('is-explored', exhibitExplored.has(btnId));
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      if (isActive && focusHotspot) btn.focus();
    });

    rosterHost?.querySelectorAll('.athens-figure-btn').forEach((btn) => {
      const isActive = btn.dataset.id === id;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    renderBio(fig);
  }

  function stepFigure(delta, focusHotspot = false) {
    const pool = exhibit.figures.filter(matchesFilter);
    const list = pool.length ? pool : exhibit.figures;
    const idx = list.findIndex((item) => item.id === activeId);
    const nextIdx = idx < 0 ? 0 : (idx + delta + list.length) % list.length;
    setActive(list[nextIdx].id, { markExplored: true, focusHotspot });
  }

  function applyFilter(filterId) {
    activeFilter = filterId;
    let visibleCount = 0;

    filterBtns.forEach((btn) => {
      const isOn = btn.dataset.exhibitFilter === filterId;
      btn.classList.toggle('is-active', isOn);
      btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    });

    hotspotsHost?.querySelectorAll('.athens-hotspot').forEach((btn) => {
      const fig = exhibit.figures.find((f) => f.id === btn.dataset.id);
      const match = fig ? matchesFilter(fig) : true;
      btn.classList.toggle('is-dimmed', !match);
      if (match) visibleCount++;
    });

    rosterHost?.querySelectorAll('.athens-figure-btn').forEach((btn) => {
      const fig = exhibit.figures.find((f) => f.id === btn.dataset.id);
      const match = fig ? matchesFilter(fig) : true;
      btn.hidden = !match;
    });

    if (filterStatus) {
      filterStatus.textContent =
        filterId === 'all'
          ? `Showing all ${exhibit.figures.length} scientists`
          : `Highlighting ${visibleCount} matching scientists`;
    }

    const currentFig = exhibit.figures.find((f) => f.id === activeId);
    if (currentFig && !matchesFilter(currentFig)) {
      const firstMatch = exhibit.figures.find(matchesFilter);
      if (firstMatch) setActive(firstMatch.id, { markExplored: false });
    }
  }

  if (hotspotsHost && rosterHost) {
    exhibit.figures.forEach((fig) => {
      const hotspot = document.createElement('button');
      hotspot.type = 'button';
      hotspot.className = 'athens-hotspot';
      if (fig.x < 16) hotspot.classList.add('is-edge-left');
      else if (fig.x > 84) hotspot.classList.add('is-edge-right');
      if (fig.y > 82) hotspot.classList.add('is-edge-bottom');

      hotspot.dataset.id = fig.id;
      hotspot.dataset.short = fig.short;
      hotspot.style.left = `${fig.x}%`;
      hotspot.style.top = `${fig.y}%`;
      hotspot.setAttribute('aria-label', `Inspect ${fig.name}`);
      hotspot.setAttribute('aria-pressed', 'false');

      hotspot.addEventListener('click', (e) => {
        e.stopPropagation();
        setActive(fig.id, { markExplored: true });
      });

      hotspot.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          stepFigure(1, true);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          stepFigure(-1, true);
        }
      });

      hotspotsHost.appendChild(hotspot);

      const listBtn = document.createElement('button');
      listBtn.type = 'button';
      listBtn.className = 'athens-figure-btn';
      listBtn.dataset.id = fig.id;
      listBtn.setAttribute('aria-pressed', 'false');

      const nameEl = document.createElement('strong');
      nameEl.textContent = fig.name;
      const roleEl = document.createElement('span');
      roleEl.textContent = fig.nobel ? `${fig.role} · Nobel` : fig.role;
      listBtn.append(nameEl, roleEl);

      listBtn.addEventListener('click', () => {
        setActive(fig.id, { markExplored: true });
      });

      rosterHost.appendChild(listBtn);
    });
  }

  prevBtn?.addEventListener('click', () => stepFigure(-1));
  nextBtn?.addEventListener('click', () => stepFigure(1));

  cleanBtn?.addEventListener('click', () => {
    const nextClean = !stage?.classList.contains('is-clean-view');
    stage?.classList.toggle('is-clean-view', nextClean);
    cleanBtn.setAttribute('aria-pressed', nextClean ? 'true' : 'false');
    cleanBtn.textContent = nextClean ? 'Show Pins' : 'Clean View';
  });

  guideBtn?.addEventListener('click', () => {
    const nextGuide = !stage?.classList.contains('has-guide');
    stage?.classList.toggle('has-guide', nextGuide);
    guideBtn.setAttribute('aria-pressed', nextGuide ? 'true' : 'false');
  });

  enlargeBtn?.addEventListener('click', () => {
    if (window.PhotoLightbox && figureEl) {
      window.PhotoLightbox.open(figureEl, stageImg);
    }
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      applyFilter(btn.dataset.exhibitFilter || 'all');
    });
  });

  updateExhibitProgress();
  setActive(exhibit.initialId, { markExplored: false });
}

function initAnamorphicViewer() {
  const canvas = document.getElementById('ambassadors-anamorph-canvas');
  const slider = document.getElementById('ambassadors-angle-slider');
  const readout = document.getElementById('ambassadors-angle-readout');
  const statusEl = document.getElementById('ambassadors-anamorph-status');
  const presetBtns = Array.from(document.querySelectorAll('[data-anamorph-preset]'));
  if (!canvas || !slider) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const img = new Image();
  let loaded = false;

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const cw = Math.max(260, Math.round(rect.width || 420));
    const ch = Math.round(cw * (190 / 420));
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
    }

    const angle = Number(slider.value || 0);
    const tf = computeAnamorphicTransform(angle);

    if (readout) readout.textContent = `${tf.angle}°`;
    if (statusEl) statusEl.textContent = tf.label;

    presetBtns.forEach((btn) => {
      const target = Number(btn.dataset.anamorphPreset);
      const isMatch = Math.abs(target - tf.angle) <= 2;
      btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
    });

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#151311';
    ctx.fillRect(0, 0, cw, ch);

    if (loaded && img.naturalWidth > 0) {
      const fitScale = cw / 520;
      const sx = 0.465 * img.naturalWidth;
      const sy = 0.875 * img.naturalHeight;

      ctx.save();
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(fitScale * tf.zoom * tf.scaleX, fitScale * tf.zoom);
      ctx.rotate((tf.rotDeg * Math.PI) / 180);
      ctx.drawImage(img, -sx, -sy);
      ctx.restore();
    } else {
      ctx.fillStyle = '#d7cbb8';
      ctx.font = '600 13px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Loading Holbein floor detail…', cw / 2, ch / 2);
    }

    ctx.restore();
  }

  img.addEventListener('load', () => {
    loaded = true;
    draw();
  });
  img.src = VISUAL_EXHIBITS.ambassadors.image;

  slider.addEventListener('input', draw);
  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      slider.value = btn.dataset.anamorphPreset || '0';
      draw();
    });
  });

  window.addEventListener('resize', draw);
  draw();
}

function initHarlemExplorer() {
  const root = document.querySelector('[data-harlem-explorer]');
  if (!root) return;

  const searchInput = document.getElementById('harlem-search');
  const familyBtns = Array.from(root.querySelectorAll('[data-harlem-family]'));
  const eraBtns = Array.from(root.querySelectorAll('[data-harlem-era]'));
  const clearBtn = document.getElementById('harlem-clear-btn');
  const countLabel = document.getElementById('harlem-filter-count');
  const grid = document.getElementById('harlem-directory-grid');
  const progressBadge = document.getElementById('harlem-progress');

  const bioName = document.getElementById('harlem-bio-name');
  const bioRole = document.getElementById('harlem-bio-role');
  const bioMetaPill = document.getElementById('harlem-bio-meta-pill');
  const bioSummary = document.getElementById('harlem-bio-summary');
  const bioImpact = document.getElementById('harlem-bio-impact');
  const bioListen = document.getElementById('harlem-bio-listen');
  const bioTag = document.getElementById('harlem-bio-tag');
  const prevBtn = root.querySelector('[data-harlem-prev]');
  const nextBtn = root.querySelector('[data-harlem-next]');

  const state = { query: '', family: 'all', era: 'all' };
  const harlemExplored = new Set();
  let activeId = 'count-basie';
  let currentFiltered = filterHarlemMusicians(HARLEM_MUSICIANS, state);

  function renderBio(musician) {
    if (!musician) return;
    if (bioName) bioName.textContent = musician.name;
    if (bioRole) bioRole.textContent = musician.role;
    if (bioMetaPill) bioMetaPill.textContent = `${musician.instrumentFamily} · ${musician.era}`;
    if (bioSummary) bioSummary.textContent = musician.summary;
    if (bioImpact) bioImpact.textContent = musician.impact;
    if (bioListen) bioListen.textContent = musician.listenFor;
    if (bioTag) bioTag.textContent = musician.tag;
  }

  function selectMusician(id, markExplored = true) {
    const found = HARLEM_MUSICIANS.find((m) => m.id === id);
    if (!found) return;
    activeId = id;

    if (markExplored) {
      harlemExplored.add(id);
      exploredKeys.add(`harlem:${id}`);
      if (progressBadge) {
        progressBadge.textContent = `Explored ${harlemExplored.size} / ${HARLEM_MUSICIANS.length}`;
      }
      updateGlobalProgress();
    }

    grid?.querySelectorAll('.harlem-card-btn').forEach((btn) => {
      const isActive = btn.dataset.id === id;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    renderBio(found);
  }

  function renderDirectory() {
    if (!grid) return;
    currentFiltered = filterHarlemMusicians(HARLEM_MUSICIANS, state);

    if (countLabel) {
      countLabel.textContent = `Showing ${currentFiltered.length} of ${HARLEM_MUSICIANS.length} musicians`;
    }

    grid.textContent = '';

    if (!currentFiltered.length) {
      const empty = document.createElement('p');
      empty.className = 'harlem-empty';
      empty.textContent = 'No musicians match that search or filter. Try clearing the filters above.';
      grid.appendChild(empty);
      return;
    }

    currentFiltered.forEach((musician) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'harlem-card-btn';
      btn.dataset.id = musician.id;
      const isActive = musician.id === activeId;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');

      const nameEl = document.createElement('strong');
      nameEl.textContent = musician.name;
      const subEl = document.createElement('span');
      subEl.textContent = `${musician.instrumentFamily} · ${musician.era}`;
      btn.append(nameEl, subEl);

      btn.addEventListener('click', () => selectMusician(musician.id, true));
      grid.appendChild(btn);
    });

    if (!currentFiltered.some((m) => m.id === activeId)) {
      selectMusician(currentFiltered[0].id, false);
    }
  }

  searchInput?.addEventListener('input', () => {
    state.query = searchInput.value;
    renderDirectory();
  });

  familyBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.family = btn.dataset.harlemFamily || 'all';
      familyBtns.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      renderDirectory();
    });
  });

  eraBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.era = btn.dataset.harlemEra || 'all';
      eraBtns.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      renderDirectory();
    });
  });

  clearBtn?.addEventListener('click', () => {
    state.query = '';
    state.family = 'all';
    state.era = 'all';
    if (searchInput) searchInput.value = '';
    familyBtns.forEach((b) => {
      const on = b.dataset.harlemFamily === 'all';
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    eraBtns.forEach((b) => {
      const on = b.dataset.harlemEra === 'all';
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    renderDirectory();
  });

  prevBtn?.addEventListener('click', () => {
    if (!currentFiltered.length) return;
    const idx = currentFiltered.findIndex((m) => m.id === activeId);
    const prevIdx = idx < 0 ? 0 : (idx - 1 + currentFiltered.length) % currentFiltered.length;
    selectMusician(currentFiltered[prevIdx].id, true);
  });

  nextBtn?.addEventListener('click', () => {
    if (!currentFiltered.length) return;
    const idx = currentFiltered.findIndex((m) => m.id === activeId);
    const nextIdx = idx < 0 ? 0 : (idx + 1) % currentFiltered.length;
    selectMusician(currentFiltered[nextIdx].id, true);
  });

  renderDirectory();
  selectMusician(activeId, false);
}

function initPepperClusters() {
  const btns = Array.from(document.querySelectorAll('[data-pepper-filter]'));
  const cards = Array.from(document.querySelectorAll('[data-pepper-card]'));
  if (!btns.length || !cards.length) return;

  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.pepperFilter || 'all';
      btns.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      cards.forEach((card) => {
        const match = filter === 'all' || card.dataset.pepperCard === filter;
        card.hidden = !match;
      });
    });
  });
}

function initCompareLab() {
  const selectA = document.getElementById('compare-select-a');
  const selectB = document.getElementById('compare-select-b');
  const headA = document.getElementById('compare-head-a');
  const headB = document.getElementById('compare-head-b');
  const promptEl = document.getElementById('compare-prompt-text');
  const presetHost = document.getElementById('compare-presets');
  if (!selectA || !selectB) return;

  const fields = ['creator', 'medium', 'patron', 'realityMode', 'visualCenter', 'inclusionExclusion', 'culturalWork'];

  GATHERING_WORKS.forEach((work) => {
    const optA = document.createElement('option');
    optA.value = work.id;
    optA.textContent = `${work.title} (${work.year})`;
    selectA.appendChild(optA);

    const optB = document.createElement('option');
    optB.value = work.id;
    optB.textContent = `${work.title} (${work.year})`;
    selectB.appendChild(optB);
  });

  selectA.value = 'athens';
  selectB.value = 'solvay';

  function renderComparison() {
    const { workA, workB, prompt } = compareGatherings(selectA.value, selectB.value);
    if (headA) headA.textContent = `${workA.title} (${workA.year})`;
    if (headB) headB.textContent = `${workB.title} (${workB.year})`;

    fields.forEach((field) => {
      const cellA = document.getElementById(`compare-a-${field}`);
      const cellB = document.getElementById(`compare-b-${field}`);
      if (cellA) cellA.textContent = workA[field];
      if (cellB) cellB.textContent = workB[field];
    });

    if (promptEl) promptEl.textContent = prompt;

    presetHost?.querySelectorAll('[data-compare-preset]').forEach((btn) => {
      const active =
        (btn.dataset.a === workA.id && btn.dataset.b === workB.id) ||
        (btn.dataset.a === workB.id && btn.dataset.b === workA.id);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  if (presetHost) {
    COMPARE_PRESETS.forEach((preset) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'athens-tool-btn';
      btn.dataset.comparePreset = preset.id;
      btn.dataset.a = preset.a;
      btn.dataset.b = preset.b;
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = preset.label;
      btn.addEventListener('click', () => {
        selectA.value = preset.a;
        selectB.value = preset.b;
        renderComparison();
      });
      presetHost.appendChild(btn);
    });
  }

  selectA.addEventListener('change', renderComparison);
  selectB.addEventListener('change', renderComparison);
  renderComparison();
}

function initJumpNav() {
  const links = Array.from(document.querySelectorAll('.athens-jump-pill'));
  const targets = links
    .map((link) => {
      const id = link.getAttribute('href')?.slice(1);
      return id ? { link, el: document.getElementById(id) } : null;
    })
    .filter((item) => item && item.el);

  if (!targets.length || typeof IntersectionObserver !== 'function') return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const topId = visible[0].target.id;
      links.forEach((link) => {
        link.classList.toggle('is-current', link.getAttribute('href') === `#${topId}`);
      });
    },
    { rootMargin: '-18% 0px -65% 0px', threshold: 0.01 }
  );

  targets.forEach((item) => observer.observe(item.el));
}

Object.values(VISUAL_EXHIBITS).forEach(initVisualExhibit);
initAnamorphicViewer();
initHarlemExplorer();
initPepperClusters();
initCompareLab();
initJumpNav();
updateGlobalProgress();
