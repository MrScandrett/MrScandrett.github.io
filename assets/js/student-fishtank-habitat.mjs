// Procedural reef scenery: all textures and geometry stay local to the aquarium.
// A fixed seed makes the habitat stable across reloads and viewport changes.
export function buildHabitat({ THREE, scene }) {
  let seed = 73421;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const between = (a, b) => a + random() * (b - a);
  const swaying = [];
  const floorY = (x, z) => -5.5 + .07 * Math.sin(x * .65 + z * .35) + .045 * Math.sin(z * 1.4 - x * .3);

  function canvasTexture(size, paint) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    paint(canvas.getContext('2d'), size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 1;
    return texture;
  }

  const sand = canvasTexture(512, (ctx, size) => {
    const pixels = ctx.createImageData(size, size);
    // One pixel upload avoids thousands of tiny paint commands on software GL.
    for (let i = 0; i < pixels.data.length; i += 4) {
      const grain = between(-13, 13) + (random() > .985 ? 17 : 0);
      pixels.data[i] = 215 + grain;
      pixels.data[i + 1] = 204 + grain;
      pixels.data[i + 2] = 181 + grain;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
  });
  sand.colorSpace = THREE.SRGBColorSpace;
  sand.repeat.set(24, 36);

  // Seamlessly wrapped Voronoi boundaries produce the connected light patterns
  // cast by a rippled surface. Generate once; only the sampling offsets animate.
  const caustics = canvasTexture(256, (ctx, size) => {
    const cells = Array.from({ length: 36 }, (_, i) => [(i % 6 + between(.15, .85)) / 6, (Math.floor(i / 6) + between(.15, .85)) / 6]);
    const pixels = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let nearest = 2, second = 2;
      const u = ((x / size + Math.sin(y / size * Math.PI * 6) * .022) % 1 + 1) % 1;
      const v = ((y / size + Math.sin(x / size * Math.PI * 4) * .022) % 1 + 1) % 1;
      for (const [cx, cy] of cells) {
        const dx = Math.min(Math.abs(u - cx), 1 - Math.abs(u - cx));
        const dy = Math.min(Math.abs(v - cy), 1 - Math.abs(v - cy));
        const distance = Math.hypot(dx, dy);
        if (distance < nearest) { second = nearest; nearest = distance; }
        else if (distance < second) second = distance;
      }
      const glow = Math.exp(-(second - nearest) * 230) * 255;
      const offset = (y * size + x) * 4;
      pixels.data[offset] = pixels.data[offset + 1] = pixels.data[offset + 2] = glow;
      pixels.data[offset + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
  });

  function reefMaterial(color, options = {}) {
    // Matte diffuse surfaces keep the reef inexpensive on classroom hardware.
    const { roughness, causticLight, ...surfaceOptions } = options;
    return new THREE.MeshLambertMaterial({ color, ...surfaceOptions });
  }

  function mesh(geometry, material, parent = scene) {
    const object = new THREE.Mesh(geometry, material);
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  // Merge static coral parts into one draw per colony, including their colors.
  function coloredGeometry(geometry, color) {
    const c = new THREE.Color(color);
    const values = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < values.length; i += 3) {
      const variation = between(.92, 1.06);
      values[i] = c.r * variation; values[i + 1] = c.g * variation; values[i + 2] = c.b * variation;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(values, 3));
    return geometry;
  }
  const coralMaterial = reefMaterial(0xffffff, { vertexColors: true, roughness: .75, side: THREE.DoubleSide });
  function colony(parts, x, z, scale = 1) {
    const arrays = { position: [], normal: [], color: [] };
    for (const part of parts) {
      const expanded = part.index ? part.toNonIndexed() : part;
      for (const key of Object.keys(arrays)) arrays[key].push(...expanded.attributes[key].array);
      if (expanded !== part) expanded.dispose();
      part.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    for (const key of Object.keys(arrays)) geometry.setAttribute(key, new THREE.Float32BufferAttribute(arrays[key], 3));
    const object = mesh(geometry, coralMaterial);
    object.position.set(x, floorY(x, z), z);
    object.scale.setScalar(scale);
    object.castShadow = true;
    return object;
  }
  function tube(points, radius, color, taper = .7) {
    const curve = new THREE.CatmullRomCurve3(points);
    const steps = 7;
    const geometry = new THREE.TubeGeometry(curve, steps, radius, 7, false);
    const positions = geometry.attributes.position;
    for (let i = 0; i <= steps; i++) {
      const center = curve.getPointAt(i / steps);
      const factor = 1 - (i / steps) * taper;
      for (let j = 0; j <= 7; j++) {
        const index = i * 8 + j;
        positions.setXYZ(index, center.x + (positions.getX(index) - center.x) * factor, center.y + (positions.getY(index) - center.y) * factor, center.z + (positions.getZ(index) - center.z) * factor);
      }
    }
    geometry.computeVertexNormals();
    return coloredGeometry(geometry, color);
  }

  // The floor continues beyond the visible habitat; fog softens the distance.
  const floorGeometry = new THREE.PlaneGeometry(180, 260, 64, 96);
  floorGeometry.rotateX(-Math.PI / 2);
  const floorPositions = floorGeometry.attributes.position;
  for (let i = 0; i < floorPositions.count; i++) {
    const x = floorPositions.getX(i), z = floorPositions.getZ(i);
    floorPositions.setY(i, floorY(x, z) + .018 * Math.sin(z * 13 + Math.sin(x * .7)));
  }
  floorGeometry.computeVertexNormals();
  const floorMaterial = reefMaterial(0xffffff, { map: sand });
  mesh(floorGeometry, floorMaterial);

  // A separate light veil keeps surface reflections out of the lighting shaders.
  // Reuse the seabed geometry so the pattern follows the dunes without seams.
  const lightTexture = caustics.clone();
  lightTexture.repeat.set(36, 52);
  const lightVeil = mesh(floorGeometry, new THREE.MeshBasicMaterial({
    map: lightTexture, alphaMap: lightTexture, color: 0xf8fff0,
    transparent: true, opacity: .25, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  }));
  lightVeil.position.y = .008;
  lightVeil.receiveShadow = false;

  // Soft shafts of light are painted once, rather than evaluated per pixel on
  // every frame. The lower water color matches the scene fog at the horizon.
  scene.background = canvasTexture(1024, (ctx, size) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#286c73');
    gradient.addColorStop(.46, '#14444f');
    gradient.addColorStop(.65, '#174552');
    gradient.addColorStop(1, '#174552');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.transform(1, 0, .25, 1, i * size / 5 - 120, 0);
      const beam = ctx.createLinearGradient(0, 0, 130, 0);
      beam.addColorStop(0, '#c8fff000');
      beam.addColorStop(.42, '#c8fff01b');
      beam.addColorStop(1, '#c8fff000');
      ctx.fillStyle = beam; ctx.fillRect(0, 0, 130, size * .75);
      ctx.restore();
    }
    const haze = ctx.createLinearGradient(0, 0, 0, size);
    haze.addColorStop(0, '#17455200'); haze.addColorStop(.2, '#17455205');
    haze.addColorStop(.68, '#174552ff'); haze.addColorStop(1, '#174552ff');
    ctx.fillStyle = haze; ctx.fillRect(0, 0, size, size);
  });
  scene.background.colorSpace = THREE.SRGBColorSpace;

  // The waterline is a translucent, textured sheet viewed from below.
  const surfaceTexture = caustics.clone();
  surfaceTexture.repeat.set(4, 3);
  const surfaceGeometry = new THREE.PlaneGeometry(70, 48);
  surfaceGeometry.rotateX(-Math.PI / 2);
  const surface = mesh(surfaceGeometry, new THREE.MeshBasicMaterial({
    color: 0x94d8cd, map: surfaceTexture, alphaMap: surfaceTexture,
    side: THREE.DoubleSide, transparent: true, opacity: .16, depthWrite: false,
  }));
  surface.position.set(0, 6.7, -17);
  surface.receiveShadow = false;

  // Smooth, weathered limestone. Deform by position so shared vertices remain
  // joined (independent random vertex offsets create cracks and broken normals).
  const stoneMaterial = reefMaterial(0xffffff, { vertexColors: true });
  const rockGeometry = new THREE.SphereGeometry(1, 18, 12);
  const rockPositions = rockGeometry.attributes.position;
  const rockColors = [];
  const low = new THREE.Color(0x53695f), high = new THREE.Color(0xb2b49a);
  for (let i = 0; i < rockPositions.count; i++) {
    const x = rockPositions.getX(i), y = rockPositions.getY(i), z = rockPositions.getZ(i);
    const shape = 1 + .13 * Math.sin(x * 6 + z * 3) * Math.sin(y * 5 - z * 4) + .07 * Math.cos(z * 9 + y * 3);
    rockPositions.setXYZ(i, x * shape, y * shape * .7, z * shape);
    const shade = low.clone().lerp(high, .3 + .5 * (y + 1) / 2 + .13 * Math.sin(x * 11 + z * 7));
    rockColors.push(shade.r, shade.g, shade.b);
  }
  rockGeometry.setAttribute('color', new THREE.Float32BufferAttribute(rockColors, 3));
  rockGeometry.computeVertexNormals();
  const rockLayout = [[-7.8,-3,1.6],[-6.4,-3.8,1.2],[-8.7,-1.7,.95],[-5.2,-4.8,.8],[6.8,-3.8,1.6],[8.3,-2.6,1.2],[5.4,-4.7,1.1],[9.5,-4,.8],[-2.8,-6,.75],[2.5,-6.8,.65]];
  const stones = new THREE.InstancedMesh(rockGeometry, stoneMaterial, rockLayout.length);
  const dummy = new THREE.Object3D();
  rockLayout.forEach(([x, z, size], i) => {
    dummy.position.set(x, floorY(x, z) + size * .2, z);
    dummy.rotation.set(between(-.15,.15), between(0,6), between(-.2,.2));
    dummy.scale.set(size, size * between(.8,1.15), size * between(.75,1.1));
    dummy.updateMatrix(); stones.setMatrixAt(i, dummy.matrix);
  });
  stones.castShadow = stones.receiveShadow = true;
  scene.add(stones);

  // Soft contact shadows ground the reef without a second shadow-map render
  // of every branch and leaf on every frame.
  const contactTexture = canvasTexture(64, (ctx, size) => {
    const gradient = ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
    gradient.addColorStop(0,'#102c26b3'); gradient.addColorStop(.45,'#102c2666'); gradient.addColorStop(1,'#102c2600');
    ctx.fillStyle = gradient; ctx.fillRect(0,0,size,size);
  });
  contactTexture.colorSpace = THREE.SRGBColorSpace;
  const contactGeometry = new THREE.PlaneGeometry(2,2);
  contactGeometry.rotateX(-Math.PI/2);
  const contacts = new THREE.InstancedMesh(contactGeometry, new THREE.MeshBasicMaterial({
    map: contactTexture, transparent: true, opacity: .52, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }), rockLayout.length);
  rockLayout.forEach(([x,z,size],i) => {
    dummy.position.set(x,floorY(x,z)+.025,z); dummy.rotation.set(0,0,0);
    dummy.scale.set(size*1.18,1,size*.95); dummy.updateMatrix(); contacts.setMatrixAt(i,dummy.matrix);
  });
  scene.add(contacts);


  function branchCoral(x, z, scale, color, fan = false) {
    const parts = [];
    const tipColor = new THREE.Color(color).lerp(new THREE.Color(0xffecd6), .58);
    function branch(start, direction, length, radius, depth) {
      const end = start.clone().addScaledVector(direction, length);
      const mid = start.clone().lerp(end, .5).add(new THREE.Vector3(between(-.09,.09), .04, between(-.06,.06)));
      parts.push(tube([start, mid, end], radius, depth === 0 ? tipColor : color, .42));
      if (depth > 0) {
        for (const side of [-1, 1]) {
          const dir = direction.clone().add(new THREE.Vector3(side * between(.32,.65), between(.04,.25), fan ? between(-.08,.08) : between(-.4,.4))).normalize();
          branch(end, dir, length * between(.62,.8), radius * .66, depth - 1);
        }
      }
    }
    for (let i = 0; i < (fan ? 3 : 5); i++) {
      branch(new THREE.Vector3((i - 2) * .1, 0, 0), new THREE.Vector3((i - 2) * .19, 1, fan ? 0 : between(-.4,.4)).normalize(), between(.55,.85), .075, 3);
    }
    colony(parts, x, z, scale);
  }
  branchCoral(-6.9, -2.6, 1.7, 0xe78374);
  branchCoral(7.5, -3.0, 1.95, 0xb59bce, true);
  branchCoral(-9.2, -4.1, .9, 0xd9ad65, true);
  branchCoral(4.9, -4.1, .95, 0xe6b76e);
  branchCoral(-3.5, -5.4, .7, 0xc697b7);

  function plateCoral(x, z, size, color) {
    const parts = [];
    for (let tier = 0; tier < 4; tier++) {
      const radius = size * (1 - tier * .16);
      const profile = [new THREE.Vector2(.05, 0), new THREE.Vector2(radius * .3, .1), new THREE.Vector2(radius * .72, .18), new THREE.Vector2(radius, .29), new THREE.Vector2(radius * .98, .34)];
      const geometry = new THREE.LatheGeometry(profile, 44);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const a = Math.atan2(p.getZ(i), p.getX(i));
        const r = Math.hypot(p.getX(i), p.getZ(i)) / radius;
        p.setY(i, p.getY(i) + Math.sin(a * 9 + tier) * .055 * r * r + Math.sin(a * 17) * .015);
      }
      geometry.computeVertexNormals();
      const col = new THREE.Color(color).lerp(new THREE.Color(0xf5d5b4), tier * .12);
      coloredGeometry(geometry, col);
      geometry.translate(Math.sin(tier * 2) * .13, tier * .26, 0);
      parts.push(geometry);
    }
    colony(parts, x, z);
  }
  plateCoral(-5.35, -1.6, .9, 0xc89276);
  plateCoral(6.25, -1.2, 1.1, 0x87b4a4);
  plateCoral(8.9, -4.3, .8, 0xc494b9);

  function cushionCoral(x, z, size, color) {
    const parts = [];
    for (let n = 0; n < 7; n++) {
      const geometry = new THREE.SphereGeometry(between(.22,.4), 16, 12);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
        const folds = Math.sin(Math.atan2(pz, px) * 13 + Math.sin(py * 23) * 1.8);
        const factor = .98 + folds * .045;
        p.setXYZ(i, px * factor, py * factor, pz * factor);
      }
      geometry.computeVertexNormals(); coloredGeometry(geometry, color);
      geometry.translate(between(-.4,.4), between(.15,.3), between(-.3,.3)); parts.push(geometry);
    }
    colony(parts, x, z, size);
  }
  cushionCoral(-7.9, -.8, 1.4, 0xbca2d0);
  cushionCoral(8.7, -1.1, 1.35, 0xd9ba70);
  cushionCoral(3.2, -3.5, .8, 0x8db69e);

  // Hollow vase sponges add a distinct foreground silhouette and visible rims.
  for (const [x, z, color] of [[-9.1,.1,0xc29a64],[9.5,.6,0x89aca5]]) {
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const h = between(.65,1.35), r = between(.14,.23);
      const profile = [[r*.6,0],[r*.8,h*.25],[r,h*.75],[r*1.1,h],[r*.86,h+.015],[r*.7,h*.8],[r*.55,h*.3],[0,h*.25]].map(([a,b])=>new THREE.Vector2(a,b));
      const geometry = new THREE.LatheGeometry(profile,20);
      coloredGeometry(geometry,color);
      const colors = geometry.attributes.color;
      // Shade the inside of each open tube to give the opening real depth.
      for (let j=0;j<colors.count;j++) if (j % profile.length >= 5) {
        colors.setXYZ(j,colors.getX(j)*.48,colors.getY(j)*.48,colors.getZ(j)*.48);
      }
      geometry.rotateZ(between(-.18,.18));
      geometry.translate((i-2)*.27,0,Math.sin(i*2)*.2); parts.push(geometry);
    }
    colony(parts,x,z);
  }

  // Ribbon leaves curve out from the roots and taper at their tips.
  const leafMaterial = reefMaterial(0xffffff, { vertexColors: true, side: THREE.DoubleSide, roughness: .68 });
  for (const [x, z, height] of [[-9,-3,2.8],[-8,-5,3.5],[-5.8,-5.2,2.8],[-4.2,-4.5,1.7],[-2.2,-6,1.5],[2.8,-6,2.0],[5.9,-5.5,3.2],[8.8,-5,3.7],[9.7,-2.7,2.2]]) {
    const group = new THREE.Group();
    group.position.set(x, floorY(x, z), z);
    for (let n = 0; n < 7; n++) {
      const h = height * between(.6,1), width = between(.1,.2), bend = between(-.7,.7);
      const geometry = new THREE.PlaneGeometry(1, 1, 2, 16);
      const p = geometry.attributes.position;
      const colors = [];
      const base = new THREE.Color(0x235c50), tip = new THREE.Color(n % 2 ? 0x8bbf86 : 0x54a18a);
      for (let i = 0; i < p.count; i++) {
        const u = p.getY(i) + .5, side = p.getX(i);
        p.setXYZ(i, side * width * Math.sin(Math.PI * u) * 2 + bend * u * u, u * h, Math.sin(u * 4) * .18 + Math.abs(side) * .08);
        const c = base.clone().lerp(tip, u * .8 + .1); colors.push(c.r, c.g, c.b);
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();
      const leaf = mesh(geometry, leafMaterial, group);
      leaf.position.set((n - 3) * .13, 0, between(-.2,.2));
      leaf.rotation.y = between(-1,1);
    }
    scene.add(group); swaying.push({ object: group, phase: random() * 6, amount: .045 });
  }

  // Soft, bulb-tipped anemones fill the smaller pockets of the reef.
  for (const [x,z,color] of [[-4.2,-1.5,0xd9a7bf],[4.1,-1.1,0xa6b5d9],[-8.8,.5,0xadc6a1]]) {
    const parts = [];
    for (let i = 0; i < 26; i++) {
      const angle = i * 2.39996, r = .38 * Math.sqrt(i / 26), h = between(.35,.75);
      const start = new THREE.Vector3(Math.cos(angle)*r,.05,Math.sin(angle)*r);
      const end = start.clone().add(new THREE.Vector3(Math.cos(angle)*.16,h,Math.sin(angle)*.16));
      parts.push(tube([start, start.clone().lerp(end,.5).add(new THREE.Vector3(.09,0,0)), end], .035, color, .25));
      const bulb = coloredGeometry(new THREE.SphereGeometry(.046,8,6), new THREE.Color(color).lerp(new THREE.Color(0xffeadc), .45));
      bulb.translate(end.x,end.y,end.z); parts.push(bulb);
    }
    swaying.push({ object: colony(parts,x,z), phase: random()*6, amount: .035 });
  }

  // Small details use instancing so a richer seabed stays inexpensive to draw.
  const pebbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1), reefMaterial(0xffffff), 160);
  for (let i = 0; i < 160; i++) {
    const x = between(-11,11), z = between(-7,9), r = between(.025,.095);
    dummy.position.set(x, floorY(x,z) + r * .35, z);
    dummy.rotation.set(random()*3, random()*6, random()*3);
    dummy.scale.set(r*1.4,r*.65,r);
    dummy.updateMatrix(); pebbles.setMatrixAt(i,dummy.matrix);
    pebbles.setColorAt(i,new THREE.Color([0x9a9a86,0xc9b995,0xa7b3a3,0xe5d8bb][i%4]));
  }
  pebbles.receiveShadow = true; scene.add(pebbles);

  const starMaterial = reefMaterial(0xd68f70, { roughness: .9 });
  for (const [x,z] of [[-2.8,1.8],[4.6,2.9],[-7,3.2]]) {
    const shape = new THREE.Shape();
    for (let i=0;i<10;i++) { const a = i*Math.PI/5, r = i%2 ? .12 : .32; i ? shape.lineTo(Math.cos(a)*r,Math.sin(a)*r) : shape.moveTo(Math.cos(a)*r,Math.sin(a)*r); }
    shape.closePath();
    const star = mesh(new THREE.ExtrudeGeometry(shape,{depth:.04,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:2}),starMaterial);
    star.rotation.set(-Math.PI/2,0,between(0,6)); star.position.set(x,floorY(x,z)+.04,z);
  }

  // A single points draw gives the water a faint suspended-particle layer.
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(100 * 3);
  for (let i = 0; i < particlePositions.length; i += 3) {
    particlePositions[i] = between(-16,16); particlePositions[i+1] = between(-5,7); particlePositions[i+2] = between(-12,5);
  }
  particleGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));
  const particles = new THREE.Points(particleGeometry,new THREE.PointsMaterial({color:0xb6e3d7,size:.035,transparent:true,opacity:.3,depthWrite:false}));
  scene.add(particles);

  return {
    update(seconds) {
      lightTexture.offset.set(Math.sin(seconds * .09) * .018, seconds * .002);
      surfaceTexture.offset.set(seconds * .003, Math.sin(seconds * .07) * .02);
      for (const {object,phase,amount} of swaying) {
        object.rotation.z = Math.sin(seconds * .55 + phase) * amount;
        object.rotation.x = Math.cos(seconds * .4 + phase) * amount * .5;
      }
      particles.position.x = Math.sin(seconds * .07) * .3;
      particles.position.y = Math.sin(seconds * .1) * .2;
    },
  };
}
