import { THREE, OBJLoader, OrbitControls } from '../../assets/vendor/three-bundle.min.js';

var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d", { willReadFrequently: true });
var bootOverlay = document.getElementById("bootOverlay");
var statSector = document.getElementById("stat-sector");
var statHeading = document.getElementById("stat-heading");
var statFps = document.getElementById("stat-fps");

// Hide minimap since we are using OrbitControls now
document.getElementById("minimap").style.display = "none";

// ASCII Configuration
var COLS = 220;
var ROWS = 80;
var FONT_SIZE = 9;
var FONT = FONT_SIZE + 'px "Courier New", monospace';
canvas.width = COLS * Math.ceil(FONT_SIZE * 0.65); // Approximate char width
canvas.height = ROWS * Math.ceil(FONT_SIZE * 1.1);

var SHADE = [" ", ".", ",", ":", "-", ";", "=", "+", "*", "?", "#", "%", "&", "8", "@"];

// Create offscreen WebGL renderer
var webglCanvas = document.createElement("canvas");
webglCanvas.width = COLS;
webglCanvas.height = ROWS;
var renderer = new THREE.WebGLRenderer({ canvas: webglCanvas, antialias: false });
renderer.setSize(COLS, ROWS);
renderer.setClearColor(0x050308);

var scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050308, 0.015);

var camera = new THREE.PerspectiveCamera(60, COLS / ROWS, 0.1, 1000);
camera.position.set(0, 8, 25);

var controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.5;

// Add lights
var ambient = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambient);
var dirLight = new THREE.DirectionalLight(0xff7ce8, 1.2);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);
var blueLight = new THREE.PointLight(0x7CFCF0, 2, 50);
blueLight.position.set(-10, 5, -10);
scene.add(blueLight);

// Load an open source model (Suzanne as placeholder for "Google models")
var loader = new OBJLoader();
loader.load('../../assets/models/Suzanne.obj', function (obj) {
  obj.traverse(function (child) {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({ 
        color: 0x4fd67c,
        roughness: 0.3,
        metalness: 0.5
      });
    }
  });
  obj.scale.set(6, 6, 6);
  obj.position.set(0, 5, 0);
  scene.add(obj);
});

// Add some procedural city blocks around it
var boxGeo = new THREE.BoxGeometry(1, 1, 1);
for (var i = 0; i < 150; i++) {
  var mat = new THREE.MeshStandardMaterial({ 
    color: Math.random() > 0.5 ? 0x223344 : 0x442233 
  });
  var mesh = new THREE.Mesh(boxGeo, mat);
  mesh.position.set(
    (Math.random() - 0.5) * 100,
    0,
    (Math.random() - 0.5) * 100
  );
  mesh.position.y = Math.random() * 8 + 2;
  mesh.scale.set(Math.random() * 4 + 2, mesh.position.y * 2, Math.random() * 4 + 2);
  scene.add(mesh);
}

// Floor
var floor = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// 2D Canvas for reading pixels
var readCanvas = document.createElement("canvas");
readCanvas.width = COLS;
readCanvas.height = ROWS;
var readCtx = readCanvas.getContext("2d", { willReadFrequently: true });

var lastTime = performance.now();
var frames = 0;
var accum = 0;

function loop() {
  requestAnimationFrame(loop);
  
  var now = performance.now();
  var dt = (now - lastTime) / 1000;
  lastTime = now;
  
  controls.update();
  renderer.render(scene, camera);
  
  // Copy WebGL to 2D canvas to read pixels
  readCtx.drawImage(webglCanvas, 0, 0);
  var imgData = readCtx.getImageData(0, 0, COLS, ROWS).data;
  
  // Render ASCII
  ctx.fillStyle = "#050308";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = FONT;
  ctx.textBaseline = "top";
  
  var charW = canvas.width / COLS;
  var charH = canvas.height / ROWS;
  
  for (var y = 0; y < ROWS; y++) {
    for (var x = 0; x < COLS; x++) {
      var i = (y * COLS + x) * 4;
      var r = imgData[i];
      var g = imgData[i + 1];
      var b = imgData[i + 2];
      
      var brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      if (brightness > 0.02) {
        var charIdx = Math.floor(Math.pow(brightness, 0.7) * (SHADE.length - 1));
        charIdx = Math.max(0, Math.min(SHADE.length - 1, charIdx));
        var ch = SHADE[charIdx];
        
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillText(ch, x * charW, y * charH);
      }
    }
  }
  
  // HUD
  statSector.textContent = "3D";
  statHeading.textContent = Math.round((camera.rotation.y + Math.PI*2) % (Math.PI*2) * 180 / Math.PI) + "°";
  
  frames++;
  accum += dt;
  if (accum > 0.5) {
    statFps.textContent = Math.round(frames / accum);
    frames = 0;
    accum = 0;
  }
}

bootOverlay.addEventListener("click", function () { 
  bootOverlay.classList.add("hidden"); 
});

// Start loop
requestAnimationFrame(loop);

