import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

function material(color, roughness = 0.9, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function layerMesh(name) {
  switch (name) {
    case "Bun":
      return new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.38, 40), material(0xc9954f, 0.85));
    case "Patty":
      return new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.2, 36), material(0x5a3c2a, 0.95));
    case "Cheese": {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.16, 0.08, 26), material(0xf7d55e, 0.65));
      m.rotation.y = Math.PI / 4;
      return m;
    }
    case "Lettuce":
      return new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.12, 24), material(0x3ea55a, 0.9));
    case "Ketchup":
      return new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.05, 20), material(0xd53f35, 0.65));
    case "Mustard":
      return new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.05, 20), material(0xe6b92d, 0.65));
    case "Mayo":
      return new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.05, 20), material(0xf2eddc, 0.7));
    case "BBQ":
      return new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.05, 20), material(0x5f3b1d, 0.75));
    default:
      return new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 24), material(0x999999));
  }
}

export function createBurgerScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x4a86ca);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 2.4, 5.5);
  camera.lookAt(0, 0.8, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.domElement.className = "burger-canvas";
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambient);

  const spot = new THREE.SpotLight(0xffffff, 1.45, 20, Math.PI / 7, 0.45, 1.2);
  spot.position.set(0, 6, 2.4);
  spot.target.position.set(0, 0.5, 0);
  spot.castShadow = true;
  scene.add(spot);
  scene.add(spot.target);

  const fill = new THREE.DirectionalLight(0xb6d5ff, 0.6);
  fill.position.set(-3, 2, 4);
  scene.add(fill);

  const counter = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.22, 48), material(0x8a8f98, 0.92));
  counter.position.set(0, -0.15, 0);
  counter.receiveShadow = true;
  scene.add(counter);

  const burgerGroup = new THREE.Group();
  scene.add(burgerGroup);

  function rebuild(stack) {
    while (burgerGroup.children.length) {
      const child = burgerGroup.children.pop();
      child.geometry.dispose();
      child.material.dispose();
    }

    let y = 0.1;

    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.35, 40), material(0xc28b43, 0.85));
    bottom.position.y = y;
    bottom.castShadow = true;
    bottom.receiveShadow = true;
    burgerGroup.add(bottom);
    y += 0.2;

    for (const name of stack) {
      const mesh = layerMesh(name);
      const thickness = mesh.geometry.parameters.height || 0.08;
      mesh.position.y = y + thickness / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.rotation.y += (Math.random() - 0.5) * 0.05;
      burgerGroup.add(mesh);
      y += thickness * 0.86;
    }

    if (stack.includes("Bun")) {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 0.4, 40), material(0xd19a54, 0.82));
      top.position.y = y + 0.22;
      top.castShadow = true;
      burgerGroup.add(top);
    }
  }

  function resize() {
    const w = container.clientWidth || 260;
    const h = container.clientHeight || 190;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function animate() {
    burgerGroup.rotation.y += 0.0025;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  resize();
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(resize);
    ro.observe(container);
  } else {
    window.addEventListener("resize", resize);
  }

  rebuild([]);
  animate();

  return { updateStack: rebuild };
}