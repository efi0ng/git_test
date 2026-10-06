// Easing curves (t in [0,1]) plus a few motion helpers used by moves/scenes.
import { clamp } from './random.js';

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: (t) =>
    t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};

// Progress of `x` through [a, b], clamped and eased.
export function span(x, a, b, fn = ease.linear) {
  return fn(clamp((x - a) / (b - a)));
}

// Keyframe track: keys = [[time, value], ...] sorted by time. Values may be
// numbers or flat objects of numbers.
export function track(keys, x, fn = ease.inOutCubic) {
  if (x <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (x <= t1) {
      const t = fn((x - t0) / (t1 - t0));
      if (typeof v0 === 'number') return v0 + (v1 - v0) * t;
      const out = {};
      for (const k in v0) out[k] = v0[k] + (v1[k] - v0[k]) * t;
      return out;
    }
  }
  return keys[keys.length - 1][1];
}
