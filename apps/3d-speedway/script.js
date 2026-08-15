window.addEventListener('load', () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9bc8df);
    scene.fog = new THREE.Fog(0x9bc8df, 75, 410);

    const camera = new THREE.PerspectiveCamera(67, innerWidth / innerHeight, 0.1, 650);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    document.body.prepend(renderer.domElement);

    // Warm sunlight and cool sky light give the low-poly scenery more depth.
    scene.add(new THREE.HemisphereLight(0xc9ecff, 0x496233, 1.25));
    const sun = new THREE.DirectionalLight(0xfff1d2, 2.2);
    sun.position.set(-45, 70, -30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -36;
    sun.shadow.camera.right = 36;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -18;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 180;
    scene.add(sun);
    scene.add(sun.target);

    const sunDisc = new THREE.Mesh(
        new THREE.SphereGeometry(7, 24, 12),
        new THREE.MeshBasicMaterial({ color: 0xffdf9c, fog: false })
    );
    sunDisc.position.set(-90, 64, 340);
    scene.add(sunDisc);

    // Shared assets keep endless chunk recycling inexpensive.
    const CHUNK_LENGTH = 100;
    const ROAD_WIDTH = 18;
    const KEEP_BEHIND = 2;
    const KEEP_AHEAD = 5;
    const chunks = new Map();

    const materials = {
        asphalt: new THREE.MeshStandardMaterial({ color: 0x272d32, roughness: 0.92 }),
        shoulder: new THREE.MeshStandardMaterial({ color: 0x73777a, roughness: 1 }),
        ground: new THREE.MeshStandardMaterial({ color: 0x567b3d, roughness: 1 }),
        grassDark: new THREE.MeshStandardMaterial({ color: 0x365e32, roughness: 1 }),
        white: new THREE.MeshStandardMaterial({ color: 0xf5f1dc, roughness: 0.7 }),
        yellow: new THREE.MeshStandardMaterial({ color: 0xffc629, roughness: 0.7 }),
        trunk: new THREE.MeshStandardMaterial({ color: 0x654631, roughness: 1 }),
        leaves: new THREE.MeshStandardMaterial({ color: 0x276343, roughness: 1, flatShading: true }),
        leavesLight: new THREE.MeshStandardMaterial({ color: 0x3f8050, roughness: 1, flatShading: true }),
        rock: new THREE.MeshStandardMaterial({ color: 0x75807b, roughness: 1, flatShading: true }),
        post: new THREE.MeshStandardMaterial({ color: 0xe5e8e5, roughness: 0.75 }),
        reflector: new THREE.MeshBasicMaterial({ color: 0xff684d })
    };

    const geometry = {
        road: new THREE.PlaneGeometry(ROAD_WIDTH, CHUNK_LENGTH),
        ground: new THREE.PlaneGeometry(120, CHUNK_LENGTH),
        shoulder: new THREE.PlaneGeometry(2.1, CHUNK_LENGTH),
        edge: new THREE.PlaneGeometry(0.16, CHUNK_LENGTH),
        dash: new THREE.PlaneGeometry(0.16, 4.2),
        trunk: new THREE.CylinderGeometry(0.18, 0.28, 2.2, 7),
        crown: new THREE.ConeGeometry(1.3, 3.6, 7),
        rock: new THREE.DodecahedronGeometry(1, 0),
        post: new THREE.BoxGeometry(0.12, 0.8, 0.12),
        reflector: new THREE.BoxGeometry(0.14, 0.13, 0.04)
    };

    function groundMesh(geo, mat, x, y, z) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, y, z);
        mesh.receiveShadow = true;
        return mesh;
    }

    function randomFor(seed) {
        let state = (seed * 1597334677) >>> 0;
        return () => {
            state += 0x6d2b79f5;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function createTree(scale, light) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(geometry.trunk, materials.trunk);
        trunk.position.y = 1.1;
        trunk.castShadow = true;
        const crown = new THREE.Mesh(geometry.crown, light ? materials.leavesLight : materials.leaves);
        crown.position.y = 3.15;
        crown.castShadow = true;
        tree.add(trunk, crown);
        tree.scale.setScalar(scale);
        return tree;
    }

    function createRoadChunk(index) {
        const chunk = new THREE.Group();
        chunk.position.z = index * CHUNK_LENGTH;
        chunk.userData.index = index;
        const rng = randomFor(index + 10000);

        chunk.add(groundMesh(geometry.ground, materials.ground, 0, -0.05, 0));
        chunk.add(groundMesh(geometry.road, materials.asphalt, 0, 0.015, 0));
        chunk.add(groundMesh(geometry.shoulder, materials.shoulder, -10.05, 0.005, 0));
        chunk.add(groundMesh(geometry.shoulder, materials.shoulder, 10.05, 0.005, 0));
        chunk.add(groundMesh(geometry.edge, materials.white, -8.25, 0.035, 0));
        chunk.add(groundMesh(geometry.edge, materials.white, 8.25, 0.035, 0));

        for (let z = -46; z < 50; z += 12) {
            chunk.add(groundMesh(geometry.dash, materials.white, -2.8, 0.045, z));
            chunk.add(groundMesh(geometry.dash, materials.white, 2.8, 0.045, z));
        }

        // Reflector posts make speed legible at night-like distances.
        for (let z = -44; z < 50; z += 16) {
            for (const side of [-1, 1]) {
                const post = new THREE.Mesh(geometry.post, materials.post);
                post.position.set(side * 11.45, 0.4, z);
                post.castShadow = true;
                const reflector = new THREE.Mesh(geometry.reflector, materials.reflector);
                reflector.position.set(side * 11.38, 0.62, z - 0.06);
                chunk.add(post, reflector);
            }
        }

        // Each chunk gets deterministic but varied roadside dressing.
        const sceneryCount = 14 + Math.floor(rng() * 8);
        for (let i = 0; i < sceneryCount; i++) {
            const side = rng() < 0.5 ? -1 : 1;
            const x = side * (14 + rng() * 39);
            const z = -49 + rng() * 98;
            if (rng() < 0.78) {
                const tree = createTree(0.7 + rng() * 1.25, rng() > 0.65);
                tree.position.set(x, 0, z);
                tree.rotation.y = rng() * Math.PI;
                chunk.add(tree);
            } else {
                const rock = new THREE.Mesh(geometry.rock, materials.rock);
                const scale = 0.45 + rng() * 1.3;
                rock.scale.set(scale, scale * (0.6 + rng() * 0.5), scale);
                rock.position.set(x, scale * 0.45, z);
                rock.rotation.set(rng(), rng() * Math.PI, rng());
                rock.castShadow = true;
                chunk.add(rock);
            }
        }

        scene.add(chunk);
        chunks.set(index, chunk);
    }

    function updateRoadChunks(z) {
        const center = Math.floor((z + CHUNK_LENGTH / 2) / CHUNK_LENGTH);
        for (let i = center - KEEP_BEHIND; i <= center + KEEP_AHEAD; i++) {
            if (!chunks.has(i)) createRoadChunk(i);
        }
        chunks.forEach((chunk, index) => {
            if (index < center - KEEP_BEHIND || index > center + KEEP_AHEAD) {
                scene.remove(chunk);
                chunks.delete(index);
            }
        });
    }

    function createCar() {
        const car = new THREE.Group();
        const red = new THREE.MeshStandardMaterial({ color: 0xe42330, metalness: 0.35, roughness: 0.3 });
        const darkRed = new THREE.MeshStandardMaterial({ color: 0x8c1019, metalness: 0.25, roughness: 0.38 });
        const glass = new THREE.MeshStandardMaterial({ color: 0x8ad4ef, metalness: 0.35, roughness: 0.12 });
        const black = new THREE.MeshStandardMaterial({ color: 0x090b0d, roughness: 0.7 });
        const chrome = new THREE.MeshStandardMaterial({ color: 0xd7e4ea, metalness: 0.9, roughness: 0.18 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 4.05), red);
        body.position.y = 0.65;
        body.castShadow = true;
        car.add(body);

        const hood = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.2, 1.25), darkRed);
        hood.position.set(0, 0.98, 1.18);
        hood.castShadow = true;
        car.add(hood);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.68, 1.75), glass);
        cabin.position.set(0, 1.18, -0.25);
        cabin.castShadow = true;
        car.add(cabin);

        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.12, 0.42), darkRed);
        spoiler.position.set(0, 1.03, -1.72);
        spoiler.castShadow = true;
        car.add(spoiler);
        const spoilerLegs = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.32, 0.1), darkRed);
        spoilerLegs.position.set(0, 0.87, -1.72);
        car.add(spoilerLegs);

        const wheelGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.38, 18);
        const wheels = [];
        [[-1.03, 1.25], [1.03, 1.25], [-1.03, -1.25], [1.03, -1.25]].forEach(([x, z]) => {
            const wheel = new THREE.Mesh(wheelGeo, black);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(x, 0.48, z);
            wheel.castShadow = true;
            car.add(wheel);
            wheels.push(wheel);
        });

        for (const x of [-0.62, 0.62]) {
            const light = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.06), chrome);
            light.position.set(x, 0.74, 2.055);
            car.add(light);
        }

        car.userData.wheels = wheels;
        return car;
    }

    const car = createCar();
    car.position.y = 0.02;
    scene.add(car);
    updateRoadChunks(0);

    const keys = Object.create(null);
    let speed = 0;
    let distance = 0;
    let started = false;
    let previousTime = performance.now();
    const speedNode = document.querySelector('#speed');
    const distanceNode = document.querySelector('#distance');
    const startCard = document.querySelector('#start-card');

    function setKey(event, down) {
        const key = event.key.toLowerCase();
        keys[key] = down;
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    }
    addEventListener('keydown', event => setKey(event, true), { passive: false });
    addEventListener('keyup', event => setKey(event, false), { passive: false });
    addEventListener('blur', () => Object.keys(keys).forEach(key => { keys[key] = false; }));

    function startGame() {
        started = true;
        startCard.classList.add('hidden');
    }
    document.querySelector('#start-button').addEventListener('click', startGame);
    addEventListener('keydown', event => {
        if (!started && ['w', 'arrowup', 'enter', ' '].includes(event.key.toLowerCase())) startGame();
    });

    function update(delta) {
        const accelerate = keys.w || keys.arrowup;
        const braking = keys.s || keys.arrowdown;
        const steer = (keys.a || keys.arrowleft ? -1 : 0) + (keys.d || keys.arrowright ? 1 : 0);

        if (started && accelerate) speed += 24 * delta;
        else speed -= 5.2 * delta;
        if (braking) speed -= 34 * delta;
        speed = THREE.MathUtils.clamp(speed, 0, 46);

        const speedRatio = speed / 46;
        car.position.z += speed * delta;
        car.position.x += steer * (4.2 + speed * 0.1) * delta;
        car.position.x = THREE.MathUtils.clamp(car.position.x, -14.5, 14.5);
        car.rotation.z = THREE.MathUtils.lerp(car.rotation.z, -steer * 0.1 * speedRatio, 7 * delta);
        car.rotation.y = THREE.MathUtils.lerp(car.rotation.y, steer * 0.055 * speedRatio, 7 * delta);
        car.position.y = 0.02 + Math.sin(performance.now() * 0.012) * 0.012 * speedRatio;
        car.userData.wheels.forEach(wheel => { wheel.rotation.x += speed * delta * 2.4; });

        distance += speed * delta;
        speedNode.textContent = Math.round(speed * 3.2);
        distanceNode.textContent = (distance / 1609).toFixed(1);

        updateRoadChunks(car.position.z);
        sun.position.z = car.position.z - 35;
        sun.target.position.set(car.position.x, 0, car.position.z + 25);
        sunDisc.position.z = car.position.z + 340;

        const desiredCamera = new THREE.Vector3(
            car.position.x * 0.72,
            4.2 + speedRatio * 0.5,
            car.position.z - 9.4 - speedRatio * 1.2
        );
        camera.position.lerp(desiredCamera, 1 - Math.pow(0.001, delta));
        const lookTarget = new THREE.Vector3(car.position.x * 0.9, 1.0, car.position.z + 9 + speedRatio * 8);
        camera.lookAt(lookTarget);
        camera.fov = THREE.MathUtils.lerp(camera.fov, 67 + speedRatio * 7, 3 * delta);
        camera.updateProjectionMatrix();
    }

    function animate(now) {
        requestAnimationFrame(animate);
        const delta = Math.min((now - previousTime) / 1000, 0.05);
        previousTime = now;
        update(delta);
        renderer.render(scene, camera);
    }

    addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setSize(innerWidth, innerHeight);
    });

    camera.position.set(0, 4.5, -10);
    animate(performance.now());
});
