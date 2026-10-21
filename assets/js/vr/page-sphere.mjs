// 360° page sphere (vr/page-sphere.html): any site page, wrapped around you.
//
// The real page runs in a hidden same-origin iframe (so its scripts, links and widgets all
// work and a link click doesn't end the VR session). page-raster.mjs draws that page to an
// image, the image is cut into 1280×720 "screens" (sphere-layout.mjs) and each screen is
// a patch on the inside of a sphere. A laser click is mapped back to a page coordinate and
// replayed in the iframe; the screens redraw a moment later.
import { THREE } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';
import { createRig, createPointer, mountVRButton, createPanel } from '../xr-kit.mjs';
import { rasterizeDocument, findMainScroller } from '../page-raster.mjs';
import { TILE_W, TILE_H, planTiles, screensFor, tilePatch, tileUvToPage, spherePoint, safeSource, sourceParam } from './sphere-layout.mjs';

const SITE = new URL('../../../', import.meta.url);
const RADIUS = 3;
const FRAME_NAME = 'classroomos-vr-sphere'; // vr-mode.js stays out of a frame with this name

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
  position: 'fixed', left: '-20000px', top: '0', width: `${TILE_W}px`, height: `${TILE_H}px`,
  border: '0', opacity: '0', pointerEvents: 'none'
});

let view = null;
try {
  view = createScene(canvas, { THREE, clearColor: 0x0a0f1c, fov: 70, far: 50 });
} catch {
  say('3D graphics are unavailable on this device. Open the page normally instead.');
}

if (!source) {
  say('The sphere can only open pages from this site.');
} else if (view) {
  boot(view);
}

function boot({ renderer, scene, camera, syncSize }) {
  const rig = createRig(THREE, scene, camera);
  const eye = rig.userData.eyeHeight;
  const sphere = new THREE.Group(); // centred on your head; turned to face you when VR starts
  sphere.position.set(0, eye, 0);
  scene.add(sphere);

  /* Screens: one canvas, texture and patch each. */
  const tiles = []; // { plan, canvas, ctx, texture, mesh }
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
      c.width = TILE_W;
      c.height = TILE_H;
      const texture = new THREE.CanvasTexture(c);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      const data = tilePatch(p, RADIUS);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
      geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false }));
      mesh.userData.tile = p.index;
      sphere.add(mesh);
      tiles.push({ plan: p, canvas: c, ctx: c.getContext('2d'), texture, mesh });
    }
  }

  /* Controls and notices float on the sphere, above the first screen. */
  function floatOnSphere(mesh, yaw, pitch, r = RADIUS - 0.06) {
    mesh.position.set(...spherePoint(yaw, pitch, r));
    mesh.lookAt(0, 0, 0);
    sphere.add(mesh);
    return mesh;
  }
  const titlePanel = floatOnSphere(createPanel(THREE, { width: 1.4, height: 0.2, title: 'Loading…' }), 0, 19);
  const buttons = [
    { label: '← Back', yaw: -22, run: () => { try { frame.contentWindow.history.back(); } catch { /* cross-origin */ } } },
    { label: '↻ Redraw', yaw: 20, run: () => redraw(true) },
    { label: 'Exit', yaw: 32, accent: '#ff8f8f', run: exitSphere }
  ].map(b => {
    const panel = createPanel(THREE, { width: 0.66, height: 0.2, title: b.label, accent: b.accent });
    panel.userData.action = b.run;
    return floatOnSphere(panel, b.yaw, 19);
  });
  const notice = floatOnSphere(createPanel(THREE, { width: 1.7, height: 0.34, title: '' }), 0, 27);
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
      const shot = await rasterizeDocument(doc, { width: TILE_W, viewportHeight: TILE_H });
      const { shown, truncated } = screensFor(shot.height);
      ensureTiles(shown);
      for (const t of tiles) {
        t.ctx.fillStyle = shot.background;
        t.ctx.fillRect(0, 0, TILE_W, TILE_H);
        t.ctx.drawImage(shot.image, 0, t.plan.index * TILE_H, TILE_W, TILE_H, 0, 0, TILE_W, TILE_H);
        t.texture.needsUpdate = true;
      }
      scene.background = new THREE.Color(shot.background).multiplyScalar(0.55);
      truncatedNote = truncated ? `Showing the first ${shown} of ${Math.ceil(shot.height / TILE_H)} screens.` : '';
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
  // After a click the page may animate or fetch; redraw as it settles.
  function redrawSoon() {
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
      redrawSoon();
      return;
    }
    const base = { bubbles: true, cancelable: true, clientX: x, clientY: vy, view: win, button: 0 };
    const pointer = type => new win.PointerEvent(type, { ...base, pointerId: 1, pointerType: 'mouse', isPrimary: true });
    el.dispatchEvent(pointer('pointerdown'));
    el.dispatchEvent(new win.MouseEvent('mousedown', base));
    el.dispatchEvent(pointer('pointerup'));
    el.dispatchEvent(new win.MouseEvent('mouseup', base));
    el.dispatchEvent(new win.MouseEvent('click', base));
    redrawSoon();
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
    onSelect: hit => {
      if (hit.object.userData.action) { hit.object.userData.action(); return; }
      if (hit.uv && hit.object.userData.tile !== undefined) {
        const at = tileUvToPage(hit.object.userData.tile, hit.uv.x, hit.uv.y);
        replayClick(at.x, at.y);
      }
    }
  });
  // Hidden notice panels are not targets, so they cannot catch the laser.

  // Read-only hook for tests and debugging: what has been drawn so far.
  window.ClassroomOSPageSphere = {
    tileCount: () => tiles.length,
    tileImage: index => tiles[index] && tiles[index].canvas.toDataURL('image/png'),
    clickPage: (x, y) => replayClick(x, y) // what a laser hit does, given a page coordinate
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
    onStart: () => { recenter = 3; },
    onEnd: () => { sphere.position.set(0, eye, 0); sphere.rotation.y = 0; }
  });
  refreshBtn.addEventListener('click', () => redraw(true));

  renderer.setAnimationLoop(() => {
    if (!renderer.xr.isPresenting) syncSize();
    else if (recenter > 0 && --recenter === 0) centreOnViewer(); // wait for the first real head pose
    pointer.update();
    renderer.render(scene, camera);
  });
}
