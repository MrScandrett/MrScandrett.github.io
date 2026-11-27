import { THREE, OrbitControls } from '../../vendor/three-bundle.min.js';
import { createScene } from '../sim-kit-three.mjs';

function hasWebGL() {
  try {
    var probe = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (probe.getContext('webgl2') || probe.getContext('webgl') || probe.getContext('experimental-webgl'))
    );
  } catch (_) {
    return false;
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function createRoundedBoxGeometry(size, radius, segments) {
  var geo = new THREE.BoxGeometry(size, size, size, segments, segments, segments);
  var pos = geo.attributes.position;
  var norm = geo.attributes.normal;
  var inner = size * 0.5 - radius;
  var v = new THREE.Vector3();
  var c = new THREE.Vector3();
  var d = new THREE.Vector3();

  for (var i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    c.set(
      clamp(v.x, -inner, inner),
      clamp(v.y, -inner, inner),
      clamp(v.z, -inner, inner)
    );
    d.subVectors(v, c);
    var len = d.length();
    if (len > 1e-6) {
      d.divideScalar(len);
      v.copy(c).addScaledVector(d, radius);
      pos.setXYZ(i, v.x, v.y, v.z);
      norm.setXYZ(i, d.x, d.y, d.z);
    }
  }
  pos.needsUpdate = true;
  norm.needsUpdate = true;
  return geo;
}

function createRoundedRectShape(w, h, r) {
  var hw = w * 0.5;
  var hh = h * 0.5;
  var shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return shape;
}

function createNormalizedShapeGeometry(shape, w, h, curveSegments) {
  var geo = new THREE.ShapeGeometry(shape, curveSegments || 12);
  var pos = geo.attributes.position;
  var uv = geo.attributes.uv;
  for (var i = 0; i < pos.count; i += 1) {
    var x = pos.getX(i);
    var y = pos.getY(i);
    uv.setXY(i, x / w + 0.5, y / h + 0.5);
  }
  uv.needsUpdate = true;
  return geo;
}

function disposeObjectResources(root) {
  if (!root) return;
  var geometries = new Set();
  var materials = new Set();
  var textures = new Set();

  root.traverse(function (obj) {
    if (obj.geometry && !obj.userData.sharedGeometry) {
      geometries.add(obj.geometry);
    }
    if (obj.material && !obj.userData.sharedMaterial) {
      var mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(function (m) {
        if (!m || m.userData?.shared) return;
        materials.add(m);
        ['map', 'bumpMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'].forEach(function (k) {
          if (m[k] && !m[k].userData?.shared) textures.add(m[k]);
        });
      });
    }
  });

  geometries.forEach(function (g) { g.dispose(); });
  materials.forEach(function (m) { m.dispose(); });
  textures.forEach(function (t) { t.dispose(); });
}

function makeStudioEnvironment(renderer) {
  var pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  var envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x181008);

  var addPanel = function (color, intensity, pos, scale, rot) {
    var mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    mat.color.multiplyScalar(intensity);
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.scale.set(scale[0], scale[1], 1);
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    envScene.add(mesh);
  };

  addPanel(0xfff5e4, 3.0, [4, 7, 4], [7, 7], [Math.PI * 0.35, -0.4, 0]);
  addPanel(0x9ec5ff, 1.8, [-6, 4, -3], [6, 5], [0.4, 0.8, 0]);
  addPanel(0xf59e0b, 2.2, [-4, 2, 5], [5, 4], [0.2, -0.6, 0]);
  addPanel(0xffe4b5, 1.4, [0, 8, -5], [8, 4], [Math.PI * 0.45, 0, 0]);

  var target = pmrem.fromScene(envScene, 0.04);
  envScene.traverse(function (o) {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  pmrem.dispose();
  return target;
}

function makeTableTexture() {
  var c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  var ctx = c.getContext('2d');

  var grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 256);
  grad.addColorStop(0, '#3a2613');
  grad.addColorStop(0.58, '#28190b');
  grad.addColorStop(0.92, '#1c1107');
  grad.addColorStop(1, '#120b04');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle concentric felt/grain texture
  for (var i = 0; i < 2400; i += 1) {
    var x = Math.random() * 512;
    var y = Math.random() * 512;
    var alpha = 0.02 + Math.random() * 0.035;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,235,205,' + alpha + ')' : 'rgba(0,0,0,' + alpha + ')';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.strokeStyle = 'rgba(245, 180, 75, 0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(256, 256, 188, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(256, 256, 128, 0, Math.PI * 2);
  ctx.stroke();

  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.shared = true;
  return tex;
}

function makeReededEdgeBump() {
  var c = document.createElement('canvas');
  c.width = 512;
  c.height = 32;
  var ctx = c.getContext('2d');
  for (var x = 0; x < 512; x += 4) {
    ctx.fillStyle = (x / 4) % 2 === 0 ? '#ffffff' : '#2a2a2a';
    ctx.fillRect(x, 0, 2, 32);
  }
  var tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.userData.shared = true;
  return tex;
}

function makeCoinFaceTextures(label, shortText, palette, isMystery) {
  var c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  var ctx = c.getContext('2d');

  var b = document.createElement('canvas');
  b.width = 512;
  b.height = 512;
  var bctx = b.getContext('2d');

  // Diffuse brushed metal face
  var grad = ctx.createRadialGradient(200, 180, 24, 256, 256, 256);
  grad.addColorStop(0, palette.hi);
  grad.addColorStop(0.55, palette.mid);
  grad.addColorStop(1, palette.lo);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  bctx.fillStyle = '#707070';
  bctx.fillRect(0, 0, 512, 512);

  // Concentric brushed sheen
  for (var r = 40; r < 245; r += 4) {
    ctx.strokeStyle = r % 8 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(256, 256, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Outer milled ring & dots
  ctx.strokeStyle = palette.rimStroke;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(256, 256, 224, 0, Math.PI * 2);
  ctx.stroke();

  bctx.strokeStyle = '#ffffff';
  bctx.lineWidth = 12;
  bctx.beginPath();
  bctx.arc(256, 256, 224, 0, Math.PI * 2);
  bctx.stroke();

  var dotCount = 36;
  for (var i = 0; i < dotCount; i += 1) {
    var ang = (i / dotCount) * Math.PI * 2;
    var dx = 256 + Math.cos(ang) * 198;
    var dy = 256 + Math.sin(ang) * 198;
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.arc(dx, dy, 4, 0, Math.PI * 2);
    ctx.fill();

    bctx.fillStyle = '#e8e8e8';
    bctx.beginPath();
    bctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
    bctx.fill();
  }

  // Inner crest ring
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 256, 172, 0, Math.PI * 2);
  ctx.stroke();

  bctx.strokeStyle = '#d8d8d8';
  bctx.lineWidth = 5;
  bctx.beginPath();
  bctx.arc(256, 256, 172, 0, Math.PI * 2);
  bctx.stroke();

  if (isMystery) {
    ctx.fillStyle = 'rgba(168, 85, 247, 0.28)';
    ctx.font = 'bold 28px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?  MYSTERY  ?', 256, 114);
  }

  // Center emblem text
  var mainText = String(shortText || label || '?').slice(0, 6);
  var fontSize = mainText.length <= 2 ? 172 : (mainText.length <= 4 ? 104 : 74);
  ctx.font = '900 ' + fontSize + 'px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(mainText, 256, 244);
  ctx.fillStyle = palette.ink;
  ctx.fillText(mainText, 256, 248);

  bctx.font = '900 ' + fontSize + 'px system-ui, -apple-system, sans-serif';
  bctx.textAlign = 'center';
  bctx.textBaseline = 'middle';
  bctx.fillStyle = '#ffffff';
  bctx.fillText(mainText, 256, 248);

  // Sub-label
  ctx.font = '700 32px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = palette.ink;
  ctx.fillText(String(label || '').toUpperCase().slice(0, 12), 256, 366);

  bctx.font = '700 32px system-ui, -apple-system, sans-serif';
  bctx.fillStyle = '#e5e5e5';
  bctx.fillText(String(label || '').toUpperCase().slice(0, 12), 256, 366);

  var map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  var bump = new THREE.CanvasTexture(b);
  return { map: map, bumpMap: bump };
}

var PIP_COORDS = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]]
};

function makeDieFaceTextures(faceNum, style) {
  var c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  var ctx = c.getContext('2d');

  var b = document.createElement('canvas');
  b.width = 256;
  b.height = 256;
  var bctx = b.getContext('2d');

  var grad = ctx.createRadialGradient(108, 92, 16, 128, 128, 175);
  grad.addColorStop(0, style.bgHi);
  grad.addColorStop(1, style.bgLo);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  bctx.fillStyle = '#e8e8e8';
  bctx.fillRect(0, 0, 256, 256);

  var pips = PIP_COORDS[faceNum] || [];
  var pipColor = (faceNum === 1 || faceNum === 6) && style.accentPip ? style.accentPip : style.pip;
  var radius = faceNum === 1 ? 26 : 20;

  pips.forEach(function (pt) {
    var x = pt[0] * 256;
    var y = pt[1] * 256;

    // Recessed rim highlight
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.arc(x + 1.5, y + 2, radius + 2, 0, Math.PI * 2);
    ctx.fill();

    var pGrad = ctx.createRadialGradient(x - radius * 0.25, y - radius * 0.25, 2, x, y, radius);
    pGrad.addColorStop(0, pipColor);
    pGrad.addColorStop(1, style.pipEdge);
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    var bGrad = bctx.createRadialGradient(x, y, 2, x, y, radius + 3);
    bGrad.addColorStop(0, '#101010');
    bGrad.addColorStop(0.82, '#353535');
    bGrad.addColorStop(1, '#e8e8e8');
    bctx.fillStyle = bGrad;
    bctx.beginPath();
    bctx.arc(x, y, radius + 3, 0, Math.PI * 2);
    bctx.fill();
  });

  var map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.userData.shared = true;
  var bump = new THREE.CanvasTexture(b);
  bump.userData.shared = true;
  return { map: map, bumpMap: bump };
}

function makeCardBackTexture() {
  var c = document.createElement('canvas');
  c.width = 384;
  c.height = 512;
  var ctx = c.getContext('2d');

  ctx.fillStyle = '#fff9ef';
  ctx.fillRect(0, 0, 384, 512);

  ctx.fillStyle = '#172554';
  ctx.fillRect(22, 22, 340, 468);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, 320, 448);

  ctx.strokeStyle = 'rgba(253, 230, 138, 0.35)';
  ctx.lineWidth = 2;
  for (var y = 44; y < 468; y += 26) {
    for (var x = 44; x < 340; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x + 13, y);
      ctx.lineTo(x + 26, y + 13);
      ctx.lineTo(x + 13, y + 26);
      ctx.lineTo(x, y + 13);
      ctx.closePath();
      ctx.stroke();
    }
  }

  ctx.fillStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.arc(192, 256, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', 192, 258);

  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.shared = true;
  return tex;
}

function makeCardFrontTexture(outcome) {
  var c = document.createElement('canvas');
  c.width = 384;
  c.height = 512;
  var ctx = c.getContext('2d');

  var bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#fffdf7');
  bg.addColorStop(1, '#f5ebd6');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 384, 512);

  // Subtle linen grain
  ctx.fillStyle = 'rgba(120, 90, 50, 0.03)';
  for (var i = 0; i < 512; i += 4) {
    ctx.fillRect(0, i, 384, 1);
  }

  var color = outcome.color || '#1e293b';
  if (outcome.key === 'clubs' || outcome.key === 'spades' || outcome.key === 'black' || outcome.key === 'not-face') {
    color = '#1e293b';
  }
  if (outcome.key === 'diamonds') {
    color = '#dc2626';
  }

  ctx.strokeStyle = 'rgba(180, 130, 55, 0.45)';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 344, 472);

  var cornerText = outcome.short || outcome.label.slice(0, 3);
  ctx.fillStyle = color;
  ctx.font = '900 42px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(cornerText, 36, 34);

  ctx.save();
  ctx.translate(348, 478);
  ctx.rotate(Math.PI);
  ctx.fillText(cornerText, 0, 0);
  ctx.restore();

  // Center artwork
  var centerGlyph = (outcome.meta && outcome.meta.symbol) ||
    (outcome.key === 'face' ? '♛' : (outcome.key === 'red' ? '♥' : (outcome.key === 'black' ? '♠' : outcome.short)));
  var centerSize = centerGlyph.length <= 2 ? 156 : 74;
  ctx.font = '900 ' + centerSize + 'px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillText(centerGlyph, 196, 246);
  ctx.fillStyle = color;
  ctx.fillText(centerGlyph, 192, 242);

  ctx.font = '800 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(outcome.label.toUpperCase(), 192, 392);

  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeDeckSideTexture() {
  var c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  var ctx = c.getContext('2d');
  ctx.fillStyle = '#f3ead8';
  ctx.fillRect(0, 0, 64, 128);
  for (var y = 0; y < 128; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? 'rgba(90, 65, 35, 0.25)' : 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(0, y, 64, 1.5);
  }
  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.shared = true;
  return tex;
}

function makeMarbleSwirlTexture(hexColor) {
  var c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  var ctx = c.getContext('2d');

  var base = new THREE.Color(hexColor || '#ef4444');
  var light = base.clone().lerp(new THREE.Color('#ffffff'), 0.45);
  var dark = base.clone().lerp(new THREE.Color('#09090b'), 0.45);

  var g = ctx.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, '#' + light.getHexString());
  g.addColorStop(0.5, '#' + base.getHexString());
  g.addColorStop(1, '#' + dark.getHexString());
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  // Cat's-eye internal glass ribbons
  for (var i = 0; i < 6; i += 1) {
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 10 - i;
    ctx.beginPath();
    ctx.moveTo(0, 35 + i * 32);
    ctx.bezierCurveTo(85, 10 + i * 28, 170, 220 - i * 18, 256, 70 + i * 26);
    ctx.stroke();
  }

  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSpinnerLabelDiscTexture(outcomes) {
  var c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  var ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 1024, 1024);

  var cx = 512;
  var cy = 512;
  var start = Math.PI * 0.5;
  outcomes.forEach(function (slice) {
    var span = Math.PI * 2 * slice.weight;
    var mid = start + span * 0.5;
    var radius = outcomes.length > 5 ? 315 : 290;
    // Map wheel XY angle (counter-clockwise from +X) to Canvas2D (y-down)
    var canvasAngle = -mid;
    var lx = cx + Math.cos(canvasAngle) * radius;
    var ly = cy + Math.sin(canvasAngle) * radius;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(canvasAngle + Math.PI * 0.5);
    var label = String(slice.label || '').slice(0, 11);
    ctx.font = '800 ' + (span < 0.55 ? 28 : 34) + 'px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(15, 10, 4, 0.72)';
    ctx.strokeText(label, 0, 0);
    ctx.fillStyle = '#fffdf7';
    ctx.fillText(label, 0, 0);
    ctx.restore();

    start += span;
  });

  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

var DIE_FACE_ROTATIONS = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, Math.PI / 2],
  4: [0, 0, -Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0]
};

var CAMERA_PRESETS = {
  coin: { pos: [0, 2.75, 4.35], target: [0, 0.45, 0] },
  die: { pos: [0, 2.95, 4.1], target: [0, 0.45, 0] },
  'two-dice': { pos: [0, 3.15, 4.45], target: [0, 0.45, 0] },
  card: { pos: [0.1, 2.65, 4.75], target: [0.05, 0.68, 0] },
  spinner: { pos: [0, 3.35, 5.15], target: [0, 0.72, 0] },
  marbles: { pos: [0.15, 3.2, 4.25], target: [0, 0.38, 0] },
  weather: { pos: [0, 2.7, 4.55], target: [0, 0.62, 0] }
};

function mountProbability3D() {
  var stageDisplay = document.getElementById('ps-stage-display');
  if (!stageDisplay || !hasWebGL()) return null;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  stageDisplay.innerHTML = '';
  stageDisplay.classList.add('ps-has-3d');

  var shell = document.createElement('div');
  shell.className = 'ps-stage-3d-shell';

  var canvas = document.createElement('canvas');
  canvas.id = 'ps-stage-canvas';
  canvas.className = 'ps-stage-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  var hud = document.createElement('div');
  hud.className = 'ps-stage-hud';

  var outcomePill = document.createElement('div');
  outcomePill.className = 'ps-stage-hud-outcome';
  outcomePill.textContent = '3D Lab Ready';

  var hudRight = document.createElement('div');
  hudRight.className = 'ps-stage-hud-actions';

  var orbitHint = document.createElement('span');
  orbitHint.className = 'ps-stage-orbit-hint';
  orbitHint.textContent = 'Drag to orbit';

  var resetCamBtn = document.createElement('button');
  resetCamBtn.type = 'button';
  resetCamBtn.className = 'ps-stage-reset-cam';
  resetCamBtn.textContent = 'Reset view';

  hudRight.appendChild(orbitHint);
  hudRight.appendChild(resetCamBtn);
  hud.appendChild(outcomePill);
  hud.appendChild(hudRight);
  shell.appendChild(canvas);
  shell.appendChild(hud);
  stageDisplay.appendChild(shell);

  var sceneBundle;
  try {
    sceneBundle = createScene(canvas, {
      THREE: THREE,
      fov: 36,
      near: 0.1,
      far: 60,
      alpha: true,
      antialias: true
    });
  } catch (_) {
    stageDisplay.classList.remove('ps-has-3d');
    stageDisplay.innerHTML = '';
    return null;
  }

  var renderer = sceneBundle.renderer;
  var scene = sceneBundle.scene;
  var camera = sceneBundle.camera;
  var syncSize = sceneBundle.syncSize;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var envTarget = makeStudioEnvironment(renderer);
  scene.environment = envTarget.texture;

  // Lighting rig
  var hemiLight = new THREE.HemisphereLight(0xd8e8ff, 0x2c1b09, 0.72);
  scene.add(hemiLight);

  var keyLight = new THREE.DirectionalLight(0xfff4df, 2.25);
  keyLight.position.set(3.8, 7.2, 4.8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 20;
  keyLight.shadow.camera.left = -3.8;
  keyLight.shadow.camera.right = 3.8;
  keyLight.shadow.camera.top = 3.8;
  keyLight.shadow.camera.bottom = -3.8;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.radius = 3;
  scene.add(keyLight);

  var rimWarm = new THREE.DirectionalLight(0xfbbf24, 1.15);
  rimWarm.position.set(-4.2, 3.6, -4.0);
  scene.add(rimWarm);

  var rimCool = new THREE.PointLight(0x60a5fa, 0.9, 16);
  rimCool.position.set(4.0, 2.5, -3.2);
  scene.add(rimCool);

  // Persistent pedestal tabletop
  var tableTexture = makeTableTexture();
  var pedestalGroup = new THREE.Group();
  var tableGeo = new THREE.CylinderGeometry(3.38, 3.64, 0.28, 64);
  var tableMat = new THREE.MeshStandardMaterial({
    map: tableTexture,
    roughness: 0.78,
    metalness: 0.08
  });
  var tableMesh = new THREE.Mesh(tableGeo, tableMat);
  tableMesh.position.y = -0.14;
  tableMesh.receiveShadow = true;
  tableMesh.userData.sharedGeometry = true;
  tableMesh.userData.sharedMaterial = true;
  pedestalGroup.add(tableMesh);

  var brassMat = new THREE.MeshStandardMaterial({
    color: 0xd99b26,
    metalness: 0.88,
    roughness: 0.24
  });
  brassMat.userData.shared = true;

  var collarGeo = new THREE.TorusGeometry(3.4, 0.068, 16, 80);
  var collarMesh = new THREE.Mesh(collarGeo, brassMat);
  collarMesh.rotation.x = Math.PI * 0.5;
  collarMesh.position.y = 0.0;
  collarMesh.receiveShadow = true;
  collarMesh.userData.sharedGeometry = true;
  collarMesh.userData.sharedMaterial = true;
  pedestalGroup.add(collarMesh);

  var inlayGeo = new THREE.TorusGeometry(2.55, 0.018, 12, 72);
  var inlayMesh = new THREE.Mesh(inlayGeo, brassMat);
  inlayMesh.rotation.x = Math.PI * 0.5;
  inlayMesh.position.y = 0.004;
  inlayMesh.userData.sharedGeometry = true;
  inlayMesh.userData.sharedMaterial = true;
  pedestalGroup.add(inlayMesh);
  scene.add(pedestalGroup);

  // OrbitControls (zoom disabled so page scroll is never captured)
  var controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = 0.22;
  controls.maxPolarAngle = Math.PI * 0.44;

  var activePresetKey = 'coin';
  var cameraDirty = false;
  controls.addEventListener('start', function () {
    cameraDirty = true;
  });

  function applyCameraPreset(key, force) {
    activePresetKey = key;
    if (cameraDirty && !force) return;
    var preset = CAMERA_PRESETS[key] || CAMERA_PRESETS.coin;
    camera.position.set(preset.pos[0], preset.pos[1], preset.pos[2]);
    controls.target.set(preset.target[0], preset.target[1], preset.target[2]);
    controls.update();
  }

  resetCamBtn.addEventListener('click', function () {
    cameraDirty = false;
    applyCameraPreset(activePresetKey, true);
  });

  // Shared static geometry & texture caches
  var reededBump = makeReededEdgeBump();
  var cardBackTex = makeCardBackTexture();
  var deckSideTex = makeDeckSideTexture();
  var sharedRoundedDieGeo = createRoundedBoxGeometry(0.96, 0.14, 5);
  var ivoryDieMats = [];
  var cobaltDieMats = [];

  for (var f = 1; f <= 6; f += 1) {
    var ivoryTex = makeDieFaceTextures(f, {
      bgHi: '#fffdf7',
      bgLo: '#eadac0',
      pip: '#1e293b',
      pipEdge: '#090d16',
      accentPip: '#c2410c'
    });
    var ivoryMat = new THREE.MeshStandardMaterial({
      map: ivoryTex.map,
      bumpMap: ivoryTex.bumpMap,
      bumpScale: 0.035,
      roughness: 0.24,
      metalness: 0.06
    });
    ivoryMat.userData.shared = true;
    ivoryDieMats.push(ivoryMat);

    var cobaltTex = makeDieFaceTextures(f, {
      bgHi: '#2563eb',
      bgLo: '#172554',
      pip: '#fde68a',
      pipEdge: '#b45309',
      accentPip: '#fff7ed'
    });
    var cobaltMat = new THREE.MeshStandardMaterial({
      map: cobaltTex.map,
      bumpMap: cobaltTex.bumpMap,
      bumpScale: 0.035,
      roughness: 0.2,
      metalness: 0.14
    });
    cobaltMat.userData.shared = true;
    cobaltDieMats.push(cobaltMat);
  }

  // Group order in BoxGeometry: [+X, -X, +Y, -Y, +Z, -Z] -> [3, 4, 1, 6, 2, 5]
  var dieMaterialOrder = [2, 3, 0, 5, 1, 4];
  var ivoryOrderedMats = dieMaterialOrder.map(function (idx) { return ivoryDieMats[idx]; });
  var cobaltOrderedMats = dieMaterialOrder.map(function (idx) { return cobaltDieMats[idx]; });

  // Active actor state
  var actorRoot = new THREE.Group();
  scene.add(actorRoot);
  var activeSignature = '';
  var activeActor = null;
  var animState = null;
  var isVisible = true;
  var rafId = null;

  function clearActor() {
    while (actorRoot.children.length) {
      var child = actorRoot.children[0];
      actorRoot.remove(child);
      disposeObjectResources(child);
    }
    activeActor = null;
    activeSignature = '';
  }

  function resolvePresetKey(config) {
    if (config.family === 'rolling') return 'die';
    if (config.family === 'rolling-pair') return 'two-dice';
    if (config.family === 'rotational') return 'spinner';
    if (config.family === 'draw-set') return 'marbles';
    if (config.id === 'weather') return 'weather';
    if (config.id.indexOf('card') === 0) return 'card';
    return 'coin';
  }

  function buildCoinActor(config) {
    var group = new THREE.Group();
    var o0 = config.outcomes[0] || { label: 'Heads', short: 'H' };
    var o1 = config.outcomes[1] || { label: 'Tails', short: 'T' };
    var isLoaded = config.id === 'biased-coin';
    var isMystery = config.id === 'mystery-coin';

    var goldPal = isMystery
      ? { hi: '#f5d0fe', mid: '#c084fc', lo: '#7e22ce', ink: '#2e1065', rimStroke: '#fde68a' }
      : { hi: '#fef3c7', mid: '#f59e0b', lo: '#92400e', ink: '#451a03', rimStroke: '#fffbeb' };
    var silverPal = isLoaded
      ? { hi: '#fed7aa', mid: '#d97706', lo: '#7c2d12', ink: '#271204', rimStroke: '#fbbf24' }
      : { hi: '#f8fafc', mid: '#cbd5e1', lo: '#64748b', ink: '#1e293b', rimStroke: '#ffffff' };

    var topTex = makeCoinFaceTextures(o0.label, o0.short, goldPal, isMystery);
    var botTex = makeCoinFaceTextures(o1.label, o1.short, silverPal, isMystery);

    var edgeMat = new THREE.MeshStandardMaterial({
      color: isMystery ? 0xc084fc : 0xf59e0b,
      bumpMap: reededBump,
      bumpScale: 0.04,
      metalness: 0.88,
      roughness: 0.24
    });

    var coinPivot = new THREE.Group();
    var bodyGeo = new THREE.CylinderGeometry(1.12, 1.12, 0.16, 64);
    var body = new THREE.Mesh(bodyGeo, edgeMat);
    body.castShadow = true;
    body.receiveShadow = true;
    coinPivot.add(body);

    var topMat = new THREE.MeshStandardMaterial({
      map: topTex.map,
      bumpMap: topTex.bumpMap,
      bumpScale: 0.032,
      metalness: 0.82,
      roughness: 0.24
    });
    var topDisc = new THREE.Mesh(new THREE.CircleGeometry(1.09, 64), topMat);
    topDisc.rotation.x = -Math.PI * 0.5;
    topDisc.position.y = 0.082;
    topDisc.castShadow = true;
    topDisc.receiveShadow = true;
    coinPivot.add(topDisc);

    var botMat = new THREE.MeshStandardMaterial({
      map: botTex.map,
      bumpMap: botTex.bumpMap,
      bumpScale: 0.032,
      metalness: 0.78,
      roughness: 0.28
    });
    var botDisc = new THREE.Mesh(new THREE.CircleGeometry(1.09, 64), botMat);
    botDisc.rotation.x = Math.PI * 0.5;
    botDisc.position.y = -0.082;
    botDisc.castShadow = true;
    botDisc.receiveShadow = true;
    coinPivot.add(botDisc);

    var rimGeo = new THREE.TorusGeometry(1.09, 0.048, 16, 64);
    var rimTop = new THREE.Mesh(rimGeo, edgeMat);
    rimTop.rotation.x = Math.PI * 0.5;
    rimTop.position.y = 0.072;
    rimTop.castShadow = true;
    coinPivot.add(rimTop);

    var rimBot = new THREE.Mesh(rimGeo, edgeMat);
    rimBot.rotation.x = Math.PI * 0.5;
    rimBot.position.y = -0.072;
    rimBot.castShadow = true;
    coinPivot.add(rimBot);

    if (isLoaded) {
      var weightStud = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.19, 20),
        new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.9, roughness: 0.2 })
      );
      weightStud.position.set(0.84, 0, 0);
      weightStud.castShadow = true;
      coinPivot.add(weightStud);
    }

    coinPivot.position.y = 0.13;
    group.add(coinPivot);
    actorRoot.add(group);
    return { type: 'coin', pivot: coinPivot };
  }

  function buildDiceActor(isPair) {
    var group = new THREE.Group();
    var dice = [];
    var count = isPair ? 2 : 1;

    for (var i = 0; i < count; i += 1) {
      var pivot = new THREE.Group();
      var mats = i === 0 ? ivoryOrderedMats : cobaltOrderedMats;
      var mesh = new THREE.Mesh(sharedRoundedDieGeo, mats);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.sharedGeometry = true;
      mesh.userData.sharedMaterial = true;
      pivot.add(mesh);

      var baseX = isPair ? (i === 0 ? -0.78 : 0.78) : 0;
      var baseZ = isPair ? (i === 0 ? 0.14 : -0.14) : 0;
      pivot.position.set(baseX, 0.48, baseZ);
      pivot.rotation.y = isPair ? (i === 0 ? 0.22 : -0.26) : 0.18;
      group.add(pivot);
      dice.push({ pivot: pivot, mesh: mesh, baseX: baseX, baseZ: baseZ });
    }

    actorRoot.add(group);
    return { type: isPair ? 'two-dice' : 'die', dice: dice };
  }

  function buildCardActor(config) {
    var group = new THREE.Group();

    // Brass card easel stand on right
    var easel = new THREE.Group();
    easel.position.set(0.66, 0, 0.1);
    easel.rotation.y = -0.18;

    var basePlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.85, 0.08, 32),
      brassMat
    );
    basePlate.position.y = 0.04;
    basePlate.castShadow = true;
    basePlate.receiveShadow = true;
    basePlate.userData.sharedMaterial = true;
    easel.add(basePlate);

    var backRest = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.08, 0.55),
      brassMat
    );
    backRest.position.set(0, 0.14, -0.05);
    backRest.rotation.x = 0.35;
    backRest.castShadow = true;
    backRest.userData.sharedMaterial = true;
    easel.add(backRest);
    group.add(easel);

    // Stacked deck on left
    var deckMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.38, 0.46, 1.92),
      [
        new THREE.MeshStandardMaterial({ map: deckSideTex, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ map: deckSideTex, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ map: cardBackTex, roughness: 0.45 }),
        new THREE.MeshStandardMaterial({ map: deckSideTex, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ map: deckSideTex, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ map: deckSideTex, roughness: 0.7 })
      ]
    );
    deckMesh.position.set(-1.32, 0.23, 0.05);
    deckMesh.rotation.y = 0.12;
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    group.add(deckMesh);

    // Drawn hero card
    var cardW = 1.4;
    var cardH = 1.94;
    var cardShape = createRoundedRectShape(cardW, cardH, 0.12);
    var cardSlabGeo = new THREE.ExtrudeGeometry(cardShape, {
      depth: 0.028,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 2
    });
    cardSlabGeo.center();

    var cardPivot = new THREE.Group();
    var slabMesh = new THREE.Mesh(
      cardSlabGeo,
      new THREE.MeshStandardMaterial({ color: 0xfef9ef, roughness: 0.5, metalness: 0.08 })
    );
    slabMesh.castShadow = true;
    slabMesh.receiveShadow = true;
    cardPivot.add(slabMesh);

    var faceGeo = createNormalizedShapeGeometry(cardShape, cardW, cardH, 8);
    var frontTex = makeCardFrontTexture(config.outcomes[0]);
    var frontMat = new THREE.MeshStandardMaterial({
      map: frontTex,
      roughness: 0.36,
      metalness: 0.04
    });
    var frontMesh = new THREE.Mesh(faceGeo, frontMat);
    frontMesh.position.z = 0.02;
    cardPivot.add(frontMesh);

    var backMat = new THREE.MeshStandardMaterial({
      map: cardBackTex,
      roughness: 0.42,
      metalness: 0.08
    });
    var backMesh = new THREE.Mesh(faceGeo, backMat);
    backMesh.rotation.y = Math.PI;
    backMesh.position.z = -0.02;
    backMesh.userData.sharedGeometry = true;
    cardPivot.add(backMesh);

    cardPivot.position.set(0.66, 1.02, 0.12);
    cardPivot.rotation.set(-0.22, -0.18, 0);
    group.add(cardPivot);

    actorRoot.add(group);
    return {
      type: 'card',
      deckMesh: deckMesh,
      cardPivot: cardPivot,
      frontMat: frontMat,
      config: config
    };
  }

  function buildSpinnerActor(config) {
    var group = new THREE.Group();

    // Angled easel column
    var standBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.15, 0.14, 36),
      brassMat
    );
    standBase.position.set(0, 0.07, -0.35);
    standBase.castShadow = true;
    standBase.receiveShadow = true;
    standBase.userData.sharedMaterial = true;
    group.add(standBase);

    var standNeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.16, 1.05, 20),
      brassMat
    );
    standNeck.position.set(0, 0.52, -0.35);
    standNeck.rotation.x = 0.32;
    standNeck.castShadow = true;
    standNeck.userData.sharedMaterial = true;
    group.add(standNeck);

    // Tilted wheel assembly
    var easelGroup = new THREE.Group();
    easelGroup.position.set(0, 0.76, 0.08);
    easelGroup.rotation.x = -0.92;

    var spinGroup = new THREE.Group();
    var radius = 1.42;
    var startAngle = Math.PI * 0.5;
    var sliceMeta = [];

    config.outcomes.forEach(function (slice) {
      var span = Math.PI * 2 * slice.weight;
      var endAngle = startAngle + span;
      var midAngle = startAngle + span * 0.5;

      var shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.absarc(0, 0, radius, startAngle, endAngle, false);
      shape.lineTo(0, 0);

      var wedgeGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.14,
        bevelEnabled: true,
        bevelThickness: 0.032,
        bevelSize: 0.022,
        bevelSegments: 3,
        curveSegments: Math.max(12, Math.round(span * 20))
      });
      var wedgeMat = new THREE.MeshStandardMaterial({
        color: slice.color || '#f59e0b',
        roughness: 0.26,
        metalness: 0.14
      });
      var wedge = new THREE.Mesh(wedgeGeo, wedgeMat);
      wedge.castShadow = true;
      wedge.receiveShadow = true;
      spinGroup.add(wedge);

      // Divider pin at slice start
      var pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.036, 0.24, 12),
        brassMat
      );
      pin.rotation.x = Math.PI * 0.5;
      pin.position.set(Math.cos(startAngle) * (radius - 0.06), Math.sin(startAngle) * (radius - 0.06), 0.12);
      pin.castShadow = true;
      pin.userData.sharedMaterial = true;
      spinGroup.add(pin);

      sliceMeta.push({ midAngle: midAngle, span: span, boundaryAngle: startAngle });
      startAngle = endAngle;
    });

    // Outer brass bezel
    var bezel = new THREE.Mesh(
      new THREE.TorusGeometry(radius + 0.04, 0.075, 18, 72),
      brassMat
    );
    bezel.position.z = 0.08;
    bezel.castShadow = true;
    bezel.userData.sharedMaterial = true;
    spinGroup.add(bezel);

    // Label overlay disc
    var labelTex = makeSpinnerLabelDiscTexture(config.outcomes);
    var labelDisc = new THREE.Mesh(
      new THREE.CircleGeometry(radius - 0.04, 64),
      new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthWrite: false })
    );
    labelDisc.position.z = 0.178;
    spinGroup.add(labelDisc);

    // Center hub cap
    var hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.25, 32),
      brassMat
    );
    hub.rotation.x = Math.PI * 0.5;
    hub.position.z = 0.12;
    hub.castShadow = true;
    hub.userData.sharedMaterial = true;
    spinGroup.add(hub);

    easelGroup.add(spinGroup);

    // Fixed 12 o'clock brass pointer bracket + flapper
    var pointerMount = new THREE.Group();
    pointerMount.position.set(0, radius + 0.2, 0.22);

    var bracket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), brassMat);
    bracket.castShadow = true;
    bracket.userData.sharedMaterial = true;
    pointerMount.add(bracket);

    var flapperPivot = new THREE.Group();
    flapperPivot.position.set(0, -0.02, 0.04);
    var flapperShape = new THREE.Shape();
    flapperShape.moveTo(-0.11, 0);
    flapperShape.lineTo(0.11, 0);
    flapperShape.lineTo(0, -0.38);
    flapperShape.closePath();

    var flapperGeo = new THREE.ExtrudeGeometry(flapperShape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2
    });
    var flapper = new THREE.Mesh(
      flapperGeo,
      new THREE.MeshStandardMaterial({ color: 0xfff7ed, roughness: 0.22, metalness: 0.2 })
    );
    flapper.position.z = -0.025;
    flapper.castShadow = true;
    flapperPivot.add(flapper);
    pointerMount.add(flapperPivot);

    easelGroup.add(pointerMount);
    group.add(easelGroup);
    actorRoot.add(group);

    return {
      type: 'spinner',
      spinGroup: spinGroup,
      flapperPivot: flapperPivot,
      sliceMeta: sliceMeta,
      currentTheta: 0
    };
  }

  function buildMarblesActor(config) {
    var group = new THREE.Group();

    // Sculpted lathe leather/wood bowl on back-left
    var bowlProfile = [
      new THREE.Vector2(0.01, 0.0),
      new THREE.Vector2(0.92, 0.0),
      new THREE.Vector2(1.22, 0.38),
      new THREE.Vector2(1.3, 0.78),
      new THREE.Vector2(1.18, 0.8),
      new THREE.Vector2(1.06, 0.42),
      new THREE.Vector2(0.76, 0.14),
      new THREE.Vector2(0.01, 0.14)
    ];
    var bowlGeo = new THREE.LatheGeometry(bowlProfile, 48);
    var bowlMat = new THREE.MeshStandardMaterial({
      color: 0x6b2d12,
      roughness: 0.56,
      metalness: 0.12
    });
    var bowlMesh = new THREE.Mesh(bowlGeo, bowlMat);
    bowlMesh.position.set(-0.62, 0, -0.18);
    bowlMesh.castShadow = true;
    bowlMesh.receiveShadow = true;
    group.add(bowlMesh);

    var bowlRim = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.06, 16, 48), brassMat);
    bowlRim.rotation.x = Math.PI * 0.5;
    bowlRim.position.set(-0.62, 0.79, -0.18);
    bowlRim.castShadow = true;
    bowlRim.userData.sharedMaterial = true;
    group.add(bowlRim);

    // Small foreground-right brass inspection dish
    var dish = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.08, 32), brassMat);
    dish.position.set(1.28, 0.04, 0.45);
    dish.receiveShadow = true;
    dish.castShadow = true;
    dish.userData.sharedMaterial = true;
    group.add(dish);

    var dishFelt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 0.03, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e140b, roughness: 0.85 })
    );
    dishFelt.position.set(1.28, 0.075, 0.45);
    dishFelt.receiveShadow = true;
    group.add(dishFelt);

    // Pre-build one marble material per outcome
    var marbleGeo = new THREE.SphereGeometry(0.22, 28, 22);
    var outcomeMats = config.outcomes.map(function (o) {
      var tex = makeMarbleSwirlTexture(o.color);
      return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.08,
        metalness: 0.08,
        envMapIntensity: 1.5
      });
    });

    var poolGroup = new THREE.Group();
    poolGroup.position.set(-0.62, 0.16, -0.18);
    group.add(poolGroup);

    var heroMarble = new THREE.Mesh(marbleGeo, outcomeMats[0]);
    heroMarble.position.set(1.28, 0.3, 0.45);
    heroMarble.castShadow = true;
    heroMarble.receiveShadow = true;
    group.add(heroMarble);

    var heroGlow = new THREE.PointLight(0xffffff, 0.75, 2.2);
    heroGlow.position.set(1.28, 0.62, 0.45);
    group.add(heroGlow);

    actorRoot.add(group);
    return {
      type: 'marbles',
      config: config,
      marbleGeo: marbleGeo,
      outcomeMats: outcomeMats,
      poolGroup: poolGroup,
      heroMarble: heroMarble,
      heroGlow: heroGlow
    };
  }

  function syncMarblePool(actor, state, selectedIdx) {
    while (actor.poolGroup.children.length) {
      actor.poolGroup.remove(actor.poolGroup.children[0]);
    }
    var counts = [];
    if (state && state.withoutReplacement && state.pool) {
      counts = state.pool.slice();
    } else {
      actor.config.outcomes.forEach(function (o, idx) {
        var c = Math.max(1, Math.round(o.weight * 9));
        if (idx === selectedIdx && c > 1) c -= 1;
        counts.push(c);
      });
    }

    var slots = [];
    counts.forEach(function (n, idx) {
      var cap = Math.min(n, 10);
      for (var i = 0; i < cap; i += 1) slots.push(idx);
    });
    slots = slots.slice(0, 18);

    slots.forEach(function (outcomeIdx, i) {
      var m = new THREE.Mesh(actor.marbleGeo, actor.outcomeMats[outcomeIdx % actor.outcomeMats.length]);
      var ring = i < 1 ? 0 : (i < 7 ? 1 : 2);
      var layerY = i < 12 ? 0.2 : 0.52;
      var angle = (i * 2.39996);
      var rad = ring === 0 ? 0 : (ring === 1 ? 0.44 : 0.78);
      m.position.set(Math.cos(angle) * rad, layerY, Math.sin(angle) * rad);
      m.rotation.set(i * 0.7, i * 1.1, i * 0.4);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.sharedGeometry = true;
      m.userData.sharedMaterial = true;
      actor.poolGroup.add(m);
    });
  }

  function buildWeatherActor() {
    var group = new THREE.Group();

    // Grounded miniature diorama disc
    var disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.85, 0.14, 48),
      new THREE.MeshStandardMaterial({ color: 0x3b4d2b, roughness: 0.78, metalness: 0.05 })
    );
    disc.position.y = 0.07;
    disc.receiveShadow = true;
    disc.castShadow = true;
    group.add(disc);

    // Sunny cluster
    var sunGroup = new THREE.Group();
    var sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.56, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.65,
        roughness: 0.2,
        metalness: 0.3
      })
    );
    sunSphere.position.y = 1.18;
    sunSphere.castShadow = true;
    sunGroup.add(sunSphere);

    var raysGroup = new THREE.Group();
    raysGroup.position.y = 1.18;
    var rayGeo = new THREE.ConeGeometry(0.11, 0.38, 12);
    var rayMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
      roughness: 0.25
    });
    for (var i = 0; i < 10; i += 1) {
      var ray = new THREE.Mesh(rayGeo, rayMat);
      var ang = (i / 10) * Math.PI * 2;
      ray.position.set(Math.cos(ang) * 0.82, Math.sin(ang) * 0.82, 0);
      ray.rotation.z = ang - Math.PI * 0.5;
      raysGroup.add(ray);
    }
    sunGroup.add(raysGroup);
    group.add(sunGroup);

    // Cloud cluster (shared style for cloudy & rainy)
    var cloudGroup = new THREE.Group();
    cloudGroup.position.y = 1.28;
    var cloudMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.65, metalness: 0.04 });
    var puffs = [
      [0, 0.14, 0, 0.46],
      [-0.44, 0.02, 0.06, 0.36],
      [0.44, 0.04, -0.05, 0.38],
      [-0.2, -0.06, 0.24, 0.32],
      [0.24, -0.04, 0.22, 0.34]
    ];
    puffs.forEach(function (p) {
      var puff = new THREE.Mesh(new THREE.SphereGeometry(p[3], 24, 18), cloudMat);
      puff.position.set(p[0], p[1], p[2]);
      puff.castShadow = true;
      cloudGroup.add(puff);
    });
    group.add(cloudGroup);

    // Raindrops + puddle ring
    var rainGroup = new THREE.Group();
    var dropGeo = new THREE.CapsuleGeometry(0.036, 0.14, 6, 10);
    var dropMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.12,
      metalness: 0.1
    });
    var drops = [];
    for (var d = 0; d < 14; d += 1) {
      var drop = new THREE.Mesh(dropGeo, dropMat);
      var dx = ((d % 5) - 2) * 0.28 + (d % 2 === 0 ? 0.08 : -0.08);
      var dz = (Math.floor(d / 5) - 1) * 0.24;
      drop.position.set(dx, 0.35 + (d % 4) * 0.22, dz);
      drop.userData.baseX = dx;
      drop.userData.phase = d * 0.23;
      rainGroup.add(drop);
      drops.push(drop);
    }
    var ripple = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.02, 10, 40),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.6 })
    );
    ripple.rotation.x = Math.PI * 0.5;
    ripple.position.y = 0.16;
    rainGroup.add(ripple);
    group.add(rainGroup);

    actorRoot.add(group);
    return {
      type: 'weather',
      disc: disc,
      sunGroup: sunGroup,
      raysGroup: raysGroup,
      cloudGroup: cloudGroup,
      cloudMat: cloudMat,
      rainGroup: rainGroup,
      drops: drops,
      ripple: ripple,
      mode: 'sunny'
    };
  }

  function ensureActor(config) {
    var sig = config.id + '|' + config.family + '|' + config.outcomes.map(function (o) {
      return o.key + ':' + o.label + ':' + o.weight.toFixed(4);
    }).join(',');
    if (activeSignature === sig && activeActor) return activeActor;

    clearActor();
    activeSignature = sig;
    applyCameraPreset(resolvePresetKey(config), false);

    if (config.id.indexOf('card') === 0) {
      activeActor = buildCardActor(config);
    } else if (config.id === 'weather') {
      activeActor = buildWeatherActor();
    } else if (config.family === 'rolling') {
      activeActor = buildDiceActor(false);
    } else if (config.family === 'rolling-pair') {
      activeActor = buildDiceActor(true);
    } else if (config.family === 'rotational') {
      activeActor = buildSpinnerActor(config);
    } else if (config.family === 'draw-set') {
      activeActor = buildMarblesActor(config);
    } else {
      activeActor = buildCoinActor(config);
    }
    return activeActor;
  }

  function startAnimation(config, trialData, state) {
    var actor = ensureActor(config);
    var outcome = config.outcomes[trialData.outcomeIndex];
    var now = performance.now();
    var durScale = reducedMotion ? 0.22 : 1;

    if (actor.type === 'coin') {
      var targetX = trialData.outcomeIndex === 0 ? 0 : Math.PI;
      var extraSpins = reducedMotion ? 0 : 4;
      animState = {
        type: 'coin',
        start: now,
        duration: 840 * durScale,
        targetX: targetX,
        startX: targetX - Math.PI * 2 * extraSpins
      };
      outcomePill.textContent = 'Result: ' + outcome.label;
    } else if (actor.type === 'die' || actor.type === 'two-dice') {
      var values = actor.type === 'two-dice' && trialData.meta && trialData.meta.dice
        ? trialData.meta.dice
        : [Number((outcome.meta && outcome.meta.face) || outcome.label) || 1];
      actor.dice.forEach(function (d, idx) {
        var face = clamp(values[idx] || 1, 1, 6);
        var rot = DIE_FACE_ROTATIONS[face];
        d.mesh.rotation.set(rot[0], rot[1], rot[2]);
        d.startYaw = d.pivot.rotation.y;
        d.targetYaw = (idx === 0 ? 0.18 : -0.22) + (Math.random() - 0.5) * 0.24;
      });
      animState = {
        type: 'dice',
        start: now,
        duration: 780 * durScale
      };
      outcomePill.textContent = actor.type === 'two-dice'
        ? 'Rolled ' + values[0] + ' + ' + values[1] + ' (Sum = ' + ((trialData.meta && trialData.meta.sum) || outcome.label) + ')'
        : 'Rolled ' + values[0];
    } else if (actor.type === 'card') {
      var nextTex = makeCardFrontTexture(outcome);
      if (actor.frontMat.map && !actor.frontMat.map.userData?.shared) {
        actor.frontMat.map.dispose();
      }
      actor.frontMat.map = nextTex;
      actor.frontMat.needsUpdate = true;

      var frac = state && state.withoutReplacement && state.pool
        ? Math.max(0.08, state.totalRemaining / 52)
        : 1;
      actor.deckMesh.scale.y = frac;
      actor.deckMesh.position.y = 0.23 * frac;

      animState = {
        type: 'card',
        start: now,
        duration: 740 * durScale,
        deckTopY: 0.46 * frac + 0.08
      };
      outcomePill.textContent = 'Drew: ' + outcome.label +
        (state && state.withoutReplacement ? ' (' + state.totalRemaining + ' left)' : '');
    } else if (actor.type === 'spinner') {
      var meta = actor.sliceMeta[trialData.outcomeIndex] || actor.sliceMeta[0];
      var jitter = (Math.random() - 0.5) * meta.span * 0.45;
      var desiredMod = ((Math.PI * 0.5 - (meta.midAngle + jitter)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      var currMod = ((actor.currentTheta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      var delta = desiredMod - currMod;
      if (delta <= 0) delta += Math.PI * 2;
      var fullSpins = reducedMotion ? 1 : 4;
      var targetTheta = actor.currentTheta + delta + fullSpins * Math.PI * 2;

      animState = {
        type: 'spinner',
        start: now,
        duration: 1080 * durScale,
        startTheta: actor.currentTheta,
        targetTheta: targetTheta
      };
      outcomePill.textContent = 'Pointer landed on ' + outcome.label;
    } else if (actor.type === 'marbles') {
      syncMarblePool(actor, state, trialData.outcomeIndex);
      actor.heroMarble.material = actor.outcomeMats[trialData.outcomeIndex % actor.outcomeMats.length];
      actor.heroGlow.color.set(outcome.color || '#ffffff');
      animState = {
        type: 'marbles',
        start: now,
        duration: 760 * durScale
      };
      outcomePill.textContent = 'Drawn marble: ' + outcome.label +
        (state && state.withoutReplacement ? ' (' + state.totalRemaining + ' left)' : '');
    } else if (actor.type === 'weather') {
      actor.mode = outcome.key;
      var isSunny = outcome.key === 'sunny';
      var isRainy = outcome.key === 'rainy';
      actor.sunGroup.visible = isSunny;
      actor.cloudGroup.visible = !isSunny;
      actor.rainGroup.visible = isRainy;
      actor.cloudMat.color.setHex(isRainy ? 0x64748b : 0xf1f5f9);
      actor.disc.material.color.setHex(isSunny ? 0x4d6b2a : (isRainy ? 0x1e293b : 0x3b4754));
      animState = {
        type: 'weather',
        start: now,
        duration: 620 * durScale
      };
      outcomePill.textContent = 'Forecast: ' + outcome.label;
    }

    ensureLoop();
  }

  function updateAnimation(now) {
    if (!activeActor) return;

    if (animState) {
      var t = clamp((now - animState.start) / animState.duration, 0, 1);

      if (animState.type === 'coin') {
        var e = easeOutCubic(t);
        var arc = Math.sin(t * Math.PI) * 1.9;
        var bounce = t > 0.72 ? Math.abs(Math.sin(((t - 0.72) / 0.28) * Math.PI * 2)) * 0.24 * (1 - t) * 3 : 0;
        activeActor.pivot.position.y = 0.13 + arc + bounce;
        activeActor.pivot.rotation.x = THREE.MathUtils.lerp(animState.startX, animState.targetX, e);
        activeActor.pivot.rotation.z = Math.sin(t * Math.PI * 3) * 0.12 * (1 - t);
      } else if (animState.type === 'dice') {
        var ed = easeOutCubic(t);
        var bounceH = t < 0.65
          ? Math.sin((t / 0.65) * Math.PI) * 1.45
          : Math.abs(Math.sin(((t - 0.65) / 0.35) * Math.PI * 1.5)) * 0.28 * (1 - t) * 2.5;
        activeActor.dice.forEach(function (d, idx) {
          var dir = idx === 0 ? -1 : 1;
          d.pivot.position.x = THREE.MathUtils.lerp(d.baseX + dir * 0.75, d.baseX, ed);
          d.pivot.position.y = 0.48 + bounceH;
          d.pivot.rotation.x = (1 - ed) * (idx === 0 ? 5.2 : -4.6);
          d.pivot.rotation.z = (1 - ed) * (idx === 0 ? -3.4 : 4.1);
          d.pivot.rotation.y = THREE.MathUtils.lerp(d.startYaw, d.targetYaw, ed);
        });
      } else if (animState.type === 'card') {
        var ec = easeOutCubic(t);
        var lift = Math.sin(t * Math.PI) * 0.95;
        activeActor.cardPivot.position.x = THREE.MathUtils.lerp(-1.32, 0.66, ec);
        activeActor.cardPivot.position.y = THREE.MathUtils.lerp(animState.deckTopY, 1.02, ec) + lift;
        activeActor.cardPivot.position.z = THREE.MathUtils.lerp(0.05, 0.12, ec);
        activeActor.cardPivot.rotation.x = THREE.MathUtils.lerp(-Math.PI * 0.5, -0.22, ec);
        activeActor.cardPivot.rotation.y = THREE.MathUtils.lerp(Math.PI, -0.18, ec);
      } else if (animState.type === 'spinner') {
        var es = easeOutQuart(t);
        var theta = THREE.MathUtils.lerp(animState.startTheta, animState.targetTheta, es);
        activeActor.currentTheta = theta;
        activeActor.spinGroup.rotation.z = theta;
        var speed = (1 - es);
        activeActor.flapperPivot.rotation.z = Math.sin(theta * 5) * 0.28 * Math.min(1, speed * 2.4);
      } else if (animState.type === 'marbles') {
        var em = easeOutCubic(t);
        var marbleArc = Math.sin(t * Math.PI) * 1.35;
        var settleBounce = t > 0.75 ? Math.abs(Math.sin(((t - 0.75) / 0.25) * Math.PI)) * 0.14 : 0;
        activeActor.heroMarble.position.x = THREE.MathUtils.lerp(-0.62, 1.28, em);
        activeActor.heroMarble.position.z = THREE.MathUtils.lerp(-0.18, 0.45, em);
        activeActor.heroMarble.position.y = THREE.MathUtils.lerp(0.56, 0.3, em) + marbleArc + settleBounce;
        activeActor.heroMarble.rotation.z = -em * Math.PI * 2.5;
      } else if (animState.type === 'weather') {
        var ew = easeOutCubic(t);
        activeActor.sunGroup.scale.setScalar(0.72 + 0.28 * ew);
        activeActor.cloudGroup.scale.setScalar(0.75 + 0.25 * ew);
      }

      if (t >= 1) animState = null;
    }

    // Gentle ambient studio motion
    var s = now * 0.001;
    if (activeActor.type === 'coin' && !animState) {
      activeActor.pivot.rotation.y = Math.sin(s * 0.9) * 0.14;
    } else if (activeActor.type === 'weather') {
      activeActor.raysGroup.rotation.z = s * 0.35;
      activeActor.cloudGroup.position.x = Math.sin(s * 0.8) * 0.08;
      if (activeActor.mode === 'rainy') {
        activeActor.drops.forEach(function (drop) {
          var fall = ((s * 1.45 + drop.userData.phase) % 1);
          drop.position.y = 1.08 - fall * 0.88;
        });
        var rip = (s * 0.9) % 1;
        activeActor.ripple.scale.setScalar(0.55 + rip * 0.85);
        activeActor.ripple.material.opacity = (1 - rip) * 0.55;
      }
    } else if (activeActor.type === 'marbles' && !animState) {
      activeActor.heroMarble.rotation.y = s * 0.45;
    }
  }

  function tick(now) {
    if (!isVisible || document.hidden) {
      rafId = null;
      return;
    }
    syncSize();
    controls.update();
    updateAnimation(now);
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  }

  function ensureLoop() {
    if (!rafId && isVisible && !document.hidden) {
      rafId = requestAnimationFrame(tick);
    }
  }

  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      syncSize();
      ensureLoop();
    }).observe(shell);
  }

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      isVisible = Boolean(entries[0] && entries[0].isIntersecting);
      if (isVisible) ensureLoop();
    }, { threshold: 0.02 }).observe(shell);
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) ensureLoop();
  });

  var api = {
    isReady: function () {
      return true;
    },
    render: function (config, trialData, mode, state) {
      startAnimation(config, trialData, state);
    },
    renderIdle: function (config, state) {
      var actor = ensureActor(config);
      animState = null;
      if (actor.type === 'marbles') {
        syncMarblePool(actor, state, -1);
      }
      outcomePill.textContent = config.label + ' · Ready';
      ensureLoop();
    }
  };

  window.ProbabilitySimulator3D = api;
  if (window.__psStageBridge && typeof window.__psStageBridge.on3DReady === 'function') {
    window.__psStageBridge.on3DReady(api);
  }
  ensureLoop();
  return api;
}

mountProbability3D();
