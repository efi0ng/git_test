// A small 2D humanoid rig shared by every character.
//
// Coordinates are character-local: origin on the ground between the feet,
// +x to the character's screen-right, +y down (canvas convention), so the
// body lives at negative y. One unit ≈ one pixel at scale 1.
//
// A Pose is a flat object of numbers so poses can be blended, keyframed
// and mixed freely. Arm angles are "outward positive": 0 hangs straight
// down, +π/2 points sideways away from the body, π points straight up.
// The same pose therefore looks symmetric on both sides.

export const DEFAULT_POSE = Object.freeze({
  x: 0, // root shift
  lift: 0, // whole body lift off the ground (jumps), px up
  hipDrop: 0, // how much the pelvis sinks (knee bend), px
  lean: 0, // torso tilt, radians (+ leans to screen-right)
  sway: 0, // pelvis sideways shift, px
  headTilt: 0, // radians relative to torso
  headBob: 0, // px, + moves head down toward body
  squash: 0, // -0.3..0.3, + squashes torso
  armL: 0.35,
  elbowL: 0.25,
  armR: 0.35,
  elbowR: 0.25,
  footLx: 0, // foot offsets from rest stance, px
  footLy: 0, // + lifts foot
  footRx: 0,
  footRy: 0,
  turn: 1, // horizontal squash for "paper cut-out" spins: 1 → -1
  mouth: 0, // 0 closed .. 1 wide open
  blink: 0, // 0 open .. 1 closed
  look: 0, // pupils -1..1 left/right
  holdL: 0, // 0..1 blend the hand to the character's `hold` point (IK),
  holdR: 0, //   e.g. a mic at the mouth; see proportions.hold
});

export function pose(partial = {}) {
  return { ...DEFAULT_POSE, ...partial };
}

// Linear blend of two poses.
export function blend(a, b, t) {
  const out = {};
  for (const k in DEFAULT_POSE) {
    const va = a[k] ?? DEFAULT_POSE[k];
    const vb = b[k] ?? DEFAULT_POSE[k];
    out[k] = va + (vb - va) * t;
  }
  return out;
}

// Keys that are states rather than offsets: layering replaces them.
const OVERRIDE_KEYS = new Set(['turn', 'mouth', 'blink', 'look', 'holdL', 'holdR']);

// Additive layering: deltas from `layer` (relative to DEFAULT_POSE) are
// added on top of `base`. Lets you stack e.g. a dance step + rap gesture.
export function layer(base, ...layers) {
  const out = { ...base };
  for (const l of layers) {
    for (const k in l) {
      if (OVERRIDE_KEYS.has(k)) out[k] = l[k];
      else out[k] = (out[k] ?? 0) + (l[k] - (DEFAULT_POSE[k] ?? 0));
    }
  }
  return out;
}

// Override: values in later objects replace earlier ones.
export function override(base, ...parts) {
  return Object.assign({ ...base }, ...parts);
}

// Two-bone IK in 2D. Returns the middle joint for root → target with bone
// lengths a, b. `bend` = +1 / -1 picks which side the joint bows to.
export function ik2(root, target, a, b, bend) {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  let d = Math.hypot(dx, dy);
  d = Math.min(d, a + b - 0.001);
  d = Math.max(d, Math.abs(a - b) + 0.001);
  const base = Math.atan2(dy, dx);
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const ang = base - bend * Math.acos(Math.max(-1, Math.min(1, cosA)));
  return [root[0] + Math.cos(ang) * a, root[1] + Math.sin(ang) * a];
}

const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// Solve joint positions for proportions `P` and pose `p`.
// P: { thigh, shin, torso, neck, headR, upperArm, foreArm, hipW, shoulderW, stance }
export function solve(P, p) {
  const legLen = P.thigh + P.shin;
  const ground = -p.lift;
  const hip = [p.x + p.sway, ground - legLen * 0.97 + p.hipDrop];
  const squashY = 1 - p.squash;
  const up = rot(0, -P.torso * squashY, p.lean);
  const chest = [hip[0] + up[0], hip[1] + up[1]];
  const side = rot(1, 0, p.lean);
  const hw = (P.hipW / 2) * (1 + p.squash * 0.5);
  const sw = (P.shoulderW / 2) * (1 + p.squash * 0.5);
  const hipL = [hip[0] - side[0] * hw, hip[1] - side[1] * hw];
  const hipR = [hip[0] + side[0] * hw, hip[1] + side[1] * hw];
  const shL = [chest[0] - side[0] * sw, chest[1] - side[1] * sw];
  const shR = [chest[0] + side[0] * sw, chest[1] + side[1] * sw];
  const neckV = rot(0, -(P.neck + P.headR) + p.headBob, p.lean + p.headTilt);
  const head = [chest[0] + neckV[0], chest[1] + neckV[1]];

  // Arms: forward kinematics, outward-positive angles.
  const arm = (sh, sideSign, a, e) => {
    // Canvas rotation is clockwise-positive; torso lean rotates the arm with
    // it, and outward motion is clockwise on the left, counter on the right.
    const ra = p.lean - sideSign * a;
    const ev = rot(0, P.upperArm, ra);
    const elbow = [sh[0] + ev[0], sh[1] + ev[1]];
    const hv = rot(0, P.foreArm, ra - sideSign * e);
    const hand = [elbow[0] + hv[0], elbow[1] + hv[1]];
    return { shoulder: sh, elbow, hand };
  };
  // Screen-left arm rotates with negative sign so + is outward.
  const armL = arm(shL, -1, p.armL, p.elbowL);
  const armR = arm(shR, 1, p.armR, p.elbowR);
  // Optional IK "hold": pull a hand to a fixed body-relative point
  // (proportions.hold = [x, y] from the chest, x mirrored for the left hand).
  const hold = P.hold ?? [P.shoulderW * 0.2, P.torso * 0.1];
  for (const [a, w, s] of [[armL, p.holdL, -1], [armR, p.holdR, 1]]) {
    if (!(w > 0)) continue;
    const uu = rot(0, -1, p.lean);
    const tgt = [chest[0] + side[0] * hold[0] * s - uu[0] * hold[1], chest[1] + side[1] * hold[0] * s - uu[1] * hold[1]];
    const el = ik2(a.shoulder, tgt, P.upperArm, P.foreArm, -s);
    a.elbow = [a.elbow[0] + (el[0] - a.elbow[0]) * w, a.elbow[1] + (el[1] - a.elbow[1]) * w];
    a.hand = [a.hand[0] + (tgt[0] - a.hand[0]) * w, a.hand[1] + (tgt[1] - a.hand[1]) * w];
  }

  // Legs: IK to foot targets, knees bow outward.
  const st = P.stance / 2;
  const footL = [p.x - st + p.footLx, ground - p.footLy];
  const footR = [p.x + st + p.footRx, ground - p.footRy];
  const kneeL = ik2(hipL, footL, P.thigh, P.shin, -1);
  const kneeR = ik2(hipR, footR, P.thigh, P.shin, 1);

  return {
    hip,
    chest,
    head,
    hipL,
    hipR,
    armL,
    armR,
    legL: { hip: hipL, knee: kneeL, foot: footL },
    legR: { hip: hipR, knee: kneeR, foot: footR },
    up: [up[0] / (P.torso * squashY), up[1] / (P.torso * squashY)],
    side,
  };
}
