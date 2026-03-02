/* block-pull.js
   Simple Jenga-like demo using Three.js
   - Click a block to 'pull' it out (animated removal)
   - No physics engine; removal is simulated via animation
*/
(function(){
  const container = document.getElementById('game-root');
  if (!container || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 6, 10);
  camera.lookAt(0,2,0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const ambient = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(5,10,7);
  scene.add(dir);

  const floorGeo = new THREE.PlaneGeometry(50,50);
  const floorMat = new THREE.MeshStandardMaterial({ color:0xf4f6f8, side:THREE.DoubleSide });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  scene.add(floor);

  // tower params
  const layers = 9;
  const blocksPerLayer = 3;
  // make blocks large rectangular (long axis x short axis)
  const blockLength = 20.0; // long side
  const blockWidth = 3.0;  // short side
  const blockHeight = 1.0;
  const gap = 0.05;

  const blocks = [];
  const removed = new Set();

  function buildTower(){
    // clear previous
    blocks.forEach(b=>{ if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh)});
    blocks.length = 0;
    removed.clear();

    const material = new THREE.MeshStandardMaterial({ color:0x8aaef9, roughness:0.4 });

    for(let i=0;i<layers;i++){
      const y = blockHeight/2 + i*(blockHeight + gap);
      const horizontal = (i % 2) === 0; // true=aligned on X axis
      for(let j=0;j<blocksPerLayer;j++){
        const geo = new THREE.BoxGeometry(horizontal ? blockLength : blockWidth, blockHeight, horizontal ? blockWidth : blockLength);
        const mesh = new THREE.Mesh(geo, material.clone());
        // place blocks side-by-side along the short side (perpendicular to the long axis)
        const offset = (j - 1) * (blockWidth + gap);
        if(horizontal){
          mesh.position.set(0, y, offset);
          mesh.rotation.y = 0;
        } else {
          mesh.position.set(offset, y, 0);
          mesh.rotation.y = Math.PI/2;
        }
        mesh.userData.layer = i;
        mesh.userData.index = j;
        mesh.userData.horizontal = horizontal;
        mesh.userData.removed = false;
        scene.add(mesh);
        blocks.push({mesh, removed:false});
      }
    }
  }

  buildTower();

  // adjust camera for large blocks/tower so the whole structure fits
  const towerHeight = layers * (blockHeight + gap);
  const towerCenterY = towerHeight / 2;
  const cameraRadius = 40;
  const cameraHeight = Math.max(12, towerCenterY + 6);
  camera.position.set(0, cameraHeight, cameraRadius);
  camera.lookAt(0, towerCenterY, 0);

  // raycaster for clicks
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function onPointer(e){
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = - ((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(pointer, camera);
    const intersects = ray.intersectObjects(blocks.map(b=>b.mesh));
    if(intersects.length>0){
      const hit = intersects[0].object;
      if(hit.userData.removed) return;
      removeBlock(hit);
    }
  }

  function removeBlock(mesh){
    mesh.userData.removed = true;
    // compute outward direction
    const dir = new THREE.Vector3();
    if(mesh.userData.horizontal){
      dir.set(Math.sign(mesh.position.x) || (Math.random()>.5?1:-1), 0, 0);
    } else {
      dir.set(0, 0, Math.sign(mesh.position.z) || (Math.random()>.5?1:-1));
    }
    // animate: translate + rotate + fade
    const startPos = mesh.position.clone();
    const startRot = mesh.rotation.clone();
    const duration = 700;
    const start = performance.now();

    const targetPos = startPos.clone().add(dir.multiplyScalar(6 + Math.random()*2)).add(new THREE.Vector3(0, -1.5, 0));
    const targetRot = new THREE.Euler(startRot.x + (Math.random()*1.2), startRot.y + (Math.random()*1.2), startRot.z + (Math.random()*1.2));

    function tick(now){
      const t = Math.min(1, (now - start)/duration);
      // ease out
      const e = 1 - Math.pow(1 - t, 3);
      mesh.position.lerpVectors(startPos, targetPos, e);
      mesh.rotation.x = startRot.x + (targetRot.x - startRot.x) * e;
      mesh.rotation.y = startRot.y + (targetRot.y - startRot.y) * e;
      mesh.rotation.z = startRot.z + (targetRot.z - startRot.z) * e;
      mesh.material.opacity = 1 - e;
      mesh.material.transparent = true;
      if(t < 1){
        requestAnimationFrame(tick);
      } else {
        // finalize
        scene.remove(mesh);
        const idx = blocks.findIndex(b=>b.mesh===mesh);
        if(idx>=0) blocks[idx].removed = true;
        updateHUD();
      }
    }
    requestAnimationFrame(tick);
  }

  function updateHUD(){
    const count = blocks.filter(b=>b.removed).length;
    const el = document.getElementById('removed-count');
    if(el) el.textContent = `Removed: ${count}`;
  }

  // reset button
  const resetBtn = document.getElementById('reset');
  if(resetBtn) resetBtn.addEventListener('click', ()=>{
    // remove existing meshes
    blocks.forEach(b=>{ if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh)});
    buildTower();
    updateHUD();
  });

  // help
  const helpBtn = document.getElementById('help');
  if(helpBtn) helpBtn.addEventListener('click', ()=> alert('Click any block to pull it out. No physics in this demo; blocks animate away.'));

  renderer.domElement.addEventListener('pointerdown', onPointer);

  // orbit-like simple auto-rotate camera around tower
  let angle = 0;
  function animate(){
    requestAnimationFrame(animate);
    angle += 0.002;
    camera.position.x = Math.cos(angle) * cameraRadius;
    camera.position.z = Math.sin(angle) * cameraRadius;
    camera.position.y = cameraHeight;
    camera.lookAt(0, towerCenterY, 0);
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

  window.addEventListener('pagehide', ()=>{
    ro.disconnect();
    renderer.dispose();
  });

})();
