// RANA — frog MC. Bucket hat, gold chain, always on the mic.
import { Character, eye, mouth, local, add, mid, angleOf } from '../character.js';


export const palette = {
  skin: '#6cc04a',
  skinDark: '#3f8f3a',
  belly: '#e2f0a4',
  hat: '#ffb627',
  hatBand: '#ff3d7f',
  chain: '#f2c230',
  mic: '#34313d',
  micHead: '#cfd0da',
  cheek: '#ff8fa3',
  lid: '#57a83c',
};

function hand(ink, arm, r, pal) {
  const a = angleOf(arm.elbow, arm.hand);
  ink.circle(arm.hand[0], arm.hand[1], r, { fill: pal.skin });
  for (let i = -1; i <= 1; i++) {
    const fa = a + i * 0.55;
    ink.circle(arm.hand[0] + Math.cos(fa) * r, arm.hand[1] + Math.sin(fa) * r, r * 0.42, { fill: pal.skin, lineWidth: 2.4 });
  }
}

function mic(ink, arm, pal, mouthPt) {
  // Points from the fist toward the mouth, so it reads in any arm pose.
  let dir = [mouthPt[0] - arm.hand[0], mouthPt[1] - arm.hand[1]];
  const len = Math.hypot(dir[0], dir[1]) || 1;
  dir = [dir[0] / len, dir[1] / len];
  const base = arm.hand;
  const L = Math.max(24, Math.min(46, len - 18));
  const top = add(base, [dir[0] * L, dir[1] * L]);
  ink.limb([add(base, [-dir[0] * 14, -dir[1] * 14]), top], [9, 13], { fill: pal.mic });
  ink.circle(top[0], top[1], 15, { fill: pal.micHead, hatch: { gap: 5, angle: 0.8, alpha: 0.5 } });
}

function draw(ink, J, { p, pal, props }) {
  const hA = p.lean + p.headTilt;
  const hs = [Math.cos(hA), Math.sin(hA)];
  const hu = [Math.sin(hA), -Math.cos(hA)];
  const bs = J.side;
  const bu = J.up;
  const H = (x, y) => local(J.head, hs, hu, x, y);
  const B = (x, y) => local(mid(J.hip, J.chest), bs, bu, x, y);

  // Legs + flipper feet.
  for (const [leg, s] of [[J.legL, -1], [J.legR, 1]]) {
    ink.limb([leg.hip, leg.knee, leg.foot], [28, 20], { fill: pal.skin });
    const f = leg.foot;
    ink.ellipse(f[0] + s * 14, f[1] - 4, 26, 9, { fill: pal.skinDark });
    for (let i = 0; i < 3; i++) ink.circle(f[0] + s * (26 + i * 6) - s * 8, f[1] - 2 + (i - 1) * 6 * 0.6, 5, { fill: pal.skinDark, lineWidth: 2 });
  }

  // Pear body with pale belly.
  const bodyA = Math.atan2(bu[0], -bu[1]);
  const bc = B(0, 6);
  ink.ellipse(bc[0], bc[1], 54, 58, { fill: pal.skin, rot: bodyA, hatch: { gap: 10, side: [-1, 0.2], cut: 0.35 } });
  const bel = B(0, 16);
  ink.ellipse(bel[0], bel[1], 34, 40, { fill: pal.belly, rot: bodyA, wobble: 1.6 });

  // Gold chain: a sagging arc of links with a big "R" medallion.
  const links = 11;
  for (let i = 0; i <= links; i++) {
    const u = i / links - 0.5;
    const pt = B(u * 64, -38 + (0.25 - u * u) * 70);
    ink.ellipse(pt[0], pt[1], 6, 4.5, { fill: pal.chain, lineWidth: 2, rot: u * 1.6 });
  }
  const med = B(0, -2);
  ink.circle(med[0], med[1], 13, { fill: pal.chain, lineWidth: 2.6 });
  ink.line([[med[0] - 4, med[1] + 7], [med[0] - 4, med[1] - 6], [med[0] + 4, med[1] - 4], [med[0] - 3, med[1]], [med[0] + 5, med[1] + 7]], { lineWidth: 2.4 });

  // Arms (in front of body).
  ink.limb([J.armL.shoulder, J.armL.elbow, J.armL.hand], [20, 16], { fill: pal.skin });
  hand(ink, J.armL, 12, pal);

  // Head: wide, flat-topped.
  const headPts = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const flat = Math.sin(a) < 0 ? 0.86 : 1;
    headPts.push(H(Math.cos(a) * 68, Math.sin(a) * 46 * flat));
  }
  ink.shape(headPts, { fill: pal.skin, hatch: { gap: 10, side: [-0.3, 1], cut: 0.45 } });

  // Bucket hat sits between the eye bulges, tilted back.
  const hatPts = [H(-30, -30), H(-22, -66), H(22, -68), H(30, -32)];
  ink.shape(hatPts, { fill: pal.hat });
  ink.shape([H(-46, -28), H(46, -30), H(42, -18), H(-42, -16)], { fill: pal.hat });
  ink.shape([H(-26, -40), H(26, -42), H(28, -33), H(-28, -31)], { fill: pal.hatBand, lineWidth: 2.4 });

  // Bulging eyes.
  for (const s of [-1, 1]) {
    const e = H(s * 40, -38);
    ink.circle(e[0], e[1], 24, { fill: pal.skin });
    eye(ink, e[0], e[1] + 2, 17, { blink: p.blink, look: p.look, lid: pal.lid });
  }

  // Cheeks, nostrils and the big mouth.
  for (const s of [-1, 1]) {
    const c = H(s * 48, 14);
    ink.ellipse(c[0], c[1], 10, 6, { fill: pal.cheek, stroke: false, misprint: 1 });
    const n = H(s * 8, -8);
    ink.dot(n[0], n[1], 2.6);
  }
  const m = H(0, 14);
  mouth(ink, m[0], m[1], 64, p.mouth, { smile: 0.42 });

  // Mic arm last so the mic is never hidden behind the head.
  ink.limb([J.armR.shoulder, J.armR.elbow, J.armR.hand], [20, 16], { fill: pal.skin });
  if (props.mic !== false) mic(ink, J.armR, pal, H(-6, 12));
  hand(ink, J.armR, 12, pal);
}

export const rana = new Character({
  name: 'Rana',
  role: 'MC',
  height: 260,
  palette,
  proportions: { thigh: 34, shin: 34, torso: 70, neck: 2, headR: 56, upperArm: 42, foreArm: 40, hipW: 46, shoulderW: 76, stance: 74, hold: [44, -6] },
  restPose: { armL: 0.45, elbowL: 0.3, armR: 0.55, elbowR: 1.9, holdR: 1 },
  drawFn: draw,
});
