// Brick Rally driving model (pure). Arcade physics with honest parts: the engine pushes
// along the car's nose, tyres kill sideways sliding at a rate set by grip, air drag grows
// with speed², grass is slow, and the brick wall stops you. Fixed 60 Hz steps.

import { locate, pointAt, angleDiff } from './track.mjs';

export const DT = 1 / 60;

export function newCar(slot, stats) {
  return { x: slot.x, z: slot.z, h: slot.h, vx: 0, vz: 0, steer: 0, i: -1, lateral: 0, s: 0, lap: 0, half: false, prog: 0, wheelSpin: 0, offroad: false, bump: 0, stats };
}

/**
 * Advance one car by dt. input = { throttle: -1…1, steer: -1…1 (+ = right) }.
 * Lap counting: a lap counts when the car crosses the line having passed half-way.
 */
export function stepCar(car, input, track, dt = DT) {
  const st = car.stats;
  const fx = Math.sin(car.h), fz = Math.cos(car.h);
  const rx = Math.cos(car.h), rz = -Math.sin(car.h);
  let vF = car.vx * fx + car.vz * fz;
  let vR = car.vx * rx + car.vz * rz;
  const top = st.topSpeed * (car.offroad ? 0.55 : 1);
  const thr = Math.max(-1, Math.min(1, input.throttle || 0));
  if (thr > 0) vF += thr * st.accel * (1 - Math.max(0, vF) / top) * dt * 1.6;
  else if (thr < 0) vF += thr * (vF > 0.5 ? st.accel * 1.6 : st.accel * 0.6) * dt; // brake, then reverse
  if (vF < -top * 0.35) vF = -top * 0.35;
  // rolling resistance + air drag
  vF -= vF * (car.offroad ? 1.4 : 0.25) * dt + 0.0009 * vF * Math.abs(vF) * dt * 10;
  if (!thr && Math.abs(vF) < 0.3) vF = 0;
  // tyres: sideways slip decays at a rate set by grip (lower on grass)
  vR *= Math.exp(-st.grip * (car.offroad ? 1.6 : 3.2) * dt);
  // steering: smooth the wheel, turn rate peaks at mid speed and fades when very fast
  const want = Math.max(-1, Math.min(1, input.steer || 0));
  car.steer += (want - car.steer) * Math.min(1, dt * 10);
  const sp = Math.abs(vF);
  const turn = 2.6 * Math.min(1, sp / 8) / (1 + sp / 55);
  car.h -= car.steer * turn * Math.sign(vF || 1) * dt;
  const nfx = Math.sin(car.h), nfz = Math.cos(car.h), nrx = Math.cos(car.h), nrz = -Math.sin(car.h);
  car.vx = nfx * vF + nrx * vR;
  car.vz = nfz * vF + nrz * vR;
  car.x += car.vx * dt;
  car.z += car.vz * dt;
  car.wheelSpin += vF * dt / 0.45;
  if (car.bump > 0) car.bump = Math.max(0, car.bump - dt * 3);
  trackContact(car, track);
}

export function trackContact(car, track) {
  const prevS = car.s, prevI = car.i;
  const loc = locate(track, car.x, car.z, car.i);
  car.i = loc.i; car.lateral = loc.lateral; car.s = loc.s;
  car.offroad = Math.abs(loc.lateral) > track.half + 0.4;
  const limit = track.wall - 0.9;
  if (Math.abs(loc.lateral) > limit) {
    // push back inside the wall and remove the velocity heading into it
    const nx = track.tz[loc.i] * Math.sign(loc.lateral), nz = -track.tx[loc.i] * Math.sign(loc.lateral);
    const over = Math.abs(loc.lateral) - limit;
    car.x -= nx * over; car.z -= nz * over;
    const into = car.vx * nx + car.vz * nz;
    if (into > 0) {
      car.vx -= nx * into * 1.4; car.vz -= nz * into * 1.4;
      car.vx *= 0.8; car.vz *= 0.8;
      car.bump = Math.min(1, into / 12);
    }
    car.lateral = Math.sign(loc.lateral) * limit;
  }
  if (prevI < 0) return;
  // laps: s wraps from ~length to ~0 going forward
  const L = track.length;
  if (car.s > L * 0.4 && car.s < L * 0.6) car.half = true;
  if (prevS > L * 0.75 && car.s < L * 0.25 && car.half) { car.lap++; car.half = false; }
  else if (prevS < L * 0.25 && car.s > L * 0.75 && car.lap > 0 && !car.half) { car.lap--; car.half = true; } // reversed over the line
  car.prog = car.lap * L + car.s + (car.s > L * 0.75 && !car.half ? -L : 0);
}

/** Bounce two cars apart (both move when both are local; pass mine=false for a remote car). */
export function collideCars(a, b, moveB = true) {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = 2.6;
  if (d >= min || d < 1e-6) return false;
  const nx = dx / d, nz = dz / d, push = (min - d) / (moveB ? 2 : 1);
  a.x -= nx * push; a.z -= nz * push;
  if (moveB) { b.x += nx * push; b.z += nz * push; }
  const rel = (a.vx - (b.vx || 0)) * nx + (a.vz - (b.vz || 0)) * nz;
  if (rel > 0) {
    a.vx -= nx * rel * 0.7; a.vz -= nz * rel * 0.7;
    if (moveB) { b.vx += nx * rel * 0.7; b.vz += nz * rel * 0.7; }
    a.bump = Math.min(1, rel / 10);
  }
  return true;
}

// ---------------------------------------------------------------------------------------
// Bots. They look ahead along the centre line (with their own lane offset), aim at it, and
// brake when the curve ahead is sharper than their speed allows. `skill` 0.8 … 1.

export function botInput(car, track, skill = 0.9, lane = 0) {
  const sp = Math.hypot(car.vx, car.vz);
  const ahead = pointAt(track, car.s + 7 + sp * 0.45);
  const tx = ahead.x + ahead.tz * lane, tz = ahead.z - ahead.tx * lane;
  const want = Math.atan2(tx - car.x, tz - car.z);
  const err = angleDiff(want, car.h);
  // look further for braking
  let bend = 0;
  for (let k = 8; k <= 40; k += 4) bend = Math.max(bend, track.curv[pointAt(track, car.s + k + sp * 0.3).i]);
  const safe = (12 + 30 / (1 + bend * 22)) * (0.75 + skill * 0.35);
  const throttle = sp > safe ? -0.6 : sp > safe * 0.92 ? 0.2 : 1;
  return { throttle, steer: Math.max(-1, Math.min(1, -err * 2.4)) };
}

/** Rank cars by progress (finished cars first, by finish time). */
export function standings(cars) {
  return [...cars].sort((a, b) => {
    if (a.finishTime != null || b.finishTime != null) {
      if (a.finishTime == null) return 1;
      if (b.finishTime == null) return -1;
      return a.finishTime - b.finishTime;
    }
    return (b.car?.prog ?? 0) - (a.car?.prog ?? 0);
  });
}
