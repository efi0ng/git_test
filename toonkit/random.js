// Deterministic randomness. Every visual decision in toonkit flows through
// these helpers so a given frame always renders identically — required for
// frame-exact video rendering and for characters that look the same in
// every video.

export function hash(...nums) {
  let h = 2166136261 >>> 0;
  for (const n of nums) {
    let x = Math.floor(n * 1000003) | 0;
    h = Math.imul(h ^ x, 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}

export function rng(seed) {
  let a = Math.floor(seed * 4294967296) >>> 0 || 0x9e3779b9;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1D value noise in [-1, 1].
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(i, seed) * 2 - 1;
  const b = hash(i + 1, seed) * 2 - 1;
  return a + (b - a) * u;
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];
