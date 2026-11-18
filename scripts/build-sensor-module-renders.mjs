// Render the lesson's illustrative hardware views with the site's vendored Three.js.
// Run while the repository is served locally: node scripts/build-sensor-module-renders.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const origin = process.argv[2] || 'http://127.0.0.1:5501';
const output = new URL('../assets/images/lessons/sensor-modules/', import.meta.url);
const browser = await chromium.launch({
  executablePath: findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']) || undefined,
  args: ['--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage();
  // Only the vendored renderer is needed. No lesson scripts run during the build.
  await page.route(origin + '/sensor-render', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><title>Sensor module asset rendering</title>',
  }));
  await page.goto(origin + '/sensor-render');

  await page.evaluate(async () => {
    const { THREE } = await import('/assets/vendor/three-bundle.min.js');
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xdcecff, 0x858687, 1.8));
    const key = new THREE.DirectionalLight(0xffeed8, 3.2);
    key.position.set(-4, 8, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -5;
    key.shadow.camera.right = key.shadow.camera.top = 5;
    key.shadow.normalBias = 0.022;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb3e5ff, 1.4);
    rim.position.set(2, 3, -4);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.19 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const model = new THREE.Group();
    scene.add(model);
    const material = (color, roughness = 0.5, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const blue = material(0x0875b0);
    const green = material(0x147655);
    const red = material(0xa9222b);
    const edge = material(0x9a8e57);
    const black = material(0x171c24);
    const dark = material(0x080d11);
    const silver = material(0xb4c5ce, 0.3, 0.58);
    const gold = material(0xe0b05a, 0.33, 0.48);
    const trace = material(0x389f8d);
    const white = material(0xe8edf1);
    const tan = material(0xb18b5e);

    function mesh(geometry, finish, x, y, z) {
      const part = new THREE.Mesh(geometry, finish);
      part.position.set(x, y, z);
      part.castShadow = part.receiveShadow = true;
      model.add(part);
      return part;
    }

    const box = (x, y, z, w, h, d, finish = black) =>
      mesh(new THREE.BoxGeometry(w, h, d), finish, x, y, z);
    const cylinder = (x, y, z, r, h, finish = silver, bottom = r, sides = 48) =>
      mesh(new THREE.CylinderGeometry(r, bottom, h, sides), finish, x, y, z);
    const dome = (x, y, z, r, height, finish) => {
      const part = mesh(new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
        finish, x, y, z);
      part.scale.y = height / r;
      return part;
    };

    function ring(x, y, z, r, tube, finish = gold) {
      const part = mesh(new THREE.TorusGeometry(r, tube, 8, 40), finish, x, y, z);
      part.rotation.x = -Math.PI / 2;
    }

    function board(w, d, finish = blue, holes = []) {
      const outline = new THREE.Shape();
      const r = 0.13;
      outline.moveTo(-w / 2 + r, -d / 2);
      outline.lineTo(w / 2 - r, -d / 2);
      outline.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
      outline.lineTo(w / 2, d / 2 - r);
      outline.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
      outline.lineTo(-w / 2 + r, d / 2);
      outline.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
      outline.lineTo(-w / 2, -d / 2 + r);
      outline.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
      for (const [x, z] of holes) {
        const cutout = new THREE.Path();
        cutout.absarc(x, -z, 0.093, 0, Math.PI * 2, true);
        outline.holes.push(cutout);
        ring(x, 0.221, z, 0.123, 0.019);
      }
      const geometry = new THREE.ExtrudeGeometry(outline, { depth: 0.12, bevelEnabled: false });
      mesh(geometry, [finish, edge], 0, 0.09, 0).rotation.x = -Math.PI / 2;
    }

    const corners = (x, z) => [[-x, -z], [x, -z], [-x, z], [x, z]];

    function header(x, z, count) {
      box(x, 0.30, z, count * 0.23, 0.18, 0.24);
      for (let i = 0; i < count; i++) {
        const pin = x + (i - (count - 1) / 2) * 0.23;
        box(pin, 0.32, z + 0.20, 0.075, 0.075, 0.52, gold);
      }
    }

    function chip(x, z, width = 0.52, count = 4) {
      box(x, 0.29, z, width, 0.15, 0.46);
      for (let i = 0; i < count; i++) {
        const pin = x + (i - (count - 1) / 2) * width / count;
        box(pin, 0.235, z - 0.25, 0.046, 0.04, 0.19, silver);
        box(pin, 0.235, z + 0.25, 0.046, 0.04, 0.19, silver);
      }
      cylinder(x - width / 3, 0.368, z + 0.11, 0.035, 0.01, material(0x626d75));
    }

    function passive(x, z, finish = tan) {
      box(x, 0.25, z, 0.21, 0.08, 0.105, silver);
      box(x, 0.26, z, 0.135, 0.08, 0.11, finish);
    }

    function breakout(finish = green, count = 3) {
      board(2.55, 1.95, finish, [[-1.01, -0.72], [1.01, -0.72]]);
      header(0, 0.88, count);
      passive(-0.76, 0.37);
      passive(0.77, 0.46, black);
      for (const x of [-0.54, 0.54]) box(x, 0.213, 0.24, 0.025, 0.006, 0.77, trace);
    }

    function lens(x, z, color, radius = 0.34) {
      const resin = material(color, 0.17);
      cylinder(x, 0.26, z, radius * 1.15, 0.10, resin);
      cylinder(x, 0.44, z, radius, 0.28, resin);
      dome(x, 0.58, z, radius, radius * 0.8, resin);
    }

    function soundCan(x, z, r, h) {
      cylinder(x, 0.21 + h / 2, z, r, h);
      ring(x, 0.21 + h, z, r - 0.042, 0.037, silver);
      cylinder(x, 0.215 + h, z, r - 0.084, 0.014, material(0x485664, 0.82, 0.18));
      for (let i = -4; i <= 4; i++) {
        for (let j = -4; j <= 4; j++) {
          if (i * i + j * j < 21) {
            cylinder(x + i * r / 5.8, 0.228 + h, z + j * r / 5.8, r * 0.026, 0.009, dark, r * 0.026, 8);
          }
        }
      }
    }

    function trim(x, z) {
      box(x, 0.36, z, 0.49, 0.3, 0.46, material(0x155fd1));
      cylinder(x, 0.53, z, 0.145, 0.05, silver);
      box(x, 0.557, z, 0.21, 0.012, 0.032, dark).rotation.y = 0.3;
    }

    function terminal(x, z) {
      const plastic = material(0x1a7e9f);
      box(x, 0.49, z, 1.46, 0.56, 0.58, plastic);
      for (const dx of [-0.46, 0, 0.46]) {
        cylinder(x + dx, 0.772, z, 0.14, 0.018, silver);
        box(x + dx, 0.785, z, 0.21, 0.012, 0.033, dark).rotation.y = dx + 0.2;
        box(x + dx, 0.46, z + 0.296, 0.24, 0.2, 0.012, dark);
      }
    }

    function label(text, x, y, z, w, color = '#dfeced') {
      const canvas = document.createElement('canvas');
      canvas.width = 384;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.font = '600 42px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 8);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 6),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(x, y, z);
      model.add(mark);
    }

    function temperaturePackage() {
      box(0, 0.46, -0.27, 0.49, 0.50, 0.30, black);
      cylinder(0, 0.72, -0.27, 0.24, 0.06, black, 0.24, 24);
      for (const x of [-0.15, 0, 0.15]) box(x, 0.25, 0.018, 0.055, 0.064, 0.39, silver);
    }

    const views = {
      ultrasonicsensor() {
        board(4.55, 2.12, blue, corners(2.04, 0.83));
        header(0, 1.0, 4);
        for (const x of [-1.22, 1.22]) soundCan(x, -0.11, 0.79, 0.69);
        chip(0, -0.35, 0.46);
        box(0, 0.31, -0.80, 0.43, 0.18, 0.18, silver);
        passive(0, 0.28);
        label('HC-SR04', 0, 0.215, 0.61, 1.2);
      },
      pirsensor() {
        board(3.25, 2.57, green, [[-1.38, 0.96], [1.38, 0.96]]);
        header(0, 1.18, 3);
        trim(-0.97, 0.49);
        trim(0.98, 0.49);
        box(0, 0.33, -0.28, 1.98, 0.24, 1.65, white);
        const cover = mesh(new THREE.IcosahedronGeometry(0.94, 2),
          new THREE.MeshStandardMaterial({ color: 0xe4f1ef, roughness: 0.54, flatShading: true }), 0, 0.52, -0.28);
        cover.scale.set(1, 0.66, 0.88);
      },
      flamesensormodule() {
        breakout(blue, 4);
        lens(0, -0.64, 0x30191f, 0.29);
        trim(0.66, -0.02);
        chip(-0.57, -0.04, 0.45);
      },
      linearhallmodule() {
        breakout(black);
        temperaturePackage();
        label('HALL', 0, 0.215, 0.47, 0.86);
      },
      digitaltempmodule() {
        breakout(blue, 4);
        lens(0, -0.65, 0x161a25, 0.20);
        chip(-0.50, -0.03, 0.43);
        trim(0.62, -0.02);
      },
      tempsensor18b20() {
        breakout(black);
        temperaturePackage();
        label('18B20', 0, 0.215, 0.47, 1.1);
      },
      tempandhumiditymodule() {
        board(2.45, 2.85, blue, [[-0.92, -1.17], [0.92, -1.17]]);
        header(0, 1.35, 3);
        box(0, 0.51, -0.22, 1.64, 0.6, 1.99, material(0x239ac2));
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 4; col++) {
            box((col - 1.5) * 0.31, 0.814, (row - 2) * 0.27 - 0.25, 0.186, 0.012, 0.13, dark);
          }
        }
        for (const x of [-0.24, 0, 0.24]) box(x, 0.27, 0.86, 0.07, 0.08, 0.34, silver);
      },
      photoresistormodule() {
        breakout(blue, 4);
        trim(0.64, -0.04);
        chip(-0.65, 0.02, 0.4);
        cylinder(0, 0.37, -0.54, 0.37, 0.23, tan);
        ring(0, 0.493, -0.54, 0.32, 0.028, silver);
        for (let i = 0; i < 5; i++) {
          box((i - 2) * 0.10, 0.492, -0.54, 0.034, 0.012, 0.42, black);
          if (i < 4) box((i - 1.5) * 0.10, 0.492, -0.54 + (i % 2 ? 0.19 : -0.19), 0.12, 0.012, 0.036, black);
        }
      },
      accelerationgyroscope() {
        board(2.55, 2.17, blue, [[-1, -0.82], [1, -0.82]]);
        header(0, 1.02, 8);
        chip(0, -0.16, 0.67, 6);
        for (const x of [-0.79, 0.72]) for (const z of [-0.45, -0.17, 0.11]) passive(x, z);
        label('GY-521', 0, 0.215, -0.72, 1.14);
      },
      avoidancemodule() {
        breakout(blue);
        lens(-0.53, -0.64, 0x251c35, 0.28);
        lens(0.53, -0.64, 0xa0c7e0, 0.28);
        trim(0.61, 0.23);
        chip(-0.54, 0.13, 0.42);
      },
      watersensormodule() {
        board(2.25, 3.34, red, [[-0.87, 1.39], [0.87, 1.39]]);
        header(0, 1.56, 3);
        for (let i = 0; i < 10; i++) {
          const x = (i - 4.5) * 0.174;
          box(x, 0.219, -0.46, 0.087, 0.018, i % 2 ? 1.97 : 1.68, gold);
          box(x, 0.22, i % 2 ? 0.53 : -1.33, 0.14, 0.018, 0.083, gold);
        }
        chip(0, 0.99, 0.32, 3);
      },
      'photo-interruptermodule'() {
        breakout(blue, 4);
        box(0, 0.36, -0.22, 1.65, 0.30, 0.84);
        for (const x of [-0.56, 0.56]) box(x, 0.75, -0.22, 0.53, 0.54, 0.84);
        trim(0.74, 0.47);
      },
      'rbg-led-module'() { breakout(black, 4); lens(0, -0.12, 0x83c6e0, 0.49); },
      smdrgbmodule() {
        breakout(black, 4);
        box(0, 0.33, -0.15, 0.95, 0.25, 0.93, white);
        cylinder(0, 0.466, -0.15, 0.32, 0.036, material(0xc8d6df, 0.25));
        [0xe14759, 0x35b971, 0x3982dd].forEach((color, i) =>
          box((i - 1) * 0.15, 0.491, -0.15, 0.10, 0.019, 0.17, material(color)));
      },
      twocolorledmodule() { breakout(black); lens(0, -0.12, 0xcf383d, 0.49); },
      led7colorflash() { breakout(black, 2); lens(0, -0.12, 0xe6c77e, 0.49); },
      activebuzzer() {
        breakout(black, 3);
        cylinder(0, 0.51, -0.21, 0.66, 0.6, black);
        ring(0, 0.805, -0.21, 0.605, 0.021, material(0x535b64));
        cylinder(0, 0.815, -0.21, 0.135, 0.024, dark);
        label('+', -0.34, 0.823, -0.35, 0.9);
      },
      passivebuzzer() {
        breakout(black, 3);
        cylinder(0, 0.42, -0.20, 0.66, 0.42, black);
        cylinder(0, 0.64, -0.20, 0.56, 0.045, silver);
        cylinder(0, 0.664, -0.20, 0.18, 0.023, dark);
      },
      relaymodule() {
        board(3.45, 2.3, blue, corners(1.48, 0.91));
        terminal(0, 0.70);
        header(-0.88, -0.99, 3);
        box(0.34, 0.67, -0.38, 1.86, 0.91, 1.12, material(0x1258bd));
        label('RELAY', 0.34, 1.128, -0.43, 1.65);
        chip(-1.05, -0.15, 0.48);
      },
      irreciever() {
        breakout(black);
        box(0, 0.56, -0.21, 0.72, 0.70, 0.46);
        dome(0, 0.907, -0.21, 0.22, 0.10, material(0x33243d, 0.16));
      },
      iremission() { breakout(blue, 3); lens(0, -0.19, 0x605596, 0.46); },
      lasertransmittordiode() {
        breakout(red, 3);
        cylinder(0, 0.5, -0.20, 0.42, 0.58, gold);
        ring(0, 0.79, -0.20, 0.344, 0.036, gold);
        cylinder(0, 0.80, -0.20, 0.20, 0.022, dark);
        cylinder(0, 0.816, -0.20, 0.085, 0.018, material(0xa14637, 0.18));
      },
      bigsoundandsmallsoundmodule() {
        board(2.62, 2.47, red, [[-1.04, 0.96], [1.04, 0.96]]);
        header(0, 1.13, 4);
        soundCan(0, -0.66, 0.50, 0.36);
        chip(-0.59, 0.22);
        trim(0.57, 0.30);
      },
      ds1307module() {
        board(3.14, 2.48, blue, corners(1.31, 0.99));
        header(0, 1.13, 4);
        cylinder(-0.36, 0.31, -0.14, 0.82, 0.20, black);
        cylinder(-0.36, 0.458, -0.14, 0.72, 0.14, silver);
        ring(-0.36, 0.53, -0.14, 0.64, 0.024, silver);
        label('+', -0.36, 0.531, -0.14, 1.3, '#283844');
        chip(0.77, 0.12);
        box(0.84, 0.30, -0.68, 0.52, 0.16, 0.19, silver);
      },
      lcdmodule() {
        board(4.33, 2.06, green, corners(1.93, 0.79));
        box(0, 0.39, 0.01, 3.55, 0.36, 1.49);
        box(0, 0.578, 0.01, 3.19, 0.04, 1.04, material(0x658c31, 0.33));
        label('HELLO', -0.21, 0.601, 0.04, 2.8, '#142b13');
        for (let i = 0; i < 14; i++) ring(-1.55 + i * 0.17, 0.22, -0.87, 0.047, 0.011);
      },
      breadboardsupplymodule() {
        board(3.41, 2.52, black, [[-1.46, -1.01], [1.46, -1.01]]);
        box(-0.84, 0.58, 0.58, 0.77, 0.73, 0.95);
        cylinder(-0.84, 0.59, 1.06, 0.25, 0.05, dark).rotation.x = Math.PI / 2;
        box(0.84, 0.46, 0.53, 0.91, 0.50, 0.88, silver);
        box(0.84, 0.46, 0.98, 0.67, 0.30, 0.016, dark);
        box(0.84, 0.43, 0.993, 0.52, 0.085, 0.016, white);
        box(0, 0.41, -0.07, 0.31, 0.40, 0.41, white);
        for (const x of [-0.86, 0.86]) box(x, 0.31, -0.69, 0.57, 0.20, 0.40, material(0xdfb622));
      },
      joystickmodule() {
        board(3.07, 2.66, black, corners(1.29, 1.08));
        header(0, 1.21, 5);
        box(0, 0.49, -0.2, 1.49, 0.57, 1.39, silver);
        cylinder(0, 0.84, -0.23, 0.42, 0.54, black);
        cylinder(0, 1.15, -0.23, 0.78, 0.37, black, 0.65);
        dome(0, 1.33, -0.23, 0.78, 0.14, material(0x252b34, 0.76));
      },
      rotaryencoder() {
        breakout(blue, 5);
        box(0, 0.43, -0.19, 1.09, 0.44, 1.02, silver);
        cylinder(0, 0.71, -0.19, 0.39, 0.18, silver, 0.39, 6);
        cylinder(0, 0.96, -0.19, 0.25, 0.48, silver, 0.25, 16);
        for (let i = 0; i < 16; i++) {
          const a = i * Math.PI / 8;
          box(Math.cos(a) * 0.24, 1.01, -0.19 + Math.sin(a) * 0.24, 0.053, 0.32, 0.053, silver);
        }
        box(0, 1.205, -0.19, 0.36, 0.01, 0.048, black).rotation.y = -0.3;
      },
      button() {
        breakout(black, 3);
        box(0, 0.37, -0.18, 0.96, 0.32, 0.92, silver);
        cylinder(0, 0.62, -0.18, 0.31, 0.26, material(0xb5222b));
        dome(0, 0.75, -0.18, 0.31, 0.067, material(0xd53b42));
      },
      membraneswitch() {
        board(2.64, 3.27, black);
        box(0, 0.25, 1.81, 0.83, 0.055, 0.89, black);
        for (let i = 0; i < 7; i++) box((i - 3) * 0.10, 0.282, 2.05, 0.053, 0.011, 0.36, gold);
        const keys = ['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', '*', '0', '#', 'D'];
        keys.forEach((key, i) => {
          const x = (i % 4 - 1.5) * 0.57;
          const z = (Math.floor(i / 4) - 1.5) * 0.68;
          box(x, 0.238, z, 0.47, 0.052, 0.55, i % 4 === 3 ? red : blue);
          label(key, x, 0.271, z, 1.52);
        });
      },
      metaltouch() {
        breakout(blue, 4);
        cylinder(0, 0.25, -0.51, 0.48, 0.08, gold);
        ring(0, 0.291, -0.51, 0.4, 0.014, silver);
        chip(-0.56, 0.23, 0.46);
        trim(0.58, 0.23);
      },
      tapmodule() {
        breakout(black, 3);
        const tube = cylinder(0, 0.44, -0.29, 0.19, 1.52, black);
        tube.rotation.z = Math.PI / 2;
        for (const x of [-0.75, 0.75]) {
          cylinder(x, 0.44, -0.29, 0.19, 0.06, silver).rotation.z = Math.PI / 2;
          box(x, 0.26, -0.29, 0.19, 0.12, 0.12, silver);
        }
      },
    };

    const camera = new THREE.OrthographicCamera();
    window.sensorRenders = {
      names: Object.keys(views),
      render(name) {
        // A shared angle and framing keep the views comparable throughout the gallery.
        const featured = name === 'ultrasonicsensor';
        const width = featured ? 1080 : 640;
        const height = featured ? 720 : 448;
        renderer.setSize(width, height);
        views[name]();
        camera.position.set(3.5, 7, 8);
        camera.lookAt(0, 0.35, 0);
        camera.updateMatrixWorld();
        model.updateMatrixWorld(true);

        const bounds = new THREE.Box3().setFromObject(model);
        const projected = new THREE.Box3();
        for (const x of [bounds.min.x, bounds.max.x]) {
          for (const y of [bounds.min.y, bounds.max.y]) {
            for (const z of [bounds.min.z, bounds.max.z]) {
              projected.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
            }
          }
        }
        const size = projected.getSize(new THREE.Vector3());
        const center = projected.getCenter(new THREE.Vector3());
        const frameWidth = Math.max(size.x, size.y * width / height) * 1.18;
        const frameHeight = frameWidth * height / width;
        camera.left = center.x - frameWidth / 2;
        camera.right = center.x + frameWidth / 2;
        camera.top = center.y + frameHeight / 2;
        camera.bottom = center.y - frameHeight / 2;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        const image = renderer.domElement.toDataURL('image/webp', 0.90);
        for (const part of [...model.children]) {
          part.geometry.dispose();
          if (part.material.map?.isTexture) {
            part.material.map.dispose();
            part.material.dispose();
          }
          model.remove(part);
        }
        return image.split(',')[1];
      },
    };
  });

  await mkdir(output, { recursive: true });
  const names = await page.evaluate(() => window.sensorRenders.names);
  for (const name of names) {
    const encoded = await page.evaluate(name => window.sensorRenders.render(name), name);
    await writeFile(new URL(name + '.webp', output), Buffer.from(encoded, 'base64'));
  }
  console.log(`Rendered ${names.length} sensor module illustrations.`);
} finally {
  await browser.close();
}
