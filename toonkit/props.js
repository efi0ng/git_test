// Reusable hand-drawn props. Same conventions as characters: (x, y) is the
// ground/base point, sizes are in local units scaled by `scale`.
import { hash } from './random.js';

function within(ink, x, y, scale, fn) {
  const c = ink.ctx;
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  const prev = ink.scale;
  ink.scale = scale;
  fn();
  ink.scale = prev;
  c.restore();
}

// DJ table with a spinning record. `angle` = record rotation in radians.
export function turntable(ink, x, y, { scale = 1, angle = 0, flip = false, color = '#6a4c93', top = '#2b2433', label = '#ffb627' } = {}) {
  within(ink, x, y, scale, () => {
    if (flip) ink.ctx.scale(-1, 1);
    // Table legs + front.
    ink.shape([[-170, -150], [170, -150], [160, 0], [-160, 0]], { fill: color, hatch: { gap: 12, side: [0, 1], cut: 0.2 } });
    ink.line([[-140, -110], [140, -110]], { lineWidth: 2.4 });
    for (let i = 0; i < 3; i++) ink.circle(-90 + i * 90, -60, 14, { fill: '#ff3d7f', lineWidth: 2.4 });
    // Deck top, seen slightly from above.
    ink.shape([[-185, -150], [185, -150], [170, -200], [-170, -200]], { fill: top });
    // Record: ellipse for perspective, grooves, rotating label marker.
    ink.ellipse(-60, -176, 92, 20, { fill: '#18141c', lineWidth: 2.4 });
    for (const r of [0.75, 0.55]) ink.ellipse(-60, -176, 92 * r, 20 * r, { stroke: '#5a5266', lineWidth: 1.4, fill: null });
    ink.ellipse(-60, -176, 26, 6, { fill: label, lineWidth: 2 });
    ink.dot(-60 + Math.cos(angle) * 18, -176 + Math.sin(angle) * 4, 3.4, '#fffaf0');
    // Mixer knobs + fader.
    for (let i = 0; i < 3; i++) ink.ellipse(80 + i * 30, -182, 9, 4, { fill: '#e8e0d0', lineWidth: 1.8 });
    ink.line([[80, -165], [140, -165]], { lineWidth: 3 });
  });
}

// Speaker stack; `pump` 0..1 pushes the cones out (use clock pulse).
export function speaker(ink, x, y, { scale = 1, pump = 0, color = '#2b2433', trim = '#1fb5a8' } = {}) {
  within(ink, x, y, scale, () => {
    ink.shape([[-80, 0], [80, 0], [76, -320], [-76, -320]], { fill: color, hatch: { gap: 12, side: [1, 0], cut: 0.3, color: '#000' } });
    for (const [cy, r] of [[-95, 58], [-235, 40]]) {
      const k = 1 + pump * 0.12;
      ink.circle(0, cy, r * 1.08, { fill: trim });
      ink.circle(0, cy, r * 0.82 * k, { fill: '#4a4155' });
      ink.circle(0, cy, r * 0.32 * k, { fill: '#1d1512' });
    }
    ink.circle(0, -300, 8, { fill: '#ff3d7f', lineWidth: 2 });
  });
}

// Stage floor: wobbly front edge with hatched planks below `y`.
export function stageFloor(ink, y, { w = 1920, color = '#c98b4a', seed = 2 } = {}) {
  ink.shape([[-40, y], [w + 40, y], [w + 40, y + 600], [-40, y + 600]], { fill: color, hatch: { gap: 14, angle: 0.15, alpha: 0.3 } });
  for (let i = 0; i < 9; i++) {
    const px = (i + 0.5) * (w / 9) + (hash(i, seed) - 0.5) * 40;
    ink.line([[px, y + 4], [px + (px - w / 2) * 0.35, y + 600]], { lineWidth: 2, wobble: 1.2 });
  }
}
