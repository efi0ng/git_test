// Hand-drawn effects and set dressing: splats, sunbursts, papel picado,
// confetti, motion lines, brush wipes, and hand-lettered type.
import { hash, rng, noise1 } from './random.js';
import { ease } from './ease.js';

// Paint splat blob with droplets.
export function splat(ink, x, y, r, color, seed = 0, grow = 1) {
  const R = rng(seed + 0.123);
  const pts = [];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const spike = R() < 0.25 ? 1.35 + R() * 0.4 : 0.85 + R() * 0.25;
    pts.push([x + Math.cos(a) * r * spike * grow, y + Math.sin(a) * r * spike * grow]);
  }
  ink.shape(pts, { fill: color, stroke: false, misprint: 0, wobble: 5 });
  for (let i = 0; i < 7; i++) {
    const a = R() * Math.PI * 2;
    const d = r * (1.5 + R() * 0.9) * grow;
    ink.circle(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.06 + R() * 0.1) * grow, { fill: color, stroke: false, misprint: 0 });
  }
}

// Poster sunburst rays behind a subject.
export function sunburst(ctx, cx, cy, { rays = 18, color = '#ffb627', alt = null, rot = 0, radius = 2200, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  for (let i = 0; i < rays; i++) {
    const a0 = rot + (i / rays) * Math.PI * 2;
    const a1 = a0 + (Math.PI / rays) * 0.9;
    ctx.fillStyle = i % 2 === 0 ? color : alt ?? 'rgba(0,0,0,0)';
    if (i % 2 === 1 && !alt) continue;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * radius, cy + Math.sin(a0) * radius);
    ctx.lineTo(cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// String of papel picado flags hanging across the frame.
export function papelPicado(ink, { y = 40, x0 = -40, x1 = 1960, count = 12, colors, t = 0, sag = 40, seed = 3, paper = '#f4ead5' } = {}) {
  const c = ink.ctx;
  const cols = colors ?? ['#ff3d7f', '#1fb5a8', '#ffb627', '#6a4c93', '#e63946', '#8bc34a'];
  const str = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    str.push([x0 + (x1 - x0) * u, y + Math.sin(u * Math.PI) * sag]);
  }
  ink.line(str, { lineWidth: 2.2 });
  const w = ((x1 - x0) / count) * 0.82;
  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count;
    const px = x0 + (x1 - x0) * u;
    const py = y + Math.sin(u * Math.PI) * sag;
    const swing = Math.sin(t * 2.2 + i * 0.9) * 0.08 + noise1(t * 0.8 + i, seed) * 0.05;
    c.save();
    c.translate(px, py);
    c.rotate(swing);
    const h = w * 1.15;
    const pts = [[-w / 2, 0], [w / 2, 0], [w / 2, h * 0.8]];
    // Zigzag bottom edge.
    const zz = 7;
    for (let k = 0; k <= zz; k++) pts.push([w / 2 - (k / zz) * w, h * 0.8 + (k % 2 ? h * 0.12 : 0)]);
    ink.shape(pts, { fill: cols[i % cols.length], wobble: 1.4, misprint: 2 });
    // Cut-out pattern: flower + dots in paper colour.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      ink.ellipse(Math.cos(a) * w * 0.14, h * 0.4 + Math.sin(a) * w * 0.14, w * 0.07, w * 0.04, { fill: paper, stroke: false, misprint: 0, rot: a, wobble: 0.6 });
    }
    ink.circle(0, h * 0.4, w * 0.05, { fill: paper, stroke: false, misprint: 0, wobble: 0.5 });
    for (const sx of [-1, 1]) for (const sy of [0.15, 0.68]) ink.circle(sx * w * 0.32, h * sy, w * 0.035, { fill: paper, stroke: false, misprint: 0, wobble: 0.4 });
    c.restore();
  }
}

// Confetti burst from (x, y) at time `since` (seconds since the burst).
export function confetti(ink, x, y, since, { count = 60, seed = 9, colors, spread = 900, gravity = 900 } = {}) {
  if (since < 0) return;
  const cols = colors ?? ['#ff3d7f', '#1fb5a8', '#ffb627', '#6a4c93', '#e63946', '#8bc34a'];
  const c = ink.ctx;
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (hash(i, seed) - 0.5) * 2.4;
    const v = spread * (0.45 + hash(i, seed + 1) * 0.7);
    const px = x + Math.cos(a) * v * since;
    const py = y + Math.sin(a) * v * since + 0.5 * gravity * since * since;
    const r = hash(i, seed + 2) * 6 + since * (4 + hash(i, seed + 3) * 8);
    c.save();
    c.translate(px, py);
    c.rotate(r);
    c.scale(1, Math.cos(since * 9 + i));
    ink.rect(-7, -4, 14, 8, { fill: cols[i % cols.length], lineWidth: 1.6, misprint: 1, wobble: 0.6, id: 5000 + i });
    c.restore();
  }
}

// Motion lines trailing behind something moving in direction `angle`.
export function motionLines(ink, x, y, angle, { count = 4, len = 80, spread = 60, seed = 1 } = {}) {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  for (let i = 0; i < count; i++) {
    const off = (i / (count - 1) - 0.5) * spread;
    const l = len * (0.6 + hash(i, seed) * 0.6);
    const bx = x - ca * 30 + -sa * off;
    const by = y - sa * 30 + ca * off;
    ink.line([[bx, by], [bx - ca * l, by - sa * l]], { lineWidth: 3 });
  }
}

// Comic "zap" starburst behind a word.
export function zap(ink, x, y, r, color, { points = 12, seed = 2, rot = 0 } = {}) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i / (points * 2)) * Math.PI * 2;
    const rr = i % 2 ? r * (0.62 + hash(i, seed) * 0.1) : r * (0.95 + hash(i, seed + 1) * 0.15);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.72]);
  }
  ink.shape(pts, { fill: color, lineWidth: 4 });
}

// A big painted brush stroke that sweeps across the screen; use as a
// transition. u: 0..1 progress. Returns nothing; covers the frame at u≈0.5.
export function brushWipe(ctx, w, h, u, color, { seed = 4 } = {}) {
  if (u <= 0 || u >= 1) return;
  const head = ease.inOutCubic(Math.min(1, u * 2)) * (w + 600) - 300;
  const tail = ease.inOutCubic(Math.max(0, u * 2 - 1)) * (w + 600) - 300;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const yy = (i / n) * h;
    ctx.lineTo(head + noise1(i * 0.5, seed) * 80 + Math.sin(i * 0.9) * 30, yy);
  }
  for (let i = n; i >= 0; i--) {
    const yy = (i / n) * h;
    ctx.lineTo(tail + noise1(i * 0.5, seed + 9) * 80 + Math.sin(i * 0.7) * 30, yy);
  }
  ctx.closePath();
  ctx.fill();
  // Dry-brush streaks at the leading edge.
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const yy = hash(i, seed) * h;
    const l = 40 + hash(i, seed + 1) * 160;
    ctx.lineWidth = 2 + hash(i, seed + 2) * 10;
    const hx = head + noise1((yy / h) * 15, seed) * 80;
    ctx.beginPath();
    ctx.moveTo(hx - 10, yy);
    ctx.lineTo(hx + l * (u < 0.5 ? 1 : 0.3), yy + (hash(i, 7) - 0.5) * 6);
    ctx.stroke();
  }
  ctx.restore();
}

// Hand-lettered word: each letter jittered, rotated, popped in with
// overshoot, with an offset ink "shadow" printed underneath.
// `u` = 0..1 reveal progress. Requires the font to be loaded.
export function letters(ctx, text, x, y, {
  size = 160,
  font = 'Permanent Marker',
  fill = '#ffb627',
  ink = '#1d1512',
  u = 1,
  seed = 1,
  boil = 0,
  shadow = 10,
  stagger = 0.6,
  tracking = 0.02,
  align = 'center',
  outline = 6,
} = {}) {
  ctx.save();
  ctx.font = `${size}px "${font}"`;
  ctx.textBaseline = 'middle';
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width + size * tracking);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  chars.forEach((ch, i) => {
    const start = (i / Math.max(1, chars.length)) * stagger;
    const lu = Math.max(0, Math.min(1, (u - start) / (1 - stagger || 1)));
    const w = widths[i];
    if (lu > 0 && ch !== ' ') {
      const s = ease.outBack(lu, 2.2);
      const rot = (hash(i, seed) - 0.5) * 0.22 + noise1(boil * 0.9 + i, seed) * 0.03;
      const dy = (hash(i, seed + 1) - 0.5) * size * 0.12 + noise1(boil + i * 3, seed) * 1.5;
      ctx.save();
      ctx.translate(cx + w / 2, y + dy);
      ctx.rotate(rot);
      ctx.scale(s, s);
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.fillStyle = ink;
      ctx.fillText(ch, shadow, shadow);
      ctx.strokeStyle = ink;
      ctx.lineWidth = outline;
      ctx.strokeText(ch, 0, 0);
      ctx.fillStyle = fill;
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
    cx += w;
  });
  ctx.restore();
  return total;
}
