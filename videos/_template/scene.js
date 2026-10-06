// Starter scene: the whole cast dancing on a stage. Copy this folder to
// videos/<your-video>/ and edit. Everything is timed in beats (s.beat).
import { cast, drawChile, moves, layer, fx, props } from '../../toonkit/index.js';

const { rana, gallo, nopal } = cast;

export function draw(toon, s) {
  // Camera punch on every beat.
  toon.camera = { zoom: 1 + s.pulse(7) * 0.02 };

  // Background: flat colour + rotating sunburst, through a crayon layer.
  toon.layer((ink, c) => {
    c.fillStyle = '#6a4c93';
    c.fillRect(-200, -200, toon.w + 400, toon.h + 400);
    fx.sunburst(c, 960, 560, { color: '#8a64b8', rot: s.t * 0.15 });
  }, { grain: 0.35 });

  // Characters: pick a move per character, layer a face on top.
  toon.layer((ink) => {
    props.stageFloor(ink, 860, { color: '#3e2d5c' });
    const face = (seed) => ({ blink: moves.blinkAt(s.t, { seed }) });
    gallo.draw(ink, { x: 480, y: 900, scale: 1.4, pose: layer(gallo.restPose, moves.dembow(s.beat), face(2)), t: s.t });
    rana.draw(ink, {
      x: 960, y: 920, scale: 1.6, t: s.t,
      pose: layer(rana.restPose, moves.dembow(s.beat, { arms: false }), moves.rap(s.beat), face(1), { mouth: moves.mouthRap(s.beat) }),
    });
    nopal.draw(ink, { x: 1440, y: 920, scale: 1.55, pose: layer(nopal.restPose, moves.toprock(s.beat), face(3)), t: s.t });
    for (let i = 0; i < 10; i++) drawChile(ink, { x: 100 + i * 190, y: 1130, scale: 1.4, beat: s.beat, seed: i });
  }, { grain: 0.45 });

  // Hand-lettered title.
  fx.letters(toon.ctx, '¡HOLA!', 960, 200, { size: 180, fill: '#ffb627', u: Math.min(1, s.beat / 2), boil: toon.ink.boil });

  toon.paperOverlay(0.35);
}
