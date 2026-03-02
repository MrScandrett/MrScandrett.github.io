const game = {
    wood: 0,
    quartz: 0,
    hasHorse: false,
    horseName: null,
    houseBuilt: false,
    stableBuilt: false,
    saddle: false,
    bridle: false,
    isInventoryOpen: false,
    
    // Day/Night Cycle
    cycleTime: 0,
    dayDuration: 60, // Seconds for a full day
    sun: null, moon: null, light: null,
    
    // Weather
    rainSystem: null,

    // 3D Engine Variables
    camera: null, scene: null, renderer: null, controls: null,
    raycaster: null, moveForward: false, moveBackward: false,
    moveLeft: false, moveRight: false, velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(), prevTime: performance.now(),
    objects: [], // Interactable objects
    mobs: [], // Array of { mesh, timer, direction }
    tamedHorseMesh: null,

    log: function(msg) {
        const logEl = document.getElementById('log');
        logEl.innerHTML += `<div>> ${msg}</div>`;
        logEl.scrollTop = logEl.scrollHeight;
    },

    updateUI: function() {
        document.getElementById('wood').innerText = this.wood;
        document.getElementById('quartz').innerText = this.quartz;
        document.getElementById('horse').innerText = this.horseName ? `${this.horseName}` : (this.hasHorse ? "Wild Horse" : "None");
        
        // Update Horse Image
        if (this.hasHorse) {
            document.getElementById('horse-img').src = "https://placehold.co/64x64/8b4513/ffffff?text=Horse";
        }

        document.getElementById('house-status').innerText = this.houseBuilt ? "Yes" : "No";
        document.getElementById('stable-status').innerText = this.stableBuilt ? "Yes" : "No";
        
        let gearList = [];
        if(this.saddle) gearList.push("Saddle");
        if(this.bridle) gearList.push("Bridle");
        document.getElementById('gear').innerText = gearList.length > 0 ? gearList.join(", ") : "None";

        // Build House Button
        const houseBtn = document.getElementById('btn-house');
        if (this.wood >= 20 && !this.houseBuilt) {
            houseBtn.disabled = false;
        } else {
            houseBtn.disabled = true;
        }

        // Build Stable Button
        const stableBtn = document.getElementById('btn-stable');
        if (this.wood >= 10 && this.quartz >= 5 && !this.stableBuilt) {
            stableBtn.disabled = false;
        } else {
            stableBtn.disabled = true;
        }

        // Ride Button
        const rideBtn = document.getElementById('btn-ride');
        if (this.stableBuilt && this.horseName && this.saddle && this.bridle) {
            rideBtn.disabled = false;
        } else {
            rideBtn.disabled = true;
        }
    },

    // Called when clicking the horse in 3D
    foundHorse: function(mesh) {
        this.hasHorse = true;
        this.tamedHorseMesh = mesh;
        this.log("You found a horse! Give it a name.");
        document.getElementById('name-area').classList.remove('hidden');
        document.exitPointerLock(); // Unlock mouse to type name
    },

    nameHorse: function() {
        const name = document.getElementById('horse-name-input').value;
        if (!name) return;
        this.horseName = name;
        this.log(`You named your horse ${name}.`);
        document.getElementById('name-area').classList.add('hidden');
        this.updateUI();
        game.controls.lock(); // Lock mouse again
    },

    gatherWood: function() {
        this.wood++;
        this.log("You chopped some wood.");
        this.updateUI();
    },

    gatherQuartz: function() {
        this.quartz++;
        this.log("You mined a Quartz block.");
        this.updateUI();
    },

    buildHouse: function() {
        this.wood -= 20;
        this.houseBuilt = true;
        this.log("You built a House!");

        const houseGroup = new THREE.Group();
        
        // Materials
        const wallMat = new THREE.MeshLambertMaterial({ color: 0x808080 }); // Stone
        const woodMat = new THREE.MeshLambertMaterial({ color: 0x5c3a21 }); // Wood
        const floorMat = new THREE.MeshLambertMaterial({ color: 0x5c3a21 }); // Wood Floor
        const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a3c31 }); // Darker Wood Roof

        // Floor
        const floor = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 60), floorMat);
        floor.position.y = 0.5;
        houseGroup.add(floor);

        // Ceiling/Roof
        const roof = new THREE.Mesh(new THREE.BoxGeometry(64, 2, 64), roofMat);
        roof.position.y = 41;
        houseGroup.add(roof);

        // Back Wall
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(60, 40, 2), wallMat);
        backWall.position.set(0, 20, -29);
        houseGroup.add(backWall);

        // Left Wall (with window)
        const leftWallBottom = new THREE.Mesh(new THREE.BoxGeometry(2, 12, 60), wallMat);
        leftWallBottom.position.set(-29, 6, 0);
        houseGroup.add(leftWallBottom);
        
        const leftWallTop = new THREE.Mesh(new THREE.BoxGeometry(2, 12, 60), wallMat);
        leftWallTop.position.set(-29, 34, 0);
        houseGroup.add(leftWallTop);
        
        const leftWallP1 = new THREE.Mesh(new THREE.BoxGeometry(2, 16, 20), wallMat);
        leftWallP1.position.set(-29, 20, -20);
        houseGroup.add(leftWallP1);
        
        const leftWallP2 = new THREE.Mesh(new THREE.BoxGeometry(2, 16, 20), wallMat);
        leftWallP2.position.set(-29, 20, 20);
        houseGroup.add(leftWallP2);

        // Right Wall
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(2, 40, 60), wallMat);
        rightWall.position.set(29, 20, 0);
        houseGroup.add(rightWall);

        // Front Wall (with Door gap)
        const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(25, 40, 2), wallMat);
        frontLeft.position.set(-17.5, 20, 29);
        houseGroup.add(frontLeft);
        
        const frontRight = new THREE.Mesh(new THREE.BoxGeometry(25, 40, 2), wallMat);
        frontRight.position.set(17.5, 20, 29);
        houseGroup.add(frontRight);
        
        const frontTop = new THREE.Mesh(new THREE.BoxGeometry(10, 15, 2), wallMat);
        frontTop.position.set(0, 32.5, 29);
        houseGroup.add(frontTop);

        // Door (Open)
        const door = new THREE.Mesh(new THREE.BoxGeometry(10, 25, 2), woodMat);
        door.position.set(5, 12.5, 29);
        door.rotation.y = Math.PI / 2; // Open 90 degrees
        houseGroup.add(door);

        // --- Furniture ---
        // Bed
        const bedGroup = new THREE.Group();
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 20), new THREE.MeshLambertMaterial({ color: 0xcc0000 }));
        mattress.position.y = 2;
        mattress.userData = { type: 'bed' };
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 5), new THREE.MeshLambertMaterial({ color: 0xffffff }));
        pillow.position.set(0, 5, -6);
        pillow.userData = { type: 'bed' };
        bedGroup.add(mattress);
        bedGroup.add(pillow);
        bedGroup.position.set(-20, 1, -20);
        houseGroup.add(bedGroup);

        // Furnace
        const furnace = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshLambertMaterial({ color: 0x333333 }));
        furnace.position.set(20, 5, -24);
        const furnaceFront = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 1), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        furnaceFront.position.set(0, 0, 5.1);
        furnace.add(furnaceFront);
        houseGroup.add(furnace);

        // Place House in front of player
        houseGroup.position.copy(this.controls.getObject().position);
        const direction = new THREE.Vector3();
        this.controls.getDirection(direction);
        direction.y = 0;
        direction.normalize();
        houseGroup.position.addScaledVector(direction, 60);
        houseGroup.position.y = 0;
        
        this.scene.add(houseGroup);
        this.objects.push(houseGroup); // Make house interactable (for bed)
        this.updateUI();
    },

    buildStable: function() {
        this.wood -= 10;
        this.quartz -= 5;
        this.stableBuilt = true;
        this.log("You built a stable!");
        
        // Add stable to 3D world
        const geometry = new THREE.BoxGeometry(40, 30, 40);
        const material = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown stable
        const stable = new THREE.Mesh(geometry, material);
        stable.position.copy(this.controls.getObject().position);
        stable.position.x += 60; // Place to the right
        stable.position.y = 15;
        this.scene.add(stable);

        this.updateUI();
    },

    // Randomly find gear when walking around or interacting
    checkRandomGear: function() {
        if (this.saddle && this.bridle) return;
        const roll = Math.random();
        if (roll < 0.05 && !this.saddle) {
            this.saddle = true;
            this.log("You found a Saddle!");
        } else if (roll > 0.95 && !this.bridle) {
            this.bridle = true;
            this.log("You found a Bridle!");
        }
        this.updateUI();
    },

    ride: function() {
        this.log(`You saddled up ${this.horseName} and went for a ride! Game Over (You Win!)`);
        alert(`You win! You are riding ${this.horseName}!`);
    },

    // --- 3D Engine Logic ---

    init3D: function() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera.position.y = 10;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky Blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 0, 750);

        const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
        light.position.set(0.5, 1, 0.75);
        this.scene.add(light);
        this.light = light; // Store reference

        // Sun and Moon
        this.sun = new THREE.Mesh(new THREE.SphereGeometry(20, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
        this.scene.add(this.sun);

        this.moon = new THREE.Mesh(new THREE.SphereGeometry(15, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        this.scene.add(this.moon);

        // Rain
        const rainGeo = new THREE.BufferGeometry();
        const rainCount = 2000;
        const rainPos = [];
        for(let i=0;i<rainCount;i++) {
            rainPos.push(Math.random() * 400 - 200);
            rainPos.push(Math.random() * 200);
            rainPos.push(Math.random() * 400 - 200);
        }
        rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainPos, 3));
        const rainMat = new THREE.PointsMaterial({
            color: 0xaaaaaa,
            size: 0.5,
            transparent: true
        });
        this.rainSystem = new THREE.Points(rainGeo, rainMat);
        this.scene.add(this.rainSystem);

        this.controls = new THREE.PointerLockControls(this.camera, document.body);

        const blocker = document.getElementById('blocker');
        const instructions = document.getElementById('instructions');

        instructions.addEventListener('click', function () {
            game.controls.lock();
        });

        this.controls.addEventListener('lock', function () {
            instructions.style.display = 'none';
            blocker.style.display = 'none';
        });

        this.controls.addEventListener('unlock', function () {
            if (game.isInventoryOpen) return;
            blocker.style.display = 'block';
            instructions.style.display = '';
        });

        this.scene.add(this.controls.getObject());

        // Movement Keys
        const onKeyDown = function (event) {
            switch (event.code) {
                case 'ArrowUp': case 'KeyW': game.moveForward = true; break;
                case 'ArrowLeft': case 'KeyA': game.moveLeft = true; break;
                case 'ArrowDown': case 'KeyS': game.moveBackward = true; break;
                case 'ArrowRight': case 'KeyD': game.moveRight = true; break;
                case 'KeyI': 
                    const container = document.querySelector('.game-container');
                    if (!game.isInventoryOpen) {
                        game.isInventoryOpen = true;
                        container.style.display = 'block';
                        document.exitPointerLock();
                    } else {
                        game.isInventoryOpen = false;
                        container.style.display = 'none';
                        game.controls.lock();
                    }
                    break;
            }
        };
        const onKeyUp = function (event) {
            switch (event.code) {
                case 'ArrowUp': case 'KeyW': game.moveForward = false; break;
                case 'ArrowLeft': case 'KeyA': game.moveLeft = false; break;
                case 'ArrowDown': case 'KeyS': game.moveBackward = false; break;
                case 'ArrowRight': case 'KeyD': game.moveRight = false; break;
            }
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        // Raycaster for interaction
        this.raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), 0, 20);
        document.addEventListener('click', () => this.interact());

        // World Generation
        this.generateWorld();

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => this.onWindowResize());

        this.animate();
    },

    generateWorld: function() {
        // Floor
        const floorGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
        floorGeometry.rotateX(-Math.PI / 2);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x567d46 }); // Grass Green
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.scene.add(floor);

        // Trees (Trunk + Leaves)
        const trunkGeo = new THREE.BoxGeometry(4, 20, 4);
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3a21 });
        const leafGeo = new THREE.BoxGeometry(12, 12, 12);
        const leafMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });
        
        for (let i = 0; i < 50; i++) {
            const x = Math.floor(Math.random() * 40 - 20) * 20;
            const z = Math.floor(Math.random() * 40 - 20) * 20;

            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(x, 10, z);
            trunk.userData = { type: 'wood' };
            
            const leaves = new THREE.Mesh(leafGeo, leafMat);
            leaves.position.set(x, 26, z);
            leaves.userData = { type: 'wood' };

            this.scene.add(trunk); this.scene.add(leaves);
            this.objects.push(trunk); this.objects.push(leaves);
        }

        // Quartz - White Boxes
        const quartzGeo = new THREE.BoxGeometry(5, 5, 5);
        const quartzMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

        for (let i = 0; i < 20; i++) {
            const mesh = new THREE.Mesh(quartzGeo, quartzMat);
            mesh.position.x = Math.floor(Math.random() * 20 - 10) * 20 + 10;
            mesh.position.y = 2.5;
            mesh.position.z = Math.floor(Math.random() * 20 - 10) * 20 + 10;
            mesh.userData = { type: 'quartz' };
            this.scene.add(mesh);
            this.objects.push(mesh);
        }
        
        this.generateAnimals();

        // AI Horses (Complex Mesh)
        const textureLoader = new THREE.TextureLoader();
        const horseTexture = textureLoader.load('./sprites/textures/horsetexture.jpg');
        horseTexture.magFilter = THREE.NearestFilter;
        horseTexture.minFilter = THREE.NearestFilter;

        const horseMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: horseTexture });
        const maneMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a }); // Dark mane
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black eyes/mouth

        for (let i = 0; i < 5; i++) {
            const horseGroup = new THREE.Group();
            horseGroup.userData = { type: 'horse' };

            // Body
            const body = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 14), horseMat);
            body.position.y = 7;
            body.userData = { type: 'horse' };
            horseGroup.add(body);

            // Neck
            const neck = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 4), horseMat);
            neck.position.set(0, 11, 6);
            neck.rotation.x = -Math.PI / 6;
            neck.userData = { type: 'horse' };
            horseGroup.add(neck);

            // Head
            const head = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.5, 7), horseMat);
            head.position.set(0, 14.5, 8);
            head.userData = { type: 'horse' };
            horseGroup.add(head);

            // Ears
            const earGeo = new THREE.BoxGeometry(1, 2, 1);
            const leftEar = new THREE.Mesh(earGeo, horseMat);
            leftEar.position.set(-1, 17, 5);
            leftEar.userData = { type: 'horse' };
            horseGroup.add(leftEar);

            const rightEar = new THREE.Mesh(earGeo, horseMat);
            rightEar.position.set(1, 17, 5);
            rightEar.userData = { type: 'horse' };
            horseGroup.add(rightEar);

            // Eyes
            const eyeGeo = new THREE.BoxGeometry(0.2, 0.5, 0.5);
            const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
            leftEye.position.set(-1.8, 15.5, 9);
            leftEye.userData = { type: 'horse' };
            horseGroup.add(leftEye);

            const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
            rightEye.position.set(1.8, 15.5, 9);
            rightEye.userData = { type: 'horse' };
            horseGroup.add(rightEye);

            // Mouth
            const mouth = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.5, 1.5), eyeMat);
            mouth.position.set(0, 13, 10.5);
            mouth.userData = { type: 'horse' };
            horseGroup.add(mouth);

            // Legs
            const legGeo = new THREE.BoxGeometry(2, 6, 2);
            const legPositions = [
                { x: -2, z: -5 }, { x: 2, z: -5 },
                { x: -2, z: 5 }, { x: 2, z: 5 }
            ];
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeo, horseMat);
                leg.position.set(pos.x, 3, pos.z);
                leg.userData = { type: 'horse' };
                horseGroup.add(leg);
            });

            // Tail
            const tail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6, 1.5), maneMat);
            tail.position.set(0, 7, -7);
            tail.rotation.x = Math.PI / 6;
            tail.userData = { type: 'horse' };
            horseGroup.add(tail);
            
            horseGroup.position.set(Math.random() * 200 - 100, 0, Math.random() * 200 - 100);
            this.scene.add(horseGroup);
            this.objects.push(horseGroup);
            
            // Add to AI list
            this.mobs.push({ mesh: horseGroup, timer: 0, direction: new THREE.Vector3() });
        }
    },
    
    generateAnimals: function() {
        // Pigs
        const pigMat = new THREE.MeshLambertMaterial({ color: 0xffc0cb });
        for(let i=0; i<5; i++) {
            const group = new THREE.Group();
            group.userData = { type: 'pig' };
            
            const body = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 6), pigMat);
            body.position.y = 2;
            body.userData = { type: 'pig' };
            group.add(body);
            
            const head = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), pigMat);
            head.position.set(0, 4, 4);
            head.userData = { type: 'pig' };
            group.add(head);
            
            group.position.set(Math.random()*200-100, 0, Math.random()*200-100);
            this.scene.add(group);
            this.objects.push(group);
            this.mobs.push({ mesh: group, timer: 0, direction: new THREE.Vector3() });
        }

        // Cows
        const cowMat = new THREE.MeshLambertMaterial({ color: 0x3d2817 });
        for(let i=0; i<3; i++) {
            const group = new THREE.Group();
            group.userData = { type: 'cow' };
            
            const body = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 10), cowMat);
            body.position.y = 4;
            body.userData = { type: 'cow' };
            group.add(body);
            
            const head = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), cowMat);
            head.position.set(0, 7, 6);
            head.userData = { type: 'cow' };
            group.add(head);
            
            group.position.set(Math.random()*200-100, 0, Math.random()*200-100);
            this.scene.add(group);
            this.objects.push(group);
            this.mobs.push({ mesh: group, timer: 0, direction: new THREE.Vector3() });
        }

        // Bunnies
        const bunnyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        for(let i=0; i<8; i++) {
            const group = new THREE.Group();
            group.userData = { type: 'bunny' };
            
            // Body
            const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2, 3.5), bunnyMat);
            body.position.y = 1.5;
            body.userData = { type: 'bunny' };
            group.add(body);
            
            // Head
            const head = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), bunnyMat);
            head.position.set(0, 2.5, 2);
            head.userData = { type: 'bunny' };
            group.add(head);
            
            // Ears
            const earGeo = new THREE.BoxGeometry(0.5, 2.5, 0.5);
            const leftEar = new THREE.Mesh(earGeo, bunnyMat);
            leftEar.position.set(-0.6, 4.5, 2);
            leftEar.userData = { type: 'bunny' };
            group.add(leftEar);
            
            const rightEar = new THREE.Mesh(earGeo, bunnyMat);
            rightEar.position.set(0.6, 4.5, 2);
            rightEar.userData = { type: 'bunny' };
            group.add(rightEar);

            // Tail
            const tail = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bunnyMat);
            tail.position.set(0, 2, -2);
            tail.userData = { type: 'bunny' };
            group.add(tail);
            
            // Legs
            const legGeo = new THREE.BoxGeometry(0.8, 1, 0.8);
            const legPositions = [
                {x: -0.8, z: 1}, {x: 0.8, z: 1},
                {x: -0.8, z: -1}, {x: 0.8, z: -1}
            ];
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeo, bunnyMat);
                leg.position.set(pos.x, 0.5, pos.z);
                leg.userData = { type: 'bunny' };
                group.add(leg);
            });

            group.position.set(Math.random()*200-100, 0, Math.random()*200-100);
            this.scene.add(group);
            this.objects.push(group);
            this.mobs.push({ mesh: group, timer: 0, direction: new THREE.Vector3() });
        }
    },

    interact: function() {
        if (!this.controls.isLocked) return;
        
        // Raycast from center of screen
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.objects, true);

        if (intersects.length > 0) {
            const obj = intersects[0].object;
            if (intersects[0].distance > 20) return; // Too far

            if (obj.userData.type === 'wood') {
                this.gatherWood();
                this.scene.remove(obj);
                this.objects.splice(this.objects.indexOf(obj), 1);
                this.checkRandomGear();
            } else if (obj.userData.type === 'quartz') {
                this.gatherQuartz();
                this.scene.remove(obj);
                this.objects.splice(this.objects.indexOf(obj), 1);
                this.checkRandomGear();
            } else if (obj.userData.type === 'horse') {
                const horseGroup = obj.parent;
                if (!this.hasHorse) {
                    this.foundHorse(horseGroup);
                } else {
                    this.log(horseGroup === this.tamedHorseMesh ? `This is ${this.horseName}.` : "This is a wild horse.");
                }
            } else if (['pig', 'cow', 'bunny'].includes(obj.userData.type)) {
                this.log(`It's a ${obj.userData.type}.`);
            } else if (obj.userData.type === 'bed') {
                if (this.sun.position.y < 0) {
                    this.cycleTime = 0; // Reset to morning
                    this.log("You slept through the night.");
                    this.updateUI();
                } else {
                    this.log("You can only sleep at night.");
                }
            }
        }
    },

    onWindowResize: function() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    },

    updateMobs: function(delta) {
        this.mobs.forEach(h => {
            // Don't move if tamed (or implement follow logic later)
            if (h.mesh === this.tamedHorseMesh) {
                h.mesh.lookAt(this.controls.getObject().position.x, 4, this.controls.getObject().position.z);
                return;
            }

            h.timer -= delta;
            if (h.timer <= 0) {
                h.timer = Math.random() * 3 + 2; // New action every 2-5 seconds
                // Random direction
                const angle = Math.random() * Math.PI * 2;
                h.direction.set(Math.cos(angle), 0, Math.sin(angle));
            }

            // Move
            h.mesh.position.addScaledVector(h.direction, 5 * delta);
            h.mesh.lookAt(h.mesh.position.clone().add(h.direction));
        });
    },

    animate: function() {
        requestAnimationFrame(() => this.animate());

        const time = performance.now();
        const delta = (time - this.prevTime) / 1000;
        this.prevTime = time;

        if (this.controls.isLocked) {
            this.velocity.x -= this.velocity.x * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;

            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * 400.0 * delta;
            if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * 400.0 * delta;

            this.controls.moveRight(-this.velocity.x * delta);
            this.controls.moveForward(-this.velocity.z * delta);
        }

        // Day/Night Cycle Logic
        this.cycleTime += delta;
        if (this.cycleTime > this.dayDuration) this.cycleTime -= this.dayDuration;
        
        const progress = this.cycleTime / this.dayDuration;
        const angle = progress * Math.PI * 2;
        const r = 400; // Distance of sun/moon
        
        this.sun.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
        this.moon.position.set(Math.cos(angle + Math.PI) * r, Math.sin(angle + Math.PI) * r, 0);

        if (this.sun.position.y > 0) {
            this.scene.background.setHex(0x87CEEB);
            this.scene.fog.color.setHex(0x87CEEB);
            this.light.intensity = 1;
        } else {
            this.scene.background.setHex(0x000022);
            this.scene.fog.color.setHex(0x000022);
            this.light.intensity = 0.2;
        }

        // Rain Animation
        if (this.rainSystem) {
            const positions = this.rainSystem.geometry.attributes.position.array;
            for(let i=1; i<positions.length; i+=3) {
                positions[i] -= 2; // Speed
                if (positions[i] < 0) {
                    positions[i] = 200;
                }
            }
            this.rainSystem.geometry.attributes.position.needsUpdate = true;
        }

        this.updateMobs(delta);

        this.renderer.render(this.scene, this.camera);
    }
};

// Start the game
game.init3D();
