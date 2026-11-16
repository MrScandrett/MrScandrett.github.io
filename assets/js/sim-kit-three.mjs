// Thin Three.js scene helper for lesson sims. Pairs with assets/vendor/three-bundle.min.js
// (npm run build:three) so lessons stop hand-writing renderer/camera/resize boilerplate
// against whichever CDN Three.js version they happened to import.
//
// Usage (paths relative to a file in lessons/): import THREE + OrbitControls etc.
// from the vendor bundle, import createScene from this file, then call
// createScene(canvas, { THREE }) to get { renderer, scene, camera, syncSize }.
// See lessons/3d-design/cad-and-printing/cad-camera-controls.html for a worked example.

export function createScene(canvas, opts) {
  const THREE = opts.THREE;
  const fov = opts.fov ?? 42;
  const near = opts.near ?? 0.1;
  const far = opts.far ?? 100;
  const boardMode = document.documentElement.hasAttribute('data-classroom-board');
  const maxDpr = opts.maxDpr ?? (boardMode ? 1 : 2);
  // Automatic backing-store budget; CSS layout and camera coordinates stay intact.
  // Pass maxPixels: 0 for workspaces that explicitly need full resolution.
  const maxPixels = opts.maxPixels ?? (boardMode ? 1280 * 720 : 1920 * 1080);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: opts.antialias ?? !boardMode, alpha: opts.alpha === true, logarithmicDepthBuffer: opts.logarithmicDepthBuffer === true, preserveDrawingBuffer: opts.preserveDrawingBuffer === true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  if (opts.clearColor !== undefined) renderer.setClearColor(opts.clearColor, opts.clearAlpha ?? 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);

  let layoutWidth = 0;
  let layoutHeight = 0;

  function syncSize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return false;
    let targetRatio = Math.min(window.devicePixelRatio || 1, maxDpr);
    if (maxPixels > 0) targetRatio = Math.min(targetRatio, Math.sqrt(maxPixels / (width * height)));
    const ratioChanged = renderer.getPixelRatio() !== targetRatio;
    if (ratioChanged) renderer.setPixelRatio(targetRatio);
    const layoutChanged = width !== layoutWidth || height !== layoutHeight;
    const resized = canvas.width !== Math.floor(width * targetRatio) ||
      canvas.height !== Math.floor(height * targetRatio);
    if (resized || layoutChanged) renderer.setSize(width, height, false);
    if (layoutChanged) {
      layoutWidth = width;
      layoutHeight = height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    return ratioChanged || resized || layoutChanged;
  }

  function dispose() {
    renderer.dispose();
  }

  return { renderer, scene, camera, syncSize, dispose };
}
