// Thin Three.js scene helper for lesson sims. Pairs with assets/vendor/three-bundle.min.js
// (npm run build:three) so lessons stop hand-writing renderer/camera/resize boilerplate
// against whichever CDN Three.js version they happened to import.
//
// Usage (paths relative to a file in lessons/): import THREE + OrbitControls etc.
// from the vendor bundle, import createScene from this file, then call
// createScene(canvas, { THREE }) to get { renderer, scene, camera, syncSize }.
// See lessons/cad-camera-controls.html for a worked example.

export function createScene(canvas, opts) {
  const THREE = opts.THREE;
  const fov = opts.fov ?? 42;
  const near = opts.near ?? 0.1;
  const far = opts.far ?? 100;
  const maxDpr = opts.maxDpr ?? 2;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: opts.antialias !== false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  if (opts.clearColor !== undefined) renderer.setClearColor(opts.clearColor, opts.clearAlpha ?? 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);

  function syncSize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return false;
    const pixelRatio = renderer.getPixelRatio();
    const resized =
      canvas.width !== Math.round(width * pixelRatio) ||
      canvas.height !== Math.round(height * pixelRatio);
    if (resized) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    return resized;
  }

  function dispose() {
    renderer.dispose();
  }

  return { renderer, scene, camera, syncSize, dispose };
}
