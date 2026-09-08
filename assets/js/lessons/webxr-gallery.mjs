import { THREE } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

const canvas = document.getElementById('gallery-canvas');
const status = document.getElementById('gallery-status');
const enter = document.getElementById('gallery-enter');
const exit = document.getElementById('gallery-exit');
let session = null;

async function boot() {
  let view;
  try { view = createScene(canvas, { THREE, clearColor: 0x132237 }); }
  catch { status.textContent = '3D graphics are unavailable. Use the exhibit list below; all project information remains accessible.'; return; }
  const { renderer, scene, camera, syncSize } = view;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local');
  camera.position.set(0, 1.6, 3);
  const exhibits = [
    { title: 'Orbit study', color: 0x72dbba, x: -1.6 },
    { title: 'Geometry game', color: 0xf5b86e, x: 0 },
    { title: 'Light experiment', color: 0xc9a7ff, x: 1.6 }
  ];
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ color: 0x243952, side: THREE.DoubleSide }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  exhibits.forEach((exhibit, i) => {
    const geometry = i === 0 ? new THREE.SphereGeometry(0.32, 20, 12) : i === 1 ? new THREE.BoxGeometry(0.55, 0.55, 0.55) : new THREE.TorusGeometry(0.3, 0.09, 10, 24);
    const object = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial());
    object.position.set(exhibit.x, 1.6, -1.5); scene.add(object);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.8, 0.08), new THREE.MeshBasicMaterial({ color: exhibit.color }));
    panel.position.set(exhibit.x, 1.6, -2); scene.add(panel);
  });
  let angle = 0;
  const look = () => camera.lookAt(Math.sin(angle) * 3, 1.6, -1.5);
  document.querySelectorAll('[data-gallery-look]').forEach(button => button.addEventListener('click', () => {
    angle = Math.max(-0.65, Math.min(0.65, angle + Number(button.dataset.galleryLook))); look();
  }));
  document.getElementById('gallery-center').addEventListener('click', () => { angle = 0; look(); });
  look();
  renderer.setAnimationLoop(() => {
    if (!renderer.xr.isPresenting) syncSize();
    renderer.render(scene, camera);
  });
  const reset = () => {
    session = null; enter.disabled = false; exit.disabled = true;
    status.textContent = 'VR ended. Desktop gallery is available.';
    camera.position.set(0, 1.6, 3); look();
  };
  enter.addEventListener('click', async () => {
    enter.disabled = true;
    try {
      session = await navigator.xr.requestSession('immersive-vr');
      session.addEventListener('end', reset, { once: true });
      await renderer.xr.setSession(session);
      exit.disabled = false;
      status.textContent = 'VR session active. Use your headset system controls to exit, or the Exit VR button on this page.';
    } catch (error) {
      if (session) await session.end().catch(() => {});
      session = null; enter.disabled = false; exit.disabled = true;
      status.textContent = `Could not enter VR (${error.name}). Desktop gallery still works. Check browser permission and headset connection.`;
    }
  });
  exit.addEventListener('click', async () => {
    if (!session) return;
    try { await session.end(); }
    catch { status.textContent = 'Exit request failed. Use the headset system menu to leave VR.'; }
  });
  if (!window.isSecureContext) { status.textContent = 'Desktop mode. WebXR needs HTTPS or localhost; opening a LAN HTTP address is not enough.'; return; }
  if (!navigator.xr) { status.textContent = 'Desktop mode. This browser does not expose WebXR; use the exhibit list and view buttons.'; return; }
  try {
    const supported = await navigator.xr.isSessionSupported('immersive-vr');
    enter.disabled = !supported;
    status.textContent = supported ? 'VR is supported. Enter VR when your headset is ready; desktop mode also works.' : 'Desktop mode. An immersive VR session is unavailable on this device/browser.';
  } catch { status.textContent = 'Desktop mode. Browser policy prevented the VR capability check.'; }
}
boot();
