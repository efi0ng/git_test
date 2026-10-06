// NOPAL — cactus b-boy. Bandana, flower crown, fresh high-tops.
import { Character, eye, mouth, local, mid, angleOf } from '../character.js';
import { hash } from '../random.js';

export const palette = {
  skin: '#3fa37a',
  skinDark: '#2b7a5a',
  rib: '#2d8462',
  spine: '#fdf6e3',
  bandana: '#e63946',
  petal: '#ff5fa2',
  petalCenter: '#ffd23f',
  shoe: '#fffaf0',
  shoeStripe: '#1fb5a8',
  sole: '#e63946',
};

function spines(ink, pts) {
  for (const [x, y, a] of pts) {
    ink.line([[x, y], [x + Math.cos(a) * 7, y + Math.sin(a) * 7]], { lineWidth: 2, wobble: 0.4 });
  }
}

function draw(ink, J, { p, pal }) {
  const hA = p.lean + p.headTilt;
  const hs = [Math.cos(hA), Math.sin(hA)];
  const hu = [Math.sin(hA), -Math.cos(hA)];
  const H = (x, y) => local(J.head, hs, hu, x, y);
  const bodyA = Math.atan2(J.up[0], -J.up[1]);
  const bc = mid(J.hip, J.chest, 0.55);
  const B = (x, y) => local(bc, J.side, J.up, x, y);

  // Legs and high-tops.
  for (const [leg, s] of [[J.legL, -1], [J.legR, 1]]) {
    ink.limb([leg.hip, leg.knee, leg.foot], [24, 20], { fill: pal.skin });
    const f = leg.foot;
    ink.shape([[f[0] - 18 + s * 4, f[1] - 22], [f[0] + 8 + s * 4, f[1] - 24], [f[0] + 16 + s * 14, f[1] - 8], [f[0] + 16 + s * 16, f[1] + 2], [f[0] - 18, f[1] + 2]], { fill: pal.shoe });
    ink.rect(f[0] - 19, f[1] - 3, 36 + s * 16 * (s > 0 ? 1 : 0) + (s < 0 ? 16 : 0), 7, { fill: pal.sole, lineWidth: 2.2 });
    ink.line([[f[0] - 10 + s * 4, f[1] - 16], [f[0] + 6 + s * 8, f[1] - 9]], { stroke: pal.shoeStripe, lineWidth: 4.5 });
  }

  // Tall paddle body; the head is just the top of the paddle.
  const bodyPts = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const top = Math.sin(a) < 0;
    bodyPts.push(B(Math.cos(a) * (top ? 58 : 50), Math.sin(a) * (top ? 142 : 70)));
  }
  ink.shape(bodyPts, { fill: pal.skin, hatch: { gap: 10, side: [-1, 0], cut: 0.4 } });
  // Ribs.
  for (const x of [-26, 0, 26]) {
    ink.line([B(x * 0.9, 58), B(x, 0), B(x * 0.7, -112)], { stroke: pal.rib, lineWidth: 2.6, wobble: 1.6 });
  }
  // Spines, deterministic per character so they never move around.
  const sp = [];
  for (let i = 0; i < 16; i++) {
    const u = hash(i, 77) * 2 - 1;
    const v = hash(i, 78) * 1.6 - 0.9;
    const pt = B(u * 40, v * 80);
    sp.push([pt[0], pt[1], bodyA - Math.PI / 2 + (u > 0 ? 0.6 : -0.6) + Math.PI * (u < 0 ? 1 : 0)]);
  }
  spines(ink, sp);

  // Pad arms with round pad hands.
  for (const arm of [J.armL, J.armR]) {
    ink.limb([arm.shoulder, arm.elbow, arm.hand], [26, 32], { fill: pal.skin });
    const a = angleOf(arm.elbow, arm.hand);
    ink.ellipse(arm.hand[0] + Math.cos(a) * 6, arm.hand[1] + Math.sin(a) * 6, 20, 16, { fill: pal.skin, rot: a });
    spines(ink, [[arm.elbow[0], arm.elbow[1], a - 1.5], [arm.hand[0], arm.hand[1], a + 1.4]]);
  }

  // Bandana across the forehead with knot tails flapping.
  const flap = Math.sin((p.sway + p.hipDrop) * 0.15) * 0.3;
  ink.shape([H(-44, -24), H(-20, -29), H(20, -29), H(44, -24), H(46, -8), H(20, -12), H(-20, -12), H(-46, -8)], { fill: pal.bandana });
  for (let i = 0; i < 4; i++) {
    const d = H(-30 + i * 20, -19);
    ink.dot(d[0], d[1], 2.6, '#fffaf0');
  }
  const knot = H(44, -16);
  ink.shape([knot, [knot[0] + 30, knot[1] - 14 + flap * 30], [knot[0] + 26, knot[1] - 2 + flap * 20]], { fill: pal.bandana, lineWidth: 2.6 });
  ink.shape([knot, [knot[0] + 26, knot[1] + 16 + flap * 20], [knot[0] + 14, knot[1] + 18]], { fill: pal.bandana, lineWidth: 2.6 });

  // Flower crown on top.
  const top = H(10, -50);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + hA;
    ink.ellipse(top[0] + Math.cos(a) * 13, top[1] + Math.sin(a) * 13, 12, 8, { fill: pal.petal, rot: a });
  }
  ink.circle(top[0], top[1], 8, { fill: pal.petalCenter });

  // Face.
  for (const s of [-1, 1]) {
    const e = H(s * 20, 6);
    eye(ink, e[0], e[1], 11, { blink: p.blink, look: p.look, pupil: 0.55, lid: pal.skinDark });
  }
  const m = H(0, 34);
  mouth(ink, m[0], m[1], 40, p.mouth, { smile: 0.5, teeth: true });
}

export const nopal = new Character({
  name: 'Nopal',
  role: 'B-boy',
  height: 270,
  palette,
  proportions: { thigh: 32, shin: 32, torso: 112, neck: 0, headR: 40, upperArm: 44, foreArm: 42, hipW: 40, shoulderW: 92, stance: 70 },
  restPose: { armL: 0.6, elbowL: 0.5, armR: 0.6, elbowR: 0.5 },
  drawFn: draw,
});
