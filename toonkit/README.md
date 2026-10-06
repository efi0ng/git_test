# toonkit

Reusable, hand-drawn p5.js characters and a frame-exact video pipeline.

The look comes from **wobble** (every edge pushed around by smooth noise),
**line boil** (the wobble re-rolls 8×/s like redrawn animation), **misprint**
(colour fills sit slightly off the ink line), **crayon grain** rubbed out of
each layer, and a **paper** texture multiplied over everything. Animation is
held "on twos" (15 fps poses in a 30 fps video).

## Cast

| Character | Role | Look |
|---|---|---|
| `rana` | MC | Frog, marigold bucket hat, gold "R" chain, always on the mic |
| `gallo` | DJ | Rooster, shades, turquoise/pink headphones, rainbow tail |
| `nopal` | B-boy | Cactus, red bandana, pink flower, white high-tops |
| `drawChile` | Crowd | Chili peppers; the `seed` fixes each one's colour and size |

Open `videos/model-sheet/` to see every character in every move.

## Making a new video

```bash
cp -r videos/_template videos/my-video
# edit videos/my-video/scene.js and video.json
node tools/serve.mjs 8080          # preview: http://localhost:8080/videos/my-video/
node tools/render.mjs videos/my-video            # → out/my-video.mp4
node tools/render.mjs videos/my-video --sheet 12 # contact sheet for a quick look
```

A scene is a single `draw(toon, s)` function called once per frame:

```js
import { cast, moves, layer, fx, props } from '../../toonkit/index.js';
const { rana } = cast;

export function draw(toon, s) {
  toon.camera = { zoom: 1 + s.pulse(7) * 0.02 };   // beat punch
  toon.layer((ink, c) => { c.fillStyle = '#ff3d7f'; c.fillRect(0, 0, toon.w, toon.h); });
  toon.layer((ink) => {
    const pose = layer(rana.restPose, moves.dembow(s.beat), moves.rap(s.beat),
                       { mouth: moves.mouthRap(s.beat), blink: moves.blinkAt(s.t) });
    rana.draw(ink, { x: 960, y: 980, scale: 2, pose, t: s.t });
  });
  toon.paperOverlay(0.35);
}
```

### Musical time (`s`)

`s.t` is seconds, `s.beat` beats (float), `s.bar` bars. `s.pulse(decay)` is 1
on each beat and decays; `s.pulseOn(div)` does the same on subdivisions;
`s.dembow()` follows the reggaeton accent pattern. With an `energy.json`,
`s.low`, `s.mid`, `s.high` and `s.rms` give per-frame loudness.

### Moves (`moves.*`)

Pure functions of the beat that return a pose, so they work on every
character: `idle`, `bounce`, `dembow`, `rap`, `scratch`, `toprock`, `hype`,
`point`, `jump(since)`, `spin(since)` (a paper cut-out turn) and
`freeze(since)`. Faces use `mouthRap(beat)` and `blinkAt(t)`.

Combine them:

- `layer(base, ...poses)` adds the moves together, e.g. dembow feet + rap arms.
- `override(base, ...)` replaces values.
- `blend(a, b, t)` crossfades between two poses.

### Effects and props

- `fx`: `sunburst`, `splat`, `papelPicado`, `confetti`, `zap`,
  `motionLines`, `brushWipe` (a transition) and `letters` (hand-lettered,
  popping type).
- `props`: `turntable`, `speaker`, `stageFloor`.

## Music

```bash
python3 tools/beats.py path/to/track.mp3 --start 42.0 --video videos/my-video
```

This detects the BPM and the beat phase and writes `bpm`, `offset`,
`audio`, `audioStart` and `energy.json` into the video folder. Choose a
`--start` on a downbeat. Set `"lipSync": true` to drive mouths from the
vocal band. `tools/dembow.py` synthesizes an original placeholder beat.

## Adding a character

Create `characters/<name>.js` exporting a `new Character({...})` with:

- `proportions`: limb lengths and widths, plus an optional `hold` point
  for IK grips.
- `palette`: fixed named colours. Keep them fixed so the character stays
  consistent everywhere.
- `drawFn(ink, J, { p, pal, t, props })`: paints the body parts on the
  solved joints `J`.

Use `ink.limb`, `ink.shape`, `ink.ellipse`, `eye()` and `mouth()`. Then
register the character in `characters/index.js`. Every existing move works
on it immediately.

### Conventions

- Rig space: the origin is on the ground between the feet, and y points
  down.
- Arm angles are outward-positive: 0 hangs down and π points up.
- All randomness is seeded (`random.js`), so every frame re-renders
  identically.
