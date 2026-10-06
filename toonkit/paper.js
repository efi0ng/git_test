// Paper and crayon textures, generated once per size/seed and cached.
import { rng } from './random.js';

const cache = new Map();

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Warm paper with grain, fibres, blotches and a soft vignette.
export function paperTexture(w, h, { seed = 7, color = [244, 234, 213] } = {}) {
  const key = `paper:${w}x${h}:${seed}:${color}`;
  if (cache.has(key)) return cache.get(key);
  const cv = canvas(w, h);
  const c = cv.getContext('2d');
  const r = rng(seed);
  const img = c.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < w * h; i++) {
    const g = (r() - 0.5) * 16;
    d[i * 4] = color[0] + g;
    d[i * 4 + 1] = color[1] + g;
    d[i * 4 + 2] = color[2] + g * 1.1;
    d[i * 4 + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  // Watercolour-ish blotches.
  for (let i = 0; i < 60; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = 60 + r() * 260;
    const gr = c.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() < 0.6;
    gr.addColorStop(0, dark ? 'rgba(150,110,60,0.07)' : 'rgba(255,255,245,0.12)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // Fibres.
  c.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const x = r() * w;
    const y = r() * h;
    const a = r() * Math.PI * 2;
    const l = 4 + r() * 18;
    c.strokeStyle = `rgba(110,85,50,${0.05 + r() * 0.08})`;
    c.lineWidth = 0.6 + r() * 0.8;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.5, y + Math.sin(a + 0.5) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    c.stroke();
  }
  // Vignette.
  const vg = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(70,40,10,0.28)');
  c.fillStyle = vg;
  c.fillRect(0, 0, w, h);
  cache.set(key, cv);
  return cv;
}

// Speckle mask: punched out of a colour layer with 'destination-out' so
// fills look like crayon/marker on toothy paper. A few variants are
// generated so the grain can boil along with the lines.
export function crayonGrain(w, h, { seed = 3, density = 0.11, variant = 0 } = {}) {
  const key = `grain:${w}x${h}:${seed}:${density}:${variant}`;
  if (cache.has(key)) return cache.get(key);
  const cv = canvas(w, h);
  const c = cv.getContext('2d');
  const r = rng(seed + variant * 101);
  const img = c.createImageData(w, h);
  const d = img.data;
  // Streaky grain: horizontal-ish runs read like a crayon's tooth.
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = 0; x < w; x++) {
      if (run <= 0 && r() < density * 0.2) run = 1 + Math.floor(r() * 7);
      const i = (y * w + x) * 4;
      if (run > 0) {
        d[i + 3] = 110 + r() * 145;
        run--;
      }
    }
  }
  c.putImageData(img, 0, 0);
  cache.set(key, cv);
  return cv;
}

export function makeLayer(w, h) {
  const cv = canvas(w, h);
  return { canvas: cv, ctx: cv.getContext('2d') };
}
