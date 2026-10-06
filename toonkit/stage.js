// Stage: wires p5, the Clock, Ink layers and textures into a frame-exact
// renderer with two modes:
//
//   * Preview  (default)   – plays the soundtrack and draws in real time,
//                             with a scrubber. Open the page in a browser.
//   * Render   (?render)   – exposes window.__toon.renderFrame(n) so
//                             tools/render.mjs can capture every frame.
//   * Still    (?frame=N)  – draws a single frame (handy for checks).
//
// A video provides `draw(toon, state)`. `toon` holds the p5 instance, the
// main canvas context, an Ink for it, and `toon.layer(fn)` for painting a
// crayon-textured layer (characters look best drawn through a layer).

import { Ink } from './ink.js';
import { Clock } from './clock.js';
import { paperTexture, crayonGrain, makeLayer } from './paper.js';

export async function createStage(cfg) {
  const {
    width = 1920,
    height = 1080,
    fps = 30,
    duration = 30,
    bpm = 100,
    offset = 0,
    audio = null,
    audioStart = 0,
    energy = null,
    boilFps = 8, // line-boil rate (hand-drawn redraws per second)
    stepFps = null, // optional: hold animation poses "on twos" etc.
    fonts = ['Permanent Marker'],
    seed = 1,
    setup = null,
    draw,
  } = cfg;

  const params = new URLSearchParams(location.search);
  const mode = params.has('render') ? 'render' : params.has('frame') ? 'still' : 'preview';

  await Promise.all(fonts.map((f) => document.fonts.load(`100px "${f}"`)));
  await document.fonts.ready;

  let energyData = energy;
  if (typeof energy === 'string') energyData = await (await fetch(energy)).json();

  const clock = new Clock({ fps, bpm, offset, duration, energy: energyData });

  const p = await new Promise((resolve) => {
    new window.p5((sk) => {
      sk.setup = () => {
        sk.pixelDensity(1);
        sk.createCanvas(width, height);
        sk.noLoop();
        resolve(sk);
      };
      sk.draw = () => {};
    }, cfg.container ?? document.getElementById('stage') ?? document.body);
  });

  const ctx = p.drawingContext;
  const layerBuf = makeLayer(width, height);
  const toon = {
    p,
    ctx,
    w: width,
    h: height,
    clock,
    ink: new Ink(ctx, { seed }),
    paper: paperTexture(width, height, { seed: seed + 6 }),
    grain: [0, 1, 2].map((v) => crayonGrain(width, height, { seed: seed + 2, variant: v })),
    // Paint into an offscreen layer, rub crayon grain out of it, then
    // composite onto the main canvas. fn receives an Ink bound to the layer.
    // Camera for the current frame: { x, y, zoom, rot } around frame centre.
    // Reset every frame; layers apply it unless called with camera: false.
    camera: null,
    applyCamera(c) {
      const cam = toon.camera;
      if (!cam) return;
      c.translate(width / 2, height / 2);
      c.scale(cam.zoom ?? 1, cam.zoom ?? 1);
      c.rotate(cam.rot ?? 0);
      c.translate(-width / 2 - (cam.x ?? 0), -height / 2 - (cam.y ?? 0));
    },
    layer(fn, { grain = 0.5, alpha = 1, camera: useCamera = true } = {}) {
      const lc = layerBuf.ctx;
      lc.setTransform(1, 0, 0, 1, 0, 0);
      lc.globalCompositeOperation = 'source-over';
      lc.globalAlpha = 1;
      lc.clearRect(0, 0, width, height);
      const li = new Ink(lc, { seed });
      li.beginFrame(toon.ink.boil);
      lc.save();
      if (useCamera) toon.applyCamera(lc);
      fn(li, lc);
      lc.restore();
      if (grain > 0) {
        lc.setTransform(1, 0, 0, 1, 0, 0);
        lc.globalCompositeOperation = 'destination-out';
        lc.globalAlpha = grain;
        lc.drawImage(toon.grain[toon.ink.boil % 3], 0, 0);
        lc.globalCompositeOperation = 'source-over';
        lc.globalAlpha = 1;
      }
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = alpha;
      ctx.drawImage(layerBuf.canvas, 0, 0);
      ctx.restore();
    },
    drawPaper(alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(toon.paper, 0, 0);
      ctx.restore();
    },
    // Multiply the paper texture over everything for a printed finish.
    paperOverlay(alpha = 0.5) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = alpha;
      ctx.drawImage(toon.paper, 0, 0);
      ctx.restore();
    },
  };

  if (setup) await setup(toon);

  function renderFrame(n) {
    let state = clock.at(n);
    if (stepFps) {
      // Hold poses for several frames (animating "on twos").
      const step = Math.floor((n / fps) * stepFps);
      const held = clock.at(Math.round((step / stepFps) * fps));
      state = { ...held, frame: n, live: state };
    }
    toon.ink.beginFrame(Math.floor((n / fps) * boilFps));
    toon.camera = null;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    draw(toon, state);
    ctx.restore();
  }

  const api = {
    mode,
    fps,
    frames: clock.frames,
    width,
    height,
    audio,
    audioStart,
    duration,
    renderFrame(n, type = 'image/jpeg', quality = 0.93) {
      renderFrame(n);
      return type ? p.canvas.toDataURL(type, quality) : null;
    },
    ready: true,
  };
  window.__toon = api;

  if (mode === 'still') renderFrame(parseInt(params.get('frame'), 10) || 0);
  if (mode === 'preview') startPreview(api, renderFrame, cfg);
  return { toon, renderFrame, api };
}

function startPreview(api, renderFrame, cfg) {
  const bar = document.createElement('div');
  bar.className = 'toon-controls';
  bar.innerHTML = `<button type="button">▶ Play</button><input type="range" min="0" max="${api.frames - 1}" value="0"><span></span>`;
  document.body.appendChild(bar);
  const [btn, range, label] = bar.children;
  const audio = cfg.audio ? new Audio(cfg.audio) : null;
  let playing = false;
  let t0 = 0;
  let startFrame = 0;
  const show = (f) => {
    renderFrame(f);
    range.value = f;
    label.textContent = `${(f / api.fps).toFixed(2)}s · frame ${f}`;
  };
  const tick = () => {
    if (!playing) return;
    let f;
    if (audio) f = Math.floor((audio.currentTime - api.audioStart) * api.fps);
    else f = startFrame + Math.floor(((performance.now() - t0) / 1000) * api.fps);
    if (f >= api.frames) {
      stop();
      f = api.frames - 1;
    }
    show(Math.max(0, f));
    requestAnimationFrame(tick);
  };
  const stop = () => {
    playing = false;
    btn.textContent = '▶ Play';
    audio?.pause();
  };
  btn.onclick = () => {
    if (playing) return stop();
    playing = true;
    btn.textContent = '❚❚ Pause';
    startFrame = +range.value >= api.frames - 1 ? 0 : +range.value;
    t0 = performance.now();
    if (audio) {
      audio.currentTime = api.audioStart + startFrame / api.fps;
      audio.play();
    }
    requestAnimationFrame(tick);
  };
  range.oninput = () => {
    stop();
    show(+range.value);
  };
  show(0);
}
