// ¡DALE! — 30 second Latin rap motion piece built from toonkit.
//
// Everything is timed in beats (from the Clock), so changing the bpm/offset
// in video.json re-times the whole piece to a different track.
//
//   beats  0– 4  intro: title pops in, chiles peek, papel picado drops
//   beats  4–12  RANA raps (pink)
//   beats 12–20  GALLO scratches (teal)
//   beats 20–28  NOPAL toprock → spin → jump → freeze (gold)
//   beats 28–40  all together on stage, confetti at 36 (purple)
//   beats 40–48  jump, groove, "¡DALE!" slam + credits

import { cast, drawChile, moves, layer, fx, props, ease, span, hash } from '../../toonkit/index.js';

const { rana, gallo, nopal } = cast;
const C = {
  pink: '#ff3d7f',
  teal: '#1fb5a8',
  gold: '#ffb627',
  purple: '#6a4c93',
  red: '#e63946',
  lime: '#8bc34a',
  orange: '#ff7b39',
  cream: '#fbf3e4',
  ink: '#1d1512',
};

// ---- small building blocks ------------------------------------------------

function background(toon, s, color, rayColor, { cx = 960, cy = 620, rays = 20, spin = 0.12, grow = 1 } = {}) {
  toon.layer(
    (ink, c) => {
      c.fillStyle = color;
      c.fillRect(-200, -200, toon.w + 400, toon.h + 400);
      fx.sunburst(c, cx, cy, { rays, color: rayColor, rot: s.t * spin, radius: 2400 * grow });
    },
    { grain: 0.35 },
  );
}

// Paint splats that land on beats and stay, building up the background.
function splats(toon, s, fromBeat, colors, { every = 1, max = 10, seed = 1 } = {}) {
  toon.layer(
    (ink) => {
      const n = Math.floor((s.beat - fromBeat) / every);
      for (let k = Math.max(0, n - max + 1); k <= n; k++) {
        const since = s.beat - fromBeat - k * every;
        if (since < 0) continue;
        const x = 120 + hash(k, seed) * 1680;
        const y = 90 + hash(k, seed + 1) * 520;
        const r = 40 + hash(k, seed + 2) * 70;
        fx.splat(ink, x, y, r, colors[k % colors.length], k * 7 + seed, ease.outBack(Math.min(1, since * 4), 2.5));
      }
    },
    { grain: 0.4 },
  );
}

// A word that pops in at `at` (beats), holds, and shrinks away.
function word(toon, s, text, at, x, y, { size = 150, fill = C.gold, zapColor = C.red, hold = 1.6, seed = 1, rot = 0 } = {}) {
  const since = s.beat - at;
  if (since < 0 || since > hold + 0.4) return;
  const out = span(since, hold, hold + 0.4, ease.inQuad);
  const pop = span(since, 0, 0.35, (t) => ease.outBack(t, 2.4));
  const { ctx } = toon;
  ctx.save();
  toon.applyCamera(ctx);
  ctx.translate(x, y);
  ctx.rotate(rot + Math.sin(since * 6) * 0.02);
  ctx.scale(1 - out, 1 - out);
  toon.ink.ctx = ctx;
  const w = text.length * size * 0.36;
  fx.zap(toon.ink, 0, 0, w * pop + 20, zapColor, { seed, rot: s.t * 0.4 });
  fx.letters(ctx, text, 0, 0, { size, fill, u: span(since, 0, 0.5), seed, boil: toon.ink.boil, shadow: 8, outline: 7 });
  ctx.restore();
}

function chileRow(ink, s, y, { count = 11, scale = 1.15, seed = 0, rise = 1, x0 = 40, x1 = 1880 } = {}) {
  for (let i = 0; i < count; i++) {
    const x = x0 + (i / (count - 1)) * (x1 - x0) + (hash(i, seed + 9) - 0.5) * 40;
    const dy = (1 - rise) * 260 + (hash(i, seed + 3) - 0.5) * 30;
    drawChile(ink, { x, y: y + dy, scale, beat: s.beat, seed: i + seed, blink: moves.blinkAt(s.t, { seed: i + seed }) });
  }
}

const face = (s, seed, rapping = false, energy = null) => ({
  blink: moves.blinkAt(s.t, { seed }),
  mouth: rapping ? moves.mouthRap(s.beat, { seed, energy }) : 0,
  look: Math.sin(s.t * 0.9 + seed) * 0.4,
});

// Drop-in entrance: falls from above and squashes on landing. `height` is
// in screen pixels, so divide by the character's draw scale.
function dropIn(since, height = 1100, scale = 1) {
  height /= scale;
  if (since < 0) return { lift: height };
  if (since < 0.5) return { lift: (1 - ease.inQuad(since / 0.5)) * height, footLy: 20, footRy: 20 };
  const land = since - 0.5;
  if (land < 0.5) return { squash: Math.sin((land / 0.5) * Math.PI) * 0.2 * (1 - land), hipDrop: Math.sin((land / 0.5) * Math.PI) * 26 };
  return {};
}

// With lipSync on (video.json), mouths follow the track's vocal-band energy;
// otherwise they flap procedurally in 16ths.
function vocalEnergy(s) {
  return s.clock.lipSync && s.mid != null ? s.mid : null;
}

// ---- sections ---------------------------------------------------------------

function intro(toon, s) {
  const b = s.beat;
  background(toon, s, C.cream, '#f6dfa8', { grow: ease.outCubic(Math.min(1, Math.max(0, b + 0.5) / 2)) });
  splats(toon, s, 0, [C.pink, C.teal, C.gold], { every: 1, seed: 11, max: 4 });
  toon.layer(
    (ink) => {
      chileRow(ink, s, 1130, { rise: span(b, 1, 2.5, ease.outBack), seed: 20, scale: 1.7, count: 10 });
      fx.papelPicado(ink, { y: -260 + span(b, 0, 1.2, ease.outBack) * 270, t: s.t, sag: 50, count: 11 });
    },
    { grain: 0.45 },
  );
  const { ctx } = toon;
  ctx.save();
  toon.applyCamera(ctx);
  fx.letters(ctx, '¡DALE!', 960, 520, { size: 300, fill: C.pink, u: span(b, 0.1, 2.6), seed: 5, boil: toon.ink.boil, shadow: 16, outline: 10 });
  ctx.restore();
}

function ranaSolo(toon, s) {
  const b = s.beat - 4; // beats into the section
  toon.camera = { zoom: 1 + s.pulse(7) * 0.025 };
  background(toon, s, C.pink, '#ff6f9e', { cy: 560 });
  splats(toon, s, 4, [C.gold, C.teal, C.purple], { every: 1, seed: 3, max: 8 });
  toon.layer(
    (ink) => {
      props.stageFloor(ink, 920, { color: '#b5487a' });
      const pose = layer(
        rana.restPose,
        moves.dembow(s.beat, { amp: 0.55, arms: false }),
        moves.rap(s.beat, { flow: 1 }),
        dropIn(b, 1100, 2.35),
        face(s, 1, b > 0.9, vocalEnergy(s)),
      );
      rana.draw(ink, { x: 960, y: 985, scale: 2.35, pose, t: s.t });
    },
    { grain: 0.45 },
  );
  word(toon, s, '¡WEPA!', 6, 430, 330, { fill: C.gold, zapColor: C.teal, seed: 2, rot: -0.12 });
  word(toon, s, '¡FUEGO!', 9.5, 1500, 300, { fill: C.gold, zapColor: C.red, seed: 4, rot: 0.1 });
}

function galloSolo(toon, s) {
  const b = s.beat - 12;
  toon.camera = { zoom: 1.02 + s.pulse(7) * 0.02, rot: Math.sin(s.beat * Math.PI * 0.25) * 0.01 };
  background(toon, s, C.teal, '#44c9bc', { cy: 520, spin: -0.15 });
  splats(toon, s, 12, [C.pink, C.gold, C.purple], { every: 1, seed: 8, max: 8 });
  toon.layer(
    (ink) => {
      props.stageFloor(ink, 930, { color: '#2a8f87' });
      props.speaker(ink, 190, 1000, { scale: 1.4, pump: s.pulse(6), trim: C.pink });
      props.speaker(ink, 1730, 1000, { scale: 1.4, pump: s.pulse(6), trim: C.pink });
      const pose = layer(gallo.restPose, moves.scratch(s.beat), dropIn(b, 900, 1.85), face(s, 2), {
        mouth: s.dembow(5) * 0.7,
        headTilt: -0.15 + s.pulse(5) * 0.18,
      });
      gallo.draw(ink, { x: 900, y: 860, scale: 1.85, pose, t: s.t });
      const scratchAngle = s.t * 3.5 + Math.sin(s.beat * 4 * Math.PI) * 0.8;
      props.turntable(ink, 960, 1060, { scale: 1.6, angle: scratchAngle, flip: true });
    },
    { grain: 0.45 },
  );
  word(toon, s, '¡OYE!', 13.5, 440, 300, { fill: C.pink, zapColor: C.gold, seed: 6, rot: -0.1 });
  word(toon, s, 'ZIKI-ZIKI', 17, 1450, 280, { size: 110, fill: C.gold, zapColor: C.purple, seed: 7, rot: 0.08 });
}

function nopalSolo(toon, s) {
  const b = s.beat - 20;
  toon.camera = { zoom: 1 + s.pulse(7) * 0.025 };
  background(toon, s, C.gold, '#ffcb5c', { cy: 560 });
  splats(toon, s, 20, [C.pink, C.teal, C.red], { every: 1, seed: 5, max: 8 });
  toon.layer(
    (ink) => {
      props.stageFloor(ink, 900, { color: '#c98b4a' });
      let pose;
      if (b < 4) pose = layer(nopal.restPose, moves.toprock(s.beat), dropIn(b, 1000, 2.2));
      else if (b < 6) pose = layer(nopal.restPose, moves.toprock(s.beat, { amp: 0.4 }), moves.spin(b - 4, { dur: 2, turns: 2 }), moves.jump(b - 5, { dur: 1, height: 160 }));
      else pose = layer(nopal.restPose, moves.freeze(b - 6));
      pose = layer(pose, face(s, 3), { mouth: b >= 6 ? 0.7 : 0.15 });
      nopal.draw(ink, { x: 960, y: 960, scale: 2.2, pose, t: s.t });
      if (b >= 4 && b < 6) {
        fx.motionLines(ink, 700, 600, 0, { count: 5, len: 120, spread: 260, seed: Math.floor(s.beat * 2) });
        fx.motionLines(ink, 1220, 600, Math.PI, { count: 5, len: 120, spread: 260, seed: Math.floor(s.beat * 2) + 3 });
      }
      chileRow(ink, s, 1150, { rise: span(b, 0, 1, ease.outBack), seed: 40, count: 9, scale: 1.6 });
    },
    { grain: 0.45 },
  );
  word(toon, s, '¡ESO!', 26, 1420, 330, { size: 190, fill: C.pink, zapColor: C.teal, seed: 9, hold: 1.7, rot: 0.12 });
}

// Wide-shot positions for the finale.
const SPOTS = {
  gallo: { x: 430, y: 790, scale: 1.3 },
  rana: { x: 960, y: 900, scale: 1.55 },
  nopal: { x: 1490, y: 900, scale: 1.5 },
};

function finale(toon, s) {
  const b = s.beat - 28; // 0..20 (finale + outro)
  const outro = s.beat >= 40;
  toon.camera = { zoom: 1 + s.pulse(6) * 0.03 + (outro ? span(s.beat, 44, 45, ease.outCubic) * 0.04 : 0) };
  background(toon, s, C.purple, '#8a64b8', { cy: 520, rays: 24, spin: 0.2 });
  splats(toon, s, 28, [C.pink, C.gold, C.teal, C.lime], { every: 1, seed: 13, max: 9 });
  toon.layer(
    (ink) => {
      fx.papelPicado(ink, { y: -20, t: s.t, sag: 60, count: 12 });
      fx.papelPicado(ink, { y: 70, t: s.t + 1.3, sag: 40, count: 9, seed: 5, x0: 200, x1: 1720, colors: [C.gold, C.lime, C.pink, C.teal] });
      props.stageFloor(ink, 840, { color: '#3e2d5c' });
      props.speaker(ink, 110, 900, { scale: 1.05, pump: s.pulse(6), trim: C.gold });
      props.speaker(ink, 1810, 900, { scale: 1.05, pump: s.pulse(6), trim: C.gold });

      const beat = s.beat;
      const hype = beat >= 36 && beat < 40;
      const jumpAll = moves.jump(beat - 40, { dur: 1, height: 130 });
      const ending = beat >= 44;

      // Gallo at the decks (stage left).
      let gp = hype ? moves.hype(beat) : moves.scratch(beat);
      if (beat >= 40 && beat < 44) gp = layer(moves.dembow(beat), jumpAll);
      if (ending) gp = moves.hype(beat, { amp: 0.4 });
      const gs = SPOTS.gallo;
      gallo.draw(ink, { ...gs, pose: layer(gallo.restPose, gp, face(s, 2), { mouth: s.dembow(5) * 0.6 }), t: s.t });
      props.turntable(ink, gs.x + 40, 960, { scale: 1.15, angle: s.t * 3.5, flip: true });

      // Rana centre stage.
      let rp = layer(moves.dembow(beat, { amp: 0.6, arms: false }), moves.rap(beat));
      if (hype) rp = moves.hype(beat);
      if (beat >= 40 && beat < 44) rp = layer(moves.dembow(beat, { arms: false }), moves.rap(beat), jumpAll);
      if (ending) rp = moves.point(beat, { side: 'R' });
      rana.draw(ink, { ...SPOTS.rana, pose: layer(rana.restPose, rp, face(s, 1, !hype && !ending, vocalEnergy(s)), ending ? { mouth: 0.9 } : {}), t: s.t });

      // Nopal stage right.
      let np = beat < 32 ? moves.dembow(beat + 1) : moves.toprock(beat);
      if (hype) np = moves.hype(beat + 0.5);
      if (beat >= 40 && beat < 44) np = layer(moves.dembow(beat + 1), jumpAll);
      if (ending) np = moves.freeze(beat - 44);
      nopal.draw(ink, { ...SPOTS.nopal, pose: layer(nopal.restPose, np, face(s, 3), ending || hype ? { mouth: 0.7 } : {}), t: s.t });

      chileRow(ink, s, 1150, { rise: span(b, 0, 1, ease.outBack), seed: 60, count: 12, scale: 1.45 });
      fx.confetti(ink, 960, 760, s.t - s.clock.timeOfBeat(36), { count: 90, seed: 3 });
      fx.confetti(ink, 300, 900, s.t - s.clock.timeOfBeat(36.5), { count: 50, seed: 4 });
      fx.confetti(ink, 1620, 900, s.t - s.clock.timeOfBeat(37), { count: 50, seed: 6 });
      fx.confetti(ink, 960, 900, s.t - s.clock.timeOfBeat(44), { count: 120, seed: 8, spread: 1200 });
    },
    { grain: 0.45 },
  );

  word(toon, s, '¡ARRIBA!', 30, 700, 300, { size: 130, fill: C.gold, zapColor: C.pink, seed: 21, rot: -0.08 });
  word(toon, s, '¡FUEGO!', 36, 960, 260, { size: 170, fill: C.gold, zapColor: C.red, seed: 22, hold: 3 });

  if (s.beat >= 44) {
    // Title slam + credits.
    const since = s.beat - 44;
    const slam = 1 + (1 - ease.outBack(Math.min(1, since / 0.5), 1.6)) * 2.2;
    const { ctx } = toon;
    ctx.save();
    ctx.translate(960, 330);
    ctx.scale(slam, slam);
    ctx.rotate(-0.05);
    fx.letters(ctx, '¡DALE!', 0, 0, { size: 260, fill: C.pink, u: 1, seed: 5, boil: toon.ink.boil, shadow: 14, outline: 10 });
    ctx.restore();
    const cu = span(since, 1, 2);
    if (cu > 0) {
      ctx.save();
      ctx.globalAlpha = cu;
      ctx.fillStyle = 'rgba(29,21,18,0.75)';
      ctx.fillRect(0, 1020, 1920, 60);
      ctx.font = '28px "Permanent Marker"';
      ctx.fillStyle = C.cream;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(toon.credits ?? '', 960, 1051);
      ctx.restore();
    }
  }
}

// Whole-frame transitions layered on top.
function transitions(toon, s) {
  const wipe = (at, color, seed) => fx.brushWipe(toon.ctx, toon.w, toon.h, span(s.beat, at - 0.5, at + 0.5), color, { seed });
  wipe(12, C.teal, 1);
  wipe(20, C.gold, 2);
  // Flash into the finale.
  const f = span(s.beat, 28, 28.6);
  if (f > 0 && f < 1) {
    toon.ctx.save();
    toon.ctx.globalAlpha = 1 - f;
    toon.ctx.fillStyle = C.cream;
    toon.ctx.fillRect(0, 0, toon.w, toon.h);
    toon.ctx.restore();
  }
  // Fade in from paper at the start, ink-black iris at the very end.
  const end = span(s.t, s.clock.duration - 0.6, s.clock.duration);
  if (end > 0) {
    toon.ctx.save();
    toon.ctx.fillStyle = C.ink;
    toon.ctx.beginPath();
    toon.ctx.rect(0, 0, toon.w, toon.h);
    toon.ctx.arc(960, 540, (1 - ease.inOutCubic(end)) * 1200 + 1, 0, Math.PI * 2, true);
    toon.ctx.fill('evenodd');
    toon.ctx.restore();
  }
}

export function draw(toon, s) {
  const b = s.beat;
  if (b < 4) intro(toon, s);
  else if (b < 12) ranaSolo(toon, s);
  else if (b < 20) galloSolo(toon, s);
  else if (b < 28) nopalSolo(toon, s);
  else finale(toon, s);
  transitions(toon, s);
  toon.paperOverlay(0.35);
}
