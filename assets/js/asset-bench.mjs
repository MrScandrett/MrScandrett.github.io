// Asset Bench: open a student's model or texture from ANY app, check it against the
// Game Asset Studio brief, polish it with one-click fixes, and download a clean file.
//
//   <div data-asset-bench="prop"></div>    modes: texture | prop | kit | export | rig | anim | any
//   <script type="module" src="../../assets/js/asset-bench.mjs"></script>
//
// Everything runs in the browser. Files are never uploaded; the "shelf" of recent
// exports lives in this browser's IndexedDB so the next lesson can reopen them.
// Three.js (and the format loaders) load only when a model or 3D preview is needed.

const THREE_URL = new URL('../vendor/three-bundle.min.js', import.meta.url).href;
const EXTRAS_URL = new URL('../vendor/three-extras.min.js', import.meta.url).href;
const DRACO_URL = new URL('../vendor/draco/', import.meta.url).href;

const BRIEF_KEY = 'classroomos-asset-studio:brief';
const DEFAULT_BRIEF = { project: '', palette: ['#3b5b6e', '#c98a4b', '#e9e2d0'], module: '4', texel: '512', texture: '1024', propTris: '2000', charTris: '5000' };
const MODEL_EXT = ['glb', 'gltf', 'fbx', 'obj', 'dae', '3mf', 'usdz', 'stl', 'ply'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];
const MODES = {
  texture: { tab: 'texture', label: 'Lesson 1 · material check' },
  prop: { tab: 'model', label: 'Lesson 2 · prop check' },
  kit: { tab: 'model', label: 'Lesson 3 · room-kit check' },
  export: { tab: 'model', label: 'Lesson 4 · export check' },
  rig: { tab: 'model', label: 'Lesson 5 · rig check' },
  anim: { tab: 'model', label: 'Lesson 6 · animation check' },
  any: { tab: 'model', label: 'Any asset' }
};

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ext = (name) => (name.split('.').pop() || '').toLowerCase();
const baseName = (name) => name.replace(/\.[^.]+$/, '');
const pascal = (s) => (String(s).replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('') || 'Asset').slice(0, 32);
const fmt = (n, d = 2) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString();
const isPOT = (n) => n > 0 && (n & (n - 1)) === 0;
const nearestPOT = (n) => 2 ** Math.round(Math.log2(Math.max(1, n)));
const RF = { willReadFrequently: true }; // the Bench reads pixels back from most of its canvases

export function getBrief() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(BRIEF_KEY) || '{}') || {}; } catch {}
  const b = { ...DEFAULT_BRIEF, ...saved };
  return { ...b, module: +b.module || 4, texel: +b.texel || 512, texture: +b.texture || 1024, propTris: +b.propTris || 2000, charTris: +b.charTris || 5000, palette: (b.palette || DEFAULT_BRIEF.palette).slice(0, 3) };
}

let threePromise;
function loadThree() {
  threePromise ||= Promise.all([import(THREE_URL), import(EXTRAS_URL)]).then(([core, extras]) => ({ ...core, ...extras }));
  return threePromise;
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ---------- Shelf: last few exports, kept in this browser so later lessons can reopen them ---------- */
const shelf = (() => {
  const open = () => new Promise((resolve, reject) => {
    const req = indexedDB.open('classroomos-asset-bench', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('shelf', { keyPath: 'name' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction('shelf', mode);
      const out = fn(t.objectStore('shelf'));
      t.oncomplete = () => resolve(out.result ?? out);
      t.onerror = () => reject(t.error);
    });
  };
  return {
    async list() { try { return (await tx('readonly', (s) => s.getAll())).sort((a, b) => b.time - a.time); } catch { return []; } },
    async put(name, blob, kind) {
      try {
        await tx('readwrite', (s) => s.put({ name, blob, kind, time: Date.now() }));
        const all = await this.list();
        for (const old of all.slice(12)) await tx('readwrite', (s) => s.delete(old.name));
      } catch {}
      document.dispatchEvent(new CustomEvent('asset-bench:shelf'));
    },
    async remove(name) { try { await tx('readwrite', (s) => s.delete(name)); } catch {} document.dispatchEvent(new CustomEvent('asset-bench:shelf')); }
  };
})();

/* ================================================================ UI shell */

function mount(host) {
  const mode = MODES[host.dataset.assetBench] ? host.dataset.assetBench : 'any';
  host.classList.add('ab');
  host.setAttribute('data-memory-ignore', '');
  host.innerHTML = `
    <div class="ab-head">
      <div><b>Asset Bench</b><span>${esc(MODES[mode].label)} · open work from any app, check it, polish it, export it</span></div>
      <div class="ab-tabs" role="tablist" aria-label="What are you checking?">
        <button role="tab" data-tab="model">3D model</button>
        <button role="tab" data-tab="texture">Texture</button>
      </div>
    </div>
    <div class="ab-drop" tabindex="0" aria-label="Drop a file here, or choose one">
      <input type="file" multiple hidden>
      <div class="ab-drop-copy">
        <strong data-drop-title></strong>
        <span data-drop-formats></span>
        <span class="ab-privacy">Your file stays on this computer. Nothing is uploaded.</span>
      </div>
      <div class="ab-drop-actions">
        <button class="ab-btn" data-pick>Choose file…</button>
        <button class="ab-btn alt" data-sample>Try a messy sample</button>
      </div>
      <div class="ab-shelf" data-shelf hidden></div>
    </div>
    <div class="ab-status" role="status" aria-live="polite"></div>
    <div class="ab-work" data-work hidden></div>`;

  const state = { mode, tab: MODES[mode].tab, model: null, texture: null };
  const $ = (sel) => host.querySelector(sel);
  const input = $('input[type=file]');
  const drop = $('.ab-drop');
  const work = $('[data-work]');
  const status = $('.ab-status');
  const say = (msg, kind = '') => { status.textContent = msg; status.dataset.kind = kind; };

  const setTab = (tab) => {
    state.tab = tab;
    host.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    $('[data-drop-title]').textContent = tab === 'model' ? 'Drop your exported model here' : 'Drop your texture or photo here';
    $('[data-drop-formats]').innerHTML = tab === 'model'
      ? 'Opens <code>.glb</code> <code>.gltf</code> <code>.fbx</code> <code>.obj</code> (+ <code>.mtl</code>) <code>.dae</code> <code>.3mf</code> <code>.usdz</code> <code>.stl</code> <code>.ply</code>. Exported from Blender, Maya, 3ds Max, SketchUp, Tinkercad, Fusion, Onshape, Nomad, MagicaVoxel, Mixamo… Drop a model together with its texture files.'
      : 'Opens <code>.png</code> <code>.jpg</code> <code>.webp</code>. Painted in Krita, GIMP, Photoshop, Photopea, Procreate, Aseprite, or a photo from your phone.';
    input.accept = tab === 'model' ? [...MODEL_EXT, 'bin', 'mtl', ...IMAGE_EXT].map((e) => '.' + e).join(',') : 'image/*';
    const current = tab === 'model' ? state.model : state.texture;
    work.hidden = !current;
    work.replaceChildren(...(current ? [current.el] : []));
    drop.classList.toggle('is-compact', !!current);
    current?.resume?.();
  };
  host.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));

  const openFiles = async (files) => {
    files = [...files];
    if (!files.length) return;
    const main = files.find((f) => MODEL_EXT.includes(ext(f.name)));
    try {
      if (main) {
        say(`Opening ${main.name}…`);
        state.model?.dispose?.();
        state.model = await modelWorkspace({ files, main, mode, say });
        setTab('model');
        say(`Opened ${main.name}. Read the checks, then fix what you can.`, 'ok');
      } else {
        const img = files.find((f) => IMAGE_EXT.includes(ext(f.name)) || f.type.startsWith('image/'));
        if (!img) { say(`The Bench can't open ${files[0].name}. Export a .glb (or .fbx / .obj) from your app, or a .png image.`, 'bad'); return; }
        say(`Opening ${img.name}…`);
        state.texture?.dispose?.();
        state.texture = await textureWorkspace({ source: img, name: baseName(img.name), say });
        setTab('texture');
        say(`Opened ${img.name}.`, 'ok');
      }
    } catch (err) {
      console.warn('[asset-bench]', err);
      say(`Couldn't read that file: ${err.message || err}. Try exporting it again as .glb (models) or .png (images).`, 'bad');
    }
  };

  $('[data-pick]').addEventListener('click', () => input.click());
  input.addEventListener('change', () => { openFiles(input.files); input.value = ''; });
  drop.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === drop) { e.preventDefault(); input.click(); } });
  ['dragenter', 'dragover'].forEach((t) => host.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((t) => host.addEventListener(t, (e) => { if (t === 'dragleave' && host.contains(e.relatedTarget)) return; drop.classList.remove('is-over'); }));
  host.addEventListener('drop', (e) => { e.preventDefault(); openFiles(e.dataTransfer.files); });

  $('[data-sample]').addEventListener('click', async () => {
    try {
      if (state.tab === 'texture') {
        state.texture?.dispose?.();
        state.texture = await textureWorkspace({ source: sampleTextureCanvas(), name: 'MessyBrickPhoto', say });
        setTab('texture');
        say('Sample photo loaded: uneven lighting, not square, not tileable. Fix it!', 'ok');
      } else {
        say('Building a messy sample…');
        state.model?.dispose?.();
        state.model = await modelWorkspace({ sample: mode, mode, say });
        setTab('model');
        say('Sample loaded. It has the problems real exports often have. Fix them one by one.', 'ok');
      }
    } catch (err) { console.warn('[asset-bench]', err); say(`Sample failed: ${err.message}`, 'bad'); }
  });

  const renderShelf = async () => {
    const items = await shelf.list();
    const box = $('[data-shelf]');
    box.hidden = !items.length;
    box.innerHTML = items.length ? `<span>Your shelf (this browser):</span>${items.slice(0, 8).map((it) => `<button class="ab-chip" data-shelf-open="${esc(it.name)}" title="Reopen ${esc(it.name)}">${it.kind === 'texture' ? '🖼' : '📦'} ${esc(it.name)}</button>`).join('')}` : '';
    box.querySelectorAll('[data-shelf-open]').forEach((b) => b.addEventListener('click', async () => {
      const it = (await shelf.list()).find((x) => x.name === b.dataset.shelfOpen);
      if (it) openFiles([new File([it.blob], it.name, { type: it.blob.type })]);
    }));
  };
  renderShelf();
  document.addEventListener('asset-bench:shelf', renderShelf);
  setTab(state.tab);
}

/* ================================================================ Model workspace */

async function modelWorkspace({ files, main, sample, mode, say }) {
  const T = await loadThree();
  const { THREE } = T;
  const brief = getBrief();
  let loaded;
  if (sample) loaded = buildSample(THREE, sample);
  else loaded = await loadModelFiles(T, files, main);
  const fileBase = pascal(sample ? loaded.name : baseName(main.name));
  const model = loaded.scene;
  model.name = model.name && !/^(Scene|AuxScene|Root|RootNode|Group)$/i.test(model.name) ? model.name : fileBase;
  const clips = loaded.animations || [];
  const sourceFormat = sample ? 'sample' : ext(main.name);

  const el = document.createElement('div');
  el.className = 'ab-model';
  el.innerHTML = `
    <div class="ab-view">
      <canvas aria-label="3D preview of your model. Drag to orbit, scroll to zoom."></canvas>
      <div class="ab-view-bar">
        <div class="ab-seg" role="group" aria-label="View">
          <button data-view="shaded" aria-pressed="true">Shaded</button>
          <button data-view="checker" aria-pressed="false">UV checker</button>
          <button data-view="faces" aria-pressed="false">Face direction</button>
          <button data-view="wire" aria-pressed="false">Wireframe</button>
        </div>
        <label class="ab-toggle"><input type="checkbox" data-human checked> 1.75 m person</label>
        <label class="ab-toggle"><input type="checkbox" data-grid checked> ${brief.module} m grid</label>
      </div>
      <div class="ab-clips" data-clips hidden></div>
      <p class="ab-legend" data-legend></p>
    </div>
    <div class="ab-side">
      <div class="ab-summary" data-summary></div>
      <h4>Checks <small data-score></small></h4>
      <ol class="ab-checks" data-checks></ol>
      <details class="ab-names"><summary>Rename parts, materials and clips</summary><div data-names></div></details>
      <div class="ab-export">
        <h4>Export</h4>
        <label>File name <input data-outname value="${esc(fileBase)}" maxlength="48" spellcheck="false"></label>
        <div class="ab-export-row">
          <button class="ab-btn" data-export="glb">Download .glb</button>
          <button class="ab-btn alt" data-export="obj">.obj</button>
          <button class="ab-btn alt" data-export="stl">.stl (mm, 3D print)</button>
          <button class="ab-btn alt" data-export="png">Snapshot .png</button>
          <button class="ab-btn alt" data-export="report">Check report .txt</button>
        </div>
        <p class="ab-note">.glb opens in Godot, Unity (glTFast), Unreal, Roblox Studio, Three.js, Blender, Maya (plugin), and back here. Your original file is untouched.</p>
      </div>
    </div>`;
  const q = (s) => el.querySelector(s);

  // --- scene
  const canvas = q('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1b2d3a');
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 2000);
  const controls = new T.OrbitControls(camera, canvas);
  controls.enableDamping = true;
  scene.add(new THREE.HemisphereLight('#dff1ff', '#3b3226', 1.6));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(3, 6, 4);
  scene.add(sun);
  const helpers = new THREE.Group();
  scene.add(helpers);
  const stage = new THREE.Group();
  scene.add(stage);
  stage.add(model);
  const mixer = new THREE.AnimationMixer(model);
  let action = null;

  const human = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.31, 6, 16), new THREE.MeshLambertMaterial({ color: '#8fb4c6', transparent: true, opacity: 0.55 }));
  human.name = '__bench_human';
  helpers.add(human);
  let grid;
  const buildGrid = (span) => {
    if (grid) helpers.remove(grid);
    const cells = Math.max(4, Math.ceil(span / brief.module) * 2 + 2);
    grid = new THREE.GridHelper(cells * brief.module, cells, '#6fc3d8', '#3a5566');
    grid.material.transparent = true;
    grid.material.opacity = 0.6;
    helpers.add(grid);
    const axes = new THREE.AxesHelper(Math.min(brief.module, 1));
    grid.add(axes);
  };

  // --- view modes swap materials; originals are kept so export always uses the real ones
  const originals = new Map();
  const checker = makeCheckerTexture(THREE);
  let view = 'shaded';
  const viewMaterial = (orig, kind) => {
    if (kind === 'checker') return new THREE.MeshLambertMaterial({ map: checker, side: THREE.DoubleSide });
    if (kind === 'wire') return new THREE.MeshBasicMaterial({ color: '#8de4f5', wireframe: true });
    const m = new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide });
    m.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.rgb *= gl_FrontFacing ? vec3(0.35,0.55,1.0) : vec3(1.0,0.22,0.22);'); };
    return m;
  };
  const setView = (kind) => {
    view = kind;
    el.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === kind)));
    model.traverse((o) => {
      if (!o.isMesh) return;
      if (!originals.has(o)) originals.set(o, o.material);
      const orig = originals.get(o);
      o.material = kind === 'shaded' ? orig : Array.isArray(orig) ? orig.map((m) => viewMaterial(m, kind)) : viewMaterial(orig, kind);
    });
    q('[data-legend]').textContent = {
      shaded: 'Your materials under neutral light. Drag to orbit, scroll to zoom.',
      checker: 'Squares should be square and the same size everywhere. Stretched or tiny squares mean UV problems.',
      faces: 'Blue = outside faces. Red = you are seeing the inside of a face (flipped normal or a hole).',
      wire: 'Every line is an edge. Dense areas cost triangles: are they where the player looks?'
    }[kind];
  };
  const restoreMaterials = () => { if (view !== 'shaded') setView('shaded'); };
  el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  q('[data-human]').addEventListener('change', (e) => { human.visible = e.target.checked; });
  q('[data-grid]').addEventListener('change', (e) => { grid.visible = e.target.checked; });

  const frame = () => {
    refreshSkins(model);
    const box = new THREE.Box3().setFromObject(model, true);
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z, 0.5);
    const clampSpan = Math.min(span, 400);
    human.position.set(box.isEmpty() ? -1 : box.min.x - 0.5, 0.875, box.isEmpty() ? 0 : (box.min.z + box.max.z) / 2);
    buildGrid(Math.min(span, 60));
    const c = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
    controls.target.copy(c);
    camera.position.copy(c).add(new THREE.Vector3(1.2, 0.8, 1.6).multiplyScalar(Math.max(clampSpan, 2) * 1.1));
    camera.near = Math.max(0.005, clampSpan / 1000);
    camera.far = Math.max(100, span * 20);
    camera.updateProjectionMatrix();
    controls.update();
  };

  // --- render loop (only while visible on screen)
  let visible = true, raf = 0, last = performance.now(), disposed = false;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); });
  io.observe(canvas);
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  };
  const loop = () => {
    cancelAnimationFrame(raf);
    if (!visible || disposed || document.hidden || !el.isConnected) return;
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    mixer.update(Math.min(0.1, (now - last) / 1000));
    last = now;
    resize();
    controls.update();
    renderer.render(scene, camera);
  };
  document.addEventListener('visibilitychange', loop);

  // --- clips
  const renderClips = () => {
    const box = q('[data-clips]');
    box.hidden = !clips.length;
    box.innerHTML = clips.length ? `<span>Clips</span>${clips.map((c, i) => `<button data-clip="${i}">${esc(c.name || '(no name)')} <small>${fmt(c.duration, 1)} s</small></button>`).join('')}<button data-clip="-1">■ Stop</button>` : '';
    box.querySelectorAll('[data-clip]').forEach((b) => b.addEventListener('click', () => {
      mixer.stopAllAction();
      box.querySelectorAll('[data-clip]').forEach((x) => x.classList.toggle('is-on', x === b && b.dataset.clip !== '-1'));
      if (b.dataset.clip === '-1') { action = null; return; }
      action = mixer.clipAction(clips[+b.dataset.clip]);
      action.reset().play();
    }));
  };

  // Fixes edit rest poses, so stop playback and put every rig back in its bind pose first.
  const toRestPose = () => {
    mixer.stopAllAction();
    action = null;
    q('[data-clips]').querySelectorAll('.is-on').forEach((b) => b.classList.remove('is-on'));
    model.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.pose(); });
    model.updateMatrixWorld(true);
  };

  // --- analysis
  const stats = () => analyzeModel(THREE, model, clips, brief, mode, sourceFormat);
  const ctx = { THREE, model, clips, brief, mode, frame, restoreMaterials, originals };

  const renderAll = () => {
    const s = stats();
    const checks = buildChecks(s, ctx);
    q('[data-summary]').innerHTML = `
      <div><b>${fmt(s.tris, 0)}</b><span>triangles</span></div>
      <div><b>${s.box ? `${fmt(s.size.x)} × ${fmt(s.size.y)} × ${fmt(s.size.z)}` : '—'}</b><span>W × H × D (m, Y up)</span></div>
      <div><b>${s.meshes.length}</b><span>mesh${s.meshes.length === 1 ? '' : 'es'}</span></div>
      <div><b>${s.materials.size}</b><span>material${s.materials.size === 1 ? '' : 's'}</span></div>
      <div><b>${s.textures.size}</b><span>texture${s.textures.size === 1 ? '' : 's'}</span></div>
      <div><b>${s.bones.length}</b><span>bones</span></div>
      <div><b>${clips.length}</b><span>clip${clips.length === 1 ? '' : 's'}</span></div>
      <div><b>.${esc(sourceFormat)}</b><span>came in as</span></div>`;
    const counts = { pass: 0, warn: 0, fail: 0 };
    checks.forEach((c) => { if (counts[c.status] !== undefined) counts[c.status]++; });
    q('[data-score]').textContent = `${counts.pass} ✓ · ${counts.warn} to review · ${counts.fail} to fix`;
    const list = q('[data-checks]');
    list.innerHTML = checks.map((c, i) => `
      <li class="is-${c.status}">
        <span class="ab-icon" aria-hidden="true">${{ pass: '✓', warn: '!', fail: '✕', info: 'i' }[c.status]}</span>
        <div><b>${esc(c.title)}</b><p>${c.detail}</p>${c.fixes?.length ? `<div class="ab-fixes">${c.fixes.map((f, j) => `<button class="ab-btn small" data-fix="${i}:${j}">${esc(f.label)}</button>`).join('')}</div>` : ''}</div>
        <span class="visually-hidden">${{ pass: 'Passed', warn: 'Review', fail: 'Needs a fix', info: 'Info' }[c.status]}</span>
      </li>`).join('');
    list.querySelectorAll('[data-fix]').forEach((b) => b.addEventListener('click', () => {
      const [i, j] = b.dataset.fix.split(':').map(Number);
      const fix = checks[i].fixes[j];
      restoreMaterials();
      toRestPose();
      try {
        const msg = fix.run();
        say(msg || `Done: ${fix.label}.`, 'ok');
      } catch (err) { console.warn('[asset-bench] fix', err); say(`That fix didn't work on this file: ${err.message}`, 'bad'); }
      renderAll();
      frame();
    }));
    renderNames(s);
    state.lastChecks = checks;
    state.lastStats = s;
  };

  const renderNames = (s) => {
    const box = q('[data-names]');
    const rows = [
      ...s.meshes.map((m) => ({ obj: m, kind: m.isSkinnedMesh ? 'Skinned mesh' : 'Mesh' })),
      ...[...s.materials].map((m) => ({ obj: m, kind: 'Material' })),
      ...clips.map((c) => ({ obj: c, kind: 'Clip' }))
    ];
    box.innerHTML = `<p class="ab-note">Engines and teammates only see these names. Describe role and variation: <code>SM_Chair_Studio_A</code>, <code>M_Oak_Worn</code>, <code>Walk</code>.</p>
      <button class="ab-btn small" data-autoname>Auto-name with prefixes</button>
      <div class="ab-name-list">${rows.map((r, i) => `<label><span>${r.kind}</span><input data-name="${i}" value="${esc(r.obj.name)}" spellcheck="false"></label>`).join('')}</div>`;
    box.querySelectorAll('[data-name]').forEach((inp) => inp.addEventListener('change', () => {
      rows[+inp.dataset.name].obj.name = inp.value.trim().replace(/\s+/g, '_') || rows[+inp.dataset.name].obj.name;
      renderAll();
      renderClips();
    }));
    box.querySelector('[data-autoname]').addEventListener('click', () => {
      autoName(model, s, clips, pascal(q('[data-outname]').value));
      renderAll();
      renderClips();
      say('Renamed with SM_/SK_ for meshes and M_ for materials. Edit any name you want to change.', 'ok');
    });
  };

  // --- export
  const outName = () => pascal(q('[data-outname]').value) || fileBase;
  el.querySelectorAll('[data-export]').forEach((b) => b.addEventListener('click', async () => {
    restoreMaterials();
    const kind = b.dataset.export;
    const name = outName();
    // Exporters write each bone's current transform as its rest pose, so never export mid-clip.
    if (kind === 'glb' || kind === 'obj' || kind === 'stl') toRestPose();
    try {
      if (kind === 'glb') {
        const buf = await new T.GLTFExporter().parseAsync(model, { binary: true, animations: clips, onlyVisible: true });
        const blob = new Blob([buf], { type: 'model/gltf-binary' });
        download(blob, `${name}.glb`);
        shelf.put(`${name}.glb`, blob, 'model');
        say(`Saved ${name}.glb (${fmt(blob.size / 1024, 0)} KB). It's also on your shelf so the next lesson can open it.`, 'ok');
      } else if (kind === 'obj') {
        download(new Blob([new T.OBJExporter().parse(model)], { type: 'text/plain' }), `${name}.obj`);
        say(`Saved ${name}.obj. OBJ keeps shape and UVs only: no materials, rigs or animation.`, 'ok');
      } else if (kind === 'stl') {
        const copy = model.clone(true);
        const holder = new THREE.Group();
        holder.scale.setScalar(1000);
        holder.rotation.x = Math.PI / 2;
        holder.add(copy);
        holder.updateMatrixWorld(true);
        const data = new T.STLExporter().parse(holder, { binary: true });
        download(new Blob([data], { type: 'model/stl' }), `${name}.stl`);
        say(`Saved ${name}.stl in millimetres with Z up, ready for a slicer. Check wall thickness before printing.`, 'ok');
      } else if (kind === 'png') {
        resize();
        human.visible = false;
        grid.visible = false;
        renderer.render(scene, camera);
        canvas.toBlob((blob) => { download(blob, `${name}_snapshot.png`); human.visible = q('[data-human]').checked; grid.visible = q('[data-grid]').checked; }, 'image/png');
      } else if (kind === 'report') {
        download(new Blob([reportText(name, state.lastStats, state.lastChecks, brief, mode)], { type: 'text/plain' }), `${name}_bench_report.txt`);
      }
    } catch (err) { console.warn('[asset-bench] export', err); say(`Export failed: ${err.message}`, 'bad'); }
  }));

  const state = {};
  setView('shaded');
  renderClips();
  renderAll();
  frame();
  loop();
  const ro = new ResizeObserver(() => { resize(); });
  ro.observe(canvas);

  return {
    el,
    resume() { requestAnimationFrame(() => { resize(); frame(); loop(); }); },
    dispose() { disposed = true; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', loop); controls.dispose(); renderer.dispose(); }
  };
}

async function loadModelFiles(T, files, main) {
  const { THREE } = T;
  const urls = new Map();
  const made = [];
  for (const f of files) {
    const u = URL.createObjectURL(f);
    made.push(u);
    urls.set(f.name.toLowerCase(), u);
  }
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    if (/^(blob:|data:)/.test(url)) return url;
    const key = decodeURIComponent(url).split(/[\\/]/).pop().toLowerCase();
    return urls.get(key) || url;
  });
  const missing = [];
  manager.onError = (url) => missing.push(decodeURIComponent(url).split(/[\\/]/).pop());
  const kind = ext(main.name);
  const buffer = () => main.arrayBuffer();
  const text = () => main.text();
  let scene, animations = [];
  const neutral = () => new THREE.MeshStandardMaterial({ color: '#b9c4cc', roughness: 0.7 });
  try {
    if (kind === 'glb' || kind === 'gltf') {
      const loader = new T.GLTFLoader(manager);
      const draco = new T.DRACOLoader(manager);
      draco.setDecoderPath(DRACO_URL);
      draco.setDecoderConfig({ type: 'wasm' });
      loader.setDRACOLoader(draco);
      loader.setMeshoptDecoder(T.MeshoptDecoder);
      const gltf = await loader.loadAsync(urls.get(main.name.toLowerCase()));
      scene = gltf.scene; animations = gltf.animations;
    } else if (kind === 'fbx') {
      scene = new T.FBXLoader(manager).parse(await buffer(), '');
      animations = scene.animations || [];
    } else if (kind === 'obj') {
      const loader = new T.OBJLoader(manager);
      const mtlFile = files.find((f) => ext(f.name) === 'mtl');
      if (mtlFile) {
        const mats = new T.MTLLoader(manager).parse(await mtlFile.text(), '');
        mats.preload();
        loader.setMaterials(mats);
      }
      scene = loader.parse(await text());
    } else if (kind === 'stl') {
      const geo = new T.STLLoader().parse(await buffer());
      scene = new THREE.Group();
      scene.add(Object.assign(new THREE.Mesh(geo, geo.hasColors ? new THREE.MeshStandardMaterial({ vertexColors: true }) : neutral()), { name: baseName(main.name) }));
    } else if (kind === 'ply') {
      const geo = new T.PLYLoader().parse(await buffer());
      if (!geo.attributes.normal) geo.computeVertexNormals();
      scene = new THREE.Group();
      scene.add(Object.assign(new THREE.Mesh(geo, geo.attributes.color ? new THREE.MeshStandardMaterial({ vertexColors: true }) : neutral()), { name: baseName(main.name) }));
    } else if (kind === 'dae') {
      const dae = new T.ColladaLoader(manager).parse(await text(), '');
      scene = dae.scene; animations = dae.scene.animations || [];
    } else if (kind === '3mf') {
      scene = new T.ThreeMFLoader(manager).parse(await buffer());
    } else if (kind === 'usdz') {
      scene = new T.USDZLoader(manager).parse(await buffer());
    }
  } finally {
    setTimeout(() => made.forEach((u) => URL.revokeObjectURL(u)), 30000);
  }
  if (!scene) throw new Error(`.${kind} isn't supported yet`);
  // Lights and cameras from the source file would fight the Bench's own; keep them, but hidden.
  return { scene, animations, missing, name: baseName(main.name) };
}

/* ---------- analysis ---------- */

const DEFAULT_NAME = /^(cube|sphere|cylinder|plane|cone|torus|mesh|object|polysurface|pcube|pcylinder|psphere|pplane|box|group|null|untitled|new|default|body|solid|component|geometry|node|unnamed|shape|instance|material|lambert|blinn|phong|standardsurface|defaultmaterial|mat|bone|joint|armature|action|take|mixamo\.com|scene|layer|polygon|surface|part|line|nurbs|\d+)([ ._\-#]?\d*)*$/i;

function refreshSkins(model) {
  // Bone matrices are only filled in when a frame renders; measure after updating them.
  model.updateMatrixWorld(true);
  model.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.update(); });
}

function triCount(geo) {
  if (!geo?.attributes?.position) return 0;
  return Math.floor((geo.index ? geo.index.count : geo.attributes.position.count) / 3);
}

function analyzeModel(THREE, model, clips, brief, mode, sourceFormat) {
  refreshSkins(model);
  const s = { meshes: [], materials: new Set(), textures: new Map(), bones: [], cameras: [], lights: [], empties: 0, tris: 0, scaled: [], negative: [], noUV: [], noNormals: [], skinned: [], badWeights: 0, sourceFormat };
  model.traverse((o) => {
    if (o.isBone) s.bones.push(o);
    else if (o.isCamera) s.cameras.push(o);
    else if (o.isLight) s.lights.push(o);
    else if (o.isMesh || o.isPoints || o.isLine) {
      if (!o.isMesh) return;
      s.meshes.push(o);
      s.tris += triCount(o.geometry) * (o.isInstancedMesh ? o.count : 1);
      if (!o.geometry.attributes.uv) s.noUV.push(o);
      if (!o.geometry.attributes.normal) s.noNormals.push(o);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (!m) return;
        s.materials.add(m);
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'bumpMap', 'specularMap', 'alphaMap']) {
          const t = m[key];
          if (t?.image) s.textures.set(t, key);
        }
      });
      if (o.isSkinnedMesh) {
        s.skinned.push(o);
        const w = o.geometry.attributes.skinWeight;
        if (w) for (let i = 0; i < w.count; i++) { const sum = w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i); if (Math.abs(sum - 1) > 0.01) s.badWeights++; }
      }
    } else if (o !== model && !o.children.length) s.empties++;
    if (o !== model && (o.isMesh || o.isGroup || o.type === 'Object3D') && !o.isBone) {
      const sc = o.scale;
      if (sc.x < 0 || sc.y < 0 || sc.z < 0) s.negative.push(o);
      else if (Math.abs(sc.x - 1) > 1e-3 || Math.abs(sc.y - 1) > 1e-3 || Math.abs(sc.z - 1) > 1e-3) s.scaled.push(o);
    }
  });
  if (Math.abs(model.scale.x - 1) > 1e-3 || Math.abs(model.scale.y - 1) > 1e-3 || Math.abs(model.scale.z - 1) > 1e-3) s.scaled.unshift(model);
  const box = new THREE.Box3().setFromObject(model, true);
  s.box = box.isEmpty() ? null : box;
  s.size = s.box ? box.getSize(new THREE.Vector3()) : new THREE.Vector3();
  s.center = s.box ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3();
  s.defaultNames = [
    ...s.meshes.filter((m) => DEFAULT_NAME.test(m.name || '')).map((m) => m.name || '(no name)'),
    ...[...s.materials].filter((m) => DEFAULT_NAME.test(m.name || '')).map((m) => m.name || '(no name)')
  ];
  s.defaultClips = clips.filter((c) => !c.name || DEFAULT_NAME.test(c.name) || /\|/.test(c.name));
  s.legacyMats = [...s.materials].filter((m) => !(m.isMeshStandardMaterial || m.isMeshBasicMaterial));
  s.texel = texelDensity(THREE, s.meshes, brief);
  s.clipInfo = clips.map((c) => clipLoopInfo(THREE, model, c, s.size.y || 1));
  return s;
}

function texelDensity(THREE, meshes, brief) {
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const per = [];
  let worldTotal = 0, uvTotal = 0;
  for (const mesh of meshes) {
    const g = mesh.geometry, pos = g.attributes.position, uv = g.attributes.uv;
    if (!pos || !uv) continue;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const texSize = mat?.map?.image?.width || brief.texture;
    const idx = g.index;
    const tris = idx ? idx.count / 3 : pos.count / 3;
    const step = Math.max(1, Math.floor(tris / 20000));
    let wA = 0, uA = 0;
    for (let t = 0; t < tris; t += step) {
      const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(pos, i1).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(pos, i2).applyMatrix4(mesh.matrixWorld);
      wA += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
      const ux = uv.getX(i1) - uv.getX(i0), uy = uv.getY(i1) - uv.getY(i0), vx = uv.getX(i2) - uv.getX(i0), vy = uv.getY(i2) - uv.getY(i0);
      uA += Math.abs(ux * vy - uy * vx) / 2;
    }
    if (wA > 1e-9 && uA > 1e-12) {
      const d = Math.sqrt(uA * texSize * texSize / wA);
      per.push({ mesh, density: d, area: wA });
      worldTotal += wA;
      uvTotal += uA * texSize * texSize;
    }
  }
  if (!per.length) return null;
  const avg = Math.sqrt(uvTotal / worldTotal);
  const big = per.filter((p) => p.area > worldTotal * 0.03);
  const ds = (big.length ? big : per).map((p) => p.density);
  return { avg, min: Math.min(...ds), max: Math.max(...ds), per };
}

function clipLoopInfo(THREE, model, clip, height) {
  let worst = 0, worstTrack = '', drift = 0;
  for (const tr of clip.tracks) {
    const n = tr.getValueSize(), v = tr.values, k = tr.times.length;
    if (k < 2) continue;
    const first = v.slice(0, n), lastV = v.slice((k - 1) * n, k * n);
    let d;
    if (/\.quaternion$/.test(tr.name)) {
      const q1 = new THREE.Quaternion().fromArray(first), q2 = new THREE.Quaternion().fromArray(lastV);
      d = q1.angleTo(q2) * 180 / Math.PI / 10; // 10° ≈ 1 unit of "pop"
    } else if (/\.position$/.test(tr.name)) {
      const horiz = Math.hypot(lastV[0] - first[0], lastV[2] - first[2]);
      if (horiz > height * 0.25) { drift = Math.max(drift, horiz); continue; }
      d = Math.hypot(lastV[0] - first[0], lastV[1] - first[1], lastV[2] - first[2]) / (height * 0.02);
    } else continue;
    if (d > worst) { worst = d; worstTrack = tr.name.split('.')[0]; }
  }
  return { clip, pop: worst, worstTrack, drift };
}

/* ---------- checks ---------- */

function buildChecks(s, ctx) {
  const { THREE, model, clips, brief, mode } = ctx;
  const checks = [];
  const add = (c) => checks.push(c);
  const charLike = mode === 'rig' || mode === 'anim' || s.skinned.length > 0;
  const budget = charLike ? brief.charTris : mode === 'kit' ? brief.propTris * 2 : brief.propTris;
  const budgetName = charLike ? 'character budget' : mode === 'kit' ? 'kit-piece budget (2× prop budget)' : 'prop budget';

  if (!s.meshes.length) {
    add({ status: 'fail', title: 'No meshes found', detail: 'The file opened but contains no polygon meshes. Export the object itself (not just a camera, curve or empty), and convert NURBS or curves to a mesh first.' });
    return checks;
  }

  // 1. Units / real-world size
  const h = s.size.y, longest = Math.max(s.size.x, s.size.y, s.size.z);
  const expect = charLike ? [0.3, 4] : mode === 'kit' ? [0.1, 12] : [0.05, 6];
  const UNITS = [
    { f: 0.01, label: 'cm → m (×0.01)', why: 'centimetres (Maya, 3ds Max, Mixamo, Unreal, many FBX files)' },
    { f: 0.001, label: 'mm → m (×0.001)', why: 'millimetres (Fusion, Onshape, Tinkercad, most CAD and 3D-print files)' },
    { f: 0.0254, label: 'inches → m (×0.0254)', why: 'inches (SketchUp and some US CAD)' },
    { f: 100, label: '×100 (it came out tiny)', why: 'metres while you modelled in centimetres' }
  ];
  const plausible = (v) => v >= expect[0] && v <= expect[1];
  const target = Math.sqrt(expect[0] * expect[1]) * (charLike ? 1.4 : 1);
  const unitFixes = (list) => list.map((u) => ({ label: `Convert ${u.label}`, run: () => { bakeUniformScale(THREE, model, clips, u.f); return `Scaled everything by ${u.f}, including bones and animation, and applied it.`; } }));
  if (!plausible(longest) && (longest > expect[1] * 4 || longest < expect[0] / 4)) {
    const ranked = UNITS.filter((u) => plausible(longest * u.f)).sort((a, b) => Math.abs(Math.log(longest * a.f / target)) - Math.abs(Math.log(longest * b.f / target)));
    const best = ranked[0];
    add({ status: 'fail', title: 'Size: probably the wrong units', detail: `It is ${longest >= 1 ? fmt(longest, 1) + ' m' : fmt(longest * 100, 1) + ' cm'} long, which can't be right next to a 1.75 m person.${best ? ` Most likely your app exported in ${best.why} and the engine reads them as metres.` : ' Check the export scale setting in your app.'}`, fixes: unitFixes(ranked.slice(0, 3)) });
  } else {
    const ranked = UNITS.filter((u) => plausible(longest * u.f));
    add({ status: plausible(longest) ? 'pass' : 'warn', title: 'Size in metres', detail: `${fmt(s.size.x)} m wide × ${fmt(h)} m tall × ${fmt(s.size.z)} m deep. Compare it with the 1.75 m person beside it. ${charLike ? 'A human character is usually 1.5–2 m.' : mode === 'kit' ? `Kit pieces should match your ${brief.module} m grid.` : 'A chair seat is about 0.45 m high; a door is about 2 m.'}`, fixes: plausible(longest) ? [] : unitFixes(ranked.slice(0, 2)) });
  }

  // 2. Up axis
  if (['stl', '3mf', 'ply'].includes(s.sourceFormat) || (s.size.z > s.size.y * 2.5 && s.size.y < s.size.x && !charLike && mode !== 'kit')) {
    add({ status: 'warn', title: 'Up axis', detail: `Game engines use Y as up. CAD apps and ${s.sourceFormat === 'sample' ? 'some exports' : '.' + s.sourceFormat + ' files'} often use Z as up, so the model can arrive lying on its back.`, fixes: [
      { label: 'Stand it up (Z-up → Y-up)', run: () => { model.rotateX(-Math.PI / 2); model.updateMatrixWorld(true); return 'Rotated −90° around X.'; } },
      { label: 'Undo that (Y-up → Z-up)', run: () => { model.rotateX(Math.PI / 2); model.updateMatrixWorld(true); return 'Rotated +90° around X.'; } }
    ] });
  }

  // 3. Triangle budget
  add({ status: s.tris <= budget ? 'pass' : s.tris <= budget * 1.5 ? 'warn' : 'fail', title: 'Triangle budget', detail: `${fmt(s.tris, 0)} triangles against your ${budgetName} of ${fmt(budget, 0)}.${s.tris > budget ? ' Remove hidden faces, lower segment counts on cylinders and bevels, or decimate in your app. Spend triangles on the silhouette.' : ''} <a href="game-asset-studio-pathway.html#studio-brief">Budgets come from your brief.</a>` });

  // 4. Origin / pivot
  if (s.box) {
    const tol = Math.max(0.02, longest * 0.02);
    const pos = new THREE.Vector3();
    model.getWorldPosition(pos);
    if (mode === 'kit') {
      const onCorner = Math.abs(s.box.min.x) < tol && Math.abs(s.box.min.y) < tol && Math.abs(s.box.min.z) < tol;
      const onFloorCenter = Math.abs(s.box.min.y) < tol && Math.abs(s.center.x) < tol && Math.abs(s.center.z) < tol;
      add({ status: onCorner || onFloorCenter ? 'pass' : 'fail', title: 'Origin on a snap point', detail: onCorner ? 'Origin is on the bottom corner: grid snapping will line pieces up.' : onFloorCenter ? 'Origin is centred on the floor footprint. That works if every piece in the kit uses the same rule.' : `The origin is ${fmt(s.box.min.y)} m from the bottom and off the corner, so pieces won't snap edge to edge on a ${brief.module} m grid.`, fixes: onCorner ? [] : [
        { label: 'Origin → bottom corner', run: () => { shiftModel(THREE, model, (b) => new THREE.Vector3(b.min.x, b.min.y, b.min.z)); return 'Moved so the origin is at the bottom-left-back corner.'; } },
        { label: 'Origin → floor centre', run: () => { shiftModel(THREE, model, (b) => new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2)); return 'Centred on the floor.'; } }
      ] });
    } else {
      const floor = Math.abs(s.box.min.y) < tol, centred = Math.abs(s.center.x) < tol * 2 && Math.abs(s.center.z) < tol * 2;
      add({ status: floor && centred ? 'pass' : 'warn', title: 'Origin (pivot)', detail: floor && centred ? 'The origin sits on the floor under the middle: the asset drops onto the ground where you place it.' : `${floor ? '' : `The bottom is ${fmt(s.box.min.y)} m ${s.box.min.y > 0 ? 'above' : 'below'} the origin, so it will float or sink. `}${centred ? '' : `It sits ${fmt(Math.hypot(s.center.x, s.center.z))} m off-centre, so it lands away from where you click. `}Doors and lids are the exception: their origin belongs on the hinge.`, fixes: floor && centred ? [] : [
        { label: 'Origin → floor, centred', run: () => { shiftModel(THREE, model, (b) => new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2)); return 'The origin is now on the floor under the centre.'; } }
      ] });
    }
  }

  // 5. Kit grid fit
  if (mode === 'kit' && s.box) {
    const m = brief.module, half = m / 2;
    const fits = (v) => v < 0.05 || Math.abs(v / half - Math.round(v / half)) * half < 0.03;
    const bad = ['x', 'z'].filter((k) => s.size[k] > 0.35 && !fits(s.size[k]));
    add({ status: bad.length ? 'warn' : 'pass', title: `Fits the ${m} m grid`, detail: bad.length ? `${bad.map((k) => `${k === 'x' ? 'Width' : 'Depth'} ${fmt(s.size[k], 3)} m`).join(', ')} isn't a multiple of ${half} m, so a gap or overlap will show when pieces repeat. Thin sides (wall thickness) are fine.` : `Footprint ${fmt(s.size.x, 3)} × ${fmt(s.size.z, 3)} m lines up with ${half} m steps.` });
  }

  // 6. Transforms
  if (s.scaled.length || s.negative.length) {
    const names = [...s.negative, ...s.scaled].slice(0, 4).map((o) => `<code>${esc(o.name || o.type)}</code>`).join(', ');
    add({ status: s.negative.length ? 'fail' : 'warn', title: 'Unapplied scale', detail: `${names}${s.scaled.length + s.negative.length > 4 ? '…' : ''} still carry a scale${s.negative.length ? ', some of it negative (mirrored), which flips faces inside out in engines' : ''}. Bevels, physics and collisions read the unscaled shape.`, fixes: [{ label: 'Apply scale', run: () => { const r = applyScales(THREE, model, clips); return r; } }] });
  } else add({ status: 'pass', title: 'Scale applied', detail: 'Every part has a scale of 1. What you see is the real size of the mesh data.' });

  // 7. UVs
  if (s.noUV.length) add({ status: 'fail', title: 'UV map', detail: `${s.noUV.length} of ${s.meshes.length} meshes have no UVs (${s.noUV.slice(0, 3).map((m) => `<code>${esc(m.name || 'mesh')}</code>`).join(', ')}). Textures can't be placed on them. CAD exports (.stl, Fusion, Onshape) never include UVs: unwrap in a mesh app.`, fixes: [{ label: 'Quick box-project UVs', run: () => { s.noUV.forEach((m) => boxProjectUV(THREE, m, brief)); return 'Added box-projected UVs sized to your texel density. Good for tiling materials; hand-unwrap hero assets.'; } }] });
  else add({ status: 'pass', title: 'UV map', detail: 'Every mesh has UVs. Switch to the UV checker view to look for stretching.' });

  // 8. Texel density
  if (s.texel) {
    const ratio = s.texel.avg / brief.texel;
    const spread = s.texel.max / Math.max(1e-6, s.texel.min);
    const ok = ratio > 0.7 && ratio < 1.4;
    add({ status: ok && spread < 2.2 ? 'pass' : 'warn', title: 'Texel density', detail: `About ${fmt(s.texel.avg, 0)} px per metre (brief: ${brief.texel}).${spread >= 2.2 ? ` Parts differ by ${fmt(spread, 1)}× (${fmt(s.texel.min, 0)}–${fmt(s.texel.max, 0)} px/m): some will look blurrier than their neighbours.` : ''}${!ok ? (ratio < 1 ? ' Lower than the brief: textures will look soft up close.' : ' Higher than the brief: memory is being spent on detail players won\'t see.') : ''}`, fixes: ok ? [] : [{ label: `Scale UVs ×${fmt(brief.texel / s.texel.avg)} (tiling materials only)`, run: () => { scaleUVs(s.meshes, brief.texel / s.texel.avg); return 'Scaled UVs. Only correct for tiling materials; for a unique texture atlas, re-pack UVs in your app.'; } }] });
  }

  // 9. Normals
  if (s.noNormals.length) add({ status: 'fail', title: 'Normals', detail: `${s.noNormals.length} mesh(es) have no normals, so lighting can't shade them.`, fixes: [{ label: 'Calculate normals', run: () => { s.noNormals.forEach((m) => m.geometry.computeVertexNormals()); return 'Calculated smooth normals.'; } }] });
  else add({ status: 'info', title: 'Face direction', detail: 'Switch to <b>Face direction</b> view. Any red you can see from outside is a flipped face: recalculate normals outside in your app.' });

  // 10. Materials & textures
  if (s.legacyMats.length) add({ status: 'warn', title: 'Materials aren\'t PBR', detail: `${s.legacyMats.length} material(s) use an older shading model (${[...new Set(s.legacyMats.map((m) => m.type.replace('Mesh', '').replace('Material', '')))].join(', ')}). glTF and modern engines use metallic/roughness PBR.`, fixes: [{ label: 'Convert to PBR', run: () => { convertToPBR(THREE, model, ctx.originals); return 'Converted to standard PBR materials, keeping colour, texture and normal maps.'; } }] });
  const mats = s.materials.size;
  if (mats > 3 && !charLike) add({ status: 'warn', title: 'Material count', detail: `${mats} materials means about ${mats} draw calls for this one asset. Props usually need 1–2: combine parts onto one material and texture.` });
  const texIssues = [...s.textures.keys()].filter((t) => { const w = t.image.width, hh = t.image.height; return !isPOT(w) || !isPOT(hh) || Math.max(w, hh) > brief.texture; });
  if (s.textures.size) add({ status: texIssues.length ? 'warn' : 'pass', title: 'Texture sizes', detail: texIssues.length ? `${texIssues.length} texture(s) are larger than your ${brief.texture} px brief or not a power of two (${texIssues.slice(0, 3).map((t) => `${t.image.width}×${t.image.height}`).join(', ')}).` : `All ${s.textures.size} textures are powers of two within ${brief.texture} px.`, fixes: texIssues.length ? [{ label: `Resize to ≤ ${brief.texture} px, power of two`, run: () => { texIssues.forEach((t) => resizeTexture(t, brief.texture)); return 'Resized. The exported .glb will carry the smaller textures.'; } }] : [] });
  else if (!s.noUV.length) add({ status: 'info', title: 'No textures in the file', detail: 'Colours only. To bring Lesson 1\'s material, drop the model together with its texture files, or assign it in your engine.' });

  // 11. Names
  add({ status: s.defaultNames.length ? 'warn' : 'pass', title: 'Names', detail: s.defaultNames.length ? `${s.defaultNames.length} default name(s): ${s.defaultNames.slice(0, 4).map((n) => `<code>${esc(n)}</code>`).join(', ')}${s.defaultNames.length > 4 ? '…' : ''}. In an engine these are all you see.` : 'Meshes and materials have descriptive names.', fixes: s.defaultNames.length ? [{ label: 'Auto-name with prefixes', run: () => { autoName(model, s, clips, pascal(model.name)); return 'Renamed. Open "Rename parts" to adjust.'; } }] : [] });

  // 12. Extras
  if (s.cameras.length || s.lights.length) add({ status: 'warn', title: 'Cameras and lights in the file', detail: `${s.cameras.length} camera(s) and ${s.lights.length} light(s) were exported with the asset. Your level supplies its own; these will double the lighting.`, fixes: [{ label: 'Remove cameras & lights', run: () => { [...s.cameras, ...s.lights].forEach((o) => o.removeFromParent()); return 'Removed.'; } }] });

  // 13. Rig
  if (charLike || s.bones.length) {
    if (!s.skinned.length) add({ status: mode === 'rig' || mode === 'anim' ? 'fail' : 'info', title: 'Rig', detail: 'No skinned mesh. Bind the mesh to the skeleton (automatic weights) and export the armature with it.' });
    else {
      const defaultBones = s.bones.filter((b) => DEFAULT_NAME.test(b.name));
      add({ status: s.bones.length > 100 ? 'warn' : 'pass', title: 'Skeleton', detail: `${s.bones.length} bones driving ${s.skinned.length} mesh(es).${s.bones.length > 100 ? ' More than 100 bones is heavy for a game character; drop finger or face bones you don\'t animate.' : ''}${defaultBones.length ? ` ${defaultBones.length} bone(s) still have default names like <code>${esc(defaultBones[0].name)}</code>; use left/right names (<code>upper_arm.L</code>) so mirroring and retargeting work.` : ''}` });
      add({ status: s.badWeights ? 'fail' : 'pass', title: 'Skin weights', detail: s.badWeights ? `${fmt(s.badWeights, 0)} vertices have weights that don't add up to 1, so they stretch or lag when bones move.` : 'Every vertex\'s weights add up to 1.', fixes: s.badWeights ? [{ label: 'Normalize weights', run: () => { s.skinned.forEach((m) => m.normalizeSkinWeights()); return 'Normalized. Bend joints to check the shape.'; } }] : [] });
    }
  }

  // 14. Animation
  if (mode === 'anim' || clips.length) {
    if (!clips.length) add({ status: mode === 'anim' ? 'fail' : 'info', title: 'Animation clips', detail: 'No clips found. Export with animation enabled; in many apps each action or take must be pushed to the timeline (NLA, Trax, Time Editor) to be included.' });
    else {
      add({ status: s.defaultClips.length ? 'warn' : 'pass', title: 'Clip names', detail: s.defaultClips.length ? `${s.defaultClips.map((c) => `<code>${esc(c.name || '(none)')}</code>`).join(', ')}: engines and code call clips by name. Use <code>Idle</code>, <code>Walk</code>, <code>Run</code>. Rename them under "Rename parts".` : `Clips: ${clips.map((c) => `<code>${esc(c.name)}</code>`).join(', ')}.` });
      for (const info of s.clipInfo) {
        const loopy = /idle|walk|run|loop|cycle|breath|hover|swim|fly/i.test(info.clip.name) || mode === 'anim';
        if (!loopy) continue;
        const pops = info.pop > 1.5;
        add({ status: pops ? 'warn' : 'pass', title: `Loop: ${info.clip.name}`, detail: `${pops ? `The first and last poses differ (most on <code>${esc(info.worstTrack)}</code>), so the loop will pop when it repeats.` : 'First and last poses match, so it loops smoothly.'}${info.drift ? ` The root travels ${fmt(info.drift)} m: this is root motion. Most engines want walk cycles in place unless your controller uses root motion.` : ''}`, fixes: pops ? [{ label: 'Match last pose to first', run: () => { matchLoop(info.clip); return `Copied the first pose onto the last frame of ${info.clip.name}. Play it to check the hitch is gone.`; } }] : [] });
      }
    }
  }
  return checks;
}

/* ---------- fixes ---------- */

function bakeUniformScale(THREE, model, clips, f) {
  // Scale geometry, node positions, bone rest poses and position animation together,
  // so nothing is left carrying a scale and rigs keep working.
  const seen = new Set();
  model.traverse((o) => {
    if (o !== model) o.position.multiplyScalar(f);
    if (o.isMesh && o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.scale(f, f, f); }
  });
  model.position.multiplyScalar(f);
  for (const c of clips) for (const tr of c.tracks) if (/\.position$/.test(tr.name)) for (let i = 0; i < tr.values.length; i++) tr.values[i] *= f;
  rebind(model);
}

function rebind(model) {
  model.updateMatrixWorld(true);
  model.traverse((o) => { if (o.isSkinnedMesh) { o.skeleton.calculateInverses(); o.bind(o.skeleton, o.matrixWorld); } });
  refreshSkins(model);
}

function applyScales(THREE, model, clips) {
  let pushed = 0, baked = 0, left = 0;
  const animatedScale = new Set();
  for (const c of clips) for (const tr of c.tracks) if (/\.scale$/.test(tr.name)) animatedScale.add(tr.name.split('.')[0]);
  const visit = (o) => {
    const sc = o.scale;
    const uniform = Math.abs(sc.x - sc.y) < 1e-4 && Math.abs(sc.y - sc.z) < 1e-4 && sc.x > 0;
    const isOne = Math.abs(sc.x - 1) < 1e-4 && Math.abs(sc.y - 1) < 1e-4 && Math.abs(sc.z - 1) < 1e-4;
    if (!isOne && !animatedScale.has(o.name) && !animatedScale.has(o.uuid)) {
      if (uniform) {
        // Push a uniform scale down into this node's mesh data and its children's offsets.
        const k = sc.x;
        if (o.isMesh) { o.geometry = o.geometry.clone(); o.geometry.scale(k, k, k); }
        o.children.forEach((ch) => { ch.position.multiplyScalar(k); ch.scale.multiplyScalar(k); });
        for (const c of clips) for (const tr of c.tracks) {
          const target = tr.name.split('.')[0];
          if (/\.position$/.test(tr.name) && o.children.some((ch) => ch.name === target || ch.uuid === target)) for (let i = 0; i < tr.values.length; i++) tr.values[i] *= k;
        }
        o.scale.set(1, 1, 1);
        pushed++;
      } else if (o.isMesh && !o.isSkinnedMesh && !o.children.length) {
        // Non-uniform or mirrored leaf mesh: bake into geometry, fix winding if mirrored.
        const m = new THREE.Matrix4().makeScale(sc.x, sc.y, sc.z);
        o.geometry = o.geometry.clone();
        o.geometry.applyMatrix4(m);
        if (sc.x * sc.y * sc.z < 0) flipWinding(o.geometry);
        o.scale.set(1, 1, 1);
        baked++;
      } else left++;
    }
    o.children.forEach(visit);
  };
  visit(model);
  rebind(model);
  return `Applied scale on ${pushed + baked} part(s)${left ? `; ${left} part(s) with uneven scale and children must be fixed in your app (apply scale there)` : ''}.`;
}

function flipWinding(geo) {
  if (geo.index) {
    const a = geo.index.array;
    for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
    geo.index.needsUpdate = true;
  } else {
    for (const key of Object.keys(geo.attributes)) {
      const at = geo.attributes[key], n = at.itemSize, arr = at.array;
      for (let i = 0; i < at.count; i += 3) for (let j = 0; j < n; j++) { const t = arr[(i + 1) * n + j]; arr[(i + 1) * n + j] = arr[(i + 2) * n + j]; arr[(i + 2) * n + j] = t; }
      at.needsUpdate = true;
    }
  }
  geo.computeVertexNormals();
}

function shiftModel(THREE, model, pick) {
  // Move the asset so the picked point sits on the world origin. The offset lives on the
  // exported root node, which every engine treats as the asset's origin.
  refreshSkins(model);
  const p = pick(new THREE.Box3().setFromObject(model, true));
  model.position.sub(p);
  model.updateMatrixWorld(true);
}

function boxProjectUV(THREE, mesh, brief) {
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const pos = g.attributes.position;
  if (!g.attributes.normal) g.computeVertexNormals();
  const nrm = g.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  mesh.updateMatrixWorld(true);
  const scale = new THREE.Vector3();
  mesh.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
  const metresPerTile = brief.texture / brief.texel;
  for (let i = 0; i < pos.count; i += 3) {
    const n = new THREE.Vector3();
    for (let k = 0; k < 3; k++) n.add(new THREE.Vector3().fromBufferAttribute(nrm, i + k));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(i + k) * scale.x, y = pos.getY(i + k) * scale.y, z = pos.getZ(i + k) * scale.z;
      const [u, v] = ax >= ay && ax >= az ? [z, y] : ay >= az ? [x, z] : [x, y];
      uv[(i + k) * 2] = u / metresPerTile;
      uv[(i + k) * 2 + 1] = v / metresPerTile;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  mesh.geometry = g;
}

function scaleUVs(meshes, f) {
  const seen = new Set();
  for (const m of meshes) {
    const uv = m.geometry.attributes.uv;
    if (!uv || seen.has(uv)) continue;
    seen.add(uv);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * f, uv.getY(i) * f);
    uv.needsUpdate = true;
    for (const mat of [m.material].flat()) for (const key of ['map', 'normalMap', 'roughnessMap']) if (mat?.[key]) { mat[key].wrapS = mat[key].wrapT = 1000; mat[key].needsUpdate = true; }
  }
}

function convertToPBR(THREE, model, originals) {
  const map = new Map();
  const conv = (m) => {
    if (!m || m.isMeshStandardMaterial || m.isMeshBasicMaterial) return m;
    if (map.has(m)) return map.get(m);
    const n = new THREE.MeshStandardMaterial({
      name: m.name, color: m.color?.clone() ?? new THREE.Color('#ccc'), map: m.map || null, normalMap: m.normalMap || null,
      emissive: m.emissive?.clone() ?? new THREE.Color(0), emissiveMap: m.emissiveMap || null, alphaMap: m.alphaMap || null,
      transparent: m.transparent, opacity: m.opacity, side: m.side, vertexColors: m.vertexColors,
      roughness: m.shininess !== undefined ? Math.max(0.15, Math.min(1, 1 - Math.sqrt(m.shininess / 100))) : 0.8, metalness: 0
    });
    map.set(m, n);
    return n;
  };
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
    originals.set(o, o.material);
  });
}

function resizeTexture(tex, max) {
  const img = tex.image;
  const w = Math.min(max, nearestPOT(img.width)), h = Math.min(max, nearestPOT(img.height));
  tex.image = resampleCanvas(img, w, h);
  tex.needsUpdate = true;
}

function autoName(model, s, clips, base) {
  const meshes = s.meshes;
  const letters = (i) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');
  meshes.forEach((m, i) => {
    const keep = m.name && !DEFAULT_NAME.test(m.name) ? pascal(m.name.replace(/^(SM|SK)_/, '')) : '';
    const pre = m.isSkinnedMesh ? 'SK_' : 'SM_';
    m.name = meshes.length === 1 ? `${pre}${base}` : `${pre}${base}_${keep || letters(i)}`;
  });
  [...s.materials].forEach((m, i) => {
    if (m.name && !DEFAULT_NAME.test(m.name) && /^M_/.test(m.name)) return;
    const keep = m.name && !DEFAULT_NAME.test(m.name) ? pascal(m.name) : '';
    m.name = `M_${base}${keep ? '_' + keep : s.materials.size > 1 ? '_' + letters(i) : ''}`;
  });
  clips.forEach((c) => { if (c.name.includes('|')) c.name = c.name.split('|').pop(); });
  if (model.name && DEFAULT_NAME.test(model.name)) model.name = base;
}

function matchLoop(clip) {
  for (const tr of clip.tracks) {
    const n = tr.getValueSize(), k = tr.times.length;
    if (k < 2) continue;
    if (/\.position$/.test(tr.name)) {
      const v = tr.values;
      const horiz = Math.hypot(v[(k - 1) * n] - v[0], v[(k - 1) * n + 2] - v[2]);
      if (horiz > 0.05) { v[(k - 1) * n + 1] = v[1]; continue; } // root motion: only match height
    }
    for (let j = 0; j < n; j++) tr.values[(k - 1) * n + j] = tr.values[j];
  }
}

function reportText(name, s, checks, brief, mode) {
  const line = '-'.repeat(54);
  const icon = { pass: '[OK]  ', warn: '[LOOK]', fail: '[FIX] ', info: '[i]   ' };
  const strip = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return [`ASSET BENCH REPORT · ${name}`, `${new Date().toLocaleString()} · mode: ${mode}`, line,
    `Brief: ${brief.project || '(no project name)'} · grid ${brief.module} m · ${brief.texel} px/m · textures ${brief.texture} px · prop ${brief.propTris} tris · character ${brief.charTris} tris`,
    s ? `Asset: ${s.tris} tris · ${s.meshes.length} meshes · ${s.materials.size} materials · ${s.textures.size} textures · ${s.bones.length} bones · size ${fmt(s.size.x)} x ${fmt(s.size.y)} x ${fmt(s.size.z)} m` : '', line,
    ...(checks || []).map((c) => `${icon[c.status]} ${c.title}\n        ${strip(c.detail)}`), line,
    'Checked in the browser with the ClassroomOS Asset Bench. The file was not uploaded.'].join('\n');
}

/* ---------- sample "messy exports" so a class can practise without their own file ---------- */

function buildSample(THREE, mode) {
  const scene = new THREE.Group();
  scene.name = 'Scene';
  const phong = (c, name) => Object.assign(new THREE.MeshPhongMaterial({ color: c, shininess: 30 }), { name });
  if (mode === 'rig' || mode === 'anim') {
    // A cm-scale "arm" exported from a rigging app: default names, uneven weights, a clip that doesn't loop.
    const geo = new THREE.CylinderGeometry(6, 6, 120, 12, 24, false);
    geo.translate(0, 60, 0);
    const pos = geo.attributes.position, idx = [], wts = [];
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), t = y / 40, b = Math.min(2, Math.floor(t)), f = t - b;
      const blend = b < 2 && f > 0.7 ? (f - 0.7) / 0.3 : 0;
      idx.push(b, Math.min(2, b + 1), 0, 0);
      wts.push(1 - blend * 0.5, blend * 0.5 + (i % 7 === 0 ? 0.3 : 0), 0, 0);
    }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wts, 4));
    const bones = [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()];
    bones[0].name = 'Bone'; bones[1].name = 'Bone.001'; bones[2].name = 'Bone.002';
    bones[1].position.y = 40; bones[2].position.y = 40;
    bones[0].add(bones[1]); bones[1].add(bones[2]);
    const mesh = new THREE.SkinnedMesh(geo, phong('#d08a5a', 'Material.001'));
    mesh.name = 'Cylinder';
    const armature = new THREE.Group();
    armature.name = 'Armature';
    armature.add(bones[0], mesh);
    mesh.bind(new THREE.Skeleton(bones));
    scene.add(armature);
    const q = (deg) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), deg * Math.PI / 180).toArray();
    const clip = new THREE.AnimationClip('Armature|Action', 2, [
      new THREE.QuaternionKeyframeTrack('Bone.001.quaternion', [0, 1, 2], [...q(0), ...q(45), ...q(25)]),
      new THREE.QuaternionKeyframeTrack('Bone.002.quaternion', [0, 1, 2], [...q(0), ...q(35), ...q(10)])
    ]);
    const cam = new THREE.PerspectiveCamera(); cam.name = 'Camera'; scene.add(cam);
    return { scene, animations: [clip], name: 'MessyArmRig' };
  }
  if (mode === 'kit') {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(4.1, 3, 0.2), phong('#8b9aa6', 'Material'));
    wall.name = 'Cube.004';
    wall.position.set(2.3, 1.2, -0.6);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.15, 0.26), phong('#5a4636', 'Material.002'));
    trim.name = 'Cube.005';
    trim.position.set(2.3, -0.22, -0.6);
    trim.geometry.deleteAttribute('uv');
    scene.add(wall, trim);
    return { scene, animations: [], name: 'MessyWallPiece' };
  }
  // Default: a chair exported in centimetres from an app that doesn't apply transforms.
  const wood = phong('#a8743f', 'Material.001'), fabric = phong('#3b5b6e', 'lambert1');
  const part = (w, h, d, x, y, z, mat, name, sc) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.name = name;
    if (sc) m.scale.set(...sc);
    return m;
  };
  const chair = new THREE.Group();
  chair.name = 'Group';
  chair.add(
    part(45, 50, 45, 0, 45, 0, fabric, 'Cube', [1, 0.1, 1]),
    part(4, 45, 4, -19, 22.5, -19, wood, 'Cube.001'),
    part(4, 45, 4, 19, 22.5, -19, wood, 'Cube.002', [-1, 1, 1]),
    part(4, 45, 4, -19, 22.5, 19, wood, 'Cube.003'),
    part(4, 45, 4, 19, 22.5, 19, wood, 'Cube.004'),
    part(45, 40, 4, 0, 70, -20.5, fabric, 'Cube.005')
  );
  chair.children[5].geometry.deleteAttribute('uv');
  chair.position.set(300, 0, -120);
  const light = new THREE.PointLight('#fff', 1); light.name = 'Light';
  const cam = new THREE.PerspectiveCamera(); cam.name = 'Camera';
  scene.add(chair, light, cam);
  return { scene, animations: [], name: 'MessyChair' };
}

function makeCheckerTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d', RF);
  const n = 8, s = 512 / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    g.fillStyle = (x + y) % 2 ? '#e9eef2' : `hsl(${(x * 40 + y * 12) % 360} 60% 55%)`;
    g.fillRect(x * s, y * s, s, s);
    g.fillStyle = (x + y) % 2 ? '#41525e' : '#fff';
    g.font = 'bold 22px sans-serif';
    g.fillText(String.fromCharCode(65 + y) + (x + 1), x * s + 8, y * s + 28);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ================================================================ Texture workspace */

function resampleCanvas(src, w, h) {
  // Halve in steps so big downscales stay sharp instead of aliasing.
  let cur = src, cw = src.width, ch = src.height;
  while (cw / 2 >= w && ch / 2 >= h) {
    const step = document.createElement('canvas');
    step.width = Math.max(w, Math.floor(cw / 2)); step.height = Math.max(h, Math.floor(ch / 2));
    const g = step.getContext('2d', RF); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, step.width, step.height);
    cur = step; cw = step.width; ch = step.height;
  }
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const g = out.getContext('2d', RF); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, w, h);
  return out;
}

const canvasFrom = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
const lum = (d, i) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;

export function seamScore(canvas) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext('2d', RF).getImageData(0, 0, w, h).data;
  const px = (x, y) => (y * w + x) * 4;
  const diff = (a, b) => Math.abs(d[a] - d[b]) + Math.abs(d[a + 1] - d[b + 1]) + Math.abs(d[a + 2] - d[b + 2]);
  let edge = 0, inner = 0, n = 0;
  const sy = Math.max(1, Math.floor(h / 256)), sx = Math.max(1, Math.floor(w / 256));
  for (let y = 0; y < h; y += sy) { edge += diff(px(0, y), px(w - 1, y)); inner += diff(px(Math.floor(w / 2), y), px(Math.floor(w / 2) + 1, y)); n++; }
  for (let x = 0; x < w; x += sx) { edge += diff(px(x, 0), px(x, h - 1)); inner += diff(px(x, Math.floor(h / 2)), px(x, Math.floor(h / 2) + 1)); n++; }
  return (edge / n + 1) / (inner / n + 6);
}

export function makeSeamless(src, feather) {
  const { width: w, height: h } = src;
  const out = canvasFrom(w, h);
  const g = out.getContext('2d', RF);
  const a = src.getContext('2d', RF).getImageData(0, 0, w, h).data;
  // shifted copy: its edges come from the source's middle, so they wrap seamlessly
  const sh = canvasFrom(w, h), sg = sh.getContext('2d', RF);
  const hw = Math.floor(w / 2), hh = Math.floor(h / 2);
  sg.drawImage(src, -hw, -hh); sg.drawImage(src, w - hw, -hh); sg.drawImage(src, -hw, h - hh); sg.drawImage(src, w - hw, h - hh);
  const b = sg.getImageData(0, 0, w, h).data;
  const res = g.createImageData(w, h), o = res.data;
  const fw = Math.max(1, w * feather), fh = Math.max(1, h * feather);
  const smooth = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++) {
    const wy = smooth(Math.min(1, Math.min(y, h - 1 - y) / fh));
    for (let x = 0; x < w; x++) {
      const wx = smooth(Math.min(1, Math.min(x, w - 1 - x) / fw));
      const k = wx * wy, i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) o[i + c] = a[i + c] * k + b[i + c] * (1 - k);
      o[i + 3] = 255;
    }
  }
  g.putImageData(res, 0, 0);
  return out;
}

function offsetHalf(src) {
  const { width: w, height: h } = src;
  const out = canvasFrom(w, h), g = out.getContext('2d', RF);
  const hw = Math.floor(w / 2), hh = Math.floor(h / 2);
  g.drawImage(src, -hw, -hh); g.drawImage(src, w - hw, -hh); g.drawImage(src, -hw, h - hh); g.drawImage(src, w - hw, h - hh);
  return out;
}

function evenLighting(src, strength) {
  const { width: w, height: h } = src;
  // A heavy blur (8×8 cells, smoothly upscaled) estimates the baked-in light; divide it out.
  const small = resampleCanvas(src, 8, 8);
  const blur = canvasFrom(w, h), bg = blur.getContext('2d', RF);
  bg.imageSmoothingQuality = 'high'; bg.drawImage(small, 0, 0, w, h);
  const L = bg.getImageData(0, 0, w, h).data;
  const out = canvasFrom(w, h), g = out.getContext('2d', RF);
  const img = src.getContext('2d', RF).getImageData(0, 0, w, h);
  const d = img.data;
  let mean = [0, 0, 0];
  for (let i = 0; i < L.length; i += 4) for (let c = 0; c < 3; c++) mean[c] += L[i + c];
  mean = mean.map((m) => m / (L.length / 4));
  for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) {
    const corrected = d[i + c] * mean[c] / Math.max(8, L[i + c]);
    d[i + c] = Math.max(0, Math.min(255, d[i + c] * (1 - strength) + corrected * strength));
  }
  g.putImageData(img, 0, 0);
  return out;
}

function hexRGB(hex) { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

function pullToPalette(src, palette, amount) {
  const { width: w, height: h } = src;
  const out = canvasFrom(w, h), g = out.getContext('2d', RF);
  const img = src.getContext('2d', RF).getImageData(0, 0, w, h), d = img.data;
  const pal = palette.map(hexRGB);
  // Keep each pixel's lightness; nudge its colour toward the nearest palette hue.
  const palL = pal.map((p) => (p[0] * 0.2126 + p[1] * 0.7152 + p[2] * 0.0722) || 1);
  for (let i = 0; i < d.length; i += 4) {
    let best = 0, bd = Infinity;
    for (let p = 0; p < pal.length; p++) { const dd = (d[i] - pal[p][0]) ** 2 + (d[i + 1] - pal[p][1]) ** 2 + (d[i + 2] - pal[p][2]) ** 2; if (dd < bd) { bd = dd; best = p; } }
    const l = d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722, k = l / palL[best];
    for (let c = 0; c < 3; c++) d[i + c] = Math.max(0, Math.min(255, d[i + c] * (1 - amount) + pal[best][c] * k * amount));
  }
  g.putImageData(img, 0, 0);
  return out;
}

function dominantColors(src, n = 5) {
  const s = resampleCanvas(src, 64, 64), d = s.getContext('2d', RF).getImageData(0, 0, 64, 64).data;
  const bins = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const key = (d[i] >> 5) << 6 | (d[i + 1] >> 5) << 3 | (d[i + 2] >> 5);
    const b = bins.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; b.n++;
    bins.set(key, b);
  }
  return [...bins.values()].sort((a, b) => b.n - a.n).slice(0, n).map((b) => ({ hex: '#' + [b.r, b.g, b.b].map((v) => Math.round(v / b.n).toString(16).padStart(2, '0')).join(''), share: b.n / 4096 }));
}

export function roughnessMap(src, contrast, invert) {
  const { width: w, height: h } = src;
  const out = canvasFrom(w, h), g = out.getContext('2d', RF);
  const img = src.getContext('2d', RF).getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let v = lum(d, i);
    if (!invert) v = 1 - v; // bright, clean areas are usually smoother
    v = Math.max(0, Math.min(1, (v - 0.5) * contrast + 0.6));
    d[i] = d[i + 1] = d[i + 2] = Math.round(v * 255);
  }
  g.putImageData(img, 0, 0);
  return out;
}

export function normalMap(src, strength, directX) {
  const { width: w, height: h } = src;
  const H = new Float32Array(w * h);
  const d = src.getContext('2d', RF).getImageData(0, 0, w, h).data;
  for (let i = 0; i < w * h; i++) H[i] = lum(d, i * 4);
  const out = canvasFrom(w, h), g = out.getContext('2d', RF);
  const img = g.createImageData(w, h), o = img.data;
  const at = (x, y) => H[((y + h) % h) * w + ((x + w) % w)]; // wraps, so the normal map tiles too
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
    const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
    let nx = -dx * strength, ny = dy * strength, nz = 1;
    if (directX) ny = -ny;
    const len = Math.hypot(nx, ny, nz), i = (y * w + x) * 4;
    o[i] = (nx / len * 0.5 + 0.5) * 255; o[i + 1] = (ny / len * 0.5 + 0.5) * 255; o[i + 2] = (nz / len * 0.5 + 0.5) * 255; o[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return out;
}

function sampleTextureCanvas() {
  // A fake phone photo of bricks: 900×640, light falling off to one side, edges that don't match.
  const c = canvasFrom(900, 640), g = c.getContext('2d', RF);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#8a8178'; g.fillRect(0, 0, 900, 640);
  for (let row = 0; row < 12; row++) for (let col = -1; col < 9; col++) {
    const x = col * 110 + (row % 2) * 55 + 6, y = row * 54 + 5;
    const r = 150 + rnd() * 40, gg = 70 + rnd() * 25, b = 50 + rnd() * 20;
    g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect(x, y, 100, 44);
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.18})`; g.fillRect(x + rnd() * 96, y + rnd() * 40, 2 + rnd() * 5, 2 + rnd() * 4); }
  }
  const light = g.createLinearGradient(0, 0, 900, 640);
  light.addColorStop(0, 'rgba(255,240,210,.35)'); light.addColorStop(1, 'rgba(0,0,20,.55)');
  g.fillStyle = light; g.fillRect(0, 0, 900, 640);
  return c;
}

async function textureWorkspace({ source, name, say }) {
  const brief = getBrief();
  let work;
  if (source instanceof HTMLCanvasElement) work = source;
  else {
    const bmp = await createImageBitmap(source);
    work = canvasFrom(bmp.width, bmp.height);
    work.getContext('2d', RF).drawImage(bmp, 0, 0);
  }
  const original = work;
  const history = [];
  const el = document.createElement('div');
  el.className = 'ab-texture';
  el.innerHTML = `
    <div class="ab-tex-view">
      <div class="ab-seg" role="group" aria-label="Preview">
        <button data-tv="tile" aria-pressed="true">Tiled 3×3</button>
        <button data-tv="single" aria-pressed="false">Single</button>
        <button data-tv="rough" aria-pressed="false">Roughness</button>
        <button data-tv="normal" aria-pressed="false">Normal</button>
        <button data-tv="3d" aria-pressed="false">3D test</button>
      </div>
      <canvas class="ab-tex-canvas" aria-label="Texture preview"></canvas>
      <canvas class="ab-tex-3d" hidden aria-label="3D material preview. Drag to orbit."></canvas>
      <label class="ab-toggle"><input type="checkbox" data-seams> Show tile edges</label>
      <p class="ab-legend" data-tlegend></p>
    </div>
    <div class="ab-side">
      <div class="ab-summary" data-tsummary></div>
      <h4>Checks</h4>
      <ol class="ab-checks" data-tchecks></ol>
      <h4>Polish</h4>
      <div class="ab-tools">
        <div class="ab-tool"><b>1 · Even out lighting</b><p>Photos have shadows baked in, which show up as a pattern when the texture repeats.</p><label>Strength <input type="range" min="0" max="1" step="0.05" value="0.8" data-light></label><button class="ab-btn small" data-op="light">Apply</button></div>
        <div class="ab-tool"><b>2 · Crop square & resize</b><p>Engines want power-of-two sizes (256, 512, 1024…).</p><label>Size <select data-size>${[256, 512, 1024, 2048].map((n) => `<option ${n === brief.texture ? 'selected' : ''}>${n}</option>`).join('')}</select></label><button class="ab-btn small" data-op="square">Apply</button></div>
        <div class="ab-tool"><b>3 · Make it tile</b><p>Blends the edges with a half-offset copy so the texture repeats with no visible seam.</p><label>Blend width <input type="range" min="0.08" max="0.45" step="0.01" value="0.22" data-feather></label><button class="ab-btn small" data-op="seamless">Apply</button><button class="ab-btn small alt" data-op="offset" title="The classic Offset filter: moves the seams to the middle so you can paint over them in your app.">Offset ½</button></div>
        <div class="ab-tool"><b>4 · Match your palette</b><p data-palette></p><label>Amount <input type="range" min="0" max="0.7" step="0.05" value="0.25" data-amount></label><button class="ab-btn small" data-op="palette">Apply</button></div>
        <div class="ab-tool"><b>5 · Material maps</b><label>Roughness contrast <input type="range" min="0.3" max="3" step="0.1" value="1.4" data-rc></label><label class="ab-toggle"><input type="checkbox" data-rinv> Dark = smooth</label><label>Normal strength <input type="range" min="0.5" max="12" step="0.5" value="4" data-ns></label><label class="ab-toggle"><input type="checkbox" data-dx> DirectX normals (Unreal)</label></div>
      </div>
      <div class="ab-undo"><button class="ab-btn small alt" data-op="undo">Undo</button><button class="ab-btn small alt" data-op="reset">Back to original</button></div>
      <div class="ab-export">
        <h4>Export</h4>
        <label>Material name <input data-tname value="${esc(pascal(name))}" maxlength="40" spellcheck="false"></label>
        <div class="ab-export-row">
          <button class="ab-btn" data-texport="color">BaseColor .png</button>
          <button class="ab-btn alt" data-texport="rough">Roughness .png</button>
          <button class="ab-btn alt" data-texport="normal">Normal .png</button>
          <button class="ab-btn alt" data-texport="glb">Test cube .glb</button>
        </div>
        <p class="ab-note">PNGs work in every app and engine. The test cube carries all three maps, so dropping it into Godot, Unity, Unreal, Roblox or Blender shows the finished material.</p>
      </div>
    </div>`;
  const q = (s) => el.querySelector(s);
  const view = q('.ab-tex-canvas');
  let tv = 'tile', rough, normal, three3d = null;
  const maps = () => {
    rough = roughnessMap(work, +q('[data-rc]').value, q('[data-rinv]').checked);
    normal = normalMap(work, +q('[data-ns]').value, q('[data-dx]').checked);
  };
  const draw = () => {
    const show = tv === 'rough' ? rough : tv === 'normal' ? normal : work;
    const is3d = tv === '3d';
    view.hidden = is3d;
    q('.ab-tex-3d').hidden = !is3d;
    if (is3d) { three3d?.update(); return; }
    const reps = tv === 'single' ? 1 : 3;
    const box = 720;
    const scale = Math.min(box / (show.width * reps), box / (show.height * reps), 1);
    const tw = Math.max(1, Math.round(show.width * scale)), th = Math.max(1, Math.round(show.height * scale));
    view.width = tw * reps; view.height = th * reps;
    const g = view.getContext('2d', RF);
    for (let y = 0; y < reps; y++) for (let x = 0; x < reps; x++) g.drawImage(show, x * tw, y * th, tw, th);
    if (q('[data-seams]').checked && reps > 1) {
      g.strokeStyle = '#ff4fd8'; g.setLineDash([6, 6]); g.lineWidth = 2;
      for (let k = 1; k < reps; k++) { g.beginPath(); g.moveTo(k * tw, 0); g.lineTo(k * tw, view.height); g.moveTo(0, k * th); g.lineTo(view.width, k * th); g.stroke(); }
    }
    q('[data-tlegend]').textContent = {
      tile: 'Nine copies side by side, like a floor in a game. Look for lines, repeating blotches and a light-to-dark pattern.',
      single: 'One copy at its real proportions.',
      rough: 'Roughness: white is rough and matte, black is smooth and shiny. Grout and dirt should be lighter.',
      normal: 'Normal map: fakes small bumps from the brightness of your texture. It wraps at the edges, so it tiles too.'
    }[tv];
  };
  const analyze = () => {
    const w = work.width, h = work.height;
    const score = seamScore(work);
    const dom = dominantColors(work);
    const metres = w / brief.texel;
    q('[data-tsummary]').innerHTML = `<div><b>${w} × ${h}</b><span>pixels</span></div><div><b>${fmt(metres)} m</b><span>covered at ${brief.texel} px/m</span></div><div><b>${fmt(score, 1)}</b><span>seam jump (lower is better)</span></div>`;
    const checks = [
      { status: w === h ? 'pass' : 'warn', title: 'Square', detail: w === h ? 'Square textures tile evenly in both directions.' : `${w} × ${h} isn't square. Tiling materials are usually square.` },
      { status: isPOT(w) && isPOT(h) ? 'pass' : 'fail', title: 'Power-of-two size', detail: isPOT(w) && isPOT(h) ? `${w} px is a power of two, so engines can mipmap and compress it.` : `${w} × ${h} isn't a power of two. Many engines resize or refuse to compress it, which costs memory and blurs it.` },
      { status: Math.max(w, h) <= brief.texture ? 'pass' : 'warn', title: 'Within your texture size', detail: `Brief: ${brief.texture} px. ${Math.max(w, h) > brief.texture ? 'Larger than the brief: resize it to save memory.' : 'Fits the brief.'}` },
      { status: score < 1.6 ? 'pass' : score < 3 ? 'warn' : 'fail', title: 'Tiles without seams', detail: score < 1.6 ? 'The edges match: it repeats cleanly. Check the 3×3 view for repeating blotches too.' : 'The left/right or top/bottom edges don\'t match, so a line shows where tiles meet. Use "Make it tile".' }
    ];
    q('[data-tchecks]').innerHTML = checks.map((c) => `<li class="is-${c.status}"><span class="ab-icon" aria-hidden="true">${{ pass: '✓', warn: '!', fail: '✕' }[c.status]}</span><div><b>${esc(c.title)}</b><p>${c.detail}</p></div></li>`).join('');
    q('[data-palette]').innerHTML = `Brief palette ${brief.palette.map((c) => `<i class="ab-sw" style="background:${esc(c)}" title="${esc(c)}"></i>`).join('')} · texture's main colours ${dom.map((c) => `<i class="ab-sw" style="background:${c.hex}" title="${c.hex} · ${Math.round(c.share * 100)}%"></i>`).join('')}`;
  };
  const refresh = () => { maps(); analyze(); draw(); three3d?.setMaps(work, rough, normal); };
  const commit = (next, msg) => { history.push(work); if (history.length > 12) history.shift(); work = next; refresh(); say(msg, 'ok'); };
  el.querySelectorAll('[data-tv]').forEach((b) => b.addEventListener('click', async () => {
    tv = b.dataset.tv;
    el.querySelectorAll('[data-tv]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (tv === '3d' && !three3d) { say('Loading the 3D preview…'); three3d = await materialPreview(q('.ab-tex-3d'), brief); three3d.setMaps(work, rough, normal); say('Drag to orbit. The cube is 2 m; the tiles repeat at your brief\'s texel density.', 'ok'); }
    draw();
  }));
  q('[data-seams]').addEventListener('change', draw);
  ['[data-rc]', '[data-rinv]', '[data-ns]', '[data-dx]'].forEach((s) => q(s).addEventListener('input', () => { maps(); draw(); three3d?.setMaps(work, rough, normal); }));
  el.querySelectorAll('[data-op]').forEach((b) => b.addEventListener('click', () => {
    const op = b.dataset.op;
    if (op === 'light') commit(evenLighting(work, +q('[data-light]').value), 'Lighting evened out. Compare the 3×3 view: the big light-to-dark pattern should be gone.');
    else if (op === 'square') {
      const n = +q('[data-size]').value, side = Math.min(work.width, work.height);
      const sq = canvasFrom(side, side);
      sq.getContext('2d', RF).drawImage(work, (work.width - side) / 2, (work.height - side) / 2, side, side, 0, 0, side, side);
      commit(resampleCanvas(sq, n, n), `Cropped to the centre square and resized to ${n} × ${n}.`);
    } else if (op === 'seamless') commit(makeSeamless(work, +q('[data-feather]').value), 'Edges blended. Turn on "Show tile edges": the lines should be invisible now.');
    else if (op === 'offset') commit(offsetHalf(work), 'Offset by half: the old edges are now in the middle. Paint over them in your app, or press Offset ½ again to undo.');
    else if (op === 'palette') commit(pullToPalette(work, brief.palette, +q('[data-amount]').value), 'Colours nudged toward your brief palette, keeping light and dark.');
    else if (op === 'undo') { if (history.length) { work = history.pop(); refresh(); say('Undone.'); } }
    else if (op === 'reset') { history.length = 0; work = original; refresh(); say('Back to the original.'); }
  }));
  const tname = () => pascal(q('[data-tname]').value);
  el.querySelectorAll('[data-texport]').forEach((b) => b.addEventListener('click', async () => {
    const kind = b.dataset.texport, n = tname();
    const toBlob = (c) => new Promise((r) => c.toBlob(r, 'image/png'));
    if (kind === 'glb') {
      const T = await loadThree();
      const { THREE } = T;
      const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
      const geo = new THREE.BoxGeometry(2, 2, 2);
      const tiles = 2 / (work.width / brief.texel);
      const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * tiles, uv.getY(i) * tiles);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ name: `M_${n}`, map: mk(work, true), roughnessMap: mk(rough), normalMap: mk(q('[data-dx]').checked ? normalMap(work, +q('[data-ns]').value, false) : normal), roughness: 1 }));
      mesh.name = `SM_${n}_TestCube`;
      mesh.position.y = 1;
      const buf = await new T.GLTFExporter().parseAsync(mesh, { binary: true });
      const blob = new Blob([buf], { type: 'model/gltf-binary' });
      download(blob, `SM_${n}_TestCube.glb`);
      shelf.put(`SM_${n}_TestCube.glb`, blob, 'model');
      say('Saved a 2 m test cube with your material. glTF always stores OpenGL-style normals; engines convert on import.', 'ok');
      return;
    }
    const c = kind === 'rough' ? rough : kind === 'normal' ? normal : work;
    const file = `T_${n}_${{ color: 'BaseColor', rough: 'Roughness', normal: 'Normal' }[kind]}.png`;
    const blob = await toBlob(c);
    download(blob, file);
    shelf.put(file, blob, 'texture');
    say(`Saved ${file}.${kind === 'normal' ? ' In your engine, mark it as a normal map (not colour).' : kind === 'rough' ? ' Import it as non-colour / linear data.' : ''}`, 'ok');
  }));
  refresh();
  return { el, resume() { draw(); }, dispose() { three3d?.dispose(); } };
}

async function materialPreview(canvas, brief) {
  const T = await loadThree();
  const { THREE } = T;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1b2d3a');
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 100);
  camera.position.set(3.2, 2.6, 4.2);
  const controls = new T.OrbitControls(camera, canvas);
  controls.target.set(0, 1, 0);
  controls.enableDamping = true;
  scene.add(new THREE.HemisphereLight('#e6f3ff', '#40362a', 0.9));
  const sun = new THREE.DirectionalLight('#fff', 2.6);
  scene.add(sun);
  const mat = new THREE.MeshStandardMaterial({ roughness: 1 });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat);
  cube.position.y = 1;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), mat);
  floor.rotation.x = -Math.PI / 2;
  const person = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.31, 6, 12), new THREE.MeshLambertMaterial({ color: '#8fb4c6' }));
  person.position.set(-1.7, 0.875, 0.6);
  scene.add(cube, floor, person);
  const uvBase = new Map();
  const setRepeat = (mesh, tiles) => {
    const uv = mesh.geometry.attributes.uv;
    if (!uvBase.has(mesh)) uvBase.set(mesh, uv.array.slice());
    const base = uvBase.get(mesh);
    for (let i = 0; i < base.length; i++) uv.array[i] = base[i] * tiles;
    uv.needsUpdate = true;
  };
  let raf = 0, alive = true, t0 = performance.now();
  const loop = () => {
    if (!alive || canvas.hidden || !canvas.isConnected) return;
    raf = requestAnimationFrame(loop);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w && h && (canvas.width !== Math.round(w * renderer.getPixelRatio()))) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    const t = (performance.now() - t0) / 4000;
    sun.position.set(Math.cos(t) * 5, 4, Math.sin(t) * 5);
    controls.update();
    renderer.render(scene, camera);
  };
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return {
    setMaps(color, rough, normal) {
      ['map', 'roughnessMap', 'normalMap'].forEach((k) => mat[k]?.dispose());
      mat.map = tex(color, true); mat.roughnessMap = tex(rough); mat.normalMap = tex(normal);
      mat.needsUpdate = true;
      const metresPerTile = color.width / brief.texel;
      setRepeat(cube, 2 / metresPerTile);
      setRepeat(floor, 8 / metresPerTile);
    },
    update() { cancelAnimationFrame(raf); loop(); },
    dispose() { alive = false; cancelAnimationFrame(raf); controls.dispose(); renderer.dispose(); }
  };
}

/* ================================================================ boot */

function boot() { document.querySelectorAll('[data-asset-bench]:not(.ab)').forEach(mount); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
