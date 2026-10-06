// GALLO — rooster DJ. Shades, turquoise headphones, flamboyant tail.
import { Character, mouth, local, mid, angleOf } from '../character.js';

export const palette = {
  body: '#fbf2e2',
  shade: '#e8d6b8',
  comb: '#e63946',
  beak: '#ffb627',
  legs: '#f2a23a',
  tail: ['#1fb5a8', '#6a4c93', '#e63946', '#ff7b39'],
  wingTip: '#ff7b39',
  glasses: '#211b24',
  phones: '#1fb5a8',
  phonesCup: '#ff3d7f',
};

function feather(ink, base, angle, len, width, fill) {
  const pts = [];
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const w = Math.sin(u * Math.PI) * width * (1 - u * 0.4);
    pts.push([base[0] + ca * u * len - sa * w, base[1] + sa * u * len + ca * w]);
  }
  for (let i = 12; i >= 0; i--) {
    const u = i / 12;
    const w = Math.sin(u * Math.PI) * width * 0.35;
    pts.push([base[0] + ca * u * len + sa * w, base[1] + sa * u * len - ca * w]);
  }
  ink.shape(pts, { fill });
}

function draw(ink, J, { p, pal, t }) {
  const hA = p.lean + p.headTilt;
  const hs = [Math.cos(hA), Math.sin(hA)];
  const hu = [Math.sin(hA), -Math.cos(hA)];
  const H = (x, y) => local(J.head, hs, hu, x, y);
  const B = (x, y) => local(mid(J.hip, J.chest), J.side, J.up, x, y);
  const bodyA = Math.atan2(J.up[0], -J.up[1]);

  // Tail fan behind everything; it wags with the hips.
  const tb = B(-30, 20);
  const wag = p.sway * 0.012 + Math.sin(t * 9) * 0.05;
  pal.tail.forEach((col, i) => {
    const a = -Math.PI / 2 - 1.55 + i * 0.36 + wag + bodyA;
    feather(ink, tb, a, 170 - Math.abs(i - 1.5) * 18, 30, col);
  });

  // Thin legs with three-toed feet.
  for (const [leg, s] of [[J.legL, -1], [J.legR, 1]]) {
    ink.limb([leg.hip, leg.knee, leg.foot], [10, 8], { fill: pal.legs });
    const f = leg.foot;
    for (const dx of [-16, 0, 16]) {
      ink.limb([[f[0], f[1] - 4], [f[0] + dx + s * 10, f[1] + 1]], [7, 5], { fill: pal.legs, lineWidth: 2.2 });
    }
  }

  // Plump teardrop body.
  const bc = B(0, 0);
  const bodyPts = [];
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2;
    const r = Math.sin(a) > 0 ? 1 : 0.82; // narrower toward the chest
    bodyPts.push(local(bc, J.side, J.up, Math.cos(a) * 58 * (Math.sin(a) > 0 ? 1.05 : 0.9), -Math.sin(a) * 66 * r));
  }
  ink.shape(bodyPts, { fill: pal.body, hatch: { gap: 9, side: [-1, 0.3], cut: 0.3 } });
  // Chest feather scallops.
  for (let r = 0; r < 2; r++) {
    for (let i = -1; i <= 1; i++) {
      const s = B(i * 18 + (r ? 9 : 0), -10 + r * 18);
      ink.line([[s[0] - 8, s[1]], [s[0], s[1] + 7], [s[0] + 8, s[1]]], { lineWidth: 2 });
    }
  }

  // Wings as arms, with orange feather tips.
  for (const arm of [J.armL, J.armR]) {
    ink.limb([arm.shoulder, arm.elbow, arm.hand], [30, 16], { fill: pal.body });
    const a = angleOf(arm.elbow, arm.hand);
    for (let i = -1; i <= 1; i++) feather(ink, arm.hand, a + i * 0.45, 34, 9, pal.wingTip);
  }

  // Head, comb, wattle, beak.
  for (let i = -1; i <= 1; i++) {
    const c = H(i * 15, -34 - (1 - Math.abs(i)) * 6);
    ink.circle(c[0], c[1], 14 - Math.abs(i) * 2, { fill: pal.comb });
  }
  const hc = J.head;
  ink.circle(hc[0], hc[1], 38, { fill: pal.body });

  // Headphones band + cups.
  const band = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI;
    band.push(H(Math.cos(a) * 44, Math.sin(a) * 42 + 2));
  }
  ink.line(band, { stroke: pal.phones, lineWidth: 9 });
  ink.line(band, { lineWidth: 2.4 });
  for (const s of [-1, 1]) {
    const c = H(s * 42, 4);
    ink.ellipse(c[0], c[1], 13, 19, { fill: pal.phonesCup, rot: hA });
  }

  // Shades.
  for (const s of [-1, 1]) {
    const g = H(s * 15, -4);
    ink.ellipse(g[0], g[1], 15, 11, { fill: pal.glasses, rot: hA, misprint: 1 });
    const sh = H(s * 15 - 6, -8);
    ink.line([sh, H(s * 15 - 1, -11)], { stroke: '#fffdf6', lineWidth: 2.4, wobble: 0.6 });
  }
  ink.line([H(-2, -6), H(2, -6)], { lineWidth: 3 });

  // Beak opens with the mouth value (it's the DJ shout).
  const bk = H(0, 12);
  const open = p.mouth * 10;
  ink.shape([H(-11, 8), H(0, 6), H(11, 8), H(0, 22)], { fill: pal.beak });
  if (open > 1) {
    mouth(ink, bk[0], bk[1] + 10, 18, p.mouth, { smile: 0 });
  }
  const w = H(12, 26);
  ink.ellipse(w[0], w[1], 5, 8, { fill: pal.comb, rot: hA + 0.4 });
}

export const gallo = new Character({
  name: 'Gallo',
  role: 'DJ',
  height: 290,
  palette,
  proportions: { thigh: 46, shin: 48, torso: 92, neck: 18, headR: 38, upperArm: 46, foreArm: 42, hipW: 32, shoulderW: 86, stance: 58 },
  restPose: { armL: 0.5, elbowL: 0.4, armR: 0.5, elbowR: 0.4 },
  drawFn: draw,
});
