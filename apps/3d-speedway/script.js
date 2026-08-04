window.onload = function() {
    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(10, 20, 10);
    scene.add(sun);

    // --- Environment: The Road ---
    const roadGeo = new THREE.PlaneGeometry(20, 1000);
    const roadMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    // Lane markings
    const lineGeo = new THREE.PlaneGeometry(0.5, 2);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 100; i++) {
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.01, i * 10 - 500);
        scene.add(line);
    }

    // --- The 3D Car ---
    function createCar() {
        const carGroup = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.6, 4),
            new THREE.MeshPhongMaterial({ color: 0xcc0000 })
        );
        body.position.y = 0.5;
        carGroup.add(body);

        const cabin = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.5, 1.8),
            new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })
        );
        cabin.position.set(0, 1.05, -0.2);
        carGroup.add(cabin);

        const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
        const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
        const wheelPositions = [[-1, 0.4, 1.2], [1, 0.4, 1.2], [-1, 0.4, -1.2], [1, 0.4, -1.2]];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            carGroup.add(wheel);
        });
        return carGroup;
    }

    const car = createCar();
    scene.add(car);

    // --- Controls & Physics ---
    const keys = {};
    window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    let speed = 0;

    function update() {
        if (keys['w'] || keys['arrowup']) speed += 0.01;
        if (keys['s'] || keys['arrowdown']) speed -= 0.01;
        speed *= 0.98; 
        car.translateZ(speed);

        if (Math.abs(speed) > 0.01) {
            if (keys['a'] || keys['arrowleft']) car.rotation.y += 0.03;
            if (keys['d'] || keys['arrowright']) car.rotation.y -= 0.03;
        }

        const relativeCameraOffset = new THREE.Vector3(0, 3, -8);
        const cameraOffset = relativeCameraOffset.applyMatrix4(car.matrixWorld);
        camera.position.lerp(cameraOffset, 0.1);
        camera.lookAt(car.position.x, car.position.y + 1, car.position.z);
    }

    function animate() {
        requestAnimationFrame(animate);
        update();
        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
};
