// Character: a named bundle of proportions + palette + a draw function that
// paints body parts onto solved rig joints. Characters never store
// animation state; everything comes in through the pose, so the same
// character can be dropped into any video and driven by any move.

import { solve, pose as makePose } from './rig.js';

export class Character {
  /**
   * @param {object} def
   * @param {string} def.name
   * @param {object} def.proportions  rig proportions (see rig.solve)
   * @param {object} def.palette      named colours used by the draw function
   * @param {function} def.draw       (ink, J, ctx) => void
   * @param {number} [def.height]     approximate height in local units
   * @param {object} [def.restPose]   pose tweaks that suit this character
   */
  constructor(def) {
    Object.assign(this, def);
    this.restPose = makePose(def.restPose ?? {});
  }

  // Draw at (x, y) = ground point on screen. `pose` is a full or partial pose
  // (partial values are layered over the character's rest pose).
  draw(ink, { x = 0, y = 0, scale = 1, pose = {}, flip = false, t = 0, props = {} } = {}) {
    const p = { ...this.restPose, ...pose };
    const J = solve(this.proportions, p);
    const c = ink.ctx;
    c.save();
    c.translate(x, y);
    const sx = scale * (flip ? -1 : 1) * (Math.abs(p.turn) < 0.04 ? 0.04 * Math.sign(p.turn || 1) : p.turn);
    c.scale(sx, scale);
    const prevScale = ink.scale;
    ink.scale = Math.abs(scale);
    // Contact shadow (not affected by lift: it shrinks instead).
    const shadowW = this.proportions.stance * 0.9 + 30;
    const s = 1 / (1 + (p.lift ?? 0) / 120);
    c.save();
    c.globalAlpha = 0.18 * s;
    c.fillStyle = '#3a2410';
    c.beginPath();
    c.ellipse(p.x, 4, shadowW * s, 10 * s, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    this.paint(ink, J, { p, P: this.proportions, pal: this.palette, t, props });
    ink.scale = prevScale;
    c.restore();
    return J;
  }

  paint(ink, J, ctx) {
    this.drawFn(ink, J, ctx);
  }
}

// ---- shared drawing helpers for character authors ------------------------

export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, k) => [a[0] * k, a[1] * k];
export const mid = (a, b, t = 0.5) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const angleOf = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);

// Position in a body-aligned frame: `o` is origin, `up`/`side` unit axes.
export const local = (o, side, up, x, y) => [o[0] + side[0] * x - up[0] * y, o[1] + side[1] * x - up[1] * y];

// Cartoon eye with lid blink and pupil look direction.
export function eye(ink, x, y, r, { blink = 0, look = 0, lid = null, pupil = 0.42, white = '#fffdf6', lookY = 0 } = {}) {
  ink.circle(x, y, r, { fill: white, misprint: 1.5 });
  if (blink < 0.85) {
    const pr = r * pupil;
    ink.dot(x + look * r * 0.38, y + lookY * r * 0.3 + r * 0.08, pr);
    ink.dot(x + look * r * 0.38 - pr * 0.35, y + r * 0.08 - pr * 0.4, pr * 0.28, '#fffdf6');
  }
  if (blink > 0.05) {
    // Lid comes down from the top.
    const h = r * 2 * Math.min(1, blink);
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI + (i / 14) * Math.PI;
      pts.push([x + Math.cos(a) * r * 1.04, y + Math.sin(a) * r * 1.04]);
    }
    const bottom = y - r + h;
    pts.push([x + r * 1.04, bottom]);
    pts.push([x - r * 1.04, bottom]);
    ink.shape(pts, { fill: lid ?? '#c9b48c', misprint: 0.5 });
  }
}

// Mouth: closed = smile line, open = dark shape with tongue.
export function mouth(ink, x, y, w, open, { tongue = '#f0587a', inside = '#4a1418', smile = 0.35, teeth = false } = {}) {
  if (open < 0.08) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10 - 0.5;
      pts.push([x + u * w, y + (0.25 - u * u) * w * smile]);
    }
    ink.line(pts, { lineWidth: 3.4 });
    return;
  }
  const h = w * 0.55 * open;
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    pts.push([x - w / 2 + u * w, y - Math.sin(u * Math.PI) * h * 0.18]);
  }
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    pts.push([x + w / 2 - u * w, y + Math.sin(u * Math.PI) * h]);
  }
  ink.shape(pts, { fill: inside, misprint: 1 });
  if (teeth) ink.rect(x - w * 0.18, y - h * 0.05, w * 0.36, h * 0.28, { fill: '#fffdf6', lineWidth: 2 });
  if (open > 0.3) ink.ellipse(x, y + h * 0.62, w * 0.26, h * 0.26, { fill: tongue, lineWidth: 2.2 });
}
