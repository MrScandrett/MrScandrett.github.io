<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Test Site</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚀</text></svg>">
    <style>
        body { margin: 0; background-color: #222; } /* Dark background so white is visible */
        canvas { display: block; width: 100vw; height: 100vh; }
    </style>
</head>
<body>

    <script type="importmap">
        {
            "imports": {
                "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
                "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
            }
        }
    </script>

    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

        // 1. BASIC SETUP
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111); // Explicitly set background to dark grey

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 5);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        // 2. LIGHTING (Crucial for seeing anything)
        const ambientLight = new THREE.AmbientLight(0xffffff, 2);
        scene.add(ambientLight);

        const light = new THREE.DirectionalLight(0xffffff, 2);
        light.position.set(5, 5, 5);
        scene.add(light);

        // 3. FALLBACK OBJECT (A Red Cube)
        // If you see this cube, the code is working, but the model is just taking a while to load.
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const cube = new THREE.Mesh(boxGeo, boxMat);
        scene.add(cube);

        // 4. LOAD THE EXTERNAL MODEL
        const loader = new GLTFLoader();
        // This is a reliable link to a small 3D Duck model
        const url = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';

        loader.load(url, (gltf) => {
            scene.remove(cube); // Remove the red cube once model loads
            scene.add(gltf.scene);
            console.log("Model Loaded!");
        }, undefined, (err) => {
            console.error("Model failed:", err);
        });

        // 5. CONTROLS
        const controls = new OrbitControls(camera, renderer.domElement);

        // 6. ANIMATION
        function animate() {
            requestAnimationFrame(animate);
            cube.rotation.y += 0.01; // Rotate cube while waiting
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        // Handle Resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    </script>
</body>
</html>