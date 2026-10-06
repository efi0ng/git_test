# git_test
learning more about git

## toonkit — hand-drawn motion graphics with p5.js

[`toonkit/`](toonkit/README.md) is a small library of reusable, hand-drawn
characters (Rana the frog MC, Gallo the rooster DJ, Nopal the cactus b-boy
and a chili-pepper crowd), dance moves, effects, and a frame-exact render
pipeline (headless Chromium → ffmpeg).

```bash
npm install
node tools/render.mjs videos/dale-30s      # renders out/dale-30s.mp4
node tools/serve.mjs 8080                  # live preview at /videos/dale-30s/
```

- `videos/dale-30s/` – 30 s Latin rap piece, "¡DALE!"
- `videos/_template/` – copy this to start a new video with the same cast
- `videos/model-sheet/` – every character in every move
