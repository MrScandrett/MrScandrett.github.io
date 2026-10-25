// 360° page sphere (vr/page-sphere.html): any site page, wrapped around you.
//
// The real page runs in a hidden same-origin iframe (so its scripts, links and widgets all
// work and a link click doesn't end the VR session). page-raster.mjs draws that page to an
// image, the image is cut into 1280×720 "screens" (sphere-layout.mjs) and each screen is
// a patch on the inside of a sphere. A laser click is mapped back to a page coordinate and
// replayed in the iframe. Navigation redraws the new page; while immersed, other changes
// wait for the explicit Redraw control so a costly DOM capture never freezes a click.
import { THREE } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import { createRig, createPointer, mountVRButton, createPanel } from '../xr-kit.mjs';
import { rasterizeDocument, findMainScroller } from '../page-raster.mjs';
import { createEnvironment } from './sphere-environment.mjs';
import { MOTION_MODES, motionScale, environmentFor } from './sphere-theme.mjs';
import { createSound, pulse, soundMode, SOUND_MODES, SOUND_KEY } from './sphere-sound.mjs';
import {
  TILE_W, TILE_H, TILE_GUTTER, PAGE_SLICE_H, SLICE_STEP,
  planTiles, screensFor, tilePatch, tileUvToPage, spherePoint, safeSource, sourceParam, sharpen
} from './sphere-layout.mjs';

const SITE = new URL('../../../', import.meta.url);
const RADIUS = 3;
const FRAME_NAME = 'classroomos-vr-sphere'; // vr-mode.js stays out of a frame with this name
const SOURCE_VIEWPORT_H = 720; // keep lesson responsive layout stable as VR panels get taller
const HEADSET = /OculusBrowser|\bQuest\b|PicoBrowser|\bPico\b|Wolvic/i.test(navigator.userAgent || '');
// Keep lesson text at the full logical resolution. The low-cost immersive world and
// taller/fewer panels recover far more performance than downscaling readable content.
const TEXTURE_SCALE = 1;

const canvas = document.getElementById('vr-canvas');
const status = document.getElementById('vr-status');
const refreshBtn = document.getElementById('sphere-refresh');
const normalLink = document.getElementById('sphere-normal');
const pageName = document.getElementById('sphere-page');

const say = text => { status.textContent = text; };

/* ── The page, running in a hidden frame ─────────────────────────── */
let source = safeSource(new URLSearchParams(location.search).get('src') || 'index.html', SITE.href, location.origin);
const frame = document.createElement('iframe');
frame.name = FRAME_NAME;
frame.title = 'Page shown in the 360° sphere';
frame.tabIndex = -1;
frame.setAttribute('aria-hidden', 'true');
Object.assign(frame.style, {
  position: 'fixed', left: '-20000px', top: '0', width: `${TILE_W}px`, height: `${SOURCE_VIEWPORT_H}px`,
  border: '0', opacity: '0', pointerEvents: 'none'
});

let view = null;
try {
  view = createScene(canvas, {
    THREE,
    clearColor: 0x0a0f1c,
    fov: 70,
    far: 50,
    antialias: !HEADSET,
    maxDpr: HEADSET ? 1 : 1.5
  });
} catch {
  say('3D graphics are unavailable on this device. Open the page normally instead.');
}

if (!source) {
  say('The sphere can only open pages from this site.');
} else if (view) {
  boot(view);
}

function boot({ renderer, scene, camera, syncSize }) {
  // Quest renders once per eye. Keep a small performance margin without making lesson
  // text visibly soft; the immersive background already switches to its cheap shader.
  renderer.xr.setFramebufferScaleFactor(HEADSET ? 0.9 : 1);
  const rig = createRig(THREE, scene, camera);
  const eye = rig.userData.eyeHeight;
  const sphere = new THREE.Group(); // centred on your head; turned to face you when VR starts
  sphere.position.set(0, eye, 0);
  scene.add(sphere);

  /* The world around the screens follows the site theme: Lava Lamp is wax all around you. */
  const env = createEnvironment(THREE, { LiquidEngine: window.LiquidEngine });
  scene.add(env.mesh);
  const registry = window.ClassroomOSThemeRegistry;
  const currentTheme = () => (registry ? registry.get(document.documentElement.dataset.theme || 'day') : { id: 'day', swatch: ['#dff1ff', '#6eb6ff'], accentRGB: [0, 113, 227] });
  const css = c => `rgb(${c.map(v => Math.round(v * 255)).join(',')})`;
  const styled = []; // panels that wear the theme's colours (the Exit button keeps its red)
  function applyTheme() {
    const theme = currentTheme();
    const look = env.setTheme(theme);
    sound.setLook(look.look);
    const dark = theme.tone === 'dark';
    const [r, g, b] = look.dark.map(v => Math.round(v * 255 * 0.5));
    const style = { accent: css(look.accent), background: dark ? `rgba(${r},${g},${b},0.94)` : 'rgba(16,24,38,0.94)' };
    for (const panel of styled) panel.userData.setStyle(style);
    document.getElementById('sphere-theme').textContent = theme.label || theme.id;
  }

  /* Sound: every click, control and lesson video has a place in the room (sphere-sound.mjs). */
  let savedSound = null;
  try { savedSound = localStorage.getItem(SOUND_KEY); } catch { /* private mode */ }
  const sound = createSound({ mode: soundMode(savedSound) });
  const soundSelect = document.getElementById('sphere-sound');
  let soundPanel = null;
  const soundLabel = () => `♪ ${Cap(sound.mode)}`;
  function setSound(mode) {
    sound.setMode(mode);
    try { localStorage.setItem(SOUND_KEY, sound.mode); } catch { /* private mode */ }
    if (soundPanel) soundPanel.userData.setText(soundLabel());
    soundSelect.value = sound.mode;
    sound.wake();
    notify(`Sound: ${Cap(sound.mode)}${sound.mode === 'full' ? ' (clicks plus the world around you; headphones work best)' : ''}`, 2500);
  }
  soundSelect.value = sound.mode;
  soundSelect.addEventListener('change', () => setSound(soundSelect.value));
  const session = () => renderer.xr.getSession && renderer.xr.getSession();
  const worldOnTile = (plan, u, v) => sphere.localToWorld(pointOnTile(plan, u, v, RADIUS));

  /* Screens: one canvas, texture and patch each. */
  const tiles = []; // { plan, canvas, ctx, texture, mesh }
  let hotspotsByTile = [];
  let activeHotspot = null;
  const hoverGeometry = new THREE.BufferGeometry();
  const hoverOutline = new THREE.Line(
    hoverGeometry,
    new THREE.LineBasicMaterial({ color: 0x38e8ff, depthTest: false, transparent: true, opacity: 0.98 })
  );
  hoverOutline.visible = false;
  hoverOutline.renderOrder = 20;
  hoverOutline.frustumCulled = false;
  sphere.add(hoverOutline);
  function ensureTiles(count) {
    const plan = planTiles(count);
    while (tiles.length > plan.length) {
      const t = tiles.pop();
      sphere.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mesh.material.dispose();
      t.texture.dispose();
    }
    for (const p of plan.slice(tiles.length)) {
      const c = document.createElement('canvas');
      c.width = Math.round(TILE_W * TEXTURE_SCALE);
      c.height = Math.round(TILE_H * TEXTURE_SCALE);
      const texture = new THREE.CanvasTexture(c);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const data = tilePatch(p, RADIUS);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
      geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false }));
      mesh.userData.tile = p.index;
      sphere.add(mesh);
      tiles.push({ plan: p, canvas: c, ctx: c.getContext('2d', { willReadFrequently: true }), texture, mesh });
    }
  }

  function pointOnTile(plan, u, topDownV, radius = RADIUS - 0.025) {
    const yaw = plan.yawCenter + (u - 0.5) * plan.yawSpan;
    const pitch = plan.pitchCenter + (0.5 - topDownV) * plan.pitchSpan;
    return new THREE.Vector3(...spherePoint(yaw, pitch, radius));
  }

  function showHotspot(tileIndex, hotspot) {
    const key = hotspot ? `${tileIndex}:${hotspot.key}` : '';
    if (key === activeHotspot) return;
    activeHotspot = key;
    if (!hotspot) { hoverOutline.visible = false; return; }
    const plan = tiles[tileIndex] && tiles[tileIndex].plan;
    if (!plan) { hoverOutline.visible = false; return; }
    const x0 = Math.max(0, hotspot.x) / TILE_W;
    const x1 = Math.min(TILE_W, hotspot.x + hotspot.width) / TILE_W;
    const y0 = Math.max(0, hotspot.localY) / TILE_H;
    const y1 = Math.min(TILE_H, hotspot.localY + hotspot.height) / TILE_H;
    // A faint tick and buzz as the laser lands on something clickable.
    sound.tick(worldOnTile(plan, (x0 + x1) / 2, (y0 + y1) / 2), { soft: true });
    pulse(session(), 0.12, 10);
    const points = [];
    const edge = (ax, ay, bx, by) => {
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        points.push(pointOnTile(plan, ax + (bx - ax) * t, ay + (by - ay) * t));
      }
    };
    edge(x0, y0, x1, y0); edge(x1, y0, x1, y1); edge(x1, y1, x0, y1); edge(x0, y1, x0, y0);
    hoverGeometry.setFromPoints(points);
    hoverOutline.visible = true;
  }

  function aimHotspot(tileIndex, x, y) {
    const hotspot = (hotspotsByTile[tileIndex] || []).find(h =>
      x >= h.x && x <= h.x + h.width && y >= h.localY && y <= h.localY + h.height
    );
    showHotspot(tileIndex, hotspot || null);
    return !!hotspot;
  }

  function cacheHotspots(doc) {
    const win = doc.defaultView;
    const scroller = findMainScroller(doc);
    hotspotsByTile = tiles.map(() => []);
    let key = 0;
    for (const el of doc.querySelectorAll(CLICKABLE)) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2 || el.disabled || win.getComputedStyle(el).visibility === 'hidden') continue;
      const pageY = rect.top + (scroller ? scroller.scrollTop : win.scrollY);
      for (let tileIndex = 0; tileIndex < tiles.length; tileIndex++) {
        const sliceTop = tileIndex * SLICE_STEP;
        const sliceBottom = sliceTop + PAGE_SLICE_H;
        if (pageY + rect.height < sliceTop || pageY > sliceBottom) continue;
        hotspotsByTile[tileIndex].push({
          key: key++,
          el,
          x: rect.left,
          localY: pageY - sliceTop + TILE_GUTTER,
          width: rect.width,
          height: rect.height
        });
      }
    }
    showHotspot(-1, null);
    placeMedia(doc, scroller);
  }

  // The lesson's own audio and video play from the panel they appear on, beamed at you.
  const facing = new THREE.Vector3();
  function placeMedia(doc, scroller) {
    const win = doc.defaultView;
    for (const el of doc.querySelectorAll('audio, video')) {
      const rect = el.getBoundingClientRect();
      const pageY = rect.top + rect.height / 2 + (scroller ? scroller.scrollTop : win.scrollY);
      const index = Math.min(tiles.length - 1, Math.max(0, Math.floor(pageY / SLICE_STEP)));
      const plan = tiles[index] && tiles[index].plan;
      if (!plan) continue;
      const u = Math.min(1, Math.max(0, (rect.left + rect.width / 2) / TILE_W));
      const v = Math.min(1, Math.max(0, (pageY - index * SLICE_STEP + TILE_GUTTER) / TILE_H));
      const at = worldOnTile(plan, u, v);
      sphere.getWorldPosition(facing).sub(at).normalize();
      sound.placeMedia(el, at, facing);
    }
  }

  /* Motion: a world that moves all around you is the classic cause of VR sickness. */
  const MOTION_KEY = 'classroomos-sphere-motion';
  const motionSelect = document.getElementById('sphere-motion');
  let motionMode = 'auto';
  try { const saved = localStorage.getItem(MOTION_KEY); if (MOTION_MODES.includes(saved)) motionMode = saved; } catch { /* private mode */ }
  let motionPanel = null;
  const readReduced = () => {
    let on = false;
    try { on = localStorage.getItem('classroomos-reduced-motion') === 'on'; } catch { /* private mode */ }
    return on || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };
  let reduced = readReduced();
  const Cap = w => w[0].toUpperCase() + w.slice(1);
  function motionLabel() { return `◐ ${Cap(motionMode)}`; }
  function setMotion(mode) {
    motionMode = mode;
    try { localStorage.setItem(MOTION_KEY, mode); } catch { /* private mode */ }
    if (motionPanel) motionPanel.userData.setText(motionLabel());
    motionSelect.value = mode;
    notify(`Motion: ${Cap(mode)}${mode === 'auto' ? ' (calm in a headset, still if you asked for reduced motion)' : ''}`, 2500);
  }
  motionSelect.value = motionMode;
  motionSelect.addEventListener('change', () => setMotion(motionSelect.value));
  window.addEventListener('storage', () => { reduced = readReduced(); });

  /* Controls and notices float on the sphere, above the first screen. */
  function floatOnSphere(mesh, yaw, pitch, r = RADIUS - 0.06) {
    mesh.position.set(...spherePoint(yaw, pitch, r));
    mesh.lookAt(0, 0, 0);
    sphere.add(mesh);
    return mesh;
  }
  const titlePanel = floatOnSphere(createPanel(THREE, { width: 1.4, height: 0.2, title: 'Loading…' }), 0, 19);
  styled.push(titlePanel);
  const buttons = [
    { label: soundLabel(), yaw: -35, id: 'sound', run: () => setSound(SOUND_MODES[(SOUND_MODES.indexOf(sound.mode) + 1) % SOUND_MODES.length]) },
    { label: '← Back', yaw: -22, run: () => { try { frame.contentWindow.history.back(); } catch { /* cross-origin */ } } },
    { label: '↻ Redraw', yaw: 20, run: () => redraw(true) },
    { label: motionLabel(), yaw: 33, id: 'motion', run: () => setMotion(MOTION_MODES[(MOTION_MODES.indexOf(motionMode) + 1) % MOTION_MODES.length]) },
    { label: 'Exit', yaw: 46, accent: '#ff8f8f', run: exitSphere }
  ].map(b => {
    const panel = createPanel(THREE, { width: 0.66, height: 0.2, title: b.label, accent: b.accent });
    panel.userData.action = b.run;
    if (!b.accent) styled.push(panel);
    if (b.id === 'motion') motionPanel = panel;
    if (b.id === 'sound') soundPanel = panel;
    return floatOnSphere(panel, b.yaw, 19);
  });
  const notice = floatOnSphere(createPanel(THREE, { width: 1.7, height: 0.34, title: '' }), 0, 27);
  styled.push(notice);
  notice.visible = false;
  let noticeTimer = 0;
  function notify(text, ms = 5000) {
    say(text);
    notice.userData.setText(text);
    notice.visible = true;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.visible = false; }, ms);
  }

  /* Draw the page into the screens. */
  let drawing = false;
  let again = false;
  let truncatedNote = '';
  async function redraw(announce = false) {
    if (drawing) { again = true; return; }
    const doc = frameDoc();
    if (!doc || !doc.body) return;
    drawing = true;
    try {
      const shot = await rasterizeDocument(doc, { width: TILE_W, viewportHeight: SOURCE_VIEWPORT_H });
      const { needed, shown, truncated } = screensFor(shot.height);
      ensureTiles(shown);
      for (const t of tiles) {
        const scale = TEXTURE_SCALE;
        const sourceY = t.plan.index * SLICE_STEP;
        const sourceH = Math.max(0, Math.min(PAGE_SLICE_H, shot.height - sourceY));
        t.ctx.fillStyle = shot.background;
        t.ctx.fillRect(0, 0, t.canvas.width, t.canvas.height);
        if (sourceH > 0) {
          t.ctx.drawImage(
            shot.image,
            0, sourceY, TILE_W, sourceH,
            0, TILE_GUTTER * scale, t.canvas.width, sourceH * scale
          );
        }
        // A quiet frame makes the end of each panel intentional. The 48 px repeated
        // between panels keeps a split paragraph/card readable on the next panel.
        t.ctx.fillStyle = 'rgba(130, 170, 220, 0.42)';
        t.ctx.fillRect(0, (TILE_GUTTER - 2) * scale, t.canvas.width, 2 * scale);
        t.ctx.fillRect(0, (TILE_GUTTER + PAGE_SLICE_H) * scale, t.canvas.width, 2 * scale);
        if (sourceH > 0) {
          const px = t.ctx.getImageData(0, 0, t.canvas.width, t.canvas.height);
          sharpen(px.data, px.width, px.height);
          t.ctx.putImageData(px, 0, 0);
        }
        t.texture.needsUpdate = true;
      }
      cacheHotspots(doc);
      truncatedNote = truncated ? `Showing the first ${shown} of ${needed} screens.` : '';
      say(`${doc.title || 'Page'} · ${shown} screen${shown === 1 ? '' : 's'} around you. ${truncatedNote}`.trim());
      if (announce) notify(truncatedNote || 'Redrawn.', 2500);
      else if (truncated) notify(truncatedNote, 6000);
    } catch (error) {
      notify(`Could not draw this page (${error.message}).`);
    } finally {
      drawing = false;
      if (again) { again = false; setTimeout(redraw, 250); }
    }
  }
  // Flat preview clicks can redraw as a page settles. In immersive VR a full DOM capture
  // stalls both eyes, so ordinary controls wait for the explicit Redraw button instead.
  function redrawSoon() {
    if (renderer.xr.isPresenting) return;
    for (const ms of [350, 1200, 2600]) setTimeout(() => redraw(), ms);
  }

  function frameDoc() {
    try { return frame.contentDocument; } catch { return null; }
  }

  function onFrameLoad() {
    let href = 'about:blank';
    try { href = frame.contentWindow.location.href; } catch { /* cross-origin */ }
    if (href === 'about:blank') return; // the empty document every new iframe starts with
    const doc = frameDoc();
    if (!doc) { notify('That page is outside this site, so it cannot be shown here.'); return; }
    const here = sourceParam(frame.contentWindow.location.href, SITE.href);
    if (here) history.replaceState(null, '', `${location.pathname}?src=${encodeURIComponent(here)}`);
    source = frame.contentWindow.location.href;
    normalLink.href = source;
    pageName.textContent = doc.title || here || 'this page';
    titlePanel.userData.setText((doc.title || 'Page').slice(0, 44));
    // Let the page's own scripts finish drawing before the first picture.
    setTimeout(() => redraw(), 900);
    redrawSoon();
  }
  frame.addEventListener('load', onFrameLoad);
  frame.src = source; // before append: appending fires a load for the empty about:blank first
  document.body.append(frame);

  /* Replay a laser click inside the real page. */
  const CLICKABLE = 'a[href], button, input, select, textarea, summary, label, [role="button"], [role="tab"], [onclick], [tabindex]';
  function openable(a) {
    try {
      const url = new URL(a.href, frame.contentWindow.location.href);
      return a.target !== '_blank' && safeSource(url.href, SITE.href, location.origin) !== null;
    } catch { return false; }
  }
  function replayClick(x, y) {
    const win = frame.contentWindow;
    const doc = frameDoc();
    if (!doc) return;
    // Bring that spot into the frame's viewport, centred (so a sticky header can't cover it).
    // App-shell pages scroll an inner panel, which the picture shows laid out in full.
    let vy;
    const scroller = findMainScroller(doc);
    if (scroller) {
      // The panel's box stays put while its content scrolls: page y sits at (y - scrollTop).
      const boxTop = scroller.getBoundingClientRect().top;
      scroller.scrollTop = Math.max(0, y - boxTop - scroller.clientHeight / 2);
      vy = y - scroller.scrollTop;
    } else {
      win.scrollTo({ top: Math.max(0, y - TILE_H / 2), left: 0, behavior: 'instant' });
      vy = y - win.scrollY;
    }
    const el = doc.elementFromPoint(x, vy);
    if (!el) return;
    const target = el.closest(CLICKABLE) || el;
    if (target.matches('a[href]') && !openable(target)) {
      notify('That link leaves the sphere. Exit and open it normally.');
      return;
    }
    if (target.matches('input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="number"], input:not([type]), textarea')) {
      notify('Typing is not supported in the sphere yet. Exit to type.');
      return;
    }
    if (target.matches('select')) { notify('Menus are not supported in the sphere yet.'); return; }
    if (target.matches('input[type="range"]')) {
      const r = target.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (x - r.left) / r.width));
      const min = parseFloat(target.min || '0');
      const max = parseFloat(target.max || '100');
      const step = parseFloat(target.step) || 1;
      target.value = String(Math.round((min + ratio * (max - min)) / step) * step);
      target.dispatchEvent(new win.Event('input', { bubbles: true }));
      target.dispatchEvent(new win.Event('change', { bubbles: true }));
      if (renderer.xr.isPresenting) notify('Changed. Press Redraw to refresh the panels.', 2200);
      else redrawSoon();
      return;
    }
    const base = { bubbles: true, cancelable: true, clientX: x, clientY: vy, view: win, button: 0 };
    const pointer = type => new win.PointerEvent(type, { ...base, pointerId: 1, pointerType: 'mouse', isPrimary: true });
    el.dispatchEvent(pointer('pointerdown'));
    el.dispatchEvent(new win.MouseEvent('mousedown', base));
    el.dispatchEvent(pointer('pointerup'));
    el.dispatchEvent(new win.MouseEvent('mouseup', base));
    el.dispatchEvent(new win.MouseEvent('click', base));
    if (renderer.xr.isPresenting && !target.matches('a[href]')) {
      notify('Selected. Press Redraw if the page changed.', 2200);
    } else {
      redrawSoon();
    }
  }

  async function exitSphere() {
    const session = renderer.xr.getSession();
    if (session) await session.end().catch(() => {});
    location.href = source;
  }

  /* Laser pointer. */
  const pointer = createPointer(THREE, renderer, {
    rig,
    camera,
    canvas,
    targets: () => [...buttons, ...tiles.map(t => t.mesh)],
    onAim: hit => {
      if (!hit || !hit.uv || hit.object.userData.tile === undefined) { showHotspot(-1, null); return; }
      const tileIndex = hit.object.userData.tile;
      const x = hit.uv.x * TILE_W;
      const y = (1 - hit.uv.y) * TILE_H;
      aimHotspot(tileIndex, x, y);
    },
    onSelect: hit => {
      sound.wake();
      sound.tick(hit.point);
      pulse(session(), 0.35, 20);
      if (hit.object.userData.action) { hit.object.userData.action(); return; }
      if (hit.uv && hit.object.userData.tile !== undefined) {
        const at = tileUvToPage(hit.object.userData.tile, hit.uv.x, hit.uv.y);
        replayClick(at.x, at.y);
      }
    }
  });
  // Hidden notice panels are not targets, so they cannot catch the laser.

  applyTheme();
  // A theme change (made on this page, or by clicking Settings inside the sphere) re-colours
  // the world at once; the hidden page re-themes itself, so redraw the screens once it has.
  new MutationObserver(() => {
    applyTheme();
    if (renderer.xr.isPresenting) notify('Theme changed. Press Redraw to refresh the page panels.', 2600);
    else { setTimeout(() => redraw(), 700); setTimeout(() => redraw(), 1800); }
  })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('classroomos:lightingchange', () => { applyTheme(); });

  // Read-only hook for tests and debugging: what has been drawn so far.
  window.ClassroomOSPageSphereEnv = { env, motionScale: () => motionScale(motionMode, { presenting: renderer.xr.isPresenting, reduced }) };
  window.ClassroomOSPageSphere = {
    tileCount: () => tiles.length,
    tileImage: index => tiles[index] && tiles[index].canvas.toDataURL('image/png'),
    clickPage: (x, y) => replayClick(x, y), // what a laser hit does, given a page coordinate
    hotspotCount: () => hotspotsByTile.reduce((sum, list) => sum + list.length, 0),
    hoverPage: (tileIndex, x, y) => aimHotspot(tileIndex, x, y),
    hoverVisible: () => hoverOutline.visible
  };

  /* Centre the sphere on your head and turn screen 0 to face where you are looking. */
  let recenter = 0;
  const head = new THREE.Vector3();
  const look = new THREE.Vector3();
  function centreOnViewer() {
    const cam = renderer.xr.getCamera();
    cam.getWorldPosition(head);
    cam.getWorldDirection(look);
    sphere.position.copy(head);
    sphere.rotation.y = Math.atan2(-look.x, -look.z);
  }

  mountVRButton(renderer, {
    button: document.getElementById('vr-enter'),
    status,
    rig,
    enterLabel: 'Enter immersive 360°',
    exitLabel: 'Exit 360°',
    onStart: () => {
      recenter = 3;
      env.setLowPower(true);
      sound.wake();
    },
    onEnd: () => {
      env.setLowPower(false);
      sphere.position.set(0, eye, 0);
      sphere.rotation.y = 0;
    }
  });
  refreshBtn.addEventListener('click', () => redraw(true));

  /* Phone or tablet as a window into the sphere: turn the device to look around. */
  const phoneBtn = document.getElementById('look-phone');
  const touch = navigator.maxTouchPoints > 0 && 'DeviceOrientationEvent' in window;
  let tilt = null; // last device orientation, in radians
  let heading = 0; // turns the sphere so where you point the device on start is straight ahead
  const tiltEuler = new THREE.Euler();
  const tiltQ = new THREE.Quaternion();
  const toScreen = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2); // device z-up → camera looks out the back
  const screenTurn = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const headingQ = new THREE.Quaternion();
  function onTilt(e) {
    if (e.alpha == null) return;
    const first = !tilt;
    tilt = { a: THREE.MathUtils.degToRad(e.alpha), b: THREE.MathUtils.degToRad(e.beta), g: THREE.MathUtils.degToRad(e.gamma) };
    if (first) heading = -tilt.a;
  }
  function deviceLook() {
    if (!tilt || renderer.xr.isPresenting) return;
    const orient = THREE.MathUtils.degToRad((screen.orientation && screen.orientation.angle) || window.orientation || 0);
    tiltEuler.set(tilt.b, tilt.a, -tilt.g, 'YXZ');
    tiltQ.setFromEuler(tiltEuler).multiply(toScreen).multiply(screenTurn.setFromAxisAngle(zAxis, -orient));
    camera.quaternion.copy(headingQ.setFromAxisAngle(yAxis, heading).multiply(tiltQ));
  }
  async function setPhoneLook(on) {
    if (on && typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS asks once, and only from a tap.
      const answer = await DeviceOrientationEvent.requestPermission().catch(() => 'denied');
      if (answer !== 'granted') { notify('Motion access was not allowed. Drag to look instead.'); on = false; }
    }
    if (on) window.addEventListener('deviceorientation', onTilt);
    else { window.removeEventListener('deviceorientation', onTilt); tilt = null; }
    phoneBtn.setAttribute('aria-pressed', String(on));
    phoneBtn.textContent = on ? '📱 Stop phone look' : '📱 Look with phone';
    if (on) notify('Hold the device up and turn around to look. Tap the page to click.', 3500);
  }
  if (touch) {
    phoneBtn.hidden = false;
    phoneBtn.addEventListener('click', () => setPhoneLook(phoneBtn.getAttribute('aria-pressed') !== 'true'));
  }

  const clock = new THREE.Clock();
  const viewer = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const up = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!renderer.xr.isPresenting) syncSize();
    else if (recenter > 0 && --recenter === 0) centreOnViewer(); // wait for the first real head pose
    pointer.update();
    deviceLook();
    (renderer.xr.isPresenting ? renderer.xr.getCamera() : camera).getWorldPosition(viewer);
    env.update(dt, motionScale(motionMode, { presenting: renderer.xr.isPresenting, reduced }), viewer);
    const eyes = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
    eyes.getWorldDirection(ahead);
    up.set(0, 1, 0).applyQuaternion(eyes.getWorldQuaternion(turn));
    sound.listen(viewer, ahead, up);
    renderer.render(scene, camera);
  });
}

/* ── Walk the site: step through every live lesson in the sphere (for testing it everywhere). */
(async function walker() {
  const form = document.getElementById('sphere-walk');
  if (!form) return;
  const input = document.getElementById('walk-input');
  const list = document.getElementById('walk-pages');
  const pos = document.getElementById('walk-pos');
  const here = source ? sourceParam(source, SITE.href) : null;
  let pages = [{ url: 'index.html', title: 'Home page' }];
  try {
    const res = await fetch(new URL('data/lessons.json', SITE));
    const data = await res.json();
    const lessons = (Array.isArray(data) ? data : data.lessons || []).filter(l => l.status === 'live' && l.url);
    pages = pages.concat(lessons.map(l => ({ url: l.url, title: l.title })));
  } catch { /* the home page alone still works */ }
  list.replaceChildren(...pages.map(p => Object.assign(document.createElement('option'), { value: p.url, label: p.title })));
  const at = pages.findIndex(p => p.url === (here || '').replace(/[?#].*$/, ''));
  if (at >= 0) pos.textContent = `${at + 1} of ${pages.length}`;
  const go = url => { location.search = `?src=${encodeURIComponent(url)}`; };
  const step = dir => go(pages[((at < 0 ? 0 : at + dir) + pages.length) % pages.length].url);
  document.getElementById('walk-prev').addEventListener('click', () => step(-1));
  document.getElementById('walk-next').addEventListener('click', () => step(1));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim().toLowerCase();
    if (!q) return;
    const hit = pages.find(p => p.url.toLowerCase() === q) || pages.find(p => p.title.toLowerCase().includes(q) || p.url.toLowerCase().includes(q));
    if (hit) go(hit.url); else pos.textContent = 'No page matches that.';
  });
}());
