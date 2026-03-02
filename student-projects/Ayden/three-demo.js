/* three-demo.js
   Minimal Three.js demo: spinning cube appended into #three-root
*/
(function(){
  const container = document.getElementById('three-root');
  if (!container || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 3;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const geometry = new THREE.BoxGeometry(1,1,1);
  const material = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4, metalness: 0.1 });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
  scene.add(light);
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(3,4,2);
  scene.add(dir);

  let rafId;
  function animate(){
    rafId = requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.013;
    renderer.render(scene, camera);
  }
  animate();

  function onResize(){
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const ro = new ResizeObserver(onResize);
  ro.observe(container);

  // cleanup when page unloads
  window.addEventListener('pagehide', () => {
    ro.disconnect();
    cancelAnimationFrame(rafId);
    if (renderer && renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  });
})();
