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
    renderer.toneMappingExposure = 0.85;
    document.body.prepend(renderer.domElement);

    // Warm sunlight and cool sky light give the low-poly scenery more depth.
    scene.add(new THREE.HemisphereLight(0xc9ecff, 0x496233, 0.8));
    const sun = new THREE.DirectionalLight(0xfff1d2, 1.35);
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

    const mountains = new THREE.Group();
    const mountainGeometry = new THREE.ConeGeometry(1, 1, 5);
    const mountainMaterial = new THREE.MeshStandardMaterial({ color: 0x78969a, roughness: 1, flatShading: true });
    const mountainRandom = randomFor(42);
    for (let i = 0; i < 20; i++) {
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        const height = 26 + mountainRandom() * 52;
        mountain.scale.set(35 + mountainRandom() * 35, height, 28);
        mountain.position.set((i - 9.5) * 37, height / 2 - 4, 330 + mountainRandom() * 65);
        mountain.rotation.y = mountainRandom() * Math.PI;
        mountains.add(mountain);
    }
    scene.add(mountains);

    // Shared assets keep endless chunk recycling inexpensive.
    const CHUNK_LENGTH = 100;
    const ROAD_WIDTH = 18;
    const KEEP_BEHIND = 2;
    const KEEP_AHEAD = 5;
    const chunks = new Map();

    // Small, seeded canvas textures stay local and repeat without loading assets.
    function surfaceTexture(kind) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const rng = randomFor(kind === 'grass' ? 71 : kind === 'bark' ? 83 : 97);
        ctx.fillStyle = kind === 'grass' ? '#809060' : kind === 'bark' ? '#8b7961' : '#879e70';
        ctx.fillRect(0, 0, 256, 256);
        if (kind === 'grass') {
            for (let i = 0; i < 6000; i++) {
                const x = rng() * 256, y = rng() * 256;
                ctx.strokeStyle = ['#65794f', '#a2ab77', '#839758', '#b4b68b'][i % 4];
                ctx.globalAlpha = .25 + rng() * .35;
                ctx.lineWidth = .5 + rng();
                ctx.beginPath(); ctx.moveTo(x, y);
                ctx.lineTo(x + rng() * 4 - 2, y - 2 - rng() * 5); ctx.stroke();
            }
        } else if (kind === 'bark') {
            for (let i = 0; i < 300; i++) {
                const x = rng() * 256, y = rng() * 256;
                ctx.strokeStyle = i % 3 ? '#514536' : '#b0a087';
                ctx.globalAlpha = .35 + rng() * .3;
                ctx.lineWidth = 1 + rng() * 3;
                ctx.beginPath(); ctx.moveTo(x, y);
                ctx.bezierCurveTo(x - 4, y + 8, x + 4, y + 20, x + rng() * 5, y + 30 + rng() * 50);
                ctx.stroke();
            }
        } else {
            for (let i = 0; i < 1900; i++) {
                const x = rng() * 256, y = rng() * 256;
                ctx.fillStyle = ['#3d5739', '#617b4c', '#a2b484', '#c0c99a', '#7a9760'][i % 5];
                ctx.globalAlpha = .45 + rng() * .4;
                ctx.beginPath();
                ctx.ellipse(x, y, 2 + rng() * 5, 1 + rng() * 2, rng() * Math.PI, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.encoding = THREE.sRGBEncoding;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        return texture;
    }
    const grassTexture = surfaceTexture('grass');
    grassTexture.repeat.set(18, 15);
    const meadowTexture = grassTexture.clone();
    meadowTexture.repeat.set(1.4, 1.4);
    meadowTexture.needsUpdate = true;
    const barkTexture = surfaceTexture('bark');
    barkTexture.repeat.set(2, 1);
    const leafTexture = surfaceTexture('leaves');
    leafTexture.repeat.set(3, 2);

    function grassGeometry() {
        const positions = [];
        const rng = randomFor(123);
        // Five narrow, bent blades replace the solid triangular cones.
        for (let blade = 0; blade < 5; blade++) {
            const angle = rng() * Math.PI * 2;
            const x = (rng() - .5) * .28, z = (rng() - .5) * .28;
            const height = .4 + rng() * .45;
            const width = .025 + rng() * .025;
            const bend = .08 + rng() * .16;
            const point = (level, side) => {
                const along = bend * level * level;
                const across = width * (1 - level) * side;
                return [x + Math.cos(angle) * along - Math.sin(angle) * across,
                    height * level, z + Math.sin(angle) * along + Math.cos(angle) * across];
            };
            for (let segment = 0; segment < 3; segment++) {
                const a = segment / 3, b = (segment + 1) / 3;
                positions.push(...point(a, -1), ...point(a, 1), ...point(b, 1),
                    ...point(a, -1), ...point(b, 1), ...point(b, -1));
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.computeVertexNormals();
        return geo;
    }

    const materials = {
        asphalt: new THREE.MeshStandardMaterial({ color: 0x272d32, roughness: 0.92 }),
        shoulder: new THREE.MeshStandardMaterial({ color: 0x73777a, roughness: 1 }),
        ground: new THREE.MeshStandardMaterial({ color: 0x729653, map: grassTexture, roughness: 1 }),
        grassDark: new THREE.MeshStandardMaterial({ color: 0x567543, map: meadowTexture, roughness: 1 }),
        white: new THREE.MeshStandardMaterial({ color: 0xf5f1dc, roughness: 0.7 }),
        yellow: new THREE.MeshStandardMaterial({ color: 0xffc629, roughness: 0.7 }),
        trunk: new THREE.MeshStandardMaterial({ color: 0x987951, map: barkTexture, bumpMap: barkTexture, bumpScale: .07, roughness: 1 }),
        leaves: new THREE.MeshStandardMaterial({ color: 0x47834c, map: leafTexture, bumpMap: leafTexture, bumpScale: .12, roughness: 1 }),
        leavesLight: new THREE.MeshStandardMaterial({ color: 0x6c9a53, map: leafTexture, bumpMap: leafTexture, bumpScale: .12, roughness: 1 }),
        meadow: new THREE.MeshStandardMaterial({ color: 0x8b9f60, map: meadowTexture, roughness: 1 }),
        grass: new THREE.MeshStandardMaterial({ color: 0x52802e, roughness: 1, side: THREE.DoubleSide }),
        shrub: new THREE.MeshStandardMaterial({ color: 0x5a884b, map: leafTexture, bumpMap: leafTexture, bumpScale: .08, roughness: 1 }),
        flowers: new THREE.MeshStandardMaterial({ color: 0xe9d490, roughness: 1 }),
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
        crown: new THREE.ConeGeometry(1.5, 2.8, 7),
        broadleaf: new THREE.IcosahedronGeometry(1, 2),
        patch: new THREE.CircleGeometry(1, 9),
        grass: grassGeometry(),
        flower: new THREE.IcosahedronGeometry(0.11, 0),
        rock: new THREE.DodecahedronGeometry(1, 0),
        post: new THREE.BoxGeometry(0.12, 0.8, 0.12),
        reflector: new THREE.BoxGeometry(0.14, 0.13, 0.04)
    };

    // Irregular lobes break up the spherical canopy outline while sharing one mesh.
    const canopyPositions = geometry.broadleaf.attributes.position;
    for (let i = 0; i < canopyPositions.count; i++) {
        const x = canopyPositions.getX(i), y = canopyPositions.getY(i), z = canopyPositions.getZ(i);
        const radius = 1 + .10 * Math.sin(x * 11 + z * 7) * Math.cos(y * 9 - z * 5);
        canopyPositions.setXYZ(i, x * radius, y * radius, z * radius);
    }
    canopyPositions.needsUpdate = true;
    geometry.broadleaf.computeVertexNormals();

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

    // Batch each foliage shape into a single draw call per chunk.
    // Geometry and materials are shared; only placement buffers belong to chunks.
    function addFoliage(chunk, rng) {
        const batches = new Map();
        const transform = new THREE.Object3D();
        function place(shape, material, x, y, z, sx, sy, sz, rotation = 0, flat = false) {
            const key = `${shape}:${material}`;
            if (!batches.has(key)) batches.set(key, { shape, material, matrices: [] });
            transform.position.set(x, y, z);
            transform.rotation.set(flat ? -Math.PI / 2 : 0, flat ? 0 : rotation, flat ? rotation : 0);
            transform.scale.set(sx, sy, sz);
            transform.updateMatrix();
            batches.get(key).matrices.push(transform.matrix.clone());
        }
        for (const side of [-1, 1]) {
            // Broad, irregular meadow patches soften the flat ground without road overlap.
            for (let i = 0; i < 24; i++) {
                const x = side * (17 + rng() * 36);
                const z = -44 + rng() * 88;
                place('patch', i % 3 ? 'meadow' : 'grassDark', x, -.035 + (i % 3) * .001, z,
                    2 + rng() * 3, 2 + rng() * 4, 1, rng() * 6, true);
            }
            // Keep the shoulder readable, with longer grass just beyond the reflectors.
            for (let i = 0; i < 420; i++) {
                const x = side * (12.4 + rng() * 28);
                const z = -49 + rng() * 98;
                const height = .35 + rng() * .7;
                place('grass', 'grass', x, 0, z, .8 + rng(), height, .8 + rng(), rng() * 6);
                if (i % 12 === 0) {
                    place('flower', 'flowers', x, height * .8, z, 1, .6, 1);
                }
            }
            // A mix of layered pines and rounded deciduous trees, in loose groves.
            for (let i = 0; i < 24; i++) {
                const x = side * (17 + rng() * 38);
                const z = -48 + rng() * 96;
                const scale = .8 + rng() * 1.3;
                const rotation = rng() * Math.PI * 2;
                const leaf = rng() > .55 ? 'leavesLight' : 'leaves';
                place('trunk', 'trunk', x, 1.3 * scale, z, scale, 1.2 * scale, scale, rotation);
                if (rng() < .55) {
                    for (let tier = 0; tier < 3; tier++) {
                        const width = scale * (1.15 - tier * .24);
                        place('crown', tier === 2 ? 'leavesLight' : leaf, x, (2.5 + tier * 1.05) * scale, z,
                            width, scale * .85, width, rotation);
                    }
                } else {
                    place('broadleaf', leaf, x, 3.7 * scale, z, 1.9 * scale, 1.8 * scale, 1.7 * scale, rotation);
                    place('broadleaf', 'leavesLight', x + .9 * scale, 3.4 * scale, z + .4 * scale,
                        1.3 * scale, 1.25 * scale, 1.4 * scale, rotation);
                }
            }
            for (let i = 0; i < 30; i++) {
                const x = side * (13.3 + rng() * 36);
                const z = -48 + rng() * 96;
                const size = .4 + rng() * .9;
                place('broadleaf', 'shrub', x, size * .5, z, size * 1.2, size * .75, size, rng() * 6);
            }
        }
        for (const { shape, material, matrices } of batches.values()) {
            const mesh = new THREE.InstancedMesh(geometry[shape], materials[material], matrices.length);
            matrices.forEach((matrix, index) => {
                mesh.setMatrixAt(index, matrix);
                if (['grass', 'crown', 'broadleaf'].includes(shape)) {
                    const tint = new THREE.Color().setHSL(.25 + rng() * .06, .12 + rng() * .12, .72 + rng() * .23);
                    mesh.setColorAt(index, tint);
                }
            });
            mesh.instanceMatrix.needsUpdate = true;
            mesh.castShadow = ['trunk', 'crown', 'broadleaf'].includes(shape);
            mesh.receiveShadow = true;
            // r128 culls against the base geometry, not the distributed instances.
            mesh.frustumCulled = false;
            chunk.add(mesh);
        }
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

        addFoliage(chunk, rng);
        for (let i = 0; i < 8; i++) {
            const rock = new THREE.Mesh(geometry.rock, materials.rock);
            const size = .4 + rng() * 1.2;
            rock.scale.set(size, size * .65, size);
            rock.position.set((rng() < .5 ? -1 : 1) * (14 + rng() * 40), size * .35, -48 + rng() * 96);
            rock.rotation.set(rng(), rng() * Math.PI, rng());
            rock.castShadow = true;
            chunk.add(rock);
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
                chunk.traverse(mesh => { if (mesh.isInstancedMesh) mesh.dispose(); });
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

        const tailMaterial = new THREE.MeshStandardMaterial({ color: 0xff3328, emissive: 0xff2010, emissiveIntensity: .7 });
        for (const x of [-.64, .64]) {
            const tail = new THREE.Mesh(new THREE.BoxGeometry(.45, .15, .07), tailMaterial);
            tail.position.set(x, .74, -2.06);
            car.add(tail);
        }
        const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.75, .16, .12), black);
        bumper.position.set(0, .44, -2.08);
        car.add(bumper);
        car.userData.tailMaterial = tailMaterial;
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
    let paused = false;
    let previousTime = performance.now();
    const speedNode = document.querySelector('#speed');
    const distanceNode = document.querySelector('#distance');
    const startCard = document.querySelector('#start-card');
    const pauseButton = document.querySelector('#pause-button');
    const statusNode = document.querySelector('#status-text');
    const startTitle = startCard.querySelector('h2');
    const startDescription = startCard.querySelector('p');
    const startButton = document.querySelector('#start-button');
    const startHint = startCard.querySelector('.start-hint');
    if (matchMedia('(pointer: coarse)').matches) startHint.textContent = 'TAP START, THEN HOLD GAS TO ACCELERATE';
    const clearKeys = () => {
        Object.keys(keys).forEach(key => { keys[key] = false; });
        document.querySelectorAll('[data-key]').forEach(button => button.classList.remove('pressed'));
    };
    function pauseGame() {
        if (!started || paused) return;
        paused = true;
        clearKeys();
        startTitle.innerHTML = 'TAKE A<br><em>BREATHER.</em>';
        startDescription.textContent = 'Your highway will be right here.';
        startHint.textContent = matchMedia('(pointer: coarse)').matches ? 'TAP RESUME TO CONTINUE' : 'PRESS P OR ESC TO RESUME';
        startButton.innerHTML = 'RESUME DRIVE <span aria-hidden="true">↗</span>';
        startCard.classList.remove('hidden');
        pauseButton.hidden = true;
        document.body.classList.remove('driving');
        statusNode.textContent = 'DRIVE PAUSED';
        startButton.focus();
    }
    pauseButton.addEventListener('click', pauseGame);
    document.querySelectorAll('[data-key]').forEach(button => {
        button.addEventListener('pointerdown', event => {
            event.preventDefault();
            button.setPointerCapture(event.pointerId);
            if (!started || paused) return;
            keys[button.dataset.key] = true;
            button.classList.add('pressed');
        });
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
            button.addEventListener(type, () => {
                keys[button.dataset.key] = false;
                button.classList.remove('pressed');
            });
        }
    });

    function setKey(event, down) {
        const key = event.key.toLowerCase();
        keys[key] = down;
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
    }
    addEventListener('keydown', event => setKey(event, true), { passive: false });
    addEventListener('keyup', event => setKey(event, false), { passive: false });
    addEventListener('blur', () => { clearKeys(); pauseGame(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

    function startGame() {
        started = true;
        paused = false;
        startCard.classList.add('hidden');
        document.body.classList.add('driving');
        pauseButton.hidden = false;
        pauseButton.focus();
    }
    document.querySelector('#start-button').addEventListener('click', startGame);
    addEventListener('keydown', event => {
        if (event.repeat) return;
        const key = event.key.toLowerCase();
        if ((key === 'p' || key === 'escape') && started) {
            if (paused) startGame(); else pauseGame();
        } else if ((!started || paused) && ['w', 'arrowup'].includes(key)) startGame();
    });

    function update(delta) {
        if (paused) return;
        const accelerate = keys.w || keys.arrowup;
        const braking = keys.s || keys.arrowdown;
        const steer = !started ? 0 : (keys.a || keys.arrowleft ? -1 : 0) + (keys.d || keys.arrowright ? 1 : 0);

        if (started && accelerate) speed += 24 * delta;
        else speed -= 5.2 * delta;
        if (braking) speed -= 34 * delta;
        speed = THREE.MathUtils.clamp(speed, 0, 46);

        car.userData.tailMaterial.emissiveIntensity = braking ? 3 : .7;
        const speedRatio = speed / 46;
        car.position.z += speed * delta;
        car.position.x += steer * (4.2 + speed * 0.1) * delta;
        car.position.x = THREE.MathUtils.clamp(car.position.x, -14.5, 14.5);
        car.rotation.z = THREE.MathUtils.lerp(car.rotation.z, -steer * 0.1 * speedRatio, 7 * delta);
        car.rotation.y = THREE.MathUtils.lerp(car.rotation.y, steer * 0.055 * speedRatio, 7 * delta);
        car.position.y = 0.02 + Math.sin(performance.now() * 0.012) * 0.012 * speedRatio;
        car.userData.wheels.forEach(wheel => { wheel.rotation.x += speed * delta * 2.4; });

        distance += speed * delta;
        speedNode.textContent = Math.round(speed * 2.23694);
        distanceNode.textContent = (distance / 1609).toFixed(1);

        statusNode.textContent = !started ? 'READY WHEN YOU ARE' : Math.abs(car.position.x) > 9 ? 'ON THE SHOULDER' : braking && speed > 0 ? 'BRAKING' : speed > 1 ? 'ENJOY THE DRIVE' : 'HOLD W OR ↑ TO ACCELERATE';
        if (Math.abs(car.position.x) > 9) speed = Math.max(0, speed - 12 * delta);
        updateRoadChunks(car.position.z);
        sun.position.z = car.position.z - 35;
        sun.target.position.set(car.position.x, 0, car.position.z + 25);
        sunDisc.position.z = car.position.z + 340;
        mountains.position.z = car.position.z;

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
        const delta = Math.max(0, Math.min((now - previousTime) / 1000, 0.05));
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
