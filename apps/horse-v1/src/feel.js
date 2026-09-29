import * as THREE from 'three';

/**
 * feel.js — everything that makes the field *physical*: sounds, flying chips,
 * loot you have to walk over to pick up, floating "+2 wood" numbers, the tool
 * in your hands, and things that wobble, topple and rise out of the ground.
 *
 * game.js still decides what happens; this file only decides how it feels.
 */

// --- Sound ----------------------------------------------------------------

/** Tiny WebAudio synth. No sound files — every effect is built from noise and tones. */
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, { type = 'sine', gain = 0.3, slideTo = null, delay = 0 } = {}) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(amp).connect(master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  function noise(duration, { gain = 0.3, filter = 1200, q = 1, delay = 0 } = {}) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = filter;
    band.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    src.connect(band).connect(amp).connect(master);
    src.start(t);
  }

  const sounds = {
    chop: () => {
      noise(0.12, { gain: 0.6, filter: 900, q: 2 });
      tone(140, 0.12, { type: 'triangle', gain: 0.4, slideTo: 70 });
    },
    timber: () => {
      noise(0.9, { gain: 0.35, filter: 400, q: 0.7 });
      tone(90, 0.8, { type: 'sawtooth', gain: 0.12, slideTo: 40 });
    },
    clink: () => {
      tone(1800 + Math.random() * 400, 0.18, { type: 'square', gain: 0.08 });
      noise(0.06, { gain: 0.3, filter: 4000, q: 3 });
    },
    shatter: () => {
      for (let i = 0; i < 5; i += 1) tone(1400 + i * 350, 0.25, { gain: 0.06, delay: i * 0.03 });
      noise(0.25, { gain: 0.3, filter: 5000, q: 1 });
    },
    rustle: () => noise(0.25, { gain: 0.35, filter: 2500, q: 0.6 }),
    pickup: () => {
      tone(660, 0.08, { type: 'square', gain: 0.07 });
      tone(990, 0.1, { type: 'square', gain: 0.07, delay: 0.06 });
    },
    step: () => noise(0.07, { gain: 0.12, filter: 500 + Math.random() * 200, q: 1.5 }),
    hoof: () => {
      tone(180, 0.06, { type: 'triangle', gain: 0.25, slideTo: 90 });
      noise(0.05, { gain: 0.15, filter: 1400, q: 2 });
    },
    dig: () => noise(0.22, { gain: 0.4, filter: 350, q: 0.8 }),
    munch: () => {
      for (let i = 0; i < 3; i += 1) noise(0.06, { gain: 0.25, filter: 1800, q: 2, delay: i * 0.11 });
    },
    whinny: () => {
      tone(700, 0.5, { type: 'sawtooth', gain: 0.07, slideTo: 1100 });
      tone(1100, 0.4, { type: 'sawtooth', gain: 0.06, slideTo: 500, delay: 0.45 });
    },
    treasure: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, { type: 'triangle', gain: 0.15, delay: i * 0.09 })),
    build: () => {
      noise(0.5, { gain: 0.3, filter: 300 });
      [392, 523, 659].forEach((f, i) => tone(f, 0.3, { type: 'triangle', gain: 0.12, delay: 0.25 + i * 0.1 }));
    },
    splash: () => noise(0.6, { gain: 0.5, filter: 800, q: 0.5 }),
    shout: () => tone(220, 0.35, { type: 'sawtooth', gain: 0.1, slideTo: 330 }),
    deny: () => tone(160, 0.15, { type: 'square', gain: 0.07 }),
  };

  return {
    play(name) {
      sounds[name]?.();
    },
    unlock: ensure,
    toggleMute() {
      muted = !muted;
      return muted;
    },
  };
}

// --- Loot you can walk over -----------------------------------------------

const DROP_LOOKS = {
  wood: () => {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 5, 7),
      new THREE.MeshLambertMaterial({ color: 0x8a5a33 })
    );
    log.rotation.z = Math.PI / 2;
    const g = new THREE.Group();
    g.add(log);
    return g;
  },
  quartz: () =>
    new THREE.Mesh(
      new THREE.OctahedronGeometry(1.8),
      new THREE.MeshLambertMaterial({ color: 0xf6f4ff, emissive: 0x5a5a70 })
    ),
  feed: () =>
    new THREE.Mesh(new THREE.BoxGeometry(3, 2, 2.2), new THREE.MeshLambertMaterial({ color: 0xe0c65e })),
};

const CHIP_COLOURS = { wood: 0x7a4f2a, leaf: 0x2f6b30, quartz: 0xffffff, feed: 0xd8c169, dirt: 0x6b563f, heart: 0xff5a7a, dust: 0xb9a98a };

export function createFx(scene, camera, popupLayer) {
  const drops = [];
  const chips = [];
  const tweens = [];
  const popups = [];
  const chipGeo = new THREE.BoxGeometry(1, 1, 1);
  const chipMats = {};
  const tmp = new THREE.Vector3();
  let shake = 0;

  function chipMat(kind) {
    chipMats[kind] ??= new THREE.MeshLambertMaterial({ color: CHIP_COLOURS[kind] ?? 0xffffff });
    return chipMats[kind];
  }

  /** A burst of little cubes that fly out, fall, and bounce. */
  function burst(position, kind, count = 10, power = 18) {
    for (let i = 0; i < count; i += 1) {
      const mesh = new THREE.Mesh(chipGeo, chipMat(kind));
      const size = 0.5 + Math.random() * 0.9;
      mesh.scale.setScalar(size);
      mesh.position.copy(position);
      scene.add(mesh);
      const angle = Math.random() * Math.PI * 2;
      chips.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * power * Math.random(), power * (0.5 + Math.random()), Math.sin(angle) * power * Math.random()),
        spin: new THREE.Vector3(Math.random() * 10, Math.random() * 10, 0),
        life: 1.2 + Math.random() * 0.6,
        floaty: kind === 'heart',
      });
    }
  }

  /** Physical loot. It pops out, lands, bobs, and flies to you when you walk near. */
  function drop(position, resource, onCollect) {
    const mesh = DROP_LOOKS[resource]();
    mesh.traverse((node) => {
      node.castShadow = true;
    });
    mesh.position.copy(position);
    scene.add(mesh);
    const angle = Math.random() * Math.PI * 2;
    drops.push({
      mesh,
      resource,
      onCollect,
      velocity: new THREE.Vector3(Math.cos(angle) * 10, 18 + Math.random() * 8, Math.sin(angle) * 10),
      age: 0,
      landed: false,
      homing: false,
      phase: Math.random() * 6,
    });
  }

  /** Floating "+2 wood" text anchored to a spot in the world. */
  function popup(position, text, colour = '#f4e07a') {
    const el = document.createElement('div');
    el.className = 'popup';
    el.textContent = text;
    el.style.color = colour;
    popupLayer.appendChild(el);
    popups.push({ el, position: position.clone(), age: 0 });
  }

  /** Generic time-based animation: fn(t) for t in 0..1, then done(). */
  function tween(duration, fn, done) {
    tweens.push({ duration, fn, done, age: 0 });
  }

  /** Quick side-to-side wobble — the tree felt that. */
  function wobble(object, strength = 0.12) {
    const baseZ = object.rotation.z;
    const baseX = object.rotation.x;
    tween(0.35, (t) => {
      const w = Math.sin(t * Math.PI * 5) * strength * (1 - t);
      object.rotation.z = baseZ + w;
      object.rotation.x = baseX + w * 0.5;
    }, () => {
      object.rotation.z = baseZ;
      object.rotation.x = baseX;
    });
  }

  /** Topple an object away from `from`, then sink it into the ground and remove it. */
  function topple(object, from, done) {
    const away = tmp.copy(object.position).sub(from).setY(0).normalize().clone();
    // Tip about the horizontal axis perpendicular to the fall direction.
    const axis = new THREE.Vector3(away.z, 0, -away.x).normalize();
    const start = object.quaternion.clone();
    const q = new THREE.Quaternion();
    tween(0.9, (t) => {
      const eased = t * t * t; // slow start, crashing finish
      q.setFromAxisAngle(axis, eased * Math.PI * 0.49);
      object.quaternion.copy(start).premultiply(q);
    }, () => {
      shake = Math.max(shake, 0.6);
      done?.();
      const y = object.position.y;
      tween(1.2, (t) => {
        object.position.y = y - t * 12;
      }, () => scene.remove(object));
    });
  }

  /** Shrink and remove (rocks cracking, hay being scooped). */
  function crumble(object) {
    const s = object.scale.x;
    tween(0.25, (t) => object.scale.setScalar(s * (1 - t)), () => scene.remove(object));
  }

  /** Buildings rise out of the ground with a little overshoot. */
  function rise(object) {
    object.scale.set(1, 0.01, 1);
    tween(1.1, (t) => {
      const back = 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
      object.scale.set(1, Math.max(0.01, back), 1);
    });
    shake = Math.max(shake, 0.4);
  }

  function update(delta, playerPosition) {
    for (let i = chips.length - 1; i >= 0; i -= 1) {
      const chip = chips[i];
      chip.life -= delta;
      if (chip.floaty) {
        chip.mesh.position.y += 10 * delta;
        chip.mesh.position.x += chip.velocity.x * 0.05 * delta;
      } else {
        chip.velocity.y -= 60 * delta;
        chip.mesh.position.addScaledVector(chip.velocity, delta);
        if (chip.mesh.position.y < 0.4) {
          chip.mesh.position.y = 0.4;
          chip.velocity.y *= -0.35;
          chip.velocity.x *= 0.6;
          chip.velocity.z *= 0.6;
        }
      }
      chip.mesh.rotation.x += chip.spin.x * delta;
      chip.mesh.rotation.y += chip.spin.y * delta;
      if (chip.life < 0.3) chip.mesh.scale.multiplyScalar(0.85);
      if (chip.life <= 0) {
        scene.remove(chip.mesh);
        chips.splice(i, 1);
      }
    }

    for (let i = drops.length - 1; i >= 0; i -= 1) {
      const d = drops[i];
      d.age += delta;
      const dist = Math.hypot(d.mesh.position.x - playerPosition.x, d.mesh.position.z - playerPosition.z);
      if (d.age > 0.6 && dist < 24) d.homing = true;

      if (d.homing) {
        tmp.copy(playerPosition).setY(playerPosition.y - 5).sub(d.mesh.position);
        const len = tmp.length();
        if (len < 4) {
          scene.remove(d.mesh);
          drops.splice(i, 1);
          d.onCollect?.(d.resource);
          continue;
        }
        d.mesh.position.addScaledVector(tmp.normalize(), Math.min(len, (40 + d.age * 30) * delta));
      } else if (!d.landed) {
        d.velocity.y -= 60 * delta;
        d.mesh.position.addScaledVector(d.velocity, delta);
        if (d.mesh.position.y < 1.5) {
          d.mesh.position.y = 1.5;
          if (Math.abs(d.velocity.y) < 6) d.landed = true;
          d.velocity.set(d.velocity.x * 0.5, -d.velocity.y * 0.4, d.velocity.z * 0.5);
        }
      } else {
        d.mesh.position.y = 2 + Math.sin(d.age * 3 + d.phase) * 0.6;
      }
      d.mesh.rotation.y += delta * 2;
    }

    for (let i = tweens.length - 1; i >= 0; i -= 1) {
      const tw = tweens[i];
      tw.age += delta;
      const t = Math.min(1, tw.age / tw.duration);
      tw.fn(t);
      if (t >= 1) {
        tweens.splice(i, 1);
        tw.done?.();
      }
    }

    for (let i = popups.length - 1; i >= 0; i -= 1) {
      const p = popups[i];
      p.age += delta;
      tmp.copy(p.position);
      tmp.y += 8 + p.age * 10;
      tmp.project(camera);
      const behind = tmp.z > 1;
      p.el.style.display = behind ? 'none' : '';
      p.el.style.transform = `translate(-50%, -50%) translate(${((tmp.x + 1) / 2) * window.innerWidth}px, ${((1 - tmp.y) / 2) * window.innerHeight}px)`;
      p.el.style.opacity = String(Math.max(0, 1 - Math.max(0, p.age - 0.7) / 0.6));
      if (p.age > 1.3) {
        p.el.remove();
        popups.splice(i, 1);
      }
    }

    // Camera shake decays; main.js reads the offset.
    shake = Math.max(0, shake - delta * 1.8);
  }

  function shakeOffset() {
    if (shake <= 0) return 0;
    return (Math.random() - 0.5) * shake * 1.2;
  }

  return { burst, drop, popup, tween, wobble, topple, crumble, rise, update, shakeOffset, addShake: (s) => (shake = Math.max(shake, s)) };
}

// --- Hands and tools ------------------------------------------------------

/**
 * The first-person arm. It carries whatever fits what you're looking at —
 * axe for trees, pickaxe for rock, a fistful of hay for horses, a shovel to dig.
 */
export function createHands(camera) {
  const rig = new THREE.Group();
  rig.position.set(1.5, -1.3, -3.2);
  rig.scale.setScalar(0.45);
  camera.add(rig);

  const skin = new THREE.MeshLambertMaterial({ color: 0xe0b08a });
  const sleeve = new THREE.MeshLambertMaterial({ color: 0x3d5a8a });
  const wood = new THREE.MeshLambertMaterial({ color: 0x7a4f2a });
  const metal = new THREE.MeshLambertMaterial({ color: 0xb8bcc4 });
  const hayMat = new THREE.MeshLambertMaterial({ color: 0xe0c65e });

  const pivot = new THREE.Group(); // swings from the shoulder
  rig.add(pivot);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 2.2), sleeve);
  arm.position.set(0, 0, 0);
  pivot.add(arm);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), skin);
  hand.position.set(0, 0, -1.3);
  pivot.add(hand);

  const tools = {};
  const handle = (length) => {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, length, 6), wood);
    h.position.y = length / 2 - 0.6;
    return h;
  };

  tools.axe = new THREE.Group();
  tools.axe.add(handle(3.2));
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 1.1), metal);
  blade.position.set(0, 2.3, -0.45);
  tools.axe.add(blade);

  tools.pickaxe = new THREE.Group();
  tools.pickaxe.add(handle(3.2));
  const pick = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 2.6), metal);
  pick.position.set(0, 2.4, 0);
  tools.pickaxe.add(pick);

  tools.shovel = new THREE.Group();
  tools.shovel.add(handle(3.6));
  const spade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.12), metal);
  spade.position.set(0, 3.2, 0);
  tools.shovel.add(spade);

  tools.hay = new THREE.Group();
  for (let i = 0; i < 7; i += 1) {
    const straw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.1), hayMat);
    straw.position.set((Math.random() - 0.5) * 0.6, 0.4, (Math.random() - 0.5) * 0.6);
    straw.rotation.set((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8);
    tools.hay.add(straw);
  }

  for (const tool of Object.values(tools)) {
    tool.position.copy(hand.position);
    tool.rotation.x = -0.9;
    tool.visible = false;
    pivot.add(tool);
  }
  rig.traverse((node) => {
    node.castShadow = false;
    node.renderOrder = 10;
  });

  let current = null;
  let swingT = 1;
  let swingKind = 'chop';
  let bobPhase = 0;
  let forced = null;
  let forcedFor = 0;

  function show(name) {
    if (current === name) return;
    current = name;
    for (const [key, tool] of Object.entries(tools)) tool.visible = key === name;
  }

  return {
    /** Pick the tool that suits the target under the crosshair. */
    hold(name) {
      if (forcedFor <= 0) show(name);
    },
    /** Temporarily force a tool (e.g. the shovel while digging). */
    use(name, seconds = 0.6) {
      forced = name;
      forcedFor = seconds;
      show(name);
    },
    swing(kind = 'chop') {
      swingT = 0;
      swingKind = kind;
    },
    setVisible(v) {
      rig.visible = v;
    },
    update(delta, moving, speed) {
      forcedFor -= delta;
      if (forcedFor <= 0 && forced) forced = null;
      if (moving) bobPhase += delta * (speed / 3);
      const bob = moving ? Math.sin(bobPhase) * 0.12 : 0;
      rig.position.y = -1.3 + Math.abs(bob) * 0.4;
      rig.position.x = 1.5 + bob * 0.25;

      swingT = Math.min(1, swingT + delta * 3.5);
      // Wind up fast, slam down, recover.
      const s = swingT < 0.25 ? -swingT / 0.25 : swingT < 0.45 ? -1 + ((swingT - 0.25) / 0.2) * 2.4 : 1.4 * (1 - (swingT - 0.45) / 0.55);
      if (swingKind === 'offer') {
        pivot.rotation.set(0, 0, 0);
        pivot.position.z = -Math.max(0, Math.sin(swingT * Math.PI)) * 2.4;
      } else {
        pivot.position.z = 0;
        pivot.rotation.x = swingT >= 1 ? 0 : -s * 0.9;
        pivot.rotation.z = swingT >= 1 ? 0 : s * 0.2;
      }
    },
  };
}

// --- Trust meter ----------------------------------------------------------

/** A little bar that floats over a wild horse's head. */
export function createTrustBar() {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 24;
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.scale.set(12, 3, 1);
  sprite.renderOrder = 20;
  let shown = -1;

  sprite.userData.set = (value, spooked) => {
    const key = Math.round(value) + (spooked ? 1000 : 0);
    if (key === shown) return;
    shown = key;
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, 96, 24);
    g.fillStyle = 'rgba(0,0,0,0.65)';
    g.fillRect(0, 4, 96, 16);
    g.fillStyle = spooked ? '#e0584a' : value > 66 ? '#7ad86b' : value > 33 ? '#e8c64a' : '#d88a4a';
    g.fillRect(3, 7, (90 * value) / 100, 10);
    g.font = 'bold 14px monospace';
    g.fillStyle = '#fff';
    g.fillText('♥', 40, 17);
    texture.needsUpdate = true;
  };
  return sprite;
}

/** Translucent footprint shown while choosing where to build. */
export function createGhost(width, depth) {
  const group = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(width, 1.5, depth),
    new THREE.MeshBasicMaterial({ color: 0x9fe08a, transparent: true, opacity: 0.35, depthWrite: false })
  );
  pad.position.y = 0.8;
  group.add(pad);
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width, 30, depth)),
    new THREE.LineBasicMaterial({ color: 0xdfffd0, transparent: true, opacity: 0.8 })
  );
  frame.position.y = 15;
  group.add(frame);
  group.visible = false;
  return group;
}
