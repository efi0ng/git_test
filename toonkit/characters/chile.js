// CHILE — little chili-pepper hype crowd. Cheap to draw, so use dozens.
// Not rigged: a curved body that squashes and hops on the beat.
import { eye } from '../character.js';
import { hash } from '../random.js';

export const palette = {
  colors: ['#e63946', '#ff7b39', '#ffb627', '#8bc34a', '#c2185b'],
  stem: '#3f8f3a',
};

// Draw one chile. `beat` drives the hop; `seed` picks colour, size and
// personality so a given seed is always the same little guy.
export function drawChile(ink, { x, y, scale = 1, beat = 0, seed = 0, hop = 1, blink = 0 }) {
  const c = ink.ctx;
  const col = palette.colors[Math.floor(hash(seed, 1) * palette.colors.length)];
  const size = 0.8 + hash(seed, 2) * 0.45;
  const lean = (hash(seed, 3) - 0.5) * 0.5;
  const phase = hash(seed, 4) * 0.25;
  const f = (((beat + phase) % 1) + 1) % 1;
  const jump = Math.sin(f * Math.PI) * 26 * hop;
  const squash = f < 0.12 ? (1 - f / 0.12) * 0.22 * hop : 0;
  const s = scale * size;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  const prev = ink.scale;
  ink.scale = s;
  c.save();
  c.globalAlpha = 0.16;
  c.fillStyle = '#3a2410';
  c.beginPath();
  c.ellipse(0, 3, 22 - jump * 0.2, 6, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.translate(0, -jump);
  c.scale(1 + squash, 1 - squash);
  c.rotate(lean + Math.sin((beat + phase) * Math.PI) * 0.12);
  // Little legs.
  ink.line([[-7, -12], [-9, 0], [-14, 0]], { lineWidth: 3.2 });
  ink.line([[7, -12], [9, 0], [14, 0]], { lineWidth: 3.2 });
  // Curved pepper body, fat at the top, curling at the tip.
  const curl = hash(seed, 5) > 0.5 ? 1 : -1;
  const spine = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    spine.push([Math.sin(u * 2.4) * 10 * curl * u, -80 + u * 70]);
  }
  ink.limb(spine, [40, 12], { fill: col, hatch: { gap: 7, side: [curl, 0], cut: 0.2 } });
  // Stem cap.
  ink.shape([[-16, -80], [16, -80], [8, -90], [-8, -90]], { fill: palette.stem, lineWidth: 2.4 });
  ink.line([[0, -88], [4 * curl, -102], [10 * curl, -104]], { stroke: palette.stem, lineWidth: 5 });
  ink.line([[0, -88], [4 * curl, -102], [10 * curl, -104]], { lineWidth: 1.6 });
  eye(ink, -7, -62, 6, { blink, pupil: 0.6 });
  eye(ink, 7, -62, 6, { blink, pupil: 0.6 });
  ink.line([[-6, -50], [0, -46], [6, -50]], { lineWidth: 2.4 });
  ink.scale = prev;
  c.restore();
}

export const chile = { name: 'Chile', role: 'Crowd', palette, draw: drawChile };
