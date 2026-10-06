// Ink: hand-drawn rendering primitives on a raw CanvasRenderingContext2D.
//
// The look comes from three tricks used together:
//   1. Wobble   – every edge is resampled and pushed around by smooth noise.
//   2. Boil     – the noise seed changes a few times per second (classic
//                 hand-drawn "line boil"), so still drawings feel alive.
//   3. Misprint – colour fills sit slightly off the ink outline, like a
//                 screen print or a quick marker colouring job.
//
// Shapes get a stable identity from their draw order inside a frame
// (`beginFrame` resets the counter), so the same shape wobbles the same way
// within one boil step no matter what else changes.

import { hash, noise1 } from './random.js';

export const INK = '#1d1512';

export class Ink {
  constructor(ctx, opts = {}) {
    this.ctx = ctx;
    this.seed = opts.seed ?? 1;
    this.wobble = opts.wobble ?? 2.2; // px of edge wobble at scale 1
    this.lineWidth = opts.lineWidth ?? 3.2;
    this.ink = opts.ink ?? INK;
    this.misprint = opts.misprint ?? 5; // px fill offset at scale 1
    this.scale = 1; // set by callers that draw in scaled local space
    this.boil = 0;
    this._n = 0;
  }

  beginFrame(boilKey) {
    this.boil = boilKey;
    this._n = 0;
  }

  // Next shape id. Pass an explicit id to keep a shape's wobble stable even
  // when draw order changes (e.g. something appears conditionally before it).
  id(explicit) {
    return explicit ?? ++this._n;
  }

  // ---- geometry helpers -------------------------------------------------

  // Resample a polyline/polygon so wobble is applied evenly.
  resample(pts, step, closed) {
    const out = [];
    const n = pts.length;
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const k = Math.max(1, Math.ceil(len / step));
      for (let j = 0; j < k; j++) {
        const t = j / k;
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }

  jitter(pts, id, amp, closed) {
    const s = this.seed * 131 + id * 17.3 + this.boil * 7.77;
    const step = 6 / this.scale;
    const rs = this.resample(pts, step, closed);
    const a = amp / this.scale;
    return rs.map((p, i) => [
      p[0] + noise1(i * 0.21, s) * a,
      p[1] + noise1(i * 0.21, s + 51.7) * a,
    ]);
  }

  trace(pts, closed) {
    const c = this.ctx;
    c.beginPath();
    if (pts.length < 2) return;
    // Quadratic smoothing through midpoints gives a brushy, rounded line.
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    c.lineTo(last[0], last[1]);
    if (closed) c.closePath();
  }

  // ---- primitives -------------------------------------------------------

  // A closed shape with misprinted fill, optional hatching and a double
  // pass ink outline. pts are [[x,y],...] in the current transform.
  shape(pts, o = {}) {
    const id = this.id(o.id);
    const c = this.ctx;
    const k = this.scale;
    if (o.fill) {
      const mis = (o.misprint ?? this.misprint) / k;
      const dx = (hash(id, this.seed, 1) - 0.5) * 2 * mis;
      const dy = (hash(id, this.seed, 2) - 0.5) * 2 * mis;
      const fp = this.jitter(pts, id + 0.5, (o.wobble ?? this.wobble) * 1.4, true);
      c.save();
      c.translate(dx, dy);
      this.trace(fp, true);
      c.fillStyle = o.fill;
      c.fill();
      c.restore();
    }
    if (o.hatch) this.hatchIn(pts, id, o.hatch);
    if (o.stroke !== false) {
      const lw = (o.lineWidth ?? this.lineWidth) / k;
      const col = o.stroke ?? this.ink;
      c.lineJoin = 'round';
      c.lineCap = 'round';
      c.strokeStyle = col;
      c.lineWidth = lw;
      this.trace(this.jitter(pts, id, o.wobble ?? this.wobble, true), true);
      c.stroke();
      // Second, thinner, looser pass reads as a sketchy redraw.
      c.globalAlpha *= 0.55;
      c.lineWidth = lw * 0.5;
      this.trace(this.jitter(pts, id + 1000, (o.wobble ?? this.wobble) * 1.8, true), true);
      c.stroke();
      c.globalAlpha /= 0.55;
    }
  }

  // Open stroke (hair, mouth lines, motion lines...).
  line(pts, o = {}) {
    const id = this.id(o.id);
    const c = this.ctx;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.strokeStyle = o.stroke ?? this.ink;
    c.lineWidth = (o.lineWidth ?? this.lineWidth) / this.scale;
    this.trace(this.jitter(pts, id, o.wobble ?? this.wobble, false), false);
    c.stroke();
  }

  ellipsePts(x, y, rx, ry, rot = 0, n = 28) {
    const pts = [];
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const ex = Math.cos(a) * rx;
      const ey = Math.sin(a) * ry;
      pts.push([x + ex * cr - ey * sr, y + ex * sr + ey * cr]);
    }
    return pts;
  }

  ellipse(x, y, rx, ry, o = {}) {
    this.shape(this.ellipsePts(x, y, rx, ry, o.rot ?? 0, o.segments ?? 28), o);
  }

  circle(x, y, r, o = {}) {
    this.ellipse(x, y, r, r, o);
  }

  rect(x, y, w, h, o = {}) {
    this.shape(
      [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ],
      o,
    );
  }

  // Solid dot with no outline (pupils, buttons, spots).
  dot(x, y, r, color = this.ink) {
    this.ellipse(x, y, r, r, { fill: color, stroke: false, misprint: 0, wobble: 0.6 });
  }

  // Tapered limb along a polyline (shoulder->elbow->hand). Width may be a
  // number or [startWidth, endWidth].
  limb(path, width, o = {}) {
    const [w0, w1] = Array.isArray(width) ? width : [width, width];
    // Round off sharp joints (Chaikin) so tight elbows don't spike.
    for (let it = 0; it < (o.smooth ?? 2) && path.length > 2; it++) {
      const q = [path[0]];
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
        q.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      q.push(path[path.length - 1]);
      path = q;
    }
    const n = path.length;
    const left = [];
    const right = [];
    for (let i = 0; i < n; i++) {
      const p = path[i];
      const a = path[Math.max(0, i - 1)];
      const b = path[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0];
      let ty = b[1] - a[1];
      const len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
      left.push([p[0] - ty * w, p[1] + tx * w]);
      right.push([p[0] + ty * w, p[1] - tx * w]);
    }
    // Round caps.
    const cap = (p, dirx, diry, w, flip) => {
      const pts = [];
      const base = Math.atan2(diry, dirx);
      for (let i = 1; i < 6; i++) {
        const a = base + (flip ? 1 : -1) * (Math.PI / 2) - (flip ? 1 : -1) * (i / 6) * Math.PI;
        pts.push([p[0] + Math.cos(a) * w, p[1] + Math.sin(a) * w]);
      }
      return pts;
    };
    const e = path[n - 1];
    const e0 = path[n - 2];
    const s = path[0];
    const s1 = path[1];
    const endCap = cap(e, e[0] - e0[0], e[1] - e0[1], w1 / 2, false);
    const startCap = cap(s, s[0] - s1[0], s[1] - s1[1], w0 / 2, false);
    this.shape([...left, ...endCap, ...right.reverse(), ...startCap], o);
  }

  // Diagonal hatching clipped to a shape (shadows, texture).
  hatchIn(pts, id, h) {
    const c = this.ctx;
    const gap = (h.gap ?? 9) / this.scale;
    const ang = h.angle ?? -0.9;
    let minx = Infinity,
      miny = Infinity,
      maxx = -Infinity,
      maxy = -Infinity;
    for (const p of pts) {
      minx = Math.min(minx, p[0]);
      miny = Math.min(miny, p[1]);
      maxx = Math.max(maxx, p[0]);
      maxy = Math.max(maxy, p[1]);
    }
    const cx = (minx + maxx) / 2;
    const cy = (miny + maxy) / 2;
    const R = Math.hypot(maxx - minx, maxy - miny) / 2 + gap;
    c.save();
    this.trace(pts, true);
    c.clip();
    // Optional half-plane limiter: only hatch the part of the shape lying in
    // direction `side` ([dx, dy]) past `cut` (fraction of radius) from center.
    if (h.side) {
      c.save();
      c.translate(cx, cy);
      c.rotate(Math.atan2(h.side[1], h.side[0]));
      c.beginPath();
      c.rect((h.cut ?? 0) * R, -2 * R, 4 * R, 4 * R);
      c.restore();
      c.clip();
    }
    c.strokeStyle = h.color ?? this.ink;
    c.globalAlpha *= h.alpha ?? 0.45;
    c.lineWidth = (h.lineWidth ?? 1.6) / this.scale;
    c.lineCap = 'round';
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    let i = 0;
    for (let d = -R; d <= R; d += gap) {
      const x0 = cx + -sa * d - ca * R;
      const y0 = cy + ca * d - sa * R;
      const x1 = cx + -sa * d + ca * R;
      const y1 = cy + ca * d + sa * R;
      this.trace(this.jitter([[x0, y0], [x1, y1]], id * 31 + i++, 1.2, false), false);
      c.stroke();
    }
    c.restore();
  }
}
