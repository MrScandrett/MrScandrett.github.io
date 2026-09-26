// 3D drum kit for the drums lesson. Renders a lit, textured kit with real
// geometry (Three.js) as a visual companion to the accessible button row in
// #drKitPicker, which drum-engine.js / lessons/drums.js already wire up for
// sound + the info panel. This module never owns interaction state — it only
// forwards clicks on the model to the matching button and mirrors that
// button's is-selected / hover state back onto the model.
import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

(function () {
  var canvas = document.getElementById('drKit3d');
  var fallback = document.getElementById('drKit3dFallback');
  var picker = document.getElementById('drKitPicker');
  if (!canvas || !picker) return;

  function hasWebGL() {
    try {
      var probe = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (probe.getContext('webgl') || probe.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  if (!hasWebGL()) {
    canvas.hidden = true;
    if (fallback) fallback.hidden = false;
    return;
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------- textures */

  function tex(size, draw) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function grayTex(size, draw) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  // Sparkle-lacquer shell finish: gradient base + fine glitter speckle + grain streaks.
  function shellColorTex(hex1, hex2) {
    return tex(512, function (ctx, s) {
      var g = ctx.createLinearGradient(0, 0, s, 0);
      g.addColorStop(0, hex1); g.addColorStop(.5, hex2); g.addColorStop(1, hex1);
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      ctx.globalAlpha = .12;
      for (var i = 0; i < 900; i++) {
        var x = Math.random() * s, y = Math.random() * s, r = Math.random() * 1.4 + .3;
        ctx.fillStyle = Math.random() > .5 ? '#ffffff' : '#000000';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = .07;
      for (var v = 0; v < 40; v++) {
        var vx = Math.random() * s;
        ctx.strokeStyle = Math.random() > .5 ? '#ffffff' : '#000000';
        ctx.lineWidth = Math.random() * 2 + .5;
        ctx.beginPath(); ctx.moveTo(vx, 0); ctx.lineTo(vx + (Math.random() * 10 - 5), s); ctx.stroke();
      }
    });
  }
  function shellBumpTex() {
    return grayTex(256, function (ctx, s) {
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, s, s);
      for (var i = 0; i < 3000; i++) {
        var b = Math.floor(Math.random() * 70) + 90;
        ctx.fillStyle = 'rgb(' + b + ',' + b + ',' + b + ')';
        ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
      }
    });
  }
  function headColorTex() {
    return tex(512, function (ctx, s) {
      ctx.fillStyle = '#f4ecd9'; ctx.fillRect(0, 0, s, s);
      var g = ctx.createRadialGradient(s * .42, s * .38, s * .05, s * .5, s * .5, s * .62);
      g.addColorStop(0, 'rgba(255,255,255,.75)');
      g.addColorStop(.55, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      ctx.globalAlpha = .05;
      for (var i = 0; i < 600; i++) {
        ctx.fillStyle = Math.random() > .5 ? '#fff' : '#000';
        ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
      }
    });
  }
  function headBumpTex() {
    return grayTex(256, function (ctx, s) {
      ctx.fillStyle = '#8c8c8c'; ctx.fillRect(0, 0, s, s);
      ctx.globalAlpha = .5;
      for (var i = 0; i < 40; i++) {
        var r = (i / 40) * s * .55;
        ctx.strokeStyle = i % 2 ? '#7a7a7a' : '#9a9a9a';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2); ctx.stroke();
      }
    });
  }
  // Brushed-metal cymbal finish: concentric grooves for both color & roughness variation.
  function cymbalColorTex() {
    return tex(512, function (ctx, s) {
      var g = ctx.createRadialGradient(s * .5, s * .5, 4, s * .5, s * .5, s * .5);
      g.addColorStop(0, '#ffe9a8'); g.addColorStop(.45, '#d9a441'); g.addColorStop(1, '#7a5312');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      ctx.globalAlpha = .35;
      for (var r = 4; r < s * .5; r += 1.6) {
        ctx.strokeStyle = (r % 3 < 1.5) ? '#fff3cf' : '#8a5f1c';
        ctx.lineWidth = .8;
        ctx.beginPath(); ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2); ctx.stroke();
      }
    });
  }
  function cymbalBumpTex() {
    return grayTex(512, function (ctx, s) {
      ctx.fillStyle = '#909090'; ctx.fillRect(0, 0, s, s);
      for (var r = 4; r < s * .5; r += 1.2) {
        var b = 110 + Math.round(Math.sin(r * .9) * 60);
        ctx.strokeStyle = 'rgb(' + b + ',' + b + ',' + b + ')';
        ctx.lineWidth = .7;
        ctx.beginPath(); ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2); ctx.stroke();
      }
    });
  }
  function chromeBumpTex() {
    return grayTex(128, function (ctx, s) {
      ctx.fillStyle = '#a0a0a0'; ctx.fillRect(0, 0, s, s);
      for (var y = 0; y < s; y += 2) {
        var b = 140 + Math.round(Math.random() * 40);
        ctx.fillStyle = 'rgb(' + b + ',' + b + ',' + b + ')';
        ctx.fillRect(0, y, s, 1);
      }
    });
  }

  /* ------------------------------------------------------------ scene */

  var stageColor = 0x1f1a2a;
  var scene3 = createScene(canvas, { THREE: THREE, fov: 38, near: .05, far: 40, clearColor: stageColor, maxDpr: 2 });
  var renderer = scene3.renderer, scene = scene3.scene, camera = scene3.camera;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  camera.position.set(0.1, 1.85, 3.45);

  var controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0.75, -0.1);
  controls.minDistance = 2.1;
  controls.maxDistance = 5.5;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.enablePan = false;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.55;
  controls.update();

  // --- lighting: a stage spotlight is the key light, with a dim cool fill
  // and a low orange rim so the kit doesn't go fully black outside the beam.
  scene.add(new THREE.HemisphereLight(0x565a78, 0x0e0b16, 0.28));

  var kitCenter = new THREE.Vector3(0.05, 0.68, -0.05);
  var spot = new THREE.SpotLight(0xfff3da, 210, 12, Math.PI * 0.145, 0.46, 1.6);
  spot.position.set(0.7, 3.7, 1.9);
  spot.target.position.copy(kitCenter);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.camera.near = 1.5;
  spot.shadow.camera.far = 8;
  spot.shadow.bias = -0.0015;
  spot.shadow.focus = 1;
  scene.add(spot);
  scene.add(spot.target);

  var fill = new THREE.DirectionalLight(0x6ea6ff, 0.22);
  fill.position.set(-2.6, 1.8, -1.6);
  scene.add(fill);
  var rim = new THREE.PointLight(0xe8590c, 0.6, 8, 2);
  rim.position.set(-1.6, 2.1, -1.8);
  scene.add(rim);

  // --- visible spotlight beam: a soft additive cone from the fixture down
  // to the kit, so the light reads as a theatrical spot and not just shading.
  function beamAlphaTex() {
    var c = document.createElement('canvas');
    c.width = 32; c.height = 256;
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,247,224,.95)');
    g.addColorStop(0.55, 'rgba(255,238,205,.28)');
    g.addColorStop(1, 'rgba(255,230,190,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 256);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }
  var beamDir = new THREE.Vector3().subVectors(kitCenter, spot.position);
  var beamLen = beamDir.length();
  beamDir.normalize();
  var beamRadius = beamLen * Math.tan(spot.angle);
  var beam = new THREE.Mesh(
    new THREE.ConeGeometry(beamRadius, beamLen, 32, 1, true),
    new THREE.MeshBasicMaterial({
      map: beamAlphaTex(), transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
    })
  );
  beam.position.copy(spot.position).addScaledVector(beamDir, beamLen / 2);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), beamDir);
  beam.renderOrder = 10;
  scene.add(beam);

  // small visible fixture at the top of the beam
  var fixture = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.11, 0.16, 16),
    new THREE.MeshStandardMaterial({ color: 0x18161c, roughness: 0.4, metalness: 0.6 })
  );
  fixture.position.copy(spot.position);
  fixture.lookAt(kitCenter);
  fixture.rotateX(Math.PI / 2);
  scene.add(fixture);

  // --- baked environment for cymbal / chrome reflections
  var pmrem = new THREE.PMREMGenerator(renderer);
  var envScene = new THREE.Scene();
  var envGeo = new THREE.SphereGeometry(6, 24, 16);
  var envColors = [];
  var pos = envGeo.attributes.position;
  for (var i = 0; i < pos.count; i++) {
    var y = pos.getY(i) / 6;
    var t = y * 0.5 + 0.5;
    var top = new THREE.Color(0xfff0d0), bot = new THREE.Color(0x1a1626);
    var c = top.clone().lerp(bot, 1 - t);
    envColors.push(c.r, c.g, c.b);
  }
  envGeo.setAttribute('color', new THREE.Float32BufferAttribute(envColors, 3));
  var envMesh = new THREE.Mesh(envGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }));
  envScene.add(envMesh);
  var envRT = pmrem.fromScene(envScene, 0.06);
  scene.environment = envRT.texture;
  pmrem.dispose();

  // --- stage floor
  var floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 48),
    new THREE.MeshStandardMaterial({ color: 0x241d30, roughness: 0.95, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ------------------------------------------------------------ parts */

  var shellTex = shellColorTex('#6b2f14', '#c46a37');
  var shellBump = shellBumpTex();
  var headTex = headColorTex();
  var headBump = headBumpTex();
  var cymTex = cymbalColorTex();
  var cymBump = cymbalBumpTex();
  var chromeBump = chromeBumpTex();

  var shellMat = new THREE.MeshStandardMaterial({ map: shellTex, bumpMap: shellBump, bumpScale: 0.006, roughness: 0.32, metalness: 0.08, envMapIntensity: 0.4 });
  var headMat = new THREE.MeshPhysicalMaterial({ map: headTex, bumpMap: headBump, bumpScale: 0.002, roughness: 0.55, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.35, envMapIntensity: 0.5 });
  var cymMat = new THREE.MeshStandardMaterial({ map: cymTex, bumpMap: cymBump, bumpScale: 0.004, roughness: 0.32, metalness: 0.92, envMapIntensity: 1.1 });
  var chromeMat = new THREE.MeshStandardMaterial({ color: 0xd7dae0, bumpMap: chromeBump, bumpScale: 0.0015, roughness: 0.22, metalness: 1, envMapIntensity: 1.2 });
  var blackHwMat = new THREE.MeshStandardMaterial({ color: 0x18161c, roughness: 0.5, metalness: 0.6 });

  var parts = {};      // inst -> THREE.Group
  var kitRoot = new THREE.Group();
  scene.add(kitRoot);

  function drum(radius, depth, y, shellHeightRatio) {
    var g = new THREE.Group();
    var shellR = radius * 0.98;
    var shell = new THREE.Mesh(new THREE.CylinderGeometry(shellR, shellR, depth, 40, 1, true), shellMat);
    shell.rotation.x = Math.PI / 2;
    shell.castShadow = shell.receiveShadow = true;
    g.add(shell);
    var headFront = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), headMat);
    headFront.position.z = depth / 2;
    headFront.castShadow = true;
    g.add(headFront);
    var headBack = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), headMat);
    headBack.position.z = -depth / 2;
    headBack.rotation.y = Math.PI;
    g.add(headBack);
    var rimFront = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.0, radius * 0.045, 10, 40), chromeMat);
    rimFront.position.z = depth / 2;
    g.add(rimFront);
    var rimBack = rimFront.clone();
    rimBack.position.z = -depth / 2;
    g.add(rimBack);
    // lugs — a ring of small chrome housings girdling the shell. The shell's
    // circular cross-section lies in the local XY-plane (its axis runs along
    // Z, see the shell.rotation.x = PI/2 above), so the ring has to be built
    // in that same XY-plane, not XZ — otherwise the lugs float through the
    // drum instead of hugging its rim.
    var lugCount = Math.max(6, Math.round(radius * 22));
    for (var i = 0; i < lugCount; i++) {
      var a = (i / lugCount) * Math.PI * 2;
      var lug = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.05, radius * 0.09, depth * 0.5), chromeMat);
      lug.position.set(Math.cos(a) * shellR, Math.sin(a) * shellR, 0);
      lug.rotation.z = a;
      lug.castShadow = true;
      g.add(lug);
    }
    g.position.y = y;
    return g;
  }

  // Aligns a chrome cylinder between two explicit 3D points — used for every
  // stand leg/strut so hardware always actually connects to what it should,
  // instead of approximating the tilt with independent per-axis rotations.
  var UP_AXIS = new THREE.Vector3(0, 1, 0);
  function strut(p1, p2, radius) {
    var dir = new THREE.Vector3().subVectors(p2, p1);
    var len = dir.length();
    var leg = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.2, len, 8), chromeMat);
    leg.position.addVectors(p1, p2).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(UP_AXIS, dir.normalize());
    leg.castShadow = true;
    return leg;
  }

  function cymbalStand(x, z, height) {
    var g = new THREE.Group();
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, height, 10), chromeMat);
    pole.position.y = height / 2;
    pole.castShadow = true;
    g.add(pole);
    [0, 2.1, 4.2].forEach(function (a) {
      var top = new THREE.Vector3(0, 0.12, 0);
      var bottom = new THREE.Vector3(Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24);
      g.add(strut(top, bottom, 0.016));
    });
    g.position.set(x, 0, z);
    return g;
  }

  function cymbal(radius, rise) {
    var g = new THREE.Group();
    var bow = new THREE.Mesh(new THREE.ConeGeometry(radius, rise, 44, 1, true), cymMat);
    bow.castShadow = true;
    g.add(bow);
    var underside = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.995, 44), cymMat);
    underside.position.y = -rise / 2 + 0.001;
    underside.rotation.x = -Math.PI / 2;
    g.add(underside);
    var bell = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.1, 16, 10), cymMat);
    bell.position.y = rise / 2;
    bell.castShadow = true;
    g.add(bell);
    return g;
  }

  // Kick
  var kick = drum(0.56, 0.46, 0.56);
  kick.rotation.y = 0;
  kick.position.set(0, 0.56, -0.15);
  kick.add((function () { var b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 8), blackHwMat); b.rotation.x = Math.PI / 2; b.position.z = 0.25; return b; })());
  kitRoot.add(kick);
  parts.kick = kick;

  // Snare (slightly tilted toward the player)
  var snare = drum(0.35, 0.22, 0.55);
  snare.position.set(-0.85, 0.55, 0.62);
  snare.rotation.x = -1.32;
  snare.rotation.y = 0.08;
  var snareStand = new THREE.Group();
  [1.05, -1.05, 2.6].forEach(function (a) {
    var top = new THREE.Vector3(Math.cos(a) * 0.12, 0.5, Math.sin(a) * 0.12);
    var bottom = new THREE.Vector3(Math.cos(a) * 0.34, 0, Math.sin(a) * 0.34);
    snareStand.add(strut(top, bottom, 0.017));
  });
  snareStand.position.set(-0.85, 0, 0.62);
  kitRoot.add(snareStand);
  kitRoot.add(snare);
  parts.snare = snare;

  // Rack toms, mounted above the bass drum's front-top edge, angled up
  // toward the player so they clear the kick shell instead of sinking into it.
  var tomHi = drum(0.24, 0.26, 1.4);
  tomHi.position.set(-0.24, 1.4, 0.02);
  tomHi.rotation.x = -1.18;
  kitRoot.add(tomHi);
  parts.tomHi = tomHi;

  var tomMid = drum(0.28, 0.3, 1.44);
  tomMid.position.set(0.34, 1.44, 0.02);
  tomMid.rotation.x = -1.12;
  kitRoot.add(tomMid);
  parts.tomMid = tomMid;

  // Floor tom, standing on 3 legs
  var tomLo = drum(0.38, 0.46, 0.62);
  tomLo.rotation.x = -1.46;
  tomLo.position.set(0.98, 0.62, 0.35);
  [0.6, 2.6, -1.4].forEach(function (a) {
    var top = new THREE.Vector3(0.98 + Math.cos(a) * 0.16, 0.38, 0.35 + Math.sin(a) * 0.16);
    var bottom = new THREE.Vector3(0.98 + Math.cos(a) * 0.42, 0, 0.35 + Math.sin(a) * 0.42);
    kitRoot.add(strut(top, bottom, 0.02));
  });
  kitRoot.add(tomLo);
  parts.tomLo = tomLo;

  // Hi-hat
  var hatStand = cymbalStand(-1.35, -0.1, 0.85);
  kitRoot.add(hatStand);
  var hat = new THREE.Group();
  var hatBottom = cymbal(0.24, 0.02);
  hatBottom.position.y = 0.72;
  hat.add(hatBottom);
  var hatTop = cymbal(0.23, 0.02);
  hatTop.position.y = 0.79;
  hat.add(hatTop);
  hat.position.set(-1.35, 0, -0.1);
  kitRoot.add(hat);
  parts.hat = hat;

  // Crash
  var crashStand = cymbalStand(-1.1, -0.62, 1.32);
  kitRoot.add(crashStand);
  var crash = cymbal(0.34, 0.015);
  crash.position.set(-1.1, 1.34, -0.62);
  crash.rotation.z = -0.32;
  crash.rotation.x = 0.12;
  kitRoot.add(crash);
  parts.crash = crash;

  // Ride
  var rideStand = cymbalStand(1.3, -0.45, 1.24);
  kitRoot.add(rideStand);
  var ride = cymbal(0.4, 0.015);
  ride.position.set(1.3, 1.26, -0.45);
  ride.rotation.z = 0.24;
  ride.rotation.x = 0.1;
  kitRoot.add(ride);
  parts.ride = ride;

  kitRoot.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  /* --------------------------------------------------------- highlight */

  var ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.6, 40),
    new THREE.MeshBasicMaterial({ color: 0xe8590c, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);

  var haloTarget = 0, haloCurrent = 0;
  var hitPulse = {};   // inst -> 0..1 pulse amount

  function worldBaseOf(group) {
    var box = new THREE.Box3().setFromObject(group);
    var center = new THREE.Vector3();
    box.getCenter(center);
    return { x: center.x, z: center.z, radius: Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.62 };
  }

  function setHighlight(inst) {
    if (inst && parts[inst]) {
      var b = worldBaseOf(parts[inst]);
      ring.position.set(b.x, 0.015, b.z);
      ring.scale.setScalar(Math.max(b.radius, 0.32) / 0.55);
      haloTarget = 1;
    } else {
      haloTarget = 0;
    }
  }

  /* -------------------------------------------------- picker <-> 3D sync */

  function currentSelectedInst() {
    var sel = picker.querySelector('.kit-part.is-selected');
    return sel ? sel.getAttribute('data-inst') : null;
  }
  setHighlight(currentSelectedInst());

  var mo = new MutationObserver(function () { setHighlight(currentSelectedInst()); });
  Array.prototype.forEach.call(picker.querySelectorAll('.kit-part'), function (btn) {
    mo.observe(btn, { attributes: true, attributeFilter: ['class'] });
    btn.addEventListener('click', function () {
      var inst = btn.getAttribute('data-inst');
      hitPulse[inst] = 1;
    });
  });

  /* ----------------------------------------------------- click forwarding */

  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2();
  var downX = 0, downY = 0;

  function instFromIntersect(obj) {
    var o = obj;
    while (o) {
      for (var key in parts) { if (parts[key] === o) return key; }
      o = o.parent;
    }
    return null;
  }

  function pick(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(kitRoot.children, true);
    for (var i = 0; i < hits.length; i++) {
      var inst = instFromIntersect(hits[i].object);
      if (inst) return inst;
    }
    return null;
  }

  canvas.addEventListener('pointerdown', function (e) { downX = e.clientX; downY = e.clientY; });
  canvas.addEventListener('pointerup', function (e) {
    var moved = Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY);
    if (moved > 6) return; // was a drag/orbit, not a tap
    var inst = pick(e.clientX, e.clientY);
    if (inst) {
      var btn = picker.querySelector('.kit-part[data-inst="' + inst + '"]');
      if (btn) btn.click();
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (e.buttons) { canvas.style.cursor = 'grabbing'; return; }
    var inst = pick(e.clientX, e.clientY);
    canvas.style.cursor = inst ? 'pointer' : 'grab';
  });

  /* --------------------------------------------------------------- loop */

  var clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    scene3.syncSize();
    var dt = Math.min(clock.getDelta(), 0.05);
    controls.update();

    haloCurrent += (haloTarget - haloCurrent) * 0.15;
    ring.material.opacity = haloCurrent * (0.45 + 0.25 * Math.sin(clock.elapsedTime * 3));

    for (var inst in hitPulse) {
      if (hitPulse[inst] <= 0) continue;
      hitPulse[inst] = Math.max(0, hitPulse[inst] - dt * 3.2);
      var g = parts[inst];
      if (g) {
        var s = 1 + hitPulse[inst] * 0.06;
        g.scale.setScalar(s);
      }
    }

    renderer.render(scene, camera);
  }
  animate();

  controls.addEventListener('start', function () { controls.autoRotate = false; });
})();
