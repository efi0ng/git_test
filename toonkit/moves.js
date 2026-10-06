// Moves: pure functions of musical time → partial pose.
//
// Every move takes the beat position `b` (float, from Clock) and an options
// object, and returns pose values. They are character-agnostic: the rig
// maps them onto each character's proportions. Combine them with
// rig.layer (additive) or rig.override (replace), and use `mouthRap` /
// `blinkAt` for faces.

import { hash, noise1 } from './random.js';
import { ease } from './ease.js';

const TAU = Math.PI * 2;
const frac = (x) => ((x % 1) + 1) % 1;
// 1 on the beat, falling to 0 by `width` of a beat: the "hit".
const hit = (b, width = 0.35) => Math.max(0, 1 - frac(b) / width);
// Smooth down-up bounce: 0 at the beat, peaking mid-beat.
const bounceCurve = (b) => Math.sin(frac(b) * Math.PI);

export function idle(b, { amp = 1 } = {}) {
  return {
    hipDrop: (3 + Math.sin(b * Math.PI) * 3) * amp,
    armL: 0.4 + Math.sin(b * Math.PI) * 0.05,
    armR: 0.4 - Math.sin(b * Math.PI) * 0.05,
    headTilt: Math.sin(b * Math.PI * 0.5) * 0.04,
  };
}

// Knees dip hard on every beat, head nods a touch late.
export function bounce(b, { amp = 1 } = {}) {
  const down = 1 - bounceCurve(b);
  return {
    hipDrop: down * 16 * amp,
    headBob: hit(b - 0.08, 0.5) * 6 * amp,
    squash: down * 0.06 * amp,
    armL: 0.45 + down * 0.15,
    armR: 0.45 + down * 0.15,
  };
}

// Reggaeton dembow step: hips swing side to side over two beats, feet tap
// alternately, arms pump on the snare accents.
export function dembow(b, { amp = 1, arms = true } = {}) {
  const side = Math.sin(b * Math.PI); // + right on odd beats
  const down = 1 - bounceCurve(b);
  const cyc = frac(b / 2) * 2;
  const snare = Math.max(hit(cyc - 0.75, 0.3), hit(cyc - 1.5, 0.3));
  const out = {
    sway: side * 18 * amp,
    lean: side * 0.1 * amp,
    hipDrop: (6 + down * 14) * amp,
    headTilt: -side * 0.12 * amp + snare * 0.08,
    footLy: Math.max(0, -side) * 12 * amp,
    footRy: Math.max(0, side) * 12 * amp,
    squash: down * 0.05 * amp,
  };
  if (arms) {
    out.armL = 0.6 + (side < 0 ? 1.1 : 0.3) * Math.abs(side) * amp + snare * 0.2;
    out.elbowL = 1.3;
    out.armR = 0.6 + (side > 0 ? 1.1 : 0.3) * Math.abs(side) * amp + snare * 0.2;
    out.elbowR = 1.3;
  }
  return out;
}

// Rapper stance: mic hand (right) up at the mouth, free hand chops the
// rhythm. `flow` > 1 makes it busier.
export function rap(b, { flow = 1, micSide = 'R', hold = true } = {}) {
  const chop = hit(b * flow, 0.45);
  const lean = noise1(b * 0.7, 9) * 0.08;
  const free = {
    arm: 0.9 + chop * 0.7 + noise1(b * 0.5, 3) * 0.2,
    elbow: 1.1 - chop * 0.6,
  };
  const out = {
    lean,
    headBob: chop * 7,
    hipDrop: 8 + (1 - bounceCurve(b)) * 10,
  };
  if (micSide === 'R') {
    Object.assign(out, { armR: 0.55, elbowR: 2.1, holdR: hold ? 1 : 0, armL: free.arm, elbowL: free.elbow });
  } else {
    Object.assign(out, { armL: 0.55, elbowL: 2.1, holdL: hold ? 1 : 0, armR: free.arm, elbowR: free.elbow });
  }
  return out;
}

// DJ scratch: right wing works the record in 16ths, left wing holds a
// headphone cup.
export function scratch(b, { speed = 4 } = {}) {
  const s = Math.sin(b * speed * Math.PI);
  return {
    holdL: 0,
    holdR: 0,
    armR: 0.95 + s * 0.25,
    elbowR: -0.9 + s * 0.35,
    armL: 2.6,
    elbowL: 2.0,
    lean: 0.06 + s * 0.02,
    headTilt: -0.18 + hit(b, 0.4) * 0.1,
    hipDrop: 6 + (1 - bounceCurve(b)) * 12,
  };
}

// B-boy toprock: cross-step in front, arms open wide.
export function toprock(b, { amp = 1 } = {}) {
  const ph = frac(b / 2);
  const left = ph < 0.5;
  const step = Math.sin(frac(b) * Math.PI);
  return {
    holdL: 0,
    holdR: 0,
    footLx: left ? step * 60 * amp : 0,
    footLy: left ? step * 14 : 0,
    footRx: left ? 0 : -step * 60 * amp,
    footRy: left ? 0 : step * 14,
    sway: (left ? 1 : -1) * step * 14,
    lean: (left ? -1 : 1) * step * 0.14,
    armL: left ? 1.6 : 0.8,
    elbowL: left ? 0.3 : 1.6,
    armR: left ? 0.8 : 1.6,
    elbowR: left ? 1.6 : 0.3,
    hipDrop: 10 + step * 6,
  };
}

// Both arms up, pumping on the beat. The hype.
export function hype(b, { amp = 1 } = {}) {
  const h = hit(b, 0.5);
  return {
    holdL: 0,
    holdR: 0,
    armL: 2.15 + h * 0.3 * amp,
    elbowL: 0.15 + h * 0.35,
    armR: 2.15 + h * 0.3 * amp,
    elbowR: 0.15 + h * 0.35,
    hipDrop: (1 - bounceCurve(b)) * 18 * amp,
    headBob: h * 6,
    squash: h * 0.08,
  };
}

// Point to the sky / crowd with one arm.
export function point(b, { side = 'R' } = {}) {
  const h = hit(b, 0.5);
  const arm = 2.3 + h * 0.15;
  return side === 'R'
    ? { armR: arm, elbowR: 0.05, holdR: 0, armL: 0.6, elbowL: 1.3, lean: 0.06 }
    : { armL: arm, elbowL: 0.05, holdL: 0, armR: 0.6, elbowR: 1.3, lean: -0.06 };
}

// Jump: call with beats elapsed since takeoff. Returns {} outside the jump.
export function jump(since, { dur = 1, height = 110 } = {}) {
  if (since < 0 || since > dur) return {};
  const u = since / dur;
  const anticip = u < 0.15 ? Math.sin((u / 0.15) * Math.PI) : 0;
  const air = u >= 0.15 ? Math.sin(((u - 0.15) / 0.85) * Math.PI) : 0;
  return {
    holdL: 0,
    holdR: 0,
    lift: air * height,
    hipDrop: anticip * 20 - air * 4,
    footLy: air * 26,
    footRy: air * 26,
    footLx: -air * 10,
    footRx: air * 10,
    armL: 0.4 + air * 2.2,
    armR: 0.4 + air * 2.2,
    elbowL: 0.2,
    elbowR: 0.2,
    squash: anticip * 0.14 - air * 0.06,
  };
}

// Paper cut-out spin: returns turn (-1..1) for beats elapsed since start.
export function spin(since, { dur = 1, turns = 1 } = {}) {
  if (since < 0 || since > dur) return {};
  const u = ease.inOutCubic(since / dur);
  return { turn: Math.cos(u * turns * TAU) };
}

// Freeze: a held b-boy pose with a little settle wobble.
export function freeze(since) {
  const settle = Math.exp(-Math.max(0, since) * 4) * Math.sin(since * 20) * 0.05;
  return {
    holdL: 0,
    holdR: 0,
    lean: -0.32 + settle,
    armL: 0.25,
    elbowL: 0.1,
    armR: 2.7,
    elbowR: 0.9,
    footRx: 40,
    footRy: 40,
    hipDrop: 26,
    headTilt: 0.25,
  };
}

// Rap mouth: syllables on 16ths with deterministic variety. Pass `energy`
// (0..1, e.g. vocal-band loudness) to follow a real vocal instead.
export function mouthRap(b, { seed = 1, density = 0.75, energy = null } = {}) {
  if (energy != null) return Math.min(1, Math.max(0, energy * 1.4 - 0.1));
  const step = Math.floor(b * 4);
  const on = hash(step, seed) < density;
  const amt = 0.35 + hash(step, seed + 1) * 0.65;
  const within = frac(b * 4);
  return on ? amt * Math.sin(Math.min(1, within * 1.4) * Math.PI) : 0.02;
}

// Natural blinks every few seconds, deterministic per seed.
export function blinkAt(t, { seed = 1, every = 3.2 } = {}) {
  const k = Math.floor(t / every);
  const at = k * every + hash(k, seed) * (every - 0.4);
  const d = t - at;
  return d >= 0 && d < 0.16 ? Math.sin((d / 0.16) * Math.PI) : 0;
}
